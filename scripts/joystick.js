import { state } from './state.js';

// Floating virtual stick: appears where the thumb lands in the bottom-left zone.
export function buildJoystick() {
  const zone = document.getElementById('stickZone');
  const stick = document.getElementById('stick');
  const nub = document.getElementById('stickNub');
  const R = 46;
  let id = null, cx = 0, cy = 0, lastDown = 0;
  const out = { x: 0, z: 0, sprint: false };

  zone.addEventListener('pointerdown', e => {
    if (id !== null) return;
    id = e.pointerId;
    out.sprint = e.timeStamp - lastDown < 320; // double-tap-and-hold = sprint
    lastDown = e.timeStamp;
    nub.style.background = out.sprint ? '#ffe66d' : '';
    // clamp the ring center on-screen, then position it in ZONE coordinates — the stick
    // is absolutely positioned inside #stickZone (which starts mid-screen), so viewport
    // clientY put the ring ~45vh below the thumb: THAT was the "cut off" joystick
    const M = R + 12;
    cx = Math.min(Math.max(e.clientX, M), document.documentElement.clientWidth - M);
    cy = Math.min(Math.max(e.clientY, M), document.documentElement.clientHeight - M);
    const zr = zone.getBoundingClientRect();
    stick.style.display = 'block';
    stick.style.left = `${cx - zr.left}px`;
    stick.style.top = `${cy - zr.top}px`;
    stick.style.bottom = 'auto';
    zone.setPointerCapture(id);
  });
  zone.addEventListener('pointermove', e => {
    if (e.pointerId !== id) return;
    let dx = e.clientX - cx, dy = e.clientY - cy;
    const d = Math.hypot(dx, dy) || 1, cl = Math.min(d, R);
    dx *= cl / d; dy *= cl / d;
    nub.style.transform = `translate(${dx}px,${dy}px)`;
    out.x = dx / R;
    out.z = -dy / R; // screen-up = forward
    if (cl > 6) state.everMoved = true;
  });
  const end = e => {
    if (e.pointerId !== id) return;
    id = null; out.x = out.z = 0; out.sprint = false;
    nub.style.transform = 'translate(0,0)';
    stick.style.display = 'none';
  };
  zone.addEventListener('pointerup', end);
  zone.addEventListener('pointercancel', end);

  return { sample: () => ({ x: out.x, z: out.z, sprint: out.sprint }) };
}
