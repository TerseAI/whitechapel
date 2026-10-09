import { useEffect, useRef, useState } from 'react';
import { Check, Network } from 'lucide-react';
import type { CaseConnection, CaseView } from '../../../shared/game/types';
import './case-map.css';

export function ConnectionCelebration({ state, visible = true, onOpenMap }: { state: CaseView; visible?: boolean; onOpenMap: () => void }) {
  const previous = useRef({ room: state.roomId, ids: new Set(state.deductions) });
  const [queue, setQueue] = useState<CaseConnection[]>([]);
  useEffect(() => {
    const before = previous.current;
    if (before.room !== state.roomId) setQueue([]);
    else {
      const added = (state.connections ?? []).filter(c => !before.ids.has(c.id));
      if (added.length) setQueue(current => [...current, ...added]);
    }
    previous.current = { room: state.roomId, ids: new Set(state.deductions) };
  }, [state.roomId, state.deductions, state.connections]);
  const current = queue[0];
  if (!current || !visible) return null;
  const dismiss = () => setQueue(items => items.slice(1));
  return <aside className="connection-celebration" role="status" aria-label="Connection established" key={current.id}>
    <div className="connection-seal"><Check size={28}/></div><span>CONNECTION ESTABLISHED</span><h2>{current.title}</h2><p>{current.explanation}</p>
    <div><button className="primary" onClick={() => { onOpenMap(); dismiss(); }}><Network size={16}/>See it on the case map</button><button className="text-button" onClick={dismiss}>Continue investigating</button></div>
  </aside>;
}
