import { closeEnoughToInspect, cluePosition } from '../../../shared/game/navigation.js';
import { objectPlacement, objectStepBlock, observedObjectSteps, type InspectionGrounds, type PhysicalObject, type ObjectInspections } from '../../../shared/game/physical-objects.js';
import type { GamePlace, Player } from '../../../shared/game/types.js';

export type ObjectInspectionContext = InspectionGrounds & {
  chapter: number; places: GamePlace[]; player: Pick<Player, 'location' | 'position'>; inspections: ObjectInspections;
};
type InspectionResult = { ok: false; message: string } | { ok: true; message: string; objectId: string; observed: string[]; evidenceIds: string[] };

export function examineObject(context: ObjectInspectionContext, objectId: string, stepId: string | undefined, physicalObjects: Record<string, PhysicalObject>): InspectionResult {
  const object = Object.hasOwn(physicalObjects, objectId) ? physicalObjects[objectId] : undefined;
  const placement = object && objectPlacement(object, context.chapter, context.places);
  if (!placement || placement.place.id !== context.player.location) return { ok: false, message: 'Travel to the scene before inspecting that object.' };
  const { place, index } = placement;
  if (!closeEnoughToInspect(context.player.position, cluePosition(index, place.indoor, place.navigation, place.hotspots[index].id))) return { ok: false, message: 'Walk closer to examine this object.' };
  const observed = observedObjectSteps(object, context.inspections, context.found);
  if (stepId === undefined) return { ok: true, message: '', objectId, observed, evidenceIds: [] };
  const step = object.steps.find(item => item.id === stepId);
  if (!step) return { ok: false, message: 'That part of the object cannot be examined.' };
  const blocked = objectStepBlock(object, step, observed, context);
  if (blocked) return { ok: false, message: blocked };
  if (!observed.includes(step.id)) observed.push(step.id);
  const evidenceIds = object.evidence.filter(item => item.chapter <= context.chapter && !context.found.includes(item.id) && item.steps.every(id => observed.includes(id))).map(item => item.id);
  return { ok: true, message: step.observation, objectId, observed, evidenceIds };
}
