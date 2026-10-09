import assert from 'node:assert/strict';
import { test } from 'node:test';
import { reportAgreement } from '../backend/src/cases/report-agreement';

test('one investigator cannot submit a report alone', () => {
  assert.equal(reportAgreement(['alice'], { alice: 'supported' }), 'waiting');
});

test('joining the case makes agreement mandatory even when the partner is away', () => {
  assert.equal(reportAgreement(['alice', 'bob'], { alice: 'supported' }), 'waiting');
  assert.equal(reportAgreement(['alice', 'bob'], { alice: 'supported', bob: 'rumour' }), 'different');
  assert.equal(reportAgreement(['alice', 'bob'], { alice: 'supported', bob: 'supported' }), 'agreed');
});

test('no conclusion is submitted until the investigator has chosen one', () => {
  assert.equal(reportAgreement(['alice'], {}), 'waiting');
  assert.equal(reportAgreement([], {}), 'waiting');
});

test('solo reports require the sole investigator to endorse the conclusion', () => {
  assert.equal(reportAgreement(['alice'], {}, 'solo'), 'waiting');
  assert.equal(reportAgreement(['alice'], { alice: 'supported' }, 'solo'), 'agreed');
  assert.equal(reportAgreement(['alice', 'bob'], { alice: 'supported', bob: 'supported' }, 'solo'), 'waiting');
});
