import type { Approach, NpcView, Reply } from '../../../shared/game/types.js';
import { interviewEnded, topicReply } from '../../../shared/game/interviews.js';
import type { Clock } from '../clock.js';
import { evaluateReply, type Character } from '../story.js';

const LEASE_MS = 90_000;
type Answer = { ok: boolean; reply: Reply | null; view: NpcView };

export class CharacterState {
  private trust: number;
  private lease: NpcView['lease'];
  private replies: Reply[];

  constructor(
    private readonly npc: Character,
    private readonly clock: Clock,
    state?: NpcView,
  ) {
    this.trust = state?.trust ?? 2;
    this.lease = state?.lease ? { ...state.lease } : null;
    this.replies = state ? state.replies.map(reply => ({ ...reply })) : [];
  }

  view(): NpcView {
    const { id, name, occupation, location, greeting, historical } = this.npc;
    return {
      id,
      portrait: this.npc.portrait, appearance: this.npc.appearance, repeatable: this.npc.repeatable, requiredTopics: this.npc.requiredTopics,
      posture: this.npc.posture, hatPlacement: this.npc.hatPlacement,
      name,
      occupation,
      location,
      greeting,
      historical,
      trust: this.trust,
      lease: this.activeLease(),
      topics: publicTopics(this.npc),
      replies: this.replies,
    };
  }

  acquire(playerId: string): { ok: boolean; view: NpcView } {
    if (interviewEnded(this.view())) return { ok: false, view: this.view() };
    const lease = this.activeLease();
    if (lease && lease.playerId !== playerId) return { ok: false, view: this.view() };
    this.lease = { playerId, until: this.clock.now() + LEASE_MS };
    return { ok: true, view: this.view() };
  }

  release(playerId: string): NpcView {
    if (this.lease?.playerId === playerId) this.lease = null;
    return this.view();
  }

  renew(playerId: string): NpcView {
    const lease = this.activeLease();
    if (lease?.playerId === playerId) lease.until = this.clock.now() + LEASE_MS;
    return this.view();
  }

  answer(playerId: string, requestId: string, topicId: string, approach: Approach, evidenceId?: string): Answer {
    const duplicate = this.replies.find((reply) => reply.id === requestId);
    if (duplicate) return this.answerResult(duplicate);
    if (interviewEnded(this.view())) return this.answerResult(null);
    if (this.activeLease()?.playerId !== playerId) return this.answerResult(null);
    if (this.npc.repeatable === false && topicReply({ replies: this.replies }, topicId)) return this.answerResult(null);
    const recorded = this.replies.find((reply) => reply.topicId === topicId && reply.success);
    if (recorded) return this.answerResult(recorded);
    if (this.npc.topics.find(topic => topic.id === topicId)?.documentId) approach = 'reassure';
    const reply: Reply = {
      id: requestId,
      npcId: this.npc.id,
      topicId,
      playerId,
      approach,
      ...evaluateReply(this.npc, topicId, approach, evidenceId),
      at: this.clock.now(),
      ...(evidenceId ? { evidenceId } : {}),
    };
    this.recordReply(reply);
    return this.answerResult(reply);
  }

  accept(reply: Reply): Answer {
    const existing = this.replies.find(item => item.id === reply.id);
    if (existing) return this.answerResult(existing);
    if (reply.npcId !== this.npc.id || this.activeLease()?.playerId !== reply.playerId || interviewEnded(this.view())) return this.answerResult(null);
    const recorded = this.replies.find(item => item.topicId === reply.topicId && item.success);
    if (recorded && !reply.conversational) return this.answerResult(recorded);
    this.recordReply(reply);
    return this.answerResult(reply);
  }

  private activeLease() {
    return this.lease && this.lease.until > this.clock.now() ? this.lease : null;
  }

  private answerResult(reply: Reply | null): Answer {
    return { ok: reply !== null, reply, view: this.view() };
  }

  private recordReply(reply: Reply) {
    this.trust = Math.max(0, Math.min(4, this.trust + (reply.conversational ? reply.relationshipChange ?? 0 : reply.success ? 1 : -1)));
    const replies = [...this.replies, reply];
    const recentFailures = new Set(replies.filter(item => !item.success).slice(-80));
    this.replies = replies.filter(item => item.success || Object.values(item.establishedFacts ?? {}).some(facts => facts.length) || recentFailures.has(item));
    this.renew(reply.playerId);
  }
}

export function publicTopics(npc: Character) {
  return npc.topics.map(
    ({ id, label, ask, claim, observation, documentId, choices, requiresEvidence, afterUnsuccessfulTopic, requiresAll, requiresDeduction, requiresChoice, requiresReport }) => ({
      id,
      label,
      ask,
      claim,
      observation,
      documentId,
      choices,
      requiresEvidence,
      afterUnsuccessfulTopic,
      requiresAll, requiresDeduction, requiresChoice, requiresReport,
    }),
  );
}
