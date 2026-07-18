import { events } from './events.js';

// A procedural sound toy: the top itself is the instrument. Two continuous voices track
// spin/wobble while short synthesized rewards make accurate timing progressively richer.
export function buildAudio() {
  let ctx = null, master = null, hum = null, humGain = null;
  let shimmer = null, shimmerGain = null, scrapeGain = null, scrapeFilter = null;
  let muted = false;
  const volume = 0.62;

  function ensure() {
    if (ctx) {
      ctx.resume();
      return;
    }
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -14;
    limiter.knee.value = 8;
    limiter.ratio.value = 7;
    limiter.attack.value = 0.004;
    limiter.release.value = 0.14;
    master = ctx.createGain();
    master.gain.value = muted ? 0 : volume;
    master.connect(limiter).connect(ctx.destination);

    hum = ctx.createOscillator();
    hum.type = 'triangle';
    hum.frequency.value = 95;
    humGain = ctx.createGain();
    humGain.gain.value = 0;
    hum.connect(humGain).connect(master);
    hum.start();

    shimmer = ctx.createOscillator();
    shimmer.type = 'sine';
    shimmer.frequency.value = 310;
    shimmerGain = ctx.createGain();
    shimmerGain.gain.value = 0;
    shimmer.connect(shimmerGain).connect(master);
    shimmer.start();

    const seconds = 1.4;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < channel.length; i++) channel[i] = Math.random() * 2 - 1;
    const scrape = ctx.createBufferSource();
    scrape.buffer = buffer;
    scrape.loop = true;
    scrapeFilter = ctx.createBiquadFilter();
    scrapeFilter.type = 'bandpass';
    scrapeFilter.frequency.value = 480;
    scrapeFilter.Q.value = 3;
    scrapeGain = ctx.createGain();
    scrapeGain.gain.value = 0;
    scrape.connect(scrapeFilter).connect(scrapeGain).connect(master);
    scrape.start();
  }

  function tone(freq, dur, type = 'sine', vol = 0.2, slideTo = null, delay = 0) {
    if (!ctx) return;
    const at = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, at);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), at + dur);
    gain.gain.setValueAtTime(0.001, at);
    gain.gain.exponentialRampToValueAtTime(vol, at + Math.min(0.018, dur * 0.2));
    gain.gain.exponentialRampToValueAtTime(0.001, at + dur);
    osc.connect(gain).connect(master);
    osc.start(at);
    osc.stop(at + dur + 0.03);
  }

  function noise(dur, freq, vol = 0.2, highpass = false) {
    if (!ctx) return;
    const length = Math.max(8, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      const envelope = Math.pow(1 - i / length, 1.7);
      channel[i] = (Math.random() * 2 - 1) * envelope;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = highpass ? 'highpass' : 'lowpass';
    filter.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.value = vol;
    source.connect(filter).connect(gain).connect(master);
    source.start();
  }

  events.on('spinstart', () => {
    tone(72, 0.46, 'sawtooth', 0.12, 220);
    tone(144, 0.34, 'triangle', 0.1, 360, 0.06);
  });
  events.on('pulse', ({ grade, chain }) => {
    if (grade === 'perfect') {
      const scale = [0, 2, 4, 7, 9];
      const semitone = scale[Math.min(scale.length - 1, Math.floor(chain / 2))];
      const root = 440 * Math.pow(2, semitone / 12);
      tone(root, 0.22, 'sine', 0.23);
      tone(root * 1.5, 0.28, 'triangle', 0.12, null, 0.035);
      if (chain >= 5) tone(root * 2, 0.34, 'sine', 0.08, null, 0.075);
    } else if (grade === 'good') {
      tone(330 + Math.min(180, chain * 12), 0.18, 'triangle', 0.15, 430);
    } else {
      tone(128, 0.2, 'square', 0.1, 82);
      noise(0.09, 520, 0.08);
    }
  });
  events.on('overdrive', () => {
    tone(92, 0.42, 'sawtooth', 0.16, 520);
    tone(184, 0.34, 'triangle', 0.12, 780, 0.045);
    noise(0.18, 1100, 0.11, true);
  });
  events.on('gate', ({ value }) => {
    const root = value >= 2 ? 659 : value > 1 ? 587 : 523;
    [1, 1.25, 1.5].forEach((ratio, i) => tone(root * ratio, 0.3, 'sine', 0.14, null, i * 0.055));
  });
  events.on('save', () => {
    [392, 523, 659, 784].forEach((freq, i) => tone(freq, 0.34, 'triangle', 0.13, null, i * 0.05));
  });
  events.on('bump', ({ impact }) => {
    noise(0.12, 320, Math.min(0.25, impact * 0.07));
    tone(88, 0.16, 'sine', Math.min(0.13, impact * 0.03), 55);
  });
  events.on('lose', () => {
    [294, 220, 147, 92].forEach((freq, i) => tone(freq, 0.5, 'sawtooth', 0.1, freq * 0.72, i * 0.15));
  });

  function update(gameState, speed = 0) {
    if (!ctx || !humGain) return;
    const active = !gameState.paused && (gameState.phase === 'playing' || gameState.phase === 'ready');
    const energy = Math.max(0, Math.min(1, gameState.spinEnergy || 0));
    const wobble = Math.max(0, Math.min(1, gameState.wobble || 0));
    const flow = Math.max(1, gameState.flow || 1);
    const at = ctx.currentTime;
    hum.frequency.setTargetAtTime(66 + energy * 190 + speed * 4, at, 0.075);
    humGain.gain.setTargetAtTime(active ? 0.018 + energy * 0.045 : 0, at, 0.11);
    shimmer.frequency.setTargetAtTime(260 + energy * 690, at, 0.08);
    shimmerGain.gain.setTargetAtTime(active ? Math.min(0.045, flow * 0.0035) : 0, at, 0.14);
    scrapeGain.gain.setTargetAtTime(active ? wobble * wobble * 0.075 + speed * 0.0015 : 0, at, 0.09);
    scrapeFilter.frequency.setTargetAtTime(360 + wobble * 1900 + speed * 45, at, 0.12);
  }

  function setMuted(next) {
    muted = next;
    if (master) master.gain.setTargetAtTime(muted ? 0 : volume, ctx.currentTime, 0.05);
  }

  return { ensure, update, setMuted, get muted() { return muted; } };
}
