import * as THREE from 'three';

/**
 * High-definition procedural PBR CanvasTexture & DataTexture generators
 * (zero external PNG/JPG 404s).
 * - Albedo/color maps explicitly use THREE.SRGBColorSpace.
 * - Normal & roughness maps explicitly use THREE.NoColorSpace.
 */

function fastHash2D(ix: number, iy: number, seed: number): number {
  let h = (ix * 374761393 + iy * 668265263 + seed * 1442695041) | 0;
  h = ((h ^ (h >> 13)) * 1274126177) | 0;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}

function periodicSmoothNoise(
  u: number,
  v: number,
  period: number,
  seed: number,
): number {
  const x = u * period;
  const y = v * period;
  const ix0 = Math.floor(x);
  const iy0 = Math.floor(y);
  const fx = x - ix0;
  const fy = y - iy0;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);

  const px0 = ((ix0 % period) + period) % period;
  const py0 = ((iy0 % period) + period) % period;
  const px1 = (px0 + 1) % period;
  const py1 = (py0 + 1) % period;

  const a = fastHash2D(px0, py0, seed);
  const b = fastHash2D(px1, py0, seed);
  const c = fastHash2D(px0, py1, seed);
  const d = fastHash2D(px1, py1, seed);

  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function periodicFbm(
  u: number,
  v: number,
  basePeriod: number,
  octaves: number,
  seed: number,
): number {
  let sum = 0;
  let amp = 0.5;
  let norm = 0;
  let period = basePeriod;
  for (let o = 0; o < octaves; o++) {
    sum += amp * periodicSmoothNoise(u, v, period, seed + o * 97);
    norm += amp;
    amp *= 0.5;
    period *= 2;
  }
  return sum / norm;
}

function clamp255(n: number): number {
  return n < 0 ? 0 : n > 255 ? 255 : n | 0;
}

function createTangentNormalTextureFromHeights(
  heights: Float32Array,
  size: number,
  strength: number,
  repeatX: number,
  repeatY: number,
  anisotropy: number,
): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    const ym = (y - 1 + size) % size;
    const yp = (y + 1) % size;
    for (let x = 0; x < size; x++) {
      const xm = (x - 1 + size) % size;
      const xp = (x + 1) % size;

      // Sobel filter for smooth, crisp tangent-space normals
      const tl = heights[ym * size + xm];
      const t = heights[ym * size + x];
      const tr = heights[ym * size + xp];
      const l = heights[y * size + xm];
      const r = heights[y * size + xp];
      const bl = heights[yp * size + xm];
      const b = heights[yp * size + x];
      const br = heights[yp * size + xp];

      const dx = (tr + 2 * r + br - (tl + 2 * l + bl)) * strength;
      const dy = (bl + 2 * b + br - (tl + 2 * t + tr)) * strength;

      let nx = -dx;
      let ny = -dy;
      let nz = 1.0;
      const invLen = 1.0 / Math.sqrt(nx * nx + ny * ny + nz * nz);
      nx *= invLen;
      ny *= invLen;
      nz *= invLen;

      const idx = (y * size + x) * 4;
      data[idx] = clamp255((nx * 0.5 + 0.5) * 255);
      data[idx + 1] = clamp255((ny * 0.5 + 0.5) * 255);
      data[idx + 2] = clamp255((nz * 0.5 + 0.5) * 255);
      data[idx + 3] = 255;
    }
  }

  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = THREE.NoColorSpace;
  tex.anisotropy = anisotropy;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

function createRoughnessTextureFromHeights(
  heights: Float32Array,
  size: number,
  minRough: number,
  maxRough: number,
  invert: boolean,
  repeatX: number,
  repeatY: number,
  anisotropy: number,
): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const t = invert ? 1 - heights[i] : heights[i];
    const v = clamp255((minRough + (maxRough - minRough) * t) * 255);
    const idx = i * 4;
    data[idx] = v;
    data[idx + 1] = v;
    data[idx + 2] = v;
    data[idx + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = THREE.NoColorSpace;
  tex.anisotropy = anisotropy;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

function buildGroundHeightField(size: number): Float32Array {
  const h = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const macro = periodicFbm(u, v, 4, 3, 11);
      const mid = periodicFbm(u, v, 16, 3, 37);
      const fine = periodicSmoothNoise(u, v, 64, 71);
      // Subtle wind-blown coastal ripples
      const ripplePhase = (u * 6 + v * 2 + macro * 1.45) * Math.PI * 2;
      const ripple = 0.5 + 0.5 * Math.sin(ripplePhase);
      // Occasional micro pebble glint
      const grit = fastHash2D(x, y, 193);
      const pebble = grit > 0.965 ? (grit - 0.965) * 14.0 : 0;
      h[y * size + x] = Math.min(
        1,
        macro * 0.34 + mid * 0.32 + fine * 0.16 + ripple * 0.14 + pebble * 0.18,
      );
    }
  }
  return h;
}

let cachedGroundHeights: { size: number; data: Float32Array } | null = null;
function getGroundHeightField(size = 256): Float32Array {
  if (!cachedGroundHeights || cachedGroundHeights.size !== size) {
    cachedGroundHeights = { size, data: buildGroundHeightField(size) };
  }
  return cachedGroundHeights.data;
}

export function createGroundDetailTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const size = 512;
  const hSize = 256;
  const heights = getGroundHeightField(hSize);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const d = img.data;

  // High-brightness neutral-warm detail texture so vertex biome colors multiply cleanly
  // while delivering crisp sand grains, pebble flecks, and organic ground contrast.
  for (let y = 0; y < size; y++) {
    const hy = (y >> 1) * hSize;
    for (let x = 0; x < size; x++) {
      const hv = heights[hy + (x >> 1)];
      const grain = fastHash2D(x, y, 503);
      const micro = fastHash2D(x >> 1, y >> 1, 709);
      const isPebble = grain > 0.986;
      const isDarkFlecks = grain < 0.032;

      let lum = 192 + hv * 62 + (micro - 0.5) * 20;
      if (isPebble) lum += 22;
      else if (isDarkFlecks) lum -= 44;

      const idx = (y * size + x) * 4;
      d[idx] = clamp255(lum * 1.01);
      d[idx + 1] = clamp255(lum * 1.0);
      d[idx + 2] = clamp255(lum * 0.97);
      d[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(144, 144);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return tex;
}

export function createGroundNormalTexture(renderer: THREE.WebGLRenderer): THREE.DataTexture {
  const hSize = 256;
  const heights = getGroundHeightField(hSize);
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return createTangentNormalTextureFromHeights(heights, hSize, 2.35, 144, 144, aniso);
}

export function createGroundRoughnessTexture(renderer: THREE.WebGLRenderer): THREE.DataTexture {
  const hSize = 256;
  const heights = getGroundHeightField(hSize);
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return createRoughnessTextureFromHeights(heights, hSize, 0.72, 0.98, true, 144, 144, aniso);
}

function buildBarkHeightField(size: number): Float32Array {
  const h = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      // Vertical bark ridges warped by low-frequency organic twist
      const warp = periodicFbm(u, v, 4, 2, 211) * 0.14;
      const ridgeWave = Math.sin((u + warp) * 14 * Math.PI * 2);
      const secondaryRidge = Math.sin((u * 2.0 + warp * 1.5) * 14 * Math.PI * 2) * 0.35;
      const fiber = periodicFbm(u * 2.0, v * 0.45, 8, 3, 257);
      const raw = 0.5 + 0.32 * ridgeWave + 0.14 * secondaryRidge + (fiber - 0.5) * 0.45;
      h[y * size + x] = Math.max(0, Math.min(1, raw));
    }
  }
  return h;
}

let cachedBarkHeights: { size: number; data: Float32Array } | null = null;
function getBarkHeightField(size = 256): Float32Array {
  if (!cachedBarkHeights || cachedBarkHeights.size !== size) {
    cachedBarkHeights = { size, data: buildBarkHeightField(size) };
  }
  return cachedBarkHeights.data;
}

export function createBarkTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const size = 256;
  const heights = getBarkHeightField(size);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const d = img.data;

  // Neutral-warm furrowed bark albedo so tree material tints (palm/oak/birch/spruce) stay accurate
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const hv = heights[y * size + x];
      const streak = fastHash2D(x, y >> 2, 313);
      const lichen = periodicFbm(x / size, y / size, 6, 2, 419);
      const crevice = hv < 0.32 ? (0.32 - hv) * 1.15 : 0;
      let r = 135 + hv * 88 - crevice * 75 + (streak - 0.5) * 22;
      let g = 122 + hv * 80 - crevice * 68 + (streak - 0.5) * 18;
      let b = 108 + hv * 72 - crevice * 60 + (streak - 0.5) * 16;
      if (lichen > 0.72) {
        const m = (lichen - 0.72) * 2.2;
        r = r * (1 - m * 0.25) + 150 * m * 0.25;
        g = g * (1 - m * 0.25) + 168 * m * 0.25;
        b = b * (1 - m * 0.25) + 132 * m * 0.25;
      }
      const idx = (y * size + x) * 4;
      d[idx] = clamp255(r);
      d[idx + 1] = clamp255(g);
      d[idx + 2] = clamp255(b);
      d[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 3);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return tex;
}

export function createBarkNormalTexture(renderer: THREE.WebGLRenderer): THREE.DataTexture {
  const size = 256;
  const heights = getBarkHeightField(size);
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return createTangentNormalTextureFromHeights(heights, size, 3.2, 2, 3, aniso);
}

export function createWaterNormalTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const size = 256;
  const heights = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const w1 = Math.sin((u * 4 + v * 2) * Math.PI * 2);
      const w2 = Math.cos((u * 3 - v * 5) * Math.PI * 2) * 0.7;
      const w3 = Math.sin((u * 9 + v * 7) * Math.PI * 2) * 0.35;
      const w4 = (periodicFbm(u, v, 8, 3, 911) - 0.5) * 1.4;
      heights[y * size + x] = 0.5 + (w1 + w2 + w3 + w4) * 0.16;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const d = img.data;
  const strength = 2.6;

  for (let y = 0; y < size; y++) {
    const ym = (y - 1 + size) % size;
    const yp = (y + 1) % size;
    for (let x = 0; x < size; x++) {
      const xm = (x - 1 + size) % size;
      const xp = (x + 1) % size;
      const dx = (heights[y * size + xp] - heights[y * size + xm]) * strength;
      const dy = (heights[yp * size + x] - heights[ym * size + x]) * strength;
      let nx = -dx;
      let ny = -dy;
      let nz = 1.0;
      const inv = 1.0 / Math.sqrt(nx * nx + ny * ny + nz * nz);
      nx *= inv;
      ny *= inv;
      nz *= inv;
      const idx = (y * size + x) * 4;
      d[idx] = clamp255((nx * 0.5 + 0.5) * 255);
      d[idx + 1] = clamp255((ny * 0.5 + 0.5) * 255);
      d[idx + 2] = clamp255((nz * 0.5 + 0.5) * 255);
      d[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(22, 22);
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return tex;
}

export function createWoodPlankTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#8b5a2b';
  ctx.fillRect(0, 0, size, size);

  const rand = makeSeededRand(777);
  for (let p = 0; p < 4; p++) {
    const y = p * 64;
    const tone = p % 2 === 0 ? [154, 102, 54] : [132, 84, 42];
    ctx.fillStyle = `rgb(${tone[0]}, ${tone[1]}, ${tone[2]})`;
    ctx.fillRect(0, y, size, 61);
    ctx.fillStyle = '#331c0b';
    ctx.fillRect(0, y + 61, size, 3);
    ctx.fillStyle = 'rgba(218, 170, 114, 0.24)';
    ctx.fillRect(0, y + 1, size, 2);
    for (let g = 0; g < 36; g++) {
      ctx.fillStyle =
        g % 3 === 0 ? 'rgba(42, 22, 8, 0.28)' : 'rgba(195, 145, 92, 0.16)';
      ctx.fillRect(rand() * size, y + 3 + rand() * 56, 35 + rand() * 110, 1.4);
    }
    // Subtle wood knots & nail heads
    const kx = 24 + rand() * (size - 48);
    const ky = y + 18 + rand() * 26;
    ctx.fillStyle = 'rgba(54, 30, 12, 0.45)';
    ctx.beginPath();
    ctx.ellipse(kx, ky, 7, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return tex;
}

export function createWoodPlankNormalTexture(renderer: THREE.WebGLRenderer): THREE.DataTexture {
  const size = 256;
  const heights = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    const inPlank = y % 64;
    const isSeam = inPlank >= 61;
    for (let x = 0; x < size; x++) {
      const grain = periodicFbm(x / size, (y / size) * 4, 6, 3, 601);
      heights[y * size + x] = isSeam ? 0.08 : 0.45 + grain * 0.45;
    }
  }
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return createTangentNormalTextureFromHeights(heights, size, 2.2, 1, 1, aniso);
}

function buildRockHeightField(size: number): Float32Array {
  const h = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const strata = periodicFbm(u * 0.85, v * 1.75, 5, 4, 511);
      const crag = Math.abs(periodicFbm(u, v, 8, 3, 541) - 0.5) * 2.0;
      const fine = periodicSmoothNoise(u, v, 48, 577);
      //Sharp fracture lines where crag is near 0
      const fracture = Math.min(1, crag * 2.8);
      h[y * size + x] = Math.max(0, Math.min(1, (strata * 0.55 + fine * 0.25) * (0.45 + 0.55 * fracture)));
    }
  }
  return h;
}

let cachedRockHeights: { size: number; data: Float32Array } | null = null;
function getRockHeightField(size = 256): Float32Array {
  if (!cachedRockHeights || cachedRockHeights.size !== size) {
    cachedRockHeights = { size, data: buildRockHeightField(size) };
  }
  return cachedRockHeights.data;
}

export function createRockTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const size = 256;
  const heights = getRockHeightField(size);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const d = img.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const hv = heights[y * size + x];
      const mica = fastHash2D(x, y, 619);
      const mossPatch = periodicFbm(x / size, y / size, 5, 2, 643);
      let lum = 110 + hv * 112 + (mica > 0.97 ? 38 : (mica - 0.5) * 18);
      if (hv < 0.25) lum *= 0.72; // Deep fracture crevices
      let r = lum * 1.01;
      let g = lum * 0.99;
      let b = lum * 0.95;
      // Subtle weathered lichen / mineral warmth
      if (mossPatch > 0.68) {
        const w = (mossPatch - 0.68) * 1.8;
        r = r * (1 - w * 0.28) + 124 * w * 0.28;
        g = g * (1 - w * 0.28) + 138 * w * 0.28;
        b = b * (1 - w * 0.28) + 92 * w * 0.28;
      }
      const idx = (y * size + x) * 4;
      d[idx] = clamp255(r);
      d[idx + 1] = clamp255(g);
      d[idx + 2] = clamp255(b);
      d[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return tex;
}

export function createRockNormalTexture(renderer: THREE.WebGLRenderer): THREE.DataTexture {
  const size = 256;
  const heights = getRockHeightField(size);
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return createTangentNormalTextureFromHeights(heights, size, 3.3, 2, 2, aniso);
}

export function createRockRoughnessTexture(renderer: THREE.WebGLRenderer): THREE.DataTexture {
  const size = 256;
  const heights = getRockHeightField(size);
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return createRoughnessTextureFromHeights(heights, size, 0.68, 0.96, true, 2, 2, aniso);
}

function buildLeafHeightField(size: number): Float32Array {
  const h = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const cluster = periodicFbm(u, v, 8, 3, 733);
      const leafVein = Math.abs(Math.sin((u * 12 + cluster * 1.4) * Math.PI * 2));
      const micro = periodicSmoothNoise(u, v, 32, 761);
      h[y * size + x] = Math.min(1, cluster * 0.58 + leafVein * 0.24 + micro * 0.18);
    }
  }
  return h;
}

let cachedLeafHeights: { size: number; data: Float32Array } | null = null;
function getLeafHeightField(size = 256): Float32Array {
  if (!cachedLeafHeights || cachedLeafHeights.size !== size) {
    cachedLeafHeights = { size, data: buildLeafHeightField(size) };
  }
  return cachedLeafHeights.data;
}

export function createLeafCanopyTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rand = makeSeededRand(9091);

  // Neutral-bright shaded leaf mosaic so material color tints (oak/palm/cherry/spruce) stay vibrant
  ctx.fillStyle = '#5c7a52';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 1400; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const rx = 5 + rand() * 8;
    const ry = 2.4 + rand() * 4.2;
    const ang = rand() * Math.PI;
    const shade = 118 + Math.floor(rand() * 118);
    const r = Math.floor(shade * 0.78);
    const g = Math.floor(shade * 1.02);
    const b = Math.floor(shade * 0.66);

    // Wrap across edges so tiling is seamless
    for (const ox of [-size, 0, size]) {
      for (const oy of [-size, 0, size]) {
        const px = x + ox;
        const py = y + oy;
        if (px < -20 || px > size + 20 || py < -20 || py > size + 20) continue;
        ctx.fillStyle = `rgba(${r},${g},${b},0.62)`;
        ctx.beginPath();
        ctx.ellipse(px, py, rx, ry, ang, 0, Math.PI * 2);
        ctx.fill();

        // Crisp sunlit leaf midrib
        ctx.strokeStyle = `rgba(${Math.min(255, r + 40)},${Math.min(255, g + 35)},${Math.min(255, b + 20)},0.35)`;
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(px - Math.cos(ang) * rx * 0.75, py - Math.sin(ang) * rx * 0.75);
        ctx.lineTo(px + Math.cos(ang) * rx * 0.75, py + Math.sin(ang) * rx * 0.75);
        ctx.stroke();
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return tex;
}

export function createLeafNormalTexture(renderer: THREE.WebGLRenderer): THREE.DataTexture {
  const size = 256;
  const heights = getLeafHeightField(size);
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return createTangentNormalTextureFromHeights(heights, size, 2.2, 2, 2, aniso);
}

export interface PbrTextureSet {
  map: THREE.CanvasTexture;
  normalMap: THREE.DataTexture;
  roughnessMap: THREE.DataTexture;
}

export function createGunmetalTextureSet(anisotropy = 4): PbrTextureSet {
  const size = 256;
  const heights = new Float32Array(size * size);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const d = img.data;

  for (let y = 0; y < size; y++) {
    const v = y / size;
    // Horizontal brushed machining lines + fine parkerized grain
    const brushBand = fastHash2D(0, y, 811);
    const serration =
      v > 0.72 && v < 0.95 ? Math.sin(v * 90 * Math.PI * 2) * 0.35 : 0;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const micro = fastHash2D(x, y, 823);
      const streak = periodicSmoothNoise(u * 0.15, v * 4.0, 16, 829);
      const edgeWear =
        Math.abs(u - 0.5) > 0.44 || Math.abs(v - 0.5) > 0.44 ? 0.25 : 0;
      const hVal = Math.max(
        0,
        Math.min(1, 0.5 + (brushBand - 0.5) * 0.22 + (micro - 0.5) * 0.18 + serration),
      );
      heights[y * size + x] = hVal;

      const base = 62 + streak * 24 + (brushBand - 0.5) * 14 + (micro - 0.5) * 10 + edgeWear * 48;
      const idx = (y * size + x) * 4;
      d[idx] = clamp255(base * 0.95);
      d[idx + 1] = clamp255(base * 0.98);
      d[idx + 2] = clamp255(base * 1.04);
      d[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = anisotropy;

  const normalMap = createTangentNormalTextureFromHeights(
    heights,
    size,
    1.9,
    1,
    1,
    anisotropy,
  );
  const roughnessMap = createRoughnessTextureFromHeights(
    heights,
    size,
    0.22,
    0.48,
    true,
    1,
    1,
    anisotropy,
  );

  return { map, normalMap, roughnessMap };
}

export function createTacticalGripTextureSet(anisotropy = 4): PbrTextureSet {
  const size = 256;
  const heights = new Float32Array(size * size);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const d = img.data;

  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      // Diamond-knurled polymer grip stippling
      const diagA = Math.abs(Math.sin((u + v) * 24 * Math.PI));
      const diagB = Math.abs(Math.sin((u - v) * 24 * Math.PI));
      const knurl = Math.min(diagA, diagB);
      const stipple = fastHash2D(x, y, 941) * 0.16;
      const hv = Math.max(0, Math.min(1, knurl * 0.84 + stipple));
      heights[y * size + x] = hv;

      const base = 36 + hv * 32;
      const idx = (y * size + x) * 4;
      d[idx] = clamp255(base * 1.05);
      d[idx + 1] = clamp255(base * 0.96);
      d[idx + 2] = clamp255(base * 0.92);
      d[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = anisotropy;

  const normalMap = createTangentNormalTextureFromHeights(
    heights,
    size,
    2.6,
    2,
    2,
    anisotropy,
  );
  const roughnessMap = createRoughnessTextureFromHeights(
    heights,
    size,
    0.58,
    0.88,
    true,
    2,
    2,
    anisotropy,
  );
  return { map, normalMap, roughnessMap };
}

export function createTacticalGloveTextureSet(anisotropy = 4): PbrTextureSet {
  const size = 256;
  const heights = new Float32Array(size * size);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const d = img.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Tactical woven ballistic nylon / leather grain
      const weave = ((x >> 1) + (y >> 1)) % 2 === 0 ? 0.65 : 0.42;
      const grain = periodicFbm(x / size, y / size, 12, 2, 1021);
      const hv = weave * 0.55 + grain * 0.45;
      heights[y * size + x] = hv;

      const lum = 34 + hv * 28;
      const idx = (y * size + x) * 4;
      d[idx] = clamp255(lum * 1.04);
      d[idx + 1] = clamp255(lum * 1.0);
      d[idx + 2] = clamp255(lum * 0.96);
      d[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = anisotropy;

  const normalMap = createTangentNormalTextureFromHeights(
    heights,
    size,
    1.8,
    2,
    2,
    anisotropy,
  );
  const roughnessMap = createRoughnessTextureFromHeights(
    heights,
    size,
    0.65,
    0.92,
    true,
    2,
    2,
    anisotropy,
  );
  return { map, normalMap, roughnessMap };
}

function makeSeededRand(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function createHolsteinCoatTexture(anisotropy = 4): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rand = makeSeededRand(101);

  ctx.fillStyle = '#f8f7f4';
  ctx.fillRect(0, 0, size, size);

  // Distinct organic black Holstein cow patches
  ctx.fillStyle = '#18181b';
  const patches = [
    [45, 55, 52, 38, 0.3],
    [170, 75, 48, 42, -0.4],
    [110, 175, 64, 44, 0.2],
    [220, 185, 40, 34, 0.5],
    [25, 195, 36, 28, -0.2],
    [130, 32, 38, 22, 0.1],
  ];
  for (const [x, y, rx, ry, rot] of patches) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
    ctx.fill();
    for (let k = 0; k < 5; k++) {
      ctx.beginPath();
      ctx.ellipse(
        x + (rand() - 0.5) * rx * 1.1,
        y + (rand() - 0.5) * ry * 1.1,
        rx * (0.28 + rand() * 0.25),
        ry * (0.28 + rand() * 0.25),
        rand() * Math.PI,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }

  // Fine short hair grain
  for (let i = 0; i < 1400; i++) {
    const x = rand() * size;
    const y = rand() * size;
    ctx.fillStyle = rand() > 0.5 ? 'rgba(255,255,255,0.12)' : 'rgba(24,24,27,0.12)';
    ctx.fillRect(x, y, 2.5, 1);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

export function createYorkshirePigTexture(anisotropy = 4): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rand = makeSeededRand(202);

  ctx.fillStyle = '#f6b8b0';
  ctx.fillRect(0, 0, size, size);

  // Subtle rosy skin mottling
  for (let i = 0; i < 95; i++) {
    ctx.fillStyle =
      rand() > 0.45 ? 'rgba(232,146,138,0.22)' : 'rgba(252,211,204,0.22)';
    ctx.beginPath();
    ctx.ellipse(
      rand() * size,
      rand() * size,
      8 + rand() * 20,
      5 + rand() * 14,
      rand() * Math.PI,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  // Coarse sparse light bristles
  for (let i = 0; i < 750; i++) {
    const x = rand() * size;
    const y = rand() * size;
    ctx.strokeStyle = 'rgba(255,244,235,0.42)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 3.5, y + (rand() - 0.5) * 2);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

export function createChestnutHorseTexture(anisotropy = 4): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rand = makeSeededRand(303);

  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, '#7c3416');
  grad.addColorStop(0.5, '#96401c');
  grad.addColorStop(1, '#6d2c12');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Glossy Quarter Horse coat dapples & fine sleek hair strokes
  for (let i = 0; i < 80; i++) {
    ctx.fillStyle = 'rgba(182,88,42,0.16)';
    ctx.beginPath();
    ctx.ellipse(
      rand() * size,
      rand() * size,
      6 + rand() * 12,
      4 + rand() * 8,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  for (let i = 0; i < 1800; i++) {
    const x = rand() * size;
    const y = rand() * size;
    ctx.fillStyle = rand() > 0.5 ? 'rgba(220,130,75,0.14)' : 'rgba(62,22,8,0.16)';
    ctx.fillRect(x, y, 4, 1);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

export function createWoolFleeceTexture(anisotropy = 4): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rand = makeSeededRand(404);

  ctx.fillStyle = '#ede8dc';
  ctx.fillRect(0, 0, size, size);

  // Curly textured white wool locks
  for (let i = 0; i < 620; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 3 + rand() * 5.5;
    ctx.fillStyle = rand() > 0.45 ? 'rgba(255,253,248,0.72)' : 'rgba(210,202,186,0.58)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(175,166,150,0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

export function createMottledGoatTexture(anisotropy = 4): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rand = makeSeededRand(505);

  ctx.fillStyle = '#7c4a26';
  ctx.fillRect(0, 0, size, size);

  // Mottled cream-white & dark chocolate patches
  for (let i = 0; i < 42; i++) {
    ctx.fillStyle = rand() > 0.38 ? '#f5efe6' : '#3d2414';
    ctx.beginPath();
    ctx.ellipse(
      rand() * size,
      rand() * size,
      10 + rand() * 24,
      7 + rand() * 18,
      rand() * Math.PI,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  for (let i = 0; i < 1200; i++) {
    ctx.fillStyle = 'rgba(255,248,238,0.14)';
    ctx.fillRect(rand() * size, rand() * size, 3, 1);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

export function createTabbyFurTexture(anisotropy = 4): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rand = makeSeededRand(606);

  ctx.fillStyle = '#b98856';
  ctx.fillRect(0, 0, size, size);

  // Mackerel tabby stripes
  for (let s = 0; s < 14; s++) {
    const x = (s / 14) * size;
    ctx.fillStyle = 'rgba(42,29,19,0.72)';
    ctx.beginPath();
    ctx.ellipse(x, size * 0.5, 5 + (s % 2) * 3, size * 0.46, 0.12, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 1100; i++) {
    ctx.fillStyle = rand() > 0.5 ? 'rgba(245,220,185,0.22)' : 'rgba(35,22,12,0.2)';
    ctx.fillRect(rand() * size, rand() * size, 3, 1);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

export function createHayTexture(anisotropy = 4): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rand = makeSeededRand(707);

  ctx.fillStyle = '#c9972c';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 1400; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const len = 14 + rand() * 34;
    const ang = (rand() - 0.5) * 0.55;
    ctx.strokeStyle =
      rand() > 0.4 ? 'rgba(234,195,88,0.7)' : 'rgba(138,94,20,0.55)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

export function createGrizzlyFurTexture(anisotropy = 4): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rand = makeSeededRand(808);

  ctx.fillStyle = '#3b2416';
  ctx.fillRect(0, 0, size, size);

  // Dark chocolate fur depth
  for (let i = 0; i < 1600; i++) {
    const x = rand() * size;
    const y = rand() * size;
    ctx.strokeStyle = rand() > 0.45 ? 'rgba(38,22,12,0.55)' : 'rgba(84,52,32,0.45)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 6 + rand() * 5, y + (rand() - 0.5) * 3);
    ctx.stroke();
  }
  // Silver-tipped grizzled guard hairs
  for (let i = 0; i < 650; i++) {
    const x = rand() * size;
    const y = rand() * size;
    ctx.strokeStyle = 'rgba(216,214,208,0.42)';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 4 + rand() * 3, y + (rand() - 0.5) * 2);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

export function createWolfFurTexture(anisotropy = 4): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rand = makeSeededRand(909);

  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, '#475569');
  grad.addColorStop(0.5, '#94a3b8');
  grad.addColorStop(1, '#e2e8f0');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 2000; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = rand();
    ctx.strokeStyle =
      r < 0.35
        ? 'rgba(30,41,59,0.45)'
        : r < 0.72
          ? 'rgba(203,213,225,0.4)'
          : 'rgba(248,250,252,0.48)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 5 + rand() * 4, y + (rand() - 0.5) * 2.5);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

export function createLionFurTexture(anisotropy = 4): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rand = makeSeededRand(1010);

  ctx.fillStyle = '#c88d42';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 1600; i++) {
    const x = rand() * size;
    const y = rand() * size;
    ctx.fillStyle =
      rand() > 0.5 ? 'rgba(232,184,108,0.22)' : 'rgba(138,88,28,0.2)';
    ctx.fillRect(x, y, 4, 1.2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

export function createLionManeTexture(anisotropy = 4): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rand = makeSeededRand(1111);

  ctx.fillStyle = '#2d180c';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 1400; i++) {
    const x = rand() * size;
    const y = rand() * size;
    ctx.strokeStyle =
      rand() > 0.35 ? 'rgba(92,50,22,0.52)' : 'rgba(20,10,5,0.65)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 8 + rand() * 6, y + (rand() - 0.5) * 4);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

export function createRedFoxFurTexture(anisotropy = 4): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rand = makeSeededRand(1212);

  ctx.fillStyle = '#d95318';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 1700; i++) {
    const x = rand() * size;
    const y = rand() * size;
    ctx.strokeStyle =
      rand() > 0.45 ? 'rgba(249,115,22,0.38)' : 'rgba(154,52,18,0.34)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 4.5, y + (rand() - 0.5) * 2);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

export function createCrocodileScaleTexture(anisotropy = 4): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rand = makeSeededRand(1313);

  ctx.fillStyle = '#2c3a21';
  ctx.fillRect(0, 0, size, size);

  // Armored osteoderm scale plates
  const cols = 12;
  const rows = 12;
  const cw = size / cols;
  const ch = size / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const shade = Math.floor((rand() - 0.5) * 18);
      ctx.fillStyle = `rgb(${48 + shade}, ${64 + shade}, ${34 + shade})`;
      ctx.fillRect(c * cw + 1.5, r * ch + 1.5, cw - 3, ch - 3);
      ctx.strokeStyle = 'rgba(15,22,12,0.72)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(c * cw + 1, r * ch + 1, cw - 2, ch - 2);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

export function createBisonFurTexture(anisotropy = 4): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rand = makeSeededRand(1414);

  ctx.fillStyle = '#362014';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 1800; i++) {
    const x = rand() * size;
    const y = rand() * size;
    ctx.strokeStyle =
      rand() > 0.5 ? 'rgba(78,46,26,0.52)' : 'rgba(26,14,8,0.58)';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rand() - 0.5) * 5, y + 6 + rand() * 5);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

export function createOwlFeatherTexture(anisotropy = 4): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rand = makeSeededRand(1515);

  ctx.fillStyle = '#5c493c';
  ctx.fillRect(0, 0, size, size);

  // Intricate mottled brown, gray & cream barred plumage
  for (let r = 0; r < 18; r++) {
    const y = (r / 18) * size;
    for (let c = 0; c < 14; c++) {
      const x = (c / 14) * size + (r % 2) * 8;
      ctx.fillStyle =
        rand() > 0.52
          ? 'rgba(214,202,184,0.48)'
          : rand() > 0.3
            ? 'rgba(46,35,28,0.62)'
            : 'rgba(120,113,108,0.52)';
      ctx.beginPath();
      ctx.ellipse(x, y, 7, 3.8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

export interface PbrMaterialBundle {
  material: THREE.MeshStandardMaterial;
  textures: THREE.Texture[];
  dispose: () => void;
}

function makeSurfaceColorCanvas(
  size: number,
  baseRgb: [number, number, number],
  darkRgb: [number, number, number],
  lightRgb: [number, number, number],
  heights: Float32Array,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const d = img.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const hv = heights[y * size + x];
      const speckle = (fastHash2D(x, y, 331) - 0.5) * 0.18;
      const t = Math.max(0, Math.min(1, hv + speckle));
      let r: number;
      let g: number;
      let b: number;
      if (t < 0.5) {
        const k = t * 2;
        r = darkRgb[0] + (baseRgb[0] - darkRgb[0]) * k;
        g = darkRgb[1] + (baseRgb[1] - darkRgb[1]) * k;
        b = darkRgb[2] + (baseRgb[2] - darkRgb[2]) * k;
      } else {
        const k = (t - 0.5) * 2;
        r = baseRgb[0] + (lightRgb[0] - baseRgb[0]) * k;
        g = baseRgb[1] + (lightRgb[1] - baseRgb[1]) * k;
        b = baseRgb[2] + (lightRgb[2] - baseRgb[2]) * k;
      }
      const idx = (y * size + x) * 4;
      d[idx] = clamp255(r);
      d[idx + 1] = clamp255(g);
      d[idx + 2] = clamp255(b);
      d[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

function configureSurfaceTexture(
  canvas: HTMLCanvasElement,
  colorSpace: THREE.ColorSpace,
  repeatX: number,
  repeatY: number,
  anisotropy = 4,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = colorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createRealisticSurfaceMaterial(options: {
  kind: 'grass' | 'sand' | 'rock' | 'bark' | 'sea' | 'animal_fur';
  repeat?: number;
  roughness?: number;
  metalness?: number;
  anisotropy?: number;
}): PbrMaterialBundle {
  const repeat = options.repeat ?? 1;
  const aniso = options.anisotropy ?? 4;
  const size = 256;

  let heights: Float32Array;
  let colorCanvas: HTMLCanvasElement;
  let normalStrength = 2.4;
  let defaultRoughness = options.roughness ?? 0.85;
  let defaultMetalness = options.metalness ?? 0.04;

  switch (options.kind) {
    case 'grass':
      heights = getGroundHeightField(size);
      colorCanvas = makeSurfaceColorCanvas(size, [66, 118, 46], [40, 78, 28], [118, 168, 72], heights);
      defaultRoughness = options.roughness ?? 0.86;
      break;
    case 'sand':
      heights = getGroundHeightField(size);
      colorCanvas = makeSurfaceColorCanvas(size, [216, 190, 140], [176, 148, 102], [242, 224, 184], heights);
      normalStrength = 2.1;
      defaultRoughness = options.roughness ?? 0.9;
      break;
    case 'rock':
      heights = getRockHeightField(size);
      colorCanvas = makeSurfaceColorCanvas(size, [118, 114, 108], [62, 60, 56], [164, 158, 148], heights);
      normalStrength = 3.2;
      defaultRoughness = options.roughness ?? 0.88;
      break;
    case 'bark':
      heights = getBarkHeightField(size);
      colorCanvas = makeSurfaceColorCanvas(size, [96, 66, 44], [48, 30, 18], [136, 98, 68], heights);
      normalStrength = 3.0;
      defaultRoughness = options.roughness ?? 0.92;
      break;
    case 'sea':
      heights = getGroundHeightField(size);
      colorCanvas = makeSurfaceColorCanvas(size, [14, 90, 120], [8, 59, 82], [73, 182, 214], heights);
      normalStrength = 2.6;
      defaultRoughness = options.roughness ?? 0.16;
      defaultMetalness = options.metalness ?? 0.35;
      break;
    case 'animal_fur':
    default:
      heights = getBarkHeightField(size);
      colorCanvas = makeSurfaceColorCanvas(size, [124, 83, 52], [73, 46, 26], [180, 131, 90], heights);
      normalStrength = 1.6;
      defaultRoughness = options.roughness ?? 0.82;
      break;
  }

  const map = configureSurfaceTexture(colorCanvas, THREE.SRGBColorSpace, repeat, repeat, aniso);
  const normalMap = createTangentNormalTextureFromHeights(
    heights,
    size,
    normalStrength,
    repeat,
    repeat,
    aniso,
  );
  const roughnessMap = createRoughnessTextureFromHeights(
    heights,
    size,
    Math.max(0.15, defaultRoughness - 0.16),
    Math.min(1.0, defaultRoughness + 0.08),
    true,
    repeat,
    repeat,
    aniso,
  );

  const material = new THREE.MeshStandardMaterial({
    map,
    normalMap,
    normalScale: new THREE.Vector2(1.05, 1.05),
    roughnessMap,
    roughness: 1.0,
    metalness: defaultMetalness,
  });

  return {
    material,
    textures: [map, normalMap, roughnessMap],
    dispose: () => {
      map.dispose();
      normalMap.dispose();
      roughnessMap.dispose();
      material.dispose();
    },
  };
}


