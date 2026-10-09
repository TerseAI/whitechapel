import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { DurableCaseRepository } from '../backend/src/actors/case-repository.js';
import { ActorRuntime, requireCloudActors } from './actor-runtime.js';

const project = resolve('.terse/whitechapel-sixth-murder');
const metadata = JSON.parse(await readFile(join(project, 'whitechapel.json'), 'utf8'));
const hosted = process.argv.includes('--hosted');
if (hosted) requireCloudActors(process.env);
const dataDir = hosted ? undefined : await mkdtemp(join(tmpdir(), 'whitechapel-deployment-check-'));
process.env.DURABLE_ACTORS_CACHE_DIR ??= resolve('.durable-actors/runtime-cache');
process.env.DURABLE_ACTORS_TELEMETRY = '0';
let runtime;
const sockets: WebSocket[] = [];
try {
  if (!hosted) {
    const { startLocalActors } = await import(pathToFileURL(join(project, 'node_modules/terse-sdk/dist/dev.js')).href);
    runtime = await new ActorRuntime(startLocalActors).start(process.env, { project, entrypoint: 'src/actor.ts', dataDir, port: 7996, apiKey: randomUUID(), quiet: true });
  }
  const room = new DurableCaseRepository().get(`deploy-${randomUUID()}`);
  const one = { playerId: 'one', secret: randomUUID() }, two = { playerId: 'two', secret: randomUUID() };
  const state = await room.create(one.playerId, one.secret, 'One');
  assert.equal(state.storyId, metadata.storyId);
  assert.equal(state.storyVersion, metadata.storyVersion);
  await room.join(two.playerId, two.secret, 'Two');
  await assert.rejects(room.snapshot({ ...one, secret: 'wrong' }));
  sockets.push(...await Promise.all([room.connect(one), room.connect(two)]));
  for (let attempt = 0; attempt < 100 && (await room.snapshot(one)).connected?.length !== 2; attempt++) await delay(50);
  assert.equal((await room.snapshot(one)).connected?.length, 2);
  for (const [identity, inspector] of [[one, 'reed'], [two, 'ellis']] as const) {
    assert.equal((await room.act(identity, randomUUID(), { type: 'selectInspector', inspector })).ok, true);
    assert.equal((await room.act(identity, randomUUID(), { type: 'ready', ready: true })).ok, true);
  }
  assert.notEqual((await room.snapshot(one)).phase, 'lobby');
  const solo = new DurableCaseRepository().get(`solo-deploy-${randomUUID()}`);
  assert.equal((await solo.create(one.playerId, one.secret, 'Solo', 'solo')).mode, 'solo');
  await assert.rejects(solo.join(two.playerId, two.secret, 'Two'), /single-player/);
  sockets.push(await solo.connect(one));
  for (let attempt = 0; attempt < 100 && !(await solo.snapshot(one)).connected?.includes(one.playerId); attempt++) await delay(50);
  assert.equal((await solo.act(one, randomUUID(), { type: 'selectInspector', inspector: 'ellis' })).ok, true);
  assert.equal((await solo.act(one, randomUUID(), { type: 'ready', ready: true })).ok, true);
  const started = await solo.snapshot(one);
  assert.equal(started.mode, 'solo');
  assert.equal(started.players.length, 1);
  assert.notEqual(started.phase, 'lobby');
  console.log(`${hosted ? 'Hosted' : 'Local'} deployment verified: ${metadata.storyId} v${metadata.storyVersion}, authenticated RPCs, co-op and solo starts, and solo membership protection.`);
} finally {
  sockets.forEach(socket => socket.close());
  await runtime?.stop();
  if (dataDir) await rm(dataDir, { recursive: true, force: true });
}
