import { state, resetRun } from './state.js';
import { events } from './events.js';
import { spawnPrefab } from './spawn.js';
import Platform from './platform.js';
import { TUNE, advanceFlow, scoreRate, zoneForRadius, clamp01 } from '../logic.js';

const BEST_KEY = 'spinfinity:best';
const TOTAL_KEY = 'spinfinity:total';
const PATTERNS = ['SWEEP', 'GATES', 'ORBIT', 'REMIX'];

export default class Director {
  constructor(game, level) {
    this.game = game;
    this.level = level;
    this.restarting = false;
    this.onRewire = null;
    this.platforms = [];
  }

  startRun() {
    resetRun();
    state.bestScore = readNumber(BEST_KEY);
    state.totalSpin = readNumber(TOTAL_KEY);
    state.phase = 'ready';
    this.platforms = (this.level.platforms || []).map((p, i) =>
      spawnPrefab(this.game, Platform, {
        type: 'platform', name: `resonator${i}`,
        position: { x: p.x, y: p.y, z: p.z },
        userData: { index: i, value: p.value ?? 1 },
      }));
    events.emit('runstart', { bestScore: state.bestScore, totalSpin: state.totalSpin });
  }

  tick(dt) {
    const player = this.game.scene?.getGameObjectWithName('player');
    if (!player?.isLoaded?.()) return;
    if (state.phase === 'ready' && state.everMoved) {
      state.phase = 'playing';
      events.emit('spinstart');
    }
    if (state.phase !== 'playing') return;

    state.elapsed += dt;
    const pos = player.getRapierRigidBody().translation();
    const radius = Math.hypot(pos.x, pos.z);
    const zone = zoneForRadius(radius);
    if (zone.name !== state.zone) events.emit('zone', { from: state.zone, to: zone.name });
    state.zone = zone.name;
    state.zoneMultiplier = zone.multiplier;
    state.flow = advanceFlow(state.flow, dt, zone.multiplier);
    state.scoreRate = scoreRate(state.spinEnergy, state.flow, zone.multiplier, state.overdrive > 0);
    state.score += state.scoreRate * dt;

    const patternIndex = Math.floor(state.elapsed / 30) % PATTERNS.length;
    const pattern = PATTERNS[patternIndex];
    if (pattern !== state.pattern) {
      state.pattern = pattern;
      events.emit('pattern', { pattern });
    }
    this.platforms.forEach(p => p.setPattern?.(patternIndex));

    for (const gate of this.platforms) {
      if (!gate?.isLoaded?.() || !gate.active) continue;
      const gp = gate.getRapierRigidBody().translation();
      if (Math.hypot(pos.x - gp.x, pos.z - gp.z) > TUNE.GATE_RADIUS) continue;
      if (!gate.collect()) continue;
      const value = gate.value || 1;
      const bonus = Math.round(TUNE.GATE_SCORE * value * Math.max(1, state.zoneMultiplier)
        * Math.max(1, state.flow * 0.35));
      state.score += bonus;
      state.gates++;
      state.spinEnergy = clamp01(state.spinEnergy + TUNE.GATE_SPIN_GAIN * value);
      state.flow = Math.min(TUNE.FLOW_MAX, state.flow + 0.14 * value);
      events.emit('gate', { bonus, value, position: { x: gp.x, y: gp.y, z: gp.z } });
    }

    if (radius > TUNE.ARENA_RADIUS + 0.28 || pos.y < -1.2) this.lost('EDGE OUT');
    else if (state.wobble >= TUNE.WOBBLE_CRASH) this.lost('WOBBLE OUT');
    else if (state.spinEnergy <= 0.012) this.lost('SPIN OUT');
  }

  lost(reason = 'SPIN OUT') {
    if (state.phase !== 'playing') return;
    state.phase = 'lost';
    state.scoreRate = 0;
    state.crashReason = reason;
    const finalScore = Math.floor(state.score);
    const previousBest = state.bestScore;
    state.bestScore = Math.max(previousBest, finalScore);
    state.totalSpin += finalScore;
    writeNumber(BEST_KEY, state.bestScore);
    writeNumber(TOTAL_KEY, state.totalSpin);
    events.emit('lose', {
      reason,
      score: finalScore,
      bestScore: state.bestScore,
      isBest: finalScore > previousBest,
      totalSpin: state.totalSpin,
      bestChain: state.bestChain,
      perfects: state.perfects,
      goods: state.goods,
      misses: state.misses,
      gates: state.gates,
      saves: state.saves,
    });
  }

  async restart() {
    if (this.restarting) return;
    this.restarting = true;
    state.phase = 'boot';
    events.emit('resultclose');
    try {
      await this.game.loadScene('main');
      const player = await waitForPlayer(this.game);
      this.onRewire?.(player);
      this.startRun();
    } finally {
      this.restarting = false;
    }
  }
}

function readNumber(key) {
  try { return Math.max(0, Number(localStorage.getItem(key) || 0) || 0); }
  catch { return 0; }
}

function writeNumber(key, value) {
  try { localStorage.setItem(key, String(Math.floor(value))); } catch { /* storage unavailable */ }
}

export async function waitForPlayer(game) {
  let player;
  while (!(player = game.scene?.getGameObjectWithName('player')) || !player.isLoaded()) {
    await new Promise(r => setTimeout(r, 50));
  }
  return player;
}
