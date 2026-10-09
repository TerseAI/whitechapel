import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadCredentials, saveCredentials } from '../frontend/src/story/session-storage';

test('the new game storage ignores retired saves and restores only current sessions', () => {
  const story = { id: 'example', version: '1' };
  const credentials = { roomId: 'room', playerId: 'one', secret: 'secret' };
  const values = new Map([['investigation.v2.example.1.last', 'room'], ['investigation.v2.example.1.room', JSON.stringify(credentials)]]);
  const previous = ['location', 'localStorage'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
  Object.defineProperty(globalThis, 'location', { configurable: true, value: { search: '' } });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  } });
  try {
    assert.equal(loadCredentials(story), null);
    saveCredentials(story, credentials);
    assert.deepEqual(loadCredentials(story), credentials);
    assert.ok(values.has('investigation.v5.example.1.room'));
  } finally {
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
