import type { DialogueTurn, Reply } from '../../../shared/game/types.js';
import type { Decision, TurnContext, TurnDraft } from './types.js';
import { knowledgeProgress } from './knowledge-progress.js';

const standings = ['hostile', 'wary', 'neutral', 'willing', 'confiding'] as const;

export function conversationBrief(context: TurnContext, decision: Decision) {
  const selected = selectedKnowledge(context, decision);
  const mind = context.npc.mind!;
  return { name: context.npc.name, occupation: context.npc.occupation, persona: mind.persona, manner: mind.manner ?? '',
    goals: mind.goals, background: mind.background ?? [], situation: context.situation,
    playerMessage: context.input, investigator: context.investigator.name,
    ...(context.presented ? { presentedExhibit: { title: context.presented.title, description: context.presented.description } } : {}),
    towardsThisInvestigator: describeStanding(relationshipStanding(context)),
    strategy: decision.strategy, delivery: decision.delivery,
    disclosure: selected ? { subject: selected.subject, facts: selected.facts } : null,
    conversation: (context.conversation ?? context.memories).slice(-24).map(reply => ({ investigator: reply.playerId === context.investigator.id ? context.investigator.name : 'The other inspector', said: reply.question, response: reply.text })),
  };
}

export function relationshipStanding(context: TurnContext): number {
  if (context.standing !== undefined) return context.standing;
  return context.memories.filter(reply => reply.playerId === context.investigator.id)
    .reduce((value, reply) => Math.max(-4, Math.min(4, value + (reply.relationshipChange ?? 0))), 0);
}

function describeStanding(standing: number): string {
  return standings[Math.round((Math.max(-4, Math.min(4, standing)) + 4) / 2)];
}

export function conversationReply(context: TurnContext, draft: TurnDraft, id: string, at: number): Reply {
  if (!draft.decision) throw new Error('Missing character decision.');
  const selected = selectedKnowledge(context, draft.decision);
  if (!draft.performance || !draft.assessment?.safe || !validConversation(draft.performance.turns)) throw new Error('The response has not been validated.');
  const progress = knowledgeProgress(context, draft.assessment, selected?.id);
  const established = progress.disclosures.find(item => item.knowledgeId === selected?.id) ?? progress.disclosures[0];
  const knowledge = context.knowledge.find(item => item.id === established?.knowledgeId) ?? selected;
  const establishes = !!established;
  return { id, at, npcId: context.npc.id, playerId: context.investigator.id, conversational: true, spoken: context.spoken,
    topicId: knowledge?.topicId ?? 'conversation', ...(knowledge ? { knowledgeId: knowledge.id } : {}),
    question: context.input, text: draft.performance.turns.map(turn => turn.text).join('\n\n'), turns: draft.performance.turns,
    ...progress, success: establishes, approach: draft.decision.delivery === 'defensive' ? 'press' : 'reassure',
    relationshipChange: draft.decision.relationshipChange, ...(context.presented ? { evidenceId: context.presented.id } : {}),
    ...(establishes && knowledge?.reward ? { reward: knowledge?.reward } : {}), ...(establishes && knowledge?.choice ? { choice: knowledge?.choice } : {}),
    recordings: draft.recordings, performance: { director: draft.decision.model, performer: draft.performance.model, delivery: draft.decision.delivery, fallback: false,
      ...(draft.timings ? { timings: draft.timings } : {}) },
  };
}

export function validConversation(turns: DialogueTurn[]): boolean {
  return turns.length === 1 && turns.every(turn => turn.speaker === 'witness' && turn.text.trim().length > 0 && turn.text.length <= 2500);
}

export function selectedKnowledge(context: TurnContext, decision: Decision) {
  const knowledge = context.knowledge.find(item => item.id === decision.knowledgeId);
  if (decision.knowledgeId && !knowledge) throw new Error('Character knowledge is unavailable.');
  return knowledge;
}
