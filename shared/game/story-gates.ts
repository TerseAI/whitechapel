import type { StoryGate } from './types.js';

export type StoryFacts = { evidence: readonly string[]; deductions?: readonly string[]; decisions?: Record<string, string>; reportAccepted?: boolean };
export function gateOpen(gate: StoryGate, facts: StoryFacts) {
  return (!gate.requiresAll || gate.requiresAll.every(id => facts.evidence.includes(id)))
    && (!gate.requiresDeduction || !!facts.deductions?.includes(gate.requiresDeduction))
    && (!gate.requiresChoice || facts.decisions?.[gate.requiresChoice.id] === gate.requiresChoice.value)
    && (!gate.requiresReport || facts.reportAccepted === true);
}
