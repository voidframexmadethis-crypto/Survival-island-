import * as THREE from 'three';
import {
  KineticNodeKind,
  ModularVehicleData,
  VehicleModulePlacement,
} from '../types';
import { GarageVehicleSpec } from '../systems/undergroundElevator';
import { createVehicleFromPreset } from '../systems/modularVehicle';
import { FACILITY_ENGRAVING_BY_ID } from '../systems/restorationFacility';
import {
  buildRealLifeCarRig,
  buildSilhouetteGeometry,
  GarageCarVisualConfig,
  normalizeCarArchetype,
  RealLifeCarRig,
  VehicleArchetype,
} from './realLifeCarRig';
import {
  ensureGeometryHasUv,
  getCrossDrilledRotorTexture,
} from './textures';
import {
  createCadillacTailfinGeometry,
  createCurvedRearGlassGeometry,
  createCurvedSideGlassGeometry,
  createCurvedWindshieldGeometry,
  createSculptedRoofCanopyGeometry,
  createSweptTubeGeometry,
} from './automotiveSurfaceGeo';
import {
  buildCabinDetailKit,
  buildDetailedSteeringWheel,
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
  createTireRubberMaterial,
  createTireSidewallMaterial,
  createWalnutWoodMaterial,
  getGaugeClusterMap,
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
  licensePlate?: THREE.Object3D;
  rearDeck?: THREE.Object3D;
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
  quarterPanels?: THREE.Object3D[];
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
  whitewallMat: THREE.MeshStandardMaterial;
  bevelArchCache: Map<string, THREE.ExtrudeGeometry>;
}

let cachedShowroomAssets: SharedShowroomAssets | null = null;

function getSharedShowroomAssets(): SharedShowroomAssets {
  if (cachedShowroomAssets) return cachedShowroomAssets;
  const rotorTex = typeof document !== 'undefined' ? getCrossDrilledRotorTexture() : null;
  const tireMat = createTireRubberMaterial();
  const tireSidewallMat = createTireSidewallMaterial();
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
    whitewallMat: new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.44,
      metalness: 0.04,
    }),
    bevelArchCache: new Map(),
  };
  cachedShowroomAssets.tireMat.userData = { sharedAsset: true };
  cachedShowroomAssets.tireSidewallMat.userData = { sharedAsset: true };
  cachedShowroomAssets.rotorMat.userData = { sharedAsset: true };
  cachedShowroomAssets.caliperLimeMat.userData = { sharedAsset: true };
  cachedShowroomAssets.caliperRedMat.userData = { sharedAsset: true };
  cachedShowroomAssets.caliperOrangeMat.userData = { sharedAsset: true };
  cachedShowroomAssets.whitewallMat.userData = { sharedAsset: true };
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
  const rotorGeo = new THREE.CylinderGeometry(rotorRadius, rotorRadius, 0.026, 24);
  rotorGeo.rotateZ(Math.PI / 2);
  ensureGeometryHasUv(rotorGeo);
  const rotor = new THREE.Mesh(rotorGeo, assets.rotorMat);
  rotor.position.x = sideSign * offsetX;

  const caliperMat =
    caliperTone === 'orange'
      ? assets.caliperOrangeMat
      : caliperTone === 'red'
        ? assets.caliperRedMat
        : assets.caliperLimeMat;
  const caliper = new THREE.Mesh(
    ensureGeometryHasUv(new THREE.BoxGeometry(0.068, rotorRadius * 0.58, rotorRadius * 0.34)),
    caliperMat,
  );
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

    // 8 Forged Forgiato Y-spokes inside the main wheel barrel (revealing cross-drilled rotor behind!)
    const spokeGeo = new THREE.BoxGeometry(0.042, 0.345, 0.036);
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

    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const bladeA = new THREE.Mesh(
        new THREE.BoxGeometry(0.032, 0.27, 0.048),
        chromeMat,
      );
      bladeA.position.set(sideSign * 0.012, Math.cos(a) * 0.145, Math.sin(a) * 0.145);
      bladeA.rotation.x = a + 0.18;
      spinnerHub.add(bladeA);

      const bAngle = a + Math.PI / 4;
      const bladeB = new THREE.Mesh(
        new THREE.BoxGeometry(0.026, 0.25, 0.034),
        rimMat,
      );
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

    // 7 deep chrome turbine spokes + billet center cap + 5 lug bolts
    const spokeGeo = new THREE.BoxGeometry(0.045, 0.34, 0.052);
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

  // Sculpted Wire spokes + 5 lug bolts
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
  } else if (style === 'spinner_13') {
    // Cadillac Showroom Multi-Spoke Chrome Spinners (matching reference image 7-spoke deep chrome dish!)
    const spinnerHub = new THREE.Group();
    spinnerHub.position.set(sideSign * 0.16, 0, 0);
    const hubRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.21, 0.022, 8, 22),
      chromeMat,
    );
    hubRing.rotation.y = Math.PI / 2;
    spinnerHub.add(hubRing);

    const bladeGeo = new THREE.BoxGeometry(0.03, 0.215, 0.04);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const blade = new THREE.Mesh(bladeGeo, chromeMat);
      blade.position.set(0.01 * sideSign, Math.cos(a) * 0.108, Math.sin(a) * 0.108);
      blade.rotation.x = a + 0.22;
      spinnerHub.add(blade);
    }
    const centerCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.058, 0.078, 0.07, 16),
      chromeMat,
    );
    centerCap.rotation.z = Math.PI / 2;
    centerCap.position.x = sideSign * 0.02;
    spinnerHub.add(centerCap);
    spinGroup.add(spinnerHub);
    return { steerPivot, spinGroup, spinnerHub };
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
      ? 1.28
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
  const interiorHex = vehicle.interiorColor
    ? new THREE.Color(vehicle.interiorColor).getHex()
    : isDeville
      ? 0xe7dcc8
      : 0x262626;
  const bolsterHex = new THREE.Color(interiorHex).multiplyScalar(0.84).getHex();
  const leatherMat = createAutomotiveLeatherMaterial(interiorHex);
  const seatBolsterMat = createAutomotiveLeatherMaterial(bolsterHex);
  const carpetMat = createAutomotiveCarpetMaterial(isDeville ? 0x292524 : 0x18181b);
  const stripeMat = vehicle.customStripeColor
    ? new THREE.MeshStandardMaterial({
        color: new THREE.Color(vehicle.customStripeColor).getHex(),
        metalness: 0.48,
        roughness: 0.22,
        emissive: new THREE.Color(vehicle.customStripeColor).getHex(),
        emissiveIntensity: 0.06,
      })
    : null;
  const dashMat = isDeville ? createWalnutWoodMaterial() : createCarbonFiberMaterial();
  const dashPadMat = new THREE.MeshStandardMaterial({
    color: isDeville ? 0x2b211b : 0x111827,
    roughness: 0.66,
    metalness: 0.08,
  });
  const glassMat = createAutomotiveGlassMaterial(0.38);
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xfef9c3,
    emissive: 0xfef08a,
    emissiveIntensity: vehicle.customStripeColor ? 2.1 : 1.5,
    roughness: 0.14,
  });
  const amberSignalMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.15,
    roughness: 0.2,
  });
  const taillightMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 1.35,
    roughness: 0.18,
  });

  // Grounded axle reference height; chassisGroup lifts/drops by suspensionOffset
  const baseWheelY = 0.41 * wheelScale;
  const bodyRideY = Math.max(0.28, 0.38 + susp);
  handles.chassisGroup.position.y = bodyRideY;

  const lowerBodyLen = isDeville
    ? 4.95
    : preset === 'slab'
      ? 4.75
      : preset === 'donk'
        ? 4.6
        : 4.65;
  const lowerBodyH = preset === 'lowrider' ? 0.52 : preset === 'donk' ? 0.58 : 0.56;
  const frontZ = 0.08 + lowerBodyLen * 0.5;
  const rearZ = 0.08 - lowerBodyLen * 0.5;

  // 1. Lower chassis pan & open recessed cabin floor (so real interior is visible!)
  const underPan = new THREE.Mesh(
    new THREE.BoxGeometry(1.82, 0.14, lowerBodyLen - 0.15),
    darkTrimMat,
  );
  underPan.position.set(0, 0.08, 0.08);
  const cabinFloor = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.06, 2.05), carpetMat);
  cabinFloor.position.set(0, 0.18, -0.04);
  handles.chassisGroup.add(underPan, cabinFloor);

  // 2. Sculpted Contoured Front Engine Bay + Wheel Arch Flares + Rear Quarter Body
  const frontBodyLen = frontZ - 0.82;
  const frontEngineCore = new THREE.Mesh(
    createContouredPanelGeo(1.48, lowerBodyH, frontBodyLen, 0.03, 0.04),
    candyPaintMat,
  );
  frontEngineCore.position.set(0, lowerBodyH * 0.5 + 0.12, 0.82 + frontBodyLen * 0.5);
  const frontNoseHeader = new THREE.Mesh(
    createContouredPanelGeo(1.94, lowerBodyH * 0.92, 0.34, 0.03, 0.04),
    candyPaintMat,
  );
  frontNoseHeader.position.set(0, lowerBodyH * 0.48 + 0.12, frontZ - 0.18);
  handles.chassisGroup.add(frontEngineCore, frontNoseHeader);

  // Contoured rocker sills with chrome lower spear molding beneath doors
  [-0.91, 0.91].forEach((sx) => {
    const sill = new THREE.Mesh(
      createContouredPanelGeo(0.14, 0.18, 1.72, 0.02, 0.025),
      candyPaintMat,
    );
    sill.position.set(sx, 0.21, -0.04);
    const lowerSpear = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.038, 4.35),
      isDeville ? goldTrimMat : chromeMat,
    );
    lowerSpear.position.set(sx + (sx < 0 ? -0.07 : 0.07), 0.24, 0.08);
    handles.chassisGroup.add(sill, lowerSpear);
  });

  // Sculpted Curved Wheel Arch Flares over all 4 wheel wells (eliminating boxy blocks!)
  const archOuterR = Math.min(0.64, Math.max(0.46, 0.44 * wheelScale + 0.08));
  const archInnerR = Math.max(0.32, archOuterR - 0.14);
  const archGeo = getFlaredWheelArchGeo(archOuterR, archInnerR, 0.24);
  [1.38, -1.24].forEach((az) => {
    [-0.9, 0.9].forEach((fx) => {
      const arch = new THREE.Mesh(archGeo, candyPaintMat);
      arch.position.set(fx, 0.2, az);
      const archTrim = new THREE.Mesh(
        new THREE.TorusGeometry((archInnerR + archOuterR) * 0.5, 0.018, 8, 20, Math.PI),
        chromeMat,
      );
      archTrim.rotation.y = Math.PI / 2;
      archTrim.position.set(fx + (fx < 0 ? -0.125 : 0.125), 0.2, az);
      handles.chassisGroup.add(arch, archTrim);
    });
  });

  // Rear Quarter Panels + Rear Trunk Tub (hollowed so popping the trunk shows air tanks & subs!)
  const rearStartZ = -0.88;
  const rearLen = Math.max(1.2, rearStartZ - rearZ);
  const rearCenterZ = rearZ + rearLen * 0.5;
  handles.quarterPanels = handles.quarterPanels ?? [];
  [-0.84, 0.84].forEach((rx) => {
    const quarter = new THREE.Mesh(
      createContouredPanelGeo(0.28, lowerBodyH, rearLen, 0.03, 0.04),
      candyPaintMat,
    );
    quarter.position.set(rx, lowerBodyH * 0.5 + 0.12, rearCenterZ);
    quarter.userData.baseX = rx;
    quarter.userData.flexSide = rx < 0 ? -1 : 1;
    handles.chassisGroup.add(quarter);
    handles.quarterPanels!.push(quarter);
  });
  const rearBulkhead = new THREE.Mesh(
    new THREE.BoxGeometry(1.68, lowerBodyH * 0.92, 0.12),
    darkTrimMat,
  );
  rearBulkhead.position.set(0, lowerBodyH * 0.5 + 0.12, rearStartZ + 0.04);
  const rearValance = new THREE.Mesh(
    createContouredPanelGeo(1.94, lowerBodyH * 0.85, 0.18, 0.02, 0.03),
    candyPaintMat,
  );
  rearValance.position.set(0, lowerBodyH * 0.45 + 0.12, rearZ + 0.08);
  handles.chassisGroup.add(rearBulkhead, rearValance);

  // Trunk Interior Equipment (visible when you pop the trunk!)
  const tankMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.94,
    roughness: 0.1,
  });
  const subBox = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.34, 0.48), darkTrimMat);
  subBox.position.set(0, 0.34, rearStartZ - 0.32);
  handles.chassisGroup.add(subBox);
  [-0.32, 0.32].forEach((sx) => {
    const subCone = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 0.06, 14),
      chromeMat,
    );
    subCone.rotation.x = Math.PI / 2;
    subCone.position.set(sx, 0.36, rearStartZ - 0.57);
    handles.chassisGroup.add(subCone);
  });
  [-0.44, 0.44].forEach((tx) => {
    const airTank = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.11, 0.66, 14),
      tankMat,
    );
    airTank.rotation.z = Math.PI / 2;
    airTank.position.set(tx, 0.34, rearZ + 0.46);
    handles.chassisGroup.add(airTank);
  });
  const valveBlock = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.12, 0.2),
    new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.45,
      metalness: 0.7,
      roughness: 0.25,
    }),
  );
  valveBlock.position.set(0, 0.26, rearZ + 0.46);
  handles.chassisGroup.add(valveBlock);

  // Six-pump hydraulic rack visible inside the trunk for the dancer builds.
  [-0.64, -0.38, -0.13, 0.13, 0.38, 0.64].forEach((px) => {
    const pump = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.058, 0.28, 10),
      tankMat,
    );
    pump.position.set(px, 0.3, rearStartZ - 0.56);
    const pumpMotor = new THREE.Mesh(
      new THREE.CylinderGeometry(0.052, 0.052, 0.1, 10),
      new THREE.MeshStandardMaterial({
        color: 0xb91c1c,
        metalness: 0.75,
        roughness: 0.24,
      }),
    );
    pumpMotor.position.set(px, 0.47, rearStartZ - 0.56);
    handles.chassisGroup.add(pump, pumpMotor);
  });

  // Sculpted contoured beveled hood with crown
  const hood = new THREE.Mesh(
    createContouredPanelGeo(1.86, 0.1, Math.max(1.35, frontBodyLen - 0.04), 0.055, 0.035),
    candyPaintMat,
  );
  hood.position.set(0, lowerBodyH + 0.15, 0.82 + frontBodyLen * 0.5);
  handles.chassisGroup.add(hood);

  // Hand-laid custom pinstripes: twin stripes over the nose, trunk and flanks.
  if (stripeMat) {
    [-0.22, 0.22].forEach((sx) => {
      const hoodStripe = new THREE.Mesh(
        new THREE.BoxGeometry(0.105, 0.009, Math.max(1.0, frontBodyLen - 0.2)),
        stripeMat,
      );
      hoodStripe.position.set(
        sx,
        lowerBodyH + 0.206,
        0.82 + frontBodyLen * 0.5,
      );
      handles.chassisGroup.add(hoodStripe);
    });
    [-0.95, 0.95].forEach((sx) => {
      [0.41, 0.5].forEach((sy) => {
        [1.42, -1.64].forEach((sz) => {
          const flankStripe = new THREE.Mesh(
            new THREE.BoxGeometry(0.012, 0.032, sz > 0 ? 0.92 : 1.05),
            stripeMat,
          );
          flankStripe.position.set(sx, sy, sz);
          handles.chassisGroup.add(flankStripe);
        });
      });
    });
  }

  // Animated Hinged Contoured Trunk Lid (pivoted at rear deck front edge so it swings UP smoothly!)
  const trunkHinge = new THREE.Group();
  trunkHinge.position.set(0, lowerBodyH + 0.16, rearStartZ);
  const trunkPanel = new THREE.Mesh(
    createContouredPanelGeo(1.78, 0.08, rearLen - 0.06, 0.035, 0.03),
    candyPaintMat,
  );
  trunkPanel.position.set(0, 0, -(rearLen - 0.06) * 0.5);
  const trunkChromeTrim = new THREE.Mesh(
    new THREE.BoxGeometry(1.72, 0.042, 0.055),
    chromeMat,
  );
  trunkChromeTrim.position.set(0, 0.02, -(rearLen - 0.1));
  trunkHinge.add(trunkPanel, trunkChromeTrim);
  if (stripeMat) {
    [-0.22, 0.22].forEach((sx) => {
      const trunkStripe = new THREE.Mesh(
        new THREE.BoxGeometry(0.105, 0.009, Math.max(0.8, rearLen - 0.2)),
        stripeMat,
      );
      trunkStripe.position.set(sx, 0.043, -(rearLen - 0.06) * 0.5);
      trunkHinge.add(trunkStripe);
    });
  }
  handles.chassisGroup.add(trunkHinge);
  handles.trunkLid = trunkHinge;

  // 3. REAL WORKING INTERIOR (Padded Dash Brow, Gauges, Radio/Vents, Rearview Mirror, Visors, Pedals, Bolstered Leather Seats, 3-Spoke Steering Wheel, Droptop Switch!)
  const dash = new THREE.Mesh(
    createContouredPanelGeo(1.66, 0.3, 0.34, 0.035, 0.03),
    dashMat,
  );
  dash.position.set(0, lowerBodyH + 0.04, 0.64);
  const dashBrow = new THREE.Mesh(
    createContouredPanelGeo(1.68, 0.065, 0.38, 0.025, 0.02),
    dashPadMat,
  );
  dashBrow.position.set(0, lowerBodyH + 0.21, 0.64);
  const gaugeBezel = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.18, 0.03), chromeMat);
  gaugeBezel.position.set(-0.42, lowerBodyH + 0.14, 0.625);
  const radioGrill = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.03), chromeMat);
  radioGrill.position.set(0.02, lowerBodyH + 0.06, 0.46);
  const gloveBoxTrim = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.024, 0.03), chromeMat);
  gloveBoxTrim.position.set(0.46, lowerBodyH + 0.08, 0.46);
  const centerConsole = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.24, 1.35), dashMat);
  centerConsole.position.set(0, 0.32, 0.05);
  const shifterGate = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.022, 0.22), chromeMat);
  shifterGate.position.set(0, 0.445, 0.24);
  const shifter = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.22, 8), chromeMat);
  shifter.position.set(0, 0.52, 0.24);
  const shifterKnob = new THREE.Mesh(
    new THREE.SphereGeometry(0.036, 10, 10),
    stripeMat ?? chromeMat,
  );
  shifterKnob.position.set(0, 0.63, 0.24);

  const droptopSwitchGroup = new THREE.Group();
  droptopSwitchGroup.position.set(0, 0.44, 0.44);
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
    dashBrow,
    gaugeBezel,
    radioGrill,
    gloveBoxTrim,
    centerConsole,
    shifterGate,
    shifter,
    shifterKnob,
    droptopSwitchGroup,
  );

  // Sculpted Bolstered Bucket Seats with Crest Accents (Driver + Passenger)
  [-0.44, 0.44].forEach((sx) => {
    const cushion = new THREE.Mesh(
      createContouredPanelGeo(0.54, 0.15, 0.52, 0.02, 0.03),
      leatherMat,
    );
    cushion.position.set(sx, 0.3, 0.08);
    const backrest = new THREE.Mesh(
      createContouredPanelGeo(0.54, 0.14, 0.56, 0.02, 0.03),
      leatherMat,
    );
    backrest.rotation.x = Math.PI / 2 - 0.14;
    backrest.position.set(sx, 0.6, -0.14);
    [-0.22, 0.22].forEach((bx) => {
      const bolster = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.52, 0.16), seatBolsterMat);
      bolster.position.set(sx + bx, 0.58, -0.11);
      bolster.rotation.x = -0.14;
      handles.chassisGroup.add(bolster);
    });
    const headrest = new THREE.Mesh(
      createContouredPanelGeo(0.3, 0.16, 0.11, 0.025, 0.02),
      leatherMat,
    );
    headrest.position.set(sx, 0.94, -0.19);
    if (isDeville) {
      const crestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.075, 0.02), goldTrimMat);
      crestPlate.position.set(sx, 0.94, -0.13);
      handles.chassisGroup.add(crestPlate);
    }
    handles.chassisGroup.add(cushion, backrest, headrest);
  });

  // Rear Luxury Bench Seat with Twin Headrests
  const rearCushion = new THREE.Mesh(
    createContouredPanelGeo(1.52, 0.16, 0.48, 0.02, 0.03),
    leatherMat,
  );
  rearCushion.position.set(0, 0.32, -0.56);
  const rearBack = new THREE.Mesh(
    createContouredPanelGeo(1.52, 0.14, 0.52, 0.02, 0.03),
    leatherMat,
  );
  rearBack.rotation.x = Math.PI / 2 - 0.12;
  rearBack.position.set(0, 0.62, -0.78);
  [-0.45, 0.45].forEach((hx) => {
    const rHeadrest = new THREE.Mesh(
      createContouredPanelGeo(0.3, 0.15, 0.1, 0.02, 0.02),
      leatherMat,
    );
    rHeadrest.position.set(hx, 0.93, -0.82);
    handles.chassisGroup.add(rHeadrest);
  });
  handles.chassisGroup.add(rearCushion, rearBack);

  // Photorealistic Luxury Wood-and-Chrome Steering Wheel + Backlit Instrument Cluster
  const helmWheel = buildDetailedSteeringWheel({
    style: 'classic_luxury',
    radius: 0.175,
    chromeMat,
    leatherMat,
  });
  helmWheel.position.set(-0.42, lowerBodyH + 0.18, 0.42);
  helmWheel.rotation.x = 0.45;
  handles.chassisGroup.add(helmWheel);
  handles.helmWheel = helmWheel;

  const classicGaugeTex = getGaugeClusterMap();
  if (classicGaugeTex) {
    const gaugeScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.44, 0.16),
      new THREE.MeshBasicMaterial({ map: classicGaugeTex }),
    );
    gaugeScreen.position.set(-0.42, lowerBodyH + 0.14, 0.605);
    gaugeScreen.rotation.y = Math.PI;
    handles.chassisGroup.add(gaugeScreen);
  }

  // 4. REAL WORKING HINGED LEFT & RIGHT DOORS (Contoured Skin, Recessed Handles, Armrests, Wing Mirrors!)
  // The DONK uses rear-hinged suicide pivots plus the butterfly lift animated in GameEngine.
  const doorLen = 1.66;
  const doorH = lowerBodyH - 0.08;
  const isDonk = preset === 'donk';
  const doorSwingDir = isDonk ? 1 : -1;
  const doorHingeZ = isDonk ? 0.8 - doorLen : 0.8;
  ([-1, 1] as const).forEach((side) => {
    const doorPivot = new THREE.Group();
    doorPivot.position.set(side * 0.93, 0.3, doorHingeZ);
    if (isDonk) {
      doorPivot.userData.doorStyle = 'suicide_butterfly';
      doorPivot.rotation.order = 'YXZ';
    }
    const outerSkin = new THREE.Mesh(
      createContouredPanelGeo(0.085, doorH, doorLen, 0.015, 0.02),
      candyPaintMat,
    );
    outerSkin.position.set(0, doorH * 0.5, doorSwingDir * doorLen * 0.5);
    const innerCard = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, doorH * 0.86, doorLen * 0.92),
      leatherMat,
    );
    innerCard.position.set(-side * 0.045, doorH * 0.5, doorSwingDir * doorLen * 0.5);
    const armrest = new THREE.Mesh(
      new THREE.BoxGeometry(0.065, 0.075, 0.52),
      seatBolsterMat,
    );
    armrest.position.set(-side * 0.072, doorH * 0.46, doorSwingDir * doorLen * 0.55);
    const speakerRing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.085, 0.085, 0.018, 12),
      chromeMat,
    );
    speakerRing.rotation.z = Math.PI / 2;
    speakerRing.position.set(-side * 0.072, doorH * 0.24, doorSwingDir * 0.32);

    const handlePocket = new THREE.Mesh(
      new THREE.BoxGeometry(0.024, 0.055, 0.2),
      darkTrimMat,
    );
    handlePocket.position.set(side * 0.045, doorH * 0.78, doorSwingDir * doorLen * 0.72);
    const chromeHandle = new THREE.Mesh(
      new THREE.BoxGeometry(0.032, 0.028, 0.17),
      chromeMat,
    );
    chromeHandle.position.set(side * 0.062, doorH * 0.78, doorSwingDir * doorLen * 0.72);
    const sideTrim = new THREE.Mesh(
      new THREE.BoxGeometry(0.032, 0.038, doorLen * 0.96),
      chromeMat,
    );
    sideTrim.position.set(side * 0.052, doorH * 0.54, doorSwingDir * doorLen * 0.5);
    const doorGlass = new THREE.Mesh(
      new THREE.BoxGeometry(0.028, 0.4, doorLen * 0.84),
      glassMat,
    );
    doorGlass.position.set(
      -side * 0.01,
      doorH + 0.18,
      doorSwingDir * doorLen * 0.52,
    );

    // Classic round chrome wing mirror on the leading door corner with mirror glass face
    const mirrorAssy = buildRealisticSideMirror({
      side,
      housingMat: candyPaintMat,
      chromeMat,
      style: isDeville || preset === 'lowrider' ? 'classic_round' : 'aero',
    });
    mirrorAssy.position.set(
      side * 0.045,
      doorH + 0.03,
      isDonk ? doorLen - 0.18 : -0.18,
    );

    doorPivot.add(
      outerSkin,
      innerCard,
      armrest,
      speakerRing,
      handlePocket,
      chromeHandle,
      sideTrim,
      doorGlass,
      mirrorAssy,
    );
    handles.chassisGroup.add(doorPivot);
    if (side < 0) handles.doorLeft = doorPivot;
    else handles.doorRight = doorPivot;
  });

  // 5. Panoramic Windshield + Chrome Surround + Wipers + Cabin Detail Kit / Retractable Black Convertible Top
  const cabinLen = preset === 'lowrider' ? 1.9 : isDeville ? 1.98 : 2.05;
  const cabinH = preset === 'lowrider' ? 0.46 : isDeville ? 0.52 : preset === 'donk' ? 0.56 : 0.54;
  const cabinY = lowerBodyH + 0.12 + cabinH * 0.5;
  const windowBaseY = lowerBodyH + 0.12;
  const roofTopY = windowBaseY + cabinH * 0.96;
  const windshieldTopZ = isDeville ? 0.72 : 0.6;

  // Compound-curved wraparound glass replaces the old flat panes for a period-correct silhouette.
  const windshield = new THREE.Mesh(
    createCurvedWindshieldGeometry({
      key: `${preset}_classic_windshield`,
      baseWidth: 1.7,
      topWidth: 1.46,
      bottomY: windowBaseY,
      topY: roofTopY,
      bottomZ: 0.86,
      topZ: windshieldTopZ,
      wrapZ: 0.18,
      crown: 0.028,
    }),
    glassMat,
  );
  const topHeaderRail = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.045, 0.075), chromeMat);
  topHeaderRail.position.set(0, roofTopY + 0.01, windshieldTopZ);
  const windshieldBaseTrim = new THREE.Mesh(
    new THREE.BoxGeometry(1.72, 0.028, 0.055),
    chromeMat,
  );
  windshieldBaseTrim.position.set(0, windowBaseY + 0.01, 0.87);
  const cowlWipers = buildWindshieldWipers(1.38);
  cowlWipers.position.set(0, lowerBodyH + 0.21, 0.84);
  const cabinKit = buildCabinDetailKit({
    mirrorY: cabinY + cabinH * 0.28,
    mirrorZ: 0.62,
    dashY: lowerBodyH + 0.14,
    pedalZ: 0.74,
    driverX: -0.42,
    trimMat: dashPadMat,
    chromeMat,
  });
  handles.chassisGroup.add(
    windshield,
    topHeaderRail,
    windshieldBaseTrim,
    cowlWipers,
    cabinKit,
  );

  [-0.83, 0.83].forEach((px) => {
    const aPillar = new THREE.Mesh(
      createSweptTubeGeometry(
        `${preset}_a_pillar_${px}`,
        [
          [px, windowBaseY, 0.85],
          [px * 0.965, (windowBaseY + roofTopY) * 0.5, 0.725],
          [px * 0.885, roofTopY + 0.01, windshieldTopZ],
        ],
        0.033,
        12,
        6,
      ),
      chromeMat,
    );
    handles.chassisGroup.add(aPillar);
  });

  if (isDeville) {
    // Real-life Haartz Stayfast woven twill convertible canvas fabric with stitched seams & cloth sheen
    const blackTopMat = createConvertibleFabricMaterial(0x181a20);
    const headlinerMat = createConvertibleFabricMaterial(0x2d2a26);
    const weatherstripMat = new THREE.MeshStandardMaterial({
      color: 0x090a0d,
      roughness: 0.85,
      metalness: 0.08,
    });
    const ribMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.34,
      metalness: 0.82,
    });

    const topPivot = new THREE.Group();
    topPivot.position.set(0, lowerBodyH + 0.16, -0.92);

    const rearSailL = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, cabinH * 0.98, 0.36),
      blackTopMat,
    );
    rearSailL.position.set(-0.79, cabinH * 0.48, 0.08);
    rearSailL.rotation.x = 0.24;
    const rearSailR = rearSailL.clone();
    rearSailR.position.x = 0.79;
    const rearGlass = new THREE.Mesh(
      new THREE.BoxGeometry(1.34, cabinH * 0.74, 0.045),
      glassMat,
    );
    rearGlass.position.set(0, cabinH * 0.48, 0.02);
    rearGlass.rotation.x = 0.24;

    // Rubber weatherstrip bezel & copper defroster lines on the rear convertible glass
    const rearGasket = new THREE.Mesh(
      new THREE.BoxGeometry(1.42, cabinH * 0.8, 0.03),
      weatherstripMat,
    );
    rearGasket.position.set(0, cabinH * 0.48, 0.012);
    rearGasket.rotation.x = 0.24;

    [-0.75, 0.75].forEach((lx) => {
      const linkArm = new THREE.Mesh(
        new THREE.BoxGeometry(0.035, cabinH * 0.92, 0.05),
        chromeMat,
      );
      linkArm.position.set(lx, cabinH * 0.48, 0.14);
      linkArm.rotation.x = 0.22;
      topPivot.add(linkArm);
    });

    const frontSection = new THREE.Group();
    frontSection.position.set(0, cabinH * 0.96, 0.16);
    const frontCanopyLen = cabinLen * 0.82;
    const roofCap = new THREE.Mesh(
      createContouredPanelGeo(1.72, 0.075, frontCanopyLen, 0.032, 0.022),
      blackTopMat,
    );
    roofCap.position.set(0, 0, frontCanopyLen * 0.5);
    // Interior acoustic cloth headliner underneath the Stayfast outer canvas
    const roofHeadliner = new THREE.Mesh(
      new THREE.BoxGeometry(1.62, 0.024, frontCanopyLen * 0.94),
      headlinerMat,
    );
    roofHeadliner.position.set(0, -0.036, frontCanopyLen * 0.5);
    // Exterior raised rain-rail seam beads along left & right edges of the cloth top
    [-0.78, 0.78].forEach((rx) => {
      const rainSeam = new THREE.Mesh(
        new THREE.BoxGeometry(0.036, 0.026, frontCanopyLen * 0.96),
        weatherstripMat,
      );
      rainSeam.position.set(rx, 0.03, frontCanopyLen * 0.5);
      frontSection.add(rainSeam);
    });
    // Folding aluminum roof bows visible across the underside
    [0.24, 0.56, 0.86].forEach((frac) => {
      const bow = new THREE.Mesh(
        new THREE.BoxGeometry(1.66, 0.032, 0.048),
        ribMat,
      );
      bow.position.set(0, -0.048, frontCanopyLen * frac);
      frontSection.add(bow);
    });
    const headerChrome = new THREE.Mesh(
      new THREE.BoxGeometry(1.74, 0.055, 0.085),
      chromeMat,
    );
    headerChrome.position.set(0, 0.005, frontCanopyLen + 0.01);
    frontSection.add(roofCap, roofHeadliner, headerChrome);

    topPivot.add(rearSailL, rearSailR, rearGasket, rearGlass, frontSection);
    handles.chassisGroup.add(topPivot);
    handles.convertibleTop = topPivot;
    handles.convertibleFrontSection = frontSection;

    // Matching Stayfast woven canvas tonneau boot cover with chrome snap fasteners when top is down
    const foldedBoot = new THREE.Group();
    foldedBoot.position.set(0, lowerBodyH + 0.2, -0.94);
    const bootMain = new THREE.Mesh(
      createContouredPanelGeo(1.74, 0.16, 0.44, 0.028, 0.028),
      blackTopMat,
    );
    const bootChromeTrim = new THREE.Mesh(
      new THREE.BoxGeometry(1.76, 0.04, 0.06),
      chromeMat,
    );
    bootChromeTrim.position.set(0, 0.07, 0.21);
    [-0.72, -0.36, 0, 0.36, 0.72].forEach((sx) => {
      const snap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.016, 0.016, 0.014, 10),
        chromeMat,
      );
      snap.position.set(sx, 0.088, -0.17);
      foldedBoot.add(snap);
    });
    foldedBoot.add(bootMain, bootChromeTrim);
    foldedBoot.visible = false;
    handles.chassisGroup.add(foldedBoot);
    handles.convertibleBoot = foldedBoot;
  } else {
    const roofMat =
      preset === 'slab'
        ? new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.72, metalness: 0.15 })
        : candyPaintMat;
    const roofRearZ = preset === 'donk' ? -1.06 : -1.0;
    const roofRearY = roofTopY - (preset === 'donk' ? 0.045 : 0.13);
    const roofPeakY = roofTopY + (preset === 'donk' ? 0.01 : 0.03);

    // Compound-curved painted roof canopy: semi-fastback Impala, formal upright DONK roofline.
    const roofCap = new THREE.Mesh(
      createSculptedRoofCanopyGeometry({
        key: `${preset}_classic_roof`,
        frontZ: 0.62,
        rearZ: roofRearZ,
        frontHalfW: 0.72,
        rearHalfW: preset === 'donk' ? 0.75 : 0.69,
        frontY: roofTopY - 0.015,
        peakY: roofPeakY,
        rearY: roofRearY,
        crown: preset === 'donk' ? 0.03 : 0.045,
      }),
      roofMat,
    );
    const rearGlassBottomZ = preset === 'donk' ? -1.24 : -1.32;
    const rearGlass = new THREE.Mesh(
      createCurvedRearGlassGeometry({
        key: `${preset}_classic_rear_glass`,
        topWidth: 1.46,
        bottomWidth: 1.6,
        topY: roofRearY - 0.005,
        bottomY: windowBaseY + 0.03,
        topZ: roofRearZ + 0.01,
        bottomZ: rearGlassBottomZ,
        wrapZ: 0.12,
      }),
      glassMat,
    );
    handles.chassisGroup.add(roofCap, rearGlass);

    // Chrome roof drip rails and rear-window surround
    [-1, 1].forEach((side) => {
      const dripRail = new THREE.Mesh(
        createSweptTubeGeometry(
          `${preset}_drip_rail_${side}`,
          [
            [side * 0.715, roofTopY - 0.01, 0.6],
            [side * 0.735, roofPeakY - 0.02, -0.18],
            [side * 0.715, roofRearY, roofRearZ],
          ],
          0.016,
          16,
          6,
        ),
        chromeMat,
      );
      const cPillarTrim = new THREE.Mesh(
        createSweptTubeGeometry(
          `${preset}_c_pillar_${side}`,
          [
            [side * 0.715, roofRearY, roofRearZ],
            [side * 0.79, windowBaseY + 0.2, rearGlassBottomZ + 0.02],
          ],
          0.018,
          8,
          6,
        ),
        chromeMat,
      );
      handles.chassisGroup.add(dripRail, cPillarTrim);
    });

    const rearGlassHeader = new THREE.Mesh(
      new THREE.BoxGeometry(1.48, 0.035, 0.055),
      chromeMat,
    );
    rearGlassHeader.position.set(0, roofRearY, roofRearZ);
    const rearGlassBaseTrim = new THREE.Mesh(
      new THREE.BoxGeometry(1.62, 0.03, 0.05),
      chromeMat,
    );
    rearGlassBaseTrim.position.set(0, windowBaseY + 0.03, rearGlassBottomZ);
    handles.chassisGroup.add(rearGlassHeader, rearGlassBaseTrim);

    // Fixed rear-quarter glass curves inboard with the tumblehome like the real hardtop.
    [-1, 1].forEach((side) => {
      const quarterGlass = new THREE.Mesh(
        createCurvedSideGlassGeometry({
          key: `${preset}_quarter_glass`,
          side: side as -1 | 1,
          frontZ: -0.78,
          rearZ: rearGlassBottomZ + 0.2,
          bottomY: windowBaseY + 0.015,
          topY: roofRearY + (preset === 'donk' ? 0.03 : 0.06),
          bottomX: 0.855,
          topX: 0.715,
          midBowOut: 0.02,
        }),
        glassMat,
      );
      const quarterBeltTrim = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.022, 0.32),
        chromeMat,
      );
      quarterBeltTrim.position.set(
        side * 0.858,
        windowBaseY + 0.02,
        -0.95,
      );
      handles.chassisGroup.add(quarterGlass, quarterBeltTrim);
    });
  }

  // Slim chrome beltline spear across the doors and quarter panels (period-correct old-school trim).
  [-1, 1].forEach((side) => {
    const beltSpear = new THREE.Mesh(
      new THREE.BoxGeometry(0.022, 0.026, lowerBodyLen - 0.7),
      chromeMat,
    );
    beltSpear.position.set(side * 0.982, lowerBodyH + 0.1, 0.08);
    handles.chassisGroup.add(beltSpear);
  });

  // 6. Sculpted Wrap-Around Chrome Bumpers, 3D Jeweled Grille, Quad Crystal Headlights, Cadillac Tailfins & Bullet Taillights
  const frontBumper = new THREE.Mesh(
    createContouredPanelGeo(2.08, 0.19, 0.22, 0.025, 0.03),
    chromeMat,
  );
  frontBumper.position.set(0, 0.26, frontZ + 0.08);
  const rearBumper = new THREE.Mesh(
    createContouredPanelGeo(2.08, 0.19, 0.22, 0.025, 0.03),
    chromeMat,
  );
  rearBumper.position.set(0, 0.26, rearZ - 0.08);

  const grilleAssy = buildRealisticGrilleAssembly({
    width: isDeville ? 1.18 : 1.32,
    height: isDeville ? 0.3 : 0.24,
    chromeMat,
    horizontalBars: isDeville ? 2 : 3,
  });
  grilleAssy.position.set(0, 0.46, frontZ + 0.04);

  // Front license plate frame & backing pocket in lower bumper
  const plateFrame = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.032), chromeMat);
  plateFrame.position.set(0, 0.26, frontZ + 0.19);
  const plateInner = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.13, 0.036), darkTrimMat);
  plateInner.position.set(0, 0.26, frontZ + 0.192);

  // Real rear license plate on the bumper. The panel buzzes independently of
  // the trunk lid, driven by the live sub-bass energy.
  const rearPlate = new THREE.Group();
  rearPlate.name = 'rear_license_plate';
  const rearPlateFrame = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.19, 0.02),
    chromeMat,
  );
  const rearPlateFace = new THREE.Mesh(
    new THREE.BoxGeometry(0.31, 0.145, 0.018),
    new THREE.MeshStandardMaterial({
      color: 0xe7e5e4,
      roughness: 0.58,
      metalness: 0.08,
    }),
  );
  rearPlateFace.position.z = -0.008;
  const rearPlateStripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.022, 0.006),
    darkTrimMat,
  );
  rearPlateStripe.position.set(0, 0.028, -0.018);
  rearPlate.add(rearPlateFrame, rearPlateFace, rearPlateStripe);
  rearPlate.position.set(0, 0.32, rearZ - 0.2);
  handles.chassisGroup.add(rearPlate);
  handles.licensePlate = rearPlate;

  // Rear-deck 6×9 speaker grilles on the parcel shelf: the deck gets its own
  // subtle bass movement instead of the whole cabin shaking as one block.
  const rearDeck = new THREE.Group();
  rearDeck.name = 'rear_speaker_deck';
  const deckGrilleMat = new THREE.MeshStandardMaterial({
    color: 0x15181d,
    roughness: 0.82,
    metalness: 0.25,
  });
  [-0.42, 0.42].forEach((dx) => {
    const grille = new THREE.Mesh(
      new THREE.CylinderGeometry(0.115, 0.115, 0.012, 20),
      deckGrilleMat,
    );
    grille.position.set(dx, 0, 0);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.117, 0.008, 6, 20), chromeMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(dx, 0.008, 0);
    rearDeck.add(grille, ring);
  });
  rearDeck.position.set(0, lowerBodyH + 0.15, rearStartZ + 0.34);
  handles.chassisGroup.add(rearDeck);
  handles.rearDeck = rearDeck;

  handles.chassisGroup.add(frontBumper, rearBumper, grilleAssy, plateFrame, plateInner);

  // Multi-layer hooded crystal quad round headlights
  [-0.81, -0.65, 0.65, 0.81].forEach((hx) => {
    const pod = buildRealisticHeadlightPod({
      shape: 'round',
      radius: 0.068,
      chromeMat,
      withHood: isDeville || preset === 'lowrider',
    });
    pod.position.set(hx, 0.49, frontZ + 0.04);
    handles.chassisGroup.add(pod);
  });

  if (isDeville) {
    // 1959/1960s White Pearl Cadillac details: Dagmar bumper cones, fender spears, V-crest, whip antenna, sweeping tailfins & bullet taillights!
    [-0.58, 0.58].forEach((dx) => {
      const dagmar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.054, 0.085, 0.16, 14),
        chromeMat,
      );
      dagmar.rotation.x = Math.PI / 2;
      dagmar.position.set(dx, 0.27, frontZ + 0.2);
      handles.chassisGroup.add(dagmar);
    });

    [-0.95, 0.95].forEach((cx) => {
      const amberMarker = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.12), amberSignalMat);
      amberMarker.position.set(cx, 0.46, frontZ - 0.12);
      const sideBadge = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.075, 0.12), goldTrimMat);
      sideBadge.position.set(cx + (cx < 0 ? -0.02 : 0.02), 0.48, 0.96);
      const fenderOrnament = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.045, 0.38), chromeMat);
      fenderOrnament.position.set(cx * 0.88, lowerBodyH + 0.2, frontZ - 0.32);
      handles.chassisGroup.add(amberMarker, sideBadge, fenderOrnament);
    });

    // Iconic 1959/1960s Cadillac Sweeping Rear Tailfins + Chrome Spears + Twin Bullet Rocket-Pod Taillights
    [-0.86, 0.86].forEach((tx) => {
      const finBody = new THREE.Mesh(
        createCadillacTailfinGeometry({
          key: `deville_fin_${tx}`,
          length: 1.45,
          frontHeight: 0.14,
          rearHeight: 0.46,
          baseThickness: 0.085,
          crestThickness: 0.032,
        }),
        candyPaintMat,
      );
      finBody.position.set(tx, lowerBodyH + 0.05, rearZ + 0.72);

      const finSpear = new THREE.Mesh(
        createSweptTubeGeometry(
          `deville_fin_crest_${tx}`,
          [
            [tx, lowerBodyH + 0.21, rearZ + 1.05],
            [tx, lowerBodyH + 0.36, rearZ + 0.62],
            [tx, lowerBodyH + 0.51, rearZ + 0.02],
          ],
          0.017,
          16,
          6,
        ),
        chromeMat,
      );

      const upperRocket = buildRealisticTaillightPod({
        style: 'cadillac_bullet',
        chromeMat,
      });
      upperRocket.position.set(tx, lowerBodyH + 0.34, rearZ + 0.02);
      const lowerRocket = buildRealisticTaillightPod({
        style: 'cadillac_bullet',
        chromeMat,
      });
      lowerRocket.position.set(tx, lowerBodyH + 0.08, rearZ + 0.02);

      // Rear fender skirt trim accent
      const skirtPanel = new THREE.Mesh(
        createContouredPanelGeo(0.05, 0.16, 0.72, 0.01, 0.015),
        candyPaintMat,
      );
      skirtPanel.position.set(tx + (tx < 0 ? -0.12 : 0.12), 0.28, -1.24);
      handles.chassisGroup.add(finBody, finSpear, upperRocket, lowerRocket, skirtPanel);
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

  // Dual mirror chrome exhaust tips
  [-0.58, 0.58].forEach((ex) => {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.044, 0.38, 12), chromeMat);
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(ex, 0.14, rearZ - 0.14);
    handles.chassisGroup.add(pipe);
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
  const goldBowtieMat = createChromeMaterial(0xfacc15);
  const darkTrimMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.62,
    metalness: 0.3,
  });
  const leatherMat = createAutomotiveLeatherMaterial(0x1c1917);
  const dashPadMat = createAutomotiveLeatherMaterial(0x111318);
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

  const frontZ = 2.48;
  const rearZ = -2.38;
  const lowerBodyH = 0.68;

  // 1. Ground-hugging 3-inch slammed underpan, cabin floor & ground-effect rocker skirts
  const underPan = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.1, 4.78), darkTrimMat);
  underPan.position.set(0, 0.05, 0.05);
  const cabinFloor = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.06, 3.05), carpetMat);
  cabinFloor.position.set(0, 0.13, -0.45);
  handles.chassisGroup.add(underPan, cabinFloor);

  // Slammed rocker skirts + front chin splitter (3 inches above ground!)
  [-0.99, 0.99].forEach((sx) => {
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 1.56), paintMat);
    skirt.position.set(sx, 0.09, 0.05);
    handles.chassisGroup.add(skirt);
  });
  const frontLip = new THREE.Mesh(new THREE.BoxGeometry(2.04, 0.1, 0.24), darkTrimMat);
  frontLip.position.set(0, 0.06, frontZ + 0.02);
  handles.chassisGroup.add(frontLip);

  // 2. Sculpted Front Clip & Engine Bay (narrowed at wheel wells so 40" Forgiatos tuck clean!)
  const engineCore = new THREE.Mesh(
    ensureGeometryHasUv(new THREE.BoxGeometry(1.36, 0.58, 1.62)),
    paintMat,
  );
  engineCore.position.set(0, 0.44, 1.64);
  const frontFascia = new THREE.Mesh(
    createContouredPanelGeo(2.02, 0.54, 0.36, 0.025, 0.03),
    paintMat,
  );
  frontFascia.position.set(0, 0.44, frontZ - 0.16);
  const hood = new THREE.Mesh(
    createContouredPanelGeo(1.98, 0.12, 1.68, 0.055, 0.035),
    paintMat,
  );
  hood.position.set(0, 0.78, 1.66);
  const powerDome = new THREE.Mesh(
    createContouredPanelGeo(1.16, 0.06, 1.44, 0.04, 0.025),
    paintMat,
  );
  powerDome.position.set(0, 0.86, 1.64);
  handles.chassisGroup.add(engineCore, frontFascia, hood, powerDome);

  // Smooth curved SUV wheel arch flares tucked cleanly over the 40" Forgiatos
  const tahoeArchGeo = getFlaredWheelArchGeo(0.7, 0.56, 0.24);
  [1.44, -1.32].forEach((az) => {
    [-0.97, 0.97].forEach((fx) => {
      const flare = new THREE.Mesh(tahoeArchGeo, paintMat);
      flare.position.set(fx, 0.28, az);
      handles.chassisGroup.add(flare);
    });
  });

  // 3. Rear SUV Cargo Tub + Rear Quarter Corners + Liftgate Opening
  const rearInnerTub = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.56, 1.62), darkTrimMat);
  rearInnerTub.position.set(0, 0.42, -1.52);
  handles.quarterPanels = handles.quarterPanels ?? [];
  [-0.94, 0.94].forEach((rx) => {
    const rearUpperQuarter = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.34, 1.56),
      paintMat,
    );
    rearUpperQuarter.position.set(rx, 0.72, -1.56);
    rearUpperQuarter.userData.baseX = rx;
    rearUpperQuarter.userData.flexSide = rx < 0 ? -1 : 1;
    const rearCornerPillar = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.64, 0.44),
      paintMat,
    );
    rearCornerPillar.position.set(rx, 0.44, -2.14);
    rearCornerPillar.userData.baseX = rx;
    rearCornerPillar.userData.flexSide = rx < 0 ? -1 : 1;
    handles.chassisGroup.add(rearUpperQuarter, rearCornerPillar);
    handles.quarterPanels!.push(rearUpperQuarter, rearCornerPillar);
  });
  const rearLowerValance = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.28, 0.22), paintMat);
  rearLowerValance.position.set(0, 0.22, rearZ + 0.08);
  handles.chassisGroup.add(rearInnerTub, rearLowerValance);

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

  // 5. Tahoe Interior Cabin (Padded Dash Brow, Backlit Gauges, Nav Screen, Rearview Mirror, Pedals, Console + Pressable Light & Lift Buttons!)
  const dash = new THREE.Mesh(
    createContouredPanelGeo(1.74, 0.34, 0.38, 0.035, 0.03),
    dashMat,
  );
  dash.position.set(0, 0.68, 0.64);
  const dashBrow = new THREE.Mesh(
    createContouredPanelGeo(1.76, 0.07, 0.42, 0.025, 0.02),
    dashPadMat,
  );
  dashBrow.position.set(0, 0.87, 0.64);
  const gaugeBezel = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.16, 0.03), chromeMat);
  gaugeBezel.position.set(-0.44, 0.74, 0.445);
  const tahoeGaugeTex = getGaugeClusterMap();
  const gaugeCluster = new THREE.Mesh(
    new THREE.PlaneGeometry(0.49, 0.13),
    tahoeGaugeTex
      ? new THREE.MeshBasicMaterial({ map: tahoeGaugeTex })
      : new THREE.MeshStandardMaterial({
          color: 0x0f172a,
          emissive: 0x38bdf8,
          emissiveIntensity: 0.9,
        }),
  );
  gaugeCluster.position.set(-0.44, 0.74, 0.425);
  gaugeCluster.rotation.y = Math.PI;
  const centerScreenBezel = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.21, 0.03), chromeMat);
  centerScreenBezel.position.set(0, 0.72, 0.445);
  const centerScreen = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.17, 0.04),
    new THREE.MeshStandardMaterial({
      color: 0x020617,
      emissive: 0x6366f1,
      emissiveIntensity: 0.95,
    }),
  );
  centerScreen.position.set(0, 0.72, 0.435);

  const centerConsole = new THREE.Mesh(
    createContouredPanelGeo(0.34, 0.28, 1.14, 0.015, 0.02),
    dashMat,
  );
  centerConsole.position.set(0, 0.3, 0.14);
  const shifterGate = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.022, 0.22), chromeMat);
  shifterGate.position.set(0, 0.445, 0.26);
  const shifter = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.2, 10), chromeMat);
  shifter.position.set(0, 0.48, 0.26);
  const shifterKnob = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 12), chromeMat);
  shifterKnob.position.set(0, 0.58, 0.26);

  const tahoeCabinKit = buildCabinDetailKit({
    mirrorY: 1.38,
    mirrorZ: 0.54,
    visorWidth: 0.62,
    dashY: 0.74,
    pedalZ: 0.78,
    driverX: -0.44,
    trimMat: dashPadMat,
    chromeMat,
  });
  handles.chassisGroup.add(dashBrow, gaugeBezel, centerScreenBezel, shifterGate, tahoeCabinKit);

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

  // Driver & Front Passenger Bolstered Bucket Seats (positioned right in front of the subwoofer wall)
  [-0.44, 0.44].forEach((sx) => {
    const cushion = new THREE.Mesh(
      createContouredPanelGeo(0.56, 0.15, 0.52, 0.02, 0.025),
      leatherMat,
    );
    cushion.position.set(sx, 0.26, 0.12);
    const backrest = new THREE.Mesh(
      createContouredPanelGeo(0.54, 0.56, 0.14, 0.02, 0.025),
      leatherMat,
    );
    backrest.position.set(sx, 0.58, -0.1);
    backrest.rotation.x = -0.12;
    [-0.23, 0.23].forEach((bx) => {
      const bolster = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.48, 0.16), leatherMat);
      bolster.position.set(sx + bx, 0.56, -0.07);
      bolster.rotation.x = -0.12;
      handles.chassisGroup.add(bolster);
    });
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.46, 0.15), stitchMat);
    stripe.position.set(sx, 0.58, -0.1);
    stripe.rotation.x = -0.12;
    const headrest = new THREE.Mesh(
      createContouredPanelGeo(0.28, 0.17, 0.1, 0.02, 0.02),
      leatherMat,
    );
    headrest.position.set(sx, 0.94, -0.15);
    handles.chassisGroup.add(cushion, backrest, stripe, headrest);
  });

  // 6. Real Working Hinged Front Doors (with contoured skins, mirrors, armrests, speaker rings & recessed handles)
  const doorLen = 1.48;
  const doorH = 0.64;
  ([-1, 1] as const).forEach((side) => {
    const doorPivot = new THREE.Group();
    doorPivot.position.set(side * 0.99, 0.18, 0.78);
    const outerSkin = new THREE.Mesh(
      createContouredPanelGeo(0.085, doorH, doorLen, 0.015, 0.02),
      paintMat,
    );
    outerSkin.position.set(0, doorH * 0.5, -doorLen * 0.5);
    const innerCard = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, doorH * 0.88, doorLen * 0.92),
      leatherMat,
    );
    innerCard.position.set(-side * 0.048, doorH * 0.5, -doorLen * 0.5);
    const armrest = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.06, doorLen * 0.52),
      dashPadMat,
    );
    armrest.position.set(-side * 0.075, doorH * 0.46, -doorLen * 0.48);
    const speakerRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.095, 0.012, 8, 18),
      chromeMat,
    );
    speakerRing.rotation.y = Math.PI / 2;
    speakerRing.position.set(-side * 0.078, doorH * 0.26, -doorLen * 0.25);
    const handlePocket = new THREE.Mesh(
      new THREE.BoxGeometry(0.022, 0.06, 0.2),
      darkTrimMat,
    );
    handlePocket.position.set(side * 0.042, doorH * 0.76, -doorLen * 0.72);
    const chromeHandle = new THREE.Mesh(
      new THREE.BoxGeometry(0.045, 0.04, 0.17),
      chromeMat,
    );
    chromeHandle.position.set(side * 0.058, doorH * 0.76, -doorLen * 0.72);
    const sideTrim = new THREE.Mesh(
      new THREE.BoxGeometry(0.032, 0.055, doorLen * 0.95),
      chromeMat,
    );
    sideTrim.position.set(side * 0.054, doorH * 0.42, -doorLen * 0.5);
    const doorGlass = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.46, doorLen * 0.86),
      glassMat,
    );
    doorGlass.position.set(-side * 0.01, doorH + 0.22, -doorLen * 0.52);
    const mirror = buildRealisticSideMirror({
      side,
      housingMat: paintMat,
      chromeMat,
      style: 'aero',
    });
    mirror.position.set(side * 0.03, doorH + 0.02, -0.18);

    doorPivot.add(
      outerSkin,
      innerCard,
      armrest,
      speakerRing,
      handlePocket,
      chromeHandle,
      sideTrim,
      doorGlass,
      mirror,
    );
    handles.chassisGroup.add(doorPivot);
    if (side < 0) handles.doorLeft = doorPivot;
    else handles.doorRight = doorPivot;
  });

  // 7. Boxy Full-Size Chevy Tahoe SUV Cabin, Pillars, Wipers, Rear Glass & Roof Rack
  const cabinH = 0.66;
  const roofY = 0.86 + cabinH; // ~1.52m in chassis local
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.74, cabinH, 0.05), glassMat);
  windshield.position.set(0, 0.86 + cabinH * 0.5, 0.76);
  windshield.rotation.x = -0.32;
  const tahoeWipers = buildWindshieldWipers(1.56);
  tahoeWipers.position.set(0, 0.88, 0.84);
  tahoeWipers.rotation.x = -0.32;
  handles.chassisGroup.add(windshield, tahoeWipers);

  // A, B, C, D SUV Pillars
  const pillarZList = [0.76, -0.08, -1.06, -2.18];
  pillarZList.forEach((pz, idx) => {
    [-0.9, 0.9].forEach((px) => {
      const pMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.09, cabinH * 1.04, idx === 0 ? 0.1 : 0.16),
        idx === 0 ? paintMat : darkTrimMat,
      );
      pMesh.position.set(px, 0.86 + cabinH * 0.5, pz);
      if (idx === 0) pMesh.rotation.x = -0.32;
      handles.chassisGroup.add(pMesh);
    });
  });

  // Tinted Rear SUV Side Windows (showing subwoofer wall silhouette inside!)
  [-0.91, 0.91].forEach((gx) => {
    const rearSideGlass = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.52, 2.02), glassMat);
    rearSideGlass.position.set(gx, 0.86 + cabinH * 0.48, -1.14);
    handles.chassisGroup.add(rearSideGlass);
  });

  // Full-length Contoured SUV Roof + Chrome Roof Rack Rails
  const roofCap = new THREE.Mesh(
    createContouredPanelGeo(1.88, 0.1, 2.94, 0.03, 0.03),
    paintMat,
  );
  roofCap.position.set(0, roofY, -0.8);
  handles.chassisGroup.add(roofCap);

  [-0.74, 0.74].forEach((rx) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 2.55), chromeMat);
    rail.position.set(rx, roofY + 0.075, -0.82);
    handles.chassisGroup.add(rail);
  });
  [-0.1, -1.55].forEach((cz) => {
    const crossBar = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.035, 0.07), darkTrimMat);
    crossBar.position.set(0, roofY + 0.085, cz);
    handles.chassisGroup.add(crossBar);
  });

  // Animated Hinged Rear Liftgate / Hatch (pivoted at top rear roofline so rotation.x > 0 swings it UP & OUT!)
  const liftgateHinge = new THREE.Group();
  liftgateHinge.position.set(0, roofY - 0.02, rearZ + 0.06);
  const liftgateUpperGlass = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.52, 0.06), glassMat);
  liftgateUpperGlass.position.set(0, -0.3, 0);
  const liftgateLowerPanel = new THREE.Mesh(
    createContouredPanelGeo(1.84, 0.62, 0.1, 0.02, 0.02),
    paintMat,
  );
  liftgateLowerPanel.position.set(0, -0.86, 0);
  const liftgateBadge = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.04), goldBowtieMat);
  liftgateBadge.position.set(0, -0.68, -0.06);
  const liftgateChromeBar = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.05, 0.04), chromeMat);
  liftgateChromeBar.position.set(0, -0.78, -0.05);
  const liftgatePlateFrame = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.03), chromeMat);
  liftgatePlateFrame.position.set(0, -0.94, -0.055);
  liftgateHinge.add(
    liftgateUpperGlass,
    liftgateLowerPanel,
    liftgateBadge,
    liftgateChromeBar,
    liftgatePlateFrame,
  );
  handles.chassisGroup.add(liftgateHinge);
  handles.trunkLid = liftgateHinge;

  // 8. Chevy Front 3D Recessed Chrome Split-Bar Grille, Bowtie, Crystal Quad Headlights, Blade Taillights & Sculpted Bumpers
  const frontBumper = new THREE.Mesh(
    createContouredPanelGeo(2.08, 0.2, 0.24, 0.02, 0.025),
    chromeMat,
  );
  frontBumper.position.set(0, 0.18, frontZ + 0.06);
  const frontPlateFrame = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.04), chromeMat);
  frontPlateFrame.position.set(0, 0.2, frontZ + 0.18);
  const rearBumper = new THREE.Mesh(
    createContouredPanelGeo(2.08, 0.2, 0.24, 0.02, 0.025),
    chromeMat,
  );
  rearBumper.position.set(0, 0.18, rearZ - 0.06);

  const grilleAssembly = buildRealisticGrilleAssembly({
    width: 1.34,
    height: 0.34,
    chromeMat,
    horizontalBars: 3,
  });
  grilleAssembly.position.set(0, 0.52, frontZ + 0.01);
  const grilleCrossBar = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.058, 0.06), chromeMat);
  grilleCrossBar.position.set(0, 0.52, frontZ + 0.04);
  const bowtie = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.085, 0.045), goldBowtieMat);
  bowtie.position.set(0, 0.52, frontZ + 0.07);
  handles.chassisGroup.add(
    frontBumper,
    frontPlateFrame,
    rearBumper,
    grilleAssembly,
    grilleCrossBar,
    bowtie,
  );

  // Stacked Chevy Multi-Layer Crystal Quad Headlights + Amber Corners + Tall SUV Blade Taillights
  [-0.84, 0.84].forEach((hx) => {
    const upperBeam = buildRealisticHeadlightPod({
      shape: 'quad_bar',
      width: 0.25,
      height: 0.115,
      chromeMat,
      tintColor: 0xe0f2fe,
    });
    upperBeam.position.set(hx, 0.58, frontZ + 0.02);
    const lowerAmber = buildRealisticHeadlightPod({
      shape: 'quad_bar',
      width: 0.25,
      height: 0.088,
      chromeMat,
      tintColor: 0xfbbf24,
    });
    lowerAmber.position.set(hx, 0.44, frontZ + 0.02);
    handles.chassisGroup.add(upperBeam, lowerAmber);
  });
  [-0.9, 0.9].forEach((tx) => {
    const tail = buildRealisticTaillightPod({
      style: 'blade',
      width: 0.15,
      height: 0.48,
      chromeMat,
    });
    tail.position.set(tx, 0.62, rearZ - 0.02);
    handles.chassisGroup.add(tail);
  });

  // Dual Chrome Exhaust Tips
  [-0.64, 0.64].forEach((ex) => {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.38, 10), chromeMat);
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(ex, 0.1, rearZ - 0.14);
    handles.chassisGroup.add(pipe);
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
    color: 0x263244,
    roughness: 0.3,
    metalness: 0.85,
    envMapIntensity: 1.4,
  });
  const brassMat = createChromeMaterial(rimColor);
  const chromeMat = createChromeMaterial(0xf1f5f9);
  const leatherMat = createAutomotiveLeatherMaterial(0x1c1917);
  const walnutMat = createWalnutWoodMaterial();
  const carbonMat = createCarbonFiberMaterial();

  if (m.kind === 'chassis_frame') {
    const plate = new THREE.Mesh(
      createContouredPanelGeo(0.98, 0.16, 0.98, 0.015, 0.02),
      steelMat,
    );
    const barL = new THREE.Mesh(
      createContouredPanelGeo(0.12, 0.22, 1.02, 0.012, 0.018),
      paintMat,
    );
    barL.position.x = -0.42;
    const barR = barL.clone();
    barR.position.x = 0.42;
    const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.08, 0.12), chromeMat);
    crossBeam.position.set(0, 0.06, 0);
    part.add(plate, barL, barR, crossBeam);
  } else if (m.kind === 'cockpit_seat') {
    const tub = new THREE.Mesh(
      createContouredPanelGeo(0.98, 0.2, 0.98, 0.015, 0.02),
      steelMat,
    );
    const seatCushion = new THREE.Mesh(
      createContouredPanelGeo(0.66, 0.12, 0.5, 0.02, 0.02),
      leatherMat,
    );
    seatCushion.position.set(0, 0.14, -0.06);
    const seatBack = new THREE.Mesh(
      createContouredPanelGeo(0.66, 0.56, 0.14, 0.02, 0.025),
      leatherMat,
    );
    seatBack.position.set(0, 0.42, -0.32);
    seatBack.rotation.x = -0.14;
    const headrest = new THREE.Mesh(
      createContouredPanelGeo(0.28, 0.16, 0.1, 0.015, 0.018),
      leatherMat,
    );
    headrest.position.set(0, 0.74, -0.37);
    const dash = new THREE.Mesh(
      createContouredPanelGeo(0.88, 0.34, 0.26, 0.025, 0.025),
      paintMat,
    );
    dash.position.set(0, 0.28, 0.35);
    const dashBrow = new THREE.Mesh(
      createContouredPanelGeo(0.9, 0.06, 0.28, 0.015, 0.015),
      carbonMat,
    );
    dashBrow.position.set(0, 0.46, 0.35);
    const gaugeTex = getGaugeClusterMap();
    const gaugeBezel = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.13, 0.025), chromeMat);
    gaugeBezel.position.set(0, 0.35, 0.225);
    const gaugeFace = new THREE.Mesh(
      new THREE.PlaneGeometry(0.38, 0.1),
      gaugeTex
        ? new THREE.MeshBasicMaterial({ map: gaugeTex })
        : new THREE.MeshStandardMaterial({ color: 0x0f172a, emissive: 0x38bdf8 }),
    );
    gaugeFace.position.set(0, 0.35, 0.21);
    gaugeFace.rotation.y = Math.PI;
    const wheelGroup = buildDetailedSteeringWheel({
      style: 'sport_suv',
      radius: 0.17,
      chromeMat: brassMat,
      leatherMat,
      accentColor: 0xf59e0b,
    });
    wheelGroup.position.set(0, 0.46, 0.16);
    wheelGroup.rotation.x = 0.48;
    const headlight = buildRealisticHeadlightPod({
      shape: 'round',
      radius: 0.105,
      chromeMat,
      withHood: true,
    });
    headlight.position.set(0, 0.3, 0.5);
    part.add(
      tub,
      seatCushion,
      seatBack,
      headrest,
      dash,
      dashBrow,
      gaugeBezel,
      gaugeFace,
      wheelGroup,
      headlight,
    );
    handles.helmWheel = wheelGroup;
  } else if (m.kind === 'armor_plate') {
    const slab = new THREE.Mesh(createContouredPanelGeo(1.04, 0.62, 1.02, 0.035, 0.03), paintMat);
    slab.position.y = 0.14;
    const powerBulge = new THREE.Mesh(
      createContouredPanelGeo(0.58, 0.07, 0.86, 0.025, 0.02),
      paintMat,
    );
    powerBulge.position.set(0, 0.48, -0.02);
    const bumper = new THREE.Mesh(
      createContouredPanelGeo(1.08, 0.2, 0.24, 0.015, 0.02),
      chromeMat,
    );
    bumper.position.set(0, 0.04, 0.46);
    const grille = buildRealisticGrilleAssembly({
      width: 0.62,
      height: 0.28,
      chromeMat,
      horizontalBars: 3,
    });
    grille.position.set(0, 0.26, 0.51);
    [-0.4, 0.4].forEach((hx) => {
      const lamp = buildRealisticHeadlightPod({
        shape: 'round',
        radius: 0.078,
        chromeMat,
        withHood: true,
      });
      lamp.position.set(hx, 0.28, 0.51);
      const towRing = new THREE.Mesh(new THREE.TorusGeometry(0.038, 0.01, 8, 12), chromeMat);
      towRing.position.set(hx * 0.72, -0.04, 0.56);
      part.add(lamp, towRing);
    });
    const rivetL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.85), steelMat);
    rivetL.position.set(-0.48, 0.15, 0);
    const rivetR = rivetL.clone();
    rivetR.position.x = 0.48;
    part.add(slab, powerBulge, bumper, grille, rivetL, rivetR);
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

    const assets = getSharedShowroomAssets();
    const tireOuter = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 0.34, 24, 1, true),
      assets.tireMat,
    );
    tireOuter.rotation.z = Math.PI / 2;
    [-0.165, 0.165].forEach((sx) => {
      const sidewall = new THREE.Mesh(
        new THREE.TorusGeometry(0.34, 0.075, 8, 22),
        assets.tireSidewallMat,
      );
      sidewall.rotation.y = Math.PI / 2;
      sidewall.position.x = sx;
      spinGroup.add(sidewall);
    });
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.28, 0.32, 20, 1, true),
      brassMat,
    );
    barrel.rotation.z = Math.PI / 2;
    const rimLip = new THREE.Mesh(new THREE.TorusGeometry(0.275, 0.022, 8, 20), chromeMat);
    rimLip.rotation.y = Math.PI / 2;
    rimLip.position.x = sideSign * 0.16;
    const hubCap = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.075, 0.08, 12), chromeMat);
    hubCap.rotation.z = Math.PI / 2;
    hubCap.position.x = sideSign * 0.13;
    spinGroup.add(tireOuter, barrel, rimLip, hubCap);
    for (let s = 0; s < 6; s++) {
      const a = (s / 6) * Math.PI * 2;
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.26, 0.035), brassMat);
      spoke.position.set(sideSign * 0.11, Math.cos(a) * 0.135, Math.sin(a) * 0.135);
      spoke.rotation.x = a;
      spinGroup.add(spoke);
    }
    const lugGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.024, 6);
    lugGeo.rotateZ(Math.PI / 2);
    for (let l = 0; l < 5; l++) {
      const la = (l / 5) * Math.PI * 2;
      const lug = new THREE.Mesh(lugGeo, chromeMat);
      lug.position.set(sideSign * 0.15, Math.cos(la) * 0.052, Math.sin(la) * 0.052);
      spinGroup.add(lug);
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
    const block = new THREE.Mesh(
      createContouredPanelGeo(0.86, 0.52, 0.88, 0.02, 0.02),
      steelMat,
    );
    block.position.y = 0.18;
    const boilerDrum = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.84, 16), brassMat);
    boilerDrum.rotation.x = Math.PI / 2;
    boilerDrum.position.y = 0.42;
    [-0.28, 0, 0.28].forEach((bz) => {
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.286, 0.014, 8, 18), chromeMat);
      band.position.set(0, 0.42, bz);
      part.add(band);
    });
    const exhaustA = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.68, 12), chromeMat);
    exhaustA.position.set(-0.26, 0.7, -0.22);
    const exhaustB = exhaustA.clone();
    exhaustB.position.x = 0.26;
    const piston = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.095, 0.24, 12), brassMat);
    piston.position.set(0, 0.62, 0.16);
    part.add(block, boilerDrum, exhaustA, exhaustB, piston);
    handles.pistons.push(piston);
  } else if (m.kind === 'boat_hull') {
    const pontoon = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.86, 6, 14), walnutMat);
    pontoon.rotation.x = Math.PI / 2;
    pontoon.position.y = -0.05;
    const keel = new THREE.Mesh(
      createContouredPanelGeo(0.86, 0.14, 0.96, 0.02, 0.02),
      paintMat,
    );
    keel.position.y = 0.16;
    const rubRail = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.035, 0.98), chromeMat);
    rubRail.position.y = 0.2;
    part.add(pontoon, keel, rubRail);
  } else if (m.kind === 'rotor_wing') {
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.58, 12), chromeMat);
    mast.position.y = 0.24;
    const wing = new THREE.Mesh(
      createContouredPanelGeo(1.58, 0.08, 0.48, 0.025, 0.02),
      paintMat,
    );
    wing.position.y = 0.14;
    const rotorHub = new THREE.Group();
    rotorHub.position.y = 0.56;
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.14, 14), brassMat);
    const bladeA = new THREE.Mesh(new THREE.BoxGeometry(2.38, 0.035, 0.2), carbonMat);
    const bladeB = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.035, 2.38), carbonMat);
    rotorHub.add(cap, bladeA, bladeB);
    part.add(mast, wing, rotorHub);
    handles.rotors.push(rotorHub);
  } else if (m.kind === 'steering_rudder') {
    const mount = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.3, 0.65), steelMat);
    const finPivot = new THREE.Group();
    const blade = new THREE.Mesh(
      createContouredPanelGeo(0.1, 0.62, 0.56, 0.015, 0.015),
      paintMat,
    );
    blade.position.y = 0.22;
    const trimTab = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.05, 0.58), chromeMat);
    trimTab.position.y = 0.52;
    finPivot.add(blade, trimTab);
    part.add(mount, finPivot);
    handles.rudders.push(finPivot);
  } else if (m.kind === 'storage_rack') {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.14, 0.92), steelMat);
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.52, 0.8), walnutMat);
    crate.position.y = 0.3;
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.1, 0.84), brassMat);
    strap.position.y = 0.42;
    part.add(frame, crate, strap);
  }

  return part;
}

function buildSpecialtyGarageCar(
  vehicle: ModularVehicleData,
  handles: ModularVehicleMeshHandles,
): void {
  const preset = vehicle.preset;
  const isMiniTruck = preset === 'mini_truck';
  const isElCamino = preset === 'el_camino';
  const isVan = preset === 'van_90s';
  const isTownCar = preset === 'town_car';
  const paintColor = vehicle.paintColor || (isElCamino ? '#b91c1c' : isTownCar ? '#050505' : '#0f766e');
  const paintMat = createAutomotivePaintMaterial(paintColor);
  const chromeMat = createChromeMaterial(vehicle.rimColor || '#f8fafc');
  const darkTrimMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.68, metalness: 0.28 });
  const leatherMat = createAutomotiveLeatherMaterial(isTownCar ? 0x090909 : 0x20140d);
  const carpetMat = createAutomotiveCarpetMaterial(isTownCar ? 0x090909 : 0x17110c);
  const glassMat = createAutomotiveGlassMaterial(0.34);
  const headlightMat = new THREE.MeshStandardMaterial({ color: 0xfef9c3, emissive: 0xfef08a, emissiveIntensity: 1.45, roughness: 0.15 });
  const taillightMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xdc2626, emissiveIntensity: 1.4, roughness: 0.18 });

  const wheelScale = vehicle.wheelScale ?? (isElCamino ? 1.26 : isVan ? 1.08 : isMiniTruck ? 0.82 : 0.88);
  const suspension = vehicle.suspensionOffset ?? (isVan ? 0.08 : -0.2);
  const bodyRideY = Math.max(0.26, 0.38 + suspension);
  handles.chassisGroup.position.y = bodyRideY;
  const baseWheelY = 0.37 * wheelScale;

  const bodyLen = isVan ? 5.45 : isTownCar ? 5.4 : isElCamino ? 5.15 : 4.5;
  const bodyWidth = isVan ? 2.02 : isTownCar ? 1.96 : isElCamino ? 1.92 : 1.78;
  const bodyHeight = isVan ? 0.76 : isElCamino ? 0.61 : isMiniTruck ? 0.54 : 0.63;
  const hoodLen = isVan ? 0.82 : isTownCar ? 1.34 : isElCamino ? 1.22 : 1.02;
  const cabLen = isVan ? 3.9 : isTownCar ? 2.3 : isElCamino ? 1.74 : 1.54;
  const cabCenter = isVan ? -0.5 : isTownCar ? -0.16 : isElCamino ? 0.18 : 0.06;
  const bedLen = bodyLen - hoodLen - cabLen - 0.2;
  const bedCenter = -bodyLen * 0.5 + bedLen * 0.5;
  const frontZ = bodyLen * 0.5;
  const rearZ = -bodyLen * 0.5;
  const roofY = isVan ? 2.08 : isTownCar ? 1.62 : isElCamino ? 1.48 : 1.36;

  const addBox = (
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    material: THREE.Material,
    parent: THREE.Object3D = handles.chassisGroup,
  ) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  // Full-length frame, floor and sculpted lower body.
  addBox(bodyWidth - 0.2, 0.13, bodyLen - 0.1, 0, 0.12, 0, darkTrimMat);
  addBox(bodyWidth - 0.12, bodyHeight, bodyLen, 0, 0.24 + bodyHeight * 0.5, 0, paintMat);
  addBox(bodyWidth - 0.18, 0.06, bodyLen - 0.55, 0, 0.28, 0, carpetMat);

  // Hood, nose, grille, bumpers and lights.
  addBox(bodyWidth * 0.96, 0.13, hoodLen, 0, 0.78, frontZ - hoodLen * 0.5 - 0.06, paintMat);
  addBox(bodyWidth * 0.9, 0.24, 0.11, 0, 0.52, frontZ + 0.015, isTownCar ? chromeMat : darkTrimMat);
  addBox(bodyWidth * 0.7, 0.09, 0.16, 0, 0.34, frontZ + 0.08, chromeMat);
  addBox(bodyWidth + 0.03, 0.13, 0.18, 0, 0.33, frontZ + 0.12, chromeMat);
  addBox(bodyWidth + 0.03, 0.13, 0.18, 0, 0.33, rearZ - 0.11, chromeMat);
  [-0.62, 0.62].forEach((x) => {
    addBox(0.3, 0.17, 0.05, x * (bodyWidth / 1.9), 0.57, frontZ + 0.06, headlightMat);
    addBox(0.34, 0.18, 0.05, x * (bodyWidth / 1.9), 0.56, rearZ - 0.07, taillightMat);
  });

  if (isVan || isTownCar) {
    // Long roof and passenger cabin.
    addBox(bodyWidth * 0.93, isVan ? 1.3 : 0.62, cabLen, 0, isVan ? 1.36 : 1.22, cabCenter, paintMat);
    addBox(bodyWidth * 0.86, 0.1, cabLen * 0.96, 0, roofY, cabCenter, paintMat);
    const windowY = isVan ? 1.58 : 1.24;
    const windowH = isVan ? 0.48 : 0.34;
    [-1, 1].forEach((side) => {
      addBox(0.025, windowH, cabLen * 0.82, side * (bodyWidth * 0.47), windowY, cabCenter, glassMat);
    });
    addBox(bodyWidth * 0.78, windowH, 0.03, 0, windowY, cabCenter + cabLen * 0.51, glassMat);
    addBox(bodyWidth * 0.78, windowH, 0.03, 0, windowY, cabCenter - cabLen * 0.51, glassMat);
    if (isVan) {
      // 1990s extended bubble van: tall rear barn doors, roof vent and running boards.
      addBox(bodyWidth * 0.96, 1.44, 0.06, 0, 1.28, rearZ - 0.015, paintMat);
      addBox(0.035, 1.22, 0.05, 0, 1.17, rearZ - 0.06, darkTrimMat);
      addBox(0.6, 0.09, 0.74, 0, roofY + 0.1, -0.6, darkTrimMat);
      [-1, 1].forEach((side) => addBox(0.3, 0.06, 2.6, side * bodyWidth * 0.46, 0.28, -0.4, darkTrimMat));
    } else {
      // Black-on-black Town Car: long trunk, chrome beltline and opera windows.
      addBox(bodyWidth * 0.97, 0.12, 1.42, 0, 0.79, rearZ + 0.82, paintMat);
      [-1, 1].forEach((side) => {
        addBox(0.035, 0.035, bodyLen * 0.72, side * bodyWidth * 0.49, 0.83, 0.2, chromeMat);
      });
      const trunkHinge = new THREE.Group();
      trunkHinge.position.set(0, 0.85, rearZ + 1.48);
      addBox(bodyWidth * 0.9, 0.08, 1.34, 0, 0, -0.67, paintMat, trunkHinge);
      handles.chassisGroup.add(trunkHinge);
      handles.trunkLid = trunkHinge;
    }
  } else {
    // Mini truck / El Camino cab and open pickup bed.
    addBox(bodyWidth * 0.94, 0.9, cabLen, 0, 0.95, cabCenter, paintMat);
    addBox(bodyWidth * 0.86, 0.09, cabLen * 0.9, 0, isElCamino ? 1.48 : 1.36, cabCenter, paintMat);
    [-1, 1].forEach((side) => {
      addBox(0.025, 0.37, cabLen * 0.76, side * bodyWidth * 0.47, 1.15, cabCenter, glassMat);
    });
    addBox(bodyWidth * 0.76, 0.38, 0.03, 0, 1.15, cabCenter + cabLen * 0.51, glassMat);
    addBox(bodyWidth - 0.08, 0.05, Math.max(0.8, bedLen - 0.1), 0, 0.61, bedCenter, carpetMat);
    [-1, 1].forEach((side) => {
      addBox(0.09, 0.42, bedLen, side * (bodyWidth * 0.5 - 0.045), 0.82, bedCenter, paintMat);
      addBox(0.12, 0.06, bedLen, side * (bodyWidth * 0.5 - 0.045), 1.04, bedCenter, chromeMat);
    });
    addBox(bodyWidth, 0.46, 0.08, 0, 0.82, rearZ + 0.04, paintMat);
    addBox(bodyWidth, 0.06, 0.11, 0, 1.06, rearZ + 0.04, chromeMat);
  }

  // Four opening doors (left-hand-drive cabin, driver on the left).
  ([-1, 1] as const).forEach((side) => {
    const door = new THREE.Group();
    door.position.set(side * bodyWidth * 0.49, 0.5, cabCenter + cabLen * 0.18);
    addBox(0.055, 0.62, cabLen * (isVan ? 0.42 : 0.48), 0, 0.28, -cabLen * 0.2, paintMat, door);
    addBox(0.025, 0.3, cabLen * 0.3, 0, 0.53, -cabLen * 0.18, glassMat, door);
    addBox(0.065, 0.045, 0.18, 0, 0.36, -cabLen * 0.05, chromeMat, door);
    handles.chassisGroup.add(door);
    if (side < 0) handles.doorLeft = door;
    else handles.doorRight = door;
  });

  // Detailed left-hand-drive interior, dash, gauges and seats.
  addBox(bodyWidth * 0.86, 0.22, 0.3, 0, 0.83, cabCenter + cabLen * 0.34, darkTrimMat);
  addBox(0.4, 0.11, 0.04, -0.42, 0.94, cabCenter + cabLen * 0.24, chromeMat);
  addBox(0.3, 0.1, 0.035, 0.03, 0.9, cabCenter + cabLen * 0.3, darkTrimMat);
  const seat = (x: number, z: number, rear = false) => {
    addBox(rear ? 1.05 : 0.5, 0.13, 0.54, x, 0.55, z, leatherMat);
    addBox(rear ? 1.05 : 0.5, 0.46, 0.11, x, 0.77, z - 0.28, leatherMat);
  };
  seat(-0.42, -0.02);
  seat(0.42, -0.02);
  if (isTownCar) seat(0, -1.2, true);
  const steering = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.026, 8, 20), chromeMat);
  steering.position.set(-0.42, 1.02, cabCenter + cabLen * 0.22);
  steering.rotation.x = -0.42;
  handles.chassisGroup.add(steering);
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.34, 10), darkTrimMat);
  column.position.set(-0.42, 0.91, cabCenter + cabLen * 0.32);
  column.rotation.x = Math.PI * 0.36;
  handles.chassisGroup.add(column);

  // Visible chrome hydraulic pump rack, tanks, batteries and valve block.
  const pumpRack = new THREE.Group();
  pumpRack.position.set(0, 0.32, isVan ? -1.4 : isTownCar ? -1.36 : bedCenter);
  handles.chassisGroup.add(pumpRack);
  [-0.45, -0.15, 0.15, 0.45].forEach((x) => {
    const pump = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.085, 0.32, 12), chromeMat);
    pump.position.set(x, 0.06, 0);
    const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.13, 12), new THREE.MeshStandardMaterial({ color: 0xb45309, metalness: 0.72, roughness: 0.25 }));
    motor.position.set(x, 0.25, 0);
    pumpRack.add(pump, motor);
  });
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.78, 14), chromeMat);
  tank.rotation.z = Math.PI / 2;
  tank.position.set(0, -0.03, 0.2);
  pumpRack.add(tank);
  const valve = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.11, 0.18), new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.7, roughness: 0.24 }));
  valve.position.set(0, 0.02, 0.42);
  pumpRack.add(valve);

  // Four independent hydraulic wheels.
  const wheelStyle = isElCamino ? 'donk_30' : isVan ? 'spinner_13' : 'wire_whitewall';
  const wheelbase = isVan ? 1.72 : isTownCar ? 1.68 : isElCamino ? 1.52 : 1.28;
  const track = bodyWidth * 0.5 - 0.03;
  const wheelCoords: Array<{ corner: 'fl' | 'fr' | 'rl' | 'rr'; x: number; z: number; side: -1 | 1; isFront: boolean }> = [
    { corner: 'fl', x: -track, z: wheelbase, side: -1, isFront: true },
    { corner: 'fr', x: track, z: wheelbase, side: 1, isFront: true },
    { corner: 'rl', x: -track, z: -wheelbase, side: -1, isFront: false },
    { corner: 'rr', x: track, z: -wheelbase, side: 1, isFront: false },
  ];
  for (const wc of wheelCoords) {
    const cornerRoot = new THREE.Group();
    cornerRoot.position.set(wc.x, baseWheelY, wc.z);
    const { steerPivot, spinGroup, spinnerHub } = buildCustomWheel(
      wheelStyle,
      wc.side,
      vehicle.rimColor || '#f8fafc',
      wheelScale,
      chromeMat,
      undefined,
      isElCamino ? 'orange' : isTownCar ? 'lime' : 'red',
    );
    cornerRoot.add(steerPivot);
    handles.root.add(cornerRoot);
    handles.wheels.push(spinGroup);
    if (spinnerHub) {
      handles.spinners = handles.spinners ?? [];
      handles.spinners.push(spinnerHub);
    }
    if (wc.isFront) handles.steerWheels.push(steerPivot);
    handles.wheelCorners.push({ obj: cornerRoot, corner: wc.corner, baseY: baseWheelY });
  }
}

const ENGRAVING_TEXTURE_CACHE = new Map<string, THREE.Texture | null>();

function createEngravingTexture(designId: string): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  if (ENGRAVING_TEXTURE_CACHE.has(designId)) {
    return ENGRAVING_TEXTURE_CACHE.get(designId) ?? null;
  }
  const design = FACILITY_ENGRAVING_BY_ID.get(designId);
  if (!design) return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.clearRect(0, 0, 512, 256);
  ctx.strokeStyle = design.color;
  ctx.fillStyle = design.color;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = design.color;
  ctx.shadowBlur = 7;
  const cx = 256;
  const cy = 128;
  switch (design.motif) {
    case 'skull':
      ctx.beginPath();
      ctx.arc(cx, cy - 10, 58, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx - 22, cy - 16, 12, 0, Math.PI * 2);
      ctx.arc(cx + 22, cy - 16, 12, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(cx + i * 16, cy + 34);
        ctx.lineTo(cx + i * 16, cy + 56);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(cx - 86, cy - 58);
      ctx.lineTo(cx - 132, cy - 8);
      ctx.moveTo(cx + 86, cy - 58);
      ctx.lineTo(cx + 132, cy - 8);
      ctx.stroke();
      break;
    case 'crown':
      ctx.beginPath();
      ctx.moveTo(cx - 92, cy + 34);
      ctx.lineTo(cx - 92, cy - 42);
      ctx.lineTo(cx - 42, cy - 4);
      ctx.lineTo(cx, cy - 62);
      ctx.lineTo(cx + 42, cy - 4);
      ctx.lineTo(cx + 92, cy - 42);
      ctx.lineTo(cx + 92, cy + 34);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - 96, cy + 50);
      ctx.lineTo(cx + 96, cy + 50);
      ctx.stroke();
      [cx - 52, cx, cx + 52].forEach((x) => {
        ctx.beginPath();
        ctx.arc(x, cy + 16, 7, 0, Math.PI * 2);
        ctx.fill();
      });
      break;
    case 'flames':
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(cx + i * 42 - 30, cy + 62);
        ctx.bezierCurveTo(
          cx + i * 42 - 10,
          cy + 10,
          cx + i * 42 + 34,
          cy + 4,
          cx + i * 42 + 18,
          cy - 66 - Math.abs(i) * 10,
        );
        ctx.bezierCurveTo(
          cx + i * 42 + 50,
          cy - 8,
          cx + i * 42 + 28,
          cy + 34,
          cx + i * 42 + 30,
          cy + 62,
        );
        ctx.stroke();
      }
      break;
    case 'roses':
      for (let i = 0; i < 3; i++) {
        const x = cx - 58 + i * 58;
        const y = cy + (i % 2 === 0 ? 4 : -16);
        ctx.beginPath();
        for (let r = 10; r <= 40; r += 10) {
          ctx.arc(x, y, r, 0.2 + i, Math.PI * 1.6 + i);
        }
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y + 40);
        ctx.quadraticCurveTo(x - 26, y + 74, x - 8, y + 98);
        ctx.stroke();
      }
      break;
    case 'nautical':
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const inner = i % 2 === 0 ? 34 : 66;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * 88, cy + Math.sin(a) * 88);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a - 0.24) * inner, cy + Math.sin(a - 0.24) * inner);
        ctx.lineTo(cx + Math.cos(a) * 96, cy + Math.sin(a) * 96);
        ctx.lineTo(cx + Math.cos(a + 0.24) * inner, cy + Math.sin(a + 0.24) * inner);
        ctx.stroke();
      }
      break;
    case 'dice':
      [-58, 58].forEach((ox, index) => {
        ctx.save();
        ctx.translate(cx + ox, cy + (index === 0 ? 12 : -12));
        ctx.rotate(index === 0 ? -0.18 : 0.18);
        ctx.strokeRect(-46, -46, 92, 92);
        const pips = index === 0 ? [-20, 0, 20] : [-20, 20];
        pips.forEach((p) => {
          ctx.beginPath();
          ctx.arc(p, p * (index === 0 ? 1 : -1), 6, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
      });
      break;
    case 'gator':
      ctx.beginPath();
      ctx.ellipse(cx, cy + 8, 104, 34, 0, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = -4; i <= 4; i++) {
        ctx.beginPath();
        ctx.moveTo(cx + i * 22, cy - 24);
        ctx.lineTo(cx + i * 22 + 10, cy - 58);
        ctx.lineTo(cx + i * 22 + 20, cy - 24);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(cx - 34, cy - 4, 8, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'scallops':
      for (let row = 0; row < 2; row++) {
        for (let i = -3; i <= 3; i++) {
          ctx.beginPath();
          ctx.arc(cx + i * 58, cy + (row === 0 ? -18 : 44), 44, Math.PI, 0);
          ctx.stroke();
        }
      }
      break;
    default:
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.arc(cx + i * 62, cy - 12, 48, Math.PI * 0.15, Math.PI * 0.95);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx + i * 62, cy + 38, 30, Math.PI * 1.15, Math.PI * 1.95);
        ctx.stroke();
      }
      break;
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  ENGRAVING_TEXTURE_CACHE.set(designId, texture);
  return texture;
}

function addEngravingDetails(
  vehicle: ModularVehicleData,
  handles: ModularVehicleMeshHandles,
): void {
  if (!vehicle.engravingDesign) return;
  const design = FACILITY_ENGRAVING_BY_ID.get(vehicle.engravingDesign);
  if (!design) return;
  const texture = createEngravingTexture(design.id);
  if (!texture) return;
  const color = new THREE.Color(vehicle.engravingColor ?? design.color);
  const decalMaterial = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    toneMapped: false,
  });
  const backingMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a1a1d,
    roughness: 0.26,
    metalness: 0.92,
  });
  const longBody =
    vehicle.preset === 'lowrider' ||
    vehicle.preset === 'donk' ||
    vehicle.preset === 'slab' ||
    vehicle.preset === 'cadillac_coupe_deville' ||
    vehicle.preset === 'town_car';
  const frontZ = longBody ? 2.3 : 1.85;
  const rearZ = longBody ? -2.22 : -1.82;
  const bumperY = 0.56;

  const bumperPlate = (z: number, facingBack: boolean, width: number) => {
    const backing = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.2, 0.035),
      backingMaterial,
    );
    backing.position.set(0, bumperY, z);
    const decal = new THREE.Mesh(
      new THREE.PlaneGeometry(width - 0.04, 0.18),
      decalMaterial,
    );
    decal.position.set(0, bumperY, z + (facingBack ? -0.021 : 0.021));
    if (facingBack) decal.rotation.y = Math.PI;
    handles.chassisGroup.add(backing, decal);
  };
  bumperPlate(frontZ + 0.03, false, 1.35);
  bumperPlate(rearZ - 0.03, true, 1.45);

  [-1, 1].forEach((side) => {
    const backing = new THREE.Mesh(
      new THREE.BoxGeometry(0.035, 0.58, 1.0),
      backingMaterial,
    );
    backing.position.set(side * 0.93, 0.78, -1.18);
    const decal = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 0.54), decalMaterial);
    decal.position.set(side * 0.95, 0.78, -1.18);
    decal.rotation.y = side < 0 ? -Math.PI / 2 : Math.PI / 2;
    handles.chassisGroup.add(backing, decal);
  });

  const wheelScale = vehicle.wheelScale ?? 1;
  for (const corner of handles.wheelCorners) {
    const side = corner.corner.endsWith('l') ? -1 : 1;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.29 * wheelScale, 0.028 * wheelScale, 8, 32),
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.65,
        roughness: 0.2,
        metalness: 0.9,
      }),
    );
    ring.rotation.y = Math.PI / 2;
    ring.position.set(side * 0.1 * wheelScale, 0, 0);
    corner.obj.add(ring);
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1 * wheelScale, 0.1 * wheelScale, 0.025, 20),
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.5,
        metalness: 0.94,
        roughness: 0.18,
      }),
    );
    cap.rotation.z = Math.PI / 2;
    cap.position.set(side * 0.14 * wheelScale, 0, 0);
    corner.obj.add(cap);
  }
}

function addRestorationRaceHardware(
  vehicle: ModularVehicleData,
  handles: ModularVehicleMeshHandles,
): void {
  const group = handles.chassisGroup;
  const steel = new THREE.MeshStandardMaterial({
    color: 0x1b1d21,
    roughness: 0.28,
    metalness: 0.88,
  });
  const castBlack = new THREE.MeshStandardMaterial({
    color: 0x0c0d0f,
    roughness: 0.52,
    metalness: 0.55,
  });
  const chrome = createChromeMaterial('#e5e7eb');

  const tube = (
    ax: number,
    ay: number,
    az: number,
    bx: number,
    by: number,
    bz: number,
    radius = 0.045,
  ) => {
    const start = new THREE.Vector3(ax, ay, az);
    const end = new THREE.Vector3(bx, by, bz);
    const delta = end.clone().sub(start);
    const length = delta.length();
    if (length < 0.01) return;
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, length, 10),
      steel,
    );
    mesh.position.copy(start).addScaledVector(delta, 0.5);
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      delta.normalize(),
    );
    group.add(mesh);
  };

  if (vehicle.rollCage) {
    for (const side of [-1, 1]) {
      tube(side * 0.7, 0.2, 0.58, side * 0.66, 1.42, 0.4);
      tube(side * 0.7, 0.2, -0.95, side * 0.66, 1.42, -0.95);
      tube(side * 0.66, 1.42, 0.4, side * 0.66, 1.42, -0.95);
      tube(side * 0.72, 0.52, 0.52, side * 0.72, 0.68, -0.9, 0.038);
      tube(side * 0.66, 1.42, -0.95, side * 0.56, 0.3, -1.72, 0.038);
    }
    tube(-0.66, 1.14, -0.95, 0.66, 1.14, -0.95, 0.04);
  }

  if (vehicle.hoodBlower) {
    const block = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.28, 0.54),
      castBlack,
    );
    block.position.set(0, 0.9, 1.46);
    const caseMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.58, 0.18, 0.62),
      chrome,
    );
    caseMesh.position.set(0, 1.11, 1.46);
    const hat = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.14, 0.38), chrome);
    hat.position.set(0, 1.25, 1.46);
    group.add(block, caseMesh, hat);
    for (const side of [-1, 1]) {
      const stack = new THREE.Mesh(
        new THREE.CylinderGeometry(0.068, 0.078, 0.16, 12),
        chrome,
      );
      stack.position.set(side * 0.13, 1.38, 1.46);
      group.add(stack);
    }
  }
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
  } else if (
    vehicle.preset === 'mini_truck' ||
    vehicle.preset === 'el_camino' ||
    vehicle.preset === 'van_90s' ||
    vehicle.preset === 'town_car'
  ) {
    buildSpecialtyGarageCar(vehicle, handles);
  } else if (
    vehicle.preset === 'lowrider' ||
    vehicle.preset === 'donk' ||
    vehicle.preset === 'slab' ||
    vehicle.preset === 'cadillac_coupe_deville'
  ) {
    buildCustomStreetShowCar(vehicle, handles);
  } else if (vehicle.preset === 'sports_car') {
    buildExoticSupercarMesh(vehicle, handles);
  } else {
    const rimColor = vehicle.rimColor || '#d97706';
    const paintColor = vehicle.paintColor || '#d97706';
    const wheelScale = vehicle.wheelScale ?? 1.0;

    for (const mod of vehicle.modules) {
      const part = buildModulePart(
        mod,
        paintColor,
        rimColor,
        wheelScale,
        handles,
      );
      if (mod.kind === 'offroad_wheel') {
        part.position.y -= (vehicle.suspensionOffset ?? 0) * 0.65;
      }
      chassisGroup.add(part);
    }

    // Real working hinged doors + trunk lid + sculpted interior/exterior trim on ALL modular vehicles!
    const doorPaintMat = createAutomotivePaintMaterial(paintColor);
    const doorLeatherMat = createAutomotiveLeatherMaterial(0x1f242c);
    const doorTrimMat = new THREE.MeshStandardMaterial({
      color: 0x161920,
      roughness: 0.7,
    });
    const handleMat = createChromeMaterial(rimColor);
    ([-1, 1] as const).forEach((side) => {
      const doorPivot = new THREE.Group();
      doorPivot.position.set(side * 0.64, 0.92, 0.58);
      const panel = new THREE.Mesh(
        createContouredPanelGeo(0.08, 0.54, 1.05, 0.015, 0.018),
        doorPaintMat,
      );
      panel.position.set(0, 0.24, -0.52);
      const innerCard = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.46, 0.96),
        doorLeatherMat,
      );
      innerCard.position.set(-side * 0.045, 0.24, -0.52);
      const armrest = new THREE.Mesh(
        new THREE.BoxGeometry(0.055, 0.05, 0.52),
        doorTrimMat,
      );
      armrest.position.set(-side * 0.068, 0.2, -0.5);
      const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 0.18), doorTrimMat);
      pocket.position.set(side * 0.04, 0.38, -0.78);
      const latch = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.042, 0.16), handleMat);
      latch.position.set(side * 0.055, 0.38, -0.78);
      const mirror = buildRealisticSideMirror({
        side,
        housingMat: doorPaintMat,
        chromeMat: handleMat,
        style: 'aero',
      });
      mirror.position.set(side * 0.02, 0.5, -0.14);
      doorPivot.add(panel, innerCard, armrest, pocket, latch, mirror);
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
    const rearLatch = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.04, 0.05), handleMat);
    rearLatch.position.set(0, 0.02, -0.82);
    rearTrunkHinge.add(rearLid, rearLatch);
    chassisGroup.add(rearTrunkHinge);
    handles.trunkLid = rearTrunkHinge;

    // Rear bumper + crystal ruby taillights on land modular vehicles
    if (vehicle.preset === 'expedition_rover' || vehicle.preset === 'dune_buggy') {
      const rearBumper = new THREE.Mesh(
        createContouredPanelGeo(1.65, 0.16, 0.2, 0.015, 0.018),
        handleMat,
      );
      rearBumper.position.set(0, 0.42, -1.78);
      chassisGroup.add(rearBumper);
      [-0.64, 0.64].forEach((tx) => {
        const tail = buildRealisticTaillightPod({
          style: 'round',
          radius: 0.068,
          chromeMat: handleMat,
        });
        tail.position.set(tx, 0.68, -1.72);
        chassisGroup.add(tail);
      });
    }

    if (vehicle.preset === 'dune_buggy') {
      const cageMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.32,
        metalness: 0.82,
      });
      [-0.52, 0.52].forEach((rx) => {
        const hoop = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 1.8, 10), cageMat);
        hoop.position.set(rx, 1.48, -0.1);
        hoop.rotation.x = 0.68;
        chassisGroup.add(hoop);
      });
      const roofBar = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 1.08, 10), cageMat);
      roofBar.rotation.z = Math.PI / 2;
      roofBar.position.set(0, 2.02, 0.35);
      chassisGroup.add(roofBar);
      [-0.28, 0.28].forEach((lx) => {
        const roofSpot = buildRealisticHeadlightPod({
          shape: 'round',
          radius: 0.072,
          chromeMat: handleMat,
          withHood: true,
        });
        roofSpot.position.set(lx, 2.08, 0.42);
        chassisGroup.add(roofSpot);
      });
    }
  }

  if (vehicle.rollCage || vehicle.hoodBlower) {
    addRestorationRaceHardware(vehicle, handles);
  }
  if (vehicle.engravingDesign) {
    addEngravingDetails(vehicle, handles);
  }

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
      const disposedGeos = new Set<THREE.BufferGeometry>();
      const disposedMats = new Set<THREE.Material>();
      const disposedTex = new Set<THREE.Texture>();
      handles.root.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          if (obj.geometry && !obj.geometry.userData?.sharedAsset && !disposedGeos.has(obj.geometry)) {
            disposedGeos.add(obj.geometry);
            obj.geometry.dispose();
          }
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const m of mats) {
            if (!m || m.userData?.sharedAsset || disposedMats.has(m)) continue;
            disposedMats.add(m);
            const phys = m as THREE.MeshPhysicalMaterial;
            for (const tex of [
              phys.map,
              phys.emissiveMap,
              phys.normalMap,
              phys.clearcoatNormalMap,
            ]) {
              if (tex && !tex.userData?.sharedAsset && !disposedTex.has(tex)) {
                disposedTex.add(tex);
                tex.dispose();
              }
            }
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
  const paintColor = vehicle.paintColor || '#f97316';
  const rimColor = vehicle.rimColor || '#e2e8f0';
  const wheelScale = vehicle.wheelScale ?? 0.92;
  const baseWheelY = 0.36 * wheelScale;

  handles.chassisGroup.position.y = Math.max(0.02, (vehicle.suspensionOffset ?? -0.1) + 0.14);

  const paintMat = createAutomotivePaintMaterial(paintColor);
  const carbonMat = createCarbonFiberMaterial();
  const chromeMat = createChromeMaterial(rimColor);
  const glassMat = createAutomotiveGlassMaterial(0.38);
  const leatherMat = createAutomotiveLeatherMaterial(0x18181b);
  const dashPadMat = createAutomotiveLeatherMaterial(0x0f1116);

  // Sculpted low-slung wedge supercar hull via ExtrudeGeometry
  const hullGeo = ensureGeometryHasUv(buildSilhouetteGeometry('mclaren'));
  const hullMesh = new THREE.Mesh(hullGeo, paintMat);
  hullMesh.position.y = -0.04;
  handles.chassisGroup.add(hullMesh);

  // Tinted sculpted canopy glass + windshield wipers + dark engine louver deck
  const canopy = new THREE.Mesh(
    createContouredPanelGeo(1.52, 0.24, 1.32, 0.05, 0.03),
    glassMat,
  );
  canopy.position.set(0, 0.92, -0.26);
  const wipers = buildWindshieldWipers(1.38);
  wipers.position.set(0, 0.78, 0.74);
  wipers.rotation.x = -0.45;
  const engineLouvers = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.06, 0.85), carbonMat);
  engineLouvers.position.set(0, 0.9, -1.28);

  // Carbon aero front splitter, side skirts & rear diffuser
  const frontSplitter = new THREE.Mesh(
    createContouredPanelGeo(1.92, 0.07, 0.36, 0.015, 0.02),
    carbonMat,
  );
  frontSplitter.position.set(0, 0.28, 2.22);
  const frontPlateFrame = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.03), carbonMat);
  frontPlateFrame.position.set(0, 0.34, 2.34);
  const rearDiffuser = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.14, 0.28), carbonMat);
  rearDiffuser.position.set(0, 0.32, -2.14);
  [-0.92, 0.92].forEach((sx) => {
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.09, 2.3), carbonMat);
    skirt.position.set(sx, 0.28, 0.02);
    handles.chassisGroup.add(skirt);
  });

  // Twin-pylon contoured GT rear wing
  const wingBlade = new THREE.Mesh(
    createContouredPanelGeo(1.94, 0.055, 0.34, 0.02, 0.02),
    paintMat,
  );
  wingBlade.position.set(0, 1.06, -1.98);
  wingBlade.rotation.x = 0.12;
  [-0.52, 0.52].forEach((px) => {
    const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.26, 0.24), carbonMat);
    pylon.position.set(px, 0.92, -1.94);
    handles.chassisGroup.add(pylon);
  });

  // Multi-layer Crystal LED Headlight Pods + Smoked Ruby LED Rear Blades + Twin Chrome Exhausts
  [-0.64, 0.64].forEach((hx) => {
    const hl = buildRealisticHeadlightPod({
      shape: 'quad_bar',
      width: 0.32,
      height: 0.082,
      chromeMat,
      tintColor: 0xe0f2fe,
    });
    hl.position.set(hx, 0.48, 2.24);
    const tailBlade = buildRealisticTaillightPod({
      style: 'blade',
      width: 0.68,
      height: 0.062,
      chromeMat,
    });
    tailBlade.position.set(hx * 0.72, 0.7, -2.18);
    handles.chassisGroup.add(hl, tailBlade);
  });
  [-0.22, 0.22].forEach((ex) => {
    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.22, 14), chromeMat);
    exhaust.rotation.x = Math.PI / 2;
    exhaust.position.set(ex, 0.44, -2.2);
    handles.chassisGroup.add(exhaust);
  });

  // Interior racing seats, padded carbon cockpit brow, 3-spoke steering wheel, rearview mirror & pedals
  [-0.4, 0.4].forEach((sx) => {
    const seat = new THREE.Mesh(
      createContouredPanelGeo(0.46, 0.52, 0.44, 0.02, 0.025),
      leatherMat,
    );
    seat.position.set(sx, 0.52, -0.2);
    seat.rotation.x = -0.18;
    const headrest = new THREE.Mesh(
      createContouredPanelGeo(0.24, 0.15, 0.1, 0.015, 0.018),
      leatherMat,
    );
    headrest.position.set(sx, 0.82, -0.34);
    handles.chassisGroup.add(seat, headrest);
  });
  const superDash = new THREE.Mesh(
    createContouredPanelGeo(1.48, 0.16, 0.32, 0.02, 0.02),
    dashPadMat,
  );
  superDash.position.set(0, 0.68, 0.54);
  const superConsole = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.92), carbonMat);
  superConsole.position.set(0, 0.44, 0.04);
  const superCabinKit = buildCabinDetailKit({
    mirrorY: 0.96,
    mirrorZ: 0.28,
    visorWidth: 0.48,
    dashY: 0.7,
    pedalZ: 0.62,
    driverX: -0.4,
    trimMat: dashPadMat,
    chromeMat,
  });
  const helmWheel = buildDetailedSteeringWheel({
    style: 'supercar',
    radius: 0.155,
    chromeMat,
    leatherMat,
    accentColor: 0xf97316,
  });
  helmWheel.position.set(-0.4, 0.7, 0.28);
  helmWheel.rotation.x = 0.42;
  handles.helmWheel = helmWheel;

  const superGaugeTex = getGaugeClusterMap();
  if (superGaugeTex) {
    const gaugeScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.38, 0.14),
      new THREE.MeshBasicMaterial({ map: superGaugeTex }),
    );
    gaugeScreen.position.set(-0.4, 0.72, 0.48);
    gaugeScreen.rotation.y = Math.PI;
    handles.chassisGroup.add(gaugeScreen);
  }

  handles.chassisGroup.add(
    canopy,
    wipers,
    engineLouvers,
    frontSplitter,
    frontPlateFrame,
    rearDiffuser,
    wingBlade,
    superDash,
    superConsole,
    superCabinKit,
    helmWheel,
  );

  // Hinged side doors with carbon aero intake vents, quilted door cards & side mirrors
  ([-1, 1] as const).forEach((side) => {
    const doorPivot = new THREE.Group();
    doorPivot.position.set(side * 0.9, 0.42, 0.55);
    const doorSkin = new THREE.Mesh(
      createContouredPanelGeo(0.06, 0.42, 1.15, 0.015, 0.015),
      paintMat,
    );
    doorSkin.position.set(0, 0.18, -0.56);
    const innerCard = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.34, 1.02), leatherMat);
    innerCard.position.set(-side * 0.034, 0.18, -0.56);
    const handleLatch = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.032, 0.15), chromeMat);
    handleLatch.position.set(side * 0.034, 0.28, -0.74);
    const intakeVent = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.42), carbonMat);
    intakeVent.position.set(side * 0.015, 0.2, -0.92);
    const mirror = buildRealisticSideMirror({
      side,
      housingMat: carbonMat,
      chromeMat,
      style: 'aero',
    });
    mirror.position.set(side * 0.02, 0.42, -0.14);
    doorPivot.add(doorSkin, innerCard, handleLatch, intakeVent, mirror);
    handles.chassisGroup.add(doorPivot);
    if (side < 0) handles.doorLeft = doorPivot;
    else handles.doorRight = doorPivot;
  });

  // Hinged rear engine decklid / trunk
  const deckHinge = new THREE.Group();
  deckHinge.position.set(0, 0.86, -0.92);
  const deckPanel = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.06, 0.92), carbonMat);
  deckPanel.position.set(0, 0, -0.46);
  deckHinge.add(deckPanel);
  handles.chassisGroup.add(deckHinge);
  handles.trunkLid = deckHinge;

  // Exotic Undercarriage Neon Glow
  const glowColor = new THREE.Color(vehicle.underglowColor || '#38bdf8');
  const glowMat = new THREE.MeshStandardMaterial({
    color: glowColor,
    emissive: glowColor,
    emissiveIntensity: 2.0,
    roughness: 0.2,
  });
  const glowMeshes: THREE.Mesh[] = [];
  [-0.84, 0.84].forEach((gx) => {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 3.3), glowMat);
    bar.position.set(gx, 0.2, 0.04);
    handles.chassisGroup.add(bar);
    glowMeshes.push(bar);
  });
  const underLight = new THREE.PointLight(glowColor.getHex(), 1.8, 8.5, 1.4);
  underLight.position.set(0, 0.22, 0.04);
  handles.chassisGroup.add(underLight);
  handles.underglowLight = underLight;
  handles.underglowMeshes = glowMeshes;

  // 4 Forged Multi-Spoke Supercar Wheels with Treaded Rubber, Sidewalls, Lug Bolts & Cross-Drilled Brake Rotors
  const assets = getSharedShowroomAssets();
  const tireMat = assets.tireMat;
  const sidewallMat = assets.tireSidewallMat;
  const trackHalf = 0.94;
  const corners: Array<{
    corner: 'fl' | 'fr' | 'rl' | 'rr';
    x: number;
    z: number;
    side: -1 | 1;
    isFront: boolean;
  }> = [
    { corner: 'fl', x: -trackHalf, z: 1.38, side: -1, isFront: true },
    { corner: 'fr', x: trackHalf, z: 1.38, side: 1, isFront: true },
    { corner: 'rl', x: -trackHalf, z: -1.32, side: -1, isFront: false },
    { corner: 'rr', x: trackHalf, z: -1.32, side: 1, isFront: false },
  ];
  const tireOuterGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 28, 1, true);
  tireOuterGeo.rotateZ(Math.PI / 2);
  const rimBarrelGeo = new THREE.CylinderGeometry(0.285, 0.285, 0.3, 24, 1, true);
  rimBarrelGeo.rotateZ(Math.PI / 2);
  const spokeGeo = new THREE.BoxGeometry(0.028, 0.265, 0.026);
  const lugGeo = new THREE.CylinderGeometry(0.009, 0.009, 0.024, 6);
  lugGeo.rotateZ(Math.PI / 2);

  for (const wc of corners) {
    const cornerRoot = new THREE.Group();
    cornerRoot.position.set(wc.x, baseWheelY, wc.z);
    const steerPivot = new THREE.Group();
    steerPivot.scale.setScalar(wheelScale);
    const spinGroup = new THREE.Group();
    steerPivot.add(spinGroup);

    attachBrakeAssembly(steerPivot, wc.side, 0.225, 0.025, 'orange');

    const tire = new THREE.Mesh(tireOuterGeo, tireMat);
    [-0.145, 0.145].forEach((sx) => {
      const sidewall = new THREE.Mesh(new THREE.TorusGeometry(0.315, 0.045, 8, 24), sidewallMat);
      sidewall.rotation.y = Math.PI / 2;
      sidewall.position.x = sx;
      spinGroup.add(sidewall);
    });
    const barrel = new THREE.Mesh(rimBarrelGeo, chromeMat);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(0.278, 0.018, 8, 24), chromeMat);
    lip.rotation.y = Math.PI / 2;
    lip.position.x = wc.side * 0.145;
    const centerCap = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.068, 0.06, 14), chromeMat);
    centerCap.rotation.z = Math.PI / 2;
    centerCap.position.x = wc.side * 0.115;
    spinGroup.add(tire, barrel, lip, centerCap);

    for (let s = 0; s < 7; s++) {
      const a = (s / 7) * Math.PI * 2;
      const spoke = new THREE.Mesh(spokeGeo, chromeMat);
      spoke.position.set(wc.side * 0.11, Math.cos(a) * 0.135, Math.sin(a) * 0.135);
      spoke.rotation.x = a;
      spinGroup.add(spoke);
    }
    for (let l = 0; l < 5; l++) {
      const la = (l / 5) * Math.PI * 2;
      const lug = new THREE.Mesh(lugGeo, chromeMat);
      lug.position.set(wc.side * 0.138, Math.cos(la) * 0.048, Math.sin(la) * 0.048);
      spinGroup.add(lug);
    }

    cornerRoot.add(steerPivot);
    handles.root.add(cornerRoot);
    handles.wheels.push(spinGroup);
    if (wc.isFront) handles.steerWheels.push(steerPivot);
    handles.wheelCorners.push({
      obj: cornerRoot,
      corner: wc.corner,
      baseY: baseWheelY,
    });
  }
}
