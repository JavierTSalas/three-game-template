import { state } from './state.js';
import { events } from './events.js';
import { spawnPrefab } from './spawn.js';

// Run lifecycle: phases, restart, win/lose API. Content-free on purpose — your game's
// rules (timers, score targets, spawn tables) plug in here and in startRun.
export default class Director {
  constructor(game, level) {
    this.game = game;
    this.level = level;
    this.restarting = false;
    this.onRewire = null; // index.js assigns: re-inject joystick/camera after loadScene
  }

  startRun() {
    state.phase = 'ready'; // first real input flips it to 'playing' (tick)
    state.everMoved = false;
    this.platforms = (this.level.platforms || []).map((p, i) =>
      spawnPrefab(this.game, 'platform', `platform${i}`, p));
    events.emit('runstart');
  }

  // per-frame hook (index.js beforeRender) — grow your timers/objectives here
  tick() {
    if (state.phase === 'ready' && state.everMoved) state.phase = 'playing';
  }

  // call these from your game code when you add win/lose conditions
  won() { if (state.phase === 'playing') { state.phase = 'won'; events.emit('win'); } }
  lost() { if (state.phase === 'playing') { state.phase = 'lost'; events.emit('lose'); } }

  async restart() {
    if (this.restarting) return; // loadScene throws if one is already in flight
    this.restarting = true;
    state.phase = 'boot';
    try {
      await this.game.loadScene('main'); // full scene rebuild = fresh rapier world
      const player = await waitForPlayer(this.game);
      this.onRewire?.(player);
      this.startRun();
    } finally {
      this.restarting = false;
    }
  }
}

export async function waitForPlayer(game) {
  let player;
  while (!(player = game.scene?.getGameObjectWithName('player')) || !player.isLoaded()) {
    await new Promise(r => setTimeout(r, 50));
  }
  return player;
}
