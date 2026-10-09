import { investigatorCount } from '../../../shared/game/case-mode';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import type { Action, ActionResult, CaseView, InterviewSpeech } from '../../../shared/game/types';
import type { CutsceneCommand } from '../../../shared/game/cutscenes';
import { useStory, storyAsset, storyImage } from '../story/StoryProvider';
import { ConversationPlayback, type ConversationCue } from '../interviews/conversation-playback';
import './cutscenes.css';

const World3D = lazy(() => import('../World3D').then(module => ({ default: module.World3D })));
type Props = { state: CaseView; playerId: string; connected: boolean; volume: number; onVolume: (volume: number) => void; onAction: (action: Action) => Promise<ActionResult> };

export function CutscenePlayer(props: Props) {
  const scene = props.state.cutscene!;
  return <CutsceneTurn key={`${scene.runId}:${scene.index}`} {...props}/>;
}

function CutsceneTurn({ state, playerId, connected, volume, onVolume, onAction }: Props) {
  const solo = state.mode === 'solo';
  const story = useStory();
  const scene = state.cutscene!;
  const step = scene.step;
  const [worldReady, setWorldReady] = useState(step.kind === 'card');
  const [audioReady, setAudioReady] = useState(false);
  const [cue, setCue] = useState<ConversationCue | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const pending = useRef(false);
  const action = useRef(onAction); action.current = onAction;
  const playback = useRef<ConversationPlayback | null>(null);
  const player = state.players.find(player => player.id === playerId)!;
  const partner = state.players.find(player => player.id !== playerId);
  const present = connected && state.players.length === investigatorCount(state.mode) && state.players.every(player => scene.connected.includes(player.id));
  const prepared = state.players.every(player => scene.ready.includes(player.id));
  const acknowledged = scene.acknowledged.includes(playerId);
  const speaker = step.speaker && (step.speakerName ?? story.inspectors.find(inspector => inspector.id === step.speaker)?.name ?? state.npcs.find(npc => npc.id === step.speaker)?.name ?? step.speaker);
  const command = async (type: CutsceneCommand['type']) => {
    const result = await action.current({ type: 'cutscene', command: { type, runId: scene.runId, index: scene.index } });
    if (!result.ok) setError(result.message);
    return result;
  };
  const commandRef = useRef(command); commandRef.current = command;

  useEffect(() => {
    const abort = new AbortController();
    const manifest = story.voices;
    playback.current = new ConversationPlayback(new Audio(), (clip, text) => manifest[clip]?.text === text ? storyAsset(story, manifest[clip].src) : null, setCue);
    setAudioReady(true);
    return () => { abort.abort(); playback.current?.stop(); };
  }, []);

  useEffect(() => {
    if (!worldReady || !audioReady || !present || scene.ready.includes(playerId)) return;
    void commandRef.current('ready');
  }, [worldReady, audioReady, present, scene.ready.includes(playerId), playerId, retry]);

  useEffect(() => {
    if (!audioReady) return;
    if (!present || !prepared || acknowledged) { playback.current?.stop(); return; }
    const speech: InterviewSpeech = { id: `${scene.runId}:${scene.index}`, npcId: scene.id, playerId, location: scene.location, chapter: state.chapter.index, at: 0, endsAt: 0,
      lines: [{ clip: step.clip ?? '', speakerId: step.speaker ?? '', speakerName: speaker || '', text: step.text, durationMs: Math.max(1500, step.text.split(/\s+/).length * 400) }] };
    playback.current?.follow(speech, volume);
  }, [audioReady, present, prepared, acknowledged, volume]);

  useEffect(() => {
    if (cue?.status !== 'complete' || acknowledged || pending.current || !present) return;
    pending.current = true;
    void commandRef.current('advance').then(result => { if (!result.ok) pending.current = false; });
  }, [cue?.status, acknowledged, present]);

  const visible = acknowledged || cue?.revealed;
  const place = state.locations.find(place => place.id === scene.location)!;
  return <main className="cutscene" aria-label={`Cutscene: ${scene.title}`}>
    {step.kind === 'shot' && <Suspense fallback={<div className="world-loading">Preparing the scene…</div>}><World3D place={place} player={player} partner={partner} npcs={state.npcs} found={[]} talking={null} approaching={null} objects={{}} paused cinematic={step} speakingId={cue?.status === 'playing' ? step.speaker : null} onReady={() => setWorldReady(true)} onArrive={() => {}} onCancelApproach={() => {}} onInspect={() => {}} onTalk={() => {}} onMove={async () => ({ ok: false, message: '' })}/></Suspense>}
    {step.image && <img className="cutscene-image" src={storyImage(story, step.image)?.src} alt={storyImage(story, step.image)?.description}/>}
    <header className="cutscene-header"><span>{scene.title}</span><span>{scene.index + 1} / {scene.total}</span><button aria-label={volume ? 'Mute cutscene' : 'Unmute cutscene'} onClick={() => onVolume(volume ? 0 : 1)}>{volume ? <Volume2/> : <VolumeX/>}</button></header>
    {step.kind === 'card' && <div className="cutscene-card">{step.title && <h1>{step.title}</h1>}{visible && <p>{step.text}</p>}</div>}
    <div className="cutscene-bottom">
      {step.kind === 'shot' && visible && <div className="cutscene-subtitle" aria-live="polite">{speaker && <strong>{speaker}</strong>}<p>{step.text}</p></div>}
      <div className="cutscene-controls">
        <span role="status">{!present ? solo ? 'Reconnecting to your case…' : 'Waiting for both inspectors to reconnect.' : !prepared ? solo ? 'Preparing the scene…' : 'Waiting for both inspectors to load the scene.' : acknowledged ? solo ? 'Continuing…' : 'Waiting for your partner.' : cue?.status === 'loading' ? 'Loading voice…' : ''}</span>
        {present && prepared && !acknowledged && <button className="primary" onClick={() => {
          if (cue?.status === 'complete') { pending.current = false; void command('advance'); }
          else if (!cue?.revealed) playback.current?.read();
          else playback.current?.advance();
        }}>{!cue?.revealed && cue?.status !== 'complete' ? 'Read instead' : cue?.status === 'playing' ? 'Skip line' : 'Continue'}</button>}
        <button className="text-button" disabled={!present || scene.skipVotes.includes(playerId)} onClick={() => void command('skip')}>{solo ? 'Skip scene' : scene.skipVotes.includes(playerId) ? 'Skip requested' : scene.skipVotes.length ? 'Agree to skip scene' : 'Skip scene together'}</button>
      </div>
      {error && <p role="alert">{error} <button onClick={() => { setError(''); setRetry(value => value + 1); }}>Retry</button></p>}
    </div>
  </main>;
}
