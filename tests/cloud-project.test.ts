import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, readdir, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { prepareCloudProject } from '../scripts/cloud-project';

test('the deployment package contains selected story artwork and executable actors', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'whitechapel-cloud-test-'));
  try {
    const output = join(directory, 'project');
    const result = await prepareCloudProject(output, 'tests/fixtures/framework/story.json');
    assert.equal(result.storyId, 'framework-test');
    assert.deepEqual((await readdir(output)).sort(), ['backend', 'package-lock.json', 'package.json', 'shared', 'src', 'stories', 'tsconfig.json', 'whitechapel.json']);
    assert.match(await readFile(join(output, 'backend/src/active-story.ts'), 'utf8'), /"id":"framework-test"/);
    assert.equal(await readFile(join(output, 'stories/selected/assets/page-one.svg'), 'utf8'), await readFile('tests/fixtures/framework/assets/page-one.svg', 'utf8'));
    const dependencies = JSON.parse(await readFile(join(output, 'package.json'), 'utf8')).dependencies;
    assert.equal(dependencies['terse-sdk'], '0.9.15');
    assert.equal(dependencies['durable-actors'], '0.7.16');
    for (const name of ['react', 'three', 'express', '@ricky0123/vad-web', 'jose']) {
      assert.equal(dependencies[name], undefined, `${name} belongs to the website or gateway, not the actor deployment`);
    }
    for (const name of ['openai', '@fal-ai/client', '@typesafe-ai/sdk', 'music-metadata']) assert.ok(dependencies[name], `${name} runs inside ConversationActor`);
    const lock = JSON.parse(await readFile(join(output, 'package-lock.json'), 'utf8'));
    for (const name of ['three', 'express', 'accepts']) assert.equal(lock.packages[`node_modules/${name}`], undefined, `${name} must also be absent from the actor lockfile`);
    assert.equal(JSON.parse(await readFile(join(output, 'package.json'), 'utf8')).dependencies['little-actors'], undefined);
    await assertStandaloneActors(output, directory);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

async function assertStandaloneActors(project: string, directory: string) {
  const compiler = import.meta.resolve('durable-actors/compiler');
  const build = fileURLToPath(new URL('./deployment-build.js', compiler));
  const validate = fileURLToPath(new URL('../host/validate-artifact.js', compiler));
  const artifact = join(directory, 'deployment');
  await mkdir(artifact);
  await symlink(resolve('node_modules'), join(directory, 'node_modules'), 'dir');
  const exec = promisify(execFile);
  await exec(process.execPath, [build, project, 'src/actor.ts', artifact], { maxBuffer: 8 * 1024 * 1024 });
  await rm(project, { recursive: true });
  await exec(process.execPath, [validate, join(artifact, 'actors.mjs')], { cwd: directory, timeout: 30_000 });
}
