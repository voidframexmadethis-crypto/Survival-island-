import * as THREE from 'three';

export type StructureEntityKind =
  | 'pillager'
  | 'vindicator'
  | 'evoker'
  | 'vex'
  | 'witch'
  | 'villager';

export interface StructureEntityRig {
  root: THREE.Group;
  head: THREE.Object3D;
  leftArm: THREE.Object3D;
  rightArm: THREE.Object3D;
  leftLeg: THREE.Object3D;
  rightLeg: THREE.Object3D;
  leftWing?: THREE.Object3D;
  rightWing?: THREE.Object3D;
  isFlying: boolean;
}

interface SharedMaterials {
  illagerSkin: THREE.MeshStandardMaterial;
  villagerSkin: THREE.MeshStandardMaterial;
  villagerCoat: THREE.MeshStandardMaterial;
  villagerApron: THREE.MeshStandardMaterial;
  villagerHat: THREE.MeshStandardMaterial;
  pillagerCoat: THREE.MeshStandardMaterial;
  pillagerAccent: THREE.MeshStandardMaterial;
  vindicatorCoat: THREE.MeshStandardMaterial;
  vindicatorVest: THREE.MeshStandardMaterial;
  evokerRobe: THREE.MeshStandardMaterial;
  evokerGold: THREE.MeshStandardMaterial;
  witchRobe: THREE.MeshStandardMaterial;
  witchTrim: THREE.MeshStandardMaterial;
  vexBody: THREE.MeshStandardMaterial;
  vexWing: THREE.MeshStandardMaterial;
  bootMat: THREE.MeshStandardMaterial;
  ironMat: THREE.MeshStandardMaterial;
  woodMat: THREE.MeshStandardMaterial;
  emeraldEye: THREE.MeshStandardMaterial;
  darkEye: THREE.MeshStandardMaterial;
  potionGlow: THREE.MeshStandardMaterial;
  auraGold: THREE.MeshStandardMaterial;
}

interface SharedGeometries {
  torso: THREE.BoxGeometry;
  robeSkirt: THREE.BoxGeometry;
  head: THREE.BoxGeometry;
  nose: THREE.BoxGeometry;
  eye: THREE.BoxGeometry;
  brow: THREE.BoxGeometry;
  arm: THREE.BoxGeometry;
  leg: THREE.BoxGeometry;
  boot: THREE.BoxGeometry;
  satchel: THREE.BoxGeometry;
  villagerBrim: THREE.CylinderGeometry;
  villagerCrown: THREE.CylinderGeometry;
  witchBrim: THREE.CylinderGeometry;
  witchCone: THREE.ConeGeometry;
  crossbowStock: THREE.BoxGeometry;
  crossbowBow: THREE.BoxGeometry;
  axeHandle: THREE.CylinderGeometry;
  axeBlade: THREE.BoxGeometry;
  swordBlade: THREE.BoxGeometry;
  swordHilt: THREE.BoxGeometry;
  potionVial: THREE.CylinderGeometry;
  evokerCrystal: THREE.OctahedronGeometry;
  vexWing: THREE.BoxGeometry;
  shoulderTrim: THREE.BoxGeometry;
}

let cachedMats: SharedMaterials | null = null;
let cachedGeos: SharedGeometries | null = null;

function getMaterials(): SharedMaterials {
  if (cachedMats) return cachedMats;
  cachedMats = {
    illagerSkin: new THREE.MeshStandardMaterial({ color: 0x94a39b, roughness: 0.78 }),
    villagerSkin: new THREE.MeshStandardMaterial({ color: 0xd9a77c, roughness: 0.76 }),
    villagerCoat: new THREE.MeshStandardMaterial({ color: 0x7c4a2d, roughness: 0.88 }),
    villagerApron: new THREE.MeshStandardMaterial({ color: 0xe7dcc8, roughness: 0.72 }),
    villagerHat: new THREE.MeshStandardMaterial({ color: 0xd9b66b, roughness: 0.85 }),
    pillagerCoat: new THREE.MeshStandardMaterial({ color: 0x3b2c35, roughness: 0.84 }),
    pillagerAccent: new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.65 }),
    vindicatorCoat: new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.82 }),
    vindicatorVest: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.72 }),
    evokerRobe: new THREE.MeshStandardMaterial({ color: 0x1e1b24, roughness: 0.82 }),
    evokerGold: new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.28,
      metalness: 0.78,
    }),
    witchRobe: new THREE.MeshStandardMaterial({ color: 0x4c1d95, roughness: 0.8 }),
    witchTrim: new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.86 }),
    vexBody: new THREE.MeshStandardMaterial({
      color: 0x67e8f9,
      emissive: 0x0891b2,
      emissiveIntensity: 0.35,
      roughness: 0.38,
    }),
    vexWing: new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.3,
      roughness: 0.28,
      transparent: true,
      opacity: 0.78,
    }),
    bootMat: new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.9 }),
    ironMat: new THREE.MeshStandardMaterial({
      color: 0xd4d4d8,
      roughness: 0.22,
      metalness: 0.88,
    }),
    woodMat: new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.88 }),
    emeraldEye: new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 0.45,
      roughness: 0.3,
    }),
    darkEye: new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.4 }),
    potionGlow: new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      emissive: 0x16a34a,
      emissiveIntensity: 0.65,
      roughness: 0.2,
    }),
    auraGold: new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xd97706,
      emissiveIntensity: 0.85,
      roughness: 0.2,
      metalness: 0.8,
    }),
  };
  return cachedMats;
}

function getGeometries(): SharedGeometries {
  if (cachedGeos) return cachedGeos;
  cachedGeos = {
    torso: new THREE.BoxGeometry(0.56, 0.72, 0.32),
    robeSkirt: new THREE.BoxGeometry(0.6, 0.44, 0.36),
    head: new THREE.BoxGeometry(0.42, 0.44, 0.42),
    nose: new THREE.BoxGeometry(0.11, 0.17, 0.14),
    eye: new THREE.BoxGeometry(0.08, 0.06, 0.04),
    brow: new THREE.BoxGeometry(0.32, 0.06, 0.06),
    arm: new THREE.BoxGeometry(0.18, 0.62, 0.2),
    leg: new THREE.BoxGeometry(0.22, 0.6, 0.24),
    boot: new THREE.BoxGeometry(0.24, 0.16, 0.28),
    satchel: new THREE.BoxGeometry(0.18, 0.24, 0.24),
    villagerBrim: new THREE.CylinderGeometry(0.44, 0.46, 0.05, 10),
    villagerCrown: new THREE.CylinderGeometry(0.22, 0.26, 0.18, 10),
    witchBrim: new THREE.CylinderGeometry(0.44, 0.46, 0.05, 12),
    witchCone: new THREE.ConeGeometry(0.26, 0.56, 10),
    crossbowStock: new THREE.BoxGeometry(0.12, 0.12, 0.62),
    crossbowBow: new THREE.BoxGeometry(0.64, 0.08, 0.1),
    axeHandle: new THREE.CylinderGeometry(0.032, 0.036, 0.76, 6),
    axeBlade: new THREE.BoxGeometry(0.06, 0.32, 0.28),
    swordBlade: new THREE.BoxGeometry(0.06, 0.56, 0.11),
    swordHilt: new THREE.BoxGeometry(0.22, 0.07, 0.1),
    potionVial: new THREE.CylinderGeometry(0.09, 0.11, 0.24, 8),
    evokerCrystal: new THREE.OctahedronGeometry(0.16, 0),
    vexWing: new THREE.BoxGeometry(0.56, 0.28, 0.04),
    shoulderTrim: new THREE.BoxGeometry(0.66, 0.12, 0.38),
  };
  return cachedGeos;
}

/**
 * Builds a multi-part procedural 3D rig (6–10 parts, grounded at y = 0)
 * using shared GPU geometries & materials so StructureManager wake/hibernate cycles are zero-leak.
 */
export function createStructureEntityRig(
  kind: StructureEntityKind,
): StructureEntityRig {
  const m = getMaterials();
  const g = getGeometries();
  const root = new THREE.Group();

  const isFlying = kind === 'vex';
  const skinMat = kind === 'villager' ? m.villagerSkin : kind === 'vex' ? m.vexBody : m.illagerSkin;
  const bodyMat =
    kind === 'villager'
      ? m.villagerCoat
      : kind === 'vindicator'
        ? m.vindicatorCoat
        : kind === 'evoker'
          ? m.evokerRobe
          : kind === 'witch'
            ? m.witchRobe
            : kind === 'vex'
              ? m.vexBody
              : m.pillagerCoat;

  // 1. Primary Legs / Boots grounded at y = 0
  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.14, 0.62, 0);
  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.14, 0.62, 0);

  if (isFlying) {
    // Vex spectral tapered lower wisp
    const wispL = new THREE.Mesh(g.leg, m.vexBody);
    wispL.scale.set(0.65, 0.75, 0.65);
    wispL.position.y = -0.22;
    leftLeg.add(wispL);
    const wispR = new THREE.Mesh(g.leg, m.vexBody);
    wispR.scale.set(0.65, 0.75, 0.65);
    wispR.position.y = -0.22;
    rightLeg.add(wispR);
  } else {
    const legLMesh = new THREE.Mesh(g.leg, bodyMat);
    legLMesh.position.y = -0.3;
    legLMesh.castShadow = true;
    const bootL = new THREE.Mesh(g.boot, m.bootMat);
    bootL.position.set(0, -0.54, 0.02);
    leftLeg.add(legLMesh, bootL);

    const legRMesh = new THREE.Mesh(g.leg, bodyMat);
    legRMesh.position.y = -0.3;
    legRMesh.castShadow = true;
    const bootR = new THREE.Mesh(g.boot, m.bootMat);
    bootR.position.set(0, -0.54, 0.02);
    rightLeg.add(legRMesh, bootR);
  }
  root.add(leftLeg, rightLeg);

  // 2. Primary Silhouette Torso + Secondary Trim / Skirt
  const torso = new THREE.Mesh(g.torso, bodyMat);
  torso.position.y = 0.98;
  torso.castShadow = true;
  torso.receiveShadow = true;
  root.add(torso);

  if (kind === 'villager') {
    const apron = new THREE.Mesh(g.robeSkirt, m.villagerApron);
    apron.scale.set(0.84, 0.9, 1.05);
    apron.position.set(0, 0.72, 0.02);
    const satchel = new THREE.Mesh(g.satchel, m.woodMat);
    satchel.position.set(0.32, 0.85, 0);
    root.add(apron, satchel);
  } else if (kind === 'evoker') {
    const robeSkirt = new THREE.Mesh(g.robeSkirt, m.evokerRobe);
    robeSkirt.position.y = 0.62;
    const goldTrim = new THREE.Mesh(g.shoulderTrim, m.evokerGold);
    goldTrim.position.y = 1.28;
    root.add(robeSkirt, goldTrim);
  } else if (kind === 'vindicator') {
    const vest = new THREE.Mesh(g.shoulderTrim, m.vindicatorVest);
    vest.scale.set(0.95, 2.5, 1.06);
    vest.position.y = 1.02;
    root.add(vest);
  } else if (kind === 'pillager') {
    const sash = new THREE.Mesh(g.shoulderTrim, m.pillagerAccent);
    sash.position.y = 1.25;
    root.add(sash);
  } else if (kind === 'witch') {
    const skirt = new THREE.Mesh(g.robeSkirt, m.witchRobe);
    skirt.position.y = 0.6;
    const collar = new THREE.Mesh(g.shoulderTrim, m.witchTrim);
    collar.position.y = 1.28;
    root.add(skirt, collar);
  }

  // 3. Head + Nose + Eyes + Hat/Brow Accents
  const head = new THREE.Group();
  head.position.set(0, 1.36, 0);
  const cranium = new THREE.Mesh(g.head, skinMat);
  cranium.position.y = 0.22;
  cranium.castShadow = true;
  head.add(cranium);

  if (kind !== 'vex') {
    const nose = new THREE.Mesh(g.nose, skinMat);
    nose.position.set(0, 0.14, 0.24);
    head.add(nose);
  }

  const eyeMat =
    kind === 'villager'
      ? m.emeraldEye
      : kind === 'evoker' || kind === 'vex'
        ? m.auraGold
        : m.darkEye;
  const eyeL = new THREE.Mesh(g.eye, eyeMat);
  eyeL.position.set(-0.1, 0.24, 0.21);
  const eyeR = new THREE.Mesh(g.eye, eyeMat);
  eyeR.position.set(0.1, 0.24, 0.21);
  head.add(eyeL, eyeR);

  if (kind !== 'villager') {
    const brow = new THREE.Mesh(g.brow, m.bootMat);
    brow.position.set(0, 0.31, 0.21);
    head.add(brow);
  }

  if (kind === 'villager') {
    const brim = new THREE.Mesh(g.villagerBrim, m.villagerHat);
    brim.position.y = 0.44;
    const crown = new THREE.Mesh(g.villagerCrown, m.villagerHat);
    crown.position.y = 0.54;
    head.add(brim, crown);
  } else if (kind === 'witch') {
    const brim = new THREE.Mesh(g.witchBrim, m.witchTrim);
    brim.position.y = 0.44;
    const cone = new THREE.Mesh(g.witchCone, m.witchTrim);
    cone.position.y = 0.72;
    const band = new THREE.Mesh(g.shoulderTrim, m.evokerGold);
    band.scale.set(0.55, 0.55, 0.85);
    band.position.y = 0.5;
    head.add(brim, cone, band);
  }
  root.add(head);

  // 4. Arms + Held Weapons / Props
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.37, 1.24, 0);
  const armLMesh = new THREE.Mesh(g.arm, bodyMat);
  armLMesh.position.y = -0.26;
  armLMesh.castShadow = true;
  leftArm.add(armLMesh);

  const rightArm = new THREE.Group();
  rightArm.position.set(0.37, 1.24, 0);
  const armRMesh = new THREE.Mesh(g.arm, bodyMat);
  armRMesh.position.y = -0.26;
  armRMesh.castShadow = true;
  rightArm.add(armRMesh);

  if (kind === 'vindicator') {
    const axeHandle = new THREE.Mesh(g.axeHandle, m.woodMat);
    axeHandle.rotation.x = Math.PI * 0.4;
    axeHandle.position.set(0, -0.45, 0.25);
    const axeBlade = new THREE.Mesh(g.axeBlade, m.ironMat);
    axeBlade.position.set(0, -0.32, 0.52);
    rightArm.add(axeHandle, axeBlade);
    rightArm.rotation.x = -0.75;
  } else if (kind === 'pillager') {
    const stock = new THREE.Mesh(g.crossbowStock, m.woodMat);
    stock.position.set(0, -0.35, 0.3);
    const bow = new THREE.Mesh(g.crossbowBow, m.ironMat);
    bow.position.set(0, -0.35, 0.56);
    rightArm.add(stock, bow);
    rightArm.rotation.x = -1.05;
  } else if (kind === 'evoker') {
    const crystal = new THREE.Mesh(g.evokerCrystal, m.auraGold);
    crystal.position.set(0, -0.48, 0.22);
    rightArm.add(crystal);
  } else if (kind === 'witch') {
    const vial = new THREE.Mesh(g.potionVial, m.potionGlow);
    vial.position.set(0, -0.48, 0.2);
    rightArm.add(vial);
  } else if (kind === 'vex') {
    const hilt = new THREE.Mesh(g.swordHilt, m.woodMat);
    hilt.position.set(0, -0.42, 0.2);
    const blade = new THREE.Mesh(g.swordBlade, m.ironMat);
    blade.rotation.x = Math.PI * 0.35;
    blade.position.set(0, -0.24, 0.44);
    rightArm.add(hilt, blade);
  }
  root.add(leftArm, rightArm);

  // 5. Optional Spectral Wings (Vex)
  let leftWing: THREE.Object3D | undefined;
  let rightWing: THREE.Object3D | undefined;
  if (kind === 'vex') {
    leftWing = new THREE.Group();
    leftWing.position.set(-0.22, 1.15, -0.18);
    const lw = new THREE.Mesh(g.vexWing, m.vexWing);
    lw.position.set(-0.28, 0, -0.05);
    leftWing.add(lw);

    rightWing = new THREE.Group();
    rightWing.position.set(0.22, 1.15, -0.18);
    const rw = new THREE.Mesh(g.vexWing, m.vexWing);
    rw.position.set(0.28, 0, -0.05);
    rightWing.add(rw);
    root.add(leftWing, rightWing);
    root.scale.setScalar(0.76);
  }

  return {
    root,
    head,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    leftWing,
    rightWing,
    isFlying,
  };
}
