import { sceneAction, closeSceneClients } from '../../../scripts/scene-test-client.mjs';
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
import { gateOpen } from '../../../shared/game/story-gates.ts';
import { topicAvailable } from '../../../shared/game/interviews.ts';
import { objectPlacement, objectStepBlock } from '../../../shared/game/physical-objects.ts';
import { cluePosition, witnessPosition, pathToClue, pathToWitness } from '../../../shared/game/navigation.ts';

const story = JSON.parse(await readFile(process.env.STORY_PATH ?? 'stories/sixth-murder/story.json', 'utf8'));
const solo = process.argv.includes('--solo');
const origin = process.env.GAME_ORIGIN ?? 'http://127.0.0.1:5388';
const directory = `.qa/sixth-murder/${(solo ? 'solo-' : '') + (process.env.PLAYTEST_ROUTE ?? 'evidence')}`;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const contexts = await Promise.all(Array.from({ length: solo ? 1 : 2 }, (_, index) => browser.newContext({ viewport: { width: index ? 1100 : 1440, height: index ? 850 : 1000 }, reducedMotion: 'reduce' })));
const pages = await Promise.all(contexts.map(context => context.newPage()));
const errors = [], visits = new Set(), tested = new Set(), report = [];
const denialRoute = process.env.PLAYTEST_ROUTE === 'denial';
const optionalStation = new Set(['room-revisit', 'purpose', 'disguise']);
let players, state, stationStatements, nextRequestAt = 0;
const facts = () => ({ evidence: state.evidence.map(item => item.id), deductions: state.deductions, decisions: state.decisions, reportAccepted: state.reportAccepted });
for (const page of pages) {
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.url().includes('/story-assets/') && response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
}

try {
  await mkdir(directory, { recursive: true });
  await startCase();
  if (process.env.PLAYTEST_VOICES === '1') await reviewVoicedInterview();
  while (state.phase !== 'solved') {
    if (state.phase === 'cutscene') { await skipScene(); continue; }
    await dismissBriefings();
    const before = fingerprint();
    if (denialRoute) await questionWitnesses();
    await inspectPlaces();
    await questionWitnesses();
    await connectEvidence();
    if (state.canConclude) await conclude();
    else assert.notEqual(fingerprint(), before, `Unreachable stage ${state.chapter.index}: ${state.outstanding?.join(', ')}`);
  }
  for (const page of pages) await expect(page.getByRole('heading', { name: 'Case complete', exact: true })).toBeVisible();
  await pages[0].reload();
  await expect(pages[0].getByRole('heading', { name: 'Case complete', exact: true })).toBeVisible();
  await refresh();
  if (stationStatements) {
    assert.deepEqual(state.evidence.find(item => item.id === 'station-yard')?.statements, stationStatements);
    assert.ok(!state.npcs.some(npc => npc.id === 'arthur-station'));
    tested.add('exact station answers retained after closing and reload');
  }
  await pages[0].screenshot({ path: `${directory}/ending.png` });
  if (denialRoute) {
    for (const id of ['killing-admitted', 'blow-admitted', 'knife-admitted', 'disguise-admitted']) assert.ok(!facts().evidence.includes(id), `Denial route must not invent ${id}`);
    tested.add('completed without a confession');
  }
  assert.ok(facts().evidence.includes('arthur-candlestick-slip'));
  assert.ok(state.deductions.includes('source-excuse'));
  if (!denialRoute) assert.ok(facts().evidence.includes('disguise-admitted'));
  tested.add('unshared detail connected and officer excuse checked');
  assert.deepEqual(errors, []);
  await writeFile(`${directory}/results.json`, JSON.stringify({ story: story.id, version: story.version, completed: true, stages: report, scenes: [...visits], checks: [...tested], errors }, null, 2));
  console.log(`Completed ${story.title}: ${report.length} stages, ${visits.size} scenes; ${directory}`);
} catch (error) {
  await pages[0].screenshot({ path: `${directory}/failure.png` }).catch(() => {});
  await writeFile(`${directory}/failure.json`, JSON.stringify({ message: error.message, state, errors }, null, 2));
  throw error;
} finally { closeSceneClients(); await browser.close(); }

async function json(path, body, player) {
  await new Promise(resolve => setTimeout(resolve, Math.max(0, nextRequestAt - Date.now())));
  nextRequestAt = Date.now() + 45;
  const response = await fetch(`${origin}${path}`, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(player ? { 'X-Player-Id': player.playerId, Authorization: `Bearer ${player.secret}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  assert.equal(response.ok, true, await response.clone().text());
  return response.json();
}

async function refresh() { state = await json(`/api/cases/${players[0].roomId}`, undefined, players[0]); return state; }
async function act(index, action, success = true) {
  const result = action.type === 'move' ? await sceneAction(origin, players[index], state, action) : await json(`/api/cases/${players[index].roomId}/actions`, { requestId: crypto.randomUUID(), action }, players[index]);
  if (success) assert.equal(result.ok, true, `${JSON.stringify(action)}: ${result.message}`);
  await refresh();
  return result;
}

async function startCase() {
  assert.equal((await json('/api/story')).id, story.id);
  const first = await json('/api/cases', { mode: solo ? 'solo' : 'co-op' });
  players = [first.credentials];
  if (!solo) players.push((await json('/api/cases', { roomId: first.credentials.roomId })).credentials);
  for (const [index, page] of pages.entries()) {
    if (process.env.PLAYTEST_VOICES === '1') await page.addInitScript(() => {
      window.__voiceEvents = [];
      const play = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function () {
        const source = this.src;
        return play.call(this).then(result => { window.__voiceEvents.push({ source, ready: this.readyState }); return result; });
      };
    });
    await page.addInitScript(({ identity, credentials }) => {
      const prefix = `investigation.v3.${identity.id}.${identity.version}.`;
      localStorage.setItem(prefix + credentials.roomId, JSON.stringify(credentials));
      localStorage.setItem(prefix + 'last', credentials.roomId);
    }, { identity: story, credentials: players[index] });
    await page.goto(origin);
    await expect(page.getByRole('heading', { name: 'Choose your inspector' })).toBeVisible();
    await page.getByRole('button', { name: new RegExp(story.inspectors[index].name) }).click();
  }
  await pages[0].screenshot({ path: `${directory}/lobby.png` });
  for (const page of pages) await page.getByRole('button', { name: solo ? 'Begin the case' : 'I’m ready', exact: true }).click();
  await refresh();
}

async function reviewVoicedInterview() {
  const page = pages[0];
  await dismissBriefings();
  await page.getByRole('button', { name: /^Mrs Baines/ }).click();
  const greeting = await waitForSpeech(speech => !speech.topicId);
  await verifyVoicedTurns(greeting, true);
  await page.getByRole('button', { name: /The reserved rooms/ }).click();
  const question = await waitForSpeech(speech => speech.topicId === 'rooms' && !speech.replyId);
  await verifyVoicedTurns(question);
  await expect(page.getByRole('heading', { name: 'Your response' })).toBeVisible();
  const character = story.characters.find(npc => npc.id === 'baines-arrival');
  const topic = character.topics.find(topic => topic.id === 'rooms');
  await page.getByRole('button', { name: topic.choices.find(choice => choice.approach === 'reassure').label, exact: false }).click();
  const reply = await waitForSpeech(speech => speech.topicId === 'rooms' && !!speech.replyId);
  await verifyVoicedTurns(reply);
  await page.getByRole('button', { name: 'Mute this interview', exact: true }).click();
  await page.getByRole('button', { name: 'Review statements', exact: true }).click();
  await page.getByRole('button', { name: /The reserved rooms/ }).click();
  for (const line of reply.lines) {
    await expect(page.locator('.interview-subtitle p')).toHaveText(line.text);
    await expect(page.locator('.interview-subtitle')).toHaveCount(1);
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Unmute this interview', exact: true }).click();
  await page.getByRole('button', { name: 'End conversation', exact: true }).click();
  await refresh();
  tested.add('real MP3 playback, automatic subtitle advancement and deferred response choices');
  tested.add('muted recorded exchange advances one turn at a time');
}

async function waitForSpeech(predicate) {
  let speech;
  await expect.poll(async () => {
    await refresh();
    speech = state.speech.find(item => item.npcId === 'baines-arrival' && item.playerId === players[0].playerId && predicate(item));
    return !!speech;
  }).toBe(true);
  return speech;
}

async function verifyVoicedTurns(speech, capture = false) {
  const page = pages[0];
  for (const line of speech.lines) {
    await expect(page.locator('.interview-subtitle p')).toHaveText(line.text, { timeout: 20000 });
    await expect(page.locator('.interview-subtitle')).toHaveCount(1);
    await expect(page.locator('.interview-decisions')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Skip line', exact: true })).toBeVisible();
    await expect.poll(() => page.evaluate(source => window.__voiceEvents.some(event => event.source.endsWith(source) && event.ready >= 2), story.voices[line.clip].src)).toBe(true);
    if (capture) await page.screenshot({ path: `${directory}/voiced-interview.png` });
    if (line === speech.lines.at(-1)) {
      await expect(page.locator('.interview-decisions')).toBeVisible({ timeout: line.durationMs + 10000 });
    } else await expect(page.locator('.interview-subtitle p')).toHaveText(speech.lines[speech.lines.indexOf(line) + 1].text, { timeout: line.durationMs + 10000 });
  }
}

async function skipScene() {
  const scene = state.cutscene;
  await act(0, { type: 'cutscene', command: { type: 'skip', runId: scene.runId, index: scene.index } });
  if (!solo) {
    assert.equal(state.phase, 'cutscene');
    await act(1, { type: 'cutscene', command: { type: 'skip', runId: scene.runId, index: scene.index } });
  }
  tested.add(solo ? 'solo cutscene skip' : 'joint cutscene skip');
}

async function dismissBriefings() {
  for (const page of pages) {
    const button = page.getByRole('button', { name: /^(Begin|Continue) the enquiry$/ });
    if (await button.isVisible()) {
      if (page === pages[0] && await page.getByRole('article', { name: 'Document transcription' }).isVisible() && !tested.has('document modes')) await reviewDocument(page);
      await button.click();
    }
  }
}

async function reviewDocument(page) {
  await expect(page.getByRole('article', { name: 'Document transcription' })).toBeVisible();
  await page.getByRole('button', { name: 'View original', exact: true }).click();
  await expect(page.locator('.document-original')).toBeVisible();
  await page.screenshot({ path: `${directory}/paper-original.png` });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: `${directory}/paper-mobile.png` });
  await page.getByRole('button', { name: 'Read transcription', exact: true }).click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  tested.add('document modes');
}

async function approach(index, place, target, witness = false) {
  let player = state.players.find(item => item.id === players[index].playerId);
  if (player.location !== place.id) await act(index, { type: 'travel', location: place.id });
  player = state.players.find(item => item.id === players[index].playerId);
  const route = (witness ? pathToWitness : pathToClue)(player.position, target, place.indoor, place.navigation);
  for (const point of route) await act(index, { type: 'move', ...point });
}

async function inspectPlaces() {
  for (const place of [...state.locations]) {
    await act(0, { type: 'travel', location: place.id });
    await photograph(place);
    for (const [index, hotspot] of place.hotspots.entries()) {
      if (denialRoute && state.chapter.index < 2 && ['inn-newspaper', 'torn-wedding'].includes(hotspot.id)) continue;
      const object = Object.values(story.objects).find(item => item.hotspots.includes(hotspot.id));
      if (object) { await inspectObject(object, place, index, hotspot.id); continue; }
      if (facts().evidence.includes(hotspot.id) || !story.chapters[state.chapter.index].clueIds.includes(hotspot.id)) continue;
      await approach(0, place, cluePosition(index, place.indoor, place.navigation, hotspot.id));
      await act(0, { type: 'inspect', clueId: hotspot.id });
    }
  }
}

async function inspectObject(object, place, index, hotspotId) {
  if (!objectPlacement(object, state.chapter.index, state.locations)) return;
  for (const step of object.steps) {
    const observed = state.inspections[object.id] ?? [];
    if (observed.includes(step.id)) continue;
    if (step.togetherAt && !solo) await act(1, { type: 'travel', location: step.togetherAt });
    if (objectStepBlock(object, step, observed, { mode: state.mode, found: facts().evidence, deductions: state.deductions, members: state.players })) continue;
    await approach(0, place, cluePosition(index, place.indoor, place.navigation, hotspotId));
    await act(0, { type: 'examineObject', objectId: object.id, stepId: step.id });
  }
  await reviewObject(object, place, index);
}

async function reviewObject(object, place, index) {
  const key = `illustrated object ${object.id}`;
  const observed = state.inspections[object.id] ?? [];
  if (tested.has(key) || !observed.length) return;
  const page = pages[0];
  await page.getByRole('button', { name: `Inspect ${place.hotspots[index].label}`, exact: true }).click();
  await expect(page.getByRole('region', { name: `Inspect ${object.title}`, exact: true })).toBeVisible();
  const step = object.steps.findLast(step => observed.includes(step.id));
  await page.getByLabel('View examined detail').selectOption(step.id);
  await page.getByText('Descriptions', { exact: true }).click();
  await expect(page.locator('.object-descriptions')).toContainText(step.observation);
  await page.getByText('Descriptions', { exact: true }).click();
  await expect.poll(() => page.locator('.object-art-frame img').evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
  await page.screenshot({ path: `${directory}/object-${object.id}.png` });
  if (!tested.has('responsive object inspector')) {
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: `${directory}/object-mobile.png` });
    await page.setViewportSize({ width: 1440, height: 1000 });
    tested.add('responsive object inspector');
  }
  await page.getByRole('button', { name: 'Close inspection', exact: true }).click();
  tested.add(key);
}

function responseFor(topic, approach) {
  if (topic.documentId) return { ...topic.success, success: true };
  return topic.responses?.[approach] ?? { ...(approach === topic.correct ? topic.success : topic.failure), success: approach === topic.correct };
}

function chooseAnswer(topic) {
  const order = denialRoute ? ['reassure', 'press', 'challenge'] : ['challenge', 'press', 'reassure'];
  return order.find(approach => {
    if (!topic.documentId && !topic.choices.some(choice => choice.approach === approach)) return false;
    if (approach === 'challenge' && topic.proof && ![topic.proof, ...(topic.proofAlternatives ?? [])].some(id => facts().evidence.includes(id))) return false;
    return responseFor(topic, approach).success;
  });
}

async function questionWitnesses() {
  for (const original of [...state.npcs]) {
    const character = story.characters.find(item => item.id === original.id);
    const place = state.locations.find(item => item.id === original.location);
    if (!place) continue;
    const cast = state.npcs.filter(item => item.location === place.id);
    let opened = false;
    for (const topic of character.topics) {
      const npc = state.npcs.find(item => item.id === original.id);
      if (npc.replies.some(reply => reply.topicId === topic.id && reply.success) || !topicAvailable(topic, npc, facts().evidence, facts())) continue;
      const skip = (process.env.PLAYTEST_SKIP_TOPICS ?? '').split(',');
      if (skip.includes(`${npc.id}/${topic.id}`)) continue;
      if (denialRoute && npc.id === 'arthur-station' && optionalStation.has(topic.id)) continue;
      const approach = chooseAnswer(topic);
      if (!approach) continue;
      if (!opened) {
        await approachWitness(place, cast.findIndex(item => item.id === npc.id));
        await act(0, { type: 'begin', npcId: npc.id }); opened = true;
      }
      await act(0, { type: 'ask', npcId: npc.id, topicId: topic.id });
      if (topic.documentId) continue;
      const evidenceId = [topic.proof, ...(topic.proofAlternatives ?? [])].find(id => facts().evidence.includes(id));
      await act(0, { type: 'answer', npcId: npc.id, topicId: topic.id, approach, ...(approach === 'challenge' && evidenceId ? { evidenceId } : {}) });
    }
    if (opened) await act(0, { type: 'end', npcId: original.id });
  }
}

async function approachWitness(place, index) { await approach(0, place, witnessPosition(state.npcs.filter(npc => npc.location === place.id)[index].id, place.navigation), true); }

async function connectEvidence() {
  for (const id of story.chapters[state.chapter.index].deductionIds) {
    const deduction = story.deductions.find(item => item.id === id);
    if (state.deductions.includes(id) || !gateOpen(deduction, facts())) continue;
    const pair = [deduction.requires, ...(deduction.alternatives ?? [])].find(pair => pair.every(id => facts().evidence.includes(id)));
    if (!pair) continue;
    const reconstruction = story.reconstructions.find(item => item.id === id);
    if (!reconstruction && !tested.has('dragged a real evidence connection')) {
      await dragConnection(pair, id);
      continue;
    }
    if (reconstruction && !tested.has('rejected reconstruction')) {
      const rejected = await act(0, { type: 'deduce', evidenceIds: pair, sequence: [...reconstruction.order].reverse() }, false);
      assert.equal(rejected.ok, false); assert.equal('order' in rejected.reconstruction, false);
      tested.add('rejected reconstruction');
    }
    await act(0, { type: 'deduce', evidenceIds: pair, ...(reconstruction ? { sequence: reconstruction.order } : {}) });
  }
}

async function dragConnection(pair, deductionId) {
  const page = pages[0];
  await openBoard();
  const handle = id => page.locator(`.react-flow__node[data-id="${id}"] .react-flow__handle`);
  await handle(pair[0]).scrollIntoViewIfNeeded();
  const start = await handle(pair[0]).boundingBox();
  await page.mouse.move(start.x + start.width / 2, start.y + 15);
  await page.mouse.down();
  await handle(pair[1]).scrollIntoViewIfNeeded();
  const end = await handle(pair[1]).boundingBox();
  await page.mouse.move(end.x + end.width / 2, end.y + Math.min(end.height / 2, 45), { steps: 12 });
  await page.mouse.up();
  await expect.poll(async () => (await refresh()).deductions.includes(deductionId)).toBe(true);
  await dismissFindings();
  await page.getByRole('button', { name: 'Explore', exact: true }).click();
  tested.add('dragged a real evidence connection');
}

async function conclude() {
  const index = state.chapter.index, chapter = story.chapters[index], completion = chapter.flow.completion;
  const stationRecord = state.evidence.find(item => item.id === 'station-yard');
  if (stationRecord && !stationStatements) {
    assert.ok(stationRecord.statements?.length, 'The station evidence must preserve the obtained answer');
    stationStatements = stationRecord.statements;
  }
  await reviewBoard(index);
  report.push({ index, title: chapter.title, evidence: state.evidence.length, deductions: [...state.deductions] });
  console.log(`Stage ${index + 1} ready: ${chapter.title}`);
  const action = completion.kind === 'continue' ? { type: 'continueStage' } : completion.kind === 'findings' ? { type: 'finalReport', findings: completion.supported } : { type: 'chapterVote', answer: chapter.acceptedAnswers[0] };
  const unsupported = completion.kind === 'findings' && completion.options.find(option => !completion.supported.includes(option.id));
  const wrong = completion.kind === 'findings' ? unsupported && { type: 'finalReport', findings: [unsupported.id] } : completion.kind === 'report' && chapter.options.find(option => !chapter.acceptedAnswers.includes(option.id));
  if (wrong && completion.kind !== 'continue') {
    const invalid = completion.kind === 'findings' ? wrong : { type: 'chapterVote', answer: wrong.id };
    if (!solo) await act(0, invalid);
    const rejected = await act(solo ? 0 : 1, invalid, false);
    assert.equal(rejected.ok, false); assert.equal(state.chapter.index, index);
    tested.add('unsupported report rejected');
  }
  await act(0, action);
  if (!solo) {
    assert.equal(state.chapter.index, index); assert.equal(state.phase, 'investigating');
    await act(1, action);
  }
  tested.add(solo ? 'solo stage completion' : 'joint stage completion');
}

async function reviewBoard(index) {
  const page = pages[0];
  await openBoard();
  await assertBoardWidth(page);
  await page.screenshot({ path: `${directory}/board-${index}.png` });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Case Map must fit mobile width');
  await assertBoardWidth(page);
  const direction = page.locator('.map-questions-disclosure > summary');
  await expect(await direction.count() ? direction : page.locator('.map-leads-disclosure > summary')).toBeInViewport();
  await page.screenshot({ path: `${directory}/board-${index}-mobile.png`, fullPage: true });
  const finalPaper = page.locator('.react-flow__node').last();
  if (await finalPaper.count()) {
    await finalPaper.scrollIntoViewIfNeeded();
    await expect(finalPaper).toBeInViewport();
    await page.locator('.board-canvas').evaluate(canvas => { canvas.scrollTop = 0; });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await assertBoardWidth(page);
  await page.getByRole('button', { name: 'Explore', exact: true }).click();
  tested.add('responsive chapter boards');
}

async function openBoard() {
  await dismissBriefings();
  await pages[0].getByRole('button', { name: 'Case map', exact: true }).click();
  await dismissFindings();
  await expect(pages[0].getByRole('region', { name: 'Case map', exact: true })).toBeVisible();
}

async function dismissFindings() {
  const dismiss = pages[0].getByRole('button', { name: 'Continue investigating', exact: true });
  while (await dismiss.isVisible()) await dismiss.click();
}

async function assertBoardWidth(page) {
  await expect.poll(() => page.locator('.board-canvas').evaluate(canvas => {
    const bounds = canvas.getBoundingClientRect();
    return [...canvas.querySelectorAll('.react-flow__node')].every(node => {
      const paper = node.getBoundingClientRect();
      return paper.left >= bounds.left - 1 && paper.right <= bounds.right + 1;
    });
  }), { message: 'All evidence papers fit the settled board width' }).toBe(true);
}

async function photograph(place) {
  const key = `${state.chapter.index}-${place.id}`;
  if (visits.has(key)) return;
  visits.add(key);
  const page = pages[0];
  await dismissBriefings();
  const explore = page.getByRole('button', { name: 'Explore', exact: true });
  if (await explore.isVisible()) await explore.click();
  await expect(page.locator(`.world-3d[data-site="${place.siteId}"][data-ready=true] canvas`)).toBeVisible({ timeout: 30000 });
  await page.screenshot({ path: `${directory}/${key}.png` });
}

function fingerprint() { return JSON.stringify([state.chapter.index, state.phase, state.evidence.map(item => item.id), state.deductions, state.inspections, state.npcs.map(item => item.replies)]); }
