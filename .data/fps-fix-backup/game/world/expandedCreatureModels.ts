import * as THREE from 'three';
import { CreatureSpecies } from '../types';
import type { CreatureRig } from './models';

export type ExpandedSpeciesKey =
  | 'elephant'
  | 'reindeer'
  | 'giraffe'
  | 'zebra'
  | 'rhinoceros'
  | 'hippopotamus'
  | 'tiger'
  | 'cheetah'
  | 'hyena'
  | 'polar_bear'
  | 'moose'
  | 'penguin'
  | 'gorilla'
  | 'kangaroo'
  | 'camel'
  | 'toucan'
  | 'flamingo'
  | 'peregrine_falcon'
  | 'ostrich'
  | 'sea_turtle'
  | 'great_white_shark'
  | 'manta_ray'
  | 'spinosaurus'
  | 'ankylosaurus'
  | 'allosaurus'
  | 'dilophosaurus'
  | 'diplodocus'
  | 'pteranodon'
  | 'bee'
  | 'creaking'
  | 'white_fox'
  | 'parrot'
  | 'ocelot'
  | 'panda'
  | 'vex'
  | 'evoker'
  | 'pillager'
  | 'witch';

const EXPANDED_SPECIES_SET = new Set<string>([
  'elephant',
  'reindeer',
  'giraffe',
  'zebra',
  'rhinoceros',
  'hippopotamus',
  'tiger',
  'cheetah',
  'hyena',
  'polar_bear',
  'moose',
  'penguin',
  'gorilla',
  'kangaroo',
  'camel',
  'toucan',
  'flamingo',
  'peregrine_falcon',
  'ostrich',
  'sea_turtle',
  'great_white_shark',
  'manta_ray',
  'spinosaurus',
  'ankylosaurus',
  'allosaurus',
  'dilophosaurus',
  'diplodocus',
  'pteranodon',
  'bee',
  'creaking',
  'white_fox',
  'parrot',
  'ocelot',
  'panda',
  'vex',
  'evoker',
  'pillager',
  'witch',
]);

export function isExpandedCreatureSpecies(species: CreatureSpecies): species is ExpandedSpeciesKey {
  return EXPANDED_SPECIES_SET.has(species);
}

interface PatternCache {
  zebra: THREE.CanvasTexture;
  tiger: THREE.CanvasTexture;
  cheetah: THREE.CanvasTexture;
  giraffe: THREE.CanvasTexture;
  hyena: THREE.CanvasTexture;
  turtleShell: THREE.CanvasTexture;
}

let cachedPatterns: PatternCache | null = null;

function makePatternTexture(
  draw: (ctx: CanvasRenderingContext2D, size: number) => void,
  size = 128,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  draw(ctx, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function getExpandedPatterns(): PatternCache {
  if (cachedPatterns) return cachedPatterns;

  const zebra = makePatternTexture((ctx, s) => {
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = '#18181b';
    for (let x = 0; x < s; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 7, 0);
      ctx.lineTo(x + 11, s * 0.5);
      ctx.lineTo(x + 6, s);
      ctx.lineTo(x - 1, s);
      ctx.lineTo(x + 4, s * 0.5);
      ctx.closePath();
      ctx.fill();
    }
  });

  const tiger = makePatternTexture((ctx, s) => {
    ctx.fillStyle = '#ea580c';
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = '#1c1917';
    for (let x = 4; x < s; x += 18) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 6, 0);
      ctx.lineTo(x + 3, s * 0.45);
      ctx.lineTo(x + 7, s);
      ctx.lineTo(x + 1, s);
      ctx.lineTo(x - 2, s * 0.45);
      ctx.closePath();
      ctx.fill();
    }
  });

  const cheetah = makePatternTexture((ctx, s) => {
    ctx.fillStyle = '#eab308';
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = '#1c1917';
    for (let y = 8; y < s; y += 16) {
      for (let x = 8; x < s; x += 16) {
        const ox = x + (((y * 7) % 11) - 5) * 0.7;
        const oy = y + (((x * 5) % 9) - 4) * 0.6;
        ctx.beginPath();
        ctx.arc(ox, oy, 2.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });

  const giraffe = makePatternTexture((ctx, s) => {
    ctx.fillStyle = '#fde68a';
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = '#92400e';
    const step = 24;
    for (let y = 0; y < s; y += step) {
      for (let x = 0; x < s; x += step) {
        const jx = ((x * 3 + y * 5) % 7) - 3;
        const jy = ((x * 7 + y * 2) % 7) - 3;
        ctx.fillRect(x + 3 + jx * 0.4, y + 3 + jy * 0.4, step - 7, step - 7);
      }
    }
  });

  const hyena = makePatternTexture((ctx, s) => {
    ctx.fillStyle = '#a89070';
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = '#3f2e1f';
    for (let y = 10; y < s; y += 18) {
      for (let x = 10; x < s; x += 18) {
        ctx.beginPath();
        ctx.arc(x + ((y % 3) - 1) * 3, y, 3.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });

  const turtleShell = makePatternTexture((ctx, s) => {
    ctx.fillStyle = '#365314';
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = '#a3e635';
    ctx.lineWidth = 3;
    for (let y = 0; y < s; y += 32) {
      for (let x = 0; x < s; x += 32) {
        ctx.strokeRect(x + 3, y + 3, 26, 26);
      }
    }
  });

  cachedPatterns = { zebra, tiger, cheetah, giraffe, hyena, turtleShell };
  return cachedPatterns;
}

function addStandardEyePair(
  head: THREE.Group,
  eyeX: number,
  eyeY: number,
  eyeZ: number,
  radius: number,
  mat: THREE.Material,
): void {
  [-1, 1].forEach((side) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(radius, 6, 6), mat);
    eye.position.set(side * eyeX, eyeY, eyeZ);
    head.add(eye);
  });
}

function make4Legs(
  body: THREE.Group,
  legs: THREE.Group[],
  positions: [number, number, number][],
  topR: number,
  botR: number,
  height: number,
  mat: THREE.Material,
  hoofMat?: THREE.Material,
): void {
  positions.forEach(([lx, ly, lz]) => {
    const leg = new THREE.Group();
    leg.position.set(lx, ly, lz);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(topR, botR, height, 8), mat);
    col.position.y = -height * 0.5;
    col.castShadow = true;
    leg.add(col);
    if (hoofMat) {
      const hoof = new THREE.Mesh(
        new THREE.CylinderGeometry(botR * 1.05, botR * 1.18, Math.min(0.14, height * 0.16), 8),
        hoofMat,
      );
      hoof.position.y = -height + Math.min(0.07, height * 0.08);
      leg.add(hoof);
    }
    body.add(leg);
    legs.push(leg);
  });
}

export function createExpandedCreatureModel(
  species: ExpandedSpeciesKey,
  makeContactShadow: (radius: number) => THREE.Mesh,
): CreatureRig {
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
  let shadowRadius = 1.1;

  const patterns = getExpandedPatterns();
  const darkEyeMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.25 });
  const ivoryMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.35 });
  const hornDarkMat = new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.55 });

  if (species === 'elephant') {
    const hideMat = new THREE.MeshStandardMaterial({ color: 0x6b7280, roughness: 0.88 });
    const earInnerMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.84 });
    shadowRadius = 2.3;

    body.position.y = 1.95;
    root.add(body);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(1.75, 1.65, 2.75), hideMat);
    torso.castShadow = true;
    body.add(torso);
    const rump = new THREE.Mesh(new THREE.SphereGeometry(0.92, 10, 8), hideMat);
    rump.scale.set(0.95, 0.9, 1.0);
    rump.position.set(0, 0.05, -1.1);
    body.add(rump);

    head.position.set(0, 0.45, 1.48);
    const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.66, 10, 9), hideMat);
    cranium.scale.set(0.95, 1.05, 1.05);
    cranium.castShadow = true;
    head.add(cranium);

    // Big fan ears
    [-1, 1].forEach((side) => {
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.92, 0.72), earInnerMat);
      ear.position.set(side * 0.7, 0.05, -0.08);
      ear.rotation.y = side * -0.38;
      ear.castShadow = true;
      head.add(ear);
    });

    // Multi-segment curved trunk
    for (let seg = 0; seg < 4; seg++) {
      const tMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18 - seg * 0.025, 0.16 - seg * 0.025, 0.44, 8),
        hideMat,
      );
      tMesh.position.set(0, -0.25 - seg * 0.34, 0.55 + Math.sin(seg * 0.55) * 0.16);
      tMesh.rotation.x = 0.25 + seg * 0.14;
      tMesh.castShadow = true;
      head.add(tMesh);
    }

    // Ivory tusks
    [-1, 1].forEach((side) => {
      const tusk = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.95, 7), ivoryMat);
      tusk.rotation.x = Math.PI * 0.38;
      tusk.rotation.z = side * -0.14;
      tusk.position.set(side * 0.28, -0.24, 0.72);
      head.add(tusk);
    });
    addStandardEyePair(head, 0.46, 0.16, 0.42, 0.065, darkEyeMat);
    body.add(head);

    tail.position.set(0, 0.12, -1.55);
    const tailRope = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.03, 1.1, 6), hideMat);
    tailRope.rotation.x = 0.28;
    tailRope.position.set(0, -0.45, -0.18);
    const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.22, 6), hornDarkMat);
    tuft.position.set(0, -1.0, -0.32);
    tail.add(tailRope, tuft);
    body.add(tail);

    make4Legs(
      body,
      legs,
      [
        [-0.58, -0.45, 0.92],
        [0.58, -0.45, 0.92],
        [-0.58, -0.45, -0.92],
        [0.58, -0.45, -0.92],
      ],
      0.27,
      0.24,
      1.5,
      hideMat,
      hornDarkMat,
    );
  } else if (species === 'reindeer') {
    const coatMat = new THREE.MeshStandardMaterial({ color: 0x7c5a43, roughness: 0.85 });
    const winterRuffMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.9 });
    const antlerMat = new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.55 });
    shadowRadius = 0.95;

    body.position.y = 1.15;
    root.add(body);

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 0.92, 6, 10), coatMat);
    torso.rotation.x = Math.PI / 2;
    torso.castShadow = true;
    body.add(torso);
    const chestRuff = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), winterRuffMat);
    chestRuff.scale.set(0.9, 1.05, 0.95);
    chestRuff.position.set(0, 0.06, 0.52);
    body.add(chestRuff);

    head.position.set(0, 0.35, 0.68);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 0.58, 8), winterRuffMat);
    neck.rotation.x = 0.38;
    neck.position.set(0, 0.22, 0.14);
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 0.5), coatMat);
    skull.position.set(0, 0.48, 0.34);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.065, 6, 6), hornDarkMat);
    nose.position.set(0, 0.47, 0.6);
    head.add(neck, skull, nose);

    // Sweeping branching reindeer antlers (main beam + brow tine + crown tines)
    [-1, 1].forEach((side) => {
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.04, 0.88, 6), antlerMat);
      beam.position.set(side * 0.22, 0.92, 0.15);
      beam.rotation.z = side * -0.44;
      beam.rotation.x = -0.22;
      const browTine = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.026, 0.36, 5), antlerMat);
      browTine.position.set(side * 0.15, 0.72, 0.42);
      browTine.rotation.x = 0.95;
      const topTine = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.024, 0.34, 5), antlerMat);
      topTine.position.set(side * 0.4, 1.24, 0.16);
      topTine.rotation.x = 0.42;
      topTine.rotation.z = side * -0.15;
      head.add(beam, browTine, topTine);
    });
    addStandardEyePair(head, 0.14, 0.54, 0.42, 0.036, darkEyeMat);
    body.add(head);

    tail.position.set(0, 0.14, -0.68);
    const scut = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.22, 6), winterRuffMat);
    scut.rotation.x = -0.6;
    scut.position.z = -0.06;
    tail.add(scut);
    body.add(tail);

    make4Legs(
      body,
      legs,
      [
        [-0.22, -0.22, 0.44],
        [0.22, -0.22, 0.44],
        [-0.22, -0.22, -0.44],
        [0.22, -0.22, -0.44],
      ],
      0.085,
      0.06,
      0.93,
      coatMat,
      hornDarkMat,
    );
  } else if (species === 'giraffe') {
    const spotMat = new THREE.MeshStandardMaterial({ map: patterns.giraffe, roughness: 0.78 });
    const maneMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 });
    shadowRadius = 1.4;

    body.position.y = 2.15;
    root.add(body);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.15, 1.95), spotMat);
    torso.rotation.x = -0.18;
    torso.castShadow = true;
    body.add(torso);

    head.position.set(0, 0.55, 0.88);
    const longNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.34, 2.75, 8), spotMat);
    longNeck.rotation.x = 0.22;
    longNeck.position.set(0, 1.25, 0.35);
    longNeck.castShadow = true;
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.28, 0.68), spotMat);
    skull.position.set(0, 2.6, 0.85);
    head.add(longNeck, skull);
    [-1, 1].forEach((side) => {
      const ossicone = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.038, 0.26, 6), maneMat);
      ossicone.position.set(side * 0.1, 2.84, 0.65);
      head.add(ossicone);
    });
    addStandardEyePair(head, 0.17, 2.66, 0.9, 0.04, darkEyeMat);
    body.add(head);

    tail.position.set(0, -0.05, -1.0);
    const tailShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.025, 0.9, 6), spotMat);
    tailShaft.position.y = -0.45;
    tail.add(tailShaft);
    body.add(tail);

    make4Legs(
      body,
      legs,
      [
        [-0.36, -0.35, 0.74],
        [0.36, -0.35, 0.74],
        [-0.34, -0.52, -0.72],
        [0.34, -0.52, -0.72],
      ],
      0.13,
      0.085,
      1.78,
      spotMat,
      hornDarkMat,
    );
  } else if (species === 'zebra') {
    const stripeMat = new THREE.MeshStandardMaterial({ map: patterns.zebra, roughness: 0.76 });
    shadowRadius = 1.05;
    body.position.y = 1.22;
    root.add(body);

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 1.05, 6, 10), stripeMat);
    torso.rotation.x = Math.PI / 2;
    torso.castShadow = true;
    body.add(torso);

    head.position.set(0, 0.32, 0.68);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 0.68, 8), stripeMat);
    neck.rotation.x = 0.45;
    neck.position.set(0, 0.28, 0.18);
    const mane = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.62, 0.12), hornDarkMat);
    mane.rotation.x = 0.45;
    mane.position.set(0, 0.36, 0.08);
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.28, 0.56), stripeMat);
    snout.rotation.x = 0.2;
    snout.position.set(0, 0.55, 0.48);
    const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 0.14), hornDarkMat);
    muzzle.position.set(0, 0.49, 0.74);
    head.add(neck, mane, snout, muzzle);
    addStandardEyePair(head, 0.14, 0.62, 0.46, 0.036, darkEyeMat);
    body.add(head);

    tail.position.set(0, 0.1, -0.72);
    const tMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.02, 0.65, 6), hornDarkMat);
    tMesh.rotation.x = 0.3;
    tMesh.position.y = -0.32;
    tail.add(tMesh);
    body.add(tail);

    make4Legs(
      body,
      legs,
      [
        [-0.26, -0.22, 0.48],
        [0.26, -0.22, 0.48],
        [-0.26, -0.22, -0.48],
        [0.26, -0.22, -0.48],
      ],
      0.095,
      0.068,
      1.0,
      stripeMat,
      hornDarkMat,
    );
  } else if (species === 'rhinoceros') {
    const armorMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.88 });
    const ridgeMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 });
    shadowRadius = 1.65;

    body.position.y = 1.18;
    root.add(body);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(1.38, 1.18, 2.25), armorMat);
    torso.castShadow = true;
    body.add(torso);
    const shoulderPlate = new THREE.Mesh(new THREE.BoxGeometry(1.44, 1.24, 0.68), ridgeMat);
    shoulderPlate.position.set(0, 0.04, 0.55);
    body.add(shoulderPlate);

    head.position.set(0, 0.1, 1.28);
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.58, 0.92), armorMat);
    skull.position.set(0, 0.02, 0.32);
    skull.castShadow = true;
    const frontHorn = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.68, 7), hornDarkMat);
    frontHorn.rotation.x = 0.25;
    frontHorn.position.set(0, 0.46, 0.68);
    const backHorn = new THREE.Mesh(new THREE.ConeGeometry(0.095, 0.34, 7), hornDarkMat);
    backHorn.position.set(0, 0.38, 0.36);
    head.add(skull, frontHorn, backHorn);
    addStandardEyePair(head, 0.32, 0.14, 0.32, 0.045, darkEyeMat);
    body.add(head);

    tail.position.set(0, 0.12, -1.15);
    const tMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.025, 0.55, 6), armorMat);
    tMesh.position.y = -0.28;
    tail.add(tMesh);
    body.add(tail);

    make4Legs(
      body,
      legs,
      [
        [-0.48, -0.38, 0.72],
        [0.48, -0.38, 0.72],
        [-0.48, -0.38, -0.72],
        [0.48, -0.38, -0.72],
      ],
      0.22,
      0.19,
      0.8,
      armorMat,
    );
  } else if (species === 'hippopotamus') {
    const hippoMat = new THREE.MeshStandardMaterial({ color: 0x6b5b6e, roughness: 0.72 });
    const pinkMat = new THREE.MeshStandardMaterial({ color: 0xa87c8a, roughness: 0.76 });
    shadowRadius = 1.5;

    body.position.y = 0.88;
    root.add(body);

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.72, 1.35, 6, 12), hippoMat);
    torso.rotation.x = Math.PI / 2;
    torso.castShadow = true;
    body.add(torso);

    head.position.set(0, 0.16, 1.1);
    const cranium = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.52, 0.55), hippoMat);
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.36, 0.52), pinkMat);
    snout.position.set(0, -0.06, 0.44);
    head.add(cranium, snout);

    jaw = new THREE.Group();
    jaw.position.set(0, -0.22, 0.25);
    const lowerMuzzle = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.18, 0.54), hippoMat);
    lowerMuzzle.position.set(0, 0, 0.24);
    jaw.add(lowerMuzzle);
    [-0.22, 0.22].forEach((tx) => {
      const tusk = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.2, 5), ivoryMat);
      tusk.position.set(tx, 0.14, 0.44);
      jaw!.add(tusk);
    });
    head.add(jaw);
    addStandardEyePair(head, 0.28, 0.28, 0.12, 0.045, darkEyeMat);
    body.add(head);

    tail.position.set(0, 0.08, -1.05);
    const tMesh = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.36, 5), hippoMat);
    tMesh.rotation.x = -Math.PI / 2;
    tMesh.position.z = -0.16;
    tail.add(tMesh);
    body.add(tail);

    make4Legs(
      body,
      legs,
      [
        [-0.44, -0.32, 0.65],
        [0.44, -0.32, 0.65],
        [-0.44, -0.32, -0.65],
        [0.44, -0.32, -0.65],
      ],
      0.2,
      0.18,
      0.56,
      hippoMat,
    );
  } else if (species === 'tiger' || species === 'cheetah' || species === 'hyena') {
    const isTiger = species === 'tiger';
    const isCheetah = species === 'cheetah';
    const coatTex = isTiger
      ? patterns.tiger
      : isCheetah
        ? patterns.cheetah
        : patterns.hyena;
    const coatMat = new THREE.MeshStandardMaterial({ map: coatTex, roughness: 0.78 });
    const chestMat = new THREE.MeshStandardMaterial({
      color: isTiger ? 0xfafaf9 : isCheetah ? 0xfef3c7 : 0x78716c,
      roughness: 0.85,
    });
    eyeGlowMat = new THREE.MeshBasicMaterial({
      color: isTiger ? 0xfbbf24 : 0xfde047,
      transparent: true,
      opacity: 0.35,
    });
    const scaleS = isTiger ? 1.08 : isCheetah ? 0.92 : 0.88;
    shadowRadius = 0.95 * scaleS;

    body.position.y = 0.95 * scaleS;
    root.add(body);

    const torso = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.36 * scaleS, 0.98 * scaleS, 6, 10),
      coatMat,
    );
    torso.rotation.x = Math.PI / 2;
    torso.castShadow = true;
    body.add(torso);

    const ruff = new THREE.Mesh(new THREE.SphereGeometry(0.35 * scaleS, 8, 8), chestMat);
    ruff.position.set(0, -0.02, 0.48 * scaleS);
    body.add(ruff);

    head.position.set(0, 0.24 * scaleS, 0.74 * scaleS);
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.38 * scaleS, 0.34 * scaleS, 0.42 * scaleS), coatMat);
    const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.24 * scaleS, 0.18 * scaleS, 0.24 * scaleS), chestMat);
    muzzle.position.set(0, -0.06 * scaleS, 0.24 * scaleS);
    head.add(skull, muzzle);

    [-1, 1].forEach((side) => {
      const ear = new THREE.Mesh(
        new THREE.ConeGeometry(isTiger || isCheetah ? 0.065 : 0.09, 0.12, 5),
        coatMat,
      );
      ear.position.set(side * 0.15 * scaleS, 0.2 * scaleS, -0.02);
      head.add(ear);
    });
    addStandardEyePair(head, 0.12 * scaleS, 0.06 * scaleS, 0.2 * scaleS, 0.04, eyeGlowMat);

    jaw = new THREE.Group();
    jaw.position.set(0, -0.14 * scaleS, 0.12 * scaleS);
    const lowerJaw = new THREE.Mesh(new THREE.BoxGeometry(0.2 * scaleS, 0.08 * scaleS, 0.22 * scaleS), coatMat);
    lowerJaw.position.z = 0.08;
    jaw.add(lowerJaw);
    head.add(jaw);
    body.add(head);

    tail.position.set(0, 0.12 * scaleS, -0.68 * scaleS);
    const tMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055 * scaleS, 0.035 * scaleS, 0.85 * scaleS, 6),
      coatMat,
    );
    tMesh.rotation.x = -Math.PI / 2.6;
    tMesh.position.set(0, -0.18, -0.35);
    tail.add(tMesh);
    body.add(tail);

    make4Legs(
      body,
      legs,
      [
        [-0.22 * scaleS, -0.18 * scaleS, 0.44 * scaleS],
        [0.22 * scaleS, -0.18 * scaleS, 0.44 * scaleS],
        [-0.22 * scaleS, -0.18 * scaleS, -0.44 * scaleS],
        [0.22 * scaleS, -0.18 * scaleS, -0.44 * scaleS],
      ],
      0.11 * scaleS,
      0.075 * scaleS,
      0.77 * scaleS,
      coatMat,
    );
  } else if (species === 'polar_bear') {
    const furMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.84 });
    const snoutMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.78 });
    shadowRadius = 1.4;
    body.position.y = 1.15;
    root.add(body);

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.62, 1.15, 6, 10), furMat);
    torso.rotation.x = Math.PI / 2;
    torso.castShadow = true;
    body.add(torso);

    head.position.set(0, 0.28, 0.92);
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.46, 0.56), furMat);
    const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.24, 0.34), snoutMat);
    muzzle.position.set(0, -0.07, 0.36);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.065, 6, 6), hornDarkMat);
    nose.position.set(0, -0.02, 0.54);
    head.add(skull, muzzle, nose);
    [-1, 1].forEach((side) => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), furMat);
      ear.position.set(side * 0.22, 0.24, -0.05);
      head.add(ear);
    });
    addStandardEyePair(head, 0.17, 0.08, 0.26, 0.04, darkEyeMat);

    jaw = new THREE.Group();
    jaw.position.set(0, -0.16, 0.18);
    const lJaw = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.28), furMat);
    lJaw.position.z = 0.12;
    jaw.add(lJaw);
    head.add(jaw);
    body.add(head);

    tail.position.set(0, 0.1, -0.92);
    const stub = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 6), furMat);
    tail.add(stub);
    body.add(tail);

    make4Legs(
      body,
      legs,
      [
        [-0.38, -0.28, 0.58],
        [0.38, -0.28, 0.58],
        [-0.38, -0.28, -0.58],
        [0.38, -0.28, -0.58],
      ],
      0.2,
      0.18,
      0.86,
      furMat,
    );

    breathWisps = [];
    for (let w = 0; w < 3; w++) {
      const puff = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 5, 5),
        new THREE.MeshBasicMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.35 }),
      );
      root.add(puff);
      breathWisps.push(puff);
    }
  } else if (species === 'moose') {
    const coatMat = new THREE.MeshStandardMaterial({ color: 0x3b2517, roughness: 0.88 });
    const legMat = new THREE.MeshStandardMaterial({ color: 0x78563c, roughness: 0.86 });
    const palmMat = new THREE.MeshStandardMaterial({ color: 0xd6cfc2, roughness: 0.58 });
    shadowRadius = 1.25;

    body.position.y = 1.55;
    root.add(body);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.98, 1.85), coatMat);
    torso.castShadow = true;
    const hump = new THREE.Mesh(new THREE.SphereGeometry(0.48, 8, 8), coatMat);
    hump.position.set(0, 0.42, 0.45);
    body.add(torso, hump);

    head.position.set(0, 0.35, 0.98);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.34, 0.65, 8), coatMat);
    neck.rotation.x = 0.65;
    neck.position.set(0, 0.14, 0.2);
    const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.36, 0.68), coatMat);
    muzzle.position.set(0, 0.24, 0.58);
    const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.03, 0.34, 6), coatMat);
    bell.position.set(0, -0.02, 0.38);
    head.add(neck, muzzle, bell);

    // Broad palmed moose antlers
    [-1, 1].forEach((side) => {
      const palm = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.08, 0.46), palmMat);
      palm.position.set(side * 0.52, 0.68, 0.32);
      palm.rotation.z = side * 0.36;
      palm.rotation.y = side * -0.25;
      head.add(palm);
      for (let t = 0; t < 3; t++) {
        const tine = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.24, 5), palmMat);
        tine.position.set(side * (0.38 + t * 0.18), 0.8 + t * 0.06, 0.42 - t * 0.08);
        head.add(tine);
      }
    });
    addStandardEyePair(head, 0.18, 0.34, 0.48, 0.04, darkEyeMat);
    body.add(head);

    tail.position.set(0, 0.18, -0.95);
    const stub = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 5), coatMat);
    stub.rotation.x = -Math.PI / 2;
    tail.add(stub);
    body.add(tail);

    make4Legs(
      body,
      legs,
      [
        [-0.32, -0.35, 0.62],
        [0.32, -0.35, 0.62],
        [-0.32, -0.35, -0.62],
        [0.32, -0.35, -0.62],
      ],
      0.11,
      0.08,
      1.2,
      legMat,
      hornDarkMat,
    );
  } else if (species === 'penguin') {
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.55 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.65 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.5 });
    shadowRadius = 0.38;

    body.position.y = 0.48;
    root.add(body);

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.42, 6, 10), blackMat);
    torso.castShadow = true;
    const belly = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.36, 6, 8), whiteMat);
    belly.position.set(0, -0.02, 0.07);
    body.add(torso, belly);

    head.position.set(0, 0.38, 0.04);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), blackMat);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.18, 5), goldMat);
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, -0.02, 0.2);
    head.add(skull, beak);
    addStandardEyePair(head, 0.08, 0.03, 0.13, 0.024, whiteMat);
    body.add(head);

    wings = [];
    [-1, 1].forEach((side) => {
      const flipper = new THREE.Group();
      flipper.position.set(side * 0.22, 0.16, 0.02);
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.36, 0.12), blackMat);
      blade.position.y = -0.18;
      flipper.add(blade);
      body.add(flipper);
      wings!.push(flipper);
    });

    tail.position.set(0, -0.26, -0.18);
    body.add(tail);

    [-0.1, 0.1].forEach((lx) => {
      const leg = new THREE.Group();
      leg.position.set(lx, -0.34, 0.04);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, 0.18), goldMat);
      foot.position.set(0, -0.12, 0.04);
      leg.add(foot);
      body.add(leg);
      legs.push(leg);
    });
  } else if (species === 'gorilla') {
    const furMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.88 });
    const silverMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.82 });
    const faceMat = new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.72 });
    shadowRadius = 1.05;

    body.position.y = 0.96;
    root.add(body);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.92, 1.08), furMat);
    torso.rotation.x = -0.35;
    torso.castShadow = true;
    const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.32, 0.72), silverMat);
    saddle.rotation.x = -0.35;
    saddle.position.set(0, 0.38, -0.08);
    body.add(torso, saddle);

    head.position.set(0, 0.56, 0.55);
    const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.28, 9, 8), furMat);
    const crest = new THREE.Mesh(new THREE.SphereGeometry(0.18, 7, 7), furMat);
    crest.position.set(0, 0.18, -0.04);
    const face = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.24, 0.2), faceMat);
    face.position.set(0, -0.04, 0.2);
    head.add(cranium, crest, face);
    addStandardEyePair(head, 0.09, 0.04, 0.27, 0.032, darkEyeMat);
    body.add(head);

    tail.position.set(0, -0.2, -0.5);
    body.add(tail);

    make4Legs(
      body,
      legs,
      [
        [-0.46, 0.1, 0.38],
        [0.46, 0.1, 0.38],
        [-0.3, -0.24, -0.4],
        [0.3, -0.24, -0.4],
      ],
      0.16,
      0.14,
      0.88,
      furMat,
    );
  } else if (species === 'kangaroo') {
    const furMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.82 });
    const bellyMat = new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.85 });
    shadowRadius = 0.75;

    body.position.y = 0.96;
    root.add(body);

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.62, 6, 10), furMat);
    torso.rotation.x = 0.38;
    torso.castShadow = true;
    const belly = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.48, 5, 8), bellyMat);
    belly.rotation.x = 0.38;
    belly.position.set(0, -0.02, 0.08);
    body.add(torso, belly);

    head.position.set(0, 0.56, 0.28);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 0.35, 7), furMat);
    neck.rotation.x = 0.25;
    neck.position.set(0, 0.12, 0.05);
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.38), furMat);
    skull.position.set(0, 0.32, 0.18);
    [-1, 1].forEach((side) => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.24, 5), furMat);
      ear.position.set(side * 0.08, 0.48, 0.04);
      ear.rotation.z = side * -0.18;
      head.add(ear);
    });
    head.add(neck, skull);
    addStandardEyePair(head, 0.09, 0.35, 0.24, 0.03, darkEyeMat);
    body.add(head);

    tail.position.set(0, -0.25, -0.26);
    const bTail = new THREE.Mesh(new THREE.ConeGeometry(0.12, 1.15, 7), furMat);
    bTail.rotation.x = -1.1;
    bTail.position.set(0, -0.24, -0.48);
    tail.add(bTail);
    body.add(tail);

    [-0.22, 0.22].forEach((lx) => {
      const leg = new THREE.Group();
      leg.position.set(lx, -0.22, -0.04);
      const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.5, 0.24), furMat);
      thigh.position.y = -0.22;
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.48), furMat);
      foot.position.set(0, -0.7, 0.16);
      leg.add(thigh, foot);
      body.add(leg);
      legs.push(leg);
    });
  } else if (species === 'camel') {
    const sandMat = new THREE.MeshStandardMaterial({ color: 0xd6b07a, roughness: 0.86 });
    shadowRadius = 1.25;
    body.position.y = 1.48;
    root.add(body);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.88, 1.72), sandMat);
    torso.castShadow = true;
    const hump = new THREE.Mesh(new THREE.SphereGeometry(0.46, 9, 8), sandMat);
    hump.scale.set(0.85, 1.15, 1.05);
    hump.position.set(0, 0.54, 0);
    body.add(torso, hump);

    head.position.set(0, 0.18, 0.88);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 0.92, 8), sandMat);
    neck.rotation.x = 0.48;
    neck.position.set(0, 0.25, 0.35);
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.26, 0.56), sandMat);
    skull.position.set(0, 0.65, 0.72);
    head.add(neck, skull);
    addStandardEyePair(head, 0.14, 0.7, 0.72, 0.036, darkEyeMat);
    body.add(head);

    tail.position.set(0, 0.06, -0.88);
    const tMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.025, 0.6, 5), sandMat);
    tMesh.position.y = -0.28;
    tail.add(tMesh);
    body.add(tail);

    make4Legs(
      body,
      legs,
      [
        [-0.28, -0.34, 0.62],
        [0.28, -0.34, 0.62],
        [-0.28, -0.34, -0.62],
        [0.28, -0.34, -0.62],
      ],
      0.11,
      0.08,
      1.12,
      sandMat,
    );
  } else if (species === 'toucan') {
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.62 });
    const bibMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.7 });
    const beakMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.4 });
    shadowRadius = 0.28;

    root.add(body);
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.36, 6, 8), blackMat);
    torso.rotation.x = Math.PI / 2;
    torso.castShadow = true;
    const bib = new THREE.Mesh(new THREE.SphereGeometry(0.13, 7, 7), bibMat);
    bib.position.set(0, 0.02, 0.16);
    body.add(torso, bib);

    head.position.set(0, 0.08, 0.24);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.11, 7, 7), blackMat);
    const giantBeak = new THREE.Mesh(new THREE.ConeGeometry(0.078, 0.34, 6), beakMat);
    giantBeak.rotation.x = Math.PI / 2;
    giantBeak.position.set(0, -0.01, 0.24);
    const beakTip = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.08, 5), blackMat);
    beakTip.rotation.x = Math.PI / 2;
    beakTip.position.set(0, -0.01, 0.4);
    head.add(skull, giantBeak, beakTip);
    addStandardEyePair(head, 0.075, 0.02, 0.08, 0.022, bibMat);
    body.add(head);

    wings = [];
    [-1, 1].forEach((side) => {
      const wing = new THREE.Group();
      wing.position.set(side * 0.12, 0.05, 0.02);
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.03, 0.2), blackMat);
      blade.position.x = side * 0.23;
      wing.add(blade);
      body.add(wing);
      wings!.push(wing);
    });
    tail.position.set(0, 0.02, -0.26);
    const tailFan = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.025, 0.2), blackMat);
    tailFan.position.z = -0.1;
    tail.add(tailFan);
    body.add(tail);

    const shadowDisc = makeContactShadow(shadowRadius);
    shadowDisc.visible = false;
    root.add(shadowDisc);
    return { root, body, head, jaw, tail, legs, wings, shadowDisc };
  } else if (species === 'peregrine_falcon') {
    const slateMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.65 });
    const breastMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.72 });
    const beakMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.45 });
    shadowRadius = 0.35;

    root.add(body);
    const torso = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.62, 7), slateMat);
    torso.rotation.x = Math.PI / 2;
    torso.castShadow = true;
    const chest = new THREE.Mesh(new THREE.SphereGeometry(0.14, 7, 7), breastMat);
    chest.position.set(0, -0.04, 0.1);
    body.add(torso, chest);

    head.position.set(0, 0.05, 0.28);
    const hood = new THREE.Mesh(new THREE.SphereGeometry(0.1, 7, 6), slateMat);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.036, 0.12, 5), beakMat);
    beak.rotation.x = Math.PI / 1.8;
    beak.position.set(0, -0.02, 0.12);
    head.add(hood, beak);
    addStandardEyePair(head, 0.068, 0.02, 0.07, 0.02, darkEyeMat);
    body.add(head);

    wings = [];
    [-1, 1].forEach((side) => {
      const wing = new THREE.Group();
      wing.position.set(side * 0.11, 0.04, 0.04);
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.028, 0.24), slateMat);
      blade.position.x = side * 0.38;
      blade.rotation.y = side * -0.18;
      wing.add(blade);
      body.add(wing);
      wings!.push(wing);
    });
    tail.position.set(0, 0.02, -0.32);
    const tailFan = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.02, 0.24), slateMat);
    tailFan.position.z = -0.1;
    tail.add(tailFan);
    body.add(tail);

    const shadowDisc = makeContactShadow(shadowRadius);
    shadowDisc.visible = false;
    root.add(shadowDisc);
    return { root, body, head, jaw, tail, legs, wings, shadowDisc };
  } else if (species === 'flamingo') {
    const pinkMat = new THREE.MeshStandardMaterial({ color: 0xfb7185, roughness: 0.68 });
    const legMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.6 });
    shadowRadius = 0.45;

    body.position.y = 1.05;
    root.add(body);

    const torso = new THREE.Mesh(new THREE.SphereGeometry(0.26, 9, 8), pinkMat);
    torso.scale.set(0.85, 0.82, 1.35);
    torso.castShadow = true;
    body.add(torso);

    head.position.set(0, 0.12, 0.28);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.68, 7), pinkMat);
    neck.rotation.x = 0.15;
    neck.position.set(0, 0.32, 0.06);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.085, 7, 7), pinkMat);
    skull.position.set(0, 0.68, 0.12);
    const bill = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.16, 5), hornDarkMat);
    bill.rotation.x = Math.PI * 0.72;
    bill.position.set(0, 0.62, 0.22);
    head.add(neck, skull, bill);
    addStandardEyePair(head, 0.06, 0.7, 0.16, 0.018, darkEyeMat);
    body.add(head);

    tail.position.set(0, 0.02, -0.34);
    const tFan = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.22, 5), pinkMat);
    tFan.rotation.x = -Math.PI / 2;
    tail.add(tFan);
    body.add(tail);

    [-0.1, 0.1].forEach((lx) => {
      const leg = new THREE.Group();
      leg.position.set(lx, -0.15, 0);
      const stilt = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.02, 0.88, 6), legMat);
      stilt.position.y = -0.44;
      leg.add(stilt);
      body.add(leg);
      legs.push(leg);
    });
  } else if (species === 'ostrich') {
    const plumeMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85 });
    const whiteTipMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.8 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xfca5a5, roughness: 0.75 });
    shadowRadius = 0.72;

    body.position.y = 1.28;
    root.add(body);

    const torso = new THREE.Mesh(new THREE.SphereGeometry(0.46, 10, 9), plumeMat);
    torso.scale.set(0.9, 0.85, 1.32);
    torso.castShadow = true;
    body.add(torso);
    [-1, 1].forEach((side) => {
      const wingPlume = new THREE.Mesh(new THREE.SphereGeometry(0.24, 7, 7), whiteTipMat);
      wingPlume.scale.set(0.4, 0.85, 1.25);
      wingPlume.position.set(side * 0.42, 0.04, -0.04);
      body.add(wingPlume);
    });

    head.position.set(0, 0.18, 0.48);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.1, 0.96, 8), skinMat);
    neck.rotation.x = 0.12;
    neck.position.set(0, 0.48, 0.06);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.11, 7, 7), skinMat);
    skull.position.set(0, 0.98, 0.12);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.16, 5), ivoryMat);
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 0.96, 0.25);
    head.add(neck, skull, beak);
    addStandardEyePair(head, 0.08, 1.0, 0.17, 0.025, darkEyeMat);
    body.add(head);

    tail.position.set(0, 0.12, -0.58);
    const plumeTail = new THREE.Mesh(new THREE.SphereGeometry(0.2, 7, 6), whiteTipMat);
    tail.add(plumeTail);
    body.add(tail);

    [-0.22, 0.22].forEach((lx) => {
      const leg = new THREE.Group();
      leg.position.set(lx, -0.22, 0);
      const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.055, 0.48, 7), skinMat);
      thigh.position.y = -0.24;
      const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.58, 7), skinMat);
      shin.position.y = -0.75;
      leg.add(thigh, shin);
      body.add(leg);
      legs.push(leg);
    });
  } else if (species === 'sea_turtle') {
    const shellMat = new THREE.MeshStandardMaterial({ map: patterns.turtleShell, roughness: 0.55 });
    const flipperMat = new THREE.MeshStandardMaterial({ color: 0x4d7c0f, roughness: 0.62 });
    shadowRadius = 0.8;

    root.add(body);
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.58, 10, 8), shellMat);
    shell.scale.set(1.05, 0.42, 1.28);
    shell.castShadow = true;
    body.add(shell);

    head.position.set(0, 0.02, 0.72);
    const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 7), flipperMat);
    cranium.scale.set(0.95, 0.85, 1.2);
    head.add(cranium);
    addStandardEyePair(head, 0.12, 0.05, 0.1, 0.026, darkEyeMat);
    body.add(head);

    wings = [];
    [-1, 1].forEach((side) => {
      const flipper = new THREE.Group();
      flipper.position.set(side * 0.5, -0.04, 0.34);
      const paddle = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.05, 0.24), flipperMat);
      paddle.position.x = side * 0.3;
      paddle.rotation.y = side * -0.35;
      flipper.add(paddle);
      body.add(flipper);
      wings!.push(flipper);
    });

    tail.position.set(0, -0.04, -0.7);
    const backFlippers = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.04, 0.24), flipperMat);
    backFlippers.position.z = -0.14;
    tail.add(backFlippers);
    body.add(tail);

    const shadowDisc = makeContactShadow(shadowRadius);
    shadowDisc.visible = false;
    root.add(shadowDisc);
    return { root, body, head, jaw, tail, legs, wings, shadowDisc };
  } else if (species === 'great_white_shark') {
    const backMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.28, metalness: 0.1 });
    const bellyMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.32 });
    shadowRadius = 1.1;

    root.add(body);
    const hull = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 1.75, 6, 12), backMat);
    hull.rotation.x = Math.PI / 2;
    body.add(hull);
    const belly = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 1.55, 5, 10), bellyMat);
    belly.rotation.x = Math.PI / 2;
    belly.position.y = -0.08;
    body.add(belly);

    const dorsal = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.62, 4), backMat);
    dorsal.rotation.x = -0.32;
    dorsal.position.set(0, 0.56, -0.05);
    body.add(dorsal);

    [-1, 1].forEach((side) => {
      const pec = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.045, 0.28), backMat);
      pec.position.set(side * 0.42, -0.14, 0.35);
      pec.rotation.y = side * -0.4;
      pec.rotation.z = side * -0.22;
      body.add(pec);
    });

    head.position.set(0, 0, 1.05);
    const snout = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.72, 8), backMat);
    snout.rotation.x = Math.PI / 2;
    snout.position.z = 0.28;
    head.add(snout);
    addStandardEyePair(head, 0.22, 0.08, 0.18, 0.04, darkEyeMat);
    body.add(head);

    tail.position.set(0, 0, -1.12);
    const fluke = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.92, 0.42), backMat);
    fluke.position.z = -0.28;
    tail.add(fluke);
    body.add(tail);

    const shadowDisc = makeContactShadow(shadowRadius);
    shadowDisc.visible = false;
    root.add(shadowDisc);
    return { root, body, head, jaw, tail, legs, shadowDisc };
  } else if (species === 'manta_ray') {
    const rayTopMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.32 });
    const rayBellyMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.36 });
    shadowRadius = 1.25;

    root.add(body);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.14, 6), rayTopMat);
    disc.scale.set(1.25, 1, 1.45);
    body.add(disc);
    const belly = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.08, 6), rayBellyMat);
    belly.position.y = -0.05;
    body.add(belly);

    wings = [];
    [-1, 1].forEach((side) => {
      const wing = new THREE.Group();
      wing.position.set(side * 0.45, 0, 0.05);
      const fin = new THREE.Mesh(new THREE.ConeGeometry(0.65, 1.35, 4), rayTopMat);
      fin.rotation.z = side * -Math.PI / 2;
      fin.scale.set(0.18, 1, 0.78);
      fin.position.x = side * 0.65;
      wing.add(fin);
      body.add(wing);
      wings!.push(wing);
    });

    head.position.set(0, 0, 0.68);
    [-1, 1].forEach((side) => {
      const lobe = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.28), rayTopMat);
      lobe.position.set(side * 0.24, -0.02, 0.12);
      head.add(lobe);
    });
    body.add(head);

    tail.position.set(0, 0, -0.82);
    const whip = new THREE.Mesh(new THREE.ConeGeometry(0.04, 1.4, 5), rayTopMat);
    whip.rotation.x = -Math.PI / 2;
    whip.position.z = -0.7;
    tail.add(whip);
    body.add(tail);

    const shadowDisc = makeContactShadow(shadowRadius);
    shadowDisc.visible = false;
    root.add(shadowDisc);
    return { root, body, head, jaw, tail, legs, wings, shadowDisc };
  } else if (species === 'spinosaurus') {
    const hideMat = new THREE.MeshStandardMaterial({ color: 0x3f5e4d, roughness: 0.76 });
    const sailMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.68 });
    const bellyMat = new THREE.MeshStandardMaterial({ color: 0xa3a380, roughness: 0.82 });
    eyeGlowMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.35 });
    shadowRadius = 2.35;

    body.position.y = 2.45;
    root.add(body);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(1.45, 1.48, 3.1), hideMat);
    torso.castShadow = true;
    body.add(torso);

    // Iconic tall curved dorsal sail
    for (let s = 0; s < 9; s++) {
      const frac = s / 8;
      const arch = Math.sin(frac * Math.PI);
      const spineH = 0.75 + arch * 1.45;
      const sailFin = new THREE.Mesh(new THREE.BoxGeometry(0.14, spineH, 0.34), sailMat);
      sailFin.position.set(0, 0.72 + spineH * 0.5, -1.25 + s * 0.31);
      sailFin.castShadow = true;
      body.add(sailFin);
    }

    head.position.set(0, 0.62, 1.58);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.56, 1.25, 9), hideMat);
    neck.rotation.x = 0.55;
    neck.position.set(0, 0.25, 0.25);
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.48, 1.75), hideMat);
    snout.position.set(0, 0.68, 1.05);
    snout.castShadow = true;
    head.add(neck, snout);
    addStandardEyePair(head, 0.28, 0.86, 0.88, 0.07, eyeGlowMat);

    jaw = new THREE.Group();
    jaw.position.set(0, 0.42, 0.45);
    const lJaw = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.2, 1.55), bellyMat);
    lJaw.position.set(0, -0.04, 0.72);
    jaw.add(lJaw);
    head.add(jaw);
    body.add(head);

    tail.position.set(0, 0.14, -1.52);
    const tailMesh = new THREE.Mesh(new THREE.ConeGeometry(0.55, 3.9, 8), hideMat);
    tailMesh.rotation.x = -Math.PI / 2;
    tailMesh.position.z = -1.85;
    tail.add(tailMesh);
    body.add(tail);

    [-1, 1].forEach((side) => {
      const leg = new THREE.Group();
      leg.position.set(side * 0.66, -0.45, -0.15);
      const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.46, 1.15, 0.66), hideMat);
      thigh.position.y = -0.5;
      const shin = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.96, 0.34), hideMat);
      shin.position.set(0, -1.35, -0.08);
      leg.add(thigh, shin);
      body.add(leg);
      legs.push(leg);
    });
  } else if (species === 'ankylosaurus') {
    const shellMat = new THREE.MeshStandardMaterial({ color: 0x57534e, roughness: 0.88 });
    const spikeMat = new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.55 });
    shadowRadius = 1.65;

    body.position.y = 0.98;
    root.add(body);

    const carapace = new THREE.Mesh(new THREE.SphereGeometry(1.18, 10, 8), shellMat);
    carapace.scale.set(1.15, 0.56, 1.48);
    carapace.castShadow = true;
    body.add(carapace);

    // Lateral & dorsal armor spikes
    for (let k = -2; k <= 2; k++) {
      [-1, 1].forEach((side) => {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.42, 5), spikeMat);
        spike.rotation.z = side * -Math.PI / 2.2;
        spike.position.set(side * 1.25, 0.02, k * 0.5);
        body.add(spike);
      });
    }

    head.position.set(0, 0.06, 1.68);
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.5, 0.88), shellMat);
    skull.castShadow = true;
    head.add(skull);
    [-1, 1].forEach((side) => {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.38, 5), spikeMat);
      horn.rotation.x = -0.3;
      horn.rotation.z = side * -0.6;
      horn.position.set(side * 0.42, 0.14, -0.18);
      head.add(horn);
    });
    addStandardEyePair(head, 0.38, 0.12, 0.22, 0.045, darkEyeMat);
    body.add(head);

    tail.position.set(0, 0.02, -1.65);
    const tailShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 1.95, 7), shellMat);
    tailShaft.rotation.x = Math.PI / 2;
    tailShaft.position.z = -0.95;
    const club = new THREE.Mesh(new THREE.DodecahedronGeometry(0.42, 0), spikeMat);
    club.scale.set(1.3, 0.85, 1.15);
    club.position.z = -1.95;
    tail.add(tailShaft, club);
    body.add(tail);

    make4Legs(
      body,
      legs,
      [
        [-0.78, -0.25, 0.85],
        [0.78, -0.25, 0.85],
        [-0.78, -0.25, -0.85],
        [0.78, -0.25, -0.85],
      ],
      0.22,
      0.2,
      0.72,
      shellMat,
    );
  } else if (species === 'allosaurus') {
    const hideMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.78 });
    const crestMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.65 });
    const bellyMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.8 });
    eyeGlowMat = new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.32 });
    shadowRadius = 1.9;

    body.position.y = 2.15;
    root.add(body);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(1.22, 1.32, 2.35), hideMat);
    torso.castShadow = true;
    body.add(torso);

    head.position.set(0, 0.56, 1.25);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.48, 0.98, 8), hideMat);
    neck.rotation.x = Math.PI / 5;
    neck.position.set(0, 0.25, 0.18);
    const upperJaw = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.52, 1.32), hideMat);
    upperJaw.position.set(0, 0.65, 0.82);
    upperJaw.castShadow = true;
    head.add(neck, upperJaw);
    [-1, 1].forEach((side) => {
      const browHorn = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.28, 5), crestMat);
      browHorn.rotation.x = 0.25;
      browHorn.position.set(side * 0.26, 0.98, 0.72);
      head.add(browHorn);
    });
    addStandardEyePair(head, 0.34, 0.8, 0.96, 0.068, eyeGlowMat);

    jaw = new THREE.Group();
    jaw.position.set(0, 0.4, 0.42);
    const lowerJaw = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.22, 1.12), bellyMat);
    lowerJaw.position.set(0, -0.05, 0.48);
    jaw.add(lowerJaw);
    head.add(jaw);
    body.add(head);

    tail.position.set(0, 0.14, -1.18);
    const tMesh = new THREE.Mesh(new THREE.ConeGeometry(0.46, 3.1, 8), hideMat);
    tMesh.rotation.x = -Math.PI / 2;
    tMesh.position.z = -1.5;
    tail.add(tMesh);
    body.add(tail);

    [-1, 1].forEach((side) => {
      const leg = new THREE.Group();
      leg.position.set(side * 0.56, -0.4, -0.18);
      const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.98, 0.56), hideMat);
      thigh.position.y = -0.44;
      const shin = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.88, 0.3), hideMat);
      shin.position.set(0, -1.2, -0.06);
      leg.add(thigh, shin);
      body.add(leg);
      legs.push(leg);
    });
  } else if (species === 'dilophosaurus') {
    const scaleMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.74 });
    const frillMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.65 });
    const crestMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.62 });
    eyeGlowMat = new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.35 });
    shadowRadius = 1.05;

    body.position.y = 1.25;
    root.add(body);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.66, 1.48), scaleMat);
    torso.castShadow = true;
    body.add(torso);

    head.position.set(0, 0.4, 0.76);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.62, 7), scaleMat);
    neck.rotation.x = 0.45;
    neck.position.set(0, 0.24, 0.16);
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.82), scaleMat);
    snout.position.set(0, 0.48, 0.46);
    // Neck frill collar
    const frill = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.05, 10), frillMat);
    frill.rotation.x = Math.PI / 2.2;
    frill.position.set(0, 0.36, 0.18);
    // Twin cranial crests
    [-0.08, 0.08].forEach((cx) => {
      const crest = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.24, 0.56), crestMat);
      crest.position.set(cx, 0.72, 0.42);
      head.add(crest);
    });
    head.add(neck, snout, frill);
    addStandardEyePair(head, 0.15, 0.56, 0.52, 0.045, eyeGlowMat);

    jaw = new THREE.Group();
    jaw.position.set(0, 0.32, 0.26);
    const lJaw = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.12, 0.65), scaleMat);
    lJaw.position.z = 0.28;
    jaw.add(lJaw);
    head.add(jaw);
    body.add(head);

    tail.position.set(0, 0.1, -0.74);
    const tMesh = new THREE.Mesh(new THREE.ConeGeometry(0.2, 2.2, 7), scaleMat);
    tMesh.rotation.x = -Math.PI / 2;
    tMesh.position.z = -1.05;
    tail.add(tMesh);
    body.add(tail);

    [-1, 1].forEach((side) => {
      const leg = new THREE.Group();
      leg.position.set(side * 0.3, -0.22, -0.1);
      const limb = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.96, 0.26), scaleMat);
      limb.position.y = -0.5;
      leg.add(limb);
      body.add(leg);
      legs.push(leg);
    });
  } else if (species === 'diplodocus') {
    const skinMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.84 });
    const ridgeMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.78 });
    shadowRadius = 2.9;

    body.position.y = 2.65;
    root.add(body);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(1.95, 1.85, 3.85), skinMat);
    torso.castShadow = true;
    body.add(torso);

    head.position.set(0, 0.65, 1.85);
    const longNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.58, 6.4, 10), skinMat);
    longNeck.rotation.x = Math.PI / 2.6;
    longNeck.position.set(0, 1.35, 2.75);
    longNeck.castShadow = true;
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.44, 0.95), ridgeMat);
    skull.position.set(0, 2.65, 5.7);
    head.add(longNeck, skull);
    addStandardEyePair(head, 0.25, 2.75, 5.8, 0.055, darkEyeMat);
    body.add(head);

    tail.position.set(0, 0.25, -1.9);
    const whipTail = new THREE.Mesh(new THREE.ConeGeometry(0.48, 6.2, 8), skinMat);
    whipTail.rotation.x = -Math.PI / 2;
    whipTail.position.z = -3.0;
    tail.add(whipTail);
    body.add(tail);

    make4Legs(
      body,
      legs,
      [
        [-0.78, -0.55, 1.25],
        [0.78, -0.55, 1.25],
        [-0.78, -0.55, -1.25],
        [0.78, -0.55, -1.25],
      ],
      0.34,
      0.38,
      2.1,
      skinMat,
    );
  } else if (species === 'bee') {
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.52 });
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.65 });
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      roughness: 0.2,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
    });
    const beeEyeMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.3 });
    shadowRadius = 0.25;

    root.add(body);
    const thorax = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.26, 0.42), goldMat);
    thorax.castShadow = true;
    body.add(thorax);
    [-0.1, 0.05].forEach((sz) => {
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.295, 0.27, 0.075), stripeMat);
      band.position.z = sz;
      body.add(band);
    });
    const stinger = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.14, 5), stripeMat);
    stinger.rotation.x = -Math.PI / 2;
    stinger.position.z = -0.26;
    body.add(stinger);

    head.position.set(0, 0.02, 0.24);
    const face = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.21, 0.14), stripeMat);
    head.add(face);
    addStandardEyePair(head, 0.075, 0.02, 0.072, 0.03, beeEyeMat);
    [-1, 1].forEach((side) => {
      const feeler = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, 0.14), stripeMat);
      feeler.position.set(side * 0.06, 0.09, 0.1);
      feeler.rotation.x = -0.35;
      head.add(feeler);
    });
    body.add(head);

    wings = [];
    [-1, 1].forEach((side) => {
      const wing = new THREE.Group();
      wing.position.set(side * 0.12, 0.14, 0.02);
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.02, 0.18), wingMat);
      blade.position.x = side * 0.16;
      wing.add(blade);
      body.add(wing);
      wings!.push(wing);
    });

    tail.position.set(0, 0, -0.21);
    body.add(tail);
    const shadowDisc = makeContactShadow(shadowRadius);
    shadowDisc.visible = false;
    root.add(shadowDisc);
    return { root, body, head, jaw, tail, legs, wings, shadowDisc };
  } else if (species === 'creaking') {
    const paleBarkMat = new THREE.MeshStandardMaterial({ color: 0x626764, roughness: 0.94 });
    const darkCreviceMat = new THREE.MeshStandardMaterial({ color: 0x333735, roughness: 0.96 });
    const heartCoreMat = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0xea580c,
      emissiveIntensity: 1.3,
      roughness: 0.3,
    });
    eyeGlowMat = new THREE.MeshBasicMaterial({ color: 0xfb923c, transparent: true, opacity: 0.95 });
    shadowRadius = 0.65;

    body.position.y = 1.48;
    root.add(body);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 1.05, 0.36), paleBarkMat);
    torso.castShadow = true;
    const hollowChest = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.56, 0.39), darkCreviceMat);
    hollowChest.position.y = 0.04;
    const resinHeart = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.41), heartCoreMat);
    resinHeart.position.y = 0.04;
    const shoulderKnob = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.22, 0.4), paleBarkMat);
    shoulderKnob.position.set(0.06, 0.44, 0);
    shoulderKnob.rotation.z = 0.12;
    body.add(torso, hollowChest, resinHeart, shoulderKnob);

    head.position.set(0.04, 0.72, 0.04);
    const mask = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.54, 0.38), paleBarkMat);
    mask.castShadow = true;
    const crownBough = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.28, 0.16), darkCreviceMat);
    crownBough.position.set(-0.14, 0.36, -0.04);
    crownBough.rotation.z = 0.25;
    head.add(mask, crownBough);
    // 3 asymmetrical glowing orange resin eyes
    [
      [-0.1, 0.08, 0.195, 0.045],
      [0.11, 0.12, 0.195, 0.04],
      [0.06, -0.02, 0.195, 0.036],
    ].forEach(([ex, ey, ez, er]) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(er, 6, 6), eyeGlowMat!);
      eye.position.set(ex, ey, ez);
      head.add(eye);
    });
    body.add(head);

    // Crooked hanging wooden arms
    [-1, 1].forEach((side) => {
      const arm = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, side < 0 ? 1.25 : 1.08, 0.18),
        paleBarkMat,
      );
      arm.position.set(side * 0.44, side < 0 ? -0.08 : 0.04, 0.08);
      arm.rotation.x = -0.22;
      arm.castShadow = true;
      body.add(arm);
    });

    tail.position.set(0, -0.4, -0.18);
    body.add(tail);

    [-1, 1].forEach((side) => {
      const leg = new THREE.Group();
      leg.position.set(side * 0.18, -0.48, 0);
      const limb = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.0, 0.24), darkCreviceMat);
      limb.position.y = -0.5;
      limb.castShadow = true;
      leg.add(limb);
      body.add(leg);
      legs.push(leg);
    });
  } else if (species === 'white_fox') {
    const snowFurMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.78 });
    const slateTipMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.72 });
    shadowRadius = 0.42;

    body.position.y = 0.44;
    root.add(body);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.34, 0.78), snowFurMat);
    torso.castShadow = true;
    const chestFluff = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.28, 0.26), snowFurMat);
    chestFluff.position.set(0, -0.02, 0.26);
    body.add(torso, chestFluff);

    head.position.set(0, 0.14, 0.44);
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.26, 0.3), snowFurMat);
    const snout = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.24, 6), snowFurMat);
    snout.rotation.x = Math.PI / 2;
    snout.position.set(0, -0.04, 0.22);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), slateTipMat);
    nose.position.set(0, -0.04, 0.34);
    [-1, 1].forEach((side) => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 4), slateTipMat);
      ear.position.set(side * 0.1, 0.18, -0.04);
      head.add(ear);
    });
    head.add(skull, snout, nose);
    addStandardEyePair(head, 0.085, 0.04, 0.15, 0.026, darkEyeMat);
    body.add(head);

    tail.position.set(0, 0.04, -0.4);
    const brush = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.44, 5, 8), snowFurMat);
    brush.rotation.x = Math.PI / 2.6;
    brush.position.set(0, 0.06, -0.26);
    tail.add(brush);
    body.add(tail);

    make4Legs(
      body,
      legs,
      [
        [-0.12, -0.14, 0.26],
        [0.12, -0.14, 0.26],
        [-0.12, -0.14, -0.26],
        [0.12, -0.14, -0.26],
      ],
      0.075,
      0.08,
      0.34,
      slateTipMat,
    );
  } else if (species === 'parrot') {
    const scarletMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.56 });
    const cobaltMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.58 });
    const goldAccentMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.55 });
    const beakMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.5 });
    shadowRadius = 0.28;

    root.add(body);
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.32, 6, 8), scarletMat);
    torso.rotation.x = Math.PI / 2.2;
    torso.castShadow = true;
    body.add(torso);

    head.position.set(0, 0.12, 0.22);
    const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), scarletMat);
    const crest = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 5), goldAccentMat);
    crest.rotation.x = -0.7;
    crest.position.set(0, 0.14, -0.04);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.14, 5), beakMat);
    beak.rotation.x = Math.PI / 1.75;
    beak.position.set(0, -0.02, 0.14);
    head.add(cranium, crest, beak);
    addStandardEyePair(head, 0.08, 0.03, 0.07, 0.022, darkEyeMat);
    body.add(head);

    wings = [];
    [-1, 1].forEach((side) => {
      const wing = new THREE.Group();
      wing.position.set(side * 0.12, 0.05, 0.02);
      const shoulder = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.035, 0.2), goldAccentMat);
      shoulder.position.x = side * 0.12;
      const primary = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.028, 0.18), cobaltMat);
      primary.position.set(side * 0.36, 0, -0.02);
      wing.add(shoulder, primary);
      body.add(wing);
      wings!.push(wing);
    });

    tail.position.set(0, -0.04, -0.22);
    const tailFeather = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.42), cobaltMat);
    tailFeather.position.z = -0.2;
    tail.add(tailFeather);
    body.add(tail);

    const shadowDisc = makeContactShadow(shadowRadius);
    shadowDisc.visible = false;
    root.add(shadowDisc);
    return { root, body, head, jaw, tail, legs, wings, shadowDisc };
  } else if (species === 'ocelot') {
    const coatTex = makePatternTexture((ctx, s) => {
      ctx.fillStyle = '#eab308';
      ctx.fillRect(0, 0, s, s);
      ctx.fillStyle = '#78350f';
      for (let i = 0; i < 22; i++) {
        const x = ((i * 37) % (s - 16)) + 8;
        const y = ((i * 53) % (s - 16)) + 8;
        ctx.beginPath();
        ctx.arc(x, y, 5 + (i % 3) * 2, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    const coatMat = new THREE.MeshStandardMaterial({ map: coatTex, roughness: 0.72 });
    const creamMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.75 });
    const greenEyeMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.35 });
    shadowRadius = 0.46;

    body.position.y = 0.56;
    root.add(body);
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.21, 0.66, 6, 10), coatMat);
    torso.rotation.x = Math.PI / 2;
    torso.castShadow = true;
    body.add(torso);

    head.position.set(0, 0.14, 0.52);
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.25, 0.28), coatMat);
    const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.11, 0.12), creamMat);
    muzzle.position.set(0, -0.05, 0.16);
    [-1, 1].forEach((side) => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.13, 4), coatMat);
      ear.position.set(side * 0.1, 0.16, -0.02);
      head.add(ear);
    });
    head.add(skull, muzzle);
    addStandardEyePair(head, 0.075, 0.04, 0.14, 0.026, greenEyeMat);
    body.add(head);

    tail.position.set(0, 0.06, -0.46);
    const tMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.65, 4, 6), coatMat);
    tMesh.rotation.x = Math.PI / 2.6;
    tMesh.position.set(0, 0.08, -0.34);
    tail.add(tMesh);
    body.add(tail);

    make4Legs(
      body,
      legs,
      [
        [-0.14, -0.14, 0.28],
        [0.14, -0.14, 0.28],
        [-0.14, -0.14, -0.28],
        [0.14, -0.14, -0.28],
      ],
      0.07,
      0.075,
      0.44,
      coatMat,
    );
  } else if (species === 'panda') {
    const whiteFurMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.82 });
    const charcoalMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.8 });
    shadowRadius = 0.78;

    body.position.y = 0.82;
    root.add(body);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.74, 1.15), whiteFurMat);
    torso.castShadow = true;
    const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.76, 0.34), charcoalMat);
    saddle.position.z = 0.26;
    body.add(torso, saddle);

    head.position.set(0, 0.2, 0.68);
    const cranium = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.56, 0.54), whiteFurMat);
    cranium.castShadow = true;
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.2, 0.16), whiteFurMat);
    snout.position.set(0, -0.12, 0.3);
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.06), charcoalMat);
    nose.position.set(0, -0.06, 0.38);
    [-1, 1].forEach((side) => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.12, 7, 7), charcoalMat);
      ear.position.set(side * 0.26, 0.3, -0.04);
      const patch = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.15, 0.05), charcoalMat);
      patch.position.set(side * 0.15, 0.05, 0.265);
      head.add(ear, patch);
    });
    head.add(cranium, snout, nose);
    addStandardEyePair(head, 0.15, 0.06, 0.295, 0.025, darkEyeMat);
    body.add(head);

    tail.position.set(0, 0.08, -0.6);
    const bob = new THREE.Mesh(new THREE.SphereGeometry(0.11, 6, 6), charcoalMat);
    tail.add(bob);
    body.add(tail);

    make4Legs(
      body,
      legs,
      [
        [-0.28, -0.28, 0.36],
        [0.28, -0.28, 0.36],
        [-0.28, -0.28, -0.36],
        [0.28, -0.28, -0.36],
      ],
      0.16,
      0.16,
      0.56,
      charcoalMat,
    );
  } else if (species === 'vex') {
    const spiritMat = new THREE.MeshStandardMaterial({
      color: 0x7dd3fc,
      emissive: 0x0284c7,
      emissiveIntensity: 0.45,
      transparent: true,
      opacity: 0.86,
      roughness: 0.35,
    });
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.35,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
    });
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.82,
      roughness: 0.24,
    });
    eyeGlowMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
    shadowRadius = 0.26;

    root.add(body);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.42, 0.18), spiritMat);
    torso.castShadow = true;
    body.add(torso);

    head.position.set(0, 0.36, 0);
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.28), spiritMat);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.06, 0.06), wingMat);
    brow.position.set(0, 0.06, 0.15);
    head.add(skull, brow);
    addStandardEyePair(head, 0.075, 0.01, 0.145, 0.032, eyeGlowMat);
    body.add(head);

    // Ghostly winged vex arms & glowing iron sword
    [-1, 1].forEach((side) => {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.34, 0.1), spiritMat);
      arm.position.set(side * 0.2, 0.04, 0.08);
      arm.rotation.x = -0.65;
      body.add(arm);
    });
    const sword = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.48, 0.08), bladeMat);
    sword.position.set(0.22, -0.02, 0.28);
    sword.rotation.x = Math.PI / 3;
    body.add(sword);

    wings = [];
    [-1, 1].forEach((side) => {
      const wing = new THREE.Group();
      wing.position.set(side * 0.12, 0.14, -0.1);
      const membrane = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.36, 0.02), wingMat);
      membrane.position.set(side * 0.28, 0.06, -0.06);
      membrane.rotation.y = side * -0.45;
      wing.add(membrane);
      body.add(wing);
      wings!.push(wing);
    });

    tail.position.set(0, -0.22, -0.04);
    const wisp = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.34, 5), spiritMat);
    wisp.rotation.x = Math.PI;
    wisp.position.y = -0.14;
    tail.add(wisp);
    body.add(tail);

    const shadowDisc = makeContactShadow(shadowRadius);
    shadowDisc.visible = false;
    root.add(shadowDisc);
    return { root, body, head, jaw, tail, legs, wings, eyeGlowMat, shadowDisc };
  } else if (species === 'evoker') {
    const robeMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.78 });
    const goldTrimMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xd97706,
      emissiveIntensity: 0.35,
      metalness: 0.68,
      roughness: 0.3,
    });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.72 });
    const emeraldGlowMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    shadowRadius = 0.48;

    body.position.y = 1.08;
    root.add(body);
    const robe = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.92, 0.34), robeMat);
    robe.castShadow = true;
    const goldStall = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.88, 0.37), goldTrimMat);
    const sash = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, 0.38), goldTrimMat);
    sash.position.y = -0.06;
    body.add(robe, goldStall, sash);

    head.position.set(0, 0.66, 0);
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.48, 0.4), skinMat);
    skull.castShadow = true;
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 0.07), robeMat);
    brow.position.set(0, 0.08, 0.21);
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.2, 0.14), skinMat);
    nose.position.set(0, -0.08, 0.24);
    head.add(skull, brow, nose);
    addStandardEyePair(head, 0.11, 0.02, 0.21, 0.032, emeraldGlowMat);
    body.add(head);

    [-1, 1].forEach((side) => {
      const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.56, 0.2), robeMat);
      sleeve.position.set(side * 0.38, 0.1, 0.16);
      sleeve.rotation.x = -0.78;
      sleeve.castShadow = true;
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.085, 7, 7), emeraldGlowMat);
      orb.position.set(side * 0.38, 0.16, 0.44);
      body.add(sleeve, orb);
    });

    tail.position.set(0, -0.35, -0.16);
    body.add(tail);

    [-1, 1].forEach((side) => {
      const leg = new THREE.Group();
      leg.position.set(side * 0.14, -0.46, 0);
      const boot = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.62, 0.24), robeMat);
      boot.position.y = -0.31;
      leg.add(boot);
      body.add(leg);
      legs.push(leg);
    });
  } else if (species === 'pillager') {
    const jacketMat = new THREE.MeshStandardMaterial({ color: 0x3b2f2f, roughness: 0.8 });
    const crimsonMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.72 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.74 });
    const bowWoodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.78 });
    const ironTipMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.75, roughness: 0.3 });
    shadowRadius = 0.48;

    body.position.y = 1.06;
    root.add(body);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.84, 0.34), jacketMat);
    torso.castShadow = true;
    const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.52, 0.36), crimsonMat);
    chestPlate.position.y = 0.08;
    body.add(torso, chestPlate);

    head.position.set(0, 0.64, 0);
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.46, 0.4), skinMat);
    skull.castShadow = true;
    const helmBand = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.1, 0.42), jacketMat);
    helmBand.position.y = 0.12;
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.2, 0.14), skinMat);
    nose.position.set(0, -0.07, 0.24);
    head.add(skull, helmBand, nose);
    addStandardEyePair(head, 0.11, 0.02, 0.21, 0.032, darkEyeMat);
    body.add(head);

    [-1, 1].forEach((side) => {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.56, 0.18), jacketMat);
      arm.position.set(side * 0.36, 0.14, 0.18);
      arm.rotation.x = -1.1;
      arm.castShadow = true;
      body.add(arm);
    });
    // Aimed Pillager Crossbow
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.56), bowWoodMat);
    stock.position.set(0.14, 0.22, 0.46);
    const prod = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.08, 0.1), bowWoodMat);
    prod.position.set(0.14, 0.22, 0.68);
    const bolt = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.42), ironTipMat);
    bolt.position.set(0.14, 0.26, 0.58);
    body.add(stock, prod, bolt);

    tail.position.set(0, -0.32, -0.16);
    body.add(tail);

    [-1, 1].forEach((side) => {
      const leg = new THREE.Group();
      leg.position.set(side * 0.14, -0.44, 0);
      const limb = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.62, 0.22), jacketMat);
      limb.position.y = -0.31;
      leg.add(limb);
      body.add(leg);
      legs.push(leg);
    });
  } else if (species === 'witch') {
    const cloakMat = new THREE.MeshStandardMaterial({ color: 0x581c87, roughness: 0.78 });
    const hatMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85 });
    const beltMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x15803d, emissiveIntensity: 0.45 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xa1a1aa, roughness: 0.72 });
    const potionMat = new THREE.MeshStandardMaterial({
      color: 0xd946ef,
      emissive: 0xa21caf,
      emissiveIntensity: 0.85,
      roughness: 0.25,
    });
    shadowRadius = 0.48;

    body.position.y = 1.06;
    root.add(body);
    const robe = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.9, 0.36), cloakMat);
    robe.castShadow = true;
    body.add(robe);

    head.position.set(0, 0.64, 0);
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.44, 0.38), skinMat);
    skull.castShadow = true;
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.2, 0.14), skinMat);
    nose.position.set(0, -0.06, 0.23);
    const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.46, 0.06, 8), hatMat);
    hatBrim.position.y = 0.22;
    const hatBand = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.25, 0.08, 8), beltMat);
    hatBand.position.y = 0.28;
    const hatCone = new THREE.Mesh(new THREE.ConeGeometry(0.23, 0.56, 7), hatMat);
    hatCone.position.set(0, 0.56, -0.04);
    hatCone.rotation.x = -0.18;
    head.add(skull, nose, hatBrim, hatBand, hatCone);
    addStandardEyePair(head, 0.1, 0.03, 0.2, 0.03, potionMat);
    body.add(head);

    [-1, 1].forEach((side) => {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.52, 0.17), cloakMat);
      arm.position.set(side * 0.35, 0.14, 0.14);
      arm.rotation.x = -0.65;
      body.add(arm);
    });
    const flask = new THREE.Mesh(new THREE.SphereGeometry(0.11, 7, 7), potionMat);
    flask.position.set(0.36, 0.05, 0.34);
    body.add(flask);

    tail.position.set(0, -0.34, -0.16);
    body.add(tail);

    [-1, 1].forEach((side) => {
      const leg = new THREE.Group();
      leg.position.set(side * 0.14, -0.45, 0);
      const boot = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, 0.22), hatMat);
      boot.position.y = -0.3;
      leg.add(boot);
      body.add(leg);
      legs.push(leg);
    });
  } else {
    // Pteranodon — crested soaring pterosaur with broad leathery wings
    const hideMat = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.72 });
    const membraneMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.76,
      side: THREE.DoubleSide,
    });
    const beakMat = new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.58 });
    shadowRadius = 0.85;

    root.add(body);
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.65, 6, 8), hideMat);
    torso.rotation.x = Math.PI / 2;
    torso.castShadow = true;
    body.add(torso);

    head.position.set(0, 0.14, 0.44);
    const cranium = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.34), hideMat);
    const crest = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.78, 5), hideMat);
    crest.rotation.x = -Math.PI / 2.2;
    crest.position.set(0, 0.18, -0.34);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.74, 5), beakMat);
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, -0.02, 0.44);
    head.add(cranium, crest, beak);
    addStandardEyePair(head, 0.11, 0.04, 0.1, 0.03, darkEyeMat);
    body.add(head);

    wings = [];
    [-1, 1].forEach((side) => {
      const wing = new THREE.Group();
      wing.position.set(side * 0.2, 0.08, 0.08);
      const spar = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.06, 0.1), hideMat);
      spar.position.x = side * 0.88;
      const membrane = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.025, 0.62), membraneMat);
      membrane.position.set(side * 0.86, -0.01, -0.26);
      wing.add(spar, membrane);
      body.add(wing);
      wings!.push(wing);
    });

    tail.position.set(0, 0.04, -0.4);
    const tailStub = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.28, 5), hideMat);
    tailStub.rotation.x = -Math.PI / 2;
    tail.add(tailStub);
    body.add(tail);

    const shadowDisc = makeContactShadow(shadowRadius);
    shadowDisc.visible = false;
    root.add(shadowDisc);
    return { root, body, head, jaw, tail, legs, wings, shadowDisc };
  }

  root.add(makeContactShadow(shadowRadius));
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
