import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generatedVoiceUrl } from '../shared/game/generated-voice';
import { createInterviewSpeech, currentInterview } from '../shared/game/interview-speech';
import type { CaseView, Player, Reply } from '../shared/game/types';
import fixture from './fixtures/framework/story.json';

test('generated replies carry direct provider URLs into the playable interview sequence', async () => {
  const npc = fixture.characters[0];
  const player = { id: 'player', name: 'Inspector Reed', role: 'reed' } as Player;
  const text = 'Good evening, Inspector.';
  const url = 'https://fal.media/files/test/reply.mp3';
  const recording = { url, text, durationMs: 2300 };
  const reply = { id: 'reply', topicId: 'conversation', conversational: true, spoken: true, text, recordings: [recording] } as Reply;
  const speech = createInterviewSpeech('speech', player, npc, 0, { kind: 'reply', reply }, 100);
  assert.equal(speech.lines.length, 1);
  assert.equal(generatedVoiceUrl(speech.lines[0].clip), url);
  assert.equal(speech.lines[0].durationMs, recording.durationMs);
  assert.equal(speech.endsAt, 2400);

  for (const invalid of [{ ...recording, url: '../../secret' }, { ...recording, text: 'Different words.' }]) {
    const fallback = createInterviewSpeech('fallback', player, npc, 0, { kind: 'reply', reply: { ...reply, recordings: [invalid] } }, 100);
    assert.equal(generatedVoiceUrl(fallback.lines[0].clip), null);
  }
});

test('both detectives hear the same generated recording while together, subject to partner mute', async () => {
  const npc = fixture.characters[0];
  const one = { id: 'one', name: 'Reed', role: 'reed', location: npc.location } as Player;
  const two = { ...one, id: 'two', name: 'Ellis', role: 'ellis' } as Player;
  const recording = { url: 'https://fal.media/files/test/shared.mp3', text: 'Good evening.', durationMs: 2300 };
  const reply = { id: 'shared', conversational: true, spoken: true, text: recording.text, recordings: [recording] } as Reply;
  const speech = createInterviewSpeech('shared', one, npc, 0, { kind: 'reply', reply }, 100);
  const state = { players: [one, two], npcs: [{ ...npc, lease: { playerId: one.id, until: 10000 } }], chapter: { index: 0 }, speech: [speech] } as unknown as CaseView;
  assert.equal(currentInterview(state, 'one', 200, true, true)?.lines[0].clip, recording.url);
  assert.equal(currentInterview(state, 'two', 200, true, true)?.lines[0].clip, recording.url);
  assert.equal(currentInterview(state, 'two', 200, true, false), undefined);
  assert.equal(currentInterview({ ...state, players: [one, { ...two, location: 'elsewhere' }] }, 'two', 200, true, true), undefined);
});

test('generated speech only accepts direct HTTPS fal media URLs', () => {
  assert.equal(generatedVoiceUrl('https://v3.fal.media/files/test/reply.mp3?download=1'), 'https://v3.fal.media/files/test/reply.mp3?download=1');
  for (const url of ['http://fal.media/audio', 'https://fal.media.evil.test/audio', 'http://127.0.0.1/key', 'file:///tmp/secret', 'https://fal.media@evil.test/audio', 'https://fal.media\\evil.test/audio', '/api/voices/old-token']) {
    assert.equal(generatedVoiceUrl(url), null);
  }
});
