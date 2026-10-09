import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { CaseView } from '../shared/game/types';
import { CaseProgress } from '../frontend/src/case-map/case-progress';

const saved = (overrides: Partial<CaseView> = {}) => ({ roomId: 'case', revision: 1, chapter: { index: 0, title: 'A discovery' }, phase: 'investigating', deductions: [], canConclude: false, chapterReports: [], ...overrides }) as CaseView;

test('saved findings and repeated snapshots do not replay success cues', () => {
  const progress = new CaseProgress();
  const state = saved({ deductions: ['identity'], canConclude: true });
  assert.deepEqual(progress.observe(state), { sounds: [] });
  assert.deepEqual(progress.observe({ ...state, revision: 2 }), { sounds: [] });
});

test('a new link and readiness have distinct cues, including discoveries made by a partner', () => {
  const progress = new CaseProgress();
  progress.observe(saved());
  assert.deepEqual(progress.observe(saved({ revision: 2, deductions: ['identity'] })).sounds, ['link']);
  assert.deepEqual(progress.observe(saved({ revision: 3, deductions: ['identity', 'route'], canConclude: true })).sounds, ['link', 'review']);
  assert.deepEqual(progress.observe(saved({ revision: 2 })).sounds, []);
});

test('only an accepted chapter advance completes a chapter, not a recorded or rejected vote', () => {
  const progress = new CaseProgress();
  progress.observe(saved({ canConclude: true }));
  assert.deepEqual(progress.observe(saved({ revision: 2, votes: { one: 'answer' }, canConclude: true })), { sounds: [] });
  assert.deepEqual(progress.observe(saved({ revision: 3, lastFeedback: 'Incorrect', canConclude: true })), { sounds: [] });
  const next = saved({ revision: 4, chapter: { index: 1, title: 'Another enquiry' } as CaseView['chapter'], chapterReports: [{ title: 'A discovery', text: 'The witness account is established.' }] });
  assert.deepEqual(progress.observe(next), { sounds: ['chapter'], completed: { chapter: 1, title: 'A discovery', report: 'The witness account is established.', final: false } });
  assert.deepEqual(progress.observe(next), { sounds: [] });
});

test('final acceptance celebrates once; loading a solved case or a different room does not', () => {
  const progress = new CaseProgress();
  const final = saved({ chapter: { index: 4, title: 'The last letter' } as CaseView['chapter'] });
  progress.observe(final);
  assert.equal(progress.observe({ ...final, revision: 2, phase: 'solved', ending: 'The evidence agrees.' }).completed?.final, true);
  assert.deepEqual(progress.observe({ ...final, revision: 3, phase: 'solved' }).sounds, []);
  assert.deepEqual(progress.observe(saved({ roomId: 'another', canConclude: true })), { sounds: [] });
  assert.deepEqual(new CaseProgress().observe({ ...final, phase: 'solved' }), { sounds: [] });
});
