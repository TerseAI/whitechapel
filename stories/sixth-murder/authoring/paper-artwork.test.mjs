import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { documents } from './documents.mjs';

const digest = value => createHash('sha256').update(value).digest('hex');

test('illustrated papers preserve reviewed text and registered production files', async () => {
  const provenance = JSON.parse(await readFile(new URL('paper-production.json', import.meta.url), 'utf8'));
  const assets = JSON.parse(await readFile(new URL('document-assets.json', import.meta.url), 'utf8'));
  for (const document of Object.values(documents)) for (const page of document.pages) {
    if (page.artwork.endsWith('-front')) continue;
    const record = provenance.artworks[page.artwork];
    assert.ok(record, `${page.artwork} needs reviewed illustrated artwork`);
    assert.equal(record.pageSha256, digest(JSON.stringify(page)), `${page.artwork}: canonical text changed; review original`);
    assert.equal(record.generator, 'built-in image_gen');
    assert.ok(record.prompt.length > 100);
    assert.equal(record.reviewed, true);
    assert.deepEqual([assets[page.artwork].width, assets[page.artwork].height], record.dimensions);
    const files = record.files ?? { png: `documents/${page.artwork}.png`, webp: `documents/${page.artwork}.webp` };
    assert.ok(Object.values(files).includes(assets[page.artwork].src), 'registered artwork must be a reviewed file');
    for (const [extension, path] of Object.entries(files)) {
      const bytes = await readFile(new URL(`../assets/${path}`, import.meta.url));
      assert.equal(digest(bytes), record[`${extension}Sha256`], `${page.artwork}.${extension}: artwork changed since review`);
    }
  }
});
