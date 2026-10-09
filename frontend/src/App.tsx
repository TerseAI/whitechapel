import { useDiscoveryRecord } from './case-map/useDiscoveryRecord';
import type { LeadView } from '../../shared/game/investigation';
import type { CaseMode } from '../../shared/game/case-mode';
import { interviewEnded } from '../../shared/game/interviews';
import { loadCredentials, saveCredentials, sessionKey } from './story/session-storage';
import { StoryProvider, useStory } from './story/StoryProvider';
import { StoryDocumentReader } from './documents/StoryDocumentReader';
import { Lobby } from './Lobby';
import { ResetGame } from './ResetGame';
import { CutscenePlayer } from './cutscenes/CutscenePlayer';
import { ScenePanel } from './ScenePanel';
import { Interview } from './interviews/Interview';
import { WelcomeBackdrop } from './WelcomeBackdrop';
import './welcome.css';
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, Compass, Copy, FileText, Headphones, Hourglass, MapPin, Network, Volume2, VolumeX, X } from 'lucide-react';
import type { Action, ActionResult, CaseView, Credentials, Evidence, NpcView, PlaceId } from '../../shared/game/types';
import { useCase } from './useCase';
import { MovementSender } from './game/movement';
import { useInterviewAudio } from './useInterviewAudio';
import { useMusic } from './useMusic';
import { VolumeControls, useSavedVolume } from './VolumeControls';
import { PartnerButton } from './PartnerButton';
import { sceneProgress } from '../../shared/game/scene-progress';
import { EvidenceDocument } from './EvidenceDocument';
import { objectForEvidence } from '../../shared/game/physical-objects';
import { closeEnoughToInspect, cluePosition, type ApproachTarget, type Point } from '../../shared/game/navigation';

import { ConnectionCelebration } from './case-map/ConnectionCelebration';
import { CaseReport } from './case-map/CaseReport';
import { ChapterTransition } from './case-map/ChapterTransition';
import { useCaseProgress } from './case-map/useCaseProgress';
import { SoundEffectsProvider, useSoundEffects } from './audio/SoundEffects';

const CaseMap = lazy(() => import('./case-map/CaseMap').then(module => ({ default: module.CaseMap })));
const World3D = lazy(() => import('./World3D').then(module => ({ default: module.World3D })));
const ObjectInspector = lazy(() => import('./objects/ObjectInspector').then(module => ({ default: module.ObjectInspector })));

type View = 'explore' | 'board';
function Lamp({ className = '' }: { className?: string }) { return <svg className={className} width="32" height="44" viewBox="0 0 32 44" fill="none" aria-hidden="true"><path d="M7 13h18l-3 15H10L7 13Zm9-10v5m0 20v13m-8 0h16M4 13l12-6 12 6" stroke="currentColor" strokeWidth="1.5"/><path d="M16 17v7" stroke="currentColor" strokeWidth="2"/></svg>; }
export function App() {
  return <StoryProvider><SoundEffectsProvider><Game/></SoundEffectsProvider></StoryProvider>;
}

function Game() {
  const story = useStory();
  const [credentials, setCredentials] = useState<Credentials | null>(() => loadCredentials(story));
  const { state, connection, error, pending, act, microphone } = useCase(credentials);
  const discoveries = useDiscoveryRecord(state, credentials?.playerId);
  const { volume: effectsVolume, setVolume: setEffectsVolume } = useSoundEffects();
  const { completion, dismissCompletion } = useCaseProgress(state);
  const [view, setView] = useState<View>('explore');
  const [boardPlacesOpen, setBoardPlacesOpen] = useState(false);
  useEffect(() => setBoardPlacesOpen(false), [view]);
  const [inspection, setInspection] = useState<Evidence | { objectId: string } | null>(null);
  const physicalObjects = state?.objects ?? {};
  const inspectedObject = inspection && ('objectId' in inspection ? physicalObjects[inspection.objectId] : objectForEvidence(inspection.id, physicalObjects));
  const [talking, setTalking] = useState<string | null>(null);
  const [approaching, setApproaching] = useState<ApproachTarget | null>(null);
  const approachGeneration = useRef(0);
  const movementQueue = useRef<Promise<void>>(Promise.resolve());
  const movementSender = useMemo(() => new MovementSender(move => act({ type: 'move', ...move }, true)), [act]);
  const cancelApproach = () => { approachGeneration.current++; setApproaching(null); };
  const sendPosition = (x: number, z: number, moving = false, heading?: number) => {
    const request = movementSender.send({ x, z, moving, heading });
    movementQueue.current = request.then(() => undefined);
    return request;
  };
  const [notice, setNotice] = useState('');
  const [selfVolume, setSelfVolume] = useSavedVolume('self');
  const [partnerVolume, setPartnerVolume] = useSavedVolume('partner');
  const [musicVolume, setMusicVolume] = useSavedVolume('music', .3);
  const audioEnabled = selfVolume > 0;
  const lastSelfVolume = useRef(selfVolume || 1);
  if (selfVolume > 0) lastSelfVolume.current = selfVolume;
  const setAudioEnabled = (enabled: boolean) => setSelfVolume(enabled ? lastSelfVolume.current : 0);
  const interviewAudio = useInterviewAudio(state, credentials?.playerId, selfVolume, partnerVolume, talking);
  useMusic(!!credentials && !!state, musicVolume, interviewAudio.cue?.status === 'playing');
  const [invite, setInvite] = useState(false);
  const [verdict, setVerdict] = useState(false);
  const [briefing, setBriefing] = useState(false);
  const [briefingSeen, setBriefingSeen] = useState(false);
  const places = state?.locations ?? [];
  useEffect(() => {
    if (!state?.chapter || !credentials) return;
    if (state.phase !== 'investigating') {
      setBriefing(false); setTalking(null); setInspection(null); setVerdict(false); setInvite(false); cancelApproach();
      return;
    }
    const key = sessionKey(story, `briefing.${state.roomId}.${credentials.playerId}.${state.chapter.index}`);
    let seen = false;
    try { seen = localStorage.getItem(key) === 'seen'; } catch {}
    if (!seen && state.guidance?.leads.length) setView('board');
    setBriefingSeen(seen); setBriefing(!!state.chapter.briefing && !seen);
    setTalking(null); setInspection(null); setVerdict(false); cancelApproach();
  }, [state?.roomId, state?.chapter.index, state?.phase, credentials?.playerId]);
  const closeBriefing = () => {
    setBriefing(false); setBriefingSeen(true);
    if (state && credentials) try { localStorage.setItem(sessionKey(story, `briefing.${state.roomId}.${credentials.playerId}.${state.chapter.index}`), 'seen'); } catch { /* The case can still be played without local storage. */ }
  };
  useEffect(() => { if (state?.phase === 'solved') setVerdict(true); }, [state?.phase]);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(noticeTimer.current), []);
  const doAction = async (action: Action) => {
    const result = await act(action);
    clearTimeout(noticeTimer.current);
    const shortMessages: Partial<Record<Action['type'], string>> = { inspect: '', examineObject: '', answer: '', ask: '', deduce: 'Deduction recorded.', begin: '', end: '', travel: '' };
    setNotice(result.ok ? shortMessages[action.type] ?? result.message : result.message);
    if (result.ok) noticeTimer.current = setTimeout(() => setNotice(''), 5000);
    return result;
  };
  const closeConversation = async () => { interviewAudio.stop(); if (talking) await doAction({ type: 'end', npcId: talking }); setTalking(null); };
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !document.querySelector('dialog[open]')) { setInspection(null); setInvite(false); if (talking) void closeConversation(); } };
    window.addEventListener('keydown', escape); return () => window.removeEventListener('keydown', escape);
  });
  const player = state?.players.find(p => p.id === credentials?.playerId);
  useEffect(() => {
    if (!player || connection !== 'live' || state?.phase !== 'investigating') return;
    const activity = view === 'board' ? 'casebook' : 'investigating';
    if ((player.activity ?? 'investigating') !== activity) void act({ type: 'activity', activity }, true);
  }, [view, player?.id, player?.activity, connection, state?.phase, act]);
  const partner = state?.players.find(p => p.id !== credentials?.playerId);
  const place = places.find(p => p.id === player?.location) ?? places[0];
  const npc = state?.npcs.find(n => n.id === talking);
  const ownsConversation = !!npc?.lease && npc.lease.playerId === credentials?.playerId && npc.lease.until > Date.now();
  const invitation = credentials ? `${location.origin}/?case=${credentials.roomId}` : '';
  const travel = async (location: PlaceId) => {
    cancelApproach(); await movementQueue.current;
    const result = await doAction({ type: 'travel', location });
    if (result.ok) { setTalking(null); setInspection(null); setView('explore'); }
  };
  const openConversation = async (n: NpcView) => {
    const result = await doAction({ type: 'begin', npcId: n.id });
    if (result.ok) { setView('explore'); setInspection(null); setTalking(n.id); }
  };
  const begin = async (n: NpcView) => {
    if (interviewEnded(n)) { setVerdict(true); return; }
    interviewAudio.unlock();
    const requestId = ++approachGeneration.current;
    setApproaching(null); setInspection(null);
    if (talking && talking !== n.id) await closeConversation();
    await movementQueue.current;
    if (approachGeneration.current !== requestId) return;
    if (player?.location !== n.location) {
      const moved = await doAction({ type: 'travel', location: n.location });
      if (!moved.ok || approachGeneration.current !== requestId) return;
    }
    setView('explore'); setApproaching({ kind: 'witness', id: n.id, requestId });
  };
  const openClue = async (clueId: string, requestId: number) => {
    const result = await doAction({ type: 'inspect', clueId });
    if (approachGeneration.current !== requestId || !result.ok) return;
    if (result.objectId) setInspection({ objectId: result.objectId });
    else if (result.evidence) setInspection(result.evidence);
  };
  const inspectClue = async (clueId: string, locationId = place.id) => {
    if (!state || !player) return;
    const destination = state.locations.find(p => p.id === locationId);
    const index = destination?.hotspots.findIndex(h => h.id === clueId) ?? -1;
    if (!destination || index < 0) return;
    const requestId = ++approachGeneration.current;
    setApproaching(null); setInspection(null);
    if (talking) await closeConversation();
    await movementQueue.current;
    if (approachGeneration.current !== requestId) return;
    if (player.location !== locationId) {
      const moved = await doAction({ type: 'travel', location: locationId });
      if (!moved.ok || approachGeneration.current !== requestId) return;
    } else if (closeEnoughToInspect(player.position, cluePosition(index, destination.indoor, destination.navigation, clueId))) {
      await openClue(clueId, requestId); return;
    }
    setView('explore'); setApproaching({ kind: 'clue', id: clueId, requestId });
  };
  const followLead = (lead: LeadView) => {
    const witness = state?.npcs.find(npc => npc.id === lead.character);
    if (witness) void begin(witness);
    else if (lead.hotspot && lead.location) void inspectClue(lead.hotspot, lead.location);
    else if (lead.location) void travel(lead.location);
  };
  const arriveAtTarget = async (target: ApproachTarget, position: Point, heading?: number) => {
    if (approachGeneration.current !== target.requestId) return;
    const moved = await sendPosition(position.x, position.z, false, heading);
    if (approachGeneration.current !== target.requestId) return;
    setApproaching(null);
    if (!moved.ok) return;
    if (target.kind === 'clue') await openClue(target.id, target.requestId);
    else {
      const witness = state?.npcs.find(n => n.id === target.id);
      if (witness) await openConversation(witness);
    }
  };
  if (!credentials) return <Welcome onJoin={setCredentials} />;
  if (!state || !player) return <main className="connecting"><Lamp/><h1>Opening your case</h1><p>{error || 'Retrieving your saved investigation…'}</p><button className="text-button" onClick={() => { setCredentials(null); localStorage.removeItem(sessionKey(story, 'last')); }}>Back to the entrance</button><ResetGame/></main>;
  if (state.phase === 'lobby') return <Lobby state={state} playerId={player.id} invitation={invitation} pending={pending} connected={connection === 'live'} onAction={doAction}/>;
  if (state.phase === 'cutscene' && state.cutscene) return <CutscenePlayer state={state} playerId={player.id} connected={connection === 'live'} volume={selfVolume} onVolume={setSelfVolume} onAction={act}/>;
  return <div className={`game-shell ${talking || inspection || briefing || completion ? 'has-dialog' : ''} ${talking && view === 'explore' ? 'is-interviewing' : ''}`}>
    <header className="topbar">
      <nav aria-label="Case navigation">{([['explore', Compass, 'Explore'], ['board', Network, 'Case map']] as const).map(([id, Icon, label]) => <button key={id} aria-label={label} className={view === id ? 'active' : ''} onClick={() => { cancelApproach(); setView(id); }}><Icon size={17}/><span>{label}</span>{id === 'board' && discoveries.unread.length > 0 && <span className="nav-count" title="New discoveries to review">{discoveries.unread.length}</span>}</button>)}{view === 'explore' && <button className="next-steps-nav" onClick={() => { cancelApproach(); setView('board'); }}>{state.canConclude ? state.chapter.completion?.label ?? 'Review findings' : 'What next?'}</button>}{state.chapter.briefing && <button className="briefing-nav" aria-label="Case briefing" title="Case briefing" onClick={() => { cancelApproach(); setBriefing(true); }}><FileText size={17}/><span>Briefing</span></button>}</nav>
      <div className="top-actions">
        <VolumeControls solo={state.mode === 'solo'} selfVolume={selfVolume} partnerVolume={partnerVolume} musicVolume={musicVolume} effectsVolume={effectsVolume} onSelfChange={setSelfVolume} onPartnerChange={setPartnerVolume} onMusicChange={setMusicVolume} onEffectsChange={setEffectsVolume} onOpen={interviewAudio.unlock}/>
        {state.mode === 'co-op' && <PartnerButton partner={partner} open={invite} onClick={() => setInvite(!invite)}/>}
      </div>
    </header>
    {state.mode === 'co-op' && invite && <aside className="invite-panel"><button className="close" onClick={() => setInvite(false)} aria-label="Close invitation"><X size={18}/></button><h2>Co-op game for two</h2><p>{player.name}</p><label htmlFor="invite-link">Your invitation</label><div className="copy-row"><input id="invite-link" readOnly value={invitation} onFocus={e => e.target.select()}/><button aria-label="Copy invitation" onClick={() => { void navigator.clipboard.writeText(invitation).then(() => setNotice('Invitation copied. Send it to your partner.')).catch(() => setNotice('Select and copy the invitation link.')); }}><Copy size={18}/></button></div></aside>}
    <div className="workspace">
      <aside className="location-rail" id="travel-locations" hidden={view === 'board' && !boardPlacesOpen}>
        <div className="rail-title"><h2>{"Places to visit"}</h2><span>Chapter {state.chapter.index + 1}/{state.chapter.total}</span></div>
        <div className="location-list" aria-label="Travel locations">{places.map(p => {
          const progress = sceneProgress(p, state.evidence.map(e => e.id), state.npcs);
          return <button key={p.id} disabled={pending} aria-current={place.id === p.id ? 'location' : undefined} className={place.id === p.id ? 'selected' : ''} onClick={() => void travel(p.id)}>
            <span className="location-marker">{progress.complete ? <Check className="scene-complete" size={17} aria-label="Available interactions explored"/> : place.id === p.id ? <MapPin size={16}/> : <span className="location-circle"/>}</span>
            <span>{p.name}{(progress.complete || p.hotspots.length > 0) && <small>{progress.complete ? 'Available interactions explored' : `${progress.objectsExamined} of ${p.hotspots.length} objects examined`}</small>}{!progress.complete && progress.interviewsTotal > 0 && <small>{progress.interviewsExamined} of {progress.interviewsTotal} conversations explored</small>}</span><ChevronRight size={14}/>
          </button>;
        })}</div>
      </aside>
      <main className={`main-stage ${view !== 'explore' ? 'reading-stage' : ''}`}>
        {view === 'explore' && <>
          <Suspense fallback={<div className="world-loading">{"Loading game"}</div>}><World3D place={place} objects={state.objects} inspections={state.inspections} serverTime={state.serverTime} receivedAt={state.receivedAt} player={player} partner={partner} npcs={state.npcs.filter(n => n.location === place.id)} found={state.evidence.map(e => e.id)} talking={talking} speakingId={interviewAudio.cue?.status === 'playing' ? interviewAudio.cue.line.speakerId : null} approaching={approaching} paused={briefing || verdict || !!completion || !!inspection || invite} onArrive={(target, position, heading) => void arriveAtTarget(target, position, heading)} onCancelApproach={cancelApproach} onInspect={id => void inspectClue(id)} onTalk={n => void begin(n)} onMove={sendPosition} onWave={heading => act({ type: 'wave', heading }, true)}/></Suspense><div className="scene-shade"/>
          <div className="scene-heading"><div><h1>{place.name}</h1>{place.subtitle && <p><MapPin size={13}/>{place.subtitle}</p>}</div>{state.chapter.date && <time className="scene-date">{state.chapter.date}</time>}</div>
          {approaching && <div className="scene-bottom"><div className="walk-status"><span>Walking to {approaching.kind === 'witness' ? state.npcs.find(n => n.id === approaching.id)?.name : place.hotspots.find(h => h.id === approaching.id)?.label}…</span><button className="text-button" onClick={cancelApproach}>Stop</button></div></div>}

          {npc && <ScenePanel className="interview-panel cinematic-interview" label={`Interview with ${npc.name}`} onClose={() => void closeConversation()}>
            <Interview onMicrophone={microphone} key={npc.id} npc={npc} investigator={player} evidence={state.evidence} pending={pending} ownsConversation={ownsConversation} onComplete={() => { void closeConversation(); setVerdict(true); }} onAction={doAction} onResume={() => void begin(npc)} onClose={() => void closeConversation()} onExamine={setInspection} audio={interviewAudio} audioEnabled={audioEnabled} onAudioEnabled={setAudioEnabled}/>
          </ScenePanel>}
        </>}
        {view === 'board' && <Suspense fallback={<div className="world-loading">Opening the case map…</div>}><CaseMap key={`${state.roomId}.${state.chapter.index}`} state={state} playerId={player.id} onLead={followLead} unread={discoveries.unread} onReviewDiscoveries={() => discoveries.review()} pending={pending} onAction={doAction} onExamine={setInspection} onReport={() => setVerdict(true)} onExplore={() => setView('explore')} placesToggle={<button className="board-places-toggle" aria-label={boardPlacesOpen ? 'Hide places to visit' : 'Show places to visit'} aria-expanded={boardPlacesOpen} aria-controls="travel-locations" onClick={() => setBoardPlacesOpen(!boardPlacesOpen)}><MapPin size={16}/><span>Places</span></button>}/></Suspense>}
      </main>
    </div>
    <footer className="case-footer"><div className="saved"><span className={`presence ${connection === 'live' ? 'online' : ''}`}/>{connection === 'live' ? "Connected" : 'Reconnecting…'}</div><ResetGame/><div className="status-message" role="status" aria-live="polite">{error || (!talking && !inspection && !briefing ? notice : '')}</div><span className="footer-chapter">Chapter {state.chapter.index + 1} of {state.chapter.total}</span></footer>
    {interviewAudio.cue?.status === 'playing' && interviewAudio.cue.speech.playerId !== player.id && <aside className="partner-interview-listening" aria-label="Listening to partner interview"><Headphones size={16}/><span>{state.players.find(p => p.id === interviewAudio.cue!.speech.playerId)?.name} · {state.npcs.find(n => n.id === interviewAudio.cue!.speech.npcId)?.name}</span><button onClick={() => setPartnerVolume(0)} aria-label="Mute this partner interview"><VolumeX size={16}/></button></aside>}
    {!talking && interviewAudio.error === 'gesture' && <button className="audio-unlock" onClick={interviewAudio.resume}><Volume2 size={16}/>Hear the conversation</button>}
    {!talking && interviewAudio.error === 'load' && <p className="audio-load-warning" role="status">A voice clip could not load. The dialogue is still available to read.</p>}
    {inspection && <ScenePanel key={inspectedObject?.id ?? ('id' in inspection ? inspection.id : '')} className={inspectedObject ? 'object-dialog' : 'document-dialog'} label={inspectedObject?.title ?? ('title' in inspection ? inspection.title : 'Evidence')} onClose={() => setInspection(null)}>
      {inspectedObject ? <Suspense fallback={<div className="world-loading">Opening the inspection…</div>}><ObjectInspector key={inspectedObject.id} objectId={inspectedObject.id} state={state} playerId={player.id} onAction={doAction} onEvidence={setInspection} onClose={() => setInspection(null)} onCaseMap={view !== 'board' ? () => { if (talking) void closeConversation(); setView('board'); setInspection(null); } : undefined}/></Suspense>
        : 'id' in inspection && <EvidenceDocument key={inspection.id} evidence={inspection} onClose={() => setInspection(null)} onCaseMap={view !== 'board' ? () => { if (talking) void closeConversation(); setView('board'); setInspection(null); } : undefined}/>}
    </ScenePanel>}
    {briefing && !verdict && !completion && <ChapterBrief state={state} seen={briefingSeen} onClose={closeBriefing}/>}
    {verdict && !completion && <CaseReport key={state.chapter.index} state={state} playerId={player.id} pending={pending} onVote={doAction} onClose={() => setVerdict(false)}/>}
    {completion && <ChapterTransition completion={completion} nextChapter={state.chapter.index} briefing={!!state.chapter.briefing} onContinue={() => { dismissCompletion(); setView('board'); if (completion.final) setVerdict(true); else { setVerdict(false); setBriefing(!!state.chapter.briefing); } }}/>}
    <ConnectionCelebration state={state} visible={view === 'board' && !completion && !briefing && !verdict} onOpenMap={() => { setView('board'); setInspection(null); }}/>
  </div>;
}

function Welcome({ onJoin }: { onJoin: (c: Credentials) => void }) {
  const story = useStory();
  const invitedRoom = new URLSearchParams(location.search).get('case');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const join = async (mode: CaseMode = 'co-op') => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/cases', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(invitedRoom ? { roomId: invitedRoom } : { mode }), signal: AbortSignal.timeout(30_000) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error ?? 'Unable to open the case.');
      const c = data.credentials as Credentials;
      saveCredentials(story, c);
      history.replaceState({}, '', `/?case=${c.roomId}`); onJoin(c);
    } catch (e) { setError(e instanceof Error ? e.message : 'The case could not be opened. Try again.'); }
    finally { setBusy(false); }
  };
  return <main className="welcome">
    <WelcomeBackdrop/>
    <div className="welcome-shade"/>
    <div className="welcome-content">
      <h1>{story.title}</h1>
      <p className="welcome-premise">Mystery game based in Victorian London.</p>
      <form onSubmit={event => { event.preventDefault(); void join(); }}>
        <div className="enter-row">
          <button className="primary" disabled={busy} aria-busy={busy}>{busy ? 'Opening the case…' : invitedRoom ? 'Join your partner' : 'Play with a partner'}<ArrowRight size={18} aria-hidden="true"/></button>
          {!invitedRoom && <button className="secondary" type="button" disabled={busy} onClick={() => void join('solo')}>Play solo</button>}
        </div>
      </form>
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  </main>;
}

function ChapterBrief({ state, seen, onClose }: { state: CaseView; seen: boolean; onClose: () => void }) {
  const document = state.chapter.briefing;
  return document && <ScenePanel className="document-dialog" label={document.title} onClose={onClose}><StoryDocumentReader document={document} onClose={onClose} action={{ label: seen ? 'Continue the enquiry' : 'Begin the enquiry', onSelect: onClose }}/></ScenePanel>;
}
