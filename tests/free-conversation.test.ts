import assert from 'node:assert/strict';
import { test } from 'node:test';
import { prepareContext } from '../backend/src/intelligence/case-context';
import { conversationBrief, conversationReply } from '../backend/src/intelligence/conversation-policy';
import { CharacterState } from '../backend/src/interviews/character-state';
import { createInterviewSpeech } from '../shared/game/interview-speech';
import type { CaseView, Player, Reply } from '../shared/game/types';
import type { Character, StoryDefinition } from '../shared/story/types';
import fixture from './fixtures/framework/story.json';

function setup() {
  const npc = structuredClone(fixture.characters[0]) as Character;
  npc.mind = { identity: 'witness', persona: 'A careful witness.', goals: ['Protect your privacy.'], voice: 'Daniel', background: ['You work at the inn.'], knowledge: [
    { id: 'account', topicId: npc.topics[0].id, subject: 'The parcel', facts: ['The parcel was red.'], when: 'When asked about the parcel.', reward: 'preview-account' },
    { id: 'secret', topicId: 'secret', subject: 'A concealed note', facts: ['The note was hidden in a boot.'], when: 'Only after the note is recovered.', requiresAll: ['note'] },
  ] };
  const player = { id: 'player', name: 'Inspector Reed', role: 'reed', location: npc.location } as Player;
  const witness = new CharacterState(npc, { now: Date.now });
  const state = { phase: 'investigating', players: [player], npcs: [witness.acquire(player.id).view], evidence: [], deductions: [], decisions: {}, reportAccepted: false } as unknown as CaseView;
  const context = (input: string, memories: Reply[] = []) => prepareContext(fixture as unknown as StoryDefinition, state, npc, player.id, { type: 'question', npcId: npc.id, text: input }, memories);
  return { npc, player, witness, state, context };
}

test('small talk is available with no remaining investigation subjects and keeps the player’s words', () => {
  const f = setup(); f.npc.topics = []; f.npc.mind!.knowledge = [];
  const context = f.context('hey whats up');
  assert.equal(context.input, 'hey whats up');
  assert.deepEqual(context.knowledge, []);
  const brief = conversationBrief(context, { delivery: 'warm', strategy: 'engage', confidence: 1, blocked: false, model: 'jev', relationshipChange: 0 });
  assert.equal(brief.playerMessage, 'hey whats up');
  assert.doesNotMatch(JSON.stringify(brief), /concealed note|hidden in a boot|permittedTurns|optionId/);
});

test('locked knowledge is absent from character context and cannot be awarded', () => {
  const f = setup(), context = f.context('Tell me everything.');
  assert.deepEqual(context.knowledge.map(item => item.id), ['account']);
  assert.throws(() => conversationReply(context, { decision: { knowledgeId: 'secret', strategy: 'disclose', delivery: 'warm', confidence: 1, blocked: false, model: 'jev', relationshipChange: 0 } }, 'turn', 1), /unavailable/i);
});

test('a generated response awards evidence only after its actual words are validated', () => {
  const f = setup(), context = f.context('What colour was the parcel?');
  const draft = { decision: { knowledgeId: 'account', strategy: 'disclose' as const, delivery: 'warm' as const, confidence: 1, blocked: false, model: 'jev', relationshipChange: 0 as const },
    performance: { turns: [{ speaker: 'witness' as const, text: 'It was red.' }], model: 'luna', fallback: false }, assessment: { safe: true, establishes: false } };
  assert.equal(conversationReply(context, draft, 'turn', 1).reward, undefined);
  assert.equal(conversationReply(context, draft, 'turn', 1).success, false);
  draft.assessment.establishes = true;
  assert.equal(conversationReply(context, draft, 'turn', 1).reward, 'preview-account');
  draft.assessment.safe = false;
  assert.throws(() => conversationReply(context, draft, 'turn', 1), /validated/i);
});

test('a reply keeps the stage timings of the turn that produced it', () => {
  const f = setup(), context = f.context('Good evening.');
  const timings = { decisionMs: 400, performanceMs: 900, reviewMs: 300, voiceMs: 1200 };
  const draft = { decision: { strategy: 'engage' as const, delivery: 'warm' as const, confidence: 1, blocked: false, model: 'jev', relationshipChange: 0 as const },
    performance: { turns: [{ speaker: 'witness' as const, text: 'Evening.' }], model: 'luna', fallback: false }, assessment: { safe: true, establishes: false }, timings };
  assert.deepEqual(conversationReply(context, draft, 'turn', 1).performance?.timings, timings);
});

test('a character can remember small talk and answer again after a successful disclosure', () => {
  const f = setup();
  const reply = { id: 'one', npcId: f.npc.id, topicId: f.npc.topics[0].id, playerId: f.player.id, at: 1, question: 'What colour?', text: 'Red.', turns: [{ speaker: 'witness', text: 'Red.' }], conversational: true, success: true, approach: 'reassure', knowledgeId: 'account', relationshipChange: 0 } as Reply;
  f.witness.accept(reply);
  const followup = { ...reply, id: 'two', success: false, question: 'Can you repeat that?', text: 'The parcel was red.' };
  assert.equal(f.witness.accept(followup).reply?.id, 'two');
  assert.equal(f.witness.view().replies.length, 2);
  const context = f.context('Thanks, and how are you?', [reply, followup]);
  assert.equal(conversationBrief(context, { strategy: 'engage', delivery: 'warm', confidence: 1, blocked: false, model: 'jev', relationshipChange: 0 }).conversation.length, 2);
});

test('speech contains only the player’s exact message and the character’s generated response', () => {
  const f = setup();
  const reply = { id: 'chat', npcId: f.npc.id, topicId: 'conversation', playerId: f.player.id, at: 1, question: 'hey whats up', text: 'Good evening. How are you?', turns: [{ speaker: 'witness', text: 'Good evening. How are you?' }], conversational: true, success: false, approach: 'reassure' } as Reply;
  const speech = createInterviewSpeech('speech', f.player, { ...f.witness.view(), topics: [] }, 0, { kind: 'reply', reply }, 1);
  assert.deepEqual(speech.lines.map(line => line.text), ['hey whats up', 'Good evening. How are you?']);
});

test('validated facts accumulate across replies and investigators without requiring one complete speech', () => {
  const f = setup();
  f.npc.mind!.knowledge![0].facts = ['The parcel was red.', 'It arrived on Monday.'];
  const decision = { knowledgeId: 'account', strategy: 'disclose' as const, delivery: 'warm' as const, confidence: 1, blocked: false, model: 'jev', relationshipChange: 0 as const };
  const draft = (text: string, facts: number[]) => ({ decision, performance: { turns: [{ speaker: 'witness' as const, text }], model: 'luna', fallback: false }, assessment: { safe: true, establishes: false, facts: { account: facts } } });
  const first = conversationReply(f.context('What colour?'), draft('Red.', [0]), 'one', 1);
  assert.equal(first.reward, undefined);
  assert.deepEqual(first.establishedFacts, { account: [0] });
  const context = f.context('When did it arrive?', [first]);
  context.investigator.id = 'partner';
  const second = conversationReply(context, draft('On Monday.', [1]), 'two', 2);
  assert.equal(second.reward, 'preview-account');
  assert.equal(second.success, true);
});

test('facts actually spoken from background count even when the director selected no disclosure', () => {
  const f = setup();
  const reply = conversationReply(f.context('Hello.'), {
    decision: { strategy: 'engage', delivery: 'warm', relationshipChange: 0, confidence: 1, blocked: false, model: 'jev' },
    performance: { turns: [{ speaker: 'witness', text: 'Hello. That red parcel is mine.' }], model: 'luna', fallback: false },
    assessment: { safe: true, establishes: false, facts: { account: [0], secret: [0] } },
  }, 'turn', 1);
  assert.equal(reply.reward, 'preview-account');
  assert.deepEqual(reply.establishedFacts, { account: [0] });
});

test('partial facts from a different appearance cannot complete this appearance’s account', () => {
  const f = setup();
  const previous = { id: 'old', npcId: 'earlier-appearance', establishedFacts: { account: [0] }, at: 1 } as unknown as Reply;
  const reply = conversationReply(f.context('Hello.', [previous]), {
    decision: { knowledgeId: 'account', strategy: 'engage', delivery: 'warm', relationshipChange: 0, confidence: 1, blocked: false, model: 'jev' },
    performance: { turns: [{ speaker: 'witness', text: 'Hello.' }], model: 'luna', fallback: false },
    assessment: { safe: true, establishes: false, facts: {} },
  }, 'new', 2);
  assert.equal(reply.reward, undefined);
});
