import assert from 'node:assert/strict';
import { test } from 'node:test';
import { revealedConnections } from '../backend/src/cases/connections';
import type { Deduction } from '../shared/game/types';

const definition: Deduction = { id: 'route', title: 'The route', question: 'Where?', explanation: 'The accounts agree.', requires: ['map', 'account'], alternatives: [['map', 'statement']] };

test('the case map reveals no answer pairs before a deduction is established', () => {
  assert.deepEqual(revealedConnections([definition], [], ['map', 'account'], {}), []);
});

test('the case map preserves the actual pair used by the investigators', () => {
  const connections = revealedConnections([definition], ['route'], ['map', 'account', 'statement'], { route: ['statement', 'map'] });
  assert.deepEqual(connections, [{ id: 'route', title: 'The route', explanation: 'The accounts agree.', evidenceIds: ['statement', 'map'] }]);
});

test('a connection is shown only when its actual evidence pair was recorded', () => {
  assert.deepEqual(revealedConnections([definition], ['route'], ['map', 'statement'], {}), []);
  assert.deepEqual(revealedConnections([definition], ['route'], ['map'], {}), []);
});
