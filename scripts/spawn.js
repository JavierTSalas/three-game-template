// Runtime spawning, the correct way — in ONE place because it stacks TWO engine gotchas
// (v0.10):
//   1. scene.active is never set true, so addGameObject never auto-loads runtime spawns —
//      every runtime spawn MUST drive the load → afterLoaded chain itself or it silently
//      never appears.
//   2. registerGameObjectClasses only applies when the ENGINE instantiates from scene
//      JSON. A runtime `new GameObject(...)` bypasses the registry — your subclass's
//      afterLoaded (meshes, behavior) never runs. Pass the class in and we `new` it.
export function spawnPrefab(game, Cls, { type, name, position, ...rest }) {
  const obj = new Cls(game.scene, { type, name, position, ...rest });
  obj.load().then(() => obj.afterLoaded());
  return obj;
}
