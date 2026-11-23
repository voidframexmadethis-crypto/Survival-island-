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
  fuelTankFill?: Object3D;
  fuelTankGaugeMat?: { color: { setHex: (hex: number) => void }; emissive: { setHex: (hex: number) => void }; emissiveIntensity: number } | null;
  fuelTankFillMat?: { color: { setHex: (hex: number) => void }; emissive: { setHex: (hex: number) => void }; emissiveIntensity: number } | null;
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

  if (rig.fuelTankFill) {
    const fraction = Math.max(0, Math.min(1, voyage.fuelPercent / 100));
    rig.fuelTankFill.scale.y = Math.max(0.015, fraction);
    rig.fuelTankFill.visible = fraction > 0.002;
    // Filled from the bottom of the sight glass, so the column visibly drops
    // as the engines burn the stern tank down.
    const color = fraction <= 0.25 ? 0xef4444 : fraction <= 0.5 ? 0xf59e0b : 0x84cc16;
    const glow = fraction <= 0.25 ? 0x991b1b : fraction <= 0.5 ? 0x92400e : 0x4d7c0f;
    if (rig.fuelTankFillMat) {
      rig.fuelTankFillMat.color.setHex(color);
      rig.fuelTankFillMat.emissive.setHex(glow);
      rig.fuelTankFillMat.emissiveIntensity = fraction <= 0.25 ? 0.9 : 0.45;
    }
    if (rig.fuelTankGaugeMat) {
      rig.fuelTankGaugeMat.color.setHex(color);
      rig.fuelTankGaugeMat.emissive.setHex(glow);
      rig.fuelTankGaugeMat.emissiveIntensity = fraction <= 0.25 ? 1.6 : 0.9;
    }
  }
}
