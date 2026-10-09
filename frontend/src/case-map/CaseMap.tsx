import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { ReactFlow, ReactFlowProvider, useNodesState, ConnectionMode, type Connection, type Edge } from '@xyflow/react';
import { ArrowLeft, CircleHelp, X } from 'lucide-react';
import type { Action, ActionResult, CaseView, Evidence } from '../../../shared/game/types';
import { ReconstructionPanel } from './ReconstructionPanel';
import { objectForEvidence } from '../../../shared/game/physical-objects';
import { EvidenceNode, type PaperNode } from './EvidenceNode';
import { CaseQuestions } from './CaseQuestions';
import { ChapterReview } from './ChapterReview';
import { boardLayout, paperAngle } from './board-layout';
import { RedThread, DrawingThread } from './RedThread';
import { useEvidenceConnections } from './useEvidenceConnections';
import '@xyflow/react/dist/style.css';
import './case-map.css';

import type { LeadView } from '../../../shared/game/investigation';

type Props = { unread?: Evidence[]; onReviewDiscoveries?: () => void; playerId: string; onLead: (lead: LeadView) => void; state: CaseView; pending: boolean; onAction: (action: Action) => Promise<ActionResult>; onExamine: (evidence: Evidence) => void; onReport: () => void; onExplore: () => void; placesToggle?: ReactNode };
const nodeTypes = { paper: EvidenceNode };
const edgeTypes = { thread: RedThread };
const fixedViewport = { x: 0, y: 0, zoom: 1 };

export function CaseMap(props: Props) {
  const [archive, setArchive] = useState(false);
  return <section className="case-map" aria-label="Case map">
    <ChapterReview state={props.state} onReport={props.onReport}/>
    <div className="case-map-body"><ReactFlowProvider key={`${props.state.roomId}.${props.state.chapter.index}.${archive}`}><EvidenceBoard {...props} archive={archive} onToggleArchive={() => setArchive(!archive)}/></ReactFlowProvider><CaseQuestions {...props}/></div>
  </section>;
}

function EvidenceBoard({ state, pending, onAction, onExamine, onExplore, placesToggle, archive, onToggleArchive }: Props & { archive: boolean; onToggleArchive: () => void }) {
  const [help, setHelp] = useState(false);
  const [nodes, setNodes, onNodesChange] = useNodesState<PaperNode>([]);
  const canvas = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 900, height: 650 });
  useLayoutEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setSize({ width, height });
    });
    if (canvas.current) observer.observe(canvas.current);
    return () => observer.disconnect();
  }, []);
  const evidence = state.evidence.filter(e => archive ? e.chapter !== state.chapter.index : e.chapter === state.chapter.index || state.chapter.reviewEvidence?.includes(e.id));
  const layout = boardLayout(evidence.length, size.width, size.height);
  const connections = state.connections ?? [];
  const { selected, setSelected, failure, setFailure, finding, setFinding, reconstruction, setReconstruction, connecting, connect, select } = useEvidenceConnections(state, pending || archive, onAction);
  useEffect(() => {
    const completed = reconstruction?.view;
    if (completed && state.deductions.includes(completed.id)) setReconstruction(null);
  }, [reconstruction, state.deductions, setReconstruction]);
  useEffect(() => {
    setNodes(evidence.map((item, index) => ({
      id: item.id, type: 'paper', position: layout.position(index), style: { width: layout.width }, draggable: false,
      data: { evidence: item, object: objectForEvidence(item.id, state.objects ?? {}), chosen: selected === item.id, connected: connections.some(c => c.evidenceIds.includes(item.id)), disabled: pending || connecting || archive, angle: paperAngle(item.id), onRead: onExamine, onSelect: select },
    })));
  }, [state.evidence, state.connections, selected, pending, connecting, archive, onExamine, select, size]);
  const visible = new Set(evidence.map(e => e.id));
  const edges: Edge[] = connections.filter(c => c.evidenceIds.every(id => visible.has(id))).map(c => ({ id: c.id, source: c.evidenceIds[0], target: c.evidenceIds[1], sourceHandle: 'pin', targetHandle: 'pin', type: 'thread', ariaLabel: `Established connection: ${c.title}`, zIndex: 2 }));
  const onConnect = (connection: Connection) => void connect([connection.source, connection.target]);
  return <div className="evidence-board">
    <div className="board-instructions">
      {placesToggle}
      {state.chapter.index > 0 && <button className="board-archive-toggle" onClick={onToggleArchive}>{archive ? 'Current chapter' : 'Earlier chapters'}</button>}
      <span className={selected || connecting ? 'board-connection-status' : 'board-gesture-hint'} role="status">{connecting ? 'Examining the connection…' : selected ? `Connect “${evidence.find(e => e.id === selected)?.title}” to another paper.` : archive ? 'Earlier discoveries' : 'Drag between papers to connect evidence.'}</span>
      {selected && <button onClick={() => setSelected(null)} aria-label="Cancel connection"><X size={18}/></button>}
      <button className="board-help-toggle" aria-label="How to connect evidence" aria-expanded={help} aria-controls="board-help" onClick={() => setHelp(!help)}><CircleHelp size={19}/></button>
    </div>
    {help && <p className="board-help" id="board-help">{!state.questions.length ? 'Follow the leads to gather evidence. No connections are needed yet.' : 'Use the questions to guide your enquiry. Drag from one paper to another, or choose Connect on two papers. Read opens the full record. Established connections stay on the board.'}</p>}
    <div className="board-canvas" ref={canvas}>
      <div className="board-surface" style={{ height: layout.height }}>
      <ReactFlow<PaperNode> nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} onNodesChange={onNodesChange} onConnect={onConnect} connectionMode={ConnectionMode.Loose} connectionLineComponent={DrawingThread} connectOnClick={false} connectionRadius={28} nodesConnectable={!pending && !connecting && !archive} nodesDraggable={false} nodesFocusable={false} edgesReconnectable={false} elementsSelectable={false} selectionOnDrag={false} panOnDrag={false} panOnScroll={false} panActivationKeyCode={null} zoomActivationKeyCode={null} selectionKeyCode={null} autoPanOnSelection={false} zoomOnScroll={false} zoomOnPinch={false} zoomOnDoubleClick={false} autoPanOnConnect={false} autoPanOnNodeDrag={false} autoPanOnNodeFocus={false} preventScrolling={false} onNodeClick={(_, node) => { if (!pending && !connecting && !archive) select(node.id); }} onPaneClick={() => setSelected(null)} onEdgeClick={(_, edge) => setFinding(connections.find(c => c.id === edge.id) ?? null)} viewport={fixedViewport} minZoom={1} maxZoom={1} deleteKeyCode={null} colorMode="dark" proOptions={{ hideAttribution: true }}/>
      </div>

      {!evidence.length && <div className="board-empty"><h2>{archive ? 'No earlier papers' : 'Start with a lead'}</h2><p>Follow a lead from the list. Objects, documents and witness accounts appear here as you collect them.</p><button className="secondary" onClick={onExplore}><ArrowLeft size={16}/>Return to the scene</button></div>}
    </div>
    {failure && <div className="connection-failure" role="alert"><strong>No connection established</strong><p>{failure}</p><span>Try another pair. Your discoveries are still saved.</span><button aria-label="Dismiss connection feedback" onClick={() => setFailure('')}><X size={18}/></button></div>}
    {finding && <div className="board-finding"><strong>{finding.title}</strong><p>{finding.explanation}</p><button aria-label="Close finding" onClick={() => setFinding(null)}><X size={18}/></button></div>}
    {reconstruction && <div className="board-reconstruction"><button className="text-button" onClick={() => setReconstruction(null)}><ArrowLeft size={15}/>Back to the map</button><ReconstructionPanel key={reconstruction.pair.join('.')} reconstruction={reconstruction.view} pair={reconstruction.pair} state={state} pending={pending} onAction={onAction} onExamine={onExamine}/></div>}
  </div>;
}
