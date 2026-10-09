import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

test('development reload watches server and story edits and keeps preview storage', { timeout: 30_000 }, async () => {
  const directory = await mkdtemp(join(tmpdir(), 'whitechapel-reload-test-'));
  const story = join(directory, 'story.json');
  for (const path of ['scripts', 'backend/src', 'shared', 'assets']) await mkdir(join(directory, path), { recursive: true });
  await writeFile(story, '{}');
  await writeFile(join(directory, 'backend/src/example.ts'), 'export const value = 1;');
  await writeFile(join(directory, 'shared/example.ts'), 'export const value = 1;');
  await writeFile(join(directory, 'assets/example.svg'), '<svg/>');
  await writeFile(join(directory, 'scripts/framework-preview.mjs'), `
    import { appendFileSync } from 'node:fs';
    appendFileSync('starts.jsonl', JSON.stringify({ storage: process.env.FRAMEWORK_DATA_DIR, story: process.env.STORY_PATH }) + '\\n');
    setInterval(() => {}, 1000);
    process.on('SIGTERM', () => process.exit(0));
  `);
  const env: NodeJS.ProcessEnv = { ...process.env, STORY_PATH: story };
  delete env.FRAMEWORK_DATA_DIR;
  const child = spawn(process.execPath, [fileURLToPath(new URL('../scripts/watch-dev.mjs', import.meta.url)), '--framework'], { cwd: directory, env, stdio: ['pipe', 'pipe', 'pipe'] });
  let output = '';
  for (const stream of [child.stdout, child.stderr]) stream.on('data', data => { output += data; });
  const starts = async () => (await readFile(join(directory, 'starts.jsonl'), 'utf8').catch(() => '')).trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
  const waitForStart = async (count: number) => {
    for (let attempt = 0; attempt < 100; attempt++) {
      if ((await starts()).length >= count) return;
      assert.equal(child.exitCode, null, output);
      await delay(100);
    }
    assert.fail(`Development server did not restart: ${output}`);
  };
  try {
    await waitForStart(1);
    await writeFile(join(directory, 'backend/src/example.ts'), 'export const value = 2;');
    await waitForStart(2);
    await writeFile(join(directory, 'shared/example.ts'), 'export const value = 2;');
    await waitForStart(3);
    await writeFile(story, '{"title":"Updated story"}');
    await waitForStart(4);
    await writeFile(join(directory, 'assets/example.svg'), '<svg><rect/></svg>');
    await waitForStart(5);
    child.stdin.write('\n');
    await waitForStart(6);
    const runs = await starts();
    assert.ok(runs[0].storage, 'The preview gets a state directory before watch mode starts.');
    assert.ok(runs.every(run => run.storage === runs[0].storage && run.story === story));
  } finally {
    if (child.exitCode === null) { child.kill('SIGTERM'); await once(child, 'exit'); }
    const runs = await starts();
    if (runs[0]?.storage) await rm(runs[0].storage, { recursive: true, force: true });
    await rm(directory, { recursive: true, force: true });
  }
});
