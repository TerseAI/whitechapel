import type { CaseView } from '../../../shared/game/types';
import type { SoundCue } from '../audio/sound-effects';

export type ChapterCompletion = { chapter: number; title: string; report: string; final: boolean };
type Progress = { sounds: SoundCue[]; completed?: ChapterCompletion };

export class CaseProgress {
  private previous: CaseView | null = null;

  observe(state: CaseView): Progress {
    const before = this.previous;
    if (before?.roomId === state.roomId && state.revision < before.revision) return { sounds: [] };
    this.previous = state;
    if (!before || before.roomId !== state.roomId) return { sounds: [] };
    if (state.phase === 'solved' && before.phase !== 'solved') {
      return { sounds: ['chapter'], completed: { chapter: state.chapter.index + 1, title: state.chapter.title, report: 'Your conclusion is supported by the evidence. The final report is ready.', final: true } };
    }
    if (state.chapter.index > before.chapter.index) {
      const report = state.chapterReports[state.chapter.index - 1];
      return { sounds: ['chapter'], completed: { chapter: state.chapter.index, title: report?.title ?? before.chapter.title, report: report?.text ?? 'Your conclusion is supported by the evidence.', final: false } };
    }
    const sounds: SoundCue[] = [];
    if (state.deductions.some(id => !before.deductions.includes(id))) sounds.push('link');
    if (state.canConclude && !before.canConclude) sounds.push('review');
    return { sounds };
  }
}
