import { useCallback, useEffect, useRef, useState } from 'react';
import type { CaseView, InterviewSpeech, NpcView, Reply } from '../../shared/game/types';
import { createInterviewSpeech, currentInterview, serverNow } from '../../shared/game/interview-speech';
import { SpeechPlayback, type SpeechCue } from './game/speech-playback';
import { ConversationPlayback, type ConversationCue } from './interviews/conversation-playback';
import { useStory, storyAsset } from './story/StoryProvider';
import { generatedVoiceUrl } from '../../shared/game/generated-voice';

export function useInterviewAudio(state: CaseView | null, playerId: string | undefined, selfVolume: number, partnerVolume: number, talking: string | null) {
  const story = useStory();
  const latest = useRef({ state, playerId, selfVolume, talking });
  latest.current = { state, playerId, selfVolume, talking };
  const [exchange, setExchange] = useState<ConversationCue | null>(null);
  const [partnerCue, setPartnerCue] = useState<SpeechCue | null>(null);
  const [error, setError] = useState<'gesture' | 'load' | null>(null);
  const [ready, setReady] = useState(false);
  const own = useRef<ConversationPlayback | null>(null);
  const partner = useRef<SpeechPlayback | null>(null);
  const resumeAfterEffect = useRef<(() => void) | null>(null);
  const activeNpc = useRef<string | null>(null);
  const received = useRef(new Set<string>());
  const manifest = useRef(story.voices);
  const clock = useCallback(() => latest.current.state ? serverNow(latest.current.state) : Date.now(), []);

  useEffect(() => {
    const url = (clip: string, text: string) => generatedVoiceUrl(clip) ?? (manifest.current[clip]?.text === text ? storyAsset(story, manifest.current[clip].src) : null);
    const playback = own.current ??= new ConversationPlayback(new Audio(), url, setExchange, 'playing');
    const listener = partner.current ??= new SpeechPlayback(new Audio(), url, setPartnerCue, setError);
    resumeAfterEffect.current?.();
    resumeAfterEffect.current = null;
    setReady(true);
    return () => { resumeAfterEffect.current = playback.suspend(); listener.stop(); };
  }, []);

  useEffect(() => {
    if (!state || !playerId || !ready) return;
    const npc = state.npcs.find(n => n.id === talking && n.lease?.playerId === playerId);
    if (activeNpc.current !== (npc?.id ?? null)) { own.current?.stop(); received.current.clear(); activeNpc.current = npc?.id ?? null; }
    own.current?.setVolume(selfVolume);
    if (npc) {
      const speech = state.speech?.filter(s => s.npcId === npc.id && s.playerId === playerId && s.chapter === state.chapter.index).sort((a, b) => b.at - a.at)[0];
      if (speech && !received.current.has(speech.id)) { received.current.add(speech.id); own.current?.follow(speech, selfVolume); }
    }
    partner.current?.follow(currentInterview(state, playerId, clock(), false, partnerVolume > 0), clock, partnerVolume);
  }, [state, playerId, talking, selfVolume, partnerVolume, clock, ready]);

  const playSpeech = useCallback((speech: InterviewSpeech) => {
    activeNpc.current = speech.npcId;
    received.current.add(speech.id);
    own.current?.follow(speech, latest.current.selfVolume);
  }, []);
  const replayInterview = useCallback((npc: NpcView, topicId?: string, reply?: Reply) => {
    const current = latest.current;
    const player = current.state?.players.find(p => p.id === (reply?.playerId ?? current.playerId));
    if (!player || !current.state) return;
    playSpeech(createInterviewSpeech(`replay-${crypto.randomUUID()}`, player, npc, current.state.chapter.index, reply ? { kind: 'reply', reply } : topicId ? { kind: 'ask', topicId } : { kind: 'greeting' }, clock(), story.voices));
  }, [clock, playSpeech]);
  const stop = useCallback(() => { own.current?.stop(); partner.current?.stop(); }, []);
  return {
    cue: exchange ?? partnerCue, exchange, error, ready, playSpeech, replayInterview, stop,
    advance: () => own.current?.advance(), read: () => own.current?.read(),
    resume: () => { own.current?.resume(); partner.current?.resume(); },
    unlock: () => { own.current?.prime(); partner.current?.prime(); },
  };
}
