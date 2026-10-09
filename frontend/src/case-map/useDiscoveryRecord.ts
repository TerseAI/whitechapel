import { useState } from 'react';
import type { CaseView } from '../../../shared/game/types';

export function useDiscoveryRecord(state: CaseView | null, playerId?: string) {
  const key = state && playerId ? `investigation.${state.storyId}.${state.storyVersion}.reviewed.${state.roomId}.${playerId}` : '';
  const [record, setRecord] = useState<{ key: string; ids: string[] }>({ key: '', ids: [] });
  const ids = record.key === key ? record.ids : load(key);
  const unread = state?.evidence.filter(item => !ids.includes(item.id)) ?? [];
  function review(evidenceIds = unread.map(item => item.id)) {
    const next = [...new Set([...ids, ...evidenceIds])];
    setRecord({ key, ids: next });
    try { if (key) localStorage.setItem(key, JSON.stringify(next)); } catch {}
  }
  return { unread, review };
}

function load(key: string): string[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(saved) ? saved.filter((id): id is string => typeof id === 'string') : [];
  } catch { return []; }
}
