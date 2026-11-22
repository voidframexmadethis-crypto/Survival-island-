import * as THREE from 'three';

/**
 * Shared procedural vegetation geometry for Survival Island.
 *
 * Every palm on the island, whether it is batched into an InstancedMesh pool or
 * activated as an interactive choppable node, reuses these buffers. Keeping the
 * generators here (instead of inside worldBuilder) lets the geometry be audited
 * and rendered in isolation, and guarantees that the batching pools share one
 * copy of each frond/trunk/clump buffer.
 */

/* -------------------------------------------------------------------------- */
/*  Deterministic helpers                                                     */
/* -------------------------------------------------------------------------- */

function hash01(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

function makeRand(seed: number): () => number {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/* -------------------------------------------------------------------------- */
/*  Palm fronds                                                               */
/* -------------------------------------------------------------------------- */

export interface PalmFrondOptions {
  seed: number;
  /** Leaflet pairs along the rachis. */
  pairs: number;
  /** Peak rise of the rachis before it droops. */
  arch: number;
  /** Tip droop of the rachis. */
  droop: number;
  /** Maximum leaflet length. */
  leafletLength: number;
  /** Forward rake of the leaflets from perpendicular. */
  sweep: number;
}

export const PALM_FROND_PRESETS: PalmFrondOptions[] = [
  { seed: 11, pairs: 20, arch: 0.235, droop: 0.34, leafletLength: 0.48, sweep: 0.50 },
  { seed: 29, pairs: 22, arch: 0.185, droop: 0.40, leafletLength: 0.52, sweep: 0.42 },
  { seed: 47, pairs: 19, arch: 0.275, droop: 0.30, leafletLength: 0.45, sweep: 0.58 },
];

const UP = new THREE.Vector3(0, 1, 0);
const _dir = new THREE.Vector3();
const _side = new THREE.Vector3();
const _tmp = new THREE.Vector3();

/**
 * One palm frond, rooted at the origin and extending along +X.
 *
 * The rachis is an arched, drooping ribbon; leaflet pairs are individual tapered
 * quads that fan out sideways with a forward rake and progressively steeper
 * droop toward the tip. Vertex colours carry the shaded-base -> sunlit-tip
 * gradient, and the geometry stays under ~100 triangles so thousands of fronds
 * can be instanced on mobile.
 */
export function createPalmFrondGeometry(options: PalmFrondOptions): THREE.BufferGeometry {
  const rand = makeRand(options.seed * 7919 + 13);
  const positions: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  const spineY = (t: number) =>
    options.arch * Math.sin(t * Math.PI * 0.78) - options.droop * t * t;

  // --- Rachis ribbon -------------------------------------------------------
  const RACHIS_STATIONS = 9;
  const rachisStart = 0;
  for (let i = 0; i <= RACHIS_STATIONS; i++) {
    const t = i / RACHIS_STATIONS;
    const y = spineY(t);
    const w = 0.021 * (1 - t * 0.78) + 0.0032;
    const shade = 0.52 + t * 0.24;
    // left, raised crown of the rib, right
    positions.push(t, y + 0.003, -w, t, y + 0.014, 0, t, y + 0.003, w);
    uvs.push(0, t, 0.5, t, 1, t);
    colors.push(shade * 0.82, shade, shade * 0.5, shade * 0.9, shade, shade * 0.52, shade * 0.82, shade, shade * 0.5);
  }
  for (let i = 0; i < RACHIS_STATIONS; i++) {
    const a = rachisStart + i * 3;
    const b = a + 3;
    indices.push(a, b, b + 1, a, b + 1, a + 1);
    indices.push(a + 1, b + 1, b + 2, a + 1, b + 2, a + 2);
  }

  // --- Leaflets ------------------------------------------------------------
  const pairs = options.pairs;
  for (let i = 0; i < pairs; i++) {
    const f = i / (pairs - 1);
    // Slight irregularity along the rachis keeps the pinnae from looking like
    // a machine-stamped comb.
    const t = Math.min(0.985, Math.max(0.07, 0.09 + f * 0.9 + (rand() - 0.5) * (0.6 / pairs)));
    // Longest around the middle of the frond, short at the base, tapering tip.
    const lengthScale = 0.42 + 0.58 * Math.sin(Math.PI * Math.pow(t, 0.88));
    const len =
      options.leafletLength *
      lengthScale *
      (0.88 + rand() * 0.26) *
      (0.72 + f * 0.3);

    for (const sideSign of [-1, 1]) {
      const sweep = options.sweep + f * 0.22 + (rand() - 0.5) * 0.26;
      // Near the base leaflets lift slightly; toward the tip they hang down.
      const lift = 0.34 - f * 1.05 + (rand() - 0.5) * 0.18;
      _dir.set(Math.sin(sweep), lift, sideSign * Math.cos(sweep)).normalize();
      const root = _tmp.set(t, spineY(t) + 0.006, sideSign * 0.012).clone();
      const tip = root
        .clone()
        .addScaledVector(_dir, len);
      tip.y -= len * (0.18 + f * 0.5);
      tip.x += len * 0.08;

      // Width axis is horizontal and perpendicular to the leaflet.
      _side.crossVectors(_dir, UP);
      if (_side.lengthSq() < 1e-5) _side.set(0, 0, 1);
      _side.normalize();
      const w0 = (0.0145 + (1 - f) * 0.009) * (0.85 + rand() * 0.3);
      const w1 = 0.0016;

      const base = positions.length / 3;
      positions.push(
        root.x - _side.x * w0, root.y - _side.y * w0, root.z - _side.z * w0,
        root.x + _side.x * w0, root.y + _side.y * w0, root.z + _side.z * w0,
        tip.x - _side.x * w1, tip.y - _side.y * w1, tip.z - _side.z * w1,
        tip.x + _side.x * w1, tip.y + _side.y * w1, tip.z + _side.z * w1,
      );
      uvs.push(0, 0, 1, 0, 1, 1, 0, 1);

      const dry = rand() * 0.12;
      const baseShade = 0.5 + rand() * 0.08;
      const tipShade = 0.82 + rand() * 0.16;
      colors.push(
        baseShade * 0.72, baseShade * 0.94 + dry * 0.3, baseShade * 0.4,
        baseShade * 0.72, baseShade * 0.94 + dry * 0.3, baseShade * 0.4,
        tipShade * 0.86, tipShade * 1.0 + dry * 0.3, tipShade * 0.52,
        tipShade * 0.86, tipShade * 1.0 + dry * 0.3, tipShade * 0.52,
      );
      indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

export function createPalmFrondGeometries(): THREE.BufferGeometry[] {
  return PALM_FROND_PRESETS.map((preset) => createPalmFrondGeometry(preset));
}

/**
 * Tapered, subtly ringed trunk segment (unit height, bottom radius 1).
 * Four of these stack with progressive lean to form a curved palm trunk while
 * reusing a single instanced buffer.
 */
export function createPalmTrunkSegmentGeometry(): THREE.BufferGeometry {
  const RADIAL = 10;
  const RINGS = 5;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const radiusAt = (t: number) =>
    (1 - 0.2 * t) * (1 + Math.sin(t * Math.PI * 3.0 + 0.6) * 0.018);

  for (let r = 0; r <= RINGS; r++) {
    const t = r / RINGS;
    const radius = radiusAt(t);
    for (let s = 0; s <= RADIAL; s++) {
      const a = (s / RADIAL) * Math.PI * 2;
      const wobble = 1 + Math.sin(a * 3 + t * 5.1) * 0.035;
      positions.push(Math.cos(a) * radius * wobble, t, Math.sin(a) * radius * wobble);
      uvs.push(s / RADIAL, t);
    }
  }
  for (let r = 0; r < RINGS; r++) {
    for (let s = 0; s < RADIAL; s++) {
      const a = r * (RADIAL + 1) + s;
      const b = a + RADIAL + 1;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** Short flared leaf-boot collar where fronds meet the trunk. */
export function createPalmBootGeometry(): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(0.62, 1.0, 0.34, 9, 1, true);
  geo.computeVertexNormals();
  return geo;
}

/* -------------------------------------------------------------------------- */
/*  Grass clumps                                                              */
/* -------------------------------------------------------------------------- */

export type GrassVariant = 'lush' | 'tall' | 'dune' | 'alpine';

export interface GrassClumpOptions {
  seed: number;
  blades: number;
  minHeight: number;
  maxHeight: number;
  baseWidth: number;
  /** Horizontal travel of a blade tip as a fraction of its height. */
  lean: number;
  /** Dry-grass colour bias added to the vertex palette. */
  dry: number;
  /** Number of tall seed stalks mixed into the clump. */
  seedStalks?: number;
  /** Fraction of short, ground-hugging blades for soft edge blending. */
  skirt?: number;
}

/**
 * A single clump of individual curved blades.
 *
 * Blades taper from a wider, ambient-occluded base to a fine tip, with varied
 * azimuth, height, arch and lateral twist. Long blades dominate the outer ring
 * and short skirt blades fill the base so the clump meets the terrain instead of
 * looking like isolated geometric spikes.
 */
export function createGrassClumpGeometry(options: GrassClumpOptions): THREE.BufferGeometry {
  const rand = makeRand(options.seed);
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  const skirt = options.skirt ?? 0.25;
  const outerCount = Math.max(1, options.blades);

  const pushBlade = (
    az: number,
    height: number,
    widthBase: number,
    lean: number,
    twist: number,
    colorScale: number,
    baseDist: number,
  ) => {
    const dirX = Math.cos(az);
    const dirZ = Math.sin(az);
    const perpX = -dirZ;
    const perpZ = dirX;
    const ox = dirX * baseDist;
    const oz = dirZ * baseDist;
    const wBase = widthBase;
    const wMid = widthBase * 0.52;
    const midH = height * (0.46 + rand() * 0.14);
    const outMid = lean * midH * 0.55;
    const outTip = lean * height;
    const latMid = twist * height * 0.28;
    const latTip = twist * height * 0.7;

    const base = positions.length / 3;
    positions.push(
      ox - perpX * wBase, 0.0, oz - perpZ * wBase,
      ox + perpX * wBase, 0.0, oz + perpZ * wBase,
      ox + dirX * outMid - perpX * wMid + perpX * latMid, midH,
        oz + dirZ * outMid - perpZ * wMid + perpZ * latMid,
      ox + dirX * outMid + perpX * wMid + perpX * latMid, midH,
        oz + dirZ * outMid + perpZ * wMid + perpZ * latMid,
      ox + dirX * outTip + perpX * latTip, height,
        oz + dirZ * outTip + perpZ * latTip,
    );
    uvs.push(0, 0, 1, 0, 0.2, 0.55, 0.8, 0.55, 0.5, 1);

    const nLen = Math.hypot(dirX * 0.42, 0.9, dirZ * 0.42);
    const nx = (dirX * 0.42) / nLen;
    const ny = 0.9 / nLen;
    const nz = (dirZ * 0.42) / nLen;
    for (let k = 0; k < 5; k++) normals.push(nx, ny, nz);

    const dry = options.dry + rand() * 0.12;
    const s = colorScale;
    const baseC: [number, number, number] = [0.26 * s, 0.31 * s, 0.16 * s];
    const midC: [number, number, number] = [
      (0.6 + dry * 0.32) * s,
      (0.7 + dry * 0.18) * s,
      (0.36 + dry * 0.05) * s,
    ];
    const tipC: [number, number, number] = [
      (0.82 + dry * 0.36) * s,
      (0.9 + dry * 0.18) * s,
      (0.52 + dry * 0.18) * s,
    ];
    colors.push(...baseC, ...baseC, ...midC, ...midC, ...tipC);

    indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2, base + 2, base + 3, base + 4);
  };

  for (let b = 0; b < outerCount; b++) {
    const az = (b / outerCount) * Math.PI * 2 + hash01(b * 7.3 + options.seed) * 0.55;
    const isSkirt = rand() < skirt;
    const hScale = isSkirt ? 0.26 + rand() * 0.22 : 0.7 + rand() * 0.55;
    const height =
      (options.minHeight + rand() * (options.maxHeight - options.minHeight)) * hScale;
    const width = options.baseWidth * (0.7 + rand() * 0.8) * (isSkirt ? 1.3 : 1);
    // Skirt blades are short but travel far sideways, laying low arcs over the
    // soil so neighbouring clumps knit into one continuous carpet.
    const lean = options.lean * (0.65 + rand() * 0.75) * (isSkirt ? 3.1 : 1);
    pushBlade(
      az,
      height,
      width,
      lean,
      (rand() - 0.5) * 0.8,
      0.9 + rand() * 0.22,
      isSkirt ? 0.05 + rand() * 0.08 : 0.02 + (b % 4) * 0.042,
    );
  }

  // Dry seed stalks: slim culms topped with a feathered spike.
  const seedStalks = options.seedStalks ?? 0;
  for (let sIdx = 0; sIdx < seedStalks; sIdx++) {
    const az = hash01(sIdx * 4.7 + options.seed) * Math.PI * 2;
    const height = options.maxHeight * (1.12 + rand() * 0.24);
    const lean = options.lean * 0.32;
    const baseDist = 0.06 + rand() * 0.12;
    const ox = Math.cos(az) * baseDist;
    const oz = Math.sin(az) * baseDist;
    const dx = Math.cos(az) * lean * height;
    const dz = Math.sin(az) * lean * height;
    const base = positions.length / 3;
    positions.push(
      ox - 0.006, 0, oz - 0.006,
      ox + 0.006, 0, oz + 0.006,
      ox + dx * 0.5, height * 0.62, oz + dz * 0.5,
      ox + dx, height, oz + dz,
    );
    uvs.push(0, 0, 1, 0, 0.5, 0.65, 0.5, 1);
    for (let k = 0; k < 4; k++) normals.push(0, 1, 0);
    colors.push(0.5, 0.55, 0.3, 0.5, 0.55, 0.3, 0.88, 0.8, 0.48);
    positions.push(
      ox + dx - 0.05, height, oz + dz,
      ox + dx, height + 0.14, oz + dz,
      ox + dx + 0.05, height, oz + dz,
      ox + dx, height - 0.06, oz + dz,
    );
    uvs.push(0.5, 1, 0.5, 1, 0.5, 1, 0.5, 1);
    for (let k = 0; k < 4; k++) normals.push(0, 1, 0);
    colors.push(0.9, 0.78, 0.42, 0.98, 0.86, 0.5, 0.9, 0.78, 0.42, 0.78, 0.66, 0.34);
    indices.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
    indices.push(base + 4, base + 5, base + 6, base + 5, base + 7, base + 4);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeBoundingSphere();
  return geo;
}

export interface GrassVariantGeometry {
  near: THREE.BufferGeometry;
  ultra: THREE.BufferGeometry;
  far: THREE.BufferGeometry;
}

const GRASS_PRESETS: Record<GrassVariant, GrassClumpOptions> = {
  lush: {
    seed: 101,
    blades: 17,
    minHeight: 0.3,
    maxHeight: 0.76,
    baseWidth: 0.038,
    lean: 0.46,
    dry: 0.06,
    skirt: 0.36,
  },
  tall: {
    seed: 211,
    blades: 14,
    minHeight: 0.48,
    maxHeight: 1.06,
    baseWidth: 0.033,
    lean: 0.3,
    dry: 0.34,
    seedStalks: 2,
    skirt: 0.24,
  },
  dune: {
    seed: 307,
    blades: 12,
    minHeight: 0.36,
    maxHeight: 0.94,
    baseWidth: 0.032,
    lean: 0.62,
    dry: 0.3,
    skirt: 0.28,
  },
  alpine: {
    seed: 419,
    blades: 17,
    minHeight: 0.16,
    maxHeight: 0.38,
    baseWidth: 0.031,
    lean: 0.36,
    dry: 0.04,
    skirt: 0.42,
  },
};

export function createGrassVariantGeometry(variant: GrassVariant): GrassVariantGeometry {
  const preset = GRASS_PRESETS[variant];
  const ultraBlades = Math.round(preset.blades * 1.55);
  const farBlades = Math.max(4, Math.round(preset.blades * 0.38));
  return {
    near: createGrassClumpGeometry(preset),
    ultra: createGrassClumpGeometry({ ...preset, blades: ultraBlades }),
    far: createGrassClumpGeometry({ ...preset, blades: farBlades, skirt: 0.1 }),
  };
}

export const GRASS_VARIANTS: GrassVariant[] = ['lush', 'tall', 'dune', 'alpine'];
