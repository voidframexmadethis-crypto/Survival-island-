import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createRealisticDragon, type DragonVariant } from './dragonModels';
import { ResourceNodeKind, ResourceNodeState } from '../types';
import { FrameBudgetQueue } from '../systems/frameBudgetQueue';
import { WorldChunk, WorldChunkManager } from './worldChunkSystem';
import { buildLouisianaMainland, type LouisianaMainlandHandles } from './louisianaMainland';
import { buildLouisianaBusinesses } from './louisianaBusinesses';
import { buildLouisianaNeighborhoods } from './louisianaNeighborhoods';
import { buildIslandFerryDock } from './ferryDock';
import { buildTransitCauseway } from './transitCauseway';
import {
  buildLouisianaWaterMeshes,
  createLouisianaTerrainGeometries,
} from './louisianaLandmass';
import { buildLouisianaWilds } from './louisianaWilds';
import { buildDragonValleyCliffRing } from './dragonValleyCliffs';
import { roundedBox } from './roundedBox';
import {
  CaveTerrainOpening,
  filterTerrainIndexForCaveOpenings,
} from './caveTerrainOpenings';
import {
  ALL_FLOWING_RIVERS,
  AUTUMN_GROVE_POS,
  BADLANDS_MINESHAFT_POS,
  BIOME_CABIN_DEFS,
  BURIED_TREASURE_POS,
  CAVE_POS,
  CHERRY_GROVE_POS,
  CORAL_REEF_POS,
  DEAD_OAK_POS,
  DESERT_FOSSIL_POS,
  DESERT_OUTPOST_POS,
  DESERT_PYRAMID_POS,
  DESERT_VILLAGE_POS,
  DESERT_WELL_POS,
  DRAGON_VALLEY_POS,
  DRAGON_VALLEY_ABANDONED_POS,
  ERODED_BADLANDS_POS,
  EXPEDITION_POS,
  FARMER_POS,
  FARM_POND_POS,
  FROZEN_OCEAN_ICEBERG_POS,
  FROZEN_PEAKS_POS,
  GROVE_OUTPOST_POS,
  HILL_HOUSE_POS,
  HILL_HOUSE_Y,
  HOMESTEAD_POS,
  ICE_SPIKES_POS,
  JAGGED_PEAKS_POS,
  JUNGLE_TEMPLE_POS,
  LAKE_CENTER,
  MANGROVE_SWAMP_POS,
  MEADOW_OUTPOST_POS,
  MUSHROOM_FIELDS_POS,
  OCEAN_LEVEL,
  OCEAN_MONUMENT_POS,
  PILLAGER_OUTPOST_POS,
  PLAINS_VILLAGE_POS,
  PLAYER_SPAWN,
  RESORT_CORNER_POS,
  RUINED_CASTLE_POS,
  VIKING_VILLAGE_POS,
  RIVER_POINTS,
  RUINED_PORTAL_POS,
  SAVANNA_OUTPOST_POS,
  SAVANNA_PLATEAU_POS,
  SAVANNA_VILLAGE_POS,
  SHIPWRECK_POS,
  SNOWY_IGLOO_POS,
  SNOWY_PLAINS_OUTPOST_POS,
  SNOWY_SLOPES_IGLOO_POS,
  SNOWY_VILLAGE_POS,
  SNOWY_WOODLAND_POS,
  STONY_PEAKS_POS,
  SUNFLOWER_VILLAGE_POS,
  SWAMP_FOSSIL_POS,
  SWAMP_HUT_POS,
  SWAMP_POS,
  TAIGA_VILLAGE_POS,
  TERRAIN_SEGS,
  TERRAIN_SIZE,
  TRAIL_RUINS_POS,
  TRIAL_CHAMBERS_POS,
  ISLAND_UFO_POS,
  SATURN_ROCKET_POS,
  UNDERGROUND_ELEVATOR_POS,
  VEHICLE_GARAGE_POS,
  VEHICLE_GARAGE_Y,
  WATERFALL_POS,
  WHEATFIELD_POS,
  WINDSWEPT_SAVANNA_POS,
  WOODED_BADLANDS_POS,
  WOODLAND_MANSION_POS,
  getBiomeAt,
  getRiverSample,
  getTerrainHeight,
  getTerrainSlope,
} from './terrain';
import {
  SaturnVRocketHandles,
  buildAlienUfoMesh,
  buildSaturnVRocket,
} from './saturnRocketModel';
import {
  UndergroundElevatorHandles,
  buildUndergroundCarElevator,
} from './undergroundElevatorModel';
import {
  createBarkNormalTexture,
  createBarkTexture,
  createGroundDetailTexture,
  createGroundNormalTexture,
  createGroundRoughnessTexture,
  createHayTexture,
  createLeafCanopyTexture,
  createLeafNormalTexture,
  createLeafSprayTexture,
  createPalmBarkNormalTexture,
  createPalmBarkTexture,
  createPalmFrondTexture,
  createRealisticSurfaceMaterial,
  createRockNormalTexture,
  createRockRoughnessTexture,
  createRockTexture,
  createWaterNormalTexture,
  createWoodPlankNormalTexture,
  createWoodPlankTexture,
  getPolishedConcretePbr,
} from './textures';
import {
  HouseStationTarget,
  createCave,
  createCaveCeilingClusterMesh,
  createFarmerNpcModel,
  createFerryWorkerNpcModel,
  createHilltopHouse,
} from './models';
import {
  applySafeStandardMaps,
  enhanceSurfaceMaterial,
  ensureGeometryHasUv,
} from './shaders';
import {
  GRASS_VARIANTS,
  GrassVariant,
  createCurvedBladeGeometry,
  createGrassVariantGeometry,
  createPalmBootGeometry,
  createPalmFrondGeometries,
  createPalmTrunkSegmentGeometry,
} from './vegetation';

export interface CaveCeilingCluster {
  id: string;
  x: number;
  y: number;
  z: number;
  groundY: number;
  hp: number;
  maxHp: number;
  radius: number;
  collapsed: boolean;
  falling: boolean;
  velY: number;
  mesh: THREE.Group;
}

export interface ResourceVisualHandle {
  root: THREE.Group;
  felledPivot?: THREE.Group;
  stumpMesh?: THREE.Group;
  trunkCutBand?: THREE.Mesh;
  crackMeshes?: THREE.Mesh[];
  rockBody?: THREE.Group;
}

export interface ShipwreckChestHandle {
  id: string;
  name: string;
  sublabel: string;
  zone: 'cargo' | 'armory' | 'captain' | 'deck';
  x: number;
  y: number;
  z: number;
  group: THREE.Group;
  lidGroup: THREE.Group;
  glowMesh: THREE.Mesh;
}

export interface DragonValleyFlyerHandle {
  group: THREE.Group;
  wingL: THREE.Group;
  wingR: THREE.Group;
  centerX: number;
  centerZ: number;
  radius: number;
  height: number;
  speed: number;
  phase: number;
  visibilityRange: number;
  variant: DragonVariant;
}

export interface DragonValleyBeaconHandle {
  group: THREE.Group;
  beamMat: THREE.MeshBasicMaterial;
  coreMat: THREE.MeshBasicMaterial;
  ring: THREE.Mesh;
}

export interface WorldHandles {
  terrainMesh: THREE.Mesh;
  baseTerrainColors: Float32Array;
  oceanMesh: THREE.Mesh;
  lakeMesh: THREE.Mesh;
  waterfallStreams: THREE.Mesh[];
  waterfallShaderMat?: THREE.ShaderMaterial;
  waterfallFoam: THREE.Mesh;
  cloudsGroup: THREE.Group;
  woodTex: THREE.CanvasTexture;
  resourceNodes: ResourceNodeState[];
  resourceMeshes: Map<string, THREE.Object3D>;
  resourceHandles: Map<string, ResourceVisualHandle>;
  colliders: { x: number; z: number; radius: number; nodeId?: string }[];
  expeditionJournalPos: THREE.Vector3;
  farmerNpcPos: THREE.Vector3;
  farmerNpcGroup: THREE.Group;
  farmerHead: THREE.Group;
  farmerArmR: THREE.Group;
  ferryWorkerGroup: THREE.Group;
  ferryWorkerHead: THREE.Group;
  ferryWorkerArmL: THREE.Group;
  ferryWorkerArmR: THREE.Group;
  ferryWorkerLegL: THREE.Group;
  ferryWorkerLegR: THREE.Group;
  ferryCallPos: THREE.Vector3;
  ferryDockPos: THREE.Vector3;
  ferryBoatPos: THREE.Vector3;
  soilPlots: { x: number; y: number; z: number }[];
  houseStations: HouseStationTarget[];
  tvScreenMat: THREE.MeshStandardMaterial;
  tvScreenMesh: THREE.Mesh;
  tvWorldPos: THREE.Vector3;
  hillHousePos: THREE.Vector3;
  hillHouseDoor: import('./models').HilltopHouseDoorHandle;
  dragonValleyFlyers: DragonValleyFlyerHandle[];
  dragonValleyBeacon: DragonValleyBeaconHandle;
  abandonedDragonGroup: THREE.Group;
  garagePos: THREE.Vector3;
  garageBenchPos: THREE.Vector3;
  armoryChest: ShipwreckChestHandle;
  wheatfieldPos: THREE.Vector3;
  caveCeilings: CaveCeilingCluster[];
  shipwreckChests: ShipwreckChestHandle[];
  eyeblossomGlowMat: THREE.MeshStandardMaterial;
  saturnRocket: SaturnVRocketHandles;
  undergroundElevator: UndergroundElevatorHandles;
  crescentCity: LouisianaMainlandHandles;
  overworldGroup: THREE.Group;
  worldChunks: WorldChunk[];
  foliageChunks: WorldChunk[];
  largeLandmarkObjs: THREE.Object3D[];
  largeLandmarkEntries: { x: number; z: number; radius: number; obj: THREE.Object3D }[];
  activateInteractiveNode: (nodeId: string) => ResourceVisualHandle | undefined;
  restoreBatchedNode: (nodeId: string) => void;
  setBatchedNodeVisible: (nodeId: string, visible: boolean) => void;
  setWorldShadowCasting: (enabled: boolean) => void;
  /** Ultra preset: maximum texture filtering, richer PBR response and denser grass clumps. */
  setUltraFidelity: (enabled: boolean) => void;
  cullWorldByDistance: (
    px: number,
    pz: number,
    maxDist: number,
    budgetQueue?: FrameBudgetQueue,
    maxActivePointLights?: number,
  ) => void;
  resetTerrainIndex: () => void;
  /** Removes/restores terrain triangles for the currently streamed cave mouths. */
  setCaveOpenings: (openings: readonly CaveTerrainOpening[]) => void;
  dispose: () => void;
}

function seededRand(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function buildIslandWorld(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
): WorldHandles {
  const overworldGroup = new THREE.Group();
  scene.add(overworldGroup);
  const rand = seededRand(42071);

  const groundTex = createGroundDetailTexture(renderer);
  const groundNormalTex = createGroundNormalTexture(renderer);
  const groundRoughnessTex = createGroundRoughnessTexture(renderer);
  const barkTex = createBarkTexture(renderer);
  const barkNormalTex = createBarkNormalTexture(renderer);
  const rockTex = createRockTexture(renderer);
  const rockNormalTex = createRockNormalTexture(renderer);
  const rockRoughnessTex = createRockRoughnessTexture(renderer);
  const leafTex = createLeafCanopyTexture(renderer);
  const leafSprayTex = createLeafSprayTexture(renderer);
  const leafNormalTex = createLeafNormalTexture(renderer);
  const palmBarkTex = createPalmBarkTexture(renderer);
  const palmBarkNormalTex = createPalmBarkNormalTexture(renderer);
  const palmFrondTex = createPalmFrondTexture(renderer);
  const waterNormalTex = createWaterNormalTexture(renderer);
  const woodTex = createWoodPlankTexture(renderer);
  woodTex.userData.sharedAsset = true;
  const woodNormalTex = createWoodPlankNormalTexture(renderer);
  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const rockPbrBundle = createRealisticSurfaceMaterial({
    kind: 'rock',
    repeat: 2,
    roughness: 0.92,
    anisotropy: maxAniso,
  });
  const sandPbrBundle = createRealisticSurfaceMaterial({
    kind: 'sand',
    repeat: 2,
    roughness: 0.94,
    anisotropy: maxAniso,
  });

  // 1. Island Terrain Geometry (vertex colored by biome, slope & forest paths)
  const terrainGeo = new THREE.PlaneGeometry(
    TERRAIN_SIZE,
    TERRAIN_SIZE,
    TERRAIN_SEGS,
    TERRAIN_SEGS,
  );
  terrainGeo.rotateX(-Math.PI / 2);

  const pos = terrainGeo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  // Scratch tints used to blend exposed rock and damp river/lake sediment into
  // the biome palette instead of switching material colour at hard thresholds.
  const cliffStone = new THREE.Color(0x6f6a62);
  const riverMud = new THREE.Color(0x6d5a3d);

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = getTerrainHeight(x, z);
    pos.setY(i, y);

    const biome = getBiomeAt(x, z);
    const slope = getTerrainSlope(x, z);

    // Winding forest path from southern beach -> Lake -> Expedition
    const onBeachPath =
      Math.abs(x - Math.sin(z * 0.032) * 10) < 2.4 && z > 42 && z < 176;
    const onExpPath =
      Math.abs((z - EXPEDITION_POS.z) - (-0.36 * (x - EXPEDITION_POS.x))) < 2.2 &&
      x > LAKE_CENTER.x + 8 &&
      x < EXPEDITION_POS.x;

    const dSnow = Math.hypot(x - SNOWY_WOODLAND_POS.x, z - SNOWY_WOODLAND_POS.z);
    const dAutumn = Math.hypot(x - AUTUMN_GROVE_POS.x, z - AUTUMN_GROVE_POS.z);
    const dSwamp = Math.hypot(x - SWAMP_POS.x, z - SWAMP_POS.z);
    const dWheat = Math.hypot(x - WHEATFIELD_POS.x, z - WHEATFIELD_POS.z);
    const dGarage = Math.hypot(x - VEHICLE_GARAGE_POS.x, z - VEHICLE_GARAGE_POS.z);
    const onHouseRamp =
      x >= HILL_HOUSE_POS.x + 5 &&
      x <= HILL_HOUSE_POS.x + 22 &&
      Math.abs(z - HILL_HOUSE_POS.z) < 2.3;
    const onGaragePadArea =
      Math.abs(x - VEHICLE_GARAGE_POS.x) < 12.6 &&
      Math.abs(z - VEHICLE_GARAGE_POS.z) < 8.4;
    const segDist = (ax: number, az: number, bx: number, bz: number) => {
      const dx = bx - ax;
      const dz = bz - az;
      const lenSq = dx * dx + dz * dz;
      const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / lenSq));
      return Math.hypot(x - (ax + t * dx), z - (az + t * dz));
    };
    const onGarageDriveway =
      segDist(VEHICLE_GARAGE_POS.x + 2, VEHICLE_GARAGE_POS.z + 6.5, -4, 174) < 3.8 ||
      segDist(VEHICLE_GARAGE_POS.x - 6, VEHICLE_GARAGE_POS.z + 6.5, -78, 184) < 3.4 ||
      segDist(VEHICLE_GARAGE_POS.x + 10.5, VEHICLE_GARAGE_POS.z + 1.5, -6, 138) < 3.2;

    if (y < -0.3) {
      if (biome === 'warm_ocean') c.setHex(0xd6c28c); // Bright sandy coral reef bed
      else if (biome === 'lukewarm_ocean') c.setHex(0xb8a982); // Sand seabed
      else if (biome === 'cold_ocean' || biome === 'frozen_ocean') c.setHex(0x646c75); // Gravel seabed
      else c.setHex(0x1e6b7b);
    } else if (dSwamp < SWAMP_POS.radius + 2.2) {
      c.setHex(0x3f4224); // murky swamp mud & moss
    } else if (dSnow < 13.5) {
      c.setHex(dSnow < 10.5 ? 0xdbe4ee : 0x9aa8b8); // snowy woodland floor
    } else if (dAutumn < 11.0) {
      c.setHex(0x8c5228); // warm fallen autumn leaf bed
    } else if (dWheat < 7.8) {
      c.setHex(0x7c5832); // rich cultivated wheatfield loam
    } else if (onGaragePadArea) {
      c.setHex(0x6b6761); // leveled compacted concrete & gravel garage apron
    } else if (onHouseRamp || onGarageDriveway) {
      c.setHex(0xa89274); // wide crushed-gravel driveways & trail connectors
    } else if (biome === 'frozen_river') {
      c.setHex(0xbfe8fc); // Smooth glacial ice surface
    } else if (biome === 'snowy_beach') {
      c.setHex(rand() < 0.72 ? 0xe5edf5 : 0xdccaa4); // Snow-covered sandy shore
    } else if (biome === 'stony_shore') {
      c.setHex(rand() < 0.3 ? 0x7c7a76 : 0x6b6864); // Stone & gravel coastal cliffs
    } else if (biome === 'beach' || y < 2.2) {
      c.setHex(0xe5c88b);
    } else if (biome === 'river' || biome === 'lake') {
      c.setHex(0x8d7255);
    } else if (biome === 'desert') {
      c.setHex(rand() < 0.25 ? 0xdcc082 : 0xe8cc8c); // Sunlit sand & sandstone dunes
    } else if (biome === 'savanna' || biome === 'savanna_plateau') {
      c.setHex(rand() < 0.25 ? 0x9c8e42 : 0xb3a14c); // Dry golden savanna grass
    } else if (biome === 'windswept_savanna') {
      c.setHex(slope > 0.5 ? 0x6e6c68 : rand() < 0.45 ? 0x7a5c3e : 0xa39249); // Shattered stone & coarse dirt
    } else if (biome === 'badlands' || biome === 'eroded_badlands') {
      // Iconic horizontal colored terracotta strata bands + red sand
      const band = Math.floor(Math.abs(y) * 1.15) % 6;
      const strataColors = [0xc95a2b, 0xa83e20, 0xd98a3c, 0x8c3b2b, 0xe0b468, 0xb84a28];
      c.setHex(y < 4.0 ? 0xc2542d : strataColors[band]);
    } else if (biome === 'wooded_badlands') {
      if (y > 11.2) c.setHex(rand() < 0.45 ? 0x75593d : 0x5c7a3b); // Coarse dirt & grass on peaks
      else {
        const band = Math.floor(Math.abs(y) * 1.15) % 5;
        const strataColors = [0xc2542d, 0xa33f22, 0xd4853b, 0x8f432c, 0xc97036];
        c.setHex(strataColors[band]);
      }
    } else if (biome === 'swamp') {
      c.setHex(rand() < 0.3 ? 0x454a36 : 0x4b6334); // Murky swamp grass, clay & mud
    } else if (biome === 'mangrove_swamp') {
      c.setHex(rand() < 0.55 ? 0x3b3533 : 0x3e5932); // Rich dark mud & moss carpets
    } else if (biome === 'mushroom_fields') {
      c.setHex(rand() < 0.22 ? 0x8b739c : 0x74627e); // Iconic purple-grey mycelium
    } else if (biome === 'dragon_valley') {
      c.setHex(rand() < 0.14 ? 0xdc2626 : rand() < 0.5 ? 0x262124 : 0x3b2f2f); // Charred obsidian basalt & magma veins
    } else if (biome === 'viking_village') {
      c.setHex(rand() < 0.3 ? 0x576348 : 0x4b5d3f); // Rugged Nordic highland turf & fjord slate
    } else if (biome === 'resort_corner') {
      c.setHex(rand() < 0.68 ? 0xfef3c7 : 0x5eead4); // Sun-drenched resort sand & lagoon edge
    } else if (biome === 'ruined_castle') {
      c.setHex(rand() < 0.35 ? 0x3f3a4d : 0x4b5563); // Haunted gothic stone & dark moor grass
    } else if (slope > 0.72 || y > 14.5 || biome === 'mountain' || biome === 'cave') {
      c.setHex(y > 16 ? 0x57534e : 0x6b645c);
    } else if (onBeachPath || onExpPath) {
      c.setHex(0x8c7350); // worn dirt forest trail
    } else if (biome === 'grassland') {
      const soilPatch = Math.sin(x * 0.17 + z * 0.13) * Math.cos(x * 0.09 - z * 0.19);
      c.setHex(soilPatch > 0.56 ? 0x665f3f : rand() < 0.36 ? 0x6f7f42 : 0x7d8c4c);
    } else if (biome === 'plains') {
      const soilPatch = Math.sin(x * 0.15 - z * 0.14) * Math.cos(x * 0.11 + z * 0.16);
      c.setHex(soilPatch > 0.58 ? 0x625a3e : rand() < 0.38 ? 0x6c7d45 : 0x7a8b50);
    } else if (biome === 'sunflower_plains') {
      c.setHex(rand() < 0.35 ? 0x738348 : 0x849456);
    } else if (biome === 'meadow') {
      const soilPatch = Math.sin(x * 0.19 + z * 0.11) * Math.cos(x * 0.13 - z * 0.17);
      c.setHex(soilPatch > 0.60 ? 0x5f5a40 : rand() < 0.4 ? 0x5f7c4b : 0x6e8b55);
    } else if (biome === 'cherry_grove') {
      c.setHex(rand() < 0.35 ? 0xf9a8d4 : 0x7c9c63); // Lush grass dusted with fallen pink petals
    } else if (biome === 'snowy_plains' || biome === 'grove' || biome === 'snowy_slopes') {
      c.setHex(0xe8f0f7); // Crisp snow blanket
    } else if (biome === 'ice_spikes') {
      c.setHex(rand() < 0.45 ? 0xbfe7fa : 0xe2f1fb); // Frosted snow & glacial ice sheet
    } else if (biome === 'jagged_peaks') {
      c.setHex(y > 20 ? 0xf1f5f9 : slope > 0.55 ? 0x64748b : 0xdce6f0); // Craggy stone + snow peaks
    } else if (biome === 'frozen_peaks') {
      c.setHex(y > 19 ? 0x93c5fd : 0xe2edf8); // Packed ice & glacial snow
    } else if (biome === 'stony_peaks') {
      // Iconic white Calcite strips winding across rugged grey peak stone
      const calciteBand = Math.abs(Math.sin((x + z) * 0.14 + y * 0.45)) > 0.84;
      c.setHex(calciteBand ? 0xebeae4 : rand() < 0.25 ? 0x78716c : 0x6b6762);
    } else if (biome === 'windswept_hills') {
      c.setHex(slope > 0.55 ? 0x6b7280 : 0x6f7d55); // Stone cliffs & highland grass
    } else if (biome === 'windswept_gravelly_hills') {
      c.setHex(rand() < 0.65 ? 0x878a8f : 0x64686d); // Windswept gravel slopes
    } else if (biome === 'windswept_forest') {
      c.setHex(slope > 0.62 ? 0x64686d : 0x4f6b45); // Highland forest & cliffs
    } else if (biome === 'expedition') {
      c.setHex(0x7c6a46);
    } else if (biome === 'snowy_taiga') {
      c.setHex(0xdfe9f3);
    } else if (biome === 'old_growth_pine_taiga') {
      c.setHex(rand() < 0.58 ? 0x5c3e24 : 0x3b592c); // Podzol + mossy forest floor
    } else if (biome === 'old_growth_spruce_taiga') {
      c.setHex(rand() < 0.48 ? 0x624428 : 0x374c31); // Podzol + boreal moss
    } else if (biome === 'taiga') {
      c.setHex(0x4a6b52);
    } else if (biome === 'dark_forest') {
      c.setHex(rand() < 0.28 ? 0x452f1c : 0x223820); // Shaded dark forest soil & leaf litter
    } else if (biome === 'pale_garden') {
      c.setHex(0x768079); // Pale moss floor
    } else if (biome === 'flower_forest') {
      c.setHex(rand() < 0.35 ? 0x4a822c : 0x5da134);
    } else if (biome === 'birch_forest') {
      c.setHex(rand() < 0.35 ? 0x53842d : 0x689e38);
    } else if (biome === 'old_growth_birch_forest') {
      c.setHex(0x44782b);
    } else if (biome === 'jungle') {
      c.setHex(0x1e5c2a);
    } else if (biome === 'sparse_jungle') {
      const soilPatch = Math.sin(x * 0.16 + z * 0.14) * Math.cos(x * 0.10 - z * 0.18);
      c.setHex(soilPatch > 0.54 ? 0x564c2e : rand() < 0.4 ? 0x4b7e28 : 0x639832);
    } else if (biome === 'bamboo_jungle') {
      c.setHex(rand() < 0.3 ? 0x614326 : 0x4a7f2b); // Jungle soil with Podzol patches
    } else {
      c.setHex(0x2f6b34);
    }

    // Realistic surface blending: steep flank faces expose bedrock gradually,
    // river/lake margins carry damp sediment, and broad tonal variation keeps
    // large biome fields from reading as flat painted colour.
    if (
      y > 0.2 &&
      !onGaragePadArea &&
      !onHouseRamp &&
      !onGarageDriveway &&
      dWheat >= 7.8
    ) {
      const slopeT = Math.max(0, Math.min(1, (slope - 0.72) / 0.55));
      const exposure = slopeT * slopeT * (3 - 2 * slopeT);
      if (
        exposure > 0.01 &&
        biome !== 'badlands' &&
        biome !== 'eroded_badlands' &&
        biome !== 'wooded_badlands'
      ) {
        c.lerp(cliffStone, exposure * 0.55);
      }

      const river = getRiverSample(x, z);
      const riverT = Math.max(0, Math.min(1, (river.dist - 4) / 10));
      const riverBank = 1 - riverT * riverT * (3 - 2 * riverT);
      const lakeDist = Math.hypot(x - LAKE_CENTER.x, z - LAKE_CENTER.z);
      const lakeT = Math.max(
        0,
        Math.min(1, (lakeDist - LAKE_CENTER.radius - 2) / 8),
      );
      const lakeBank = 1 - lakeT * lakeT * (3 - 2 * lakeT);
      const bank = Math.max(riverBank, lakeBank);
      if (bank > 0.01) c.lerp(riverMud, bank * 0.45);

      const tonal =
        Math.sin(x * 0.021 + z * 0.017) * Math.cos(x * 0.013 - z * 0.027);
      c.offsetHSL(0, tonal * 0.018, tonal * 0.028);
    }

    const jitter = (rand() - 0.5) * 0.06;
    colors[i * 3] = Math.max(0, Math.min(1, c.r + jitter));
    colors[i * 3 + 1] = Math.max(0, Math.min(1, c.g + jitter));
    colors[i * 3 + 2] = Math.max(0, Math.min(1, c.b + jitter));
  }

  const baseTerrainColors = new Float32Array(colors);
  terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  terrainGeo.computeVertexNormals();
  terrainGeo.computeBoundingBox();
  terrainGeo.computeBoundingSphere();

  const initialTerrainIndex = terrainGeo.getIndex()?.clone() ?? null;
  const terrainPosition = terrainGeo.getAttribute('position');
  let activeCaveOpenings: CaveTerrainOpening[] = [];
  let caveOpeningSignature = '';

  const applyCaveOpeningsToTerrain = (openings: readonly CaveTerrainOpening[]): void => {
    if (!initialTerrainIndex || !terrainPosition) return;
    const filtered = filterTerrainIndexForCaveOpenings(
      initialTerrainIndex.array,
      terrainPosition,
      openings,
    );
    // Normals are unchanged by removing triangles from a heightfield: the kept
    // faces have exactly the same orientation. Recomputing normals over the whole
    // 65k-vertex terrain on every streaming change was a recurring frame hitch.
    terrainGeo.setIndex(filtered);
    terrainGeo.computeBoundingSphere();
  };

  const resetTerrainIndex = (): void => {
    activeCaveOpenings = [];
    caveOpeningSignature = '';
    if (!initialTerrainIndex) return;
    terrainGeo.setIndex(initialTerrainIndex.clone());
    terrainGeo.computeBoundingSphere();
  };

  const setCaveOpenings = (openings: readonly CaveTerrainOpening[]): void => {
    const next = openings
      .filter(
        (opening) =>
          Number.isFinite(opening.x) &&
          Number.isFinite(opening.z) &&
          Number.isFinite(opening.radius) &&
          opening.radius > 0,
      )
      .map((opening) => ({
        x: opening.x,
        z: opening.z,
        radius: opening.radius,
      }));
    const signature = next
      .map(
        (opening) =>
          `${opening.x.toFixed(2)}:${opening.z.toFixed(2)}:${opening.radius.toFixed(2)}`,
      )
      .sort()
      .join('|');
    if (signature === caveOpeningSignature) return;
    activeCaveOpenings = next;
    caveOpeningSignature = signature;
    applyCaveOpeningsToTerrain(activeCaveOpenings);
  };

  const terrainMat = enhanceSurfaceMaterial(
    applySafeStandardMaps(
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 1.0,
        metalness: 0.0,
      }),
      {
        map: groundTex,
        normalMap: groundNormalTex,
        roughnessMap: groundRoughnessTex,
      },
    ),
    'terrain',
  );
  terrainMat.normalScale.set(1.0, 1.0);
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.castShadow = false;
  terrainMesh.receiveShadow = true;
  terrainMesh.userData.noShadowCast = true;
  terrainMesh.userData.preserveShadowFlags = true;
  overworldGroup.add(terrainMesh);

  // 2. Ocean Water Plane
  const oceanGeo = new THREE.PlaneGeometry(780, 780, 24, 24);
  oceanGeo.rotateX(-Math.PI / 2);
  const oceanMat = new THREE.MeshStandardMaterial({
    color: 0x0b7285,
    normalMap: waterNormalTex,
    normalScale: new THREE.Vector2(0.45, 0.45),
    roughness: 0.16,
    metalness: 0.25,
    transparent: true,
    opacity: 0.88,
  });
  const oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
  oceanMesh.position.y = OCEAN_LEVEL;
  oceanMesh.receiveShadow = true;
  oceanMesh.userData.noShadowCast = true;
  oceanMesh.userData.preserveEnvMapIntensity = true;
  overworldGroup.add(oceanMesh);

  // 3. Azure Lake & Crystal River Freshwater Planes
  const lakeGeo = new THREE.CircleGeometry(LAKE_CENTER.radius + 2.5, 32);
  lakeGeo.rotateX(-Math.PI / 2);
  const freshwaterMat = new THREE.MeshStandardMaterial({
    color: 0x14b8a6,
    normalMap: waterNormalTex,
    normalScale: new THREE.Vector2(0.3, 0.3),
    roughness: 0.12,
    metalness: 0.18,
    transparent: true,
    opacity: 0.82,
  });
  const lakeMesh = new THREE.Mesh(lakeGeo, freshwaterMat);
  lakeMesh.position.set(LAKE_CENTER.x, LAKE_CENTER.waterY, LAKE_CENTER.z);
  lakeMesh.userData.noShadowCast = true;
  lakeMesh.userData.preserveEnvMapIntensity = true;
  overworldGroup.add(lakeMesh);

  // Separated Louisiana landmass: its own terrain chunks, waterways and wild
  // cypress marsh. Every piece is a normal overworld child, so the existing
  // sector/landmark culler sleeps it while the player is on the survival island.
  const louisianaChunkGeometries = createLouisianaTerrainGeometries();
  for (let i = 0; i < louisianaChunkGeometries.length; i++) {
    const chunk = new THREE.Mesh(louisianaChunkGeometries[i], terrainMat);
    chunk.receiveShadow = true;
    chunk.castShadow = false;
    chunk.userData.noShadowCast = true;
    chunk.userData.preserveShadowFlags = true;
    overworldGroup.add(chunk);
  }
  const louisianaWaterMat = new THREE.MeshStandardMaterial({
    color: 0x1d6f72,
    normalMap: waterNormalTex,
    normalScale: new THREE.Vector2(0.32, 0.32),
    roughness: 0.15,
    metalness: 0.22,
    transparent: true,
    opacity: 0.87,
  });
  louisianaWaterMat.userData = { sharedMaterial: true };
  const louisianaWaterMeshes = buildLouisianaWaterMeshes(louisianaWaterMat);
  for (let i = 0; i < louisianaWaterMeshes.length; i++) {
    overworldGroup.add(louisianaWaterMeshes[i]);
  }
  const louisianaWildGroups = buildLouisianaWilds();
  for (let i = 0; i < louisianaWildGroups.length; i++) {
    overworldGroup.add(louisianaWildGroups[i]);
  }

  // Build animated freshwater ribbons + whitewater rapids streaks for ALL flowing rivers across the island
  const rapidsFoamMat = new THREE.MeshBasicMaterial({
    color: 0xf0f9ff,
    transparent: true,
    opacity: 0.72,
    side: THREE.DoubleSide,
  });
  const riverRockMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.78,
  });
  ALL_FLOWING_RIVERS.forEach((riverPts) => {
    const riverSegs: [number, number, number][] = riverPts
      .slice(0, -1)
      .map(([rx, rz, ry]) => [rx, rz, Math.max(0.02, ry - 0.02)]);
    for (let i = 0; i < riverSegs.length - 1; i++) {
      const [ax, az, ay] = riverSegs[i];
      const [bx, bz, by] = riverSegs[i + 1];
      const len = Math.hypot(bx - ax, bz - az) + 2.4;
      const ribGeo = new THREE.PlaneGeometry(8.8, len);
      ribGeo.rotateX(-Math.PI / 2);
      const rib = new THREE.Mesh(ribGeo, freshwaterMat);
      rib.position.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
      rib.rotation.y = Math.atan2(bx - ax, bz - az);
      rib.rotation.x = Math.atan2(by - ay, len);
      rib.userData.noShadowCast = true;
      rib.userData.preserveEnvMapIntensity = true;
      overworldGroup.add(rib);

      // Foaming whitewater rapids streaks & river boulders on steep rapids segments
      if (Math.abs(by - ay) > 1.75) {
        for (let rStep = 0; rStep < 4; rStep++) {
          const t = (rStep + 0.5) / 4;
          const rx = ax + (bx - ax) * t + (rand() - 0.5) * 4.2;
          const rz = az + (bz - az) * t + (rand() - 0.5) * 4.2;
          const ry = ay + (by - ay) * t + 0.08;
          const foam = new THREE.Mesh(
            new THREE.PlaneGeometry(1.5 + rand() * 1.4, 3.8 + rand() * 2.4),
            rapidsFoamMat,
          );
          foam.rotation.x = -Math.PI / 2;
          foam.rotation.z = -Math.atan2(bx - ax, bz - az);
          foam.position.set(rx, ry, rz);
          foam.userData.noShadowCast = true;
          overworldGroup.add(foam);

          const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55 + rand() * 0.45, 0), riverRockMat);
          rock.scale.set(1.2, 0.7, 1.1);
          rock.position.set(rx + (rand() - 0.5) * 2.2, ry - 0.15, rz + (rand() - 0.5) * 2.2);
          rock.castShadow = false;
          rock.userData.noShadowCast = true;
          overworldGroup.add(rock);
        }
      }
    }
  });

  // 4. Scenic Waterfall Cliff at Northern Mountain Shelf (scrolling shader cascade + mossy buttresses + plunge pool)
  const waterfallStreams: THREE.Mesh[] = [];
  const waterfallShaderMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec3 pos = position;
        // Gentle cascade bow outward as water plunges over cliff lip
        float fallCurve = sin((1.0 - uv.y) * 1.35) * 0.55;
        pos.z += fallCurve;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec2 vUv;

      float wfHash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      float wfNoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(wfHash(i), wfHash(i + vec2(1.0, 0.0)), f.x),
          mix(wfHash(i + vec2(0.0, 1.0)), wfHash(i + vec2(1.0, 1.0)), f.x),
          f.y
        );
      }

      void main() {
        vec2 flowUv1 = vec2(vUv.x * 7.5, vUv.y * 3.8 + uTime * 2.15);
        vec2 flowUv2 = vec2(vUv.x * 13.0 + 2.4, vUv.y * 6.5 + uTime * 3.15);
        float streak1 = wfNoise(flowUv1);
        float streak2 = wfNoise(flowUv2);
        float streaks = streak1 * 0.6 + streak2 * 0.4;

        float edgeFade = smoothstep(0.0, 0.14, vUv.x) * smoothstep(1.0, 0.86, vUv.x);
        float lipFoam = smoothstep(0.74, 1.0, vUv.y) * 0.52;
        float splashMist = smoothstep(0.28, 0.0, vUv.y) * 0.80;
        float whitewater = smoothstep(0.38, 0.78, streaks + lipFoam + splashMist);

        vec3 waterCol = vec3(0.20, 0.78, 0.84);
        vec3 foamCol = vec3(0.99, 0.99, 0.96);
        vec3 col = mix(waterCol, foamCol, clamp(whitewater * 0.95, 0.0, 1.0));
        float alpha = clamp((0.56 + whitewater * 0.42) * edgeFade, 0.0, 0.96);
        if (alpha < 0.04) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  // Flanking dark mossy cliffside buttresses framing the waterfall cascade
  const wfCliffRockMat = enhanceSurfaceMaterial(
    new THREE.MeshStandardMaterial({
      color: 0x454a42,
      map: rockTex,
      normalMap: rockNormalTex,
      normalScale: new THREE.Vector2(1.25, 1.25),
      roughnessMap: rockRoughnessTex,
      roughness: 0.92,
    }),
    'rock',
  );
  const wfButtressGeo = new THREE.DodecahedronGeometry(1, 1);
  const wfCliffSpecs: [number, number, number, number, number, number, number][] = [
    [-4.8, 7.2, 0.8, 3.2, 5.6, 2.8, 0.3],
    [4.8, 7.1, 0.9, 3.1, 5.5, 2.9, -0.4],
    [-6.6, 5.4, 2.2, 2.6, 3.8, 2.4, 0.8],
    [6.5, 5.3, 2.4, 2.7, 3.9, 2.5, -0.7],
    [0.0, 12.6, -1.1, 4.8, 2.6, 3.0, 0.15],
  ];
  wfCliffSpecs.forEach(([ox, cy, oz, sx, sy, sz, rotY]) => {
    const crag = new THREE.Mesh(wfButtressGeo, wfCliffRockMat);
    crag.position.set(WATERFALL_POS.x + ox, cy, WATERFALL_POS.z + oz);
    crag.scale.set(sx, sy, sz);
    crag.rotation.set(0.12, rotY, ox < 0 ? 0.15 : -0.15);
    crag.castShadow = true;
    crag.receiveShadow = true;
    crag.updateMatrix();
    crag.matrixAutoUpdate = false;
    overworldGroup.add(crag);
  });

  for (let i = 0; i < 3; i++) {
    const stream = new THREE.Mesh(new THREE.PlaneGeometry(3.15, 12.2, 2, 10), waterfallShaderMat);
    stream.position.set(WATERFALL_POS.x + (i - 1) * 1.45, 8.15, WATERFALL_POS.z + 2.0 + (i % 2) * 0.22);
    stream.rotation.x = -0.24;
    stream.renderOrder = 2;
    stream.castShadow = false;
    stream.userData.noShadowCast = true;
    overworldGroup.add(stream);
    waterfallStreams.push(stream);
  }

  // Emerald plunge pool + layered mist clouds at waterfall base
  const plungePoolMat = new THREE.MeshStandardMaterial({
    color: 0x0f766e,
    normalMap: waterNormalTex,
    normalScale: new THREE.Vector2(0.4, 0.4),
    roughness: 0.1,
    metalness: 0.2,
    transparent: true,
    opacity: 0.86,
  });
  const plungePool = new THREE.Mesh(new THREE.CircleGeometry(5.6, 24), plungePoolMat);
  plungePool.rotation.x = -Math.PI / 2;
  plungePool.position.set(WATERFALL_POS.x, 2.63, WATERFALL_POS.z + 4.4);
  plungePool.userData.noShadowCast = true;
  plungePool.userData.preserveEnvMapIntensity = true;
  plungePool.updateMatrix();
  plungePool.matrixAutoUpdate = false;
  overworldGroup.add(plungePool);

  const wfMistMat = new THREE.MeshBasicMaterial({
    color: 0xf8fafc,
    transparent: true,
    opacity: 0.38,
    depthWrite: false,
  });
  const wfMistGeo = new THREE.SphereGeometry(1.0, 10, 8);
  for (let m = 0; m < 5; m++) {
    const mist = new THREE.Mesh(wfMistGeo, wfMistMat);
    mist.position.set(
      WATERFALL_POS.x + (m - 2) * 1.65,
      3.18 + (m % 2) * 0.55,
      WATERFALL_POS.z + 3.45 + (m % 2) * 0.8,
    );
    mist.scale.set(2.5, 1.25, 2.1);
    mist.castShadow = false;
    mist.userData.noShadowCast = true;
    mist.updateMatrix();
    mist.matrixAutoUpdate = false;
    overworldGroup.add(mist);
  }

  const waterfallFoam = new THREE.Mesh(
    new THREE.RingGeometry(1.1, 4.7, 24),
    new THREE.MeshBasicMaterial({
      color: 0xf0fdfa,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  waterfallFoam.rotation.x = -Math.PI / 2;
  waterfallFoam.position.set(WATERFALL_POS.x, 2.66, WATERFALL_POS.z + 4.4);
  waterfallFoam.castShadow = false;
  waterfallFoam.userData.noShadowCast = true;
  overworldGroup.add(waterfallFoam);

  // Track shadow-casting world objects so Graphics Settings can toggle shadows cleanly
  const shadowCasters: THREE.Object3D[] = [];
  const staticMergeTargets: { group: THREE.Object3D; protectedObjs?: THREE.Object3D[] }[] = [];
  const dragonValleyFlyers: DragonValleyFlyerHandle[] = [];
  let dragonValleyBeacon: DragonValleyBeaconHandle | null = null;
  let abandonedDragonGroup: THREE.Group | null = null;
  const disposableGeos: THREE.BufferGeometry[] = [];
  const disposableMats: THREE.Material[] = [];
  const disposableTexs: THREE.Texture[] = [
    groundTex,
    groundNormalTex,
    groundRoughnessTex,
    barkTex,
    barkNormalTex,
    rockTex,
    rockNormalTex,
    rockRoughnessTex,
    leafTex,
    leafSprayTex,
    leafNormalTex,
    waterNormalTex,
    woodTex,
    woodNormalTex,
    ...rockPbrBundle.textures,
    ...sandPbrBundle.textures,
  ];
  let shadowsEnabledState = true;

  // Lightweight InstancedMesh batch collector (dramatically reduces draw calls < 100)
  interface BatchEntry {
    geo: THREE.BufferGeometry;
    mat: THREE.Material;
    castShadow: boolean;
    receiveShadow: boolean;
    foliageScatter?: boolean;
    cx?: number;
    cz?: number;
    matrices: THREE.Matrix4[];
    colors?: THREE.Color[];
  }
  interface BatchSlotRef {
    mesh: THREE.InstancedMesh;
    index: number;
    matrix: THREE.Matrix4;
  }
  const batchRegistry = new Map<string, BatchEntry>();
  const pendingNodeSlots = new Map<
    string,
    { key: string; index: number; matrix: THREE.Matrix4 }[]
  >();
  const builtBatchMeshes = new Map<string, THREE.InstancedMesh>();
  const foliageBatchMeshes: { mesh: THREE.InstancedMesh; cx: number; cz: number }[] = [];
  const nodeBatchSlots = new Map<string, BatchSlotRef[]>();

  const registerGeometry = <T extends THREE.BufferGeometry>(g: T): T => {
    disposableGeos.push(g);
    return g;
  };
  const registerMaterial = <T extends THREE.Material>(m: T): T => {
    disposableMats.push(m);
    return m;
  };

  const addBatchInstance = (
    key: string,
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    matrix: THREE.Matrix4,
    options?: {
      castShadow?: boolean;
      receiveShadow?: boolean;
      foliageScatter?: boolean;
      cx?: number;
      cz?: number;
      color?: THREE.Color;
      nodeId?: string;
    },
  ) => {
    let entry = batchRegistry.get(key);
    if (!entry) {
      entry = {
        geo,
        mat,
        castShadow: Boolean(options?.castShadow),
        receiveShadow: Boolean(options?.receiveShadow),
        foliageScatter: options?.foliageScatter,
        cx: options?.cx,
        cz: options?.cz,
        matrices: [],
      };
      batchRegistry.set(key, entry);
    }
    const idx = entry.matrices.length;
    const matCopy = matrix.clone();
    entry.matrices.push(matCopy);
    if (options?.color) {
      if (!entry.colors) entry.colors = [];
      while (entry.colors.length < idx) {
        entry.colors.push(new THREE.Color(0xffffff));
      }
      entry.colors.push(options.color.clone());
    }
    if (options?.nodeId) {
      const list = pendingNodeSlots.get(options.nodeId) ?? [];
      list.push({ key, index: idx, matrix: matCopy });
      pendingNodeSlots.set(options.nodeId, list);
    }
  };

  // 5. Drifting 3D Tropical Clouds (soft translucent wisps complementing skyDome cumulus layer)
  const cloudsGroup = new THREE.Group();
  const cloudMat = registerMaterial(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xdbeafe,
      emissiveIntensity: 0.24,
      roughness: 0.98,
      transparent: true,
      opacity: 0.44,
      depthWrite: false,
    }),
  );
  const cloudPuffGeo = registerGeometry(new THREE.SphereGeometry(1, 8, 7));
  const cloudInstanced = new THREE.InstancedMesh(cloudPuffGeo, cloudMat, 18 * 4);
  const cloudDummy = new THREE.Object3D();
  let cloudIdx = 0;
  for (let i = 0; i < 18; i++) {
    const angle = (i / 18) * Math.PI * 2;
    const dist = 80 + rand() * 230;
    const cx = Math.cos(angle) * dist;
    const cy = 62 + rand() * 18;
    const cz = Math.sin(angle) * dist;
    for (let p = 0; p < 4; p++) {
      const r = 5.5 + rand() * 5.5;
      cloudDummy.position.set(
        cx + (p - 1.5) * 5.6,
        cy + rand() * 1.4,
        cz + (rand() - 0.5) * 4.2,
      );
      cloudDummy.rotation.set(0, 0, 0);
      cloudDummy.scale.set(r * 1.85, r * 0.36, r * 1.25);
      cloudDummy.updateMatrix();
      cloudInstanced.setMatrixAt(cloudIdx++, cloudDummy.matrix);
    }
  }
  cloudInstanced.instanceMatrix.needsUpdate = true;
  cloudInstanced.computeBoundingSphere();
  cloudsGroup.add(cloudInstanced);
  overworldGroup.add(cloudsGroup);

  // 6. Hyper-Realistic Shipwreck & Beaching Event with Tiered Interior Zones & Boarding Routes
  // ALL COLLISION BARRIERS & INVISIBLE WALLS STRIPPED: Player can walk/swim freely through any part!
  const colliders: { x: number; z: number; radius: number; nodeId?: string }[] = [];
  const wreckMat = new THREE.MeshStandardMaterial({
    color: 0x4b3320,
    map: woodTex,
    normalMap: woodNormalTex,
    normalScale: new THREE.Vector2(0.75, 0.75),
    roughness: 0.9,
  });
  const tatteredSailMat = new THREE.MeshStandardMaterial({
    color: 0xd4c5a9,
    roughness: 0.95,
    side: THREE.DoubleSide,
  });
  const metalWreckMat = new THREE.MeshStandardMaterial({
    color: 0x292524,
    roughness: 0.65,
    metalness: 0.7,
  });
  const gemGlowMat = new THREE.MeshStandardMaterial({
    color: 0x8b5cf6,
    emissive: 0x7c3aed,
    emissiveIntensity: 0.9,
    roughness: 0.2,
  });

  const wreckGroup = new THREE.Group();
  const hullX = SHIPWRECK_POS.x;
  const hullZ = SHIPWRECK_POS.z;
  const hullY = getTerrainHeight(hullX, hullZ);
  wreckGroup.position.set(hullX, OCEAN_LEVEL - 0.2, hullZ);
  wreckGroup.rotation.set(0.1, 0.35, -0.35); // Realistic 20-degree angle in shallow water
  wreckGroup.scale.set(2.0, 2.0, 2.0); // Proportional medium-large vessel (~18-22m long)

  // Main Galleon Hull & Splintered Ribs (100% open, collision-free mesh)
  const shatteredHull = new THREE.Mesh(new THREE.BoxGeometry(5.2, 3.0, 12.0), wreckMat);
  shatteredHull.castShadow = true;
  shatteredHull.receiveShadow = true;

  // Massive wide-open side breach & hold opening (3-4m wide for walk/swim entry)
  const sideBreach = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 2.2, 1.8),
    new THREE.MeshBasicMaterial({ color: 0x0c0a09 }),
  );
  sideBreach.position.set(-2.5, -0.2, 1.5);

  // Mid-Deck Armory & Vault (Gem displays & outer space gems)
  const vaultDesk = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.75, 0.9), wreckMat);
  vaultDesk.position.set(0.6, 0.2, -1.2);
  const gemCluster = new THREE.Mesh(new THREE.OctahedronGeometry(0.4, 0), gemGlowMat);
  gemCluster.position.set(0.6, 0.75, -1.2);

  // Captain's Quarters (Aft Cabin at raised stern with open doorways)
  const aftCabin = new THREE.Mesh(new THREE.BoxGeometry(4.0, 2.2, 3.6), wreckMat);
  aftCabin.position.set(0, 1.3, -4.2);
  const captainDesk = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 0.8), wreckMat);
  captainDesk.position.set(0, 0.5, -4.2);
  const captainSafe = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), metalWreckMat);
  captainSafe.position.set(1.4, 0.5, -4.7);

  // Upper Deck Wooden Staircases
  const deckStair = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.2, 2.4), wreckMat);
  deckStair.position.set(0, 0.6, 2.5);
  deckStair.rotation.x = -0.35;

  // Giant Collapsed Access Bridge (Mainmast ramping from beach directly to upper deck)
  const accessBridge = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 12.0, 8), wreckMat);
  accessBridge.position.set(-2.5, 0.6, 6.2);
  accessBridge.rotation.set(-0.48, 0.25, -0.3);
  accessBridge.castShadow = true;

  // Multiple Massive Masts & Tattered Sails
  const mainMast = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.38, 14.0, 8), wreckMat);
  mainMast.position.set(0, 5.0, 0);
  mainMast.castShadow = true;

  const tatteredSail = new THREE.Mesh(new THREE.BoxGeometry(4.5, 5.2, 0.1), tatteredSailMat);
  tatteredSail.position.set(0.5, 4.8, -0.6);
  tatteredSail.rotation.set(0.2, 0.4, 0.3);

  wreckGroup.add(
    shatteredHull,
    sideBreach,
    vaultDesk,
    gemCluster,
    aftCabin,
    captainDesk,
    captainSafe,
    deckStair,
    accessBridge,
    mainMast,
    tatteredSail,
  );
  overworldGroup.add(wreckGroup);
  staticMergeTargets.push({ group: wreckGroup });
  // NOTE: Zero colliders pushed for the ship — completely removing all invisible walls & barriers!

  // 4 Interactive 3D Loot Chests placed with 100% open, unrestricted access
  const shipwreckChests: ShipwreckChestHandle[] = [];

  function createShipwreckLootChest(
    id: string,
    name: string,
    sublabel: string,
    zone: 'cargo' | 'armory' | 'captain' | 'deck',
    x: number,
    y: number,
    z: number,
    rotY: number,
    accentColor: number,
  ): ShipwreckChestHandle {
    const chestGroup = new THREE.Group();
    chestGroup.position.set(x, y, z);
    chestGroup.rotation.y = rotY;

    const chestWoodMat = new THREE.MeshStandardMaterial({
      color: zone === 'captain' ? 0x3d2817 : zone === 'armory' ? 0x27272a : 0x5c3818,
      map: woodTex,
      roughness: 0.82,
      metalness: 0.1,
    });

    const trimMat = new THREE.MeshStandardMaterial({
      color: zone === 'captain' ? 0xf59e0b : zone === 'armory' ? 0xa855f7 : 0xd97706,
      metalness: zone === 'captain' ? 0.9 : 0.7,
      roughness: 0.25,
    });

    // Chest Body Base
    const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.65, 0.8), chestWoodMat);
    baseMesh.position.y = 0.325;
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    chestGroup.add(baseMesh);

    // Metal Corner Brackets & Trim Bands
    const band1 = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.08, 0.82), trimMat);
    band1.position.y = 0.58;
    const band2 = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.08, 0.82), trimMat);
    band2.position.y = 0.12;
    const lockPlate = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.08), trimMat);
    lockPlate.position.set(0, 0.45, 0.42);
    chestGroup.add(band1, band2, lockPlate);

    // Hinged Lid Group (pivot placed at top-back rim: y = 0.65, z = -0.4)
    const lidGroup = new THREE.Group();
    lidGroup.position.set(0, 0.65, -0.4);

    const lidMesh = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.24, 0.84), chestWoodMat);
    lidMesh.position.set(0, 0.12, 0.4);
    lidMesh.castShadow = true;
    lidGroup.add(lidMesh);

    const lidTrim = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.08, 0.86), trimMat);
    lidTrim.position.set(0, 0.12, 0.4);
    const handleRing = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.025, 6, 12), trimMat);
    handleRing.position.set(0, 0.25, 0.4);
    handleRing.rotation.x = Math.PI / 2;
    lidGroup.add(lidTrim, handleRing);

    chestGroup.add(lidGroup);

    // Visible Glowing Beacon Column (draws players straight to the chest from afar)
    const glowGeo = new THREE.CylinderGeometry(0.38, 0.38, 3.2, 8, 1, true);
    const glowMat = new THREE.MeshBasicMaterial({
      color: accentColor,
      transparent: true,
      opacity: 0.38,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const glowMesh = new THREE.Mesh(glowGeo, glowMat);
    glowMesh.position.y = 1.6;
    chestGroup.add(glowMesh);

    overworldGroup.add(chestGroup);

    return {
      id,
      name,
      sublabel,
      zone,
      x,
      y,
      z,
      group: chestGroup,
      lidGroup,
      glowMesh,
    };
  }

  // 1. Forecastle / Main Deck Shoreline Chest (by the collapsed mast bridge)
  shipwreckChests.push(
    createShipwreckLootChest(
      'deck',
      'Forecastle Supply Chest',
      'Glock 19, Colt M1911, Ammo & Supplies',
      'deck',
      SHIPWRECK_POS.x - 3.0,
      OCEAN_LEVEL + 0.45,
      SHIPWRECK_POS.z - 7.0,
      0.35,
      0x38bdf8,
    ),
  );

  // 2. Lower Cargo Hold Weapon Crate (right inside wide blast hull opening)
  shipwreckChests.push(
    createShipwreckLootChest(
      'cargo',
      'Cargo Hold Weapon Crate',
      'Remington 870, Mossberg 590, Sawed-Off & Sidearms',
      'cargo',
      SHIPWRECK_POS.x - 1.5,
      OCEAN_LEVEL + 0.25,
      SHIPWRECK_POS.z - 2.0,
      -0.4,
      0xf59e0b,
    ),
  );

  // 3. Mid-Deck Armory Footlocker (mid-deck platform by space crystal display)
  shipwreckChests.push(
    createShipwreckLootChest(
      'armory',
      'Mid-Deck Armory Footlocker',
      'AK-47, M4A1, SCAR-H, FN FAL, MP5 & Vector',
      'armory',
      SHIPWRECK_POS.x + 1.0,
      OCEAN_LEVEL + 0.95,
      SHIPWRECK_POS.z + 0.5,
      0.15,
      0xa855f7,
    ),
  );

  // 4. Captain's Royal Sea Chest (in the aft cabin at elevated stern)
  shipwreckChests.push(
    createShipwreckLootChest(
      'captain',
      'Captain’s Royal Sea Chest',
      'Barrett .50 Cal, M249 SAW, Gold & Space Gems',
      'captain',
      SHIPWRECK_POS.x + 2.2,
      OCEAN_LEVEL + 1.65,
      SHIPWRECK_POS.z + 6.5,
      -0.25,
      0xeab308,
    ),
  );

  // Scattered chaotic debris field in water/sand around shipwreck (batched into 2 InstancedMeshes)
  const debrisSpots: [number, number, number][] = [
    [SHIPWRECK_POS.x - 2.5, SHIPWRECK_POS.z - 15, 0.4],
    [SHIPWRECK_POS.x + 9.2, SHIPWRECK_POS.z - 13, -0.7],
    [SHIPWRECK_POS.x + 17.5, SHIPWRECK_POS.z - 10, 1.1],
    [SHIPWRECK_POS.x - 14.0, SHIPWRECK_POS.z - 14, -0.3],
    [SHIPWRECK_POS.x + 6.8, SHIPWRECK_POS.z - 7, 0.9],
    [SHIPWRECK_POS.x - 4.2, SHIPWRECK_POS.z - 3, 1.5],
    [SHIPWRECK_POS.x + 11.4, SHIPWRECK_POS.z - 18, -0.5],
  ];
  const debrisPlankGeo = registerGeometry(new THREE.BoxGeometry(0.5, 0.08, 2.8));
  const debrisBarrelGeo = registerGeometry(new THREE.CylinderGeometry(0.35, 0.35, 0.85, 9));
  const batchDummy = new THREE.Object3D();
  debrisSpots.forEach(([dx, dz, rot]) => {
    const dy = getTerrainHeight(dx, dz);
    batchDummy.position.set(dx, Math.max(OCEAN_LEVEL + 0.05, dy + 0.06), dz);
    batchDummy.rotation.set(0, rot, 0);
    batchDummy.scale.set(1, 1, 1);
    batchDummy.updateMatrix();
    addBatchInstance('debris_plank', debrisPlankGeo, wreckMat, batchDummy.matrix);

    batchDummy.position.set(dx + 0.9, Math.max(OCEAN_LEVEL + 0.15, dy + 0.35), dz + 0.6);
    batchDummy.rotation.set(0, 0, Math.PI / 2.4);
    batchDummy.scale.set(1, 1, 1);
    batchDummy.updateMatrix();
    addBatchInstance('debris_barrel', debrisBarrelGeo, wreckMat, batchDummy.matrix, {
      castShadow: true,
    });
  });

  // 7. Obsidian Mountain Cavern
  const caveGroup = new THREE.Group();
  const caveBaseY = getTerrainHeight(CAVE_POS.x, CAVE_POS.z);
  caveGroup.position.set(CAVE_POS.x, caveBaseY, CAVE_POS.z);
  const darkRockMat = new THREE.MeshStandardMaterial({ color: 0x3f3a36, roughness: 0.94 });

  [
    [-4.2, 2.2, 0, 2.8, 5.2, 7.5],
    [4.2, 2.2, 0, 2.8, 5.2, 7.5],
    [0, 5.2, -0.5, 11.0, 3.0, 8.0],
    [0, 2.5, -5.0, 10.5, 6.2, 2.6],
  ].forEach(([ox, oy, oz, sx, sy, sz]) => {
    const block = new THREE.Mesh(new THREE.DodecahedronGeometry(0.62, 1), darkRockMat);
    block.scale.set(sx, sy, sz);
    block.position.set(ox, oy, oz);
    block.castShadow = true;
    block.receiveShadow = true;
    caveGroup.add(block);
  });

  const crystalMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.85,
    roughness: 0.2,
  });
  [
    [-2.0, 0.8, -1.8],
    [2.1, 1.1, -2.5],
    [0.2, 0.6, -3.2],
  ].forEach(([cx, cy, cz]) => {
    const crys = new THREE.Mesh(new THREE.OctahedronGeometry(0.45, 0), crystalMat);
    crys.scale.set(0.7, 1.8, 0.7);
    crys.position.set(cx, cy, cz);
    caveGroup.add(crys);
  });
  const caveLight = new THREE.PointLight(0x38bdf8, 2.2, 16, 1.5);
  caveLight.position.set(0, 2.6, -1.8);
  caveGroup.add(caveLight);
  overworldGroup.add(caveGroup);
  staticMergeTargets.push({ group: caveGroup });
  colliders.push({ x: CAVE_POS.x - 4.2, z: CAVE_POS.z, radius: 2.2 });
  colliders.push({ x: CAVE_POS.x + 4.2, z: CAVE_POS.z, radius: 2.2 });
  colliders.push({ x: CAVE_POS.x, z: CAVE_POS.z - 4.8, radius: 3.0 });

  const crystalGrotto = createCave(overworldGroup, {
    position: new THREE.Vector3(CAVE_POS.x, caveBaseY, CAVE_POS.z),
    radius: 10.5,
    leaveEntranceGap: true,
    seed: 1337,
  });
  staticMergeTargets.push({ group: crystalGrotto });
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    if (Math.sin(a) > 0.82) continue;
    colliders.push({
      x: CAVE_POS.x + Math.cos(a) * 10.5,
      z: CAVE_POS.z + Math.sin(a) * 10.5,
      radius: 2.4,
    });
  }

  // Unstable Collapsible Cave Ceiling Stalactites (shoot or warhammer-leap to crush Obsidian Cave Boss!)
  const caveCeilings: CaveCeilingCluster[] = [];
  const ceilingOffsets: [number, number, number][] = [
    [-1.8, 4.35, 1.4],
    [1.85, 4.4, 0.4],
    [0.0, 4.5, -1.9],
  ];
  ceilingOffsets.forEach(([ox, oy, oz], idx) => {
    const cx = CAVE_POS.x + ox;
    const cz = CAVE_POS.z + oz;
    const cy = caveBaseY + oy;
    const groundY = getTerrainHeight(cx, cz);
    const mesh = createCaveCeilingClusterMesh();
    mesh.position.set(cx, cy, cz);
    overworldGroup.add(mesh);
    caveCeilings.push({
      id: `cave_ceiling_${idx}`,
      x: cx,
      y: cy,
      z: cz,
      groundY,
      hp: 35,
      maxHp: 35,
      radius: 1.85,
      collapsed: false,
      falling: false,
      velY: 0,
      mesh,
    });
  });

  // 8. Abandoned Expedition Camp
  const expGroup = new THREE.Group();
  const expY = getTerrainHeight(EXPEDITION_POS.x, EXPEDITION_POS.z);
  expGroup.position.set(EXPEDITION_POS.x, expY, EXPEDITION_POS.z);

  const canvasMat = new THREE.MeshStandardMaterial({
    color: 0xb9a88a,
    roughness: 0.92,
    side: THREE.DoubleSide,
  });
  const rustMat = new THREE.MeshStandardMaterial({
    color: 0x7c2d12,
    roughness: 0.6,
    metalness: 0.65,
  });
  const crateMat = new THREE.MeshStandardMaterial({
    color: 0x85532a,
    map: woodTex,
    roughness: 0.85,
  });

  const tentGeo = new THREE.ConeGeometry(2.8, 2.6, 4);
  tentGeo.rotateY(Math.PI / 4);
  const tent = new THREE.Mesh(tentGeo, canvasMat);
  tent.position.set(-2.5, 1.3, -1.5);
  tent.scale.set(1.1, 1.0, 1.45);
  tent.castShadow = true;
  expGroup.add(tent);
  colliders.push({ x: EXPEDITION_POS.x - 2.5, z: EXPEDITION_POS.z - 1.5, radius: 2.1 });

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 4.4, 6), rustMat);
  mast.position.set(2.4, 2.2, -2.0);
  const dish = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.7, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.3, metalness: 0.5 }),
  );
  dish.position.set(2.4, 3.6, -1.8);
  dish.rotation.x = -0.5;
  expGroup.add(mast, dish);

  const desk = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.85, 0.9), crateMat);
  desk.position.set(1.6, 0.425, 1.6);
  const journal = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.07, 0.54),
    new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.75 }),
  );
  journal.position.set(1.6, 0.89, 1.6);
  journal.rotation.y = 0.3;
  expGroup.add(desk, journal);
  colliders.push({ x: EXPEDITION_POS.x + 1.6, z: EXPEDITION_POS.z + 1.6, radius: 1.0 });

  overworldGroup.add(expGroup);
  staticMergeTargets.push({ group: expGroup });
  const expeditionJournalPos = new THREE.Vector3(
    EXPEDITION_POS.x + 1.6,
    expY + 0.85,
    EXPEDITION_POS.z + 1.6,
  );

  // 8b. Homestead Barnyard, Open-Slat Wooden Barn, Golden Hay Bales, Dusty Paddock & Muddy Pond
  const homesteadY = getTerrainHeight(HOMESTEAD_POS.x, HOMESTEAD_POS.z);
  const hayTex = createHayTexture(Math.min(4, renderer.capabilities.getMaxAnisotropy()));
  const barnWoodMat = new THREE.MeshStandardMaterial({
    color: 0x6b4226,
    map: woodTex,
    normalMap: woodNormalTex,
    normalScale: new THREE.Vector2(0.7, 0.7),
    roughness: 0.9,
  });
  const darkBeamMat = new THREE.MeshStandardMaterial({
    color: 0x422614,
    map: woodTex,
    normalMap: woodNormalTex,
    normalScale: new THREE.Vector2(0.7, 0.7),
    roughness: 0.92,
  });
  const roofShingleMat = new THREE.MeshStandardMaterial({
    color: 0x4b382a,
    roughness: 0.94,
  });
  const hayMat = new THREE.MeshStandardMaterial({
    color: 0xe6b84c,
    map: hayTex,
    roughness: 0.92,
  });
  const dustyDirtMat = new THREE.MeshStandardMaterial({
    color: 0xa68966,
    map: groundTex,
    roughness: 0.96,
  });
  const muddyBankMat = new THREE.MeshStandardMaterial({
    color: 0x5c4028,
    map: groundTex,
    roughness: 0.56,
  });

  // Dimly Lit Open-Slat Wooden Barn at (-28.5, 58)
  const barnX = HOMESTEAD_POS.x - 4.5;
  const barnZ = HOMESTEAD_POS.z;
  const barnY = getTerrainHeight(barnX, barnZ);
  const barnGroup = new THREE.Group();
  barnGroup.position.set(barnX, barnY, barnZ);

  // Barn earthen floor & 4 corner posts
  const barnFloor = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.06, 6.2), dustyDirtMat);
  barnFloor.position.y = 0.03;
  barnFloor.receiveShadow = true;
  barnGroup.add(barnFloor);

  [
    [-2.65, -2.95],
    [2.65, -2.95],
    [-2.65, 2.95],
    [2.65, 2.95],
  ].forEach(([px, pz]) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.22, 3.1, 0.22), darkBeamMat);
    post.position.set(px, 1.55, pz);
    post.castShadow = true;
    barnGroup.add(post);
  });

  // Horizontal wooden slats on west back wall & north/south walls with light gaps for sunbeams
  for (let s = 0; s < 6; s++) {
    const sy = 0.35 + s * 0.44;
    const westSlat = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.28, 5.9), barnWoodMat);
    westSlat.position.set(-2.68, sy, 0);
    westSlat.castShadow = true;
    const northSlat = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.28, 0.1), barnWoodMat);
    northSlat.position.set(0, sy, -2.98);
    northSlat.castShadow = true;
    const southSlat = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.26, 0.1), barnWoodMat);
    southSlat.position.set(0, sy, 2.98);
    southSlat.castShadow = true;
    barnGroup.add(westSlat, northSlat, southSlat);
  }

  // Pitched barn roof
  [-1, 1].forEach((side) => {
    const slope = new THREE.Mesh(new THREE.BoxGeometry(6.3, 0.16, 3.65), roofShingleMat);
    slope.position.set(0, 3.62, side * 1.58);
    slope.rotation.x = side * 0.48;
    slope.castShadow = true;
    slope.receiveShadow = true;
    barnGroup.add(slope);
  });

  // Stack of Golden Hay Bales inside the barn (under (-28.8, 56.8))
  const hayStackLocalX = -0.3;
  const hayStackLocalZ = -1.2;
  const balePositions: [number, number, number, number][] = [
    [hayStackLocalX - 0.52, 0.36, hayStackLocalZ, 0.04],
    [hayStackLocalX + 0.52, 0.36, hayStackLocalZ, -0.03],
    [hayStackLocalX, 0.36, hayStackLocalZ + 0.78, 0.08],
    [hayStackLocalX, 1.06, hayStackLocalZ, -0.05], // Upper bale where Barn Cat sits!
  ];
  balePositions.forEach(([bx, by, bz, ry]) => {
    const bale = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.68, 0.76), hayMat);
    bale.position.set(bx, by, bz);
    bale.rotation.y = ry;
    bale.castShadow = false;
    bale.receiveShadow = true;
    barnGroup.add(bale);
  });

  // Volumetric sunbeams filtering diagonally through barn wall slats onto the hay bales
  const sunbeamMat = new THREE.MeshBasicMaterial({
    color: 0xfef08a,
    transparent: true,
    opacity: 0.11,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  for (let b = 0; b < 3; b++) {
    const beam = new THREE.Mesh(new THREE.ConeGeometry(0.68, 4.2, 8, 1, true), sunbeamMat);
    beam.position.set(-0.6 + b * 0.55, 1.55, 0.55 - b * 0.62);
    beam.rotation.x = -0.58;
    beam.rotation.z = -0.25;
    barnGroup.add(beam);
  }
  const barnWarmFill = new THREE.PointLight(0xfbbf24, 1.35, 9.5, 1.6);
  barnWarmFill.position.set(0.3, 2.35, 0);
  barnGroup.add(barnWarmFill);
  overworldGroup.add(barnGroup);
  staticMergeTargets.push({ group: barnGroup });

  // Barn back/side colliders (keeping east doorway open so player can walk inside!)
  colliders.push({ x: barnX - 2.6, z: barnZ, radius: 1.5 });
  colliders.push({ x: barnX, z: barnZ - 2.8, radius: 1.5 });
  colliders.push({ x: barnX, z: barnZ + 2.8, radius: 1.5 });
  colliders.push({ x: barnX + hayStackLocalX, z: barnZ + hayStackLocalZ, radius: 1.15 });

  // Dusty Paddock & Rustic Wooden Barn Fence (for Horse & Yorkshire Pig)
  const paddockPatch = new THREE.Mesh(new THREE.CircleGeometry(7.2, 22), dustyDirtMat);
  paddockPatch.rotation.x = -Math.PI / 2;
  paddockPatch.position.set(-31.5, homesteadY + 0.025, 66.5);
  paddockPatch.receiveShadow = true;
  paddockPatch.castShadow = false;
  paddockPatch.userData.noShadowCast = true;
  overworldGroup.add(paddockPatch);

  // Farmyard dirt patch for Rooster scratching & muddy pig pen corner
  const yardDirt = new THREE.Mesh(new THREE.CircleGeometry(4.6, 18), dustyDirtMat);
  yardDirt.rotation.x = -Math.PI / 2;
  yardDirt.position.set(-19.5, homesteadY + 0.024, 60.5);
  yardDirt.receiveShadow = true;
  yardDirt.castShadow = false;
  yardDirt.userData.noShadowCast = true;
  overworldGroup.add(yardDirt);

  const fencePostUnitGeo = registerGeometry(new THREE.BoxGeometry(0.16, 1.28, 0.16));
  const fenceRailUnitGeo = registerGeometry(new THREE.BoxGeometry(0.09, 0.1, 1));
  const addFenceSpan = (ax: number, az: number, bx: number, bz: number) => {
    const len = Math.hypot(bx - ax, bz - az);
    const angle = Math.atan2(bx - ax, bz - az);
    const steps = Math.max(1, Math.round(len / 2.6));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const px = ax + (bx - ax) * t;
      const pz = az + (bz - az) * t;
      const py = getTerrainHeight(px, pz);
      batchDummy.position.set(px, py + 0.64, pz);
      batchDummy.rotation.set(0, 0, 0);
      batchDummy.scale.set(1, 1, 1);
      batchDummy.updateMatrix();
      addBatchInstance('paddock_post', fencePostUnitGeo, darkBeamMat, batchDummy.matrix, {
        castShadow: true,
      });
      colliders.push({ x: px, z: pz, radius: 0.25 });
    }
    const mx = (ax + bx) / 2;
    const mz = (az + bz) / 2;
    const my = getTerrainHeight(mx, mz);
    [0.52, 0.98].forEach((ry) => {
      batchDummy.position.set(mx, my + ry, mz);
      batchDummy.rotation.set(0, angle, 0);
      batchDummy.scale.set(1, 1, len);
      batchDummy.updateMatrix();
      addBatchInstance('paddock_rail', fenceRailUnitGeo, barnWoodMat, batchDummy.matrix, {
        castShadow: true,
      });
    });
  };
  // Rustic split-rail fence segments around dusty paddock (open entrance on east side)
  addFenceSpan(-39, 61.5, -39, 72);
  addFenceSpan(-39, 72, -23.5, 72);
  addFenceSpan(-23.5, 72, -23.5, 68.5);
  addFenceSpan(-23.5, 64.5, -23.5, 61.5);
  addFenceSpan(-39, 61.5, -31.5, 61.5);

  // Barnyard Wooden Crate for Nigerian Dwarf Goat at (-22.0, 56.2)
  const crateX = -22.0;
  const crateZ = 56.2;
  const crateBaseY = getTerrainHeight(crateX, crateZ);
  const goatCrate = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.68, 1.05), barnWoodMat);
  goatCrate.position.set(crateX, crateBaseY + 0.34, crateZ);
  goatCrate.castShadow = true;
  goatCrate.receiveShadow = true;
  overworldGroup.add(goatCrate);
  colliders.push({ x: crateX, z: crateZ, radius: 0.68 });

  // Muddy Farm Pond beside the barnyard for Pekin Ducks
  const muddyRing = new THREE.Mesh(
    new THREE.RingGeometry(FARM_POND_POS.radius - 0.6, FARM_POND_POS.radius + 1.8, 22),
    muddyBankMat,
  );
  muddyRing.rotation.x = -Math.PI / 2;
  muddyRing.position.set(FARM_POND_POS.x, FARM_POND_POS.waterY + 0.04, FARM_POND_POS.z);
  muddyRing.receiveShadow = true;
  muddyRing.castShadow = false;
  muddyRing.userData.noShadowCast = true;
  const pondWater = new THREE.Mesh(
    new THREE.CircleGeometry(FARM_POND_POS.radius + 0.4, 24),
    freshwaterMat,
  );
  pondWater.rotation.x = -Math.PI / 2;
  pondWater.position.set(FARM_POND_POS.x, FARM_POND_POS.waterY, FARM_POND_POS.z);
  pondWater.castShadow = false;
  pondWater.userData.noShadowCast = true;
  overworldGroup.add(muddyRing, pondWater);

  // 8c. Wild Animal Habitats (Misty Lake, Snowy Woodland, Rocky Pine Bank, Autumn Grove, Murky Swamp, Savanna Tall Grass, Dead Oak Perch)
  // 1) Misty Azure Lake surface wisps (Bald Eagle soaring backdrop)
  const lakeMistMat = new THREE.MeshBasicMaterial({
    color: 0xe0f2fe,
    transparent: true,
    opacity: 0.14,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  for (let m = 0; m < 4; m++) {
    const mistRing = new THREE.Mesh(
      new THREE.RingGeometry(3.5 + m * 3.1, 5.2 + m * 3.2, 24),
      lakeMistMat,
    );
    mistRing.rotation.x = -Math.PI / 2;
    mistRing.position.set(
      LAKE_CENTER.x + (m % 2 === 0 ? -1.4 : 1.4),
      LAKE_CENTER.waterY + 0.34 + m * 0.14,
      LAKE_CENTER.z + (m - 1.5) * 1.1,
    );
    mistRing.castShadow = false;
    mistRing.userData.noShadowCast = true;
    overworldGroup.add(mistRing);
  }

  // 2) Snowy Woodland Plateau (Timber Wolves) - Batched into InstancedMeshes
  const snowCapMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0xeef2f6, roughness: 0.88 }));
  const snowCedarLeafMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0x1e4a38, map: leafTex, normalMap: leafNormalTex, normalScale: new THREE.Vector2(0.75, 0.75), roughness: 0.85 }));
  const snowBarkMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0x453226, map: barkTex, normalMap: barkNormalTex, normalScale: new THREE.Vector2(0.95, 0.95), roughness: 0.94 }));
  const snowBoulderMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0x64748b, map: rockTex, normalMap: rockNormalTex, roughnessMap: rockRoughnessTex, roughness: 1.0 }));
  const unitTrunkGeo = registerGeometry(new THREE.CylinderGeometry(0.28, 0.42, 1, 8));
  const unitConeGeo = registerGeometry(new THREE.ConeGeometry(1, 1, 8));
  const unitRockGeo = registerGeometry(new THREE.DodecahedronGeometry(1, 1));

  const snowTreeOffsets: [number, number, number][] = [
    [-7.5, -5.5, 1.05],
    [7.0, -6.2, 1.15],
    [-9.0, 4.0, 0.95],
    [8.2, 4.8, 1.08],
    [-2.5, -9.2, 1.2],
    [4.5, 8.6, 0.92],
  ];
  snowTreeOffsets.forEach(([ox, oz, sc]) => {
    const tx = SNOWY_WOODLAND_POS.x + ox;
    const tz = SNOWY_WOODLAND_POS.z + oz;
    const ty = getTerrainHeight(tx, tz);
    batchDummy.position.set(tx, ty + 2.4 * sc, tz);
    batchDummy.rotation.set(0, 0, 0);
    batchDummy.scale.set(sc, 4.8 * sc, sc);
    batchDummy.updateMatrix();
    addBatchInstance('hab_trunk', unitTrunkGeo, snowBarkMat, batchDummy.matrix, { castShadow: true });
    for (let tier = 0; tier < 4; tier++) {
      const tierY = ty + (2.1 + tier * 1.05) * sc;
      const tierR = (2.15 - tier * 0.42) * sc;
      batchDummy.position.set(tx, tierY, tz);
      batchDummy.scale.set(tierR, 1.55 * sc, tierR);
      batchDummy.updateMatrix();
      addBatchInstance('hab_cedar_bough', unitConeGeo, snowCedarLeafMat, batchDummy.matrix, { castShadow: true });

      batchDummy.position.set(tx, tierY + 0.48 * sc, tz);
      batchDummy.scale.set(tierR * 0.86, 0.58 * sc, tierR * 0.86);
      batchDummy.updateMatrix();
      addBatchInstance('hab_snow_cap', unitConeGeo, snowCapMat, batchDummy.matrix);
    }
    colliders.push({ x: tx, z: tz, radius: 0.34 * sc });
  });
  [
    [-4.8, 6.2],
    [5.8, -1.8],
    [-6.2, -0.5],
  ].forEach(([ox, oz]) => {
    const rx = SNOWY_WOODLAND_POS.x + ox;
    const rz = SNOWY_WOODLAND_POS.z + oz;
    const ry = getTerrainHeight(rx, rz);
    batchDummy.position.set(rx, ry + 0.38, rz);
    batchDummy.rotation.set(0, 0, 0);
    batchDummy.scale.set(1.05 * 1.25, 1.05 * 0.72, 1.05 * 1.05);
    batchDummy.updateMatrix();
    addBatchInstance('hab_snow_rock', unitRockGeo, snowBoulderMat, batchDummy.matrix, { castShadow: true });

    batchDummy.position.set(rx, ry + 0.85, rz);
    batchDummy.scale.set(0.86 * 1.18, 0.86 * 0.35, 0.86 * 0.96);
    batchDummy.updateMatrix();
    addBatchInstance('hab_snow_drift', unitRockGeo, snowCapMat, batchDummy.matrix);
    colliders.push({ x: rx, z: rz, radius: 1.05 });
  });

  // 3) Rocky Crystal River Bank & Dense Pines (Grizzly Bear territory near (-4, -26))
  const riverBankRockMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0x706c66, map: rockTex, normalMap: rockNormalTex, roughnessMap: rockRoughnessTex, roughness: 1.0 }));
  const bankPines: [number, number, number][] = [
    [-11.2, -23.5, 1.1],
    [-10.4, -31.2, 1.25],
    [4.6, -24.0, 1.15],
    [6.5, -32.8, 1.05],
    [-9.5, -16.8, 1.0],
  ];
  bankPines.forEach(([px, pz, sc]) => {
    const py = getTerrainHeight(px, pz);
    batchDummy.position.set(px, py + 2.6 * sc, pz);
    batchDummy.rotation.set(0, 0, 0);
    batchDummy.scale.set(0.95 * sc, 5.2 * sc, 0.95 * sc);
    batchDummy.updateMatrix();
    addBatchInstance('hab_trunk', unitTrunkGeo, snowBarkMat, batchDummy.matrix, { castShadow: true });
    for (let t = 0; t < 4; t++) {
      const tr = (2.1 - t * 0.4) * sc;
      batchDummy.position.set(px, py + (2.3 + t * 1.1) * sc, pz);
      batchDummy.scale.set(tr, 1.65 * sc, tr);
      batchDummy.updateMatrix();
      addBatchInstance('hab_cedar_bough', unitConeGeo, snowCedarLeafMat, batchDummy.matrix, { castShadow: true });
    }
    colliders.push({ x: px, z: pz, radius: 0.34 * sc });
  });
  [
    [-8.0, -25.2, 0.95],
    [-7.6, -29.4, 0.72],
    [2.8, -28.0, 0.85],
    [-1.5, -33.2, 0.8],
  ].forEach(([rx, rz, sc]) => {
    const ry = getTerrainHeight(rx, rz);
    batchDummy.position.set(rx, ry + 0.3 * sc, rz);
    batchDummy.rotation.set(0, 0, 0);
    batchDummy.scale.set(0.85 * sc * 1.3, 0.85 * sc * 0.65, 0.85 * sc * 1.1);
    batchDummy.updateMatrix();
    addBatchInstance('hab_river_rock', unitRockGeo, riverBankRockMat, batchDummy.matrix, { castShadow: true });
    colliders.push({ x: rx, z: rz, radius: 0.8 * sc });
  });

  // 4) Autumn Forest Grove & Fallen Leaves (Batched into 4 InstancedMeshes with instanceColor)
  const autumnColors = [0xd97706, 0xb45309, 0xc2410c, 0xeab308];
  const autumnCrownMat = registerMaterial(
    new THREE.MeshStandardMaterial({ color: 0xffffff, map: leafTex, roughness: 0.84 }),
  );
  const autumnTint = new THREE.Color();
  const autumnTreeOffsets: [number, number, number][] = [
    [-5.5, -4.8, 1.05],
    [5.8, -3.6, 1.15],
    [-4.8, 5.6, 0.96],
    [6.2, 5.2, 1.1],
  ];
  autumnTreeOffsets.forEach(([ox, oz, sc], idx) => {
    const ax = AUTUMN_GROVE_POS.x + ox;
    const az = AUTUMN_GROVE_POS.z + oz;
    const ay = getTerrainHeight(ax, az);
    batchDummy.position.set(ax, ay + 1.8 * sc, az);
    batchDummy.rotation.set(0, 0, 0);
    batchDummy.scale.set(0.9 * sc, 3.6 * sc, 0.9 * sc);
    batchDummy.updateMatrix();
    addBatchInstance('hab_trunk', unitTrunkGeo, snowBarkMat, batchDummy.matrix, { castShadow: true });
    for (let cIdx = 0; cIdx < 3; cIdx++) {
      const ca = (cIdx / 3) * Math.PI * 2 + idx;
      batchDummy.position.set(
        ax + Math.cos(ca) * 0.75 * sc,
        ay + (3.6 + (cIdx % 2) * 0.65) * sc,
        az + Math.sin(ca) * 0.75 * sc,
      );
      batchDummy.rotation.set(0, 0, 0);
      batchDummy.scale.set(1.55 * sc * 1.15, 1.55 * sc * 0.78, 1.55 * sc * 1.15);
      batchDummy.updateMatrix();
      autumnTint.setHex(autumnColors[(idx + cIdx) % autumnColors.length]);
      addBatchInstance('hab_autumn_crown', unitRockGeo, autumnCrownMat, batchDummy.matrix, {
        castShadow: true,
        color: autumnTint,
      });
    }
    colliders.push({ x: ax, z: az, radius: 0.32 * sc });
  });
  const autumnUndergrowthMat = registerMaterial(
    new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.88 }),
  );
  const unitLeafGeo = registerGeometry(new THREE.PlaneGeometry(1, 1));
  const leafObj = new THREE.Object3D();
  for (let lf = 0; lf < 48; lf++) {
    const la = (lf / 48) * Math.PI * 2 + rand() * 0.5;
    const lr = 1.2 + rand() * 8.5;
    const lx = AUTUMN_GROVE_POS.x + Math.cos(la) * lr;
    const lz = AUTUMN_GROVE_POS.z + Math.sin(la) * lr;
    const ly = getTerrainHeight(lx, lz);
    leafObj.position.set(lx, ly + 0.03, lz);
    leafObj.rotation.set(-Math.PI / 2, 0, rand() * Math.PI * 2);
    leafObj.scale.set(0.28 + rand() * 0.18, 0.2 + rand() * 0.14, 1);
    leafObj.updateMatrix();
    autumnTint.setHex(autumnColors[lf % autumnColors.length]);
    addBatchInstance('hab_autumn_leaf', unitLeafGeo, autumnCrownMat, leafObj.matrix, {
      color: autumnTint,
    });
  }
  const unitFrondGeo = registerGeometry(new THREE.ConeGeometry(0.18, 0.82, 4));
  const frondPivot = new THREE.Object3D();
  const frondChild = new THREE.Object3D();
  frondPivot.add(frondChild);
  for (let u = 0; u < 10; u++) {
    const ua = (u / 10) * Math.PI * 2 + 0.3;
    const ur = 3.8 + (u % 3) * 1.9;
    const ux = AUTUMN_GROVE_POS.x + Math.cos(ua) * ur;
    const uz = AUTUMN_GROVE_POS.z + Math.sin(ua) * ur;
    const uy = getTerrainHeight(ux, uz);
    frondPivot.position.set(ux, uy, uz);
    frondPivot.updateMatrixWorld(true);
    for (let f = 0; f < 4; f++) {
      frondChild.position.set(0, 0.28, 0);
      frondChild.rotation.set(0, (f / 4) * Math.PI * 2, 0.68);
      frondChild.scale.set(1, 1, 1);
      frondChild.updateMatrixWorld(true);
      addBatchInstance('hab_autumn_frond', unitFrondGeo, autumnUndergrowthMat, frondChild.matrixWorld);
    }
  }

  // 5) Murky Jungle Swamp Lagoon (Saltwater Crocodile territory)
  const swampWaterMat = registerMaterial(
    new THREE.MeshStandardMaterial({
      color: 0x2d3b22,
      normalMap: waterNormalTex,
      normalScale: new THREE.Vector2(0.25, 0.25),
      roughness: 0.22,
      metalness: 0.14,
      transparent: true,
      opacity: 0.9,
    }),
  );
  const swampMudMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0x3b3322, roughness: 0.72 }));
  const swampBankRing = new THREE.Mesh(
    registerGeometry(new THREE.RingGeometry(SWAMP_POS.radius - 0.8, SWAMP_POS.radius + 2.4, 28)),
    swampMudMat,
  );
  swampBankRing.rotation.x = -Math.PI / 2;
  swampBankRing.position.set(SWAMP_POS.x, SWAMP_POS.waterY + 0.03, SWAMP_POS.z);
  swampBankRing.receiveShadow = true;
  swampBankRing.castShadow = false;
  swampBankRing.userData.noShadowCast = true;
  const swampWater = new THREE.Mesh(
    registerGeometry(new THREE.CircleGeometry(SWAMP_POS.radius + 0.6, 30)),
    swampWaterMat,
  );
  swampWater.rotation.x = -Math.PI / 2;
  swampWater.position.set(SWAMP_POS.x, SWAMP_POS.waterY, SWAMP_POS.z);
  swampWater.castShadow = false;
  swampWater.userData.noShadowCast = true;
  overworldGroup.add(swampBankRing, swampWater);

  // Mossy swamp logs & dense jungle reeds along lagoon edge (70 reeds in 1 InstancedMesh)
  const swampReedMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0x365314, roughness: 0.86 }));
  const unitReedGeo = registerGeometry(new THREE.ConeGeometry(0.06, 1.35, 4));
  for (let r = 0; r < 14; r++) {
    const ra = (r / 14) * Math.PI * 2;
    const rx = SWAMP_POS.x + Math.cos(ra) * (SWAMP_POS.radius - 0.4 + (r % 2) * 1.3);
    const rz = SWAMP_POS.z + Math.sin(ra) * (SWAMP_POS.radius - 0.4 + (r % 2) * 1.3);
    const ry = Math.max(SWAMP_POS.waterY - 0.2, getTerrainHeight(rx, rz));
    for (let s = 0; s < 5; s++) {
      batchDummy.position.set(rx + (s - 2) * 0.14, ry + 0.62, rz + ((s % 2) - 0.5) * 0.16);
      batchDummy.rotation.set(0, 0, (s - 2) * 0.1);
      batchDummy.scale.set(1, 1, 1);
      batchDummy.updateMatrix();
      addBatchInstance('hab_swamp_reed', unitReedGeo, swampReedMat, batchDummy.matrix);
    }
  }
  const sunkenLog = new THREE.Mesh(
    registerGeometry(new THREE.CylinderGeometry(0.28, 0.34, 4.4, 8)),
    snowBarkMat,
  );
  sunkenLog.position.set(SWAMP_POS.x - 4.2, SWAMP_POS.waterY + 0.02, SWAMP_POS.z + 3.8);
  sunkenLog.rotation.set(0.06, 0.72, Math.PI / 2);
  overworldGroup.add(sunkenLog);

  // 6) Tall Golden Savanna Grass Patch (African Lion prowling & Bison windswept prairie)
  const goldenSavannaBladeGeo = new THREE.ConeGeometry(0.08, 1.32, 8);
  goldenSavannaBladeGeo.translate(0, 0.66, 0);
  const goldenSavannaMat = enhanceSurfaceMaterial(
    new THREE.MeshStandardMaterial({ color: 0xd4a438, roughness: 0.88 }),
    'foliage',
    0.055,
  );
  const savannaGrassCount = 180;
  const savannaGrassMesh = new THREE.InstancedMesh(
    goldenSavannaBladeGeo,
    goldenSavannaMat,
    savannaGrassCount,
  );
  savannaGrassMesh.castShadow = false;
  savannaGrassMesh.receiveShadow = true;
  savannaGrassMesh.userData.noShadowCast = true;
  const savannaDummy = new THREE.Object3D();
  const savannaTint = new THREE.Color();
  for (let sg = 0; sg < savannaGrassCount; sg++) {
    const sx = -67 + rand() * 22;
    const sz = -18 + rand() * 54;
    const sy = getTerrainHeight(sx, sz);
    savannaDummy.position.set(sx, sy, sz);
    savannaDummy.rotation.set((rand() - 0.5) * 0.22, rand() * Math.PI * 2, (rand() - 0.5) * 0.28);
    const sc = 0.85 + rand() * 0.55;
    savannaDummy.scale.set(sc, sc * (0.9 + rand() * 0.4), sc);
    savannaDummy.updateMatrix();
    savannaGrassMesh.setMatrixAt(sg, savannaDummy.matrix);
    savannaTint.setHex(0xd4a438).offsetHSL((rand() - 0.5) * 0.03, 0, (rand() - 0.5) * 0.08);
    savannaGrassMesh.setColorAt(sg, savannaTint);
  }
  savannaGrassMesh.instanceMatrix.needsUpdate = true;
  if (savannaGrassMesh.instanceColor) savannaGrassMesh.instanceColor.needsUpdate = true;
  savannaGrassMesh.computeBoundingSphere();
  overworldGroup.add(savannaGrassMesh);

  // 7) Gnarled Dead Oak Tree & Exposed Perch Branch (Great Horned Owl at DEAD_OAK_POS = (18, 78))
  const deadOakBaseY = getTerrainHeight(DEAD_OAK_POS.x, DEAD_OAK_POS.z);
  const deadOakMat = enhanceSurfaceMaterial(
    new THREE.MeshStandardMaterial({ color: 0x574c43, map: barkTex, normalMap: barkNormalTex, normalScale: new THREE.Vector2(0.95, 0.95), roughness: 0.96 }),
    'wood',
  );
  const deadOakGroup = new THREE.Group();
  deadOakGroup.position.set(DEAD_OAK_POS.x, deadOakBaseY, DEAD_OAK_POS.z);
  const oakTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.56, 4.4, 9), deadOakMat);
  oakTrunk.position.y = 2.2;
  oakTrunk.castShadow = true;
  deadOakGroup.add(oakTrunk);
  for (let r = 0; r < 5; r++) {
    const ra = (r / 5) * Math.PI * 2;
    const oakRoot = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.22, 1.1, 6), deadOakMat);
    oakRoot.position.set(Math.cos(ra) * 0.5, 0.35, Math.sin(ra) * 0.5);
    oakRoot.rotation.z = Math.cos(ra) * 0.6;
    oakRoot.rotation.x = -Math.sin(ra) * 0.6;
    deadOakGroup.add(oakRoot);
  }
  // Exact horizontal owl perch limb reaching (1.35, 3.25, 0.2) relative to trunk base
  const owlBranch = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.18, 2.2, 7), deadOakMat);
  owlBranch.position.set(0.95, 3.16, 0.14);
  owlBranch.rotation.z = -Math.PI / 2.22;
  owlBranch.rotation.y = -0.15;
  owlBranch.castShadow = true;
  // Secondary bare upper branches
  const upperLimbL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.16, 2.1, 6), deadOakMat);
  upperLimbL.position.set(-0.75, 4.15, -0.35);
  upperLimbL.rotation.z = 0.68;
  upperLimbL.rotation.x = -0.25;
  const upperLimbR = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.14, 1.85, 6), deadOakMat);
  upperLimbR.position.set(0.45, 4.35, -0.55);
  upperLimbR.rotation.z = -0.52;
  upperLimbR.rotation.x = -0.38;
  deadOakGroup.add(owlBranch, upperLimbL, upperLimbR);
  overworldGroup.add(deadOakGroup);
  staticMergeTargets.push({ group: deadOakGroup });
  colliders.push({ x: DEAD_OAK_POS.x, z: DEAD_OAK_POS.z, radius: 0.7 });

  // 9. Interactive Realistic Trees, Breakable Rocks & Resource Nodes
  const resourceNodes: ResourceNodeState[] = [];
  const resourceMeshes = new Map<string, THREE.Object3D>();
  const resourceHandles = new Map<string, ResourceVisualHandle>();

  const palmTrunkMat = registerMaterial(enhanceSurfaceMaterial(new THREE.MeshStandardMaterial({ color: 0xd8c1a2, map: palmBarkTex, normalMap: palmBarkNormalTex, normalScale: new THREE.Vector2(1.35, 1.35), roughness: 0.9 }), 'wood'));
  const palmLeafMat = registerMaterial(
    enhanceSurfaceMaterial(
      applySafeStandardMaps(
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          roughness: 0.68,
          vertexColors: true,
          side: THREE.DoubleSide,
        }),
        {
          map: palmFrondTex,
          normalMap: leafNormalTex,
        },
      ),
      'palm_frond',
      0.075,
    ),
  );
  palmLeafMat.normalScale.set(0.55, 0.55);
  const palmDeadFrondMat = registerMaterial(
    enhanceSurfaceMaterial(
      new THREE.MeshStandardMaterial({ color: 0xa7804f, map: palmFrondTex, roughness: 0.86, side: THREE.DoubleSide }),
      'palm_frond',
      0.05,
    ),
  );
  const palmFrondGeos = createPalmFrondGeometries().map((g) => registerGeometry(g));
  const palmTrunkSegGeo = registerGeometry(createPalmTrunkSegmentGeometry());
  const palmBootGeo = registerGeometry(createPalmBootGeometry());
  const jungleTrunkMat = registerMaterial(enhanceSurfaceMaterial(new THREE.MeshStandardMaterial({ color: 0x5c3d28, map: barkTex, normalMap: barkNormalTex, normalScale: new THREE.Vector2(0.95, 0.95), roughness: 0.94 }), 'wood'));
  const jungleLeafMat = registerMaterial(enhanceSurfaceMaterial(new THREE.MeshStandardMaterial({ color: 0x227038, map: leafTex, normalMap: leafNormalTex, normalScale: new THREE.Vector2(0.8, 0.8), roughness: 0.76 }), 'foliage', 0.045));
  const banyanTrunkMat = registerMaterial(enhanceSurfaceMaterial(new THREE.MeshStandardMaterial({ color: 0x6b4b34, map: barkTex, normalMap: barkNormalTex, normalScale: new THREE.Vector2(0.95, 0.95), roughness: 0.93 }), 'wood'));
  const banyanLeafMat = registerMaterial(enhanceSurfaceMaterial(new THREE.MeshStandardMaterial({ color: 0x1b5e30, map: leafTex, normalMap: leafNormalTex, normalScale: new THREE.Vector2(0.8, 0.8), roughness: 0.78 }), 'foliage', 0.04));
  const cedarTrunkMat = registerMaterial(enhanceSurfaceMaterial(new THREE.MeshStandardMaterial({ color: 0x4f3422, map: barkTex, normalMap: barkNormalTex, normalScale: new THREE.Vector2(0.95, 0.95), roughness: 0.95 }), 'wood'));
  const cedarLeafMat = registerMaterial(enhanceSurfaceMaterial(new THREE.MeshStandardMaterial({ color: 0x1f5c3a, map: leafTex, normalMap: leafNormalTex, normalScale: new THREE.Vector2(0.8, 0.8), roughness: 0.8 }), 'foliage', 0.038));
  const birchTrunkMat = registerMaterial(enhanceSurfaceMaterial(new THREE.MeshStandardMaterial({ color: 0xe7e5e0, map: barkTex, normalMap: barkNormalTex, normalScale: new THREE.Vector2(0.7, 0.7), roughness: 0.84 }), 'wood'));
  const birchBandMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0x262624, roughness: 0.92 }));
  const birchLeafMat = registerMaterial(enhanceSurfaceMaterial(new THREE.MeshStandardMaterial({ color: 0x5ca438, map: leafTex, normalMap: leafNormalTex, normalScale: new THREE.Vector2(0.8, 0.8), roughness: 0.7 }), 'foliage', 0.052));
  const paleOakTrunkMat = registerMaterial(enhanceSurfaceMaterial(new THREE.MeshStandardMaterial({ color: 0x7b7f7c, map: barkTex, normalMap: barkNormalTex, normalScale: new THREE.Vector2(0.9, 0.9), roughness: 0.92 }), 'wood'));
  const paleOakLeafMat = registerMaterial(enhanceSurfaceMaterial(new THREE.MeshStandardMaterial({ color: 0x8e998f, map: leafTex, normalMap: leafNormalTex, normalScale: new THREE.Vector2(0.75, 0.75), roughness: 0.84 }), 'foliage', 0.025));
  const paleMossMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0xa6b1a8, roughness: 0.9 }));
  const paleHeartGlowMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xea580c, emissiveIntensity: 0.95, roughness: 0.35 }));
  const pineTrunkMat = registerMaterial(enhanceSurfaceMaterial(new THREE.MeshStandardMaterial({ color: 0x6b3e26, map: barkTex, normalMap: barkNormalTex, normalScale: new THREE.Vector2(0.95, 0.95), roughness: 0.93 }), 'wood'));
  const pineLeafMat = registerMaterial(enhanceSurfaceMaterial(new THREE.MeshStandardMaterial({ color: 0x1b4d2e, map: leafTex, normalMap: leafNormalTex, normalScale: new THREE.Vector2(0.8, 0.8), roughness: 0.8 }), 'foliage', 0.036));
  const spruceTrunkMat = registerMaterial(enhanceSurfaceMaterial(new THREE.MeshStandardMaterial({ color: 0x3e2a1e, map: barkTex, normalMap: barkNormalTex, normalScale: new THREE.Vector2(0.95, 0.95), roughness: 0.95 }), 'wood'));
  const spruceLeafMat = registerMaterial(enhanceSurfaceMaterial(new THREE.MeshStandardMaterial({ color: 0x1b4a3b, map: leafTex, normalMap: leafNormalTex, normalScale: new THREE.Vector2(0.8, 0.8), roughness: 0.8 }), 'foliage', 0.036));
  const rainforestTrunkMat = registerMaterial(enhanceSurfaceMaterial(new THREE.MeshStandardMaterial({ color: 0x523c28, map: barkTex, normalMap: barkNormalTex, normalScale: new THREE.Vector2(0.95, 0.95), roughness: 0.92 }), 'wood'));
  const rainforestLeafMat = registerMaterial(enhanceSurfaceMaterial(new THREE.MeshStandardMaterial({ color: 0x166534, map: leafTex, normalMap: leafNormalTex, normalScale: new THREE.Vector2(0.8, 0.8), roughness: 0.7 }), 'foliage', 0.048));
  const vineMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.86 }));
  const oakTrunkMat = registerMaterial(enhanceSurfaceMaterial(new THREE.MeshStandardMaterial({ color: 0x6b4a2b, map: barkTex, normalMap: barkNormalTex, normalScale: new THREE.Vector2(0.95, 0.95), roughness: 0.93 }), 'wood'));
  const oakLeafMat = registerMaterial(enhanceSurfaceMaterial(new THREE.MeshStandardMaterial({ color: 0x2e8238, map: leafTex, normalMap: leafNormalTex, normalScale: new THREE.Vector2(0.8, 0.8), roughness: 0.73 }), 'foliage', 0.048));
  const darkOakTrunkMat = registerMaterial(enhanceSurfaceMaterial(new THREE.MeshStandardMaterial({ color: 0x3b281a, map: barkTex, normalMap: barkNormalTex, normalScale: new THREE.Vector2(0.95, 0.95), roughness: 0.96 }), 'wood'));
  const darkOakLeafMat = registerMaterial(enhanceSurfaceMaterial(new THREE.MeshStandardMaterial({ color: 0x1a421e, map: leafTex, normalMap: leafNormalTex, normalScale: new THREE.Vector2(0.8, 0.8), roughness: 0.8 }), 'foliage', 0.036));
  const giantMushroomStemMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0xe7e2d8, roughness: 0.88 }));
  const redMushroomCapMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.72 }));
  const mushroomSpotMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0xfefce8, roughness: 0.78 }));
  const brownMushroomCapMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0x854d27, roughness: 0.8 }));
  const cocoaPodMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0xc26122, roughness: 0.65 }));
  const melonRindMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0x4d8c2a, roughness: 0.68 }));
  const melonStripeMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0x1e4d18, roughness: 0.72 }));
  const mossyPatchMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0x3f7d20, roughness: 0.9 }));
  const deadBushMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0x855836, roughness: 0.95 }));
  const roseRedMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.58 }));
  const lilacMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0xc084fc, roughness: 0.62 }));
  const peonyPinkMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.62 }));
  const eyeblossomGlowMat = registerMaterial(
    new THREE.MeshStandardMaterial({
      color: 0x9ca3af,
      emissive: 0xf97316,
      emissiveIntensity: 0.12,
      roughness: 0.52,
    }),
  );
  const bambooCulmMat = registerMaterial(enhanceSurfaceMaterial(new THREE.MeshStandardMaterial({ color: 0x65a30d, roughness: 0.62 }), 'foliage', 0.042));
  const bambooNodeMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0xd9f99d, roughness: 0.72 }));
  // Dandelions, Poppies, Lilacs, Peonies, Lily of the Valley, Alliums, Tulips, Cornflowers (excludes Wither Rose, Torchflower, Pitcher Plant, Blue Orchid, Sunflower)
  const flowerMats = [
    registerMaterial(new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.62 })), // Dandelion
    registerMaterial(new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.6 })), // Poppy / Red Tulip
    registerMaterial(new THREE.MeshStandardMaterial({ color: 0xc084fc, roughness: 0.62 })), // Lilac / Allium
    registerMaterial(new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.62 })), // Peony / Pink Tulip
    registerMaterial(new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.65 })), // Lily of the Valley / Oxeye
    registerMaterial(new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.62 })), // Cornflower
    registerMaterial(new THREE.MeshStandardMaterial({ color: 0xfb923c, roughness: 0.62 })), // Orange Tulip
  ];
  const heartwoodCutMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0xd4a36a, roughness: 0.78 }));
  const coconutMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0x4b2e19, roughness: 0.85 }));

  const boulderMat = registerMaterial(enhanceSurfaceMaterial(rockPbrBundle.material, 'rock'));
  const smallStoneMat = registerMaterial(enhanceSurfaceMaterial(new THREE.MeshStandardMaterial({ color: 0x8b8680, map: rockTex, normalMap: rockNormalTex, normalScale: new THREE.Vector2(1.05, 1.05), roughnessMap: rockRoughnessTex, roughness: 1.0 }), 'rock'));
  const mountainRockMat = registerMaterial(enhanceSurfaceMaterial(new THREE.MeshStandardMaterial({ color: 0x5d5853, map: rockTex, normalMap: rockNormalTex, normalScale: new THREE.Vector2(1.15, 1.15), roughnessMap: rockRoughnessTex, roughness: 1.0 }), 'rock'));
  const flintMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.32, metalness: 0.25 }));
  const oreRockMat = registerMaterial(enhanceSurfaceMaterial(new THREE.MeshStandardMaterial({ color: 0x4a4540, map: rockTex, normalMap: rockNormalTex, normalScale: new THREE.Vector2(1.1, 1.1), roughnessMap: rockRoughnessTex, roughness: 1.0 }), 'rock'));
  const oreVeinMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.28, metalness: 0.82 }));
  const emeraldCrystalMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x059669, emissiveIntensity: 0.35, roughness: 0.2, metalness: 0.45 }));
  const cherryTrunkMat = registerMaterial(enhanceSurfaceMaterial(new THREE.MeshStandardMaterial({ color: 0x3f2228, map: barkTex, normalMap: barkNormalTex, normalScale: new THREE.Vector2(0.9, 0.9), roughness: 0.88 }), 'wood'));
  const cherryLeafMat = registerMaterial(enhanceSurfaceMaterial(new THREE.MeshStandardMaterial({ color: 0xf472b6, map: leafTex, normalMap: leafNormalTex, normalScale: new THREE.Vector2(0.75, 0.75), roughness: 0.72 }), 'foliage', 0.032));
  const cherryBlossomLightMat = registerMaterial(enhanceSurfaceMaterial(new THREE.MeshStandardMaterial({ color: 0xfbcfe8, map: leafTex, normalMap: leafNormalTex, normalScale: new THREE.Vector2(0.75, 0.75), roughness: 0.7 }), 'foliage', 0.032));
  const sunflowerPetalMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.55 }));
  const sunflowerCenterMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 }));
  const beeNestMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.72 }));
  const packedIceMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0x93c5fd, roughness: 0.18, metalness: 0.12, transparent: true, opacity: 0.88 }));
  const blueIceMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.25, roughness: 0.12, metalness: 0.18, transparent: true, opacity: 0.92 }));
  const acaciaTrunkMat = registerMaterial(enhanceSurfaceMaterial(new THREE.MeshStandardMaterial({ color: 0x6e6a65, map: barkTex, normalMap: barkNormalTex, normalScale: new THREE.Vector2(0.95, 0.95), roughness: 0.92 }), 'wood'));
  const acaciaLeafMat = registerMaterial(enhanceSurfaceMaterial(new THREE.MeshStandardMaterial({ color: 0x7c8f38, map: leafTex, normalMap: leafNormalTex, normalScale: new THREE.Vector2(0.75, 0.75), roughness: 0.78 }), 'foliage', 0.04));
  const mangroveTrunkMat = registerMaterial(enhanceSurfaceMaterial(new THREE.MeshStandardMaterial({ color: 0x5c362c, map: barkTex, normalMap: barkNormalTex, normalScale: new THREE.Vector2(0.95, 0.95), roughness: 0.94 }), 'wood'));
  const mangroveLeafMat = registerMaterial(enhanceSurfaceMaterial(new THREE.MeshStandardMaterial({ color: 0x3b6e2e, map: leafTex, normalMap: leafNormalTex, normalScale: new THREE.Vector2(0.8, 0.8), roughness: 0.8 }), 'foliage', 0.036));
  const makeLeafSprayMat = (colorHex: number, windAmp = 0.048) =>
    registerMaterial(
      enhanceSurfaceMaterial(
        applySafeStandardMaps(
          new THREE.MeshStandardMaterial({
            color: colorHex,
            roughness: 0.72,
            alphaTest: 0.42,
            side: THREE.DoubleSide,
            vertexColors: true,
          }),
          {
            map: leafSprayTex,
            normalMap: leafNormalTex,
          },
        ),
        'foliage',
        windAmp,
      ),
    );
  const oakSprayMat = makeLeafSprayMat(0x63a634, 0.048);
  const darkOakSprayMat = makeLeafSprayMat(0x2f6824, 0.036);
  const jungleSprayMat = makeLeafSprayMat(0x529b36, 0.046);
  const rainforestSprayMat = makeLeafSprayMat(0x3f8f38, 0.048);
  const banyanSprayMat = makeLeafSprayMat(0x3b8632, 0.04);
  const birchSprayMat = makeLeafSprayMat(0x82c242, 0.052);
  const paleOakSprayMat = makeLeafSprayMat(0x9ca69a, 0.025);
  const cherrySprayMat = makeLeafSprayMat(0xf472b6, 0.032);
  const cherryLightSprayMat = makeLeafSprayMat(0xfbcfe8, 0.032);
  const acaciaSprayMat = makeLeafSprayMat(0x8ea33b, 0.04);
  const mangroveSprayMat = makeLeafSprayMat(0x4c8532, 0.038);
  const cactusMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0x2f7d32, roughness: 0.82 }));
  const blueOrchidMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.2, roughness: 0.55 }));
  const goldOreCrystalMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xca8a04, emissiveIntensity: 0.32, roughness: 0.22, metalness: 0.88 }));
  const terracottaOrangeMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0xc25934, roughness: 0.92 }));
  const terracottaRedMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0x9c3b24, roughness: 0.92 }));
  const terracottaYellowMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0xd99b42, roughness: 0.92 }));
  const coralPinkMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0xf43f5e, emissive: 0x9f1239, emissiveIntensity: 0.2, roughness: 0.65 }));
  const coralCyanMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x0891b2, emissiveIntensity: 0.22, roughness: 0.6 }));
  const coralYellowMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xa16207, emissiveIntensity: 0.2, roughness: 0.62 }));
  const crackMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0x171412, roughness: 0.98 }));

  const wheatMat = registerMaterial(enhanceSurfaceMaterial(new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.86 }), 'foliage', 0.04));
  const sugarcaneMat = registerMaterial(enhanceSurfaceMaterial(new THREE.MeshStandardMaterial({ color: 0x84cc16, roughness: 0.72 }), 'foliage', 0.045));
  const sugarcaneNodeMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0x4d7c0f, roughness: 0.8 }));
  const grassMat = registerMaterial(enhanceSurfaceMaterial(new THREE.MeshStandardMaterial({ color: 0x6f7f42, roughness: 0.92, side: THREE.DoubleSide }), 'foliage', 0.05));
  const berryBushMat = registerMaterial(enhanceSurfaceMaterial(new THREE.MeshStandardMaterial({ color: 0x15803d, map: leafTex, roughness: 0.85 }), 'foliage', 0.03));
  const berryFruitMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.45 }));
  const fernMat = registerMaterial(enhanceSurfaceMaterial(new THREE.MeshStandardMaterial({ color: 0x4d7c0f, roughness: 0.84 }), 'foliage', 0.035));
  const mushroomCapMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0xc27849, roughness: 0.7 }));
  const mushroomStemMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0xe7e5e4, roughness: 0.85 }));
  const clayMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.94 }));
  const sandMoundMat = registerMaterial(sandPbrBundle.material);

  // Shared geometries across all resource nodes (prevents hundreds of redundant GPU buffers)
  const gCylTaper8 = registerGeometry(new THREE.CylinderGeometry(0.75, 1.0, 1, 8));
  const gCylTaper6 = registerGeometry(new THREE.CylinderGeometry(0.45, 1.0, 1, 6));
  const gCylStraight8 = registerGeometry(new THREE.CylinderGeometry(1, 1, 1, 8));
  const gCylStraight5 = registerGeometry(new THREE.CylinderGeometry(0.75, 1, 1, 5));
  const gCone4 = registerGeometry(new THREE.ConeGeometry(1, 1, 4));
  const gGrassBlade = registerGeometry(createCurvedBladeGeometry());
  const gCone5 = registerGeometry(new THREE.ConeGeometry(1, 1, 5));
  const gCone8 = registerGeometry(new THREE.ConeGeometry(1, 1, 8));
  const gCone10 = registerGeometry(new THREE.ConeGeometry(1, 1, 10));
  const gDodec0 = registerGeometry(new THREE.DodecahedronGeometry(1, 0));
  const gDodec1 = registerGeometry(new THREE.DodecahedronGeometry(1, 1));
  const gSphere7 = registerGeometry(new THREE.SphereGeometry(1, 7, 6));
  const gOct0 = registerGeometry(new THREE.OctahedronGeometry(1, 0));
  const gBox1 = registerGeometry(new THREE.BoxGeometry(1, 1, 1));
  const gCircle8 = registerGeometry(new THREE.CircleGeometry(1, 8));

  // 3D volumetric botanical leaf-spray cluster geometry (4 intersecting arched foliage cards, 16 tris)
  const gLeafSpray = (() => {
    const cards = [
      { rx: 0.16, ry: 0.0, rz: 0.0, yOff: 0.0, shade: 0.96 },
      { rx: 0.16, ry: Math.PI / 3, rz: 0.08, yOff: 0.06, shade: 1.02 },
      { rx: -0.16, ry: (Math.PI * 2) / 3, rz: -0.08, yOff: -0.04, shade: 0.92 },
      { rx: Math.PI * 0.44, ry: 0.35, rz: 0.0, yOff: 0.18, shade: 1.08 },
    ];
    const verts: number[] = [];
    const norms: number[] = [];
    const uvs: number[] = [];
    const cols: number[] = [];
    const indices: number[] = [];
    const q = new THREE.Euler();
    const mat4 = new THREE.Matrix4();
    const v = new THREE.Vector3();
    const n = new THREE.Vector3();
    let vBase = 0;
    for (const c of cards) {
      q.set(c.rx, c.ry, c.rz);
      mat4.makeRotationFromEuler(q);
      const pts: [number, number, number, number, number, number][] = [
        [-0.78, -0.58, 0.04, 0, 0, 0.72],
        [0.78, -0.58, 0.04, 1, 0, 0.72],
        [0.78, 0.62, -0.06, 1, 1, 1.08],
        [-0.78, 0.62, -0.06, 0, 1, 1.08],
      ];
      n.set(0, 0.38, 0.92).normalize().applyMatrix4(mat4);
      for (const [px, py, pz, pu, pv, br] of pts) {
        v.set(px, py, pz).applyMatrix4(mat4);
        verts.push(v.x, v.y + c.yOff, v.z);
        norms.push(n.x, Math.max(0.28, n.y), n.z);
        uvs.push(pu, pv);
        const s = br * c.shade;
        cols.push(Math.min(1.15, s), Math.min(1.15, s * 1.02), Math.min(1.1, s * 0.92));
      }
      indices.push(vBase, vBase + 1, vBase + 2, vBase, vBase + 2, vBase + 3);
      vBase += 4;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(norms, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    geo.setIndex(indices);
    return registerGeometry(geo);
  })();

  interface NodeVisualMeta {
    kind: ResourceNodeKind;
    x: number;
    y: number;
    z: number;
    scale: number;
    yaw: number;
    lean: number;
    seed: number;
  }
  const nodeMetaMap = new Map<string, NodeVisualMeta>();

  function addRootFlares(
    parent: THREE.Group,
    trunkMat: THREE.Material,
    count: number,
    spread: number,
    height: number,
    nodeRand: () => number,
  ) {
    for (let r = 0; r < count; r++) {
      const a = (r / count) * Math.PI * 2 + (nodeRand() - 0.5) * 0.38;
      const rootLen = height * (0.95 + nodeRand() * 0.35);
      const rootMesh = new THREE.Mesh(gCylTaper6, trunkMat);
      rootMesh.scale.set(0.23, rootLen, 0.23);
      rootMesh.position.set(Math.cos(a) * spread * 1.18, rootLen * 0.30, Math.sin(a) * spread * 1.18);
      rootMesh.rotation.z = Math.cos(a) * 0.78;
      rootMesh.rotation.x = -Math.sin(a) * 0.78;
      rootMesh.castShadow = shadowsEnabledState;
      parent.add(rootMesh);
    }
  }

  function addCrackOverlays(rockBody: THREE.Group, scaleR: number): THREE.Mesh[] {
    const cracks: THREE.Mesh[] = [];
    const offsets: [number, number, number, number, number][] = [
      [0.45 * scaleR, 0.55 * scaleR, 0.45 * scaleR, 0.4, 0.7],
      [-0.48 * scaleR, 0.52 * scaleR, 0.38 * scaleR, -0.5, 0.4],
      [0.12 * scaleR, 0.78 * scaleR, -0.48 * scaleR, 0.25, 1.1],
      [-0.32 * scaleR, 0.42 * scaleR, -0.45 * scaleR, -0.7, 0.2],
    ];
    offsets.forEach(([ox, oy, oz, rz, ry]) => {
      const crack = new THREE.Mesh(gBox1, crackMat);
      crack.scale.set(0.11 * scaleR, 0.56 * scaleR, 0.12 * scaleR);
      crack.position.set(ox, oy, oz);
      crack.rotation.set(0.3, ry, rz);
      crack.visible = false;
      rockBody.add(crack);
      cracks.push(crack);
    });
    return cracks;
  }

  function buildNodeMesh(meta: NodeVisualMeta): ResourceVisualHandle {
    const { kind, scale, lean, seed } = meta;
    const nodeRand = seededRand(seed);
    const root = new THREE.Group();

    if (kind === 'palm_tree') {
      const stumpMesh = new THREE.Group();
      addRootFlares(stumpMesh, palmTrunkMat, 5, 0.26, 0.52, nodeRand);
      const stumpBase = new THREE.Mesh(gCylTaper8, palmTrunkMat);
      stumpBase.scale.set(0.35, 0.65, 0.35);
      stumpBase.position.y = 0.32;
      stumpBase.castShadow = shadowsEnabledState;
      const stumpTop = new THREE.Mesh(gCircle8, heartwoodCutMat);
      stumpTop.scale.setScalar(0.27);
      stumpTop.rotation.x = -Math.PI / 2;
      stumpTop.position.y = 0.655;
      stumpMesh.add(stumpBase, stumpTop);
      root.add(stumpMesh);

      const felledPivot = new THREE.Group();
      felledPivot.position.y = 0.62;

      const trunkPivot = new THREE.Group();
      felledPivot.add(trunkPivot);

      // Four progressively narrower, gently leaning segment rings make a curved
      // palm stem from one shared tapered buffer.
      let curX = 0;
      let curY = 0;
      let radius = 0.255 * (0.94 + nodeRand() * 0.12);
      let trunkTilt = lean * 0.35;
      const SEGMENTS = 4;
      const SEG_HEIGHT = 1.32;
      for (let s = 0; s < SEGMENTS; s++) {
        trunkTilt += lean * 0.5 + (nodeRand() - 0.5) * 0.028;
        const segPivot = new THREE.Group();
        segPivot.position.set(curX, curY, 0);
        segPivot.rotation.z = trunkTilt;
        const seg = new THREE.Mesh(palmTrunkSegGeo, palmTrunkMat);
        seg.scale.set(radius, SEG_HEIGHT, radius);
        seg.castShadow = shadowsEnabledState;
        segPivot.add(seg);
        trunkPivot.add(segPivot);
        curX -= Math.sin(trunkTilt) * SEG_HEIGHT;
        curY += Math.cos(trunkTilt) * SEG_HEIGHT;
        radius *= 0.82;
      }

      const trunkCutBand = new THREE.Mesh(gCylStraight8, heartwoodCutMat);
      trunkCutBand.scale.set(0.285, 0.22, 0.285);
      trunkCutBand.position.y = 0.14;
      trunkCutBand.visible = false;
      felledPivot.add(trunkCutBand);

      const crown = new THREE.Group();
      crown.position.set(curX, curY, 0);
      trunkPivot.add(crown);

      // Fibrous leaf-boot collars hide the trunk/frond join.
      for (let b = 0; b < 3; b++) {
        const boot = new THREE.Mesh(palmBootGeo, palmTrunkMat);
        boot.scale.set(radius * (1.55 - b * 0.14), 0.55 + b * 0.14, radius * (1.55 - b * 0.14));
        boot.position.y = -0.02 - b * 0.13;
        boot.rotation.y = nodeRand() * Math.PI;
        boot.rotation.z = (nodeRand() - 0.5) * 0.12;
        crown.add(boot);
      }

      const coconutCount = 4 + Math.floor(nodeRand() * 3);
      for (let c = 0; c < coconutCount; c++) {
        const coco = new THREE.Mesh(gSphere7, coconutMat);
        coco.scale.set(0.135, 0.155, 0.135);
        const ca = (c / coconutCount) * Math.PI * 2 + 0.3;
        coco.position.set(
          Math.cos(ca) * (0.2 + nodeRand() * 0.12),
          -0.14 - (c % 2) * 0.1,
          Math.sin(ca) * (0.2 + nodeRand() * 0.12),
        );
        crown.add(coco);
      }

      // Irregular canopy: three pitch tiers, golden-angle spacing with jitter,
      // three shared frond shapes, and independent length/width scales.
      const frondCount = 18 + (nodeRand() < 0.4 ? 2 : 0);
      for (let f = 0; f < frondCount; f++) {
        const layer = f % 5;
        const a = f * 2.399963 + (nodeRand() - 0.5) * 0.34;
        const pitch =
          layer === 0
            ? 0.54 + nodeRand() * 0.14
            : layer === 1
              ? 0.32 + nodeRand() * 0.12
              : layer === 2
                ? 0.08 + nodeRand() * 0.12
                : layer === 3
                  ? -0.16 + nodeRand() * 0.12
                  : -0.44 + nodeRand() * 0.12;
        const spread =
          (layer === 0 ? 0.92 : layer === 1 ? 1.12 : layer === 2 ? 1.32 : layer === 3 ? 1.3 : 1.16) *
          (0.9 + nodeRand() * 0.24);
        const frond = new THREE.Mesh(
          palmFrondGeos[(f + Math.floor(seed * 0.001)) % palmFrondGeos.length],
          palmLeafMat,
        );
        frond.position.set(Math.cos(a) * 0.05, 0.02 + (layer === 0 ? 0.07 : 0), Math.sin(a) * 0.05);
        frond.rotation.set((nodeRand() - 0.5) * 0.16, a, pitch + (nodeRand() - 0.5) * 0.07);
        frond.scale.set(
          spread * (0.94 + nodeRand() * 0.14),
          spread * (0.9 + nodeRand() * 0.2),
          spread * (0.94 + nodeRand() * 0.16),
        );
        crown.add(frond);
      }

      // A couple of weathered, hanging dead fronds under the live canopy.
      for (let d = 0; d < 2; d++) {
        const dead = new THREE.Mesh(
          palmFrondGeos[d % palmFrondGeos.length],
          palmDeadFrondMat,
        );
        const da = nodeRand() * Math.PI * 2;
        dead.position.set(Math.cos(da) * 0.06, -0.04, Math.sin(da) * 0.06);
        dead.rotation.set(0, da, -1.02 + nodeRand() * 0.24);
        dead.scale.setScalar(0.72 + nodeRand() * 0.18);
        crown.add(dead);
      }
      root.add(felledPivot);
      root.scale.setScalar(scale);
      return { root, felledPivot, stumpMesh, trunkCutBand };
    }

    if (
      kind === 'tropical_tree' ||
      kind === 'oak_tree' ||
      kind === 'dark_oak_tree' ||
      kind === 'banyan_tree' ||
      kind === 'highland_cedar' ||
      kind === 'birch_tree' ||
      kind === 'old_growth_birch_tree' ||
      kind === 'pale_oak_tree' ||
      kind === 'taiga_pine_tree' ||
      kind === 'old_growth_pine_tree' ||
      kind === 'spruce_tree' ||
      kind === 'mega_spruce_tree' ||
      kind === 'snowy_spruce_tree' ||
      kind === 'jungle_tree' ||
      kind === 'mega_jungle_tree'
    ) {
      const isOak = kind === 'oak_tree';
      const isDarkOak = kind === 'dark_oak_tree';
      const isBanyan = kind === 'banyan_tree';
      const isCedar = kind === 'highland_cedar';
      const isBirch = kind === 'birch_tree' || kind === 'old_growth_birch_tree';
      const isOldBirch = kind === 'old_growth_birch_tree';
      const isPaleOak = kind === 'pale_oak_tree';
      const isPine = kind === 'taiga_pine_tree' || kind === 'old_growth_pine_tree';
      const isOldPine = kind === 'old_growth_pine_tree';
      const isSpruce =
        kind === 'spruce_tree' || kind === 'mega_spruce_tree' || kind === 'snowy_spruce_tree';
      const isMegaSpruce = kind === 'mega_spruce_tree';
      const isSnowySpruce = kind === 'snowy_spruce_tree';
      const isMegaJungle = kind === 'mega_jungle_tree';
      const isJungle = kind === 'jungle_tree' || isMegaJungle;

      const tMat = isDarkOak
        ? darkOakTrunkMat
        : isOak
          ? oakTrunkMat
          : isBanyan
            ? banyanTrunkMat
            : isCedar
              ? cedarTrunkMat
              : isBirch
                ? birchTrunkMat
                : isPaleOak
                  ? paleOakTrunkMat
                  : isPine
                    ? pineTrunkMat
                    : isSpruce
                      ? spruceTrunkMat
                      : isJungle
                        ? rainforestTrunkMat
                        : jungleTrunkMat;
      const lMat = isDarkOak
        ? darkOakLeafMat
        : isOak
          ? oakLeafMat
          : isBanyan
            ? banyanLeafMat
            : isCedar
              ? cedarLeafMat
              : isBirch
                ? birchLeafMat
                : isPaleOak
                  ? paleOakLeafMat
                  : isPine
                    ? pineLeafMat
                    : isSpruce
                      ? spruceLeafMat
                      : isJungle
                        ? rainforestLeafMat
                        : jungleLeafMat;
      const sprayMat = isDarkOak
        ? darkOakSprayMat
        : isOak
          ? oakSprayMat
          : isBanyan
            ? banyanSprayMat
            : isBirch
              ? birchSprayMat
              : isPaleOak
                ? paleOakSprayMat
                : isJungle
                  ? rainforestSprayMat
                  : jungleSprayMat;
      const baseR = isDarkOak
        ? 0.72
        : isMegaJungle
          ? 0.78
          : isMegaSpruce
            ? 0.64
            : isBanyan
              ? 0.62
              : isPaleOak
                ? 0.56
                : isJungle
                  ? 0.52
                  : isOldPine
                    ? 0.48
                    : isCedar || isSpruce || isOak
                      ? 0.46
                      : isBirch
                        ? 0.32
                        : 0.48;

      const stumpMesh = new THREE.Group();
      addRootFlares(
        stumpMesh,
        tMat,
        isBanyan || isJungle || isDarkOak || isOak ? 6 : 5,
        baseR * 1.05,
        0.95,
        nodeRand,
      );
      const stumpBase = new THREE.Mesh(gCylTaper8, tMat);
      stumpBase.scale.set(baseR * 1.18, 0.76, baseR * 1.18);
      stumpBase.position.y = 0.36;
      stumpBase.castShadow = shadowsEnabledState;
      const stumpTop = new THREE.Mesh(gCircle8, heartwoodCutMat);
      stumpTop.scale.setScalar(baseR * 0.88);
      stumpTop.rotation.x = -Math.PI / 2;
      stumpTop.position.y = 0.745;
      stumpMesh.add(stumpBase, stumpTop);
      root.add(stumpMesh);

      const felledPivot = new THREE.Group();
      felledPivot.position.y = 0.72;

      const trunkH = isOldBirch
        ? 9.2
        : isMegaJungle
          ? 9.4
          : isMegaSpruce
            ? 8.2
            : isOldPine
              ? 7.8
              : isJungle
                ? 6.4
                : isCedar || isSpruce
                  ? 5.8
                  : isPine
                    ? 5.4
                    : isDarkOak
                      ? 3.9
                      : isPaleOak
                        ? 4.0
                        : isOak || isBirch
                          ? 4.6
                          : isBanyan
                            ? 4.2
                            : 4.8;
      const trunkLeanX = (nodeRand() - 0.5) * 0.08;
      const trunkLeanZ = (nodeRand() - 0.5) * 0.08;
      const upperTrunk = new THREE.Mesh(gCylTaper6, tMat);
      upperTrunk.scale.set(baseR * 0.90, trunkH, baseR * 0.90);
      upperTrunk.position.set(trunkLeanX * 1.5, trunkH * 0.5, trunkLeanZ * 1.5);
      upperTrunk.rotation.set(trunkLeanZ, 0, -trunkLeanX);
      upperTrunk.castShadow = shadowsEnabledState;
      felledPivot.add(upperTrunk);

      const trunkCutBand = new THREE.Mesh(gCylStraight8, heartwoodCutMat);
      trunkCutBand.scale.set(baseR * 0.92, 0.28, baseR * 0.92);
      trunkCutBand.position.y = 0.16;
      trunkCutBand.visible = false;
      felledPivot.add(trunkCutBand);

      if (isBirch) {
        const markCount = isOldBirch ? 7 : 3;
        for (let m = 0; m < markCount; m++) {
          const band = new THREE.Mesh(gCylStraight8, birchBandMat);
          band.scale.set(baseR * 0.82, 0.12, baseR * 0.82);
          band.position.y = 0.85 + m * (trunkH * 0.13);
          felledPivot.add(band);
        }
      }

      if (isPaleOak) {
        const heart = new THREE.Mesh(gBox1, paleHeartGlowMat);
        heart.scale.set(baseR * 0.65, 0.42, baseR * 0.65);
        heart.position.set(baseR * 0.58, trunkH * 0.65, 0);
        felledPivot.add(heart);
      }

      if (isJungle) {
        for (let cp = 0; cp < (isMegaJungle ? 4 : 2); cp++) {
          const ca = cp * 1.7 + nodeRand() * 0.8;
          const pod = new THREE.Mesh(gDodec0, cocoaPodMat);
          pod.scale.set(0.16, 0.24, 0.16);
          pod.position.set(
            Math.cos(ca) * (baseR * 0.88),
            trunkH * (0.45 + cp * 0.12),
            Math.sin(ca) * (baseR * 0.88),
          );
          felledPivot.add(pod);
        }
      }

      if (isCedar || isSpruce || isPine) {
        const tiers = isMegaSpruce ? 6 : isOldPine ? 3 : 4;
        const startY = isOldPine ? trunkH * 0.64 : isMegaSpruce ? 1.85 : 1.9;
        const stepY = isOldPine ? 0.95 : isMegaSpruce ? 1.15 : 1.12;
        for (let tier = 0; tier < tiers; tier++) {
          const ty = startY + tier * stepY;
          const tr = (isMegaSpruce ? 3.1 : isOldPine ? 2.45 : 2.3) - tier * 0.36;
          const bough = new THREE.Mesh(gCone8, lMat);
          bough.scale.set(tr, isOldPine ? 1.35 : 1.65, tr);
          bough.position.y = ty;
          bough.castShadow = shadowsEnabledState;
          felledPivot.add(bough);

          if (isSnowySpruce) {
            const snowCap = new THREE.Mesh(gCone8, snowCapMat);
            snowCap.scale.set(tr * 0.9, 0.62, tr * 0.9);
            snowCap.position.y = ty + 0.5;
            felledPivot.add(snowCap);
          }
        }
      } else {
        const branchCount = isBanyan || isJungle || isPaleOak || isDarkOak || isOak ? 5 : 4;
        for (let b = 0; b < branchCount; b++) {
          const ba = (b / branchCount) * Math.PI * 2 + 0.35 + (nodeRand() - 0.5) * 0.24;
          const limbLen = isMegaJungle ? 3.2 : isJungle ? 2.6 : 2.3;
          const limbY = trunkH - 0.85 + (b % 2) * 0.35;
          const limb = new THREE.Mesh(gCylTaper6, tMat);
          limb.scale.set(isBirch ? 0.14 : 0.22, limbLen, isBirch ? 0.14 : 0.22);
          limb.position.set(
            Math.cos(ba) * (limbLen * 0.42),
            limbY + 0.48,
            Math.sin(ba) * (limbLen * 0.42),
          );
          limb.rotation.z = -Math.cos(ba) * 0.78;
          limb.rotation.x = Math.sin(ba) * 0.78;
          limb.castShadow = shadowsEnabledState;
          felledPivot.add(limb);

          // Secondary forked twig branch reaching outward into lower/mid crown
          const twigAngle = ba + (b % 2 === 0 ? 0.42 : -0.42);
          const twig = new THREE.Mesh(gCylTaper6, tMat);
          twig.scale.set(isBirch ? 0.08 : 0.12, limbLen * 0.65, isBirch ? 0.08 : 0.12);
          twig.position.set(
            Math.cos(ba) * (limbLen * 0.68) + Math.cos(twigAngle) * 0.42,
            limbY + 1.05,
            Math.sin(ba) * (limbLen * 0.68) + Math.sin(twigAngle) * 0.42,
          );
          twig.rotation.z = -Math.cos(twigAngle) * 0.88;
          twig.rotation.x = Math.sin(twigAngle) * 0.88;
          felledPivot.add(twig);

          if (isBanyan) {
            const prop = new THREE.Mesh(gCylStraight5, tMat);
            prop.scale.set(0.06, 2.7, 0.06);
            prop.position.set(Math.cos(ba) * 1.38, 1.45, Math.sin(ba) * 1.38);
            felledPivot.add(prop);
          }
          if (isJungle) {
            const vine = new THREE.Mesh(gCylStraight5, vineMat);
            vine.scale.set(0.055, isMegaJungle ? 3.8 : 2.6, 0.055);
            vine.position.set(
              Math.cos(ba) * (isMegaJungle ? 1.95 : 1.55),
              trunkH - (isMegaJungle ? 1.65 : 1.15),
              Math.sin(ba) * (isMegaJungle ? 1.95 : 1.55),
            );
            felledPivot.add(vine);
          }
          if (isPaleOak) {
            const moss = new THREE.Mesh(gCylTaper6, paleMossMat);
            moss.scale.set(0.14, 1.95, 0.14);
            moss.position.set(Math.cos(ba) * 1.32, trunkH - 0.85, Math.sin(ba) * 1.32);
            felledPivot.add(moss);
          }

          const clusterR = isMegaJungle
            ? 2.2
            : isDarkOak
              ? 2.05
              : isBanyan || isJungle
                ? 1.75
                : isPaleOak
                  ? 1.6
                  : isBirch
                    ? 1.25
                    : 1.55;
          const cx = Math.cos(ba) * (isDarkOak || isMegaJungle ? 1.72 : 1.48);
          const cy = trunkH + (isDarkOak ? 0.25 : 0.55) + (b % 2) * 0.3;
          const cz = Math.sin(ba) * (isDarkOak || isMegaJungle ? 1.72 : 1.48);

          // Shaded interior core casting dappled ground shadows
          const core = new THREE.Mesh(gDodec1, lMat);
          core.position.set(cx, cy, cz);
          core.scale.set(clusterR * 0.72, clusterR * 0.48, clusterR * 0.72);
          core.castShadow = shadowsEnabledState;
          felledPivot.add(core);

          // Layered perforated botanical leaf-spray clusters around each branch tip
          for (let s = 0; s < 2; s++) {
            const spray = new THREE.Mesh(gLeafSpray, sprayMat);
            const sa = ba + (s === 0 ? -0.25 : 0.35);
            spray.position.set(
              cx + Math.cos(sa) * (clusterR * 0.34),
              cy + (s === 0 ? 0.15 : 0.52),
              cz + Math.sin(sa) * (clusterR * 0.34),
            );
            spray.rotation.set(
              (nodeRand() - 0.5) * 0.35,
              nodeRand() * Math.PI * 2,
              (nodeRand() - 0.5) * 0.35,
            );
            const sc = clusterR * (s === 0 ? 1.35 : 1.15);
            spray.scale.set(sc, sc * 0.92, sc);
            felledPivot.add(spray);
          }
        }

        const topR = isMegaJungle
          ? 2.95
          : isDarkOak
            ? 2.65
            : isBanyan || isJungle
              ? 2.35
              : isPaleOak
                ? 2.1
                : isBirch
                  ? 1.65
                  : 2.05;
        const topCore = new THREE.Mesh(gDodec1, lMat);
        topCore.position.y = trunkH + (isDarkOak ? 0.85 : 1.15);
        topCore.scale.set(topR * 0.76, topR * 0.52, topR * 0.76);
        topCore.castShadow = shadowsEnabledState;
        felledPivot.add(topCore);

        // Billowing perforated top crown leaf clusters catching midday sunlight
        for (let tc = 0; tc < 4; tc++) {
          const ta = (tc / 4) * Math.PI * 2 + nodeRand() * 0.4;
          const dist = tc === 0 ? 0.15 : topR * 0.38;
          const topSpray = new THREE.Mesh(gLeafSpray, sprayMat);
          topSpray.position.set(
            Math.cos(ta) * dist,
            trunkH + (tc === 0 ? 1.65 : 1.25 + (tc % 2) * 0.28),
            Math.sin(ta) * dist,
          );
          topSpray.rotation.set(
            (nodeRand() - 0.5) * 0.25,
            nodeRand() * Math.PI * 2,
            (nodeRand() - 0.5) * 0.25,
          );
          const sc = topR * (tc === 0 ? 1.28 : 1.12);
          topSpray.scale.set(sc, sc * 0.9, sc);
          felledPivot.add(topSpray);
        }
      }

      root.add(felledPivot);
      root.scale.setScalar(scale);
      return { root, felledPivot, stumpMesh, trunkCutBand };
    }

    if (kind === 'huge_red_mushroom' || kind === 'huge_brown_mushroom') {
      const isRed = kind === 'huge_red_mushroom';
      const stumpMesh = new THREE.Group();
      const stumpBase = new THREE.Mesh(gCylStraight8, giantMushroomStemMat);
      stumpBase.scale.set(0.45, 0.68, 0.45);
      stumpBase.position.y = 0.34;
      stumpBase.castShadow = shadowsEnabledState;
      const stumpTop = new THREE.Mesh(gCircle8, heartwoodCutMat);
      stumpTop.scale.setScalar(0.39);
      stumpTop.rotation.x = -Math.PI / 2;
      stumpTop.position.y = 0.685;
      stumpMesh.add(stumpBase, stumpTop);
      root.add(stumpMesh);

      const felledPivot = new THREE.Group();
      felledPivot.position.y = 0.64;

      const stem = new THREE.Mesh(gCylStraight8, giantMushroomStemMat);
      const stemH = (isRed ? 3.8 : 4.2) - 0.62;
      stem.scale.set(0.44, stemH, 0.44);
      stem.position.y = stemH * 0.5;
      stem.castShadow = shadowsEnabledState;
      felledPivot.add(stem);

      const trunkCutBand = new THREE.Mesh(gCylStraight8, heartwoodCutMat);
      trunkCutBand.scale.set(0.45, 0.24, 0.45);
      trunkCutBand.position.y = 0.14;
      trunkCutBand.visible = false;
      felledPivot.add(trunkCutBand);

      if (isRed) {
        const cap = new THREE.Mesh(gSphere7, redMushroomCapMat);
        cap.scale.set(1.85, 1.15, 1.85);
        cap.position.y = stemH + 0.1;
        cap.castShadow = shadowsEnabledState;
        felledPivot.add(cap);
        for (let sp = 0; sp < 6; sp++) {
          const sa = (sp / 6) * Math.PI * 2;
          const spot = new THREE.Mesh(gDodec0, mushroomSpotMat);
          spot.scale.set(0.28, 0.14, 0.28);
          spot.position.set(Math.cos(sa) * 1.18, stemH + 0.65, Math.sin(sa) * 1.18);
          felledPivot.add(spot);
        }
      } else {
        const flatCap = new THREE.Mesh(gCylTaper8, brownMushroomCapMat);
        flatCap.scale.set(2.35, 0.46, 2.35);
        flatCap.position.y = stemH + 0.2;
        flatCap.castShadow = shadowsEnabledState;
        felledPivot.add(flatCap);
      }
      root.add(felledPivot);
      root.scale.setScalar(scale);
      return { root, felledPivot, stumpMesh, trunkCutBand };
    }

    if (kind === 'jungle_bush') {
      const coreTrunk = new THREE.Mesh(gCylStraight8, rainforestTrunkMat);
      coreTrunk.scale.set(0.26, 0.72, 0.26);
      coreTrunk.position.y = 0.36;
      const shrub = new THREE.Mesh(gDodec1, rainforestLeafMat);
      shrub.scale.set(1.42, 0.92, 1.42);
      shrub.position.y = 0.72;
      shrub.castShadow = shadowsEnabledState;
      root.add(coreTrunk, shrub);
      root.scale.setScalar(scale);
      return { root };
    }

    if (kind === 'mossy_cobble_boulder') {
      const rockBody = new THREE.Group();
      const baseRock = new THREE.Mesh(gDodec1, boulderMat);
      baseRock.scale.set(1.18, 0.85, 1.05);
      baseRock.position.y = 0.62;
      baseRock.castShadow = shadowsEnabledState;
      rockBody.add(baseRock);
      for (let m = 0; m < 4; m++) {
        const ma = (m / 4) * Math.PI * 2;
        const moss = new THREE.Mesh(gDodec0, mossyPatchMat);
        moss.scale.set(0.46, 0.24, 0.42);
        moss.position.set(Math.cos(ma) * 0.56, 0.88, Math.sin(ma) * 0.52);
        rockBody.add(moss);
      }
      const crackMeshes = addCrackOverlays(rockBody, 1.0);
      root.add(rockBody);
      root.scale.setScalar(scale);
      return { root, rockBody, crackMeshes };
    }

    if (kind === 'small_stone') {
      const rockBody = new THREE.Group();
      for (let i = 0; i < 4; i++) {
        const sr = 0.28 + (i % 2) * 0.12;
        const s = new THREE.Mesh(gDodec1, smallStoneMat);
        const a = (i / 4) * Math.PI * 2;
        s.position.set(Math.cos(a) * 0.28, 0.18, Math.sin(a) * 0.28);
        s.scale.set(sr * 1.15, sr * 0.72, sr * 1.0);
        s.castShadow = shadowsEnabledState;
        rockBody.add(s);
      }
      const crackMeshes = addCrackOverlays(rockBody, 0.45);
      root.add(rockBody);
      root.scale.setScalar(scale);
      return { root, rockBody, crackMeshes };
    }

    if (kind === 'stone_boulder') {
      const rockBody = new THREE.Group();
      const main = new THREE.Mesh(gDodec1, boulderMat);
      main.scale.set(1.08 * 1.18, 1.08 * 0.82, 1.08 * 1.02);
      main.position.y = 0.62;
      main.castShadow = shadowsEnabledState;
      const side = new THREE.Mesh(gDodec0, boulderMat);
      side.scale.setScalar(0.58);
      side.position.set(0.76, 0.36, 0.45);
      const chip = new THREE.Mesh(gDodec0, smallStoneMat);
      chip.scale.setScalar(0.36);
      chip.position.set(-0.72, 0.24, -0.32);
      rockBody.add(main, side, chip);
      const crackMeshes = addCrackOverlays(rockBody, 1.0);
      root.add(rockBody);
      root.scale.setScalar(scale);
      return { root, rockBody, crackMeshes };
    }

    if (kind === 'mountain_rock') {
      const rockBody = new THREE.Group();
      const peak = new THREE.Mesh(gDodec1, mountainRockMat);
      peak.scale.set(1.32 * 1.15, 1.32 * 1.18, 1.32 * 1.05);
      peak.position.y = 0.92;
      peak.castShadow = shadowsEnabledState;
      const shoulder = new THREE.Mesh(gDodec0, boulderMat);
      shoulder.scale.setScalar(0.78);
      shoulder.position.set(-0.82, 0.48, 0.46);
      const shelf = new THREE.Mesh(gDodec0, mountainRockMat);
      shelf.scale.setScalar(0.65);
      shelf.position.set(0.84, 0.42, -0.35);
      rockBody.add(peak, shoulder, shelf);
      const crackMeshes = addCrackOverlays(rockBody, 1.28);
      root.add(rockBody);
      root.scale.setScalar(scale);
      return { root, rockBody, crackMeshes };
    }

    if (kind === 'flint_outcrop') {
      const rockBody = new THREE.Group();
      const base = new THREE.Mesh(gDodec0, boulderMat);
      base.scale.set(0.62 * 1.2, 0.62 * 0.55, 0.62 * 1.1);
      base.position.y = 0.24;
      rockBody.add(base);
      for (let i = 0; i < 4; i++) {
        const shard = new THREE.Mesh(gCone5, flintMat);
        shard.scale.set(0.32, 0.92, 0.32);
        shard.position.set((i - 1.5) * 0.26, 0.45, ((i % 2) - 0.5) * 0.28);
        shard.rotation.z = (i - 1.5) * 0.28;
        shard.castShadow = shadowsEnabledState;
        rockBody.add(shard);
      }
      const crackMeshes = addCrackOverlays(rockBody, 0.72);
      root.add(rockBody);
      root.scale.setScalar(scale);
      return { root, rockBody, crackMeshes };
    }

    if (kind === 'ore_vein') {
      const rockBody = new THREE.Group();
      const rock = new THREE.Mesh(gDodec1, oreRockMat);
      rock.scale.set(1.12 * 1.12, 1.12 * 0.86, 1.12 * 1.0);
      rock.position.y = 0.65;
      rock.castShadow = shadowsEnabledState;
      rockBody.add(rock);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const nugget = new THREE.Mesh(gOct0, oreVeinMat);
        nugget.scale.setScalar(0.24);
        nugget.position.set(Math.cos(a) * 0.68, 0.72 + (i % 2) * 0.22, Math.sin(a) * 0.64);
        rockBody.add(nugget);
      }
      const crackMeshes = addCrackOverlays(rockBody, 1.02);
      root.add(rockBody);
      root.scale.setScalar(scale);
      return { root, rockBody, crackMeshes };
    }

    if (kind === 'branch_pile') {
      for (let i = 0; i < 4; i++) {
        const b = new THREE.Mesh(gCylStraight5, palmTrunkMat);
        b.scale.set(0.06, 1.35, 0.06);
        b.rotation.z = Math.PI / 2;
        b.rotation.y = i * 0.65;
        b.position.y = 0.08 + i * 0.03;
        root.add(b);
      }
    } else if (kind === 'wheat_patch') {
      for (let i = 0; i < 9; i++) {
        const stalk = new THREE.Mesh(gCylStraight5, wheatMat);
        stalk.scale.set(0.052, 1.25, 0.052);
        stalk.position.set((nodeRand() - 0.5) * 0.95, 0.62, (nodeRand() - 0.5) * 0.95);
        stalk.rotation.z = (nodeRand() - 0.5) * 0.22;
        root.add(stalk);
      }
    } else if (kind === 'sugarcane_patch') {
      for (let i = 0; i < 5; i++) {
        const ox = (nodeRand() - 0.5) * 0.65;
        const oz = (nodeRand() - 0.5) * 0.65;
        const h = 1.55 + nodeRand() * 0.45;
        const cane = new THREE.Mesh(gCylTaper6, sugarcaneMat);
        cane.scale.set(0.055, h, 0.055);
        cane.position.set(ox, h * 0.5, oz);
        cane.rotation.z = (nodeRand() - 0.5) * 0.14;
        const joint = new THREE.Mesh(gCylStraight8, sugarcaneNodeMat);
        joint.scale.set(0.06, 0.06, 0.06);
        joint.position.set(ox, h * 0.55, oz);
        const tuft = new THREE.Mesh(gCone4, sugarcaneNodeMat);
        tuft.scale.set(0.2, 0.55, 0.2);
        tuft.position.set(ox, h + 0.18, oz);
        root.add(cane, joint, tuft);
      }
    } else if (kind === 'grass_tuft') {
      for (let i = 0; i < 10; i++) {
        const blade = new THREE.Mesh(gGrassBlade, grassMat);
        blade.scale.set(0.14, 0.85, 0.14);
        blade.position.set((nodeRand() - 0.5) * 0.62, 0.01, (nodeRand() - 0.5) * 0.62);
        blade.rotation.set(
          (nodeRand() - 0.5) * 0.22,
          nodeRand() * Math.PI * 2,
          (nodeRand() - 0.5) * 0.5,
        );
        root.add(blade);
      }
    } else if (kind === 'berry_bush') {
      const bush = new THREE.Mesh(gDodec1, berryBushMat);
      bush.position.y = 0.55;
      bush.scale.set(0.78, 0.78 * 0.82, 0.78);
      bush.castShadow = shadowsEnabledState;
      root.add(bush);
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        const berry = new THREE.Mesh(gSphere7, berryFruitMat);
        berry.scale.setScalar(0.09);
        berry.position.set(Math.cos(a) * 0.62, 0.55 + (i % 2) * 0.22, Math.sin(a) * 0.62);
        root.add(berry);
      }
    } else if (kind === 'mushroom_cluster') {
      for (let i = 0; i < 4; i++) {
        const mx = (i - 1.5) * 0.24;
        const mz = ((i % 2) - 0.5) * 0.26;
        const stem = new THREE.Mesh(gCylStraight5, mushroomStemMat);
        stem.scale.set(0.06, 0.26, 0.06);
        stem.position.set(mx, 0.13, mz);
        const cap = new THREE.Mesh(gCone8, mushroomCapMat);
        cap.scale.set(0.18, 0.14, 0.18);
        cap.position.set(mx, 0.28, mz);
        root.add(stem, cap);
      }
    } else if (kind === 'fiber_fern' || kind === 'plant_cluster') {
      for (let i = 0; i < 5; i++) {
        const leaf = new THREE.Mesh(gCone4, fernMat);
        leaf.scale.set(0.25, 1.1, 0.25);
        leaf.position.set(0, 0.35, 0);
        leaf.rotation.z = 0.72;
        leaf.rotation.y = (i / 5) * Math.PI * 2;
        root.add(leaf);
      }
    } else if (kind === 'clay_deposit') {
      const mound = new THREE.Mesh(gDodec1, clayMat);
      mound.scale.set(0.75 * 1.3, 0.75 * 0.45, 0.75 * 1.1);
      mound.position.y = 0.22;
      root.add(mound);
    } else if (kind === 'bamboo_stalk') {
      for (let i = 0; i < 5; i++) {
        const ox = (nodeRand() - 0.5) * 0.8;
        const oz = (nodeRand() - 0.5) * 0.8;
        const h = 3.6 + nodeRand() * 1.8;
        const culm = new THREE.Mesh(gCylStraight8, bambooCulmMat);
        culm.scale.set(0.075, h, 0.075);
        culm.position.set(ox, h * 0.5, oz);
        culm.rotation.z = (nodeRand() - 0.5) * 0.1;
        culm.castShadow = shadowsEnabledState;
        root.add(culm);
        for (let j = 1; j <= 3; j++) {
          const joint = new THREE.Mesh(gCylStraight8, bambooNodeMat);
          joint.scale.set(0.088, 0.055, 0.088);
          joint.position.set(ox, h * (j * 0.24), oz);
          root.add(joint);
        }
        const tuft = new THREE.Mesh(gCone4, birchLeafMat);
        tuft.scale.set(0.32, 0.75, 0.32);
        tuft.position.set(ox, h + 0.18, oz);
        root.add(tuft);
      }
    } else if (kind === 'flower_patch') {
      for (let i = 0; i < 8; i++) {
        const fx = (nodeRand() - 0.5) * 1.15;
        const fz = (nodeRand() - 0.5) * 1.15;
        const fh = 0.34 + nodeRand() * 0.3;
        const stem = new THREE.Mesh(gCylStraight5, fernMat);
        stem.scale.set(0.035, fh, 0.035);
        stem.position.set(fx, fh * 0.5, fz);
        const blossomMat = flowerMats[(i + seed) % flowerMats.length];
        const bloom = new THREE.Mesh(gDodec0, blossomMat);
        bloom.scale.set(0.14, 0.09, 0.14);
        bloom.position.set(fx, fh + 0.05, fz);
        root.add(stem, bloom);
      }
    } else if (kind === 'rose_bush' || kind === 'lilac_bush' || kind === 'peony_bush') {
      const bushH = kind === 'lilac_bush' ? 1.15 : 0.88;
      const foliage = new THREE.Mesh(gDodec1, oakLeafMat);
      foliage.scale.set(0.72, bushH * 0.72, 0.72);
      foliage.position.y = bushH * 0.55;
      root.add(foliage);
      const bloomMat =
        kind === 'rose_bush' ? roseRedMat : kind === 'lilac_bush' ? lilacMat : peonyPinkMat;
      for (let b = 0; b < 6; b++) {
        const ba = (b / 6) * Math.PI * 2;
        const bud = new THREE.Mesh(gSphere7, bloomMat);
        bud.scale.setScalar(0.14);
        bud.position.set(
          Math.cos(ba) * 0.45,
          bushH * (0.48 + (b % 3) * 0.2),
          Math.sin(ba) * 0.45,
        );
        root.add(bud);
      }
    } else if (kind === 'eyeblossom_patch') {
      for (let i = 0; i < 6; i++) {
        const fx = (nodeRand() - 0.5) * 0.95;
        const fz = (nodeRand() - 0.5) * 0.95;
        const stem = new THREE.Mesh(gCylStraight5, paleMossMat);
        stem.scale.set(0.038, 0.36, 0.038);
        stem.position.set(fx, 0.18, fz);
        const petal = new THREE.Mesh(gDodec0, eyeblossomGlowMat);
        petal.scale.set(0.15, 0.1, 0.15);
        petal.position.set(fx, 0.4, fz);
        root.add(stem, petal);
      }
    } else if (kind === 'dead_bush') {
      for (let b = 0; b < 5; b++) {
        const twig = new THREE.Mesh(gCylTaper6, deadBushMat);
        twig.scale.set(0.045, 0.65 + (b % 2) * 0.25, 0.045);
        twig.position.set(0, 0.28, 0);
        twig.rotation.set(0.45, (b / 5) * Math.PI * 2, 0.35);
        root.add(twig);
      }
    } else if (kind === 'melon_patch') {
      for (let m = 0; m < 2; m++) {
        const mx = (m === 0 ? -0.35 : 0.38);
        const mz = (m === 0 ? 0.25 : -0.22);
        const melon = new THREE.Mesh(gBox1, melonRindMat);
        melon.scale.set(0.56, 0.52, 0.56);
        melon.position.set(mx, 0.26, mz);
        melon.castShadow = shadowsEnabledState;
        const stripe = new THREE.Mesh(gBox1, melonStripeMat);
        stripe.scale.set(0.58, 0.14, 0.58);
        stripe.position.set(mx, 0.26, mz);
        root.add(melon, stripe);
      }
    } else if (kind === 'cherry_tree') {
      const stumpMesh = new THREE.Group();
      addRootFlares(stumpMesh, cherryTrunkMat, 4, 0.24, 0.48, nodeRand);
      const stumpBase = new THREE.Mesh(gCylTaper8, cherryTrunkMat);
      stumpBase.scale.set(0.32, 0.65, 0.32);
      stumpBase.position.y = 0.32;
      const stumpTop = new THREE.Mesh(gCircle8, heartwoodCutMat);
      stumpTop.scale.setScalar(0.24);
      stumpTop.rotation.x = -Math.PI / 2;
      stumpTop.position.y = 0.655;
      stumpMesh.add(stumpBase, stumpTop);
      root.add(stumpMesh);

      const felledPivot = new THREE.Group();
      felledPivot.position.y = 0.62;
      const trunk = new THREE.Mesh(gCylTaper8, cherryTrunkMat);
      trunk.scale.set(0.28, 3.6, 0.28);
      trunk.position.set(0.18, 1.8, 0);
      trunk.rotation.z = -0.14;
      trunk.castShadow = shadowsEnabledState;
      const trunkCutBand = new THREE.Mesh(gCylStraight8, heartwoodCutMat);
      trunkCutBand.scale.set(0.29, 0.22, 0.29);
      trunkCutBand.position.y = 0.14;
      trunkCutBand.visible = false;
      const branch = new THREE.Mesh(gCylTaper6, cherryTrunkMat);
      branch.scale.set(0.16, 2.2, 0.16);
      branch.position.set(-0.65, 2.8, 0.25);
      branch.rotation.z = 0.58;
      felledPivot.add(trunk, trunkCutBand, branch);
      // Sweeping layered pink cherry blossom canopies
      const canopyOffsets: [number, number, number, number, boolean][] = [
        [0.45, 4.1, 0, 1.85, false],
        [-1.15, 3.65, 0.35, 1.45, true],
        [1.45, 3.55, -0.45, 1.35, true],
        [0.15, 4.65, 0.55, 1.25, false],
        [-0.35, 3.9, -0.85, 1.3, true],
      ];
      canopyOffsets.forEach(([cx, cy, cz, cr, isLight]) => {
        const puff = new THREE.Mesh(gDodec1, isLight ? cherryBlossomLightMat : cherryLeafMat);
        puff.scale.set(cr * 0.72, cr * 0.48, cr * 0.72);
        puff.position.set(cx, cy, cz);
        puff.castShadow = shadowsEnabledState;
        const spray = new THREE.Mesh(gLeafSpray, isLight ? cherryLightSprayMat : cherrySprayMat);
        spray.position.set(cx, cy + 0.12, cz);
        spray.rotation.set((nodeRand() - 0.5) * 0.3, nodeRand() * Math.PI * 2, (nodeRand() - 0.5) * 0.3);
        spray.scale.set(cr * 1.28, cr * 0.96, cr * 1.28);
        felledPivot.add(puff, spray);
      });
      root.add(felledPivot);
      root.scale.setScalar(scale);
      return { root, felledPivot, stumpMesh, trunkCutBand };
    } else if (kind === 'bee_nest_oak') {
      const stumpMesh = new THREE.Group();
      addRootFlares(stumpMesh, oakTrunkMat, 5, 0.3, 0.62, nodeRand);
      const stumpBase = new THREE.Mesh(gCylTaper8, oakTrunkMat);
      stumpBase.scale.set(0.36, 0.65, 0.36);
      stumpBase.position.y = 0.32;
      const stumpTop = new THREE.Mesh(gCircle8, heartwoodCutMat);
      stumpTop.scale.setScalar(0.28);
      stumpTop.rotation.x = -Math.PI / 2;
      stumpTop.position.y = 0.655;
      stumpMesh.add(stumpBase, stumpTop);
      root.add(stumpMesh);

      const felledPivot = new THREE.Group();
      felledPivot.position.y = 0.6;
      const trunk = new THREE.Mesh(gCylTaper8, oakTrunkMat);
      trunk.scale.set(0.32, 3.6, 0.32);
      trunk.position.y = 1.8;
      trunk.castShadow = shadowsEnabledState;
      const trunkCutBand = new THREE.Mesh(gCylStraight8, heartwoodCutMat);
      trunkCutBand.scale.set(0.33, 0.24, 0.33);
      trunkCutBand.position.y = 0.14;
      trunkCutBand.visible = false;
      const crown = new THREE.Mesh(gDodec1, oakLeafMat);
      crown.scale.set(1.42, 0.95, 1.42);
      crown.position.y = 3.95;
      crown.castShadow = shadowsEnabledState;
      felledPivot.add(trunk, trunkCutBand, crown);
      for (let s = 0; s < 5; s++) {
        const sa = (s / 5) * Math.PI * 2 + nodeRand() * 0.4;
        const dist = s === 0 ? 0.1 : 1.05;
        const spray = new THREE.Mesh(gLeafSpray, oakSprayMat);
        spray.position.set(Math.cos(sa) * dist, s === 0 ? 4.35 : 3.75 + (s % 2) * 0.3, Math.sin(sa) * dist);
        spray.rotation.set((nodeRand() - 0.5) * 0.3, nodeRand() * Math.PI * 2, (nodeRand() - 0.5) * 0.3);
        spray.scale.set(1.85, 1.55, 1.85);
        felledPivot.add(spray);
      }
      // Hanging golden Bee Nest on the side of the trunk under the boughs
      const nest = new THREE.Mesh(gBox1, beeNestMat);
      nest.scale.set(0.55, 0.52, 0.55);
      nest.position.set(0.58, 2.65, 0.2);
      felledPivot.add(nest);
      root.add(felledPivot);
      root.scale.setScalar(scale);
      return { root, felledPivot, stumpMesh, trunkCutBand };
    } else if (kind === 'pink_petals') {
      for (let i = 0; i < 12; i++) {
        const px = (nodeRand() - 0.5) * 1.5;
        const pz = (nodeRand() - 0.5) * 1.5;
        const petal = new THREE.Mesh(gCircle8, i % 2 === 0 ? cherryLeafMat : cherryBlossomLightMat);
        petal.rotation.x = -Math.PI / 2;
        petal.scale.setScalar(0.14 + nodeRand() * 0.12);
        petal.position.set(px, 0.04, pz);
        root.add(petal);
      }
    } else if (kind === 'sunflower_patch') {
      for (let i = 0; i < 5; i++) {
        const sx = (nodeRand() - 0.5) * 1.15;
        const sz = (nodeRand() - 0.5) * 1.15;
        const sh = 1.35 + nodeRand() * 0.55;
        const stem = new THREE.Mesh(gCylStraight5, fernMat);
        stem.scale.set(0.055, sh, 0.055);
        stem.position.set(sx, sh * 0.5, sz);
        const petals = new THREE.Mesh(gCircle8, sunflowerPetalMat);
        petals.scale.setScalar(0.32);
        petals.position.set(sx, sh + 0.04, sz + 0.06);
        const disc = new THREE.Mesh(gCircle8, sunflowerCenterMat);
        disc.scale.setScalar(0.16);
        disc.position.set(sx, sh + 0.04, sz + 0.09);
        root.add(stem, petals, disc);
      }
    } else if (kind === 'ice_spike') {
      const rockBody = new THREE.Group();
      const isBlue = nodeRand() < 0.22;
      const spireH = 4.5 + nodeRand() * 6.5;
      const spireR = 0.7 + nodeRand() * 0.65;
      const spire = new THREE.Mesh(gCone5, isBlue ? blueIceMat : packedIceMat);
      spire.scale.set(spireR, spireH, spireR);
      spire.position.y = spireH * 0.48;
      spire.rotation.z = (nodeRand() - 0.5) * 0.16;
      spire.castShadow = shadowsEnabledState;
      const subSpire = new THREE.Mesh(gCone5, packedIceMat);
      subSpire.scale.set(spireR * 0.65, spireH * 0.55, spireR * 0.65);
      subSpire.position.set(spireR * 0.7, spireH * 0.26, spireR * 0.3);
      subSpire.rotation.z = -0.24;
      rockBody.add(spire, subSpire);
      root.add(rockBody);
      root.scale.setScalar(scale);
      return { root, rockBody };
    } else if (kind === 'emerald_ore_vein') {
      const rockBody = new THREE.Group();
      const rock = new THREE.Mesh(gDodec1, oreRockMat);
      rock.scale.set(1.15, 0.92, 1.05);
      rock.position.y = 0.62;
      rock.castShadow = shadowsEnabledState;
      rockBody.add(rock);
      for (let e = 0; e < 5; e++) {
        const ang = (e / 5) * Math.PI * 2;
        const gem = new THREE.Mesh(gOct0, emeraldCrystalMat);
        gem.scale.set(0.22, 0.28, 0.22);
        gem.position.set(Math.cos(ang) * 0.78, 0.52 + (e % 2) * 0.35, Math.sin(ang) * 0.78);
        rockBody.add(gem);
      }
      const crackMeshes = addCrackOverlays(rockBody, 1.15);
      root.add(rockBody);
      root.scale.setScalar(scale);
      return { root, rockBody, crackMeshes };
    } else if (kind === 'acacia_tree') {
      const stumpMesh = new THREE.Group();
      addRootFlares(stumpMesh, acaciaTrunkMat, 4, 0.24, 0.45, nodeRand);
      const stumpBase = new THREE.Mesh(gCylTaper8, acaciaTrunkMat);
      stumpBase.scale.set(0.3, 0.6, 0.3);
      stumpBase.position.y = 0.3;
      const stumpTop = new THREE.Mesh(gCircle8, heartwoodCutMat);
      stumpTop.scale.setScalar(0.23);
      stumpTop.rotation.x = -Math.PI / 2;
      stumpTop.position.y = 0.605;
      stumpMesh.add(stumpBase, stumpTop);
      root.add(stumpMesh);

      const felledPivot = new THREE.Group();
      felledPivot.position.y = 0.58;
      // Iconic diagonally angled Savanna Acacia trunk with flat umbrella canopy
      const trunk1 = new THREE.Mesh(gCylTaper8, acaciaTrunkMat);
      trunk1.scale.set(0.26, 2.8, 0.26);
      trunk1.position.set(0.28, 1.35, 0);
      trunk1.rotation.z = -0.22;
      trunk1.castShadow = shadowsEnabledState;
      const trunkCutBand = new THREE.Mesh(gCylStraight8, heartwoodCutMat);
      trunkCutBand.scale.set(0.27, 0.22, 0.27);
      trunkCutBand.position.y = 0.14;
      trunkCutBand.visible = false;
      const trunk2 = new THREE.Mesh(gCylTaper8, acaciaTrunkMat);
      trunk2.scale.set(0.2, 2.2, 0.2);
      trunk2.position.set(-0.45, 2.4, 0.25);
      trunk2.rotation.z = 0.36;
      const canopy1 = new THREE.Mesh(gCylTaper8, acaciaLeafMat);
      canopy1.scale.set(1.9, 0.45, 1.7);
      canopy1.position.set(0.7, 3.25, 0);
      canopy1.castShadow = shadowsEnabledState;
      const canopy2 = new THREE.Mesh(gCylTaper8, acaciaLeafMat);
      canopy2.scale.set(1.35, 0.38, 1.25);
      canopy2.position.set(-0.85, 3.65, 0.35);
      felledPivot.add(trunk1, trunkCutBand, trunk2, canopy1, canopy2);
      for (const [ax, ay, az, ar] of [[0.7, 3.35, 0, 2.5], [1.45, 3.3, 0.6, 1.85], [-0.85, 3.72, 0.35, 1.95]]) {
        const sp = new THREE.Mesh(gLeafSpray, acaciaSprayMat);
        sp.position.set(ax, ay, az);
        sp.rotation.set((nodeRand() - 0.5) * 0.16, nodeRand() * Math.PI * 2, (nodeRand() - 0.5) * 0.16);
        sp.scale.set(ar, ar * 0.48, ar);
        felledPivot.add(sp);
      }
      root.add(felledPivot);
      root.scale.setScalar(scale);
      return { root, felledPivot, stumpMesh, trunkCutBand };
    } else if (kind === 'swamp_oak_tree') {
      const stumpMesh = new THREE.Group();
      addRootFlares(stumpMesh, darkOakTrunkMat, 5, 0.3, 0.55, nodeRand);
      const stumpBase = new THREE.Mesh(gCylTaper8, darkOakTrunkMat);
      stumpBase.scale.set(0.36, 0.62, 0.36);
      stumpBase.position.y = 0.31;
      const stumpTop = new THREE.Mesh(gCircle8, heartwoodCutMat);
      stumpTop.scale.setScalar(0.28);
      stumpTop.rotation.x = -Math.PI / 2;
      stumpTop.position.y = 0.625;
      stumpMesh.add(stumpBase, stumpTop);
      root.add(stumpMesh);

      const felledPivot = new THREE.Group();
      felledPivot.position.y = 0.6;
      const trunk = new THREE.Mesh(gCylTaper8, darkOakTrunkMat);
      trunk.scale.set(0.32, 3.1, 0.32);
      trunk.position.y = 1.55;
      trunk.castShadow = shadowsEnabledState;
      const trunkCutBand = new THREE.Mesh(gCylStraight8, heartwoodCutMat);
      trunkCutBand.scale.set(0.33, 0.24, 0.33);
      trunkCutBand.position.y = 0.14;
      trunkCutBand.visible = false;
      const crown = new THREE.Mesh(gDodec1, mangroveLeafMat);
      crown.scale.set(1.55, 0.92, 1.55);
      crown.position.y = 3.5;
      crown.castShadow = shadowsEnabledState;
      felledPivot.add(trunk, trunkCutBand, crown);
      for (let s = 0; s < 5; s++) {
        const sa = (s / 5) * Math.PI * 2 + nodeRand() * 0.4;
        const dist = s === 0 ? 0.1 : 1.15;
        const sp = new THREE.Mesh(gLeafSpray, mangroveSprayMat);
        sp.position.set(Math.cos(sa) * dist, s === 0 ? 3.9 : 3.35 + (s % 2) * 0.25, Math.sin(sa) * dist);
        sp.rotation.set((nodeRand() - 0.5) * 0.28, nodeRand() * Math.PI * 2, (nodeRand() - 0.5) * 0.28);
        sp.scale.set(2.05, 1.45, 2.05);
        felledPivot.add(sp);
      }
      // Hanging swamp vines around the canopy rim
      for (let v = 0; v < 6; v++) {
        const ang = (v / 6) * Math.PI * 2;
        const vine = new THREE.Mesh(gCylStraight5, vineMat);
        vine.scale.set(0.06, 2.2, 0.06);
        vine.position.set(Math.cos(ang) * 1.75, 2.15, Math.sin(ang) * 1.75);
        felledPivot.add(vine);
      }
      root.add(felledPivot);
      root.scale.setScalar(scale);
      return { root, felledPivot, stumpMesh, trunkCutBand };
    } else if (kind === 'mangrove_tree') {
      const stumpMesh = new THREE.Group();
      // Tangled prop roots arching out of the mud
      for (let rIdx = 0; rIdx < 6; rIdx++) {
        const ang = (rIdx / 6) * Math.PI * 2;
        const propRoot = new THREE.Mesh(gCylTaper8, mangroveTrunkMat);
        propRoot.scale.set(0.14, 1.9, 0.14);
        propRoot.position.set(Math.cos(ang) * 0.65, 0.72, Math.sin(ang) * 0.65);
        propRoot.rotation.z = Math.cos(ang) * 0.45;
        propRoot.rotation.x = -Math.sin(ang) * 0.45;
        stumpMesh.add(propRoot);
      }
      const stumpTop = new THREE.Mesh(gCircle8, heartwoodCutMat);
      stumpTop.scale.setScalar(0.24);
      stumpTop.rotation.x = -Math.PI / 2;
      stumpTop.position.y = 1.16;
      stumpMesh.add(stumpTop);
      root.add(stumpMesh);

      const felledPivot = new THREE.Group();
      felledPivot.position.y = 1.15;
      const trunk = new THREE.Mesh(gCylTaper8, mangroveTrunkMat);
      trunk.scale.set(0.28, 3.2, 0.28);
      trunk.position.y = 1.55;
      trunk.castShadow = shadowsEnabledState;
      const trunkCutBand = new THREE.Mesh(gCylStraight8, heartwoodCutMat);
      trunkCutBand.scale.set(0.29, 0.22, 0.29);
      trunkCutBand.position.y = 0.14;
      trunkCutBand.visible = false;
      const crown = new THREE.Mesh(gDodec1, mangroveLeafMat);
      crown.scale.set(1.65, 0.95, 1.65);
      crown.position.y = 3.55;
      crown.castShadow = shadowsEnabledState;
      felledPivot.add(trunk, trunkCutBand, crown);
      for (let s = 0; s < 5; s++) {
        const sa = (s / 5) * Math.PI * 2 + nodeRand() * 0.4;
        const dist = s === 0 ? 0.1 : 1.25;
        const sp = new THREE.Mesh(gLeafSpray, mangroveSprayMat);
        sp.position.set(Math.cos(sa) * dist, s === 0 ? 3.95 : 3.45 + (s % 2) * 0.25, Math.sin(sa) * dist);
        sp.rotation.set((nodeRand() - 0.5) * 0.28, nodeRand() * Math.PI * 2, (nodeRand() - 0.5) * 0.28);
        sp.scale.set(2.15, 1.55, 2.15);
        felledPivot.add(sp);
      }
      // Hanging mangrove propagules & vines
      for (let p = 0; p < 5; p++) {
        const ang = (p / 5) * Math.PI * 2 + 0.3;
        const prop = new THREE.Mesh(gCylStraight5, vineMat);
        prop.scale.set(0.05, 1.5, 0.05);
        prop.position.set(Math.cos(ang) * 1.45, 2.35, Math.sin(ang) * 1.45);
        felledPivot.add(prop);
      }
      root.add(felledPivot);
      root.scale.setScalar(scale);
      return { root, felledPivot, stumpMesh, trunkCutBand };
    } else if (kind === 'cactus_plant') {
      const mainStem = new THREE.Mesh(gBox1, cactusMat);
      const ch = 2.1 + nodeRand() * 1.4;
      mainStem.scale.set(0.58, ch, 0.58);
      mainStem.position.y = ch * 0.5;
      mainStem.castShadow = shadowsEnabledState;
      root.add(mainStem);
      if (nodeRand() < 0.75) {
        const arm1 = new THREE.Mesh(gBox1, cactusMat);
        arm1.scale.set(0.42, 0.95, 0.42);
        arm1.position.set(0.48, ch * 0.62, 0);
        const arm1Join = new THREE.Mesh(gBox1, cactusMat);
        arm1Join.scale.set(0.45, 0.38, 0.42);
        arm1Join.position.set(0.26, ch * 0.45, 0);
        root.add(arm1, arm1Join);
      }
      if (nodeRand() < 0.55) {
        const arm2 = new THREE.Mesh(gBox1, cactusMat);
        arm2.scale.set(0.4, 0.85, 0.4);
        arm2.position.set(-0.46, ch * 0.72, 0);
        const arm2Join = new THREE.Mesh(gBox1, cactusMat);
        arm2Join.scale.set(0.45, 0.36, 0.4);
        arm2Join.position.set(-0.24, ch * 0.56, 0);
        root.add(arm2, arm2Join);
      }
    } else if (kind === 'blue_orchid_patch') {
      for (let i = 0; i < 6; i++) {
        const fx = (nodeRand() - 0.5) * 1.1;
        const fz = (nodeRand() - 0.5) * 1.1;
        const stem = new THREE.Mesh(gCylStraight5, fernMat);
        stem.scale.set(0.04, 0.45, 0.04);
        stem.position.set(fx, 0.22, fz);
        const bloom = new THREE.Mesh(gOct0, blueOrchidMat);
        bloom.scale.setScalar(0.14);
        bloom.position.set(fx, 0.48, fz);
        root.add(stem, bloom);
      }
    } else if (kind === 'gold_ore_vein') {
      const rockBody = new THREE.Group();
      const rock = new THREE.Mesh(gDodec1, terracottaRedMat);
      rock.scale.set(1.15, 0.9, 1.05);
      rock.position.y = 0.6;
      rock.castShadow = shadowsEnabledState;
      rockBody.add(rock);
      for (let g = 0; g < 6; g++) {
        const ang = (g / 6) * Math.PI * 2;
        const nugget = new THREE.Mesh(gOct0, goldOreCrystalMat);
        nugget.scale.set(0.22, 0.22, 0.22);
        nugget.position.set(Math.cos(ang) * 0.78, 0.48 + (g % 2) * 0.32, Math.sin(ang) * 0.78);
        rockBody.add(nugget);
      }
      const crackMeshes = addCrackOverlays(rockBody, 1.15);
      root.add(rockBody);
      root.scale.setScalar(scale);
      return { root, rockBody, crackMeshes };
    } else if (kind === 'terracotta_spire') {
      // Eroded Badlands tall layered terracotta hoodoo spire
      const rockBody = new THREE.Group();
      const totalH = 6.0 + nodeRand() * 6.5;
      const tiers = 4;
      const tierMats = [terracottaRedMat, terracottaOrangeMat, terracottaYellowMat, terracottaOrangeMat];
      for (let t = 0; t < tiers; t++) {
        const th = totalH / tiers;
        const tr = (1.15 - t * 0.22) * (0.85 + nodeRand() * 0.3);
        const seg = new THREE.Mesh(gCylTaper8, tierMats[t % tierMats.length]);
        seg.scale.set(tr, th + 0.15, tr);
        seg.position.y = t * th + th * 0.5;
        seg.castShadow = shadowsEnabledState;
        rockBody.add(seg);
      }
      root.add(rockBody);
      root.scale.setScalar(scale);
      return { root, rockBody };
    } else if (kind === 'coral_cluster') {
      const coralMats = [coralPinkMat, coralCyanMat, coralYellowMat];
      for (let cIdx = 0; cIdx < 5; cIdx++) {
        const ang = (cIdx / 5) * Math.PI * 2;
        const radC = 0.35 + nodeRand() * 0.75;
        const branch = new THREE.Mesh(gDodec1, coralMats[cIdx % coralMats.length]);
        branch.scale.set(0.45 + nodeRand() * 0.35, 0.65 + nodeRand() * 0.7, 0.45 + nodeRand() * 0.35);
        branch.position.set(Math.cos(ang) * radC, 0.45, Math.sin(ang) * radC);
        root.add(branch);
      }
    } else if (kind === 'bean_patch') {
      // Climbing Wild Island Bean poles with lush vines & green/golden bean pods
      for (let p = 0; p < 3; p++) {
        const ang = (p / 3) * Math.PI * 2;
        const px = Math.cos(ang) * 0.42;
        const pz = Math.sin(ang) * 0.42;
        const pole = new THREE.Mesh(gCylStraight5, oakTrunkMat);
        pole.scale.set(0.055, 1.55, 0.055);
        pole.position.set(px, 0.78, pz);
        pole.rotation.z = -Math.cos(ang) * 0.14;
        pole.rotation.x = Math.sin(ang) * 0.14;
        const foliage = new THREE.Mesh(gDodec1, sugarcaneMat);
        foliage.scale.set(0.38, 0.62, 0.38);
        foliage.position.set(px * 0.75, 0.95, pz * 0.75);
        const pod = new THREE.Mesh(gOct0, p % 2 === 0 ? wheatMat : berryBushMat);
        pod.scale.set(0.11, 0.24, 0.11);
        pod.position.set(px * 0.9 + 0.12, 0.85, pz * 0.9);
        root.add(pole, foliage, pod);
      }
    } else if (kind === 'sand_mound') {
      const mound = new THREE.Mesh(gCone10, sandMoundMat);
      mound.scale.set(0.95, 0.55, 0.95);
      mound.position.y = 0.26;
      root.add(mound);
    } else {
      const crate = new THREE.Mesh(gBox1, crateMat);
      crate.scale.set(0.95, 0.85, 0.95);
      crate.position.y = 0.425;
      crate.castShadow = shadowsEnabledState;
      root.add(crate);
    }

    root.scale.setScalar(scale);
    return { root };
  }

  function batchStandingNode(id: string, meta: NodeVisualMeta): void {
    // Build temporary visual hierarchy once to extract exact world matrices per sub-mesh into InstancedMesh pools
    const tempHandle = buildNodeMesh(meta);
    tempHandle.root.position.set(meta.x, meta.y, meta.z);
    tempHandle.root.rotation.y = meta.yaw;
    tempHandle.root.updateMatrixWorld(true);

    const noShadowKind =
      meta.kind === 'wheat_patch' ||
      meta.kind === 'grass_tuft' ||
      meta.kind === 'fiber_fern' ||
      meta.kind === 'plant_cluster' ||
      meta.kind === 'flower_patch' ||
      meta.kind === 'rose_bush' ||
      meta.kind === 'lilac_bush' ||
      meta.kind === 'peony_bush' ||
      meta.kind === 'eyeblossom_patch' ||
      meta.kind === 'dead_bush' ||
      meta.kind === 'mushroom_cluster' ||
      meta.kind === 'branch_pile' ||
      meta.kind === 'clay_deposit' ||
      meta.kind === 'sand_mound';

    const secX = Math.floor(meta.x / 64);
    const secZ = Math.floor(meta.z / 64);
    const isSmallGroundScatter = noShadowKind && meta.kind !== 'wheat_patch';
    const chunkCx = (secX + 0.5) * 64;
    const chunkCz = (secZ + 0.5) * 64;

    tempHandle.root.traverse((child) => {
      if (!(child instanceof THREE.Mesh) || !child.visible) return;
      const mat = Array.isArray(child.material) ? child.material[0] : child.material;
      const geoId = child.geometry.uuid;
      const matId = mat.uuid;
      const castShadow = !noShadowKind && child.castShadow;
      const batchKey = `res_${secX}_${secZ}_${geoId}_${matId}_${castShadow ? 1 : 0}`;
      addBatchInstance(batchKey, child.geometry, mat, child.matrixWorld, {
        castShadow,
        receiveShadow: !noShadowKind,
        foliageScatter: isSmallGroundScatter,
        cx: chunkCx,
        cz: chunkCz,
        nodeId: id,
      });
    });
  }

  function addResourceNode(
    id: string,
    kind: ResourceNodeKind,
    x: number,
    z: number,
    scale = 1,
    hasCollider = false,
  ) {
    const y = getTerrainHeight(x, z);
    const maxHp =
      kind === 'banyan_tree' ||
      kind === 'dark_oak_tree' ||
      kind === 'mountain_rock' ||
      kind === 'jungle_tree' ||
      kind === 'mega_jungle_tree' ||
      kind === 'mega_spruce_tree' ||
      kind === 'old_growth_pine_tree' ||
      kind === 'old_growth_birch_tree'
        ? 5
        : kind === 'tropical_tree' ||
            kind === 'oak_tree' ||
            kind === 'highland_cedar' ||
            kind === 'birch_tree' ||
            kind === 'pale_oak_tree' ||
            kind === 'taiga_pine_tree' ||
            kind === 'spruce_tree' ||
            kind === 'snowy_spruce_tree' ||
            kind === 'huge_red_mushroom' ||
            kind === 'huge_brown_mushroom' ||
            kind === 'stone_boulder' ||
            kind === 'mossy_cobble_boulder' ||
            kind === 'ore_vein'
          ? 4
          : kind === 'palm_tree' ||
              kind === 'flint_outcrop' ||
              kind === 'bamboo_stalk' ||
              kind === 'jungle_bush'
            ? 3
            : kind === 'small_stone'
              ? 2
              : 1;
    const node: ResourceNodeState = {
      id,
      kind,
      x,
      y,
      z,
      scale,
      hp: maxHp,
      maxHp,
      respawnTimer: 0,
      felled: false,
      fallTimer: 0,
    };
    resourceNodes.push(node);

    const yaw = rand() * Math.PI * 2;
    const lean = (rand() - 0.5) * 0.26;
    const seed = Math.max(1, Math.floor(rand() * 2147483640));
    const meta: NodeVisualMeta = { kind, x, y, z, scale, yaw, lean, seed };
    nodeMetaMap.set(id, meta);
    batchStandingNode(id, meta);

    if (hasCollider) {
      const isTree =
        kind === 'palm_tree' ||
        kind === 'tropical_tree' ||
        kind === 'oak_tree' ||
        kind === 'dark_oak_tree' ||
        kind === 'huge_red_mushroom' ||
        kind === 'huge_brown_mushroom' ||
        kind === 'banyan_tree' ||
        kind === 'highland_cedar' ||
        kind === 'birch_tree' ||
        kind === 'old_growth_birch_tree' ||
        kind === 'pale_oak_tree' ||
        kind === 'taiga_pine_tree' ||
        kind === 'old_growth_pine_tree' ||
        kind === 'spruce_tree' ||
        kind === 'mega_spruce_tree' ||
        kind === 'snowy_spruce_tree' ||
        kind === 'jungle_tree' ||
        kind === 'mega_jungle_tree';
      colliders.push({
        x,
        z,
        radius: (isTree ? 0.34 : 0.65) * scale,
        nodeId: id,
      });
    }
  }

  // Shipwreck Crates along the Southern Landing Beach (collision-free for unblocked movement)
  [
    [-3.8, 114.5],
    [5.6, 116.2],
    [-8.5, 120.0],
    [9.8, 121.0],
  ].forEach(([cx, cz], idx) => {
    addResourceNode(`shipwreck_crate_${idx}`, 'shipwreck_crate', cx, cz, 1.0, false);
  });

  // Cleanly framed coastal & forest-edge starter nodes (zero scattered ground clutter on landing meadow)
  const starterResources: [ResourceNodeKind, number, number][] = [
    ['palm_tree', -14, 104],
    ['palm_tree', 14, 103],
    ['palm_tree', -19, 94],
    ['tropical_tree', 17, 90],
    ['banyan_tree', -18, 82],
    ['flint_outcrop', 12, 101],
    ['fiber_fern', 10, 95],
    ['berry_bush', 8, 91],
    ['mushroom_cluster', 15, 88],
  ];
  starterResources.forEach(([kind, x, z], idx) => {
    addResourceNode(
      `starter_${idx}`,
      kind,
      x,
      z,
      0.95 + rand() * 0.25,
      kind === 'palm_tree' ||
        kind === 'tropical_tree' ||
        kind === 'banyan_tree' ||
        kind === 'stone_boulder',
    );
  });

  // Curated arching palms & tropical coastal nodes framing the southern PLAYER_SPAWN beach cove (walk path clear)
  const coveFramingNodes: [ResourceNodeKind, number, number, number][] = [
    ['palm_tree', PLAYER_SPAWN.x + 14.5, PLAYER_SPAWN.z - 15.5, 1.24],
    ['palm_tree', PLAYER_SPAWN.x - 16.5, PLAYER_SPAWN.z - 14.0, 1.18],
    ['palm_tree', PLAYER_SPAWN.x + 22.0, PLAYER_SPAWN.z - 6.0, 1.12],
    ['palm_tree', PLAYER_SPAWN.x - 24.0, PLAYER_SPAWN.z - 5.5, 1.15],
    ['palm_tree', PLAYER_SPAWN.x + 29.0, PLAYER_SPAWN.z - 19.0, 1.08],
    ['palm_tree', PLAYER_SPAWN.x - 30.0, PLAYER_SPAWN.z - 18.0, 1.10],
    ['fiber_fern', PLAYER_SPAWN.x + 11.5, PLAYER_SPAWN.z - 10.5, 1.05],
    ['fiber_fern', PLAYER_SPAWN.x - 12.0, PLAYER_SPAWN.z - 11.0, 1.0],
    ['berry_bush', PLAYER_SPAWN.x + 16.0, PLAYER_SPAWN.z - 12.0, 1.08],
  ];
  coveFramingNodes.forEach(([kind, cx, cz, sc], idx) => {
    if (getTerrainHeight(cx, cz) >= 0.45) {
      addResourceNode(
        `cove_frame_${idx}`,
        kind,
        cx,
        cz,
        sc,
        kind === 'palm_tree',
      );
    }
  });

  // Cave ore, mountain rocks & flint nodes
  [
    [CAVE_POS.x - 1.5, CAVE_POS.z - 2.2],
    [CAVE_POS.x + 1.8, CAVE_POS.z - 2.0],
    [CAVE_POS.x, CAVE_POS.z + 3.8],
    [CAVE_POS.x - 5.5, CAVE_POS.z + 4.5],
  ].forEach(([ox, oz], idx) => {
    addResourceNode(`cave_ore_${idx}`, 'ore_vein', ox, oz, 1.05, true);
  });

  // Expedition supply crates
  [
    [EXPEDITION_POS.x - 3.6, EXPEDITION_POS.z + 2.4],
    [EXPEDITION_POS.x + 3.2, EXPEDITION_POS.z + 0.2],
    [EXPEDITION_POS.x - 0.5, EXPEDITION_POS.z - 3.4],
  ].forEach(([cx, cz], idx) => {
    addResourceNode(`exp_crate_${idx}`, 'expedition_crate', cx, cz, 1.0, true);
  });

  // ==========================================================
  // GOLDEN WHEATFIELD, LAKE SUGARCANE, FARMER NPC & HILLTOP HOUSE
  // ==========================================================

  // A. Dedicated Golden Wheatfield (WHEATFIELD_POS) with Wooden Fence Border & Open Gate (batched)
  const wheatY = getTerrainHeight(WHEATFIELD_POS.x, WHEATFIELD_POS.z);
  const fencePostMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0x7c4d2b, map: woodTex, roughness: 0.88 }));
  const wfPostGeo = registerGeometry(new THREE.CylinderGeometry(0.09, 0.1, 1.15, 6));
  const wfRailGeo = registerGeometry(new THREE.BoxGeometry(2.15, 0.09, 0.09));
  const wfRadius = 7.4;
  for (let side = 0; side < 4; side++) {
    for (let p = -3; p <= 3; p++) {
      if ((side === 0 || side === 3) && Math.abs(p) <= 1) continue;
      const offset = p * 2.2;
      const px = side === 0 || side === 1 ? offset : side === 2 ? wfRadius : -wfRadius;
      const pz = side === 2 || side === 3 ? offset : side === 0 ? wfRadius : -wfRadius;
      batchDummy.position.set(WHEATFIELD_POS.x + px, wheatY + 0.56, WHEATFIELD_POS.z + pz);
      batchDummy.rotation.set(0, 0, 0);
      batchDummy.scale.set(1, 1, 1);
      batchDummy.updateMatrix();
      addBatchInstance('wf_post', wfPostGeo, fencePostMat, batchDummy.matrix, { castShadow: true });
      if (p < 3) {
        if (side >= 2) {
          batchDummy.position.set(WHEATFIELD_POS.x + px, wheatY + 0.82, WHEATFIELD_POS.z + pz + 1.1);
          batchDummy.rotation.set(0, Math.PI / 2, 0);
        } else {
          batchDummy.position.set(WHEATFIELD_POS.x + px + 1.1, wheatY + 0.82, WHEATFIELD_POS.z + pz);
          batchDummy.rotation.set(0, 0, 0);
        }
        batchDummy.scale.set(1, 1, 1);
        batchDummy.updateMatrix();
        addBatchInstance('wf_rail', wfRailGeo, fencePostMat, batchDummy.matrix);
      }
    }
  }

  // 20 Dense Harvestable Wheat Patches inside the Wheatfield (4 rows x 5 cols)
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 5; col++) {
      const wx = WHEATFIELD_POS.x - 4.4 + col * 2.2;
      const wz = WHEATFIELD_POS.z - 3.6 + row * 2.4;
      addResourceNode(`wheatfield_${row}_${col}`, 'wheat_patch', wx, wz, 1.12, false);
    }
  }

  // B. Lush Sugarcane Stands along Azure Lake, Farm Pond, and Crystal River
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const dist = LAKE_CENTER.radius + 1.2 + (i % 3) * 0.7;
    const sx = LAKE_CENTER.x + Math.cos(a) * dist;
    const sz = LAKE_CENTER.z + Math.sin(a) * dist;
    if (getTerrainHeight(sx, sz) > LAKE_CENTER.waterY - 0.15) {
      addResourceNode(`lake_sugarcane_${i}`, 'sugarcane_patch', sx, sz, 1.05, false);
    }
  }
  [
    [FARM_POND_POS.x + 4.8, FARM_POND_POS.z + 1.2],
    [FARM_POND_POS.x + 4.4, FARM_POND_POS.z - 2.0],
    [FARM_POND_POS.x - 4.8, FARM_POND_POS.z + 1.6],
    [FARM_POND_POS.x - 4.2, FARM_POND_POS.z - 2.6],
    [12, 20],
    [18, 30],
    [24, 42],
    [36, 52],
    [42, 62],
    [54, 72],
  ].forEach(([sx, sz], idx) => {
    addResourceNode(`river_sugarcane_${idx}`, 'sugarcane_patch', sx, sz, 1.0, false);
  });

  // C. Unplayable Farmer NPC, Vegetable Market Stall & 12 Tilled Crop Garden Beds
  const farmerGroundY = getTerrainHeight(FARMER_POS.x, FARMER_POS.z);
  const { group: farmerNpcGroup, head: farmerHead, armR: farmerArmR } = createFarmerNpcModel();
  farmerNpcGroup.position.set(FARMER_POS.x, farmerGroundY, FARMER_POS.z);
  overworldGroup.add(farmerNpcGroup);
  colliders.push({ x: FARMER_POS.x, z: FARMER_POS.z, radius: 0.45 });

  // Rustic Wooden Farm Market Stall right behind Farmer NPC
  const stallGroup = new THREE.Group();
  stallGroup.position.set(FARMER_POS.x, farmerGroundY, FARMER_POS.z - 1.9);
  const counterMat = new THREE.MeshStandardMaterial({ color: 0x85532a, map: woodTex, roughness: 0.85 });
  const awningMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.8 });
  const awningStripeMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.85 });
  const counter = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.95, 1.1), counterMat);
  counter.position.y = 0.48;
  counter.castShadow = true;
  stallGroup.add(counter);
  [-1.55, 1.55].forEach((px) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 2.5, 7), fencePostMat);
    post.position.set(px, 1.25, -0.4);
    stallGroup.add(post);
  });
  for (let s = 0; s < 5; s++) {
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.1, 1.85),
      s % 2 === 0 ? awningMat : awningStripeMat,
    );
    strip.position.set(-1.4 + s * 0.7, 2.42, 0.15);
    strip.rotation.x = 0.25;
    stallGroup.add(strip);
  }
  // Display vegetable crates on market counter (tomato, lettuce, cucumber, jalapeno)
  [
    [-1.1, 0xef4444],
    [-0.38, 0x4ade80],
    [0.36, 0x22c55e],
    [1.1, 0xfacc15],
  ].forEach(([cx, col]) => {
    const tray = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.16, 0.56), counterMat);
    tray.position.set(cx, 1.03, 0.1);
    const produce = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 8, 7),
      new THREE.MeshStandardMaterial({ color: col, roughness: 0.55 }),
    );
    produce.scale.set(1.2, 0.65, 1.2);
    produce.position.set(cx, 1.12, 0.1);
    stallGroup.add(tray, produce);
  });
  overworldGroup.add(stallGroup);
  staticMergeTargets.push({ group: stallGroup });
  colliders.push({ x: FARMER_POS.x - 0.9, z: FARMER_POS.z - 1.9, radius: 0.7 });
  colliders.push({ x: FARMER_POS.x + 0.9, z: FARMER_POS.z - 1.9, radius: 0.7 });

  // 12 Tilled Wooden-Framed Crop Garden Beds right beside the Farmer & Wheatfield (batched)
  const soilPlots: { x: number; y: number; z: number }[] = [];
  const bedSoilMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0x4a2e16, roughness: 0.96 }));
  const bedRimGeo = registerGeometry(new THREE.BoxGeometry(1.32, 0.14, 1.32));
  const bedDirtGeo = registerGeometry(new THREE.BoxGeometry(1.14, 0.16, 1.14));
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 6; col++) {
      const gx = FARMER_POS.x - 4.0 + col * 1.55;
      const gz = FARMER_POS.z + 3.2 + row * 1.85;
      const gy = getTerrainHeight(gx, gz);
      batchDummy.position.set(gx, gy + 0.06, gz);
      batchDummy.rotation.set(0, 0, 0);
      batchDummy.scale.set(1, 1, 1);
      batchDummy.updateMatrix();
      addBatchInstance('bed_rim', bedRimGeo, counterMat, batchDummy.matrix);

      batchDummy.position.set(gx, gy + 0.07, gz);
      batchDummy.updateMatrix();
      addBatchInstance('bed_dirt', bedDirtGeo, bedSoilMat, batchDummy.matrix, { receiveShadow: true });
      soilPlots.push({ x: gx, y: gy + 0.15, z: gz });
    }
  }

  // D. Premade Fully Furnished House on a Hill (HILL_HOUSE_POS, grounded directly on hilltop terrain)
  const hillHouseGroundY = getTerrainHeight(HILL_HOUSE_POS.x, HILL_HOUSE_POS.z);
  const hillHouse = createHilltopHouse(
    HILL_HOUSE_POS.x,
    hillHouseGroundY,
    HILL_HOUSE_POS.z,
    woodTex,
  );
  overworldGroup.add(hillHouse.group);
  staticMergeTargets.push({
    group: hillHouse.group,
    protectedObjs: [hillHouse.tvScreenMesh],
  });
  hillHouse.colliders.forEach((hc) => colliders.push(hc));

  // E. Expanded Covered 3-Bay Custom Vehicle Garage Zone Beside the Shelter (VEHICLE_GARAGE_POS)
  const garageGroundY = getTerrainHeight(VEHICLE_GARAGE_POS.x, VEHICLE_GARAGE_POS.z);
  const garageGroup = new THREE.Group();
  garageGroup.position.set(VEHICLE_GARAGE_POS.x, garageGroundY, VEHICLE_GARAGE_POS.z);

  const concretePbr = getPolishedConcretePbr(maxAniso);
  const concreteBaseMat = new THREE.MeshStandardMaterial({
    color: 0x6b7280,
    map: concretePbr.map,
    normalMap: concretePbr.normalMap,
    normalScale: new THREE.Vector2(0.45, 0.45),
    roughnessMap: concretePbr.roughnessMap,
    roughness: 0.22,
    metalness: 0.28,
    envMapIntensity: 1.35,
  });
  const concreteBayPadMat = new THREE.MeshStandardMaterial({
    color: 0x4b5563,
    map: concretePbr.map,
    normalMap: concretePbr.normalMap,
    normalScale: new THREE.Vector2(0.35, 0.35),
    roughnessMap: concretePbr.roughnessMap,
    roughness: 0.2,
    metalness: 0.32,
    envMapIntensity: 1.45,
  });
  const apronMat = new THREE.MeshStandardMaterial({
    color: 0x78716c,
    map: concretePbr.map,
    normalMap: concretePbr.normalMap,
    normalScale: new THREE.Vector2(0.48, 0.48),
    roughnessMap: concretePbr.roughnessMap,
    roughness: 0.28,
    metalness: 0.22,
    envMapIntensity: 1.25,
  });
  const steelFrameMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.36,
    metalness: 0.78,
  });
  const timberPostMat = new THREE.MeshStandardMaterial({
    color: 0x6b4226,
    map: woodTex,
    roughness: 0.85,
  });
  const garageRoofMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.55,
    metalness: 0.48,
  });
  const bayTrimMats = [
    new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.65,
      roughness: 0.25,
    }),
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.65,
      roughness: 0.25,
    }),
    new THREE.MeshStandardMaterial({
      color: 0xe879f9,
      emissive: 0xc026d3,
      emissiveIntensity: 0.7,
      roughness: 0.25,
    }),
    new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      emissive: 0xe2e8f0,
      emissiveIntensity: 0.75,
      roughness: 0.2,
    }),
  ];
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.88 });
  const toolMetalMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.88,
    roughness: 0.2,
  });
  const toolChestRedMat = new THREE.MeshStandardMaterial({
    color: 0xb91c1c,
    roughness: 0.32,
    metalness: 0.55,
  });

  // Main leveled polished reflective concrete foundation pad (28.0m x 13.0m for 4 bays)
  const garagePad = new THREE.Mesh(
    ensureGeometryHasUv(roundedBox(28.0, 0.18, 13.0, 0.18, 3)),
    concreteBaseMat,
  );
  garagePad.position.set(0, 0.04, 0);
  garagePad.receiveShadow = true;
  garagePad.castShadow = false;
  garagePad.userData.noShadowCast = true;
  garagePad.userData.preserveEnvMapIntensity = true;
  garageGroup.add(garagePad);

  // Wide beveled polished concrete driveway apron leading south (+Z) onto the island trails & beach
  const driveApron = new THREE.Mesh(
    ensureGeometryHasUv(roundedBox(28.6, 0.12, 3.8, 0.12, 2)),
    apronMat,
  );
  driveApron.position.set(0, 0.01, 7.8);
  driveApron.rotation.x = 0.045;
  driveApron.receiveShadow = true;
  driveApron.castShadow = false;
  driveApron.userData.noShadowCast = true;
  driveApron.userData.preserveEnvMapIntensity = true;
  garageGroup.add(driveApron);

  // 4 Distinct Covered Custom Bays: Bay 1 (-9 Lowrider), Bay 2 (-3 DONK), Bay 3 (+3 SLAB), Bay 4 (+9 Cadillac Coupe DeVille)
  const bayCenters = [-9.0, -3.0, 3.0, 9.0];
  bayCenters.forEach((bx, bayIdx) => {
    const trimMat = bayTrimMats[bayIdx];
    const bayPad = new THREE.Mesh(
      ensureGeometryHasUv(roundedBox(5.0, 0.04, 8.2, 0.04, 2)),
      concreteBayPadMat,
    );
    bayPad.position.set(bx, 0.145, 0.6);
    bayPad.receiveShadow = true;
    bayPad.castShadow = false;
    bayPad.userData.noShadowCast = true;
    bayPad.userData.preserveEnvMapIntensity = true;
    garageGroup.add(bayPad);

    [-2.42, 2.42].forEach((sideOffset) => {
      const sideLine = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.025, 8.0), trimMat);
      sideLine.position.set(bx + sideOffset, 0.17, 0.6);
      sideLine.userData.noShadowCast = true;
      garageGroup.add(sideLine);
    });
    const frontApronLine = new THREE.Mesh(new THREE.BoxGeometry(4.95, 0.025, 0.14), trimMat);
    frontApronLine.position.set(bx, 0.17, 4.55);
    frontApronLine.userData.noShadowCast = true;
    garageGroup.add(frontApronLine);

    const backStop = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.16, 0.28), trimMat);
    backStop.position.set(bx, 0.22, -3.35);
    backStop.userData.noShadowCast = true;
    garageGroup.add(backStop);
  });

  // Steel-and-Timber Canopy Columns (wide 6m open clear-span per bay, zero pillars blocking drive-in)
  const colXList = [-12.6, -6.0, 0.0, 6.0, 12.6];
  const colZList = [-5.8, 5.4];
  colXList.forEach((px) => {
    colZList.forEach((pz) => {
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.32, 0.56), concreteBaseMat);
      plinth.position.set(px, 0.26, pz);
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.32, 4.7, 0.32), steelFrameMat);
      post.position.set(px, 2.55, pz);
      post.castShadow = true;
      garageGroup.add(plinth, post);
      colliders.push({
        x: VEHICLE_GARAGE_POS.x + px,
        z: VEHICLE_GARAGE_POS.z + pz,
        radius: 0.38,
      });
    });
  });

  // Back workshop low retaining wall + timber wainscot + steel roof trusses
  const backWall = new THREE.Mesh(roundedBox(26.2, 2.4, 0.28, 0.1, 2), concreteBaseMat);
  backWall.position.set(0, 1.3, -5.85);
  backWall.castShadow = true;
  backWall.receiveShadow = true;
  garageGroup.add(backWall);

  const frontHeaderBeam = new THREE.Mesh(roundedBox(26.8, 0.42, 0.38, 0.1, 2), steelFrameMat);
  frontHeaderBeam.position.set(0, 4.85, 5.4);
  const backHeaderBeam = new THREE.Mesh(roundedBox(26.8, 0.42, 0.38, 0.1, 2), steelFrameMat);
  backHeaderBeam.position.set(0, 4.85, -5.8);
  garageGroup.add(frontHeaderBeam, backHeaderBeam);

  colXList.forEach((px) => {
    const trussBeam = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.34, 11.6), steelFrameMat);
    trussBeam.position.set(px, 4.85, -0.2);
    garageGroup.add(trussBeam);
  });

  // Sloped corrugated steel canopy roof (28.4m x 13.4m)
  const canopyRoof = new THREE.Mesh(roundedBox(28.4, 0.2, 13.4, 0.12, 3), garageRoofMat);
  canopyRoof.position.set(0, 5.22, -0.2);
  canopyRoof.rotation.x = -0.07;
  canopyRoof.castShadow = true;
  canopyRoof.receiveShadow = true;
  garageGroup.add(canopyRoof);

  // Overhead Illuminated Bay Signboard Beam & 3 Industrial Floodlight Fixtures
  const signBacking = new THREE.Mesh(
    new THREE.BoxGeometry(9.6, 0.62, 0.16),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.6 }),
  );
  signBacking.position.set(0, 5.15, 5.65);
  const signNeonBar = new THREE.Mesh(
    new THREE.BoxGeometry(9.0, 0.12, 0.08),
    new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.15,
    }),
  );
  signNeonBar.position.set(0, 5.15, 5.74);
  garageGroup.add(signBacking, signNeonBar);

  const floodBulbMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfffbeb,
    emissiveIntensity: 1.5,
  });
  bayCenters.forEach((bx, bayIdx) => {
    // Ceiling bay light housing + warm/cool industrial floodlight
    const hood = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.14, 0.45), steelFrameMat);
    hood.position.set(bx, 4.72, 0.5);
    const bulb = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.08, 0.32), floodBulbMat);
    bulb.position.set(bx, 4.64, 0.5);
    garageGroup.add(hood, bulb);

    // Exterior front overhang floodlight above each bay entrance
    const extArm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.75), steelFrameMat);
    extArm.position.set(bx, 4.82, 5.9);
    const extLamp = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.16, 0.28), floodBulbMat);
    extLamp.position.set(bx, 4.76, 6.22);
    extLamp.rotation.x = 0.45;
    garageGroup.add(extArm, extLamp);

    const bayLight = new THREE.PointLight(
      bayIdx === 0 ? 0xffedd5 : bayIdx === 1 ? 0xe0f2fe : 0xfaf5ff,
      1.65,
      20,
      1.3,
    );
    bayLight.position.set(bx, 4.35, 1.2);
    garageGroup.add(bayLight);
  });

  // Rolling Red/Chrome Mechanic Tool Chests & Floor Jack along back wall
  [-9.1, 9.1].forEach((tx) => {
    const chestGroup = new THREE.Group();
    chestGroup.position.set(tx, 0.13, -4.95);
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.45, 1.15, 0.68), toolChestRedMat);
    body.position.y = 0.62;
    body.castShadow = true;
    const topBox = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.55, 0.58), toolChestRedMat);
    topBox.position.y = 1.47;
    topBox.castShadow = true;
    for (let d = 0; d < 4; d++) {
      const pull = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.05, 0.06), toolMetalMat);
      pull.position.set(0, 0.32 + d * 0.24, 0.36);
      chestGroup.add(pull);
    }
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.54), toolMetalMat);
    handle.position.set(tx < 0 ? 0.78 : -0.78, 1.05, 0);
    chestGroup.add(body, topBox, handle);
    garageGroup.add(chestGroup);
  });

  // Hydraulic Floor Jack beside Bay 1
  const jackBody = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.14, 0.85), toolChestRedMat);
  jackBody.position.set(-2.2, 0.2, -3.9);
  const jackHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.05, 6), toolMetalMat);
  jackHandle.position.set(-2.2, 0.62, -4.32);
  jackHandle.rotation.x = 0.45;
  garageGroup.add(jackBody, jackHandle);

  // Interactive Mechanic Repair & Assembly Workbench at center-north
  const benchGroup = new THREE.Group();
  benchGroup.position.set(0, 0.13, -5.0);
  const benchTable = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.94, 1.05), timberPostMat);
  benchTable.position.y = 0.47;
  benchTable.castShadow = true;
  const benchVise = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.28, 0.35), toolMetalMat);
  benchVise.position.set(-0.95, 1.08, 0.15);
  const benchLamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xf59e0b, emissiveIntensity: 1.1 }),
  );
  benchLamp.position.set(1.05, 1.2, -0.2);
  benchGroup.add(benchTable, benchVise, benchLamp);
  garageGroup.add(benchGroup);
  colliders.push({
    x: VEHICLE_GARAGE_POS.x,
    z: VEHICLE_GARAGE_POS.z - 5.0,
    radius: 0.95,
  });

  // Spare Tires, Chrome Rims & Fuel Drums in West/East Service Corners
  for (let t = 0; t < 4; t++) {
    const tire = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.14, 8, 16), tireMat);
    tire.rotation.x = Math.PI / 2;
    tire.position.set(-7.6, 0.26 + t * 0.25, -4.85);
    tire.castShadow = false;
    tire.userData.noShadowCast = true;
    garageGroup.add(tire);
  }
  const fuelCanMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.42, metalness: 0.3 });
  [-4.4, -3.9, 4.2, 4.7].forEach((fx) => {
    const can = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.56, 0.24), fuelCanMat);
    can.position.set(fx, 0.42, -5.1);
    can.castShadow = false;
    can.userData.noShadowCast = true;
    garageGroup.add(can);
  });

  overworldGroup.add(garageGroup);
  staticMergeTargets.push({ group: garageGroup });

  const garagePos = new THREE.Vector3(VEHICLE_GARAGE_POS.x, garageGroundY, VEHICLE_GARAGE_POS.z);
  const garageBenchPos = new THREE.Vector3(
    VEHICLE_GARAGE_POS.x,
    garageGroundY + 0.13,
    VEHICLE_GARAGE_POS.z - 5.0,
  );

  // Base Armory Supply Chest tucked neatly beside the East flank of the Expanded Vehicle Garage
  const armoryX = VEHICLE_GARAGE_POS.x + 12.6;
  const armoryZ = VEHICLE_GARAGE_POS.z - 2.2;
  const armoryY = getTerrainHeight(armoryX, armoryZ);
  const armoryChest = createShipwreckLootChest(
    'base_armory',
    'Base Armory Supply Chest',
    'Glock 19, Remington 870, M4A1 & Tactical Ammo',
    'armory',
    armoryX,
    armoryY + 0.08,
    armoryZ,
    -0.35,
    0x10b981,
  );

  // F. Huge Saturn V ("Saturn Five") Rocket Launch Complex — Next to the Premade Shelter & Garage (a bit further out)
  const saturnGroundY = getTerrainHeight(SATURN_ROCKET_POS.x, SATURN_ROCKET_POS.z);
  const saturnBuilt = buildSaturnVRocket({ withLaunchTower: true });
  saturnBuilt.root.position.set(
    SATURN_ROCKET_POS.x,
    saturnGroundY - 0.1,
    SATURN_ROCKET_POS.z,
  );
  overworldGroup.add(saturnBuilt.root);

  // F2. Underground Exotic Garage Expansion & Hydraulic Car Elevator — Right Next to the Vehicle Garage
  const elevatorGroundY = getTerrainHeight(
    UNDERGROUND_ELEVATOR_POS.x,
    UNDERGROUND_ELEVATOR_POS.z,
  );
  const undergroundElevator = buildUndergroundCarElevator();
  undergroundElevator.root.position.set(
    UNDERGROUND_ELEVATOR_POS.x,
    elevatorGroundY - 0.05,
    UNDERGROUND_ELEVATOR_POS.z,
  );
  overworldGroup.add(undergroundElevator.root);

  // G. Island-Landed Alien UFO (at x: 40, z: -35) with glowing saucer lights & collectible Alien Loot
  const islandUfoY = getTerrainHeight(ISLAND_UFO_POS.x, ISLAND_UFO_POS.z);
  const islandUfoMesh = buildAlienUfoMesh({ withTractorBeam: false });
  islandUfoMesh.position.set(ISLAND_UFO_POS.x, islandUfoY + 1.05, ISLAND_UFO_POS.z);
  islandUfoMesh.rotation.z = 0.09;
  overworldGroup.add(islandUfoMesh);

  // =========================================================================
  // SIGNATURE BIOME STRUCTURES (Trial Chambers, Woodland Mansion, Villages, Outpost, Ruins, Igloo, Jungle Temple)
  // =========================================================================
  const tuffBrickMat = registerMaterial(enhanceSurfaceMaterial(new THREE.MeshStandardMaterial({ color: 0x4b5551, map: rockTex, roughness: 0.92 }), 'rock'));
  const oxidizedCopperMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0x3b8c7c, roughness: 0.52, metalness: 0.38 }));
  const copperBulbMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0xfb923c, emissive: 0xea580c, emissiveIntensity: 1.35, roughness: 0.32 }));
  const mansionPlankMat = registerMaterial(enhanceSurfaceMaterial(new THREE.MeshStandardMaterial({ color: 0x3b2618, map: woodTex, roughness: 0.88 }), 'wood'));
  const roofSlateMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.86 }));
  const warmWindowMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0xfef3c7, emissive: 0xf59e0b, emissiveIntensity: 0.85, roughness: 0.35 }));
  const bannerRedMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.84 }));
  const terracottaMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0xb4532a, roughness: 0.9 }));
  const icePaneMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0xbae6fd, roughness: 0.18, transparent: true, opacity: 0.78 }));

  // 1. Trial Chambers (Forest underground vault entrance at TRIAL_CHAMBERS_POS)
  {
    const tcY = getTerrainHeight(TRIAL_CHAMBERS_POS.x, TRIAL_CHAMBERS_POS.z);
    const tcGroup = new THREE.Group();
    tcGroup.position.set(TRIAL_CHAMBERS_POS.x, tcY, TRIAL_CHAMBERS_POS.z);
    const rim = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.5, 7.2), tuffBrickMat);
    rim.position.y = 0.25;
    rim.receiveShadow = true;
    const archL = new THREE.Mesh(new THREE.BoxGeometry(0.9, 3.2, 1.2), oxidizedCopperMat);
    archL.position.set(-2.1, 1.8, 3.0);
    archL.castShadow = true;
    const archR = new THREE.Mesh(new THREE.BoxGeometry(0.9, 3.2, 1.2), oxidizedCopperMat);
    archR.position.set(2.1, 1.8, 3.0);
    archR.castShadow = true;
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.9, 1.3), tuffBrickMat);
    lintel.position.set(0, 3.55, 3.0);
    lintel.castShadow = true;
    const vaultShaft = new THREE.Mesh(new THREE.BoxGeometry(4.4, 2.2, 4.4), tuffBrickMat);
    vaultShaft.position.set(0, 1.2, -0.6);
    vaultShaft.castShadow = true;
    const copperSpire = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 1.8, 6), oxidizedCopperMat);
    copperSpire.position.set(0, 3.1, -0.6);
    const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), copperBulbMat);
    bulb.position.set(0, 2.75, 3.0);
    const bulbLight = new THREE.PointLight(0xf97316, 1.3, 14, 1.4);
    bulbLight.position.set(0, 2.6, 3.2);
    tcGroup.add(rim, archL, archR, lintel, vaultShaft, copperSpire, bulb, bulbLight);
    overworldGroup.add(tcGroup);
    staticMergeTargets.push({ group: tcGroup });
    colliders.push({ x: TRIAL_CHAMBERS_POS.x, z: TRIAL_CHAMBERS_POS.z - 0.6, radius: 2.6 });
  }

  // Helper to place a wall mesh in a local group AND emit exact rotated wall-segment sphere colliders
  const addRotatedWall = (
    originX: number,
    originY: number,
    originZ: number,
    rotY: number,
    parentGroup: THREE.Group,
    lx: number,
    ly: number,
    lz: number,
    w: number,
    h: number,
    d: number,
    mat: THREE.Material,
    addCollider = true,
  ) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(lx, ly, lz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parentGroup.add(mesh);

    if (!addCollider) return;
    const cosR = Math.cos(rotY);
    const sinR = Math.sin(rotY);
    const longX = w >= d;
    const span = Math.max(w, d);
    const steps = Math.max(1, Math.ceil(span / 0.72));
    for (let s = 0; s < steps; s++) {
      const frac = steps === 1 ? 0 : (s / (steps - 1) - 0.5) * Math.max(0, span - 0.56);
      const sx = lx + (longX ? frac : 0);
      const sz = lz + (longX ? 0 : frac);
      const wx = originX + sx * cosR + sz * sinR;
      const wz = originZ - sx * sinR + sz * cosR;
      colliders.push({ x: wx, z: wz, radius: 0.26 });
    }
  };

  // 2. Enterable Woodland Mansion (Dark Forest at WOODLAND_MANSION_POS)
  {
    const wmY = getTerrainHeight(WOODLAND_MANSION_POS.x, WOODLAND_MANSION_POS.z);
    const wmGroup = new THREE.Group();
    wmGroup.position.set(WOODLAND_MANSION_POS.x, wmY, WOODLAND_MANSION_POS.z);

    // Walk-in stone plinth (0.14m step height) + front stone threshold step
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(14.4, 0.14, 10.6), boulderMat);
    plinth.position.y = 0.07;
    plinth.receiveShadow = true;
    const frontStep = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.07, 0.9), boulderMat);
    frontStep.position.set(0, 0.035, 5.65);
    frontStep.receiveShadow = true;
    const plankFloor = new THREE.Mesh(new THREE.BoxGeometry(13.6, 0.02, 9.6), mansionPlankMat);
    plankFloor.position.y = 0.145;
    plankFloor.receiveShadow = true;
    wmGroup.add(plinth, frontStep, plankFloor);

    // Ground floor exterior perimeter walls (y = 0.14..3.94 -> height 3.8, center 2.04)
    const addMansionWall = (lx: number, ly: number, lz: number, w: number, h: number, d: number, mat: THREE.Material, col = true) =>
      addRotatedWall(WOODLAND_MANSION_POS.x, wmY, WOODLAND_MANSION_POS.z, 0, wmGroup, lx, ly, lz, w, h, d, mat, col);

    addMansionWall(0, 2.04, -4.9, 14.0, 3.8, 0.36, darkOakTrunkMat, true); // North back wall
    addMansionWall(-6.9, 2.04, 0, 0.36, 3.8, 9.8, darkOakTrunkMat, true); // West wall
    addMansionWall(6.9, 2.04, 0, 0.36, 3.8, 9.8, darkOakTrunkMat, true); // East wall
    // South front wall with 2.8m wide open doorway (x in [-1.4, +1.4])
    addMansionWall(-4.2, 2.04, 4.9, 5.4, 3.8, 0.36, darkOakTrunkMat, true);
    addMansionWall(4.2, 2.04, 4.9, 5.4, 3.8, 0.36, darkOakTrunkMat, true);
    addMansionWall(0, 3.54, 4.9, 2.8, 0.8, 0.38, darkOakTrunkMat, false); // Doorway lintel (walk under 3.0m)

    // Interior room partition walls with wide 2.8m open archways into West Armory & East Witch Study
    [-2.6, 2.6].forEach((px) => {
      addMansionWall(px, 2.04, -3.15, 0.28, 3.8, 3.5, mansionPlankMat, true);
      addMansionWall(px, 2.04, 3.15, 0.28, 3.8, 3.5, mansionPlankMat, true);
      addMansionWall(px, 3.54, 0, 0.28, 0.8, 2.8, mansionPlankMat, false);
    });

    // Grand Foyer Crimson Runner + Raised Evoker Dais & Banner
    const runner = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.02, 7.6), bannerRedMat);
    runner.position.set(0, 0.165, 0.4);
    const dais = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.12, 1.8), boulderMat);
    dais.position.set(0, 0.21, -3.55);
    const evokerBanner = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.2, 0.12), bannerRedMat);
    evokerBanner.position.set(0, 2.35, -4.62);
    const totemCrest = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.14), copperBulbMat);
    totemCrest.position.set(0, 2.45, -4.58);
    wmGroup.add(runner, dais, evokerBanner, totemCrest);

    // West Armory Banquet Table & Supply Crates (collider-light perimeter accents)
    const table = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.75, 2.6), oakTrunkMat);
    table.position.set(-4.9, 0.52, -2.4);
    const crate1 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.85, 0.9), spruceTrunkMat);
    crate1.position.set(-5.9, 0.57, 3.5);
    wmGroup.add(table, crate1);
    colliders.push({ x: WOODLAND_MANSION_POS.x - 4.9, z: WOODLAND_MANSION_POS.z - 2.4, radius: 0.75 });

    // East Conjuring Study / Witch Lab: Bookshelves & Glowing Emerald Cauldron
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.6, 2.8), oakTrunkMat);
    shelf.position.set(6.25, 1.44, -2.4);
    const cauldron = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.45, 0.8, 8), roofSlateMat);
    cauldron.position.set(4.8, 0.54, 2.6);
    const brewGlow = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.08, 8), oxidizedCopperMat);
    brewGlow.position.set(4.8, 0.92, 2.6);
    wmGroup.add(shelf, cauldron, brewGlow);
    colliders.push({ x: WOODLAND_MANSION_POS.x + 4.8, z: WOODLAND_MANSION_POS.z + 2.6, radius: 0.5 });

    // Upper story ceiling slab, facade, pitched roof & front portico
    const groundCeiling = new THREE.Mesh(new THREE.BoxGeometry(14.0, 0.24, 9.8), mansionPlankMat);
    groundCeiling.position.y = 4.06;
    const upperHall = new THREE.Mesh(new THREE.BoxGeometry(13.0, 3.2, 8.8), mansionPlankMat);
    upperHall.position.y = 5.75;
    upperHall.castShadow = true;
    const pitchedRoof = new THREE.Mesh(new THREE.ConeGeometry(9.2, 3.4, 12), roofSlateMat);
    pitchedRoof.rotation.y = Math.PI / 4;
    pitchedRoof.scale.set(1.22, 1, 0.92);
    pitchedRoof.position.y = 9.05;
    pitchedRoof.castShadow = true;
    const portico = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.45, 2.4), mansionPlankMat);
    portico.position.set(0, 3.9, 5.75);
    [-1.95, 1.95].forEach((px) => {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3.8, 0.5), boulderMat);
      col.position.set(px, 2.0, 6.45);
      col.castShadow = true;
      wmGroup.add(col);
      colliders.push({ x: WOODLAND_MANSION_POS.x + px, z: WOODLAND_MANSION_POS.z + 6.45, radius: 0.34 });
    });

    [-4.6, 4.6, -2.1, 2.1].forEach((wx) => {
      const w1 = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.25, 0.2), warmWindowMat);
      w1.position.set(wx, 2.45, 5.05);
      const w2 = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.2, 0.2), warmWindowMat);
      w2.position.set(wx, 5.8, 4.46);
      wmGroup.add(w1, w2);
    });

    const porchGlow = new THREE.PointLight(0xfbbf24, 1.4, 16, 1.4);
    porchGlow.position.set(0, 3.4, 6.1);
    const hallGlow = new THREE.PointLight(0xfbbf24, 2.2, 16, 1.2);
    hallGlow.position.set(0, 3.4, -0.4);
    const westGlow = new THREE.PointLight(0xf59e0b, 1.5, 11, 1.3);
    westGlow.position.set(-4.6, 3.2, 0);
    const eastGlow = new THREE.PointLight(0x10b981, 1.6, 11, 1.3);
    eastGlow.position.set(4.6, 3.2, 0);
    wmGroup.add(groundCeiling, upperHall, pitchedRoof, portico, porchGlow, hallGlow, westGlow, eastGlow);
    overworldGroup.add(wmGroup);
    staticMergeTargets.push({ group: wmGroup });
  }

  // Helper for Enterable Walk-In Village Cabins (3 Taiga + 3 Snowy Taiga Houses)
  const addSpruceCabin = (cx: number, cz: number, rotY: number, snowy: boolean) => {
    const cy = getTerrainHeight(cx, cz);
    const cab = new THREE.Group();
    cab.position.set(cx, cy, cz);
    cab.rotation.y = rotY;

    const plinth = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.12, 4.4), boulderMat);
    plinth.position.y = 0.06;
    plinth.receiveShadow = true;
    const step = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.06, 0.65), boulderMat);
    step.position.set(0, 0.03, 2.42);
    const floorPlank = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.02, 4.0), oakTrunkMat);
    floorPlank.position.y = 0.125;
    floorPlank.receiveShadow = true;
    cab.add(plinth, step, floorPlank);

    // Walls (y = 0.12..2.82 -> height 2.7, center 1.47) with 1.7m open front doorway centered at x=0, z=+2.1
    addRotatedWall(cx, cy, cz, rotY, cab, 0, 1.47, -2.1, 4.8, 2.7, 0.24, spruceTrunkMat, true);
    addRotatedWall(cx, cy, cz, rotY, cab, -2.3, 1.47, 0, 0.24, 2.7, 4.2, spruceTrunkMat, true);
    addRotatedWall(cx, cy, cz, rotY, cab, 2.3, 1.47, 0, 0.24, 2.7, 4.2, spruceTrunkMat, true);
    addRotatedWall(cx, cy, cz, rotY, cab, -1.62, 1.47, 2.1, 1.56, 2.7, 0.24, spruceTrunkMat, true);
    addRotatedWall(cx, cy, cz, rotY, cab, 1.62, 1.47, 2.1, 1.56, 2.7, 0.24, spruceTrunkMat, true);
    addRotatedWall(cx, cy, cz, rotY, cab, 0, 2.52, 2.1, 1.7, 0.6, 0.26, spruceTrunkMat, false);

    const roofBase = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.14, 4.6), oakTrunkMat);
    roofBase.position.y = 2.86;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.8, 2.0, 10), snowy ? snowCapMat : pineTrunkMat);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 3.92;
    roof.castShadow = true;
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.72, 0.18), warmWindowMat);
    win.position.set(1.55, 1.62, 2.15);

    // Cozy Walk-In Furnishings
    const rug = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.02, 1.9), bannerRedMat);
    rug.position.set(0, 0.14, 0.15);
    const bedFrame = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.42, 1.7), oakTrunkMat);
    bedFrame.position.set(-1.5, 0.34, -0.95);
    const blanket = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.16, 1.15), snowy ? terracottaMat : bannerRedMat);
    blanket.position.set(-1.5, 0.52, -0.75);
    const stove = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.85, 0.85), boulderMat);
    stove.position.set(1.55, 0.55, -1.35);
    const ember = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.35, 0.12), copperBulbMat);
    ember.position.set(1.55, 0.48, -0.9);
    const lantern = new THREE.PointLight(0xfbbf24, 1.15, 8.5, 1.4);
    lantern.position.set(0, 2.4, 0);

    cab.add(roofBase, roof, win, rug, bedFrame, blanket, stove, ember, lantern);
    overworldGroup.add(cab);
    staticMergeTargets.push({ group: cab });
  };

  // 3. Taiga Village & 6. Snowy Taiga Village (all 6 houses enterable!)
  BIOME_CABIN_DEFS.forEach((cabDef) => {
    addSpruceCabin(cabDef.x, cabDef.z, cabDef.rotY, cabDef.snowy);
  });
  {
    const tvY = getTerrainHeight(TAIGA_VILLAGE_POS.x, TAIGA_VILLAGE_POS.z);
    const hearth = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.2, 0.32, 8), boulderMat);
    hearth.position.set(TAIGA_VILLAGE_POS.x, tvY + 0.16, TAIGA_VILLAGE_POS.z);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.85, 5), copperBulbMat);
    flame.position.set(TAIGA_VILLAGE_POS.x, tvY + 0.65, TAIGA_VILLAGE_POS.z);
    const light = new THREE.PointLight(0xf97316, 1.4, 16, 1.4);
    light.position.set(TAIGA_VILLAGE_POS.x, tvY + 1.4, TAIGA_VILLAGE_POS.z);
    overworldGroup.add(hearth, flame, light);
  }

  // 4. Pillager Outpost (Walk-through ground watchtower pavilion at PILLAGER_OUTPOST_POS)
  {
    const poY = getTerrainHeight(PILLAGER_OUTPOST_POS.x, PILLAGER_OUTPOST_POS.z);
    const poGroup = new THREE.Group();
    poGroup.position.set(PILLAGER_OUTPOST_POS.x, poY, PILLAGER_OUTPOST_POS.z);
    const foundation = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.12, 5.8), boulderMat);
    foundation.position.y = 0.06;
    foundation.receiveShadow = true;
    poGroup.add(foundation);
    [
      [-2.35, -2.35],
      [2.35, -2.35],
      [-2.35, 2.35],
      [2.35, 2.35],
    ].forEach(([px, pz]) => {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.65, 3.2, 0.65), darkOakTrunkMat);
      col.position.set(px, 1.72, pz);
      col.castShadow = true;
      poGroup.add(col);
      colliders.push({ x: PILLAGER_OUTPOST_POS.x + px, z: PILLAGER_OUTPOST_POS.z + pz, radius: 0.38 });
    });
    const brazier = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.45, 7), boulderMat);
    brazier.position.set(0, 0.35, 0);
    const brazierGlow = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.55, 5), copperBulbMat);
    brazierGlow.position.set(0, 0.72, 0);
    colliders.push({ x: PILLAGER_OUTPOST_POS.x, z: PILLAGER_OUTPOST_POS.z, radius: 0.5 });

    const upperFloor = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.36, 5.6), boulderMat);
    upperFloor.position.y = 3.35;
    const midTower = new THREE.Mesh(new THREE.BoxGeometry(4.6, 3.1, 4.6), darkOakTrunkMat);
    midTower.position.y = 5.0;
    midTower.castShadow = true;
    const crownDeck = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.55, 6.2), birchTrunkMat);
    crownDeck.position.y = 6.75;
    const towerRoof = new THREE.Mesh(new THREE.ConeGeometry(4.4, 2.4, 12), roofSlateMat);
    towerRoof.rotation.y = Math.PI / 4;
    towerRoof.position.y = 8.65;
    towerRoof.castShadow = true;
    for (let s = 0; s < 4; s++) {
      const ba = (s / 4) * Math.PI * 2;
      const banner = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.65, 0.12), bannerRedMat);
      banner.position.set(Math.sin(ba) * 2.55, 5.4, Math.cos(ba) * 2.55);
      banner.rotation.y = ba;
      poGroup.add(banner);
    }
    poGroup.add(brazier, brazierGlow, upperFloor, midTower, crownDeck, towerRoof);
    overworldGroup.add(poGroup);
    staticMergeTargets.push({ group: poGroup });
  }

  // 5. Trail Ruins (Old Growth Pine Taiga at TRAIL_RUINS_POS)
  {
    const trY = getTerrainHeight(TRAIL_RUINS_POS.x, TRAIL_RUINS_POS.z);
    const trGroup = new THREE.Group();
    trGroup.position.set(TRAIL_RUINS_POS.x, trY, TRAIL_RUINS_POS.z);
    [
      [-2.2, 1.4, -1.6],
      [2.0, 2.1, -1.2],
      [-1.4, 1.2, 2.1],
      [2.2, 1.6, 1.8],
    ].forEach(([px, ph, pz], idx) => {
      const col = new THREE.Mesh(
        new THREE.BoxGeometry(0.95, ph, 0.95),
        idx % 2 === 0 ? terracottaMat : tuffBrickMat,
      );
      col.position.set(px, ph * 0.45, pz);
      col.rotation.z = (idx - 1.5) * 0.08;
      col.castShadow = true;
      trGroup.add(col);
    });
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.65, 1.05), terracottaMat);
    lintel.position.set(0, 2.25, -1.4);
    trGroup.add(lintel);
    overworldGroup.add(trGroup);
    staticMergeTargets.push({ group: trGroup });
    colliders.push({ x: TRAIL_RUINS_POS.x, z: TRAIL_RUINS_POS.z, radius: 2.8 });
  }

  // 7. Enterable Snowy Igloo (Snowy Taiga at SNOWY_IGLOO_POS)
  {
    const igY = getTerrainHeight(SNOWY_IGLOO_POS.x, SNOWY_IGLOO_POS.z);
    const igGroup = new THREE.Group();
    igGroup.position.set(SNOWY_IGLOO_POS.x, igY, SNOWY_IGLOO_POS.z);
    const hollowSnowMat = registerMaterial(
      new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.72, side: THREE.DoubleSide }),
    );
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(3.0, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      hollowSnowMat,
    );
    dome.castShadow = true;
    const floorDisc = new THREE.Mesh(new THREE.CylinderGeometry(2.9, 2.9, 0.05, 12), hollowSnowMat);
    floorDisc.position.y = 0.025;
    floorDisc.receiveShadow = true;
    // Open Snow Entry Tunnel along +Z (1.56m wide clear walk-in)
    const tunL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.95, 1.9), snowCapMat);
    tunL.position.set(-0.92, 0.98, 2.95);
    const tunR = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.95, 1.9), snowCapMat);
    tunR.position.set(0.92, 0.98, 2.95);
    const tunTop = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.3, 1.9), snowCapMat);
    tunTop.position.set(0, 2.02, 2.95);
    // Igloo interior bedroll & glowing lantern
    const igRug = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.03, 1.8), bannerRedMat);
    igRug.position.set(0, 0.06, -0.3);
    const igLantern = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.32), warmWindowMat);
    igLantern.position.set(-1.35, 0.28, -1.1);
    const igLight = new THREE.PointLight(0xfbbf24, 1.15, 7, 1.4);
    igLight.position.set(0, 1.85, 0);
    const iceWinL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.65, 0.85), icePaneMat);
    iceWinL.position.set(-2.7, 0.95, 0);
    const iceWinR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.65, 0.85), icePaneMat);
    iceWinR.position.set(2.7, 0.95, 0);
    igGroup.add(dome, floorDisc, tunL, tunR, tunTop, igRug, igLantern, igLight, iceWinL, iceWinR);
    overworldGroup.add(igGroup);
    staticMergeTargets.push({ group: igGroup });

    // Perimeter dome colliders leaving the +Z doorway clear
    for (let k = 0; k < 16; k++) {
      const ang = (k / 16) * Math.PI * 2;
      const lx = Math.cos(ang) * 2.95;
      const lz = Math.sin(ang) * 2.95;
      if (lz > 1.75 && Math.abs(lx) < 1.3) continue;
      colliders.push({ x: SNOWY_IGLOO_POS.x + lx, z: SNOWY_IGLOO_POS.z + lz, radius: 0.32 });
    }
    colliders.push(
      { x: SNOWY_IGLOO_POS.x - 1.0, z: SNOWY_IGLOO_POS.z + 2.9, radius: 0.25 },
      { x: SNOWY_IGLOO_POS.x + 1.0, z: SNOWY_IGLOO_POS.z + 2.9, radius: 0.25 },
    );
  }

  // 8. Jungle Pyramid / Temple (Jungle at JUNGLE_TEMPLE_POS)
  {
    const jtY = getTerrainHeight(JUNGLE_TEMPLE_POS.x, JUNGLE_TEMPLE_POS.z);
    const jtGroup = new THREE.Group();
    jtGroup.position.set(JUNGLE_TEMPLE_POS.x, jtY, JUNGLE_TEMPLE_POS.z);
    [
      [9.6, 1.4, 0.7],
      [7.4, 1.5, 2.1],
      [5.2, 1.5, 3.6],
      [3.0, 1.2, 4.9],
    ].forEach(([w, h, py], tier) => {
      const step = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, w),
        tier % 2 === 0 ? tuffBrickMat : boulderMat,
      );
      step.position.y = py;
      step.castShadow = true;
      step.receiveShadow = true;
      jtGroup.add(step);
      const mossBand = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, 0.24, w + 0.08), mossyPatchMat);
      mossBand.position.y = py + h * 0.35;
      jtGroup.add(mossBand);
    });
    const sanctumDoor = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.2, 0.4), copperBulbMat);
    sanctumDoor.position.set(0, 1.5, 4.75);
    jtGroup.add(sanctumDoor);
    overworldGroup.add(jtGroup);
    staticMergeTargets.push({ group: jtGroup });
    colliders.push({ x: JUNGLE_TEMPLE_POS.x, z: JUNGLE_TEMPLE_POS.z, radius: 4.8 });
  }

  // 9. Plains Villages (Plains at PLAINS_VILLAGE_POS & Sunflower Plains at SUNFLOWER_VILLAGE_POS)
  const buildPlainsVillage = (center: { x: number; z: number }) => {
    const vGroup = new THREE.Group();
    const baseY = getTerrainHeight(center.x, center.z);
    vGroup.position.set(center.x, baseY, center.z);

    // Central Stone Village Well
    const wellBase = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.1, 2.6), boulderMat);
    wellBase.position.y = 0.55;
    const wellWater = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.8), freshwaterMat);
    wellWater.rotation.x = -Math.PI / 2;
    wellWater.position.y = 0.92;
    const wellRoof = new THREE.Mesh(new THREE.ConeGeometry(2.2, 1.2, 10), oakTrunkMat);
    wellRoof.rotation.y = Math.PI / 4;
    wellRoof.position.y = 3.1;
    vGroup.add(wellBase, wellWater, wellRoof);
    colliders.push({ x: center.x, z: center.z, radius: 1.5 });

    // 3 Oak-Timbered Plains Village Cottages around the well
    const cottageOffsets: [number, number, number][] = [
      [-8.5, -4.5, 0.45],
      [8.5, -3.5, -0.5],
      [0.5, 8.8, Math.PI],
    ];
    cottageOffsets.forEach(([ox, oz, rotY]) => {
      const cy = getTerrainHeight(center.x + ox, center.z + oz) - baseY;
      const hut = new THREE.Group();
      hut.position.set(ox, cy, oz);
      hut.rotation.y = rotY;
      const body = new THREE.Mesh(new THREE.BoxGeometry(5.2, 3.0, 4.4), birchTrunkMat);
      body.position.y = 1.5;
      body.castShadow = true;
      const roof = new THREE.Mesh(new THREE.ConeGeometry(4.1, 2.1, 12), oakTrunkMat);
      roof.rotation.y = Math.PI / 4;
      roof.position.y = 4.05;
      roof.castShadow = true;
      const win = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.9, 4.5), warmWindowMat);
      win.position.y = 1.75;
      hut.add(body, roof, win);
      vGroup.add(hut);
      colliders.push({ x: center.x + ox, z: center.z + oz, radius: 2.7 });
    });
    overworldGroup.add(vGroup);
    staticMergeTargets.push({ group: vGroup });
  };
  buildPlainsVillage(PLAINS_VILLAGE_POS);
  buildPlainsVillage(SUNFLOWER_VILLAGE_POS);

  // 10. Ruined Portal (Plains at RUINED_PORTAL_POS)
  {
    const rpY = getTerrainHeight(RUINED_PORTAL_POS.x, RUINED_PORTAL_POS.z);
    const rpGroup = new THREE.Group();
    rpGroup.position.set(RUINED_PORTAL_POS.x, rpY, RUINED_PORTAL_POS.z);
    const obsMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0x1e1b2e, roughness: 0.45, metalness: 0.25 }));
    const cryingObsMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0x3b0764, emissive: 0x9333ea, emissiveIntensity: 0.9, roughness: 0.3 }));
    const netherrackMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0x6b211e, roughness: 0.92 }));
    const goldBlockMat = registerMaterial(new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.85, roughness: 0.22 }));

    const baseSlab = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 5.1, 0.3, 10), netherrackMat);
    baseSlab.position.y = 0.12;
    const leftPillar = new THREE.Mesh(new THREE.BoxGeometry(1.1, 5.4, 1.1), obsMat);
    leftPillar.position.set(-2.1, 2.7, 0);
    leftPillar.castShadow = true;
    const rightPillar = new THREE.Mesh(new THREE.BoxGeometry(1.1, 3.8, 1.1), cryingObsMat);
    rightPillar.position.set(2.1, 1.9, 0);
    rightPillar.castShadow = true;
    const topLintel = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.1, 1.1), obsMat);
    topLintel.position.set(-0.9, 5.6, 0);
    const goldCap = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.05, 1.05), goldBlockMat);
    goldCap.position.set(-2.1, 6.4, 0);
    rpGroup.add(baseSlab, leftPillar, rightPillar, topLintel, goldCap);
    overworldGroup.add(rpGroup);
    staticMergeTargets.push({ group: rpGroup });
    colliders.push({ x: RUINED_PORTAL_POS.x - 2.1, z: RUINED_PORTAL_POS.z, radius: 0.85 });
    colliders.push({ x: RUINED_PORTAL_POS.x + 2.1, z: RUINED_PORTAL_POS.z, radius: 0.85 });
  }

  // 11. Regional Pillager Outposts (Meadow, Grove, Snowy Plains, Jagged Peaks, Frozen Peaks, Stony Peaks)
  const buildRegionalOutpost = (pos: { x: number; z: number }) => {
    const oy = getTerrainHeight(pos.x, pos.z);
    const g = new THREE.Group();
    g.position.set(pos.x, oy, pos.z);
    const base = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.4, 5.4), boulderMat);
    base.position.y = 0.2;
    const tower = new THREE.Mesh(new THREE.BoxGeometry(4.2, 6.2, 4.2), darkOakTrunkMat);
    tower.position.y = 3.3;
    tower.castShadow = true;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(4.0, 2.4, 12), roofSlateMat);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 7.6;
    const banner = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.8, 0.12), bannerRedMat);
    banner.position.set(0, 4.8, 2.25);
    g.add(base, tower, roof, banner);
    overworldGroup.add(g);
    staticMergeTargets.push({ group: g });
    colliders.push({ x: pos.x, z: pos.z, radius: 2.8 });
  };
  [
    MEADOW_OUTPOST_POS,
    GROVE_OUTPOST_POS,
    SNOWY_PLAINS_OUTPOST_POS,
    JAGGED_PEAKS_POS,
    FROZEN_PEAKS_POS,
    STONY_PEAKS_POS,
  ].forEach(buildRegionalOutpost);

  // 12. Snowy Slopes Igloo at SNOWY_SLOPES_IGLOO_POS
  {
    const iy = getTerrainHeight(SNOWY_SLOPES_IGLOO_POS.x, SNOWY_SLOPES_IGLOO_POS.z);
    const ig = new THREE.Group();
    ig.position.set(SNOWY_SLOPES_IGLOO_POS.x, iy, SNOWY_SLOPES_IGLOO_POS.z);
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(2.9, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      snowCapMat,
    );
    dome.castShadow = true;
    const entry = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.6, 1.8), snowCapMat);
    entry.position.set(0, 0.8, 2.6);
    ig.add(dome, entry);
    overworldGroup.add(ig);
    staticMergeTargets.push({ group: ig });
    colliders.push({ x: SNOWY_SLOPES_IGLOO_POS.x, z: SNOWY_SLOPES_IGLOO_POS.z, radius: 2.9 });
  }

  // 13. Mega-Island (2x) Biome Landmarks: Desert Pyramid, Desert Village, Desert Well, Savanna Village,
  //     Desert/Savanna Outposts, Surface Mineshaft, Swamp Hut, Ancient Fossils, Ocean Monument, Coral Reefs, Icebergs & Buried Treasure
  const sandstoneMat = new THREE.MeshStandardMaterial({ color: 0xe6cb8d, roughness: 0.9 });
  const sandstoneAccentMat = new THREE.MeshStandardMaterial({ color: 0xc25934, roughness: 0.85 });
  const boneFossilMat = new THREE.MeshStandardMaterial({ color: 0xe7e2d3, roughness: 0.82 });
  const prismarineMat = new THREE.MeshStandardMaterial({ color: 0x2d8a8a, roughness: 0.55, metalness: 0.15 });
  const seaLanternMat = new THREE.MeshStandardMaterial({ color: 0xe0f7fa, emissive: 0x67e8f9, emissiveIntensity: 1.1, roughness: 0.25 });

  // 13a. Desert Pyramid (stepped sandstone temple + twin front towers)
  {
    const py = getTerrainHeight(DESERT_PYRAMID_POS.x, DESERT_PYRAMID_POS.z);
    const pyr = new THREE.Group();
    pyr.position.set(DESERT_PYRAMID_POS.x, py, DESERT_PYRAMID_POS.z);
    for (let step = 0; step < 5; step++) {
      const w = 16 - step * 2.8;
      const tier = new THREE.Mesh(new THREE.BoxGeometry(w, 1.8, w), sandstoneMat);
      tier.position.y = 0.9 + step * 1.8;
      tier.castShadow = true;
      tier.receiveShadow = true;
      pyr.add(tier);
    }
    [-6.5, 6.5].forEach((tx) => {
      const tower = new THREE.Mesh(new THREE.BoxGeometry(3.4, 8.8, 3.4), sandstoneMat);
      tower.position.set(tx, 4.4, 6.5);
      tower.castShadow = true;
      const glyph = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.2, 3.55), sandstoneAccentMat);
      glyph.position.set(tx, 5.2, 6.5);
      pyr.add(tower, glyph);
    });
    overworldGroup.add(pyr);
    staticMergeTargets.push({ group: pyr });
    colliders.push({ x: DESERT_PYRAMID_POS.x, z: DESERT_PYRAMID_POS.z, radius: 8.2 });
  }

  // 13b. Desert Village & Desert Well
  {
    const vy = getTerrainHeight(DESERT_VILLAGE_POS.x, DESERT_VILLAGE_POS.z);
    const dVillage = new THREE.Group();
    dVillage.position.set(DESERT_VILLAGE_POS.x, vy, DESERT_VILLAGE_POS.z);
    const hOffsets: [number, number, number][] = [
      [-8, -5, 0.2],
      [7, -6, -0.3],
      [-7, 7, 1.3],
      [8, 6, -1.1],
    ];
    hOffsets.forEach(([hx, hz, rot]) => {
      const house = new THREE.Group();
      house.position.set(hx, 0, hz);
      house.rotation.y = rot;
      const walls = new THREE.Mesh(new THREE.BoxGeometry(5.0, 3.4, 4.4), sandstoneMat);
      walls.position.y = 1.7;
      walls.castShadow = true;
      const trim = new THREE.Mesh(new THREE.BoxGeometry(5.3, 0.45, 4.7), sandstoneAccentMat);
      trim.position.y = 3.45;
      house.add(walls, trim);
      dVillage.add(house);
      colliders.push({ x: DESERT_VILLAGE_POS.x + hx, z: DESERT_VILLAGE_POS.z + hz, radius: 2.7 });
    });
    overworldGroup.add(dVillage);
    staticMergeTargets.push({ group: dVillage });

    // Desert Well
    const wy = getTerrainHeight(DESERT_WELL_POS.x, DESERT_WELL_POS.z);
    const well = new THREE.Group();
    well.position.set(DESERT_WELL_POS.x, wy, DESERT_WELL_POS.z);
    const basin = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.1, 4.2), sandstoneMat);
    basin.position.y = 0.55;
    const waterPool = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 0.15, 2.8),
      new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.2 }),
    );
    waterPool.position.y = 1.05;
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.5, 3.8), sandstoneMat);
    canopy.position.y = 3.6;
    [-1.4, 1.4].forEach((px) => {
      [-1.4, 1.4].forEach((pz) => {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.45, 2.6, 0.45), sandstoneMat);
        post.position.set(px, 2.2, pz);
        well.add(post);
      });
    });
    well.add(basin, waterPool, canopy);
    overworldGroup.add(well);
    staticMergeTargets.push({ group: well });
    colliders.push({ x: DESERT_WELL_POS.x, z: DESERT_WELL_POS.z, radius: 2.3 });
  }

  // 13c. Savanna Village (Acacia timber & terracotta huts)
  {
    const sy = getTerrainHeight(SAVANNA_VILLAGE_POS.x, SAVANNA_VILLAGE_POS.z);
    const sVillage = new THREE.Group();
    sVillage.position.set(SAVANNA_VILLAGE_POS.x, sy, SAVANNA_VILLAGE_POS.z);
    const offsets: [number, number, number][] = [
      [-8.5, -5, 0.3],
      [7.5, -6, -0.4],
      [-6.5, 7.5, 1.2],
      [8.0, 6.5, -1.3],
    ];
    offsets.forEach(([hx, hz, rot]) => {
      const hut = new THREE.Group();
      hut.position.set(hx, 0, hz);
      hut.rotation.y = rot;
      const body = new THREE.Mesh(new THREE.BoxGeometry(4.6, 3.0, 4.2), acaciaTrunkMat);
      body.position.y = 1.5;
      body.castShadow = true;
      const roof = new THREE.Mesh(new THREE.ConeGeometry(3.8, 2.4, 12), terracottaOrangeMat);
      roof.position.y = 4.1;
      roof.rotation.y = Math.PI / 4;
      hut.add(body, roof);
      sVillage.add(hut);
      colliders.push({ x: SAVANNA_VILLAGE_POS.x + hx, z: SAVANNA_VILLAGE_POS.z + hz, radius: 2.6 });
    });
    overworldGroup.add(sVillage);
    staticMergeTargets.push({ group: sVillage });
  }

  // 13d. Desert & Savanna Pillager Outposts
  [DESERT_OUTPOST_POS, SAVANNA_OUTPOST_POS].forEach(buildRegionalOutpost);

  // 13e. Badlands Surface Mineshaft (Dark Oak timber arches & rails)
  {
    const my = getTerrainHeight(BADLANDS_MINESHAFT_POS.x, BADLANDS_MINESHAFT_POS.z);
    const shaft = new THREE.Group();
    shaft.position.set(BADLANDS_MINESHAFT_POS.x, my, BADLANDS_MINESHAFT_POS.z);
    for (let arch = 0; arch < 5; arch++) {
      const az = (arch - 2) * 3.4;
      const leftPost = new THREE.Mesh(new THREE.BoxGeometry(0.45, 3.4, 0.45), darkOakTrunkMat);
      leftPost.position.set(-1.9, 1.7, az);
      const rightPost = new THREE.Mesh(new THREE.BoxGeometry(0.45, 3.4, 0.45), darkOakTrunkMat);
      rightPost.position.set(1.9, 1.7, az);
      const beam = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.45, 0.5), darkOakTrunkMat);
      beam.position.set(0, 3.4, az);
      shaft.add(leftPost, rightPost, beam);
    }
    const plankDeck = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.2, 16.5), darkOakTrunkMat);
    plankDeck.position.y = 0.1;
    shaft.add(plankDeck);
    overworldGroup.add(shaft);
    staticMergeTargets.push({ group: shaft });
  }

  // 13f. Swamp Hut (Witch Hut on wooden stilts)
  {
    const hy = getTerrainHeight(SWAMP_HUT_POS.x, SWAMP_HUT_POS.z);
    const hut = new THREE.Group();
    hut.position.set(SWAMP_HUT_POS.x, hy, SWAMP_HUT_POS.z);
    [-2.1, 2.1].forEach((sx) => {
      [-2.1, 2.1].forEach((sz) => {
        const stilt = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 2.6, 6), darkOakTrunkMat);
        stilt.position.set(sx, 1.2, sz);
        hut.add(stilt);
      });
    });
    const deck = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.35, 5.2), spruceTrunkMat);
    deck.position.y = 2.4;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(4.4, 2.8, 4.4), spruceTrunkMat);
    cabin.position.y = 3.95;
    cabin.castShadow = true;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.8, 2.1, 12), darkOakTrunkMat);
    roof.position.y = 6.3;
    roof.rotation.y = Math.PI / 4;
    hut.add(deck, cabin, roof);
    overworldGroup.add(hut);
    staticMergeTargets.push({ group: hut });
    colliders.push({ x: SWAMP_HUT_POS.x, z: SWAMP_HUT_POS.z, radius: 2.8 });
  }

  // 13g. Ancient Bone Fossils (Desert, Swamp & Mangrove Swamp)
  [DESERT_FOSSIL_POS, SWAMP_FOSSIL_POS, MANGROVE_SWAMP_POS].forEach((fPos, idx) => {
    const fx = fPos.x + (idx === 2 ? 18 : 0);
    const fz = fPos.z + (idx === 2 ? 14 : 0);
    const fy = getTerrainHeight(fx, fz);
    const fossil = new THREE.Group();
    fossil.position.set(fx, fy, fz);
    fossil.rotation.y = idx * 1.1;
    const spine = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 9.0), boneFossilMat);
    spine.position.y = 0.55;
    fossil.add(spine);
    for (let rib = 0; rib < 5; rib++) {
      const rz = (rib - 2) * 1.85;
      [-1, 1].forEach((side) => {
        const bone = new THREE.Mesh(new THREE.BoxGeometry(0.42, 3.1, 0.42), boneFossilMat);
        bone.position.set(side * 1.35, 1.55, rz);
        bone.rotation.z = side * 0.48;
        fossil.add(bone);
      });
    }
    overworldGroup.add(fossil);
    staticMergeTargets.push({ group: fossil });
  });

  // 13h. Deep Ocean Monument (Prismarine Temple with glowing Sea Lanterns)
  {
    const mon = new THREE.Group();
    mon.position.set(OCEAN_MONUMENT_POS.x, OCEAN_LEVEL - 3.4, OCEAN_MONUMENT_POS.z);
    for (let tier = 0; tier < 4; tier++) {
      const w = 18 - tier * 3.8;
      const block = new THREE.Mesh(new THREE.BoxGeometry(w, 1.6, w), prismarineMat);
      block.position.y = tier * 1.6 + 0.8;
      mon.add(block);
    }
    const beacon = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 2.4), seaLanternMat);
    beacon.position.y = 7.4;
    mon.add(beacon);
    overworldGroup.add(mon);
    staticMergeTargets.push({ group: mon });
  }

  // 13i. Warm Ocean Coral Reefs & Frozen Ocean Icebergs & Coastal Buried Treasure
  {
    // Warm Ocean Coral Reef cluster
    for (let i = 0; i < 14; i++) {
      const cx = CORAL_REEF_POS.x + (rand() - 0.5) * 48;
      const cz = CORAL_REEF_POS.z + (rand() - 0.5) * 32;
      addResourceNode(`coral_reef_${i}`, 'coral_cluster', cx, cz, 1.2 + rand() * 0.9, false);
    }
    // Frozen Ocean Icebergs
    for (let i = 0; i < 7; i++) {
      const ix = FROZEN_OCEAN_ICEBERG_POS.x + (i - 3) * 34 + (rand() - 0.5) * 14;
      const iz = FROZEN_OCEAN_ICEBERG_POS.z + (rand() - 0.5) * 38;
      const berg = new THREE.Group();
      berg.position.set(ix, OCEAN_LEVEL - 1.2, iz);
      const base = new THREE.Mesh(new THREE.DodecahedronGeometry(6.5 + rand() * 4.5, 0), packedIceMat);
      base.scale.set(1.4, 0.85, 1.25);
      base.position.y = 2.4;
      const peak = new THREE.Mesh(new THREE.ConeGeometry(4.2, 9.5 + rand() * 5.0, 5), i % 2 === 0 ? blueIceMat : packedIceMat);
      peak.position.y = 6.2;
      berg.add(base, peak);
      overworldGroup.add(berg);
      staticMergeTargets.push({ group: berg });
    }
    // Coastal Buried Treasure X-marker & weathered chest
    const by = getTerrainHeight(BURIED_TREASURE_POS.x, BURIED_TREASURE_POS.z);
    const chest = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.75, 0.8), darkOakTrunkMat);
    chest.position.set(BURIED_TREASURE_POS.x, by + 0.35, BURIED_TREASURE_POS.z);
    overworldGroup.add(chest);
  }

  // ===== GRAND FINALE PACK BIOME LANDMARKS (Auto-culled by distance + 3.5ms FrameBudgetQueue) =====
  {
    const obsidianMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.55, metalness: 0.25 });
    const magmaGlowMat = new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xea580c, emissiveIntensity: 1.4, roughness: 0.3 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.82, roughness: 0.22 });
    const spectralGhostMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0ea5e9,
      emissiveIntensity: 1.15,
      transparent: true,
      opacity: 0.74,
      roughness: 0.2,
    });
    const gothicStoneMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.88 });
    const vikingTimberMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.82 });
    const vikingSailMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.7, side: THREE.DoubleSide });
    const tikiThatchMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.9 });
    const jetSkiMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, metalness: 0.45, roughness: 0.22 });
    const jetSkiAccentMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, metalness: 0.35, roughness: 0.25 });
    disposableMats.push(
      obsidianMat,
      magmaGlowMat,
      goldMat,
      spectralGhostMat,
      gothicStoneMat,
      vikingTimberMat,
      vikingSailMat,
      tikiThatchMat,
      jetSkiMat,
      jetSkiAccentMat,
    );

    // 1. DRAGON VALLEY — Towering obsidian cliff and dragon roost north of the hill house
    const dvGroup = new THREE.Group();
    const dvY = getTerrainHeight(DRAGON_VALLEY_POS.x, DRAGON_VALLEY_POS.z);
    dvGroup.position.set(DRAGON_VALLEY_POS.x, dvY, DRAGON_VALLEY_POS.z);
    // Keep the authored roost layout facing the valley pass. The basin now sits
    // on the remote northern ridge, so there is no nearby village to crowd.
    dvGroup.rotation.y = Math.PI * 0.5;
    const lavaPool = new THREE.Mesh(new THREE.CylinderGeometry(11, 12, 0.3, 18), magmaGlowMat);
    lavaPool.position.y = 0.16;
    dvGroup.add(lavaPool);
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const dist = 16 + (i % 2) * 5;
      const h = 9 + (i % 3) * 4.5;
      // A lathed, arched profile replaces the old six-sided cone so the
      // obsidian needles swell at the base and curve to a fine point.
      const spireProfile = [
        new THREE.Vector2(2.7, 0),
        new THREE.Vector2(2.45, h * 0.18),
        new THREE.Vector2(1.95, h * 0.42),
        new THREE.Vector2(1.3, h * 0.64),
        new THREE.Vector2(0.62, h * 0.83),
        new THREE.Vector2(0.06, h),
      ];
      const spire = new THREE.Mesh(new THREE.LatheGeometry(spireProfile, 18), obsidianMat);
      spire.position.set(Math.cos(ang) * dist, 0.05, Math.sin(ang) * dist);
      spire.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.12;
      spire.castShadow = true;
      spire.receiveShadow = true;
      dvGroup.add(spire);
    }
    // Heroic perched dragon on the central obsidian plinth. Layered PBR scale
    // relief, veined membranes, slit pupils and swept horns replace the old
    // capsule-and-box silhouette.
    const dragonPlinth = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 5.4, 2.4, 26), obsidianMat);
    dragonPlinth.position.y = 1.2;
    const plinthDragon = createRealisticDragon({
      variant: 'ember',
      quality: 'hero',
      heroic: true,
      folded: false,
    });
    plinthDragon.group.position.set(0, 2.38, 0);
    plinthDragon.group.rotation.y = -0.22;
    plinthDragon.group.scale.setScalar(1.36);
    dvGroup.add(dragonPlinth, plinthDragon.group);

    // The valley's signature landmark: a sheer dragon cliff with broad roosting
    // shelves. The beacon sits on its summit and is visible from the hill house.
    const dragonCliff = new THREE.Mesh(
      new THREE.CylinderGeometry(12, 18, 34, 28, 6),
      obsidianMat,
    );
    dragonCliff.position.set(-20, 17, -8);
    dragonCliff.castShadow = true;
    dragonCliff.receiveShadow = true;
    const cliffLedgeLow = new THREE.Mesh(
      new THREE.CylinderGeometry(17, 17.8, 1.2, 28, 2),
      obsidianMat,
    );
    cliffLedgeLow.position.set(-20, 9.4, -8);
    cliffLedgeLow.castShadow = true;
    const cliffLedgeHigh = new THREE.Mesh(
      new THREE.CylinderGeometry(10.5, 11.2, 1.0, 28, 2),
      obsidianMat,
    );
    cliffLedgeHigh.position.set(-20, 23.4, -8);
    cliffLedgeHigh.castShadow = true;
    const cliffTop = new THREE.Mesh(new THREE.CylinderGeometry(8, 8.8, 0.8, 28, 2), obsidianMat);
    cliffTop.position.set(-20, 34.2, -8);
    cliffTop.castShadow = true;
    dvGroup.add(dragonCliff, cliffLedgeLow, cliffLedgeHigh, cliffTop);

    overworldGroup.add(dvGroup);
    staticMergeTargets.push({ group: dvGroup });

    // Fractured natural rock walls and roost ledges sit in the carved bowl.
    const dragonCliffRing = buildDragonValleyCliffRing();
    overworldGroup.add(dragonCliffRing);
    staticMergeTargets.push({ group: dragonCliffRing });

    // Wild dragons continuously circle the valley. They stay unmerged so the
    // engine can animate wing beats and cull them beyond the draw distance.
    const addRoostDragon = (
      x: number,
      y: number,
      z: number,
      scale: number,
      variant: DragonVariant,
      rotY: number,
    ) => {
      const roost = new THREE.Group();
      roost.position.set(x, y, z);
      roost.rotation.y = rotY;
      roost.scale.setScalar(scale);
      const dragon = createRealisticDragon({
        variant,
        quality: scale < 0.45 ? 'low' : scale > 1.2 ? 'hero' : 'standard',
        folded: true,
      });
      // Feet rest on the ledge instead of hovering above it.
      dragon.group.position.y = 0.06;
      roost.add(dragon.group);
      dvGroup.add(roost);
    };

    // A full roost: rock-sized hatchling through huge adults on every shelf.
    addRoostDragon(9.5, 0.35, 8.5, 0.18, 'shadow', 0.5);
    addRoostDragon(6.5, 0.45, 11.5, 0.3, 'ember', -0.7);
    addRoostDragon(11.5, 0.6, 6.5, 0.44, 'storm', 1.2);
    addRoostDragon(-10.5, 0.55, 8.5, 0.62, 'ember', 2.1);
    addRoostDragon(-12.0, 10.05, -5.0, 0.8, 'storm', -0.4);
    addRoostDragon(-29.0, 10.05, -4.0, 1.02, 'shadow', 0.9);
    addRoostDragon(-15.0, 23.95, -8.0, 1.24, 'ember', 0.2);
    addRoostDragon(-25.5, 23.95, -8.0, 1.46, 'storm', -0.65);
    addRoostDragon(-20.0, 34.65, -8.0, 1.62, 'shadow', 0.0);
    addRoostDragon(-24.0, 34.65, -5.0, 1.82, 'ember', 0.85);

    // Huge island-findable beacon planted on the cliff summit.
    const beaconGroup = new THREE.Group();
    // Matches the rotated cliff summit: local (-20, -8) becomes (-8, +20).
    beaconGroup.position.set(DRAGON_VALLEY_POS.x - 8, dvY + 35, DRAGON_VALLEY_POS.z + 20);
    const beaconBase = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 6.0, 2.2, 24), obsidianMat);
    beaconBase.position.y = 0.4;
    const beaconBeamMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      fog: false,
    });
    const beaconCoreMat = new THREE.MeshBasicMaterial({
      color: 0xfff7d6,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      fog: false,
    });
    const beaconBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(1.4, 3.2, 230, 20, 1, true),
      beaconBeamMat,
    );
    beaconBeam.position.y = 116;
    const beaconCore = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 1.0, 238, 18, 1, true),
      beaconCoreMat,
    );
    beaconCore.position.y = 120;
    const beaconRingMat = new THREE.MeshBasicMaterial({
      color: 0xfde68a,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      fog: false,
    });
    const beaconRing = new THREE.Mesh(new THREE.TorusGeometry(4.4, 0.3, 8, 24), beaconRingMat);
    beaconRing.rotation.x = Math.PI * 0.5;
    beaconRing.position.y = 1.4;
    beaconGroup.add(beaconBase, beaconBeam, beaconCore, beaconRing);
    overworldGroup.add(beaconGroup);
    disposableMats.push(beaconBeamMat, beaconCoreMat, beaconRingMat);
    dragonValleyBeacon = {
      group: beaconGroup,
      beamMat: beaconBeamMat,
      coreMat: beaconCoreMat,
      ring: beaconRing,
    };

    const addValleyFlyer = (
      centerX: number,
      centerZ: number,
      visibilityRange: number,
      radius: number,
      height: number,
      speed: number,
      phase: number,
      scale: number,
      variant: DragonVariant,
    ) => {
      const dragon = createRealisticDragon({
        variant,
        quality: scale > 1.3 ? 'hero' : 'standard',
        folded: false,
      });
      const { group, wingL, wingR } = dragon;
      group.scale.setScalar(scale);
      group.position.set(
        centerX + Math.cos(phase) * radius,
        getTerrainHeight(centerX, centerZ) + height + Math.sin(phase * 2.3) * 1.6,
        centerZ + Math.sin(phase) * radius,
      );
      group.rotation.y = -phase;
      group.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          obj.castShadow = false;
          obj.userData.noShadowCast = true;
        }
      });
      overworldGroup.add(group);
      dragonValleyFlyers.push({
        group,
        wingL,
        wingR,
        centerX,
        centerZ,
        radius,
        height,
        speed,
        phase,
        visibilityRange,
        variant,
      });
    };
    // The wild flight stays over the remote northern basin. No ambient dragon
    // patrols orbit the starter shelter now that the valley has moved.
    addValleyFlyer(DRAGON_VALLEY_POS.x, DRAGON_VALLEY_POS.z, 340, 25, 15, 0.22, 0.3, 1.0, 'ember');
    addValleyFlyer(DRAGON_VALLEY_POS.x, DRAGON_VALLEY_POS.z, 340, 33, 21, 0.17, 2.5, 1.35, 'storm');
    addValleyFlyer(DRAGON_VALLEY_POS.x, DRAGON_VALLEY_POS.z, 340, 20, 11, 0.28, 4.4, 0.85, 'shadow');
    addValleyFlyer(DRAGON_VALLEY_POS.x, DRAGON_VALLEY_POS.z, 430, 58, 30, 0.12, 1.1, 1.15, 'storm');
    addValleyFlyer(DRAGON_VALLEY_POS.x, DRAGON_VALLEY_POS.z, 430, 44, 24, 0.16, 4.0, 0.8, 'shadow');
    addValleyFlyer(DRAGON_VALLEY_POS.x, DRAGON_VALLEY_POS.z, 470, 82, 46, 0.075, 3.2, 1.5, 'ember');

    // Abandoned adult dragon curled around its old hoard at the valley edge.
    abandonedDragonGroup = new THREE.Group();
    const abandonY = getTerrainHeight(DRAGON_VALLEY_ABANDONED_POS.x, DRAGON_VALLEY_ABANDONED_POS.z);
    abandonedDragonGroup.position.set(
      DRAGON_VALLEY_ABANDONED_POS.x,
      abandonY,
      DRAGON_VALLEY_ABANDONED_POS.z,
    );
    abandonedDragonGroup.rotation.y = -0.8;
    const hoardPile = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.9, 0.28, 12), goldMat);
    hoardPile.position.y = 0.14;
    const abandonedDragon = createRealisticDragon({
      variant: 'storm',
      quality: 'hero',
      folded: true,
      heroic: true,
    });
    abandonedDragon.group.position.set(0, 0.04, 0);
    abandonedDragon.group.rotation.y = 0.26;
    abandonedDragon.group.scale.setScalar(1.16);
    const oldSaddleMat = new THREE.MeshStandardMaterial({ color: 0x57534e, roughness: 0.92 });
    const oldSaddle = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.18, 1.15), oldSaddleMat);
    oldSaddle.position.set(0, 2.44, 0.15);
    oldSaddle.rotation.x = -0.06;
    const saddleStrap = new THREE.Mesh(new THREE.TorusGeometry(1.02, 0.06, 6, 14), oldSaddleMat);
    saddleStrap.rotation.y = Math.PI * 0.5;
    saddleStrap.position.set(0, 1.94, 0.2);
    saddleStrap.scale.set(1, 1, 0.72);
    abandonedDragonGroup.add(
      hoardPile,
      abandonedDragon.group,
      oldSaddle,
      saddleStrap,
    );
    disposableMats.push(oldSaddleMat);
    staticMergeTargets.push({ group: abandonedDragonGroup });
    overworldGroup.add(abandonedDragonGroup);

    // 2. VIKING VILLAGE (560, -260) — Nordic Longhouse, Shield Racks, Rune Stones & Moored Viking Longship
    const vvGroup = new THREE.Group();
    const vvY = getTerrainHeight(VIKING_VILLAGE_POS.x, VIKING_VILLAGE_POS.z);
    vvGroup.position.set(VIKING_VILLAGE_POS.x, vvY, VIKING_VILLAGE_POS.z);
    // Main Nordic Mead Hall Longhouse
    const hallWalls = new THREE.Mesh(new THREE.BoxGeometry(14, 4.2, 8.5), vikingTimberMat);
    hallWalls.position.set(0, 2.1, 0);
    const hallRoof = new THREE.Mesh(new THREE.ConeGeometry(10.6, 4.4, 16), obsidianMat);
    hallRoof.rotation.y = Math.PI * 0.25;
    hallRoof.scale.set(1.2, 1, 0.78);
    hallRoof.position.set(0, 6.2, 0);
    const hearthFire = new THREE.Mesh(new THREE.ConeGeometry(1.1, 1.8, 6), magmaGlowMat);
    hearthFire.position.set(0, 0.9, 7.2);
    vvGroup.add(hallWalls, hallRoof, hearthFire);
    // Secondary Viking Hut + Shield Racks & Rune Stones
    const hut = new THREE.Mesh(new THREE.BoxGeometry(7.2, 3.2, 6.0), vikingTimberMat);
    hut.position.set(-14, 1.6, -5);
    const hutRoof = new THREE.Mesh(new THREE.ConeGeometry(5.6, 3.0, 14), obsidianMat);
    hutRoof.rotation.y = Math.PI * 0.25;
    hutRoof.position.set(-14, 4.7, -5);
    vvGroup.add(hut, hutRoof);
    for (let i = 0; i < 6; i++) {
      const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.14, 10), i % 2 === 0 ? vikingSailMat : goldMat);
      shield.rotation.x = Math.PI * 0.5;
      shield.position.set(-5 + i * 2.0, 2.0, 4.35);
      vvGroup.add(shield);
    }
    // Moored Viking Longship
    const longship = new THREE.Group();
    longship.position.set(16, 0.4, 8);
    longship.rotation.y = -0.45;
    const hull = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.5, 13.5), vikingTimberMat);
    hull.position.y = 0.75;
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 8.5, 6), vikingTimberMat);
    mast.position.y = 4.6;
    const sail = new THREE.Mesh(new THREE.PlaneGeometry(5.8, 4.6), vikingSailMat);
    sail.position.set(0, 5.4, 0.2);
    longship.add(hull, mast, sail);
    vvGroup.add(longship);
    overworldGroup.add(vvGroup);
    staticMergeTargets.push({ group: vvGroup });

    // 3. RESORT CORNER (-480, 410) — Thatched Tiki Lounge Bar, Torches, Beach Umbrellas & 2 Jet Skis
    const rcGroup = new THREE.Group();
    const rcY = getTerrainHeight(RESORT_CORNER_POS.x, RESORT_CORNER_POS.z);
    rcGroup.position.set(RESORT_CORNER_POS.x, rcY, RESORT_CORNER_POS.z);
    // Tiki Lounge Deck, Bar Counter & Thatched Roof
    const tikiDeck = new THREE.Mesh(new THREE.BoxGeometry(11.5, 0.6, 8.5), vikingTimberMat);
    tikiDeck.position.y = 0.3;
    const barCounter = new THREE.Mesh(new THREE.BoxGeometry(7.2, 1.35, 1.5), tikiThatchMat);
    barCounter.position.set(0, 1.25, -1.2);
    const tikiRoof = new THREE.Mesh(new THREE.ConeGeometry(8.2, 3.2, 6), tikiThatchMat);
    tikiRoof.position.set(0, 5.4, 0);
    rcGroup.add(tikiDeck, barCounter, tikiRoof);
    for (const [px, pz] of [[-4.8, -3.4], [4.8, -3.4], [-4.8, 3.4], [4.8, 3.4]]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 4.2, 6), vikingTimberMat);
      post.position.set(px, 2.4, pz);
      const torch = new THREE.Mesh(new THREE.SphereGeometry(0.28, 6, 6), magmaGlowMat);
      torch.position.set(px, 4.1, pz + (pz > 0 ? 0.5 : -0.5));
      rcGroup.add(post, torch);
    }
    // Glowing Tiki Drink Bottles on the Bar (Coconut Surge, Mango Shield, Sunset Fizz)
    const drinkColors = [0x38bdf8, 0xfacc15, 0xf43f5e];
    for (let i = 0; i < 3; i++) {
      const bottleMat = new THREE.MeshStandardMaterial({
        color: drinkColors[i],
        emissive: drinkColors[i],
        emissiveIntensity: 0.75,
        roughness: 0.2,
      });
      disposableMats.push(bottleMat);
      const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.65, 8), bottleMat);
      bottle.position.set(-1.6 + i * 1.6, 2.25, -1.2);
      rcGroup.add(bottle);
    }
    // 2 Docked Coastal Jet Skis
    for (let i = 0; i < 2; i++) {
      const ski = new THREE.Group();
      ski.position.set(-10 + i * 4.8, 0.45, 11.5);
      ski.rotation.y = 0.35 - i * 0.25;
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.55, 2.9), i === 0 ? jetSkiMat : jetSkiAccentMat);
      const cowl = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.42, 0.95), obsidianMat);
      cowl.position.set(0, 0.42, 0.45);
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.28, 1.3), obsidianMat);
      seat.position.set(0, 0.38, -0.45);
      ski.add(body, cowl, seat);
      rcGroup.add(ski);
    }
    overworldGroup.add(rcGroup);
    staticMergeTargets.push({ group: rcGroup });

    // 4. RUINED CASTLE (-360, -520) — Gothic Citadel Ruins, Throne Dais & Fallen King Ghost Boss
    const castleGroup = new THREE.Group();
    const castleY = getTerrainHeight(RUINED_CASTLE_POS.x, RUINED_CASTLE_POS.z);
    castleGroup.position.set(RUINED_CASTLE_POS.x, castleY, RUINED_CASTLE_POS.z);
    // 4 Broken Corner Towers + Battlement Walls
    for (const [tx, tz, th] of [
      [-13, -13, 13.5],
      [13, -13, 11.0],
      [-13, 13, 9.5],
      [13, 13, 12.0],
    ]) {
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 3.2, th, 8), gothicStoneMat);
      tower.position.set(tx, th * 0.5, tz);
      castleGroup.add(tower);
    }
    const northWall = new THREE.Mesh(new THREE.BoxGeometry(24, 6.2, 2.2), gothicStoneMat);
    northWall.position.set(0, 3.1, -13);
    const westWall = new THREE.Mesh(new THREE.BoxGeometry(2.2, 5.0, 24), gothicStoneMat);
    westWall.position.set(-13, 2.5, 0);
    const eastWall = new THREE.Mesh(new THREE.BoxGeometry(2.2, 5.4, 24), gothicStoneMat);
    eastWall.position.set(13, 2.7, 0);
    const throneDais = new THREE.Mesh(new THREE.BoxGeometry(6.5, 1.2, 5.5), obsidianMat);
    throneDais.position.set(0, 0.6, -6.5);
    const throneBack = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.8, 0.7), gothicStoneMat);
    throneBack.position.set(0, 3.0, -8.2);
    castleGroup.add(northWall, westWall, eastWall, throneDais, throneBack);
    // Spectral Braziers flanking the Throne
    for (const bx of [-4.2, 4.2]) {
      const brazier = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.45, 1.4, 6), obsidianMat);
      brazier.position.set(bx, 0.7, -3.5);
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.3, 6), spectralGhostMat);
      flame.position.set(bx, 1.9, -3.5);
      castleGroup.add(brazier, flame);
    }
    // Hovering "Fallen King Ghost" Boss Statue/Avatar above the Throne
    const fallenKing = new THREE.Group();
    fallenKing.position.set(0, 3.4, -5.8);
    const kingCloak = new THREE.Mesh(new THREE.ConeGeometry(1.15, 3.2, 8), spectralGhostMat);
    const kingHead = new THREE.Mesh(new THREE.SphereGeometry(0.58, 10, 8), spectralGhostMat);
    kingHead.position.y = 1.95;
    const kingCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.48, 0.42, 6), goldMat);
    kingCrown.position.y = 2.55;
    const kingBlade = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.8, 0.32), spectralGhostMat);
    kingBlade.position.set(1.25, 0.9, 0.5);
    kingBlade.rotation.z = -0.28;
    fallenKing.add(kingCloak, kingHead, kingCrown, kingBlade);
    castleGroup.add(fallenKing);
    overworldGroup.add(castleGroup);
    staticMergeTargets.push({ group: castleGroup });
  }

  // Cleanly zoned biome resource scatter (filling dead spots across the 740m Grand Island, well spread out & instanced)
  let count = 0;
  for (let attempt = 0; attempt < 15500 && count < 2250; attempt++) {
    const angle = rand() * Math.PI * 2;
    const rad = 24 + Math.sqrt(rand()) * 705;
    const x = Math.cos(angle) * rad;
    const z = Math.sin(angle) * rad;

    if (Math.hypot(x - PLAYER_SPAWN.x, z - PLAYER_SPAWN.z) < 20) continue;
    if (z >= PLAYER_SPAWN.z + 2 && Math.abs(x - SHIPWRECK_POS.x) < 34) continue; // Keep shipwreck shoreline corridor clean
    if (Math.hypot(x - DRAGON_VALLEY_POS.x, z - DRAGON_VALLEY_POS.z) < 28) continue;
    if (Math.hypot(x - VIKING_VILLAGE_POS.x, z - VIKING_VILLAGE_POS.z) < 28) continue;
    if (Math.hypot(x - RESORT_CORNER_POS.x, z - RESORT_CORNER_POS.z) < 26) continue;
    if (Math.hypot(x - RUINED_CASTLE_POS.x, z - RUINED_CASTLE_POS.z) < 28) continue;
    if (Math.hypot(x - DESERT_PYRAMID_POS.x, z - DESERT_PYRAMID_POS.z) < 16) continue;
    if (Math.hypot(x - DESERT_VILLAGE_POS.x, z - DESERT_VILLAGE_POS.z) < 16) continue;
    if (Math.hypot(x - DESERT_WELL_POS.x, z - DESERT_WELL_POS.z) < 8) continue;
    if (Math.hypot(x - DESERT_OUTPOST_POS.x, z - DESERT_OUTPOST_POS.z) < 9) continue;
    if (Math.hypot(x - SAVANNA_VILLAGE_POS.x, z - SAVANNA_VILLAGE_POS.z) < 16) continue;
    if (Math.hypot(x - SAVANNA_OUTPOST_POS.x, z - SAVANNA_OUTPOST_POS.z) < 9) continue;
    if (Math.hypot(x - BADLANDS_MINESHAFT_POS.x, z - BADLANDS_MINESHAFT_POS.z) < 12) continue;
    if (Math.hypot(x - SWAMP_HUT_POS.x, z - SWAMP_HUT_POS.z) < 9) continue;
    if (Math.hypot(x - PLAINS_VILLAGE_POS.x, z - PLAINS_VILLAGE_POS.z) < 16) continue;
    if (Math.hypot(x - SUNFLOWER_VILLAGE_POS.x, z - SUNFLOWER_VILLAGE_POS.z) < 15) continue;
    if (Math.hypot(x - RUINED_PORTAL_POS.x, z - RUINED_PORTAL_POS.z) < 8) continue;
    if (Math.hypot(x - MEADOW_OUTPOST_POS.x, z - MEADOW_OUTPOST_POS.z) < 8) continue;
    if (Math.hypot(x - GROVE_OUTPOST_POS.x, z - GROVE_OUTPOST_POS.z) < 8) continue;
    if (Math.hypot(x - SNOWY_PLAINS_OUTPOST_POS.x, z - SNOWY_PLAINS_OUTPOST_POS.z) < 8) continue;
    if (Math.hypot(x - SNOWY_SLOPES_IGLOO_POS.x, z - SNOWY_SLOPES_IGLOO_POS.z) < 7) continue;
    if (Math.hypot(x - JAGGED_PEAKS_POS.x, z - JAGGED_PEAKS_POS.z) < 8) continue;
    if (Math.hypot(x - FROZEN_PEAKS_POS.x, z - FROZEN_PEAKS_POS.z) < 8) continue;
    if (Math.hypot(x - STONY_PEAKS_POS.x, z - STONY_PEAKS_POS.z) < 8) continue;
    if (Math.hypot(x - EXPEDITION_POS.x, z - EXPEDITION_POS.z) < 9) continue;
    if (Math.hypot(x - CAVE_POS.x, z - CAVE_POS.z) < 9) continue;
    if (Math.hypot(x - HOMESTEAD_POS.x, z - HOMESTEAD_POS.z) < 20) continue;
    if (Math.hypot(x - WHEATFIELD_POS.x, z - WHEATFIELD_POS.z) < 11.5) continue;
    if (Math.hypot(x - FARMER_POS.x, z - FARMER_POS.z) < 10.5) continue;
    if (Math.hypot(x - HILL_HOUSE_POS.x, z - HILL_HOUSE_POS.z) < 16.5) continue;
    if (Math.hypot(x - VEHICLE_GARAGE_POS.x, z - VEHICLE_GARAGE_POS.z) < 20.0) continue;
    if (
      x >= VEHICLE_GARAGE_POS.x - 18 &&
      x <= VEHICLE_GARAGE_POS.x + 28 &&
      z >= VEHICLE_GARAGE_POS.z - 6 &&
      z <= VEHICLE_GARAGE_POS.z + 24
    ) {
      continue; // Keep garage wide driveways to beaches & trails completely clear of trees/boulders
    }
    if (
      x >= HILL_HOUSE_POS.x + 3 &&
      x <= HILL_HOUSE_POS.x + 23 &&
      Math.abs(z - HILL_HOUSE_POS.z) < 5.8
    ) {
      continue;
    }
    if (Math.hypot(x - FARM_POND_POS.x, z - FARM_POND_POS.z) < 8) continue;
    if (Math.hypot(x - SNOWY_WOODLAND_POS.x, z - SNOWY_WOODLAND_POS.z) < 14) continue;
    if (Math.hypot(x - AUTUMN_GROVE_POS.x, z - AUTUMN_GROVE_POS.z) < 11) continue;
    if (Math.hypot(x - SWAMP_POS.x, z - SWAMP_POS.z) < SWAMP_POS.radius + 3.5) continue;
    if (Math.hypot(x - DEAD_OAK_POS.x, z - DEAD_OAK_POS.z) < 5) continue;
    // Keep new biome landmark pads clear of intersecting trees/boulders
    if (Math.hypot(x - TRIAL_CHAMBERS_POS.x, z - TRIAL_CHAMBERS_POS.z) < 6.5) continue;
    if (Math.hypot(x - WOODLAND_MANSION_POS.x, z - WOODLAND_MANSION_POS.z) < 11.2) continue;
    if (Math.hypot(x - TAIGA_VILLAGE_POS.x, z - TAIGA_VILLAGE_POS.z) < 11.5) continue;
    if (Math.hypot(x - PILLAGER_OUTPOST_POS.x, z - PILLAGER_OUTPOST_POS.z) < 6.5) continue;
    if (Math.hypot(x - TRAIL_RUINS_POS.x, z - TRAIL_RUINS_POS.z) < 6.5) continue;
    if (Math.hypot(x - SNOWY_VILLAGE_POS.x, z - SNOWY_VILLAGE_POS.z) < 11.5) continue;
    if (Math.hypot(x - SNOWY_IGLOO_POS.x, z - SNOWY_IGLOO_POS.z) < 6.5) continue;
    if (Math.hypot(x - JUNGLE_TEMPLE_POS.x, z - JUNGLE_TEMPLE_POS.z) < 8.5) continue;

    const h = getTerrainHeight(x, z);
    const slope = getTerrainSlope(x, z);
    const biome = getBiomeAt(x, z);
    const river = getRiverSample(x, z);

    if (h < 0.35 || slope > 0.72) continue;
    if (biome === 'lake' && h < LAKE_CENTER.waterY + 0.1) continue;
    if (river.inRiver && h < river.waterY + 0.1) continue;

    // Wide-open breathable spacing across all biomes so everything is well spread out
    const minDistSq =
      biome === 'grassland' || biome === 'beach' || biome === 'sparse_jungle'
        ? 96
        : biome === 'jungle' || biome === 'bamboo_jungle' || biome === 'dark_forest'
          ? 30
          : 44;
    let tooClose = false;
    for (let i = 0; i < resourceNodes.length; i++) {
      const n = resourceNodes[i];
      if ((n.x - x) * (n.x - x) + (n.z - z) * (n.z - z) < minDistSq) {
        tooClose = true;
        break;
      }
    }
    if (tooClose) continue;

    let kind: ResourceNodeKind | null = null;
    if (biome === 'beach') {
      const r = rand();
      kind = r < 0.65 ? 'palm_tree' : r < 0.88 ? 'sand_mound' : 'small_stone';
    } else if (biome === 'river' || (river.dist < 12.5 && river.dist > 5.5)) {
      const r = rand();
      kind =
        r < 0.3
          ? 'bean_patch'
          : r < 0.6
            ? 'clay_deposit'
            : r < 0.85
              ? 'sugarcane_patch'
              : 'small_stone';
    } else if (biome === 'mountain') {
      const r = rand();
      kind =
        r < 0.3
          ? 'ore_vein'
          : r < 0.56
            ? 'mountain_rock'
            : r < 0.74
              ? 'stone_boulder'
              : r < 0.88
                ? 'flint_outcrop'
                : 'highland_cedar';
    } else if (biome === 'grassland') {
      const r = rand();
      kind =
        r < 0.34
          ? 'wheat_patch'
          : r < 0.52
            ? 'bean_patch'
            : r < 0.78
              ? 'grass_tuft'
              : r < 0.9
                ? 'berry_bush'
                : 'palm_tree';
    } else if (biome === 'flower_forest') {
      // Oak & Birch trees + dense all-flowers glade (Dandelions, Poppies, Lilacs, Rose Bushes, Peonies, Lily of the Valley)
      const r = rand();
      kind =
        r < 0.34
          ? 'flower_patch'
          : r < 0.48
            ? 'rose_bush'
            : r < 0.6
              ? 'lilac_bush'
              : r < 0.72
                ? 'peony_bush'
                : r < 0.86
                  ? 'birch_tree'
                  : 'oak_tree';
    } else if (biome === 'birch_forest') {
      // Birch trees + Dandelions, Poppies, Lily of the Valley, Wildflowers
      const r = rand();
      kind =
        r < 0.58
          ? 'birch_tree'
          : r < 0.84
            ? 'flower_patch'
            : 'fiber_fern';
    } else if (biome === 'old_growth_birch_forest') {
      // Tall Birch (up to 14 blocks high) + Dandelions, Poppies, Lily of the Valley
      const r = rand();
      kind =
        r < 0.64
          ? 'old_growth_birch_tree'
          : r < 0.84
            ? 'flower_patch'
            : 'fiber_fern';
    } else if (biome === 'dark_forest') {
      // Dark Oak, Huge Red & Brown Mushrooms, Rose Bushes & Flowers
      const r = rand();
      kind =
        r < 0.5
          ? 'dark_oak_tree'
          : r < 0.64
            ? 'huge_red_mushroom'
            : r < 0.78
              ? 'huge_brown_mushroom'
              : r < 0.89
                ? 'rose_bush'
                : 'flower_patch';
    } else if (biome === 'pale_garden') {
      // Pale Oak (with Pale Hanging Moss & Creaking Hearts) + Eyeblossoms + Pale Moss
      const r = rand();
      kind =
        r < 0.58
          ? 'pale_oak_tree'
          : r < 0.84
            ? 'eyeblossom_patch'
            : 'branch_pile';
    } else if (biome === 'taiga') {
      // Spruce + Ferns, Large Ferns, Sweet Berry Bushes
      const r = rand();
      kind =
        r < 0.56
          ? 'spruce_tree'
          : r < 0.78
            ? 'fiber_fern'
            : 'berry_bush';
    } else if (biome === 'old_growth_pine_taiga') {
      // Mega Spruce (straight trunks), Standard Spruce, Ferns, Dead Bushes, Sweet Berries, Brown Mushrooms, Mossy Cobble
      const r = rand();
      kind =
        r < 0.4
          ? 'old_growth_pine_tree'
          : r < 0.56
            ? 'spruce_tree'
            : r < 0.68
              ? 'mossy_cobble_boulder'
              : r < 0.78
                ? 'dead_bush'
                : r < 0.88
                  ? 'berry_bush'
                  : r < 0.94
                    ? 'mushroom_cluster'
                    : 'fiber_fern';
    } else if (biome === 'old_growth_spruce_taiga') {
      // Mega Spruce (bushy trunks), Standard Spruce, Ferns, Sweet Berries, Mushrooms, Mossy Cobble
      const r = rand();
      kind =
        r < 0.44
          ? 'mega_spruce_tree'
          : r < 0.62
            ? 'spruce_tree'
            : r < 0.74
              ? 'mossy_cobble_boulder'
              : r < 0.84
                ? 'berry_bush'
                : r < 0.92
                  ? 'mushroom_cluster'
                  : 'fiber_fern';
    } else if (biome === 'snowy_taiga') {
      // Spruce + Ferns + Sweet Berry Bushes
      const r = rand();
      kind =
        r < 0.66
          ? 'snowy_spruce_tree'
          : r < 0.84
            ? 'berry_bush'
            : 'fiber_fern';
    } else if (biome === 'jungle') {
      // Mega Jungle Trees, Jungle Trees, Jungle Bushes, Cocoa Beans, Melons, Bamboo, Vines
      const r = rand();
      kind =
        r < 0.34
          ? 'mega_jungle_tree'
          : r < 0.56
            ? 'jungle_tree'
            : r < 0.72
              ? 'jungle_bush'
              : r < 0.86
                ? 'bamboo_stalk'
                : 'melon_patch';
    } else if (biome === 'sparse_jungle') {
      // Scattered Jungle Trees, Jungle Bushes, Melons, Cocoa Beans, Vines
      const r = rand();
      kind =
        r < 0.44
          ? 'jungle_tree'
          : r < 0.68
            ? 'jungle_bush'
            : r < 0.88
              ? 'melon_patch'
              : 'fiber_fern';
    } else if (biome === 'bamboo_jungle') {
      // Mega Jungle Trees, Jungle Bushes, Dense Bamboo Stalks, Melons
      const r = rand();
      kind =
        r < 0.56
          ? 'bamboo_stalk'
          : r < 0.74
            ? 'mega_jungle_tree'
            : r < 0.88
              ? 'jungle_bush'
              : 'melon_patch';
    } else if (biome === 'plains') {
      // Sparse Oak + Tall Grass + Wild Beans + Dandelions, Poppies, Azure Bluets, Oxeye Daisies, Cornflowers, Tulips
      const r = rand();
      kind =
        r < 0.14
          ? 'oak_tree'
          : r < 0.34
            ? 'bean_patch'
            : r < 0.68
              ? 'flower_patch'
              : 'grass_tuft';
    } else if (biome === 'sunflower_plains') {
      // Sparse Oak + Sunflowers + Wild Beans + Plains flowers
      const r = rand();
      kind =
        r < 0.1
          ? 'oak_tree'
          : r < 0.24
            ? 'bean_patch'
            : r < 0.74
              ? 'sunflower_patch'
              : 'flower_patch';
    } else if (biome === 'snowy_plains') {
      // Sparse Snowy Spruce + snow-covered tufts
      const r = rand();
      kind = r < 0.28 ? 'snowy_spruce_tree' : r < 0.62 ? 'small_stone' : 'grass_tuft';
    } else if (biome === 'ice_spikes') {
      // Towering Packed Ice & rare Blue Ice spikes (no trees!)
      kind = 'ice_spike';
    } else if (biome === 'meadow') {
      // Lone Oak with Bee Nest + Alpine wildflowers
      const r = rand();
      kind = r < 0.16 ? 'bee_nest_oak' : r < 0.78 ? 'flower_patch' : 'grass_tuft';
    } else if (biome === 'cherry_grove') {
      // Cherry Trees + Pink Petals
      const r = rand();
      kind = r < 0.46 ? 'cherry_tree' : 'pink_petals';
    } else if (biome === 'grove') {
      // Snowy Spruce on snow slopes
      const r = rand();
      kind = r < 0.72 ? 'snowy_spruce_tree' : 'fiber_fern';
    } else if (biome === 'snowy_slopes') {
      // Treeless snow & ice slopes (occasional frosted boulders)
      const r = rand();
      kind = r < 0.45 ? 'small_stone' : null;
    } else if (biome === 'jagged_peaks') {
      // Stone, Snow, Emerald Ore, Coal/Metal Ore (no trees)
      const r = rand();
      kind = r < 0.34 ? 'emerald_ore_vein' : r < 0.68 ? 'ore_vein' : 'mountain_rock';
    } else if (biome === 'frozen_peaks') {
      // Packed Ice Spikes & Stone (no trees)
      const r = rand();
      kind = r < 0.65 ? 'ice_spike' : 'mountain_rock';
    } else if (biome === 'stony_peaks') {
      // Stone, Calcite, Emerald Ore, Iron/Metal Ore (no trees)
      const r = rand();
      kind = r < 0.35 ? 'emerald_ore_vein' : r < 0.68 ? 'ore_vein' : 'stone_boulder';
    } else if (biome === 'windswept_hills') {
      // Sparse Spruce & Sparse Oak + Stone cliffs + Emerald Ore
      const r = rand();
      kind =
        r < 0.22
          ? 'spruce_tree'
          : r < 0.38
            ? 'oak_tree'
            : r < 0.62
              ? 'emerald_ore_vein'
              : 'mountain_rock';
    } else if (biome === 'windswept_gravelly_hills') {
      // Sparse Spruce & Sparse Oak + Gravel/Stone + Emerald Ore
      const r = rand();
      kind =
        r < 0.18
          ? 'spruce_tree'
          : r < 0.3
            ? 'oak_tree'
            : r < 0.56
              ? 'emerald_ore_vein'
              : 'stone_boulder';
    } else if (biome === 'windswept_forest') {
      // Dense Oak & Dense Spruce + Stone + Emerald Ore
      const r = rand();
      kind =
        r < 0.42
          ? 'oak_tree'
          : r < 0.78
            ? 'spruce_tree'
            : r < 0.9
              ? 'emerald_ore_vein'
              : 'stone_boulder';
    } else if (biome === 'desert') {
      // Cacti, Dead Bushes, Sugar Cane (near water), Sand mounds (no trees)
      const r = rand();
      kind = r < 0.45 ? 'cactus_plant' : r < 0.78 ? 'dead_bush' : 'sand_mound';
    } else if (biome === 'savanna' || biome === 'savanna_plateau') {
      // Acacia trees + Wild Beans + Tall Grass
      const r = rand();
      kind = r < 0.42 ? 'acacia_tree' : r < 0.62 ? 'bean_patch' : 'grass_tuft';
    } else if (biome === 'windswept_savanna') {
      // Sparse Acacia + Shattered Stone peaks
      const r = rand();
      kind = r < 0.24 ? 'acacia_tree' : r < 0.65 ? 'mountain_rock' : 'grass_tuft';
    } else if (biome === 'badlands') {
      // Cacti, Dead Bushes, Surface Gold Ore (no trees)
      const r = rand();
      kind = r < 0.34 ? 'gold_ore_vein' : r < 0.68 ? 'cactus_plant' : 'dead_bush';
    } else if (biome === 'wooded_badlands') {
      // Oak on elevated plateaus + Cacti, Dead Bushes, Surface Gold Ore
      const r = rand();
      kind =
        h > 11.0 && r < 0.48
          ? 'oak_tree'
          : r < 0.68
            ? 'gold_ore_vein'
            : r < 0.85
              ? 'cactus_plant'
              : 'dead_bush';
    } else if (biome === 'eroded_badlands') {
      // Tall Terracotta spires (hoodoos) + Surface Gold Ore + Dead Bushes
      const r = rand();
      kind = r < 0.56 ? 'terracotta_spire' : r < 0.8 ? 'gold_ore_vein' : 'dead_bush';
    } else if (biome === 'swamp') {
      // Swamp Oak (vine-draped) + Blue Orchids + Mushrooms + Sugar Cane + Clay
      const r = rand();
      kind =
        r < 0.38
          ? 'swamp_oak_tree'
          : r < 0.62
            ? 'blue_orchid_patch'
            : r < 0.78
              ? 'mushroom_cluster'
              : r < 0.9
                ? 'sugarcane_patch'
                : 'clay_deposit';
    } else if (biome === 'mangrove_swamp') {
      // Mangrove Trees (prop roots & propagules) + Moss/Ferns + Clay
      const r = rand();
      kind = r < 0.64 ? 'mangrove_tree' : r < 0.84 ? 'fiber_fern' : 'clay_deposit';
    } else if (biome === 'mushroom_fields') {
      // Huge Red Mushrooms, Huge Brown Mushrooms, Red & Brown Mushroom clusters
      const r = rand();
      kind =
        r < 0.36
          ? 'huge_red_mushroom'
          : r < 0.72
            ? 'huge_brown_mushroom'
            : 'mushroom_cluster';
    } else if (biome === 'snowy_beach') {
      const r = rand();
      kind = r < 0.6 ? 'sand_mound' : 'small_stone';
    } else if (biome === 'stony_shore') {
      const r = rand();
      kind = r < 0.35 ? 'ore_vein' : r < 0.72 ? 'stone_boulder' : 'small_stone';
    } else if (biome === 'frozen_river') {
      kind = rand() < 0.35 ? 'clay_deposit' : null;
    } else if (biome === 'forest') {
      // Oak & Birch trees + Dandelions, Poppies, Lilacs, Rose Bushes, Peonies, Lily of the Valley
      const r = rand();
      kind =
        r < 0.34
          ? 'oak_tree'
          : r < 0.54
            ? 'birch_tree'
            : r < 0.68
              ? 'flower_patch'
              : r < 0.77
                ? 'rose_bush'
                : r < 0.85
                  ? 'lilac_bush'
                  : r < 0.93
                    ? 'peony_bush'
                    : 'berry_bush';
    }

    if (!kind) continue;
    const solidScatterKinds = new Set<ResourceNodeKind>([
      'palm_tree',
      'tropical_tree',
      'oak_tree',
      'dark_oak_tree',
      'huge_red_mushroom',
      'huge_brown_mushroom',
      'banyan_tree',
      'highland_cedar',
      'birch_tree',
      'old_growth_birch_tree',
      'pale_oak_tree',
      'taiga_pine_tree',
      'old_growth_pine_tree',
      'spruce_tree',
      'mega_spruce_tree',
      'snowy_spruce_tree',
      'jungle_tree',
      'mega_jungle_tree',
      'cherry_tree',
      'bee_nest_oak',
      'acacia_tree',
      'swamp_oak_tree',
      'mangrove_tree',
      'cactus_plant',
      'ice_spike',
      'terracotta_spire',
      'stone_boulder',
      'mossy_cobble_boulder',
      'mountain_rock',
      'ore_vein',
      'emerald_ore_vein',
      'gold_ore_vein',
    ]);
    const isSolid = solidScatterKinds.has(kind);
    addResourceNode(`node_${count}`, kind, x, z, 0.88 + rand() * 0.3, isSolid);
    count++;
  }

  // 10. Spatially Chunked (64m x 64m) biome-specific grass carpets, meadow
  // wildflowers & river pebbles. Each species has near/ultra/far geometry that
  // shares one vertex layout, so chunks can hot-swap LOD without reallocating.
  const grassVariantGeometries = new Map<
    GrassVariant,
    { near: THREE.BufferGeometry; ultra: THREE.BufferGeometry; far: THREE.BufferGeometry }
  >();
  for (const variant of GRASS_VARIANTS) {
    const set = createGrassVariantGeometry(variant);
    grassVariantGeometries.set(variant, {
      near: registerGeometry(set.near),
      ultra: registerGeometry(set.ultra),
      far: registerGeometry(set.far),
    });
  }


  // Oxeye Daisy & Buttercup Floret Geometry (crossed slender stem + 6-petal flower crown + pollen disc)
  const buildFloretGeometry = (): THREE.BufferGeometry => {
    const pos: number[] = [];
    const col: number[] = [];
    const pushTri = (
      x1: number,
      y1: number,
      z1: number,
      c1: [number, number, number],
      x2: number,
      y2: number,
      z2: number,
      c2: [number, number, number],
      x3: number,
      y3: number,
      z3: number,
      c3: [number, number, number],
    ) => {
      pos.push(x1, y1, z1, x2, y2, z2, x3, y3, z3);
      col.push(...c1, ...c2, ...c3);
    };
    const stemBase: [number, number, number] = [0.22, 0.42, 0.14];
    const stemTop: [number, number, number] = [0.46, 0.72, 0.22];
    const petalInner: [number, number, number] = [0.95, 0.94, 0.88];
    const petalOuter: [number, number, number] = [1.0, 1.0, 1.0];
    const centerGold: [number, number, number] = [1.0, 0.84, 0.16];
    const h = 0.42;
    // Two crossed slender stem blades
    pushTri(-0.014, 0, 0, stemBase, 0.014, 0, 0, stemBase, 0.008, h, 0.02, stemTop);
    pushTri(0, 0, -0.014, stemBase, 0, 0, 0.014, stemBase, 0.008, h, 0.02, stemTop);
    // 6-petal slightly cupped blossom head at stem tip
    const cx = 0.008;
    const cy = h + 0.005;
    const cz = 0.02;
    for (let p = 0; p < 6; p++) {
      const a0 = (p / 6) * Math.PI * 2;
      const aL = a0 - 0.36;
      const aR = a0 + 0.36;
      const rOuter = 0.072;
      pushTri(
        cx,
        cy,
        cz,
        petalInner,
        cx + Math.cos(aL) * rOuter,
        cy + 0.014,
        cz + Math.sin(aL) * rOuter,
        petalOuter,
        cx + Math.cos(aR) * rOuter,
        cy + 0.014,
        cz + Math.sin(aR) * rOuter,
        petalOuter,
      );
    }
    // Raised golden center disc (3 small triangles)
    for (let p = 0; p < 3; p++) {
      const a0 = (p / 3) * Math.PI * 2;
      const a1 = ((p + 1) / 3) * Math.PI * 2;
      pushTri(
        cx,
        cy + 0.02,
        cz,
        centerGold,
        cx + Math.cos(a0) * 0.022,
        cy + 0.008,
        cz + Math.sin(a0) * 0.022,
        centerGold,
        cx + Math.cos(a1) * 0.022,
        cy + 0.008,
        cz + Math.sin(a1) * 0.022,
        centerGold,
      );
    }
    const geo = registerGeometry(new THREE.BufferGeometry());
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    ensureGeometryHasUv(geo);
    geo.computeVertexNormals();
    return geo;
  };

  // Purple Lupine Wildflower Spike Geometry (slender stem + 3 tiered violet blossom whorls)
  const buildLupineGeometry = (): THREE.BufferGeometry => {
    const pos: number[] = [];
    const col: number[] = [];
    const pushTri = (
      x1: number,
      y1: number,
      z1: number,
      c1: [number, number, number],
      x2: number,
      y2: number,
      z2: number,
      c2: [number, number, number],
      x3: number,
      y3: number,
      z3: number,
      c3: [number, number, number],
    ) => {
      pos.push(x1, y1, z1, x2, y2, z2, x3, y3, z3);
      col.push(...c1, ...c2, ...c3);
    };
    const stemBase: [number, number, number] = [0.18, 0.36, 0.14];
    const stemMid: [number, number, number] = [0.34, 0.56, 0.22];
    pushTri(-0.016, 0, 0, stemBase, 0.016, 0, 0, stemBase, 0, 0.58, 0, stemMid);
    pushTri(0, 0, -0.016, stemBase, 0, 0, 0.016, stemBase, 0, 0.58, 0, stemMid);
    const tiers = [
      { y: 0.32, r: 0.056, h: 0.12, tone: 0.82 },
      { y: 0.42, r: 0.044, h: 0.11, tone: 0.92 },
      { y: 0.51, r: 0.03, h: 0.1, tone: 1.0 },
    ];
    for (let t = 0; t < tiers.length; t++) {
      const tier = tiers[t];
      const baseC: [number, number, number] = [0.85 * tier.tone, 0.72 * tier.tone, 1.0 * tier.tone];
      const tipC: [number, number, number] = [0.96, 0.88, 1.0];
      for (let s = 0; s < 4; s++) {
        const a0 = (s / 4) * Math.PI * 2 + t * 0.45;
        const a1 = a0 + Math.PI * 0.5;
        pushTri(
          Math.cos(a0) * tier.r,
          tier.y,
          Math.sin(a0) * tier.r,
          baseC,
          Math.cos(a1) * tier.r,
          tier.y,
          Math.sin(a1) * tier.r,
          baseC,
          0,
          tier.y + tier.h,
          0,
          tipC,
        );
      }
    }
    const geo = registerGeometry(new THREE.BufferGeometry());
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    ensureGeometryHasUv(geo);
    geo.computeVertexNormals();
    return geo;
  };

  const floretGeo = buildFloretGeometry();
  const lupineGeo = buildLupineGeometry();

  const ambientGrassMat = registerMaterial(
    enhanceSurfaceMaterial(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.88,
        metalness: 0,
        envMapIntensity: 0.7,
        side: THREE.DoubleSide,
        vertexColors: true,
      }),
      'grass',
      0.072,
    ),
  );
  const floretMat = registerMaterial(
    enhanceSurfaceMaterial(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.65,
        side: THREE.DoubleSide,
        vertexColors: true,
      }),
      'foliage',
      0.048,
    ),
  );
  const lupineMat = registerMaterial(
    enhanceSurfaceMaterial(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.66,
        side: THREE.DoubleSide,
        vertexColors: true,
      }),
      'foliage',
      0.048,
    ),
  );

  const CHUNK_SIZE = 64;
  interface ChunkBucket {
    cx: number;
    cz: number;
    matrices: THREE.Matrix4[];
    colors: THREE.Color[] | null;
  }
  // One bucket per biome-appropriate grass species so each chunk batch draws a
  // single shared clump buffer with its own silhouette and tint.
  const grassBuckets = new Map<GrassVariant, Map<string, ChunkBucket>>(
    GRASS_VARIANTS.map((variant) => [variant, new Map<string, ChunkBucket>()]),
  );
  const pushGrass = (
    variant: GrassVariant,
    wx: number,
    wz: number,
    mat: THREE.Matrix4,
    col: THREE.Color,
  ) => {
    const bucket = grassBuckets.get(variant);
    if (bucket) pushToChunk(bucket, wx, wz, mat, col);
  };
  const floretBuckets = new Map<string, ChunkBucket>();
  const lupineBuckets = new Map<string, ChunkBucket>();
  const pebbleBuckets = new Map<string, ChunkBucket>();
  const meadowBoulderBuckets = new Map<string, ChunkBucket>();
  const shoreBoulderBuckets = new Map<string, ChunkBucket>();
  const driftwoodBuckets = new Map<string, ChunkBucket>();
  const hibiscusLeafBuckets = new Map<string, ChunkBucket>();
  const hibiscusFlowerBuckets = new Map<string, ChunkBucket>();
  const pushToChunk = (
    map: Map<string, ChunkBucket>,
    wx: number,
    wz: number,
    mat: THREE.Matrix4,
    col?: THREE.Color,
  ) => {
    const ix = Math.floor(wx / CHUNK_SIZE);
    const iz = Math.floor(wz / CHUNK_SIZE);
    const key = `${ix}_${iz}`;
    let bucket = map.get(key);
    if (!bucket) {
      bucket = {
        cx: (ix + 0.5) * CHUNK_SIZE,
        cz: (iz + 0.5) * CHUNK_SIZE,
        matrices: [],
        colors: col ? [] : null,
      };
      map.set(key, bucket);
    }
    bucket.matrices.push(mat.clone());
    if (col) {
      if (!bucket.colors) bucket.colors = [];
      bucket.colors.push(col.clone());
    }
  };

  const grassTarget = 52000;
  const floretTarget = 6500;
  const lupineTarget = 1800;
  const pebbleCount = 180;
  const pebbleGeo = registerGeometry(new THREE.DodecahedronGeometry(0.14, 0));

  const dummy = new THREE.Object3D();
  const tintColor = new THREE.Color();
  let gPlaced = 0;
  let flPlaced = 0;
  let luPlaced = 0;
  let pPlaced = 0;

  const isClearOfStructures = (px: number, pz: number): boolean => {
    if (Math.hypot(px - SNOWY_WOODLAND_POS.x, pz - SNOWY_WOODLAND_POS.z) < 14) return false;
    if (Math.hypot(px - AUTUMN_GROVE_POS.x, pz - AUTUMN_GROVE_POS.z) < 11) return false;
    if (Math.hypot(px - SWAMP_POS.x, pz - SWAMP_POS.z) < SWAMP_POS.radius + 2.5) return false;
    if (Math.hypot(px - TRIAL_CHAMBERS_POS.x, pz - TRIAL_CHAMBERS_POS.z) < 5.5) return false;
    if (Math.hypot(px - WOODLAND_MANSION_POS.x, pz - WOODLAND_MANSION_POS.z) < 9.5) return false;
    if (Math.hypot(px - TAIGA_VILLAGE_POS.x, pz - TAIGA_VILLAGE_POS.z) < 8.5) return false;
    if (Math.hypot(px - PILLAGER_OUTPOST_POS.x, pz - PILLAGER_OUTPOST_POS.z) < 5.5) return false;
    if (Math.hypot(px - TRAIL_RUINS_POS.x, pz - TRAIL_RUINS_POS.z) < 5.5) return false;
    if (Math.hypot(px - SNOWY_VILLAGE_POS.x, pz - SNOWY_VILLAGE_POS.z) < 8.5) return false;
    if (Math.hypot(px - SNOWY_IGLOO_POS.x, pz - SNOWY_IGLOO_POS.z) < 5.5) return false;
    if (Math.hypot(px - JUNGLE_TEMPLE_POS.x, pz - JUNGLE_TEMPLE_POS.z) < 7.5) return false;
    if (Math.hypot(px - WHEATFIELD_POS.x, pz - WHEATFIELD_POS.z) < 9.0) return false;
    if (Math.hypot(px - FARMER_POS.x, pz - FARMER_POS.z) < 8.5) return false;
    if (Math.hypot(px - HILL_HOUSE_POS.x, pz - HILL_HOUSE_POS.z) < 16.5) return false;
    if (
      px >= HILL_HOUSE_POS.x + 3 &&
      px <= HILL_HOUSE_POS.x + 23 &&
      Math.abs(pz - HILL_HOUSE_POS.z) < 5.5
    ) {
      return false;
    }
    if (Math.hypot(px - VEHICLE_GARAGE_POS.x, pz - VEHICLE_GARAGE_POS.z) < 19.5) return false;
    if (
      px >= VEHICLE_GARAGE_POS.x - 18 &&
      px <= VEHICLE_GARAGE_POS.x + 28 &&
      pz >= VEHICLE_GARAGE_POS.z - 6 &&
      pz <= VEHICLE_GARAGE_POS.z + 24
    ) {
      return false;
    }
    return true;
  };

  // Biome -> grass species. Beaches grow leaning dune grass, savannas tall dry
  // bunch grass, highlands short alpine turf, and the rest lush meadow turf.
  const grassVariantForBiome = (biome: string, coastal: boolean): GrassVariant => {
    if (coastal || biome === 'beach') return 'dune';
    if (biome === 'savanna' || biome === 'savanna_plateau' || biome === 'windswept_savanna') {
      return 'tall';
    }
    if (
      biome === 'taiga' ||
      biome === 'old_growth_pine_taiga' ||
      biome === 'old_growth_spruce_taiga' ||
      biome === 'snowy_taiga' ||
      biome === 'grove' ||
      biome === 'snowy_plains' ||
      biome === 'mountain' ||
      biome === 'windswept_hills' ||
      biome === 'windswept_gravelly_hills'
    ) {
      return 'alpine';
    }
    return 'lush';
  };

  const grassTintForBiome = (biome: string, variant: GrassVariant, coastal: boolean): number => {
    if (variant === 'dune') return coastal ? 0x9d9a70 : 0xa8a37c;
    if (variant === 'tall') return biome === 'windswept_savanna' ? 0xa9a06c : 0xbaa972;
    if (variant === 'alpine') {
      if (biome === 'snowy_plains' || biome === 'grove') return 0xaab7ae;
      if (biome === 'snowy_taiga') return 0x8fa38f;
      if (biome === 'mountain') return 0x778a6e;
      return 0x6f8468;
    }
    if (biome === 'grassland' || biome === 'meadow' || biome === 'sparse_jungle') return 0x9aa862;
    if (biome === 'cherry_grove') return 0x86a86a;
    if (biome === 'dark_forest') return 0x7a7350;
    if (biome === 'pale_garden') return 0xa8b0a4;
    if (biome === 'jungle' || biome === 'bamboo_jungle' || biome === 'swamp' || biome === 'mangrove_swamp') {
      return 0x5b8452;
    }
    if (biome === 'flower_forest' || biome === 'birch_forest' || biome === 'old_growth_birch_forest') {
      return 0x8fae6b;
    }
    return 0x7d9a5a;
  };

  // Sample meadow & forest patches with lush natural clustering (fast CPU gen + seamless grass carpet)
  for (let i = 0; i < 32000 && gPlaced < grassTarget; i++) {
    const a = rand() * Math.PI * 2;
    const rad =
      i < 9500
        ? 8 + Math.sqrt(rand()) * 275
        : 16 + Math.sqrt(rand()) * 715;
    const ax = Math.cos(a) * rad;
    const az = Math.sin(a) * rad;
    const ay = getTerrainHeight(ax, az);
    const biome = getBiomeAt(ax, az);
    if (ay < 0.4) continue;
    if (!isClearOfStructures(ax, az)) continue;

    if (pPlaced < pebbleCount && (biome === 'river' || (biome === 'beach' && ay < 1.35))) {
      dummy.position.set(ax, ay + 0.02, az);
      dummy.rotation.set(rand() * 2, rand() * 3, rand() * 2);
      const sc = 0.55 + rand() * 0.9;
      dummy.scale.set(sc * 1.25, sc * 0.52, sc);
      dummy.updateMatrix();
      pushToChunk(pebbleBuckets, ax, az, dummy.matrix);
      pPlaced++;
      continue;
    }

    const isCoastalGrassEdge = biome === 'beach' && ay >= 1.15 && ay <= 3.6;
    const isMeadowLike =
      biome === 'grassland' ||
      biome === 'meadow' ||
      biome === 'sparse_jungle' ||
      biome === 'flower_forest' ||
      biome === 'birch_forest' ||
      biome === 'old_growth_birch_forest' ||
      biome === 'forest';
    const isVegetatedBiome =
      isMeadowLike ||
      biome === 'dark_forest' ||
      biome === 'cherry_grove' ||
      biome === 'pale_garden' ||
      biome === 'taiga' ||
      biome === 'old_growth_pine_taiga' ||
      biome === 'old_growth_spruce_taiga' ||
      biome === 'snowy_taiga' ||
      biome === 'jungle' ||
      biome === 'bamboo_jungle' ||
      biome === 'savanna' ||
      biome === 'savanna_plateau' ||
      biome === 'windswept_savanna' ||
      biome === 'swamp' ||
      biome === 'mangrove_swamp' ||
      biome === 'windswept_hills' ||
      biome === 'windswept_forest' ||
      biome === 'grove' ||
      biome === 'mountain' ||
      isCoastalGrassEdge;
    if (!isVegetatedBiome) continue;
    // Rocky highlands and snowfields carry only sparse alpine turf.
    if ((biome === 'mountain' || biome === 'grove') && rand() > 0.5) continue;

    const baseVariant = grassVariantForBiome(biome, isCoastalGrassEdge);
    // Feather species borders: near a neighbouring biome, a share of clumps take
    // on the neighbour's grass so the transition is interlocking, not a hard seam.
    const neighborVariantA = grassVariantForBiome(getBiomeAt(ax + 3.5, az), false);
    const neighborVariantB = grassVariantForBiome(getBiomeAt(ax, az - 3.5), false);
    const borderVariants: GrassVariant[] = [];
    if (neighborVariantA !== baseVariant) borderVariants.push(neighborVariantA);
    if (neighborVariantB !== baseVariant && neighborVariantB !== neighborVariantA) {
      borderVariants.push(neighborVariantB);
    }

    const clumpCount = isMeadowLike ? 4 : baseVariant === 'dune' ? 2 : 3;
    for (let c = 0; c < clumpCount && gPlaced < grassTarget; c++) {
      const ca = rand() * Math.PI * 2;
      const cr = c === 0 ? 0 : (baseVariant === 'tall' ? 0.52 : 0.38) + rand() * 1.5;
      const px = ax + Math.cos(ca) * cr;
      const pz = az + Math.sin(ca) * cr;
      const py = c === 0 ? ay : getTerrainHeight(px, pz);
      if (py < 0.4) continue;
      const variant =
        borderVariants.length > 0 && rand() < 0.22
          ? borderVariants[Math.floor(rand() * borderVariants.length)]
          : baseVariant;
      dummy.position.set(px, py - 0.03, pz);
      dummy.rotation.set((rand() - 0.5) * 0.24, rand() * Math.PI * 2, (rand() - 0.5) * 0.24);
      const sc = 0.85 + rand() * 0.92;
      const widthScale = variant === 'alpine' ? 1.3 : variant === 'dune' ? 1.2 : 1.15;
      const heightScale =
        variant === 'tall'
          ? 1.0 + rand() * 0.5
          : variant === 'alpine'
            ? 0.8 + rand() * 0.3
            : variant === 'dune'
              ? 0.9 + rand() * 0.42
              : 0.85 + rand() * 0.6;
      dummy.scale.set(sc * widthScale, sc * heightScale, sc * widthScale);
      dummy.updateMatrix();
      // Local dryness noise so neighbouring clumps vary in hue instead of
      // repeating one flat carpet colour.
      const dryness = Math.sin(px * 0.21 + pz * 0.13) * 0.5 + 0.5;
      tintColor
        .setHex(grassTintForBiome(biome, variant, isCoastalGrassEdge))
        .offsetHSL(
          (rand() - 0.5) * 0.035,
          0.02 + dryness * 0.05,
          (rand() - 0.5) * 0.1 + (variant === 'dune' ? 0.045 : 0),
        );
      pushGrass(variant, px, pz, dummy.matrix, tintColor);
      gPlaced++;
    }

    // Wildflower clusters in open meadows, plains, flower_forest, birch_forest & sparse_jungle
    if (isMeadowLike && flPlaced < floretTarget && rand() < 0.24) {
      const flowerPatch = 1 + Math.floor(rand() * 3);
      const isButtercup = rand() < 0.32;
      for (let f = 0; f < flowerPatch && flPlaced < floretTarget; f++) {
        const fa = rand() * Math.PI * 2;
        const fr = 0.2 + rand() * 1.65;
        const fx = ax + Math.cos(fa) * fr;
        const fz = az + Math.sin(fa) * fr;
        const fy = getTerrainHeight(fx, fz);
        if (fy < 0.65) continue;
        dummy.position.set(fx, fy - 0.015, fz);
        dummy.rotation.set((rand() - 0.5) * 0.22, rand() * Math.PI * 2, (rand() - 0.5) * 0.22);
        const fsc = 0.85 + rand() * 0.55;
        dummy.scale.set(fsc, fsc * (0.85 + rand() * 0.4), fsc);
        dummy.updateMatrix();
        tintColor
          .setHex(isButtercup ? 0xfacc15 : 0xfefcf5)
          .offsetHSL((rand() - 0.5) * 0.015, 0, (rand() - 0.5) * 0.04);
        pushToChunk(floretBuckets, fx, fz, dummy.matrix, tintColor);
        flPlaced++;
      }
    }

    // Purple Lupine Wildflower Clusters
    if (isMeadowLike && luPlaced < lupineTarget && rand() < 0.065) {
      const lupinePatch = 2 + Math.floor(rand() * 3);
      for (let l = 0; l < lupinePatch && luPlaced < lupineTarget; l++) {
        const la = rand() * Math.PI * 2;
        const lr = 0.15 + rand() * 1.25;
        const lx = ax + Math.cos(la) * lr;
        const lz = az + Math.sin(la) * lr;
        const ly = getTerrainHeight(lx, lz);
        if (ly < 0.75) continue;
        dummy.position.set(lx, ly - 0.02, lz);
        dummy.rotation.set((rand() - 0.5) * 0.18, rand() * Math.PI * 2, (rand() - 0.5) * 0.18);
        const lsc = 0.9 + rand() * 0.45;
        dummy.scale.set(lsc, lsc * (0.9 + rand() * 0.35), lsc);
        dummy.updateMatrix();
        tintColor
          .setHex(l % 2 === 0 ? 0x8b6fd9 : 0x7654cc)
          .offsetHSL((rand() - 0.5) * 0.025, 0.04, (rand() - 0.5) * 0.08);
        pushToChunk(lupineBuckets, lx, lz, dummy.matrix, tintColor);
        luPlaced++;
      }
    }
  }

  interface ChunkedInstancedEntry {
    mesh: THREE.InstancedMesh;
    cx: number;
    cz: number;
  }
  const foliageChunkEntries: ChunkedInstancedEntry[] = [];
  const grassChunkEntries: ChunkedInstancedEntry[] = [];
  const chunkedDecorEntries: ChunkedInstancedEntry[] = [];

  // Distance-based grass LOD. Chunk centres inside 62m use the full (or ultra)
  // clump, the middle ring up to 102m uses the standard clump, and the outermost
  // visible ring swaps to a reduced blade count. Nearby turf keeps full detail.
  const grassLodEntries: {
    mesh: THREE.InstancedMesh;
    cx: number;
    cz: number;
    variant: GrassVariant;
  }[] = [];
  let grassUltraActive = false;
  let lastGrassLodX = Number.NaN;
  let lastGrassLodZ = Number.NaN;
  const applyGrassLod = (px: number, pz: number, force = false): void => {
    // Refresh as the player moves, not only on chunk crossings, so a clump can
    // never stay on distant LOD while the player walks up to it.
    const lodDx = px - lastGrassLodX;
    const lodDz = pz - lastGrassLodZ;
    if (!force && lodDx * lodDx + lodDz * lodDz < 8 * 8) return;
    lastGrassLodX = px;
    lastGrassLodZ = pz;
    for (let i = 0; i < grassLodEntries.length; i++) {
      const entry = grassLodEntries[i];
      const dx = entry.cx - px;
      const dz = entry.cz - pz;
      const dSq = dx * dx + dz * dz;
      const lod = dSq < 62 * 62 ? (grassUltraActive ? 'ultra' : 'near') : dSq < 102 * 102 ? 'near' : 'far';
      const geoSet = grassVariantGeometries.get(entry.variant);
      if (!geoSet) continue;
      const key = `${entry.variant}:${lod}`;
      if (entry.mesh.userData.grassLodKey !== key) {
        entry.mesh.geometry = geoSet[lod];
        entry.mesh.userData.grassLodKey = key;
      }
    }
  };
  const finalizeChunkedInstanced = (
    targetList: ChunkedInstancedEntry[],
    buckets: Map<string, ChunkBucket>,
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    receiveShadow: boolean,
  ) => {
    for (const bucket of buckets.values()) {
      const count = bucket.matrices.length;
      if (count === 0) continue;
      const im = new THREE.InstancedMesh(geo, mat, count);
      im.castShadow = false;
      im.receiveShadow = receiveShadow;
      im.userData.noShadowCast = true;
      im.userData.preserveShadowFlags = true;
      for (let k = 0; k < count; k++) {
        im.setMatrixAt(k, bucket.matrices[k]);
        if (bucket.colors && bucket.colors[k]) {
          im.setColorAt(k, bucket.colors[k]);
        }
      }
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
      im.computeBoundingSphere();
      im.updateMatrix();
      im.matrixAutoUpdate = false;
      targetList.push({ mesh: im, cx: bucket.cx, cz: bucket.cz });
    }
  };
  for (const variant of GRASS_VARIANTS) {
    const buckets = grassBuckets.get(variant);
    const geoSet = grassVariantGeometries.get(variant);
    if (!buckets || !geoSet) continue;
    const start = grassChunkEntries.length;
    finalizeChunkedInstanced(grassChunkEntries, buckets, geoSet.near, ambientGrassMat, true);
    for (let i = start; i < grassChunkEntries.length; i++) {
      const entry = grassChunkEntries[i];
      entry.mesh.userData.grassLodKey = `${variant}:near`;
      grassLodEntries.push({ mesh: entry.mesh, cx: entry.cx, cz: entry.cz, variant });
    }
  }
  foliageChunkEntries.push(...grassChunkEntries);
  finalizeChunkedInstanced(foliageChunkEntries, floretBuckets, floretGeo, floretMat, true);
  finalizeChunkedInstanced(foliageChunkEntries, lupineBuckets, lupineGeo, lupineMat, true);
  finalizeChunkedInstanced(foliageChunkEntries, pebbleBuckets, pebbleGeo, smallStoneMat, true);

  // Embedded Mossy Hillside Limestone Boulders (64m chunked InstancedMeshes)
  const meadowBoulderMat = registerMaterial(
    enhanceSurfaceMaterial(
      applySafeStandardMaps(
        new THREE.MeshStandardMaterial({
          color: 0x6b675e,
          roughness: 0.9,
        }),
        {
          map: rockTex,
          normalMap: rockNormalTex,
          roughnessMap: rockRoughnessTex,
        },
      ),
      'rock',
    ),
  );
  meadowBoulderMat.normalScale.set(1.2, 1.2);
  const meadowBoulderCount = 260;
  let mbPlaced = 0;
  for (let i = 0; i < 6500 && mbPlaced < meadowBoulderCount; i++) {
    const a = rand() * Math.PI * 2;
    const rad = i < 2400 ? 12 + Math.sqrt(rand()) * 265 : 18 + Math.sqrt(rand()) * 695;
    const bx = Math.cos(a) * rad;
    const bz = Math.sin(a) * rad;
    const by = getTerrainHeight(bx, bz);
    if (by < 2.2) continue;
    const biome = getBiomeAt(bx, bz);
    if (
      biome !== 'sparse_jungle' &&
      biome !== 'grassland' &&
      biome !== 'meadow' &&
      biome !== 'windswept_hills' &&
      biome !== 'forest' &&
      biome !== 'birch_forest' &&
      biome !== 'flower_forest'
    ) {
      continue;
    }
    if (!isClearOfStructures(bx, bz)) continue;
    const bs = 0.72 + rand() * 1.15;
    dummy.position.set(bx, by - 0.16 * bs, bz);
    dummy.rotation.set((rand() - 0.5) * 0.45, rand() * Math.PI * 2, (rand() - 0.5) * 0.45);
    dummy.scale.set(bs * (1.2 + rand() * 0.55), bs * (0.36 + rand() * 0.22), bs * (1.05 + rand() * 0.45));
    dummy.updateMatrix();
    pushToChunk(meadowBoulderBuckets, bx, bz, dummy.matrix);
    mbPlaced++;
  }
  finalizeChunkedInstanced(chunkedDecorEntries, meadowBoulderBuckets, gDodec1, meadowBoulderMat, true);

  // 10b. Chunked Volcanic Shoreline Boulders, Driftwood & Crimson Tropical Hibiscus Bushes
  const volcanicShoreBoulderMat = registerMaterial(
    enhanceSurfaceMaterial(
      applySafeStandardMaps(
        new THREE.MeshStandardMaterial({
          color: 0x3f3c38,
          roughness: 0.92,
        }),
        {
          map: rockTex,
          normalMap: rockNormalTex,
          roughnessMap: rockRoughnessTex,
        },
      ),
      'rock',
    ),
  );
  volcanicShoreBoulderMat.normalScale.set(1.25, 1.25);
  const shoreBoulderCount = 220;

  const hibiscusLeafMat = registerMaterial(
    enhanceSurfaceMaterial(
      applySafeStandardMaps(
        new THREE.MeshStandardMaterial({
          color: 0x266d2e,
          roughness: 0.72,
        }),
        {
          map: leafTex,
          normalMap: leafNormalTex,
        },
      ),
      'foliage',
      0.06,
    ),
  );
  hibiscusLeafMat.normalScale.set(0.85, 0.85);
  const hibiscusFlowerMat = registerMaterial(
    enhanceSurfaceMaterial(
      new THREE.MeshStandardMaterial({
        color: 0xdc2626,
        emissive: 0x7f1d1d,
        emissiveIntensity: 0.14,
        roughness: 0.55,
      }),
      'foliage',
      0.04,
    ),
  );
  const hibiscusBushCount = 150;

  // Sun-bleached coastal driftwood logs along the wet shoreline tide line
  const driftwoodMat = registerMaterial(
    enhanceSurfaceMaterial(
      applySafeStandardMaps(
        new THREE.MeshStandardMaterial({
          color: 0x7c654f,
          roughness: 0.90,
        }),
        {
          map: barkTex,
          normalMap: barkNormalTex,
        },
      ),
      'wood',
    ),
  );
  const driftwoodCount = 85;

  let sbPlaced = 0;
  let hbPlaced = 0;
  let dwPlaced = 0;
  for (let i = 0; i < 9500 && (sbPlaced < shoreBoulderCount || hbPlaced < hibiscusBushCount || dwPlaced < driftwoodCount); i++) {
    let bx: number;
    let bz: number;
    // Focus ~30% of samples around the southern cove shoreline near PLAYER_SPAWN, 70% around full island beach ring
    if (i < 1600) {
      bx = PLAYER_SPAWN.x + (rand() - 0.5) * 260;
      bz = PLAYER_SPAWN.z - 55 + rand() * 135;
    } else {
      const a = rand() * Math.PI * 2;
      const rad = 240 + rand() * 560;
      bx = Math.cos(a) * rad;
      bz = Math.sin(a) * rad;
    }
    const by = getTerrainHeight(bx, bz);
    const bBiome = getBiomeAt(bx, bz);
    if (Math.hypot(bx - PLAYER_SPAWN.x, bz - PLAYER_SPAWN.z) < 5.5) continue;
    if (Math.hypot(bx - HILL_HOUSE_POS.x, bz - HILL_HOUSE_POS.z) < 16.5) continue;
    if (Math.hypot(bx - VEHICLE_GARAGE_POS.x, bz - VEHICLE_GARAGE_POS.z) < 18.5) continue;

    if (sbPlaced < shoreBoulderCount && bBiome === 'beach' && by >= -0.35 && by <= 1.55) {
      dummy.position.set(bx, by - 0.14, bz);
      dummy.rotation.set(rand() * 0.4, rand() * Math.PI * 2, rand() * 0.4);
      const s = 0.65 + rand() * 1.05;
      dummy.scale.set(s * (1.25 + rand() * 0.45), s * (0.48 + rand() * 0.25), s * (1.1 + rand() * 0.4));
      dummy.updateMatrix();
      pushToChunk(shoreBoulderBuckets, bx, bz, dummy.matrix);
      sbPlaced++;
    } else if (dwPlaced < driftwoodCount && bBiome === 'beach' && by >= 0.08 && by <= 1.25 && rand() < 0.48) {
      dummy.position.set(bx, by + 0.04, bz);
      dummy.rotation.set(Math.PI / 2 + (rand() - 0.5) * 0.18, rand() * Math.PI * 2, (rand() - 0.5) * 0.15);
      const dLen = 1.6 + rand() * 2.2;
      const dRad = 0.11 + rand() * 0.09;
      dummy.scale.set(dRad, dLen, dRad * 0.85);
      dummy.updateMatrix();
      pushToChunk(driftwoodBuckets, bx, bz, dummy.matrix);
      dwPlaced++;
    } else if (
      hbPlaced < hibiscusBushCount &&
      (bBiome === 'beach' || bBiome === 'jungle' || bBiome === 'sparse_jungle' || bBiome === 'flower_forest') &&
      by >= 0.95 &&
      by <= 5.4
    ) {
      const bScale = 0.72 + rand() * 0.58;
      dummy.position.set(bx, by + 0.34 * bScale, bz);
      dummy.rotation.set((rand() - 0.5) * 0.2, rand() * Math.PI * 2, (rand() - 0.5) * 0.2);
      dummy.scale.set(bScale * 1.18, bScale * 0.78, bScale * 1.12);
      dummy.updateMatrix();
      tintColor.setHex(0x287830).offsetHSL((rand() - 0.5) * 0.03, 0.05, (rand() - 0.5) * 0.06);
      pushToChunk(hibiscusLeafBuckets, bx, bz, dummy.matrix, tintColor);

      for (let f = 0; f < 3; f++) {
        const fa = (f / 3) * Math.PI * 2 + rand() * 0.8;
        const fr = (0.42 + rand() * 0.32) * bScale;
        const fx = bx + Math.cos(fa) * fr;
        const fz = bz + Math.sin(fa) * fr;
        dummy.position.set(
          fx,
          by + (0.58 + rand() * 0.22) * bScale,
          fz,
        );
        dummy.rotation.set(rand(), rand(), rand());
        const fs = (0.11 + rand() * 0.05) * bScale;
        dummy.scale.set(fs * 1.25, fs * 0.72, fs * 1.25);
        dummy.updateMatrix();
        tintColor.setHex(f === 2 ? 0xf43f5e : 0xdc2626).offsetHSL((rand() - 0.5) * 0.02, 0, (rand() - 0.5) * 0.06);
        pushToChunk(hibiscusFlowerBuckets, fx, fz, dummy.matrix, tintColor);
      }
      hbPlaced++;
    }
  }
  finalizeChunkedInstanced(chunkedDecorEntries, shoreBoulderBuckets, gDodec1, volcanicShoreBoulderMat, true);
  finalizeChunkedInstanced(foliageChunkEntries, driftwoodBuckets, gCylTaper8, driftwoodMat, true);
  finalizeChunkedInstanced(foliageChunkEntries, hibiscusLeafBuckets, gSphere7, hibiscusLeafMat, true);
  finalizeChunkedInstanced(foliageChunkEntries, hibiscusFlowerBuckets, gDodec0, hibiscusFlowerMat, false);

  // Soaring coastal gulls gliding overhead in 1 GPU-animated InstancedMesh (0 CPU loop overhead)
  const seabirdGeo = registerGeometry(new THREE.BufferGeometry());
  const birdPositions = new Float32Array([
    // Left wing triangle
    0.0, 0.0, 0.24,
    -1.05, 0.14, -0.18,
    0.0, 0.04, -0.28,
    // Right wing triangle
    0.0, 0.0, 0.24,
    0.0, 0.04, -0.28,
    1.05, 0.14, -0.18,
  ]);
  const birdNormals = new Float32Array([
    0, 1, 0, 0, 1, 0, 0, 1, 0,
    0, 1, 0, 0, 1, 0, 0, 1, 0,
  ]);
  seabirdGeo.setAttribute('position', new THREE.BufferAttribute(birdPositions, 3));
  seabirdGeo.setAttribute('normal', new THREE.BufferAttribute(birdNormals, 3));
  ensureGeometryHasUv(seabirdGeo);
  const seabirdMat = registerMaterial(
    new THREE.MeshStandardMaterial({
      color: 0x1e2430,
      roughness: 0.72,
      side: THREE.DoubleSide,
    }),
  );
  seabirdMat.customProgramCacheKey = () => 'si_seabird_flight_v2';
  seabirdMat.onBeforeCompile = (shader) => {
    shader.uniforms.uBirdTime = waterfallShaderMat.uniforms.uTime;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
uniform float uBirdTime;
`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
float bInstId = float(gl_InstanceID);
float flap = sin(uBirdTime * 4.6 + bInstId * 1.9) * abs(transformed.x) * 0.36;
transformed.y += flap;
`,
      )
      .replace(
        '#include <project_vertex>',
        `vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_INSTANCING
  mvPosition = instanceMatrix * mvPosition;
#endif
float glideAngle = uBirdTime * 0.16 + float(gl_InstanceID) * 0.9;
mvPosition.x += cos(glideAngle) * 14.0;
mvPosition.z += sin(glideAngle) * 14.0;
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,
      );
  };
  const seabirdCount = 14;
  const seabirdInstanced = new THREE.InstancedMesh(seabirdGeo, seabirdMat, seabirdCount);
  seabirdInstanced.castShadow = false;
  seabirdInstanced.receiveShadow = false;
  seabirdInstanced.frustumCulled = false;
  seabirdInstanced.userData.noShadowCast = true;
  for (let b = 0; b < seabirdCount; b++) {
    const ba = (b / seabirdCount) * Math.PI * 2;
    const isNearSpawn = b < 6;
    const bx = isNearSpawn
      ? PLAYER_SPAWN.x + (b - 2.5) * 26 + (rand() - 0.5) * 18
      : WATERFALL_POS.x + Math.cos(ba) * (28 + rand() * 44);
    const bz = isNearSpawn
      ? PLAYER_SPAWN.z - 55 - rand() * 75
      : WATERFALL_POS.z + Math.sin(ba) * (28 + rand() * 44);
    const by = 24 + rand() * 20;
    dummy.position.set(bx, by, bz);
    dummy.rotation.set(0, rand() * Math.PI * 2, 0);
    const bs = 1.05 + rand() * 0.55;
    dummy.scale.setScalar(bs);
    dummy.updateMatrix();
    seabirdInstanced.setMatrixAt(b, dummy.matrix);
  }
  seabirdInstanced.instanceMatrix.needsUpdate = true;
  seabirdInstanced.updateMatrix();
  seabirdInstanced.matrixAutoUpdate = false;
  overworldGroup.add(seabirdInstanced);

  // Finalize all batched InstancedMeshes with bounding spheres for accurate frustum culling
  for (const [key, entry] of batchRegistry.entries()) {
    if (entry.matrices.length === 0) continue;
    const im = new THREE.InstancedMesh(entry.geo, entry.mat, entry.matrices.length);
    im.castShadow = entry.castShadow;
    im.receiveShadow = entry.receiveShadow;
    if (!entry.castShadow) {
      im.userData.noShadowCast = true;
    }
    for (let i = 0; i < entry.matrices.length; i++) {
      im.setMatrixAt(i, entry.matrices[i]);
      if (entry.colors && entry.colors[i]) {
        im.setColorAt(i, entry.colors[i]);
      }
    }
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.computeBoundingSphere();
    if (entry.foliageScatter && entry.cx !== undefined && entry.cz !== undefined) {
      im.updateMatrix();
      im.matrixAutoUpdate = false;
      foliageBatchMeshes.push({ mesh: im, cx: entry.cx, cz: entry.cz });
    } else {
      overworldGroup.add(im);
    }
    builtBatchMeshes.set(key, im);
    if (entry.castShadow) {
      shadowCasters.push(im);
    }
  }

  for (const [nodeId, pending] of pendingNodeSlots.entries()) {
    const resolved: BatchSlotRef[] = [];
    for (const p of pending) {
      const im = builtBatchMeshes.get(p.key);
      if (im) {
        resolved.push({ mesh: im, index: p.index, matrix: p.matrix });
      }
    }
    if (resolved.length > 0) {
      nodeBatchSlots.set(nodeId, resolved);
    }
  }
  pendingNodeSlots.clear();
  batchRegistry.clear();

  // Safely merge static non-animated landmark geometries by matching material, shadow flags, and attribute layout
  const mergeStaticGroupMeshes = (
    root: THREE.Object3D,
    protectedObjs?: THREE.Object3D[],
  ): void => {
    const protectedSet = protectedObjs ? new Set(protectedObjs) : null;
    root.updateMatrixWorld(true);
    const invRoot = root.matrixWorld.clone().invert();
    const localMat = new THREE.Matrix4();

    interface MergeBucket {
      mat: THREE.Material;
      castShadow: boolean;
      receiveShadow: boolean;
      isHouseWall: boolean;
      preserveEnvMapIntensity: boolean;
      meshes: THREE.Mesh[];
      geos: THREE.BufferGeometry[];
    }
    const buckets = new Map<string, MergeBucket>();

    root.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      if (obj instanceof THREE.InstancedMesh) return;
      if ((obj as THREE.SkinnedMesh).isSkinnedMesh) return;
      if (!obj.visible || !obj.geometry || !obj.material) return;
      if (Array.isArray(obj.material)) return;
      if (obj.userData?.noStaticMerge) return;
      if (protectedSet && protectedSet.has(obj)) return;

      localMat.multiplyMatrices(invRoot, obj.matrixWorld);
      // Skip mirrored transforms with negative determinant so triangle winding never flips
      if (localMat.determinant() <= 0) return;

      const geo = obj.geometry;
      const attrNames = Object.keys(geo.attributes).sort();
      const attrSig = attrNames
        .map((n) => `${n}:${geo.attributes[n].itemSize}`)
        .join(',');
      const castShadow = Boolean(obj.castShadow && !obj.userData?.noShadowCast);
      const receiveShadow = Boolean(obj.receiveShadow);
      const isHouseWall = Boolean(obj.userData?.isHouseWall);
      const preserveEnvMapIntensity = Boolean(obj.userData?.preserveEnvMapIntensity);
      const hasIndex = geo.index !== null ? 1 : 0;

      const key = `${obj.material.uuid}|${castShadow ? 1 : 0}|${receiveShadow ? 1 : 0}|${isHouseWall ? 1 : 0}|${preserveEnvMapIntensity ? 1 : 0}|${hasIndex}|${geo.morphTargetsRelative ? 1 : 0}|${attrSig}`;
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = {
          mat: obj.material,
          castShadow,
          receiveShadow,
          isHouseWall,
          preserveEnvMapIntensity,
          meshes: [],
          geos: [],
        };
        buckets.set(key, bucket);
      }

      const cloned = geo.clone();
      cloned.applyMatrix4(localMat);
      bucket.meshes.push(obj);
      bucket.geos.push(cloned);
    });

    for (const bucket of buckets.values()) {
      if (bucket.meshes.length < 2) {
        for (const cg of bucket.geos) cg.dispose();
        const single = bucket.meshes[0];
        if (single) {
          single.userData.preserveShadowFlags = true;
          if (!bucket.castShadow) {
            single.castShadow = false;
            single.userData.noShadowCast = true;
          }
        }
        continue;
      }

      const mergedGeo = mergeGeometries(bucket.geos, false);
      for (const cg of bucket.geos) cg.dispose();
      if (!mergedGeo) continue;

      mergedGeo.computeBoundingSphere();
      disposableGeos.push(mergedGeo);
      const mergedMesh = new THREE.Mesh(mergedGeo, bucket.mat);
      mergedMesh.castShadow = bucket.castShadow;
      mergedMesh.receiveShadow = bucket.receiveShadow;
      mergedMesh.userData.preserveShadowFlags = true;
      if (!bucket.castShadow) {
        mergedMesh.userData.noShadowCast = true;
      }
      if (bucket.isHouseWall) {
        mergedMesh.userData.isHouseWall = true;
      }
      if (bucket.preserveEnvMapIntensity) {
        mergedMesh.userData.preserveEnvMapIntensity = true;
      }
      mergedMesh.updateMatrix();
      mergedMesh.matrixAutoUpdate = false;

      for (const srcMesh of bucket.meshes) {
        srcMesh.parent?.remove(srcMesh);
        if (!disposableGeos.includes(srcMesh.geometry)) {
          disposableGeos.push(srcMesh.geometry);
        }
      }
      root.add(mergedMesh);
    }
  };

  // Louisiana mainland: Crescent City district. Built as static batching so the
  // city adds a handful of draw calls, then merged with the same static-geometry
  // pass as every other island landmark.
  const crescentCity = buildLouisianaMainland();
  overworldGroup.add(crescentCity.group);
  for (let i = 0; i < crescentCity.colliders.length; i++) {
    colliders.push(crescentCity.colliders[i]);
  }
  staticMergeTargets.push({
    group: crescentCity.group,
    protectedObjs: [crescentCity.streetcarGroup],
  });

  // Enterable storefronts, restaurants, hotel, police station, bank and more.
  // They live in their own cullable group so the island never pays their draw cost.
  const louisianaBusinesses = buildLouisianaBusinesses();
  overworldGroup.add(louisianaBusinesses.group);
  for (let i = 0; i < louisianaBusinesses.colliders.length; i++) {
    colliders.push(louisianaBusinesses.colliders[i]);
  }
  staticMergeTargets.push({ group: louisianaBusinesses.group });
  overworldGroup.add(buildLouisianaNeighborhoods());

  // Island ferry pier and the shelter-side call box. The pier is the scripted
  // destination for the worker's car run; the call box starts the pickup.
  const islandFerry = buildIslandFerryDock();
  overworldGroup.add(islandFerry.dockGroup, islandFerry.callGroup);
  for (let i = 0; i < islandFerry.colliders.length; i++) {
    colliders.push(islandFerry.colliders[i]);
  }
  staticMergeTargets.push({ group: islandFerry.dockGroup });
  staticMergeTargets.push({ group: islandFerry.callGroup });

  // Drivable Mississippi river bridge inside Crescent City. The survival
  // island stays across open water and is reached by ferry only.
  const transitCauseway = buildTransitCauseway();
  overworldGroup.add(transitCauseway.group);
  staticMergeTargets.push({ group: transitCauseway.group });

  const ferryWorker = createFerryWorkerNpcModel();
  const ferryWorkerStartX = islandFerry.callPos.x + 6;
  const ferryWorkerStartZ = islandFerry.callPos.z - 18;
  ferryWorker.group.position.set(
    ferryWorkerStartX,
    getTerrainHeight(ferryWorkerStartX, ferryWorkerStartZ),
    ferryWorkerStartZ,
  );
  ferryWorker.group.visible = false;
  overworldGroup.add(ferryWorker.group);

  for (let i = 0; i < staticMergeTargets.length; i++) {
    const target = staticMergeTargets[i];
    mergeStaticGroupMeshes(target.group, target.protectedObjs);
  }

  // Register static shadow-casting meshes (buildings, chests, ship) for runtime shadow toggling
  overworldGroup.traverse((obj) => {
    if ((obj instanceof THREE.Mesh || obj instanceof THREE.InstancedMesh) && obj.castShadow && !obj.userData?.noShadowCast) {
      if (!shadowCasters.includes(obj)) shadowCasters.push(obj);
    }
  });

  // Freeze static matrices on terrain, instanced resources, foliage & decor batches to skip per-frame matrix recomputation
  terrainMesh.updateMatrix();
  terrainMesh.matrixAutoUpdate = false;
  for (const im of builtBatchMeshes.values()) {
    im.updateMatrix();
    im.matrixAutoUpdate = false;
  }
  for (let i = 0; i < foliageBatchMeshes.length; i++) {
    const fb = foliageBatchMeshes[i];
    fb.mesh.updateMatrix();
    fb.mesh.matrixAutoUpdate = false;
  }
  for (let i = 0; i < chunkedDecorEntries.length; i++) {
    const dc = chunkedDecorEntries[i];
    dc.mesh.updateMatrix();
    dc.mesh.matrixAutoUpdate = false;
  }

  // Register every biome landmark and static feature child of overworldGroup for fast squared-distance culling
  const skipCullSet = new Set<THREE.Object3D>([
    terrainMesh,
    oceanMesh,
    lakeMesh,
    cloudsGroup,
    farmerNpcGroup,
    ferryWorker.group,
    waterfallFoam,
    seabirdInstanced,
    ...waterfallStreams,
  ]);
  const cullableLandmarks: {
    obj: THREE.Object3D;
    cx: number;
    cz: number;
    radius: number;
    desiredVisible: boolean;
    wakeQueued: boolean;
  }[] = [];
  const tmpCullBox = new THREE.Box3();
  const tmpCullCenter = new THREE.Vector3();
  const tmpCullSize = new THREE.Vector3();
  overworldGroup.updateMatrixWorld(true);
  for (let i = 0; i < overworldGroup.children.length; i++) {
    const child = overworldGroup.children[i];
    if (skipCullSet.has(child)) continue;
    tmpCullBox.setFromObject(child);
    if (tmpCullBox.isEmpty()) continue;
    tmpCullBox.getCenter(tmpCullCenter);
    tmpCullBox.getSize(tmpCullSize);
    const radius = Math.hypot(tmpCullSize.x * 0.5, tmpCullSize.z * 0.5);
    // Only distance-cull localized biome landmarks & feature clusters (skip world-spanning shells).
    // The separated Crescent City is one large static district, so it needs the
    // larger localized limit; it still sleeps completely when the island is far away.
    if (radius > 0.1 && radius < 640) {
      cullableLandmarks.push({
        obj: child,
        cx: tmpCullCenter.x,
        cz: tmpCullCenter.z,
        radius,
        desiredVisible: child.visible,
        wakeQueued: false,
      });
    }
  }

  // Minecraft-style spatial WorldChunk partitioning (64m x 64m grid cells)
  // Reparents foliage InstancedMeshes, chunked world decor & localized biome landmarks into chunk groups at (0,0,0)
  // preserving 100% of world transforms, graphics, and colliders while updating visibility ONLY on chunk changes.
  const worldChunkManager = new WorldChunkManager(overworldGroup, 64);
  for (let i = 0; i < foliageChunkEntries.length; i++) {
    const fc = foliageChunkEntries[i];
    worldChunkManager.addFoliageObjectAt(fc.mesh, fc.cx, fc.cz);
  }
  for (let i = 0; i < foliageBatchMeshes.length; i++) {
    const fb = foliageBatchMeshes[i];
    worldChunkManager.addFoliageObjectAt(fb.mesh, fb.cx, fb.cz);
  }
  for (let i = 0; i < chunkedDecorEntries.length; i++) {
    const dc = chunkedDecorEntries[i];
    worldChunkManager.addObjectAt(dc.mesh, dc.cx, dc.cz);
  }
  const largeLandmarks: typeof cullableLandmarks = [];
  for (let i = 0; i < cullableLandmarks.length; i++) {
    const entry = cullableLandmarks[i];
    if (entry.radius < 110) {
      worldChunkManager.addObjectAt(entry.obj, entry.cx, entry.cz);
    } else {
      largeLandmarks.push(entry);
    }
  }

  const cullablePointLights: {
    wx: number;
    wy: number;
    wz: number;
    colorHex: number;
    intensity: number;
    distance: number;
    decay: number;
    maxRangeSq: number;
  }[] = [];
  const extractedLights: THREE.PointLight[] = [];
  const tmpLightWorldPos = new THREE.Vector3();
  overworldGroup.traverse((obj) => {
    if (obj instanceof THREE.PointLight) {
      obj.getWorldPosition(tmpLightWorldPos);
      const effectiveRange = Math.max(24, (obj.distance || 14) + 18);
      cullablePointLights.push({
        wx: tmpLightWorldPos.x,
        wy: tmpLightWorldPos.y,
        wz: tmpLightWorldPos.z,
        colorHex: obj.color.getHex(),
        intensity: obj.intensity,
        distance: obj.distance,
        decay: obj.decay,
        maxRangeSq: effectiveRange * effectiveRange,
      });
      extractedLights.push(obj);
    }
  });
  for (let i = 0; i < extractedLights.length; i++) {
    const l = extractedLights[i];
    l.parent?.remove(l);
    l.dispose();
  }

  // Fixed-size PointLight pool attached directly to overworldGroup (always visible=true;
  // unused slots use intensity=0 so Three.js numPointLights never changes -> zero shader recompiles!)
  const WORLD_LIGHT_POOL_SIZE = 6;
  const worldLightPool: THREE.PointLight[] = [];
  for (let i = 0; i < WORLD_LIGHT_POOL_SIZE; i++) {
    const poolLight = new THREE.PointLight(0xffffff, 0, 14, 1.5);
    poolLight.castShadow = false;
    poolLight.visible = true;
    overworldGroup.add(poolLight);
    worldLightPool.push(poolLight);
  }

  const bestLightIdx: number[] = [];
  const bestLightDistSq: number[] = [];
  const tmpChunkPlayerPos = new THREE.Vector3();

  let lastLightCullX = Number.NaN;
  let lastLightCullZ = Number.NaN;
  let lastLightCullDist = -1;
  let lastLightCullCap = -1;

  const cullWorldByDistance = (
    px: number,
    pz: number,
    maxDist: number,
    budgetQueue?: FrameBudgetQueue,
    maxActivePointLights = 6,
  ): void => {
    // 1. Minecraft-style WorldChunk culling: ONLY runs when player crosses into a new 64m chunk or render distance changes
    tmpChunkPlayerPos.set(px, 0, pz);
    const chunkChanged = worldChunkManager.updateIfChunkChanged(tmpChunkPlayerPos, maxDist);

    const movedSq =
      (px - lastLightCullX) * (px - lastLightCullX) +
      (pz - lastLightCullZ) * (pz - lastLightCullZ);
    applyGrassLod(px, pz);
    if (
      !chunkChanged &&
      !Number.isNaN(lastLightCullX) &&
      movedSq < 16.0 &&
      maxDist === lastLightCullDist &&
      maxActivePointLights === lastLightCullCap
    ) {
      return;
    }
    lastLightCullX = px;
    lastLightCullZ = pz;
    lastLightCullDist = maxDist;
    lastLightCullCap = maxActivePointLights;

    // 2. Fixed PointLight pool assignment (nearest N point lights stay lit around player without toggling .visible)
    const lightCap = Math.max(0, Math.min(WORLD_LIGHT_POOL_SIZE, maxActivePointLights));
    bestLightIdx.length = 0;
    bestLightDistSq.length = 0;
    if (lightCap > 0) {
      for (let i = 0; i < cullablePointLights.length; i++) {
        const pl = cullablePointLights[i];
        const dx = pl.wx - px;
        const dz = pl.wz - pz;
        const dSq = dx * dx + dz * dz;
        if (dSq > pl.maxRangeSq) continue;

        if (bestLightIdx.length < lightCap) {
          bestLightIdx.push(i);
          bestLightDistSq.push(dSq);
        } else {
          let worstPos = 0;
          let worstDist = bestLightDistSq[0];
          for (let k = 1; k < bestLightDistSq.length; k++) {
            if (bestLightDistSq[k] > worstDist) {
              worstDist = bestLightDistSq[k];
              worstPos = k;
            }
          }
          if (dSq < worstDist) {
            bestLightIdx[worstPos] = i;
            bestLightDistSq[worstPos] = dSq;
          }
        }
      }
    }
    for (let slot = 0; slot < WORLD_LIGHT_POOL_SIZE; slot++) {
      const poolLight = worldLightPool[slot];
      if (slot < bestLightIdx.length) {
        const src = cullablePointLights[bestLightIdx[slot]];
        poolLight.position.set(src.wx, src.wy, src.wz);
        poolLight.color.setHex(src.colorHex);
        poolLight.distance = src.distance;
        poolLight.decay = src.decay;
        poolLight.intensity = src.intensity;
      } else {
        poolLight.intensity = 0;
      }
    }

    // 3. Large multi-chunk mega-landmarks (radius >= 110m) keep smooth radius culling
    for (let i = 0; i < largeLandmarks.length; i++) {
      const entry = largeLandmarks[i];
      const dx = entry.cx - px;
      const dz = entry.cz - pz;
      const limit = maxDist + entry.radius + 36;
      const shouldShow = dx * dx + dz * dz <= limit * limit;
      entry.desiredVisible = shouldShow;
      if (!shouldShow) {
        if (entry.obj.visible) {
          entry.obj.visible = false;
        }
      } else if (!entry.obj.visible) {
        if (budgetQueue) {
          if (!entry.wakeQueued) {
            entry.wakeQueued = true;
            budgetQueue.enqueue(() => {
              entry.wakeQueued = false;
              if (entry.desiredVisible) {
                entry.obj.visible = true;
              }
            });
          }
        } else {
          entry.obj.visible = true;
        }
      }
    }
  };

  const zeroMatrix = new THREE.Matrix4().makeScale(0, 0, 0);

  const setBatchedNodeVisible = (nodeId: string, visible: boolean): void => {
    const slots = nodeBatchSlots.get(nodeId);
    if (!slots) return;
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      s.mesh.setMatrixAt(s.index, visible ? s.matrix : zeroMatrix);
      s.mesh.instanceMatrix.needsUpdate = true;
    }
  };

  const activateInteractiveNode = (nodeId: string): ResourceVisualHandle | undefined => {
    const existing = resourceHandles.get(nodeId);
    if (existing) return existing;
    const meta = nodeMetaMap.get(nodeId);
    if (!meta) return undefined;
    setBatchedNodeVisible(nodeId, false);
    const handle = buildNodeMesh(meta);
    const noShadowKind =
      meta.kind === 'wheat_patch' ||
      meta.kind === 'grass_tuft' ||
      meta.kind === 'fiber_fern' ||
      meta.kind === 'plant_cluster' ||
      meta.kind === 'flower_patch' ||
      meta.kind === 'rose_bush' ||
      meta.kind === 'lilac_bush' ||
      meta.kind === 'peony_bush' ||
      meta.kind === 'eyeblossom_patch' ||
      meta.kind === 'dead_bush' ||
      meta.kind === 'mushroom_cluster' ||
      meta.kind === 'branch_pile' ||
      meta.kind === 'clay_deposit' ||
      meta.kind === 'sand_mound';
    handle.root.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.castShadow = shadowsEnabledState && !noShadowKind;
        obj.receiveShadow = !noShadowKind;
        if (noShadowKind) obj.userData.noShadowCast = true;
      }
    });
    handle.root.position.set(meta.x, meta.y, meta.z);
    handle.root.rotation.y = meta.yaw;
    overworldGroup.add(handle.root);
    resourceMeshes.set(nodeId, handle.root);
    resourceHandles.set(nodeId, handle);
    return handle;
  };

  const restoreBatchedNode = (nodeId: string): void => {
    const existing = resourceHandles.get(nodeId);
    if (existing) {
      overworldGroup.remove(existing.root);
      existing.root.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          if (obj.geometry && !obj.geometry.userData?.sharedAsset && !disposableGeos.includes(obj.geometry)) {
            obj.geometry.dispose();
          }
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const m of mats) {
            if (m && !m.userData?.sharedAsset && !disposableMats.includes(m)) {
              m.dispose();
            }
          }
        }
      });
      resourceHandles.delete(nodeId);
      resourceMeshes.delete(nodeId);
    }
    setBatchedNodeVisible(nodeId, true);
  };

  const setWorldShadowCasting = (enabled: boolean): void => {
    shadowsEnabledState = enabled;
    for (let i = 0; i < shadowCasters.length; i++) {
      shadowCasters[i].castShadow =
        enabled && !shadowCasters[i].userData?.noShadowCast;
    }
    for (const handle of resourceHandles.values()) {
      handle.root.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.castShadow = enabled && !obj.userData?.noShadowCast;
        }
      });
    }
  };

  // ---- Ultra preset fidelity ----------------------------------------------
  // "Ultra" previously only raised resolution, shadow reach and draw distance.
  // It now also pushes the world's materials, grass and foliage to their
  // maximum quality: 16x anisotropic filtering (the island textures were
  // capped at 8), stronger image-based specular response, sharper normal-map
  // relief on foliage and bark, and 14-blade grass clumps instead of 8.
  const ultraMaterialBaselines = new WeakMap<
    THREE.Material,
    { envMapIntensity: number; roughness: number; normalScale: THREE.Vector2 | null }
  >();
  const ultraTextureAnisotropy = new WeakMap<THREE.Texture, number>();
  let ultraFidelityActive = false;
  const TEXTURE_SLOTS = [
    'map',
    'normalMap',
    'roughnessMap',
    'metalnessMap',
    'aoMap',
    'emissiveMap',
    'bumpMap',
    'alphaMap',
    'specularMap',
    'clearcoatMap',
    'clearcoatNormalMap',
    'clearcoatRoughnessMap',
  ] as const;

  const setUltraFidelity = (enabled: boolean): void => {
    if (enabled === ultraFidelityActive) return;
    ultraFidelityActive = enabled;

    // Walk the actual world instead of a registration list so terrain, cliffs,
    // grass, reeds, trees and every landmark material is covered.
    const seenMaterials = new Set<THREE.Material>();
    const worldMaterials: THREE.Material[] = [];
    overworldGroup.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const list = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const m of list) {
        if (m && !seenMaterials.has(m)) {
          seenMaterials.add(m);
          worldMaterials.push(m);
        }
      }
    });

    const hardwareAniso = renderer.capabilities.getMaxAnisotropy();
    const ultraAniso = Math.min(16, hardwareAniso);
    const touchedTextures = new Set<THREE.Texture>();
    for (const mat of worldMaterials) {
      const std = mat as THREE.MeshStandardMaterial;
      if (!std.isMeshStandardMaterial) continue;

      for (const slot of TEXTURE_SLOTS) {
        const tex = (mat as unknown as Record<string, unknown>)[slot];
        if (!(tex instanceof THREE.Texture) || touchedTextures.has(tex)) continue;
        touchedTextures.add(tex);
        let baseAniso = ultraTextureAnisotropy.get(tex);
        if (baseAniso === undefined) {
          baseAniso = tex.anisotropy;
          ultraTextureAnisotropy.set(tex, baseAniso);
        }
        const next = enabled ? Math.max(baseAniso, ultraAniso) : baseAniso;
        if (tex.anisotropy !== next) {
          tex.anisotropy = next;
          // Three only re-applies sampler state on upload, so flag the texture
          // once per preset switch rather than every frame.
          tex.needsUpdate = true;
        }
      }

      // Water and other hand-tuned surfaces own their envMapIntensity.
      if (mat.userData?.preserveEnvMapIntensity === true) continue;
      let base = ultraMaterialBaselines.get(mat);
      if (!base) {
        base = {
          envMapIntensity: std.envMapIntensity,
          roughness: std.roughness,
          normalScale: std.normalScale ? std.normalScale.clone() : null,
        };
        ultraMaterialBaselines.set(mat, base);
      }
      const isFoliage =
        mat.userData?.surfaceMode === 'foliage' ||
        mat.userData?.surfaceMode === 'grass' ||
        mat.userData?.surfaceMode === 'palm_frond';
      // Every material gets a richer IBL response; foliage is pushed further so
      // leaves and grass blades pick up the sky and read as thin, lit surfaces.
      std.envMapIntensity = enabled
        ? base.envMapIntensity * (isFoliage ? 1.4 : 1.18)
        : base.envMapIntensity;
      if (isFoliage) {
        std.roughness = enabled ? Math.max(0.34, base.roughness * 0.9) : base.roughness;
      }
      if (std.normalScale && base.normalScale) {
        const relief = enabled ? (isFoliage ? 1.35 : 1.18) : 1;
        std.normalScale.set(base.normalScale.x * relief, base.normalScale.y * relief);
      }
    }

    grassUltraActive = enabled;
    applyGrassLod(lastGrassLodX, lastGrassLodZ, true);
  };

  const dispose = (): void => {
    for (let i = 0; i < worldChunkManager.chunks.length; i++) {
      const g = worldChunkManager.chunks[i].group;
      if (!g.parent) overworldGroup.add(g);
    }
    for (let i = 0; i < worldChunkManager.foliageChunks.length; i++) {
      const g = worldChunkManager.foliageChunks[i].group;
      if (!g.parent) overworldGroup.add(g);
    }
    for (let i = 0; i < largeLandmarks.length; i++) {
      const o = largeLandmarks[i].obj;
      if (!o.parent) overworldGroup.add(o);
    }
    overworldGroup.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.InstancedMesh) {
        obj.geometry?.dispose();
        // Dragon scale/membrane materials are cached across world rebuilds.
        const disposeMaterial = (m: THREE.Material) => {
          if (!m.userData?.sharedDragon) m.dispose();
        };
        if (Array.isArray(obj.material)) {
          obj.material.forEach(disposeMaterial);
        } else if (obj.material) {
          disposeMaterial(obj.material);
        }
      }
    });
    for (const poolLight of worldLightPool) poolLight.dispose();
    for (const g of disposableGeos) g.dispose();
    for (const m of disposableMats) m.dispose();
    for (const t of disposableTexs) t.dispose();
  };

  return {
    terrainMesh,
    baseTerrainColors,
    oceanMesh,
    lakeMesh,
    waterfallStreams,
    waterfallShaderMat,
    waterfallFoam,
    cloudsGroup,
    woodTex,
    resourceNodes,
    resourceMeshes,
    resourceHandles,
    colliders,
    expeditionJournalPos,
    farmerNpcPos: new THREE.Vector3(FARMER_POS.x, farmerGroundY, FARMER_POS.z),
    farmerNpcGroup,
    farmerHead,
    farmerArmR,
    ferryWorkerGroup: ferryWorker.group,
    ferryWorkerHead: ferryWorker.head,
    ferryWorkerArmL: ferryWorker.armL,
    ferryWorkerArmR: ferryWorker.armR,
    ferryWorkerLegL: ferryWorker.legL,
    ferryWorkerLegR: ferryWorker.legR,
    ferryCallPos: islandFerry.callPos,
    ferryDockPos: islandFerry.carStopPos,
    ferryBoatPos: islandFerry.boatPos,
    soilPlots,
    houseStations: hillHouse.stations,
    tvScreenMat: hillHouse.tvScreenMat,
    tvScreenMesh: hillHouse.tvScreenMesh,
    tvWorldPos: new THREE.Vector3(HILL_HOUSE_POS.x + 0.75, HILL_HOUSE_Y + 1.24, HILL_HOUSE_POS.z + 0.41),
    hillHousePos: new THREE.Vector3(HILL_HOUSE_POS.x, HILL_HOUSE_Y, HILL_HOUSE_POS.z),
    hillHouseDoor: hillHouse.door,
    dragonValleyFlyers,
    dragonValleyBeacon:
      dragonValleyBeacon ?? {
        group: new THREE.Group(),
        beamMat: new THREE.MeshBasicMaterial(),
        coreMat: new THREE.MeshBasicMaterial(),
        ring: new THREE.Mesh(),
      },
    abandonedDragonGroup: abandonedDragonGroup ?? new THREE.Group(),
    garagePos,
    garageBenchPos,
    armoryChest,
    wheatfieldPos: new THREE.Vector3(WHEATFIELD_POS.x, wheatY, WHEATFIELD_POS.z),
    caveCeilings,
    shipwreckChests,
    eyeblossomGlowMat,
    saturnRocket: saturnBuilt,
    undergroundElevator,
    crescentCity,
    overworldGroup,
    worldChunks: worldChunkManager.chunks,
    foliageChunks: worldChunkManager.foliageChunks,
    largeLandmarkObjs: largeLandmarks.map((e) => e.obj),
    largeLandmarkEntries: largeLandmarks.map((e) => ({
      x: e.cx,
      z: e.cz,
      radius: e.radius,
      obj: e.obj,
    })),
    activateInteractiveNode,
    restoreBatchedNode,
    setBatchedNodeVisible,
    setWorldShadowCasting,
    setUltraFidelity,
    cullWorldByDistance,
    resetTerrainIndex,
    setCaveOpenings,
    dispose,
  };
}
