import type { EvidenceStatement, NpcView, Player, Reply } from '../../../shared/game/types.js';

export function mergeInterviewRecords(saved: readonly NpcView[], current: readonly NpcView[]): NpcView[] {
  return [...new Map([...saved, ...current].map(npc => [npc.id, npc])).values()];
}

export function testimonyStatements(evidenceId: string, collected: readonly string[], records: readonly NpcView[], investigators: readonly Pick<Player, 'id' | 'name'>[]): EvidenceStatement[] {
  if (!collected.includes(evidenceId)) return [];
  return records.flatMap(npc => npc.replies.filter(reply => supportsEvidence(reply, evidenceId, npc.replies)).map(reply => ({
    id: reply.id,
    witnessId: npc.id,
    witnessName: npc.name,
    investigatorName: investigators.find(player => player.id === reply.playerId)?.name ?? 'Investigator',
    question: reply.question,
    turns: reply.turns?.map(turn => ({ ...turn })) ?? [{ speaker: 'witness', text: reply.text }],
  })));
}

function supportsEvidence(reply: Reply, evidenceId: string, replies: Reply[]) {
  if (reply.success && reply.reward === evidenceId) return true;
  const knowledge = replies.flatMap(item => item.disclosures ?? []).filter(item => item.reward === evidenceId).map(item => item.knowledgeId);
  return knowledge.some(id => !!reply.establishedFacts?.[id]?.length);
}
