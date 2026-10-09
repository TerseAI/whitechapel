import assert from 'node:assert/strict';
import test from 'node:test';
import { interviewFieldOfView, interviewView, interviewWitness } from '../frontend/src/game/interview-staging';
import type { NpcView } from '../shared/game/types';

test('notebooks follow only the investigator’s active interview in the same room', () => {
  const witness = { id: 'witness', location: 'room', lease: { playerId: 'one', until: 200 } } as NpcView;
  assert.equal(interviewWitness([witness], 'one', 'room', 100), witness);
  assert.equal(interviewWitness([witness], 'two', 'room', 100), undefined);
  assert.equal(interviewWitness([witness], 'one', 'yard', 100), undefined);
  assert.equal(interviewWitness([witness], 'one', 'room', 200), undefined);
  assert.equal(interviewWitness([{ ...witness, lease: null }], 'one', 'room', 100), undefined);
});

test('interviews frame the notebook to one side of the witness within the room', () => {
  const bounds = { minX: -4.15, maxX: 4.15, minZ: -8, maxZ: 10 };
  for (const [inspector, witness] of [
    [{ x: 0, z: 1.5 }, { x: 0, z: 0 }],
    [{ x: 3.7, z: -5 }, { x: 3.7, z: -6.5 }],
    [{ x: -3.7, z: 8.5 }, { x: -3.7, z: 7 }],
  ]) {
    const view = interviewView(inspector, witness, 1.28, 2.02, bounds);
    assert.ok(view.position[0] >= bounds.minX + .3 && view.position[0] <= bounds.maxX - .3);
    assert.ok(view.position[2] >= bounds.minZ + .3 && view.position[2] <= bounds.maxZ - .3);
    const dx = inspector.x - witness.x, dz = inspector.z - witness.z;
    const side = (view.position[0] - witness.x) * dz - (view.position[2] - witness.z) * dx;
    assert.ok(Math.abs(side) > 1, 'The inspector must not obscure the witness straight ahead.');
  }
});

test('seated witnesses lower the interview framing without lowering the standing inspector', () => {
  const standing = interviewView({ x: 0, z: 1.5 }, { x: 0, z: 0 }, 1.28, 2.02);
  const seated = interviewView({ x: 0, z: 1.5 }, { x: 0, z: 0 }, 1.28, 1.5);
  assert.ok(seated.target[1] < standing.target[1]);
  assert.ok(seated.position[1] >= 2);
  const coincident = interviewView({ x: 0, z: 0 }, { x: 0, z: 0 }, .86, 2);
  assert.ok([...coincident.position, ...coincident.target].every(Number.isFinite));
});

test('the interview camera chooses the side clear of a nearby bystander', () => {
  const view = interviewView({ x: 0, z: 1.5 }, { x: 0, z: 0 }, .86, 2.02, undefined, [{ x: -3.5, z: .9 }]);
  assert.ok(view.position[0] > 0);
});

test('portrait conversations widen the lens to keep both faces in view', () => {
  assert.equal(interviewFieldOfView(1.44), 48);
  const field = interviewFieldOfView(390 / 844);
  const visibleWidth = 2 * 3.5 * Math.tan(field * Math.PI / 360) * 390 / 844;
  assert.ok(visibleWidth >= 3);
  assert.ok(field <= 90);
});
