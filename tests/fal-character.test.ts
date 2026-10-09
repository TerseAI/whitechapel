import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FalCharacterPerformer } from '../backend/src/intelligence/fal-character';
import type { Decision, TurnContext } from '../backend/src/intelligence/types';
import type { Character } from '../shared/story/types';
import fixture from './fixtures/framework/story.json';

const context: TurnContext = { npc: { ...(fixture.characters[0] as Character), mind: { identity: 'witness', persona: 'A careful witness.', voice: 'Daniel', goals: ['Tell the truth.'], background: ['You work at the inn.'] } },
  knowledge: [], memories: [], evidence: [], input: 'Good evening.', situation: 'An inn.', investigator: { id: 'player', name: 'Inspector Reed', role: 'reed' } };
const decision: Decision = { strategy: 'engage', delivery: 'warm', relationshipChange: 0, confidence: 1, blocked: false, model: 'jev-test' };
const completed = { choices: [{ finish_reason: 'stop', message: { content: '{"text":"Good evening, Inspector."}' } }] };

test('character dialogue defaults to Gemini Flash with normal reasoning through fal', async () => {
  const performer = new FalCharacterPerformer({ async run(endpoint, options) {
    assert.equal(endpoint, 'openrouter/router/openai/v1/chat/completions');
    assert.equal(options.input.model, 'google/gemini-3.8-flash');
    assert.equal(options.input.reasoning_effort, 'medium');
    assert.equal(options.input.max_completion_tokens, 32768);
    assert.equal(options.input.response_format?.type, 'json_schema');
    assert.match(options.input.messages[0].content as string, /Do not invent case facts/);
    const brief = JSON.parse(options.input.messages[1].content as string);
    assert.equal(brief.persona, context.npc.mind!.persona);
    assert.equal(brief.playerMessage, context.input);
    assert.equal(brief.disclosure, null);
    assert.ok(options.abortSignal);
    return { data: completed };
  } });
  assert.deepEqual(await performer.perform(context, decision), { turns: [{ speaker: 'witness', text: 'Good evening, Inspector.' }], model: 'google/gemini-3.8-flash', fallback: false });
});

test('authored model overrides and retry instructions survive routing through fal', async () => {
  const performer = new FalCharacterPerformer({ async run(_endpoint, options) {
    assert.equal(options.input.model, 'openai/gpt-5.6-luna');
    assert.match(options.input.messages.at(-1)!.content as string, /previous attempt could not be verified/);
    return { data: completed };
  } }, 'unused-default');
  await performer.perform({ ...context, npc: { ...context.npc, mind: { ...context.npc.mind!, model: 'openai/gpt-5.6-luna' } } }, decision, true);
});

test('incomplete, refused and malformed dialogue never becomes testimony', async () => {
  for (const data of [
    { choices: [{ finish_reason: 'length', message: { content: '{"text":"Unfinished"}' } }] },
    { choices: [{ finish_reason: 'stop', message: { content: 'not JSON' } }] },
    { choices: [{ finish_reason: 'stop', message: { content: '{"text":""}' } }] },
    { choices: [{ finish_reason: 'stop', message: { content: null, refusal: 'Refused' } }] },
  ]) await assert.rejects(new FalCharacterPerformer({ async run() { return { data }; } }).perform(context, decision));
});

test('fal billing failures explain the required action without exposing provider details', async () => {
  const performer = new FalCharacterPerformer({ async run() { throw Object.assign(new Error('private provider details'), { status: 402 }); } });
  await assert.rejects(performer.perform(context, decision), error => {
    assert.match((error as Error).message, /fal.*credits/i);
    assert.doesNotMatch((error as Error).message, /private provider details/);
    return true;
  });
});
