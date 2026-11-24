import * as THREE from 'three';
import { roundedBox } from './roundedBox';
import {
  ensureGeometryHasUv,
  getPolishedConcretePbr,
} from './textures';
import {
  VEHICLE_GARAGE_POS,
  VEHICLE_GARAGE_Y,
} from './terrain';
import {
  GARAGE_ATELIER_BAYS,
  GARAGE_CREW_TASKS,
  getGarageCrewPlacements,
  type GarageCrewTask,
} from '../systems/garageCrew';

export interface MotorAtelierWorkerHandle {
  id: string;
  bayIndex: number;
  bayLabel: string;
  task: GarageCrewTask;
  group: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  /** Local resting height inside the atelier group. */
  baseY: number;
  baseX: number;
  baseZ: number;
  phase: number;
}

export interface MotorAtelierHandles {
  group: THREE.Group;
  groundY: number;
  position: THREE.Vector3;
  benchPos: THREE.Vector3;
  supervisor: { group: THREE.Group; armL: THREE.Group; armR: THREE.Group };
  crew: MotorAtelierWorkerHandle[];
}

export interface MotorAtelierCollider {
  x: number;
  z: number;
  radius: number;
  minY?: number;
  maxY?: number;
}

const BAY_X = [-15, -9, -3, 3, 9, 15];

function signTexture(title: string, subtitle: string): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f8e7b0';
  ctx.shadowColor = '#d4a441';
  ctx.shadowBlur = 18;
  ctx.font = '700 132px Georgia, serif';
  ctx.fillText(title, 1024, 155);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#b7c7d6';
  ctx.font = '400 44px Arial, sans-serif';
  ctx.fillText(subtitle, 1024, 242);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function toolMesh(task: GarageCrewTask, metal: THREE.Material, glow: THREE.Material): THREE.Mesh {
  switch (task) {
    case 'wash':
      return new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.26), new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        roughness: 0.72,
      }));
    case 'interior':
      return new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.045, 0.55, 6), metal);
    case 'hydraulics':
      return new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.36, 0.04), metal);
    case 'audio':
      return new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.3, 0.18), new THREE.MeshStandardMaterial({
        color: 0x7e22ce,
        roughness: 0.44,
        metalness: 0.32,
      }));
    case 'lights':
      return new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), glow);
  }
}

export function buildHilltopMotorAtelier(
  woodTex: THREE.Texture,
  colliders: MotorAtelierCollider[],
): MotorAtelierHandles {
  const groundY = VEHICLE_GARAGE_Y;
  const garageGroup = new THREE.Group();
  garageGroup.name = 'hilltop-motor-atelier';
  garageGroup.position.set(VEHICLE_GARAGE_POS.x, groundY, VEHICLE_GARAGE_POS.z);

  const concretePbr = getPolishedConcretePbr(8);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x303842,
    map: concretePbr.map,
    normalMap: concretePbr.normalMap,
    normalScale: new THREE.Vector2(0.34, 0.34),
    roughnessMap: concretePbr.roughnessMap,
    roughness: 0.13,
    metalness: 0.36,
    envMapIntensity: 1.55,
  });
  const bayPadMat = new THREE.MeshStandardMaterial({
    color: 0x171c22,
    map: concretePbr.map,
    normalMap: concretePbr.normalMap,
    normalScale: new THREE.Vector2(0.28, 0.28),
    roughness: 0.18,
    metalness: 0.42,
    envMapIntensity: 1.45,
  });
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x3b4148,
    map: concretePbr.map,
    normalMap: concretePbr.normalMap,
    normalScale: new THREE.Vector2(0.55, 0.55),
    roughness: 0.68,
    metalness: 0.16,
  });
  const blackMat = new THREE.MeshStandardMaterial({
    color: 0x0b1118,
    roughness: 0.36,
    metalness: 0.62,
  });
  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xc9a35b,
    roughness: 0.22,
    metalness: 0.92,
    envMapIntensity: 1.4,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe5edf5,
    roughness: 0.14,
    metalness: 0.96,
    envMapIntensity: 1.6,
  });
  const timberMat = new THREE.MeshStandardMaterial({
    color: 0x5c3a22,
    map: woodTex,
    roughness: 0.78,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x9fd8ef,
    transparent: true,
    opacity: 0.2,
    roughness: 0.06,
    metalness: 0.18,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const roofGlassMat = new THREE.MeshStandardMaterial({
    color: 0x9ccbe2,
    transparent: true,
    opacity: 0.3,
    roughness: 0.08,
    metalness: 0.12,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const coolLedMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    emissive: 0x7dd3fc,
    emissiveIntensity: 2.2,
    roughness: 0.2,
  });
  const warmLedMat = new THREE.MeshStandardMaterial({
    color: 0xffedd5,
    emissive: 0xfbbf24,
    emissiveIntensity: 1.8,
    roughness: 0.2,
  });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x161412, roughness: 0.9 });
  const leatherMat = new THREE.MeshStandardMaterial({ color: 0x201b19, roughness: 0.62 });

  // Polished porcelain showroom floor with brass expansion inlays.
  const floor = new THREE.Mesh(
    ensureGeometryHasUv(roundedBox(39.2, 0.18, 14.6, 0.16, 3)),
    floorMat,
  );
  floor.position.set(0, 0.04, 0);
  floor.receiveShadow = true;
  floor.userData.noShadowCast = true;
  floor.userData.preserveEnvMapIntensity = true;
  garageGroup.add(floor);

  [-16.5, -11.5, -5.5, 0.5, 6.5, 12.5, 17.2].forEach((x) => {
    const inlay = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.012, 13.7), brassMat);
    inlay.position.set(x, 0.142, 0.3);
    inlay.userData.noShadowCast = true;
    garageGroup.add(inlay);
  });

  const apron = new THREE.Mesh(
    ensureGeometryHasUv(roundedBox(39.8, 0.12, 4.6, 0.12, 2)),
    new THREE.MeshStandardMaterial({
      color: 0x5b6570,
      map: concretePbr.map,
      normalMap: concretePbr.normalMap,
      roughness: 0.3,
      metalness: 0.22,
      envMapIntensity: 1.2,
    }),
  );
  apron.position.set(0, 0.015, 8.0);
  apron.rotation.x = 0.028;
  apron.receiveShadow = true;
  apron.userData.noShadowCast = true;
  garageGroup.add(apron);

  GARAGE_ATELIER_BAYS.forEach((bay) => {
    if (bay.kind === 'display') {
      const turntable = new THREE.Mesh(
        new THREE.CylinderGeometry(2.55, 2.72, 0.09, 32),
        bayPadMat,
      );
      turntable.position.set(bay.x, 0.12, bay.z);
      turntable.receiveShadow = true;
      turntable.userData.noShadowCast = true;
      garageGroup.add(turntable);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(2.58, 0.045, 8, 48), brassMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(bay.x, 0.17, bay.z);
      ring.userData.noShadowCast = true;
      garageGroup.add(ring);
      return;
    }

    const pad = new THREE.Mesh(
      ensureGeometryHasUv(roundedBox(5.2, 0.04, 8.4, 0.04, 2)),
      bayPadMat,
    );
    pad.position.set(bay.x, 0.145, bay.z);
    pad.receiveShadow = true;
    pad.userData.noShadowCast = true;
    pad.userData.preserveEnvMapIntensity = true;
    garageGroup.add(pad);

    [-2.36, 2.36].forEach((side) => {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.018, 7.9), coolLedMat);
      strip.position.set(bay.x + side, 0.17, bay.z);
      strip.userData.noShadowCast = true;
      garageGroup.add(strip);
    });
    const frontStrip = new THREE.Mesh(new THREE.BoxGeometry(4.7, 0.018, 0.055), warmLedMat);
    frontStrip.position.set(bay.x, 0.17, bay.z + 4.02);
    frontStrip.userData.noShadowCast = true;
    garageGroup.add(frontStrip);

    // Flush-mounted low-profile lift runners, clear of tyres and wheels.
    [-1.55, 1.55].forEach((side) => {
      const runner = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.035, 4.0), chromeMat);
      runner.position.set(bay.x + side, 0.173, bay.z - 0.15);
      runner.userData.noShadowCast = true;
      garageGroup.add(runner);
    });
    const stop = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.13, 0.22), brassMat);
    stop.position.set(bay.x, 0.2, bay.z - 4.0);
    stop.userData.noShadowCast = true;
    garageGroup.add(stop);
  });

  // Structural colonnade and glass curtain walls. The entire south front stays
  // open at car height so every vehicle can drive straight onto its lift.
  const colX = [-19.1, -12.6, -6.0, 0, 6.0, 12.6, 19.1];
  const colZ = [-6.35, 6.35];
  colX.forEach((x) => {
    colZ.forEach((z) => {
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.42, 0.64), stoneMat);
      plinth.position.set(x, 0.31, z);
      const column = new THREE.Mesh(new THREE.BoxGeometry(0.34, 4.72, 0.34), blackMat);
      column.position.set(x, 2.66, z);
      const collar = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.08, 0.46), brassMat);
      collar.position.set(x, 4.9, z);
      column.castShadow = true;
      garageGroup.add(plinth, column, collar);
      colliders.push({
        x: VEHICLE_GARAGE_POS.x + x,
        z: VEHICLE_GARAGE_POS.z + z,
        radius: 0.4,
        minY: groundY - 0.5,
        maxY: groundY + 5.4,
      });
    });
  });

  [-19.1, 19.1].forEach((x) => {
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.055, 3.28, 12.1), glassMat);
    glass.position.set(x, 2.26, 0);
    garageGroup.add(glass);
    const sill = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.62, 12.5), stoneMat);
    sill.position.set(x, 0.31, 0);
    sill.castShadow = true;
    garageGroup.add(sill);
    for (let z = -6.0; z <= 6.0; z += 2.0) {
      const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.09, 3.34, 0.09), brassMat);
      mullion.position.set(x, 2.3, z);
      garageGroup.add(mullion);
    }
    // Overlap the side-wall collision circles at 1 m spacing so no seam is
    // wide enough for a player to squeeze through the glazing.
    for (let z = -6.0; z <= 6.0; z += 1.0) {
      colliders.push({
        x: VEHICLE_GARAGE_POS.x + x,
        z: VEHICLE_GARAGE_POS.z + z,
        radius: 0.82,
        minY: groundY - 0.5,
        maxY: groundY + 4.7,
      });
    }
  });

  const backBase = new THREE.Mesh(roundedBox(38.4, 1.1, 0.44, 0.05, 2), stoneMat);
  backBase.position.set(0, 0.64, -6.35);
  backBase.castShadow = true;
  garageGroup.add(backBase);
  const backGlass = new THREE.Mesh(new THREE.BoxGeometry(37.4, 2.75, 0.05), glassMat);
  backGlass.position.set(0, 2.55, -6.35);
  garageGroup.add(backGlass);
  const backHeader = new THREE.Mesh(new THREE.BoxGeometry(39.0, 0.46, 0.46), blackMat);
  backHeader.position.set(0, 4.15, -6.35);
  garageGroup.add(backHeader);
  for (let x = -18; x <= 18; x += 2.0) {
    const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.075, 2.8, 0.075), brassMat);
    mullion.position.set(x, 2.55, -6.32);
    garageGroup.add(mullion);
  }
  // Overlapping 1 m collider spacing closes the seam between mullion circles.
  for (let x = -18; x <= 18; x += 1.0) {
    colliders.push({
      x: VEHICLE_GARAGE_POS.x + x,
      z: VEHICLE_GARAGE_POS.z - 6.35,
      radius: 0.82,
      minY: groundY - 0.5,
      maxY: groundY + 4.7,
    });
  }

  const frontHeader = new THREE.Mesh(roundedBox(39.6, 0.44, 0.46, 0.05, 2), blackMat);
  frontHeader.position.set(0, 4.94, 6.35);
  garageGroup.add(frontHeader);
  const backHeaderTop = new THREE.Mesh(roundedBox(39.6, 0.44, 0.46, 0.05, 2), blackMat);
  backHeaderTop.position.set(0, 4.94, -6.35);
  garageGroup.add(backHeaderTop);
  const frontTransom = new THREE.Mesh(new THREE.BoxGeometry(38.6, 0.98, 0.055), glassMat);
  frontTransom.position.set(0, 4.18, 6.35);
  garageGroup.add(frontTransom);
  for (let x = -18.0; x <= 18.0; x += 3.0) {
    const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.085, 1.05, 0.085), brassMat);
    mullion.position.set(x, 4.18, 6.4);
    garageGroup.add(mullion);
  }
  colX.forEach((x) => {
    const truss = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.26, 12.9), blackMat);
    truss.position.set(x, 4.82, 0);
    garageGroup.add(truss);
  });

  const roof = new THREE.Mesh(roundedBox(40.2, 0.22, 14.8, 0.14, 3), blackMat);
  roof.position.set(0, 5.24, 0);
  roof.rotation.x = -0.045;
  roof.castShadow = true;
  roof.receiveShadow = true;
  garageGroup.add(roof);
  const fascia = new THREE.Mesh(new THREE.BoxGeometry(40.5, 0.16, 0.2), brassMat);
  fascia.position.set(0, 5.12, 7.42);
  garageGroup.add(fascia);

  // Three glazed skylight bands wash the paintwork in soft daylight.
  for (let i = 0; i < 3; i++) {
    const skylight = new THREE.Mesh(new THREE.BoxGeometry(34.0, 0.035, 0.8), roofGlassMat);
    skylight.position.set(0, 5.36, -3.3 + i * 3.3);
    skylight.userData.noShadowCast = true;
    garageGroup.add(skylight);
    const frameA = new THREE.Mesh(new THREE.BoxGeometry(34.4, 0.08, 0.08), brassMat);
    frameA.position.set(0, 5.35, -3.7 + i * 3.3);
    const frameB = frameA.clone();
    frameB.position.z = -2.9 + i * 3.3;
    garageGroup.add(frameA, frameB);
  }

  // Illuminated front and rear crests.
  const frontSign = new THREE.Mesh(
    new THREE.BoxGeometry(16.4, 2.1, 0.22),
    new THREE.MeshStandardMaterial({ color: 0x080c11, roughness: 0.28, metalness: 0.7 }),
  );
  frontSign.position.set(0, 5.32, 7.32);
  garageGroup.add(frontSign);
  const signTex = signTexture(
    'HILLTOP MOTOR ATELIER',
    'SIX-CAR SHOWROOM  ·  DETAIL  ·  HYDRAULICS  ·  AUDIO  ·  LIGHTING',
  );
  if (signTex) {
    const signFace = new THREE.Mesh(
      new THREE.PlaneGeometry(15.7, 1.95),
      new THREE.MeshBasicMaterial({ map: signTex, transparent: true, toneMapped: false }),
    );
    signFace.position.set(0, 5.32, 7.445);
    garageGroup.add(signFace);
    const interiorSign = signFace.clone();
    interiorSign.position.set(0, 3.68, -6.28);
    interiorSign.rotation.y = Math.PI;
    garageGroup.add(interiorSign);
  }
  const signGlow = new THREE.Mesh(new THREE.BoxGeometry(16.9, 0.06, 0.06), warmLedMat);
  signGlow.position.set(0, 4.32, 7.48);
  garageGroup.add(signGlow);

  // Ceiling light blades and service-bay floods.
  BAY_X.forEach((x, index) => {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.08, 0.13), coolLedMat);
    blade.position.set(x, 4.55, 1.55);
    blade.userData.noShadowCast = true;
    garageGroup.add(blade);
    const detailBlade = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.08, 0.1), warmLedMat);
    detailBlade.position.set(x, 4.52, -2.1);
    detailBlade.userData.noShadowCast = true;
    garageGroup.add(detailBlade);
    if (index % 2 === 0 || index === 5) {
      const light = new THREE.PointLight(index % 2 === 0 ? 0xdff4ff : 0xfff1d6, 1.25, 18, 1.6);
      light.position.set(x, 4.2, 1.5);
      garageGroup.add(light);
    }
  });
  [-14, 14].forEach((x) => {
    const sconce = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.4, 0.1), warmLedMat);
    sconce.position.set(x, 2.3, -6.26);
    garageGroup.add(sconce);
  });

  // Service wall: pressure wash, interior care, hydraulic pump bench, hifi
  // rack and a proper headlight aiming wall.
  const equipment = new THREE.Group();
  equipment.name = 'atelier-service-wall';

  const pressureTank = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.25, 16), new THREE.MeshStandardMaterial({
    color: 0x0369a1,
    roughness: 0.34,
    metalness: 0.55,
  }));
  pressureTank.position.set(-16.4, 0.78, -4.55);
  const pressureCart = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.5, 0.8), blackMat);
  pressureCart.position.set(-16.4, 0.4, -4.55);
  const hoseReel = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.09, 8, 20), warmLedMat);
  hoseReel.position.set(-15.35, 1.65, -6.08);
  equipment.add(pressureTank, pressureCart, hoseReel);

  const vacuum = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.52, 1.15, 16), new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.3,
    metalness: 0.7,
  }));
  vacuum.position.set(-11.9, 0.73, -4.75);
  const vacuumHose = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.055, 6, 24), blackMat);
  vacuumHose.position.set(-10.85, 1.42, -5.9);
  const vacWand = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.5, 6), chromeMat);
  vacWand.position.set(-10.8, 0.95, -4.8);
  vacWand.rotation.z = 0.28;
  equipment.add(vacuum, vacuumHose, vacWand);

  const pumpCabinet = new THREE.Mesh(new THREE.BoxGeometry(3.1, 1.7, 0.8), blackMat);
  pumpCabinet.position.set(-5.9, 0.98, -5.85);
  const reservoir = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.55, 0.55), new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.32,
    metalness: 0.5,
  }));
  reservoir.position.set(-5.9, 1.95, -5.65);
  equipment.add(pumpCabinet, reservoir);
  for (let i = 0; i < 4; i++) {
    const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.5, 12), chromeMat);
    cylinder.position.set(-7.1 + i * 0.8, 2.25, -5.95);
    cylinder.rotation.z = 0.45;
    equipment.add(cylinder);
  }

  const speakerWall = new THREE.Group();
  speakerWall.position.set(2.0, 0.0, -6.0);
  for (let i = 0; i < 4; i++) {
    const cabinet = new THREE.Mesh(new THREE.BoxGeometry(0.82, 1.2, 0.34), blackMat);
    cabinet.position.set(-1.5 + i * 1.0, 1.75, 0);
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.08, 20), new THREE.MeshStandardMaterial({
      color: 0xa855f7,
      emissive: 0x581c87,
      emissiveIntensity: 0.45,
      roughness: 0.34,
      metalness: 0.5,
    }));
    cone.rotation.x = Math.PI / 2;
    cone.position.set(-1.5 + i * 1.0, 1.75, 0.2);
    speakerWall.add(cabinet, cone);
  }
  const amp = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.55, 0.4), chromeMat);
  amp.position.set(0, 0.72, 0);
  speakerWall.add(amp);
  equipment.add(speakerWall);

  const aimingBoard = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.0, 0.16), new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.5,
    metalness: 0.1,
  }));
  aimingBoard.position.set(10.6, 1.9, -6.05);
  equipment.add(aimingBoard);
  [-0.75, 0.75].forEach((offset) => {
    const target = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.045, 8, 24), blackMat);
    target.position.set(10.6 + offset, 1.95, -5.95);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), warmLedMat);
    dot.position.set(10.6 + offset, 1.95, -5.9);
    equipment.add(target, dot);
  });
  const lampRig = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.14, 0.35), blackMat);
  lampRig.position.set(10.6, 3.05, -5.7);
  equipment.add(lampRig);
  [-0.45, 0.45].forEach((offset) => {
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), warmLedMat);
    lamp.position.set(10.6 + offset, 2.93, -5.54);
    equipment.add(lamp);
  });

  const tireRack = new THREE.Group();
  tireRack.position.set(16.5, 0.0, -5.5);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 2; j++) {
      const tyre = new THREE.Mesh(new THREE.TorusGeometry(0.41, 0.16, 8, 18), tireMat);
      tyre.rotation.x = Math.PI / 2;
      tyre.position.set(0.3 + j * 0.95, 1.05 + i * 0.52, 0);
      tireRack.add(tyre);
    }
  }
  const rackFrame = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.4, 0.25), chromeMat);
  rackFrame.position.set(0.6, 1.25, -0.38);
  tireRack.add(rackFrame);
  equipment.add(tireRack);

  // Detail supply cabinets and a small client lounge at the back of the shop.
  const cabinet = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.2, 0.62), new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.38,
    metalness: 0.54,
  }));
  cabinet.position.set(-17.4, 1.22, -6.0);
  const cabinetTop = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.08, 0.7), brassMat);
  cabinetTop.position.set(-17.4, 2.36, -6.0);
  equipment.add(cabinet, cabinetTop);

  const sofa = new THREE.Group();
  sofa.position.set(16.7, 0.0, -2.2);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.42, 0.85), leatherMat);
  seat.position.y = 0.58;
  const back = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.8, 0.25), leatherMat);
  back.position.set(0, 1.02, -0.34);
  const sofaArmLeft = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.62, 0.9), leatherMat);
  sofaArmLeft.position.set(-1.35, 0.72, 0);
  const sofaArmRight = sofaArmLeft.clone();
  sofaArmRight.position.x = 1.35;
  const coffee = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.62, 0.38, 18), timberMat);
  coffee.position.set(0, 0.34, 1.2);
  sofa.add(seat, back, sofaArmLeft, sofaArmRight, coffee);
  equipment.add(sofa);

  garageGroup.add(equipment);

  const benchGroup = new THREE.Group();
  benchGroup.position.set(0, 0.13, -5.0);
  const benchTable = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.94, 1.05), timberMat);
  benchTable.position.y = 0.47;
  benchTable.castShadow = true;
  const benchVise = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.28, 0.35), chromeMat);
  benchVise.position.set(-0.95, 1.08, 0.15);
  const benchLamp = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), warmLedMat);
  benchLamp.position.set(1.05, 1.2, -0.2);
  benchGroup.add(benchTable, benchVise, benchLamp);
  garageGroup.add(benchGroup);
  colliders.push({
    x: VEHICLE_GARAGE_POS.x,
    z: VEHICLE_GARAGE_POS.z - 5.0,
    radius: 0.95,
    minY: groundY - 0.5,
    maxY: groundY + 3,
  });

  // Supervisor keeps the existing garage service behaviour and directs the crew.
  const supervisor = new THREE.Group();
  supervisor.name = 'mansion-garage-maid';
  const managerSuit = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.62 });
  const managerShirt = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.7 });
  const skin = new THREE.MeshStandardMaterial({ color: 0x8d5524, roughness: 0.72 });
  const hair = new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 0.9 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.66, 0.32), managerShirt);
  body.position.y = 1.16;
  const jacket = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.72, 0.36), managerSuit);
  jacket.position.y = 1.16;
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.58, 0.28), managerSuit);
  legs.position.y = 0.33;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 10), skin);
  head.position.y = 1.64;
  const hairMesh = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), hair);
  hairMesh.position.set(0, 1.7, -0.03);
  const armL = new THREE.Group();
  armL.position.set(-0.34, 1.34, 0);
  const armLMesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.55, 0.14), managerSuit);
  armLMesh.position.y = -0.27;
  armL.add(armLMesh);
  const armR = new THREE.Group();
  armR.position.set(0.34, 1.34, 0);
  const armRMesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.55, 0.14), managerSuit);
  armRMesh.position.y = -0.27;
  const tablet = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.18, 0.04), coolLedMat);
  tablet.position.set(0, -0.58, 0.11);
  armR.add(armRMesh, tablet);
  supervisor.add(body, jacket, legs, head, hairMesh, armL, armR);
  supervisor.position.set(0, 0.16, -3.6);
  supervisor.traverse((object) => {
    object.userData.noStaticMerge = true;
    object.userData.dynamic = true;
    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.receiveShadow = false;
    }
  });
  garageGroup.add(supervisor);

  // Five specialists for every car: wash, interior, hydraulics, audio, lights.
  const crew: MotorAtelierWorkerHandle[] = [];
  const crewPlacements = getGarageCrewPlacements(VEHICLE_GARAGE_POS.x, VEHICLE_GARAGE_POS.z);
  for (const placement of crewPlacements) {
    const spec = GARAGE_CREW_TASKS.find((task) => task.id === placement.task);
    if (!spec) continue;
    const worker = new THREE.Group();
    worker.name = placement.id;
    const uniform = new THREE.MeshStandardMaterial({
      color: spec.uniformColor,
      roughness: 0.66,
      metalness: 0.08,
    });
    const accent = new THREE.MeshStandardMaterial({
      color: spec.accentColor,
      roughness: 0.5,
      metalness: 0.18,
    });
    const trouser = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.82 });
    const boots = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.34), blackMat);
    boots.position.set(-0.13, 0.12, 0.02);
    const boots2 = boots.clone();
    boots2.position.x = 0.13;
    const legsMesh = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.56, 0.24), trouser);
    legsMesh.position.y = 0.45;
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.62, 0.3), uniform);
    torso.position.y = 1.04;
    const vest = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.36, 0.33), accent);
    vest.position.y = 1.09;
    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), skin);
    headMesh.position.y = 1.55;
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.2, 0.12, 12), accent);
    cap.position.y = 1.69;
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.035, 0.18), accent);
    brim.position.set(0, 1.65, 0.18);
    const armLGroup = new THREE.Group();
    armLGroup.position.set(-0.31, 1.26, 0);
    const armLMesh = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.52, 0.13), uniform);
    armLMesh.position.y = -0.26;
    armLGroup.add(armLMesh);
    const armRGroup = new THREE.Group();
    armRGroup.position.set(0.31, 1.26, 0);
    const armRMesh = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.52, 0.13), uniform);
    armRMesh.position.y = -0.26;
    const tool = toolMesh(placement.task, chromeMat, warmLedMat);
    tool.position.set(0, -0.58, 0.12);
    armRGroup.add(armRMesh, tool);
    worker.add(boots, boots2, legsMesh, torso, vest, headMesh, cap, brim, armLGroup, armRGroup);
    worker.position.set(
      placement.x - VEHICLE_GARAGE_POS.x,
      0.16,
      placement.z - VEHICLE_GARAGE_POS.z,
    );
    worker.rotation.y = placement.facing;
    worker.traverse((object) => {
      object.userData.noStaticMerge = true;
      object.userData.dynamic = true;
      if (object instanceof THREE.Mesh) {
        object.castShadow =
          object === torso ||
          object === legsMesh ||
          object === headMesh ||
          object === armLMesh ||
          object === armRMesh;
        object.receiveShadow = false;
      }
    });
    garageGroup.add(worker);
    crew.push({
      id: placement.id,
      bayIndex: placement.bayIndex,
      bayLabel: placement.bayLabel,
      task: placement.task,
      group: worker,
      armL: armLGroup,
      armR: armRGroup,
      baseY: 0.16,
      baseX: worker.position.x,
      baseZ: worker.position.z,
      phase: crew.length * 0.73,
    });
  }

  return {
    group: garageGroup,
    groundY,
    position: new THREE.Vector3(VEHICLE_GARAGE_POS.x, groundY, VEHICLE_GARAGE_POS.z),
    benchPos: new THREE.Vector3(VEHICLE_GARAGE_POS.x, groundY + 0.13, VEHICLE_GARAGE_POS.z - 5.0),
    supervisor: { group: supervisor, armL, armR },
    crew,
  };
}
