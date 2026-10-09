import { startLocalActors } from 'terse-sdk/dev';
import { parseActorEndpoint } from 'terse-types/ActorEndpoint';
import { mkdtemp, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

export class ActorRuntime {
  constructor(private readonly startLocal: typeof startLocalActors = startLocalActors) {}

  async start(env: NodeJS.ProcessEnv, options: Parameters<typeof startLocalActors>[0], cloud = false) {
    if (cloud) { requireCloudActors(env); return; }
    const runtime = await this.startConfiguredRuntime(env, options);
    const { controlPlaneUrl, projectId, apiKey } = runtime.connection;
    Object.assign(env, { TERSE_ACTOR_URL: `${controlPlaneUrl}/v1/projects/${projectId}/actors`, TERSE_API_KEY: apiKey ?? '' });
    return runtime;
  }

  private async startConfiguredRuntime(env: NodeJS.ProcessEnv, options: Parameters<typeof startLocalActors>[0]) {
    if (!options.port) return this.startLocal(options);
    const project = await mkdtemp(join(tmpdir(), 'whitechapel-actor-config-'));
    const root = resolve(options.project ?? '.');
    const providerKeys = ['AI_MODE', 'TYPESAFE_API_KEY', 'FAL_KEY', 'JEV_MODEL', 'CHARACTER_MODEL', 'CHARACTER_REASONING_EFFORT', 'FAL_VOICES'];
    const settings = { ...Object.fromEntries(providerKeys.map(key => [key, env[key]])), DURABLE_ACTORS_CONTROL_PLANE_URL: `http://127.0.0.1:${options.port}`,
      DURABLE_ACTORS_PROJECT_ID: options.projectId ?? 'local', DURABLE_ACTORS_SECRET: options.apiKey,
      TERSE_ACTOR_URL: `http://127.0.0.1:${options.port}/v1/projects/${options.projectId ?? 'local'}/actors`, TERSE_API_KEY: options.apiKey,
      WHITECHAPEL_ACTOR_URL: `http://127.0.0.1:${options.port}/v1/projects/${options.projectId ?? 'local'}/actors`, WHITECHAPEL_ACTOR_KEY: options.apiKey,
      STORY_PATH: resolve(root, env.STORY_PATH ?? 'stories/starter/story.json') };
    await writeFile(join(project, '.env.local'), Object.entries(settings).filter(([, value]) => value !== undefined).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join('\n'), { mode: 0o600 });
    await writeFile(join(project, 'actors.ts'), `export * from ${JSON.stringify(resolve(root, options.entrypoint).replace(/\.ts$/, '.js'))};\n`);
    await writeFile(join(project, 'package.json'), '{"type":"module"}');
    await writeFile(join(project, 'tsconfig.json'), JSON.stringify({ extends: resolve(root, 'tsconfig.json'), include: ['actors.ts'] }));
    await symlink(resolve(root, 'node_modules'), join(project, 'node_modules'), 'dir');
    for (const directory of ['stories', 'tests']) await symlink(resolve(root, directory), join(project, directory), 'dir');
    try {
      const runtime = await this.startLocal({ ...options, project, entrypoint: 'actors.ts', ...(options.dataDir ? { dataDir: resolve(root, options.dataDir) } : {}) });
      return { ...runtime, stop: async () => { await runtime.stop(); await rm(project, { recursive: true, force: true }); } };
    } catch (error) { await rm(project, { recursive: true, force: true }); throw error; }
  }
}

export function requireCloudActors(env: NodeJS.ProcessEnv) {
  if (!env.TERSE_ACTOR_URL?.trim() || !env.TERSE_API_KEY?.trim()) throw new Error('Cloud play requires TERSE_ACTOR_URL and TERSE_API_KEY in .env.local.');
  const endpoint = parseActorEndpoint(env.TERSE_ACTOR_URL);
  const url = new URL(endpoint.origin);
  if (endpoint.kind !== 'terse' || url.protocol !== 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
    throw new Error('Cloud play requires a hosted HTTPS Terse actor endpoint.');
  }
}
