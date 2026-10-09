import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile, mkdtemp, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium, expect } from '@playwright/test';

const origin = process.env.AI_ORIGIN ?? 'http://127.0.0.1:5388';
const directory = '.qa/intelligence';
const sampleDirectory = await mkdtemp(join(tmpdir(), 'whitechapel-mic-'));
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const contexts = await Promise.all([browser.newContext({ viewport: { width: 1440, height: 1000 } }), browser.newContext()]);
const pages = await Promise.all(contexts.map(context => context.newPage()));
const errors = [];
const questions = new Map();
const replies = new Map();
for (const page of pages) page.on('websocket', socket => {
  socket.on('framesent', ({ payload }) => {
    try { const command = JSON.parse(String(payload)); if (command.action?.type === 'question') questions.set(command.requestId, command); } catch {}
  });
  socket.on('framereceived', ({ payload }) => {
    try { const event = JSON.parse(String(payload)); if (event.type === 'result' && questions.has(event.requestId)) replies.set(event.requestId, event.result); } catch {}
  });
});
async function nextReply(after) {
  await expect.poll(() => [...questions.keys()].some(id => !after.has(id) && replies.has(id)), { timeout: 360000 }).toBe(true);
  const id = [...questions.keys()].find(id => !after.has(id) && replies.has(id));
  return { command: questions.get(id), result: replies.get(id) };
}
for (const page of pages) page.on('pageerror', error => errors.push(error.message));
const story = await (await fetch(`${origin}/api/story`)).json();
assert.equal(story.id, 'sixth-murder');
assert.equal('characters' in story, false);
const credentials = page => page.evaluate(story => {
  const prefix = `investigation.v5.${story.id}.${story.version}.`;
  return JSON.parse(localStorage.getItem(prefix + localStorage.getItem(prefix + 'last')));
}, story);
async function request(player, body) {
  const response = await fetch(`${origin}/api/cases/${player.roomId}${body ? '/actions' : ''}`, {
    method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', 'X-Player-Id': player.playerId, Authorization: `Bearer ${player.secret}` },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  assert.equal(response.ok, true, `HTTP ${response.status}`);
  return response.json();
}
async function listeningAfterVoice(page) {
  const listening = page.locator('.microphone-status[data-status=listening]');
  await expect(listening).toBeVisible({ timeout: 60000 });
  return page.evaluate(() => Math.round(window.__listeningAt - window.__voiceEndedAt));
}
function synthesize(name, text) {
  const sample = join(sampleDirectory, `${name}.wav`);
  execFileSync('/usr/bin/say', ['-v', 'Samantha', '-o', join(sampleDirectory, `${name}.aiff`), text]);
  execFileSync('/usr/bin/afconvert', ['-f', 'WAVE', '-d', 'LEI16@16000', join(sampleDirectory, `${name}.aiff`), sample]);
  return sample;
}
try {
  const [one, two] = pages;
  const samples = [process.env.MIC_TEST_WAV ?? synthesize('greeting', "Hey, what's up? My name is Rowan."), synthesize('memory', 'What name did I just tell you?')];
  const waves = await Promise.all(samples.map(sample => readFile(sample)));
  await one.route('**/qa-microphone-*.wav', route => route.fulfill({ body: waves[Number(route.request().url().match(/-(\d+)\.wav$/)[1])], contentType: 'audio/wav' }));
  await one.addInitScript(() => {
    window.__heard = [];
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      this.addEventListener('playing', () => window.__heard.push(this.currentSrc), { once: true });
      if (!this.__timed) this.addEventListener('ended', () => { if (/^https:\/\/(?:[a-z0-9-]+\.)*fal\.media\//i.test(this.currentSrc)) window.__voiceEndedAt = performance.now(); });
      this.__timed = true;
      return play.call(this);
    };
    new MutationObserver(() => {
      const listening = !!document.querySelector('.microphone-status[data-status=listening]');
      if (listening && !window.__listening) window.__listeningAt = performance.now();
      window.__listening = listening;
    }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-status'] });
    navigator.mediaDevices.getUserMedia = async () => {
      const context = new AudioContext();
      await context.resume();
      const destination = context.createMediaStreamDestination();
      window.__microphoneStream = destination.stream;
      window.__speak = async (index = 0) => {
        const buffer = await context.decodeAudioData(await (await fetch(`/qa-microphone-${index}.wav`)).arrayBuffer());
        const source = context.createBufferSource();
        source.buffer = buffer; source.connect(destination); source.start();
        await new Promise(resolve => source.onended = resolve);
      };
      return destination.stream;
    };
  });
  await one.goto(origin);
  await one.getByRole('button', { name: 'Play with a partner', exact: true }).click();
  await expect(one.getByRole('heading', { name: 'Choose your inspector' })).toBeVisible();
  const first = await credentials(one);
  await two.goto(`${origin}/?case=${first.roomId}`);
  await two.getByRole('button', { name: 'Join your partner', exact: true }).click();
  await expect(two.getByRole('heading', { name: 'Choose your inspector' })).toBeVisible();
  const second = await credentials(two);
  await one.getByRole('button', { name: /Inspector Reed Short/ }).click();
  await two.getByRole('button', { name: /Inspector Ellis Very tall/ }).click();
  for (const page of pages) await page.getByRole('button', { name: 'I’m ready', exact: true }).click();
  for (const page of pages) await page.getByRole('button', { name: 'Begin the enquiry', exact: true }).click();
  await one.getByRole('button', { name: /^Mrs Baines/ }).click();
  await one.getByRole('button', { name: 'Or speak in your own words', exact: true }).click();
  await expect(one.getByRole('button', { name: 'Start talking', exact: true })).toBeEnabled({ timeout: 15000 });
  assert.equal(await one.locator('.cinematic-conversation textarea').count(), 0);
  assert.ok(await one.locator('.authored-topics .interview-options').count() > 0);
  await one.setViewportSize({ width: 390, height: 844 });
  await expect(one.getByRole('button', { name: 'Start talking', exact: true })).toBeInViewport();
  assert.ok(await one.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await one.screenshot({ path: `${directory}/microphone-mobile.png` });
  await one.setViewportSize({ width: 1440, height: 1000 });
  await one.getByRole('button', { name: 'Start talking', exact: true }).click();
  await expect(one.locator('.microphone-status[data-status=listening]')).toBeVisible({ timeout: 25000 });
  console.log('Microphone listening; pausing after speech transcribes through fal.');
  const response = nextReply(new Set(questions.keys()));
  await one.evaluate(() => window.__speak());
  const { command, result } = await response;
  assert.equal(result.ok, true, result.message);
  const reply = result.reply;
  assert.match(reply.question, /Rowan/i);
  assert.equal(reply.topicId, 'conversation');
  assert.equal(reply.reward, undefined);
  assert.equal(reply.spoken, true);
  assert.equal(result.speech.lines.length, 1);
  assert.equal(reply.recordings.length, 1);
  assert.ok(reply.recordings.every(Boolean));
  console.log('Stage timings (ms):', JSON.stringify(reply.performance.timings));
  await expect.poll(() => one.evaluate(() => window.__heard.some(url => /^https:\/\/(?:[a-z0-9-]+\.)*fal\.media\//i.test(url)))).toBe(true);
  await expect(one.locator('.interview-subtitle')).toHaveCount(1);
  await one.screenshot({ path: `${directory}/live-conversation.png` });
  assert.deepEqual((await request(first, command)).reply, reply);
  console.log('Spoken greeting answered:', reply.text);
  const resumedAfterMs = await listeningAfterVoice(one);
  assert.ok(resumedAfterMs >= 0 && resumedAfterMs < 1000, `Listening resumed ${resumedAfterMs}ms after the reply ended`);
  const spokenFollowup = nextReply(new Set(questions.keys()));
  await one.evaluate(() => window.__speak(1));
  const { result: followup } = await spokenFollowup;
  assert.equal(followup.ok, true, followup.message);
  assert.match(followup.reply.question, /name/i);
  assert.match(followup.reply.text, /Rowan/i);
  console.log(`Listening resumed ${resumedAfterMs}ms after the greeting reply; spoken memory follow-up answered:`, followup.reply.text);
  const resumedAgainMs = await listeningAfterVoice(one);
  assert.ok(resumedAgainMs >= 0 && resumedAgainMs < 1000, `Listening resumed ${resumedAgainMs}ms after the follow-up reply ended`);
  const rooms = await request(first, { requestId: crypto.randomUUID(), action: { type: 'question', npcId: 'baines-arrival', text: 'We would like to stay here tonight. Can you tell us about our rooms and breakfast?', spoken: true } });
  assert.equal(rooms.ok, true, rooms.message);
  assert.equal(rooms.reply.reward, 'lodging-arranged');
  console.log('Case progression answered:', rooms.reply.text);
  await one.getByRole('button', { name: 'End conversation', exact: true }).click();
  await expect.poll(() => one.evaluate(() => window.__microphoneStream.getTracks().every(track => track.readyState === 'ended'))).toBe(true);
  await one.reload();
  const partnerState = await request(second);
  assert.ok(partnerState.npcs.find(npc => npc.id === 'baines-arrival').replies.some(item => item.id === reply.id));
  assert.deepEqual(errors, []);
  const checks = { director: reply.performance.director, performer: reply.performance.performer, transcription: 'fal-ai/elevenlabs/speech-to-text/scribe-v2', timings: reply.performance.timings,
    checks: ['authored topics alongside optional voice', 'responsive microphone control', 'hands-free turn ending', 'real fal Scribe transcription', 'natural small talk', 'listening resumes when the reply ends', 'spoken follow-up memory', 'case evidence from dialogue', 'fal voice playback', 'one subtitle', 'idempotent retry', 'reload persistence', 'shared conversation', 'microphone released'], errors };
  await writeFile(`${directory}/results.json`, JSON.stringify(checks, null, 2));
  console.log(JSON.stringify(checks, null, 2));
} catch (error) {
  await pages[0].screenshot({ path: `${directory}/failure.png` }).catch(() => {});
  console.error(await pages[0].locator('body').innerText());
  throw error;
} finally { await browser.close(); await rm(sampleDirectory, { recursive: true, force: true }); }
