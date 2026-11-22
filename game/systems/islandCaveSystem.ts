import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { getTerrainHeight, getTerrainSurfaceHeight } from '../world/terrain';
import type { CaveTerrainOpening } from '../world/caveTerrainOpenings';

export type CaveType =
  | 'regular'
  | 'civilization'
  | 'monster-boss'
  | 'lush'
  | 'crystal'
  | 'red-dragon';

export type Cave = {
  id: string;
  type: CaveType;
  position: THREE.Vector3;
  discovered: boolean;
  built: boolean;
};

export const CAVE_TOTAL = 5000;
/** Kept for save/UI compatibility. Visual streaming uses a much tighter radius. */
export const LOAD_DISTANCE = 450;

/** Nearby entrances are fully meshed; beyond this the hillside is left intact. */
export const CAVE_STREAM_DISTANCE = 54;
export const CAVE_SPECIAL_STREAM_DISTANCE = 92;
export const CAVE_UNLOAD_DISTANCE = 72;
// Keep only a handful of caves meshed around the player. With the 5,000-cave
// registry spanning the island, the old 44-cave cap packed multiple arches into
// the same hillside and made caves feel like they were everywhere.
export const CAVE_MAX_ACTIVE = 10;
/** Minimum world distance between two live cave mouths, so entrances never stack. */
export const CAVE_MIN_ACTIVE_SPACING = 28;
/** Regular caves meshed per streaming pass; keeps geometry upload spikes smooth. */
const CAVE_REGULAR_BUILDS_PER_UPDATE = 1;

const PLAYER_HEIGHT = 1.72;
const PORTAL_MIN_WIDTH = 1.85;
const PORTAL_MIN_HEIGHT = 2.7;

/**
 * Yaw that points a tunnel's local -Z axis uphill, so cave mouths are bored
 * into a hill/mountain flank and face downhill toward the player.
 */
export function getCaveEntranceYaw(x: number, z: number): number {
  const e = 1.5;
  const gx =
    (getTerrainSurfaceHeight(x + e, z) - getTerrainSurfaceHeight(x - e, z)) /
    (2 * e);
  const gz =
    (getTerrainSurfaceHeight(x, z + e) - getTerrainSurfaceHeight(x, z - e)) /
    (2 * e);
  if (Math.abs(gx) + Math.abs(gz) < 0.04) return 0;
  return Math.atan2(-gx, -gz);
}

const TUNNEL_BURY_MARGIN = 0.35;
const TUNNEL_ENVELOPE_SAMPLES = 32;

/**
 * Sinks a bore until its whole length sits under the rendered hillside. Kept
 * for compatibility with the entrance-placement audit tests; the new tunnel
 * builder uses per-sample floor fitting so the visible mouth stays at grade.
 */
export function computeTunnelSink(
  originX: number,
  originZ: number,
  baseY: number,
  yaw: number,
  path: THREE.Curve<THREE.Vector3>,
  radius: number,
): number {
  let sink = radius + 0.45;
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  for (let i = 0; i <= TUNNEL_ENVELOPE_SAMPLES; i++) {
    const point = path.getPointAt(i / TUNNEL_ENVELOPE_SAMPLES);
    const worldX = originX + point.x * cos + point.z * sin;
    const worldZ = originZ - point.x * sin + point.z * cos;
    const terrain = getTerrainSurfaceHeight(worldX, worldZ);
    sink = Math.max(sink, baseY + point.y + radius + TUNNEL_BURY_MARGIN - terrain);
  }
  return sink;
}

export interface CaveWalkSurface {
  caveId: string;
  caveType: CaveType;
  floorY: number;
  ceilingY: number;
  halfWidth: number;
  centerX: number;
  centerZ: number;
  /** 0 at the downhill apron, 1 at the deepest end of the tunnel. */
  t: number;
}

interface CaveSample {
  /** Local X inside the yawed cave group. */
  lx: number;
  /** Local Z inside the yawed cave group. */
  lz: number;
  worldX: number;
  worldZ: number;
  floorY: number;
  ceilingY: number;
  springY: number;
  halfWidth: number;
  t: number;
}

interface ActiveCave {
  cave: Cave;
  group: THREE.Group;
  samples: CaveSample[];
  opening: CaveTerrainOpening;
  yaw: number;
  mouthX: number;
  mouthZ: number;
  mouthFloorY: number;
  maxCollisionRadius: number;
  light?: THREE.PointLight;
}

function hashString(value: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function localToWorld(
  x: number,
  z: number,
  yaw: number,
  localX: number,
  localZ: number,
): { x: number; z: number } {
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  return {
    x: x + localX * cos + localZ * sin,
    z: z - localX * sin + localZ * cos,
  };
}

function cavePalette(type: CaveType): {
  rock: number;
  floor: number;
  beacon: number;
  emissive: number;
} {
  switch (type) {
    case 'red-dragon':
      return { rock: 0x3f1712, floor: 0x2c1510, beacon: 0xef4444, emissive: 0xdc2626 };
    case 'monster-boss':
      return { rock: 0x312e42, floor: 0x24232f, beacon: 0xa855f7, emissive: 0x7e22ce };
    case 'civilization':
      return { rock: 0x5b4a32, floor: 0x40382b, beacon: 0xfbbf24, emissive: 0xd97706 };
    case 'crystal':
      return { rock: 0x263442, floor: 0x1b2934, beacon: 0x38bdf8, emissive: 0x0284c7 };
    case 'lush':
      return { rock: 0x2d4532, floor: 0x243625, beacon: 0x4ade80, emissive: 0x16a34a };
    default:
      return { rock: 0x4e4a43, floor: 0x36332e, beacon: 0x94a3b8, emissive: 0x475569 };
  }
}

function caveDimensions(type: CaveType, rand: () => number): {
  halfWidth: number;
  height: number;
  length: number;
  depth: number;
} {
  switch (type) {
    case 'red-dragon':
      return { halfWidth: 4.1, height: 5.3, length: 58, depth: 19 };
    case 'monster-boss':
      return { halfWidth: 3.7, height: 4.8, length: 50, depth: 16 };
    case 'civilization':
      return { halfWidth: 3.45, height: 4.3, length: 48, depth: 14 };
    case 'crystal':
      return { halfWidth: 3.15, height: 4.0, length: 45, depth: 13 };
    case 'lush':
      return { halfWidth: 3.05, height: 3.9, length: 44, depth: 12 };
    default:
      return {
        halfWidth: 2.25 + rand() * 0.35,
        height: 3.1 + rand() * 0.5,
        length: 31 + rand() * 13,
        depth: 9 + rand() * 5,
      };
  }
}

function findNearestSample(
  samples: CaveSample[],
  x: number,
  z: number,
): { sample: CaveSample; t: number; lateral: number; minDistSq: number } | null {
  if (samples.length === 0) return null;
  let bestDistSq = Infinity;
  let bestIndex = 0;
  let bestT = 0;
  let bestCx = samples[0].worldX;
  let bestCz = samples[0].worldZ;

  for (let i = 0; i < samples.length - 1; i++) {
    const a = samples[i];
    const b = samples[i + 1];
    const dx = b.worldX - a.worldX;
    const dz = b.worldZ - a.worldZ;
    const lengthSq = dx * dx + dz * dz;
    let t = 0;
    if (lengthSq > 1e-8) {
      t = Math.max(0, Math.min(1, ((x - a.worldX) * dx + (z - a.worldZ) * dz) / lengthSq));
    }
    const cx = a.worldX + dx * t;
    const cz = a.worldZ + dz * t;
    const ox = x - cx;
    const oz = z - cz;
    const distSq = ox * ox + oz * oz;
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      bestIndex = i;
      bestT = t;
      bestCx = cx;
      bestCz = cz;
    }
  }

  const a = samples[bestIndex];
  const b = samples[Math.min(samples.length - 1, bestIndex + 1)];
  const t = bestIndex / Math.max(1, samples.length - 1) +
    (bestT / Math.max(1, samples.length - 1));
  const sample: CaveSample = {
    lx: a.lx + (b.lx - a.lx) * bestT,
    lz: a.lz + (b.lz - a.lz) * bestT,
    worldX: bestCx,
    worldZ: bestCz,
    floorY: a.floorY + (b.floorY - a.floorY) * bestT,
    ceilingY: a.ceilingY + (b.ceilingY - a.ceilingY) * bestT,
    springY: a.springY + (b.springY - a.springY) * bestT,
    halfWidth: a.halfWidth + (b.halfWidth - a.halfWidth) * bestT,
    t,
  };
  return {
    sample,
    t,
    lateral: Math.sqrt(bestDistSq),
    minDistSq: bestDistSq,
  };
}

export class IslandCaveSystem {
  caves: Cave[] = [];
  /**
   * Optional live guard used by the engine to keep caves out of player-owned
   * areas (placed structures, crops). Caves that fail it are never discovered,
   * built or left standing.
   */
  isCaveSiteAllowed: ((x: number, z: number) => boolean) | null = null;
  private active = new Map<string, ActiveCave>();

  generate(center: THREE.Vector3, radius: number): Cave[] {
    const special: CaveType[] = [
      'civilization',
      'monster-boss',
      'lush',
      'crystal',
      'red-dragon',
    ];

    this.caves = Array.from({ length: CAVE_TOTAL }, (_, i) => {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.sqrt(Math.random()) * radius;

      return {
        id: `cave-${i}`,
        type: i < special.length ? special[i] : 'regular',
        position: new THREE.Vector3(
          center.x + Math.cos(angle) * distance,
          center.y,
          center.z + Math.sin(angle) * distance,
        ),
        discovered: false,
        built: false,
      };
    });

    return this.caves;
  }

  /** Legacy triangle-cutter retained for the entrance-placement audit. */
  carveTerrain(
    geometry: THREE.BufferGeometry,
    openings: { x: number; z: number; radius: number }[],
  ): boolean {
    const positions = geometry.getAttribute('position');
    const index = geometry.getIndex();
    if (!index || !positions) return false;

    const kept: number[] = [];
    for (let i = 0; i < index.count; i += 3) {
      const a = index.getX(i);
      const b = index.getX(i + 1);
      const c = index.getX(i + 2);
      const x = (positions.getX(a) + positions.getX(b) + positions.getX(c)) / 3;
      const z = (positions.getZ(a) + positions.getZ(b) + positions.getZ(c)) / 3;
      const blocked = openings.some((o) => Math.hypot(x - o.x, z - o.z) < o.radius);
      if (!blocked) kept.push(a, b, c);
    }
    geometry.setIndex(kept);
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    return true;
  }

  /** Builds one cave interior and its rock portal. Public for focused tests. */
  build(cave: Cave, scene: THREE.Scene): void {
    if (this.active.has(cave.id)) return;
    const state = this.createCaveState(cave);
    scene.add(state.group);
    this.active.set(cave.id, state);
    cave.built = true;
    this.refreshLights();
  }

  private createCaveState(cave: Cave): ActiveCave {
    const x = cave.position.x;
    const z = cave.position.z;
    const rand = mulberry32(
      hashString(cave.id) ^
        Math.floor(x * 31.7) ^
        Math.floor(z * 17.3) ^
        (cave.type === 'regular' ? 0 : 7919),
    );
    const yaw = getCaveEntranceYaw(x, z);
    const palette = cavePalette(cave.type);
    const dims = caveDimensions(cave.type, rand);
    const mouthTerrainY = getTerrainSurfaceHeight(x, z);
    const mouthFloorY = mouthTerrainY - 0.02;

    const apronWorld = localToWorld(x, z, yaw, 0, 3.2);
    const apronTerrainY = getTerrainSurfaceHeight(apronWorld.x, apronWorld.z);
    const startFloorY = Math.min(mouthFloorY + 0.14, apronTerrainY - 0.02);

    const controlCount = 8;
    const controlPoints: THREE.Vector3[] = [];
    for (let i = 0; i < controlCount; i++) {
      const t = i / (controlCount - 1);
      const localZ = THREE.MathUtils.lerp(3.2, -dims.length, t);
      let localY: number;
      if (i === 0) {
        localY = startFloorY - mouthFloorY;
      } else if (i === 1) {
        localY = 0;
      } else {
        localY = -Math.pow(t, 1.16) * dims.depth;
      }
      const wave = Math.sin(t * Math.PI * (1.6 + rand() * 0.6)) * dims.halfWidth * 0.34;
      const chamberBulge =
        cave.type !== 'regular' && t > 0.54
          ? Math.sin(((t - 0.54) / 0.46) * Math.PI) * dims.halfWidth * 0.16
          : 0;
      controlPoints.push(
        new THREE.Vector3(wave + chamberBulge, localY, localZ),
      );
    }

    const curve = new THREE.CatmullRomCurve3(controlPoints, false, 'catmullrom', 0.35);
    const sampleCount = 34;
    const samples: CaveSample[] = [];
    for (let i = 0; i <= sampleCount; i++) {
      const t = i / sampleCount;
      const point = curve.getPoint(t);
      const world = localToWorld(x, z, yaw, point.x, point.z);
      const terrainY = getTerrainSurfaceHeight(world.x, world.z);
      let floorY = mouthFloorY + point.y;
      if (point.z >= 0.15) {
        // The open apron follows the visible hillside exactly, so stepping into
        // the entrance never produces a ledge or an invisible drop.
        floorY = terrainY - 0.02;
      } else if (point.z < -9.5) {
        // Only the deep bore is forced under the terrain. Near the mouth the
        // natural rock overhang (built below) supplies the overburden, which
        // avoids an impossible cliff-like drop right inside the entrance.
        floorY = Math.min(floorY, terrainY - dims.height - 0.45);
      }
      const widthPulse =
        0.94 +
        Math.sin(t * Math.PI * 2.3 + rand() * 2.2) * 0.06 +
        (cave.type !== 'regular' && t > 0.56
          ? Math.sin(((t - 0.56) / 0.44) * Math.PI) * 0.16
          : 0);
      const halfWidth = Math.max(
        PORTAL_MIN_WIDTH * 0.5,
        dims.halfWidth * widthPulse,
      );
      const height = dims.height * (0.96 + Math.sin(t * Math.PI * 1.7) * 0.05);
      samples.push({
        lx: point.x,
        lz: point.z,
        worldX: world.x,
        worldZ: world.z,
        floorY,
        ceilingY: floorY + height,
        springY: floorY + Math.min(1.15, height * 0.36),
        halfWidth,
        t,
      });
    }

    const group = new THREE.Group();
    group.userData.caveId = cave.id;
    group.userData.caveType = cave.type;
    group.userData.isCaveInterior = true;
    group.position.set(x, 0, z);
    group.rotation.y = yaw;

    const rockMat = new THREE.MeshStandardMaterial({
      color: palette.rock,
      roughness: 0.98,
      metalness: 0.01,
      vertexColors: true,
      side: THREE.DoubleSide,
    });
    const tunnelMesh = new THREE.Mesh(
      this.buildTunnelGeometry(samples, cave, rand),
      rockMat,
    );
    tunnelMesh.castShadow = false;
    tunnelMesh.receiveShadow = true;
    tunnelMesh.userData.noShadowCast = true;
    group.add(tunnelMesh);

    const floorMat = new THREE.MeshStandardMaterial({
      color: palette.floor,
      roughness: 1,
      metalness: 0,
      vertexColors: true,
      side: THREE.DoubleSide,
    });
    const floorMesh = new THREE.Mesh(
      this.buildFloorGeometry(samples, cave.id),
      floorMat,
    );
    floorMesh.receiveShadow = true;
    floorMesh.userData.noShadowCast = true;
    group.add(floorMesh);

    // Near the mouth the hillside is sometimes too shallow to cover the whole
    // bore. A rugged rock hood supplies the missing overburden and hides the
    // tunnel roof, so the entrance reads as part of the mountain.
    const overhangGeo = this.buildOverhangGeometry(
      samples,
      dims,
      palette,
      rand,
    );
    if (overhangGeo) {
      const overhang = new THREE.Mesh(overhangGeo, rockMat);
      overhang.castShadow = false;
      overhang.receiveShadow = true;
      overhang.userData.noShadowCast = true;
      group.add(overhang);
    }

    group.add(
      this.buildPortalCollar(
        cave,
        x,
        z,
        mouthFloorY,
        dims.halfWidth,
        dims.height,
        palette,
        rand,
      ),
    );

    const light = new THREE.PointLight(palette.beacon, 1.6, 16, 1.7);
    light.position.set(
      0,
      Math.max(mouthFloorY + 2.2, samples[Math.floor(samples.length * 0.45)].floorY + 2),
      0,
    );
    light.visible = false;
    group.add(light);

    this.addInteriorDetails(group, cave, samples, palette, rand);
    this.addRockDetails(group, cave, samples, palette, rand);

    const openingRadius = Math.max(3.6, dims.halfWidth * 1.38);
    return {
      cave,
      group,
      samples,
      opening: { x, z, radius: openingRadius },
      yaw,
      mouthX: x,
      mouthZ: z,
      mouthFloorY,
      maxCollisionRadius: dims.length + 5,
      light,
    };
  }

  private buildTunnelGeometry(
    samples: CaveSample[],
    cave: Cave,
    rand: () => number,
  ): THREE.BufferGeometry {
    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    const ringSize = 10;
    const color = new THREE.Color(cavePalette(cave.type).rock);

    const ringPoints = (sample: CaveSample, tangentX: number, tangentZ: number) => {
      const length = Math.hypot(tangentX, tangentZ) || 1;
      const tx = tangentX / length;
      const tz = tangentZ / length;
      const sx = -tz;
      const sz = tx;
      const w = sample.halfWidth;
      const out: Array<[number, number, number]> = [];
      const add = (lateral: number, y: number) => {
        out.push([
          sample.lx + sx * lateral,
          y,
          sample.lz + sz * lateral,
        ]);
      };
      add(-w, sample.floorY);
      add(w, sample.floorY);
      const rise = Math.max(0.7, sample.ceilingY - sample.springY);
      const archSegments = 8;
      for (let i = 1; i < archSegments; i++) {
        const a = (i / archSegments) * Math.PI;
        add(Math.cos(a) * w, sample.springY + Math.sin(a) * rise);
      }
      add(-w, sample.springY);
      return out;
    };

    // The first few samples form the open downhill apron. The enclosed tube
    // begins at the portal collar, not as a pipe sticking out of the hillside.
    let firstTunnelRing = 0;
    while (
      firstTunnelRing < samples.length - 1 &&
      samples[firstTunnelRing].lz > 0.65
    ) {
      firstTunnelRing++;
    }
    for (let i = firstTunnelRing; i < samples.length; i++) {
      const prev = samples[Math.max(firstTunnelRing, i - 1)];
      const next = samples[Math.min(samples.length - 1, i + 1)];
      const points = ringPoints(
        samples[i],
        next.lx - prev.lx,
        next.lz - prev.lz,
      );
      for (let p = 0; p < points.length; p++) {
        positions.push(points[p][0], points[p][1], points[p][2]);
        const shade = 0.78 + rand() * 0.3;
        colors.push(color.r * shade, color.g * shade, color.b * shade);
      }
    }

    const ringCount = samples.length - firstTunnelRing;
    for (let i = 0; i < ringCount - 1; i++) {
      for (let p = 0; p < ringSize - 1; p++) {
        const a = i * ringSize + p;
        const b = a + 1;
        const c = (i + 1) * ringSize + p;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
      // Close the loop between the left wall and floor-left vertex.
      const a = i * ringSize + ringSize - 1;
      const b = i * ringSize;
      const c = (i + 1) * ringSize + ringSize - 1;
      const d = (i + 1) * ringSize;
      indices.push(a, c, b, b, c, d);
    }

    // Rock end wall so the tunnel is not an open-ended pipe.
    const end = samples[samples.length - 1];
    const endCenter = positions.length / 3;
    positions.push(end.lx, end.floorY + (end.ceilingY - end.floorY) * 0.45, end.lz);
    colors.push(color.r * 0.7, color.g * 0.7, color.b * 0.7);
    const lastRingStart = (ringCount - 1) * ringSize;
    for (let p = 0; p < ringSize; p++) {
      const next = (p + 1) % ringSize;
      indices.push(
        lastRingStart + p,
        lastRingStart + next,
        endCenter,
      );
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    return geometry;
  }

  private buildOverhangGeometry(
    samples: CaveSample[],
    dims: ReturnType<typeof caveDimensions>,
    palette: ReturnType<typeof cavePalette>,
    rand: () => number,
  ): THREE.BufferGeometry | null {
    const hoodSamples = samples.filter(
      (sample) => sample.lz <= 0.65 && sample.lz >= -8.7,
    );
    if (hoodSamples.length < 2) return null;
    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    const hoodPoints = 7;
    const rockColor = new THREE.Color(palette.rock);
    for (let i = 0; i < hoodSamples.length; i++) {
      const sample = hoodSamples[i];
      const prev = hoodSamples[Math.max(0, i - 1)];
      const next = hoodSamples[Math.min(hoodSamples.length - 1, i + 1)];
      const tx = next.lx - prev.lx;
      const tz = next.lz - prev.lz;
      const tangentLength = Math.hypot(tx, tz) || 1;
      const sx = -tz / tangentLength;
      const sz = tx / tangentLength;
      const outerW =
        sample.halfWidth + 1.9 + Math.sin(sample.lz * 1.7) * 0.45;
      const rise = dims.height + 1.7 + Math.cos(sample.lz * 2.1) * 0.4;
      const baseY = sample.floorY - 0.35;
      const profile: Array<[number, number]> = [
        [-outerW, 0],
        [-outerW * 0.94, rise * 0.38],
        [-outerW * 0.62, rise * 0.78],
        [0, rise],
        [outerW * 0.62, rise * 0.78],
        [outerW * 0.94, rise * 0.38],
        [outerW, 0],
      ];
      for (const [lateral, up] of profile) {
        positions.push(
          sample.lx + sx * lateral,
          baseY + up,
          sample.lz + sz * lateral,
        );
        const tint = 0.82 + rand() * 0.3;
        colors.push(
          Math.min(1, rockColor.r * tint),
          Math.min(1, rockColor.g * tint),
          Math.min(1, rockColor.b * tint),
        );
      }
    }
    for (let i = 0; i < hoodSamples.length - 1; i++) {
      for (let j = 0; j < hoodPoints - 1; j++) {
        const a = i * hoodPoints + j;
        const b = a + 1;
        const c = a + hoodPoints;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    return geometry;
  }

  private buildFloorGeometry(
    samples: CaveSample[],
    caveId: string,
  ): THREE.BufferGeometry {
    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    const rand = mulberry32(hashString(`${caveId}-floor`));
    const color = new THREE.Color(cavePalette('regular').floor);
    for (const sample of samples) {
      for (const side of [-1, 1]) {
        positions.push(
          sample.lx + side * sample.halfWidth * 0.92,
          sample.floorY + 0.018,
          sample.lz,
        );
        const shade = 0.76 + rand() * 0.28;
        colors.push(color.r * shade, color.g * shade, color.b * shade);
      }
    }
    for (let i = 0; i < samples.length - 1; i++) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      indices.push(a, c, b, b, c, d);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    return geometry;
  }

  private buildPortalCollar(
    cave: Cave,
    x: number,
    z: number,
    mouthFloorY: number,
    halfWidth: number,
    height: number,
    palette: { rock: number; floor: number; beacon: number; emissive: number },
    rand: () => number,
  ): THREE.Group {
    const portalGroup = new THREE.Group();
    const portalHalfWidth = Math.max(
      PORTAL_MIN_WIDTH * 0.5,
      Math.min(2.3, halfWidth * 0.82),
    );
    const portalHalfHeight = Math.max(
      PORTAL_MIN_HEIGHT * 0.5,
      Math.min(2.7, height * 0.47),
    );
    const outerHalfWidth = Math.max(
      portalHalfWidth + 2.4,
      halfWidth * 1.38 + 1.2,
    );
    const outerHalfHeight = portalHalfHeight + 1.55;

    const shape = new THREE.Shape();
    const outerSegments = 22;
    for (let i = 0; i <= outerSegments; i++) {
      const a = (i / outerSegments) * Math.PI * 2;
      const irregularity =
        1 +
        Math.sin(a * 3.0 + rand() * 2.2) * 0.045 +
        Math.sin(a * 7.0 + rand() * 1.4) * 0.025;
      const px = Math.cos(a) * outerHalfWidth * irregularity;
      const py =
        portalHalfHeight +
        Math.sin(a) * outerHalfHeight * irregularity;
      if (i === 0) shape.moveTo(px, py);
      else shape.lineTo(px, py);
    }
    shape.closePath();

    const hole = new THREE.Path();
    const innerSegments = 18;
    for (let i = 0; i <= innerSegments; i++) {
      const a = (i / innerSegments) * Math.PI * 2;
      const px = Math.cos(a) * portalHalfWidth;
      const py = portalHalfHeight + Math.sin(a) * portalHalfHeight;
      if (i === 0) hole.moveTo(px, py);
      else hole.lineTo(px, py);
    }
    hole.closePath();
    shape.holes.push(hole);

    const collarGeo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.72,
      bevelEnabled: true,
      bevelSize: 0.12,
      bevelThickness: 0.12,
      bevelSegments: 2,
      steps: 1,
    });
    collarGeo.translate(0, 0, -0.56);
    const collarMat = new THREE.MeshStandardMaterial({
      color: palette.rock,
      roughness: 0.99,
      metalness: 0.01,
    });
    const collar = new THREE.Mesh(collarGeo, collarMat);
    collar.position.set(0, mouthFloorY, -0.56);
    collar.rotation.x = this.entrancePitch(x, z);
    collar.castShadow = false;
    collar.receiveShadow = true;
    collar.userData.noShadowCast = true;
    portalGroup.add(collar);

    // Rough rock chunks break up the collar silhouette and blend it into the
    // hillside. They are merged into one mesh to keep the cave to a handful of
    // draw calls while streaming dozens of entrances around the player.
    const chunkMat = new THREE.MeshStandardMaterial({
      color: palette.rock,
      roughness: 1,
      metalness: 0,
    });
    const chunkGeos: THREE.BufferGeometry[] = [];
    const chunkMatrix = new THREE.Matrix4();
    const chunkQuat = new THREE.Quaternion();
    const chunkEuler = new THREE.Euler();
    const chunkPos = new THREE.Vector3();
    const chunkScale = new THREE.Vector3();
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + rand() * 0.5;
      const chunkGeo = new THREE.DodecahedronGeometry(0.75 + rand() * 0.55, 0);
      chunkPos.set(
        Math.cos(angle) * (outerHalfWidth - 0.35),
        mouthFloorY + portalHalfHeight + Math.sin(angle) * (outerHalfHeight - 0.2),
        -0.28 + rand() * 0.3,
      );
      chunkScale.set(
        1.2 + rand() * 0.6,
        0.75 + rand() * 0.5,
        0.8 + rand() * 0.5,
      );
      chunkEuler.set(rand() * 1.5, rand() * 1.5, rand() * 1.5);
      chunkQuat.setFromEuler(chunkEuler);
      chunkGeo.applyMatrix4(
        chunkMatrix.compose(chunkPos, chunkQuat, chunkScale),
      );
      chunkGeos.push(chunkGeo);
    }
    const mergedChunks = mergeGeometries(chunkGeos, false);
    for (const geo of chunkGeos) geo.dispose();
    if (mergedChunks) {
      const chunks = new THREE.Mesh(mergedChunks, chunkMat);
      chunks.castShadow = false;
      chunks.receiveShadow = true;
      chunks.userData.noShadowCast = true;
      portalGroup.add(chunks);
    }

    const beaconMat = new THREE.MeshStandardMaterial({
      color: palette.beacon,
      emissive: palette.emissive,
      emissiveIntensity: 1.5,
      roughness: 0.18,
      metalness: 0.25,
    });
    const beaconCount = cave.type === 'regular' ? 1 : 3;
    const beaconGeos: THREE.BufferGeometry[] = [];
    for (let i = 0; i < beaconCount; i++) {
      const beaconGeo = new THREE.OctahedronGeometry(0.17 + rand() * 0.12, 0);
      const side = i % 2 === 0 ? -1 : 1;
      beaconGeo.applyMatrix4(
        chunkMatrix.compose(
          chunkPos.set(
            side * (portalHalfWidth + 0.34),
            mouthFloorY + portalHalfHeight + (i === 1 ? 0.2 : -0.15),
            -0.18,
          ),
          chunkQuat.setFromEuler(chunkEuler.set(rand(), rand(), rand())),
          chunkScale.set(1, 1, 1),
        ),
      );
      beaconGeos.push(beaconGeo);
    }
    const mergedBeacons = mergeGeometries(beaconGeos, false);
    for (const geo of beaconGeos) geo.dispose();
    if (mergedBeacons) {
      const beacons = new THREE.Mesh(mergedBeacons, beaconMat);
      beacons.castShadow = false;
      beacons.userData.noShadowCast = true;
      portalGroup.add(beacons);
    }

    return portalGroup;
  }

  private entrancePitch(x: number, z: number): number {
    const yaw = getCaveEntranceYaw(x, z);
    const uphill = localToWorld(x, z, yaw, 0, -1.5);
    const downhill = localToWorld(x, z, yaw, 0, 1.5);
    const rise =
      getTerrainSurfaceHeight(uphill.x, uphill.z) -
      getTerrainSurfaceHeight(downhill.x, downhill.z);
    return Math.max(-0.35, Math.min(0.35, Math.atan(rise / 3) * 0.65));
  }

  /**
   * Stalactites, load-bearing rock columns and fallen boulders make the bore
   * read as a real cavern. All formations share two instanced meshes so a
   * special cave costs only two extra draw calls.
   */
  private addRockDetails(
    group: THREE.Group,
    cave: Cave,
    samples: CaveSample[],
    palette: { rock: number; floor: number; beacon: number; emissive: number },
    rand: () => number,
  ): void {
    if (samples.length < 6) return;
    const rockMat = new THREE.MeshStandardMaterial({
      color: palette.rock,
      roughness: 1,
      metalness: 0,
      flatShading: true,
    });
    const stalCount = cave.type === 'regular' ? 8 : 16;
    const stalGeo = new THREE.ConeGeometry(0.18, 1.4, 5);
    const stalactites = new THREE.InstancedMesh(stalGeo, rockMat, stalCount);
    const matrix = new THREE.Matrix4();
    const quat = new THREE.Quaternion();
    const euler = new THREE.Euler();
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3();
    for (let i = 0; i < stalCount; i++) {
      const sample = samples[1 + Math.floor(rand() * (samples.length - 3))];
      const side = rand() < 0.5 ? -1 : 1;
      const scale = 0.55 + rand() * 1.5;
      pos.set(
        sample.lx + side * sample.halfWidth * (0.15 + rand() * 0.62),
        sample.ceilingY - (1.4 * scale) * 0.4,
        sample.lz + (rand() - 0.5) * 0.8,
      );
      scl.set(scale, scale, scale);
      euler.set(Math.PI, rand() * 0.4, 0);
      quat.setFromEuler(euler);
      stalactites.setMatrixAt(i, matrix.compose(pos, quat, scl));
    }
    stalactites.instanceMatrix.needsUpdate = true;
    stalactites.castShadow = false;
    stalactites.userData.noShadowCast = true;
    group.add(stalactites);

    const columnCount = cave.type === 'regular' ? 2 : 4;
    const colGeo = new THREE.CylinderGeometry(0.32, 0.48, 1, 7);
    const columns = new THREE.InstancedMesh(colGeo, rockMat, columnCount);
    for (let i = 0; i < columnCount; i++) {
      const sample = samples[Math.floor(samples.length * (0.42 + i * 0.13)) % samples.length];
      const side = i % 2 === 0 ? -1 : 1;
      const height = Math.max(1.2, sample.ceilingY - sample.floorY - 0.25);
      pos.set(
        sample.lx + side * sample.halfWidth * 0.66,
        sample.floorY + height * 0.5,
        sample.lz,
      );
      scl.set(0.75 + rand() * 0.8, height, 0.75 + rand() * 0.8);
      quat.identity();
      columns.setMatrixAt(i, matrix.compose(pos, quat, scl));
    }
    columns.instanceMatrix.needsUpdate = true;
    columns.castShadow = false;
    columns.userData.noShadowCast = true;
    group.add(columns);

    const boulderCount = cave.type === 'regular' ? 4 : 9;
    const boulderGeo = new THREE.DodecahedronGeometry(0.32, 0);
    const boulders = new THREE.InstancedMesh(boulderGeo, rockMat, boulderCount);
    for (let i = 0; i < boulderCount; i++) {
      const sample = samples[1 + Math.floor(rand() * (samples.length - 2))];
      const side = rand() < 0.5 ? -1 : 1;
      const scale = 0.6 + rand() * 1.2;
      pos.set(
        sample.lx + side * sample.halfWidth * rand() * 0.72,
        sample.floorY + 0.16 * scale,
        sample.lz + (rand() - 0.5) * 1.2,
      );
      scl.set(scale * 1.2, scale * 0.7, scale);
      euler.set(rand() * 0.5, rand() * Math.PI, rand() * 0.3);
      quat.setFromEuler(euler);
      boulders.setMatrixAt(i, matrix.compose(pos, quat, scl));
    }
    boulders.instanceMatrix.needsUpdate = true;
    boulders.castShadow = false;
    boulders.userData.noShadowCast = true;
    group.add(boulders);
  }

  private addInteriorDetails(
    group: THREE.Group,
    cave: Cave,
    samples: CaveSample[],
    palette: { rock: number; floor: number; beacon: number; emissive: number },
    rand: () => number,
  ): void {
    const crystalCount =
      cave.type === 'crystal'
        ? 7
        : cave.type === 'regular'
          ? rand() < 0.3
            ? 2
            : 0
          : 4;
    if (crystalCount === 0) return;

    const crystalMat = new THREE.MeshStandardMaterial({
      color: palette.beacon,
      emissive: palette.emissive,
      emissiveIntensity: cave.type === 'crystal' ? 2.2 : 1.25,
      roughness: 0.16,
      metalness: 0.28,
      transparent: true,
      opacity: 0.92,
    });
    const crystalGeo = new THREE.OctahedronGeometry(0.22, 0);
    const crystals = new THREE.InstancedMesh(
      crystalGeo,
      crystalMat,
      crystalCount,
    );
    const matrix = new THREE.Matrix4();
    const quat = new THREE.Quaternion();
    const euler = new THREE.Euler();
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3();
    for (let i = 0; i < crystalCount; i++) {
      const sampleIndex = Math.min(
        samples.length - 2,
        Math.max(1, Math.floor((0.2 + rand() * 0.7) * samples.length)),
      );
      const sample = samples[sampleIndex];
      const side = rand() < 0.5 ? -1 : 1;
      pos.set(
        sample.lx + side * sample.halfWidth * (0.45 + rand() * 0.35),
        sample.floorY + 0.22 + rand() * (sample.ceilingY - sample.floorY) * 0.55,
        sample.lz - rand() * 0.8,
      );
      const scale = 0.7 + rand() * 1.4;
      scl.set(scale * 0.8, scale * 1.7, scale * 0.8);
      quat.setFromEuler(euler.set(rand() * 0.8, rand() * 3, rand() * 0.8));
      crystals.setMatrixAt(i, matrix.compose(pos, quat, scl));
    }
    crystals.instanceMatrix.needsUpdate = true;
    crystals.castShadow = false;
    crystals.userData.noShadowCast = true;
    group.add(crystals);
  }

  private refreshLights(): void {
    const active = [...this.active.values()];
    const withLights = active
      .filter((entry) => entry.light)
      .sort(
        (a, b) =>
          this.distanceToMouthSq(a) - this.distanceToMouthSq(b),
      );
    for (let i = 0; i < withLights.length; i++) {
      if (withLights[i].light) withLights[i].light!.visible = i < 5;
    }
  }

  private lastPlayer = new THREE.Vector3();

  private distanceToMouthSq(entry: ActiveCave): number {
    const dx = entry.cave.position.x - this.lastPlayer.x;
    const dz = entry.cave.position.z - this.lastPlayer.z;
    return dx * dx + dz * dz;
  }

  update(player: THREE.Vector3, scene: THREE.Scene): void {
    this.lastPlayer.copy(player);
    const playerX = player.x;
    const playerZ = player.z;

    // Build near entrances, keeping special caves resident from farther away.
    const candidates: Array<{ cave: Cave; distSq: number; special: boolean }> = [];
    for (const cave of this.caves) {
      if (
        this.isCaveSiteAllowed &&
        !this.isCaveSiteAllowed(cave.position.x, cave.position.z)
      ) {
        if (this.active.has(cave.id)) this.unload(cave.id, scene);
        continue;
      }
      const dx = cave.position.x - playerX;
      const dz = cave.position.z - playerZ;
      const distSq = dx * dx + dz * dz;
      if (distSq < 25 * 25) cave.discovered = true;
      const special = cave.type !== 'regular';
      const loadDistance = special
        ? CAVE_SPECIAL_STREAM_DISTANCE
        : CAVE_STREAM_DISTANCE;
      const active = this.active.get(cave.id);
      if (active) {
        if (distSq > CAVE_UNLOAD_DISTANCE * CAVE_UNLOAD_DISTANCE) {
          this.unload(cave.id, scene);
        }
        continue;
      }
      if (distSq <= loadDistance * loadDistance) {
        candidates.push({ cave, distSq, special });
      }
    }

    candidates.sort((a, b) => {
      if (a.special !== b.special) return a.special ? -1 : 1;
      return a.distSq - b.distSq;
    });
    // Special caves are few and story-critical, so they build immediately.
    // Regular caves are meshed a couple per pass to avoid a large geometry
    // upload hitch when crossing into a cave-dense hillside.
    let regularBuilds = 0;
    const minSpacingSq = CAVE_MIN_ACTIVE_SPACING * CAVE_MIN_ACTIVE_SPACING;
    const chosen: { x: number; z: number }[] = [];
    for (const candidate of candidates) {
      if (this.active.size >= CAVE_MAX_ACTIVE) break;
      if (!candidate.special) {
        if (regularBuilds >= CAVE_REGULAR_BUILDS_PER_UPDATE) continue;
      }
      let spaced = true;
      for (const entry of this.active.values()) {
        const ddx = entry.cave.position.x - candidate.cave.position.x;
        const ddz = entry.cave.position.z - candidate.cave.position.z;
        if (ddx * ddx + ddz * ddz < minSpacingSq) {
          spaced = false;
          break;
        }
      }
      if (spaced) {
        for (const c of chosen) {
          const ddx = c.x - candidate.cave.position.x;
          const ddz = c.z - candidate.cave.position.z;
          if (ddx * ddx + ddz * ddz < minSpacingSq) {
            spaced = false;
            break;
          }
        }
      }
      // The five story caves always build; only regular caverns are spaced out.
      if (!spaced && !candidate.special) continue;
      if (!candidate.special) regularBuilds += 1;
      chosen.push({ x: candidate.cave.position.x, z: candidate.cave.position.z });
      this.build(candidate.cave, scene);
    }

    this.refreshLights();
  }

  private unload(caveId: string, scene: THREE.Scene): void {
    const state = this.active.get(caveId);
    if (!state) return;
    this.disposeGroup(state.group, scene);
    this.active.delete(caveId);
    state.cave.built = false;
  }

  private disposeGroup(group: THREE.Group, scene?: THREE.Scene): void {
    if (scene) scene.remove(group);
    else group.removeFromParent();
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      } else if (child instanceof THREE.Light) {
        child.dispose();
      }
    });
  }

  /** Mouth-only openings, kept for save/UI compatibility and focused audits. */
  getOpenings(): CaveTerrainOpening[] {
    const out: CaveTerrainOpening[] = [];
    for (const entry of this.active.values()) out.push(entry.opening);
    return out;
  }

  /**
   * Terrain cuts for the mouth plus any stretch just inside the entrance where
   * the carved bore passes through the visible hillside. Removing those
   * intruding triangles prevents a terrain sheet from clipping through the
   * tunnel roof while keeping the rest of the mountain intact.
   */
  getCarvedOpenings(): CaveTerrainOpening[] {
    const out: CaveTerrainOpening[] = [];
    for (const entry of this.active.values()) {
      out.push(entry.opening);
      let lastX = entry.mouthX;
      let lastZ = entry.mouthZ;
      let added = 0;
      for (let i = 2; i < entry.samples.length && added < 7; i++) {
        const sample = entry.samples[i];
        if (sample.t > 0.55) break;
        const terrainY = getTerrainSurfaceHeight(sample.worldX, sample.worldZ);
        const intersectsBore =
          terrainY > sample.floorY - 0.35 && terrainY < sample.ceilingY + 0.25;
        if (!intersectsBore) continue;
        const spacing = Math.hypot(sample.worldX - lastX, sample.worldZ - lastZ);
        if (spacing < 3.2) continue;
        out.push({
          x: sample.worldX,
          z: sample.worldZ,
          radius: Math.min(4.4, sample.halfWidth + 0.55),
        });
        lastX = sample.worldX;
        lastZ = sample.worldZ;
        added++;
      }
    }
    return out;
  }

  getActiveCount(): number {
    return this.active.size;
  }

  private sampleForPoint(
    entry: ActiveCave,
    x: number,
    z: number,
    footY: number,
  ): CaveWalkSurface | null {
    const nearest = findNearestSample(entry.samples, x, z);
    if (!nearest) return null;
    const s = nearest.sample;
    // A player on the mountain above the tunnel must keep using the terrain.
    if (footY > s.ceilingY + 0.25) return null;
    if (footY < s.floorY - 2.4) return null;
    if (nearest.lateral > s.halfWidth + 0.25) return null;
    if (nearest.t < -0.02 || nearest.t > 1.06) return null;
    return {
      caveId: entry.cave.id,
      caveType: entry.cave.type,
      floorY: s.floorY,
      ceilingY: s.ceilingY,
      halfWidth: s.halfWidth,
      centerX: s.worldX,
      centerZ: s.worldZ,
      t: nearest.t,
    };
  }

  /** Walkable tunnel floor, or null when the player is above / outside the bore. */
  getWalkSurface(x: number, z: number, footY: number): CaveWalkSurface | null {
    let best: CaveWalkSurface | null = null;
    let bestScore = Infinity;
    for (const entry of this.active.values()) {
      const dx = entry.mouthX - x;
      const dz = entry.mouthZ - z;
      if (dx * dx + dz * dz > entry.maxCollisionRadius * entry.maxCollisionRadius) {
        continue;
      }
      const surface = this.sampleForPoint(entry, x, z, footY);
      if (!surface) continue;
      const score = Math.abs(footY - surface.floorY);
      if (score < bestScore) {
        bestScore = score;
        best = surface;
      }
    }
    return best;
  }

  getCeilingAt(x: number, z: number, footY: number): number | null {
    return this.getWalkSurface(x, z, footY)?.ceilingY ?? null;
  }

  /** Ceiling lookup for a player already inside a streamed cave (jump-safe). */
  getCeilingForCave(caveId: string, x: number, z: number): number | null {
    const entry = this.active.get(caveId);
    if (!entry) return null;
    const nearest = findNearestSample(entry.samples, x, z);
    if (!nearest) return null;
    if (nearest.lateral > nearest.sample.halfWidth + 0.55) return null;
    return nearest.sample.ceilingY;
  }

  /** Pushes the player away from tunnel side walls without closing the mouth. */
  constrainPlayer(
    fromX: number,
    fromZ: number,
    toX: number,
    toZ: number,
    footY: number,
  ): { x: number; z: number } {
    const inside = this.getWalkSurface(fromX, fromZ, footY);
    if (!inside) return { x: toX, z: toZ };
    const entry = this.active.get(inside.caveId);
    if (!entry) return { x: toX, z: toZ };
    const nearest = findNearestSample(entry.samples, toX, toZ);
    if (!nearest) return { x: toX, z: toZ };
    if (nearest.t <= 0.02 || nearest.t >= 0.975) return { x: toX, z: toZ };
    const s = nearest.sample;
    if (footY > s.ceilingY + 0.3 || footY < s.floorY - 1.8) {
      return { x: toX, z: toZ };
    }
    const dx = toX - s.worldX;
    const dz = toZ - s.worldZ;
    const dist = Math.hypot(dx, dz);
    const maxDist = Math.max(0.6, s.halfWidth - 0.38);
    if (dist <= maxDist || dist < 1e-5) return { x: toX, z: toZ };
    return {
      x: s.worldX + (dx / dist) * maxDist,
      z: s.worldZ + (dz / dist) * maxDist,
    };
  }

  isNearOpening(x: number, z: number, radius: number, footY: number): boolean {
    for (const entry of this.active.values()) {
      const dx = entry.mouthX - x;
      const dz = entry.mouthZ - z;
      if (dx * dx + dz * dz > (entry.opening.radius + radius) ** 2) continue;
      if (footY > entry.mouthFloorY + 4.2) continue;
      return true;
    }
    return false;
  }

  dispose(scene?: THREE.Scene): void {
    for (const state of this.active.values()) {
      this.disposeGroup(state.group, scene);
      state.cave.built = false;
    }
    this.active.clear();
  }
}

export class CaveBoss {
  health = 1000;
  phase = 1;
  defeated = false;
  attackCooldown = 0;

  constructor(
    public name: string,
    public model: THREE.Object3D,
    public damage = 25,
  ) {}

  update(
    delta: number,
    player: THREE.Vector3,
    hurtPlayer: (n: number) => void,
  ): void {
    if (this.defeated) return;
    this.attackCooldown = Math.max(0, this.attackCooldown - delta);

    const distance = this.model.position.distanceTo(player);
    if (distance > 30) return;

    this.model.lookAt(player);

    if (distance > 4) {
      const dir = new THREE.Vector3()
        .subVectors(player, this.model.position)
        .normalize();
      this.model.position.addScaledVector(dir, delta * (4 + this.phase));
    } else if (this.attackCooldown === 0) {
      hurtPlayer(this.damage * this.phase);
      this.attackCooldown = Math.max(0.7, 2 - this.phase * 0.4);
    }
  }

  takeDamage(amount: number): boolean {
    if (this.defeated) return false;
    this.health = Math.max(0, this.health - amount);
    if (this.health < 650) this.phase = 2;
    if (this.health < 300) this.phase = 3;

    if (this.health <= 0) {
      this.defeated = true;
      this.model.visible = false;
      return true;
    }

    return false;
  }
}
