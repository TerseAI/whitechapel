import { useEffect, useRef, useState } from 'react';
import type { Action, ActionResult, NpcView, Reply } from '../../../shared/game/types';
import type { useInterviewAudio } from '../useInterviewAudio';

export type InterviewAudio = ReturnType<typeof useInterviewAudio>;
export function useInterview(npc: NpcView, ownsConversation: boolean, pending: boolean, audio: InterviewAudio, onAction: (action: Action) => Promise<ActionResult>) {
  const [replies, setReplies] = useState<Reply[]>([]);
  const [feedback, setFeedback] = useState('');
  const [waiting, setWaiting] = useState(false);
  const [asked, setAsked] = useState('');
  const sending = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const recorded = [...new Map([...npc.replies, ...replies].map(reply => [reply.id, reply])).values()];
  const cue = audio.exchange?.speech.npcId === npc.id ? audio.exchange : null;
  const generating = waiting || !!npc.pendingTurn;
  const busy = pending || generating || (ownsConversation && (!audio.ready || (!!cue && cue.status !== 'complete')));
  const asking = generating ? (npc.pendingTurn?.action.type === 'question' ? npc.pendingTurn.action.text : asked) : '';

  async function request(action: Action, question = ''): Promise<ActionResult | null> {
    if (busy || sending.current || !ownsConversation) return null;
    sending.current = true; setWaiting(true); setAsked(question); setFeedback(''); audio.unlock();
    try {
      const result = await onAction(action);
      if (!mounted.current) return result;
      if (!result.ok) { setFeedback(result.message); return result; }
      if (result.reply) setReplies(current => [...current.filter(r => r.id !== result.reply!.id), result.reply!]);
      if (result.speech) audio.playSpeech(result.speech);
      return result;
    } catch {
      if (mounted.current) setFeedback('The connection was interrupted. Try again; your discoveries are saved.');
      return null;
    } finally { sending.current = false; if (mounted.current) setWaiting(false); }
  }

  async function send(text: string, evidenceId?: string): Promise<boolean> {
    if (!text.trim()) return false;
    return !!(await request({ type: 'question', npcId: npc.id, text, spoken: true, ...(evidenceId ? { evidenceId } : {}) }, text))?.ok;
  }

  function review(reply: Reply) {
    if (busy) return;
    setFeedback(''); audio.replayInterview(npc, reply.topicId, reply);
  }
  return { cue, busy, generating, asking, feedback, recorded, send, request, review };
}
