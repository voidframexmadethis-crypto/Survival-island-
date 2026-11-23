import * as THREE from 'three';
import {
  FERRY_BOW_Z,
  FERRY_CABIN_FRONT_Z,
  FERRY_CABIN_ROOF_Y,
  FERRY_CABIN_Z,
  FERRY_DECK_Y,
  FERRY_HALF_WIDTH,
  FERRY_RAMP,
  FERRY_ROOT_Y,
  FERRY_ROOMS,
  FERRY_STERN_Z,
  LOUISIANA_FERRY_DOCK_POS,
} from '../systems/louisianaFerryVoyage';

export interface LouisianaFerryHandles {
  root: THREE.Group;
  gate: THREE.Group;
  tvScreenMat: THREE.MeshStandardMaterial;
  deckY: number;
  rooms: typeof FERRY_ROOMS;
}

function makeCanvasTexture(
  draw: (ctx: CanvasRenderingContext2D) => void,
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) draw(ctx);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * The rideable Crescent Star. Built in local boat space; the voyage system
 * moves the root and supplies the matching walkable-surface queries.
 */
export function buildLouisianaFerry(): LouisianaFerryHandles {
  const root = new THREE.Group();
  root.name = 'louisiana-ferry';
  root.position.set(LOUISIANA_FERRY_DOCK_POS.x, FERRY_ROOT_Y, LOUISIANA_FERRY_DOCK_POS.z);

  const hullMat = new THREE.MeshStandardMaterial({ color: 0x123f3b, roughness: 0.62 });
  const hullDarkMat = new THREE.MeshStandardMaterial({ color: 0x0b2b29, roughness: 0.85 });
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xf5b642, roughness: 0.52 });
  const deckMat = new THREE.MeshStandardMaterial({ color: 0x8b5e3c, roughness: 0.9 });
  const deckSeamMat = new THREE.MeshStandardMaterial({ color: 0x4b3322, roughness: 0.96 });
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xf0eadf, roughness: 0.78 });
  const wallTrimMat = new THREE.MeshStandardMaterial({ color: 0x2c5a54, roughness: 0.7 });
  const ceilingMat = new THREE.MeshStandardMaterial({ color: 0xe9e4d8, roughness: 0.86 });
  const windowMat = new THREE.MeshStandardMaterial({
    color: 0x0b2338,
    emissive: 0x1d6d92,
    emissiveIntensity: 0.3,
    roughness: 0.18,
    metalness: 0.4,
  });
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.42,
    metalness: 0.6,
  });
  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xd8a33a,
    roughness: 0.34,
    metalness: 0.7,
  });
  const sofaMat = new THREE.MeshStandardMaterial({ color: 0x2f6f69, roughness: 0.94 });
  const cushionMat = new THREE.MeshStandardMaterial({ color: 0xd9a441, roughness: 0.92 });
  const bedMat = new THREE.MeshStandardMaterial({ color: 0xd7e2eb, roughness: 0.92 });
  const blanketMat = new THREE.MeshStandardMaterial({ color: 0x3f7f8c, roughness: 0.9 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x7b4f31, roughness: 0.85 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.36 });
  const porcelainMat = new THREE.MeshStandardMaterial({ color: 0xeef2f4, roughness: 0.2 });
  const frostedMat = new THREE.MeshStandardMaterial({
    color: 0xbfe8ef,
    transparent: true,
    opacity: 0.42,
    roughness: 0.15,
  });
  const rugMat = new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.98 });
  const plantMat = new THREE.MeshStandardMaterial({ color: 0x2f7d3a, roughness: 0.9 });
  const potMat = new THREE.MeshStandardMaterial({ color: 0xa35a34, roughness: 0.82 });
  const lampMat = new THREE.MeshStandardMaterial({
    color: 0xffe8b0,
    emissive: 0xffd27a,
    emissiveIntensity: 1.15,
    roughness: 0.5,
  });
  const screenMat = new THREE.MeshStandardMaterial({
    color: 0x071523,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.8,
    roughness: 0.22,
  });
  const lifeRingMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.72 });
  const warningMat = new THREE.MeshStandardMaterial({
    color: 0xf5b642,
    emissive: 0x8a5a00,
    emissiveIntensity: 0.22,
    roughness: 0.62,
  });
  const nameTexture = makeCanvasTexture((ctx) => {
    ctx.clearRect(0, 0, 512, 256);
    ctx.fillStyle = '#0b2b29';
    ctx.fillRect(0, 0, 512, 256);
    ctx.strokeStyle = '#f5b642';
    ctx.lineWidth = 10;
    ctx.strokeRect(10, 10, 492, 236);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 72px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('CRESCENT', 256, 108);
    ctx.fillText('STAR', 256, 190);
    ctx.fillStyle = '#f5b642';
    ctx.font = 'bold 24px Arial, sans-serif';
    ctx.fillText('ISLAND  ·  LOUISIANA  ·  18 DAYS', 256, 232);
  });
  const nameMat = new THREE.MeshStandardMaterial({
    color: nameTexture ? 0xffffff : 0x123f3b,
    ...(nameTexture ? { map: nameTexture } : {}),
    roughness: 0.74,
  });

  const addBox = (
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material,
    parent: THREE.Object3D = root,
  ): THREE.Mesh => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  // ---- Hull and boarding ramp -------------------------------------------
  addBox(FERRY_HALF_WIDTH * 2 + 0.2, 1.35, 35.1, 0, 0.83, -0.1, hullMat);
  addBox(FERRY_HALF_WIDTH * 2 + 0.32, 0.2, 35.3, 0, 1.13, -0.1, stripeMat);
  addBox(FERRY_HALF_WIDTH * 2 + 0.12, 1.1, 8, 0, 0.54, 19.8, hullDarkMat);
  const bow = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, FERRY_HALF_WIDTH + 0.1, 6.4, 4, 1, false),
    hullMat,
  );
  bow.rotation.x = Math.PI / 2;
  bow.rotation.y = Math.PI / 4;
  bow.position.set(0, 0.83, 20.2);
  bow.castShadow = true;
  root.add(bow);

  addBox(FERRY_HALF_WIDTH * 2 - 0.3, 0.16, 35.6, 0, FERRY_DECK_Y - 0.08, -0.2, deckMat);
  for (let i = 0; i < 15; i++) {
    addBox(8.8, 0.018, 0.06, 0, FERRY_DECK_Y + 0.012, -16.4 + i * 2.25, deckSeamMat);
  }

  const rampLength = FERRY_RAMP.zFar - FERRY_RAMP.zNear;
  const rampRise = FERRY_RAMP.yFar - FERRY_RAMP.yNear;
  const ramp = addBox(
    FERRY_RAMP.halfWidth * 2,
    0.16,
    Math.hypot(rampLength, rampRise),
    0,
    (FERRY_RAMP.yNear + FERRY_RAMP.yFar) / 2 - 0.08,
    (FERRY_RAMP.zNear + FERRY_RAMP.zFar) / 2,
    steelMat,
  );
  ramp.rotation.x = Math.atan2(rampRise, Math.abs(rampLength));
  addBox(0.12, 0.9, rampLength, -FERRY_RAMP.halfWidth, 1.25, -19.6, steelMat);
  addBox(0.12, 0.9, rampLength, FERRY_RAMP.halfWidth, 1.25, -19.6, steelMat);

  // Stern boarding gate. Hidden once the dock TV clears boarding.
  const gate = new THREE.Group();
  gate.position.set(0, FERRY_DECK_Y, FERRY_STERN_Z + 0.6);
  addBox(5.0, 1.25, 0.08, 0, 0.65, 0, warningMat, gate);
  addBox(5.1, 0.08, 0.12, 0, 1.3, 0, steelMat, gate);
  for (let i = -2; i <= 2; i++) {
    addBox(0.09, 1.22, 0.1, i * 1.1, 0.65, 0.01, steelMat, gate);
  }
  root.add(gate);

  // ---- Cabin shell -------------------------------------------------------
  addBox(FERRY_HALF_WIDTH * 2, 0.22, FERRY_CABIN_FRONT_Z - FERRY_CABIN_Z, 0, FERRY_DECK_Y + 0.02, (FERRY_CABIN_Z + FERRY_CABIN_FRONT_Z) / 2, deckMat);
  addBox(FERRY_HALF_WIDTH * 2, 0.18, FERRY_CABIN_FRONT_Z - FERRY_CABIN_Z, 0, FERRY_CABIN_ROOF_Y, (FERRY_CABIN_Z + FERRY_CABIN_FRONT_Z) / 2, ceilingMat);
  for (const side of [-1, 1]) {
    addBox(0.22, 2.75, FERRY_CABIN_FRONT_Z - FERRY_CABIN_Z, side * FERRY_HALF_WIDTH, FERRY_DECK_Y + 1.37, (FERRY_CABIN_Z + FERRY_CABIN_FRONT_Z) / 2, wallMat);
    addBox(0.14, 0.24, FERRY_CABIN_FRONT_Z - FERRY_CABIN_Z, side * (FERRY_HALF_WIDTH + 0.05), FERRY_DECK_Y + 0.32, (FERRY_CABIN_Z + FERRY_CABIN_FRONT_Z) / 2, wallTrimMat);
    addBox(0.15, 0.18, FERRY_CABIN_FRONT_Z - FERRY_CABIN_Z, side * (FERRY_HALF_WIDTH + 0.05), 3.85, (FERRY_CABIN_Z + FERRY_CABIN_FRONT_Z) / 2, wallTrimMat);
  }
  addBox(FERRY_HALF_WIDTH * 2, 2.75, 0.22, 0, FERRY_DECK_Y + 1.37, FERRY_CABIN_FRONT_Z, wallMat);
  addBox(FERRY_HALF_WIDTH * 2, 0.24, 0.15, 0, FERRY_DECK_Y + 0.32, FERRY_CABIN_FRONT_Z - 0.05, wallTrimMat);
  // Open living-room doorway at the stern end of the cabin.
  addBox(3.2, 2.75, 0.22, -2.9, FERRY_DECK_Y + 1.37, FERRY_CABIN_Z, wallMat);
  addBox(3.2, 2.75, 0.22, 2.9, FERRY_DECK_Y + 1.37, FERRY_CABIN_Z, wallMat);
  addBox(2.6, 0.55, 0.24, 0, 3.88, FERRY_CABIN_Z, wallMat);

  // Side windows.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 8; i++) {
      addBox(0.06, 0.88, 1.45, side * (FERRY_HALF_WIDTH + 0.01), 2.75, -1.8 + i * 2.05, windowMat);
    }
  }
  // Bow-facing wheelhouse windows.
  for (let i = -2; i <= 2; i++) {
    addBox(1.0, 0.78, 0.06, i * 1.35, 2.8, FERRY_CABIN_FRONT_Z + 0.01, windowMat);
  }

  // ---- Living room -------------------------------------------------------
  // Room divider, leaving a doorway at x = -0.3..1.3.
  addBox(3.4, 2.75, 0.18, -2.75, FERRY_DECK_Y + 1.37, 4.4, wallMat);
  addBox(3.4, 2.75, 0.18, 2.75, FERRY_DECK_Y + 1.37, 4.4, wallMat);
  addBox(1.6, 0.55, 0.2, 0.5, 3.9, 4.4, wallMat);
  addBox(1.2, 2.75, 0.18, 0.5, FERRY_DECK_Y + 1.37, 4.4, wallTrimMat);

  // Rug and seating cluster.
  const rug = addBox(6.6, 0.035, 4.5, 0, FERRY_DECK_Y + 0.12, 0.2, rugMat);
  rug.receiveShadow = true;
  addBox(2.7, 0.42, 1.25, 1.15, FERRY_DECK_Y + 0.3, -1.9, sofaMat);
  addBox(2.7, 0.85, 0.32, 1.15, FERRY_DECK_Y + 0.72, -2.42, sofaMat);
  addBox(0.32, 0.55, 1.2, 2.38, FERRY_DECK_Y + 0.45, -1.9, sofaMat);
  addBox(0.32, 0.55, 1.2, -0.08, FERRY_DECK_Y + 0.45, -1.9, sofaMat);
  addBox(0.95, 0.16, 0.95, 2.3, FERRY_DECK_Y + 0.52, -1.9, cushionMat);
  addBox(1.9, 0.32, 0.88, 0, FERRY_DECK_Y + 0.42, 0.35, woodMat);
  addBox(0.42, 0.5, 0.42, -1.55, FERRY_DECK_Y + 0.5, 0.35, woodMat);
  addBox(0.42, 0.5, 0.42, 1.55, FERRY_DECK_Y + 0.5, 0.35, woodMat);
  // TV and cabinet on the port wall.
  addBox(0.22, 1.05, 2.25, -4.34, 2.8, 0.3, woodMat);
  const livingTv = addBox(0.1, 0.82, 1.75, -4.19, 2.82, 0.3, screenMat);
  livingTv.userData.noShadowCast = true;
  addBox(0.32, 0.48, 2.6, -4.1, FERRY_DECK_Y + 0.25, 0.3, woodMat);
  // Plant in the sunny aft corner.
  addBox(0.55, 0.6, 0.55, 3.5, FERRY_DECK_Y + 0.34, -3.0, potMat);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.4, 6), plantMat);
  stem.position.set(3.5, FERRY_DECK_Y + 1.3, -3.0);
  root.add(stem);
  for (let i = 0; i < 7; i++) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.24, 7, 5), plantMat);
    const a = (i / 7) * Math.PI * 2;
    leaf.position.set(3.5 + Math.cos(a) * 0.34, FERRY_DECK_Y + 1.65 + (i % 3) * 0.24, -3.0 + Math.sin(a) * 0.34);
    leaf.scale.set(1.5, 0.55, 1);
    root.add(leaf);
  }
  // Ceiling light over the lounge.
  addBox(1.3, 0.08, 1.3, 0.4, FERRY_CABIN_ROOF_Y - 0.1, 0.2, lampMat);

  // ---- Bedroom -----------------------------------------------------------
  // Bathroom partition with a real doorway at z = 6.4..8.1.
  addBox(0.18, 2.75, 2.0, 0.75, FERRY_DECK_Y + 1.37, 5.4, wallMat);
  addBox(0.18, 2.75, 4.1, 0.75, FERRY_DECK_Y + 1.37, 10.05, wallMat);
  addBox(0.18, 0.55, 1.7, 0.75, 3.98, 7.25, wallTrimMat);
  addBox(0.2, 0.18, 1.7, 0.75, FERRY_DECK_Y + 0.05, 7.25, wallTrimMat);
  addBox(0.2, 2.2, 0.12, 0.75, FERRY_DECK_Y + 1.1, 6.4, wallTrimMat);
  addBox(0.2, 2.2, 0.12, 0.75, FERRY_DECK_Y + 1.1, 8.1, wallTrimMat);

  addBox(2.8, 0.3, 4.0, -2.15, FERRY_DECK_Y + 0.38, 8.8, woodMat);
  addBox(2.55, 0.48, 3.75, -2.15, FERRY_DECK_Y + 0.72, 8.8, bedMat);
  addBox(2.55, 0.2, 2.3, -2.15, FERRY_DECK_Y + 0.96, 9.65, blanketMat);
  addBox(0.95, 0.24, 0.6, -2.75, FERRY_DECK_Y + 0.95, 7.25, whiteMat);
  addBox(0.95, 0.24, 0.6, -1.55, FERRY_DECK_Y + 0.95, 7.25, whiteMat);
  addBox(0.75, 0.75, 0.75, -3.45, FERRY_DECK_Y + 0.48, 8.1, woodMat);
  const bedsideLamp = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.42, 8), lampMat);
  bedsideLamp.position.set(-3.45, FERRY_DECK_Y + 1.08, 8.1);
  root.add(bedsideLamp);
  // Small writing desk and porthole.
  addBox(1.7, 0.18, 0.75, -2.7, FERRY_DECK_Y + 0.85, 11.1, woodMat);
  addBox(0.16, 0.85, 0.7, -1.95, FERRY_DECK_Y + 0.45, 11.1, woodMat);
  addBox(0.16, 0.85, 0.7, -3.45, FERRY_DECK_Y + 0.45, 11.1, woodMat);
  const porthole = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.09, 8, 18), brassMat);
  porthole.position.set(-4.62, 2.7, 9.4);
  porthole.rotation.y = Math.PI / 2;
  root.add(porthole);
  const portholeGlass = new THREE.Mesh(new THREE.CircleGeometry(0.4, 18), windowMat);
  portholeGlass.position.set(-4.56, 2.7, 9.4);
  portholeGlass.rotation.y = -Math.PI / 2;
  root.add(portholeGlass);

  // ---- Bathroom ----------------------------------------------------------
  addBox(0.2, 0.05, 7.7, 4.45, FERRY_DECK_Y + 0.03, 8.25, whiteMat);
  // Toilet.
  addBox(0.7, 0.38, 0.8, 2.7, FERRY_DECK_Y + 0.28, 6.3, porcelainMat);
  addBox(0.72, 0.82, 0.36, 2.7, FERRY_DECK_Y + 0.48, 5.85, porcelainMat);
  addBox(0.7, 0.12, 0.78, 2.7, FERRY_DECK_Y + 0.5, 6.28, whiteMat);
  // Sink and mirror.
  addBox(1.25, 0.25, 0.68, 3.55, FERRY_DECK_Y + 0.9, 8.35, porcelainMat);
  addBox(0.22, 0.78, 0.62, 4.3, FERRY_DECK_Y + 0.5, 8.35, whiteMat);
  addBox(0.08, 1.0, 1.0, 4.42, 2.65, 8.35, windowMat);
  const faucet = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.28, 6), steelMat);
  faucet.position.set(3.85, FERRY_DECK_Y + 1.08, 8.35);
  faucet.rotation.z = Math.PI / 2;
  root.add(faucet);
  // Shower stall with frosted door.
  addBox(0.1, 2.15, 2.0, 1.35, FERRY_DECK_Y + 1.08, 10.75, frostedMat);
  addBox(0.1, 2.15, 2.0, 4.4, FERRY_DECK_Y + 1.08, 10.75, frostedMat);
  addBox(3.05, 2.15, 0.1, 2.875, FERRY_DECK_Y + 1.08, 11.75, frostedMat);
  addBox(3.05, 0.1, 2.0, 2.875, FERRY_DECK_Y + 2.15, 10.75, wallTrimMat);
  addBox(0.5, 0.6, 0.5, 4.15, FERRY_DECK_Y + 0.35, 9.8, woodMat);
  addBox(0.9, 0.08, 0.9, 2.8, FERRY_DECK_Y + 0.08, 10.8, steelMat);
  const showerHead = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 6), steelMat);
  showerHead.position.set(4.1, 2.85, 10.75);
  showerHead.rotation.z = -0.35;
  root.add(showerHead);
  // Bathroom ceiling light.
  addBox(0.7, 0.07, 0.7, 2.8, FERRY_CABIN_ROOF_Y - 0.1, 7.2, lampMat);

  // ---- Open aft deck, rails and wheelhouse -------------------------------
  for (const side of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 0.95, 6), steelMat);
      post.position.set(side * (FERRY_HALF_WIDTH - 0.1), FERRY_DECK_Y + 0.48, -16.8 + i * 2.2);
      root.add(post);
    }
    addBox(0.07, 0.07, 11.5, side * (FERRY_HALF_WIDTH - 0.1), FERRY_DECK_Y + 0.95, -11.2, steelMat);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.12, 8, 14), lifeRingMat);
    ring.position.set(side * 4.2, FERRY_DECK_Y + 1.55, -8.6);
    ring.rotation.y = Math.PI / 2;
    root.add(ring);
  }
  addBox(8.8, 0.08, 0.08, 0, FERRY_DECK_Y + 0.95, -16.9, steelMat);
  addBox(2.7, 0.35, 0.85, -2.6, FERRY_DECK_Y + 0.42, -12.2, woodMat);
  addBox(2.7, 0.35, 0.85, 2.6, FERRY_DECK_Y + 0.42, -12.2, woodMat);
  addBox(0.24, 0.85, 0.24, -2.9, FERRY_DECK_Y + 0.4, -12.2, steelMat);
  addBox(0.24, 0.85, 0.24, 2.9, FERRY_DECK_Y + 0.4, -12.2, steelMat);

  // Wheelhouse above the bow end of the cabin.
  addBox(5.6, 1.7, 4.2, 0, FERRY_CABIN_ROOF_Y + 0.85, 12.6, wallMat);
  addBox(5.8, 0.18, 4.4, 0, FERRY_CABIN_ROOF_Y + 1.78, 12.6, wallTrimMat);
  for (let i = -1; i <= 1; i++) {
    addBox(1.0, 0.65, 0.06, i * 1.65, FERRY_CABIN_ROOF_Y + 1.02, FERRY_CABIN_FRONT_Z + 0.02, windowMat);
  }
  addBox(2.2, 0.3, 0.4, 0, FERRY_CABIN_ROOF_Y + 1.5, 10.6, warningMat);
  const funnel = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.68, 2.0, 10), stripeMat);
  funnel.position.set(0, FERRY_CABIN_ROOF_Y + 1.8, 7.2);
  root.add(funnel);
  const funnelCap = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.56, 0.2, 10), steelMat);
  funnelCap.position.set(0, FERRY_CABIN_ROOF_Y + 2.85, 7.2);
  root.add(funnelCap);

  // Name boards on both sides.
  for (const side of [-1, 1]) {
    const board = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 2.4), nameMat);
    board.position.set(side * (FERRY_HALF_WIDTH + 0.09), 2.52, -10.1);
    board.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
    root.add(board);
  }

  // Soft warm spill from the cabin lights. Keeps the rooms readable at night.
  const cabinGlow = new THREE.PointLight(0xffd79a, 12, 18, 2);
  cabinGlow.position.set(0, 3.2, 3.5);
  root.add(cabinGlow);
  const aftGlow = new THREE.PointLight(0xffc46b, 7, 13, 2);
  aftGlow.position.set(0, 3.2, -11);
  root.add(aftGlow);

  return {
    root,
    gate,
    tvScreenMat: screenMat,
    deckY: FERRY_DECK_Y,
    rooms: FERRY_ROOMS,
  };
}
