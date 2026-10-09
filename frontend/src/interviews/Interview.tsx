import { canFollowUp, topicReply } from '../../../shared/game/interviews';
import { useState } from 'react';
import { ArrowRight, FileText, Mic, Play, SkipForward, Volume2, VolumeX, X } from 'lucide-react';
import type { Action, ActionResult, Evidence, NpcView, Player, Topic } from '../../../shared/game/types';
import { useInterview, type InterviewAudio } from './useInterview';
import type { ConversationCue } from './conversation-playback';
import { useVoiceTurns } from './useVoiceTurns';
import type { TranscribeRecording, VoiceState } from './voice-turns';
import './interview.css';

type Props = {
  npc: NpcView; investigator: Pick<Player, 'id' | 'name'>; evidence: Evidence[]; pending: boolean; ownsConversation: boolean;
  onAction: (action: Action) => Promise<ActionResult>; onResume: () => void; onComplete: () => void; onClose: () => void;
  onMicrophone: (npcId: string, audio: Blob, signal: AbortSignal) => Promise<string>;
  onExamine: (evidence: Evidence) => void; audio: InterviewAudio; audioEnabled: boolean; onAudioEnabled: (enabled: boolean) => void;
};
export function Interview({ npc, investigator, evidence, pending, ownsConversation, onAction, onResume, onClose, onMicrophone, onExamine, audio, audioEnabled, onAudioEnabled }: Props) {
  const session = useInterview(npc, ownsConversation, pending, audio, onAction);
  const [reviewing, setReviewing] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [freeSpeech, setFreeSpeech] = useState(false);
  const topic = npc.topics.find(item => item.id === selectedTopic);
  const discoveries = evidence.filter(item => session.recorded.some(reply => reply.reward === item.id || reply.disclosures?.some(disclosure => disclosure.reward === item.id)));
  async function ask(item: Topic) {
    const result = await session.request({ type: 'ask', npcId: npc.id, topicId: item.id }, item.ask ?? item.label);
    if (result?.ok) setSelectedTopic(item.documentId ? null : item.id);
  }
  const documents = evidence.filter(e => e.kind !== 'testimony' && session.recorded.some(reply => reply.reward === e.id));
  const asking = session.asking ? { speakerId: investigator.id, speakerName: investigator.name, text: session.asking } : null;
  return <div className="cinematic-conversation" data-speaking={session.busy}>
    <header className="conversation-heading">
      <div><span className="conversation-eyebrow">Conversation</span><h2>{npc.name}</h2><p>{npc.occupation}</p></div>
      <div className="conversation-tools"><button aria-label={audioEnabled ? 'Mute this interview' : 'Unmute this interview'} onClick={() => onAudioEnabled(!audioEnabled)}>{audioEnabled ? <Volume2 size={20}/> : <VolumeX size={20}/>}</button><button aria-label="End conversation" onClick={onClose}><X size={23}/></button></div>
    </header>
    <div className="conversation-bottom">
      {(session.cue || session.generating || pending) && <SpokenTurn cue={session.cue} audio={audio} waiting={pending || session.generating} asking={asking}/>}
      <div className="interview-decisions">
        {session.feedback && <p className="interview-feedback" role="alert">{session.feedback}</p>}
        {!ownsConversation ? <button className="primary" onClick={onResume}>Resume conversation<ArrowRight size={17}/></button> : <>
          {!session.busy && topic ? <TopicResponses topic={topic} evidence={evidence} onBack={() => setSelectedTopic(null)} onAnswer={async (approach, evidenceId) => {
            const result = await session.request({ type: 'answer', npcId: npc.id, topicId: topic.id, approach, ...(evidenceId ? { evidenceId } : {}) });
            if (result?.ok) setSelectedTopic(null);
          }}/> : !session.busy && <div className="authored-topics" aria-label="Conversation topics">
            <p>Ask about…</p><div className="interview-options">{npc.topics.map(item => {
              const recorded = topicReply(npc, item.id);
              return <button key={item.id} onClick={() => recorded?.success ? session.review(recorded) : void ask(item)} disabled={!recorded?.success && !canFollowUp(npc, item.id)}>{item.label}{recorded?.success && <span>Recorded · Replay</span>}</button>;
            })}</div>
            {npc.topics.length === 0 && <p>No further questions here. Your discoveries are on the Case Map.</p>}
          </div>}
          {npc.intelligent && <><button className="microphone-mode" aria-expanded={freeSpeech} onClick={() => setFreeSpeech(!freeSpeech)}>{freeSpeech ? 'Hide microphone' : 'Or speak in your own words'}</button>
            {freeSpeech && <ConversationInput evidence={evidence} available={!session.busy && !topic} onSend={session.send} transcribe={(recording, signal) => onMicrophone(npc.id, recording, signal)} unlock={audio.unlock}/>}</>}
        </>}
        {!session.busy && discoveries.length > 0 && <div className="conversation-discoveries" role="status"><strong>Recorded on the Case Map</strong>{discoveries.map(item => <button key={item.id} onClick={() => onExamine(item)}>{item.title}<ArrowRight size={14}/></button>)}</div>}
        {session.recorded.length > 0 && <div className="conversation-record">
          <button aria-expanded={reviewing} onClick={() => setReviewing(!reviewing)}>{reviewing ? 'Hide conversation' : 'Conversation so far'}</button>
          {reviewing && <ol aria-label="Conversation history">{session.recorded.map(reply => <li key={reply.id}>
            {reply.question && <p className="recorded-question">{reply.question}</p>}<p><strong>{npc.name}: </strong>{reply.text}</p>
            <button disabled={session.busy} aria-label={`Replay: ${reply.question ?? reply.text}`} onClick={() => session.review(reply)}><Play size={14}/>Replay</button>
          </li>)}</ol>}
        </div>}
        {documents.length > 0 && <div className="interview-documents" aria-label="Documents received">{documents.map(document => <button key={document.id} onClick={() => onExamine(document)}><FileText size={18}/><span>{document.title}</span><span>Read<ArrowRight size={14}/></span></button>)}</div>}
      </div>
    </div>
  </div>;
}

function TopicResponses({ topic, evidence, onBack, onAnswer }: { topic: Topic; evidence: Evidence[]; onBack: () => void; onAnswer: (approach: 'reassure' | 'press' | 'challenge', evidenceId?: string) => Promise<void> }) {
  const [exhibit, setExhibit] = useState('');
  const choices = topic.choices ?? [{ approach: 'reassure' as const, label: 'Ask for details' }, { approach: 'press' as const, label: 'Press for an explanation' }, { approach: 'challenge' as const, label: 'Challenge with evidence', usesEvidence: true }];
  return <div className="authored-responses" aria-label="Your response">
    {topic.observation && <p>{topic.observation}</p>}
    {choices.some(choice => choice.usesEvidence) && <label>Exhibit to present<select value={exhibit} onChange={event => setExhibit(event.target.value)}><option value="">Choose an exhibit</option>{evidence.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>}
    <div className="interview-options">{choices.map(choice => <button key={choice.approach} disabled={choice.usesEvidence && !exhibit} onClick={() => void onAnswer(choice.approach, choice.usesEvidence ? exhibit : undefined)}>{choice.label}</button>)}</div>
    <button className="text-button" onClick={onBack}>Ask about something else</button>
  </div>;
}

type Subtitle = { speakerId: string; speakerName: string; text: string };

function SpokenTurn({ cue, audio, waiting, asking }: { cue: ConversationCue | null; audio: InterviewAudio; waiting: boolean; asking: Subtitle | null }) {
  const preparing = waiting && (!cue || cue.status === 'complete');
  const subtitle = preparing ? asking : cue?.revealed ? cue.line : null;
  return <div className="spoken-turn" aria-live="polite" aria-atomic="true">
    {subtitle && <div className="interview-subtitle" key={preparing ? 'asking' : `${cue!.speech.id}-${cue!.index}`} data-speaker={subtitle.speakerId}><span>{subtitle.speakerName}</span><p>{subtitle.text}</p></div>}
    <div className="spoken-controls">
      {preparing ? <span>Waiting for a response…</span> : !cue || cue.status === 'complete' ? null : cue.status === 'reading' ? <button onClick={audio.advance}>Continue<ArrowRight size={17}/></button>
        : cue.status === 'blocked' ? <><button onClick={audio.resume}><Play size={15}/>Play voice</button><button onClick={audio.read}>Read instead</button></>
        : cue.status === 'loading' ? <><span>…</span><button onClick={audio.read}>Read instead</button></>
        : <button onClick={audio.advance}>Skip line<SkipForward size={16}/></button>}
    </div>
  </div>;
}

function ConversationInput({ evidence, available, onSend, transcribe, unlock }: { evidence: Evidence[]; available: boolean; onSend: (text: string, evidenceId?: string) => Promise<boolean>; transcribe: TranscribeRecording; unlock: () => void }) {
  const [exhibit, setExhibit] = useState('');
  const [retry, setRetry] = useState('');
  const voice = useVoiceTurns(transcribe, send, available);
  async function send(text: string) {
    setRetry('');
    if (!await onSend(text, exhibit || undefined)) setRetry(text);
  }
  const capturing = voice.status === 'hearing' || voice.status === 'transcribing';
  return <div className="interview-microphone">
    {voice.error && <p className="interview-feedback" role="alert">{voice.error}</p>}
    <div className="microphone-controls">
      <VoiceControl voice={voice} unlock={unlock}/>
      {capturing && <button onClick={voice.cancel}>Cancel</button>}
      {retry && !capturing && <button disabled={!available} onClick={() => void send(retry)}>Retry message</button>}
      {evidence.length > 0 && <select aria-label="Present an exhibit" value={exhibit} disabled={capturing || !available} onChange={event => setExhibit(event.target.value)}><option value="">No exhibit</option>{evidence.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select>}
    </div>
    <p className="microphone-hint" role="status">{voiceHint(voice, available)}</p>
    {voice.status !== 'off' && voice.status !== 'starting' && <button className="microphone-mode" onClick={() => voice.setMode(voice.mode === 'hands-free' ? 'hold' : 'hands-free')}>
      {voice.mode === 'hands-free' ? 'Use hold to talk instead' : 'Use hands-free instead'}</button>}
  </div>;
}

const statusLabels: Partial<Record<VoiceState['status'], string>> = { waiting: 'Microphone paused', listening: 'Listening', hearing: 'Hearing you', transcribing: 'Noting your words…' };

function VoiceControl({ voice, unlock }: { voice: ReturnType<typeof useVoiceTurns>; unlock: () => void }) {
  if (voice.status === 'off' || voice.status === 'starting') return <button className="primary microphone-talk" disabled={voice.status === 'starting'} onClick={() => { unlock(); voice.enable(); }}>
    <Mic size={20}/>{voice.status === 'starting' ? 'Opening microphone…' : 'Start talking'}</button>;
  const listening = voice.status === 'listening' || voice.status === 'hearing';
  if (voice.mode === 'hold') return <button className="primary microphone-talk" aria-pressed={listening} onContextMenu={event => event.preventDefault()}
    onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); voice.press(); }} onPointerUp={voice.release} onPointerCancel={voice.release}>
    <Mic size={20}/>{voice.status === 'transcribing' ? statusLabels.transcribing : 'Hold to talk'}</button>;
  return <span className="microphone-status" data-status={voice.status}><Mic size={18}/>{statusLabels[voice.status]}</span>;
}

function voiceHint(voice: VoiceState, available: boolean) {
  if (voice.status === 'off' || voice.status === 'starting') return 'Turn on your microphone once, then speak in your own words.';
  if (voice.status === 'transcribing') return 'Sending what you said…';
  if (!available) return 'Listening resumes when the reply ends.';
  if (voice.mode === 'hold') return voice.status === 'waiting' ? 'Hold Space or the button while you speak.' : 'Release when you’ve finished.';
  return 'Speak in your own words. Pause when you’ve finished.';
}
