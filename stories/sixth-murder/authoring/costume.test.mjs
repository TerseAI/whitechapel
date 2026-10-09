import test from 'node:test';
import assert from 'node:assert/strict';
import { characters } from './dialogue.mjs';

test('working women retain long dressed hair and work dresses across visits', () => {
  for (const name of ['Mrs Baines', 'Nora Vale', 'Maggie Shaw']) {
    const visits = characters.filter(c => c.name === name);
    assert.ok(visits.length);
    for (const c of visits) {
      assert.ok(['chignon', 'braided-coil', 'pinned-plait'].includes(c.appearance.hairStyle));
      assert.equal(c.appearance.garment, 'day-dress');
      assert.ok(c.appearance.apron);
      assert.deepEqual(c.appearance, visits[0].appearance);
    }
  }
});
test('the seven people have distinct faces and occupational silhouettes', () => {
  const cast = [...new Map(characters.map(c => [c.name, c.appearance])).values()];
  assert.equal(cast.length, 7);
  assert.equal(new Set(cast.map(a => JSON.stringify(a.face))).size, 7);
  assert.equal(characters.find(c => c.id === 'hale').appearance.garment, 'police-tunic');
  assert.equal(characters.find(c => c.id === 'george').appearance.garment, 'work-jacket');
  assert.equal(characters.find(c => c.id === 'alden').appearance.garment, 'frock');
});
