import { inspectorSpawn, walkable, cluePosition, witnessPosition, pathToClue, pathToWitness, closeEnoughToInspect, readyToInterview } from '../game/navigation.js';
import type { GamePlace, StoryGate } from '../game/types.js';
import type { Chapter, Character, StoryDefinition } from './types.js';
import type { PhysicalObject } from '../game/physical-objects.js';

export function validateStoryReferences(story: StoryDefinition) {
  new StoryReferences(story).validate();
}

class StoryReferences {
  private locations: GamePlace[];
  private places: Record<string, GamePlace>;
  private characters: Record<string, Character>;
  private deductions: Record<string, StoryDefinition['deductions'][number]>;

  constructor(private story: StoryDefinition) {
    this.locations = story.chapters.flatMap(c => [...c.locations, ...c.epilogueLocations]);
    this.places = Object.fromEntries(this.locations.map(place => [place.id, place]));
    this.characters = Object.fromEntries(story.characters.map(npc => [npc.id, npc]));
    this.deductions = Object.fromEntries(story.deductions.map(deduction => [deduction.id, deduction]));
  }

  validate() {
    this.catalogues();
    this.geography();
    this.story.chapters.forEach(chapter => this.chapter(chapter));
    this.evidence();
    this.story.characters.forEach(npc => this.character(npc));
    this.story.deductions.forEach(deduction => {
      this.gate(deduction);
      [deduction.requires, ...deduction.alternatives ?? []].flat().forEach(id => requireRef(this.story.clues, id, 'deduction evidence'));
    });
    Object.values(this.story.objects).forEach(object => this.object(object));
    this.reconstructions();
    this.cutscenes();
  }

  private catalogues() {
    const story = this.story;
    unique([...story.inspectors, ...story.characters], 'actor');
    unique(story.deductions, 'deduction'); unique(story.reconstructions, 'reconstruction');
    for (const catalogue of [story.clues, story.documents, story.objects, story.sites]) {
      for (const [key, item] of Object.entries(catalogue)) if (key !== item.id) throw new Error(`Catalogue key does not match ID: ${key}`);
    }
    requireRef(story.assets, story.cover, 'cover asset');
  }

  private geography() {
    const map = this.story.map;
    for (const site of Object.values(this.story.sites)) {
      if (site.kind === 'fictional' && site.point && map?.kind !== 'fictional') throw new Error(`Fictional site ${site.id} cannot have a historical pin.`);
      if (site.point && (!map || site.point[0] < 0 || site.point[1] < 0 || site.point[0] > map.width || site.point[1] > map.height)) throw new Error(`Site ${site.id} lies outside the map.`);
      if (site.kind === 'historical' && (!site.sources.length || !site.reviewed)) throw new Error(`Historical site ${site.id} needs sources and a review date.`);
    }
    if (map?.kind === 'historical' && !map.sha256) throw new Error('A historical map needs its source image hash.');
    const sites = new Map<string, string>();
    for (const place of this.locations) {
      if (sites.has(place.id) && sites.get(place.id) !== place.siteId) throw new Error(`Location ${place.id} changes site between chapters.`);
      sites.set(place.id, place.siteId);
    }
  }

  private chapter(chapter: Chapter) {
    this.guidance(chapter);
    unique(chapter.locations, 'location'); unique(chapter.epilogueLocations, 'epilogue location'); unique(chapter.options, 'report option');
    requireRef(this.story.documents, chapter.briefing, 'briefing document');
    [...chapter.npcIds, ...chapter.epilogueNpcIds, ...chapter.requiredInterviews ?? []].forEach(id => requireRef(this.characters, id, 'character'));
    [...chapter.clueIds, ...chapter.reviewEvidence, ...chapter.requiredEvidence, ...chapter.flow.epilogue?.requiredEvidence ?? []].forEach(id => requireRef(this.story.clues, id, 'evidence'));
    chapter.deductionIds.forEach(id => requireRef(this.deductions, id, 'deduction'));
    if (chapter.flow.completion.kind === 'report' && (!chapter.acceptedAnswers.length || chapter.acceptedAnswers.some(id => !chapter.options.some(option => option.id === id)))) throw new Error('Report answers must reference available options.');
    for (const id of chapter.requiredInterviews ?? []) if (!chapter.npcIds.includes(id)) throw new Error(`Required interview ${id} is not in this chapter.`);
    for (const [ids, places] of [[chapter.npcIds, chapter.locations], [chapter.epilogueNpcIds, chapter.epilogueLocations]] as const) {
      if (new Set(ids.map(id => this.characters[id].entityId)).size !== ids.length) throw new Error('A character entity has multiple active appearances.');
      for (const id of ids) if (!places.some(place => place.id === this.characters[id].location)) throw new Error(`Character ${id} has no location in this chapter.`);
    }
    for (const place of [...chapter.locations, ...chapter.epilogueLocations]) this.location(place);
  }

  private location(place: GamePlace) {
    requireRef(this.story.sites, place.siteId, 'site'); requireRef(this.story.assets, place.backdrop, 'backdrop asset');
    if (place.scene === 'model' && !place.sceneAsset) throw new Error(`Scene ${place.id} needs a model asset.`);
    requireRef(this.story.models, place.sceneAsset, 'scene model'); this.gate(place);
    unique(place.hotspots, 'hotspot'); unique(place.props ?? [], 'scene prop');
    for (const hotspot of place.hotspots) requireRef(this.story.clues, hotspot.id, 'hotspot evidence');
    place.props?.forEach(prop => this.model(prop));
    validateNavigation(place);
    for (const [index, hotspot] of place.hotspots.entries()) {
      const target = cluePosition(index, place.indoor, place.navigation, hotspot.id);
      for (const spawn of [inspectorSpawn(0, place.navigation), inspectorSpawn(1, place.navigation)]) {
        if (!closeEnoughToInspect(spawn, target) && !pathToClue(spawn, target, place.indoor, place.navigation).length) throw new Error(`Unreachable hotspot ${hotspot.id} in ${place.id}.`);
      }
    }
  }

  private guidance(chapter: Chapter) {
    const leads = chapter.guidance?.leads ?? [];
    unique(leads, 'lead');
    const places = Object.fromEntries([...chapter.locations, ...chapter.epilogueLocations].map(place => [place.id, place]));
    for (const lead of leads) {
      this.gate(lead);
      requireRef(places, lead.location, 'lead location');
      requireRef(this.characters, lead.character, 'lead character');
      if (lead.character && ![...chapter.npcIds, ...chapter.epilogueNpcIds].includes(lead.character)) throw new Error(`Lead character ${lead.character} is not in this chapter.`);
      if (lead.character && lead.location && this.characters[lead.character].location !== lead.location) throw new Error(`Lead ${lead.id} has a different character location.`);
      if (lead.hotspot && (!lead.location || !places[lead.location].hotspots.some(item => item.id === lead.hotspot))) throw new Error(`Unknown lead hotspot: ${lead.hotspot}`);
      lead.completeWhen.evidence?.forEach(id => requireRef(this.story.clues, id, 'lead evidence'));
      requireRef(this.deductions, lead.completeWhen.deduction, 'lead deduction');
      if (!lead.completeWhen.evidence?.length && !lead.completeWhen.deduction) throw new Error(`Lead ${lead.id} needs a completion condition.`);
    }
  }

  private evidence() {
    for (const item of Object.values(this.story.clues)) {
      requireRef(this.story.documents, item.documentId, 'evidence document'); requireRef(this.story.assets, item.image, 'evidence image');
      requireRef(this.places, item.location, 'evidence location');
      if (item.chapter === undefined || !this.story.chapters[item.chapter]) throw new Error(`Invalid evidence chapter: ${item.id}`);
    }
    for (const item of Object.values(this.story.documents)) item.pages.forEach(page => requireRef(this.story.assets, page.artwork, 'document artwork'));
  }

  private character(npc: Character) {
    if (npc.mind && npc.mind.identity !== npc.entityId) throw new Error(`Character memory identity differs from entityId: ${npc.id}`);
    npc.mind?.disclosures?.forEach(rule => requireRef(this.story.clues, rule.afterEvidence, 'protected disclosure evidence'));
    requireRef(this.story.assets, npc.portrait, 'character portrait');
    requireRef(this.places, npc.location, 'character location'); unique(npc.topics, 'topic');
    const topics = Object.fromEntries(npc.topics.map(topic => [topic.id, topic]));
    unique(npc.mind?.knowledge ?? [], 'character knowledge');
    for (const item of npc.mind?.knowledge ?? []) {
      this.gate(item);
      requireRef(topics, item.topicId, 'knowledge topic');
      requireRef(topics, item.afterUnsuccessfulTopic, 'prior knowledge topic');
      [item.reward, item.requiresEvidence, ...item.requiresPresented ?? []].forEach(id => requireRef(this.story.clues, id, 'character knowledge evidence'));
    }
    npc.requiredTopics?.forEach(id => requireRef(topics, id, 'required topic'));
    for (const topic of npc.topics) {
      this.gate(topic);
      if (!topic.documentId && (!topic.choices?.length || !topic.choices.some(choice => choice.approach === topic.correct))) throw new Error(`Topic ${npc.id}/${topic.id} needs authored response choices.`);
      if (topic.documentId && topic.success.reward !== topic.documentId) throw new Error(`Document handover ${npc.id}/${topic.id} needs its evidence reward.`);
      if (topic.choices && new Set(topic.choices.map(choice => choice.approach)).size !== topic.choices.length) throw new Error(`Duplicate response approach in ${npc.id}/${topic.id}.`);
      [topic.proof, ...topic.proofAlternatives ?? [], topic.requiresEvidence, topic.documentId, topic.success.reward, topic.failure.reward, ...Object.values(topic.responses ?? {}).map(r => r.reward)].forEach(id => requireRef(this.story.clues, id, 'interview evidence'));
      requireRef(topics, topic.afterUnsuccessfulTopic, 'prior topic');
    }
    for (const chapter of this.story.chapters) {
      for (const [ids, places] of [[chapter.npcIds, chapter.locations], [chapter.epilogueNpcIds, chapter.epilogueLocations]] as const) {
        const present = ids.map(id => this.characters[id]).filter(n => n.location === npc.location);
        if (!present.includes(npc)) continue;
        const place = places.find(place => place.id === npc.location)!;
        const target = witnessPosition(npc.id, place.navigation);
        for (const spawn of [inspectorSpawn(0, place.navigation), inspectorSpawn(1, place.navigation)]) if (!readyToInterview(spawn, target) && !pathToWitness(spawn, target, place.indoor, place.navigation).length) throw new Error(`Unreachable interview ${npc.id} in ${place.id}.`);
      }
    }
  }

  private object(object: PhysicalObject) {
    this.model(object); requireRef(this.story.sites, object.siteId, 'object site');
    requireRef(this.story.assets, object.views.initial, 'object image'); unique(object.steps, 'object step');
    const steps = Object.fromEntries(object.steps.map(step => [step.id, step]));
    for (const [id, view] of Object.entries(object.views.steps)) { requireRef(steps, id, 'object view step'); requireRef(this.story.assets, view.image, 'object image'); }
    for (const step of object.steps) {
      step.requires?.forEach(id => requireRef(steps, id, 'object prerequisite'));
      step.requiresEvidence?.forEach(id => requireRef(this.story.clues, id, 'object evidence')); requireRef(this.places, step.togetherAt, 'cooperative inspection location');
    }
    rejectCycles(object.steps);
    for (const reward of object.evidence) {
      requireRef(this.story.clues, reward.id, 'object reward'); reward.steps.forEach(id => requireRef(steps, id, 'reward step'));
      if (this.story.clues[reward.id].chapter !== reward.chapter) throw new Error(`Object reward ${reward.id} has the wrong chapter.`);
    }
    for (const id of object.hotspots) {
      requireRef(this.story.clues, id, 'object hotspot');
      if (!this.locations.some(place => place.siteId === object.siteId && place.hotspots.some(h => h.id === id))) throw new Error(`Object ${object.id} has no hotspot placement.`);
    }
  }

  private model(item: { model: string; asset?: string }) {
    if ((item.model === 'gltf' || item.model === 'image') && !item.asset) throw new Error(`Model ${item.model} needs an asset.`);
    requireRef(item.model === 'gltf' ? this.story.models : this.story.assets, item.asset, 'model asset');
  }

  private reconstructions() {
    for (const r of this.story.reconstructions) {
      requireRef(this.deductions, r.id, 'reconstruction deduction'); unique(r.events, 'reconstruction event');
      if (new Set(r.order).size !== r.events.length || r.order.length !== r.events.length || r.order.some(id => !r.events.some(e => e.id === id))) throw new Error(`Invalid reconstruction order: ${r.id}`);
      const deduction = this.deductions[r.id];
      for (const pair of r.pairs) if (![deduction.requires, ...deduction.alternatives ?? []].some(accepted => [...pair].sort().join('|') === [...accepted].sort().join('|'))) throw new Error(`Unknown reconstruction evidence pair: ${r.id}`);
    }
  }

  private cutscenes() {
    const actors = { ...this.characters, ...Object.fromEntries(this.story.inspectors.map(inspector => [inspector.id, inspector])) };
    for (const scene of this.story.cutscenes) for (const step of scene.steps) {
      requireRef(this.story.assets, step.image, 'cutscene image'); requireRef(this.story.voices, step.clip, 'cutscene voice');
      requireRef(actors, step.speaker, 'cutscene speaker'); step.actors?.forEach(actor => requireRef(actors, actor.id, 'cutscene actor'));
      if (step.clip && this.story.voices[step.clip].text !== step.text) throw new Error(`Cutscene recording text mismatch: ${step.clip}`);
    }
  }

  private gate(gate: StoryGate) {
    gate.requiresAll?.forEach(id => requireRef(this.story.clues, id, 'gate evidence')); requireRef(this.deductions, gate.requiresDeduction, 'gate deduction');
  }
}

function requireRef(catalogue: object, id: string | undefined, label: string) {
  if (id && !Object.hasOwn(catalogue, id)) throw new Error(`Unknown ${label}: ${id}`);
}
function unique(values: readonly { id: string }[], label: string) {
  if (new Set(values.map(item => item.id)).size !== values.length) throw new Error(`Duplicate ${label} ID.`);
}
function validateNavigation(place: GamePlace) {
  for (const rectangle of [place.navigation?.bounds, ...place.navigation?.obstacles ?? []]) {
    if (!rectangle) continue;
    if (rectangle.minX >= rectangle.maxX || rectangle.minZ >= rectangle.maxZ || Object.values(rectangle).some(n => Math.abs(n) > 100)) throw new Error(`Invalid navigation bounds in ${place.id}.`);
  }
  for (const index of [0, 1]) if (!walkable(inspectorSpawn(index, place.navigation), place.indoor, place.navigation)) throw new Error(`Inspector spawn is obstructed in ${place.id}.`);
}
function rejectCycles(steps: PhysicalObject['steps']) {
  const visiting = new Set<string>(), visited = new Set<string>();
  const visit = (id: string) => {
    if (visiting.has(id)) throw new Error(`Object prerequisite cycle at ${id}.`);
    if (visited.has(id)) return;
    visiting.add(id);
    steps.find(step => step.id === id)!.requires?.forEach(visit);
    visiting.delete(id); visited.add(id);
  };
  steps.forEach(step => visit(step.id));
}
