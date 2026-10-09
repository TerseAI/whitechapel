import { useStory } from '../story/StoryProvider';
import { useState, type CSSProperties } from 'react';
import { Hand, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { objectArtwork } from './object-art';
import type { ObjectStep, PhysicalObject } from '../../../shared/game/physical-objects';

type Props = { object: PhysicalObject; observed: string[]; selected: string | null; actions: (ObjectStep & { blocked?: string })[]; disabled: boolean; onInspect: (id: string) => void };

export function ObjectIllustration({ object, observed, selected, actions, disabled, onInspect }: Props) {
  const [zoom, setZoom] = useState(1);
  const [loaded, setLoaded] = useState('');
  const [failed, setFailed] = useState('');
  const art = objectArtwork(useStory(), object, observed, selected);
  const hasArt = !!art && failed !== art.src;
  return <div className="object-view object-illustration" data-object-ready={hasArt && loaded === art.src}>
    <div className="object-art-scroll" tabIndex={zoom > 1 ? 0 : undefined} aria-label="Illustrated object detail">
      {hasArt ? <figure className="object-art-frame" style={{ '--object-zoom': zoom, '--object-aspect': art.width / art.height } as CSSProperties}>
        <img key={art.src} src={art.src} alt={art.description} width={art.width} height={art.height} draggable={false} onLoad={() => setLoaded(art.src)} onError={() => setFailed(art.src)}/>
        {actions.map(step => {
          const view = object.views.steps[step.id];
          if (!view) return null;
          return <button key={step.id} className="object-art-hotspot" style={{ left: `${view.point[0]}%`, top: `${view.point[1]}%` }} aria-label={step.label} title={step.blocked ?? step.label} disabled={disabled || !!step.blocked} onClick={() => onInspect(step.id)}><Hand size={19}/><span>{step.label}</span></button>;
        })}
      </figure> : <p className="object-view-fallback">{art ? 'The illustration could not load.' : 'No illustration has been added.'} Use the actions below and open Descriptions to examine the object.</p>}
    </div>
    <div className="object-view-tools" aria-label="Object view controls">
      <button aria-label="Zoom out" disabled={zoom <= 1} onClick={() => setZoom(value => Math.max(1, value - .25))}><ZoomOut size={17}/></button>
      <button aria-label="Zoom in" disabled={zoom >= 2.5} onClick={() => setZoom(value => Math.min(2.5, value + .25))}><ZoomIn size={17}/></button>
      <button aria-label="Reset object view" onClick={() => setZoom(1)}><RotateCcw size={17}/></button>
    </div>
    {actions.some(step => step.blocked || !hasArt || !object.views.steps[step.id]) && <div className="object-action-notes">{actions.map(step => step.blocked ? <p key={step.id}>{step.blocked}</p> : (!hasArt || !object.views.steps[step.id]) && <button key={step.id} disabled={disabled} onClick={() => onInspect(step.id)}>{step.label}</button>)}</div>}
  </div>;
}
