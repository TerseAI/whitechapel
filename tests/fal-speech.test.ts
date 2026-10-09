import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { FalClient } from '@fal-ai/client';
import { FalSpeech } from '../backend/src/intelligence/fal-speech';
import type { SpeechProgress } from '../backend/src/intelligence/types';

test('live character replies are voiced by the ElevenLabs Turbo v2.5 model through fal', async () => {
  const submitted: { endpoint: string; input: unknown }[] = [];
  const client = { queue: {
    async submit(endpoint: string, options: { input: unknown }) { submitted.push({ endpoint, input: options.input }); return { request_id: 'request' }; },
    async subscribeToStatus() { throw new Error('stop after submission'); },
  } } as unknown as FalClient;
  const job: SpeechProgress = {};
  const checkpoints: SpeechProgress[] = [];
    const speech = new FalSpeech(client, { Brian: 'Daniel' });
    await assert.rejects(speech.synthesize('Good evening, Inspector.', 'Brian', 'warm', job, async () => { checkpoints.push(structuredClone(job)); }), /stop after submission/);
    assert.deepEqual(checkpoints, [{ requestId: 'request' }]);
    assert.deepEqual(submitted, [{ endpoint: 'fal-ai/elevenlabs/tts/turbo-v2.5', input: { text: 'Good evening, Inspector.', voice: 'Daniel', stability: 0.5, language_code: 'en' } }]);
});

test('a checkpointed speech request resumes without submitting another provider job', async () => {
  let submitted = false;
  const client = { queue: {
    async submit() { submitted = true; throw new Error('Duplicate submission'); },
    async subscribeToStatus(_endpoint: string, options: { requestId: string }) { assert.equal(options.requestId, 'saved-request'); throw new Error('resumed saved job'); },
  } } as unknown as FalClient;
  const speech = new FalSpeech(client, {});
  await assert.rejects(speech.synthesize('A saved line.', 'Daniel', 'warm', { requestId: 'saved-request' }, async () => {}), /resumed saved job/);
  assert.equal(submitted, false);
});
