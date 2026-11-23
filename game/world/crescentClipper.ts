import * as THREE from 'three';
import { markAlwaysVisibleWorldObject } from './worldCullPolicy';

export interface CrescentClipperHandles {
  root: THREE.Group;
  door: THREE.Group;
  propellers: THREE.Object3D[];
  engineGlowMat: THREE.MeshStandardMaterial;
  beaconMat: THREE.MeshStandardMaterial;
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
  addBox(2.55, 0.08, 9.6, 0, 2.02, 1.3, interiorMat);
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
  // Rear cabin seats.
  for (const side of [-1, 1]) {
    addBox(0.7, 0.7, 0.75, side * 0.62, 2.45, 0.6, seatMat);
    addBox(0.7, 0.9, 0.16, side * 0.62, 2.85, 0.24, seatMat);
    addBox(0.7, 0.7, 0.75, side * 0.62, 2.45, -1.6, seatMat);
    addBox(0.7, 0.9, 0.16, side * 0.62, 2.85, -1.96, seatMat);
  }

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
  };
}
