import * as THREE from 'three';
import {
  KineticNodeKind,
  ModularVehicleData,
  VehicleModulePlacement,
} from '../types';
import { GarageVehicleSpec } from '../systems/undergroundElevator';
import { createVehicleFromPreset } from '../systems/modularVehicle';
import {
  buildRealLifeCarRig,
  buildSilhouetteGeometry,
  GarageCarVisualConfig,
  normalizeCarArchetype,
  RealLifeCarRig,
  VehicleArchetype,
} from './realLifeCarRig';

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
): { steerPivot: THREE.Group; spinGroup: THREE.Group; spinnerHub?: THREE.Group } {
  const steerPivot = new THREE.Group();
  steerPivot.scale.setScalar(wheelScale);

  const spinGroup = new THREE.Group();
  steerPivot.add(spinGroup);

  const tireMat = new THREE.MeshStandardMaterial({ color: 0x171717, roughness: 0.9 });
  const rimMat = new THREE.MeshStandardMaterial({
    color: rimColor,
    roughness: 0.12,
    metalness: 0.95,
  });

  if (style === 'forgiato_40_spinner') {
    // Massive 40-inch Forgiato Deep-Lip Barrel + Ultra-Thin Stretched Tire + 44 Auto-Spinner + Blinking Rim LEDs
    const tireOuter = new THREE.Mesh(
      new THREE.CylinderGeometry(0.43, 0.43, 0.34, 28),
      tireMat,
    );
    tireOuter.rotation.z = Math.PI / 2;

    const rimBarrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.392, 0.392, 0.355, 28),
      rimMat,
    );
    rimBarrel.rotation.z = Math.PI / 2;

    const innerDish = new THREE.Mesh(
      new THREE.CylinderGeometry(0.355, 0.355, 0.24, 24),
      new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.3, metalness: 0.78 }),
    );
    innerDish.rotation.z = Math.PI / 2;

    // Deep milled Forgiato outer step-lip
    const stepLip = new THREE.Mesh(
      new THREE.TorusGeometry(0.382, 0.022, 10, 28),
      chromeMat,
    );
    stepLip.rotation.y = Math.PI / 2;
    stepLip.position.x = sideSign * 0.175;

    spinGroup.add(tireOuter, rimBarrel, innerDish, stepLip);

    // 16 Forgiato perimeter lip hardware bolts
    for (let b = 0; b < 16; b++) {
      const ba = (b / 16) * Math.PI * 2;
      const bolt = new THREE.Mesh(
        new THREE.CylinderGeometry(0.008, 0.008, 0.02, 6),
        chromeMat,
      );
      bolt.rotation.z = Math.PI / 2;
      bolt.position.set(
        sideSign * 0.184,
        Math.cos(ba) * 0.368,
        Math.sin(ba) * 0.368,
      );
      spinGroup.add(bolt);
    }

    // 8 Forged Forgiato Y-spokes inside the main wheel barrel
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const spoke = new THREE.Mesh(
        new THREE.BoxGeometry(0.045, 0.345, 0.038),
        rimMat,
      );
      spoke.position.set(
        sideSign * 0.115,
        Math.cos(a) * 0.175,
        Math.sin(a) * 0.175,
      );
      spoke.rotation.x = a;
      spinGroup.add(spoke);
    }

    // LED Rim Glow Rings (Outer Lip Halo + Deep Barrel Glow)
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

    // Dual-tier 4x4 ("44") sculpted floating spinner blades + LED light strips
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      // Primary "4" blade
      const bladeA = new THREE.Mesh(
        new THREE.BoxGeometry(0.032, 0.27, 0.048),
        chromeMat,
      );
      bladeA.position.set(sideSign * 0.012, Math.cos(a) * 0.145, Math.sin(a) * 0.145);
      bladeA.rotation.x = a + 0.18;
      spinnerHub.add(bladeA);

      // Paired offset "4" blade (forms 44 double-4 floating spinner geometry)
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

    // Forgiato floating billet center cap + glowing ring
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
    // Massive 30-inch chrome rim wrapped in ultra-thin low-profile tire
    const tireOuter = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 0.3, 24),
      tireMat,
    );
    tireOuter.rotation.z = Math.PI / 2;
    const rimBarrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.365, 0.365, 0.315, 24),
      rimMat,
    );
    rimBarrel.rotation.z = Math.PI / 2;
    const innerDish = new THREE.Mesh(
      new THREE.CylinderGeometry(0.33, 0.33, 0.22, 20),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.35, metalness: 0.7 }),
    );
    innerDish.rotation.z = Math.PI / 2;

    spinGroup.add(tireOuter, rimBarrel, innerDish);

    // 7 deep chrome turbine spokes + billet center cap
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.34, 0.055), rimMat);
      spoke.position.set(sideSign * 0.12, Math.cos(a) * 0.17, Math.sin(a) * 0.17);
      spoke.rotation.x = a;
      spinGroup.add(spoke);
    }
    const centerCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 0.35, 14),
      chromeMat,
    );
    centerCap.rotation.z = Math.PI / 2;
    spinGroup.add(centerCap);
    return { steerPivot, spinGroup };
  }

  // Classic tire + whitewall ring for Lowrider & SLAB
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.41, 0.41, 0.27, 22), tireMat);
  tire.rotation.z = Math.PI / 2;
  const whitewall = new THREE.Mesh(
    new THREE.TorusGeometry(0.305, 0.036, 8, 22),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.55 }),
  );
  whitewall.rotation.y = Math.PI / 2;
  whitewall.position.x = sideSign * 0.132;

  const rimDish = new THREE.Mesh(new THREE.CylinderGeometry(0.255, 0.255, 0.285, 20), rimMat);
  rimDish.rotation.z = Math.PI / 2;
  const rimLip = new THREE.Mesh(new THREE.TorusGeometry(0.245, 0.025, 8, 20), chromeMat);
  rimLip.rotation.y = Math.PI / 2;
  rimLip.position.x = sideSign * 0.145;
  spinGroup.add(tire, whitewall, rimDish, rimLip);

  // Wire spokes
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.47, 5), chromeMat);
    wire.position.set(sideSign * 0.14, 0, 0);
    wire.rotation.x = a;
    spinGroup.add(wire);
  }

  if (style === 'swanger') {
    // Extended-spoke "Swanger" / "Elbow" wire cone poking outward along the hub axis!
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

    // 2-bar / 3-bar knock-off ear tip
    for (let k = 0; k < 2; k++) {
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.16, 0.025), chromeMat);
      ear.position.x = sideSign * (0.14 + elbowReach * 0.94);
      ear.rotation.x = (k * Math.PI) / 2;
      spinGroup.add(ear);
    }
  } else if (style === 'spinner_13') {
    // 13-inch Chrome Trim Skate Spinner Rims (free-spinning 5-blade chrome spinner hub)
    const spinnerHub = new THREE.Group();
    spinnerHub.position.set(sideSign * 0.16, 0, 0);
    const hubRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.18, 0.022, 8, 20),
      chromeMat,
    );
    hubRing.rotation.y = Math.PI / 2;
    spinnerHub.add(hubRing);

    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.032, 0.185, 0.042),
        chromeMat,
      );
      blade.position.set(0.01 * sideSign, Math.cos(a) * 0.095, Math.sin(a) * 0.095);
      blade.rotation.x = a + 0.28;
      spinnerHub.add(blade);
    }
    const centerCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.075, 0.07, 14),
      chromeMat,
    );
    centerCap.rotation.z = Math.PI / 2;
    centerCap.position.x = sideSign * 0.02;
    spinnerHub.add(centerCap);
    spinGroup.add(spinnerHub);
    return { steerPivot, spinGroup, spinnerHub };
  } else {
    // Lowrider chrome center knock-off spinner
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.32, 12), chromeMat);
    cap.rotation.z = Math.PI / 2;
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
          ? 0.8
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

  const candyPaintMat = new THREE.MeshPhysicalMaterial({
    color: vehicle.paintColor || (isDeville ? '#f8fafc' : '#7e22ce'),
    metalness: isDeville ? 0.32 : 0.72,
    roughness: isDeville ? 0.12 : 0.16,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: rimColor,
    metalness: 0.95,
    roughness: 0.09,
  });
  const darkTrimMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.75,
    metalness: 0.2,
  });
  const leatherMat = new THREE.MeshStandardMaterial({
    color: isDeville ? 0xd6bfa2 : 0x262626,
    roughness: 0.62,
    metalness: 0.08,
  });
  const carpetMat = new THREE.MeshStandardMaterial({
    color: isDeville ? 0x292524 : 0x18181b,
    roughness: 0.95,
  });
  const dashMat = new THREE.MeshStandardMaterial({
    color: isDeville ? 0x1c1917 : 0x1f2937,
    roughness: 0.55,
    metalness: 0.2,
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0f172a,
    roughness: 0.08,
    metalness: 0.22,
    clearcoat: 1.0,
    transparent: true,
    opacity: 0.46,
  });
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xfef9c3,
    emissive: 0xfef08a,
    emissiveIntensity: 1.25,
  });
  const taillightMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 1.05,
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

  // 2. Sculpted Front Engine Bay + Rear Quarter Body (leaving the middle cabin hollow for real working doors & interior!)
  const frontBodyLen = frontZ - 0.82;
  const frontBody = new THREE.Mesh(
    new THREE.BoxGeometry(1.94, lowerBodyH, frontBodyLen),
    candyPaintMat,
  );
  frontBody.position.set(0, lowerBodyH * 0.5 + 0.12, 0.82 + frontBodyLen * 0.5);
  handles.chassisGroup.add(frontBody);

  // Rocker sills beneath left/right doors
  [-0.91, 0.91].forEach((sx) => {
    const sill = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 1.72), candyPaintMat);
    sill.position.set(sx, 0.21, -0.04);
    handles.chassisGroup.add(sill);
  });

  // Rear Quarter Panels + Rear Trunk Tub (hollowed so popping the trunk shows air tanks & subs!)
  const rearStartZ = -0.88;
  const rearLen = Math.max(1.2, rearStartZ - rearZ);
  const rearCenterZ = rearZ + rearLen * 0.5;
  [-0.84, 0.84].forEach((rx) => {
    const quarter = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, lowerBodyH, rearLen),
      candyPaintMat,
    );
    quarter.position.set(rx, lowerBodyH * 0.5 + 0.12, rearCenterZ);
    handles.chassisGroup.add(quarter);
  });
  const rearBulkhead = new THREE.Mesh(
    new THREE.BoxGeometry(1.68, lowerBodyH * 0.92, 0.12),
    darkTrimMat,
  );
  rearBulkhead.position.set(0, lowerBodyH * 0.5 + 0.12, rearStartZ + 0.04);
  const rearValance = new THREE.Mesh(
    new THREE.BoxGeometry(1.94, lowerBodyH * 0.85, 0.16),
    candyPaintMat,
  );
  rearValance.position.set(0, lowerBodyH * 0.45 + 0.12, rearZ + 0.08);
  handles.chassisGroup.add(rearBulkhead, rearValance);

  // Trunk Interior Equipment (visible when you pop the trunk!)
  const tankMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.92,
    roughness: 0.14,
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
  // Twin Chrome Airbag Compressor Tanks + Pressure Valve Block inside the Trunk!
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

  // Front hood power bulge
  const hood = new THREE.Mesh(
    new THREE.BoxGeometry(1.82, 0.1, Math.max(1.35, frontBodyLen - 0.08)),
    candyPaintMat,
  );
  hood.position.set(0, lowerBodyH + 0.15, 0.82 + frontBodyLen * 0.5);
  handles.chassisGroup.add(hood);

  // Animated Hinged Trunk Lid (pivoted at rear deck front edge so it swings UP smoothly!)
  const trunkHinge = new THREE.Group();
  trunkHinge.position.set(0, lowerBodyH + 0.16, rearStartZ);
  const trunkPanel = new THREE.Mesh(
    new THREE.BoxGeometry(1.76, 0.08, rearLen - 0.06),
    candyPaintMat,
  );
  trunkPanel.position.set(0, 0, -(rearLen - 0.06) * 0.5);
  const trunkChromeTrim = new THREE.Mesh(
    new THREE.BoxGeometry(1.68, 0.04, 0.05),
    chromeMat,
  );
  trunkChromeTrim.position.set(0, 0.02, -(rearLen - 0.1));
  trunkHinge.add(trunkPanel, trunkChromeTrim);
  handles.chassisGroup.add(trunkHinge);
  handles.trunkLid = trunkHinge;

  // 3. REAL WORKING INTERIOR (Dashboard, Gauges, Console, Front & Rear Seats, Droptop Switch!)
  const dash = new THREE.Mesh(new THREE.BoxGeometry(1.64, 0.32, 0.34), dashMat);
  dash.position.set(0, lowerBodyH + 0.04, 0.64);
  const gaugeCluster = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.12, 0.04),
    new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.75,
    }),
  );
  gaugeCluster.position.set(-0.38, lowerBodyH + 0.1, 0.46);
  const centerConsole = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.24, 1.35), dashMat);
  centerConsole.position.set(0, 0.32, 0.05);
  const shifter = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.22, 8), chromeMat);
  shifter.position.set(0, 0.5, 0.24);
  const shifterKnob = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 10), chromeMat);
  shifterKnob.position.set(0, 0.62, 0.24);
  // Pressable Illuminated 3D Interior Droptop Switch on Center Console (Cadillac Coupe DeVille)
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
  // Slightly larger invisible touch/click proxy for effortless 3D pressing
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
    gaugeCluster,
    centerConsole,
    shifter,
    shifterKnob,
    droptopSwitchGroup,
  );

  // Front Bucket Seats (Driver + Passenger)
  [-0.44, 0.44].forEach((sx) => {
    const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.16, 0.52), leatherMat);
    cushion.position.set(sx, 0.3, 0.08);
    const backrest = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.56, 0.14), leatherMat);
    backrest.position.set(sx, 0.6, -0.14);
    backrest.rotation.x = -0.14;
    const headrest = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.1), leatherMat);
    headrest.position.set(sx, 0.94, -0.19);
    handles.chassisGroup.add(cushion, backrest, headrest);
  });

  // Rear Luxury Bench Seat
  const rearCushion = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.16, 0.48), leatherMat);
  rearCushion.position.set(0, 0.32, -0.56);
  const rearBack = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.52, 0.14), leatherMat);
  rearBack.position.set(0, 0.62, -0.78);
  rearBack.rotation.x = -0.12;
  handles.chassisGroup.add(rearCushion, rearBack);

  // Interior steering wheel
  const helmWheel = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.025, 6, 14), chromeMat);
  helmWheel.position.set(-0.42, lowerBodyH + 0.18, 0.42);
  helmWheel.rotation.x = 0.45;
  handles.chassisGroup.add(helmWheel);
  handles.helmWheel = helmWheel;

  // 4. REAL WORKING HINGED LEFT & RIGHT DOORS (Pivot outward at A-pillar to reveal interior!)
  const doorLen = 1.66;
  const doorH = lowerBodyH - 0.08;
  ([-1, 1] as const).forEach((side) => {
    const doorPivot = new THREE.Group();
    doorPivot.position.set(side * 0.93, 0.3, 0.8);
    const outerSkin = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, doorH, doorLen),
      candyPaintMat,
    );
    outerSkin.position.set(0, doorH * 0.5, -doorLen * 0.5);
    const innerCard = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, doorH * 0.86, doorLen * 0.92),
      leatherMat,
    );
    innerCard.position.set(-side * 0.045, doorH * 0.5, -doorLen * 0.5);
    const chromeHandle = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.045, 0.18),
      chromeMat,
    );
    chromeHandle.position.set(side * 0.05, doorH * 0.78, -doorLen * 0.72);
    const sideTrim = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.05, doorLen * 0.96),
      chromeMat,
    );
    sideTrim.position.set(side * 0.05, doorH * 0.5, -doorLen * 0.5);
    const doorGlass = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.36, doorLen * 0.84),
      glassMat,
    );
    doorGlass.position.set(-side * 0.01, doorH + 0.16, -doorLen * 0.52);

    doorPivot.add(outerSkin, innerCard, chromeHandle, sideTrim, doorGlass);
    handles.chassisGroup.add(doorPivot);
    if (side < 0) handles.doorLeft = doorPivot;
    else handles.doorRight = doorPivot;
  });

  // 5. Windshield + Roof / Retractable Black Convertible Top
  const cabinLen = preset === 'lowrider' ? 1.85 : isDeville ? 1.98 : 2.05;
  const cabinH = preset === 'lowrider' ? 0.46 : 0.54;
  const cabinY = lowerBodyH + 0.12 + cabinH * 0.5;

  const windshield = new THREE.Mesh(
    new THREE.BoxGeometry(1.62, cabinH * 0.96, 0.05),
    glassMat,
  );
  windshield.position.set(0, cabinY, 0.76);
  windshield.rotation.x = -0.34;
  handles.chassisGroup.add(windshield);

  // Front A-pillars
  [-0.81, 0.81].forEach((px) => {
    const aPillar = new THREE.Mesh(
      new THREE.BoxGeometry(0.075, cabinH * 1.05, 0.09),
      chromeMat,
    );
    aPillar.position.set(px, cabinY, 0.76);
    aPillar.rotation.x = -0.34;
    handles.chassisGroup.add(aPillar);
  });

  if (isDeville) {
    // Real-Life 2-Stage Articulated Folding Black Rag-Top Convertible Roof
    const blackTopMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.84,
      metalness: 0.08,
    });
    const ribMat = new THREE.MeshStandardMaterial({
      color: 0x262626,
      roughness: 0.55,
      metalness: 0.45,
    });

    // Stage 2 Rear Bow Pivot (mounts behind rear seat so entire frame folds back into rear deck)
    const topPivot = new THREE.Group();
    topPivot.position.set(0, lowerBodyH + 0.16, -0.92);

    const rearSailL = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, cabinH * 0.98, 0.34),
      blackTopMat,
    );
    rearSailL.position.set(-0.79, cabinH * 0.48, 0.08);
    rearSailL.rotation.x = 0.24;
    const rearSailR = rearSailL.clone();
    rearSailR.position.x = 0.79;
    const rearGlass = new THREE.Mesh(
      new THREE.BoxGeometry(1.36, cabinH * 0.76, 0.05),
      glassMat,
    );
    rearGlass.position.set(0, cabinH * 0.48, 0.02);
    rearGlass.rotation.x = 0.24;

    // Chrome scissor-linkage hydraulic arms on left & right interior sides
    [-0.75, 0.75].forEach((lx) => {
      const linkArm = new THREE.Mesh(
        new THREE.BoxGeometry(0.035, cabinH * 0.92, 0.05),
        chromeMat,
      );
      linkArm.position.set(lx, cabinH * 0.48, 0.14);
      linkArm.rotation.x = 0.22;
      topPivot.add(linkArm);
    });

    // Stage 1 Front Canopy Hinge (unlatches from windshield & folds back onto rear bow!)
    const frontSection = new THREE.Group();
    frontSection.position.set(0, cabinH * 0.96, 0.16);
    const frontCanopyLen = cabinLen * 0.82;
    const roofCap = new THREE.Mesh(
      new THREE.BoxGeometry(1.72, 0.075, frontCanopyLen),
      blackTopMat,
    );
    roofCap.position.set(0, 0, frontCanopyLen * 0.5);
    // Structural convertible top cross-bows (visible from interior cabin view!)
    [0.25, 0.58, 0.88].forEach((frac) => {
      const bow = new THREE.Mesh(
        new THREE.BoxGeometry(1.66, 0.035, 0.05),
        ribMat,
      );
      bow.position.set(0, -0.04, frontCanopyLen * frac);
      frontSection.add(bow);
    });
    const headerChrome = new THREE.Mesh(
      new THREE.BoxGeometry(1.74, 0.055, 0.085),
      chromeMat,
    );
    headerChrome.position.set(0, 0.005, frontCanopyLen + 0.01);
    frontSection.add(roofCap, headerChrome);

    topPivot.add(rearSailL, rearSailR, rearGlass, frontSection);
    handles.chassisGroup.add(topPivot);
    handles.convertibleTop = topPivot;
    handles.convertibleFrontSection = frontSection;

    // Folded Black Convertible Top Boot (sits cleanly behind rear seat when top is down!)
    const foldedBoot = new THREE.Group();
    foldedBoot.position.set(0, lowerBodyH + 0.2, -0.94);
    const bootMain = new THREE.Mesh(
      new THREE.BoxGeometry(1.74, 0.16, 0.42),
      blackTopMat,
    );
    const bootChromeTrim = new THREE.Mesh(
      new THREE.BoxGeometry(1.76, 0.04, 0.06),
      chromeMat,
    );
    bootChromeTrim.position.set(0, 0.07, 0.2);
    foldedBoot.add(bootMain, bootChromeTrim);
    foldedBoot.visible = false;
    handles.chassisGroup.add(foldedBoot);
    handles.convertibleBoot = foldedBoot;
  } else {
    const roofMat =
      preset === 'slab'
        ? new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.72, metalness: 0.15 })
        : candyPaintMat;
    const roofCap = new THREE.Mesh(
      new THREE.BoxGeometry(1.68, 0.09, cabinLen * 0.84),
      roofMat,
    );
    roofCap.position.set(0, cabinY + cabinH * 0.46, -0.08);
    const rearGlass = new THREE.Mesh(
      new THREE.BoxGeometry(1.48, cabinH * 0.86, 0.05),
      glassMat,
    );
    rearGlass.position.set(0, cabinY, -0.92);
    rearGlass.rotation.x = 0.28;
    handles.chassisGroup.add(roofCap, rearGlass);
    [-0.78, 0.78].forEach((px) => {
      const cPillar = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, cabinH * 1.05, 0.16),
        candyPaintMat,
      );
      cPillar.position.set(px, cabinY, -0.92);
      cPillar.rotation.x = 0.28;
      handles.chassisGroup.add(cPillar);
    });
  }

  // 6. Chrome Bumpers, Grille, Side Spear Molding, Quad Headlights & Taillights
  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(2.04, 0.2, 0.22), chromeMat);
  frontBumper.position.set(0, 0.26, frontZ + 0.08);
  const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(2.04, 0.2, 0.22), chromeMat);
  rearBumper.position.set(0, 0.26, rearZ - 0.08);
  const grille = new THREE.Mesh(
    new THREE.BoxGeometry(isDeville ? 1.32 : 1.42, isDeville ? 0.34 : 0.26, 0.09),
    chromeMat,
  );
  grille.position.set(0, 0.46, frontZ + 0.02);
  handles.chassisGroup.add(frontBumper, rearBumper, grille);

  // Quad headlights + Taillights
  [-0.78, -0.6, 0.6, 0.78].forEach((hx) => {
    const hl = new THREE.Mesh(
      isDeville
        ? new THREE.BoxGeometry(0.14, 0.14, 0.06)
        : new THREE.CylinderGeometry(0.065, 0.065, 0.06, 10),
      headlightMat,
    );
    if (!isDeville) hl.rotation.x = Math.PI / 2;
    hl.position.set(hx, 0.48, frontZ + 0.02);
    handles.chassisGroup.add(hl);
  });

  if (isDeville) {
    // Classic vertical Cadillac finned taillights + hood crest ornament
    [-0.86, 0.86].forEach((tx) => {
      const tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.36, 0.1), taillightMat);
      tailFin.position.set(tx, 0.54, rearZ - 0.02);
      const finBezel = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.4, 0.06), chromeMat);
      finBezel.position.set(tx, 0.54, rearZ + 0.01);
      handles.chassisGroup.add(tailFin, finBezel);
    });
    const crest = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.06), chromeMat);
    crest.position.set(0, lowerBodyH + 0.24, frontZ - 0.08);
    handles.chassisGroup.add(crest);

    // Visible Pneumatic Airbags + Coil-Over Springs under all 4 corners!
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
  } else {
    [-0.76, -0.58, 0.58, 0.76].forEach((tx) => {
      const tl = new THREE.Mesh(
        preset === 'lowrider'
          ? new THREE.CylinderGeometry(0.055, 0.055, 0.06, 10)
          : new THREE.BoxGeometry(0.14, 0.1, 0.06),
        taillightMat,
      );
      if (preset === 'lowrider') tl.rotation.x = Math.PI / 2;
      tl.position.set(tx, 0.48, rearZ - 0.02);
      handles.chassisGroup.add(tl);
    });
  }

  // Dual chrome exhaust tips
  [-0.58, 0.58].forEach((ex) => {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.38, 8), chromeMat);
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(ex, 0.14, rearZ - 0.14);
    handles.chassisGroup.add(pipe);
  });

  // Preset-specific signature details
  if (preset === 'lowrider') {
    [-0.88, 0.88].forEach((fx) => {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 1.25), candyPaintMat);
      fin.position.set(fx, lowerBodyH + 0.16, -1.52);
      handles.chassisGroup.add(fin);
    });
    const hoodTrim = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 1.35), chromeMat);
    hoodTrim.position.set(0, lowerBodyH + 0.21, 1.48);
    handles.chassisGroup.add(hoodTrim);
  } else if (preset === 'donk') {
    const axleMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.18 });
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
    const contGroup = new THREE.Group();
    contGroup.position.set(0, 0.56, rearZ - 0.24);
    contGroup.rotation.x = 0.14;
    const mountArm = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.22, 0.34), chromeMat);
    mountArm.position.set(0, -0.18, 0.14);
    const spareRing = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.09, 10, 22), chromeMat);
    const spareFace = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.15, 20), candyPaintMat);
    spareFace.rotation.x = Math.PI / 2;
    const spareSpinner = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.22, 10), chromeMat);
    spareSpinner.rotation.x = Math.PI / 2;
    spareSpinner.position.z = -0.05;
    contGroup.add(mountArm, spareRing, spareFace, spareSpinner);
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

  // 7. Attach 4 Independent Corner Wheels to root
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
  for (const wc of wheelCoords) {
    const cornerRoot = new THREE.Group();
    cornerRoot.position.set(wc.x, baseWheelY, wc.z);
    const { steerPivot, spinGroup, spinnerHub } = buildCustomWheel(
      wheelStyle,
      wc.side,
      rimColor,
      wheelScale,
      chromeMat,
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

  const paintMat = new THREE.MeshPhysicalMaterial({
    color: paintColor,
    metalness: 0.72,
    roughness: 0.14,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: rimColor,
    metalness: 0.96,
    roughness: 0.08,
  });
  const goldBowtieMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    metalness: 0.85,
    roughness: 0.18,
  });
  const darkTrimMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.78,
    metalness: 0.2,
  });
  const leatherMat = new THREE.MeshStandardMaterial({
    color: 0x1c1917,
    roughness: 0.58,
    metalness: 0.1,
  });
  const stitchMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.45,
    metalness: 0.25,
  });
  const carpetMat = new THREE.MeshStandardMaterial({
    color: 0x09090b,
    roughness: 0.95,
  });
  const dashMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.5,
    metalness: 0.25,
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0f172a,
    roughness: 0.08,
    metalness: 0.22,
    clearcoat: 1.0,
    transparent: true,
    opacity: 0.36,
  });
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    emissive: 0xbae6fd,
    emissiveIntensity: 1.65,
  });
  const amberDrlMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.25,
  });
  const taillightMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 1.3,
  });

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
  const engineCore = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.58, 1.62), paintMat);
  engineCore.position.set(0, 0.44, 1.64);
  const frontFascia = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.56, 0.36), paintMat);
  frontFascia.position.set(0, 0.44, frontZ - 0.16);
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.98, 0.12, 1.68), paintMat);
  hood.position.set(0, 0.78, 1.66);
  const powerDome = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.06, 1.44), paintMat);
  powerDome.position.set(0, 0.86, 1.64);
  handles.chassisGroup.add(engineCore, frontFascia, hood, powerDome);

  // Flared front & rear SUV wheel arch fenders tucked over the 40" Forgiatos
  [1.44, -1.32].forEach((az) => {
    [-0.97, 0.97].forEach((fx) => {
      const archCrown = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 1.12), paintMat);
      archCrown.position.set(fx, 0.76, az);
      const archFrontLeg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.48, 0.22), paintMat);
      archFrontLeg.position.set(fx, 0.46, az + 0.58);
      const archRearLeg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.48, 0.22), paintMat);
      archRearLeg.position.set(fx, 0.46, az - 0.58);
      handles.chassisGroup.add(archCrown, archFrontLeg, archRearLeg);
    });
  });

  // 3. Rear SUV Cargo Tub + Rear Quarter Corners + Liftgate Opening
  const rearInnerTub = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.56, 1.62), darkTrimMat);
  rearInnerTub.position.set(0, 0.42, -1.52);
  [-0.94, 0.94].forEach((rx) => {
    const rearUpperQuarter = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.34, 1.56),
      paintMat,
    );
    rearUpperQuarter.position.set(rx, 0.72, -1.56);
    const rearCornerPillar = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.64, 0.44),
      paintMat,
    );
    rearCornerPillar.position.set(rx, 0.44, -2.14);
    handles.chassisGroup.add(rearUpperQuarter, rearCornerPillar);
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

  // 5. Tahoe Interior Cabin (Dash, Gauges, Console, Front Seats + Pressable Light & Lift Buttons!)
  const dash = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.36, 0.38), dashMat);
  dash.position.set(0, 0.68, 0.64);
  const gaugeCluster = new THREE.Mesh(
    new THREE.BoxGeometry(0.52, 0.14, 0.04),
    new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.9,
    }),
  );
  gaugeCluster.position.set(-0.44, 0.74, 0.44);
  const centerScreen = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.18, 0.04),
    new THREE.MeshStandardMaterial({
      color: 0x020617,
      emissive: 0x6366f1,
      emissiveIntensity: 0.85,
    }),
  );
  centerScreen.position.set(0, 0.72, 0.44);

  const centerConsole = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.28, 1.12), dashMat);
  centerConsole.position.set(0, 0.3, 0.14);
  const shifter = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.2, 8), chromeMat);
  shifter.position.set(0, 0.48, 0.26);
  const shifterKnob = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 10), chromeMat);
  shifterKnob.position.set(0, 0.58, 0.26);

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

  // Steering wheel
  const helmWheel = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.026, 6, 16), chromeMat);
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

  // Driver & Front Passenger Bucket Seats (positioned right in front of the subwoofer wall)
  [-0.44, 0.44].forEach((sx) => {
    const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.16, 0.52), leatherMat);
    cushion.position.set(sx, 0.26, 0.12);
    const backrest = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.58, 0.14), leatherMat);
    backrest.position.set(sx, 0.58, -0.1);
    backrest.rotation.x = -0.12;
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.48, 0.15), stitchMat);
    stripe.position.set(sx, 0.58, -0.1);
    stripe.rotation.x = -0.12;
    const headrest = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.1), leatherMat);
    headrest.position.set(sx, 0.94, -0.15);
    handles.chassisGroup.add(cushion, backrest, stripe, headrest);
  });

  // 6. Real Working Hinged Front Doors (with mirrors & door cards)
  const doorLen = 1.48;
  const doorH = 0.64;
  ([-1, 1] as const).forEach((side) => {
    const doorPivot = new THREE.Group();
    doorPivot.position.set(side * 0.99, 0.18, 0.78);
    const outerSkin = new THREE.Mesh(new THREE.BoxGeometry(0.08, doorH, doorLen), paintMat);
    outerSkin.position.set(0, doorH * 0.5, -doorLen * 0.5);
    const innerCard = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, doorH * 0.88, doorLen * 0.92),
      leatherMat,
    );
    innerCard.position.set(-side * 0.045, doorH * 0.5, -doorLen * 0.5);
    const chromeHandle = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.045, 0.18),
      chromeMat,
    );
    chromeHandle.position.set(side * 0.05, doorH * 0.76, -doorLen * 0.72);
    const sideTrim = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.055, doorLen * 0.95),
      chromeMat,
    );
    sideTrim.position.set(side * 0.05, doorH * 0.42, -doorLen * 0.5);
    const doorGlass = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.46, doorLen * 0.86),
      glassMat,
    );
    doorGlass.position.set(-side * 0.01, doorH + 0.22, -doorLen * 0.52);
    const mirrorArm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.12), paintMat);
    mirrorArm.position.set(side * 0.1, doorH + 0.04, -0.18);

    doorPivot.add(outerSkin, innerCard, chromeHandle, sideTrim, doorGlass, mirrorArm);
    handles.chassisGroup.add(doorPivot);
    if (side < 0) handles.doorLeft = doorPivot;
    else handles.doorRight = doorPivot;
  });

  // 7. Boxy Full-Size Chevy Tahoe SUV Cabin, Pillars, Rear Glass & Roof Rack
  const cabinH = 0.66;
  const roofY = 0.86 + cabinH; // ~1.52m in chassis local
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.74, cabinH, 0.05), glassMat);
  windshield.position.set(0, 0.86 + cabinH * 0.5, 0.76);
  windshield.rotation.x = -0.32;
  handles.chassisGroup.add(windshield);

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

  // Full-length SUV Roof + Chrome Roof Rack Rails
  const roofCap = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.1, 2.94), paintMat);
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
  const liftgateLowerPanel = new THREE.Mesh(new THREE.BoxGeometry(1.84, 0.62, 0.1), paintMat);
  liftgateLowerPanel.position.set(0, -0.86, 0);
  const liftgateBadge = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.04), goldBowtieMat);
  liftgateBadge.position.set(0, -0.68, -0.06);
  const liftgateChromeBar = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.05, 0.04), chromeMat);
  liftgateChromeBar.position.set(0, -0.78, -0.05);
  liftgateHinge.add(liftgateUpperGlass, liftgateLowerPanel, liftgateBadge, liftgateChromeBar);
  handles.chassisGroup.add(liftgateHinge);
  handles.trunkLid = liftgateHinge;

  // 8. Chevy Front Chrome Split-Bar Grille, Bowtie, Quad Headlights, Taillights & Bumpers
  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(2.08, 0.2, 0.24), chromeMat);
  frontBumper.position.set(0, 0.18, frontZ + 0.06);
  const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(2.08, 0.2, 0.24), chromeMat);
  rearBumper.position.set(0, 0.18, rearZ - 0.06);
  const grilleShell = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.34, 0.09), chromeMat);
  grilleShell.position.set(0, 0.52, frontZ + 0.02);
  const grilleMesh = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.26, 0.1), darkTrimMat);
  grilleMesh.position.set(0, 0.52, frontZ + 0.025);
  const grilleCrossBar = new THREE.Mesh(new THREE.BoxGeometry(1.34, 0.055, 0.115), chromeMat);
  grilleCrossBar.position.set(0, 0.52, frontZ + 0.03);
  const bowtie = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.085, 0.05), goldBowtieMat);
  bowtie.position.set(0, 0.52, frontZ + 0.07);
  handles.chassisGroup.add(
    frontBumper,
    rearBumper,
    grilleShell,
    grilleMesh,
    grilleCrossBar,
    bowtie,
  );

  // Stacked Chevy Quad Headlights + Amber Corners + Tall SUV Taillights
  [-0.84, 0.84].forEach((hx) => {
    const upperBeam = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.06), headlightMat);
    upperBeam.position.set(hx, 0.58, frontZ + 0.02);
    const lowerAmber = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.09, 0.06), amberDrlMat);
    lowerAmber.position.set(hx, 0.44, frontZ + 0.02);
    handles.chassisGroup.add(upperBeam, lowerAmber);
  });
  [-0.9, 0.9].forEach((tx) => {
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.46, 0.08), taillightMat);
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

  const paintMat = new THREE.MeshStandardMaterial({
    color: paintColor,
    roughness: 0.32,
    metalness: 0.56,
  });
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.36,
    metalness: 0.82,
  });
  const brassMat = new THREE.MeshStandardMaterial({
    color: rimColor,
    roughness: 0.22,
    metalness: 0.9,
  });
  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x78350f,
    roughness: 0.82,
  });

  if (m.kind === 'chassis_frame') {
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.16, 0.98), steelMat);
    const barL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 1.02), paintMat);
    barL.position.x = -0.42;
    const barR = barL.clone();
    barR.position.x = 0.42;
    part.add(plate, barL, barR);
  } else if (m.kind === 'cockpit_seat') {
    const tub = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.2, 0.96), steelMat);
    const seatBack = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.65, 0.16), woodMat);
    seatBack.position.set(0, 0.35, -0.32);
    const dash = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.34, 0.22), paintMat);
    dash.position.set(0, 0.28, 0.35);
    const wheelRing = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.032, 6, 14), brassMat);
    wheelRing.position.set(0, 0.48, 0.22);
    wheelRing.rotation.x = 0.5;
    const headlight = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.12, 0.12, 10),
      new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        emissive: 0xfde047,
        emissiveIntensity: 0.9,
      }),
    );
    headlight.rotation.x = Math.PI / 2;
    headlight.position.set(0, 0.3, 0.5);
    part.add(tub, seatBack, dash, wheelRing, headlight);
    handles.helmWheel = wheelRing;
  } else if (m.kind === 'armor_plate') {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.62, 1.02), paintMat);
    slab.position.y = 0.14;
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.2, 0.24), steelMat);
    bumper.position.set(0, 0.04, 0.46);
    const rivetL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.85), steelMat);
    rivetL.position.set(-0.48, 0.15, 0);
    const rivetR = rivetL.clone();
    rivetR.position.x = 0.48;
    part.add(slab, bumper, rivetL, rivetR);
  } else if (m.kind === 'offroad_wheel') {
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.12), steelMat);
    strut.position.set(m.gx < 0 ? 0.18 : -0.18, 0.06, 0);
    part.add(strut);

    const steerPivot = new THREE.Group();
    steerPivot.position.set(m.gx < 0 ? -0.16 : 0.16, -0.04, 0);
    steerPivot.scale.setScalar(wheelScale);
    const spinGroup = new THREE.Group();
    steerPivot.add(spinGroup);

    const tireMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.92 });
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.34, 14), tireMat);
    tire.rotation.z = Math.PI / 2;
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.36, 10), brassMat);
    rim.rotation.z = Math.PI / 2;
    const lug = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.1, 0.56), steelMat);
    spinGroup.add(tire, rim, lug);
    part.add(steerPivot);
    handles.wheels.push(spinGroup);
    if (m.gz > 0) {
      handles.steerWheels.push(steerPivot);
    }
    const corner: WheelCornerHandle['corner'] =
      m.gz > 0 ? (m.gx < 0 ? 'fl' : 'fr') : m.gx < 0 ? 'rl' : 'rr';
    handles.wheelCorners.push({ obj: steerPivot, corner, baseY: -0.04 });
  } else if (m.kind === 'steam_engine_pod') {
    const block = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.52, 0.88), steelMat);
    block.position.y = 0.18;
    const boilerDrum = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.82, 12), brassMat);
    boilerDrum.rotation.x = Math.PI / 2;
    boilerDrum.position.y = 0.42;
    const exhaustA = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.65, 8), steelMat);
    exhaustA.position.set(-0.26, 0.7, -0.22);
    const exhaustB = exhaustA.clone();
    exhaustB.position.x = 0.26;
    const piston = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.18), brassMat);
    piston.position.set(0, 0.62, 0.16);
    part.add(block, boilerDrum, exhaustA, exhaustB, piston);
    handles.pistons.push(piston);
  } else if (m.kind === 'boat_hull') {
    const pontoon = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.86, 5, 10), woodMat);
    pontoon.rotation.x = Math.PI / 2;
    pontoon.position.y = -0.05;
    const keel = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.14, 0.96), paintMat);
    keel.position.y = 0.16;
    part.add(pontoon, keel);
  } else if (m.kind === 'rotor_wing') {
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.58, 8), steelMat);
    mast.position.y = 0.24;
    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.08, 0.48), paintMat);
    wing.position.y = 0.14;
    const rotorHub = new THREE.Group();
    rotorHub.position.y = 0.56;
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.12, 8), brassMat);
    const bladeA = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.035, 0.2), steelMat);
    const bladeB = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.035, 2.35), steelMat);
    rotorHub.add(cap, bladeA, bladeB);
    part.add(mast, wing, rotorHub);
    handles.rotors.push(rotorHub);
  } else if (m.kind === 'steering_rudder') {
    const mount = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.3, 0.65), steelMat);
    const finPivot = new THREE.Group();
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.62, 0.56), paintMat);
    blade.position.y = 0.22;
    finPivot.add(blade);
    part.add(mount, finPivot);
    handles.rudders.push(finPivot);
  } else if (m.kind === 'storage_rack') {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.14, 0.92), steelMat);
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.52, 0.8), woodMat);
    crate.position.y = 0.3;
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.12, 0.84), brassMat);
    strap.position.y = 0.42;
    part.add(frame, crate, strap);
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

    // Real working hinged doors + trunk lid + interior trim on ALL other modular cars!
    const doorPaintMat = new THREE.MeshStandardMaterial({
      color: vehicle.paintColor || '#d97706',
      roughness: 0.34,
      metalness: 0.55,
    });
    const doorTrimMat = new THREE.MeshStandardMaterial({
      color: 0x262626,
      roughness: 0.72,
    });
    const handleMat = new THREE.MeshStandardMaterial({
      color: rimColor,
      roughness: 0.2,
      metalness: 0.9,
    });
    ([-1, 1] as const).forEach((side) => {
      const doorPivot = new THREE.Group();
      doorPivot.position.set(side * 0.64, 0.92, 0.58);
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.54, 1.05), doorPaintMat);
      panel.position.set(0, 0.24, -0.52);
      const innerCard = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.46, 0.96), doorTrimMat);
      innerCard.position.set(-side * 0.045, 0.24, -0.52);
      const latch = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.16), handleMat);
      latch.position.set(side * 0.05, 0.38, -0.78);
      doorPivot.add(panel, innerCard, latch);
      chassisGroup.add(doorPivot);
      if (side < 0) handles.doorLeft = doorPivot;
      else handles.doorRight = doorPivot;
    });

    const rearTrunkHinge = new THREE.Group();
    rearTrunkHinge.position.set(0, 1.38, -1.12);
    const rearLid = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.08, 0.85), doorPaintMat);
    rearLid.position.set(0, 0, -0.42);
    rearTrunkHinge.add(rearLid);
    chassisGroup.add(rearTrunkHinge);
    handles.trunkLid = rearTrunkHinge;

    if (vehicle.preset === 'sports_car') {
      const chromeMat = new THREE.MeshStandardMaterial({
        color: rimColor,
        roughness: 0.18,
        metalness: 0.92,
      });
      const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.18, 0.22), chromeMat);
      rearBumper.position.set(0, 0.38, -1.78);
      const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.18, 0.22), chromeMat);
      frontBumper.position.set(0, 0.36, 2.25);
      const spoilerWing = new THREE.Mesh(
        new THREE.BoxGeometry(1.72, 0.08, 0.36),
        new THREE.MeshStandardMaterial({ color: vehicle.paintColor, roughness: 0.28, metalness: 0.6 }),
      );
      spoilerWing.position.set(0, 1.52, -1.62);
      chassisGroup.add(rearBumper, frontBumper, spoilerWing);
    } else if (vehicle.preset === 'dune_buggy') {
      const cageMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.75 });
      [-0.52, 0.52].forEach((rx) => {
        const hoop = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.8, 7), cageMat);
        hoop.position.set(rx, 1.48, -0.1);
        hoop.rotation.x = 0.68;
        chassisGroup.add(hoop);
      });
    }
  }

  const noShadowSet = new Set<THREE.Object3D>([
    ...(handles.underglowMeshes ?? []),
    ...(handles.rimLightMeshes ?? []),
    ...(handles.subGlowMeshes ?? []),
    ...(handles.subwooferCones ?? []),
  ]);
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      if (noShadowSet.has(obj) || obj.userData.noShadowCast) {
        obj.userData.noShadowCast = true;
        obj.castShadow = false;
        obj.receiveShadow = false;
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
          obj.geometry?.dispose();
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const m of mats) {
            if (!m) continue;
            const std = m as THREE.MeshStandardMaterial;
            if (std.map) std.map.dispose();
            if (std.emissiveMap) std.emissiveMap.dispose();
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

  const paintMat = new THREE.MeshPhysicalMaterial({
    color: paintColor,
    metalness: 0.65,
    roughness: 0.15,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
  });
  const carbonMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    metalness: 0.55,
    roughness: 0.32,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: rimColor,
    metalness: 0.92,
    roughness: 0.14,
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0b1420,
    metalness: 0.14,
    roughness: 0.06,
    clearcoat: 1.0,
    transparent: true,
    opacity: 0.42,
  });
  const leatherMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.62,
    metalness: 0.1,
  });
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    emissive: 0x7dd3fc,
    emissiveIntensity: 1.7,
  });
  const taillightMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 1.5,
  });

  // Sculpted low-slung wedge supercar hull via ExtrudeGeometry
  const hullGeo = buildSilhouetteGeometry('mclaren');
  const hullMesh = new THREE.Mesh(hullGeo, paintMat);
  hullMesh.position.y = -0.04;
  handles.chassisGroup.add(hullMesh);

  // Tinted canopy glass + dark engine louver deck
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.54, 0.26, 1.32), glassMat);
  canopy.position.set(0, 0.92, -0.26);
  const engineLouvers = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.06, 0.85), carbonMat);
  engineLouvers.position.set(0, 0.9, -1.28);

  // Carbon aero front splitter, side skirts & rear diffuser
  const frontSplitter = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.07, 0.36), carbonMat);
  frontSplitter.position.set(0, 0.28, 2.22);
  const rearDiffuser = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.14, 0.28), carbonMat);
  rearDiffuser.position.set(0, 0.32, -2.14);
  [-0.92, 0.92].forEach((sx) => {
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.09, 2.3), carbonMat);
    skirt.position.set(sx, 0.28, 0.02);
    handles.chassisGroup.add(skirt);
  });

  // Twin-pylon GT rear wing
  const wingBlade = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.06, 0.34), paintMat);
  wingBlade.position.set(0, 1.06, -1.98);
  wingBlade.rotation.x = 0.12;
  [-0.52, 0.52].forEach((px) => {
    const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.26, 0.24), carbonMat);
    pylon.position.set(px, 0.92, -1.94);
    handles.chassisGroup.add(pylon);
  });

  // Headlights + Full-width rear LED tailbar + twin exhausts
  [-0.64, 0.64].forEach((hx) => {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.07, 0.08), headlightMat);
    hl.position.set(hx, 0.48, 2.24);
    handles.chassisGroup.add(hl);
  });
  const tailBar = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.06, 0.06), taillightMat);
  tailBar.position.set(0, 0.7, -2.18);
  [-0.22, 0.22].forEach((ex) => {
    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.2, 10), chromeMat);
    exhaust.rotation.x = Math.PI / 2;
    exhaust.position.set(ex, 0.44, -2.2);
    handles.chassisGroup.add(exhaust);
  });

  // Interior racing seats + steering wheel
  [-0.4, 0.4].forEach((sx) => {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.52, 0.46), leatherMat);
    seat.position.set(sx, 0.52, -0.2);
    seat.rotation.x = -0.18;
    handles.chassisGroup.add(seat);
  });
  const helmWheel = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.024, 6, 16), carbonMat);
  helmWheel.position.set(-0.4, 0.7, 0.28);
  helmWheel.rotation.x = 0.42;
  handles.helmWheel = helmWheel;

  handles.chassisGroup.add(
    canopy,
    engineLouvers,
    frontSplitter,
    rearDiffuser,
    wingBlade,
    tailBar,
    helmWheel,
  );

  // Hinged side doors
  ([-1, 1] as const).forEach((side) => {
    const doorPivot = new THREE.Group();
    doorPivot.position.set(side * 0.9, 0.42, 0.55);
    const doorSkin = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.42, 1.15), paintMat);
    doorSkin.position.set(0, 0.18, -0.56);
    const intakeVent = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.42), carbonMat);
    intakeVent.position.set(side * 0.015, 0.2, -0.92);
    doorPivot.add(doorSkin, intakeVent);
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

  // 4 Forged Supercar Wheels
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x131417, roughness: 0.86 });
  const trackHalf = 0.94;
  const corners: Array<{ corner: 'fl' | 'fr' | 'rl' | 'rr'; x: number; z: number; isFront: boolean }> = [
    { corner: 'fl', x: -trackHalf, z: 1.38, isFront: true },
    { corner: 'fr', x: trackHalf, z: 1.38, isFront: true },
    { corner: 'rl', x: -trackHalf, z: -1.32, isFront: false },
    { corner: 'rr', x: trackHalf, z: -1.32, isFront: false },
  ];
  const tireGeo = new THREE.CylinderGeometry(0.36 * wheelScale, 0.36 * wheelScale, 0.3, 22);
  tireGeo.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(0.24 * wheelScale, 0.24 * wheelScale, 0.32, 16);
  rimGeo.rotateZ(Math.PI / 2);

  for (const wc of corners) {
    const cornerRoot = new THREE.Group();
    cornerRoot.position.set(wc.x, baseWheelY, wc.z);
    const steerPivot = new THREE.Group();
    const spinGroup = new THREE.Group();
    const tire = new THREE.Mesh(tireGeo, tireMat);
    const rim = new THREE.Mesh(rimGeo, chromeMat);
    spinGroup.add(tire, rim);
    steerPivot.add(spinGroup);
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
