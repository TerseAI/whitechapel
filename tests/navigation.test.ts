import assert from 'node:assert/strict';
import { test } from 'node:test';
import { inspectorSpawn, pathToClue, pathToWitness, readyToInterview, walkable, type SceneLayout } from '../shared/game/navigation';

const layout: SceneLayout = { bounds: { minX: -10, maxX: 10, minZ: -10, maxZ: 10 },
  spawns: [{ x: -6, z: 6 }, { x: -5, z: 6 }], obstacles: [{ minX: -1, maxX: 1, minZ: -4, maxZ: 4 }] };
test('authored spawns and layouts support a different room without crossing its obstacles', () => {
  const start = inspectorSpawn(0, layout);
  assert.deepEqual(start, { x: -6, z: 6 });
  const route = pathToClue(start, { x: 6, z: -6 }, true, layout);
  assert.ok(route.length > 0);
  assert.ok(route.every(point => walkable(point, true, layout)));
  assert.equal(walkable({ x: 0, z: 0 }, true, layout), false);
  assert.equal(walkable({ x: 11, z: 0 }, true, layout), false);
  const witness = { x: 6, z: -6 };
  const interview = pathToWitness(start, witness, true, layout);
  assert.ok(interview.every(point => walkable(point, true, layout)));
  assert.equal(readyToInterview(interview.at(-1)!, witness), true);
});
