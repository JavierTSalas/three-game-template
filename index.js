import { Game } from 'three-game-engine';
import Terrain from './scripts/terrain.js';
import Player from './scripts/player.js';
import Platform from './scripts/platform.js';
import Director, { waitForPlayer } from './scripts/director.js';
import { buildJoystick } from './scripts/joystick.js';
import { buildCameraRig } from './scripts/camera.js';
import { buildAudio } from './scripts/audio.js';
import { buildParticles } from './scripts/juice.js';
import { buildPause } from './scripts/pause.js';
import { buildFixedPhysics } from './scripts/physics.js';
import { bindFsButton } from './scripts/fullscreen.js';
import { playSplash } from './scripts/splash.js';
import { events } from './scripts/events.js';
import { state } from './scripts/state.js';
import { outOfWorld, spinnerSkinFromSearch } from './logic.js';

const splash = playSplash();
navigator.serviceWorker?.register('sw.js').catch(() => {});

const el = id => document.getElementById(id);
const canvas = el('gameCanvas');
const baseURL = new URL('.', window.location.href).href;
const spinnerSkin = spinnerSkinFromSearch(location.search);
document.body.dataset.spinner = spinnerSkin;

// Cosmetics are URL-addressable and share one progression save. The menu link only
// changes ?spinner=; gameplay state, physics and score are deliberately untouched.
const skinLink = el('skinLink');
const nextSkinUrl = new URL(location.href);
if (spinnerSkin === 'gator') nextSkinUrl.searchParams.delete('spinner');
else nextSkinUrl.searchParams.set('spinner', 'gator');
skinLink.href = nextSkinUrl.pathname + nextSkinUrl.search + nextSkinUrl.hash;
skinLink.textContent = spinnerSkin === 'gator'
  ? '◈ SPINNING: SLEEPY GATOR · SWITCH TO STEEL'
  : '◈ TRY THE SLEEPY GATOR SPINNER';

export const game = new Game(baseURL, {
  rendererOptions: {
    canvas,
    width: canvas.clientWidth || 1,
    height: canvas.clientHeight || 1,
    pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
    cameraOptions: { fov: 56, near: 0.05, far: 160 },
  },
  inputOptions: { wsadMovement: true },
});

game.registerGameObjectClasses({ terrain: Terrain, player: Player, platform: Platform });
const joystick = buildJoystick();

// The familiar template element ids remain so automated input matrices can drive the
// production controls, but the actions are now PULSE and OVERDRIVE.
el('hopBtn').addEventListener('pointerdown', e => {
  e.preventDefault();
  state.pulseRequested = true;
});
el('dashBtn').addEventListener('pointerdown', e => {
  e.preventDefault();
  state.overdriveRequested = true;
});
window.addEventListener('keydown', e => {
  if (e.repeat) return;
  if (e.code === 'Space') {
    e.preventDefault();
    state.pulseRequested = true;
  }
  if (e.code === 'KeyE') state.overdriveRequested = true;
});

function fitCanvas() {
  if (canvas.style.width) {
    canvas.style.removeProperty('width');
    canvas.style.removeProperty('height');
  }
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h || !game.renderer) return;
  const r = game.renderer;
  if (r.options.width === w && r.options.height === h) return;
  r.options.width = w;
  r.options.height = h;
  r.threeJSRenderer.setSize(w, h, false);
  r.threeJSCamera.aspect = w / h;
  r.threeJSCamera.updateProjectionMatrix();
}

document.addEventListener('gesturestart', e => e.preventDefault(), { passive: false });
document.addEventListener('dblclick', e => e.preventDefault());

const formatScore = n => Math.floor(Number(n) || 0).toLocaleString('en-US');

function updateHud() {
  el('scoreValue').textContent = formatScore(state.score);
  el('scoreRate').textContent = `+${formatScore(state.scoreRate)} / SEC`;
  el('flowValue').textContent = `FLOW ×${state.flow.toFixed(1)}`;
  el('zoneValue').textContent = `${state.zone} · ×${state.zoneMultiplier}`;
  el('energyFill').style.width = `${Math.max(0, Math.min(100, state.spinEnergy * 100))}%`;
  el('wobbleFill').style.width = `${Math.max(0, Math.min(100, state.wobble * 100))}%`;
  el('patternValue').textContent = `PATTERN · ${state.pattern}`;
  const hue = state.zone === 'RIM' ? '#ff4f9a' : state.zone === 'OUTER' ? '#a987ff'
    : state.zone === 'ORBIT' ? '#55ffc0' : '#57efff';
  el('zoneValue').style.color = hue;
  if (state.phase === 'playing') el('hint').style.opacity = state.elapsed > 6 ? '0' : '1';
}

function flashGrade(grade, chain = 0, bonus = 0) {
  const node = el('gradeFlash');
  const label = grade === 'perfect' ? `PERFECT ×${chain}` : grade === 'good'
    ? `GOOD ×${chain}` : 'OFF BEAT';
  node.textContent = bonus ? `${label}  +${formatScore(bonus)}` : label;
  node.style.color = grade === 'perfect' ? '#ffd166' : grade === 'good' ? '#57efff' : '#ff5c85';
  node.classList.remove('show');
  void node.offsetWidth;
  node.classList.add('show');
}

function showResult(summary) {
  el('resultReason').textContent = summary.reason;
  el('resultScore').textContent = formatScore(summary.score);
  el('resultBest').textContent = `BEST ${formatScore(summary.bestScore)} · TOTAL ${formatScore(summary.totalSpin)}`;
  el('statPerfect').textContent = summary.perfects;
  el('statChain').textContent = summary.bestChain;
  el('statGates').textContent = summary.gates;
  el('statSaves').textContent = summary.saves;
  el('newBest').style.display = summary.isBest ? 'block' : 'none';
  el('resultScreen').style.display = 'flex';
}

async function boot() {
  const level = await fetch('data/level.json').then(r => r.json());
  const director = new Director(game, level);
  const audio = buildAudio();
  let rig = null;
  let playerRef = null;
  const particles = { current: null };

  const wire = player => {
    playerRef = player;
    player.joystick = joystick;
    player.cameraRig = rig;
    particles.current = buildParticles(game.scene.threeJSScene);
  };
  director.onRewire = wire;

  // Event → juice wiring is registered exactly once. Holder refs follow new scenes.
  events.on('pulse', ({ grade, chain, bonus }) => {
    const p = playerRef?.getWorldPos();
    const color = grade === 'perfect' ? '#ffd166' : grade === 'good' ? '#57efff' : '#ff4f75';
    if (p) particles.current?.pop({ x: p.x, y: p.y + 0.18, z: p.z }, color,
      grade === 'perfect' ? 28 : 14);
    if (grade === 'perfect') rig?.shake(0.09);
    else if (grade === 'miss') rig?.shake(0.13);
    flashGrade(grade, chain, bonus);
  });
  events.on('overdrive', () => {
    const p = playerRef?.getWorldPos();
    if (p) particles.current?.pop({ x: p.x, y: p.y + 0.1, z: p.z }, '#ff4f9a', 34);
    rig?.shake(0.17);
    el('gradeFlash').textContent = 'OVERDRIVE';
    el('gradeFlash').style.color = '#ff76b1';
    el('gradeFlash').classList.remove('show');
    void el('gradeFlash').offsetWidth;
    el('gradeFlash').classList.add('show');
  });
  events.on('gate', ({ position, bonus }) => {
    particles.current?.pop({ x: position.x, y: position.y + 0.2, z: position.z }, '#62ffc3', 38);
    flashGrade('good', state.chain, bonus);
  });
  events.on('save', ({ count }) => {
    const p = playerRef?.getWorldPos();
    if (p) particles.current?.pop({ x: p.x, y: p.y, z: p.z }, '#ffffff', 44);
    const node = el('gradeFlash');
    node.textContent = `CLUTCH SAVE ×${count}`;
    node.style.color = '#ffffff';
    node.classList.remove('show');
    void node.offsetWidth;
    node.classList.add('show');
  });
  events.on('bump', ({ impact }) => rig?.shake(Math.min(0.28, impact * 0.055)));
  events.on('spinstart', () => { el('hint').textContent = 'PULSE AS THE GOLD DOT CROSSES THE CYAN STRIKE'; });
  events.on('lose', summary => {
    rig?.shake(0.32);
    setTimeout(() => { if (state.phase === 'lost') showResult(summary); },
      state.reducedMotion ? 80 : 650);
  });
  events.on('resultclose', () => { el('resultScreen').style.display = 'none'; });
  events.on('runstart', ({ bestScore, totalSpin }) => {
    el('menuBest').textContent = formatScore(bestScore);
    el('menuTotal').textContent = formatScore(totalSpin);
    el('hint').style.opacity = '1';
    el('hint').textContent = 'STEER TO START · TAP PULSE WHEN THE MARKERS MEET';
  });

  await game.loadScene('main');
  await game.play();
  rig = buildCameraRig(game.renderer.getCamera(), () => playerRef, canvas);
  const physics = buildFixedPhysics(game);

  let menuYaw = 0.58;
  fitCanvas();
  game.renderer.options.beforeRender = frame => {
    frame.deltaTimeInSec = physics.beginFrame(frame.deltaTimeInSec);
    const { deltaTimeInSec } = frame;
    fitCanvas();
    if (state.phase === 'menu') {
      const cam = game.renderer.getCamera();
      menuYaw += deltaTimeInSec * (state.reducedMotion ? 0.025 : 0.08);
      const portrait = cam.aspect < 1;
      const distance = portrait ? 7.4 : 5.8;
      cam.position.set(Math.sin(menuYaw) * distance, portrait ? 4.8 : 2.8,
        Math.cos(menuYaw) * distance);
      cam.lookAt(0, portrait ? -0.7 : 0.25, 0);
    }
    if (!state.paused) {
      director.tick(deltaTimeInSec);
      if ((state.phase === 'playing' || state.phase === 'ready') && playerRef?.isLoaded?.()
        && outOfWorld(playerRef.getWorldPos(), level.bounds)) {
        if (state.phase === 'playing') {
          director.lost('VOID OUT');
        } else {
          const b = playerRef.getRapierRigidBody();
          b.setTranslation(level.spawn, true);
          b.setLinvel({ x: 0, y: 0, z: 0 }, true);
          b.setAngvel({ x: 0, y: 0, z: 0 }, true);
        }
      }
    }
    if (playerRef?.isLoaded?.()) {
      const v = playerRef.velocity();
      audio.update(state, state.paused ? 0 : Math.hypot(v.x, v.z));
    }
    particles.current?.update(deltaTimeInSec);
    updateHud();
  };

  buildPause(game, director, audio);
  bindFsButton(el('menuFsBtn'));

  el('refreshBtn').addEventListener('click', async e => {
    e.target.textContent = '↻ REFRESHING…';
    try {
      const keys = await caches?.keys() ?? [];
      await Promise.all(keys.map(k => caches.delete(k)));
      const regs = await navigator.serviceWorker?.getRegistrations() ?? [];
      await Promise.all(regs.map(r => r.unregister()));
    } catch { /* cache APIs can be unavailable in private mode */ }
    location.href = location.pathname + '?u=' + Date.now();
  });

  const creditsPanel = el('creditsPanel');
  el('creditsBtn').addEventListener('click', () => creditsPanel.classList.add('open'));
  el('creditsClose').addEventListener('click', () => creditsPanel.classList.remove('open'));

  const player = await waitForPlayer(game);
  wire(player);
  director.startRun();
  state.phase = 'menu';

  const startScreen = el('startScreen');
  el('playBtn').addEventListener('click', () => {
    audio.ensure();
    startScreen.style.display = 'none';
    el('controls').style.display = 'block';
    state.phase = 'ready';
  });
  el('spinAgainBtn').addEventListener('click', async () => {
    audio.ensure();
    await director.restart();
  });

  await splash.done;
  splash.lift();
  window.__director = director;
  window.__physics = physics;
}

boot().catch(err => {
  console.error('BOOT FAILED', err);
  el('menuRail').innerHTML = `<h1>BOOT FAULT</h1><p class="tagline">${err.message}</p>`;
});

window.game = game;
window.__state = state;
