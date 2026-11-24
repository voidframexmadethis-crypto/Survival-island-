import * as THREE from 'three';

/**
 * Shared singleton procedural PBR textures & photorealistic automotive material/sub-assembly factory.
 * Textures and shared geometries are generated once and cached across all vehicles for zero FPS / memory overhead.
 */

let cachedMetallicFlakeNormal: THREE.CanvasTexture | null = null;
let cachedClearcoatPolishNormal: THREE.CanvasTexture | null = null;
let cachedLeatherNormal: THREE.CanvasTexture | null = null;
let cachedLeatherStitchMap: THREE.CanvasTexture | null = null;
let cachedStayfastCanvasMap: THREE.CanvasTexture | null = null;
let cachedStayfastCanvasNormal: THREE.CanvasTexture | null = null;
let cachedCarbonWeaveMap: THREE.CanvasTexture | null = null;
let cachedWalnutWoodMap: THREE.CanvasTexture | null = null;
let cachedCarpetMap: THREE.CanvasTexture | null = null;
let cachedGaugeClusterMap: THREE.CanvasTexture | null = null;
let cachedTireTreadAlbedo: THREE.CanvasTexture | null = null;
let cachedTireTreadNormal: THREE.CanvasTexture | null = null;
let cachedTireSidewallAlbedo: THREE.CanvasTexture | null = null;
let cachedTireSidewallNormal: THREE.CanvasTexture | null = null;
let cachedGrilleAlbedo: THREE.CanvasTexture | null = null;
let cachedGrilleNormal: THREE.CanvasTexture | null = null;
let cachedHeadlightLensMap: THREE.CanvasTexture | null = null;
let cachedHeadlightLensNormal: THREE.CanvasTexture | null = null;
let cachedTaillightLensMap: THREE.CanvasTexture | null = null;
let cachedTaillightLensNormal: THREE.CanvasTexture | null = null;
let cachedAmberLensMap: THREE.CanvasTexture | null = null;
let cachedAmberLensNormal: THREE.CanvasTexture | null = null;
let cachedBrushedMetalMap: THREE.CanvasTexture | null = null;
let cachedCadillacScriptMap: THREE.CanvasTexture | null = null;
let cachedCadillacCrestMap: THREE.CanvasTexture | null = null;
let cachedChevyBowtieMap: THREE.CanvasTexture | null = null;
const cachedLicensePlateMaps = new Map<string, THREE.CanvasTexture>();
const cachedSpokeGeos = new Map<string, THREE.ExtrudeGeometry>();

function canUseCanvas(): boolean {
  return typeof document !== 'undefined' && typeof document.createElement === 'function';
}

function makeRepeatTex(
  canvas: HTMLCanvasElement,
  repeatX: number,
  repeatY: number,
  isColor = true,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = 4;
  tex.userData = { sharedAsset: true };
  tex.needsUpdate = true;
  return tex;
}

function makeClampTex(canvas: HTMLCanvasElement, isColor = true): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = 4;
  tex.userData = { sharedAsset: true };
  tex.needsUpdate = true;
  return tex;
}

/** Fine automotive metallic flake normal map */
export function getMetallicFlakeNormalMap(): THREE.CanvasTexture | null {
  if (cachedMetallicFlakeNormal) return cachedMetallicFlakeNormal;
  if (!canUseCanvas()) return null;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const img = ctx.createImageData(size, size);
  const data = img.data;
  let seed = 133791;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  for (let i = 0; i < data.length; i += 4) {
    const nx = (rand() - 0.5) * 2;
    const ny = (rand() - 0.5) * 2;
    const isFlake = rand() > 0.76 ? 1.0 : 0.15;
    data[i] = Math.round(128 + nx * 26 * isFlake);
    data[i + 1] = Math.round(128 + ny * 26 * isFlake);
    data[i + 2] = 252;
    data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  cachedMetallicFlakeNormal = makeRepeatTex(canvas, 16, 16, false);
  return cachedMetallicFlakeNormal;
}

/** Ultra-subtle glossy clearcoat micro-polish normal map */
export function getClearcoatPolishNormalMap(): THREE.CanvasTexture | null {
  if (cachedClearcoatPolishNormal) return cachedClearcoatPolishNormal;
  if (!canUseCanvas()) return null;

  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const img = ctx.createImageData(size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const w1 = Math.sin(x * 0.22) * Math.cos(y * 0.22);
      const w2 = Math.sin((x + y) * 0.16);
      d[idx] = Math.round(128 + w1 * 2.5);
      d[idx + 1] = Math.round(128 + w2 * 2.5);
      d[idx + 2] = 255;
      d[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  cachedClearcoatPolishNormal = makeRepeatTex(canvas, 6, 6, false);
  return cachedClearcoatPolishNormal;
}

/** Real pebbled Nappa automotive leather normal map */
export function getLeatherNormalMap(): THREE.CanvasTexture | null {
  if (cachedLeatherNormal) return cachedLeatherNormal;
  if (!canUseCanvas()) return null;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#8080ff';
  ctx.fillRect(0, 0, size, size);

  let seed = 42421;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 1800; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 1.6 + rand() * 2.8;
    const g = ctx.createRadialGradient(x - r * 0.25, y - r * 0.25, 0.2, x, y, r);
    g.addColorStop(0, 'rgba(155, 155, 255, 0.36)');
    g.addColorStop(1, 'rgba(104, 104, 240, 0.0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  cachedLeatherNormal = makeRepeatTex(canvas, 5, 5, false);
  return cachedLeatherNormal;
}

/** Diamond-quilted perforated leather stitch & bolster map */
export function getLeatherQuiltMap(): THREE.CanvasTexture | null {
  if (cachedLeatherStitchMap) return cachedLeatherStitchMap;
  if (!canUseCanvas()) return null;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#f3f1ed';
  ctx.fillRect(0, 0, size, size);

  // Soft pillow highlight inside each diamond cell
  const step = 64;
  for (let y = 0; y < size; y += step) {
    for (let x = 0; x < size; x += step) {
      const g = ctx.createRadialGradient(x + 32, y + 32, 2, x + 32, y + 32, 34);
      g.addColorStop(0, 'rgba(255,255,255,0.45)');
      g.addColorStop(1, 'rgba(210,204,194,0.12)');
      ctx.fillStyle = g;
      ctx.fillRect(x, y, step, step);
    }
  }

  ctx.strokeStyle = 'rgba(25,20,14,0.26)';
  ctx.lineWidth = 3;
  for (let i = -size; i < size * 2; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + size, size);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(i + size, 0);
    ctx.lineTo(i, size);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.52)';
  ctx.lineWidth = 1.2;
  ctx.setLineDash([4, 4]);
  for (let i = -size; i < size * 2; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + size, size);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(i + size, 0);
    ctx.lineTo(i, size);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  ctx.fillStyle = 'rgba(0,0,0,0.14)';
  for (let y = 12; y < size; y += 16) {
    for (let x = 12; x < size; x += 16) {
      ctx.beginPath();
      ctx.arc(x, y, 1.0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  cachedLeatherStitchMap = makeRepeatTex(canvas, 2.5, 2.5, true);
  return cachedLeatherStitchMap;
}

/** Real-life Haartz Stayfast woven twill convertible soft-top cloth */
export function getStayfastCanvasMap(): THREE.CanvasTexture | null {
  if (cachedStayfastCanvasMap) return cachedStayfastCanvasMap;
  if (!canUseCanvas()) return null;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#17181c';
  ctx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += 4) {
    for (let x = 0; x < size; x += 4) {
      const phase = ((x + y) >> 2) & 3;
      const shade = phase === 0 ? 34 : phase === 1 ? 26 : phase === 2 ? 20 : 28;
      ctx.fillStyle = `rgb(${shade}, ${shade + 1}, ${shade + 3})`;
      ctx.fillRect(x, y, 3, 2);
      ctx.fillStyle = `rgb(${shade - 5}, ${shade - 4}, ${shade - 2})`;
      ctx.fillRect(x, y + 2, 2, 2);
    }
  }

  ctx.fillStyle = 'rgba(8, 9, 12, 0.72)';
  ctx.fillRect(0, 124, size, 8);
  ctx.strokeStyle = 'rgba(115, 120, 132, 0.5)';
  ctx.lineWidth = 1.2;
  ctx.setLineDash([5, 3]);
  ctx.beginPath();
  ctx.moveTo(0, 121);
  ctx.lineTo(size, 121);
  ctx.moveTo(0, 135);
  ctx.lineTo(size, 135);
  ctx.stroke();
  ctx.setLineDash([]);

  cachedStayfastCanvasMap = makeRepeatTex(canvas, 5, 5, true);
  return cachedStayfastCanvasMap;
}

/** Normal map for woven Haartz Stayfast convertible canvas fabric */
export function getStayfastCanvasNormalMap(): THREE.CanvasTexture | null {
  if (cachedStayfastCanvasNormal) return cachedStayfastCanvasNormal;
  if (!canUseCanvas()) return null;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const img = ctx.createImageData(size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const diag = Math.sin((x + y) * 1.15);
      const cross = Math.cos((x - y) * 1.15);
      const seam = Math.abs(y - 128) < 5 ? -36 : 0;
      d[idx] = Math.max(0, Math.min(255, Math.round(128 + diag * 26)));
      d[idx + 1] = Math.max(0, Math.min(255, Math.round(128 + cross * 26 + seam)));
      d[idx + 2] = 242;
      d[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  cachedStayfastCanvasNormal = makeRepeatTex(canvas, 5, 5, false);
  return cachedStayfastCanvasNormal;
}

/** Authentic 2x2 twill carbon fiber weave texture */
export function getCarbonWeaveMap(): THREE.CanvasTexture | null {
  if (cachedCarbonWeaveMap) return cachedCarbonWeaveMap;
  if (!canUseCanvas()) return null;

  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#0f1217';
  ctx.fillRect(0, 0, size, size);
  const cell = 8;
  for (let y = 0; y < size; y += cell) {
    for (let x = 0; x < size; x += cell) {
      const parity = ((x / cell + y / cell) | 0) % 2;
      const grad = ctx.createLinearGradient(x, y, x + cell, y + cell);
      if (parity === 0) {
        grad.addColorStop(0, '#2a303c');
        grad.addColorStop(1, '#12151c');
      } else {
        grad.addColorStop(0, '#141820');
        grad.addColorStop(1, '#313846');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(x + 0.5, y + 0.5, cell - 1, cell - 1);
    }
  }
  cachedCarbonWeaveMap = makeRepeatTex(canvas, 6, 6, true);
  return cachedCarbonWeaveMap;
}

/** Polished burled walnut woodgrain for luxury steering wheels & classic dash trim */
export function getWalnutWoodMap(): THREE.CanvasTexture | null {
  if (cachedWalnutWoodMap) return cachedWalnutWoodMap;
  if (!canUseCanvas()) return null;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#5a2b12');
  grad.addColorStop(0.5, '#7c3c19');
  grad.addColorStop(1, '#431d0b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(28, 10, 3, 0.42)';
  for (let i = 0; i < 42; i++) {
    ctx.lineWidth = 1.2 + (i % 3);
    ctx.beginPath();
    const y0 = (i / 42) * size;
    for (let x = 0; x <= size; x += 16) {
      const y = y0 + Math.sin(x * 0.05 + i * 0.7) * 7;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  cachedWalnutWoodMap = makeRepeatTex(canvas, 2, 2, true);
  return cachedWalnutWoodMap;
}

/** Plush woven automotive carpet floor texture */
export function getCarpetMap(): THREE.CanvasTexture | null {
  if (cachedCarpetMap) return cachedCarpetMap;
  if (!canUseCanvas()) return null;

  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const img = ctx.createImageData(size, size);
  const d = img.data;
  let seed = 88991;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < d.length; i += 4) {
    const v = 22 + Math.floor(rand() * 20);
    d[i] = v;
    d[i + 1] = v;
    d[i + 2] = v + 2;
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  cachedCarpetMap = makeRepeatTex(canvas, 6, 6, true);
  return cachedCarpetMap;
}

/** Backlit dual-dial tachometer & speedometer gauge cluster texture */
export function getGaugeClusterMap(): THREE.CanvasTexture | null {
  if (cachedGaugeClusterMap) return cachedGaugeClusterMap;
  if (!canUseCanvas()) return null;

  const w = 512;
  const h = 192;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#07090e';
  ctx.fillRect(0, 0, w, h);

  const drawDial = (cx: number, cy: number, r: number, needleAngle: number, accent: string, unit: string) => {
    const rimGrad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    rimGrad.addColorStop(0, '#f8fafc');
    rimGrad.addColorStop(0.5, '#64748b');
    rimGrad.addColorStop(1, '#e2e8f0');
    ctx.strokeStyle = rimGrad;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#0b1220';
    ctx.beginPath();
    ctx.arc(cx, cy, r - 3, 0, Math.PI * 2);
    ctx.fill();

    for (let i = 0; i <= 12; i++) {
      const a = Math.PI * 0.75 + (i / 12) * Math.PI * 1.5;
      ctx.strokeStyle = i >= 10 ? '#ef4444' : '#f1f5f9';
      ctx.lineWidth = i % 2 === 0 ? 3 : 1.5;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (r - 17), cy + Math.sin(a) * (r - 17));
      ctx.lineTo(cx + Math.cos(a) * (r - 6), cy + Math.sin(a) * (r - 6));
      ctx.stroke();
    }

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(unit, cx, cy + 28);

    ctx.strokeStyle = accent;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(needleAngle) * (r - 16), cy + Math.sin(needleAngle) * (r - 16));
    ctx.stroke();

    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    ctx.fill();
  };

  drawDial(118, 96, 74, Math.PI * 1.15, '#f97316', 'RPM x1000');
  drawDial(394, 96, 74, Math.PI * 0.92, '#38bdf8', 'MPH');

  ctx.fillStyle = '#0a1628';
  ctx.fillRect(212, 36, 88, 120);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;
  ctx.strokeRect(212, 36, 88, 120);
  ctx.fillStyle = '#7dd3fc';
  ctx.font = 'bold 22px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('PRNDL', 256, 72);
  ctx.fillStyle = '#34d399';
  ctx.font = 'bold 20px monospace';
  ctx.fillText('FUEL 100', 256, 108);
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 14px monospace';
  ctx.fillText('PSI OK', 256, 138);

  cachedGaugeClusterMap = makeClampTex(canvas, true);
  return cachedGaugeClusterMap;
}

/** Photorealistic directional vulcanized tire tread albedo + normal textures */
export function getTireTreadTextureSet(): {
  map: THREE.CanvasTexture | null;
  normalMap: THREE.CanvasTexture | null;
} {
  if (cachedTireTreadAlbedo && cachedTireTreadNormal) {
    return { map: cachedTireTreadAlbedo, normalMap: cachedTireTreadNormal };
  }
  if (!canUseCanvas()) return { map: null, normalMap: null };

  const size = 256;
  const albedo = document.createElement('canvas');
  albedo.width = size;
  albedo.height = size;
  const actx = albedo.getContext('2d');

  const norm = document.createElement('canvas');
  norm.width = size;
  norm.height = size;
  const nctx = norm.getContext('2d');

  if (!actx || !nctx) return { map: null, normalMap: null };

  // Base matte vulcanized rubber
  actx.fillStyle = '#1b1d22';
  actx.fillRect(0, 0, size, size);

  nctx.fillStyle = '#8080ff';
  nctx.fillRect(0, 0, size, size);

  // Subtle rubber micro-grain across tread blocks
  for (let i = 0; i < 650; i++) {
    const gx = ((i * 73) % size);
    const gy = ((i * 137) % size);
    actx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.08)';
    actx.fillRect(gx, gy, 3, 2);
  }

  // Circumferential water drainage channels
  const channels = [0.22, 0.42, 0.58, 0.78];
  for (const frac of channels) {
    const cx = frac * size;
    actx.fillStyle = '#07080b';
    actx.fillRect(cx - 5, 0, 10, size);

    nctx.fillStyle = '#5c80e0';
    nctx.fillRect(cx - 5, 0, 4, size);
    nctx.fillStyle = '#a480e0';
    nctx.fillRect(cx + 1, 0, 4, size);
  }

  // Angled shoulder tread sipes & blocks
  for (let y = -32; y < size + 32; y += 22) {
    actx.strokeStyle = '#090a0d';
    actx.lineWidth = 4;
    actx.beginPath();
    actx.moveTo(0, y);
    actx.lineTo(size * 0.42, y + 18);
    actx.moveTo(size, y);
    actx.lineTo(size * 0.58, y + 18);
    actx.stroke();

    nctx.strokeStyle = '#6864ec';
    nctx.lineWidth = 4;
    nctx.beginPath();
    nctx.moveTo(0, y);
    nctx.lineTo(size * 0.42, y + 18);
    nctx.moveTo(size, y);
    nctx.lineTo(size * 0.58, y + 18);
    nctx.stroke();
  }

  cachedTireTreadAlbedo = makeRepeatTex(albedo, 1, 8, true);
  cachedTireTreadNormal = makeRepeatTex(norm, 1, 8, false);
  return { map: cachedTireTreadAlbedo, normalMap: cachedTireTreadNormal };
}

/** Molded tire sidewall albedo + radial normal map with rim-protector rib & subtle lettering marks */
export function getTireSidewallTextureSet(): {
  map: THREE.CanvasTexture | null;
  normalMap: THREE.CanvasTexture | null;
} {
  if (cachedTireSidewallAlbedo && cachedTireSidewallNormal) {
    return { map: cachedTireSidewallAlbedo, normalMap: cachedTireSidewallNormal };
  }
  if (!canUseCanvas()) return { map: null, normalMap: null };

  const size = 256;
  const albedo = document.createElement('canvas');
  albedo.width = size;
  albedo.height = size;
  const actx = albedo.getContext('2d');

  const norm = document.createElement('canvas');
  norm.width = size;
  norm.height = size;
  const nctx = norm.getContext('2d');
  if (!actx || !nctx) return { map: null, normalMap: null };

  actx.fillStyle = '#181a20';
  actx.fillRect(0, 0, size, size);
  nctx.fillStyle = '#8080ff';
  nctx.fillRect(0, 0, size, size);

  // Molded concentric bead rings
  for (let y = 0; y < size; y += 10) {
    actx.fillStyle = y % 20 === 0 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.12)';
    actx.fillRect(0, y, size, 2);
    nctx.strokeStyle = 'rgba(104, 104, 240, 0.48)';
    nctx.lineWidth = 2;
    nctx.beginPath();
    nctx.moveTo(0, y);
    nctx.lineTo(size, y);
    nctx.stroke();
  }

  // Radial shoulder serrations & embossed tire spec ribs
  for (let x = 0; x < size; x += 6) {
    nctx.strokeStyle = 'rgba(150, 130, 248, 0.28)';
    nctx.lineWidth = 1.5;
    nctx.beginPath();
    nctx.moveTo(x, 0);
    nctx.lineTo(x, size);
    nctx.stroke();
  }

  actx.fillStyle = 'rgba(203, 213, 225, 0.14)';
  actx.font = 'bold 12px sans-serif';
  actx.fillText('RADIAL SPORT ZR  TREADWEAR 280', 12, 128);

  cachedTireSidewallAlbedo = makeRepeatTex(albedo, 6, 1, true);
  cachedTireSidewallNormal = makeRepeatTex(norm, 10, 2, false);
  return { map: cachedTireSidewallAlbedo, normalMap: cachedTireSidewallNormal };
}

/** Concentric molded rubber tire sidewall normal map */
export function getTireSidewallNormalMap(): THREE.CanvasTexture | null {
  return getTireSidewallTextureSet().normalMap;
}

/** Deep jeweled 1959/1960s egg-crate & billet automotive grille texture set */
export function getGrilleMeshTextureSet(): {
  map: THREE.CanvasTexture | null;
  normalMap: THREE.CanvasTexture | null;
} {
  if (cachedGrilleAlbedo && cachedGrilleNormal) {
    return { map: cachedGrilleAlbedo, normalMap: cachedGrilleNormal };
  }
  if (!canUseCanvas()) return { map: null, normalMap: null };

  const size = 256;
  const albedo = document.createElement('canvas');
  albedo.width = size;
  albedo.height = size;
  const actx = albedo.getContext('2d');

  const norm = document.createElement('canvas');
  norm.width = size;
  norm.height = size;
  const nctx = norm.getContext('2d');

  if (!actx || !nctx) return { map: null, normalMap: null };

  actx.fillStyle = '#05070b';
  actx.fillRect(0, 0, size, size);
  nctx.fillStyle = '#8080ff';
  nctx.fillRect(0, 0, size, size);

  const cols = 8;
  const rows = 4;
  const cw = size / cols;
  const ch = size / rows;

  for (let r = 0; r < rows; r++) {
    const y = r * ch;
    const hGrad = actx.createLinearGradient(0, y, 0, y + 10);
    hGrad.addColorStop(0, '#ffffff');
    hGrad.addColorStop(0.5, '#cbd5e1');
    hGrad.addColorStop(1, '#475569');
    actx.fillStyle = hGrad;
    actx.fillRect(0, y, size, 10);

    nctx.fillStyle = '#80b0ff';
    nctx.fillRect(0, y, size, 5);
    nctx.fillStyle = '#8050ff';
    nctx.fillRect(0, y + 5, size, 5);

    for (let c = 0; c < cols; c++) {
      const x = c * cw;
      actx.fillStyle = '#dbe4f0';
      actx.fillRect(x, y, 6, ch);

      const cx = x + cw * 0.5;
      const cy = y + ch * 0.5;
      const bead = actx.createRadialGradient(cx - 2, cy - 2, 1, cx, cy, 8);
      bead.addColorStop(0, '#ffffff');
      bead.addColorStop(0.55, '#94a3b8');
      bead.addColorStop(1, '#090c12');
      actx.fillStyle = bead;
      actx.beginPath();
      actx.arc(cx, cy, 7.5, 0, Math.PI * 2);
      actx.fill();

      nctx.fillStyle = '#b0b0ff';
      nctx.beginPath();
      nctx.arc(cx, cy, 6.5, 0, Math.PI * 2);
      nctx.fill();
    }
  }

  cachedGrilleAlbedo = makeRepeatTex(albedo, 4, 2, true);
  cachedGrilleNormal = makeRepeatTex(norm, 4, 2, false);
  return { map: cachedGrilleAlbedo, normalMap: cachedGrilleNormal };
}

/** Radial fluted crystal headlight glass lens texture + normal map */
export function getHeadlightLensTextureSet(): {
  map: THREE.CanvasTexture | null;
  normalMap: THREE.CanvasTexture | null;
} {
  if (cachedHeadlightLensMap && cachedHeadlightLensNormal) {
    return { map: cachedHeadlightLensMap, normalMap: cachedHeadlightLensNormal };
  }
  if (!canUseCanvas()) return { map: null, normalMap: null };

  const size = 128;
  const albedo = document.createElement('canvas');
  albedo.width = size;
  albedo.height = size;
  const actx = albedo.getContext('2d');

  const norm = document.createElement('canvas');
  norm.width = size;
  norm.height = size;
  const nctx = norm.getContext('2d');

  if (!actx || !nctx) return { map: null, normalMap: null };

  const cx = size / 2;
  const cy = size / 2;
  const g = actx.createRadialGradient(cx, cy, 4, cx, cy, size * 0.5);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.42, '#e0f2fe');
  g.addColorStop(0.82, '#93c5fd');
  g.addColorStop(1, '#334155');
  actx.fillStyle = g;
  actx.fillRect(0, 0, size, size);

  nctx.fillStyle = '#8080ff';
  nctx.fillRect(0, 0, size, size);

  for (let x = 8; x < size; x += 8) {
    actx.strokeStyle = 'rgba(255,255,255,0.42)';
    actx.lineWidth = 1.5;
    actx.beginPath();
    actx.moveTo(x, 0);
    actx.lineTo(x, size);
    actx.stroke();

    nctx.strokeStyle = 'rgba(176,128,255,0.68)';
    nctx.lineWidth = 2;
    nctx.beginPath();
    nctx.moveTo(x, 0);
    nctx.lineTo(x, size);
    nctx.stroke();
  }
  for (let r = 14; r <= 54; r += 12) {
    actx.strokeStyle = 'rgba(255,255,255,0.35)';
    actx.lineWidth = 1.5;
    actx.beginPath();
    actx.arc(cx, cy, r, 0, Math.PI * 2);
    actx.stroke();
  }

  cachedHeadlightLensMap = makeClampTex(albedo, true);
  cachedHeadlightLensNormal = makeClampTex(norm, false);
  return { map: cachedHeadlightLensMap, normalMap: cachedHeadlightLensNormal };
}

/** Fluted injection-molded ruby taillight prism lens texture + normal map */
export function getTaillightLensTextureSet(): {
  map: THREE.CanvasTexture | null;
  normalMap: THREE.CanvasTexture | null;
} {
  if (cachedTaillightLensMap && cachedTaillightLensNormal) {
    return { map: cachedTaillightLensMap, normalMap: cachedTaillightLensNormal };
  }
  if (!canUseCanvas()) return { map: null, normalMap: null };

  const size = 128;
  const albedo = document.createElement('canvas');
  albedo.width = size;
  albedo.height = size;
  const actx = albedo.getContext('2d');

  const norm = document.createElement('canvas');
  norm.width = size;
  norm.height = size;
  const nctx = norm.getContext('2d');
  if (!actx || !nctx) return { map: null, normalMap: null };

  const grad = actx.createRadialGradient(size / 2, size / 2, 6, size / 2, size / 2, size * 0.55);
  grad.addColorStop(0, '#ff3b3b');
  grad.addColorStop(0.55, '#b91c1c');
  grad.addColorStop(1, '#450a0a');
  actx.fillStyle = grad;
  actx.fillRect(0, 0, size, size);

  nctx.fillStyle = '#8080ff';
  nctx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += 12) {
    for (let x = 0; x < size; x += 12) {
      actx.strokeStyle = 'rgba(255, 195, 195, 0.34)';
      actx.lineWidth = 1.2;
      actx.strokeRect(x + 1, y + 1, 10, 10);

      nctx.fillStyle = '#a0a0ff';
      nctx.fillRect(x + 1, y + 1, 5, 5);
      nctx.fillStyle = '#6060ff';
      nctx.fillRect(x + 6, y + 6, 5, 5);
    }
  }

  cachedTaillightLensMap = makeClampTex(albedo, true);
  cachedTaillightLensNormal = makeClampTex(norm, false);
  return { map: cachedTaillightLensMap, normalMap: cachedTaillightLensNormal };
}

/** Fluted amber corner marker / turn signal lens texture + normal map */
export function getAmberSignalLensTextureSet(): {
  map: THREE.CanvasTexture | null;
  normalMap: THREE.CanvasTexture | null;
} {
  if (cachedAmberLensMap && cachedAmberLensNormal) {
    return { map: cachedAmberLensMap, normalMap: cachedAmberLensNormal };
  }
  if (!canUseCanvas()) return { map: null, normalMap: null };

  const size = 128;
  const albedo = document.createElement('canvas');
  albedo.width = size;
  albedo.height = size;
  const actx = albedo.getContext('2d');

  const norm = document.createElement('canvas');
  norm.width = size;
  norm.height = size;
  const nctx = norm.getContext('2d');
  if (!actx || !nctx) return { map: null, normalMap: null };

  const grad = actx.createRadialGradient(size / 2, size / 2, 6, size / 2, size / 2, size * 0.6);
  grad.addColorStop(0, '#fde047');
  grad.addColorStop(0.5, '#f59e0b');
  grad.addColorStop(1, '#78350f');
  actx.fillStyle = grad;
  actx.fillRect(0, 0, size, size);

  nctx.fillStyle = '#8080ff';
  nctx.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y += 8) {
    actx.fillStyle = 'rgba(255,255,255,0.22)';
    actx.fillRect(0, y, size, 2);
    nctx.fillStyle = '#80a8ff';
    nctx.fillRect(0, y, size, 3);
    nctx.fillStyle = '#8058ff';
    nctx.fillRect(0, y + 4, size, 3);
  }

  cachedAmberLensMap = makeClampTex(albedo, true);
  cachedAmberLensNormal = makeClampTex(norm, false);
  return { map: cachedAmberLensMap, normalMap: cachedAmberLensNormal };
}

/** Fine brushed billet aluminum texture for trim, pedals, and shifter gates */
export function getBrushedMetalMap(): THREE.CanvasTexture | null {
  if (cachedBrushedMetalMap) return cachedBrushedMetalMap;
  if (!canUseCanvas()) return null;

  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y++) {
    const delta = ((y * 37) % 24) - 12;
    const v = 204 + delta;
    ctx.fillStyle = `rgb(${v}, ${v + 4}, ${v + 8})`;
    ctx.fillRect(0, y, size, 1);
  }
  cachedBrushedMetalMap = makeRepeatTex(canvas, 2, 2, true);
  return cachedBrushedMetalMap;
}

/** Alpha-cutout chrome cursive "Cadillac" fender script badge texture */
export function getCadillacScriptBadgeMap(): THREE.CanvasTexture | null {
  if (cachedCadillacScriptMap) return cachedCadillacScriptMap;
  if (!canUseCanvas()) return null;

  const w = 256;
  const h = 64;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'italic 700 40px Georgia, "Times New Roman", serif';

  // Crisp metallic drop shadow for 3D relief
  ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
  ctx.fillText('Cadillac', w / 2 + 2, h / 2 + 2);

  const chromeGrad = ctx.createLinearGradient(0, 12, 0, 50);
  chromeGrad.addColorStop(0, '#ffffff');
  chromeGrad.addColorStop(0.42, '#e2e8f0');
  chromeGrad.addColorStop(0.55, '#64748b');
  chromeGrad.addColorStop(1, '#f8fafc');
  ctx.fillStyle = chromeGrad;
  ctx.fillText('Cadillac', w / 2, h / 2);

  cachedCadillacScriptMap = makeClampTex(canvas, true);
  return cachedCadillacScriptMap;
}

/** Classic multi-color Cadillac wreath & crest emblem texture (for fenders, wheel caps & headrests) */
export function getCadillacCrestEmblemMap(): THREE.CanvasTexture | null {
  if (cachedCadillacCrestMap) return cachedCadillacCrestMap;
  if (!canUseCanvas()) return null;

  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, size, size);
  const cx = size / 2;
  const cy = size / 2;

  // Outer gold laurel wreath ring
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(cx, cy, 48, 0.35, Math.PI * 2 - 0.35);
  ctx.stroke();

  // Laurel leaf ticks
  ctx.fillStyle = '#fde047';
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    if (a > 1.3 && a < 1.85) continue;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * 48, cy + Math.sin(a) * 48, 4.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Chrome shield outline
  ctx.fillStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.moveTo(cx - 32, cy - 28);
  ctx.lineTo(cx + 32, cy - 28);
  ctx.lineTo(cx + 26, cy + 10);
  ctx.lineTo(cx, cy + 34);
  ctx.lineTo(cx - 26, cy + 10);
  ctx.closePath();
  ctx.fill();

  // Interior heraldic quarters (gold, crimson, cobalt, black-silver)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx - 26, cy - 23);
  ctx.lineTo(cx + 26, cy - 23);
  ctx.lineTo(cx + 21, cy + 8);
  ctx.lineTo(cx, cy + 28);
  ctx.lineTo(cx - 21, cy + 8);
  ctx.closePath();
  ctx.clip();

  ctx.fillStyle = '#dc2626';
  ctx.fillRect(cx - 30, cy - 26, 30, 26);
  ctx.fillStyle = '#facc15';
  ctx.fillRect(cx, cy - 26, 30, 26);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(cx - 30, cy, 30, 32);
  ctx.fillStyle = '#2563eb';
  ctx.fillRect(cx, cy, 30, 32);
  ctx.restore();

  cachedCadillacCrestMap = makeClampTex(canvas, true);
  return cachedCadillacCrestMap;
}

/** Metallic gold & chrome Chevrolet bowtie emblem texture */
export function getChevyBowtieMap(): THREE.CanvasTexture | null {
  if (cachedChevyBowtieMap) return cachedChevyBowtieMap;
  if (!canUseCanvas()) return null;

  const w = 128;
  const h = 64;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, w, h);

  const drawBowtie = (pad: number, fill: string | CanvasGradient) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(14 + pad, 20 + pad);
    ctx.lineTo(44, 20 + pad);
    ctx.lineTo(44, 10 + pad);
    ctx.lineTo(84, 10 + pad);
    ctx.lineTo(84, 20 + pad);
    ctx.lineTo(114 - pad, 20 + pad);
    ctx.lineTo(104 - pad, 44 - pad);
    ctx.lineTo(84, 44 - pad);
    ctx.lineTo(84, 54 - pad);
    ctx.lineTo(44, 54 - pad);
    ctx.lineTo(44, 44 - pad);
    ctx.lineTo(4 + pad, 44 - pad);
    ctx.closePath();
    ctx.fill();
  };

  drawBowtie(0, '#f8fafc');
  const goldGrad = ctx.createLinearGradient(0, 12, 0, 52);
  goldGrad.addColorStop(0, '#fef08a');
  goldGrad.addColorStop(0.5, '#eab308');
  goldGrad.addColorStop(1, '#a16207');
  drawBowtie(3, goldGrad);

  cachedChevyBowtieMap = makeClampTex(canvas, true);
  return cachedChevyBowtieMap;
}

/** Stamped showroom license plate texture */
export function getLicensePlateMap(label = 'ISLAND 1'): THREE.CanvasTexture | null {
  if (!canUseCanvas()) return null;
  const key = label.toUpperCase().slice(0, 12);
  const hit = cachedLicensePlateMaps.get(key);
  if (hit) return hit;

  const w = 256;
  const h = 128;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#f8fafc');
  bg.addColorStop(1, '#cbd5e1');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, w - 16, h - 16);

  ctx.fillStyle = '#1e3a8a';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('LOST WORLD', w / 2, 34);

  ctx.fillStyle = '#0f172a';
  ctx.font = '900 42px monospace';
  ctx.fillText(key, w / 2, 86);

  const tex = makeClampTex(canvas, true);
  cachedLicensePlateMaps.set(key, tex);
  return tex;
}

/**
 * Reusable tapered, fluted forged spoke geometry for photorealistic wheels (zero blocky rectangles).
 */
export function getSculptedSpokeGeometry(
  length: number,
  rootWidth = 0.046,
  tipWidth = 0.028,
  thickness = 0.036,
): THREE.ExtrudeGeometry {
  const key = `${length.toFixed(3)}_${rootWidth.toFixed(3)}_${tipWidth.toFixed(3)}_${thickness.toFixed(3)}`;
  const hit = cachedSpokeGeos.get(key);
  if (hit) return hit;

  const shape = new THREE.Shape();
  const halfLen = length * 0.5;
  shape.moveTo(-rootWidth * 0.5, -halfLen);
  shape.lineTo(rootWidth * 0.5, -halfLen);
  shape.quadraticCurveTo(rootWidth * 0.42, 0, tipWidth * 0.5, halfLen);
  shape.lineTo(-tipWidth * 0.5, halfLen);
  shape.quadraticCurveTo(-rootWidth * 0.42, 0, -rootWidth * 0.5, -halfLen);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.006,
    bevelThickness: 0.006,
  });
  geo.rotateY(Math.PI / 2);
  geo.translate(-thickness * 0.5, 0, 0);
  geo.computeVertexNormals();
  geo.userData.sharedAsset = true;
  cachedSpokeGeos.set(key, geo);
  return geo;
}

/** Marks all meshes inside a vehicle root so lighting passes preserve showroom PBR reflections */
export function markVehicleLightingPreserved(root: THREE.Object3D): void {
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.userData.preserveEnvMapIntensity = true;
    }
  });
}

/** Detect if a paint color is bright white / cream / light pearl */
function isLightPearlColor(color: THREE.ColorRepresentation): boolean {
  const c = new THREE.Color(color);
  const lum = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  return lum > 0.62;
}

/** Showroom multi-layer clearcoat car paint material (pure bright white pearl OR deep candy metallic) */
export function createAutomotivePaintMaterial(
  color: THREE.ColorRepresentation,
  options?: { isPearl?: boolean; map?: THREE.Texture | null },
): THREE.MeshPhysicalMaterial {
  const flakeNormal = getMetallicFlakeNormalMap();
  const clearcoatNormal = getClearcoatPolishNormalMap();
  const lightWhite = Boolean(options?.isPearl) || isLightPearlColor(color);

  if (lightWhite) {
    // Pure, luminous showroom white lacquer / pearl with crisp mirror clearcoat (no graying!)
    const mat = new THREE.MeshPhysicalMaterial({
      color,
      map: options?.map ?? null,
      metalness: 0.06,
      roughness: 0.055,
      clearcoat: 1.0,
      clearcoatRoughness: 0.012,
      clearcoatNormalMap: clearcoatNormal,
      clearcoatNormalScale: new THREE.Vector2(0.012, 0.012),
      ior: 1.56,
      reflectivity: 1.0,
      specularIntensity: 1.0,
      specularColor: new THREE.Color(0xffffff),
      iridescence: 0.14,
      iridescenceIOR: 1.38,
      envMapIntensity: 2.35,
    });
    mat.userData.preserveEnvMapIntensity = true;
    return mat;
  }

  const mat = new THREE.MeshPhysicalMaterial({
    color,
    map: options?.map ?? null,
    metalness: 0.46,
    roughness: 0.09,
    clearcoat: 1.0,
    clearcoatRoughness: 0.015,
    clearcoatNormalMap: clearcoatNormal,
    clearcoatNormalScale: new THREE.Vector2(0.022, 0.022),
    normalMap: flakeNormal,
    normalScale: new THREE.Vector2(0.036, 0.036),
    ior: 1.56,
    reflectivity: 1.0,
    specularIntensity: 1.0,
    iridescence: 0.16,
    iridescenceIOR: 1.42,
    envMapIntensity: 2.25,
  });
  mat.userData.preserveEnvMapIntensity = true;
  return mat;
}

/** Mirror-grade automotive chrome trim material */
export function createChromeMaterial(
  color: THREE.ColorRepresentation = 0xf8fafc,
): THREE.MeshPhysicalMaterial {
  const mat = new THREE.MeshPhysicalMaterial({
    color,
    metalness: 1.0,
    roughness: 0.02,
    clearcoat: 0.9,
    clearcoatRoughness: 0.012,
    reflectivity: 1.0,
    envMapIntensity: 2.55,
  });
  mat.userData.preserveEnvMapIntensity = true;
  return mat;
}

/** Vulcanized tire tread rubber material with realistic directional grooves */
export function createTireRubberMaterial(): THREE.MeshStandardMaterial {
  const { map, normalMap } = getTireTreadTextureSet();
  return new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map,
    normalMap,
    normalScale: new THREE.Vector2(0.95, 0.95),
    roughness: 0.84,
    metalness: 0.04,
  });
}

/** Molded tire sidewall rubber material */
export function createTireSidewallMaterial(): THREE.MeshStandardMaterial {
  const { map, normalMap } = getTireSidewallTextureSet();
  return new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map,
    normalMap,
    normalScale: new THREE.Vector2(0.55, 0.55),
    roughness: 0.78,
    metalness: 0.05,
  });
}

/**
 * Tinted laminated automotive glass. This is a dielectric (non-metal) surface
 * with a sharp clearcoat reflection so it reads as glass instead of tinted
 * plastic/metal from every angle. Transmission is deliberately zero: real
 * cabin visibility comes from alpha, while avoiding the extra full-screen
 * refraction pass that used to cost several milliseconds per frame.
 */
export function createAutomotiveGlassMaterial(opacity = 0.38): THREE.MeshPhysicalMaterial {
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0x16232d,
    metalness: 0.0,
    roughness: 0.02,
    ior: 1.52,
    reflectivity: 1.0,
    specularIntensity: 1.18,
    clearcoat: 1.0,
    clearcoatRoughness: 0.008,
    envMapIntensity: 2.9,
    transparent: true,
    opacity: THREE.MathUtils.clamp(opacity, 0.32, 0.5),
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  mat.userData.preserveEnvMapIntensity = true;
  return mat;
}

/** Real-life diamond-stitched & pebbled Nappa automotive leather */
export function createAutomotiveLeatherMaterial(
  color: THREE.ColorRepresentation,
): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color,
    map: getLeatherQuiltMap(),
    normalMap: getLeatherNormalMap(),
    normalScale: new THREE.Vector2(0.36, 0.36),
    roughness: 0.54,
    metalness: 0.04,
    sheen: 0.38,
    sheenRoughness: 0.62,
    sheenColor: new THREE.Color(0xffffff),
    clearcoat: 0.14,
    clearcoatRoughness: 0.45,
  });
}

/** Real-life Haartz Stayfast woven twill convertible soft-top cloth material */
export function createConvertibleFabricMaterial(
  tint: THREE.ColorRepresentation = 0x1a1c22,
): THREE.MeshPhysicalMaterial {
  const mat = new THREE.MeshPhysicalMaterial({
    color: tint,
    map: getStayfastCanvasMap(),
    normalMap: getStayfastCanvasNormalMap(),
    normalScale: new THREE.Vector2(0.65, 0.65),
    roughness: 0.9,
    metalness: 0.02,
    sheen: 0.85,
    sheenRoughness: 0.74,
    sheenColor: new THREE.Color(0x52525b),
    envMapIntensity: 0.55,
  });
  mat.userData.preserveEnvMapIntensity = true;
  return mat;
}

/** 2x2 twill glossy carbon fiber material */
export function createCarbonFiberMaterial(): THREE.MeshPhysicalMaterial {
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: getCarbonWeaveMap(),
    metalness: 0.44,
    roughness: 0.22,
    clearcoat: 0.96,
    clearcoatRoughness: 0.06,
    envMapIntensity: 1.45,
  });
  mat.userData.preserveEnvMapIntensity = true;
  return mat;
}

/** Polished burled walnut wood interior trim */
export function createWalnutWoodMaterial(): THREE.MeshPhysicalMaterial {
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: getWalnutWoodMap(),
    metalness: 0.08,
    roughness: 0.18,
    clearcoat: 0.96,
    clearcoatRoughness: 0.05,
    envMapIntensity: 1.4,
  });
  mat.userData.preserveEnvMapIntensity = true;
  return mat;
}

/** Plush woven automotive cabin carpet */
export function createAutomotiveCarpetMaterial(
  color: THREE.ColorRepresentation = 0x1f2024,
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    map: getCarpetMap(),
    roughness: 0.96,
    metalness: 0.0,
  });
}

/**
 * Multi-layer crystal headlight pod:
 * Chrome bezel + dark bowl + parabolic reflector + projector bulb + DRL halo + fluted crystal clearcoat lens + optional visor hood.
 */
export type HeadlightPodShape =
  | 'round'
  | 'quad_bar'
  | 'y_drl'
  | 'quad_bugatti'
  | 'l_blade'
  | 'oval_pagani'
  | 'fang_drl'
  | 'mclaren_eye';

export function buildRealisticHeadlightPod(options: {
  shape: HeadlightPodShape;
  radius?: number;
  width?: number;
  height?: number;
  chromeMat: THREE.Material;
  withHood?: boolean;
  tintColor?: THREE.ColorRepresentation;
  sideSign?: -1 | 1;
}): THREE.Group {
  const { shape, chromeMat, withHood, sideSign = 1 } = options;
  const g = new THREE.Group();
  const lensTex = getHeadlightLensTextureSet();
  const darkBowlMat = new THREE.MeshStandardMaterial({
    color: 0x090d14,
    roughness: 0.45,
    metalness: 0.5,
  });
  const bulbMat = new THREE.MeshStandardMaterial({
    color: options.tintColor ?? 0xfefce8,
    emissive: options.tintColor ?? 0xfef08a,
    emissiveIntensity: 2.3,
    roughness: 0.1,
  });
  const drlMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    emissive: options.tintColor ?? 0xe0f2fe,
    emissiveIntensity: 1.65,
    roughness: 0.14,
  });
  const lensMat = new THREE.MeshPhysicalMaterial({
    color: 0xf8fafc,
    map: lensTex.map,
    normalMap: lensTex.normalMap,
    normalScale: new THREE.Vector2(0.38, 0.38),
    metalness: 0.08,
    roughness: 0.035,
    clearcoat: 1.0,
    clearcoatRoughness: 0.012,
    envMapIntensity: 2.45,
    transparent: true,
    opacity: 0.54,
  });
  lensMat.userData.preserveEnvMapIntensity = true;

  if (shape === 'round') {
    const r = options.radius ?? 0.072;
    const bezel = new THREE.Mesh(
      new THREE.TorusGeometry(r, r * 0.22, 10, 20),
      chromeMat,
    );
    const bowl = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 0.94, r * 0.72, 0.06, 16),
      darkBowlMat,
    );
    bowl.rotation.x = Math.PI / 2;
    bowl.position.z = -0.02;

    const reflector = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 0.88, r * 0.38, 0.04, 16),
      chromeMat,
    );
    reflector.rotation.x = Math.PI / 2;
    reflector.position.z = -0.005;

    const bulb = new THREE.Mesh(new THREE.SphereGeometry(r * 0.34, 10, 8), bulbMat);
    bulb.position.z = 0.006;

    const haloRing = new THREE.Mesh(
      new THREE.TorusGeometry(r * 0.64, r * 0.055, 6, 18),
      drlMat,
    );
    haloRing.position.z = 0.012;

    const lens = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 0.92, r * 0.92, 0.018, 18),
      lensMat,
    );
    lens.rotation.x = Math.PI / 2;
    lens.position.z = 0.02;

    g.add(bowl, reflector, bulb, haloRing, lens, bezel);
    if (withHood) {
      const visor = new THREE.Mesh(
        new THREE.TorusGeometry(r * 1.06, r * 0.16, 8, 14, Math.PI),
        chromeMat,
      );
      visor.position.z = 0.026;
      g.add(visor);
    }
  } else if (shape === 'y_drl') {
    // Lamborghini Sián / Huracán EVO2 Y-shaped LED DRL trident
    const w = options.width ?? 0.34;
    const h = options.height ?? 0.1;
    const recess = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.06), darkBowlMat);
    const spine = new THREE.Mesh(new THREE.BoxGeometry(w * 0.54, h * 0.16, 0.024), drlMat);
    spine.position.set(sideSign * w * 0.12, 0, 0.028);
    const upperFork = new THREE.Mesh(new THREE.BoxGeometry(w * 0.42, h * 0.15, 0.024), drlMat);
    upperFork.position.set(-sideSign * w * 0.24, h * 0.2, 0.028);
    upperFork.rotation.z = sideSign * 0.56;
    const lowerFork = new THREE.Mesh(new THREE.BoxGeometry(w * 0.42, h * 0.15, 0.024), drlMat);
    lowerFork.position.set(-sideSign * w * 0.24, -h * 0.2, 0.028);
    lowerFork.rotation.z = -sideSign * 0.56;
    const proj = new THREE.Mesh(new THREE.SphereGeometry(h * 0.24, 10, 8), bulbMat);
    proj.position.set(sideSign * w * 0.16, 0, 0.022);
    const lens = new THREE.Mesh(new THREE.BoxGeometry(w * 0.98, h * 0.94, 0.016), lensMat);
    lens.position.z = 0.036;
    g.add(recess, spine, upperFork, lowerFork, proj, lens);
  } else if (shape === 'quad_bugatti') {
    // Bugatti Chiron / Divo iconic 4-element square LED matrix optics
    const w = options.width ?? 0.38;
    const h = options.height ?? 0.075;
    const housing = new THREE.Mesh(new THREE.BoxGeometry(w + 0.02, h + 0.02, 0.06), darkBowlMat);
    for (let i = 0; i < 4; i++) {
      const fx = -w * 0.36 + i * (w * 0.24);
      const cellFrame = new THREE.Mesh(new THREE.BoxGeometry(w * 0.18, h * 0.68, 0.022), chromeMat);
      cellFrame.position.set(fx, 0, 0.022);
      const ledCore = new THREE.Mesh(new THREE.BoxGeometry(w * 0.13, h * 0.52, 0.026), bulbMat);
      ledCore.position.set(fx, 0, 0.026);
      g.add(cellFrame, ledCore);
    }
    const lens = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, h * 0.88, 0.014), lensMat);
    lens.position.z = 0.036;
    g.add(housing, lens);
  } else if (shape === 'l_blade') {
    // Ferrari SF90 / Monza slim L-blade laser headlamp
    const w = options.width ?? 0.36;
    const h = options.height ?? 0.075;
    const bucket = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.055), darkBowlMat);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(w * 0.88, h * 0.26, 0.024), drlMat);
    blade.position.set(0, -h * 0.18, 0.024);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(w * 0.16, h * 0.72, 0.024), drlMat);
    wing.position.set(sideSign * w * 0.36, h * 0.12, 0.024);
    const proj = new THREE.Mesh(new THREE.SphereGeometry(h * 0.28, 10, 8), bulbMat);
    proj.position.set(-sideSign * w * 0.18, h * 0.08, 0.022);
    const lens = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, h * 0.92, 0.015), lensMat);
    lens.position.z = 0.034;
    g.add(bucket, blade, wing, proj, lens);
  } else if (shape === 'oval_pagani') {
    // Pagani Huayra twin-ellipse carbon eye pod
    const w = options.width ?? 0.32;
    const h = options.height ?? 0.11;
    const pod = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.06), darkBowlMat);
    [-w * 0.22, w * 0.22].forEach((ox) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(h * 0.32, 0.008, 8, 16), chromeMat);
      ring.position.set(ox, 0, 0.026);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(h * 0.24, 10, 8), bulbMat);
      bulb.position.set(ox, 0, 0.022);
      g.add(ring, bulb);
    });
    const lens = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, h * 0.92, 0.016), lensMat);
    lens.position.z = 0.036;
    g.add(pod, lens);
  } else if (shape === 'fang_drl') {
    // Koenigsegg Gemera / Aston Valkyrie vertical sculpted fang DRL
    const w = options.width ?? 0.22;
    const h = options.height ?? 0.15;
    const recess = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.055), darkBowlMat);
    const fang = new THREE.Mesh(new THREE.BoxGeometry(w * 0.22, h * 0.88, 0.024), drlMat);
    fang.position.set(sideSign * w * 0.18, 0, 0.024);
    fang.rotation.z = sideSign * 0.18;
    const proj = new THREE.Mesh(new THREE.SphereGeometry(w * 0.2, 10, 8), bulbMat);
    proj.position.set(-sideSign * w * 0.12, h * 0.14, 0.022);
    const lens = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, h * 0.92, 0.014), lensMat);
    lens.position.z = 0.034;
    g.add(recess, fang, proj, lens);
  } else if (shape === 'mclaren_eye') {
    // McLaren 720S / P1 GTR deep sunken aero eye socket w/ boomerang DRL blade
    const w = options.width ?? 0.34;
    const h = options.height ?? 0.13;
    const socket = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.075), darkBowlMat);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(w * 0.86, h * 0.2, 0.024), drlMat);
    blade.position.set(0, -h * 0.1, 0.03);
    blade.rotation.z = -sideSign * 0.16;
    const proj = new THREE.Mesh(new THREE.SphereGeometry(h * 0.22, 10, 8), bulbMat);
    proj.position.set(sideSign * w * 0.08, h * 0.16, 0.026);
    const lens = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, h * 0.9, 0.016), lensMat);
    lens.position.z = 0.042;
    g.add(socket, blade, proj, lens);
  } else {
    const w = options.width ?? 0.26;
    const h = options.height ?? 0.1;
    const housing = new THREE.Mesh(new THREE.BoxGeometry(w + 0.024, h + 0.024, 0.065), chromeMat);
    const darkCavity = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.048), darkBowlMat);
    darkCavity.position.z = 0.012;

    [-w * 0.24, w * 0.2].forEach((px) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(h * 0.32, h * 0.06, 8, 14),
        chromeMat,
      );
      ring.position.set(px, 0.004, 0.026);
      const proj = new THREE.Mesh(new THREE.SphereGeometry(h * 0.25, 10, 8), bulbMat);
      proj.position.set(px, 0.004, 0.022);
      g.add(ring, proj);
    });

    const drlStrip = new THREE.Mesh(new THREE.BoxGeometry(w * 0.88, h * 0.14, 0.02), drlMat);
    drlStrip.position.set(0, -h * 0.34, 0.03);

    const lens = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, h * 0.9, 0.018), lensMat);
    lens.position.z = 0.038;
    g.add(housing, darkCavity, drlStrip, lens);
  }

  g.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.userData.noShadowCast = true;
      obj.userData.preserveEnvMapIntensity = true;
    }
  });
  return g;
}

export type TaillightPodStyle =
  | 'cadillac_bullet'
  | 'round'
  | 'blade'
  | 'bugatti_blade'
  | 'bugatti_divo_fin'
  | 'ferrari_quad_rings'
  | 'p1_crescent'
  | 'sian_hex'
  | 'speedtail_flush';

/**
 * Multi-layer fluted ruby taillight pod (Cadillac rocket bullet, classic round, or marque hypercar LED).
 */
export function buildRealisticTaillightPod(options: {
  style: TaillightPodStyle;
  chromeMat: THREE.Material;
  width?: number;
  height?: number;
  radius?: number;
}): THREE.Group {
  const { style, chromeMat } = options;
  const g = new THREE.Group();
  const tailTex = getTaillightLensTextureSet();
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 1.85,
    roughness: 0.14,
  });
  const rubyLensMat = new THREE.MeshPhysicalMaterial({
    color: 0xb91c1c,
    map: tailTex.map,
    normalMap: tailTex.normalMap,
    normalScale: new THREE.Vector2(0.42, 0.42),
    emissive: 0x7f1d1d,
    emissiveIntensity: 0.38,
    metalness: 0.06,
    roughness: 0.035,
    clearcoat: 1.0,
    clearcoatRoughness: 0.012,
    envMapIntensity: 2.35,
    transparent: true,
    opacity: 0.8,
  });
  rubyLensMat.userData.preserveEnvMapIntensity = true;
  const darkHousingMat = new THREE.MeshStandardMaterial({
    color: 0x090b10,
    roughness: 0.5,
    metalness: 0.4,
  });

  if (style === 'cadillac_bullet') {
    const nacelle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.056, 0.068, 0.25, 16),
      chromeMat,
    );
    nacelle.rotation.x = Math.PI / 2;
    const glowCore = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 8), coreMat);
    glowCore.position.z = -0.11;
    const rubyCone = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.145, 16), rubyLensMat);
    rubyCone.rotation.x = -Math.PI / 2;
    rubyCone.position.z = -0.165;
    const trimRing = new THREE.Mesh(new THREE.TorusGeometry(0.056, 0.012, 8, 16), chromeMat);
    trimRing.position.z = -0.115;
    const midBand = new THREE.Mesh(new THREE.TorusGeometry(0.061, 0.008, 8, 16), chromeMat);
    midBand.position.z = -0.02;
    g.add(nacelle, glowCore, rubyCone, trimRing, midBand);
  } else if (style === 'round') {
    const r = options.radius ?? 0.055;
    const bezel = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.22, 8, 16), chromeMat);
    const core = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 0.85, r * 0.85, 0.04, 14),
      coreMat,
    );
    core.rotation.x = Math.PI / 2;
    const lens = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 0.88, r * 0.88, 0.02, 14),
      rubyLensMat,
    );
    lens.rotation.x = Math.PI / 2;
    lens.position.z = -0.02;
    g.add(bezel, core, lens);
  } else if (style === 'bugatti_blade') {
    const w = options.width ?? 1.62;
    const h = options.height ?? 0.044;
    const housing = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, h + 0.02, 0.045), darkHousingMat);
    const core = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.72, 0.025), coreMat);
    core.position.z = -0.02;
    const lens = new THREE.Mesh(new THREE.BoxGeometry(w + 0.01, h, 0.016), rubyLensMat);
    lens.position.z = -0.028;
    g.add(housing, core, lens);
  } else if (style === 'bugatti_divo_fin') {
    // 3D finned OLED taillight matrix (44 individual vertical fins split left/right)
    const w = options.width ?? 0.56;
    const h = options.height ?? 0.14;
    const backing = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.04), darkHousingMat);
    g.add(backing);
    for (let i = 0; i < 8; i++) {
      const fx = -w * 0.42 + (i / 7) * (w * 0.84);
      const fh = h * (0.45 + 0.5 * Math.sin((i / 7) * Math.PI));
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.028, fh, 0.052), coreMat);
      fin.position.set(fx, 0, -0.022);
      g.add(fin);
    }
  } else if (style === 'ferrari_quad_rings') {
    // SF90 Stradale squircle twin LED rings
    const w = options.width ?? 0.46;
    const h = options.height ?? 0.11;
    const housing = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.04), darkHousingMat);
    g.add(housing);
    [-w * 0.24, w * 0.24].forEach((rx) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(h * 0.34, 0.016, 8, 16), coreMat);
      ring.position.set(rx, 0, -0.02);
      const lens = new THREE.Mesh(
        new THREE.CylinderGeometry(h * 0.42, h * 0.42, 0.016, 14),
        rubyLensMat,
      );
      lens.rotation.x = Math.PI / 2;
      lens.position.set(rx, 0, -0.025);
      g.add(ring, lens);
    });
  } else if (style === 'p1_crescent') {
    // McLaren P1 GTR signature sweeping LED crescent ribbon
    const w = options.width ?? 0.52;
    const h = options.height ?? 0.12;
    const housing = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.04), darkHousingMat);
    const crescent = new THREE.Mesh(
      new THREE.TorusGeometry(w * 0.42, 0.016, 8, 20, Math.PI * 0.65),
      coreMat,
    );
    crescent.rotation.z = Math.PI * 0.18;
    crescent.position.set(0, -h * 0.25, -0.024);
    g.add(housing, crescent);
  } else if (style === 'sian_hex') {
    // Lamborghini Sián FKP 37 trio of glowing hexagonal LEDs per side
    const w = options.width ?? 0.48;
    const h = options.height ?? 0.11;
    const housing = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.04), darkHousingMat);
    g.add(housing);
    [-w * 0.28, 0, w * 0.28].forEach((hx) => {
      const hexRing = new THREE.Mesh(new THREE.TorusGeometry(h * 0.32, 0.014, 6, 6), coreMat);
      hexRing.position.set(hx, 0, -0.022);
      g.add(hexRing);
    });
  } else if (style === 'speedtail_flush') {
    // Flush ultra-thin Speedtail tail-blades integrated cleanly into teardrop tail
    const w = options.width ?? 0.58;
    const h = options.height ?? 0.028;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.03), coreMat);
    g.add(blade);
  } else {
    const w = options.width ?? 0.2;
    const h = options.height ?? 0.12;
    const bezel = new THREE.Mesh(new THREE.BoxGeometry(w + 0.024, h + 0.024, 0.052), chromeMat);
    const darkBacking = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, 0.036),
      darkHousingMat,
    );
    darkBacking.position.z = -0.008;
    const core = new THREE.Mesh(new THREE.BoxGeometry(w * 0.86, h * 0.72, 0.024), coreMat);
    core.position.z = -0.018;
    const lens = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, h * 0.92, 0.02), rubyLensMat);
    lens.position.z = -0.028;
    g.add(bezel, darkBacking, core, lens);
  }

  g.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.userData.noShadowCast = true;
      obj.userData.preserveEnvMapIntensity = true;
    }
  });
  return g;
}

/**
 * Recessed 3D chrome/billet egg-crate, Panamericana vertical slat, Aston slotted, or Bugatti horseshoe grille assembly.
 */
export function buildRealisticGrilleAssembly(options: {
  width: number;
  height: number;
  chromeMat: THREE.Material;
  horizontalBars?: number;
  emblemTexture?: THREE.Texture | null;
  variant?: 'egg_crate' | 'horseshoe_bugatti' | 'panamericana_vertical' | 'aston_slotted' | 'honeycomb_intake';
  accentMat?: THREE.Material;
}): THREE.Group {
  const {
    width,
    height,
    chromeMat,
    horizontalBars = 3,
    emblemTexture,
    variant = 'egg_crate',
    accentMat,
  } = options;
  const g = new THREE.Group();
  const { map, normalMap } = getGrilleMeshTextureSet();

  const cavityMat = new THREE.MeshStandardMaterial({
    color: 0x05070a,
    roughness: 0.92,
    metalness: 0.15,
  });
  const meshMat = new THREE.MeshStandardMaterial({
    color: variant === 'honeycomb_intake' || variant === 'aston_slotted' ? 0x1e293b : 0xe2e8f0,
    map,
    normalMap,
    normalScale: new THREE.Vector2(0.95, 0.95),
    metalness: 0.92,
    roughness: variant === 'honeycomb_intake' ? 0.34 : 0.16,
    envMapIntensity: 2.1,
  });
  meshMat.userData.preserveEnvMapIntensity = true;

  if (variant === 'horseshoe_bugatti') {
    const archR = Math.min(width, height) * 0.46;
    const arch = new THREE.Mesh(
      new THREE.TorusGeometry(archR, 0.028, 10, 24, Math.PI),
      chromeMat,
    );
    arch.position.set(0, height * 0.08, 0.015);
    const botRail = new THREE.Mesh(new THREE.BoxGeometry(archR * 2, 0.036, 0.05), chromeMat);
    botRail.position.set(0, -height * 0.38, 0.015);
    [-archR, archR].forEach((lx) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.036, height * 0.48, 0.05), chromeMat);
      leg.position.set(lx, -height * 0.15, 0.015);
      g.add(leg);
    });
    const back = new THREE.Mesh(new THREE.CylinderGeometry(archR, archR, 0.03, 18), meshMat);
    back.rotation.x = Math.PI / 2;
    back.scale.set(0.96, 1.0, 1.12);
    back.position.set(0, -height * 0.02, -0.01);
    const badge = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.042, 0.02),
      new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.25, metalness: 0.4 }),
    );
    badge.position.set(0, height * 0.32, 0.028);
    g.add(arch, botRail, back, badge);
  } else {
    const frameT = 0.036;
    const frameD = 0.08;
    const frameMat = variant === 'honeycomb_intake' ? cavityMat : chromeMat;
    const topRail = new THREE.Mesh(new THREE.BoxGeometry(width, frameT, frameD), frameMat);
    topRail.position.y = height * 0.5;
    const botRail = new THREE.Mesh(
      new THREE.BoxGeometry(width, frameT, frameD),
      accentMat ?? frameMat,
    );
    botRail.position.y = -height * 0.5;
    const leftRail = new THREE.Mesh(
      new THREE.BoxGeometry(frameT, height + frameT, frameD),
      frameMat,
    );
    leftRail.position.x = -width * 0.5;
    const rightRail = leftRail.clone();
    rightRail.position.x = width * 0.5;

    const cavity = new THREE.Mesh(
      new THREE.BoxGeometry(width - 0.04, height - 0.03, 0.04),
      cavityMat,
    );
    cavity.position.z = -0.025;

    const meshFace = new THREE.Mesh(
      new THREE.BoxGeometry(width - 0.05, height - 0.04, 0.028),
      meshMat,
    );
    meshFace.position.z = -0.004;

    g.add(topRail, botRail, leftRail, rightRail, cavity, meshFace);

    if (variant === 'panamericana_vertical') {
      const slatCount = 11;
      for (let i = 0; i < slatCount; i++) {
        const fx = -width * 0.42 + (i / (slatCount - 1)) * (width * 0.84);
        const slat = new THREE.Mesh(
          new THREE.BoxGeometry(0.016, height - 0.04, 0.046),
          chromeMat,
        );
        slat.position.set(fx, 0, 0.014);
        g.add(slat);
      }
    } else {
      for (let i = 1; i <= horizontalBars; i++) {
        const frac = i / (horizontalBars + 1) - 0.5;
        const bar = new THREE.Mesh(
          new THREE.BoxGeometry(width - 0.05, variant === 'aston_slotted' ? 0.012 : 0.018, 0.042),
          variant === 'aston_slotted' ? cavityMat : chromeMat,
        );
        bar.position.set(0, frac * height, 0.014);
        g.add(bar);
      }
    }

    if (emblemTexture) {
      const badge = new THREE.Mesh(
        new THREE.PlaneGeometry(0.16, 0.12),
        new THREE.MeshBasicMaterial({ map: emblemTexture, transparent: true, alphaTest: 0.1 }),
      );
      badge.position.set(0, 0, 0.042);
      g.add(badge);
    }
  }

  g.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.userData.noShadowCast = true;
      obj.userData.preserveEnvMapIntensity = true;
    }
  });
  return g;
}

/**
 * Sculpted automotive wing mirror with curved stalk, contoured aerodynamic/classic shell & reflective mirror glass face.
 */
export function buildRealisticSideMirror(options: {
  side: -1 | 1;
  housingMat: THREE.Material;
  chromeMat: THREE.Material;
  style?: 'classic_round' | 'aero';
}): THREE.Group {
  const { side, housingMat, chromeMat, style = 'aero' } = options;
  const g = new THREE.Group();

  const stalkBase = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.032, 0.032, 10), chromeMat);
  stalkBase.rotation.z = side * (Math.PI / 2);
  stalkBase.position.set(side * 0.008, 0, 0);
  const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.022, 0.088, 10), chromeMat);
  stalk.position.set(side * 0.045, 0.022, -0.005);
  stalk.rotation.z = -side * 1.15;
  g.add(stalkBase, stalk);

  const mirrorFaceMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    metalness: 1.0,
    roughness: 0.01,
    envMapIntensity: 2.6,
  });
  mirrorFaceMat.userData.preserveEnvMapIntensity = true;

  if (style === 'classic_round') {
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.062, 14, 12), chromeMat);
    shell.scale.set(1.06, 0.92, 0.68);
    shell.position.set(side * 0.088, 0.05, -0.015);
    const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.056, 0.009, 8, 16), chromeMat);
    bezel.position.set(side * 0.088, 0.05, -0.048);
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.052, 14), mirrorFaceMat);
    face.rotation.y = Math.PI;
    face.position.set(side * 0.088, 0.05, -0.052);
    g.add(shell, bezel, face);
  } else {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.072, 14, 12), housingMat);
    cap.scale.set(1.22, 0.68, 0.78);
    cap.position.set(side * 0.095, 0.038, -0.015);
    const backing = new THREE.Mesh(new THREE.BoxGeometry(0.145, 0.082, 0.045), chromeMat);
    backing.position.set(side * 0.095, 0.038, -0.028);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.128, 0.068), mirrorFaceMat);
    face.rotation.y = Math.PI;
    face.position.set(side * 0.095, 0.038, -0.054);
    g.add(cap, backing, face);
  }

  g.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.userData.noShadowCast = true;
      obj.userData.preserveEnvMapIntensity = true;
    }
  });
  return g;
}

/**
 * Recessed door handle assembly with finger pocket, chrome stanchion pull bar, and key-lock cylinder.
 */
export function buildDoorHandleAssembly(options: {
  side: -1 | 1;
  chromeMat: THREE.Material;
  pocketMat: THREE.Material;
  withKeyCylinder?: boolean;
}): THREE.Group {
  const { side, chromeMat, pocketMat, withKeyCylinder = true } = options;
  const g = new THREE.Group();

  const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.052, 0.19), pocketMat);
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.16, 10), chromeMat);
  bar.rotation.x = Math.PI / 2;
  bar.position.set(side * 0.022, 0.004, 0);
  g.add(pocket, bar);

  [-0.065, 0.065].forEach((sz) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.015, 0.024, 8), chromeMat);
    post.rotation.z = Math.PI / 2;
    post.position.set(side * 0.012, 0.004, sz);
    g.add(post);
  });

  if (withKeyCylinder) {
    const lockBezel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.016, 0.014, 12),
      chromeMat,
    );
    lockBezel.rotation.z = Math.PI / 2;
    lockBezel.position.set(side * 0.01, -0.048, -0.045);
    const keySlot = new THREE.Mesh(
      new THREE.BoxGeometry(0.018, 0.012, 0.004),
      pocketMat,
    );
    keySlot.position.set(side * 0.012, -0.048, -0.045);
    g.add(lockBezel, keySlot);
  }

  g.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.userData.noShadowCast = true;
      obj.userData.preserveEnvMapIntensity = true;
    }
  });
  return g;
}

/**
 * Mounts classic cursive "Cadillac" script and wreath-crest shield decals on left/right front fenders.
 */
export function buildCadillacFenderBadges(side: -1 | 1): THREE.Group {
  const g = new THREE.Group();
  const scriptTex = getCadillacScriptBadgeMap();
  const crestTex = getCadillacCrestEmblemMap();

  if (scriptTex) {
    const mat = new THREE.MeshStandardMaterial({
      map: scriptTex,
      transparent: true,
      alphaTest: 0.15,
      metalness: 0.9,
      roughness: 0.14,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.075), mat);
    plane.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
    plane.position.set(0, 0, -0.22 * side);
    g.add(plane);
  }

  if (crestTex) {
    const mat = new THREE.MeshStandardMaterial({
      map: crestTex,
      transparent: true,
      alphaTest: 0.15,
      metalness: 0.65,
      roughness: 0.22,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });
    const crest = new THREE.Mesh(new THREE.PlaneGeometry(0.095, 0.095), mat);
    crest.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
    crest.position.set(0, 0, 0.05 * side);
    g.add(crest);
  }

  g.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.userData.noShadowCast = true;
      obj.userData.preserveEnvMapIntensity = true;
    }
  });
  return g;
}

/**
 * Contoured performance brake caliper housing with bridge ribs & metallic hardware.
 */
export function createMultiPistonCaliperMesh(
  caliperMat: THREE.Material,
  chromeMat: THREE.Material,
  rotorRadius: number,
): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.072, rotorRadius * 0.56, rotorRadius * 0.34),
    caliperMat,
  );
  const arch = new THREE.Mesh(
    new THREE.CylinderGeometry(rotorRadius * 0.16, rotorRadius * 0.16, 0.078, 10),
    caliperMat,
  );
  arch.rotation.z = Math.PI / 2;
  arch.position.y = rotorRadius * 0.24;

  [-rotorRadius * 0.12, rotorRadius * 0.12].forEach((py) => {
    const pistonCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.016, 0.08, 8),
      chromeMat,
    );
    pistonCap.rotation.z = Math.PI / 2;
    pistonCap.position.set(0, py, 0);
    g.add(pistonCap);
  });

  g.add(body, arch);
  g.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.userData.noShadowCast = true;
      obj.userData.preserveEnvMapIntensity = true;
    }
  });
  return g;
}

/**
 * Twin articulated windshield wipers resting neatly at the base of the windshield.
 */
export function buildWindshieldWipers(width = 1.35): THREE.Group {
  const g = new THREE.Group();
  const armMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.72,
    roughness: 0.28,
  });
  const wiperHalf = width * 0.38;
  [-width * 0.24, width * 0.16].forEach((wx) => {
    const pivot = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.018, 0.025, 8), armMat);
    pivot.position.set(wx, 0, 0);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(wiperHalf, 0.016, 0.022), armMat);
    blade.position.set(wx + wiperHalf * 0.44, 0.018, -0.015);
    blade.rotation.z = 0.06;
    g.add(pivot, blade);
  });
  g.traverse((obj) => {
    if (obj instanceof THREE.Mesh) obj.userData.noShadowCast = true;
  });
  return g;
}

/**
 * Interior cabin realism kit: rearview mirror, twin sun visors, and 3-pedal brushed aluminum footwell cluster.
 */
export function buildCabinDetailKit(options: {
  mirrorY: number;
  mirrorZ: number;
  visorWidth?: number;
  dashY: number;
  pedalZ: number;
  driverX?: number;
  trimMat: THREE.Material;
  chromeMat: THREE.Material;
}): THREE.Group {
  const g = new THREE.Group();
  const { mirrorY, mirrorZ, dashY, pedalZ, driverX = -0.42, trimMat, chromeMat } = options;
  const vw = options.visorWidth ?? 0.56;

  // Rearview mirror + reflective glass
  const mirrorStem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.09, 8), chromeMat);
  mirrorStem.position.set(0, mirrorY + 0.035, mirrorZ + 0.01);
  const mirrorCase = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.062, 0.032), trimMat);
  mirrorCase.position.set(0, mirrorY, mirrorZ);
  const mirrorGlass = new THREE.Mesh(
    new THREE.PlaneGeometry(0.22, 0.048),
    new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 1.0,
      roughness: 0.01,
      envMapIntensity: 2.3,
    }),
  );
  mirrorGlass.rotation.y = Math.PI;
  mirrorGlass.position.set(0, mirrorY, mirrorZ - 0.018);
  g.add(mirrorStem, mirrorCase, mirrorGlass);

  // Twin sun visors
  [-0.42, 0.42].forEach((vx) => {
    const visor = new THREE.Mesh(new THREE.BoxGeometry(vw, 0.025, 0.14), trimMat);
    visor.position.set(vx, mirrorY + 0.055, mirrorZ - 0.04);
    visor.rotation.x = 0.25;
    g.add(visor);
  });

  // 3-pedal brushed metal footwell cluster (gas, brake, dead-pedal)
  const brushedMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    map: getBrushedMetalMap(),
    metalness: 0.88,
    roughness: 0.24,
  });
  [-0.1, 0, 0.09].forEach((px, idx) => {
    const pedal = new THREE.Mesh(
      new THREE.BoxGeometry(idx === 1 ? 0.08 : 0.055, idx === 2 ? 0.11 : 0.075, 0.018),
      brushedMat,
    );
    pedal.position.set(driverX + px, Math.max(0.24, dashY - 0.36), pedalZ);
    pedal.rotation.x = -0.35;
    g.add(pedal);
  });

  g.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.userData.noShadowCast = true;
      obj.userData.preserveEnvMapIntensity = true;
    }
  });
  return g;
}

/**
 * Builds a photorealistic multi-component steering wheel assembly with:
 * - Contoured leather or burled-walnut rim + 12-o'clock centering stripe
 * - Brushed chrome/aluminum 3-spoke core + thumb button pods
 * - Sculpted leather airbag/horn hub with metallic emblem ring
 * - Steering column shroud + twin stalk levers + shift paddles (on sport/SUV)
 */
export function buildDetailedSteeringWheel(options: {
  style: 'classic_luxury' | 'sport_suv' | 'supercar';
  radius?: number;
  chromeMat: THREE.Material;
  leatherMat: THREE.Material;
  accentColor?: THREE.ColorRepresentation;
}): THREE.Group {
  const { style, chromeMat, leatherMat } = options;
  const r = options.radius ?? (style === 'supercar' ? 0.155 : 0.175);
  const wheel = new THREE.Group();

  const isLuxury = style === 'classic_luxury';
  const rimMat = isLuxury ? createWalnutWoodMaterial() : leatherMat;
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.72,
    roughness: 0.3,
  });
  const stripeMat = new THREE.MeshStandardMaterial({
    color: options.accentColor ?? (style === 'supercar' ? 0xf97316 : 0xef4444),
    roughness: 0.4,
    metalness: 0.15,
  });

  // Main contoured steering rim
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r, 0.023, 12, 28), rimMat);
  wheel.add(rim);

  // Inner metallic accent ring (classic luxury) or top 12-o'clock motorsport centering stripe
  if (isLuxury) {
    const innerChromeRing = new THREE.Mesh(
      new THREE.TorusGeometry(r - 0.022, 0.006, 8, 24),
      chromeMat,
    );
    wheel.add(innerChromeRing);
  } else {
    const topMarker = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0255, 0.0255, 0.028, 12),
      stripeMat,
    );
    topMarker.rotation.z = Math.PI / 2;
    topMarker.position.set(0, r, 0);
    wheel.add(topMarker);
  }

  // Sculpted central airbag/horn pad + chrome emblem bezel
  const hubPad = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.32, r * 0.35, 0.044, 18),
    leatherMat,
  );
  hubPad.rotation.x = Math.PI / 2;
  hubPad.position.z = 0.01;
  const emblemRing = new THREE.Mesh(
    new THREE.TorusGeometry(r * 0.14, 0.005, 8, 18),
    chromeMat,
  );
  emblemRing.position.z = 0.034;
  wheel.add(hubPad, emblemRing);

  // 3 sculpted spokes with thumb control button pods
  const spokeAngles = [Math.PI, 0, -Math.PI / 2];
  spokeAngles.forEach((ang, idx) => {
    const spokeLen = r * 0.72;
    const spoke = new THREE.Mesh(
      new THREE.BoxGeometry(idx === 2 ? 0.034 : 0.028, spokeLen, 0.018),
      style === 'supercar' ? darkMetalMat : chromeMat,
    );
    spoke.position.set(
      Math.cos(ang) * (spokeLen * 0.52),
      Math.sin(ang) * (spokeLen * 0.52),
      0.002,
    );
    spoke.rotation.z = ang - Math.PI / 2;
    wheel.add(spoke);

    if (idx < 2) {
      const pod = new THREE.Mesh(
        new THREE.BoxGeometry(0.038, 0.026, 0.024),
        darkMetalMat,
      );
      pod.position.set(Math.cos(ang) * (r * 0.56), 0.004, 0.012);
      wheel.add(pod);
    }
  });

  // Steering column shroud + twin stalks (turn signal & wipers) behind hub
  const column = new THREE.Mesh(
    new THREE.CylinderGeometry(0.044, 0.052, 0.24, 12),
    darkMetalMat,
  );
  column.rotation.x = Math.PI / 2;
  column.position.z = -0.12;
  wheel.add(column);

  [-1, 1].forEach((side) => {
    const stalk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.007, 0.008, 0.13, 8),
      darkMetalMat,
    );
    stalk.rotation.z = side * 1.32;
    stalk.position.set(side * 0.085, 0.015, -0.055);
    wheel.add(stalk);

    if (!isLuxury) {
      const paddle = new THREE.Mesh(
        new THREE.BoxGeometry(0.022, 0.075, 0.008),
        chromeMat,
      );
      paddle.position.set(side * (r * 0.52), 0.025, -0.028);
      wheel.add(paddle);
    }
  });

  wheel.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.userData.noShadowCast = true;
      obj.userData.preserveEnvMapIntensity = true;
    }
  });
  return wheel;
}
