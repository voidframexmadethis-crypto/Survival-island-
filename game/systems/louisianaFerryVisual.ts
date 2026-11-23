import type { Object3D } from 'three';
import {
  FERRY_DECK_Y,
  LOUISIANA_FERRY_GATE_LIFT_HEIGHT,
  LOUISIANA_FERRY_TARGET_SPEED_MPS,
  type LouisianaFerryVoyageSystem,
} from './louisianaFerryVoyage';

export interface LouisianaFerryVisualRig {
  root: Object3D;
  gate: Object3D;
  wake?: Object3D;
  wakeMaterial?: {
    opacity: number;
    map: { offset: { y: number } } | null;
  } | null;
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
  // A few centimetres of roll and the foam ribbon are what sell a hull that is
  // actually pushing through water rather than sliding across a backdrop.
  rig.root.rotation.z = voyage.boatRoll;
  // The gate slides up inside the stern frame, it is never toggled invisible.
  rig.gate.visible = true;
  rig.gate.position.y =
    FERRY_DECK_Y + voyage.gateLift * LOUISIANA_FERRY_GATE_LIFT_HEIGHT;

  if (rig.wake) {
    const underway = voyage.phase === 'at_sea' || voyage.phase === 'arriving';
    rig.wake.visible = underway;
    if (rig.wakeMaterial) {
      const speed = Math.max(
        0,
        Math.min(1, voyage.speedMps / LOUISIANA_FERRY_TARGET_SPEED_MPS),
      );
      rig.wakeMaterial.opacity = underway ? 0.12 + 0.6 * speed : 0;
      const map = rig.wakeMaterial.map;
      if (map) {
        // Scroll the foam aft at roughly the speed the hull is making.
        map.offset.y = -((voyage.elapsedMs / 1000) * 0.045) % 1;
      }
    }
  }
}
