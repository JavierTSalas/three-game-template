// Instant 2D cover that starts before the engine. It mirrors the hero top with a compact
// machined-steel animation, giving the first paint its own authored moment.
const DUR = 2.35, CAP = 5, LIFT_CAP = 15;
const warm = sessionStorage.getItem('spinfinity:warm') === '1';
window.addEventListener('pagehide', () => sessionStorage.setItem('spinfinity:warm', '1'));

export function playSplash() {
  const wrap = document.getElementById('splash');
  const cv = document.getElementById('splashCanvas');
  const ctx = cv.getContext('2d');
  let resolve;
  let finished = false;
  let lifted = false;
  const done = new Promise(r => { resolve = r; });

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
    wrap.style.transition = 'opacity .4s ease';
    wrap.style.opacity = '0';
    setTimeout(() => wrap.remove(), 430);
  };
  wrap.addEventListener('pointerdown', finish);
  setTimeout(finish, CAP * 1000);
  setTimeout(lift, LIFT_CAP * 1000);

  let W = 1, H = 1, S = 1;
  function measure() {
    const dpr = Math.min(2, devicePixelRatio || 1);
    W = wrap.clientWidth;
    H = wrap.clientHeight;
    cv.width = Math.max(1, Math.round(W * dpr));
    cv.height = Math.max(1, Math.round(H * dpr));
    cv.style.width = `${W}px`;
    cv.style.height = `${H}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    S = Math.min(W, H);
  }
  measure();
  window.addEventListener('resize', measure);
  if (warm) {
    finish();
    return { done, lift };
  }

  const start = performance.now();
  function frame(now) {
    if (finished) return;
    const t = (now - start) / 1000;
    const u = Math.min(1, t / DUR);
    ctx.clearRect(0, 0, W, H);

    const bg = ctx.createRadialGradient(W * 0.5, H * 0.47, 0, W * 0.5, H * 0.47, S * 0.7);
    bg.addColorStop(0, '#0c2435');
    bg.addColorStop(0.48, '#040a15');
    bg.addColorStop(1, '#02050d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const cx = W * 0.5;
    const cy = H * 0.43;
    const r = S * 0.115;
    const lean = Math.sin(t * 8) * r * 0.06 * (1 - u);
    ctx.save();
    ctx.translate(cx + lean, cy);
    ctx.rotate(Math.sin(t * 7) * 0.035 * (1 - u));

    ctx.shadowColor = '#43eaff';
    ctx.shadowBlur = 22;
    const metal = ctx.createLinearGradient(-r, 0, r, 0);
    metal.addColorStop(0, '#384a53');
    metal.addColorStop(0.2, '#f2f6f7');
    metal.addColorStop(0.42, '#677781');
    metal.addColorStop(0.62, '#ffffff');
    metal.addColorStop(0.82, '#768891');
    metal.addColorStop(1, '#23323b');
    ctx.fillStyle = metal;
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.45);
    ctx.bezierCurveTo(r * .3, -r * 1.24, r * .18, -r * .42, r * .78, -r * .04);
    ctx.bezierCurveTo(r * 1.05, r * .08, r * 1.03, r * .3, r * .66, r * .33);
    ctx.bezierCurveTo(r * .26, r * .42, r * .11, r * 1.05, 0, r * 1.34);
    ctx.bezierCurveTo(-r * .11, r * 1.05, -r * .26, r * .42, -r * .66, r * .33);
    ctx.bezierCurveTo(-r * 1.03, r * .3, -r * 1.05, r * .08, -r * .78, -r * .04);
    ctx.bezierCurveTo(-r * .18, -r * .42, -r * .3, -r * 1.24, 0, -r * 1.45);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#dffbff';
    ctx.lineWidth = Math.max(1, r * .035);
    ctx.globalAlpha = .62;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.ellipse(0, r * (.13 + i * .065), r * (.89 - Math.abs(i) * .04), r * .12, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.translate(cx, cy + r * .16);
    ctx.rotate(t * 5);
    ctx.strokeStyle = '#57efff';
    ctx.globalAlpha = .24 + .25 * Math.sin(t * 6) ** 2;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.42, r * .33, 0, 0, Math.PI * 1.5);
    ctx.stroke();
    ctx.restore();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#effbff';
    ctx.font = `${Math.max(28, S * .11)}px Lucky, "Trebuchet MS", sans-serif`;
    ctx.letterSpacing = '2px';
    ctx.fillText('SPINFINITY', cx, H * .79);
    ctx.fillStyle = '#72b6cb';
    ctx.font = `700 ${Math.max(8, S * .023)}px Baloo, sans-serif`;
    ctx.fillText('CALIBRATING GYRO · ' + Math.round(u * 100) + '%', cx, H * .86);

    const barW = Math.min(240, W * .42);
    ctx.fillStyle = '#153244';
    ctx.fillRect(cx - barW / 2, H * .9, barW, 2);
    ctx.fillStyle = '#67efff';
    ctx.shadowColor = '#4eefff';
    ctx.shadowBlur = 8;
    ctx.fillRect(cx - barW / 2, H * .9, barW * u, 2);
    ctx.shadowBlur = 0;

    if (u >= 1 && t > DUR + .12) return finish();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return { done, lift };
}
