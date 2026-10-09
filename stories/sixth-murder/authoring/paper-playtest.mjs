import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
import { documents } from './documents.mjs';
import { hasTranscription } from '../../../frontend/src/documents/document-presentation.ts';

const origin = process.env.GAME_ORIGIN ?? 'http://127.0.0.1:5388';
const story = await (await fetch(`${origin}/api/story`)).json();
assert.equal(story.id, 'sixth-murder');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [], reviewed = [];
await mkdir('.qa/papers', { recursive: true });
try {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await mountReader(page);
    for (const document of Object.values(documents)) {
      await page.evaluate(document => { localStorage.setItem('investigation.documents.view', 'transcription'); window.reviewPaper(document); }, document);
      await expect(page.getByRole('heading', { name: document.title, exact: true })).toBeVisible();
      for (const paper of document.pages) {
        if (document.presentation === 'photograph') {
          if (document.pages.indexOf(paper) === 1) await page.getByRole('button', { name: 'Turn over', exact: true }).click();
        } else if (document.pages.length > 1) await page.getByRole('button', { name: paper.label, exact: true }).click();
        await expect(page.locator('.document-original')).toHaveAttribute('src', `/story-assets/${story.id}/${story.version}/${story.assets[paper.artwork].src}`);
        if (hasTranscription(paper)) {
          if (await page.getByRole('button', { name: 'Read transcription', exact: true }).count()) await page.getByRole('button', { name: 'Read transcription', exact: true }).click();
          const transcription = page.getByRole('article', { name: 'Document transcription' });
          for (const paragraph of paper.paragraphs ?? []) await expect(transcription).toContainText(paragraph);
          if (paper.description) await expect(transcription).not.toContainText(paper.description);
          await page.screenshot({ path: `.qa/papers/${paper.artwork}-${viewport.width}-transcription.png` });
          await page.getByRole('button', { name: 'View original', exact: true }).click();
        } else {
          await expect(page.locator('.document-page.is-original')).toBeVisible();
          await expect(page.getByRole('article', { name: 'Document transcription' })).toHaveCount(0);
          await expect(page.getByRole('button', { name: 'Read transcription', exact: true })).toHaveCount(0);
        }
        if (paper.description) {
          await expect(page.getByText(paper.description, { exact: true })).not.toBeVisible();
          await page.getByText('Visual description', { exact: true }).click();
          await expect(page.getByText(paper.description, { exact: true })).toBeVisible();
          await page.getByText('Visual description', { exact: true }).click();
        }
        const img = page.locator('dialog.document-dialog .document-original');
        await img.evaluate(img => img.decode());
        const asset = story.assets[paper.artwork];
        assert.deepEqual(await img.evaluate(img => [img.naturalWidth, img.naturalHeight]), [asset.width, asset.height]);
        const bounds = await img.boundingBox();
        assert.ok(Math.abs(bounds.width / bounds.height - asset.width / asset.height) < .01, 'original preserves aspect ratio');
        await expect(img).toBeInViewport();
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        await page.screenshot({ path: `.qa/papers/${paper.artwork}-${viewport.width}-original.png` });
        await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
        await expect(page.getByRole('button', { name: 'Fit page', exact: true })).toHaveText('150%');
        await page.getByRole('button', { name: 'Fit page', exact: true }).click();
        reviewed.push({ artwork: paper.artwork, viewport });
      }
    }
    await mountReader(page);
    await page.evaluate(document => window.reviewPaper(document), documents.orders);
    await expect(page.getByRole('heading', { name: documents.orders.title, exact: true })).toBeVisible();
    await expect(page.locator('.document-page.is-original')).toBeVisible();
    await page.getByRole('button', { name: 'Read transcription', exact: true }).click();
    await page.evaluate(document => window.reviewPaper(document), documents['torn-wedding']);
    await expect(page.getByRole('heading', { name: documents['torn-wedding'].title, exact: true })).toBeVisible();
    await expect(page.locator('.document-page.is-original')).toBeVisible();
    await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
    await page.getByRole('button', { name: 'Turn over', exact: true }).click();
    await expect(page.getByRole('article', { name: 'Document transcription' })).toContainText('Our wedding');
    await page.getByRole('button', { name: 'View photograph', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Fit page', exact: true })).toHaveText('100%');
    await page.evaluate(document => window.reviewPaper(document), documents.orders);
    await expect(page.getByRole('heading', { name: documents.orders.title, exact: true })).toBeVisible();
    await expect(page.locator('.document-page.is-reading')).toBeVisible();
    await context.close();
  }
  assert.deepEqual(errors, []);
  await writeFile('.qa/papers/results.json', JSON.stringify({ reviewed, errors }, null, 2));
  console.log(`Verified ${reviewed.length} paper/viewport combinations: original dimensions, transcription, zoom, page changes and preference across visits.`);
} finally { await browser.close(); }

async function mountReader(page) {
  await page.goto(origin);
  await page.evaluate(async () => {
    const entry = await (await fetch('/src/main.tsx')).text();
    const react = entry.match(/from "([^"]+\/react\.js\?[^"]+)"/)[1];
    const client = entry.match(/from "([^"]+\/react-dom_client\.js\?[^"]+)"/)[1];
    const { createElement } = (await import(react)).default;
    const { createRoot } = (await import(client)).default;
    const { StoryProvider } = await import('/src/story/StoryProvider.tsx');
    const { StoryDocumentReader } = await import('/src/documents/StoryDocumentReader.tsx');
    const dialog = document.createElement('dialog');
    dialog.className = 'document-dialog';
    document.body.append(dialog);
    dialog.showModal();
    const root = createRoot(dialog);
    window.reviewPaper = document => root.render(createElement(StoryProvider, null,
      createElement(StoryDocumentReader, { key: document.id, document, onClose: () => dialog.close() })));
  });
}
