import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cloudHostEnvironment } from '../scripts/cloud-host';

const credentials = { TERSE_ACTOR_URL: 'https://api.useterse.ai/cloud/actors', TERSE_API_KEY: 'cloud-key' };

test('shared hosting requires cloud actors and serves production assets with persistent voice storage', () => {
  assert.throws(() => cloudHostEnvironment({}), /TERSE_ACTOR_URL/);
  assert.throws(() => cloudHostEnvironment({ ...credentials, TERSE_API_KEY: '' }), /TERSE_API_KEY/);
  const env = cloudHostEnvironment(credentials);
  assert.equal(env.NODE_ENV, 'production');
  assert.equal(env.HOST, '127.0.0.1');
  assert.equal(env.PORT, '3188');
  assert.equal(env.STORY_PATH, 'stories/sixth-murder/story.json');
  assert.equal(env.FRAMEWORK_DATA_DIR, '.durable-actors/cloud');
  assert.equal(env.TERSE_ACTOR_URL, credentials.TERSE_ACTOR_URL);
});

test('shared hosting preserves the selected story, provider configuration and hosting settings', () => {
  const overrides = { ...credentials, STORY_PATH: 'stories/another/story.json', HOST: '0.0.0.0', PORT: '6190', FRAMEWORK_DATA_DIR: '/data/game', FAL_KEY: 'provider-key' };
  assert.deepEqual(cloudHostEnvironment(overrides), { ...overrides, NODE_ENV: 'production' });
});
