import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from 'react';
import { useSavedVolume } from '../VolumeControls';
import { BrowserSoundPlayer, type SoundCue, type SoundPlayer } from './sound-effects';

const SoundContext = createContext({ play: (_cue: SoundCue, _delay?: number) => {}, volume: .65, setVolume: (_volume: number) => {} });
const createPlayer = () => new BrowserSoundPlayer();

export function SoundEffectsProvider({ children, create = createPlayer }: { children: ReactNode; create?: () => SoundPlayer }) {
  const [volume, setVolume] = useSavedVolume('effects', .65);
  const player = useRef<SoundPlayer | null>(null);
  useEffect(() => {
    const sound = create();
    player.current = sound;
    const unlock = () => sound.unlock();
    window.addEventListener('pointerdown', unlock, true);
    window.addEventListener('keydown', unlock, true);
    return () => {
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('keydown', unlock, true);
      sound.dispose(); player.current = null;
    };
  }, [create]);
  useEffect(() => { player.current?.setVolume(volume); }, [volume]);
  const play = useCallback((cue: SoundCue, delay = 0) => { player.current?.play(cue, delay); }, []);
  return <SoundContext.Provider value={{ play, volume, setVolume }}>{children}</SoundContext.Provider>;
}

export function useSoundEffects() { return useContext(SoundContext); }
