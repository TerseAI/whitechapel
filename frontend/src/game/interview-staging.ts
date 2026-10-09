import type { NpcView } from '../../../shared/game/types';
import type { Point, SceneLayout } from '../../../shared/game/navigation';

export function interviewWitness(npcs: NpcView[], playerId: string, location: string, now: number) {
  return npcs.find(npc => npc.location === location && npc.lease?.playerId === playerId && npc.lease.until > now);
}

export function interviewFieldOfView(aspect: number) {
  return Math.max(48, Math.min(90, Math.atan(Math.tan(24 * Math.PI / 180) / aspect) * 360 / Math.PI));
}

export function interviewView(inspector: Point, witness: Point, inspectorHeight: number, witnessEyeHeight: number, bounds?: SceneLayout['bounds'], bystanders: Point[] = []) {
  const distance = Math.hypot(inspector.x - witness.x, inspector.z - witness.z);
  const dx = distance > .001 ? (inspector.x - witness.x) / distance : 0;
  const dz = distance > .001 ? (inspector.z - witness.z) / distance : 1;
  const target: [number, number, number] = [(witness.x + inspector.x) / 2, witnessEyeHeight * .55 + inspectorHeight * .55, (witness.z + inspector.z) / 2];
  const candidates = [-1, 1].map(side => {
    const x = witness.x + dx * distance * .6 + dz * side * 3.5;
    const z = witness.z + dz * distance * .6 - dx * side * 3.5;
    const clampedX = bounds ? Math.max(bounds.minX + .3, Math.min(bounds.maxX - .3, x)) : x;
    const clampedZ = bounds ? Math.max(bounds.minZ + .3, Math.min(bounds.maxZ - .3, z)) : z;
    const obstruction = bystanders.reduce((total, person) => total + Math.max(0, 1.5 - Math.hypot(person.x - clampedX, person.z - clampedZ)), 0);
    return { position: [clampedX, Math.max(2, target[1] + .65), clampedZ] as [number, number, number], penalty: Math.hypot(x - clampedX, z - clampedZ) + obstruction * 4 };
  });
  return { target, position: candidates.sort((a, b) => a.penalty - b.penalty)[0].position };
}
