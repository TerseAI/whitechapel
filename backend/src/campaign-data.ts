import { activeStory } from './active-story.js';
export type { Chapter } from '../../shared/story/types.js';
export type { StoryGate } from '../../shared/game/types.js';
export const campaign = activeStory.chapters;
export const cutscenes = activeStory.cutscenes;
