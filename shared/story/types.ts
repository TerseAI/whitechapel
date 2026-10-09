import type { Approach, DialogueTurn, Evidence, GamePlace, InterviewOutcome, Topic, Deduction, StoryGate } from '../game/types.js';
import type { ChapterFlow } from '../game/progression.js';
import type { InvestigationGuidance } from '../game/investigation.js';
import type { CutsceneDefinition } from '../game/cutscenes.js';
import type { PhysicalObject } from '../game/physical-objects.js';
import type { Reconstruction } from '../game/reconstructions.js';
import type { DistrictAtlas, GeographicSite } from '../geography/atlas.js';

export type ImageAsset = { src: string; width: number; height: number; description: string };
export type WitnessPosture = 'standing' | 'seated';
export type HatPlacement = 'head' | 'lap';
export type CharacterAppearance = {
  coat: string; waistcoat: string; hair: string; skin: string; accent: string;
  hat: 'none' | 'cap' | 'bowler' | 'bonnet' | 'helmet' | 'top';
  beard: 'none' | 'moustache' | 'full' | 'sideburns' | 'drooping' | 'handlebar';
  height: number; build: number; face: [number, number, number];
  hairStyle?: 'short' | 'chignon' | 'braided-coil' | 'pinned-plait';
  garment?: 'lounge' | 'frock' | 'work-jacket' | 'police-tunic' | 'day-dress';
  neckwear?: string;
  dress?: boolean; shawl?: string; apron?: string; balding?: boolean; chain?: boolean;
};
export type Inspector = { id: string; name: string; description: string; appearance: CharacterAppearance };
export type SourcePage = {
  label: string; heading?: string; artwork: string; kicker?: string; date?: string; description?: string;
  paragraphs?: string[]; fields?: [string, string][]; signature?: string; marginalia?: string;
  table?: { columns: string[]; rows: string[][]; annotation?: { row: number; column: number; text: string } };
};
export type StoryDocument = { id: string; title: string; format: string; presentation?: 'photograph'; pages: SourcePage[] };
export type VoiceClip = { src: string; text: string; durationMs: number; hash?: string };
export type Branch = { endsInterview?: boolean; text: string; turns?: DialogueTurn[]; reward?: string; choice?: { id: string; value: string } };
export type CharacterMind = {
  identity: string; persona: string; manner?: string; goals: string[]; voice: string; model?: string;
  background?: string[]; knowledge?: CharacterKnowledge[];
  disclosures?: { description: string; terms: string[]; afterEvidence: string; message: string }[];
};
export type CharacterKnowledge = StoryGate & {
  id: string; topicId: string; subject: string; facts: string[]; when: string;
  requiresEvidence?: string; requiresPresented?: string[]; afterUnsuccessfulTopic?: string;
  reward?: string; choice?: { id: string; value: string };
};
export type TopicResponse = Branch & { success: boolean; outcome?: InterviewOutcome };
export type TopicResponses = { reassure?: TopicResponse; press?: TopicResponse; challenge?: TopicResponse };
export type StoryTopic = Topic & { performance?: 'natural' | 'verbatim'; correct: Approach; proof?: string; proofAlternatives?: string[]; success: Branch; failure: Branch; responses?: TopicResponses };
export type Character = { entityId: string; mind?: CharacterMind; portrait?: string; posture?: WitnessPosture; hatPlacement?: HatPlacement; id: string; name: string; occupation: string; location: string; appearance: CharacterAppearance; greeting: string; historical: string; topics: StoryTopic[]; repeatable?: boolean; requiredTopics?: string[] };
export type Chapter = {
  guidance?: InvestigationGuidance;
  flow: ChapterFlow; briefing?: string; requiredInterviews?: string[];
  title: string; date: string; opening: string; goal: string;
  locations: GamePlace[]; epilogueLocations: GamePlace[];
  npcIds: string[]; epilogueNpcIds: string[]; clueIds: string[]; reviewEvidence: string[];
  deductionIds: string[]; requiredEvidence: string[]; question: string;
  options: { id: string; label: string }[]; acceptedAnswers: string[];
  decision?: string; report: string; reportByAnswer: Record<string, string>;
};
export type StoryPresentation = {
  id: string; version: string; title: string; subtitle: string; description: string;
  cover?: string; music?: string; assets: Record<string, ImageAsset>; models: Record<string, string>;
  inspectors: Inspector[]; sites: Record<string, GeographicSite>; map?: DistrictAtlas;
  voices: Record<string, VoiceClip>;
};
export type StoryDefinition = StoryPresentation & {
  schemaVersion: 2; chapters: Chapter[]; characters: Character[]; clues: Record<string, Evidence & { chapter: number }>;
  deductions: Deduction[]; documents: Record<string, StoryDocument>; objects: Record<string, PhysicalObject>;
  reconstructions: Reconstruction[]; cutscenes: CutsceneDefinition[]; ending: string;
};
