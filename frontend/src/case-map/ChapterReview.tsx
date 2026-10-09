import { Check, ClipboardCheck } from 'lucide-react';
import type { CaseView } from '../../../shared/game/types';


export function ChapterReview({ state, onReport }: { state: CaseView; onReport: () => void }) {
  const progress = state.progress;
  const complete = state.questions.filter(q => state.deductions.includes(q.id)).length;
  const remaining = progress ? [[progress.evidence, 'required discoveries'], [progress.deductions, 'findings'], [progress.interviews, 'required interviews']].filter(([count]) => typeof count !== 'string' && count.total > 0).map(([count, label]) => typeof count !== 'string' ? `${count.done}/${count.total} ${label}` : '').join(' · ') : '';
  const solved = state.phase === 'solved';
  const ready = state.canConclude || solved;
  const continuing = state.chapter.completion?.kind === 'continue';
  const title = solved ? 'Case complete' : state.reportAccepted ? 'Report accepted' : ready ? continuing ? 'Ready to continue' : 'Ready to review the findings' : state.questions.length ? `${complete} of ${state.questions.length} questions answered` : 'Follow the leads below';
  return <div className={`chapter-review ${ready ? 'is-ready' : ''}`}>
    <div className="chapter-review-progress" role="status">
      {ready ? <Check size={24}/> : <ClipboardCheck size={24}/>}
      <div>{state.chapter.index > 0 && !solved && <span className="completed-chapters"><Check size={13}/>{state.chapter.index} {state.chapter.index === 1 ? 'chapter' : 'chapters'} complete</span>}<strong>{title}</strong><p>{solved ? 'The enquiry is complete.' : state.reportAccepted ? state.chapter.epilogueMessage : ready ? continuing ? state.mode === 'solo' ? 'Continue when you’re ready.' : 'Continue when you and your partner are ready.' : 'The evidence is in. Choose the conclusion it supports.' : remaining || 'Collect discoveries by speaking to people and inspecting objects.'}</p>
        {!ready && !!state.outstanding?.length && <p>Still needed: {state.outstanding.slice(0, 2).join('; ')}.</p>}
      </div>
    </div>
    <button className="primary" disabled={!ready} onClick={onReport}>{solved ? 'Read the ending' : state.chapter.completion?.label ?? 'Review this chapter'}</button>
  </div>;
}
