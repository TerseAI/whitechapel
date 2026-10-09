import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { BookOpen, Link2, Search, FileText } from 'lucide-react';
import type { Evidence } from '../../../shared/game/types';
import { useStory, storyImage } from '../story/StoryProvider';
import type { PhysicalObject } from '../../../shared/game/physical-objects';

export type EvidenceNodeData = {
  evidence: Evidence; object?: PhysicalObject; chosen: boolean; connected: boolean; disabled: boolean; angle: number;
  onRead: (evidence: Evidence) => void; onSelect: (id: string) => void;
};
export type PaperNode = Node<EvidenceNodeData, 'paper'>;

export function EvidenceNode({ data }: NodeProps<PaperNode>) {
  const { evidence, chosen, connected, disabled, onRead, onSelect } = data;
  const object = data.object;
  const artwork = storyImage(useStory(), object?.views.initial ?? evidence.image ?? evidence.document?.pages[0]?.artwork);
  return <article className={`map-paper ${chosen ? 'is-chosen' : ''} ${connected ? 'is-connected' : ''}`}>
    <div className="map-paper-original" style={{ rotate: `${data.angle}deg` }}>{artwork ? <img src={artwork.src} width={artwork.width} height={artwork.height} alt="" draggable={false}/> : <div className="map-evidence-placeholder"><FileText size={34}/><span>{evidence.kind === 'testimony' ? 'Recorded account' : 'Recorded evidence'}</span></div>}</div>
    <Handle className="map-paper-link-zone" type="source" position={Position.Top} id="pin" isConnectable={!disabled} aria-label={`Draw a connection from ${evidence.title}`}/>
    <span className="paper-pin" aria-hidden="true"/>
    <div className="map-paper-caption" role="tooltip"><h3>{evidence.title}</h3><span>{object ? 'Physical object · Recorded inspection' : connected ? 'Part of an established finding' : evidence.kind === 'testimony' ? 'Witness account' : 'Collected evidence'}</span></div>
    <div className="map-paper-actions nodrag nopan">
      <button aria-label={`${object ? 'Inspect' : 'Read'} ${evidence.title}`} onClick={event => { event.stopPropagation(); onRead(evidence); }}>{object ? <Search size={15}/> : <BookOpen size={15}/>} {object ? 'Inspect' : 'Read'}</button>
      <button aria-label={`Connect ${evidence.title}`} aria-pressed={chosen} disabled={disabled} onClick={event => { event.stopPropagation(); onSelect(evidence.id); }}><Link2 size={15}/>{chosen ? 'Selected' : 'Connect'}</button>
    </div>
  </article>;
}
