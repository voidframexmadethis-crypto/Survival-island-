import * as THREE from 'three';
import { roundedBox } from './roundedBox';
import { getPolishedConcretePbr } from './textures';
import {
  CUSTOM_SHOP_POS,
  CUSTOM_SHOP_Y,
  getTerrainHeight,
  getWaterLevelAt,
} from './terrain';
import {
  CUSTOM_FREIGHT_DOCK,
  CUSTOM_FREIGHT_PIER_DECK_ABOVE_WATER,
  CUSTOM_FREIGHT_ROUTE,
  CUSTOM_FREIGHT_SHIP_MOORING,
  CUSTOM_SHOP_PAINT_BOOTH,
  CUSTOM_SHOP_WORKERS,
  getCustomShopShipRoutePoint,
  JUNKYARD_CAVE,
  type CustomShopToolKind,
  type CustomShopWorkerId,
  type DonorDamageProfile,
} from '../systems/customCarShop';

export interface CustomShopWorkerHandle {
  id: CustomShopWorkerId;
  name: string;
  role: string;
  group: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  head: THREE.Group;
  tools: Record<CustomShopToolKind, THREE.Object3D>;
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
  liftCarTrunk: THREE.Group | null;
  liftCarHood: THREE.Group | null;
  liftCarDoors: THREE.Group[];
  liftCarFenders: THREE.Object3D[];
  liftCarQuarters: THREE.Object3D[];
  liftCarGlass: THREE.Object3D | null;
  liftCarEngine: THREE.Object3D | null;
  liftCarTrash: THREE.Object3D[];
  liftCarWheels: THREE.Group[];
  hydraulicParts: THREE.Group;
  stockSuspensionPile: THREE.Group;
  partCrates: THREE.Group[];
  cargoShip: THREE.Group;
  cargoShipContainers: THREE.Group;
  forklift: THREE.Group;
  forkliftForks: THREE.Group;
  forkliftPallet: THREE.Group;
  forkliftShellPallet: THREE.Group;
  wrappedShell: THREE.Group;
  paintBooth: THREE.Group;
  paintBoothDoor: THREE.Group;
  paintBoothLight: THREE.PointLight;
  redCargoShip: THREE.Group;
  freightDeckY: number;
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

  // Every tech carries the whole kit; the engine shows the tool for the job.
  const toolGroup = (): THREE.Group => {
    const tool = new THREE.Group();
    tool.position.set(0, -0.56, 0.16);
    tool.visible = false;
    return tool;
  };
  const hammer = toolGroup();
  const hammerHandle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.028, 0.034, 0.46, 8),
    new THREE.MeshStandardMaterial({ color: 0x7a4a24, roughness: 0.85 }),
  );
  hammerHandle.position.set(0, -0.1, 0);
  hammerHandle.rotation.z = 0.12;
  const hammerHead = new THREE.Mesh(roundedBox(0.11, 0.11, 0.3, 0.02), chrome);
  hammerHead.position.set(0, 0.14, 0.02);
  hammer.add(hammerHandle, hammerHead);

  const wrench = toolGroup();
  const wrenchShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.035, 0.42, 8),
    chrome,
  );
  wrenchShaft.position.y = -0.08;
  wrenchShaft.rotation.z = 0.65;
  const wrenchJaw = new THREE.Mesh(roundedBox(0.13, 0.08, 0.06, 0.015), chrome);
  wrenchJaw.position.set(0.14, 0.12, 0);
  wrench.add(wrenchShaft, wrenchJaw);

  const spray = toolGroup();
  const sprayBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.075, 0.09, 0.26, 10),
    new THREE.MeshStandardMaterial({ color: 0xc08a3e, roughness: 0.4, metalness: 0.4 }),
  );
  const sprayNozzle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.024, 0.2, 8),
    chrome,
  );
  sprayNozzle.position.set(0, 0.2, 0.04);
  sprayBody.position.y = -0.02;
  spray.add(sprayBody, sprayNozzle);

  const needle = toolGroup();
  const needleBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.07, 0.34, 8),
    new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.3, metalness: 0.7 }),
  );
  const needleTip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.26, 6),
    chrome,
  );
  needleTip.position.y = 0.26;
  needle.add(needleBody, needleTip);

  const polish = toolGroup();
  const polishPad = new THREE.Mesh(
    new THREE.CylinderGeometry(0.115, 0.135, 0.08, 10),
    new THREE.MeshStandardMaterial({ color: 0xe7d7b5, roughness: 0.95 }),
  );
  polishPad.rotation.z = Math.PI / 2;
  polish.add(polishPad);

  armR.add(armRMesh, hammer, wrench, spray, needle, polish);
  wrench.visible = true;
  const tools: Record<CustomShopToolKind, THREE.Object3D> = {
    hammer,
    wrench,
    spray,
    needle,
    polish,
    none: new THREE.Group(),
  };

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
    legL,
    legR,
    armL,
    armR,
    head,
    tools,
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
  damage?: DonorDamageProfile,
): THREE.Group {
  const profile: DonorDamageProfile = damage ?? {
    dents: 6,
    rustHoles: 4,
    collapsedRoof: true,
    fireDamage: true,
    trash: 'both',
    glassMissing: true,
    summary: 'Cave wreck with rust, dents, fire damage and trash.',
  };
  const seeded = (index: number, salt: number) => {
    const value = Math.sin((index + 1) * 12.9898 + salt * 78.233) * 43758.5453;
    return value - Math.floor(value);
  };
  const group = new THREE.Group();
  group.name = 'junk-donor-shell';
  const body = new THREE.Mesh(roundedBox(1.9, 0.55, 4.4, 0.12), bodyMat);
  body.position.y = 0.62;
  const roof = new THREE.Mesh(roundedBox(1.55, 0.5, 2.1, 0.1), bodyMat);
  roof.position.set(0, 1.04, -0.25);

  // A caved-in roof is common on cars that sat under trees or got jumped on.
  const roofCollapse = new THREE.Group();
  if (profile.collapsedRoof) {
    const caved = new THREE.Mesh(
      new THREE.SphereGeometry(0.72, 14, 10),
      new THREE.MeshStandardMaterial({ color: 0x6b4a34, roughness: 0.94 }),
    );
    caved.scale.set(1.05, 0.16, 0.72);
    caved.position.set(0.08, 1.24, -0.2);
    const crease = new THREE.Mesh(
      roundedBox(1.1, 0.035, 0.08, 0.01),
      new THREE.MeshStandardMaterial({ color: 0x3d2a1c, roughness: 1 }),
    );
    crease.position.set(-0.1, 1.29, -0.2);
    crease.rotation.y = 0.25;
    roofCollapse.add(caved, crease);
    roofCollapse.visible = profile.collapsedRoof;
  }
  group.add(roofCollapse);

  // Hood and trunk are real hinges so the crew can open and remove them.
  const hoodPivot = new THREE.Group();
  hoodPivot.position.set(0, 0.98, 1.92);
  const hood = new THREE.Mesh(roundedBox(1.65, 0.15, 1.2, 0.06), rustMat);
  hood.position.set(0, -0.07, -0.6);
  hoodPivot.add(hood);

  const trunkPivot = new THREE.Group();
  trunkPivot.position.set(0, 0.9, -1.12);
  const trunk = new THREE.Mesh(roundedBox(1.65, 0.12, 0.9, 0.05), rustMat);
  trunk.position.set(0, 0, -0.43);
  trunkPivot.add(trunk);

  const glass = new THREE.Group();
  const windshield = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.46), glassMat);
  windshield.position.set(0, 1.13, 0.89);
  windshield.rotation.x = -0.42;
  windshield.name = 'windshield-glass';
  const rearGlass = windshield.clone();
  rearGlass.name = 'rear-glass';
  rearGlass.position.set(0, 1.12, -1.16);
  rearGlass.rotation.x = Math.PI + 0.4;
  rearGlass.visible = !profile.glassMissing;
  const sideGlassL = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 0.4), glassMat);
  sideGlassL.position.set(-0.955, 1.12, -0.15);
  sideGlassL.rotation.y = -Math.PI / 2;
  sideGlassL.name = 'side-glass-l';
  const sideGlassR = sideGlassL.clone();
  sideGlassR.name = 'side-glass-r';
  sideGlassR.position.x = 0.955;
  sideGlassR.rotation.y = Math.PI / 2;
  sideGlassL.visible = !profile.glassMissing;
  sideGlassR.visible = !profile.glassMissing;
  glass.add(windshield, rearGlass, sideGlassL, sideGlassR);

  // Bolt-on doors, fenders and quarter skins get unbolted and set aside.
  const doorL = new THREE.Group();
  doorL.position.set(-0.95, 0.86, 0.98);
  const doorLMesh = new THREE.Mesh(roundedBox(0.09, 0.5, 1.12, 0.04), bodyMat);
  doorLMesh.position.set(0, -0.17, -0.56);
  const doorLHandle = new THREE.Mesh(roundedBox(0.04, 0.04, 0.18, 0.01), rustMat);
  doorLHandle.position.set(-0.06, -0.12, -0.95);
  doorL.add(doorLMesh, doorLHandle);
  const doorR = new THREE.Group();
  doorR.position.set(0.95, 0.86, 0.98);
  const doorRMesh = doorLMesh.clone();
  const doorRHandle = doorLHandle.clone();
  doorRHandle.position.x = 0.06;
  doorR.add(doorRMesh, doorRHandle);

  const fenderL = new THREE.Mesh(roundedBox(0.1, 0.44, 1.15, 0.035), rustMat);
  fenderL.position.set(-0.97, 0.64, 1.55);
  const fenderR = fenderL.clone();
  fenderR.position.x = 0.97;
  const quarterL = new THREE.Mesh(roundedBox(0.1, 0.48, 1.35, 0.035), bodyMat);
  quarterL.position.set(-0.97, 0.66, -1.22);
  const quarterR = quarterL.clone();
  quarterR.position.x = 0.97;
  const bodyPanels = new THREE.Group();
  bodyPanels.add(fenderL, fenderR, quarterL, quarterR);

  // Engine bay and cabin details make the teardown readable.
  const engine = new THREE.Group();
  const block = new THREE.Mesh(
    roundedBox(0.72, 0.42, 0.86, 0.03),
    new THREE.MeshStandardMaterial({ color: 0x2f3337, roughness: 0.6, metalness: 0.35 }),
  );
  block.position.set(0, 0.72, 1.24);
  const airCleaner = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.24, 0.12, 14),
    new THREE.MeshStandardMaterial({ color: 0x353a3e, roughness: 0.35, metalness: 0.55 }),
  );
  airCleaner.position.set(0, 0.99, 1.24);
  const valveCover = new THREE.Mesh(roundedBox(0.5, 0.09, 0.18, 0.02), rustMat);
  valveCover.position.set(0, 0.93, 1.0);
  engine.add(block, airCleaner, valveCover);

  const interior = new THREE.Group();
  const seatMat = new THREE.MeshStandardMaterial({ color: 0x4c3a2c, roughness: 0.96 });
  [-0.42, 0.42].forEach((x) => {
    const seat = new THREE.Mesh(roundedBox(0.62, 0.4, 0.6, 0.06), seatMat);
    seat.position.set(x, 0.76, -0.28);
    const back = new THREE.Mesh(roundedBox(0.62, 0.55, 0.14, 0.04), seatMat);
    back.position.set(x, 0.96, -0.55);
    back.rotation.x = -0.12;
    interior.add(seat, back);
  });
  const dash = new THREE.Mesh(roundedBox(1.55, 0.24, 0.28, 0.05), seatMat);
  dash.position.set(0, 0.9, 0.72);
  const steeringWheel = new THREE.Mesh(
    new THREE.TorusGeometry(0.15, 0.035, 8, 16),
    new THREE.MeshStandardMaterial({ color: 0x1e1b18, roughness: 0.8 }),
  );
  steeringWheel.position.set(-0.38, 0.93, 0.48);
  steeringWheel.rotation.x = -0.35;
  const carpet = new THREE.Mesh(
    new THREE.PlaneGeometry(1.55, 1.9),
    new THREE.MeshStandardMaterial({ color: 0x2c241b, roughness: 1 }),
  );
  carpet.rotation.x = -Math.PI / 2;
  carpet.position.set(0, 0.68, -0.2);
  interior.add(dash, steeringWheel, carpet);

  const leaves = new THREE.Group();
  if (profile.trash === 'leaves' || profile.trash === 'both') {
    const leafMats = [0x6b7f3a, 0x9a6a2e, 0x7c5a2e].map(
      (color) => new THREE.MeshStandardMaterial({ color, roughness: 1, side: THREE.DoubleSide }),
    );
    for (let index = 0; index < 22; index += 1) {
      const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.12), leafMats[index % 3]);
      leaf.rotation.set(-Math.PI / 2 + 0.2, seeded(index, 1) * Math.PI, seeded(index, 2) * 0.6);
      leaf.position.set(
        (seeded(index, 3) - 0.5) * 1.45,
        0.705 + seeded(index, 4) * 0.04,
        (seeded(index, 5) - 0.5) * 1.8 - 0.2,
      );
      leaves.add(leaf);
    }
    const trunkLeaves = leaves.clone();
    trunkLeaves.position.set(0, 0.16, -1.32);
    trunkLeaves.scale.setScalar(0.7);
    leaves.add(trunkLeaves);
  }

  const poop = new THREE.Group();
  if (profile.trash === 'poop' || profile.trash === 'both') {
    const poopMat = new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 1 });
    for (let index = 0; index < 4; index += 1) {
      const lump = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), poopMat);
      lump.scale.set(1.4, 0.7, 1);
      lump.position.set(
        (seeded(index, 6) - 0.5) * 1.2,
        0.72,
        -0.9 + seeded(index, 7) * 1.4,
      );
      poop.add(lump);
    }
  }

  // Rust holes with raised, crusty edges.
  const holeGroup = new THREE.Group();
  const holeMat = new THREE.MeshStandardMaterial({
    color: 0x0c0a08,
    roughness: 1,
    side: THREE.DoubleSide,
  });
  const holePositions = [
    { x: -0.965, y: 0.56, z: 0.9, ry: -Math.PI / 2 },
    { x: 0.965, y: 0.63, z: -0.95, ry: Math.PI / 2 },
    { x: -0.36, y: 0.9, z: -1.55, rx: -Math.PI / 2 },
    { x: 0.34, y: 0.91, z: 1.7, rx: -Math.PI / 2 },
    { x: 0.44, y: 0.66, z: -1.9, ry: Math.PI / 2 },
  ];
  holePositions.slice(0, Math.max(0, Math.min(5, profile.rustHoles))).forEach((hole, index) => {
    const size = 0.13 + seeded(index, 8) * 0.09;
    const patch = new THREE.Mesh(new THREE.CircleGeometry(size, 12), holeMat);
    patch.position.set(hole.x, hole.y, hole.z);
    patch.rotation.set(hole.rx ?? 0, hole.ry ?? 0, 0);
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(size, 0.025, 6, 16),
      new THREE.MeshStandardMaterial({ color: 0x8a4a22, roughness: 0.98, metalness: 0.1 }),
    );
    rim.position.copy(patch.position);
    rim.rotation.copy(patch.rotation);
    holeGroup.add(patch, rim);
  });

  // Crushed panels and door dents.
  const dents = new THREE.Group();
  const dentMat = bodyMat.clone();
  dentMat.color.multiplyScalar(0.7);
  dentMat.roughness = 0.95;
  const dentSpots = [
    { x: -0.94, y: 0.7, z: 1.35, ry: -Math.PI / 2 },
    { x: 0.94, y: 0.62, z: -0.25, ry: Math.PI / 2 },
    { x: 1.0, y: 0.72, z: -1.45, ry: Math.PI / 2 },
    { x: -0.98, y: 0.58, z: -1.55, ry: -Math.PI / 2 },
    { x: -0.5, y: 0.93, z: 0.25, rx: -Math.PI / 2 },
    { x: 0.62, y: 0.93, z: -1.2, rx: -Math.PI / 2 },
  ];
  dentSpots.slice(0, Math.max(0, Math.min(6, profile.dents))).forEach((spot, index) => {
    const dent = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), dentMat);
    dent.scale.set(0.62, 0.16, 0.82 + seeded(index, 9) * 0.3);
    dent.position.set(spot.x, spot.y, spot.z);
    dent.rotation.set(spot.rx ?? 0, spot.ry ?? 0, seeded(index, 10) * 0.5);
    dents.add(dent);
  });

  // Fire damage: flat black soot, burned-through hood and ash crust.
  const fire = new THREE.Group();
  if (profile.fireDamage) {
    const sootMat = new THREE.MeshStandardMaterial({
      color: 0x14100d,
      roughness: 1,
      side: THREE.DoubleSide,
    });
    const hoodSoot = new THREE.Mesh(new THREE.CircleGeometry(0.62, 18), sootMat);
    hoodSoot.position.set(-0.12, 0.015, -0.5);
    hoodSoot.rotation.x = -Math.PI / 2;
    hoodPivot.add(hoodSoot);
    const roofSoot = hoodSoot.clone();
    roofSoot.scale.setScalar(0.72);
    roofSoot.position.set(0.34, 1.31, -0.4);
    roofSoot.rotation.x = -Math.PI / 2;
    const trunkSoot = hoodSoot.clone();
    trunkSoot.scale.setScalar(0.55);
    trunkSoot.position.set(0.2, 1.24, -1.15);
    trunkSoot.rotation.x = -Math.PI / 2;
    fire.add(roofSoot, trunkSoot);
    const ashMat = new THREE.MeshStandardMaterial({ color: 0x5b554c, roughness: 1 });
    for (let index = 0; index < 8; index += 1) {
      const ash = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 5), ashMat);
      ash.scale.set(1.3, 0.5, 1);
      ash.position.set(
        (seeded(index, 11) - 0.5) * 1.4,
        0.69,
        -1.2 + seeded(index, 12) * 2.2,
      );
      fire.add(ash);
    }
  }

  group.add(
    body,
    roof,
    hoodPivot,
    trunkPivot,
    glass,
    doorL,
    doorR,
    bodyPanels,
    engine,
    interior,
    leaves,
    poop,
    holeGroup,
    dents,
    fire,
  );

  const wheels: THREE.Group[] = [];
  if (withWheels) {
    [1.35, -1.35].forEach((z) => {
      [-0.92, 0.92].forEach((x) => {
        const wheel = new THREE.Group();
        wheel.position.set(x, 0.37, z);
        const tire = new THREE.Mesh(
          new THREE.CylinderGeometry(0.38, 0.38, 0.24, 16),
          tireMat,
        );
        tire.rotation.z = Math.PI / 2;
        const rim = new THREE.Mesh(
          new THREE.CylinderGeometry(0.19, 0.19, 0.26, 12),
          rustMat,
        );
        rim.rotation.z = Math.PI / 2;
        wheel.add(tire, rim);
        group.add(wheel);
        wheels.push(wheel);
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

  group.userData.trunkLid = trunkPivot;
  group.userData.hoodLid = hoodPivot;
  group.userData.doors = [doorL, doorR];
  group.userData.fenders = [fenderL, fenderR];
  group.userData.quarters = [quarterL, quarterR];
  group.userData.glass = glass;
  group.userData.engine = engine;
  group.userData.interior = interior;
  group.userData.trash = [leaves, poop];
  group.userData.roofCollapse = roofCollapse;
  group.userData.dents = dents;
  group.userData.holes = holeGroup;
  group.userData.fire = fire;
  group.userData.wheels = wheels;
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

function crateLabelTexture(title: string, subtitle: string): THREE.CanvasTexture | null {
  const made = makeCanvas(512, 256);
  if (!made) return null;
  const { canvas, ctx } = made;
  ctx.fillStyle = '#c9b48a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#2b2118';
  ctx.fillRect(18, 18, canvas.width - 36, canvas.height - 36);
  ctx.strokeStyle = '#c08a3e';
  ctx.lineWidth = 6;
  ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e7b85f';
  ctx.font = '700 38px Arial, sans-serif';
  ctx.fillText(title.toUpperCase().slice(0, 22), 256, 104);
  ctx.fillStyle = '#f1e5cd';
  ctx.font = '600 29px Georgia, serif';
  ctx.fillText(subtitle.toUpperCase().slice(0, 30), 256, 156);
  ctx.fillStyle = '#9aa8a2';
  ctx.font = '500 22px Arial, sans-serif';
  ctx.fillText('BAYOU ROYAL CUSTOMS', 256, 198);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function buildWrappedShellCargo(
  bodyMat: THREE.MeshStandardMaterial,
  rustMat: THREE.MeshStandardMaterial,
  glassMat: THREE.MeshStandardMaterial,
  tireMat: THREE.MeshStandardMaterial,
): { cargo: THREE.Group; shell: THREE.Group } {
  const cargo = new THREE.Group();
  cargo.name = 'wrapped-auction-shell';
  const timber = new THREE.MeshStandardMaterial({ color: 0x8b6239, roughness: 0.9 });
  const darkTimber = new THREE.MeshStandardMaterial({ color: 0x5b3f26, roughness: 0.96 });
  const wrap = new THREE.MeshStandardMaterial({
    color: 0xdbe7e8,
    roughness: 0.32,
    metalness: 0.04,
    transparent: true,
    opacity: 0.42,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const strapMat = new THREE.MeshStandardMaterial({ color: 0x302a22, roughness: 0.85 });

  // Huge timber tray the auction yard loads the shell on.
  const tray = new THREE.Mesh(roundedBox(3.0, 0.26, 5.7, 0.05), timber);
  tray.position.y = 0.16;
  cargo.add(tray);
  for (let index = 0; index < 7; index += 1) {
    const plank = new THREE.Mesh(roundedBox(3.1, 0.12, 0.5, 0.02), darkTimber);
    plank.position.set(0, 0.03, -2.45 + index * 0.82);
    cargo.add(plank);
  }
  [-1.25, 1.25].forEach((x) => {
    const runner = new THREE.Mesh(roundedBox(0.22, 0.18, 5.9, 0.03), darkTimber);
    runner.position.set(x, 0.02, 0);
    cargo.add(runner);
  });

  const shell = buildJunkShell(bodyMat, rustMat, glassMat, tireMat, false, {
    dents: 2,
    rustHoles: 1,
    collapsedRoof: false,
    fireDamage: false,
    trash: 'none',
    glassMissing: false,
    summary: 'Straight auction shell with one dent and a small rust hole.',
  });
  shell.position.y = 0.27;
  shell.rotation.y = 0.035;
  shell.scale.setScalar(0.84);
  cargo.add(shell);

  // Shrink wrap over the whole shell, cinched down with freight straps.
  const wrapped = new THREE.Mesh(roundedBox(1.92, 1.32, 4.1, 0.16), wrap);
  wrapped.position.set(0, 1.02, -0.05);
  cargo.add(wrapped);
  for (const z of [-1.45, 0, 1.5]) {
    const strap = new THREE.Mesh(roundedBox(2.03, 0.08, 0.1, 0.02), strapMat);
    strap.position.set(0, 1.02, z);
    cargo.add(strap);
  }
  const trayLabel = crateLabelTexture('AUCTION SHELL', 'chassis · no engine');
  if (trayLabel) {
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 0.55),
      new THREE.MeshBasicMaterial({ map: trayLabel, transparent: true }),
    );
    label.position.set(0, 0.5, 2.86);
    cargo.add(label);
  }
  cargo.traverse((object) => {
    object.userData.noStaticMerge = true;
    object.userData.dynamic = true;
    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  return { cargo, shell };
}

function buildEngineCrate(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'crescent-engine-crate';
  const crate = new THREE.Mesh(
    roundedBox(1.7, 1.25, 1.7, 0.04),
    new THREE.MeshStandardMaterial({ color: 0x9c7444, roughness: 0.88 }),
  );
  crate.position.y = 0.63;
  const engine = new THREE.Mesh(
    roundedBox(1.05, 0.62, 1.0, 0.05),
    new THREE.MeshStandardMaterial({ color: 0x343a3e, roughness: 0.5, metalness: 0.5 }),
  );
  engine.position.y = 1.5;
  const intake = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.28, 0.14, 14),
    new THREE.MeshStandardMaterial({ color: 0x8d9298, roughness: 0.3, metalness: 0.8 }),
  );
  intake.position.y = 1.92;
  const label = crateLabelTexture('ENGINE', 'small-block · crated');
  if (label) {
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(1.45, 0.9),
      new THREE.MeshBasicMaterial({ map: label, transparent: true }),
    );
    plane.position.set(0, 0.72, 0.87);
    group.add(plane);
  }
  group.add(crate, engine, intake);
  group.traverse((object) => {
    object.userData.noStaticMerge = true;
    object.userData.dynamic = true;
    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  return group;
}

function buildFreightShip(palette?: {
  hullColor?: number;
  stripeColor?: number;
  name?: string;
}): { ship: THREE.Group; containers: THREE.Group } {
  const ship = new THREE.Group();
  ship.name = palette?.name ?? 'crescent-city-freight-barge';
  const hullMat = new THREE.MeshStandardMaterial({
    color: palette?.hullColor ?? 0x1e2b33,
    roughness: 0.62,
    metalness: 0.32,
  });
  const hullStripe = new THREE.MeshStandardMaterial({
    color: palette?.stripeColor ?? 0x8c2d24,
    roughness: 0.66,
    metalness: 0.2,
  });
  const deckMat = new THREE.MeshStandardMaterial({
    color: 0x6b6f66,
    roughness: 0.86,
    metalness: 0.28,
  });
  const cabinMat = new THREE.MeshStandardMaterial({
    color: 0xd9d3c0,
    roughness: 0.58,
    metalness: 0.12,
  });
  const rustMat = new THREE.MeshStandardMaterial({
    color: 0x8a4b2d,
    roughness: 0.88,
    metalness: 0.18,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x171b1d,
    roughness: 0.7,
    metalness: 0.3,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x7f9ba2,
    roughness: 0.16,
    metalness: 0.4,
    transparent: true,
    opacity: 0.5,
  });
  const ropeMat = new THREE.MeshStandardMaterial({ color: 0xb7a887, roughness: 0.95 });

  const hull = new THREE.Mesh(roundedBox(5.9, 1.8, 18.4, 0.45), hullMat);
  hull.position.y = -0.35;
  const stripe = new THREE.Mesh(roundedBox(5.95, 0.2, 18.5, 0.35), hullStripe);
  stripe.position.y = 0.28;
  const deck = new THREE.Mesh(roundedBox(5.5, 0.16, 17.9, 0.08), deckMat);
  deck.position.y = 0.56;
  const stern = new THREE.Mesh(roundedBox(5.2, 0.5, 0.9, 0.12), hullMat);
  stern.position.set(0, 0.72, -8.9);
  const bowRamp = new THREE.Mesh(roundedBox(3.4, 0.12, 2.4, 0.04), rustMat);
  bowRamp.position.set(0, 0.72, 8.0);
  bowRamp.rotation.x = -0.08;
  ship.add(hull, stripe, deck, stern, bowRamp);

  const wheelhouse = new THREE.Mesh(roundedBox(4.3, 2.7, 3.1, 0.22), cabinMat);
  wheelhouse.position.set(0, 2.0, -6.4);
  const wheelhouseRoof = new THREE.Mesh(roundedBox(4.6, 0.2, 3.4, 0.08), cabinMat);
  wheelhouseRoof.position.set(0, 3.42, -6.4);
  ship.add(wheelhouse, wheelhouseRoof);
  [-2.17, 2.17].forEach((x) => {
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.72), glassMat);
    glass.position.set(x, 2.45, -5.4);
    glass.rotation.y = x > 0 ? Math.PI / 2 : -Math.PI / 2;
    ship.add(glass);
  });
  const bridgeGlass = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.8), glassMat);
  bridgeGlass.position.set(0, 2.48, -4.83);
  ship.add(bridgeGlass);
  const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.4, 1.5, 12), darkMat);
  stack.position.set(1.2, 4.1, -7.1);
  const stackBand = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.26, 12), hullStripe);
  stackBand.position.set(1.2, 4.55, -7.1);
  ship.add(stack, stackBand);

  // Cargo containers with Crescent City freight stencils.
  const containers = new THREE.Group();
  const containerSpecs = [
    { x: -1.35, z: 1.4, color: 0x8a3b2a, title: 'Dayton Wire', subtitle: '30-inch sets' },
    { x: 1.35, z: 1.4, color: 0x28506b, title: 'Vogue / Forgiato', subtitle: 'rims & tires' },
    { x: -1.35, z: 6.7, color: 0x6a6a3a, title: 'Interior & Roof', subtitle: 'hides, bows, carpet' },
    { x: 1.35, z: 6.7, color: 0x5b4a63, title: 'Hydraulic Kit', subtitle: 'pumps & solenoids' },
  ];
  for (const spec of containerSpecs) {
    const box = new THREE.Mesh(
      roundedBox(2.35, 2.2, 5.0, 0.08),
      new THREE.MeshStandardMaterial({ color: spec.color, roughness: 0.72, metalness: 0.36 }),
    );
    box.position.set(spec.x, 1.75, spec.z);
    containers.add(box);
    const texture = crateLabelTexture(spec.title, spec.subtitle);
    if (texture) {
      [-1.2, 1.2].forEach((side) => {
        const label = new THREE.Mesh(
          new THREE.PlaneGeometry(4.2, 1.6),
          new THREE.MeshBasicMaterial({ map: texture, transparent: true }),
        );
        label.position.set(spec.x + side, 1.8, spec.z);
        label.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
        containers.add(label);
      });
    }
    for (let rib = -2; rib <= 2; rib++) {
      const ribMesh = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 0.06, 0.06),
        darkMat,
      );
      ribMesh.position.set(spec.x, 2.7, spec.z + rib * 0.95);
      containers.add(ribMesh);
    }
  }
  ship.add(containers);

  // Deck crane for unloading the crates onto the pier.
  const craneBase = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.5, 12), rustMat);
  craneBase.position.set(0, 0.82, -3.1);
  const craneMast = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 3.1, 10), rustMat);
  craneMast.position.set(0, 2.4, -3.1);
  const craneBoom = new THREE.Mesh(roundedBox(0.22, 0.22, 3.6, 0.04), rustMat);
  craneBoom.position.set(0, 3.7, -1.7);
  craneBoom.rotation.x = -0.38;
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.6, 6), darkMat);
  cable.position.set(0, 2.85, -0.25);
  ship.add(craneBase, craneMast, craneBoom, cable);

  // Fenders, cleats, and mooring lines.
  for (const z of [-5.5, -1.2, 3.2, 7.2]) {
    const fender = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.7, 10), darkMat);
    fender.rotation.z = Math.PI / 2;
    fender.position.set(-2.95, 0.3, z);
    ship.add(fender);
  }
  for (const z of [-4.4, 2.0, 6.4]) {
    const cleat = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.6, 8), rustMat);
    cleat.rotation.x = Math.PI / 2;
    cleat.position.set(-2.6, 0.72, z);
    ship.add(cleat);
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 6), ropeMat);
    rope.rotation.x = Math.PI / 2;
    rope.position.set(-2.6, 0.68, z + 0.5);
    ship.add(rope);
  }
  const portLight = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0xff3b30, emissive: 0xff3b30, emissiveIntensity: 1.4 }),
  );
  portLight.position.set(-2.6, 2.9, -5.0);
  const starboardLight = portLight.clone();
  starboardLight.material = new THREE.MeshStandardMaterial({
    color: 0x34d399,
    emissive: 0x34d399,
    emissiveIntensity: 1.4,
  });
  starboardLight.position.x = 2.6;
  ship.add(portLight, starboardLight);

  ship.traverse((object) => {
    object.userData.noStaticMerge = true;
    object.userData.dynamic = true;
    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  return { ship, containers };
}

function buildShopForklift(): {
  forklift: THREE.Group;
  forks: THREE.Group;
  pallet: THREE.Group;
} {
  const forklift = new THREE.Group();
  forklift.name = 'bayou-royal-forklift';
  const yellow = new THREE.MeshStandardMaterial({ color: 0xd88a1f, roughness: 0.52, metalness: 0.28 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1b1d1e, roughness: 0.7, metalness: 0.28 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x8d9298, roughness: 0.36, metalness: 0.78 });
  const tire = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.94 });
  const skin = new THREE.MeshStandardMaterial({ color: 0x7a4f37, roughness: 0.74 });
  const uniform = new THREE.MeshStandardMaterial({ color: 0x8a6a3f, roughness: 0.75 });
  const vest = new THREE.MeshStandardMaterial({ color: 0xd6a34a, roughness: 0.6 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x8b6239, roughness: 0.9 });

  const chassis = new THREE.Mesh(roundedBox(1.35, 0.55, 2.15, 0.12), yellow);
  chassis.position.y = 0.66;
  const counterweight = new THREE.Mesh(roundedBox(1.4, 0.72, 0.6, 0.1), dark);
  counterweight.position.set(0, 0.72, -1.05);
  const hood = new THREE.Mesh(roundedBox(1.2, 0.3, 0.7, 0.06), yellow);
  hood.position.set(0, 0.98, -0.62);
  const seat = new THREE.Mesh(roundedBox(0.52, 0.14, 0.46, 0.05), dark);
  seat.position.set(0, 1.2, -0.18);
  const seatBack = new THREE.Mesh(roundedBox(0.5, 0.52, 0.12, 0.05), dark);
  seatBack.position.set(0, 1.48, -0.42);
  forklift.add(chassis, counterweight, hood, seat, seatBack);

  // Mast, carriage and forks.
  const mastL = new THREE.Mesh(roundedBox(0.1, 2.6, 0.12, 0.02), steel);
  mastL.position.set(-0.5, 1.6, 0.94);
  const mastR = mastL.clone();
  mastR.position.x = 0.5;
  const mastTop = new THREE.Mesh(roundedBox(1.1, 0.1, 0.14, 0.02), steel);
  mastTop.position.set(0, 2.9, 0.94);
  const mastBrace = new THREE.Mesh(roundedBox(1.1, 0.08, 0.1, 0.02), steel);
  mastBrace.position.set(0, 1.9, 0.94);
  forklift.add(mastL, mastR, mastTop, mastBrace);

  const forks = new THREE.Group();
  forks.name = 'forklift-forks';
  forks.position.set(0, 0.28, 1.02);
  const carriage = new THREE.Mesh(roundedBox(1.0, 0.7, 0.08, 0.02), dark);
  carriage.position.set(0, 0.46, 0);
  const forkL = new THREE.Mesh(roundedBox(0.14, 0.05, 1.3, 0.02), steel);
  forkL.position.set(-0.32, 0.12, 0.65);
  const forkR = forkL.clone();
  forkR.position.x = 0.32;
  forks.add(carriage, forkL, forkR);
  forklift.add(forks);

  const pallet = new THREE.Group();
  pallet.name = 'forklift-pallet';
  pallet.position.set(0, 0.16, 0.5);
  const palletDeck = new THREE.Mesh(roundedBox(1.2, 0.1, 1.05, 0.02), wood);
  palletDeck.position.y = 0.1;
  pallet.add(palletDeck);
  for (let i = 0; i < 3; i++) {
    const block = new THREE.Mesh(roundedBox(1.05, 0.1, 0.16, 0.02), wood);
    block.position.set(0, 0.02, -0.38 + i * 0.38);
    pallet.add(block);
  }
  const crateMat = new THREE.MeshStandardMaterial({ color: 0xb08a58, roughness: 0.82 });
  const crateA = new THREE.Mesh(roundedBox(0.95, 0.55, 0.85, 0.04), crateMat);
  crateA.position.set(0, 0.43, 0);
  const crateB = new THREE.Mesh(roundedBox(0.8, 0.4, 0.7, 0.04), crateMat);
  crateB.position.set(0, 0.9, -0.05);
  const strap = new THREE.Mesh(roundedBox(1.0, 0.05, 0.06, 0.01), dark);
  strap.position.set(0, 0.72, 0.44);
  pallet.add(crateA, crateB, strap);
  pallet.visible = false;
  forks.add(pallet);

  // Seated driver in shop uniform.
  const driver = new THREE.Group();
  const torso = new THREE.Mesh(roundedBox(0.42, 0.52, 0.28, 0.06), uniform);
  torso.position.set(0, 1.48, -0.2);
  const vestMesh = new THREE.Mesh(roundedBox(0.36, 0.34, 0.03, 0.02), vest);
  vestMesh.position.set(0, 1.5, -0.05);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), skin);
  head.position.set(0, 1.86, -0.2);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.18, 0.1, 12), vest);
  cap.position.set(0, 1.96, -0.2);
  const brim = new THREE.Mesh(roundedBox(0.26, 0.03, 0.16, 0.01), vest);
  brim.position.set(0, 1.92, -0.06);
  const armL = new THREE.Mesh(roundedBox(0.1, 0.42, 0.12, 0.03), uniform);
  armL.position.set(-0.27, 1.52, 0.02);
  armL.rotation.x = -0.7;
  const armR = armL.clone();
  armR.position.x = 0.27;
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.025, 6, 16), dark);
  wheel.position.set(0, 1.56, 0.2);
  wheel.rotation.x = -0.35;
  driver.add(torso, vestMesh, head, cap, brim, armL, armR, wheel);
  forklift.add(driver);

  // Overhead guard and wheels.
  [-0.62, 0.62].forEach((x) => {
    [-0.45, 0.5].forEach((z) => {
      const post = new THREE.Mesh(roundedBox(0.08, 1.35, 0.08, 0.02), dark);
      post.position.set(x, 1.85, z);
      forklift.add(post);
    });
  });
  const guard = new THREE.Mesh(roundedBox(1.45, 0.08, 1.15, 0.02), dark);
  guard.position.set(0, 2.52, 0.02);
  forklift.add(guard);
  [0.55, -0.6].forEach((z) => {
    [-0.68, 0.68].forEach((x) => {
      const tyre = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.22, 14), tire);
      tyre.rotation.z = Math.PI / 2;
      tyre.position.set(x, 0.3, z);
      forklift.add(tyre);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.24, 10), steel);
      hub.rotation.z = Math.PI / 2;
      hub.position.set(x, 0.3, z);
      forklift.add(hub);
    });
  });

  forklift.traverse((object) => {
    object.userData.noStaticMerge = true;
    object.userData.dynamic = true;
    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.receiveShadow = false;
    }
  });
  return { forklift, forks, pallet };
}

function buildHydraulicPartsPile(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'hydraulic-install-parts';
  group.visible = false;
  const brass = new THREE.MeshStandardMaterial({ color: 0xc08a3e, roughness: 0.28, metalness: 0.82 });
  const red = new THREE.MeshStandardMaterial({ color: 0xb3261e, roughness: 0.44, metalness: 0.24 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x202224, roughness: 0.7, metalness: 0.3 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xcfd3d8, roughness: 0.22, metalness: 0.9 });
  const terminalRed = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.5 });
  const terminalBlack = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.5 });

  [-0.42, 0.42].forEach((x, index) => {
    const pump = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.5, 12), brass);
    pump.position.set(x, 0.34, 0.3 + index * 0.1);
    const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.34, 12), red);
    motor.position.set(x, 0.76, 0.3 + index * 0.1);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.14, 10), dark);
    cap.position.set(x, 0.98, 0.3 + index * 0.1);
    group.add(pump, motor, cap);
  });
  for (let i = 0; i < 4; i++) {
    const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 1.05, 10), steel);
    cylinder.rotation.z = Math.PI / 2;
    cylinder.rotation.y = 0.12 * i;
    cylinder.position.set(-0.1 + (i % 2) * 0.35, 0.12 + Math.floor(i / 2) * 0.16, -0.7);
    group.add(cylinder);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.42, 8), steel);
    rod.rotation.z = Math.PI / 2;
    rod.position.set(0.7 + (i % 2) * 0.35, 0.12 + Math.floor(i / 2) * 0.16, -0.7);
    group.add(rod);
  }
  for (let i = 0; i < 3; i++) {
    const battery = new THREE.Mesh(roundedBox(0.52, 0.34, 0.36, 0.03), dark);
    battery.position.set(-0.75 + i * 0.55, 0.19, 1.1);
    const pos = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.08, 8), terminalRed);
    pos.position.set(battery.position.x - 0.14, 0.38, 1.1);
    const neg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.08, 8), terminalBlack);
    neg.position.set(battery.position.x + 0.14, 0.38, 1.1);
    group.add(battery, pos, neg);
  }
  const relayBank = new THREE.Mesh(roundedBox(0.55, 0.16, 0.32, 0.02), dark);
  relayBank.position.set(0.7, 0.1, 0.95);
  group.add(relayBank);
  for (let i = 0; i < 4; i++) {
    const solenoid = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.18, 8), brass);
    solenoid.rotation.z = Math.PI / 2;
    solenoid.position.set(0.55 + i * 0.12, 0.24, 0.95);
    group.add(solenoid);
  }
  const lineCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.6, 0.1, 0.6),
    new THREE.Vector3(-0.1, 0.36, 0.4),
    new THREE.Vector3(0.4, 0.18, 0.0),
    new THREE.Vector3(0.9, 0.24, -0.2),
  ]);
  const line = new THREE.Mesh(new THREE.TubeGeometry(lineCurve, 18, 0.025, 6, false), red);
  group.add(line);
  const lineBlue = line.clone();
  lineBlue.material = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.4, metalness: 0.2 });
  lineBlue.position.y += 0.06;
  lineBlue.position.z -= 0.08;
  group.add(lineBlue);
  group.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  return group;
}

function buildStockSuspensionPile(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'stock-suspension-pile';
  group.visible = false;
  const rust = new THREE.MeshStandardMaterial({ color: 0x6b4a33, roughness: 0.92, metalness: 0.16 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a2b2c, roughness: 0.82, metalness: 0.2 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.5, metalness: 0.6 });
  for (let i = 0; i < 2; i++) {
    for (let coil = 0; coil < 5; coil++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.035, 6, 16), steel);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(-0.55 + i * 0.7, 0.09 + coil * 0.11, -0.2);
      group.add(ring);
    }
    const controlArm = new THREE.Mesh(roundedBox(0.7, 0.08, 0.16, 0.02), rust);
    controlArm.position.set(-0.55 + i * 0.7, 0.06, 0.45);
    controlArm.rotation.y = 0.35 - i * 0.7;
    group.add(controlArm);
    const shock = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.72, 8), dark);
    shock.rotation.z = Math.PI / 2;
    shock.position.set(-0.25 + i * 0.5, 0.12, 0.55);
    group.add(shock);
  }
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.8, 10), rust);
  axle.rotation.z = Math.PI / 2;
  axle.position.set(0, 0.12, 0.85);
  group.add(axle);
  group.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  return group;
}

function buildPartCrates(): THREE.Group[] {
  const crates: THREE.Group[] = [];
  const specs = [
    { title: 'Suspension', subtitle: 'hydraulic kit', color: 0x6f5c44 },
    { title: 'Body & Paint', subtitle: 'steel & candy', color: 0x7d4a3c },
    { title: 'Engine', subtitle: '& drivetrain', color: 0x4a5058 },
    { title: 'Interior & Roof', subtitle: 'hides & bows', color: 0x6b5a3d },
    { title: 'Wheels & Lights', subtitle: 'rims & lamps', color: 0x4f5a63 },
  ];
  const wood = new THREE.MeshStandardMaterial({ color: 0x8b6239, roughness: 0.9 });
  specs.forEach((spec, index) => {
    const group = new THREE.Group();
    group.name = `crescent-parts-crate-${index}`;
    const box = new THREE.Mesh(
      roundedBox(1.15, 0.8, 1.0, 0.04),
      new THREE.MeshStandardMaterial({ color: spec.color, roughness: 0.86, metalness: 0.05 }),
    );
    box.position.y = 0.42;
    const skid = new THREE.Mesh(roundedBox(1.25, 0.1, 1.1, 0.02), wood);
    skid.position.y = 0.06;
    const texture = crateLabelTexture(spec.title, spec.subtitle);
    if (texture) {
      const label = new THREE.Mesh(
        new THREE.PlaneGeometry(0.9, 0.46),
        new THREE.MeshBasicMaterial({ map: texture, transparent: true }),
      );
      label.position.set(0, 0.48, 0.51);
      group.add(label);
    }
    group.add(box, skid);
    group.position.set(index % 2 === 0 ? -0.72 : 0.72, 0, 0.6 + Math.floor(index / 2) * 1.05);
    if (index === 4) group.position.x = 0;
    group.visible = false;
    group.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
    crates.push(group);
  });
  return crates;
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

  // Paint and wrap booth extension east of the main bay. The car drives out
  // of the shop, across the apron and into the booth for paint.
  const paintBooth = new THREE.Group();
  paintBooth.name = 'bayou-royal-paint-booth';
  paintBooth.position.set(CUSTOM_SHOP_PAINT_BOOTH.x, 0, CUSTOM_SHOP_PAINT_BOOTH.z);
  const boothFloor = new THREE.Mesh(roundedBox(6.0, 0.14, 6.8, 0.03), floorMat);
  boothFloor.position.y = 0.07;
  const boothApron = new THREE.Mesh(roundedBox(6.4, 0.08, 3.4, 0.03), floorMat);
  boothApron.position.set(0, 0.04, 4.9);
  const boothBack = new THREE.Mesh(roundedBox(6.0, 3.5, 0.18, 0.03), wallMat);
  boothBack.position.set(0, 1.82, -3.38);
  const boothSideL = new THREE.Mesh(roundedBox(0.18, 3.5, 6.8, 0.03), wallMat);
  boothSideL.position.set(-3.0, 1.82, 0);
  const boothSideR = boothSideL.clone();
  boothSideR.position.x = 3.0;
  const boothRoof = new THREE.Mesh(roundedBox(6.3, 0.22, 7.0, 0.05), wallDarkMat);
  boothRoof.position.set(0, 3.62, 0);
  const boothHeader = new THREE.Mesh(roundedBox(6.0, 0.72, 0.24, 0.03), wallDarkMat);
  boothHeader.position.set(0, 3.18, 3.38);
  paintBooth.add(boothFloor, boothApron, boothBack, boothSideL, boothSideR, boothRoof, boothHeader);

  // Filter wall and wet-floor grate.
  for (let index = 0; index < 4; index++) {
    const filter = new THREE.Mesh(
      roundedBox(1.15, 2.2, 0.08, 0.02),
      new THREE.MeshStandardMaterial({ color: 0xd8d2bf, roughness: 0.96 }),
    );
    filter.position.set(-2.1 + index * 1.4, 1.9, -3.24);
    const frame = new THREE.Mesh(roundedBox(1.3, 2.35, 0.05, 0.02), blackMat);
    frame.position.set(filter.position.x, 1.9, -3.3);
    paintBooth.add(frame, filter);
  }
  const grate = new THREE.Mesh(roundedBox(2.8, 0.03, 2.2, 0.01), blackMat);
  grate.position.set(0, 0.15, -0.5);
  paintBooth.add(grate);

  // Roll-up door with slats; it lifts into the header when the car enters.
  const paintBoothDoor = new THREE.Group();
  paintBoothDoor.name = 'paint-booth-rollup-door';
  paintBoothDoor.position.set(0, 2.92, 3.36);
  const doorPanel = new THREE.Mesh(roundedBox(5.8, 2.85, 0.1, 0.02), wallDarkMat);
  doorPanel.position.y = 1.43;
  paintBoothDoor.add(doorPanel);
  for (let index = 0; index < 10; index++) {
    const slat = new THREE.Mesh(roundedBox(5.75, 0.05, 0.12, 0.01), blackMat);
    slat.position.set(0, 0.24 + index * 0.27, 0.03);
    paintBoothDoor.add(slat);
  }
  const doorHandle = new THREE.Mesh(roundedBox(0.9, 0.12, 0.12, 0.02), rustMat);
  doorHandle.position.set(0, 0.52, 0.09);
  paintBoothDoor.add(doorHandle);
  paintBooth.add(paintBoothDoor);

  // Ceiling lights, exhaust stack and a mixing bench.
  const paintBoothLight = new THREE.PointLight(0xfff1cf, 0.5, 9, 1.6);
  paintBoothLight.position.set(0, 3.0, 0.4);
  paintBooth.add(paintBoothLight);
  for (const x of [-1.6, 1.6]) {
    const tube = new THREE.Mesh(
      roundedBox(2.2, 0.06, 0.22, 0.01),
      warmLightMat,
    );
    tube.position.set(x, 3.5, 0.7);
    paintBooth.add(tube);
  }
  const exhaust = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.4, 3.2, 12),
    rustMat,
  );
  exhaust.position.set(2.1, 3.9, -2.1);
  paintBooth.add(exhaust);
  const mixer = new THREE.Mesh(roundedBox(1.7, 0.85, 0.7, 0.04), blackMat);
  mixer.position.set(-2.15, 0.55, 1.1);
  const mixTop = new THREE.Mesh(roundedBox(1.8, 0.08, 0.8, 0.02), woodTexMaterial(woodTex));
  mixTop.position.set(-2.15, 0.99, 1.1);
  paintBooth.add(mixer, mixTop);
  for (let index = 0; index < 5; index++) {
    const can = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 0.26, 10),
      index % 2 === 0 ? rustMat : wallDarkMat,
    );
    can.position.set(-2.75 + index * 0.26, 1.16, 1.0);
    paintBooth.add(can);
  }
  const paintSign = crateLabelTexture('PAINT & WRAP', 'booth 02 · dust-controlled');
  if (paintSign) {
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(3.3, 0.9),
      new THREE.MeshBasicMaterial({ map: paintSign, transparent: true }),
    );
    sign.position.set(0, 3.36, 3.51);
    paintBooth.add(sign);
  }
  addShadow(paintBooth);
  group.add(paintBooth);

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
    true,
  );
  liftCar.position.set(0, 0.46, 0.35);
  liftCar.scale.setScalar(0.92);
  group.add(liftCar);
  liftCar.userData.noStaticMerge = true;
  liftCar.userData.dynamic = true;
  const liftCarTrunk = (liftCar.userData.trunkLid as THREE.Group | undefined) ?? null;
  const liftCarHood = (liftCar.userData.hoodLid as THREE.Group | undefined) ?? null;
  const liftCarDoors = (liftCar.userData.doors as THREE.Group[] | undefined) ?? [];
  const liftCarFenders = (liftCar.userData.fenders as THREE.Object3D[] | undefined) ?? [];
  const liftCarQuarters = (liftCar.userData.quarters as THREE.Object3D[] | undefined) ?? [];
  const liftCarGlass = (liftCar.userData.glass as THREE.Object3D | undefined) ?? null;
  const liftCarEngine = (liftCar.userData.engine as THREE.Object3D | undefined) ?? null;
  const liftCarTrash = (liftCar.userData.trash as THREE.Object3D[] | undefined) ?? [];
  const liftCarWheels = (liftCar.userData.wheels as THREE.Group[] | undefined) ?? [];

  // Parts staged under the lift: stock suspension comes off first, then the
  // hydraulic kit goes into the trunk.
  const stockSuspensionPile = buildStockSuspensionPile();
  stockSuspensionPile.position.set(-1.75, 0.06, -0.9);
  const hydraulicParts = buildHydraulicPartsPile();
  hydraulicParts.position.set(1.55, 0.06, -0.7);
  group.add(stockSuspensionPile, hydraulicParts);

  const partCrates = buildPartCrates();
  const crateRack = new THREE.Group();
  crateRack.name = 'crescent-parts-crates';
  crateRack.position.set(4.25, 0.04, 6.1);
  crateRack.rotation.y = -Math.PI / 2;
  partCrates.forEach((crate) => crateRack.add(crate));
  group.add(crateRack);

  // Crescent City freight landing: gravel road, pier and moored parts barge.
  // The bank at the dock mouth is dry; use the deepest water under the pier
  // tip so the deck clears the channel instead of sitting in the mud.
  const freightWaterY = Math.max(
    getWaterLevelAt(CUSTOM_FREIGHT_DOCK.x, CUSTOM_FREIGHT_DOCK.z),
    getWaterLevelAt(95.4, 149.8),
    getWaterLevelAt(
      CUSTOM_FREIGHT_SHIP_MOORING.x,
      CUSTOM_FREIGHT_SHIP_MOORING.z,
    ),
  );
  const freightDeckWorldY =
    freightWaterY + CUSTOM_FREIGHT_PIER_DECK_ABOVE_WATER;
  const freightDeckY = freightDeckWorldY - groundY;
  const pier = new THREE.Group();
  pier.name = 'bayou-royal-freight-pier';
  const pierDeckX = CUSTOM_FREIGHT_DOCK.x + 1.4 - CUSTOM_SHOP_POS.x;
  const pierDeckZ = CUSTOM_FREIGHT_DOCK.z - CUSTOM_SHOP_POS.z;
  const pierPlankMat = new THREE.MeshStandardMaterial({
    color: 0x7c6849,
    roughness: 0.9,
    metalness: 0.04,
  });
  for (let i = 0; i < 17; i++) {
    const plank = new THREE.Mesh(roundedBox(0.38, 0.09, 4.0, 0.015), pierPlankMat);
    plank.position.set(
      pierDeckX - 3.2 + i * 0.4,
      freightDeckY + 0.02,
      pierDeckZ,
    );
    pier.add(plank);
  }
  const pierBeam = new THREE.Mesh(roundedBox(7.0, 0.18, 0.24, 0.03), wallDarkMat);
  pierBeam.position.set(pierDeckX, freightDeckY - 0.12, pierDeckZ - 1.9);
  const pierBeamB = pierBeam.clone();
  pierBeamB.position.z = pierDeckZ + 1.9;
  pier.add(pierBeam, pierBeamB);
  for (const xOff of [-3.0, -1.0, 1.0, 3.0]) {
    for (const zOff of [-1.7, 1.7]) {
      const worldX = CUSTOM_SHOP_POS.x + pierDeckX + xOff;
      const worldZ = CUSTOM_SHOP_POS.z + pierDeckZ + zOff;
      const seabed = getTerrainHeight(worldX, worldZ) - groundY;
      const height = Math.max(0.4, freightDeckY - seabed);
      const piling = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.19, height, 8),
        pierPlankMat,
      );
      piling.position.set(pierDeckX + xOff, seabed + height / 2, pierDeckZ + zOff);
      pier.add(piling);
    }
  }
  const pierRamp = new THREE.Mesh(roundedBox(2.6, 0.12, 4.0, 0.03), pierPlankMat);
  pierRamp.position.set(pierDeckX - 4.2, freightDeckY + 0.28, pierDeckZ);
  pierRamp.rotation.z = 0.2;
  pier.add(pierRamp);
  [-1.5, 1.5].forEach((zOff) => {
    const bollard = new THREE.Mesh(
      new THREE.CylinderGeometry(0.17, 0.2, 0.6, 10),
      blackMat,
    );
    bollard.position.set(pierDeckX + 3.2, freightDeckY + 0.34, pierDeckZ + zOff);
    pier.add(bollard);
  });
  const pierLight = new THREE.PointLight(0xffc27a, 1.35, 15, 1.7);
  pierLight.position.set(pierDeckX + 1.0, freightDeckY + 3.0, pierDeckZ);
  const pierLampPost = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.09, 3.2, 8),
    blackMat,
  );
  pierLampPost.position.set(pierDeckX + 1.0, freightDeckY + 1.6, pierDeckZ);
  const pierLampHead = new THREE.Mesh(roundedBox(0.5, 0.14, 0.3, 0.02), warmLightMat);
  pierLampHead.position.set(pierDeckX + 1.0, freightDeckY + 3.22, pierDeckZ);
  pier.add(pierLight, pierLampPost, pierLampHead);

  // Gravel freight road from the apron to the pier.
  const freightRoad = new THREE.Group();
  const gravelMat = new THREE.MeshStandardMaterial({
    color: 0x6b6257,
    roughness: 0.98,
    metalness: 0.02,
  });
  for (const point of CUSTOM_FREIGHT_ROUTE) {
    const worldY = getTerrainHeight(point.x, point.z);
    if (worldY < freightWaterY + 0.4) continue;
    const patch = new THREE.Mesh(new THREE.CircleGeometry(2.5, 14), gravelMat);
    patch.rotation.x = -Math.PI / 2;
    patch.position.set(
      point.x - CUSTOM_SHOP_POS.x,
      worldY - groundY + 0.025,
      point.z - CUSTOM_SHOP_POS.z,
    );
    freightRoad.add(patch);
  }
  // Fill the long gaps between waypoints with overlapping road patches.
  for (let i = 0; i < CUSTOM_FREIGHT_ROUTE.length - 1; i++) {
    const a = CUSTOM_FREIGHT_ROUTE[i];
    const b = CUSTOM_FREIGHT_ROUTE[i + 1];
    const segments = Math.max(2, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 3));
    for (let s = 1; s < segments; s++) {
      const t = s / segments;
      const x = a.x + (b.x - a.x) * t;
      const z = a.z + (b.z - a.z) * t;
      const worldY = getTerrainHeight(x, z);
      if (worldY < freightWaterY + 0.4) continue;
      const patch = new THREE.Mesh(new THREE.CircleGeometry(2.35, 12), gravelMat);
      patch.rotation.x = -Math.PI / 2;
      patch.position.set(x - CUSTOM_SHOP_POS.x, worldY - groundY + 0.025, z - CUSTOM_SHOP_POS.z);
      freightRoad.add(patch);
    }
  }
  // The auction shell rides the pier on a huge timber tray under plastic wrap.
  const { cargo: wrappedShell } = buildWrappedShellCargo(
    new THREE.MeshStandardMaterial({ color: 0x5c5148, roughness: 0.92 }),
    new THREE.MeshStandardMaterial({ color: 0x8a4b2d, roughness: 0.99 }),
    glassMat,
    tireMat,
  );
  wrappedShell.position.set(pierDeckX + 0.6, freightDeckY + 0.03, pierDeckZ + 0.2);
  pier.add(wrappedShell);
  const engineCrate = buildEngineCrate();
  engineCrate.position.set(pierDeckX - 2.3, freightDeckY + 0.05, pierDeckZ + 1.4);
  pier.add(engineCrate);

  const { ship: cargoShip, containers: cargoShipContainers } = buildFreightShip();
  const shipPoint = getCustomShopShipRoutePoint(1);
  cargoShip.position.set(
    CUSTOM_FREIGHT_SHIP_MOORING.x - CUSTOM_SHOP_POS.x,
    freightWaterY - groundY,
    CUSTOM_FREIGHT_SHIP_MOORING.z - CUSTOM_SHOP_POS.z,
  );
  cargoShip.rotation.y = shipPoint.yaw;
  cargoShip.visible = false;
  const { ship: redCargoShip } = buildFreightShip({
    hullColor: 0x8f2a20,
    stripeColor: 0xe9dcc0,
    name: 'red-crescent-deep-water-freighter',
  });
  redCargoShip.position.set(
    CUSTOM_FREIGHT_SHIP_MOORING.x - CUSTOM_SHOP_POS.x + 18,
    freightWaterY - groundY,
    CUSTOM_FREIGHT_SHIP_MOORING.z - CUSTOM_SHOP_POS.z + 12,
  );
  redCargoShip.rotation.y = Math.PI * 0.35;
  group.add(redCargoShip);
  const { forklift, forks: forkliftForks, pallet: forkliftPallet } = buildShopForklift();
  const forkliftShellPallet = new THREE.Group();
  forkliftShellPallet.name = 'forklift-shell-pallet';
  const miniShellCargo = buildWrappedShellCargo(
    new THREE.MeshStandardMaterial({ color: 0x5c5148, roughness: 0.92 }),
    new THREE.MeshStandardMaterial({ color: 0x8a4b2d, roughness: 0.99 }),
    glassMat,
    tireMat,
  ).cargo;
  miniShellCargo.scale.setScalar(0.38);
  miniShellCargo.position.set(0, 0.14, 0.5);
  forkliftShellPallet.add(miniShellCargo);
  forkliftShellPallet.visible = false;
  forkliftForks.add(forkliftShellPallet);
  forklift.position.set(
    CUSTOM_FREIGHT_ROUTE[0].x - CUSTOM_SHOP_POS.x,
    getTerrainHeight(CUSTOM_FREIGHT_ROUTE[0].x, CUSTOM_FREIGHT_ROUTE[0].z) - groundY,
    CUSTOM_FREIGHT_ROUTE[0].z - CUSTOM_SHOP_POS.z,
  );
  forklift.rotation.y = Math.atan2(
    CUSTOM_FREIGHT_ROUTE[1].x - CUSTOM_FREIGHT_ROUTE[0].x,
    CUSTOM_FREIGHT_ROUTE[1].z - CUSTOM_FREIGHT_ROUTE[0].z,
  );
  group.add(pier, freightRoad, cargoShip, forklift);

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

  // Paint booth walls: the south face stays open for the car and painters.
  const boothWorldX = CUSTOM_SHOP_POS.x + CUSTOM_SHOP_PAINT_BOOTH.x;
  const boothWorldZ = CUSTOM_SHOP_POS.z + CUSTOM_SHOP_PAINT_BOOTH.z;
  for (let z = -2.9; z <= 3.3; z += 0.75) {
    colliders.push(
      { x: boothWorldX - 3.0, z: boothWorldZ + z, radius: 0.55, minY: wallMinY, maxY: wallMaxY },
      { x: boothWorldX + 3.0, z: boothWorldZ + z, radius: 0.55, minY: wallMinY, maxY: wallMaxY },
    );
  }
  for (let x = -2.8; x <= 2.8; x += 0.75) {
    colliders.push({
      x: boothWorldX + x,
      z: boothWorldZ - 3.35,
      radius: 0.55,
      minY: wallMinY,
      maxY: wallMaxY,
    });
  }

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
    liftCarTrunk,
    liftCarHood,
    liftCarDoors,
    liftCarFenders,
    liftCarQuarters,
    liftCarGlass,
    liftCarEngine,
    liftCarTrash,
    liftCarWheels,
    hydraulicParts,
    stockSuspensionPile,
    partCrates,
    cargoShip,
    cargoShipContainers,
    forklift,
    forkliftForks,
    forkliftPallet,
    forkliftShellPallet,
    wrappedShell,
    paintBooth,
    paintBoothDoor,
    paintBoothLight,
    redCargoShip,
    freightDeckY: freightDeckWorldY,
    setStatus,
  };
}

/** Swaps the lift car's visible rust/dents/fire/trash to match the chosen donor. */
export function applyCustomShopDonorDamage(
  shop: CustomCarShopHandles,
  damage: DonorDamageProfile,
): void {
  const root = shop.liftCar;
  const roofCollapse = root.userData.roofCollapse as THREE.Object3D | undefined;
  if (roofCollapse) roofCollapse.visible = damage.collapsedRoof;

  const dents = root.userData.dents as THREE.Group | undefined;
  dents?.children.forEach((child, index) => {
    child.visible = index < damage.dents;
  });

  const holes = root.userData.holes as THREE.Group | undefined;
  holes?.children.forEach((child, index) => {
    child.visible = Math.floor(index / 2) < damage.rustHoles;
  });

  const fire = root.userData.fire as THREE.Object3D | undefined;
  if (fire) fire.visible = damage.fireDamage;

  const trash = root.userData.trash as THREE.Object3D[] | undefined;
  const leaves = damage.trash === 'leaves' || damage.trash === 'both';
  const poop = damage.trash === 'poop' || damage.trash === 'both';
  root.userData.trashFlags = { leaves, poop };
  if (trash) {
    if (trash[0]) trash[0].visible = leaves;
    if (trash[1]) trash[1].visible = poop;
  }

  const glass = root.userData.glass as THREE.Group | undefined;
  glass?.children.forEach((child) => {
    child.visible =
      child.name === 'windshield-glass' || !damage.glassMissing;
  });
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
