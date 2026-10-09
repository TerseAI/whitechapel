import type { PhysicalObject } from '../../../shared/game/physical-objects';
import type { StoryPresentation } from '../../../shared/story/types';
import { storyImage } from '../story/StoryProvider';
export function objectArtwork(story: StoryPresentation, object: PhysicalObject, observed: string[] = [], selected?: string | null) {
  if (selected === '') return storyImage(story, object.views.initial);
  const step = selected && observed.includes(selected) ? selected : observed.at(-1);
  return storyImage(story, step && object.views.steps[step] ? object.views.steps[step].image : object.views.initial);
}
