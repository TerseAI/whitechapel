import { useStory, storyAsset } from './story/StoryProvider';
import { useEffect, useRef, useState } from 'react';
import { MusicPlayback } from './game/music-playback';

export function useMusic(active: boolean, volume: number, speaking: boolean) {
  const story = useStory();
  const playback = useRef<MusicPlayback | null>(null);
  const [visible, setVisible] = useState(() => !document.hidden);

  useEffect(() => {
    const music = new MusicPlayback(new Audio(), story.music ? storyAsset(story, story.music) : '');
    playback.current = music;
    const unlock = () => music.unlock();
    const visibility = () => setVisible(!document.hidden);
    window.addEventListener('pointerdown', unlock, true);
    window.addEventListener('keydown', unlock, true);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      music.dispose(); playback.current = null;
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('keydown', unlock, true);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);

  useEffect(() => { playback.current?.configure(!!story.music && active && visible, volume, speaking); }, [active, visible, volume, speaking]);
}
