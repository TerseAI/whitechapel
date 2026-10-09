import { useCallback, useRef, useState } from 'react';
import type { Action, ActionResult, CaseConnection, CaseView } from '../../../shared/game/types';
import type { ReconstructionView } from '../../../shared/game/reconstructions';

export function useEvidenceConnections(state: CaseView, disabled: boolean, onAction: (action: Action) => Promise<ActionResult>) {
  const [selected, setSelected] = useState<string | null>(null);
  const [failure, setFailure] = useState('');
  const [finding, setFinding] = useState<CaseConnection | null>(null);
  const [reconstruction, setReconstruction] = useState<{ pair: [string, string]; view: ReconstructionView } | null>(null);
  const [connecting, setConnecting] = useState(false);
  const busy = useRef(false);
  const connect = useCallback(async (pair: [string, string]) => {
    if (disabled || busy.current || pair[0] === pair[1]) return;
    setSelected(null); setFailure(''); setFinding(null);
    busy.current = true; setConnecting(true);
    try {
      const result = await onAction({ type: 'deduce', evidenceIds: pair });
      if (result.reconstruction) setReconstruction({ pair, view: result.reconstruction });
      else if (!result.ok) setFailure(result.message);
      else setFinding(state.connections?.find(c => c.evidenceIds.every(id => pair.includes(id))) ?? null);
    } finally { busy.current = false; setConnecting(false); }
  }, [disabled, state.chapter.index, state.deductions, state.connections, onAction]);
  const select = useCallback((id: string) => {
    if (selected && selected !== id) void connect([selected, id]);
    else { setSelected(selected === id ? null : id); setFailure(''); }
  }, [selected, connect]);
  return { selected, setSelected, failure, setFailure, finding, setFinding, reconstruction, setReconstruction, connecting, connect, select };
}
