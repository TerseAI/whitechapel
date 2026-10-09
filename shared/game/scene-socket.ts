import type { Action, ActionResult, CaseView, Player } from './types.js';
import type { Point } from './navigation.js';

export type SceneIdentity = { playerId: string; secret: string; visit: number };
export type SceneEntry = { playerId: string; secretHash: string; visit: number; position: Point };
export type SceneScope = { caseId: string; location: string; chapter: number; epoch: number; phase: CaseView['phase'] };
export type ScenePosition = { visit: number; position: Point; motion: NonNullable<Player['motion']>; gesture: import('./gestures.js').Gesture | null };
export type SceneView = { location: string; epoch: number; revision: number; positions: Record<string, ScenePosition> };
export type SceneCommand = { requestId: string; action: Extract<Action, { type: 'move' | 'wave' | 'heartbeat' }> };
export type SceneEvent = { type: 'scene'; state: SceneView } | { type: 'result'; requestId: string; result: ActionResult };
export type SceneSocketGrant = { websocketUrl: string; connectByMs: number; location: string; visit: number };
