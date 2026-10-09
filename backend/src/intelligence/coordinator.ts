import { randomUUID } from 'node:crypto';
import type { Action, ActionResult, StageTimings } from '../../../shared/game/types.js';
import type { Character } from '../../../shared/story/types.js';
import type { Identity } from '../cases/case-service.js';
import { selectedKnowledge, validConversation } from './conversation-policy.js';
import { DialogueServiceError } from './dialogue-service-error.js';
import type { CharacterPerformer, DecisionMaker, InterviewAction, InterviewAuthority, SpeechProducer, TurnContext, TurnDraft } from './types.js';

export class InterviewCoordinator {
  private readonly running = new Map<string, Promise<ActionResult>>();
  constructor(private readonly rooms: { get(id: string): InterviewAuthority }, private readonly director: DecisionMaker,
    private readonly performer: CharacterPerformer, private readonly speech: SpeechProducer | undefined, private readonly cast: Character[],
    private readonly warn: (message: string) => void = console.warn, private readonly clock: () => number = () => performance.now()) {}

  handles(action: Action): action is InterviewAction {
    return action.type === 'question' && this.cast.some(character => character.id === action.npcId && character.mind);
  }

  run(roomId: string, identity: Identity, id: string, action: InterviewAction): Promise<ActionResult> {
    const key = `${roomId}:${identity.playerId}:${id}`;
    const existing = this.running.get(key);
    if (existing) return existing;
    const work = this.generate(roomId, identity, id, action).finally(() => this.running.delete(key));
    this.running.set(key, work);
    return work;
  }

  private async generate(roomId: string, identity: Identity, id: string, action: InterviewAction): Promise<ActionResult> {
    const room = this.rooms.get(roomId);
    const prepared = await room.prepareInterview(identity, id, action);
    if (prepared.result) return prepared.result;
    const { context, turn } = prepared;
    if (!context || !turn) throw new Error('The conversation could not be prepared.');
    const worker = randomUUID();
    if (!await room.claimInterview(identity, id, worker)) return { ok: false, pending: true, message: 'Waiting for a response.' };
    const renewal = setInterval(() => {
      void room.claimInterview(identity, id, worker).catch(() => this.warn('Conversation ownership renewal failed.'));
    }, 20_000);
    try { return await this.generateClaimed(room, identity, id, worker, context, turn.draft); }
    finally { clearInterval(renewal); await room.releaseInterview?.(identity, id, worker); }
  }

  private async generateClaimed(room: InterviewAuthority, identity: Identity, id: string, worker: string, context: TurnContext, draft: TurnDraft): Promise<ActionResult> {
    if (draft.failure) return room.commitInterview(identity, id, worker);
    let checkpoint = Promise.resolve();
    const save = () => checkpoint = checkpoint.then(() => room.saveInterview(identity, id, worker, structuredClone(draft)));
    try {
      if (!draft.decision) { draft.decision = await this.timed(draft, 'decisionMs', () => this.director.decide(context)); await save(); }
      if (draft.decision.blocked) return room.commitInterview(identity, id, worker);
      selectedKnowledge(context, draft.decision);
      await this.perform(context, draft, save);
      if (!draft.recordings && this.speech) { draft.recordings = await this.timed(draft, 'voiceMs', () => this.voice(context, draft, this.speech!, save)); await save(); }
    } catch (error) {
      draft.failure = error instanceof DialogueServiceError ? error.message : 'The conversation was interrupted. Your message has not been recorded; please send it again.';
      this.warn(error instanceof DialogueServiceError ? error.message : `Conversation generation failed: ${error instanceof Error ? `${error.name}: ${error.message}` : 'unknown error'}`);
      await save();
    }
    return room.commitInterview(identity, id, worker);
  }

  private async perform(context: TurnContext, draft: TurnDraft, save: () => Promise<void>) {
    if (draft.assessment?.safe && draft.performance && validConversation(draft.performance.turns)) return;
    for (let attempt = 0; attempt < 2; attempt++) {
      if (!draft.performance) { draft.performance = await this.timed(draft, 'performanceMs', () => this.performer.perform(context, draft.decision!, attempt > 0)); await save(); }
      const turns = draft.performance.turns;
      draft.assessment = validConversation(turns)
        ? await this.timed(draft, 'reviewMs', () => this.director.review(context, draft.decision!, turns)) : { safe: false, establishes: false };
      await save();
      if (draft.assessment.safe) return;
      delete draft.performance; delete draft.assessment;
      await save();
    }
    throw new DialogueServiceError(`${context.npc.name} did not give a usable reply. Your message has not been recorded; try saying it another way.`);
  }

  private voice(context: TurnContext, draft: TurnDraft, speech: SpeechProducer, save: () => Promise<void>) {
    const lines = [...(context.spoken ? [] : [{ speaker: 'investigator' as const, text: context.input }]), ...draft.performance!.turns];
    draft.voiceJobs ??= lines.map(() => ({}));
    return Promise.all(lines.map((line, index) => speech.synthesize(line.text,
      line.speaker === 'witness' ? context.npc.mind!.voice : context.investigator.role,
      line.speaker === 'witness' ? draft.decision!.delivery : 'matter-of-fact', draft.voiceJobs![index], save).catch(() => {
        this.warn('Voice unavailable; the saved response remains readable.'); return null;
      })));
  }

  private async timed<T>(draft: TurnDraft, stage: keyof StageTimings, work: () => Promise<T>): Promise<T> {
    const started = this.clock();
    try { return await work(); }
    finally { draft.timings = { ...draft.timings, [stage]: (draft.timings?.[stage] ?? 0) + Math.round(this.clock() - started) }; }
  }
}
