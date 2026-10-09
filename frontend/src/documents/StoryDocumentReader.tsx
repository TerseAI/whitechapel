import { useState } from 'react';
import type { StoryDocument } from '../../../shared/story/types';
import { useStory, storyImage } from '../story/StoryProvider';
import { DocumentReader } from './DocumentReader';
import { hasTranscription } from './document-presentation';
import { FlipHorizontal } from 'lucide-react';
import { SourceTranscription } from './SourceTranscription';

export function StoryDocumentReader({ document, onClose, action }: { document: StoryDocument; onClose: () => void; action?: { label: string; onSelect: () => void } }) {
  const [index, setIndex] = useState(0);
  const story = useStory();
  const page = document.pages[index];
  const artwork = storyImage(story, page.artwork)!;
  return <DocumentReader title={document.title} transcribable={hasTranscription(page)} description={page.description} artwork={artwork} onClose={onClose} action={action}
    navigation={document.presentation === 'photograph' && document.pages.length === 2 ? <button className="document-turn" onClick={() => setIndex(index === 0 ? 1 : 0)}><FlipHorizontal size={18}/>{index === 0 ? 'Turn over' : 'View photograph'}</button> : document.pages.length > 1 && <nav className="document-pages" aria-label="Document pages">{document.pages.map((page, i) => <button key={i} aria-pressed={index === i} onClick={() => setIndex(i)}>{page.label}</button>)}</nav>}>
    <SourceTranscription page={page}/>
  </DocumentReader>;
}
