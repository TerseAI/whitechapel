import type { InterviewSpeech } from '../../../shared/game/types';
import type { AudioPort, SpeechCue } from '../game/speech-playback';

export type ConversationCue = Omit<SpeechCue, 'status'> & {
  status: 'loading' | 'playing' | 'blocked' | 'reading' | 'complete';
  revealed: boolean;
};

export class ConversationPlayback {
  private cue: ConversationCue | null = null;
  private cleanup: (() => void) | undefined;
  private generation = 0;

  constructor(private audio: AudioPort, private url: (clip: string, text: string) => string | null, private onCue: (cue: ConversationCue | null) => void, private mutedMode: 'reading' | 'playing' = 'reading') {}

  prime() {
    if (this.cue) return;
    const generation = ++this.generation;
    this.audio.src = '/audio/silence.wav';
    void this.audio.play().then(() => { if (generation === this.generation) this.audio.pause(); }).catch(() => {});
  }

  follow(speech: InterviewSpeech, volume: number) {
    this.setVolume(volume);
    if (this.cue?.speech.id === speech.id) return;
    this.stop();
    if (!speech.lines.length) return;
    this.cue = { speech, index: 0, line: speech.lines[0], progress: 0, status: 'loading', revealed: false };
    this.startLine();
  }

  setVolume(volume: number) {
    const wasMuted = this.audio.volume === 0;
    this.audio.volume = volume;
    if (this.mutedMode === 'playing' || !this.cue || this.cue.status === 'complete') return;
    if (volume === 0 && this.cue.status !== 'reading') this.read();
    else if (wasMuted && volume > 0 && this.cue.status === 'reading') this.startLine();
  }

  advance() {
    if (!this.cue || this.cue.status === 'complete') return;
    this.cancelLine();
    const index = this.cue.index + 1;
    if (index === this.cue.speech.lines.length) { this.update({ status: 'complete', progress: 1 }); return; }
    this.cue = { ...this.cue, index, line: this.cue.speech.lines[index], progress: 0, revealed: false };
    this.startLine();
  }

  read() {
    if (!this.cue || this.cue.status === 'complete') return;
    this.cancelLine();
    this.update({ status: 'reading', revealed: true });
  }

  resume() { if (this.cue && this.cue.status !== 'complete') this.startLine(); }

  suspend() {
    const cue = this.cue;
    const position = this.audio.currentTime;
    this.cancelLine();
    const generation = this.generation;
    return () => {
      if (generation !== this.generation || cue !== this.cue) return;
      if (cue?.status === 'playing' || cue?.status === 'loading') this.startLine(position);
    };
  }

  stop() {
    this.cancelLine();
    if (!this.cue) return;
    this.cue = null;
    this.onCue(null);
  }

  private startLine(position = 0) {
    this.cancelLine();
    if (!this.cue) return;
    const { clip, text } = this.cue.line;
    const source = this.url(clip, text);
    if (!source || (this.audio.volume === 0 && this.mutedMode === 'reading')) { this.update({ status: 'reading', revealed: true }); return; }
    const generation = this.generation;
    const current = () => generation === this.generation;
    this.update({ status: 'loading' });
    const playing = () => { if (current()) this.update({ status: 'playing', revealed: true }); };
    const events = {
      playing,
      waiting: () => { if (current()) this.update({ status: 'loading' }); },
      ended: () => { if (current()) this.advance(); },
      error: () => { if (current()) this.read(); },
      timeupdate: () => { if (current() && this.cue) this.update({ progress: Math.min(1, this.audio.currentTime * 1000 / this.cue.line.durationMs) }); },
    };
    for (const [event, handler] of Object.entries(events)) this.audio.addEventListener(event, handler);
    this.cleanup = () => { for (const [event, handler] of Object.entries(events)) this.audio.removeEventListener(event, handler); };
    this.audio.src = source;
    this.audio.currentTime = position;
    void this.audio.play().then(playing).catch(error => {
      if (!current()) return;
      if (error?.name === 'NotAllowedError') this.update({ status: 'blocked' });
      else this.read();
    });
  }

  private cancelLine() {
    this.generation++;
    this.cleanup?.(); this.cleanup = undefined;
    this.audio.pause();
  }

  private update(change: Partial<ConversationCue>) {
    if (!this.cue) return;
    this.cue = { ...this.cue, ...change };
    this.onCue(this.cue);
  }
}
