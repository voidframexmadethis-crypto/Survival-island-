import * as THREE from 'three';
import type { PlayerGender } from '@/game/types';

export interface PirateCinematicAudioCallbacks {
  onCannonBoom: () => void;
  onHullCrack: () => void;
  onWaterSeep: () => void;
  onPlayerSplash: () => void;
  onShipBreakup: () => void;
  onThunder: () => void;
}

export interface PirateCinematicFrameOutput {
  finished: boolean;
  subtitle: string;
  crewShout: string;
  shipWorldX: number;
  shipWorldZ: number;
  cameraShake: number;
}

interface HumanoidRig {
  root: THREE.Group;
  head: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
}

interface ScramblerActor {
  rig: HumanoidRig;
  baseX: number;
  baseY: number;
  baseZ: number;
  phase: number;
  speed: number;
  rangeX: number;
  rangeZ: number;
}

interface CannonFlashEntry {
  barrel: THREE.Mesh;
  baseX: number;
  side: number;
  flash: THREE.Mesh;
  smoke: THREE.Mesh;
  fireTimes: number[];
}

interface MastAssembly {
  group: THREE.Group;
  basePos: THREE.Vector3;
  snapDelay: number;
  fallDirX: number;
  fallDirZ: number;
}

interface FloatingWoodDebris {
  mesh: THREE.Mesh;
  startLocal: THREE.Vector3;
  spreadX: number;
  spreadZ: number;
  rotY: number;
  bobPhase: number;
}

interface FlatWaterSail {
  mesh: THREE.Mesh;
  spreadX: number;
  spreadZ: number;
  underwaterYOffset: number;
  rotY: number;
  bobPhase: number;
}

// The opening was a 19-second slow burn. The same staged beats now play in
// 12 seconds so players reach the island quickly while every ship, crew,
// breakup and splash cue still has time to read.
export const PIRATE_CINEMATIC_DURATION = 12.0;
const CINEMATIC_TIMELINE_DURATION = 19.0;
const CINEMATIC_TIME_SCALE = CINEMATIC_TIMELINE_DURATION / PIRATE_CINEMATIC_DURATION;

const _tmpVec = new THREE.Vector3();
const _tmpNavVec = new THREE.Vector3();

export interface ShipNavigatorNpcHandle {
  root: THREE.Group;
  head: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  gunMesh: THREE.Group;
  gunFlash: THREE.Mesh;
  axeMesh: THREE.Group;
  mapMesh: THREE.Mesh;
  backpackMesh: THREE.Group;
}

export function buildShipNavigatorNpcModel(
  gender: PlayerGender = 'girl',
): ShipNavigatorNpcHandle {
  const isFemale = gender === 'girl';
  const rig = buildHumanoidRig({
    skinColor: isFemale ? 0xe6b491 : 0xdca57c,
    shirtColor: 0x0f766e,
    pantsColor: 0x1e293b,
    bootColor: 0x2a1b12,
    hairColor: isFemale ? 0x451a03 : 0x26170d,
    isFemale,
    hasCoat: true,
    coatColor: 0x1e3a5f,
    scale: isFemale ? 1.04 : 1.08,
  });

  // Companion's own 3D Survival Backpack strapped to the back!
  const backpackMesh = new THREE.Group();
  const packMat = new THREE.MeshStandardMaterial({
    color: 0x5c3d24,
    roughness: 0.85,
    metalness: 0.06,
  });
  const strapMat = new THREE.MeshStandardMaterial({
    color: 0x2b1b10,
    roughness: 0.72,
  });
  const bedrollMat = new THREE.MeshStandardMaterial({
    color: 0xb45309,
    roughness: 0.9,
  });
  const packBody = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.44, 0.2), packMat);
  packBody.position.set(0, 1.08, -0.22);
  packBody.castShadow = true;
  const packFlap = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.22), strapMat);
  packFlap.position.set(0, 1.28, -0.22);
  const bedroll = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.4, 8), bedrollMat);
  bedroll.rotation.z = Math.PI / 2;
  bedroll.position.set(0, 1.38, -0.22);
  const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.08), packMat);
  pocket.position.set(0, 0.98, -0.34);
  backpackMesh.add(packBody, packFlap, bedroll, pocket);
  rig.root.add(backpackMesh);

  // Companion's own 3D Survival Rifle / Gun (attached to right hand)
  const gunMesh = new THREE.Group();
  const gunMetalMat = new THREE.MeshStandardMaterial({
    color: 0x1f2937,
    roughness: 0.34,
    metalness: 0.86,
  });
  const gunWoodMat = new THREE.MeshStandardMaterial({
    color: 0x6b3e1e,
    roughness: 0.76,
  });
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.1, 0.34), gunWoodMat);
  stock.position.set(0, 0, -0.1);
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.28), gunMetalMat);
  receiver.position.set(0, 0.02, 0.16);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.028, 0.56, 7), gunMetalMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.035, 0.54);
  const gunFlash = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 7, 6),
    new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.92 }),
  );
  gunFlash.position.set(0, 0.035, 0.88);
  gunFlash.visible = false;
  gunMesh.add(stock, receiver, barrel, gunFlash);
  gunMesh.position.set(0.02, -0.46, 0.12);
  gunMesh.rotation.x = Math.PI * 0.48;
  rig.rightArm.add(gunMesh);

  // Companion's own 3D Woodcutting Axe (attached to right hand, shown while chopping trees)
  const axeMesh = new THREE.Group();
  const axeHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.028, 0.82, 6), gunWoodMat);
  axeHandle.position.set(0, -0.15, 0.25);
  axeHandle.rotation.x = Math.PI * 0.45;
  const axeBlade = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.2, 0.24),
    new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.25, metalness: 0.88 }),
  );
  axeBlade.position.set(0, -0.22, 0.62);
  axeMesh.add(axeHandle, axeBlade);
  axeMesh.position.set(0.02, -0.42, 0.05);
  axeMesh.visible = false;
  rig.rightArm.add(axeMesh);

  // Rolled nautical map tucked in left hand
  const mapMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.045, 0.42, 8),
    new THREE.MeshStandardMaterial({ color: 0xe7d3a7, roughness: 0.88 }),
  );
  mapMesh.rotation.x = Math.PI * 0.45;
  mapMesh.position.set(0, -0.46, 0.14);
  rig.leftArm.add(mapMesh);

  return {
    root: rig.root,
    head: rig.head,
    leftArm: rig.leftArm,
    rightArm: rig.rightArm,
    leftLeg: rig.leftLeg,
    rightLeg: rig.rightLeg,
    gunMesh,
    gunFlash,
    axeMesh,
    mapMesh,
    backpackMesh,
  };
}

function buildHumanoidRig(opts: {
  skinColor: number;
  shirtColor: number;
  pantsColor: number;
  bootColor: number;
  hairColor: number;
  isFemale?: boolean;
  hasCoat?: boolean;
  coatColor?: number;
  hasTricornHat?: boolean;
  hasBandana?: boolean;
  bandanaColor?: number;
  hasBeard?: boolean;
  scale?: number;
}): HumanoidRig {
  const root = new THREE.Group();
  const s = opts.scale ?? 1.0;
  root.scale.setScalar(s);

  const skinMat = new THREE.MeshStandardMaterial({
    color: opts.skinColor,
    roughness: 0.72,
    metalness: 0.02,
  });
  const shirtMat = new THREE.MeshStandardMaterial({
    color: opts.shirtColor,
    roughness: 0.85,
    metalness: 0.04,
  });
  const pantsMat = new THREE.MeshStandardMaterial({
    color: opts.pantsColor,
    roughness: 0.88,
    metalness: 0.03,
  });
  const bootMat = new THREE.MeshStandardMaterial({
    color: opts.bootColor,
    roughness: 0.65,
    metalness: 0.12,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: opts.hairColor,
    roughness: 0.78,
    metalness: 0.05,
  });
  const beltMat = new THREE.MeshStandardMaterial({
    color: 0x3b2412,
    roughness: 0.55,
    metalness: 0.18,
  });
  const buckleMat = new THREE.MeshStandardMaterial({
    color: 0xe6b84c,
    roughness: 0.25,
    metalness: 0.82,
  });

  // Torso + belt
  const torsoWidth = opts.isFemale ? 0.36 : 0.44;
  const torsoDepth = opts.isFemale ? 0.22 : 0.25;
  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(torsoWidth, 0.58, torsoDepth),
    shirtMat,
  );
  torso.position.y = 1.06;
  torso.castShadow = true;
  root.add(torso);

  const belt = new THREE.Mesh(
    new THREE.BoxGeometry(torsoWidth + 0.03, 0.09, torsoDepth + 0.03),
    beltMat,
  );
  belt.position.y = 0.81;
  root.add(belt);

  const buckle = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.08, 0.04),
    buckleMat,
  );
  buckle.position.set(0, 0.81, torsoDepth * 0.5 + 0.015);
  root.add(buckle);

  if (opts.hasCoat) {
    const coatMat = new THREE.MeshStandardMaterial({
      color: opts.coatColor ?? 0x1e1824,
      roughness: 0.76,
      metalness: 0.08,
    });
    const coatBack = new THREE.Mesh(
      new THREE.BoxGeometry(torsoWidth + 0.08, 0.72, 0.14),
      coatMat,
    );
    coatBack.position.set(0, 0.92, -0.09);
    root.add(coatBack);

    // Gold epaulets for captain
    [-1, 1].forEach((side) => {
      const ep = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.06, 0.18),
        buckleMat,
      );
      ep.position.set(side * (torsoWidth * 0.5 + 0.02), 1.35, 0);
      root.add(ep);
    });
  }

  // Head group
  const head = new THREE.Group();
  head.position.set(0, 1.48, 0);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), skinMat);
  skull.castShadow = true;
  head.add(skull);

  // Eyes
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3 });
  [-0.06, 0.06].forEach((ex) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.024, 6, 6), eyeMat);
    eye.position.set(ex, 0.02, 0.16);
    head.add(eye);
  });

  // Hair / Hat
  if (opts.isFemale) {
    const hairCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.195, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.62),
      hairMat,
    );
    hairCap.position.y = 0.02;
    head.add(hairCap);
    // Flowing long hair / ponytail
    const ponytail = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.44, 7),
      hairMat,
    );
    ponytail.position.set(0, -0.14, -0.17);
    ponytail.rotation.x = 0.38;
    head.add(ponytail);
    const sideLockL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.28, 0.12), hairMat);
    sideLockL.position.set(-0.16, -0.08, -0.02);
    const sideLockR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.28, 0.12), hairMat);
    sideLockR.position.set(0.16, -0.08, -0.02);
    head.add(sideLockL, sideLockR);
  } else {
    const hairCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.19, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.52),
      hairMat,
    );
    hairCap.position.y = 0.03;
    head.add(hairCap);
  }

  if (opts.hasBeard) {
    const beard = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.24, 7), hairMat);
    beard.rotation.x = Math.PI;
    beard.position.set(0, -0.14, 0.08);
    head.add(beard);
  }

  if (opts.hasTricornHat) {
    const hatMat = new THREE.MeshStandardMaterial({
      color: 0x161419,
      roughness: 0.72,
      metalness: 0.08,
    });
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.38, 0.06, 3), hatMat);
    brim.position.set(0, 0.16, 0.02);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.18, 8), hatMat);
    crown.position.set(0, 0.24, 0);
    const goldTrim = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.022, 5, 10), buckleMat);
    goldTrim.rotation.x = Math.PI / 2;
    goldTrim.position.set(0, 0.19, 0);
    const plume = new THREE.Mesh(
      new THREE.ConeGeometry(0.06, 0.34, 6),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.8 }),
    );
    plume.position.set(-0.14, 0.34, -0.06);
    plume.rotation.z = 0.45;
    head.add(brim, crown, goldTrim, plume);
  } else if (opts.hasBandana) {
    const bandMat = new THREE.MeshStandardMaterial({
      color: opts.bandanaColor ?? 0xb91c1c,
      roughness: 0.82,
    });
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.195, 0.195, 0.09, 10), bandMat);
    band.position.y = 0.08;
    const knot = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.22, 5), bandMat);
    knot.position.set(0, 0.04, -0.22);
    knot.rotation.x = -1.1;
    head.add(band, knot);
  }

  root.add(head);

  // Arms pivoted at shoulders
  const makeArm = (side: -1 | 1) => {
    const armGroup = new THREE.Group();
    armGroup.position.set(side * (torsoWidth * 0.5 + 0.08), 1.3, 0);
    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.46, 0.13), shirtMat);
    upper.position.y = -0.22;
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.065, 6, 6), skinMat);
    hand.position.y = -0.47;
    armGroup.add(upper, hand);
    root.add(armGroup);
    return armGroup;
  };
  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);

  // Legs pivoted at hips
  const makeLeg = (side: -1 | 1) => {
    const legGroup = new THREE.Group();
    legGroup.position.set(side * 0.11, 0.76, 0);
    const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.48, 0.16), pantsMat);
    thigh.position.y = -0.24;
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.3, 0.22), bootMat);
    boot.position.set(0, -0.61, 0.03);
    legGroup.add(thigh, boot);
    root.add(legGroup);
    return legGroup;
  };
  const leftLeg = makeLeg(-1);
  const rightLeg = makeLeg(1);

  return { root, head, leftArm, rightArm, leftLeg, rightLeg };
}

export class PirateCinematicRig {
  public readonly root = new THREE.Group();

  private readonly shipRoot = new THREE.Group();
  private readonly bowHalf = new THREE.Group();
  private readonly sternHalf = new THREE.Group();
  private readonly lowerCrackGroup = new THREE.Group();
  private readonly crackChasm: THREE.Mesh;
  private readonly crackPlanks: THREE.Mesh[] = [];
  private readonly seepStreams: THREE.Mesh[] = [];
  private readonly floodWaterPlane: THREE.Mesh;
  private readonly helmWheel: THREE.Group;

  private readonly masts: MastAssembly[] = [];
  private readonly cannons: CannonFlashEntry[] = [];

  // Crew
  private readonly captain: HumanoidRig;
  private readonly mopGuy: HumanoidRig;
  private readonly mopProp: THREE.Group;
  private readonly navigator: HumanoidRig;
  private readonly navigatorTears: THREE.Mesh[] = [];
  private readonly scramblers: ScramblerActor[] = [];

  // Player (boy or girl) — ONLY one who jumps off!
  private readonly playerGroup = new THREE.Group();
  private readonly boyRig: HumanoidRig;
  private readonly girlRig: HumanoidRig;
  private playerGender: PlayerGender = 'boy';

  // Splash & Post-jump breakup debris
  private readonly splashGroup = new THREE.Group();
  private readonly splashRing: THREE.Mesh;
  private readonly splashDroplets: THREE.Mesh[] = [];
  private readonly debrisWorldGroup = new THREE.Group();
  private readonly floatingWoodPieces: FloatingWoodDebris[] = [];
  private readonly flatWaterSails: FlatWaterSail[] = [];

  private firedEvents = new Set<string>();
  private shipPosX = -34;
  private shipPosZ = 846;

  constructor() {
    this.root.visible = false;
    this.root.add(this.shipRoot);
    this.shipRoot.add(this.bowHalf, this.sternHalf, this.lowerCrackGroup);
    this.root.add(this.playerGroup, this.splashGroup, this.debrisWorldGroup);

    // Shared PBR materials with varied roughness/metalness
    const darkHullMat = new THREE.MeshStandardMaterial({
      color: 0x3b2314,
      roughness: 0.84,
      metalness: 0.06,
    });
    const hullMidMat = new THREE.MeshStandardMaterial({
      color: 0x52311b,
      roughness: 0.82,
      metalness: 0.05,
    });
    const copperBottomMat = new THREE.MeshStandardMaterial({
      color: 0x2c4a3e,
      roughness: 0.58,
      metalness: 0.38,
    });
    const deckMat = new THREE.MeshStandardMaterial({
      color: 0x7a4f2b,
      roughness: 0.86,
      metalness: 0.03,
    });
    const trimGoldMat = new THREE.MeshStandardMaterial({
      color: 0xd9a73a,
      roughness: 0.28,
      metalness: 0.82,
    });
    const ironMat = new THREE.MeshStandardMaterial({
      color: 0x1e2228,
      roughness: 0.36,
      metalness: 0.88,
    });
    const mastMat = new THREE.MeshStandardMaterial({
      color: 0x4a2e19,
      roughness: 0.84,
    });
    const sailMat = new THREE.MeshStandardMaterial({
      color: 0xebe2d0,
      roughness: 0.9,
      side: THREE.DoubleSide,
    });
    const weatheredSailMat = new THREE.MeshStandardMaterial({
      color: 0xd9ccb2,
      roughness: 0.92,
      side: THREE.DoubleSide,
    });
    const blackFlagMat = new THREE.MeshStandardMaterial({
      color: 0x111317,
      roughness: 0.88,
      side: THREE.DoubleSide,
    });
    const skullMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.6,
      side: THREE.DoubleSide,
    });
    const lanternGlowMat = new THREE.MeshStandardMaterial({
      color: 0xffe49e,
      emissive: 0xff9f2e,
      emissiveIntensity: 1.9,
      roughness: 0.25,
    });
    const flashMat = new THREE.MeshBasicMaterial({
      color: 0xffb732,
      transparent: true,
      opacity: 0.92,
    });
    const smokeMat = new THREE.MeshStandardMaterial({
      color: 0x9ca3af,
      roughness: 1.0,
      transparent: true,
      opacity: 0.62,
    });

    const makeBillowingSail = (
      width: number,
      height: number,
      belly: number,
      mat: THREE.Material,
    ) => {
      const geo = new THREE.PlaneGeometry(width, height, 10, 8);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const px = pos.getX(i);
        const py = pos.getY(i);
        const nx = px / (width * 0.5);
        const ny = py / (height * 0.5);
        const curve = Math.cos(nx * Math.PI * 0.45) * Math.cos(ny * Math.PI * 0.48);
        pos.setZ(i, Math.max(0, curve) * belly);
      }
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      return mesh;
    };

    // ------------------------------------------------------------------
    // 1. SPLITTABLE HULL: BOW HALF (z >= 0) & STERN HALF (z <= 0)
    // ------------------------------------------------------------------
    const bowKeel = new THREE.Mesh(new THREE.BoxGeometry(7.2, 2.2, 12.2), copperBottomMat);
    bowKeel.position.set(0, 0.4, 6.1);
    const bowMainHull = new THREE.Mesh(new THREE.BoxGeometry(8.8, 3.6, 12.8), darkHullMat);
    bowMainHull.position.set(0, 2.9, 6.4);
    bowMainHull.castShadow = true;
    const bowCone = new THREE.Mesh(new THREE.ConeGeometry(4.6, 9.0, 4), darkHullMat);
    bowCone.rotation.x = Math.PI / 2;
    bowCone.rotation.y = Math.PI / 4;
    bowCone.scale.set(1.0, 1.0, 0.72);
    bowCone.position.set(0, 2.8, 15.8);
    const forecastle = new THREE.Mesh(new THREE.BoxGeometry(8.2, 1.8, 7.0), hullMidMat);
    forecastle.position.set(0, 5.4, 10.2);
    const bowDeck = new THREE.Mesh(new THREE.BoxGeometry(8.3, 0.35, 12.6), deckMat);
    bowDeck.position.set(0, 4.75, 6.3);
    const bowsprit = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.36, 13.5, 8), mastMat);
    bowsprit.rotation.x = Math.PI / 2 - 0.34;
    bowsprit.position.set(0, 7.6, 19.2);
    const figurehead = new THREE.Mesh(new THREE.ConeGeometry(0.65, 2.2, 6), trimGoldMat);
    figurehead.rotation.x = Math.PI / 2 - 0.35;
    figurehead.position.set(0, 5.1, 16.5);
    this.bowHalf.add(
      bowKeel,
      bowMainHull,
      bowCone,
      forecastle,
      bowDeck,
      bowsprit,
      figurehead,
    );

    const sternKeel = new THREE.Mesh(new THREE.BoxGeometry(7.2, 2.2, 12.2), copperBottomMat);
    sternKeel.position.set(0, 0.4, -6.1);
    const sternMainHull = new THREE.Mesh(new THREE.BoxGeometry(8.8, 3.6, 12.8), darkHullMat);
    sternMainHull.position.set(0, 2.9, -6.4);
    sternMainHull.castShadow = true;
    const sternDeck = new THREE.Mesh(new THREE.BoxGeometry(8.3, 0.35, 12.6), deckMat);
    sternDeck.position.set(0, 4.75, -6.3);
    const quarterDeck = new THREE.Mesh(new THREE.BoxGeometry(8.4, 2.4, 9.2), hullMidMat);
    quarterDeck.position.set(0, 5.9, -8.8);
    const poopDeck = new THREE.Mesh(new THREE.BoxGeometry(7.8, 2.0, 5.8), darkHullMat);
    poopDeck.position.set(0, 8.0, -10.8);
    this.sternHalf.add(sternKeel, sternMainHull, sternDeck, quarterDeck, poopDeck);

    // Gold trim & bulwark rails split across bow & stern
    [-4.46, 4.46].forEach((sideX) => {
      const strakeBow = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 12.8), trimGoldMat);
      strakeBow.position.set(sideX, 4.55, 6.4);
      const railBow = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.15, 8.2), hullMidMat);
      railBow.position.set(sideX * 0.96, 5.35, 4.4);
      this.bowHalf.add(strakeBow, railBow);

      const strakeStern = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 12.8), trimGoldMat);
      strakeStern.position.set(sideX, 4.55, -6.4);
      const railStern = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.15, 8.2), hullMidMat);
      railStern.position.set(sideX * 0.96, 5.35, -3.6);
      this.sternHalf.add(strakeStern, railStern);
    });

    // Stern gallery windows & glowing brass lanterns
    for (let w = -2; w <= 2; w++) {
      const winFrame = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.3, 0.22), trimGoldMat);
      winFrame.position.set(w * 1.35, 7.6, -13.75);
      const winGlass = new THREE.Mesh(new THREE.BoxGeometry(0.82, 1.05, 0.26), lanternGlowMat);
      winGlass.position.set(w * 1.35, 7.6, -13.78);
      this.sternHalf.add(winFrame, winGlass);
    }
    [-2.6, 0, 2.6].forEach((lx) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.4, 6), ironMat);
      post.position.set(lx, 9.5, -13.6);
      const lamp = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), lanternGlowMat);
      lamp.position.set(lx, 10.3, -13.6);
      this.sternHalf.add(post, lamp);
    });

    // Ship's Helm Wheel on Quarterdeck (spins next to the crying Navigator!)
    const helmStand = new THREE.Mesh(new THREE.BoxGeometry(0.48, 1.25, 0.52), hullMidMat);
    helmStand.position.set(0, 7.72, -5.8);
    this.sternHalf.add(helmStand);

    this.helmWheel = new THREE.Group();
    this.helmWheel.position.set(0, 8.35, -5.5);
    const wheelRim = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.08, 6, 14), trimGoldMat);
    this.helmWheel.add(wheelRim);
    for (let sp = 0; sp < 8; sp++) {
      const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.65, 5), mastMat);
      spoke.rotation.z = (sp / 8) * Math.PI;
      this.helmWheel.add(spoke);
    }
    this.sternHalf.add(this.helmWheel);

    // ------------------------------------------------------------------
    // 2. CRACKING LOWER HULL & SEEPING OCEAN WATER (Beat 2 zoom target!)
    // ------------------------------------------------------------------
    const chasmMat = new THREE.MeshBasicMaterial({ color: 0x050b12 });
    this.crackChasm = new THREE.Mesh(new THREE.BoxGeometry(9.02, 2.4, 0.35), chasmMat);
    this.crackChasm.position.set(0, 1.9, 0.0);
    this.crackChasm.scale.set(1, 0.01, 0.01);
    this.lowerCrackGroup.add(this.crackChasm);

    // Splintering wooden crack planks along starboard & port lower hull
    for (let i = 0; i < 10; i++) {
      const side = i < 5 ? 1 : -1;
      const idx = i % 5;
      const plank = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.34, 2.6 + (idx % 2) * 0.7),
        i % 2 === 0 ? darkHullMat : hullMidMat,
      );
      plank.position.set(side * 4.44, 0.9 + idx * 0.55, (idx - 2) * 0.55);
      plank.userData = {
        baseX: side * 4.44,
        baseY: 0.9 + idx * 0.55,
        baseZ: (idx - 2) * 0.55,
        side,
        tiltDir: idx % 2 === 0 ? 1 : -1,
      };
      this.crackPlanks.push(plank);
      this.lowerCrackGroup.add(plank);
    }

    // Seeping / rushing ocean water jets pouring through the lower hull cracks!
    const seepWaterMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0e7490,
      emissiveIntensity: 0.45,
      roughness: 0.15,
      metalness: 0.1,
      transparent: true,
      opacity: 0.82,
    });
    for (let i = 0; i < 12; i++) {
      const jet = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.24, 2.4, 7),
        seepWaterMat,
      );
      const row = i % 4;
      const side = i < 6 ? 1 : -1;
      jet.position.set(side * 4.55, 0.8 + row * 0.48, (i % 3 - 1) * 1.15);
      jet.rotation.z = side * 1.15;
      jet.visible = false;
      jet.userData = {
        baseX: side * 4.55,
        baseY: 0.8 + row * 0.48,
        baseZ: (i % 3 - 1) * 1.15,
        phase: i * 0.7,
        side,
      };
      this.seepStreams.push(jet);
      this.lowerCrackGroup.add(jet);
    }

    // Rising floodwater sloshing on the main deck as the ship sinks
    this.floodWaterPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(7.9, 23.0),
      new THREE.MeshStandardMaterial({
        color: 0x0c4a6e,
        roughness: 0.12,
        metalness: 0.2,
        transparent: true,
        opacity: 0.72,
      }),
    );
    this.floodWaterPlane.rotation.x = -Math.PI / 2;
    this.floodWaterPlane.position.set(0, 4.6, 0);
    this.floodWaterPlane.visible = false;
    this.lowerCrackGroup.add(this.floodWaterPlane);

    // ------------------------------------------------------------------
    // 3. BROADSIDE NAVAL CANNONS WITH BOOMING MUZZLE FLASHES & SMOKE
    // ------------------------------------------------------------------
    const cannonZPositions = [-6.8, -3.8, -1.2, 1.8, 4.6, 7.4];
    [-1, 1].forEach((side) => {
      cannonZPositions.forEach((cz, idx) => {
        const parentHalf = cz >= 0 ? this.bowHalf : this.sternHalf;
        const barrel = new THREE.Mesh(
          new THREE.CylinderGeometry(0.17, 0.26, 2.2, 8),
          ironMat,
        );
        barrel.rotation.z = side * (Math.PI / 2);
        const baseX = side * 4.85;
        barrel.position.set(baseX, 3.45, cz);
        parentHalf.add(barrel);

        const muzzle = new THREE.Mesh(
          new THREE.TorusGeometry(0.2, 0.055, 6, 10),
          ironMat,
        );
        muzzle.rotation.y = Math.PI / 2;
        muzzle.position.set(side * 5.9, 3.45, cz);
        parentHalf.add(muzzle);

        const flash = new THREE.Mesh(new THREE.SphereGeometry(0.85, 8, 6), flashMat);
        flash.position.set(side * 6.5, 3.45, cz);
        flash.visible = false;
        parentHalf.add(flash);

        const smoke = new THREE.Mesh(new THREE.SphereGeometry(1.05, 8, 6), smokeMat);
        smoke.position.set(side * 7.0, 3.65, cz);
        smoke.visible = false;
        parentHalf.add(smoke);

        // Staggered volley fire timestamps during Beats 1 & 2
        const t1 = 0.75 + idx * 0.42 + (side === 1 ? 0.0 : 0.22);
        const t2 = 3.25 + idx * 0.34 + (side === 1 ? 0.15 : 0.0);
        this.cannons.push({
          barrel,
          baseX,
          side,
          flash,
          smoke,
          fireTimes: [t1, t2],
        });
      });
    });

    // ------------------------------------------------------------------
    // 4. THREE SEPARATE BREAKABLE MASTS + BILLOWING SAILS + JOLLY ROGER
    // ------------------------------------------------------------------
    const mastConfigs = [
      { z: 8.4, baseY: 6.1, height: 18.0, yardScale: 0.85, isMain: false, snapDelay: 0.15, fallDirX: 1, fallDirZ: 0.4 },
      { z: -0.4, baseY: 4.8, height: 23.5, yardScale: 1.06, isMain: true, snapDelay: 0.0, fallDirX: -1, fallDirZ: 0.2 },
      { z: -9.4, baseY: 8.9, height: 15.0, yardScale: 0.72, isMain: false, snapDelay: 0.32, fallDirX: 0.8, fallDirZ: -0.6 },
    ];

    mastConfigs.forEach((cfg) => {
      const mGroup = new THREE.Group();
      mGroup.position.set(0, cfg.baseY, cfg.z);

      const mast = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.44, cfg.height, 10),
        mastMat,
      );
      mast.position.set(0, cfg.height * 0.5, 0);
      mast.castShadow = true;
      mGroup.add(mast);

      const nestY = cfg.height * 0.56;
      const nestFloor = new THREE.Mesh(
        new THREE.CylinderGeometry(1.42, 1.12, 0.34, 10),
        hullMidMat,
      );
      nestFloor.position.set(0, nestY, 0);
      mGroup.add(nestFloor);

      const tiers = [
        { yFrac: 0.32, w: 11.8 * cfg.yardScale, h: cfg.height * 0.28, belly: 1.8, mat: sailMat },
        { yFrac: 0.65, w: 9.2 * cfg.yardScale, h: cfg.height * 0.24, belly: 1.5, mat: weatheredSailMat },
      ];
      tiers.forEach((tier) => {
        const yy = cfg.height * tier.yFrac;
        const yard = new THREE.Mesh(
          new THREE.CylinderGeometry(0.11, 0.14, tier.w + 1.2, 8),
          mastMat,
        );
        yard.rotation.z = Math.PI / 2;
        yard.position.set(0, yy + tier.h * 0.48, 0.35);
        const sail = makeBillowingSail(tier.w, tier.h, tier.belly, tier.mat);
        sail.position.set(0, yy, 0.45);
        mGroup.add(yard, sail);
      });

      const flagY = cfg.height - 0.8;
      const flagW = cfg.isMain ? 4.4 : 2.6;
      const flagH = cfg.isMain ? 2.4 : 1.25;
      const flag = makeBillowingSail(flagW, flagH, 0.45, blackFlagMat);
      flag.rotation.y = Math.PI / 2;
      flag.position.set(0, flagY, -flagW * 0.5);
      mGroup.add(flag);

      if (cfg.isMain) {
        const skull = new THREE.Mesh(new THREE.CircleGeometry(0.5, 10), skullMat);
        skull.rotation.y = Math.PI / 2;
        skull.position.set(0.32, flagY + 0.18, -flagW * 0.5);
        mGroup.add(skull);
      }

      this.shipRoot.add(mGroup);
      this.masts.push({
        group: mGroup,
        basePos: new THREE.Vector3(0, cfg.baseY, cfg.z),
        snapDelay: cfg.snapDelay,
        fallDirX: cfg.fallDirX,
        fallDirZ: cfg.fallDirZ,
      });
    });

    // ------------------------------------------------------------------
    // 5. ANIMATED 3D PIRATE CREW ON DECK
    // ------------------------------------------------------------------
    // A. Pirate Captain on Quarterdeck with Cutlass
    this.captain = buildHumanoidRig({
      skinColor: 0xdca57c,
      shirtColor: 0xf1f5f9,
      pantsColor: 0x1e293b,
      bootColor: 0x1c1410,
      hairColor: 0x1f1916,
      hasCoat: true,
      coatColor: 0x581c1c,
      hasTricornHat: true,
      hasBeard: true,
      scale: 1.18,
    });
    this.captain.root.position.set(1.65, 7.1, -6.2);
    this.captain.root.rotation.y = 0.4;
    // Captain's cutlass in right hand
    const cutlassBlade = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.85, 0.1),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2, metalness: 0.92 }),
    );
    cutlassBlade.position.set(0, -0.78, 0.25);
    cutlassBlade.rotation.x = 0.65;
    this.captain.rightArm.add(cutlassBlade);
    this.sternHalf.add(this.captain.root);

    // B. Mop Guy (Deck Swabber) with wooden mop + bucket on main deck!
    this.mopGuy = buildHumanoidRig({
      skinColor: 0xd8a27b,
      shirtColor: 0xd97706,
      pantsColor: 0x334155,
      bootColor: 0x291c12,
      hairColor: 0x3b2615,
      hasBandana: true,
      bandanaColor: 0x1d4ed8,
      scale: 1.06,
    });
    this.mopGuy.root.position.set(-1.35, 4.92, 2.8);
    this.mopGuy.root.rotation.y = 0.85;
    this.bowHalf.add(this.mopGuy.root);

    // Wooden Mop Prop attached to Mop Guy's right hand
    this.mopProp = new THREE.Group();
    const mopHandle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.032, 0.032, 1.85, 6),
      mastMat,
    );
    mopHandle.position.y = -0.35;
    const mopHead = new THREE.Mesh(
      new THREE.ConeGeometry(0.24, 0.34, 8),
      new THREE.MeshStandardMaterial({ color: 0xd6cfc2, roughness: 0.96 }),
    );
    mopHead.position.y = -1.25;
    this.mopProp.add(mopHandle, mopHead);
    this.mopProp.position.set(0.08, -0.42, 0.18);
    this.mopProp.rotation.x = 0.42;
    this.mopGuy.rightArm.add(this.mopProp);

    // Wooden Mop Bucket next to Mop Guy
    const bucket = new THREE.Mesh(
      new THREE.CylinderGeometry(0.26, 0.2, 0.42, 8),
      hullMidMat,
    );
    bucket.position.set(-2.35, 5.14, 3.2);
    this.bowHalf.add(bucket);

    // C. Female Ship Navigator — crying right next to the Ship's Wheel!
    this.navigator = buildHumanoidRig({
      skinColor: 0xe6b491,
      shirtColor: 0x0f766e,
      pantsColor: 0x1e293b,
      bootColor: 0x2a1b12,
      hairColor: 0x451a03,
      isFemale: true,
      hasCoat: true,
      coatColor: 0x1e3a5f,
      scale: 1.04,
    });
    this.navigator.root.position.set(-0.92, 7.1, -5.65);
    this.navigator.root.rotation.y = 0.6;
    // Parent navigator on root so she can walk up to the player, then jump off the boat later!
    this.root.add(this.navigator.root);

    // Animated blue crying tears falling from the Navigator's eyes!
    const tearMat = new THREE.MeshBasicMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.9,
    });
    for (let i = 0; i < 6; i++) {
      const tear = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), tearMat);
      tear.position.set(i % 2 === 0 ? -0.07 : 0.07, -0.02, 0.19);
      tear.userData = { side: i % 2 === 0 ? -1 : 1, offset: (i / 6) };
      this.navigator.head.add(tear);
      this.navigatorTears.push(tear);
    }

    // D. 6 Scrambling Pirates running in panic across the deck!
    const scramblerSpecs = [
      { x: 1.8, y: 4.92, z: 4.2, rx: 1.5, rz: 2.2, shirt: 0x991b1b, band: 0x111827, speed: 3.1, phase: 0.2 },
      { x: -1.8, y: 4.92, z: -1.6, rx: 1.6, rz: 1.8, shirt: 0xe2e8f0, band: 0xb91c1c, speed: 3.4, phase: 1.3 },
      { x: 2.1, y: 4.92, z: -2.8, rx: 1.3, rz: 1.6, shirt: 0x374151, band: 0xd97706, speed: 2.8, phase: 2.5 },
      { x: -1.6, y: 6.32, z: 9.2, rx: 1.8, rz: 1.2, shirt: 0x7f1d1d, band: 0xfef08a, speed: 3.3, phase: 3.4 },
      { x: 0.8, y: 4.92, z: 1.2, rx: 1.9, rz: 1.9, shirt: 0x1f2937, band: 0xdc2626, speed: 3.6, phase: 4.1 },
      { x: 2.2, y: 7.1, z: -8.2, rx: 1.4, rz: 1.2, shirt: 0x065f46, band: 0x1e293b, speed: 2.9, phase: 5.0 },
    ];
    scramblerSpecs.forEach((sp) => {
      const rig = buildHumanoidRig({
        skinColor: 0xd49c73,
        shirtColor: sp.shirt,
        pantsColor: 0x1f2937,
        bootColor: 0x1c1410,
        hairColor: 0x261a12,
        hasBandana: true,
        bandanaColor: sp.band,
        scale: 1.04,
      });
      rig.root.position.set(sp.x, sp.y, sp.z);
      const parentHalf = sp.z >= 0 ? this.bowHalf : this.sternHalf;
      parentHalf.add(rig.root);
      this.scramblers.push({
        rig,
        baseX: sp.x,
        baseY: sp.y,
        baseZ: sp.z,
        phase: sp.phase,
        speed: sp.speed,
        rangeX: sp.rx,
        rangeZ: sp.rz,
      });
    });

    // ------------------------------------------------------------------
    // 6. PLAYER CHARACTER (BOY OR GIRL) — ONLY ONE WHO JUMPS OFF!
    // ------------------------------------------------------------------
    this.boyRig = buildHumanoidRig({
      skinColor: 0xe3b18a,
      shirtColor: 0x2563eb, // Bright explorer blue tunic so player stands out clearly
      pantsColor: 0x3f2e21,
      bootColor: 0x1c1410,
      hairColor: 0x2e1c0e,
      isFemale: false,
      scale: 1.12,
    });
    this.girlRig = buildHumanoidRig({
      skinColor: 0xe9bc99,
      shirtColor: 0xdb2777, // Bright explorer rose/crimson tunic so player stands out clearly
      pantsColor: 0x1e293b,
      bootColor: 0x2b1910,
      hairColor: 0x5c2d12,
      isFemale: true,
      scale: 1.1,
    });
    this.playerGroup.add(this.boyRig.root, this.girlRig.root);
    this.setPlayerGender('boy');

    // ------------------------------------------------------------------
    // 7. OCEAN SPLASH EFFECT WHEN PLAYER HITS THE WATER
    // ------------------------------------------------------------------
    const splashMat = new THREE.MeshBasicMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });
    this.splashRing = new THREE.Mesh(new THREE.RingGeometry(0.6, 1.8, 18), splashMat);
    this.splashRing.rotation.x = -Math.PI / 2;
    this.splashGroup.add(this.splashRing);
    for (let i = 0; i < 12; i++) {
      const drop = new THREE.Mesh(new THREE.SphereGeometry(0.24, 6, 6), splashMat);
      drop.userData = {
        angle: (i / 12) * Math.PI * 2,
        speed: 2.2 + (i % 3) * 0.9,
        lift: 3.4 + (i % 4) * 0.7,
      };
      this.splashDroplets.push(drop);
      this.splashGroup.add(drop);
    }
    this.splashGroup.visible = false;

    // ------------------------------------------------------------------
    // 8. POST-JUMP SHIP BREAKUP DEBRIS: SAILS FLAT UNDERWATER & WOOD FLAT ON WATER
    // ------------------------------------------------------------------
    const flatSailMat = new THREE.MeshStandardMaterial({
      color: 0xdfd4be,
      roughness: 0.92,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.84,
    });
    const sailSpecs = [
      { w: 10.5, h: 5.8, sx: -9.5, sz: -4.5, yOff: -0.14, rot: 0.45 },
      { w: 9.2, h: 4.8, sx: 8.8, sz: 5.2, yOff: -0.1, rot: -0.62 },
      { w: 8.0, h: 4.4, sx: -4.2, sz: 9.8, yOff: -0.18, rot: 1.15 },
      { w: 7.4, h: 4.0, sx: 11.2, sz: -7.0, yOff: -0.08, rot: 0.22 },
      { w: 6.2, h: 3.6, sx: 1.5, sz: -11.4, yOff: -0.12, rot: -1.05 },
    ];
    sailSpecs.forEach((sp, idx) => {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(sp.w, sp.h, 6, 4), flatSailMat);
      mesh.rotation.x = -Math.PI / 2; // Lies FLAT in/under the water!
      mesh.rotation.z = sp.rot;
      this.debrisWorldGroup.add(mesh);
      this.flatWaterSails.push({
        mesh,
        spreadX: sp.sx,
        spreadZ: sp.sz,
        underwaterYOffset: sp.yOff,
        rotY: sp.rot,
        bobPhase: idx * 1.15,
      });
    });

    // 26 Broken Wooden Hull Planks, Beams & Mast Spars Floating Flat on Water
    for (let i = 0; i < 26; i++) {
      const angle = (i / 26) * Math.PI * 2 + (i % 3) * 0.22;
      const dist = 3.5 + (i % 5) * 3.4;
      const isSpar = i % 5 === 0;
      const isBarrel = i % 7 === 0;
      const geo = isBarrel
        ? new THREE.CylinderGeometry(0.45, 0.45, 0.95, 8)
        : isSpar
          ? new THREE.CylinderGeometry(0.18, 0.24, 5.2 + (i % 3) * 1.4, 7)
          : new THREE.BoxGeometry(0.85 + (i % 3) * 0.45, 0.16, 3.2 + (i % 4) * 1.1);
      const mesh = new THREE.Mesh(geo, i % 2 === 0 ? darkHullMat : deckMat);
      if (isSpar || isBarrel) {
        mesh.rotation.z = Math.PI / 2; // Lies flat in water!
      }
      this.debrisWorldGroup.add(mesh);
      this.floatingWoodPieces.push({
        mesh,
        startLocal: new THREE.Vector3(
          Math.cos(angle) * 2.2,
          2.8 + (i % 3) * 0.8,
          Math.sin(angle) * 6.0,
        ),
        spreadX: Math.cos(angle) * dist,
        spreadZ: Math.sin(angle) * dist,
        rotY: angle + 0.7,
        bobPhase: i * 0.65,
      });
    }
    this.debrisWorldGroup.visible = false;
  }

  public setPlayerGender(gender: PlayerGender): void {
    this.playerGender = gender === 'girl' ? 'girl' : 'boy';
    this.boyRig.root.visible = this.playerGender === 'boy';
    this.girlRig.root.visible = this.playerGender === 'girl';
  }

  public getPlayerGender(): PlayerGender {
    return this.playerGender;
  }

  public reset(oceanLevel: number): void {
    this.firedEvents.clear();
    this.shipPosX = -34;
    this.shipPosZ = 846;
    this.shipRoot.position.set(this.shipPosX, oceanLevel - 0.15, this.shipPosZ);
    this.shipRoot.rotation.set(0, Math.PI * 0.82, 0);
    this.shipRoot.visible = true;

    this.bowHalf.position.set(0, 0, 0);
    this.bowHalf.rotation.set(0, 0, 0);
    this.sternHalf.position.set(0, 0, 0);
    this.sternHalf.rotation.set(0, 0, 0);
    this.lowerCrackGroup.visible = true;
    this.crackChasm.scale.set(1, 0.01, 0.01);
    this.floodWaterPlane.visible = false;

    this.crackPlanks.forEach((p) => {
      const ud = p.userData as { baseX: number; baseY: number; baseZ: number };
      p.position.set(ud.baseX, ud.baseY, ud.baseZ);
      p.rotation.set(0, 0, 0);
    });
    this.seepStreams.forEach((s) => {
      s.visible = false;
    });
    this.masts.forEach((m) => {
      m.group.position.copy(m.basePos);
      m.group.rotation.set(0, 0, 0);
      m.group.visible = true;
    });
    this.cannons.forEach((c) => {
      c.barrel.position.x = c.baseX;
      c.flash.visible = false;
      c.smoke.visible = false;
    });

    this.playerGroup.visible = true;
    this.navigator.root.visible = true;
    this.splashGroup.visible = false;
    this.debrisWorldGroup.visible = false;
  }

  private fireOnce(key: string, fn: () => void): void {
    if (!this.firedEvents.has(key)) {
      this.firedEvents.add(key);
      fn();
    }
  }

  public update(
    elapsed: number,
    oceanLevel: number,
    playerSpawn: { x: number; z: number },
    getTerrainHeight: (x: number, z: number) => number,
    outCamPos: THREE.Vector3,
    outCamLook: THREE.Vector3,
    audio: PirateCinematicAudioCallbacks,
  ): PirateCinematicFrameOutput {
    if (elapsed >= PIRATE_CINEMATIC_DURATION) {
      return {
        finished: true,
        subtitle: '',
        crewShout: '',
        shipWorldX: this.shipPosX,
        shipWorldZ: this.shipPosZ,
        cameraShake: 0,
      };
    }

    // Existing stage timings are authored against a 19-second timeline. Scale
    // elapsed time into that timeline so the shortened cut keeps every cue.
    const t = Math.min(
      CINEMATIC_TIMELINE_DURATION,
      Math.max(0, elapsed) * CINEMATIC_TIME_SCALE,
    );
    const isGirl = this.playerGender === 'girl';
    const activePlayerRig = isGirl ? this.girlRig : this.boyRig;

    const swellY = Math.sin(t * 2.2) * 0.68;
    const pitchWave = Math.sin(t * 2.4) * 0.08;
    const rollWave = Math.cos(t * 2.0) * 0.11;

    let subtitle = '';
    let crewShout = '';
    let cameraShake = 0;

    // ------------------------------------------------------------------
    // 1. SHIP WORLD TRAJECTORY (Stays strictly in deep water z >= 804)
    // ------------------------------------------------------------------
    if (t < 4.2) {
      const e = THREE.MathUtils.smoothstep(t / 4.2, 0, 1);
      this.shipPosX = THREE.MathUtils.lerp(-34, -18, e);
      this.shipPosZ = THREE.MathUtils.lerp(846, 822, e);
      this.shipRoot.position.set(this.shipPosX, oceanLevel + swellY, this.shipPosZ);
      this.shipRoot.rotation.set(pitchWave, Math.PI * 0.82, rollWave);
    } else if (t < 13.0) {
      const e = THREE.MathUtils.smoothstep((t - 4.2) / 8.8, 0, 1);
      this.shipPosX = THREE.MathUtils.lerp(-18, -12, e);
      this.shipPosZ = THREE.MathUtils.lerp(822, 808, e);
      const sinkDip = THREE.MathUtils.lerp(0, -1.65, e);
      const listRoll = THREE.MathUtils.lerp(0, 0.28, e);
      this.shipRoot.position.set(
        this.shipPosX,
        oceanLevel + swellY * 0.7 + sinkDip,
        this.shipPosZ,
      );
      this.shipRoot.rotation.set(pitchWave * 1.15, Math.PI * 0.82 + e * 0.1, rollWave + listRoll);
    } else {
      // Ship sinks and breaks apart!
      const bp = THREE.MathUtils.clamp((t - 13.0) / 3.4, 0, 1);
      const be = THREE.MathUtils.smoothstep(bp, 0, 1);
      this.shipPosX = -12;
      this.shipPosZ = 808;
      this.shipRoot.position.set(
        this.shipPosX,
        oceanLevel - 1.65 - be * 9.5,
        this.shipPosZ,
      );
      this.shipRoot.rotation.set(pitchWave * 0.6, Math.PI * 0.92, 0.28 + be * 0.25);
    }

    // ------------------------------------------------------------------
    // 2. ANIMATE CREW: CAPTAIN, MOP GUY, CRYING NAVIGATOR & SCRAMBLERS
    // ------------------------------------------------------------------
    // Spinning ship's wheel next to the navigator
    this.helmWheel.rotation.z = Math.sin(t * 3.4) * 1.8 + t * 1.4;

    // Captain shouting & waving cutlass
    this.captain.rightArm.rotation.x = -1.9 + Math.sin(t * 7.5) * 0.45;
    this.captain.leftArm.rotation.x = -0.8 + Math.cos(t * 5.2) * 0.35;
    this.captain.head.rotation.y = Math.sin(t * 3.8) * 0.4;

    // Mop Guy: vigorously mops deck in Beat 1, then waves mop in panic as water floods!
    if (t < 4.5) {
      const mopSwing = Math.sin(t * 9.0);
      this.mopGuy.rightArm.rotation.x = -0.85 + mopSwing * 0.42;
      this.mopGuy.leftArm.rotation.x = -0.75 - mopSwing * 0.35;
      this.mopGuy.root.position.x = -1.35 + mopSwing * 0.55;
      this.mopProp.rotation.z = mopSwing * 0.25;
    } else {
      // Panics and waves arms/mop overhead!
      this.mopGuy.rightArm.rotation.x = -2.4 + Math.sin(t * 11.0) * 0.45;
      this.mopGuy.leftArm.rotation.x = -2.2 + Math.cos(t * 10.5) * 0.45;
      this.mopGuy.root.position.x = -1.35 + Math.sin(t * 4.5) * 1.1;
    }

    // Teardrops fall while she is crying by the wheel & talking to the player (t < 13.0s)
    const showTears = t < 13.0;
    this.navigatorTears.forEach((tear) => {
      tear.visible = showTears;
      if (showTears) {
        const ud = tear.userData as { side: number; offset: number };
        const cycle = (t * 1.8 + ud.offset) % 1;
        tear.position.set(ud.side * 0.075, -0.02 - cycle * 0.26, 0.19 + cycle * 0.04);
        tear.scale.setScalar(1.0 - cycle * 0.55);
      }
    });

    // Scrambling pirates running wildly across the deck shouting "ABANDON SHIP!"
    this.scramblers.forEach((sc) => {
      const a = t * sc.speed + sc.phase;
      const nx = sc.baseX + Math.sin(a) * sc.rangeX;
      const nz = sc.baseZ + Math.cos(a * 0.85) * sc.rangeZ;
      const dx = Math.cos(a) * sc.rangeX * sc.speed;
      const dz = -Math.sin(a * 0.85) * sc.rangeZ * sc.speed * 0.85;
      sc.rig.root.position.set(nx, sc.baseY, nz);
      sc.rig.root.rotation.y = Math.atan2(dx, dz);
      // Panic run cycle + arms flailing overhead
      const stride = Math.sin(t * 14.0 + sc.phase);
      sc.rig.leftLeg.rotation.x = stride * 0.72;
      sc.rig.rightLeg.rotation.x = -stride * 0.72;
      sc.rig.leftArm.rotation.x = -2.35 + stride * 0.45;
      sc.rig.rightArm.rotation.x = -2.35 - stride * 0.45;
    });

    // ------------------------------------------------------------------
    // 3. BOOMING CANNONS (Muzzle Flash + Recoil + Smoke + SFX)
    // ------------------------------------------------------------------
    this.cannons.forEach((c, idx) => {
      let activeAge = -1;
      for (const ft of c.fireTimes) {
        if (t >= ft && t < ft + 0.95) {
          activeAge = t - ft;
          this.fireOnce(`cannon_${idx}_${ft.toFixed(2)}`, () => {
            audio.onCannonBoom();
          });
        }
      }
      if (activeAge >= 0) {
        const recoil = Math.max(0, 1 - activeAge / 0.22);
        c.barrel.position.x = c.baseX - c.side * recoil * 0.55;
        if (activeAge < 0.16) {
          c.flash.visible = true;
          c.flash.scale.setScalar(0.85 + activeAge * 5.0);
          cameraShake = Math.max(cameraShake, 0.28);
        } else {
          c.flash.visible = false;
        }
        c.smoke.visible = true;
        const sp = activeAge / 0.95;
        c.smoke.position.set(
          c.side * (6.7 + sp * 4.2),
          3.65 + sp * 2.4,
          c.barrel.position.z,
        );
        c.smoke.scale.setScalar(0.75 + sp * 2.2);
      } else {
        c.barrel.position.x = c.baseX;
        c.flash.visible = false;
        c.smoke.visible = false;
      }
    });

    // ------------------------------------------------------------------
    // 4. LOWER HULL CRACKING & WATER SEEPING IN (t >= 4.2s)
    // ------------------------------------------------------------------
    if (t >= 4.2 && t < 12.0) {
      const crackProgress = THREE.MathUtils.clamp((t - 4.2) / 3.0, 0, 1);
      this.fireOnce('hull_crack_1', () => audio.onHullCrack());
      if (t >= 5.2) this.fireOnce('water_seep_1', () => audio.onWaterSeep());
      if (t >= 6.4) this.fireOnce('hull_crack_2', () => audio.onHullCrack());

      this.crackChasm.scale.set(1, 0.2 + crackProgress * 1.15, 0.18 + crackProgress * 2.2);
      this.crackPlanks.forEach((p, idx) => {
        const ud = p.userData as {
          baseX: number;
          baseY: number;
          baseZ: number;
          side: number;
          tiltDir: number;
        };
        const jitter = Math.sin(t * 28 + idx) * 0.04 * (1 - crackProgress * 0.5);
        p.position.set(
          ud.baseX + ud.side * crackProgress * 0.45 + jitter,
          ud.baseY - crackProgress * 0.22,
          ud.baseZ + ud.tiltDir * crackProgress * 0.35,
        );
        p.rotation.set(
          ud.tiltDir * crackProgress * 0.42,
          ud.side * crackProgress * 0.32,
          ud.side * crackProgress * 0.28,
        );
      });

      // Seeping ocean water jets pouring into the cracking bottom hull
      this.seepStreams.forEach((jet) => {
        jet.visible = crackProgress > 0.12;
        const ud = jet.userData as {
          baseX: number;
          baseY: number;
          baseZ: number;
          phase: number;
          side: number;
        };
        const pulse = 0.75 + Math.sin(t * 14 + ud.phase) * 0.28;
        jet.scale.set(pulse, 0.4 + crackProgress * 1.15, pulse);
        jet.position.set(
          ud.baseX - ud.side * crackProgress * 0.65,
          ud.baseY + Math.sin(t * 9 + ud.phase) * 0.08,
          ud.baseZ,
        );
      });

      // Floodwater rising on the deck
      this.floodWaterPlane.visible = crackProgress > 0.3;
      this.floodWaterPlane.position.y = 4.55 + crackProgress * 0.62;
    }

    // ------------------------------------------------------------------
    // 5. PLAYER & SHIP NAVIGATOR CHOREOGRAPHY
    //    - 0.0–7.4s: Navigator cries beside the ship's wheel; Player near starboard rail
    //    - 7.4–10.2s: Navigator rushes up to the Player & says "I love you..."
    //    - 10.2–13.0s: Player (Boy or Girl) jumps off the boat first & splashes!
    //    - 13.0–16.4s: Ship breaks into pieces & Navigator jumps off LATER!
    // ------------------------------------------------------------------
    this.shipRoot.updateMatrixWorld(true);

    // A. PLAYER ANIMATION
    if (t < 10.2) {
      // Standing near starboard rail; turns to face the Navigator when she runs up!
      _tmpVec.set(3.2, 4.92, 1.4).applyMatrix4(this.shipRoot.matrixWorld);
      this.playerGroup.position.copy(_tmpVec);
      const faceNav = t >= 7.4 ? -Math.PI * 0.5 : Math.PI * 0.4;
      this.playerGroup.rotation.set(0, this.shipRoot.rotation.y + faceNav, 0);
      activePlayerRig.leftArm.rotation.x = t >= 8.2 ? -0.95 : -0.4 + Math.sin(t * 6) * 0.2;
      activePlayerRig.rightArm.rotation.x = t >= 8.2 ? -0.95 : -0.4 - Math.sin(t * 6) * 0.2;
      activePlayerRig.leftLeg.rotation.x = 0;
      activePlayerRig.rightLeg.rotation.x = 0;
    } else if (t < 11.0) {
      // Sprinting to the starboard railing
      const p = (t - 10.2) / 0.8;
      _tmpVec
        .set(THREE.MathUtils.lerp(3.2, 4.25, p), 4.92, 1.4)
        .applyMatrix4(this.shipRoot.matrixWorld);
      this.playerGroup.position.copy(_tmpVec);
      this.playerGroup.rotation.set(0, this.shipRoot.rotation.y + Math.PI * 0.5, 0);
      const stride = Math.sin(t * 15);
      activePlayerRig.leftLeg.rotation.x = stride * 0.75;
      activePlayerRig.rightLeg.rotation.x = -stride * 0.75;
      activePlayerRig.leftArm.rotation.x = -stride * 0.7;
      activePlayerRig.rightArm.rotation.x = stride * 0.7;
    } else if (t < 12.75) {
      // DRAMATIC PARABOLIC LEAP OFF THE BOAT INTO THE OCEAN!
      const p = (t - 11.0) / 1.75;
      _tmpVec.set(4.25, 5.15, 1.4).applyMatrix4(this.shipRoot.matrixWorld);
      const startX = _tmpVec.x;
      const startY = _tmpVec.y;
      const startZ = _tmpVec.z;
      const landX = this.shipPosX - 11.5;
      const landZ = this.shipPosZ - 14.0;
      const arcY = Math.sin(p * Math.PI) * 5.2;
      const px = THREE.MathUtils.lerp(startX, landX, p);
      const pz = THREE.MathUtils.lerp(startZ, landZ, p);
      const py = THREE.MathUtils.lerp(startY, oceanLevel - 0.35, p) + arcY;
      this.playerGroup.position.set(px, py, pz);
      this.playerGroup.rotation.set(
        THREE.MathUtils.lerp(-0.2, 0.75, p),
        Math.atan2(landX - startX, landZ - startZ),
        0,
      );
      activePlayerRig.leftArm.rotation.x = -2.6;
      activePlayerRig.rightArm.rotation.x = -2.6;
      activePlayerRig.leftLeg.rotation.x = 0.35;
      activePlayerRig.rightLeg.rotation.x = -0.25;
    } else {
      // SPLASH & SWIMMING AWAY FROM THE BREAKING SHIP!
      this.fireOnce('player_splash', () => audio.onPlayerSplash());
      const sp = t - 12.75;
      const splashX = this.shipPosX - 11.5;
      const splashZ = this.shipPosZ - 14.0;

      if (sp < 1.25) {
        this.splashGroup.visible = true;
        this.splashGroup.position.set(splashX, oceanLevel + 0.12, splashZ);
        const sFrac = sp / 1.25;
        this.splashRing.scale.setScalar(0.5 + sFrac * 3.8);
        this.splashDroplets.forEach((d) => {
          const ud = d.userData as { angle: number; speed: number; lift: number };
          d.position.set(
            Math.cos(ud.angle) * ud.speed * sp,
            Math.max(0, ud.lift * sp - 4.9 * sp * sp),
            Math.sin(ud.angle) * ud.speed * sp,
          );
          d.scale.setScalar(Math.max(0.01, 1 - sFrac));
        });
      } else if (t < 15.1) {
        this.splashGroup.visible = false;
      }

      const swimP = THREE.MathUtils.clamp(sp / (CINEMATIC_TIMELINE_DURATION - 12.75), 0, 1);
      const swimX = THREE.MathUtils.lerp(splashX, playerSpawn.x, swimP * 0.45);
      const swimZ = THREE.MathUtils.lerp(splashZ, playerSpawn.z + 18, swimP * 0.45);
      this.playerGroup.position.set(swimX, oceanLevel - 0.88 + Math.sin(t * 4) * 0.12, swimZ);
      this.playerGroup.rotation.set(0.35, Math.PI, 0);
      const stroke = Math.sin(t * 7.5);
      activePlayerRig.leftArm.rotation.x = -1.7 + stroke * 0.85;
      activePlayerRig.rightArm.rotation.x = -1.7 - stroke * 0.85;
      activePlayerRig.leftLeg.rotation.x = -stroke * 0.5;
      activePlayerRig.rightLeg.rotation.x = stroke * 0.5;
    }

    // B. SHIP NAVIGATOR ANIMATION (Cries by wheel -> says "I love you" -> jumps off LATER!)
    if (t < 7.4) {
      // Crying next to the spinning ship's wheel on the quarterdeck
      _tmpNavVec.set(-0.92, 7.1, -5.65).applyMatrix4(this.shipRoot.matrixWorld);
      this.navigator.root.position.copy(_tmpNavVec);
      this.navigator.root.rotation.set(0, this.shipRoot.rotation.y + 0.6, 0);
      this.navigator.leftArm.rotation.x = -2.15 + Math.sin(t * 8.0) * 0.08;
      this.navigator.leftArm.rotation.z = -0.38;
      this.navigator.rightArm.rotation.x = -2.15 + Math.cos(t * 8.0) * 0.08;
      this.navigator.rightArm.rotation.z = 0.38;
      this.navigator.head.rotation.x = 0.22 + Math.sin(t * 9.5) * 0.08;
      this.navigator.head.rotation.y = Math.sin(t * 4.2) * 0.22;
      this.navigator.leftLeg.rotation.x = 0;
      this.navigator.rightLeg.rotation.x = 0;
    } else if (t < 8.5) {
      // Hurrying from the wheel down across the deck straight to the player!
      const p = THREE.MathUtils.smoothstep((t - 7.4) / 1.1, 0, 1);
      _tmpNavVec
        .set(
          THREE.MathUtils.lerp(-0.92, 2.05, p),
          THREE.MathUtils.lerp(7.1, 4.92, p),
          THREE.MathUtils.lerp(-5.65, 1.4, p),
        )
        .applyMatrix4(this.shipRoot.matrixWorld);
      this.navigator.root.position.copy(_tmpNavVec);
      this.navigator.root.rotation.set(0, this.shipRoot.rotation.y + 0.45, 0);
      const stride = Math.sin(t * 14);
      this.navigator.leftLeg.rotation.x = stride * 0.68;
      this.navigator.rightLeg.rotation.x = -stride * 0.68;
      this.navigator.leftArm.rotation.x = -stride * 0.55;
      this.navigator.rightArm.rotation.x = stride * 0.55;
      this.navigator.leftArm.rotation.z = 0;
      this.navigator.rightArm.rotation.z = 0;
      this.navigator.head.rotation.set(0, 0, 0);
    } else if (t < 13.4) {
      // Standing face-to-face with the player saying "I love you...", then watching the player jump!
      _tmpNavVec.set(2.05, 4.92, 1.4).applyMatrix4(this.shipRoot.matrixWorld);
      this.navigator.root.position.copy(_tmpNavVec);
      this.navigator.root.rotation.set(0, this.shipRoot.rotation.y + Math.PI * 0.5, 0);
      this.navigator.leftLeg.rotation.x = 0;
      this.navigator.rightLeg.rotation.x = 0;
      // Reaching out tenderly toward the player
      this.navigator.leftArm.rotation.x = -1.25 + Math.sin(t * 4.5) * 0.1;
      this.navigator.rightArm.rotation.x = -1.25 - Math.sin(t * 4.5) * 0.1;
      this.navigator.leftArm.rotation.z = -0.18;
      this.navigator.rightArm.rotation.z = 0.18;
      this.navigator.head.rotation.set(0.05, Math.sin(t * 3.0) * 0.1, 0);
    } else if (t < 15.1) {
      // NAVIGATOR JUMPS OFF LATER as the ship breaks into pieces!
      const p = (t - 13.4) / 1.7;
      _tmpNavVec.set(4.1, 5.0, 1.0).applyMatrix4(this.shipRoot.matrixWorld);
      const startX = _tmpNavVec.x;
      const startY = Math.max(oceanLevel + 1.8, _tmpNavVec.y);
      const startZ = _tmpNavVec.z;
      const landX = this.shipPosX - 8.5;
      const landZ = this.shipPosZ - 11.0;
      const arcY = Math.sin(p * Math.PI) * 4.8;
      this.navigator.root.position.set(
        THREE.MathUtils.lerp(startX, landX, p),
        THREE.MathUtils.lerp(startY, oceanLevel - 0.35, p) + arcY,
        THREE.MathUtils.lerp(startZ, landZ, p),
      );
      this.navigator.root.rotation.set(
        THREE.MathUtils.lerp(-0.15, 0.7, p),
        Math.atan2(landX - startX, landZ - startZ),
        0,
      );
      this.navigator.leftArm.rotation.x = -2.5;
      this.navigator.rightArm.rotation.x = -2.5;
      this.navigator.leftArm.rotation.z = 0;
      this.navigator.rightArm.rotation.z = 0;
      this.navigator.leftLeg.rotation.x = 0.3;
      this.navigator.rightLeg.rotation.x = -0.25;
    } else {
      // NAVIGATOR SPLASHES & SWIMS TOWARD THE ISLAND!
      this.fireOnce('navigator_splash', () => audio.onPlayerSplash());
      const sp = t - 15.1;
      const splashX = this.shipPosX - 8.5;
      const splashZ = this.shipPosZ - 11.0;
      if (sp < 1.25) {
        this.splashGroup.visible = true;
        this.splashGroup.position.set(splashX, oceanLevel + 0.12, splashZ);
        const sFrac = sp / 1.25;
        this.splashRing.scale.setScalar(0.5 + sFrac * 3.5);
        this.splashDroplets.forEach((d) => {
          const ud = d.userData as { angle: number; speed: number; lift: number };
          d.position.set(
            Math.cos(ud.angle) * ud.speed * sp,
            Math.max(0, ud.lift * sp - 4.9 * sp * sp),
            Math.sin(ud.angle) * ud.speed * sp,
          );
          d.scale.setScalar(Math.max(0.01, 1 - sFrac));
        });
      } else {
        this.splashGroup.visible = false;
      }

      const swimP = THREE.MathUtils.clamp(sp / (CINEMATIC_TIMELINE_DURATION - 15.1), 0, 1);
      const swimX = THREE.MathUtils.lerp(splashX, playerSpawn.x + 3.5, swimP * 0.45);
      const swimZ = THREE.MathUtils.lerp(splashZ, playerSpawn.z + 20, swimP * 0.45);
      this.navigator.root.position.set(
        swimX,
        oceanLevel - 0.85 + Math.sin(t * 4.2 + 1.0) * 0.12,
        swimZ,
      );
      this.navigator.root.rotation.set(0.35, Math.PI, 0);
      const stroke = Math.sin(t * 7.8 + 0.8);
      this.navigator.leftArm.rotation.x = -1.7 + stroke * 0.85;
      this.navigator.rightArm.rotation.x = -1.7 - stroke * 0.85;
      this.navigator.leftLeg.rotation.x = -stroke * 0.5;
      this.navigator.rightLeg.rotation.x = stroke * 0.5;
    }

    // ------------------------------------------------------------------
    // 6. AFTER PLAYER JUMPS OFF: SHIP FALLS INTO PIECES!
    //    (Sails flat underwater + ship's wood flat in the water!)
    // ------------------------------------------------------------------
    if (t >= 13.0) {
      this.fireOnce('ship_breakup', () => audio.onShipBreakup());
      const bp = THREE.MathUtils.clamp((t - 13.0) / 3.4, 0, 1);
      const be = THREE.MathUtils.smoothstep(bp, 0, 1);
      if (bp < 0.35) {
        cameraShake = Math.max(cameraShake, 0.42 * (1 - bp / 0.35));
      }

      // Bow and Stern crack wide apart & tip steeply down
      this.bowHalf.position.set(be * 2.4, -be * 2.0, be * 6.5);
      this.bowHalf.rotation.set(be * 0.65, be * 0.25, -be * 0.42);
      this.sternHalf.position.set(-be * 2.2, -be * 2.4, -be * 6.2);
      this.sternHalf.rotation.set(-be * 0.58, -be * 0.22, be * 0.48);

      // All 3 masts snap and topple flat into the ocean
      this.masts.forEach((m) => {
        const mp = THREE.MathUtils.clamp((bp - m.snapDelay * 0.4) / 0.65, 0, 1);
        const me = THREE.MathUtils.smoothstep(mp, 0, 1);
        m.group.rotation.z = m.fallDirX * me * (Math.PI * 0.52);
        m.group.rotation.x = m.fallDirZ * me * 0.45;
        m.group.position.y = m.basePos.y - me * 4.5;
      });

      // Reveal & scatter the flat underwater sails and floating flat wood planks!
      this.debrisWorldGroup.visible = true;
      this.flatWaterSails.forEach((fs) => {
        const spread = THREE.MathUtils.smoothstep(bp, 0, 1);
        fs.mesh.position.set(
          this.shipPosX + fs.spreadX * spread,
          oceanLevel + fs.underwaterYOffset + Math.sin(t * 2.1 + fs.bobPhase) * 0.08,
          this.shipPosZ + fs.spreadZ * spread,
        );
        fs.mesh.rotation.x = -Math.PI / 2 + Math.sin(t * 1.8 + fs.bobPhase) * 0.04;
        fs.mesh.rotation.z = fs.rotY + Math.sin(t * 0.6 + fs.bobPhase) * 0.08;
        fs.mesh.scale.setScalar(0.3 + spread * 0.7);
      });

      this.floatingWoodPieces.forEach((fw) => {
        const spread = THREE.MathUtils.smoothstep(bp, 0, 1);
        const startX = this.shipPosX + fw.startLocal.x;
        const startZ = this.shipPosZ + fw.startLocal.z;
        fw.mesh.position.set(
          THREE.MathUtils.lerp(startX, this.shipPosX + fw.spreadX, spread),
          THREE.MathUtils.lerp(
            oceanLevel + fw.startLocal.y * 0.5,
            oceanLevel + 0.06 + Math.sin(t * 2.6 + fw.bobPhase) * 0.1,
            spread,
          ),
          THREE.MathUtils.lerp(startZ, this.shipPosZ + fw.spreadZ, spread),
        );
        fw.mesh.rotation.y = fw.rotY + t * 0.12;
      });
    }

    // ------------------------------------------------------------------
    // 7. CONTINUOUS CINEMATIC CAMERA CHOREOGRAPHY (6 BEATS)
    // ------------------------------------------------------------------
    if (t < 4.2) {
      // Beat 1: Wide dramatic sweep across the storm-tossed pirate galleon, booming cannons,
      // Captain, Mop Guy on deck, Crying Navigator next to the wheel, and Scrambling Pirates!
      const e = THREE.MathUtils.smoothstep(t / 4.2, 0, 1);
      subtitle =
        t < 2.2
          ? 'The treasure galleon Emerald Fortune sails for Lost World Island, bound for the jewel coves beyond the mist.'
          : 'The island rises ahead — but the old hull groans beneath the crew’s feet.';
      crewShout =
        t < 2.2
          ? 'CAPTAIN: "JEWELS AHEAD! LOST WORLD ISLAND OFF THE BOW!"'
          : 'CREW: "THE HULL IS GROANING! WE’RE TAKING WATER!"';

      outCamPos.set(
        this.shipPosX + THREE.MathUtils.lerp(24, 15, e),
        THREE.MathUtils.lerp(13.5, 10.6, e) + Math.sin(t * 1.5) * 0.35,
        this.shipPosZ + THREE.MathUtils.lerp(16, -6, e),
      );
      outCamLook.set(
        this.shipPosX,
        THREE.MathUtils.lerp(7.6, 7.2, e),
        this.shipPosZ + THREE.MathUtils.lerp(2, -4.5, e),
      );
    } else if (t < 7.4) {
      // Beat 2: Camera ZOOMS RIGHT INTO the bottom half of the pirate ship as it CRACKS
      // and ocean water seeps & pours inside!
      const e = THREE.MathUtils.smoothstep((t - 4.2) / 3.2, 0, 1);
      subtitle =
        'CRACK!! A spar snaps and the hull splits open. Cold ocean water floods the lower deck.';
      crewShout = 'SHIP NAVIGATOR: "THE SHIP IS SINKING! WE CANNOT STAY ABOARD!"';

      outCamPos.set(
        this.shipPosX + THREE.MathUtils.lerp(15, -10.5, e),
        THREE.MathUtils.lerp(10.6, oceanLevel + 2.35, e),
        this.shipPosZ + THREE.MathUtils.lerp(-6, -3.5, e),
      );
      outCamLook.set(
        this.shipPosX + THREE.MathUtils.lerp(0, -3.2, e),
        THREE.MathUtils.lerp(7.2, oceanLevel + 1.55, e),
        this.shipPosZ + THREE.MathUtils.lerp(-4.5, 0.0, e),
      );
    } else if (t < 10.2) {
      // Beat 3: Ship Navigator rushes up to the Player at the railing and says "I love you..."
      const e = THREE.MathUtils.smoothstep((t - 7.4) / 2.8, 0, 1);
      subtitle =
        t < 8.8
          ? 'You find the navigator at the wheel. “What do you know about the island?”'
          : 'She grips your arm. “Jewels ahead — but we will not reach them. Don’t stay on this ship.”';
      crewShout =
        t < 8.8
          ? 'YOU: "NAVIGATOR — WHAT DO YOU KNOW ABOUT THE ISLAND?"'
          : 'SHIP NAVIGATOR: "JEWELS AHEAD — BUT THE SHIP IS GOING DOWN!"';

      outCamPos.set(
        this.shipPosX + THREE.MathUtils.lerp(-10.5, -10.8, e),
        THREE.MathUtils.lerp(oceanLevel + 2.35, oceanLevel + 7.2, e),
        this.shipPosZ + THREE.MathUtils.lerp(-3.5, -8.8, e),
      );
      // Focus right between the Navigator and the Player
      outCamLook.set(
        (this.playerGroup.position.x + this.navigator.root.position.x) * 0.5,
        (this.playerGroup.position.y + this.navigator.root.position.y) * 0.5 + 1.15,
        (this.playerGroup.position.z + this.navigator.root.position.z) * 0.5,
      );
    } else if (t < 13.0) {
      // Beat 4: Player (Boy or Girl) jumps off the sinking boat first!
      const e = THREE.MathUtils.smoothstep((t - 10.2) / 2.8, 0, 1);
      subtitle =
        'No jewel is worth drowning for. You keep your shirt, your pants, and your shoes, then dive clear of the sinking ship.';
      crewShout = 'YOU: "I DON’T NEED TO STAY ABOARD — SWIM FOR THE ISLAND!"';

      outCamPos.set(
        this.shipPosX + THREE.MathUtils.lerp(-10.8, -21.0, e),
        THREE.MathUtils.lerp(oceanLevel + 7.2, oceanLevel + 7.6, e),
        this.shipPosZ + THREE.MathUtils.lerp(-8.8, -22.5, e),
      );
      outCamLook.copy(this.playerGroup.position);
      outCamLook.y += 0.9;
    } else if (t < 16.4) {
      // Beat 5: The ship FALLS INTO PIECES (sails flat underwater, wood flat in the water)
      // AND the Ship Navigator jumps off later to survive on the island too!
      const e = THREE.MathUtils.smoothstep((t - 13.0) / 3.4, 0, 1);
      subtitle =
        'BOOM!! The galleon breaks apart behind you. Sails flatten underwater, then the navigator jumps after you.';
      crewShout = 'SHIP NAVIGATOR: "WAIT FOR ME! I\'M JUMPING!"';

      outCamPos.set(
        this.shipPosX + THREE.MathUtils.lerp(-21.0, -6.5, e),
        THREE.MathUtils.lerp(oceanLevel + 7.6, oceanLevel + 12.6, e),
        this.shipPosZ + THREE.MathUtils.lerp(-22.5, -27.5, e),
      );
      outCamLook.set(
        THREE.MathUtils.lerp(this.navigator.root.position.x, this.shipPosX, e * 0.5),
        oceanLevel + 1.2,
        THREE.MathUtils.lerp(this.navigator.root.position.z, this.shipPosZ, e * 0.5),
      );
    } else {
      // Beat 6: Smooth continuous tide-wash glide onto Survival Island beach!
      const e = THREE.MathUtils.smoothstep((t - 16.4) / (CINEMATIC_TIMELINE_DURATION - 16.4), 0, 1);
      subtitle =
        'Carried by the tide, you and the navigator wash ashore on Lost World Island — alive, and still wearing your shirt, pants, and shoes.';
      crewShout = '';

      const startX = this.shipPosX - 6.5;
      const startZ = this.shipPosZ - 27.5;
      const camX = THREE.MathUtils.lerp(startX, playerSpawn.x, e);
      const camZ = THREE.MathUtils.lerp(startZ, playerSpawn.z, e);
      const groundY = Math.max(oceanLevel + 0.35, getTerrainHeight(camX, camZ));
      const surfLift = Math.sin(e * Math.PI) * 1.1;
      outCamPos.set(
        camX,
        THREE.MathUtils.lerp(oceanLevel + 12.6, groundY + 1.62, e) + surfLift,
        camZ,
      );

      const endGroundY = getTerrainHeight(playerSpawn.x, playerSpawn.z);
      const endLookX = playerSpawn.x - Math.sin(0.12) * 52;
      const endLookY = endGroundY + 1.62 - Math.sin(0.05) * 52;
      const endLookZ = playerSpawn.z - Math.cos(0.12) * 52;
      outCamLook.set(
        THREE.MathUtils.lerp(this.shipPosX, endLookX, e),
        THREE.MathUtils.lerp(oceanLevel + 1.2, endLookY, e),
        THREE.MathUtils.lerp(this.shipPosZ, endLookZ, e),
      );
    }

    if (cameraShake > 0.001) {
      outCamPos.x += (Math.random() - 0.5) * cameraShake;
      outCamPos.y += (Math.random() - 0.5) * cameraShake;
    }

    return {
      finished: false,
      subtitle,
      crewShout,
      shipWorldX: this.shipPosX,
      shipWorldZ: this.shipPosZ,
      cameraShake,
    };
  }
}
