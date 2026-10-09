import type { CaseView } from '../../../shared/game/types';
import type { ConversationView } from '../../../shared/game/conversation-socket';

export function overlayConversation(state: CaseView, conversation: ConversationView): CaseView {
  const speech = conversation.result?.speech;
  return { ...state, npcs: state.npcs.map(npc => {
    const replies = conversation.replies.filter(reply => reply.npcId === npc.id);
    const pending = conversation.pending?.action.npcId === npc.id ? conversation.pending : undefined;
    if (!replies.length && !pending) return npc;
    const merged = new Map(npc.replies.map(reply => [reply.id, reply]));
    for (const reply of replies) merged.set(reply.id, reply);
    return { ...npc, replies: [...merged.values()].sort((a, b) => a.at - b.at),
      pendingTurn: pending && !merged.has(pending.id) ? pending : npc.pendingTurn && !merged.has(npc.pendingTurn.id) ? npc.pendingTurn : undefined };
  }), ...(speech ? { speech: [...(state.speech ?? []).filter(item => item.id !== speech.id), speech] } : {}) };
}
