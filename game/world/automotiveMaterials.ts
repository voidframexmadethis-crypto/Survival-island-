import * as THREE from 'three';

/**
 * Shared singleton procedural PBR textures & photorealistic automotive material/sub-assembly factory.
 * Textures are generated once and cached across all vehicles for zero FPS / memory overhead.
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
let cachedTireSidewallNormal: THREE.CanvasTexture | null = null;
let cachedGrilleAlbedo: THREE.CanvasTexture | null = null;
let cachedGrilleNormal: THREE.CanvasTexture | null = null;
let cachedHeadlightLensMap: THREE.CanvasTexture | null = null;
let cachedHeadlightLensNormal: THREE.CanvasTexture | null = null;
let cachedBrushedMetalMap: THREE.CanvasTexture | null = null;

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
  if (isColor) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
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
    const isFlake = rand() > 0.78 ? 1.0 : 0.16;
    data[i] = Math.round(128 + nx * 28 * isFlake);
    data[i + 1] = Math.round(128 + ny * 28 * isFlake);
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
      d[idx] = Math.round(128 + w1 * 3);
      d[idx + 1] = Math.round(128 + w2 * 3);
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

/** Diamond-quilted perforated leather bump/color overlay map */
export function getLeatherQuiltMap(): THREE.CanvasTexture | null {
  if (cachedLeatherStitchMap) return cachedLeatherStitchMap;
  if (!canUseCanvas()) return null;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#efefef';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(0,0,0,0.22)';
  ctx.lineWidth = 3;
  const step = 64;
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

  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
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

  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  for (let y = 12; y < size; y += 16) {
    for (let x = 12; x < size; x += 16) {
      ctx.beginPath();
      ctx.arc(x, y, 1.1, 0, Math.PI * 2);
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

  ctx.fillStyle = '#090b10';
  ctx.fillRect(0, 0, w, h);

  const drawDial = (cx: number, cy: number, r: number, needleAngle: number, accent: string) => {
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(cx, cy, r - 3, 0, Math.PI * 2);
    ctx.fill();

    for (let i = 0; i <= 10; i++) {
      const a = Math.PI * 0.75 + (i / 10) * Math.PI * 1.5;
      ctx.strokeStyle = i >= 8 ? '#ef4444' : '#f1f5f9';
      ctx.lineWidth = i % 2 === 0 ? 3 : 1.5;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (r - 16), cy + Math.sin(a) * (r - 16));
      ctx.lineTo(cx + Math.cos(a) * (r - 6), cy + Math.sin(a) * (r - 6));
      ctx.stroke();
    }

    ctx.strokeStyle = accent;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(needleAngle) * (r - 18), cy + Math.sin(needleAngle) * (r - 18));
    ctx.stroke();

    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    ctx.fill();
  };

  drawDial(124, 96, 72, Math.PI * 1.15, '#f97316');
  drawDial(388, 96, 72, Math.PI * 0.92, '#38bdf8');

  ctx.fillStyle = '#0b192c';
  ctx.fillRect(214, 42, 84, 108);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;
  ctx.strokeRect(214, 42, 84, 108);
  ctx.fillStyle = '#7dd3fc';
  ctx.font = 'bold 26px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('DRIVE', 256, 86);
  ctx.fillStyle = '#34d399';
  ctx.font = 'bold 18px monospace';
  ctx.fillText('100%', 256, 122);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.userData = { sharedAsset: true };
  tex.needsUpdate = true;
  cachedGaugeClusterMap = tex;
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

  // Circumferential water drainage channels (across X since cylinder U runs around circumference or V along length)
  const channels = [0.22, 0.42, 0.58, 0.78];
  for (const frac of channels) {
    const cx = frac * size;
    actx.fillStyle = '#090a0d';
    actx.fillRect(cx - 5, 0, 10, size);

    nctx.fillStyle = '#5c80e0';
    nctx.fillRect(cx - 5, 0, 4, size);
    nctx.fillStyle = '#a480e0';
    nctx.fillRect(cx + 1, 0, 4, size);
  }

  // Angled shoulder tread sipes & blocks
  for (let y = -32; y < size + 32; y += 22) {
    actx.strokeStyle = '#0a0b0e';
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

/** Concentric molded rubber tire sidewall normal map */
export function getTireSidewallNormalMap(): THREE.CanvasTexture | null {
  if (cachedTireSidewallNormal) return cachedTireSidewallNormal;
  if (!canUseCanvas()) return null;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#8080ff';
  ctx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += 8) {
    ctx.strokeStyle = 'rgba(104, 104, 240, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }
  for (let x = 0; x < size; x += 6) {
    ctx.strokeStyle = 'rgba(150, 130, 248, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }

  cachedTireSidewallNormal = makeRepeatTex(canvas, 10, 2, false);
  return cachedTireSidewallNormal;
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

  // Deep radiator shadow cavity
  actx.fillStyle = '#07090d';
  actx.fillRect(0, 0, size, size);
  nctx.fillStyle = '#8080ff';
  nctx.fillRect(0, 0, size, size);

  // Jeweled chrome egg-crate horizontal & vertical ribs + specular jewel studs
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

      // Jeweled chrome bead center (1959 Cadillac signature)
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

  // Vertical Fresnel prism flutes
  for (let x = 8; x < size; x += 8) {
    actx.strokeStyle = 'rgba(255,255,255,0.4)';
    actx.lineWidth = 1.5;
    actx.beginPath();
    actx.moveTo(x, 0);
    actx.lineTo(x, size);
    actx.stroke();

    nctx.strokeStyle = 'rgba(176,128,255,0.65)';
    nctx.lineWidth = 2;
    nctx.beginPath();
    nctx.moveTo(x, 0);
    nctx.lineTo(x, size);
    nctx.stroke();
  }
  // Concentric fresnel rings
  for (let r = 14; r <= 54; r += 12) {
    actx.strokeStyle = 'rgba(255,255,255,0.35)';
    actx.lineWidth = 1.5;
    actx.beginPath();
    actx.arc(cx, cy, r, 0, Math.PI * 2);
    actx.stroke();
  }

  const mTex = new THREE.CanvasTexture(albedo);
  mTex.colorSpace = THREE.SRGBColorSpace;
  mTex.userData = { sharedAsset: true };
  mTex.needsUpdate = true;

  const nTex = new THREE.CanvasTexture(norm);
  nTex.userData = { sharedAsset: true };
  nTex.needsUpdate = true;

  cachedHeadlightLensMap = mTex;
  cachedHeadlightLensNormal = nTex;
  return { map: cachedHeadlightLensMap, normalMap: cachedHeadlightLensNormal };
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
    return new THREE.MeshPhysicalMaterial({
      color,
      map: options?.map ?? null,
      metalness: 0.08,
      roughness: 0.065,
      clearcoat: 1.0,
      clearcoatRoughness: 0.014,
      clearcoatNormalMap: clearcoatNormal,
      clearcoatNormalScale: new THREE.Vector2(0.015, 0.015),
      ior: 1.56,
      reflectivity: 1.0,
      specularIntensity: 1.0,
      specularColor: new THREE.Color(0xffffff),
      iridescence: 0.08,
      iridescenceIOR: 1.38,
      envMapIntensity: 2.25,
    });
  }

  return new THREE.MeshPhysicalMaterial({
    color,
    map: options?.map ?? null,
    metalness: 0.44,
    roughness: 0.1,
    clearcoat: 1.0,
    clearcoatRoughness: 0.018,
    clearcoatNormalMap: clearcoatNormal,
    clearcoatNormalScale: new THREE.Vector2(0.025, 0.025),
    normalMap: flakeNormal,
    normalScale: new THREE.Vector2(0.038, 0.038),
    ior: 1.56,
    reflectivity: 1.0,
    specularIntensity: 1.0,
    iridescence: 0.16,
    iridescenceIOR: 1.42,
    envMapIntensity: 2.15,
  });
}

/** Mirror-grade automotive chrome trim material */
export function createChromeMaterial(
  color: THREE.ColorRepresentation = 0xf8fafc,
): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: 1.0,
    roughness: 0.025,
    clearcoat: 0.85,
    clearcoatRoughness: 0.015,
    reflectivity: 1.0,
    envMapIntensity: 2.4,
  });
}

/** Vulcanized tire tread rubber material with realistic directional grooves */
export function createTireRubberMaterial(): THREE.MeshStandardMaterial {
  const { map, normalMap } = getTireTreadTextureSet();
  return new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map,
    normalMap,
    normalScale: new THREE.Vector2(0.85, 0.85),
    roughness: 0.82,
    metalness: 0.05,
  });
}

/** Molded tire sidewall rubber material */
export function createTireSidewallMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x16181d,
    normalMap: getTireSidewallNormalMap(),
    normalScale: new THREE.Vector2(0.45, 0.45),
    roughness: 0.78,
    metalness: 0.05,
  });
}

/** Real-life laminated automotive safety glass with crisp Fresnel reflection & clear interior view */
export function createAutomotiveGlassMaterial(opacity = 0.38): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: 0x0d1b2a,
    metalness: 0.08,
    roughness: 0.016,
    ior: 1.52,
    reflectivity: 1.0,
    specularIntensity: 1.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.012,
    envMapIntensity: 2.5,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

/** Real-life diamond-stitched & pebbled Nappa automotive leather */
export function createAutomotiveLeatherMaterial(
  color: THREE.ColorRepresentation,
): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color,
    map: getLeatherQuiltMap(),
    normalMap: getLeatherNormalMap(),
    normalScale: new THREE.Vector2(0.32, 0.32),
    roughness: 0.56,
    metalness: 0.04,
    sheen: 0.35,
    sheenRoughness: 0.65,
    sheenColor: new THREE.Color(0xffffff),
    clearcoat: 0.12,
    clearcoatRoughness: 0.48,
  });
}

/** Real-life Haartz Stayfast woven twill convertible soft-top cloth material */
export function createConvertibleFabricMaterial(
  tint: THREE.ColorRepresentation = 0x1a1c22,
): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
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
}

/** 2x2 twill glossy carbon fiber material */
export function createCarbonFiberMaterial(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: getCarbonWeaveMap(),
    metalness: 0.42,
    roughness: 0.24,
    clearcoat: 0.95,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1.35,
  });
}

/** Polished burled walnut wood interior trim */
export function createWalnutWoodMaterial(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: getWalnutWoodMap(),
    metalness: 0.08,
    roughness: 0.2,
    clearcoat: 0.95,
    clearcoatRoughness: 0.06,
    envMapIntensity: 1.3,
  });
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
 * Chrome bezel + dark bowl + parabolic reflector + bright bulb + fluted crystal clearcoat lens + optional visor hood.
 */
export function buildRealisticHeadlightPod(options: {
  shape: 'round' | 'quad_bar';
  radius?: number;
  width?: number;
  height?: number;
  chromeMat: THREE.Material;
  withHood?: boolean;
  tintColor?: THREE.ColorRepresentation;
}): THREE.Group {
  const { shape, chromeMat, withHood } = options;
  const g = new THREE.Group();
  const lensTex = getHeadlightLensTextureSet();
  const darkBowlMat = new THREE.MeshStandardMaterial({
    color: 0x090d14,
    roughness: 0.5,
    metalness: 0.4,
  });
  const bulbMat = new THREE.MeshStandardMaterial({
    color: options.tintColor ?? 0xfefce8,
    emissive: options.tintColor ?? 0xfef08a,
    emissiveIntensity: 2.1,
    roughness: 0.1,
  });
  const lensMat = new THREE.MeshPhysicalMaterial({
    color: 0xf8fafc,
    map: lensTex.map,
    normalMap: lensTex.normalMap,
    normalScale: new THREE.Vector2(0.35, 0.35),
    metalness: 0.08,
    roughness: 0.04,
    clearcoat: 1.0,
    clearcoatRoughness: 0.015,
    envMapIntensity: 2.3,
    transparent: true,
    opacity: 0.62,
  });

  if (shape === 'round') {
    const r = options.radius ?? 0.072;
    const bezel = new THREE.Mesh(
      new THREE.TorusGeometry(r, r * 0.22, 10, 18),
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

    const bulb = new THREE.Mesh(new THREE.SphereGeometry(r * 0.36, 10, 8), bulbMat);
    bulb.position.z = 0.005;

    const lens = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 0.92, r * 0.92, 0.018, 16),
      lensMat,
    );
    lens.rotation.x = Math.PI / 2;
    lens.position.z = 0.018;

    g.add(bowl, reflector, bulb, lens, bezel);
    if (withHood) {
      const visor = new THREE.Mesh(
        new THREE.TorusGeometry(r * 1.05, r * 0.16, 8, 14, Math.PI),
        chromeMat,
      );
      visor.position.z = 0.025;
      g.add(visor);
    }
  } else {
    const w = options.width ?? 0.26;
    const h = options.height ?? 0.1;
    const housing = new THREE.Mesh(new THREE.BoxGeometry(w + 0.024, h + 0.024, 0.06), chromeMat);
    const darkCavity = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.045), darkBowlMat);
    darkCavity.position.z = 0.012;
    const bulb = new THREE.Mesh(new THREE.BoxGeometry(w * 0.72, h * 0.48, 0.03), bulbMat);
    bulb.position.z = 0.022;
    const lens = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, h * 0.9, 0.018), lensMat);
    lens.position.z = 0.036;
    g.add(housing, darkCavity, bulb, lens);
  }

  g.traverse((obj) => {
    if (obj instanceof THREE.Mesh) obj.userData.noShadowCast = true;
  });
  return g;
}

/**
 * Multi-layer ruby/amber taillight pod (Cadillac rocket bullet, classic round, or modern LED blade).
 */
export function buildRealisticTaillightPod(options: {
  style: 'cadillac_bullet' | 'round' | 'blade';
  chromeMat: THREE.Material;
  width?: number;
  height?: number;
  radius?: number;
}): THREE.Group {
  const { style, chromeMat } = options;
  const g = new THREE.Group();
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 1.65,
    roughness: 0.15,
  });
  const rubyLensMat = new THREE.MeshPhysicalMaterial({
    color: 0x991b1b,
    emissive: 0x7f1d1d,
    emissiveIntensity: 0.35,
    metalness: 0.05,
    roughness: 0.04,
    clearcoat: 1.0,
    clearcoatRoughness: 0.015,
    envMapIntensity: 2.2,
    transparent: true,
    opacity: 0.78,
  });

  if (style === 'cadillac_bullet') {
    const nacelle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.056, 0.068, 0.24, 14),
      chromeMat,
    );
    nacelle.rotation.x = Math.PI / 2;
    const glowCore = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 8), coreMat);
    glowCore.position.z = -0.11;
    const rubyCone = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 14), rubyLensMat);
    rubyCone.rotation.x = -Math.PI / 2;
    rubyCone.position.z = -0.16;
    const trimRing = new THREE.Mesh(new THREE.TorusGeometry(0.056, 0.012, 8, 16), chromeMat);
    trimRing.position.z = -0.115;
    g.add(nacelle, glowCore, rubyCone, trimRing);
  } else if (style === 'round') {
    const r = options.radius ?? 0.055;
    const bezel = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.2, 8, 16), chromeMat);
    const core = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 0.85, r * 0.85, 0.04, 14),
      coreMat,
    );
    core.rotation.x = Math.PI / 2;
    const lens = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 0.88, r * 0.88, 0.018, 14),
      rubyLensMat,
    );
    lens.rotation.x = Math.PI / 2;
    lens.position.z = -0.02;
    g.add(bezel, core, lens);
  } else {
    const w = options.width ?? 0.2;
    const h = options.height ?? 0.12;
    const bezel = new THREE.Mesh(new THREE.BoxGeometry(w + 0.02, h + 0.02, 0.05), chromeMat);
    const core = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, h * 0.82, 0.045), coreMat);
    core.position.z = -0.01;
    const lens = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, h * 0.92, 0.02), rubyLensMat);
    lens.position.z = -0.025;
    g.add(bezel, core, lens);
  }

  g.traverse((obj) => {
    if (obj instanceof THREE.Mesh) obj.userData.noShadowCast = true;
  });
  return g;
}

/**
 * Recessed 3D chrome/billet egg-crate grille assembly with radiator backing cavity & chrome surround.
 */
export function buildRealisticGrilleAssembly(options: {
  width: number;
  height: number;
  chromeMat: THREE.Material;
  horizontalBars?: number;
}): THREE.Group {
  const { width, height, chromeMat, horizontalBars = 3 } = options;
  const g = new THREE.Group();
  const { map, normalMap } = getGrilleMeshTextureSet();

  const cavityMat = new THREE.MeshStandardMaterial({
    color: 0x05070a,
    roughness: 0.92,
    metalness: 0.15,
  });
  const meshMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    map,
    normalMap,
    normalScale: new THREE.Vector2(0.85, 0.85),
    metalness: 0.92,
    roughness: 0.18,
    envMapIntensity: 1.9,
  });

  // Outer chrome bezel frame (top, bottom, left, right rails)
  const frameT = 0.036;
  const frameD = 0.075;
  const topRail = new THREE.Mesh(new THREE.BoxGeometry(width, frameT, frameD), chromeMat);
  topRail.position.y = height * 0.5;
  const botRail = new THREE.Mesh(new THREE.BoxGeometry(width, frameT, frameD), chromeMat);
  botRail.position.y = -height * 0.5;
  const leftRail = new THREE.Mesh(
    new THREE.BoxGeometry(frameT, height + frameT, frameD),
    chromeMat,
  );
  leftRail.position.x = -width * 0.5;
  const rightRail = leftRail.clone();
  rightRail.position.x = width * 0.5;

  // Deep radiator cavity behind mesh
  const cavity = new THREE.Mesh(
    new THREE.BoxGeometry(width - 0.04, height - 0.03, 0.04),
    cavityMat,
  );
  cavity.position.z = -0.025;

  // Textured jeweled mesh plane inside the bezel
  const meshFace = new THREE.Mesh(
    new THREE.BoxGeometry(width - 0.05, height - 0.04, 0.028),
    meshMat,
  );
  meshFace.position.z = -0.004;

  g.add(topRail, botRail, leftRail, rightRail, cavity, meshFace);

  // Crisp horizontal billet chrome bars
  for (let i = 1; i <= horizontalBars; i++) {
    const frac = i / (horizontalBars + 1) - 0.5;
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(width - 0.05, 0.016, 0.038),
      chromeMat,
    );
    bar.position.set(0, frac * height, 0.012);
    g.add(bar);
  }

  g.traverse((obj) => {
    if (obj instanceof THREE.Mesh) obj.userData.noShadowCast = true;
  });
  return g;
}

/**
 * Sculpted automotive wing mirror with stalk, aerodynamic housing & reflective mirror glass face.
 */
export function buildRealisticSideMirror(options: {
  side: -1 | 1;
  housingMat: THREE.Material;
  chromeMat: THREE.Material;
  style?: 'classic_round' | 'aero';
}): THREE.Group {
  const { side, housingMat, chromeMat, style = 'aero' } = options;
  const g = new THREE.Group();

  const stalk = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.032, 0.045), chromeMat);
  stalk.position.set(side * 0.035, 0.01, 0);
  stalk.rotation.z = side * 0.28;
  g.add(stalk);

  const mirrorFaceMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 1.0,
    roughness: 0.01,
    envMapIntensity: 2.5,
  });

  if (style === 'classic_round') {
    const head = new THREE.Mesh(
      new THREE.CylinderGeometry(0.058, 0.048, 0.055, 14),
      chromeMat,
    );
    head.rotation.x = Math.PI / 2;
    head.position.set(side * 0.085, 0.048, -0.015);
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.052, 14), mirrorFaceMat);
    face.rotation.y = Math.PI;
    face.position.set(side * 0.085, 0.048, -0.044);
    g.add(head, face);
  } else {
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.145, 0.088, 0.075), housingMat);
    cap.position.set(side * 0.095, 0.036, -0.015);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.125, 0.072), mirrorFaceMat);
    face.rotation.y = Math.PI;
    face.position.set(side * 0.095, 0.036, -0.054);
    g.add(cap, face);
  }

  g.traverse((obj) => {
    if (obj instanceof THREE.Mesh) obj.userData.noShadowCast = true;
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
    if (obj instanceof THREE.Mesh) obj.userData.noShadowCast = true;
  });
  return g;
}

/**
 * Photorealistic steering wheel with column shaft, stalks, sculpted rim, horn ring/paddles & central hub emblem.
 */
export function buildDetailedSteeringWheel(options: {
  style: 'classic_luxury' | 'sport_suv' | 'supercar';
  radius?: number;
  chromeMat: THREE.Material;
  leatherMat: THREE.Material;
  accentColor?: THREE.ColorRepresentation;
}): THREE.Group {
  const { style, chromeMat, leatherMat, accentColor = 0xf97316 } = options;
  const r = options.radius ?? 0.16;
  const g = new THREE.Group();

  // Steering column shroud & twin turn/wiper stalks
  const colShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.22, r * 0.26, r * 0.85, 12),
    leatherMat,
  );
  colShaft.rotation.x = Math.PI / 2;
  colShaft.position.z = r * 0.45;
  g.add(colShaft);

  [-1, 1].forEach((side) => {
    const stalk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.009, r * 0.58, 6),
      chromeMat,
    );
    stalk.rotation.z = Math.PI / 2 - side * 0.18;
    stalk.position.set(side * r * 0.44, r * 0.06, r * 0.28);
    g.add(stalk);
  });

  // Outer rim (walnut wood for classic Cadillac/lowrider luxury, thick Nappa leather for SUV/supercar)
  const rimMat =
    style === 'classic_luxury' ? createWalnutWoodMaterial() : leatherMat;
  const tubeR = style === 'classic_luxury' ? r * 0.1 : r * 0.135;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r, tubeR, 12, 28), rimMat);
  g.add(rim);

  // Inner chrome horn ring on classic 1959/60s wheels or 12-o'clock racing stripe on sport/supercar wheels
  if (style === 'classic_luxury') {
    const hornRing = new THREE.Mesh(
      new THREE.TorusGeometry(r * 0.72, r * 0.04, 8, 24),
      chromeMat,
    );
    hornRing.position.z = -0.008;
    g.add(hornRing);
  } else {
    const markerMat = new THREE.MeshStandardMaterial({
      color: accentColor,
      emissive: accentColor,
      emissiveIntensity: 0.45,
      roughness: 0.3,
    });
    const topMarker = new THREE.Mesh(
      new THREE.TorusGeometry(r, tubeR * 1.06, 8, 8, 0.26),
      markerMat,
    );
    topMarker.rotation.z = Math.PI * 0.5 - 0.13;
    g.add(topMarker);

    // Dual billet paddle shifters behind wheel
    [-1, 1].forEach((side) => {
      const paddle = new THREE.Mesh(
        new THREE.BoxGeometry(r * 0.16, r * 0.46, 0.014),
        chromeMat,
      );
      paddle.position.set(side * r * 0.56, r * 0.06, r * 0.14);
      paddle.rotation.z = -side * 0.15;
      g.add(paddle);
    });
  }

  // Three sculpted spokes connecting hub to rim
  const spokeAngles =
    style === 'classic_luxury'
      ? [Math.PI, 0, -Math.PI * 0.5]
      : [Math.PI + 0.22, -0.22, -Math.PI * 0.5];
  const spokeMat = style === 'supercar' ? createCarbonFiberMaterial() : chromeMat;
  for (const ang of spokeAngles) {
    const spoke = new THREE.Mesh(
      new THREE.BoxGeometry(r * 0.88, r * 0.16, 0.022),
      spokeMat,
    );
    spoke.position.set(Math.cos(ang) * r * 0.46, Math.sin(ang) * r * 0.46, 0.006);
    spoke.rotation.z = ang;
    g.add(spoke);
  }

  // Center horn boss + brushed/chrome crest emblem
  const centerBoss = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.29, r * 0.32, 0.048, 16),
    leatherMat,
  );
  centerBoss.rotation.x = Math.PI / 2;
  const centerCrest = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.14, r * 0.14, 0.056, 12),
    chromeMat,
  );
  centerCrest.rotation.x = Math.PI / 2;
  g.add(centerBoss, centerCrest);

  g.traverse((obj) => {
    if (obj instanceof THREE.Mesh) obj.userData.noShadowCast = true;
  });
  return g;
}
