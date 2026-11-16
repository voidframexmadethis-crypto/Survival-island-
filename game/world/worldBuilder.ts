import * as THREE from 'three';
import { ResourceNodeKind, ResourceNodeState } from '../types';
import {
  CAVE_POS,
  EXPEDITION_POS,
  LAKE_CENTER,
  OCEAN_LEVEL,
  WATERFALL_POS,
  getBiomeAt,
  getRiverSample,
  getTerrainHeight,
  getTerrainSlope,
} from './terrain';
import {
  createBarkTexture,
  createGroundDetailTexture,
  createLeafCanopyTexture,
  createRockTexture,
  createWaterNormalTexture,
  createWoodPlankTexture,
} from './textures';

export interface ResourceVisualHandle {
  root: THREE.Group;
  felledPivot?: THREE.Group;
  stumpMesh?: THREE.Group;
  trunkCutBand?: THREE.Mesh;
  crackMeshes?: THREE.Mesh[];
  rockBody?: THREE.Group;
}

export interface WorldHandles {
  terrainMesh: THREE.Mesh;
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
  const terrainSize = 360;
  const segs = 150;
  const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, segs, segs);
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

    if (y < -0.3) {
      c.setHex(0x1e6b7b);
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

  // 6. Shipwreck Debris along the Southern Shoreline (near spawn 0, 112)
  const colliders: { x: number; z: number; radius: number; nodeId?: string }[] = [];
  const wreckMat = new THREE.MeshStandardMaterial({
    color: 0x4b3320,
    map: woodTex,
    roughness: 0.9,
  });
  const wreckGroup = new THREE.Group();
  const hullX = -11;
  const hullZ = 126;
  const hullY = getTerrainHeight(hullX, hullZ);
  wreckGroup.position.set(hullX, hullY + 0.3, hullZ);
  wreckGroup.rotation.set(0.18, 0.62, -0.28);

  const shatteredHull = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.2, 8.8), wreckMat);
  shatteredHull.castShadow = true;
  const snappedMast = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 6.2, 7), wreckMat);
  snappedMast.position.set(0.4, 2.4, -1.2);
  snappedMast.rotation.z = 0.55;
  wreckGroup.add(shatteredHull, snappedMast);
  scene.add(wreckGroup);
  colliders.push({ x: hullX, z: hullZ, radius: 3.4 });

  // Scattered splintered wooden planks, barrels, and ship fragments along the beach
  const debrisSpots: [number, number, number][] = [
    [-4.5, 118, 0.4],
    [4.2, 120, -0.7],
    [11.5, 123, 1.1],
    [-16.0, 119, -0.3],
    [1.8, 125, 0.9],
  ];
  debrisSpots.forEach(([dx, dz, rot]) => {
    const dy = getTerrainHeight(dx, dz);
    const plank = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.08, 2.4), wreckMat);
    plank.position.set(dx, Math.max(OCEAN_LEVEL + 0.05, dy + 0.06), dz);
    plank.rotation.y = rot;
    scene.add(plank);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.78, 9), wreckMat);
    barrel.position.set(dx + 0.8, Math.max(OCEAN_LEVEL + 0.15, dy + 0.35), dz + 0.5);
    barrel.rotation.z = Math.PI / 2.6;
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
  const caveLight = new THREE.PointLight(0x38bdf8, 2.2, 14, 1.5);
  caveLight.position.set(0, 2.6, -1.8);
  caveGroup.add(caveLight);
  scene.add(caveGroup);
  colliders.push({ x: CAVE_POS.x - 4.2, z: CAVE_POS.z, radius: 2.2 });
  colliders.push({ x: CAVE_POS.x + 4.2, z: CAVE_POS.z, radius: 2.2 });
  colliders.push({ x: CAVE_POS.x, z: CAVE_POS.z - 4.8, radius: 3.0 });

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
      for (let i = 0; i < 7; i++) {
        const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 1.15, 5), wheatMat);
        stalk.position.set((rand() - 0.5) * 0.9, 0.56, (rand() - 0.5) * 0.9);
        stalk.rotation.z = (rand() - 0.5) * 0.25;
        root.add(stalk);
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
      colliders.push({ x, z, radius: 0.65 * scale, nodeId: id });
    }
  }

  // Shipwreck Crates along the Southern Landing Beach
  [
    [-3.8, 114.5],
    [5.6, 116.2],
    [-8.5, 120.0],
    [9.8, 121.0],
  ].forEach(([cx, cz], idx) => {
    addResourceNode(`shipwreck_crate_${idx}`, 'shipwreck_crate', cx, cz, 1.0, true);
  });

  // Starter beach & forest-edge resources
  const starterResources: [ResourceNodeKind, number, number][] = [
    ['palm_tree', -6, 102],
    ['palm_tree', 8, 100],
    ['palm_tree', -14, 96],
    ['tropical_tree', 14, 93],
    ['banyan_tree', -16, 86],
    ['branch_pile', -3, 106],
    ['branch_pile', 5, 108],
    ['sand_mound', -12, 113],
    ['sand_mound', 12, 114],
    ['small_stone', -2.5, 104.5],
    ['small_stone', 4.5, 103.5],
    ['stone_boulder', 12, 103],
    ['stone_boulder', -11, 101],
    ['flint_outcrop', 6, 104],
    ['fiber_fern', 3, 97],
    ['grass_tuft', -5, 95],
    ['berry_bush', 1, 93],
    ['mushroom_cluster', 9, 91],
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

  // Scatter biome-accurate resource nodes across the island
  let count = 0;
  for (let attempt = 0; attempt < 1150 && count < 275; attempt++) {
    const angle = rand() * Math.PI * 2;
    const rad = 14 + Math.sqrt(rand()) * 116;
    const x = Math.cos(angle) * rad;
    const z = Math.sin(angle) * rad;

    if (Math.hypot(x, z - 112) < 12) continue;
    if (Math.hypot(x - EXPEDITION_POS.x, z - EXPEDITION_POS.z) < 9) continue;
    if (Math.hypot(x - CAVE_POS.x, z - CAVE_POS.z) < 9) continue;

    const h = getTerrainHeight(x, z);
    const slope = getTerrainSlope(x, z);
    const biome = getBiomeAt(x, z);
    const river = getRiverSample(x, z);

    if (h < 0.35 || slope > 0.72) continue;
    if (biome === 'lake' && h < LAKE_CENTER.waterY + 0.1) continue;
    if (river.inRiver && h < river.waterY + 0.1) continue;

    let tooClose = false;
    for (let i = 0; i < resourceNodes.length; i++) {
      const n = resourceNodes[i];
      if ((n.x - x) * (n.x - x) + (n.z - z) * (n.z - z) < 17) {
        tooClose = true;
        break;
      }
    }
    if (tooClose) continue;

    let kind: ResourceNodeKind | null = null;
    if (biome === 'beach') {
      const r = rand();
      kind =
        r < 0.36
          ? 'palm_tree'
          : r < 0.54
            ? 'small_stone'
            : r < 0.72
              ? 'sand_mound'
              : r < 0.88
                ? 'branch_pile'
                : 'stone_boulder';
    } else if (biome === 'river' || (river.dist < 10.5 && river.dist > 5.5)) {
      const r = rand();
      kind = r < 0.45 ? 'clay_deposit' : r < 0.75 ? 'plant_cluster' : 'small_stone';
    } else if (biome === 'mountain') {
      const r = rand();
      kind =
        r < 0.28
          ? 'ore_vein'
          : r < 0.54
            ? 'mountain_rock'
            : r < 0.74
              ? 'stone_boulder'
              : r < 0.88
                ? 'flint_outcrop'
                : 'highland_cedar';
    } else if (biome === 'grassland') {
      const r = rand();
      kind =
        r < 0.3
          ? 'wheat_patch'
          : r < 0.5
            ? 'grass_tuft'
            : r < 0.68
              ? 'berry_bush'
              : r < 0.82
                ? 'small_stone'
                : r < 0.92
                  ? 'stone_boulder'
                  : 'palm_tree';
    } else if (biome === 'forest') {
      const r = rand();
      kind =
        r < 0.25
          ? 'tropical_tree'
          : r < 0.38
            ? 'banyan_tree'
            : r < 0.48
              ? 'highland_cedar'
              : r < 0.6
                ? 'fiber_fern'
                : r < 0.72
                  ? 'berry_bush'
                  : r < 0.82
                    ? 'mushroom_cluster'
                    : r < 0.92
                      ? 'plant_cluster'
                      : 'branch_pile';
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

  // 10. Performance-Friendly Instanced Ambient Grass & Pebble Ground Detail (2 draw calls total)
  const grassCount = 320;
  const grassBladeGeo = new THREE.ConeGeometry(0.11, 0.55, 4);
  grassBladeGeo.translate(0, 0.27, 0);
  const ambientGrassMat = new THREE.MeshStandardMaterial({ color: 0x4d7c0f, roughness: 0.9 });
  const grassInstanced = new THREE.InstancedMesh(grassBladeGeo, ambientGrassMat, grassCount);
  const pebbleCount = 160;
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
    } else if (pPlaced < pebbleCount && (biome === 'beach' || biome === 'mountain' || biome === 'river')) {
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
  };
}
