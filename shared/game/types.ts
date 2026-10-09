import type { SiteId } from '../geography/atlas.js';
import type { InvestigatorId } from './investigators.js';
import type { CutsceneCommand, CutsceneView } from './cutscenes.js';
import type { StoryDocument, CharacterAppearance, WitnessPosture, HatPlacement } from '../story/types.js';
import type { PhysicalObject } from './physical-objects.js';
import type { ReconstructionView } from './reconstructions.js';
import type { SceneLayout, SceneProp } from './navigation.js';
import type { CompletionView } from './progression.js';
import type { CaseMode } from './case-mode.js';
import type { ChapterProgress, GuidanceView } from './investigation.js';

export type PlaceId = string;
export type Approach = 'reassure' | 'press' | 'challenge';
export type Player = { gesture?: import('./gestures.js').Gesture | null; id: string; name: string; role: InvestigatorId; selected?: boolean; ready?: boolean; location: PlaceId; lastSeen: number; position: { x: number; z: number }; activity?: 'investigating' | 'casebook'; positionEpoch?: number; motion?: { at: number; moving: boolean; heading: number } };
export type Credentials = { roomId: string; playerId: string; secret: string };
export type Evidence = { id: string; title: string; description: string; detail: string; provenance: string; location: PlaceId; kind: 'object' | 'testimony'; documentId?: string; document?: StoryDocument; image?: string; foundBy?: string; chapter?: number; statements?: EvidenceStatement[] };
export type EvidenceStatement = { id: string; witnessId: string; witnessName: string; investigatorName: string; question?: string; turns: DialogueTurn[] };
export type GamePlace = StoryGate & { scene: 'basic-room' | 'basic-yard' | 'model'; sceneAsset?: string; backdrop?: string; props?: SceneProp[]; navigation?: SceneLayout; id: PlaceId; siteId: SiteId; name: string; subtitle: string; description: string; indoor: boolean; hotspots: { id: string; label: string; x: number; y: number; hideWhenFound?: boolean }[] };
export type ChapterView = { index: number; total: number; title: string; date: string; opening: string; goal: string; question: string; options: { id: string; label: string }[]; reviewEvidence?: string[]; completion?: CompletionView; epilogueMessage?: string; briefing?: StoryDocument };
export type DialogueTurn = { speaker: 'investigator' | 'witness'; text: string };
export type StoryGate = { requiresAll?: string[]; requiresDeduction?: string; requiresChoice?: { id: string; value: string }; requiresReport?: boolean };
export type Topic = StoryGate & { id: string; label: string; ask?: string; claim: string; observation: string; documentId?: string; choices?: { approach: Approach; label: string; usesEvidence?: boolean }[]; requiresEvidence?: string; afterUnsuccessfulTopic?: string };
export type InterviewOutcome = 'detailed' | 'brief' | 'closed';
export type GeneratedRecording = { url: string; text: string; durationMs: number };
export type StageTimings = { decisionMs?: number; performanceMs?: number; reviewMs?: number; voiceMs?: number };
export type Reply = { establishedFacts?: Record<string, number[]>; disclosures?: { knowledgeId: string; topicId: string; reward?: string; choice?: { id: string; value: string } }[]; spoken?: boolean; conversational?: boolean; knowledgeId?: string; relationshipChange?: -1 | 0 | 1; recordings?: (GeneratedRecording | null)[]; performance?: { director: string; performer: string; delivery: string; fallback: boolean; timings?: StageTimings }; endsInterview?: boolean; id: string; npcId: string; topicId: string; playerId: string; text: string; turns?: DialogueTurn[]; clip?: string; question?: string; success: boolean; approach: Approach; evidenceId?: string; reward?: string; choice?: { id: string; value: string }; outcome?: InterviewOutcome; at: number };
export type SpeechLine = { clip: string; speakerId: string; speakerName: string; text: string; durationMs: number };
export type InterviewSpeech = { id: string; npcId: string; playerId: string; location: PlaceId; chapter: number; topicId?: string; replyId?: string; at: number; endsAt: number; lines: SpeechLine[] };
export type NpcView = { intelligent?: boolean; pendingTurn?: { id: string; playerId: string; action: Extract<Action, { type: 'answer' | 'question' }> }; portrait?: string; posture?: WitnessPosture; hatPlacement?: HatPlacement; appearance?: CharacterAppearance; repeatable?: boolean; requiredTopics?: string[]; id: string; name: string; occupation: string; location: PlaceId; greeting: string; historical: string; trust: number; lease: { playerId: string; until: number } | null; topics: Topic[]; replies: Reply[] };
export type Deduction = StoryGate & { id: string; title: string; question: string; explanation: string; requires: [string, string]; alternatives?: [string, string][] };
export type CaseConnection = { id: string; title: string; explanation: string; evidenceIds: [string, string] };
export type CaseView = {
  guidance?: GuidanceView; progress?: ChapterProgress;
  mode: CaseMode;
  storyId?: string; storyVersion?: string; objects?: Record<string, PhysicalObject>;
  roomId: string; revision: number; phase: 'lobby' | 'investigating' | 'cutscene' | 'solved';
  connected?: string[]; cutscene?: CutsceneView;
  chapter: ChapterView; locations: GamePlace[]; questions: { id: string; title: string; question: string }[]; canConclude: boolean; chapterReports: { title: string; text: string }[];
  players: Player[]; evidence: Evidence[]; deductions: string[]; npcs: NpcView[];
  connections?: CaseConnection[];
  inspections?: Record<string, string[]>;
  log: { id: string; text: string; at: number }[];
  notes: { id: string; playerId: string; text: string }[];
  votes: Record<string, string>; ending: string | null; lastFeedback: string | null;
  speech?: InterviewSpeech[]; serverTime?: number; receivedAt?: number;
  decisions?: Record<string, string>; reportAccepted?: boolean; outstanding?: string[];
};
export type Action =
  | { type: 'wave'; heading: number }
  | { type: 'hint'; leadId: string }
  | { type: 'followLead'; leadId: string; following: boolean }
  | { type: 'selectInspector'; inspector: InvestigatorId }
  | { type: 'ready'; ready: boolean }
  | { type: 'cutscene'; command: CutsceneCommand }
  | { type: 'continueStage' }
  | { type: 'move'; x: number; z: number; moving?: boolean; heading?: number }
  | { type: 'activity'; activity: 'investigating' | 'casebook' }
  | { type: 'travel'; location: PlaceId }
  | { type: 'inspect'; clueId: string }
  | { type: 'examineObject'; objectId: string; stepId: string }
  | { type: 'begin'; npcId: string }
  | { type: 'ask'; npcId: string; topicId: string }
  | { type: 'end'; npcId: string }
  | { type: 'question'; npcId: string; text: string; spoken?: boolean; evidenceId?: string }
  | { type: 'answer'; npcId: string; topicId: string; approach: Approach; evidenceId?: string }
  | { type: 'deduce'; evidenceIds: [string, string]; sequence?: string[] }
  | { type: 'note'; text: string }
  | { type: 'finalReport'; findings: string[] }
  | { type: 'chapterVote'; answer: string }
  | { type: 'heartbeat' };
export type ActionResult = { pending?: boolean; ok: boolean; message: string; evidence?: Evidence; objectId?: string; observed?: string[]; reply?: Reply; speech?: InterviewSpeech; reconstruction?: ReconstructionView };
