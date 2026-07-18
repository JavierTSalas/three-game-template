import { GameObject, THREE } from 'three-game-engine';

// Resonance pylon: a deterministic, recyclable score pickup. Its sensor collider is the
// spatial anchor; Director owns collection rules and this class owns the visual lifecycle.
export default class Platform extends GameObject {
  afterLoaded() {
    this.index = this.options.userData?.index ?? 0;
    this.value = this.options.userData?.value ?? 1;
    this.active = true;
    this.cooldown = 0;
    this.pattern = -1;
    this.root = new THREE.Group();
    this.threeJSGroup.add(this.root);

    this.coreMat = new THREE.MeshStandardMaterial({ color: 0x8feaff, emissive: 0x0bc7ff,
      emissiveIntensity: 1.5, metalness: 0.55, roughness: 0.24 });
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.38, 0.12, 24),
      new THREE.MeshStandardMaterial({ color: 0x172638, metalness: 0.8, roughness: 0.28 })
    );
    base.position.y = -0.16;
    this.root.add(base);

    this.core = new THREE.Mesh(new THREE.OctahedronGeometry(0.19, 1), this.coreMat);
    this.core.position.y = 0.08;
    this.root.add(this.core);

    this.ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.34, 0.025, 8, 36),
      new THREE.MeshBasicMaterial({ color: 0x55edff, transparent: true, opacity: 0.8,
        blending: THREE.AdditiveBlending, depthWrite: false })
    );
    this.ring.position.y = 0.08;
    this.ring.rotation.x = Math.PI / 2;
    this.root.add(this.ring);
  }

  collect() {
    if (!this.active) return false;
    this.active = false;
    this.cooldown = 4.2 + (this.index % 4) * 0.45;
    return true;
  }

  setPattern(pattern) {
    if (pattern === this.pattern || !this.coreMat) return;
    this.pattern = pattern;
    const hues = [0.52, 0.12, 0.76, 0.93];
    this.coreMat.color.setHSL(hues[pattern] || hues[0], 0.88, 0.66);
    this.coreMat.emissive.setHSL(hues[pattern] || hues[0], 0.95, 0.38);
    this.ring.material.color.setHSL(hues[pattern] || hues[0], 0.95, 0.62);
  }

  beforeRender({ deltaTimeInSec: dt }) {
    if (!this.isLoaded()) return;
    if (!this.active) {
      this.cooldown -= dt;
      if (this.cooldown <= 0) this.active = true;
    }
    const target = this.active ? 1 : 0.02;
    const k = 1 - Math.exp(-dt * (this.active ? 8 : 16));
    const s = this.root.scale.x + (target - this.root.scale.x) * k;
    this.root.scale.setScalar(s);
    const t = performance.now() * 0.001;
    this.core.rotation.y += dt * (1.8 + this.value * 0.5);
    this.core.position.y = 0.08 + Math.sin(t * 3 + this.index) * 0.045;
    this.ring.rotation.z += dt * 1.7;
    this.coreMat.emissiveIntensity = 1.2 + Math.sin(t * 4 + this.index) * 0.45;
  }
}
