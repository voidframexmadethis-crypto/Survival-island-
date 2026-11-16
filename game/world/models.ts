import * as THREE from 'three';
import { CampStructureType, CreatureSpecies, ItemId } from '../types';

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
}

export interface CreatureRig {
  root: THREE.Group;
  body: THREE.Group;
  head: THREE.Group;
  jaw?: THREE.Group;
  tail: THREE.Group;
  legs: THREE.Group[];
  wings?: THREE.Group[];
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
    const hideMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.88 });
    const hornMat = new THREE.MeshStandardMaterial({ color: 0xe7e5e4, roughness: 0.45 });
    body.position.y = 1.05;
    root.add(body);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.86, 1.55), hideMat);
    torso.castShadow = true;
    body.add(torso);
    head.position.set(0, 0.2, 0.85);
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.42, 0.48), hideMat);
    skull.position.z = 0.2;
    [-0.25, 0.25].forEach((hx) => {
      const h = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.34, 6), hornMat);
      h.rotation.z = hx > 0 ? -1.1 : 1.1;
      h.position.set(hx, 0.22, 0.18);
      head.add(h);
    });
    head.add(skull);
    body.add(head);
    body.add(tail);
    [
      [-0.3, 0.52],
      [0.3, 0.52],
      [-0.3, -0.52],
      [0.3, -0.52],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Group();
      leg.position.set(lx, -0.35, lz);
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.7, 7), hideMat);
      l.position.y = -0.35;
      leg.add(l);
      body.add(leg);
      legs.push(leg);
    });
    root.add(makeContactShadow(0.95));
  } else if (species === 'goat') {
    const coatMat = new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.9 });
    const hornMat = new THREE.MeshStandardMaterial({ color: 0x44403c, roughness: 0.6 });
    body.position.y = 0.65;
    root.add(body);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.42, 0.85), coatMat);
    torso.castShadow = true;
    body.add(torso);
    head.position.set(0, 0.22, 0.45);
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.32), coatMat);
    skull.position.z = 0.14;
    [-0.08, 0.08].forEach((hx) => {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.28, 5), hornMat);
      horn.rotation.x = -0.6;
      horn.position.set(hx, 0.2, 0.02);
      head.add(horn);
    });
    head.add(skull);
    body.add(head);
    body.add(tail);
    [
      [-0.14, 0.28],
      [0.14, 0.28],
      [-0.14, -0.28],
      [0.14, -0.28],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Group();
      leg.position.set(lx, -0.18, lz);
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.48, 6), coatMat);
      l.position.y = -0.24;
      leg.add(l);
      body.add(leg);
      legs.push(leg);
    });
    root.add(makeContactShadow(0.5));
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
    const featherMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.8 });
    const beakMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.5 });
    body.position.y = 0.38;
    root.add(body);
    const torso = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), featherMat);
    torso.scale.set(0.85, 0.85, 1.2);
    body.add(torso);
    head.position.set(0, 0.18, 0.24);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), featherMat);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 5), beakMat);
    beak.rotation.x = Math.PI / 2;
    beak.position.z = 0.14;
    head.add(skull, beak);
    body.add(head);
    body.add(tail);
    [-0.08, 0.08].forEach((lx) => {
      const leg = new THREE.Group();
      leg.position.set(lx, -0.14, 0);
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.24, 5), beakMat);
      l.position.y = -0.12;
      leg.add(l);
      body.add(leg);
      legs.push(leg);
    });
    root.add(makeContactShadow(0.28));
  } else if (species === 'bird') {
    const wingMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.7 });
    const beakMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.5 });
    root.add(body);
    const torso = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.65, 6), wingMat);
    torso.rotation.x = Math.PI / 2;
    body.add(torso);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 5), beakMat);
    beak.rotation.x = Math.PI / 2;
    beak.position.z = 0.36;
    head.add(beak);
    body.add(head);
    wings = [];
    [-1, 1].forEach((side) => {
      const wing = new THREE.Group();
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.03, 0.22), wingMat);
      blade.position.x = side * 0.32;
      wing.add(blade);
      body.add(wing);
      wings!.push(wing);
    });
    body.add(tail);
    const shadowDisc = makeContactShadow(0.2);
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

