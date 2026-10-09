import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { topicAvailable } from '../../../shared/game/interviews';
import { CharacterState } from '../../../backend/src/interviews/character-state';
import { validReconstruction } from '../../../shared/game/reconstructions';
import type { StoryDefinition } from '../../../shared/story/types';

const story = JSON.parse(readFileSync(new URL('../story.json', import.meta.url), 'utf8')) as StoryDefinition;
const baines = story.characters.find(npc => npc.id === 'baines')!;
const topic = (id: string) => { const found = baines.topics.find(topic => topic.id === id); assert.ok(found, id); return found; };

test('blood can expose Baines’s fear but cannot unlock her observations without Hale and reassurance', () => {
  const allExceptSafety = Object.keys(story.clues).filter(id => !['hale-protection', 'baines-reassured'].includes(id));
  const facts = { deductions: story.deductions.map(d => d.id) };
  assert.equal(topicAvailable(topic('sounds'), { replies: [] }, allExceptSafety, facts), false);
  assert.equal(topicAvailable(topic('safety'), { replies: [] }, allExceptSafety, facts), false);
  assert.equal(topicAvailable(topic('safety'), { replies: [] }, [...allExceptSafety, 'hale-protection'], facts), true);
  assert.equal(topicAvailable(topic('sounds'), { replies: [] }, [...allExceptSafety, 'hale-protection'], facts), false);
  assert.equal(topicAvailable(topic('sounds'), { replies: [] }, [...allExceptSafety, 'hale-protection', 'baines-reassured'], facts), true);
  const character = new CharacterState(baines, { now: () => 1000 });
  character.acquire('player');
  const pressure = character.answer('player', 'pressure', 'disturbance', 'press').reply!;
  assert.equal(pressure.success, false);
  assert.equal(pressure.reward, undefined);
  const recovered = character.answer('player', 'recovery', 'disturbance', 'reassure').reply!;
  assert.equal(recovered.reward, 'baines-fear');
  assert.equal(topic('sounds').success.reward, 'baines-disturbance');
});

test('the reconstruction records an unidentified carrier and hiding, with no doorway encounter', () => {
  assert.ok(!story.deductions.some(d => d.id === 'trunk-contradiction'));
  const movement = story.deductions.find(d => d.id === 'trunk-movement')!;
  assert.deepEqual(movement.requires, ['baines-trunk', 'trunk-interior']);
  const sequence = story.reconstructions!.find(r => r.id === 'disturbance-sequence')!;
  assert.equal(validReconstruction(sequence, ['cry', 'trunk', 'hide']), true);
  assert.equal(validReconstruction(sequence, ['cry', 'door', 'trunk']), false);
  assert.ok(sequence.events.every(event => !/Arthur|threat|doorway/.test(event.label)));
  assert.ok(!story.chapters[1].requiredEvidence.includes('baines-admission'));
  assert.equal(story.clues['baines-admission'], undefined);
});

test('recognition questions cannot turn Baines into an eyewitness identifying Arthur', () => {
  const identification = topic('identify-man');
  for (const response of Object.values(identification.responses ?? {})) {
    assert.equal(response.reward, undefined);
    assert.match(response.text, /couldn’t|didn’t|can’t/);
  }
  const report = story.chapters[1].flow.completion;
  assert.equal(report.kind, 'findings');
  if (report.kind === 'findings') assert.ok(report.options.filter(o => report.supported.includes(o.id)).every(o => !/Arthur was at Nora’s door|Arthur.*moved her trunk/.test(o.label)));
});
