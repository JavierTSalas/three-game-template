import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TUNE, driveScale, moveVector, headingOf, angleLerp, camDist, camHeight, outOfWorld,
  clampFrameDelta, consumeFixedSteps, gradePulse, applyPulse, zoneForRadius, decaySpin,
  advanceWobble, advanceFlow, scoreRate, pulseFrequency,
} from './logic.js';

test('moveVector: stick-forward at camYaw 0 drives toward -z, unit-clamped', () => {
  const v = moveVector(0, 0, 1);
  assert.ok(Math.abs(v.x) < 1e-9);
  assert.ok(v.z < 0);
  assert.ok(Math.abs(Math.hypot(v.x, v.z) - 1) < 1e-9);
  assert.ok(Math.hypot(moveVector(0, 3, 4).x, moveVector(0, 3, 4).z) <= 1 + 1e-9);
});

test('moveVector and heading follow the camera frame', () => {
  const v = moveVector(Math.PI / 2, 0, 1);
  assert.ok(v.x < -0.99);
  assert.ok(Math.abs(v.z) < 1e-9);
  const yaw = 0.7, fwd = moveVector(yaw, 0, 1);
  assert.ok(Math.abs(angleLerp(headingOf(fwd.x, fwd.z), yaw, 0) - yaw) < 1e-6);
});

test('angleLerp wraps across ±π instead of spinning the long way', () => {
  const r = angleLerp(Math.PI - 0.1, -Math.PI + 0.1, 0.5);
  assert.ok(Math.abs(Math.abs(r) - Math.PI) < 0.11);
});

test('pulse grading wraps around the strike line', () => {
  assert.equal(gradePulse(0), 'perfect');
  assert.equal(gradePulse(0.99), 'perfect');
  assert.equal(gradePulse(TUNE.PULSE_PERFECT_WINDOW + 0.01), 'good');
  assert.equal(gradePulse(0.5), 'miss');
  assert.ok(pulseFrequency(1) > pulseFrequency(0));
});

test('perfect pulses reward energy, stability, flow, chain, and score', () => {
  const start = { energy: 0.5, wobble: 0.5, flow: 1, chain: 2 };
  const perfect = applyPulse(start, 'perfect');
  assert.ok(perfect.energy > start.energy);
  assert.ok(perfect.wobble < start.wobble);
  assert.ok(perfect.flow > start.flow);
  assert.equal(perfect.chain, 3);
  assert.ok(perfect.bonus > 0);
  const miss = applyPulse(start, 'miss');
  assert.ok(miss.energy < start.energy);
  assert.ok(miss.wobble > start.wobble);
  assert.equal(miss.chain, 0);
});

test('riskier arena bands multiply score', () => {
  assert.deepEqual(zoneForRadius(0), { name: 'CENTER', multiplier: 1, danger: 0 });
  assert.equal(zoneForRadius(7).name, 'OUTER');
  assert.equal(zoneForRadius(10).multiplier, 4);
  assert.equal(zoneForRadius(11).name, 'VOID');
  const center = scoreRate(0.8, 4, 1);
  assert.ok(scoreRate(0.8, 4, 4) >= center * 4);
  assert.ok(scoreRate(0.8, 4, 4, true) > scoreRate(0.8, 4, 4));
});

test('spin, wobble, and flow evolve in the intended directions', () => {
  assert.ok(decaySpin(0.8, 0.6, 1) < 0.8);
  assert.ok(advanceWobble(0.6, { energy: 0.8, steer: 1, recovering: true }, 1) < 0.6);
  assert.ok(advanceWobble(0.2, { energy: 0.1, steer: 1 }, 1) > 0.2);
  assert.ok(advanceFlow(5, 1, 1) < advanceFlow(5, 1, 2.5));
});

test('driveScale and camera curves stay bounded', () => {
  assert.equal(driveScale(0, 4), 1);
  assert.equal(driveScale(4, 4), 0);
  assert.equal(driveScale(8, 4), 0);
  assert.equal(camDist(0), TUNE.CAM_DIST_MIN);
  assert.ok(camHeight(TUNE.TOP_RADIUS) > 0);
});

test('outOfWorld detects depth and margins', () => {
  const bounds = { maxX: 11, maxZ: 11 };
  assert.equal(outOfWorld({ x: 0, y: 0.5, z: 0 }, bounds), false);
  assert.equal(outOfWorld({ x: 15, y: 0.5, z: 0 }, bounds), true);
  assert.equal(outOfWorld({ x: 0, y: TUNE.OOB_DEPTH - 0.1, z: 0 }, bounds), true);
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
});
