import { useRef, useState, lazy, Suspense } from 'react';
import { Check, ChevronDown, Copy } from 'lucide-react';
import { useStory } from './story/StoryProvider';
import { ResetGame } from './ResetGame';
import { canStartCase } from '../../shared/game/session';
import type { Action, ActionResult, CaseView, Player } from '../../shared/game/types';
import type { Inspector } from '../../shared/story/types';
import './lobby.css';

const Portrait = lazy(() => import('./InspectorPortrait').then(module => ({ default: module.InspectorPortrait })));
type Props = { state: CaseView; playerId: string; invitation: string; pending: boolean; connected: boolean; onAction: (action: Action) => Promise<ActionResult> };

export function Lobby({ state, playerId, invitation, pending, connected, onAction }: Props) {
  const solo = state.mode === 'solo';
  const { inspectors } = useStory();
  const self = state.players.find(player => player.id === playerId)!;
  const partner = state.players.find(player => player.id !== playerId);
  const partnerOnline = connected && !!partner && !!state.connected?.includes(partner.id);
  const [feedback, setFeedback] = useState('');
  const [readyRequest, setReadyRequest] = useState<boolean | null>(null);
  const ready = readyRequest ?? !!self.ready;
  const members = state.players.map(player => player.id === playerId ? { ...player, ready } : player);
  const starting = connected && canStartCase(members, state.connected ?? [], state.mode);
  const disabled = !connected || pending || readyRequest !== null || starting;
  const act = async (action: Action) => {
    if (action.type === 'ready') setReadyRequest(action.ready);
    try {
      const result = await onAction(action);
      setFeedback(result.ok ? '' : result.message);
    } catch {
      setFeedback('Your choice could not be saved. Please try again.');
    } finally { setReadyRequest(null); }
  };
  return <main className="lobby">
    <header className="lobby-heading"><h1>Choose your inspector</h1><p>{solo ? 'Choose a detective for your solo enquiry.' : 'The case begins when you’re both ready.'}</p></header>
    <div className="inspector-selection">{inspectors.map(inspector => <InspectorChoice key={inspector.id} inspector={inspector}
      selected={!!self.selected && self.role === inspector.id} taken={!!partner?.selected && partner.role === inspector.id}
      disabled={disabled} onSelect={() => void act({ type: 'selectInspector', inspector: inspector.id })}/>)}</div>
    {!solo && <dl className="lobby-members" aria-label="Player status" role="status" aria-atomic="true">
      <MemberStatus label="You" player={{ ...self, ready }} online={connected}/>
      <MemberStatus label="Partner" player={partner} online={partnerOnline}/>
    </dl>}
    {!solo && <Invitation invitation={invitation} partnerOnline={partnerOnline}/>}
    <div className="lobby-ready">
      <button className={ready && !starting ? 'secondary' : 'primary'} aria-busy={starting} aria-describedby="lobby-ready-help" disabled={disabled || !self.selected} onClick={() => void act({ type: 'ready', ready: !ready })}>{starting ? 'Starting the case…' : ready ? 'Cancel ready' : solo ? 'Begin the case' : 'I’m ready'}</button>
      <p id="lobby-ready-help" role="status">{readyHelp({ ...self, ready }, partner, connected, partnerOnline, starting, solo)}</p>
      {feedback && <p className="lobby-feedback" role="alert">{feedback}</p>}
    </div>
    <ResetGame/>
  </main>;
}

function InspectorChoice({ inspector, selected, taken, disabled, onSelect }: { inspector: Inspector; selected: boolean; taken: boolean; disabled: boolean; onSelect: () => void }) {
  return <button className={`inspector-card${selected ? ' is-selected' : ''}${taken ? ' is-taken' : ''}`} aria-pressed={selected} disabled={disabled || taken} onClick={onSelect}>
    <Suspense fallback={<div className="inspector-portrait inspector-portrait-loading" aria-hidden="true">Loading portrait…</div>}><Portrait inspector={inspector.id}/></Suspense>
    <strong>{inspector.name}</strong><span className="inspector-description">{inspector.description}</span>
    <small>{selected && <Check size={16} aria-hidden="true"/>}{taken ? 'Chosen by your partner' : selected ? 'Your inspector' : 'Select inspector'}</small>
  </button>;
}

function MemberStatus({ label, player, online }: { label: string; player?: Player; online: boolean }) {
  const status = !player ? 'Not joined' : !online ? 'Reconnecting…' : !player.selected ? 'Choosing an inspector' : player.ready ? 'Ready' : 'Not ready';
  return <div className="lobby-member"><dt>{label}{player?.selected && <span>{player.name}</span>}</dt><dd>{status}</dd></div>;
}

function Invitation({ invitation, partnerOnline }: { invitation: string; partnerOnline: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState('');
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(invitation);
      setFeedback('Invitation copied. Send it to your partner.');
    } catch {
      input.current?.focus();
      input.current?.select();
      setFeedback('Select and copy the invitation link.');
    }
  };
  return <details className="lobby-invitation" open={!partnerOnline}>
    <summary>{partnerOnline ? 'Invite link' : 'Invite your partner'}<ChevronDown size={18} aria-hidden="true"/></summary>
    <label className="sr-only" htmlFor="lobby-invitation">Invite link</label>
    <div className="lobby-copy-row"><input ref={input} id="lobby-invitation" readOnly value={invitation} onFocus={event => event.target.select()}/><button className="secondary" onClick={() => void copy()}><Copy size={18} aria-hidden="true"/>Copy invitation</button></div>
    <p className="lobby-copy-feedback" role="status">{feedback}</p>
  </details>;
}

function readyHelp(self: Player, partner: Player | undefined, connected: boolean, partnerOnline: boolean, starting: boolean, solo: boolean) {
  if (!connected) return 'Reconnecting to your case…';
  if (!self.selected) return 'Choose an inspector to get ready.';
  if (starting) return solo ? 'Beginning your enquiry…' : 'Both inspectors are ready.';
  if (solo) return '';
  if (!self.ready) return '';
  if (!partner) return 'Waiting for your partner to join.';
  return partnerOnline ? 'Waiting for your partner to get ready.' : 'Waiting for your partner to reconnect.';
}
