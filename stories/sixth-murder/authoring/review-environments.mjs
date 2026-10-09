import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { chromium } from '@playwright/test';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const output = fileURLToPath(new URL('review/', import.meta.url));
const fragment = JSON.parse(await readFile(new URL('scenes.json', import.meta.url), 'utf8'));
const scenes = Object.keys(fragment.locations);
await mkdir(output, { recursive: true });
const server = createServer(async (request, response) => {
  const path = resolve(root, `.${new URL(request.url, 'http://localhost').pathname}`);
  if (!path.startsWith(root)) { response.writeHead(403).end(); return; }
  try {
    const data = await readFile(path);
    response.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.glb': 'model/gltf-binary', '.png': 'image/png' })[extname(path)] ?? 'application/octet-stream');
    response.end(data);
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(5488, '127.0.0.1', resolve));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const scene of scenes) {
    await page.goto(`http://127.0.0.1:5488/stories/sixth-murder/authoring/environment-preview.html?scene=${scene}`);
    await page.waitForFunction(() => window.previewReady === true);
    await page.screenshot({ path: `${output}/${scene}.png` });
  }
  await page.setViewportSize({ width: 1600, height: 1000 });
  for (const [view, scene] of [['service-route', 'lantern-yard'], ['window-view', 'baines-room']]) {
    await page.goto(`http://127.0.0.1:5488/stories/sixth-murder/authoring/environment-preview.html?scene=${scene}&view=${view}`);
    await page.waitForFunction(() => window.previewReady === true);
    await page.screenshot({ path: `${output}/${view}.png` });
    execFileSync('magick', [`${output}/${view}.png`, '-quality', '94', resolve(root, `stories/sixth-murder/assets/art/${view}.webp`)]);
  }
  await page.setViewportSize({ width: 1600, height: 1200 });
  for (const view of ['hearth-clasp-v2', 'fragment-detail-v2', 'fragment-found-v2']) {
    await page.goto(`http://127.0.0.1:5488/stories/sixth-murder/authoring/fracture-preview.html?view=${view}`);
    await page.waitForFunction(() => window.previewReady === true);
    await page.screenshot({ path: `${output}/${view}.png` });
    execFileSync('magick', [`${output}/${view}.png`, '-quality', '94', resolve(root, `stories/sixth-murder/assets/art/${view}.webp`)]);
  }
  if (errors.length) throw new Error(errors.join('\n'));
  await page.setViewportSize({ width: 1600, height: 1160 });
  await page.setContent(`<style>body{margin:0;background:#151c19;display:grid;grid-template-columns:1fr 1fr}figure{margin:8px}img{width:100%;display:block}figcaption{color:#ddcfb0;font:15px Georgia;padding:7px}</style>${scenes.map(id => `<figure><img src="http://127.0.0.1:5488/stories/sixth-murder/authoring/review/${id}.png"><figcaption>${id}</figcaption></figure>`).join('')}`);
  await page.evaluate(async () => Promise.all([...document.images].map(image => image.decode())));
  await page.screenshot({ path: `${output}/contact-sheet.png`, fullPage: true });
  await writeFile(`${output}/checks.json`, `${JSON.stringify({ scenes, consoleErrors: errors, viewport: [1440, 1000], checked: new Date().toISOString() }, null, 2)}\n`);
  process.stdout.write(`Reviewed ${scenes.length} models; ${output}/contact-sheet.png\n`);
} finally {
  await browser.close();
  server.close();
}
