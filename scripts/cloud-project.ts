import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { ActorCompiler } from 'terse-sdk/dev';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { assetFiles, loadStory } from '../backend/src/story-loader.js';

export async function prepareCloudProject(destination: string, storyPath: string) {
  const story = loadStory(storyPath);
  const { sources } = new ActorCompiler().compileDeployment(resolve('backend/src/durable-objects.ts'));
  await resetProject(destination);
  await copyActorSources(destination, sources);
  await copyStory(destination, story);
  return writeProjectFiles(destination, story);
}

async function resetProject(destination: string) {
  const config = await readFile(join(destination, 'terse.config.json'), 'utf8').catch(() => undefined);
  await rm(destination, { recursive: true, force: true });
  await mkdir(destination, { recursive: true });
  if (config) await writeFile(join(destination, 'terse.config.json'), config);
}

async function copyActorSources(destination: string, sources: ReadonlyMap<string, string>) {
  for (const [file, source] of sources) {
    const path = relative(process.cwd(), file);
    if (isAbsolute(path) || !/^(backend|shared)\//.test(path)) continue;
    await writeSource(destination, path, source);
  }
  await writeSource(destination, 'src/actor.ts', "export { CaseActor, SceneActor, ConversationActor } from '../backend/src/durable-objects.js';\n");
}

async function copyStory(destination: string, story: ReturnType<typeof loadStory>) {
  // Production workers receive the compiled actor bundle without the source filesystem.
  await writeSource(destination, 'backend/src/active-story.ts', `import type { StoryDefinition } from '../../shared/story/types.js';\nexport const activeStory = ${JSON.stringify(story.story)} as StoryDefinition;\n`);
  await writeSource(destination, 'stories/selected/story.json', JSON.stringify(story.story));
  for (const asset of assetFiles(story.story)) {
    const target = join(destination, 'stories/selected/assets', asset);
    await mkdir(dirname(target), { recursive: true });
    await copyFile(join(story.assetsDirectory, asset), target);
  }
}

async function writeProjectFiles(destination: string, story: ReturnType<typeof loadStory>) {
  const application = JSON.parse(await readFile('package.json', 'utf8'));
  const manifest = {
    name: application.name, version: application.version, private: true, type: 'module',
    scripts: { typecheck: 'tsc --noEmit', deploy: 'terse deploy' },
    dependencies: Object.fromEntries(['durable-actors', 'terse-sdk', 'terse-types', 'zod', '@fal-ai/client', '@typesafe-ai/sdk', 'openai', 'music-metadata'].map(name => [name, application.dependencies[name]])),
    devDependencies: Object.fromEntries(['@types/node', 'terse-cli', 'typescript'].map(name => [name, application.devDependencies[name]])),
  };
  await writeSource(destination, 'package.json', JSON.stringify(manifest, null, 2) + '\n');
  const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
  Object.assign(lock.packages[''], { dependencies: manifest.dependencies, devDependencies: manifest.devDependencies });
  await writeSource(destination, 'package-lock.json', JSON.stringify(lock, null, 2) + '\n');
  await promisify(execFile)('npm', ['install', '--package-lock-only', '--ignore-scripts', '--no-audit', '--no-fund', '--offline'], { cwd: destination });
  await writeSource(destination, 'tsconfig.json', JSON.stringify({ compilerOptions: { target: 'ES2022', module: 'NodeNext', strict: true, skipLibCheck: true, noEmit: true, types: ['node'] }, include: ['src/actor.ts'] }, null, 2) + '\n');
  const metadata = { storyId: story.story.id, storyVersion: story.story.version, sdk: manifest.dependencies['terse-sdk'], runtime: manifest.dependencies['durable-actors'] };
  await writeSource(destination, 'whitechapel.json', JSON.stringify(metadata, null, 2) + '\n');
  return metadata;
}

async function writeSource(directory: string, file: string, source: string) {
  const path = join(directory, file);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, source);
}
