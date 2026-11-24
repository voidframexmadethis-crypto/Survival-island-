import * as THREE from 'three';
import { roundedBox } from './roundedBox';
import type { PbrTextureSet } from './textures';
import type { FirearmSoundProfile, ItemId } from '../types';

/**
 * Visual families for the first-person firearms. The old rig stretched one
 * pistol into every long gun, which is why rifles and the endgame guns read as
 * square blocks. These families give each weapon a real receiver, stock,
 * handguard, magazine and muzzle silhouette.
 */
export type FirearmModelKind =
  | 'pistol'
  | 'revolver'
  | 'smg'
  | 'rifle_ak'
  | 'rifle_ar'
  | 'rifle_battle'
  | 'shotgun'
  | 'shotgun_double'
  | 'sniper'
  | 'lmg'
  | 'musket'
  | 'plasma';

export type FirearmModelSet = Record<
  Exclude<FirearmModelKind, 'pistol'>,
  THREE.Group
>;

const MODEL_BY_ITEM: Partial<Record<ItemId, FirearmModelKind>> = {
  gun: 'pistol',
  glock_19: 'pistol',
  colt_m1911: 'pistol',
  desert_eagle: 'pistol',
  magnum_44: 'revolver',
  mp5: 'smg',
  uzi: 'smg',
  vector: 'smg',
  ak_47: 'rifle_ak',
  m4a1: 'rifle_ar',
  scar_h: 'rifle_battle',
  fn_fal: 'rifle_battle',
  remington_870: 'shotgun',
  mossberg_590: 'shotgun',
  sawed_off: 'shotgun_double',
  barrett_50: 'sniper',
  remington_700: 'sniper',
  m249_saw: 'lmg',
  pirate_musket: 'musket',
  alien_plasma_gun: 'plasma',
};

const MODEL_BY_PROFILE: Record<FirearmSoundProfile, FirearmModelKind> = {
  pistol: 'pistol',
  smg: 'smg',
  rifle: 'rifle_ar',
  sniper: 'sniper',
  shotgun: 'shotgun',
  lmg: 'lmg',
  musket: 'musket',
  plasma: 'plasma',
};

export function resolveFirearmModelKind(
  itemId: ItemId | null | undefined,
  soundProfile: FirearmSoundProfile | undefined,
): FirearmModelKind {
  if (itemId && MODEL_BY_ITEM[itemId]) return MODEL_BY_ITEM[itemId]!;
  if (soundProfile) return MODEL_BY_PROFILE[soundProfile];
  return 'pistol';
}

interface GunMaterials {
  steel: THREE.MeshStandardMaterial;
  dark: THREE.MeshStandardMaterial;
  chrome: THREE.MeshStandardMaterial;
  polymer: THREE.MeshStandardMaterial;
  rubber: THREE.MeshStandardMaterial;
  wood: THREE.MeshStandardMaterial;
  tan: THREE.MeshStandardMaterial;
  brass: THREE.MeshStandardMaterial;
  glass: THREE.MeshStandardMaterial;
  glow: THREE.MeshStandardMaterial;
  tritium: THREE.MeshBasicMaterial;
}

function createMaterials(gunmetal: PbrTextureSet): GunMaterials {
  const mapped = (
    color: number,
    metalness: number,
    roughness: number,
    envMapIntensity: number,
  ) =>
    new THREE.MeshStandardMaterial({
      color,
      map: gunmetal.map,
      normalMap: gunmetal.normalMap,
      normalScale: new THREE.Vector2(0.9, 0.9),
      roughnessMap: gunmetal.roughnessMap,
      metalness,
      roughness,
      envMapIntensity,
    });

  return {
    steel: mapped(0x8c95a1, 0.9, 0.48, 1.6),
    dark: mapped(0x353b43, 0.82, 0.54, 1.35),
    chrome: mapped(0xd2d9e1, 0.97, 0.32, 1.8),
    polymer: new THREE.MeshStandardMaterial({
      color: 0x26292d,
      roughness: 0.78,
      metalness: 0.12,
    }),
    rubber: new THREE.MeshStandardMaterial({
      color: 0x17191c,
      roughness: 0.94,
      metalness: 0.02,
    }),
    wood: new THREE.MeshStandardMaterial({
      color: 0x5b341b,
      roughness: 0.56,
      metalness: 0.03,
    }),
    tan: new THREE.MeshStandardMaterial({
      color: 0x8b7b5f,
      roughness: 0.7,
      metalness: 0.08,
    }),
    brass: new THREE.MeshStandardMaterial({
      color: 0xb58d4a,
      roughness: 0.34,
      metalness: 0.88,
      envMapIntensity: 1.4,
    }),
    glass: new THREE.MeshStandardMaterial({
      color: 0x17364b,
      roughness: 0.08,
      metalness: 0.92,
      emissive: 0x0b2333,
      emissiveIntensity: 0.35,
    }),
    glow: new THREE.MeshStandardMaterial({
      color: 0x2dd4bf,
      emissive: 0x14b8a6,
      emissiveIntensity: 1.7,
      roughness: 0.18,
      metalness: 0.35,
    }),
    tritium: new THREE.MeshBasicMaterial({ color: 0x86efac }),
  };
}

function add(
  group: THREE.Group,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
  rx = 0,
  ry = 0,
  rz = 0,
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  mesh.castShadow = true;
  group.add(mesh);
  return mesh;
}

function rbox(
  group: THREE.Group,
  material: THREE.Material,
  width: number,
  height: number,
  depth: number,
  x: number,
  y: number,
  z: number,
  radius = 0.007,
  rx = 0,
  ry = 0,
  rz = 0,
): THREE.Mesh {
  return add(
    group,
    roundedBox(width, height, depth, radius, 2),
    material,
    x,
    y,
    z,
    rx,
    ry,
    rz,
  );
}

function zCyl(
  group: THREE.Group,
  material: THREE.Material,
  radius: number,
  length: number,
  x: number,
  y: number,
  z: number,
  radialSegments = 14,
): THREE.Mesh {
  return add(
    group,
    new THREE.CylinderGeometry(radius, radius, length, radialSegments),
    material,
    x,
    y,
    z,
    Math.PI / 2,
  );
}

function xCyl(
  group: THREE.Group,
  material: THREE.Material,
  radius: number,
  length: number,
  x: number,
  y: number,
  z: number,
  radialSegments = 12,
): THREE.Mesh {
  return add(
    group,
    new THREE.CylinderGeometry(radius, radius, length, radialSegments),
    material,
    x,
    y,
    z,
    0,
    0,
    Math.PI / 2,
  );
}

function triggerGuard(
  group: THREE.Group,
  material: THREE.Material,
  y: number,
  z: number,
): void {
  const guard = add(
    group,
    new THREE.TorusGeometry(0.018, 0.0036, 6, 14),
    material,
    0,
    y,
    z,
    0,
    Math.PI / 2,
    0,
  );
  guard.scale.set(1, 1.35, 0.8);
  rbox(group, material, 0.006, 0.017, 0.006, 0, y + 0.016, z + 0.004, 0.002, -0.28);
}

function topRail(
  group: THREE.Group,
  material: THREE.Material,
  y: number,
  z: number,
  length: number,
): void {
  rbox(group, material, 0.026, 0.008, length, 0, y, z, 0.002);
  const slots = Math.min(6, Math.max(3, Math.floor(length / 0.022)));
  for (let i = 0; i < slots; i++) {
    rbox(
      group,
      material,
      0.03,
      0.003,
      0.005,
      0,
      y + 0.004,
      z - length / 2 + 0.016 + i * ((length - 0.03) / Math.max(1, slots - 1)),
      0.001,
    );
  }
}

function ironSights(
  group: THREE.Group,
  steel: THREE.Material,
  tritium: THREE.Material,
  rearY: number,
  rearZ: number,
  frontY: number,
  frontZ: number,
): void {
  rbox(group, steel, 0.028, 0.012, 0.012, 0, rearY, rearZ, 0.002);
  add(group, new THREE.SphereGeometry(0.002, 6, 6), tritium, -0.008, rearY, rearZ);
  add(group, new THREE.SphereGeometry(0.002, 6, 6), tritium, 0.008, rearY, rearZ);
  rbox(group, steel, 0.007, 0.015, 0.009, 0, frontY, frontZ, 0.0015);
  add(group, new THREE.SphereGeometry(0.0022, 6, 6), tritium, 0, frontY, frontZ);
}

function curvedMagazine(
  group: THREE.Group,
  material: THREE.Material,
  y: number,
  z: number,
  segments: number,
  width = 0.028,
): void {
  for (let i = 0; i < segments; i++) {
    rbox(
      group,
      material,
      width,
      0.055,
      0.038,
      0,
      y - i * 0.044,
      z - i * 0.012,
      0.004,
      0.13 + i * 0.1,
    );
  }
}

function optic(
  group: THREE.Group,
  mats: GunMaterials,
  y: number,
  z: number,
  tubeLength: number,
): void {
  zCyl(group, mats.dark, 0.021, tubeLength, 0, y, z, 16);
  zCyl(group, mats.dark, 0.031, 0.055, 0, y, z - tubeLength / 2 + 0.018, 16);
  zCyl(group, mats.dark, 0.027, 0.045, 0, y, z + tubeLength / 2 - 0.015, 16);
  zCyl(group, mats.glass, 0.026, 0.006, 0, y, z - tubeLength / 2 - 0.01, 16);
  for (const ringZ of [z - tubeLength * 0.28, z + tubeLength * 0.28]) {
    add(
      group,
      new THREE.TorusGeometry(0.026, 0.006, 6, 14),
      mats.steel,
      0,
      y,
      ringZ,
    );
    rbox(group, mats.dark, 0.02, 0.03, 0.018, 0, y - 0.025, ringZ, 0.002);
  }
}

function buildRevolver(mats: GunMaterials): THREE.Group {
  const g = new THREE.Group();
  rbox(g, mats.dark, 0.044, 0.058, 0.17, 0, 0.058, -0.085, 0.012);
  rbox(g, mats.steel, 0.036, 0.022, 0.14, 0, 0.089, -0.085, 0.008);
  zCyl(g, mats.chrome, 0.0115, 0.21, 0, 0.072, -0.255, 16);
  zCyl(g, mats.dark, 0.018, 0.04, 0, 0.072, -0.37, 16);
  rbox(g, mats.steel, 0.03, 0.018, 0.19, 0, 0.046, -0.245, 0.006);

  const cylinder = zCyl(g, mats.chrome, 0.029, 0.068, 0, 0.06, -0.052, 18);
  cylinder.rotation.z = 0.04;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    zCyl(
      g,
      mats.dark,
      0.006,
      0.072,
      Math.cos(a) * 0.018,
      0.06 + Math.sin(a) * 0.018,
      -0.052,
      8,
    );
  }

  const grip = rbox(g, mats.wood, 0.034, 0.125, 0.052, 0, -0.006, 0.012, 0.014, 0.3);
  grip.scale.z = 0.92;
  rbox(g, mats.dark, 0.03, 0.075, 0.014, 0, 0.048, 0.045, 0.006, 0.22);
  rbox(g, mats.steel, 0.012, 0.03, 0.026, 0, 0.1, 0.015, 0.004, -0.38);
  rbox(g, mats.chrome, 0.01, 0.018, 0.012, 0, 0.094, 0.03, 0.003, -0.38);
  triggerGuard(g, mats.steel, 0.022, -0.028);
  rbox(g, mats.steel, 0.006, 0.018, 0.008, 0, 0.03, -0.025, 0.002, -0.3);
  rbox(g, mats.steel, 0.006, 0.014, 0.01, 0, 0.092, -0.362, 0.002);
  rbox(g, mats.steel, 0.025, 0.012, 0.012, 0, 0.092, 0.005, 0.002);
  rbox(g, mats.steel, 0.018, 0.008, 0.034, 0, 0.045, -0.045, 0.002);
  return g;
}

function buildSmg(mats: GunMaterials): THREE.Group {
  const g = new THREE.Group();
  rbox(g, mats.dark, 0.052, 0.062, 0.24, 0, 0.06, -0.055, 0.012);
  rbox(g, mats.steel, 0.046, 0.026, 0.2, 0, 0.094, -0.06, 0.009);
  topRail(g, mats.dark, 0.112, -0.06, 0.15);
  zCyl(g, mats.dark, 0.027, 0.13, 0, 0.066, -0.24, 16);
  zCyl(g, mats.steel, 0.012, 0.16, 0, 0.066, -0.34, 14);
  zCyl(g, mats.chrome, 0.018, 0.04, 0, 0.066, -0.43, 14);
  rbox(g, mats.polymer, 0.034, 0.105, 0.048, 0, -0.008, 0.045, 0.012, 0.3);
  rbox(g, mats.polymer, 0.036, 0.07, 0.045, 0, 0.005, -0.18, 0.012, 0.08);
  curvedMagazine(g, mats.dark, -0.016, -0.04, 3, 0.026);
  rbox(g, mats.dark, 0.012, 0.016, 0.15, -0.018, 0.06, 0.145, 0.004);
  rbox(g, mats.dark, 0.012, 0.016, 0.15, 0.018, 0.06, 0.145, 0.004);
  rbox(g, mats.rubber, 0.052, 0.075, 0.02, 0, 0.058, 0.225, 0.008);
  triggerGuard(g, mats.steel, 0.022, -0.008);
  optic(g, mats, 0.128, -0.015, 0.1);
  return g;
}

function buildRifle(
  mats: GunMaterials,
  variant: 'ak' | 'ar' | 'battle',
): THREE.Group {
  const g = new THREE.Group();
  const furniture = variant === 'ak' ? mats.wood : variant === 'battle' ? mats.tan : mats.polymer;
  const receiverLength = variant === 'battle' ? 0.3 : 0.27;

  rbox(g, mats.dark, 0.056, 0.072, receiverLength, 0, 0.064, -0.07, 0.012);
  rbox(g, mats.steel, 0.048, 0.02, receiverLength * 0.82, 0, 0.104, -0.06, 0.007);
  rbox(g, furniture, 0.052, 0.058, 0.23, 0, 0.066, -0.3, 0.012);
  zCyl(g, mats.steel, 0.0115, 0.28, 0, 0.074, -0.54, 14);
  zCyl(g, mats.dark, 0.017, 0.055, 0, 0.074, -0.695, 14);
  rbox(g, mats.dark, 0.02, 0.018, 0.08, 0, 0.038, -0.35, 0.005);

  if (variant === 'ar') {
    zCyl(g, mats.dark, 0.018, 0.15, 0, 0.075, 0.15, 12);
    rbox(g, mats.polymer, 0.046, 0.09, 0.12, 0, 0.062, 0.265, 0.012);
    rbox(g, mats.rubber, 0.05, 0.1, 0.018, 0, 0.06, 0.33, 0.008);
    rbox(g, mats.polymer, 0.032, 0.05, 0.04, 0, 0.105, -0.12, 0.006);
    curvedMagazine(g, mats.dark, -0.018, -0.035, 2, 0.03);
  } else if (variant === 'ak') {
    rbox(g, furniture, 0.042, 0.075, 0.24, 0, 0.052, 0.19, 0.012, -0.06);
    rbox(g, mats.rubber, 0.048, 0.085, 0.018, 0, 0.045, 0.315, 0.007);
    curvedMagazine(g, mats.dark, -0.02, -0.04, 3, 0.029);
    rbox(g, mats.steel, 0.012, 0.022, 0.09, 0.032, 0.085, -0.04, 0.003);
    rbox(g, mats.steel, 0.012, 0.022, 0.09, -0.032, 0.085, -0.04, 0.003);
  } else {
    rbox(g, furniture, 0.044, 0.08, 0.24, 0, 0.055, 0.19, 0.012, -0.05);
    rbox(g, mats.rubber, 0.05, 0.095, 0.018, 0, 0.05, 0.315, 0.007);
    rbox(g, mats.tan, 0.03, 0.055, 0.04, 0, 0.112, -0.11, 0.006);
    curvedMagazine(g, mats.dark, -0.02, -0.045, 3, 0.032);
    rbox(g, mats.dark, 0.01, 0.02, 0.12, 0.038, 0.08, -0.06, 0.003);
  }

  rbox(g, mats.polymer, 0.032, 0.11, 0.046, 0, -0.006, 0.055, 0.011, 0.3);
  triggerGuard(g, mats.steel, 0.021, 0.008);
  topRail(g, mats.dark, 0.118, -0.08, 0.18);
  optic(g, mats, 0.15, -0.05, 0.13);
  ironSights(g, mats.steel, mats.tritium, 0.116, 0.03, 0.112, -0.56);
  return g;
}

function buildShotgun(mats: GunMaterials): THREE.Group {
  const g = new THREE.Group();
  rbox(g, mats.dark, 0.052, 0.07, 0.22, 0, 0.06, -0.04, 0.012);
  rbox(g, mats.steel, 0.04, 0.024, 0.16, 0, 0.092, -0.05, 0.007);
  zCyl(g, mats.steel, 0.0185, 0.54, 0, 0.081, -0.38, 16);
  zCyl(g, mats.dark, 0.0145, 0.44, 0, 0.042, -0.32, 14);
  zCyl(g, mats.dark, 0.024, 0.04, 0, 0.081, -0.665, 14);
  rbox(g, mats.wood, 0.052, 0.05, 0.17, 0, 0.038, -0.31, 0.012);
  for (let i = 0; i < 5; i++) {
    rbox(g, mats.rubber, 0.055, 0.008, 0.014, 0, 0.061, -0.38 + i * 0.028, 0.003);
  }
  rbox(g, mats.wood, 0.045, 0.09, 0.26, 0, 0.038, 0.18, 0.014, -0.07);
  rbox(g, mats.rubber, 0.05, 0.1, 0.02, 0, 0.032, 0.315, 0.008);
  rbox(g, mats.wood, 0.032, 0.095, 0.05, 0, -0.012, 0.03, 0.012, 0.28);
  triggerGuard(g, mats.steel, 0.02, -0.005);
  rbox(g, mats.brass, 0.006, 0.008, 0.012, 0, 0.104, -0.635, 0.002);
  rbox(g, mats.dark, 0.03, 0.02, 0.06, 0, 0.055, -0.16, 0.006);
  return g;
}

function buildDoubleBarrel(mats: GunMaterials): THREE.Group {
  const g = new THREE.Group();
  for (const side of [-1, 1]) {
    zCyl(g, mats.steel, 0.0145, 0.39, side * 0.015, 0.075, -0.25, 16);
    zCyl(g, mats.dark, 0.019, 0.025, side * 0.015, 0.075, -0.45, 12);
  }
  rbox(g, mats.dark, 0.06, 0.058, 0.12, 0, 0.065, -0.055, 0.012);
  rbox(g, mats.steel, 0.064, 0.012, 0.14, 0, 0.093, -0.22, 0.005);
  rbox(g, mats.wood, 0.05, 0.042, 0.15, 0, 0.038, -0.26, 0.012);
  const grip = rbox(g, mats.wood, 0.036, 0.12, 0.052, 0, -0.005, 0.04, 0.014, 0.32);
  grip.scale.z = 0.92;
  rbox(g, mats.rubber, 0.038, 0.07, 0.018, 0, -0.035, 0.095, 0.007, 0.32);
  rbox(g, mats.chrome, 0.012, 0.012, 0.06, 0, 0.098, -0.02, 0.003);
  triggerGuard(g, mats.steel, 0.02, -0.01);
  return g;
}

function buildSniper(mats: GunMaterials): THREE.Group {
  const g = new THREE.Group();
  rbox(g, mats.dark, 0.06, 0.076, 0.34, 0, 0.06, -0.05, 0.013);
  rbox(g, mats.steel, 0.048, 0.022, 0.26, 0, 0.102, -0.04, 0.008);
  zCyl(g, mats.steel, 0.015, 0.56, 0, 0.076, -0.48, 16);
  zCyl(g, mats.dark, 0.022, 0.07, 0, 0.076, -0.785, 14);
  for (let i = 0; i < 3; i++) {
    add(
      g,
      new THREE.TorusGeometry(0.024, 0.004, 6, 12),
      mats.chrome,
      0,
      0.076,
      -0.75 - i * 0.022,
    );
  }
  rbox(g, mats.dark, 0.052, 0.08, 0.24, 0, 0.045, 0.2, 0.014);
  rbox(g, mats.rubber, 0.058, 0.095, 0.02, 0, 0.04, 0.33, 0.008);
  rbox(g, mats.polymer, 0.034, 0.055, 0.14, 0, 0.088, 0.12, 0.01);
  rbox(g, mats.polymer, 0.032, 0.11, 0.046, 0, -0.006, 0.055, 0.011, 0.3);
  rbox(g, mats.dark, 0.045, 0.09, 0.075, 0, -0.005, -0.03, 0.008);
  optic(g, mats, 0.158, -0.08, 0.3);
  rbox(g, mats.steel, 0.008, 0.018, 0.05, 0.036, 0.08, -0.01, 0.002, 0, 0, -0.5);
  for (const side of [-1, 1]) {
    rbox(g, mats.dark, 0.009, 0.009, 0.24, side * 0.047, 0.012, -0.48, 0.002, 0.55);
    rbox(g, mats.rubber, 0.014, 0.014, 0.028, side * 0.047, -0.03, -0.6, 0.004);
  }
  rbox(g, mats.dark, 0.03, 0.024, 0.07, 0, 0.04, -0.19, 0.006);
  return g;
}

function buildLmg(mats: GunMaterials): THREE.Group {
  const g = new THREE.Group();
  rbox(g, mats.dark, 0.072, 0.086, 0.32, 0, 0.07, -0.05, 0.014);
  rbox(g, mats.steel, 0.058, 0.024, 0.24, 0, 0.118, -0.04, 0.008);
  rbox(g, mats.dark, 0.055, 0.06, 0.22, 0, 0.078, -0.31, 0.012);
  for (let i = 0; i < 4; i++) {
    rbox(g, mats.steel, 0.06, 0.012, 0.02, 0, 0.113, -0.24 - i * 0.04, 0.003);
  }
  zCyl(g, mats.steel, 0.016, 0.48, 0, 0.078, -0.5, 16);
  zCyl(g, mats.dark, 0.024, 0.065, 0, 0.078, -0.755, 14);
  rbox(g, mats.dark, 0.055, 0.095, 0.22, 0, 0.05, 0.21, 0.014);
  rbox(g, mats.rubber, 0.06, 0.11, 0.02, 0, 0.045, 0.335, 0.008);
  rbox(g, mats.polymer, 0.034, 0.11, 0.048, 0, -0.005, 0.06, 0.011, 0.3);
  rbox(g, mats.dark, 0.075, 0.13, 0.15, 0, -0.035, -0.06, 0.012);
  rbox(g, mats.brass, 0.068, 0.012, 0.13, 0, 0.032, -0.055, 0.004);
  for (let i = 0; i < 5; i++) {
    zCyl(g, mats.brass, 0.005, 0.07, -0.032 + i * 0.016, 0.02, -0.06, 8);
  }
  rbox(g, mats.dark, 0.1, 0.012, 0.12, 0, 0.158, -0.04, 0.004);
  rbox(g, mats.dark, 0.012, 0.03, 0.018, -0.04, 0.145, -0.09, 0.003);
  rbox(g, mats.dark, 0.012, 0.03, 0.018, 0.04, 0.145, -0.09, 0.003);
  triggerGuard(g, mats.steel, 0.022, 0.01);
  topRail(g, mats.dark, 0.132, -0.03, 0.2);
  optic(g, mats, 0.165, -0.03, 0.12);
  for (const side of [-1, 1]) {
    rbox(g, mats.dark, 0.008, 0.008, 0.24, side * 0.045, 0.015, -0.46, 0.002, 0.6);
  }
  return g;
}

function buildMusket(mats: GunMaterials): THREE.Group {
  const g = new THREE.Group();
  rbox(g, mats.wood, 0.048, 0.105, 0.26, 0, 0.028, 0.2, 0.016, -0.07);
  rbox(g, mats.wood, 0.04, 0.055, 0.42, 0, 0.05, -0.08, 0.01);
  rbox(g, mats.wood, 0.042, 0.05, 0.36, 0, 0.055, -0.42, 0.01);
  zCyl(g, mats.steel, 0.0125, 0.72, 0, 0.083, -0.42, 16);
  zCyl(g, mats.dark, 0.017, 0.035, 0, 0.083, -0.785, 14);
  zCyl(g, mats.brass, 0.0045, 0.58, 0, 0.038, -0.38, 8);
  for (const bandZ of [-0.24, -0.45, -0.62]) {
    add(
      g,
      new THREE.TorusGeometry(0.026, 0.004, 6, 12),
      mats.brass,
      0,
      0.083,
      bandZ,
    );
  }
  rbox(g, mats.dark, 0.03, 0.055, 0.09, 0, 0.07, -0.015, 0.007);
  rbox(g, mats.steel, 0.014, 0.055, 0.018, 0, 0.105, 0.005, 0.004, -0.3);
  rbox(g, mats.chrome, 0.008, 0.036, 0.012, 0, 0.12, 0.025, 0.003, -0.42);
  rbox(g, mats.brass, 0.028, 0.006, 0.014, 0, 0.118, 0.048, 0.002);
  triggerGuard(g, mats.steel, 0.02, 0.005);
  rbox(g, mats.steel, 0.006, 0.012, 0.008, 0, 0.098, -0.735, 0.002);
  return g;
}

function buildPlasma(mats: GunMaterials): THREE.Group {
  const g = new THREE.Group();
  const body = add(
    g,
    new THREE.CapsuleGeometry(0.035, 0.27, 6, 14),
    mats.dark,
    0,
    0.068,
    -0.1,
    Math.PI / 2,
  );
  body.scale.set(1, 1, 0.92);
  for (const side of [-1, 1]) {
    add(
      g,
      new THREE.CapsuleGeometry(0.012, 0.24, 4, 8),
      mats.chrome,
      side * 0.035,
      0.07,
      -0.13,
      Math.PI / 2,
    );
  }
  for (let i = 0; i < 4; i++) {
    add(
      g,
      new THREE.TorusGeometry(0.031 + i * 0.0015, 0.005, 6, 14),
      mats.glow,
      0,
      0.068,
      -0.09 - i * 0.052,
    );
  }
  add(g, new THREE.SphereGeometry(0.024, 12, 10), mats.glow, 0, 0.068, -0.36);
  zCyl(g, mats.chrome, 0.016, 0.055, 0, 0.068, -0.33, 12);
  rbox(g, mats.polymer, 0.038, 0.12, 0.055, 0, -0.008, 0.035, 0.014, 0.3);
  rbox(g, mats.dark, 0.06, 0.028, 0.13, 0, 0.108, -0.09, 0.01);
  for (let i = 0; i < 3; i++) {
    rbox(g, mats.glow, 0.05, 0.006, 0.012, 0, 0.124, -0.06 - i * 0.05, 0.002);
  }
  triggerGuard(g, mats.chrome, 0.022, -0.005);
  add(
    g,
    new THREE.TorusGeometry(0.026, 0.004, 6, 14),
    mats.glow,
    0,
    0.068,
    -0.4,
  );
  return g;
}

export function createFirearmModelSet(
  gunmetal: PbrTextureSet,
): FirearmModelSet {
  const mats = createMaterials(gunmetal);
  return {
    revolver: buildRevolver(mats),
    smg: buildSmg(mats),
    rifle_ak: buildRifle(mats, 'ak'),
    rifle_ar: buildRifle(mats, 'ar'),
    rifle_battle: buildRifle(mats, 'battle'),
    shotgun: buildShotgun(mats),
    shotgun_double: buildDoubleBarrel(mats),
    sniper: buildSniper(mats),
    lmg: buildLmg(mats),
    musket: buildMusket(mats),
    plasma: buildPlasma(mats),
  };
}
