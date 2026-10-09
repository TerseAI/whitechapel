import type { ActorDatabase } from 'durable-actors';
import type { ActionResult, Reply } from '../../../shared/game/types.js';
import type { ConversationPage } from '../../../shared/game/conversation-socket.js';
import type { TurnContext, TurnDraft, TurnRecord } from '../intelligence/types.js';
import { TurnJournal } from '../intelligence/turn-journal.js';

export type SavedTurn = { context?: TurnContext; turn: TurnRecord };

export class ConversationStore {
  constructor(private readonly db: ActorDatabase, private readonly now: () => number = Date.now) {
    db.exec('CREATE TABLE IF NOT EXISTS conversation_turns (id TEXT PRIMARY KEY, status TEXT NOT NULL, body TEXT NOT NULL)');
    db.exec('CREATE TABLE IF NOT EXISTS conversation_transcript (sequence INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT UNIQUE NOT NULL, reply TEXT NOT NULL)');
    db.exec('CREATE TABLE IF NOT EXISTS conversation_relationships (player_id TEXT PRIMARY KEY, standing INTEGER NOT NULL)');
  }

  reserve(context: TurnContext, turn: TurnRecord): SavedTurn {
    const existing = this.get(turn.id);
    if (existing) return existing;
    if (this.pending()) throw new Error('A reply is already pending.');
    const saved = { context, turn: structuredClone(turn) };
    this.write(saved);
    return saved;
  }

  get(id: string): SavedTurn | undefined {
    const row = this.db.exec<{ body: string }>('SELECT body FROM conversation_turns WHERE id = ?', id)[0];
    return row ? JSON.parse(row.body) : undefined;
  }

  pending(): SavedTurn | undefined {
    const row = this.db.exec<{ body: string }>("SELECT body FROM conversation_turns WHERE status = 'pending' LIMIT 1")[0];
    return row ? JSON.parse(row.body) : undefined;
  }

  claim(id: string, worker: string): boolean {
    const saved = this.required(id);
    const claimed = new TurnJournal([saved.turn], this.now).claim(id, worker);
    this.write(saved);
    return claimed;
  }

  save(id: string, worker: string, draft: TurnDraft) {
    const saved = this.required(id);
    new TurnJournal([saved.turn], this.now).save(id, worker, draft);
    this.write(saved);
  }

  release(id: string, worker: string) {
    const saved = this.required(id);
    if (saved.turn.worker !== worker) return;
    delete saved.turn.worker; delete saved.turn.workerUntil;
    this.write(saved);
  }

  finish(id: string, result: ActionResult) {
    const saved = this.required(id);
    if (saved.turn.result) return;
    if (saved.turn.status === 'cancelled') throw new Error('Turn was cancelled.');
    if (result.ok && result.reply) this.append(result.reply);
    saved.turn.status = 'complete'; saved.turn.result = result; saved.turn.draft = {};
    delete saved.context;
    this.write(saved);
  }

  cancel(playerId: string, npcId: string) {
    const saved = this.pending();
    if (!saved || saved.turn.playerId !== playerId || saved.turn.npcId !== npcId) return;
    saved.turn.status = 'cancelled'; saved.turn.draft = {};
    saved.turn.result = { ok: false, message: 'That conversation was closed.' };
    delete saved.context;
    this.write(saved);
  }

  append(reply: Reply) {
    const inserted = this.db.exec<{ id: string }>('INSERT INTO conversation_transcript (id, reply) VALUES (?, ?) ON CONFLICT(id) DO NOTHING RETURNING id', reply.id, JSON.stringify(reply));
    if (!inserted.length) return;
    const standing = Math.max(-4, Math.min(4, this.standing(reply.playerId) + (reply.relationshipChange ?? 0)));
    this.db.exec('INSERT INTO conversation_relationships (player_id, standing) VALUES (?, ?) ON CONFLICT(player_id) DO UPDATE SET standing = excluded.standing', reply.playerId, standing);
  }

  standing(playerId: string): number {
    return this.db.exec<{ standing: number }>('SELECT standing FROM conversation_relationships WHERE player_id = ?', playerId)[0]?.standing ?? 0;
  }

  recent(limit = 24): Reply[] { return this.history(undefined, limit).replies; }

  history(before?: number, limit = 50): ConversationPage {
    const size = Math.max(1, Math.min(100, Math.floor(limit)));
    const rows = this.db.exec<{ sequence: number; reply: string }>('SELECT sequence, reply FROM conversation_transcript WHERE sequence < ? ORDER BY sequence DESC LIMIT ?', before ?? Number.MAX_SAFE_INTEGER, size + 1);
    const page = rows.slice(0, size);
    return { replies: page.map(row => JSON.parse(row.reply) as Reply).reverse(), ...(rows.length > size ? { before: page.at(-1)!.sequence } : {}) };
  }

  private required(id: string): SavedTurn {
    const saved = this.get(id);
    if (!saved) throw new Error('Unknown interview turn.');
    return saved;
  }

  private write(saved: SavedTurn) {
    this.db.exec('INSERT INTO conversation_turns (id, status, body) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET status = excluded.status, body = excluded.body', saved.turn.id, saved.turn.status, JSON.stringify(saved));
  }
}
