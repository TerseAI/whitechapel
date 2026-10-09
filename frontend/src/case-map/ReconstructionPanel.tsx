import { useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import type { Action, ActionResult, CaseView, Evidence } from '../../../shared/game/types';
import type { ReconstructionView } from '../../../shared/game/reconstructions';

export function ReconstructionPanel({ reconstruction, pair, state, pending, onAction, onExamine }: {
  reconstruction: ReconstructionView; pair: [string, string]; state: CaseView; pending: boolean;
  onAction: (action: Action) => Promise<ActionResult>; onExamine: (evidence: Evidence) => void;
}) {
  const [order, setOrder] = useState(() => reconstruction.events.map(event => event.id));
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);
  const solved = state.deductions.includes(reconstruction.id);
  function move(index: number, direction: number) {
    const next = [...order];
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    setOrder(next); setFeedback('');
  }
  async function submit() {
    setBusy(true);
    try { const result = await onAction({ type: 'deduce', evidenceIds: pair, sequence: order }); setFeedback(result.message); }
    finally { setBusy(false); }
  }
  return <section className="sequence-reconstruction" aria-label={reconstruction.title}>
    <h2>{reconstruction.title}</h2><p>{reconstruction.instruction}</p>
    <div className="reconstruction-sources">{pair.map(id => {
      const evidence = state.evidence.find(item => item.id === id);
      return evidence && <button key={id} className="secondary" onClick={() => onExamine(evidence)}>{evidence.title}</button>;
    })}</div>
    <ol>{order.map((id, index) => <li key={id}><span>{reconstruction.events.find(event => event.id === id)?.label}</span><div>
      <button aria-label={`Move step ${index + 1} earlier`} disabled={solved || index === 0} onClick={() => move(index, -1)}><ArrowUp size={16}/></button>
      <button aria-label={`Move step ${index + 1} later`} disabled={solved || index === order.length - 1} onClick={() => move(index, 1)}><ArrowDown size={16}/></button>
    </div></li>)}</ol>
    <button className="primary" disabled={pending || busy || solved} onClick={() => void submit()}>{solved ? 'Finding recorded' : 'Record this reconstruction'}</button>
    {feedback && <p role="status">{feedback}</p>}
  </section>;
}
