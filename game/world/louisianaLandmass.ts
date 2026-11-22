import * as THREE from 'three';

/**
 * Independently generated Louisiana landmass.
 *
 * The survival island remains the single radial island produced by terrain.ts.
 * Louisiana lives beyond its southern coast, separated by open water, with a
 * recognizable boot-shaped coastline, Lake Pontchartrain, the Mississippi
 * channel, bayous, and a large flat city shelf for Crescent City.
 *
 * This module deliberately has no imports from terrain.ts so terrain height can
 * delegate to it without creating a cycle.
 */

export const LOUISIANA_CITY_OFFSET = { x: -32, z: 960 } as const;
export const LOUISIANA_CITY_CENTER = { x: 40, z: 1400 } as const;
export const LOUISIANA_CITY_GROUND_Y = 3.4;
export const LOUISIANA_CITY_PLATEAU = {
  cx: 40,
  cz: 1400,
  halfX: 400,
  halfZ: 190,
} as const;

export const LOUISIANA_BOUNDS = {
  minX: -660,
  maxX: 660,
  minZ: 940,
  maxZ: 2180,
} as const;

/** Boot-shaped Louisiana outline in world X/Z coordinates. */
export const LOUISIANA_POLYGON: readonly (readonly [number, number])[] = [
  [-520, 1080],
  [-300, 1040],
  [-120, 1035],
  [110, 1040],
  [245, 1085],
  [305, 1180],
  [330, 1310],
  [365, 1410],
  [470, 1515],
  [525, 1630],
  [455, 1740],
  [345, 1815],
  [210, 1860],
  [80, 1835],
  [-35, 1745],
  [-165, 1710],
  [-280, 1770],
  [-398, 1735],
  [-480, 1620],
  [-535, 1480],
  [-555, 1320],
  [-545, 1180],
  [-520, 1080],
];

export const LOUISIANA_LAKE = {
  x: 25,
  z: 1140,
  rx: 205,
  rz: 62,
  waterY: 1.35,
} as const;

export type LouisianaRiverKind = 'mississippi' | 'bayou' | 'lake';

interface RiverPath {
  kind: LouisianaRiverKind;
  points: readonly (readonly [number, number])[];
  halfWidth: number;
  waterY: number;
}

const RIVER_PATHS: readonly RiverPath[] = [
  {
    kind: 'mississippi',
    points: [
      [225, 990],
      [238, 1110],
      [205, 1225],
      [235, 1335],
      [265, 1445],
      [300, 1550],
      [350, 1650],
      [420, 1740],
      [510, 1815],
    ],
    halfWidth: 21,
    waterY: 1.2,
  },
  {
    kind: 'bayou',
    points: [
      [120, 1535],
      [40, 1580],
      [-55, 1625],
      [-140, 1685],
      [-235, 1750],
      [-330, 1840],
    ],
    halfWidth: 12,
    waterY: 0.95,
  },
  {
    kind: 'bayou',
    points: [
      [320, 1585],
      [350, 1680],
      [340, 1770],
      [300, 1850],
    ],
    halfWidth: 10,
    waterY: 0.9,
  },
  {
    kind: 'bayou',
    points: [
      [-300, 1240],
      [-350, 1320],
      [-380, 1430],
      [-360, 1550],
      [-300, 1650],
    ],
    halfWidth: 11,
    waterY: 1.05,
  },
];

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function distanceToSegmentSq(
  x: number,
  z: number,
  ax: number,
  az: number,
  bx: number,
  bz: number,
): number {
  const dx = bx - ax;
  const dz = bz - az;
  const lenSq = dx * dx + dz * dz;
  if (lenSq <= 0.0001) {
    const ex = x - ax;
    const ez = z - az;
    return ex * ex + ez * ez;
  }
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / lenSq));
  const ex = x - (ax + dx * t);
  const ez = z - (az + dz * t);
  return ex * ex + ez * ez;
}

/** Signed distance to the Louisiana coast. Positive means inland. */
export function getLouisianaCoastDistance(x: number, z: number): number {
  let inside = false;
  let minDistSq = Infinity;
  for (let i = 0, j = LOUISIANA_POLYGON.length - 1; i < LOUISIANA_POLYGON.length; j = i++) {
    const a = LOUISIANA_POLYGON[i];
    const b = LOUISIANA_POLYGON[j];
    const dSq = distanceToSegmentSq(x, z, a[0], a[1], b[0], b[1]);
    if (dSq < minDistSq) minDistSq = dSq;
    if (
      a[1] > z !== b[1] > z &&
      x < ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1] + 0.000001) + a[0]
    ) {
      inside = !inside;
    }
  }
  const distance = Math.sqrt(minDistSq);
  return inside ? distance : -distance;
}

export function isInLouisianaBounds(x: number, z: number): boolean {
  return (
    x >= LOUISIANA_BOUNDS.minX - 60 &&
    x <= LOUISIANA_BOUNDS.maxX + 60 &&
    z >= LOUISIANA_BOUNDS.minZ - 60 &&
    z <= LOUISIANA_BOUNDS.maxZ + 60
  );
}

/** Returns the river/lake water height at a coordinate, or null on dry land. */
export function getLouisianaWaterAt(
  x: number,
  z: number,
): { waterY: number; kind: LouisianaRiverKind } | null {
  if (!isInLouisianaBounds(x, z)) return null;
  const lakeDx = (x - LOUISIANA_LAKE.x) / LOUISIANA_LAKE.rx;
  const lakeDz = (z - LOUISIANA_LAKE.z) / LOUISIANA_LAKE.rz;
  if (lakeDx * lakeDx + lakeDz * lakeDz < 1) {
    return { waterY: LOUISIANA_LAKE.waterY, kind: 'lake' };
  }
  for (let i = 0; i < RIVER_PATHS.length; i++) {
    const river = RIVER_PATHS[i];
    let minDistSq = Infinity;
    for (let p = 0; p < river.points.length - 1; p++) {
      const a = river.points[p];
      const b = river.points[p + 1];
      const dSq = distanceToSegmentSq(x, z, a[0], a[1], b[0], b[1]);
      if (dSq < minDistSq) minDistSq = dSq;
    }
    if (minDistSq < river.halfWidth * river.halfWidth) {
      return { waterY: river.waterY, kind: river.kind };
    }
  }
  return null;
}

export function getLouisianaWaterLevel(x: number, z: number): number {
  const water = getLouisianaWaterAt(x, z);
  return water ? water.waterY : 0;
}

export function isLouisianaFreshwater(x: number, z: number): boolean {
  return getLouisianaWaterAt(x, z) !== null;
}

function cityPlateauMask(x: number, z: number): number {
  const dx = Math.max(0, Math.abs(x - LOUISIANA_CITY_PLATEAU.cx) - LOUISIANA_CITY_PLATEAU.halfX);
  const dz = Math.max(0, Math.abs(z - LOUISIANA_CITY_PLATEAU.cz) - LOUISIANA_CITY_PLATEAU.halfZ);
  const distance = Math.hypot(dx, dz);
  return 1 - smoothstep(0, 70, distance);
}

function getRiverChannelBlend(x: number, z: number): { blend: number; bedY: number; kind: LouisianaRiverKind | null } {
  let bestBlend = 0;
  let bestBed = 0;
  let bestKind: LouisianaRiverKind | null = null;
  const lakeDx = (x - LOUISIANA_LAKE.x) / LOUISIANA_LAKE.rx;
  const lakeDz = (z - LOUISIANA_LAKE.z) / LOUISIANA_LAKE.rz;
  const lakeDist = Math.sqrt(lakeDx * lakeDx + lakeDz * lakeDz);
  if (lakeDist < 1.14) {
    bestBlend = 1 - smoothstep(0.82, 1.14, lakeDist);
    bestBed = LOUISIANA_LAKE.waterY - 1.6;
    bestKind = 'lake';
  }
  for (let i = 0; i < RIVER_PATHS.length; i++) {
    const river = RIVER_PATHS[i];
    let minDistSq = Infinity;
    for (let p = 0; p < river.points.length - 1; p++) {
      const a = river.points[p];
      const b = river.points[p + 1];
      const dSq = distanceToSegmentSq(x, z, a[0], a[1], b[0], b[1]);
      if (dSq < minDistSq) minDistSq = dSq;
    }
    const distance = Math.sqrt(minDistSq);
    const blend = 1 - smoothstep(river.halfWidth * 0.58, river.halfWidth * 1.45, distance);
    if (blend > bestBlend) {
      bestBlend = blend;
      bestBed = river.waterY - (river.kind === 'mississippi' ? 1.75 : 1.25);
      bestKind = river.kind;
    }
  }
  return { blend: bestBlend, bedY: bestBed, kind: bestKind };
}

/**
 * Louisiana base elevation. Returns null outside the landmass influence so the
 * island terrain function remains authoritative everywhere else.
 */
export function getLouisianaBaseHeight(x: number, z: number): number | null {
  if (!isInLouisianaBounds(x, z)) return null;
  const coast = getLouisianaCoastDistance(x, z);
  if (coast < -72) return null;

  const wave =
    Math.sin(x * 0.013 + z * 0.007) * 0.34 +
    Math.cos(z * 0.019 - x * 0.004) * 0.22 +
    Math.sin((x + z) * 0.031) * 0.11;
  const inland = smoothstep(-55, 45, coast);
  let height = lerp(-4.8, 2.7 + wave, inland);

  // A broad, flat shelf for the city and its street grid.
  const plateau = cityPlateauMask(x, z);
  if (plateau > 0) {
    height = lerp(height, LOUISIANA_CITY_GROUND_Y + wave * 0.08, plateau);
  }

  // Lake Pontchartrain and the Mississippi/bayou channels cut through the shelf.
  const channel = getRiverChannelBlend(x, z);
  if (channel.blend > 0) {
    height = lerp(height, channel.bedY, channel.blend);
  }

  // Low cypress marsh along the southern and western coast.
  const marsh = (1 - smoothstep(20, 115, coast)) * smoothstep(1300, 1550, z);
  if (marsh > 0 && channel.blend <= 0) {
    height = lerp(height, 1.35 + wave * 0.25, marsh * 0.45);
  }

  return height;
}

export function getLouisianaBiome(
  x: number,
  z: number,
): 'river' | 'lake' | 'swamp' | 'beach' | 'plains' | 'forest' {
  const water = getLouisianaWaterAt(x, z);
  if (water) return water.kind === 'lake' ? 'lake' : water.kind === 'bayou' ? 'swamp' : 'river';
  const coast = getLouisianaCoastDistance(x, z);
  if (coast < 18) return 'beach';
  if (coast < 90 && z > 1450) return 'swamp';
  if (z < 1360) return 'forest';
  return 'plains';
}

export function getLouisianaTerrainColor(x: number, z: number, height: number): THREE.Color {
  const color = new THREE.Color();
  const water = getLouisianaWaterAt(x, z);
  if (water) {
    color.setHex(water.kind === 'lake' ? 0x315d4e : 0x2f5b48);
    return color;
  }
  const coast = getLouisianaCoastDistance(x, z);
  if (coast < 17) {
    color.setHex(height > 0.75 ? 0xbca36a : 0x6d654d);
    return color;
  }
  const plateau = cityPlateauMask(x, z);
  if (plateau > 0.55) {
    color.setHex(0x68706a);
    return color;
  }
  if (coast < 100 && z > 1400) {
    color.setHex(0x3f5f3b);
    return color;
  }
  if (z < 1320) {
    color.setHex(0x426441);
    return color;
  }
  color.setHex(0x587948);
  return color;
}

/** Deterministic, low-poly landmass mesh chunks for sector culling. */
export function createLouisianaTerrainGeometries(): THREE.BufferGeometry[] {
  const minX = LOUISIANA_BOUNDS.minX;
  const maxX = LOUISIANA_BOUNDS.maxX;
  const minZ = LOUISIANA_BOUNDS.minZ;
  const maxZ = LOUISIANA_BOUNDS.maxZ;
  const chunksX = 4;
  const chunksZ = 4;
  const segsX = 32;
  const segsZ = 32;
  const chunkW = (maxX - minX) / chunksX;
  const chunkD = (maxZ - minZ) / chunksZ;
  const geometries: THREE.BufferGeometry[] = [];

  for (let cz = 0; cz < chunksZ; cz++) {
    for (let cx = 0; cx < chunksX; cx++) {
      const x0 = minX + cx * chunkW;
      const z0 = minZ + cz * chunkD;
      const positions: number[] = [];
      const colors: number[] = [];
      const indices: number[] = [];
      for (let iz = 0; iz <= segsZ; iz++) {
        const z = z0 + (iz / segsZ) * chunkD;
        for (let ix = 0; ix <= segsX; ix++) {
          const x = x0 + (ix / segsX) * chunkW;
          const y = getLouisianaBaseHeight(x, z) ?? -6.5;
          positions.push(x, y, z);
          const c = getLouisianaTerrainColor(x, z, y);
          colors.push(c.r, c.g, c.b);
        }
      }
      for (let iz = 0; iz < segsZ; iz++) {
        for (let ix = 0; ix < segsX; ix++) {
          const a = iz * (segsX + 1) + ix;
          const b = a + 1;
          const c = a + segsX + 1;
          const d = c + 1;
          indices.push(a, c, b, b, c, d);
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      geometries.push(geometry);
    }
  }
  return geometries;
}

/** Flat water ribbons/lake discs for the mainland waterways. */
export function buildLouisianaWaterMeshes(material: THREE.Material): THREE.Object3D[] {
  const objects: THREE.Object3D[] = [];
  const lakeGeo = new THREE.CircleGeometry(1, 48);
  lakeGeo.rotateX(-Math.PI / 2);
  const lake = new THREE.Mesh(lakeGeo, material);
  lake.position.set(LOUISIANA_LAKE.x, LOUISIANA_LAKE.waterY, LOUISIANA_LAKE.z);
  lake.scale.set(LOUISIANA_LAKE.rx, 1, LOUISIANA_LAKE.rz);
  lake.userData.noShadowCast = true;
  objects.push(lake);

  for (let i = 0; i < RIVER_PATHS.length; i++) {
    const river = RIVER_PATHS[i];
    for (let p = 0; p < river.points.length - 1; p++) {
      const a = river.points[p];
      const b = river.points[p + 1];
      const dx = b[0] - a[0];
      const dz = b[1] - a[1];
      const length = Math.hypot(dx, dz) + river.halfWidth * 0.5;
      const geo = new THREE.PlaneGeometry(river.halfWidth * 2, length);
      geo.rotateX(-Math.PI / 2);
      const mesh = new THREE.Mesh(geo, material);
      mesh.position.set((a[0] + b[0]) * 0.5, river.waterY, (a[1] + b[1]) * 0.5);
      mesh.rotation.y = Math.atan2(dx, dz);
      mesh.userData.noShadowCast = true;
      objects.push(mesh);
    }
  }
  return objects;
}

/** A small shape outline used by the map for the separated mainland. */
export function getLouisianaMapPolygon(): readonly (readonly [number, number])[] {
  return LOUISIANA_POLYGON;
}
