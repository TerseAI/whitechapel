import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { topicAvailable } from '../../../shared/game/interviews';
import { evaluateReply } from '../../../backend/src/story';
import type { StoryDefinition } from '../../../shared/story/types';

const { characters } = JSON.parse(readFileSync(new URL('../story.json', import.meta.url), 'utf8')) as StoryDefinition;

test('Nora can explain her journey first or after her work, before the newspaper conversation', () => {
  const nora = characters.find(character => character.id === 'nora')!;
  const topic = (id: string) => nora.topics.find(topic => topic.id === id)!;
  const available = (id: string, evidence: string[]) => topicAvailable(topic(id), { replies: [] }, evidence);
  assert.equal(available('work', []), true);
  assert.equal(available('journey', []), true);
  const work = evaluateReply(nora, 'work', 'reassure');
  assert.equal(work.reward, 'nora-work');
  assert.equal(available('journey', [work.reward!]), true);
  assert.equal(available('paper', [work.reward!]), false);
  const journey = evaluateReply(nora, 'journey', 'reassure');
  assert.equal(journey.reward, 'nora-plans');
  assert.equal(available('paper', [work.reward!, journey.reward!]), true);
  const paper = evaluateReply(nora, 'paper', 'reassure');
  assert.equal(paper.success, true);
  assert.equal(paper.reward, undefined);
});
