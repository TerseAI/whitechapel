import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseBuffer } from 'music-metadata';
import { microphoneWave } from '../frontend/src/interviews/microphone-wave';

test('detected speech becomes a valid mono 16 kHz PCM16 WAV with clipped samples', async () => {
  const samples = new Float32Array(16004);
  samples.set([-2, -0.5, 0, 0.5, 2], 16000 - 1);
  const wave = microphoneWave(samples);
  assert.equal(wave.type, 'audio/wav');
  const bytes = new Uint8Array(await wave.arrayBuffer());
  const { format } = await parseBuffer(bytes, { mimeType: wave.type }, { duration: true });
  assert.equal(format.sampleRate, 16000);
  assert.equal(format.numberOfChannels, 1);
  assert.equal(format.bitsPerSample, 16);
  assert.ok(Math.abs(format.duration! - (16004 / 16000)) < 0.001);
  const view = new DataView(bytes.buffer, 44 + (16000 - 1) * 2);
  assert.deepEqual(Array.from({ length: 5 }, (_, index) => view.getInt16(index * 2, true)), [-32768, -16384, 0, 16383, 32767]);
});
