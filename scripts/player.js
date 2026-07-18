import { GameObject, THREE } from 'three-game-engine';
import {
  TUNE, applyPulse, gradePulse, moveVector, driveScale, maxSpeedForEnergy,
  pulseFrequency, wrap01, decaySpin, advanceWobble, clamp01,
} from '../logic.js';
import { state } from './state.js';
import { events } from './events.js';

// A controllable precision top. Rapier owns translation/collision while authored spin,
// lean and wobble keep the gyroscope readable, responsive and deterministic.
export default class Player extends GameObject {
  afterLoaded() {
    this.size = TUNE.TOP_RADIUS;
    this.joystick = null;
    this.cameraRig = null;
    this.pulseCooldown = 0;
    this.overdriveCooldown = 0;
    this.saveCooldown = 0;
    this._overdriveHeld = false;
    this._lastHv = 0;
    this._tmpV = new THREE.Vector3();
    this.spinAngle = 0;
    this.precession = 0;
    this.crashTilt = 0;

    this.topRoot = new THREE.Group();
    this.spinner = new THREE.Group();
    this.topRoot.add(this.spinner);
    this.threeJSGroup.add(this.topRoot);

    const total = Number(localStorage.getItem('spinfinity:total') || 0);
    const finish = total >= 250000 ? 0x15171d : total >= 50000 ? 0x93a7ff : 0xd8dce2;
    this.metal = new THREE.MeshPhysicalMaterial({
      color: finish,
      metalness: 0.93,
      roughness: total >= 50000 && total < 250000 ? 0.14 : 0.2,
      clearcoat: 0.72,
      clearcoatRoughness: 0.12,
      emissive: 0x06121b,
      emissiveIntensity: 0.2,
    });

    // A revolved silhouette matching the reference: tall bell, broad machined disc,
    // mirrored lower taper and a fine bottom contact point.
    const profile = [
      [0.012, -0.31], [0.055, -0.285], [0.13, -0.22], [0.24, -0.11],
      [0.39, -0.015], [0.52, 0.018], [0.54, 0.075], [0.49, 0.125],
      [0.34, 0.16], [0.24, 0.235], [0.18, 0.38], [0.145, 0.59],
      [0.105, 0.73], [0.045, 0.79], [0.01, 0.805],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    this.topMesh = new THREE.Mesh(new THREE.LatheGeometry(profile, 72), this.metal);
    this.topMesh.castShadow = true;
    this.spinner.add(this.topMesh);

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(0.505, 0.028, 12, 72),
      new THREE.MeshPhysicalMaterial({ color: 0xf3f6fa, metalness: 1, roughness: 0.13,
        clearcoat: 0.8 })
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.07;
    this.spinner.add(rim);

    // Fine machining bands make rotational speed visible even on a symmetric object.
    const bandMat = new THREE.MeshBasicMaterial({ color: 0xa7f8ff, transparent: true,
      opacity: 0.26, blending: THREE.AdditiveBlending, depthWrite: false });
    for (const [r, y] of [[0.43, 0.126], [0.34, 0.161], [0.2, 0.31]]) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(r, 0.006, 6, 48), bandMat);
      band.rotation.x = Math.PI / 2;
      band.position.y = y;
      this.spinner.add(band);
    }

    this.phaseMarker = new THREE.Mesh(
      new THREE.SphereGeometry(0.052, 16, 10),
      new THREE.MeshStandardMaterial({ color: 0xffd166, emissive: 0xff9f1c, emissiveIntensity: 2.4 })
    );
    this.phaseMarker.position.set(0, 0.13, -0.59);
    this.spinner.add(this.phaseMarker);

    this.strikeMarker = new THREE.Mesh(
      new THREE.BoxGeometry(0.055, 0.065, 0.16),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x66f7ff, emissiveIntensity: 2 })
    );
    this.strikeMarker.position.set(0, 0.13, -0.69);
    this.threeJSGroup.add(this.strikeMarker);

    this.flowRing = new THREE.Mesh(
      new THREE.RingGeometry(0.52, 0.61, 64),
      new THREE.MeshBasicMaterial({ color: 0x35e7ff, transparent: true, opacity: 0.18,
        side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    this.flowRing.rotation.x = -Math.PI / 2;
    this.flowRing.position.y = -0.292;
    this.topRoot.add(this.flowRing);

    this.shadow = new THREE.Mesh(
      new THREE.CircleGeometry(1, 40),
      new THREE.MeshBasicMaterial({ color: 0x01050b, transparent: true, opacity: 0.48,
        depthWrite: false })
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.getScene().threeJSScene.add(this.shadow);

    const body = this.getRapierRigidBody();
    body.setLinearDamping(TUNE.LIN_DAMPING);
    body.setAngularDamping(TUNE.ANG_DAMPING);
    body.lockRotations(true, true);
    this.enableCcd(true);
  }

  getWorldPos() {
    const t = this.getRapierRigidBody().translation();
    return this._tmpV.set(t.x, t.y, t.z);
  }

  velocity() { return this.getRapierRigidBody().linvel(); }

  beforeRender({ deltaTimeInSec: dt }) {
    if (!this.isLoaded() || state.phase === 'boot') return;

    const body = this.getRapierRigidBody();
    const v = body.linvel();
    this.pulseCooldown -= dt;
    this.overdriveCooldown -= dt;
    this.saveCooldown -= dt;

    // The timing marker continues in the menu so the hero object is visibly alive.
    const activeEnergy = state.phase === 'menu' ? 0.72 : state.spinEnergy;
    state.pulsePhase = wrap01(state.pulsePhase + pulseFrequency(activeEnergy) * dt);

    const im = this.getScene().game.inputManager;
    const kb = im.keyboardHandler;
    let { x, z, sprint } = this.joystick ? this.joystick.sample() : { x: 0, z: 0, sprint: false };
    if (x === 0 && z === 0) {
      x = im.readHorizontalAxis()
        || (kb.isKeyDown('arrowright') ? 1 : 0) - (kb.isKeyDown('arrowleft') ? 1 : 0);
      z = -im.readVerticalAxis()
        || (kb.isKeyDown('arrowup') ? 1 : 0) - (kb.isKeyDown('arrowdown') ? 1 : 0);
    }
    const steer = Math.min(1, Math.hypot(x, z));
    const overdriveHeld = !!(sprint || kb.isKeyDown('shift') || kb.isKeyDown('e')
      || state.overdriveRequested);
    const canPlay = (state.phase === 'ready' || state.phase === 'playing') && !state.paused;
    const dir = moveVector(state.camYaw, x, z);
    if (canPlay && (steer || state.pulseRequested || overdriveHeld)) state.everMoved = true;

    if (canPlay) {
      // Movement is a controlled lean translated into a planar impulse. More spin buys
      // speed; low spin remains steerable enough to permit a last-second recovery.
      const speed = Math.hypot(v.x, v.z);
      const maxSpeed = maxSpeedForEnergy(state.spinEnergy) * (state.overdrive > 0 ? 1.18 : 1);
      const force = body.mass() * TUNE.ACCEL * (0.56 + state.spinEnergy * 0.72)
        * driveScale(speed, maxSpeed);
      if (steer) this.applyImpulse({ x: dir.x * force * dt, y: 0, z: dir.z * force * dt }, true);

      if (state.pulseRequested && this.pulseCooldown <= 0) {
        const grade = gradePulse(state.pulsePhase);
        const result = applyPulse({ energy: state.spinEnergy, wobble: state.wobble,
          flow: state.flow, chain: state.chain }, grade, state.overdrive > 0);
        state.spinEnergy = result.energy;
        state.wobble = result.wobble;
        state.flow = result.flow;
        state.chain = result.chain;
        state.lastGrade = grade;
        state.score += result.bonus;
        state.bestChain = Math.max(state.bestChain, state.chain);
        if (grade === 'perfect') state.perfects++;
        else if (grade === 'good') state.goods++;
        else state.misses++;
        this.pulseCooldown = TUNE.PULSE_COOLDOWN;
        events.emit('pulse', { grade, chain: state.chain, bonus: result.bonus,
          overdrive: state.overdrive > 0 });
      }

      if (overdriveHeld && !this._overdriveHeld && this.overdriveCooldown <= 0) {
        state.overdrive = TUNE.OVERDRIVE_DURATION;
        state.spinEnergy = clamp01(state.spinEnergy + TUNE.OVERDRIVE_SPIN_GAIN);
        state.wobble = clamp01(state.wobble + TUNE.OVERDRIVE_WOBBLE);
        state.flow = Math.min(TUNE.FLOW_MAX, state.flow + 0.2);
        this.overdriveCooldown = TUNE.OVERDRIVE_COOLDOWN;
        if (steer) this.applyImpulse({ x: dir.x * body.mass() * TUNE.OVERDRIVE_DV,
          y: 0, z: dir.z * body.mass() * TUNE.OVERDRIVE_DV }, true);
        events.emit('overdrive');
      }
      this._overdriveHeld = overdriveHeld;
      state.overdrive = Math.max(0, state.overdrive - dt);

      const hv = Math.hypot(v.x, v.z);
      const impact = this._lastHv - hv;
      if (this._lastHv > 1.5 && impact > 1.15) {
        state.wobble = clamp01(state.wobble + impact * 0.045);
        state.flow = Math.max(TUNE.FLOW_MIN, state.flow * 0.86);
        state.chain = 0;
        events.emit('bump', { impact });
      }
      this._lastHv = hv;

      const p = body.translation();
      const radius = Math.hypot(p.x, p.z);
      const inwardDot = radius > 0.01 ? dir.x * (-p.x / radius) + dir.z * (-p.z / radius) : 0;
      const recovering = state.wobble > 0.2 && radius > 2.4 && inwardDot > 0.52;
      const previousWobble = state.wobble;
      if (state.phase === 'playing') {
        state.spinEnergy = decaySpin(state.spinEnergy, state.wobble, dt, state.overdrive > 0);
        state.wobble = advanceWobble(state.wobble, {
          energy: state.spinEnergy, steer, recovering, overdrive: state.overdrive > 0,
        }, dt);
      }
      if (previousWobble > 0.62 && state.wobble < 0.5 && recovering && this.saveCooldown <= 0) {
        state.saves++;
        state.score += 850 * state.saves;
        state.flow = Math.min(TUNE.FLOW_MAX, state.flow + 0.55);
        this.saveCooldown = 2;
        events.emit('save', { count: state.saves });
      }
    } else {
      this._overdriveHeld = overdriveHeld;
    }

    state.pulseRequested = false;
    state.overdriveRequested = false;

    if (state.phase === 'lost') {
      state.spinEnergy = Math.max(0, state.spinEnergy - dt * 0.34);
      this.crashTilt = Math.min(1.25, this.crashTilt + dt * 1.8);
    }

    this.updateVisuals(dt, activeEnergy);
    if (this.cameraRig && state.phase !== 'menu') this.cameraRig.update(dt);
  }

  updateVisuals(dt, activeEnergy) {
    const p = this.getWorldPos();
    const energy = state.phase === 'menu' ? activeEnergy : state.spinEnergy;
    this.spinAngle -= dt * (7 + energy * 56);
    this.precession += dt * (1.4 + (1 - energy) * 5.2 + state.wobble * 4);
    this.spinner.rotation.y = this.spinAngle - state.pulsePhase * Math.PI * 2;

    const wobble = state.phase === 'menu' ? 0.035 : state.wobble;
    const tilt = 0.025 + wobble * 0.64 + this.crashTilt;
    this.topRoot.rotation.x = Math.cos(this.precession) * tilt;
    this.topRoot.rotation.z = Math.sin(this.precession) * tilt;

    const flowU = (state.flow - TUNE.FLOW_MIN) / (TUNE.FLOW_MAX - TUNE.FLOW_MIN);
    this.flowRing.material.opacity = state.reducedMotion ? 0.08 : 0.14 + flowU * 0.42;
    this.flowRing.scale.setScalar(1 + Math.sin(this.precession * 1.7) * 0.035 * flowU);
    this.flowRing.material.color.setHSL(0.52 + flowU * 0.12, 0.95, 0.58);
    this.metal.emissiveIntensity = 0.12 + flowU * 0.42 + (state.overdrive > 0 ? 0.5 : 0);
    this.phaseMarker.material.emissiveIntensity = 1.4 + energy * 2.4;

    const pulseD = Math.min(state.pulsePhase, 1 - state.pulsePhase);
    this.strikeMarker.material.emissiveIntensity = pulseD < TUNE.PULSE_PERFECT_WINDOW ? 4.5
      : pulseD < TUNE.PULSE_GOOD_WINDOW ? 2.5 : 0.8;
    this.strikeMarker.material.color.setHex(pulseD < TUNE.PULSE_PERFECT_WINDOW ? 0xfff2a8
      : pulseD < TUNE.PULSE_GOOD_WINDOW ? 0x6ffcff : 0x597487);

    this.shadow.position.set(p.x, 0.012, p.z);
    this.shadow.scale.set(0.44 + wobble * 0.32, 0.44 + wobble * 0.18, 1);
    this.shadow.material.opacity = 0.42 - Math.min(0.18, Math.max(0, p.y - 0.3) * 0.3);
  }
}
