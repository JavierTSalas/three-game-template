# <GAME TITLE> — PRD / GDD

> Copy this file to `docs/<game-id>-prd.md`, fill every section, and get the user's sign-off
> BEFORE writing game code (see CLAUDE.md "Game development requirements"). Keep it updated —
> when a mechanic changes, the PRD changes in the same commit. Delete guidance blockquotes as
> you fill them in.

## Pitch

> One paragraph. What is this game, who is the player, why is it fun? If you can't say it
> in three sentences, the idea isn't ready.

## Core loop

> The 10–30 second cycle the player repeats: do → reward → escalate. Diagram or numbered list.

## Mechanics

> One row per mechanic. "Taught by" is REQUIRED — every mechanic must be explained in-game
> (intro cutscene, hint step in `scripts/hints.js`, or contextual prompt). No blank cells.

| Mechanic | What it does | Input | Taught by |
|---|---|---|---|
| e.g. Hop | small jump, gap crossing | HOP btn / Space | hint step 2 |

## Controls

> Touch layout (landscape) + keyboard fallback. The template gives you: floating stick,
> two action buttons, WASD/arrows, Space, Shift/E.

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
