import { useEffect, useRef, useState } from 'react';
import { openMicrophoneDetector } from './mic-vad-detector';
import { VoiceTurns, type TranscribeRecording, type VoiceMode, type VoiceState } from './voice-turns';

const modeKey = 'investigation.voice-mode';

export function useVoiceTurns(transcribe: TranscribeRecording, deliver: (text: string) => Promise<unknown>, available: boolean) {
  const latest = useRef({ transcribe, deliver, available });
  latest.current = { transcribe, deliver, available };
  const voice = useRef<VoiceTurns | null>(null);
  const [state, setState] = useState<VoiceState>(() => ({ status: 'off', mode: savedMode(), error: '' }));

  useEffect(() => {
    const turns: VoiceTurns = new VoiceTurns(openMicrophoneDetector, (audio, signal) => latest.current.transcribe(audio, signal),
      text => latest.current.deliver(text), next => { if (voice.current === turns) setState(next); }, savedMode());
    voice.current = turns;
    turns.setAvailable(latest.current.available);
    return () => { voice.current = null; void turns.close(); };
  }, []);
  useEffect(() => { voice.current?.setAvailable(available); }, [available]);
  useHoldKey(state.mode === 'hold' && state.status !== 'off', voice);

  return {
    ...state,
    enable: () => void voice.current?.enable(),
    press: () => void voice.current?.press(),
    release: () => void voice.current?.release(),
    cancel: () => void voice.current?.cancel(),
    setMode: (mode: VoiceMode) => { saveMode(mode); void voice.current?.setMode(mode); },
  };
}

function useHoldKey(active: boolean, voice: { current: VoiceTurns | null }) {
  useEffect(() => {
    if (!active) return;
    const handle = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || event.repeat || typing(event.target)) return;
      event.preventDefault();
      void (event.type === 'keydown' ? voice.current?.press() : voice.current?.release());
    };
    window.addEventListener('keydown', handle);
    window.addEventListener('keyup', handle);
    return () => { window.removeEventListener('keydown', handle); window.removeEventListener('keyup', handle); void voice.current?.release(); };
  }, [active, voice]);
}

function typing(target: EventTarget | null) {
  return target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName));
}

function savedMode(): VoiceMode {
  try { return localStorage.getItem(modeKey) === 'hold' ? 'hold' : 'hands-free'; } catch { return 'hands-free'; }
}

function saveMode(mode: VoiceMode) {
  try { localStorage.setItem(modeKey, mode); } catch { /* The choice still applies for this conversation. */ }
}
