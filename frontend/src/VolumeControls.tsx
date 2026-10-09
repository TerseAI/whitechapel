import { useEffect, useId, useState } from 'react';
import { ChevronDown, Volume2, VolumeX } from 'lucide-react';
import './volume-controls.css';

export function VolumeControls({ solo = false, selfVolume, partnerVolume, musicVolume, effectsVolume, onSelfChange, onPartnerChange, onMusicChange, onEffectsChange, onOpen }: {
  solo?: boolean; selfVolume: number; partnerVolume: number; musicVolume: number; effectsVolume: number;
  onSelfChange: (volume: number) => void; onPartnerChange: (volume: number) => void; onMusicChange: (volume: number) => void; onEffectsChange: (volume: number) => void; onOpen: () => void;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return <div className="volume-controls">
    <button className="sound-button volume-trigger" popoverTarget={id} aria-label="Volume controls" aria-expanded={open} title="Volume" onClick={onOpen}>
      {selfVolume || (!solo && partnerVolume) || musicVolume || effectsVolume ? <Volume2 size={19}/> : <VolumeX size={19}/>}<ChevronDown size={12}/>
    </button>
    <div id={id} popover="auto" className="volume-panel" onToggle={event => setOpen(event.newState === 'open')}>
      <h2>Volume</h2>
      <VolumeSlider id={`${id}-self`} label="Your volume" volume={selfVolume} onChange={onSelfChange}/>
      {!solo && <VolumeSlider id={`${id}-partner`} label="Partner volume" volume={partnerVolume} onChange={onPartnerChange}/>}
      <VolumeSlider id={`${id}-music`} label="Music volume" volume={musicVolume} onChange={onMusicChange}/>
      <VolumeSlider id={`${id}-effects`} label="Sound effects" volume={effectsVolume} onChange={onEffectsChange}/>
      <details className="music-credits"><summary>Music credits</summary><p><a href="https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100783" target="_blank" rel="noreferrer">Darkest Child</a><br/>Kevin MacLeod (incompetech.com)<br/>Licensed under <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>. Recording unmodified.</p></details>
    </div>
  </div>;
}

function VolumeSlider({ id, label, volume, onChange }: { id: string; label: string; volume: number; onChange: (volume: number) => void }) {
  const percent = Math.round(volume * 100);
  return <div className="volume-slider">
    <div><label htmlFor={id}>{label}</label><output htmlFor={id}>{percent === 0 ? 'Muted' : `${percent}%`}</output></div>
    <input id={id} type="range" min="0" max="100" step="1" value={percent} aria-valuetext={percent === 0 ? 'Muted' : `${percent}%`} onChange={event => onChange(Number(event.target.value) / 100)}/>
  </div>;
}

export function useSavedVolume(channel: 'self' | 'partner' | 'music' | 'effects', defaultVolume = 1) {
  const [volume, setVolume] = useState(() => {
    try {
      const saved = localStorage.getItem(`investigation.volume.${channel}`);
      if (saved !== null && Number.isFinite(Number(saved))) return Math.min(1, Math.max(0, Number(saved)));
      return defaultVolume;
    } catch { return defaultVolume; }
  });
  useEffect(() => { try { localStorage.setItem(`investigation.volume.${channel}`, String(volume)); } catch {} }, [channel, volume]);
  return [volume, setVolume] as const;
}
