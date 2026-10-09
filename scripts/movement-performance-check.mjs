import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';

const origin = process.env.FRAMEWORK_ORIGIN ?? 'http://127.0.0.1:5288';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));

try {
  await page.addInitScript(() => {
    const renderers = new Map();
    window.movementProfile = { commits: 0, frames: [], collecting: false };
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      supportsFiber: true,
      renderers,
      inject(renderer) { const id = renderers.size + 1; renderers.set(id, renderer); return id; },
      onCommitFiberRoot(id) {
        if (window.movementProfile.collecting && renderers.get(id)?.rendererPackageName === '@react-three/fiber') window.movementProfile.commits++;
      },
      onCommitFiberUnmount() {},
    };
    let previous;
    const frame = now => {
      if (window.movementProfile.collecting && previous !== undefined) window.movementProfile.frames.push(now - previous);
      previous = now;
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
  await page.goto(origin);
  await page.getByRole('button', { name: 'Play solo', exact: true }).click();
  await page.getByRole('button', { name: /Inspector Reed Short/ }).click();
  await page.getByRole('button', { name: 'Begin the case', exact: true }).click();
  await expect(page.locator('.world-3d[data-ready=true] canvas')).toBeVisible({ timeout: 20000 });
  await page.waitForTimeout(1000);
  await page.evaluate(() => { window.movementProfile.collecting = true; });
  for (const key of ['w', 'd', 's', 'a']) {
    await page.keyboard.down(key);
    await page.waitForTimeout(1000);
    await page.keyboard.up(key);
  }
  const profile = await page.evaluate(() => { window.movementProfile.collecting = false; return window.movementProfile; });
  const frames = [...profile.frames].sort((a, b) => a - b);
  console.log(JSON.stringify({ sceneCommits: profile.commits, frames: frames.length, frameP95Ms: frames[Math.floor(frames.length * .95)] }));
  assert.ok(profile.commits > 0, 'the React profiler must observe movement updates');
  assert.ok(profile.commits < frames.length * .75, 'walking must not schedule a React scene commit every animation frame');
  assert.deepEqual(errors, []);
} catch (error) {
  console.error(errors, await page.locator('body').innerText());
  throw error;
} finally { await browser.close(); }
