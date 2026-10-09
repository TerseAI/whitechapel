import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { walkable, pathToClue, pathToWitness, readyToInterview, closeEnoughToInspect } from '../../../shared/game/navigation.ts';

const root = new URL('../', import.meta.url);
const fragment = JSON.parse(await readFile(new URL('authoring/scenes.json', root), 'utf8'));

test('Mrs Baines has an explicit reachable position inside her room in every chapter', async () => {
  const story = JSON.parse(await readFile(new URL('story.json', root), 'utf8'));
  const rooms = [fragment.locations['baines-room'], ...story.chapters.map(chapter => chapter.locations.find(location => location.id === 'baines-room')).filter(Boolean)];
  for (const room of rooms) {
    const layout = room.navigation;
    assert.ok(layout.characters.baines, 'Baines must not use the generic indoor fallback');
    const [x, , z] = layout.characters.baines;
    const position = { x, z };
    assert.ok(walkable(position, true, layout), 'Baines stands inside the walkable room');
    for (const spawn of layout.spawns) {
      const route = pathToWitness(spawn, position, true, layout);
      assert.ok(readyToInterview(route.at(-1) ?? spawn, position), 'Both detectives can reach Baines');
    }
  }
});

test('both investigators can reach every authored witness and exhibit', () => {
  for (const [id, place] of Object.entries(fragment.locations)) {
    const layout = place.navigation;
    for (const spawn of layout.spawns) {
      assert.ok(walkable(spawn, place.indoor, layout), `${id}: blocked spawn`);
      for (const [x, , z] of Object.values(layout.characters)) {
        const target = { x, z };
        const route = pathToWitness(spawn, target, place.indoor, layout);
        assert.ok(readyToInterview(route.at(-1) ?? spawn, target), `${id}: unreachable witness ${x},${z}`);
      }
      for (const [clue, [x, , z]] of Object.entries(layout.clues)) {
        const target = { x, z };
        const route = pathToClue(spawn, target, place.indoor, layout);
        assert.ok(closeEnoughToInspect(route.at(-1) ?? spawn, target), `${id}: unreachable ${clue}`);
      }
    }
  }
});

test('all eight sets are self-contained GLB models with bounded production budgets', async () => {
  assert.equal(Object.keys(fragment.locations).length, 8);
  for (const [id, path] of Object.entries(fragment.models)) {
    const bytes = await readFile(new URL(`assets/${path}`, root));
    assert.equal(bytes.readUInt32LE(0), 0x46546c67, `${id}: GLB header`);
    assert.ok(bytes.length < 7_000_000, `${id}: model exceeds 7MB`);
    const length = bytes.readUInt32LE(12);
    const gltf = JSON.parse(bytes.subarray(20, 20 + length).toString('utf8'));
    assert.ok(gltf.buffers.every(buffer => !buffer.uri), `${id}: external buffer`);
    assert.ok((gltf.images ?? []).every(image => !image.uri), `${id}: external texture`);
    assert.ok(gltf.meshes.length <= 24, `${id}: excessive draw calls`);
    if (id.startsWith('set-')) assert.ok(gltf.extensions?.KHR_lights_punctual?.lights.length >= 1, `${id}: missing practical lighting`);
  }
});

test('Lantern sightlines preserve Baines’s limited account and the broad short route', () => {
  const { window, steps, discovery, screen, route } = fragment.spatialContract;
  assert.ok(intersects(window, discovery, screen), 'washhouse must screen discovery corner');
  assert.ok(!intersects(window, steps, screen), 'upper steps must remain visible');
  assert.ok(route.width >= 1.6, 'trunk route must be broad');
  assert.ok(route.rise <= .6 && route.steps === 3, 'short service steps, never full staircase');
  assert.ok(route.length <= 5, 'short landing route');
  for (const site of Object.values(fragment.sites)) {
    assert.equal(site.point, null, `${site.id}: no invented historical pin`);
  }
});

function intersects(from, to, rect) {
  return Array.from({ length: 101 }, (_, index) => index / 100).some(t => {
    const x = from.x + (to.x - from.x) * t;
    const z = from.z + (to.z - from.z) * t;
    return x > rect.minX && x < rect.maxX && z > rect.minZ && z < rect.maxZ;
  });
}
