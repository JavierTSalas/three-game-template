import { state } from './state.js';
import { bindFsButton } from './fullscreen.js';

// Pause: freeze physics via gameOptions.disablePhysics (checked live each frame by the
// engine render loop — dt stays sane, world keeps rendering behind the overlay) and gate
// gameplay systems with state.paused. NEVER game.pause(): its dt accumulates and the
// physics explode on resume. Esc or the ⏸ button toggles. The pause screen doubles as
// the settings page (fullscreen + sound).
const SOUND_KEY = '__GAME_ID__:sound';

export function buildPause(game, director, audio) {
  const el = id => document.getElementById(id);
  const screen = el('pauseScreen');

  function pause() {
    if (state.paused || (state.phase !== 'playing' && state.phase !== 'ready')) return;
    state.paused = true;
    game.gameOptions.disablePhysics = true;
    screen.style.display = 'flex';
  }
  function resume() {
    if (!state.paused) return;
    state.paused = false;
    game.gameOptions.disablePhysics = false;
    screen.style.display = 'none';
  }
  const toggle = () => (state.paused ? resume() : pause());

  window.addEventListener('keydown', e => { if (e.key === 'Escape') toggle(); });
  el('pauseBtn').addEventListener('click', pause);
  el('resumeBtn').addEventListener('click', resume);
  el('pauseRestartBtn').addEventListener('click', async () => {
    resume();
    await director.restart(); // has its own in-flight guard
  });
  bindFsButton(el('pauseFsBtn'));

  // sound toggle — the example "setting", persisted per game id
  const sb = el('soundBtn');
  const applySound = () => {
    const off = localStorage.getItem(SOUND_KEY) === 'off';
    audio.setMuted(off);
    sb.textContent = off ? '🔇 SOUND OFF' : '🔊 SOUND ON';
  };
  sb.addEventListener('click', () => {
    localStorage.setItem(SOUND_KEY, localStorage.getItem(SOUND_KEY) === 'off' ? 'on' : 'off');
    applySound();
  });
  applySound();

  return { toggle, pause, resume };
}
