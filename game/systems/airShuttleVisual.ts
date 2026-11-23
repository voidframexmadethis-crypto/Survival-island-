import type { Object3D } from 'three';
import type { AirShuttleVoyageSystem } from './crescentCityAirShuttle';

export interface AirShuttleVisualRig {
  root: Object3D;
  /** Gull-wing door pivot: 0 closed, negative radians lifted open. */
  door: Object3D;
  propellers: Object3D[];
  engineGlowMat: { emissiveIntensity: number } | null;
  beaconMat: { emissiveIntensity: number } | null;
  maid?: Object3D | null;
  maids?: Object3D[] | null;
  stairs?: Object3D | null;
  landingGear?: Object3D | null;
  cabinTvMat?: { emissiveIntensity: number } | null;
}

/**
 * Copies the flight state onto the rendered aircraft. The engine and the
 * integration test both call this, so the plane the player sees is the plane
 * the state machine is simulating.
 */
export function applyAirShuttleVisual(
  rig: AirShuttleVisualRig,
  shuttle: AirShuttleVoyageSystem,
  dt: number,
): void {
  rig.root.position.set(shuttle.planeX, shuttle.planeY, shuttle.planeZ);
  rig.root.rotation.y = shuttle.planeYaw;
  rig.root.rotation.x = shuttle.planePitch;
  rig.root.rotation.z = shuttle.planeRoll;

  rig.door.rotation.z = -1.35 * shuttle.doorOpen;

  for (const propeller of rig.propellers) {
    if (shuttle.engineOn) {
      propeller.rotation.z += dt * 34;
    }
  }
  if (rig.engineGlowMat) {
    rig.engineGlowMat.emissiveIntensity = shuttle.engineOn ? 1.8 : 0.15;
  }
  if (rig.beaconMat) {
    const pulse = 0.7 + Math.sin(shuttle.elapsedMs / 260) * 0.5;
    rig.beaconMat.emissiveIntensity = pulse;
  }
  const maids = rig.maids ?? (rig.maid ? [rig.maid] : []);
  for (let i = 0; i < maids.length; i++) {
    maids[i].rotation.y =
      (i === 0 ? 0 : Math.PI) + Math.sin(shuttle.elapsedMs / (1400 + i * 260) + i) * 0.06;
  }
  if (rig.stairs) {
    rig.stairs.rotation.z = -1.15 * (1 - shuttle.doorOpen);
    rig.stairs.position.y = 2.02 - 0.55 * (1 - shuttle.doorOpen);
  }
  if (rig.landingGear) {
    rig.landingGear.visible = shuttle.altitudeM < 4;
    rig.landingGear.scale.y = shuttle.altitudeM < 4 ? 1 : 0.2;
  }
  if (rig.cabinTvMat) {
    // The cabin TV is live for the whole flight: a soft scan-pulse keeps the
    // screen reading as powered even while the camera is in the cockpit.
    rig.cabinTvMat.emissiveIntensity = 0.85 + Math.sin(shuttle.elapsedMs / 320) * 0.25;
  }
}
