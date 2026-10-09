import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import type { ActorDatabase, SqliteValue } from 'durable-actors';
import type { ConversationEvent } from '../shared/game/conversation-socket';
import type { Decision, TurnContext } from '../backend/src/intelligence/types';
import type { Reply } from '../shared/game/types';

process.env.STORY_PATH = 'tests/fixtures/framework/story.json';
const { ConversationActor } = await import('../backend/src/actors/conversation-actor');
const { conversationActorId, hashSecret } = await import('../backend/src/actors/entity-identity');
const { activeStory } = await import('../backend/src/active-story');
const npc = activeStory.characters[0];
npc.mind = { identity: npc.entityId, persona: 'A witness.', goals: [], voice: 'Daniel' };
const identity = { playerId: 'one', secret: 'private-one', npcId: npc.id };
const scope = { caseId: 'conversation-test', entityId: npc.entityId, storyId: activeStory.id, storyVersion: activeStory.version };
const action = { type: 'question' as const, npcId: npc.id, text: 'Hello.', spoken: true };
const decision: Decision = { strategy: 'engage', delivery: 'warm', relationshipChange: 1, confidence: 1, blocked: false, model: 'test' };

test('a conversation turn only calls the case for preparation and commit, and keeps private drafts off sockets', async () => {
  const f = await fixture();
  const result = await f.actor.run(identity, 'turn', action);
  assert.equal(result.ok, true);
  assert.deepEqual(f.caseCalls, ['prepare', 'commit']);
  assert.deepEqual(f.providerCalls, ['decision', 'reply', 'review']);
  assert.equal((await f.actor.history(identity)).replies.length, 1);
  assert.ok(f.actor.events.some(e => e.type === 'conversation' && e.state.pending?.stage === 'review'));
  const publicEvents = JSON.stringify(f.actor.events);
  assert.ok(!publicEvents.includes('private-one'));
  assert.ok(!publicEvents.includes('author-only-secret'));
  f.db.close();
});

test('a lost commit acknowledgement retries the case commit without repeating providers or testimony', async () => {
  const f = await fixture(true);
  await assert.rejects(f.actor.run(identity, 'turn', action), /acknowledgement/);
  assert.equal((await f.actor.history(identity)).replies.length, 0);
  const result = await f.actor.run(identity, 'turn', action);
  assert.equal(result.ok, true);
  assert.deepEqual(f.providerCalls, ['decision', 'reply', 'review']);
  assert.deepEqual(f.caseCalls, ['prepare', 'commit', 'commit']);
  assert.equal((await f.actor.history(identity)).replies.length, 1);
  f.db.close();
});

test('unauthorized players cannot read transcripts or generate dialogue', async () => {
  const f = await fixture();
  await assert.rejects(f.actor.history({ ...identity, secret: 'wrong' }), /session/);
  await assert.rejects(f.actor.run({ ...identity, playerId: 'stranger' }, 'turn', action), /session/);
  assert.deepEqual(f.caseCalls, []);
  f.db.close();
});

test('closing an interview fences an in-flight response before case commit', async () => {
  let release!: () => void, entered!: () => void;
  const waiting = new Promise<void>(resolve => { release = resolve; });
  const started = new Promise<void>(resolve => { entered = resolve; });
  const f = await fixture(false, async () => { entered(); await waiting; });
  const work = f.actor.run(identity, 'turn', action);
  await started;
  await f.actor.cancel(identity);
  release();
  await assert.rejects(work, /cancelled/);
  assert.deepEqual(f.caseCalls, ['prepare']);
  assert.equal((await f.actor.history(identity)).replies.length, 0);
  f.db.close();
});

async function fixture(loseAcknowledgement = false, onPerformance = async () => {}) {
  const db = new DatabaseSync(':memory:');
  const database: ActorDatabase = { exec<Row extends object>(sql: string, ...values: SqliteValue[]) { return db.prepare(sql).all(...values) as Row[]; } };
  const caseCalls: string[] = [], providerCalls: string[] = [];
  let lost = false;
  const reply: Reply = { id: 'turn', npcId: npc.id, playerId: 'one', question: 'Hello.', text: 'Good evening.', conversational: true, topicId: 'conversation', at: 1, approach: 'reassure', success: false, relationshipChange: 1 };
  const room = {
    async authorizeMicrophone() { return { ok: true, message: '' }; },
    async prepareInterview() {
      caseCalls.push('prepare');
      const context: TurnContext = { npc: { ...npc, mind: { ...npc.mind!, background: ['author-only-secret'] } }, memories: [], knowledge: [], evidence: [], input: 'Hello.', spoken: true, situation: 'An inn.', investigator: { id: 'one', name: 'Reed', role: 'reed' } };
      return { context, turn: { id: 'turn', playerId: 'one', npcId: npc.id, fingerprint: 'context', action, at: 1, status: 'pending' as const, draft: {} } };
    },
    async commitInterview() {
      caseCalls.push('commit');
      if (loseAcknowledgement && !lost) { lost = true; throw new Error('Commit acknowledgement lost'); }
      return { ok: true, message: 'Saved.', reply };
    },
  };
  class TestConversation extends ConversationActor {
    events: ConversationEvent[] = [];
    constructor() {
      super({ case: () => room, conversation: () => this }, () => ({
        director: { async decide() { providerCalls.push('decision'); return decision; }, async review() { providerCalls.push('review'); return { safe: true, establishes: false }; } },
        performer: { async perform() { providerCalls.push('reply'); await onPerformance(); return { turns: [{ speaker: 'witness' as const, text: 'Good evening.' }], model: 'test', fallback: false }; } },
      }));
    }
    protected get id() { return conversationActorId(scope.caseId, scope.entityId); }
    get db() { return database; }
    protected broadcast(event: ConversationEvent) { this.events.push(event); }
  }
  const actor = new TestConversation();
  await actor.configure(scope, { playerId: identity.playerId, secretHash: hashSecret(identity.secret) });
  return { actor, db, caseCalls, providerCalls };
}
