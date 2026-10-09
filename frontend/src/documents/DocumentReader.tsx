import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ArrowRight, FileText, Scan, X, ZoomIn, ZoomOut } from 'lucide-react';
import { documentViewPreference } from './document-view-preference';
import { useSoundEffects } from '../audio/SoundEffects';
import './document-reader.css';

export type Artwork = { src: string; width: number; height: number; description: string };
type Props = {
  title: string;
  transcribable?: boolean;
  description?: string;
  artwork: Artwork;
  children: ReactNode;
  onClose: () => void;
  action?: { label: string; onSelect: () => void };
  navigation?: ReactNode;
  examination?: ReactNode;
};

export function DocumentReader({ title, transcribable = true, description, artwork, children, onClose, action, navigation, examination }: Props) {
  const { play } = useSoundEffects();
  useEffect(() => { play('paper'); }, [artwork.src, play]);
  const [prefersReading, setReading] = useState(() => documentViewPreference.isReading());
  const reading = transcribable && prefersReading;
  const [zoom, setZoom] = useState(1);
  const viewport = useRef<HTMLDivElement>(null);
  const pageId = useId();
  useEffect(() => { setZoom(1); viewport.current?.scrollTo(0, 0); }, [artwork.src]);
  const pageStyle = { '--document-zoom': zoom, '--document-aspect': artwork.width / artwork.height } as CSSProperties;

  function toggleReading() {
    documentViewPreference.setReading(!reading);
    setReading(!reading);
    fitPage();
  }

  function fitPage() {
    setZoom(1);
    viewport.current?.scrollTo(0, 0);
  }

  return <section className="document-reader">
    <header className="document-reader-heading">
      <h1>{title}</h1>
      <button className="document-icon-button" onClick={onClose} aria-label="Close document"><X size={21}/></button>
    </header>
    <div className="document-reader-tools">
      {navigation}
      {transcribable && <button className="document-mode" onClick={toggleReading} aria-controls={pageId} aria-pressed={!reading}>
        {reading ? <Scan size={17}/> : <FileText size={17}/>}
        {reading ? 'View original' : 'Read transcription'}
      </button>}
      {!reading && <div className="document-zoom" role="group" aria-label="Document zoom">
        <button className="document-icon-button" aria-label="Zoom out" disabled={zoom <= 1} onClick={() => setZoom(previous => Math.max(1, previous - .5))}><ZoomOut size={18}/></button>
        <button className="document-fit" onClick={fitPage} aria-label="Fit page">{Math.round(zoom * 100)}%</button>
        <button className="document-icon-button" aria-label="Zoom in" disabled={zoom >= 3} onClick={() => setZoom(previous => Math.min(3, previous + .5))}><ZoomIn size={18}/></button>
      </div>}
    </div>
    <div ref={viewport} className="document-viewport" tabIndex={0} aria-label={reading ? 'Read the document' : 'Inspect the original; use arrow keys to scroll when zoomed'}>
      <div className="document-canvas">
        <div id={pageId} className={`document-page ${reading ? 'is-reading' : 'is-original'}`} style={pageStyle}>
          <img className="document-original" src={artwork.src} width={artwork.width} height={artwork.height} alt={reading ? '' : description ?? artwork.description} draggable={false}/>
          {reading && <article className="document-transcription" aria-label="Document transcription">
            {children}
          </article>}
        </div>
      </div>
    </div>
    {description && <details key={artwork.src} className="document-description"><summary>Visual description</summary><p>{description}</p></details>}
    {examination}
    {action && <footer className="document-reader-footer">
      <button className="document-continue" onClick={action.onSelect}>{action.label}<ArrowRight size={17}/></button>
    </footer>}
  </section>;
}
