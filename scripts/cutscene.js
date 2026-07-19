import { THREE } from 'three-game-engine';
import { camDist, camHeight, introSegment } from '../logic.js';
import { state } from './state.js';

// Intro cutscene (ported from slimeball-odyssey): the camera sweeps the level on fixed
// waypoints while #introCard shows one story line per segment. Tap/click/any-key skips.
// Waypoints scale with the play bounds, so it survives level edits; the last waypoint
// lands exactly where the follow rig wants the camera, so play starts without a cut.
// Lines come from data/level.json "intro" — REPLACE them with your game's premise
// (requirement: the player must be told what they're doing and why).
export function playIntro({ game, level, player, lines, presenter, onDone }) {
  const cam = game.renderer.getCamera();
  const card = document.getElementById('introCard');
  const presents = document.getElementById('introPresents');
  const B = (level.bounds?.maxX ?? 12) + 4;
  const sp = player.getWorldPos();
  const spawn = new THREE.Vector3(sp.x, sp.y, sp.z); // getWorldPos returns a REUSED vector

  const rigEnd = new THREE.Vector3(
    spawn.x + Math.sin(state.camYaw) * camDist(player.size),
    spawn.y + camHeight(player.size),
    spawn.z + Math.cos(state.camYaw) * camDist(player.size));
  const P = [
    { pos: new THREE.Vector3(0, B * 1.15, B * 1.5), look: new THREE.Vector3(0, 0, 0) },
    { pos: new THREE.Vector3(-B * 0.9, B * 0.5, B * 0.6), look: new THREE.Vector3(B * 0.4, 0, -B * 0.4) },
    { pos: new THREE.Vector3(B * 0.5, B * 0.28, -B * 0.55), look: spawn },
    { pos: rigEnd, look: spawn },
  ];

  state.phase = 'intro';
  card.style.display = 'block';
  // "presents" studio/author card — the game's unique signature (see logic.presenterLine).
  // Fades in over the opening sweep, out before the last line so it never covers story text.
  if (presenter) { presents.textContent = presenter; requestAnimationFrame(() => { presents.style.opacity = '1'; }); }
  let t = 0, seg = -1, alive = true;

  function finish() {
    if (!alive) return;
    alive = false;
    presents.style.opacity = '0';
    card.style.display = 'none';
    window.removeEventListener('pointerdown', finish);
    window.removeEventListener('keydown', finish);
    cam.position.copy(rigEnd);
    onDone();
  }
  window.addEventListener('pointerdown', finish);
  window.addEventListener('keydown', finish);

  const from = new THREE.Vector3(), to = new THREE.Vector3(), look = new THREE.Vector3();
  return {
    update(dt) {
      if (!alive) return;
      t += dt;
      const s = introSegment(t, lines.length);
      if (s.done) return finish();
      if (s.seg !== seg) {
        seg = s.seg;
        card.querySelector('p').textContent = lines[seg];
        if (seg >= 1) presents.style.opacity = '0'; // clear the banner once the story starts
      }
      const a = P[Math.min(seg, P.length - 1)], b = P[Math.min(seg + 1, P.length - 1)];
      cam.position.copy(from.copy(a.pos).lerp(to.copy(b.pos), s.u));
      cam.lookAt(look.copy(a.look).lerp(b.look, s.u));
    },
    isDone: () => !alive,
  };
}
