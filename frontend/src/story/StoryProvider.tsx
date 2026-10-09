import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { StoryPresentation } from '../../../shared/story/types';

const StoryContext = createContext<StoryPresentation | null>(null);

export function StoryProvider({ children }: { children: ReactNode }) {
  const [story, setStory] = useState<StoryPresentation | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const abort = new AbortController();
    void fetch('/api/story', { signal: abort.signal }).then(async response => {
      if (!response.ok) throw new Error('The investigation could not load.');
      const story: StoryPresentation = await response.json();
      document.title = story.title;
      setStory(story);
    }).catch(error => { if (!abort.signal.aborted) setError(error.message); });
    return () => abort.abort();
  }, []);
  if (!story) return <main className="connecting"><h1>{error || 'Opening the investigation…'}</h1>{error && <button onClick={() => location.reload()}>Try again</button>}</main>;
  return <StoryContext.Provider value={story}>{children}</StoryContext.Provider>;
}

export function useStory() {
  const story = useContext(StoryContext);
  if (!story) throw new Error('StoryProvider is required.');
  return story;
}

export function storyAsset(story: Pick<StoryPresentation, 'id' | 'version'>, path: string) {
  return `/story-assets/${story.id}/${story.version}/${path}`;
}

export function storyImage(story: StoryPresentation, id?: string) {
  const image = id ? story.assets[id] : undefined;
  return image && { ...image, src: storyAsset(story, image.src) };
}
