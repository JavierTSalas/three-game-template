// Instant-boot splash: a 2D ball-guy rolls left→right picking up the letters of the
// byline. Pure DOM/canvas — plays while the engine loads behind it. Starts at module top
// of index.js BEFORE any engine work, so first paint is instant.
const TEXT = 'a game by __AUTHOR__', DUR = 3.6, CAP = 6, LIFT_CAP = 15;
const BALL = '#22c4a8', INK = '#101623', PAPER = '#eef4ff';

// warm = same-tab navigation (restart deep link) — skip the letter show,
// the splash is just a cover until the world is ready
const warm = sessionStorage.getItem('__GAME_ID__:warm') === '1';
window.addEventListener('pagehide', () => sessionStorage.setItem('__GAME_ID__:warm', '1'));

export function playSplash() {
  const wrap = document.getElementById('splash');
  const cv = document.getElementById('splashCanvas');
  const ctx = cv.getContext('2d');
  let resolve, finished = false, lifted = false;
  const done = new Promise(r => { resolve = r; });
  // done = the animation is over; lift() = the world behind is ready, drop the cover.
  // Split so the fade never reveals a half-spawned world.
  const finish = () => {
    if (finished) return;
    finished = true;
    window.removeEventListener('resize', measure);
    resolve();
  };
  const lift = () => {
    if (lifted) return;
    lifted = true;
    finish();
    wrap.style.transition = 'opacity 0.35s';
    wrap.style.opacity = '0';
    setTimeout(() => wrap.remove(), 400);
  };
  wrap.addEventListener('pointerdown', finish);
  setTimeout(finish, CAP * 1000);
  setTimeout(lift, LIFT_CAP * 1000); // failsafe: never trap the player behind the cover

  // size ONCE + cache glyph metrics — assigning canvas.width per frame reallocates the
  // whole surface and resets context state, which reads as lag while the engine loads
  let W = 0, H = 0, R = 0, widths = [], total = 0, font = '';
  const measure = () => {
    W = cv.width = wrap.clientWidth;
    H = cv.height = wrap.clientHeight;
    R = Math.min(W, H) * 0.09;
    font = `${R * 0.72}px Lucky, "Trebuchet MS", sans-serif`;
    ctx.font = font;
    widths = [...TEXT].map(c => ctx.measureText(c).width);
    total = widths.reduce((a, b) => a + b, 0);
  };
  measure();
  window.addEventListener('resize', measure);
  if (warm) { finish(); return { done, lift }; } // cover only, no letter show
  document.fonts?.load(font).then(measure).catch(() => {}); // re-measure once the font lands

  const t0 = performance.now();
  function frame() {
    if (finished) return;
    const t = (performance.now() - t0) / 1000, u = Math.min(1, t / DUR);
    ctx.font = font;
    const startX = (W - total) / 2, y = H * 0.55;
    const bx = -R * 2 + (W + R * 4) * u; // ball center sweeps the screen
    const roll = bx / R;                 // rolled angle (rad)
    ctx.clearRect(0, 0, W, H);
    // letters: laid out as a sentence; picked up once the ball passes them
    let x = startX;
    for (let i = 0; i < TEXT.length; i++) {
      const cx = x + widths[i] / 2;
      ctx.fillStyle = PAPER;
      if (cx > bx) ctx.fillText(TEXT[i], x, y); // still on the "ground"
      else {                                    // stuck to the ball, riding the roll
        const a = roll - cx / R;                // angle since pickup
        ctx.save();
        ctx.translate(bx + Math.cos(a) * R * 0.82, y - R + Math.sin(a) * R * 0.82);
        ctx.rotate(a + Math.PI / 2);
        ctx.fillText(TEXT[i], -widths[i] / 2, 0);
        ctx.restore();
      }
      x += widths[i];
    }
    // the guy: squashed ball + big eyes
    ctx.save();
    ctx.translate(bx, y - R);
    ctx.fillStyle = BALL;
    ctx.beginPath(); ctx.ellipse(0, 0, R * 1.04, R * 0.96, 0, 0, Math.PI * 2); ctx.fill();
    ctx.rotate(roll);
    for (const s of [-0.36, 0.36]) {
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s * R, -R * 0.2, R * 0.24, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(s * R, -R * 0.2, R * 0.11, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = INK; ctx.lineWidth = R * 0.07;
    ctx.beginPath(); ctx.arc(0, R * 0.12, R * 0.34, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
    ctx.restore();
    if (u >= 1 && t > DUR + 0.5) return finish();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return { done, lift };
}
