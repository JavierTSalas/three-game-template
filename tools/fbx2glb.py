# Headless Blender batch FBX -> GLB.
# Usage: blender --background --python tools/fbx2glb.py -- manifest.json
# Manifest: [{"in": "abs/path.fbx", "out": "abs/path.glb", "atlas": "optional/abs/Texture.png"}, ...]
#   - "atlas" (read from the FIRST entry, applies to the whole batch): many low-poly packs
#     use ONE palette-atlas texture whose FBX paths break in transit — when set, every
#     material's Base Color is force-rewired to it.
#   - Meshes with ZERO material slots render black in three.js; they get a material here.
#   - Metallic is clamped to 0 / roughness 0.8 (metalness=1 renders black without an env map).
#   - ASCII FBX? Blender refuses those — use `npx fbx2gltf` instead (see docs/asset-pipeline.md).
import bpy, json, sys, os

argv = sys.argv[sys.argv.index("--") + 1:]
manifest_path = argv[0]
with open(manifest_path) as f:
    manifest = json.load(f)
ATLAS = manifest[0].get("atlas")

for job in manifest:
    if "in" not in job:
        continue
    bpy.ops.wm.read_factory_settings(use_empty=True)
    try:
        bpy.ops.import_scene.fbx(filepath=job["in"])
    except Exception as e:
        print(f"FAIL import {job['in']}: {e}")
        continue

    atlas_img = bpy.data.images.load(ATLAS) if ATLAS else None

    # zero-material-slot meshes -> bare material (rewired to the atlas below, if any)
    for ob in bpy.data.objects:
        if ob.type == "MESH" and len(ob.data.materials) == 0:
            ob.data.materials.append(bpy.data.materials.new(name="AtlasAuto"))

    for mat in bpy.data.materials:
        if not mat.use_nodes:
            continue
        nt = mat.node_tree
        principled = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
        if principled is None:
            continue
        if atlas_img is not None:
            tex = nt.nodes.new("ShaderNodeTexImage")
            tex.image = atlas_img
            nt.links.new(tex.outputs["Color"], principled.inputs["Base Color"])
        principled.inputs["Metallic"].default_value = 0.0
        principled.inputs["Roughness"].default_value = 0.8

    # log world-space bounds (handy for catalog/level sizing tables)
    import mathutils
    mins = [1e9] * 3; maxs = [-1e9] * 3
    nverts = 0
    for ob in bpy.data.objects:
        if ob.type != "MESH":
            continue
        nverts += len(ob.data.vertices)
        for c in ob.bound_box:
            w = ob.matrix_world @ mathutils.Vector(c)
            for i in range(3):
                mins[i] = min(mins[i], w[i]); maxs[i] = max(maxs[i], w[i])
    dims = [round(maxs[i] - mins[i], 2) for i in range(3)]

    os.makedirs(os.path.dirname(job["out"]), exist_ok=True)
    try:
        bpy.ops.export_scene.gltf(filepath=job["out"], export_format="GLB")
        print(f"OK {os.path.basename(job['in'])} -> {os.path.basename(job['out'])} dims={dims} verts={nverts}")
    except Exception as e:
        print(f"FAIL export {job['out']}: {e}")
