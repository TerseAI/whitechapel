import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';

const origin = process.env.FRAMEWORK_ORIGIN ?? 'http://127.0.0.1:5288';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage();
  await page.goto(origin);
  await expect(page.getByRole('button', { name: 'Play with a partner', exact: true })).toBeVisible();
  await page.evaluate(async () => {
    const dependency = name => performance.getEntriesByType('resource').find(entry => new URL(entry.name).pathname.endsWith(`/${name}.js`)).name;
    const { createElement: element } = (await import(dependency('react'))).default;
    const { createRoot } = (await import(dependency('react-dom_client'))).default;
    const { Interview } = await import('/src/interviews/Interview.tsx');
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;inset:0;z-index:1100;background:#15232b';
    document.body.append(container);
    const root = createRoot(container);
    window.finishedInterviews = 0;
    window.renderEnding = (status, terminal) => root.render(element(Interview, {
      npc: { id: 'ending', name: 'Ending witness', occupation: 'Witness', replies: [{ id: 'final', topicId: 'final', success: true, endsInterview: terminal, text: 'Yes. I killed her.' }], topics: [] },
      ownsConversation: true, pending: false, evidence: [],
      audio: { ready: true, exchange: { speech: { npcId: 'ending', id: 'final-speech', replyId: 'final' }, status, revealed: true, index: 0, line: { speakerId: 'ending', speakerName: 'Ending witness', text: 'Yes. I killed her.' } }, advance() {} },
      audioEnabled: false, onAudioEnabled() {}, onResume() {}, onClose() {}, onExamine() {}, onAction() {},
      onComplete() { window.finishedInterviews++; root.render(null); },
    }));
    window.renderEnding('reading', true);
  });
  await expect(page.getByText('Yes. I killed her.', { exact: true })).toBeVisible();
  assert.equal(await page.evaluate(() => window.finishedInterviews), 0, 'Do not open the report before the final subtitle is read.');
  await page.evaluate(() => window.renderEnding('complete', true));
  await expect.poll(() => page.evaluate(() => window.finishedInterviews)).toBe(1);
  await expect(page.getByRole('heading', { name: 'Ending witness', exact: true })).toHaveCount(0);
  await page.evaluate(() => window.renderEnding('complete', false));
  await expect(page.getByRole('heading', { name: 'Ending witness', exact: true })).toBeVisible();
  assert.equal(await page.evaluate(() => window.finishedInterviews), 1, 'A non-terminal answer keeps the interview open.');
  console.log('Verified final subtitle completion, interview exit, and non-terminal continuation.');
} finally { await browser.close(); }
