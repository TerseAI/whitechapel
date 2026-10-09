import assert from 'node:assert/strict';
import { caseActorId } from '../backend/src/actors/entity-identity';
import { test } from 'node:test';
import type { ActorSocket } from 'terse-sdk/actor';
import type { CaseEvent } from '../shared/game/case-socket';
import type { Identity } from '../backend/src/cases/identity';
import { MemoryCaseScenes } from './fixtures/case-scenes';

process.env.STORY_PATH = 'stories/starter/story.json';
const { CaseActor } = await import('../backend/src/durable-objects');
const identity = { playerId: 'one', secret: 'secret' };

test('the case authorizes a scene visit and movement is owned by that scene', async () => {
  const { room, entities } = await startedRoom();
  const visit = await room.sceneSession(identity);
  const scene = entities.scene('movement-test', visit.location);
  const before = (await room.snapshot(identity)).revision;
  assert.equal((await room.act(identity, 'misroute', { type: 'move', x: 0, z: 7 })).ok, false);
  assert.equal((await scene.move({ ...identity, visit: visit.visit }, { type: 'move', x: 0, z: 7, moving: true, heading: 1 })).ok, true);
  const saved = await room.snapshot(identity);
  assert.equal(saved.revision, before);
  assert.deepEqual(saved.players[0].position, { x: 0, z: 7 });
  assert.equal(JSON.stringify(saved).includes('secret'), false);
});

test('readiness requires a connected investigator and scene grants authenticate', async () => {
  const entities = new MemoryCaseScenes();
  const room = new TestCase(entities);
  await room.create(identity.playerId, identity.secret, 'One', 'solo');
  await assert.rejects(room.sceneSession({ ...identity, secret: 'wrong' }), /session/);
  await room.act(identity, 'select', { type: 'selectInspector', inspector: 'reed' });
  room.connected = false;
  assert.equal((await room.act(identity, 'ready', { type: 'ready', ready: true })).ok, false);
});

async function startedRoom() {
  const entities = new MemoryCaseScenes();
  const room = new TestCase(entities);
  await room.create(identity.playerId, identity.secret, 'One', 'solo');
  await room.act(identity, 'select', { type: 'selectInspector', inspector: 'reed' });
  await room.act(identity, 'ready', { type: 'ready', ready: true });
  return { room, entities };
}

class TestCase extends CaseActor {
  connected = true;
  events: CaseEvent[] = [];
  constructor(entities: MemoryCaseScenes) { super(entities); }
  protected get id() { return caseActorId('movement-test'); }
  protected async getConnections(): Promise<readonly ActorSocket<Identity, CaseEvent>[]> {
    return this.connected ? [{ id: 'socket', state: 'open', metadata: identity } as ActorSocket<Identity, CaseEvent>] : [];
  }
  protected broadcast(event: CaseEvent) { this.events.push(event); }
}
