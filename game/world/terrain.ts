import { BiomeId } from '../types';

export const OCEAN_LEVEL = 0.0;
export const LAKE_CENTER = { x: -14, z: 8, radius: 18, waterY: 2.6 };
export const WATERFALL_POS = { x: 6, z: -50 };
export const CAVE_POS = { x: -36, z: -56 };
export const EXPEDITION_POS = { x: 46, z: -12 };
export const PLAYER_SPAWN = { x: 0, z: 112 };

export const WORLD_RADIUS = 175;
export const PLAYABLE_MAX_RADIUS = 152;

export const BIOME_INFO: Record<
  BiomeId,
  { name: string; color: string; description: string }
> = {
  ocean: {
    name: 'Cobalt Ocean',
    color: '#0284c7',
    description: 'Deep tropical waters patrolled by coastal dolphins.',
  },
  beach: {
    name: 'Sunbleached Shores',
    color: '#e7c985',
    description: 'Warm sandy coastline rich in driftwood, sand, and reef fish.',
  },
  forest: {
    name: 'Emerald Canopy',
    color: '#15803d',
    description: 'Dense prehistoric jungle teeming with hardwood, berries, and raptors.',
  },
  grassland: {
    name: 'Amber Savanna',
    color: '#84a93c',
    description: 'Sunlit plains of wild wheat grazed by Triceratops and Parasaurolophus.',
  },
  river: {
    name: 'Crystal River',
    color: '#0ea5e9',
    description: 'Fresh mountain runoff carrying clay banks down to the bay.',
  },
  lake: {
    name: 'Azure Lake',
    color: '#06b6d4',
    description: 'Serene freshwater basin fed by the northern mountain waterfall.',
  },
  mountain: {
    name: 'Obsidian Peaks',
    color: '#57534e',
    description: 'Jagged volcanic ridges rich in stone boulders and raw metal ore.',
  },
  cave: {
    name: 'Obsidian Cavern',
    color: '#292524',
    description: 'Hollowed volcanic grotto glittering with dense ore veins.',
  },
  expedition: {
    name: 'Abandoned Expedition',
    color: '#b45309',
    description: 'Remnants of an earlier survey camp left behind in the jungle.',
  },
};

// Deterministic 2D value noise + FBM (fast, zero external deps)
function hash2(ix: number, iz: number): number {
  const n = Math.sin(ix * 127.1 + iz * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

function smoothNoise(x: number, z: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);

  const a = hash2(ix, iz);
  const b = hash2(ix + 1, iz);
  const c = hash2(ix, iz + 1);
  const d = hash2(ix + 1, iz + 1);

  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}

function fbm(x: number, z: number, octaves = 4): number {
  let value = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    value += amp * smoothNoise(x * freq, z * freq);
    freq *= 2.02;
    amp *= 0.5;
  }
  return value;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function distToSegment(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number,
): { dist: number; t: number } {
  const dx = bx - ax;
  const dz = bz - az;
  const lenSq = dx * dx + dz * dz;
  if (lenSq === 0) return { dist: Math.hypot(px - ax, pz - az), t: 0 };
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / lenSq));
  const projX = ax + t * dx;
  const projZ = az + t * dz;
  return { dist: Math.hypot(px - projX, pz - projZ), t };
}

// River path from waterfall plunge pool -> lake -> coastal estuary
const RIVER_POINTS: [number, number, number][] = [
  [6, -46, 2.6],
  [-4, -22, 2.6],
  [-14, 8, 2.6],
  [8, 26, 2.2],
  [30, 48, 1.5],
  [50, 74, 0.7],
  [68, 102, 0.0],
  [82, 128, -0.8],
];

export function getRiverSample(
  x: number,
  z: number,
): { dist: number; waterY: number; inRiver: boolean } {
  let minDist = 9999;
  let bestWaterY = OCEAN_LEVEL;

  for (let i = 0; i < RIVER_POINTS.length - 1; i++) {
    const [ax, az, ay] = RIVER_POINTS[i];
    const [bx, bz, by] = RIVER_POINTS[i + 1];
    const seg = distToSegment(x, z, ax, az, bx, bz);
    if (seg.dist < minDist) {
      minDist = seg.dist;
      bestWaterY = ay + (by - ay) * seg.t;
    }
  }

  return {
    dist: minDist,
    waterY: bestWaterY,
    inRiver: minDist < 6.5,
  };
}

export function getWaterLevelAt(x: number, z: number): number {
  const dLake = Math.hypot(x - LAKE_CENTER.x, z - LAKE_CENTER.z);
  if (dLake < LAKE_CENTER.radius + 3) {
    return LAKE_CENTER.waterY;
  }
  const river = getRiverSample(x, z);
  if (river.dist < 8.5) {
    return Math.max(OCEAN_LEVEL, river.waterY);
  }
  return OCEAN_LEVEL;
}

export function isFreshwaterAt(x: number, z: number): boolean {
  const h = getTerrainHeight(x, z);
  const dLake = Math.hypot(x - LAKE_CENTER.x, z - LAKE_CENTER.z);
  if (dLake < LAKE_CENTER.radius && h < LAKE_CENTER.waterY + 0.35) return true;
  const river = getRiverSample(x, z);
  if (river.dist < 7.0 && river.waterY > 0.25 && h < river.waterY + 0.35) {
    return true;
  }
  return false;
}

export function getTerrainHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const angle = Math.atan2(z, x);

  // Organic coastline radius variation
  const coastWarp =
    18 * (fbm(Math.cos(angle) * 1.4 + 3.1, Math.sin(angle) * 1.4 + 7.4, 3) - 0.5);
  const islandRadius = 128 + coastWarp;

  // Base radial island profile
  const normR = r / islandRadius;
  let h = 0;

  if (normR < 1.18) {
    // Beach shelf to inland rise
    const inland = 1 - smoothstep(0.68, 1.04, normR);
    h = -3.8 + inland * 7.2;
  } else {
    h = -3.8 - (normR - 1.18) * 10;
  }

  // Gentle rolling hills
  const hills = (fbm(x * 0.016 + 11.2, z * 0.016 + 5.7, 4) - 0.45) * 7.5;
  const landMask = smoothstep(0.55, 0.92, 1 - normR * 0.85);
  h += hills * landMask;

  // Northern Obsidian Mountain Ridge (z < -35)
  const mountainFactor = smoothstep(-28, -72, z) * (1 - smoothstep(65, 115, Math.abs(x)));
  const ridgeDetail = fbm(x * 0.032 + 2.5, z * 0.032 + 9.1, 4);
  h += mountainFactor * (13.0 + ridgeDetail * 14.0);

  // Waterfall cliff shelf around (6, -50)
  const dWaterfall = Math.hypot(x - WATERFALL_POS.x, z - WATERFALL_POS.z);
  if (dWaterfall < 16) {
    const northSlope = smoothstep(-47, -56, z);
    const shelf = 2.6 + northSlope * 11.5;
    const blend = 1 - smoothstep(8, 16, dWaterfall);
    h = h * (1 - blend) + shelf * blend;
  }

  // Flatten Mountain Cavern Entrance terrace around (-36, -56)
  const dCave = Math.hypot(x - CAVE_POS.x, z - CAVE_POS.z);
  if (dCave < 15) {
    const blend = 1 - smoothstep(7, 15, dCave);
    h = h * (1 - blend) + 7.4 * blend;
  }

  // Flatten Abandoned Expedition clearing around (46, -12)
  const dExp = Math.hypot(x - EXPEDITION_POS.x, z - EXPEDITION_POS.z);
  if (dExp < 16) {
    const blend = 1 - smoothstep(8, 16, dExp);
    h = h * (1 - blend) + 4.3 * blend;
  }

  // Flatten gentle landing beach around spawn (0, 112)
  const dSpawn = Math.hypot(x - PLAYER_SPAWN.x, z - PLAYER_SPAWN.z);
  if (dSpawn < 14) {
    const blend = 1 - smoothstep(6, 14, dSpawn);
    h = h * (1 - blend) + 1.45 * blend;
  }

  // Carve Azure Lake basin at (-14, 8)
  const dLake = Math.hypot(x - LAKE_CENTER.x, z - LAKE_CENTER.z);
  if (dLake < LAKE_CENTER.radius + 6) {
    const lakeDepth = 1 - smoothstep(LAKE_CENTER.radius - 3, LAKE_CENTER.radius + 6, dLake);
    const targetBed = 1.1;
    h = h * (1 - lakeDepth) + targetBed * lakeDepth;
  }

  // Carve Crystal River channel
  const river = getRiverSample(x, z);
  if (river.dist < 9.5 && z > -48) {
    const channelBlend = 1 - smoothstep(3.2, 9.5, river.dist);
    const targetBed = river.waterY - 1.25;
    h = h * (1 - channelBlend) + targetBed * channelBlend;
  }

  return h;
}

export function getBiomeAt(x: number, z: number): BiomeId {
  const dExp = Math.hypot(x - EXPEDITION_POS.x, z - EXPEDITION_POS.z);
  if (dExp < 14) return 'expedition';

  const dCave = Math.hypot(x - CAVE_POS.x, z - CAVE_POS.z);
  if (dCave < 11) return 'cave';

  const h = getTerrainHeight(x, z);
  const dLake = Math.hypot(x - LAKE_CENTER.x, z - LAKE_CENTER.z);
  if (dLake < LAKE_CENTER.radius + 2.5) return 'lake';

  const river = getRiverSample(x, z);
  if (river.dist < 7.5 && river.waterY > 0.15) return 'river';

  if (h < OCEAN_LEVEL - 0.15) return 'ocean';
  if (h < 2.25) return 'beach';
  if (h > 10.5 || z < -48) return 'mountain';

  // East/Central = Dense Tropical Forest, West = Open Amber Savanna
  const savannaMask = fbm(x * 0.01 + 4, z * 0.01 + 8, 2);
  if (x < -18 || (x < 4 && savannaMask > 0.54)) {
    return 'grassland';
  }
  return 'forest';
}

export function getTerrainSlope(x: number, z: number): number {
  const e = 0.75;
  const hx1 = getTerrainHeight(x + e, z);
  const hx0 = getTerrainHeight(x - e, z);
  const hz1 = getTerrainHeight(x, z + e);
  const hz0 = getTerrainHeight(x, z - e);
  const dx = (hx1 - hx0) / (2 * e);
  const dz = (hz1 - hz0) / (2 * e);
  return Math.hypot(dx, dz);
}
