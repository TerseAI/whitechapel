export type CaseMode = 'co-op' | 'solo';

export function investigatorCount(mode: CaseMode = 'co-op') {
  return mode === 'solo' ? 1 : 2;
}
