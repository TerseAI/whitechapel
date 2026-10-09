import type { Reply } from '../../../shared/game/types.js';
import type { Assessment, TurnContext } from './types.js';

export function knowledgeProgress(context: TurnContext, assessment: Assessment, selectedId?: string) {
  const establishedFacts: Record<string, number[]> = {};
  const disclosures: NonNullable<Reply['disclosures']> = [];
  for (const item of context.knowledge) {
    const current = assessment.establishes && item.id === selectedId ? item.facts.map((_, index) => index)
      : [...new Set(assessment.facts?.[item.id] ?? [])].filter(index => Number.isInteger(index) && index >= 0 && index < item.facts.length);
    if (!current.length) continue;
    establishedFacts[item.id] = current;
    const previous = context.memories.filter(reply => reply.npcId === context.npc.id).flatMap(reply => reply.establishedFacts?.[item.id] ?? []);
    const accumulated = new Set([...previous, ...current]);
    if (item.facts.every((_, index) => accumulated.has(index))) disclosures.push({ knowledgeId: item.id, topicId: item.topicId, reward: item.reward, choice: item.choice });
  }
  return { establishedFacts, disclosures };
}
