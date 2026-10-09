import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PerspectiveCamera, Vector3 } from 'three';
import { lanternBriefingStaging } from './cutscene-staging.mjs';

test('Hale and both detectives form a conversation throughout the front-room shots', () => {
  const { actors } = lanternBriefingStaging();
  assert.deepEqual(actors.map(actor => actor.id), ['hale', 'reed', 'ellis']);
  const hale = actors[0];
  for (const detective of actors.slice(1)) assert.ok(facing(detective, hale.position) > .97, `${detective.id} must face Hale`);
  assert.ok(facing(hale, [-.45, 0, .475]) > .99, 'Hale must address the pair');
});

test('the diagonal camera exposes Hale’s face and separates the three speakers', () => {
  const { actors, camera } = lanternBriefingStaging();
  assert.ok(facing(actors[0], camera.position) > .45, 'Hale should be visible in three-quarter profile');
  for (const detective of actors.slice(1)) assert.ok(facing(detective, camera.position) > .04, `${detective.id} should have a visible side profile`);
  const lens = new PerspectiveCamera(48, 16 / 9, .1, 90);
  lens.position.set(...camera.position);lens.lookAt(new Vector3(...camera.target));lens.updateMatrixWorld();
  const projections = actors.map(actor => new Vector3(actor.position[0], 1.7, actor.position[2]).project(lens));
  for (const point of projections) assert.ok(Math.abs(point.x) < .8 && Math.abs(point.y) < .65, 'keep the heads inside the shot');
  for (let i = 0; i < projections.length; i++) for (let j = i + 1; j < projections.length; j++) assert.ok(Math.abs(projections[i].x - projections[j].x) > .16, 'avoid overlapping bodies');
});

test('the generated morning reply keeps Hale present with the same facing cast', () => {
  const story = JSON.parse(readFileSync(new URL('../story.json', import.meta.url), 'utf8'));
  const shots = story.cutscenes.filter(scene => ['morning', 'search-arranged'].includes(scene.id)).flatMap(scene => scene.steps.filter(step => step.kind === 'shot'));
  assert.equal(shots.length, 3);
  for (const shot of shots) {
    assert.deepEqual(shot.actors.slice(0, 3), lanternBriefingStaging().actors);
    assert.ok(shot.actors.some(actor => actor.id === 'arthur-inn'), 'Arthur remains under Hale’s supervision during the briefing');
    assert.ok(shot.actors.some(actor => actor.id === shot.speaker), 'the person speaking must remain visible');
  }
});

function facing(actor, target) {
  const dx = target[0] - actor.position[0], dz = target[2] - actor.position[2];
  return (Math.sin(actor.heading) * dx + Math.cos(actor.heading) * dz) / Math.hypot(dx, dz);
}
