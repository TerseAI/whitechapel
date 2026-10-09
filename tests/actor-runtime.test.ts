import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ActorRuntime } from '../scripts/actor-runtime';

test('local play uses an isolated runtime even when cloud credentials exist', async () => {
  const runtime = { connection: { controlPlaneUrl: 'http://127.0.0.1:7188', projectId: 'local', apiKey: 'local-key' } };
  const launcher = new ActorRuntime(async () => runtime as never);
  const env = { TERSE_ACTOR_URL: 'https://api.useterse.ai/cloud/actors', TERSE_API_KEY: 'cloud-key' };
  assert.equal(await launcher.start(env, { entrypoint: 'actors.ts' }), runtime);
  assert.equal(env.TERSE_ACTOR_URL, 'http://127.0.0.1:7188/v1/projects/local/actors');
  assert.equal(env.TERSE_API_KEY, 'local-key');
});

test('cloud play requires explicit credentials and never starts a local runtime', async () => {
  const launcher = new ActorRuntime(async () => { throw new Error('Unexpected local runtime'); });
  const env = { TERSE_ACTOR_URL: 'https://api.useterse.ai/cloud/actors', TERSE_API_KEY: 'cloud-key' };
  assert.equal(await launcher.start(env, { entrypoint: 'actors.ts' }, true), undefined);
  await assert.rejects(launcher.start({ TERSE_ACTOR_URL: env.TERSE_ACTOR_URL }, { entrypoint: 'actors.ts' }, true), /TERSE_API_KEY/);
  await assert.rejects(launcher.start({ ...env, TERSE_ACTOR_URL: 'invalid' }, { entrypoint: 'actors.ts' }, true), /TERSE_ACTOR_URL/);
  for (const url of ['http://api.useterse.ai/cloud/actors', 'http://127.0.0.1:7100/v1/projects/local/actors', 'https://localhost/cloud/actors']) {
    await assert.rejects(launcher.start({ ...env, TERSE_ACTOR_URL: url }, { entrypoint: 'actors.ts' }, true), /hosted HTTPS/);
  }
});

test('local actor-to-actor calls receive isolated project settings', async () => {
  const runtime = { connection: { controlPlaneUrl: 'http://127.0.0.1:7199', projectId: 'local', apiKey: 'private-local-key' }, async stop() {} };
  const launcher = new ActorRuntime(async options => {
    const config = await readFile(join(options.project!, '.env.local'), 'utf8');
    assert.ok(config.includes('DURABLE_ACTORS_CONTROL_PLANE_URL="http://127.0.0.1:7199"'));
    assert.ok(config.includes('DURABLE_ACTORS_SECRET="private-local-key"'));
    assert.ok(config.includes('TERSE_API_KEY="private-local-key"'));
    assert.ok(config.includes('FAL_KEY="test-fal-key"'));
    assert.ok(!config.includes('UNRELATED_SECRET'));
    return runtime as never;
  });
  const started = await launcher.start({ FAL_KEY: 'test-fal-key', UNRELATED_SECRET: 'hidden' }, { entrypoint: 'backend/src/durable-objects.ts', port: 7199, apiKey: 'private-local-key' });
  await started!.stop();
});
