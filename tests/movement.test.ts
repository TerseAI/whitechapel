import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MovementSender, RemoteMovement, INTERPOLATION_DELAY_MS } from '../frontend/src/game/movement';
import type { ActionResult } from '../shared/game/types';
import { actionSchema } from '../backend/src/http/requests';

test('movement requests preserve facing independently of displacement', () => {
  const action = { type: 'move', x: 1, z: 0, moving: false, heading: -.75 };
  assert.deepEqual(actionSchema.parse(action), action);
  for (const heading of [NaN, Infinity, -Infinity, 'left']) {
    assert.equal(actionSchema.safeParse({ ...action, heading }).success, false);
  }
});

test('remote movement keeps the transmitted facing when a packet spans a turn', () => {
  const motion = new RemoteMovement({ x: 0, z: 0 }, 0, Math.PI / 2);
  motion.push({ x: 1, z: 1 }, true, 0, 100);
  const walking = motion.sample(50 + INTERPOLATION_DELAY_MS);
  assert.equal(walking.x, .5);
  assert.equal(walking.z, .5);
  assert.equal(walking.heading, 0, 'Face the final walking direction, even when the packet displacement is diagonal.');
  motion.push({ x: 1.1, z: 1 }, false, Math.PI, 200);
  assert.equal(motion.sample(150 + INTERPOLATION_DELAY_MS).heading, Math.PI);
  assert.equal(motion.sample(400 + INTERPOLATION_DELAY_MS).heading, Math.PI);
});

test('a stationary turn reaches the partner and survives a fresh movement buffer', () => {
  const motion = new RemoteMovement({ x: 1, z: 2 }, 0, Math.PI / 2);
  motion.push({ x: 1, z: 2 }, false, 0, 100);
  const stopped = motion.sample(300 + INTERPOLATION_DELAY_MS);
  assert.deepEqual(stopped, { x: 1, z: 2, moving: false, heading: 0, at: 100 });
  const rejoined = new RemoteMovement(stopped, 500, stopped.heading);
  assert.equal(rejoined.sample(600).heading, 0);
});

test('remote walking stays continuous through uneven position arrivals and settles at the stop', () => {
  const motion = new RemoteMovement({ x: 0, z: 0 }, 0);
  const arrivals = [100, 215, 302, 410, 500, 618, 702, 810, 900, 1000];
  let index = 0, previous = 0;
  for (let now = 0; now <= 1200; now += 10) {
    while (index < arrivals.length && arrivals[index] <= now) {
      motion.push({ x: (index + 1) * .34, z: 0 }, index < 9, Math.PI / 2, arrivals[index]); index++;
    }
    const sample = motion.sample(now);
    assert.ok(sample.x >= previous, `must not jump backwards at ${now}`);
    assert.ok(sample.x - previous < .05, `must not snap to a packet at ${now}`);
    if (now > 250 && now < 1100) assert.equal(sample.moving, true, `continuous walking at ${now}`);
    previous = sample.x;
  }
  const stopped = motion.sample(1500);
  assert.equal(stopped.x, 3.4000000000000004);
  assert.equal(stopped.moving, false);
});

test('movement follows corners, ignores stale samples, and resets large travel jumps', () => {
  const motion = new RemoteMovement({ x: 0, z: 0 }, 0);
  motion.push({ x: 1, z: 0 }, true, Math.PI / 2, 100);
  motion.push({ x: 1, z: 1 }, false, 0, 200);
  motion.push({ x: -4, z: 0 }, true, 0, 150);
  const corner = motion.sample(150 + INTERPOLATION_DELAY_MS);
  assert.equal(corner.x, 1); assert.equal(corner.z, .5);
  motion.push({ x: 1, z: 9 }, false, 0, 300);
  assert.equal(motion.sample(300).z, 9);
});

test('remote walking remains continuous with the cloud’s 200–350 ms update intervals', () => {
  for (const interval of [200, 300, 350]) {
    const motion = new RemoteMovement({ x: 0, z: 0 }, 0);
    let next = interval, previous = 0;
    for (let now = 0; now <= 6000; now += 10) {
      if (now >= next) {
        motion.push({ x: next / 1000, z: 0 }, true, Math.PI / 2, next);
        next += interval;
      }
      const sample = motion.sample(now);
      if (now > 1000) {
        assert.equal(sample.moving, true, `walking at ${now} with ${interval} ms updates`);
        assert.ok(sample.x >= previous, 'buffer adaptation must not rewind movement');
        assert.ok(sample.x - previous < .025, 'buffer adaptation must not jump forward');
        assert.ok(now / 1000 - sample.x < .5, 'buffering stays below half a second');
      }
      previous = sample.x;
    }
  }
});

test('prediction covers a late update but is bounded when the connection stops', () => {
  const motion = new RemoteMovement({ x: 0, z: 0 }, 0);
  motion.push({ x: .1, z: 0 }, true, Math.PI / 2, 100);
  const predicted = motion.sample(300);
  assert.ok(predicted.x > .1);
  assert.equal(predicted.moving, true);
  const stalled = motion.sample(2000);
  assert.ok(stalled.x <= .25);
  assert.equal(stalled.moving, false);
  assert.deepEqual(motion.sample(3000), stalled);
});

test('a late stop corrects prediction smoothly and settles on the authoritative position', () => {
  const motion = new RemoteMovement({ x: 0, z: 0 }, 0);
  motion.push({ x: .1, z: 0 }, true, Math.PI / 2, 100);
  let previous = motion.sample(350).x;
  assert.ok(previous > .1);
  motion.push({ x: .1, z: 0 }, false, 0, 360);
  for (let now = 360; now <= 1200; now += 10) {
    const sample = motion.sample(now);
    assert.ok(Math.abs(sample.x - previous) < .04, `no correction snap at ${now}`);
    previous = sample.x;
  }
  const stopped = motion.sample(1500);
  assert.equal(stopped.x, .1);
  assert.equal(stopped.moving, false);
  assert.equal(stopped.heading, 0);
});

test('travel discards prediction and correction from the previous scene', () => {
  const motion = new RemoteMovement({ x: 0, z: 0 }, 0);
  motion.push({ x: .1, z: 0 }, true, 0, 100);
  motion.sample(350);
  motion.push({ x: 10, z: 10 }, false, Math.PI, 400);
  assert.deepEqual(motion.sample(400), { x: 10, z: 10, at: 400, heading: Math.PI, moving: false });
});

test('a slow movement request sends only the latest queued position and preserves the final stop', async () => {
  const sent: { x: number; z: number; moving: boolean; heading?: number }[] = [];
  const completions: ((result: ActionResult) => void)[] = [];
  const sender = new MovementSender(move => { sent.push(move); return new Promise(resolve => completions.push(resolve)); });
  const first = sender.send({ x: 1, z: 0, moving: true, heading: Math.PI / 2 });
  const skipped = sender.send({ x: 2, z: 0, moving: true, heading: Math.PI / 2 });
  const final = sender.send({ x: 3, z: 0, moving: false, heading: 0 });
  assert.equal(sent.length, 1);
  completions[0]({ ok: true, message: '' });
  await first;
  assert.deepEqual(sent, [{ x: 1, z: 0, moving: true, heading: Math.PI / 2 }, { x: 3, z: 0, moving: false, heading: 0 }]);
  completions[1]({ ok: true, message: 'stopped' });
  assert.equal((await skipped).message, 'stopped'); assert.equal((await final).ok, true);
});
