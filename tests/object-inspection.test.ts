import assert from 'node:assert/strict';
import { test } from 'node:test';
import fixture from './fixtures/framework/story.json';
import { validateStory } from '../shared/story/definition';
import { examineObject, type ObjectInspectionContext } from '../backend/src/cases/object-inspection';

const story = validateStory(fixture);
const context = (): ObjectInspectionContext => ({ chapter: 1, places: story.chapters[1].locations,
  player: { location: 'preview-bedroom', position: { x: 1.6, z: -2 } }, inspections: {}, found: [], deductions: [], members: [{ location: 'preview-bedroom' }, { location: 'preview-yard' }] });

test('an authored object enforces scene proximity, observations, evidence and both investigators', () => {
  const state = context();
  assert.equal(examineObject({ ...state, player: { ...state.player, position: { x: 0, z: 8 } } }, 'sample', 'surface', story.objects).ok, false);
  assert.equal(examineObject(state, 'sample', 'turn', story.objects).ok, false);
  const surface = examineObject(state, 'sample', 'surface', story.objects);
  assert.equal(surface.ok, true);
  if (!surface.ok) return;
  assert.deepEqual(surface.evidenceIds, []);
  state.inspections.sample = surface.observed;
  assert.equal(examineObject(state, 'sample', 'turn', story.objects).ok, false);
  state.found.push('account');
  assert.equal(examineObject(state, 'sample', 'turn', story.objects).ok, false);
  state.members[1].location = 'preview-bedroom';
  const turned = examineObject(state, 'sample', 'turn', story.objects);
  assert.equal(turned.ok, true);
  if (!turned.ok) return;
  assert.deepEqual(turned.evidenceIds, ['specimen']);
  state.inspections.sample = turned.observed; state.found.push('specimen');
  assert.deepEqual(examineObject(state, 'sample', 'turn', story.objects), { ...turned, evidenceIds: [] });
  assert.equal(examineObject(state, 'unknown', 'surface', story.objects).ok, false);
});

test('missed objects remain recoverable on an authored later visit, without revealing future rewards', () => {
  const state = context();
  state.chapter = 2;
  state.found = ['account'];
  state.members[1].location = 'preview-bedroom';
  state.inspections.sample = ['surface'];
  const objects = structuredClone(story.objects);
  objects.sample.evidence.push({ id: 'future', chapter: 3, steps: ['surface', 'turn'], reviewAsObject: true });
  const result = examineObject(state, 'sample', 'turn', objects);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.evidenceIds, ['specimen']);
  assert.equal(examineObject({ ...state, chapter: 0 }, 'sample', 'surface', objects).ok, false);
  assert.equal(examineObject({ ...state, places: [] }, 'sample', 'turn', objects).ok, false);
});

test('solo inspection preserves evidence, observation and location requirements', () => {
  const state = { ...context(), mode: 'solo' as const, members: [{ location: 'preview-bedroom' }] };
  assert.equal(examineObject(state, 'sample', 'turn', story.objects).ok, false);
  state.inspections.sample = ['surface'];
  assert.equal(examineObject(state, 'sample', 'turn', story.objects).ok, false);
  state.found.push('account');
  assert.equal(examineObject({ ...state, members: [] }, 'sample', 'turn', story.objects).ok, false);
  assert.equal(examineObject({ ...state, members: [{ location: 'preview-yard' }] }, 'sample', 'turn', story.objects).ok, false);
  assert.equal(examineObject({ ...state, player: { ...state.player, position: { x: 0, z: 8 } } }, 'sample', 'turn', story.objects).ok, false);
  const result = examineObject(state, 'sample', 'turn', story.objects);
  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.evidenceIds, ['specimen']);
});
