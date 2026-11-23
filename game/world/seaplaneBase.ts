import * as THREE from 'three';
import type { AirShuttleBase } from '../systems/crescentCityAirShuttle';

export interface SeaplaneBaseHandles {
  group: THREE.Group;
  runway: THREE.Group;
  hangar: THREE.Group;
}

function makeSignTexture(title: string, subtitle: string): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#082f38';
  ctx.fillRect(0, 0, 640, 256);
  ctx.fillStyle = '#0f4c5c';
  ctx.fillRect(14, 14, 612, 228);
  ctx.strokeStyle = '#d9a441';
  ctx.lineWidth = 8;
  ctx.strokeRect(14, 14, 612, 228);
  ctx.fillStyle = '#f8f3e6';
  ctx.textAlign = 'center';
  ctx.font = 'bold 56px Georgia, serif';
  ctx.fillText(title, 320, 108);
  ctx.fillStyle = '#d9a441';
  ctx.font = 'bold 28px Arial, sans-serif';
  ctx.fillText(subtitle, 320, 166);
  ctx.fillStyle = '#9fe3df';
  ctx.font = '20px Arial, sans-serif';
  ctx.fillText('AUTOMATIC DEPARTURE  ·  NO FUEL REQUIRED', 320, 212);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/**
 * A water runway is a floating pontoon slab with a lit centreline, edge lights,
 * a covered hangar at the parking end and a plank dock to the shore. Static
 * geometry; the aircraft is built separately and moved by the flight system.
 */
export function buildSeaplaneBase(base: AirShuttleBase): SeaplaneBaseHandles {
  const group = new THREE.Group();
  group.name = `seaplane-base-${base.id}`;
  const runway = new THREE.Group();
  runway.name = `seaplane-runway-${base.id}`;
  const hangar = new THREE.Group();
  hangar.name = `seaplane-hangar-${base.id}`;
  group.add(runway, hangar);

  const slabMat = new THREE.MeshStandardMaterial({
    color: 0x2f3a3d,
    roughness: 0.92,
    metalness: 0.06,
  });
  const pontoonMat = new THREE.MeshStandardMaterial({
    color: 0x1c3438,
    roughness: 0.8,
    metalness: 0.15,
  });
  const markingMat = new THREE.MeshStandardMaterial({
    color: 0xf3d27a,
    emissive: 0xb98324,
    emissiveIntensity: 0.5,
    roughness: 0.5,
  });
  const whiteMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    emissive: 0xcbd5e1,
    emissiveIntensity: 0.18,
    roughness: 0.6,
  });
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.42,
    metalness: 0.58,
  });
  const hangarMat = new THREE.MeshStandardMaterial({
    color: 0xd7d2c6,
    roughness: 0.78,
  });
  const hangarTrimMat = new THREE.MeshStandardMaterial({
    color: 0x0f4c5c,
    roughness: 0.58,
    metalness: 0.2,
  });
  const timberMat = new THREE.MeshStandardMaterial({ color: 0x6b4f35, roughness: 0.92 });
  const greenLightMat = new THREE.MeshStandardMaterial({
    color: 0x4ade80,
    emissive: 0x22c55e,
    emissiveIntensity: 1.1,
    roughness: 0.3,
  });
  const redLightMat = new THREE.MeshStandardMaterial({
    color: 0xf87171,
    emissive: 0xdc2626,
    emissiveIntensity: 1.0,
    roughness: 0.3,
  });

  const addBox = (
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material,
    parent: THREE.Object3D = runway,
  ): THREE.Mesh => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  const { runwayAxis, runwayLength, runwayWidth, runwayCenterX, runwayCenterZ } = base;
  const deckY = base.waterY + 0.14;
  const isZ = runwayAxis === 'z';

  // ---- Floating runway slab ---------------------------------------------
  addBox(
    isZ ? runwayWidth : runwayLength,
    0.34,
    isZ ? runwayLength : runwayWidth,
    runwayCenterX,
    deckY,
    runwayCenterZ,
    slabMat,
  );
  addBox(
    isZ ? runwayWidth + 1.4 : runwayLength + 1.4,
    0.22,
    isZ ? runwayLength + 1.4 : runwayWidth + 1.4,
    runwayCenterX,
    deckY - 0.24,
    runwayCenterZ,
    pontoonMat,
  );

  // Centreline dashes.
  const dashCount = 13;
  for (let i = 0; i < dashCount; i++) {
    const along = -runwayLength * 0.5 + 12 + (i * (runwayLength - 24)) / (dashCount - 1);
    addBox(
      isZ ? 0.9 : 7,
      0.03,
      isZ ? 7 : 0.9,
      runwayCenterX + (isZ ? 0 : along),
      deckY + 0.19,
      runwayCenterZ + (isZ ? along : 0),
      markingMat,
    );
  }
  // Threshold bars at both ends.
  for (const end of [-1, 1]) {
    for (let i = -3; i <= 3; i++) {
      const across = i * (runwayWidth / 8);
      const along = end * (runwayLength * 0.5 - 9);
      addBox(
        isZ ? 1.25 : 5.5,
        0.03,
        isZ ? 5.5 : 1.25,
        runwayCenterX + (isZ ? across : along),
        deckY + 0.19,
        runwayCenterZ + (isZ ? along : across),
        whiteMat,
      );
    }
  }
  // Pontoon rails and edge lights.
  for (const side of [-1, 1]) {
    const edge = side * (runwayWidth * 0.5 + 0.45);
    addBox(
      isZ ? 0.25 : runwayLength,
      0.45,
      isZ ? runwayLength : 0.25,
      runwayCenterX + (isZ ? edge : 0),
      deckY + 0.2,
      runwayCenterZ + (isZ ? 0 : edge),
      pontoonMat,
    );
    for (let i = 0; i < 11; i++) {
      const along = -runwayLength * 0.5 + 10 + (i * (runwayLength - 20)) / 10;
      const light = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), greenLightMat);
      light.position.set(
        runwayCenterX + (isZ ? edge : along),
        deckY + 0.55,
        runwayCenterZ + (isZ ? along : edge),
      );
      runway.add(light);
    }
  }
  const thresholdLight = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6), redLightMat);
  thresholdLight.position.set(
    runwayCenterX + (isZ ? 0 : -runwayLength * 0.5),
    deckY + 0.72,
    runwayCenterZ + (isZ ? -runwayLength * 0.5 : 0),
  );
  runway.add(thresholdLight);

  // ---- Hangar / covered mooring -----------------------------------------
  const yaw = base.outboundYaw;
  hangar.position.set(base.hangarX, base.waterY, base.hangarZ);
  hangar.rotation.y = yaw;
  const local = (x: number, y: number, z: number): [number, number, number] => [
    x * Math.cos(yaw) + z * Math.sin(yaw),
    y,
    -x * Math.sin(yaw) + z * Math.cos(yaw),
  ];
  const addHangarBox = (
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material,
  ): void => {
    addBox(w, h, d, x, y, z, mat, hangar);
  };
  // Skids and deck. The clear span is wider than the 23 m wing so the
  // aircraft can taxi through without clipping a post.
  addHangarBox(30, 0.3, 18, 0, 0.44, 0, timberMat);
  addHangarBox(29, 0.2, 17, 0, 0.62, 0, slabMat);
  // Open canopy: six posts, roof and trim so the aircraft can taxi through.
  for (const px of [-12.6, 12.6]) {
    for (const pz of [-7.5, 7.5]) {
      addHangarBox(0.45, 8.2, 0.45, px, 4.6, pz, steelMat);
    }
  }
  addHangarBox(30.5, 0.55, 18.5, 0, 8.8, 0, hangarMat);
  addHangarBox(31, 0.25, 19, 0, 9.15, 0, hangarTrimMat);
  addHangarBox(30.4, 0.55, 0.5, 0, 8.35, 9.1, hangarTrimMat);
  addHangarBox(0.5, 8.0, 18, -13.0, 4.5, 0, hangarMat);
  // Terminal hut beside the hangar.
  const hutLocal = local(-18, 0, 0);
  addHangarBox(7, 3.4, 6, -18, 2.3, 0, hangarMat);
  addHangarBox(7.4, 0.4, 6.4, -18, 4.1, 0, hangarTrimMat);
  addHangarBox(2.2, 1.8, 0.16, -18, 2.2, 3.05, hangarTrimMat);
  const hutLight = new THREE.PointLight(0xffd27a, 5, 16, 2);
  hutLight.position.set(hutLocal[0], 3.2, hutLocal[2]);
  group.add(hutLight);

  // Sign over the hangar entrance.
  const title = base.id === 'island' ? 'CRESCENT CLIPPER' : 'CRESCENT CLIPPER';
  const subtitle =
    base.id === 'island' ? 'DRIFTWOOD · 55 MIN TO CRESCENT CITY' : 'CRESCENT CITY · 55 MIN TO DRIFTWOOD';
  const signTexture = makeSignTexture(title, subtitle);
  const signMat = new THREE.MeshStandardMaterial({
    color: signTexture ? 0xffffff : 0x0f4c5c,
    ...(signTexture ? { map: signTexture, emissiveMap: signTexture } : {}),
    emissive: 0x9fe3df,
    emissiveIntensity: 0.6,
    roughness: 0.45,
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(12, 4.6), signMat);
  // The hangar group already carries the base yaw, so the sign sits in its
  // local frame and faces the runway entrance.
  sign.position.set(0, 7.0, 9.2);
  hangar.add(sign);

  // ---- Shore dock and windsock ------------------------------------------
  const dockDX = base.disembarkX - base.hangarX;
  const dockDZ = base.disembarkZ - base.hangarZ;
  const dockLength = Math.hypot(dockDX, dockDZ);
  if (dockLength > 1) {
    const dock = addBox(
      3.2,
      0.22,
      dockLength,
      (base.disembarkX + base.hangarX) * 0.5,
      base.waterY + 0.42,
      (base.disembarkZ + base.hangarZ) * 0.5,
      timberMat,
      group,
    );
    dock.rotation.y = Math.atan2(dockDX, dockDZ);
    for (let i = 0; i < 5; i++) {
      const t = i / 4;
      const piling = new THREE.Mesh(
        new THREE.CylinderGeometry(0.13, 0.17, 2.2, 7),
        pontoonMat,
      );
      piling.position.set(
        base.hangarX + dockDX * t,
        base.waterY - 0.35,
        base.hangarZ + dockDZ * t,
      );
      group.add(piling);
    }
  }
  const windsockPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.14, 6.2, 7),
    steelMat,
  );
  const windsockLocal = local(-13.5, 0, 7.4);
  windsockPole.position.set(windsockLocal[0], base.waterY + 3.6, windsockLocal[2]);
  group.add(windsockPole);
  const windsock = new THREE.Mesh(
    new THREE.ConeGeometry(0.55, 2.2, 10, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0xf97316,
      roughness: 0.8,
      side: THREE.DoubleSide,
    }),
  );
  windsock.rotation.z = Math.PI / 2;
  windsock.rotation.y = yaw;
  windsock.position.set(windsockLocal[0] + 1.2, base.waterY + 6.2, windsockLocal[2]);
  group.add(windsock);

  return { group, runway, hangar };
}
