export const NOTEBOOK_PAGE_Y = .031;
type Point = [number, number, number];

export function interviewNotesMotion(time: number, speaking: boolean, reducedMotion: boolean): { tip: Point; writing: boolean } {
  if (speaking) return { tip: [.02, NOTEBOOK_PAGE_Y + .055, -.035], writing: false };
  if (reducedMotion) return { tip: [.008, NOTEBOOK_PAGE_Y + .016, -.016], writing: false };
  const phase = time % 5.8;
  const strength = smoothstep(0, .25, phase) * (1 - smoothstep(3.3, 3.75, phase));
  return {
    tip: [
      .008 + strength * (.028 * Math.sin(time * 1.8) + .005 * Math.sin(time * 29)),
      NOTEBOOK_PAGE_Y + (1 - strength) * .016,
      -.016 + strength * .009 * Math.sin(time * 11),
    ],
    writing: strength > .05,
  };
}

function smoothstep(min: number, max: number, value: number) {
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return t * t * (3 - 2 * t);
}
