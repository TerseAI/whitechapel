import { Check, ChevronDown } from 'lucide-react';
import type { Action, ActionResult, CaseView, Evidence } from '../../../shared/game/types';
import type { LeadView } from '../../../shared/game/investigation';

type Props = { unread?: Evidence[]; onReviewDiscoveries?: () => void; state: CaseView; playerId: string; pending: boolean; onAction: (action: Action) => Promise<ActionResult>; onLead: (lead: LeadView) => void; onExamine: (evidence: Evidence) => void };
export function CaseQuestions(props: Props) {
  const { state, unread = [], onReviewDiscoveries, onExamine } = props;
  const open = state.questions.filter(question => !state.deductions.includes(question.id));
  const established = state.questions.filter(question => state.deductions.includes(question.id));
  const leads = state.guidance?.leads ?? [];
  return <aside className="case-questions" aria-label="Questions and findings">
    {state.questions.length > 0 && <div className="map-questions-disclosure">
      <div className="questions-heading"><h2>Questions to answer</h2><span>{established.length}/{state.questions.length}</span></div>
      {open.map(question => <section className="open-question" key={question.id}><h3>{question.title}</h3><p>{question.question}</p></section>)}
      {!open.length && <p className="questions-complete"><Check size={16}/>All questions answered.</p>}
      {established.length > 0 && <details className="established-findings"><summary>Established findings <span>{established.length}</span><ChevronDown size={16}/></summary>
        {established.map(question => <section key={question.id} className="question-established"><h3><Check size={16}/>{question.title}</h3><p>{state.connections?.find(finding => finding.id === question.id)?.explanation ?? question.question}</p></section>)}
      </details>}
    </div>}
    {leads.length > 0 && <details open className="map-leads-disclosure"><summary>Leads to follow <span>{leads.filter(lead => lead.complete).length}/{leads.length}</span><ChevronDown size={16}/></summary>
      {[...leads].sort((a, b) => Number(a.complete) - Number(b.complete)).map(lead => <Lead key={lead.id} {...props} lead={lead}/>)}
    </details>}
    <details className="investigation-purpose"><summary>Enquiry objective<ChevronDown size={16}/></summary><h3>{state.chapter.goal}</h3><p>{state.guidance?.introduction ?? state.chapter.opening}</p></details>
    {unread.length > 0 && <details open className="discovery-recap"><summary>New discoveries <span>{unread.length}</span><ChevronDown size={16}/></summary><Discoveries evidence={unread} state={state} onExamine={onExamine}/><button className="text-button" onClick={onReviewDiscoveries}>Mark as reviewed</button></details>}
    {state.evidence.length > 0 && <details className="discovery-recap"><summary>Discovery record<ChevronDown size={16}/></summary><Discoveries evidence={[...state.evidence].reverse()} state={state} onExamine={onExamine}/></details>}
  </aside>;
}

function Lead({ lead, state, playerId, pending, onAction, onLead }: Props & { lead: LeadView }) {
  if (lead.complete) return <details className="completed-lead"><summary><Check size={16}/>{lead.title}<ChevronDown size={16}/></summary><p>{lead.detail} Recorded in your shared case.</p></details>;
  const owner = state.players.find(player => player.id === lead.assignedTo);
  return <section className="open-lead"><h3>{lead.title}</h3><p>{lead.detail}</p>
    {owner && <p>{owner.name} is following this lead{!state.connected?.includes(owner.id) ? ' · away' : ''}.</p>}
    <div className="lead-actions">
      {(lead.location || lead.character || lead.hotspot) && <button className="lead-follow" disabled={pending} onClick={() => onLead(lead)}>Follow this lead</button>}
      {state.mode === 'co-op' && (!owner || owner.id === playerId) && <button disabled={pending} onClick={() => void onAction({ type: 'followLead', leadId: lead.id, following: !owner })}>{owner ? 'Stop following' : 'I’ll take this lead'}</button>}
      {lead.hintLevel < lead.hintCount && <button disabled={pending} onClick={() => void onAction({ type: 'hint', leadId: lead.id })}>{lead.hintLevel ? 'More help' : 'Show a hint'}</button>}
    </div>
    {lead.hint && <p className="lead-hint" role="status">Hint {lead.hintLevel}/{lead.hintCount}: {lead.hint}</p>}
  </section>;
}

function Discoveries({ evidence, state, onExamine }: Pick<Props, 'state' | 'onExamine'> & { evidence: Evidence[] }) {
  return <ol>{evidence.map(item => <li key={item.id}><button onClick={() => onExamine(item)}>{item.title}</button><small>{state.players.find(player => player.id === item.foundBy)?.name ?? 'Shared discovery'}</small></li>)}</ol>;
}
