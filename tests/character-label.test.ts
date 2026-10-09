import test from 'node:test';
import assert from 'node:assert/strict';
import type { CharacterAppearance } from '../shared/story/types';
import { characterLabelHeight } from '../frontend/src/game/character-label';

const appearance: CharacterAppearance = {
  coat: '#333', waistcoat: '#555', hair: '#222', skin: '#b98e75', accent: '#bba',
  hat: 'none', beard: 'none', height: 1, build: 1, face: [1, 1, 1],
};

test('tall detectives have labels above their scaled head instead of a fixed face-level anchor', () => {
  const ellis = { ...appearance, height: 1.22, face: [.9, 1.15, 1] as [number, number, number] };
  assert.ok(characterLabelHeight(ellis) > 3.23);
  assert.ok(characterLabelHeight(ellis) < 3.30);
  assert.ok(characterLabelHeight(ellis) > characterLabelHeight({ ...appearance, height: .94 }));
});

test('every worn hat keeps at least thirty centimetres between its crown and the label', () => {
  const crowns = { cap: 2.3104, bowler: 2.475, bonnet: 2.3385, helmet: 2.615, top: 2.63 };
  for (const [hat, crown] of Object.entries(crowns)) {
    assert.ok(characterLabelHeight({ ...appearance, hat: hat as CharacterAppearance['hat'] }) >= crown + .3, hat);
  }
  assert.ok(characterLabelHeight({ ...appearance, hat: 'top' }) > characterLabelHeight({ ...appearance, hat: 'bowler' }));
});

test('label clearance follows face height without changing for a wider face or build', () => {
  assert.ok(characterLabelHeight({ ...appearance, face: [1, 1.2, 1] }) > characterLabelHeight(appearance));
  assert.equal(characterLabelHeight({ ...appearance, build: 1.4, face: [1.3, 1, 1.2] }), characterLabelHeight(appearance));
});

test('seated label height follows the torso drop and ignores a hat held in the lap', () => {
  const tall = { ...appearance, height: 1.2, hat: 'top' as const };
  const standing = characterLabelHeight(tall, 'standing', 'head');
  const seated = characterLabelHeight(tall, 'seated', 'head');
  assert.ok(Math.abs((standing - seated) - .44) < 1e-10);
  assert.equal(characterLabelHeight(tall, 'seated', 'lap'), characterLabelHeight({ ...tall, hat: 'none' }, 'seated'));
  assert.ok(characterLabelHeight(tall, 'seated', 'lap') < seated);
});
