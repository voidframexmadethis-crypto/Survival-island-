import * as THREE from 'three';
import { ResourceNodeKind, ResourceNodeState } from '../types';
import {
  AUTUMN_GROVE_POS,
  CAVE_POS,
  DEAD_OAK_POS,
  EXPEDITION_POS,
  FARMER_POS,
  FARM_POND_POS,
  HILL_HOUSE_POS,
  HILL_HOUSE_Y,
  HOMESTEAD_POS,
  LAKE_CENTER,
  OCEAN_LEVEL,
  SNOWY_WOODLAND_POS,
  SWAMP_POS,
  TERRAIN_SEGS,
  TERRAIN_SIZE,
  VEHICLE_GARAGE_POS,
  VEHICLE_GARAGE_Y,
  WATERFALL_POS,
  WHEATFIELD_POS,
  getBiomeAt,
  getRiverSample,
  getTerrainHeight,
  getTerrainSlope,
} from './terrain';
import {
  createBarkTexture,
  createGroundDetailTexture,
  createHayTexture,
  createLeafCanopyTexture,
  createRockTexture,
  createWaterNormalTexture,
  createWoodPlankTexture,
} from './textures';
import {
  HouseStationTarget,
  createCaveCeilingClusterMesh,
  createFarmerNpcModel,
  createHilltopHouse,
} from './models';

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

export interface WorldHandles {
  terrainMesh: THREE.Mesh;
  baseTerrainColors: Float32Array;
  oceanMesh: THREE.Mesh;
  lakeMesh: THREE.Mesh;
  waterfallStreams: THREE.Mesh[];
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
  soilPlots: { x: number; y: number; z: number }[];
  houseStations: HouseStationTarget[];
  tvScreenMat: THREE.MeshStandardMaterial;
  tvScreenMesh: THREE.Mesh;
  tvWorldPos: THREE.Vector3;
  hillHousePos: THREE.Vector3;
  garagePos: THREE.Vector3;
  garageBenchPos: THREE.Vector3;
  armoryChest: ShipwreckChestHandle;
  wheatfieldPos: THREE.Vector3;
  caveCeilings: CaveCeilingCluster[];
  shipwreckChests: ShipwreckChestHandle[];
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
  const rand = seededRand(42071);

  const groundTex = createGroundDetailTexture(renderer);
  const barkTex = createBarkTexture(renderer);
  const rockTex = createRockTexture(renderer);
  const leafTex = createLeafCanopyTexture(renderer);
  const waterNormalTex = createWaterNormalTexture(renderer);
  const woodTex = createWoodPlankTexture(renderer);

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

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = getTerrainHeight(x, z);
    pos.setY(i, y);

    const biome = getBiomeAt(x, z);
    const slope = getTerrainSlope(x, z);

    // Winding forest path from southern beach (0, 108) -> Lake (-10, 26) -> Expedition (44, -12)
    const onBeachPath =
      Math.abs(x - Math.sin(z * 0.05) * 6) < 2.2 && z > 25 && z < 105;
    const onExpPath =
      Math.abs((z + 12) - (-0.45 * (x - 44))) < 2.1 && x > -8 && x < 44;

    const dSnow = Math.hypot(x - SNOWY_WOODLAND_POS.x, z - SNOWY_WOODLAND_POS.z);
    const dAutumn = Math.hypot(x - AUTUMN_GROVE_POS.x, z - AUTUMN_GROVE_POS.z);
    const dSwamp = Math.hypot(x - SWAMP_POS.x, z - SWAMP_POS.z);
    const dWheat = Math.hypot(x - WHEATFIELD_POS.x, z - WHEATFIELD_POS.z);
    const dGarage = Math.hypot(x - VEHICLE_GARAGE_POS.x, z - VEHICLE_GARAGE_POS.z);
    const onHouseRamp =
      x >= HILL_HOUSE_POS.x + 5 &&
      x <= HILL_HOUSE_POS.x + 22 &&
      Math.abs(z - HILL_HOUSE_POS.z) < 2.3;
    const onGarageDriveway =
      x >= VEHICLE_GARAGE_POS.x - 4 &&
      x <= VEHICLE_GARAGE_POS.x + 18 &&
      z >= VEHICLE_GARAGE_POS.z - 12 &&
      z <= VEHICLE_GARAGE_POS.z + 10 &&
      Math.abs((z - VEHICLE_GARAGE_POS.z) - 0.35 * (x - VEHICLE_GARAGE_POS.x)) < 3.2;

    if (y < -0.3) {
      c.setHex(0x1e6b7b);
    } else if (dSwamp < SWAMP_POS.radius + 2.2) {
      c.setHex(0x3f4224); // murky swamp mud & moss
    } else if (dSnow < 13.5) {
      c.setHex(dSnow < 10.5 ? 0xdbe4ee : 0x9aa8b8); // snowy woodland floor
    } else if (dAutumn < 11.0) {
      c.setHex(0x8c5228); // warm fallen autumn leaf bed
    } else if (dWheat < 7.8) {
      c.setHex(0x7c5832); // rich cultivated wheatfield loam
    } else if (dGarage < 9.5) {
      c.setHex(0x78736c); // leveled compacted stone garage clearing
    } else if (onHouseRamp || onGarageDriveway) {
      c.setHex(0xa89274); // gravel-earth path & vehicle driveway
    } else if (biome === 'beach' || y < 2.2) {
      c.setHex(0xe5c88b);
    } else if (biome === 'river' || biome === 'lake') {
      c.setHex(0x8d7255);
    } else if (slope > 0.65 || y > 12.0 || biome === 'mountain' || biome === 'cave') {
      c.setHex(y > 16 ? 0x57534e : 0x6b645c);
    } else if (onBeachPath || onExpPath) {
      c.setHex(0x8c7350); // worn dirt forest trail
    } else if (biome === 'grassland') {
      c.setHex(0x7d9c3b);
    } else if (biome === 'expedition') {
      c.setHex(0x7c6a46);
    } else {
      c.setHex(0x2f6b34);
    }

    const jitter = (rand() - 0.5) * 0.06;
    colors[i * 3] = Math.max(0, Math.min(1, c.r + jitter));
    colors[i * 3 + 1] = Math.max(0, Math.min(1, c.g + jitter));
    colors[i * 3 + 2] = Math.max(0, Math.min(1, c.b + jitter));
  }

  const baseTerrainColors = new Float32Array(colors);
  terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  terrainGeo.computeVertexNormals();

  const terrainMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    map: groundTex,
    roughness: 0.92,
    metalness: 0.02,
  });
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  scene.add(terrainMesh);

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
  scene.add(oceanMesh);

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
  scene.add(lakeMesh);

  const riverSegs: [number, number, number][] = [
    [6, -46, 2.58],
    [-4, -22, 2.58],
    [-14, 8, 2.58],
    [8, 26, 2.15],
    [30, 48, 1.45],
    [50, 74, 0.68],
    [68, 102, 0.02],
  ];
  for (let i = 0; i < riverSegs.length - 1; i++) {
    const [ax, az, ay] = riverSegs[i];
    const [bx, bz, by] = riverSegs[i + 1];
    const len = Math.hypot(bx - ax, bz - az) + 2.0;
    const ribGeo = new THREE.PlaneGeometry(8.5, len);
    ribGeo.rotateX(-Math.PI / 2);
    const rib = new THREE.Mesh(ribGeo, freshwaterMat);
    rib.position.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
    rib.rotation.y = Math.atan2(bx - ax, bz - az);
    rib.rotation.x = Math.atan2(by - ay, len);
    scene.add(rib);
  }

  // 4. Waterfall at Northern Mountain Shelf
  const waterfallStreams: THREE.Mesh[] = [];
  const wfMat = new THREE.MeshStandardMaterial({
    color: 0xa5f3fc,
    emissive: 0x0e7490,
    emissiveIntensity: 0.25,
    roughness: 0.2,
    transparent: true,
    opacity: 0.84,
  });
  for (let i = 0; i < 3; i++) {
    const stream = new THREE.Mesh(new THREE.BoxGeometry(2.6, 11.5, 0.65), wfMat);
    stream.position.set(WATERFALL_POS.x + (i - 1) * 1.4, 8.0, WATERFALL_POS.z + 1.8);
    stream.rotation.x = 0.28;
    scene.add(stream);
    waterfallStreams.push(stream);
  }
  const waterfallFoam = new THREE.Mesh(
    new THREE.RingGeometry(1.4, 4.4, 20),
    new THREE.MeshBasicMaterial({
      color: 0xecfeff,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
    }),
  );
  waterfallFoam.rotation.x = -Math.PI / 2;
  waterfallFoam.position.set(WATERFALL_POS.x, 2.66, WATERFALL_POS.z + 4.4);
  scene.add(waterfallFoam);

  // 5. Drifting 3D Tropical Clouds
  const cloudsGroup = new THREE.Group();
  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.95,
    transparent: true,
    opacity: 0.82,
  });
  for (let i = 0; i < 18; i++) {
    const cluster = new THREE.Group();
    const angle = (i / 18) * Math.PI * 2;
    const dist = 50 + rand() * 140;
    cluster.position.set(Math.cos(angle) * dist, 56 + rand() * 18, Math.sin(angle) * dist);
    for (let p = 0; p < 4; p++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(5 + rand() * 5, 8, 7), cloudMat);
      puff.scale.set(1.5, 0.52, 1.1);
      puff.position.set((p - 1.5) * 5.2, rand() * 1.8, (rand() - 0.5) * 4);
      cluster.add(puff);
    }
    cloudsGroup.add(cluster);
  }
  scene.add(cloudsGroup);

  // 6. Hyper-Realistic Shipwreck & Beaching Event with Tiered Interior Zones & Boarding Routes
  // ALL COLLISION BARRIERS & INVISIBLE WALLS STRIPPED: Player can walk/swim freely through any part!
  const colliders: { x: number; z: number; radius: number; nodeId?: string }[] = [];
  const wreckMat = new THREE.MeshStandardMaterial({
    color: 0x4b3320,
    map: woodTex,
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
  const hullX = -4;
  const hullZ = 135;
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
  scene.add(wreckGroup);
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

    scene.add(chestGroup);

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
      -7.0,
      OCEAN_LEVEL + 0.45,
      128.0,
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
      -5.5,
      OCEAN_LEVEL + 0.25,
      133.0,
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
      -3.0,
      OCEAN_LEVEL + 0.95,
      135.5,
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
      -1.8,
      OCEAN_LEVEL + 1.65,
      141.5,
      -0.25,
      0xeab308,
    ),
  );

  // Scattered chaotic debris field in water/sand around shipwreck
  const debrisSpots: [number, number, number][] = [
    [-6.5, 120, 0.4],
    [5.2, 122, -0.7],
    [13.5, 125, 1.1],
    [-18.0, 121, -0.3],
    [2.8, 128, 0.9],
    [-8.2, 132, 1.5],
    [7.4, 117, -0.5],
  ];
  debrisSpots.forEach(([dx, dz, rot]) => {
    const dy = getTerrainHeight(dx, dz);
    const plank = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 2.8), wreckMat);
    plank.position.set(dx, Math.max(OCEAN_LEVEL + 0.05, dy + 0.06), dz);
    plank.rotation.y = rot;
    scene.add(plank);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.85, 9), wreckMat);
    barrel.position.set(dx + 0.9, Math.max(OCEAN_LEVEL + 0.15, dy + 0.35), dz + 0.6);
    barrel.rotation.z = Math.PI / 2.4;
    barrel.castShadow = true;
    scene.add(barrel);
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
  scene.add(caveGroup);
  colliders.push({ x: CAVE_POS.x - 4.2, z: CAVE_POS.z, radius: 2.2 });
  colliders.push({ x: CAVE_POS.x + 4.2, z: CAVE_POS.z, radius: 2.2 });
  colliders.push({ x: CAVE_POS.x, z: CAVE_POS.z - 4.8, radius: 3.0 });

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
    scene.add(mesh);
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

  scene.add(expGroup);
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
    roughness: 0.9,
  });
  const darkBeamMat = new THREE.MeshStandardMaterial({
    color: 0x422614,
    map: woodTex,
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
    bale.castShadow = true;
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
  scene.add(barnGroup);

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
  scene.add(paddockPatch);

  // Farmyard dirt patch for Rooster scratching & muddy pig pen corner
  const yardDirt = new THREE.Mesh(new THREE.CircleGeometry(4.6, 18), dustyDirtMat);
  yardDirt.rotation.x = -Math.PI / 2;
  yardDirt.position.set(-19.5, homesteadY + 0.024, 60.5);
  yardDirt.receiveShadow = true;
  scene.add(yardDirt);

  const addFenceSpan = (ax: number, az: number, bx: number, bz: number) => {
    const len = Math.hypot(bx - ax, bz - az);
    const angle = Math.atan2(bx - ax, bz - az);
    const steps = Math.max(1, Math.round(len / 2.6));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const px = ax + (bx - ax) * t;
      const pz = az + (bz - az) * t;
      const py = getTerrainHeight(px, pz);
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.28, 0.16), darkBeamMat);
      post.position.set(px, py + 0.64, pz);
      post.castShadow = true;
      scene.add(post);
      colliders.push({ x: px, z: pz, radius: 0.25 });
    }
    const mx = (ax + bx) / 2;
    const mz = (az + bz) / 2;
    const my = getTerrainHeight(mx, mz);
    [0.52, 0.98].forEach((ry) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.1, len), barnWoodMat);
      rail.position.set(mx, my + ry, mz);
      rail.rotation.y = angle;
      rail.castShadow = true;
      scene.add(rail);
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
  scene.add(goatCrate);
  colliders.push({ x: crateX, z: crateZ, radius: 0.68 });

  // Muddy Farm Pond beside the barnyard for Pekin Ducks
  const muddyRing = new THREE.Mesh(
    new THREE.RingGeometry(FARM_POND_POS.radius - 0.6, FARM_POND_POS.radius + 1.8, 22),
    muddyBankMat,
  );
  muddyRing.rotation.x = -Math.PI / 2;
  muddyRing.position.set(FARM_POND_POS.x, FARM_POND_POS.waterY + 0.04, FARM_POND_POS.z);
  muddyRing.receiveShadow = true;
  const pondWater = new THREE.Mesh(
    new THREE.CircleGeometry(FARM_POND_POS.radius + 0.4, 24),
    freshwaterMat,
  );
  pondWater.rotation.x = -Math.PI / 2;
  pondWater.position.set(FARM_POND_POS.x, FARM_POND_POS.waterY, FARM_POND_POS.z);
  scene.add(muddyRing, pondWater);

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
    scene.add(mistRing);
  }

  // 2) Snowy Woodland Plateau (Timber Wolves)
  const snowCapMat = new THREE.MeshStandardMaterial({ color: 0xeef2f6, roughness: 0.88 });
  const snowCedarLeafMat = new THREE.MeshStandardMaterial({ color: 0x1e4a38, map: leafTex, roughness: 0.85 });
  const snowBarkMat = new THREE.MeshStandardMaterial({ color: 0x453226, map: barkTex, roughness: 0.94 });
  const snowBoulderMat = new THREE.MeshStandardMaterial({ color: 0x64748b, map: rockTex, roughness: 0.9 });
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
    const tree = new THREE.Group();
    tree.position.set(tx, ty, tz);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28 * sc, 0.42 * sc, 4.8 * sc, 8), snowBarkMat);
    trunk.position.y = 2.4 * sc;
    trunk.castShadow = true;
    tree.add(trunk);
    for (let tier = 0; tier < 4; tier++) {
      const tierY = (2.1 + tier * 1.05) * sc;
      const tierR = (2.15 - tier * 0.42) * sc;
      const bough = new THREE.Mesh(new THREE.ConeGeometry(tierR, 1.55 * sc, 8), snowCedarLeafMat);
      bough.position.y = tierY;
      bough.castShadow = true;
      const snowTop = new THREE.Mesh(new THREE.ConeGeometry(tierR * 0.86, 0.58 * sc, 8), snowCapMat);
      snowTop.position.y = tierY + 0.48 * sc;
      tree.add(bough, snowTop);
    }
    scene.add(tree);
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
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.05, 1), snowBoulderMat);
    rock.scale.set(1.25, 0.72, 1.05);
    rock.position.set(rx, ry + 0.38, rz);
    rock.castShadow = true;
    const snowDrift = new THREE.Mesh(new THREE.DodecahedronGeometry(0.86, 1), snowCapMat);
    snowDrift.scale.set(1.18, 0.35, 0.96);
    snowDrift.position.set(rx, ry + 0.85, rz);
    scene.add(rock, snowDrift);
    colliders.push({ x: rx, z: rz, radius: 1.05 });
  });

  // 3) Rocky Crystal River Bank & Dense Pine Pines (Grizzly Bear territory near (-4, -26))
  const riverBankRockMat = new THREE.MeshStandardMaterial({ color: 0x706c66, map: rockTex, roughness: 0.85 });
  const bankPines: [number, number, number][] = [
    [-11.2, -23.5, 1.1],
    [-10.4, -31.2, 1.25],
    [4.6, -24.0, 1.15],
    [6.5, -32.8, 1.05],
    [-9.5, -16.8, 1.0],
  ];
  bankPines.forEach(([px, pz, sc]) => {
    const py = getTerrainHeight(px, pz);
    const pine = new THREE.Group();
    pine.position.set(px, py, pz);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.26 * sc, 0.4 * sc, 5.2 * sc, 8), snowBarkMat);
    trunk.position.y = 2.6 * sc;
    trunk.castShadow = true;
    pine.add(trunk);
    for (let t = 0; t < 4; t++) {
      const bough = new THREE.Mesh(
        new THREE.ConeGeometry((2.1 - t * 0.4) * sc, 1.65 * sc, 8),
        snowCedarLeafMat,
      );
      bough.position.y = (2.3 + t * 1.1) * sc;
      bough.castShadow = true;
      pine.add(bough);
    }
    scene.add(pine);
    colliders.push({ x: px, z: pz, radius: 0.34 * sc });
  });
  [
    [-8.0, -25.2, 0.95],
    [-7.6, -29.4, 0.72],
    [2.8, -28.0, 0.85],
    [-1.5, -33.2, 0.8],
  ].forEach(([rx, rz, sc]) => {
    const ry = getTerrainHeight(rx, rz);
    const cobble = new THREE.Mesh(new THREE.DodecahedronGeometry(0.85 * sc, 1), riverBankRockMat);
    cobble.scale.set(1.3, 0.65, 1.1);
    cobble.position.set(rx, ry + 0.3 * sc, rz);
    cobble.castShadow = true;
    scene.add(cobble);
    colliders.push({ x: rx, z: rz, radius: 0.8 * sc });
  });

  // 4) Autumn Forest Grove & Fallen Leaves (Red Fox undergrowth)
  const autumnColors = [0xd97706, 0xb45309, 0xc2410c, 0xeab308];
  const autumnLeafMats = autumnColors.map(
    (col) => new THREE.MeshStandardMaterial({ color: col, map: leafTex, roughness: 0.84 }),
  );
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
    const tree = new THREE.Group();
    tree.position.set(ax, ay, az);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.24 * sc, 0.38 * sc, 3.6 * sc, 8), snowBarkMat);
    trunk.position.y = 1.8 * sc;
    trunk.castShadow = true;
    tree.add(trunk);
    for (let c = 0; c < 3; c++) {
      const ca = (c / 3) * Math.PI * 2 + idx;
      const crown = new THREE.Mesh(
        new THREE.DodecahedronGeometry(1.55 * sc, 1),
        autumnLeafMats[(idx + c) % autumnLeafMats.length],
      );
      crown.scale.set(1.15, 0.78, 1.15);
      crown.position.set(Math.cos(ca) * 0.75 * sc, (3.6 + (c % 2) * 0.65) * sc, Math.sin(ca) * 0.75 * sc);
      crown.castShadow = true;
      tree.add(crown);
    }
    scene.add(tree);
    colliders.push({ x: ax, z: az, radius: 0.32 * sc });
  });
  // Undergrowth ferns & fallen autumn leaves on ground
  const autumnUndergrowthMat = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.88 });
  for (let lf = 0; lf < 48; lf++) {
    const la = (lf / 48) * Math.PI * 2 + rand() * 0.5;
    const lr = 1.2 + rand() * 8.5;
    const lx = AUTUMN_GROVE_POS.x + Math.cos(la) * lr;
    const lz = AUTUMN_GROVE_POS.z + Math.sin(la) * lr;
    const ly = getTerrainHeight(lx, lz);
    const leafPatch = new THREE.Mesh(
      new THREE.PlaneGeometry(0.28 + rand() * 0.18, 0.2 + rand() * 0.14),
      autumnLeafMats[lf % autumnLeafMats.length],
    );
    leafPatch.rotation.x = -Math.PI / 2;
    leafPatch.rotation.z = rand() * Math.PI * 2;
    leafPatch.position.set(lx, ly + 0.03, lz);
    scene.add(leafPatch);
  }
  for (let u = 0; u < 10; u++) {
    const ua = (u / 10) * Math.PI * 2 + 0.3;
    const ur = 3.8 + (u % 3) * 1.9;
    const ux = AUTUMN_GROVE_POS.x + Math.cos(ua) * ur;
    const uz = AUTUMN_GROVE_POS.z + Math.sin(ua) * ur;
    const uy = getTerrainHeight(ux, uz);
    const bush = new THREE.Group();
    bush.position.set(ux, uy, uz);
    for (let f = 0; f < 4; f++) {
      const frond = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.82, 4), autumnUndergrowthMat);
      frond.position.y = 0.28;
      frond.rotation.z = 0.68;
      frond.rotation.y = (f / 4) * Math.PI * 2;
      bush.add(frond);
    }
    scene.add(bush);
  }

  // 5) Murky Jungle Swamp Lagoon (Saltwater Crocodile territory)
  const swampWaterMat = new THREE.MeshStandardMaterial({
    color: 0x2d3b22,
    normalMap: waterNormalTex,
    normalScale: new THREE.Vector2(0.25, 0.25),
    roughness: 0.22,
    metalness: 0.14,
    transparent: true,
    opacity: 0.9,
  });
  const swampMudMat = new THREE.MeshStandardMaterial({ color: 0x3b3322, roughness: 0.72 });
  const swampBankRing = new THREE.Mesh(
    new THREE.RingGeometry(SWAMP_POS.radius - 0.8, SWAMP_POS.radius + 2.4, 28),
    swampMudMat,
  );
  swampBankRing.rotation.x = -Math.PI / 2;
  swampBankRing.position.set(SWAMP_POS.x, SWAMP_POS.waterY + 0.03, SWAMP_POS.z);
  swampBankRing.receiveShadow = true;
  const swampWater = new THREE.Mesh(
    new THREE.CircleGeometry(SWAMP_POS.radius + 0.6, 30),
    swampWaterMat,
  );
  swampWater.rotation.x = -Math.PI / 2;
  swampWater.position.set(SWAMP_POS.x, SWAMP_POS.waterY, SWAMP_POS.z);
  scene.add(swampBankRing, swampWater);

  // Mossy swamp logs & dense jungle reeds along lagoon edge
  const swampReedMat = new THREE.MeshStandardMaterial({ color: 0x365314, roughness: 0.86 });
  for (let r = 0; r < 14; r++) {
    const ra = (r / 14) * Math.PI * 2;
    const rx = SWAMP_POS.x + Math.cos(ra) * (SWAMP_POS.radius - 0.4 + (r % 2) * 1.3);
    const rz = SWAMP_POS.z + Math.sin(ra) * (SWAMP_POS.radius - 0.4 + (r % 2) * 1.3);
    const ry = Math.max(SWAMP_POS.waterY - 0.2, getTerrainHeight(rx, rz));
    const clump = new THREE.Group();
    clump.position.set(rx, ry, rz);
    for (let s = 0; s < 5; s++) {
      const reed = new THREE.Mesh(new THREE.ConeGeometry(0.06, 1.35, 4), swampReedMat);
      reed.position.set((s - 2) * 0.14, 0.62, ((s % 2) - 0.5) * 0.16);
      reed.rotation.z = (s - 2) * 0.1;
      clump.add(reed);
    }
    scene.add(clump);
  }
  const sunkenLog = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 4.4, 8), snowBarkMat);
  sunkenLog.position.set(SWAMP_POS.x - 4.2, SWAMP_POS.waterY + 0.02, SWAMP_POS.z + 3.8);
  sunkenLog.rotation.set(0.06, 0.72, Math.PI / 2);
  scene.add(sunkenLog);

  // 6) Tall Golden Savanna Grass Patch (African Lion prowling & Bison windswept prairie)
  const goldenSavannaBladeGeo = new THREE.ConeGeometry(0.08, 1.32, 4);
  goldenSavannaBladeGeo.translate(0, 0.66, 0);
  const goldenSavannaMat = new THREE.MeshStandardMaterial({ color: 0xd4a438, roughness: 0.88 });
  const savannaGrassCount = 180;
  const savannaGrassMesh = new THREE.InstancedMesh(
    goldenSavannaBladeGeo,
    goldenSavannaMat,
    savannaGrassCount,
  );
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
  scene.add(savannaGrassMesh);

  // 7) Gnarled Dead Oak Tree & Exposed Perch Branch (Great Horned Owl at DEAD_OAK_POS = (18, 78))
  const deadOakBaseY = getTerrainHeight(DEAD_OAK_POS.x, DEAD_OAK_POS.z);
  const deadOakMat = new THREE.MeshStandardMaterial({ color: 0x574c43, map: barkTex, roughness: 0.96 });
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
  scene.add(deadOakGroup);
  colliders.push({ x: DEAD_OAK_POS.x, z: DEAD_OAK_POS.z, radius: 0.7 });

  // 9. Interactive Realistic Trees, Breakable Rocks & Resource Nodes
  const resourceNodes: ResourceNodeState[] = [];
  const resourceMeshes = new Map<string, THREE.Object3D>();
  const resourceHandles = new Map<string, ResourceVisualHandle>();

  const palmTrunkMat = new THREE.MeshStandardMaterial({ color: 0x855a3c, map: barkTex, roughness: 0.92 });
  const palmLeafMat = new THREE.MeshStandardMaterial({ color: 0x358f42, map: leafTex, roughness: 0.76 });
  const jungleTrunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3d28, map: barkTex, roughness: 0.94 });
  const jungleLeafMat = new THREE.MeshStandardMaterial({ color: 0x227038, map: leafTex, roughness: 0.8 });
  const banyanTrunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4b34, map: barkTex, roughness: 0.93 });
  const banyanLeafMat = new THREE.MeshStandardMaterial({ color: 0x1b5e30, map: leafTex, roughness: 0.82 });
  const cedarTrunkMat = new THREE.MeshStandardMaterial({ color: 0x4f3422, map: barkTex, roughness: 0.95 });
  const cedarLeafMat = new THREE.MeshStandardMaterial({ color: 0x1f5c3a, map: leafTex, roughness: 0.84 });
  const heartwoodCutMat = new THREE.MeshStandardMaterial({ color: 0xd4a36a, roughness: 0.78 });
  const coconutMat = new THREE.MeshStandardMaterial({ color: 0x4b2e19, roughness: 0.85 });

  const boulderMat = new THREE.MeshStandardMaterial({ color: 0x7c7670, map: rockTex, roughness: 0.92 });
  const smallStoneMat = new THREE.MeshStandardMaterial({ color: 0x8b8680, map: rockTex, roughness: 0.88 });
  const mountainRockMat = new THREE.MeshStandardMaterial({ color: 0x5d5853, map: rockTex, roughness: 0.94 });
  const flintMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.32, metalness: 0.25 });
  const oreRockMat = new THREE.MeshStandardMaterial({ color: 0x4a4540, map: rockTex, roughness: 0.9 });
  const oreVeinMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.28, metalness: 0.82 });
  const crackMat = new THREE.MeshStandardMaterial({ color: 0x171412, roughness: 0.98 });

  const wheatMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.86 });
  const sugarcaneMat = new THREE.MeshStandardMaterial({ color: 0x84cc16, roughness: 0.72 });
  const sugarcaneNodeMat = new THREE.MeshStandardMaterial({ color: 0x4d7c0f, roughness: 0.8 });
  const grassMat = new THREE.MeshStandardMaterial({ color: 0x65a30d, roughness: 0.88 });
  const berryBushMat = new THREE.MeshStandardMaterial({ color: 0x15803d, map: leafTex, roughness: 0.85 });
  const berryFruitMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.45 });
  const fernMat = new THREE.MeshStandardMaterial({ color: 0x4d7c0f, roughness: 0.84 });
  const mushroomCapMat = new THREE.MeshStandardMaterial({ color: 0xc27849, roughness: 0.7 });
  const mushroomStemMat = new THREE.MeshStandardMaterial({ color: 0xe7e5e4, roughness: 0.85 });
  const clayMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.94 });
  const sandMoundMat = new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.95 });

  function addRootFlares(parent: THREE.Group, trunkMat: THREE.Material, count: number, spread: number, height: number) {
    for (let r = 0; r < count; r++) {
      const a = (r / count) * Math.PI * 2 + rand() * 0.35;
      const root = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.22, height, 6),
        trunkMat,
      );
      root.position.set(Math.cos(a) * spread, height * 0.36, Math.sin(a) * spread);
      root.rotation.z = Math.cos(a) * 0.55;
      root.rotation.x = -Math.sin(a) * 0.55;
      parent.add(root);
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
      const crack = new THREE.Mesh(
        new THREE.BoxGeometry(0.11 * scaleR, 0.56 * scaleR, 0.12 * scaleR),
        crackMat,
      );
      crack.position.set(ox, oy, oz);
      crack.rotation.set(0.3, ry, rz);
      crack.visible = false;
      rockBody.add(crack);
      cracks.push(crack);
    });
    return cracks;
  }

  function buildNodeMesh(kind: ResourceNodeKind, scale: number): ResourceVisualHandle {
    const root = new THREE.Group();

    if (kind === 'palm_tree') {
      const stumpMesh = new THREE.Group();
      addRootFlares(stumpMesh, palmTrunkMat, 5, 0.26, 0.52);
      const stumpBase = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.35, 0.65, 8), palmTrunkMat);
      stumpBase.position.y = 0.32;
      stumpBase.castShadow = true;
      const stumpTop = new THREE.Mesh(new THREE.CircleGeometry(0.27, 8), heartwoodCutMat);
      stumpTop.rotation.x = -Math.PI / 2;
      stumpTop.position.y = 0.655;
      stumpMesh.add(stumpBase, stumpTop);
      root.add(stumpMesh);

      const felledPivot = new THREE.Group();
      felledPivot.position.y = 0.62;
      const lean = (rand() - 0.5) * 0.26;

      // 3-segment curved tropical palm trunk
      let curX = 0;
      let curY = 0;
      for (let s = 0; s < 3; s++) {
        const segH = 1.65;
        const rBot = 0.27 - s * 0.04;
        const rTop = 0.23 - s * 0.04;
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, segH, 8), palmTrunkMat);
        const tilt = lean * (s + 1) * 0.45;
        seg.position.set(curX - Math.sin(tilt) * 0.3, curY + segH * 0.5, 0);
        seg.rotation.z = tilt;
        seg.castShadow = true;
        felledPivot.add(seg);
        curX -= Math.sin(tilt) * 0.55;
        curY += segH * 0.96;
      }

      const trunkCutBand = new THREE.Mesh(new THREE.CylinderGeometry(0.285, 0.285, 0.22, 8), heartwoodCutMat);
      trunkCutBand.position.y = 0.14;
      trunkCutBand.visible = false;
      felledPivot.add(trunkCutBand);

      const crown = new THREE.Group();
      crown.position.set(curX, curY, 0);
      for (let c = 0; c < 3; c++) {
        const coco = new THREE.Mesh(new THREE.SphereGeometry(0.14, 7, 6), coconutMat);
        const ca = (c / 3) * Math.PI * 2;
        coco.position.set(Math.cos(ca) * 0.24, -0.18, Math.sin(ca) * 0.24);
        crown.add(coco);
      }
      for (let f = 0; f < 7; f++) {
        const a = (f / 7) * Math.PI * 2;
        const frondGroup = new THREE.Group();
        frondGroup.rotation.y = a;
        const innerFrond = new THREE.Mesh(new THREE.ConeGeometry(0.32, 1.75, 5), palmLeafMat);
        innerFrond.rotation.z = -Math.PI / 2.6;
        innerFrond.position.set(0.8, 0.14, 0);
        innerFrond.castShadow = true;
        const tipFrond = new THREE.Mesh(new THREE.ConeGeometry(0.24, 1.35, 5), palmLeafMat);
        tipFrond.rotation.z = -Math.PI / 1.75;
        tipFrond.position.set(1.9, -0.22, 0);
        frondGroup.add(innerFrond, tipFrond);
        crown.add(frondGroup);
      }
      felledPivot.add(crown);
      root.add(felledPivot);
      root.scale.setScalar(scale);
      return { root, felledPivot, stumpMesh, trunkCutBand };
    }

    if (kind === 'tropical_tree' || kind === 'banyan_tree' || kind === 'highland_cedar') {
      const isBanyan = kind === 'banyan_tree';
      const isCedar = kind === 'highland_cedar';
      const tMat = isBanyan ? banyanTrunkMat : isCedar ? cedarTrunkMat : jungleTrunkMat;
      const lMat = isBanyan ? banyanLeafMat : isCedar ? cedarLeafMat : jungleLeafMat;
      const baseR = isBanyan ? 0.62 : isCedar ? 0.44 : 0.48;

      const stumpMesh = new THREE.Group();
      addRootFlares(stumpMesh, tMat, isBanyan ? 5 : 4, baseR * 0.95, 0.85);
      const stumpBase = new THREE.Mesh(new THREE.CylinderGeometry(baseR * 0.88, baseR * 1.12, 0.72, 9), tMat);
      stumpBase.position.y = 0.36;
      stumpBase.castShadow = true;
      const stumpTop = new THREE.Mesh(new THREE.CircleGeometry(baseR * 0.86, 9), heartwoodCutMat);
      stumpTop.rotation.x = -Math.PI / 2;
      stumpTop.position.y = 0.725;
      stumpMesh.add(stumpBase, stumpTop);
      root.add(stumpMesh);

      const felledPivot = new THREE.Group();
      felledPivot.position.y = 0.7;

      const trunkH = isBanyan ? 4.1 : isCedar ? 5.8 : 4.6;
      const upperTrunk = new THREE.Mesh(
        new THREE.CylinderGeometry(baseR * 0.45, baseR * 0.88, trunkH, 9),
        tMat,
      );
      upperTrunk.position.y = trunkH * 0.5;
      upperTrunk.castShadow = true;
      felledPivot.add(upperTrunk);

      const trunkCutBand = new THREE.Mesh(
        new THREE.CylinderGeometry(baseR * 0.92, baseR * 0.92, 0.28, 9),
        heartwoodCutMat,
      );
      trunkCutBand.position.y = 0.16;
      trunkCutBand.visible = false;
      felledPivot.add(trunkCutBand);

      if (isCedar) {
        // Tiered evergreen cedar boughs & branches
        for (let tier = 0; tier < 4; tier++) {
          const ty = 2.1 + tier * 1.1;
          const tr = 2.25 - tier * 0.44;
          const bough = new THREE.Mesh(new THREE.ConeGeometry(tr, 1.55, 8), lMat);
          bough.position.y = ty;
          bough.castShadow = true;
          felledPivot.add(bough);
        }
      } else {
        // Forking wooden branches + layered organic leaf crowns
        const branchCount = isBanyan ? 4 : 3;
        for (let b = 0; b < branchCount; b++) {
          const ba = (b / branchCount) * Math.PI * 2 + 0.4;
          const limb = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.2, 2.1, 6), tMat);
          limb.position.set(Math.cos(ba) * 0.7, trunkH - 0.45, Math.sin(ba) * 0.7);
          limb.rotation.z = -Math.cos(ba) * 0.68;
          limb.rotation.x = Math.sin(ba) * 0.68;
          limb.castShadow = true;
          felledPivot.add(limb);

          if (isBanyan) {
            // Aerial prop root hanging from major limb
            const prop = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.7, 5), tMat);
            prop.position.set(Math.cos(ba) * 1.28, 1.45, Math.sin(ba) * 1.28);
            felledPivot.add(prop);
          }

          const cluster = new THREE.Mesh(
            new THREE.DodecahedronGeometry(isBanyan ? 1.55 : 1.35, 1),
            lMat,
          );
          cluster.position.set(Math.cos(ba) * 1.25, trunkH + 0.35, Math.sin(ba) * 1.25);
          cluster.scale.set(1.15, 0.72, 1.15);
          cluster.castShadow = true;
          felledPivot.add(cluster);
        }

        const topCrown = new THREE.Mesh(
          new THREE.DodecahedronGeometry(isBanyan ? 2.15 : 1.85, 1),
          lMat,
        );
        topCrown.position.y = trunkH + 0.95;
        topCrown.scale.set(1.2, 0.74, 1.2);
        topCrown.castShadow = true;
        felledPivot.add(topCrown);
      }

      root.add(felledPivot);
      root.scale.setScalar(scale);
      return { root, felledPivot, stumpMesh, trunkCutBand };
    }

    if (kind === 'small_stone') {
      const rockBody = new THREE.Group();
      for (let i = 0; i < 4; i++) {
        const s = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.28 + (i % 2) * 0.12, 1),
          smallStoneMat,
        );
        const a = (i / 4) * Math.PI * 2;
        s.position.set(Math.cos(a) * 0.28, 0.18, Math.sin(a) * 0.28);
        s.scale.set(1.15, 0.72, 1.0);
        s.castShadow = true;
        rockBody.add(s);
      }
      const crackMeshes = addCrackOverlays(rockBody, 0.45);
      root.add(rockBody);
      root.scale.setScalar(scale);
      return { root, rockBody, crackMeshes };
    }

    if (kind === 'stone_boulder') {
      const rockBody = new THREE.Group();
      const main = new THREE.Mesh(new THREE.DodecahedronGeometry(1.08, 1), boulderMat);
      main.scale.set(1.18, 0.82, 1.02);
      main.position.y = 0.62;
      main.castShadow = true;
      const side = new THREE.Mesh(new THREE.DodecahedronGeometry(0.58, 0), boulderMat);
      side.position.set(0.76, 0.36, 0.45);
      const chip = new THREE.Mesh(new THREE.DodecahedronGeometry(0.36, 0), smallStoneMat);
      chip.position.set(-0.72, 0.24, -0.32);
      rockBody.add(main, side, chip);
      const crackMeshes = addCrackOverlays(rockBody, 1.0);
      root.add(rockBody);
      root.scale.setScalar(scale);
      return { root, rockBody, crackMeshes };
    }

    if (kind === 'mountain_rock') {
      const rockBody = new THREE.Group();
      const peak = new THREE.Mesh(new THREE.DodecahedronGeometry(1.32, 1), mountainRockMat);
      peak.scale.set(1.15, 1.18, 1.05);
      peak.position.y = 0.92;
      peak.castShadow = true;
      const shoulder = new THREE.Mesh(new THREE.DodecahedronGeometry(0.78, 0), boulderMat);
      shoulder.position.set(-0.82, 0.48, 0.46);
      const shelf = new THREE.Mesh(new THREE.DodecahedronGeometry(0.65, 0), mountainRockMat);
      shelf.position.set(0.84, 0.42, -0.35);
      rockBody.add(peak, shoulder, shelf);
      const crackMeshes = addCrackOverlays(rockBody, 1.28);
      root.add(rockBody);
      root.scale.setScalar(scale);
      return { root, rockBody, crackMeshes };
    }

    if (kind === 'flint_outcrop') {
      const rockBody = new THREE.Group();
      const base = new THREE.Mesh(new THREE.DodecahedronGeometry(0.62, 0), boulderMat);
      base.scale.set(1.2, 0.55, 1.1);
      base.position.y = 0.24;
      rockBody.add(base);
      for (let i = 0; i < 4; i++) {
        const shard = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.92, 5), flintMat);
        shard.position.set((i - 1.5) * 0.26, 0.45, ((i % 2) - 0.5) * 0.28);
        shard.rotation.z = (i - 1.5) * 0.28;
        shard.castShadow = true;
        rockBody.add(shard);
      }
      const crackMeshes = addCrackOverlays(rockBody, 0.72);
      root.add(rockBody);
      root.scale.setScalar(scale);
      return { root, rockBody, crackMeshes };
    }

    if (kind === 'ore_vein') {
      const rockBody = new THREE.Group();
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.12, 1), oreRockMat);
      rock.scale.set(1.12, 0.86, 1.0);
      rock.position.y = 0.65;
      rock.castShadow = true;
      rockBody.add(rock);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const nugget = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), oreVeinMat);
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
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 1.35, 5), palmTrunkMat);
        b.rotation.z = Math.PI / 2;
        b.rotation.y = i * 0.65;
        b.position.y = 0.08 + i * 0.03;
        root.add(b);
      }
    } else if (kind === 'wheat_patch') {
      for (let i = 0; i < 9; i++) {
        const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.052, 1.25, 5), wheatMat);
        stalk.position.set((rand() - 0.5) * 0.95, 0.62, (rand() - 0.5) * 0.95);
        stalk.rotation.z = (rand() - 0.5) * 0.22;
        root.add(stalk);
      }
    } else if (kind === 'sugarcane_patch') {
      for (let i = 0; i < 5; i++) {
        const ox = (rand() - 0.5) * 0.65;
        const oz = (rand() - 0.5) * 0.65;
        const h = 1.55 + rand() * 0.45;
        const cane = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, h, 6), sugarcaneMat);
        cane.position.set(ox, h * 0.5, oz);
        cane.rotation.z = (rand() - 0.5) * 0.14;
        cane.castShadow = true;
        const joint = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.06, 6), sugarcaneNodeMat);
        joint.position.set(ox, h * 0.55, oz);
        const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.55, 4), sugarcaneNodeMat);
        tuft.position.set(ox, h + 0.18, oz);
        root.add(cane, joint, tuft);
      }
    } else if (kind === 'grass_tuft') {
      for (let i = 0; i < 8; i++) {
        const blade = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.85, 4), grassMat);
        blade.position.set((rand() - 0.5) * 0.6, 0.4, (rand() - 0.5) * 0.6);
        blade.rotation.z = (rand() - 0.5) * 0.35;
        root.add(blade);
      }
    } else if (kind === 'berry_bush') {
      const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(0.78, 1), berryBushMat);
      bush.position.y = 0.55;
      bush.scale.y = 0.82;
      bush.castShadow = true;
      root.add(bush);
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        const berry = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), berryFruitMat);
        berry.position.set(Math.cos(a) * 0.62, 0.55 + (i % 2) * 0.22, Math.sin(a) * 0.62);
        root.add(berry);
      }
    } else if (kind === 'mushroom_cluster') {
      for (let i = 0; i < 4; i++) {
        const mx = (i - 1.5) * 0.24;
        const mz = ((i % 2) - 0.5) * 0.26;
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.26, 6), mushroomStemMat);
        stem.position.set(mx, 0.13, mz);
        const cap = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.14, 7), mushroomCapMat);
        cap.position.set(mx, 0.28, mz);
        root.add(stem, cap);
      }
    } else if (kind === 'fiber_fern' || kind === 'plant_cluster') {
      for (let i = 0; i < 5; i++) {
        const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.25, 1.1, 4), fernMat);
        leaf.position.set(0, 0.35, 0);
        leaf.rotation.z = 0.72;
        leaf.rotation.y = (i / 5) * Math.PI * 2;
        root.add(leaf);
      }
    } else if (kind === 'clay_deposit') {
      const mound = new THREE.Mesh(new THREE.DodecahedronGeometry(0.75, 1), clayMat);
      mound.scale.set(1.3, 0.45, 1.1);
      mound.position.y = 0.22;
      root.add(mound);
    } else if (kind === 'sand_mound') {
      const mound = new THREE.Mesh(new THREE.ConeGeometry(0.95, 0.55, 10), sandMoundMat);
      mound.position.y = 0.26;
      root.add(mound);
    } else {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.85, 0.95), crateMat);
      crate.position.y = 0.425;
      crate.castShadow = true;
      root.add(crate);
    }

    root.scale.setScalar(scale);
    return { root };
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
      kind === 'banyan_tree' || kind === 'mountain_rock'
        ? 5
        : kind === 'tropical_tree' ||
            kind === 'highland_cedar' ||
            kind === 'stone_boulder' ||
            kind === 'ore_vein'
          ? 4
          : kind === 'palm_tree' || kind === 'flint_outcrop'
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

    const handle = buildNodeMesh(kind, scale);
    handle.root.position.set(x, y, z);
    handle.root.rotation.y = rand() * Math.PI * 2;
    scene.add(handle.root);
    resourceMeshes.set(id, handle.root);
    resourceHandles.set(id, handle);

    if (hasCollider) {
      const isTree =
        kind === 'palm_tree' ||
        kind === 'tropical_tree' ||
        kind === 'banyan_tree' ||
        kind === 'highland_cedar';
      colliders.push({
        x,
        z,
        radius: (isTree ? 0.32 : 0.65) * scale,
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

  // A. Dedicated Golden Wheatfield (WHEATFIELD_POS) with Wooden Fence Border & Open Gate
  const wheatY = getTerrainHeight(WHEATFIELD_POS.x, WHEATFIELD_POS.z);
  const fencePostMat = new THREE.MeshStandardMaterial({ color: 0x7c4d2b, map: woodTex, roughness: 0.88 });
  const wheatFenceGroup = new THREE.Group();
  wheatFenceGroup.position.set(WHEATFIELD_POS.x, wheatY, WHEATFIELD_POS.z);
  const wfRadius = 7.4;
  for (let side = 0; side < 4; side++) {
    for (let p = -3; p <= 3; p++) {
      // Leave generous open gate along South (+Z) and West (-X)
      if ((side === 0 || side === 3) && Math.abs(p) <= 1) continue;
      const offset = p * 2.2;
      const px = side === 0 || side === 1 ? offset : side === 2 ? wfRadius : -wfRadius;
      const pz = side === 2 || side === 3 ? offset : side === 0 ? wfRadius : -wfRadius;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 1.15, 6), fencePostMat);
      post.position.set(px, 0.56, pz);
      post.castShadow = true;
      wheatFenceGroup.add(post);
      if (p < 3) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.09, 0.09), fencePostMat);
        if (side >= 2) {
          rail.rotation.y = Math.PI / 2;
          rail.position.set(px, 0.82, pz + 1.1);
        } else {
          rail.position.set(px + 1.1, 0.82, pz);
        }
        wheatFenceGroup.add(rail);
      }
    }
  }
  scene.add(wheatFenceGroup);

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
  scene.add(farmerNpcGroup);
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
  scene.add(stallGroup);
  colliders.push({ x: FARMER_POS.x - 0.9, z: FARMER_POS.z - 1.9, radius: 0.7 });
  colliders.push({ x: FARMER_POS.x + 0.9, z: FARMER_POS.z - 1.9, radius: 0.7 });

  // 12 Tilled Wooden-Framed Crop Garden Beds right beside the Farmer & Wheatfield
  const soilPlots: { x: number; y: number; z: number }[] = [];
  const bedSoilMat = new THREE.MeshStandardMaterial({ color: 0x4a2e16, roughness: 0.96 });
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 6; col++) {
      const gx = FARMER_POS.x - 4.0 + col * 1.55;
      const gz = FARMER_POS.z + 3.2 + row * 1.85;
      const gy = getTerrainHeight(gx, gz);
      const bed = new THREE.Group();
      bed.position.set(gx, gy, gz);
      const rim = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.14, 1.32), counterMat);
      rim.position.y = 0.06;
      const dirt = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.16, 1.14), bedSoilMat);
      dirt.position.y = 0.07;
      dirt.receiveShadow = true;
      bed.add(rim, dirt);
      scene.add(bed);
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
  scene.add(hillHouse.group);
  hillHouse.colliders.forEach((hc) => colliders.push(hc));

  // E. Structured Vehicle Garage Clearing Right Beside the Shelter (VEHICLE_GARAGE_POS)
  const garageGroundY = getTerrainHeight(VEHICLE_GARAGE_POS.x, VEHICLE_GARAGE_POS.z);
  const garageGroup = new THREE.Group();
  garageGroup.position.set(VEHICLE_GARAGE_POS.x, garageGroundY, VEHICLE_GARAGE_POS.z);

  const padMat = new THREE.MeshStandardMaterial({ color: 0x4b4844, map: rockTex, roughness: 0.9 });
  const timberPostMat = new THREE.MeshStandardMaterial({ color: 0x6b4226, map: woodTex, roughness: 0.85 });
  const garageRoofMat = new THREE.MeshStandardMaterial({ color: 0x3f4c54, roughness: 0.68, metalness: 0.35 });
  const bayLineMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 0.55,
    roughness: 0.3,
  });
  const bayCyanMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.45,
    roughness: 0.3,
  });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.85 });
  const toolMetalMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.28 });

  // Leveled concrete/stone pad (14.5m x 10.6m)
  const garagePad = new THREE.Mesh(new THREE.BoxGeometry(14.5, 0.16, 10.6), padMat);
  garagePad.position.set(0, 0.04, 0);
  garagePad.receiveShadow = true;
  garageGroup.add(garagePad);

  // Dual illuminated parking bay guides (Bay A: x = -3.1, Bay B: x = +3.1)
  [-3.1, 3.1].forEach((bx, bayIdx) => {
    const lineMat = bayIdx === 0 ? bayLineMat : bayCyanMat;
    [-2.2, 2.2].forEach((sideOffset) => {
      const sideLine = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, 6.2), lineMat);
      sideLine.position.set(bx + sideOffset, 0.135, 0.4);
      garageGroup.add(sideLine);
    });
    const backStop = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.14, 0.26), lineMat);
    backStop.position.set(bx, 0.18, -2.7);
    garageGroup.add(backStop);
  });

  // Heavy Timber Canopy Pillars & Open Drive-In Archway
  const postPositions: [number, number][] = [
    [-6.6, -4.6],
    [0, -4.6],
    [6.6, -4.6],
    [-6.6, 4.6],
    [6.6, 4.6],
  ];
  postPositions.forEach(([px, pz]) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.32, 4.2, 0.32), timberPostMat);
    post.position.set(px, 2.15, pz);
    post.castShadow = true;
    garageGroup.add(post);
    colliders.push({
      x: VEHICLE_GARAGE_POS.x + px,
      z: VEHICLE_GARAGE_POS.z + pz,
      radius: 0.34,
    });
  });

  // Top beams + angled canopy roof (open front driveway facing South +Z)
  const frontBeam = new THREE.Mesh(new THREE.BoxGeometry(13.8, 0.35, 0.35), timberPostMat);
  frontBeam.position.set(0, 4.15, 4.6);
  const backBeam = new THREE.Mesh(new THREE.BoxGeometry(13.8, 0.35, 0.35), timberPostMat);
  backBeam.position.set(0, 4.15, -4.6);
  const sideBeamL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 9.6), timberPostMat);
  sideBeamL.position.set(-6.6, 4.15, 0);
  const sideBeamR = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 9.6), timberPostMat);
  sideBeamR.position.set(6.6, 4.15, 0);
  const canopyRoof = new THREE.Mesh(new THREE.BoxGeometry(14.8, 0.18, 10.6), garageRoofMat);
  canopyRoof.position.set(0, 4.55, 0);
  canopyRoof.rotation.x = -0.08;
  canopyRoof.castShadow = true;
  canopyRoof.receiveShadow = true;
  garageGroup.add(frontBeam, backBeam, sideBeamL, sideBeamR, canopyRoof);

  // Warm overhead garage work light
  const garageLight = new THREE.PointLight(0xffedd5, 1.5, 22, 1.35);
  garageLight.position.set(0, 3.85, 0.4);
  garageGroup.add(garageLight);

  // Interactive Mechanic Repair & Crafting Workbench at center-north (-33, 85.9)
  const benchGroup = new THREE.Group();
  benchGroup.position.set(0, 0.12, -4.0);
  const benchTable = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.92, 1.0), timberPostMat);
  benchTable.position.y = 0.46;
  benchTable.castShadow = true;
  const benchVise = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.28, 0.35), toolMetalMat);
  benchVise.position.set(-0.75, 1.05, 0.15);
  const benchLamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xf59e0b, emissiveIntensity: 1.0 }),
  );
  benchLamp.position.set(0.85, 1.18, -0.2);
  benchGroup.add(benchTable, benchVise, benchLamp);
  garageGroup.add(benchGroup);
  colliders.push({
    x: VEHICLE_GARAGE_POS.x,
    z: VEHICLE_GARAGE_POS.z - 4.0,
    radius: 0.85,
  });

  // Spare Tires & Fuel Cans neatly stacked in West corner
  for (let t = 0; t < 3; t++) {
    const tire = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.13, 8, 14), tireMat);
    tire.rotation.x = Math.PI / 2;
    tire.position.set(-5.6, 0.24 + t * 0.24, -3.7);
    tire.castShadow = true;
    garageGroup.add(tire);
  }
  const fuelCanMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.45, metalness: 0.25 });
  [-4.6, -4.15].forEach((fx) => {
    const can = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.56, 0.24), fuelCanMat);
    can.position.set(fx, 0.4, -4.0);
    can.castShadow = true;
    garageGroup.add(can);
  });

  scene.add(garageGroup);

  const garagePos = new THREE.Vector3(VEHICLE_GARAGE_POS.x, garageGroundY, VEHICLE_GARAGE_POS.z);
  const garageBenchPos = new THREE.Vector3(
    VEHICLE_GARAGE_POS.x,
    garageGroundY + 0.12,
    VEHICLE_GARAGE_POS.z - 4.0,
  );

  // Base Armory Supply Chest tucked neatly beside the Vehicle Garage
  const armoryX = VEHICLE_GARAGE_POS.x + 5.6;
  const armoryZ = VEHICLE_GARAGE_POS.z - 3.2;
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

  // Cleanly zoned biome resource scatter (wide-open grassy prairies, clean sandy beaches, dense forests)
  let count = 0;
  for (let attempt = 0; attempt < 1100 && count < 185; attempt++) {
    const angle = rand() * Math.PI * 2;
    const rad = 16 + Math.sqrt(rand()) * 114;
    const x = Math.cos(angle) * rad;
    const z = Math.sin(angle) * rad;

    if (Math.hypot(x, z - 112) < 16) continue;
    if (z >= 114 && Math.abs(x) < 28) continue; // Keep shipwreck shoreline corridor clean
    if (Math.hypot(x - EXPEDITION_POS.x, z - EXPEDITION_POS.z) < 9) continue;
    if (Math.hypot(x - CAVE_POS.x, z - CAVE_POS.z) < 9) continue;
    if (Math.hypot(x - HOMESTEAD_POS.x, z - HOMESTEAD_POS.z) < 20) continue;
    if (Math.hypot(x - WHEATFIELD_POS.x, z - WHEATFIELD_POS.z) < 11.5) continue;
    if (Math.hypot(x - FARMER_POS.x, z - FARMER_POS.z) < 10.5) continue;
    if (Math.hypot(x - HILL_HOUSE_POS.x, z - HILL_HOUSE_POS.z) < 16.5) continue;
    if (Math.hypot(x - VEHICLE_GARAGE_POS.x, z - VEHICLE_GARAGE_POS.z) < 15.5) continue;
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

    const h = getTerrainHeight(x, z);
    const slope = getTerrainSlope(x, z);
    const biome = getBiomeAt(x, z);
    const river = getRiverSample(x, z);

    if (h < 0.35 || slope > 0.72) continue;
    if (biome === 'lake' && h < LAKE_CENTER.waterY + 0.1) continue;
    if (river.inRiver && h < river.waterY + 0.1) continue;

    // Wide-open breathable spacing in grasslands & beaches; natural groves in forest/mountain
    const minDistSq = biome === 'grassland' || biome === 'beach' ? 72 : 28;
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
    } else if (biome === 'river' || (river.dist < 10.5 && river.dist > 5.5)) {
      const r = rand();
      kind = r < 0.52 ? 'clay_deposit' : r < 0.85 ? 'plant_cluster' : 'small_stone';
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
      // Open grassy savanna: tall wheat, grass tufts, occasional berry bush or palm (no boulder/branch clutter)
      kind =
        r < 0.42
          ? 'wheat_patch'
          : r < 0.74
            ? 'grass_tuft'
            : r < 0.88
              ? 'berry_bush'
              : 'palm_tree';
    } else if (biome === 'forest') {
      const r = rand();
      kind =
        r < 0.3
          ? 'tropical_tree'
          : r < 0.45
            ? 'banyan_tree'
            : r < 0.56
              ? 'highland_cedar'
              : r < 0.7
                ? 'fiber_fern'
                : r < 0.82
                  ? 'berry_bush'
                  : r < 0.91
                    ? 'mushroom_cluster'
                    : 'plant_cluster';
    }

    if (!kind) continue;
    const isSolid =
      kind === 'palm_tree' ||
      kind === 'tropical_tree' ||
      kind === 'banyan_tree' ||
      kind === 'highland_cedar' ||
      kind === 'stone_boulder' ||
      kind === 'mountain_rock' ||
      kind === 'ore_vein';
    addResourceNode(`node_${count}`, kind, x, z, 0.88 + rand() * 0.3, isSolid);
    count++;
  }

  // 10. Performance-Friendly Instanced Ambient Grass & Minimal River/Mountain Pebbles (clean beaches & fields)
  const grassCount = 260;
  const grassBladeGeo = new THREE.ConeGeometry(0.11, 0.55, 4);
  grassBladeGeo.translate(0, 0.27, 0);
  const ambientGrassMat = new THREE.MeshStandardMaterial({ color: 0x4d7c0f, roughness: 0.9 });
  const grassInstanced = new THREE.InstancedMesh(grassBladeGeo, ambientGrassMat, grassCount);
  const pebbleCount = 75;
  const pebbleGeo = new THREE.DodecahedronGeometry(0.14, 0);
  const pebbleInstanced = new THREE.InstancedMesh(pebbleGeo, smallStoneMat, pebbleCount);

  const dummy = new THREE.Object3D();
  const tintColor = new THREE.Color();
  let gPlaced = 0;
  let pPlaced = 0;

  for (let i = 0; i < 950 && (gPlaced < grassCount || pPlaced < pebbleCount); i++) {
    const a = rand() * Math.PI * 2;
    const rad = 10 + Math.sqrt(rand()) * 118;
    const px = Math.cos(a) * rad;
    const pz = Math.sin(a) * rad;
    const py = getTerrainHeight(px, pz);
    const biome = getBiomeAt(px, pz);
    if (py < 0.4) continue;
    if (Math.hypot(px - SNOWY_WOODLAND_POS.x, pz - SNOWY_WOODLAND_POS.z) < 14) continue;
    if (Math.hypot(px - AUTUMN_GROVE_POS.x, pz - AUTUMN_GROVE_POS.z) < 11) continue;
    if (Math.hypot(px - SWAMP_POS.x, pz - SWAMP_POS.z) < SWAMP_POS.radius + 2.5) continue;
    if (Math.hypot(px - WHEATFIELD_POS.x, pz - WHEATFIELD_POS.z) < 9.0) continue;
    if (Math.hypot(px - FARMER_POS.x, pz - FARMER_POS.z) < 8.5) continue;
    if (Math.hypot(px - HILL_HOUSE_POS.x, pz - HILL_HOUSE_POS.z) < 16.5) continue;
    if (
      px >= HILL_HOUSE_POS.x + 3 &&
      px <= HILL_HOUSE_POS.x + 23 &&
      Math.abs(pz - HILL_HOUSE_POS.z) < 5.5
    ) {
      continue;
    }
    if (Math.hypot(px - VEHICLE_GARAGE_POS.x, pz - VEHICLE_GARAGE_POS.z) < 14.0) continue;

    if (gPlaced < grassCount && (biome === 'forest' || biome === 'grassland')) {
      dummy.position.set(px, py, pz);
      dummy.rotation.set((rand() - 0.5) * 0.25, rand() * Math.PI * 2, (rand() - 0.5) * 0.25);
      const sc = 0.75 + rand() * 0.7;
      dummy.scale.set(sc, sc * (0.8 + rand() * 0.6), sc);
      dummy.updateMatrix();
      grassInstanced.setMatrixAt(gPlaced, dummy.matrix);
      tintColor.setHex(biome === 'grassland' ? 0x84a93c : 0x3f7a2c).offsetHSL(0, 0, (rand() - 0.5) * 0.08);
      grassInstanced.setColorAt(gPlaced, tintColor);
      gPlaced++;
    } else if (pPlaced < pebbleCount && biome === 'river') {
      dummy.position.set(px, py + 0.04, pz);
      dummy.rotation.set(rand() * 2, rand() * 3, rand() * 2);
      const sc = 0.6 + rand() * 0.95;
      dummy.scale.set(sc * 1.2, sc * 0.65, sc);
      dummy.updateMatrix();
      pebbleInstanced.setMatrixAt(pPlaced, dummy.matrix);
      pPlaced++;
    }
  }
  grassInstanced.count = gPlaced;
  grassInstanced.instanceMatrix.needsUpdate = true;
  if (grassInstanced.instanceColor) grassInstanced.instanceColor.needsUpdate = true;
  grassInstanced.computeBoundingSphere();
  scene.add(grassInstanced);

  pebbleInstanced.count = pPlaced;
  pebbleInstanced.instanceMatrix.needsUpdate = true;
  pebbleInstanced.computeBoundingSphere();
  scene.add(pebbleInstanced);

  return {
    terrainMesh,
    baseTerrainColors,
    oceanMesh,
    lakeMesh,
    waterfallStreams,
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
    soilPlots,
    houseStations: hillHouse.stations,
    tvScreenMat: hillHouse.tvScreenMat,
    tvScreenMesh: hillHouse.tvScreenMesh,
    tvWorldPos: new THREE.Vector3(HILL_HOUSE_POS.x + 1.4, HILL_HOUSE_Y + 1.24, HILL_HOUSE_POS.z + 0.41),
    hillHousePos: new THREE.Vector3(HILL_HOUSE_POS.x, HILL_HOUSE_Y, HILL_HOUSE_POS.z),
    garagePos,
    garageBenchPos,
    armoryChest,
    wheatfieldPos: new THREE.Vector3(WHEATFIELD_POS.x, wheatY, WHEATFIELD_POS.z),
    caveCeilings,
    shipwreckChests,
  };
}
