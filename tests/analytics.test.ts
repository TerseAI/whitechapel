import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sanitizeAnalyticsEvent } from '../frontend/src/analytics';

test('analytics keeps page paths without case invitations or URL fragments', () => {
  const event = { type: 'pageview' as const, url: 'https://whitechapel.example/?case=private-case#private-fragment' };
  assert.deepEqual(sanitizeAnalyticsEvent(event), { type: 'pageview', url: 'https://whitechapel.example/' });
  assert.equal(event.url, 'https://whitechapel.example/?case=private-case#private-fragment');
  assert.deepEqual(sanitizeAnalyticsEvent({ type: 'pageview', url: 'https://whitechapel.example/about' }), {
    type: 'pageview', url: 'https://whitechapel.example/about',
  });
});

test('analytics drops malformed URLs without interrupting the game', () => {
  assert.equal(sanitizeAnalyticsEvent({ type: 'pageview', url: 'invalid-url?case=private-case' }), null);
});
