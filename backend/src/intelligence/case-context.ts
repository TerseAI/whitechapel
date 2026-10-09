import { createHash } from 'node:crypto';
import type { CaseView } from '../../../shared/game/types.js';
import type { Character, StoryDefinition } from '../../../shared/story/types.js';
import { gateOpen } from '../../../shared/game/story-gates.js';
import { disclosureMessage } from './story-policy.js';
import type { InterviewAction, TurnContext } from './types.js';

export function prepareContext(_story: StoryDefinition, state: CaseView, npc: Character, playerId: string, action: InterviewAction, memories: TurnContext['memories']): TurnContext {
  const player = state.players.find(player => player.id === playerId)!;
  const current = state.npcs.find(witness => witness.id === npc.id);
  if (state.phase !== 'investigating' || !current || current.location !== player.location || current.lease?.playerId !== playerId || current.lease.until <= Date.now())
    throw new Error('Speak to the witness before continuing the conversation.');
  if (!npc.mind) throw new Error('This character is not configured for conversation.');
  if (action.type !== 'question') throw new Error('Speak in your own words.');
  const evidence = state.evidence.map(item => item.id);
  const presented = state.evidence.find(item => item.id === action.evidenceId);
  if (action.evidenceId && !presented) throw new Error('Collect an exhibit before presenting it.');
  const blocked = disclosureMessage(npc, action.text, evidence);
  if (blocked) throw new Error(blocked);
  const knowledge = (npc.mind.knowledge ?? []).filter(item =>
    gateOpen(item, { evidence, deductions: state.deductions, decisions: state.decisions, reportAccepted: state.reportAccepted })
    && (!item.requiresEvidence || evidence.includes(item.requiresEvidence))
    && (!item.requiresPresented?.length || item.requiresPresented.includes(action.evidenceId ?? '') || memories.some(reply => reply.npcId === npc.id && ((reply.knowledgeId === item.id && reply.success) || reply.disclosures?.some(disclosure => disclosure.knowledgeId === item.id))))
    && (!item.afterUnsuccessfulTopic || memories.some(reply => reply.topicId === item.afterUnsuccessfulTopic && !reply.success)),
  );
  return { npc, knowledge, memories, evidence, input: action.text, spoken: action.spoken,
    situation: `${state.chapter?.date ?? ''}. ${state.locations?.find(place => place.id === npc.location)?.name ?? npc.location}.`,
    ...(presented ? { presented: { id: presented.id, title: presented.title, description: presented.description } } : {}),
    investigator: { id: player.id, name: player.name, role: player.role },
  };
}

export function contextFingerprint(context: TurnContext, chapter: number): string {
  return createHash('sha256').update(JSON.stringify({ chapter, npc: context.npc.id, knowledge: context.knowledge, memories: context.memories.map(reply => reply.id) })).digest('hex');
}
