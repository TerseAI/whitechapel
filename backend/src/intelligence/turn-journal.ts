import type { ActionResult } from '../../../shared/game/types.js';
import type { InterviewAction, TurnDraft, TurnRecord } from './types.js';

export class TurnJournal {
  constructor(private turns: TurnRecord[], private readonly now: () => number) {}

  reserve(id: string, playerId: string, npcId: string, fingerprint: string, action: InterviewAction): TurnRecord {
    const previous = this.get(id);
    if (previous) {
      if (previous.playerId !== playerId || JSON.stringify(previous.action) !== JSON.stringify(action)) throw new Error('Request belongs to another turn.');
      return previous;
    }
    if (this.turns.some(turn => turn.npcId === npcId && turn.status === 'pending')) throw new Error('A reply is already pending.');
    const turn: TurnRecord = { id, playerId, npcId, fingerprint, action, at: this.now(), status: 'pending', draft: {} };
    this.turns.push(turn);
    return turn;
  }

  get(id: string) { return this.turns.find(turn => turn.id === id); }
  records() { return this.turns; }

  claim(id: string, worker: string): boolean {
    const turn = this.pending(id);
    if (turn.worker && turn.worker !== worker && (turn.workerUntil ?? 0) > this.now()) return false;
    turn.worker = worker; turn.workerUntil = this.now() + 60_000;
    return true;
  }

  save(id: string, worker: string, draft: TurnDraft) {
    const turn = this.pending(id);
    if (turn.worker !== worker || (turn.workerUntil ?? 0) <= this.now()) throw new Error('Generation ownership expired.');
    turn.draft = draft; turn.workerUntil = this.now() + 60_000;
  }

  complete(id: string, result: ActionResult) {
    const turn = this.pending(id);
    turn.status = 'complete'; turn.result = result;
    this.turns = this.turns.filter(item => item.status === 'pending' || item === turn || this.turns.indexOf(item) >= this.turns.length - 120);
  }

  cancelFor(playerId: string) {
    for (const turn of this.turns) if (turn.playerId === playerId && turn.status === 'pending') turn.status = 'cancelled';
  }

  private pending(id: string): TurnRecord {
    const turn = this.get(id);
    if (!turn) throw new Error('Unknown interview turn.');
    if (turn.status === 'complete') throw new Error('Turn already committed.');
    if (turn.status === 'cancelled') throw new Error('Turn was cancelled.');
    return turn;
  }
}
