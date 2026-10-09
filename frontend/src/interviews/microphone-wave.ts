import { encodeWAV } from '@ricky0123/vad-web/dist/utils';
import { speechRecording } from '../../../shared/game/speech-recording';

const pcm = 1, mono = 1, bitDepth = 16;

export function microphoneWave(samples: Float32Array): Blob {
  return new Blob([encodeWAV(samples, pcm, speechRecording.sampleRate, mono, bitDepth)], { type: 'audio/wav' });
}
