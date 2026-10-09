import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';

const origin = process.env.FRAMEWORK_ORIGIN ?? 'http://127.0.0.1:5288';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const contexts = await Promise.all([browser.newContext(), browser.newContext()]);
const [page, partner] = await Promise.all(contexts.map(context => context.newPage()));
const errors = [];
for (const client of [page, partner]) client.on('pageerror', error => errors.push(error.message));
const dialog = page.getByRole('dialog', { name: 'Reset game?' });
const saved = () => page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));

try {
  await mkdir('.impeccable/review', { recursive: true });
  await page.goto(origin);
  await expect(page.getByRole('button', { name: 'Play with a partner', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /^(Reset|Restart) game$/ })).toHaveCount(0);
  await capture('reset-landing');
  await page.getByRole('button', { name: 'Play with a partner', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Choose your inspector' })).toBeVisible();
  const invitation = await page.locator('#lobby-invitation').inputValue();
  await partner.goto(invitation);
  await expect(partner.getByRole('button', { name: 'Join your partner', exact: true })).toBeVisible();
  await expect(partner.getByRole('button', { name: /^(Reset|Restart) game$/ })).toHaveCount(0);
  await partner.getByRole('button', { name: 'Join your partner', exact: true }).click();
  await expect(partner.getByRole('heading', { name: 'Choose your inspector' })).toBeVisible();
  const partnerData = await partner.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  await page.evaluate(() => {
    for (const [key, value] of Object.entries({
      'investigation.v2.old.1.last': 'old-room', 'investigation.volume.music': '0.8',
      'investigation.documents.view': 'original', 'investigation.controls-dismissed': 'true',
      'investigation.voice-mode': 'hold', 'investigation.fixture.1.reviewed.room.player': '["clue"]',
      'unrelated-app.session': 'keep',
    })) localStorage.setItem(key, value);
  });
  const before = await saved();
  const trigger = page.getByRole('button', { name: 'Reset game', exact: true });
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(trigger).toBeFocused();
  assert.deepEqual(await saved(), before);
  await trigger.click();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  assert.deepEqual(await saved(), before);

  await page.evaluate(() => {
    window.restoreStorageRemoval = Storage.prototype.removeItem;
    Storage.prototype.removeItem = () => { throw new Error('Storage blocked'); };
  });
  await trigger.click();
  await dialog.getByRole('button', { name: 'Clear data and restart', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('Browser data could not be cleared');
  assert.deepEqual(await saved(), before);
  await page.evaluate(() => { Storage.prototype.removeItem = window.restoreStorageRemoval; });
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await capture('reset-lobby');
  await trigger.click();
  await capture('reset-dialog');
  await dialog.getByRole('button', { name: 'Clear data and restart', exact: true }).click();
  await expect(page).toHaveURL(`${origin}/`);
  await expect(page.getByRole('button', { name: 'Play solo', exact: true })).toBeVisible();
  const after = await saved();
  assert.equal(after['unrelated-app.session'], 'keep');
  assert.equal(after['investigation.volume.music'], '0.3');
  assert.deepEqual(Object.keys(after).filter(key => key.startsWith('investigation.') && !key.startsWith('investigation.volume.')), []);
  await partner.reload();
  await expect(partner.getByRole('heading', { name: 'Choose your inspector' })).toBeVisible();
  assert.deepEqual(await partner.evaluate(() => Object.fromEntries(Object.entries(localStorage))), partnerData);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Play solo', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Play solo', exact: true }).click();
  assert.notEqual(new URL(page.url()).searchParams.get('case'), new URL(invitation).searchParams.get('case'));
  await page.getByRole('button', { name: /Inspector Reed Short/ }).click();
  await page.getByRole('button', { name: 'Begin the case', exact: true }).click();
  await page.getByRole('button', { name: 'Skip scene', exact: true }).click();
  await page.getByRole('button', { name: 'Begin the enquiry', exact: true }).click();
  await expect(page.locator('.case-footer').getByRole('button', { name: 'Reset game' })).toBeVisible();
  await capture('reset-game');

  await page.route('**/api/cases/**/socket', route => route.fulfill({ status: 503, json: { error: 'Test connection unavailable' } }));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Opening your case' })).toBeVisible();
  await page.getByRole('button', { name: 'Reset game', exact: true }).click();
  await dialog.getByRole('button', { name: 'Clear data and restart', exact: true }).click();
  await expect(page).toHaveURL(`${origin}/`);
  await expect(page.getByRole('button', { name: 'Play solo', exact: true })).toBeVisible();
  assert.deepEqual(errors, []);
  console.log('Reset passed: confirmation, Cancel/Escape, keyboard focus, blocked storage, scoped clearing, clean URL, reload, new case, partner preservation, disconnected recovery, desktop and mobile.');
} finally { await browser.close(); }

async function capture(name) {
  for (const [size, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(async () => { await document.fonts.ready; window.scrollTo(0, 0); });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: `.impeccable/review/${name}-${size}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
}
