import { activeStory } from './active-story.js';
import type { Approach } from '../../shared/game/types.js';
import type { Character } from '../../shared/story/types.js';
export type { Character, Branch, StoryTopic } from '../../shared/story/types.js';
export { campaign } from './campaign-data.js';
export type { Chapter } from './campaign-data.js';
export const clues = activeStory.clues;
export const characters = activeStory.characters;
export const deductions = activeStory.deductions;
export const endingText = activeStory.ending;

export function getCharacter(id: string) {
  const npc = characters.find(character => character.id === id);
  if (!npc) throw new Error('Unknown character.');
  return npc;
}

export function evaluateReply(npc: Character, topicId: string, approach: Approach, evidenceId?: string) {
  const npcId = npc.id;
  const topic = npc.topics.find(item => item.id === topicId);
  if (!topic) throw new Error('That topic is not available.');
  if (topic.documentId) return { ...topic.success, success: true, question: topic.ask, clip: `${npcId}-${topicId}-reassure` };
  const question = topic.choices?.find(choice => choice.approach === approach)?.label;
  const unsupported = approach === 'challenge' && !!topic.proof && ![topic.proof, ...(topic.proofAlternatives ?? [])].includes(evidenceId ?? '');
  const response = unsupported ? { ...topic.failure, success: false } : topic.responses?.[approach];
  const success = approach === topic.correct && !unsupported;
  return { ...(response ?? { success, ...(success ? topic.success : topic.failure) }), question,
    clip: `${npcId}-${topicId}-${unsupported ? 'unsupported' : approach}` };
}
