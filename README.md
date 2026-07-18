# SPINFINITY

A portrait-or-landscape precision arcade game about keeping a spinner alive.
Steer into higher-risk score rings, strike **PULSE** when the rotating markers meet,
chain perfect timings, collect resonance gates, and use **OVERDRIVE** without losing
control. Every banked run increases the persistent **TOTAL SPIN**.

## Controls

- **Touch:** floating joystick to steer, **PULSE** to time a strike, **OVERDRIVE** to burst.
- **Desktop:** WASD or arrows to steer, Space to pulse, E or Shift to overdrive.
- Drag the right half of the arena to orbit the camera. Escape pauses.

The standard brushed-steel top is the default cosmetic. Add `?spinner=gator` to any game
URL to use the sleepy plush alligator spinner with identical physics and scoring.

## Run locally

    npm install
    npm run dev
    npm test
    npm run build

The game uses three-game-engine, three.js and Rapier. Its art and audio are procedural,
so no external asset downloads are required at runtime. Gameplay tuning and pure math live
in `logic.js`; the product design is documented in `docs/spinfinity-prd.md`.
