import { useRef, useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import type { Action, ActionResult, CaseView, Evidence } from '../../../shared/game/types';
import { hasPendingObjectEvidence, observedObjectSteps, objectPlacement, objectStepBlock } from '../../../shared/game/physical-objects';
import { cluePosition, closeEnoughToInspect } from '../../../shared/game/navigation';
import { ObjectIllustration } from './ObjectIllustration';
import { actionView, inspectionActions, viewImage } from './inspection-actions';
import './objects.css';

type Props = {
  objectId: string; state: CaseView; playerId: string; onAction: (action: Action) => Promise<ActionResult>;
  onClose: () => void; onCaseMap?: () => void; onEvidence: (evidence: Evidence) => void;
};

export function ObjectInspector({ objectId, state, playerId, onAction, onClose, onCaseMap, onEvidence }: Props) {
  const object = state.objects![objectId];
  const found = state.evidence.map(e => e.id);
  const [confirmed, setConfirmed] = useState<string[]>([]);
  const observed = [...new Set([...observedObjectSteps(object, state.inspections ?? {}, found), ...confirmed])];
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);
  const placement = objectPlacement(object, state.chapter.index, state.locations);
  const player = state.players.find(p => p.id === playerId);
  const atObject = !!placement && player?.location === placement.place.id && closeEnoughToInspect(player.position, cluePosition(placement.index, placement.place.indoor, placement.place.navigation, placement.place.hotspots[placement.index].id));
  const canInspect = atObject && state.phase === 'investigating';
  const grounds = { mode: state.mode, found, deductions: state.deductions, members: state.players.filter(member => state.connected?.includes(member.id)) };
  const actions = canInspect ? inspectionActions(object, observed, hasPendingObjectEvidence(object, state.chapter.index, found)) : [];
  const visibleStep = selected === '' ? '' : selected && observed.includes(selected) ? selected : observed.at(-1) ?? '';
  const visibleActions = actions.filter(step => viewImage(object, actionView(step)) === viewImage(object, visibleStep));
  const nextView = actions.find(step => !objectStepBlock(object, step, observed, grounds)) ?? actions[0];
  const recorded = object.steps.filter(item => observed.includes(item.id));
  const recovered = object.evidence.filter(item => !item.reviewAsObject).flatMap(item => state.evidence.filter(e => e.id === item.id));
  const inspect = async (id: string) => {
    if (inFlight.current) return;
    const next = object.steps.find(item => item.id === id);
    if (!next) return;
    setSelected(id); setError('');
    if (observed.includes(id) && (!canInspect || !hasPendingObjectEvidence(object, state.chapter.index, found))) return;
    const blocked = objectStepBlock(object, next, observed, grounds);
    if (!canInspect || blocked) { setError(blocked ?? 'Return to the object to continue its inspection.'); return; }
    inFlight.current = true; setBusy(true);
    try {
      const result = await onAction({ type: 'examineObject', objectId, stepId: id });
      if (result.ok) { setConfirmed(result.observed ?? []); setSelected(id); }
      else setError(result.message);
    } catch { setError('The inspection could not be saved. Try again.'); }
    finally { inFlight.current = false; setBusy(false); }
  };
  return <section className="object-inspector" aria-label={`Inspect ${object.title}`}>
    <header className="object-heading"><h2>{object.title}</h2><button aria-label="Close inspection" onClick={onClose}><X size={22}/></button></header>
    <div className="object-body">
      <ObjectIllustration object={object} observed={observed} selected={selected} actions={visibleActions.map(step => ({ ...step, blocked: objectStepBlock(object, step, observed, grounds) }))} disabled={busy} onInspect={id => void inspect(id)}/>
    </div>
    <div className="object-controls">
      {recorded.length > 0 && <label className="object-detail-select">View detail<select aria-label="View examined detail" value={visibleStep} onChange={event => setSelected(event.target.value)}><option value="">Whole object</option>{recorded.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>}
      {nextView && !visibleActions.some(step => step.id === nextView.id) && <button className="secondary" onClick={() => setSelected(actionView(nextView))}>Continue inspection<ArrowRight size={16}/></button>}
      <span className="object-status" role="status" aria-live="polite">{busy ? 'Examining…' : object.evidence.some(item => found.includes(item.id)) ? 'Recorded on the Case Map' : ''}</span>
      {!canInspect && actions.length === 0 && recorded.length < object.steps.length && <p className="object-review-note">Return to the object to inspect further.</p>}
      {error && <p className="object-error" role="alert">{error}</p>}
      {recovered.map(item => <button className="secondary object-recovered" key={item.id} onClick={() => onEvidence(item)}>Read {item.title.toLowerCase()}<ArrowRight size={16}/></button>)}
      <details className="object-descriptions"><summary>Descriptions</summary><div>
        {recorded.length ? recorded.map(item => <p key={item.id}>{item.observation}</p>) : <p>Examine a detail to read its description.</p>}
      </div></details>
    </div>
    <footer className="object-footer"><button className="secondary" onClick={onClose}>Put down</button>{onCaseMap && <button className="secondary" onClick={onCaseMap}>Open the Case Map<ArrowRight size={16}/></button>}</footer>
  </section>;
}
