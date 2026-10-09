import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';

const origin = process.env.FRAMEWORK_ORIGIN ?? 'http://127.0.0.1:5288';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage();
try {
  await page.goto(origin);
  await expect(page.getByRole('button', { name: 'Play with a partner', exact: true })).toBeVisible();
  await page.evaluate(async () => {
    const dependency = name => performance.getEntriesByType('resource').find(entry => new URL(entry.name).pathname.endsWith(`/${name}.js`)).name;
    const { createElement: element } = (await import(dependency('react'))).default;
    const { createRoot } = (await import(dependency('react-dom_client'))).default;
    const { Interview } = await import('/src/interviews/Interview.tsx');
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;inset:0;z-index:1000;background:#15232b';
    document.body.append(container);
    const root = createRoot(container);
    window.playedSpeeches = [];
    window.replayedSpeeches = [];
    const audio = { ready: true, playSpeech: speech => window.playedSpeeches.push(speech.id), replayInterview: npc => window.replayedSpeeches.push(npc.id), unlock() {}, advance() {}, read() {}, resume() {} };
    window.mountInterview = id => root.render(element(Interview, {
      key: id, npc: { id, name: id, occupation: 'Witness', greeting: 'Good morning.', replies: [], topics: [{ id: 'account', label: 'What did you see?', claim: 'I was at the door.', choices: [] }] },
      ownsConversation: true, pending: false, evidence: [],
      audio: { ...audio, exchange: { speech: { npcId: id, id: `${id}-greeting` }, status: 'complete' } },
      audioEnabled: true, onAudioEnabled() {}, onResume() {}, onClose: () => root.render(null), onExamine() {},
      onAction: () => new Promise(resolve => { window.finishInterviewRequest = resolve; }),
    }));
    window.mountInterview('first-witness');
  });
  await page.getByRole('button', { name: /What did you see/ }).click();
  await page.evaluate(() => window.mountInterview('second-witness'));
  await expect(page.getByRole('heading', { name: 'second-witness', exact: true })).toBeVisible();
  await page.evaluate(() => window.finishInterviewRequest({ ok: true, speech: { id: 'late-first-witness', npcId: 'first-witness', lines: [] } }));
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
  assert.deepEqual(await page.evaluate(() => window.playedSpeeches), [], 'A closed interview must not start its late response over another witness.');
  assert.deepEqual(await page.evaluate(() => window.replayedSpeeches), []);
  await page.getByRole('button', { name: /What did you see/ }).click();
  await page.evaluate(() => window.finishInterviewRequest({ ok: true, speech: { id: 'current-response', npcId: 'second-witness', lines: [] } }));
  await expect.poll(() => page.evaluate(() => window.playedSpeeches)).toEqual(['current-response']);
  await page.getByRole('button', { name: 'Other questions', exact: true }).click();
  await page.getByRole('button', { name: /What did you see/ }).click();
  await page.getByRole('button', { name: 'End conversation', exact: true }).click();
  await page.evaluate(() => window.finishInterviewRequest({ ok: true }));
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
  assert.deepEqual(await page.evaluate(() => window.replayedSpeeches), [], 'A late response without a server speech must not synthesize a replay after closing.');
  await page.route('**/api/story', route => route.fulfill({ json: {
    id: 'audio-fixture', version: '1', title: 'Audio fixture', assets: {},
    voices: { question: { src: 'question.mp3', text: 'The question.', durationMs: 2000 }, answer: { src: 'answer.mp3', text: 'The answer.', durationMs: 3000 } },
  } }));
  await page.evaluate(async () => {
    const dependency = name => performance.getEntriesByType('resource').find(entry => new URL(entry.name).pathname.endsWith(`/${name}.js`)).name;
    const { createElement: element, useState } = (await import(dependency('react'))).default;
    const { createRoot } = (await import(dependency('react-dom_client'))).default;
    const { StoryProvider } = await import('/src/story/StoryProvider.tsx');
    const { useInterviewAudio } = await import('/src/useInterviewAudio.ts');
    const refresh = await import('/@react-refresh');
    window.testAudio = [];
    window.Audio = class extends EventTarget {
      src = ''; currentTime = 0; volume = 1; paused = true;
      constructor() { super(); window.testAudio.push(this); }
      pause() { this.paused = true; }
      play() { this.paused = false; queueMicrotask(() => this.dispatchEvent(new Event('playing'))); return Promise.resolve(); }
    };
    const state = {
      roomId: 'audio-fixture', chapter: { index: 0 }, players: [{ id: 'player', location: 'room' }],
      npcs: [{ id: 'witness', location: 'room', lease: { playerId: 'player', until: Date.now() + 90000 } }],
      speech: [{ id: 'exchange', npcId: 'witness', playerId: 'player', chapter: 0, location: 'room', at: Date.now(), endsAt: Date.now() + 5000,
        lines: [{ clip: 'question', text: 'The question.', durationMs: 2000, speakerId: 'player' }, { clip: 'answer', text: 'The answer.', durationMs: 3000, speakerId: 'witness' }] }],
    };
    let version = 0;
    const component = () => {
      const currentVersion = ++version;
      return function PlaybackHarness() {
        const [volume, setVolume] = useState(1);
        window.setInterviewVolume = setVolume;
        const audio = useInterviewAudio(state, 'player', volume, 0, 'witness');
        window.interviewPlayback = audio;
        return element('div', { 'data-testid': 'current-turn', 'data-refresh': currentVersion }, audio.exchange ? `${audio.exchange.index}:${audio.exchange.status}:${audio.exchange.line.text}` : 'No turn');
      };
    };
    let exports = { PlaybackHarness: component() };
    refresh.registerExportsForReactRefresh('isolated-playback-harness', exports);
    const container = document.createElement('div');
    document.body.append(container);
    window.audioFixtureRoot = createRoot(container);
    window.audioFixtureRoot.render(element(StoryProvider, null, element(exports.PlaybackHarness)));
    window.refreshInterview = () => {
      const next = { PlaybackHarness: component() };
      refresh.registerExportsForReactRefresh('isolated-playback-harness', next);
      refresh.validateRefreshBoundaryAndEnqueueUpdate('isolated-playback-harness', exports, next);
      exports = next;
    };
  });
  const turn = page.getByTestId('current-turn');
  await expect(turn).toHaveText('0:playing:The question.');
  await page.evaluate(() => window.setInterviewVolume(0));
  await expect.poll(() => page.evaluate(() => window.testAudio.find(audio => audio.src.endsWith('/question.mp3')).volume)).toBe(0);
  await expect(turn).toHaveText('0:playing:The question.');
  assert.equal(await page.evaluate(() => window.testAudio.find(audio => audio.src.endsWith('/question.mp3')).paused), false, 'Muting must keep the recording running for automatic subtitles.');
  await page.evaluate(() => window.testAudio.find(audio => audio.src.endsWith('/question.mp3')).dispatchEvent(new Event('ended')));
  await expect(turn).toHaveText('1:playing:The answer.');
  await page.evaluate(() => { window.testAudio.find(audio => audio.src.endsWith('/answer.mp3')).currentTime = .75; window.refreshInterview(); });
  await expect(turn).toHaveAttribute('data-refresh', '2');
  await expect(turn).toHaveText('1:playing:The answer.');
  assert.equal(await page.evaluate(() => window.testAudio.filter(audio => !audio.paused && audio.src.endsWith('/answer.mp3')).length), 1, 'Refresh must keep exactly one active voice for the visible turn.');
  assert.equal(await page.evaluate(() => window.testAudio.find(audio => !audio.paused && audio.src.endsWith('/answer.mp3')).currentTime), .75, 'Refresh preserves playback position.');
  await page.evaluate(() => window.interviewPlayback.read());
  await expect(turn).toHaveText('1:reading:The answer.');
  await page.evaluate(() => window.refreshInterview());
  await expect(turn).toHaveAttribute('data-refresh', '3');
  await expect(turn).toHaveText('1:reading:The answer.');
  assert.ok(await page.evaluate(() => window.testAudio.every(audio => audio.paused)), 'Refresh must preserve reading mode.');
  await page.evaluate(() => window.audioFixtureRoot.unmount());
  assert.ok(await page.evaluate(() => window.testAudio.every(audio => audio.paused)), 'Unmount stops every voice.');
  console.log('Interview synchronization passed: muted subtitles advance automatically; late responses are discarded; hot refresh preserves the current voice, position and reading mode.');
} finally { await browser.close(); }
