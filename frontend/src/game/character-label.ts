import type { CharacterAppearance, HatPlacement, WitnessPosture } from '../../../shared/story/types';
import { witnessPose } from './witness-pose';

export function characterLabelHeight(appearance: CharacterAppearance, posture?: WitnessPosture, hatPlacement: HatPlacement = 'head'): number {
  const { bodyOffset } = witnessPose(posture, appearance.height);
  const crown = Math.max(appearance.balding ? .4901 : .563, hatPlacement === 'lap' ? 0 : headwearTop[appearance.hat]);
  return (1.76 + crown * appearance.face[1] + bodyOffset + .025) * appearance.height + .3;
}

// Local crown heights match Person's head and Headwear geometry in World3D.
const headwearTop: Record<CharacterAppearance['hat'], number> = {
  none: 0, cap: .5504, bowler: .715, bonnet: .5785, helmet: .855, top: .87,
};
