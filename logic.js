// Pure game math — no DOM, no three.js, no engine. Everything here is node-testable.
// Tuning lives in TUNE (never inline magic numbers); feel changes start here.

export const TUNE = {
  ARENA_RADIUS: 10.5,
  BOUND: 11,
  TOP_RADIUS: 0.5,
  PLAYER_R: 0.3, // physics ball radius — mirror game_objects/player.json

  ACCEL: 17,
  MAX_SPEED_MIN: 2.2,
  MAX_SPEED_MAX: 5.4,
  LIN_DAMPING: 0.72,
  ANG_DAMPING: 2.5,

  SPIN_START: 0.58,
  SPIN_DECAY: 0.017,
  SPIN_WOBBLE_DECAY: 0.018,
  PULSE_HZ_MIN: 0.9,
  PULSE_HZ_MAX: 3.25,
  PULSE_PERFECT_WINDOW: 0.065,
  PULSE_GOOD_WINDOW: 0.17,
  PULSE_COOLDOWN: 0.12,
  PULSE_PERFECT_GAIN: 0.13,
  PULSE_GOOD_GAIN: 0.055,

  WOBBLE_PASSIVE: 0.012,
  WOBBLE_LOW_SPIN: 0.05,
  WOBBLE_STEER: 0.026,
  WOBBLE_RECOVERY: 0.22,
  WOBBLE_IDLE_RECOVERY: 0.035,
  WOBBLE_CRASH: 1,

  OVERDRIVE_DURATION: 1.2,
  OVERDRIVE_COOLDOWN: 3.1,
  OVERDRIVE_DV: 1.9,
  OVERDRIVE_SPIN_GAIN: 0.08,
  OVERDRIVE_WOBBLE: 0.12,
  OVERDRIVE_SCORE: 1.65,

  FLOW_MIN: 1,
  FLOW_MAX: 10,
  FLOW_DECAY: 0.075,
  FLOW_CENTER_DECAY: 0.12,
  SCORE_BASE: 12,

  GATE_RADIUS: 0.82,
  GATE_SCORE: 360,
  GATE_SPIN_GAIN: 0.045,

  // three-game-engine v0.10 steps Rapier once per rendered frame. Keep physics on its
  // own 60 Hz clock so browser/display refresh rate cannot change game speed.
  PHYSICS_DT: 1 / 60,
  MAX_FRAME_DT: 0.1,
  MAX_PHYSICS_STEPS: 6,

  OOB_MARGIN: 3,
  OOB_DEPTH: -3,

  CAM_DIST_K: 4.3, CAM_DIST_MIN: 3.0, CAM_DIST_BASE: 1.55,
  CAM_HEIGHT_K: 2.7, CAM_HEIGHT_BASE: 0.75,
  CAM_LERP: 5.5,
  CAM_YAW_RATE: 1.45,
};

export const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
export const clamp01 = n => clamp(n, 0, 1);
export const wrap01 = n => ((n % 1) + 1) % 1;

export function spinnerSkinFromSearch(search = '') {
  const value = new URLSearchParams(search).get('spinner')?.toLowerCase();
  return ['gator', 'alligator', 'croc', 'crocodile'].includes(value) ? 'gator' : 'steel';
}

// drive force falloff: 1 at rest → 0 at max speed (terminal velocity = maxSpeed)
export const driveScale = (speed, maxSpeed) => Math.max(0, 1 - speed / maxSpeed);

export const pulseFrequency = energy =>
  TUNE.PULSE_HZ_MIN + clamp01(energy) * (TUNE.PULSE_HZ_MAX - TUNE.PULSE_HZ_MIN);

export function pulseDistance(phase) {
  const p = wrap01(phase);
  return Math.min(p, 1 - p);
}

export function gradePulse(phase) {
  const d = pulseDistance(phase);
  if (d <= TUNE.PULSE_PERFECT_WINDOW) return 'perfect';
  if (d <= TUNE.PULSE_GOOD_WINDOW) return 'good';
  return 'miss';
}

export function applyPulse({ energy, wobble, flow, chain }, grade, overdrive = false) {
  if (grade === 'perfect') {
    const nextChain = chain + 1;
    return {
      energy: clamp01(energy + TUNE.PULSE_PERFECT_GAIN * (overdrive ? 1.2 : 1)),
      wobble: clamp01(wobble - 0.13),
      flow: clamp(flow + 0.24 + Math.min(0.12, nextChain * 0.008), TUNE.FLOW_MIN, TUNE.FLOW_MAX),
      chain: nextChain,
      bonus: Math.round(180 * Math.pow(nextChain, 1.18) * (overdrive ? 1.5 : 1)),
    };
  }
  if (grade === 'good') {
    const nextChain = chain + 1;
    return {
      energy: clamp01(energy + TUNE.PULSE_GOOD_GAIN),
      wobble: clamp01(wobble - 0.045),
      flow: clamp(flow + 0.055, TUNE.FLOW_MIN, TUNE.FLOW_MAX),
      chain: nextChain,
      bonus: 45 * nextChain,
    };
  }
  return {
    energy: clamp01(energy - 0.045),
    wobble: clamp01(wobble + 0.16 + (overdrive ? 0.05 : 0)),
    flow: Math.max(TUNE.FLOW_MIN, flow * 0.72),
    chain: 0,
    bonus: 0,
  };
}

export function zoneForRadius(radius) {
  if (radius <= 3.4) return { name: 'CENTER', multiplier: 1, danger: 0 };
  if (radius <= 6.4) return { name: 'ORBIT', multiplier: 1.5, danger: 0.2 };
  if (radius <= 8.8) return { name: 'OUTER', multiplier: 2.5, danger: 0.55 };
  if (radius <= TUNE.ARENA_RADIUS) return { name: 'RIM', multiplier: 4, danger: 1 };
  return { name: 'VOID', multiplier: 0, danger: 1 };
}

export const maxSpeedForEnergy = energy =>
  TUNE.MAX_SPEED_MIN + clamp01(energy) * (TUNE.MAX_SPEED_MAX - TUNE.MAX_SPEED_MIN);

export function decaySpin(energy, wobble, dt, overdrive = false) {
  const rate = TUNE.SPIN_DECAY + clamp01(wobble) * TUNE.SPIN_WOBBLE_DECAY
    + (overdrive ? 0.022 : 0);
  return clamp01(energy - rate * Math.max(0, dt));
}

export function advanceWobble(wobble, { energy, steer = 0, recovering = false,
  overdrive = false }, dt) {
  const growth = TUNE.WOBBLE_PASSIVE
    + (1 - clamp01(energy)) * TUNE.WOBBLE_LOW_SPIN
    + clamp01(steer) * TUNE.WOBBLE_STEER
    + (overdrive ? 0.028 : 0);
  const recovery = recovering ? TUNE.WOBBLE_RECOVERY
    : (steer < 0.12 ? TUNE.WOBBLE_IDLE_RECOVERY : 0);
  return clamp01(wobble + (growth - recovery) * Math.max(0, dt));
}

export function advanceFlow(flow, dt, zoneMultiplier = 1) {
  const centerTax = zoneMultiplier <= 1 ? TUNE.FLOW_CENTER_DECAY : 0;
  return clamp(flow - (TUNE.FLOW_DECAY + centerTax) * Math.max(0, dt),
    TUNE.FLOW_MIN, TUNE.FLOW_MAX);
}

export function scoreRate(energy, flow, zoneMultiplier, overdrive = false) {
  const rpmRate = 0.45 + 4.55 * Math.pow(clamp01(energy), 1.45);
  return TUNE.SCORE_BASE * rpmRate
    * clamp(flow, TUNE.FLOW_MIN, TUNE.FLOW_MAX)
    * Math.max(0, zoneMultiplier)
    * (overdrive ? TUNE.OVERDRIVE_SCORE : 1);
}

// Sanitize the renderer's clock before it reaches physics, cooldowns, or animation.
export const clampFrameDelta = (dt, max = TUNE.MAX_FRAME_DT) =>
  Number.isFinite(dt) ? Math.min(max, Math.max(0, dt)) : 0;

// Consume a render-frame duration on a fixed simulation clock. Keeping this pure makes
// refresh-rate behavior testable without a browser or Rapier.
export function consumeFixedSteps(accumulator, frameDt, step = TUNE.PHYSICS_DT,
  maxFrameDt = TUNE.MAX_FRAME_DT, maxSteps = TUNE.MAX_PHYSICS_STEPS) {
  const dt = clampFrameDelta(frameDt, maxFrameDt);
  const total = Math.max(0, accumulator) + dt;
  const steps = Math.min(maxSteps, Math.floor((total + step * 1e-9) / step));
  let remainder = Math.max(0, total - steps * step);
  const nonNegativeFrameDt = Number.isFinite(frameDt) ? Math.max(0, frameDt) : 0;
  let dropped = nonNegativeFrameDt - dt;
  if (remainder >= step) {
    const kept = remainder % step;
    dropped += remainder - kept;
    remainder = kept;
  }
  return { dt, steps, remainder, dropped };
}

export const outOfWorld = (p, bounds) =>
  p.y < TUNE.OOB_DEPTH ||
  Math.abs(p.x) > (bounds?.maxX ?? TUNE.BOUND) + TUNE.OOB_MARGIN ||
  Math.abs(p.z) > (bounds?.maxZ ?? TUNE.BOUND) + TUNE.OOB_MARGIN;

export const camDist = r => Math.max(TUNE.CAM_DIST_MIN, TUNE.CAM_DIST_BASE + r * TUNE.CAM_DIST_K);
export const camHeight = r => TUNE.CAM_HEIGHT_BASE + r * TUNE.CAM_HEIGHT_K;

// Camera sits at player + (sin(yaw), _, cos(yaw))·dist. Forward and right:
export function moveVector(camYaw, x, z) {
  let mag = Math.hypot(x, z);
  if (mag < 1e-6) return { x: 0, z: 0 };
  const s = Math.min(mag, 1) / mag;
  x *= s; z *= s;
  const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw);
  const rx = Math.cos(camYaw), rz = -Math.sin(camYaw);
  return { x: fx * z + rx * x, z: fz * z + rz * x };
}

export const headingOf = (vx, vz) => Math.atan2(-vx, -vz);

export function angleLerp(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  let r = a + d * t;
  while (r > Math.PI) r -= 2 * Math.PI;
  while (r < -Math.PI) r += 2 * Math.PI;
  return r;
}
