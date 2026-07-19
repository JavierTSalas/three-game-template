import { GameObject, THREE } from 'three-game-engine';
import { TUNE, driveScale, moveVector } from '../logic.js';
import { state } from './state.js';
import { events } from './events.js';

// The guy: a rolling ball with eyes. Per-frame impulse drive (NEVER rapier addForce —
// it accumulates every frame until resetForces), hop, dash burst, squash spring,
// blob shadow. Fixed size TUNE.PLAYER_R; the collider comes from game_objects/player.json.
export default class Player extends GameObject {
  afterLoaded() {
    this.size = TUNE.PLAYER_R;
    this.hopCooldown = 0;
    this.dashCooldown = 0;
    this.joystick = null;   // injected by index.js (wire)
    this.cameraRig = null;  // injected by index.js (wire)
    this._tmpV = new THREE.Vector3();

    // visuals — unit sphere scaled by size × squash each frame; eyes ride the mesh and
    // tumble with the roll (that's the guy)
    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(1, 48, 32),
      new THREE.MeshStandardMaterial({ color: 0x22c4a8, roughness: 0.35 })
    );
    for (const s of [-0.36, 0.36]) {
      const white = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }));
      white.position.set(s, 0.35, 0.86);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8),
        new THREE.MeshStandardMaterial({ color: 0x101623, roughness: 0.4 }));
      pupil.position.set(0, 0, 0.18);
      white.add(pupil);
      this.mesh.add(white);
    }
    this.threeJSGroup.add(this.mesh);
    this.squash = 1; // 1 = round; <1 squashed; >1 stretched
    this._lastVy = 0;

    // blob shadow lives in the scene root (the group tumbles with the ball)
    this.shadow = new THREE.Mesh(
      new THREE.CircleGeometry(1, 24),
      new THREE.MeshBasicMaterial({ color: 0x0b1018, transparent: true, opacity: 0.35, depthWrite: false })
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.getScene().threeJSScene.add(this.shadow);

    // physics feel
    const body = this.getRapierRigidBody();
    body.setLinearDamping(TUNE.LIN_DAMPING);
    body.setAngularDamping(TUNE.ANG_DAMPING);
    this.enableCcd(true);
    this.mesh.scale.setScalar(this.size);
  }

  getWorldPos() {
    const t = this.getRapierRigidBody().translation();
    return this._tmpV.set(t.x, t.y, t.z); // REUSED vector — copy scalars before iterating
  }

  velocity() { return this.getRapierRigidBody().linvel(); }

  beforeRender({ deltaTimeInSec: dt }) {
    if (!this.isLoaded() || state.phase === 'boot' || state.phase === 'menu' || state.phase === 'intro') return; // menu/intro: cutscene owns the camera
    const body = this.getRapierRigidBody();
    const v = body.linvel();

    // --- input (touch joystick first, engine keyboard/gamepad fallback)
    const im = this.getScene().game.inputManager;
    const kb = im.keyboardHandler; // stores event.key LOWERCASED — query it lowercase only
    let { x, z, sprint } = this.joystick ? this.joystick.sample() : { x: 0, z: 0 };
    if (x === 0 && z === 0) {
      // engine bug: InputManager checks isKeyDown('ArrowUp') etc. against the lowercase
      // store — arrows never match, so read them ourselves as fallback
      x = im.readHorizontalAxis()
        || (kb.isKeyDown('arrowright') ? 1 : 0) - (kb.isKeyDown('arrowleft') ? 1 : 0);
      z = -im.readVerticalAxis() // engine convention: forward = -1
        || (kb.isKeyDown('arrowup') ? 1 : 0) - (kb.isKeyDown('arrowdown') ? 1 : 0);
      if (x || z) state.everMoved = true;
    }
    const dashHeld = !!(sprint || kb.isKeyDown('shift') || kb.isKeyDown('e') || state.dashRequested);

    // --- drive (skip while paused; impulses on a physics-frozen world bank up and
    // release as a kick on resume)
    if ((state.phase === 'ready' || state.phase === 'playing') && !state.paused) {
      const dir = moveVector(state.camYaw, x, z);
      const speed = Math.hypot(v.x, v.z);
      // per-frame impulse (= force·dt): rapier's addForce is persistent/accumulating — avoid it
      const f = body.mass() * TUNE.ACCEL * driveScale(speed, TUNE.MAX_SPEED);
      if (dir.x || dir.z) this.applyImpulse({ x: dir.x * f * dt, y: 0, z: dir.z * f * dt }, true);

      // dash: one strong Δv on press-edge, then a cooldown
      this.dashCooldown -= dt;
      if (dashHeld && !this._dashHeld && this.dashCooldown <= 0 && (dir.x || dir.z)) {
        this.applyImpulse({ x: dir.x * body.mass() * TUNE.DASH_DV, y: 0, z: dir.z * body.mass() * TUNE.DASH_DV }, true);
        this.dashCooldown = TUNE.DASH_COOLDOWN;
        this.squash = 1.32; // stretch into the burst
        events.emit('dash');
      }
      this._dashHeld = dashHeld;

      // bump detection: sudden horizontal deceleration while driving
      const hv = Math.hypot(v.x, v.z);
      if (this._lastHv !== undefined && (x || z)) {
        const drop = this._lastHv - hv;
        if (drop > 2.5) { this.squash = 0.72; events.emit('bump', { impact: drop }); }
      }
      this._lastHv = hv;

      // hop
      this.hopCooldown -= dt;
      const grounded = Math.abs(v.y) < 0.12;
      if (state.hopRequested && grounded && this.hopCooldown <= 0) {
        this.applyImpulse({ x: 0, y: body.mass() * TUNE.HOP_DV, z: 0 }, true);
        this.hopCooldown = TUNE.HOP_COOLDOWN;
        this.squash = 1.35; // stretch on launch
        events.emit('hop');
      }
    }
    state.hopRequested = false;
    state.dashRequested = false;

    // --- shadow
    const p = this.getWorldPos();
    this.shadow.position.set(p.x, 0.02, p.z);
    const h = Math.max(0, p.y - this.size);
    this.shadow.scale.setScalar(this.size * Math.max(0.4, 1 - h * 0.3));
    this.shadow.material.opacity = 0.35 * Math.max(0.25, 1 - h * 0.4);

    // --- squash & stretch spring
    if (this._lastVy < -2.5 && Math.abs(v.y) < 0.2) this.squash = 0.7; // landing splat
    this._lastVy = v.y;
    this.squash += (1 - this.squash) * Math.min(1, dt * 8); // spring back to round
    const sq = this.squash;
    this.mesh.scale.set(this.size / Math.sqrt(sq), this.size * sq, this.size / Math.sqrt(sq));

    // --- camera updates after physics sync
    if (this.cameraRig) this.cameraRig.update(dt);
  }
}
