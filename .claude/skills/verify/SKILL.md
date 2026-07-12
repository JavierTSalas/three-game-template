---
name: verify
description: Drive this game in a real browser and capture evidence — boot, input matrix (joystick/WASD/arrows/hop/dash), pause, respawn, viewport checklist. Use after any change to player/camera/director/index or the shell.
---

# Verifying this game

`npm test` covers the pure math only. Everything that matters — feel, input, viewport —
is verified by DRIVING the real game and observing it. Judge motion by driving it, not
from a single frame.

## Handle

```bash
npm run dev -- --port 8189    # 8180 may be another game's dev server
# chrome-devtools CLI (npm i -g chrome-devtools-mcp):
chrome-devtools new_page "http://localhost:8189"
# wait ~7s (splash), then:
chrome-devtools evaluate_script "() => window.__state.phase"   # → 'menu'
```

`window.game`, `window.__state`, `window.__director` are exposed for introspection.

## The drive matrix (all via evaluate_script — see gotchas below)

1. **PLAY**: `document.getElementById('playBtn').click()` → `startScreen` hidden,
   `#controls` shown, phase `ready`.
2. **Keyboard**: dispatch `KeyboardEvent` on `document` with `bubbles: true` and BOTH
   `key` and `code` (`{key:'w', code:'KeyW'}`); keydown → wait → keyup. Position from
   `player.getRapierRigidBody().translation()`. Test `w` AND `ArrowLeft` (they take
   different code paths — engine axis vs lowercase-store fallback).
3. **Hop**: `code:'Space'` → sample peak `y` (expect ≈ +0.44 over rest at default TUNE).
4. **Dash**: `key:'e'` while driving → horizontal speed roughly doubles for an instant.
5. **Joystick**: dispatch `PointerEvent`s on `#stickZone` (`pointerId` any int,
   `bubbles: true`): pointerdown at a zone point, pointermove offset ≤46px, hold, pointerup.
   Works headlessly — `setPointerCapture` is try/caught for synthetic pointers.
6. **Respawn**: `body.setTranslation({x: 25, y: 1, z: 0})` → within ~300ms back near spawn.
7. **Pause**: Escape keydown → `__state.paused` true AND `game.gameOptions.disablePhysics`
   true; Escape again → both false. RESTART button → scene rebuilds, platforms re-mesh
   (`threeJSGroup.children.length === 1`), drive still works (rewire proof).
8. **Viewport checklist** (from docs/full-screen-pwa.md — all must hold):

```js
const se = document.scrollingElement, c = document.getElementById('gameCanvas');
({ pageScrollX: se.scrollWidth > se.clientWidth,   // false
   pageScrollY: se.scrollHeight > se.clientHeight, // false
   cssVsBuffer: [c.clientWidth, c.clientHeight, c.width, c.height], // match ×dpr
   inlinePx: c.getAttribute('style') })            // empty
```

9. Screenshot + `chrome-devtools list_console_messages --types error --types warn`.
   Expected baseline: one `Multiple instances of Three.js` warn (engine trait), nothing else.

## Gotchas

- webpack-dev-server live-reloads on ANY watched edit (including `data/` via the copy
  plugin) — a reload mid-drive resets the page and races your script. Finish edits, wait
  for the rebuild, THEN navigate fresh.
- Synthetic keyboard events must go to `document` (bubbles to window — both the engine
  store and the index.js Space listener see them).
- `getWorldPos()` returns a reused Vector3 — spread/copy before comparing two reads.
- Closed-loop driving: convert world direction to stick space with the current
  `state.camYaw` (the camera auto-settles behind velocity, so a fixed key drifts).
