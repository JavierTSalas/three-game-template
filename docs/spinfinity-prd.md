# SPINFINITY — Product Requirements Document

**Status:** Implemented MVP  
**Date:** 2026-07-17  
**Platform:** Mobile-landscape browser / desktop browser / installable PWA  
**Engine:** three-game-engine v0.10  
**Tagline:** Keep it upright. Push the edge. Make the number absurd.

## 1. Product summary

SPINFINITY is an endless, score-chasing dexterity game built around a precision-machined
metal spinning top. The player launches the top, steers its lean, lands timed torque
pulses to preserve momentum, and takes increasingly dangerous routes around the arena to
grow one enormous score.

The top should look like a faithful playable version of the reference object: brushed
steel, rotationally symmetric, needle-like tips above and below a broad central disc, with
convincing reflections, weight, precession, and wobble. The simulation may be simplified
under the hood, but the object must look and sound physical.

The fantasy is: **“I can keep this impossible spin alive because my timing is excellent.”**

## 2. Goals

1. Create a mechanic that is understandable in five seconds but rewards practiced timing,
   route planning, and recovery skill.
2. Make the primary score rise continuously, then accelerate dramatically when the player
   enters a flow state.
3. Reward skill more than repetition. A strong player should score several times faster
   than a player who only survives in the safe center.
4. Deliver dense audiovisual feedback without obscuring the top, arena, timing window, or
   danger state.
5. Feel consistent across browser refresh rates and mobile devices.

## 3. Non-goals for the first version

- Multiplayer top battles.
- Online accounts or leaderboards.
- A realistic rigid-body gyroscope simulator at the expense of responsive controls.
- Paid progression, energy timers, loot boxes, or stat advantages.
- Multiple arenas, campaigns, bosses, or a large skin catalog.

## 4. Target experience

- **Audience:** Players who enjoy short score-attack games, rhythm-adjacent timing,
  physics toys, and “one more run” mastery loops.
- **Session length:** 45 seconds for a beginner; 3–8 minutes for a skilled run.
- **First meaningful action:** Within five seconds of pressing Play.
- **Tone:** Premium desk toy meets neon arcade machine.
- **Emotional arc:** Curiosity → control → flow → greed → near-loss recovery → spectacle →
  immediate restart.

## 5. Design pillars

### 5.1 Physical object, arcade readability

The top has a believable silhouette, center of mass, shadow, metallic response, spin blur,
precession, and scrape sounds. Player-facing values such as spin energy and wobble are
authored for feel and readability rather than delegated entirely to Rapier.

### 5.2 Skill creates acceleration

Merely surviving grows the score slowly. Perfect torque timing, clean pickups, edge routes,
and recovery moves multiply the rate. The reward for mastery is not only a higher final
score—the number visibly climbs faster while the player is succeeding.

### 5.3 Every action answers immediately

Inputs produce a visible lean or impulse, a tactile sound, a controller/UI response, and a
score or stability consequence on the same frame. There are no ambiguous misses.

### 5.4 Failure feels deserved and restart feels free

The player can read wobble, low spin, collisions, and edge danger before failure. A crash
gets one satisfying metallic payoff and a one-tap restart with no loading screen.

## 6. Core game loop

1. **Launch:** Hold and release PULSE in the highlighted timing arc to establish starting
   RPM. A tangential touch flick can earn an expert launch bonus.
2. **Stabilize:** Steer into the safe inner ring and learn the top’s current lean response.
3. **Sustain:** Press PULSE as the rotating rim marker crosses the strike line. Accurate
   pulses add spin energy; inaccurate pulses add wobble.
4. **Route:** Lean through energy gates and score rings while continuing the timing loop.
5. **Risk:** Move into outer arena bands, chain pickups, or trigger OVERDRIVE for larger
   multipliers and narrower recovery margins.
6. **Recover:** Counter-steer a wobble, escape the edge, or land an EDGE SAVE to preserve
   the combo.
7. **Escalate:** The arena pattern, audio layers, speed, score rate, and visual intensity
   build as FLOW rises.
8. **Crash and restart:** The top loses spin, tips over, or leaves the platform. The run
   score banks into a permanent lifetime total and the player can instantly try again.

## 7. Player controls

### Touch

- **Left thumb / floating stick:** Lean and steer the spinning top.
- **PULSE button:** Timed torque input; hold/release for the opening launch.
- **OVERDRIVE button:** Spend stability for a burst of speed and multiplier.
- **Pause button:** Pause and settings.

### Keyboard

- **WASD or arrow keys:** Lean and steer.
- **Space:** PULSE / launch.
- **E or Shift:** OVERDRIVE.
- **Escape:** Pause.

### Input principles

- Steering is camera-relative and analog when a joystick/gamepad is available.
- PULSE is graded on press timing, not key-release latency.
- Audio is never required to locate the timing window; the rim marker and strike line are
  sufficient on their own.
- Touch, WASD, and arrow paths must remain equally functional after restart.

## 8. Core systems

### 8.1 Spin energy

`spinEnergy` is the authored gameplay representation of RPM.

- It decays continuously.
- Perfect and Good PULSE inputs restore it.
- Collisions, bad pulses, heavy wobble, and OVERDRIVE consume it.
- Higher energy increases travel speed, timing frequency, score rate, hum pitch, and visual
  spin blur.
- The player crashes when both energy and recoverable stability fall below their limits.

### 8.2 Wobble and precession

`wobble` represents how far the top has drifted from stable upright rotation.

- Bad timing, abrupt steering, wall impacts, and low energy add wobble.
- Smooth counter-steering reduces wobble.
- Wobble appears as a growing tilt cone, widening contact circle, irregular shadow, and
  audible scrape rhythm.
- A brief recovery window appears near high wobble. Correct counter-steering produces a
  **SAVE**; incorrect steering tips the top.

### 8.3 Timing pulse

A luminous marker rotates around the top’s central disc. A fixed strike line defines the
input target.

| Grade | Window | Result |
|---|---:|---|
| PERFECT | ±35 ms baseline | Large energy gain, FLOW increase, clean bell tone |
| GOOD | ±90 ms baseline | Small energy gain, combo preserved |
| LATE/EARLY | Outside Good | Wobble increase, dull metal tick, FLOW loss |

The windows can narrow modestly at extreme FLOW, but never below accessible minimums.
Latency calibration is out of scope for MVP; the visual marker is authoritative.

### 8.4 Arena zones

- **Center — x1.0:** Safest route, broad recovery space, low scoring.
- **Orbit ring — x1.5:** Moving energy gates and moderate collision risk.
- **Outer ring — x2.5:** Faster pickups, moving bumpers, severe wobble consequences.
- **Rim — x4.0:** Temporary greed lane. Remaining here fills an EDGE meter; escaping before
  it expires awards an EDGE SAVE burst.

Patterns are deterministic within a run so route knowledge and execution matter more than
luck.

### 8.5 OVERDRIVE

OVERDRIVE is a deliberate push-your-luck action.

- Immediately increases speed and score rate.
- Temporarily enlarges steering response and wobble gain.
- Costs stability rather than using a separate consumable meter.
- A PERFECT pulse during OVERDRIVE produces a **RESONANCE** bonus and partially refunds
  stability.
- Spamming it without accurate pulses should end the run quickly.

## 9. Scoring and progression

### 9.1 Primary score

The largest HUD element is the run’s **SPIN SCORE**. It never decreases during a run.

```text
scorePerSecond = baseRate × rpmRate × flowMultiplier × zoneMultiplier
```

- `baseRate`: 10 points/second.
- `rpmRate`: 0.5–5.0 based on spin energy.
- `flowMultiplier`: starts at x1.0, rises by accurate chains, and can reach x10.0.
- `zoneMultiplier`: x1.0 / x1.5 / x2.5 / x4.0 by arena band.
- PERFECT chains, pickups, RESONANCE, and EDGE SAVE add discrete bonus bursts.

Exact values live in `TUNE` and are adjusted through playtesting.

### 9.2 FLOW

- PERFECT: significant FLOW gain.
- GOOD: small FLOW gain or maintenance.
- Miss, collision, or prolonged center camping: FLOW decay.
- A recovery SAVE prevents one combo break but does not grant free FLOW.
- FLOW controls score acceleration, music layers, trail density, arena glow, and score-digit
  animation intensity.

### 9.3 The number that always gets bigger

The results screen transfers the run score into **TOTAL SPIN**, a local lifetime number that
never resets unless the player explicitly clears save data. TOTAL SPIN unlocks cosmetic
metal finishes and sound palettes only; it never improves physics or scoring stats.

MVP unlocks:

1. Brushed steel — default.
2. Heat-treated rainbow steel — lifetime milestone 1.
3. Black titanium — lifetime milestone 2.

The run score remains the competitive skill measure. TOTAL SPIN provides long-term
accumulation without weakening the mastery loop.

## 10. Difficulty progression

Difficulty rises by achievement and elapsed run time, not random damage.

- Pulse frequency increases with spin energy.
- Arena gates move faster at higher FLOW.
- Outer-ring openings become shorter over time.
- Center-ring rewards diminish during prolonged safe play.
- Every 30 seconds begins a readable pattern phase: Sweep, Gates, Orbit, then Remix.
- Difficulty stops increasing before inputs become unreadable or physically impossible.

## 11. Visual direction

### 11.1 Hero top

- Procedural `LatheGeometry` built from a measured 2D silhouette matching the reference:
  narrow rounded upper tip, concave widening body, broad disc, mirrored taper, needle-like
  bottom contact point.
- Brushed anisotropic steel material with subtle radial machining lines.
- Clear contact shadow and a tight specular highlight that reveals rotation.
- Rotation blur and trails are additive effects; the base mesh remains readable.
- Wobble is shown through whole-object tilt and precession, never per-instance material
  mutation.

### 11.2 Arena

- Dark premium tabletop with concentric inlaid scoring rings.
- High-contrast timing marker and zone borders.
- Minimal background so the silhouette and contact point remain readable on phones.
- Color progression: cool steel at x1 FLOW → cyan → violet → gold/white at maximum FLOW.

### 11.3 Animation and juice budget

- Score digits spring on bonus bursts and smoothly roll upward between bursts.
- PERFECT emits a radial ring, disc glint, and small particle crown.
- Five-hit milestones add a brief time-scale accent to visuals only, not physics.
- EDGE SAVE gets a short camera punch, bass drop, and outward arena wave.
- Crash gets one strong shake, sparks, metallic bounce, and rapid score tally.
- Effects scale down automatically under reduced-motion mode and on sustained low FPS.

## 12. Audio direction

All MVP sound can be procedural WebAudio.

- **Spin bed:** Continuous metallic hum whose pitch and harmonic brightness follow energy.
- **PERFECT:** Tuned bell/ping that climbs through a pentatonic sequence with the chain.
- **GOOD:** Short, softer click that confirms timing without competing with PERFECT.
- **Miss:** Damped low tick plus a subtle stereo wobble cue.
- **Scrape:** Irregular filtered noise whose rate follows precession.
- **OVERDRIVE:** Rising suction sound into a bright transient.
- **EDGE:** Low heartbeat/sub pulse that accelerates near failure.
- **SAVE:** Pitch dive followed by a resolved chime.
- **Crash:** Layered steel clang, bounce, and low impact.
- **Score tally:** Rapid ascending ticks, capped so large runs do not create a long wait.

FLOW progressively introduces percussion and harmony. Muting sound must not affect timing or
scoring. Audio begins only after a user gesture.

## 13. HUD and screens

### In-run HUD

- Large SPIN SCORE centered at the top.
- FLOW multiplier directly beneath it.
- Compact energy/RPM ring around the score or top.
- Wobble warning expressed near the top itself, not as a distant health bar.
- Current zone multiplier near the arena edge.
- PULSE, OVERDRIVE, and pause controls positioned for mobile landscape.

### Results screen

- Final run score.
- Best score and improvement amount.
- Best chain, PERFECT percentage, longest edge duration, and saves.
- Animated transfer into TOTAL SPIN.
- One dominant **SPIN AGAIN** button.

### First-run onboarding

Three interactive prompts, each dismissed by performing the action:

1. “Lean to steer.”
2. “Pulse on the line.”
3. “The edge pays more.”

No modal tutorial pages before first play.

## 14. Technical approach in this repository

### Simulation

- Keep the newly added fixed 60 Hz physics accumulator intact.
- Use Rapier for arena collision, translation, and edge detection.
- Use pure authored math for spin energy, lean, wobble, pulse grading, FLOW, and scoring.
- Render at browser cadence while gameplay advances from fixed-step time.
- Clamp stalls so tab switching never produces a physics explosion or free score.

### File ownership

- `logic.js`: All tuning and pure spin/score/timing math.
- `logic.test.js`: Refresh-rate, grading, score, wobble, and progression tests.
- `scripts/player.js`: Replace the ball presentation with the top controller and visual rig.
- `scripts/director.js`: Run phases, pattern schedule, failure, restart, and results.
- `scripts/audio.js`: Continuous spin bed and event-driven procedural cues.
- `scripts/juice.js`: Rings, sparks, trails, score bursts, and performance scaling.
- `scripts/state.js`: Score, energy, wobble, FLOW, chain, zone, and run statistics.
- `data/level.json`: Arena bounds, rings, gates, bumpers, and spawn content.
- `game_objects/`: Top and arena prefab collision definitions.
- `index.html` / `index.js`: HUD, results, onboarding, and system wiring.

### Persistence

Use namespaced `localStorage` for:

- Best score and run stats.
- TOTAL SPIN.
- Cosmetic unlocks and selected finish.
- Sound and reduced-motion settings.
- Tutorial completion.

No network dependency is required for a complete run.

## 15. MVP scope

The first playable release includes:

- One visually faithful metal top.
- One arena with four scoring bands and four deterministic pattern phases.
- Launch, steer, PULSE, OVERDRIVE, wobble recovery, edge saves, and crash.
- Run score, FLOW, combo statistics, best score, and TOTAL SPIN.
- Three cosmetic finishes.
- Full procedural sound and escalating feedback layers.
- First-run interactive onboarding.
- Pause, sound toggle, fullscreen, reduced-motion mode, restart, and PWA refresh path.
- Touch, WASD, arrow, Space, and E/Shift input support.

## 16. Acceptance criteria

### Feel and gameplay

- A new player can launch and score without instructions beyond the three action prompts.
- The score starts rising within one second of a valid launch.
- Five consecutive PERFECT pulses create an unmistakable audiovisual escalation.
- A skilled outer-ring run scores at least 3× faster than passive center survival.
- Every crash has a visible precursor: low energy, heavy wobble, collision, or edge loss.
- Restart returns to a controllable top in under one second without duplicate listeners.

### Visual and audio

- At the menu camera angle, the hero top clearly matches the reference silhouette.
- Spin direction, wobble direction, shadow, and scrape rhythm agree visually.
- The primary score remains readable at 844×390 and 1280×720.
- Sound layers scale with FLOW and never require sound for timing.
- Reduced-motion mode removes camera shake, heavy trails, and large flashes.

### Technical quality

- Equivalent scripted input produces score and spin-energy results within 2% at simulated
  30, 60, 90, 120, and 144 Hz rendering.
- Unit tests cover pulse boundaries, score rate, energy decay, wobble, FLOW, and zone
  multipliers.
- No horizontal or vertical page scrolling in supported landscape viewports.
- Canvas buffer matches CSS size × device pixel ratio and has no inline size authority.
- Pause freezes physics and score time without banking inputs.
- Initial load, restart, and installed-PWA refresh all leave the game playable.

## 17. Playtest questions

1. Can players explain why a pulse was PERFECT, GOOD, or missed?
2. Does steering while timing pulses feel like satisfying mastery or unwanted multitasking?
3. At what point does outer-ring greed become more attractive than center safety?
4. Can players recover from wobble intentionally after two minutes of play?
5. Does the growing score remain legible and exciting at high FLOW?
6. Is OVERDRIVE perceived as a meaningful decision rather than a cooldown to spam?
7. Does a crash trigger an immediate retry more often than frustration?

## 18. MVP decisions

The implementation ships with these decisions:

- **Working title:** SPINFINITY.
- **Spin direction:** Clockwise by default; mirrored accessibility option can follow later.
- **Presentation:** Premium dark tabletop with neon inlays.
- **Simulation:** Hybrid authored gyroscope feel, not fully emergent rigid-body dynamics.
- **Mode:** Endless score attack with permanent TOTAL SPIN accumulation.
- **MVP content:** One top, one arena, three finishes, no multiplayer.
