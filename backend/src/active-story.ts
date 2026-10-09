import { loadStory } from './story-loader.js';

export const loadedStory = loadStory(process.env.STORY_PATH ?? 'stories/starter/story.json');
export const activeStory = loadedStory.story;
