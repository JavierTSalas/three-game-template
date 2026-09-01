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

> If the original pitch is brief, autonomously choose the strongest premise-specific loop and
> commit to it here; do not return the design problem to the user. Moving, hopping, dashing,
> collecting, or surviving alone is not a complete loop. Describe the 10–30 second cycle the
> player repeats (do → decide → risk → reward → escalate), then fill every column below.

| Core verb | Repeated meaningful decision | Risk / reward | Escalating pressure | Failure / recovery hook | Mastery / replay hook |
|---|---|---|---|---|---|
| _what the player actively does_ | _the choice that changes each cycle_ | _what is wagered and won_ | _how the loop intensifies_ | _what failure teaches and how play restarts_ | _what skilled players chase next_ |

## World / level identity

> REQUIRED even when the original game idea is vague. Make one specific spatial choice that
> expresses the premise and helps the core loop. The template's checkerboard, four-wall
> boundary, default bounds, and platform rows are scaffolding: replace their spatial identity,
> not just their colors or props. A square or rectangular room is valid only when it is an
> intentional choice; explain the gameplay reason here.

| Topology / silhouette | Boundary fiction | Traversal pattern | Signature landmark | Why it serves the core loop |
|---|---|---|---|---|
| _name the shape_ | _what contains or ends the play space_ | _how players move through it_ | _one memorable spatial anchor_ | _mechanical reason_ |

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
> keyboard-only: a phone with no physical keyboard must be able to finish the game in either
> orientation.
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
> During verification, play each mode in both mobile portrait and landscape viewports using
> touch/pointer events, then once with its desktop inputs.

## Win / lose

> Exact conditions that call `director.won()` / `director.lost()`, and what each screen offers.

## Intro cutscene

> The `data/level.json` "intro" lines (or your storyboard if it needs more than the flyover).
> Must answer: who am I, what am I trying to do, why?

## Tutorialization

> The `scripts/hints.js` step list: text + the deed that clears each step. Plus any
> contextual hints for mechanics that appear later.

## Reward cadence, juice & audio

> Plan earned feedback at all three timescales. Every effect must communicate a real action,
> risk, state change, or payoff; do not substitute popup spam, passive rewards, or decorative
> currencies for satisfying mechanics. The template already wires hop, dash, bump, win, and
> lose events as examples.

| Timescale | Earned trigger | Player-readable feedback | Escalation / variation | Reset or recovery |
|---|---|---|---|---|
| Immediate (under 1 second) | _skilled input, contact, timing, pickup_ | _motion, sound, particles, shake, hit-stop, score tick_ | _stronger feedback for better execution_ | _how misses stay readable_ |
| Short cycle (10–30 seconds) | _chain, multiplier, near-miss, completed beat_ | _rising audio/visual intensity and clear stakes_ | _how tension and reward grow_ | _how the player saves or loses the chain_ |
| Whole run | _milestone, new phase, boss, extraction, personal best_ | _challenge shift, celebration, persistent progress_ | _new patterns, hazards, goals, or tradeoffs_ | _why failure creates an immediate one-more-run goal_ |

## Scope cuts (ponytails)

> What you're deliberately NOT building for v1, and the upgrade path. Mark shortcuts in
> code with `ponytail:` comments.

## Open questions

> Anything needing a user decision before or during implementation.
