import { z } from 'zod';
import { validateProgression } from '../game/progression.js';
import { validateStoryReferences } from './references.js';
import type { StoryDefinition, StoryPresentation } from './types.js';

const id = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/);
const text = z.string();
const ids = z.array(id);
const point = z.tuple([z.number(), z.number(), z.number()]);
const assetPath = z.string().regex(/^(?!\/)(?!.*(?:^|\/)\.\.?(?:\/|$))[a-zA-Z0-9_./-]+$/, 'Use a relative asset path without traversal.');
const record = <T extends z.ZodType>(schema: T) => z.record(id, schema);
const option = z.object({ id, label: text }).strict();
const choice = z.object({ id, value: text }).strict();
const gate = { requiresAll: ids.optional(), requiresDeduction: id.optional(), requiresChoice: choice.optional(), requiresReport: z.boolean().optional() };
const image = z.object({ src: assetPath, width: z.number().positive(), height: z.number().positive(), description: text }).strict();
const appearance = z.object({
  coat: text, waistcoat: text, hair: text, skin: text, accent: text,
  hat: z.enum(['none', 'cap', 'bowler', 'bonnet', 'helmet', 'top']), beard: z.enum(['none', 'moustache', 'full', 'sideburns', 'drooping', 'handlebar']),
  height: z.number().positive(), build: z.number().positive(), face: point,
  hairStyle: z.enum(['short', 'chignon', 'braided-coil', 'pinned-plait']).optional(),
  garment: z.enum(['lounge', 'frock', 'work-jacket', 'police-tunic', 'day-dress']).optional(),
  neckwear: text.optional(),
  dress: z.boolean().optional(), shawl: text.optional(), apron: text.optional(), balding: z.boolean().optional(), chain: z.boolean().optional(),
}).strict();
const rectangle = z.object({ minX: z.number(), maxX: z.number(), minZ: z.number(), maxZ: z.number() }).strict();
const layout = z.object({ spawns: z.tuple([z.object({ x: z.number(), z: z.number() }), z.object({ x: z.number(), z: z.number() })]).optional(), bounds: rectangle, obstacles: z.array(rectangle), characters: record(point).optional(), clues: record(point).optional() }).strict();
const prop = z.object({ id, model: z.enum(['box', 'sphere', 'cylinder', 'image', 'gltf']), position: point, rotation: point.optional(), scale: point.optional(), asset: id.optional(), color: text.optional() }).strict();
const location = z.object({
  id, siteId: id, name: text, subtitle: text, description: text, indoor: z.boolean(), scene: z.enum(['basic-room', 'basic-yard', 'model']),
  sceneAsset: id.optional(), backdrop: id.optional(), props: z.array(prop).optional(), navigation: layout.optional(),
  hotspots: z.array(z.object({ id, label: text, x: z.number(), y: z.number(), hideWhenFound: z.boolean().optional() }).strict()), ...gate,
}).strict();
const completion = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('report') }).strict(),
  z.object({ kind: z.literal('continue'), label: text }).strict(),
  z.object({ kind: z.literal('findings'), options: z.array(option), supported: ids, rejection: text }).strict(),
]);
const flow = z.object({ entry: id, entryCutscene: id.optional(), completion,
  after: z.object({ target: z.enum(['advance', 'epilogue', 'finish']), cutscene: id.optional() }).strict(),
  epilogue: z.object({ entry: id, requiredEvidence: ids, message: text, cutscene: id.optional() }).strict().optional(),
}).strict();
const lead = z.object({ id, title: text, detail: text, location: id.optional(), character: id.optional(), hotspot: id.optional(), ...gate,
  completeWhen: z.object({ evidence: ids.optional(), deduction: id.optional() }).strict(), hints: z.array(z.string().min(1)).optional(),
}).strict();
const chapter = z.object({ flow, guidance: z.object({ introduction: text, leads: z.array(lead) }).strict().optional(), briefing: id.optional(), requiredInterviews: ids.optional(), title: text, date: text, opening: text, goal: text,
  locations: z.array(location).min(1), epilogueLocations: z.array(location), npcIds: ids, epilogueNpcIds: ids, clueIds: ids, reviewEvidence: ids, deductionIds: ids, requiredEvidence: ids,
  question: text, options: z.array(option), acceptedAnswers: ids, decision: id.optional(), report: text, reportByAnswer: z.record(z.string(), text),
}).strict();
const page = z.object({ label: text, heading: text.optional(), artwork: id, kicker: text.optional(), date: text.optional(), description: text.optional(), paragraphs: z.array(text).optional(),
  fields: z.array(z.tuple([text, text])).optional(), signature: text.optional(), marginalia: text.optional(),
  table: z.object({ columns: z.array(text), rows: z.array(z.array(text)), annotation: z.object({ row: z.number().int().min(0), column: z.number().int().min(0), text }).strict().optional() }).strict().optional(),
}).strict();
const document = z.object({ id, title: text, format: text, presentation: z.literal('photograph').optional(), pages: z.array(page).min(1) }).strict();
const branch = z.object({ endsInterview: z.boolean().optional(), text, turns: z.array(z.object({ speaker: z.enum(['investigator', 'witness']), text }).strict()).optional(), reward: id.optional(), choice: choice.optional() }).strict();
const topic = z.object({ id, label: text, ask: text, claim: text, observation: text, documentId: id.optional(), performance: z.enum(['natural', 'verbatim']).optional(),
  choices: z.array(z.object({ approach: z.enum(['reassure', 'press', 'challenge']), label: text, usesEvidence: z.boolean().optional() }).strict()).optional(),
  requiresEvidence: id.optional(), afterUnsuccessfulTopic: id.optional(), ...gate,
  correct: z.enum(['reassure', 'press', 'challenge']), proof: id.optional(), proofAlternatives: ids.optional(), success: branch, failure: branch,
  responses: z.object({ reassure: branch.extend({ success: z.boolean(), outcome: z.enum(['detailed', 'brief', 'closed']).optional() }).optional(), press: branch.extend({ success: z.boolean(), outcome: z.enum(['detailed', 'brief', 'closed']).optional() }).optional(), challenge: branch.extend({ success: z.boolean(), outcome: z.enum(['detailed', 'brief', 'closed']).optional() }).optional() }).strict().optional(),
}).strict();
const knowledge = z.object({ id, topicId: id, subject: text, facts: z.array(z.string().min(1)).min(1), when: z.string().min(1), ...gate,
  requiresEvidence: id.optional(), requiresPresented: ids.optional(), afterUnsuccessfulTopic: id.optional(), reward: id.optional(), choice: choice.optional(),
}).strict();
const mind = z.object({ identity: id, persona: text, manner: text.optional(), goals: z.array(text).min(1), voice: id, model: z.string().min(1).optional(), background: z.array(text).optional(), knowledge: z.array(knowledge).optional(),
  disclosures: z.array(z.object({ description: text, terms: z.array(z.string().min(1)).min(1), afterEvidence: id, message: text }).strict()).optional(),
}).strict();
const character = z.object({ mind: mind.optional(), portrait: id.optional(), posture: z.enum(['standing', 'seated']).optional(), hatPlacement: z.enum(['head', 'lap']).optional(), id, entityId: id, name: text, occupation: text, location: id, appearance, greeting: text, historical: text, topics: z.array(topic), repeatable: z.boolean().optional(), requiredTopics: ids.optional() }).strict();
const evidence = z.object({ id, title: text, description: text, detail: text, provenance: text, location: id, kind: z.enum(['object', 'testimony']), chapter: z.number().int().min(0), documentId: id.optional(), image: id.optional() }).strict();
const pair = z.tuple([id, id]);
const deduction = z.object({ id, title: text, question: text, explanation: text, requires: pair, alternatives: z.array(pair).optional(), ...gate }).strict();
const object = z.object({ id, title: text, model: z.enum(['box', 'sphere', 'cylinder', 'image', 'gltf']), asset: id.optional(), color: text.optional(), siteId: id, hotspots: ids,
  views: z.object({ initial: id.optional(), steps: record(z.object({ image: id, point: z.tuple([z.number().min(0).max(100), z.number().min(0).max(100)]) }).strict()) }).strict(),
  steps: z.array(z.object({ id, label: text, observation: text, requires: ids.optional(), requiresEvidence: ids.optional(), blockedMessage: text.optional(), togetherAt: id.optional() }).strict()).min(1),
  evidence: z.array(z.object({ id, chapter: z.number().int().min(0), steps: ids, reviewAsObject: z.boolean() }).strict()),
}).strict();
const reconstruction = z.object({ id, title: text, instruction: text, pairs: z.array(pair), events: z.array(option).min(2).max(20), order: ids, failure: text }).strict();
const cutscene = z.object({ id, title: text, location: id, steps: z.array(z.object({ kind: z.enum(['card', 'shot']), text, title: text.optional(), speaker: id.optional(), speakerName: text.optional(), clip: id.optional(), image: id.optional(),
  camera: z.object({ position: point, target: point }).strict().optional(), actors: z.array(z.object({ id, position: point, heading: z.number().optional() }).strict()).optional(),
}).strict()).min(1) }).strict();
const source = z.object({ title: text, url: z.string().url() }).strict();
const site = z.object({ id, name: text, kind: z.enum(['historical', 'fictional']), address: text, precision: z.enum(['site', 'street', 'fictional']), point: z.tuple([z.number(), z.number()]).nullable(), note: text, sources: z.array(source), placement: text, reviewed: text }).strict();
const map = z.object({ kind: z.enum(['historical', 'fictional']), src: assetPath, width: z.number().positive(), height: z.number().positive(), title: text, description: text, source, sha256: z.string().regex(/^[a-f0-9]{64}$/).optional() }).strict();

export const storySchema = z.object({ $schema: z.string().optional(), schemaVersion: z.literal(2), id, version: id, title: text, subtitle: text, description: text,
  cover: id.optional(), music: assetPath.optional(), assets: record(image), models: record(assetPath),
  inspectors: z.array(z.object({ id, name: text, description: text, appearance }).strict()).length(2), sites: record(site), map: map.optional(),
  voices: record(z.object({ src: assetPath, text, durationMs: z.number().positive(), hash: text.optional() }).strict()),
  chapters: z.array(chapter).min(1), characters: z.array(character), clues: record(evidence), deductions: z.array(deduction), documents: record(document), objects: record(object),
  reconstructions: z.array(reconstruction), cutscenes: z.array(cutscene), ending: text,
}).strict();

export function validateStory(input: unknown): StoryDefinition {
  const story = storySchema.parse(input) as StoryDefinition;
  validateProgression(story.chapters, story.cutscenes);
  validateStoryReferences(story);
  return story;
}

export function publicStory(story: StoryDefinition): StoryPresentation {
  const { id, version, title, subtitle, description, cover, music, assets, models, inspectors, sites, map, voices } = story;
  return { id, version, title, subtitle, description, cover, music, assets, models, inspectors, sites, map, voices };
}
