import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
const story = JSON.parse(readFileSync(new URL('../story.json', import.meta.url)));
test('the arrival explains its three tasks without demanding optional conversations or objects', () => {
  const chapter = story.chapters[0];
  assert.equal(chapter.guidance.leads.length, 3);
  assert.deepEqual(chapter.guidance.leads.flatMap(lead => lead.completeWhen.evidence), chapter.requiredEvidence);
  assert.match(chapter.guidance.introduction, /Retire for the evening/);
  assert.match(chapter.guidance.introduction, /optional/);
});
test('each required discovery and finding has a player-facing lead in its stage', () => {
  for (const chapter of story.chapters) {
    const evidence = chapter.guidance.leads.flatMap(lead => lead.completeWhen.evidence ?? []);
    const deductions = chapter.guidance.leads.map(lead => lead.completeWhen.deduction);
    for (const id of chapter.requiredEvidence) assert.ok(evidence.includes(id), `${chapter.title}: missing lead for ${id}`);
    for (const id of chapter.deductionIds) assert.ok(deductions.includes(id), `${chapter.title}: missing finding ${id}`);
  }
});
test('incidental first-enquiry accounts do not independently block the report', () => {
  assert.ok(story.chapters[1].requiredEvidence.length < 15);
  for (const optional of ['george-night', 'baines-last-seen', 'window-view', 'trunk-interior']) assert.ok(!story.chapters[1].requiredEvidence.includes(optional));
  assert.ok(story.chapters[1].requiredEvidence.includes('arthur-trunk-reply'));
});
