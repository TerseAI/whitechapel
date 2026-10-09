import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { ActorCompiler } from 'terse-sdk/dev';
import type { ActorSocket } from 'terse-sdk/actor';
import type { CaseEvent } from '../shared/game/case-socket';
import type { Identity } from '../backend/src/cases/identity';
import { caseActorId } from '../backend/src/actors/entity-identity';
import { pathToWitness, witnessPosition } from '../shared/game/navigation';
process.env.STORY_PATH = 'tests/fixtures/framework/story.json';
const { CaseActor } = await import('../backend/src/actors/case-actor');
const { MemoryCaseScenes } = await import('./fixtures/case-scenes');
const story = JSON.parse(readFileSync(process.env.STORY_PATH, 'utf8'));
const identity = { playerId: 'one', secret: 'secret' };
const fields = new ActorCompiler().compile('backend/src/durable-objects.ts').find(a => a.actorName === 'CaseActor')!.fields.filter(f => f.persistence === 'persisted');

class TestCase extends CaseActor {
  connected = [identity];
  constructor(readonly sceneStore = new MemoryCaseScenes()) { super(sceneStore); }
  protected get id() { return caseActorId('atomic-test'); }
  protected async getConnections() { return this.connected.map(metadata => ({ id: metadata.playerId, state: 'open', metadata })) as ActorSocket<Identity, CaseEvent>[]; }
  protected broadcast() {}
  restart() {
    const room = new TestCase(this.sceneStore);
    room.connected = this.connected;
    for (const field of fields) Reflect.set(room, field.name, structuredClone(Reflect.get(this, field.name)));
    return room;
  }
}

test('cold case heartbeats and notes make no remote actor calls', async () => {
  let room = await investigating();
  room = room.restart();
  room.sceneStore.calls.length = 0;
  assert.equal((await room.act(identity, 'heartbeat', { type: 'heartbeat' })).ok, true);
  assert.equal((await room.act(identity, 'note', { type: 'note', text: 'A lead.' })).ok, true);
  assert.deepEqual(room.sceneStore.calls, []);
});

test('travel commits before scene effects and an interrupted arrival can resume without resetting movement', async () => {
  let room = await investigating();
  const oldVisit = await room.sceneSession(identity);
  const oldScene = room.sceneStore.scene('atomic-test', oldVisit.location);
  room.sceneStore.calls.length = 0;
  assert.equal((await room.act(identity, 'travel', { type: 'travel', location: 'preview-bedroom' })).ok, true);
  assert.deepEqual(room.sceneStore.calls, []);
  room = room.restart();
  room.sceneStore.failAfter = 'preview-bedroom:ensureVisit';
  await assert.rejects(room.sceneSession(identity), /interrupted/);
  await assert.rejects(oldScene.move({ ...identity, visit: oldVisit.visit }, { type: 'move', x: 0, z: 7 }), /visit/);
  const scene = room.sceneStore.scene('atomic-test', 'preview-bedroom');
  const visit = oldVisit.visit + 1;
  assert.equal((await scene.move({ ...identity, visit }, { type: 'move', x: 0, z: 7 })).ok, true);
  room = room.restart();
  assert.deepEqual(await room.sceneSession(identity), { location: 'preview-bedroom', visit });
  assert.deepEqual((await room.snapshot(identity)).players[0].position, { x: 0, z: 7 });
});

test('a rejected conversation leaves both NPC ownership and movement available', async () => {
  const room = await investigating();
  const npc = story.characters[0];
  await room.act(identity, 'travel', { type: 'travel', location: npc.location });
  const visit = await room.sceneSession(identity);
  const result = await room.act(identity, 'begin-too-far', { type: 'begin', npcId: npc.id });
  assert.equal(result.ok, false);
  assert.match(result.message, /closer/);
  assert.equal((await room.snapshot(identity)).npcs.find(n => n.id === npc.id)!.lease, null);
  assert.equal((await room.sceneStore.scene('atomic-test', npc.location).move({ ...identity, visit: visit.visit }, { type: 'move', x: 0, z: 7 })).ok, true);
});

test('two detectives share one exclusive witness lease and ending it immediately unlocks movement', async () => {
  const two = { playerId: 'two', secret: 'partner' };
  const room = await investigating(two);
  const npc = story.characters[0];
  for (const person of [identity, two]) await approach(room, person, npc);
  assert.equal((await room.act(identity, 'begin-one', { type: 'begin', npcId: npc.id })).ok, true);
  assert.equal((await room.act(two, 'begin-two', { type: 'begin', npcId: npc.id })).ok, false);
  const visit = await room.sceneSession(identity);
  const scene = room.sceneStore.scene('atomic-test', npc.location);
  const point = (await scene.snapshot()).positions[identity.playerId].position;
  assert.equal((await scene.move({ ...identity, visit: visit.visit }, { type: 'move', ...point })).ok, false);
  assert.equal((await room.act(identity, 'end', { type: 'end', npcId: npc.id })).ok, true);
  assert.equal((await scene.move({ ...identity, visit: visit.visit }, { type: 'move', ...point })).ok, true);
  assert.equal((await room.act(two, 'begin-two-again', { type: 'begin', npcId: npc.id })).ok, true);
});

test('opening a conversation makes one scene call; testimony and repeat requests are local and survive restart', async () => {
  let room = await investigating();
  const npc = story.characters[0];
  await room.act(identity, 'travel', { type: 'travel', location: npc.location });
  const state = await room.snapshot(identity), player = state.players[0];
  const place = state.locations.find(p => p.id === npc.location)!;
  const visit = await room.sceneSession(identity);
  const scene = room.sceneStore.scene('atomic-test', npc.location);
  for (const point of pathToWitness(player.position, witnessPosition(npc.id, place.navigation), place.indoor, place.navigation))
    await scene.move({ ...identity, visit: visit.visit }, { type: 'move', ...point });
  room = room.restart();
  room.sceneStore.calls.length = 0;
  assert.equal((await room.act(identity, 'begin', { type: 'begin', npcId: npc.id })).ok, true);
  assert.deepEqual(room.sceneStore.calls, [`${npc.location}:beginInteraction`]);
  room.sceneStore.calls.length = 0;
  const action = { type: 'answer' as const, npcId: npc.id, topicId: npc.topics[0].id, approach: npc.topics[0].correct };
  const result = await room.act(identity, 'answer', action);
  assert.equal(result.ok, true);
  assert.deepEqual(room.sceneStore.calls, []);
  room = room.restart();
  assert.deepEqual(await room.act(identity, 'answer', action), result);
  assert.deepEqual(room.sceneStore.calls, []);
  const saved = await room.snapshot(identity);
  assert.equal(saved.npcs.find(n => n.id === npc.id)!.replies.filter(r => r.id === 'answer').length, 1);
  assert.equal(saved.evidence.filter(e => e.id === result.reply?.reward).length, 1);
});

test('object inspection reads the scene once and saves its observation with the evidence', async () => {
  let room = await investigating();
  await room.act(identity, 'travel', { type: 'travel', location: 'preview-bedroom' });
  const state = await room.snapshot(identity), place = state.locations.find(p => p.id === 'preview-bedroom')!;
  const visit = await room.sceneSession(identity), object = story.objects.sample;
  const [x, , z] = place.navigation!.clues![object.hotspots[0]];
  await room.sceneStore.scene('atomic-test', place.id).move({ ...identity, visit: visit.visit }, { type: 'move', x, z });
  room.sceneStore.calls.length = 0;
  const action = { type: 'examineObject' as const, objectId: object.id, stepId: object.steps[0].id };
  const result = await room.act(identity, 'inspect', action);
  assert.equal(result.ok, true, result.message);
  assert.deepEqual(room.sceneStore.calls, [`${place.id}:snapshot`]);
  room = room.restart();
  room.sceneStore.calls.length = 0;
  assert.deepEqual(await room.act(identity, 'inspect', action), result);
  assert.deepEqual(room.sceneStore.calls, []);
  assert.deepEqual((await room.snapshot(identity)).inspections![object.id], [object.steps[0].id]);
});

test('a pending generated response keeps the witness reserved after the ordinary lease expires', async t => {
  const { activeStory } = await import('../backend/src/active-story');
  const npc = activeStory.characters[0], previous = npc.mind;
  npc.mind = { identity: npc.entityId, persona: 'A witness.', goals: [], voice: 'Daniel' };
  try {
    const two = { playerId: 'two', secret: 'partner' };
    const room = await investigating(two);
    for (const person of [identity, two]) await approach(room, person, npc);
    await room.act(identity, 'begin-ai', { type: 'begin', npcId: npc.id });
    const action = { type: 'question' as const, npcId: npc.id, text: 'Hello.' };
    assert.ok((await room.prepareInterview(identity, 'slow-turn', action)).turn);
    const later = Date.now() + 100000;
    t.mock.method(Date, 'now', () => later);
    assert.equal((await room.act(two, 'partner-begin', { type: 'begin', npcId: npc.id })).ok, false);
    await room.act(identity, 'close-ai', { type: 'end', npcId: npc.id });
    assert.equal((await room.commitInterview(identity, 'slow-turn', {})).ok, false);
    assert.equal((await room.act(two, 'partner-retry', { type: 'begin', npcId: npc.id })).ok, true);
  } finally { npc.mind = previous; }
});

async function investigating(partner?: Identity) {
  const room = new TestCase();
  await room.create(identity.playerId, identity.secret, 'One', partner ? 'co-op' : 'solo');
  if (partner) {
    room.connected.push(partner);
    await room.join(partner.playerId, partner.secret, 'Two');
    await room.act(partner, 'select', { type: 'selectInspector', inspector: 'ellis' });
    await room.act(partner, 'ready', { type: 'ready', ready: true });
  }
  await room.act(identity, 'select', { type: 'selectInspector', inspector: 'reed' });
  await room.act(identity, 'ready', { type: 'ready', ready: true });
  await skip(room);
  await room.act(identity, 'continue', { type: 'continueStage' });
  if (partner) await room.act(partner, 'continue', { type: 'continueStage' });
  await skip(room);
  await room.snapshot(identity);
  return room;
}
async function skip(room: TestCase) {
  const cutscene = (await room.snapshot(identity)).cutscene!;
  for (const person of room.connected)
    await room.act(person, cutscene.runId, { type: 'cutscene', command: { type: 'skip', runId: cutscene.runId, index: cutscene.index } });
}

async function approach(room: TestCase, person: Identity, npc: { id: string; location: string }) {
  await room.act(person, 'travel', { type: 'travel', location: npc.location });
  const state = await room.snapshot(person), player = state.players.find(p => p.id === person.playerId)!;
  const place = state.locations.find(p => p.id === npc.location)!;
  const visit = await room.sceneSession(person);
  const scene = room.sceneStore.scene('atomic-test', npc.location);
  for (const point of pathToWitness(player.position, witnessPosition(npc.id, place.navigation), place.indoor, place.navigation))
    await scene.move({ ...person, visit: visit.visit }, { type: 'move', ...point });
}
