import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateStory } from '../shared/story/definition';
import { CharacterState } from '../backend/src/interviews/character-state';
import { witnessPose } from '../frontend/src/game/witness-pose';
import { witnessPatrol } from '../frontend/src/game/witness-pacing';

test('authored witness posture and lap hat survive validation and public character state', () => {
  const input = JSON.parse(readFileSync(new URL('./fixtures/framework/story.json', import.meta.url), 'utf8'));
  Object.assign(input.characters[0], { posture: 'seated', hatPlacement: 'lap' });
  const character = validateStory(input).characters[0];
  const view = new CharacterState(character, { now: () => 100 }).view();
  assert.equal(view.posture, 'seated');
  assert.equal(view.hatPlacement, 'lap');
  assert.deepEqual(view.appearance, character.appearance);
});

test('seated witnesses stay at the chair through every ambient patrol phase', () => {
  const layout = { bounds: { minX: -4, maxX: 4, minZ: -6, maxZ: 6 }, obstacles: [], characters: { 'neutral-witness': [1, 0, -2] as [number, number, number] } };
  for (const now of [0, 3000, 15000, 95000]) {
    const pose = witnessPatrol('neutral-witness', 0, true, now, layout, 'seated');
    assert.deepEqual(pose, { x: 1, z: -2, heading: 0, moving: false });
  }
});

test('seated eye level and hips adapt to character height while shoes stay on the floor', () => {
  for (const height of [.9, 1, 1.2]) {
    const pose = witnessPose('seated', height);
    assert.ok(pose.eyeHeight < witnessPose('standing', height).eyeHeight);
    assert.equal(Math.round(pose.hipHeight * height * 100), 58);
    assert.equal(pose.seated, true);
    assert.equal(pose.shoeHeight * height, .09);
  }
  assert.equal(witnessPose(undefined, 1).bodyOffset, 0);
});
