import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TUNE, driveScale, moveVector, headingOf, angleLerp, camDist, camHeight, outOfWorld,
  clampFrameDelta, consumeFixedSteps,
} from './logic.js';

test('moveVector: stick-forward at camYaw 0 drives toward -z, unit-clamped', () => {
  const v = moveVector(0, 0, 1);
  assert.ok(Math.abs(v.x) < 1e-9);
  assert.ok(v.z < 0);
  assert.ok(Math.abs(Math.hypot(v.x, v.z) - 1) < 1e-9);
  const big = moveVector(0, 3, 4); // magnitude 5 stick input still clamps to 1
  assert.ok(Math.hypot(big.x, big.z) <= 1 + 1e-9);
});

test('moveVector: camera yaw rotates the drive frame', () => {
  const v = moveVector(Math.PI / 2, 0, 1); // camera on +x looking -x: forward = -x
  assert.ok(v.x < -0.99);
  assert.ok(Math.abs(v.z) < 1e-9);
});

test('headingOf inverts moveVector forward', () => {
  const yaw = 0.7;
  const v = moveVector(yaw, 0, 1);
  assert.ok(Math.abs(angleLerp(headingOf(v.x, v.z), yaw, 0) - yaw) < 1e-6);
});

test('angleLerp wraps across ±π instead of spinning the long way', () => {
  const r = angleLerp(Math.PI - 0.1, -Math.PI + 0.1, 0.5);
  assert.ok(Math.abs(Math.abs(r) - Math.PI) < 0.11);
});

test('driveScale: full push at rest, zero at terminal speed', () => {
  assert.equal(driveScale(0, TUNE.MAX_SPEED), 1);
  assert.equal(driveScale(TUNE.MAX_SPEED, TUNE.MAX_SPEED), 0);
  assert.equal(driveScale(TUNE.MAX_SPEED * 2, TUNE.MAX_SPEED), 0); // never negative
});

test('outOfWorld: margins past bounds and depth below floor', () => {
  const bounds = { minX: -12, maxX: 12, minZ: -12, maxZ: 12 };
  assert.equal(outOfWorld({ x: 0, y: 0.5, z: 0 }, bounds), false);
  assert.equal(outOfWorld({ x: 12 + TUNE.OOB_MARGIN + 0.1, y: 0.5, z: 0 }, bounds), true);
  assert.equal(outOfWorld({ x: 0, y: TUNE.OOB_DEPTH - 0.1, z: 0 }, bounds), true);
  assert.equal(outOfWorld({ x: 0, y: 0.5, z: 12 + TUNE.OOB_MARGIN + 0.1 }, bounds), true);
});

test('camera curves: distance clamps to its minimum, height stays positive', () => {
  assert.equal(camDist(0), TUNE.CAM_DIST_MIN);
  assert.ok(camDist(TUNE.PLAYER_R) >= TUNE.CAM_DIST_MIN);
  assert.ok(camHeight(TUNE.PLAYER_R) > 0);
});

test('fixed physics clock advances 60 steps per second at common render rates', () => {
  for (const renderHz of [30, 60, 90, 120, 144]) {
    let accumulator = 0, steps = 0;
    for (let frame = 0; frame < renderHz; frame++) {
      const result = consumeFixedSteps(accumulator, 1 / renderHz);
      accumulator = result.remainder;
      steps += result.steps;
    }
    assert.equal(steps, 60, `${renderHz} Hz render loop`);
    assert.ok(accumulator < TUNE.PHYSICS_DT);
  }
});

test('fixed physics clock clamps invalid deltas and long background stalls', () => {
  assert.equal(clampFrameDelta(-1), 0);
  assert.equal(clampFrameDelta(Number.NaN), 0);
  const result = consumeFixedSteps(0, 1);
  assert.equal(result.dt, TUNE.MAX_FRAME_DT);
  assert.equal(result.steps, TUNE.MAX_PHYSICS_STEPS);
  assert.ok(result.dropped >= 0.9);
  assert.ok(result.remainder < TUNE.PHYSICS_DT);
});
