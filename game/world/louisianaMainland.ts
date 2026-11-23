import * as THREE from 'three';
import { getTerrainHeight } from './terrain';
import { LOUISIANA_CITY_OFFSET } from './louisianaLandmass';
import { MAINLAND_BUSINESSES } from '../systems/louisianaBusinesses';

// The original city layout coordinates are used locally, then the whole
// district is translated onto the separated Louisiana landmass. Keeping the
// local layout avoids duplicating the shipped street/business geometry while
// ensuring every world-facing coordinate lands on the mainland.
const CITY = {
  pos: { x: 72, z: 430 },
  terminal: { x: 72, z: 500 },
  garage: { x: 34, z: 390 },
  safehouse: { x: 120, z: 390 },
  docks: { x: -40, z: 500 },
  vault: { x: 120, z: 468 },
  parking: { x: 34, z: 390 },
} as const;

function toWorldX(localX: number): number {
  return localX + LOUISIANA_CITY_OFFSET.x;
}

function toWorldZ(localZ: number): number {
  return localZ + LOUISIANA_CITY_OFFSET.z;
}

/**
 * Louisiana mainland district geometry.
 *
 * Everything is static, batched into a handful of InstancedMeshes and shared
 * PBR materials. No per-frame logic lives here: the city is culled by the
 * existing WorldChunkManager like any other island landmark.
 */

export interface LouisianaMainlandHandles {
  group: THREE.Group;
  terminalPos: THREE.Vector3;
  garagePos: THREE.Vector3;
  safehousePos: THREE.Vector3;
  docksPos: THREE.Vector3;
  vaultPos: THREE.Vector3;
  parkingPos: THREE.Vector3;
  stuntRamps: { x: number; z: number; width: number; depth: number; label: string }[];
  streetcarGroup: THREE.Group;
  streetcarRoute: { x: number; z: number }[];
  colliders: { x: number; z: number; radius: number }[];
  /** Living street dressing, animated by the engine each frame. */
  streetWalkers: THREE.Group[];
  streetDancers: THREE.Group[];
  trafficCars: {
    bodies: THREE.InstancedMesh;
    cabins: THREE.InstancedMesh;
    lanes: Array<{
      index: number;
      x: number;
      y: number;
      yaw: number;
      direction: 1 | -1;
      speed: number;
      offset: number;
    }>;
  };
  /** World-space centre used to skip street-life animation from far away. */
  streetLifeCenter: { x: number; z: number };
}

type BuildingLot = {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  color: number;
  floors: number;
};

const PASTELS = [
  0xe8d9c5, 0xd9b8a0, 0xc7d7c1, 0xbfd3dc, 0xe7c7b0, 0xd8c3a5, 0xc9b8d4, 0xe3d3a7, 0xbcc9b5,
  0xdec2c2,
];

const ROOF_COLORS = [0x4b4037, 0x5c4a3c, 0x3f4a46, 0x59453f, 0x4c4a45];

function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function intersectsReserved(
  x: number,
  z: number,
  w: number,
  d: number,
  reserved: { x: number; z: number; radius: number }[],
): boolean {
  for (const spot of reserved) {
    const dx = Math.abs(x - spot.x) - w * 0.5;
    const dz = Math.abs(z - spot.z) - d * 0.5;
    if (dx < spot.radius && dz < spot.radius) return true;
  }
  return false;
}

export function buildLouisianaMainland(): LouisianaMainlandHandles {
  const group = new THREE.Group();
  group.name = 'crescent-city-mainland';

  // The city group is translated onto the Louisiana shelf, so every local
  // ground sample must use its world coordinate, not the old island location.
  const groundYAtLocal = (lx: number, lz: number): number =>
    getTerrainHeight(lx + LOUISIANA_CITY_OFFSET.x, lz + LOUISIANA_CITY_OFFSET.z);
  const baseY = groundYAtLocal(CITY.pos.x, CITY.pos.z) + 0.03;
  const colliders: { x: number; z: number; radius: number }[] = [];
  const rand = seededRandom(91427);

  const asphaltMat = new THREE.MeshStandardMaterial({
    color: 0x272a2c,
    roughness: 0.93,
    metalness: 0.04,
  });
  const concreteMat = new THREE.MeshStandardMaterial({
    color: 0x9a948a,
    roughness: 0.9,
    metalness: 0.02,
  });
  const concreteDarkMat = new THREE.MeshStandardMaterial({
    color: 0x5f5a54,
    roughness: 0.92,
    metalness: 0.04,
  });
  const buildingMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.82,
    metalness: 0.02,
  });
  const roofMat = new THREE.MeshStandardMaterial({
    color: 0x3f3a35,
    roughness: 0.95,
  });
  const windowMat = new THREE.MeshStandardMaterial({
    color: 0xffd48a,
    emissive: 0xffb347,
    emissiveIntensity: 0.9,
    roughness: 0.25,
    metalness: 0.1,
  });
  const windowDarkMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    emissive: 0x0f172a,
    emissiveIntensity: 0.18,
    roughness: 0.35,
    metalness: 0.35,
  });
  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x6b4a2f,
    roughness: 0.92,
  });
  const woodDarkMat = new THREE.MeshStandardMaterial({
    color: 0x3f2c1e,
    roughness: 0.95,
  });
  const ironMat = new THREE.MeshStandardMaterial({
    color: 0x24282b,
    roughness: 0.55,
    metalness: 0.7,
  });
  const neonAmberMat = new THREE.MeshStandardMaterial({
    color: 0xffc14d,
    emissive: 0xff9500,
    emissiveIntensity: 1.5,
    roughness: 0.3,
  });
  const neonPinkMat = new THREE.MeshStandardMaterial({
    color: 0xff5fa2,
    emissive: 0xff2d7a,
    emissiveIntensity: 1.35,
    roughness: 0.3,
  });
  const neonCyanMat = new THREE.MeshStandardMaterial({
    color: 0x5eead4,
    emissive: 0x22d3ee,
    emissiveIntensity: 1.3,
    roughness: 0.3,
  });
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x1c4b46,
    roughness: 0.18,
    metalness: 0.25,
    transparent: true,
    opacity: 0.86,
    depthWrite: false,
  });
  const leafMat = new THREE.MeshStandardMaterial({
    color: 0x3f6b34,
    roughness: 0.86,
    metalness: 0.01,
  });
  const cypressMat = new THREE.MeshStandardMaterial({
    color: 0x365b38,
    roughness: 0.9,
  });
  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x4c3827,
    roughness: 0.94,
  });

  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const planeGeo = new THREE.PlaneGeometry(1, 1);
  const dummy = new THREE.Object3D();

  const addBox = (
    mat: THREE.Material,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    rotY = 0,
    rotX = 0,
    rotZ = 0,
    parent: THREE.Object3D = group,
  ): THREE.Mesh => {
    const mesh = new THREE.Mesh(boxGeo, mat);
    mesh.scale.set(w, h, d);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rotX, rotY, rotZ);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  const addInstanced = (
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    count: number,
    castShadow = true,
  ): THREE.InstancedMesh => {
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };

  // ---- Roads, sidewalks and streetcar tracks --------------------------------
  const roadSpecs = [
    // Main north-south boulevard from the landing to the city center.
    { x: 72, z: 430, w: 15, d: 152, ry: 0 },
    // Cross street through the French Quarter blocks.
    { x: 72, z: 430, w: 210, d: 13, ry: 0 },
    // Two quieter side streets.
    { x: 32, z: 430, w: 9, d: 98, ry: 0 },
    { x: 120, z: 430, w: 9, d: 98, ry: 0 },
    // Highway ramp approach on the east edge.
    { x: 170, z: 430, w: 58, d: 12, ry: 0 },
    // Dirt backroad into the bayou.
    { x: -22, z: 466, w: 8, d: 74, ry: -0.36 },
    // Docks apron.
    { x: -38, z: 500, w: 28, d: 18, ry: 0 },
    // Parking garage apron.
    { x: 34, z: 408, w: 28, d: 10, ry: 0 },
    // Safehouse drive.
    { x: 111, z: 402, w: 8, d: 18, ry: 0 },
    // Vault service road.
    { x: 105, z: 468, w: 18, d: 8, ry: 0 },
    // Terminal turnaround.
    { x: 72, z: 500, w: 26, d: 12, ry: 0 },
    // Highway elevated deck.
    { x: 179, z: 430, w: 52, d: 9, ry: 0, elev: 5.9 },
    // Expanded mainland grid: north, south, west and east-bank neighborhoods.
    { x: 55, z: 300, w: 420, d: 10, ry: 0 },
    { x: 55, z: 560, w: 440, d: 11, ry: 0 },
    { x: -250, z: 430, w: 11, d: 290, ry: 0 },
    { x: -140, z: 430, w: 10, d: 290, ry: 0 },
    { x: 250, z: 430, w: 11, d: 290, ry: 0 },
    { x: 370, z: 430, w: 10, d: 300, ry: 0 },
    { x: -300, z: 300, w: 120, d: 9, ry: 0 },
    { x: -300, z: 560, w: 150, d: 10, ry: 0 },
    { x: 250, z: 300, w: 210, d: 9, ry: 0 },
    { x: 285, z: 560, w: 220, d: 10, ry: 0 },
    { x: 318, z: 440, w: 66, d: 9, ry: 0 },
    { x: 318, z: 510, w: 66, d: 9, ry: 0 },
    { x: 300, z: 390, w: 120, d: 8, ry: -0.18 },
    { x: 300, z: 590, w: 120, d: 8, ry: 0.16 },
  ];
  const asphalt = addInstanced(boxGeo, asphaltMat, roadSpecs.length, false);
  for (let i = 0; i < asphalt.count; i++) {
    const spec = roadSpecs[i];
    dummy.position.set(spec.x, baseY + (spec.elev ?? 0.06), spec.z);
    dummy.rotation.set(0, spec.ry, 0);
    dummy.scale.set(spec.w, spec.elev ? 0.55 : 0.1, spec.d);
    dummy.updateMatrix();
    asphalt.setMatrixAt(i, dummy.matrix);
  }
  asphalt.instanceMatrix.needsUpdate = true;
  asphalt.computeBoundingSphere();

  // Raised highway deck and ramps.
  addBox(concreteDarkMat, 52, 0.9, 9, 179, baseY + 5.7, 430);
  addBox(concreteDarkMat, 18, 0.55, 9, 154, baseY + 4.1, 430, 0, 0, 0.36);
  addBox(concreteDarkMat, 18, 0.55, 9, 204, baseY + 4.1, 430, 0, 0, -0.36);
  for (let i = 0; i < 6; i++) {
    addBox(concreteMat, 1.5, 5.4, 1.5, 158 + i * 9, baseY + 2.7, 430);
  }
  for (let side = -1; side <= 1; side += 2) {
    addBox(ironMat, 50, 0.7, 0.22, 179, baseY + 6.35, 430 + side * 4.4);
  }

  // Sidewalk strips.
  const sidewalks = [
    { x: 72, z: 430, w: 1.6, d: 150, dx: -8.3 },
    { x: 72, z: 430, w: 1.6, d: 150, dx: 8.3 },
    { x: 72, z: 430, w: 208, d: 1.6, dz: -7.3 },
    { x: 72, z: 430, w: 208, d: 1.6, dz: 7.3 },
    { x: 32, z: 430, w: 1.2, d: 96, dx: -5.1 },
    { x: 32, z: 430, w: 1.2, d: 96, dx: 5.1 },
    { x: 120, z: 430, w: 1.2, d: 96, dx: -5.1 },
    { x: 120, z: 430, w: 1.2, d: 96, dx: 5.1 },
    { x: 55, z: 294, w: 414, d: 1.4 },
    { x: 55, z: 566, w: 434, d: 1.4 },
    { x: -256, z: 430, w: 1.4, d: 284, dx: 0 },
    { x: -146, z: 430, w: 1.4, d: 284, dx: 0 },
    { x: 244, z: 430, w: 1.4, d: 284, dx: 0 },
    { x: 364, z: 430, w: 1.4, d: 294, dx: 0 },
  ];
  const sidewalk = addInstanced(boxGeo, concreteMat, sidewalks.length, false);
  for (let i = 0; i < sidewalk.count; i++) {
    const s = sidewalks[i];
    dummy.position.set(s.x + (s.dx ?? 0), baseY + 0.1, s.z + (s.dz ?? 0));
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(s.w, 0.18, s.d);
    dummy.updateMatrix();
    sidewalk.setMatrixAt(i, dummy.matrix);
  }
  sidewalk.instanceMatrix.needsUpdate = true;
  sidewalk.computeBoundingSphere();

  // Streetcar rails down the central boulevard.
  addBox(ironMat, 0.18, 0.03, 152, 69.8, baseY + 0.14, 430);
  addBox(ironMat, 0.18, 0.03, 152, 74.2, baseY + 0.14, 430);
  for (let z = 370; z <= 490; z += 12) {
    addBox(woodDarkMat, 4.4, 0.06, 1.4, 72, baseY + 0.1, z);
  }

  // ---- City blocks ---------------------------------------------------------
  const reserved = [
    { x: CITY.garage.x, z: CITY.garage.z, radius: 19 },
    { x: CITY.safehouse.x, z: CITY.safehouse.z, radius: 14 },
    { x: CITY.vault.x, z: CITY.vault.z, radius: 12 },
    { x: CITY.terminal.x, z: CITY.terminal.z, radius: 12 },
    ...MAINLAND_BUSINESSES.map((business) => ({
      x: business.x - LOUISIANA_CITY_OFFSET.x,
      z: business.z - LOUISIANA_CITY_OFFSET.z,
      radius: Math.max(business.w, business.d) * 0.72,
    })),
  ];
  const blocks = [
    { x0: 8, x1: 60, z0: 352, z1: 408 },
    { x0: 84, x1: 158, z0: 352, z1: 408 },
    { x0: 8, x1: 60, z0: 452, z1: 502 },
    { x0: 84, x1: 158, z0: 452, z1: 502 },
    // Northwest and west-bank blocks.
    { x0: -340, x1: -260, z0: 308, z1: 388 },
    { x0: -340, x1: -260, z0: 462, z1: 542 },
    { x0: -225, x1: -155, z0: 308, z1: 388 },
    { x0: -225, x1: -155, z0: 462, z1: 542 },
    // North boulevard blocks.
    { x0: -85, x1: 0, z0: 312, z1: 372 },
    { x0: 185, x1: 238, z0: 312, z1: 372 },
    // East-bank blocks across the Mississippi.
    { x0: 272, x1: 352, z0: 312, z1: 388 },
    { x0: 272, x1: 352, z0: 552, z1: 620 },
    { x0: 388, x1: 452, z0: 312, z1: 388 },
    { x0: 388, x1: 452, z0: 552, z1: 620 },
    // Riverbend / south blocks.
    { x0: -92, x1: 12, z0: 578, z1: 616 },
    { x0: 200, x1: 285, z0: 578, z1: 616 },
  ];
  const onRoad = (x: number, z: number): boolean => {
    for (let r = 0; r < roadSpecs.length; r++) {
      const road = roadSpecs[r];
      if (Math.abs(x - road.x) < road.w * 0.5 + 4.2 && Math.abs(z - road.z) < road.d * 0.5 + 4.2) {
        return true;
      }
    }
    return false;
  };
  const lots: BuildingLot[] = [];
  for (let b = 0; b < blocks.length; b++) {
    const block = blocks[b];
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 3; col++) {
        const w = 9 + rand() * 7;
        const d = 9 + rand() * 7;
        const x = block.x0 + 9 + col * ((block.x1 - block.x0 - 18) / 2) + (rand() - 0.5) * 2;
        const z = block.z0 + 8 + row * ((block.z1 - block.z0 - 16) / 1.35) + (rand() - 0.5) * 2;
        // Keep the boulevards, side streets and every business footprint clear.
        if (onRoad(x, z)) continue;
        if (intersectsReserved(x, z, w, d, reserved)) continue;
        const floors = 2 + Math.floor(rand() * 4);
        const h = 5.4 + floors * 3.1 + rand() * 2;
        lots.push({
          x,
          z,
          w,
          d,
          h,
          floors,
          color: PASTELS[Math.floor(rand() * PASTELS.length)],
        });
      }
    }
  }

  const buildings = addInstanced(boxGeo, buildingMat, lots.length);
  const roofs = addInstanced(boxGeo, roofMat, lots.length);
  const windowCount = lots.reduce((sum, lot) => sum + lot.floors * 3, 0) * 2;
  const windows = addInstanced(boxGeo, windowMat, windowCount, false);
  const windowDark = addInstanced(boxGeo, windowDarkMat, windowCount, false);
  const balconies = addInstanced(boxGeo, ironMat, lots.length * 2, false);
  let windowIdx = 0;
  let balconyIdx = 0;
  const tempColor = new THREE.Color();
  for (let i = 0; i < lots.length; i++) {
    const lot = lots[i];
    const y = groundYAtLocal(lot.x, lot.z);
    dummy.position.set(lot.x, y + lot.h * 0.5, lot.z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(lot.w, lot.h, lot.d);
    dummy.updateMatrix();
    buildings.setMatrixAt(i, dummy.matrix);
    tempColor.setHex(lot.color);
    buildings.setColorAt(i, tempColor);

    dummy.position.set(lot.x, y + lot.h + 0.35, lot.z);
    dummy.scale.set(lot.w + 0.9, 0.7, lot.d + 0.9);
    dummy.updateMatrix();
    roofs.setMatrixAt(i, dummy.matrix);
    tempColor.setHex(ROOF_COLORS[i % ROOF_COLORS.length]);
    roofs.setColorAt(i, tempColor);

    // Street-facing windows on the north and south facades.
    for (let floor = 0; floor < lot.floors; floor++) {
      for (let col = 0; col < 3; col++) {
        const wx = lot.x - lot.w * 0.32 + col * lot.w * 0.32;
        const wy = y + 2.5 + floor * 3.0;
        for (let side = 0; side < 2; side++) {
          const wz = lot.z + (side === 0 ? lot.d * 0.5 + 0.06 : -lot.d * 0.5 - 0.06);
          dummy.position.set(wx, wy, wz);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.set(1.6, 1.6, 0.12);
          dummy.updateMatrix();
          if ((floor + col + i) % 4 === 0) {
            windowDark.setMatrixAt(windowIdx, dummy.matrix);
            windows.setMatrixAt(
              windowIdx,
              new THREE.Matrix4().makeScale(0, 0, 0),
            );
          } else {
            windows.setMatrixAt(windowIdx, dummy.matrix);
            windowDark.setMatrixAt(
              windowIdx,
              new THREE.Matrix4().makeScale(0, 0, 0),
            );
          }
          windowIdx++;
        }
      }
    }

    // Wrought-iron gallery balconies.
    for (let side = 0; side < 2; side++) {
      const bz = lot.z + (side === 0 ? lot.d * 0.5 + 1.1 : -lot.d * 0.5 - 1.1);
      dummy.position.set(lot.x, y + 4.0, bz);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(lot.w * 0.82, 0.12, 2.0);
      dummy.updateMatrix();
      balconies.setMatrixAt(balconyIdx++, dummy.matrix);
    }

    colliders.push({
      x: lot.x,
      z: lot.z,
      radius: Math.max(3.2, Math.min(lot.w, lot.d) * 0.48),
    });
  }
  buildings.instanceMatrix.needsUpdate = true;
  buildings.instanceColor!.needsUpdate = true;
  buildings.computeBoundingSphere();
  roofs.instanceMatrix.needsUpdate = true;
  roofs.instanceColor!.needsUpdate = true;
  roofs.computeBoundingSphere();
  windows.instanceMatrix.needsUpdate = true;
  windows.computeBoundingSphere();
  windowDark.instanceMatrix.needsUpdate = true;
  windowDark.computeBoundingSphere();
  balconies.instanceMatrix.needsUpdate = true;
  balconies.computeBoundingSphere();

  // ---- Oak trees & street lights ------------------------------------------
  const treeSpots: { x: number; z: number; scale: number }[] = [];
  for (let i = 0; i < 18; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const x = 62 + side * (9 + (i % 4) * 3.5) + (rand() - 0.5) * 2;
    const z = 356 + (i / 18) * 142 + (rand() - 0.5) * 3;
    treeSpots.push({ x, z, scale: 0.9 + rand() * 0.8 });
  }
  const trunks = addInstanced(
    new THREE.CylinderGeometry(0.26, 0.4, 3.2, 7),
    trunkMat,
    treeSpots.length,
  );
  const canopies = addInstanced(
    new THREE.IcosahedronGeometry(2.5, 1),
    leafMat,
    treeSpots.length,
  );
  for (let i = 0; i < treeSpots.length; i++) {
    const spot = treeSpots[i];
    const y = groundYAtLocal(spot.x, spot.z);
    dummy.position.set(spot.x, y + 1.6 * spot.scale, spot.z);
    dummy.rotation.set(0, rand() * Math.PI, 0);
    dummy.scale.set(spot.scale, spot.scale, spot.scale);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);
    dummy.position.set(spot.x, y + 4.6 * spot.scale, spot.z);
    dummy.scale.set(spot.scale * 1.1, spot.scale * 0.9, spot.scale * 1.1);
    dummy.updateMatrix();
    canopies.setMatrixAt(i, dummy.matrix);
  }
  trunks.instanceMatrix.needsUpdate = true;
  canopies.instanceMatrix.needsUpdate = true;
  trunks.computeBoundingSphere();
  canopies.computeBoundingSphere();

  const lampSpots: { x: number; z: number }[] = [];
  for (let i = 0; i < 10; i++) {
    lampSpots.push({ x: 62.5, z: 360 + i * 14.2 });
    lampSpots.push({ x: 81.5, z: 367 + i * 14.2 });
  }
  const lampPoles = addInstanced(
    new THREE.CylinderGeometry(0.09, 0.14, 4.4, 6),
    ironMat,
    lampSpots.length,
  );
  const lampGlobes = addInstanced(
    new THREE.SphereGeometry(0.32, 8, 6),
    neonAmberMat,
    lampSpots.length,
    false,
  );
  for (let i = 0; i < lampSpots.length; i++) {
    const spot = lampSpots[i];
    const y = groundYAtLocal(spot.x, spot.z);
    dummy.position.set(spot.x, y + 2.2, spot.z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    lampPoles.setMatrixAt(i, dummy.matrix);
    dummy.position.set(spot.x, y + 4.5, spot.z);
    dummy.updateMatrix();
    lampGlobes.setMatrixAt(i, dummy.matrix);
  }
  lampPoles.instanceMatrix.needsUpdate = true;
  lampGlobes.instanceMatrix.needsUpdate = true;
  lampPoles.computeBoundingSphere();
  lampGlobes.computeBoundingSphere();

  // ---- Multi-story parking garage with rooftop stunt ramp -----------------
  const garage = new THREE.Group();
  garage.position.set(CITY.garage.x, 0, CITY.garage.z);
  group.add(garage);
  const garageY = groundYAtLocal(CITY.garage.x, CITY.garage.z);
  addBox(concreteMat, 30, 0.7, 25, 0, garageY + 0.35, 0, 0, 0, 0, garage);
  addBox(concreteMat, 29, 0.45, 24, 0, garageY + 3.8, 0, 0, 0, 0, garage);
  addBox(concreteMat, 29, 0.45, 24, 0, garageY + 7.2, 0, 0, 0, 0, garage);
  addBox(concreteMat, 29, 1.1, 24, 0, garageY + 7.85, 0, 0, 0, 0, garage);
  for (let level = 0; level < 3; level++) {
    const ly = garageY + 0.6 + level * 3.4;
    const inset = level === 2 ? 14.1 : 14.6;
    for (let ix = -1; ix <= 1; ix += 2) {
      for (let iz = -1; iz <= 1; iz += 2) {
        addBox(concreteDarkMat, 1.0, 3.1, 1.0, ix * inset * 0.72, ly + 1.5, iz * 11.6, 0, 0, 0, garage);
      }
    }
  }
  // Concrete ramps between decks, offset to leave the entry lane clear.
  addBox(concreteDarkMat, 3.2, 0.35, 15, -10.5, garageY + 2.25, 0, 0, 0.26, 0, garage);
  addBox(concreteDarkMat, 3.2, 0.35, 15, 10.5, garageY + 5.65, 0, 0, -0.26, 0, garage);
  // Rooftop jump ramp aimed at the highway.
  const rampGeo = new THREE.BoxGeometry(8, 0.35, 7);
  const ramp = new THREE.Mesh(rampGeo, concreteDarkMat);
  ramp.position.set(5, garageY + 9.3, 4);
  ramp.rotation.set(-0.28, 0.15, 0);
  ramp.castShadow = true;
  ramp.receiveShadow = true;
  garage.add(ramp);
  addBox(neonAmberMat, 5.2, 3.2, 0.25, 0, garageY + 5.1, 12.3, 0, 0, 0, garage);
  addBox(neonPinkMat, 3.0, 0.35, 0.32, 0, garageY + 6.8, 12.4, 0, 0, 0, garage);
  const garageLight = new THREE.PointLight(0xffb347, 2.4, 32, 1.7);
  garageLight.position.set(0, garageY + 6.2, 10);
  garage.add(garageLight);

  for (let ix = -1; ix <= 1; ix += 2) {
    for (let iz = -1; iz <= 1; iz += 2) {
      colliders.push({
        x: CITY.garage.x + ix * 10.2,
        z: CITY.garage.z + iz * 11.6,
        radius: 1.3,
      });
    }
  }

  // ---- Safehouse, workbench & stash locker --------------------------------
  const safehouse = new THREE.Group();
  safehouse.position.set(CITY.safehouse.x, 0, CITY.safehouse.z);
  group.add(safehouse);
  const safeY = groundYAtLocal(CITY.safehouse.x, CITY.safehouse.z);
  addBox(new THREE.MeshStandardMaterial({ color: 0xe3cfa9, roughness: 0.86 }), 12, 6.4, 10, 0, safeY + 3.2, 0, 0, 0, 0, safehouse);
  addBox(roofMat, 13.4, 0.5, 11.4, 0, safeY + 6.55, 0, 0, 0, 0, safehouse);
  addBox(woodMat, 12.2, 0.35, 3.4, 0, safeY + 0.5, 6.3, 0, 0, 0, safehouse);
  addBox(woodDarkMat, 12.2, 2.8, 0.18, 0, safeY + 2.0, 7.9, 0, 0, 0, safehouse);
  for (let i = -2; i <= 2; i++) {
    addBox(ironMat, 0.13, 2.2, 0.13, i * 2.4, safeY + 3.1, 7.9, 0, 0, 0, safehouse);
  }
  addBox(neonAmberMat, 6.4, 0.65, 0.22, 0, safeY + 5.1, 5.1, 0, 0, 0, safehouse);
  addBox(woodDarkMat, 3.2, 0.8, 1.1, -3.6, safeY + 1.0, 5.2, 0, 0, 0, safehouse);
  addBox(ironMat, 1.6, 1.0, 1.0, 3.8, safeY + 0.95, 5.2, 0, 0, 0, safehouse);
  const safeLight = new THREE.PointLight(0xffb347, 2.0, 22, 1.8);
  safeLight.position.set(0, safeY + 3.0, 7.4);
  safehouse.add(safeLight);
  colliders.push({ x: CITY.safehouse.x + 4.6, z: CITY.safehouse.z - 1.2, radius: 2.2 });
  colliders.push({ x: CITY.safehouse.x - 4.6, z: CITY.safehouse.z - 1.2, radius: 2.2 });

  // ---- Flood tunnel bunker / vault entrance -------------------------------
  const vault = new THREE.Group();
  vault.position.set(CITY.vault.x, 0, CITY.vault.z);
  group.add(vault);
  const vaultY = groundYAtLocal(CITY.vault.x, CITY.vault.z);
  addBox(concreteDarkMat, 15, 4.6, 12, 0, vaultY + 2.3, 0, 0, 0, 0, vault);
  addBox(concreteMat, 16, 0.5, 13, 0, vaultY + 4.7, 0, 0, 0, 0, vault);
  addBox(new THREE.MeshBasicMaterial({ color: 0x0b0f12 }), 4.2, 3.2, 0.35, 0, vaultY + 1.7, 6.1, 0, 0, 0, vault);
  addBox(neonCyanMat, 4.8, 0.22, 0.4, 0, vaultY + 3.5, 6.2, 0, 0, 0, vault);
  addBox(neonCyanMat, 0.22, 3.4, 0.4, -2.45, vaultY + 1.9, 6.2, 0, 0, 0, vault);
  addBox(neonCyanMat, 0.22, 3.4, 0.4, 2.45, vaultY + 1.9, 6.2, 0, 0, 0, vault);
  // Stairwell / ventilation silhouette on the roof.
  addBox(concreteMat, 3.6, 2.2, 3.6, -4.2, vaultY + 5.8, 0, 0, 0, 0, vault);
  // Subterranean access glow.
  addBox(new THREE.MeshBasicMaterial({ color: 0x082f36 }), 6.0, 0.2, 4.0, 0, vaultY + 0.1, 8.6, 0, 0, 0, vault);
  const vaultLight = new THREE.PointLight(0x22d3ee, 1.7, 20, 1.8);
  vaultLight.position.set(0, vaultY + 2.4, 6.8);
  vault.add(vaultLight);
  colliders.push({ x: CITY.vault.x - 6.2, z: CITY.vault.z, radius: 2.4 });
  colliders.push({ x: CITY.vault.x + 6.2, z: CITY.vault.z, radius: 2.4 });

  // ---- Bayou, cypress swamp & wooden docks --------------------------------
  const bayouX = CITY.docks.x;
  const bayouZ = CITY.docks.z;
  const bayouY = baseY + 0.18;
  const bayouWater = new THREE.Mesh(planeGeo, waterMat);
  bayouWater.rotation.x = -Math.PI * 0.5;
  bayouWater.scale.set(78, 1, 46);
  bayouWater.position.set(bayouX - 6, bayouY, bayouZ - 2);
  group.add(bayouWater);
  const bank = new THREE.Mesh(planeGeo, new THREE.MeshStandardMaterial({ color: 0x5b4a34, roughness: 0.96 }));
  bank.rotation.x = -Math.PI * 0.5;
  bank.scale.set(84, 1, 54);
  bank.position.set(bayouX - 6, baseY + 0.02, bayouZ - 2);
  group.add(bank);

  for (let i = 0; i < 14; i++) {
    const angle = rand() * Math.PI * 2;
    const dist = 10 + rand() * 30;
    const cx = bayouX + Math.cos(angle) * dist;
    const cz = bayouZ + Math.sin(angle) * dist * 0.62;
    const cy = groundYAtLocal(cx, cz);
    addBox(trunkMat, 0.55, 5.8 + rand() * 2, 0.55, cx, cy + 3.0, cz, 0, 0, 0);
    const canopy = new THREE.Mesh(new THREE.ConeGeometry(2.0 + rand(), 4.4, 7), cypressMat);
    canopy.position.set(cx, cy + 6.1, cz);
    canopy.castShadow = true;
    group.add(canopy);
    const moss = new THREE.Mesh(
      new THREE.ConeGeometry(1.65, 2.8, 7),
      new THREE.MeshStandardMaterial({ color: 0x7a8b5e, roughness: 0.95 }),
    );
    moss.position.set(cx + 0.5, cy + 4.9, cz);
    group.add(moss);
  }

  // Three piers reaching into the bayou.
  for (let pier = 0; pier < 3; pier++) {
    const pz = bayouZ - 13 + pier * 7.4;
    addBox(woodMat, 30, 0.3, 3.4, bayouX - 2, baseY + 0.66, pz);
    for (let i = 0; i < 6; i++) {
      addBox(woodDarkMat, 0.35, 1.8, 0.35, bayouX - 16 + i * 5.8, baseY + 0.0, pz - 1.5);
      addBox(woodDarkMat, 0.35, 1.8, 0.35, bayouX - 16 + i * 5.8, baseY + 0.0, pz + 1.5);
    }
  }
  addBox(woodDarkMat, 8.0, 4.2, 6.0, bayouX - 20, baseY + 2.1, bayouZ + 12);
  addBox(roofMat, 9.0, 0.4, 7.0, bayouX - 20, baseY + 4.3, bayouZ + 12);
  addBox(neonAmberMat, 1.6, 0.35, 0.24, bayouX - 20, baseY + 3.4, bayouZ + 15.1);
  const dockLight = new THREE.PointLight(0xffa94d, 1.6, 18, 1.9);
  dockLight.position.set(bayouX - 18, baseY + 2.8, bayouZ + 10);
  group.add(dockLight);
  colliders.push({ x: bayouX - 20, z: bayouZ + 12, radius: 3.4 });

  // Reeds / marsh grass silhouette.
  const reedGeo = new THREE.BoxGeometry(0.12, 1.2, 0.12);
  const reeds = addInstanced(reedGeo, cypressMat, 80, false);
  for (let i = 0; i < 80; i++) {
    const x = bayouX - 34 + rand() * 64;
    const z = bayouZ - 22 + rand() * 44;
    const y = baseY + 0.25;
    dummy.position.set(x, y, z);
    dummy.rotation.set(0, rand() * Math.PI, 0);
    dummy.scale.set(1, 0.7 + rand() * 1.4, 1);
    dummy.updateMatrix();
    reeds.setMatrixAt(i, dummy.matrix);
  }
  reeds.instanceMatrix.needsUpdate = true;
  reeds.computeBoundingSphere();

  // ---- Street traffic & the moving Canal Street car ----------------------
  const trafficCount = 28;
  const trafficBodies = addInstanced(boxGeo, new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.58,
    metalness: 0.18,
  }), trafficCount);
  const trafficCabins = addInstanced(boxGeo, new THREE.MeshStandardMaterial({
    color: 0xb7d2df,
    roughness: 0.2,
    metalness: 0.35,
  }), trafficCount, false);
  const trafficColors = [0x1d4ed8, 0xb91c1c, 0xf8fafc, 0x334155, 0xd97706, 0x0f766e, 0x7c3aed];
  const trafficColor = new THREE.Color();
  const trafficLanes: Array<{
    index: number;
    x: number;
    y: number;
    yaw: number;
    direction: 1 | -1;
    speed: number;
    offset: number;
  }> = [];
  for (let i = 0; i < trafficCount; i++) {
    const lane = i % 4;
    const x = lane === 0 ? 63 : lane === 1 ? 80 : lane === 2 ? -147 : 247;
    const z = 310 + (i / trafficCount) * 295 + (lane % 2) * 3.2;
    const yaw = lane === 0 ? 0 : lane === 1 ? Math.PI : Math.PI * 0.5;
    const y = groundYAtLocal(x, z);
    dummy.position.set(x, y + 0.42, z);
    dummy.rotation.set(0, yaw, 0);
    dummy.scale.set(lane < 2 ? 1.8 : 3.9, 0.62, lane < 2 ? 3.9 : 1.8);
    dummy.updateMatrix();
    trafficBodies.setMatrixAt(i, dummy.matrix);
    trafficColor.setHex(trafficColors[i % trafficColors.length]);
    trafficBodies.setColorAt(i, trafficColor);
    dummy.position.set(x, y + 0.92, z);
    dummy.scale.set(lane < 2 ? 1.45 : 2.6, 0.52, lane < 2 ? 2.1 : 1.25);
    dummy.updateMatrix();
    trafficCabins.setMatrixAt(i, dummy.matrix);
    if (lane < 2) {
      trafficLanes.push({
        index: i,
        x,
        y,
        yaw,
        direction: lane === 0 ? 1 : -1,
        speed: 5.2 + (i % 3) * 0.8,
        offset: (i / trafficCount) * 295,
      });
    }
  }
  trafficBodies.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  trafficCabins.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  trafficBodies.instanceMatrix.needsUpdate = true;
  trafficBodies.instanceColor!.needsUpdate = true;
  trafficBodies.computeBoundingSphere();
  trafficCabins.instanceMatrix.needsUpdate = true;
  trafficCabins.computeBoundingSphere();

  // ---- Ambient street life: pedestrians, sitters and hydraulic show cars --
  const streetLife = new THREE.Group();
  streetLife.name = 'crescent-city-street-life';
  group.add(streetLife);
  const streetWalkers: THREE.Group[] = [];
  const streetDancers: THREE.Group[] = [];

  const skinMaterials = [0xf1c27d, 0xc68642, 0x8d5524].map(
    (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.86 }),
  );
  const shirtMaterials = [0xb91c1c, 0x1d4ed8, 0x0f766e, 0xf8fafc, 0xd97706, 0x7c3aed].map(
    (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.82 }),
  );
  const jeansMaterial = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.92 });
  const shoeMaterial = new THREE.MeshStandardMaterial({ color: 0x0b0f12, roughness: 0.9 });

  const buildCitizen = (
    shirt: THREE.Material,
    skin: THREE.Material,
    seated: boolean,
  ): THREE.Group => {
    const person = new THREE.Group();
    if (seated) {
      addBox(jeansMaterial, 0.2, 0.2, 0.56, -0.14, 0.46, 0.24, 0, 0, 0, person);
      addBox(jeansMaterial, 0.2, 0.2, 0.56, 0.14, 0.46, 0.24, 0, 0, 0, person);
      addBox(shoeMaterial, 0.22, 0.14, 0.24, -0.14, 0.32, 0.5, 0, 0, 0, person);
      addBox(shoeMaterial, 0.22, 0.14, 0.24, 0.14, 0.32, 0.5, 0, 0, 0, person);
      addBox(shirt, 0.54, 0.62, 0.3, 0, 0.86, 0, 0, 0, 0, person);
      addBox(shirt, 0.13, 0.5, 0.18, -0.34, 0.86, 0.06, 0, 0, 0, person);
      addBox(shirt, 0.13, 0.5, 0.18, 0.34, 0.86, 0.06, 0, 0, 0, person);
      addBox(skin, 0.27, 0.27, 0.27, 0, 1.32, 0, 0, 0, 0, person);
    } else {
      addBox(jeansMaterial, 0.22, 0.8, 0.24, -0.13, 0.4, 0, 0, 0, 0, person);
      addBox(jeansMaterial, 0.22, 0.8, 0.24, 0.13, 0.4, 0, 0, 0, 0, person);
      addBox(shoeMaterial, 0.24, 0.14, 0.4, -0.13, 0.07, 0.08, 0, 0, 0, person);
      addBox(shoeMaterial, 0.24, 0.14, 0.4, 0.13, 0.07, 0.08, 0, 0, 0, person);
      addBox(shirt, 0.54, 0.62, 0.3, 0, 1.1, 0, 0, 0, 0, person);
      addBox(shirt, 0.13, 0.52, 0.18, -0.34, 1.08, 0.02, 0, 0, 0, person);
      addBox(shirt, 0.13, 0.52, 0.18, 0.34, 1.08, 0.02, 0, 0, 0, person);
      addBox(skin, 0.27, 0.27, 0.27, 0, 1.58, 0, 0, 0, 0, person);
    }
    person.userData.dynamic = true;
    return person;
  };

  // Sidewalk strollers. Each walks a short ping-pong route along the curb.
  const walkerSpots = [
    { x: 61.6, z: 352, range: 22, speed: 0.46, phase: 0.2 },
    { x: 61.6, z: 438, range: 16, speed: 0.38, phase: 2.4 },
    { x: 61.6, z: 512, range: 20, speed: 0.5, phase: 4.1 },
    { x: 82.4, z: 366, range: 18, speed: 0.42, phase: 1.1 },
    { x: 82.4, z: 452, range: 24, speed: 0.54, phase: 3.3 },
    { x: 82.4, z: 540, range: 14, speed: 0.36, phase: 5.2 },
    { x: 112, z: 437.2, range: 26, speed: 0.6, phase: 0.8 },
    { x: 154, z: 422.8, range: 20, speed: 0.44, phase: 2.9 },
    { x: 24, z: 438.4, range: 18, speed: 0.5, phase: 4.6 },
    { x: 44, z: 421.6, range: 15, speed: 0.34, phase: 1.7 },
  ];
  for (let i = 0; i < walkerSpots.length; i++) {
    const spot = walkerSpots[i];
    const person = buildCitizen(
      shirtMaterials[i % shirtMaterials.length],
      skinMaterials[i % skinMaterials.length],
      false,
    );
    const y = groundYAtLocal(spot.x, spot.z);
    person.position.set(spot.x, y, spot.z);
    person.userData.walk = {
      baseZ: spot.z,
      baseY: y,
      range: spot.range,
      speed: spot.speed,
      phase: spot.phase,
    };
    streetLife.add(person);
    streetWalkers.push(person);
  }

  // Folks just sitting on stoops and benches — no scripted movement.
  const sitterSpots = [
    { x: 66.2, z: 444.5, yaw: -0.4 },
    { x: 77.8, z: 405.5, yaw: 0.5 },
    { x: 118.6, z: 441.8, yaw: 2.2 },
    { x: 27.4, z: 437.6, yaw: -1.1 },
  ];
  for (let i = 0; i < sitterSpots.length; i++) {
    const spot = sitterSpots[i];
    const y = groundYAtLocal(spot.x, spot.z);
    const bench = new THREE.Group();
    bench.position.set(spot.x, y, spot.z);
    bench.rotation.y = spot.yaw;
    addBox(woodDarkMat, 1.9, 0.12, 0.55, 0, 0.48, 0, 0, 0, 0, bench);
    addBox(woodDarkMat, 1.9, 0.5, 0.1, 0, 0.78, -0.26, 0, 0, 0, bench);
    addBox(ironMat, 0.1, 0.48, 0.44, -0.78, 0.24, 0, 0, 0, 0, bench);
    addBox(ironMat, 0.1, 0.48, 0.44, 0.78, 0.24, 0, 0, 0, 0, bench);
    const person = buildCitizen(
      shirtMaterials[(i + 2) % shirtMaterials.length],
      skinMaterials[(i + 1) % skinMaterials.length],
      true,
    );
    person.position.set(0, 0.12, 0.02);
    bench.add(person);
    streetLife.add(bench);
  }

  // Parked hydraulic show cars. Wheels stay put while the body pumps and tilts.
  const buildHydraulicShowCar = (
    paint: number,
    underglow: number,
    miniTruck: boolean,
  ): { car: THREE.Group; body: THREE.Group } => {
    const car = new THREE.Group();
    const body = new THREE.Group();
    body.userData.dynamic = true;
    car.add(body);
    const paintMat = new THREE.MeshStandardMaterial({
      color: paint,
      roughness: 0.32,
      metalness: 0.45,
    });
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.2,
      metalness: 0.9,
    });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x8ab4c8,
      roughness: 0.12,
      metalness: 0.4,
    });
    addBox(paintMat, 1.95, 0.5, 4.35, 0, 0.58, 0, 0, 0, 0, body);
    addBox(paintMat, 1.7, 0.5, 1.5, 0, 1.0, -1.15, 0, 0, 0, body);
    if (miniTruck) {
      addBox(glassMat, 1.45, 0.34, 0.12, 0, 1.16, -0.44, 0, 0, 0, body);
      addBox(paintMat, 1.8, 0.24, 1.9, 0, 0.82, 1.05, 0, 0, 0, body);
      addBox(paintMat, 0.12, 0.34, 1.9, -0.88, 0.98, 1.05, 0, 0, 0, body);
      addBox(paintMat, 0.12, 0.34, 1.9, 0.88, 0.98, 1.05, 0, 0, 0, body);
    } else {
      addBox(glassMat, 1.6, 0.42, 2.0, 0, 1.02, -0.1, 0, 0, 0, body);
      addBox(paintMat, 1.62, 0.1, 2.05, 0, 1.26, -0.1, 0, 0, 0, body);
    }
    addBox(chromeMat, 2.0, 0.16, 0.18, 0, 0.44, 2.18, 0, 0, 0, body);
    addBox(chromeMat, 2.0, 0.16, 0.18, 0, 0.44, -2.18, 0, 0, 0, body);
    addBox(
      new THREE.MeshBasicMaterial({ color: underglow }),
      1.9,
      0.06,
      3.6,
      0,
      0.28,
      0,
      0,
      0,
      0,
      car,
    );
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.94 });
    for (const sx of [-1, 1]) {
      for (const sz of [-1.35, 1.35]) {
        addBox(chromeMat, 0.3, 0.52, 0.52, sx * 0.95, 0.3, sz, 0, 0, 0, car);
        addBox(tireMat, 0.16, 0.54, 0.54, sx * 1.06, 0.3, sz, 0, 0, 0, car);
      }
    }
    return { car, body };
  };

  const hydraulicSpots = [
    { x: 60.6, z: 392, yaw: 0.04, paint: 0xb91c1c, glow: 0xef4444, miniTruck: false, phase: 0.4, speed: 1.8 },
    { x: 83.4, z: 486, yaw: Math.PI - 0.05, paint: 0x6d28d9, glow: 0xa855f7, miniTruck: true, phase: 2.2, speed: 2.6 },
    { x: 83.4, z: 552, yaw: Math.PI + 0.03, paint: 0x0f766e, glow: 0x22d3ee, miniTruck: false, phase: 4.4, speed: 1.6 },
  ];
  for (const spot of hydraulicSpots) {
    const { car, body } = buildHydraulicShowCar(spot.paint, spot.glow, spot.miniTruck);
    const y = groundYAtLocal(spot.x, spot.z);
    car.position.set(spot.x, y, spot.z);
    car.rotation.y = spot.yaw;
    car.userData.hydraulics = {
      body,
      baseY: 0,
      phase: spot.phase,
      speed: spot.speed,
      tilt: spot.miniTruck ? 0.09 : 0.06,
    };
    streetLife.add(car);
    streetDancers.push(car);
  }

  const streetcarGroup = new THREE.Group();
  streetcarGroup.name = 'canal-street-streetcar';
  streetcarGroup.userData.dynamic = true;
  streetcarGroup.position.set(72, baseY + 0.3, 340);
  group.add(streetcarGroup);
  addBox(
    new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.5, metalness: 0.2 }),
    2.4,
    2.7,
    9.2,
    0,
    1.55,
    0,
    0,
    0,
    0,
    streetcarGroup,
  );
  addBox(
    new THREE.MeshStandardMaterial({ color: 0xfef3c7, emissive: 0xffd166, emissiveIntensity: 0.5, roughness: 0.4 }),
    2.12,
    0.85,
    7.3,
    0,
    2.35,
    0,
    0,
    0,
    0,
    streetcarGroup,
  );
  addBox(ironMat, 2.0, 0.22, 8.4, 0, 0.5, 0, 0, 0, 0, streetcarGroup);
  for (let side = -1; side <= 1; side += 2) {
    addBox(
      new THREE.MeshStandardMaterial({ color: 0x0b0f12, roughness: 0.75 }),
      0.18,
      1.2,
      1.2,
      side * 1.22,
      1.65,
      2.7,
      0,
      0,
      0,
      streetcarGroup,
    );
  }
  const streetcarRoute = [
    { x: 72, z: 320 },
    { x: 72, z: 580 },
  ];
  streetcarGroup.traverse((object) => {
    object.userData.noStaticMerge = true;
  });

  // ---- Crescent City Terminal & streetcar shelter ------------------------
  const terminal = new THREE.Group();
  terminal.position.set(CITY.terminal.x, 0, CITY.terminal.z);
  group.add(terminal);
  const terminalY = groundYAtLocal(CITY.terminal.x, CITY.terminal.z);
  addBox(concreteMat, 6.0, 0.35, 4.2, 0, terminalY + 0.18, 0, 0, 0, 0, terminal);
  addBox(ironMat, 0.22, 4.4, 0.22, -4.8, terminalY + 2.2, 1.2, 0, 0, 0, terminal);
  addBox(ironMat, 0.22, 4.4, 0.22, 4.8, terminalY + 2.2, 1.2, 0, 0, 0, terminal);
  addBox(ironMat, 9.6, 0.22, 0.22, 0, terminalY + 4.4, 1.2, 0, 0, 0, terminal);
  addBox(concreteDarkMat, 4.6, 2.6, 1.1, 0, terminalY + 1.3, 0, 0, 0, 0, terminal);
  addBox(neonAmberMat, 3.2, 1.25, 0.14, 0, terminalY + 1.7, 0.59, 0, 0, 0, terminal);
  addBox(neonAmberMat, 8.0, 0.55, 0.32, 0, terminalY + 4.0, 1.2, 0, 0, 0, terminal);
  addBox(ironMat, 0.18, 2.8, 0.18, -3.6, terminalY + 1.5, -1.2, 0, 0, 0, terminal);
  addBox(ironMat, 0.18, 2.8, 0.18, 3.6, terminalY + 1.5, -1.2, 0, 0, 0, terminal);
  addBox(ironMat, 7.4, 0.16, 0.16, 0, terminalY + 2.9, -1.2, 0, 0, 0, terminal);
  const terminalLight = new THREE.PointLight(0xffb347, 2.2, 26, 1.7);
  terminalLight.position.set(0, terminalY + 2.6, 1.5);
  terminal.add(terminalLight);
  colliders.push({ x: CITY.terminal.x - 3.6, z: CITY.terminal.z - 0.8, radius: 1.0 });
  colliders.push({ x: CITY.terminal.x + 3.6, z: CITY.terminal.z - 0.8, radius: 1.0 });

  // ---- Ground-level stunt ramps ------------------------------------------
  const stuntRamps = [
    { x: 57, z: 405, width: 8, depth: 12, label: 'Bayou Customs launch ramp' },
    { x: 151, z: 430, width: 7, depth: 10, label: 'Highway ramp jump' },
  ];
  for (const ramp of stuntRamps) {
    const y = groundYAtLocal(ramp.x, ramp.z);
    addBox(
      new THREE.MeshStandardMaterial({
        color: 0x3b3f43,
        roughness: 0.76,
        metalness: 0.2,
      }),
      ramp.width,
      0.38,
      ramp.depth,
      ramp.x,
      y + 0.55,
      ramp.z,
      0,
      -0.22,
      0,
    );
    addBox(neonAmberMat, ramp.width + 0.4, 0.12, 0.28, ramp.x, y + 0.78, ramp.z + ramp.depth * 0.5, 0, 0, 0);
  }

  // ---- Street signs / faction colors -------------------------------------
  const signSpots = [
    { x: 62, z: 470, color: 0xa855f7 },
    { x: -22, z: 446, color: 0x22c55e },
    { x: 158, z: 430, color: 0x38bdf8 },
  ];
  for (const spot of signSpots) {
    const y = groundYAtLocal(spot.x, spot.z);
    const mat = new THREE.MeshStandardMaterial({
      color: spot.color,
      emissive: spot.color,
      emissiveIntensity: 1.0,
      roughness: 0.35,
    });
    addBox(ironMat, 0.16, 3.2, 0.16, spot.x, y + 1.6, spot.z);
    addBox(mat, 3.2, 1.1, 0.18, spot.x, y + 3.4, spot.z);
  }

  // Walking pedestrians and pumping show cars are animated by the engine, so
  // they must stay as individual meshes instead of being static-merged.
  for (const animated of [...streetWalkers, ...streetDancers]) {
    animated.traverse((object) => {
      object.userData.noStaticMerge = true;
    });
  }

  // Translate the whole shipped district onto the separated Louisiana shelf.
  group.position.set(LOUISIANA_CITY_OFFSET.x, 0, LOUISIANA_CITY_OFFSET.z);
  group.updateMatrixWorld(true);
  group.traverse((obj) => {
    if (obj === streetcarGroup || obj.userData.dynamic) {
      obj.matrixAutoUpdate = true;
      return;
    }
    obj.updateMatrix();
    obj.matrixAutoUpdate = false;
  });

  const worldColliders = colliders.map((collider) => ({
    x: toWorldX(collider.x),
    z: toWorldZ(collider.z),
    radius: collider.radius,
  }));
  const worldStuntRamps = stuntRamps.map((ramp) => ({
    ...ramp,
    x: toWorldX(ramp.x),
    z: toWorldZ(ramp.z),
  }));

  return {
    group,
    terminalPos: new THREE.Vector3(
      toWorldX(CITY.terminal.x),
      terminalY + 1.4,
      toWorldZ(CITY.terminal.z),
    ),
    garagePos: new THREE.Vector3(
      toWorldX(CITY.garage.x),
      garageY + 1.2,
      toWorldZ(CITY.garage.z + 8),
    ),
    safehousePos: new THREE.Vector3(
      toWorldX(CITY.safehouse.x),
      safeY + 1.2,
      toWorldZ(CITY.safehouse.z + 6.5),
    ),
    docksPos: new THREE.Vector3(toWorldX(bayouX - 4), baseY + 1.1, toWorldZ(bayouZ)),
    vaultPos: new THREE.Vector3(
      toWorldX(CITY.vault.x),
      vaultY + 1.2,
      toWorldZ(CITY.vault.z + 6.8),
    ),
    parkingPos: new THREE.Vector3(
      toWorldX(CITY.parking.x),
      garageY + 1.2,
      toWorldZ(CITY.parking.z + 8),
    ),
    stuntRamps: worldStuntRamps,
    streetcarGroup,
    streetcarRoute,
    colliders: worldColliders,
    streetWalkers,
    streetDancers,
    trafficCars: {
      bodies: trafficBodies,
      cabins: trafficCabins,
      lanes: trafficLanes,
    },
    streetLifeCenter: {
      x: toWorldX(CITY.pos.x),
      z: toWorldZ(CITY.pos.z),
    },
  };
}
