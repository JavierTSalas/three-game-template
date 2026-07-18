import { GameObject, THREE } from 'three-game-engine';
import { TUNE } from '../logic.js';

const T = {
  radius: TUNE.ARENA_RADIUS,
  sky: 0x02050d,
  fogNear: 18,
  fogFar: 48,
  steel: 0x101a28,
  side: 0x050910,
};

export default class Terrain extends GameObject {
  afterLoaded() {
    const g = this.threeJSGroup;
    const R = T.radius;

    const arena = new THREE.Mesh(
      new THREE.CylinderGeometry(R, R + 0.28, 0.9, 96),
      new THREE.MeshPhysicalMaterial({ color: T.steel, metalness: 0.72, roughness: 0.34,
        clearcoat: 0.36, clearcoatRoughness: 0.25 })
    );
    arena.receiveShadow = true;
    g.add(arena);

    const side = new THREE.Mesh(
      new THREE.CylinderGeometry(R + 0.04, R + 0.34, 0.82, 96, 1, true),
      new THREE.MeshStandardMaterial({ color: T.side, metalness: 0.8, roughness: 0.42,
        side: THREE.DoubleSide })
    );
    side.position.y = -0.08;
    g.add(side);

    const ringData = [
      [0.3, 3.35, 0x183d52, 0.34],
      [3.48, 6.35, 0x0f5263, 0.28],
      [6.48, 8.75, 0x2d2867, 0.3],
      [8.88, R - 0.08, 0x69214c, 0.42],
    ];
    for (const [inner, outer, color, opacity] of ringData) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(inner, outer, 96),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity,
          side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.458;
      g.add(ring);
    }

    // Thin inlays define risk bands and read cleanly on a phone.
    for (const [r, color] of [[3.4, 0x2ed9ff], [6.4, 0x4bf5c5], [8.8, 0xb884ff], [10.43, 0xff4f9a]]) {
      const inlay = new THREE.Mesh(
        new THREE.TorusGeometry(r, r === 10.43 ? 0.055 : 0.018, 8, 128),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: r === 10.43 ? 0.9 : 0.54,
          blending: THREE.AdditiveBlending, depthWrite: false })
      );
      inlay.rotation.x = Math.PI / 2;
      inlay.position.y = 0.47;
      g.add(inlay);
    }

    const linePositions = [];
    for (let i = 0; i < 24; i++) {
      const a = i / 24 * Math.PI * 2;
      linePositions.push(Math.cos(a) * 0.6, 0.466, Math.sin(a) * 0.6,
        Math.cos(a) * (R - 0.22), 0.466, Math.sin(a) * (R - 0.22));
    }
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    g.add(new THREE.LineSegments(lineGeo,
      new THREE.LineBasicMaterial({ color: 0x87b8cc, transparent: true, opacity: 0.09 })));

    const center = new THREE.Mesh(
      new THREE.CircleGeometry(1.2, 64),
      new THREE.MeshBasicMaterial({ color: 0x58e8ff, transparent: true, opacity: 0.11,
        blending: THREE.AdditiveBlending, depthWrite: false })
    );
    center.rotation.x = -Math.PI / 2;
    center.position.y = 0.471;
    g.add(center);

    const hemi = new THREE.HemisphereLight(0x9edaff, 0x07080d, 1.7);
    g.add(hemi);
    const key = new THREE.DirectionalLight(0xffffff, 3.1);
    key.position.set(5, 12, 7);
    g.add(key);
    const cyan = new THREE.PointLight(0x28dcff, 18, 16, 2);
    cyan.position.set(-5, 4, -3);
    g.add(cyan);
    const magenta = new THREE.PointLight(0xff3da4, 14, 15, 2);
    magenta.position.set(6, 3, 4);
    g.add(magenta);

    const scene3 = this.getScene().threeJSScene;
    scene3.background = new THREE.Color(T.sky);
    scene3.fog = new THREE.Fog(T.sky, T.fogNear, T.fogFar);
  }
}
