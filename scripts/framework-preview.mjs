import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { ActorRuntime } from './actor-runtime.ts';
import { waitForReady } from './process-ready.mjs';

const directory = process.env.FRAMEWORK_DATA_DIR ? resolve(process.env.FRAMEWORK_DATA_DIR) : await mkdtemp(join(tmpdir(), 'investigation-preview-'));
await mkdir(directory, { recursive: true });
const children = [];
const port = Number(process.env.FRAMEWORK_PORT ?? 5288);
const apiPort = port + 1, actorPort = port + 2000;
let stopping = false;
let runtime;
const env = { ...process.env, STORY_PATH: process.env.STORY_PATH ?? 'tests/fixtures/framework/story.json', DURABLE_ACTORS_CACHE_DIR: resolve('.durable-actors/runtime-cache') };
Object.assign(process.env, { STORY_PATH: env.STORY_PATH, DURABLE_ACTORS_CACHE_DIR: env.DURABLE_ACTORS_CACHE_DIR });
env.FRAMEWORK_DATA_DIR = directory;
const stop = () => { if (stopping) return; stopping = true; for (const child of children) child.kill('SIGTERM'); void runtime?.stop(); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

function start(command, args, options = {}) {
  const child = spawn(command, args, { stdio: 'inherit', env, ...options });
  children.push(child);
  child.on('exit', code => { if (!stopping) { process.exitCode = code || 1; stop(); } });
  return child;
}

try {
  runtime = await new ActorRuntime().start(env, { apiKey: randomBytes(32).toString('hex'), entrypoint: 'backend/src/durable-objects.ts', port: actorPort, dataDir: directory, quiet: true }, env.WHITECHAPEL_CLOUD === '1');
  runtime?.closed.catch(error => { if (!stopping) { console.error(error.message); stop(); } });
  const gateway = start('node_modules/.bin/tsx', ['backend/src/index.ts'], { stdio: ['ignore', 'pipe', 'pipe'], env: {
    ...env, PORT: String(apiPort),
  } });
  await waitForReady(gateway, 'Investigation gateway ready', 'Preview gateway');
  const web = start('node_modules/.bin/vite', ['--host', '127.0.0.1', '--port', String(port)], { stdio: ['ignore', 'inherit', 'inherit'], env: { ...env, GAME_API_ORIGIN: `http://127.0.0.1:${apiPort}` } });
  console.log(`Framework preview: http://127.0.0.1:${port}\nIndependent state directory: ${directory}`);
  await once(web, 'exit');
} catch (error) {
  console.error(error.message); process.exitCode = 1;
} finally { stop(); }
