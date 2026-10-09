import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';

const origin = process.env.FRAMEWORK_ORIGIN ?? 'http://127.0.0.1:5288';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [];
const contexts = await Promise.all([browser.newContext(), browser.newContext({ reducedMotion: 'reduce' })]);
const [one, two] = await Promise.all(contexts.map(context => context.newPage()));
for (const page of [one, two]) page.on('pageerror', error => errors.push(error.message));
const sizes = [{ width: 1440, height: 900 }, { width: 768, height: 1024 }, { width: 390, height: 844 }, { width: 320, height: 568 }];
const ownStatus = one.locator('.lobby-member').first();
const partnerStatus = one.locator('.lobby-member').last();

try {
  await mkdir('.qa/lobby', { recursive: true });
  await one.goto(origin);
  await expect(one.locator('.welcome-premise')).toHaveText('Mystery game based in Victorian London.');
  await expect(one.locator('.welcome-bottom')).toHaveCount(0);
  for (const size of sizes) {
    await one.setViewportSize(size);
    const text = await one.locator('.welcome-premise').boundingBox();
    const button = await one.getByRole('button', { name: 'Play with a partner', exact: true }).boundingBox();
    assert.ok(button.y - text.y - text.height >= 36, 'The main action has breathing room.');
    assert.ok(await one.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await one.screenshot({ path: `.qa/lobby/entrance-${size.width}.png`, fullPage: true });
  }
  await one.setViewportSize(sizes[0]);
  await one.getByRole('button', { name: 'Play with a partner', exact: true }).click();
  await expect(partnerStatus).toContainText('Not joined');
  await expect(one.getByRole('button', { name: 'I’m ready', exact: true })).toBeDisabled();
  await expect(one.locator('#lobby-ready-help')).toHaveText('Choose an inspector to get ready.');
  for (const size of sizes) {
    await one.setViewportSize(size);
    assert.ok(await one.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await one.screenshot({ path: `.qa/lobby/invitation-${size.width}.png`, fullPage: true });
  }
  await one.setViewportSize(sizes[0]);
  const copy = one.getByRole('button', { name: 'Copy invitation', exact: true });
  const hitArea = await copy.boundingBox();
  assert.ok(hitArea.width >= 44 && hitArea.height >= 44);
  await one.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.copiedInvitation = text; } } }));
  await copy.click();
  const invitation = await one.locator('#lobby-invitation').inputValue();
  assert.equal(await one.evaluate(() => window.copiedInvitation), invitation);
  await expect(one.locator('.lobby-copy-feedback')).toContainText('Invitation copied');
  await one.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined }));
  await copy.click();
  await expect(one.locator('.lobby-copy-feedback')).toHaveText('Select and copy the invitation link.');
  assert.equal(await one.locator('#lobby-invitation').evaluate(input => input.selectionEnd - input.selectionStart), invitation.length);
  const reed = one.getByRole('button', { name: /Inspector Reed Short/ });
  await reed.focus();
  await one.keyboard.press('Enter');
  await expect(reed).toHaveAttribute('aria-pressed', 'true');
  await expect(one.getByRole('button', { name: 'I’m ready', exact: true })).toBeEnabled();
  await one.getByRole('button', { name: 'I’m ready', exact: true }).click();
  await expect(one.getByRole('button', { name: 'Cancel ready', exact: true })).toBeEnabled();
  await expect(ownStatus).toContainText('Ready');
  await one.getByRole('button', { name: 'Cancel ready', exact: true }).click();
  await expect(ownStatus).toContainText('Not ready');

  await two.goto(invitation);
  await two.getByRole('button', { name: 'Join your partner', exact: true }).click();
  await expect(partnerStatus).toContainText('Choosing an inspector');
  await expect(one.locator('.lobby-invitation')).not.toHaveAttribute('open', '');
  await expect(two.getByRole('button', { name: /Inspector Reed Short/ })).toBeDisabled();
  await two.getByRole('button', { name: /Inspector Ellis Very tall/ }).click();
  await expect(partnerStatus).toContainText('Inspector Ellis');
  await expect(partnerStatus).toContainText('Not ready');
  for (const size of sizes) {
    await one.setViewportSize(size);
    assert.ok(await one.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    const cards = await one.locator('.inspector-card').evaluateAll(elements => elements.map(element => {
      const style = getComputedStyle(element);
      return { fill: style.backgroundColor, shadow: style.boxShadow, opacity: style.opacity };
    }));
    assert.ok(cards.every(card => card.fill === 'rgb(17, 29, 35)' && card.shadow === 'none' && card.opacity === '1'));
    await one.screenshot({ path: `.qa/lobby/inspectors-${size.width}.png`, fullPage: true });
  }
  await two.getByRole('button', { name: 'I’m ready', exact: true }).click();
  await expect(partnerStatus.locator('dd')).toHaveText('Ready');
  await two.goto('about:blank');
  await expect(partnerStatus).toContainText('Reconnecting');
  await two.goto(invitation);
  await expect(partnerStatus.locator('dd')).toHaveText('Not ready');
  await two.getByRole('button', { name: 'I’m ready', exact: true }).click();
  await one.getByRole('button', { name: 'I’m ready', exact: true }).click();
  for (const page of [one, two]) await expect(page.locator('.lobby')).toHaveCount(0, { timeout: 20000 });
  assert.deepEqual(errors, []);
  console.log('Lobby passed: entrance layout, keyboard selection, copy/fallback, partner arrival, readiness/cancellation, reconnect, legible states and joint start.');
} finally { await browser.close(); }
