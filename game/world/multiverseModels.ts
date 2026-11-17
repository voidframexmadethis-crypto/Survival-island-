import * as THREE from 'three';
import { DimensionId, ItemId, PortalLinkState } from '../types';
import {
  DIMENSION_DEFINITIONS,
  SPACE_ASTEROID_PADS,
  getDimensionTerrainHeight,
} from '../systems/multiverse';
import { OCEAN_LEVEL } from './terrain';

export interface PortalGunMeshHandle {
  group: THREE.Group;
  coreMat: THREE.MeshStandardMaterial;
  coreSphere: THREE.Mesh;
  ringMesh: THREE.Mesh;
  dialMat: THREE.MeshStandardMaterial;
}

export interface PortalVortexHandle {
  id: string;
  group: THREE.Group;
  vortexDisc: THREE.Mesh;
  outerRing: THREE.Mesh;
  innerRing: THREE.Mesh;
  particles: THREE.Points;
  light: THREE.PointLight;
  update: (elapsed: number, dt: number) => void;
}

export interface RealmHarvestableNode {
  id: string;
  label: string;
  x: number;
  y: number;
  z: number;
  radius: number;
  grants: { itemId: ItemId; quantity: number }[];
  collected: boolean;
  respawnTimer: number;
  mesh: THREE.Group;
}

export interface RealmGuardianActor {
  id: string;
  name: string;
  dim: DimensionId;
  x: number;
  y: number;
  z: number;
  homeX: number;
  homeZ: number;
  yaw: number;
  hp: number;
  maxHp: number;
  speed: number;
  attackDamage: number;
  attackCooldown: number;
  respawnTimer: number;
  alive: boolean;
  hitFlash: number;
  dropItem: ItemId;
  dropQty: number;
  bonusDrop?: ItemId;
  mesh: THREE.Group;
  limbs: THREE.Object3D[];
}

export interface DimensionWorldHandle {
  dim: DimensionId;
  root: THREE.Group;
  terrainMesh: THREE.Mesh;
  colliders: { x: number; z: number; radius: number }[];
  harvestables: RealmHarvestableNode[];
  guardians: RealmGuardianActor[];
  animatedPoints?: THREE.Points;
  animatedSpins: THREE.Object3D[];
  lavaMesh?: THREE.Mesh;
}

function seededRand(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function createVortexCanvasTexture(primaryHex: string, secondaryHex: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 256, 256);
    const cx = 128;
    const cy = 128;

    const bgGrad = ctx.createRadialGradient(cx, cy, 8, cx, cy, 124);
    bgGrad.addColorStop(0, '#ffffff');
    bgGrad.addColorStop(0.24, secondaryHex);
    bgGrad.addColorStop(0.68, primaryHex);
    bgGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = bgGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 124, 0, Math.PI * 2);
    ctx.fill();

    // Spiral arms
    for (let arm = 0; arm < 5; arm++) {
      ctx.beginPath();
      const baseA = (arm / 5) * Math.PI * 2;
      for (let t = 0; t <= 42; t++) {
        const frac = t / 42;
        const r = frac * 116;
        const angle = baseA + frac * Math.PI * 3.1;
        const px = cx + Math.cos(angle) * r;
        const py = cy + Math.sin(angle) * r;
        if (t === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = arm % 2 === 0 ? 'rgba(255,255,255,0.72)' : secondaryHex;
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createPortalGunFirstPersonMesh(): PortalGunMeshHandle {
  const group = new THREE.Group();
  group.position.set(0, 0.03, -0.08);

  const shellMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.25,
    metalness: 0.65,
  });
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.35,
    metalness: 0.85,
  });
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0x8b5cf6,
    emissive: 0x8b5cf6,
    emissiveIntensity: 1.85,
    roughness: 0.15,
    metalness: 0.1,
  });
  const dialMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x38bdf8,
    emissiveIntensity: 1.5,
    roughness: 0.2,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    transparent: true,
    opacity: 0.36,
    roughness: 0.12,
    metalness: 0.2,
  });

  // Main sleek receiver chassis
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.072, 0.26), shellMat);
  chassis.position.set(0, 0.055, -0.05);
  group.add(chassis);

  // Rear dark grip & stock cap
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.13, 0.064), darkMetalMat);
  grip.rotation.x = 0.28;
  grip.position.set(0, -0.025, 0.02);
  group.add(grip);

  // Glowing glass chamber holding dimensional fluid core
  const chamberGlass = new THREE.Mesh(
    new THREE.CylinderGeometry(0.028, 0.028, 0.13, 12),
    glassMat,
  );
  chamberGlass.rotation.x = Math.PI / 2;
  chamberGlass.position.set(0, 0.095, -0.08);
  group.add(chamberGlass);

  const coreSphere = new THREE.Mesh(new THREE.SphereGeometry(0.024, 12, 10), coreMat);
  coreSphere.scale.set(0.95, 0.95, 1.85);
  coreSphere.position.set(0, 0.095, -0.08);
  group.add(coreSphere);

  // Front barrel shroud & rotating emitter ring
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.026, 0.032, 0.18, 12),
    darkMetalMat,
  );
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.062, -0.24);
  group.add(barrel);

  const ringMesh = new THREE.Mesh(
    new THREE.TorusGeometry(0.044, 0.007, 8, 18),
    coreMat,
  );
  ringMesh.position.set(0, 0.062, -0.34);
  group.add(ringMesh);

  // 3 emitter prongs angled forward
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
    const prong = new THREE.Mesh(new THREE.BoxGeometry(0.011, 0.011, 0.075), darkMetalMat);
    prong.position.set(
      Math.cos(a) * 0.038,
      0.062 + Math.sin(a) * 0.038,
      -0.355,
    );
    prong.lookAt(0, 0.062, -0.45);
    group.add(prong);
  }

  // Top selector dial
  const dialBase = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.015, 10), darkMetalMat);
  dialBase.position.set(0, 0.1, 0.03);
  const dialGlow = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.018, 10), dialMat);
  dialGlow.position.set(0, 0.105, 0.03);
  group.add(dialBase, dialGlow);

  return { group, coreMat, coreSphere, ringMesh, dialMat };
}

export function createAlienPlasmaGunFirstPersonMesh(): THREE.Group {
  const group = new THREE.Group();
  group.position.set(0, 0.025, -0.07);

  const xenoBodyMat = new THREE.MeshStandardMaterial({
    color: 0x3b0764,
    roughness: 0.32,
    metalness: 0.72,
  });
  const plasmaGlowMat = new THREE.MeshStandardMaterial({
    color: 0x2dd4bf,
    emissive: 0x14b8a6,
    emissiveIntensity: 1.9,
    roughness: 0.15,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xc4b5fd,
    roughness: 0.22,
    metalness: 0.9,
  });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.068, 0.32), xenoBodyMat);
  body.position.set(0, 0.06, -0.1);
  group.add(body);

  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.13, 0.06), xenoBodyMat);
  grip.rotation.x = 0.28;
  grip.position.set(0, -0.02, 0.01);
  group.add(grip);

  // Twin side plasma rails & glowing coils
  for (const s of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.022, 0.34), chromeMat);
    rail.position.set(s * 0.036, 0.068, -0.15);
    group.add(rail);
  }
  for (let i = 0; i < 4; i++) {
    const coil = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.005, 6, 12), plasmaGlowMat);
    coil.position.set(0, 0.066, -0.14 - i * 0.055);
    group.add(coil);
  }
  const muzzleCore = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), plasmaGlowMat);
  muzzleCore.position.set(0, 0.066, -0.35);
  group.add(muzzleCore);

  return group;
}

export function createInfernoBladeMesh(): THREE.Group {
  const group = new THREE.Group();
  group.position.set(0, 0.25, -0.25);
  group.rotation.x = -Math.PI / 4;

  const obsidianMat = new THREE.MeshStandardMaterial({
    color: 0x1c1917,
    roughness: 0.45,
    metalness: 0.78,
  });
  const magmaMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    emissive: 0xea580c,
    emissiveIntensity: 1.85,
    roughness: 0.2,
  });

  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.028, 0.045), obsidianMat);
  guard.position.set(0, -0.11, 0);
  const bladeCore = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.44, 0.014), obsidianMat);
  bladeCore.position.set(0, 0.12, 0);
  const magmaEdge = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.43, 0.008), magmaMat);
  magmaEdge.position.set(0, 0.13, 0);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.11, 4), magmaMat);
  tip.position.set(0, 0.39, 0);
  group.add(guard, bladeCore, magmaEdge, tip);

  return group;
}

export function createPortalVortexMesh(portal: PortalLinkState): PortalVortexHandle {
  const destDef = DIMENSION_DEFINITIONS[portal.targetDim];
  const group = new THREE.Group();
  group.position.set(portal.x, portal.y, portal.z);
  group.rotation.y = portal.yaw;

  const tex = createVortexCanvasTexture(destDef.primaryColor, destDef.secondaryColor);
  const vortexMat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    opacity: 0.94,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  // 2.6m wide x 3.6m tall doorway sized cleanly for both walking players AND vehicles (Lowrider, DONK, SLAB)
  const vortexDisc = new THREE.Mesh(new THREE.CircleGeometry(1.72, 32), vortexMat);
  vortexDisc.scale.set(1.05, 1.32, 1);
  vortexDisc.position.y = 2.25;
  group.add(vortexDisc);

  const ringMat = new THREE.MeshStandardMaterial({
    color: destDef.primaryHex,
    emissive: destDef.primaryHex,
    emissiveIntensity: 1.7,
    roughness: 0.25,
    metalness: 0.55,
  });
  const outerRing = new THREE.Mesh(new THREE.TorusGeometry(1.76, 0.09, 10, 36), ringMat);
  outerRing.scale.set(1.05, 1.32, 1);
  outerRing.position.y = 2.25;
  group.add(outerRing);

  const innerMat = new THREE.MeshStandardMaterial({
    color: destDef.secondaryHex,
    emissive: destDef.secondaryHex,
    emissiveIntensity: 1.9,
    roughness: 0.2,
  });
  const innerRing = new THREE.Mesh(new THREE.TorusGeometry(1.42, 0.045, 8, 32), innerMat);
  innerRing.scale.set(1.05, 1.32, 1);
  innerRing.position.y = 2.25;
  group.add(innerRing);

  // Orbiting glowing energy sparks
  const pCount = 48;
  const pPos = new Float32Array(pCount * 3);
  for (let i = 0; i < pCount; i++) {
    const a = (i / pCount) * Math.PI * 2;
    const r = 1.55 + (i % 4) * 0.22;
    pPos[i * 3] = Math.cos(a) * r;
    pPos[i * 3 + 1] = 2.25 + Math.sin(a) * r * 1.25;
    pPos[i * 3 + 2] = ((i % 5) - 2) * 0.14;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const pMat = new THREE.PointsMaterial({
    color: destDef.secondaryHex,
    size: 0.16,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  });
  const particles = new THREE.Points(pGeo, pMat);
  group.add(particles);

  // Anchor pedestal glow at base
  const padMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    emissive: destDef.primaryHex,
    emissiveIntensity: 0.55,
    roughness: 0.4,
    metalness: 0.7,
  });
  const basePad = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 2.15, 0.14, 18), padMat);
  basePad.position.y = 0.05;
  group.add(basePad);

  const light = new THREE.PointLight(destDef.primaryHex, 2.8, 16);
  light.position.set(0, 2.3, 0.8);
  group.add(light);

  return {
    id: portal.id,
    group,
    vortexDisc,
    outerRing,
    innerRing,
    particles,
    light,
    update: (elapsed: number, dt: number) => {
      vortexDisc.rotation.z -= dt * 1.85;
      innerRing.rotation.z += dt * 1.2;
      particles.rotation.z += dt * 0.9;
      const pulse = 1 + Math.sin(elapsed * 4.2) * 0.045;
      vortexDisc.scale.set(1.05 * pulse, 1.32 * pulse, 1);
      light.intensity = 2.4 + Math.sin(elapsed * 5.0) * 0.65;
    },
  };
}

function buildCrystalNodeMesh(colorHex: number, scale = 1): THREE.Group {
  const g = new THREE.Group();
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.85,
  });
  const crystalMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    emissive: colorHex,
    emissiveIntensity: 0.85,
    roughness: 0.14,
    metalness: 0.25,
    transparent: true,
    opacity: 0.88,
  });

  const base = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55 * scale, 0), baseMat);
  base.scale.set(1.2, 0.45, 1.2);
  base.position.y = 0.18 * scale;
  g.add(base);

  const offsets = [
    [0, 0.78, 0, 0, 0, 0.28, 1.35],
    [0.24, 0.56, 0.14, 0.22, -0.35, 0.19, 0.92],
    [-0.22, 0.52, -0.18, -0.25, 0.3, 0.18, 0.85],
  ];
  for (const [ox, oy, oz, rx, rz, rad, h] of offsets) {
    const shard = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02 * scale, rad * scale, h * scale, 6),
      crystalMat,
    );
    shard.position.set(ox * scale, oy * scale, oz * scale);
    shard.rotation.set(rx, ox * 2, rz);
    g.add(shard);
  }
  return g;
}

function buildGoldBarPedestalMesh(): THREE.Group {
  const g = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.5, metalness: 0.45 });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xca8a04,
    emissiveIntensity: 0.45,
    roughness: 0.18,
    metalness: 0.94,
  });

  const ped = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.85, 1.3), stoneMat);
  ped.position.y = 0.42;
  g.add(ped);

  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 3 - row; i++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.16, 0.24), goldMat);
      bar.position.set((i - (2 - row) * 0.5) * 0.28, 0.94 + row * 0.17, 0);
      bar.rotation.y = (i % 2 === 0 ? 1 : -1) * 0.08;
      g.add(bar);
    }
  }
  return g;
}

function buildCrashedSaucerMesh(x: number, y: number, z: number, tilt: number): THREE.Group {
  const saucer = new THREE.Group();
  saucer.position.set(x, y + 0.55, z);
  saucer.rotation.set(tilt, 0.5, -tilt * 0.65);

  const hullMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.22,
    metalness: 0.88,
  });
  const darkAlloy = new THREE.MeshStandardMaterial({
    color: 0x312e81,
    roughness: 0.35,
    metalness: 0.72,
  });
  const glowMat = new THREE.MeshStandardMaterial({
    color: 0x2dd4bf,
    emissive: 0x2dd4bf,
    emissiveIntensity: 1.8,
    roughness: 0.18,
  });
  const domeMat = new THREE.MeshStandardMaterial({
    color: 0xc084fc,
    emissive: 0x7e22ce,
    emissiveIntensity: 0.5,
    transparent: true,
    opacity: 0.62,
    roughness: 0.12,
  });

  const disc = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 5.2, 0.85, 24), hullMat);
  disc.scale.y = 0.75;
  saucer.add(disc);

  const lowerRim = new THREE.Mesh(new THREE.CylinderGeometry(5.1, 3.2, 0.65, 24), darkAlloy);
  lowerRim.position.y = -0.45;
  saucer.add(lowerRim);

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(2.1, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
    domeMat,
  );
  dome.position.y = 0.35;
  saucer.add(dome);

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const pod = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), glowMat);
    pod.position.set(Math.cos(a) * 4.5, 0.05, Math.sin(a) * 4.5);
    saucer.add(pod);
  }
  return saucer;
}

function buildGuardianMesh(
  dim: DimensionId,
): { mesh: THREE.Group; limbs: THREE.Object3D[] } {
  const g = new THREE.Group();
  const isAlien = dim === 'alien';
  const isNether = dim === 'nether';
  const isGold = dim === 'gold';
  const isDiamond = dim === 'diamond';

  const bodyHex = isNether
    ? 0x7f1d1d
    : isAlien
      ? 0x4c1d95
      : isGold
        ? 0xd97706
        : isDiamond
          ? 0x0284c7
          : 0x475569;
  const glowHex = isNether
    ? 0xf97316
    : isAlien
      ? 0x2dd4bf
      : isGold
        ? 0xfef08a
        : isDiamond
          ? 0x67e8f9
          : 0xef4444;

  const armorMat = new THREE.MeshStandardMaterial({
    color: bodyHex,
    roughness: isGold || isDiamond ? 0.24 : 0.6,
    metalness: isGold ? 0.88 : 0.45,
  });
  const eyeMat = new THREE.MeshStandardMaterial({
    color: glowHex,
    emissive: glowHex,
    emissiveIntensity: 1.9,
    roughness: 0.2,
  });

  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(isAlien ? 0.68 : 0.92, isAlien ? 0.95 : 1.1, 0.54),
    armorMat,
  );
  torso.position.y = 1.28;
  g.add(torso);

  const chestCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), eyeMat);
  chestCore.position.set(0, 1.32, 0.28);
  g.add(chestCore);

  const head = new THREE.Mesh(
    isAlien
      ? new THREE.SphereGeometry(0.32, 12, 10)
      : new THREE.BoxGeometry(0.48, 0.48, 0.48),
    armorMat,
  );
  if (isAlien) head.scale.set(1.15, 1.25, 1.0);
  head.position.set(0, 2.08, 0.04);
  g.add(head);

  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 6), eyeMat);
    eye.position.set(s * 0.12, 2.1, 0.27);
    g.add(eye);
  }

  if (isNether) {
    for (const s of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.42, 6), eyeMat);
      horn.position.set(s * 0.22, 2.42, 0);
      horn.rotation.z = -s * 0.35;
      g.add(horn);
    }
  }

  const limbs: THREE.Object3D[] = [];
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.78, 0.32), armorMat);
    leg.position.set(s * 0.24, 0.4, 0);
    g.add(leg);
    limbs.push(leg);

    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.82, 0.26), armorMat);
    arm.position.set(s * 0.62, 1.22, 0);
    g.add(arm);
    limbs.push(arm);
  }

  return { mesh: g, limbs };
}

export function buildDimensionWorld(
  dim: DimensionId,
  renderer: THREE.WebGLRenderer,
): DimensionWorldHandle {
  const root = new THREE.Group();
  const rand = seededRand(
    dim.split('').reduce((acc, ch) => acc * 31 + ch.charCodeAt(0), 77),
  );
  const colliders: { x: number; z: number; radius: number }[] = [];
  const harvestables: RealmHarvestableNode[] = [];
  const guardians: RealmGuardianActor[] = [];
  const animatedSpins: THREE.Object3D[] = [];

  // 1. Sculpted vertex-colored terrain
  const size = 340;
  const segs = 112;
  const terrainGeo = new THREE.PlaneGeometry(size, size, segs, segs);
  terrainGeo.rotateX(-Math.PI / 2);
  const pos = terrainGeo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = getDimensionTerrainHeight(dim, x, z);
    pos.setY(i, h);

    if (dim === 'space') {
      c.setHex(h > 3 ? 0x6366f1 : h > 0 ? 0x334155 : 0x0f172a);
    } else if (dim === 'nether') {
      c.setHex(h < 0.2 ? 0xea580c : h > 5 ? 0x1c1917 : 0x451a03);
    } else if (dim === 'gold') {
      c.setHex(h > 3.5 ? 0xfacc15 : h < 0 ? 0xb45309 : 0xeab308);
    } else if (dim === 'diamond') {
      c.setHex(h > 3 ? 0x67e8f9 : 0x0e7490);
    } else if (dim === 'alien') {
      c.setHex(h > 3 ? 0x7e22ce : h < 1.2 ? 0x0f766e : 0x3b0764);
    } else if (dim === 'island_arctic') {
      c.setHex(h < -0.1 ? 0x94a3b8 : h > 5 ? 0xf8fafc : 0xe2e8f0);
    } else if (dim === 'island_volcanic') {
      c.setHex(h < -0.1 ? 0x292524 : h > 7 ? 0x7c2d12 : 0x44403c);
    } else {
      c.setHex(h < 0.1 ? 0xd9c28b : h > 4 ? 0x15803d : 0x3f7a2c);
    }
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  terrainGeo.computeVertexNormals();

  const terrainMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: dim === 'gold' ? 0.28 : dim === 'diamond' ? 0.24 : 0.82,
    metalness: dim === 'gold' ? 0.72 : dim === 'diamond' ? 0.35 : 0.08,
  });
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  root.add(terrainMesh);

  let lavaMesh: THREE.Mesh | undefined;
  let animatedPoints: THREE.Points | undefined;

  // Water or Lava Plane
  if (DIMENSION_DEFINITIONS[dim].hasOcean) {
    const waterColor =
      dim === 'gold'
        ? 0xfbbf24
        : dim === 'island_arctic'
          ? 0x0c4a6e
          : dim === 'island_volcanic'
            ? 0x1e293b
            : 0x0e7490;
    const oceanMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(520, 520),
      new THREE.MeshStandardMaterial({
        color: waterColor,
        roughness: 0.18,
        metalness: dim === 'gold' ? 0.65 : 0.25,
        transparent: true,
        opacity: dim === 'gold' ? 0.88 : 0.82,
      }),
    );
    oceanMesh.rotation.x = -Math.PI / 2;
    oceanMesh.position.y = OCEAN_LEVEL;
    root.add(oceanMesh);
  }

  if (dim === 'nether') {
    lavaMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(380, 380),
      new THREE.MeshStandardMaterial({
        color: 0xf97316,
        emissive: 0xea580c,
        emissiveIntensity: 1.45,
        roughness: 0.35,
      }),
    );
    lavaMesh.rotation.x = -Math.PI / 2;
    lavaMesh.position.y = 0.0;
    root.add(lavaMesh);
  }

  // Realm-specific atmosphere & landmarks
  if (dim === 'space') {
    // Deep cosmic 360 starfield + nebula orbs + asteroid undersides
    const starCount = 900;
    const sp = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const th = rand() * Math.PI * 2;
      const ph = Math.acos(rand() * 2 - 1);
      const r = 185 + rand() * 55;
      sp[i * 3] = r * Math.sin(ph) * Math.cos(th);
      sp[i * 3 + 1] = r * Math.cos(ph);
      sp[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    }
    const sGeo = new THREE.BufferGeometry();
    sGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    animatedPoints = new THREE.Points(
      sGeo,
      new THREE.PointsMaterial({ color: 0xe0e7ff, size: 1.5, fog: false }),
    );
    root.add(animatedPoints);

    // Floating ringed exoplanet in sky + rock undersides under pads
    const planet = new THREE.Group();
    planet.position.set(110, 68, -120);
    const pCore = new THREE.Mesh(
      new THREE.SphereGeometry(22, 24, 18),
      new THREE.MeshStandardMaterial({ color: 0x6d28d9, emissive: 0x3b0764, emissiveIntensity: 0.45, roughness: 0.65 }),
    );
    const pRing = new THREE.Mesh(
      new THREE.TorusGeometry(32, 2.2, 6, 36),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.6, roughness: 0.4 }),
    );
    pRing.rotation.x = 1.22;
    planet.add(pCore, pRing);
    root.add(planet);
    animatedSpins.push(planet);

    for (const pad of SPACE_ASTEROID_PADS) {
      const rockUnder = new THREE.Mesh(
        new THREE.ConeGeometry(pad.radius * 0.92, pad.radius * 0.85, 10),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.92 }),
      );
      rockUnder.rotation.x = Math.PI;
      rockUnder.position.set(pad.x, pad.y - pad.radius * 0.45, pad.z);
      root.add(rockUnder);

      if (Math.hypot(pad.x, pad.z) > 12) {
        const nodeMesh = buildCrystalNodeMesh(0x8b5cf6, 1.35);
        nodeMesh.position.set(pad.x, pad.y, pad.z);
        root.add(nodeMesh);
        harvestables.push({
          id: `space_gem_${pad.x}_${pad.z}`,
          label: 'Outer Space Gem Cluster',
          x: pad.x,
          y: pad.y,
          z: pad.z,
          radius: 2.3,
          grants: [{ itemId: 'space_gem', quantity: 3 }],
          collected: false,
          respawnTimer: 0,
          mesh: nodeMesh,
        });
      }
    }
  }

  if (dim === 'nether') {
    // Rising Hellfire Ember particles
    const eCount = 320;
    const ep = new Float32Array(eCount * 3);
    for (let i = 0; i < eCount; i++) {
      ep[i * 3] = (rand() - 0.5) * 140;
      ep[i * 3 + 1] = rand() * 24;
      ep[i * 3 + 2] = (rand() - 0.5) * 140;
    }
    const eGeo = new THREE.BufferGeometry();
    eGeo.setAttribute('position', new THREE.BufferAttribute(ep, 3));
    animatedPoints = new THREE.Points(
      eGeo,
      new THREE.PointsMaterial({ color: 0xfb923c, size: 0.42, transparent: true, opacity: 0.85 }),
    );
    root.add(animatedPoints);

    // Jagged Obsidian Spires
    const spireMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.55, metalness: 0.4 });
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2 + rand() * 0.2;
      const dist = 16 + rand() * 68;
      const sx = Math.cos(angle) * dist;
      const sz = Math.sin(angle) * dist;
      const sy = getDimensionTerrainHeight('nether', sx, sz);
      if (sy < 0.3) continue;
      const h = 7 + rand() * 14;
      const spire = new THREE.Mesh(new THREE.ConeGeometry(2.2 + rand() * 1.5, h, 5), spireMat);
      spire.position.set(sx, sy + h * 0.45, sz);
      root.add(spire);
      colliders.push({ x: sx, z: sz, radius: 1.9 });
    }

    // Hellfire Nether Ember Harvestables + Inferno Blade Relic Shrine
    const spots: [number, number, boolean][] = [
      [0, -28, true],
      [28, 0, false],
      [-28, 0, false],
      [0, 32, false],
      [34, 34, false],
      [-34, -34, false],
    ];
    spots.forEach(([nx, nz, hasBlade], idx) => {
      const ny = getDimensionTerrainHeight('nether', nx, nz);
      const m = buildCrystalNodeMesh(hasBlade ? 0xef4444 : 0xf97316, hasBlade ? 1.5 : 1.15);
      m.position.set(nx, ny, nz);
      root.add(m);
      harvestables.push({
        id: `nether_node_${idx}`,
        label: hasBlade ? 'Inferno Netherite Altar' : 'Hellfire Nether Ember',
        x: nx,
        y: ny,
        z: nz,
        radius: 2.3,
        grants: hasBlade
          ? [
              { itemId: 'inferno_blade', quantity: 1 },
              { itemId: 'nether_ember', quantity: 3 },
            ]
          : [{ itemId: 'nether_ember', quantity: 2 }],
        collected: false,
        respawnTimer: 0,
        mesh: m,
      });
    });
  }

  if (dim === 'gold') {
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      roughness: 0.18,
      metalness: 0.92,
    });
    const palmLeafMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xca8a04,
      emissiveIntensity: 0.25,
      roughness: 0.35,
      metalness: 0.5,
    });
    // Solid Gold Temple Ruins + Golden Palms
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const dist = i % 2 === 0 ? 18 : 38;
      const gx = Math.cos(a) * dist;
      const gz = Math.sin(a) * dist;
      const gy = getDimensionTerrainHeight('gold', gx, gz);
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.15, 7.5, 10), goldMat);
      col.position.set(gx, gy + 3.6, gz);
      root.add(col);
      colliders.push({ x: gx, z: gz, radius: 1.1 });

      // Golden Palm nearby
      const px = gx + Math.cos(a + 0.3) * 9;
      const pz = gz + Math.sin(a + 0.3) * 9;
      const py = getDimensionTerrainHeight('gold', px, pz);
      const palm = new THREE.Group();
      palm.position.set(px, py, pz);
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.44, 6.2, 8), goldMat);
      trunk.position.y = 3.1;
      palm.add(trunk);
      for (let f = 0; f < 5; f++) {
        const frond = new THREE.Mesh(new THREE.ConeGeometry(0.7, 3.2, 5), palmLeafMat);
        frond.position.set(0, 6.2, 0);
        frond.rotation.z = 1.05;
        frond.rotation.y = (f / 5) * Math.PI * 2;
        palm.add(frond);
      }
      root.add(palm);
      colliders.push({ x: px, z: pz, radius: 0.6 });
    }

    // Treasure Vault Pedestals with Gold Bars
    [
      [0, 24],
      [24, 0],
      [-24, 0],
      [0, -24],
      [42, 42],
      [-42, -42],
    ].forEach(([vx, vz], idx) => {
      const vy = getDimensionTerrainHeight('gold', vx, vz);
      const m = buildGoldBarPedestalMesh();
      m.position.set(vx, vy, vz);
      root.add(m);
      harvestables.push({
        id: `gold_vault_${idx}`,
        label: '24K Gold Treasure Vault',
        x: vx,
        y: vy,
        z: vz,
        radius: 2.3,
        grants: [
          { itemId: 'gold_bar', quantity: 5 },
          { itemId: 'diamond', quantity: 1 },
        ],
        collected: false,
        respawnTimer: 0,
        mesh: m,
      });
    });
  }

  if (dim === 'diamond') {
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.55,
      transparent: true,
      opacity: 0.78,
      roughness: 0.12,
      metalness: 0.35,
    });
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2;
      const dist = 16 + (i % 3) * 18;
      const dx = Math.cos(a) * dist;
      const dz = Math.sin(a) * dist;
      const dy = getDimensionTerrainHeight('diamond', dx, dz);
      const h = 9 + (i % 4) * 3.5;
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.4, h, 6), pillarMat);
      pillar.position.set(dx, dy + h * 0.45, dz);
      pillar.rotation.z = (rand() - 0.5) * 0.25;
      root.add(pillar);
      colliders.push({ x: dx, z: dz, radius: 1.35 });
    }

    const dSpots: [number, number, boolean][] = [
      [0, -24, true],
      [22, 16, false],
      [-22, 16, false],
      [30, -22, false],
      [-30, -22, false],
    ];
    dSpots.forEach(([cx, cz, isVault], idx) => {
      const cy = getDimensionTerrainHeight('diamond', cx, cz);
      const m = buildCrystalNodeMesh(0x67e8f9, isVault ? 1.55 : 1.2);
      m.position.set(cx, cy, cz);
      root.add(m);
      harvestables.push({
        id: `diamond_node_${idx}`,
        label: isVault ? 'Crystal Armor & Diamond Cache' : 'Pure Diamond Crystal Cluster',
        x: cx,
        y: cy,
        z: cz,
        radius: 2.3,
        grants: isVault
          ? [
              { itemId: 'crystal_armor', quantity: 1 },
              { itemId: 'diamond_ammo', quantity: 30 },
              { itemId: 'diamond_crystal', quantity: 4 },
            ]
          : [
              { itemId: 'diamond_crystal', quantity: 3 },
              { itemId: 'diamond_ammo', quantity: 12 },
            ],
        collected: false,
        respawnTimer: 0,
        mesh: m,
      });
    });
  }

  if (dim === 'alien') {
    // Starry sky + crashed flying saucers + bioluminescent alien mushrooms
    const stCount = 450;
    const sp = new Float32Array(stCount * 3);
    for (let i = 0; i < stCount; i++) {
      const th = rand() * Math.PI * 2;
      const ph = Math.acos(rand() * 0.92 + 0.08);
      sp[i * 3] = 210 * Math.sin(ph) * Math.cos(th);
      sp[i * 3 + 1] = 210 * Math.cos(ph);
      sp[i * 3 + 2] = 210 * Math.sin(ph) * Math.sin(th);
    }
    const sGeo = new THREE.BufferGeometry();
    sGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    animatedPoints = new THREE.Points(
      sGeo,
      new THREE.PointsMaterial({ color: 0x5eead4, size: 1.4, fog: false }),
    );
    root.add(animatedPoints);

    // 2 Crashed UFO Saucers
    const ufoPositions: [number, number, number][] = [
      [24, -22, 0.22],
      [-32, 26, -0.28],
    ];
    ufoPositions.forEach(([ux, uz, tilt], idx) => {
      const uy = getDimensionTerrainHeight('alien', ux, uz);
      const saucer = buildCrashedSaucerMesh(ux, uy, uz, tilt);
      root.add(saucer);
      colliders.push({ x: ux, z: uz, radius: 4.5 });

      const coreNode = buildCrystalNodeMesh(idx === 0 ? 0x2dd4bf : 0xa855f7, 1.35);
      const lx = ux - 5.8;
      const lz = uz + 3.2;
      const ly = getDimensionTerrainHeight('alien', lx, lz);
      coreNode.position.set(lx, ly, lz);
      root.add(coreNode);
      harvestables.push({
        id: `alien_ufo_cache_${idx}`,
        label: idx === 0 ? 'Crashed Saucer Weapon Vault' : 'Xenotech Alien Core',
        x: lx,
        y: ly,
        z: lz,
        radius: 2.5,
        grants:
          idx === 0
            ? [
                { itemId: 'alien_plasma_gun', quantity: 1 },
                { itemId: 'alien_core', quantity: 3 },
                { itemId: 'ammo', quantity: 40 },
              ]
            : [
                { itemId: 'alien_core', quantity: 3 },
                { itemId: 'space_gem', quantity: 2 },
              ],
        collected: false,
        respawnTimer: 0,
        mesh: coreNode,
      });
    });

    // Bioluminescent Alien Flora
    const stalkMat = new THREE.MeshStandardMaterial({ color: 0x4c1d95, roughness: 0.6 });
    const capMat = new THREE.MeshStandardMaterial({
      color: 0x2dd4bf,
      emissive: 0x14b8a6,
      emissiveIntensity: 1.2,
      roughness: 0.28,
    });
    for (let i = 0; i < 24; i++) {
      const a = rand() * Math.PI * 2;
      const d = 14 + rand() * 68;
      const fx = Math.cos(a) * d;
      const fz = Math.sin(a) * d;
      const fy = getDimensionTerrainHeight('alien', fx, fz);
      const h = 3.2 + rand() * 3.8;
      const flora = new THREE.Group();
      flora.position.set(fx, fy, fz);
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.38, h, 8), stalkMat);
      stem.position.y = h * 0.5;
      const cap = new THREE.Mesh(new THREE.SphereGeometry(1.45, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), capMat);
      cap.position.y = h;
      flora.add(stem, cap);
      root.add(flora);
      colliders.push({ x: fx, z: fz, radius: 0.55 });
    }
  }

  // Secondary Islands (Arctic Frost, Volcanic Badlands, Tropical Jungle)
  if (dim === 'island_arctic') {
    const snowPineMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.72 });
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.88 });
    for (let i = 0; i < 26; i++) {
      const a = rand() * Math.PI * 2;
      const d = 16 + rand() * 68;
      const px = Math.cos(a) * d;
      const pz = Math.sin(a) * d;
      const py = getDimensionTerrainHeight(dim, px, pz);
      if (py < OCEAN_LEVEL + 0.5) continue;
      const pine = new THREE.Group();
      pine.position.set(px, py, pz);
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.36, 3.2, 7), trunkMat);
      trunk.position.y = 1.6;
      const cone1 = new THREE.Mesh(new THREE.ConeGeometry(2.1, 3.8, 8), snowPineMat);
      cone1.position.y = 3.6;
      const cone2 = new THREE.Mesh(new THREE.ConeGeometry(1.4, 2.8, 8), snowPineMat);
      cone2.position.y = 5.4;
      pine.add(trunk, cone1, cone2);
      root.add(pine);
      colliders.push({ x: px, z: pz, radius: 0.65 });
    }
    const cNode = buildCrystalNodeMesh(0x38bdf8, 1.3);
    const cy = getDimensionTerrainHeight(dim, 22, -18);
    cNode.position.set(22, cy, -18);
    root.add(cNode);
    harvestables.push({
      id: 'arctic_frost_cache',
      label: 'Glacier Diamond Deposit',
      x: 22,
      y: cy,
      z: -18,
      radius: 2.2,
      grants: [
        { itemId: 'diamond_crystal', quantity: 2 },
        { itemId: 'wood', quantity: 8 },
      ],
      collected: false,
      respawnTimer: 0,
      mesh: cNode,
    });
  }

  if (dim === 'island_volcanic') {
    const basaltMat = new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.85 });
    const ventMat = new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xdc2626, emissiveIntensity: 1.5 });
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      const d = 18 + rand() * 58;
      const vx = Math.cos(a) * d;
      const vz = Math.sin(a) * d;
      const vy = getDimensionTerrainHeight(dim, vx, vz);
      if (vy < OCEAN_LEVEL + 0.5) continue;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.8 + rand() * 1.4, 0), basaltMat);
      rock.position.set(vx, vy + 0.8, vz);
      root.add(rock);
      colliders.push({ x: vx, z: vz, radius: 1.65 });
    }
    const ventNode = buildCrystalNodeMesh(0xf97316, 1.3);
    const vy = getDimensionTerrainHeight(dim, -20, 22);
    ventNode.position.set(-20, vy, 22);
    root.add(ventNode);
    const glowRing = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.16, 6, 18), ventMat);
    glowRing.rotation.x = Math.PI / 2;
    glowRing.position.set(-20, vy + 0.15, 22);
    root.add(glowRing);
    harvestables.push({
      id: 'volcanic_ember_cache',
      label: 'Volcanic Magma Vent Cache',
      x: -20,
      y: vy,
      z: 22,
      radius: 2.2,
      grants: [
        { itemId: 'nether_ember', quantity: 2 },
        { itemId: 'flint', quantity: 6 },
        { itemId: 'metal_ore', quantity: 5 },
      ],
      collected: false,
      respawnTimer: 0,
      mesh: ventNode,
    });
  }

  if (dim === 'island_jungle') {
    const barkMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.9 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.72 });
    for (let i = 0; i < 28; i++) {
      const a = rand() * Math.PI * 2;
      const d = 16 + rand() * 68;
      const jx = Math.cos(a) * d;
      const jz = Math.sin(a) * d;
      const jy = getDimensionTerrainHeight(dim, jx, jz);
      if (jy < OCEAN_LEVEL + 0.6) continue;
      const tree = new THREE.Group();
      tree.position.set(jx, jy, jz);
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.52, 5.2, 8), barkMat);
      trunk.position.y = 2.6;
      const crown = new THREE.Mesh(new THREE.SphereGeometry(2.6, 10, 8), leafMat);
      crown.scale.set(1.2, 0.75, 1.2);
      crown.position.y = 5.4;
      tree.add(trunk, crown);
      root.add(tree);
      colliders.push({ x: jx, z: jz, radius: 0.7 });
    }
    const templeCache = buildGoldBarPedestalMesh();
    const ty = getDimensionTerrainHeight(dim, 24, 18);
    templeCache.position.set(24, ty, 18);
    root.add(templeCache);
    harvestables.push({
      id: 'jungle_temple_cache',
      label: 'Jungle Temple Relic Cache',
      x: 24,
      y: ty,
      z: 18,
      radius: 2.2,
      grants: [
        { itemId: 'gold_bar', quantity: 3 },
        { itemId: 'wood', quantity: 10 },
        { itemId: 'banana', quantity: 4 },
      ],
      collected: false,
      respawnTimer: 0,
      mesh: templeCache,
    });
  }

  // Realm Guardians (Hellfire Demons, Alien Extraterrestrials, Gold Vault Sentinels, Crystal Golems)
  const guardianSpecs: {
    name: string;
    hp: number;
    dmg: number;
    speed: number;
    drop: ItemId;
    qty: number;
    bonus?: ItemId;
    coords: [number, number][];
  } | null =
    dim === 'nether'
      ? {
          name: 'Hellfire Nether Guardian',
          hp: 210,
          dmg: 18,
          speed: 4.8,
          drop: 'nether_ember',
          qty: 2,
          bonus: 'inferno_blade',
          coords: [
            [24, -18],
            [-26, 20],
            [0, -44],
          ],
        }
      : dim === 'alien'
        ? {
            name: 'Extraterrestrial Trooper',
            hp: 195,
            dmg: 16,
            speed: 5.2,
            drop: 'alien_core',
            qty: 2,
            bonus: 'alien_plasma_gun',
            coords: [
              [20, -18],
              [-28, 22],
              [14, 34],
            ],
          }
        : dim === 'gold'
          ? {
              name: 'Golden Vault Sentinel',
              hp: 180,
              dmg: 14,
              speed: 4.3,
              drop: 'gold_bar',
              qty: 3,
              coords: [
                [26, 22],
                [-26, -22],
              ],
            }
          : dim === 'diamond'
            ? {
                name: 'Crystalline Golem',
                hp: 220,
                dmg: 16,
                speed: 4.0,
                drop: 'diamond_crystal',
                qty: 2,
                bonus: 'diamond_ammo',
                coords: [
                  [-18, -22],
                  [26, 18],
                ],
              }
            : null;

  if (guardianSpecs) {
    guardianSpecs.coords.forEach(([gx, gz], idx) => {
      const gy = getDimensionTerrainHeight(dim, gx, gz);
      const { mesh, limbs } = buildGuardianMesh(dim);
      mesh.position.set(gx, gy, gz);
      root.add(mesh);
      guardians.push({
        id: `guardian_${dim}_${idx}`,
        name: guardianSpecs.name,
        dim,
        x: gx,
        y: gy,
        z: gz,
        homeX: gx,
        homeZ: gz,
        yaw: 0,
        hp: guardianSpecs.hp,
        maxHp: guardianSpecs.hp,
        speed: guardianSpecs.speed,
        attackDamage: guardianSpecs.dmg,
        attackCooldown: 0,
        respawnTimer: 0,
        alive: true,
        hitFlash: 0,
        dropItem: guardianSpecs.drop,
        dropQty: guardianSpecs.qty,
        bonusDrop: idx === 0 ? guardianSpecs.bonus : undefined,
        mesh,
        limbs,
      });
    });
  }

  // Make renderer touch used subtly so lint sees param intentionally accepted for future texture baking
  void renderer;

  return {
    dim,
    root,
    terrainMesh,
    colliders,
    harvestables,
    guardians,
    animatedPoints,
    animatedSpins,
    lavaMesh,
  };
}
