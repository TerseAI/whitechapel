import type { PhysicalObject } from '../../../shared/game/physical-objects';

export function inspectionActions(object: PhysicalObject, observed: string[], pendingEvidence: boolean) {
  const remaining = object.steps.filter(step => !observed.includes(step.id));
  if (remaining.length) return remaining.filter(step => step.requires?.every(id => observed.includes(id)) ?? true);
  return pendingEvidence ? object.steps.slice(-1) : [];
}

export function actionView(step: PhysicalObject['steps'][number]) {
  return step.requires?.at(-1) ?? '';
}

export function viewImage(object: PhysicalObject, view: string) {
  return view ? object.views.steps[view]?.image : object.views.initial;
}
