import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { topicAvailable } from '../../../shared/game/interviews';
import { gateOpen } from '../../../shared/game/story-gates';
import { CharacterState } from '../../../backend/src/interviews/character-state';
import type { StoryDefinition } from '../../../shared/story/types';

const story = JSON.parse(readFileSync(new URL('../story.json', import.meta.url), 'utf8')) as StoryDefinition;
const arthur = story.characters.find(npc => npc.id === 'arthur-station')!;
const topic = (id: string) => { const found = arthur.topics.find(topic => topic.id === id); assert.ok(found, id); return found; };
const all = Object.keys(story.clues);

test('Arthur challenges Maggie until the complete photograph is presented; failures remain recoverable', () => {
  const state = new CharacterState(arthur, { now: () => 1000 });
  state.acquire('player');
  assert.equal(state.answer('player', 'soft', 'relationship', 'reassure').reply?.success, false);
  assert.equal(state.answer('player', 'wrong', 'relationship', 'challenge', 'torn-wedding').reply?.reward, undefined);
  assert.equal(state.answer('player', 'photo', 'relationship', 'challenge', 'complete-wedding').reply?.reward, 'station-relationship');
});

test('the hiding place is volunteered without the investigator or an exhibit supplying it', () => {
  const slip = topic('candlestick');
  assert.equal(slip.proof, undefined);
  assert.ok(slip.choices?.every(c => !c.usesEvidence));
  assert.doesNotMatch(slip.ask, /cart|sack/i);
  assert.match(slip.responses!.reassure!.text, /under the sacks in his cart/);
  for (const t of story.characters.find(n => n.id === 'arthur-inn')!.topics) {
    assert.doesNotMatch(JSON.stringify(t), /candlestick|under.*sack/i);
  }
  const comparison = story.deductions.find(d => d.id === 'unshared-detail')!;
  assert.deepEqual(comparison.requires, ['arthur-candlestick-slip', 'cart-candlestick']);
  assert.equal(topicAvailable(topic('source'), { replies: [] }, all, { deductions: [] }), false);
  assert.equal(topicAvailable(topic('source'), { replies: [] }, all, { deductions: ['unshared-detail'] }), true);
});

test('the officer excuse must be obtained, checked with Hale and connected before rebuttal', () => {
  const hale = story.characters.find(n => n.id === 'hale-station')!;
  assert.ok(hale);
  const check = hale.topics.find(t => t.id === 'disclosure')!;
  assert.equal(topicAvailable(check, { replies: [] }, all.filter(id => id !== 'arthur-source-claim')), false);
  assert.equal(topicAvailable(check, { replies: [] }, all), true);
  assert.equal(topicAvailable(topic('source-rebuttal'), { replies: [] }, all, { deductions: ['unshared-detail'] }), false);
  assert.equal(topicAvailable(topic('source-rebuttal'), { replies: [] }, all, { deductions: ['source-excuse'] }), true);
  assert.ok(story.chapters[3].deductionIds.includes('source-excuse'));
});

test('recovery and identification happen out of Arthur’s hearing in either exploration order', () => {
  assert.notEqual(story.characters.find(n => n.id === 'baines')!.location, story.characters.find(n => n.id === 'arthur-inn')!.location);
  const step = story.objects['cart-candlestick'].steps.find(s => s.id === 'lift-sack')!;
  assert.deepEqual(step.requiresEvidence, ['hale-private-recovery']);
  const privacy = story.characters.find(n => n.id === 'hale')!.topics.find(t => t.id === 'privacy')!;
  assert.equal(gateOpen(privacy, { evidence: [] }), true);
});

test('the medical puzzle contrasts the courtyard knife with fatal blunt trauma and removes the sheath chain', () => {
  const medical = story.documents['medical-findings'].pages[0].paragraphs!.join(' ');
  assert.match(medical, /head.*cause of death/);
  assert.match(medical, /after death/);
  assert.doesNotMatch(medical, /throat was the cause/);
  assert.deepEqual(story.deductions.find(d => d.id === 'false-knife')!.requires, ['courtyard-knife', 'medical-findings']);
  for (const id of ['hearth-knife', 'hearth-clasp', 'knife-sheath-fit', 'room-fragment']) assert.equal(story.clues[id], undefined);
  assert.ok(!story.deductions.some(d => d.id === 'fracture-match'));
});

test('the slip is evidence of knowledge, while further concessions remain optional and no killing confession is awarded', () => {
  assert.equal(topic('candlestick').responses!.reassure!.reward, 'arthur-candlestick-slip');
  assert.equal(topic('candlestick').responses!.reassure!.endsInterview, undefined);
  assert.equal(story.clues['killing-admitted'], undefined);
  for (const id of ['arthur-fall', 'scarf-admitted', 'disguise-admitted']) assert.ok(!story.chapters[3].requiredEvidence.includes(id));
  assert.equal(topic('disguise').responses!.challenge!.turns!.at(-1)!.text, 'I didn’t kill her.');
});
