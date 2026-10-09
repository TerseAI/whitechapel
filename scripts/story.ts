import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, relative, join } from 'node:path';
import { z } from 'zod';
import { loadStory, assetFiles } from '../backend/src/story-loader';
import { storySchema } from '../shared/story/definition';

const [command, argument] = process.argv.slice(2);
try {
  if (command === 'new') createStory(argument);
  else if (command === 'schema') writeFileSync('stories/story.schema.json', JSON.stringify(z.toJSONSchema(storySchema), null, 2) + '\n');
  else if (command === 'check') {
    const { story, file } = loadStory(argument ?? process.env.STORY_PATH ?? 'stories/starter/story.json');
    console.log(`${story.title} (${story.id}@${story.version}): ${story.chapters.length} stage(s), ${assetFiles(story).length} assets. Valid: ${relative(process.cwd(), file)}`);
  } else throw new Error('Usage: npm run story:new -- story-id | npm run story:check -- path/to/story.json | npm run story:schema');
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}

function createStory(id: string | undefined) {
  if (!id || !/^[a-z][a-z0-9-]{0,59}$/.test(id)) throw new Error('Use a story ID with lowercase letters, digits and hyphens.');
  const directory = resolve('stories', id);
  const story = JSON.parse(readFileSync('stories/starter/story.json', 'utf8'));
  story.id = id;
  story.title = id.split('-').map((word: string) => word[0].toUpperCase() + word.slice(1)).join(' ');
  story.$schema = '../story.schema.json';
  mkdirSync(directory);
  mkdirSync(join(directory, 'assets'));
  writeFileSync(join(directory, 'assets', '.gitkeep'), '');
  writeFileSync(join(directory, 'story.json'), JSON.stringify(story, null, 2) + '\n');
  console.log(`Created ${relative(process.cwd(), directory)}. Run STORY_PATH=stories/${id}/story.json npm run dev`);
}
