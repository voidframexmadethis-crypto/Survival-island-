import * as THREE from 'three';
import {
  FERRY_CALL_POS,
  FERRY_DOCK_CAR_STOP,
} from '../systems/ferryPickup';
import { getTerrainHeight } from './terrain';

export interface IslandFerryDockHandles {
  dockGroup: THREE.Group;
  callGroup: THREE.Group;
  callPos: THREE.Vector3;
  carStopPos: THREE.Vector3;
  boatPos: THREE.Vector3;
  tvPos: THREE.Vector3;
  tvScreenMat: THREE.MeshStandardMaterial;
  tvScreenMesh: THREE.Mesh;
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

  // ---- Dock departure TV --------------------------------------------------
  // The TV is the boarding gate: tapping it clears the ferry and rolls the
  // safety/departure feed. The screen is a unique dynamic material so the
  // static-merge pass leaves it accessible for live updates.
  let tvTexture: THREE.CanvasTexture | null = null;
  if (typeof document !== 'undefined') {
    const tvCanvas = document.createElement('canvas');
    tvCanvas.width = 512;
    tvCanvas.height = 288;
    const tvCtx = tvCanvas.getContext('2d');
    if (tvCtx) {
      tvCtx.fillStyle = '#071a20';
      tvCtx.fillRect(0, 0, 512, 288);
      tvCtx.fillStyle = '#0d3a3d';
      tvCtx.fillRect(18, 18, 476, 252);
      tvCtx.fillStyle = '#f5b642';
      tvCtx.fillRect(18, 18, 476, 10);
      tvCtx.fillRect(18, 260, 476, 10);
      tvCtx.fillStyle = '#e6f6f5';
      tvCtx.font = 'bold 42px Georgia, serif';
      tvCtx.textAlign = 'center';
      tvCtx.fillText('CRESCENT CITY', 256, 92);
      tvCtx.font = 'bold 54px Arial, sans-serif';
      tvCtx.fillStyle = '#f5b642';
      tvCtx.fillText('FERRY TV', 256, 152);
      tvCtx.font = 'bold 22px Arial, sans-serif';
      tvCtx.fillStyle = '#9fe3df';
      tvCtx.fillText('TAP TO CLEAR BOARDING', 256, 194);
      tvCtx.fillStyle = '#cbe9e6';
      tvCtx.font = '18px Arial, sans-serif';
      tvCtx.fillText('18-DAY CROSSING  ·  CABIN  ·  GALLEY  ·  DECK', 256, 232);
    }
    tvTexture = new THREE.CanvasTexture(tvCanvas);
    tvTexture.colorSpace = THREE.SRGBColorSpace;
    tvTexture.anisotropy = 4;
  }
  const tvScreenMat = new THREE.MeshStandardMaterial({
    color: tvTexture ? 0xffffff : 0x0d3a3d,
    ...(tvTexture ? { map: tvTexture, emissiveMap: tvTexture } : {}),
    emissive: 0x9fe3df,
    emissiveIntensity: 0.85,
    roughness: 0.24,
  });
  const tvFrameMat = new THREE.MeshStandardMaterial({
    color: 0x1e3b3f,
    roughness: 0.42,
    metalness: 0.45,
  });
  const tvGroup = new THREE.Group();
  tvGroup.position.set(FERRY_DOCK_CAR_STOP.x + 6.2, 0.82, 688.2);
  const tvPost = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 1.9, 8), steelMat);
  tvPost.position.y = 0.9;
  tvGroup.add(tvPost);
  const tvHousing = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.9, 0.28), tvFrameMat);
  tvHousing.position.set(0, 2.15, 0);
  tvHousing.castShadow = true;
  tvGroup.add(tvHousing);
  const tvScreenMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.62, 1.52), tvScreenMat);
  tvScreenMesh.position.set(0, 2.15, -0.151);
  tvScreenMesh.rotation.y = Math.PI;
  tvGroup.add(tvScreenMesh);
  const tvCanopy = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.12, 1.0), tvFrameMat);
  tvCanopy.position.set(0, 3.18, -0.22);
  tvCanopy.rotation.x = -0.12;
  tvGroup.add(tvCanopy);
  const tvLed = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.04), buttonMat);
  tvLed.position.set(1.3, 1.42, -0.16);
  tvGroup.add(tvLed);
  dockGroup.add(tvGroup);

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
    boatPos: new THREE.Vector3(26, 0.18, 713),
    tvPos: new THREE.Vector3(FERRY_DOCK_CAR_STOP.x + 6.2, 1.75, 688.2),
    tvScreenMat,
    tvScreenMesh,
    colliders: [
      { x: FERRY_CALL_POS.x, z: FERRY_CALL_POS.z, radius: 0.55 },
      { x: FERRY_DOCK_CAR_STOP.x + 6.2, z: 688.2, radius: 0.7 },
    ],
  };
}
