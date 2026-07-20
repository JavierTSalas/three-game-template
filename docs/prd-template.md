# <GAME TITLE> — PRD / GDD

> Copy this file to `docs/<game-id>-prd.md`, fill every section, and get the user's sign-off
> BEFORE writing game code (see AGENTS.md / CLAUDE.md "Game development requirements").
> Keep it updated —
> when a mechanic changes, the PRD changes in the same commit. Delete guidance blockquotes as
> you fill them in.

## Pitch

> One paragraph. What is this game, who is the player, why is it fun? If you can't say it
> in three sentences, the idea isn't ready.

## Core loop

> The 10–30 second cycle the player repeats: do → reward → escalate. Diagram or numbered list.

## Mechanics

> One row per mechanic. Both input columns and "Taught by" are REQUIRED — every mechanic must
> work without a physical keyboard on mobile and have a desktop path, and must be explained
> in-game (intro cutscene, hint step in `scripts/hints.js`, or contextual prompt). No blank
> cells. A direct gesture may be the touch input; otherwise name the visible on-screen control.

| Mechanic | What it does | Touch / on-screen input | Desktop input | Taught by |
|---|---|---|---|---|
| e.g. Hop | small jump, gap crossing | HOP button | Space | hint step 2 |

## Controls

> Define the complete controls for EVERY mode and minigame. No required action may be
> keyboard-only: a landscape phone with no physical keyboard must be able to finish the game.
> Desktop must have a complete keyboard and/or mouse/pointer path appropriate to the action;
> where both fit naturally, support both. Direct gestures are welcome; otherwise provide
> visible, reachable on-screen controls. Do not rely on hover or right-click. The template
> gives you: floating stick, two action buttons, WASD/arrows, Space, Shift/E, and Pointer Events
> that can serve mouse and touch from the same handler.

| Mode / screen | Touch / on-screen controls | Keyboard | Mouse / pointer |
|---|---|---|---|
| e.g. Main game | stick + HOP/DASH buttons | WASD/arrows + Space + Shift/E | camera drag |

> Before implementation, confirm that every required action appears in both the touch and
> desktop paths above. Use "N/A — not natural" rather than leaving a desktop modality blank.
> During verification, play each mode once at a mobile-landscape viewport using touch/pointer
> events and once with its desktop inputs.

## Win / lose

> Exact conditions that call `director.won()` / `director.lost()`, and what each screen offers.

## Intro cutscene

> The `data/level.json` "intro" lines (or your storyboard if it needs more than the flyover).
> Must answer: who am I, what am I trying to do, why?

## Tutorialization

> The `scripts/hints.js` step list: text + the deed that clears each step. Plus any
> contextual hints for mechanics that appear later.

## Juice & audio

> Events → particles/shake/sound. The template wires: hop, dash, bump, win, lose.

## Scope cuts (ponytails)

> What you're deliberately NOT building for v1, and the upgrade path. Mark shortcuts in
> code with `ponytail:` comments.

## Open questions

> Anything needing a user decision before or during implementation.
