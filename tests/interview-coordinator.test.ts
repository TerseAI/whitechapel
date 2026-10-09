import assert from 'node:assert/strict';
import { test } from 'node:test';
import { InterviewCoordinator } from '../backend/src/intelligence/coordinator';
import { DialogueServiceError } from '../backend/src/intelligence/dialogue-service-error';
import type { Decision, DecisionMaker, InterviewAuthority, TurnContext, TurnDraft } from '../backend/src/intelligence/types';
import type { Character } from '../shared/story/types';
import fixture from './fixtures/framework/story.json';

test('a persisted failure commits without calling providers again', async () => {
  const f = setup();
  f.draft.failure = 'Provider unavailable.';
  await f.run();
  assert.deepEqual(f.calls, ['commit']);
});

test('a validated saved response resumes without rerunning either model', async () => {
  const f = setup();
  f.draft.decision = f.decision;
  f.draft.performance = { turns: [{ speaker: 'witness', text: 'A saved reply.' }], model: 'test-model', fallback: false };
  f.draft.assessment = { safe: true, establishes: false };
  await f.run();
  assert.deepEqual(f.calls, ['commit']);
});

test('a saved but unreviewed response is checked before committing', async () => {
  const f = setup();
  f.draft.decision = f.decision;
  f.draft.performance = { turns: [{ speaker: 'witness', text: 'Good evening.' }], model: 'test-model', fallback: false };
  await f.run();
  assert.deepEqual(f.calls, ['validation', 'save', 'commit']);
});

test('concurrent retries share one decision, performance, validation and commit', async () => {
  const f = setup();
  await Promise.all([f.run(), f.run()]);
  assert.deepEqual(f.calls, ['decision', 'save', 'performance', 'save', 'validation', 'save', 'commit']);
});

test('an unsafe response is regenerated and validated before committing', async () => {
  const f = setup([false, true]);
  await f.run();
  assert.equal(f.calls.filter(call => call === 'performance').length, 2);
  assert.equal(f.calls.filter(call => call === 'validation').length, 2);
  assert.equal(f.draft.assessment?.safe, true);
  assert.equal(f.draft.failure, undefined);
});

test('repeated unsafe responses return a failure instead of scripted testimony', async () => {
  const f = setup([false, false]);
  await f.run();
  assert.equal(f.draft.performance, undefined);
  assert.match(f.draft.failure!, /not been recorded; try saying it another way/);
  assert.doesNotMatch(f.draft.failure!, /interrupted/);
  assert.match(f.warnings.join('\n'), /usable reply/);
});

test('small talk still calls the character model with no selected knowledge', async () => {
  const f = setup();
  await f.run();
  assert.equal(f.draft.decision?.knowledgeId, undefined);
  assert.ok(f.calls.includes('performance'));
  assert.equal(f.draft.performance?.fallback, false);
});

test('a generated investigator line is rejected before semantic review', async () => {
  const f = setup();
  f.draft.decision = f.decision;
  f.draft.performance = { turns: [{ speaker: 'investigator', text: 'I accuse you.' }], model: 'test', fallback: false };
  await f.run();
  assert.equal(f.calls.filter(call => call === 'validation').length, 1);
  assert.deepEqual(f.draft.performance?.turns, [{ speaker: 'witness', text: 'Good evening.' }]);
});

test('provider billing errors remain actionable when returned to the player', async () => {
  const f = setup([true], new DialogueServiceError('Character replies are unavailable because the fal account needs credits.'));
  const result = await f.run();
  assert.equal(result.ok, false);
  assert.match(result.message, /fal.*credits/i);
  assert.equal(f.draft.performance, undefined);
});

test('each turn records how long every stage took, including retries', async () => {
  const f = setup([false, true], undefined, { voiced: true });
  await f.run();
  assert.deepEqual(f.draft.timings, { decisionMs: 400, performanceMs: 1800, reviewMs: 600, voiceMs: 1200 });
});

test('a slow character response renews its generation claim and stops renewing after completion', async t => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  let release!: () => void;
  let started!: () => void;
  const entered = new Promise<void>(resolve => { started = resolve; });
  const waiting = new Promise<void>(resolve => { release = resolve; });
  const f = setup([true], undefined, { onPerformance: async () => { started(); await waiting; } });
  const work = f.run();
  await entered;
  t.mock.timers.tick(40_000);
  assert.equal(f.claims(), 3);
  release();
  await work;
  t.mock.timers.tick(40_000);
  assert.equal(f.claims(), 3);
});

function setup(assessments = [true], performanceError?: Error, { voiced = false, onPerformance = async () => {} } = {}) {
  const npc = structuredClone(fixture.characters[0]) as Character;
  npc.mind = { identity: 'witness', persona: 'A witness.', goals: ['Tell the truth.'], voice: 'Daniel' };
  const calls: string[] = [], draft: TurnDraft = {};
  let now = 0, claims = 0;
  const identity = { playerId: 'player', secret: 'secret' };
  const action = { type: 'question' as const, npcId: npc.id, text: 'Hey, how are you?' };
  const context: TurnContext = { npc, knowledge: [], memories: [], evidence: [], input: action.text, situation: 'An inn.', investigator: { id: 'player', name: 'Inspector', role: 'reed' } };
  const decision: Decision = { strategy: 'engage', delivery: 'warm', relationshipChange: 0, confidence: 0.9, blocked: false, model: 'jev-test' };
  const authority: InterviewAuthority = {
    async prepareInterview() { return { context, turn: { id: 'turn', playerId: 'player', npcId: npc.id, fingerprint: 'hash', action, at: 1, status: 'pending', draft } }; },
    async claimInterview() { claims++; return true; },
    async saveInterview() { calls.push('save'); },
    async commitInterview() { calls.push('commit'); return { ok: !draft.failure, message: draft.failure ?? 'Saved.' }; },
  };
  const director: DecisionMaker = {
    async decide() { calls.push('decision'); now += 400; return decision; },
    async review() { calls.push('validation'); now += 300; return { safe: assessments.shift() ?? true, establishes: false }; },
  };
  const performer = { async perform() { calls.push('performance'); now += 900; await onPerformance(); if (performanceError) throw performanceError; return { turns: [{ speaker: 'witness' as const, text: 'Good evening.' }], model: 'luna-test', fallback: false }; } };
  const speech = { async synthesize(text: string) { now += 600; return { url: 'https://fal.media/test.mp3', text, durationMs: 1000 }; } };
  const warnings: string[] = [];
  const coordinator = new InterviewCoordinator({ get: () => authority }, director, performer, voiced ? speech : undefined, [npc], message => warnings.push(message), () => now);
  return { run: () => coordinator.run('room', identity, 'turn', action), calls, draft, decision, warnings, claims: () => claims };
}
