import type { GamePlace, PlaceId } from './types.js';
import type { CutsceneDefinition, TransitionTarget } from './cutscenes.js';

export type CompletionRule =
  | { kind: 'report' }
  | { kind: 'continue'; label: string }
  | { kind: 'findings'; options: { id: string; label: string }[]; supported: string[]; rejection: string };
export type ChapterFlow = {
  entry: PlaceId; entryCutscene?: string; completion: CompletionRule;
  after: { target: Exclude<TransitionTarget, 'resume'>; cutscene?: string };
  epilogue?: { entry: PlaceId; requiredEvidence: string[]; message: string; cutscene?: string };
};
export type CompletionView = { kind: CompletionRule['kind']; label: string; options: { id: string; label: string }[] };

export function validateProgression(chapters: readonly { flow: ChapterFlow; locations: readonly GamePlace[]; epilogueLocations: readonly GamePlace[] }[], scenes: readonly CutsceneDefinition[]) {
  if (!chapters.length) throw new Error('A campaign needs at least one stage.');
  const ids = new Set<string>();
  for (const scene of scenes) {
    if (ids.has(scene.id)) throw new Error(`Duplicate cutscene: ${scene.id}`);
    ids.add(scene.id);
    if (!scene.steps.length) throw new Error(`Cutscene ${scene.id} needs at least one step.`);
    if (!chapters.some(chapter => [...chapter.locations, ...chapter.epilogueLocations].some(place => place.id === scene.location))) throw new Error(`Unknown cutscene location: ${scene.location}`);
    for (const step of scene.steps) {
      if (step.kind === 'shot' && !step.camera) throw new Error(`Cutscene ${scene.id} needs a camera for each shot.`);
    }
  }
  for (const [index, chapter] of chapters.entries()) {
    const { flow } = chapter;
    stageEntry(flow, chapter.locations);
    for (const id of [flow.entryCutscene, flow.after.cutscene, flow.epilogue?.cutscene]) {
      if (id && !ids.has(id)) throw new Error(`Unknown cutscene: ${id}`);
    }
    if (flow.after.target === 'advance' && index === chapters.length - 1) throw new Error('The final stage has no successor.');
    if (flow.after.target === 'epilogue' && !flow.epilogue) throw new Error('An epilogue transition needs an epilogue definition.');
    if (flow.epilogue && !chapter.epilogueLocations.some(place => place.id === flow.epilogue!.entry)) throw new Error(`Unknown epilogue entry: ${flow.epilogue.entry}`);
    if (flow.completion.kind === 'findings' && (!flow.completion.supported.length || flow.completion.supported.some(id => flow.completion.kind === 'findings' && !flow.completion.options.some(option => option.id === id)))) throw new Error('Supported findings must be available report options.');
  }
}

export function completionView(rule: CompletionRule): CompletionView {
  return { kind: rule.kind, label: rule.kind === 'continue' ? rule.label : rule.kind === 'findings' ? 'Prepare the final report' : 'Review this chapter', options: rule.kind === 'findings' ? rule.options : [] };
}

export function stageReady(requiredEvidence: readonly string[], requiredDeductions: readonly string[], found: readonly string[], deductions: readonly string[]) {
  return requiredEvidence.every(id => found.includes(id)) && requiredDeductions.every(id => deductions.includes(id));
}

export function stageEntry(flow: ChapterFlow, places: readonly GamePlace[]) {
  const place = places.find(place => place.id === flow.entry);
  if (!place) throw new Error(`Stage entry ${flow.entry} is not an available location.`);
  return place.id;
}
