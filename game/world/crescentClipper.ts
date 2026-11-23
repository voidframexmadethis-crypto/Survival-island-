import * as THREE from 'three';
import { markAlwaysVisibleWorldObject } from './worldCullPolicy';

export interface CrescentClipperHandles {
  root: THREE.Group;
  door: THREE.Group;
  propellers: THREE.Object3D[];
  engineGlowMat: THREE.MeshStandardMaterial;
  beaconMat: THREE.MeshStandardMaterial;
  cabinSeats: THREE.Object3D[];
  maid: THREE.Object3D;
  maids: THREE.Object3D[];
  stairs: THREE.Group;
  bedroomDoor: THREE.Group;
  bathroomDoor: THREE.Group;
  servicePlate: THREE.Group;
  landingGear: THREE.Group;
  cabinTvMat: THREE.MeshStandardMaterial;
  bedroomLampMat: THREE.MeshStandardMaterial;
  bathroomLightMat: THREE.MeshStandardMaterial;
}

function makeNameTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.clearRect(0, 0, 512, 192);
  ctx.fillStyle = '#f8f3e6';
  ctx.fillRect(0, 0, 512, 192);
  ctx.fillStyle = '#0f4c5c';
  ctx.fillRect(0, 0, 512, 18);
  ctx.fillRect(0, 174, 512, 18);
  ctx.fillStyle = '#0f4c5c';
  ctx.font = 'bold 54px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('CRESCENT', 256, 82);
  ctx.fillText('CLIPPER', 256, 138);
  ctx.fillStyle = '#b98324';
  ctx.font = 'bold 20px Arial, sans-serif';
  ctx.fillText('SEAPLANE  ·  55-MINUTE CROSSING', 256, 166);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/**
 * A walk-in, piston-twin flying boat in the Crescent Star livery. The model is
 * built in local space with the bow on +Z, so the voyage state machine can use
 * the same heading convention as the ferry.
 */
export function buildCrescentClipper(): CrescentClipperHandles {
  const root = new THREE.Group();
  root.name = 'crescent-clipper';
  markAlwaysVisibleWorldObject(root);

  const hullMat = new THREE.MeshStandardMaterial({ color: 0xf3eee0, roughness: 0.48 });
  const hullTrimMat = new THREE.MeshStandardMaterial({ color: 0x0f4c5c, roughness: 0.42 });
  hullMat.side = THREE.DoubleSide;
  hullTrimMat.side = THREE.DoubleSide;
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xc08a2e,
    roughness: 0.35,
    metalness: 0.55,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0b2338,
    emissive: 0x1d6d92,
    emissiveIntensity: 0.35,
    roughness: 0.12,
    metalness: 0.45,
    transparent: true,
    opacity: 0.72,
  });
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x26343a,
    roughness: 0.5,
    metalness: 0.5,
  });
  const interiorMat = new THREE.MeshStandardMaterial({ color: 0x9c7a52, roughness: 0.88 });
  const seatMat = new THREE.MeshStandardMaterial({ color: 0x7c2c2c, roughness: 0.94 });
  const bedMat = new THREE.MeshStandardMaterial({ color: 0xe8eef2, roughness: 0.94 });
  const blanketMat = new THREE.MeshStandardMaterial({ color: 0x2f6f69, roughness: 0.92 });
  const carpetMat = new THREE.MeshStandardMaterial({ color: 0x5b4636, roughness: 0.98 });
  const bathMat = new THREE.MeshStandardMaterial({ color: 0xeef2f4, roughness: 0.24 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.38 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x7b4f31, roughness: 0.85 });
  const frostedMat = new THREE.MeshStandardMaterial({
    color: 0xbfe8ef,
    transparent: true,
    opacity: 0.38,
    roughness: 0.16,
  });
  const maidDressMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.92 });
  const maidApronMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.88 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0x8d5a3b, roughness: 0.86 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x2b1b12, roughness: 0.9 });
  const bedroomLampMat = new THREE.MeshStandardMaterial({
    color: 0xffe6b0,
    emissive: 0xffb84d,
    emissiveIntensity: 1.1,
    roughness: 0.3,
  });
  const bathroomLightMat = new THREE.MeshStandardMaterial({
    color: 0xe8fbff,
    emissive: 0x9fe8ff,
    emissiveIntensity: 1.0,
    roughness: 0.25,
  });
  const xboxMat = new THREE.MeshStandardMaterial({
    color: 0x0b1410,
    emissive: 0x53ff8a,
    emissiveIntensity: 1.1,
    roughness: 0.4,
  });
  const cabinTvMat = new THREE.MeshStandardMaterial({
    color: 0x071523,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.9,
    roughness: 0.2,
  });
  const floatMat = new THREE.MeshStandardMaterial({
    color: 0x23555c,
    roughness: 0.6,
    metalness: 0.15,
  });
  const propellerMat = new THREE.MeshStandardMaterial({
    color: 0x1f2937,
    roughness: 0.55,
    metalness: 0.4,
  });
  const engineGlowMat = new THREE.MeshStandardMaterial({
    color: 0xffa347,
    emissive: 0xff7a1a,
    emissiveIntensity: 0.15,
    roughness: 0.4,
  });
  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0xff3b30,
    emissive: 0xff2d20,
    emissiveIntensity: 0.8,
    roughness: 0.3,
  });
  const navRedMat = new THREE.MeshStandardMaterial({
    color: 0xff3b30,
    emissive: 0xff2d20,
    emissiveIntensity: 1.2,
    roughness: 0.3,
  });
  const navGreenMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    emissive: 0x16a34a,
    emissiveIntensity: 1.2,
    roughness: 0.3,
  });
  const nameTexture = makeNameTexture();
  const nameMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    ...(nameTexture ? { map: nameTexture } : {}),
    roughness: 0.6,
  });

  const addBox = (
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material,
    parent: THREE.Object3D = root,
  ): THREE.Mesh => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const addCylinder = (
    radius: number,
    length: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material,
    parent: THREE.Object3D = root,
  ): THREE.Mesh => {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, length, 14),
      mat,
    );
    mesh.rotation.x = Math.PI / 2;
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  // ---- Fuselage ----------------------------------------------------------
  addCylinder(1.55, 15, 0, 2.4, 0.4, hullMat);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(1.55, 2.2, 18), hullMat);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 2.4, 8.2);
  nose.castShadow = true;
  root.add(nose);
  const tailCone = new THREE.Mesh(new THREE.ConeGeometry(1.55, 2.4, 18), hullMat);
  tailCone.rotation.x = -Math.PI / 2;
  tailCone.position.set(0, 2.4, -8.0);
  tailCone.castShadow = true;
  root.add(tailCone);
  addCylinder(1.58, 1.6, 0, 2.4, 2.6, hullTrimMat);
  addCylinder(1.58, 0.7, 0, 2.4, -4.6, goldMat);

  // ---- High wing and tail -------------------------------------------------
  addBox(23, 0.22, 3.8, 0, 3.55, 1.0, hullMat);
  addBox(23.2, 0.05, 0.2, 0, 3.68, 2.55, goldMat);
  for (const side of [-1, 1]) {
    addBox(2.4, 0.2, 2.8, side * 11.1, 3.55, 1.0, hullTrimMat);
    addBox(0.34, 0.24, 3.4, side * 6.6, 3.55, 1.0, frameMat);
  }
  addBox(8.4, 0.2, 2.4, 0, 3.1, -7.3, hullMat);
  addBox(0.22, 3.5, 2.5, 0, 4.35, -7.35, hullTrimMat);
  addBox(0.06, 0.9, 2.0, 0, 4.1, -7.4, goldMat);

  // ---- Twin floats and struts --------------------------------------------
  for (const side of [-1, 1]) {
    const floatX = side * 2.25;
    addBox(1.35, 0.8, 10.5, floatX, 0.45, 0.1, floatMat);
    const floatNose = new THREE.Mesh(new THREE.ConeGeometry(0.68, 1.8, 12), floatMat);
    floatNose.rotation.x = Math.PI / 2;
    floatNose.position.set(floatX, 0.45, 6.1);
    floatNose.scale.set(1, 1, 0.75);
    floatNose.castShadow = true;
    root.add(floatNose);
    addBox(0.12, 0.9, 1.0, floatX, 0.95, -4.9, floatMat);
    for (const strutZ of [-2.8, 1.9, 4.2]) {
      const strut = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.09, 1.9, 6),
        frameMat,
      );
      strut.position.set(floatX, 1.5, strutZ);
      strut.rotation.z = side * 0.28;
      strut.castShadow = true;
      root.add(strut);
    }
  }
  for (const side of [-1, 1]) {
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.4, 6), frameMat);
    strut.position.set(side * 4.0, 2.8, 1.0);
    strut.rotation.z = side * 0.55;
    strut.castShadow = true;
    root.add(strut);
  }

  // ---- Engines and propellers --------------------------------------------
  const propellers: THREE.Object3D[] = [];
  for (const side of [-1, 1]) {
    addCylinder(0.46, 3.1, side * 5.2, 3.25, 1.5, hullTrimMat);
    addCylinder(0.3, 0.5, side * 5.2, 3.25, 3.35, frameMat);
    addCylinder(0.26, 0.9, side * 5.2, 3.0, 2.7, engineGlowMat);
    const propeller = new THREE.Group();
    propeller.position.set(side * 5.2, 3.25, 3.65);
    propeller.add(
      new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.7, 10), goldMat),
    );
    propeller.children[0].rotation.x = Math.PI / 2;
    for (let blade = 0; blade < 4; blade++) {
      const bladeMesh = addBox(0.15, 2.75, 0.07, 0, 0, 0, propellerMat, propeller);
      bladeMesh.rotation.z = (blade / 4) * Math.PI * 2;
      bladeMesh.castShadow = false;
    }
    root.add(propeller);
    propellers.push(propeller);
  }

  // ---- Cabin, cockpit and gull-wing door ---------------------------------
  const cabinSeats: THREE.Object3D[] = [];
  addBox(2.55, 0.08, 9.6, 0, 2.02, 1.3, interiorMat);
  addBox(2.45, 0.025, 9.2, 0, 2.08, 1.2, carpetMat);
  addBox(2.55, 0.08, 9.6, 0, 3.72, 1.3, hullTrimMat);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      addBox(0.06, 0.62, 1.15, side * 1.5, 3.22, -2.2 + i * 1.65, glassMat);
    }
  }
  // Cockpit windshield and frame.
  addBox(2.3, 0.32, 0.9, 0, 2.65, 6.55, frameMat);
  addBox(0.16, 1.3, 0.16, -1.0, 3.35, 7.28, frameMat);
  addBox(0.16, 1.3, 0.16, 1.0, 3.35, 7.28, frameMat);
  addBox(2.2, 0.14, 0.16, 0, 3.98, 7.28, frameMat);
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.95, 1.15, 0.05), glassMat);
  windshield.position.set(0, 3.34, 7.24);
  windshield.rotation.x = -0.2;
  root.add(windshield);
  // Instrument panel and yokes.
  addBox(2.1, 0.2, 0.3, 0, 2.92, 6.35, frameMat);
  for (const side of [-1, 1]) {
    addBox(0.5, 0.12, 0.5, side * 0.55, 2.82, 5.95, frameMat);
    addBox(0.06, 0.5, 0.06, side * 0.55, 3.05, 5.95, frameMat);
    const yoke = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.05, 6, 12), frameMat);
    yoke.position.set(side * 0.55, 3.28, 5.95);
    root.add(yoke);
    addBox(0.65, 0.8, 0.7, side * 0.55, 2.55, 4.35, seatMat);
    addBox(0.65, 0.95, 0.18, side * 0.55, 2.95, 4.02, seatMat);
  }
  // ---- Private lounge: six club chairs around two tables -----------------
  const clubRows = [2.55, 1.15, -0.25];
  for (const rowZ of clubRows) {
    for (const side of [-1, 1]) {
      const seat = addBox(0.56, 0.16, 0.64, side * 0.72, 2.36, rowZ, seatMat);
      addBox(0.13, 0.78, 0.64, side * 1.03, 2.72, rowZ, seatMat);
      addBox(0.5, 0.22, 0.46, side * 0.72, 2.17, rowZ, frameMat);
      addBox(0.08, 0.28, 0.64, side * 0.44, 2.52, rowZ, frameMat);
      cabinSeats.push(seat);
    }
  }
  for (const [tableIndex, tableZ] of [1.85, 0.45].entries()) {
    const tableX = tableIndex === 0 ? 0.55 : -0.55;
    const tableTop = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 0.055, 18),
      goldMat,
    );
    tableTop.position.set(tableX, 2.52, tableZ);
    root.add(tableTop);
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.1, 0.38, 10),
      frameMat,
    );
    pedestal.position.set(tableX, 2.3, tableZ);
    root.add(pedestal);
  }

  // ---- Couch and live cabin TV -------------------------------------------
  addBox(0.64, 0.22, 1.9, 0.9, 2.36, -1.95, seatMat);
  addBox(0.18, 0.9, 1.9, 1.18, 2.82, -1.95, seatMat);
  addBox(0.55, 0.12, 0.55, 0.88, 2.5, -2.55, goldMat);
  addBox(0.55, 0.12, 0.55, 0.88, 2.5, -1.45, goldMat);
  addBox(0.08, 0.92, 1.62, -1.3, 3.06, -1.95, frameMat);
  const cabinTv = new THREE.Mesh(new THREE.PlaneGeometry(1.48, 0.78), cabinTvMat);
  cabinTv.position.set(-1.345, 3.06, -1.95);
  cabinTv.rotation.y = Math.PI / 2;
  root.add(cabinTv);
  addBox(0.12, 0.12, 1.2, -1.16, 2.5, -1.95, frameMat);

  // ---- Rear partition, private bedroom and bathroom ---------------------
  addBox(1.08, 1.58, 0.1, -0.73, 2.9, -2.9, hullTrimMat);
  addBox(0.62, 1.58, 0.1, 0.96, 2.9, -2.9, hullTrimMat);
  addBox(1.35, 0.2, 0.1, 0.05, 3.72, -2.9, hullTrimMat);
  addBox(2.6, 0.08, 3.55, 0, 2.08, -4.7, carpetMat);
  addBox(0.1, 1.58, 3.55, 0.28, 2.9, -4.7, hullTrimMat);
  addBox(0.5, 1.5, 0.08, 0.28, 2.9, -3.05, frameMat);

  // Bedroom: bed, pillows, blanket, nightstand and lamp.
  addBox(1.14, 0.22, 2.0, -0.55, 2.2, -5.0, frameMat);
  addBox(1.08, 0.28, 1.9, -0.55, 2.4, -5.0, bedMat);
  addBox(1.08, 0.1, 1.0, -0.55, 2.57, -5.45, blanketMat);
  addBox(0.45, 0.16, 0.32, -0.85, 2.61, -4.25, whiteMat);
  addBox(0.45, 0.16, 0.32, -0.3, 2.61, -4.25, whiteMat);
  addBox(1.2, 0.75, 0.1, -0.55, 2.85, -6.02, woodMat);
  addBox(0.36, 0.38, 0.36, 0.08, 2.28, -5.1, woodMat);
  const bedLamp = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.16, 0.3, 8),
    bedroomLampMat,
  );
  bedLamp.position.set(0.08, 2.62, -5.1);
  root.add(bedLamp);
  const bathroomLight = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.04, 0.28),
    bathroomLightMat,
  );
  bathroomLight.position.set(0.82, 3.68, -4.55);
  root.add(bathroomLight);
  addBox(1.15, 0.035, 1.6, -0.58, 2.11, -4.9, carpetMat);

  // Bathroom: toilet, sink, mirror and shower screen.
  addBox(0.52, 0.38, 0.62, 0.82, 2.26, -5.55, bathMat);
  addBox(0.54, 0.55, 0.24, 0.82, 2.48, -5.92, bathMat);
  addBox(0.56, 0.08, 0.6, 0.82, 2.47, -5.55, whiteMat);
  addBox(0.78, 0.18, 0.58, 0.83, 2.82, -4.25, bathMat);
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.16, 0.12, 12), whiteMat);
  basin.position.set(0.83, 2.93, -4.25);
  root.add(basin);
  const mirror = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.72), glassMat);
  mirror.position.set(1.26, 3.28, -4.25);
  mirror.rotation.y = -Math.PI / 2;
  root.add(mirror);
  addBox(0.08, 1.9, 0.76, 0.35, 3.05, -4.0, frostedMat);
  addBox(0.06, 0.9, 0.55, 0.82, 2.15, -3.45, bathMat);

  // ---- Galley, cabin lighting and interior doors ------------------------
  addBox(0.72, 0.46, 1.15, -1.02, 2.32, 3.18, woodMat);
  addBox(0.72, 0.06, 1.15, -1.02, 2.57, 3.18, whiteMat);
  addBox(0.62, 0.42, 0.4, -1.02, 2.82, 3.48, frameMat);
  addBox(0.16, 0.32, 0.2, -1.02, 2.9, 3.18, goldMat);
  addBox(0.18, 0.05, 0.28, -1.02, 2.85, 3.18, cabinTvMat);
  addBox(0.3, 0.18, 0.24, -1.02, 2.66, 2.78, bathMat);
  for (const lightZ of [2.2, 0.6, -1.4, -4.0]) {
    addBox(0.6, 0.035, 0.16, 0, 3.69, lightZ, bedroomLampMat);
  }
  const bedroomDoor = new THREE.Group();
  bedroomDoor.position.set(0.28, 2.1, -3.55);
  addBox(0.045, 1.48, 0.82, 0, 0.74, 0.41, woodMat, bedroomDoor);
  addBox(0.06, 0.06, 0.16, 0.05, 0.72, 0.7, goldMat, bedroomDoor);
  root.add(bedroomDoor);
  const bathroomDoor = new THREE.Group();
  bathroomDoor.position.set(0.28, 2.1, -4.62);
  addBox(0.045, 1.48, 0.82, 0, 0.74, 0.41, woodMat, bathroomDoor);
  addBox(0.06, 0.06, 0.16, -0.05, 0.72, 0.7, goldMat, bathroomDoor);
  root.add(bathroomDoor);

  // ---- Xbox console and service plate ------------------------------------
  addBox(0.22, 0.26, 0.62, -1.16, 2.6, -1.95, frameMat);
  addBox(0.03, 0.16, 0.16, -1.28, 2.6, -1.95, xboxMat);
  const servicePlate = new THREE.Group();
  servicePlate.position.set(0.55, 2.56, 1.85);
  const plateDish = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.16, 0.025, 16), whiteMat);
  servicePlate.add(plateDish);
  const curry = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), goldMat);
  curry.scale.set(1, 0.45, 1);
  curry.position.y = 0.05;
  servicePlate.add(curry);
  const drinkGlass = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.045, 0.2, 10),
    glassMat,
  );
  drinkGlass.position.set(0.19, 0.05, -0.02);
  servicePlate.add(drinkGlass);
  servicePlate.visible = false;
  root.add(servicePlate);

  // ---- Maid service -------------------------------------------------------
  const maid = new THREE.Group();
  maid.position.set(0.03, 2.09, 0.55);
  const maidSkirt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.31, 0.68, 10),
    maidDressMat,
  );
  maidSkirt.position.y = 0.34;
  maid.add(maidSkirt);
  const maidTorso = new THREE.Mesh(
    new THREE.CylinderGeometry(0.17, 0.2, 0.44, 10),
    maidApronMat,
  );
  maidTorso.position.y = 0.9;
  maid.add(maidTorso);
  addBox(0.3, 0.55, 0.08, 0, 0.72, 0.2, maidApronMat, maid);
  const maidHead = new THREE.Mesh(new THREE.SphereGeometry(0.145, 12, 10), skinMat);
  maidHead.position.y = 1.3;
  maid.add(maidHead);
  const maidHair = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), hairMat);
  maidHair.position.set(0, 1.35, -0.03);
  maidHair.scale.set(1, 0.8, 1);
  maid.add(maidHair);
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.05, 0.5, 6),
      skinMat,
    );
    arm.position.set(side * 0.22, 0.95, 0.02);
    arm.rotation.z = side * 0.35;
    maid.add(arm);
  }
  const tray = new THREE.Mesh(
    new THREE.CylinderGeometry(0.26, 0.26, 0.035, 14),
    goldMat,
  );
  tray.position.set(0, 1.03, 0.28);
  maid.add(tray);
  for (const side of [-1, 1]) {
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.02, 12), whiteMat);
    plate.position.set(side * 0.1, 1.06, 0.28);
    maid.add(plate);
  }
  root.add(maid);
  // A second attendant works the rear cabin, with a distinct voice profile.
  const maid2 = maid.clone(true);
  maid2.position.set(0.52, 2.09, -1.2);
  maid2.rotation.y = Math.PI;
  maid2.scale.setScalar(0.96);
  root.add(maid2);

  // ---- Undercarriage luggage pod -----------------------------------------
  addBox(1.2, 0.5, 2.5, 0, 0.9, -1.8, frameMat);
  addBox(1.26, 0.08, 2.56, 0, 1.12, -1.8, goldMat);
  addBox(0.95, 0.34, 0.08, 0, 0.85, -0.52, hullTrimMat);
  addBox(0.72, 0.18, 0.2, 0, 0.68, -0.5, goldMat);

  // ---- Deployable boarding stairs ---------------------------------------
  const stairs = new THREE.Group();
  stairs.position.set(-1.5, 2.02, 2.25);
  for (let step = 0; step < 4; step++) {
    addBox(0.7, 0.07, 0.92, -0.3 - step * 0.27, -0.16 - step * 0.28, 0, frameMat, stairs);
    addBox(0.06, 0.4, 0.06, -0.3 - step * 0.27, 0.06 - step * 0.28, -0.4, goldMat, stairs);
  }
  addBox(0.06, 0.06, 1.0, -1.2, -0.98, 0, goldMat, stairs);
  addBox(0.06, 0.8, 0.06, -1.2, -1.35, -0.45, goldMat, stairs);
  addBox(0.06, 0.8, 0.06, -1.2, -1.35, 0.45, goldMat, stairs);
  root.add(stairs);

  // ---- Amphibian landing gear -------------------------------------------
  const landingGear = new THREE.Group();
  for (const side of [-1, 1]) {
    addBox(0.12, 1.05, 0.12, side * 2.2, 1.25, 0.7, frameMat, landingGear);
    const wheel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.28, 0.18, 14),
      propellerMat,
    );
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(side * 2.2, 0.72, 0.7);
    landingGear.add(wheel);
    addBox(0.42, 0.08, 0.1, side * 2.2, 0.95, 0.7, goldMat, landingGear);
  }
  addBox(0.12, 0.95, 0.12, 0, 1.3, 5.6, frameMat, landingGear);
  const noseWheel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.24, 0.16, 14),
    propellerMat,
  );
  noseWheel.rotation.z = Math.PI / 2;
  noseWheel.position.set(0, 0.8, 5.6);
  landingGear.add(noseWheel);
  root.add(landingGear);

  // The port-side gull wing door hinges at the roof and lifts outward/up.
  const door = new THREE.Group();
  door.position.set(-1.48, 3.58, 2.25);
  addBox(0.1, 1.9, 1.15, 0, -0.98, 0, hullMat, door);
  addBox(0.06, 0.72, 0.78, 0.05, -0.45, 0, glassMat, door);
  addBox(0.1, 0.12, 1.15, 0, -1.9, 0, goldMat, door);
  root.add(door);

  // ---- Livery and lights --------------------------------------------------
  for (const side of [-1, 1]) {
    const board = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 1.8), nameMat);
    board.position.set(side * 1.53, 2.75, -1.5);
    board.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
    root.add(board);
  }
  for (const side of [-1, 1]) {
    const light = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 8, 6),
      side < 0 ? navRedMat : navGreenMat,
    );
    light.position.set(side * 11.6, 3.62, 1.0);
    root.add(light);
  }
  const tailLight = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), navGreenMat);
  tailLight.position.set(0, 3.1, -8.5);
  root.add(tailLight);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), beaconMat);
  beacon.position.set(0, 5.15, -7.4);
  root.add(beacon);

  // Warm cabin spill so the cockpit reads at night.
  const cabinGlow = new THREE.PointLight(0xffd6a0, 7, 12, 2);
  cabinGlow.position.set(0, 3.2, 1.8);
  root.add(cabinGlow);

  return {
    root,
    door,
    propellers,
    engineGlowMat,
    beaconMat,
    cabinSeats,
    maid,
    maids: [maid, maid2],
    stairs,
    bedroomDoor,
    bathroomDoor,
    servicePlate,
    landingGear,
    cabinTvMat,
    bedroomLampMat,
    bathroomLightMat,
  };
}
