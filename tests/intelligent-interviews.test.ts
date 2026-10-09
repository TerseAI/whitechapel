import assert from 'node:assert/strict';
import { test } from 'node:test';
import { interviewOptions, checkPerformance, actorContext } from '../backend/src/intelligence/story-policy';
import { TurnJournal } from '../backend/src/intelligence/turn-journal';
import { remember } from '../backend/src/intelligence/memory';
import type { Reply } from '../shared/game/types';
import type { Character } from '../shared/story/types';
import fixture from './fixtures/framework/story.json';

function character(): Character {
  const npc = structuredClone(fixture.characters[0]) as Character;
  npc.mind = { identity: 'witness', persona: 'A careful witness.', goals: ['Answer accurately.'], voice: 'witness' };
  delete npc.topics[0].responses;
  delete npc.topics[0].documentId;
  npc.topics[0].choices = ['reassure', 'press', 'challenge'].map(approach => ({ approach: approach as 'reassure' | 'press' | 'challenge', label: 'Tell us what you saw.' }));
  npc.topics[0].proof = 'letter';
  npc.topics[0].correct = 'challenge';
  npc.topics[0].success = { text: 'I saw the red case.', reward: 'account' };
  npc.topics[0].failure = { text: 'I cannot identify it.' };
  return npc;
}

test('a director cannot select an evidence-backed admission without the exhibit', () => {
  const npc = character();
  const options = interviewOptions(npc, npc.topics, undefined);
  assert.ok(options.length > 0);
  assert.ok(options.every(option => !option.reply.success));
  assert.ok(interviewOptions(npc, npc.topics, 'letter').some(option => option.reply.reward === 'account'));
});

test('the director only receives authored responses and preserves the selected question', () => {
  const npc = character();
  npc.topics[0].choices = [{ approach: 'challenge', label: 'Explain this letter.', usesEvidence: true }];
  assert.deepEqual(interviewOptions(npc, npc.topics, 'letter').map(option => option.approach), ['challenge']);
});

test('the actor context contains only the selected account, not alternative secrets', () => {
  const npc = character();
  const option = interviewOptions(npc, npc.topics)[0];
  const context = actorContext(npc, option, [], 'guarded');
  assert.doesNotMatch(JSON.stringify(context), /red case|"reward"|"proof"/);
  assert.match(JSON.stringify(context), /cannot identify/);
  assert.deepEqual(context.permittedTurns, [{ speaker: 'witness', text: option.reply.text }]);
});

test('protected exchanges preserve every evidentiary line and investigator question', () => {
  const npc = character();
  npc.topics[0].performance = 'verbatim';
  const option = interviewOptions(npc, npc.topics, 'letter').find(option => option.reply.success)!;
  assert.equal(checkPerformance(option, [{ speaker: 'witness', text: 'I confess.' }]), false);
  assert.equal(checkPerformance(option, [{ speaker: 'witness', text: option.reply.text }]), true);
});

test('pending turns survive serialization, reject other owners, and commit only once', () => {
  const journal = new TurnJournal([], () => 1000);
  const turn = journal.reserve('request', 'player', 'npc', 'context', { type: 'answer', npcId: 'npc', topicId: 'topic', approach: 'reassure' });
  assert.equal(turn.id, 'request');
  assert.throws(() => journal.reserve('other', 'partner', 'npc', 'context', turn.action), /pending/i);
  const restored = new TurnJournal(JSON.parse(JSON.stringify(journal.records())), () => 1001);
  assert.equal(restored.reserve('request', 'player', 'npc', 'context', turn.action).id, turn.id);
  assert.throws(() => restored.reserve('request', 'partner', 'npc', 'context', turn.action), /another/i);
  const result = { ok: true, message: 'Recorded.' };
  restored.complete('request', result);
  assert.deepEqual(restored.get('request')?.result, result);
  assert.throws(() => restored.complete('request', { ok: false, message: 'Changed.' }), /committed/i);
});

test('cancelled turns cannot later commit generated evidence', () => {
  const journal = new TurnJournal([], () => 1000);
  journal.reserve('request', 'player', 'npc', 'context', { type: 'answer', npcId: 'npc', topicId: 'topic', approach: 'reassure' });
  journal.cancelFor('player');
  assert.throws(() => journal.complete('request', { ok: true, message: 'Late answer.' }), /cancelled/i);
});

test('character memories retain earlier appearances without duplicating retried statements', () => {
  const earlier = { id: 'one', npcId: 'arrival', at: 1, text: 'An earlier account.' } as Reply;
  const later = { id: 'two', npcId: 'station', at: 2, text: 'A later account.' } as Reply;
  const restored = JSON.parse(JSON.stringify(remember([], [earlier])));
  assert.deepEqual(remember(restored, [later, earlier]), [earlier, later]);
});
