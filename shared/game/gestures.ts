export const WAVE_DURATION_MS = 1800;
export type Gesture = { kind: 'wave'; at: number; heading: number };

export function waveProgress(gesture: Gesture | null | undefined, now: number): number | null {
  if (!gesture || now < gesture.at || now >= gesture.at + WAVE_DURATION_MS) return null;
  return (now - gesture.at) / WAVE_DURATION_MS;
}
