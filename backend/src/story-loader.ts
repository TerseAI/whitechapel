import { readFileSync, existsSync, realpathSync, statSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { validateStory } from '../../shared/story/definition.js';
import type { StoryDefinition } from '../../shared/story/types.js';

export function loadStory(path: string) {
  const file = resolve(path);
  const story = validateStory(JSON.parse(readFileSync(file, 'utf8')));
  const assetsDirectory = resolve(dirname(file), 'assets');
  for (const asset of assetFiles(story)) {
    const target = resolve(assetsDirectory, asset);
    if (!existsSync(target) || !statSync(target).isFile()) throw new Error(`Missing story asset: ${asset}`);
    const within = relative(realpathSync(assetsDirectory), realpathSync(target));
    if (within.startsWith('..') || isAbsolute(within)) throw new Error(`Story asset escapes its directory: ${asset}`);
  }
  if (story.map?.sha256 && createHash('sha256').update(readFileSync(resolve(assetsDirectory, story.map.src))).digest('hex') !== story.map.sha256) throw new Error('The registered map image has changed. Review its pins and source.');
  return { story, assetsDirectory, file };
}

export function assetFiles(story: StoryDefinition) {
  return [...new Set([
    ...Object.values(story.assets).map(asset => asset.src), ...Object.values(story.models),
    ...Object.values(story.voices).map(clip => clip.src), ...(story.music ? [story.music] : []), ...(story.map ? [story.map.src] : []),
  ])];
}

