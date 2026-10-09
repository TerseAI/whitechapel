import type { Action, ActionResult, Approach, DialogueTurn, Reply, StageTimings } from '../../../shared/game/types.js';
import type { Character, CharacterKnowledge } from '../../../shared/story/types.js';

export type InterviewAction = Extract<Action, { type: 'answer' | 'question' }>;
export type Delivery = 'warm' | 'guarded' | 'defensive' | 'matter-of-fact';
export type InterviewOption = { id: string; topicId: string; approach: Approach; question: string; account: string; verbatim: boolean; reply: Omit<Reply, 'id' | 'npcId' | 'playerId' | 'at'> };
export type Decision = { knowledgeId?: string; strategy: 'engage' | 'disclose' | 'evade' | 'clarify'; delivery: Delivery; relationshipChange: -1 | 0 | 1; confidence: number; blocked: boolean; model: string };
export type Recording = { url: string; text: string; durationMs: number };
export type SpeechProgress = { requestId?: string; recording?: Recording };
export type Performance = { turns: DialogueTurn[]; model: string; fallback: boolean };
export type TurnContext = {
  npc: Character; knowledge: CharacterKnowledge[]; memories: Reply[]; conversation?: Reply[]; standing?: number; evidence: string[];
  input: string; spoken?: boolean; presented?: { id: string; title: string; description: string }; situation: string;
  investigator: { id: string; name: string; role: string };
};
export type Assessment = { safe: boolean; establishes: boolean; facts?: Record<string, number[]> };
export type TurnDraft = { decision?: Decision; performance?: Performance; assessment?: Assessment; voiceJobs?: SpeechProgress[]; recordings?: (Recording | null)[]; timings?: StageTimings; failure?: string };
export type TurnRecord = {
  id: string; playerId: string; npcId: string; fingerprint: string; action: InterviewAction; at: number;
  status: 'pending' | 'complete' | 'cancelled'; draft: TurnDraft; worker?: string; workerUntil?: number; result?: ActionResult;
};
export type PreparedTurn = { result?: ActionResult; turn?: TurnRecord; context?: TurnContext };
export interface InterviewAuthority {
  releaseInterview?(identity: { playerId: string; secret: string }, id: string, worker: string): Promise<void>;
  prepareInterview(identity: { playerId: string; secret: string }, id: string, action: InterviewAction): Promise<PreparedTurn>;
  claimInterview(identity: { playerId: string; secret: string }, id: string, worker: string): Promise<boolean>;
  saveInterview(identity: { playerId: string; secret: string }, id: string, worker: string, draft: TurnDraft): Promise<void>;
  commitInterview(identity: { playerId: string; secret: string }, id: string, worker: string): Promise<ActionResult>;
}
export interface DecisionMaker {
  decide(context: TurnContext): Promise<Decision>;
  review(context: TurnContext, decision: Decision, turns: DialogueTurn[]): Promise<Assessment>;
}
export interface CharacterPerformer { perform(context: TurnContext, decision: Decision, retry?: boolean): Promise<Performance> }
export interface SpeechProducer { synthesize(text: string, voice: string, delivery: Delivery, progress: SpeechProgress, save: () => Promise<void>): Promise<Recording> }
