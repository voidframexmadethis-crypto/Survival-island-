import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { getTerrainHeight as sampleTerrainHeight } from './terrain';
import {
  WATERPARK_DECK_Y,
  WATERPARK_DUMP_BUCKET,
  WATERPARK_LAZY_RIVER,
  WATERPARK_NAME,
  WATERPARK_POOLS,
  WATERPARK_SITE,
  WATERPARK_SLIDES,
  WATERPARK_TOWERS,
  buildWaterparkSlidePath,
  getWaterparkBridgeLine,
  type WaterparkSlideKind,
  type WaterparkSlideSpec,
  type WaterparkTowerSpec,
} from './waterparkLayout';
import { computeWaterparkLoads } from '../systems/waterparkPhysics';

export interface WaterparkPathSample {
  point: THREE.Vector3;
  tangent: THREE.Vector3;
  right: THREE.Vector3;
  up: THREE.Vector3;
  roll: number;
  verticalG: number;
  lateralG: number;
  distance: number;
}

export interface WaterparkSlideHandles {
  spec: WaterparkSlideSpec;
  curve: THREE.CatmullRomCurve3;
  samples: WaterparkPathSample[];
  length: number;
  boarding: { x: number; z: number };
}

export interface WaterparkInnerTube {
  mesh: THREE.Group;
  offset: number;
}

export interface WaterparkModelHandles {
  root: THREE.Group;
  slides: WaterparkSlideHandles[];
  lazySamples: WaterparkPathSample[];
  lazyLength: number;
  wavePoolMesh: THREE.Mesh | null;
  waveGeometry: THREE.BufferGeometry | null;
  waveBasePositions: Float32Array | null;
  bucketPivot: THREE.Group | null;
  bucketWater: THREE.Mesh | null;
  bucketStream: THREE.Mesh | null;
  bucketSplash: THREE.Mesh | null;
  innerTubes: WaterparkInnerTube[];
  dispose(): void;
}

const UP = new THREE.Vector3(0, 1, 0);
const _tanA = new THREE.Vector3();
const _tanB = new THREE.Vector3();
const _yawA = new THREE.Vector3();
const _yawB = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3();
const _prevRight = new THREE.Vector3(1, 0, 0);

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function slideWidth(kind: WaterparkSlideKind): number {
  switch (kind) {
    case 'body':
      return 1.4;
    case 'tube':
      return 1.9;
    case 'raft':
      return 3.9;
    case 'mat':
      return 2.8;
    case 'bowl':
      return 2.7;
    case 'halfpipe':
      return 3.1;
    case 'watercoaster':
      return 3.4;
    case 'drop':
      return 1.7;
    case 'log':
      return 3.5;
    case 'kids':
      return 1.25;
    default:
      return 1.6;
  }
}

function slideWallHeight(kind: WaterparkSlideKind): number {
  switch (kind) {
    case 'body':
    case 'kids':
      return 0.62;
    case 'mat':
      return 0.72;
    case 'raft':
    case 'log':
      return 0.95;
    case 'halfpipe':
      return 1.35;
    case 'watercoaster':
      return 0.88;
    default:
      return 0.8;
  }
}

function slideEyeHeight(kind: WaterparkSlideKind): number {
  switch (kind) {
    case 'tube':
      return 0.44;
    case 'body':
    case 'mat':
      return 0.64;
    case 'kids':
      return 0.58;
    case 'raft':
      return 1.08;
    case 'log':
      return 1.16;
    case 'drop':
      return 0.7;
    default:
      return 0.88;
  }
}

export function getWaterparkSlideEyeHeight(kind: WaterparkSlideKind): number {
  return slideEyeHeight(kind);
}

function makeTileTexture(): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#cbb894';
  ctx.fillRect(0, 0, 512, 512);
  const tiles = 8;
  const size = 512 / tiles;
  for (let y = 0; y < tiles; y++) {
    for (let x = 0; x < tiles; x++) {
      const warm = (x + y) % 3 === 0;
      ctx.fillStyle = warm ? '#d7c49f' : '#c6b28e';
      ctx.fillRect(x * size + 2, y * size + 2, size - 4, size - 4);
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      ctx.fillRect(x * size + 5, y * size + 5, size - 10, 3);
      const n = 14;
      for (let i = 0; i < n; i++) {
        ctx.fillStyle = `rgba(80,60,35,${0.025 + Math.random() * 0.05})`;
        ctx.fillRect(
          x * size + 4 + Math.random() * (size - 8),
          y * size + 4 + Math.random() * (size - 8),
          2 + Math.random() * 6,
          1 + Math.random() * 3,
        );
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(12, 11);
  texture.anisotropy = 4;
  return texture;
}

function makeSignTexture(
  text: string,
  accent: string,
  background = '#101a1e',
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, 26, canvas.height);
  ctx.fillRect(canvas.width - 26, 0, 26, canvas.height);
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.fillRect(0, 0, canvas.width, 7);
  ctx.fillRect(0, canvas.height - 7, canvas.width, 7);
  ctx.font = '800 60px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff8e8';
  ctx.fillText(text.toUpperCase().slice(0, 38), canvas.width / 2 + 4, canvas.height / 2 + 4);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function buildPathSamples(
  curve: THREE.CatmullRomCurve3,
  sampleCount = 220,
): WaterparkPathSample[] {
  const length = Math.max(0.1, curve.getLength());
  const count = Math.max(18, sampleCount);
  const raw: WaterparkPathSample[] = [];
  let previousRight = _prevRight.set(1, 0, 0).clone();
  for (let i = 0; i <= count; i++) {
    const u = i / count;
    const point = curve.getPointAt(u);
    const tangent = curve.getTangentAt(u, new THREE.Vector3()).normalize();
    _right.crossVectors(tangent, UP);
    if (_right.lengthSq() < 0.0002) {
      _right.copy(previousRight);
    } else {
      _right.normalize();
      previousRight = _right.clone();
    }
    _up.crossVectors(_right, tangent).normalize();
    _yawA.copy(curve.getTangentAt(Math.max(0, u - 0.008), new THREE.Vector3())).normalize();
    _yawB.copy(curve.getTangentAt(Math.min(1, u + 0.008), new THREE.Vector3())).normalize();
    const turn = _yawA.x * _yawB.z - _yawA.z * _yawB.x;
    raw.push({
      point,
      tangent,
      right: _right.clone(),
      up: _up.clone(),
      roll: clamp(turn * 64, -0.5, 0.5),
      verticalG: 1,
      lateralG: 0,
      distance: u * length,
    });
  }
  for (let i = 0; i < raw.length; i++) {
    const current = raw[i];
    const prev = raw[Math.max(0, i - 1)];
    const next = raw[Math.min(raw.length - 1, i + 1)];
    _tanA.copy(prev.tangent);
    _tanB.copy(next.tangent);
    const ds = Math.max(0.25, next.distance - prev.distance);
    const loads = computeWaterparkLoads(
      12,
      _tanA,
      _tanB,
      current.right,
      ds,
    );
    // Loads are speed-independent here; runtime scales them by the live speed.
    current.verticalG = loads.verticalG;
    current.lateralG = loads.lateralG;
  }
  return raw;
}

export function sampleWaterparkPath(
  samples: WaterparkPathSample[],
  distance: number,
  outPoint: THREE.Vector3,
  outTangent: THREE.Vector3,
  outRight: THREE.Vector3,
  outUp: THREE.Vector3,
): { roll: number; verticalG: number; lateralG: number; index: number } {
  if (samples.length === 0) {
    outPoint.set(0, 0, 0);
    outTangent.set(0, 0, 1);
    outRight.set(1, 0, 0);
    outUp.set(0, 1, 0);
    return { roll: 0, verticalG: 1, lateralG: 0, index: 0 };
  }
  const total = samples[samples.length - 1].distance;
  const t = clamp(total > 0 ? distance / total : 0, 0, 1);
  const raw = t * (samples.length - 1);
  const i0 = Math.floor(raw);
  const i1 = Math.min(samples.length - 1, i0 + 1);
  const f = raw - i0;
  const a = samples[i0];
  const b = samples[i1];
  outPoint.copy(a.point).lerp(b.point, f);
  outTangent.copy(a.tangent).lerp(b.tangent, f).normalize();
  outRight.copy(a.right).lerp(b.right, f).normalize();
  outUp.copy(a.up).lerp(b.up, f).normalize();
  return {
    roll: a.roll + (b.roll - a.roll) * f,
    verticalG: a.verticalG + (b.verticalG - a.verticalG) * f,
    lateralG: a.lateralG + (b.lateralG - a.lateralG) * f,
    index: i0,
  };
}

function buildOpenSlideGeometry(
  curve: THREE.CatmullRomCurve3,
  width: number,
  wallHeight: number,
  tubularSegments = 100,
): { shell: THREE.BufferGeometry; water: THREE.BufferGeometry; leftRail: THREE.BufferGeometry; rightRail: THREE.BufferGeometry } {
  const rows = Math.max(28, tubularSegments);
  const half = width * 0.5;
  const profile: [number, number][] = [
    [-half, wallHeight],
    [-half, 0.1],
    [-half * 0.65, -0.14],
    [0, -0.2],
    [half * 0.65, -0.14],
    [half, 0.1],
    [half, wallHeight],
  ];
  const positions: number[] = [];
  const uvs: number[] = [];
  let previousRight = new THREE.Vector3(1, 0, 0);
  const leftRailPoints: THREE.Vector3[] = [];
  const rightRailPoints: THREE.Vector3[] = [];
  for (let i = 0; i <= rows; i++) {
    const u = i / rows;
    const point = curve.getPointAt(u);
    const tangent = curve.getTangentAt(u).normalize();
    const right = new THREE.Vector3().crossVectors(tangent, UP);
    if (right.lengthSq() < 0.0002) right.copy(previousRight);
    else {
      right.normalize();
      previousRight = right.clone();
    }
    const up = new THREE.Vector3().crossVectors(right, tangent).normalize();
    for (let j = 0; j < profile.length; j++) {
      const [px, py] = profile[j];
      positions.push(
        point.x + right.x * px + up.x * py,
        point.y + right.y * px + up.y * py,
        point.z + right.z * px + up.z * py,
      );
      uvs.push(u * 8, j / (profile.length - 1));
    }
    leftRailPoints.push(point.clone().addScaledVector(right, -half).addScaledVector(up, wallHeight));
    rightRailPoints.push(point.clone().addScaledVector(right, half).addScaledVector(up, wallHeight));
  }
  const indices: number[] = [];
  const stride = profile.length;
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < profile.length - 1; j++) {
      const a = i * stride + j;
      const b = a + 1;
      const c = (i + 1) * stride + j;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  const shell = new THREE.BufferGeometry();
  shell.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  shell.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  shell.setIndex(indices);
  shell.computeVertexNormals();

  // Flat water strip running a few centimetres above the channel floor.
  const waterPositions: number[] = [];
  const waterUvs: number[] = [];
  previousRight = new THREE.Vector3(1, 0, 0);
  for (let i = 0; i <= rows; i++) {
    const u = i / rows;
    const point = curve.getPointAt(u);
    const tangent = curve.getTangentAt(u).normalize();
    const right = new THREE.Vector3().crossVectors(tangent, UP);
    if (right.lengthSq() < 0.0002) right.copy(previousRight);
    else {
      right.normalize();
      previousRight = right.clone();
    }
    const up = new THREE.Vector3().crossVectors(right, tangent).normalize();
    for (const side of [-0.38, 0.38]) {
      waterPositions.push(
        point.x + right.x * width * side + up.x * 0.04,
        point.y + right.y * width * side + up.y * 0.04,
        point.z + right.z * width * side + up.z * 0.04,
      );
      waterUvs.push(u * 8, side > 0 ? 1 : 0);
    }
  }
  const waterIndices: number[] = [];
  for (let i = 0; i < rows; i++) {
    const a = i * 2;
    waterIndices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const water = new THREE.BufferGeometry();
  water.setAttribute('position', new THREE.Float32BufferAttribute(waterPositions, 3));
  water.setAttribute('uv', new THREE.Float32BufferAttribute(waterUvs, 2));
  water.setIndex(waterIndices);
  water.computeVertexNormals();

  const leftRail = new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(leftRailPoints, false, 'centripetal'),
    Math.max(12, Math.round(rows * 0.7)),
    0.075,
    5,
    false,
  );
  const rightRail = new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(rightRailPoints, false, 'centripetal'),
    Math.max(12, Math.round(rows * 0.7)),
    0.075,
    5,
    false,
  );
  return { shell, water, leftRail, rightRail };
}

function buildClosedFlatRibbon(
  curve: THREE.CatmullRomCurve3,
  width: number,
  segments = 180,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  let previousRight = new THREE.Vector3(1, 0, 0);
  for (let i = 0; i < segments; i++) {
    const u = i / segments;
    const p = curve.getPointAt(u);
    const t = curve.getTangentAt(u).normalize();
    const right = new THREE.Vector3().crossVectors(t, UP);
    if (right.lengthSq() < 0.0002) right.copy(previousRight);
    else {
      right.normalize();
      previousRight = right.clone();
    }
    positions.push(p.x - right.x * width * 0.5, p.y, p.z - right.z * width * 0.5);
    positions.push(p.x + right.x * width * 0.5, p.y, p.z + right.z * width * 0.5);
    uvs.push(u * 8, 0, u * 8, 1);
    const a = i * 2;
    const b = ((i + 1) % segments) * 2;
    indices.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function roundedRectCurve(
  halfW: number,
  halfD: number,
  corner: number,
  y: number,
): THREE.CatmullRomCurve3 {
  const points: THREE.Vector3[] = [];
  const steps = 7;
  const corners = [
    [halfW - corner, -halfD + corner, -Math.PI / 2, 0],
    [halfW - corner, halfD - corner, 0, Math.PI / 2],
    [-halfW + corner, halfD - corner, Math.PI / 2, Math.PI],
    [-halfW + corner, -halfD + corner, Math.PI, Math.PI * 1.5],
  ] as const;
  for (const [cx, cz, a0, a1] of corners) {
    for (let i = 0; i <= steps; i++) {
      const angle = a0 + ((a1 - a0) * i) / steps;
      points.push(
        new THREE.Vector3(
          cx + Math.cos(angle) * corner,
          y,
          cz + Math.sin(angle) * corner,
        ),
      );
    }
  }
  return new THREE.CatmullRomCurve3(points, true, 'centripetal');
}

function strutBetween(
  a: THREE.Vector3,
  b: THREE.Vector3,
  radius: number,
  material: THREE.Material,
  geometries: Set<THREE.BufferGeometry>,
): THREE.Mesh {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const geo = new THREE.CylinderGeometry(radius, radius, len, 6);
  geometries.add(geo);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.copy(a).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(UP, dir.normalize());
  mesh.castShadow = true;
  return mesh;
}

export function buildWaterparkModel(): WaterparkModelHandles {
  const root = new THREE.Group();
  root.name = 'hilltop-waterpark';
  root.position.set(WATERPARK_SITE.x, WATERPARK_DECK_Y, WATERPARK_SITE.z);

  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const slides: WaterparkSlideHandles[] = [];
  const innerTubes: WaterparkInnerTube[] = [];
  const railGeos: THREE.BufferGeometry[] = [];
  const postMatrices: THREE.Matrix4[] = [];
  const ringMatrices: THREE.Matrix4[] = [];

  const tileTexture = makeTileTexture();
  if (tileTexture) textures.add(tileTexture);
  const deckMat = new THREE.MeshStandardMaterial({
    color: 0xd8caa9,
    ...(tileTexture ? { map: tileTexture } : {}),
    roughness: 0.82,
    metalness: 0.02,
  });
  materials.add(deckMat);
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0xc8c2b2, roughness: 0.9 });
  materials.add(concreteMat);
  const poolWallMat = new THREE.MeshStandardMaterial({ color: 0x8fb8bd, roughness: 0.65 });
  materials.add(poolWallMat);
  const poolFloorMat = new THREE.MeshStandardMaterial({ color: 0x2b7584, roughness: 0.7 });
  materials.add(poolFloorMat);
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x2bb6d1,
    emissive: 0x0b4654,
    emissiveIntensity: 0.4,
    roughness: 0.12,
    metalness: 0.18,
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  materials.add(waterMat);
  const foamMat = new THREE.MeshStandardMaterial({
    color: 0xe8fbff,
    emissive: 0x8adcef,
    emissiveIntensity: 0.6,
    roughness: 0.32,
    transparent: true,
    opacity: 0.88,
  });
  materials.add(foamMat);
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x43515b,
    roughness: 0.32,
    metalness: 0.78,
  });
  materials.add(steelMat);
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf1eadb, roughness: 0.55, metalness: 0.15 });
  materials.add(whiteMat);
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x7d5a3a, roughness: 0.88 });
  materials.add(woodMat);
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x3f7a46, roughness: 0.92, side: THREE.DoubleSide });
  materials.add(leafMat);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x705236, roughness: 0.95 });
  materials.add(trunkMat);
  const signMatCache = new Map<string, THREE.Material>();

  const addBox = (
    parent: THREE.Object3D,
    mat: THREE.Material,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    rotY = 0,
    castShadow = true,
  ): THREE.Mesh => {
    const geo = new THREE.BoxGeometry(w, h, d);
    geometries.add(geo);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotY;
    mesh.castShadow = castShadow;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  const addCylinder = (
    parent: THREE.Object3D,
    mat: THREE.Material,
    rTop: number,
    rBottom: number,
    h: number,
    x: number,
    y: number,
    z: number,
    segments = 12,
  ): THREE.Mesh => {
    const geo = new THREE.CylinderGeometry(rTop, rBottom, h, segments);
    geometries.add(geo);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  const signMaterial = (text: string, accent: string): THREE.Material => {
    const key = `${text}|${accent}`;
    const cached = signMatCache.get(key);
    if (cached) return cached;
    const texture = makeSignTexture(text, accent);
    let mat: THREE.Material;
    if (texture) {
      textures.add(texture);
      mat = new THREE.MeshBasicMaterial({
        map: texture,
        toneMapped: false,
        side: THREE.DoubleSide,
      });
    } else {
      mat = new THREE.MeshBasicMaterial({ color: accent, toneMapped: false, side: THREE.DoubleSide });
    }
    materials.add(mat);
    signMatCache.set(key, mat);
    return mat;
  };

  const addSign = (
    parent: THREE.Object3D,
    text: string,
    accent: string,
    w: number,
    h: number,
    x: number,
    y: number,
    z: number,
    rotY = 0,
  ): THREE.Mesh => {
    const geo = new THREE.PlaneGeometry(w, h);
    geometries.add(geo);
    const mesh = new THREE.Mesh(geo, signMaterial(text, accent));
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotY;
    parent.add(mesh);
    return mesh;
  };

  // Main tiled deck and retaining edge.
  const deckGeo = new THREE.BoxGeometry(94, 0.7, 88);
  geometries.add(deckGeo);
  const deck = new THREE.Mesh(deckGeo, deckMat);
  deck.position.y = -0.35;
  deck.receiveShadow = true;
  root.add(deck);
  addBox(root, concreteMat, 95.2, 1.15, 89.2, 0, -1.0, 0, 0, false);
  addBox(root, poolWallMat, 94.3, 0.22, 0.35, 0, -0.02, -44);
  addBox(root, poolWallMat, 94.3, 0.22, 0.35, 0, -0.02, 44);
  addBox(root, poolWallMat, 0.35, 0.22, 88.3, -47, -0.02, 0);
  addBox(root, poolWallMat, 0.35, 0.22, 88.3, 47, -0.02, 0);

  // Colour-coded promenade strips guide guests between the four towers.
  const tealStripeMat = new THREE.MeshStandardMaterial({ color: 0x5fa8ad, roughness: 0.8 });
  const amberStripeMat = new THREE.MeshStandardMaterial({ color: 0xe3b05d, roughness: 0.8 });
  materials.add(tealStripeMat);
  materials.add(amberStripeMat);
  addBox(root, tealStripeMat, 3.0, 0.06, 54, 0, 0.04, -9, 0, false);
  addBox(root, amberStripeMat, 60, 0.06, 3.0, 0, 0.04, 8, 0, false);

  // Pools, tile rims, ladders, lane slips and fountain jets.
  let wavePoolMesh: THREE.Mesh | null = null;
  let waveGeometry: THREE.BufferGeometry | null = null;
  let waveBasePositions: Float32Array | null = null;
  for (const pool of WATERPARK_POOLS) {
    addBox(root, poolFloorMat, pool.w, 0.35, pool.d, pool.x, -0.12, pool.z, 0, false);
    addBox(root, poolWallMat, pool.w + 1.6, 0.32, 0.65, pool.x, 0.1, pool.z - pool.d * 0.5 - 0.65);
    addBox(root, poolWallMat, pool.w + 1.6, 0.32, 0.65, pool.x, 0.1, pool.z + pool.d * 0.5 + 0.65);
    addBox(root, poolWallMat, 0.65, 0.32, pool.d + 1.6, pool.x - pool.w * 0.5 - 0.65, 0.1, pool.z);
    addBox(root, poolWallMat, 0.65, 0.32, pool.d + 1.6, pool.x + pool.w * 0.5 + 0.65, 0.1, pool.z);
    if (pool.id === 'wave') {
      const geo = new THREE.PlaneGeometry(pool.w - 1.1, pool.d - 1.1, 32, 18);
      geo.rotateX(-Math.PI / 2);
      geometries.add(geo);
      const water = new THREE.Mesh(geo, waterMat);
      water.position.set(pool.x, 0.26, pool.z);
      water.receiveShadow = true;
      root.add(water);
      wavePoolMesh = water;
      waveGeometry = geo;
      waveBasePositions = Float32Array.from(
        (geo.getAttribute('position').array as Float32Array),
      );
      for (let i = 0; i < 6; i++) {
        addBox(
          root,
          steelMat,
          2.1,
          0.55,
          1.4,
          pool.x - pool.w * 0.34 + i * 2.7,
          0.28,
          pool.z - pool.d * 0.5 + 0.2,
          0,
          false,
        );
      }
      addSign(root, 'Hurricane Bay Wave Pool', '#67e8f9', 7.6, 1.1, pool.x, 1.1, pool.z - pool.d * 0.5 - 1.4);
    } else {
      addBox(root, waterMat, pool.w - 1.0, 0.06, pool.d - 1.0, pool.x, 0.24, pool.z, 0, false);
      for (let i = -1; i <= 1; i++) {
        addBox(root, whiteMat, 0.22, 0.035, pool.d * 0.76, pool.x + i * pool.w * 0.26, 0.28, pool.z, 0, false);
      }
    }
    if (pool.id === 'kids') {
      for (let i = 0; i < 5; i++) {
        addCylinder(root, waterMat, 0.05, 0.3, 2.8 + (i % 2) * 0.8, pool.x - 8 + i * 4, 1.4, pool.z + 2, 8);
      }
    }
    // Two simple stainless ladders at the shallow end.
    for (const side of [-1, 1]) {
      const ladder = strutBetween(
        new THREE.Vector3(pool.x + side * (pool.w * 0.5 - 1.4), 0.1, pool.z + pool.d * 0.32),
        new THREE.Vector3(pool.x + side * (pool.w * 0.5 - 1.4), 1.25, pool.z + pool.d * 0.32),
        0.065,
        steelMat,
        geometries,
      );
      root.add(ladder);
    }
    addSign(root, pool.name, '#a7f3d0', 6.2, 0.9, pool.x, 1.0, pool.z - pool.d * 0.5 - 1.4);
  }

  // Lazy river: a 40 x 37 m rounded current loop with an animated inner-tube
  // flotilla and a shallow basin that runs under the deck bridges.
  const lazyCurve = roundedRectCurve(
    WATERPARK_LAZY_RIVER.halfW,
    WATERPARK_LAZY_RIVER.halfD,
    WATERPARK_LAZY_RIVER.corner,
    0.28,
  );
  const lazyWaterGeo = buildClosedFlatRibbon(lazyCurve, WATERPARK_LAZY_RIVER.width, 190);
  geometries.add(lazyWaterGeo);
  const lazyWater = new THREE.Mesh(lazyWaterGeo, waterMat);
  lazyWater.receiveShadow = true;
  root.add(lazyWater);
  const lazyBaseGeo = buildClosedFlatRibbon(
    new THREE.CatmullRomCurve3(
      lazyCurve.points.map((p) => new THREE.Vector3(p.x, -0.25, p.z)),
      true,
      'centripetal',
    ),
    WATERPARK_LAZY_RIVER.width + 1.2,
    150,
  );
  geometries.add(lazyBaseGeo);
  root.add(new THREE.Mesh(lazyBaseGeo, poolFloorMat));
  for (const offset of [-1, 1]) {
    const edgePoints: THREE.Vector3[] = [];
    for (let i = 0; i <= 90; i++) {
      const p = lazyCurve.getPointAt(i / 90);
      const t = lazyCurve.getTangentAt(i / 90).normalize();
      const right = new THREE.Vector3().crossVectors(t, UP).normalize();
      edgePoints.push(p.clone().addScaledVector(right, (WATERPARK_LAZY_RIVER.width * 0.5 + 0.2) * offset));
    }
    const rail = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(edgePoints, true, 'centripetal'),
      140,
      0.18,
      6,
      true,
    );
    geometries.add(rail);
    root.add(new THREE.Mesh(rail, poolWallMat));
  }
  const lazySamples = buildPathSamples(lazyCurve, 180);
  const lazyLength = lazyCurve.getLength();
  for (let i = 0; i < 10; i++) {
    const tubeGroup = new THREE.Group();
    const ringGeo = new THREE.TorusGeometry(0.75, 0.23, 8, 14);
    geometries.add(ringGeo);
    const ringMat = new THREE.MeshStandardMaterial({
      color: i % 2 === 0 ? 0xf25f5c : 0x4cc9f0,
      roughness: 0.42,
    });
    materials.add(ringMat);
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.18;
    tubeGroup.add(ring);
    addCylinder(tubeGroup, whiteMat, 0.36, 0.36, 0.18, 0, 0.22, 0, 10);
    root.add(tubeGroup);
    innerTubes.push({ mesh: tubeGroup, offset: (i / 10) * lazyLength });
  }
  addSign(root, 'Bayou Slow Current', '#67e8f9', 7.4, 1.05, 0, 1.0, -40.5);

  // Four towers with real support/brace geometry, an elevator core, spiral
  // stairs and a top launch platform.
  for (const tower of WATERPARK_TOWERS) {
    const towerGroup = new THREE.Group();
    towerGroup.position.set(tower.x, 0, tower.z);
    root.add(towerGroup);
    const legOffsets = [
      [-3.3, -3.3],
      [3.3, -3.3],
      [-3.3, 3.3],
      [3.3, 3.3],
    ] as const;
    for (const [lx, lz] of legOffsets) {
      addBox(towerGroup, concreteMat, 0.65, tower.height, 0.65, lx, tower.height * 0.5, lz);
    }
    addCylinder(towerGroup, steelMat, 2.05, 2.3, tower.height + 0.3, 0, tower.height * 0.5, 0, 20);
    for (let y = 4; y < tower.height - 2; y += 5.5) {
      addBox(towerGroup, steelMat, 7.6, 0.18, 0.18, 0, y, -3.3);
      addBox(towerGroup, steelMat, 7.6, 0.18, 0.18, 0, y, 3.3);
      addBox(towerGroup, steelMat, 0.18, 0.18, 7.6, -3.3, y, 0);
      addBox(towerGroup, steelMat, 0.18, 0.18, 7.6, 3.3, y, 0);
      addBox(towerGroup, steelMat, 7.8, 0.14, 0.14, 0, y, -3.3, Math.PI / 4);
    }
    addBox(towerGroup, concreteMat, 9.2, 0.5, 9.2, 0, tower.height, 0);
    addBox(towerGroup, poolWallMat, 9.7, 0.18, 9.7, 0, tower.height + 0.3, 0);
    for (const [px, pz] of [[-3.8, -3.8], [3.8, -3.8], [-3.8, 3.8], [3.8, 3.8]] as const) {
      addBox(towerGroup, steelMat, 0.18, 5.2, 0.18, px, tower.height + 2.8, pz);
    }
    const towerRoofMat = new THREE.MeshStandardMaterial({ color: tower.color, roughness: 0.55 });
    materials.add(towerRoofMat);
    addBox(towerGroup, towerRoofMat, 10.4, 0.45, 10.4, 0, tower.height + 5.3, 0);
    addBox(towerGroup, whiteMat, 6.4, 1.8, 0.25, 0, tower.height + 4.4, 0, 0);
    addSign(towerGroup, tower.name, tower.color, 7.2, 1.0, 0, tower.height + 4.4, 0.16, 0);
    // Spiral emergency stair around the elevator core.
    const stairPoints: THREE.Vector3[] = [];
    const turns = tower.height > 50 ? 4 : tower.height > 30 ? 3 : 2;
    const stairSteps = 86;
    for (let i = 0; i <= stairSteps; i++) {
      const t = i / stairSteps;
      const angle = t * turns * Math.PI * 2;
      stairPoints.push(
        new THREE.Vector3(
          Math.cos(angle) * 4.55,
          0.35 + t * (tower.height - 0.7),
          Math.sin(angle) * 4.55,
        ),
      );
    }
    const stairCurve = new THREE.CatmullRomCurve3(stairPoints, false, 'centripetal');
    const stair = buildOpenSlideGeometry(stairCurve, 1.45, 0.42, 130);
    geometries.add(stair.shell);
    railGeos.push(stair.leftRail, stair.rightRail);
    const stairMesh = new THREE.Mesh(stair.shell, concreteMat);
    stairMesh.castShadow = true;
    towerGroup.add(stairMesh);
    addSign(towerGroup, `${WATERPARK_SLIDES.filter((s) => s.tower === tower.id).length} slides`, '#fef3c7', 4.6, 0.7, 0, 2.7, 6.1, 0);
  }

  // Slide shells, water ribbons, edge tubes, supports, rings and splash mouths.
  const slidesByTower = new Map<string, WaterparkSlideSpec[]>();
  for (const spec of WATERPARK_SLIDES) {
    const list = slidesByTower.get(spec.tower) ?? [];
    list.push(spec);
    slidesByTower.set(spec.tower, list);
  }

  for (const spec of WATERPARK_SLIDES) {
    const rawPath = buildWaterparkSlidePath(spec).map(
      (p) => new THREE.Vector3(p.x, p.y - WATERPARK_DECK_Y, p.z),
    );
    const curve = new THREE.CatmullRomCurve3(rawPath, false, 'centripetal');
    const length = curve.getLength();
    const samples = buildPathSamples(curve, Math.max(80, Math.min(260, Math.round(length / 0.7))));
    const tower = WATERPARK_TOWERS.find((t) => t.id === spec.tower) ?? WATERPARK_TOWERS[0];
    const siblings = slidesByTower.get(spec.tower) ?? [spec];
    const index = siblings.findIndex((s) => s.id === spec.id);
    const boardingRadius = tower.id === 'main' || tower.id === 'east' ? 8.4 : 7.2;
    const angle =
      (index / Math.max(1, siblings.length)) * Math.PI * 2 +
      (tower.id === 'main' ? 0.18 : tower.id === 'east' ? 0.9 : tower.id === 'family' ? 1.7 : 2.4);
    const boarding = {
      x: tower.x + Math.cos(angle) * boardingRadius,
      z: tower.z + Math.sin(angle) * boardingRadius,
    };
    slides.push({ spec, curve, samples, length, boarding });

    // Metal or plastic shell.
    const isEnclosed = spec.kind === 'tube' || spec.kind === 'drop';
    const width = slideWidth(spec.kind);
    const shellMat = new THREE.MeshStandardMaterial({
      color: spec.color,
      roughness: isEnclosed ? 0.3 : 0.4,
      metalness: isEnclosed ? 0.06 : 0.01,
      side: THREE.DoubleSide,
    });
    materials.add(shellMat);
    if (isEnclosed) {
      const tube = new THREE.TubeGeometry(
        curve,
        Math.max(32, Math.round(length * 0.45)),
        width * 0.62,
        9,
        false,
      );
      geometries.add(tube);
      const shell = new THREE.Mesh(tube, shellMat);
      shell.castShadow = true;
      shell.receiveShadow = true;
      root.add(shell);
      const waterTube = new THREE.TubeGeometry(
        curve,
        Math.max(24, Math.round(length * 0.32)),
        width * 0.28,
        7,
        false,
      );
      geometries.add(waterTube);
      root.add(new THREE.Mesh(waterTube, waterMat));
    } else {
      const channel = buildOpenSlideGeometry(
        curve,
        width,
        slideWallHeight(spec.kind),
        Math.max(70, Math.min(220, Math.round(length / 0.6))),
      );
      geometries.add(channel.shell);
      geometries.add(channel.water);
      railGeos.push(channel.leftRail, channel.rightRail);
      const shell = new THREE.Mesh(channel.shell, shellMat);
      shell.castShadow = true;
      shell.receiveShadow = true;
      root.add(shell);
      const waterRibbon = new THREE.Mesh(channel.water, waterMat);
      waterRibbon.receiveShadow = true;
      root.add(waterRibbon);
    }

    // Slide mouth at the launch platform and splash mouth at the pool.
    const start = rawPath[0];
    const end = rawPath[rawPath.length - 1];
    const startTan = curve.getTangentAt(0).normalize();
    const startUp = new THREE.Vector3().crossVectors(
      new THREE.Vector3().crossVectors(startTan, UP).normalize(),
      startTan,
    ).normalize();
    const startRingGeo = new THREE.TorusGeometry(width * 0.68, 0.14, 6, 18);
    geometries.add(startRingGeo);
    const startRing = new THREE.Mesh(startRingGeo, whiteMat);
    startRing.position.copy(start);
    startRing.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), startTan);
    startRing.position.addScaledVector(startUp, width * 0.5);
    root.add(startRing);
    addBox(root, steelMat, 3.4, 0.3, 3.4, start.x, start.y - 0.15, start.z);
    addBox(root, whiteMat, 2.4, 1.7, 0.25, start.x, start.y + 0.9, start.z + 1.5);
    addSign(root, spec.name, spec.accent, 2.4, 0.42, start.x, start.y + 0.9, start.z + 1.64);
    const splashGeo = new THREE.TorusGeometry(width * 0.9, 0.25, 7, 22);
    geometries.add(splashGeo);
    const splash = new THREE.Mesh(splashGeo, foamMat);
    splash.position.copy(end).add(new THREE.Vector3(0, 0.12, 0));
    splash.rotation.x = Math.PI / 2;
    root.add(splash);

    // Rings and supports. Both are instanced, keeping 28 long slides cheap.
    const ringStep = Math.max(3, Math.round(samples.length / 28));
    for (let i = 4; i < samples.length - 2; i += ringStep) {
      const s = samples[i];
      const matrix = new THREE.Matrix4();
      const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), s.tangent);
      const scale = new THREE.Vector3(width * 0.62, width * 0.62, 1);
      matrix.compose(s.point.clone(), quat, scale);
      ringMatrices.push(matrix);
    }
    const postStep = Math.max(4, Math.round(samples.length / 16));
    for (let i = 6; i < samples.length - 3; i += postStep) {
      const s = samples[i];
      if (s.point.y < 1.3) continue;
      const matrix = new THREE.Matrix4();
      const scale = new THREE.Vector3(0.19, s.point.y, 0.19);
      matrix.compose(new THREE.Vector3(s.point.x, s.point.y * 0.5, s.point.z), new THREE.Quaternion(), scale);
      postMatrices.push(matrix);
    }

    // Queue kiosk at the tower base.
    const kiosk = new THREE.Group();
    kiosk.position.set(boarding.x, 0.02, boarding.z);
    const faceYaw = Math.atan2(tower.x - boarding.x, tower.z - boarding.z);
    kiosk.rotation.y = faceYaw;
    root.add(kiosk);
    addBox(kiosk, woodMat, 2.8, 0.18, 1.4, 0, 0.08, 0);
    addBox(kiosk, whiteMat, 1.8, 1.12, 0.28, 0, 0.55, 0);
    const kioskAccent = new THREE.MeshStandardMaterial({ color: spec.color, roughness: 0.6 });
    materials.add(kioskAccent);
    addBox(kiosk, kioskAccent, 2.4, 0.16, 0.6, 0, 1.18, 0.2);
    addSign(kiosk, spec.name, spec.accent, 2.9, 0.52, 0, 1.74, 0.14);
    for (const side of [-1, 1]) {
      addBox(kiosk, steelMat, 0.08, 1.25, 0.08, side * 1.1, 0.75, 0.5);
    }
  }

  // Merge edge rails into one draw call.
  const mergedRails = mergeGeometries(railGeos, false);
  if (mergedRails) {
    geometries.add(mergedRails);
    const rails = new THREE.Mesh(mergedRails, whiteMat);
    rails.castShadow = true;
    root.add(rails);
  } else {
    for (const rail of railGeos) {
      geometries.add(rail);
      root.add(new THREE.Mesh(rail, whiteMat));
    }
  }

  const postGeo = new THREE.CylinderGeometry(1, 1, 1, 6);
  geometries.add(postGeo);
  const posts = new THREE.InstancedMesh(postGeo, steelMat, postMatrices.length);
  for (let i = 0; i < postMatrices.length; i++) posts.setMatrixAt(i, postMatrices[i]);
  posts.instanceMatrix.needsUpdate = true;
  posts.castShadow = true;
  root.add(posts);

  const ringGeo = new THREE.TorusGeometry(1, 0.065, 5, 12);
  geometries.add(ringGeo);
  const ringMesh = new THREE.InstancedMesh(ringGeo, whiteMat, ringMatrices.length);
  for (let i = 0; i < ringMatrices.length; i++) ringMesh.setMatrixAt(i, ringMatrices[i]);
  ringMesh.instanceMatrix.needsUpdate = true;
  root.add(ringMesh);

  // Giant dump bucket and its shallow splash deck.
  const bucket = new THREE.Group();
  bucket.position.set(WATERPARK_DUMP_BUCKET.x, 0, WATERPARK_DUMP_BUCKET.z);
  root.add(bucket);
  const bucketTop = WATERPARK_DUMP_BUCKET.top;
  for (const side of [-1, 1]) {
    const strut = strutBetween(
      new THREE.Vector3(side * 4.3, 0, 0),
      new THREE.Vector3(side * 2.1, bucketTop + 3.2, 0),
      0.23,
      steelMat,
      geometries,
    );
    bucket.add(strut);
  }
  addBox(bucket, steelMat, 9.2, 0.26, 0.3, 0, bucketTop - 0.5, 0);
  addBox(bucket, steelMat, 0.3, 0.26, 3.0, 0, bucketTop - 0.5, 0);
  const bucketPivot = new THREE.Group();
  bucketPivot.position.set(0, bucketTop + 2.2, 0);
  bucket.add(bucketPivot);
  const bucketShell = new THREE.Mesh(
    new THREE.CylinderGeometry(4.2, 3.5, 5.0, 24, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.58,
      metalness: 0.35,
      side: THREE.DoubleSide,
    }),
  );
  geometries.add(bucketShell.geometry);
  bucketPivot.add(bucketShell);
  const bucketBottom = new THREE.Mesh(
    new THREE.CylinderGeometry(3.5, 3.5, 0.28, 24),
    steelMat,
  );
  geometries.add(bucketBottom.geometry);
  bucketBottom.position.y = -2.4;
  bucketPivot.add(bucketBottom);
  const bucketWater = new THREE.Mesh(
    new THREE.CylinderGeometry(3.72, 3.72, 0.18, 24),
    waterMat,
  );
  geometries.add(bucketWater.geometry);
  bucketWater.position.y = 1.75;
  bucketPivot.add(bucketWater);
  addCylinder(bucketPivot, steelMat, 0.16, 0.16, 4.6, 4.18, 0, 0, 8).rotation.z = Math.PI / 2;
  const bucketStream = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 3.1, bucketTop + 1, 14, 1, true),
    waterMat,
  );
  geometries.add(bucketStream.geometry);
  bucketStream.position.set(0, -0.5 - bucketTop * 0.5 + 1.0, 0);
  bucketStream.visible = false;
  bucket.add(bucketStream);
  const bucketSplash = new THREE.Mesh(
    new THREE.TorusGeometry(4.4, 0.45, 7, 24),
    foamMat,
  );
  geometries.add(bucketSplash.geometry);
  bucketSplash.rotation.x = Math.PI / 2;
  bucketSplash.position.y = 0.3;
  bucketSplash.visible = false;
  bucket.add(bucketSplash);
  addSign(bucket, '1,500 GALLON DUMP', '#fef3c7', 5.6, 0.9, 0, bucketTop + 6.4, 0);
  addSign(bucket, 'Delta Dump Bucket', '#fbbf24', 5.8, 0.85, 0, 2.6, 4.8);

  // Access bridge from the rear of the hill shelter, with handrails and terrain
  // supports. The bridge is part of this model so the player walks straight in.
  const bridge = getWaterparkBridgeLine();
  const start = new THREE.Vector3(
    bridge.x0 - WATERPARK_SITE.x,
    bridge.y0 - WATERPARK_DECK_Y,
    bridge.z0 - WATERPARK_SITE.z,
  );
  const end = new THREE.Vector3(
    bridge.x1 - WATERPARK_SITE.x,
    bridge.y1 - WATERPARK_DECK_Y,
    bridge.z1 - WATERPARK_SITE.z,
  );
  const mid = start.clone().lerp(end, 0.5);
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const dy = end.y - start.y;
  const len = Math.hypot(dx, dz);
  const bridgeLength = Math.hypot(len, dy);
  const bridgeYaw = -Math.atan2(dz, dx);
  const bridgePitch = Math.atan2(dy, len);
  const bridgeGroup = new THREE.Group();
  bridgeGroup.position.copy(mid);
  bridgeGroup.rotation.order = 'YXZ';
  bridgeGroup.rotation.y = bridgeYaw;
  bridgeGroup.rotation.z = bridgePitch;
  root.add(bridgeGroup);
  addBox(bridgeGroup, deckMat, bridgeLength, 0.32, 4.2, 0, 0, 0);
  addBox(bridgeGroup, woodMat, bridgeLength, 0.12, 4.8, 0, 0.22, 0);
  for (const side of [-1, 1]) {
    addBox(bridgeGroup, steelMat, bridgeLength, 0.08, 0.08, 0, 1.35, side * 2.1);
    for (let i = 0; i <= 12; i++) {
      const px = -bridgeLength * 0.5 + (bridgeLength * i) / 12;
      addBox(bridgeGroup, steelMat, 0.07, 1.2, 0.07, px, 0.75, side * 2.1);
    }
  }
  for (let i = 1; i <= 5; i++) {
    const t = i / 6;
    const worldX = bridge.x0 + (bridge.x1 - bridge.x0) * t;
    const worldZ = bridge.z0 + (bridge.z1 - bridge.z0) * t;
    const ground = sampleTerrainHeight(worldX, worldZ) - WATERPARK_DECK_Y;
    const deckY = start.y + (end.y - start.y) * t;
    if (deckY - ground > 1.0) {
      const lx = start.x + (end.x - start.x) * t;
      const lz = start.z + (end.z - start.z) * t;
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, deckY - ground, 6),
        steelMat,
      );
      geometries.add(post.geometry);
      post.position.set(lx, ground + (deckY - ground) * 0.5, lz);
      root.add(post);
    }
  }
  addSign(
    root,
    `${WATERPARK_NAME} — ${WATERPARK_SLIDES.length} slides · lazy river · wave pool`,
    '#fef3c7',
    12.5,
    1.05,
    38,
    4.1,
    -44.2,
    0,
  );
  for (const side of [-1, 1]) {
    addCylinder(root, woodMat, 0.42, 0.55, 5.1, 38 + side * 5.6, 2.55, -44.2, 10);
    addCylinder(root, woodMat, 0.38, 0.46, 3.8, 38 + side * 5.6, 6.5, -44.2, 10);
  }

  // Locker building, restrooms and a shaded cabana row.
  const locker = new THREE.Group();
  locker.position.set(42, 0, -18);
  root.add(locker);
  addBox(locker, new THREE.MeshStandardMaterial({ color: 0x6d7b8a, roughness: 0.78 }), 7.2, 3.8, 5.2, 0, 1.9, 0);
  addBox(locker, whiteMat, 7.8, 0.35, 5.8, 0, 3.95, 0);
  for (let i = 0; i < 8; i++) addBox(locker, steelMat, 0.7, 0.85, 0.18, -2.45 + (i % 4) * 1.7, 1.3, -2.66);
  addSign(locker, 'Lockers · Showers', '#bae6fd', 5.8, 0.8, 0, 3.3, 2.65);
  for (let i = 0; i < 5; i++) {
    const cabana = new THREE.Group();
    cabana.position.set(-42 + i * 8.8, 0, -32);
    root.add(cabana);
    addBox(cabana, whiteMat, 6.6, 0.12, 4.4, 0, 0.06, 0);
    for (const px of [-2.7, 2.7]) {
      for (const pz of [-1.6, 1.6]) {
        addBox(cabana, woodMat, 0.14, 2.9, 0.14, px, 1.45, pz);
      }
    }
    const cabanaRoofMat = new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? 0xf4c15f : 0x7cc7b7, roughness: 0.7 });
    materials.add(cabanaRoofMat);
    addBox(cabana, cabanaRoofMat, 7.0, 0.18, 4.9, 0, 3.0, 0);
    addBox(cabana, whiteMat, 3.3, 0.14, 1.1, 0, 0.68, 0.2);
    addBox(cabana, woodMat, 0.14, 0.68, 0.14, -1.55, 0.34, 0.2);
    addBox(cabana, woodMat, 0.14, 0.68, 0.14, 1.55, 0.34, 0.2);
  }

  // Palms around the promenade.
  for (let i = 0; i < 18; i++) {
    const angle = (i / 18) * Math.PI * 2 + 0.2;
    const radius = 43 + (i % 2) * 1.0;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius * 0.92;
    const palm = new THREE.Group();
    palm.position.set(x, 0, z);
    const h = 5.4 + (i % 4) * 0.7;
    addCylinder(palm, trunkMat, 0.17, 0.32, h, 0, h * 0.5, 0, 7);
    for (let f = 0; f < 7; f++) {
      const leafGeo = new THREE.ConeGeometry(0.55, 3.4, 3);
      geometries.add(leafGeo);
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      const a = (f / 7) * Math.PI * 2;
      leaf.position.set(Math.cos(a) * 1.2, h - 0.15, Math.sin(a) * 1.2);
      leaf.rotation.z = Math.PI / 2.5;
      leaf.rotation.y = -a;
      leaf.scale.z = 0.32;
      palm.add(leaf);
    }
    root.add(palm);
  }

  // A small food shack by the entry plaza.
  const shack = new THREE.Group();
  shack.position.set(38, 0, -30);
  root.add(shack);
  addBox(shack, woodMat, 7.0, 3.2, 4.4, 0, 1.6, 0);
  const shackRoofMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.58 });
  const shackTrimMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.6 });
  materials.add(shackRoofMat);
  materials.add(shackTrimMat);
  addBox(shack, shackRoofMat, 7.8, 0.4, 5.2, 0, 3.6, 0);
  addBox(shack, whiteMat, 4.8, 0.12, 1.2, 0, 1.05, 2.3);
  addBox(shack, shackTrimMat, 7.8, 0.6, 0.3, 0, 2.85, 2.25);
  addSign(shack, 'Bayou Bites · Snowballs', '#fde68a', 6.4, 0.8, 0, 4.2, 2.3);

  // Merge static meshes by material. Towers, bracing, kiosks, cabanas and pool
  // rims otherwise become ~900 draw calls; this keeps the park's draw count in
  // the same range as the rest of the island while preserving every animated
  // bucket, wave-pool plane and lazy-river tube.
  root.updateMatrixWorld(true);
  const preserved = new Set<THREE.Object3D>();
  const markPreserved = (object: THREE.Object3D | null) => {
    let cursor: THREE.Object3D | null = object;
    while (cursor && cursor !== root) {
      preserved.add(cursor);
      cursor = cursor.parent;
    }
  };
  if (wavePoolMesh) markPreserved(wavePoolMesh);
  if (bucketPivot) markPreserved(bucketPivot);
  if (bucketWater) markPreserved(bucketWater);
  if (bucketStream) markPreserved(bucketStream);
  if (bucketSplash) markPreserved(bucketSplash);
  for (const tube of innerTubes) markPreserved(tube.mesh);
  const rootInverse = root.matrixWorld.clone().invert();
  const mergeBuckets = new Map<THREE.Material, THREE.Mesh[]>();
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh) || obj instanceof THREE.InstancedMesh) return;
    if (preserved.has(obj) || Array.isArray(obj.material)) return;
    let cursor: THREE.Object3D | null = obj;
    while (cursor && cursor !== root) {
      if (preserved.has(cursor)) return;
      cursor = cursor.parent;
    }
    if (!obj.geometry.getAttribute('position')) return;
    const list = mergeBuckets.get(obj.material) ?? [];
    list.push(obj);
    mergeBuckets.set(obj.material, list);
  });
  for (const [material, meshes] of mergeBuckets) {
    if (meshes.length < 2) continue;
    const parts: THREE.BufferGeometry[] = [];
    let castShadow = false;
    let receiveShadow = false;
    for (const mesh of meshes) {
      const geo = mesh.geometry.clone();
      geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(rootInverse, mesh.matrixWorld));
      parts.push(geo);
      castShadow = castShadow || mesh.castShadow;
      receiveShadow = receiveShadow || mesh.receiveShadow;
    }
    const merged = mergeGeometries(parts, false);
    if (!merged) {
      for (const part of parts) part.dispose();
      continue;
    }
    geometries.add(merged);
    const mesh = new THREE.Mesh(merged, material);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = receiveShadow;
    root.add(mesh);
    for (const old of meshes) old.parent?.remove(old);
    for (const part of parts) part.dispose();
  }

  return {
    root,
    slides,
    lazySamples,
    lazyLength,
    wavePoolMesh,
    waveGeometry,
    waveBasePositions,
    bucketPivot,
    bucketWater,
    bucketStream,
    bucketSplash,
    innerTubes,
    dispose: () => {
      for (const geo of geometries) geo.dispose();
      for (const mat of materials) mat.dispose();
      for (const texture of textures) texture.dispose();
    },
  };
}
