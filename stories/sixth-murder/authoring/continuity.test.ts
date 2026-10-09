import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { topicAvailable } from '../../../shared/game/interviews';
import type { StoryDefinition } from '../../../shared/story/types';

const story = JSON.parse(readFileSync(new URL('../story.json', import.meta.url), 'utf8')) as StoryDefinition;
const npc = (id: string) => story.characters.find(character => character.id === id)!;
const topic = (id: string, question: string) => npc(id).topics.find(item => item.id === question)!;

test('the inspectors keep their occupation private in Nora’s newspaper conversation', () => {
  const paper = JSON.stringify(topic('nora', 'paper'));
  assert.doesNotMatch(paper, /You’re policemen|We are\.|We haven’t caught him/);
});

test('Hale stays with Arthur while other officers perform duties away from the front', () => {
  assert.equal(npc('hale').location, npc('arthur-inn').location);
  assert.equal(story.chapters[2].npcIds.includes('hale'), false);
  assert.doesNotMatch(JSON.stringify(topic('hale', 'address')), /I only went/);
  assert.match(JSON.stringify(topic('hale', 'protection')), /a constable/);
});

test('an early medical interview and blanket identification do not assume uncollected observations', () => {
  const findings = topic('alden', 'findings');
  assert.equal(topicAvailable(findings, { replies: [] }, ['hale-discovery']), true);
  assert.doesNotMatch(JSON.stringify(findings), /Hale found a knife|And the knife wounds/);
  const blanket = topic('baines', 'blanket');
  assert.equal(topicAvailable(blanket, { replies: [] }, ['trunk-interior']), true);
  assert.doesNotMatch(JSON.stringify(blanket), /It is missing from the room now/);
});

test('Arthur’s discovery of the lodging is recorded before his final room account', () => {
  const finding = topic('arthur-station', 'finding-nora');
  assert.ok(finding);
  assert.match(JSON.stringify(finding), /Followed her/);
  assert.ok(topic('arthur-station', 'departure').requiresAll?.includes('arthur-found-nora'));
});

test('the evening letter follows an earlier notification and refers to Saturday’s missed journey', () => {
  assert.match(JSON.stringify(story.cutscenes.find(scene => scene.id === 'search-arranged')), /Word has been sent to Bristol/);
  assert.doesNotMatch(JSON.stringify(npc('maggie-closing')), /expecting from tomorrow|She’ll be waiting for Nora/);
  const letter = story.documents['closing-letter'].pages[0].paragraphs!.join(' ');
  assert.match(letter, /police have sent word/);
  assert.doesNotMatch(letter, /cannot leave you waiting/);
});
