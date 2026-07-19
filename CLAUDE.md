# CLAUDE.md

## What this is

**__GAME_TITLE__** — a mobile-landscape browser game built on **three-game-engine** v0.10
(bundles three 0.168 + rapier3d-compat 0.11 + three-mesh-ui). Webpack build, DOM overlays for
menus/controls, procedural WebAudio, PWA-installable, deployed on Vercel (push `main` → prod).
Born from `three-game-template`; the shipped "game" is a platformer sandbox (roll, hop, dash)
you replace with your mechanic.
**Viewport/fullscreen/PWA: `docs/full-screen-pwa.md`** (one-ruler rule, pitfall table,
cache-busting — read before touching canvas sizing, overlays, or the service worker).
**Models/conversion: `docs/asset-pipeline.md`** (text-to-3D, FBX→GLB, black-model triage,
engine-scene reuse — read before importing any 3D asset).

## Run / verify

    npm run dev    # webpack-dev-server :8180, LAN-exposed for phones
    npm test       # node --test → logic.test.js (pure math only)
    npm run build  # → dist/

Verify feel by driving the real game in a browser (Playwright/DevTools): pointer events on
`#stickZone`, keyboard WASD/arrows; `window.game` / `window.__state` / `window.__director`
are exposed for introspection. Judge motion by driving it, not from a single frame.
"Something's clipped / there's a scrollbar" → run the debug snippet in
`docs/full-screen-pwa.md` before touching code.

## Architecture

- `index.js` — composition root: splash FIRST (before any engine work), Game boot (own canvas,
  `wsadMovement`, pixelRatio cap), class registration, per-frame `fitCanvas()`, menu-orbit
  camera, out-of-world respawn, REFRESH-APP cache nuke, error screen. Event→juice wiring is
  registered ONCE with `particles.current`/`rig` holders — restart must not stack listeners.
- `logic.js` — ALL tuning (`TUNE`) + pure math, node-tested in `logic.test.js`. Change tuning
  here, never inline. Add your game's math here first, with tests.
- `scripts/state.js` — single shared mutable state (phase/paused/camYaw/input edges);
  `scripts/events.js` — tiny pub/sub. Events in use: `runstart, hop, dash, bump, win, lose`.
- `scripts/player.js` — the ball-guy: per-frame impulses (NEVER rapier `addForce`), joystick +
  WASD + arrow fallback, hop, dash burst, squash spring, blob shadow, camera-rig update.
- `scripts/director.js` — run lifecycle: phases `boot|menu|ready|playing|won|lost`, restart
  with the loadScene-in-flight guard, `won()`/`lost()` for your win conditions, platform
  spawning via `scripts/spawn.js` (THE runtime-spawn pattern — see gotchas).
- `scripts/camera.js` — follow/zoom/orbit/shake; `state.camYaw` is the yaw authority; built
  ONCE per session against a player getter (rebuilding stacks pointer listeners).
- `scripts/joystick.js` — floating touch stick (double-tap-hold = sprint flag).
- `scripts/audio.js` — procedural WebAudio; `ensure()` needs a user gesture; `setMuted()`
  feeds the pause-screen sound toggle. `scripts/juice.js` — toonify pass + particle pool.
- `scripts/pause.js` — Esc/⏸ freeze via `game.gameOptions.disablePhysics` (live-checked by the
  engine loop — never `game.pause()`, its dt explodes on resume) + `state.paused` gates.
  Doubles as the settings page (fullscreen, sound).
- `scripts/splash.js` — instant 2D canvas splash; module-top start; menu reveal awaits
  `splash.done`, cover drops via `splash.lift()` only when the world is ready.
- `scripts/terrain.js` — ground/fence/sun/sky/fog theme. `scripts/platform.js` — hop boxes.
- `data/level.json` — bounds/spawn/placements. Content lives in data, not code.
- Engine JSON prefabs in `game_objects/`, scene in `scenes/main.json`, manifest `game.json`.

## ⚠️ Engine gotchas (verified against three-game-engine v0.10 — re-verify on upgrades)

- **JSON schema is components-based**: `{"components":[{"type":"rigidBody","rigidBodyType":"dynamic","colliders":[...]}]}`.
  The engine's own docs folder shows an older `"rigidBody":{}` / `"models":[]` form — WRONG, don't copy it.
- **`scene.active` is never set true** by the engine, so `addGameObject` never auto-loads
  runtime spawns: after constructing one you MUST call `obj.load().then(() => obj.afterLoaded())`.
  AND: **`registerGameObjectClasses` only applies to scene-JSON loads** — a runtime
  `new GameObject(...)` bypasses the registry, so your subclass's `afterLoaded` (meshes!)
  silently never runs; construct the subclass itself. `scripts/spawn.js` encodes both.
- **`game.renderer` exists only after `game.play()`** (created in async `_init`). Attach
  `game.renderer.options.beforeRender` after play resolves.
- **Rapier `addForce` is persistent** (accumulates every frame until `resetForces`). Use
  per-frame `applyImpulse(force * dt)` for driving.
- **rapier3d-compat 0.11 has NO `intersectionPairsWith`** (newer API). Overlap queries =
  `world.intersectionsWithShape(pos, rot, shape, cb)` — the callback MUST `return true` to keep
  iterating, and never mutate the world mid-query (collect, then act).
- **`Scene.setFog(null)` warns `Invalid hex color #00000`**: `typeof null === 'object'` routes
  null into the engine's defaults branch, whose color literal is malformed. Declaring a valid
  `"fog"` in each scene JSON bypasses it (terrain re-fogs per theme right after anyway).
- **GLB `scene.clone(true)` SHARES materials across clones** — mutating a material (emissive,
  opacity) hits every instance of that model. Idempotent one-time fixes (tint, alpha clamp) are
  fine; per-instance cues must transform the group (jiggle/sway), never the material.
- MUST pass `inputOptions: { wsadMovement: true }` — W/A are dead without it (inside the
  wsadMovement branch in InputManager). Arrow keys are dead in the engine REGARDLESS:
  `KeyboardHandler` stores `event.key.toLowerCase()` but `InputManager` checks
  `isKeyDown('ArrowUp')` mixed-case → never matches. `player.js` reads `'arrowup'` etc.
  from `keyboardHandler` directly as fallback — query that store lowercase only.
- `readVerticalAxis()`: forward = **-1**. Our convention is `{x:+right, z:+forward}`, so negate it.
- Never `setupFullScreenCanvas: true` (wipes `document.body` = kills the DOM overlays). We pass
  our own canvas + our own per-frame `fitCanvas()`.
- `game.loadScene()` throws if a load is in flight — restart paths guard with
  `director.restarting`.
- Import THREE/RAPIER only from `'three-game-engine'` re-exports (never separate npm deps).
- InstancedMesh: `THREE.DynamicDrawUsage`, never `THREE.DynamicDraw` (undefined in r160+ →
  silently invisible mesh).
- Rapier colliders can't resize in place: changing size = removeCollider + createCollider.
- Engine tags are set synchronously in the constructor but `afterLoaded` runs async — guard
  `isLoaded()` in anything that iterates tagged objects.
- Loader note for GLB props: skip rigged/skinned GLBs on a plain-clone pipeline (breaks
  skeletons + bounding math); missing/broken GLB should fall back to a primitive so the game
  always runs. See `docs/asset-pipeline.md`.
- `getWorldPos()` returns a REUSED Vector3 — copy scalars before iterating over it.

## Conventions

- Tuning: change `TUNE` in `logic.js`, never inline magic numbers.
- Content in `data/*.json`, math in `logic.js` (tested), wiring in `index.js`, feel in
  `scripts/` — keep the layers.
- `ponytail:` comments mark deliberate ceilings (shortcut + upgrade path).
- Test gate: `npm test` green before pushing `main` (Vercel deploys `main`).

## Game development requirements (non-negotiable)

- **Are you in the template?** Run `git remote -v` first. If origin is
  `three-game-template`, this is the TEMPLATE — never build a specific game here. Birth the
  game first: `gh repo create <game> --template JavierTSalas/three-game-template --private
  --clone`, work there, and create a NEW Vercel project imported from THAT repo. Never run
  `vercel link`/`vercel deploy`/`vercel git connect` from the template checkout — that
  attaches a game-named Vercel project to the template repo, and every future template push
  will overwrite the game's production URL (this happened once; don't repeat it).
- **Plan before code.** Before implementing any game idea (new game, new mode, or a major
  mechanic), write a design artifact first — a PRD/GDD in `docs/<game-name>-prd.md` covering
  at least: pitch, core loop, mechanics, controls, win/lose conditions, tutorialization plan,
  and scope cuts. Get the user's sign-off on the plan, then implement.
- **Intro cutscene.** Every game must open with an intro cutscene/sequence (after splash,
  before `menu`/`ready`) that explains the premise and what the player is trying to do.
  Skippable on tap/key; wire it as a director phase so restart logic stays clean.
- **Teach every mechanic.** Whenever a game mechanic exists (hop, dash, or whatever your game
  adds), it must be explained to the player in-game — via the intro cutscene, a first-run
  tutorial prompt, or a contextual hint the first time it's relevant. No mechanic ships
  undocumented to the player. Track "seen" hints in `state` (persist to localStorage if it
  should survive reloads).

## Growing a game from the skeleton

Score/HUD: add fields to `state`, a DOM overlay in `index.html`, update it in the
`beforeRender` hook. Win/lose: call `director.won()`/`lost()` from your rules, listen for
`win`/`lose` events for screens/sound (jingles are already wired). New object types: engine
prefab in `game_objects/` + a class registered in `index.js` + rows in `data/level.json`,
spawned via `spawnPrefab`. New sounds: bind events in `audio.js`. New math: `logic.js` + a
test. Real 3D models: `docs/asset-pipeline.md`, drop GLBs in `models/` (webpack copies it).
