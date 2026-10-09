import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';

const origin = process.env.FRAMEWORK_ORIGIN ?? 'http://127.0.0.1:5288';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const state = {
  roomId: 'isolated-layout', phase: 'investigating', canConclude: false,
  chapter: { index: 1, goal: 'Establish what happened' }, players: [], npcs: [], objects: {}, deductions: ['established'],
  evidence: Array.from({ length: 47 }, (_, index) => ({ id: `record-${index}`, title: `Recorded account ${index + 1}`, kind: 'testimony', chapter: 1 })),
  questions: Array.from({ length: 5 }, (_, index) => ({ id: `question-${index}`, title: `Open question ${index + 1}`, question: 'Which of the recorded accounts explains the evidence?' })),
  connections: [{ id: 'established', title: 'Established comparison', explanation: 'The two records agree.', evidenceIds: ['record-0', 'record-1'] }],
};

try {
  await mkdir('.qa/case-map-layout', { recursive: true });
  await page.goto(origin);
  await expect(page.getByRole('button', { name: 'Play with a partner', exact: true })).toBeVisible();
  await page.evaluate(async state => {
    const dependency = name => performance.getEntriesByType('resource').find(entry => new URL(entry.name).pathname.endsWith(`/${name}.js`)).name;
    const { createElement: element } = (await import(dependency('react'))).default;
    const { createRoot } = (await import(dependency('react-dom_client'))).default;
    const { StoryProvider } = await import('/src/story/StoryProvider.tsx');
    const { CaseMap } = await import('/src/case-map/CaseMap.tsx');
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;inset:0;z-index:1000';
    document.body.append(container);
    window.boardActions = [];
    window.boardReads = [];
    const board = element(CaseMap, {
      state, pending: false, onAction: async action => { window.boardActions.push(action); return { ok: false, message: 'These records do not establish a finding.' }; },
      onExamine: evidence => window.boardReads.push(evidence.id), onReport() {}, onExplore() {},
      placesToggle: element('button', { className: 'board-places-toggle', 'aria-expanded': false }, 'Places to visit'),
    });
    createRoot(container).render(element(StoryProvider, null,
      element('div', { className: 'game-shell' },
        element('header', { className: 'topbar' }, 'WHITECHAPEL'),
        element('div', { className: 'workspace' }, element('main', { className: 'main-stage' }, board)),
        element('footer', { className: 'case-footer' }, 'Your discoveries are saved.'))));
  }, state);
  await expect(page.locator('.react-flow__node')).toHaveCount(47);
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }, { width: 320, height: 568 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const canvas = page.locator('.board-canvas');
    await expect.poll(async () => page.locator('.react-flow__node').evaluateAll(nodes => {
      const bounds = document.querySelector('.board-canvas').getBoundingClientRect();
      return nodes.every(node => { const box = node.getBoundingClientRect(); return box.left >= bounds.left && box.right <= bounds.right; });
    })).toBe(true);
    await expect(page.getByText('Questions to answer', { exact: false })).toBeInViewport();
    await expect(page.getByRole('heading', { name: 'Open question 1', exact: true })).toBeInViewport();
    await page.getByRole('heading', { name: 'Open question 5', exact: true }).scrollIntoViewIfNeeded();
    await expect(page.getByRole('heading', { name: 'Open question 5', exact: true })).toBeInViewport();
    await page.locator('.case-questions').evaluate(element => { element.scrollTop = 0; });
    await expect(page.getByRole('button', { name: 'Places to visit', exact: true })).toHaveAttribute('aria-expanded', 'false');
    assert.ok((await canvas.boundingBox()).height > 100, 'The board keeps usable scrolling space.');
    await canvas.evaluate(element => { element.scrollTop = element.scrollHeight; });
    await expect(page.locator('.react-flow__node').last()).toBeInViewport();
    await page.getByRole('button', { name: 'Read Recorded account 47', exact: true }).focus();
    await expect(page.getByRole('button', { name: 'Read Recorded account 47', exact: true })).toBeInViewport({ ratio: 1 });
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => window.boardReads.at(-1)), 'record-46');
    await canvas.evaluate(element => { element.scrollTop = 0; });
    await expect(page.locator('.react-flow__edge')).toHaveCount(1);
    await page.screenshot({ path: `.qa/case-map-layout/${viewport.width}x${viewport.height}.png` });
  }
  assert.deepEqual(errors, []);
  console.log('Case Map layout passed: 47 fixed papers, horizontal bounds, independently scrollable questions, last-row reading and saved threads at four viewport sizes.');
} catch (error) {
  await page.screenshot({ path: '.qa/case-map-layout/failure.png' }).catch(() => {});
  throw error;
} finally { await browser.close(); }
