import type { CaseView } from '../../../shared/game/types';
import type { SceneView } from '../../../shared/game/scene-socket';

export function overlayScene(state: CaseView, scene: SceneView | null): CaseView {
  if (!scene) return state;
  return { ...state, players: state.players.map(player => {
    const live = scene.positions[player.id];
    return live && player.location === scene.location && player.positionEpoch === live.visit
      ? { ...player, position: live.position, motion: live.motion, gesture: live.gesture } : player;
  }) };
}
