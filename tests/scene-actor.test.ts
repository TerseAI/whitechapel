import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SceneActor } from '../backend/src/actors/scene-actor';
import { entityActorId, hashSecret } from '../backend/src/actors/entity-identity';
import type { SceneEvent } from '../shared/game/scene-socket';

process.env.STORY_PATH = 'stories/starter/story.json';
const identity = { playerId: 'one', secret: 'secret', visit: 1 };
const scope = { caseId: 'case-one', location: 'empty-room', chapter: 0, epoch: 1, phase: 'investigating' as const };

test('scene movement has no case, investigator or NPC calls and keeps its own revision', async () => {
  const scene = await enteredScene();
  assert.equal((await scene.move(identity, { type: 'move', x: 0, z: 7, moving: true, heading: 1 })).ok, true);
  const view = await scene.snapshot();
  assert.deepEqual(view.positions.one.position, { x: 0, z: 7 });
  assert.equal(view.positions.one.motion.heading, 1);
  assert.equal(scene.connectionReads, 0);
  assert.equal(JSON.stringify(scene.events).includes('secret'), false);
});

test('leaving a scene fences old movement grants, including after returning', async () => {
  const scene = await enteredScene();
  await scene.leave('one', 1);
  await assert.rejects(scene.move(identity, { type: 'move', x: 0, z: 7 }), /visit/);
  await scene.enter({ playerId: 'one', secretHash: hashSecret('secret'), visit: 2, position: { x: 1, z: 8 } });
  await assert.rejects(scene.move(identity, { type: 'move', x: 0, z: 7 }), /visit/);
  await scene.leave('one', 1);
  assert.equal((await scene.move({ ...identity, visit: 2 }, { type: 'move', x: 0, z: 7 })).ok, true);
});

test('scene movement retains authentication, bounds, speed and conversation locks', async () => {
  const scene = await enteredScene();
  await assert.rejects(scene.move({ ...identity, secret: 'wrong' }, { type: 'move', x: 0, z: 7 }), /session/);
  assert.equal((await scene.move(identity, { type: 'move', x: 1000, z: 0 })).ok, false);
  await scene.move(identity, { type: 'move', x: 0, z: 7 });
  await scene.move(identity, { type: 'move', x: 0, z: -7 });
  assert.ok((await scene.snapshot()).positions.one.position.z > 5);
  await scene.setInteraction('one', 1, 'witness');
  assert.equal((await scene.move(identity, { type: 'move', x: 0, z: 6 })).ok, false);
});

test('replaying scene entry never resets an already moving investigator', async () => {
  const scene = await enteredScene();
  await scene.move(identity, { type: 'move', x: 0, z: 7 });
  await scene.enter({ playerId: 'one', secretHash: hashSecret('secret'), visit: 1, position: { x: -1, z: 8 } });
  assert.deepEqual((await scene.snapshot()).positions.one.position, { x: 0, z: 7 });
});

test('waving faces the requested camera direction, replicates to partners and walking cancels it', async () => {
  const scene = await enteredScene();
  await scene.move(identity, { type: 'move', x: 0, z: 7, moving: true });
  assert.equal((await scene.wave(identity, { type: 'wave', heading: .4 })).ok, true);
  const state = await scene.snapshot();
  assert.deepEqual(state.positions.one.gesture, { kind: 'wave', at: 1000, heading: .4 });
  assert.equal(state.positions.one.motion.moving, false);
  assert.equal(scene.events.at(-1)?.type, 'scene');
  assert.equal((await scene.wave(identity, { type: 'wave', heading: .8 })).ok, false);
  await scene.move(identity, { type: 'move', x: 0, z: 6, moving: true });
  assert.equal((await scene.snapshot()).positions.one.gesture, null);
});

test('waving cannot interrupt interviews or bypass phase and session checks', async () => {
  const scene = await enteredScene();
  await assert.rejects(scene.wave({ ...identity, secret: 'wrong' }, { type: 'wave', heading: 0 }), /session/);
  assert.equal((await scene.wave(identity, { type: 'wave', heading: NaN })).ok, false);
  await scene.setInteraction('one', 1, 'witness');
  assert.equal((await scene.wave(identity, { type: 'wave', heading: 0 })).ok, false);
  await scene.setInteraction('one', 1, null);
  await scene.configure({ ...scope, phase: 'cutscene' });
  assert.equal((await scene.wave(identity, { type: 'wave', heading: 0 })).ok, false);
});

async function enteredScene() {
  const scene = new TestScene();
  await scene.configure(scope);
  await scene.enter({ playerId: 'one', secretHash: hashSecret('secret'), visit: 1, position: { x: -1, z: 8 } });
  return scene;
}

class TestScene extends SceneActor {
  events: SceneEvent[] = [];
  connectionReads = 0;
  constructor() { super({ now: () => 1000 }); }
  protected get id() { return entityActorId(scope.caseId, scope.location); }
  protected broadcast(event: SceneEvent) { this.events.push(event); }
  protected async getConnections() { this.connectionReads++; return []; }
}
