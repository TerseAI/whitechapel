import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chapterProgress, investigationGuidance } from '../shared/game/investigation';
import { validateStory } from '../shared/story/definition';
import type { Chapter, StoryDefinition } from '../shared/story/types';
import fixture from './fixtures/framework/story.json';

const story = () => structuredClone(fixture) as unknown as StoryDefinition;
const chapter = (): Chapter => ({ ...story().chapters[0], requiredEvidence: ['account'], deductionIds: [], requiredInterviews: [], guidance: {
  introduction: 'Meet the witness before leaving.',
  leads: [
    { id: 'meet', title: 'Speak to the witness', detail: 'Ask about the parcel.', completeWhen: { evidence: ['account'] }, hints: ['Discuss the delivery.', 'Ask when it arrived.'] },
    { id: 'secret', title: 'A hidden next step', detail: 'A detail that must stay hidden.', requiresAll: ['account'], completeWhen: { evidence: ['paper-record'] } },
  ],
} });

test('guidance reveals only discovered leads and only the requested hint level', () => {
  const initial = investigationGuidance(chapter(), { evidence: [], deductions: [] });
  assert.deepEqual(initial.leads.map(lead => lead.id), ['meet']);
  assert.doesNotMatch(JSON.stringify(initial), /hidden next|when it arrived|Discuss the delivery/);
  const hint = investigationGuidance(chapter(), { evidence: [], deductions: [] }, { meet: 1 });
  assert.equal(hint.leads[0].hint, 'Discuss the delivery.');
  assert.equal(hint.leads[0].hintLevel, 1);
});

test('partner discoveries complete shared leads and reveal the next lead', () => {
  const view = investigationGuidance(chapter(), { evidence: ['account'], deductions: [] }, {}, { meet: 'partner' });
  assert.equal(view.leads[0].complete, true);
  assert.equal(view.leads[0].assignedTo, 'partner');
  assert.equal(view.leads[1].id, 'secret');
});

test('readiness counts required discoveries, not optional evidence or every witness topic', () => {
  const c = chapter();
  assert.equal(chapterProgress(c, ['optional'], [], []).ready, false);
  assert.deepEqual(chapterProgress(c, ['optional', 'account'], [], []).evidence, { done: 1, total: 1 });
  assert.equal(chapterProgress(c, ['account'], [], []).ready, true);
});

test('authored guidance validates its evidence and destination references', () => {
  const s = story();
  s.chapters[0].guidance = chapter().guidance;
  assert.doesNotThrow(() => validateStory(s));
  s.chapters[0].guidance!.leads[0].location = 'missing-location';
  assert.throws(() => validateStory(s), /lead.*location/i);
});

test('deduction questions follow their authored lead gates without exposing future questions', async () => {
  const { investigationQuestions } = await import('../shared/game/investigation');
  const c = chapter();
  c.deductionIds = ['first', 'later'];
  c.guidance!.leads.push({ id: 'later', title: 'Future finding', detail: 'Hidden', requiresAll: ['account'], completeWhen: { deduction: 'later' } });
  const questions = [{ id: 'first', title: 'First', question: 'First?' }, { id: 'later', title: 'Later', question: 'Secret?' }];
  assert.deepEqual(investigationQuestions(c, questions, { evidence: [] }).map(item => item.id), ['first']);
  assert.equal(investigationQuestions(c, questions, { evidence: ['account'] }).length, 2);
});
