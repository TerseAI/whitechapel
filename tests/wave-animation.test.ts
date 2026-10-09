import assert from 'node:assert/strict';
import { test } from 'node:test';
import { waveProgress, WAVE_DURATION_MS } from '../shared/game/gestures';
import { waveArmPose, faceCameraHeading } from '../frontend/src/game/wave-animation';

test('a wave faces the camera from the detective position and expires without replay', () => {
  assert.equal(faceCameraHeading({ x: 2, z: 3 }, { x: 2, z: 10 }), 0);
  assert.equal(faceCameraHeading({ x: 2, z: 3 }, { x: 9, z: 3 }), Math.PI / 2);
  const gesture = { kind: 'wave' as const, at: 1000, heading: 0 };
  assert.equal(waveProgress(gesture, 999), null);
  assert.equal(waveProgress(gesture, 1000), 0);
  assert.equal(waveProgress(gesture, 1000 + WAVE_DURATION_MS), null);
});

test('the wave raises and lowers the hand; reduced motion holds a quiet raised hand', () => {
  assert.deepEqual(waveArmPose(null, false), { x: 0, z: 0 });
  assert.equal(waveArmPose(0, false).z, 0);
  assert.ok(Math.abs(waveArmPose(.5, false).z) > 2);
  assert.deepEqual(waveArmPose(.4, true), waveArmPose(.6, true));
  assert.ok(Math.abs(waveArmPose(.99, false).z) < .05);
});
