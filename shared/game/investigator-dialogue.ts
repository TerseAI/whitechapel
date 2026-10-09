import type { Approach, Player, Topic } from './types.js';
export type QuestionMoment = 'ask' | Approach;
export function investigatorQuestion(npcId: string, topic: Topic, moment: QuestionMoment): string {
  const line = moment === 'ask' ? topic.ask : topic.choices?.find(c => c.approach === moment)?.label;
  if (!line) throw new Error(`Missing investigator dialogue: ${npcId}/${topic.id}/${moment}`);
  return line;
}
export function investigatorClip(role: Player['role'], npcId: string, topicId: string, moment: QuestionMoment) {
  return `detective-${role.toLowerCase()}-${npcId}-${topicId}-${moment}`;
}
export function followupClip(role: Player['role'], replyClip: string, turn: number) {
  return `detective-${role.toLowerCase()}-${replyClip}-turn-${turn}`;
}
