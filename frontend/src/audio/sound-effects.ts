export type SoundCue = 'link' | 'review' | 'chapter' | 'paper';
export const soundFiles: Record<SoundCue, string> = {
  link: '/audio/effects/lead-established.wav',
  review: '/audio/effects/review-ready.wav',
  chapter: '/audio/effects/chapter-complete.wav',
  paper: '/audio/effects/paper-rustle.mp3',
};

export interface SoundPlayer {
  unlock(): void;
  play(cue: SoundCue, delay?: number): void;
  setVolume(volume: number): void;
  dispose(): void;
}

export class BrowserSoundPlayer implements SoundPlayer {
  private context: AudioContext | null = null;
  private gain: GainNode | null = null;
  private buffers = new Map<SoundCue, Promise<AudioBuffer | null>>();
  private volume = .65;
  private disposed = false;
  private pendingPaper = false;
  private lastPaper = -Infinity;

  unlock() {
    if (this.disposed) return;
    try {
      if (!this.context) {
        this.context = new AudioContext();
        this.gain = this.context.createGain();
        this.gain.gain.value = this.volume;
        this.gain.connect(this.context.destination);
        for (const cue of Object.keys(soundFiles) as SoundCue[]) this.load(cue);
      }
      void this.context.resume().then(() => {
        if (this.pendingPaper) { this.pendingPaper = false; this.play('paper'); }
      }).catch(() => {});
    } catch { /* The enquiry also works when audio is unavailable. */ }
  }

  play(cue: SoundCue, delay = 0) {
    if (this.disposed || this.volume === 0) return;
    if (!this.context || this.context.state !== 'running') {
      if (cue === 'paper') this.pendingPaper = true;
      return;
    }
    if (cue === 'paper') {
      if (this.context.currentTime - this.lastPaper < .15) return;
      this.lastPaper = this.context.currentTime;
    }
    const context = this.context;
    const at = context.currentTime + delay;
    void this.load(cue).then(buffer => {
      if (!buffer || this.disposed || !this.gain || this.volume === 0 || context.state !== 'running') return;
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(this.gain);
      source.onended = () => source.disconnect();
      source.start(Math.max(context.currentTime, at));
    });
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.gain) this.gain.gain.value = this.volume;
    if (!this.volume) this.pendingPaper = false;
  }

  dispose() {
    this.disposed = true;
    void this.context?.close().catch(() => {});
  }

  private load(cue: SoundCue) {
    if (!this.buffers.has(cue)) {
      const context = this.context!;
      this.buffers.set(cue, fetch(soundFiles[cue]).then(response => {
        if (!response.ok) throw new Error('Sound unavailable');
        return response.arrayBuffer();
      }).then(data => context.decodeAudioData(data)).catch(() => null));
    }
    return this.buffers.get(cue)!;
  }
}
