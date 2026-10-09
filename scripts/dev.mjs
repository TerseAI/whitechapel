import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ActorRuntime } from './actor-runtime.ts';
import { waitForReady } from './process-ready.mjs';
await mkdir('.durable-actors/runtime-cache', { recursive: true });
const children = [];
let stopping = false;
let runtime;
const env = { ...process.env };
const stop = () => { if (stopping) return; stopping = true; for (const child of children) child.kill('SIGTERM'); void runtime?.stop(); };
process.on('SIGINT', stop); process.on('SIGTERM', stop);
function start(command, args, options = {}) {
  const child = spawn(command, args, { stdio: 'inherit', env: { ...env, DURABLE_ACTORS_CACHE_DIR: resolve('.durable-actors/runtime-cache') }, ...options });
  children.push(child); child.on('exit', (code) => { if (!stopping) { process.exitCode = code || 1; stop(); } });
  return child;
}
try {
  runtime = await new ActorRuntime().start(env, { apiKey: randomBytes(32).toString('hex'), entrypoint: 'backend/src/durable-objects.ts', port: 7188, dataDir: '.durable-actors', quiet: true }, env.WHITECHAPEL_CLOUD === '1');
  runtime?.closed.catch(error => { if (!stopping) { console.error(error.message); stop(); } });
  const gateway = start('node_modules/.bin/tsx', ['backend/src/index.ts'], { stdio: ['ignore', 'pipe', 'pipe'] });
  await waitForReady(gateway, 'Investigation gateway ready', 'Gateway');
  const web = start('node_modules/.bin/vite', ['--host', '127.0.0.1'], { stdio: ['ignore', 'inherit', 'inherit'] });
  await once(web, 'exit');
} catch (error) {
  console.error(error.message); process.exitCode = 1;
} finally { stop(); }
