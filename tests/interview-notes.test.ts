import test from 'node:test';
import assert from 'node:assert/strict';
import { interviewNotesMotion, NOTEBOOK_PAGE_Y } from '../frontend/src/characters/interview-notes-motion';

test('listening alternates small writing strokes with a lifted pencil pause', () => {
  const first = interviewNotesMotion(1, false, false);
  const next = interviewNotesMotion(1.1, false, false);
  const pause = interviewNotesMotion(4.5, false, false);
  assert.equal(first.writing, true);
  assert.notDeepEqual(first.tip, next.tip);
  assert.equal(pause.writing, false);
  assert.ok(pause.tip[1] > first.tip[1] + .01);
});

test('pencil strokes stay on the small notebook page and never penetrate it', () => {
  for (let time = 0; time < 20; time += .017) {
    const { tip } = interviewNotesMotion(time, false, false);
    assert.ok(Math.abs(tip[0]) < .09);
    assert.ok(Math.abs(tip[2]) < .12);
    assert.ok(tip[1] >= NOTEBOOK_PAGE_Y);
    assert.ok(tip[1] <= NOTEBOOK_PAGE_Y + .07);
  }
});

test('speaking holds the pencil clear of the page instead of writing', () => {
  const held = interviewNotesMotion(0, true, false);
  for (const time of [1, 1.1, 4.5, 19]) assert.deepEqual(interviewNotesMotion(time, true, false), held);
  assert.equal(held.writing, false);
  assert.ok(held.tip[1] >= NOTEBOOK_PAGE_Y + .04);
});

test('reduced motion preserves one static listening pose at every time', () => {
  const held = interviewNotesMotion(0, false, true);
  for (const time of [1, 1.1, 4.5, 19]) assert.deepEqual(interviewNotesMotion(time, false, true), held);
  assert.equal(held.writing, false);
});
