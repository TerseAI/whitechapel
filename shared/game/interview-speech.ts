import type { CaseView, InterviewSpeech, NpcView, Player, Reply, SpeechLine } from './types.js';
import { followupClip, investigatorClip, investigatorQuestion } from './investigator-dialogue.js';
import { replyClip } from './interviews.js';
import { generatedVoiceUrl } from './generated-voice.js';
import type { VoiceClip } from '../story/types.js';

export const SPEECH_GAP_MS = 180;
type Witness = Pick<NpcView, 'id' | 'name' | 'location' | 'greeting' | 'topics'>;
export type SpeechSubject = { kind: 'greeting' } | { kind: 'ask'; topicId: string } | { kind: 'reply'; reply: Reply };
export function createInterviewSpeech(id: string, player: Player, npc: Witness, chapter: number, subject: SpeechSubject, at: number, voices: Record<string, VoiceClip> = {}): InterviewSpeech {
  const line = (clip: string, speakerId: string, speakerName: string, text: string): SpeechLine => ({ clip, speakerId, speakerName, text, durationMs: voices[clip]?.durationMs ?? Math.max(1500, text.split(/\s+/).length * 400) });
  let lines: SpeechLine[];
  if (subject.kind === 'greeting') lines = [line(`${npc.id}-greeting`, npc.id, npc.name, npc.greeting)];
  else if (subject.kind === 'reply' && subject.reply.conversational) {
    const reply = subject.reply;
    lines = [...(reply.spoken ? [] : [line(`conversation-${id}-player`, player.id, player.name, reply.question ?? '')]),
      ...(reply.turns ?? [{ speaker: 'witness' as const, text: reply.text }]).map((turn, index) => line(`conversation-${id}-${index}`, npc.id, npc.name, turn.text))];
  } else {
    const topicId = subject.kind === 'ask' ? subject.topicId : subject.reply.topicId;
    const topic = npc.topics.find(t => t.id === topicId);
    if (!topic) throw new Error('That topic is not available.');
    const moment = subject.kind === 'ask' ? 'ask' : subject.reply.approach;
    lines = [line(investigatorClip(player.role, npc.id, topic.id, moment), player.id, player.name, subject.kind === 'reply' ? subject.reply.question ?? investigatorQuestion(npc.id, topic, moment) : investigatorQuestion(npc.id, topic, moment))];
    if (subject.kind === 'ask') lines.push(line(`${npc.id}-${topic.id}-claim`, npc.id, npc.name, topic.claim));
    else {
      const clip = replyClip(subject.reply);
      for (const [i, turn] of (subject.reply.turns ?? [{ speaker: 'witness', text: subject.reply.text }]).entries()) {
        lines.push(turn.speaker === 'investigator'
          ? line(followupClip(player.role, clip, i), player.id, player.name, turn.text)
          : line(i === 0 ? clip : `${clip}-turn-${i}`, npc.id, npc.name, turn.text));
      }
    }
  }
  if (subject.kind === 'reply' && subject.reply.recordings) {
    lines = lines.map((line, index) => {
      const recording = subject.reply.recordings?.[index];
      return recording && recording.text === line.text && generatedVoiceUrl(recording.url)
        ? { ...line, clip: recording.url, durationMs: recording.durationMs } : line;
    });
  }
  return { id, playerId: player.id, npcId: npc.id, location: npc.location, chapter, ...(subject.kind === 'ask' ? { topicId: subject.topicId } : subject.kind === 'reply' ? { topicId: subject.reply.topicId, replyId: subject.reply.id } : {}), at, endsAt: at + lines.reduce((sum, item) => sum + item.durationMs, 0) + SPEECH_GAP_MS * (lines.length - 1), lines };
}

export function speechPosition(speech: InterviewSpeech, now: number) {
  let start = speech.at;
  for (const [index, line] of speech.lines.entries()) {
    const end = start + line.durationMs;
    if (now < end) return { index, line, start, end, offset: Math.max(0, now - start) };
    start = end + SPEECH_GAP_MS;
  }
  return null;
}
export function serverNow(state: Pick<CaseView, 'serverTime' | 'receivedAt'>, now = Date.now()) {
  return state.serverTime !== undefined && state.receivedAt !== undefined ? state.serverTime + now - state.receivedAt : now;
}
export function currentInterview(state: CaseView, playerId: string, now: number, selfEnabled: boolean, partnerEnabled: boolean): InterviewSpeech | undefined {
  const listener = state.players.find(p => p.id === playerId);
  if (!listener) return;
  const ownConversation = state.npcs.some(n => n.lease?.playerId === playerId && n.lease.until > now);
  return state.speech?.filter(speech => {
    const witness = state.npcs.find(n => n.id === speech.npcId);
    const speaker = state.players.find(p => p.id === speech.playerId);
    return speech.chapter === state.chapter.index && speech.location === listener.location
      && speaker?.location === speech.location && witness?.location === speech.location
      && witness.lease?.playerId === speech.playerId && witness.lease.until > now
      && speech.endsAt > now && (speech.playerId === playerId ? selfEnabled : partnerEnabled && !ownConversation);
  }).sort((a, b) => Number(b.playerId === playerId) - Number(a.playerId === playerId) || b.at - a.at)[0];
}
