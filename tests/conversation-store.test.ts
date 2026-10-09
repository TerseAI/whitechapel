import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { ActorDatabase, SqliteValue } from 'durable-actors';
import { ConversationStore } from '../backend/src/conversations/conversation-store';
import type { TurnContext, TurnRecord } from '../backend/src/intelligence/types';
import type { Reply } from '../shared/game/types';

test('conversation checkpoints and accepted transcripts survive reopening SQLite', () => {
  const directory = mkdtempSync(join(tmpdir(), 'whitechapel-conversation-'));
  try {
    const file = join(directory, 'history.sqlite');
    let db = new DatabaseSync(file);
    let store = new ConversationStore(database(db), () => 1000);
    store.reserve(context(), turn('one'));
    assert.equal(store.claim('one', 'worker'), true);
    store.save('one', 'worker', { performance: { turns: [{ speaker: 'witness', text: 'Good evening.' }], model: 'saved-model', fallback: false }, voiceJobs: [{ requestId: 'voice-job' }] });
    assert.deepEqual(store.history().replies, []);
    db.close();
    db = new DatabaseSync(file);
    store = new ConversationStore(database(db), () => 1001);
    assert.equal(store.get('one')?.turn.draft.performance?.model, 'saved-model');
    assert.equal(store.get('one')?.turn.draft.voiceJobs?.[0].requestId, 'voice-job');
    store.finish('one', { ok: true, message: 'Saved.', reply: reply('one') });
    db.close();
    db = new DatabaseSync(file);
    store = new ConversationStore(database(db), () => 1002);
    assert.equal(store.history().replies[0].text, 'Good evening.');
    assert.equal(store.pending(), undefined);
    assert.equal(store.get('one')?.context, undefined);
    db.close();
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('retried commits append one transcript entry and change the relationship once', () => {
  const db = new DatabaseSync(':memory:');
  const store = new ConversationStore(database(db));
  store.reserve(context(), turn('one'));
  const result = { ok: true, message: 'Saved.', reply: reply('one') };
  store.finish('one', result);
  store.finish('one', result);
  assert.equal(store.history().replies.length, 1);
  assert.equal(store.standing('player'), 1);
  assert.deepEqual(store.get('one')?.turn.result, result);
  db.close();
});

test('history is paginated while model memory stays bounded across appearances and detectives', () => {
  const db = new DatabaseSync(':memory:');
  const store = new ConversationStore(database(db));
  for (let i = 0; i < 70; i++) store.append({ ...reply(`turn-${i}`), at: i, npcId: i < 35 ? 'first-appearance' : 'later-appearance', playerId: i % 2 ? 'partner' : 'player' });
  assert.equal(store.recent().length, 24);
  assert.equal(store.recent()[0].id, 'turn-46');
  const first = store.history(undefined, 50);
  const older = store.history(first.before, 50);
  assert.equal(first.replies.length, 50);
  assert.equal(older.replies.length, 20);
  assert.equal(new Set([...first.replies, ...older.replies].map(item => item.id)).size, 70);
  assert.equal(store.standing('player'), 4);
  assert.equal(store.standing('partner'), 4);
  db.close();
});

test('cancellation fences pending workers and never turns a draft into testimony', () => {
  const db = new DatabaseSync(':memory:');
  const store = new ConversationStore(database(db), () => 1000);
  store.reserve(context(), turn('one'));
  store.claim('one', 'worker');
  store.cancel('someone-else', 'witness');
  assert.ok(store.pending());
  store.cancel('player', 'witness');
  assert.equal(store.pending(), undefined);
  assert.throws(() => store.save('one', 'worker', {}), /cancelled/i);
  assert.deepEqual(store.history().replies, []);
  db.close();
});

function database(db: DatabaseSync): ActorDatabase {
  return { exec<Row extends object>(sql: string, ...bindings: SqliteValue[]): Row[] { return db.prepare(sql).all(...bindings) as Row[]; } };
}
function context(): TurnContext { return { npc: { id: 'witness' }, memories: [], input: 'Hello.' } as unknown as TurnContext; }
function turn(id: string): TurnRecord { return { id, playerId: 'player', npcId: 'witness', fingerprint: 'context', action: { type: 'question', npcId: 'witness', text: 'Hello.' }, at: 1, status: 'pending', draft: {} }; }
function reply(id: string): Reply { return { id, npcId: 'witness', playerId: 'player', question: 'Hello.', text: 'Good evening.', at: 1, topicId: 'conversation', conversational: true, success: false, approach: 'reassure', relationshipChange: 1 }; }
