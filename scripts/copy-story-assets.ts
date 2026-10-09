import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { loadStory, assetFiles } from '../backend/src/story-loader.js';

const { story, assetsDirectory } = loadStory(process.env.STORY_PATH ?? 'stories/sixth-murder/story.json');
await Promise.all(assetFiles(story).map(async asset => {
  const target = resolve('dist', 'story-assets', story.id, String(story.version), asset);
  await mkdir(dirname(target), { recursive: true });
  await copyFile(resolve(assetsDirectory, asset), target);
}));
