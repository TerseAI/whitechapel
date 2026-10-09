import assert from 'node:assert/strict';
import { test } from 'node:test';
import { z } from 'zod';
import { handleCaseCommand } from '../backend/src/cases/socket-command';

test('direct socket commands use the granted identity and preserve request IDs', async () => {
  const identity = { playerId: 'inspector', secret: 'credential' };
  const requestId = crypto.randomUUID();
  const replies: unknown[] = [];
  await handleCaseCommand({ metadata: identity, send: message => replies.push(message) }, {
    requestId, action: { type: 'move', x: 1, z: 2 }, playerId: 'someone-else',
  }, async (who, id, action) => {
    assert.deepEqual(who, identity); assert.equal(id, requestId); assert.equal(action.type, 'move');
    return { ok: true, message: '' };
  });
  assert.deepEqual(replies, [{ type: 'result', requestId, result: { ok: true, message: '' } }]);
});

test('invalid socket actions cannot reach the authority and failures do not leak internal details', async () => {
  const requestId = crypto.randomUUID(), replies: unknown[] = [];
  const socket = { metadata: { playerId: 'one', secret: 'secret' }, send: (message: unknown) => replies.push(message) };
  await handleCaseCommand(socket, { requestId, action: { type: 'move', x: 9999, z: 0 } }, async () => { assert.fail('Invalid action executed'); });
  assert.equal((replies[0] as any).result.ok, false);
  await handleCaseCommand(socket, { requestId, action: { type: 'heartbeat' } }, async () => { throw new Error('internal credential'); });
  assert.doesNotMatch(JSON.stringify(replies), /internal credential/);
  assert.equal((replies[1] as any).result.ok, false);
});

test('inspection confirmations omit absent document fields before reaching the JSON-only socket', async () => {
  const requestId = crypto.randomUUID();
  const evidence = {
    id: 'corner', title: 'Screened corner', description: 'Little blood remains.', detail: '',
    provenance: 'Yard', location: 'yard', chapter: 1, kind: 'object' as const,
    foundBy: 'one', document: undefined,
  };
  const sent: unknown[] = [];
  await handleCaseCommand({
    metadata: { playerId: 'one', secret: 'secret' },
    send: message => { sent.push(z.json().parse(message)); },
  }, { requestId, action: { type: 'inspect', clueId: 'corner' } }, async () => ({
    ok: true, message: evidence.description, evidence,
  }));
  const { document: _, ...recorded } = evidence;
  assert.deepEqual(sent, [{ type: 'result', requestId, result: { ok: true, message: evidence.description, evidence: recorded } }]);
});
