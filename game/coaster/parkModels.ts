import * as THREE from 'three';
import {
  getParkBounds,
  getParkCatalogEntry,
  getParkTheme,
  type ParkElement,
  type ParkElementKind,
  type ParkLayout,
} from './park';

/**
 * Shared low-poly PBR park renderer. Used by the standalone studio and by the
 * Survival Island delivery runtime, so imported designs look identical.
 */

export interface ParkAnimation {
  object: THREE.Object3D;
  kind: 'spin_y' | 'spin_z' | 'bob' | 'visitor' | 'carriage';
  speed: number;
  phase: number;
  radiusX?: number;
  radiusZ?: number;
  baseY?: number;
  centerX?: number;
  centerZ?: number;
}

export interface ParkModelHandles {
  group: THREE.Group;
  animations: ParkAnimation[];
  visitors: THREE.Object3D[];
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  dispose(): void;
}

export interface BuildParkOptions {
  groundAt?: (x: number, z: number) => number;
  origin?: { x: number; z: number };
  originY?: number;
  yaw?: number;
  includeVisitors?: boolean;
  castShadows?: boolean;
}

interface Palette {
  grass: string;
  path: string;
  wood: string;
  metal: string;
  dark: string;
  accent: string;
}

function material(
  color: string | number,
  roughness = 0.82,
  metalness = 0.02,
  extra: Partial<THREE.MeshStandardMaterialParameters> = {},
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness,
    metalness,
    ...extra,
  });
}

function signTexture(text: string, accent: string, background = '#151a1d'): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, canvas.width, 18);
  ctx.fillRect(0, canvas.height - 18, canvas.width, 18);
  ctx.font = '900 88px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff8e8';
  ctx.fillText(text.toUpperCase().slice(0, 34), canvas.width / 2, canvas.height / 2 + 4);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function buildParkModel(
  park: ParkLayout,
  options: BuildParkOptions = {},
): ParkModelHandles {
  const group = new THREE.Group();
  group.name = `amusement-park-${park.name}`;
  const animations: ParkAnimation[] = [];
  const visitors: THREE.Object3D[] = [];
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const theme = getParkTheme(park.theme);
  const palette: Palette = {
    grass: theme.grass,
    path: theme.path,
    wood: park.theme === 'boardwalk' ? '#8a6240' : '#775638',
    metal: '#66727b',
    dark: '#222a2f',
    accent: PARK_ACCENTS[Math.abs(hash(park.name)) % PARK_ACCENTS.length],
  };
  const groundAt = options.groundAt ?? (() => 0);
  const origin = options.origin ?? { x: 0, z: 0 };
  const originY = options.originY ?? 0;
  const yaw = options.yaw ?? 0;
  const castShadows = options.castShadows !== false;
  group.rotation.y = yaw;

  const matCache = new Map<string, THREE.MeshStandardMaterial>();
  const mat = (color: string, rough = 0.82, metal = 0.02): THREE.MeshStandardMaterial => {
    const key = `${color}|${rough}|${metal}`;
    let cached = matCache.get(key);
    if (!cached) {
      cached = material(color, rough, metal);
      matCache.set(key, cached);
      materials.add(cached);
    }
    return cached;
  };
  const emissive = (color: string, intensity = 1.2): THREE.MeshStandardMaterial => {
    const key = `e|${color}|${intensity}`;
    let cached = matCache.get(key);
    if (!cached) {
      cached = material(color, 0.32, 0.1, {
        emissive: new THREE.Color(color),
        emissiveIntensity: intensity,
      });
      matCache.set(key, cached);
      materials.add(cached);
    }
    return cached;
  };
  const waterMat = material(0x2f7f91, 0.16, 0.2, {
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
  });
  materials.add(waterMat);
  const glassMat = material(0x9fd6e4, 0.13, 0.25, {
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  materials.add(glassMat);
  const stripeMat = mat(palette.accent, 0.62, 0.08);
  const whiteMat = mat('#f0e6d2', 0.72);
  const foliageMat = mat('#4d7444', 0.9);
  const foliageLightMat = mat('#6b8f4f', 0.9);
  const barkMat = mat('#5c432d', 0.95);
  const rockMat = mat('#5c5a52', 0.97);

  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  geometries.add(boxGeo);
  const planeGeo = new THREE.PlaneGeometry(1, 1);
  geometries.add(planeGeo);

  const addBox = (
    parent: THREE.Object3D,
    baseY: number,
    colorOrMat: string | THREE.Material,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    rotY = 0,
  ): THREE.Mesh => {
    const mesh = new THREE.Mesh(boxGeo, typeof colorOrMat === 'string' ? mat(colorOrMat) : colorOrMat);
    mesh.scale.set(w, h, d);
    mesh.position.set(x, baseY + y, z);
    mesh.rotation.y = rotY;
    mesh.castShadow = castShadows;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  const addCylinder = (
    parent: THREE.Object3D,
    baseY: number,
    colorOrMat: string | THREE.Material,
    radiusTop: number,
    radiusBottom: number,
    height: number,
    x: number,
    y: number,
    z: number,
    segments = 14,
  ): THREE.Mesh => {
    const geo = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments);
    geometries.add(geo);
    const mesh = new THREE.Mesh(geo, typeof colorOrMat === 'string' ? mat(colorOrMat) : colorOrMat);
    mesh.position.set(x, baseY + y, z);
    mesh.castShadow = castShadows;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  const addWater = (
    parent: THREE.Object3D,
    baseY: number,
    w: number,
    d: number,
    x: number,
    y: number,
    z: number,
  ): THREE.Mesh => {
    const mesh = new THREE.Mesh(planeGeo, waterMat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.scale.set(w, d, 1);
    mesh.position.set(x, baseY + y, z);
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  const addPerson = (
    parent: THREE.Object3D,
    baseY: number,
    x: number,
    z: number,
    yawOffset: number,
    shirt: string,
    skin: string,
  ): THREE.Group => {
    const person = new THREE.Group();
    person.position.set(x, baseY, z);
    person.rotation.y = yawOffset;
    addBox(person, 0, shirt, 0.52, 0.8, 0.3, 0, 1.18, 0);
    const headGeo = new THREE.SphereGeometry(0.22, 8, 6);
    geometries.add(headGeo);
    const head = new THREE.Mesh(headGeo, mat(skin, 0.9));
    head.position.set(0, 1.82, 0);
    head.castShadow = castShadows;
    person.add(head);
    addBox(person, 0, '#2d3540', 0.18, 0.72, 0.2, -0.14, 0.38, 0);
    addBox(person, 0, '#2d3540', 0.18, 0.72, 0.2, 0.14, 0.38, 0);
    addBox(person, 0, shirt, 0.14, 0.62, 0.18, -0.35, 1.16, 0);
    addBox(person, 0, shirt, 0.14, 0.62, 0.18, 0.35, 1.16, 0);
    parent.add(person);
    return person;
  };

  const buildPath = (element: ParkElement, baseY: number, root: THREE.Object3D) => {
    const w = 4 * element.scale;
    const d = 4 * element.scale;
    addBox(root, baseY, palette.path, w, 0.12, d, element.x, 0.06, element.z, THREE.MathUtils.degToRad(element.rotation));
    addBox(
      root,
      baseY,
      '#8c806c',
      w - 0.28,
      0.02,
      d - 0.28,
      element.x,
      0.13,
      element.z,
      THREE.MathUtils.degToRad(element.rotation),
    );
  };

  const buildQueue = (element: ParkElement, baseY: number, root: THREE.Object3D) => {
    const rot = THREE.MathUtils.degToRad(element.rotation);
    addBox(root, baseY, '#9b9184', 3.2 * element.scale, 0.1, 6.4 * element.scale, element.x, 0.05, element.z, rot);
    for (let i = 0; i < 3; i++) {
      const offset = -2.2 + i * 2.2;
      addBox(root, baseY, palette.metal, 0.09, 1.0, 0.09, element.x + offset, 0.55, element.z - 2.8, rot);
      addBox(root, baseY, palette.metal, 0.09, 1.0, 0.09, element.x + offset, 0.55, element.z + 2.8, rot);
      addBox(root, baseY, '#c9b37d', 3.0, 0.05, 0.05, element.x, 0.95, element.z + offset, rot);
    }
  };

  const buildGate = (element: ParkElement, baseY: number, root: THREE.Object3D) => {
    const rot = THREE.MathUtils.degToRad(element.rotation);
    const gate = new THREE.Group();
    gate.position.set(element.x, baseY, element.z);
    gate.rotation.y = rot;
    root.add(gate);
    const w = 14 * element.scale;
    addBox(gate, 0, palette.wood, 1.1, 6.2, 1.5, -w * 0.5, 3.1, 0);
    addBox(gate, 0, palette.wood, 1.1, 6.2, 1.5, w * 0.5, 3.1, 0);
    addBox(gate, 0, palette.accent, w + 1.4, 1.4, 1.7, 0, 6.1, 0);
    addBox(gate, 0, '#101619', w + 2.0, 0.28, 2.0, 0, 6.9, 0);
    const texture = signTexture(park.name, palette.accent);
    if (texture) {
      textures.add(texture);
      const signMat = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
      materials.add(signMat);
      const sign = new THREE.Mesh(planeGeo, signMat);
      sign.scale.set(w * 0.95, 1.25, 1);
      sign.position.set(0, 5.45, 0.86);
      gate.add(sign);
    }
    for (let side = -1; side <= 1; side += 2) {
      addBox(gate, 0, '#e8d9b7', 2.2, 2.5, 2.2, side * (w * 0.5 + 1.7), 1.25, 0.4);
      addBox(gate, 0, palette.accent, 2.4, 0.22, 2.4, side * (w * 0.5 + 1.7), 2.6, 0.4);
      addBox(gate, 0, glassMat, 1.5, 1.1, 0.08, side * (w * 0.5 + 1.7), 1.55, 1.52);
      addBox(gate, 0, '#f7e2a7', 0.26, 2.4, 0.26, side * (w * 0.5 - 0.7), 4.4, 1.0);
      addBox(gate, 0, emissive('#ffd98a'), 0.42, 0.42, 0.42, side * (w * 0.5 - 0.7), 5.7, 1.0);
    }
    animations.push({ object: gate, kind: 'bob', speed: 0, phase: 0 });
  };

  const buildCarousel = (element: ParkElement, baseY: number, root: THREE.Object3D) => {
    const platform = new THREE.Group();
    platform.position.set(element.x, baseY, element.z);
    platform.rotation.y = THREE.MathUtils.degToRad(element.rotation);
    root.add(platform);
    addCylinder(platform, 0, '#7d6650', 7.2 * element.scale, 7.5 * element.scale, 0.45, 0, 0.22, 0, 24);
    const spinner = new THREE.Group();
    spinner.position.y = 0.46;
    platform.add(spinner);
    addCylinder(spinner, 0, '#d9b25f', 0.5, 0.7, 6.6, 0, 3.3, 0, 12);
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      addBox(
        spinner,
        0,
        palette.accent,
        3.4,
        0.3,
        0.24,
        Math.cos(angle) * 3.4,
        6.4,
        Math.sin(angle) * 3.4,
        -angle,
      );
      addCylinder(spinner, 0, '#f0dfbb', 0.12, 0.16, 3.0, Math.cos(angle) * 4.5, 1.7, Math.sin(angle) * 4.5, 6);
      for (let j = 0; j < 2; j++) {
        const horseAngle = angle + j * Math.PI;
        const hx = Math.cos(horseAngle) * 4.5;
        const hz = Math.sin(horseAngle) * 4.5;
        addBox(spinner, 0, j === 0 ? '#e8d8bb' : '#b1744c', 0.42, 0.7, 1.25, hx, 1.5, hz, -horseAngle);
        addBox(spinner, 0, '#2c2520', 0.2, 0.3, 0.24, hx, 1.92, hz - 0.55, -horseAngle);
        addBox(spinner, 0, '#7a532f', 0.1, 0.85, 0.1, hx + 0.1, 2.2, hz + 0.3, -horseAngle);
      }
    }
    const canopy = new THREE.Mesh(new THREE.ConeGeometry(8 * element.scale, 2.8, 16, 1, true), stripeMat);
    geometries.add(canopy.geometry);
    canopy.position.y = 7.0;
    canopy.castShadow = castShadows;
    spinner.add(canopy);
    addCylinder(spinner, 0, emissive('#ffd57a'), 0.18, 0.18, 0.18, 0, 6.9, 0, 8);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      addBox(spinner, 0, emissive('#ffe4a3'), 0.22, 0.22, 0.22, Math.cos(a) * 7.7, 6.8, Math.sin(a) * 7.7);
    }
    animations.push({ object: spinner, kind: 'spin_y', speed: 0.42, phase: 0 });
  };

  const buildFerrisWheel = (element: ParkElement, baseY: number, root: THREE.Object3D) => {
    const wheelRoot = new THREE.Group();
    wheelRoot.position.set(element.x, baseY, element.z);
    wheelRoot.rotation.y = THREE.MathUtils.degToRad(element.rotation);
    root.add(wheelRoot);
    const radius = 15.5 * element.scale;
    const hubY = radius + 1.8;
    addBox(wheelRoot, 0, palette.metal, 0.55, hubY, 0.55, -4.4, hubY * 0.5, 0);
    addBox(wheelRoot, 0, palette.metal, 0.55, hubY, 0.55, 4.4, hubY * 0.5, 0);
    addBox(wheelRoot, 0, palette.metal, 9.4, 0.4, 0.4, 0, hubY * 0.55, 0);
    addCylinder(wheelRoot, 0, '#8d969d', 0.65, 0.65, 2.0, 0, hubY, 0, 10);
    const wheel = new THREE.Group();
    wheel.position.y = hubY;
    wheelRoot.add(wheel);
    const rimGeo = new THREE.TorusGeometry(radius, 0.3, 8, 40);
    geometries.add(rimGeo);
    const rim = new THREE.Mesh(rimGeo, mat(palette.accent, 0.45, 0.35));
    rim.castShadow = castShadows;
    wheel.add(rim);
    const rimInner = new THREE.Mesh(rimGeo, mat('#e7e0d2', 0.5, 0.3));
    rimInner.scale.setScalar(0.93);
    wheel.add(rimInner);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const spoke = new THREE.Mesh(boxGeo, mat('#d6d1c7', 0.55, 0.25));
      spoke.scale.set(radius * 0.92, 0.12, 0.12);
      spoke.position.set(Math.cos(a) * radius * 0.47, Math.sin(a) * radius * 0.47, 0);
      spoke.rotation.z = a;
      wheel.add(spoke);
      const gondola = new THREE.Group();
      gondola.position.set(Math.cos(a) * radius, Math.sin(a) * radius, 0);
      addBox(gondola, 0, i % 3 === 0 ? '#e8b55b' : i % 3 === 1 ? '#d3687a' : '#6e9fc2', 1.5, 1.35, 1.5, 0, 0, 0);
      addBox(gondola, 0, '#3d4449', 1.9, 0.16, 1.9, 0, 0.75, 0);
      wheel.add(gondola);
    }
    animations.push({ object: wheel, kind: 'spin_z', speed: 0.055, phase: 0 });
  };

  const buildSwingTower = (element: ParkElement, baseY: number, root: THREE.Object3D) => {
    const towerRoot = new THREE.Group();
    towerRoot.position.set(element.x, baseY, element.z);
    towerRoot.rotation.y = THREE.MathUtils.degToRad(element.rotation);
    root.add(towerRoot);
    addCylinder(towerRoot, 0, '#d8d2c4', 1.6, 2.4, 1.0, 0, 0.5, 0, 12);
    addCylinder(towerRoot, 0, palette.metal, 0.45, 0.6, 24, 0, 12, 0, 8);
    addCylinder(towerRoot, 0, palette.accent, 2.2, 2.2, 0.7, 0, 25, 0, 14);
    const rotor = new THREE.Group();
    rotor.position.y = 25.2;
    towerRoot.add(rotor);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const chain = new THREE.Mesh(boxGeo, mat('#b8b2a5', 0.6, 0.3));
      chain.scale.set(0.05, 8.0, 0.05);
      chain.position.set(Math.cos(a) * 6.5, -4.2, Math.sin(a) * 6.5);
      rotor.add(chain);
      const chair = new THREE.Group();
      chair.position.set(Math.cos(a) * 7.0, -8.5, Math.sin(a) * 7.0);
      addBox(chair, 0, palette.accent, 1.4, 0.32, 1.0, 0, 0, 0);
      addBox(chair, 0, '#3a3f44', 1.35, 0.75, 0.18, 0, 0.45, -0.4);
      addBox(chair, 0, '#3a3f44', 0.18, 0.7, 0.9, -0.62, 0.35, 0);
      addBox(chair, 0, '#3a3f44', 0.18, 0.7, 0.9, 0.62, 0.35, 0);
      rotor.add(chair);
    }
    animations.push({ object: rotor, kind: 'spin_y', speed: 0.75, phase: 0 });
  };

  const buildTeacups = (element: ParkElement, baseY: number, root: THREE.Object3D) => {
    const cupsRoot = new THREE.Group();
    cupsRoot.position.set(element.x, baseY, element.z);
    root.add(cupsRoot);
    addCylinder(cupsRoot, 0, '#c8b696', 6.0 * element.scale, 6.2 * element.scale, 0.25, 0, 0.12, 0, 24);
    const platform = new THREE.Group();
    platform.position.y = 0.3;
    cupsRoot.add(platform);
    addCylinder(platform, 0, '#d7c7a8', 4.6 * element.scale, 4.6 * element.scale, 0.15, 0, 0, 0, 24);
    const cupColors = ['#e0a1b2', '#8bb9c9', '#d6c177', '#a5c38f'];
    for (let i = 0; i < 9; i++) {
      const ring = i < 1 ? 0 : i < 5 ? 2.3 : 4.1;
      const count = i < 1 ? 1 : i < 5 ? 4 : 4;
      const index = i < 1 ? 0 : i < 5 ? i - 1 : i - 5;
      const a = (index / count) * Math.PI * 2;
      const cup = new THREE.Group();
      cup.position.set(Math.cos(a) * ring, 0.2, Math.sin(a) * ring);
      addCylinder(cup, 0, cupColors[i % cupColors.length], 0.85, 0.65, 0.9, 0, 0.45, 0, 12);
      addBox(cup, 0, '#f3e3c9', 1.9, 0.14, 0.32, 0, 0.78, -0.9);
      addBox(cup, 0, '#4b5359', 1.75, 0.6, 0.16, 0, 0.45, -0.85);
      platform.add(cup);
      animations.push({ object: cup, kind: 'spin_y', speed: 0.9 + (i % 3) * 0.22, phase: i });
    }
    animations.push({ object: platform, kind: 'spin_y', speed: -0.35, phase: 0 });
  };

  const buildDropTower = (element: ParkElement, baseY: number, root: THREE.Object3D) => {
    const tower = new THREE.Group();
    tower.position.set(element.x, baseY, element.z);
    tower.rotation.y = THREE.MathUtils.degToRad(element.rotation);
    root.add(tower);
    addBox(tower, 0, '#b9b2a5', 4.5, 1.0, 4.5, 0, 0.5, 0);
    addBox(tower, 0, palette.metal, 1.1, 60, 1.1, -1.2, 30, 0);
    addBox(tower, 0, palette.metal, 1.1, 60, 1.1, 1.2, 30, 0);
    addBox(tower, 0, palette.metal, 1.1, 60, 1.1, 0, 30, -1.2);
    addBox(tower, 0, palette.metal, 1.1, 60, 1.1, 0, 30, 1.2);
    for (let y = 8; y < 58; y += 7) {
      addBox(tower, 0, '#7b858c', 3.6, 0.16, 0.16, 0, y, -1.2);
      addBox(tower, 0, '#7b858c', 3.6, 0.16, 0.16, 0, y, 1.2);
      addBox(tower, 0, '#7b858c', 0.16, 0.16, 3.6, -1.2, y, 0);
      addBox(tower, 0, '#7b858c', 0.16, 0.16, 3.6, 1.2, y, 0);
    }
    addBox(tower, 0, palette.accent, 1.8, 1.0, 1.8, 0, 61.5, 0);
    addBox(tower, 0, emissive('#ff7a59'), 0.3, 0.3, 0.3, 0, 62.1, 0);
    const carriage = new THREE.Group();
    carriage.position.set(0, 48, 0);
    tower.add(carriage);
    addBox(carriage, 0, '#7a3f36', 5.4, 1.2, 3.8, 0, 0, 0);
    addBox(carriage, 0, '#3b444a', 5.0, 0.8, 3.4, 0, 0.9, 0);
    for (let i = -1; i <= 1; i++) {
      addBox(carriage, 0, '#e1b06a', 0.3, 1.5, 0.3, i * 1.6, -0.5, -1.6);
    }
    animations.push({ object: carriage, kind: 'carriage', speed: 0.34, phase: 0, baseY: 48 });
  };

  const buildBumperCars = (element: ParkElement, baseY: number, root: THREE.Object3D) => {
    const arena = new THREE.Group();
    arena.position.set(element.x, baseY, element.z);
    arena.rotation.y = THREE.MathUtils.degToRad(element.rotation);
    root.add(arena);
    addBox(arena, 0, '#434b50', 18 * element.scale, 0.2, 15 * element.scale, 0, 0.1, 0);
    addBox(arena, 0, '#d5b463', 18.4 * element.scale, 1.0, 0.4, 0, 0.6, -7.6 * element.scale);
    addBox(arena, 0, '#d5b463', 18.4 * element.scale, 1.0, 0.4, 0, 0.6, 7.6 * element.scale);
    addBox(arena, 0, '#d5b463', 0.4, 1.0, 15.4 * element.scale, -9.1 * element.scale, 0.6, 0);
    addBox(arena, 0, '#d5b463', 0.4, 1.0, 15.4 * element.scale, 9.1 * element.scale, 0.6, 0);
    addBox(arena, 0, '#b9b2a5', 18.8 * element.scale, 0.3, 15.8 * element.scale, 0, 4.6, 0);
    for (let x = -1; x <= 1; x += 2) {
      for (let z = -1; z <= 1; z += 2) {
        addBox(arena, 0, palette.metal, 0.3, 4.4, 0.3, x * 8.8 * element.scale, 2.3, z * 7.3 * element.scale);
      }
    }
    const carColors = ['#e05252', '#4e9fd1', '#e3b64f', '#6bb36b'];
    for (let i = 0; i < 8; i++) {
      const car = new THREE.Group();
      car.position.set(-6 + (i % 4) * 4, 0.4, -3 + Math.floor(i / 4) * 5);
      addBox(car, 0, carColors[i % carColors.length], 1.9, 0.45, 2.9, 0, 0.25, 0);
      addBox(car, 0, '#e8e2d6', 1.6, 0.5, 1.4, 0, 0.7, 0);
      addBox(car, 0, '#2e363b', 0.45, 0.35, 0.45, 0, 0.05, 0);
      arena.add(car);
    }
  };

  const buildLogFlume = (element: ParkElement, baseY: number, root: THREE.Object3D) => {
    const flume = new THREE.Group();
    flume.position.set(element.x, baseY, element.z);
    flume.rotation.y = THREE.MathUtils.degToRad(element.rotation);
    root.add(flume);
    addBox(flume, 0, '#6c6256', 19 * element.scale, 1.2, 30 * element.scale, 0, 0.6, 0);
    addWater(flume, 0, 15 * element.scale, 26 * element.scale, 0, 0.82, 0);
    addBox(flume, 0, palette.wood, 1.2, 3.0, 30 * element.scale, -7.6 * element.scale, 1.2, 0);
    addBox(flume, 0, palette.wood, 1.2, 3.0, 30 * element.scale, 7.6 * element.scale, 1.2, 0);
    const liftStart = -10 * element.scale;
    for (let i = 0; i < 10; i++) {
      const t = i / 9;
      const y = 2.2 + t * 8.4;
      addBox(flume, 0, '#7b6a58', 13, 0.4, 3.6, 0, y, liftStart - i * 2.0);
      addBox(flume, 0, '#5d4b3b', 0.3, y, 0.3, -6.2, y * 0.5, liftStart - i * 2.0);
      addBox(flume, 0, '#5d4b3b', 0.3, y, 0.3, 6.2, y * 0.5, liftStart - i * 2.0);
    }
    addWater(flume, 0, 12.6, 20, 0, 10.8, liftStart - 9.0);
    addBox(flume, 0, '#6f5e4d', 14, 8.4, 9, 0, 6.8, 8.0);
    addBox(flume, 0, '#1a2124', 7.0, 3.2, 0.4, 0, 1.5, 12.4);
    addWater(flume, 0, 15.4, 7.0, 0, 0.9, -12.0);
    addCylinder(flume, 0, '#7a5a3b', 1.1, 1.1, 0.75, -3.6, 0.9, -11.0, 10);
    addBox(flume, 0, '#c9a06c', 2.9, 0.7, 1.6, -3.6, 1.15, -11.0);
  };

  const buildRapids = (element: ParkElement, baseY: number, root: THREE.Object3D) => {
    const rapids = new THREE.Group();
    rapids.position.set(element.x, baseY, element.z);
    rapids.rotation.y = THREE.MathUtils.degToRad(element.rotation);
    root.add(rapids);
    addCylinder(rapids, 0, '#5d6d63', 10.5 * element.scale, 11.0 * element.scale, 1.1, 0, 0.55, 0, 28);
    const ringGeo = new THREE.TorusGeometry(8.8 * element.scale, 1.65 * element.scale, 8, 34);
    geometries.add(ringGeo);
    const channel = new THREE.Mesh(ringGeo, waterMat);
    channel.rotation.x = -Math.PI / 2;
    channel.position.y = 1.2;
    rapids.add(channel);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.9, 0), rockMat);
      geometries.add(rock.geometry);
      rock.position.set(Math.cos(a) * 8.8, 1.5, Math.sin(a) * 8.8);
      rock.scale.set(1.2, 0.9, 1.1);
      rock.castShadow = castShadows;
      rapids.add(rock);
    }
    addBox(rapids, 0, '#72543b', 4.6, 0.5, 3.0, 0, 1.35, -10.5);
    const boat = new THREE.Group();
    boat.position.set(8.8, 1.55, 0);
    addBox(boat, 0, '#4b6f7c', 2.2, 0.8, 3.4, 0, 0.4, 0);
    addBox(boat, 0, '#26343a', 1.8, 0.3, 2.8, 0, 0.84, 0);
    rapids.add(boat);
    animations.push({ object: boat, kind: 'bob', speed: 0, phase: 0 });
  };

  const buildSplashPool = (element: ParkElement, baseY: number, root: THREE.Object3D) => {
    addBox(root, baseY, '#8c7d68', 16 * element.scale, 0.5, 10 * element.scale, element.x, 0.2, element.z, THREE.MathUtils.degToRad(element.rotation));
    addWater(root, baseY, 14 * element.scale, 8 * element.scale, element.x, 0.52, element.z);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      addBox(root, baseY, '#a89a82', 1.2, 0.6, 0.5, element.x + Math.cos(a) * 7.4, 0.3, element.z + Math.sin(a) * 4.4);
    }
  };

  const buildWaterfall = (element: ParkElement, baseY: number, root: THREE.Object3D) => {
    const fall = new THREE.Group();
    fall.position.set(element.x, baseY, element.z);
    fall.rotation.y = THREE.MathUtils.degToRad(element.rotation);
    root.add(fall);
    addBox(fall, 0, '#2a3033', 14 * element.scale, 11, 4.5, 0, 5.5, 0);
    for (let i = 0; i < 7; i++) {
      const x = -6.4 + i * 2.1;
      addBox(fall, 0, '#3a3b37', 2.6, 9 + (i % 3) * 2.4, 5.2, x, 5.2 + (i % 2) * 1.2, 0);
    }
    const water = new THREE.Mesh(planeGeo, waterMat);
    water.scale.set(10.5, 18, 1);
    water.position.set(0, 10.0, 2.35);
    fall.add(water);
    addWater(fall, 0, 14 * element.scale, 6, 0, 0.65, 4.4);
    // The dark tunnel mouth behind the curtain is the ride entrance.
    addBox(fall, 0, '#0b0f10', 5.2, 5.4, 1.4, 0, 2.7, 2.2);
    addBox(fall, 0, '#7c7565', 6.6, 0.7, 2.8, 0, 5.6, 2.3);
    for (let i = 0; i < 8; i++) {
      addBox(fall, 0, emissive('#8fe3f2', 0.6), 0.5, 0.12, 0.5, -4 + i * 1.15, 0.7 + (i % 3) * 0.25, 4.0);
    }
  };

  const buildFoodStall = (element: ParkElement, baseY: number, root: THREE.Object3D) => {
    const stall = new THREE.Group();
    stall.position.set(element.x, baseY, element.z);
    stall.rotation.y = THREE.MathUtils.degToRad(element.rotation);
    root.add(stall);
    addBox(stall, 0, '#e5d5b5', 4.6, 2.8, 3.6, 0, 1.4, 0);
    addBox(stall, 0, palette.wood, 4.9, 0.3, 4.0, 0, 2.9, 0);
    addBox(stall, 0, palette.accent, 4.9, 0.55, 0.5, 0, 2.45, 1.95);
    for (let i = 0; i < 6; i++) {
      addBox(stall, 0, i % 2 === 0 ? '#f4ead6' : palette.accent, 0.82, 0.12, 2.4, -2.05 + i * 0.82, 3.3, 0, 0);
    }
    addBox(stall, 0, '#7a6a54', 4.3, 0.9, 0.5, 0, 0.85, 1.85);
    addBox(stall, 0, '#2b3032', 3.5, 1.1, 0.08, 0, 1.35, 1.95);
    addBox(stall, 0, emissive('#ffcf7a'), 3.6, 0.12, 0.12, 0, 2.3, 1.98);
    addPerson(stall, 0, 0, -0.9, 0, '#e2d4c2', '#b7835e');
  };

  const buildRestaurant = (element: ParkElement, baseY: number, root: THREE.Object3D) => {
    const restaurant = new THREE.Group();
    restaurant.position.set(element.x, baseY, element.z);
    restaurant.rotation.y = THREE.MathUtils.degToRad(element.rotation);
    root.add(restaurant);
    addBox(restaurant, 0, '#d7c49f', 14, 5.2, 10, 0, 2.6, 0);
    addBox(restaurant, 0, '#51463b', 14.8, 0.4, 10.8, 0, 5.4, 0);
    addBox(restaurant, 0, palette.accent, 14.8, 1.0, 0.4, 0, 4.7, 5.1);
    for (let i = 0; i < 4; i++) {
      addBox(restaurant, 0, glassMat, 2.2, 2.0, 0.08, -5.1 + i * 3.4, 2.6, 5.02);
    }
    addBox(restaurant, 0, '#2a2119', 2.4, 3.2, 0.3, 0, 1.6, 5.05);
    addBox(restaurant, 0, '#493c2d', 12, 0.22, 4, 0, 0.22, 7.0);
    for (let i = 0; i < 6; i++) {
      addBox(restaurant, 0, '#d9c8a5', 2.2, 0.12, 2.2, -6 + (i % 3) * 6, 0.9, 6.4 + Math.floor(i / 3) * 2.2);
      addBox(restaurant, 0, '#4b4034', 0.16, 0.9, 0.16, -6 + (i % 3) * 6, 0.45, 6.4 + Math.floor(i / 3) * 2.2);
    }
    addPerson(restaurant, 0, 0, -1.8, 0, '#c95c48', '#b7835e');
  };

  const buildShop = (element: ParkElement, baseY: number, root: THREE.Object3D) => {
    const shop = new THREE.Group();
    shop.position.set(element.x, baseY, element.z);
    shop.rotation.y = THREE.MathUtils.degToRad(element.rotation);
    root.add(shop);
    addBox(shop, 0, '#e2d4b8', 8, 4, 6, 0, 2, 0);
    addBox(shop, 0, '#5d4c3a', 8.6, 0.5, 6.6, 0, 4.2, 0);
    addBox(shop, 0, palette.accent, 8.6, 0.9, 0.24, 0, 3.4, 3.05);
    addBox(shop, 0, glassMat, 5.6, 2.2, 0.08, 0, 1.7, 3.02);
    addBox(shop, 0, '#2a2119', 1.6, 3.0, 0.3, 0, 1.5, 3.03);
    for (let i = 0; i < 2; i++) {
      addBox(shop, 0, '#f3e4c6', 0.8, 0.35, 0.8, -2.8 + i * 5.6, 4.55, 3.12);
      addBox(shop, 0, emissive('#ffd58c'), 0.9, 0.1, 0.12, -2.8 + i * 5.6, 4.1, 3.12);
    }
    addPerson(shop, 0, -1.0, -1.2, 2.3, '#4b7592', '#b7835e');
  };

  const buildGamesStall = (element: ParkElement, baseY: number, root: THREE.Object3D) => {
    const games = new THREE.Group();
    games.position.set(element.x, baseY, element.z);
    games.rotation.y = THREE.MathUtils.degToRad(element.rotation);
    root.add(games);
    for (let i = 0; i < 3; i++) {
      const x = -3.4 + i * 3.4;
      addBox(games, 0, '#e6d6b8', 3.0, 2.8, 3.4, x, 1.4, 0);
      addBox(games, 0, i % 2 === 0 ? palette.accent : '#8fc7c2', 3.2, 0.2, 3.7, x, 3.35, 0);
      addBox(games, 0, '#30383c', 2.6, 1.3, 0.12, x, 1.7, 1.74);
      addBox(games, 0, emissive('#ffe6ad'), 2.7, 0.1, 0.12, x, 2.45, 1.76);
      addBox(games, 0, '#7d6c57', 3.0, 0.8, 0.4, x, 0.8, 1.8);
    }
  };

  const buildRestroom = (element: ParkElement, baseY: number, root: THREE.Object3D) => {
    const rest = new THREE.Group();
    rest.position.set(element.x, baseY, element.z);
    rest.rotation.y = THREE.MathUtils.degToRad(element.rotation);
    root.add(rest);
    addBox(rest, 0, '#b6b3a6', 7, 3.4, 5, 0, 1.7, 0);
    addBox(rest, 0, '#5b5f5b', 7.5, 0.4, 5.4, 0, 3.6, 0);
    for (let i = 0; i < 2; i++) {
      addBox(rest, 0, '#3b4a4f', 1.2, 2.4, 0.16, -1.4 + i * 2.8, 1.2, 2.54);
    }
  };

  const buildArcade = (element: ParkElement, baseY: number, root: THREE.Object3D) => {
    const arcade = new THREE.Group();
    arcade.position.set(element.x, baseY, element.z);
    arcade.rotation.y = THREE.MathUtils.degToRad(element.rotation);
    root.add(arcade);
    addBox(arcade, 0, '#433c58', 11, 4.6, 7, 0, 2.3, 0);
    addBox(arcade, 0, glassMat, 9.6, 3.2, 0.16, 0, 2.0, 3.55);
    addBox(arcade, 0, emissive('#9a7bff', 1.1), 9.8, 0.5, 0.3, 0, 4.3, 3.55);
    for (let i = 0; i < 4; i++) {
      addBox(arcade, 0, i % 2 === 0 ? '#6957a8' : '#356b80', 1.3, 2.2, 1.0, -3.6 + i * 2.4, 1.1, 0.6);
      addBox(arcade, 0, emissive(i % 2 === 0 ? '#b79bff' : '#7ee6e0'), 0.9, 0.7, 0.1, -3.6 + i * 2.4, 1.6, 1.12);
    }
  };

  const buildFountain = (element: ParkElement, baseY: number, root: THREE.Object3D) => {
    const fountain = new THREE.Group();
    fountain.position.set(element.x, baseY, element.z);
    root.add(fountain);
    addCylinder(fountain, 0, '#b9b1a0', 4.0 * element.scale, 4.4 * element.scale, 0.8, 0, 0.4, 0, 24);
    addCylinder(fountain, 0, '#6f7e7c', 3.6 * element.scale, 3.6 * element.scale, 0.25, 0, 0.75, 0, 24);
    addCylinder(fountain, 0, '#b9b1a0', 0.7, 0.9, 2.2, 0, 1.9, 0, 10);
    addCylinder(fountain, 0, '#c7bfa9', 1.7, 2.3, 0.35, 0, 2.9, 0, 16);
    const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.32, 3.0, 8), waterMat);
    geometries.add(jet.geometry);
    jet.position.y = 4.0;
    fountain.add(jet);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      addBox(fountain, 0, emissive('#ffe4a8'), 0.18, 0.18, 0.18, Math.cos(a) * 3.8, 0.95, Math.sin(a) * 3.8);
    }
  };

  const buildTree = (element: ParkElement, baseY: number, root: THREE.Object3D) => {
    const tree = new THREE.Group();
    tree.position.set(element.x, baseY, element.z);
    root.add(tree);
    addCylinder(tree, 0, barkMat, 0.28, 0.45, 4.4, 0, 2.2, 0, 7);
    const crownGeo = new THREE.IcosahedronGeometry(2.6 * element.scale, 1);
    geometries.add(crownGeo);
    const crown = new THREE.Mesh(crownGeo, foliageMat);
    crown.position.y = 5.6;
    crown.scale.set(1.2, 0.9, 1.2);
    crown.castShadow = castShadows;
    tree.add(crown);
    const crown2 = new THREE.Mesh(crownGeo, foliageLightMat);
    crown2.position.set(1.1, 6.4, -0.4);
    crown2.scale.setScalar(0.7);
    tree.add(crown2);
    addBox(tree, 0, '#8b6a45', 0.9, 0.25, 0.9, 0.2, 0.12, 0);
  };

  const buildBench = (element: ParkElement, baseY: number, root: THREE.Object3D) => {
    const bench = new THREE.Group();
    bench.position.set(element.x, baseY, element.z);
    bench.rotation.y = THREE.MathUtils.degToRad(element.rotation);
    root.add(bench);
    addBox(bench, 0, palette.wood, 1.9, 0.12, 0.55, 0, 0.48, 0);
    addBox(bench, 0, palette.wood, 1.9, 0.55, 0.12, 0, 0.78, -0.28);
    addBox(bench, 0, '#3f464a', 0.1, 0.5, 0.5, -0.75, 0.25, 0);
    addBox(bench, 0, '#3f464a', 0.1, 0.5, 0.5, 0.75, 0.25, 0);
  };

  const buildLamp = (element: ParkElement, baseY: number, root: THREE.Object3D) => {
    const lamp = new THREE.Group();
    lamp.position.set(element.x, baseY, element.z);
    root.add(lamp);
    addCylinder(lamp, 0, '#343b3e', 0.08, 0.16, 4.2, 0, 2.1, 0, 7);
    addCylinder(lamp, 0, '#343b3e', 0.3, 0.3, 0.18, 0, 0.1, 0, 8);
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), emissive('#ffdc8e', 1.4));
    geometries.add(globe.geometry);
    globe.position.y = 4.35;
    lamp.add(globe);
    addCylinder(lamp, 0, '#2c3235', 0.38, 0.12, 0.26, 0, 4.65, 0, 8);
  };

  const buildFlowerBed = (element: ParkElement, baseY: number, root: THREE.Object3D) => {
    addBox(root, baseY, '#6d5b45', 4 * element.scale, 0.35, 4 * element.scale, element.x, 0.18, element.z, THREE.MathUtils.degToRad(element.rotation));
    const colors = ['#e7839a', '#f0c95c', '#c87ad6', '#e8a45a'];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      addBox(root, baseY, colors[i % colors.length], 0.24, 0.24, 0.24, element.x + Math.cos(a) * 1.4, 0.45, element.z + Math.sin(a) * 1.4);
    }
  };

  const buildStage = (element: ParkElement, baseY: number, root: THREE.Object3D) => {
    const stage = new THREE.Group();
    stage.position.set(element.x, baseY, element.z);
    stage.rotation.y = THREE.MathUtils.degToRad(element.rotation);
    root.add(stage);
    addBox(stage, 0, '#4b3b30', 16 * element.scale, 1.4, 11 * element.scale, 0, 0.7, 0);
    addBox(stage, 0, '#2f2723', 15, 0.25, 7, 0, 1.45, 0);
    addBox(stage, 0, '#6e2f45', 14, 5.0, 0.7, 0, 4.0, -4.8);
    addBox(stage, 0, '#c76b8f', 16, 0.6, 0.9, 0, 6.7, -4.8);
    for (let x = -6; x <= 6; x += 3) {
      addBox(stage, 0, emissive('#ffe1a3'), 0.4, 0.4, 0.4, x, 7.35, -4.5);
    }
    for (let i = 0; i < 5; i++) {
      addBox(stage, 0, '#5d4a3a', 3.0, 0.5, 2.4, 0, 2.4, 0);
      addBox(stage, 0, '#3b2f26', 0.2, 1.0, 0.2, -1, 1.9, -1);
      addBox(stage, 0, '#3b2f26', 0.2, 1.0, 0.2, 1, 1.9, -1);
    }
  };

  const builders: Record<ParkElementKind, (element: ParkElement, baseY: number, root: THREE.Object3D) => void> = {
    path: buildPath,
    queue: buildQueue,
    gate: buildGate,
    carousel: buildCarousel,
    ferris_wheel: buildFerrisWheel,
    swing_tower: buildSwingTower,
    teacups: buildTeacups,
    drop_tower: buildDropTower,
    bumper_cars: buildBumperCars,
    log_flume: buildLogFlume,
    rapids: buildRapids,
    splash_pool: buildSplashPool,
    waterfall: buildWaterfall,
    food_stall: buildFoodStall,
    restaurant: buildRestaurant,
    shop: buildShop,
    games_stall: buildGamesStall,
    restroom: buildRestroom,
    arcade: buildArcade,
    fountain: buildFountain,
    tree: buildTree,
    bench: buildBench,
    lamp: buildLamp,
    flower_bed: buildFlowerBed,
    stage: buildStage,
  };

  for (const element of park.elements) {
    const catalog = getParkCatalogEntry(element.kind);
    if (!catalog) continue;
    const world = parkLocalToWorld(element.x, element.z, yaw, origin.x, origin.z);
    const groundY = groundAt(world.x, world.z);
    const baseY = groundY - originY;
    const root = new THREE.Group();
    group.add(root);
    builders[element.kind](element, baseY, root);
  }

  const bounds = getParkBounds(park);
  const visitorTotal = options.includeVisitors === false ? 0 : Math.min(28, Math.max(0, park.visitorCount));
  if (visitorTotal > 0) {
    const shirtColors = ['#d5635f', '#5c93b0', '#d8b562', '#70a276', '#9b7ec2', '#d58a55'];
    const skinColors = ['#b7835e', '#8d5a3c', '#e0b088', '#6b432c'];
    const centerX = (bounds.minX + bounds.maxX) * 0.5;
    const centerZ = (bounds.minZ + bounds.maxZ) * 0.5;
    const centerWorld = parkLocalToWorld(centerX, centerZ, yaw, origin.x, origin.z);
    const visitorGroundY = groundAt(centerWorld.x, centerWorld.z) - originY;
    const radiusX = Math.max(8, (bounds.maxX - bounds.minX) * 0.34);
    const radiusZ = Math.max(8, (bounds.maxZ - bounds.minZ) * 0.34);
    for (let i = 0; i < visitorTotal; i++) {
      const person = addPerson(
        group,
        0,
        centerX + Math.cos((i / visitorTotal) * Math.PI * 2) * radiusX,
        centerZ + Math.sin((i / visitorTotal) * Math.PI * 2) * radiusZ,
        0,
        shirtColors[i % shirtColors.length],
        skinColors[i % skinColors.length],
      );
      person.position.y = visitorGroundY;
      visitors.push(person);
      animations.push({
        object: person,
        kind: 'visitor',
        speed: 0.035 + (i % 5) * 0.006,
        phase: (i / visitorTotal) * Math.PI * 2,
        radiusX,
        radiusZ,
        baseY: person.position.y,
        centerX,
        centerZ,
      });
    }
  }

  return {
    group,
    animations,
    visitors,
    bounds,
    dispose() {
      group.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.InstancedMesh) {
          object.geometry?.dispose();
          const meshMaterial = object.material;
          if (Array.isArray(meshMaterial)) meshMaterial.forEach((entry) => entry.dispose());
          else meshMaterial?.dispose();
        }
      });
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((entry) => entry.dispose());
      textures.forEach((texture) => texture.dispose());
    },
  };
}

function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const PARK_ACCENTS = ['#e8a04b', '#d96b7a', '#5ba7b9', '#b5c25c', '#9a7cc4'];

export function parkLocalToWorld(
  localX: number,
  localZ: number,
  yaw: number,
  originX = 0,
  originZ = 0,
): { x: number; z: number } {
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  return {
    x: originX + localX * cos + localZ * sin,
    z: originZ - localX * sin + localZ * cos,
  };
}

/** Advances wheels, spinners, drop cars and walking visitors. */
export function updateParkModel(handles: ParkModelHandles, dt: number, elapsed: number): void {
  for (const animation of handles.animations) {
    const { object, kind } = animation;
    switch (kind) {
      case 'spin_y':
        object.rotation.y += animation.speed * dt;
        break;
      case 'spin_z':
        object.rotation.z += animation.speed * dt;
        break;
      case 'bob':
        object.position.y += Math.sin(elapsed * 1.1 + animation.phase) * 0.0015;
        break;
      case 'carriage': {
        const cycle = (elapsed * animation.speed) % 1;
        const height = 48 - Math.max(0, cycle - 0.35) * 70;
        object.position.y = Math.max(8, height);
        break;
      }
      case 'visitor': {
        const angle = animation.phase + elapsed * animation.speed;
        const rx = animation.radiusX ?? 12;
        const rz = animation.radiusZ ?? 12;
        object.position.x = (animation.centerX ?? 0) + Math.cos(angle) * rx;
        object.position.z = (animation.centerZ ?? 0) + Math.sin(angle) * rz;
        object.position.y = (animation.baseY ?? 0) + Math.abs(Math.sin(elapsed * 2.3 + animation.phase)) * 0.06;
        object.rotation.y = -angle;
        break;
      }
      default:
        break;
    }
  }
}
