import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium, expect } from '@playwright/test';
import { DatabaseSync } from 'node:sqlite';
import { createFalClient } from '@fal-ai/client';
import { FalTranscription } from '../backend/src/intelligence/fal-transcription.ts';
import { conversationActorId, hashSecret } from '../backend/src/actors/entity-identity.ts';

const directory = await mkdtemp(join(tmpdir(), 'whitechapel-microphone-'));
const live = process.env.MIC_TEST_LIVE === '1';
const expectCreditsError = process.env.MIC_TEST_ERROR === 'credits';
process.env.STORY_PATH = 'tests/fixtures/framework/story.json';
const { ConversationActor } = await import('../backend/src/actors/conversation-actor.ts');
const { activeStory } = await import('../backend/src/active-story.ts');
const db = new DatabaseSync(':memory:');
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
try {
  const sample = process.env.MIC_TEST_WAV ?? join(directory, 'speech.wav');
  if (!process.env.MIC_TEST_WAV) {
    execFileSync('/usr/bin/say', ['-v', 'Samantha', '-o', join(directory, 'speech.aiff'), 'My name is Rowan. I am looking for the inspector.']);
    execFileSync('/usr/bin/afconvert', ['-f', 'WAVE', '-d', 'LEI16@16000', join(directory, 'speech.aiff'), sample]);
  }
  const page = await browser.newPage();
  const missingAssets = [];
  page.on('response', response => { if (response.url().includes('/vad/') && !response.ok()) missingAssets.push(response.url()); });
  let audioBytes = 0, peak = 0, requests = 0;
  const fal = live ? createFalClient({ credentials: process.env.FAL_KEY }) : { async run() {
    if (expectCreditsError) throw Object.assign(new Error('Billing failure'), { status: 402 });
    return { data: { text: 'My name is Rowan. I am looking for the inspector.' } };
  } };
  const microphone = new FalTranscription({ async run(endpoint, options) {
    requests++;
    const audio = Buffer.from(options.input.audio_url.split(',')[1], 'base64');
    audioBytes = audio.length - 44;
    for (let index = 44; index < audio.length; index += 2) peak = Math.max(peak, Math.abs(audio.readInt16LE(index)));
    return fal.run(endpoint, options);
  } });
  const playerId = 'microphone-player', secret = 'microphone-secret', npc = activeStory.characters[0];
  npc.mind = { identity: npc.entityId, persona: 'Witness.', goals: [], voice: 'Daniel' };
  const scope = { caseId: 'microphone-check', entityId: npc.entityId, storyId: activeStory.id, storyVersion: activeStory.version };
  class MicrophoneActor extends ConversationActor {
    constructor() { super({ case: () => ({ async authorizeMicrophone(identity) {
      assert.equal(identity.playerId, playerId); assert.equal(identity.secret, secret);
      return { ok: true, message: '' };
    } }) }, () => ({ microphone })); }
    get id() { return conversationActorId(scope.caseId, scope.entityId); }
    get db() { return { exec: (sql, ...values) => db.prepare(sql).all(...values) }; }
    broadcast() {}
  }
  const actor = new MicrophoneActor();
  await actor.configure(scope, { playerId, secretHash: hashSecret(secret) });
  await page.routeWebSocket('wss://microphone.test/conversation', socket => {
    const actorSocket = { id: 'microphone-socket', metadata: { playerId, secret, npcId: npc.id }, send: message => socket.send(JSON.stringify(message)) };
    socket.onMessage(message => { void actor.onMessage(actorSocket, JSON.parse(String(message))); });
    socket.onClose(() => { void actor.onDisconnect(actorSocket); });
    socket.send(JSON.stringify({ type: 'conversation', state: { entityId: npc.entityId, revision: 0, replies: [] } }));
  });
  await page.goto(process.env.AI_ORIGIN ?? 'http://127.0.0.1:5488/');
  await page.evaluate(async wave => {
    const main = await (await fetch('/src/main.tsx')).text();
    const React = (await import(main.match(/from "([^"]*\/react\.js[^"]*)"/)[1])).default;
    const { createRoot } = (await import(main.match(/from "([^"]*\/react-dom_client\.js[^"]*)"/)[1])).default;
    const { useVoiceTurns } = await import('/src/interviews/useVoiceTurns.ts');
    const { CaseSocketClient } = await import('/src/game/case-socket-client.ts');
    const client = new CaseSocketClient(async () => ({ websocketUrl: 'wss://microphone.test/conversation', connectByMs: Date.now() + 10000 }), { update() {}, status() {} });
    client.start();
    window.__microphoneTranscripts = [];
    navigator.mediaDevices.getUserMedia = async () => {
      const audio = new AudioContext();
      await audio.resume();
      const destination = audio.createMediaStreamDestination();
      window.__microphoneStream = destination.stream;
      window.__speak = async () => {
        const buffer = await audio.decodeAudioData(Uint8Array.from(atob(wave), char => char.charCodeAt(0)).buffer);
        const source = audio.createBufferSource(); source.buffer = buffer; source.connect(destination); source.start();
        await new Promise(resolve => source.onended = resolve);
        window.__spokeUntil = performance.now();
      };
      return destination.stream;
    };
    function MicrophoneCheck() {
      const voice = useVoiceTurns((recording, signal) => client.transcribe(recording, signal),
        async text => { window.__microphoneTranscripts.push(text); window.__sentAfterSpeechMs = Math.round(performance.now() - window.__spokeUntil); }, true);
      window.__microphoneCheck = voice;
      return React.createElement('output', { id: 'microphone-check' }, JSON.stringify({ status: voice.status, mode: voice.mode, error: voice.error }));
    }
    const container = document.createElement('div'); document.body.append(container);
    const root = createRoot(container);
    root.render(React.createElement(MicrophoneCheck));
    window.__closeMicrophoneCheck = () => { root.unmount(); client.stop(); };
  }, (await readFile(sample)).toString('base64'));
  const status = () => page.evaluate(() => window.__microphoneCheck.status);
  await expect(page.locator('#microphone-check')).toBeAttached();
  await page.evaluate(() => { localStorage.removeItem('investigation.voice-mode'); window.__microphoneCheck.enable(); });
  await expect.poll(status, { timeout: 25000 }).toBe('listening');
  await page.waitForTimeout(1500);
  assert.equal(requests, 0, 'Silence must not be sent for transcription');
  await page.evaluate(() => window.__speak());
  await expect.poll(() => page.evaluate(() => window.__microphoneTranscripts.length + (window.__microphoneCheck.error ? 1 : 0)), { timeout: 20000 }).toBe(1);
  const result = await page.evaluate(() => ({ error: window.__microphoneCheck.error, transcripts: [...window.__microphoneTranscripts], sentAfterSpeechMs: window.__sentAfterSpeechMs }));
  console.log(JSON.stringify({ provider: live ? 'fal Scribe v2' : 'mock', mode: 'hands-free', ...result, audioBytes, peak, requests }));
  if (expectCreditsError) {
    assert.match(result.error, /fal.*credits/i);
    assert.equal(result.transcripts.length, 0);
  } else {
    assert.equal(result.error, '');
    assert.equal(result.transcripts.length, 1);
    assert.match(result.transcripts[0], process.env.MIC_TEST_WAV ? /\S/ : /inspector/i);
  }
  assert.ok(audioBytes > 16000, 'Detected speech must contain at least half a second of PCM16 audio');
  assert.ok(peak > 1000, 'The recording must contain audible speech');
  assert.equal(requests, 1);
  await expect.poll(status).toBe('listening');

  await page.evaluate(() => window.__microphoneCheck.setMode('hold'));
  await expect.poll(status).toBe('waiting');
  await page.evaluate(() => window.__speak());
  assert.equal(requests, 1, 'Hold to talk must ignore speech while released');
  await page.evaluate(() => window.__microphoneCheck.press());
  await expect.poll(status).toBe('listening');
  await page.evaluate(() => window.__speak());
  await page.evaluate(() => window.__microphoneCheck.release());
  await expect.poll(() => requests, { timeout: 20000 }).toBe(2);
  if (!expectCreditsError) await expect.poll(() => page.evaluate(() => window.__microphoneTranscripts.length), { timeout: 20000 }).toBe(2);
  assert.equal(await page.evaluate(() => window.__microphoneStream.getTracks().some(track => track.readyState === 'live')), true, 'The microphone stays open between turns');

  await page.evaluate(() => window.__closeMicrophoneCheck());
  await expect.poll(() => page.evaluate(() => window.__microphoneStream.getTracks().every(track => track.readyState === 'ended'))).toBe(true);
  assert.deepEqual(missingAssets, []);
  console.log(JSON.stringify({ mode: 'hold', requests, microphoneReleasedOnClose: true }));
} finally {
  await browser.close();
  db.close();
  await rm(directory, { recursive: true, force: true });
}
