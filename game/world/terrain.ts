import { BiomeId, WorldType } from '../types';
import {
  getLouisianaBaseHeight,
  getLouisianaBiome,
  getLouisianaWaterAt,
  isInLouisianaBounds,
  isLouisianaFreshwater,
} from './louisianaLandmass';

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
export const HILLTOP_UPPER_FLOOR_Y = HILL_HOUSE_Y + 3.55;
export const HILLTOP_HOUSE_STAIR = {
  minX: HILL_HOUSE_POS.x - 8.05,
  maxX: HILL_HOUSE_POS.x - 6.55,
  minZ: HILL_HOUSE_POS.z - 3.3,
  maxZ: HILL_HOUSE_POS.z + 3.9,
  bottomY: HILL_HOUSE_Y + 0.08,
  topY: HILLTOP_UPPER_FLOOR_Y,
} as const;
export const BOWLING_ALLEY_POS = { x: -107, z: 128 };
export const BOWLING_ALLEY_FLOOR_Y = HILL_HOUSE_Y + 0.16;
export const BOWLING_ALLEY_CLEAR_ZONE = {
  minX: BOWLING_ALLEY_POS.x - 25,
  maxX: BOWLING_ALLEY_POS.x + 14,
  minZ: BOWLING_ALLEY_POS.z - 8,
  maxZ: BOWLING_ALLEY_POS.z + 8,
} as const;
export function isInBowlingAlleyClearZone(x: number, z: number): boolean {
  return (
    x >= BOWLING_ALLEY_CLEAR_ZONE.minX &&
    x <= BOWLING_ALLEY_CLEAR_ZONE.maxX &&
    z >= BOWLING_ALLEY_CLEAR_ZONE.minZ &&
    z <= BOWLING_ALLEY_CLEAR_ZONE.maxZ
  );
}
export const VEHICLE_GARAGE_POS = { x: -52, z: 152 };
export const VEHICLE_GARAGE_Y = 3.25;
export const UNDERGROUND_ELEVATOR_POS = { x: -34, z: 152 };
export const UNDERGROUND_ELEVATOR_KIOSK_POS = {
  x: UNDERGROUND_ELEVATOR_POS.x - 5.45,
  z: UNDERGROUND_ELEVATOR_POS.z + 4.1,
};
export const SATURN_ROCKET_POS = { x: -18, z: 164 };
export const ISLAND_UFO_POS = { x: 40, z: -35 };
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
export const PLAYER_SPAWN = { x: 0, z: 680 };
export const SHIPWRECK_POS = { x: -8, z: 748 };

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
export const MUSHROOM_FIELDS_POS = { x: 325, z: -265 };
export const OCEAN_MONUMENT_POS = { x: -245, z: 745 };
export const CORAL_REEF_POS = { x: 175, z: 755 };
export const FROZEN_OCEAN_ICEBERG_POS = { x: -175, z: -755 };
export const BURIED_TREASURE_POS = { x: 72, z: 702 };

// Grand Finale Pack Expanded Outer Biomes (740m Grand Island Expansion)
// Dragon Valley now occupies a remote volcanic basin on the far northern ridge,
// more than 800 m from the premade hill house. Its pass still points back toward
// the homestead, but the valley and its resident dragons no longer crowd the
// starter shelter, garage, farmland or sunflower village.
export const DRAGON_VALLEY_POS = { x: 160, z: -640 };
export const DRAGON_VALLEY_ABANDONED_POS = { x: 134, z: -634 };
// Stop the red biome tint before it reaches the hill house or Sunflower Village.
export const DRAGON_VALLEY_BIOME_RADIUS = 38;
export const VIKING_VILLAGE_POS = { x: 560, z: -260 };
export const RESORT_CORNER_POS = { x: -480, z: 410 };
export const RUINED_CASTLE_POS = { x: -360, z: -520 };

// Louisiana mainland / Crescent City district: separated from the survival
// island and generated on its own boot-shaped landmass to the south.
export const CRESCENT_CITY_POS = { x: 40, z: 1390 };
export const CRESCENT_CITY_TERMINAL_POS = { x: 40, z: 1460 };
export const CRESCENT_CITY_GARAGE_POS = { x: 2, z: 1350 };
export const CRESCENT_CITY_SAFEHOUSE_POS = { x: 88, z: 1350 };
export const CRESCENT_CITY_DOCKS_POS = { x: -72, z: 1460 };
export const CRESCENT_CITY_VAULT_POS = { x: 88, z: 1428 };
export const CRESCENT_CITY_PARKING_POS = { x: 2, z: 1350 };
export const CRESCENT_CITY_HIGHWAY_POS = { x: 146, z: 1390 };

export const WORLD_RADIUS = 2400;
export const ISLAND_PLAY_RADIUS = 820;
/** Includes the separated Louisiana landmass and the open-water crossing. */
export const PLAYABLE_MAX_RADIUS = 2380;

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

export const TERRAIN_SIZE = 1920;
// A denser heightfield removes the broad triangular shoulders and stair-stepped
// ridge lines that made the old 7.5 m grid read as blocky terrain. 320 segments
// keeps the mesh at 6 m spacing, well inside the island renderer's budget.
export const TERRAIN_SEGS = 320;
export const TERRAIN_VERTS = TERRAIN_SEGS + 1;
export const TERRAIN_STEP = TERRAIN_SIZE / TERRAIN_SEGS; // 6m per vertex
export const TERRAIN_HALF = TERRAIN_SIZE * 0.5;

export const terrainDeltaGrid = new Float32Array(TERRAIN_VERTS * TERRAIN_VERTS);
export const terrainWetnessGrid = new Float32Array(TERRAIN_VERTS * TERRAIN_VERTS);
export const terrainScorchGrid = new Float32Array(TERRAIN_VERTS * TERRAIN_VERTS);
export const terrainLoosenessGrid = new Float32Array(TERRAIN_VERTS * TERRAIN_VERTS);
export const terrainPuddleGrid = new Float32Array(TERRAIN_VERTS * TERRAIN_VERTS);

let hasTerrainDeformation = false;

export function markTerrainDeformed(): void {
  hasTerrainDeformation = true;
}

export function resetTerrainDeformation(): void {
  hasTerrainDeformation = false;
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
    hdx * hdx + hdz * hdz < 148.84 ||
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
  const fdx = x - FARMER_POS.x;
  const fdz = z - FARMER_POS.z;
  if (fdx * fdx + fdz * fdz < 20.25) return true;
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
  prevFootY = footY,
): number {
  if (activeTerrainWorldType === 'flat') return -9999;
  const dx = x - HILL_HOUSE_POS.x;
  const dz = z - HILL_HOUSE_POS.z;
  const sweepFootY = Math.max(footY, prevFootY);
  let bestY = -9999;

  // Main Premade House + Dedicated Music Studio Wing interior floor (X: -5.35..+4.35, Z: -4.35..+8.55)
  if (dx >= -5.35 && dx <= 4.35 && dz >= -4.35 && dz <= 8.55) {
    const floorTop = HILL_HOUSE_Y + 0.08;
    if (sweepFootY >= floorTop - 1.65 && floorTop > bestY) {
      bestY = floorTop;
    }
  }

  // East Front Porch deck (X: +4.2..+6.45, Z: -3.15..+3.15)
  if (dx >= 4.2 && dx <= 6.45 && dz >= -3.15 && dz <= 3.15) {
    const porchTop = HILL_HOUSE_Y + 0.07;
    if (sweepFootY >= porchTop - 1.65 && porchTop > bestY) {
      bestY = porchTop;
    }
  }

  // Porch East Entry Step (X: +6.4..+7.05, Z: -1.65..+1.65)
  if (dx >= 6.4 && dx <= 7.05 && dz >= -1.65 && dz <= 1.65) {
    const stepTop = HILL_HOUSE_Y + 0.03;
    if (sweepFootY >= stepTop - 1.65 && stepTop > bestY) {
      bestY = stepTop;
    }
  }

  // Second-storey suite and its exterior west deck.
  if (
    dx >= -6.55 &&
    dx <= 4.2 &&
    dz >= -4.2 &&
    dz <= 4.2 &&
    sweepFootY >= HILLTOP_UPPER_FLOOR_Y - 1.35 &&
    HILLTOP_UPPER_FLOOR_Y > bestY
  ) {
    bestY = HILLTOP_UPPER_FLOOR_Y;
  }

  // Full-height exterior stair from the west lawn to the upper deck.
  if (
    x >= HILLTOP_HOUSE_STAIR.minX &&
    x <= HILLTOP_HOUSE_STAIR.maxX &&
    z >= HILLTOP_HOUSE_STAIR.minZ &&
    z <= HILLTOP_HOUSE_STAIR.maxZ
  ) {
    const t = (z - HILLTOP_HOUSE_STAIR.minZ) /
      (HILLTOP_HOUSE_STAIR.maxZ - HILLTOP_HOUSE_STAIR.minZ);
    const stairY =
      HILLTOP_HOUSE_STAIR.bottomY +
      t * (HILLTOP_HOUSE_STAIR.topY - HILLTOP_HOUSE_STAIR.bottomY);
    if (sweepFootY >= stairY - 0.55 && stairY > bestY) {
      bestY = stairY;
    }
  }

  // Level floor and approach of the covered bowling shelter.
  if (
    x >= BOWLING_ALLEY_CLEAR_ZONE.minX + 1.5 &&
    x <= BOWLING_ALLEY_CLEAR_ZONE.maxX - 1.5 &&
    z >= BOWLING_ALLEY_CLEAR_ZONE.minZ + 1.0 &&
    z <= BOWLING_ALLEY_CLEAR_ZONE.maxZ - 1.0 &&
    sweepFootY >= BOWLING_ALLEY_FLOOR_Y - 0.65 &&
    BOWLING_ALLEY_FLOOR_Y > bestY
  ) {
    bestY = BOWLING_ALLEY_FLOOR_Y;
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
  prevFootY = footY,
): number {
  if (activeTerrainWorldType === 'flat') return -9999;
  const sweepFootY = Math.max(footY, prevFootY);
  let bestY = -9999;

  // 1. Woodland Mansion Plinth & Ground Hall Floor (14.4m x 10.6m centered at WOODLAND_MANSION_POS)
  const mdx = x - WOODLAND_MANSION_POS.x;
  const mdz = z - WOODLAND_MANSION_POS.z;
  if (mdx >= -7.3 && mdx <= 7.3 && mdz >= -5.4 && mdz <= 5.4) {
    const mansionFloorTop = 4.1 + 0.14;
    if (sweepFootY >= mansionFloorTop - 1.65 && mansionFloorTop > bestY) {
      bestY = mansionFloorTop;
    }
  } else if (mdx >= -1.7 && mdx <= 1.7 && mdz >= 5.3 && mdz <= 6.2) {
    const stepTop = 4.1 + 0.07;
    if (sweepFootY >= stepTop - 1.65 && stepTop > bestY) {
      bestY = stepTop;
    }
  }

  // 2. Pillager Outpost Ground Pavilion (5.6m x 5.6m open archways)
  const podx = x - PILLAGER_OUTPOST_POS.x;
  const podz = z - PILLAGER_OUTPOST_POS.z;
  if (Math.abs(podx) <= 2.9 && Math.abs(podz) <= 2.9) {
    const poFloorTop = 5.0 + 0.12;
    if (sweepFootY >= poFloorTop - 1.65 && poFloorTop > bestY) {
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
      if (sweepFootY >= floorTop - 1.65 && floorTop > bestY) {
        bestY = floorTop;
      }
    }
  }

  // 4. Snowy Igloo packed floor
  const igdx = x - SNOWY_IGLOO_POS.x;
  const igdz = z - SNOWY_IGLOO_POS.z;
  if (igdx * igdx + igdz * igdz <= 8.7025 || (Math.abs(igdx) <= 0.9 && igdz >= 2.2 && igdz <= 4.1)) {
    const igFloorTop = 9.0 + 0.05;
    if (sweepFootY >= igFloorTop - 1.65 && igFloorTop > bestY) {
      bestY = igFloorTop;
    }
  }

  return bestY;
}

/**
 * Exact walkable surface heights for raised structural pads, ramps, decks, and platforms
 * placed in worldBuilder.ts so characters and vehicles match the rendered 3D slabs cleanly.
 */
export function getOverworldStructureSurfaceY(
  x: number,
  z: number,
  footY: number,
  prevFootY = footY,
): number {
  if (activeTerrainWorldType === 'flat') return -9999;
  const sweepFootY = Math.max(footY, prevFootY);
  let bestY = -9999;

  // 1. Custom 4-Bay Vehicle Garage Pad, Bay Pads & Driveway Apron
  const gdx = x - VEHICLE_GARAGE_POS.x;
  const gdz = z - VEHICLE_GARAGE_POS.z;
  if (Math.abs(gdx) <= 14.35 && gdz >= -6.6 && gdz <= 9.75) {
    if (Math.abs(gdx) <= 14.05 && Math.abs(gdz) <= 6.55) {
      const padTop = VEHICLE_GARAGE_Y + 0.13;
      if (sweepFootY >= padTop - 1.65 && padTop > bestY) {
        bestY = padTop;
      }
    }
    if (gdz >= -3.55 && gdz <= 4.75) {
      for (let i = 0; i < 4; i++) {
        const bx = -9.0 + i * 6.0;
        if (Math.abs(gdx - bx) <= 2.55) {
          const bayTop = VEHICLE_GARAGE_Y + 0.165;
          if (sweepFootY >= bayTop - 1.65 && bayTop > bestY) {
            bestY = bayTop;
          }
          break;
        }
      }
    }
    if (gdz >= 5.9 && gdz <= 9.75) {
      const apronTop = VEHICLE_GARAGE_Y + 0.07 - (gdz - 7.8) * 0.045;
      if (sweepFootY >= apronTop - 1.65 && apronTop > bestY) {
        bestY = apronTop;
      }
    }
  }

  // 2. Hilltop House East Access Ramp (continuous analytical ramp bridging 7.5m terrain step)
  const hdx = x - HILL_HOUSE_POS.x;
  const hdzAbs = Math.abs(z - HILL_HOUSE_POS.z);
  if (hdx >= 6.4 && hdx <= 21.5 && hdzAbs <= 2.9) {
    const rampT = smoothstep(HILL_HOUSE_POS.x + 6.8, HILL_HOUSE_POS.x + 20.5, x);
    const rampY = HILL_HOUSE_Y * (1 - rampT) + 3.25 * rampT;
    if (sweepFootY >= rampY - 1.65 && rampY > bestY) {
      bestY = rampY;
    }
  }

  // 3. Saturn V Concrete Launch Pad & Boarding Ramp
  const sdx = x - SATURN_ROCKET_POS.x;
  const sdz = z - SATURN_ROCKET_POS.z;
  const saturnDistSq = sdx * sdx + sdz * sdz;
  if (saturnDistSq <= 9.5 * 9.5) {
    const saturnBaseY = getTerrainHeight(SATURN_ROCKET_POS.x, SATURN_ROCKET_POS.z);
    if (saturnDistSq <= 9.15 * 9.15) {
      const padTop = saturnBaseY + 0.6;
      if (sweepFootY >= padTop - 1.65 && padTop > bestY) {
        bestY = padTop;
      }
    }
    if (Math.abs(sdx) <= 1.15 && sdz >= 3.1 && sdz <= 7.35) {
      const rampT = Math.max(0, Math.min(1, (7.35 - sdz) / 4.25));
      const rampTop = saturnBaseY + 0.55 + rampT * 0.45;
      if (sweepFootY >= rampTop - 1.65 && rampTop > bestY) {
        bestY = rampTop;
      }
    }
  }

  // 4. Badlands Surface Mineshaft Plank Deck
  const mdx = x - BADLANDS_MINESHAFT_POS.x;
  const mdz = z - BADLANDS_MINESHAFT_POS.z;
  if (Math.abs(mdx) <= 1.95 && Math.abs(mdz) <= 8.3) {
    const deckTop = getTerrainHeight(BADLANDS_MINESHAFT_POS.x, BADLANDS_MINESHAFT_POS.z) + 0.2;
    if (sweepFootY >= deckTop - 1.65 && deckTop > bestY) {
      bestY = deckTop;
    }
  }

  // 5. Swamp Hut Raised Wooden Deck
  const swdx = x - SWAMP_HUT_POS.x;
  const swdz = z - SWAMP_HUT_POS.z;
  if (Math.abs(swdx) <= 2.65 && Math.abs(swdz) <= 2.65) {
    const hutDeckTop = getTerrainHeight(SWAMP_HUT_POS.x, SWAMP_HUT_POS.z) + 2.575;
    if (sweepFootY >= hutDeckTop - 1.65 && hutDeckTop > bestY) {
      bestY = hutDeckTop;
    }
  }

  // 6. Resort Corner Tiki Lounge Deck
  const rcdx = x - RESORT_CORNER_POS.x;
  const rcdz = z - RESORT_CORNER_POS.z;
  if (Math.abs(rcdx) <= 5.8 && Math.abs(rcdz) <= 4.3) {
    const tikiTop = getTerrainHeight(RESORT_CORNER_POS.x, RESORT_CORNER_POS.z) + 0.6;
    if (sweepFootY >= tikiTop - 1.65 && tikiTop > bestY) {
      bestY = tikiTop;
    }
  }

  // 7. Ruined Castle Obsidian Throne Dais
  const csdx = x - RUINED_CASTLE_POS.x;
  const csdz = z - RUINED_CASTLE_POS.z;
  if (Math.abs(csdx) <= 3.3 && csdz >= -9.3 && csdz <= -3.7) {
    const daisTop = getTerrainHeight(RUINED_CASTLE_POS.x, RUINED_CASTLE_POS.z) + 1.2;
    if (sweepFootY >= daisTop - 1.65 && daisTop > bestY) {
      bestY = daisTop;
    }
  }

  return bestY;
}

/**
 * Exact barycentric height sampler matching Three.js PlaneGeometry(size, size, segs, segs)
 * rotated -PI/2 around X (where quads split along the (ix, iz+1)-(ix+1, iz) diagonal).
 * Keeps physics 100% flush with rendered ground triangles on steep slopes and craters.
 */
export function samplePlaneGeometryHeight(
  geometry:
    | {
        attributes?: {
          position?: {
            count: number;
            getY: (index: number) => number;
          };
        };
      }
    | null
    | undefined,
  size: number,
  segs: number,
  x: number,
  z: number,
): number | null {
  const posAttr = geometry?.attributes?.position;
  if (!posAttr || segs <= 0 || size <= 0) return null;
  const verts = segs + 1;
  if (posAttr.count < verts * verts) return null;

  const half = size * 0.5;
  const step = size / segs;
  const gx = Math.max(0, Math.min(segs - 1e-6, (x + half) / step));
  const gz = Math.max(0, Math.min(segs - 1e-6, (z + half) / step));
  const ix = Math.min(segs - 1, Math.floor(gx));
  const iz = Math.min(segs - 1, Math.floor(gz));
  const fx = gx - ix;
  const fz = gz - iz;

  const idxA = iz * verts + ix;
  const idxD = idxA + 1;
  const idxB = idxA + verts;
  const idxC = idxB + 1;

  const ha = posAttr.getY(idxA);
  const hb = posAttr.getY(idxB);
  const hc = posAttr.getY(idxC);
  const hd = posAttr.getY(idxD);

  if (!Number.isFinite(ha) || !Number.isFinite(hb) || !Number.isFinite(hc) || !Number.isFinite(hd)) {
    return null;
  }

  // PlaneGeometry triangle winding: (a, b, d) when fx + fz <= 1, (b, c, d) when fx + fz > 1
  if (fx + fz <= 1) {
    return ha + fx * (hd - ha) + fz * (hb - ha);
  }
  return hc + (1 - fx) * (hb - hc) + (1 - fz) * (hd - hc);
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
  if (!hasTerrainDeformation) return [];
  const out: [number, number][] = [];
  for (let i = 0; i < terrainDeltaGrid.length; i++) {
    const v = terrainDeltaGrid[i];
    if (Math.abs(v) > 0.03) {
      out.push([i, Math.round(v * 1000) / 1000]);
    }
  }
  if (out.length === 0) hasTerrainDeformation = false;
  return out;
}

export function importSparseTerrainDeltas(entries?: [number, number][]): void {
  resetTerrainDeformation();
  if (!Array.isArray(entries) || entries.length === 0) return;
  for (const pair of entries) {
    if (!Array.isArray(pair) || pair.length < 2) continue;
    const idx = pair[0];
    const val = pair[1];
    if (idx >= 0 && idx < terrainDeltaGrid.length && Number.isFinite(val)) {
      terrainDeltaGrid[idx] = val;
      if (Math.abs(val) > 0.03) {
        hasTerrainDeformation = true;
      }
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
  dragon_valley: {
    name: 'Dragon Valley',
    color: '#991b1b',
    description: 'Volcanic obsidian canyon of glowing magma fissures, ancient dragon roosts, and rare Dragon Scale & Portal Core drops.',
  },
  viking_village: {
    name: 'Viking Village',
    color: '#3f6212',
    description: 'Nordic coastal fjord stronghold with timber longhouses, rune stones, shield racks, and a moored dragon-prow longship.',
  },
  resort_corner: {
    name: 'Resort Corner',
    color: '#06b6d4',
    description: 'Sun-drenched tropical beach resort featuring a Tiki Lounge serving buff drinks and docked coastal Jet Skis.',
  },
  ruined_castle: {
    name: 'Ruined Castle',
    color: '#4c1d95',
    description: 'Mist-shrouded gothic citadel ruins haunted by the Fallen King Ghost and guarding Crown Portal Cores & Golden V8 Blocks.',
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

function distSqToSegment(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number,
): { distSq: number; t: number } {
  const dx = bx - ax;
  const dz = bz - az;
  const lenSq = dx * dx + dz * dz;
  if (lenSq === 0) {
    const ex = px - ax;
    const ez = pz - az;
    return { distSq: ex * ex + ez * ez, t: 0 };
  }
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / lenSq));
  const ex = px - (ax + t * dx);
  const ez = pz - (az + t * dz);
  return { distSq: ex * ex + ez * ez, t };
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

// Western Rapids River: cascades from Windswept Hills -> Meadow -> Plains -> Savanna -> Desert Oasis -> SW Coast
export const WEST_RIVER_POINTS: [number, number, number][] = [
  [-185, -75, 11.2],
  [-160, -15, 7.6],
  [-215, 65, 4.4],
  [-295, 125, 2.8],
  [-355, 235, 1.5],
  [-415, 345, 0.4],
  [-465, 435, -0.8],
];

// Eastern Mountain Rapids & Swamp River: rushes from Stony Peaks -> Cherry Grove -> Mangrove Swamp -> Swamp -> East Coast
export const EAST_RIVER_POINTS: [number, number, number][] = [
  [168, -98, 12.0],
  [195, -45, 7.2],
  [260, -24, 3.8],
  [335, -8, 1.9],
  [415, 32, 0.9],
  [525, 68, -0.8],
];

// Southern Rapids Brook: winds through South Flower Forest & Sunflower Plains -> Southern Coast
export const SOUTH_RIVER_POINTS: [number, number, number][] = [
  [-42, 205, 5.2],
  [-108, 295, 3.0],
  [-155, 405, 1.2],
  [-185, 535, -0.8],
];

export const ALL_FLOWING_RIVERS: [number, number, number][][] = [
  RIVER_POINTS,
  WEST_RIVER_POINTS,
  EAST_RIVER_POINTS,
  SOUTH_RIVER_POINTS,
];

function computePolylineBounds(pts: [number, number, number][], pad: number): [number, number, number, number] {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (let i = 0; i < pts.length; i++) {
    const px = pts[i][0];
    const pz = pts[i][1];
    if (px < minX) minX = px;
    if (px > maxX) maxX = px;
    if (pz < minZ) minZ = pz;
    if (pz > maxZ) maxZ = pz;
  }
  return [minX - pad, maxX + pad, minZ - pad, maxZ + pad];
}

const FLOWING_RIVER_BOUNDS = ALL_FLOWING_RIVERS.map((pts) => computePolylineBounds(pts, 13));

// Northern Frozen River channel winding from Snowy Slopes to the Frozen Ocean
export const FROZEN_RIVER_POINTS: [number, number, number][] = [
  [-115, -210, 4.5],
  [-155, -285, 2.8],
  [-210, -365, 1.4],
  [-255, -455, 0.3],
  [-285, -545, -0.6],
];

const FROZEN_RIVER_BOUNDS = computePolylineBounds(FROZEN_RIVER_POINTS, 13);

export function getFrozenRiverSample(
  x: number,
  z: number,
): { dist: number; waterY: number; inRiver: boolean } {
  if (
    x < FROZEN_RIVER_BOUNDS[0] ||
    x > FROZEN_RIVER_BOUNDS[1] ||
    z < FROZEN_RIVER_BOUNDS[2] ||
    z > FROZEN_RIVER_BOUNDS[3]
  ) {
    return { dist: 9999, waterY: OCEAN_LEVEL, inRiver: false };
  }

  let minDistSq = 9999 * 9999;
  let bestWaterY = OCEAN_LEVEL;

  for (let i = 0; i < FROZEN_RIVER_POINTS.length - 1; i++) {
    const a = FROZEN_RIVER_POINTS[i];
    const b = FROZEN_RIVER_POINTS[i + 1];
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const lenSq = dx * dx + dz * dz;
    const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / lenSq));
    const ex = x - (a[0] + t * dx);
    const ez = z - (a[1] + t * dz);
    const dSq = ex * ex + ez * ez;
    if (dSq < minDistSq) {
      minDistSq = dSq;
      bestWaterY = a[2] + (b[2] - a[2]) * t;
    }
  }

  const minDist = minDistSq < 169 ? Math.sqrt(minDistSq) : 9999;
  return {
    dist: minDist,
    waterY: bestWaterY,
    inRiver: minDist < 7.5,
  };
}

export function getRiverSample(
  x: number,
  z: number,
): { dist: number; waterY: number; inRiver: boolean; isRapids: boolean } {
  let minDistSq = 9999 * 9999;
  let bestWaterY = OCEAN_LEVEL;
  let bestRapids = false;

  for (let rIdx = 0; rIdx < ALL_FLOWING_RIVERS.length; rIdx++) {
    const bounds = FLOWING_RIVER_BOUNDS[rIdx];
    if (x < bounds[0] || x > bounds[1] || z < bounds[2] || z > bounds[3]) {
      continue;
    }
    const pts = ALL_FLOWING_RIVERS[rIdx];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const dx = b[0] - a[0];
      const dz = b[1] - a[1];
      const lenSq = dx * dx + dz * dz;
      const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / lenSq));
      const ex = x - (a[0] + t * dx);
      const ez = z - (a[1] + t * dz);
      const dSq = ex * ex + ez * ez;
      if (dSq < minDistSq) {
        minDistSq = dSq;
        bestWaterY = a[2] + (b[2] - a[2]) * t;
        bestRapids = Math.abs(b[2] - a[2]) > 1.75;
      }
    }
  }

  const minDist = minDistSq < 169 ? Math.sqrt(minDistSq) : 9999;
  return {
    dist: minDist,
    waterY: bestWaterY,
    inRiver: minDist < 6.5,
    isRapids: bestRapids,
  };
}

export function getWaterLevelAt(x: number, z: number): number {
  if (activeTerrainWorldType === 'flat') return -999;
  const louisianaWater = getLouisianaWaterAt(x, z);
  if (louisianaWater) return louisianaWater.waterY;
  const ldx = x - LAKE_CENTER.x;
  const ldz = z - LAKE_CENTER.z;
  const lakeLim = LAKE_CENTER.radius + 3;
  if (ldx * ldx + ldz * ldz < lakeLim * lakeLim) {
    return LAKE_CENTER.waterY;
  }
  const sdx = x - SWAMP_POS.x;
  const sdz = z - SWAMP_POS.z;
  const swampLim = SWAMP_POS.radius + 1.5;
  if (sdx * sdx + sdz * sdz < swampLim * swampLim) {
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
  if (isLouisianaFreshwater(x, z)) return true;
  const h = getTerrainHeight(x, z);
  const ldx = x - LAKE_CENTER.x;
  const ldz = z - LAKE_CENTER.z;
  if (ldx * ldx + ldz * ldz < LAKE_CENTER.radius * LAKE_CENTER.radius && h < LAKE_CENTER.waterY + 0.35) return true;
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

let cachedIslandBaseTerrainGrid: Float32Array | null = null;

function ensureIslandBaseTerrainGrid(): Float32Array {
  if (cachedIslandBaseTerrainGrid) return cachedIslandBaseTerrainGrid;
  const grid = new Float32Array(TERRAIN_VERTS * TERRAIN_VERTS);
  const prevWorldType = activeTerrainWorldType;
  activeTerrainWorldType = 'island';
  try {
    for (let iz = 0; iz < TERRAIN_VERTS; iz++) {
      const vz = -TERRAIN_HALF + iz * TERRAIN_STEP;
      const rowOffset = iz * TERRAIN_VERTS;
      for (let ix = 0; ix < TERRAIN_VERTS; ix++) {
        const vx = -TERRAIN_HALF + ix * TERRAIN_STEP;
        grid[rowOffset + ix] = getBaseTerrainHeight(vx, vz);
      }
    }
  } finally {
    activeTerrainWorldType = prevWorldType;
  }
  cachedIslandBaseTerrainGrid = grid;
  return grid;
}

/**
 * Samples the exact rendered PlaneGeometry triangle elevation (including live terrain deltas)
 * so player ground collision and camera clearance match the visible ground mesh everywhere.
 */
export function getTerrainSurfaceHeight(x: number, z: number): number {
  if (activeTerrainWorldType === 'flat') return FLAT_GROUND_Y;
  if (!Number.isFinite(x) || !Number.isFinite(z)) return 0;
  if (Math.abs(x) > TERRAIN_HALF || Math.abs(z) > TERRAIN_HALF) {
    return getTerrainHeight(x, z);
  }

  const baseGrid = ensureIslandBaseTerrainGrid();
  const gx = (x + TERRAIN_HALF) / TERRAIN_STEP;
  const gz = (z + TERRAIN_HALF) / TERRAIN_STEP;
  const ix = Math.max(0, Math.min(TERRAIN_SEGS - 1, Math.floor(gx)));
  const iz = Math.max(0, Math.min(TERRAIN_SEGS - 1, Math.floor(gz)));
  const fx = Math.max(0, Math.min(1, gx - ix));
  const fz = Math.max(0, Math.min(1, gz - iz));

  const idx00 = iz * TERRAIN_VERTS + ix;
  const idx10 = idx00 + 1;
  const idx01 = idx00 + TERRAIN_VERTS;
  const idx11 = idx01 + 1;

  const v00 = baseGrid[idx00] + terrainDeltaGrid[idx00];
  const v10 = baseGrid[idx10] + terrainDeltaGrid[idx10];
  const v01 = baseGrid[idx01] + terrainDeltaGrid[idx01];
  const v11 = baseGrid[idx11] + terrainDeltaGrid[idx11];

  // Match THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, TERRAIN_SEGS, TERRAIN_SEGS).rotateX(-PI/2)
  // triangle diagonal (idx01 <-> idx10)
  if (fx + fz <= 1) {
    return v00 + fx * (v10 - v00) + fz * (v01 - v00);
  }
  return v11 + (1 - fx) * (v01 - v11) + (1 - fz) * (v10 - v11);
}

const FLAT_PADS: readonly [number, number, number, number, number, number][] = [
  [TRIAL_CHAMBERS_POS.x, TRIAL_CHAMBERS_POS.z, 6.5, 13.5, 13.5 * 13.5, 3.6],
  [WOODLAND_MANSION_POS.x, WOODLAND_MANSION_POS.z, 10.5, 17.5, 17.5 * 17.5, 4.1],
  [TAIGA_VILLAGE_POS.x, TAIGA_VILLAGE_POS.z, 11.5, 18.0, 18.0 * 18.0, 5.2],
  [PILLAGER_OUTPOST_POS.x, PILLAGER_OUTPOST_POS.z, 6.2, 12.5, 12.5 * 12.5, 5.0],
  [TRAIL_RUINS_POS.x, TRAIL_RUINS_POS.z, 6.5, 13.0, 13.0 * 13.0, 4.5],
  [SNOWY_VILLAGE_POS.x, SNOWY_VILLAGE_POS.z, 11.5, 18.0, 18.0 * 18.0, 9.4],
  [SNOWY_IGLOO_POS.x, SNOWY_IGLOO_POS.z, 5.8, 11.5, 11.5 * 11.5, 9.0],
  [JUNGLE_TEMPLE_POS.x, JUNGLE_TEMPLE_POS.z, 7.5, 14.5, 14.5 * 14.5, 4.2],
  [PLAINS_VILLAGE_POS.x, PLAINS_VILLAGE_POS.z, 13.0, 21.0, 21.0 * 21.0, 4.4],
  [SUNFLOWER_VILLAGE_POS.x, SUNFLOWER_VILLAGE_POS.z, 12.0, 19.0, 19.0 * 19.0, 4.2],
  [RUINED_PORTAL_POS.x, RUINED_PORTAL_POS.z, 6.5, 13.5, 13.5 * 13.5, 4.6],
  [MEADOW_OUTPOST_POS.x, MEADOW_OUTPOST_POS.z, 7.0, 13.5, 13.5 * 13.5, 8.8],
  [GROVE_OUTPOST_POS.x, GROVE_OUTPOST_POS.z, 7.0, 13.5, 13.5 * 13.5, 11.2],
  [SNOWY_PLAINS_OUTPOST_POS.x, SNOWY_PLAINS_OUTPOST_POS.z, 7.0, 13.5, 13.5 * 13.5, 6.8],
  [SNOWY_SLOPES_IGLOO_POS.x, SNOWY_SLOPES_IGLOO_POS.z, 6.2, 12.5, 12.5 * 12.5, 13.5],
  [JAGGED_PEAKS_POS.x, JAGGED_PEAKS_POS.z, 7.5, 14.5, 14.5 * 14.5, 22.0],
  [FROZEN_PEAKS_POS.x, FROZEN_PEAKS_POS.z, 7.5, 14.5, 14.5 * 14.5, 20.5],
  [STONY_PEAKS_POS.x, STONY_PEAKS_POS.z, 7.5, 14.5, 14.5 * 14.5, 16.5],
  [DESERT_PYRAMID_POS.x, DESERT_PYRAMID_POS.z, 14.0, 22.0, 22.0 * 22.0, 5.2],
  [DESERT_VILLAGE_POS.x, DESERT_VILLAGE_POS.z, 15.0, 23.0, 23.0 * 23.0, 4.6],
  [DESERT_WELL_POS.x, DESERT_WELL_POS.z, 6.0, 12.0, 12.0 * 12.0, 4.8],
  [DESERT_OUTPOST_POS.x, DESERT_OUTPOST_POS.z, 7.5, 14.0, 14.0 * 14.0, 5.4],
  [SAVANNA_VILLAGE_POS.x, SAVANNA_VILLAGE_POS.z, 15.0, 23.0, 23.0 * 23.0, 5.2],
  [SAVANNA_OUTPOST_POS.x, SAVANNA_OUTPOST_POS.z, 7.5, 14.0, 14.0 * 14.0, 5.6],
  [BADLANDS_MINESHAFT_POS.x, BADLANDS_MINESHAFT_POS.z, 9.0, 16.0, 16.0 * 16.0, 6.4],
  [SWAMP_HUT_POS.x, SWAMP_HUT_POS.z, 8.0, 14.0, 14.0 * 14.0, 2.35],
  [DRAGON_VALLEY_POS.x, DRAGON_VALLEY_POS.z, 36.0, 40.0, 40.0 * 40.0, 10.0],
  [VIKING_VILLAGE_POS.x, VIKING_VILLAGE_POS.z, 34.0, 66.0, 66.0 * 66.0, 6.0],
  [RESORT_CORNER_POS.x, RESORT_CORNER_POS.z, 32.0, 64.0, 64.0 * 64.0, 4.0],
  [RUINED_CASTLE_POS.x, RUINED_CASTLE_POS.z, 34.0, 68.0, 68.0 * 68.0, 6.0],
  // Level hilltop shelf for the sheltered bowling alley west of the house.
  [BOWLING_ALLEY_POS.x - 7.5, BOWLING_ALLEY_POS.z, 11.0, 18.0, 18.0 * 18.0, HILL_HOUSE_Y],
  // Walkable level path from the house's new west stair to the alley entrance.
  [HILL_HOUSE_POS.x - 14.0, HILL_HOUSE_POS.z, 3.5, 8.0, 8.0 * 8.0, HILL_HOUSE_Y],
];

const BIOME_ANCHOR_CIRCLES: readonly [number, number, number, BiomeId][] = [
  [TRIAL_CHAMBERS_POS.x, TRIAL_CHAMBERS_POS.z, 9.5 * 9.5, 'forest'],
  [WOODLAND_MANSION_POS.x, WOODLAND_MANSION_POS.z, 13.5 * 13.5, 'dark_forest'],
  [TAIGA_VILLAGE_POS.x, TAIGA_VILLAGE_POS.z, 12.5 * 12.5, 'taiga'],
  [PILLAGER_OUTPOST_POS.x, PILLAGER_OUTPOST_POS.z, 9.5 * 9.5, 'taiga'],
  [TRAIL_RUINS_POS.x, TRAIL_RUINS_POS.z, 10.5 * 10.5, 'old_growth_pine_taiga'],
  [SNOWY_VILLAGE_POS.x, SNOWY_VILLAGE_POS.z, 12.5 * 12.5, 'snowy_taiga'],
  [SNOWY_IGLOO_POS.x, SNOWY_IGLOO_POS.z, 9.5 * 9.5, 'snowy_taiga'],
  [JUNGLE_TEMPLE_POS.x, JUNGLE_TEMPLE_POS.z, 12.0 * 12.0, 'jungle'],
  [PLAINS_VILLAGE_POS.x, PLAINS_VILLAGE_POS.z, 16.0 * 16.0, 'plains'],
  [RUINED_PORTAL_POS.x, RUINED_PORTAL_POS.z, 12.0 * 12.0, 'plains'],
  [SUNFLOWER_VILLAGE_POS.x, SUNFLOWER_VILLAGE_POS.z, 16.0 * 16.0, 'sunflower_plains'],
  [MEADOW_OUTPOST_POS.x, MEADOW_OUTPOST_POS.z, 14.0 * 14.0, 'meadow'],
  [CHERRY_GROVE_POS.x, CHERRY_GROVE_POS.z, 28.0 * 28.0, 'cherry_grove'],
  [ICE_SPIKES_POS.x, ICE_SPIKES_POS.z, 34.0 * 34.0, 'ice_spikes'],
  [GROVE_OUTPOST_POS.x, GROVE_OUTPOST_POS.z, 15.0 * 15.0, 'grove'],
  [SNOWY_PLAINS_OUTPOST_POS.x, SNOWY_PLAINS_OUTPOST_POS.z, 15.0 * 15.0, 'snowy_plains'],
  [SNOWY_SLOPES_IGLOO_POS.x, SNOWY_SLOPES_IGLOO_POS.z, 15.0 * 15.0, 'snowy_slopes'],
  [JAGGED_PEAKS_POS.x, JAGGED_PEAKS_POS.z, 26.0 * 26.0, 'jagged_peaks'],
  [FROZEN_PEAKS_POS.x, FROZEN_PEAKS_POS.z, 26.0 * 26.0, 'frozen_peaks'],
  [STONY_PEAKS_POS.x, STONY_PEAKS_POS.z, 26.0 * 26.0, 'stony_peaks'],
  [MUSHROOM_FIELDS_POS.x, MUSHROOM_FIELDS_POS.z, 68.0 * 68.0, 'mushroom_fields'],
  [DESERT_PYRAMID_POS.x, DESERT_PYRAMID_POS.z, 30.0 * 30.0, 'desert'],
  [DESERT_VILLAGE_POS.x, DESERT_VILLAGE_POS.z, 30.0 * 30.0, 'desert'],
  [DESERT_WELL_POS.x, DESERT_WELL_POS.z, 18.0 * 18.0, 'desert'],
  [DESERT_OUTPOST_POS.x, DESERT_OUTPOST_POS.z, 20.0 * 20.0, 'desert'],
  [SAVANNA_VILLAGE_POS.x, SAVANNA_VILLAGE_POS.z, 26.0 * 26.0, 'savanna'],
  [SAVANNA_OUTPOST_POS.x, SAVANNA_OUTPOST_POS.z, 20.0 * 20.0, 'savanna'],
  [SAVANNA_PLATEAU_POS.x, SAVANNA_PLATEAU_POS.z, 62.0 * 62.0, 'savanna_plateau'],
  [WINDSWEPT_SAVANNA_POS.x, WINDSWEPT_SAVANNA_POS.z, 64.0 * 64.0, 'windswept_savanna'],
  [WOODED_BADLANDS_POS.x, WOODED_BADLANDS_POS.z, 64.0 * 64.0, 'wooded_badlands'],
  [ERODED_BADLANDS_POS.x, ERODED_BADLANDS_POS.z, 66.0 * 66.0, 'eroded_badlands'],
  [BADLANDS_MINESHAFT_POS.x, BADLANDS_MINESHAFT_POS.z, 28.0 * 28.0, 'badlands'],
  [SWAMP_HUT_POS.x, SWAMP_HUT_POS.z, 26.0 * 26.0, 'swamp'],
  [MANGROVE_SWAMP_POS.x, MANGROVE_SWAMP_POS.z, 76.0 * 76.0, 'mangrove_swamp'],
];

/**
 * Carves Dragon Valley into the mountain: a broad recessed floor, sheer natural
 * cliff walls, an outer mountain shoulder and a single descending pass toward
 * the hill house. Applied after the flat pads so the valley is real terrain,
 * not a platform sitting on top of it.
 */
function carveDragonValley(x: number, z: number, height: number): number {
  const dx = x - DRAGON_VALLEY_POS.x;
  const dz = z - DRAGON_VALLEY_POS.z;
  const distance = Math.hypot(dx, dz);
  if (distance > 88) return height;
  const angle = Math.atan2(dz, dx);
  const passAngle = Math.atan2(
    HILL_HOUSE_POS.z - DRAGON_VALLEY_POS.z,
    HILL_HOUSE_POS.x - DRAGON_VALLEY_POS.x,
  );
  let delta = angle - passAngle;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  const pass = (1 - smoothstep(0.1, 0.28, Math.abs(delta))) *
    (1 - smoothstep(60, 82, distance));

  const floor = 7.25 +
    Math.sin(x * 0.19 + z * 0.07) * 0.22 +
    Math.cos(z * 0.23 - x * 0.05) * 0.18;
  const ridge =
    Math.sin(angle * 5 + 0.7) * 3.2 +
    Math.sin(angle * 9 - 1.4) * 1.7 +
    fbm(x * 0.05 + 7.1, z * 0.05 + 4.3, 3) * 5.0;
  const wallTop = floor + 24.5 + ridge;
  let target: number;
  if (distance < 21) {
    target = floor;
  } else if (distance < 34) {
    const t = smoothstep(21, 34, distance);
    target = floor + Math.pow(t, 1.55) * (wallTop - floor);
  } else {
    target = wallTop + (height - wallTop) * smoothstep(34, 76, distance);
  }
  // A single pass through the rim gives the valley a walk-in entrance without
  // breaking the continuous cliff line everywhere else.
  target = target * (1 - pass * 0.94) + (floor + 1.4) * (pass * 0.94);

  // The hill house and its east access ramp share this side of the mountain.
  // Preserve the existing flat pad/ramp instead of letting the new rim bury it.
  const padX = Math.max(0, HILL_HOUSE_POS.x - 8.8 - x, x - (HILL_HOUSE_POS.x + 22));
  const padZ = Math.max(0, HILL_HOUSE_POS.z - 7.8 - z, z - (HILL_HOUSE_POS.z + 11.5));
  const padProtect = 1 - smoothstep(0, 4.5, Math.hypot(padX, padZ));
  target = target * (1 - padProtect) + height * padProtect;

  // The garage apron sits on the same mountain shoulder. Keep its bays and
  // forecourt level while the rim closes around the outside of the property.
  const garageX = Math.max(
    0,
    VEHICLE_GARAGE_POS.x - 11 - x,
    x - (VEHICLE_GARAGE_POS.x + 11),
  );
  const garageZ = Math.max(
    0,
    VEHICLE_GARAGE_POS.z - 11 - z,
    z - (VEHICLE_GARAGE_POS.z + 11),
  );
  const garageProtect = 1 - smoothstep(0, 5, Math.hypot(garageX, garageZ));
  target = target * (1 - garageProtect) + height * garageProtect;

  const outerBlend = 1 - smoothstep(74, 88, distance);
  return height * (1 - outerBlend) + target * outerBlend;
}

export function getBaseTerrainHeight(x: number, z: number): number {
  if (activeTerrainWorldType === 'flat') return FLAT_GROUND_Y;
  const louisianaHeight = getLouisianaBaseHeight(x, z);
  if (louisianaHeight !== null) return louisianaHeight;
  const r = Math.hypot(x, z);
  const angle = Math.atan2(z, x);

  // Organic coastline radius variation (740m Grand Finale Island expanded once for each Grand Finale biome)
  const coastWarp =
    56 * (fbm(Math.cos(angle) * 1.4 + 3.1, Math.sin(angle) * 1.4 + 7.4, 3) - 0.5);
  const islandRadius = 740 + coastWarp;

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
  let dx = x - JAGGED_PEAKS_POS.x;
  let dz = z - JAGGED_PEAKS_POS.z;
  let dSq = dx * dx + dz * dz;
  if (dSq < 3025) {
    const jp = 1 - smoothstep(12, 55, Math.sqrt(dSq));
    h += jp * (11.0 + Math.abs(Math.sin(x * 0.09) * Math.cos(z * 0.09)) * 7.0);
  }
  dx = x - FROZEN_PEAKS_POS.x;
  dz = z - FROZEN_PEAKS_POS.z;
  dSq = dx * dx + dz * dz;
  if (dSq < 2704) {
    const fp = 1 - smoothstep(12, 52, Math.sqrt(dSq));
    h += fp * (9.5 + ridgeDetail * 6.5);
  }
  // Eastern Stony Peaks Calcite Ridge
  dx = x - STONY_PEAKS_POS.x;
  dz = z - STONY_PEAKS_POS.z;
  dSq = dx * dx + dz * dz;
  if (dSq < 2916) {
    const sp = 1 - smoothstep(12, 54, Math.sqrt(dSq));
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
  dx = x - MEADOW_OUTPOST_POS.x;
  dz = z - MEADOW_OUTPOST_POS.z;
  dSq = dx * dx + dz * dz;
  if (dSq < 1764) {
    const mp = 1 - smoothstep(18, 42, Math.sqrt(dSq));
    h = h * (1 - mp * 0.55) + 8.8 * (mp * 0.55);
  }
  // Scenic Cherry Grove highland terrace
  dx = x - CHERRY_GROVE_POS.x;
  dz = z - CHERRY_GROVE_POS.z;
  dSq = dx * dx + dz * dz;
  if (dSq < 1764) {
    const cp = 1 - smoothstep(18, 42, Math.sqrt(dSq));
    h = h * (1 - cp * 0.6) + 7.6 * (cp * 0.6);
  }
  // Flatten Arctic Snowy Plains & Ice Spikes basin in far NW
  dx = x - ICE_SPIKES_POS.x;
  dz = z - ICE_SPIKES_POS.z;
  dSq = dx * dx + dz * dz;
  if (dSq < 2304) {
    const ip = 1 - smoothstep(18, 48, Math.sqrt(dSq));
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
  dx = x - SAVANNA_PLATEAU_POS.x;
  dz = z - SAVANNA_PLATEAU_POS.z;
  dSq = dx * dx + dz * dz;
  if (dSq < 5184) {
    const sp = 1 - smoothstep(38, 72, Math.sqrt(dSq));
    h = h * (1 - sp * 0.8) + 12.6 * (sp * 0.8);
  }
  // 3. Windswept Savanna shattered stone crags
  dx = x - WINDSWEPT_SAVANNA_POS.x;
  dz = z - WINDSWEPT_SAVANNA_POS.z;
  dSq = dx * dx + dz * dz;
  if (dSq < 4624) {
    const ws = 1 - smoothstep(18, 68, Math.sqrt(dSq));
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
  dx = x - WOODED_BADLANDS_POS.x;
  dz = z - WOODED_BADLANDS_POS.z;
  dSq = dx * dx + dz * dz;
  if (dSq < 4624) {
    const wb = 1 - smoothstep(34, 68, Math.sqrt(dSq));
    h = h * (1 - wb * 0.78) + 13.5 * (wb * 0.78);
  }
  // 5. Swamp & Mangrove Swamp low misty wetland basins (East outer ring)
  dx = x - SWAMP_HUT_POS.x;
  dz = z - SWAMP_HUT_POS.z;
  dSq = dx * dx + dz * dz;
  if (dSq < 6724) {
    const sw = 1 - smoothstep(45, 82, Math.sqrt(dSq));
    h = h * (1 - sw * 0.72) + 2.15 * (sw * 0.72);
  }
  dx = x - MANGROVE_SWAMP_POS.x;
  dz = z - MANGROVE_SWAMP_POS.z;
  dSq = dx * dx + dz * dz;
  if (dSq < 6724) {
    const mg = 1 - smoothstep(45, 82, Math.sqrt(dSq));
    h = h * (1 - mg * 0.72) + 2.05 * (mg * 0.72);
  }
  // 6. Mushroom Fields scenic elevated mycelium peninsula (Far NE)
  dx = x - MUSHROOM_FIELDS_POS.x;
  dz = z - MUSHROOM_FIELDS_POS.z;
  dSq = dx * dx + dz * dz;
  if (dSq < 7225) {
    const mf = 1 - smoothstep(48, 85, Math.sqrt(dSq));
    h = h * (1 - mf * 0.72) + 6.8 * (mf * 0.72);
  }
  // 7. Carve Frozen River channel in far NW
  const frozenRiver = getFrozenRiverSample(x, z);
  if (frozenRiver.dist < 11.5) {
    const fBlend = 1 - smoothstep(4.5, 11.5, frozenRiver.dist);
    h = h * (1 - fBlend) + Math.max(0.15, frozenRiver.waterY) * fBlend;
  }

  // Waterfall cliff shelf around WATERFALL_POS
  dx = x - WATERFALL_POS.x;
  dz = z - WATERFALL_POS.z;
  dSq = dx * dx + dz * dz;
  if (dSq < 324) {
    const northSlope = smoothstep(WATERFALL_POS.z + 3, WATERFALL_POS.z - 6, z);
    const shelf = 2.6 + northSlope * 11.5;
    const blend = 1 - smoothstep(9, 18, Math.sqrt(dSq));
    h = h * (1 - blend) + shelf * blend;
  }

  // Flatten Mountain Cavern Entrance terrace around CAVE_POS
  dx = x - CAVE_POS.x;
  dz = z - CAVE_POS.z;
  dSq = dx * dx + dz * dz;
  if (dSq < 256) {
    const blend = 1 - smoothstep(8, 16, Math.sqrt(dSq));
    h = h * (1 - blend) + 7.4 * blend;
  }

  // Flatten Abandoned Expedition clearing around EXPEDITION_POS
  dx = x - EXPEDITION_POS.x;
  dz = z - EXPEDITION_POS.z;
  dSq = dx * dx + dz * dz;
  if (dSq < 324) {
    const blend = 1 - smoothstep(9, 18, Math.sqrt(dSq));
    h = h * (1 - blend) + 4.3 * blend;
  }

  // Flatten gentle landing beach around spawn
  dx = x - PLAYER_SPAWN.x;
  dz = z - PLAYER_SPAWN.z;
  dSq = dx * dx + dz * dz;
  if (dSq < 324) {
    const blend = 1 - smoothstep(8, 18, Math.sqrt(dSq));
    h = h * (1 - blend) + 1.45 * blend;
  }

  // Carve Azure Lake basin at LAKE_CENTER
  dx = x - LAKE_CENTER.x;
  dz = z - LAKE_CENTER.z;
  dSq = dx * dx + dz * dz;
  const lakeOuter = LAKE_CENTER.radius + 7;
  if (dSq < lakeOuter * lakeOuter) {
    const lakeDepth = 1 - smoothstep(LAKE_CENTER.radius - 3, lakeOuter, Math.sqrt(dSq));
    h = h * (1 - lakeDepth) + 1.1 * lakeDepth;
  }

  // Carve Crystal River + Western/Eastern/Southern Rapids River channels
  if (z > WATERFALL_POS.z + 2 || Math.abs(x) > 120) {
    const river = getRiverSample(x, z);
    if (river.dist < 10.5) {
      const channelBlend = 1 - smoothstep(3.4, 10.5, river.dist);
      const targetBed = river.waterY - 1.25;
      h = h * (1 - channelBlend) + targetBed * channelBlend;
    }
  }

  // Smooth Homestead Barnyard, Sunlit Grassy Pasture & Dusty Paddock terrace
  dx = x - HOMESTEAD_POS.x;
  dz = z - HOMESTEAD_POS.z;
  dSq = dx * dx + dz * dz;
  if (dSq < 576) {
    const blend = 1 - smoothstep(13, 24, Math.sqrt(dSq));
    h = h * (1 - blend) + 3.15 * blend;
  }

  // Carve shallow muddy farm pond beside the homestead barnyard
  dx = x - FARM_POND_POS.x;
  dz = z - FARM_POND_POS.z;
  dSq = dx * dx + dz * dz;
  const pondOuter = FARM_POND_POS.radius + 2.4;
  if (dSq < pondOuter * pondOuter) {
    const pondDepth = 1 - smoothstep(FARM_POND_POS.radius - 1.8, pondOuter, Math.sqrt(dSq));
    h = h * (1 - pondDepth) + 2.35 * pondDepth;
  }

  // Smooth Snowy Highland Woodland plateau for Timber Wolves
  dx = x - SNOWY_WOODLAND_POS.x;
  dz = z - SNOWY_WOODLAND_POS.z;
  dSq = dx * dx + dz * dz;
  if (dSq < 324) {
    const snowBlend = 1 - smoothstep(9, 18, Math.sqrt(dSq));
    h = h * (1 - snowBlend) + 12.2 * snowBlend;
  }

  // Smooth Autumn Forest clearing for Red Fox undergrowth
  dx = x - AUTUMN_GROVE_POS.x;
  dz = z - AUTUMN_GROVE_POS.z;
  dSq = dx * dx + dz * dz;
  if (dSq < 196) {
    const autumnBlend = 1 - smoothstep(7, 14, Math.sqrt(dSq));
    h = h * (1 - autumnBlend) + 3.25 * autumnBlend;
  }

  // Carve shallow Murky Jungle Swamp lagoon for Saltwater Crocodile
  dx = x - SWAMP_POS.x;
  dz = z - SWAMP_POS.z;
  dSq = dx * dx + dz * dz;
  const swampOuter = SWAMP_POS.radius + 4.0;
  if (dSq < swampOuter * swampOuter) {
    const swampBlend = 1 - smoothstep(SWAMP_POS.radius - 2.5, swampOuter, Math.sqrt(dSq));
    h = h * (1 - swampBlend) + 0.85 * swampBlend;
  }

  // Smooth flat meadow terrace for Golden Wheatfield & Farmer Garden Market
  dx = x - WHEATFIELD_POS.x;
  dz = z - WHEATFIELD_POS.z;
  dSq = dx * dx + dz * dz;
  if (dSq < 210.25) {
    const wBlend = 1 - smoothstep(8.5, 14.5, Math.sqrt(dSq));
    h = h * (1 - wBlend) + 3.15 * wBlend;
  }
  dx = x - FARMER_POS.x;
  dz = z - FARMER_POS.z;
  dSq = dx * dx + dz * dz;
  if (dSq < 182.25) {
    const fBlend = 1 - smoothstep(7.5, 13.5, Math.sqrt(dSq));
    h = h * (1 - fBlend) + 3.15 * fBlend;
  }

  // Expanded 3-Bay Custom Vehicle Garage clearing & wide driveways (skip when outside garage zone)
  if (x >= -90 && x <= 10 && z >= 128 && z <= 200) {
    const gdx = Math.max(0, Math.abs(x - VEHICLE_GARAGE_POS.x) - 11.2);
    const gdz = Math.max(0, Math.abs(z - VEHICLE_GARAGE_POS.z) - 6.8);
    const gDistSq = gdx * gdx + gdz * gdz;
    if (gDistSq < 30.25) {
      const garageBlend = 1 - smoothstep(1.2, 5.5, Math.sqrt(gDistSq));
      h = h * (1 - garageBlend) + VEHICLE_GARAGE_Y * garageBlend;
    }

    const mainDrive = distSqToSegment(
      x,
      z,
      VEHICLE_GARAGE_POS.x + 2,
      VEHICLE_GARAGE_POS.z + 6.5,
      -4,
      174,
    );
    if (mainDrive.distSq < 40.96) {
      const dBlend = 1 - smoothstep(3.0, 6.4, Math.sqrt(mainDrive.distSq));
      const targetDriveH = VEHICLE_GARAGE_Y * (1 - mainDrive.t) + 1.85 * mainDrive.t;
      h = h * (1 - dBlend * 0.85) + targetDriveH * (dBlend * 0.85);
    }

    const westDrive = distSqToSegment(
      x,
      z,
      VEHICLE_GARAGE_POS.x - 6,
      VEHICLE_GARAGE_POS.z + 6.5,
      -78,
      184,
    );
    if (westDrive.distSq < 33.64) {
      const wBlend = 1 - smoothstep(2.6, 5.8, Math.sqrt(westDrive.distSq));
      const targetWestH = VEHICLE_GARAGE_Y * (1 - westDrive.t) + 1.55 * westDrive.t;
      h = h * (1 - wBlend * 0.82) + targetWestH * (wBlend * 0.82);
    }

    const eastDrive = distSqToSegment(
      x,
      z,
      VEHICLE_GARAGE_POS.x + 10.5,
      VEHICLE_GARAGE_POS.z + 1.5,
      -6,
      138,
    );
    if (eastDrive.distSq < 29.16) {
      const eBlend = 1 - smoothstep(2.4, 5.4, Math.sqrt(eastDrive.distSq));
      const targetEastH = VEHICLE_GARAGE_Y * (1 - eastDrive.t) + 2.85 * eastDrive.t;
      h = h * (1 - eBlend * 0.8) + targetEastH * (eBlend * 0.8);
    }
  }

  // Scenic Hilltop Plateau + gentle East Access Ramp
  const hdxBox = Math.max(
    0,
    Math.max(HILL_HOUSE_POS.x - 6.6 - x, x - (HILL_HOUSE_POS.x + 7.4)),
  );
  const hdzBox = Math.max(
    0,
    Math.max(HILL_HOUSE_POS.z - 5.6 - z, z - (HILL_HOUSE_POS.z + 9.8)),
  );
  const houseDistSq = hdxBox * hdxBox + hdzBox * hdzBox;
  if (houseDistSq < 29.16) {
    const houseBlend = 1 - smoothstep(0.6, 5.4, Math.sqrt(houseDistSq));
    h = h * (1 - houseBlend) + HILL_HOUSE_Y * houseBlend;
  }
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

  // Flatten foundation terraces using zero-allocation static lookup table
  for (let i = 0; i < FLAT_PADS.length; i++) {
    const p = FLAT_PADS[i];
    const pdx = x - p[0];
    const pdz = z - p[1];
    const pdSq = pdx * pdx + pdz * pdz;
    if (pdSq < p[4]) {
      const blend = 1 - smoothstep(p[2], p[3], Math.sqrt(pdSq));
      h = h * (1 - blend) + p[5] * blend;
    }
  }

  h = carveDragonValley(x, z, h);

  return h;
}

export function getBiomeAt(x: number, z: number): BiomeId {
  if (activeTerrainWorldType === 'flat') return 'grassland';
  const edx = x - EXPEDITION_POS.x;
  const edz = z - EXPEDITION_POS.z;
  if (edx * edx + edz * edz < 196) return 'expedition';

  const cdx = x - CAVE_POS.x;
  const cdz = z - CAVE_POS.z;
  if (cdx * cdx + cdz * cdz < 121) return 'cave';

  const h = getTerrainHeight(x, z);
  if (isInLouisianaBounds(x, z)) {
    if (h < OCEAN_LEVEL - 0.15) return 'warm_ocean';
    const louisianaBiome = getLouisianaBiome(x, z);
    if (louisianaBiome === 'lake') return 'lake';
    if (louisianaBiome === 'river') return 'river';
    if (louisianaBiome === 'swamp') return 'swamp';
    if (louisianaBiome === 'beach') return 'beach';
    if (louisianaBiome === 'forest') return 'forest';
    return 'plains';
  }
  const ldx = x - LAKE_CENTER.x;
  const ldz = z - LAKE_CENTER.z;
  const lakeLim = LAKE_CENTER.radius + 2.5;
  if (ldx * ldx + ldz * ldz < lakeLim * lakeLim) return 'lake';

  const river = getRiverSample(x, z);
  if (river.dist < 7.5 && river.waterY > 0.15) return 'river';

  const frozenRiver = getFrozenRiverSample(x, z);
  if (frozenRiver.dist < 8.5) return 'frozen_river';

  // 5 Distinct Ocean Zones around the 740m coastline
  if (h < OCEAN_LEVEL - 0.15) {
    if (z < -340) return 'frozen_ocean';
    if (z < -60) return 'cold_ocean';
    const rDistSq = x * x + z * z;
    if (z >= 260 && x > -200 && rDistSq < 705600) return 'warm_ocean';
    if (z >= -60 && z < 260 && rDistSq < 705600) return 'lukewarm_ocean';
    return 'ocean';
  }

  // Grand Finale Pack Outer Biomes
  let bdx = x - DRAGON_VALLEY_POS.x;
  let bdz = z - DRAGON_VALLEY_POS.z;
  if (bdx * bdx + bdz * bdz < DRAGON_VALLEY_BIOME_RADIUS * DRAGON_VALLEY_BIOME_RADIUS)
    return 'dragon_valley';
  bdx = x - VIKING_VILLAGE_POS.x;
  bdz = z - VIKING_VILLAGE_POS.z;
  if (bdx * bdx + bdz * bdz < 7744) return 'viking_village';
  bdx = x - RESORT_CORNER_POS.x;
  bdz = z - RESORT_CORNER_POS.z;
  if (bdx * bdx + bdz * bdz < 8836) return 'resort_corner';
  bdx = x - RUINED_CASTLE_POS.x;
  bdz = z - RUINED_CASTLE_POS.z;
  if (bdx * bdx + bdz * bdz < 9216) return 'ruined_castle';

  // 3 Coastal Shore Biomes (Snowy Beach, Stony Shore, Sandy Beach)
  if (h < 2.25) {
    if (z < -200) return 'snowy_beach';
    if (Math.abs(x) > 520 && z >= -200 && z < 110) return 'stony_shore';
    return 'beach';
  }

  // Anchor biome structure zones cleanly inside their home biome
  for (let i = 0; i < BIOME_ANCHOR_CIRCLES.length; i++) {
    const c = BIOME_ANCHOR_CIRCLES[i];
    const adx = x - c[0];
    const adz = z - c[1];
    if (adx * adx + adz * adz < c[2]) {
      return c[3];
    }
  }

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
