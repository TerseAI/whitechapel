import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Shield, X } from 'lucide-react';
import type { Action, ActionResult, CaseView } from '../../../shared/game/types';
import { reportKey } from '../../../shared/game/final-report';
import './case-map.css';

type Props = { state: CaseView; playerId: string; pending: boolean; onVote: (action: Action) => Promise<ActionResult>; onClose: () => void };

export function CaseReport({ state, playerId, pending, onVote, onClose }: Props) {
  const solo = state.mode === 'solo';
  const dialog = useRef<HTMLDialogElement>(null);
  const feedback = useRef<HTMLDivElement>(null);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const completion = state.chapter.completion;
  const final = completion?.kind === 'findings';
  const continuing = completion?.kind === 'continue';
  const [selected, setSelected] = useState<string[]>(() => final ? (state.votes[playerId]?.split('|') ?? []) : []);
  const options = final ? completion.options : state.chapter.options;
  const failure = state.lastFeedback || (result?.ok === false ? result.message : null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => { if (failure) feedback.current?.focus(); }, [failure]);
  async function vote(id?: string) {
    if (pending || submitting) return;
    setSubmitting(true); setResult(null);
    try { setResult(await onVote(continuing ? { type: 'continueStage' } : final ? { type: 'finalReport', findings: selected } : { type: 'chapterVote', answer: id! })); }
    finally { setSubmitting(false); }
  }
  return <dialog ref={dialog} className="verdict-dialog case-report-dialog" aria-label={continuing ? solo ? 'Continue the enquiry' : 'Continue together' : final ? 'Final report' : 'Chapter report'} onCancel={onClose}>
    <button className="close" onClick={onClose} aria-label="Close report"><X/></button><Shield size={30}/>
    {state.ending ? <><h1>Case complete</h1><div className="ending-text">{state.ending.split('\n\n').map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div><button className="primary" onClick={onClose}>Return to your case map<ArrowRight size={16}/></button></> : state.reportAccepted ? <><h1>The report is accepted</h1><p>{state.chapter.epilogueMessage}</p><button className="primary" onClick={onClose}>Continue the enquiry<ArrowRight size={16}/></button></> : <>
      <h1>{continuing ? completion.label : final ? 'The final report' : 'Your chapter report'}</h1><p>{state.chapter.question}</p>
      {!!state.connections?.filter(item => state.questions.some(question => question.id === item.id)).length && <details className="report-findings"><summary>Review established findings</summary>{state.connections.filter(item => state.questions.some(question => question.id === item.id)).map(item => <p key={item.id}><strong>{item.title}</strong><br/>{item.explanation}</p>)}</details>}
      <p className="report-agreement">{solo ? continuing ? 'Continue when you’re ready.' : 'Choose the conclusion supported by your evidence.' : continuing ? 'Both inspectors must agree to continue.' : 'Both investigators must choose the same conclusion to submit the report. Your partner’s agreement is required, even while they are away.'}</p>
      {failure && <div ref={feedback} tabIndex={-1} className="report-failure" role="alert"><strong>Conclusion not supported</strong><p>{failure}</p><p>Choose another conclusion, or return to the case map to review your findings. Your discoveries are saved.</p></div>}
      {!failure && result?.message && <p className="report-waiting" role="status">{result.message}</p>}
      <div className="chapter-options">{!continuing && options.map(option => {
        const chosen = final ? selected.includes(option.id) : state.votes[playerId] === option.id;
        return <button key={option.id} aria-label={option.label} aria-pressed={chosen} disabled={pending || submitting} className={chosen ? 'chosen' : ''} onClick={() => final ? setSelected(items => chosen ? items.filter(id => id !== option.id) : [...items, option.id]) : void vote(option.id)}><span>{option.label}</span>{chosen ? <Check size={20}/> : <ArrowRight size={18}/>}</button>;
      })}</div>
      {continuing && <button className="primary" disabled={pending || submitting || !!state.votes[playerId]} onClick={() => void vote()}>{state.votes[playerId] ? solo ? 'Continuing…' : 'Waiting for your partner' : completion.label}</button>}
      {final && <button className="primary" disabled={pending || submitting || !selected.length} onClick={() => void vote()}>Endorse these findings</button>}
      {state.players.length > 1 && <div className="vote-status">{state.players.map(player => <p key={player.id}><span className={`presence ${state.votes[player.id] ? 'online' : ''}`}/>{player.name}: {continuing ? state.votes[player.id] ? 'Ready' : 'Not ready yet' : final ? state.votes[player.id] ? state.votes[player.id] === reportKey(selected) ? 'Same findings endorsed' : 'A different set of findings recorded' : 'Still considering' : options.find(o => o.id === state.votes[player.id])?.label ?? 'Still considering'}</p>)}</div>}
    </>}
  </dialog>;
}
