import { TUNE, clampFrameDelta, consumeFixedSteps } from '../logic.js';

// three-game-engine v0.10 calls Rapier World.step() exactly once per render frame, and
// Rapier's default timestep is 1/60 s. Replace that scene method with an accumulator so
// 30/60/90/120/144 Hz displays all advance the same amount of game time. The wrapper is
// installed per scene because restart() constructs a brand-new Scene and Rapier world.
export function buildFixedPhysics(game) {
  let scene = null;
  let frameDt = 0;
  let accumulator = 0;
  let totalSteps = 0;
  let lastFrameSteps = 0;
  let droppedTime = 0;

  function attach(nextScene) {
    scene = nextScene;
    frameDt = 0;
    accumulator = 0;
    lastFrameSteps = 0;
    if (!scene) return;

    const advanceOnce = scene.advancePhysics.bind(scene);
    const world = scene.getRapierWorld();
    world.timestep = TUNE.PHYSICS_DT;
    scene.advancePhysics = () => {
      const result = consumeFixedSteps(accumulator, frameDt);
      accumulator = result.remainder;
      lastFrameSteps = result.steps;
      droppedTime += result.dropped;
      for (let i = 0; i < result.steps; i++) {
        world.timestep = TUNE.PHYSICS_DT;
        advanceOnce();
      }
      totalSteps += result.steps;
    };
  }

  return {
    beginFrame(rawDt) {
      // Drop the first delta for every scene. The engine reports time since page load on
      // its first frame, and a restart should never inherit the previous world's backlog.
      if (scene !== game.scene) {
        attach(game.scene);
        return 0;
      }
      frameDt = clampFrameDelta(rawDt);
      lastFrameSteps = 0;
      if (Number.isFinite(rawDt) && rawDt > frameDt) droppedTime += rawDt - frameDt;
      return frameDt;
    },
    stats() {
      return {
        step: TUNE.PHYSICS_DT,
        frameDt,
        accumulator,
        lastFrameSteps,
        totalSteps,
        droppedTime,
      };
    },
  };
}
