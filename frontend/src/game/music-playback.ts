export type MusicAudio = Pick<HTMLAudioElement, 'src' | 'loop' | 'preload' | 'volume' | 'paused' | 'play' | 'pause'>;

export class MusicPlayback {
  private active = false;
  private unlocked = false;
  private disposed = false;
  private pending = false;
  private volume = 0;

  constructor(private audio: MusicAudio, source = '') {
    audio.src = source;
    audio.loop = true;
    audio.preload = 'none';
    audio.volume = 0;
  }

  configure(active: boolean, volume: number, speaking: boolean) {
    this.active = active;
    this.volume = Number.isFinite(volume) ? Math.max(0, Math.min(1, volume)) : 0;
    this.audio.volume = this.volume * (speaking ? .3 : 1);
    this.update();
  }

  unlock() { this.unlocked = true; this.update(); }

  dispose() { this.disposed = true; this.audio.pause(); }

  private shouldPlay() { return this.active && this.unlocked && this.volume > 0 && !this.disposed; }

  private update() {
    if (!this.shouldPlay()) { this.audio.pause(); return; }
    if (!this.audio.paused || this.pending) return;
    this.pending = true;
    void this.audio.play().catch(() => {}).finally(() => {
      this.pending = false;
      if (!this.shouldPlay()) this.audio.pause();
    });
  }
}
