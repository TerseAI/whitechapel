import type { Action, ActionResult, Reply } from './types.js';

export type ConversationIdentity = { playerId: string; secret: string; npcId: string };
export type ConversationScope = { caseId: string; entityId: string; storyId: string; storyVersion: string };
export type ConversationMember = { playerId: string; secretHash: string };
export type ConversationPage = { replies: Reply[]; before?: number };
export type ConversationControl = { type: 'cancel'; npcId: string } | { type: 'history'; before?: number }
  | { type: 'audioChunk'; uploadId: string; index: number; data: string }
  | { type: 'transcribe'; uploadId: string }
  | { type: 'cancelMicrophone'; uploadId: string };
export type ConversationResult = ActionResult & { transcript?: string };
export type ConversationCommand = { requestId: string; action: Extract<Action, { type: 'question' | 'heartbeat' }> | ConversationControl };
export type ConversationView = ConversationPage & {
  entityId: string; revision: number;
  pending?: { id: string; playerId: string; action: Extract<Action, { type: 'question' | 'answer' }>; stage: 'decision' | 'reply' | 'review' | 'voice' };
  result?: ActionResult;
};
export type ConversationEvent = { type: 'conversation'; state: ConversationView } | { type: 'result'; requestId: string; result: ConversationResult };
export type ConversationSocketGrant = { websocketUrl: string; connectByMs: number; entityId: string };
