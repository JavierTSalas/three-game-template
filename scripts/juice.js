import { THREE } from 'three-game-engine';

// Cartoon low-poly look: swap lit materials for MeshToonMaterial with a chunky 3-step
// gradient. Cached per source material (GLB clones SHARE materials — one toon per source,
// reused everywhere). Basic/custom materials are skipped.
let _grad = null;
function toonGradient() {
  if (_grad) return _grad;
  _grad = new THREE.DataTexture(new Uint8Array([90, 160, 255]), 3, 1, THREE.RedFormat);
  _grad.minFilter = _grad.magFilter = THREE.NearestFilter;
  _grad.needsUpdate = true;
  return _grad;
}
const _toonCache = new Map(); // source material uuid → toon material
export function toonify(root) {
  root.traverse(o => {
    if (!o.isMesh || !o.material) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const out = mats.map(m => {
      if (!m || m.isMeshToonMaterial || m.userData.uniforms) return m; // done / custom shader
      if (!(m.isMeshStandardMaterial || m.isMeshLambertMaterial || m.isMeshPhongMaterial)) return m;
      let toon = _toonCache.get(m.uuid);
      if (!toon) {
        toon = new THREE.MeshToonMaterial({
          color: m.color?.clone?.() ?? 0xffffff,
          map: m.map ?? null,
          gradientMap: toonGradient(),
          transparent: m.transparent,
          opacity: m.opacity,
          side: m.side,
          depthWrite: m.depthWrite,
          vertexColors: m.vertexColors,
        });
        _toonCache.set(m.uuid, toon);
      }
      return toon;
    });
    o.material = Array.isArray(o.material) ? out : out[0];
  });
}

// Particle pool: one InstancedBuffer points cloud, ring-allocated. pop() where things happen.
const P_N = 256;
export function buildParticles(scene3) {
  const geo = new THREE.BufferGeometry();
  const posArr = new Float32Array(P_N * 3);
  const colArr = new Float32Array(P_N * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('color', new THREE.BufferAttribute(colArr, 3).setUsage(THREE.DynamicDrawUsage));
  const mat = new THREE.PointsMaterial({ size: 0.09, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  scene3.add(pts);

  const vel = new Float32Array(P_N * 3);
  const life = new Float32Array(P_N);
  let head = 0;
  for (let i = 0; i < P_N; i++) posArr[i * 3 + 1] = -50; // park offscreen

  const col = new THREE.Color();
  return {
    pop(p, colorHex, n = 12) {
      col.set(colorHex);
      for (let k = 0; k < n; k++) {
        const i = head; head = (head + 1) % P_N;
        life[i] = 0.5 + Math.random() * 0.2;
        posArr[i * 3] = p.x; posArr[i * 3 + 1] = p.y; posArr[i * 3 + 2] = p.z;
        const a = Math.random() * Math.PI * 2, up = 1.5 + Math.random() * 2;
        vel[i * 3] = Math.cos(a) * (0.5 + Math.random());
        vel[i * 3 + 1] = up;
        vel[i * 3 + 2] = Math.sin(a) * (0.5 + Math.random());
        colArr[i * 3] = col.r; colArr[i * 3 + 1] = col.g; colArr[i * 3 + 2] = col.b;
      }
    },
    update(dt) {
      for (let i = 0; i < P_N; i++) {
        if (life[i] <= 0) continue;
        life[i] -= dt;
        vel[i * 3 + 1] -= 6 * dt; // gravity
        posArr[i * 3] += vel[i * 3] * dt;
        posArr[i * 3 + 1] += vel[i * 3 + 1] * dt;
        posArr[i * 3 + 2] += vel[i * 3 + 2] * dt;
        if (life[i] <= 0) posArr[i * 3 + 1] = -50;
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
    },
  };
}
