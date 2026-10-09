import type { NpcView, Reply, Topic } from './types.js';
import { gateOpen, type StoryFacts } from './story-gates.js';

export function canFollowUp(npc: Pick<NpcView, 'id' | 'replies'> & Partial<Pick<NpcView, 'repeatable'>>, topicId: string) {
  if (interviewEnded(npc)) return false;
  const reply = topicReply(npc, topicId);
  return !reply || (npc.repeatable !== false && !reply.success);
}

export function topicReply(npc: Pick<NpcView, 'replies'>, topicId: string) {
  return npc.replies.find(r => r.success && (r.topicId === topicId || r.disclosures?.some(item => item.topicId === topicId)))
    ?? npc.replies.filter(r => r.topicId === topicId).at(-1);
}

export function topicAvailable(topic: Topic, npc: Pick<NpcView, 'replies'>, evidenceIds: readonly string[], facts: Omit<StoryFacts, 'evidence'> = {}) {
  if (interviewEnded(npc)) return false;
  if (topicReply(npc, topic.id)) return true;
  if (!gateOpen(topic, { evidence: evidenceIds, ...facts })) return false;
  if (topic.requiresEvidence && !evidenceIds.includes(topic.requiresEvidence)) return false;
  if (topic.afterUnsuccessfulTopic) {
    const earlier = topicReply(npc, topic.afterUnsuccessfulTopic);
    if (!earlier || earlier.success) return false;
  }
  return true;
}

export function hasInterviewRecord(npc: Pick<NpcView, 'id' | 'replies'> & Partial<Pick<NpcView, 'repeatable'>> & Partial<Pick<NpcView, 'topics' | 'requiredTopics'>>, evidenceIds: readonly string[]) {
  if (npc.requiredTopics?.length) return npc.requiredTopics.every(id => topicReply(npc, id)?.success || !!npc.topics?.some(topic => topic.id === id && topic.documentId && evidenceIds.includes(topic.documentId)));
  if (npc.topics?.length && npc.topics.every(t => t.documentId))
    return npc.topics.every(t => evidenceIds.includes(t.documentId!));
  return npc.replies.some(r => r.success);
}

export function replyClip(reply: Reply) {
  if (reply.clip) return reply.clip;
  return `${reply.npcId}-${reply.topicId}-${reply.approach}`;
}

export function interviewEnded(npc: Pick<NpcView, 'replies'>) {
  return npc.replies.some(reply => reply.success && reply.endsInterview === true);
}
