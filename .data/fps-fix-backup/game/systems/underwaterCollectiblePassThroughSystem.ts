import * as THREE from 'three';

const UNDERWATER_COLLECTIBLES = new Set([
  'Lobster',
  'Crab',
  'Starfish',
  'Squid',
  'Oyster',
  'Clam',
  'Mussel',
  'Scallop',
  'Sea Snail',
  'Sea Urchin',
  'Shrimp',
  'Hermit Crab',
]);

export function makeUnderwaterCollectiblesPassThrough(scene: THREE.Scene) {
  scene.traverse((object) => {
    const name = object.name.trim();

    if (UNDERWATER_COLLECTIBLES.has(name)) {
      object.userData.isCollectible = true;
      object.userData.blocksPlayerMovement = false;

      // Keep the object visible and available for interaction.
      object.traverse((child) => {
        child.userData.blocksPlayerMovement = false;
      });
    }
  });
}
