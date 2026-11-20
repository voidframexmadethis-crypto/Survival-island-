import * as THREE from 'three';

/**
 * Shared singleton procedural PBR textures & ultra-realistic automotive material factory.
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

function canUseCanvas(): boolean {
  return typeof document !== 'undefined' && typeof document.createElement === 'function';
}

function makeRepeatTex(canvas: HTMLCanvasElement, repeatX: number, repeatY: number, isColor = true): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  if (isColor) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

/** Fine automotive metallic pearl flake normal map for showroom car paint sparkle */
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
    const isFlake = rand() > 0.72 ? 1.0 : 0.25;
    data[i] = Math.round(128 + nx * 46 * isFlake);
    data[i + 1] = Math.round(128 + ny * 46 * isFlake);
    data[i + 2] = 248;
    data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  cachedMetallicFlakeNormal = makeRepeatTex(canvas, 14, 14, false);
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
      const w1 = Math.sin(x * 0.25) * Math.cos(y * 0.25);
      const w2 = Math.sin((x + y) * 0.18);
      d[idx] = Math.round(128 + w1 * 6);
      d[idx + 1] = Math.round(128 + w2 * 6);
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

  // Subtle organic leather pebble cells
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

  ctx.fillStyle = '#ececec';
  ctx.fillRect(0, 0, size, size);

  // Soft diamond bolster shading
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

  // Fine contrast stitch dashes along diamond seams
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

  // Micro ventilation perforations inside each diamond
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

/** Real-life Haartz Stayfast woven twill convertible soft-top cloth (albedo + seam stitching) */
export function getStayfastCanvasMap(): THREE.CanvasTexture | null {
  if (cachedStayfastCanvasMap) return cachedStayfastCanvasMap;
  if (!canUseCanvas()) return null;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Deep charcoal-black marine woven cloth base
  ctx.fillStyle = '#17181c';
  ctx.fillRect(0, 0, size, size);

  // Diagonal 2x2 Stayfast twill canvas weave threads
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

  // Authentic twin top-stitched waterproof sail seams
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
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(cx, cy, r - 3, 0, Math.PI * 2);
    ctx.fill();

    // Tick marks
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI * 0.75 + (i / 10) * Math.PI * 1.5;
      ctx.strokeStyle = i >= 8 ? '#ef4444' : '#e2e8f0';
      ctx.lineWidth = i % 2 === 0 ? 3 : 1.5;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (r - 16), cy + Math.sin(a) * (r - 16));
      ctx.lineTo(cx + Math.cos(a) * (r - 6), cy + Math.sin(a) * (r - 6));
      ctx.stroke();
    }

    // Glowing needle
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

  // Center digital info screen
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
  tex.needsUpdate = true;
  cachedGaugeClusterMap = tex;
  return cachedGaugeClusterMap;
}

/** Showroom multi-layer metallic pearl car paint material */
export function createAutomotivePaintMaterial(
  color: THREE.ColorRepresentation,
  options?: { isPearl?: boolean; map?: THREE.Texture | null },
): THREE.MeshPhysicalMaterial {
  const flakeNormal = getMetallicFlakeNormalMap();
  const clearcoatNormal = getClearcoatPolishNormalMap();
  const isPearl = Boolean(options?.isPearl);
  return new THREE.MeshPhysicalMaterial({
    color,
    map: options?.map ?? null,
    metalness: isPearl ? 0.42 : 0.78,
    roughness: isPearl ? 0.1 : 0.12,
    clearcoat: 1.0,
    clearcoatRoughness: 0.028,
    clearcoatNormalMap: clearcoatNormal,
    clearcoatNormalScale: new THREE.Vector2(0.06, 0.06),
    normalMap: flakeNormal,
    normalScale: new THREE.Vector2(isPearl ? 0.06 : 0.1, isPearl ? 0.06 : 0.1),
    iridescence: isPearl ? 0.42 : 0.24,
    iridescenceIOR: 1.42,
    reflectivity: 1.0,
    envMapIntensity: 1.85,
  });
}

/** Real-life laminated automotive safety glass with crisp Fresnel reflection & clear interior view */
export function createAutomotiveGlassMaterial(opacity = 0.42): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: 0x0b1624,
    metalness: 0.12,
    roughness: 0.025,
    ior: 1.52,
    reflectivity: 0.98,
    clearcoat: 1.0,
    clearcoatRoughness: 0.02,
    envMapIntensity: 2.2,
    transparent: true,
    opacity,
    depthWrite: false,
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
    roughness: 0.22,
    clearcoat: 0.92,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1.2,
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

    // Thumb control pod on left & right spokes
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

    // Brushed aluminum paddle shifters on sport SUV & supercar
    if (!isLuxury) {
      const paddle = new THREE.Mesh(
        new THREE.BoxGeometry(0.022, 0.075, 0.008),
        chromeMat,
      );
      paddle.position.set(side * (r * 0.52), 0.025, -0.028);
      wheel.add(paddle);
    }
  });

  return wheel;
}
