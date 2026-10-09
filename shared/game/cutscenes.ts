import type { PlaceId } from './types.js';
import { investigatorCount, type CaseMode } from './case-mode.js';

export type ShotCamera = { position: readonly [number, number, number]; target: readonly [number, number, number] };
export type CutsceneActor = { id: string; position: readonly [number, number, number]; heading?: number };
export type CutsceneStep = {
  kind: 'card' | 'shot'; text: string; title?: string; speaker?: string; speakerName?: string; clip?: string; image?: string;
  camera?: ShotCamera; actors?: readonly CutsceneActor[];
};
export type CutsceneDefinition = { id: string; title: string; location: PlaceId; steps: readonly CutsceneStep[] };
export type TransitionTarget = 'resume' | 'advance' | 'epilogue' | 'finish';
export type CutsceneState = {
  id: string; runId: string; index: number; ready: string[]; acknowledged: string[]; skipVotes: string[]; next: TransitionTarget;
};
export type CutsceneCommand = { type: 'ready' | 'advance' | 'skip'; runId: string; index: number };
export type CutsceneView = Omit<CutsceneState, 'next'> & {
  title: string; location: PlaceId; step: CutsceneStep; total: number; connected: string[];
};

export function startCutscene(scene: CutsceneDefinition, runId: string, next: TransitionTarget): CutsceneState {
  if (!scene.steps.length) throw new Error(`Cutscene ${scene.id} needs at least one step.`);
  return { id: scene.id, runId, index: 0, ready: [], acknowledged: [], skipVotes: [], next };
}

export function actOnCutscene(state: CutsceneState, scene: CutsceneDefinition, members: readonly string[], connected: readonly string[], playerId: string, command: CutsceneCommand, mode: CaseMode = 'co-op') {
  const reject = (message: string) => ({ ok: false, finished: false, message });
  if (!members.includes(playerId) || state.runId !== command.runId || state.index !== command.index) return reject('That scene turn is no longer active.');
  if (members.length !== investigatorCount(mode) || !members.every(id => connected.includes(id))) return reject(mode === 'solo' ? 'Reconnect to continue the scene.' : 'Waiting for both inspectors to reconnect.');
  if (command.type === 'ready') {
    if (!state.ready.includes(playerId)) state.ready.push(playerId);
    return { ok: true, finished: false, message: '' };
  }
  if (command.type === 'skip') {
    if (!state.skipVotes.includes(playerId)) state.skipVotes.push(playerId);
    return { ok: true, finished: members.every(id => state.skipVotes.includes(id)), message: mode === 'solo' ? 'Scene skipped.' : 'Skip requested. Both inspectors must agree.' };
  }
  if (!members.every(id => state.ready.includes(id))) return reject(mode === 'solo' ? 'Wait for the scene to load.' : 'Waiting for both inspectors to load the scene.');
  if (!state.acknowledged.includes(playerId)) state.acknowledged.push(playerId);
  if (!members.every(id => state.acknowledged.includes(id))) return { ok: true, finished: false, message: 'Waiting for your partner.' };
  if (state.index + 1 === scene.steps.length) return { ok: true, finished: true, message: '' };
  state.index++;
  state.ready = [];
  state.acknowledged = [];
  return { ok: true, finished: false, message: '' };
}
