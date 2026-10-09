import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { topicAvailable } from '../../../shared/game/interviews';
import { gateOpen } from '../../../shared/game/story-gates';
import { stageReady } from '../../../shared/game/progression';
import type { StoryDefinition } from '../../../shared/story/types';

const story = JSON.parse(readFileSync(new URL('../story.json', import.meta.url), 'utf8')) as StoryDefinition;

test('Maggie’s brother-claim question requires Arthur’s actual claim, while the photograph remains an independent lead', () => {
  const maggie = story.characters.find(npc => npc.id === 'maggie')!;
  const brother = maggie.topics.find(topic => topic.id === 'brother');
  assert.ok(brother);
  assert.equal(topicAvailable(brother, { replies: [] }, ['maggie-cooperation']), false);
  assert.equal(topicAvailable(brother, { replies: [] }, ['maggie-cooperation', 'arthur-brother']), true);
  const photograph = maggie.topics.find(topic => topic.id === 'photograph')!;
  assert.equal(topicAvailable(photograph, { replies: [] }, ['maggie-cooperation']), true);
  const name = maggie.topics.find(topic => topic.id === 'name')!;
  assert.equal(topicAvailable(name, { replies: [] }, ['maggie-cooperation']), false);
  assert.equal(topicAvailable(name, { replies: [] }, ['maggie-cooperation', 'travel-papers']), true);
});

test('Alden’s comparisons require the observations actually discussed', () => {
  const alden = story.characters.find(npc => npc.id === 'alden')!;
  const room = alden.topics.find(topic => topic.id === 'room')!;
  const candle = alden.topics.find(topic => topic.id === 'candle')!;
  const observations = ['medical-findings', 'room-disturbance', 'trunk-interior'];
  assert.equal(topicAvailable(room, { replies: [] }, observations), false);
  assert.equal(topicAvailable(room, { replies: [] }, [...observations, 'yard-discovery']), true);
  assert.equal(topicAvailable(candle, { replies: [] }, ['medical-findings', 'candlestick-description']), false);
  assert.equal(topicAvailable(candle, { replies: [] }, ['medical-findings', 'cart-candlestick']), true);
});

test('Returning to Baines with the blood requires the room-to-yard finding', () => {
  const baines = story.characters.find(npc => npc.id === 'baines')!;
  const disturbance = baines.topics.find(topic => topic.id === 'disturbance')!;
  const evidence = ['room-disturbance', 'trunk-interior', 'blanket-identification', 'service-route', 'hale-discovery'];
  assert.equal(topicAvailable(disturbance, { replies: [] }, evidence), false);
  assert.equal(topicAvailable(disturbance, { replies: [] }, evidence, { deductions: ['concealed-marriage'] }), false);
  assert.equal(topicAvailable(disturbance, { replies: [] }, evidence, { deductions: ['room-to-yard'] }), true);
});

test('the five stages preserve open enquiry and recoverable search evidence', () => {
  assert.deepEqual(story.chapters.map(chapter => chapter.title), ['Arrival', 'The enquiry', 'The search', 'Arthur’s account', 'The same table']);
  const enquiry = story.chapters[1];
  for (const id of ['lantern-yard', 'lantern-common', 'nora-room', 'baines-room']) {
    const place = enquiry.locations.find(place => place.id === id)!;
    assert.ok(place, id);
    assert.equal(gateOpen(place, { evidence: [] }), true);
  }
  assert.equal(gateOpen(enquiry.locations.find(place => place.id === 'shaw-workshop')!, { evidence: ['workshop-lead'] }), true);
  assert.equal(gateOpen(enquiry.locations.find(place => place.id === 'alden-workroom')!, { evidence: ['hale-discovery'] }), true);
  for (const id of ['nora-room', 'lantern-common', 'shaw-workshop', 'alden-workroom']) assert.ok(story.chapters[2].locations.some(place => place.id === id));
  for (const id of ['hearth-remains']) {
    const object = story.objects[id];
    assert.ok(object, id);
    assert.ok(object.steps.every(step => !step.requiresEvidence?.length), `${id} must be inspectable before its significance is known`);
  }
});

test('Arthur’s principal station topics can begin in any order and denial supports the final report', () => {
  const arthur = story.characters.find(npc => npc.id === 'arthur-station')!;
  const evidence = story.chapters.slice(0, 3).flatMap(chapter => chapter.clueIds);
  const deductions = story.chapters.slice(0, 3).flatMap(chapter => chapter.deductionIds);
  for (const id of ['relationship', 'trunk-helping', 'fire']) {
    const topic = arthur.topics.find(topic => topic.id === id)!;
    assert.equal(topicAvailable(topic, { replies: [] }, evidence, { deductions, decisions: { 'inn-trunk-account': 'helping' } }), true, id);
  }
  const final = story.chapters[3];
  assert.deepEqual(final.requiredEvidence, ['station-relationship', 'station-trunk', 'station-fire', 'station-knowledge', 'station-cause', 'station-yard']);
  assert.equal(stageReady(final.requiredEvidence, final.deductionIds, [...evidence, ...final.requiredEvidence], [...deductions, 'unshared-detail', 'source-excuse']), true);
  assert.ok(!final.requiredEvidence.some(id => /admission|confession/.test(id)));
  assert.ok(arthur.topics.some(topic => Object.values(topic.responses ?? {}).some(branch => branch.success && branch.reward === 'station-yard' && !branch.endsInterview)));
});

test('each closing witness can close the enquiry and every interview allows recovery', () => {
  const closing = story.chapters[4];
  assert.deepEqual(closing.requiredEvidence, ['closing-addressed']);
  assert.deepEqual(closing.npcIds, ['maggie-closing']);
  assert.ok(!story.characters.some(npc => ['baines-closing', 'george-closing'].includes(npc.id)));
  for (const id of closing.npcIds) {
    const npc = story.characters.find(npc => npc.id === id)!;
    assert.ok(npc.topics.some(topic => topic.success.reward === 'closing-addressed' || Object.values(topic.responses ?? {}).some(branch => branch.reward === 'closing-addressed')));
  }
  assert.ok(story.characters.every(npc => npc.repeatable !== false));
  assert.ok(story.documents['orders'].pages[0].paragraphs?.join(' ').includes('Report to me at Commercial Street'));
});

