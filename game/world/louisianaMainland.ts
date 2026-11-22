import * as THREE from 'three';
import {
  CRESCENT_CITY_DOCKS_POS,
  CRESCENT_CITY_GARAGE_POS,
  CRESCENT_CITY_PARKING_POS,
  CRESCENT_CITY_POS,
  CRESCENT_CITY_SAFEHOUSE_POS,
  CRESCENT_CITY_TERMINAL_POS,
  CRESCENT_CITY_VAULT_POS,
  getTerrainHeight,
} from './terrain';

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
  colliders: { x: number; z: number; radius: number }[];
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

  const baseY = getTerrainHeight(CRESCENT_CITY_POS.x, CRESCENT_CITY_POS.z) + 0.03;
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
  const asphalt = addInstanced(boxGeo, asphaltMat, 12, false);
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
  ];
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
  const sidewalk = addInstanced(boxGeo, concreteMat, 8, false);
  const sidewalks = [
    { x: 72, z: 430, w: 1.6, d: 150, dx: -8.3 },
    { x: 72, z: 430, w: 1.6, d: 150, dx: 8.3 },
    { x: 72, z: 430, w: 208, d: 1.6, dz: -7.3 },
    { x: 72, z: 430, w: 208, d: 1.6, dz: 7.3 },
    { x: 32, z: 430, w: 1.2, d: 96, dx: -5.1 },
    { x: 32, z: 430, w: 1.2, d: 96, dx: 5.1 },
    { x: 120, z: 430, w: 1.2, d: 96, dx: -5.1 },
    { x: 120, z: 430, w: 1.2, d: 96, dx: 5.1 },
  ];
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
    { x: CRESCENT_CITY_GARAGE_POS.x, z: CRESCENT_CITY_GARAGE_POS.z, radius: 19 },
    { x: CRESCENT_CITY_SAFEHOUSE_POS.x, z: CRESCENT_CITY_SAFEHOUSE_POS.z, radius: 14 },
    { x: CRESCENT_CITY_VAULT_POS.x, z: CRESCENT_CITY_VAULT_POS.z, radius: 12 },
    { x: CRESCENT_CITY_TERMINAL_POS.x, z: CRESCENT_CITY_TERMINAL_POS.z, radius: 12 },
  ];
  const blocks = [
    { x0: 8, x1: 60, z0: 352, z1: 408 },
    { x0: 84, x1: 158, z0: 352, z1: 408 },
    { x0: 8, x1: 60, z0: 452, z1: 502 },
    { x0: 84, x1: 158, z0: 452, z1: 502 },
  ];
  const lots: BuildingLot[] = [];
  for (let b = 0; b < blocks.length; b++) {
    const block = blocks[b];
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 3; col++) {
        const w = 9 + rand() * 7;
        const d = 9 + rand() * 7;
        const x = block.x0 + 9 + col * ((block.x1 - block.x0 - 18) / 2) + (rand() - 0.5) * 2;
        const z = block.z0 + 8 + row * ((block.z1 - block.z0 - 16) / 1.35) + (rand() - 0.5) * 2;
        // Keep the two side streets and the central boulevard clear.
        if (Math.abs(x - 32) < 8.5 || Math.abs(x - 120) < 8.5) continue;
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
    const y = getTerrainHeight(lot.x, lot.z);
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
    const y = getTerrainHeight(spot.x, spot.z);
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
    const y = getTerrainHeight(spot.x, spot.z);
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
  garage.position.set(CRESCENT_CITY_GARAGE_POS.x, 0, CRESCENT_CITY_GARAGE_POS.z);
  group.add(garage);
  const garageY = getTerrainHeight(CRESCENT_CITY_GARAGE_POS.x, CRESCENT_CITY_GARAGE_POS.z);
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
        x: CRESCENT_CITY_GARAGE_POS.x + ix * 10.2,
        z: CRESCENT_CITY_GARAGE_POS.z + iz * 11.6,
        radius: 1.3,
      });
    }
  }

  // ---- Safehouse, workbench & stash locker --------------------------------
  const safehouse = new THREE.Group();
  safehouse.position.set(CRESCENT_CITY_SAFEHOUSE_POS.x, 0, CRESCENT_CITY_SAFEHOUSE_POS.z);
  group.add(safehouse);
  const safeY = getTerrainHeight(CRESCENT_CITY_SAFEHOUSE_POS.x, CRESCENT_CITY_SAFEHOUSE_POS.z);
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
  colliders.push({ x: CRESCENT_CITY_SAFEHOUSE_POS.x + 4.6, z: CRESCENT_CITY_SAFEHOUSE_POS.z - 1.2, radius: 2.2 });
  colliders.push({ x: CRESCENT_CITY_SAFEHOUSE_POS.x - 4.6, z: CRESCENT_CITY_SAFEHOUSE_POS.z - 1.2, radius: 2.2 });

  // ---- Flood tunnel bunker / vault entrance -------------------------------
  const vault = new THREE.Group();
  vault.position.set(CRESCENT_CITY_VAULT_POS.x, 0, CRESCENT_CITY_VAULT_POS.z);
  group.add(vault);
  const vaultY = getTerrainHeight(CRESCENT_CITY_VAULT_POS.x, CRESCENT_CITY_VAULT_POS.z);
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
  colliders.push({ x: CRESCENT_CITY_VAULT_POS.x - 6.2, z: CRESCENT_CITY_VAULT_POS.z, radius: 2.4 });
  colliders.push({ x: CRESCENT_CITY_VAULT_POS.x + 6.2, z: CRESCENT_CITY_VAULT_POS.z, radius: 2.4 });

  // ---- Bayou, cypress swamp & wooden docks --------------------------------
  const bayouX = CRESCENT_CITY_DOCKS_POS.x;
  const bayouZ = CRESCENT_CITY_DOCKS_POS.z;
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
    const cy = getTerrainHeight(cx, cz);
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

  // ---- Crescent City Terminal & streetcar shelter ------------------------
  const terminal = new THREE.Group();
  terminal.position.set(CRESCENT_CITY_TERMINAL_POS.x, 0, CRESCENT_CITY_TERMINAL_POS.z);
  group.add(terminal);
  const terminalY = getTerrainHeight(CRESCENT_CITY_TERMINAL_POS.x, CRESCENT_CITY_TERMINAL_POS.z);
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
  colliders.push({ x: CRESCENT_CITY_TERMINAL_POS.x - 3.6, z: CRESCENT_CITY_TERMINAL_POS.z - 0.8, radius: 1.0 });
  colliders.push({ x: CRESCENT_CITY_TERMINAL_POS.x + 3.6, z: CRESCENT_CITY_TERMINAL_POS.z - 0.8, radius: 1.0 });

  // ---- Ground-level stunt ramps ------------------------------------------
  const stuntRamps = [
    { x: 57, z: 405, width: 8, depth: 12, label: 'Bayou Customs launch ramp' },
    { x: 151, z: 430, width: 7, depth: 10, label: 'Highway ramp jump' },
  ];
  for (const ramp of stuntRamps) {
    const y = getTerrainHeight(ramp.x, ramp.z);
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
    const y = getTerrainHeight(spot.x, spot.z);
    const mat = new THREE.MeshStandardMaterial({
      color: spot.color,
      emissive: spot.color,
      emissiveIntensity: 1.0,
      roughness: 0.35,
    });
    addBox(ironMat, 0.16, 3.2, 0.16, spot.x, y + 1.6, spot.z);
    addBox(mat, 3.2, 1.1, 0.18, spot.x, y + 3.4, spot.z);
  }

  // Static matrix updates: the whole district is frozen after build.
  group.updateMatrixWorld(true);
  group.traverse((obj) => {
    obj.updateMatrix();
    obj.matrixAutoUpdate = false;
  });

  return {
    group,
    terminalPos: new THREE.Vector3(
      CRESCENT_CITY_TERMINAL_POS.x,
      terminalY + 1.4,
      CRESCENT_CITY_TERMINAL_POS.z,
    ),
    garagePos: new THREE.Vector3(
      CRESCENT_CITY_GARAGE_POS.x,
      garageY + 1.2,
      CRESCENT_CITY_GARAGE_POS.z + 8,
    ),
    safehousePos: new THREE.Vector3(
      CRESCENT_CITY_SAFEHOUSE_POS.x,
      safeY + 1.2,
      CRESCENT_CITY_SAFEHOUSE_POS.z + 6.5,
    ),
    docksPos: new THREE.Vector3(bayouX - 4, baseY + 1.1, bayouZ),
    vaultPos: new THREE.Vector3(
      CRESCENT_CITY_VAULT_POS.x,
      vaultY + 1.2,
      CRESCENT_CITY_VAULT_POS.z + 6.8,
    ),
    parkingPos: new THREE.Vector3(
      CRESCENT_CITY_PARKING_POS.x,
      garageY + 1.2,
      CRESCENT_CITY_PARKING_POS.z + 8,
    ),
    stuntRamps,
    colliders,
  };
}
