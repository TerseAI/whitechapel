import { sceneAction, closeSceneClients } from './scene-test-client.mjs';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
import { cluePosition, witnessPosition, pathToClue, pathToWitness } from '../shared/game/navigation.ts';

const origin = process.env.FRAMEWORK_ORIGIN ?? 'http://127.0.0.1:5288';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const story = await (await fetch(`${origin}/api/story`)).json();
let credentials;
const snapshot = () => request('');
const act = async action => {
  const result = action.type === 'move' ? await sceneAction(origin, credentials, await snapshot(), action) : await request('/actions', { requestId: crypto.randomUUID(), action });
  assert.equal(result.ok, true, result.message);
  return result;
};

try {
  await mkdir('.impeccable/review', { recursive: true });
  await page.goto(origin);
  await expect(page.getByRole('button', { name: 'Play solo', exact: true })).toBeVisible();
  await capture('');
  await page.getByRole('button', { name: 'Play solo', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Choose your inspector' })).toBeVisible();
  credentials = await page.evaluate(story => {
    const prefix = `investigation.v5.${story.id}.${story.version}.`;
    return JSON.parse(localStorage.getItem(prefix + localStorage.getItem(prefix + 'last')));
  }, story);
  assert.equal((await snapshot()).mode, 'solo');
  await expect(page.getByRole('button', { name: 'Copy invitation' })).toHaveCount(0);
  const join = await fetch(`${origin}/api/cases`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roomId: credentials.roomId }) });
  assert.equal(join.ok, false);
  assert.match((await join.json()).error, /single-player/);
  await expect(page.getByRole('button', { name: 'Begin the case' })).toBeDisabled();
  await page.getByRole('button', { name: /Inspector Ellis Very tall/ }).click();
  await expect(page.getByRole('button', { name: /Inspector Ellis Very tall/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.inspector-portrait canvas')).toHaveCount(2);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await capture('solo-lobby-');
  await page.getByRole('button', { name: 'Begin the case' }).click();
  await expect.poll(async () => (await snapshot()).phase).not.toBe('lobby');
  await page.reload();
  await expect.poll(async () => (await snapshot()).connected?.length).toBe(1);
  assert.equal((await snapshot()).mode, 'solo');
  if (story.id === 'framework-test') await completeFixture();
  else if (story.id === 'starter') {
    await act({ type: 'continueStage' });
    assert.equal((await snapshot()).phase, 'solved');
  } else {
    const briefing = page.getByRole('button', { name: 'Begin the enquiry', exact: true });
    if (await briefing.isVisible()) await briefing.click();
  }
  await expect(page.getByRole('button', { name: 'Invite your partner' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Volume controls' }).click();
  await expect(page.getByLabel('Partner volume')).toHaveCount(0);
  assert.deepEqual(errors, []);
  console.log(`Solo verified: ${story.id}, one detective, protected membership, reload, desktop and phone entry${story.id === 'framework-test' ? ', complete three-stage investigation' : ''}.`);
} catch (error) {
  await page.screenshot({ path: '.impeccable/review/solo-failure.png' }).catch(() => {});
  throw error;
} finally { closeSceneClients(); await browser.close(); }

async function completeFixture() {
  await expect(page.getByText('A short demonstration. This is not the new story.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect.poll(async () => (await snapshot()).cutscene?.index).toBe(1);
  await page.getByRole('button', { name: 'Skip scene', exact: true }).click();
  await page.getByRole('button', { name: 'Begin the enquiry', exact: true }).click();
  await page.getByRole('button', { name: 'Case map', exact: true }).click();
  await page.getByRole('button', { name: 'Retire for the evening', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Continue when you’re ready.');
  await capture('solo-report-');
  await page.getByRole('dialog').getByRole('button', { name: 'Retire for the evening', exact: true }).click();
  await page.getByRole('button', { name: 'Skip scene', exact: true }).click();
  await expect.poll(async () => (await snapshot()).chapter.index).toBe(1);
  assert.equal((await request('/actions', { requestId: crypto.randomUUID(), action: { type: 'finalReport', findings: ['together', 'six-places'] } })).ok, false);
  await act({ type: 'travel', location: 'preview-workshop' });
  await approach('witness');
  await act({ type: 'begin', npcId: 'curator' });
  await act({ type: 'ask', npcId: 'curator', topicId: 'record' });
  await act({ type: 'end', npcId: 'curator' });
  await act({ type: 'travel', location: 'preview-bedroom' });
  await approach('clue');
  await act({ type: 'examineObject', objectId: 'sample', stepId: 'surface' });
  await act({ type: 'examineObject', objectId: 'sample', stepId: 'turn' });
  await act({ type: 'travel', location: 'preview-mortuary' });
  await approach('clue');
  await act({ type: 'inspect', clueId: 'paper-record' });
  await act({ type: 'deduce', evidenceIds: ['specimen', 'account'], sequence: ['received', 'checked', 'recorded'] });
  assert.equal((await request('/actions', { requestId: crypto.randomUUID(), action: { type: 'finalReport', findings: ['alone'] } })).ok, false);
  await act({ type: 'finalReport', findings: ['together', 'six-places'] });
  await page.getByRole('button', { name: 'Skip scene', exact: true }).click();
  await expect.poll(async () => (await snapshot()).chapter.index).toBe(2);
  await act({ type: 'continueStage' });
  assert.equal((await snapshot()).phase, 'solved');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Case complete', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Return to your case map', exact: true }).click();
}

async function approach(kind) {
  const state = await snapshot(), player = state.players[0];
  const place = state.locations.find(place => place.id === player.location);
  const target = kind === 'witness' ? witnessPosition(state.npcs.find(npc => npc.location === place.id).id, place.navigation) : cluePosition(0, place.indoor, place.navigation, place.hotspots[0].id);
  const path = kind === 'witness' ? pathToWitness : pathToClue;
  for (const point of path(player.position, target, place.indoor, place.navigation)) await act({ type: 'move', ...point });
}

async function request(path, body) {
  const response = await fetch(`${origin}/api/cases/${credentials.roomId}${path}`, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', 'X-Player-Id': credentials.playerId, Authorization: `Bearer ${credentials.secret}` }, ...(body ? { body: JSON.stringify(body) } : {}) });
  assert.equal(response.ok, true, await response.clone().text());
  return response.json();
}

async function capture(prefix) {
  for (const [name, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(async () => { await document.fonts.ready; window.scrollTo(0, 0); });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: `.impeccable/review/${prefix}${name}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
}
