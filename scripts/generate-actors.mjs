import { execFile } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { startLocalActors } from 'terse-sdk/dev';

process.env.DURABLE_ACTORS_CACHE_DIR ??= resolve('.durable-actors/runtime-cache');
process.env.DURABLE_ACTORS_TELEMETRY = '0';
const dataDir = await mkdtemp(join(tmpdir(), 'whitechapel-codegen-'));
let runtime;
try {
  runtime = await startLocalActors({ entrypoint: 'backend/src/durable-objects.ts', dataDir, quiet: true });
  const { controlPlaneUrl, projectId } = runtime.connection;
  const result = await promisify(execFile)(process.execPath, ['node_modules/terse-cli/dist/index.js', 'actor', 'generate', '--language', 'typescript', '--out-dir', 'backend/src/actors/generated'], {
    env: { ...process.env, TERSE_ACTOR_URL: `${controlPlaneUrl}/v1/projects/${projectId}/actors`, TERSE_API_KEY: '' },
  });
  process.stdout.write(result.stdout);
  await mkdir('shared/actors', { recursive: true });
  await copyFile('backend/src/actors/generated/types.d.ts', 'shared/actors/generated.d.ts');
} finally {
  await runtime?.stop();
  await rm(dataDir, { recursive: true, force: true });
}
