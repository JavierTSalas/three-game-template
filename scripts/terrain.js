import { GameObject, THREE, RAPIER } from 'three-game-engine';

// The level shell: checkered ground, boundary fence (visible + colliders), sun, sky, fog.
// One theme — retint here (or grow a THEMES table when the second level shows up).
const T = {
  bound: 12, ground: 0x3f5e52, check: 0x36544a, checkOpacity: 0.35,
  sky: 0xbfd9e8, fogNear: 26, fogFar: 80,
  fence: 0x7c8aa0, fenceH: 2.2, sun: 1.4, sunColor: 0xfff3d6,
};

export default class Terrain extends GameObject {
  afterLoaded() {
    const g = this.threeJSGroup; // group is at world y=-0.5 (see scene JSON)
    const B = T.bound;

    // ground — checkered two-tone so motion/scale reads
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(B * 2, B * 2, 16, 16),
      new THREE.MeshStandardMaterial({ color: T.ground, roughness: 1 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0.5; // top of the ground collider (local)
    g.add(ground);
    const check = new THREE.Mesh(
      new THREE.PlaneGeometry(B * 2, B * 2),
      new THREE.MeshBasicMaterial({ color: T.check, transparent: true, opacity: T.checkOpacity, map: checkerTexture() })
    );
    check.rotation.x = -Math.PI / 2;
    check.position.y = 0.505;
    g.add(check);

    // boundary walls: visible + fixed colliders (engine colliders can't be offset within one body → own bodies)
    const world = this.getScene().rapierWorld;
    const fenceMat = new THREE.MeshStandardMaterial({ color: T.fence, roughness: 0.9 });
    const H = T.fenceH, W = 0.15;
    const walls = [
      { x: 0, z: -B, w: B * 2, d: W }, { x: 0, z: B, w: B * 2, d: W },
      { x: -B, z: 0, w: W, d: B * 2 }, { x: B, z: 0, w: W, d: B * 2 },
    ];
    for (const { x, z, w, d } of walls) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, H, d), fenceMat);
      m.position.set(x, 0.5 + H / 2, z);
      g.add(m);
      const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, H / 2, z));
      world.createCollider(RAPIER.ColliderDesc.cuboid(w / 2, H / 2, d / 2).setFriction(0.4), body);
    }

    // sun + sky (scene JSON's fog declared first — valid values dodge the engine's
    // setFog(null) bug; we re-set it here so theme edits live in one file)
    const sun = new THREE.DirectionalLight(T.sunColor, T.sun);
    sun.position.set(8, 14, 6);
    g.add(sun);
    const scene3 = this.getScene().threeJSScene;
    scene3.background = new THREE.Color(T.sky);
    scene3.fog = new THREE.Fog(T.sky, T.fogNear, T.fogFar);
  }
}

function checkerTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++) {
      ctx.fillStyle = (x + y) % 2 ? '#ffffff00' : '#ffffff18';
      ctx.fillRect(x * 32, y * 32, 32, 32);
    }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  return tex;
}
