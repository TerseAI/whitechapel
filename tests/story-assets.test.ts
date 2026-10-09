import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadStory } from '../backend/src/story-loader';

test('story loading checks local assets and rejects links outside the package', () => {
  const root = mkdtempSync(join(tmpdir(), 'story-assets-test-'));
  const directory = join(root, 'story');
  mkdirSync(directory); mkdirSync(join(directory, 'assets'));
  try {
    const draft = JSON.parse(readFileSync('stories/starter/story.json', 'utf8'));
    draft.assets.cover = { src: 'cover.svg', width: 10, height: 10, description: 'Test' };
    draft.cover = 'cover';
    const file = join(directory, 'story.json');
    writeFileSync(file, JSON.stringify(draft));
    assert.throws(() => loadStory(file), /Missing story asset/);
    writeFileSync(join(root, 'outside.svg'), '<svg/>');
    symlinkSync(join(root, 'outside.svg'), join(directory, 'assets/cover.svg'));
    assert.throws(() => loadStory(file), /escapes its directory/);
    rmSync(join(directory, 'assets/cover.svg'));
    writeFileSync(join(directory, 'assets/cover.svg'), '<svg/>');
    assert.equal(loadStory(file).story.title, draft.title);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('the full neutral story and media package load independently of the starter', () => {
  const story = loadStory('tests/fixtures/framework/story.json').story;
  assert.equal(story.id, 'framework-test');
  assert.equal(story.chapters.length, 3);
  assert.equal(story.map?.kind, 'fictional');
  assert.ok(story.models['sample-model']);
});
