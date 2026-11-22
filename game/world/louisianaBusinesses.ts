import * as THREE from 'three';
import {
  MAINLAND_BUSINESSES,
  getMainlandBusinessServicePoints,
  type MainlandBusiness,
  type MainlandBusinessKind,
} from '../systems/louisianaBusinesses';
import { LOUISIANA_CITY_GROUND_Y } from './louisianaLandmass';

export interface LouisianaBusinessHandles {
  group: THREE.Group;
  colliders: { x: number; z: number; radius: number }[];
}

function seededRand(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function createSignTexture(name: string, subtitle: string, accent: string): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#101316';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, 18, canvas.height);
  ctx.font = '900 58px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#f8fafc';
  const title = name.length > 30 ? `${name.slice(0, 29)}…` : name;
  ctx.fillText(title.toUpperCase(), 42, 86);
  ctx.font = '600 30px sans-serif';
  ctx.fillStyle = accent;
  ctx.fillText(subtitle.toUpperCase(), 42, 140);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function addPerson(
  group: THREE.Group,
  x: number,
  z: number,
  uniform: number,
  skin: number,
  yaw = 0,
) {
  const uniformMat = new THREE.MeshStandardMaterial({ color: uniform, roughness: 0.88 });
  const skinMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.92 });
  const root = new THREE.Group();
  root.position.set(x, LOUISIANA_CITY_GROUND_Y + 0.1, z);
  root.rotation.y = yaw;
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.9, 0.34), uniformMat);
  torso.position.y = 1.25;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 8), skinMat);
  head.position.y = 1.9;
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.8, 0.24), uniformMat);
  legL.position.set(-0.16, 0.45, 0);
  const legR = legL.clone();
  legR.position.x = 0.16;
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.72, 0.2), skinMat);
  armL.position.set(-0.38, 1.26, 0);
  const armR = armL.clone();
  armR.position.x = 0.38;
  root.add(torso, head, legL, legR, armL, armR);
  group.add(root);
  return root;
}

/**
 * Builds every enterable Crescent City business. Interiors are open to the
 * street through a real doorway; walls use invisible circular colliders while
 * the interior floor is registered with the engine's structural surface pass.
 */
export function buildLouisianaBusinesses(): LouisianaBusinessHandles {
  const group = new THREE.Group();
  group.name = 'crescent-city-businesses';
  const colliders: { x: number; z: number; radius: number }[] = [];
  const rand = seededRand(20481);

  const wallMats: Record<MainlandBusinessKind, THREE.MeshStandardMaterial> = {
    restaurant: new THREE.MeshStandardMaterial({ color: 0x7c3f2c, roughness: 0.85 }),
    store: new THREE.MeshStandardMaterial({ color: 0x3f6b58, roughness: 0.86 }),
    hotel: new THREE.MeshStandardMaterial({ color: 0xd8c1a0, roughness: 0.82 }),
    police: new THREE.MeshStandardMaterial({ color: 0x9aa7b4, roughness: 0.82 }),
    gas: new THREE.MeshStandardMaterial({ color: 0xd6d3c7, roughness: 0.84 }),
    bar: new THREE.MeshStandardMaterial({ color: 0x503a4f, roughness: 0.86 }),
    bank: new THREE.MeshStandardMaterial({ color: 0xb7ad93, roughness: 0.78 }),
    music: new THREE.MeshStandardMaterial({ color: 0x642d51, roughness: 0.84 }),
    cafe: new THREE.MeshStandardMaterial({ color: 0xb96a3d, roughness: 0.84 }),
    outfitter: new THREE.MeshStandardMaterial({ color: 0x5f6540, roughness: 0.86 }),
    auto_parts: new THREE.MeshStandardMaterial({ color: 0x3d5865, roughness: 0.84 }),
    terminal: new THREE.MeshStandardMaterial({ color: 0x52616e, roughness: 0.8 }),
  };
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x353b3f, roughness: 0.9 });
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x5f5a50, roughness: 0.92 });
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0x8c8b83, roughness: 0.92 });
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x5a6268,
    roughness: 0.4,
    metalness: 0.65,
  });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x6e4b2e, roughness: 0.9 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x9bd7e8,
    transparent: true,
    opacity: 0.42,
    roughness: 0.15,
    metalness: 0.2,
  });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1d2327, roughness: 0.8 });
  const neonMats = new Map<string, THREE.MeshStandardMaterial>();

  const neonMat = (hex: string) => {
    let mat = neonMats.get(hex);
    if (!mat) {
      mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(hex),
        emissive: new THREE.Color(hex),
        emissiveIntensity: 1.15,
        roughness: 0.32,
      });
      neonMats.set(hex, mat);
    }
    return mat;
  };

  const box = (
    mat: THREE.Material,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    rotY = 0,
    parent: THREE.Object3D = group,
  ) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotY;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  const addWallCollider = (x: number, z: number) => {
    colliders.push({ x, z, radius: 0.65 });
  };

  const addWallRun = (
    x0: number,
    z0: number,
    x1: number,
    z1: number,
    step = 2.0,
  ) => {
    const length = Math.hypot(x1 - x0, z1 - z0);
    const count = Math.max(1, Math.ceil(length / step));
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      addWallCollider(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t);
    }
  };

  const buildShell = (business: MainlandBusiness) => {
    const y = LOUISIANA_CITY_GROUND_Y;
    const frontZ = business.z + business.d * 0.5;
    const backZ = business.z - business.d * 0.5;
    const leftX = business.x - business.w * 0.5;
    const rightX = business.x + business.w * 0.5;
    const height = business.kind === 'hotel' ? 6.4 : business.kind === 'music' ? 5.8 : 4.8;
    const wallMat = wallMats[business.kind];
    const doorHalf = business.kind === 'gas' ? 3.8 : 2.2;

    box(floorMat, business.w, 0.1, business.d, business.x, y + 0.05, business.z);
    const leftWallWidth = business.x - doorHalf - leftX;
    const rightWallWidth = rightX - (business.x + doorHalf);
    box(
      wallMat,
      leftWallWidth,
      height,
      0.34,
      leftX + leftWallWidth * 0.5,
      y + height * 0.5,
      frontZ,
    );
    box(
      wallMat,
      rightWallWidth,
      height,
      0.34,
      business.x + doorHalf + rightWallWidth * 0.5,
      y + height * 0.5,
      frontZ,
    );
    box(wallMat, business.w, height, 0.34, business.x, y + height * 0.5, backZ);
    box(wallMat, 0.34, height, business.d, leftX, y + height * 0.5, business.z);
    box(wallMat, 0.34, height, business.d, rightX, y + height * 0.5, business.z);
    box(roofMat, business.w + 1.0, 0.34, business.d + 1.0, business.x, y + height + 0.13, business.z);
    box(concreteMat, business.w + 2.4, 0.12, 3.0, business.x, y + 0.06, frontZ + 1.4);
    box(neonMat(business.accent), business.w * 0.45, 0.16, 0.18, business.x, y + height - 0.4, frontZ + 0.2);
    box(neonMat(business.accent), 0.16, height - 0.2, 0.18, business.x - doorHalf - 0.2, y + height * 0.5, frontZ + 0.2);
    box(neonMat(business.accent), 0.16, height - 0.2, 0.18, business.x + doorHalf + 0.2, y + height * 0.5, frontZ + 0.2);
    // Door lintel + threshold.
    box(wallMat, doorHalf * 2, 1.0, 0.4, business.x, y + height - 0.5, frontZ);
    box(woodMat, doorHalf * 2, 0.08, 1.8, business.x, y + 0.18, frontZ + 0.7);

    // Front windows, split around the doorway.
    const windowW = Math.max(2.2, (business.w - doorHalf * 2) * 0.32);
    box(glassMat, windowW, 1.6, 0.07, leftX + windowW * 0.6, y + 2.2, frontZ + 0.2);
    box(glassMat, windowW, 1.6, 0.07, rightX - windowW * 0.6, y + 2.2, frontZ + 0.2);

    addWallRun(leftX, backZ, leftX, frontZ);
    addWallRun(rightX, backZ, rightX, frontZ);
    addWallRun(leftX, backZ, rightX, backZ);
    addWallRun(leftX, frontZ, business.x - doorHalf, frontZ);
    addWallRun(business.x + doorHalf, frontZ, rightX, frontZ);

    // Business sign over the entrance.
    const tex = createSignTexture(business.name, business.subtitle, business.accent);
    const signMat = tex
      ? new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, toneMapped: false })
      : neonMat(business.accent);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(business.w * 0.78, 13), 2.2), signMat);
    sign.position.set(business.x, y + height + 0.75, frontZ + 0.45);
    group.add(sign);

    box(
      neonMat('#fff3d6'),
      business.w * 0.48,
      0.08,
      0.22,
      business.x,
      y + height - 0.32,
      business.z,
    );
    return { y, frontZ, backZ, leftX, rightX, height };
  };

  for (let bIndex = 0; bIndex < MAINLAND_BUSINESSES.length; bIndex++) {
    const business = MAINLAND_BUSINESSES[bIndex];
    const shell = buildShell(business);
    const { y, frontZ, backZ, leftX, rightX, height } = shell;
    const counterZ = frontZ - 2.0;
    const servicePoint = getMainlandBusinessServicePoints(business)[0];
    const accentMat = neonMat(business.accent);
    const uniform = new THREE.Color(business.accent).multiplyScalar(0.68).getHex();

    // Every business has a staffed counter or desk.
    if (business.kind !== 'gas') {
      box(woodMat, Math.min(business.w * 0.55, 9), 1.05, 1.0, business.x, y + 0.62, counterZ);
      box(accentMat, Math.min(business.w * 0.55, 9), 0.1, 0.12, business.x, y + 1.18, counterZ + 0.52);
    }
    addPerson(group, servicePoint.x, servicePoint.z - 0.55, uniform, 0xc68e62, 0);

    if (business.kind === 'restaurant' || business.kind === 'cafe' || business.kind === 'bar') {
      const tables = business.kind === 'bar' ? 3 : 4;
      for (let i = 0; i < tables; i++) {
        const tx = leftX + 3.4 + (i % 2) * (business.w - 7.4);
        const tz = business.z - business.d * 0.15 + Math.floor(i / 2) * 5.0;
        box(woodMat, 2.0, 0.12, 2.0, tx, y + 0.85, tz);
        box(steelMat, 0.18, 0.8, 0.18, tx, y + 0.42, tz);
        for (let side = -1; side <= 1; side += 2) {
          box(darkMat, 0.62, 1.05, 0.62, tx + side * 1.25, y + 0.58, tz);
        }
      }
      if (business.kind === 'bar') {
        box(darkMat, business.w * 0.58, 1.08, 2.2, business.x, y + 0.62, business.z - business.d * 0.3);
        box(accentMat, business.w * 0.58, 0.12, 0.14, business.x, y + 1.2, business.z - business.d * 0.3 + 1.05);
      }
      if (business.kind === 'restaurant') {
        box(steelMat, 4.2, 1.4, 2.4, leftX + 4.2, y + 0.8, business.z - business.d * 0.35);
        box(darkMat, 1.0, 0.3, 0.6, leftX + 4.2, y + 1.6, business.z - business.d * 0.35);
      }
    }

    if (business.kind === 'store' || business.kind === 'outfitter' || business.kind === 'auto_parts') {
      const rows = business.kind === 'auto_parts' ? 3 : 4;
      for (let r = 0; r < rows; r++) {
        const rx = leftX + 4.0 + r * 3.1;
        box(steelMat, 0.3, 2.1, business.d * 0.48, rx, y + 1.15, business.z - business.d * 0.12);
        for (let shelf = 0; shelf < 3; shelf++) {
          box(r % 2 === 0 ? woodMat : accentMat, 1.5, 0.16, business.d * 0.4, rx, y + 0.55 + shelf * 0.58, business.z - business.d * 0.12);
        }
      }
      if (business.kind === 'auto_parts') {
        for (let i = 0; i < 4; i++) {
          const tire = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.2, 8, 12), darkMat);
          tire.rotation.x = Math.PI / 2;
          tire.position.set(rightX - 2.0, y + 0.62, business.z - 3.5 + i * 1.3);
          group.add(tire);
        }
        box(steelMat, 4.4, 0.25, 1.8, business.x, y + 0.15, business.z + 1.5);
      }
    }

    if (business.kind === 'hotel') {
      box(woodMat, 5.2, 1.1, 1.0, business.x, y + 0.65, counterZ);
      box(accentMat, 5.2, 0.1, 0.12, business.x, y + 1.25, counterZ + 0.52);
      for (let room = 0; room < 3; room++) {
        const rx = leftX + 4.2 + room * ((business.w - 8.4) / 2);
        const rz = business.z - business.d * 0.24;
        box(wallMats.hotel, 0.18, 3.2, business.d * 0.38, rx - 2.8, y + 1.6, rz);
        box(woodMat, 4.8, 0.18, 1.9, rx, y + 0.45, rz + 2.0);
        box(darkMat, 4.2, 0.5, 1.7, rx, y + 0.53, rz + 2.0);
        box(woodMat, 1.1, 0.5, 1.2, rx + 1.8, y + 0.32, rz + 2.1);
        box(neonMat('#fef3c7'), 0.12, 0.6, 0.12, rx - 2.6, y + 1.8, rz - 1.2);
      }
      for (let i = 0; i < 2; i++) {
        box(darkMat, 2.6, 0.7, 1.1, leftX + 4.0 + i * 3.2, y + 0.5, frontZ - 3.9);
      }
    }

    if (business.kind === 'police') {
      for (let i = 0; i < 3; i++) {
        box(steelMat, 0.14, 2.8, 0.14, leftX + 4.0 + i * 2.2, y + 1.4, business.z - business.d * 0.18);
      }
      box(steelMat, 6.6, 0.16, 0.16, leftX + 6.2, y + 2.8, business.z - business.d * 0.18);
      for (let i = 0; i < 2; i++) {
        box(darkMat, 3.2, 0.6, 0.9, business.x + 2.0 + i * 3.8, y + 0.5, frontZ - 4.2);
      }
      box(concreteMat, 4.2, 0.16, 2.2, business.x, y + 0.12, business.z);
    }

    if (business.kind === 'gas') {
      box(concreteMat, business.w + 10, 0.22, 17, business.x, y + 0.11, business.z + 3.0);
      for (let i = 0; i < 2; i++) {
        const px = business.x - 5 + i * 10;
        const pz = business.z + 4.2;
        box(steelMat, 1.0, 2.2, 0.8, px, y + 1.1, pz);
        box(darkMat, 0.7, 0.5, 0.2, px, y + 1.75, pz + 0.42);
        box(accentMat, 0.4, 0.25, 0.08, px + 0.2, y + 0.8, pz + 0.44);
      }
      box(concreteMat, business.w + 10, 0.3, 10, business.x, y + 4.9, business.z + 2.4);
      for (let i = 0; i < 4; i++) {
        const px = business.x - 11 + i * 7.3;
        box(steelMat, 0.26, 4.8, 0.26, px, y + 2.4, business.z + 3.3);
      }
      box(accentMat, 5.0, 2.0, 0.3, business.x, y + 6.2, business.z + 3.4);
      // Small service shop behind the pumps.
      box(woodMat, 3.0, 2.2, 2.0, business.x, y + 1.1, business.z - 1.0);
    }

    if (business.kind === 'bank') {
      box(concreteMat, 2.0, 1.2, 0.5, leftX + 4.0, y + 0.6, counterZ);
      for (let i = 0; i < 3; i++) {
        box(steelMat, 0.22, 3.2, 0.22, leftX + 3.4 + i * 3.8, y + 1.6, business.z + 0.5);
      }
      box(steelMat, 10.6, 0.22, 0.22, business.x - 1.2, y + 3.2, business.z + 0.5);
      box(darkMat, 4.2, 3.4, 0.4, rightX - 3.2, y + 1.7, backZ + 0.3);
      box(accentMat, 5.0, 0.18, 0.5, rightX - 3.2, y + 3.4, backZ + 0.3);
    }

    if (business.kind === 'music') {
      box(darkMat, business.w * 0.64, 0.55, 4.0, business.x, y + 0.3, business.z - business.d * 0.26);
      box(accentMat, business.w * 0.64, 0.14, 0.18, business.x, y + 0.68, business.z - business.d * 0.26 + 2.0);
      for (let i = 0; i < 8; i++) {
        box(woodMat, 1.8, 0.5, 1.4, leftX + 3.5 + (i % 4) * 4.1, y + 0.35, frontZ - 4.0 - Math.floor(i / 4) * 2.6);
      }
    }

    if (business.kind === 'terminal') {
      box(steelMat, 8.4, 2.8, 0.28, business.x, y + 1.6, backZ + 0.3);
      box(neonMat('#38bdf8'), 7.0, 0.18, 0.35, business.x, y + 2.3, backZ + 0.48);
      for (let i = 0; i < 3; i++) {
        box(woodMat, 3.2, 0.55, 1.0, leftX + 4.0 + i * 3.6, y + 0.45, frontZ - 3.4);
      }
    }

    // A couple of ambient customers make each interior feel occupied.
    const ambientCount = business.kind === 'hotel' || business.kind === 'music' ? 3 : 2;
    for (let i = 0; i < ambientCount; i++) {
      const ax = leftX + 4.0 + rand() * (business.w - 8.0);
      const az = business.z - 1.0 - rand() * (business.d - 5.2);
      if (Math.abs(ax - servicePoint.x) < 2.0 && Math.abs(az - servicePoint.z) < 2.0) continue;
      addPerson(group, ax, az, i % 2 === 0 ? 0x34495e : 0x7a5230, i % 2 === 0 ? 0xb9825d : 0x8b5a3c, rand() * Math.PI * 2);
    }

    // Keep the interior lighting subtle at night but never an always-on spotlight.
    box(neonMat(business.accent), 0.7, 0.14, 0.35, business.x, y + height - 0.5, frontZ + 0.35);
  }

  group.traverse((object) => {
    object.updateMatrix();
    object.matrixAutoUpdate = false;
  });
  return { group, colliders };
}
