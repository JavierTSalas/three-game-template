import { state } from './state.js';
import { events } from './events.js';

// First-run tutorial (ported from slimeball-odyssey): #hintCard shows one instruction at a
// time and only advances when the player actually DOES the thing — no timed slideshows.
// Runs once per install (localStorage), hides behind end screens, returns next run if
// unfinished. Requirement: every mechanic you add gets a step here (or a contextual hint).
const KEY = '__GAME_ID__-onboarded';

export function buildHints() {
  const card = document.getElementById('hintCard');
  if (localStorage.getItem(KEY)) return { start() {}, update() {} };

  // deed flags — event-driven so steps can't be satisfied by button mashing in a menu
  let hopped = false, dashed = false, holdT = 0;
  events.on('hop', () => { hopped = true; });
  events.on('dash', () => { dashed = true; });

  const steps = [
    { text: '👆 Drag the LEFT side (or WASD/arrows) to roll', done: () => state.everMoved },
    { text: '🦘 Tap HOP (or Space) to jump', done: () => hopped },
    { text: '💨 Tap DASH (or Shift/E) for a burst of speed', done: () => dashed },
    { text: '🎯 That’s everything — go play!', done: () => holdT > 3 },
  ];
  let idx = -1;

  return {
    start() {
      idx = 0;
      card.textContent = steps[0].text;
      card.style.display = 'block';
    },
    update(dt) {
      if (idx < 0 || idx >= steps.length) return;
      const inPlay = state.phase === 'ready' || state.phase === 'playing';
      card.style.display = inPlay ? 'block' : 'none'; // hide behind end screens, return next run
      if (!inPlay) return;
      if (idx === steps.length - 1) holdT += dt;
      if (steps[idx].done()) {
        idx++;
        if (idx >= steps.length) {
          card.style.display = 'none';
          localStorage.setItem(KEY, '1');
        } else {
          card.textContent = steps[idx].text;
        }
      }
    },
  };
}
