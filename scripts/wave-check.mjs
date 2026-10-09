import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const origin = process.env.FRAMEWORK_ORIGIN ?? 'http://127.0.0.1:5988';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const contexts = await Promise.all([browser.newContext({ viewport: {width:1440,height:1000} }), browser.newContext({viewport:{width:1100,height:850},reducedMotion:'reduce'})]);
const [one,two] = await Promise.all(contexts.map(c=>c.newPage()));
const frames = [[],[]], cases = [], errors = [];
for (const [index,page] of [one,two].entries()) {
  page.on('pageerror', error=>errors.push(error.message));
  page.on('websocket', socket=>socket.on('framereceived', frame=>{ try { const event=JSON.parse(String(frame.payload)); if(event.type==='scene') frames[index].push(event.state); if(event.type==='update') cases[index]=event.state; } catch {} }));
}
const storyResponse = await contexts[0].request.get(`${origin}/api/story`);
const story = await storyResponse.json();
const credentials = page=>page.evaluate(story=>{const p=`investigation.v5.${story.id}.${story.version}.`;return JSON.parse(localStorage.getItem(p+localStorage.getItem(p+'last')));},story);
const latest = (index,id)=>frames[index].at(-1)?.positions[id];
try {
  await mkdir('.qa/wave',{recursive:true});
  await one.goto(origin); await one.getByRole('button',{name:'Play with a partner',exact:true}).click();
  await one.getByRole('button',{name:/Inspector Reed Short/}).click();
  const first=await credentials(one);
  await two.goto(`${origin}/?case=${first.roomId}`); await two.getByRole('button',{name:'Join your partner',exact:true}).click();
  await two.getByRole('button',{name:/Inspector Ellis Very tall/}).click();
  await one.getByRole('button',{name:'I’m ready'}).click(); await two.getByRole('button',{name:'I’m ready'}).click();
  if (story.id === 'framework-test') {
    await one.getByRole('button',{name:'Skip scene together'}).click(); await two.getByRole('button',{name:'Skip scene together'}).click();
  }
  for(const page of [one,two]) await page.getByRole('button',{name:'Begin the enquiry',exact:true}).click();
  for(const page of [one,two]) await page.getByRole('button',{name:'Explore',exact:true}).click();
  for(const page of [one,two]) await expect(page.locator('.world-3d[data-ready=true] canvas')).toBeVisible({timeout:20000});
  const visit = cases[0].players.find(player=>player.id===first.playerId).positionEpoch;
  for (const index of [0,1]) await expect.poll(()=>latest(index,first.playerId)?.visit,{timeout:15000}).toBe(visit);
  await one.getByRole('button',{name:/^Wave/}).click();
  await expect.poll(()=>latest(1,first.playerId)?.gesture?.kind).toBe('wave');
  const waved=latest(1,first.playerId);
  assert.equal(waved.motion.moving,false);
  assert.ok(Math.abs(waved.gesture.heading)<Math.PI/2,'the waving inspector faces the screen');
  await one.waitForTimeout(350);
  await one.screenshot({path:'.qa/wave/desktop.png'});
  await two.screenshot({path:'.qa/wave/partner.png'});
  await one.keyboard.down('ArrowRight'); await one.waitForTimeout(250); await one.keyboard.up('ArrowRight');
  await expect.poll(()=>latest(1,first.playerId)?.gesture).toBeNull();
  await one.keyboard.press('g');
  await expect.poll(()=>latest(1,first.playerId)?.gesture?.kind).toBe('wave');
  await one.waitForTimeout(1900);
  await two.keyboard.press('g');
  await two.waitForTimeout(350);
  await two.screenshot({path:'.qa/wave/reduced-motion.png'});
  await one.setViewportSize({width:390,height:844});
  await one.getByRole('button',{name:/^Wave/}).click(); await one.waitForTimeout(350);
  await one.screenshot({path:'.qa/wave/mobile.png'});
  assert.ok(await one.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await one.waitForTimeout(1800); await one.reload();
  await expect(one.locator('.world-3d[data-ready=true] canvas')).toBeVisible({timeout:20000});
  assert.deepEqual(errors,[]);
  console.log('Wave verified in two browsers: camera facing, shared gesture, button, G shortcut, immediate movement cancellation, reduced motion, mobile layout and reload.');
} finally { await browser.close(); }
