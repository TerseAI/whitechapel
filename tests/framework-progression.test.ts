import assert from 'node:assert/strict';
import { test } from 'node:test';
import { stageEntry, stageReady, completionView, validateProgression } from '../shared/game/progression';
import { actionSchema } from '../backend/src/http/requests';
import fixture from './fixtures/framework/story.json';
import { validateStory } from '../shared/story/definition';
const frameworkDemo = validateStory(fixture);

test('a stage requires its authored evidence and deductions, including evidence from earlier visits', () => {
  assert.equal(stageReady(['blanket', 'account'], ['movement'], ['blanket'], ['movement']), false);
  assert.equal(stageReady(['blanket', 'account'], ['movement'], ['blanket', 'account'], []), false);
  assert.equal(stageReady(['blanket', 'account'], ['movement'], ['blanket', 'account', 'photograph'], ['movement']), true);
  assert.equal(stageReady([], [], [], []), true);
});

test('chapter entry and six independent locations come from the definition', () => {
  const stage = frameworkDemo.chapters[1];
  assert.equal(stage.locations.length, 6);
  assert.equal(new Set(stage.locations.map(place => place.id)).size, 6);
  assert.equal(stageEntry(stage.flow, stage.locations), 'preview-yard');
  for (const place of stage.locations) assert.equal(actionSchema.safeParse({ type: 'travel', location: place.id }).success, true);
  assert.throws(() => stageEntry({ ...stage.flow, entry: 'missing' }, stage.locations), /not an available location/);
});

test('public completion choices never expose the answer or rejection policy', () => {
  const rule = frameworkDemo.chapters[1].flow.completion;
  assert.equal(rule.kind, 'findings');
  const view = completionView(rule);
  assert.equal(view.kind, 'findings');
  assert.equal('supported' in view, false);
  assert.equal('rejection' in view, false);
});

test('report inputs allow authored finding IDs but reject invalid action identifiers', () => {
  assert.equal(actionSchema.safeParse({ type: 'finalReport', findings: ['nora-murder'] }).success, true);
  assert.equal(actionSchema.safeParse({ type: 'travel', location: '../../etc' }).success, false);
});

test('authoring rejects broken scene references and unreachable transitions before opening a case', () => {
  const demo = structuredClone(frameworkDemo);
  assert.doesNotThrow(() => validateProgression(demo.chapters, demo.cutscenes));
  demo.chapters[0].flow.entryCutscene = 'missing';
  assert.throws(() => validateProgression(demo.chapters, demo.cutscenes), /Unknown cutscene/);
  demo.chapters[0].flow.entryCutscene = 'preview-arrival';
  demo.chapters[2].flow.after.target = 'advance';
  assert.throws(() => validateProgression(demo.chapters, demo.cutscenes), /successor/);
  demo.chapters[2].flow.after.target = 'epilogue';
  assert.throws(() => validateProgression(demo.chapters, demo.cutscenes), /epilogue/);
});
