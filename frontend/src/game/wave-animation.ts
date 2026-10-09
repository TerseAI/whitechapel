import type { Point } from '../../../shared/game/navigation';

export function faceCameraHeading(position: Point, camera: Point) {
  return Math.atan2(camera.x - position.x, camera.z - position.z);
}

export function waveArmPose(progress: number | null, reducedMotion: boolean) {
  if (progress === null || progress <= 0) return { x: 0, z: 0 };
  const smooth = (x: number) => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t); };
  const lift = smooth(progress / .2) * smooth((1 - progress) / .18);
  const sway = reducedMotion ? 0 : Math.sin(Math.max(0, progress - .2) * Math.PI * 8) * .2;
  return { x: -.3 * lift, z: (-2.4 + sway) * lift };
}
