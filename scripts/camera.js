import { THREE } from 'three-game-engine';
import { TUNE, camDist, camHeight, headingOf, angleLerp } from '../logic.js';
import { state } from './state.js';

// Third-person follow rig: drag the right half of the screen to orbit, auto-settle behind
// movement, exponential position lerp, decaying shake. state.camYaw is the yaw authority.
// Build ONCE per session and pass a getPlayer thunk — restarts swap the player out from
// under it (rebuilding the rig would stack pointer listeners and multiply drag speed).
export function buildCameraRig(camera, getPlayer, canvas) {
  let dragId = null, lastX = 0;
  let shakeMag = 0;
  const look = new THREE.Vector3();

  // drag right half of the screen to orbit (left half belongs to the joystick zone)
  canvas.addEventListener('pointerdown', e => {
    if (e.clientX < window.innerWidth * 0.45 || dragId !== null) return;
    dragId = e.pointerId; lastX = e.clientX;
  });
  window.addEventListener('pointermove', e => {
    if (e.pointerId !== dragId) return;
    state.camYaw -= (e.clientX - lastX) * 0.006;
    lastX = e.clientX;
  });
  const end = e => { if (e.pointerId === dragId) dragId = null; };
  window.addEventListener('pointerup', end);
  window.addEventListener('pointercancel', end);

  return {
    shake(mag) {
      if (!state.reducedMotion) shakeMag = Math.max(shakeMag, mag);
    },
    update(dt) {
      const player = getPlayer();
      if (!player?.isLoaded?.()) return;
      const p = player.getWorldPos();
      const v = player.velocity();
      const speed = Math.hypot(v.x, v.z);

      // auto-settle behind movement (only when moving and not dragging)
      if (dragId === null && speed > 0.6) {
        state.camYaw = angleLerp(state.camYaw, headingOf(v.x, v.z), Math.min(1, dt * TUNE.CAM_YAW_RATE));
      }

      // Portrait needs more breathing room because the same circular arena is framed by
      // a much narrower canvas. This changes only the lens rig, never movement/physics.
      const portrait = camera.aspect < 1;
      const d = camDist(player.size) * (portrait ? 1.62 : camera.aspect < 1.25 ? 1.22 : 1);
      const h = camHeight(player.size) * (portrait ? 1.38 : 1);
      const tx = p.x + Math.sin(state.camYaw) * d;
      const tz = p.z + Math.cos(state.camYaw) * d;
      const ty = p.y + h;
      const k = 1 - Math.exp(-dt * TUNE.CAM_LERP);
      camera.position.x += (tx - camera.position.x) * k;
      camera.position.y += (ty - camera.position.y) * k;
      camera.position.z += (tz - camera.position.z) * k;

      if (shakeMag > 0.001) {
        camera.position.x += (Math.random() - 0.5) * shakeMag;
        camera.position.y += (Math.random() - 0.5) * shakeMag;
        shakeMag *= Math.exp(-dt * 7);
      }

      look.set(p.x, p.y + player.size * 0.62, p.z);
      camera.lookAt(look);
    },
  };
}
