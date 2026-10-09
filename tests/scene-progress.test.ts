import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sceneProgress } from '../shared/game/scene-progress';
import type { NpcView, Reply } from '../shared/game/types';
import data from './fixtures/framework/story.json';
import { validateStory } from '../shared/story/definition';
const fixture = validateStory(data);

const place = { ...fixture.chapters[1].locations.find(p => p.id === 'preview-workshop')!, hotspots: [{ id: 'sample', label: 'Sample', x: 0, y: 0 }] };
const found = place.hotspots.map(h => h.id);
const witnesses = fixture.characters.filter(n => n.location === place.id).map(n => ({ ...n, trust: 2, lease: null, replies: [] })) as NpcView[];
const answered = (npc: NpcView): NpcView => ({ ...npc, replies: npc.topics.map(topic => ({ id: topic.id, npcId: npc.id, topicId: topic.id, playerId: 'partner', text: 'Recorded answer', success: false, approach: 'press', at: 1 }) as Reply) });

test('examining every object does not complete a scene with unexamined interviews', () => {
  const progress = sceneProgress(place, found, witnesses);
  assert.equal(progress.complete, false);
  assert.equal(progress.objectsExamined, place.hotspots.length);
  assert.equal(progress.interviewsExamined, 0);
});

test('all interview topics and objects must be examined, including work done by a partner', () => {
  const interviewed = witnesses.map(answered);
  assert.equal(sceneProgress(place, found.slice(1), interviewed).complete, false);
  const partial = interviewed.map(n => ({ ...n, replies: n.replies.slice(1) }));
  assert.equal(sceneProgress(place, found, partial).complete, false);
  assert.equal(sceneProgress(place, found, interviewed).complete, true);
});

test('newly available interview topics reopen a previously completed scene', () => {
  const interviewed = witnesses.map(answered);
  assert.equal(sceneProgress(place, found, interviewed).complete, true);
  interviewed[0].topics = [...interviewed[0].topics, { id: 'new-lead', label: 'New lead', claim: 'Another account', observation: '' }];
  assert.equal(sceneProgress(place, found, interviewed).complete, false);
});

test('witnesses elsewhere do not block a scene and object-only scenes can be completed', () => {
  const elsewhere = witnesses.map(n => ({ ...n, location: 'station' as const }));
  assert.equal(sceneProgress(place, found, elsewhere).complete, true);
  assert.equal(sceneProgress(place, [], elsewhere).complete, false);
});
