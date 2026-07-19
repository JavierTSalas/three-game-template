// Single shared mutable game state. Systems import and mutate — no getters, no events.
export const state = {
  phase: 'boot', // boot | menu | ready | playing | won | lost
  paused: false,       // pause menu up: physics disabled, gameplay systems gated
  camYaw: 0,           // camera orbit angle — the ONE yaw authority (camera.js writes it)
  everMoved: false,    // first real input flips ready → playing (director.tick)
  hopRequested: false, // one-frame edges — buttons/keys set, player consumes per frame
  dashRequested: false,
};
