import assert from 'node:assert/strict';
import { test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { CaseSocketClient } from '../frontend/src/game/case-socket-client';
import type { CaseEvent } from '../shared/game/case-socket';

test('current SDK grants keep a healthy connection open without an authorization expiry field', async () => {
  const socket = new FakeSocket();
  let grants = 0;
  const client = new CaseSocketClient(async () => {
    grants++;
    return { websocketUrl: 'wss://actors.example/case', connectByMs: Date.now() + 10000, liveInterviews: true };
  }, { update() {}, status() {} }, () => socket);
  try {
    client.start();
    await Promise.resolve();
    socket.receive({ type: 'update', state: { revision: 1, npcs: [] } });
    await delay(1700);
    assert.equal(socket.closed, false);
    assert.equal(grants, 1);
  } finally { client.stop(); }
});

test('browser connects to the granted actor URL and correlates direct action replies', async () => {
  const socket = new FakeSocket(), updates: CaseEvent[] = [];
  const client = new CaseSocketClient(async () => ({ websocketUrl: 'wss://actors.example/case', connectByMs: Date.now() + 10000, liveInterviews: true }), {
    update: event => event.type === 'update' && updates.push(event), status() {},
  }, url => { assert.equal(url, 'wss://actors.example/case'); return socket; });
  client.start();
  await Promise.resolve();
  socket.receive({ type: 'state', state: { secretHash: 'never use automatic state' } });
  assert.equal(updates.length, 0);
  socket.receive({ type: 'update', state: { revision: 1, npcs: [] } });
  const first = client.act({ type: 'heartbeat' }), second = client.act({ type: 'move', x: 1, z: 2 });
  const [a, b] = socket.sent.map(frame => JSON.parse(frame));
  socket.receive({ type: 'result', requestId: b.requestId, result: { ok: true, message: 'Moved' } });
  socket.receive({ type: 'result', requestId: a.requestId, result: { ok: true, message: 'Present' } });
  assert.equal((await second).message, 'Moved');
  assert.equal((await first).message, 'Present');
  assert.equal(updates.length, 1);
  const pending = client.act({ type: 'heartbeat' });
  client.stop();
  assert.equal((await pending).ok, false);
  assert.equal(socket.closed, true);
});

test('a grant that arrives after unmount never opens a socket', async () => {
  let grant: (value: any) => void = () => {};
  const client = new CaseSocketClient(() => new Promise(resolve => { grant = resolve; }), { update() {}, status() {} }, () => { assert.fail('Opened after unmount'); });
  client.start(); client.stop();
  grant({ websocketUrl: 'wss://actors.example/case', liveInterviews: true });
  await Promise.resolve();
});

test('disconnection fails in-flight commands and reconnects with a fresh grant and snapshot', async () => {
  const sockets: FakeSocket[] = [], revisions: number[] = [];
  let grants = 0;
  const client = new CaseSocketClient(async () => ({ websocketUrl: `wss://actors.example/${++grants}`, connectByMs: Date.now() + 10000, liveInterviews: true }), {
    update: event => { if (event.type === 'update') revisions.push(event.state.revision); }, status() {},
  }, () => { const socket = new FakeSocket(); sockets.push(socket); return socket; });
  try {
    client.start(); await Promise.resolve();
    sockets[0].receive({ type: 'update', state: { revision: 1, npcs: [] } });
    const command = client.act({ type: 'ready', ready: true });
    sockets[0].close();
    assert.equal((await command).ok, false);
    await delay(1600);
    assert.equal(grants, 2);
    assert.equal(sockets[1].sent.length, 0, 'Ambiguous actions are not automatically replayed');
    sockets[1].receive({ type: 'update', state: { revision: 3, npcs: [] } });
    assert.deepEqual(revisions, [1, 3]);
  } finally { client.stop(); }
});

test('conversation sockets resume on connect and carry questions directly', async () => {
  const socket = new FakeSocket();
  const client = new CaseSocketClient(async () => ({ websocketUrl: 'wss://actors.example/conversation', connectByMs: Date.now() + 10000 }), { update() {}, status() {} }, () => socket);
  try {
    client.start(); await Promise.resolve();
    socket.receive({ type: 'conversation', state: { entityId: 'witness', revision: 1, replies: [] } });
    const resume = JSON.parse(socket.sent[0]);
    assert.equal(resume.action.type, 'heartbeat');
    socket.receive({ type: 'result', requestId: resume.requestId, result: { ok: true, message: '' } });
    const question = client.act({ type: 'question', npcId: 'witness', text: 'Hello.' });
    const command = JSON.parse(socket.sent[1]);
    assert.equal(command.action.type, 'question');
    socket.receive({ type: 'result', requestId: command.requestId, result: { ok: true, message: 'Saved.' } });
    assert.equal((await question).ok, true);
    socket.receive({ type: 'conversation', state: { entityId: 'witness', revision: 2, replies: [] } });
    assert.equal(socket.sent.length, 2, 'Updates do not loop into recovery calls');
  } finally { client.stop(); }
});

class FakeSocket extends EventTarget {
  readyState = 1;
  sent: string[] = [];
  closed = false;
  send(frame: string) { this.sent.push(frame); }
  close() { this.closed = true; this.readyState = 3; this.dispatchEvent(new Event('close')); }
  receive(frame: unknown) { this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(frame) })); }
}
