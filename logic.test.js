import test from 'node:test';
import assert from 'node:assert/strict';
import { TUNE, driveScale, moveVector, headingOf, angleLerp, camDist, camHeight, outOfWorld, introSegment } from './logic.js';

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

test('introSegment: segments advance per line, ease stays in [0,1], ends after last line', () => {
  const n = 4, s = TUNE.INTRO_SEG_SEC;
  assert.deepEqual(introSegment(0, n).seg, 0);
  assert.equal(introSegment(s * 1.5, n).seg, 1);
  assert.equal(introSegment(s * 99, n).seg, n - 1); // clamps, never overruns the arrays
  const mid = introSegment(s * 0.5, n);
  assert.ok(mid.u > 0 && mid.u < 1 && !mid.done);
  assert.equal(introSegment(s * n + 0.01, n).done, true);
});
