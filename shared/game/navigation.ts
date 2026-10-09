export type Point = { x: number; z: number };
export type ApproachTarget = { kind: 'witness' | 'clue'; id: string; requestId: number };
export const WALK_SPEED = 3.4;
export const SPEAKING_DISTANCE = 2.2;
export const INSPECTION_DISTANCE = 1.8;

export function witnessPosition(id: string, layout?: SceneLayout): Point {
  const position = layout?.characters?.[id];
  if (!position) throw new Error(`Missing character placement: ${id}`);
  const [x, , z] = position;
  return { x, z };
}
export function closeEnoughToSpeak(player: Point, witness: Point) {
  return Math.hypot(player.x - witness.x, player.z - witness.z) <= SPEAKING_DISTANCE;
}
// Interviews are framed from +z. Leave room between the two people and finish
// in that front-facing cone, even when the investigator starts within earshot.
export function readyToInterview(player: Point, witness: Point) {
  const dx = player.x - witness.x, dz = player.z - witness.z;
  return dz >= 1.1 && Math.abs(dx) <= dz * .7 && closeEnoughToSpeak(player, witness);
}
export function cluePosition(index: number, indoor: boolean, layout?: SceneLayout, clueId?: string): Point {
  if (clueId && layout?.clues?.[clueId]) { const [x, , z] = layout.clues[clueId]; return { x, z }; }
  return (indoor ? [{ x: 1.6, z: -2 }, { x: -2.8, z: -6.5 }, { x: 3, z: 3 }] : [{ x: 3.1, z: -8.2 }, { x: -3.2, z: 2 }, { x: 2.7, z: 5.5 }])[index % 3];
}
export function closeEnoughToInspect(player: Point, clue: Point) {
  return Math.hypot(player.x - clue.x, player.z - clue.z) <= INSPECTION_DISTANCE;
}
export function walkable(point: Point, indoor: boolean, layout?: SceneLayout) {
  const { x, z } = point;
  const bounds = layout?.bounds ?? { minX: -4.15, maxX: 4.15, minZ: indoor ? -8 : -13, maxZ: 10 };
  if (x < bounds.minX || x > bounds.maxX || z < bounds.minZ || z > bounds.maxZ) return false;
  return !(layout?.obstacles ?? []).some(obstacle => x > obstacle.minX && x < obstacle.maxX && z > obstacle.minZ && z < obstacle.maxZ);
}

// A small half-metre grid matches the shared street/interior obstacles.
// Stop within reach, including objects on tables and crates.
export function pathToWitness(start: Point, witness: Point, indoor: boolean, layout?: SceneLayout): Point[] {
  const distance = (p: Point) => Math.hypot(p.x - witness.x, p.z - witness.z);
  const clear = (p: Point) => [[-.22, -.22], [-.22, .22], [.22, -.22], [.22, .22]].every(([x, z]) => walkable({ x: p.x + x, z: p.z + z }, indoor, layout));
  return findPath(start, indoor, p => readyToInterview(p, witness) && clear(p), (from, to) =>
    // Walk around the witness, never straight through them. An overlapping
    // starting position can still escape outwards, as can a furniture edge.
    (distance(to) >= .75 || distance(to) > distance(from)) && (clear(to) || !clear(from)), layout);
}
export function pathToClue(start: Point, clue: Point, indoor: boolean, layout?: SceneLayout): Point[] {
  return pathWithinReach(start, clue, indoor, INSPECTION_DISTANCE, layout);
}
function pathWithinReach(start: Point, destination: Point, indoor: boolean, reach: number, layout?: SceneLayout): Point[] {
  if (Math.hypot(start.x - destination.x, start.z - destination.z) <= reach) return [];
  return findPath(start, indoor, p => Math.hypot(p.x - destination.x, p.z - destination.z) <= reach - .2, undefined, layout);
}
function findPath(start: Point, indoor: boolean, arrived: (point: Point) => boolean, canStep: (from: Point, to: Point) => boolean = () => true, layout?: SceneLayout): Point[] {
  if (arrived(start) && walkable(start, indoor, layout)) return [];
  const origin = { x: Math.round(start.x * 2) / 2, z: Math.round(start.z * 2) / 2 };
  const key = (p: Point) => `${p.x},${p.z}`;
  const queue = [origin];
  const parents = new Map<string, Point | null>([[key(origin), null]]);
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const current = queue[cursor];
    if (arrived(current) && walkable(current, indoor, layout)) {
      const result: Point[] = [current];
      let previous = parents.get(key(current));
      while (previous) { result.unshift(previous); previous = parents.get(key(previous)); }
      return result;
    }
    for (const [dx, dz] of [[0, -.5], [-.5, 0], [.5, 0], [0, .5]]) {
      const next = { x: current.x + dx, z: current.z + dz };
      if (!walkable(next, indoor, layout) || !canStep(current, next) || parents.has(key(next))) continue;
      parents.set(key(next), current); queue.push(next);
    }
  }
  return [];
}
export function stepAlongPath(start: Point, route: Point[], distance: number): Point {
  let point = { ...start };
  while (route.length && distance > 0) {
    const next = route[0]; const remaining = Math.hypot(next.x - point.x, next.z - point.z);
    if (remaining <= distance) { point = { ...next }; route.shift(); distance -= remaining; }
    else { point = { x: point.x + (next.x - point.x) * distance / remaining, z: point.z + (next.z - point.z) * distance / remaining }; distance = 0; }
  }
  return point;
}
export type Rectangle = { minX: number; maxX: number; minZ: number; maxZ: number };
export type SceneLayout = { spawns?: [Point, Point]; bounds: Rectangle; obstacles: Rectangle[]; characters?: Record<string, [number, number, number]>; clues?: Record<string, [number, number, number]> };
export type SceneProp = { id: string; model: string; position: [number, number, number]; rotation?: [number, number, number]; scale?: [number, number, number]; asset?: string; color?: string };


export function inspectorSpawn(index: number, layout?: SceneLayout): Point {
  return { ...(layout?.spawns?.[index] ?? { x: index ? 1 : -1, z: 8 }) };
}
