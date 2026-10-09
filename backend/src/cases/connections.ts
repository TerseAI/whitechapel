import type { CaseConnection, Deduction } from '../../../shared/game/types.js';

export function revealedConnections(definitions: readonly Deduction[], solved: readonly string[], found: readonly string[], recorded: Record<string, [string, string]>): CaseConnection[] {
  return definitions.flatMap(deduction => {
    if (!solved.includes(deduction.id)) return [];
    const evidenceIds = recorded[deduction.id];
    if (!evidenceIds?.every(id => found.includes(id))) return [];
    return [{ id: deduction.id, title: deduction.title, explanation: deduction.explanation, evidenceIds }];
  });
}
