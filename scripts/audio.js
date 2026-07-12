import { events } from './events.js';
import { state } from './state.js';

// Procedural WebAudio — no sound files. ensure() must run inside a user gesture
// (browsers gate AudioContext); call it from the PLAY button.
export function buildAudio() {
  let ctx = null, master = null, rollGain = null, rollFilter = null;
  let muted = false, volume = 0.5;

  function ensure() {
    if (ctx) { ctx.resume(); return; }
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : volume;
    master.connect(ctx.destination);

    // rolling loop: looped noise through a bandpass; gain follows speed (see update)
    const len = ctx.sampleRate * 1.2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.6;
    const src = ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    rollFilter = ctx.createBiquadFilter();
    rollFilter.type = 'bandpass'; rollFilter.frequency.value = 220; rollFilter.Q.value = 1.2;
    rollGain = ctx.createGain(); rollGain.gain.value = 0;
    src.connect(rollFilter).connect(rollGain).connect(master);
    src.start();
  }

  const now = () => ctx.currentTime;

  function blip(freq, dur, type = 'sine', vol = 0.25, slideTo = null) {
    if (!ctx) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, now());
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), now() + dur);
    g.gain.setValueAtTime(vol, now());
    g.gain.exponentialRampToValueAtTime(0.001, now() + dur);
    o.connect(g).connect(master);
    o.start(); o.stop(now() + dur + 0.02);
  }

  function noiseBurst(dur, freq, vol = 0.3) {
    if (!ctx) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = ctx.createBufferSource(); s.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
    const g = ctx.createGain(); g.gain.value = vol;
    s.connect(f).connect(g).connect(master);
    s.start();
  }

  // event → sound wiring (documentation by example — add your game's events here)
  events.on('hop', () => blip(180, 0.15, 'triangle', 0.2, 320));
  events.on('dash', () => { blip(240, 0.18, 'sawtooth', 0.16, 90); noiseBurst(0.12, 900, 0.12); }); // whoosh
  events.on('bump', ({ impact }) => noiseBurst(0.12, 260, Math.min(0.35, impact * 0.1)));
  events.on('win', () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => blip(f, 0.35, 'triangle', 0.3), i * 130)));
  events.on('lose', () => [330, 262, 196].forEach((f, i) => setTimeout(() => blip(f, 0.4, 'sawtooth', 0.18), i * 200)));

  // per-frame roll loudness (index.js passes horizontal speed)
  function update(speed) {
    if (!rollGain) return;
    const g = Math.min(0.16, speed * 0.02) * (state.phase === 'playing' ? 1 : 0);
    rollGain.gain.setTargetAtTime(g, now(), 0.08);
    rollFilter.frequency.setTargetAtTime(Math.min(2400, 160 + speed * 60), now(), 0.1);
  }

  function setMuted(m) {
    muted = m;
    if (master) master.gain.setTargetAtTime(muted ? 0 : volume, now(), 0.05);
  }

  return { ensure, update, setMuted, get muted() { return muted; } };
}
