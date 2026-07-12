import { GameObject } from 'three-game-engine';

// Runtime spawning, the correct way — in ONE place because it's the engine's nastiest
// gotcha (v0.10): scene.active is never set true, so addGameObject never auto-loads
// runtime spawns. Every object created after scene load MUST drive the
// load → afterLoaded chain itself or it silently never appears.
export function spawnPrefab(game, type, name, position, options = {}) {
  const obj = new GameObject(game.scene, { type, name, position, ...options });
  obj.load().then(() => obj.afterLoaded());
  return obj;
}
