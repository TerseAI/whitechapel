import { investigatorCount, type CaseMode } from '../../../shared/game/case-mode.js';

export function reportAgreement(members: readonly string[], votes: Record<string, string>, mode: CaseMode = 'co-op'): 'waiting' | 'different' | 'agreed' {
  if (members.length !== investigatorCount(mode) || new Set(members).size !== members.length || members.some(id => !votes[id])) return 'waiting';
  return new Set(members.map(id => votes[id])).size === 1 ? 'agreed' : 'different';
}
