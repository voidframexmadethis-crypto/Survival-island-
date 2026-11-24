import * as THREE from 'three';
import { roundedBox } from './roundedBox';
import { getPolishedConcretePbr } from './textures';
import { CUSTOM_SHOP_POS, CUSTOM_SHOP_Y, getTerrainHeight } from './terrain';
import {
  CUSTOM_SHOP_WORKERS,
  JUNKYARD_CAVE,
  type CustomShopWorkerId,
} from '../systems/customCarShop';

export interface CustomShopWorkerHandle {
  id: CustomShopWorkerId;
  name: string;
  role: string;
  group: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  head: THREE.Group;
  baseX: number;
  baseZ: number;
  baseY: number;
  phase: number;
}

export interface CustomCarShopHandles {
  group: THREE.Group;
  groundY: number;
  position: THREE.Vector3;
  bayPosition: THREE.Vector3;
  cavePosition: THREE.Vector3;
  workers: CustomShopWorkerHandle[];
  towTruck: THREE.Group;
  towDonor: THREE.Group;
  liftCar: THREE.Group;
  liftPlatform: THREE.Group;
  setStatus: (headline: string, detail: string, progress: number) => void;
}

export interface CustomShopCollider {
  x: number;
  z: number;
  radius: number;
  minY?: number;
  maxY?: number;
}

function makeCanvas(
  width: number,
  height: number,
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  return ctx ? { canvas, ctx } : null;
}

function shopSignTexture(): THREE.CanvasTexture | null {
  const made = makeCanvas(2048, 512);
  if (!made) return null;
  const { canvas, ctx } = made;
  ctx.fillStyle = '#101817';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#c08a3e';
  ctx.lineWidth = 18;
  ctx.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f2dfb2';
  ctx.shadowColor = '#d78c37';
  ctx.shadowBlur = 26;
  ctx.font = '700 142px Georgia, serif';
  ctx.fillText('BAYOU ROYAL', 1024, 205);
  ctx.font = '700 92px Georgia, serif';
  ctx.fillStyle = '#e3b35d';
  ctx.fillText('CUSTOMS', 1024, 305);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#b9c7c3';
  ctx.font = '500 45px Arial, sans-serif';
  ctx.fillText('CAVE SALVAGE  •  RESTORATION  •  DONK BUILDS', 1024, 398);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function yardSignTexture(): THREE.CanvasTexture | null {
  const made = makeCanvas(1536, 512);
  if (!made) return null;
  const { canvas, ctx } = made;
  ctx.fillStyle = '#26231c';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#a1622f';
  ctx.lineWidth = 16;
  ctx.strokeRect(16, 16, canvas.width - 32, canvas.height - 32);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f1d18b';
  ctx.font = '700 110px Georgia, serif';
  ctx.fillText('CAVE 12 SALVAGE', 768, 188);
  ctx.fillStyle = '#d7b37a';
  ctx.font = '700 67px Arial, sans-serif';
  ctx.fillText('DONOR CARS  •  PARTS  •  NO TITLE NEEDED', 768, 304);
  ctx.fillStyle = '#8f9d96';
  ctx.font = '500 44px Arial, sans-serif';
  ctx.fillText('BAYOU ROYAL CUSTOMS PICKUP POINT', 768, 405);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function checkerTexture(): THREE.CanvasTexture | null {
  const made = makeCanvas(256, 256);
  if (!made) return null;
  const { canvas, ctx } = made;
  const cell = 32;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? '#2c2d31' : '#4b4740';
      ctx.fillRect(x * cell, y * cell, cell, cell);
    }
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.28)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 8; i++) {
    ctx.beginPath();
    ctx.moveTo(i * cell, 0);
    ctx.lineTo(i * cell, 256);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * cell);
    ctx.lineTo(256, i * cell);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  return texture;
}

function addShadow(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.castShadow = true;
    child.receiveShadow = true;
  });
}

function buildWorker(
  id: CustomShopWorkerId,
  name: string,
  role: string,
  uniformColor: number,
  accentColor: number,
  skinColor: number,
  localX: number,
  localZ: number,
  phase: number,
): CustomShopWorkerHandle {
  const uniform = new THREE.MeshStandardMaterial({
    color: uniformColor,
    roughness: 0.72,
    metalness: 0.04,
  });
  const accent = new THREE.MeshStandardMaterial({
    color: accentColor,
    roughness: 0.58,
    metalness: 0.08,
  });
  const denim = new THREE.MeshStandardMaterial({ color: 0x263340, roughness: 0.9 });
  const skin = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.72 });
  const bootMat = new THREE.MeshStandardMaterial({ color: 0x1b1917, roughness: 0.62 });
  const chrome = new THREE.MeshStandardMaterial({
    color: 0xd6d3ca,
    roughness: 0.22,
    metalness: 0.9,
  });

  const group = new THREE.Group();
  group.name = `custom-shop-${id}`;

  const legL = new THREE.Group();
  legL.position.set(-0.14, 0.42, 0);
  const legLMesh = new THREE.Mesh(roundedBox(0.22, 0.66, 0.25, 0.035), denim);
  legLMesh.position.y = -0.33;
  const bootL = new THREE.Mesh(roundedBox(0.24, 0.18, 0.38, 0.04), bootMat);
  bootL.position.set(0, -0.68, 0.06);
  legL.add(legLMesh, bootL);

  const legR = new THREE.Group();
  legR.position.set(0.14, 0.42, 0);
  const legRMesh = legLMesh.clone();
  const bootR = bootL.clone();
  legR.add(legRMesh, bootR);

  const torso = new THREE.Mesh(roundedBox(0.56, 0.66, 0.32, 0.07), uniform);
  torso.position.y = 1.02;
  const apron = new THREE.Mesh(roundedBox(0.5, 0.48, 0.035, 0.025), accent);
  apron.position.set(0, 0.98, 0.175);
  const belt = new THREE.Mesh(roundedBox(0.58, 0.09, 0.34, 0.025), bootMat);
  belt.position.y = 0.72;

  const head = new THREE.Group();
  head.position.y = 1.53;
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.19, 14, 12), skin);
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.21, 0.13, 14),
    accent,
  );
  cap.position.y = 0.12;
  const brim = new THREE.Mesh(roundedBox(0.32, 0.035, 0.19, 0.015), accent);
  brim.position.set(0, 0.07, 0.19);
  head.add(face, cap, brim);
  if (id === 'duke') {
    const beard = new THREE.Mesh(
      new THREE.ConeGeometry(0.16, 0.22, 10),
      new THREE.MeshStandardMaterial({ color: 0x4c3727, roughness: 0.92 }),
    );
    beard.rotation.x = Math.PI;
    beard.position.set(0, -0.14, 0.035);
    head.add(beard);
  } else {
    const ponytail = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.075, 0.42, 8),
      new THREE.MeshStandardMaterial({ color: 0x3b2419, roughness: 0.9 }),
    );
    ponytail.position.set(0, -0.06, -0.2);
    head.add(ponytail);
  }

  const armL = new THREE.Group();
  armL.position.set(-0.34, 1.25, 0);
  const armLMesh = new THREE.Mesh(roundedBox(0.15, 0.56, 0.16, 0.04), uniform);
  armLMesh.position.y = -0.26;
  armL.add(armLMesh);

  const armR = new THREE.Group();
  armR.position.set(0.34, 1.25, 0);
  const armRMesh = armLMesh.clone();
  const tool =
    id === 'duke'
      ? new THREE.Mesh(roundedBox(0.1, 0.18, 0.3, 0.02), chrome)
      : new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.42, 8), chrome);
  if (id === 'duke') {
    tool.position.set(0, -0.56, 0.2);
    tool.rotation.x = -0.25;
  } else {
    tool.position.set(0, -0.6, 0.12);
    tool.rotation.z = 0.65;
  }
  armR.add(armRMesh, tool);

  group.add(legL, legR, torso, apron, belt, head, armL, armR);
  group.position.set(localX, 0.37, localZ);
  group.traverse((object) => {
    object.userData.noStaticMerge = true;
    object.userData.dynamic = true;
    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.receiveShadow = false;
    }
  });

  return {
    id,
    name,
    role,
    group,
    armL,
    armR,
    head,
    baseX: localX,
    baseZ: localZ,
    baseY: 0.37,
    phase,
  };
}

function buildJunkShell(
  bodyMat: THREE.MeshStandardMaterial,
  rustMat: THREE.MeshStandardMaterial,
  glassMat: THREE.MeshStandardMaterial,
  tireMat: THREE.MeshStandardMaterial,
  withWheels = true,
): THREE.Group {
  const group = new THREE.Group();
  const body = new THREE.Mesh(roundedBox(1.9, 0.55, 4.4, 0.12), bodyMat);
  body.position.y = 0.62;
  const roof = new THREE.Mesh(roundedBox(1.55, 0.5, 2.1, 0.1), bodyMat);
  roof.position.set(0, 1.04, -0.25);
  const hood = new THREE.Mesh(roundedBox(1.65, 0.15, 1.2, 0.06), rustMat);
  hood.position.set(0, 0.91, 1.3);
  const trunk = new THREE.Mesh(roundedBox(1.65, 0.12, 0.9, 0.05), rustMat);
  trunk.position.set(0, 0.9, -1.55);
  const windshield = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.46), glassMat);
  windshield.position.set(0, 1.13, 0.89);
  windshield.rotation.x = -0.42;
  const rearGlass = windshield.clone();
  rearGlass.position.set(0, 1.12, -1.16);
  rearGlass.rotation.x = Math.PI + 0.4;
  const rustPatch = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.38), rustMat);
  rustPatch.position.set(-0.96, 0.64, 0.2);
  rustPatch.rotation.y = -Math.PI / 2;
  const rustPatch2 = rustPatch.clone();
  rustPatch2.position.set(0.96, 0.7, -1.1);
  rustPatch2.rotation.y = Math.PI / 2;
  group.add(body, roof, hood, trunk, windshield, rearGlass, rustPatch, rustPatch2);

  if (withWheels) {
    [1.35, -1.35].forEach((z) => {
      [-0.92, 0.92].forEach((x) => {
        const tire = new THREE.Mesh(
          new THREE.CylinderGeometry(0.38, 0.38, 0.24, 16),
          tireMat,
        );
        tire.rotation.z = Math.PI / 2;
        tire.position.set(x, 0.37, z);
        group.add(tire);
      });
    });
  } else {
    const axle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 1.9, 8),
      rustMat,
    );
    axle.rotation.z = Math.PI / 2;
    axle.position.y = 0.26;
    group.add(axle);
  }
  return group;
}

function buildTowTruck(
  blackMat: THREE.MeshStandardMaterial,
  creamMat: THREE.MeshStandardMaterial,
  chromeMat: THREE.MeshStandardMaterial,
  glassMat: THREE.MeshStandardMaterial,
  tireMat: THREE.MeshStandardMaterial,
  amberMat: THREE.MeshStandardMaterial,
): { truck: THREE.Group; donor: THREE.Group } {
  const truck = new THREE.Group();
  truck.name = 'bayou-royal-tow-truck';

  const frame = new THREE.Mesh(roundedBox(2.2, 0.32, 6.3, 0.08), blackMat);
  frame.position.y = 0.65;
  const cab = new THREE.Mesh(roundedBox(2.1, 1.5, 2.1, 0.13), creamMat);
  cab.position.set(0, 1.5, 1.65);
  const hood = new THREE.Mesh(roundedBox(2.0, 0.62, 1.2, 0.1), creamMat);
  hood.position.set(0, 1.18, 3.2);
  const grille = new THREE.Mesh(roundedBox(1.6, 0.4, 0.08, 0.03), chromeMat);
  grille.position.set(0, 1.07, 3.82);
  const windshield = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.62), glassMat);
  windshield.position.set(0, 1.8, 2.62);
  windshield.rotation.x = -0.18;
  const sideGlass = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.56), glassMat);
  sideGlass.position.set(-1.055, 1.78, 1.55);
  sideGlass.rotation.y = -Math.PI / 2;
  const sideGlassR = sideGlass.clone();
  sideGlassR.position.x = 1.055;
  sideGlassR.rotation.y = Math.PI / 2;
  [-0.48, 0.48].forEach((x, index) => {
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 10, 8),
      new THREE.MeshStandardMaterial({
        color: index === 0 ? 0x7a4f37 : 0x5c3827,
        roughness: 0.78,
      }),
    );
    head.position.set(x, 1.88, 1.62);
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.17, 0.18, 0.1, 10),
      new THREE.MeshStandardMaterial({
        color: index === 0 ? 0xd6a34a : 0xe7c07a,
        roughness: 0.62,
      }),
    );
    cap.position.set(x, 1.99, 1.62);
    truck.add(head, cap);
  });
  const bed = new THREE.Mesh(roundedBox(2.25, 0.22, 3.5, 0.05), blackMat);
  bed.position.set(0, 1.0, -1.65);
  const bedRailL = new THREE.Mesh(roundedBox(0.08, 0.36, 3.5, 0.025), chromeMat);
  bedRailL.position.set(-1.08, 1.2, -1.65);
  const bedRailR = bedRailL.clone();
  bedRailR.position.x = 1.08;
  const boomBase = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.5, 8), chromeMat);
  boomBase.position.set(0, 1.3, -2.9);
  const boom = new THREE.Mesh(roundedBox(0.12, 0.12, 2.2, 0.03), chromeMat);
  boom.position.set(0, 2.0, -2.7);
  boom.rotation.x = -0.55;
  const winch = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.5, 10), blackMat);
  winch.rotation.z = Math.PI / 2;
  winch.position.set(0, 1.25, -2.4);
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.16, 10), amberMat);
  beacon.position.set(-0.55, 2.34, 1.6);
  const beacon2 = beacon.clone();
  beacon2.position.x = 0.55;
  truck.add(
    frame,
    cab,
    hood,
    grille,
    windshield,
    sideGlass,
    sideGlassR,
    bed,
    bedRailL,
    bedRailR,
    boomBase,
    boom,
    winch,
    beacon,
    beacon2,
  );

  const bumper = new THREE.Mesh(roundedBox(2.35, 0.2, 0.22, 0.04), chromeMat);
  bumper.position.set(0, 0.55, 3.9);
  truck.add(bumper);

  [2.3, -2.3].forEach((z) => {
    [-1.02, 1.02].forEach((x) => {
      const tire = new THREE.Mesh(
        new THREE.CylinderGeometry(0.46, 0.46, 0.3, 18),
        tireMat,
      );
      tire.rotation.z = Math.PI / 2;
      tire.position.set(x, 0.48, z);
      truck.add(tire);
      const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.2, 0.32, 12),
        chromeMat,
      );
      hub.rotation.z = Math.PI / 2;
      hub.position.set(x, 0.48, z);
      truck.add(hub);
    });
  });

  // Simple signboard on the doors.
  const doorSign = new THREE.Mesh(
    new THREE.PlaneGeometry(1.05, 0.35),
    new THREE.MeshStandardMaterial({
      color: 0x16302c,
      emissive: 0x0b1c19,
      emissiveIntensity: 0.2,
      roughness: 0.6,
    }),
  );
  doorSign.position.set(-1.06, 1.5, 1.25);
  doorSign.rotation.y = -Math.PI / 2;
  const doorSignR = doorSign.clone();
  doorSignR.position.x = 1.06;
  doorSignR.rotation.y = Math.PI / 2;
  truck.add(doorSign, doorSignR);
  addShadow(truck);

  const donor = buildJunkShell(
    new THREE.MeshStandardMaterial({ color: 0x5b463a, roughness: 0.95 }),
    new THREE.MeshStandardMaterial({ color: 0x8a4b2d, roughness: 0.98 }),
    new THREE.MeshStandardMaterial({
      color: 0x40545a,
      transparent: true,
      opacity: 0.48,
      roughness: 0.35,
    }),
    tireMat,
    false,
  );
  donor.scale.setScalar(0.82);
  donor.position.set(0, 1.25, -1.45);
  donor.visible = false;
  return { truck, donor };
}

export function buildCustomCarShop(
  woodTex: THREE.Texture,
  colliders: CustomShopCollider[],
): CustomCarShopHandles {
  const groundY = CUSTOM_SHOP_Y;
  const group = new THREE.Group();
  group.name = 'bayou-royal-customs';
  group.position.set(CUSTOM_SHOP_POS.x, groundY, CUSTOM_SHOP_POS.z);

  const concrete = getPolishedConcretePbr(8);
  const checker = checkerTexture();
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: checker ?? concrete.map,
    normalMap: concrete.normalMap,
    roughnessMap: concrete.roughnessMap,
    roughness: 0.38,
    metalness: 0.14,
    envMapIntensity: 0.7,
  });
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x24413d,
    map: concrete.map,
    normalMap: concrete.normalMap,
    roughness: 0.68,
    metalness: 0.24,
  });
  const wallDarkMat = new THREE.MeshStandardMaterial({
    color: 0x172b29,
    roughness: 0.74,
    metalness: 0.18,
  });
  const brickMat = new THREE.MeshStandardMaterial({
    color: 0x5e3b2a,
    map: concrete.map,
    normalMap: concrete.normalMap,
    roughness: 0.88,
    metalness: 0.02,
  });
  const rustMat = new THREE.MeshStandardMaterial({
    color: 0x914d2e,
    roughness: 0.78,
    metalness: 0.26,
  });
  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xc08a3e,
    roughness: 0.25,
    metalness: 0.84,
  });
  const creamMat = new THREE.MeshStandardMaterial({
    color: 0xe9dcc2,
    roughness: 0.46,
    metalness: 0.04,
  });
  const blackMat = new THREE.MeshStandardMaterial({
    color: 0x111315,
    roughness: 0.55,
    metalness: 0.38,
  });
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x121212,
    roughness: 0.9,
    metalness: 0.02,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x819ca1,
    transparent: true,
    opacity: 0.32,
    roughness: 0.16,
    metalness: 0.22,
  });
  const warmLightMat = new THREE.MeshStandardMaterial({
    color: 0xffe3a3,
    emissive: 0xffb84d,
    emissiveIntensity: 2.1,
    roughness: 0.24,
  });
  const amberMat = new THREE.MeshStandardMaterial({
    color: 0xffb020,
    emissive: 0xff8a00,
    emissiveIntensity: 1.6,
    roughness: 0.22,
  });
  const redMat = new THREE.MeshStandardMaterial({
    color: 0xb93333,
    roughness: 0.38,
    metalness: 0.35,
  });
  const leatherMat = new THREE.MeshStandardMaterial({
    color: 0xc8ae86,
    roughness: 0.58,
    metalness: 0.03,
  });

  // Checkered shop slab and forecourt.
  const slab = new THREE.Mesh(roundedBox(12.2, 0.3, 9.2, 0.04), floorMat);
  slab.position.y = -0.13;
  const forecourt = new THREE.Mesh(roundedBox(12.4, 0.16, 4.8, 0.05), concreteMatSafe(concrete));
  forecourt.position.set(0, -0.06, 6.65);
  group.add(slab, forecourt);

  // Lower brick wainscot and corrugated metal shell.
  const backWall = new THREE.Mesh(roundedBox(12.1, 5.3, 0.3, 0.04), wallMat);
  backWall.position.set(0, 2.64, -4.52);
  const backBrick = new THREE.Mesh(roundedBox(12.1, 1.25, 0.34, 0.04), brickMat);
  backBrick.position.set(0, 0.62, -4.5);
  const sideL = new THREE.Mesh(roundedBox(0.3, 5.3, 9.1, 0.04), wallMat);
  sideL.position.set(-5.92, 2.64, -0.02);
  const sideR = sideL.clone();
  sideR.position.x = 5.92;
  const sideBrickL = new THREE.Mesh(roundedBox(0.34, 1.25, 9.1, 0.04), brickMat);
  sideBrickL.position.set(-5.92, 0.62, -0.02);
  const sideBrickR = sideBrickL.clone();
  sideBrickR.position.x = 5.92;
  group.add(backWall, backBrick, sideL, sideR, sideBrickL, sideBrickR);

  // Corrugation ribs give the shed its salvage-shop silhouette.
  for (let z = -4.1; z <= 4.0; z += 0.74) {
    [-6.1, 6.1].forEach((x) => {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.06, 4.05, 0.08), wallDarkMat);
      rib.position.set(x, 2.85, z);
      group.add(rib);
    });
  }

  // Front portal, jambs and eyebrow.
  const header = new THREE.Mesh(roundedBox(12.2, 1.2, 0.5, 0.05), wallMat);
  header.position.set(0, 4.8, 4.45);
  const headerTrim = new THREE.Mesh(roundedBox(12.3, 0.12, 0.7, 0.03), brassMat);
  headerTrim.position.set(0, 4.14, 4.48);
  const jambL = new THREE.Mesh(roundedBox(0.5, 4.3, 0.5, 0.04), wallMat);
  jambL.position.set(-5.75, 2.15, 4.45);
  const jambR = jambL.clone();
  jambR.position.x = 5.75;
  group.add(header, headerTrim, jambL, jambR);

  // Half-raised roll-up door.
  const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 1.7, 14), blackMat);
  roll.rotation.z = Math.PI / 2;
  roll.position.set(-4.45, 4.18, 4.36);
  group.add(roll);
  for (let i = 0; i < 3; i++) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(8.9, 0.13, 0.08), wallMat);
    slat.position.set(0, 4.16 + i * 0.16, 4.45);
    group.add(slat);
  }

  // Roof with skylights and exposed beams.
  const roof = new THREE.Mesh(roundedBox(12.35, 0.34, 9.35, 0.04), wallDarkMat);
  roof.position.y = 5.45;
  group.add(roof);
  for (let x = -4.2; x <= 4.2; x += 2.8) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 9.0), rustMat);
    beam.position.set(x, 5.19, 0);
    group.add(beam);
  }
  [-2.0, 1.9].forEach((x) => {
    const skylight = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.08, 3.2), glassMat);
    skylight.position.set(x, 5.6, -1.0);
    group.add(skylight);
  });

  // Warm work lights under the roof.
  [-3.2, 0, 3.2].forEach((x) => {
    const housing = new THREE.Mesh(roundedBox(0.85, 0.12, 0.22, 0.025), blackMat);
    housing.position.set(x, 4.95, -0.8);
    const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.04, 0.16), warmLightMat);
    bulb.position.set(x, 4.88, -0.8);
    const workLight = new THREE.PointLight(0xffd49a, 1.15, 15, 1.7);
    workLight.position.set(x, 4.58, -0.55);
    group.add(housing, bulb, workLight);
  });

  // Main sign above the entrance.
  const signTex = shopSignTexture();
  if (signTex) {
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(8.8, 1.55),
      new THREE.MeshBasicMaterial({ map: signTex, transparent: true }),
    );
    sign.position.set(0, 4.72, 4.74);
    group.add(sign);
    const signBack = new THREE.Mesh(roundedBox(9.0, 1.68, 0.16, 0.04), blackMat);
    signBack.position.set(0, 4.72, 4.66);
    group.add(signBack);
  }

  // Bay lift and checker-plate approach.
  const liftPlatform = new THREE.Group();
  liftPlatform.name = 'custom-shop-lift-platform';
  const liftBase = new THREE.Mesh(roundedBox(3.5, 0.24, 5.9, 0.05), blackMat);
  liftBase.position.set(0, 0.22, 0.35);
  const liftDeck = new THREE.Mesh(roundedBox(3.15, 0.12, 5.5, 0.03), rustMat);
  liftDeck.position.set(0, 0.4, 0.35);
  liftPlatform.add(liftBase, liftDeck);
  group.add(liftPlatform);
  [-1.85, 1.85].forEach((x) => {
    const post = new THREE.Mesh(roundedBox(0.22, 3.5, 0.35, 0.03), rustMat);
    post.position.set(x, 2.0, -1.2);
    const arm = new THREE.Mesh(roundedBox(0.16, 0.12, 2.2, 0.025), blackMat);
    arm.position.set(x, 2.5, 0.1);
    group.add(post, arm);
  });
  for (let i = 0; i < 6; i++) {
    const hazard = new THREE.Mesh(
      new THREE.BoxGeometry(3.25, 0.012, 0.14),
      i % 2 === 0 ? amberMat : blackMat,
    );
    hazard.position.set(0, 0.465, -2.45 + i * 0.14);
    liftPlatform.add(hazard);
  }

  // Parts, tools, upholstery and paint displays around the bay.
  const bench = new THREE.Mesh(roundedBox(4.8, 0.2, 0.95, 0.04), woodTexMaterial(woodTex));
  bench.position.set(-3.35, 0.92, -3.75);
  const benchLegs = new THREE.Mesh(roundedBox(4.5, 0.72, 0.55, 0.03), blackMat);
  benchLegs.position.set(-3.35, 0.45, -3.75);
  group.add(bench, benchLegs);

  const toolChest = new THREE.Mesh(roundedBox(1.9, 1.15, 0.75, 0.06), redMat);
  toolChest.position.set(4.65, 0.7, -3.5);
  const toolTop = new THREE.Mesh(roundedBox(2.0, 0.09, 0.82, 0.025), blackMat);
  toolTop.position.set(4.65, 1.31, -3.5);
  const chestHandle = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 0.04), brassMat);
  chestHandle.position.set(4.65, 0.9, -3.1);
  group.add(toolChest, toolTop, chestHandle);
  for (let i = 0; i < 4; i++) {
    const drawer = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.04, 0.04), brassMat);
    drawer.position.set(4.65, 0.3 + i * 0.23, -3.1);
    group.add(drawer);
  }

  // Tire and rim rack.
  const rack = new THREE.Mesh(roundedBox(0.16, 3.0, 3.4, 0.03), blackMat);
  rack.position.set(5.65, 1.7, -1.6);
  group.add(rack);
  for (let i = 0; i < 3; i++) {
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(0.46, 0.11, 10, 24),
      brassMat,
    );
    rim.rotation.y = Math.PI / 2;
    rim.position.set(5.05, 0.78 + i * 0.72, -1.55);
    const tire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.55, 0.22, 18),
      tireMat,
    );
    tire.rotation.z = Math.PI / 2;
    tire.position.copy(rim.position);
    group.add(tire, rim);
  }

  // Hydraulic pump wall.
  for (let i = 0; i < 4; i++) {
    const pump = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.15, 0.62, 10),
      brassMat,
    );
    pump.position.set(-5.45, 1.1 + (i % 2) * 0.78, -1.6 + Math.floor(i / 2) * 0.6);
    const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.2, 10), redMat);
    motor.position.copy(pump.position);
    motor.position.y += 0.4;
    group.add(pump, motor);
  }

  // Speaker wall and upholstery rolls.
  for (let i = 0; i < 4; i++) {
    const cab = new THREE.Mesh(roundedBox(0.58, 0.74, 0.42, 0.04), blackMat);
    cab.position.set(5.4, 1.1 + Math.floor(i / 2) * 0.82, 1.0 + (i % 2) * 0.65);
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.05, 16), rustMat);
    cone.rotation.z = Math.PI / 2;
    cone.position.set(5.08, cab.position.y, cab.position.z);
    group.add(cab, cone);
  }
  [0, 0.36].forEach((offset, index) => {
    const leatherRoll = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 2.1, 14),
      index === 0 ? leatherMat : creamMat,
    );
    leatherRoll.rotation.x = Math.PI / 2;
    leatherRoll.position.set(-4.55 + offset, 1.2, -3.35);
    group.add(leatherRoll);
  });

  // Steering wheels and shifter display on the back wall.
  [-1.0, 0.0, 1.0].forEach((x, index) => {
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.045, 8, 24), brassMat);
    wheel.position.set(x, 2.55, -4.3);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.08, 10), chromeMaterial());
    hub.rotation.x = Math.PI / 2;
    hub.position.copy(wheel.position);
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.035, 0.035), chromeMaterial());
    spoke.position.copy(wheel.position);
    group.add(wheel, hub, spoke);
    if (index === 1) wheel.rotation.z = 0.2;
  });
  for (let i = 0; i < 3; i++) {
    const shifter = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.38, 8), chromeMaterial());
    shifter.position.set(2.1 + i * 0.28, 2.25, -4.25);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), brassMat);
    knob.position.set(2.1 + i * 0.28, 2.45, -4.25);
    group.add(shifter, knob);
  }

  // Paint mixing bench, spray guns and cans.
  const paintBench = new THREE.Mesh(roundedBox(2.1, 0.85, 0.8, 0.04), wallDarkMat);
  paintBench.position.set(3.35, 0.58, -3.8);
  group.add(paintBench);
  [
    { color: 0x6e1f3c, x: 2.7 },
    { color: 0xf4e3c1, x: 3.15 },
    { color: 0xf1c453, x: 3.6 },
    { color: 0x2d2d2d, x: 4.05 },
  ].forEach((can) => {
    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.17, 0.3, 12),
      new THREE.MeshStandardMaterial({ color: can.color, roughness: 0.5 }),
    );
    pot.position.set(can.x, 1.14, -3.85);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.165, 0.03, 12), chromeMaterial());
    lid.position.set(can.x, 1.3, -3.85);
    group.add(pot, lid);
  });

  // Air compressor.
  const compressor = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.45, 1.4, 14),
    redMat,
  );
  compressor.rotation.z = Math.PI / 2;
  compressor.position.set(-4.85, 0.65, 2.7);
  const compressorWheel = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.08, 8, 18), blackMat);
  compressorWheel.position.set(-4.85, 0.65, 3.45);
  group.add(compressor, compressorWheel);

  // Freestanding restoration status board.
  const boardStand = new THREE.Mesh(roundedBox(0.18, 2.6, 0.18, 0.02), blackMat);
  boardStand.position.set(-4.15, 1.3, -1.0);
  const boardFrame = new THREE.Mesh(roundedBox(4.15, 1.85, 0.14, 0.04), blackMat);
  boardFrame.position.set(-4.15, 2.5, -1.0);
  const boardCanvas = makeCanvas(1024, 512);
  const boardTexture = boardCanvas ? new THREE.CanvasTexture(boardCanvas.canvas) : null;
  if (boardTexture) {
    boardTexture.colorSpace = THREE.SRGBColorSpace;
    boardTexture.anisotropy = 4;
  }
  const boardMat = new THREE.MeshBasicMaterial({
    map: boardTexture ?? undefined,
    color: boardTexture ? 0xffffff : 0x1b2422,
  });
  const boardMesh = new THREE.Mesh(new THREE.PlaneGeometry(3.9, 1.6), boardMat);
  boardMesh.position.set(-4.15, 2.5, -0.92);
  group.add(boardStand, boardFrame, boardMesh);

  const setStatus = (headline: string, detail: string, progress: number) => {
    if (!boardCanvas || !boardTexture) return;
    const { canvas, ctx } = boardCanvas;
    ctx.fillStyle = '#111918';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#c08a3e';
    ctx.lineWidth = 8;
    ctx.strokeRect(7, 7, canvas.width - 14, canvas.height - 14);
    ctx.fillStyle = '#e7b85f';
    ctx.font = '700 38px Arial, sans-serif';
    ctx.fillText('BAYOU ROYAL CUSTOMS', 42, 62);
    ctx.fillStyle = '#f1e5cd';
    ctx.font = '700 46px Georgia, serif';
    ctx.fillText(headline.slice(0, 36), 42, 144);
    ctx.fillStyle = '#aab7b2';
    ctx.font = '500 30px Arial, sans-serif';
    const words = detail.split(' ');
    let line = '';
    let y = 204;
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (next.length > 42) {
        ctx.fillText(line, 42, y);
        y += 38;
        line = word;
      } else {
        line = next;
      }
    }
    if (line) ctx.fillText(line, 42, y);
    const barY = 412;
    ctx.fillStyle = '#2b3431';
    ctx.fillRect(42, barY, 940, 36);
    ctx.fillStyle = '#c08a3e';
    ctx.fillRect(42, barY, 940 * Math.max(0, Math.min(1, progress)), 36);
    ctx.strokeStyle = '#65766f';
    ctx.lineWidth = 3;
    ctx.strokeRect(42, barY, 940, 36);
    ctx.fillStyle = '#d7decf';
    ctx.font = '600 24px Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(progress * 100)}%`, 982, 396);
    ctx.textAlign = 'left';
    boardTexture.needsUpdate = true;
  };
  setStatus(
    'WAITING FOR A DONOR',
    'Duke and Rae are ready to pull a wreck out of Cave 12.',
    0,
  );

  // The two-person restoration crew.
  const workerStarts = [
    { x: -3.55, z: 2.2 },
    { x: -2.55, z: 2.45 },
  ];
  const workers = CUSTOM_SHOP_WORKERS.map((spec, index) =>
    buildWorker(
      spec.id,
      spec.name,
      spec.role,
      spec.uniformColor,
      spec.accentColor,
      index === 0 ? 0x7a4f37 : 0x5c3827,
      workerStarts[index].x,
      workerStarts[index].z,
      index * 0.82,
    ),
  );
  workers.forEach((worker) => group.add(worker.group));

  // The tow truck waits on the forecourt, then drives the cave route.
  const { truck, donor } = buildTowTruck(
    blackMat,
    creamMat,
    chromeMaterial(),
    glassMat,
    tireMat,
    amberMat,
  );
  truck.position.set(3.9, 0, 6.2);
  truck.rotation.y = Math.PI;
  truck.add(donor);
  group.add(truck);

  // A rusted donor sits on the lift until the real car is unveiled.
  const liftCar = buildJunkShell(
    new THREE.MeshStandardMaterial({ color: 0x57473d, roughness: 0.94 }),
    new THREE.MeshStandardMaterial({ color: 0x8c4e2c, roughness: 0.98 }),
    glassMat,
    tireMat,
    false,
  );
  liftCar.position.set(0, 0.46, 0.35);
  liftCar.scale.setScalar(0.92);
  group.add(liftCar);
  liftCar.userData.noStaticMerge = true;
  liftCar.userData.dynamic = true;

  // Junkyard staging area at the mouth of Cave 12.
  const yard = new THREE.Group();
  yard.name = 'cave-12-salvage-yard';
  const caveLocalX = JUNKYARD_CAVE.x - CUSTOM_SHOP_POS.x;
  const caveLocalZ = JUNKYARD_CAVE.z - CUSTOM_SHOP_POS.z;
  const caveGroundY = getTerrainHeight(JUNKYARD_CAVE.x, JUNKYARD_CAVE.z);
  yard.position.set(caveLocalX, caveGroundY - groundY, caveLocalZ);
  const dirt = new THREE.Mesh(
    new THREE.CircleGeometry(7.2, 24),
    new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 1 }),
  );
  dirt.rotation.x = -Math.PI / 2;
  dirt.position.y = 0.04;
  yard.add(dirt);
  const yardSign = yardSignTexture();
  if (yardSign) {
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(5.6, 1.85),
      new THREE.MeshBasicMaterial({ map: yardSign }),
    );
    sign.position.set(0.4, 2.9, 5.2);
    sign.rotation.y = 0.08;
    yard.add(sign);
    const signPostA = new THREE.Mesh(roundedBox(0.13, 3.1, 0.13, 0.02), rustMat);
    signPostA.position.set(-1.6, 1.55, 5.2);
    const signPostB = signPostA.clone();
    signPostB.position.x = 2.4;
    yard.add(signPostA, signPostB);
  }
  const yardJunk = [
    { x: -3.7, z: -1.2, yaw: 0.45, color: 0x4e5a55 },
    { x: 3.4, z: -0.4, yaw: -0.8, color: 0x725044 },
    { x: -0.4, z: -4.4, yaw: 1.7, color: 0x394e58 },
  ];
  for (const spec of yardJunk) {
    const shell = buildJunkShell(
      new THREE.MeshStandardMaterial({ color: spec.color, roughness: 0.97 }),
      new THREE.MeshStandardMaterial({ color: 0x8a4b2d, roughness: 0.99 }),
      glassMat,
      tireMat,
      false,
    );
    shell.position.set(spec.x, 0.06, spec.z);
    shell.rotation.y = spec.yaw;
    shell.scale.setScalar(0.9);
    yard.add(shell);
  }
  for (let i = 0; i < 9; i++) {
    const tire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.43, 0.43, 0.24, 14),
      tireMat,
    );
    tire.rotation.z = Math.PI / 2;
    tire.rotation.y = i * 0.4;
    tire.position.set(
      -5.6 + (i % 3) * 0.3,
      0.25 + Math.floor(i / 3) * 0.25,
      2.3 + (i % 2) * 0.2,
    );
    yard.add(tire);
  }
  const yardLamp = new THREE.PointLight(0xffb35c, 1.3, 16, 1.6);
  yardLamp.position.set(1.2, 4.6, 4.4);
  yard.add(yardLamp);
  const hoist = new THREE.Group();
  const hoistBase = new THREE.Mesh(roundedBox(1.3, 0.16, 0.8, 0.03), rustMat);
  const hoistPost = new THREE.Mesh(roundedBox(0.16, 3.2, 0.16, 0.03), rustMat);
  hoistPost.position.y = 1.6;
  const hoistArm = new THREE.Mesh(roundedBox(0.16, 0.16, 2.5, 0.03), rustMat);
  hoistArm.position.set(0, 3.15, 0.8);
  hoistArm.rotation.x = -0.22;
  hoist.add(hoistBase, hoistPost, hoistArm);
  hoist.position.set(5.2, 0.1, 2.3);
  yard.add(hoist);
  for (let i = 0; i < 3; i++) {
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.33, 0.33, 0.85, 12),
      i === 0 ? rustMat : wallDarkMat,
    );
    barrel.position.set(-5.1 + i * 0.7, 0.45, 4.2);
    yard.add(barrel);
  }
  addShadow(yard);
  group.add(yard);

  // Shop shell colliders. The opening between the front jambs stays walkable.
  const wallMinY = groundY - 0.4;
  const wallMaxY = groundY + 5.6;
  for (let z = -4.55; z <= 4.55; z += 0.9) {
    colliders.push(
      { x: CUSTOM_SHOP_POS.x - 6.05, z: CUSTOM_SHOP_POS.z + z, radius: 0.78, minY: wallMinY, maxY: wallMaxY },
      { x: CUSTOM_SHOP_POS.x + 6.05, z: CUSTOM_SHOP_POS.z + z, radius: 0.78, minY: wallMinY, maxY: wallMaxY },
    );
  }
  for (let x = -5.9; x <= 5.9; x += 0.9) {
    colliders.push({
      x: CUSTOM_SHOP_POS.x + x,
      z: CUSTOM_SHOP_POS.z - 4.55,
      radius: 0.78,
      minY: wallMinY,
      maxY: wallMaxY,
    });
  }
  colliders.push(
    { x: CUSTOM_SHOP_POS.x - 5.75, z: CUSTOM_SHOP_POS.z + 4.45, radius: 0.75, minY: wallMinY, maxY: wallMaxY },
    { x: CUSTOM_SHOP_POS.x + 5.75, z: CUSTOM_SHOP_POS.z + 4.45, radius: 0.75, minY: wallMinY, maxY: wallMaxY },
  );

  group.traverse((object) => {
    if (object instanceof THREE.Mesh && !object.userData.dynamic) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  [truck, donor].forEach((object) => {
    object.traverse((child) => {
      child.userData.noStaticMerge = true;
      child.userData.dynamic = true;
    });
  });

  return {
    group,
    groundY,
    position: new THREE.Vector3(CUSTOM_SHOP_POS.x, groundY, CUSTOM_SHOP_POS.z),
    bayPosition: new THREE.Vector3(
      CUSTOM_SHOP_POS.x,
      groundY + 0.02,
      CUSTOM_SHOP_POS.z + 0.35,
    ),
    cavePosition: new THREE.Vector3(
      JUNKYARD_CAVE.x,
      caveGroundY,
      JUNKYARD_CAVE.z,
    ),
    workers,
    towTruck: truck,
    towDonor: donor,
    liftCar,
    liftPlatform,
    setStatus,
  };
}

function concreteMatSafe(concrete: ReturnType<typeof getPolishedConcretePbr>): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x4a4b45,
    map: concrete.map,
    normalMap: concrete.normalMap,
    roughnessMap: concrete.roughnessMap,
    roughness: 0.72,
    metalness: 0.08,
  });
}

function woodTexMaterial(woodTex: THREE.Texture): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x8d5d36,
    map: woodTex,
    roughness: 0.6,
    metalness: 0.03,
  });
}

function chromeMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0xd9d7cf,
    roughness: 0.2,
    metalness: 0.92,
  });
}
