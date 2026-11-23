import * as THREE from 'three';
import {
  COASTER_RELOCATION_FEET,
  COASTER_RELOCATION_METERS,
  MANSION_MAIDS,
  type MaidDefinition,
} from '../systems/mansionMaids';
import {
  HILL_HOUSE_Y,
  PREMADE_MANSION_FLOOR_Y,
  PREMADE_MANSION_POS,
  PREMADE_MANSION_TOP_FLOOR_Y,
  PREMADE_MANSION_UPPER_FLOOR_Y,
} from './terrain';
import type { HouseStationTarget } from './models';

export interface MansionMaidHandle {
  definition: MaidDefinition;
  group: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  startX: number;
  startY: number;
  startZ: number;
}

export interface PremadeMansionHandles {
  group: THREE.Group;
  colliders: { x: number; z: number; radius: number }[];
  stations: HouseStationTarget[];
  maids: MansionMaidHandle[];
  coasterDisplay: THREE.Group;
  coasterBase: { x: number; y: number; z: number };
  poolWaterMat: THREE.MeshStandardMaterial;
}

const FLOOR_GAP = 3.6;
const GROUND_Y = PREMADE_MANSION_FLOOR_Y - HILL_HOUSE_Y;
const SECOND_Y = PREMADE_MANSION_UPPER_FLOOR_Y - HILL_HOUSE_Y;
const THIRD_Y = PREMADE_MANSION_TOP_FLOOR_Y - HILL_HOUSE_Y;
const WALL_H = 10.8;
const HALF_W = 13.2;
const HALF_D = 9.2;

export function createPremadeMansion(): PremadeMansionHandles {
  const group = new THREE.Group();
  group.name = 'premade-hill-house-grand-wing';
  group.position.set(PREMADE_MANSION_POS.x, HILL_HOUSE_Y, PREMADE_MANSION_POS.z);

  const colliders: { x: number; z: number; radius: number }[] = [];
  const stations: HouseStationTarget[] = [];
  const worldX = PREMADE_MANSION_POS.x;
  const worldZ = PREMADE_MANSION_POS.z;
  const stationAt = (
    id: string,
    kind: HouseStationTarget['kind'],
    label: string,
    sublabel: string,
    lx: number,
    ly: number,
    lz: number,
    range = 2.6,
    sit?: { x: number; z: number; yaw: number },
  ) => {
    stations.push({
      id,
      kind,
      label,
      sublabel,
      x: worldX + lx,
      y: HILL_HOUSE_Y + ly,
      z: worldZ + lz,
      range,
      ...(sit
        ? {
            sitX: worldX + sit.x,
            sitY: HILL_HOUSE_Y + ly + 0.12,
            sitZ: worldZ + sit.z,
            sitYaw: sit.yaw,
          }
        : {}),
    });
  };

  // ---------- materials ----------
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x5b544c, roughness: 0.93 });
  const stuccoMat = new THREE.MeshStandardMaterial({ color: 0xe9e0d1, roughness: 0.74 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x3f2d20, roughness: 0.72 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x2f3437, roughness: 0.62, metalness: 0.18 });
  const marbleMat = new THREE.MeshStandardMaterial({ color: 0xe8e2d9, roughness: 0.18, metalness: 0.08 });
  const woodFloorMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.62 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xa8d8f0,
    transparent: true,
    opacity: 0.34,
    roughness: 0.06,
    metalness: 0.15,
    depthWrite: false,
  });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xc9a227, roughness: 0.25, metalness: 0.88 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd7dde2, roughness: 0.16, metalness: 0.94 });
  const blackMat = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.55 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });
  const tileMat = new THREE.MeshStandardMaterial({ color: 0xd9e6ea, roughness: 0.28 });
  const carpetMat = new THREE.MeshStandardMaterial({ color: 0x3f2a3a, roughness: 0.95 });
  const poolMat = new THREE.MeshStandardMaterial({
    color: 0x1aa3c9,
    emissive: 0x0a5f7a,
    emissiveIntensity: 0.55,
    transparent: true,
    opacity: 0.82,
    roughness: 0.08,
    metalness: 0.15,
  });
  const bedFabricColors = [
    0x8c1c13, 0x1e3a8a, 0x166534, 0x7c2d12, 0x6b21a8, 0x0f766e, 0x9f1239, 0x1e293b,
    0x7f1d1d, 0x1d4ed8, 0x065f46, 0x92400e, 0x581c87, 0x115e59, 0xbe123c, 0x334155,
  ];
  const bedFabricMats = bedFabricColors.map(
    (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.9 }),
  );
  const lampMat = new THREE.MeshStandardMaterial({
    color: 0xffe8b8,
    emissive: 0xffc46b,
    emissiveIntensity: 1.2,
    roughness: 0.4,
  });
  const tvScreenMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    emissive: 0x2563eb,
    emissiveIntensity: 0.6,
    roughness: 0.2,
  });

  const addBox = (
    parent: THREE.Object3D,
    material: THREE.Material,
    sx: number,
    sy: number,
    sz: number,
    x: number,
    y: number,
    z: number,
    cast = true,
  ): THREE.Mesh => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = cast;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  const addWindow = (
    parent: THREE.Object3D,
    x: number,
    y: number,
    z: number,
    width: number,
    height: number,
    axis: 'x' | 'z',
  ) => {
    const thickness = 0.08;
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(
        axis === 'z' ? width + 0.26 : thickness + 0.12,
        height + 0.26,
        axis === 'z' ? thickness + 0.12 : width + 0.26,
      ),
      trimMat,
    );
    frame.position.set(x, y, z);
    const pane = new THREE.Mesh(
      new THREE.BoxGeometry(
        axis === 'z' ? width : thickness,
        height,
        axis === 'z' ? thickness : width,
      ),
      glassMat,
    );
    pane.position.set(x, y, z);
    parent.add(frame, pane);
  };

  // ---------- shell ----------
  addBox(group, stoneMat, 28.2, 1.0, 20.2, 0, -0.42, 0);
  addBox(group, marbleMat, 26.4, 0.18, 18.4, 0, 0, 0, false);
  addBox(group, woodFloorMat, 13.0, 0.2, 17.9, 6.4, 0.02, 0, false);
  addBox(group, carpetMat, 12.6, 0.16, 10.4, 0, 0.03, 3.0, false);

  // Exterior walls (ground-to-roof) with a central south entrance.
  const wallT = 0.34;
  addBox(group, stuccoMat, HALF_W * 2, WALL_H, wallT, 0, WALL_H / 2, -HALF_D);
  addBox(group, stuccoMat, wallT, WALL_H, HALF_D * 2, -HALF_W, WALL_H / 2, 0);
  addBox(group, stuccoMat, wallT, WALL_H, HALF_D * 2, HALF_W, WALL_H / 2, 0);
  addBox(group, stuccoMat, HALF_W - 2.4, WALL_H, wallT, -(2.4 + HALF_W) / 2, WALL_H / 2, HALF_D);
  addBox(group, stuccoMat, HALF_W - 2.4, WALL_H, wallT, (2.4 + HALF_W) / 2, WALL_H / 2, HALF_D);
  addBox(group, stuccoMat, 4.8, WALL_H - 3.2, wallT, 0, 3.2 + (WALL_H - 3.2) / 2, HALF_D);

  // Cornice bands, parapet and roof.
  addBox(group, trimMat, HALF_W * 2 + 0.6, 0.28, HALF_D * 2 + 0.6, 0, FLOOR_GAP - 0.2, 0, false);
  addBox(group, trimMat, HALF_W * 2 + 0.6, 0.28, HALF_D * 2 + 0.6, 0, FLOOR_GAP * 2 - 0.2, 0, false);
  addBox(group, roofMat, HALF_W * 2 + 0.9, 0.34, HALF_D * 2 + 0.9, 0, WALL_H + 0.17, 0);
  for (const [x, z, sx, sz] of [
    [0, -HALF_D - 0.3, HALF_W * 2 + 0.9, 0.36],
    [0, HALF_D + 0.3, HALF_W * 2 + 0.9, 0.36],
    [-HALF_W - 0.3, 0, 0.36, HALF_D * 2 + 0.9],
    [HALF_W + 0.3, 0, 0.36, HALF_D * 2 + 0.9],
  ] as const) {
    addBox(group, stuccoMat, sx, 0.72, sz, x, WALL_H + 0.7, z);
  }
  for (const [x, z] of [
    [-7, -5],
    [7, -5],
    [-7, 5],
    [7, 5],
  ] as const) {
    addBox(group, trimMat, 0.9, 1.8, 0.9, x, WALL_H + 0.9, z);
  }

  // Third-floor and second-floor slab edges.
  addBox(group, marbleMat, 26.4, 0.22, 18.4, 0, FLOOR_GAP, 0, false);
  addBox(group, marbleMat, 26.4, 0.22, 18.4, 0, FLOOR_GAP * 2, 0, false);

  // Windows on every storey.
  for (const y of [1.55, 1.55 + FLOOR_GAP, 1.55 + FLOOR_GAP * 2]) {
    for (const x of [-9.4, -4.7, 0, 4.7, 9.4]) {
      addWindow(group, x, y, -HALF_D + 0.02, 1.8, 1.7, 'z');
    }
    for (const z of [-6.2, -2.1, 2.1, 6.2]) {
      addWindow(group, -HALF_W + 0.02, y, z, 1.6, 1.7, 'x');
      addWindow(group, HALF_W - 0.02, y, z, 1.6, 1.7, 'x');
    }
    for (const x of [-9.4, -4.7, 4.7, 9.4]) {
      addWindow(group, x, y, HALF_D - 0.02, 1.8, 1.7, 'z');
    }
  }

  // South entrance: portico, steps, columns and double doors.
  addBox(group, stoneMat, 9.6, 0.24, 3.4, 0, 0.12, HALF_D + 1.55);
  for (let i = 0; i < 5; i++) {
    addBox(group, marbleMat, 8.4, 0.18, 0.64, 0, -0.02 - i * 0.18, HALF_D + 3.1 + i * 0.64);
  }
  for (const x of [-4.4, 4.4]) {
    addBox(group, marbleMat, 0.8, 3.4, 0.8, x, 1.8, HALF_D + 2.3);
    colliders.push({ x: worldX + x, z: worldZ + HALF_D + 2.3, radius: 0.62 });
    addBox(group, goldMat, 0.92, 0.18, 0.92, x, 3.5, HALF_D + 2.3);
  }
  addBox(group, roofMat, 10.4, 0.32, 3.4, 0, 3.8, HALF_D + 1.7);
  addBox(group, trimMat, 4.7, 0.34, 0.28, 0, 3.25, HALF_D);
  addBox(group, trimMat, 0.26, 3.1, 0.3, -2.35, 1.6, HALF_D);
  addBox(group, trimMat, 0.26, 3.1, 0.3, 2.35, 1.6, HALF_D);
  addBox(group, trimMat, 0.16, 2.9, 0.14, -1.15, 1.48, HALF_D - 0.02);
  addBox(group, trimMat, 0.16, 2.9, 0.14, 1.15, 1.48, HALF_D - 0.02);
  const glassDoorL = addBox(group, glassMat, 2.2, 2.7, 0.08, -1.15, 1.45, HALF_D, false);
  const glassDoorR = addBox(group, glassMat, 2.2, 2.7, 0.08, 1.15, 1.45, HALF_D, false);
  glassDoorL.castShadow = false;
  glassDoorR.castShadow = false;

  // Storey-to-storey exterior stairs on the west and east facades.
  const addStair = (
    x0: number,
    z0: number,
    z1: number,
    fromY: number,
    toY: number,
    width: number,
    steps: number,
  ) => {
    const run = (z1 - z0) / steps;
    const rise = (toY - fromY) / steps;
    for (let i = 0; i < steps; i++) {
      addBox(
        group,
        marbleMat,
        width,
        Math.max(0.12, rise),
        Math.abs(run) + 0.03,
        x0,
        fromY + (i + 0.5) * rise,
        z0 + (i + 0.5) * run,
      );
    }
    const rail = addBox(
      group,
      chromeMat,
      width + 0.08,
      0.08,
      Math.abs(z1 - z0) + 0.4,
      x0,
      (fromY + toY) / 2 + 0.95,
      (z0 + z1) / 2,
      false,
    );
    rail.rotation.x = -Math.atan2(toY - fromY, Math.abs(z1 - z0));
  };
  addStair(-15.0, 6.2, -9.0, GROUND_Y, SECOND_Y, 3.4, 22);
  addStair(15.0, 6.2, -9.0, SECOND_Y, THIRD_Y, 3.4, 22);
  addBox(group, marbleMat, 3.6, 0.2, 2.4, -15.0, SECOND_Y - 0.08, -8.2);
  addBox(group, marbleMat, 3.6, 0.2, 2.4, 15.0, THIRD_Y - 0.08, -8.2);

  // ---------- ground floor: indoor pool ----------
  addBox(group, tileMat, 6.6, 0.12, 18.0, -9.9, 0.12, 0, false);
  addBox(group, tileMat, 9.0, 0.12, 18.0, -9.0, 0.1, 0, false);
  addBox(group, poolMat, 4.6, 0.06, 10.4, -9.9, 0.17, 0.2, false);
  for (const [x, z, sx, sz] of [
    [-9.9, -5.2, 4.9, 0.28],
    [-9.9, 5.6, 4.9, 0.28],
    [-12.2, 0.2, 0.28, 10.9],
    [-7.6, 0.2, 0.28, 10.9],
  ] as const) {
    addBox(group, whiteMat, sx, 0.12, sz, x, 0.2, z);
  }
  for (const z of [-3.4, 1.2, 5.0]) {
    addBox(group, whiteMat, 0.9, 0.08, 1.9, -7.1, 0.05, z, false);
    addBox(group, chromeMat, 0.06, 0.55, 0.06, -7.1, 0.32, z + 0.8);
  }
  // Glass pool gallery wall with a central doorway.
  addBox(group, stuccoMat, 0.24, 3.3, 6.4, -6.55, 1.7, -5.4);
  addBox(group, stuccoMat, 0.24, 3.3, 5.4, -6.55, 1.7, 5.9);
  addBox(group, stuccoMat, 0.24, 0.8, 5.6, -6.55, 2.9, 0.2);
  addBox(group, glassMat, 0.06, 2.4, 5.4, -6.55, 1.5, 0.15, false);
  stationAt(
    'mansion_indoor_pool',
    'house_shower',
    'Swim in the Indoor Pool',
    'Heated 12-metre pool inside the glass gallery',
    -9.9,
    GROUND_Y,
    0.2,
    3.4,
  );

  // ---------- ground floor: two music lounges ----------
  const addLounge = (originX: number, accent: number, label: string, stationId: string) => {
    const accentMat = new THREE.MeshStandardMaterial({
      color: accent,
      emissive: accent,
      emissiveIntensity: 0.5,
      roughness: 0.35,
    });
    addBox(group, woodFloorMat, 6.3, 0.14, 8.0, originX, 0.11, -4.9);
    addBox(group, accentMat, 3.4, 0.08, 0.24, originX, 2.65, -8.85, false);
    addBox(group, blackMat, 4.6, 0.32, 1.15, originX, 0.34, -8.15);
    addBox(group, accentMat, 3.8, 0.1, 0.7, originX, 0.55, -8.1, false);
    for (const side of [-1, 1]) {
      addBox(group, blackMat, 0.7, 1.5, 0.7, originX + side * 2.55, 0.86, -8.2);
      addBox(group, chromeMat, 0.5, 0.5, 0.5, originX + side * 2.55, 1.65, -8.2);
    }
    addBox(group, trimMat, 1.4, 0.8, 0.65, originX, 0.55, -6.75);
    addBox(group, accentMat, 1.2, 0.06, 0.5, originX, 0.98, -6.75, false);
    for (const side of [-1, 1]) {
      addBox(group, trimMat, 0.14, 0.1, 0.14, originX + side * 0.42, 1.0, -6.9, false);
    }
    // Wrap-around lounge seating.
    for (const [x, z, sx, sz] of [
      [originX, -4.8, 4.2, 0.9],
      [originX - 2.35, -2.9, 0.95, 3.6],
      [originX + 2.35, -2.9, 0.95, 3.6],
    ] as const) {
      const sofa = addBox(group, accentMat, sx, 0.55, sz, x, 0.4, z);
      sofa.userData.noShadowCast = false;
      addBox(group, carpetMat, sx * 0.85, 0.22, sz * 0.72, x, 0.78, z, false);
    }
    addBox(group, trimMat, 2.2, 0.34, 1.2, originX, 0.3, -1.2);
    stationAt(
      stationId,
      'house_music_studio',
      label,
      'Turntables, live speakers and lounge seating',
      originX,
      GROUND_Y,
      -6.9,
      3.4,
    );
  };
  addLounge(-4.4, 0xd946ef, 'Music Lounge A · Neon Room', 'mansion_music_lounge_a');
  addLounge(4.4, 0x38bdf8, 'Music Lounge B · Blue Room', 'mansion_music_lounge_b');

  // Talking lounge with a conversation pit and fireplace.
  addBox(group, carpetMat, 8.4, 0.08, 4.6, 0, 0.11, 2.9, false);
  addBox(group, trimMat, 0.7, 1.5, 4.8, -4.9, 0.85, 2.9);
  addBox(group, blackMat, 0.9, 0.9, 2.6, -4.9, 0.55, 2.9);
  const fireMat = new THREE.MeshStandardMaterial({
    color: 0xff8a3d,
    emissive: 0xff6a00,
    emissiveIntensity: 1.5,
    roughness: 0.4,
  });
  addBox(group, fireMat, 0.18, 0.55, 1.7, -4.49, 0.55, 2.9, false);
  for (const [x, z, sx, sz] of [
    [0, 4.7, 6.2, 0.95],
    [0, 1.1, 6.2, 0.95],
    [-3.1, 2.9, 0.95, 3.2],
  ] as const) {
    addBox(group, carpetMat, sx, 0.6, sz, x, 0.4, z);
    addBox(group, whiteMat, sx * 0.82, 0.24, sz * 0.72, x, 0.78, z, false);
  }
  addBox(group, trimMat, 2.6, 0.36, 1.3, 0.4, 0.28, 2.9);
  stationAt(
    'mansion_talking_lounge',
    'house_couch',
    'Sit in the Talking Lounge',
    'Conversation pit, fireplace and coffee table',
    0.6,
    GROUND_Y,
    2.9,
    3.2,
    { x: 0.6, z: 3.35, yaw: 0 },
  );

  // ---------- ground floor: kitchen and dining ----------
  addBox(group, tileMat, 6.2, 0.12, 18.0, 9.8, 0.12, 0, false);
  addBox(group, blackMat, 0.9, 0.9, 0.75, 8.0, 0.55, -8.2);
  addBox(group, chromeMat, 0.95, 0.05, 0.8, 8.0, 1.02, -8.2, false);
  for (const dx of [-0.28, 0.28]) {
    addBox(group, fireMat, 0.2, 0.05, 0.2, 8.0 + dx, 1.06, -8.2, false);
  }
  addBox(group, chromeMat, 1.2, 2.0, 0.85, 12.3, 1.0, -8.1);
  addBox(group, trimMat, 1.3, 2.1, 0.18, 12.3, 1.1, -7.65);
  addBox(group, marbleMat, 4.6, 0.12, 1.4, 9.9, 0.98, -2.0);
  addBox(group, trimMat, 4.6, 0.92, 1.4, 9.9, 0.46, -2.0);
  for (const x of [7.2, 9.2, 11.2, 12.6]) {
    addBox(group, chromeMat, 0.55, 0.04, 0.4, x, 1.06, -8.25, false);
  }
  for (const z of [-5.4, -3.4]) {
    addBox(group, whiteMat, 0.55, 0.1, 0.4, 9.9, 1.06, z, false);
  }
  addBox(group, trimMat, 0.3, 0.5, 16.0, 12.8, 0.35, 0);
  for (let i = 0; i < 5; i++) {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.24, 10), chromeMat);
    pot.position.set(10.4, 1.55, -8.5);
    pot.rotation.z = Math.PI / 2;
    group.add(pot);
    pot.translateX(i * 0.55 - 1.1);
  }
  stationAt(
    'mansion_kitchen',
    'house_stove',
    'Cook in the Mansion Kitchen',
    'Professional range, island and walk-in pantry',
    9.9,
    GROUND_Y,
    -2.0,
    3.0,
  );

  // Dining table under a chandelier.
  addBox(group, trimMat, 7.4, 0.24, 2.5, 9.6, 0.85, 5.0);
  for (const x of [6.5, 8.6, 10.7, 12.7]) {
    for (const side of [-1, 1]) {
      addBox(group, trimMat, 0.55, 0.9, 0.55, x, 0.45, 5.0 + side * 1.85);
      addBox(group, whiteMat, 0.45, 0.15, 0.45, x, 0.97, 5.0 + side * 1.85, false);
    }
  }
  for (let i = 0; i < 8; i++) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.5, 8), lampMat);
    cone.position.set(-3.2 + i * 0.92, 2.95, 5.0);
    cone.rotation.x = Math.PI;
    group.add(cone);
  }
  stationAt(
    'mansion_dining',
    'house_couch',
    'Dine in the Grand Dining Room',
    'Seats eight beneath a crystal chandelier',
    9.6,
    GROUND_Y,
    5.0,
    2.8,
    { x: 9.6, z: 6.5, yaw: Math.PI },
  );

  // ---------- east motor court and detailing bay ----------
  addBox(group, stoneMat, 9.6, 0.1, 16.2, 18.4, 0.06, 0.4, false);
  addBox(group, tileMat, 8.8, 0.06, 15.2, 18.4, 0.11, 0.4, false);
  const addDisplayCar = (cx: number, cz: number, paint: number, trunkSpeakers: boolean) => {
    const paintMat = new THREE.MeshStandardMaterial({ color: paint, roughness: 0.3, metalness: 0.45 });
    const car = new THREE.Group();
    addBox(car, paintMat, 4.8, 0.55, 2.1, 0, 0.55, 0);
    addBox(car, paintMat, 2.3, 0.55, 1.85, -0.2, 1.08, 0);
    addBox(car, glassMat, 2.1, 0.4, 1.72, -0.2, 1.15, 0, false);
    for (const side of [-1, 1]) {
      for (const front of [-1, 1]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.22, 12), blackMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(front * 1.55, 0.34, side * 1.02);
        car.add(wheel);
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.24, 10), chromeMat);
        hub.rotation.z = Math.PI / 2;
        hub.position.set(front * 1.55, 0.34, side * 1.02);
        car.add(hub);
      }
    }
    const headMat = new THREE.MeshStandardMaterial({
      color: 0xfff6d5,
      emissive: 0xffe9a8,
      emissiveIntensity: 1.4,
      roughness: 0.2,
    });
    for (const side of [-1, 1]) {
      addBox(car, headMat, 0.1, 0.24, 0.42, 2.41, 0.62, side * 0.66, false);
      addBox(car, fireMat, 0.1, 0.2, 0.36, -2.41, 0.62, side * 0.66, false);
    }
    if (trunkSpeakers) {
      addBox(car, trimMat, 1.3, 0.45, 0.5, -1.7, 0.98, 0.2);
      for (const side of [-1, 1]) {
        const speaker = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.08, 12), chromeMat);
        speaker.rotation.x = Math.PI / 2;
        speaker.position.set(-1.7 + side * 0.36, 1.24, 0.5);
        car.add(speaker);
      }
    }
    // Visible hydraulic pump rack behind each display car.
    for (const side of [-1, 1]) {
      const pump = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.8, 10), chromeMat);
      pump.position.set(-1.9, 1.35, side * 0.62);
      car.add(pump);
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.34, 10), goldMat);
      tank.position.set(-1.9, 1.05, side * 0.62);
      car.add(tank);
    }
    car.position.set(cx, 0.12, cz);
    group.add(car);
    colliders.push({ x: worldX + cx, z: worldZ + cz, radius: 2.3 });
  };
  addDisplayCar(18.2, -5.5, 0x111827, true);
  addDisplayCar(18.2, 2.4, 0x1f2937, false);

  // Hydraulic service rack, speaker test bench and headlight aiming wall.
  addBox(group, trimMat, 1.4, 1.8, 0.7, 18.2, 1.0, -3.7);
  for (const side of [-1, 1]) {
    const pump = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.4, 10), chromeMat);
    pump.position.set(18.2 + side * 0.34, 1.1, -3.7);
    group.add(pump);
    const hose = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.035, 8, 14, Math.PI), blackMat);
    hose.rotation.x = Math.PI / 2;
    hose.position.set(18.2 + side * 0.34, 0.72, -3.7);
    group.add(hose);
  }
  addBox(group, blackMat, 1.8, 2.0, 0.8, 16.8, 1.1, 4.4);
  for (const side of [-1, 1]) {
    const speaker = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.12, 14), chromeMat);
    speaker.rotation.z = Math.PI / 2;
    speaker.position.set(16.8 + side * 0.3, 1.4, 4.82);
    group.add(speaker);
  }
  addBox(group, stuccoMat, 6.2, 2.6, 0.24, 18.2, 1.5, -7.2);
  for (const side of [-1, 1]) {
    const lamp = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 0.12, 14),
      new THREE.MeshStandardMaterial({
        color: 0xfff6d5,
        emissive: 0xffe9a8,
        emissiveIntensity: 1.6,
        roughness: 0.2,
      }),
    );
    lamp.rotation.x = Math.PI / 2;
    lamp.position.set(18.2 + side * 1.2, 1.55, -7.02);
    group.add(lamp);
  }

  // ---------- north garden pavilion: second kitchen, tiki bar, library, study ----------
  const pavZ0 = -21.2;
  const pavZ1 = -9.2;
  addBox(group, marbleMat, 26.4, 0.18, pavZ1 - pavZ0, 0, 0.0, (pavZ0 + pavZ1) / 2, false);
  addBox(group, stuccoMat, 26.8, 3.5, 0.34, 0, 1.75, pavZ0);
  addBox(group, stuccoMat, 0.34, 3.5, pavZ1 - pavZ0, -13.2, 1.75, (pavZ0 + pavZ1) / 2);
  addBox(group, stuccoMat, 0.34, 3.5, pavZ1 - pavZ0, 13.2, 1.75, (pavZ0 + pavZ1) / 2);
  addBox(group, roofMat, 27.0, 0.3, pavZ1 - pavZ0 + 0.5, 0, 3.55, (pavZ0 + pavZ1) / 2);
  addBox(group, trimMat, 26.8, 0.22, 0.24, 0, 3.25, pavZ0 + 0.2);
  for (const x of [-9.2, -4.6, 0, 4.6, 9.2]) {
    addWindow(group, x, 1.6, pavZ0 + 0.02, 1.8, 1.6, 'z');
  }
  for (const z of [-18.3, -14.0, -11.0]) {
    addWindow(group, -13.18, 1.6, z, 1.5, 1.6, 'x');
    addWindow(group, 13.18, 1.6, z, 1.5, 1.6, 'x');
  }
  // Wide glazed opening between the pavilion and the main mansion.
  addBox(group, stuccoMat, 26.8, 3.5, 0.3, 0, 1.75, pavZ1);
  addBox(group, glassMat, 9.0, 2.6, 0.06, 0, 1.4, pavZ1 + 0.17, false);
  addBox(group, trimMat, 9.2, 0.26, 0.2, 0, 2.75, pavZ1 + 0.17);
  // Internal subdivisions.
  for (const x of [-4.5, 1.5, 6.5]) {
    addBox(group, stuccoMat, 0.18, 2.9, 11.4, x, 1.45, (pavZ0 + pavZ1) / 2);
  }
  addBox(group, stuccoMat, 6.0, 2.9, 0.18, 9.5, 1.45, -14.5);

  // Garden living room (functional second living room).
  addBox(group, carpetMat, 7.4, 0.07, 9.6, -8.7, 0.11, -15.4, false);
  for (const [x, z, sx, sz] of [
    [-8.7, -11.4, 6.0, 0.95],
    [-8.7, -19.2, 6.0, 0.95],
    [-12.0, -15.3, 0.95, 6.8],
  ] as const) {
    addBox(group, trimMat, sx, 0.6, sz, x, 0.4, z);
    addBox(group, whiteMat, sx * 0.84, 0.22, sz * 0.7, x, 0.78, z, false);
  }
  addBox(group, trimMat, 2.6, 0.35, 1.4, -8.7, 0.28, -15.2);
  addBox(group, blackMat, 3.0, 1.65, 0.16, -8.7, 1.85, -20.9);
  addBox(group, tvScreenMat, 2.7, 1.4, 0.04, -8.7, 1.85, -20.8, false);
  stationAt(
    'hill_house_living_garden',
    'house_couch',
    'Garden Living Room',
    'Second functional living room with fireplace TV',
    -8.7,
    GROUND_Y,
    -15.2,
    3.1,
    { x: -8.7, z: -14.1, yaw: 0 },
  );

  // Library with floor-to-ceiling shelves.
  addBox(group, carpetMat, 5.6, 0.07, 10.2, -1.5, 0.11, -15.2, false);
  for (let shelf = 0; shelf < 4; shelf++) {
    const z = -19.8 + shelf * 2.4;
    addBox(group, trimMat, 5.2, 2.6, 0.6, -1.5, 1.3, z);
    for (let row = 0; row < 4; row++) {
      for (let book = 0; book < 11; book++) {
        addBox(
          group,
          bedFabricMats[(row * 11 + book + shelf) % bedFabricMats.length],
          0.12,
          0.36,
          0.42,
          -3.9 + book * 0.44,
          0.5 + row * 0.55,
          z + 0.36,
          false,
        );
      }
    }
  }
  addBox(group, trimMat, 1.5, 0.45, 1.2, 0.2, 0.28, -13.4);
  addBox(group, carpetMat, 0.9, 0.5, 0.9, 0.2, 0.7, -13.4);
  addBox(group, lampMat, 0.18, 0.32, 0.18, 0.2, 1.4, -13.4, false);
  stationAt(
    'hill_house_library',
    'house_couch',
    'Read in the Library',
    'Floor-to-ceiling shelves and reading chair',
    0.2,
    GROUND_Y,
    -13.4,
    2.8,
    { x: 0.2, z: -13.5, yaw: 0 },
  );

  // Study with desk and built-in bookcase.
  addBox(group, carpetMat, 4.2, 0.07, 10.2, 4.0, 0.11, -15.2, false);
  addBox(group, trimMat, 2.8, 0.12, 1.2, 4.0, 0.9, -17.2);
  addBox(group, trimMat, 0.16, 0.85, 1.1, 4.0, 0.46, -17.2);
  addBox(group, trimMat, 0.8, 1.0, 0.8, 4.0, 0.52, -15.9);
  addBox(group, trimMat, 0.7, 2.5, 3.6, 5.6, 1.25, -12.8);
  for (let i = 0; i < 3; i++) {
    addBox(group, bedFabricMats[i + 3], 0.1, 0.36, 0.5, 5.25, 0.55 + i * 0.62, -13.7, false);
  }
  addBox(group, lampMat, 0.16, 0.28, 0.16, 4.75, 1.15, -16.8, false);
  stationAt(
    'hill_house_study',
    'house_couch',
    'Study at the Writing Desk',
    'Private study with desk, chair and bookshelf',
    4.0,
    GROUND_Y,
    -15.9,
    2.7,
    { x: 4.0, z: -15.9, yaw: 0 },
  );

  // Summer kitchen (second, separate kitchen) and tiki bar.
  addBox(group, tileMat, 5.8, 0.08, 5.6, 9.6, 0.12, -17.6, false);
  addBox(group, trimMat, 5.6, 0.9, 1.2, 9.6, 0.46, -19.8);
  addBox(group, marbleMat, 5.8, 0.12, 1.4, 9.6, 0.98, -19.8);
  addBox(group, blackMat, 0.9, 0.8, 0.7, 8.1, 0.55, -19.8);
  for (const dx of [-0.25, 0.25]) {
    addBox(group, fireMat, 0.18, 0.05, 0.18, 8.1 + dx, 1.04, -19.8, false);
  }
  addBox(group, chromeMat, 1.1, 1.9, 0.8, 12.2, 0.98, -19.8);
  addBox(group, marbleMat, 2.8, 0.12, 1.1, 10.4, 0.98, -16.6);
  addBox(group, trimMat, 2.8, 0.9, 1.1, 10.4, 0.46, -16.6);
  addBox(group, chromeMat, 0.5, 0.05, 0.4, 10.4, 1.06, -16.6, false);
  stationAt(
    'hill_house_summer_kitchen',
    'house_stove',
    'Cook in the Summer Kitchen',
    'Second full kitchen with range, prep island and refrigerator',
    10.4,
    GROUND_Y,
    -16.6,
    2.9,
  );

  // Thatched tiki bar with milk, food and stools.
  addBox(group, tileMat, 5.8, 0.08, 4.6, 9.6, 0.12, -11.6, false);
  addBox(group, trimMat, 5.4, 1.1, 0.9, 9.6, 0.6, -13.4);
  addBox(group, marbleMat, 5.7, 0.12, 1.1, 9.6, 1.2, -13.4);
  for (const x of [7.5, 9.1, 10.7, 12.3]) {
    addBox(group, trimMat, 0.5, 0.85, 0.5, x, 0.45, -11.7);
  }
  for (let i = 0; i < 4; i++) {
    addBox(group, roofMat, 5.8, 0.18, 0.9, 9.6, 3.15 + i * 0.12, -12.4 + i * 0.9);
  }
  for (let i = 0; i < 7; i++) {
    const bottle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.24, 8),
      new THREE.MeshStandardMaterial({
        color: [0x38bdf8, 0xf59e0b, 0x22c55e, 0xef4444][i % 4],
        roughness: 0.25,
      }),
    );
    bottle.position.set(7.4 + i * 0.62, 1.38, -13.55);
    group.add(bottle);
  }
  addBox(group, whiteMat, 0.32, 0.55, 0.32, 12.0, 1.45, -13.55, false);
  addBox(group, whiteMat, 0.18, 0.1, 0.1, 11.92, 1.79, -13.55, false);
  addBox(group, goldMat, 0.22, 0.22, 0.22, 8.7, 1.36, -12.9, false);
  stationAt(
    'hill_house_tiki_bar',
    'house_fridge',
    'Order at the Tiki Bar',
    'Tropical bar with milk, food and cold drinks',
    9.6,
    GROUND_Y,
    -12.7,
    2.7,
  );

  // ---------- 16 guest suites across the second and third storeys ----------
  const roomCenters = [-9.3, -3.1, 3.1, 9.3];
  const suiteDefs: {
    id: string;
    floor: number;
    y: number;
    x: number;
    side: -1 | 1;
  }[] = [];
  let suiteNumber = 1;
  for (const [floorIndex, floorY] of [
    [2, SECOND_Y],
    [3, THIRD_Y],
  ] as const) {
    // Corridor carpet and skirting.
    addBox(group, carpetMat, 25.6, 0.06, 4.4, 0, floorY + 0.04, 0, false);
    addBox(group, trimMat, 25.6, 0.16, 0.18, 0, floorY + 0.12, 2.35, false);
    addBox(group, trimMat, 25.6, 0.16, 0.18, 0, floorY + 0.12, -2.35, false);
    // Corridor walls with wide door openings.
    for (const side of [-1, 1]) {
      for (let col = 0; col < 4; col++) {
        const cx = roomCenters[col];
        addBox(group, stuccoMat, 4.7, 2.9, 0.16, cx, floorY + 1.45, side * 2.65);
        addBox(group, trimMat, 1.15, 2.2, 0.12, cx, floorY + 1.1, side * 2.56);
        addBox(group, goldMat, 1.28, 0.12, 0.16, cx, floorY + 2.24, side * 2.56);
      }
    }
    for (const side of [-1, 1] as const) {
      for (let col = 0; col < 4; col++) {
        const x = roomCenters[col];
        const z = side * 6;
        const fabric = bedFabricMats[suiteNumber - 1];
        const room = new THREE.Group();
        room.position.set(0, floorY, 0);
        room.name = `mansion-suite-${suiteNumber}`;
        group.add(room);
        addBox(room, carpetMat, 5.6, 0.05, 5.3, x, 0.03, z, false);
        // Bed against the outer wall, headboard facing the corridor.
        const bedZ = side < 0 ? -7.3 : 7.3;
        addBox(room, trimMat, 2.5, 0.34, 1.9, x - 0.9, 0.24, bedZ);
        addBox(room, fabric, 2.32, 0.28, 1.72, x - 0.9, 0.55, bedZ);
        addBox(room, whiteMat, 2.2, 0.12, 0.55, x - 0.9, 0.72, bedZ + side * 0.5, false);
        addBox(room, trimMat, 2.55, 1.15, 0.14, x - 0.9, 0.6, bedZ + side * 0.98);
        for (const dx of [-0.65, 0.65]) {
          const pillow = addBox(room, whiteMat, 0.62, 0.14, 0.48, x - 0.9 + dx, 0.74, bedZ - side * 0.45, false);
          pillow.rotation.x = side * 0.04;
        }
        for (const dx of [-1.95, 0.15]) {
          addBox(room, trimMat, 0.52, 0.55, 0.5, x + dx, 0.3, bedZ + side * 0.8);
          const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 0.34, 10), lampMat);
          lamp.position.set(x + dx, 0.74, bedZ + side * 0.8);
          lamp.castShadow = false;
          room.add(lamp);
        }
        // Bathroom pod in the corridor-side corner.
        const bathX = x + 2.0;
        const bathZ = side < 0 ? -4.4 : 4.4;
        addBox(room, tileMat, 2.0, 0.05, 2.3, bathX, 0.04, bathZ, false);
        addBox(room, glassMat, 0.06, 2.2, 2.3, bathX - 1.0, 1.1, bathZ, false);
        addBox(room, glassMat, 2.0, 2.2, 0.06, bathX, 1.1, bathZ + (side < 0 ? 1.12 : -1.12), false);
        addBox(room, whiteMat, 0.55, 0.5, 0.64, bathX + 0.45, 0.27, bathZ - 0.55);
        addBox(room, whiteMat, 0.55, 0.6, 0.26, bathX + 0.45, 0.66, bathZ - 0.83);
        addBox(room, trimMat, 1.1, 0.76, 0.55, bathX - 0.35, 0.4, bathZ + 0.6);
        addBox(room, whiteMat, 0.8, 0.1, 0.36, bathX - 0.35, 0.8, bathZ + 0.6, false);
        addBox(room, chromeMat, 0.06, 1.7, 0.06, bathX + 0.75, 1.0, bathZ + 0.8);
        addBox(room, chromeMat, 0.34, 0.08, 0.34, bathX + 0.75, 1.86, bathZ + 0.8, false);
        // Wardrobe, luggage bench, rug and artwork.
        addBox(room, trimMat, 0.7, 2.2, 2.5, x - 2.45, 1.1, z + (side < 0 ? 0.2 : -0.2));
        addBox(room, trimMat, 1.5, 0.45, 0.5, x + 1.7, 0.25, side * 3.7);
        const art = new THREE.Mesh(
          new THREE.BoxGeometry(1.6, 0.9, 0.06),
          new THREE.MeshStandardMaterial({
            color: bedFabricColors[suiteNumber - 1],
            roughness: 0.7,
          }),
        );
        art.position.set(x, 1.9, side * 8.95);
        room.add(art);
        addBox(room, goldMat, 1.78, 0.08, 0.1, x, 2.42, side * 8.92, false);
        addBox(room, goldMat, 1.78, 0.08, 0.1, x, 1.38, side * 8.92, false);
        addWindow(room, x, 1.75, side * 9.15, 1.9, 1.6, 'z');

        suiteDefs.push({ id: `suite_${suiteNumber}`, floor: floorIndex, y: floorY, x, side });
        stationAt(
          `mansion_${suiteDefs[suiteDefs.length - 1].id}_bed`,
          'house_bed',
          `Sleep in Mansion Suite ${suiteNumber}`,
          `${floorIndex === 2 ? 'Second' : 'Third'} storey · king bed and en-suite`,
          x - 0.9,
          floorY,
          bedZ + side * 0.2,
          3.0,
        );
        stationAt(
          `mansion_${suiteDefs[suiteDefs.length - 1].id}_bath`,
          'house_shower',
          `Use Suite ${suiteNumber} Bathroom`,
          'Glass shower, vanity and private toilet',
          bathX,
          floorY,
          bathZ,
          2.4,
        );
        suiteNumber += 1;
      }
    }
  }

  // Third-floor landing lounge.
  addBox(group, carpetMat, 5.0, 0.06, 3.4, 0, THIRD_Y + 0.04, 0, false);
  for (const side of [-1, 1]) {
    addBox(group, trimMat, 2.0, 0.55, 0.9, side * 2.2, THIRD_Y + 0.35, 0.2);
    addBox(group, whiteMat, 1.8, 0.2, 0.74, side * 2.2, THIRD_Y + 0.6, 0.2, false);
  }
  addBox(group, trimMat, 1.4, 0.3, 0.8, 0, THIRD_Y + 0.22, 0.2);

  // ---------- maid NPCs ----------
  const maids: MansionMaidHandle[] = [];
  const makeMaid = (definition: MaidDefinition): MansionMaidHandle => {
    const maid = new THREE.Group();
    maid.name = `mansion-maid-${definition.id}`;
    const skirtMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.82 });
    const blouseMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.7 });
    const apronMat = new THREE.MeshStandardMaterial({
      color: definition.uniform === 'detailer' ? 0x334155 : 0xffffff,
      roughness: 0.75,
    });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0x8d5524, roughness: 0.72 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 0.9 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.6 });

    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.62, 0.28), skirtMat);
    legs.position.y = 0.31;
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 0.5, 10), skirtMat);
    skirt.position.y = 0.72;
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.58, 0.3), blouseMat);
    torso.position.y = 1.18;
    const apron = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.66, 0.08), apronMat);
    apron.position.set(0, 0.98, 0.17);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 12), skinMat);
    head.position.y = 1.66;
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.21, 12, 10), hairMat);
    hair.scale.set(1.05, 0.9, 1.02);
    hair.position.set(0, 1.72, -0.03);
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), hairMat);
    bun.position.set(0, 1.84, -0.16);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.1, 12), apronMat);
    cap.position.y = 1.86;
    const shoulderL = new THREE.Group();
    shoulderL.position.set(-0.33, 1.38, 0);
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.55, 0.15), blouseMat);
    armL.position.y = -0.27;
    const handL = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 8), skinMat);
    handL.position.y = -0.56;
    shoulderL.add(armL, handL);
    const shoulderR = new THREE.Group();
    shoulderR.position.set(0.33, 1.38, 0);
    const armR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.55, 0.15), blouseMat);
    armR.position.y = -0.27;
    const handR = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 8), skinMat);
    handR.position.y = -0.56;
    shoulderR.add(armR, handR);
    maid.add(legs, skirt, torso, apron, head, hair, bun, cap, shoulderL, shoulderR);

    // Role prop in the right hand.
    if (definition.uniform === 'classic') {
      const tray = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.035, 14), chromeMat);
      tray.position.set(0.06, -0.62, 0.16);
      shoulderR.add(tray);
      const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.16, 8), glassMat);
      glass.position.set(0.06, -0.52, 0.16);
      shoulderR.add(glass);
    } else if (definition.uniform === 'housekeeping' || definition.uniform === 'laundry') {
      const broom = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.3, 6), trimMat);
      broom.position.set(0.06, -0.88, 0.18);
      broom.rotation.z = 0.16;
      shoulderR.add(broom);
      const headBroom = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.18), goldMat);
      headBroom.position.set(0.17, -1.5, 0.18);
      shoulderR.add(headBroom);
    } else if (definition.uniform === 'detailer') {
      const rag = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.06, 0.26), apronMat);
      rag.position.set(0.04, -0.6, 0.1);
      shoulderR.add(rag);
      const spray = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.28, 8), apronMat);
      spray.position.set(-0.26, -0.5, 0.08);
      shoulderL.add(spray);
    } else {
      const wrench = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.46, 0.05), chromeMat);
      wrench.position.set(0.04, -0.84, 0.12);
      shoulderR.add(wrench);
    }

    for (const object of [maid]) {
      object.traverse((child) => {
        child.userData.noStaticMerge = true;
        child.userData.dynamic = true;
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = false;
        }
      });
    }
    const start = definition.route[0];
    maid.position.set(start.x, start.y, start.z);
    group.add(maid);
    const handle: MansionMaidHandle = {
      definition,
      group: maid,
      armL: shoulderL,
      armR: shoulderR,
      startX: start.x,
      startY: start.y,
      startZ: start.z,
    };
    maids.push(handle);
    return handle;
  };
  for (const definition of MANSION_MAIDS) makeMaid(definition);

  // ---------- superhuman coaster display on the east lawn ----------
  const coasterDisplay = new THREE.Group();
  coasterDisplay.name = 'mansion-coaster-display';
  const coasterX = 16.4;
  const coasterZ = 7.4;
  coasterDisplay.position.set(coasterX, GROUND_Y, coasterZ);
  const railMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.4, metalness: 0.5 });
  const railDark = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.5, metalness: 0.55 });
  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 7.0), railMat);
    rail.position.set(side * 0.55, 0.55, 0);
    coasterDisplay.add(rail);
  }
  for (let i = 0; i < 5; i++) {
    const z = -3.0 + i * 1.5;
    const support = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55 + i * 0.16, 0.14), railDark);
    support.position.set(0, (0.55 + i * 0.16) / 2, z);
    coasterDisplay.add(support);
    const tie = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.09, 0.12), railDark);
    tie.position.set(0, 0.55 + i * 0.16, z);
    coasterDisplay.add(tie);
  }
  const car = new THREE.Group();
  const carBody = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, 1.6), railMat);
  carBody.position.y = 0.96;
  const carNose = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.14, 0.5), railDark);
  carNose.position.set(0, 0.76, 0.95);
  car.add(carBody, carNose);
  for (const side of [-1, 1]) {
    for (const z of [-0.5, 0.5]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.1, 10), railDark);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(side * 0.6, 0.72, z);
      car.add(wheel);
    }
  }
  coasterDisplay.add(car);
  const coasterSign = new THREE.Mesh(
    new THREE.BoxGeometry(3.0, 0.5, 0.08),
    new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0x9a3412,
      emissiveIntensity: 0.4,
      roughness: 0.4,
    }),
  );
  coasterSign.position.set(0, 2.1, -3.4);
  coasterDisplay.add(coasterSign);
  coasterDisplay.traverse((object) => {
    object.userData.noStaticMerge = true;
    object.userData.dynamic = true;
  });
  group.add(coasterDisplay);
  stationAt(
    'mansion_maid_feat',
    'house_couch',
    'Watch Bianca Move the Coaster',
    `One hand · ${COASTER_RELOCATION_METERS.toFixed(1)} m (${COASTER_RELOCATION_FEET.toLocaleString()} ft) away from the waterpark`,
    16.4,
    GROUND_Y,
    7.4,
    3.2,
  );

  return {
    group,
    colliders,
    stations,
    maids,
    coasterDisplay,
    coasterBase: { x: coasterX, y: GROUND_Y, z: coasterZ },
    poolWaterMat: poolMat,
  };
}
