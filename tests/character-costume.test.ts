import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { storySchema, publicStory } from '../shared/story/definition';

const starter = JSON.parse(readFileSync('stories/starter/story.json', 'utf8'));
test('authored hairstyles and garments survive validation and public presentation', () => {
  for (const hairStyle of ['short', 'chignon', 'braided-coil', 'pinned-plait']) {
    for (const garment of ['lounge', 'frock', 'work-jacket', 'police-tunic', 'day-dress']) {
      const input = structuredClone(starter);
      Object.assign(input.inspectors[0].appearance, { hairStyle, garment, neckwear: '#342b29' });
      const result = publicStory(storySchema.parse(input));
      assert.equal(result.inspectors[0].appearance.hairStyle, hairStyle);
      assert.equal(result.inspectors[0].appearance.garment, garment);
    }
  }
});
test('unsupported costume styles are rejected', () => {
  const input = structuredClone(starter);
  input.inspectors[0].appearance.hairStyle = 'modern-bob';
  assert.equal(storySchema.safeParse(input).success, false);
});
