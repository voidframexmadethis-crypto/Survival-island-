import type * as THREE from 'three';

const ALWAYS_VISIBLE_KEY = 'alwaysVisibleWorldObject';

/**
 * Some world objects are driven every frame by gameplay code (the Crescent
 * Star hull is the clearest example). They must never be reparented into a
 * distance-culled world chunk, otherwise the mesh the player is standing on
 * disappears as soon as the camera travels away from the chunk it spawned in.
 */
export function markAlwaysVisibleWorldObject<T extends THREE.Object3D>(obj: T): T {
  obj.userData[ALWAYS_VISIBLE_KEY] = true;
  return obj;
}

export function isAlwaysVisibleWorldObject(obj: THREE.Object3D): boolean {
  return obj.userData?.[ALWAYS_VISIBLE_KEY] === true;
}
