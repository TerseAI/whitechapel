import type { InterviewSpeech, SpeechLine } from '../../../shared/game/types';
import { speechPosition } from '../../../shared/game/interview-speech';

export type SpeechCue = { speech: InterviewSpeech; line: SpeechLine; index: number; status: 'loading' | 'playing' | 'blocked' | 'missing' | 'waiting'; progress: number };
export type AudioPort = Pick<HTMLAudioElement, 'pause' | 'play' | 'src' | 'currentTime' | 'volume' | 'addEventListener' | 'removeEventListener'>;
// The room timeline keeps nearby listeners together. Playback events, rather
// than a timer alone, determine whether the UI says a voice is playing.
export class SpeechPlayback {
  private speech: InterviewSpeech | undefined;
  private now: () => number = Date.now;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private cleanup: (() => void) | undefined;
  private generation = 0;
  constructor(private audio: AudioPort, private url: (clip: string, text: string) => string | null, private onLine: (cue: SpeechCue | null) => void, private onError: (kind: 'gesture' | 'load' | null) => void) {}
  prime() {
    if (this.speech) return;
    const generation = ++this.generation;
    this.audio.src = '/audio/silence.wav';
    void this.audio.play().then(() => { if (generation === this.generation) this.audio.pause(); }).catch(() => {});
  }
  follow(speech: InterviewSpeech | undefined, now: () => number, volume = 1) {
    this.audio.volume = volume;
    this.now = now;
    if (this.speech?.id === speech?.id) return;
    this.stop(); this.speech = speech;
    if (speech) this.tick();
  }
  stop() {
    this.generation++;
    clearTimeout(this.timer); this.cleanup?.(); this.cleanup = undefined;
    this.audio.pause(); this.speech = undefined; this.onLine(null); this.onError(null);
  }
  resume() { if (this.speech) this.tick(); }
  private tick() {
    clearTimeout(this.timer); this.cleanup?.(); this.cleanup = undefined;
    const speech = this.speech;
    if (!speech) return;
    const now = this.now(), position = speechPosition(speech, now);
    if (!position) { this.stop(); return; }
    if (position.start > now) { this.timer = setTimeout(() => this.tick(), position.start - now); return; }
    const generation = ++this.generation;
    this.audio.pause();
    let status: SpeechCue['status'] = 'loading';
    const emit = (next = status) => {
      if (generation !== this.generation) return;
      status = next;
      this.onLine({ speech, line: position.line, index: position.index, status, progress: Math.min(1, Math.max(0, this.audio.currentTime * 1000 / position.line.durationMs)) });
    };
    const source = this.url(position.line.clip, position.line.text);
    if (!source) { emit('missing'); this.onError('load'); }
    else {
      emit('loading');
      const loaded = () => {
        if (generation !== this.generation) return;
        const live = speechPosition(speech, this.now());
        if (!live || live.index !== position.index) return;
        try { this.audio.currentTime = live.offset / 1000; } catch { /* The next line remains playable if seeking fails. */ }
      };
      const playing = () => { emit('playing'); if (generation === this.generation) this.onError(null); };
      const waiting = () => emit('loading');
      const ended = () => emit('waiting');
      const progress = () => emit();
      const failed = () => { emit('missing'); if (generation === this.generation) this.onError('load'); };
      const events = { loadedmetadata: loaded, playing, waiting, ended, timeupdate: progress, error: failed };
      for (const [name, handler] of Object.entries(events)) this.audio.addEventListener(name, handler);
      this.cleanup = () => { for (const [name, handler] of Object.entries(events)) this.audio.removeEventListener(name, handler); };
      this.audio.src = source;
      void this.audio.play().then(playing).catch(error => {
        if (generation !== this.generation || error?.name === 'AbortError') return;
        const blocked = error?.name === 'NotAllowedError';
        emit(blocked ? 'blocked' : 'missing'); this.onError(blocked ? 'gesture' : 'load');
      });
    }
    this.timer = setTimeout(() => this.tick(), Math.max(1, position.end - this.now()));
  }
}
