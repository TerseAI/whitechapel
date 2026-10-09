import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hasPendingObjectEvidence, observedObjectSteps, type PhysicalObject } from '../shared/game/physical-objects';
import { examineObject } from '../backend/src/cases/object-inspection';
import fixture from './fixtures/framework/story.json';
import { validateStory } from '../shared/story/definition';

const story = validateStory(fixture);
const object: PhysicalObject = { ...story.objects.sample, steps: [{ id: 'read', label: 'Read the correspondence', observation: 'The correspondence gives a destination.' }], evidence: [{ id: 'account', chapter: 1, steps: ['read'], reviewAsObject: false }, { id: 'paper-record', chapter: 1, steps: ['read'], reviewAsObject: false }] };

test('a lead obtained from a witness does not imply its alternative source object was inspected', () => {
  assert.deepEqual(observedObjectSteps(object, {}, ['account']), []);
  assert.deepEqual(observedObjectSteps(object, { sample: ['read'] }, ['account']), ['read']);
  const physical = { ...object, evidence: [{ ...object.evidence[0], reviewAsObject: true }] };
  assert.deepEqual(observedObjectSteps(physical, {}, ['account']), ['read']);
});

test('a recorded inspection can still recover a paper reward on a later visit', () => {
  assert.equal(hasPendingObjectEvidence(object, 2, ['account']), true);
  const result = examineObject({ chapter: 2, places: story.chapters[1].locations, player: { location: 'preview-bedroom', position: { x: 1.6, z: -2 } }, inspections: { sample: ['read'] }, found: ['account'], deductions: [], members: [{ location: 'preview-bedroom' }, { location: 'preview-bedroom' }] }, 'sample', 'read', { sample: object });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.evidenceIds, ['paper-record']);
  assert.equal(hasPendingObjectEvidence(object, 2, ['account', ...result.evidenceIds]), false);
});

test('future object rewards do not trigger early reinspection', () => {
  assert.equal(hasPendingObjectEvidence(object, 0, []), false);
  const future = { ...object, evidence: [...object.evidence, { id: 'future-record', chapter: 3, steps: ['read'], reviewAsObject: true }] };
  assert.equal(hasPendingObjectEvidence(future, 2, ['account', 'paper-record']), false);
  assert.equal(hasPendingObjectEvidence(future, 3, ['account', 'paper-record']), true);
});
