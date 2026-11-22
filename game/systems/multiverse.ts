import { DimensionId } from '../types';
import { OCEAN_LEVEL, getTerrainHeight, getTerrainSlope, getWaterLevelAt } from '../world/terrain';

export interface DimensionDefinition {
  id: DimensionId;
  name: string;
  shortName: string;
  category: 'dimension' | 'island';
  subtitle: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  primaryHex: number;
  secondaryHex: number;
  skyHex: number;
  fogHex: number;
  fogDensity: number;
  sunColorHex: number;
  sunIntensity: number;
  hemiSkyHex: number;
  hemiGroundHex: number;
  hemiIntensity: number;
  showStars: boolean;
  gravityMult: number;
  temperatureC: number;
  hasOcean: boolean;
  hazardType?: 'lava' | 'void';
  lootHighlights: string[];
}

export const DIMENSION_DEFINITIONS: Record<DimensionId, DimensionDefinition> = {
  overworld: {
    id: 'overworld',
    name: 'Lost World Main Island',
    shortName: 'Main Island',
    category: 'island',
    subtitle: 'Origin Sanctuary · 1.00g',
    description:
      'Your home island with the Hilltop House, 3-Bay Custom Garage, dinosaurs, wildlife, and ocean shipwreck.',
    primaryColor: '#22c55e',
    secondaryColor: '#38bdf8',
    primaryHex: 0x22c55e,
    secondaryHex: 0x38bdf8,
    skyHex: 0x7cc4e0,
    fogHex: 0x7cc4e0,
    fogDensity: 0.0034,
    sunColorHex: 0xfff1d6,
    sunIntensity: 1.9,
    hemiSkyHex: 0xbae6fd,
    hemiGroundHex: 0x3f4e28,
    hemiIntensity: 0.72,
    showStars: false,
    gravityMult: 1.0,
    temperatureC: 37.0,
    hasOcean: true,
    lootHighlights: ['Lowrider, DONK & SLAB Garage', 'Base Armory Chest', 'Dinosaurs & Farm'],
  },
  space: {
    id: 'space',
    name: 'Outer Space Dimension',
    shortName: 'Outer Space',
    category: 'dimension',
    subtitle: 'Zero-G Asteroid Expanse · 0.34g',
    description:
      'Deep cosmic starfield with floating asteroid platforms, low-gravity jumps & slow-fall vehicle airtime, and Outer Space Gems.',
    primaryColor: '#8b5cf6',
    secondaryColor: '#38bdf8',
    primaryHex: 0x8b5cf6,
    secondaryHex: 0x38bdf8,
    skyHex: 0x030511,
    fogHex: 0x060a1c,
    fogDensity: 0.0018,
    sunColorHex: 0xe0e7ff,
    sunIntensity: 1.45,
    hemiSkyHex: 0x6366f1,
    hemiGroundHex: 0x1e1b4b,
    hemiIntensity: 0.85,
    showStars: true,
    gravityMult: 0.34,
    temperatureC: 34.4,
    hasOcean: false,
    hazardType: 'void',
    lootHighlights: ['Outer Space Gems', '0.34g Low-Gravity Physics', 'Cosmic Asteroid Stunts'],
  },
  nether: {
    id: 'nether',
    name: 'Nether / Hellfire Dimension',
    shortName: 'Hellfire Nether',
    category: 'dimension',
    subtitle: 'Obsidian & Magma Abyss · 1.00g',
    description:
      'Jagged obsidian ridges over glowing lava lakes, rising embers, Nether Guardians, and Netherite / Inferno Blade upgrades.',
    primaryColor: '#f97316',
    secondaryColor: '#dc2626',
    primaryHex: 0xf97316,
    secondaryHex: 0xdc2626,
    skyHex: 0x220705,
    fogHex: 0x330c08,
    fogDensity: 0.0062,
    sunColorHex: 0xfb923c,
    sunIntensity: 1.55,
    hemiSkyHex: 0xea580c,
    hemiGroundHex: 0x290b08,
    hemiIntensity: 0.92,
    showStars: false,
    gravityMult: 1.0,
    temperatureC: 39.4,
    hasOcean: false,
    hazardType: 'lava',
    lootHighlights: ['Inferno Blade Unlock', 'Nether Embers', 'Hellfire Guardians'],
  },
  gold: {
    id: 'gold',
    name: 'The Gold Dimension',
    shortName: 'Gold Realm',
    category: 'dimension',
    subtitle: '24K Gilded Sanctuary · 0.95g',
    description:
      'Gleaming solid-gold ruins, golden palm groves, treasure vaults overflowing with Gold Bars, and 24K Gilded Paint/Rim unlocks.',
    primaryColor: '#facc15',
    secondaryColor: '#f59e0b',
    primaryHex: 0xfacc15,
    secondaryHex: 0xf59e0b,
    skyHex: 0xfde68a,
    fogHex: 0xfcd34d,
    fogDensity: 0.0026,
    sunColorHex: 0xfffbeb,
    sunIntensity: 2.25,
    hemiSkyHex: 0xfef08a,
    hemiGroundHex: 0x92400e,
    hemiIntensity: 1.05,
    showStars: false,
    gravityMult: 0.95,
    temperatureC: 37.3,
    hasOcean: true,
    lootHighlights: ['Solid Gold Bars', '24K Gilded Paint & Rims', 'Golden Vault Sentinels'],
  },
  diamond: {
    id: 'diamond',
    name: 'The Diamond Dimension',
    shortName: 'Diamond Cavern',
    category: 'dimension',
    subtitle: 'Crystalline Refraction · 0.92g',
    description:
      'Translucent azure crystal caverns, faceted diamond pillars, high-tier Crystal Armor shields, and Diamond-Tipped Ammo.',
    primaryColor: '#38bdf8',
    secondaryColor: '#67e8f9',
    primaryHex: 0x38bdf8,
    secondaryHex: 0x67e8f9,
    skyHex: 0x082f49,
    fogHex: 0x0c4a6e,
    fogDensity: 0.0036,
    sunColorHex: 0xbae6fd,
    sunIntensity: 1.85,
    hemiSkyHex: 0x7dd3fc,
    hemiGroundHex: 0x082f49,
    hemiIntensity: 1.05,
    showStars: true,
    gravityMult: 0.92,
    temperatureC: 35.8,
    hasOcean: false,
    lootHighlights: ['Crystal Armor (55% Shield)', 'Diamond-Tipped Ammo', 'Pure Diamond Crystals'],
  },
  alien: {
    id: 'alien',
    name: 'The Alien Dimension',
    shortName: 'Alien World',
    category: 'dimension',
    subtitle: 'Xenobiology Outpost · 0.85g',
    description:
      'Bioluminescent purple & teal alien landscape with crashed flying saucers, hostile extraterrestrials, and Alien Plasma Guns.',
    primaryColor: '#a855f7',
    secondaryColor: '#2dd4bf',
    primaryHex: 0xa855f7,
    secondaryHex: 0x2dd4bf,
    skyHex: 0x17092b,
    fogHex: 0x210d3d,
    fogDensity: 0.004,
    sunColorHex: 0xc084fc,
    sunIntensity: 1.6,
    hemiSkyHex: 0x5eead4,
    hemiGroundHex: 0x2e1065,
    hemiIntensity: 0.95,
    showStars: true,
    gravityMult: 0.85,
    temperatureC: 36.4,
    hasOcean: false,
    lootHighlights: ['Alien Plasma Gun', 'Alien Cores & Bio-Flora', 'Crashed UFO Saucers'],
  },
  island_arctic: {
    id: 'island_arctic',
    name: 'Arctic Frost Island',
    shortName: 'Arctic Island',
    category: 'island',
    subtitle: 'Secondary Archipelago · North Sea',
    description:
      'Snow-blanketed glacier island surrounded by deep icy ocean, frozen evergreens, and flat outpost plateaus.',
    primaryColor: '#bae6fd',
    secondaryColor: '#0ea5e9',
    primaryHex: 0xbae6fd,
    secondaryHex: 0x0ea5e9,
    skyHex: 0xcbe8f8,
    fogHex: 0xd8effa,
    fogDensity: 0.0035,
    sunColorHex: 0xf8fafc,
    sunIntensity: 1.95,
    hemiSkyHex: 0xe0f2fe,
    hemiGroundHex: 0x475569,
    hemiIntensity: 0.9,
    showStars: false,
    gravityMult: 1.0,
    temperatureC: 33.2,
    hasOcean: true,
    lootHighlights: ['Outpost Glacier Plateau', 'Diamond Crystals', 'Arctic Timber & Ore'],
  },
  island_volcanic: {
    id: 'island_volcanic',
    name: 'Volcanic Badlands Island',
    shortName: 'Volcanic Island',
    category: 'island',
    subtitle: 'Secondary Archipelago · East Caldera',
    description:
      'Basalt cliffs, smoldering obsidian plains, magma vents, and fortified high-ground clearings for volcanic outposts.',
    primaryColor: '#ef4444',
    secondaryColor: '#f59e0b',
    primaryHex: 0xef4444,
    secondaryHex: 0xf59e0b,
    skyHex: 0x451a12,
    fogHex: 0x5c2317,
    fogDensity: 0.004,
    sunColorHex: 0xfdba74,
    sunIntensity: 1.8,
    hemiSkyHex: 0xfb923c,
    hemiGroundHex: 0x292524,
    hemiIntensity: 0.82,
    showStars: false,
    gravityMult: 0.96,
    temperatureC: 38.7,
    hasOcean: true,
    lootHighlights: ['Basalt Outpost Clearing', 'Nether Embers & Flint', 'Caldera Viewpoints'],
  },
  island_jungle: {
    id: 'island_jungle',
    name: 'Tropical Jungle Island',
    shortName: 'Jungle Island',
    category: 'island',
    subtitle: 'Secondary Archipelago · South Lagoon',
    description:
      'Lush emerald archipelago ringed by golden lagoons, towering jungle canopies, and ancient stone outpost clearings.',
    primaryColor: '#10b981',
    secondaryColor: '#84cc16',
    primaryHex: 0x10b981,
    secondaryHex: 0x84cc16,
    skyHex: 0x7dd3fc,
    fogHex: 0xa7f3d0,
    fogDensity: 0.003,
    sunColorHex: 0xfef3c7,
    sunIntensity: 2.0,
    hemiSkyHex: 0xa7f3d0,
    hemiGroundHex: 0x1e4620,
    hemiIntensity: 0.85,
    showStars: false,
    gravityMult: 1.0,
    temperatureC: 37.4,
    hasOcean: true,
    lootHighlights: ['Ancient Temple Clearing', 'Gold Bars & Tropical Fruit', 'Outpost Sanctuary'],
  },
  bee_dimension: {
    id: 'bee_dimension',
    name: 'The Bee Dimension',
    shortName: 'Hive Realm',
    category: 'dimension',
    subtitle: 'Golden Hive Sanctuary · 0.88g',
    description:
      'An amber-sky hive realm of towering wax combs, colossal flowers, drifting pollen, and a honey sea. Home of the Hive Queen.',
    primaryColor: '#fbbf24',
    secondaryColor: '#f59e0b',
    primaryHex: 0xfbbf24,
    secondaryHex: 0xf59e0b,
    skyHex: 0xfde68a,
    fogHex: 0xfbbf24,
    fogDensity: 0.0028,
    sunColorHex: 0xfff7d6,
    sunIntensity: 2.15,
    hemiSkyHex: 0xfef3c7,
    hemiGroundHex: 0x78350f,
    hemiIntensity: 1.0,
    showStars: false,
    gravityMult: 0.88,
    temperatureC: 38.2,
    hasOcean: true,
    lootHighlights: ['Hive Queen Audience', 'Honeycombs & Honey Jewels', 'Bee Riding Lessons'],
  },
};

export const PORTAL_DESTINATION_ORDER: DimensionId[] = [
  'space',
  'nether',
  'gold',
  'diamond',
  'alien',
  'island_arctic',
  'island_volcanic',
  'island_jungle',
  'bee_dimension',
  'overworld',
];

export interface AsteroidPadSpec {
  x: number;
  z: number;
  radius: number;
  y: number;
}

export const SPACE_ASTEROID_PADS: AsteroidPadSpec[] = [
  { x: 0, z: 0, radius: 22, y: 1.8 },
  { x: 34, z: 6, radius: 13.5, y: 3.6 },
  { x: -34, z: -8, radius: 13.5, y: 3.2 },
  { x: 8, z: 36, radius: 14, y: 4.5 },
  { x: -10, z: -36, radius: 13.5, y: 2.8 },
  { x: 46, z: -28, radius: 12.5, y: 5.8 },
  { x: -45, z: 30, radius: 12.5, y: 5.2 },
  { x: 0, z: 68, radius: 15, y: 6.4 },
  { x: 0, z: -68, radius: 15, y: 4.2 },
];

export const SPACE_BRIDGES: { ax: number; az: number; ay: number; bx: number; bz: number; by: number; width: number }[] = [
  { ax: 0, az: 0, ay: 1.8, bx: 34, bz: 6, by: 3.6, width: 5.4 },
  { ax: 0, az: 0, ay: 1.8, bx: -34, bz: -8, by: 3.2, width: 5.4 },
  { ax: 0, az: 0, ay: 1.8, bx: 8, bz: 36, by: 4.5, width: 5.4 },
  { ax: 0, az: 0, ay: 1.8, bx: -10, bz: -36, by: 2.8, width: 5.4 },
  { ax: 8, az: 36, ay: 4.5, bx: 0, bz: 68, by: 6.4, width: 4.8 },
  { ax: -10, az: -36, ay: 2.8, bx: 0, bz: -68, by: 4.2, width: 4.8 },
  { ax: 34, az: 6, ay: 3.6, bx: 46, bz: -28, by: 5.8, width: 4.6 },
  { ax: -34, az: -8, ay: 3.2, bx: -45, bz: 30, by: 5.2, width: 4.6 },
];

function pointToSegmentDistAndT(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number,
): { dist: number; t: number } {
  const vx = bx - ax;
  const vz = bz - az;
  const wx = px - ax;
  const wz = pz - az;
  const lenSq = vx * vx + vz * vz;
  const t = lenSq > 0.001 ? Math.max(0, Math.min(1, (wx * vx + wz * vz) / lenSq)) : 0;
  const cx = ax + vx * t;
  const cz = az + vz * t;
  return { dist: Math.hypot(px - cx, pz - cz), t };
}

/**
 * Analytical deck surface collider for Space dimension floating asteroid pads
 * and narrow connecting bridges so players and vehicles never slip between
 * diagonal PlaneGeometry terrain triangles.
 */
export function getSpacePlatformSurfaceY(
  x: number,
  z: number,
  footY: number,
  prevFootY = footY,
): number {
  const sweepFootY = Math.max(footY, prevFootY);
  let bestY = -9999;

  for (const pad of SPACE_ASTEROID_PADS) {
    const d = Math.hypot(x - pad.x, z - pad.z);
    if (d <= pad.radius * 0.96) {
      const edge = Math.max(0, Math.min(1, (pad.radius - d) / 2.2));
      const bump =
        Math.sin(x * 0.19) * Math.cos(z * 0.17) * 0.32 * Math.max(0, Math.min(1, (d - 6) / 6));
      const h = pad.y * edge + bump * edge - (1 - edge) * 3.0;
      if (sweepFootY >= h - 1.75 && h > bestY) {
        bestY = h;
      }
    }
  }

  for (const br of SPACE_BRIDGES) {
    const { dist, t } = pointToSegmentDistAndT(x, z, br.ax, br.az, br.bx, br.bz);
    if (dist <= br.width * 0.56) {
      const h = br.ay + (br.by - br.ay) * t;
      if (sweepFootY >= h - 1.75 && h > bestY) {
        bestY = h;
      }
    }
  }

  return bestY;
}

export function getDimensionTerrainHeight(dim: DimensionId, x: number, z: number): number {
  if (dim === 'overworld') {
    return getTerrainHeight(x, z);
  }

  const r = Math.hypot(x, z);
  // Keep central arrival plaza clean & smooth for walking + driving vehicles
  const arrivalFlatten = Math.max(0, Math.min(1, (r - 11) / 14));

  if (dim === 'bee_dimension') {
    const coast = 104 + Math.sin(Math.atan2(z, x) * 3.2) * 7;
    if (r > coast + 18) return -5.4;
    const falloff = r > coast - 14 ? Math.max(0, (coast + 6 - r) / 20) : 1;
    const meadow = Math.sin(x * 0.05) * 1.55 + Math.cos(z * 0.055) * 1.45 + Math.sin(r * 0.07) * 0.7;
    // Gentle ring hill under the giant hive at r ~ 58
    const hiveHill = Math.exp(-Math.pow((r - 58) / 24, 2)) * 5.5;
    const raw = -3.4 + falloff * (5.6 + meadow + hiveHill);
    return raw * arrivalFlatten + 1.6 * (1 - arrivalFlatten);
  }

  if (dim === 'space') {
    let bestH = -26;
    for (const pad of SPACE_ASTEROID_PADS) {
      const d = Math.hypot(x - pad.x, z - pad.z);
      if (d <= pad.radius) {
        const edge = Math.max(0, Math.min(1, (pad.radius - d) / 2.2));
        const bump =
          Math.sin(x * 0.19) * Math.cos(z * 0.17) * 0.32 * Math.max(0, Math.min(1, (d - 6) / 6));
        const h = pad.y * edge + bump * edge - (1 - edge) * 3.0;
        if (h > bestH) bestH = h;
      }
    }
    for (const br of SPACE_BRIDGES) {
      const { dist, t } = pointToSegmentDistAndT(x, z, br.ax, br.az, br.bx, br.bz);
      if (dist <= br.width * 0.55) {
        const h = br.ay + (br.by - br.ay) * t;
        if (h > bestH) bestH = h;
      }
    }
    return bestH;
  }

  if (dim === 'nether') {
    // Obsidian causeways + central fortress pad above glowing lava lake (y = 0)
    const wave =
      Math.sin(x * 0.065) * 3.2 +
      Math.cos(z * 0.072) * 3.0 +
      Math.sin((x + z) * 0.12) * 1.4;
    const ridge = Math.abs(Math.sin(x * 0.045) * Math.cos(z * 0.045)) * 8.5;
    // Cross-shaped obsidian bridge network so players & vehicles can explore safely over lava
    const onMainCauseway = Math.abs(x) < 8.5 || Math.abs(z) < 8.5 || Math.abs(r - 48) < 7.5;
    let h = (wave + ridge - 1.5) * arrivalFlatten + 2.2 * (1 - arrivalFlatten);
    if (onMainCauseway) {
      h = Math.max(h, 1.85 + Math.sin(r * 0.05) * 0.45);
    }
    if (r > 125) h -= (r - 125) * 0.35;
    return h;
  }

  if (dim === 'gold') {
    const dunes =
      Math.sin(x * 0.055) * 2.1 +
      Math.cos(z * 0.055) * 2.1 +
      Math.sin(r * 0.09) * 1.1;
    // Stepped golden terrace rings
    const step = r > 22 && r < 42 ? 2.6 : r >= 42 && r < 66 ? 4.4 : 1.4;
    const islandFalloff = r > 105 ? -(r - 105) * 0.42 : 0;
    return (1.6 + dunes * 0.55 + step * 0.45 + islandFalloff) * arrivalFlatten + 1.8 * (1 - arrivalFlatten);
  }

  if (dim === 'diamond') {
    const cavernBowl = Math.max(0, (r - 42) * 0.14);
    const facets =
      Math.abs(Math.sin(x * 0.09) + Math.cos(z * 0.09)) * 1.65 +
      Math.sin(r * 0.12) * 0.8;
    return (1.4 + facets + cavernBowl) * arrivalFlatten + 1.5 * (1 - arrivalFlatten);
  }

  if (dim === 'alien') {
    const craters =
      Math.sin(x * 0.075) * 2.4 +
      Math.cos(z * 0.08) * 2.4 -
      Math.exp(-Math.pow((r - 44) / 14, 2)) * 2.2;
    const outerRim = r > 110 ? (r - 110) * 0.28 : 0;
    return (1.8 + craters + outerRim) * arrivalFlatten + 1.8 * (1 - arrivalFlatten);
  }

  if (dim === 'island_arctic') {
    const coast = 104 - Math.sin(Math.atan2(z, x) * 3) * 8;
    if (r > coast + 18) return -5.5;
    const falloff = r > coast - 12 ? Math.max(0, (coast + 6 - r) / 18) : 1;
    const peaks =
      Math.abs(Math.sin(x * 0.05) * Math.cos(z * 0.05)) * 11.5 +
      Math.sin(x * 0.11) * 1.1;
    const raw = -4.2 + falloff * (6.2 + peaks);
    return raw * arrivalFlatten + 2.2 * (1 - arrivalFlatten);
  }

  if (dim === 'island_volcanic') {
    const coast = 102 + Math.cos(Math.atan2(z, x) * 4) * 7;
    if (r > coast + 18) return -5.8;
    const falloff = r > coast - 12 ? Math.max(0, (coast + 6 - r) / 18) : 1;
    // Dramatic volcanic ring peak at r ~ 58
    const volcanoRing = Math.exp(-Math.pow((r - 58) / 18, 2)) * 14.5;
    const basalt = Math.sin(x * 0.08) * 1.6 + Math.cos(z * 0.08) * 1.6;
    const raw = -4.5 + falloff * (6.4 + volcanoRing + basalt);
    return raw * arrivalFlatten + 2.0 * (1 - arrivalFlatten);
  }

  // island_jungle
  const coast = 106 + Math.sin(Math.atan2(z, x) * 5) * 7;
  if (r > coast + 18) return -5.4;
  const falloff = r > coast - 12 ? Math.max(0, (coast + 6 - r) / 18) : 1;
  const hills =
    Math.sin(x * 0.06) * 2.8 +
    Math.cos(z * 0.055) * 2.8 +
    Math.exp(-Math.pow((r - 45) / 22, 2)) * 4.5;
  const raw = -4.0 + falloff * (5.9 + hills);
  return raw * arrivalFlatten + 1.9 * (1 - arrivalFlatten);
}

export function getDimensionTerrainSlope(dim: DimensionId, x: number, z: number): number {
  if (dim === 'overworld') {
    return getTerrainSlope(x, z);
  }
  const eps = 0.6;
  const hx1 = getDimensionTerrainHeight(dim, x + eps, z);
  const hx2 = getDimensionTerrainHeight(dim, x - eps, z);
  const hz1 = getDimensionTerrainHeight(dim, x, z + eps);
  const hz2 = getDimensionTerrainHeight(dim, x, z - eps);
  const dx = (hx1 - hx2) / (2 * eps);
  const dz = (hz1 - hz2) / (2 * eps);
  return Math.hypot(dx, dz);
}

export function getDimensionWaterLevel(dim: DimensionId, x: number, z: number): number {
  if (dim === 'overworld') {
    return getWaterLevelAt(x, z);
  }
  const def = DIMENSION_DEFINITIONS[dim];
  if (!def.hasOcean) return -999;
  return OCEAN_LEVEL;
}

export function isDimensionLavaHazard(
  dim: DimensionId,
  x: number,
  z: number,
  y: number,
): boolean {
  if (dim !== 'nether') return false;
  const th = getDimensionTerrainHeight('nether', x, z);
  return th < 0.05 && y <= 0.45;
}

export function getDimensionArrivalPoint(dim: DimensionId): {
  x: number;
  y: number;
  z: number;
  yaw: number;
} {
  if (dim === 'overworld') {
    // Clean clearing right in front of the Hilltop House & Garage driveway
    const x = -14;
    const z = 54;
    return { x, y: getTerrainHeight(x, z) + 0.25, z, yaw: 0 };
  }
  const x = 0;
  const z = 0;
  const y = getDimensionTerrainHeight(dim, x, z) + 0.35;
  return { x, y, z, yaw: 0 };
}
