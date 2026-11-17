import * as THREE from 'three';
import {
  KineticNodeKind,
  ModularVehicleData,
  VehicleModulePlacement,
} from '../types';

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
  style: 'wire_whitewall' | 'donk_30' | 'swanger',
  sideSign: -1 | 1, // -1 = left (-X), +1 = right (+X)
  rimColor: string,
  wheelScale: number,
  chromeMat: THREE.Material,
): { steerPivot: THREE.Group; spinGroup: THREE.Group } {
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
  const preset = vehicle.preset as 'lowrider' | 'donk' | 'slab';
  const rimColor = vehicle.rimColor || '#f8fafc';
  const wheelScale = vehicle.wheelScale ?? (preset === 'donk' ? 1.52 : preset === 'slab' ? 0.92 : 0.86);
  const susp = vehicle.suspensionOffset ?? (preset === 'donk' ? 0.44 : preset === 'lowrider' ? -0.16 : -0.12);

  const candyPaintMat = new THREE.MeshPhysicalMaterial({
    color: vehicle.paintColor || '#7e22ce',
    metalness: 0.72,
    roughness: 0.16,
    clearcoat: 1.0,
    clearcoatRoughness: 0.07,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: rimColor,
    metalness: 0.94,
    roughness: 0.1,
  });
  const darkTrimMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.75,
    metalness: 0.2,
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0f172a,
    roughness: 0.08,
    metalness: 0.25,
    clearcoat: 1.0,
    transparent: true,
    opacity: 0.86,
  });
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xfef9c3,
    emissive: 0xfef08a,
    emissiveIntensity: 1.25,
  });
  const taillightMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 1.0,
  });

  // Grounded axle reference height; chassisGroup lifts/drops by suspensionOffset
  const baseWheelY = 0.41 * wheelScale;
  const bodyRideY = Math.max(0.28, 0.38 + susp);
  handles.chassisGroup.position.y = bodyRideY;

  // 1. Lower chassis pan & underbody frame
  const underPan = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.14, 4.35), darkTrimMat);
  underPan.position.set(0, 0.08, 0.1);
  handles.chassisGroup.add(underPan);

  // 2. Sculpted main body shell (lengthwise along Z, +Z = nose)
  const lowerBodyLen = preset === 'slab' ? 4.75 : preset === 'donk' ? 4.6 : 4.65;
  const lowerBodyH = preset === 'lowrider' ? 0.52 : preset === 'donk' ? 0.58 : 0.56;
  const bodyCore = new THREE.Mesh(
    new THREE.BoxGeometry(1.94, lowerBodyH, lowerBodyLen),
    candyPaintMat,
  );
  bodyCore.position.set(0, lowerBodyH * 0.5 + 0.12, 0.08);
  handles.chassisGroup.add(bodyCore);

  // Front hood power bulge / sculpted crease
  const hood = new THREE.Mesh(
    new THREE.BoxGeometry(1.82, 0.1, 1.55),
    candyPaintMat,
  );
  hood.position.set(0, lowerBodyH + 0.15, 1.48);
  handles.chassisGroup.add(hood);

  // Rear deck / Trunk Lid (animated object for SLAB trunk bass vibration!)
  const trunkGroup = new THREE.Group();
  trunkGroup.position.set(0, lowerBodyH + 0.14, -1.45);
  const trunkPanel = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.09, 1.38), candyPaintMat);
  trunkPanel.position.set(0, 0, 0);
  trunkGroup.add(trunkPanel);
  handles.chassisGroup.add(trunkGroup);
  handles.trunkLid = trunkGroup;

  // Greenhouse / Cabin + Roof
  const roofMat =
    preset === 'slab'
      ? new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.72, metalness: 0.15 })
      : candyPaintMat;
  const cabinLen = preset === 'lowrider' ? 1.85 : 2.05;
  const cabinH = preset === 'lowrider' ? 0.46 : 0.54;
  const cabinY = lowerBodyH + 0.12 + cabinH * 0.5;
  const cabinGlass = new THREE.Mesh(
    new THREE.BoxGeometry(1.62, cabinH * 0.9, cabinLen * 0.92),
    glassMat,
  );
  cabinGlass.position.set(0, cabinY, -0.05);
  const roofCap = new THREE.Mesh(
    new THREE.BoxGeometry(1.68, 0.09, cabinLen * 0.82),
    roofMat,
  );
  roofCap.position.set(0, cabinY + cabinH * 0.46, -0.08);
  handles.chassisGroup.add(cabinGlass, roofCap);

  // Roof chrome trim rails / A-B-C pillars
  [-0.78, 0.78].forEach((px) => {
    const aPillar = new THREE.Mesh(new THREE.BoxGeometry(0.08, cabinH * 1.05, 0.1), chromeMat);
    aPillar.position.set(px, cabinY, 0.76);
    aPillar.rotation.x = -0.35;
    const cPillar = new THREE.Mesh(new THREE.BoxGeometry(0.1, cabinH * 1.05, 0.16), candyPaintMat);
    cPillar.position.set(px, cabinY, -0.92);
    cPillar.rotation.x = 0.28;
    handles.chassisGroup.add(aPillar, cPillar);
  });

  // Interior steering wheel visible through cabin
  const helmWheel = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.025, 6, 14), chromeMat);
  helmWheel.position.set(-0.38, lowerBodyH + 0.28, 0.45);
  helmWheel.rotation.x = 0.45;
  handles.chassisGroup.add(helmWheel);
  handles.helmWheel = helmWheel;

  // Chrome Bumpers, Grille, Side Spear Molding, Quad Headlights & Taillights
  const frontZ = 0.08 + lowerBodyLen * 0.5;
  const rearZ = 0.08 - lowerBodyLen * 0.5;

  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(2.04, 0.2, 0.22), chromeMat);
  frontBumper.position.set(0, 0.26, frontZ + 0.08);
  const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(2.04, 0.2, 0.22), chromeMat);
  rearBumper.position.set(0, 0.26, rearZ - 0.08);
  const grille = new THREE.Mesh(
    new THREE.BoxGeometry(1.42, 0.26, 0.08),
    preset === 'slab' ? chromeMat : chromeMat,
  );
  grille.position.set(0, 0.46, frontZ + 0.02);
  handles.chassisGroup.add(frontBumper, rearBumper, grille);

  // Quad headlights + Taillights
  [-0.78, -0.6, 0.6, 0.78].forEach((hx) => {
    const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.06, 10), headlightMat);
    hl.rotation.x = Math.PI / 2;
    hl.position.set(hx, 0.48, frontZ + 0.02);
    handles.chassisGroup.add(hl);
  });
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

  // Full-length chrome side spear trim & dual chrome exhaust tips
  [-0.985, 0.985].forEach((sx) => {
    const spear = new THREE.Mesh(
      new THREE.BoxGeometry(0.035, 0.055, lowerBodyLen * 0.9),
      chromeMat,
    );
    spear.position.set(sx, 0.46, 0.08);
    handles.chassisGroup.add(spear);
  });
  [-0.58, 0.58].forEach((ex) => {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.38, 8), chromeMat);
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(ex, 0.14, rearZ - 0.14);
    handles.chassisGroup.add(pipe);
  });

  // Preset-specific signature details
  if (preset === 'lowrider') {
    // 1964 Impala rear fender tailfin crests + chrome hood trim spear
    [-0.88, 0.88].forEach((fx) => {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 1.25), candyPaintMat);
      fin.position.set(fx, lowerBodyH + 0.16, -1.52);
      handles.chassisGroup.add(fin);
    });
    const hoodTrim = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 1.35), chromeMat);
    hoodTrim.position.set(0, lowerBodyH + 0.21, 1.48);
    handles.chassisGroup.add(hoodTrim);
  } else if (preset === 'donk') {
    // Visible lifted coil-over suspension struts & chrome axle bars beneath the high-clearance chassis
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
    // Continental Fifth-Wheel Spare Tire Kit on the rear trunk/bumper!
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

    // Neon Underglow strips + underbody PointLight
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

  // 3. Attach 4 Independent Corner Wheels to root (with grounded baseY so 4-corner hydraulics articulate cleanly!)
  const wheelStyle: 'wire_whitewall' | 'donk_30' | 'swanger' =
    preset === 'donk' ? 'donk_30' : preset === 'slab' ? 'swanger' : 'wire_whitewall';
  const trackHalf = preset === 'donk' ? 1.06 : 0.96;
  const wheelCoords: { corner: 'fl' | 'fr' | 'rl' | 'rr'; x: number; z: number; side: -1 | 1; isFront: boolean }[] = [
    { corner: 'fl', x: -trackHalf, z: 1.38, side: -1, isFront: true },
    { corner: 'fr', x: trackHalf, z: 1.38, side: 1, isFront: true },
    { corner: 'rl', x: -trackHalf, z: -1.24, side: -1, isFront: false },
    { corner: 'rr', x: trackHalf, z: -1.24, side: 1, isFront: false },
  ];

  for (const wc of wheelCoords) {
    const cornerRoot = new THREE.Group();
    cornerRoot.position.set(wc.x, baseWheelY, wc.z);
    const { steerPivot, spinGroup } = buildCustomWheel(
      wheelStyle,
      wc.side,
      rimColor,
      wheelScale,
      chromeMat,
    );
    cornerRoot.add(steerPivot);
    handles.root.add(cornerRoot);

    handles.wheels.push(spinGroup);
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
    vehicle.preset === 'lowrider' ||
    vehicle.preset === 'donk' ||
    vehicle.preset === 'slab'
  ) {
    buildCustomStreetShowCar(vehicle, handles);
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

  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
  return handles;
}
