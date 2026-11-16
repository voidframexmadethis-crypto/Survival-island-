import * as THREE from 'three';
import { CampStructureType, CreatureSpecies, ItemId } from '../types';
import {
  createBisonFurTexture,
  createChestnutHorseTexture,
  createCrocodileScaleTexture,
  createGrizzlyFurTexture,
  createHolsteinCoatTexture,
  createLionFurTexture,
  createLionManeTexture,
  createMottledGoatTexture,
  createOwlFeatherTexture,
  createRedFoxFurTexture,
  createTabbyFurTexture,
  createWolfFurTexture,
  createWoolFleeceTexture,
  createYorkshirePigTexture,
} from './textures';

let cachedAnimalTextures: {
  holstein: THREE.CanvasTexture;
  pig: THREE.CanvasTexture;
  horse: THREE.CanvasTexture;
  wool: THREE.CanvasTexture;
  goat: THREE.CanvasTexture;
  tabby: THREE.CanvasTexture;
  grizzly: THREE.CanvasTexture;
  wolf: THREE.CanvasTexture;
  lion: THREE.CanvasTexture;
  lionMane: THREE.CanvasTexture;
  fox: THREE.CanvasTexture;
  croc: THREE.CanvasTexture;
  bison: THREE.CanvasTexture;
  owl: THREE.CanvasTexture;
} | null = null;

function getAnimalTextures() {
  if (!cachedAnimalTextures) {
    cachedAnimalTextures = {
      holstein: createHolsteinCoatTexture(4),
      pig: createYorkshirePigTexture(4),
      horse: createChestnutHorseTexture(4),
      wool: createWoolFleeceTexture(4),
      goat: createMottledGoatTexture(4),
      tabby: createTabbyFurTexture(4),
      grizzly: createGrizzlyFurTexture(4),
      wolf: createWolfFurTexture(4),
      lion: createLionFurTexture(4),
      lionMane: createLionManeTexture(4),
      fox: createRedFoxFurTexture(4),
      croc: createCrocodileScaleTexture(4),
      bison: createBisonFurTexture(4),
      owl: createOwlFeatherTexture(4),
    };
  }
  return cachedAnimalTextures;
}

export interface FirstPersonHandsRig {
  root: THREE.Group;
  leftHand: THREE.Group;
  rightHand: THREE.Group;
  toolGroup: THREE.Group;
  shaft: THREE.Mesh;
  axeHead: THREE.Mesh;
  spearTip: THREE.Mesh;
  clubHead: THREE.Mesh;
  bowArc: THREE.Mesh;
  rodTip: THREE.Mesh;
  gunMesh: THREE.Group;
  consumableGroup: THREE.Group;
  foodMesh: THREE.Mesh;
  foodMat: THREE.MeshStandardMaterial;
  bottleGroup: THREE.Group;
  bottleWaterMesh: THREE.Mesh;
  bottleWaterMat: THREE.MeshStandardMaterial;
}

export interface CreatureRig {
  root: THREE.Group;
  body: THREE.Group;
  head: THREE.Group;
  jaw?: THREE.Group;
  tail: THREE.Group;
  legs: THREE.Group[];
  wings?: THREE.Group[];
  breathWisps?: THREE.Mesh[];
  maneTufts?: THREE.Mesh[];
  eyeGlowMat?: THREE.MeshBasicMaterial;
  shadowDisc: THREE.Mesh;
}

export interface SkyCelestialHandles {
  group: THREE.Group;
  sunMesh: THREE.Mesh;
  moonMesh: THREE.Mesh;
  starPoints: THREE.Points;
  starMat: THREE.PointsMaterial;
}

export function createSkyCelestialBodies(): SkyCelestialHandles {
  const group = new THREE.Group();

  const sunMesh = new THREE.Mesh(
    new THREE.SphereGeometry(9, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xfff3b0, fog: false }),
  );
  group.add(sunMesh);

  const moonMesh = new THREE.Mesh(
    new THREE.SphereGeometry(6.5, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xdbeafe, fog: false }),
  );
  group.add(moonMesh);

  const starCount = 280;
  const starPositions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(0.12 + Math.random() * 0.88); // Upper hemisphere
    const r = 240;
    starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = r * Math.cos(phi);
    starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0xe2e8f0,
    size: 1.8,
    transparent: true,
    opacity: 0,
    fog: false,
    depthWrite: false,
  });
  const starPoints = new THREE.Points(starGeo, starMat);
  group.add(starPoints);

  return { group, sunMesh, moonMesh, starPoints, starMat };
}

function makeContactShadow(radius: number): THREE.Mesh {
  const geo = new THREE.CircleGeometry(radius, 16);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x090807,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0.04;
  return mesh;
}

/**
 * First-Person Arms, Hands & Held Tool/Weapon Rig attached to the camera.
 */
export function createFirstPersonHandsRig(): FirstPersonHandsRig {
  const root = new THREE.Group();

  const skinMat = new THREE.MeshStandardMaterial({ color: 0xd69e72, roughness: 0.65 });
  const sleeveMat = new THREE.MeshStandardMaterial({ color: 0x5f6b43, roughness: 0.85 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.85 });
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.5, metalness: 0.25 });

  const makeArm = (side: number) => {
    const g = new THREE.Group();
    g.position.set(side * 0.26, -0.25, -0.38);

    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.054, 0.28, 10), sleeveMat);
    sleeve.rotation.x = Math.PI / 2.2;
    sleeve.position.set(0, -0.04, 0.14);
    g.add(sleeve);

    const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.036, 0.18, 4, 8), skinMat);
    forearm.rotation.x = Math.PI / 2.3;
    forearm.position.set(0, -0.01, -0.02);
    g.add(forearm);

    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.055, 0.09), skinMat);
    palm.position.set(0, 0.02, -0.14);
    g.add(palm);

    return g;
  };

  const leftHand = makeArm(-1);
  const rightHand = makeArm(1);
  root.add(leftHand, rightHand);

  // Held Tool / Weapon Group anchored in right hand
  const toolGroup = new THREE.Group();
  toolGroup.position.set(-0.01, 0.03, -0.16);
  rightHand.add(toolGroup);

  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.46, 8), woodMat);
  shaft.rotation.x = -Math.PI / 4;
  shaft.position.set(0, 0.12, -0.12);
  toolGroup.add(shaft);

  const axeHead = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.1, 0.14), stoneMat);
  axeHead.position.set(0, 0.24, -0.26);
  axeHead.rotation.x = -Math.PI / 4;
  toolGroup.add(axeHead);

  const spearTip = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.16, 5), stoneMat);
  spearTip.position.set(0, 0.29, -0.29);
  spearTip.rotation.x = -Math.PI / 4;
  toolGroup.add(spearTip);

  const clubHead = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.022, 0.22, 8), woodMat);
  clubHead.position.set(0, 0.22, -0.22);
  clubHead.rotation.x = -Math.PI / 4;
  toolGroup.add(clubHead);

  const bowArc = new THREE.Mesh(
    new THREE.TorusGeometry(0.22, 0.014, 6, 14, Math.PI),
    woodMat,
  );
  bowArc.rotation.z = -Math.PI / 2;
  bowArc.position.set(-0.04, 0.06, -0.15);
  toolGroup.add(bowArc);

  const rodTip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.005, 0.012, 0.65, 6),
    woodMat,
  );
  rodTip.rotation.x = -Math.PI / 3.2;
  rodTip.position.set(0, 0.26, -0.34);
  toolGroup.add(rodTip);

  // 3D Realistic Survival Sidearm (Gun)
  const gunMesh = new THREE.Group();
  gunMesh.position.set(0, 0.02, -0.06);
  const gunSteelMat = new THREE.MeshStandardMaterial({
    color: 0x1f2937,
    roughness: 0.28,
    metalness: 0.88,
  });
  const gunGripMat = new THREE.MeshStandardMaterial({
    color: 0x3b1d11,
    roughness: 0.72,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0x9ca3af,
    roughness: 0.2,
    metalness: 0.95,
  });

  const slide = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.054, 0.24), gunSteelMat);
  slide.position.set(0, 0.065, -0.06);
  slide.castShadow = true;
  gunMesh.add(slide);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.017, 0.22, 10), chromeMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.065, -0.19);
  barrel.castShadow = true;
  gunMesh.add(barrel);

  const muzzleTip = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.03, 10), gunSteelMat);
  muzzleTip.rotation.x = Math.PI / 2;
  muzzleTip.position.set(0, 0.065, -0.305);
  gunMesh.add(muzzleTip);

  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.13, 0.062), gunGripMat);
  grip.rotation.x = 0.26;
  grip.position.set(0, -0.02, 0.01);
  grip.castShadow = true;
  gunMesh.add(grip);

  const triggerGuard = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.005, 6, 12, Math.PI), gunSteelMat);
  triggerGuard.rotation.x = -Math.PI / 2;
  triggerGuard.position.set(0, 0.018, -0.04);
  const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.022, 0.008), chromeMat);
  trigger.rotation.x = -0.35;
  trigger.position.set(0, 0.026, -0.038);
  gunMesh.add(triggerGuard, trigger);

  const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.016, 0.012), chromeMat);
  frontSight.position.set(0, 0.098, -0.285);
  const rearSight = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.014, 0.01), gunSteelMat);
  rearSight.position.set(0, 0.098, 0.045);
  gunMesh.add(frontSight, rearSight);

  gunMesh.visible = false;
  toolGroup.add(gunMesh);

  // Hand-held Consumables (3D Food Morsel & Water Bottle) for eating, drinking & bottle washing
  const consumableGroup = new THREE.Group();
  consumableGroup.position.set(-0.01, 0.04, -0.16);
  consumableGroup.visible = false;
  rightHand.add(consumableGroup);

  const foodMat = new THREE.MeshStandardMaterial({
    color: 0xb91c1c,
    roughness: 0.65,
  });
  const foodMesh = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.055, 1),
    foodMat,
  );
  foodMesh.scale.set(1.15, 0.8, 1.3);
  foodMesh.visible = false;
  consumableGroup.add(foodMesh);

  const bottleGroup = new THREE.Group();
  const bottleShellMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    transparent: true,
    opacity: 0.62,
    roughness: 0.22,
    metalness: 0.1,
  });
  const bottleWaterMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.82,
    roughness: 0.18,
  });
  const bottleCapMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    roughness: 0.45,
  });
  const bBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.042, 0.042, 0.15, 10),
    bottleShellMat,
  );
  const bottleWaterMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.036, 0.036, 0.115, 10),
    bottleWaterMat,
  );
  bottleWaterMesh.position.y = -0.012;
  const bNeck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.034, 0.035, 10),
    bottleShellMat,
  );
  bNeck.position.y = 0.09;
  const bCap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.021, 0.021, 0.022, 10),
    bottleCapMat,
  );
  bCap.position.y = 0.115;
  bottleGroup.add(bBody, bottleWaterMesh, bNeck, bCap);
  bottleGroup.visible = false;
  consumableGroup.add(bottleGroup);

  return {
    root,
    leftHand,
    rightHand,
    toolGroup,
    shaft,
    axeHead,
    spearTip,
    clubHead,
    bowArc,
    rodTip,
    gunMesh,
    consumableGroup,
    foodMesh,
    foodMat,
    bottleGroup,
    bottleWaterMesh,
    bottleWaterMat,
  };
}

/**
 * 3D Composite Sailing Ship for the Storm Shipwreck Intro Cinematic.
 */
export function createSailingShipModel(): THREE.Group {
  const ship = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.85 });
  const deckMat = new THREE.MeshStandardMaterial({ color: 0x85532a, roughness: 0.82 });
  const sailMat = new THREE.MeshStandardMaterial({
    color: 0xe5dccb,
    roughness: 0.9,
    side: THREE.DoubleSide,
  });

  // Main Hull + Bow + Stern Cabin
  const hull = new THREE.Mesh(new THREE.BoxGeometry(4.6, 2.6, 13.5), hullMat);
  hull.position.y = 0.8;
  const bow = new THREE.Mesh(new THREE.ConeGeometry(2.4, 4.5, 4), hullMat);
  bow.rotation.x = Math.PI / 2;
  bow.rotation.y = Math.PI / 4;
  bow.scale.set(1.0, 1.0, 0.72);
  bow.position.set(0, 1.05, 8.2);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.25, 13.0), deckMat);
  deck.position.y = 2.15;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.7, 3.6), hullMat);
  cabin.position.set(0, 3.0, -4.4);
  ship.add(hull, bow, deck, cabin);

  // Masts & Sails
  [
    [0, 3.2, 8.6],
    [-3.4, -2.2, 6.8],
  ].forEach(([mz, _, h]) => {
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, h, 8), hullMat);
    mast.position.set(0, 2.2 + h / 2, mz);
    const yard = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 5.2, 6), hullMat);
    yard.rotation.z = Math.PI / 2;
    yard.position.set(0, 2.2 + h * 0.72, mz + 0.2);
    const sail = new THREE.Mesh(new THREE.PlaneGeometry(4.8, h * 0.52), sailMat);
    sail.position.set(0, 2.2 + h * 0.48, mz + 0.35);
    ship.add(mast, yard, sail);
  });

  return ship;
}

export function createCreatureModel(species: CreatureSpecies): CreatureRig {
  const root = new THREE.Group();
  const body = new THREE.Group();
  const head = new THREE.Group();
  const tail = new THREE.Group();
  const legs: THREE.Group[] = [];
  let jaw: THREE.Group | undefined;
  let wings: THREE.Group[] | undefined;
  let breathWisps: THREE.Mesh[] | undefined;
  let maneTufts: THREE.Mesh[] | undefined;
  let eyeGlowMat: THREE.MeshBasicMaterial | undefined;

  if (species === 'trex') {
    const hideMat = new THREE.MeshStandardMaterial({ color: 0x5c4733, roughness: 0.78 });
    const bellyMat = new THREE.MeshStandardMaterial({ color: 0x8d7255, roughness: 0.82 });
    const toothMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f4, roughness: 0.35 });
    eyeGlowMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.25 });

    body.position.y = 2.55;
    root.add(body);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.55, 2.8), hideMat);
    torso.castShadow = true;
    body.add(torso);
    const chest = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.9, 2.2), bellyMat);
    chest.position.set(0, -0.4, 0.1);
    body.add(chest);

    head.position.set(0, 0.65, 1.45);
    body.add(head);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.62, 1.2, 10), hideMat);
    neck.rotation.x = Math.PI / 5;
    neck.position.set(0, 0.3, 0.2);
    head.add(neck);
    const upperJaw = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.62, 1.55), hideMat);
    upperJaw.position.set(0, 0.78, 0.95);
    upperJaw.castShadow = true;
    head.add(upperJaw);
    [-0.38, 0.38].forEach((ex) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), eyeGlowMat);
      eye.position.set(ex, 0.95, 1.25);
      head.add(eye);
    });

    jaw = new THREE.Group();
    jaw.position.set(0, 0.46, 0.45);
    const lowerJaw = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.25, 1.3), bellyMat);
    lowerJaw.position.set(0, -0.05, 0.55);
    jaw.add(lowerJaw);
    for (let t = -2; t <= 2; t++) {
      const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 4), toothMat);
      tooth.rotation.x = Math.PI;
      tooth.position.set(t * 0.14, 0.46, 1.45);
      head.add(tooth);
    }
    head.add(jaw);

    tail.position.set(0, 0.15, -1.35);
    const tailBase = new THREE.Mesh(new THREE.ConeGeometry(0.58, 3.6, 8), hideMat);
    tailBase.rotation.x = -Math.PI / 2;
    tailBase.position.z = -1.7;
    tail.add(tailBase);
    body.add(tail);

    [-1, 1].forEach((side) => {
      const leg = new THREE.Group();
      leg.position.set(side * 0.68, -0.45, -0.2);
      const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.48, 1.15, 0.68), hideMat);
      thigh.position.y = -0.5;
      thigh.castShadow = true;
      const shin = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.0, 0.36), hideMat);
      shin.position.set(0, -1.4, -0.1);
      leg.add(thigh, shin);
      body.add(leg);
      legs.push(leg);
    });
    root.add(makeContactShadow(2.2));
  } else if (species === 'brachiosaurus') {
    const skinMat = new THREE.MeshStandardMaterial({ color: 0x627355, roughness: 0.84 });
    body.position.y = 3.2;
    root.add(body);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(2.1, 2.2, 4.2), skinMat);
    torso.castShadow = true;
    body.add(torso);

    head.position.set(0, 1.1, 1.9);
    const longNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.65, 6.2, 10), skinMat);
    longNeck.rotation.x = 0.25;
    longNeck.position.set(0, 2.8, 0.8);
    longNeck.castShadow = true;
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.56, 1.1), skinMat);
    skull.position.set(0, 5.8, 1.6);
    head.add(longNeck, skull);
    body.add(head);

    tail.position.set(0, 0.2, -2.1);
    const tailMesh = new THREE.Mesh(new THREE.ConeGeometry(0.5, 4.2, 8), skinMat);
    tailMesh.rotation.x = -Math.PI / 2;
    tailMesh.position.z = -2.0;
    tail.add(tailMesh);
    body.add(tail);

    [
      [-0.85, 1.3],
      [0.85, 1.3],
      [-0.85, -1.3],
      [0.85, -1.3],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Group();
      leg.position.set(lx, -0.6, lz);
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 2.6, 8), skinMat);
      col.position.y = -1.3;
      col.castShadow = true;
      leg.add(col);
      body.add(leg);
      legs.push(leg);
    });
    root.add(makeContactShadow(2.8));
  } else if (species === 'velociraptor') {
    const scaleMat = new THREE.MeshStandardMaterial({ color: 0x3b6e4c, roughness: 0.72 });
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.7 });
    eyeGlowMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.25 });
    body.position.y = 1.05;
    root.add(body);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.56, 1.25), scaleMat);
    torso.castShadow = true;
    body.add(torso);
    head.position.set(0, 0.32, 0.65);
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.75), scaleMat);
    snout.position.set(0, 0.32, 0.36);
    const crest = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.24, 0.36), stripeMat);
    crest.position.set(0, 0.54, 0.36);
    [-0.14, 0.14].forEach((ex) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 5, 5), eyeGlowMat);
      eye.position.set(ex, 0.39, 0.52);
      head.add(eye);
    });
    head.add(snout, crest);
    body.add(head);
    tail.position.set(0, 0.08, -0.6);
    const tailMesh = new THREE.Mesh(new THREE.ConeGeometry(0.18, 1.9, 6), scaleMat);
    tailMesh.rotation.x = -Math.PI / 2;
    tailMesh.position.z = -0.95;
    tail.add(tailMesh);
    body.add(tail);
    [-1, 1].forEach((side) => {
      const leg = new THREE.Group();
      leg.position.set(side * 0.28, -0.15, -0.1);
      const limb = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.85, 0.22), scaleMat);
      limb.position.y = -0.45;
      leg.add(limb);
      body.add(leg);
      legs.push(leg);
    });
    root.add(makeContactShadow(0.95));
  } else if (species === 'triceratops') {
    const armorMat = new THREE.MeshStandardMaterial({ color: 0x6b604e, roughness: 0.85 });
    const hornMat = new THREE.MeshStandardMaterial({ color: 0xe7e5e4, roughness: 0.4 });
    body.position.y = 1.35;
    root.add(body);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 2.3), armorMat);
    torso.castShadow = true;
    body.add(torso);
    head.position.set(0, 0.2, 1.25);
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.78, 1.05), armorMat);
    skull.position.set(0, 0.05, 0.45);
    const frill = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 0.88, 0.16, 12), armorMat);
    frill.rotation.x = Math.PI / 2.4;
    frill.position.set(0, 0.48, 0.02);
    head.add(skull, frill);
    [-0.28, 0.28].forEach((hx) => {
      const browHorn = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.85, 7), hornMat);
      browHorn.rotation.x = Math.PI / 2.6;
      browHorn.position.set(hx, 0.38, 0.95);
      head.add(browHorn);
    });
    body.add(head);
    tail.position.set(0, 0, -1.15);
    const tailMesh = new THREE.Mesh(new THREE.ConeGeometry(0.32, 1.5, 7), armorMat);
    tailMesh.rotation.x = -Math.PI / 2;
    tailMesh.position.z = -0.7;
    tail.add(tailMesh);
    body.add(tail);
    [
      [-0.52, 0.72],
      [0.52, 0.72],
      [-0.55, -0.72],
      [0.55, -0.72],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Group();
      leg.position.set(lx, -0.35, lz);
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 1.0, 8), armorMat);
      pillar.position.y = -0.5;
      leg.add(pillar);
      body.add(leg);
      legs.push(leg);
    });
    root.add(makeContactShadow(1.75));
  } else if (species === 'stegosaurus') {
    const skinMat = new THREE.MeshStandardMaterial({ color: 0x4e6642, roughness: 0.82 });
    const plateMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.65 });
    body.position.y = 1.3;
    root.add(body);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.25, 2.35), skinMat);
    torso.castShadow = true;
    body.add(torso);
    for (let i = 0; i < 6; i++) {
      const plate = new THREE.Mesh(new THREE.OctahedronGeometry(0.34, 0), plateMat);
      plate.scale.set(0.28, 1.35, 0.9);
      plate.position.set(i % 2 === 0 ? -0.18 : 0.18, 0.85, 0.8 - i * 0.36);
      body.add(plate);
    }
    head.position.set(0, -0.1, 1.3);
    const smallHead = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.38, 0.7), skinMat);
    smallHead.position.z = 0.32;
    head.add(smallHead);
    body.add(head);
    tail.position.set(0, 0.05, -1.15);
    const tailMesh = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.8, 7), skinMat);
    tailMesh.rotation.x = -Math.PI / 2;
    tailMesh.position.z = -0.85;
    tail.add(tailMesh);
    body.add(tail);
    [
      [-0.48, 0.7],
      [0.48, 0.7],
      [-0.48, -0.7],
      [0.48, -0.7],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Group();
      leg.position.set(lx, -0.3, lz);
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 1.0, 8), skinMat);
      pillar.position.y = -0.5;
      leg.add(pillar);
      body.add(leg);
      legs.push(leg);
    });
    root.add(makeContactShadow(1.65));
  } else if (species === 'parasaurolophus') {
    const skinMat = new THREE.MeshStandardMaterial({ color: 0x748554, roughness: 0.76 });
    const crestMat = new THREE.MeshStandardMaterial({ color: 0xc2410c, roughness: 0.65 });
    body.position.y = 1.45;
    root.add(body);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.0, 2.0), skinMat);
    torso.castShadow = true;
    body.add(torso);
    head.position.set(0, 0.45, 1.05);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.34, 0.9, 8), skinMat);
    neck.rotation.x = Math.PI / 4;
    neck.position.set(0, 0.2, 0.22);
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.38, 0.75), skinMat);
    skull.position.set(0, 0.56, 0.52);
    const crest = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 1.05, 8), crestMat);
    crest.rotation.x = -Math.PI / 3;
    crest.position.set(0, 0.78, 0.05);
    head.add(neck, skull, crest);
    body.add(head);
    tail.position.set(0, 0.1, -1.0);
    const tailMesh = new THREE.Mesh(new THREE.ConeGeometry(0.28, 2.0, 7), skinMat);
    tailMesh.rotation.x = -Math.PI / 2;
    tailMesh.position.z = -0.95;
    tail.add(tailMesh);
    body.add(tail);
    [
      [-0.36, 0.62],
      [0.36, 0.62],
      [-0.38, -0.58],
      [0.38, -0.58],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Group();
      leg.position.set(lx, -0.25, lz);
      const limb = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.15, 1.2, 8), skinMat);
      limb.position.y = -0.6;
      leg.add(limb);
      body.add(leg);
      legs.push(leg);
    });
    root.add(makeContactShadow(1.35));
  } else if (species === 'deer') {
    const coatMat = new THREE.MeshStandardMaterial({ color: 0x9a6b42, roughness: 0.85 });
    const antlerMat = new THREE.MeshStandardMaterial({ color: 0xd6c7a9, roughness: 0.6 });
    body.position.y = 0.98;
    root.add(body);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.52, 1.15), coatMat);
    torso.castShadow = true;
    body.add(torso);
    head.position.set(0, 0.35, 0.55);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.17, 0.55, 7), coatMat);
    neck.rotation.x = 0.3;
    neck.position.set(0, 0.18, 0.08);
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.38), coatMat);
    skull.position.set(0, 0.42, 0.25);
    [-0.1, 0.1].forEach((ax) => {
      const antler = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.42, 5), antlerMat);
      antler.rotation.z = ax > 0 ? -0.35 : 0.35;
      antler.position.set(ax, 0.66, 0.14);
      head.add(antler);
    });
    head.add(neck, skull);
    body.add(head);
    body.add(tail);
    [
      [-0.16, 0.38],
      [0.16, 0.38],
      [-0.16, -0.38],
      [0.16, -0.38],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Group();
      leg.position.set(lx, -0.22, lz);
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.76, 6), coatMat);
      l.position.y = -0.38;
      leg.add(l);
      body.add(leg);
      legs.push(leg);
    });
    root.add(makeContactShadow(0.65));
  } else if (species === 'cattle') {
    // Holstein Dairy Cow — distinct black & white coat, detailed muscle anatomy, udder, wet muzzle
    const tex = getAnimalTextures().holstein;
    const coatMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.72 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.76 });
    const muzzleMat = new THREE.MeshPhysicalMaterial({
      color: 0xf4b6b2,
      roughness: 0.28,
      clearcoat: 0.45,
      clearcoatRoughness: 0.22,
    });
    const udderMat = new THREE.MeshStandardMaterial({ color: 0xf9cbd3, roughness: 0.58 });
    const hornMat = new THREE.MeshStandardMaterial({ color: 0xe7e5e4, roughness: 0.42 });
    const eyeMat = new THREE.MeshPhysicalMaterial({
      color: 0x111827,
      roughness: 0.08,
      clearcoat: 1.0,
    });

    body.position.y = 1.12;
    root.add(body);

    // Sculpted muscular barrel, ribcage, shoulder mass & hindquarters
    const barrel = new THREE.Mesh(new THREE.CapsuleGeometry(0.46, 0.88, 6, 12), coatMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.scale.set(0.95, 1.0, 1.06);
    barrel.castShadow = true;
    const chestMuscle = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), coatMat);
    chestMuscle.scale.set(0.92, 1.04, 1.0);
    chestMuscle.position.set(0, -0.04, 0.42);
    chestMuscle.castShadow = true;
    const rumpMuscle = new THREE.Mesh(new THREE.SphereGeometry(0.44, 10, 8), coatMat);
    rumpMuscle.scale.set(0.94, 0.98, 0.96);
    rumpMuscle.position.set(0, 0.02, -0.45);
    rumpMuscle.castShadow = true;
    const withers = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.24, 0.52), darkMat);
    withers.position.set(0, 0.36, 0.36);
    const dewlap = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.38, 7), coatMat);
    dewlap.rotation.x = Math.PI;
    dewlap.position.set(0, -0.34, 0.62);
    const udder = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 7), udderMat);
    udder.scale.set(0.95, 0.72, 1.05);
    udder.position.set(0, -0.44, -0.34);
    for (let tx = -1; tx <= 1; tx += 2) {
      for (let tz = -1; tz <= 1; tz += 2) {
        const teat = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.014, 0.08, 5), muzzleMat);
        teat.position.set(tx * 0.065, -0.56, -0.34 + tz * 0.055);
        body.add(teat);
      }
    }
    body.add(barrel, chestMuscle, rumpMuscle, withers, dewlap, udder);

    head.position.set(0, 0.26, 0.78);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.32, 0.48, 8), coatMat);
    neck.rotation.x = Math.PI / 3.2;
    neck.position.set(0, 0.05, 0.06);
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.34, 0.46), darkMat);
    skull.position.set(0, 0.14, 0.28);
    skull.castShadow = true;
    const blaze = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.22, 0.06), hornMat);
    blaze.position.set(0, 0.16, 0.51);
    const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 0.18), muzzleMat);
    muzzle.position.set(0, 0.01, 0.52);
    [-0.08, 0.08].forEach((nx) => {
      const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.025, 5, 5), darkMat);
      nostril.position.set(nx, 0.03, 0.61);
      head.add(nostril);
    });
    [-0.17, 0.17].forEach((ex) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.038, 7, 6), eyeMat);
      eye.position.set(ex, 0.22, 0.38);
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.07, 0.11), coatMat);
      ear.rotation.z = ex > 0 ? -0.25 : 0.25;
      ear.position.set(ex * 1.65, 0.22, 0.16);
      const h = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.2, 6), hornMat);
      h.rotation.z = ex > 0 ? -0.95 : 0.95;
      h.rotation.x = 0.35;
      h.position.set(ex * 0.9, 0.35, 0.18);
      head.add(eye, ear, h);
    });
    head.add(neck, skull, blaze, muzzle);
    body.add(head);

    tail.position.set(0, 0.24, -0.84);
    const tailCord = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.02, 0.65, 6), coatMat);
    tailCord.rotation.x = 0.28;
    tailCord.position.set(0, -0.32, -0.09);
    const tailSwitch = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.2, 6), darkMat);
    tailSwitch.position.set(0, -0.68, -0.18);
    tail.add(tailCord, tailSwitch);
    body.add(tail);

    [
      [-0.31, 0.46],
      [0.31, 0.46],
      [-0.32, -0.48],
      [0.32, -0.48],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Group();
      leg.position.set(lx, -0.24, lz);
      const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.34, 4, 7), coatMat);
      upper.position.y = -0.22;
      upper.castShadow = true;
      const cannon = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.06, 0.42, 7), coatMat);
      cannon.position.y = -0.6;
      const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.082, 0.11, 7), darkMat);
      hoof.position.y = -0.82;
      leg.add(upper, cannon, hoof);
      body.add(leg);
      legs.push(leg);
    });
    root.add(makeContactShadow(1.1));
  } else if (species === 'pig') {
    // Large Pink Yorkshire Pig — coarse sparse bristles, muddy hooves, floppy ears, curly tail
    const pigTex = getAnimalTextures().pig;
    const skinMat = new THREE.MeshStandardMaterial({ map: pigTex, roughness: 0.66 });
    const snoutMat = new THREE.MeshStandardMaterial({ color: 0xf4979c, roughness: 0.48 });
    const bristleMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.92 });
    const mudHoofMat = new THREE.MeshStandardMaterial({
      color: 0x3f2a1d,
      roughness: 0.44,
      metalness: 0.05,
    });
    const eyeMat = new THREE.MeshPhysicalMaterial({ color: 0x1c1917, roughness: 0.12, clearcoat: 0.9 });

    body.position.y = 0.62;
    root.add(body);

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.36, 0.64, 6, 12), skinMat);
    torso.rotation.x = Math.PI / 2;
    torso.scale.set(1.06, 0.96, 1.0);
    torso.castShadow = true;
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.36, 9, 8), skinMat);
    belly.scale.set(1.04, 0.85, 1.35);
    belly.position.y = -0.05;
    body.add(torso, belly);

    // Coarse sparse spine bristles
    for (let b = 0; b < 7; b++) {
      const bristle = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.09, 4), bristleMat);
      bristle.position.set((b % 2 === 0 ? -1 : 1) * 0.02, 0.36, 0.32 - b * 0.11);
      bristle.rotation.x = -0.25;
      body.add(bristle);
    }

    head.position.set(0, 0.06, 0.56);
    const jowl = new THREE.Mesh(new THREE.SphereGeometry(0.26, 9, 8), skinMat);
    jowl.scale.set(1.02, 0.95, 1.1);
    jowl.position.z = 0.12;
    jowl.castShadow = true;
    const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.14, 10), snoutMat);
    snout.rotation.x = Math.PI / 2;
    snout.position.set(0, -0.03, 0.38);
    [-0.04, 0.04].forEach((nx) => {
      const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.02, 5, 5), mudHoofMat);
      nostril.position.set(nx, -0.03, 0.45);
      head.add(nostril);
    });
    [-0.14, 0.14].forEach((ex) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.026, 6, 6), eyeMat);
      eye.position.set(ex, 0.08, 0.28);
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.035, 0.2), skinMat);
      ear.rotation.x = 0.55;
      ear.rotation.z = ex > 0 ? -0.45 : 0.45;
      ear.position.set(ex * 1.15, 0.2, 0.12);
      head.add(eye, ear);
    });
    head.add(jowl, snout);
    body.add(head);

    tail.position.set(0, 0.12, -0.58);
    const curl = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.018, 6, 12, Math.PI * 1.65), skinMat);
    curl.rotation.y = Math.PI / 2;
    curl.position.z = -0.04;
    tail.add(curl);
    body.add(tail);

    [
      [-0.22, 0.34],
      [0.22, 0.34],
      [-0.22, -0.34],
      [0.22, -0.34],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Group();
      leg.position.set(lx, -0.22, lz);
      const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.068, 0.24, 7), skinMat);
      upper.position.y = -0.11;
      const mudLower = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.068, 0.14, 7), mudHoofMat);
      mudLower.position.y = -0.29;
      const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.075, 0.07, 7), mudHoofMat);
      hoof.position.y = -0.37;
      leg.add(upper, mudLower, hoof);
      body.add(leg);
      legs.push(leg);
    });
    root.add(makeContactShadow(0.68));
  } else if (species === 'horse') {
    // Chestnut Quarter Horse — glossy coat, flowing mane and tail, muscular build, reflective eyes
    const horseTex = getAnimalTextures().horse;
    const coatMat = new THREE.MeshPhysicalMaterial({
      map: horseTex,
      roughness: 0.34,
      clearcoat: 0.65,
      clearcoatRoughness: 0.24,
      sheen: 0.55,
      sheenColor: new THREE.Color(0xd97706),
    });
    const maneMat = new THREE.MeshStandardMaterial({ color: 0x2c140a, roughness: 0.78 });
    const muzzleMat = new THREE.MeshStandardMaterial({ color: 0x3b1e14, roughness: 0.48 });
    const blazeMat = new THREE.MeshStandardMaterial({ color: 0xfafaf9, roughness: 0.6 });
    const hoofMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.36 });
    const eyeMat = new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      roughness: 0.04,
      clearcoat: 1.0,
      reflectivity: 1.0,
    });

    body.position.y = 1.28;
    root.add(body);

    // Muscular Quarter Horse barrel, deep chest & powerful hindquarters
    const barrel = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 0.96, 6, 12), coatMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.scale.set(0.9, 1.02, 1.0);
    barrel.castShadow = true;
    const chest = new THREE.Mesh(new THREE.SphereGeometry(0.41, 10, 8), coatMat);
    chest.scale.set(0.88, 1.06, 0.98);
    chest.position.set(0, 0.02, 0.45);
    chest.castShadow = true;
    const hindquarters = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), coatMat);
    hindquarters.scale.set(0.92, 1.02, 1.04);
    hindquarters.position.set(0, 0.06, -0.48);
    hindquarters.castShadow = true;
    body.add(barrel, chest, hindquarters);

    head.position.set(0, 0.32, 0.68);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.3, 0.88, 9), coatMat);
    neck.rotation.x = 0.58;
    neck.position.set(0, 0.32, 0.24);
    neck.castShadow = true;
    // Flowing multi-lock mane crest along upper neck
    for (let m = 0; m < 6; m++) {
      const lock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.14), maneMat);
      const t = m / 5;
      lock.position.set(0.05, 0.14 + t * 0.48, 0.02 + t * 0.36);
      lock.rotation.z = -0.35;
      lock.rotation.x = 0.45;
      head.add(lock);
    }

    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.26, 0.42), coatMat);
    skull.rotation.x = 0.42;
    skull.position.set(0, 0.56, 0.62);
    skull.castShadow = true;
    const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.115, 0.24, 8), muzzleMat);
    snout.rotation.x = Math.PI / 2 + 0.42;
    snout.position.set(0, 0.43, 0.84);
    const blaze = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.04, 0.36), blazeMat);
    blaze.rotation.x = 0.42;
    blaze.position.set(0, 0.63, 0.7);
    [-0.08, 0.08].forEach((ex) => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.17, 5), coatMat);
      ear.rotation.x = 0.15;
      ear.rotation.z = ex > 0 ? -0.15 : 0.15;
      ear.position.set(ex, 0.78, 0.46);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 7), eyeMat);
      eye.position.set(ex * 1.45, 0.63, 0.65);
      head.add(ear, eye);
    });
    head.add(neck, skull, snout, blaze);
    body.add(head);

    // Flowing horse tail
    tail.position.set(0, 0.26, -0.88);
    for (let t = 0; t < 3; t++) {
      const strand = new THREE.Mesh(new THREE.ConeGeometry(0.08 - t * 0.015, 0.86, 7), maneMat);
      strand.rotation.x = 0.24 + t * 0.08;
      strand.position.set((t - 1) * 0.025, -0.4, -0.1 - t * 0.05);
      tail.add(strand);
    }
    body.add(tail);

    [
      [-0.24, 0.52],
      [0.24, 0.52],
      [-0.25, -0.52],
      [0.25, -0.52],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Group();
      leg.position.set(lx, -0.18, lz);
      const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.44, 4, 7), coatMat);
      forearm.position.y = -0.26;
      forearm.castShadow = true;
      const cannon = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.045, 0.52, 7), coatMat);
      cannon.position.y = -0.74;
      const fetlock = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 6), maneMat);
      fetlock.position.y = -0.98;
      const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.072, 0.1, 7), hoofMat);
      hoof.position.y = -1.06;
      leg.add(forearm, cannon, fetlock, hoof);
      body.add(leg);
      legs.push(leg);
    });
    root.add(makeContactShadow(1.05));
  } else if (species === 'sheep') {
    // Suffolk Sheep — thick textured white wool fleece + matte black face & legs
    const woolTex = getAnimalTextures().wool;
    const woolMat = new THREE.MeshStandardMaterial({ map: woolTex, roughness: 0.96 });
    const blackFaceMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.86 });
    const eyeMat = new THREE.MeshPhysicalMaterial({ color: 0xd97706, roughness: 0.12, clearcoat: 0.9 });

    body.position.y = 0.68;
    root.add(body);

    // Thick layered wool fleece cloud wrapping torso
    const core = new THREE.Mesh(new THREE.CapsuleGeometry(0.33, 0.58, 6, 10), woolMat);
    core.rotation.x = Math.PI / 2;
    core.castShadow = true;
    body.add(core);
    const fleecePuffs: [number, number, number, number][] = [
      [0, 0.18, 0.25, 0.26],
      [0, 0.2, -0.22, 0.26],
      [-0.22, 0.05, 0.06, 0.24],
      [0.22, 0.05, 0.06, 0.24],
      [-0.2, 0.06, -0.24, 0.23],
      [0.2, 0.06, -0.24, 0.23],
      [0, 0.14, 0.44, 0.22],
    ];
    fleecePuffs.forEach(([px, py, pz, r]) => {
      const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 1), woolMat);
      puff.position.set(px, py, pz);
      puff.castShadow = true;
      body.add(puff);
    });

    head.position.set(0, 0.18, 0.52);
    const skull = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.18, 5, 8), blackFaceMat);
    skull.rotation.x = Math.PI / 2.2;
    skull.position.z = 0.16;
    skull.castShadow = true;
    const woolCrown = new THREE.Mesh(new THREE.SphereGeometry(0.11, 7, 6), woolMat);
    woolCrown.position.set(0, 0.11, 0.04);
    [-0.12, 0.12].forEach((ex) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), eyeMat);
      eye.position.set(ex, 0.06, 0.22);
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.04, 0.08), blackFaceMat);
      ear.rotation.z = ex > 0 ? -0.45 : 0.45;
      ear.position.set(ex * 1.35, 0.04, 0.08);
      head.add(eye, ear);
    });
    head.add(skull, woolCrown);
    body.add(head);

    tail.position.set(0, 0.08, -0.52);
    const woolTail = new THREE.Mesh(new THREE.SphereGeometry(0.1, 7, 6), woolMat);
    woolTail.position.set(0, -0.05, -0.04);
    tail.add(woolTail);
    body.add(tail);

    [
      [-0.18, 0.28],
      [0.18, 0.28],
      [-0.18, -0.28],
      [0.18, -0.28],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Group();
      leg.position.set(lx, -0.2, lz);
      const woolTop = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), woolMat);
      const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.036, 0.46, 6), blackFaceMat);
      shin.position.y = -0.24;
      leg.add(woolTop, shin);
      body.add(leg);
      legs.push(leg);
    });
    root.add(makeContactShadow(0.62));
  } else if (species === 'goat') {
    // Nigerian Dwarf Goat — mottled brown & white fur, small curved horns, alert expression
    const goatTex = getAnimalTextures().goat;
    const coatMat = new THREE.MeshStandardMaterial({ map: goatTex, roughness: 0.82 });
    const darkBrownMat = new THREE.MeshStandardMaterial({ color: 0x29180e, roughness: 0.72 });
    const hornMat = new THREE.MeshStandardMaterial({ color: 0x3f3a36, roughness: 0.48 });
    const eyeMat = new THREE.MeshPhysicalMaterial({ color: 0xf59e0b, roughness: 0.08, clearcoat: 1.0 });

    body.position.y = 0.56;
    root.add(body);
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.46, 5, 10), coatMat);
    torso.rotation.x = Math.PI / 2;
    torso.scale.set(0.92, 1.04, 1.0);
    torso.castShadow = true;
    body.add(torso);

    head.position.set(0, 0.24, 0.34);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.12, 0.26, 7), coatMat);
    neck.rotation.x = 0.35;
    neck.position.set(0, 0.08, 0.04);
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.28), coatMat);
    skull.position.set(0, 0.2, 0.16);
    skull.castShadow = true;
    const beard = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.13, 5), darkBrownMat);
    beard.rotation.x = Math.PI;
    beard.position.set(0, 0.06, 0.25);
    [-0.08, 0.08].forEach((hx) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 6), eyeMat);
      eye.position.set(hx * 1.1, 0.24, 0.22);
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.06), coatMat);
      ear.rotation.z = hx > 0 ? 0.18 : -0.18;
      ear.position.set(hx * 1.55, 0.25, 0.08);
      // Small backward-curving horn
      const hornLower = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.14, 6), hornMat);
      hornLower.rotation.x = -0.45;
      hornLower.rotation.z = hx > 0 ? -0.22 : 0.22;
      hornLower.position.set(hx * 0.75, 0.34, 0.09);
      const hornTip = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.1, 5), hornMat);
      hornTip.rotation.x = -1.05;
      hornTip.position.set(hx * 0.95, 0.38, 0.01);
      head.add(eye, ear, hornLower, hornTip);
    });
    head.add(neck, skull, beard);
    body.add(head);

    tail.position.set(0, 0.14, -0.38);
    const uprightTail = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.14, 5), darkBrownMat);
    uprightTail.rotation.x = -0.5;
    uprightTail.position.set(0, 0.06, -0.03);
    tail.add(uprightTail);
    body.add(tail);

    [
      [-0.12, 0.22],
      [0.12, 0.22],
      [-0.12, -0.22],
      [0.12, -0.22],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Group();
      leg.position.set(lx, -0.14, lz);
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.032, 0.38, 6), coatMat);
      l.position.y = -0.19;
      const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.06, 6), darkBrownMat);
      hoof.position.y = -0.39;
      leg.add(l, hoof);
      body.add(leg);
      legs.push(leg);
    });
    root.add(makeContactShadow(0.45));
  } else if (species === 'rabbit') {
    const furMat = new THREE.MeshStandardMaterial({ color: 0xa8927c, roughness: 0.92 });
    body.position.y = 0.26;
    root.add(body);
    const torso = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), furMat);
    torso.scale.set(0.85, 0.85, 1.3);
    body.add(torso);
    head.position.set(0, 0.14, 0.22);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), furMat);
    [-0.05, 0.05].forEach((ex) => {
      const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.18, 3, 5), furMat);
      ear.position.set(ex, 0.18, -0.02);
      head.add(ear);
    });
    head.add(skull);
    body.add(head);
    body.add(tail);
    [-0.1, 0.1].forEach((lx) => {
      const leg = new THREE.Group();
      leg.position.set(lx, -0.1, -0.1);
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.14), furMat);
      leg.add(l);
      body.add(leg);
      legs.push(leg);
    });
    root.add(makeContactShadow(0.28));
  } else if (species === 'wild_boar') {
    const furMat = new THREE.MeshStandardMaterial({ color: 0x4b3629, roughness: 0.9 });
    const tuskMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f4, roughness: 0.4 });
    body.position.y = 0.6;
    root.add(body);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.52, 0.96), furMat);
    torso.castShadow = true;
    body.add(torso);
    head.position.set(0, 0.06, 0.54);
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.34, 0.44), furMat);
    snout.position.z = 0.16;
    [-0.14, 0.14].forEach((tx) => {
      const tusk = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.18, 5), tuskMat);
      tusk.rotation.x = -0.4;
      tusk.position.set(tx, -0.04, 0.36);
      head.add(tusk);
    });
    head.add(snout);
    body.add(head);
    body.add(tail);
    [
      [-0.2, 0.32],
      [0.2, 0.32],
      [-0.2, -0.32],
      [0.2, -0.32],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Group();
      leg.position.set(lx, -0.2, lz);
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.4, 6), furMat);
      l.position.y = -0.2;
      leg.add(l);
      body.add(leg);
      legs.push(leg);
    });
    root.add(makeContactShadow(0.58));
  } else if (species === 'jungle_fowl') {
    // Rhode Island Red Rooster — iridescent dark red & black tail feathers, bright red comb & wattle
    const featherMat = new THREE.MeshPhysicalMaterial({
      color: 0x7f1d1d,
      roughness: 0.5,
      iridescence: 0.42,
      iridescenceIOR: 1.35,
    });
    const hackleMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.52 });
    const tailIridescentMat = new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      roughness: 0.25,
      metalness: 0.35,
      iridescence: 0.95,
      iridescenceIOR: 1.5,
      clearcoat: 0.7,
    });
    const combMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.42 });
    const beakMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.45 });
    const eyeMat = new THREE.MeshPhysicalMaterial({ color: 0x111827, roughness: 0.08, clearcoat: 1.0 });

    body.position.y = 0.4;
    root.add(body);
    const torso = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), featherMat);
    torso.scale.set(0.84, 0.9, 1.24);
    torso.castShadow = true;
    body.add(torso);
    [-0.18, 0.18].forEach((wx) => {
      const wing = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), hackleMat);
      wing.scale.set(0.45, 0.85, 1.35);
      wing.position.set(wx, 0.02, -0.02);
      body.add(wing);
    });

    head.position.set(0, 0.2, 0.2);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.2, 8), hackleMat);
    neck.rotation.x = 0.25;
    neck.position.set(0, 0.06, 0.04);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.105, 8, 8), hackleMat);
    skull.position.set(0, 0.16, 0.08);
    // Serrated bright red comb
    for (let c = 0; c < 4; c++) {
      const point = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.075, 5), combMat);
      point.position.set(0, 0.26 + (c === 1 || c === 2 ? 0.015 : 0), 0.03 + c * 0.032);
      head.add(point);
    }
    // Bright red wattle under beak
    [-0.024, 0.024].forEach((wx) => {
      const wattle = new THREE.Mesh(new THREE.SphereGeometry(0.028, 6, 6), combMat);
      wattle.scale.set(0.75, 1.35, 0.75);
      wattle.position.set(wx, 0.09, 0.16);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 5, 5), eyeMat);
      eye.position.set(wx * 3.5, 0.18, 0.12);
      head.add(wattle, eye);
    });
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.11, 5), beakMat);
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 0.14, 0.2);
    head.add(neck, skull, beak);
    body.add(head);

    // Sweeping iridescent dark red & black sickle tail feathers
    tail.position.set(0, 0.14, -0.26);
    for (let f = 0; f < 5; f++) {
      const feather = new THREE.Mesh(
        new THREE.ConeGeometry(0.045, 0.34 + (f % 2) * 0.08, 5),
        f % 2 === 0 ? tailIridescentMat : featherMat,
      );
      feather.rotation.x = -0.65 - (f - 2) * 0.12;
      feather.rotation.z = (f - 2) * 0.14;
      feather.position.set((f - 2) * 0.028, 0.12, -0.1);
      tail.add(feather);
    }
    body.add(tail);

    [-0.08, 0.08].forEach((lx) => {
      const leg = new THREE.Group();
      leg.position.set(lx, -0.14, 0.02);
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.018, 0.24, 5), beakMat);
      l.position.y = -0.12;
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.018, 0.1), beakMat);
      foot.position.set(0, -0.25, 0.025);
      leg.add(l, foot);
      body.add(leg);
      legs.push(leg);
    });
    root.add(makeContactShadow(0.28));
  } else if (species === 'duck') {
    // Pekin Duck — bright white plumage with water-droplet sheen, vibrant orange bill & webbed feet
    const whitePlumageMat = new THREE.MeshPhysicalMaterial({
      color: 0xfefefe,
      roughness: 0.42,
      clearcoat: 0.55,
      clearcoatRoughness: 0.16,
    });
    const dropletMat = new THREE.MeshPhysicalMaterial({
      color: 0xe0f2fe,
      roughness: 0.05,
      clearcoat: 1.0,
      transparent: true,
      opacity: 0.85,
    });
    const orangeMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.38 });
    const eyeMat = new THREE.MeshPhysicalMaterial({ color: 0x0f172a, roughness: 0.06, clearcoat: 1.0 });

    body.position.y = 0.28;
    root.add(body);
    const torso = new THREE.Mesh(new THREE.SphereGeometry(0.21, 10, 8), whitePlumageMat);
    torso.scale.set(0.88, 0.82, 1.38);
    torso.castShadow = true;
    body.add(torso);
    [-0.16, 0.16].forEach((wx) => {
      const wing = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), whitePlumageMat);
      wing.scale.set(0.45, 0.72, 1.45);
      wing.position.set(wx, 0.02, -0.02);
      body.add(wing);
    });
    // Glistening water droplets beaded along back feathers
    [
      [0.05, 0.17, 0.04],
      [-0.06, 0.16, -0.06],
      [0.08, 0.14, -0.11],
      [-0.02, 0.17, 0.09],
    ].forEach(([dx, dy, dz]) => {
      const drop = new THREE.Mesh(new THREE.SphereGeometry(0.015, 5, 5), dropletMat);
      drop.position.set(dx, dy, dz);
      body.add(drop);
    });

    head.position.set(0, 0.16, 0.2);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.095, 0.18, 8), whitePlumageMat);
    neck.rotation.x = 0.15;
    neck.position.set(0, 0.06, 0.02);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.095, 8, 8), whitePlumageMat);
    skull.position.set(0, 0.16, 0.05);
    const bill = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.032, 0.14), orangeMat);
    bill.position.set(0, 0.14, 0.16);
    [-0.068, 0.068].forEach((ex) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.016, 5, 5), eyeMat);
      eye.position.set(ex, 0.18, 0.09);
      head.add(eye);
    });
    head.add(neck, skull, bill);
    body.add(head);

    tail.position.set(0, 0.08, -0.28);
    const tailTip = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 6), whitePlumageMat);
    tailTip.rotation.x = -1.15;
    tailTip.position.set(0, 0.04, -0.05);
    tail.add(tailTip);
    body.add(tail);

    [-0.075, 0.075].forEach((lx) => {
      const leg = new THREE.Group();
      leg.position.set(lx, -0.12, 0.02);
      const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.016, 0.14, 5), orangeMat);
      shin.position.y = -0.07;
      const webbedFoot = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.11, 3), orangeMat);
      webbedFoot.rotation.x = Math.PI / 2;
      webbedFoot.scale.set(1.0, 1.0, 0.2);
      webbedFoot.position.set(0, -0.14, 0.04);
      leg.add(shin, webbedFoot);
      body.add(leg);
      legs.push(leg);
    });
    root.add(makeContactShadow(0.25));
  } else if (species === 'barn_cat') {
    // Scruffy Tabby Barn Cat — striped fur, cream bib, pointed ears, green-amber eyes, 3D whiskers
    const tabbyTex = getAnimalTextures().tabby;
    const furMat = new THREE.MeshStandardMaterial({ map: tabbyTex, roughness: 0.86 });
    const creamMat = new THREE.MeshStandardMaterial({ color: 0xf5ebe0, roughness: 0.88 });
    const pinkMat = new THREE.MeshStandardMaterial({ color: 0xf4a2a8, roughness: 0.55 });
    const eyeMat = new THREE.MeshPhysicalMaterial({
      color: 0x84cc16,
      emissive: 0x3f6212,
      emissiveIntensity: 0.25,
      roughness: 0.06,
      clearcoat: 1.0,
    });
    const whiskerMat = new THREE.MeshStandardMaterial({ color: 0xfafaf9, roughness: 0.4 });

    body.position.y = 0.26;
    root.add(body);
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.28, 5, 9), furMat);
    torso.rotation.x = Math.PI / 2;
    torso.castShadow = true;
    const chestBib = new THREE.Mesh(new THREE.SphereGeometry(0.095, 7, 6), creamMat);
    chestBib.position.set(0, -0.02, 0.14);
    body.add(torso, chestBib);

    head.position.set(0, 0.12, 0.2);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.105, 8, 8), furMat);
    skull.scale.set(1.06, 0.96, 1.0);
    skull.castShadow = true;
    const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), creamMat);
    muzzle.scale.set(1.15, 0.78, 0.9);
    muzzle.position.set(0, -0.025, 0.085);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.014, 5, 5), pinkMat);
    nose.position.set(0, -0.01, 0.128);
    [-1, 1].forEach((side) => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.036, 0.08, 4), furMat);
      ear.rotation.z = -side * 0.22;
      ear.position.set(side * 0.065, 0.095, 0.01);
      const innerEar = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.05, 4), pinkMat);
      innerEar.rotation.z = -side * 0.22;
      innerEar.position.set(side * 0.065, 0.092, 0.022);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), eyeMat);
      eye.position.set(side * 0.046, 0.025, 0.088);
      // 3 crisp whiskers per cheek
      for (let w = -1; w <= 1; w++) {
        const whisker = new THREE.Mesh(
          new THREE.CylinderGeometry(0.002, 0.001, 0.12, 4),
          whiskerMat,
        );
        whisker.rotation.z = Math.PI / 2 + w * 0.14;
        whisker.rotation.y = side * -0.18;
        whisker.position.set(side * 0.075, -0.024 + w * 0.008, 0.095);
        head.add(whisker);
      }
      head.add(ear, innerEar, eye);
    });
    head.add(skull, muzzle, nose);
    body.add(head);

    tail.position.set(0, 0.04, -0.2);
    const tailSeg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.028, 0.24, 6), furMat);
    tailSeg1.rotation.x = -0.85;
    tailSeg1.position.set(0, 0.08, -0.09);
    const tailSeg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.024, 0.18, 6), furMat);
    tailSeg2.rotation.x = -0.2;
    tailSeg2.position.set(0, 0.22, -0.16);
    tail.add(tailSeg1, tailSeg2);
    body.add(tail);

    [
      [-0.07, 0.13],
      [0.07, 0.13],
      [-0.075, -0.13],
      [0.075, -0.13],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Group();
      leg.position.set(lx, -0.07, lz);
      const limb = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.024, 0.17, 6), furMat);
      limb.position.y = -0.08;
      const paw = new THREE.Mesh(new THREE.SphereGeometry(0.026, 6, 5), creamMat);
      paw.position.set(0, -0.17, 0.012);
      leg.add(limb, paw);
      body.add(leg);
      legs.push(leg);
    });
    root.add(makeContactShadow(0.24));
  } else if (species === 'grizzly_bear') {
    // Massive North American Grizzly Bear — silver-tipped dark brown fur, powerful shoulder hump, heavy claws
    const tex = getAnimalTextures().grizzly;
    const furMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 });
    const snoutMat = new THREE.MeshStandardMaterial({ color: 0x6b4b35, roughness: 0.78 });
    const noseMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.35 });
    const clawMat = new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.4 });
    const eyeMat = new THREE.MeshPhysicalMaterial({ color: 0x1c1917, roughness: 0.1, clearcoat: 0.9 });

    body.position.y = 1.04;
    root.add(body);

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.52, 0.92, 6, 12), furMat);
    torso.rotation.x = Math.PI / 2;
    torso.scale.set(1.06, 1.0, 1.0);
    torso.castShadow = true;
    // Powerful grizzly shoulder hump
    const shoulderHump = new THREE.Mesh(new THREE.SphereGeometry(0.46, 10, 8), furMat);
    shoulderHump.scale.set(1.02, 0.96, 1.05);
    shoulderHump.position.set(0, 0.32, 0.42);
    shoulderHump.castShadow = true;
    const hindquarters = new THREE.Mesh(new THREE.SphereGeometry(0.48, 10, 8), furMat);
    hindquarters.position.set(0, 0.04, -0.46);
    hindquarters.castShadow = true;
    body.add(torso, shoulderHump, hindquarters);

    head.position.set(0, 0.24, 0.86);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 0.36, 8), furMat);
    neck.rotation.x = Math.PI / 2.6;
    neck.position.set(0, 0.02, 0.06);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), furMat);
    skull.scale.set(1.12, 0.96, 1.02);
    skull.position.set(0, 0.08, 0.24);
    skull.castShadow = true;
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.2, 0.28), snoutMat);
    snout.position.set(0, 0.0, 0.48);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 6), noseMat);
    nose.position.set(0, 0.06, 0.62);
    [-0.16, 0.16].forEach((ex) => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.085, 7, 6), furMat);
      ear.scale.set(1.0, 1.0, 0.55);
      ear.position.set(ex * 1.15, 0.3, 0.18);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.028, 6, 6), eyeMat);
      eye.position.set(ex * 0.85, 0.14, 0.44);
      head.add(ear, eye);
    });
    head.add(neck, skull, snout, nose);
    body.add(head);

    tail.position.set(0, 0.14, -0.92);
    const stubTail = new THREE.Mesh(new THREE.SphereGeometry(0.11, 6, 6), furMat);
    tail.add(stubTail);
    body.add(tail);

    [
      [-0.35, 0.44],
      [0.35, 0.44],
      [-0.36, -0.46],
      [0.36, -0.46],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Group();
      leg.position.set(lx, -0.22, lz);
      const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.34, 4, 8), furMat);
      thigh.position.y = -0.26;
      thigh.castShadow = true;
      const paw = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.3), furMat);
      paw.position.set(0, -0.74, 0.05);
      for (let c = -1; c <= 1; c++) {
        const claw = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.09, 4), clawMat);
        claw.rotation.x = Math.PI / 2.2;
        claw.position.set(c * 0.065, -0.75, 0.22);
        leg.add(claw);
      }
      leg.add(thigh, paw);
      body.add(leg);
      legs.push(leg);
    });
    root.add(makeContactShadow(1.25));
  } else if (species === 'gray_wolf') {
    // Timber Wolf — thick layered gray & white fur, piercing amber eyes, cold breath visible
    const wolfTex = getAnimalTextures().wolf;
    const furMat = new THREE.MeshStandardMaterial({ map: wolfTex, roughness: 0.84 });
    const whiteRuffMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.88 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
    eyeGlowMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.9 });

    body.position.y = 0.72;
    root.add(body);

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.64, 5, 10), furMat);
    torso.rotation.x = Math.PI / 2;
    torso.scale.set(0.92, 1.02, 1.0);
    torso.castShadow = true;
    const chestRuff = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 8), whiteRuffMat);
    chestRuff.scale.set(0.95, 1.05, 0.95);
    chestRuff.position.set(0, 0.04, 0.34);
    body.add(torso, chestRuff);

    head.position.set(0, 0.22, 0.5);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.22, 0.32, 8), furMat);
    neck.rotation.x = Math.PI / 3.4;
    neck.position.set(0, 0.04, 0.04);
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.28), furMat);
    skull.position.set(0, 0.14, 0.2);
    skull.castShadow = true;
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.11, 0.22), whiteRuffMat);
    snout.position.set(0, 0.09, 0.4);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.028, 5, 5), darkMat);
    nose.position.set(0, 0.12, 0.51);
    [-0.08, 0.08].forEach((ex) => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.15, 5), furMat);
      ear.position.set(ex, 0.29, 0.12);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.024, 6, 6), eyeGlowMat);
      eye.position.set(ex * 0.92, 0.17, 0.32);
      head.add(ear, eye);
    });
    // Visible cold-air breath wisps in front of wolf muzzle
    breathWisps = [];
    const breathMat = new THREE.MeshBasicMaterial({
      color: 0xe2e8f0,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    });
    for (let w = 0; w < 3; w++) {
      const wisp = new THREE.Mesh(new THREE.SphereGeometry(0.055 + w * 0.022, 6, 6), breathMat.clone());
      wisp.position.set((w - 1) * 0.02, 0.12 + w * 0.04, 0.56 + w * 0.09);
      head.add(wisp);
      breathWisps.push(wisp);
    }
    head.add(neck, skull, snout, nose);
    body.add(head);

    tail.position.set(0, 0.1, -0.5);
    const tailMesh = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.54, 7), furMat);
    tailMesh.rotation.x = -Math.PI / 2.6;
    tailMesh.position.set(0, -0.1, -0.22);
    const tailTip = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 6), darkMat);
    tailTip.rotation.x = -Math.PI / 2.6;
    tailTip.position.set(0, -0.2, -0.44);
    tail.add(tailMesh, tailTip);
    body.add(tail);

    [
      [-0.14, 0.32],
      [0.14, 0.32],
      [-0.15, -0.32],
      [0.15, -0.32],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Group();
      leg.position.set(lx, -0.16, lz);
      const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.042, 0.3, 6), furMat);
      upper.position.y = -0.14;
      const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.28, 6), whiteRuffMat);
      lower.position.y = -0.41;
      leg.add(upper, lower);
      body.add(leg);
      legs.push(leg);
    });
    root.add(makeContactShadow(0.65));
  } else if (species === 'african_lion') {
    // Male African Lion — thick dark windblown mane, scarred muzzle, muscular frame
    const textures = getAnimalTextures();
    const coatMat = new THREE.MeshStandardMaterial({ map: textures.lion, roughness: 0.72 });
    const maneMat = new THREE.MeshStandardMaterial({ map: textures.lionMane, roughness: 0.92 });
    const scarMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.5 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x29150b, roughness: 0.75 });
    eyeGlowMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.65 });

    body.position.y = 0.92;
    root.add(body);

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.84, 6, 12), coatMat);
    torso.rotation.x = Math.PI / 2;
    torso.scale.set(0.95, 1.0, 1.0);
    torso.castShadow = true;
    const chestMuscle = new THREE.Mesh(new THREE.SphereGeometry(0.36, 9, 8), coatMat);
    chestMuscle.position.set(0, 0.02, 0.38);
    chestMuscle.castShadow = true;
    const rumpMuscle = new THREE.Mesh(new THREE.SphereGeometry(0.33, 9, 8), coatMat);
    rumpMuscle.position.set(0, 0.02, -0.42);
    body.add(torso, chestMuscle, rumpMuscle);

    head.position.set(0, 0.24, 0.62);
    // Thick windblown dark mane collar + sweeping tufts
    const maneCore = new THREE.Mesh(new THREE.SphereGeometry(0.36, 10, 8), maneMat);
    maneCore.scale.set(1.02, 1.08, 0.95);
    maneCore.position.set(0, 0.06, 0.06);
    maneCore.castShadow = true;
    head.add(maneCore);

    maneTufts = [];
    for (let m = 0; m < 10; m++) {
      const a = (m / 10) * Math.PI * 2;
      const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.32, 5), maneMat);
      tuft.position.set(Math.cos(a) * 0.28, 0.08 + Math.sin(a) * 0.28, 0.04);
      tuft.rotation.z = -a - Math.PI / 2;
      tuft.rotation.x = -0.42;
      head.add(tuft);
      maneTufts.push(tuft);
    }

    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.26, 0.34), coatMat);
    skull.position.set(0, 0.08, 0.26);
    const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.22), coatMat);
    muzzle.position.set(0, -0.01, 0.44);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.042, 6, 5), darkMat);
    nose.position.set(0, 0.04, 0.55);
    // Scarred muzzle & brow slashes
    const scar1 = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.015, 0.15), scarMat);
    scar1.position.set(0.07, 0.06, 0.47);
    scar1.rotation.y = 0.25;
    const scar2 = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.09, 0.018), scarMat);
    scar2.position.set(-0.085, 0.14, 0.43);
    scar2.rotation.z = 0.3;
    [-0.12, 0.12].forEach((ex) => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 5), coatMat);
      ear.position.set(ex * 1.15, 0.24, 0.2);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.028, 6, 6), eyeGlowMat);
      eye.position.set(ex * 0.86, 0.13, 0.41);
      head.add(ear, eye);
    });
    head.add(skull, muzzle, nose, scar1, scar2);
    body.add(head);

    tail.position.set(0, 0.14, -0.76);
    const tailShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.02, 0.68, 6), coatMat);
    tailShaft.rotation.x = 0.45;
    tailShaft.position.set(0, -0.26, -0.14);
    const tailTuft = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 6), maneMat);
    tailTuft.rotation.x = -0.9;
    tailTuft.position.set(0, -0.55, -0.28);
    tail.add(tailShaft, tailTuft);
    body.add(tail);

    [
      [-0.22, 0.42],
      [0.22, 0.42],
      [-0.22, -0.44],
      [0.22, -0.44],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Group();
      leg.position.set(lx, -0.22, lz);
      const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.34, 4, 7), coatMat);
      upper.position.y = -0.22;
      upper.castShadow = true;
      const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.06, 0.32, 7), coatMat);
      lower.position.y = -0.52;
      const paw = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.18), coatMat);
      paw.position.set(0, -0.68, 0.04);
      leg.add(upper, lower, paw);
      body.add(leg);
      legs.push(leg);
    });
    root.add(makeContactShadow(0.9));
  } else if (species === 'bald_eagle') {
    // American Bald Eagle — wide spread dark brown wings, sharp white head & tail feathers, yellow talons extended
    const darkBrownMat = new THREE.MeshStandardMaterial({ color: 0x3b2416, roughness: 0.72 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xfafaf9, roughness: 0.68 });
    const beakYellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35 });
    const talonMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.3 });
    const eyeMat = new THREE.MeshPhysicalMaterial({ color: 0xfde047, roughness: 0.08, clearcoat: 1.0 });

    root.add(body);
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.48, 5, 10), darkBrownMat);
    torso.rotation.x = Math.PI / 2;
    torso.castShadow = true;
    body.add(torso);

    // Sharp White Head & Hooked Yellow Beak
    head.position.set(0, 0.08, 0.32);
    const whiteNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.17, 0.22, 8), whiteMat);
    whiteNeck.rotation.x = Math.PI / 2.4;
    whiteNeck.position.set(0, 0.02, 0.04);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.135, 8, 8), whiteMat);
    skull.position.set(0, 0.07, 0.16);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.052, 0.18, 5), beakYellowMat);
    beak.rotation.x = Math.PI / 1.85;
    beak.position.set(0, 0.05, 0.3);
    [-0.08, 0.08].forEach((ex) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 5, 5), eyeMat);
      eye.position.set(ex, 0.09, 0.23);
      head.add(eye);
    });
    head.add(whiteNeck, skull, beak);
    body.add(head);

    // Broad Spread Wings with layered primary feather tips
    wings = [];
    [-1, 1].forEach((side) => {
      const wing = new THREE.Group();
      wing.position.set(side * 0.15, 0.08, 0.06);
      const innerWing = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.045, 0.38), darkBrownMat);
      innerWing.position.x = side * 0.38;
      innerWing.castShadow = true;
      const outerWing = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.032, 0.3), darkBrownMat);
      outerWing.position.set(side * 0.98, 0.02, -0.04);
      outerWing.rotation.y = -side * 0.18;
      wing.add(innerWing, outerWing);
      for (let f = 0; f < 4; f++) {
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.32, 4), darkBrownMat);
        tip.rotation.z = -side * (Math.PI / 2);
        tip.rotation.y = -side * (0.28 - f * 0.14);
        tip.position.set(side * 1.28, 0.02, 0.06 - f * 0.075);
        wing.add(tip);
      }
      body.add(wing);
      wings!.push(wing);
    });

    // Fanned White Tail Feathers
    tail.position.set(0, 0.02, -0.36);
    const tailFan = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.42, 4), whiteMat);
    tailFan.rotation.x = Math.PI / 2;
    tailFan.scale.set(1.3, 1.0, 0.14);
    tailFan.position.z = -0.18;
    tail.add(tailFan);
    body.add(tail);

    // Extended Yellow Legs & Curved Dark Talons
    [-0.09, 0.09].forEach((lx) => {
      const leg = new THREE.Group();
      leg.position.set(lx, -0.12, -0.04);
      const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.02, 0.24, 5), beakYellowMat);
      shin.rotation.x = 0.55;
      shin.position.set(0, -0.1, 0.05);
      leg.add(shin);
      for (let t = -1; t <= 1; t++) {
        const talon = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.08, 4), talonMat);
        talon.rotation.x = 1.2;
        talon.position.set(t * 0.025, -0.22, 0.13);
        leg.add(talon);
      }
      body.add(leg);
      legs.push(leg);
    });

    const shadowDisc = makeContactShadow(0.6);
    shadowDisc.visible = false;
    root.add(shadowDisc);
    return { root, body, head, jaw, tail, legs, wings, shadowDisc };
  } else if (species === 'red_fox') {
    // Wild Red Fox — vibrant rusty-orange coat, white chest, bushy white-tipped tail, black stockings
    const foxTex = getAnimalTextures().fox;
    const coatMat = new THREE.MeshStandardMaterial({ map: foxTex, roughness: 0.84 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xfafaf9, roughness: 0.88 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.85 });
    const eyeMat = new THREE.MeshPhysicalMaterial({ color: 0xd97706, roughness: 0.08, clearcoat: 1.0 });

    body.position.y = 0.42;
    root.add(body);
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.44, 5, 10), coatMat);
    torso.rotation.x = Math.PI / 2;
    torso.castShadow = true;
    const whiteChest = new THREE.Mesh(new THREE.SphereGeometry(0.15, 7, 6), whiteMat);
    whiteChest.position.set(0, -0.02, 0.24);
    body.add(torso, whiteChest);

    head.position.set(0, 0.16, 0.34);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.125, 8, 8), coatMat);
    skull.scale.set(1.08, 0.9, 1.08);
    skull.castShadow = true;
    const cheekBib = new THREE.Mesh(new THREE.SphereGeometry(0.1, 7, 6), whiteMat);
    cheekBib.scale.set(1.2, 0.72, 0.9);
    cheekBib.position.set(0, -0.04, 0.04);
    const snout = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.22, 6), coatMat);
    snout.rotation.x = Math.PI / 2;
    snout.position.set(0, -0.02, 0.18);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.018, 5, 5), darkMat);
    nose.position.set(0, -0.02, 0.29);
    [-1, 1].forEach((side) => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.13, 4), coatMat);
      ear.position.set(side * 0.075, 0.14, 0.02);
      const earTip = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.05, 4), darkMat);
      earTip.position.set(side * 0.075, 0.19, 0.02);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.019, 6, 5), eyeMat);
      eye.position.set(side * 0.056, 0.03, 0.11);
      head.add(ear, earTip, eye);
    });
    head.add(skull, cheekBib, snout, nose);
    body.add(head);

    // Bushy rusty tail with crisp white tip
    tail.position.set(0, 0.04, -0.34);
    const tailBase = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.34, 5, 8), coatMat);
    tailBase.rotation.x = Math.PI / 2.4;
    tailBase.position.set(0, -0.04, -0.2);
    const tailTip = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.18, 7), whiteMat);
    tailTip.rotation.x = -Math.PI / 2.4;
    tailTip.position.set(0, -0.1, -0.44);
    tail.add(tailBase, tailTip);
    body.add(tail);

    [
      [-0.1, 0.2],
      [0.1, 0.2],
      [-0.1, -0.2],
      [0.1, -0.2],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Group();
      leg.position.set(lx, -0.1, lz);
      const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.03, 0.16, 6), coatMat);
      upper.position.y = -0.08;
      const stocking = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.024, 0.16, 6), darkMat);
      stocking.position.y = -0.23;
      leg.add(upper, stocking);
      body.add(leg);
      legs.push(leg);
    });
    root.add(makeContactShadow(0.38));
  } else if (species === 'saltwater_crocodile') {
    // Massive Saltwater Crocodile — armored osteoderm scales, scarred snout, yellow reptilian eyes
    const crocTex = getAnimalTextures().croc;
    const scaleMat = new THREE.MeshStandardMaterial({ map: crocTex, roughness: 0.56 });
    const ridgeMat = new THREE.MeshStandardMaterial({ color: 0x1e2616, roughness: 0.62 });
    const toothMat = new THREE.MeshStandardMaterial({ color: 0xfafaf9, roughness: 0.35 });
    const scarMat = new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.45 });
    eyeGlowMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.92 });

    body.position.y = 0.24;
    root.add(body);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.36, 2.05), scaleMat);
    torso.castShadow = true;
    body.add(torso);

    // Armored dorsal osteoderm scute rows
    for (let r = 0; r < 8; r++) {
      [-0.2, 0.2].forEach((sx) => {
        const scute = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.14, 4), ridgeMat);
        scute.position.set(sx, 0.22, 0.78 - r * 0.23);
        body.add(scute);
      });
    }

    head.position.set(0, 0.04, 1.02);
    const cranium = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.26, 0.55), scaleMat);
    cranium.position.set(0, 0.06, 0.22);
    const upperSnout = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.85), scaleMat);
    upperSnout.position.set(0, 0.04, 0.82);
    // Scar across snout & raised yellow reptilian eyes above waterline
    const snoutScar = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.025, 0.04), scarMat);
    snoutScar.position.set(0.05, 0.12, 0.72);
    snoutScar.rotation.y = 0.42;
    [-0.18, 0.18].forEach((ex) => {
      const brow = new THREE.Mesh(new THREE.SphereGeometry(0.075, 6, 6), ridgeMat);
      brow.position.set(ex, 0.19, 0.34);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.042, 6, 6), eyeGlowMat);
      eye.position.set(ex, 0.21, 0.36);
      head.add(brow, eye);
    });
    // Interlocking teeth
    for (let t = 0; t < 4; t++) {
      [-0.17, 0.17].forEach((tx) => {
        const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.08, 4), toothMat);
        tooth.rotation.x = Math.PI;
        tooth.position.set(tx, -0.04, 0.52 + t * 0.18);
        head.add(tooth);
      });
    }
    jaw = new THREE.Group();
    jaw.position.set(0, -0.04, 0.3);
    const lowerJaw = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.09, 0.88), ridgeMat);
    lowerJaw.position.set(0, -0.04, 0.48);
    jaw.add(lowerJaw);
    head.add(cranium, upperSnout, snoutScar, jaw);
    body.add(head);

    tail.position.set(0, 0.0, -1.02);
    const tailMesh = new THREE.Mesh(new THREE.ConeGeometry(0.34, 1.95, 6), scaleMat);
    tailMesh.rotation.x = -Math.PI / 2;
    tailMesh.scale.set(1.0, 1.0, 0.58);
    tailMesh.position.z = -0.95;
    for (let ts = 0; ts < 5; ts++) {
      const fin = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 4), ridgeMat);
      fin.position.set(0, 0.16 - ts * 0.015, -0.25 - ts * 0.3);
      tail.add(fin);
    }
    tail.add(tailMesh);
    body.add(tail);

    [
      [-0.48, 0.65],
      [0.48, 0.65],
      [-0.48, -0.65],
      [0.48, -0.65],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Group();
      leg.position.set(lx, -0.05, lz);
      const upper = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.18), scaleMat);
      upper.position.x = lx > 0 ? 0.1 : -0.1;
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.28), ridgeMat);
      foot.position.set(lx > 0 ? 0.18 : -0.18, -0.14, 0.06);
      leg.add(upper, foot);
      body.add(leg);
      legs.push(leg);
    });
    root.add(makeContactShadow(1.4));
  } else if (species === 'bison') {
    // American Bison — massive shaggy dark brown front coat, curved black horns, steam rising from nostrils
    const bisonTex = getAnimalTextures().bison;
    const shaggyMat = new THREE.MeshStandardMaterial({ map: bisonTex, roughness: 0.95 });
    const rearCoatMat = new THREE.MeshStandardMaterial({ color: 0x5c3a24, roughness: 0.86 });
    const hornMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.28 });
    const eyeMat = new THREE.MeshPhysicalMaterial({ color: 0x0f172a, roughness: 0.1, clearcoat: 0.9 });

    body.position.y = 1.18;
    root.add(body);

    // Massive shaggy front cape & towering shoulder hump
    const frontCape = new THREE.Mesh(new THREE.SphereGeometry(0.62, 10, 9), shaggyMat);
    frontCape.scale.set(0.95, 1.12, 1.05);
    frontCape.position.set(0, 0.16, 0.34);
    frontCape.castShadow = true;
    const shoulderHump = new THREE.Mesh(new THREE.SphereGeometry(0.46, 9, 8), shaggyMat);
    shoulderHump.scale.set(0.86, 1.05, 0.95);
    shoulderHump.position.set(0, 0.5, 0.25);
    shoulderHump.castShadow = true;
    const rearTorso = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.56, 6, 10), rearCoatMat);
    rearTorso.rotation.x = Math.PI / 2;
    rearTorso.position.set(0, -0.04, -0.35);
    rearTorso.castShadow = true;
    body.add(frontCape, shoulderHump, rearTorso);

    head.position.set(0, 0.04, 0.86);
    const broadSkull = new THREE.Mesh(new THREE.SphereGeometry(0.36, 9, 8), shaggyMat);
    broadSkull.scale.set(1.08, 1.02, 1.04);
    broadSkull.position.set(0, 0.06, 0.16);
    broadSkull.castShadow = true;
    const beard = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.44, 6), shaggyMat);
    beard.rotation.x = Math.PI;
    beard.position.set(0, -0.32, 0.22);
    const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.2, 0.2), hornMat);
    muzzle.position.set(0, -0.06, 0.44);
    [-0.22, 0.22].forEach((hx) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 5), eyeMat);
      eye.position.set(hx * 0.95, 0.08, 0.35);
      // Curved black horns
      const hornBase = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.26, 7), hornMat);
      hornBase.rotation.z = hx > 0 ? -1.15 : 1.15;
      hornBase.position.set(hx * 1.15, 0.22, 0.18);
      const hornTip = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.2, 6), hornMat);
      hornTip.rotation.z = hx > 0 ? 0.32 : -0.32;
      hornTip.position.set(hx * 1.55, 0.34, 0.22);
      head.add(eye, hornBase, hornTip);
    });
    // Visible steam rising from bison nostrils
    breathWisps = [];
    const steamMat = new THREE.MeshBasicMaterial({
      color: 0xf1f5f9,
      transparent: true,
      opacity: 0.44,
      depthWrite: false,
    });
    for (let w = 0; w < 3; w++) {
      const steam = new THREE.Mesh(new THREE.SphereGeometry(0.075 + w * 0.03, 6, 6), steamMat.clone());
      steam.position.set((w - 1) * 0.06, -0.02 + w * 0.09, 0.56 + w * 0.08);
      head.add(steam);
      breathWisps.push(steam);
    }
    head.add(broadSkull, beard, muzzle);
    body.add(head);

    tail.position.set(0, 0.08, -0.82);
    const tailCord = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.02, 0.48, 6), rearCoatMat);
    tailCord.rotation.x = 0.25;
    tailCord.position.set(0, -0.24, -0.06);
    const tailTip = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.18, 6), shaggyMat);
    tailTip.position.set(0, -0.5, -0.12);
    tail.add(tailCord, tailTip);
    body.add(tail);

    [
      [-0.36, 0.44],
      [0.36, 0.44],
      [-0.32, -0.46],
      [0.32, -0.46],
    ].forEach(([lx, lz], idx) => {
      const leg = new THREE.Group();
      leg.position.set(lx, -0.24, lz);
      const upper = new THREE.Mesh(
        new THREE.CapsuleGeometry(idx < 2 ? 0.15 : 0.12, 0.34, 4, 7),
        idx < 2 ? shaggyMat : rearCoatMat,
      );
      upper.position.y = -0.24;
      const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.42, 7), rearCoatMat);
      lower.position.y = -0.62;
      const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.085, 0.1, 7), hornMat);
      hoof.position.y = -0.86;
      leg.add(upper, lower, hoof);
      body.add(leg);
      legs.push(leg);
    });
    root.add(makeContactShadow(1.35));
  } else if (species === 'great_horned_owl') {
    // Great Horned Owl — mottled brown & gray feathers, prominent ear tufts, large glowing yellow eyes
    const owlTex = getAnimalTextures().owl;
    const featherMat = new THREE.MeshStandardMaterial({ map: owlTex, roughness: 0.82 });
    const discMat = new THREE.MeshStandardMaterial({ color: 0xb08d6a, roughness: 0.85 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.5 });
    const talonMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.45 });
    eyeGlowMat = new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.96 });

    body.position.y = 0.28;
    root.add(body);

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.24, 6, 10), featherMat);
    torso.castShadow = true;
    body.add(torso);
    [-0.14, 0.14].forEach((wx) => {
      const wing = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), featherMat);
      wing.scale.set(0.42, 1.35, 0.85);
      wing.position.set(wx, -0.02, -0.02);
      body.add(wing);
    });

    head.position.set(0, 0.24, 0.02);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 9), featherMat);
    skull.scale.set(1.06, 0.95, 0.98);
    const facialDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.125, 0.03, 12), discMat);
    facialDisc.rotation.x = Math.PI / 2;
    facialDisc.position.set(0, 0.0, 0.125);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.07, 5), darkMat);
    beak.rotation.x = Math.PI / 1.7;
    beak.position.set(0, -0.02, 0.165);
    [-1, 1].forEach((side) => {
      // Prominent feathered ear tufts ("horns")
      const earTuft = new THREE.Mesh(new THREE.ConeGeometry(0.036, 0.14, 5), darkMat);
      earTuft.rotation.z = -side * 0.48;
      earTuft.position.set(side * 0.105, 0.13, 0.04);
      // Large glowing yellow owl eyes
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.036, 7, 7), eyeGlowMat);
      eye.position.set(side * 0.056, 0.025, 0.135);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.016, 5, 5), darkMat);
      pupil.position.set(side * 0.056, 0.025, 0.165);
      head.add(earTuft, eye, pupil);
    });
    head.add(skull, facialDisc, beak);
    body.add(head);

    tail.position.set(0, -0.18, -0.12);
    const tailFeathers = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.22, 0.04), featherMat);
    tailFeathers.rotation.x = 0.28;
    tailFeathers.position.set(0, -0.06, -0.04);
    tail.add(tailFeathers);
    body.add(tail);

    [-0.06, 0.06].forEach((lx) => {
      const leg = new THREE.Group();
      leg.position.set(lx, -0.18, 0.04);
      const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.02, 0.1, 6), featherMat);
      shin.position.y = -0.05;
      const talon = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.075), talonMat);
      talon.position.set(0, -0.1, 0.02);
      leg.add(shin, talon);
      body.add(leg);
      legs.push(leg);
    });
    root.add(makeContactShadow(0.24));
  } else if (species === 'bird') {
    const wingMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.7 });
    const slateMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.72 });
    const beakMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.5 });
    root.add(body);
    const torso = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.65, 6), wingMat);
    torso.rotation.x = Math.PI / 2;
    torso.castShadow = true;
    body.add(torso);
    head.position.set(0, 0.04, 0.24);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.095, 7, 6), wingMat);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.18, 5), beakMat);
    beak.rotation.x = Math.PI / 2;
    beak.position.z = 0.14;
    head.add(skull, beak);
    body.add(head);
    wings = [];
    [-1, 1].forEach((side) => {
      const wing = new THREE.Group();
      wing.position.set(side * 0.1, 0.04, 0.02);
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.028, 0.22), slateMat);
      blade.position.x = side * 0.28;
      wing.add(blade);
      body.add(wing);
      wings!.push(wing);
    });
    [-0.06, 0.06].forEach((lx) => {
      const leg = new THREE.Group();
      leg.position.set(lx, -0.08, 0);
      const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.012, 0.18, 5), beakMat);
      shin.position.y = -0.09;
      leg.add(shin);
      body.add(leg);
      legs.push(leg);
    });
    tail.position.set(0, 0.02, -0.3);
    const tailFan = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.02, 0.18), slateMat);
    tailFan.position.z = -0.08;
    tail.add(tailFan);
    body.add(tail);
    const shadowDisc = makeContactShadow(0.24);
    shadowDisc.visible = false;
    root.add(shadowDisc);
    return { root, body, head, jaw, tail, legs, wings, shadowDisc };
  } else if (species === 'fish_school') {
    const fishMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.3, metalness: 0.35 });
    root.add(body);
    for (let f = 0; f < 4; f++) {
      const fish = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.45, 5), fishMat);
      fish.rotation.x = Math.PI / 2;
      fish.position.set((f - 1.5) * 0.35, (f % 2) * 0.12, (f % 2 - 0.5) * 0.4);
      body.add(fish);
    }
    body.add(head, tail);
    const shadowDisc = makeContactShadow(0.3);
    shadowDisc.visible = false;
    root.add(shadowDisc);
    return { root, body, head, jaw, tail, legs, shadowDisc };
  } else {
    // Interactive Coastal Dolphin
    const skinMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.28, metalness: 0.08 });
    const bellyMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3 });
    root.add(body);
    const hull = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 1.25, 6, 12), skinMat);
    hull.rotation.x = Math.PI / 2;
    body.add(hull);
    const belly = new THREE.Mesh(new THREE.CapsuleGeometry(0.27, 1.1, 4, 10), bellyMat);
    belly.rotation.x = Math.PI / 2;
    belly.position.y = -0.07;
    body.add(belly);
    const dorsal = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.42, 4), skinMat);
    dorsal.rotation.x = -0.35;
    dorsal.position.set(0, 0.38, -0.1);
    body.add(dorsal);
    head.position.set(0, 0, 0.78);
    const rostrum = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.5, 8), skinMat);
    rostrum.rotation.x = Math.PI / 2;
    rostrum.position.z = 0.22;
    head.add(rostrum);
    body.add(head);
    tail.position.set(0, 0, -0.82);
    const fluke = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.06, 0.34), skinMat);
    fluke.position.z = -0.22;
    tail.add(fluke);
    body.add(tail);
    const shadowDisc = makeContactShadow(0.8);
    shadowDisc.visible = false;
    root.add(shadowDisc);
    return { root, body, head, jaw, tail, legs, shadowDisc };
  }

  return {
    root,
    body,
    head,
    jaw,
    tail,
    legs,
    wings,
    breathWisps,
    maneTufts,
    eyeGlowMat,
    shadowDisc: root.children[root.children.length - 1] as THREE.Mesh,
  };
}

export function createCampStructureModel(
  type: CampStructureType,
  woodTex?: THREE.Texture,
): { group: THREE.Group; fireLight?: THREE.PointLight; flameGroup?: THREE.Group } {
  const group = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x85532a,
    map: woodTex || null,
    roughness: 0.85,
  });
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x6b6762, roughness: 0.92 });
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.45, metalness: 0.72 });
  const thatchMat = new THREE.MeshStandardMaterial({ color: 0x6b8e23, roughness: 0.92 });

  if (type === 'campfire') {
    const ashPad = new THREE.Mesh(
      new THREE.CylinderGeometry(0.56, 0.64, 0.04, 12),
      new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.98 }),
    );
    ashPad.position.y = 0.02;
    ashPad.receiveShadow = true;
    group.add(ashPad);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22, 0), stoneMat);
      rock.position.set(Math.cos(a) * 0.62, 0.13, Math.sin(a) * 0.62);
      rock.scale.set(1.1, 0.72, 1.0);
      group.add(rock);
    }
    for (let i = 0; i < 4; i++) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.92, 7), woodMat);
      log.rotation.z = Math.PI / 2.25;
      log.rotation.y = (i * Math.PI) / 4;
      log.position.y = 0.15;
      group.add(log);
    }
    const flameGroup = new THREE.Group();
    flameGroup.position.y = 0.25;
    const outerFlame = new THREE.Mesh(
      new THREE.ConeGeometry(0.28, 0.72, 7),
      new THREE.MeshBasicMaterial({ color: 0xf97316 }),
    );
    outerFlame.position.y = 0.26;
    const innerFlame = new THREE.Mesh(
      new THREE.ConeGeometry(0.15, 0.45, 6),
      new THREE.MeshBasicMaterial({ color: 0xfef08a }),
    );
    innerFlame.position.y = 0.18;
    flameGroup.add(outerFlame, innerFlame);
    group.add(flameGroup);
    const fireLight = new THREE.PointLight(0xff8c2b, 3.2, 18, 1.8);
    fireLight.position.y = 0.95;
    group.add(fireLight);
    return { group, fireLight, flameGroup };
  }

  if (type === 'crafting_table') {
    const darkWoodMat = new THREE.MeshStandardMaterial({
      color: 0x5c381c,
      map: woodTex || null,
      roughness: 0.9,
    });
    const leatherMat = new THREE.MeshStandardMaterial({ color: 0x9a6b3e, roughness: 0.78 });
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0xca8a04, roughness: 0.92 });
    const flintMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.35, metalness: 0.28 });

    // Thick planked tabletop + recessed apron trim
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.14, 1.08), woodMat);
    top.position.y = 0.92;
    top.castShadow = true;
    top.receiveShadow = true;
    group.add(top);

    const apronFront = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.1, 0.96), darkWoodMat);
    apronFront.position.y = 0.81;
    group.add(apronFront);

    // 4 sturdy corner legs
    [
      [-0.68, -0.4],
      [0.68, -0.4],
      [-0.68, 0.4],
      [0.68, 0.4],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.86, 0.13), darkWoodMat);
      leg.position.set(lx, 0.43, lz);
      leg.castShadow = true;
      group.add(leg);
    });

    // Horizontal side & center structural supports
    [-0.4, 0.4].forEach((sz) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.08, 0.08), darkWoodMat);
      rail.position.set(0, 0.28, sz);
      group.add(rail);
    });
    [-0.68, 0.68].forEach((sx) => {
      const brace = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.8), darkWoodMat);
      brace.position.set(sx, 0.28, 0);
      group.add(brace);
    });

    // Lower storage shelf + spare timber planks + storage crate + coiled rope
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.06, 0.82), woodMat);
    shelf.position.y = 0.33;
    shelf.receiveShadow = true;
    group.add(shelf);

    for (let p = 0; p < 3; p++) {
      const sparePlank = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.05, 0.16), darkWoodMat);
      sparePlank.position.set(-0.34, 0.385 + p * 0.052, 0.12 - p * 0.06);
      sparePlank.rotation.y = 0.08 * (p - 1);
      group.add(sparePlank);
    }

    const underCrate = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.28, 0.44), darkWoodMat);
    underCrate.position.set(0.38, 0.5, -0.1);
    group.add(underCrate);

    const underRope = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.04, 7, 14), ropeMat);
    underRope.rotation.x = Math.PI / 2;
    underRope.position.set(0.34, 0.4, 0.24);
    group.add(underRope);

    // Tabletop tools & crafting materials
    const malletHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.028, 0.36, 7), woodMat);
    malletHandle.rotation.z = Math.PI / 2;
    malletHandle.rotation.y = 0.42;
    malletHandle.position.set(0.38, 1.02, 0.18);
    const malletHead = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.22), stoneMat);
    malletHead.position.set(0.52, 1.04, 0.11);
    malletHead.rotation.y = 0.42;
    group.add(malletHandle, malletHead);

    // Chisel & sharp flint materials on tabletop
    const chiselHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.024, 0.22, 6), darkWoodMat);
    chiselHandle.rotation.z = Math.PI / 2;
    chiselHandle.rotation.y = -0.3;
    chiselHandle.position.set(-0.46, 1.01, -0.2);
    const chiselBlade = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.018, 0.045), ironMat);
    chiselBlade.rotation.y = -0.3;
    chiselBlade.position.set(-0.31, 1.01, -0.15);
    group.add(chiselHandle, chiselBlade);

    for (let f = 0; f < 2; f++) {
      const flintPiece = new THREE.Mesh(new THREE.OctahedronGeometry(0.065, 0), flintMat);
      flintPiece.scale.set(1.2, 0.6, 0.9);
      flintPiece.position.set(-0.48 + f * 0.13, 1.02, 0.22);
      group.add(flintPiece);
    }

    // Rolled craft hide/blueprint mat on workbench
    const matSheet = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.02, 0.34), leatherMat);
    matSheet.position.set(0.02, 1.0, -0.06);
    matSheet.rotation.y = 0.12;
    group.add(matSheet);

    return { group };
  }

  if (type === 'storage_chest') {
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.62, 0.82), woodMat);
    base.position.y = 0.31;
    base.castShadow = true;
    group.add(base);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.41, 0.41, 1.25, 10, 1, false, 0, Math.PI), woodMat);
    lid.rotation.z = Math.PI / 2;
    lid.rotation.y = Math.PI / 2;
    lid.position.y = 0.62;
    group.add(lid);
    [-0.4, 0.4].forEach((bx) => {
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.66, 0.86), ironMat);
      band.position.set(bx, 0.33, 0);
      group.add(band);
    });
    return { group };
  }

  if (type === 'sleeping_area') {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.18, 2.25), woodMat);
    frame.position.y = 0.18;
    const mat = new THREE.MeshStandardMaterial({ color: 0x9ca653, roughness: 0.95 });
    const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 2.08), mat);
    mattress.position.y = 0.32;
    const pillow = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 0.85, 10),
      new THREE.MeshStandardMaterial({ color: 0xd6c7a9, roughness: 0.88 }),
    );
    pillow.rotation.z = Math.PI / 2;
    pillow.position.set(0, 0.42, -0.78);
    group.add(frame, mattress, pillow);
    return { group };
  }

  if (type === 'cooking_station') {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.24, 0), stoneMat);
      r.position.set(Math.cos(a) * 0.7, 0.16, Math.sin(a) * 0.7);
      group.add(r);
    }
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.85, 6), woodMat);
      pole.position.set(Math.cos(a) * 0.48, 0.88, Math.sin(a) * 0.48);
      pole.lookAt(0, 1.78, 0);
      pole.rotateX(Math.PI / 2);
      group.add(pole);
    }
    const kettle = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), ironMat);
    kettle.position.y = 0.75;
    group.add(kettle);
    const flameGroup = new THREE.Group();
    flameGroup.position.y = 0.2;
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.5, 7), new THREE.MeshBasicMaterial({ color: 0xf97316 }));
    flame.position.y = 0.2;
    flameGroup.add(flame);
    group.add(flameGroup);
    const fireLight = new THREE.PointLight(0xff7722, 2.8, 16, 1.8);
    fireLight.position.y = 0.8;
    group.add(fireLight);
    return { group, fireLight, flameGroup };
  }

  // Simple Shelter with built-in woven bedroll inside!
  [
    [-1.4, -1.2],
    [1.4, -1.2],
    [-1.4, 1.2],
    [1.4, 1.2],
  ].forEach(([px, pz]) => {
    const h = pz < 0 ? 1.75 : 2.35;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, h, 7), woodMat);
    post.position.set(px, h / 2, pz);
    post.castShadow = true;
    group.add(post);
  });
  const roof = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.18, 2.9), thatchMat);
  roof.position.set(0, 2.08, 0);
  roof.rotation.x = 0.24;
  roof.castShadow = true;
  roof.receiveShadow = true;
  group.add(roof);
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(2.9, 1.5, 0.12), woodMat);
  backWall.position.set(0, 0.85, -1.2);
  group.add(backWall);

  // Built-in woven sleeping mat inside shelter
  const mat = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.1, 1.85),
    new THREE.MeshStandardMaterial({ color: 0x9ca653, roughness: 0.95 }),
  );
  mat.position.set(0, 0.08, 0.1);
  group.add(mat);

  return { group };
}

/**
 * Physical 3D Collectible Pickup Meshes spawned when trees fall, rocks break, or items drop.
 */
export function createPickupMesh(
  itemId: ItemId,
  woodTex?: THREE.Texture,
): THREE.Group {
  const group = new THREE.Group();

  const barkMat = new THREE.MeshStandardMaterial({
    color: 0x6b4423,
    map: woodTex || null,
    roughness: 0.9,
  });
  const heartwoodMat = new THREE.MeshStandardMaterial({
    color: 0xd6a56e,
    roughness: 0.78,
  });
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x78716c,
    roughness: 0.92,
  });
  const flintMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.32,
    metalness: 0.25,
  });
  const oreMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.3,
    metalness: 0.78,
  });
  const leafMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    roughness: 0.82,
  });
  const berryMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    roughness: 0.45,
  });

  if (itemId === 'wood') {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.92, 8), barkMat);
    log.rotation.z = Math.PI / 2;
    log.position.y = 0.16;
    log.castShadow = true;
    const capL = new THREE.Mesh(new THREE.CircleGeometry(0.135, 8), heartwoodMat);
    capL.rotation.y = -Math.PI / 2;
    capL.position.set(-0.465, 0.16, 0);
    const capR = new THREE.Mesh(new THREE.CircleGeometry(0.155, 8), heartwoodMat);
    capR.rotation.y = Math.PI / 2;
    capR.position.set(0.465, 0.16, 0);
    group.add(log, capL, capR);
  } else if (itemId === 'branch') {
    for (let i = 0; i < 3; i++) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 0.72, 6), barkMat);
      b.rotation.z = Math.PI / 2;
      b.rotation.y = (i - 1) * 0.42;
      b.position.y = 0.07 + i * 0.025;
      group.add(b);
    }
  } else if (itemId === 'stone' || itemId === 'clay' || itemId === 'sand') {
    const mat =
      itemId === 'clay'
        ? new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.94 })
        : itemId === 'sand'
          ? new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.95 })
          : stoneMat;
    const rockA = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22, 0), mat);
    rockA.scale.set(1.2, 0.78, 1.0);
    rockA.position.set(-0.08, 0.15, 0);
    rockA.castShadow = true;
    const rockB = new THREE.Mesh(new THREE.DodecahedronGeometry(0.14, 0), mat);
    rockB.position.set(0.16, 0.11, 0.08);
    group.add(rockA, rockB);
  } else if (itemId === 'flint') {
    for (let i = 0; i < 2; i++) {
      const shard = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.34, 5), flintMat);
      shard.position.set((i - 0.5) * 0.14, 0.15, 0);
      shard.rotation.z = (i - 0.5) * 0.55;
      shard.castShadow = true;
      group.add(shard);
    }
  } else if (itemId === 'metal_ore') {
    const host = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22, 0), stoneMat);
    host.position.y = 0.16;
    host.scale.set(1.1, 0.85, 1.0);
    group.add(host);
    for (let i = 0; i < 3; i++) {
      const nugget = new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), oreMat);
      nugget.position.set((i - 1) * 0.11, 0.24, 0.08);
      group.add(nugget);
    }
  } else if (itemId === 'berries') {
    for (let i = 0; i < 4; i++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.08, 7, 7), berryMat);
      b.position.set((i - 1.5) * 0.08, 0.1, (i % 2) * 0.08);
      group.add(b);
    }
  } else if (itemId === 'coconut' || itemId === 'roasted_coconut') {
    const cocoMat = new THREE.MeshStandardMaterial({
      color: itemId === 'roasted_coconut' ? 0x854d0e : 0x6b3e1b,
      roughness: 0.9,
    });
    const huskMat = new THREE.MeshStandardMaterial({ color: 0x3b2314, roughness: 0.95 });
    for (let i = 0; i < 2; i++) {
      const c = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 7), cocoMat);
      c.scale.set(1.0, 1.12, 1.0);
      c.position.set((i - 0.5) * 0.22, 0.17, (i % 2) * 0.08);
      c.castShadow = true;
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.04, 6), huskMat);
      cap.position.set(c.position.x, 0.34, c.position.z);
      group.add(c, cap);
    }
  } else if (itemId === 'apple' || itemId === 'baked_apple') {
    const appleMat = new THREE.MeshStandardMaterial({
      color: itemId === 'baked_apple' ? 0xea580c : 0xdc2626,
      roughness: 0.4,
    });
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.9 });
    for (let i = 0; i < 2; i++) {
      const a = new THREE.Mesh(new THREE.SphereGeometry(0.115, 8, 7), appleMat);
      a.scale.set(1.05, 0.95, 1.05);
      a.position.set((i - 0.5) * 0.2, 0.12, (i % 2) * 0.07);
      a.castShadow = true;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.018, 0.07, 5), stemMat);
      stem.position.set(a.position.x, 0.23, a.position.z);
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.05), leafMat);
      leaf.position.set(a.position.x + 0.04, 0.24, a.position.z);
      leaf.rotation.z = 0.35;
      group.add(a, stem, leaf);
    }
  } else if (itemId === 'banana' || itemId === 'roasted_banana') {
    const bananaMat = new THREE.MeshStandardMaterial({
      color: itemId === 'roasted_banana' ? 0xf59e0b : 0xfacc15,
      roughness: 0.55,
    });
    const tipMat = new THREE.MeshStandardMaterial({ color: 0x713f12, roughness: 0.9 });
    for (let i = 0; i < 3; i++) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.048, 0.32, 6), bananaMat);
      b.rotation.z = Math.PI / 2.3;
      b.rotation.y = (i - 1) * 0.35;
      b.position.set((i - 1) * 0.07, 0.11, 0);
      b.castShadow = true;
      const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.032, 0.05, 5), tipMat);
      tip.position.set(b.position.x + 0.15, 0.15, Math.sin(b.rotation.y) * 0.1);
      group.add(b, tip);
    }
  } else if (itemId === 'maple_syrup') {
    const jarMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.25,
      metalness: 0.12,
    });
    const corkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.125, 0.28, 8), jarMat);
    body.position.y = 0.16;
    body.castShadow = true;
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.08, 0.09, 8), jarMat);
    neck.position.y = 0.33;
    const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.048, 0.06, 7), corkMat);
    cork.position.y = 0.39;
    group.add(body, neck, cork);
  } else if (itemId === 'leaves' || itemId === 'plant_material' || itemId === 'fiber') {
    for (let i = 0; i < 3; i++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.38, 4), leafMat);
      leaf.rotation.z = Math.PI / 2.2;
      leaf.rotation.y = (i * Math.PI * 2) / 3;
      leaf.position.y = 0.09;
      group.add(leaf);
    }
  } else if (
    itemId === 'raw_meat' ||
    itemId === 'roasted_meat' ||
    itemId === 'dino_meat' ||
    itemId === 'roasted_dino_meat'
  ) {
    const isDino = itemId === 'dino_meat' || itemId === 'roasted_dino_meat';
    const isRoasted = itemId === 'roasted_meat' || itemId === 'roasted_dino_meat';
    const meatMat = new THREE.MeshStandardMaterial({
      color: isRoasted ? 0x9a3412 : 0xdc2626,
      roughness: 0.65,
    });
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(isDino ? 0.42 : 0.32, isDino ? 0.18 : 0.14, isDino ? 0.28 : 0.22),
      meatMat,
    );
    slab.position.y = 0.14;
    slab.castShadow = true;
    const boneTip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.038, 0.038, isDino ? 0.22 : 0.16, 6),
      new THREE.MeshStandardMaterial({ color: 0xe7e5e4, roughness: 0.8 }),
    );
    boneTip.rotation.z = Math.PI / 2;
    boneTip.position.set(isDino ? 0.26 : 0.2, 0.14, 0);
    group.add(slab, boneTip);
  } else if (itemId === 'mushrooms') {
    const capMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.7 });
    const stemMat = new THREE.MeshStandardMaterial({ color: 0xe7e5e4, roughness: 0.85 });
    for (let i = 0; i < 2; i++) {
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.14, 6), stemMat);
      stem.position.set((i - 0.5) * 0.16, 0.1, (i % 2) * 0.06);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.09, 8), capMat);
      cap.position.set(stem.position.x, 0.19, stem.position.z);
      group.add(stem, cap);
    }
  } else if (itemId === 'wheat' || itemId === 'grass') {
    const strawMat = new THREE.MeshStandardMaterial({
      color: itemId === 'wheat' ? 0xeab308 : 0x84cc16,
      roughness: 0.88,
    });
    for (let i = 0; i < 3; i++) {
      const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.44, 5), strawMat);
      stalk.rotation.z = Math.PI / 2;
      stalk.rotation.y = (i - 1) * 0.25;
      stalk.position.y = 0.09 + i * 0.02;
      group.add(stalk);
    }
  } else if (itemId === 'gun') {
    const gunMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.35,
      metalness: 0.85,
    });
    const gripMat = new THREE.MeshStandardMaterial({
      color: 0x451a03,
      roughness: 0.8,
    });
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.34), gunMat);
    slide.position.set(0, 0.14, 0);
    slide.castShadow = true;
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.024, 0.22, 8), gunMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.14, -0.22);
    barrel.castShadow = true;
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.18, 0.09), gripMat);
    grip.rotation.x = 0.3;
    grip.position.set(0, 0.06, 0.08);
    grip.castShadow = true;
    group.add(slide, barrel, grip);
  } else if (itemId === 'ammo') {
    const boxMat = new THREE.MeshStandardMaterial({
      color: 0x166534,
      roughness: 0.55,
      metalness: 0.3,
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.25,
      metalness: 0.88,
    });
    const ammoBox = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.18, 0.18), boxMat);
    ammoBox.position.y = 0.11;
    ammoBox.castShadow = true;
    for (let c = 0; c < 3; c++) {
      const bullet = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.08, 6), brassMat);
      bullet.position.set((c - 1) * 0.05, 0.22, 0);
      group.add(bullet);
    }
    group.add(ammoBox);
  } else if (
    itemId === 'dirty_water_bottle' ||
    itemId === 'filtered_water_bottle'
  ) {
    const isClean = itemId === 'filtered_water_bottle';
    const shellMat = new THREE.MeshStandardMaterial({
      color: isClean ? 0xe0f2fe : 0xcbd5e1,
      transparent: true,
      opacity: 0.72,
      roughness: isClean ? 0.2 : 0.65,
      metalness: 0.08,
    });
    const liquidMat = new THREE.MeshStandardMaterial({
      color: isClean ? 0x0ea5e9 : 0x78716c,
      transparent: true,
      opacity: isClean ? 0.85 : 0.6,
      roughness: 0.25,
    });
    const capMat = new THREE.MeshStandardMaterial({
      color: isClean ? 0x0284c7 : 0x57534e,
      roughness: 0.5,
    });
    const bottleBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.095, 0.32, 10),
      shellMat,
    );
    bottleBody.position.y = 0.18;
    bottleBody.castShadow = true;
    const liquid = new THREE.Mesh(
      new THREE.CylinderGeometry(0.075, 0.08, isClean ? 0.24 : 0.08, 10),
      liquidMat,
    );
    liquid.position.y = isClean ? 0.16 : 0.08;
    const neck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.038, 0.07, 0.07, 10),
      shellMat,
    );
    neck.position.y = 0.36;
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.044, 0.044, 0.045, 10),
      capMat,
    );
    cap.position.y = 0.41;
    group.add(bottleBody, liquid, neck, cap);
  } else {
    // Generic compact supply crate/pouch
    const pouch = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.24, 0.28),
      new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.82 }),
    );
    pouch.position.y = 0.14;
    pouch.castShadow = true;
    group.add(pouch);
  }

  // Subtle amber pickup halo ring on ground so collectibles remain legible in tall grass
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.28, 0.34, 16),
    new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.03;
  group.add(ring);

  return group;
}

/**
 * Creates a physical 3D carcass mesh on the terrain for hunted wildlife and dinosaurs.
 * Renders the fallen beast on its side with a field-dressing stain, exposed ribs,
 * and fresh meat cuts ready for butchering.
 */
export function createCarcassMesh(
  species: CreatureSpecies,
  isDino: boolean,
): THREE.Group {
  const root = new THREE.Group();

  // 1. Dark crimson field-dressing ground stain
  const stainMat = new THREE.MeshBasicMaterial({
    color: 0x3f0a0a,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
  });
  const stain = new THREE.Mesh(
    new THREE.CircleGeometry(isDino ? 1.45 : 0.78, 14),
    stainMat,
  );
  stain.rotation.x = -Math.PI / 2;
  stain.position.y = 0.025;
  root.add(stain);

  // 2. Downed animal model lying on its side
  const creatureRig = createCreatureModel(species);
  // Lay horizontally on ground on its side
  creatureRig.root.rotation.z = Math.PI / 2.05;
  creatureRig.root.rotation.x = 0.18;
  creatureRig.root.position.y = isDino ? 0.38 : 0.18;
  root.add(creatureRig.root);

  // 3. Exposed butchering cuts & prime meat block
  const meatMat = new THREE.MeshStandardMaterial({
    color: isDino ? 0x991b1b : 0xb91c1c,
    roughness: 0.5,
  });
  const meatCut = new THREE.Mesh(
    new THREE.BoxGeometry(
      isDino ? 0.62 : 0.36,
      isDino ? 0.32 : 0.2,
      isDino ? 0.72 : 0.42,
    ),
    meatMat,
  );
  meatCut.position.set(0, isDino ? 0.52 : 0.28, 0.08);
  meatCut.castShadow = true;
  root.add(meatCut);

  // 4. Exposed ivory rib cage bones
  const boneMat = new THREE.MeshStandardMaterial({
    color: 0xf5f5f4,
    roughness: 0.35,
  });
  const ribCount = isDino ? 4 : 3;
  for (let r = 0; r < ribCount; r++) {
    const rib = new THREE.Mesh(
      new THREE.TorusGeometry(isDino ? 0.24 : 0.14, 0.022, 6, 8, Math.PI),
      boneMat,
    );
    rib.rotation.y = Math.PI / 2;
    rib.rotation.z = 0.32;
    rib.position.set(
      0.04,
      isDino ? 0.58 : 0.32,
      (r - (ribCount - 1) / 2) * (isDino ? 0.22 : 0.14),
    );
    root.add(rib);
  }

  // 5. Subtle harvest beacon ring on ground
  const harvestRing = new THREE.Mesh(
    new THREE.RingGeometry(isDino ? 1.5 : 0.85, isDino ? 1.7 : 0.98, 16),
    new THREE.MeshBasicMaterial({
      color: 0xf87171,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  harvestRing.rotation.x = -Math.PI / 2;
  harvestRing.position.y = 0.035;
  root.add(harvestRing);

  root.userData.meatCut = meatCut;
  root.userData.creatureRoot = creatureRig.root;

  return root;
}

