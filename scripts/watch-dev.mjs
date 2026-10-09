import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

if (existsSync('.env.local')) loadEnvFile('.env.local');

const framework = process.argv.includes('--framework');
const env = { ...process.env };
env.WHITECHAPEL_CLOUD = process.argv.includes('--cloud') ? '1' : '0';
env.DURABLE_ACTORS_CACHE_DIR ??= resolve('.durable-actors/runtime-cache');
env.DURABLE_ACTORS_TELEMETRY ??= '0';
env.STORY_PATH ??= framework ? 'tests/fixtures/framework/story.json' : 'stories/starter/story.json';
if (framework) env.FRAMEWORK_DATA_DIR ??= await mkdtemp(join(tmpdir(), 'investigation-preview-'));

const story = resolve(env.STORY_PATH);
const watched = ['backend/src/**/*.ts', 'shared/**/*.ts', story, join(dirname(story), 'assets/**/*')];
const child = spawn(process.execPath, [
  fileURLToPath(import.meta.resolve('tsx/cli')), 'watch', '--clear-screen=false',
  ...watched.flatMap(path => ['--include', path]),
  framework ? 'scripts/framework-preview.mjs' : 'scripts/dev.mjs',
], { env, stdio: 'inherit' });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
console.log('Development reload enabled. Save backend or story changes, or press Enter to restart.');
const [code] = await once(child, 'exit');
process.exitCode = code ?? 0;
