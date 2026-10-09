import type { ActionResult } from '../../../shared/game/types';
import { WALK_SPEED, type Point } from '../../../shared/game/navigation';

export const MOVEMENT_INTERVAL_MS = 100;
export const INTERPOLATION_DELAY_MS = 150;
type Move = Point & { moving: boolean; heading?: number };

// Keep one request in flight and the newest pending position. Slow connections
// must not accumulate seconds of obsolete positions ahead of a final arrival.
export class MovementSender {
  private pending: { move: Move; resolve: ((result: ActionResult) => void)[] } | null = null;
  private running = false;
  constructor(private transmit: (move: Move) => Promise<ActionResult>) {}
  send(move: Move): Promise<ActionResult> {
    return new Promise(resolve => {
      if (this.pending) { this.pending.move = move; this.pending.resolve.push(resolve); }
      else this.pending = { move, resolve: [resolve] };
      if (!this.running) void this.flush();
    });
  }
  private async flush() {
    this.running = true;
    while (this.pending) {
      const next = this.pending; this.pending = null;
      let result: ActionResult;
      try { result = await this.transmit(next.move); }
      catch { result = { ok: false, message: 'Movement could not be saved. Reconnect and try again.' }; }
      next.resolve.forEach(resolve => resolve(result));
    }
    this.running = false;
  }
}

type Sample = Point & { at: number; moving: boolean; heading: number };
export class RemoteMovement {
  private samples: Sample[];
  private intervals: number[] = [];
  private delay = INTERPOLATION_DELAY_MS;
  private playbackAt?: number;
  private sampledAt?: number;
  private displayed?: Sample;
  private correction: Point = { x: 0, z: 0 };
  constructor(position: Point, at: number, heading = 0) { this.samples = [{ ...position, at, moving: false, heading }]; }
  push(position: Point, moving: boolean, heading: number, at: number) {
    const last = this.samples.at(-1)!;
    if (at <= last.at) return;
    const distance = Math.hypot(position.x - last.x, position.z - last.z);
    if (distance > 6) {
      this.reset({ ...position, moving, heading, at });
      return;
    }
    if (moving && last.moving && at - last.at <= 500) this.trackInterval(at - last.at);
    if (at - last.at > 500) this.samples = [{ ...last, at: at - MOVEMENT_INTERVAL_MS }];
    this.samples.push({ ...position, moving, heading, at });
    if (this.samples.length > 40) this.samples.shift();
    if (this.displayed && this.playbackAt !== undefined && this.playbackAt > last.at) {
      const resumed = this.read(this.playbackAt);
      this.correction = { x: this.displayed.x - resumed.x, z: this.displayed.z - resumed.z };
    }
  }
  sample(now: number): Sample {
    const elapsed = this.sampledAt === undefined ? 0 : Math.max(0, now - this.sampledAt);
    const target = now - this.delay;
    // Change playback speed gently when the buffer grows; never rewind its clock.
    this.playbackAt = this.playbackAt === undefined || elapsed > 500 ? target
      : this.playbackAt + Math.max(elapsed * .8, Math.min(elapsed * 1.2, target - this.playbackAt));
    this.sampledAt = now;
    const sample = this.read(this.playbackAt);
    const decay = Math.exp(-elapsed / 80);
    this.correction.x *= decay; this.correction.z *= decay;
    if (Math.hypot(this.correction.x, this.correction.z) < .001) this.correction = { x: 0, z: 0 };
    this.displayed = { ...sample, x: sample.x + this.correction.x, z: sample.z + this.correction.z };
    return this.displayed;
  }
  private reset(sample: Sample) {
    this.samples = [sample];
    this.intervals = []; this.delay = INTERPOLATION_DELAY_MS;
    this.playbackAt = this.sampledAt = undefined; this.displayed = undefined;
    this.correction = { x: 0, z: 0 };
  }
  private trackInterval(interval: number) {
    this.intervals = [...this.intervals.slice(-7), interval];
    this.delay = Math.max(INTERPOLATION_DELAY_MS, Math.min(350, Math.max(...this.intervals) + 50));
  }
  private read(at: number): Sample {
    while (this.samples.length > 2 && this.samples[1].at <= at) this.samples.shift();
    const a = this.samples[0], b = this.samples[1];
    if (!b) return { ...a, moving: false };
    if (at >= b.at) return this.predict(a, b, at);
    if (at < a.at) return { ...a, moving: false };
    const fraction = (at - a.at) / (b.at - a.at);
    const dx = b.x - a.x, dz = b.z - a.z;
    return { x: a.x + dx * fraction, z: a.z + dz * fraction, at, moving: Math.hypot(dx, dz) > .001, heading: b.heading };
  }
  private predict(a: Sample, b: Sample, at: number): Sample {
    if (!b.moving) return { ...b };
    const dx = b.x - a.x, dz = b.z - a.z;
    const elapsed = Math.min(150, at - b.at);
    const duration = Math.max(b.at - a.at, Math.hypot(dx, dz) / WALK_SPEED * 1000);
    return { ...b, x: b.x + dx * elapsed / duration, z: b.z + dz * elapsed / duration,
      at: b.at + elapsed, moving: elapsed < 150 && Math.hypot(dx, dz) > .001 };
  }
}
