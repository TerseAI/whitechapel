import type { WitnessPosture } from '../../../shared/story/types';

export function witnessPose(posture: WitnessPosture | undefined, height: number) {
  const seated = posture === 'seated';
  const hipHeight = seated ? .58 / height : .85;
  const bodyOffset = seated ? hipHeight - .85 : 0;
  return { seated, hipHeight, bodyOffset, shoeHeight: .09 / height, eyeHeight: (2.02 + bodyOffset) * height, labelHeight: (2.65 + bodyOffset) * height };
}
