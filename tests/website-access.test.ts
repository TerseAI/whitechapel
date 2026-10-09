import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { test } from 'node:test';
import handler from '../api/index';

test('the hosted API is public while case routes still require player credentials', async t => {
  const savedPassword = process.env.GAME_PASSWORD;
  t.after(() => {
    if (savedPassword === undefined) delete process.env.GAME_PASSWORD;
    else process.env.GAME_PASSWORD = savedPassword;
  });
  const server = createServer(handler);
  t.after(() => new Promise<void>((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
    server.closeAllConnections();
  }));
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const origin = `http://127.0.0.1:${address.port}`;

  for (const password of [undefined, 'unused-deployment-password']) {
    await t.test(`public endpoints ignore ${password ? 'a leftover' : 'a missing'} website password`, async () => {
      if (password === undefined) delete process.env.GAME_PASSWORD;
      else process.env.GAME_PASSWORD = password;
      for (const path of ['/api/health', '/api/story']) {
        const response = await fetch(`${origin}${path}`);
        assert.equal(response.status, 200);
        assert.equal(response.headers.get('www-authenticate'), null);
        assert.equal(response.headers.get('set-cookie'), null);
        assert.ok(await response.json());
      }
    });
  }

  await t.test('case reads and socket grants reject missing player credentials', async () => {
    const room = '/api/cases/0123456789abcdef01234567';
    for (const suffix of ['', '/socket', '/scene-socket', '/conversation-socket']) {
      const response = await fetch(`${origin}${room}${suffix}`, suffix ? {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ npcId: 'witness' }),
      } : undefined);
      assert.equal(response.status, 400);
      assert.equal(response.headers.get('www-authenticate'), null);
      assert.deepEqual(await response.json(), { error: 'This request is incomplete. Check your invitation and try again.' });
    }
  });
});
