import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

test('the story registers only images and models used by its game content', async () => {
  const { assets, models, voices, ...content } = JSON.parse(await readFile(new URL('../story.json', import.meta.url), 'utf8'));
  const references = new Set();
  const visit = value => {
    if (typeof value === 'string') references.add(value);
    else if (value && typeof value === 'object') Object.values(value).forEach(visit);
  };
  visit(content);
  for (const id of [...Object.keys(assets), ...Object.keys(models)]) {
    assert.ok(references.has(id), `${id}: unused registered media`);
  }
});

test('the image catalogue retains the reviewed production files and dimensions', async () => {
  const { assets } = JSON.parse(await readFile(new URL('assets.json', import.meta.url), 'utf8'));
  const production = JSON.parse(await readFile(new URL('media-production.json', import.meta.url), 'utf8'));
  for (const record of production.assets) {
    const asset = assets[record.id];
    assert.ok(asset, `${record.id}: reviewed image missing from catalogue`);
    assert.equal(asset.src, record.src, `${record.id}: reviewed image replaced`);
    assert.deepEqual([asset.width, asset.height], [record.width, record.height]);
    const bytes = await readFile(new URL(`../assets/${asset.src}`, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), record.sha256);
  }
});
