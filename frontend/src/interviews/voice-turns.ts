import { speechRecording } from '../../../shared/game/speech-recording';
import { microphoneWave } from './microphone-wave';

export type VoiceMode = 'hands-free' | 'hold';
export type VoiceStatus = 'off' | 'starting' | 'waiting' | 'listening' | 'hearing' | 'transcribing';
export type VoiceState = { status: VoiceStatus; mode: VoiceMode; error: string };
export type DetectorEvents = { speechStarted(): void; speechEnded(audio: Float32Array): void; misfired(): void };
export interface SpeechDetector {
  listen(): Promise<void>;
  pause(): Promise<void>;
  setMode(mode: VoiceMode): void;
  close(): Promise<void>;
}
export type OpenDetector = (events: DetectorEvents) => Promise<SpeechDetector>;
export type TranscribeRecording = (audio: Blob, signal: AbortSignal) => Promise<string>;

const tooLong = 'Try a shorter message—about twenty seconds at a time.';
const maxSamples = speechRecording.sampleRate * speechRecording.maxSeconds;

export class VoiceTurns {
  private state: VoiceState;
  private detector?: SpeechDetector;
  private available = false;
  private holding = false;
  private submitted = false;
  private closed = false;
  private transcription?: AbortController;

  constructor(private readonly open: OpenDetector, private readonly transcribe: TranscribeRecording,
    private readonly deliver: (text: string) => Promise<unknown>, private readonly onChange: (state: VoiceState) => void, mode: VoiceMode = 'hands-free') {
    this.state = { status: 'off', mode, error: '' };
  }

  async enable() {
    if (this.state.status !== 'off' || this.closed) return;
    this.update({ status: 'starting', error: '' });
    try {
      const detector = await this.open({ speechStarted: () => this.heard(), speechEnded: audio => void this.submit(audio), misfired: () => this.misfired() });
      if (this.closed) { await detector.close(); return; }
      this.detector = detector;
      detector.setMode(this.state.mode);
      this.update({ status: 'waiting' });
      await this.listenIfReady();
    } catch (cause) { this.update({ status: 'off', error: openingError(cause) }); }
  }

  setAvailable(available: boolean) {
    this.available = available;
    void (available ? this.listenIfReady() : this.stopListening());
  }

  async setMode(mode: VoiceMode) {
    if (mode === this.state.mode) return;
    this.holding = false;
    await this.stopListening();
    this.detector?.setMode(mode);
    this.update({ mode, error: '' });
    await this.listenIfReady();
  }

  async press() {
    if (this.state.mode !== 'hold' || this.holding) return;
    this.holding = true;
    this.update({ error: '' });
    await this.listenIfReady();
  }

  async release() {
    if (!this.holding) return;
    this.holding = false;
    if (!this.listening()) return;
    this.submitted = false;
    await this.detector!.pause();
    if (!this.submitted) this.update({ status: 'waiting', error: 'Nothing was heard. Hold to talk while you speak.' });
  }

  async cancel() {
    this.holding = false;
    this.transcription?.abort();
    if (this.state.status === 'transcribing') this.update({ status: 'waiting' });
    await this.stopListening();
    await this.listenIfReady();
  }

  async close() {
    this.closed = true;
    this.transcription?.abort();
    const detector = this.detector;
    this.detector = undefined;
    this.update({ status: 'off' });
    await detector?.close();
  }

  private heard() { if (this.state.status === 'listening') this.update({ status: 'hearing' }); }
  private misfired() { if (this.state.status === 'hearing') this.update({ status: 'listening' }); }

  private async submit(audio: Float32Array) {
    if (!this.listening()) return;
    this.submitted = true;
    this.update({ status: 'transcribing', error: '' });
    await this.detector?.pause();
    const text = await this.recognise(audio);
    if (text !== undefined) await this.accept(text);
  }

  private async recognise(audio: Float32Array): Promise<string | undefined> {
    if (audio.length > maxSamples) { await this.resume(tooLong); return; }
    const transcription = this.transcription = new AbortController();
    try {
      const text = (await this.transcribe(microphoneWave(audio), transcription.signal)).trim();
      return transcription.signal.aborted ? undefined : text;
    } catch (cause) {
      if (!transcription.signal.aborted) await this.resume(cause instanceof Error ? cause.message : 'Speech recognition failed. Please try again.');
    } finally { if (this.transcription === transcription) this.transcription = undefined; }
  }

  private async accept(text: string) {
    if (!text) return this.resume(this.state.mode === 'hold' ? 'No speech was detected. Check your selected microphone and try again.' : '');
    if (text.length > 500) return this.resume(tooLong);
    this.update({ status: 'waiting' });
    await this.deliver(text);
    await this.listenIfReady();
  }

  private async resume(error: string) {
    this.update({ status: 'waiting', error });
    await this.listenIfReady();
  }

  private async listenIfReady() {
    if (!this.detector || this.closed || this.state.status !== 'waiting' || !this.available) return;
    if (this.state.mode === 'hold' && !this.holding) return;
    this.update({ status: 'listening' });
    await this.detector.listen();
  }

  private async stopListening() {
    if (!this.listening()) return;
    this.update({ status: 'waiting' });
    await this.detector!.pause();
  }

  private listening() { return this.state.status === 'listening' || this.state.status === 'hearing'; }

  private update(change: Partial<VoiceState>) {
    this.state = { ...this.state, ...change };
    this.onChange(this.state);
  }
}

const openingErrors: Record<string, string> = {
  NotAllowedError: 'Microphone access was denied. Allow the microphone for this site, then try again.',
  NotFoundError: 'No microphone was found. Connect one, then try again.',
  NotSupportedError: 'This browser cannot access a microphone. Open the game in Chrome or Safari on localhost or HTTPS.',
};

function openingError(cause: unknown): string {
  return (cause instanceof DOMException && openingErrors[cause.name]) || 'Could not start the microphone. Please try again.';
}
