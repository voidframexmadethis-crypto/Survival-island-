import * as THREE from 'three';
import {
  FERRY_CALL_POS,
  FERRY_DOCK_BOAT_POS,
  FERRY_DOCK_CAR_STOP,
} from '../systems/ferryPickup';
import { getTerrainHeight } from './terrain';

export interface IslandFerryDockHandles {
  dockGroup: THREE.Group;
  callGroup: THREE.Group;
  callPos: THREE.Vector3;
  carStopPos: THREE.Vector3;
  boatPos: THREE.Vector3;
  colliders: { x: number; z: number; radius: number }[];
}

/**
 * Island ferry pier at the south landing plus the call box beside the hilltop
 * shelter. Static, low-poly geometry: the dock is the destination of the
 * scripted worker drive and the call box is the physical pickup interaction.
 */
export function buildIslandFerryDock(): IslandFerryDockHandles {
  const dockGroup = new THREE.Group();
  dockGroup.name = 'island-ferry-pier';

  const callGroup = new THREE.Group();
  callGroup.name = 'ferry-call-box';

  const timberMat = new THREE.MeshStandardMaterial({ color: 0x6b4f35, roughness: 0.92 });
  const darkTimberMat = new THREE.MeshStandardMaterial({ color: 0x3f2d1e, roughness: 0.95 });
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.46,
    metalness: 0.58,
  });
  const hullMat = new THREE.MeshStandardMaterial({ color: 0x184e4a, roughness: 0.62 });
  const hullStripeMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.58 });
  const cabinMat = new THREE.MeshStandardMaterial({ color: 0xe7e5e4, roughness: 0.72 });
  const windowMat = new THREE.MeshStandardMaterial({
    color: 0x172554,
    emissive: 0x0ea5e9,
    emissiveIntensity: 0.28,
    roughness: 0.24,
    metalness: 0.36,
  });
  const lifeRingMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.68 });
  const callBlueMat = new THREE.MeshStandardMaterial({
    color: 0x0c4a6e,
    emissive: 0x0ea5e9,
    emissiveIntensity: 0.42,
    roughness: 0.5,
  });
  const callFaceMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    emissive: 0x7dd3fc,
    emissiveIntensity: 0.25,
    roughness: 0.38,
  });
  const buttonMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.9,
    roughness: 0.32,
  });

  // ---- Pier ramp and deck ------------------------------------------------
  const rampStartZ = 660;
  const rampEndZ = FERRY_DOCK_CAR_STOP.z;
  const rampLength = rampEndZ - rampStartZ;
  const ramp = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.2, rampLength), timberMat);
  ramp.position.set(FERRY_DOCK_CAR_STOP.x, 1.05, rampStartZ + rampLength * 0.5);
  ramp.rotation.x = -0.045;
  ramp.receiveShadow = true;
  dockGroup.add(ramp);

  const deck = new THREE.Mesh(new THREE.BoxGeometry(13.5, 0.28, 17.5), timberMat);
  deck.position.set(FERRY_DOCK_CAR_STOP.x, 0.66, 682.5);
  deck.receiveShadow = true;
  dockGroup.add(deck);

  // Plank seams give the low-poly deck a readable scale from the chase camera.
  for (let i = 0; i < 9; i++) {
    const seam = new THREE.Mesh(new THREE.BoxGeometry(13.55, 0.025, 0.075), darkTimberMat);
    seam.position.set(FERRY_DOCK_CAR_STOP.x, 0.81, 674.4 + i * 1.9);
    dockGroup.add(seam);
  }

  // Railings along both sides of the pier.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 7; i++) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.2, 6), steelMat);
      post.position.set(FERRY_DOCK_CAR_STOP.x + side * 6.35, 1.32, 676 + i * 2.5);
      post.castShadow = true;
      dockGroup.add(post);
    }
    const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 15.6), steelMat);
    topRail.position.set(FERRY_DOCK_CAR_STOP.x + side * 6.35, 1.92, 683.2);
    dockGroup.add(topRail);
    const midRail = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.065, 15.6), steelMat);
    midRail.position.set(FERRY_DOCK_CAR_STOP.x + side * 6.35, 1.35, 683.2);
    dockGroup.add(midRail);
  }

  // Pilings disappear into the surf under the deck.
  for (const px of [-5.4, 5.4]) {
    for (let i = 0; i < 6; i++) {
      const piling = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 4.8, 7), darkTimberMat);
      piling.position.set(FERRY_DOCK_CAR_STOP.x + px, -1.2, 676 + i * 2.8);
      dockGroup.add(piling);
    }
  }

  // Bollards at the ferry edge.
  for (const bx of [-5.2, -2.6, 2.6, 5.2]) {
    const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.24, 0.6, 8), steelMat);
    bollard.position.set(FERRY_DOCK_CAR_STOP.x + bx, 1.05, 691.2);
    dockGroup.add(bollard);
  }

  // ---- Moored island ferry ------------------------------------------------
  const boat = new THREE.Group();
  boat.position.set(FERRY_DOCK_BOAT_POS.x, 0.18, FERRY_DOCK_BOAT_POS.z);

  const hull = new THREE.Mesh(new THREE.BoxGeometry(7.4, 1.7, 19), hullMat);
  hull.position.y = 0.62;
  hull.castShadow = true;
  hull.receiveShadow = true;
  boat.add(hull);

  const waterlineStripe = new THREE.Mesh(new THREE.BoxGeometry(7.48, 0.22, 19.08), hullStripeMat);
  waterlineStripe.position.y = 0.98;
  boat.add(waterlineStripe);

  const bow = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 3.7, 4.8, 4, 1, false), hullMat);
  bow.rotation.x = Math.PI / 2;
  bow.rotation.y = Math.PI / 4;
  bow.position.set(0, 0.6, -10.8);
  boat.add(bow);

  const carDeck = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.18, 14.4), darkTimberMat);
  carDeck.position.y = 1.55;
  boat.add(carDeck);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(5.8, 2.2, 4.4), cabinMat);
  cabin.position.set(0, 2.72, 4.8);
  cabin.castShadow = true;
  boat.add(cabin);

  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const window = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.72, 0.92), windowMat);
      window.position.set(side * 2.92, 2.82, 3.55 + i * 1.12);
      boat.add(window);
    }
  }
  const frontWindow = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.75, 0.08), windowMat);
  frontWindow.position.set(0, 2.82, 2.58);
  boat.add(frontWindow);

  const funnel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 1.7, 10), hullStripeMat);
  funnel.position.set(0, 4.4, 5.15);
  boat.add(funnel);
  const funnelCap = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.42, 0.18, 10), steelMat);
  funnelCap.position.set(0, 5.25, 5.15);
  boat.add(funnelCap);

  // Guard rails around the vehicle deck.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 8; i++) {
      const railPost = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.9, 5), steelMat);
      railPost.position.set(side * 3.45, 2.05, -7.6 + i * 2.1);
      boat.add(railPost);
    }
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 15.2), steelMat);
    rail.position.set(side * 3.45, 2.46, -0.1);
    boat.add(rail);
  }

  for (const side of [-1, 1]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.12, 8, 14), lifeRingMat);
    ring.position.set(side * 3.78, 1.9, -4.6);
    ring.rotation.y = Math.PI / 2;
    boat.add(ring);
  }

  // Fold-down vehicle ramp from the pier onto the ferry deck.
  const ferryRamp = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.16, 4.8), steelMat);
  ferryRamp.position.set(0, 1.18, -8.8);
  ferryRamp.rotation.x = 0.19;
  boat.add(ferryRamp);

  dockGroup.add(boat);

  // Tall pier light so the landing reads from the beach at night.
  const lightPole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 6.2, 7), steelMat);
  lightPole.position.set(FERRY_DOCK_CAR_STOP.x - 6.3, 3.7, 673.8);
  dockGroup.add(lightPole);
  const lampHead = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.24, 0.55), callFaceMat);
  lampHead.position.set(FERRY_DOCK_CAR_STOP.x - 6.3, 6.75, 673.8);
  dockGroup.add(lampHead);

  // ---- Shelter-side ferry call box ---------------------------------------
  const callGroundY = getTerrainHeight(FERRY_CALL_POS.x, FERRY_CALL_POS.z);
  callGroup.position.set(FERRY_CALL_POS.x, callGroundY, FERRY_CALL_POS.z);

  const base = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.18, 0.8), callBlueMat);
  base.position.y = 0.09;
  base.receiveShadow = true;
  callGroup.add(base);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.095, 2.25, 8), steelMat);
  pole.position.y = 1.2;
  callGroup.add(pole);
  const cabinet = new THREE.Mesh(new THREE.BoxGeometry(0.78, 1.05, 0.34), callBlueMat);
  cabinet.position.set(0, 1.82, 0);
  cabinet.castShadow = true;
  callGroup.add(cabinet);
  const face = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.62, 0.04), callFaceMat);
  face.position.set(0, 1.9, 0.19);
  callGroup.add(face);
  const button = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.07, 12), buttonMat);
  button.rotation.x = Math.PI / 2;
  button.position.set(0, 1.78, 0.23);
  callGroup.add(button);
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.16, 0.6), callBlueMat);
  hood.position.set(0, 2.42, 0.04);
  hood.rotation.x = -0.15;
  callGroup.add(hood);

  return {
    dockGroup,
    callGroup,
    callPos: new THREE.Vector3(FERRY_CALL_POS.x, callGroundY, FERRY_CALL_POS.z),
    carStopPos: new THREE.Vector3(
      FERRY_DOCK_CAR_STOP.x,
      0.8,
      FERRY_DOCK_CAR_STOP.z,
    ),
    boatPos: new THREE.Vector3(
      FERRY_DOCK_BOAT_POS.x,
      0.18,
      FERRY_DOCK_BOAT_POS.z,
    ),
    colliders: [{ x: FERRY_CALL_POS.x, z: FERRY_CALL_POS.z, radius: 0.55 }],
  };
}
