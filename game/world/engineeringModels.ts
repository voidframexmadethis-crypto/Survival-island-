import * as THREE from 'three';
import {
  KineticNodeKind,
  ModularVehicleData,
  VehicleModulePlacement,
} from '../types';
import { GarageVehicleSpec } from '../systems/undergroundElevator';
import { createVehicleFromPreset } from '../systems/modularVehicle';
import { resolveVehicleProfile } from '../systems/vehicleProfiles';
import {
  buildRealLifeCarRig,
  buildSilhouetteGeometry,
  GarageCarVisualConfig,
  normalizeCarArchetype,
  RealLifeCarRig,
  VehicleArchetype,
} from './realLifeCarRig';
import {
  createCadillacTailfinGeometry,
  createCurvedDashboardGeometry,
  createCurvedDeckPanelGeometry,
  createCurvedDoorSkinGeometry,
  createCurvedRearGlassGeometry,
  createCurvedSideGlassGeometry,
  createCurvedWheelhouseTubGeometry,
  createCurvedWindshieldGeometry,
  createSculptedBodyHullGeometry,
  createSculptedRoofCanopyGeometry,
  createSculptedSeatBucketGeometry,
  createSweptTubeGeometry,
  createWrapAroundBumperGeometry,
  evaluateHullStation,
  getVehicleHullSurfaceSpec,
} from './automotiveSurfaceGeo';
import {
  ensureGeometryHasUv,
  getCrossDrilledRotorTexture,
} from './textures';
import {
  buildCabinDetailKit,
  buildCadillacFenderBadges,
  buildDetailedSteeringWheel,
  buildDoorHandleAssembly,
  buildRealisticGrilleAssembly,
  buildRealisticHeadlightPod,
  buildRealisticSideMirror,
  buildRealisticTaillightPod,
  buildWindshieldWipers,
  createAutomotiveCarpetMaterial,
  createAutomotiveGlassMaterial,
  createAutomotiveLeatherMaterial,
  createAutomotivePaintMaterial,
  createCarbonFiberMaterial,
  createChromeMaterial,
  createConvertibleFabricMaterial,
  createMultiPistonCaliperMesh,
  createTireRubberMaterial,
  createTireSidewallMaterial,
  createWalnutWoodMaterial,
  getAmberSignalLensTextureSet,
  getCadillacCrestEmblemMap,
  getChevyBowtieMap,
  getGaugeClusterMap,
  getLicensePlateMap,
  getSculptedSpokeGeometry,
  markVehicleLightingPreserved,
} from './automotiveMaterials';

export {
  buildRealLifeCarRig,
  buildSilhouetteGeometry,
  normalizeCarArchetype,
};
export type {
  GarageCarVisualConfig,
  RealLifeCarRig,
  VehicleArchetype,
};

export interface KineticMeshHandles {
  root: THREE.Group;
  primarySpinner?: THREE.Object3D;
  secondarySpinner?: THREE.Object3D;
  pistonGroup?: THREE.Object3D;
  gaugeNeedle?: THREE.Object3D;
  gantryArm?: THREE.Object3D;
  statusLightMat?: THREE.MeshStandardMaterial;
  flowGlassMat?: THREE.MeshStandardMaterial;
}

export interface BeltSpanMeshHandles {
  group: THREE.Group;
  slats: THREE.Mesh[];
  dirVec: THREE.Vector3;
  spanLength: number;
  startPos: THREE.Vector3;
}

export interface WheelCornerHandle {
  obj: THREE.Object3D;
  corner: 'fl' | 'fr' | 'rl' | 'rr';
  baseY: number;
}

export interface ModularVehicleMeshHandles {
  root: THREE.Group;
  chassisGroup: THREE.Group;
  wheels: THREE.Object3D[];
  steerWheels: THREE.Object3D[];
  wheelCorners: WheelCornerHandle[];
  rotors: THREE.Object3D[];
  pistons: THREE.Object3D[];
  rudders: THREE.Object3D[];
  helmWheel?: THREE.Object3D;
  trunkLid?: THREE.Object3D;
  doorLeft?: THREE.Object3D;
  doorRight?: THREE.Object3D;
  convertibleTop?: THREE.Object3D;
  convertibleFrontSection?: THREE.Object3D;
  convertibleBoot?: THREE.Object3D;
  droptopButton?: THREE.Object3D;
  droptopButtonCap?: THREE.Mesh;
  rimLightButton?: THREE.Object3D;
  rimLightButtonCap?: THREE.Mesh;
  liftButton?: THREE.Object3D;
  liftButtonCap?: THREE.Mesh;
  spinners?: THREE.Object3D[];
  rimLightMeshes?: THREE.Mesh[];
  rimLightMaterials?: THREE.MeshStandardMaterial[];
  subwooferCones?: THREE.Object3D[];
  subGlowMeshes?: THREE.Mesh[];
  underglowLight?: THREE.PointLight;
  underglowMeshes?: THREE.Mesh[];
}

function makeGearWheel(
  radius: number,
  thickness: number,
  teeth: number,
  colorHex: number,
  metalness = 0.72,
): THREE.Group {
  const g = new THREE.Group();
  const metalMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.34,
    metalness,
  });
  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, thickness, Math.max(12, teeth * 2)),
    metalMat,
  );
  rim.rotation.x = Math.PI / 2;
  rim.castShadow = true;
  g.add(rim);

  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.3, radius * 0.3, thickness * 1.45, 10),
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.42, metalness: 0.8 }),
  );
  hub.rotation.x = Math.PI / 2;
  g.add(hub);

  const toothW = (Math.PI * 2 * radius) / (teeth * 2.1);
  const toothGeo = new THREE.BoxGeometry(toothW, radius * 0.28, thickness * 0.88);
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2;
    const t = new THREE.Mesh(toothGeo, metalMat);
    t.position.set(
      Math.cos(a) * (radius + radius * 0.1),
      Math.sin(a) * (radius + radius * 0.1),
      0,
    );
    t.rotation.z = a - Math.PI / 2;
    g.add(t);
  }
  return g;
}

export function createKineticNodeMesh(
  kind: KineticNodeKind,
  woodTex?: THREE.Texture,
  isPreview = false,
): KineticMeshHandles {
  const root = new THREE.Group();
  const ironMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.38,
    metalness: 0.78,
    transparent: isPreview,
    opacity: isPreview ? 0.6 : 1,
  });
  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.28,
    metalness: 0.84,
    transparent: isPreview,
    opacity: isPreview ? 0.6 : 1,
  });
  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x85532a,
    map: woodTex || null,
    roughness: 0.84,
    metalness: 0.05,
    transparent: isPreview,
    opacity: isPreview ? 0.6 : 1,
  });
  const statusLightMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    emissive: 0x22c55e,
    emissiveIntensity: 0.15,
    roughness: 0.3,
  });

  const handles: KineticMeshHandles = { root, statusLightMat };

  if (kind === 'water_wheel') {
    // Timber A-frame stanchions anchored to ground + spinning 10-paddle oak wheel + iron output shaft
    for (const sx of [-0.72, 0.72]) {
      const legA = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.2, 0.16), woodMat);
      legA.position.set(sx, 0.95, 0.45);
      legA.rotation.x = -0.28;
      const legB = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.2, 0.16), woodMat);
      legB.position.set(sx, 0.95, -0.45);
      legB.rotation.x = 0.28;
      root.add(legA, legB);
    }

    const wheelGroup = new THREE.Group();
    wheelGroup.position.set(0, 1.35, 0);
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.2, 10), ironMat);
    axle.rotation.z = Math.PI / 2;
    wheelGroup.add(axle);

    for (const rx of [-0.46, 0.46]) {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(1.12, 0.07, 6, 18), ironMat);
      rim.rotation.y = Math.PI / 2;
      rim.position.x = rx;
      wheelGroup.add(rim);
    }

    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.07, 0.1), woodMat);
      spoke.position.set(0, Math.sin(a) * 0.56, Math.cos(a) * 0.56);
      spoke.rotation.x = -a;
      wheelGroup.add(spoke);

      const paddle = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.06, 0.34), woodMat);
      paddle.position.set(0, Math.sin(a) * 1.15, Math.cos(a) * 1.15);
      paddle.rotation.x = -a + Math.PI / 2;
      wheelGroup.add(paddle);
    }

    const outGear = makeGearWheel(0.36, 0.14, 10, 0xd97706, 0.8);
    outGear.rotation.y = Math.PI / 2;
    outGear.position.x = 1.02;
    wheelGroup.add(outGear);
    root.add(wheelGroup);
    handles.primarySpinner = wheelGroup;
  } else if (kind === 'steam_boiler') {
    // Riveted stone & cast-iron vertical boiler tank with glowing firebox, smokestack & pressure dial
    const hearth = new THREE.Mesh(
      new THREE.BoxGeometry(1.75, 0.36, 1.75),
      new THREE.MeshStandardMaterial({ color: 0x57534e, roughness: 0.94 }),
    );
    hearth.position.y = 0.18;
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.72, 1.85, 16), ironMat);
    tank.position.y = 1.25;
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.68, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      brassMat,
    );
    dome.position.y = 2.16;
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 1.35, 10), ironMat);
    stack.position.set(-0.28, 2.9, -0.2);

    const firebox = new THREE.Mesh(
      new THREE.BoxGeometry(0.62, 0.42, 0.2),
      new THREE.MeshStandardMaterial({
        color: 0xf97316,
        emissive: 0xea580c,
        emissiveIntensity: 1.2,
      }),
    );
    firebox.position.set(0, 0.56, 0.68);

    const gaugeFace = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 0.08, 16),
      new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.35 }),
    );
    gaugeFace.rotation.x = Math.PI / 2;
    gaugeFace.position.set(0.45, 1.65, 0.62);

    const needle = new THREE.Group();
    needle.position.set(0.45, 1.65, 0.67);
    const hand = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.18, 0.02),
      new THREE.MeshStandardMaterial({ color: 0xdc2626 }),
    );
    hand.position.y = 0.06;
    needle.add(hand);

    root.add(hearth, tank, dome, stack, firebox, gaugeFace, needle);
    handles.gaugeNeedle = needle;
    handles.statusLightMat = firebox.material as THREE.MeshStandardMaterial;
  } else if (kind === 'steam_engine') {
    // Heavy cast-iron baseplate, horizontal steam cylinder, sliding piston crosshead & large brass flywheel
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.28, 1.45), ironMat);
    base.position.y = 0.14;
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.95, 14), brassMat);
    cyl.rotation.z = Math.PI / 2;
    cyl.position.set(-0.46, 0.72, 0);

    const pistonGroup = new THREE.Group();
    pistonGroup.position.set(0.15, 0.72, 0);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.92, 8), ironMat);
    rod.rotation.z = Math.PI / 2;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.26, 0.26), brassMat);
    head.position.x = 0.38;
    pistonGroup.add(rod, head);

    const flywheelGroup = new THREE.Group();
    flywheelGroup.position.set(0.72, 0.88, 0);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.09, 8, 22), brassMat);
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.96, 10), ironMat);
    axle.rotation.x = Math.PI / 2;
    const spokeA = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.09, 0.08), ironMat);
    const spokeB = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.18, 0.08), ironMat);
    flywheelGroup.add(rim, axle, spokeA, spokeB);

    const valveBeacon = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), statusLightMat);
    valveBeacon.position.set(-0.46, 1.15, 0);

    root.add(base, cyl, pistonGroup, flywheelGroup, valveBeacon);
    handles.primarySpinner = flywheelGroup;
    handles.pistonGroup = pistonGroup;
  } else if (kind === 'drive_shaft') {
    // Timber pillow-block supports + rotating iron spline shaft along Z
    for (const sz of [-0.92, 0.92]) {
      const stand = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.92, 0.22), woodMat);
      stand.position.set(0, 0.46, sz);
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.26, 10), brassMat);
      collar.rotation.x = Math.PI / 2;
      collar.position.set(0, 0.88, sz);
      root.add(stand, collar);
    }
    const shaftGroup = new THREE.Group();
    shaftGroup.position.y = 0.88;
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.4, 8), ironMat);
    bar.rotation.x = Math.PI / 2;
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 2.1), brassMat);
    shaftGroup.add(bar, rib);
    root.add(shaftGroup);
    handles.primarySpinner = shaftGroup;
  } else if (kind === 'gear_box') {
    // Open-frame cast-iron gearbox showing 2 visibly meshing counter-rotating cogwheels!
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.24, 1.55), woodMat);
    plinth.position.y = 0.12;
    const frameL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.28, 1.28), ironMat);
    frameL.position.set(-0.62, 0.78, 0);
    const frameR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.28, 1.28), ironMat);
    frameR.position.set(0.62, 0.78, 0);

    const g1 = makeGearWheel(0.46, 0.2, 10, 0x94a3b8, 0.78);
    g1.position.set(-0.22, 0.92, 0);
    const g2 = makeGearWheel(0.32, 0.2, 8, 0xd97706, 0.85);
    g2.position.set(0.36, 1.22, 0);

    const statusCap = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.14, 8), statusLightMat);
    statusCap.position.set(0, 1.48, 0);

    root.add(plinth, frameL, frameR, g1, g2, statusCap);
    handles.primarySpinner = g1;
    handles.secondarySpinner = g2;
  } else if (kind === 'belt_pulley') {
    // Tall timber & iron pulley tower stretching leather drive belts across valleys (top sheave at y=2.1)
    const footing = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.22, 1.15), woodMat);
    footing.position.y = 0.11;
    const mast = new THREE.Mesh(new THREE.BoxGeometry(0.34, 2.15, 0.34), woodMat);
    mast.position.y = 1.15;
    const braceA = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.2, 0.16), ironMat);
    braceA.position.set(0, 0.65, 0.35);
    braceA.rotation.x = 0.45;
    const braceB = braceA.clone();
    braceB.position.z = -0.35;
    braceB.rotation.x = -0.45;

    const sheaveGroup = new THREE.Group();
    sheaveGroup.position.set(0, 2.1, 0);
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.42, 16), brassMat);
    drum.rotation.z = Math.PI / 2;
    const flangeL = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.54, 0.05, 16), ironMat);
    flangeL.rotation.z = Math.PI / 2;
    flangeL.position.x = -0.22;
    const flangeR = flangeL.clone();
    flangeR.position.x = 0.22;
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.85, 0.09), ironMat);
    sheaveGroup.add(drum, flangeL, flangeR, spoke);

    root.add(footing, mast, braceA, braceB, sheaveGroup);
    handles.primarySpinner = sheaveGroup;
  } else if (kind === 'fluid_pipe') {
    // Copper pressurized pipeline segment with iron flanges & glowing sight-glass fluid indicator
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.68, 0.34), ironMat);
    stand.position.y = 0.34;
    const pipe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.16, 2.4, 12),
      new THREE.MeshStandardMaterial({ color: 0xc2410c, roughness: 0.34, metalness: 0.78 }),
    );
    pipe.rotation.x = Math.PI / 2;
    pipe.position.y = 0.72;
    const flowGlassMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.1,
      roughness: 0.15,
    });
    const sightGlass = new THREE.Mesh(
      new THREE.CylinderGeometry(0.19, 0.19, 0.65, 12),
      flowGlassMat,
    );
    sightGlass.rotation.x = Math.PI / 2;
    sightGlass.position.y = 0.72;
    for (const fz of [-1.05, -0.35, 0.35, 1.05]) {
      const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.08, 12), ironMat);
      flange.rotation.x = Math.PI / 2;
      flange.position.set(0, 0.72, fz);
      root.add(flange);
    }
    root.add(stand, pipe, sightGlass);
    handles.flowGlassMat = flowGlassMat;
  } else {
    // Automated Vehicle & Gear Assembler: gantry frame, workbench conveyor bed, spinning top pulley & oscillating robotic press arm
    const bed = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.55, 2.1), ironMat);
    bed.position.y = 0.28;
    const topDeck = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.12, 1.75), woodMat);
    topDeck.position.y = 0.6;
    for (const sx of [-0.95, 0.95]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.85, 0.22), ironMat);
      post.position.set(sx, 1.38, -0.55);
      root.add(post);
    }
    const header = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.24, 0.45), brassMat);
    header.position.set(0, 2.25, -0.55);

    const sideGear = makeGearWheel(0.42, 0.16, 10, 0xd97706, 0.85);
    sideGear.rotation.y = Math.PI / 2;
    sideGear.position.set(1.18, 1.05, 0);

    const gantryArm = new THREE.Group();
    gantryArm.position.set(0, 1.95, 0.15);
    const armBeam = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.78, 0.22), brassMat);
    armBeam.position.y = -0.32;
    const torchTip = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 0.26, 6),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0ea5e9,
        emissiveIntensity: 0.7,
      }),
    );
    torchTip.rotation.x = Math.PI;
    torchTip.position.y = -0.78;
    gantryArm.add(armBeam, torchTip);

    const beacon = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.2, 0.26), statusLightMat);
    beacon.position.set(0, 2.48, -0.55);

    root.add(bed, topDeck, header, sideGear, gantryArm, beacon);
    handles.primarySpinner = sideGear;
    handles.gantryArm = gantryArm;
  }

  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.castShadow = !isPreview;
      obj.receiveShadow = !isPreview;
    }
  });
  return handles;
}

/**
 * Creates a physical valley-crossing twin-belt span between two elevated pulley centers,
 * complete with animated moving chevron belt slats!
 */
export function createBeltSpanMesh(
  from: THREE.Vector3,
  to: THREE.Vector3,
): BeltSpanMeshHandles {
  const group = new THREE.Group();
  const dirVec = new THREE.Vector3().subVectors(to, from);
  const spanLength = Math.max(0.5, dirVec.length());
  const normDir = dirVec.clone().normalize();
  const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);

  const quat = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 0, 1),
    normDir,
  );

  const beltMat = new THREE.MeshStandardMaterial({
    color: 0x451a03,
    roughness: 0.78,
    metalness: 0.12,
  });

  // Upper taut band & lower return band
  for (const offsetY of [0.22, -0.22]) {
    const band = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.045, spanLength),
      beltMat,
    );
    band.position.copy(mid);
    band.position.y += offsetY;
    band.quaternion.copy(quat);
    band.castShadow = true;
    group.add(band);
  }

  // Animated metallic drive cleats traveling along the physical belt
  const slatCount = Math.min(28, Math.max(4, Math.floor(spanLength / 1.8)));
  const slatGeo = new THREE.BoxGeometry(0.32, 0.075, 0.16);
  const slatMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.4,
    metalness: 0.65,
  });
  const slats: THREE.Mesh[] = [];
  for (let i = 0; i < slatCount; i++) {
    const slat = new THREE.Mesh(slatGeo, slatMat);
    slat.quaternion.copy(quat);
    group.add(slat);
    slats.push(slat);
  }

  return {
    group,
    slats,
    dirVec,
    spanLength,
    startPos: from.clone(),
  };
}

interface SharedShowroomAssets {
  tireMat: THREE.MeshStandardMaterial;
  tireSidewallMat: THREE.MeshStandardMaterial;
  rotorMat: THREE.MeshStandardMaterial;
  caliperLimeMat: THREE.MeshPhysicalMaterial;
  caliperRedMat: THREE.MeshPhysicalMaterial;
  caliperOrangeMat: THREE.MeshPhysicalMaterial;
  caliperChromeMat: THREE.MeshPhysicalMaterial;
  whitewallMat: THREE.MeshStandardMaterial;
  darkInnerMat: THREE.MeshStandardMaterial;
  bevelArchCache: Map<string, THREE.ExtrudeGeometry>;
}

let cachedShowroomAssets: SharedShowroomAssets | null = null;

function getSharedShowroomAssets(): SharedShowroomAssets {
  if (cachedShowroomAssets) return cachedShowroomAssets;
  const rotorTex = typeof document !== 'undefined' ? getCrossDrilledRotorTexture() : null;
  const tireMat = createTireRubberMaterial();
  const tireSidewallMat = createTireSidewallMaterial();
  const caliperChromeMat = createChromeMaterial(0xf8fafc);
  cachedShowroomAssets = {
    tireMat,
    tireSidewallMat,
    rotorMat: new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      map: rotorTex,
      metalness: 0.88,
      roughness: 0.24,
    }),
    caliperLimeMat: new THREE.MeshPhysicalMaterial({
      color: 0xa3e635,
      metalness: 0.45,
      roughness: 0.2,
      clearcoat: 0.85,
    }),
    caliperRedMat: new THREE.MeshPhysicalMaterial({
      color: 0xef4444,
      metalness: 0.45,
      roughness: 0.2,
      clearcoat: 0.85,
    }),
    caliperOrangeMat: new THREE.MeshPhysicalMaterial({
      color: 0xf97316,
      metalness: 0.45,
      roughness: 0.2,
      clearcoat: 0.85,
    }),
    caliperChromeMat,
    whitewallMat: new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.44,
      metalness: 0.04,
    }),
    darkInnerMat: new THREE.MeshStandardMaterial({
      color: 0x07090d,
      roughness: 0.9,
      metalness: 0.1,
    }),
    bevelArchCache: new Map(),
  };
  cachedShowroomAssets.tireMat.userData = { sharedAsset: true };
  cachedShowroomAssets.tireSidewallMat.userData = { sharedAsset: true };
  cachedShowroomAssets.rotorMat.userData = { sharedAsset: true };
  cachedShowroomAssets.caliperLimeMat.userData = { sharedAsset: true };
  cachedShowroomAssets.caliperRedMat.userData = { sharedAsset: true };
  cachedShowroomAssets.caliperOrangeMat.userData = { sharedAsset: true };
  cachedShowroomAssets.caliperChromeMat.userData = { sharedAsset: true, preserveEnvMapIntensity: true };
  cachedShowroomAssets.whitewallMat.userData = { sharedAsset: true };
  cachedShowroomAssets.darkInnerMat.userData = { sharedAsset: true };
  return cachedShowroomAssets;
}

/**
 * Contoured beveled car hood / deck panel so panels catch golden-hour specular highlights.
 */
function createContouredPanelGeo(
  width: number,
  thickness: number,
  length: number,
  crown = 0.045,
  bevel = 0.03,
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  const hw = width * 0.5;
  const ht = thickness * 0.5;
  shape.moveTo(-hw, -ht);
  shape.lineTo(hw, -ht);
  shape.lineTo(hw, ht * 0.4);
  shape.quadraticCurveTo(0, ht + crown, -hw, ht * 0.4);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.08, length - bevel * 2),
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: bevel,
    bevelThickness: bevel,
  });
  geo.translate(0, 0, -(length - bevel * 2) * 0.5);
  return ensureGeometryHasUv(geo) as THREE.ExtrudeGeometry;
}

/**
 * Smooth curved wheel-arch fender flare (zero boxy leg slabs).
 */
function getFlaredWheelArchGeo(
  outerR: number,
  innerR: number,
  depth: number,
): THREE.ExtrudeGeometry {
  const assets = getSharedShowroomAssets();
  const key = `${outerR.toFixed(2)}_${innerR.toFixed(2)}_${depth.toFixed(2)}`;
  const hit = assets.bevelArchCache.get(key);
  if (hit) return hit;

  const shape = new THREE.Shape();
  shape.absarc(0, 0, outerR, 0, Math.PI, false);
  shape.lineTo(-innerR, 0);
  shape.absarc(0, 0, innerR, Math.PI, 0, true);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: 0.025,
    bevelThickness: 0.025,
  });
  geo.rotateY(Math.PI / 2);
  geo.translate(-depth * 0.5, 0, 0);
  ensureGeometryHasUv(geo);
  geo.userData.sharedAsset = true;
  assets.bevelArchCache.set(key, geo);
  return geo;
}

/**
 * Stationary cross-drilled brake rotor & painted performance caliper mounted inside steerPivot.
 */
function attachBrakeAssembly(
  steerPivot: THREE.Group,
  sideSign: -1 | 1,
  rotorRadius: number,
  offsetX: number,
  caliperTone: 'lime' | 'red' | 'orange' = 'lime',
): void {
  const assets = getSharedShowroomAssets();
  const rotorGeo = new THREE.CylinderGeometry(rotorRadius, rotorRadius, 0.026, 26);
  rotorGeo.rotateZ(Math.PI / 2);
  ensureGeometryHasUv(rotorGeo);
  const rotor = new THREE.Mesh(rotorGeo, assets.rotorMat);
  rotor.position.x = sideSign * offsetX;
  rotor.userData.noShadowCast = true;

  const caliperMat =
    caliperTone === 'orange'
      ? assets.caliperOrangeMat
      : caliperTone === 'red'
        ? assets.caliperRedMat
        : assets.caliperLimeMat;
  const caliper = createMultiPistonCaliperMesh(caliperMat, assets.caliperChromeMat, rotorRadius);
  caliper.position.set(sideSign * (offsetX + 0.008), rotorRadius * 0.42, -rotorRadius * 0.46);
  caliper.rotation.x = 0.45;
  steerPivot.add(rotor, caliper);
}

function buildCustomWheel(
  style:
    | 'wire_whitewall'
    | 'donk_30'
    | 'swanger'
    | 'spinner_13'
    | 'forgiato_40_spinner',
  sideSign: -1 | 1, // -1 = left (-X), +1 = right (+X)
  rimColor: string,
  wheelScale: number,
  chromeMat: THREE.Material,
  rimLedMat?: THREE.MeshStandardMaterial,
  caliperTone: 'lime' | 'red' | 'orange' = 'lime',
): { steerPivot: THREE.Group; spinGroup: THREE.Group; spinnerHub?: THREE.Group } {
  const steerPivot = new THREE.Group();
  steerPivot.scale.setScalar(wheelScale);

  const spinGroup = new THREE.Group();
  steerPivot.add(spinGroup);

  const assets = getSharedShowroomAssets();
  const tireMat = assets.tireMat;
  const sidewallMat = assets.tireSidewallMat;
  const rimMat = createChromeMaterial(rimColor);

  if (style === 'forgiato_40_spinner') {
    // Massive 40-inch Forgiato Deep-Lip Barrel + Treaded Tire + Drilled Brake Rotor + 44 Auto-Spinner
    attachBrakeAssembly(steerPivot, sideSign, 0.285, 0.025, caliperTone);

    const tireOuter = new THREE.Mesh(
      new THREE.CylinderGeometry(0.43, 0.43, 0.34, 28, 1, true),
      tireMat,
    );
    tireOuter.userData.isVehicleShadowHull = true;
    tireOuter.rotation.z = Math.PI / 2;
    [-0.165, 0.165].forEach((sx) => {
      const sidewall = new THREE.Mesh(new THREE.TorusGeometry(0.408, 0.024, 8, 28), sidewallMat);
      sidewall.rotation.y = Math.PI / 2;
      sidewall.position.x = sx;
      spinGroup.add(sidewall);
    });

    const rimBarrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.392, 0.392, 0.35, 28, 1, true),
      rimMat,
    );
    rimBarrel.rotation.z = Math.PI / 2;

    const innerDish = new THREE.Mesh(
      new THREE.CylinderGeometry(0.355, 0.355, 0.22, 24, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.3, metalness: 0.78 }),
    );
    innerDish.rotation.z = Math.PI / 2;

    const stepLip = new THREE.Mesh(
      new THREE.TorusGeometry(0.382, 0.024, 10, 28),
      chromeMat,
    );
    stepLip.rotation.y = Math.PI / 2;
    stepLip.position.x = sideSign * 0.175;

    spinGroup.add(tireOuter, rimBarrel, innerDish, stepLip);

    // 16 Forgiato perimeter lip hardware bolts
    const boltGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.02, 6);
    boltGeo.rotateZ(Math.PI / 2);
    for (let b = 0; b < 16; b++) {
      const ba = (b / 16) * Math.PI * 2;
      const bolt = new THREE.Mesh(boltGeo, chromeMat);
      bolt.position.set(
        sideSign * 0.184,
        Math.cos(ba) * 0.368,
        Math.sin(ba) * 0.368,
      );
      spinGroup.add(bolt);
    }

    // 8 Sculpted Forgiato Y-spokes inside the main wheel barrel (revealing cross-drilled rotor behind!)
    const spokeGeo = getSculptedSpokeGeometry(0.34, 0.044, 0.026, 0.036);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const spoke = new THREE.Mesh(spokeGeo, rimMat);
      spoke.position.set(
        sideSign * 0.125,
        Math.cos(a) * 0.175,
        Math.sin(a) * 0.175,
      );
      spoke.rotation.x = a;
      spinGroup.add(spoke);
    }

    if (rimLedMat) {
      const outerLedRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.362, 0.015, 8, 28),
        rimLedMat,
      );
      outerLedRing.rotation.y = Math.PI / 2;
      outerLedRing.position.x = sideSign * 0.168;

      const innerLedRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.31, 0.018, 8, 24),
        rimLedMat,
      );
      innerLedRing.rotation.y = Math.PI / 2;
      innerLedRing.position.x = sideSign * 0.06;

      spinGroup.add(outerLedRing, innerLedRing);
    }

    // Free-Spinning "44" Auto-Spinner Floating Forgiato Center Assembly
    const spinnerHub = new THREE.Group();
    spinnerHub.position.set(sideSign * 0.195, 0, 0);

    const spinnerOuterRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.285, 0.018, 8, 24),
      chromeMat,
    );
    spinnerOuterRing.rotation.y = Math.PI / 2;
    spinnerHub.add(spinnerOuterRing);

    const bladeAGeo = getSculptedSpokeGeometry(0.265, 0.048, 0.028, 0.028);
    const bladeBGeo = getSculptedSpokeGeometry(0.245, 0.036, 0.022, 0.024);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const bladeA = new THREE.Mesh(bladeAGeo, chromeMat);
      bladeA.position.set(sideSign * 0.012, Math.cos(a) * 0.145, Math.sin(a) * 0.145);
      bladeA.rotation.x = a + 0.18;
      spinnerHub.add(bladeA);

      const bAngle = a + Math.PI / 4;
      const bladeB = new THREE.Mesh(bladeBGeo, rimMat);
      bladeB.position.set(
        sideSign * 0.004,
        Math.cos(bAngle) * 0.138,
        Math.sin(bAngle) * 0.138,
      );
      bladeB.rotation.x = bAngle - 0.18;
      spinnerHub.add(bladeB);

      if (rimLedMat) {
        const ledBar = new THREE.Mesh(
          new THREE.BoxGeometry(0.016, 0.21, 0.018),
          rimLedMat,
        );
        ledBar.position.set(
          sideSign * 0.024,
          Math.cos(a) * 0.148,
          Math.sin(a) * 0.148,
        );
        ledBar.rotation.x = a + 0.18;
        spinnerHub.add(ledBar);
      }
    }

    const centerCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.082, 0.095, 0.075, 16),
      chromeMat,
    );
    centerCap.rotation.z = Math.PI / 2;
    centerCap.position.x = sideSign * 0.024;
    spinnerHub.add(centerCap);

    if (rimLedMat) {
      const capLedRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.078, 0.011, 8, 16),
        rimLedMat,
      );
      capLedRing.rotation.y = Math.PI / 2;
      capLedRing.position.x = sideSign * 0.058;
      spinnerHub.add(capLedRing);
    }

    spinGroup.add(spinnerHub);
    return { steerPivot, spinGroup, spinnerHub };
  }

  if (style === 'donk_30') {
    // Massive 30-inch chrome rim wrapped in low-profile tire + open barrel showing drilled brake rotor + caliper
    attachBrakeAssembly(steerPivot, sideSign, 0.265, 0.02, caliperTone);

    const tireOuter = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 0.3, 28, 1, true),
      tireMat,
    );
    tireOuter.userData.isVehicleShadowHull = true;
    tireOuter.rotation.z = Math.PI / 2;
    [-0.145, 0.145].forEach((sx) => {
      const sidewall = new THREE.Mesh(new THREE.TorusGeometry(0.392, 0.03, 8, 28), sidewallMat);
      sidewall.rotation.y = Math.PI / 2;
      sidewall.position.x = sx;
      spinGroup.add(sidewall);
    });
    const rimBarrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.365, 0.365, 0.315, 28, 1, true),
      rimMat,
    );
    rimBarrel.rotation.z = Math.PI / 2;
    const rimLip = new THREE.Mesh(new THREE.TorusGeometry(0.358, 0.022, 10, 28), chromeMat);
    rimLip.rotation.y = Math.PI / 2;
    rimLip.position.x = sideSign * 0.155;

    spinGroup.add(tireOuter, rimBarrel, rimLip);

    // 16 perimeter billet hardware bolts
    const boltGeo = new THREE.CylinderGeometry(0.007, 0.007, 0.018, 6);
    boltGeo.rotateZ(Math.PI / 2);
    for (let b = 0; b < 16; b++) {
      const ba = (b / 16) * Math.PI * 2;
      const bolt = new THREE.Mesh(boltGeo, chromeMat);
      bolt.position.set(sideSign * 0.165, Math.cos(ba) * 0.34, Math.sin(ba) * 0.34);
      bolt.userData.noShadowCast = true;
      spinGroup.add(bolt);
    }

    // 7 sculpted chrome turbine spokes + billet center cap + 5 lug bolts
    const spokeGeo = getSculptedSpokeGeometry(0.335, 0.052, 0.032, 0.038);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const spoke = new THREE.Mesh(spokeGeo, rimMat);
      spoke.position.set(sideSign * 0.12, Math.cos(a) * 0.17, Math.sin(a) * 0.17);
      spoke.rotation.x = a;
      spinGroup.add(spoke);
    }
    const centerCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.085, 0.085, 0.12, 14),
      chromeMat,
    );
    centerCap.rotation.z = Math.PI / 2;
    centerCap.position.x = sideSign * 0.11;
    spinGroup.add(centerCap);
    const lugGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.026, 6);
    lugGeo.rotateZ(Math.PI / 2);
    for (let l = 0; l < 5; l++) {
      const la = (l / 5) * Math.PI * 2;
      const lug = new THREE.Mesh(lugGeo, chromeMat);
      lug.position.set(sideSign * 0.168, Math.cos(la) * 0.056, Math.sin(la) * 0.056);
      spinGroup.add(lug);
    }
    return { steerPivot, spinGroup };
  }

  // Classic tire + whitewall ring + visible drilled rotor & caliper behind spokes
  attachBrakeAssembly(steerPivot, sideSign, 0.21, 0.015, caliperTone);

  const tire = new THREE.Mesh(
    new THREE.CylinderGeometry(0.41, 0.41, 0.27, 26, 1, true),
    tireMat,
  );
  tire.userData.isVehicleShadowHull = true;
  tire.rotation.z = Math.PI / 2;
  [-0.13, 0.13].forEach((sx) => {
    const sidewall = new THREE.Mesh(new THREE.TorusGeometry(0.345, 0.068, 10, 26), sidewallMat);
    sidewall.rotation.y = Math.PI / 2;
    sidewall.position.x = sx;
    spinGroup.add(sidewall);
  });
  const whitewall = new THREE.Mesh(
    new THREE.TorusGeometry(0.305, 0.036, 8, 26),
    assets.whitewallMat,
  );
  whitewall.rotation.y = Math.PI / 2;
  whitewall.position.x = sideSign * 0.142;

  const rimDish = new THREE.Mesh(
    new THREE.CylinderGeometry(0.258, 0.258, 0.285, 24, 1, true),
    rimMat,
  );
  rimDish.rotation.z = Math.PI / 2;
  const rimLip = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.025, 10, 24), chromeMat);
  rimLip.rotation.y = Math.PI / 2;
  rimLip.position.x = sideSign * 0.145;
  spinGroup.add(tire, whitewall, rimDish, rimLip);

  if (style === 'spinner_13') {
    // 1960s Cadillac Deep-Dish 7-Spoke Chrome Forged Rim w/ Lip Bolts, 5 Lugs & Crest Center Cap
    const boltGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.016, 6);
    boltGeo.rotateZ(Math.PI / 2);
    for (let b = 0; b < 14; b++) {
      const ba = (b / 14) * Math.PI * 2;
      const bolt = new THREE.Mesh(boltGeo, chromeMat);
      bolt.position.set(sideSign * 0.154, Math.cos(ba) * 0.236, Math.sin(ba) * 0.236);
      bolt.userData.noShadowCast = true;
      spinGroup.add(bolt);
    }

    const baseSpokeGeo = getSculptedSpokeGeometry(0.24, 0.04, 0.025, 0.028);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const spoke = new THREE.Mesh(baseSpokeGeo, rimMat);
      spoke.position.set(sideSign * 0.11, Math.cos(a) * 0.125, Math.sin(a) * 0.125);
      spoke.rotation.x = a;
      spinGroup.add(spoke);
    }

    const classicLugGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.024, 6);
    classicLugGeo.rotateZ(Math.PI / 2);
    for (let l = 0; l < 5; l++) {
      const la = (l / 5) * Math.PI * 2;
      const lug = new THREE.Mesh(classicLugGeo, chromeMat);
      lug.position.set(sideSign * 0.145, Math.cos(la) * 0.052, Math.sin(la) * 0.052);
      spinGroup.add(lug);
    }

    const spinnerHub = new THREE.Group();
    spinnerHub.position.set(sideSign * 0.16, 0, 0);
    const hubRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.21, 0.018, 8, 24),
      chromeMat,
    );
    hubRing.rotation.y = Math.PI / 2;
    spinnerHub.add(hubRing);

    const bladeGeo = getSculptedSpokeGeometry(0.205, 0.036, 0.022, 0.024);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const blade = new THREE.Mesh(bladeGeo, chromeMat);
      blade.position.set(0.008 * sideSign, Math.cos(a) * 0.106, Math.sin(a) * 0.106);
      blade.rotation.x = a + 0.18;
      spinnerHub.add(blade);
    }
    const centerCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.058, 0.076, 0.068, 16),
      chromeMat,
    );
    centerCap.rotation.z = Math.PI / 2;
    centerCap.position.x = sideSign * 0.02;
    spinnerHub.add(centerCap);

    const crestTex = getCadillacCrestEmblemMap();
    if (crestTex) {
      const medallion = new THREE.Mesh(
        new THREE.CircleGeometry(0.044, 16),
        new THREE.MeshBasicMaterial({ map: crestTex, transparent: true, alphaTest: 0.15 }),
      );
      medallion.rotation.y = sideSign > 0 ? Math.PI / 2 : -Math.PI / 2;
      medallion.position.x = sideSign * 0.056;
      medallion.userData.noShadowCast = true;
      spinnerHub.add(medallion);
    }

    spinGroup.add(spinnerHub);
    return { steerPivot, spinGroup, spinnerHub };
  }

  // Sculpted Wire spokes + 5 lug bolts for wire_whitewall & swanger
  const wireGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.47, 6);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const wire = new THREE.Mesh(wireGeo, chromeMat);
    wire.position.set(sideSign * 0.135, 0, 0);
    wire.rotation.x = a;
    spinGroup.add(wire);
  }
  const classicLugGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.024, 6);
  classicLugGeo.rotateZ(Math.PI / 2);
  for (let l = 0; l < 5; l++) {
    const la = (l / 5) * Math.PI * 2;
    const lug = new THREE.Mesh(classicLugGeo, chromeMat);
    lug.position.set(sideSign * 0.15, Math.cos(la) * 0.05, Math.sin(la) * 0.05);
    spinGroup.add(lug);
  }

  if (style === 'swanger') {
    const elbowReach = 0.34;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const spokeGroup = new THREE.Group();
      spokeGroup.position.set(sideSign * 0.13, 0, 0);
      spokeGroup.rotation.x = a;
      const rod = new THREE.Mesh(
        new THREE.CylinderGeometry(0.011, 0.014, elbowReach, 6),
        chromeMat,
      );
      rod.rotation.z = -sideSign * 0.34;
      rod.position.set(sideSign * (elbowReach * 0.45), 0.11, 0);
      spokeGroup.add(rod);
      spinGroup.add(spokeGroup);
    }
    const outerCollar = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.018, 8, 16), chromeMat);
    outerCollar.rotation.y = Math.PI / 2;
    outerCollar.position.x = sideSign * (0.13 + elbowReach * 0.86);
    const centerCone = new THREE.Mesh(
      new THREE.CylinderGeometry(0.032, 0.065, elbowReach * 0.95, 10),
      chromeMat,
    );
    centerCone.rotation.z = sideSign * (Math.PI / 2);
    centerCone.position.x = sideSign * (0.13 + elbowReach * 0.48);
    spinGroup.add(outerCollar, centerCone);

    for (let k = 0; k < 2; k++) {
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.16, 0.025), chromeMat);
      ear.position.x = sideSign * (0.14 + elbowReach * 0.94);
      ear.rotation.x = (k * Math.PI) / 2;
      spinGroup.add(ear);
    }
  } else {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.14, 14), chromeMat);
    cap.rotation.z = Math.PI / 2;
    cap.position.x = sideSign * 0.11;
    const ear = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.18, 0.03), chromeMat);
    ear.position.x = sideSign * 0.17;
    spinGroup.add(cap, ear);
  }

  return { steerPivot, spinGroup };
}

function buildCustomStreetShowCar(
  vehicle: ModularVehicleData,
  handles: ModularVehicleMeshHandles,
): void {
  const preset = vehicle.preset as
    | 'lowrider'
    | 'donk'
    | 'slab'
    | 'cadillac_coupe_deville';
  const isDeville = preset === 'cadillac_coupe_deville';
  const rimColor = vehicle.rimColor || '#f8fafc';
  const wheelScale =
    vehicle.wheelScale ??
    (preset === 'donk'
      ? 1.52
      : preset === 'slab'
        ? 0.92
        : isDeville
          ? 0.88
          : 0.86);
  const susp =
    vehicle.suspensionOffset ??
    (preset === 'donk'
      ? 0.44
      : preset === 'lowrider'
        ? -0.16
        : isDeville
          ? -0.14
          : -0.12);

  const candyPaintMat = createAutomotivePaintMaterial(
    vehicle.paintColor || (isDeville ? '#f8fafc' : '#7e22ce'),
    { isPearl: isDeville },
  );
  const chromeMat = createChromeMaterial(rimColor);
  const goldTrimMat = createChromeMaterial(0xfacc15);
  const darkTrimMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.62,
    metalness: 0.3,
  });
  const leatherMat = createAutomotiveLeatherMaterial(isDeville ? 0xe7dcc8 : 0x262626);
  const seatBolsterMat = createAutomotiveLeatherMaterial(isDeville ? 0xd8cab2 : 0x18181b);
  const carpetMat = createAutomotiveCarpetMaterial(isDeville ? 0x292524 : 0x18181b);
  const dashMat = isDeville ? createWalnutWoodMaterial() : createCarbonFiberMaterial();
  const dashPadMat = new THREE.MeshStandardMaterial({
    color: isDeville ? 0x2b211b : 0x111827,
    roughness: 0.66,
    metalness: 0.08,
  });
  const glassMat = createAutomotiveGlassMaterial(0.38);

  // Grounded axle reference height; chassisGroup lifts/drops by suspensionOffset
  const baseWheelY = 0.41 * wheelScale;
  const bodyRideY = Math.max(0.28, 0.38 + susp);
  handles.chassisGroup.position.y = bodyRideY;

  const hullArch: VehicleArchetype = isDeville
    ? 'cadillac'
    : preset === 'donk'
      ? 'donk'
      : preset === 'slab'
        ? 'slab'
        : 'lowrider';
  const hullSpec = getVehicleHullSurfaceSpec(hullArch);
  const yOff = preset === 'donk' ? -0.28 : -0.18;
  const frontZ = hullSpec.frontZ;
  const rearZ = hullSpec.rearZ;
  const lowerBodyH = hullSpec.beltY + yOff; // beltline shoulder in chassisGroup local Y

  // 1. Compound-Curved 3D Lofted Automotive Body Hull + Recessed Wheelhouse Tubs & Flared Chrome Arch Lips
  const hullGeo = createSculptedBodyHullGeometry(hullArch);
  const hullMesh = new THREE.Mesh(hullGeo, candyPaintMat);
  hullMesh.position.y = yOff;
  hullMesh.castShadow = true;
  hullMesh.receiveShadow = true;
  hullMesh.userData.isVehicleShadowHull = true;
  handles.chassisGroup.add(hullMesh);

  const cabinFloor = new THREE.Mesh(
    createCurvedDeckPanelGeometry({
      key: `${hullArch}_floor`,
      width: 1.56,
      length: 1.95,
      crownY: 0.015,
      dropRearY: 0,
      taperRear: 0.04,
      forwardZ: false,
    }),
    carpetMat,
  );
  cabinFloor.position.set(0, hullSpec.cockpitFloorY + yOff + 0.01, hullSpec.cockpitFrontZ + 0.1);
  handles.chassisGroup.add(cabinFloor);

  // Sculpted Curved Wheelhouse Liners & Mirror Chrome Arch Trim Moldings
  const archR = hullSpec.archRadius;
  const streetAssets = getSharedShowroomAssets();
  const tubGeo = createCurvedWheelhouseTubGeometry(hullArch, archR * 0.97, 0.34);
  const lipTorusGeo = new THREE.TorusGeometry(archR * 1.01, 0.015, 10, 24, Math.PI);
  lipTorusGeo.rotateY(Math.PI / 2);
  const innerWheelMat = new THREE.MeshStandardMaterial({
    color: 0x05070b,
    roughness: 0.92,
    metalness: 0.08,
    side: THREE.DoubleSide,
  });

  [hullSpec.archZFront, hullSpec.archZRear].forEach((az) => {
    const st = evaluateHullStation(hullSpec, az);
    const sideX = st.halfW * hullSpec.shoulderTuck + hullSpec.archLipFlare * 0.65;
    ([-1, 1] as const).forEach((side) => {
      const liner = new THREE.Mesh(tubGeo, innerWheelMat);
      liner.position.set(side * (sideX - 0.14), hullSpec.archY + yOff, az);
      liner.userData.noShadowCast = true;
      const archTrim = new THREE.Mesh(lipTorusGeo, chromeMat);
      archTrim.position.set(side * (sideX + 0.008), hullSpec.archY + yOff, az);
      handles.chassisGroup.add(liner, archTrim);
    });
  });

  // Curved lower rocker spear molding hugging the sculpted hull flank
  ([-1, 1] as const).forEach((side) => {
    const spearZPts = [-2.15, -1.25, -0.2, 0.85, 1.92];
    const lowerSpearGeo = createSweptTubeGeometry(
      `${hullArch}_lowspear:${side}`,
      spearZPts.map((sz) => {
        const st = evaluateHullStation(hullSpec, sz);
        return [side * (st.halfW * 1.01), hullSpec.sillY + yOff + 0.06, sz];
      }),
      0.016,
      20,
      8,
    );
    handles.chassisGroup.add(new THREE.Mesh(lowerSpearGeo, isDeville ? goldTrimMat : chromeMat));
  });

  // Trunk Interior Equipment (visible when you pop the curved trunk!)
  const tankMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.94,
    roughness: 0.1,
  });
  const rearStartZ = -0.94;
  const subBox = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.28, 0.44), darkTrimMat);
  subBox.position.set(0, 0.26, rearStartZ - 0.34);
  handles.chassisGroup.add(subBox);
  [-0.32, 0.32].forEach((sx) => {
    const subCone = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.06, 14),
      chromeMat,
    );
    subCone.rotation.x = Math.PI / 2;
    subCone.position.set(sx, 0.28, rearStartZ - 0.57);
    handles.chassisGroup.add(subCone);
  });
  [-0.44, 0.44].forEach((tx) => {
    const airTank = new THREE.Mesh(
      new THREE.CylinderGeometry(0.095, 0.095, 0.62, 14),
      tankMat,
    );
    airTank.rotation.z = Math.PI / 2;
    airTank.position.set(tx, 0.26, rearZ + 0.48);
    handles.chassisGroup.add(airTank);
  });
  const valveBlock = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.1, 0.18),
    new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.45,
      metalness: 0.7,
      roughness: 0.25,
    }),
  );
  valveBlock.position.set(0, 0.2, rearZ + 0.48);
  handles.chassisGroup.add(valveBlock);

  // Animated Hinged Contoured Curved Trunk Lid (pivoted at rear deck front edge so it swings UP smoothly!)
  const rearDeckLen = Math.max(1.15, rearStartZ - rearZ - 0.14);
  const trunkHinge = new THREE.Group();
  trunkHinge.position.set(0, lowerBodyH + 0.01, rearStartZ);
  const trunkPanel = new THREE.Mesh(
    createCurvedDeckPanelGeometry({
      key: `${hullArch}_trunk`,
      width: 1.54,
      length: rearDeckLen,
      crownY: 0.048,
      dropRearY: 0.035,
      taperRear: 0.16,
      forwardZ: false,
    }),
    candyPaintMat,
  );
  const trunkTrimGeo = createSweptTubeGeometry(
    `${hullArch}_trunktrim`,
    [
      [-0.64, -0.02, -(rearDeckLen - 0.06)],
      [0, 0.015, -(rearDeckLen - 0.02)],
      [0.64, -0.02, -(rearDeckLen - 0.06)],
    ],
    0.016,
    12,
    8,
  );
  trunkHinge.add(trunkPanel, new THREE.Mesh(trunkTrimGeo, chromeMat));
  handles.chassisGroup.add(trunkHinge);
  handles.trunkLid = trunkHinge;

  // 3. REAL WORKING INTERIOR (Swept Curved Wrap Dash, Sculpted Bucket Seats & Bench, Console, Droptop Switch)
  const seatBaseY = hullSpec.cockpitFloorY + yOff + 0.18;
  const dash = new THREE.Mesh(
    createCurvedDashboardGeometry(`${hullArch}_dash`, 1.54, 0.34),
    dashPadMat,
  );
  dash.position.set(0, lowerBodyH + 0.03, 0.54);
  const dashTrimArc = new THREE.Mesh(
    createSweptTubeGeometry(
      `${hullArch}_dashtrim`,
      [
        [-0.72, lowerBodyH + 0.01, 0.37],
        [0, lowerBodyH + 0.03, 0.42],
        [0.72, lowerBodyH + 0.01, 0.37],
      ],
      0.03,
      12,
      8,
    ),
    dashMat,
  );
  const centerConsole = new THREE.Mesh(
    createCurvedDeckPanelGeometry({
      key: `${hullArch}_console`,
      width: 0.26,
      length: 1.25,
      crownY: 0.04,
      dropRearY: 0.01,
      taperRear: 0.12,
      forwardZ: false,
    }),
    dashMat,
  );
  centerConsole.position.set(0, seatBaseY - 0.02, 0.58);
  const shifterGate = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.022, 0.22), chromeMat);
  shifterGate.position.set(0, seatBaseY + 0.03, 0.24);
  const shifter = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.018, 0.2, 10), chromeMat);
  shifter.position.set(0, seatBaseY + 0.12, 0.24);
  const shifterKnob = new THREE.Mesh(new THREE.SphereGeometry(0.034, 12, 10), chromeMat);
  shifterKnob.position.set(0, seatBaseY + 0.22, 0.24);

  const droptopSwitchGroup = new THREE.Group();
  droptopSwitchGroup.position.set(0, seatBaseY + 0.03, 0.44);
  const switchBezel = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.032, 0.14),
    chromeMat,
  );
  const switchCapMat = new THREE.MeshStandardMaterial({
    color: isDeville ? 0xf59e0b : 0x64748b,
    emissive: isDeville ? 0xf59e0b : 0x334155,
    emissiveIntensity: isDeville ? 1.5 : 0.35,
    roughness: 0.28,
    metalness: 0.25,
  });
  const switchCap = new THREE.Mesh(
    new THREE.BoxGeometry(0.095, 0.042, 0.095),
    switchCapMat,
  );
  switchCap.position.y = 0.024;
  const switchHitProxy = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.18, 0.24),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  switchHitProxy.position.y = 0.04;
  switchHitProxy.userData.isDroptopButton = true;
  switchCap.userData.isDroptopButton = true;
  switchBezel.userData.isDroptopButton = true;
  droptopSwitchGroup.add(switchBezel, switchCap, switchHitProxy);
  if (isDeville) {
    handles.droptopButton = droptopSwitchGroup;
    handles.droptopButtonCap = switchCap;
  }
  handles.chassisGroup.add(
    dash,
    dashTrimArc,
    centerConsole,
    shifterGate,
    shifter,
    shifterKnob,
    droptopSwitchGroup,
  );

  // Sculpted Curved Bucket Seats with Crest Accents (Driver + Passenger)
  const classicBucketGeo = createSculptedSeatBucketGeometry('luxury_cruiser', 0.5);
  [-0.42, 0.42].forEach((sx) => {
    const seat = new THREE.Mesh(classicBucketGeo, leatherMat);
    seat.position.set(sx, seatBaseY + 0.04, 0.02);
    handles.chassisGroup.add(seat);
    if (isDeville) {
      const crestTex = getCadillacCrestEmblemMap();
      const crestPlate = crestTex
        ? new THREE.Mesh(
            new THREE.PlaneGeometry(0.095, 0.095),
            new THREE.MeshBasicMaterial({ map: crestTex, transparent: true, alphaTest: 0.15 }),
          )
        : new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.075, 0.02), goldTrimMat);
      crestPlate.position.set(sx, seatBaseY + 0.45, -0.17);
      crestPlate.userData.noShadowCast = true;
      handles.chassisGroup.add(crestPlate);
    }
  });

  // Contoured Rear Luxury Bench Seat with Cadillac Crest Medallions
  const rearBenchGeo = createSculptedSeatBucketGeometry('luxury_cruiser', 1.44);
  const rearBench = new THREE.Mesh(rearBenchGeo, leatherMat);
  rearBench.position.set(0, seatBaseY + 0.05, -0.58);
  handles.chassisGroup.add(rearBench);
  const rearCrestTex = isDeville ? getCadillacCrestEmblemMap() : null;
  [-0.42, 0.42].forEach((hx) => {
    if (rearCrestTex) {
      const rCrest = new THREE.Mesh(
        new THREE.PlaneGeometry(0.088, 0.088),
        new THREE.MeshBasicMaterial({ map: rearCrestTex, transparent: true, alphaTest: 0.15 }),
      );
      rCrest.position.set(hx, seatBaseY + 0.46, -0.78);
      rCrest.userData.noShadowCast = true;
      handles.chassisGroup.add(rCrest);
    }
  });

  // Photorealistic Luxury Wood-and-Chrome Steering Wheel + Backlit Instrument Cluster
  const helmWheel = buildDetailedSteeringWheel({
    style: 'classic_luxury',
    radius: 0.175,
    chromeMat,
    leatherMat,
  });
  helmWheel.position.set(-0.42, lowerBodyH + 0.08, 0.36);
  helmWheel.rotation.x = 0.45;
  handles.chassisGroup.add(helmWheel);
  handles.helmWheel = helmWheel;

  const classicGaugeTex = getGaugeClusterMap();
  if (classicGaugeTex) {
    const gaugeScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.4, 0.14),
      new THREE.MeshBasicMaterial({ map: classicGaugeTex }),
    );
    gaugeScreen.position.set(-0.42, lowerBodyH + 0.04, 0.44);
    gaugeScreen.rotation.y = Math.PI;
    handles.chassisGroup.add(gaugeScreen);
  }

  // 4. REAL WORKING HINGED CURVED LEFT & RIGHT DOORS (Contoured Skin, Handles, Armrests, Wing Mirrors!)
  const doorLen = 1.56;
  const doorH = Math.max(0.38, lowerBodyH - (hullSpec.sillY + yOff + 0.04));
  const doorMidSt = evaluateHullStation(hullSpec, 0.05);
  const doorX = doorMidSt.halfW * 0.99;
  ([-1, 1] as const).forEach((side) => {
    const doorPivot = new THREE.Group();
    doorPivot.position.set(side * doorX, hullSpec.sillY + yOff + 0.04, 0.72);
    const outerSkin = new THREE.Mesh(
      createCurvedDoorSkinGeometry({
        key: `${hullArch}_door`,
        side,
        length: doorLen,
        height: doorH,
        bowOut: 0.052,
        tumblehomeTopIn: 0.045,
      }),
      candyPaintMat,
    );
    const innerCard = new THREE.Mesh(
      createCurvedDoorSkinGeometry({
        key: `${hullArch}_door_in`,
        side: (side < 0 ? 1 : -1) as -1 | 1,
        length: doorLen * 0.92,
        height: doorH * 0.85,
        bowOut: 0.02,
        tumblehomeTopIn: 0.02,
      }),
      leatherMat,
    );
    innerCard.position.set(-side * 0.04, doorH * 0.06, -0.04);
    const armrest = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.065, 0.48), seatBolsterMat);
    armrest.position.set(-side * 0.06, doorH * 0.46, -doorLen * 0.55);
    const speakerRing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.018, 12),
      chromeMat,
    );
    speakerRing.rotation.z = Math.PI / 2;
    speakerRing.position.set(-side * 0.06, doorH * 0.24, -0.32);

    const handleAssy = buildDoorHandleAssembly({
      side,
      chromeMat,
      pocketMat: darkTrimMat,
      withKeyCylinder: true,
    });
    handleAssy.position.set(side * 0.022, doorH * 0.76, -doorLen * 0.72);

    const doorGlass = new THREE.Mesh(
      createCurvedSideGlassGeometry({
        key: `${hullArch}_dglass`,
        side,
        frontZ: -0.08,
        rearZ: -doorLen * 0.9,
        bottomY: doorH - 0.02,
        topY: doorH + 0.34,
        bottomX: 0.01,
        topX: 0.065,
        midBowOut: 0.025,
      }),
      glassMat,
    );
    doorGlass.position.x = -side * 0.03;

    const mirrorAssy = buildRealisticSideMirror({
      side,
      housingMat: candyPaintMat,
      chromeMat,
      style: isDeville || preset === 'lowrider' ? 'classic_round' : 'aero',
    });
    mirrorAssy.position.set(side * 0.02, doorH + 0.02, -0.18);

    doorPivot.add(
      outerSkin,
      innerCard,
      armrest,
      speakerRing,
      handleAssy,
      doorGlass,
      mirrorAssy,
    );
    handles.chassisGroup.add(doorPivot);
    if (side < 0) handles.doorLeft = doorPivot;
    else handles.doorRight = doorPivot;
  });

  // 5. Panoramic Wrap-Around Curved Windshield + Swept Chrome A-Pillars + Retractable Black Convertible Top
  const cowlZ = hullSpec.windshieldZ;
  const roofFrontZ = cowlZ - 0.36;
  const cabinRoofY = hullSpec.roofHeight + yOff;
  const cowlSt = evaluateHullStation(hullSpec, cowlZ);
  const baseWsW = cowlSt.halfW * hullSpec.shoulderTuck * 1.84;
  const topWsW = hullSpec.roofHalfWidth * 1.9;
  const pillarMat = chromeMat;

  const windshield = new THREE.Mesh(
    createCurvedWindshieldGeometry({
      key: `${hullArch}_ws`,
      baseWidth: baseWsW,
      topWidth: topWsW,
      bottomY: lowerBodyH - 0.02,
      topY: cabinRoofY - 0.02,
      bottomZ: cowlZ,
      topZ: roofFrontZ,
      wrapZ: hullSpec.windshieldWrap,
      crown: 0.04,
    }),
    glassMat,
  );
  const topHeaderRail = new THREE.Mesh(
    createSweptTubeGeometry(
      `${hullArch}_wsheader`,
      [
        [-topWsW * 0.5, cabinRoofY - 0.015, roofFrontZ],
        [0, cabinRoofY + 0.032, roofFrontZ + hullSpec.windshieldWrap],
        [topWsW * 0.5, cabinRoofY - 0.015, roofFrontZ],
      ],
      0.024,
      14,
      8,
    ),
    pillarMat,
  );
  const cowlWipers = buildWindshieldWipers(baseWsW * 0.76);
  cowlWipers.position.set(0, lowerBodyH + 0.02, cowlZ + hullSpec.windshieldWrap * 0.82);
  const cabinKit = buildCabinDetailKit({
    mirrorY: cabinRoofY - 0.09,
    mirrorZ: roofFrontZ - 0.06,
    dashY: lowerBodyH + 0.05,
    pedalZ: cowlZ,
    driverX: -0.42,
    trimMat: dashPadMat,
    chromeMat,
  });
  handles.chassisGroup.add(windshield, topHeaderRail, cowlWipers, cabinKit);

  ([-1, 1] as const).forEach((side) => {
    const aPillar = new THREE.Mesh(
      createSweptTubeGeometry(
        `${hullArch}_apillar:${side}`,
        [
          [side * (baseWsW * 0.5), lowerBodyH - 0.01, cowlZ],
          [
            side * THREE.MathUtils.lerp(baseWsW * 0.5, topWsW * 0.5, 0.52),
            THREE.MathUtils.lerp(lowerBodyH, cabinRoofY, 0.52),
            THREE.MathUtils.lerp(cowlZ, roofFrontZ, 0.5) + hullSpec.windshieldWrap * 0.22,
          ],
          [side * (topWsW * 0.5), cabinRoofY - 0.015, roofFrontZ],
        ],
        0.028,
        14,
        8,
      ),
      pillarMat,
    );
    handles.chassisGroup.add(aPillar);
  });

  if (isDeville) {
    // Articulated 2-stage Haartz Stayfast curved convertible top + rear curved glass + chrome folding boot
    const blackTopMat = createConvertibleFabricMaterial(0x181a20);
    const headlinerMat = createConvertibleFabricMaterial(0x2d2a26);
    const ribMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.34,
      metalness: 0.82,
    });

    const cabinH = Math.max(0.42, cabinRoofY - lowerBodyH);
    const topPivot = new THREE.Group();
    topPivot.position.set(0, lowerBodyH, -0.94);

    ([-1, 1] as const).forEach((side) => {
      const sailGeo = createCurvedSideGlassGeometry({
        key: `caddy_sail`,
        side,
        frontZ: 0.45,
        rearZ: -0.02,
        bottomY: 0,
        topY: cabinH,
        bottomX: baseWsW * 0.48,
        topX: topWsW * 0.48,
        midBowOut: 0.03,
      });
      topPivot.add(new THREE.Mesh(sailGeo, blackTopMat));

      const linkArm = new THREE.Mesh(
        createSweptTubeGeometry(
          `caddy_link:${side}`,
          [
            [side * (topWsW * 0.46), 0.02, 0.16],
            [side * (topWsW * 0.46), cabinH * 0.94, 0.28],
          ],
          0.018,
          8,
          6,
        ),
        chromeMat,
      );
      topPivot.add(linkArm);
    });

    const rearGlass = new THREE.Mesh(
      createCurvedRearGlassGeometry({
        key: 'caddy_top_rglass',
        topWidth: topWsW * 0.72,
        bottomWidth: baseWsW * 0.76,
        topY: cabinH * 0.88,
        bottomY: cabinH * 0.16,
        topZ: 0.14,
        bottomZ: 0.0,
        wrapZ: 0.08,
      }),
      glassMat,
    );

    const frontSection = new THREE.Group();
    frontSection.position.set(0, cabinH, 0.28);
    const frontCanopyLen = Math.max(0.95, roofFrontZ - (-0.94 + 0.28));
    const roofCap = new THREE.Mesh(
      createSculptedRoofCanopyGeometry({
        key: 'caddy_softtop_cap',
        frontZ: frontCanopyLen,
        rearZ: 0,
        frontHalfW: topWsW * 0.5,
        rearHalfW: topWsW * 0.48,
        frontY: 0,
        peakY: 0.04,
        rearY: -0.01,
        crown: 0.045,
      }),
      blackTopMat,
    );
    roofCap.userData.isVehicleShadowHull = true;
    const roofHeadliner = new THREE.Mesh(
      createSculptedRoofCanopyGeometry({
        key: 'caddy_softtop_liner',
        frontZ: frontCanopyLen * 0.94,
        rearZ: 0.04,
        frontHalfW: topWsW * 0.46,
        rearHalfW: topWsW * 0.44,
        frontY: -0.02,
        peakY: 0.01,
        rearY: -0.025,
        crown: 0.03,
      }),
      headlinerMat,
    );
    [0.24, 0.56, 0.86].forEach((frac) => {
      const bowGeo = createSweptTubeGeometry(
        `caddy_bow:${frac}`,
        [
          [-topWsW * 0.45, -0.02, frontCanopyLen * frac],
          [0, 0.02, frontCanopyLen * frac + 0.02],
          [topWsW * 0.45, -0.02, frontCanopyLen * frac],
        ],
        0.016,
        10,
        6,
      );
      frontSection.add(new THREE.Mesh(bowGeo, ribMat));
    });
    const headerChrome = new THREE.Mesh(
      createSweptTubeGeometry(
        'caddy_top_header',
        [
          [-topWsW * 0.5, -0.01, frontCanopyLen],
          [0, 0.03, frontCanopyLen + hullSpec.windshieldWrap],
          [topWsW * 0.5, -0.01, frontCanopyLen],
        ],
        0.022,
        12,
        8,
      ),
      chromeMat,
    );
    frontSection.add(roofCap, roofHeadliner, headerChrome);

    topPivot.add(rearGlass, frontSection);
    handles.chassisGroup.add(topPivot);
    handles.convertibleTop = topPivot;
    handles.convertibleFrontSection = frontSection;

    // Matching contoured Stayfast woven canvas tonneau boot cover when top is down
    const foldedBoot = new THREE.Group();
    foldedBoot.position.set(0, lowerBodyH + 0.03, -0.84);
    const bootMain = new THREE.Mesh(
      createCurvedDeckPanelGeometry({
        key: 'caddy_world_boot',
        width: baseWsW * 0.92,
        length: 0.42,
        crownY: 0.048,
        dropRearY: 0.025,
        taperRear: 0.06,
        forwardZ: false,
      }),
      blackTopMat,
    );
    const bootChromeTrim = new THREE.Mesh(
      createSweptTubeGeometry(
        'caddy_world_boottrim',
        [
          [-baseWsW * 0.44, 0.01, 0],
          [0, 0.055, 0.03],
          [baseWsW * 0.44, 0.01, 0],
        ],
        0.016,
        12,
        8,
      ),
      chromeMat,
    );
    foldedBoot.add(bootMain, bootChromeTrim);
    foldedBoot.visible = false;
    handles.chassisGroup.add(foldedBoot);
    handles.convertibleBoot = foldedBoot;
  } else {
    const roofMat =
      preset === 'slab'
        ? new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.72, metalness: 0.15 })
        : candyPaintMat;
    const roofTailZ = -0.82;
    const roofCap = new THREE.Mesh(
      createSculptedRoofCanopyGeometry({
        key: `${hullArch}_roof`,
        frontZ: roofFrontZ,
        rearZ: roofTailZ,
        frontHalfW: topWsW * 0.5,
        rearHalfW: hullSpec.roofHalfWidth * 0.94,
        frontY: cabinRoofY - 0.01,
        peakY: cabinRoofY + 0.025,
        rearY: cabinRoofY - 0.06,
        crown: 0.05,
      }),
      roofMat,
    );
    roofCap.userData.isVehicleShadowHull = true;
    const rearSt = evaluateHullStation(hullSpec, hullSpec.cabinRearZ);
    const rearGlass = new THREE.Mesh(
      createCurvedRearGlassGeometry({
        key: `${hullArch}_rglass`,
        topWidth: topWsW * 0.86,
        bottomWidth: rearSt.halfW * 1.48,
        topY: cabinRoofY - 0.06,
        bottomY: lowerBodyH + 0.01,
        topZ: roofTailZ,
        bottomZ: hullSpec.cabinRearZ,
        wrapZ: 0.12,
      }),
      glassMat,
    );
    handles.chassisGroup.add(roofCap, rearGlass);
    ([-1, 1] as const).forEach((side) => {
      const cPillar = new THREE.Mesh(
        createSweptTubeGeometry(
          `${hullArch}_cpillar:${side}`,
          [
            [side * (hullSpec.roofHalfWidth * 0.92), cabinRoofY - 0.06, roofTailZ],
            [side * (rearSt.halfW * 0.84), lowerBodyH + 0.01, hullSpec.cabinRearZ],
          ],
          0.045,
          10,
          8,
        ),
        candyPaintMat,
      );
      const qGlass = new THREE.Mesh(
        createCurvedSideGlassGeometry({
          key: `${hullArch}_qglass`,
          side,
          frontZ: cowlZ - 0.12,
          rearZ: roofTailZ + 0.04,
          bottomY: lowerBodyH,
          topY: cabinRoofY - 0.04,
          bottomX: baseWsW * 0.49,
          topX: topWsW * 0.48,
          midBowOut: 0.032,
        }),
        glassMat,
      );
      handles.chassisGroup.add(cPillar, qGlass);
    });
  }

  // 6. Sculpted Wrap-Around Chrome Bumpers, 3D Jeweled Grille, Quad Crystal Headlights, Cadillac Tailfins & Bullet Taillights
  const frontBumper = new THREE.Mesh(
    createWrapAroundBumperGeometry({
      key: `${hullArch}_fbump`,
      halfWidth: hullSpec.width * 0.5 + 0.06,
      wrapBackZ: 0.34,
      centerCurveZ: 0.14,
      height: 0.18,
      thickness: 0.16,
    }),
    chromeMat,
  );
  frontBumper.position.set(0, 0.42 + yOff, frontZ - 0.02);
  const rearBumper = new THREE.Mesh(
    createWrapAroundBumperGeometry({
      key: `${hullArch}_rbump`,
      halfWidth: hullSpec.width * 0.5 + 0.06,
      wrapBackZ: 0.34,
      centerCurveZ: 0.12,
      height: 0.18,
      thickness: 0.16,
      isRear: true,
    }),
    chromeMat,
  );
  rearBumper.position.set(0, 0.44 + yOff, rearZ + 0.02);

  const grilleAssy = buildRealisticGrilleAssembly({
    width: isDeville ? 1.18 : 1.32,
    height: isDeville ? 0.3 : 0.24,
    chromeMat,
    horizontalBars: isDeville ? 2 : 3,
    emblemTexture: isDeville ? getCadillacCrestEmblemMap() : null,
  });
  grilleAssy.position.set(0, 0.48, frontZ + 0.02);

  // Stamped front license plate frame & recessed plate
  const plateLabel = isDeville
    ? 'DE VILLE'
    : preset === 'donk'
      ? 'DONK 30'
      : preset === 'slab'
        ? 'SWANGER'
        : '64 IMPALA';
  const plateTex = getLicensePlateMap(plateLabel);
  const plateFrame = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.03), chromeMat);
  plateFrame.position.set(0, 0.26, frontZ + 0.16);
  const plateInner = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.13, 0.036),
    plateTex
      ? new THREE.MeshStandardMaterial({ map: plateTex, roughness: 0.28, metalness: 0.2 })
      : darkTrimMat,
  );
  plateInner.position.set(0, 0.26, frontZ + 0.165);
  plateInner.userData.noShadowCast = true;

  handles.chassisGroup.add(frontBumper, rearBumper, grilleAssy, plateFrame, plateInner);

  // Multi-layer hooded crystal quad round headlights
  [-0.78, -0.62, 0.62, 0.78].forEach((hx) => {
    const pod = buildRealisticHeadlightPod({
      shape: 'round',
      radius: 0.068,
      chromeMat,
      withHood: isDeville || preset === 'lowrider',
    });
    pod.position.set(hx, 0.5, frontZ + 0.01);
    handles.chassisGroup.add(pod);
  });

  if (isDeville) {
    // 1959/1960s White Pearl Cadillac details: Dagmar bumper cones, fender script & crest, fluted amber corner signals
    const amberLensTex = getAmberSignalLensTextureSet();
    const flutedAmberMat = new THREE.MeshPhysicalMaterial({
      color: 0xfbbf24,
      map: amberLensTex.map,
      normalMap: amberLensTex.normalMap,
      normalScale: new THREE.Vector2(0.45, 0.45),
      emissive: 0xd97706,
      emissiveIntensity: 0.65,
      metalness: 0.08,
      roughness: 0.06,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      envMapIntensity: 2.2,
    });
    flutedAmberMat.userData.preserveEnvMapIntensity = true;

    [-0.58, 0.58].forEach((dx) => {
      const dagmar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.042, 0.085, 0.16, 16),
        chromeMat,
      );
      dagmar.rotation.x = Math.PI / 2;
      dagmar.position.set(dx, 0.26, frontZ + 0.14);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 8), chromeMat);
      cap.position.set(dx, 0.26, frontZ + 0.22);
      handles.chassisGroup.add(dagmar, cap);
    });

    ([-1, 1] as const).forEach((sideSign) => {
      const fSt = evaluateHullStation(hullSpec, frontZ - 0.16);
      const cx = sideSign * fSt.halfW * 0.98;
      const amberBezel = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.16, 0.14), chromeMat);
      amberBezel.position.set(cx, 0.47, frontZ - 0.16);
      const amberMarker = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.135, 0.115), flutedAmberMat);
      amberMarker.position.set(cx + sideSign * 0.004, 0.47, frontZ - 0.16);
      amberMarker.userData.noShadowCast = true;

      const badgeSt = evaluateHullStation(hullSpec, 0.94);
      const fenderBadges = buildCadillacFenderBadges(sideSign);
      fenderBadges.position.set(sideSign * (badgeSt.halfW * 1.045), 0.49, 0.94);

      const fenderOrnament = new THREE.Mesh(
        createSweptTubeGeometry(
          'caddy_world_ornament',
          [
            [0, 0, -0.18],
            [0, 0.018, 0.04],
            [0, 0.004, 0.18],
          ],
          0.014,
          10,
          8,
        ),
        chromeMat,
      );
      fenderOrnament.position.set(sideSign * 0.78, lowerBodyH + 0.06, frontZ - 0.32);
      handles.chassisGroup.add(amberBezel, amberMarker, fenderBadges, fenderOrnament);
    });

    // Iconic 1959/1960s Cadillac Sweeping Razor-Tapered Tailfins + Chrome Spears + Twin Bullet Taillights
    const tailfinGeo = createCadillacTailfinGeometry({
      key: 'caddy_world_tailfin',
      length: 1.38,
      frontHeight: 0.06,
      rearHeight: 0.36,
      baseThickness: 0.13,
      crestThickness: 0.024,
    });
    const finSpearGeo = createSweptTubeGeometry(
      'caddy_world_finspear',
      [
        [0, 0.055, 0.68],
        [0, 0.21, 0.0],
        [0, 0.355, -0.68],
      ],
      0.014,
      12,
      8,
    );
    const finSt = evaluateHullStation(hullSpec, rearZ + 0.65);
    const finX = finSt.halfW * 0.85;
    [-finX, finX].forEach((tx) => {
      const finBody = new THREE.Mesh(tailfinGeo, candyPaintMat);
      finBody.position.set(tx, lowerBodyH - 0.02, rearZ + 0.7);
      const finSpear = new THREE.Mesh(finSpearGeo, chromeMat);
      finSpear.position.set(tx, lowerBodyH - 0.02, rearZ + 0.7);

      const upperRocket = buildRealisticTaillightPod({
        style: 'cadillac_bullet',
        chromeMat,
      });
      upperRocket.position.set(tx, lowerBodyH + 0.2, rearZ + 0.02);
      const lowerRocket = buildRealisticTaillightPod({
        style: 'cadillac_bullet',
        chromeMat,
      });
      lowerRocket.position.set(tx, lowerBodyH - 0.06, rearZ + 0.02);
      handles.chassisGroup.add(finBody, finSpear, upperRocket, lowerRocket);
    });

    // Gold V-crest on hood & rear-right slim chrome whip antenna
    const vCrestL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.024, 0.04), goldTrimMat);
    vCrestL.position.set(-0.1, lowerBodyH + 0.23, frontZ - 0.18);
    vCrestL.rotation.z = -0.16;
    const vCrestR = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.024, 0.04), goldTrimMat);
    vCrestR.position.set(0.1, lowerBodyH + 0.23, frontZ - 0.18);
    vCrestR.rotation.z = 0.16;
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.008, 0.68, 6), chromeMat);
    antenna.position.set(0.84, lowerBodyH + 0.52, frontZ - 0.56);
    handles.chassisGroup.add(vCrestL, vCrestR, antenna);

    const bagMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.8 });
    const coilMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.78,
      roughness: 0.22,
    });
    [1.38, -1.24].forEach((az) => {
      [-0.68, 0.68].forEach((cx) => {
        const airbag = new THREE.Mesh(
          new THREE.CylinderGeometry(0.09, 0.09, 0.22, 10),
          bagMat,
        );
        airbag.position.set(cx, 0.02, az);
        const coil = new THREE.Mesh(
          new THREE.CylinderGeometry(0.055, 0.055, 0.34, 10),
          coilMat,
        );
        coil.position.set(cx + (cx < 0 ? 0.11 : -0.11), 0.0, az);
        handles.chassisGroup.add(airbag, coil);
      });
    });
  } else if (preset === 'lowrider') {
    // Authentic '64 Impala brushed aluminum rear cove & triple round ruby taillight pods!
    const covePanel = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.18, 0.04), chromeMat);
    covePanel.position.set(0, 0.48, rearZ + 0.01);
    handles.chassisGroup.add(covePanel);
    [-0.78, -0.62, -0.46, 0.46, 0.62, 0.78].forEach((tx) => {
      const pod = buildRealisticTaillightPod({ style: 'round', radius: 0.052, chromeMat });
      pod.position.set(tx, 0.48, rearZ - 0.02);
      handles.chassisGroup.add(pod);
    });
  } else {
    [-0.7, 0.7].forEach((tx) => {
      const pod = buildRealisticTaillightPod({
        style: 'blade',
        width: 0.34,
        height: 0.11,
        chromeMat,
      });
      pod.position.set(tx, 0.48, rearZ - 0.02);
      handles.chassisGroup.add(pod);
    });
  }

  // Dual mirror chrome exhaust tips with dark recessed bores + rear license plate
  const rearPlateFrame = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.03), chromeMat);
  rearPlateFrame.position.set(0, 0.46, rearZ - 0.02);
  const rearPlateTex = getLicensePlateMap(plateLabel);
  if (rearPlateTex) {
    const rearPlateFace = new THREE.Mesh(
      new THREE.PlaneGeometry(0.28, 0.13),
      new THREE.MeshBasicMaterial({ map: rearPlateTex }),
    );
    rearPlateFace.rotation.y = Math.PI;
    rearPlateFace.position.set(0, 0.46, rearZ - 0.038);
    rearPlateFace.userData.noShadowCast = true;
    handles.chassisGroup.add(rearPlateFace);
  }
  handles.chassisGroup.add(rearPlateFrame);

  [-0.58, 0.58].forEach((ex) => {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.044, 0.38, 12), chromeMat);
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(ex, 0.14, rearZ - 0.14);
    const bore = new THREE.Mesh(new THREE.CircleGeometry(0.036, 12), streetAssets.darkInnerMat);
    bore.rotation.y = Math.PI;
    bore.position.set(ex, 0.14, rearZ - 0.332);
    bore.userData.noShadowCast = true;
    handles.chassisGroup.add(pipe, bore);
  });

  if (preset === 'lowrider') {
    [-0.88, 0.88].forEach((fx) => {
      const fin = new THREE.Mesh(
        createContouredPanelGeo(0.12, 0.12, 1.25, 0.02, 0.02),
        candyPaintMat,
      );
      fin.position.set(fx, lowerBodyH + 0.16, -1.52);
      handles.chassisGroup.add(fin);
    });
    const hoodTrim = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.036, 1.35), chromeMat);
    hoodTrim.position.set(0, lowerBodyH + 0.22, 1.48);
    handles.chassisGroup.add(hoodTrim);
  } else if (preset === 'donk') {
    const axleMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.92, roughness: 0.14 });
    const coilMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.7, roughness: 0.25 });
    [1.36, -1.24].forEach((az) => {
      const axleTube = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 1.72, 10), axleMat);
      axleTube.rotation.z = Math.PI / 2;
      axleTube.position.set(0, -Math.max(0.12, bodyRideY - baseWheelY), az);
      handles.chassisGroup.add(axleTube);
      [-0.65, 0.65].forEach((cx) => {
        const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.42, 10), coilMat);
        strut.position.set(cx, -0.1, az);
        handles.chassisGroup.add(strut);
      });
    });
    const badge = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.09, 0.08), chromeMat);
    badge.position.set(0, lowerBodyH + 0.22, 1.95);
    handles.chassisGroup.add(badge);
  } else if (preset === 'slab') {
    const slabAssets = getSharedShowroomAssets();
    const contGroup = new THREE.Group();
    contGroup.position.set(0, 0.56, rearZ - 0.24);
    contGroup.rotation.x = 0.14;
    const mountArm = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.22, 0.34), chromeMat);
    mountArm.position.set(0, -0.18, 0.14);
    const spareTire = new THREE.Mesh(
      new THREE.TorusGeometry(0.36, 0.09, 10, 24),
      slabAssets.tireSidewallMat,
    );
    const spareWhitewall = new THREE.Mesh(
      new THREE.TorusGeometry(0.3, 0.032, 8, 24),
      slabAssets.whitewallMat,
    );
    spareWhitewall.position.z = -0.055;
    const spareFace = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.28, 0.14, 20),
      candyPaintMat,
    );
    spareFace.rotation.x = Math.PI / 2;
    const spareSpinner = new THREE.Mesh(
      new THREE.CylinderGeometry(0.048, 0.085, 0.22, 12),
      chromeMat,
    );
    spareSpinner.rotation.x = Math.PI / 2;
    spareSpinner.position.z = -0.06;
    contGroup.add(mountArm, spareTire, spareWhitewall, spareFace, spareSpinner);
    handles.chassisGroup.add(contGroup);

    const glowColor = new THREE.Color(vehicle.underglowColor || '#e879f9');
    const glowMat = new THREE.MeshStandardMaterial({
      color: glowColor,
      emissive: glowColor,
      emissiveIntensity: 2.2,
      roughness: 0.2,
    });
    const glowMeshes: THREE.Mesh[] = [];
    [-0.86, 0.86].forEach((gx) => {
      const tube = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 3.2), glowMat);
      tube.position.set(gx, 0.04, 0.08);
      handles.chassisGroup.add(tube);
      glowMeshes.push(tube);
    });
    [frontZ - 0.15, rearZ + 0.15].forEach((gz) => {
      const tube = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.04, 0.06), glowMat);
      tube.position.set(0, 0.04, gz);
      handles.chassisGroup.add(tube);
      glowMeshes.push(tube);
    });
    const underLight = new THREE.PointLight(glowColor.getHex(), 1.9, 8.5, 1.4);
    underLight.position.set(0, 0.1, 0.08);
    handles.chassisGroup.add(underLight);
    handles.underglowLight = underLight;
    handles.underglowMeshes = glowMeshes;
  }

  // 7. Attach 4 Independent Corner Wheels to root (with drilled rotors & calipers!)
  const wheelStyle: 'wire_whitewall' | 'donk_30' | 'swanger' | 'spinner_13' =
    preset === 'donk'
      ? 'donk_30'
      : preset === 'slab'
        ? 'swanger'
        : isDeville
          ? 'spinner_13'
          : 'wire_whitewall';
  const trackHalf = preset === 'donk' ? 1.06 : 0.96;
  const wheelCoords: { corner: 'fl' | 'fr' | 'rl' | 'rr'; x: number; z: number; side: -1 | 1; isFront: boolean }[] = [
    { corner: 'fl', x: -trackHalf, z: 1.38, side: -1, isFront: true },
    { corner: 'fr', x: trackHalf, z: 1.38, side: 1, isFront: true },
    { corner: 'rl', x: -trackHalf, z: -1.24, side: -1, isFront: false },
    { corner: 'rr', x: trackHalf, z: -1.24, side: 1, isFront: false },
  ];

  handles.spinners = [];
  const caliperTone = isDeville ? 'lime' : preset === 'donk' ? 'orange' : 'red';
  for (const wc of wheelCoords) {
    const cornerRoot = new THREE.Group();
    cornerRoot.position.set(wc.x, baseWheelY, wc.z);
    const { steerPivot, spinGroup, spinnerHub } = buildCustomWheel(
      wheelStyle,
      wc.side,
      rimColor,
      wheelScale,
      chromeMat,
      undefined,
      caliperTone,
    );
    cornerRoot.add(steerPivot);
    handles.root.add(cornerRoot);

    handles.wheels.push(spinGroup);
    if (spinnerHub) {
      handles.spinners.push(spinnerHub);
    }
    if (wc.isFront) {
      handles.steerWheels.push(steerPivot);
    }
    handles.wheelCorners.push({
      obj: cornerRoot,
      corner: wc.corner,
      baseY: baseWheelY,
    });
  }
}

export function createSavageLifeLiveryTexture(
  channelName: string,
  ctaText: string,
  accentColor: string,
  bodyColor = '#12151c',
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Base dark clearcoat background
  ctx.fillStyle = bodyColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Racing / channel art accent stripes
  ctx.fillStyle = accentColor;
  ctx.fillRect(0, 340, canvas.width, 28);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 376, canvas.width, 10);

  // Channel Name
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 68px Impact, Arial Black, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(channelName.toUpperCase(), canvas.width / 2, 165);

  // Bold SUBSCRIBE callout badge
  ctx.fillStyle = accentColor;
  ctx.fillRect(canvas.width / 2 - 230, 205, 460, 96);
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 58px Impact, Arial Black, sans-serif';
  ctx.fillText(ctaText.toUpperCase(), canvas.width / 2, 274);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

export interface BuiltVehicleRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  wheels: THREE.Object3D[];
  subCones: THREE.Mesh[];
  dispose: () => void;
}

function buildChevyTahoeShowSuv(
  vehicle: ModularVehicleData,
  handles: ModularVehicleMeshHandles,
): void {
  const rimColor = vehicle.rimColor || '#f8fafc';
  const wheelScale = vehicle.wheelScale ?? 1.42; // 40-inch Forgiato show wheels
  const susp = vehicle.suspensionOffset ?? -0.3; // Slammed 3 inches off the ground (0.08m)

  const livery = vehicle.livery ?? (
    vehicle.preset === 'chevy_tahoe'
      ? {
          channelName: 'SAVAGE LIFE GAMING',
          ctaText: 'SUBSCRIBE',
          accentColor: '#ff2a55',
          bodyColor: vehicle.paintColor || '#111318',
        }
      : undefined
  );
  const paintColor = livery?.bodyColor || vehicle.paintColor || '#111318';

  const paintMat = createAutomotivePaintMaterial(paintColor);
  const chromeMat = createChromeMaterial(rimColor);
  const darkTrimMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.68,
    metalness: 0.25,
  });
  const leatherMat = createAutomotiveLeatherMaterial(0x1c1917);
  const stitchMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.45,
    metalness: 0.25,
  });
  const carpetMat = createAutomotiveCarpetMaterial(0x0d0e12);
  const dashMat = createCarbonFiberMaterial();
  const glassMat = createAutomotiveGlassMaterial(0.36);

  // 40" Forgiato wheel radius = 0.43 * 1.42 = ~0.61m; chassis sits slammed 3 inches (0.08m) off ground!
  const baseWheelY = 0.43 * wheelScale;
  const bodyRideY = Math.max(0.075, 0.38 + susp);
  handles.chassisGroup.position.y = bodyRideY;

  const tahoeSpec = getVehicleHullSurfaceSpec('chevy_tahoe');
  const tahoeYOff = -0.06;
  const frontZ = tahoeSpec.frontZ;
  const rearZ = tahoeSpec.rearZ;

  // 1. Compound-Curved 3D Sculpted Tahoe SUV Body Hull + Flared Arches + Slammed Ground Skirts
  const tahoeHullMesh = new THREE.Mesh(createSculptedBodyHullGeometry('chevy_tahoe'), paintMat);
  tahoeHullMesh.position.y = tahoeYOff;
  tahoeHullMesh.castShadow = true;
  tahoeHullMesh.receiveShadow = true;
  tahoeHullMesh.userData.isVehicleShadowHull = true;
  handles.chassisGroup.add(tahoeHullMesh);

  const cabinFloor = new THREE.Mesh(
    createCurvedDeckPanelGeometry({
      key: 'tahoe_floor',
      width: 1.66,
      length: 2.95,
      crownY: 0.01,
      dropRearY: 0,
      taperRear: 0.04,
      forwardZ: false,
    }),
    carpetMat,
  );
  cabinFloor.position.set(0, tahoeSpec.cockpitFloorY + tahoeYOff - 0.08, 0.72);
  handles.chassisGroup.add(cabinFloor);

  // Curved slammed rocker skirts + curved front chin splitter
  ([-1, 1] as const).forEach((side) => {
    const skirtGeo = createSweptTubeGeometry(
      `tahoe_skirt:${side}`,
      [
        [side * 0.96, 0.12, -0.78],
        [side * 0.99, 0.11, 0.05],
        [side * 0.96, 0.12, 0.85],
      ],
      0.045,
      12,
      8,
    );
    handles.chassisGroup.add(new THREE.Mesh(skirtGeo, paintMat));
  });
  const frontLip = new THREE.Mesh(
    createWrapAroundBumperGeometry({
      key: 'tahoe_chin',
      halfWidth: 0.98,
      wrapBackZ: 0.28,
      centerCurveZ: 0.12,
      height: 0.075,
      thickness: 0.15,
    }),
    darkTrimMat,
  );
  frontLip.position.set(0, 0.07, frontZ - 0.04);
  handles.chassisGroup.add(frontLip);

  // Dark inner wheelhouse tubs & chrome/painted flared arch moldings over 40" wheels
  const tahoeAssets = getSharedShowroomAssets();
  const tahoeTubGeo = createCurvedWheelhouseTubGeometry('chevy_tahoe_world', 0.56, 0.42);
  const tahoeArchRimGeo = new THREE.TorusGeometry(0.55, 0.022, 10, 24, Math.PI);
  tahoeArchRimGeo.rotateY(Math.PI / 2);
  const tahoeLinerMat = new THREE.MeshStandardMaterial({
    color: 0x05070b,
    roughness: 0.92,
    metalness: 0.08,
    side: THREE.DoubleSide,
  });
  [tahoeSpec.archZFront, tahoeSpec.archZRear].forEach((az) => {
    const st = evaluateHullStation(tahoeSpec, az);
    const fx = st.halfW * tahoeSpec.shoulderTuck + tahoeSpec.archLipFlare * 0.65;
    ([-1, 1] as const).forEach((side) => {
      const flare = new THREE.Mesh(tahoeArchRimGeo, paintMat);
      flare.position.set(side * (fx + 0.01), tahoeSpec.archY + tahoeYOff, az);
      const liner = new THREE.Mesh(tahoeTubGeo, tahoeLinerMat);
      liner.position.set(side * (fx - 0.16), tahoeSpec.archY + tahoeYOff, az);
      liner.userData.noShadowCast = true;
      handles.chassisGroup.add(flare, liner);
    });
  });

  // Exterior Side "SAVAGE LIFE GAMING" / "SUBSCRIBE" Livery Panels on Left & Right Body Sides
  if (livery) {
    const liveryTex = createSavageLifeLiveryTexture(
      livery.channelName,
      livery.ctaText,
      livery.accentColor,
      '#12151c',
    );
    const liveryMat = liveryTex
      ? new THREE.MeshStandardMaterial({
          map: liveryTex,
          roughness: 0.22,
          metalness: 0.2,
          polygonOffset: true,
          polygonOffsetFactor: -1,
        })
      : new THREE.MeshStandardMaterial({
          color: livery.accentColor,
          roughness: 0.3,
          metalness: 0.3,
        });
    const liveryGeo = new THREE.PlaneGeometry(1.74, 0.44);
    ([-1, 1] as const).forEach((side) => {
      const decalPanel = new THREE.Mesh(liveryGeo, liveryMat);
      decalPanel.position.set(side * 1.06, 0.56, -1.48);
      decalPanel.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
      decalPanel.userData.noShadowCast = true;
      handles.chassisGroup.add(decalPanel);
    });
  }

  // 4. MASSIVE PORTED SUBWOOFER WALL DIRECTLY BEHIND THE DRIVER SEAT (NO BACKSEAT)!
  const subGlowColor = new THREE.Color(vehicle.rimLightColor || vehicle.underglowColor || '#38bdf8');
  const subGlowMat = new THREE.MeshStandardMaterial({
    color: subGlowColor,
    emissive: subGlowColor,
    emissiveIntensity: 1.8,
    roughness: 0.2,
  });
  const subBoxMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.82,
    metalness: 0.18,
  });
  const subBaffleMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.36,
    metalness: 0.55,
  });
  const surroundMat = new THREE.MeshStandardMaterial({
    color: 0x09090b,
    roughness: 0.88,
  });
  const coneMat = new THREE.MeshStandardMaterial({
    color: 0x27272a,
    roughness: 0.35,
    metalness: 0.65,
  });

  const subWallGroup = new THREE.Group();
  // Positioned directly behind driver (-0.44, z=0.16) and passenger (+0.44, z=0.16)
  subWallGroup.position.set(0, 0.6, -0.78);
  const subBox = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.88, 0.66), subBoxMat);
  const frontBaffle = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.82, 0.06), subBaffleMat);
  frontBaffle.position.z = 0.33;
  // Center vertical slotted bass port with glowing LED acrylic strips
  const portCavity = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.72, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x020617, roughness: 0.95 }),
  );
  portCavity.position.z = 0.34;
  const subGlowMeshes: THREE.Mesh[] = [];
  [-0.1, 0.1].forEach((gx) => {
    const portLed = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.74, 0.04), subGlowMat);
    portLed.position.set(gx, 0, 0.36);
    subWallGroup.add(portLed);
    subGlowMeshes.push(portLed);
  });
  const topLedBar = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.032, 0.04), subGlowMat);
  topLedBar.position.set(0, 0.41, 0.36);
  subWallGroup.add(subBox, frontBaffle, portCavity, topLedBar);
  subGlowMeshes.push(topLedBar);

  // 4× Giant 15"/18" Excursion Subwoofers (2 behind driver on left, 2 behind passenger on right)
  const subwooferCones: THREE.Object3D[] = [];
  const subCoords = [
    { x: -0.46, y: 0.2 }, // Top-left directly behind driver's headrest
    { x: -0.46, y: -0.2 }, // Bottom-left directly behind driver's seat back
    { x: 0.46, y: 0.2 }, // Top-right behind passenger
    { x: 0.46, y: -0.2 }, // Bottom-right behind passenger
  ];
  for (const sc of subCoords) {
    const surround = new THREE.Mesh(
      new THREE.TorusGeometry(0.175, 0.026, 10, 22),
      surroundMat,
    );
    surround.position.set(sc.x, sc.y, 0.365);
    const ledRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.195, 0.01, 8, 22),
      subGlowMat,
    );
    ledRing.position.set(sc.x, sc.y, 0.365);
    subGlowMeshes.push(ledRing);

    const conePivot = new THREE.Group();
    conePivot.position.set(sc.x, sc.y, 0.36);
    conePivot.userData.baseZ = 0.36;
    const cone = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.06, 0.065, 20),
      coneMat,
    );
    cone.rotation.x = Math.PI / 2;
    const dustCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.072, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
      chromeMat,
    );
    dustCap.rotation.x = Math.PI / 2;
    dustCap.position.z = 0.025;
    conePivot.add(cone, dustCap);
    subWallGroup.add(surround, ledRing, conePivot);
    subwooferCones.push(conePivot);
  }

  // Dual Chrome Competition Amps mounted on the back/top of the sub wall (visible through liftgate!)
  [-0.42, 0.42].forEach((ax) => {
    const amp = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.09, 0.34), chromeMat);
    amp.position.set(ax, 0.48, -0.05);
    const ampMeter = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.02, 0.06), subGlowMat);
    ampMeter.position.set(ax, 0.53, -0.05);
    subWallGroup.add(amp, ampMeter);
    subGlowMeshes.push(ampMeter);
  });

  handles.chassisGroup.add(subWallGroup);
  handles.subwooferCones = subwooferCones;
  handles.subGlowMeshes = subGlowMeshes;

  // 5. Tahoe Interior Cabin (Swept Curved Wrap Dash, Backlit Gauge Cluster, Console, Buttons)
  const dash = new THREE.Mesh(
    createCurvedDashboardGeometry('tahoe_world_dash', 1.62, 0.36),
    darkTrimMat,
  );
  dash.position.set(0, 0.86, 0.6);
  const dashTrim = new THREE.Mesh(
    createSweptTubeGeometry(
      'tahoe_world_dashtrim',
      [
        [-0.76, 0.82, 0.42],
        [0, 0.84, 0.46],
        [0.76, 0.82, 0.42],
      ],
      0.03,
      12,
      8,
    ),
    dashMat,
  );

  const gaugeBezel = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.03), chromeMat);
  gaugeBezel.position.set(-0.44, 0.78, 0.44);
  const tahoeGaugeTex = getGaugeClusterMap();
  const gaugeCluster = new THREE.Mesh(
    new THREE.PlaneGeometry(0.46, 0.14),
    tahoeGaugeTex
      ? new THREE.MeshBasicMaterial({ map: tahoeGaugeTex })
      : new THREE.MeshStandardMaterial({ color: 0x0f172a, emissive: 0x38bdf8, emissiveIntensity: 0.9 }),
  );
  gaugeCluster.position.set(-0.44, 0.78, 0.422);
  gaugeCluster.rotation.y = Math.PI;
  gaugeCluster.userData.noShadowCast = true;

  const centerBezel = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.2, 0.035), chromeMat);
  centerBezel.position.set(0, 0.74, 0.45);
  const centerScreen = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.16, 0.042),
    new THREE.MeshStandardMaterial({
      color: 0x020617,
      emissive: 0x6366f1,
      emissiveIntensity: 0.9,
      roughness: 0.12,
    }),
  );
  centerScreen.position.set(0, 0.74, 0.44);
  handles.chassisGroup.add(dashTrim, gaugeBezel, centerBezel);

  const centerConsole = new THREE.Mesh(
    createCurvedDeckPanelGeometry({
      key: 'tahoe_console',
      width: 0.3,
      length: 1.08,
      crownY: 0.045,
      dropRearY: 0.01,
      taperRear: 0.1,
      forwardZ: false,
    }),
    dashMat,
  );
  centerConsole.position.set(0, 0.42, 0.64);
  const shifter = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.2, 10), chromeMat);
  shifter.position.set(0, 0.5, 0.26);
  const shifterKnob = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 10), chromeMat);
  shifterKnob.position.set(0, 0.6, 0.26);

  // Pressable Interior Console Button 1: 40" Rim Lights & Underglow (Lit / Blink / Music Sync / Off)
  const rimLightButtonGroup = new THREE.Group();
  rimLightButtonGroup.position.set(-0.075, 0.45, 0.46);
  const rimBtnBezel = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.032, 0.12), chromeMat);
  const rimBtnCapMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x38bdf8,
    emissiveIntensity: 1.65,
    roughness: 0.24,
    metalness: 0.25,
  });
  const rimBtnCap = new THREE.Mesh(new THREE.BoxGeometry(0.084, 0.042, 0.084), rimBtnCapMat);
  rimBtnCap.position.y = 0.024;
  const rimBtnProxy = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.18, 0.22),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  rimBtnProxy.position.y = 0.04;
  rimBtnProxy.userData.isRimLightButton = true;
  rimBtnCap.userData.isRimLightButton = true;
  rimBtnBezel.userData.isRimLightButton = true;
  rimLightButtonGroup.add(rimBtnBezel, rimBtnCap, rimBtnProxy);
  handles.rimLightButton = rimLightButtonGroup;
  handles.rimLightButtonCap = rimBtnCap;

  // Pressable Interior Console Button 2: Air-Ride Lift / 3" Slammed Stance
  const liftButtonGroup = new THREE.Group();
  liftButtonGroup.position.set(0.075, 0.45, 0.46);
  const liftBtnBezel = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.032, 0.12), chromeMat);
  const liftBtnCapMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.55,
    roughness: 0.24,
    metalness: 0.25,
  });
  const liftBtnCap = new THREE.Mesh(new THREE.BoxGeometry(0.084, 0.042, 0.084), liftBtnCapMat);
  liftBtnCap.position.y = 0.024;
  const liftBtnProxy = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.18, 0.22),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  liftBtnProxy.position.y = 0.04;
  liftBtnProxy.userData.isLiftButton = true;
  liftBtnCap.userData.isLiftButton = true;
  liftBtnBezel.userData.isLiftButton = true;
  liftButtonGroup.add(liftBtnBezel, liftBtnCap, liftBtnProxy);
  handles.liftButton = liftButtonGroup;
  handles.liftButtonCap = liftBtnCap;

  // Photorealistic Leather, Chrome & Paddle-Shift Sport SUV Steering Wheel
  const helmWheel = buildDetailedSteeringWheel({
    style: 'sport_suv',
    radius: 0.18,
    chromeMat,
    leatherMat,
    accentColor: 0x38bdf8,
  });
  helmWheel.position.set(-0.44, 0.84, 0.42);
  helmWheel.rotation.x = 0.44;
  handles.helmWheel = helmWheel;

  handles.chassisGroup.add(
    dash,
    gaugeCluster,
    centerScreen,
    centerConsole,
    shifter,
    shifterKnob,
    rimLightButtonGroup,
    liftButtonGroup,
    helmWheel,
  );

  // Driver & Front Passenger Sculpted Bolstered Bucket Seats
  const tahoeSeatGeo = createSculptedSeatBucketGeometry('racing_bucket', 0.52);
  [-0.44, 0.44].forEach((sx) => {
    const seat = new THREE.Mesh(tahoeSeatGeo, leatherMat);
    seat.position.set(sx, 0.42, 0.08);
    const stripe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.36, 8, 1, false, 0, Math.PI),
      stitchMat,
    );
    stripe.position.set(sx, 0.56, -0.09);
    stripe.rotation.x = -0.12;
    handles.chassisGroup.add(seat, stripe);
  });

  // 6. Real Working Hinged Curved Front Doors (Contoured Skin, Handle, Armrest, Aero Mirror!)
  const doorLen = 1.46;
  const doorH = 0.66;
  const tDoorMid = evaluateHullStation(tahoeSpec, 0.05);
  ([-1, 1] as const).forEach((side) => {
    const doorPivot = new THREE.Group();
    doorPivot.position.set(side * (tDoorMid.halfW * 0.99), 0.18, 0.76);
    const outerSkin = new THREE.Mesh(
      createCurvedDoorSkinGeometry({
        key: 'tahoe_world_door',
        side,
        length: doorLen,
        height: doorH,
        bowOut: 0.048,
        tumblehomeTopIn: 0.04,
      }),
      paintMat,
    );
    const innerCard = new THREE.Mesh(
      createCurvedDoorSkinGeometry({
        key: 'tahoe_world_door_in',
        side: (side < 0 ? 1 : -1) as -1 | 1,
        length: doorLen * 0.92,
        height: doorH * 0.85,
        bowOut: 0.02,
        tumblehomeTopIn: 0.02,
      }),
      leatherMat,
    );
    innerCard.position.set(-side * 0.04, doorH * 0.06, -0.04);
    const armrest = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.065, 0.46), darkTrimMat);
    armrest.position.set(-side * 0.06, doorH * 0.46, -doorLen * 0.55);
    const speakerRing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.018, 12),
      chromeMat,
    );
    speakerRing.rotation.z = Math.PI / 2;
    speakerRing.position.set(-side * 0.06, doorH * 0.24, -0.32);

    const handleAssy = buildDoorHandleAssembly({
      side,
      chromeMat,
      pocketMat: darkTrimMat,
      withKeyCylinder: true,
    });
    handleAssy.position.set(side * 0.022, doorH * 0.76, -doorLen * 0.72);
    const doorGlass = new THREE.Mesh(
      createCurvedSideGlassGeometry({
        key: 'tahoe_dglass',
        side,
        frontZ: -0.08,
        rearZ: -doorLen * 0.88,
        bottomY: doorH - 0.02,
        topY: doorH + 0.48,
        bottomX: 0.01,
        topX: 0.075,
        midBowOut: 0.02,
      }),
      glassMat,
    );
    doorGlass.position.x = -side * 0.03;
    const mirrorAssy = buildRealisticSideMirror({
      side,
      housingMat: paintMat,
      chromeMat,
      style: 'aero',
    });
    mirrorAssy.position.set(side * 0.02, doorH + 0.04, -0.18);

    doorPivot.add(
      outerSkin,
      innerCard,
      armrest,
      speakerRing,
      handleAssy,
      doorGlass,
      mirrorAssy,
    );
    handles.chassisGroup.add(doorPivot);
    if (side < 0) handles.doorLeft = doorPivot;
    else handles.doorRight = doorPivot;
  });

  // 7. Curved Chevy Tahoe SUV Greenhouse, Windshield, Swept Pillars, Curved Roof & Roof Rack
  const tRoofY = tahoeSpec.roofHeight + tahoeYOff; // ~1.48m in chassis local
  const tCowlY = tahoeSpec.beltY + tahoeYOff - 0.04; // ~0.86m
  const tCowlZ = tahoeSpec.windshieldZ;
  const tRoofFrontZ = tCowlZ - 0.28;
  const tCowlSt = evaluateHullStation(tahoeSpec, tCowlZ);
  const tBaseWsW = tCowlSt.halfW * tahoeSpec.shoulderTuck * 1.84;
  const tTopWsW = tahoeSpec.roofHalfWidth * 1.9;

  const windshield = new THREE.Mesh(
    createCurvedWindshieldGeometry({
      key: 'tahoe_world_ws',
      baseWidth: tBaseWsW,
      topWidth: tTopWsW,
      bottomY: tCowlY,
      topY: tRoofY - 0.02,
      bottomZ: tCowlZ,
      topZ: tRoofFrontZ,
      wrapZ: tahoeSpec.windshieldWrap,
      crown: 0.04,
    }),
    glassMat,
  );
  const tahoeWipers = buildWindshieldWipers(tBaseWsW * 0.78);
  tahoeWipers.position.set(0, tCowlY + 0.03, tCowlZ + tahoeSpec.windshieldWrap * 0.82);
  const tahoeCabinKit = buildCabinDetailKit({
    mirrorY: tRoofY - 0.1,
    mirrorZ: tRoofFrontZ - 0.06,
    dashY: 0.84,
    pedalZ: tCowlZ,
    driverX: -0.44,
    trimMat: darkTrimMat,
    chromeMat,
  });
  handles.chassisGroup.add(windshield, tahoeWipers, tahoeCabinKit);

  // Swept Curved A, B, C, D SUV Pillars
  ([-1, 1] as const).forEach((side) => {
    const aPillar = new THREE.Mesh(
      createSweptTubeGeometry(
        `tahoe_apillar:${side}`,
        [
          [side * (tBaseWsW * 0.5), tCowlY, tCowlZ],
          [side * (tTopWsW * 0.5), tRoofY - 0.02, tRoofFrontZ],
        ],
        0.04,
        10,
        8,
      ),
      paintMat,
    );
    handles.chassisGroup.add(aPillar);

    [-0.1, -1.06, -2.14].forEach((pz, pIdx) => {
      const pSt = evaluateHullStation(tahoeSpec, pz);
      const pillarGeo = createSweptTubeGeometry(
        `tahoe_pillar:${side}:${pIdx}`,
        [
          [side * (pSt.halfW * 0.92), tCowlY, pz],
          [side * (tahoeSpec.roofHalfWidth + 0.02), tRoofY - 0.03, pz + (pIdx === 2 ? 0.08 : 0)],
        ],
        pIdx === 2 ? 0.065 : 0.048,
        8,
        8,
      );
      handles.chassisGroup.add(new THREE.Mesh(pillarGeo, pIdx === 2 ? paintMat : darkTrimMat));
    });

    // Tinted Curved Rear SUV Side Windows (showing subwoofer wall silhouette inside!)
    const rearSideGlass = new THREE.Mesh(
      createCurvedSideGlassGeometry({
        key: 'tahoe_rear_sglass',
        side,
        frontZ: -0.08,
        rearZ: -2.12,
        bottomY: tCowlY + 0.01,
        topY: tRoofY - 0.04,
        bottomX: tBaseWsW * 0.495,
        topX: tTopWsW * 0.485,
        midBowOut: 0.028,
      }),
      glassMat,
    );
    handles.chassisGroup.add(rearSideGlass);
  });

  // Sculpted Compound-Curved SUV Roof + Chrome Roof Rack Rails
  const roofCap = new THREE.Mesh(
    createSculptedRoofCanopyGeometry({
      key: 'tahoe_world_roof',
      frontZ: tRoofFrontZ,
      rearZ: -2.16,
      frontHalfW: tTopWsW * 0.5,
      rearHalfW: tahoeSpec.roofHalfWidth + 0.02,
      frontY: tRoofY - 0.01,
      peakY: tRoofY + 0.03,
      rearY: tRoofY - 0.02,
      crown: 0.048,
      isSuv: true,
    }),
    paintMat,
  );
  roofCap.userData.isVehicleShadowHull = true;
  handles.chassisGroup.add(roofCap);

  [-0.72, 0.72].forEach((rx) => {
    const rail = new THREE.Mesh(
      createSweptTubeGeometry(
        `tahoe_rack:${rx}`,
        [
          [rx, tRoofY + 0.05, -2.02],
          [rx, tRoofY + 0.075, -0.8],
          [rx, tRoofY + 0.055, 0.35],
        ],
        0.024,
        14,
        8,
      ),
      chromeMat,
    );
    handles.chassisGroup.add(rail);
  });
  [-0.1, -1.55].forEach((cz) => {
    const crossBar = new THREE.Mesh(
      createSweptTubeGeometry(
        `tahoe_cross:${cz}`,
        [
          [-0.72, tRoofY + 0.07, cz],
          [0, tRoofY + 0.095, cz],
          [0.72, tRoofY + 0.07, cz],
        ],
        0.018,
        10,
        6,
      ),
      darkTrimMat,
    );
    handles.chassisGroup.add(crossBar);
  });

  // Animated Hinged Contoured Rear Liftgate / Hatch
  const bowtieTex = getChevyBowtieMap();
  const savagePlateTex = getLicensePlateMap('SAVAGE');
  const liftgateHinge = new THREE.Group();
  liftgateHinge.position.set(0, tRoofY - 0.02, rearZ + 0.08);
  const liftgateUpperGlass = new THREE.Mesh(
    createCurvedRearGlassGeometry({
      key: 'tahoe_liftglass',
      topWidth: tTopWsW * 0.82,
      bottomWidth: 1.66,
      topY: -0.04,
      bottomY: -0.54,
      topZ: 0.06,
      bottomZ: -0.02,
      wrapZ: 0.07,
    }),
    glassMat,
  );
  const liftgateLowerPanel = new THREE.Mesh(
    createCurvedRearGlassGeometry({
      key: 'tahoe_liftpanel',
      topWidth: 1.72,
      bottomWidth: 1.78,
      topY: -0.54,
      bottomY: -1.1,
      topZ: -0.02,
      bottomZ: -0.04,
      wrapZ: 0.07,
    }),
    paintMat,
  );
  const liftgateBadge = bowtieTex
    ? new THREE.Mesh(
        new THREE.PlaneGeometry(0.24, 0.12),
        new THREE.MeshBasicMaterial({ map: bowtieTex, transparent: true, alphaTest: 0.12 }),
      )
    : new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.04), chromeMat);
  liftgateBadge.position.set(0, -0.66, -0.1);
  if (bowtieTex) liftgateBadge.rotation.y = Math.PI;
  liftgateBadge.userData.noShadowCast = true;
  const liftgateChromeBar = new THREE.Mesh(
    createSweptTubeGeometry(
      'tahoe_liftbar',
      [
        [-0.68, -0.78, -0.06],
        [0, -0.78, -0.1],
        [0.68, -0.78, -0.06],
      ],
      0.018,
      10,
      8,
    ),
    chromeMat,
  );
  const rearPlateFrame = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.03), chromeMat);
  rearPlateFrame.position.set(0, -0.96, -0.092);
  liftgateHinge.add(
    liftgateUpperGlass,
    liftgateLowerPanel,
    liftgateBadge,
    liftgateChromeBar,
    rearPlateFrame,
  );
  if (savagePlateTex) {
    const rPlate = new THREE.Mesh(
      new THREE.PlaneGeometry(0.28, 0.13),
      new THREE.MeshBasicMaterial({ map: savagePlateTex }),
    );
    rPlate.rotation.y = Math.PI;
    rPlate.position.set(0, -0.96, -0.11);
    rPlate.userData.noShadowCast = true;
    liftgateHinge.add(rPlate);
  }
  handles.chassisGroup.add(liftgateHinge);
  handles.trunkLid = liftgateHinge;

  // 8. Chevy Front 3D Chrome Split-Bar Grille, Bowtie, Wrap-Around Chrome Bumpers, Projector Headlights & LED Taillights
  const frontBumper = new THREE.Mesh(
    createWrapAroundBumperGeometry({
      key: 'tahoe_fbump',
      halfWidth: 1.0,
      wrapBackZ: 0.32,
      centerCurveZ: 0.14,
      height: 0.19,
      thickness: 0.17,
    }),
    chromeMat,
  );
  frontBumper.position.set(0, 0.2, frontZ);
  const rearBumper = new THREE.Mesh(
    createWrapAroundBumperGeometry({
      key: 'tahoe_rbump',
      halfWidth: 1.0,
      wrapBackZ: 0.32,
      centerCurveZ: 0.12,
      height: 0.19,
      thickness: 0.17,
      isRear: true,
    }),
    chromeMat,
  );
  rearBumper.position.set(0, 0.2, rearZ);

  const frontPlateFrame = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.03), chromeMat);
  frontPlateFrame.position.set(0, 0.19, frontZ + 0.185);
  if (savagePlateTex) {
    const fPlate = new THREE.Mesh(
      new THREE.PlaneGeometry(0.28, 0.13),
      new THREE.MeshBasicMaterial({ map: savagePlateTex }),
    );
    fPlate.position.set(0, 0.19, frontZ + 0.203);
    fPlate.userData.noShadowCast = true;
    handles.chassisGroup.add(fPlate);
  }

  const grilleAssy = buildRealisticGrilleAssembly({
    width: 1.36,
    height: 0.34,
    chromeMat,
    horizontalBars: 2,
    emblemTexture: bowtieTex,
  });
  grilleAssy.position.set(0, 0.52, frontZ + 0.035);
  handles.chassisGroup.add(frontBumper, rearBumper, frontPlateFrame, grilleAssy);

  // Stacked Chevy Quad HID Projector Headlights + Fluted Amber Corners + Tall Fluted SUV Taillights
  const tahoeAmberTex = getAmberSignalLensTextureSet();
  const tahoeAmberMat = new THREE.MeshPhysicalMaterial({
    color: 0xfbbf24,
    map: tahoeAmberTex.map,
    normalMap: tahoeAmberTex.normalMap,
    normalScale: new THREE.Vector2(0.42, 0.42),
    emissive: 0xf59e0b,
    emissiveIntensity: 0.72,
    metalness: 0.08,
    roughness: 0.06,
    clearcoat: 1.0,
    clearcoatRoughness: 0.02,
    envMapIntensity: 2.2,
  });
  tahoeAmberMat.userData.preserveEnvMapIntensity = true;

  [-0.84, 0.84].forEach((hx) => {
    const upperBeam = buildRealisticHeadlightPod({
      shape: 'quad_bar',
      width: 0.25,
      height: 0.115,
      chromeMat,
      tintColor: 0xe0f2fe,
    });
    upperBeam.position.set(hx, 0.58, frontZ + 0.025);
    const lowerBezel = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.105, 0.05), chromeMat);
    lowerBezel.position.set(hx, 0.44, frontZ + 0.018);
    const lowerAmber = new THREE.Mesh(new THREE.BoxGeometry(0.235, 0.082, 0.056), tahoeAmberMat);
    lowerAmber.position.set(hx, 0.44, frontZ + 0.024);
    lowerAmber.userData.noShadowCast = true;
    handles.chassisGroup.add(upperBeam, lowerBezel, lowerAmber);
  });
  [-0.9, 0.9].forEach((tx) => {
    const tail = buildRealisticTaillightPod({
      style: 'blade',
      width: 0.145,
      height: 0.34,
      chromeMat,
    });
    tail.position.set(tx, 0.68, rearZ - 0.02);
    const turnCell = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.05), tahoeAmberMat);
    turnCell.position.set(tx, 0.44, rearZ - 0.022);
    turnCell.userData.noShadowCast = true;
    handles.chassisGroup.add(tail, turnCell);
  });

  // Dual Chrome Exhaust Tips with dark recessed inner bores
  [-0.64, 0.64].forEach((ex) => {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.38, 12), chromeMat);
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(ex, 0.1, rearZ - 0.14);
    const bore = new THREE.Mesh(new THREE.CircleGeometry(0.04, 12), tahoeAssets.darkInnerMat);
    bore.rotation.y = Math.PI;
    bore.position.set(ex, 0.1, rearZ - 0.332);
    bore.userData.noShadowCast = true;
    handles.chassisGroup.add(pipe, bore);
  });

  // 9. Undercarriage Glow (Full-Perimeter Neon Tubes + Ground PointLight)
  const glowColor = new THREE.Color(vehicle.underglowColor || '#38bdf8');
  const glowMat = new THREE.MeshStandardMaterial({
    color: glowColor,
    emissive: glowColor,
    emissiveIntensity: 2.3,
    roughness: 0.2,
  });
  const glowMeshes: THREE.Mesh[] = [];
  [-0.94, 0.94].forEach((gx) => {
    const tube = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.035, 3.65), glowMat);
    tube.position.set(gx, 0.02, 0.05);
    handles.chassisGroup.add(tube);
    glowMeshes.push(tube);
  });
  [frontZ - 0.14, rearZ + 0.14].forEach((gz) => {
    const tube = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.035, 0.06), glowMat);
    tube.position.set(0, 0.02, gz);
    handles.chassisGroup.add(tube);
    glowMeshes.push(tube);
  });
  const underLight = new THREE.PointLight(glowColor.getHex(), 2.2, 9.5, 1.4);
  underLight.position.set(0, 0.06, 0.05);
  handles.chassisGroup.add(underLight);
  handles.underglowLight = underLight;
  handles.underglowMeshes = glowMeshes;

  // 10. Attach 4 Massive 40-Inch Forgiato "44" Auto-Spinner Rims with Blinking/Music LEDs!
  const rimLedColor = new THREE.Color(vehicle.rimLightColor || vehicle.underglowColor || '#38bdf8');
  const rimLedMat = new THREE.MeshStandardMaterial({
    color: rimLedColor,
    emissive: rimLedColor,
    emissiveIntensity: 2.4,
    roughness: 0.15,
    metalness: 0.2,
  });
  handles.rimLightMaterials = [rimLedMat];
  handles.rimLightMeshes = [];
  handles.spinners = [];

  const trackHalf = 1.06;
  const wheelCoords: {
    corner: 'fl' | 'fr' | 'rl' | 'rr';
    x: number;
    z: number;
    side: -1 | 1;
    isFront: boolean;
  }[] = [
    { corner: 'fl', x: -trackHalf, z: 1.44, side: -1, isFront: true },
    { corner: 'fr', x: trackHalf, z: 1.44, side: 1, isFront: true },
    { corner: 'rl', x: -trackHalf, z: -1.32, side: -1, isFront: false },
    { corner: 'rr', x: trackHalf, z: -1.32, side: 1, isFront: false },
  ];

  for (const wc of wheelCoords) {
    const cornerRoot = new THREE.Group();
    cornerRoot.position.set(wc.x, baseWheelY, wc.z);
    const { steerPivot, spinGroup, spinnerHub } = buildCustomWheel(
      'forgiato_40_spinner',
      wc.side,
      rimColor,
      wheelScale,
      chromeMat,
      rimLedMat,
    );
    cornerRoot.add(steerPivot);
    handles.root.add(cornerRoot);

    handles.wheels.push(spinGroup);
    if (spinnerHub) {
      handles.spinners.push(spinnerHub);
    }
    if (wc.isFront) {
      handles.steerWheels.push(steerPivot);
    }
    handles.wheelCorners.push({
      obj: cornerRoot,
      corner: wc.corner,
      baseY: baseWheelY,
    });
  }
}

function buildModulePart(
  m: VehicleModulePlacement,
  paintColor: string,
  rimColor: string,
  wheelScale: number,
  handles: ModularVehicleMeshHandles,
): THREE.Group {
  const part = new THREE.Group();
  const cellXZ = 1.05;
  const cellY = 0.82;
  part.position.set(m.gx * cellXZ, m.gy * cellY + 0.42, m.gz * cellXZ);

  const paintMat = createAutomotivePaintMaterial(paintColor);
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.34,
    metalness: 0.84,
  });
  const chromeMat = createChromeMaterial(rimColor);
  const brassMat = createChromeMaterial(0xf59e0b);
  const woodMat = createWalnutWoodMaterial();
  const leatherMat = createAutomotiveLeatherMaterial(0x27201a);
  const glassMat = createAutomotiveGlassMaterial(0.38);
  const assets = getSharedShowroomAssets();

  if (m.kind === 'chassis_frame') {
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.14, 0.98), steelMat);
    const barL = new THREE.Mesh(createContouredPanelGeo(0.12, 0.2, 1.02, 0.015, 0.018), paintMat);
    barL.position.x = -0.43;
    const barR = barL.clone();
    barR.position.x = 0.43;
    [-0.36, 0.36].forEach((cz) => {
      const crossRail = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.1, 0.08), steelMat);
      crossRail.position.set(0, -0.02, cz);
      part.add(crossRail);
    });
    part.add(plate, barL, barR);
  } else if (m.kind === 'cockpit_seat') {
    const tub = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.18, 0.96), steelMat);
    const seatCushion = new THREE.Mesh(
      createContouredPanelGeo(0.56, 0.14, 0.5, 0.02, 0.025),
      leatherMat,
    );
    seatCushion.position.set(0, 0.14, -0.08);
    const seatBack = new THREE.Mesh(
      createContouredPanelGeo(0.58, 0.6, 0.15, 0.02, 0.025),
      leatherMat,
    );
    seatBack.position.set(0, 0.44, -0.32);
    seatBack.rotation.x = -0.14;
    const headrest = new THREE.Mesh(
      createContouredPanelGeo(0.28, 0.16, 0.1, 0.02, 0.02),
      leatherMat,
    );
    headrest.position.set(0, 0.8, -0.37);

    const dash = new THREE.Mesh(
      createContouredPanelGeo(0.92, 0.32, 0.28, 0.025, 0.02),
      paintMat,
    );
    dash.position.set(0, 0.3, 0.34);
    const gaugeTex = getGaugeClusterMap();
    if (gaugeTex) {
      const gauge = new THREE.Mesh(
        new THREE.PlaneGeometry(0.4, 0.14),
        new THREE.MeshBasicMaterial({ map: gaugeTex }),
      );
      gauge.position.set(0, 0.34, 0.195);
      gauge.rotation.y = Math.PI;
      gauge.userData.noShadowCast = true;
      part.add(gauge);
    }

    const helmWheel = buildDetailedSteeringWheel({
      style: 'sport_suv',
      radius: 0.175,
      chromeMat,
      leatherMat,
      accentColor: 0xf59e0b,
    });
    helmWheel.position.set(0, 0.48, 0.18);
    helmWheel.rotation.x = 0.45;
    handles.helmWheel = helmWheel;

    // Sloped framed safety-glass windshield & dual round chrome headlamps
    const wsFrame = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.46, 0.036), glassMat);
    wsFrame.position.set(0, 0.68, 0.32);
    wsFrame.rotation.x = -0.34;
    [-0.45, 0.45].forEach((px) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.48, 0.055), chromeMat);
      post.position.set(px, 0.68, 0.32);
      post.rotation.x = -0.34;
      part.add(post);
    });
    const topBar = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.045, 0.06), chromeMat);
    topBar.position.set(0, 0.9, 0.24);
    const wipers = buildWindshieldWipers(0.76);
    wipers.position.set(0, 0.48, 0.4);

    [-0.32, 0.32].forEach((hx) => {
      const pod = buildRealisticHeadlightPod({
        shape: 'round',
        radius: 0.072,
        chromeMat,
        withHood: true,
      });
      pod.position.set(hx, 0.32, 0.5);
      part.add(pod);
    });

    part.add(tub, seatCushion, seatBack, headrest, dash, helmWheel, wsFrame, topBar, wipers);
  } else if (m.kind === 'armor_plate') {
    const slab = new THREE.Mesh(createContouredPanelGeo(1.04, 0.62, 1.02, 0.03, 0.025), paintMat);
    slab.position.y = 0.14;
    const bumper = new THREE.Mesh(
      createContouredPanelGeo(1.08, 0.18, 0.22, 0.02, 0.02),
      chromeMat,
    );
    bumper.position.set(0, 0.04, 0.46);
    const grille = buildRealisticGrilleAssembly({
      width: 0.72,
      height: 0.26,
      chromeMat,
      horizontalBars: 2,
    });
    grille.position.set(0, 0.22, 0.5);
    const rivetL = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.48, 0.85), steelMat);
    rivetL.position.set(-0.48, 0.15, 0);
    const rivetR = rivetL.clone();
    rivetR.position.x = 0.48;
    [-0.36, 0.36].forEach((tx) => {
      const tailPod = buildRealisticTaillightPod({
        style: 'round',
        radius: 0.052,
        chromeMat,
      });
      tailPod.position.set(tx, 0.22, -0.52);
      part.add(tailPod);
    });
    part.add(slab, bumper, grille, rivetL, rivetR);
  } else if (m.kind === 'offroad_wheel') {
    const sideSign: -1 | 1 = m.gx < 0 ? -1 : 1;
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.12), steelMat);
    strut.position.set(m.gx < 0 ? 0.18 : -0.18, 0.06, 0);
    part.add(strut);

    const steerPivot = new THREE.Group();
    steerPivot.position.set(sideSign * 0.16, -0.04, 0);
    steerPivot.scale.setScalar(wheelScale);
    const spinGroup = new THREE.Group();
    steerPivot.add(spinGroup);

    attachBrakeAssembly(steerPivot, sideSign, 0.23, 0.03, 'orange');

    const tireOuter = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 0.34, 24, 1, true),
      assets.tireMat,
    );
    tireOuter.rotation.z = Math.PI / 2;
    [-0.165, 0.165].forEach((sx) => {
      const sidewall = new THREE.Mesh(
        new THREE.TorusGeometry(0.34, 0.075, 10, 24),
        assets.tireSidewallMat,
      );
      sidewall.rotation.y = Math.PI / 2;
      sidewall.position.x = sx;
      spinGroup.add(sidewall);
    });
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.28, 0.32, 22, 1, true),
      chromeMat,
    );
    barrel.rotation.z = Math.PI / 2;
    const rimLip = new THREE.Mesh(new THREE.TorusGeometry(0.275, 0.022, 8, 22), chromeMat);
    rimLip.rotation.y = Math.PI / 2;
    rimLip.position.x = sideSign * 0.16;
    const hubCap = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.075, 0.08, 12), brassMat);
    hubCap.rotation.z = Math.PI / 2;
    hubCap.position.x = sideSign * 0.13;
    spinGroup.add(tireOuter, barrel, rimLip, hubCap);

    // 12 Beadlock perimeter bolts + 5 lug nuts + 6 sculpted forged spokes
    const boltGeo = new THREE.CylinderGeometry(0.007, 0.007, 0.018, 6);
    boltGeo.rotateZ(Math.PI / 2);
    for (let b = 0; b < 12; b++) {
      const ba = (b / 12) * Math.PI * 2;
      const bolt = new THREE.Mesh(boltGeo, chromeMat);
      bolt.position.set(sideSign * 0.172, Math.cos(ba) * 0.258, Math.sin(ba) * 0.258);
      bolt.userData.noShadowCast = true;
      spinGroup.add(bolt);
    }
    const lugGeo = new THREE.CylinderGeometry(0.011, 0.011, 0.022, 6);
    lugGeo.rotateZ(Math.PI / 2);
    for (let l = 0; l < 5; l++) {
      const la = (l / 5) * Math.PI * 2;
      const lug = new THREE.Mesh(lugGeo, chromeMat);
      lug.position.set(sideSign * 0.145, Math.cos(la) * 0.05, Math.sin(la) * 0.05);
      spinGroup.add(lug);
    }
    const offroadSpokeGeo = getSculptedSpokeGeometry(0.255, 0.044, 0.028, 0.032);
    for (let s = 0; s < 6; s++) {
      const a = (s / 6) * Math.PI * 2;
      const spoke = new THREE.Mesh(offroadSpokeGeo, chromeMat);
      spoke.position.set(sideSign * 0.11, Math.cos(a) * 0.135, Math.sin(a) * 0.135);
      spoke.rotation.x = a;
      spinGroup.add(spoke);
    }

    part.add(steerPivot);
    handles.wheels.push(spinGroup);
    if (m.gz > 0) {
      handles.steerWheels.push(steerPivot);
    }
    const corner: WheelCornerHandle['corner'] =
      m.gz > 0 ? (m.gx < 0 ? 'fl' : 'fr') : m.gx < 0 ? 'rl' : 'rr';
    handles.wheelCorners.push({ obj: steerPivot, corner, baseY: -0.04 });
  } else if (m.kind === 'steam_engine_pod') {
    const block = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.5, 0.88), steelMat);
    block.position.y = 0.18;
    const boilerDrum = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.82, 16), brassMat);
    boilerDrum.rotation.x = Math.PI / 2;
    boilerDrum.position.y = 0.42;
    [-0.28, 0, 0.28].forEach((bz) => {
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.285, 0.016, 8, 18), chromeMat);
      band.position.set(0, 0.42, bz);
      part.add(band);
    });
    const fireboxGlass = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.11, 0.04, 12),
      new THREE.MeshStandardMaterial({
        color: 0xf97316,
        emissive: 0xea580c,
        emissiveIntensity: 1.8,
        roughness: 0.15,
      }),
    );
    fireboxGlass.rotation.x = Math.PI / 2;
    fireboxGlass.position.set(0, 0.42, -0.42);
    const exhaustA = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.095, 0.68, 12), chromeMat);
    exhaustA.position.set(-0.26, 0.72, -0.22);
    const exhaustB = exhaustA.clone();
    exhaustB.position.x = 0.26;
    const piston = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.24, 12), brassMat);
    piston.position.set(0, 0.62, 0.16);
    part.add(block, boilerDrum, fireboxGlass, exhaustA, exhaustB, piston);
    handles.pistons.push(piston);
  } else if (m.kind === 'boat_hull') {
    const pontoon = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.86, 6, 14), woodMat);
    pontoon.rotation.x = Math.PI / 2;
    pontoon.position.y = -0.05;
    const keel = new THREE.Mesh(createContouredPanelGeo(0.88, 0.14, 0.98, 0.02, 0.02), paintMat);
    keel.position.y = 0.16;
    [-0.45, 0.45].forEach((rx) => {
      const rubRail = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.04, 0.96), chromeMat);
      rubRail.position.set(rx, 0.18, 0);
      part.add(rubRail);
    });
    const cleat = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.035, 0.04), brassMat);
    cleat.position.set(0, 0.25, 0.34);
    part.add(pontoon, keel, cleat);
  } else if (m.kind === 'rotor_wing') {
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.58, 12), chromeMat);
    mast.position.y = 0.24;
    const wing = new THREE.Mesh(
      createContouredPanelGeo(1.56, 0.075, 0.48, 0.025, 0.02),
      paintMat,
    );
    wing.position.y = 0.14;
    [-0.76, 0.76].forEach((wx) => {
      const strobe = new THREE.Mesh(
        new THREE.SphereGeometry(0.045, 10, 8),
        new THREE.MeshStandardMaterial({
          color: wx < 0 ? 0xef4444 : 0x22c55e,
          emissive: wx < 0 ? 0xdc2626 : 0x16a34a,
          emissiveIntensity: 1.6,
        }),
      );
      strobe.position.set(wx, 0.14, 0.18);
      strobe.userData.noShadowCast = true;
      part.add(strobe);
    });
    const rotorHub = new THREE.Group();
    rotorHub.position.y = 0.56;
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.15, 0.12, 12), brassMat);
    const bladeA = new THREE.Mesh(
      createContouredPanelGeo(2.38, 0.032, 0.18, 0.01, 0.012),
      steelMat,
    );
    const bladeB = new THREE.Mesh(
      createContouredPanelGeo(0.18, 0.032, 2.38, 0.01, 0.012),
      steelMat,
    );
    rotorHub.add(cap, bladeA, bladeB);
    part.add(mast, wing, rotorHub);
    handles.rotors.push(rotorHub);
  } else if (m.kind === 'steering_rudder') {
    const mount = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.3, 0.65), steelMat);
    const finPivot = new THREE.Group();
    const blade = new THREE.Mesh(
      createContouredPanelGeo(0.09, 0.62, 0.56, 0.015, 0.015),
      paintMat,
    );
    blade.position.y = 0.22;
    finPivot.add(blade);
    part.add(mount, finPivot);
    handles.rudders.push(finPivot);
  } else if (m.kind === 'storage_rack') {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.14, 0.92), steelMat);
    const crate = new THREE.Mesh(createContouredPanelGeo(0.8, 0.52, 0.8, 0.015, 0.02), woodMat);
    crate.position.y = 0.3;
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.09, 0.84), leatherMat);
    strap.position.y = 0.42;
    const clasp = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.88), brassMat);
    clasp.position.y = 0.42;
    part.add(frame, crate, strap, clasp);
  }

  return part;
}

export function createModularVehicleMesh(
  vehicle: ModularVehicleData,
): ModularVehicleMeshHandles {
  const root = new THREE.Group();
  const chassisGroup = new THREE.Group();
  chassisGroup.position.y = vehicle.suspensionOffset ?? 0;
  root.add(chassisGroup);

  const handles: ModularVehicleMeshHandles = {
    root,
    chassisGroup,
    wheels: [],
    steerWheels: [],
    wheelCorners: [],
    rotors: [],
    pistons: [],
    rudders: [],
  };

  if (
    vehicle.preset === 'chevy_tahoe' ||
    vehicle.preset === 'chevy_2000_sub'
  ) {
    buildChevyTahoeShowSuv(vehicle, handles);
    const shadowHulls: THREE.Mesh[] = [];
    root.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        if (obj.userData.isVehicleShadowHull) {
          shadowHulls.push(obj);
        } else {
          obj.userData.noShadowCast = true;
          obj.castShadow = false;
        }
      }
    });
    root.userData.shadowMeshes = shadowHulls;
  } else if (
    vehicle.preset === 'lowrider' ||
    vehicle.preset === 'donk' ||
    vehicle.preset === 'slab' ||
    vehicle.preset === 'cadillac_coupe_deville'
  ) {
    buildCustomStreetShowCar(vehicle, handles);
    const shadowHulls: THREE.Mesh[] = [];
    root.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        if (obj.userData.isVehicleShadowHull) {
          shadowHulls.push(obj);
        } else {
          obj.userData.noShadowCast = true;
          obj.castShadow = false;
        }
      }
    });
    root.userData.shadowMeshes = shadowHulls;
  } else if (vehicle.preset === 'sports_car') {
    buildExoticSupercarMesh(vehicle, handles);
  } else {
    const rimColor = vehicle.rimColor || '#d97706';
    const wheelScale = vehicle.wheelScale ?? 1.0;

    for (const mod of vehicle.modules) {
      const part = buildModulePart(
        mod,
        vehicle.paintColor || '#d97706',
        rimColor,
        wheelScale,
        handles,
      );
      if (mod.kind === 'offroad_wheel') {
        part.position.y -= (vehicle.suspensionOffset ?? 0) * 0.65;
      }
      chassisGroup.add(part);
    }

    // Real working hinged contoured doors + mirrors + trunk lid on ALL other modular cars & craft!
    const doorPaintMat = createAutomotivePaintMaterial(vehicle.paintColor || '#d97706');
    const doorTrimMat = createAutomotiveLeatherMaterial(0x262626);
    const handleMat = createChromeMaterial(rimColor);
    ([-1, 1] as const).forEach((side) => {
      const doorPivot = new THREE.Group();
      doorPivot.position.set(side * 0.64, 0.92, 0.58);
      const panel = new THREE.Mesh(
        createContouredPanelGeo(0.08, 0.54, 1.05, 0.015, 0.018),
        doorPaintMat,
      );
      panel.position.set(0, 0.24, -0.52);
      const innerCard = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.46, 0.96), doorTrimMat);
      innerCard.position.set(-side * 0.045, 0.24, -0.52);
      const handleAssy = buildDoorHandleAssembly({
        side,
        chromeMat: handleMat,
        pocketMat: doorTrimMat,
        withKeyCylinder: true,
      });
      handleAssy.position.set(side * 0.042, 0.38, -0.78);
      const mirrorAssy = buildRealisticSideMirror({
        side,
        housingMat: doorPaintMat,
        chromeMat: handleMat,
        style: 'classic_round',
      });
      mirrorAssy.position.set(side * 0.04, 0.5, -0.18);
      doorPivot.add(panel, innerCard, handleAssy, mirrorAssy);
      chassisGroup.add(doorPivot);
      if (side < 0) handles.doorLeft = doorPivot;
      else handles.doorRight = doorPivot;
    });

    const rearTrunkHinge = new THREE.Group();
    rearTrunkHinge.position.set(0, 1.38, -1.12);
    const rearLid = new THREE.Mesh(
      createContouredPanelGeo(1.06, 0.08, 0.85, 0.02, 0.02),
      doorPaintMat,
    );
    rearLid.position.set(0, 0, -0.42);
    const rearTrim = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.03, 0.04), handleMat);
    rearTrim.position.set(0, 0.02, -0.82);
    rearTrunkHinge.add(rearLid, rearTrim);
    chassisGroup.add(rearTrunkHinge);
    handles.trunkLid = rearTrunkHinge;

    if (vehicle.preset === 'dune_buggy') {
      const cageMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.36, metalness: 0.8 });
      [-0.52, 0.52].forEach((rx) => {
        const hoop = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.8, 10), cageMat);
        hoop.position.set(rx, 1.48, -0.1);
        hoop.rotation.x = 0.68;
        chassisGroup.add(hoop);
      });
      const roofLightBar = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.06, 0.08), cageMat);
      roofLightBar.position.set(0, 1.86, 0.25);
      chassisGroup.add(roofLightBar);
      [-0.32, 0, 0.32].forEach((lx) => {
        const pod = buildRealisticHeadlightPod({
          shape: 'round',
          radius: 0.065,
          chromeMat: handleMat,
        });
        pod.position.set(lx, 1.92, 0.28);
        chassisGroup.add(pod);
      });
    }
  }

  markVehicleLightingPreserved(root);

  const noShadowSet = new Set<THREE.Object3D>([
    ...(handles.underglowMeshes ?? []),
    ...(handles.rimLightMeshes ?? []),
    ...(handles.subGlowMeshes ?? []),
    ...(handles.subwooferCones ?? []),
  ]);
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      const mat = Array.isArray(obj.material) ? obj.material[0] : obj.material;
      const isTransparentOrGlow = Boolean(mat && (mat as THREE.Material).transparent);
      if (obj.geometry && !obj.geometry.boundingSphere) {
        obj.geometry.computeBoundingSphere();
      }
      const smallPart = (obj.geometry?.boundingSphere?.radius ?? 1) < 0.24;
      if (noShadowSet.has(obj) || obj.userData.noShadowCast || isTransparentOrGlow || smallPart) {
        obj.userData.noShadowCast = true;
        obj.castShadow = false;
        obj.receiveShadow = !isTransparentOrGlow && !noShadowSet.has(obj);
      } else {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    }
  });
  return handles;
}

export function buildRealisticTahoeRig(spec: GarageVehicleSpec): BuiltVehicleRig {
  const vehicle = createVehicleFromPreset(spec.id, 'chevy_tahoe', 0, 0, 0, 0);
  vehicle.name = spec.name;
  if (spec.livery) {
    vehicle.paintColor = spec.livery.bodyColor;
    vehicle.livery = { ...spec.livery };
  }
  const handles = createModularVehicleMesh(vehicle);
  const subCones = (handles.subwooferCones ?? []).filter(
    (obj): obj is THREE.Mesh => obj instanceof THREE.Mesh,
  );
  return {
    root: handles.root,
    bodyGroup: handles.chassisGroup,
    wheels: handles.wheels,
    subCones:
      subCones.length > 0
        ? subCones
        : ((handles.subwooferCones ?? []) as unknown as THREE.Mesh[]),
    dispose: () => {
      handles.root.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          if (obj.geometry && !obj.geometry.userData?.sharedAsset) {
            obj.geometry.dispose();
          }
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const m of mats) {
            if (!m || m.userData?.sharedAsset) continue;
            const std = m as THREE.MeshStandardMaterial;
            if (std.map && !std.map.userData?.sharedAsset) std.map.dispose();
            if (std.emissiveMap && !std.emissiveMap.userData?.sharedAsset) std.emissiveMap.dispose();
            m.dispose();
          }
        }
      });
    },
  };
}

function buildExoticSupercarMesh(
  vehicle: ModularVehicleData,
  handles: ModularVehicleMeshHandles,
): void {
  const profile = resolveVehicleProfile(vehicle);
  const rig = buildRealLifeCarRig({
    id: vehicle.carId || vehicle.id,
    displayName: vehicle.name || profile.id,
    archetype: profile.archetype !== 'generic_car' ? profile.archetype : 'mclaren',
    paintColor: vehicle.livery?.bodyColor ?? vehicle.paintColor ?? profile.paintColor,
    secondaryColor: vehicle.accentColor ?? profile.accentColor,
    rimColor: vehicle.rimColor ?? profile.rimColor,
    underglowColor: vehicle.underglowColor ?? profile.underglowColor,
    wheelRadius: profile.wheelRadius,
    wheelWidth: profile.wheelWidth,
    wheelBaseZ: profile.wheelBaseZ,
    trackWidthX: profile.trackWidthX,
    hasSubwooferWall: false,
    liveryText: vehicle.livery
      ? {
          title: vehicle.livery.channelName,
          badge: vehicle.livery.ctaText,
          accentColor: vehicle.livery.accentColor,
        }
      : undefined,
  });

  handles.chassisGroup.position.y = Math.max(
    -0.04,
    (vehicle.suspensionOffset ?? -0.1) + 0.1,
  );

  // Move sculpted body, aero, interior, and hinged panels onto handles.chassisGroup
  while (rig.bodyGroup.children.length > 0) {
    handles.chassisGroup.add(rig.bodyGroup.children[0]);
  }

  // Keep wheel corners directly under handles.root so suspension travel animates the body cleanly
  for (const wc of rig.wheelCorners) {
    handles.root.add(wc.obj);
    handles.wheelCorners.push(wc);
  }

  handles.wheels.push(...rig.wheels);
  handles.steerWheels.push(...rig.steerWheels);
  if (rig.doorLeft) handles.doorLeft = rig.doorLeft;
  if (rig.doorRight) handles.doorRight = rig.doorRight;
  if (rig.trunkLid) handles.trunkLid = rig.trunkLid;
  if (rig.helmWheel) handles.helmWheel = rig.helmWheel;
  if (rig.underglowMeshes && rig.underglowMeshes.length > 0) {
    handles.underglowMeshes = rig.underglowMeshes;
  }
  if (rig.underglowLight) {
    handles.underglowLight = rig.underglowLight;
  }
}
