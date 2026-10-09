import type { SceneEntry, SceneScope, SceneView } from '../../../shared/game/scene-socket.js';
import type { ActionResult } from '../../../shared/game/types.js';

export interface SceneEndpoint {
  ensureVisit(scope: SceneScope, entry: SceneEntry): Promise<void>;
  leave(playerId: string, visit: number): Promise<void>;
  beginInteraction(playerId: string, visit: number, npcId: string, until: number): Promise<ActionResult>;
  setInteraction(playerId: string, visit: number, npcId: string | null, until?: number): Promise<void>;
  snapshot(): Promise<SceneView>;
}
export interface CaseScenes { scene(caseId: string, location: string): SceneEndpoint }

