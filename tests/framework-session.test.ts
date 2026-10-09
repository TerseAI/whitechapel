import starter from '../stories/starter/story.json';
import type { Inspector } from '../shared/story/types';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chooseInspector, canStartCase, gameplayBlock } from '../shared/game/session';
import { startCutscene, actOnCutscene } from '../shared/game/cutscenes';
import type { Player } from '../shared/game/types';

const players = (): Player[] => ['one', 'two'].map((id, index) => ({ id, name: '', role: index ? 'ellis' : 'reed', selected: false, ready: false, location: 'station', lastSeen: 100, position: { x: 0, z: 0 } }));
const scene = { id: 'arrival', title: 'Arrival', location: 'station', steps: [{ kind: 'card', text: 'That evening' }, { kind: 'shot', text: 'After you.', speaker: 'reed', camera: { position: [0, 2, 5], target: [0, 1, 0] } }] } as const;

test('inspector selection is exclusive and changing it clears readiness', () => {
  const members = players();
  assert.equal(chooseInspector(members, 'two', 'reed', starter.inspectors as Inspector[]), undefined);
  assert.equal(members[1].name, 'Inspector Reed');
  assert.match(chooseInspector(members, 'one', 'reed', starter.inspectors as Inspector[])!, /chosen/);
  assert.equal(chooseInspector(members, 'one', 'ellis', starter.inspectors as Inspector[]), undefined);
  members[1].ready = true;
  assert.equal(chooseInspector(members, 'two', 'reed', starter.inspectors as Inspector[]), undefined);
  assert.equal(members[1].ready, false);
});

test('two selected, ready, connected humans are required to start', () => {
  const members = players();
  assert.equal(canStartCase(members, ['one', 'two']), false);
  chooseInspector(members, 'one', 'reed', starter.inspectors as Inspector[]); chooseInspector(members, 'two', 'ellis', starter.inspectors as Inspector[]);
  members.forEach(player => player.ready = true);
  assert.equal(canStartCase(members, ['one']), false);
  assert.equal(canStartCase(members.slice(0, 1), ['one']), false);
  assert.equal(canStartCase(members, ['one', 'two']), true);
});

test('an explicitly solo case starts with one selected, ready and connected investigator', () => {
  const members = players().slice(0, 1);
  assert.equal(canStartCase(members, ['one'], 'solo'), false);
  chooseInspector(members, 'one', 'ellis', starter.inspectors as Inspector[]);
  members[0].ready = true;
  assert.equal(canStartCase(members, [], 'solo'), false);
  assert.equal(canStartCase(members, ['one'], 'solo'), true);
  assert.equal(canStartCase(members, ['one']), false);
  assert.equal(canStartCase([...members, members[0]], ['one'], 'solo'), false);
});

test('a solo investigator can advance and skip scenes without a second vote', () => {
  const state = startCutscene(scene, 'solo-run', 'resume');
  const act = (type: 'ready' | 'advance' | 'skip', connected = ['one']) => actOnCutscene(state, scene, ['one'], connected, 'one', { type, runId: 'solo-run', index: state.index }, 'solo');
  assert.equal(act('ready', []).ok, false);
  assert.equal(act('advance').ok, false);
  assert.equal(act('ready').ok, true);
  assert.equal(act('advance').ok, true);
  assert.equal(state.index, 1);
  act('ready');
  assert.equal(act('advance').finished, true);
  assert.equal(act('skip').finished, true);
});

test('the lobby and cutscene block game actions at the authority', () => {
  for (const phase of ['lobby', 'cutscene'] as const) {
    for (const type of ['travel', 'inspect', 'answer', 'chapterVote', 'deduce', 'move'] as const) assert.ok(gameplayBlock(phase, type));
    assert.equal(gameplayBlock(phase, 'heartbeat'), undefined);
  }
  assert.equal(gameplayBlock('lobby', 'selectInspector'), undefined);
  assert.ok(gameplayBlock('investigating', 'selectInspector'));
});

test('cutscenes wait for both clients to load and acknowledge each turn', () => {
  const state = startCutscene(scene, 'run-1', 'resume');
  const act = (player: string, type: 'ready' | 'advance' | 'skip', index = state.index, connected = ['one', 'two']) => actOnCutscene(state, scene, ['one', 'two'], connected, player, { type, runId: 'run-1', index });
  assert.equal(act('one', 'advance').ok, false);
  act('one', 'ready');
  assert.equal(act('one', 'advance').ok, false);
  act('two', 'ready');
  assert.equal(act('one', 'advance').finished, false);
  act('one', 'advance');
  assert.equal(state.index, 0);
  act('two', 'advance');
  assert.equal(state.index, 1);
  assert.equal(act('one', 'advance').ok, false);
  act('one', 'ready'); act('two', 'ready');
  assert.equal(act('one', 'advance', 0).ok, false);
  act('one', 'advance');
  assert.equal(act('two', 'advance', 1, ['two']).ok, false);
  assert.equal(act('two', 'advance').finished, true);
});

test('one skip vote cannot end a cutscene and another run cannot advance it', () => {
  const state = startCutscene(scene, 'run-2', 'advance');
  const act = (player: string, runId = 'run-2') => actOnCutscene(state, scene, ['one', 'two'], ['one', 'two'], player, { type: 'skip', runId, index: 0 });
  assert.equal(act('intruder').ok, false);
  assert.equal(act('one', 'run-1').ok, false);
  assert.equal(act('one').finished, false);
  assert.equal(act('two').finished, true);
});
