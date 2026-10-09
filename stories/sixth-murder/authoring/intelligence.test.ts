import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { disclosureMessage, interviewOptions, canonicalTurns, checkPerformance } from '../../../backend/src/intelligence/story-policy';
import { publicStory, validateStory } from '../../../shared/story/definition';
import { publicTopics } from '../../../backend/src/interviews/character-state';

const story = validateStory(JSON.parse(readFileSync(new URL('../story.json', import.meta.url), 'utf8')));

test('each appearance has a character identity and the public presentation excludes its mind and outcomes', () => {
  assert.ok(story.characters.every(character => character.mind?.identity && character.mind.voice));
  const arthur = story.characters.filter(character => character.id.startsWith('arthur-'));
  assert.equal(new Set(arthur.map(character => character.mind!.identity)).size, 1);
  assert.equal('characters' in publicStory(story), false);
  assert.ok(publicTopics(arthur[0]).every(topic => !('success' in topic) && !('mind' in topic)));
});

test('the hiding place cannot be suggested before Arthur volunteers it', () => {
  const arthur = story.characters.find(character => character.id === 'arthur-station')!;
  assert.ok(disclosureMessage(arthur, 'Was it under the sacks in his cart?', ['cart-candlestick']));
  assert.equal(disclosureMessage(arthur, 'We recovered a candlestick. What do you know about it?', []), undefined);
  assert.equal(disclosureMessage(arthur, 'How did you know it was under the sacks?', ['arthur-candlestick-slip']), undefined);
});

test('the knowledge slip and independent source check cannot be paraphrased', () => {
  for (const [id, topics] of [['arthur-station', ['candlestick', 'source', 'source-rebuttal']], ['hale-station', ['disclosure']]] as const) {
    const character = story.characters.find(character => character.id === id)!;
    for (const option of interviewOptions(character, character.topics.filter(topic => (topics as readonly string[]).includes(topic.id)), 'cart-candlestick')) {
      assert.equal(option.verbatim, true);
      assert.equal(checkPerformance(option, canonicalTurns(option)), true);
      assert.equal(checkPerformance(option, [{ speaker: 'witness', text: 'I admit killing Nora.' }]), false);
    }
  }
});

test('an invalid protected-disclosure evidence reference is rejected at authoring time', () => {
  const invalid = structuredClone(story);
  invalid.characters.find(character => character.id === 'arthur-station')!.mind!.disclosures![0].afterEvidence = 'unknown-evidence';
  assert.throws(() => validateStory(invalid), /protected disclosure evidence/);
});

test('every appearance is directed for the scene it actually plays', () => {
  for (const character of story.characters) {
    const mind = character.mind!;
    assert.ok(mind.persona && mind.manner && mind.goals.length && mind.background?.length, `${character.id} is missing direction`);
  }
  for (const identity of new Set(story.characters.map(character => character.mind!.identity))) {
    const appearances = story.characters.filter(character => character.mind!.identity === identity);
    assert.equal(new Set(appearances.map(character => character.mind!.persona)).size, appearances.length, `${identity} reuses one persona across appearances`);
    assert.equal(new Set(appearances.map(character => character.mind!.voice)).size, 1, `${identity} changes voice between appearances`);
  }
});

test('direction given to the performer stays inside the character’s world', () => {
  const engineWords = /\b(director|disclos\w*|topic|topics|player|evidence|gate|stage|prompt|model)\b/i;
  for (const character of story.characters) {
    const { persona, manner, goals, background } = character.mind!;
    const direction = [persona, manner, ...goals, ...background ?? []].join(' ');
    assert.equal(engineWords.test(direction), false, `${character.id} direction uses engine vocabulary: ${direction.match(engineWords)?.[0]}`);
  }
});

test('Arthur is never told the hiding place he has to volunteer himself', () => {
  const arthur = story.characters.find(character => character.id === 'arthur-station')!.mind!;
  const direction = [arthur.persona, arthur.manner, ...arthur.goals, ...arthur.background ?? []].join(' ').toLowerCase();
  for (const term of arthur.disclosures![0].terms) assert.equal(direction.includes(term.toLowerCase()), false, `${term} appears in Arthur’s direction`);
});
