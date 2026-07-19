// Pure game math — no DOM, no three.js, no engine. Everything here is node-testable.
// Tuning lives in TUNE (never inline magic numbers); add your game's math + tests here.

export const TUNE = {
  BOUND: 12,            // half-extent of the play area (m) — mirror data/level.json bounds
  PLAYER_R: 0.24,       // ball radius (m) — mirror game_objects/player.json
  INTRO_SEG_SEC: 2.7,   // intro cutscene: seconds per narrator line / camera sweep

  ACCEL: 22,            // drive force as m/s² at rest (scaled down toward MAX_SPEED)
  MAX_SPEED: 4.2,       // terminal horizontal speed (m/s)
  DASH_DV: 4.2,         // dash burst Δv (Shift / E / stick double-tap-hold)
  DASH_COOLDOWN: 1.6,
  LIN_DAMPING: 1.1,
  ANG_DAMPING: 0.8,
  HOP_DV: 3.4,          // vertical Δv of a hop → apex ≈ DV²/2g ≈ 0.59 m
  HOP_COOLDOWN: 0.6,

  OOB_MARGIN: 8,        // this far past the play bounds = launched off the map
  OOB_DEPTH: -3,        // this far below ground = fell through geometry; respawn

  CAM_DIST_K: 4.5, CAM_DIST_MIN: 1.4, CAM_DIST_BASE: 1.3,
  CAM_HEIGHT_K: 2.2, CAM_HEIGHT_BASE: 0.7,
  CAM_LERP: 5,          // exponential follow rate
  CAM_YAW_RATE: 1.6,    // auto-settle rate behind movement
};

// drive force falloff: 1 at rest → 0 at max speed (terminal velocity = maxSpeed)
export const driveScale = (speed, maxSpeed) => Math.max(0, 1 - speed / maxSpeed);

// launched off the map or through the floor: absolute check, respawn cue
export const outOfWorld = (p, bounds) =>
  p.y < TUNE.OOB_DEPTH ||
  Math.abs(p.x) > (bounds?.maxX ?? TUNE.BOUND) + TUNE.OOB_MARGIN ||
  Math.abs(p.z) > (bounds?.maxZ ?? TUNE.BOUND) + TUNE.OOB_MARGIN;

export const camDist = r => Math.max(TUNE.CAM_DIST_MIN, TUNE.CAM_DIST_BASE + r * TUNE.CAM_DIST_K);
export const camHeight = r => TUNE.CAM_HEIGHT_BASE + r * TUNE.CAM_HEIGHT_K;

// Camera sits at player + (sin(yaw), _, cos(yaw))·dist. Forward (away from camera) and right:
export function moveVector(camYaw, x, z) {
  let mag = Math.hypot(x, z);
  if (mag < 1e-6) return { x: 0, z: 0 };
  const s = Math.min(mag, 1) / mag;
  x *= s; z *= s;
  const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw);   // forward
  const rx = Math.cos(camYaw), rz = -Math.sin(camYaw);    // right
  return { x: fx * z + rx * x, z: fz * z + rz * x };
}

// heading = the camYaw that would put the camera directly behind this velocity
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

// Intro cutscene timing: which line/segment t falls in, eased progress within it, done flag.
// One waypoint-to-waypoint sweep per line; the last segment holds its final waypoint.
export function introSegment(t, lineCount, segSec = TUNE.INTRO_SEG_SEC) {
  const seg = Math.min(Math.floor(t / segSec), lineCount - 1);
  const raw = Math.min((t - seg * segSec) / segSec, 1);
  const u = raw * raw * (3 - 2 * raw); // smoothstep ease
  return { seg, u, done: t >= segSec * lineCount };
}

// Studio identity: deterministic, fun-sounding studio name from any seed string (game title,
// author). Same seed → same name, so a given game always presents under one banner. Used by
// the intro's "presents" card when no real author name was captured at birth.
const STUDIO_ADJ = ['Pixel', 'Moonlit', 'Velvet', 'Crimson', 'Neon', 'Wandering', 'Salty',
  'Turbo', 'Cosmic', 'Gilded', 'Rusty', 'Electric', 'Midnight', 'Golden', 'Frosted',
  'Thunder', 'Wild', 'Silent', 'Lucky', 'Hyper'];
const STUDIO_NOUN = ['Otter', 'Badger', 'Comet', 'Anvil', 'Fox', 'Yak', 'Marlin', 'Raccoon',
  'Falcon', 'Walrus', 'Mammoth', 'Gecko', 'Heron', 'Bison', 'Lynx', 'Manta', 'Puffin',
  'Ferret', 'Narwhal', 'Koala'];
const STUDIO_SUFFIX = ['Studios', 'Games', 'Interactive', 'Collective', 'Works', 'Labs'];

const hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

export function studioName(seed = 'game') {
  const h = hashStr(String(seed) || 'game');
  return `${STUDIO_ADJ[h % STUDIO_ADJ.length]} ${STUDIO_NOUN[(h >>> 8) % STUDIO_NOUN.length]} ${STUDIO_SUFFIX[(h >>> 16) % STUDIO_SUFFIX.length]}`;
}

// The intro "presents" line. A real captured author becomes "A GAME BY …"; otherwise a
// generated studio "… PRESENTS". `author` of '', 'you', or 'your name' counts as absent.
export function presenterLine(author, seed) {
  const a = (author || '').trim();
  if (a && !/^(you|your name|author)$/i.test(a)) return `A GAME BY ${a.toUpperCase()}`;
  return `${studioName(seed).toUpperCase()} PRESENTS`;
}
