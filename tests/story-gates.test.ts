import assert from 'node:assert/strict';
import { test } from 'node:test';
import { gateOpen } from '../shared/game/story-gates';
import { reportKey } from '../shared/game/final-report';

test('authored gates combine evidence, deductions, decisions and accepted reports', () => {
  const gate = { requiresAll: ['account', 'specimen'], requiresDeduction: 'comparison', requiresChoice: { id: 'disclosure', value: 'private' }, requiresReport: true };
  const facts = { evidence: ['account', 'specimen'], deductions: ['comparison'], decisions: { disclosure: 'private' }, reportAccepted: true };
  assert.equal(gateOpen(gate, facts), true);
  assert.equal(gateOpen(gate, { ...facts, evidence: ['account'] }), false);
  assert.equal(gateOpen(gate, { ...facts, deductions: [] }), false);
  assert.equal(gateOpen(gate, { ...facts, decisions: { disclosure: 'public' } }), false);
  assert.equal(gateOpen(gate, { ...facts, reportAccepted: false }), false);
});
test('report agreement compares finding sets independent of selection order', () => {
  assert.equal(reportKey(['a', 'b']), reportKey(['b', 'a']));
  assert.notEqual(reportKey(['a', 'b']), reportKey(['a']));
});
