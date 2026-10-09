import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { validateStory, publicStory } from '../shared/story/definition';

const starter = () => JSON.parse(readFileSync('stories/starter/story.json', 'utf8'));

test('the starter is a playable shell with no campaign content', () => {
  const story = validateStory(starter());
  assert.equal(story.id, 'starter');
  assert.equal(story.chapters.length, 1);
  for (const key of ['characters', 'deductions', 'cutscenes', 'reconstructions'] as const) assert.equal(story[key].length, 0);
  for (const key of ['clues', 'documents', 'objects', 'assets', 'voices'] as const) assert.equal(Object.keys(story[key]).length, 0);
});

test('a different story owns its identity, art and geography without changing the shell', () => {
  const draft = starter();
  draft.id = 'other-case'; draft.title = 'The Observatory';
  draft.sites.studio = { id: 'studio', name: 'Observatory', kind: 'fictional', address: '', precision: 'fictional', point: null, note: '', sources: [], placement: '', reviewed: '' };
  const story = validateStory(draft);
  assert.equal(publicStory(story).title, 'The Observatory');
  assert.equal(publicStory(story).sites.studio.name, 'Observatory');
  for (const key of ['chapters', 'clues', 'characters', 'deductions', 'documents', 'objects', 'reconstructions', 'cutscenes', 'ending']) assert.equal(key in publicStory(story), false, key);
});

test('invalid references and asset paths fail before a case can start', () => {
  const draft = starter();
  draft.chapters[0].flow.entry = 'missing';
  assert.throws(() => validateStory(draft), /entry/i);
  draft.chapters[0].flow.entry = 'empty-room';
  draft.chapters[0].locations[0].siteId = 'unknown';
  assert.throws(() => validateStory(draft), /site/i);
  draft.chapters[0].locations[0].siteId = 'studio';
  draft.assets.bad = { src: '../private.json', width: 20, height: 20, description: '' };
  assert.throws(() => validateStory(draft), /asset/i);
});

const fixture = () => JSON.parse(readFileSync('tests/fixtures/framework/story.json', 'utf8'));

test('characters require a stable entity identity and a named scene placement', () => {
  const missingIdentity = fixture();
  delete missingIdentity.characters[0].entityId;
  assert.throws(() => validateStory(missingIdentity), /entityId/);
  const missingPlacement = fixture();
  const npc = missingPlacement.characters[0];
  for (const chapter of missingPlacement.chapters) for (const place of [...chapter.locations, ...chapter.epilogueLocations]) {
    if (place.id === npc.location) delete place.navigation?.characters?.[npc.id];
  }
  assert.throws(() => validateStory(missingPlacement), /placement/i);
});

test('models, actors and interview requirements must resolve to authored entries', () => {
  const model = starter();
  model.chapters[0].locations[0].props = [{ id: 'prop', model: 'gltf', asset: 'missing', position: [0, 0, 0] }];
  assert.throws(() => validateStory(model), /model/i);
  const actor = fixture();
  actor.cutscenes[0].steps[0].speaker = 'missing';
  assert.throws(() => validateStory(actor), /speaker/i);
  const witness = fixture();
  witness.characters[0].requiredTopics = ['missing'];
  assert.throws(() => validateStory(witness), /topic/i);
});

test('object inspection cycles and rewards for another chapter are rejected', () => {
  const cycle = fixture();
  cycle.objects.sample.steps[0].requires = ['turn'];
  assert.throws(() => validateStory(cycle), /cycle/i);
  const reward = fixture();
  reward.objects.sample.evidence[0].chapter = 2;
  assert.throws(() => validateStory(reward), /chapter/i);
});

test('an object may appear before a later visit removes its hotspot', () => {
  const draft = fixture();
  const bedroom = draft.chapters[1].locations.find((place: { id: string }) => place.id === 'preview-bedroom');
  draft.chapters[2].locations.push({ ...structuredClone(bedroom), hotspots: [] });
  assert.doesNotThrow(() => validateStory(draft));
  bedroom.hotspots = [];
  assert.throws(() => validateStory(draft), /no hotspot placement/i);
});

test('scene navigation must have ordered bounds and reachable inspector spawns', () => {
  const draft = starter();
  draft.chapters[0].locations[0].navigation.bounds.minX = 10;
  assert.throws(() => validateStory(draft), /bounds/i);
  const obstructed = starter();
  obstructed.chapters[0].locations[0].navigation.obstacles = [{ minX: -3, maxX: 3, minZ: 6, maxZ: 9 }];
  assert.throws(() => validateStory(obstructed), /spawn/i);
});

test('an invented location cannot be pinned on a historical source map', () => {
  const draft = starter();
  draft.map = { src: 'map.png', width: 100, height: 100, kind: 'historical', title: 'Map', description: '', source: { title: 'Source', url: 'https://example.com' } };
  draft.sites.studio.point = [10, 10];
  assert.throws(() => validateStory(draft), /fictional/i);
});
