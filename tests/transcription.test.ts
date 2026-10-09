import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FalTranscription } from '../backend/src/intelligence/fal-transcription';
import { microphoneWave } from '../frontend/src/interviews/microphone-wave';

import { ConversationMicrophone } from '../backend/src/conversations/microphone';
const recording = async (seconds = 1) => Buffer.from(await microphoneWave(new Float32Array(seconds * 16000)).arrayBuffer());

test('fal transcribes the recorded question with Scribe v2 and returns only speech', async () => {
  const audio = await recording(), signal = new AbortController().signal;
  const microphone = new FalTranscription({ async run(endpoint, options) {
    assert.equal(endpoint, 'fal-ai/elevenlabs/speech-to-text/scribe-v2');
    assert.deepEqual(options.input, { audio_url: `data:audio/wav;base64,${audio.toString('base64')}`, language_code: 'eng', diarize: false, tag_audio_events: false });
    assert.equal(options.abortSignal, signal);
    return { data: { text: ' Where were you? ' } };
  } });
  assert.equal(await microphone.transcribe(audio, signal), 'Where were you?');
});

test('fal failures expose actionable messages without leaking provider details', async () => {
  for (const [status, pattern] of [[402, /fal.*credits/i], [429, /busy/i], [500, /try again/i]] as const) {
    const microphone = new FalTranscription({ async run() { throw Object.assign(new Error('private key or provider data'), { status }); } });
    await assert.rejects(microphone.transcribe(await recording(), new AbortController().signal), error => {
      assert.match((error as Error).message, pattern);
      assert.doesNotMatch((error as Error).message, /private key/);
      return true;
    });
  }
});

test('actor microphone uploads require conversation ownership and reject invalid recordings before calling fal', async () => {
  let calls = 0, active = false;
  const audio = await recording(), identity = { playerId: 'one', secret: 'private', npcId: 'witness' };
  const microphone = new ConversationMicrophone(async () => ({ ok: active, message: 'Start a conversation first.' }), () => ({ async transcribe(recording) { calls++; assert.deepEqual(recording, audio); return 'Where were you?'; } }));
  const request = (body = audio) => {
    for (let offset = 0, index = 0; offset < body.length; offset += 24000, index++) microphone.append('socket', identity, 'upload', index, body.subarray(offset, offset + 24000).toString('base64'));
    return microphone.transcribe('socket', identity, 'upload');
  };
  await assert.rejects(request(), /conversation/);
  assert.equal(calls, 0);
  active = true;
  await assert.rejects(request(Buffer.from('not audio')), /invalid/);
  assert.throws(() => request(Buffer.alloc(2_000_000)), /shorter/);
  const wrongRate = Buffer.from(audio); wrongRate.writeUInt32LE(48000, 24);
  await assert.rejects(request(wrongRate), /invalid/);
  await assert.rejects(request(await recording(0.05)), /short/);
  assert.equal(calls, 0);
  assert.equal(await request(), 'Where were you?');
  assert.equal(calls, 1);
});
