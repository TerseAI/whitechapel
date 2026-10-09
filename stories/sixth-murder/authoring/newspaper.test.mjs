import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { objects } from './evidence.mjs';
import { documents } from './documents.mjs';

const scenes = JSON.parse(await readFile(new URL('scenes.json', import.meta.url), 'utf8'));

test('the common-room newspaper displays the same illustrated original as its reader', () => {
  const prop = scenes.locations['lantern-common'].props?.find(prop => prop.id === 'inn-newspaper');
  assert.ok(prop, 'the newspaper needs an illustrated tabletop prop');
  assert.equal(prop.model, 'image');
  assert.equal(prop.asset, documents['inn-newspaper'].pages[0].artwork);
  assert.equal(prop.rotation[0], -Math.PI / 2, 'the page lies flat with its printed side upwards');
  assert.ok(prop.position[1] > .97 && prop.position[1] < 1.08, 'the page rests above the table');
  assert.ok(!Object.values(objects).some(object => object.hotspots.includes('inn-newspaper')), 'reading the paper remains a single direct interaction');
});
