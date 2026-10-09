import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
import { cluePosition } from '../../../shared/game/navigation.ts';
const story = JSON.parse(await readFile('stories/sixth-murder/story.json', 'utf8'));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
await mkdir('.qa/objects', { recursive: true });
const errors = [];
try {
 for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
  const page = await browser.newPage({ viewport, isMobile: viewport.width === 390, hasTouch: viewport.width === 390 });
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(process.env.GAME_ORIGIN ?? 'http://127.0.0.1:5388');
  await page.evaluate(async () => {
    const entry = await (await fetch('/src/main.tsx')).text();
    const react = entry.match(/from "([^"]+\/react\.js\?[^"]+)"/)[1];
    const client = entry.match(/from "([^"]+\/react-dom_client\.js\?[^"]+)"/)[1];
    const { createElement } = (await import(react)).default;
    const { createRoot } = (await import(client)).default;
    const { StoryProvider } = await import('/src/story/StoryProvider.tsx');
    const { ObjectInspector } = await import('/src/objects/ObjectInspector.tsx');
    const dialog = document.createElement('dialog'); dialog.className = 'object-dialog'; document.body.append(dialog); dialog.showModal();
    const root = createRoot(dialog);
    window.reviewObject = state => {
      const objectId = Object.keys(state.objects)[0];
      const render = () => root.render(createElement(StoryProvider, null, createElement(ObjectInspector, { key: objectId, objectId, state, playerId: 'one', onClose() {}, onEvidence() {}, onCaseMap() {}, onAction: async action => {
        state = { ...state, inspections: { [objectId]: [...new Set([...(state.inspections[objectId] ?? []), action.stepId])] } };
        state.evidence = state.objects[objectId].evidence.filter(reward => reward.steps.every(id => state.inspections[objectId].includes(id))).map(reward => ({ id: reward.id, title: reward.id }));
        render(); return { ok: true, observed: state.inspections[objectId] };
      } })));
      render();
    };
  });
  await page.addStyleTag({ content: await readFile('frontend/src/objects/objects.css', 'utf8') });
  for (const object of Object.values(story.objects).filter(object => !process.env.OBJECT_ID || object.id === process.env.OBJECT_ID)) {
    const chapterIndex = object.evidence[0].chapter;
    const locations = story.chapters[chapterIndex].locations;
    const place = locations.find(p => p.siteId === object.siteId && p.hotspots.some(h => object.hotspots.includes(h.id)));
    const index = place.hotspots.findIndex(h => object.hotspots.includes(h.id));
    const position = cluePosition(index, place.indoor, place.navigation, place.hotspots[index].id);
    await page.evaluate(state => window.reviewObject(state), { objects: { [object.id]: object }, chapter: { index: chapterIndex }, phase: 'investigating', evidence: [], deductions: [], inspections: {}, locations, connected: ['one', 'two'], players: ['one', 'two'].map(id => ({ id, location: place.id, position })) });
    await expect(page.locator('[data-object-ready=true]')).toBeVisible();
    await page.screenshot({ path: `.qa/objects/${object.id}-${viewport.width}-initial.png` });
    for (const step of object.steps) {
      const button = page.getByRole('button', { name: step.label, exact: true });
      console.log(viewport.width, object.id, step.id);
      if (!await button.count()) await page.getByRole('button', { name: 'Continue inspection', exact: true }).click();
      await expect(button).toBeEnabled();
      await button.click();
      await expect(page.locator('[data-object-ready=true]')).toBeVisible();
    }
    await page.screenshot({ path: `.qa/objects/${object.id}-${viewport.width}-final.png` });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await expect(page.getByRole('button', { name: 'Put down', exact: true })).toBeInViewport();
  }
  await page.close();
 }
 assert.deepEqual(errors, []);
 console.log('Selected objects inspected at desktop, phone and landscape sizes.');
} finally { await browser.close(); }
