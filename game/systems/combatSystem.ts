import * as THREE from 'three';
import {
  ArmorMaterialTier,
  BodyZone,
  CreatureSpecies,
  CreatureZoneArmor,
  WeaponMaterialClass,
} from '../types';

export interface HitboxSphereSpec {
  zone: BodyZone;
  localY: number;
  localZ: number;
  radius: number;
}

export interface CombatTargetInput {
  id: string;
  species: CreatureSpecies;
  x: number;
  y: number;
  z: number;
  yaw: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  cycleActive: boolean;
  stunTimer: number;
  blindTimer: number;
  isBoss?: boolean;
  zoneArmor: CreatureZoneArmor;
  spec: {
    displayName: string;
  };
}

export interface HitboxRaycastResult {
  creatureId: string;
  zone: BodyZone;
  distance: number;
  hitPoint: THREE.Vector3;
  isGapSlip: boolean;
}

export interface WeaponZoneHitResolution {
  hpDamage: number;
  armorDamage: number;
  armorTierBefore: ArmorMaterialTier;
  armorTierAfter: ArmorMaterialTier;
  shattered: boolean;
  deflected: boolean;
  gapSlipCrit: boolean;
  headshotCrit: boolean;
  stunSeconds: number;
  knockback: number;
  feedbackLabel: string;
}

// Pre-allocated scratch vectors (zero per-frame GC allocations)
const _center = new THREE.Vector3();
const _toCenter = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _hitPt = new THREE.Vector3();

const DEFAULT_SPHERES: HitboxSphereSpec[] = [
  { zone: 'head', localY: 0.95, localZ: 0.72, radius: 0.44 },
  { zone: 'chest', localY: 0.75, localZ: 0.0, radius: 0.62 },
  { zone: 'limb', localY: 0.34, localZ: -0.15, radius: 0.56 },
];

const SPECIES_HITBOXES: Partial<Record<CreatureSpecies, HitboxSphereSpec[]>> = {
  trex: [
    { zone: 'head', localY: 3.15, localZ: 1.55, radius: 0.92 },
    { zone: 'chest', localY: 2.35, localZ: 0.15, radius: 1.28 },
    { zone: 'limb', localY: 1.05, localZ: -0.2, radius: 1.15 },
  ],
  triceratops: [
    { zone: 'head', localY: 1.55, localZ: 1.38, radius: 0.84 },
    { zone: 'chest', localY: 1.25, localZ: 0.05, radius: 1.08 },
    { zone: 'limb', localY: 0.52, localZ: -0.25, radius: 0.92 },
  ],
  stegosaurus: [
    { zone: 'head', localY: 1.15, localZ: 1.4, radius: 0.55 },
    { zone: 'chest', localY: 1.35, localZ: 0.0, radius: 1.12 },
    { zone: 'limb', localY: 0.55, localZ: -0.35, radius: 0.88 },
  ],
  brachiosaurus: [
    { zone: 'head', localY: 5.4, localZ: 2.1, radius: 0.95 },
    { zone: 'chest', localY: 2.75, localZ: 0.0, radius: 1.65 },
    { zone: 'limb', localY: 1.1, localZ: -0.1, radius: 1.35 },
  ],
  parasaurolophus: [
    { zone: 'head', localY: 2.05, localZ: 1.18, radius: 0.58 },
    { zone: 'chest', localY: 1.35, localZ: 0.0, radius: 0.95 },
    { zone: 'limb', localY: 0.58, localZ: -0.25, radius: 0.78 },
  ],
  velociraptor: [
    { zone: 'head', localY: 1.34, localZ: 0.78, radius: 0.44 },
    { zone: 'chest', localY: 1.02, localZ: 0.05, radius: 0.58 },
    { zone: 'limb', localY: 0.44, localZ: -0.18, radius: 0.52 },
  ],
  grizzly_bear: [
    { zone: 'head', localY: 1.22, localZ: 0.92, radius: 0.52 },
    { zone: 'chest', localY: 0.98, localZ: 0.05, radius: 0.82 },
    { zone: 'limb', localY: 0.42, localZ: -0.22, radius: 0.68 },
  ],
  bison: [
    { zone: 'head', localY: 1.25, localZ: 0.98, radius: 0.56 },
    { zone: 'chest', localY: 1.12, localZ: 0.08, radius: 0.88 },
    { zone: 'limb', localY: 0.45, localZ: -0.25, radius: 0.68 },
  ],
  saltwater_crocodile: [
    { zone: 'head', localY: 0.36, localZ: 1.15, radius: 0.48 },
    { zone: 'chest', localY: 0.34, localZ: 0.0, radius: 0.72 },
    { zone: 'limb', localY: 0.25, localZ: -0.85, radius: 0.56 },
  ],
  african_lion: [
    { zone: 'head', localY: 1.04, localZ: 0.82, radius: 0.44 },
    { zone: 'chest', localY: 0.85, localZ: 0.02, radius: 0.68 },
    { zone: 'limb', localY: 0.38, localZ: -0.22, radius: 0.55 },
  ],
  gray_wolf: [
    { zone: 'head', localY: 0.82, localZ: 0.66, radius: 0.38 },
    { zone: 'chest', localY: 0.68, localZ: 0.0, radius: 0.52 },
    { zone: 'limb', localY: 0.32, localZ: -0.18, radius: 0.44 },
  ],
  red_fox: [
    { zone: 'head', localY: 0.52, localZ: 0.45, radius: 0.3 },
    { zone: 'chest', localY: 0.44, localZ: 0.0, radius: 0.38 },
    { zone: 'limb', localY: 0.2, localZ: -0.14, radius: 0.32 },
  ],
  deer: [
    { zone: 'head', localY: 1.32, localZ: 0.72, radius: 0.38 },
    { zone: 'chest', localY: 0.92, localZ: 0.0, radius: 0.62 },
    { zone: 'limb', localY: 0.42, localZ: -0.2, radius: 0.5 },
  ],
  wild_boar: [
    { zone: 'head', localY: 0.68, localZ: 0.58, radius: 0.4 },
    { zone: 'chest', localY: 0.64, localZ: 0.0, radius: 0.58 },
    { zone: 'limb', localY: 0.28, localZ: -0.18, radius: 0.45 },
  ],
  elephant: [
    { zone: 'head', localY: 2.4, localZ: 1.55, radius: 0.88 },
    { zone: 'chest', localY: 1.95, localZ: 0.0, radius: 1.48 },
    { zone: 'limb', localY: 0.78, localZ: -0.1, radius: 1.25 },
  ],
  reindeer: [
    { zone: 'head', localY: 1.65, localZ: 0.95, radius: 0.42 },
    { zone: 'chest', localY: 1.15, localZ: 0.0, radius: 0.68 },
    { zone: 'limb', localY: 0.48, localZ: -0.15, radius: 0.55 },
  ],
  giraffe: [
    { zone: 'head', localY: 4.75, localZ: 1.65, radius: 0.48 },
    { zone: 'chest', localY: 2.15, localZ: 0.0, radius: 1.05 },
    { zone: 'limb', localY: 0.95, localZ: -0.15, radius: 0.82 },
  ],
  zebra: [
    { zone: 'head', localY: 1.78, localZ: 1.05, radius: 0.4 },
    { zone: 'chest', localY: 1.22, localZ: 0.0, radius: 0.72 },
    { zone: 'limb', localY: 0.5, localZ: -0.18, radius: 0.58 },
  ],
  rhinoceros: [
    { zone: 'head', localY: 1.32, localZ: 1.62, radius: 0.62 },
    { zone: 'chest', localY: 1.18, localZ: 0.05, radius: 1.12 },
    { zone: 'limb', localY: 0.45, localZ: -0.2, radius: 0.88 },
  ],
  hippopotamus: [
    { zone: 'head', localY: 1.04, localZ: 1.42, radius: 0.58 },
    { zone: 'chest', localY: 0.88, localZ: 0.0, radius: 1.08 },
    { zone: 'limb', localY: 0.35, localZ: -0.2, radius: 0.82 },
  ],
  tiger: [
    { zone: 'head', localY: 1.22, localZ: 0.86, radius: 0.42 },
    { zone: 'chest', localY: 0.98, localZ: 0.02, radius: 0.68 },
    { zone: 'limb', localY: 0.42, localZ: -0.2, radius: 0.55 },
  ],
  cheetah: [
    { zone: 'head', localY: 1.08, localZ: 0.78, radius: 0.36 },
    { zone: 'chest', localY: 0.88, localZ: 0.0, radius: 0.58 },
    { zone: 'limb', localY: 0.38, localZ: -0.18, radius: 0.48 },
  ],
  hyena: [
    { zone: 'head', localY: 1.02, localZ: 0.72, radius: 0.36 },
    { zone: 'chest', localY: 0.84, localZ: 0.0, radius: 0.56 },
    { zone: 'limb', localY: 0.36, localZ: -0.16, radius: 0.46 },
  ],
  polar_bear: [
    { zone: 'head', localY: 1.42, localZ: 0.98, radius: 0.55 },
    { zone: 'chest', localY: 1.15, localZ: 0.04, radius: 0.88 },
    { zone: 'limb', localY: 0.46, localZ: -0.2, radius: 0.72 },
  ],
  moose: [
    { zone: 'head', localY: 1.92, localZ: 1.38, radius: 0.54 },
    { zone: 'chest', localY: 1.55, localZ: 0.04, radius: 0.96 },
    { zone: 'limb', localY: 0.65, localZ: -0.2, radius: 0.75 },
  ],
  penguin: [
    { zone: 'head', localY: 0.86, localZ: 0.04, radius: 0.24 },
    { zone: 'chest', localY: 0.48, localZ: 0.0, radius: 0.34 },
    { zone: 'limb', localY: 0.16, localZ: 0.0, radius: 0.28 },
  ],
  gorilla: [
    { zone: 'head', localY: 1.52, localZ: 0.56, radius: 0.42 },
    { zone: 'chest', localY: 0.96, localZ: 0.0, radius: 0.78 },
    { zone: 'limb', localY: 0.42, localZ: -0.1, radius: 0.65 },
  ],
  kangaroo: [
    { zone: 'head', localY: 1.62, localZ: 0.42, radius: 0.3 },
    { zone: 'chest', localY: 0.96, localZ: 0.0, radius: 0.52 },
    { zone: 'limb', localY: 0.38, localZ: -0.1, radius: 0.45 },
  ],
  camel: [
    { zone: 'head', localY: 2.12, localZ: 1.48, radius: 0.44 },
    { zone: 'chest', localY: 1.55, localZ: 0.0, radius: 0.92 },
    { zone: 'limb', localY: 0.62, localZ: -0.2, radius: 0.7 },
  ],
  ostrich: [
    { zone: 'head', localY: 2.24, localZ: 0.62, radius: 0.28 },
    { zone: 'chest', localY: 1.28, localZ: 0.0, radius: 0.58 },
    { zone: 'limb', localY: 0.55, localZ: 0.0, radius: 0.45 },
  ],
  flamingo: [
    { zone: 'head', localY: 1.72, localZ: 0.42, radius: 0.22 },
    { zone: 'chest', localY: 1.05, localZ: 0.0, radius: 0.38 },
    { zone: 'limb', localY: 0.48, localZ: 0.0, radius: 0.3 },
  ],
  toucan: [
    { zone: 'head', localY: 0.08, localZ: 0.3, radius: 0.24 },
    { zone: 'chest', localY: 0.0, localZ: 0.0, radius: 0.32 },
    { zone: 'limb', localY: -0.05, localZ: -0.2, radius: 0.25 },
  ],
  peregrine_falcon: [
    { zone: 'head', localY: 0.05, localZ: 0.3, radius: 0.25 },
    { zone: 'chest', localY: 0.0, localZ: 0.0, radius: 0.42 },
    { zone: 'limb', localY: -0.05, localZ: -0.2, radius: 0.3 },
  ],
  spinosaurus: [
    { zone: 'head', localY: 3.12, localZ: 2.35, radius: 0.92 },
    { zone: 'chest', localY: 2.48, localZ: 0.0, radius: 1.45 },
    { zone: 'limb', localY: 1.05, localZ: -0.15, radius: 1.15 },
  ],
  ankylosaurus: [
    { zone: 'head', localY: 1.04, localZ: 1.68, radius: 0.64 },
    { zone: 'chest', localY: 1.02, localZ: 0.0, radius: 1.38 },
    { zone: 'limb', localY: 0.42, localZ: -0.25, radius: 0.98 },
  ],
  allosaurus: [
    { zone: 'head', localY: 2.8, localZ: 1.95, radius: 0.78 },
    { zone: 'chest', localY: 2.15, localZ: 0.0, radius: 1.18 },
    { zone: 'limb', localY: 0.95, localZ: -0.18, radius: 0.95 },
  ],
  dilophosaurus: [
    { zone: 'head', localY: 1.78, localZ: 1.12, radius: 0.48 },
    { zone: 'chest', localY: 1.25, localZ: 0.0, radius: 0.68 },
    { zone: 'limb', localY: 0.55, localZ: -0.15, radius: 0.56 },
  ],
  diplodocus: [
    { zone: 'head', localY: 5.2, localZ: 6.2, radius: 0.85 },
    { zone: 'chest', localY: 2.65, localZ: 0.0, radius: 1.75 },
    { zone: 'limb', localY: 1.1, localZ: -0.1, radius: 1.35 },
  ],
  pteranodon: [
    { zone: 'head', localY: 0.14, localZ: 0.55, radius: 0.45 },
    { zone: 'chest', localY: 0.0, localZ: 0.0, radius: 0.88 },
    { zone: 'limb', localY: -0.06, localZ: -0.25, radius: 0.52 },
  ],
  sea_turtle: [
    { zone: 'head', localY: 0.02, localZ: 0.72, radius: 0.3 },
    { zone: 'chest', localY: 0.0, localZ: 0.0, radius: 0.72 },
    { zone: 'limb', localY: -0.04, localZ: -0.5, radius: 0.42 },
  ],
  great_white_shark: [
    { zone: 'head', localY: 0.0, localZ: 1.2, radius: 0.56 },
    { zone: 'chest', localY: 0.05, localZ: 0.0, radius: 0.86 },
    { zone: 'limb', localY: 0.0, localZ: -1.1, radius: 0.64 },
  ],
  manta_ray: [
    { zone: 'head', localY: 0.0, localZ: 0.7, radius: 0.46 },
    { zone: 'chest', localY: 0.0, localZ: 0.0, radius: 1.05 },
    { zone: 'limb', localY: 0.0, localZ: -0.8, radius: 0.52 },
  ],
  bee: [
    { zone: 'head', localY: 0.02, localZ: 0.24, radius: 0.16 },
    { zone: 'chest', localY: 0.0, localZ: 0.0, radius: 0.24 },
  ],
  creaking: [
    { zone: 'head', localY: 2.2, localZ: 0.04, radius: 0.34 },
    { zone: 'chest', localY: 1.48, localZ: 0.0, radius: 0.52 },
    { zone: 'limb', localY: 0.56, localZ: 0.0, radius: 0.42 },
  ],
  white_fox: [
    { zone: 'head', localY: 0.52, localZ: 0.45, radius: 0.3 },
    { zone: 'chest', localY: 0.44, localZ: 0.0, radius: 0.38 },
    { zone: 'limb', localY: 0.2, localZ: -0.14, radius: 0.32 },
  ],
  parrot: [
    { zone: 'head', localY: 0.12, localZ: 0.22, radius: 0.18 },
    { zone: 'chest', localY: 0.0, localZ: 0.0, radius: 0.25 },
  ],
  ocelot: [
    { zone: 'head', localY: 0.7, localZ: 0.52, radius: 0.28 },
    { zone: 'chest', localY: 0.56, localZ: 0.0, radius: 0.42 },
    { zone: 'limb', localY: 0.24, localZ: -0.14, radius: 0.34 },
  ],
  panda: [
    { zone: 'head', localY: 1.02, localZ: 0.68, radius: 0.42 },
    { zone: 'chest', localY: 0.82, localZ: 0.0, radius: 0.68 },
    { zone: 'limb', localY: 0.35, localZ: -0.14, radius: 0.54 },
  ],
  vex: [
    { zone: 'head', localY: 0.42, localZ: 0.02, radius: 0.24 },
    { zone: 'chest', localY: 0.04, localZ: 0.0, radius: 0.28 },
  ],
  evoker: [
    { zone: 'head', localY: 1.68, localZ: 0.02, radius: 0.3 },
    { zone: 'chest', localY: 1.12, localZ: 0.0, radius: 0.42 },
    { zone: 'limb', localY: 0.42, localZ: 0.0, radius: 0.36 },
  ],
  pillager: [
    { zone: 'head', localY: 1.66, localZ: 0.02, radius: 0.3 },
    { zone: 'chest', localY: 1.12, localZ: 0.0, radius: 0.42 },
    { zone: 'limb', localY: 0.42, localZ: 0.0, radius: 0.36 },
  ],
  witch: [
    { zone: 'head', localY: 1.72, localZ: 0.02, radius: 0.32 },
    { zone: 'chest', localY: 1.1, localZ: 0.0, radius: 0.42 },
    { zone: 'limb', localY: 0.42, localZ: 0.0, radius: 0.36 },
  ],
};

export function getCreatureDefaultArmor(
  species: CreatureSpecies,
  isBoss = false,
): CreatureZoneArmor {
  if (isBoss) {
    return {
      head: { tier: 'stone', hp: 130, maxHp: 130 },
      chest: { tier: 'stone', hp: 170, maxHp: 170 },
      limb: { tier: 'bone', hp: 85, maxHp: 85 },
    };
  }
  switch (species) {
    case 'trex':
    case 'spinosaurus':
      return {
        head: { tier: 'stone', hp: 65, maxHp: 65 },
        chest: { tier: 'bone', hp: 85, maxHp: 85 },
        limb: { tier: 'hide', hp: 40, maxHp: 40 },
      };
    case 'ankylosaurus':
      return {
        head: { tier: 'stone', hp: 75, maxHp: 75 },
        chest: { tier: 'stone', hp: 110, maxHp: 110 },
        limb: { tier: 'bone', hp: 45, maxHp: 45 },
      };
    case 'allosaurus':
      return {
        head: { tier: 'bone', hp: 50, maxHp: 50 },
        chest: { tier: 'bone', hp: 65, maxHp: 65 },
        limb: { tier: 'hide', hp: 30, maxHp: 30 },
      };
    case 'triceratops':
    case 'rhinoceros':
      return {
        head: { tier: 'stone', hp: 80, maxHp: 80 },
        chest: { tier: 'bone', hp: 70, maxHp: 70 },
        limb: { tier: 'hide', hp: 35, maxHp: 35 },
      };
    case 'elephant':
    case 'hippopotamus':
      return {
        head: { tier: 'bone', hp: 55, maxHp: 55 },
        chest: { tier: 'hide', hp: 75, maxHp: 75 },
        limb: { tier: 'hide', hp: 35, maxHp: 35 },
      };
    case 'stegosaurus':
    case 'sea_turtle':
      return {
        head: { tier: 'none', hp: 0, maxHp: 0 },
        chest: { tier: 'stone', hp: 75, maxHp: 75 },
        limb: { tier: 'hide', hp: 35, maxHp: 35 },
      };
    case 'saltwater_crocodile':
      return {
        head: { tier: 'bone', hp: 45, maxHp: 45 },
        chest: { tier: 'stone', hp: 65, maxHp: 65 },
        limb: { tier: 'hide', hp: 25, maxHp: 25 },
      };
    case 'bison':
    case 'grizzly_bear':
    case 'polar_bear':
    case 'moose':
    case 'gorilla':
      return {
        head: { tier: 'bone', hp: 38, maxHp: 38 },
        chest: { tier: 'hide', hp: 55, maxHp: 55 },
        limb: { tier: 'none', hp: 0, maxHp: 0 },
      };
    case 'velociraptor':
    case 'dilophosaurus':
    case 'african_lion':
    case 'tiger':
    case 'wild_boar':
    case 'great_white_shark':
      return {
        head: { tier: 'none', hp: 0, maxHp: 0 },
        chest: { tier: 'bone', hp: 28, maxHp: 28 },
        limb: { tier: 'none', hp: 0, maxHp: 0 },
      };
    default:
      return {
        head: { tier: 'none', hp: 0, maxHp: 0 },
        chest: { tier: 'none', hp: 0, maxHp: 0 },
        limb: { tier: 'none', hp: 0, maxHp: 0 },
      };
  }
}

export function getHitboxSpheres(species: CreatureSpecies): HitboxSphereSpec[] {
  return SPECIES_HITBOXES[species] || DEFAULT_SPHERES;
}

export function raycastCreatureZone(
  rayOrigin: THREE.Vector3,
  rayDir: THREE.Vector3,
  maxDist: number,
  creatures: readonly CombatTargetInput[],
  radiusExpand = 0.08,
): HitboxRaycastResult | null {
  let bestDist = maxDist;
  let bestResult: HitboxRaycastResult | null = null;

  for (let i = 0; i < creatures.length; i++) {
    const c = creatures[i];
    if (!c.alive || !c.cycleActive) continue;

    // Fast horizontal bounding reject before zone loop
    const approxDx = c.x - rayOrigin.x;
    const approxDz = c.z - rayOrigin.z;
    if (approxDx * approxDx + approxDz * approxDz > (maxDist + 5) * (maxDist + 5)) {
      continue;
    }

    const scale = c.isBoss ? 1.22 : 1.0;
    const sinY = Math.sin(c.yaw);
    const cosY = Math.cos(c.yaw);
    _fwd.set(sinY, 0, cosY);

    const spheres = getHitboxSpheres(c.species);
    for (let s = 0; s < spheres.length; s++) {
      const sp = spheres[s];
      const r = (sp.radius + radiusExpand) * scale;
      _center.set(
        c.x + sinY * sp.localZ * scale,
        c.y + sp.localY * scale,
        c.z + cosY * sp.localZ * scale,
      );

      _toCenter.subVectors(_center, rayOrigin);
      const proj = _toCenter.dot(rayDir);
      if (proj < -r || proj > bestDist + r) continue;

      const distSqToCenter = _toCenter.lengthSq();
      const perpSq = distSqToCenter - proj * proj;
      const rSq = r * r;
      if (perpSq > rSq) continue;

      const offset = Math.sqrt(Math.max(0, rSq - perpSq));
      const tHit = Math.max(0.05, proj - offset);
      if (tHit > bestDist) continue;

      // Check armor gap-slip conditions:
      // 1. Limbs always expose tendons/joints
      // 2. Grazing the armor seam edge (> 56% off-center) slips past plate edges
      // 3. Flanking or striking from behind (+dot with creature forward) bypasses frontal armor
      // 4. Blinded or staggered foes leave wide openings
      const edgeRatio = Math.sqrt(Math.max(0, perpSq)) / Math.max(0.001, r);
      const flankDot = rayDir.x * _fwd.x + rayDir.z * _fwd.z;
      const isGapSlip =
        sp.zone === 'limb' ||
        edgeRatio > 0.56 ||
        flankDot > 0.22 ||
        c.blindTimer > 0 ||
        c.stunTimer > 0;

      bestDist = tHit;
      _hitPt.copy(rayOrigin).addScaledVector(rayDir, tHit);
      bestResult = {
        creatureId: c.id,
        zone: sp.zone,
        distance: tHit,
        hitPoint: _hitPt.clone(),
        isGapSlip,
      };
    }
  }

  return bestResult;
}

export function resolveWeaponZoneHit(
  weaponClass: WeaponMaterialClass,
  baseDamage: number,
  zone: BodyZone,
  zoneArmor: CreatureZoneArmor,
  isGapSlip: boolean,
  incapacitated: boolean,
): WeaponZoneHitResolution {
  const armorState = zoneArmor[zone];
  const armorTier = armorState.hp > 0 ? armorState.tier : 'none';

  let hpMult = 1.0;
  let armorMult = 1.0;
  let stunSeconds = 0;
  let knockback = 0.8;
  let deflected = false;
  let gapSlipCrit = false;
  let headshotCrit = false;
  let feedbackLabel = 'SOLID HIT';

  if (weaponClass === 'blunt_heavy') {
    knockback = 2.8;
    if (armorTier === 'stone') {
      armorMult = 3.1;
      hpMult = 1.15;
      stunSeconds = 2.4;
      feedbackLabel = '3.1x STONE SHATTER';
    } else if (armorTier === 'bone' || armorTier === 'hide') {
      armorMult = 2.2;
      hpMult = 1.25;
      stunSeconds = 1.9;
      feedbackLabel = 'ARMOR CRUSH + STAGGER';
    } else if (zone === 'head') {
      hpMult = 1.85;
      stunSeconds = 2.7;
      headshotCrit = true;
      feedbackLabel = 'CONCUSSION STAGGER';
    } else {
      hpMult = 1.2;
      stunSeconds = 1.4;
      feedbackLabel = 'HEAVY STAGGER';
    }
  } else if (weaponClass === 'blade') {
    knockback = 0.65;
    if (armorTier === 'stone' && !isGapSlip && !incapacitated) {
      hpMult = 0.35;
      armorMult = 0.3;
      deflected = true;
      feedbackLabel = 'STONE DEFLECTED — TARGET GAPS!';
    } else if (armorTier !== 'none' && (isGapSlip || incapacitated || zone === 'limb')) {
      hpMult = 1.8;
      armorMult = 0.25;
      gapSlipCrit = true;
      feedbackLabel = 'BLADE SLIPPED ARMOR GAP (1.8x)';
    } else if (zone === 'head') {
      hpMult = 1.65;
      headshotCrit = true;
      feedbackLabel = 'CRITICAL SLASH';
    } else {
      hpMult = 1.25;
      feedbackLabel = 'DEEP CUT';
    }
  } else if (weaponClass === 'ballistic' || weaponClass === 'pierce') {
    knockback = weaponClass === 'ballistic' ? 2.4 : 1.1;
    if (armorTier === 'stone' && !incapacitated) {
      hpMult = isGapSlip ? 0.85 : 0.45;
      armorMult = 0.95;
      deflected = !isGapSlip;
      feedbackLabel = deflected
        ? 'RICOCHET OFF STONE PLATE'
        : 'GRAZED STONE EDGE';
    } else if (armorTier === 'bone') {
      hpMult = isGapSlip ? 1.15 : 0.72;
      armorMult = 1.15;
      feedbackLabel = isGapSlip ? 'PIERCED BONE SEAM' : 'ARMORED BONE HIT';
    } else if (zone === 'head') {
      hpMult = 2.15;
      stunSeconds = 0.85;
      headshotCrit = true;
      feedbackLabel = '2.1x HEADSHOT CRIT';
    } else if (zone === 'limb') {
      hpMult = 1.2;
      feedbackLabel = 'LIMB SHOT';
    } else {
      hpMult = 1.15;
      feedbackLabel = 'VITAL SHOT';
    }
  } else {
    // blunt_light (club, whip, lasso)
    knockback = 1.4;
    if (armorTier === 'stone') {
      hpMult = 0.65;
      armorMult = 1.4;
      stunSeconds = 0.9;
      feedbackLabel = 'RATTLED STONE ARMOR';
    } else {
      hpMult = zone === 'head' ? 1.45 : 1.05;
      stunSeconds = zone === 'head' ? 1.5 : 0.6;
      feedbackLabel = 'STAGGERING STRIKE';
    }
  }

  if (incapacitated && !deflected) {
    hpMult *= 1.25;
  }

  const hpDamage = Math.max(4, Math.round(baseDamage * hpMult));
  const armorDamage =
    armorTier === 'none' ? 0 : Math.max(4, Math.round(baseDamage * armorMult));

  const nextArmorHp = Math.max(0, armorState.hp - armorDamage);
  const shattered = armorTier !== 'none' && nextArmorHp <= 0;
  const armorTierAfter: ArmorMaterialTier = shattered ? 'none' : armorTier;

  return {
    hpDamage,
    armorDamage,
    armorTierBefore: armorTier,
    armorTierAfter,
    shattered,
    deflected,
    gapSlipCrit,
    headshotCrit,
    stunSeconds: shattered ? Math.max(stunSeconds, 2.1) : stunSeconds,
    knockback,
    feedbackLabel: shattered ? `${armorTier.toUpperCase()} SHATTERED!` : feedbackLabel,
  };
}

export function evaluateWeaponEffectivenessLabel(
  weaponClass: WeaponMaterialClass | null,
  zone: BodyZone,
  armorTier: ArmorMaterialTier,
  armorHp: number,
  isGapSlip: boolean,
): string {
  const hasArmor = armorTier !== 'none' && armorHp > 0;
  if (!weaponClass) {
    return hasArmor ? 'EQUIP WARHAMMER OR BLADE' : 'BARE HANDS';
  }
  if (weaponClass === 'blunt_heavy') {
    if (armorTier === 'stone' && hasArmor) return '3.1x SHATTER READY';
    if (hasArmor) return 'CRUSH ARMOR + STAGGER';
    return zone === 'head' ? 'CONCUSSION WEAKPOINT' : 'HEAVY STAGGER READY';
  }
  if (weaponClass === 'blade') {
    if (armorTier === 'stone' && hasArmor && !isGapSlip) {
      return 'DEFLECTS STONE — AIM GAPS/LIMBS';
    }
    if (hasArmor && (isGapSlip || zone === 'limb')) {
      return 'SLIP ARMOR GAP (1.8x)';
    }
    return zone === 'head' ? '1.6x SLASH' : 'CLEAN CUT';
  }
  if (weaponClass === 'ballistic' || weaponClass === 'pierce') {
    if (armorTier === 'stone' && hasArmor) {
      return isGapSlip ? 'GRAZE SEAM (WEAK)' : 'STONE RICOCHET — BREAK PLATE';
    }
    if (!hasArmor && zone === 'head') return '2.1x CRITICAL WEAKPOINT';
    if (zone === 'limb') return 'EXPOSED LIMB (1.2x)';
    return hasArmor ? 'CRACKING ARMOR' : 'VITAL TARGET';
  }
  return 'LIGHT IMPACT';
}
