import type { Object3D } from 'three';
import {
  FERRY_DECK_Y,
  LOUISIANA_FERRY_GATE_LIFT_HEIGHT,
  type LouisianaFerryVoyageSystem,
} from './louisianaFerryVoyage';

export interface LouisianaFerryVisualRig {
  root: Object3D;
  gate: Object3D;
}

/**
 * Copies the simulation state onto the actual Three.js objects. The game
 * engine calls this every simulation step and the voyage tests use the same
 * function, so the tested path is the rendered path.
 */
export function applyLouisianaFerryVisual(
  rig: LouisianaFerryVisualRig,
  voyage: LouisianaFerryVoyageSystem,
): void {
  rig.root.position.set(voyage.boatX, voyage.boatY, voyage.boatZ);
  rig.root.rotation.y = voyage.boatYaw;
  // The gate slides up inside the stern frame, it is never toggled invisible.
  rig.gate.visible = true;
  rig.gate.position.y =
    FERRY_DECK_Y + voyage.gateLift * LOUISIANA_FERRY_GATE_LIFT_HEIGHT;
}
