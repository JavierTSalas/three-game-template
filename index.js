import { Game } from 'three-game-engine';
import Terrain from './scripts/terrain.js';
import Player from './scripts/player.js';
import Platform from './scripts/platform.js';
import Director, { waitForPlayer } from './scripts/director.js';
import { buildJoystick } from './scripts/joystick.js';
import { buildCameraRig } from './scripts/camera.js';
import { buildAudio } from './scripts/audio.js';
import { buildParticles, toonify } from './scripts/juice.js';
import { buildPause } from './scripts/pause.js';
import { bindFsButton } from './scripts/fullscreen.js';
import { playSplash } from './scripts/splash.js';
import { playIntro } from './scripts/cutscene.js';
import { buildHints } from './scripts/hints.js';
import { events } from './scripts/events.js';
import { state } from './scripts/state.js';
import { outOfWorld, presenterLine } from './logic.js';

const splash = playSplash(); // first paint before ANY engine work — instant boot feel
navigator.serviceWorker?.register('sw.js').catch(() => {}); // PWA install (no-op worker)

const canvas = document.getElementById('gameCanvas');

const baseURL = new URL('.', window.location.href).href;

export const game = new Game(baseURL, {
  rendererOptions: {
    canvas,
    width: canvas.clientWidth || 1,   // CSS (fixed inset:0) is the size authority;
    height: canvas.clientHeight || 1, // fitCanvas() keeps the buffer matched to it
    pixelRatio: Math.min(window.devicePixelRatio || 1, 2), // capped for mobile GPUs
    cameraOptions: { fov: 60, near: 0.05, far: 200 },
  },
  inputOptions: { wsadMovement: true }, // REQUIRED: engine bug — W/A dead without it
});

game.registerGameObjectClasses({ terrain: Terrain, player: Player, platform: Platform });

const joystick = buildJoystick();

// action buttons + keyboard (Space = hop, E = dash; player.js also reads Shift/E directly)
document.getElementById('hopBtn').addEventListener('pointerdown', e => { e.preventDefault(); state.hopRequested = true; });
document.getElementById('dashBtn').addEventListener('pointerdown', e => { e.preventDefault(); state.dashRequested = true; });
window.addEventListener('keydown', e => { if (e.code === 'Space') state.hopRequested = true; });

// Fullscreen truth — ONE ruler. CSS owns display size (html/body/canvas are all
// position:fixed inset:0 — the page physically cannot scroll or mis-measure), and JS
// only matches the drawing buffer to what CSS produced. Never size from innerWidth/
// visualViewport: those disagree with layout by a scrollbar/URL-bar's worth, and the
// engine's setSize stamps inline px styles that fight the CSS. Checked every frame in
// beforeRender — resize events race fullscreen/rotation on mobile. docs/full-screen-pwa.md
function fitCanvas() {
  if (canvas.style.width) { // inline px (engine boot / any setSize) pins clientWidth — strip FIRST
    canvas.style.removeProperty('width');
    canvas.style.removeProperty('height');
  }
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return;
  const r = game.renderer;
  if (r.options.width === w && r.options.height === h) return;
  r.options.width = w; r.options.height = h;
  r.threeJSRenderer.setSize(w, h, false); // false: leave display size to CSS
  r.threeJSCamera.aspect = w / h;
  r.threeJSCamera.updateProjectionMatrix();
}

// pinch/double-tap zoom: viewport meta covers most, these cover iOS Safari + menus
document.addEventListener('gesturestart', e => e.preventDefault(), { passive: false });
document.addEventListener('dblclick', e => e.preventDefault());

async function boot() {
  const level = await fetch('data/level.json').then(r => r.json());

  const director = new Director(game, level);
  const audio = buildAudio();
  const hints = buildHints();               // first-run tutorial (no-op once onboarded)
  const intro = { current: null };          // cutscene handle for the render hook

  // holders so once-registered listeners always hit the current run's objects
  // (restart must never stack duplicate listeners — same rule for the camera rig)
  let rig = null;
  const particles = { current: null };
  let playerRef = null;

  const wire = player => {
    playerRef = player;
    player.joystick = joystick;
    player.cameraRig = rig; // rig is built once (below) against the playerRef getter
    particles.current = buildParticles(game.scene.threeJSScene); // fresh scene each run
  };
  director.onRewire = wire;

  // register ONCE (not inside wire) — juice wiring by example
  events.on('dash', () => {
    const p = playerRef?.getWorldPos();
    if (p) particles.current?.pop({ x: p.x, y: p.y, z: p.z }, '#22c4a8', 10);
  });
  events.on('bump', ({ impact }) => {
    rig?.shake(Math.min(0.3, impact * 0.05));
  });
  events.on('runstart', () => toonify(game.scene.threeJSScene)); // cartoon pass over the fresh world

  await game.loadScene('main'); // load the scene…
  await game.play();            // …then play() skips initialScene since one is loaded
  rig = buildCameraRig(game.renderer.getCamera(), () => playerRef, canvas); // once, ever

  // global per-frame hook (renderer exists only after play() → async _init)
  let menuYaw = 0.6; // hero menu: slow orbit over the live world
  fitCanvas(); // engine boot stamped inline px sizes — reclaim CSS authority immediately
  game.renderer.options.beforeRender = ({ deltaTimeInSec }) => {
    fitCanvas(); // per-frame: resize events race fullscreen/rotation on mobile
    if (state.phase === 'menu') {
      const cam = game.renderer.getCamera();
      const B = (level.bounds?.maxX ?? 12) * 0.55;
      menuYaw += deltaTimeInSec * 0.07;
      cam.position.set(Math.sin(menuYaw) * B, B * 0.5, Math.cos(menuYaw) * B);
      cam.lookAt(0, 0, 0);
    }
    intro.current?.update(deltaTimeInSec); // cutscene owns the camera during phase 'intro'
    if (!state.paused) {
      director.tick(deltaTimeInSec);
      hints.update(deltaTimeInSec);
      // launched off the map / through the floor: put the guy back at spawn
      if ((state.phase === 'playing' || state.phase === 'ready') && playerRef?.isLoaded?.()
          && outOfWorld(playerRef.getWorldPos(), level.bounds)) {
        const b = playerRef.getRapierRigidBody();
        b.setTranslation(level.spawn, true);
        b.setLinvel({ x: 0, y: 0, z: 0 }, true);
        b.setAngvel({ x: 0, y: 0, z: 0 }, true);
      }
    }
    if (playerRef?.isLoaded?.()) {
      const v = playerRef.velocity();
      audio.update(state.paused ? 0 : Math.hypot(v.x, v.z));
    }
    particles.current?.update(deltaTimeInSec);
  };

  buildPause(game, director, audio);
  bindFsButton(document.getElementById('menuFsBtn'));
  // installed-PWA escape hatch: nukes every cache layer and pulls a fresh build —
  // no uninstall/reinstall. (Browsers offer no auto path for this; the button is the UX.)
  document.getElementById('refreshBtn').addEventListener('click', async e => {
    e.target.textContent = '↻ REFRESHING…';
    try {
      const keys = await caches?.keys() ?? [];
      await Promise.all(keys.map(k => caches.delete(k)));
      const regs = await navigator.serviceWorker?.getRegistrations() ?? [];
      await Promise.all(regs.map(r => r.unregister())); // boot re-registers it
    } catch { /* nothing cached — fall through to the hard reload */ }
    location.href = location.pathname + '?u=' + Date.now(); // nonce busts the HTML cache
  });

  // credits panel
  const creditsPanel = document.getElementById('creditsPanel');
  document.getElementById('creditsBtn').addEventListener('click', () => creditsPanel.classList.add('open'));
  document.getElementById('creditsClose').addEventListener('click', () => creditsPanel.classList.remove('open'));

  // spawn the world NOW (behind the splash), then reveal the menu over it
  director.startRun();
  wire(await waitForPlayer(game));
  state.phase = 'menu'; // world poses under the orbiting menu camera
  const startScreen = document.getElementById('startScreen');
  document.getElementById('playBtn').addEventListener('click', () => {
    audio.ensure(); // AudioContext needs a user gesture
    startScreen.style.display = 'none';
    const begin = () => {
      intro.current = null;
      document.getElementById('controls').style.display = 'block';
      hints.start();
      state.phase = 'ready'; // first input flips 'playing' (director.tick)
    };
    // REQUIRED: every game opens with a cutscene that explains the premise (CLAUDE.md).
    // Skippable; restarts don't replay it (they re-enter via director.restart, not here).
    if (level.intro?.length && !intro.played) {
      intro.played = true;
      // presenter: baked author (level.studio, set at birth) → "A GAME BY …";
      // otherwise a studio name generated from the title. Unique, stable per game.
      const presenter = presenterLine(level.studio, level.title || document.title);
      // next-tick so the Play tap doesn't reach the cutscene's skip listener
      setTimeout(() => { intro.current = playIntro({ game, level, player: playerRef, lines: level.intro, presenter, onDone: begin }); }, 0);
    } else begin();
  });
  await splash.done;
  splash.lift(); // world is spawned + menu is up — NOW drop the cover
  window.__director = director; // driver-script introspection (Playwright)
}
boot().catch(err => {
  console.error('BOOT FAILED', err);
  document.getElementById('menuRail').innerHTML = `<h1>ouch</h1><p style="font-size:14px;">${err.message}</p>`;
});
window.game = game;       // debug handle
window.__state = state;   // driver-script introspection (Playwright)
