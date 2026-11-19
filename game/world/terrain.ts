import { BiomeId, WorldType } from '../types';

export const OCEAN_LEVEL = 0.0;
export const FLAT_GROUND_Y = 1.0;
export const FLAT_PLAYABLE_MAX_RADIUS = 310;
export const FLAT_PLAYER_SPAWN = { x: 0, z: 24 };
export const LAKE_CENTER = { x: -24, z: 14, radius: 24, waterY: 2.6 };
export const WATERFALL_POS = { x: 10, z: -88 };
export const CAVE_POS = { x: -64, z: -98 };
export const EXPEDITION_POS = { x: 82, z: -20 };
export const HOMESTEAD_POS = { x: -44, z: 96 };
export const FARM_POND_POS = { x: -26, z: 94, radius: 5.0, waterY: 2.95 };
export const WHEATFIELD_POS = { x: -6, z: 112 };
export const FARMER_POS = { x: -24, z: 114 };
export const HILL_HOUSE_POS = { x: -78, z: 128 };
export const HILL_HOUSE_Y = 8.4;
export const VEHICLE_GARAGE_POS = { x: -52, z: 152 };
export const VEHICLE_GARAGE_Y = 3.25;
export const SNOWY_WOODLAND_POS = { x: -42, z: -124 };
export const AUTUMN_GROVE_POS = { x: 46, z: 36 };
export const SWAMP_POS = { x: 84, z: 74, radius: 11.5, waterY: 1.55 };
export const DEAD_OAK_POS = { x: 32, z: 128 };
export const TRIAL_CHAMBERS_POS = { x: 6, z: 62 };
export const WOODLAND_MANSION_POS = { x: 38, z: -14 };
export const TAIGA_VILLAGE_POS = { x: 58, z: -64 };
export const PILLAGER_OUTPOST_POS = { x: 26, z: -54 };
export const TRAIL_RUINS_POS = { x: -82, z: -58 };
export const SNOWY_VILLAGE_POS = { x: -62, z: -142 };
export const SNOWY_IGLOO_POS = { x: -92, z: -110 };
export const JUNGLE_TEMPLE_POS = { x: 126, z: 64 };
export const PLAYER_SPAWN = { x: 0, z: 505 };
export const SHIPWRECK_POS = { x: -8, z: 568 };

// New Expanded Biome Landmarks
export const PLAINS_VILLAGE_POS = { x: -128, z: 74 };
export const SUNFLOWER_VILLAGE_POS = { x: -145, z: 138 };
export const RUINED_PORTAL_POS = { x: -158, z: 44 };
export const CHERRY_GROVE_POS = { x: 132, z: -48 };
export const ICE_SPIKES_POS = { x: -155, z: -175 };
export const JAGGED_PEAKS_POS = { x: -14, z: -178 };
export const FROZEN_PEAKS_POS = { x: 68, z: -168 };
export const STONY_PEAKS_POS = { x: 158, z: -88 };
export const SNOWY_SLOPES_IGLOO_POS = { x: 18, z: -158 };
export const MEADOW_OUTPOST_POS = { x: -88, z: -18 };
export const GROVE_OUTPOST_POS = { x: 78, z: -138 };
export const SNOWY_PLAINS_OUTPOST_POS = { x: -108, z: -168 };

// Mega-Island (2x Expansion) Biome Landmarks
export const DESERT_PYRAMID_POS = { x: -345, z: 265 };
export const DESERT_VILLAGE_POS = { x: -275, z: 335 };
export const DESERT_WELL_POS = { x: -315, z: 215 };
export const DESERT_OUTPOST_POS = { x: -415, z: 215 };
export const DESERT_FOSSIL_POS = { x: -380, z: 325 };
export const SAVANNA_VILLAGE_POS = { x: -325, z: 45 };
export const SAVANNA_OUTPOST_POS = { x: -395, z: -15 };
export const SAVANNA_PLATEAU_POS = { x: -385, z: -75 };
export const WINDSWEPT_SAVANNA_POS = { x: -455, z: 55 };
export const BADLANDS_MINESHAFT_POS = { x: 310, z: 260 };
export const WOODED_BADLANDS_POS = { x: 390, z: 180 };
export const ERODED_BADLANDS_POS = { x: 255, z: 365 };
export const SWAMP_HUT_POS = { x: 345, z: 45 };
export const SWAMP_FOSSIL_POS = { x: 395, z: 82 };
export const MANGROVE_SWAMP_POS = { x: 360, z: -55 };
export const MUSHROOM_FIELDS_POS = { x: 355, z: -295 };
export const OCEAN_MONUMENT_POS = { x: -225, z: 565 };
export const CORAL_REEF_POS = { x: 155, z: 575 };
export const FROZEN_OCEAN_ICEBERG_POS = { x: -165, z: -565 };
export const BURIED_TREASURE_POS = { x: 65, z: 525 };

export const WORLD_RADIUS = 700;
export const PLAYABLE_MAX_RADIUS = 640;

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

export const TERRAIN_SIZE = 1480;
export const TERRAIN_SEGS = 240;
export const TERRAIN_VERTS = TERRAIN_SEGS + 1;
export const TERRAIN_STEP = TERRAIN_SIZE / TERRAIN_SEGS; // ~6.16m per vertex
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
  plains: {
    name: 'Plains',
    color: '#7cb342',
    description: 'Wide rolling green meadows with sparse oaks, wildflowers, horses, farm herds, Plains Village, and a Ruined Portal.',
  },
  sunflower_plains: {
    name: 'Sunflower Plains',
    color: '#eab308',
    description: 'Golden sunlit meadows blanketed in towering sunflowers, wildflowers, grazing horses, and a bustling Plains Village.',
  },
  snowy_plains: {
    name: 'Snowy Plains',
    color: '#e2e8f0',
    description: 'Vast frost-covered arctic flats with sparse spruce, ice sheets, polar bears, rabbits, igloos, and Pillager Outposts.',
  },
  ice_spikes: {
    name: 'Ice Spikes',
    color: '#7dd3fc',
    description: 'Surreal glacial plain dominated by towering packed-ice and rare blue-ice spires prowled by polar bears and rabbits.',
  },
  meadow: {
    name: 'Meadow',
    color: '#4ade80',
    description: 'Elevated alpine flower meadow with lone bee-nest oaks, buzzing bees, donkeys, sheep, rabbits, and highland villages.',
  },
  cherry_grove: {
    name: 'Cherry Grove',
    color: '#f472b6',
    description: 'Blossom-draped mountain terrace of gnarled cherry trees, drifting pink petal carpets, bees, pigs, sheep, and rabbits.',
  },
  grove: {
    name: 'Grove',
    color: '#94a3b8',
    description: 'Snowy spruce-covered alpine slope of powder snow and timber wolves, foxes, rabbits, and a Pillager Outpost.',
  },
  snowy_slopes: {
    name: 'Snowy Slopes',
    color: '#f1f5f9',
    description: 'Steep treeless snow and ice mountainsides inhabited by mountain goats, rabbits, and hidden igloos.',
  },
  jagged_peaks: {
    name: 'Jagged Peaks',
    color: '#cbd5e1',
    description: 'Razor-sharp snow-capped summits rich in emerald, iron, and coal ore, guarded by mountain goats and a Pillager Outpost.',
  },
  frozen_peaks: {
    name: 'Frozen Peaks',
    color: '#93c5fd',
    description: 'Glaciated packed-ice and snow summits patrolled by agile mountain goats and a high-altitude Pillager Outpost.',
  },
  stony_peaks: {
    name: 'Stony Peaks',
    color: '#a8a29e',
    description: 'Rugged stone summits striped with white calcite bands, emerald and iron ore veins, and a Pillager Outpost.',
  },
  windswept_hills: {
    name: 'Windswept Hills',
    color: '#6b7280',
    description: 'Dramatic windswept stone cliffs with sparse oaks and spruces, emerald ore veins, and hardy highland herds.',
  },
  windswept_gravelly_hills: {
    name: 'Windswept Gravelly Hills',
    color: '#9ca3af',
    description: 'Steep windswept gravel and stone ridges dotted with sparse conifers, emerald ore, and wandering highland herds.',
  },
  windswept_forest: {
    name: 'Windswept Forest',
    color: '#3f6212',
    description: 'High-elevation forested cliffs of dense oaks and spruces, emerald ore outcrops, wolves, and highland herds.',
  },
  desert: {
    name: 'Desert',
    color: '#e5c17b',
    description: 'Sun-scorched dunes of sand and sandstone with cacti, dead bushes, camels, cream rabbits, Desert Pyramid, Village, Well, and Fossils.',
  },
  savanna: {
    name: 'Savanna',
    color: '#b89f4c',
    description: 'Warm acacia-dotted grasslands with tall grass, horses, llamas, passive herds, Savanna Village, and Pillager Outpost.',
  },
  savanna_plateau: {
    name: 'Savanna Plateau',
    color: '#a38d43',
    description: 'High flat-topped acacia mesa overlooking the sunlit savanna plains with grazing horses and llamas.',
  },
  windswept_savanna: {
    name: 'Windswept Savanna',
    color: '#8f8154',
    description: 'Dramatic shattered stone peaks and coarse dirt cliffs dotted with sparse windswept acacia trees.',
  },
  badlands: {
    name: 'Badlands',
    color: '#c25934',
    description: 'Arid red-sand canyons striped with colorful terracotta strata, surface gold ore veins, cacti, and Dark Oak surface mineshafts.',
  },
  wooded_badlands: {
    name: 'Wooded Badlands',
    color: '#a86538',
    description: 'Elevated terracotta plateaus capped with coarse dirt, oak groves, cacti, surface gold ore, and surface mineshafts.',
  },
  eroded_badlands: {
    name: 'Eroded Badlands',
    color: '#d96b38',
    description: 'Sculpted red-sand desert bristling with towering striped terracotta hoodoo spires and rich surface gold ore.',
  },
  swamp: {
    name: 'Swamp',
    color: '#4d6b3c',
    description: 'Misty wetlands of vine-draped swamp oaks, blue orchids, lily pads, clay, witches, Swamp Huts, and ancient fossils.',
  },
  mangrove_swamp: {
    name: 'Mangrove Swamp',
    color: '#365e3a',
    description: 'Tangled muddy wetlands of prop-rooted mangrove trees, vines, lily pads, moss carpets, tropical fish, and fossils.',
  },
  frozen_river: {
    name: 'Frozen River',
    color: '#bae6fd',
    description: 'Glacial ice-sheet river winding through the northern tundra, patrolled by polar bears and arctic wildlife.',
  },
  snowy_beach: {
    name: 'Snowy Beach',
    color: '#e2e8f0',
    description: 'Frost-dusted sandy shoreline bordered by sea ice, rabbits, buried treasure, and coastal shipwrecks.',
  },
  stony_shore: {
    name: 'Stony Shore',
    color: '#78716c',
    description: 'Steep rocky coastline of stone, gravel, iron ore outcrops, and hidden buried treasure.',
  },
  warm_ocean: {
    name: 'Warm Ocean',
    color: '#06b6d4',
    description: 'Crystal-clear tropical shallows teeming with vibrant coral reefs, sea pickles, tropical fish, dolphins, and warm ruins.',
  },
  lukewarm_ocean: {
    name: 'Lukewarm Ocean',
    color: '#0284c7',
    description: 'Temperate sandy-bottomed seas swaying with kelp, seagrass, dolphins, tropical fish, and sunken ruins.',
  },
  cold_ocean: {
    name: 'Cold Ocean',
    color: '#1d4ed8',
    description: 'Brisk northern gravel-bed waters of kelp forests, salmon, dolphins, cold ocean ruins, and deep monuments.',
  },
  frozen_ocean: {
    name: 'Frozen Ocean',
    color: '#93c5fd',
    description: 'Arctic sea dotted with towering packed-ice and blue-ice icebergs patrolled by polar bears and deep ocean monuments.',
  },
  mushroom_fields: {
    name: 'Mushroom Fields',
    color: '#9370a8',
    description: 'Rare purple mycelium sanctuary of giant red and brown mushrooms and peaceful herds—completely free of hostile mobs.',
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

// River path from waterfall plunge pool -> lake -> coastal estuary (560m coastline)
export const RIVER_POINTS: [number, number, number][] = [
  [10, -82, 2.6],
  [-6, -38, 2.6],
  [-24, 14, 2.6],
  [14, 44, 2.2],
  [52, 82, 1.5],
  [92, 134, 0.9],
  [136, 198, 0.5],
  [172, 275, 0.25],
  [192, 395, 0.05],
  [210, 520, -0.8],
];

// Northern Frozen River channel winding from Snowy Slopes to the Frozen Ocean
export const FROZEN_RIVER_POINTS: [number, number, number][] = [
  [-115, -210, 4.5],
  [-155, -285, 2.8],
  [-210, -365, 1.4],
  [-255, -455, 0.3],
  [-285, -545, -0.6],
];

export function getFrozenRiverSample(
  x: number,
  z: number,
): { dist: number; waterY: number; inRiver: boolean } {
  let minDist = 9999;
  let bestWaterY = OCEAN_LEVEL;

  for (let i = 0; i < FROZEN_RIVER_POINTS.length - 1; i++) {
    const [ax, az, ay] = FROZEN_RIVER_POINTS[i];
    const [bx, bz, by] = FROZEN_RIVER_POINTS[i + 1];
    const seg = distToSegment(x, z, ax, az, bx, bz);
    if (seg.dist < minDist) {
      minDist = seg.dist;
      bestWaterY = ay + (by - ay) * seg.t;
    }
  }

  return {
    dist: minDist,
    waterY: bestWaterY,
    inRiver: minDist < 7.5,
  };
}

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

  // Organic coastline radius variation (mega 560m radius island — 2x expanded for 52 biomes)
  const coastWarp =
    56 * (fbm(Math.cos(angle) * 1.4 + 3.1, Math.sin(angle) * 1.4 + 7.4, 3) - 0.5);
  const islandRadius = 560 + coastWarp;

  // Base radial island profile
  const normR = r / islandRadius;
  let h = 0;

  if (normR < 1.18) {
    // Beach shelf to inland rise
    const inland = 1 - smoothstep(0.84, 1.04, normR);
    h = -4.2 + inland * 7.6;
  } else {
    h = -4.2 - (normR - 1.18) * 12;
  }

  // Gentle rolling hills across the broad island expanse
  const hills = (fbm(x * 0.0065 + 11.2, z * 0.0065 + 5.7, 4) - 0.45) * 8.2;
  const landMask = smoothstep(0.55, 0.92, 1 - normR * 0.85);
  h += hills * landMask;

  // Northern Obsidian / Jagged / Frozen Peaks Mountain Range (z < -60)
  const mountainFactor = smoothstep(-58, -158, z) * (1 - smoothstep(145, 245, Math.abs(x)));
  const ridgeDetail = fbm(x * 0.02 + 2.5, z * 0.02 + 9.1, 4);
  h += mountainFactor * (14.5 + ridgeDetail * 18.0);

  // Towering Jagged Peaks & Frozen Peaks summit crags
  const dJagged = Math.hypot(x - JAGGED_PEAKS_POS.x, z - JAGGED_PEAKS_POS.z);
  if (dJagged < 55) {
    const jp = 1 - smoothstep(12, 55, dJagged);
    h += jp * (11.0 + Math.abs(Math.sin(x * 0.09) * Math.cos(z * 0.09)) * 7.0);
  }
  const dFrozen = Math.hypot(x - FROZEN_PEAKS_POS.x, z - FROZEN_PEAKS_POS.z);
  if (dFrozen < 52) {
    const fp = 1 - smoothstep(12, 52, dFrozen);
    h += fp * (9.5 + ridgeDetail * 6.5);
  }
  // Eastern Stony Peaks Calcite Ridge
  const dStony = Math.hypot(x - STONY_PEAKS_POS.x, z - STONY_PEAKS_POS.z);
  if (dStony < 54) {
    const sp = 1 - smoothstep(12, 54, dStony);
    h += sp * (11.5 + ridgeDetail * 6.0);
  }
  // Western Windswept Hills & Windswept Gravelly Hills dramatic cliffs
  if (x < -125 && z > -120 && z < 50 && normR < 0.9) {
    const whMask = smoothstep(-125, -158, x) * (1 - smoothstep(0.74, 0.9, normR));
    const whNoise = fbm(x * 0.032 + 4.2, z * 0.032 + 1.8, 3);
    h += whMask * (7.5 + whNoise * 11.0);
  }
  // Eastern Windswept Forest highland ridge
  if (x > 130 && z > -20 && z < 65 && normR < 0.9) {
    const wfMask = smoothstep(130, 162, x) * (1 - smoothstep(0.74, 0.9, normR));
    const wfNoise = fbm(x * 0.028 + 8.1, z * 0.028 + 3.3, 3);
    h += wfMask * (6.5 + wfNoise * 8.5);
  }
  // Elevated Meadow plateau (central-west)
  const dMeadow = Math.hypot(x - MEADOW_OUTPOST_POS.x, z - MEADOW_OUTPOST_POS.z);
  if (dMeadow < 42) {
    const mp = 1 - smoothstep(18, 42, dMeadow);
    h = h * (1 - mp * 0.55) + 8.8 * (mp * 0.55);
  }
  // Scenic Cherry Grove highland terrace
  const dCherry = Math.hypot(x - CHERRY_GROVE_POS.x, z - CHERRY_GROVE_POS.z);
  if (dCherry < 42) {
    const cp = 1 - smoothstep(18, 42, dCherry);
    h = h * (1 - cp * 0.6) + 7.6 * (cp * 0.6);
  }
  // Flatten Arctic Snowy Plains & Ice Spikes basin in far NW
  const dIce = Math.hypot(x - ICE_SPIKES_POS.x, z - ICE_SPIKES_POS.z);
  if (dIce < 48) {
    const ip = 1 - smoothstep(18, 48, dIce);
    h = h * (1 - ip * 0.72) + 5.8 * (ip * 0.72);
  }

  // 2x Expansion Outer-Ring Biome Topography
  // 1. Desert rolling sand dunes (SW outer ring)
  if (x < -190 && z > 120 && normR < 0.94) {
    const dMask = smoothstep(-190, -245, x) * smoothstep(120, 175, z) * (1 - smoothstep(0.84, 0.94, normR));
    const dune = Math.sin(x * 0.045 + z * 0.025) * 2.4 + Math.cos(z * 0.055) * 1.4;
    h += dMask * dune;
  }
  // 2. Savanna Plateau elevated flat-top mesa
  const dSavPlat = Math.hypot(x - SAVANNA_PLATEAU_POS.x, z - SAVANNA_PLATEAU_POS.z);
  if (dSavPlat < 72) {
    const sp = 1 - smoothstep(38, 72, dSavPlat);
    h = h * (1 - sp * 0.8) + 12.6 * (sp * 0.8);
  }
  // 3. Windswept Savanna shattered stone crags
  const dWindSav = Math.hypot(x - WINDSWEPT_SAVANNA_POS.x, z - WINDSWEPT_SAVANNA_POS.z);
  if (dWindSav < 68) {
    const ws = 1 - smoothstep(18, 68, dWindSav);
    const crag = Math.abs(Math.sin(x * 0.075) * Math.cos(z * 0.085)) * 13.5;
    h += ws * (5.5 + crag);
  }
  // 4. Badlands, Wooded Badlands & Eroded Badlands terraced mesas (SE outer ring)
  if (x > 190 && z > 110 && normR < 0.94) {
    const bMask = smoothstep(190, 240, x) * smoothstep(110, 160, z) * (1 - smoothstep(0.84, 0.94, normR));
    const mesaRaw = fbm(x * 0.015 + 3.4, z * 0.015 + 6.2, 3);
    const mesaStep = Math.floor(mesaRaw * 5.0) * 2.2;
    h += bMask * mesaStep;
  }
  const dWoodedBad = Math.hypot(x - WOODED_BADLANDS_POS.x, z - WOODED_BADLANDS_POS.z);
  if (dWoodedBad < 68) {
    const wb = 1 - smoothstep(34, 68, dWoodedBad);
    h = h * (1 - wb * 0.78) + 13.5 * (wb * 0.78);
  }
  // 5. Swamp & Mangrove Swamp low misty wetland basins (East outer ring)
  const dEastSwamp = Math.hypot(x - SWAMP_HUT_POS.x, z - SWAMP_HUT_POS.z);
  if (dEastSwamp < 82) {
    const sw = 1 - smoothstep(45, 82, dEastSwamp);
    h = h * (1 - sw * 0.72) + 2.15 * (sw * 0.72);
  }
  const dMangrove = Math.hypot(x - MANGROVE_SWAMP_POS.x, z - MANGROVE_SWAMP_POS.z);
  if (dMangrove < 82) {
    const mg = 1 - smoothstep(45, 82, dMangrove);
    h = h * (1 - mg * 0.72) + 2.05 * (mg * 0.72);
  }
  // 6. Mushroom Fields scenic elevated mycelium peninsula (Far NE)
  const dMush = Math.hypot(x - MUSHROOM_FIELDS_POS.x, z - MUSHROOM_FIELDS_POS.z);
  if (dMush < 85) {
    const mf = 1 - smoothstep(48, 85, dMush);
    h = h * (1 - mf * 0.72) + 6.8 * (mf * 0.72);
  }
  // 7. Carve Frozen River channel in far NW
  const frozenRiver = getFrozenRiverSample(x, z);
  if (frozenRiver.dist < 11.5) {
    const fBlend = 1 - smoothstep(4.5, 11.5, frozenRiver.dist);
    h = h * (1 - fBlend) + Math.max(0.15, frozenRiver.waterY) * fBlend;
  }

  // Waterfall cliff shelf around WATERFALL_POS
  const dWaterfall = Math.hypot(x - WATERFALL_POS.x, z - WATERFALL_POS.z);
  if (dWaterfall < 18) {
    const northSlope = smoothstep(WATERFALL_POS.z + 3, WATERFALL_POS.z - 6, z);
    const shelf = 2.6 + northSlope * 11.5;
    const blend = 1 - smoothstep(9, 18, dWaterfall);
    h = h * (1 - blend) + shelf * blend;
  }

  // Flatten Mountain Cavern Entrance terrace around CAVE_POS
  const dCave = Math.hypot(x - CAVE_POS.x, z - CAVE_POS.z);
  if (dCave < 16) {
    const blend = 1 - smoothstep(8, 16, dCave);
    h = h * (1 - blend) + 7.4 * blend;
  }

  // Flatten Abandoned Expedition clearing around EXPEDITION_POS
  const dExp = Math.hypot(x - EXPEDITION_POS.x, z - EXPEDITION_POS.z);
  if (dExp < 18) {
    const blend = 1 - smoothstep(9, 18, dExp);
    h = h * (1 - blend) + 4.3 * blend;
  }

  // Flatten gentle landing beach around spawn (0, 184)
  const dSpawn = Math.hypot(x - PLAYER_SPAWN.x, z - PLAYER_SPAWN.z);
  if (dSpawn < 18) {
    const blend = 1 - smoothstep(8, 18, dSpawn);
    h = h * (1 - blend) + 1.45 * blend;
  }

  // Carve Azure Lake basin at LAKE_CENTER
  const dLake = Math.hypot(x - LAKE_CENTER.x, z - LAKE_CENTER.z);
  if (dLake < LAKE_CENTER.radius + 7) {
    const lakeDepth = 1 - smoothstep(LAKE_CENTER.radius - 3, LAKE_CENTER.radius + 7, dLake);
    const targetBed = 1.1;
    h = h * (1 - lakeDepth) + targetBed * lakeDepth;
  }

  // Carve Crystal River channel
  const river = getRiverSample(x, z);
  if (river.dist < 10.5 && z > WATERFALL_POS.z + 2) {
    const channelBlend = 1 - smoothstep(3.4, 10.5, river.dist);
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
    -4,
    174,
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
    -78,
    184,
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
    -6,
    138,
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
  // New biome landmark pads (Plains Villages, Ruined Portal, Peak Outposts & Slopes Igloo)
  flattenPad(PLAINS_VILLAGE_POS.x, PLAINS_VILLAGE_POS.z, 13.0, 21.0, 4.4);
  flattenPad(SUNFLOWER_VILLAGE_POS.x, SUNFLOWER_VILLAGE_POS.z, 12.0, 19.0, 4.2);
  flattenPad(RUINED_PORTAL_POS.x, RUINED_PORTAL_POS.z, 6.5, 13.5, 4.6);
  flattenPad(MEADOW_OUTPOST_POS.x, MEADOW_OUTPOST_POS.z, 7.0, 13.5, 8.8);
  flattenPad(GROVE_OUTPOST_POS.x, GROVE_OUTPOST_POS.z, 7.0, 13.5, 11.2);
  flattenPad(SNOWY_PLAINS_OUTPOST_POS.x, SNOWY_PLAINS_OUTPOST_POS.z, 7.0, 13.5, 6.8);
  flattenPad(SNOWY_SLOPES_IGLOO_POS.x, SNOWY_SLOPES_IGLOO_POS.z, 6.2, 12.5, 13.5);
  flattenPad(JAGGED_PEAKS_POS.x, JAGGED_PEAKS_POS.z, 7.5, 14.5, 22.0);
  flattenPad(FROZEN_PEAKS_POS.x, FROZEN_PEAKS_POS.z, 7.5, 14.5, 20.5);
  flattenPad(STONY_PEAKS_POS.x, STONY_PEAKS_POS.z, 7.5, 14.5, 16.5);
  // Mega-Island (2x) landmark pads
  flattenPad(DESERT_PYRAMID_POS.x, DESERT_PYRAMID_POS.z, 14.0, 22.0, 5.2);
  flattenPad(DESERT_VILLAGE_POS.x, DESERT_VILLAGE_POS.z, 15.0, 23.0, 4.6);
  flattenPad(DESERT_WELL_POS.x, DESERT_WELL_POS.z, 6.0, 12.0, 4.8);
  flattenPad(DESERT_OUTPOST_POS.x, DESERT_OUTPOST_POS.z, 7.5, 14.0, 5.4);
  flattenPad(SAVANNA_VILLAGE_POS.x, SAVANNA_VILLAGE_POS.z, 15.0, 23.0, 5.2);
  flattenPad(SAVANNA_OUTPOST_POS.x, SAVANNA_OUTPOST_POS.z, 7.5, 14.0, 5.6);
  flattenPad(BADLANDS_MINESHAFT_POS.x, BADLANDS_MINESHAFT_POS.z, 9.0, 16.0, 6.4);
  flattenPad(SWAMP_HUT_POS.x, SWAMP_HUT_POS.z, 8.0, 14.0, 2.35);

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

  const frozenRiver = getFrozenRiverSample(x, z);
  if (frozenRiver.dist < 8.5) return 'frozen_river';

  // 5 Distinct Ocean Zones around the 560m coastline
  if (h < OCEAN_LEVEL - 0.15) {
    const rDist = Math.hypot(x, z);
    if (z < -260) return 'frozen_ocean';
    if (z < -40) return 'cold_ocean';
    if (z >= 220 && x > -160 && rDist < 650) return 'warm_ocean';
    if (z >= -40 && z < 220 && rDist < 650) return 'lukewarm_ocean';
    return 'ocean';
  }

  // 3 Coastal Shore Biomes (Snowy Beach, Stony Shore, Sandy Beach)
  if (h < 2.25) {
    if (z < -160) return 'snowy_beach';
    if (Math.abs(x) > 370 && z >= -160 && z < 80) return 'stony_shore';
    return 'beach';
  }

  // Anchor biome structure zones cleanly inside their home biome
  if (Math.hypot(x - TRIAL_CHAMBERS_POS.x, z - TRIAL_CHAMBERS_POS.z) < 9.5) return 'forest';
  if (Math.hypot(x - WOODLAND_MANSION_POS.x, z - WOODLAND_MANSION_POS.z) < 13.5) return 'dark_forest';
  if (Math.hypot(x - TAIGA_VILLAGE_POS.x, z - TAIGA_VILLAGE_POS.z) < 12.5) return 'taiga';
  if (Math.hypot(x - PILLAGER_OUTPOST_POS.x, z - PILLAGER_OUTPOST_POS.z) < 9.5) return 'taiga';
  if (Math.hypot(x - TRAIL_RUINS_POS.x, z - TRAIL_RUINS_POS.z) < 10.5) return 'old_growth_pine_taiga';
  if (Math.hypot(x - SNOWY_VILLAGE_POS.x, z - SNOWY_VILLAGE_POS.z) < 12.5) return 'snowy_taiga';
  if (Math.hypot(x - SNOWY_IGLOO_POS.x, z - SNOWY_IGLOO_POS.z) < 9.5) return 'snowy_taiga';
  if (Math.hypot(x - JUNGLE_TEMPLE_POS.x, z - JUNGLE_TEMPLE_POS.z) < 12.0) return 'jungle';
  if (Math.hypot(x - PLAINS_VILLAGE_POS.x, z - PLAINS_VILLAGE_POS.z) < 16.0) return 'plains';
  if (Math.hypot(x - RUINED_PORTAL_POS.x, z - RUINED_PORTAL_POS.z) < 12.0) return 'plains';
  if (Math.hypot(x - SUNFLOWER_VILLAGE_POS.x, z - SUNFLOWER_VILLAGE_POS.z) < 16.0) return 'sunflower_plains';
  if (Math.hypot(x - MEADOW_OUTPOST_POS.x, z - MEADOW_OUTPOST_POS.z) < 14.0) return 'meadow';
  if (Math.hypot(x - CHERRY_GROVE_POS.x, z - CHERRY_GROVE_POS.z) < 28.0) return 'cherry_grove';
  if (Math.hypot(x - ICE_SPIKES_POS.x, z - ICE_SPIKES_POS.z) < 34.0) return 'ice_spikes';
  if (Math.hypot(x - GROVE_OUTPOST_POS.x, z - GROVE_OUTPOST_POS.z) < 15.0) return 'grove';
  if (Math.hypot(x - SNOWY_PLAINS_OUTPOST_POS.x, z - SNOWY_PLAINS_OUTPOST_POS.z) < 15.0) return 'snowy_plains';
  if (Math.hypot(x - SNOWY_SLOPES_IGLOO_POS.x, z - SNOWY_SLOPES_IGLOO_POS.z) < 15.0) return 'snowy_slopes';
  if (Math.hypot(x - JAGGED_PEAKS_POS.x, z - JAGGED_PEAKS_POS.z) < 26.0) return 'jagged_peaks';
  if (Math.hypot(x - FROZEN_PEAKS_POS.x, z - FROZEN_PEAKS_POS.z) < 26.0) return 'frozen_peaks';
  if (Math.hypot(x - STONY_PEAKS_POS.x, z - STONY_PEAKS_POS.z) < 26.0) return 'stony_peaks';

  // Anchor Mega-Island (2x) biome landmarks
  if (Math.hypot(x - MUSHROOM_FIELDS_POS.x, z - MUSHROOM_FIELDS_POS.z) < 88.0) return 'mushroom_fields';
  if (Math.hypot(x - DESERT_PYRAMID_POS.x, z - DESERT_PYRAMID_POS.z) < 30.0) return 'desert';
  if (Math.hypot(x - DESERT_VILLAGE_POS.x, z - DESERT_VILLAGE_POS.z) < 30.0) return 'desert';
  if (Math.hypot(x - DESERT_WELL_POS.x, z - DESERT_WELL_POS.z) < 18.0) return 'desert';
  if (Math.hypot(x - DESERT_OUTPOST_POS.x, z - DESERT_OUTPOST_POS.z) < 20.0) return 'desert';
  if (Math.hypot(x - SAVANNA_VILLAGE_POS.x, z - SAVANNA_VILLAGE_POS.z) < 26.0) return 'savanna';
  if (Math.hypot(x - SAVANNA_OUTPOST_POS.x, z - SAVANNA_OUTPOST_POS.z) < 20.0) return 'savanna';
  if (Math.hypot(x - SAVANNA_PLATEAU_POS.x, z - SAVANNA_PLATEAU_POS.z) < 62.0) return 'savanna_plateau';
  if (Math.hypot(x - WINDSWEPT_SAVANNA_POS.x, z - WINDSWEPT_SAVANNA_POS.z) < 64.0) return 'windswept_savanna';
  if (Math.hypot(x - WOODED_BADLANDS_POS.x, z - WOODED_BADLANDS_POS.z) < 64.0) return 'wooded_badlands';
  if (Math.hypot(x - ERODED_BADLANDS_POS.x, z - ERODED_BADLANDS_POS.z) < 66.0) return 'eroded_badlands';
  if (Math.hypot(x - BADLANDS_MINESHAFT_POS.x, z - BADLANDS_MINESHAFT_POS.z) < 28.0) return 'badlands';
  if (Math.hypot(x - SWAMP_HUT_POS.x, z - SWAMP_HUT_POS.z) < 26.0) return 'swamp';
  if (Math.hypot(x - MANGROVE_SWAMP_POS.x, z - MANGROVE_SWAMP_POS.z) < 76.0) return 'mangrove_swamp';

  // Keep homestead pasture, farmer market, wheatfield, hilltop house & garage cleanly in Amber Savanna
  if (x >= -96 && x < -14 && z >= 76 && z <= 178) return 'grassland';

  // Gentle organic domain warp so biome transitions wind naturally across the expanded 560m island
  const wx = x + (fbm(x * 0.009 + 1.3, z * 0.009 + 5.1, 2) - 0.5) * 30;
  const wz = z + (fbm(x * 0.009 + 9.7, z * 0.009 + 2.4, 2) - 0.5) * 30;

  // Outer-Ring Mega-Island Biomes (Desert, Savanna Trio, Badlands Trio, Swamp & Mangrove Swamp, Mushroom Fields)
  if (wx > 245 && wz < -185) return 'mushroom_fields';
  if (wx < -195 && wz >= 120) return 'desert';
  if (wx < -225 && wz >= -120 && wz < 120) {
    if (wx < -400 && wz >= 5) return 'windswept_savanna';
    if (wz < -35) return 'savanna_plateau';
    return 'savanna';
  }
  if (wx > 195 && wz >= 115) {
    if (wx > 335 && wz < 245) return 'wooded_badlands';
    if (wz > 305) return 'eroded_badlands';
    return 'badlands';
  }
  if (wx > 225 && wz >= -135 && wz < 115) {
    if (wz < -5) return 'mangrove_swamp';
    return 'swamp';
  }

  // High Alpine Mountain Peaks (Jagged Peaks, Frozen Peaks, Stony Peaks, Snowy Slopes)
  if (wz < -140 && wx >= -52 && wx < 28 && h > 16.5) return 'jagged_peaks';
  if (wz < -135 && wx >= 28 && wx < 118 && h > 15.0) return 'frozen_peaks';
  if (wx >= 118 && wz >= -128 && wz < -55 && h > 11.5) return 'stony_peaks';
  if (wz < -130 && wx >= -55 && wx < 75 && h > 11.5) return 'snowy_slopes';

  // High volcanic central northern mountain peaks
  if (h > 14.5 || (z < -92 && x > -38 && x < 54 && h > 11.2)) {
    return 'mountain';
  }

  // Far North-West Glacial Ice Spikes & Snowy Plains
  if (wz < -145 && wx < -118) return 'ice_spikes';
  if (wz < -112 && wx < -76) return 'snowy_plains';

  // Northern Alpine Grove (snowy spruce slopes east of peaks)
  if (wz < -105 && wx >= 35 && wx < 125) return 'grove';

  // Scenic Eastern Cherry Grove terrace
  if (wx >= 96 && wx < 178 && wz >= -85 && wz < -14) return 'cherry_grove';

  // Northern boreal / taiga belt
  if (wz < -38) {
    if ((wz < -82 && wx <= 24) || (wz < -98 && wx <= 70)) {
      return 'snowy_taiga';
    }
    if (wz < -38 && wz >= -82 && wx < -24) {
      return 'old_growth_pine_taiga';
    }
    if (wz < -54 && wx >= 74) {
      return 'old_growth_spruce_taiga';
    }
    return 'taiga';
  }

  // Far West Windswept Gravelly Hills & Windswept Hills
  if (wx < -132 && wz >= -112 && wz < -48) return 'windswept_gravelly_hills';
  if (wx < -132 && wz >= -48 && wz < 46) return 'windswept_hills';

  // Far East Windswept Forest highland cliffs
  if (wx >= 134 && wz >= -14 && wz < 60) return 'windswept_forest';

  // Central-West Elevated Alpine Meadow
  if (wx >= -124 && wx < -46 && wz >= -42 && wz < 22) return 'meadow';

  // South-West Sunflower Plains & Rolling Plains
  if (wx < -96 && wz >= 102) return 'sunflower_plains';
  if (wx < -88 && wz >= 22 && wz < 102) return 'plains';

  // Western Amber Savanna
  const savannaMask = fbm(x * 0.007 + 4, z * 0.007 + 8, 2);
  if (wx < -24 || (wx < -4 && savannaMask > 0.58)) {
    return 'grassland';
  }

  // Eastern Pale Garden hollow
  if (wx >= 84 && wz >= -54 && wz < 28) {
    return 'pale_garden';
  }

  // Dark Forest canopy pocket (between crystal river and expedition/pale garden)
  if (wx >= 18 && wx < 60 && wz >= -38 && wz < 14) {
    return 'dark_forest';
  }

  // Southeastern Tropical Jungle belt
  if (wx >= 58 && wz >= 28) {
    if (wx < 104 && wz < 88) {
      return 'bamboo_jungle';
    }
    if (wx >= 104 && wz < 120) {
      return 'jungle';
    }
    return 'sparse_jungle';
  }

  // Central & south-central temperate woodlands
  if (wx >= 4 && wz >= 94) {
    return 'flower_forest';
  }
  if (wx >= 18 && wz >= 14 && wz < 54) {
    return 'old_growth_birch_forest';
  }
  if (wx >= 18 && wz >= 54 && wz < 94) {
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
