import { BiomeId, WorldType } from '../types';

export const OCEAN_LEVEL = 0.0;
export const FLAT_GROUND_Y = 1.0;
export const FLAT_PLAYABLE_MAX_RADIUS = 310;
export const FLAT_PLAYER_SPAWN = { x: 0, z: 24 };
export const LAKE_CENTER = { x: -14, z: 8, radius: 18, waterY: 2.6 };
export const WATERFALL_POS = { x: 6, z: -50 };
export const CAVE_POS = { x: -36, z: -56 };
export const EXPEDITION_POS = { x: 46, z: -12 };
export const HOMESTEAD_POS = { x: -24, z: 58 };
export const FARM_POND_POS = { x: -12, z: 56, radius: 4.4, waterY: 2.95 };
export const WHEATFIELD_POS = { x: -2, z: 68 };
export const FARMER_POS = { x: -12, z: 70 };
export const HILL_HOUSE_POS = { x: -44, z: 78 };
export const HILL_HOUSE_Y = 8.4;
export const VEHICLE_GARAGE_POS = { x: -28, z: 93 };
export const VEHICLE_GARAGE_Y = 3.25;
export const SNOWY_WOODLAND_POS = { x: -24, z: -72 };
export const AUTUMN_GROVE_POS = { x: 26, z: 22 };
export const SWAMP_POS = { x: 46, z: 44, radius: 9.0, waterY: 1.55 };
export const DEAD_OAK_POS = { x: 18, z: 78 };
export const TRIAL_CHAMBERS_POS = { x: 2, z: 36 };
export const WOODLAND_MANSION_POS = { x: 20, z: -8 };
export const TAIGA_VILLAGE_POS = { x: 32, z: -36 };
export const PILLAGER_OUTPOST_POS = { x: 14, z: -32 };
export const TRAIL_RUINS_POS = { x: -46, z: -34 };
export const SNOWY_VILLAGE_POS = { x: -34, z: -84 };
export const SNOWY_IGLOO_POS = { x: -50, z: -64 };
export const JUNGLE_TEMPLE_POS = { x: 74, z: 38 };
export const PLAYER_SPAWN = { x: 0, z: 112 };

export const WORLD_RADIUS = 175;
export const PLAYABLE_MAX_RADIUS = 152;

let activeTerrainWorldType: WorldType = 'island';

export function setActiveTerrainWorldType(worldType: WorldType): void {
  activeTerrainWorldType = worldType === 'flat' ? 'flat' : 'island';
}

export function getActiveTerrainWorldType(): WorldType {
  return activeTerrainWorldType;
}

export function getPlayableMaxRadius(): number {
  return activeTerrainWorldType === 'flat'
    ? FLAT_PLAYABLE_MAX_RADIUS
    : PLAYABLE_MAX_RADIUS;
}

export const TERRAIN_SIZE = 360;
export const TERRAIN_SEGS = 150;
export const TERRAIN_VERTS = TERRAIN_SEGS + 1;
export const TERRAIN_STEP = TERRAIN_SIZE / TERRAIN_SEGS; // 2.4m per vertex
export const TERRAIN_HALF = TERRAIN_SIZE * 0.5;

export const terrainDeltaGrid = new Float32Array(TERRAIN_VERTS * TERRAIN_VERTS);
export const terrainWetnessGrid = new Float32Array(TERRAIN_VERTS * TERRAIN_VERTS);
export const terrainScorchGrid = new Float32Array(TERRAIN_VERTS * TERRAIN_VERTS);
export const terrainLoosenessGrid = new Float32Array(TERRAIN_VERTS * TERRAIN_VERTS);
export const terrainPuddleGrid = new Float32Array(TERRAIN_VERTS * TERRAIN_VERTS);

export function resetTerrainDeformation(): void {
  terrainDeltaGrid.fill(0);
  terrainWetnessGrid.fill(0);
  terrainScorchGrid.fill(0);
  terrainLoosenessGrid.fill(0);
  terrainPuddleGrid.fill(0);
}

export function isTerrainProtectedAt(x: number, z: number): boolean {
  const hdx = x - HILL_HOUSE_POS.x;
  const hdz = z - HILL_HOUSE_POS.z;
  if (
    Math.hypot(hdx, hdz) < 12.2 ||
    (hdx >= -8.2 && hdx <= 8.8 && hdz >= -7.2 && hdz <= 11.2)
  ) {
    return true;
  }
  if (
    Math.abs(x - VEHICLE_GARAGE_POS.x) < 13.5 &&
    Math.abs(z - VEHICLE_GARAGE_POS.z) < 9.5
  ) {
    return true;
  }
  if (Math.hypot(x - FARMER_POS.x, z - FARMER_POS.z) < 4.5) return true;
  return false;
}

/**
 * Walkable solid deck elevations for the Premade Hilltop Base, Front Porch,
 * Entry Step, and Dedicated Music Studio Wing so the player and dropped items
 * never sink or fall through the base or studio floor.
 */
export function getHilltopBaseFloorY(
  x: number,
  z: number,
  footY: number,
): number {
  if (activeTerrainWorldType === 'flat') return -9999;
  const dx = x - HILL_HOUSE_POS.x;
  const dz = z - HILL_HOUSE_POS.z;
  let bestY = -9999;

  // Main Premade House + Dedicated Music Studio Wing interior floor (X: -5.35..+4.35, Z: -4.35..+8.55)
  if (dx >= -5.35 && dx <= 4.35 && dz >= -4.35 && dz <= 8.55) {
    const floorTop = HILL_HOUSE_Y + 0.08;
    if (footY >= floorTop - 1.5 && floorTop > bestY) {
      bestY = floorTop;
    }
  }

  // East Front Porch deck (X: +4.2..+6.45, Z: -3.15..+3.15)
  if (dx >= 4.2 && dx <= 6.45 && dz >= -3.15 && dz <= 3.15) {
    const porchTop = HILL_HOUSE_Y + 0.07;
    if (footY >= porchTop - 1.5 && porchTop > bestY) {
      bestY = porchTop;
    }
  }

  // Porch East Entry Step (X: +6.4..+7.05, Z: -1.65..+1.65)
  if (dx >= 6.4 && dx <= 7.05 && dz >= -1.65 && dz <= 1.65) {
    const stepTop = HILL_HOUSE_Y + 0.03;
    if (footY >= stepTop - 1.5 && stepTop > bestY) {
      bestY = stepTop;
    }
  }

  return bestY;
}

export interface BiomeCabinPlacement {
  x: number;
  z: number;
  rotY: number;
  snowy: boolean;
  baseY: number;
}

export const BIOME_CABIN_DEFS: BiomeCabinPlacement[] = [
  // Taiga Village (3 walk-in spruce cabins around central hearth)
  { x: TAIGA_VILLAGE_POS.x - 5.2, z: TAIGA_VILLAGE_POS.z - 2.6, rotY: 0.35, snowy: false, baseY: 5.2 },
  { x: TAIGA_VILLAGE_POS.x + 5.2, z: TAIGA_VILLAGE_POS.z - 1.8, rotY: -0.45, snowy: false, baseY: 5.2 },
  { x: TAIGA_VILLAGE_POS.x + 0.6, z: TAIGA_VILLAGE_POS.z + 5.8, rotY: Math.PI, snowy: false, baseY: 5.2 },
  // Snowy Taiga Village (3 walk-in snow-roofed cabins)
  { x: SNOWY_VILLAGE_POS.x - 5.2, z: SNOWY_VILLAGE_POS.z - 2.4, rotY: 0.25, snowy: true, baseY: 9.4 },
  { x: SNOWY_VILLAGE_POS.x + 5.0, z: SNOWY_VILLAGE_POS.z - 1.6, rotY: -0.42, snowy: true, baseY: 9.4 },
  { x: SNOWY_VILLAGE_POS.x + 0.2, z: SNOWY_VILLAGE_POS.z + 5.6, rotY: Math.PI, snowy: true, baseY: 9.4 },
];

/**
 * Walkable interior floor support for enterable Woodland Mansion, Taiga/Snowy Village
 * cabins, Snowy Igloo, and Pillager Outpost ground hall.
 */
export function getLandmarkFloorY(
  x: number,
  z: number,
  footY: number,
): number {
  if (activeTerrainWorldType === 'flat') return -9999;
  let bestY = -9999;

  // 1. Woodland Mansion Plinth & Ground Hall Floor (14.4m x 10.6m centered at WOODLAND_MANSION_POS)
  const mdx = x - WOODLAND_MANSION_POS.x;
  const mdz = z - WOODLAND_MANSION_POS.z;
  if (mdx >= -7.3 && mdx <= 7.3 && mdz >= -5.4 && mdz <= 5.4) {
    const mansionFloorTop = 4.1 + 0.14;
    if (footY >= mansionFloorTop - 1.5 && mansionFloorTop > bestY) {
      bestY = mansionFloorTop;
    }
  } else if (mdx >= -1.7 && mdx <= 1.7 && mdz >= 5.3 && mdz <= 6.2) {
    const stepTop = 4.1 + 0.07;
    if (footY >= stepTop - 1.5 && stepTop > bestY) {
      bestY = stepTop;
    }
  }

  // 2. Pillager Outpost Ground Pavilion (5.6m x 5.6m open archways)
  const podx = x - PILLAGER_OUTPOST_POS.x;
  const podz = z - PILLAGER_OUTPOST_POS.z;
  if (Math.abs(podx) <= 2.9 && Math.abs(podz) <= 2.9) {
    const poFloorTop = 5.0 + 0.12;
    if (footY >= poFloorTop - 1.5 && poFloorTop > bestY) {
      bestY = poFloorTop;
    }
  }

  // 3. All Taiga & Snowy Taiga Village Cabins (rotated 4.8m x 4.4m cabins)
  for (const cab of BIOME_CABIN_DEFS) {
    const ddx = x - cab.x;
    const ddz = z - cab.z;
    if (Math.abs(ddx) > 3.6 || Math.abs(ddz) > 3.6) continue;
    const c = Math.cos(cab.rotY);
    const s = Math.sin(cab.rotY);
    // Inverse Ry(rotY): lx = ddx * cos - ddz * sin; lz = ddx * sin + ddz * cos
    const lx = ddx * c - ddz * s;
    const lz = ddx * s + ddz * c;
    if (Math.abs(lx) <= 2.45 && Math.abs(lz) <= 2.25) {
      const floorTop = cab.baseY + 0.12;
      if (footY >= floorTop - 1.5 && floorTop > bestY) {
        bestY = floorTop;
      }
    }
  }

  // 4. Snowy Igloo packed floor
  const igdx = x - SNOWY_IGLOO_POS.x;
  const igdz = z - SNOWY_IGLOO_POS.z;
  if (Math.hypot(igdx, igdz) <= 2.95 || (Math.abs(igdx) <= 0.9 && igdz >= 2.2 && igdz <= 4.1)) {
    const igFloorTop = 9.0 + 0.05;
    if (footY >= igFloorTop - 1.5 && igFloorTop > bestY) {
      bestY = igFloorTop;
    }
  }

  return bestY;
}

export function sampleGridBilinear(grid: Float32Array, x: number, z: number): number {
  const gx = (x + TERRAIN_HALF) / TERRAIN_STEP;
  const gz = (z + TERRAIN_HALF) / TERRAIN_STEP;
  const ix0 = Math.max(0, Math.min(TERRAIN_VERTS - 2, Math.floor(gx)));
  const iz0 = Math.max(0, Math.min(TERRAIN_VERTS - 2, Math.floor(gz)));
  const fx = Math.max(0, Math.min(1, gx - ix0));
  const fz = Math.max(0, Math.min(1, gz - iz0));

  const idx00 = iz0 * TERRAIN_VERTS + ix0;
  const idx10 = idx00 + 1;
  const idx01 = idx00 + TERRAIN_VERTS;
  const idx11 = idx01 + 1;

  const h0 = grid[idx00] * (1 - fx) + grid[idx10] * fx;
  const h1 = grid[idx01] * (1 - fx) + grid[idx11] * fx;
  return h0 * (1 - fz) + h1 * fz;
}

export function exportSparseTerrainDeltas(): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < terrainDeltaGrid.length; i++) {
    const v = terrainDeltaGrid[i];
    if (Math.abs(v) > 0.03) {
      out.push([i, Math.round(v * 1000) / 1000]);
    }
  }
  return out;
}

export function importSparseTerrainDeltas(entries?: [number, number][]): void {
  resetTerrainDeformation();
  if (!Array.isArray(entries)) return;
  for (const pair of entries) {
    if (!Array.isArray(pair) || pair.length < 2) continue;
    const idx = pair[0];
    const val = pair[1];
    if (idx >= 0 && idx < terrainDeltaGrid.length && Number.isFinite(val)) {
      terrainDeltaGrid[idx] = val;
      if (val < -0.25) {
        terrainLoosenessGrid[idx] = Math.min(1, Math.abs(val) * 0.25);
      }
    }
  }
}

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
    description: 'Dense prehistoric woodland teeming with hardwood, berries, and raptors.',
  },
  flower_forest: {
    name: 'Flower Forest',
    color: '#ec4899',
    description: 'Sun-dappled woodland glades carpeted in vibrant wildflowers, birch trees, and sweet berries.',
  },
  birch_forest: {
    name: 'Birch Forest',
    color: '#a3e635',
    description: 'Bright open forest of pale white-barked birches, ferns, and gentle woodland wildlife.',
  },
  old_growth_birch_forest: {
    name: 'Old Growth Birch Forest',
    color: '#65a30d',
    description: 'Towering ancient birch groves with lofty crowns and mossy forest undergrowth.',
  },
  dark_forest: {
    name: 'Dark Forest',
    color: '#1e3a24',
    description: 'Shadowy dense canopy of dark oaks and giant mushrooms hiding the Woodland Mansion and daytime prowlers.',
  },
  pale_garden: {
    name: 'Pale Garden',
    color: '#94a3b8',
    description: 'Eerie mist-shrouded grove of gnarled pale oaks, hanging moss curtains, eyeblossoms, and nocturnal Creaking.',
  },
  taiga: {
    name: 'Taiga',
    color: '#166534',
    description: 'Crisp northern evergreen forest of resinous pines, spruce boughs, and wild berries.',
  },
  old_growth_pine_taiga: {
    name: 'Old Growth Pine Taiga',
    color: '#14532d',
    description: 'Ancient highland timberland of towering red-barked pines, mossy boulders, and podzol soil.',
  },
  old_growth_spruce_taiga: {
    name: 'Old Growth Spruce Taiga',
    color: '#115e59',
    description: 'Cathedral-like boreal woods dominated by colossal dense-needled spruce giants.',
  },
  snowy_taiga: {
    name: 'Snowy Taiga',
    color: '#cbd5e1',
    description: 'Frost-blanketed boreal spruce woods prowled by timber wolves, reindeer, and moose.',
  },
  jungle: {
    name: 'Jungle',
    color: '#059669',
    description: 'Lush multi-tiered tropical rainforest draped in vines, towering canopy trees, and tigers.',
  },
  sparse_jungle: {
    name: 'Sparse Jungle',
    color: '#34d399',
    description: 'Breezy tropical woodland clearings dotted with spaced jungle trees, bananas, and sunny glades.',
  },
  bamboo_jungle: {
    name: 'Bamboo Jungle',
    color: '#84cc16',
    description: 'Rustling thickets of towering green bamboo culms beside humid tropical pools.',
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
  if (activeTerrainWorldType === 'flat') return -999;
  const dLake = Math.hypot(x - LAKE_CENTER.x, z - LAKE_CENTER.z);
  if (dLake < LAKE_CENTER.radius + 3) {
    return LAKE_CENTER.waterY;
  }
  const dSwamp = Math.hypot(x - SWAMP_POS.x, z - SWAMP_POS.z);
  if (dSwamp < SWAMP_POS.radius + 1.5) {
    return SWAMP_POS.waterY;
  }
  const river = getRiverSample(x, z);
  if (river.dist < 8.5) {
    return Math.max(OCEAN_LEVEL, river.waterY);
  }
  return OCEAN_LEVEL;
}

export function isFreshwaterAt(x: number, z: number): boolean {
  if (activeTerrainWorldType === 'flat') return false;
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
  if (activeTerrainWorldType === 'flat') return FLAT_GROUND_Y;
  return getBaseTerrainHeight(x, z) + sampleGridBilinear(terrainDeltaGrid, x, z);
}

export function getBaseTerrainHeight(x: number, z: number): number {
  if (activeTerrainWorldType === 'flat') return FLAT_GROUND_Y;
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

  // Smooth Homestead Barnyard, Sunlit Grassy Pasture & Dusty Paddock terrace
  const dHomestead = Math.hypot(x - HOMESTEAD_POS.x, z - HOMESTEAD_POS.z);
  if (dHomestead < 24) {
    const blend = 1 - smoothstep(13, 24, dHomestead);
    h = h * (1 - blend) + 3.15 * blend;
  }

  // Carve shallow muddy farm pond beside the homestead barnyard
  const dPond = Math.hypot(x - FARM_POND_POS.x, z - FARM_POND_POS.z);
  if (dPond < FARM_POND_POS.radius + 2.4) {
    const pondDepth = 1 - smoothstep(FARM_POND_POS.radius - 1.8, FARM_POND_POS.radius + 2.4, dPond);
    h = h * (1 - pondDepth) + 2.35 * pondDepth;
  }

  // Smooth Snowy Highland Woodland plateau for Timber Wolves
  const dSnow = Math.hypot(x - SNOWY_WOODLAND_POS.x, z - SNOWY_WOODLAND_POS.z);
  if (dSnow < 18) {
    const snowBlend = 1 - smoothstep(9, 18, dSnow);
    h = h * (1 - snowBlend) + 12.2 * snowBlend;
  }

  // Smooth Autumn Forest clearing for Red Fox undergrowth
  const dAutumn = Math.hypot(x - AUTUMN_GROVE_POS.x, z - AUTUMN_GROVE_POS.z);
  if (dAutumn < 14) {
    const autumnBlend = 1 - smoothstep(7, 14, dAutumn);
    h = h * (1 - autumnBlend) + 3.25 * autumnBlend;
  }

  // Carve shallow Murky Jungle Swamp lagoon for Saltwater Crocodile
  const dSwamp = Math.hypot(x - SWAMP_POS.x, z - SWAMP_POS.z);
  if (dSwamp < SWAMP_POS.radius + 4.0) {
    const swampBlend = 1 - smoothstep(SWAMP_POS.radius - 2.5, SWAMP_POS.radius + 4.0, dSwamp);
    h = h * (1 - swampBlend) + 0.85 * swampBlend;
  }

  // Smooth flat meadow terrace for Golden Wheatfield & Farmer Garden Market
  const dWheat = Math.hypot(x - WHEATFIELD_POS.x, z - WHEATFIELD_POS.z);
  if (dWheat < 14.5) {
    const wBlend = 1 - smoothstep(8.5, 14.5, dWheat);
    h = h * (1 - wBlend) + 3.15 * wBlend;
  }
  const dFarmer = Math.hypot(x - FARMER_POS.x, z - FARMER_POS.z);
  if (dFarmer < 13.5) {
    const fBlend = 1 - smoothstep(7.5, 13.5, dFarmer);
    h = h * (1 - fBlend) + 3.15 * fBlend;
  }

  // Expanded 3-Bay Custom Vehicle Garage clearing & wide driveways to island trails & beaches
  const gdx = Math.max(0, Math.abs(x - VEHICLE_GARAGE_POS.x) - 11.2);
  const gdz = Math.max(0, Math.abs(z - VEHICLE_GARAGE_POS.z) - 6.8);
  const dGarageBox = Math.hypot(gdx, gdz);
  if (dGarageBox < 5.5) {
    const garageBlend = 1 - smoothstep(1.2, 5.5, dGarageBox);
    h = h * (1 - garageBlend) + VEHICLE_GARAGE_Y * garageBlend;
  }

  // Wide South-East main driveway apron -> Southern Beach & Spawn Trail
  const mainDrive = distToSegment(
    x,
    z,
    VEHICLE_GARAGE_POS.x + 2,
    VEHICLE_GARAGE_POS.z + 6.5,
    -2,
    105,
  );
  if (mainDrive.dist < 6.4) {
    const dBlend = 1 - smoothstep(3.0, 6.4, mainDrive.dist);
    const targetDriveH = VEHICLE_GARAGE_Y * (1 - mainDrive.t) + 1.85 * mainDrive.t;
    h = h * (1 - dBlend * 0.85) + targetDriveH * (dBlend * 0.85);
  }

  // Wide South-West driveway ramp -> Western Beach Shore
  const westDrive = distToSegment(
    x,
    z,
    VEHICLE_GARAGE_POS.x - 6,
    VEHICLE_GARAGE_POS.z + 6.5,
    -44,
    112,
  );
  if (westDrive.dist < 5.8) {
    const wBlend = 1 - smoothstep(2.6, 5.8, westDrive.dist);
    const targetWestH = VEHICLE_GARAGE_Y * (1 - westDrive.t) + 1.55 * westDrive.t;
    h = h * (1 - wBlend * 0.82) + targetWestH * (wBlend * 0.82);
  }

  // Wide East connector -> Central Island Trail
  const eastDrive = distToSegment(
    x,
    z,
    VEHICLE_GARAGE_POS.x + 10.5,
    VEHICLE_GARAGE_POS.z + 1.5,
    -2,
    84,
  );
  if (eastDrive.dist < 5.4) {
    const eBlend = 1 - smoothstep(2.4, 5.4, eastDrive.dist);
    const targetEastH = VEHICLE_GARAGE_Y * (1 - eastDrive.t) + 2.85 * eastDrive.t;
    h = h * (1 - eBlend * 0.8) + targetEastH * (eBlend * 0.8);
  }

  // Scenic Hilltop Plateau (covering Main House, Porch, and South Music Studio Wing) + gentle East Access Ramp
  // Applied after lower garage clearing so the studio wing never dips toward the lower garage elevation.
  const hdxBox = Math.max(
    0,
    Math.max(HILL_HOUSE_POS.x - 6.6 - x, x - (HILL_HOUSE_POS.x + 7.4)),
  );
  const hdzBox = Math.max(
    0,
    Math.max(HILL_HOUSE_POS.z - 5.6 - z, z - (HILL_HOUSE_POS.z + 9.8)),
  );
  const dHouseBox = Math.hypot(hdxBox, hdzBox);
  if (dHouseBox < 5.4) {
    const houseBlend = 1 - smoothstep(0.6, 5.4, dHouseBox);
    h = h * (1 - houseBlend) + HILL_HOUSE_Y * houseBlend;
  }
  // Gentle walkable ramp along +X (east) side from hilltop porch (x=-37.5) down to farm path (x=-23.5)
  const dzRamp = Math.abs(z - HILL_HOUSE_POS.z);
  if (
    x >= HILL_HOUSE_POS.x + 6.4 &&
    x <= HILL_HOUSE_POS.x + 21.5 &&
    dzRamp < 4.6
  ) {
    const rampT = smoothstep(HILL_HOUSE_POS.x + 6.8, HILL_HOUSE_POS.x + 20.5, x);
    const sideBlend = 1 - smoothstep(2.0, 4.6, dzRamp);
    const rampH = HILL_HOUSE_Y * (1 - rampT) + 3.25 * rampT;
    h = h * (1 - sideBlend) + rampH * sideBlend;
  }

  // Flatten foundation terraces for new biome landmarks (Mansions, Villages, Outposts, Ruins, Igloos, Temples)
  const flattenPad = (px: number, pz: number, innerR: number, outerR: number, targetH: number) => {
    const d = Math.hypot(x - px, z - pz);
    if (d < outerR) {
      const blend = 1 - smoothstep(innerR, outerR, d);
      h = h * (1 - blend) + targetH * blend;
    }
  };
  flattenPad(TRIAL_CHAMBERS_POS.x, TRIAL_CHAMBERS_POS.z, 6.5, 13.5, 3.6);
  flattenPad(WOODLAND_MANSION_POS.x, WOODLAND_MANSION_POS.z, 10.5, 17.5, 4.1);
  flattenPad(TAIGA_VILLAGE_POS.x, TAIGA_VILLAGE_POS.z, 11.5, 18.0, 5.2);
  flattenPad(PILLAGER_OUTPOST_POS.x, PILLAGER_OUTPOST_POS.z, 6.2, 12.5, 5.0);
  flattenPad(TRAIL_RUINS_POS.x, TRAIL_RUINS_POS.z, 6.5, 13.0, 4.5);
  flattenPad(SNOWY_VILLAGE_POS.x, SNOWY_VILLAGE_POS.z, 11.5, 18.0, 9.4);
  flattenPad(SNOWY_IGLOO_POS.x, SNOWY_IGLOO_POS.z, 5.8, 11.5, 9.0);
  flattenPad(JUNGLE_TEMPLE_POS.x, JUNGLE_TEMPLE_POS.z, 7.5, 14.5, 4.2);

  return h;
}

export function getBiomeAt(x: number, z: number): BiomeId {
  if (activeTerrainWorldType === 'flat') return 'grassland';
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

  // Anchor biome structure zones cleanly inside their home biome
  if (Math.hypot(x - TRIAL_CHAMBERS_POS.x, z - TRIAL_CHAMBERS_POS.z) < 9.5) return 'forest';
  if (Math.hypot(x - WOODLAND_MANSION_POS.x, z - WOODLAND_MANSION_POS.z) < 13.5) return 'dark_forest';
  if (Math.hypot(x - TAIGA_VILLAGE_POS.x, z - TAIGA_VILLAGE_POS.z) < 12.5) return 'taiga';
  if (Math.hypot(x - PILLAGER_OUTPOST_POS.x, z - PILLAGER_OUTPOST_POS.z) < 9.5) return 'taiga';
  if (Math.hypot(x - TRAIL_RUINS_POS.x, z - TRAIL_RUINS_POS.z) < 10.5) return 'old_growth_pine_taiga';
  if (Math.hypot(x - SNOWY_VILLAGE_POS.x, z - SNOWY_VILLAGE_POS.z) < 12.5) return 'snowy_taiga';
  if (Math.hypot(x - SNOWY_IGLOO_POS.x, z - SNOWY_IGLOO_POS.z) < 9.5) return 'snowy_taiga';
  if (Math.hypot(x - JUNGLE_TEMPLE_POS.x, z - JUNGLE_TEMPLE_POS.z) < 12.0) return 'jungle';

  // Keep homestead pasture, farmer market, wheatfield, hilltop house & garage cleanly in Amber Savanna
  if (x < -8 && z >= 46) return 'grassland';

  // High volcanic northern mountain peaks
  if (h > 14.5 || (z < -54 && x > -22 && x < 32 && h > 11.2)) {
    return 'mountain';
  }

  // Gentle organic domain warp so biome transitions wind naturally across the island
  const wx = x + (fbm(x * 0.024 + 1.3, z * 0.024 + 5.1, 2) - 0.5) * 14;
  const wz = z + (fbm(x * 0.024 + 9.7, z * 0.024 + 2.4, 2) - 0.5) * 14;

  // Northern boreal / taiga belt
  if (wz < -22) {
    if ((wz < -48 && wx <= 14) || (wz < -58 && wx <= 42)) {
      return 'snowy_taiga';
    }
    if (wz < -22 && wz >= -48 && wx < -14) {
      return 'old_growth_pine_taiga';
    }
    if (wz < -32 && wx >= 44) {
      return 'old_growth_spruce_taiga';
    }
    return 'taiga';
  }

  // Western Amber Savanna
  const savannaMask = fbm(x * 0.01 + 4, z * 0.01 + 8, 2);
  if (wx < -14 || (wx < -2 && savannaMask > 0.58)) {
    return 'grassland';
  }

  // Eastern Pale Garden hollow
  if (wx >= 48 && wz >= -32 && wz < 16) {
    return 'pale_garden';
  }

  // Dark Forest canopy pocket (between crystal river and expedition/pale garden)
  if (wx >= 10 && wx < 34 && wz >= -22 && wz < 8) {
    return 'dark_forest';
  }

  // Southeastern Tropical Jungle belt
  if (wx >= 34 && wz >= 16) {
    if (wx < 62 && wz < 52) {
      return 'bamboo_jungle';
    }
    if (wx >= 62 && wz < 72) {
      return 'jungle';
    }
    return 'sparse_jungle';
  }

  // Central & south-central temperate woodlands
  if (wx >= 2 && wz >= 56) {
    return 'flower_forest';
  }
  if (wx >= 10 && wz >= 8 && wz < 32) {
    return 'old_growth_birch_forest';
  }
  if (wx >= 10 && wz >= 32 && wz < 56) {
    return 'birch_forest';
  }

  return 'forest';
}

export function getTerrainSlope(x: number, z: number): number {
  if (activeTerrainWorldType === 'flat') return 0;
  const e = 0.75;
  const hx1 = getTerrainHeight(x + e, z);
  const hx0 = getTerrainHeight(x - e, z);
  const hz1 = getTerrainHeight(x, z + e);
  const hz0 = getTerrainHeight(x, z - e);
  const dx = (hx1 - hx0) / (2 * e);
  const dz = (hz1 - hz0) / (2 * e);
  return Math.hypot(dx, dz);
}
