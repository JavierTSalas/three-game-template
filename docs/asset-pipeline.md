# 3D asset pipeline — the playbook

Everything here was learned converting real asset packs (Unity FBX art, itch.io low-poly
packs, text-to-3D output) into browser-ready GLBs for shipped games. Follow the recipes;
the triage table at the bottom exists because every one of those failures actually happened.

## House rules

- Raw sources live in `assets-src/` (**gitignored** — raw FBX/GLB runs 5–70 MB each).
  Optimized output lives in `models/` (webpack copies it, `noErrorOnMissing`).
- EVERY model passes through the optimizer before it ships:

```bash
npx @gltf-transform/cli optimize assets-src/<name>-raw.glb models/<name>.glb \
  --compress false --texture-compress webp --texture-size 1024
```

- Loader-side safety (write your GLB loader this way): missing/broken model → primitive
  fallback so the game always runs; **skip rigged/skinned GLBs** (a plain `scene.clone(true)`
  breaks skeletons and bounding math); remember clones **share materials** — one-time fixes
  (tint, alpha clamp) are fine, per-instance effects must transform the group, not the material.

## Text-to-3D props (Tripo)

The web app (tripo3d.ai/app, v3 model) beats the API's older model. Per prop: prompt →
Generate → pick the best of 4 → **Retopologize ≈ 3000 faces ("game asset")** → Download GLB →
save the raw to `assets-src/` → run the optimizer one-liner. Fit the result by bounding
sphere to your target radius and rest it on its bounding-box min (snippet below).

## FBX → GLB (headless Blender)

`tools/fbx2glb.py` batches a whole pack in one Blender run:

```bash
"C:/Program Files/Blender Foundation/Blender <ver>/blender.exe" --background \
  --python tools/fbx2glb.py -- manifest.json
```

Manifest: `[{"in": "abs/path.fbx", "out": "abs/path.glb", "atlas": "optional/Texture.png"}, ...]`
(the `atlas` key on the first entry, when present, rewires every material's Base Color to
that texture — see "palette atlas" below). The script also gives zero-material-slot meshes a
material, clamps metallic to 0 / roughness to 0.8, and logs world-space dimensions per model.

**ASCII FBX**: Blender refuses them outright ("ASCII FBX files are not supported"). Convert
those with the npm `fbx2gltf` binary (Autodesk FBX SDK) instead — keep both tools in the belt:

```bash
npx fbx2gltf in.fbx -o out.glb
```

## Reusing scenes/levels from engine projects (e.g. Unity)

- **Level built in code**: find the builder function (e.g. a `BuildTerrain()` listing name /
  position / yaw / size per prop) and transcribe the placements into your level data. That's
  the whole port — your spawner replays it.
- **Level built as a prefab**: prefab YAML references meshes by `guid:`. Resolve each guid by
  grepping `Assets/**/*.meta` for it → that `.meta`'s path is the asset. Compose parent/child
  transforms to world space (nested prefab instances stack), and carry per-instance scale
  into your level data.
- **Materials do NOT live in the FBX** in engine projects — they're engine-side files (Unity
  `.mat`). FBX-embedded colors mostly survive; when they don't, extract the reference hex
  from the `.mat` files and flat-tint at load.

## Black-model triage (in order of likelihood)

| Symptom / cause | Fix |
|---|---|
| glTF exported with `metalness: 1` — renders black in three.js without an environment map | clamp at load: `metalness ≤ 0.1`, `roughness ≥ 0.7` |
| Mesh has ZERO material slots (common in low-poly nature props) | append a material at conversion (`tools/fbx2glb.py` does this) |
| Pack uses ONE palette-atlas texture and the FBX texture paths broke in transit | force-rewire every material's Base Color to the atlas (manifest `atlas` key) |
| Atlas rewired but the model is still dark — its UVs sit on dark swatches | flat-tint the kind at load — and when you tint, **null `material.map` too**: color alone multiplies against the dark texture and stays black |
| Tint applied and STILL black, normals/metalness ruled out | time-box it, ship the primitive fallback, keep the GLB for forensics — some FBXs just fight you |
| Renders white instead of black | the FBX had no materials at all; three.js default white — tint it |

## Fit + rest snippet (loader side)

```js
// fit by bounding sphere to a target radius, rest on the ground by bbox min
const box = new THREE.Box3().setFromObject(model);
const sphere = box.getBoundingSphere(new THREE.Sphere());
const s = targetRadius / sphere.radius;
model.scale.setScalar(s);
box.setFromObject(model);            // re-measure after scaling
model.position.y -= box.min.y;       // feet on the floor
// footprint fit variant: s = targetRadius * 2 / Math.max(size.x, size.z)
```
