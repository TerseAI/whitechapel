import { useEffect, useRef, useState } from 'react';
import type { CaseView } from '../../../shared/game/types';
import { useSoundEffects } from '../audio/SoundEffects';
import { CaseProgress, type ChapterCompletion } from './case-progress';

export function useCaseProgress(state: CaseView | null) {
  const progress = useRef(new CaseProgress());
  const [completion, setCompletion] = useState<ChapterCompletion | null>(null);
  const { play } = useSoundEffects();
  useEffect(() => {
    if (!state) return;
    const update = progress.current.observe(state);
    update.sounds.forEach((cue, index) => play(cue, index * .85));
    if (state.phase === 'cutscene' || state.chapter.completion?.kind === 'continue') setCompletion(null);
    else if (update.completed && !state.chapter.briefing) setCompletion(null);
    else if (update.completed) setCompletion(update.completed);
  }, [state, play]);
  return { completion, dismissCompletion: () => setCompletion(null) };
}
