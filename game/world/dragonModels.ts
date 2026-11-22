import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export type DragonVariant = 'ember' | 'storm' | 'shadow';

type DragonQuality = 'hero' | 'standard' | 'low';

interface DragonPalette {
  base: string;
  mid: string;
  ridge: string;
  shadow: string;
  sheen: string;
  membrane: string;
  vein: string;
  eyeCore: number;
  eyeGlow: number;
}

const PALETTES: Record<DragonVariant, DragonPalette> = {
  // Molten obsidian-red: deep crimson scales with hot copper ridges.
  ember: {
    base: '#5b1713',
    mid: '#8d2b1c',
    ridge: '#b9552d',
    shadow: '#240807',
    sheen: '#ffb27a',
    membrane: '#4a1411',
    vein: '#c06a3e',
    eyeCore: 0xffd27a,
    eyeGlow: 0xff7b1c,
  },
  // Storm indigo with cold blue-white rim light.
  storm: {
    base: '#1e2550',
    mid: '#39468c',
    ridge: '#6f83c9',
    shadow: '#0a0d22',
    sheen: '#c7d7ff',
    membrane: '#1b2145',
    vein: '#7d92d8',
    eyeCore: 0xd8f1ff,
    eyeGlow: 0x38bdf8,
  },
  // Shadow violet with green-black undertones.
  shadow: {
    base: '#2a1338',
    mid: '#4b2266',
    ridge: '#8b5cb8',
    shadow: '#100617',
    sheen: '#e7c9ff',
    membrane: '#24102f',
    vein: '#a06ad0',
    eyeCore: 0xf3d5ff,
    eyeGlow: 0xb34cff,
  },
};

interface DragonMaterials {
  body: THREE.MeshPhysicalMaterial;
  wing: THREE.MeshStandardMaterial;
  bone: THREE.MeshStandardMaterial;
  eye: THREE.MeshPhysicalMaterial;
  pupil: THREE.MeshStandardMaterial;
}

const materialCache = new Map<DragonVariant, DragonMaterials>();

function makeCanvas(width: number, height: number): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/** Deterministic pseudo-random so the scale pattern is stable between reloads. */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * Paints overlapping reptile scales. Each scale gets a shaded lower lip and a
 * specular top edge, which is what makes the skin read as layered keratin
 * rather than flat noise.
 */
function createScaleTexture(variant: DragonVariant): THREE.CanvasTexture | null {
  const canvas = makeCanvas(256, 256);
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const palette = PALETTES[variant];
  const rand = seeded(0x5eed ^ variant.charCodeAt(0) * 977);

  ctx.fillStyle = palette.base;
  ctx.fillRect(0, 0, 256, 256);

  // Mottled leather underlayer.
  for (let i = 0; i < 260; i++) {
    const x = rand() * 256;
    const y = rand() * 256;
    const r = 4 + rand() * 22;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, i % 2 === 0 ? palette.mid : palette.shadow);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.16 + rand() * 0.2;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Rows of overlapping scales, staggered every other row.
  const scaleW = 15;
  const scaleH = 12;
  for (let row = -1; row < 24; row++) {
    const offset = (row & 1) === 0 ? 0 : scaleW * 0.5;
    for (let col = -1; col < 20; col++) {
      const cx = col * scaleW + offset + scaleW * 0.5;
      const cy = row * scaleH + scaleH * 0.5;
      const r = scaleW * (0.48 + rand() * 0.1);
      const lighter = rand() < 0.26;

      // Scale body.
      const grad = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
      grad.addColorStop(0, lighter ? palette.ridge : palette.mid);
      grad.addColorStop(0.62, palette.base);
      grad.addColorStop(1, palette.shadow);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(cx, cy, r, r * 0.78, 0, Math.PI, 0, true);
      ctx.lineTo(cx + r, cy + r * 0.42);
      ctx.quadraticCurveTo(cx, cy + r * 1.1, cx - r, cy + r * 0.42);
      ctx.closePath();
      ctx.fill();

      // Dark separation groove.
      ctx.strokeStyle = palette.shadow;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 1.1;
      ctx.stroke();

      // Lit upper rim.
      ctx.globalAlpha = 0.32 + rand() * 0.3;
      ctx.strokeStyle = lighter ? palette.sheen : palette.ridge;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.ellipse(cx, cy, r * 0.92, r * 0.7, 0, Math.PI * 1.08, Math.PI * 1.92);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  // Fine pore grain.
  for (let i = 0; i < 1400; i++) {
    ctx.fillStyle = rand() > 0.5 ? palette.shadow : palette.ridge;
    ctx.globalAlpha = 0.08 + rand() * 0.1;
    const s = 0.6 + rand() * 1.2;
    ctx.fillRect(rand() * 256, rand() * 256, s, s);
  }
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Grayscale companion map: lit scale crowns raised, grooves recessed. */
function createScaleBumpTexture(variant: DragonVariant): THREE.CanvasTexture | null {
  const canvas = makeCanvas(256, 256);
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#6a6a6a';
  ctx.fillRect(0, 0, 256, 256);
  const rand = seeded(0xbeef ^ variant.charCodeAt(1) * 613);
  const scaleW = 15;
  const scaleH = 12;
  for (let row = -1; row < 24; row++) {
    const offset = (row & 1) === 0 ? 0 : scaleW * 0.5;
    for (let col = -1; col < 20; col++) {
      const cx = col * scaleW + offset + scaleW * 0.5;
      const cy = row * scaleH + scaleH * 0.5;
      const r = scaleW * (0.48 + rand() * 0.1);
      const grad = ctx.createRadialGradient(cx, cy - r * 0.4, 0.5, cx, cy, r);
      grad.addColorStop(0, '#e8e8e8');
      grad.addColorStop(0.7, '#a0a0a0');
      grad.addColorStop(1, '#2a2a2a');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(cx, cy, r, r * 0.8, 0, Math.PI, 0, true);
      ctx.lineTo(cx + r, cy + r * 0.42);
      ctx.quadraticCurveTo(cx, cy + r * 1.1, cx - r, cy + r * 0.42);
      ctx.closePath();
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

/** Semi-translucent wing membrane: branching veins, bruising and a lit edge. */
function createWingTexture(variant: DragonVariant): THREE.CanvasTexture | null {
  const canvas = makeCanvas(256, 128);
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const palette = PALETTES[variant];
  const rand = seeded(0x1eaf ^ variant.charCodeAt(2) * 389);

  const grad = ctx.createLinearGradient(0, 0, 256, 128);
  grad.addColorStop(0, palette.mid);
  grad.addColorStop(0.55, palette.membrane);
  grad.addColorStop(1, palette.shadow);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 128);

  // Warm backlight bleeding through the thinner outer membrane.
  const light = ctx.createRadialGradient(210, 64, 4, 210, 64, 96);
  light.addColorStop(0, palette.vein);
  light.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, 256, 128);
  ctx.globalAlpha = 1;

  // Bruise mottling.
  for (let i = 0; i < 90; i++) {
    const x = rand() * 256;
    const y = rand() * 128;
    const r = 3 + rand() * 16;
    const g2 = ctx.createRadialGradient(x, y, 0, x, y, r);
    g2.addColorStop(0, rand() > 0.5 ? palette.mid : palette.shadow);
    g2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = g2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Vein network branching from the shoulder toward the finger tips.
  const drawVein = (x: number, y: number, angle: number, len: number, width: number, depth: number) => {
    if (depth <= 0 || len < 3) return;
    const x2 = x + Math.cos(angle) * len;
    const y2 = y + Math.sin(angle) * len;
    ctx.strokeStyle = palette.vein;
    ctx.globalAlpha = 0.3 + depth * 0.12;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(
      (x + x2) * 0.5 + (rand() - 0.5) * 3,
      (y + y2) * 0.5 + (rand() - 0.5) * 3,
      x2,
      y2,
    );
    ctx.stroke();
    drawVein(x2, y2, angle - 0.34 - rand() * 0.25, len * 0.62, width * 0.66, depth - 1);
    drawVein(x2, y2, angle + 0.3 + rand() * 0.25, len * 0.58, width * 0.62, depth - 1);
  };
  for (let i = 0; i < 5; i++) {
    drawVein(6, 18 + i * 22, -0.15 + i * 0.1, 58 + rand() * 26, 1.9, 5);
  }
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function getDragonMaterials(variant: DragonVariant): DragonMaterials {
  const cached = materialCache.get(variant);
  if (cached) return cached;
  const palette = PALETTES[variant];
  const scaleMap = createScaleTexture(variant);
  const bumpMap = createScaleBumpTexture(variant);
  const wingMap = createWingTexture(variant);

  const bodyParams: THREE.MeshPhysicalMaterialParameters = {
    color: 0xffffff,
    bumpScale: 0.09,
    roughness: 0.5,
    metalness: 0.08,
    clearcoat: 0.26,
    clearcoatRoughness: 0.52,
    sheen: 0.45,
    sheenColor: new THREE.Color(palette.sheen),
    sheenRoughness: 0.72,
    envMapIntensity: 1.15,
    side: THREE.FrontSide,
  };
  if (scaleMap) bodyParams.map = scaleMap;
  if (bumpMap) bodyParams.bumpMap = bumpMap;
  const body = new THREE.MeshPhysicalMaterial(bodyParams);
  if (!scaleMap) body.color.set(palette.mid);

  const wingParams: THREE.MeshStandardMaterialParameters = {
    color: 0xffffff,
    roughness: 0.68,
    metalness: 0.02,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.95,
    depthWrite: true,
    envMapIntensity: 0.8,
  };
  if (wingMap) wingParams.map = wingMap;
  const wing = new THREE.MeshStandardMaterial(wingParams);
  if (!wingMap) wing.color.set(palette.membrane);

  const bone = new THREE.MeshStandardMaterial({
    color: variant === 'storm' ? 0xd9e6ff : 0xdcc9a4,
    roughness: 0.58,
    metalness: 0.04,
  });
  const eye = new THREE.MeshPhysicalMaterial({
    color: palette.eyeCore,
    emissive: palette.eyeGlow,
    emissiveIntensity: 1.7,
    roughness: 0.14,
    metalness: 0.05,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
  });
  const pupil = new THREE.MeshStandardMaterial({
    color: 0x050505,
    roughness: 0.3,
    metalness: 0.1,
  });

  const materials = { body, wing, bone, eye, pupil };
  // These are cached and shared by every dragon of this variant, including
  // static-merged meshes. World disposal must not free them.
  for (const material of Object.values(materials)) {
    material.userData.sharedDragon = true;
  }
  materialCache.set(variant, materials);
  return materials;
}

function ellipsoidGeo(
  rx: number,
  ry: number,
  rz: number,
  segments: number,
  rings: number,
): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(1, segments, rings);
  geo.scale(rx, ry, rz);
  return geo;
}

function coneGeo(radius: number, height: number, segments: number): THREE.BufferGeometry {
  return new THREE.ConeGeometry(radius, height, segments);
}

function transformed(
  geo: THREE.BufferGeometry,
  pos: [number, number, number],
  rot: [number, number, number] = [0, 0, 0],
  scale: [number, number, number] = [1, 1, 1],
): THREE.BufferGeometry {
  const matrix = new THREE.Matrix4().compose(
    new THREE.Vector3(pos[0], pos[1], pos[2]),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2])),
    new THREE.Vector3(scale[0], scale[1], scale[2]),
  );
  geo.applyMatrix4(matrix);
  return geo;
}

function mergeOrKeep(geos: THREE.BufferGeometry[]): THREE.BufferGeometry | null {
  if (geos.length === 0) return null;
  if (geos.length === 1) return geos[0];
  const merged = mergeGeometries(geos, false);
  for (const geo of geos) geo.dispose();
  return merged;
}

/**
 * A swept membrane with a scalloped trailing edge. The wing is authored in the
 * XY plane (+X span) so a mirrored copy can be flipped cleanly for the left wing.
 */
function buildWingMembraneGeometry(mirror: boolean): THREE.BufferGeometry {
  const rim: [number, number, number][] = [
    [0.55, 0.12, 0.3],
    [1.55, 0.24, 0.08],
    [2.6, 0.22, -0.16],
    [3.78, 0.03, -0.62],
    [3.32, -0.02, -1.0],
    [2.86, -0.05, -1.34],
    [2.34, -0.05, -1.06],
    [1.84, -0.06, -1.35],
    [1.24, -0.04, -1.0],
    [0.62, -0.02, -0.72],
  ];
  const positions: number[] = [];
  const uvs: number[] = [];
  const root: [number, number, number] = [0, 0, 0];
  for (let i = 0; i < rim.length - 1; i++) {
    const a = rim[i];
    const b = rim[i + 1];
    positions.push(...root, ...a, ...b);
    const uv = (p: [number, number, number]): [number, number] => [
      Math.abs(p[0]) / 4,
      0.5 - p[2] / 2.6,
    ];
    const ua = uv(a);
    const ub = uv(b);
    uvs.push(0.5, 0.5, ua[0], ua[1], ub[0], ub[1]);
  }
  const geo = new THREE.BufferGeometry();
  if (mirror) {
    for (let i = 0; i < positions.length; i += 9) {
      [positions[i], positions[i + 3], positions[i + 6]] = [
        -positions[i + 6],
        -positions[i + 3],
        -positions[i],
      ];
    }
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  return geo;
}

function buildWingGroup(
  materials: DragonMaterials,
  mirror: boolean,
  folded: boolean,
  detailSegments: number,
): THREE.Group {
  const group = new THREE.Group();
  const sign = mirror ? -1 : 1;
  const membrane = new THREE.Mesh(buildWingMembraneGeometry(mirror), materials.wing);
  group.add(membrane);

  const strutGeos: THREE.BufferGeometry[] = [];
  const strut = (x1: number, z1: number, x2: number, z2: number, radius: number) => {
    const from = new THREE.Vector3(x1 * sign, 0, z1);
    const to = new THREE.Vector3(x2 * sign, 0, z2);
    const dir = new THREE.Vector3().subVectors(to, from);
    const len = dir.length();
    const geo = new THREE.CylinderGeometry(radius * 0.62, radius, len, detailSegments, 1);
    const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
    const quat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.normalize(),
    );
    geo.applyMatrix4(
      new THREE.Matrix4().compose(mid, quat, new THREE.Vector3(1, 1, 1)),
    );
    strutGeos.push(geo);
  };
  strut(0, 0.22, 3.7, -0.6, 0.055);
  strut(0, 0.05, 2.9, -1.3, 0.045);
  strut(0, -0.08, 1.9, -1.32, 0.038);
  strut(0, -0.16, 0.9, -0.95, 0.032);
  strut(0, 0.1, 2.6, -0.1, 0.07);

  const struts = mergeOrKeep(strutGeos);
  if (struts) group.add(new THREE.Mesh(struts, materials.bone));

  const claw = new THREE.Mesh(
    transformed(coneGeo(0.05, 0.24, 6), [3.72 * sign, 0.02, -0.66], [0, 0, sign * 1.2]),
    materials.bone,
  );
  group.add(claw);

  if (folded) {
    group.rotation.set(0.08, sign * 1.18, sign * 0.88);
    group.scale.setScalar(0.94);
  }
  return group;
}

export interface RealisticDragonOptions {
  variant: DragonVariant;
  quality?: DragonQuality;
  folded?: boolean;
  /** Bigger head/torso silhouette, used for the valley centerpiece. */
  heroic?: boolean;
}

export interface RealisticDragon {
  group: THREE.Group;
  wingL: THREE.Group;
  wingR: THREE.Group;
  /** Body height from foot to brow at scale 1, useful for grounding roosts. */
  standingHeight: number;
}

export function createRealisticDragon(options: RealisticDragonOptions): RealisticDragon {
  const variant = options.variant;
  const quality = options.quality ?? 'standard';
  const folded = options.folded ?? false;
  const heroic = options.heroic ?? false;
  const materials = getDragonMaterials(variant);

  const seg = quality === 'hero' ? 22 : quality === 'standard' ? 16 : 12;
  const rings = quality === 'hero' ? 16 : quality === 'standard' ? 11 : 8;
  const tailSegs = quality === 'hero' ? 13 : quality === 'standard' ? 10 : 7;
  const group = new THREE.Group();

  const bodyParts: THREE.BufferGeometry[] = [];
  const boneParts: THREE.BufferGeometry[] = [];
  const bodyScale = heroic ? 1.16 : 1;

  // Torso: chest and hips as overlapping volumes so the silhouette is animal,
  // not a capsule.
  bodyParts.push(
    transformed(ellipsoidGeo(0.82 * bodyScale, 0.88 * bodyScale, 1.9 * bodyScale, seg, rings), [0, 1.32, 0.02]),
    transformed(ellipsoidGeo(0.88 * bodyScale, 0.92 * bodyScale, 0.95 * bodyScale, seg, rings), [0, 1.36, 0.92]),
    transformed(ellipsoidGeo(0.7 * bodyScale, 0.76 * bodyScale, 1.0 * bodyScale, seg, rings), [0, 1.26, -1.42]),
    transformed(ellipsoidGeo(0.62 * bodyScale, 0.5 * bodyScale, 0.82 * bodyScale, seg, rings), [0, 0.82, 0.15], [0.12, 0, 0]),
  );

  // Neck follows a real arch from shoulders to skull.
  const neckCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 1.58, 1.52),
    new THREE.Vector3(0, 2.18, 2.2),
    new THREE.Vector3(0, 2.74, 2.8),
    new THREE.Vector3(0, 3.16, 3.34),
  ]);
  const neckSteps = quality === 'low' ? 4 : 6;
  for (let i = 0; i <= neckSteps; i++) {
    const t = i / neckSteps;
    const p = neckCurve.getPoint(t);
    const r = THREE.MathUtils.lerp(0.52, 0.34, t) * bodyScale;
    bodyParts.push(
      transformed(
        ellipsoidGeo(r, r * 0.96, r * 1.24, seg, rings),
        [p.x, p.y, p.z],
        [0, 0, 0],
      ),
    );
  }

  const headY = 3.34;
  const headZ = 3.92;
  // Skull, muzzle, lower jaw.
  bodyParts.push(
    transformed(ellipsoidGeo(0.44, 0.4, 0.58, seg, rings), [0, headY, headZ]),
    transformed(ellipsoidGeo(0.32, 0.26, 0.52, seg, rings), [0, headY - 0.08, headZ + 0.62]),
    transformed(ellipsoidGeo(0.26, 0.11, 0.4, seg, rings), [0, headY - 0.22, headZ + 0.52], [0.1, 0, 0]),
    // Brow ridges.
    transformed(ellipsoidGeo(0.16, 0.09, 0.24, 12, 8), [-0.27, headY + 0.18, headZ + 0.22], [0, 0, -0.24]),
    transformed(ellipsoidGeo(0.16, 0.09, 0.24, 12, 8), [0.27, headY + 0.18, headZ + 0.22], [0, 0, 0.24]),
    // Cheek armor.
    transformed(ellipsoidGeo(0.2, 0.12, 0.3, 12, 8), [-0.33, headY - 0.08, headZ + 0.12], [0, 0.2, -0.3]),
    transformed(ellipsoidGeo(0.2, 0.12, 0.3, 12, 8), [0.33, headY - 0.08, headZ + 0.12], [0, -0.2, 0.3]),
  );

  // Swept horns: two segments each give a curve rather than a spike.
  for (const side of [-1, 1] as const) {
    boneParts.push(
      transformed(coneGeo(0.105, 0.62, 8), [side * 0.3, headY + 0.32, headZ - 0.18], [-0.95, 0, side * 0.3]),
      transformed(coneGeo(0.075, 0.52, 8), [side * 0.4, headY + 0.58, headZ - 0.52], [-1.28, 0, side * 0.5]),
      // Cheek/back spikes.
      transformed(coneGeo(0.06, 0.38, 6), [side * 0.42, headY - 0.12, headZ - 0.22], [-1.9, 0, side * 0.8]),
      transformed(coneGeo(0.045, 0.26, 6), [side * 0.4, headY - 0.28, headZ + 0.08], [0, 0, side * 1.45]),
    );
  }

  // Teeth along both jaws.
  for (let i = 0; i < 7; i++) {
    const z = headZ + 0.34 + i * 0.075;
    const spread = 0.2 - i * 0.014;
    for (const side of [-1, 1] as const) {
      boneParts.push(
        transformed(coneGeo(0.022, 0.13, 5), [side * spread, headY - 0.24, z], [Math.PI, 0, 0]),
        transformed(coneGeo(0.016, 0.1, 5), [side * (spread - 0.02), headY - 0.26, z - 0.02], [0, 0, 0]),
      );
    }
  }

  // Nostrils.
  const nostrilMaterial = materials.pupil;
  for (const side of [-1, 1] as const) {
    const nostril = new THREE.Mesh(
      transformed(ellipsoidGeo(0.045, 0.03, 0.05, 8, 6), [side * 0.12, headY - 0.02, headZ + 1.12]),
      nostrilMaterial,
    );
    group.add(nostril);
  }

  // Dorsal spine plates run from the shoulders to the tail tip.
  const spinePlates = quality === 'low' ? 10 : 16;
  for (let i = 0; i < spinePlates; i++) {
    const t = i / (spinePlates - 1);
    const z = THREE.MathUtils.lerp(1.75, -6.9, t);
    const y = THREE.MathUtils.lerp(2.2, 0.72, Math.pow(t, 1.35));
    const h = THREE.MathUtils.lerp(0.46, 0.12, t);
    bodyParts.push(
      transformed(coneGeo(h * 0.22, h, 5), [0, y, z], [-0.22 - t * 0.5, 0, 0]),
    );
  }

  // Tapered, drooping tail on a curve.
  const tailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 1.22, -2.0),
    new THREE.Vector3(0, 1.02, -3.35),
    new THREE.Vector3(0, 0.72, -4.75),
    new THREE.Vector3(0, 0.38, -6.25),
    new THREE.Vector3(0, 0.12, -7.25),
  ]);
  for (let i = 0; i <= tailSegs; i++) {
    const t = i / tailSegs;
    const p = tailCurve.getPoint(t);
    const r = THREE.MathUtils.lerp(0.52, 0.075, Math.pow(t, 0.85));
    bodyParts.push(
      transformed(ellipsoidGeo(r, r * 0.94, r * 1.5, seg, rings), [p.x, p.y, p.z]),
    );
  }
  // Tail blade.
  bodyParts.push(
    transformed(coneGeo(0.52, 1.55, 5), [0, 0.05, -7.7], [-Math.PI * 0.5, 0, 0], [1, 1, 0.16]),
  );

  // Legs: anatomical thigh/shin/foot with claws. In flight the legs tuck up.
  const legFrontZ = 1.05;
  const legRearZ = -1.28;
  for (const side of [-1, 1] as const) {
    for (const [legZ, rear] of [
      [legFrontZ, false],
      [legRearZ, true],
    ] as const) {
      const thighY = folded ? 1.05 : 0.98;
      const shinY = folded ? 0.82 : 0.54;
      const footY = folded ? 0.68 : 0.16;
      const shinTilt = folded ? 1.25 : 0.18;
      bodyParts.push(
        transformed(
          ellipsoidGeo(0.27, 0.36, 0.46, quality === 'low' ? 10 : 14, 9),
          [side * (rear ? 0.6 : 0.56), thighY, legZ],
          [rear ? -0.25 : 0.2, 0, side * 0.18],
        ),
        transformed(
          new THREE.CylinderGeometry(0.1, 0.15, 0.72, 8),
          [side * 0.62, shinY, legZ + (folded ? -0.18 : 0.04)],
          [shinTilt, 0, 0],
        ),
        transformed(
          ellipsoidGeo(0.18, 0.08, 0.32, 10, 7),
          [side * 0.63, footY, legZ + (folded ? -0.42 : 0.24)],
        ),
      );
      for (let claw = -1; claw <= 1; claw++) {
        boneParts.push(
          transformed(
            coneGeo(0.035, 0.2, 5),
            [side * 0.63 + claw * 0.09, footY - 0.05, legZ + (folded ? -0.66 : 0.46)],
            [-Math.PI * 0.5, 0, 0],
          ),
        );
      }
    }
  }

  // Body shell.
  const bodyGeo = mergeOrKeep(bodyParts);
  if (bodyGeo) {
    const bodyMesh = new THREE.Mesh(bodyGeo, materials.body);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    group.add(bodyMesh);
  }
  const boneGeo = mergeOrKeep(boneParts);
  if (boneGeo) {
    const boneMesh = new THREE.Mesh(boneGeo, materials.bone);
    boneMesh.castShadow = true;
    group.add(boneMesh);
  }

  // Eyes with vertical slit pupils.
  for (const side of [-1, 1] as const) {
    const eye = new THREE.Mesh(
      transformed(ellipsoidGeo(0.085, 0.085, 0.075, 12, 10), [side * 0.29, headY + 0.06, headZ + 0.4]),
      materials.eye,
    );
    group.add(eye);
    const pupil = new THREE.Mesh(
      transformed(ellipsoidGeo(0.022, 0.062, 0.02, 8, 8), [side * 0.335, headY + 0.06, headZ + 0.44]),
      materials.pupil,
    );
    group.add(pupil);
  }

  const wingL = buildWingGroup(materials, true, folded, quality === 'low' ? 6 : 8);
  wingL.position.set(-0.5, 1.86, 0.42);
  const wingR = buildWingGroup(materials, false, folded, quality === 'low' ? 6 : 8);
  wingR.position.set(0.5, 1.86, 0.42);
  group.add(wingL, wingR);

  group.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  return {
    group,
    wingL,
    wingR,
    standingHeight: 4.1,
  };
}

/** Frees generated textures/materials if the world is disposed. */
export function disposeDragonModelAssets(): void {
  for (const materials of materialCache.values()) {
    materials.body.map?.dispose();
    materials.body.bumpMap?.dispose();
    materials.wing.map?.dispose();
    materials.body.dispose();
    materials.wing.dispose();
    materials.bone.dispose();
    materials.eye.dispose();
    materials.pupil.dispose();
  }
  materialCache.clear();
}
