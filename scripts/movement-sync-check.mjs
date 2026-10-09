import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';

const origin = process.env.FRAMEWORK_ORIGIN ?? 'http://127.0.0.1:5288';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [];
const contexts = await Promise.all([browser.newContext(), browser.newContext()]);
const [one, two] = await Promise.all(contexts.map(context => context.newPage()));
for (const page of [one, two]) page.on('pageerror', error => errors.push(error.message));
const story = await (await fetch(`${origin}/api/story`)).json();
const credentials = page => page.evaluate(story => {
  const prefix = `investigation.v5.${story.id}.${story.version}.`;
  return JSON.parse(localStorage.getItem(prefix + localStorage.getItem(prefix + 'last')));
}, story);

async function pose(page, name) {
  return page.evaluate(async name => {
    const source = performance.getEntriesByType('resource').find(entry => new URL(entry.name).pathname.endsWith('/@react-three_fiber.js')).name;
    const { _roots } = await import(source);
    const scene = _roots.get(document.querySelector('.world-3d canvas')).store.getState().scene;
    const actor = scene.getObjectByName(`Investigator: ${name}`);
    return { x: actor.position.x, z: actor.position.z, heading: actor.rotation.y };
  }, name);
}

async function ready(page) {
  await expect(page.locator('.world-3d[data-ready=true] canvas')).toBeVisible({ timeout: 20000 });
}

async function sameFacing(page, observer, name, expected) {
  for (const client of [page, observer]) {
    await expect.poll(async () => {
      const current = await pose(client, name);
      return Math.abs(Math.atan2(Math.sin(current.heading - expected), Math.cos(current.heading - expected)));
    }, { message: `${name} must face ${expected} on both clients`, timeout: 5000 }).toBeLessThan(.01);
  }
}

try {
  assert.equal(story.id, 'starter', 'Run this check against the empty starter story.');
  await one.goto(origin);
  await one.getByRole('button', { name: 'Play with a partner', exact: true }).click();
  await one.getByRole('button', { name: /Inspector Reed Short/ }).click();
  await one.getByRole('button', { name: 'I’m ready' }).click();
  const first = await credentials(one);
  await two.goto(`${origin}/?case=${first.roomId}`);
  await two.getByRole('button', { name: 'Join your partner', exact: true }).click();
  await two.getByRole('button', { name: /Inspector Ellis Very tall/ }).click();
  await two.getByRole('button', { name: 'I’m ready' }).click();
  await Promise.all([ready(one), ready(two)]);
  for (const [page, observer, name] of [[one, two, 'Inspector Reed'], [two, one, 'Inspector Ellis']]) {
    await page.keyboard.down('s');
    await expect.poll(async () => (await pose(page, name)).z, { timeout: 15000 }).toBe(10);
    await page.keyboard.up('s');
    await sameFacing(page, observer, name, 0);
    await page.keyboard.down('d');
    await expect.poll(async () => (await pose(page, name)).x, { timeout: 15000 }).toBe(4.15);
    await page.keyboard.up('d');
    await sameFacing(page, observer, name, Math.PI / 2);
    const before = await pose(page, name);
    await page.keyboard.down('s');
    await sameFacing(page, observer, name, 0);
    await page.keyboard.up('s');
    const turned = await pose(page, name);
    assert.equal(turned.x, before.x);
    assert.equal(turned.z, before.z);
    await page.keyboard.down('d');
    await sameFacing(page, observer, name, Math.PI / 2);
    await page.keyboard.up('d');
    await page.reload(); await ready(page);
    await sameFacing(page, observer, name, Math.PI / 2);
    await page.getByRole('button', { name: 'Case map', exact: true }).click();
    await page.getByRole('button', { name: 'Explore', exact: true }).click();
    await ready(page);
    await sameFacing(page, observer, name, Math.PI / 2);
    await observer.reload(); await ready(observer);
    await sameFacing(page, observer, name, Math.PI / 2);
  }
  assert.deepEqual(errors, []);
  console.log('Movement synchronization passed for both detectives: walking, stationary turns, scene remounts and reconnects.');
} finally { await browser.close(); }
