import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CaseService, type CaseEndpoint } from '../backend/src/cases/case-service';
import type { ActionResult, CaseView, Credentials } from '../shared/game/types';

test('opening and joining use fresh investigator credentials and only the authoritative case', async () => {
  const { service, calls, credentials, state } = fixture();
  assert.deepEqual(await service.create('Alice'), { credentials, state });
  assert.deepEqual(calls, ['get:new-room', 'create:Alice:co-op']);
  calls.length = 0;
  const joined = await service.create('Bob', 'invited-room');
  assert.equal(joined.credentials.roomId, 'invited-room');
  assert.deepEqual(calls, ['get:invited-room', 'join:Bob']);
});

test('solo mode is supplied only when creating a new case', async () => {
  const { service, calls } = fixture();
  await service.create('Alice', undefined, 'solo');
  assert.deepEqual(calls, ['get:new-room', 'create:Alice:solo']);
});

test('actions preserve request identity without additional actor reads or writes', async () => {
  const { service, calls, credentials } = fixture();
  const result = await service.act('new-room', credentials, 'same-request', { type: 'note', text: 'A lead' });
  assert.deepEqual(result, { ok: false, message: 'Try another lead.' });
  assert.deepEqual(calls, ['get:new-room', 'act:same-request:note']);
});

test('an invalid identity cannot read the authoritative case', async () => {
  const { service, calls, credentials } = fixture();
  const invalid = { ...credentials, secret: 'invalid' };
  await assert.rejects(service.snapshot('new-room', invalid), /session is not valid/);
  assert.deepEqual(calls, ['get:new-room', 'snapshot']);
});

test('direct browser grants authenticate access without opening a relay socket', async () => {
  const { service, calls, credentials } = fixture();
  await assert.rejects(service.prepareSocket('new-room', { ...credentials, secret: 'invalid' }), /session is not valid/);
  assert.deepEqual(calls, ['get:new-room', 'snapshot']);
  calls.length = 0;
  assert.equal((await service.prepareSocket('new-room', credentials)).websocketUrl, 'wss://actors.example/case');
  assert.deepEqual(calls, ['get:new-room', 'snapshot', 'grant']);
});

test('the gateway forwards live questions and grants to ConversationActor', async () => {
  const { service, calls, credentials } = fixture(true);
  await service.act('new-room', credentials, 'question-id', { type: 'question', npcId: 'witness', text: 'Hello.' });
  assert.deepEqual(calls, ['get:new-room', 'question:question-id']);
  calls.length = 0;
  await service.prepareConversationSocket('new-room', credentials, 'witness');
  assert.deepEqual(calls, ['get:new-room', 'conversation:witness']);
});

function fixture(live = false) {
  const calls: string[] = [];
  const credentials: Credentials = { roomId: 'new-room', playerId: 'investigator', secret: 'valid' };
  const state = { roomId: credentials.roomId, revision: 1 } as CaseView;
  const room: CaseEndpoint = {
    async create(_playerId, _secret, name, mode) {
      calls.push(`create:${name}:${mode}`);
      return state;
    },
    async join(_playerId, _secret, name) {
      calls.push(`join:${name}`);
      return state;
    },
    async snapshot(identity) {
      calls.push('snapshot');
      if (identity.secret !== credentials.secret) throw new Error('Your investigator session is not valid.');
      return state;
    },
    async act(_identity, requestId, action): Promise<ActionResult> {
      calls.push(`act:${requestId}:${action.type}`);
      return { ok: false, message: 'Try another lead.' };
    },
    async question(_identity, requestId) { calls.push(`question:${requestId}`); return { ok: true, message: 'Saved.' }; },
    async prepareConversationWebsocket(_identity, npcId) { calls.push(`conversation:${npcId}`); return { websocketUrl: 'wss://actors.example/conversation', connectByMs: Date.now() + 10000, entityId: npcId }; },
    async prepareSceneWebsocket() { return { websocketUrl: 'wss://actors.example/scene', connectByMs: Date.now() + 10000, location: 'room', visit: 1 }; },
    async prepareWebsocket() {
      calls.push('grant');
      return { websocketUrl: 'wss://actors.example/case', connectByMs: Date.now() + 10000 };
    },
  };
  const service = new CaseService(
    {
      get(roomId) {
        calls.push(`get:${roomId}`);
        return room;
      },
    },
    () => ({ ...credentials }), live,
  );
  return { service, calls, credentials, state };
}
