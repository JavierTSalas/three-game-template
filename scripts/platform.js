import { GameObject, THREE } from 'three-game-engine';

// A hop-able box. The prefab's cuboid collider (game_objects/platform.json) is the physics
// truth; this class only dresses it. Spawned at runtime by Director.startRun via spawnPrefab.
export default class Platform extends GameObject {
  afterLoaded() {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.4, 1.6), // = collider hx/hy/hz × 2
      new THREE.MeshStandardMaterial({ color: 0x4c6d8c, roughness: 0.85 })
    );
    this.threeJSGroup.add(mesh);
  }
}
