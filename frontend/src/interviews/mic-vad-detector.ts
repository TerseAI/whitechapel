import type { MicVAD } from '@ricky0123/vad-web';
import type { DetectorEvents, SpeechDetector, VoiceMode } from './voice-turns';

const assets = '/vad/';
const tuning: Record<VoiceMode, { redemptionMs: number; submitUserSpeechOnPause: boolean }> = {
  'hands-free': { redemptionMs: 800, submitUserSpeechOnPause: false },
  // Holding the key decides when speech ends, so pauses mid-sentence never submit.
  hold: { redemptionMs: 60_000, submitUserSpeechOnPause: true },
};

export async function openMicrophoneDetector(events: DetectorEvents): Promise<SpeechDetector> {
  if (!navigator.mediaDevices?.getUserMedia || !window.AudioWorkletNode) throw new DOMException('Microphone capture is unavailable.', 'NotSupportedError');
  // Created before any await so the click that opened the microphone also unlocks audio processing.
  const context = new AudioContext();
  let stream: MediaStream | undefined;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    const vad = await createVad(context, stream, events);
    return new MicrophoneDetector(vad, context, stream);
  } catch (error) {
    stream?.getTracks().forEach(track => track.stop());
    void context.close();
    throw error;
  }
}

async function createVad(context: AudioContext, stream: MediaStream, events: DetectorEvents) {
  const { MicVAD } = await import('@ricky0123/vad-web');
  const vad = await MicVAD.new({
    model: 'v5', baseAssetPath: assets, onnxWASMBasePath: assets, audioContext: context, startOnLoad: false, minSpeechMs: 250,
    getStream: async () => stream, pauseStream: async () => {}, resumeStream: async () => stream,
    onSpeechStart: events.speechStarted, onSpeechEnd: events.speechEnded, onVADMisfire: events.misfired,
    ...tuning['hands-free'],
  });
  await vad.start();
  await vad.pause();
  return vad;
}

class MicrophoneDetector implements SpeechDetector {
  constructor(private readonly vad: MicVAD, private readonly context: AudioContext, private readonly stream: MediaStream) {}

  listen() { return this.vad.start(); }
  pause() { return this.vad.pause(); }
  setMode(mode: VoiceMode) { this.vad.setOptions(tuning[mode]); }

  async close() {
    try { await this.vad.destroy(); }
    finally {
      this.stream.getTracks().forEach(track => track.stop());
      await this.context.close().catch(() => {});
    }
  }
}
