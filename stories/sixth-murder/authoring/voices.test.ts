import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { test } from 'node:test';
import { expectedVoices } from './voice-oracle.mjs';
import type { StoryDefinition } from '../../../shared/story/types';

test('every actual interview and cutscene playback cue has an exact complete recording', () => {
  const story = JSON.parse(readFileSync(new URL('../story.json', import.meta.url), 'utf8')) as StoryDefinition;
  const expected = expectedVoices(story);
  const missing = expected.filter(cue => !story.voices[cue.id]).map(cue => cue.id);
  assert.equal(missing.length, 0, `${missing.length} missing recordings; first missing: ${missing.slice(0, 15).join(', ')}`);
  for (const cue of expected) {
    const clip = story.voices[cue.id];
    assert.equal(clip.text, cue.text, `${cue.id}: recording must match the actual playback text`);
    assert.ok(Number.isFinite(clip.durationMs) && clip.durationMs > 0, `${cue.id}: invalid duration`);
    assert.ok(statSync(new URL(`../assets/${clip.src}`, import.meta.url)).size > 0, `${cue.id}: empty audio file`);
  }
});
