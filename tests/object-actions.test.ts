import assert from 'node:assert/strict';
import test from 'node:test';
import { actionView, inspectionActions, viewImage } from '../frontend/src/objects/inspection-actions';
import type { PhysicalObject } from '../shared/game/physical-objects';

const object = { steps: [
  { id: 'open', label: 'Open', observation: 'Clothes.' },
  { id: 'lift', label: 'Lift', observation: 'Bedding.', requires: ['open'] },
  { id: 'compare', label: 'Compare', observation: 'Marks.', requires: ['open'], togetherAt: 'room' },
] } as PhysicalObject;

test('physical actions reveal only reachable parts, including independent branches', () => {
  assert.deepEqual(inspectionActions(object, [], false).map(step => step.id), ['open']);
  assert.deepEqual(inspectionActions(object, ['open'], false).map(step => step.id), ['lift', 'compare']);
  assert.deepEqual(inspectionActions(object, ['open', 'compare'], false).map(step => step.id), ['lift']);
});

test('completed objects have no action unless a later visit can recover new evidence', () => {
  const observed = ['open', 'lift', 'compare'];
  assert.deepEqual(inspectionActions(object, observed, false), []);
  assert.deepEqual(inspectionActions(object, observed, true).map(step => step.id), ['compare']);
});

test('actions return to the artwork where their physical part can be reached', () => {
  const illustrated = { ...object, views: { initial: 'closed', steps: { open: { image: 'clothes', point: [50, 50] as [number, number] } } } };
  assert.equal(viewImage(illustrated, actionView(object.steps[0])), 'closed');
  assert.equal(viewImage(illustrated, actionView(object.steps[1])), 'clothes');
  assert.equal(viewImage(illustrated, actionView(object.steps[2])), 'clothes');
});
