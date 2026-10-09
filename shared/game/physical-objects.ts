import type { SiteId } from '../geography/atlas.js';
import type { GamePlace, Player } from './types.js';
import { investigatorCount, type CaseMode } from './case-mode.js';

export type ObjectStep = { id: string; label: string; observation: string; requires?: string[]; requiresEvidence?: string[]; blockedMessage?: string; togetherAt?: string };
export type ObjectModelKind = string;
export type PhysicalObject = {
  id: string; title: string; model: ObjectModelKind; asset?: string; color?: string; views: { initial?: string; steps: Record<string, { image: string; point: [number, number] }> }; siteId: SiteId; hotspots: string[];
  steps: ObjectStep[];
  evidence: { id: string; chapter: number; steps: string[]; reviewAsObject: boolean }[];
};
export type ObjectInspections = Record<string, string[]>;
export type InspectionGrounds = { mode?: CaseMode; found: string[]; deductions: string[]; members: Pick<Player, 'location'>[] };

export function objectForEvidence(evidenceId: string, physicalObjects: Record<string, PhysicalObject>) {
  return Object.values(physicalObjects).find(object => object.evidence.some(item => item.id === evidenceId && item.reviewAsObject));
}

export function objectForHotspot(clueId: string, physicalObjects: Record<string, PhysicalObject>) {
  return Object.values(physicalObjects).find(object => object.hotspots.includes(clueId));
}

export function objectPlacement(object: PhysicalObject, chapter: number, places: GamePlace[]) {
  if (!object.evidence.some(item => item.chapter <= chapter)) return;
  const place = places.find(p => p.siteId === object.siteId && p.hotspots.some(h => object.hotspots.includes(h.id)));
  if (place) return { place, index: place.hotspots.findIndex(h => object.hotspots.includes(h.id)) };
}

export function observedObjectSteps(object: PhysicalObject, inspections: ObjectInspections, found: string[]) {
  const recorded = new Set(inspections[object.id] ?? []);
  for (const reward of object.evidence) if (reward.reviewAsObject && found.includes(reward.id)) reward.steps.forEach(id => recorded.add(id));
  return object.steps.filter(step => recorded.has(step.id)).map(step => step.id);
}

export function hasPendingObjectEvidence(object: PhysicalObject, chapter: number, found: readonly string[]) {
  return object.evidence.some(reward => reward.chapter <= chapter && !found.includes(reward.id));
}

export function objectStepBlock(object: PhysicalObject, step: ObjectStep, observed: string[], grounds: InspectionGrounds) {
  if (step.requiresEvidence?.some(id => !grounds.found.includes(id))) return step.blockedMessage ?? 'Find the required evidence before examining this object.';
  const missing = step.requires?.find(id => !observed.includes(id));
  if (missing) return `First: ${object.steps.find(item => item.id === missing)!.label.toLowerCase()}.`;
  if (step.togetherAt && !observed.includes(step.id) && (grounds.members.length !== investigatorCount(grounds.mode) || grounds.members.some(member => member.location !== step.togetherAt))) return grounds.mode === 'solo' ? 'Return to the inspection location to examine this object.' : step.blockedMessage ?? 'Both investigators must be present for this inspection.';

}
