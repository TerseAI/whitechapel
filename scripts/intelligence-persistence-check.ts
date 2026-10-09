import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { ActorRuntime } from './actor-runtime';
import { actors } from '../backend/src/actors/generated';
import { entityActorId, conversationActorId } from '../backend/src/actors/entity-identity';
import type { ConversationEvent } from '../shared/game/conversation-socket';
import { pathToWitness, witnessPosition } from '../shared/game/navigation';

process.env.STORY_PATH = resolve('stories/sixth-murder/story.json');
process.env.DURABLE_ACTORS_TELEMETRY = '0';
const phase = process.argv[2];
if (phase) await probe(phase);
else await restartCheck();

async function restartCheck() {
  const dataDir = await mkdtemp(join(tmpdir(), 'whitechapel-persistence-'));
  const apiKey = randomBytes(32).toString('hex');
  let runtime: Awaited<ReturnType<ActorRuntime['start']>> | undefined;
  try {
    for (const phase of ['prepare', 'resume', 'verify']) {
      runtime = await new ActorRuntime().start({ ...process.env, AI_MODE: 'live', TYPESAFE_API_KEY: 'persistence-test-only', FAL_KEY: 'persistence-test-only' }, { apiKey, entrypoint: 'backend/src/durable-objects.ts', dataDir, port: 7995, quiet: true });
      const result = await promisify(execFile)(process.execPath, ['--import', 'tsx', 'scripts/intelligence-persistence-check.ts', phase], {
        env: { ...process.env, TERSE_ACTOR_URL: `${runtime!.connection.controlPlaneUrl}/v1/projects/${runtime!.connection.projectId}/actors`, TERSE_API_KEY: runtime!.connection.apiKey },
        timeout: 30000,
      });
      process.stdout.write(result.stdout);
      await runtime!.stop(); runtime = undefined;
    }
  } finally { await runtime?.stop(); await rm(dataDir, { recursive: true, force: true }); }
}

async function probe(phase: string) {
  const { DurableCaseRepository } = await import('../backend/src/actors/case-repository');
  const room = new DurableCaseRepository().get('persistence-test');
  const solo = new DurableCaseRepository().get('solo-persistence-test');
  const one = { playerId: 'inspector-one', secret: 'test-only-one' };
  const two = { playerId: 'inspector-two', secret: 'test-only-two' };
  const action = { type: 'question' as const, npcId: 'baines-arrival', text: 'We would like to rent two rooms for the night.' };
  const conversation = actors.ConversationActor.get(conversationActorId('persistence-test', 'baines'));
  const identity = { ...one, npcId: action.npcId };
  async function listen(player: typeof one) {
    const grant = await room.prepareConversationWebsocket(player, action.npcId);
    const socket = new WebSocket(grant.websocketUrl);
    const events: ConversationEvent[] = [];
    const accepted = new Promise<ConversationEvent>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Conversation broadcast timed out.')), 10000);
      socket.addEventListener('message', event => {
        const message = JSON.parse(String(event.data)) as ConversationEvent; events.push(message);
        if (message.type === 'conversation' && message.state.result?.reply) { clearTimeout(timer); resolve(message); }
      });
    });
    await new Promise<void>((resolve, reject) => { socket.addEventListener('message', () => resolve(), { once: true }); socket.addEventListener('error', reject, { once: true }); });
    return { socket, accepted, events };
  }
  if (phase === 'prepare') {
    await solo.create(one.playerId, one.secret, 'Solo', 'solo');
    await solo.act(one, crypto.randomUUID(), { type: 'selectInspector', inspector: 'ellis' });
    await room.create(one.playerId, one.secret, 'One'); await room.join(two.playerId, two.secret, 'Two');
    const sockets = await Promise.all([room.connect(one), room.connect(two)]);
    try {
      const act = async (identity: typeof one, action: Parameters<typeof room.act>[2]) => {
        const result = await room.act(identity, crypto.randomUUID(), action);
        assert.equal(result.ok, true, result.message);
      };
      await act(one, { type: 'selectInspector', inspector: 'reed' }); await act(two, { type: 'selectInspector', inspector: 'ellis' });
      await act(one, { type: 'ready', ready: true }); await act(two, { type: 'ready', ready: true });
      const state = await room.snapshot(one), place = state.locations.find(place => place.id === 'lantern-common')!;
      const player = state.players.find(player => player.id === one.playerId)!;
      const visit = await room.sceneSession(one);
      for (const point of pathToWitness(player.position, witnessPosition('baines-arrival', place.navigation), place.indoor, place.navigation)) {
        assert.equal((await actors.SceneActor.get(entityActorId('persistence-test', place.id)).move({ ...one, visit: visit.visit }, { type: 'move', ...point })).ok, true);
      }
      await act(one, { type: 'begin', npcId: action.npcId });
      const session = await room.conversationSession(one, action.npcId);
      assert.equal(session.scope.entityId, 'baines');
      await conversation.configure(session.scope, session.member);
      const prepared = await conversation.prepareInterview(one, 'pending-turn', action);
      assert.ok(prepared.context, prepared.result?.message);
      const knowledge = prepared.context.knowledge.find(item => item.topicId === 'rooms')!;
      assert.equal(await conversation.claimInterview(one, 'pending-turn', 'test-worker'), true);
      const text = knowledge.facts.join(' ');
      const recording = { url: 'https://fal.media/files/test/shared-reply.mp3', text, durationMs: 12000 };
      await conversation.saveInterview(one, 'pending-turn', 'test-worker', {
        decision: { knowledgeId: knowledge.id, strategy: 'disclose', relationshipChange: 0, delivery: 'warm', confidence: 1, blocked: false, model: 'saved-director' },
        performance: { turns: [{ speaker: 'witness', text }], model: 'saved-performer', fallback: false },
        assessment: { safe: true, establishes: true },
        voiceJobs: [{ requestId: 'saved-fal-request' }], recordings: [null, recording],
      });
      console.log('Prepared: durable decision, performance and fal request checkpoint.');
    } finally { sockets.forEach(socket => socket.close()); }
  } else if (phase === 'resume') {
    const restored = await solo.snapshot(one);
    assert.equal(restored.mode, 'solo');
    assert.equal(restored.players.length, 1);
    assert.equal(restored.players[0].role, 'ellis');
    await assert.rejects(solo.join(two.playerId, two.secret, 'Two'), /single-player/);
    const prepared = await conversation.prepareInterview(one, 'pending-turn', action);
    assert.equal(prepared.turn?.draft.performance?.model, 'saved-performer');
    assert.equal(prepared.turn?.draft.voiceJobs?.[0].requestId, 'saved-fal-request');
    assert.equal(await conversation.claimInterview(one, 'pending-turn', 'test-worker'), true);
    await conversation.releaseInterview(one, 'pending-turn', 'test-worker');
    const listeners = await Promise.all([listen(one), listen(two)]);
    const result = await conversation.run(identity, 'pending-turn', action);
    const broadcasts = await Promise.all(listeners.map(listener => listener.accepted));
    for (const event of broadcasts) assert.deepEqual(event.type === 'conversation' && event.state.result?.reply?.recordings, result.reply?.recordings);
    listeners.forEach(listener => listener.socket.close());
    console.log('Both conversation sockets received the same accepted reply and recording reference.');
    assert.equal(result.ok, true, result.message);
    assert.equal(result.reply?.reward, 'lodging-arranged');
    assert.deepEqual((await conversation.prepareInterview(one, 'pending-turn', action)).result, result);
    console.log('Restart one: resumed and committed once without rerunning providers.');
  } else {
    const state = await room.snapshot(one);
    assert.equal(state.npcs.find(npc => npc.id === action.npcId)!.replies.filter(reply => reply.id === 'pending-turn').length, 1);
    assert.equal(state.evidence.filter(item => item.id === 'lodging-arranged').length, 1);
    assert.equal((await conversation.prepareInterview(one, 'pending-turn', action)).result?.ok, true);
    assert.equal((await conversation.history(identity)).replies.length, 1);
    console.log('Restart two: committed statement, evidence and character memory survived.');
  }
}
