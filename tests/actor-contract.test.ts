import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { ActorCompiler } from 'terse-sdk/dev';

test('the current durable-actors compiler exposes the game RPCs without private case state', () => {
  const contract = new ActorCompiler().compileContract(resolve('backend/src/durable-objects.ts'));
  assert.deepEqual(contract.actors.map(actor => actor.actorName), ['CaseActor', 'ConversationActor', 'SceneActor']);
  const room = contract.actors.find(actor => actor.actorName === 'CaseActor')!;
  assert.ok(JSON.stringify(room).includes('prepareInterview'));
  assert.ok(!JSON.stringify(room.socket).includes('secretHash'));
  assert.ok(!JSON.stringify(room).includes('saveInterview'));
  const conversation = contract.actors.find(actor => actor.actorName === 'ConversationActor')!;
  assert.ok(JSON.stringify(conversation).includes('history'));
  assert.ok(!JSON.stringify(conversation.socket).includes('secretHash'));
  assert.ok(!JSON.stringify(conversation.socket).includes('background'));
  assert.ok(JSON.stringify(room.socket).includes('requestId'));
  assert.ok(!JSON.stringify(room.socket).includes('positions'));
  const scene = contract.actors.find(actor => actor.actorName === 'SceneActor')!;
  assert.ok(JSON.stringify(scene.socket).includes('gesture'));
  assert.ok(!JSON.stringify(scene.socket).includes('secretHash'));
});

test('game actors request dormancy after five seconds of inactivity', () => {
  const contract = new ActorCompiler().compileContract(resolve('backend/src/durable-objects.ts'));
  for (const actor of contract.actors) {
    assert.equal(actor.sandbox?.idleTimeoutMs, 5_000, actor.actorName);
  }
});
