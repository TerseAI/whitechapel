import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { TypeSafeClient } from '@typesafe-ai/sdk';
import { JevDirector } from '../backend/src/intelligence/jev';
import type { Decision, TurnContext } from '../backend/src/intelligence/types';
import type { Character } from '../shared/story/types';
import fixture from './fixtures/framework/story.json';

const context: TurnContext = { npc: { ...(fixture.characters[0] as Character), mind: { identity: 'witness', persona: 'A landlady.', voice: 'Alice', goals: ['Settle the lodgers.'] } },
  knowledge: [], memories: [], evidence: [], input: 'What name did I just tell you?', situation: 'An inn.', investigator: { id: 'player', name: 'Inspector Reed', role: 'reed' } };
const decision: Decision = { strategy: 'engage', delivery: 'warm', relationshipChange: 0, confidence: 1, blocked: false, model: 'jev-test' };
const turns = [{ speaker: 'witness' as const, text: 'You told me your name was Rowan.' }];

test('a grounded verdict is accepted when it is the likely answer, as live reviews of plain recall score about 0.7', async () => {
  assert.equal((await review('grounded', 0.73)).safe, true);
});

test('invented and uncertain verdicts are rejected however confident the review is', async () => {
  assert.equal((await review('invented', 0.95)).safe, false);
  assert.equal((await review('uncertain', 0.9)).safe, false);
});

test('a grounded verdict that is no more likely than the alternatives is rejected', async () => {
  assert.equal((await review('grounded', 0.45)).safe, false);
});

function review(grounding: string, confidence: number) {
  const client = { async systemOne() {
    return { model: 'jev-test', answers: { grounding: { choice: grounding, confidence }, established: { choice: 'no', confidence: 0.9 } } };
  } } as unknown as TypeSafeClient;
  return new JevDirector(client).review(context, decision, turns);
}
