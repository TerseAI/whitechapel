import type { SceneLayout } from '../../../shared/game/navigation';
import { witnessPosition, walkable, type Point } from '../../../shared/game/navigation';
import type { WitnessPosture } from '../../../shared/story/types';

// Ambient patrols stay close to the shared interaction point. Both clients use
// server time; approaching either investigator brings the witness back to meet them.
export const WITNESS_ATTENTION_DISTANCE = 5.5;
export const WITNESS_RETURN_SPEED = 1.4;
export function patrolEnds(id: string, index: number, indoor: boolean, layout?: SceneLayout): [Point, Point] {
  const home = witnessPosition(id, layout);
  const horizontal = indoor && index > 0;
  return [-1, 1].map(side => {
    const end = { x: home.x + (horizontal ? side : 0), z: home.z + (horizontal ? 0 : side * 1.2) };
    const clear = [0, .25, .5, .75, 1].every(t => walkable({ x: home.x + (end.x - home.x) * t, z: home.z + (end.z - home.z) * t }, indoor, layout));
    return clear ? end : home;
  }) as [Point, Point];
}
export function witnessPatrol(id: string, index: number, indoor: boolean, now: number, layout?: SceneLayout, posture?: WitnessPosture) {
  if (posture === 'seated') return { ...witnessPosition(id, layout), heading: 0, moving: false };
  const seed = [...id].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 0);
  const travel = 4.5 + seed % 4 * .35, rest = 1.8 + seed % 3 * .25;
  const half = travel + rest, phase = ((now / 1000 + seed % 97) % (half * 2) + half * 2) % (half * 2);
  const reverse = phase >= half, leg = phase % half;
  const t = Math.min(1, leg / travel), ease = t * t * (3 - 2 * t);
  const [a, b] = patrolEnds(id, index, indoor, layout), from = reverse ? b : a, to = reverse ? a : b;
  return { x: from.x + (to.x - from.x) * ease, z: from.z + (to.z - from.z) * ease,
    heading: Math.atan2(to.x - from.x, to.z - from.z), moving: leg < travel };
}
