import { TUNE } from '../logic.js';

// Single shared mutable state. Systems import and mutate; restart resets through resetRun().
export const state = {
  phase: 'boot', // boot | menu | ready | playing | lost
  paused: false,
  reducedMotion: false,
  camYaw: 0,
  everMoved: false,
  pulseRequested: false,
  overdriveRequested: false,

  score: 0,
  scoreRate: 0,
  bestScore: 0,
  totalSpin: 0,
  elapsed: 0,
  spinEnergy: TUNE.SPIN_START,
  wobble: 0.08,
  flow: TUNE.FLOW_MIN,
  chain: 0,
  bestChain: 0,
  pulsePhase: 0.36,
  lastGrade: '',
  perfects: 0,
  goods: 0,
  misses: 0,
  gates: 0,
  saves: 0,
  zone: 'CENTER',
  zoneMultiplier: 1,
  overdrive: 0,
  pattern: 'SWEEP',
  crashReason: '',
};

export function resetRun() {
  Object.assign(state, {
    paused: false,
    everMoved: false,
    pulseRequested: false,
    overdriveRequested: false,
    score: 0,
    scoreRate: 0,
    elapsed: 0,
    spinEnergy: TUNE.SPIN_START,
    wobble: 0.08,
    flow: TUNE.FLOW_MIN,
    chain: 0,
    bestChain: 0,
    pulsePhase: 0.36,
    lastGrade: '',
    perfects: 0,
    goods: 0,
    misses: 0,
    gates: 0,
    saves: 0,
    zone: 'CENTER',
    zoneMultiplier: 1,
    overdrive: 0,
    pattern: 'SWEEP',
    crashReason: '',
  });
}
