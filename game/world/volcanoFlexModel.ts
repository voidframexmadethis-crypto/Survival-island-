import * as THREE from 'three';
import {
  VOLCANO_FLEX_HEIGHT_M,
  VOLCANO_FLEX_LOCAL_CHAMBER,
  VOLCANO_FLEX_NAME,
  buildVolcanoFlexNodes,
  getVolcanoFlexSite,
} from './volcanoFlexLayout';

export interface VolcanoFlexEnvironment {
  root: THREE.Group;
  update: (dt: number, elapsed: number, speedKmh: number) => void;
  /** Hides the costly palms, elevator and detail lighting at long range. */
  setDetailVisible: (visible: boolean) => void;
  dispose: () => void;
}

function seeded(index: number): number {
  const x = Math.sin(index * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

interface BeamSpec {
  start: THREE.Vector3;
  end: THREE.Vector3;
  radius: number;
}

const UP = new THREE.Vector3(0, 1, 0);

function makeBeamInstances(
  beams: BeamSpec[],
  material: THREE.Material,
  name: string,
): THREE.InstancedMesh {
  const geometry = new THREE.CylinderGeometry(1, 1, 1, 6);
  const mesh = new THREE.InstancedMesh(geometry, material, beams.length);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const midpoint = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const matrix = new THREE.Matrix4();
  beams.forEach((beam, index) => {
    direction.subVectors(beam.end, beam.start);
    const length = direction.length();
    if (length < 0.001) return;
    midpoint.addVectors(beam.start, beam.end).multiplyScalar(0.5);
    quaternion.setFromUnitVectors(UP, direction.normalize());
    scale.set(beam.radius, length, beam.radius);
    matrix.compose(midpoint, quaternion, scale);
    mesh.setMatrixAt(index, matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

function buildPalmTree(
  index: number,
  height: number,
  trunkMaterial: THREE.Material,
  frondMaterial: THREE.Material,
): THREE.Group {
  const palm = new THREE.Group();
  palm.name = `tower-palm-${index}`;
  const lean = (seeded(index + 41) - 0.5) * 0.16;
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.26, height, 7),
    trunkMaterial,
  );
  trunk.position.y = height * 0.5;
  trunk.rotation.z = lean;
  trunk.castShadow = true;
  palm.add(trunk);

  const crown = new THREE.Group();
  crown.position.set(Math.sin(lean) * -height * 0.5, height, 0);
  palm.add(crown);
  const frondGeometry = new THREE.ConeGeometry(0.38, 4.1 + seeded(index) * 1.2, 3);
  for (let i = 0; i < 9; i++) {
    const frond = new THREE.Mesh(frondGeometry, frondMaterial);
    const angle = (i / 9) * Math.PI * 2 + seeded(index + 70) * 0.5;
    frond.position.set(Math.cos(angle) * 1.45, 0.12 - (i % 2) * 0.18, Math.sin(angle) * 1.45);
    frond.rotation.order = 'YXZ';
    frond.rotation.y = -angle;
    frond.rotation.z = -Math.PI * 0.43 - (i % 3) * 0.08;
    frond.scale.z = 0.34;
    frond.castShadow = true;
    crown.add(frond);
  }
  const coconuts = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 7, 6),
    trunkMaterial,
  );
  coconuts.position.y = -0.2;
  crown.add(coconuts);
  return palm;
}

interface TowerSurfaceMaps {
  map?: THREE.Texture;
  bumpMap?: THREE.Texture;
  roughnessMap?: THREE.Texture;
}

let cachedPaintedMetalMaps: {
  bumpMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} | null = null;

/** Fine brushed-metal microdetail for the painted structural steel. */
function getPaintedMetalMaps(): {
  bumpMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} | null {
  if (typeof document === 'undefined') return null;
  if (cachedPaintedMetalMaps) return cachedPaintedMetalMaps;
  const size = 256;
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bumpCtx = bumpCanvas.getContext('2d');
  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const roughCtx = roughCanvas.getContext('2d');
  if (!bumpCtx || !roughCtx) return null;
  bumpCtx.fillStyle = '#8a8a8a';
  bumpCtx.fillRect(0, 0, size, size);
  roughCtx.fillStyle = '#b4b4b4';
  roughCtx.fillRect(0, 0, size, size);
  for (let i = 0; i < 900; i++) {
    const x = seeded(i * 1.37) * size;
    const y = seeded(i * 2.71 + 9) * size;
    const length = 8 + seeded(i + 43) * 86;
    const shade = 104 + Math.floor(seeded(i + 88) * 62);
    bumpCtx.strokeStyle = `rgba(${shade}, ${shade}, ${shade}, 0.22)`;
    bumpCtx.lineWidth = 0.6 + seeded(i + 17) * 1.1;
    bumpCtx.beginPath();
    bumpCtx.moveTo(x, y);
    bumpCtx.lineTo(x + length, y + (seeded(i + 5) - 0.5) * 0.8);
    bumpCtx.stroke();
    const roughShade = 154 + Math.floor(seeded(i + 121) * 58);
    roughCtx.strokeStyle = `rgba(${roughShade}, ${roughShade}, ${roughShade}, 0.18)`;
    roughCtx.lineWidth = 0.7;
    roughCtx.beginPath();
    roughCtx.moveTo(x, y);
    roughCtx.lineTo(x + length, y + (seeded(i + 5) - 0.5) * 0.8);
    roughCtx.stroke();
  }
  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(2, 16);
  bumpMap.colorSpace = THREE.NoColorSpace;
  bumpMap.anisotropy = 4;
  bumpMap.needsUpdate = true;
  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(2, 16);
  roughnessMap.colorSpace = THREE.NoColorSpace;
  roughnessMap.anisotropy = 4;
  roughnessMap.needsUpdate = true;
  cachedPaintedMetalMaps = { bumpMap, roughnessMap };
  return cachedPaintedMetalMaps;
}

let cachedTowerConcreteMaps: TowerSurfaceMaps | null = null;

/** Cast-in-place concrete with aggregate, trowel variation and damp staining. */
function getTowerConcreteMaps(): TowerSurfaceMaps | null {
  if (typeof document === 'undefined') return null;
  if (cachedTowerConcreteMaps) return cachedTowerConcreteMaps;
  const size = 512;
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const colorCtx = colorCanvas.getContext('2d');
  const bumpCtx = bumpCanvas.getContext('2d');
  const roughCtx = roughCanvas.getContext('2d');
  if (!colorCtx || !bumpCtx || !roughCtx) return null;

  const color = colorCtx.createImageData(size, size);
  const bump = bumpCtx.createImageData(size, size);
  const rough = roughCtx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const index = (y * size + x) * 4;
      const grain = seeded(x * 0.71 + y * 3.17 + 7);
      const aggregate = seeded(Math.floor(x / 3) * 0.91 + Math.floor(y / 3) * 5.3 + 31);
      const trowel =
        0.5 +
        Math.sin(x * 0.027 + y * 0.009) * 0.055 +
        Math.sin(x * 0.006 - y * 0.021) * 0.045;
      const fleck = grain > 0.965 ? (grain - 0.965) * 9 : 0;
      const base = 168 + trowel * 34 + aggregate * 22 + fleck * 250;
      color.data[index] = Math.max(0, Math.min(255, base));
      color.data[index + 1] = Math.max(0, Math.min(255, base + 2));
      color.data[index + 2] = Math.max(0, Math.min(255, base + 5));
      color.data[index + 3] = 255;
      const height = Math.max(
        0,
        Math.min(255, 116 + grain * 34 + aggregate * 26 + fleck * 130),
      );
      bump.data[index] = height;
      bump.data[index + 1] = height;
      bump.data[index + 2] = height;
      bump.data[index + 3] = 255;
      const roughness = Math.max(0, Math.min(255, 188 + (1 - trowel) * 28 - fleck * 420));
      rough.data[index] = roughness;
      rough.data[index + 1] = roughness;
      rough.data[index + 2] = roughness;
      rough.data[index + 3] = 255;
    }
  }
  colorCtx.putImageData(color, 0, 0);
  bumpCtx.putImageData(bump, 0, 0);
  roughCtx.putImageData(rough, 0, 0);

  // Formwork joints and weather streaks break up the tiled surface.
  colorCtx.globalAlpha = 0.33;
  colorCtx.strokeStyle = '#5b6066';
  colorCtx.lineWidth = 1.4;
  for (const edge of [0, 128, 256, 384]) {
    colorCtx.beginPath();
    colorCtx.moveTo(edge + 0.5, 0);
    colorCtx.lineTo(edge + 0.5, size);
    colorCtx.stroke();
    colorCtx.beginPath();
    colorCtx.moveTo(0, edge + 0.5);
    colorCtx.lineTo(size, edge + 0.5);
    colorCtx.stroke();
  }
  colorCtx.globalAlpha = 0.2;
  for (let i = 0; i < 18; i++) {
    const x = seeded(i * 6.7 + 3) * size;
    const stain = colorCtx.createLinearGradient(x, 0, x + 26, size);
    stain.addColorStop(0, 'rgba(56, 60, 63, 0)');
    stain.addColorStop(0.5, 'rgba(56, 60, 63, 0.8)');
    stain.addColorStop(1, 'rgba(56, 60, 63, 0)');
    colorCtx.fillStyle = stain;
    colorCtx.fillRect(x, 0, 26, size);
  }
  colorCtx.globalAlpha = 1;

  const map = new THREE.CanvasTexture(colorCanvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(2, 2);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  map.needsUpdate = true;
  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(2, 2);
  bumpMap.colorSpace = THREE.NoColorSpace;
  bumpMap.anisotropy = 4;
  bumpMap.needsUpdate = true;
  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(2, 2);
  roughnessMap.colorSpace = THREE.NoColorSpace;
  roughnessMap.anisotropy = 4;
  roughnessMap.needsUpdate = true;
  cachedTowerConcreteMaps = { map, bumpMap, roughnessMap };
  return cachedTowerConcreteMaps;
}

let cachedContactShadowTexture: THREE.CanvasTexture | null = null;

function getContactShadowTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  if (cachedContactShadowTexture) return cachedContactShadowTexture;
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
  gradient.addColorStop(0.58, 'rgba(0, 0, 0, 0.3)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  cachedContactShadowTexture = texture;
  return cachedContactShadowTexture;
}

function stationSignTexture(): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#1b0b0b');
  grad.addColorStop(1, '#05070b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 256);
  ctx.strokeStyle = '#e11d2f';
  ctx.lineWidth = 9;
  ctx.strokeRect(8, 8, 1008, 240);
  ctx.fillStyle = '#fff7ed';
  ctx.font = '900 106px Impact, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(VOLCANO_FLEX_NAME, 512, 103);
  ctx.fillStyle = '#fb923c';
  ctx.font = '700 34px monospace';
  ctx.fillText('900 FT · 15 INVERSIONS · LSM LAUNCH', 512, 193);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * A 900-ft steel-and-glass observation tower with a blue-lit crown. The
 * existing coaster spiral wraps the outside of the slim central core, so the
 * red track is the dominant silhouette. Everything here is decorative and
 * never participates in the coaster collision or physics.
 */
export function buildVolcanoFlexEnvironment(): VolcanoFlexEnvironment {
  const site = getVolcanoFlexSite();
  const root = new THREE.Group();
  root.name = 'volcano-flex-environment';
  root.position.set(site.mountain.x, site.mountain.y, site.mountain.z);
  const detail = new THREE.Group();
  detail.name = 'tower-detail';
  root.add(detail);

  const height = VOLCANO_FLEX_HEIGHT_M;
  const crownFloorY = VOLCANO_FLEX_LOCAL_CHAMBER.ascentTop + 3.2;
  const crownTopY = crownFloorY + 9.2;
  const stationLocal = new THREE.Vector3(
    site.station.x - site.mountain.x,
    site.station.y - site.mountain.y,
    site.station.z - site.mountain.z,
  );

  const metalMaps = getPaintedMetalMaps();
  const concreteMaps = getTowerConcreteMaps();
  const whiteSteel = new THREE.MeshPhysicalMaterial({
    color: 0xe8ecef,
    roughness: 0.55,
    metalness: 0.16,
    clearcoat: 0.55,
    clearcoatRoughness: 0.22,
    bumpMap: metalMaps?.bumpMap ?? null,
    bumpScale: 0.007,
    roughnessMap: metalMaps?.roughnessMap ?? null,
    envMapIntensity: 1.3,
  });
  const paleSteel = new THREE.MeshPhysicalMaterial({
    color: 0xbcc6ce,
    roughness: 0.62,
    metalness: 0.2,
    clearcoat: 0.42,
    clearcoatRoughness: 0.26,
    bumpMap: metalMaps?.bumpMap ?? null,
    bumpScale: 0.009,
    roughnessMap: metalMaps?.roughnessMap ?? null,
    envMapIntensity: 1.2,
  });
  const redSteel = new THREE.MeshPhysicalMaterial({
    color: 0xce1b27,
    roughness: 0.4,
    metalness: 0.2,
    clearcoat: 0.78,
    clearcoatRoughness: 0.14,
    bumpMap: metalMaps?.bumpMap ?? null,
    bumpScale: 0.008,
    roughnessMap: metalMaps?.roughnessMap ?? null,
    envMapIntensity: 1.42,
  });
  const darkSteel = new THREE.MeshPhysicalMaterial({
    color: 0x202832,
    roughness: 0.34,
    metalness: 0.74,
    clearcoat: 0.32,
    clearcoatRoughness: 0.18,
    envMapIntensity: 1.45,
  });
  const concrete = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: concreteMaps?.map ?? null,
    bumpMap: concreteMaps?.bumpMap ?? null,
    bumpScale: 0.035,
    roughnessMap: concreteMaps?.roughnessMap ?? null,
    roughness: 0.98,
    metalness: 0.02,
    envMapIntensity: 0.65,
  });
  const coreGlass = new THREE.MeshPhysicalMaterial({
    color: 0xa8c7dc,
    metalness: 0.04,
    roughness: 0.045,
    transmission: 0.52,
    thickness: 0.28,
    ior: 1.5,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
    transparent: true,
    opacity: 0.62,
    side: THREE.DoubleSide,
    depthWrite: false,
    envMapIntensity: 1.7,
  });
  const crownGlass = new THREE.MeshPhysicalMaterial({
    color: 0x162b45,
    emissive: 0x2f6fa8,
    emissiveIntensity: 0.45,
    metalness: 0.16,
    roughness: 0.06,
    transmission: 0.3,
    thickness: 0.32,
    ior: 1.5,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide,
    depthWrite: false,
    envMapIntensity: 1.75,
  });
  const blueGlow = new THREE.MeshStandardMaterial({
    color: 0x7dc8ff,
    emissive: 0x3b9cff,
    emissiveIntensity: 1.9,
    roughness: 0.22,
    metalness: 0.18,
  });
  const warmGlow = new THREE.MeshStandardMaterial({
    color: 0xffc181,
    emissive: 0xff7a2f,
    emissiveIntensity: 1.45,
    roughness: 0.3,
  });
  const beaconGlow = new THREE.MeshStandardMaterial({
    color: 0xff6b6b,
    emissive: 0xff1f2d,
    emissiveIntensity: 2.8,
    roughness: 0.2,
  });
  const canopyGlass = new THREE.MeshPhysicalMaterial({
    color: 0x162638,
    emissive: 0x154d70,
    emissiveIntensity: 0.25,
    metalness: 0.12,
    roughness: 0.06,
    transmission: 0.24,
    thickness: 0.22,
    ior: 1.52,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    transparent: true,
    opacity: 0.74,
    side: THREE.DoubleSide,
    depthWrite: false,
    envMapIntensity: 1.7,
  });

  // Paved plaza, cast-in-place foundation and a low glass lobby anchor the
  // tower in the island. The foundation profile has a real chamfer so it reads
  // as concrete rather than a floating cylinder.
  const plazaPaving = new THREE.Mesh(
    new THREE.CircleGeometry(38, 72),
    concrete,
  );
  plazaPaving.name = 'tower-plaza-paving';
  plazaPaving.rotation.x = -Math.PI / 2;
  plazaPaving.position.y = 0.08;
  plazaPaving.receiveShadow = true;
  root.add(plazaPaving);

  const foundationProfile = [
    new THREE.Vector2(0, -1.2),
    new THREE.Vector2(25.8, -1.2),
    new THREE.Vector2(26.35, 0.52),
    new THREE.Vector2(25.55, 0.95),
    new THREE.Vector2(0, 0.95),
  ];
  const foundation = new THREE.Mesh(
    new THREE.LatheGeometry(foundationProfile, 72),
    concrete,
  );
  foundation.name = 'tower-foundation';
  foundation.castShadow = true;
  foundation.receiveShadow = true;
  root.add(foundation);

  const plazaCurb = new THREE.Mesh(
    new THREE.TorusGeometry(37.7, 0.16, 6, 96),
    paleSteel,
  );
  plazaCurb.name = 'tower-plaza-curb';
  plazaCurb.rotation.x = Math.PI / 2;
  plazaCurb.position.y = 0.2;
  root.add(plazaCurb);

  const plazaRim = new THREE.Mesh(
    new THREE.TorusGeometry(24.3, 0.28, 8, 72),
    redSteel,
  );
  plazaRim.name = 'tower-plaza-rim';
  plazaRim.rotation.x = Math.PI / 2;
  plazaRim.position.y = 0.98;
  root.add(plazaRim);

  const contactShadowTexture = getContactShadowTexture();
  if (contactShadowTexture) {
    const contactShadow = new THREE.Mesh(
      new THREE.CircleGeometry(33.5, 64),
      new THREE.MeshBasicMaterial({
        map: contactShadowTexture,
        transparent: true,
        depthWrite: false,
        opacity: 0.82,
        toneMapped: false,
      }),
    );
    contactShadow.name = 'tower-ground-contact-shadow';
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = 0.105;
    contactShadow.renderOrder = 2;
    root.add(contactShadow);
  }

  const lobby = new THREE.Mesh(
    new THREE.CylinderGeometry(11.2, 11.8, 10.5, 48, 1, true),
    coreGlass,
  );
  lobby.name = 'tower-lobby-glass';
  lobby.position.y = 5.3;
  root.add(lobby);
  const lobbyLamp = new THREE.PointLight(0xffc18f, 2.4, 34, 1.8);
  lobbyLamp.name = 'tower-lobby-glow';
  lobbyLamp.position.set(0, 6, 0);
  root.add(lobbyLamp);
  const lobbyBand = new THREE.Mesh(
    new THREE.TorusGeometry(10.6, 0.16, 6, 48),
    warmGlow,
  );
  lobbyBand.rotation.x = Math.PI / 2;
  lobbyBand.position.y = 9.6;
  root.add(lobbyBand);

  // Slim central lift shaft. The elevator cab travels inside the glass.
  const elevatorShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(3.15, 3.15, crownFloorY - 8, 28, 1, true),
    coreGlass,
  );
  elevatorShaft.name = 'tower-glass-core';
  elevatorShaft.position.y = 8 + (crownFloorY - 8) * 0.5;
  root.add(elevatorShaft);

  // Interior floor bands and warm lift lighting show through the glass core.
  const coreFloorRings = new THREE.InstancedMesh(
    new THREE.TorusGeometry(3.22, 0.035, 5, 32),
    darkSteel,
    18,
  );
  coreFloorRings.name = 'tower-core-floor-rings';
  const coreFloorLights = new THREE.InstancedMesh(
    new THREE.TorusGeometry(3.2, 0.018, 4, 32),
    warmGlow,
    9,
  );
  coreFloorLights.name = 'tower-core-floor-lights';
  const coreRingMatrix = new THREE.Matrix4();
  const coreRingQuaternion = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(Math.PI / 2, 0, 0),
  );
  const coreFloorScale = new THREE.Vector3(1, 1, 1);
  for (let i = 0; i < 18; i++) {
    const y = 11 + (i / 17) * (crownFloorY - 22);
    coreRingMatrix.compose(
      new THREE.Vector3(0, y, 0),
      coreRingQuaternion,
      coreFloorScale,
    );
    coreFloorRings.setMatrixAt(i, coreRingMatrix);
    if (i % 2 === 0 && i / 2 < 9) {
      coreFloorLights.setMatrixAt(i / 2, coreRingMatrix);
    }
  }
  coreFloorRings.instanceMatrix.needsUpdate = true;
  coreFloorLights.instanceMatrix.needsUpdate = true;
  detail.add(coreFloorRings, coreFloorLights);

  const guideBeams: BeamSpec[] = [];
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
    guideBeams.push({
      start: new THREE.Vector3(Math.cos(angle) * 3.55, 4, Math.sin(angle) * 3.55),
      end: new THREE.Vector3(Math.cos(angle) * 3.55, crownFloorY, Math.sin(angle) * 3.55),
      radius: 0.1,
    });
  }
  const guides = makeBeamInstances(guideBeams, whiteSteel, 'tower-elevator-guides');
  detail.add(guides);

  const elevator = new THREE.Group();
  elevator.name = 'tower-elevator-car';
  const cab = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2, 2.2, 4.5, 16),
    paleSteel,
  );
  elevator.add(cab);
  const cabBand = new THREE.Mesh(
    new THREE.CylinderGeometry(2.24, 2.24, 1.25, 16, 1, true),
    blueGlow,
  );
  cabBand.position.y = 0.8;
  elevator.add(cabBand);
  const cabRoof = new THREE.Mesh(
    new THREE.CylinderGeometry(2.35, 2.25, 0.28, 16),
    redSteel,
  );
  cabRoof.position.y = 2.38;
  elevator.add(cabRoof);
  elevator.position.set(0, 9, 0);
  detail.add(elevator);

  // White space-frame cage: tapered columns, rings and alternating X braces.
  const lattice = new THREE.Group();
  lattice.name = 'tower-lattice';
  root.add(lattice);
  const latticeBottom = 3;
  const latticeTop = crownFloorY - 4;
  const baseRadius = 9.6;
  const topRadius = 7.1;
  const levels = 14;
  const sides = 12;
  const columnBeams: BeamSpec[] = [];
  const braceBeams: BeamSpec[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2;
    columnBeams.push({
      start: new THREE.Vector3(
        Math.cos(angle) * baseRadius,
        latticeBottom,
        Math.sin(angle) * baseRadius,
      ),
      end: new THREE.Vector3(
        Math.cos(angle) * topRadius,
        latticeTop,
        Math.sin(angle) * topRadius,
      ),
      radius: 0.11,
    });
  }
  for (let level = 0; level < levels; level++) {
    const t0 = level / levels;
    const t1 = (level + 1) / levels;
    const y0 = THREE.MathUtils.lerp(latticeBottom, latticeTop, t0);
    const y1 = THREE.MathUtils.lerp(latticeBottom, latticeTop, t1);
    const r0 = THREE.MathUtils.lerp(baseRadius, topRadius, t0);
    const r1 = THREE.MathUtils.lerp(baseRadius, topRadius, t1);
    for (let i = 0; i < sides; i++) {
      const a0 = (i / sides) * Math.PI * 2;
      const a1 = ((i + 1) / sides) * Math.PI * 2;
      braceBeams.push({
        start: new THREE.Vector3(Math.cos(a0) * r0, y0, Math.sin(a0) * r0),
        end: new THREE.Vector3(Math.cos(a1) * r1, y1, Math.sin(a1) * r1),
        radius: 0.055,
      });
      braceBeams.push({
        start: new THREE.Vector3(Math.cos(a1) * r0, y0, Math.sin(a1) * r0),
        end: new THREE.Vector3(Math.cos(a0) * r1, y1, Math.sin(a0) * r1),
        radius: 0.055,
      });
    }
  }
  lattice.add(makeBeamInstances(columnBeams, whiteSteel, 'tower-lattice-columns'));
  lattice.add(makeBeamInstances(braceBeams, paleSteel, 'tower-lattice-braces'));

  const ringGeometry = new THREE.TorusGeometry(1, 0.009, 6, 64);
  const ringInstances = new THREE.InstancedMesh(
    ringGeometry,
    whiteSteel,
    levels + 1,
  );
  ringInstances.name = 'tower-lattice-rings';
  const ringMatrix = new THREE.Matrix4();
  const ringQuaternion = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(Math.PI / 2, 0, 0),
  );
  for (let level = 0; level <= levels; level++) {
    const t = level / levels;
    const radius = THREE.MathUtils.lerp(baseRadius, topRadius, t);
    ringMatrix.compose(
      new THREE.Vector3(0, THREE.MathUtils.lerp(latticeBottom, latticeTop, t), 0),
      ringQuaternion,
      new THREE.Vector3(radius, radius, radius),
    );
    ringInstances.setMatrixAt(level, ringMatrix);
  }
  ringInstances.instanceMatrix.needsUpdate = true;
  lattice.add(ringInstances);

  // Red pylons echo the coaster structure where the tower meets the plaza.
  const pylonBeams: BeamSpec[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + Math.PI / 12;
    pylonBeams.push({
      start: new THREE.Vector3(Math.cos(angle) * 16, 0.4, Math.sin(angle) * 16),
      end: new THREE.Vector3(Math.cos(angle) * 8.4, 38, Math.sin(angle) * 8.4),
      radius: 0.34,
    });
  }
  const pylons = makeBeamInstances(pylonBeams, redSteel, 'tower-base-pylons');
  root.add(pylons);

  // Real track brackets clamp the outer spiral to the tower instead of letting
  // the rails float unsupported. Each arm is placed at an actual ascent or
  // descent node, so it lands directly beneath a running rail.
  const trackSupports = new THREE.Group();
  trackSupports.name = 'tower-track-supports';
  const supportArms: BeamSpec[] = [];
  const supportBraces: BeamSpec[] = [];
  let lastSupportY = -Infinity;
  for (const node of buildVolcanoFlexNodes()) {
    const localX = node.position.x - site.mountain.x;
    const localZ = node.position.z - site.mountain.z;
    const localY = node.position.y - site.mountain.y;
    const radius = Math.hypot(localX, localZ);
    if (localY < latticeBottom + 7 || localY > latticeTop - 1.5) continue;
    if (Math.abs(radius - VOLCANO_FLEX_LOCAL_CHAMBER.radius) > 0.9) continue;
    if (localY - lastSupportY < 13.5) continue;
    lastSupportY = localY;
    const t = THREE.MathUtils.clamp(
      (localY - latticeBottom) / (latticeTop - latticeBottom),
      0,
      1,
    );
    const towerRadius = THREE.MathUtils.lerp(baseRadius, topRadius, t) + 0.28;
    const angle = Math.atan2(localZ, localX);
    const armY = localY - 0.68;
    const armEnd = VOLCANO_FLEX_LOCAL_CHAMBER.radius - 0.34;
    supportArms.push({
      start: new THREE.Vector3(
        Math.cos(angle) * towerRadius,
        armY,
        Math.sin(angle) * towerRadius,
      ),
      end: new THREE.Vector3(
        Math.cos(angle) * armEnd,
        armY,
        Math.sin(angle) * armEnd,
      ),
      radius: 0.075,
    });
    supportArms.push({
      start: new THREE.Vector3(
        Math.cos(angle) * armEnd,
        armY,
        Math.sin(angle) * armEnd,
      ),
      end: new THREE.Vector3(
        Math.cos(angle) * armEnd,
        localY - 0.14,
        Math.sin(angle) * armEnd,
      ),
      radius: 0.055,
    });
    supportBraces.push({
      start: new THREE.Vector3(
        Math.cos(angle) * towerRadius,
        armY - 4.2,
        Math.sin(angle) * towerRadius,
      ),
      end: new THREE.Vector3(
        Math.cos(angle) * armEnd,
        armY - 0.02,
        Math.sin(angle) * armEnd,
      ),
      radius: 0.05,
    });
  }
  trackSupports.add(
    makeBeamInstances(supportArms, redSteel, 'tower-track-support-arms'),
    makeBeamInstances(supportBraces, redSteel, 'tower-track-support-braces'),
  );
  root.add(trackSupports);

  // Blue-lit circular observation deck with a white picket crown.
  const crown = new THREE.Group();
  crown.name = 'tower-observation-crown';
  root.add(crown);
  const supportBeams: BeamSpec[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2;
    supportBeams.push({
      start: new THREE.Vector3(Math.cos(angle) * 7.3, crownFloorY - 10, Math.sin(angle) * 7.3),
      end: new THREE.Vector3(Math.cos(angle) * 13.4, crownFloorY, Math.sin(angle) * 13.4),
      radius: 0.15,
    });
  }
  crown.add(makeBeamInstances(supportBeams, whiteSteel, 'tower-crown-supports'));

  const deck = new THREE.Mesh(
    new THREE.CylinderGeometry(15.2, 13.6, 1.2, 64),
    whiteSteel,
  );
  deck.position.y = crownFloorY - 0.4;
  deck.castShadow = true;
  deck.receiveShadow = true;
  crown.add(deck);
  const deckUnderside = new THREE.Mesh(
    new THREE.TorusGeometry(14.4, 0.24, 8, 72),
    blueGlow,
  );
  deckUnderside.name = 'tower-crown-ring';
  deckUnderside.rotation.x = Math.PI / 2;
  deckUnderside.position.y = crownFloorY - 1.0;
  crown.add(deckUnderside);

  const observationGlass = new THREE.Mesh(
    new THREE.CylinderGeometry(12.8, 12.4, 6, 48, 1, true),
    crownGlass,
  );
  observationGlass.name = 'tower-crown-glass';
  observationGlass.position.y = crownFloorY + 3;
  crown.add(observationGlass);

  const mullionBeams: BeamSpec[] = [];
  for (let i = 0; i < 28; i++) {
    const angle = (i / 28) * Math.PI * 2;
    mullionBeams.push({
      start: new THREE.Vector3(Math.cos(angle) * 12.95, crownFloorY + 0.1, Math.sin(angle) * 12.95),
      end: new THREE.Vector3(Math.cos(angle) * 12.55, crownFloorY + 5.9, Math.sin(angle) * 12.55),
      radius: 0.07,
    });
  }
  crown.add(makeBeamInstances(mullionBeams, whiteSteel, 'tower-crown-mullions'));

  const crownFloorLight = new THREE.Mesh(
    new THREE.CylinderGeometry(12.2, 12.2, 0.08, 48),
    blueGlow,
  );
  crownFloorLight.name = 'tower-crown-floor-light';
  crownFloorLight.position.y = crownFloorY + 0.08;
  crown.add(crownFloorLight);

  const crownRoof = new THREE.Mesh(
    new THREE.CylinderGeometry(14.8, 14.6, 0.72, 64),
    whiteSteel,
  );
  crownRoof.position.y = crownFloorY + 6.35;
  crownRoof.castShadow = true;
  crown.add(crownRoof);
  const crownCap = new THREE.Mesh(
    new THREE.ConeGeometry(14.1, 2.9, 64),
    whiteSteel,
  );
  crownCap.position.y = crownFloorY + 8.15;
  crownCap.castShadow = true;
  crown.add(crownCap);
  const crownCapRim = new THREE.Mesh(
    new THREE.TorusGeometry(14.55, 0.18, 8, 72),
    blueGlow,
  );
  crownCapRim.rotation.x = Math.PI / 2;
  crownCapRim.position.y = crownFloorY + 6.68;
  crown.add(crownCapRim);

  const crownGlow = new THREE.PointLight(0x72b8ff, 8, 170, 1.7);
  crownGlow.name = 'tower-crown-glow';
  crownGlow.position.set(0, crownFloorY + 3.2, 0);
  crown.add(crownGlow);

  // A slender mast carries the structure to the original 900-ft height.
  const mastHeight = height - crownTopY;
  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.62, mastHeight, 10),
    whiteSteel,
  );
  mast.name = 'tower-top-mast';
  mast.position.y = crownTopY + mastHeight * 0.5;
  mast.castShadow = true;
  root.add(mast);
  const mastRings = new THREE.Group();
  mastRings.name = 'tower-mast-rings';
  detail.add(mastRings);
  for (let i = 1; i <= 7; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.8 - i * 0.045, 0.045, 5, 20),
      paleSteel,
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = crownTopY + (mastHeight * i) / 8;
    mastRings.add(ring);
  }
  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, 10, 8),
    beaconGlow,
  );
  beacon.name = 'tower-top-beacon';
  beacon.position.y = height;
  root.add(beacon);
  const beaconLight = new THREE.PointLight(0xff3040, 3.2, 46, 1.8);
  beaconLight.name = 'tower-beacon-light';
  beaconLight.position.y = height;
  detail.add(beaconLight);

  // Red launch arch where the train leaves the station spur and enters the
  // tower's spiral. Its opening matches the launch track height and clearance.
  const portal = new THREE.Group();
  portal.name = 'tower-launch-portal';
  const tunnel = new THREE.Mesh(
    new THREE.CylinderGeometry(5.7, 5.7, 18, 28, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0x080b10,
      roughness: 0.94,
      metalness: 0.04,
      side: THREE.BackSide,
    }),
  );
  tunnel.rotation.z = Math.PI / 2;
  tunnel.position.set(-10.5, 4.1, -20);
  portal.add(tunnel);
  const portalRing = new THREE.Mesh(
    new THREE.TorusGeometry(6.15, 0.52, 10, 42),
    redSteel,
  );
  portalRing.name = 'tower-launch-ring';
  portalRing.rotation.y = Math.PI / 2;
  portalRing.position.set(-19.2, 4.4, -20);
  portal.add(portalRing);
  const portalGlowMat = new THREE.MeshStandardMaterial({
    color: 0xff9b83,
    emissive: 0xff3b2f,
    emissiveIntensity: 1.6,
    roughness: 0.24,
  });
  const portalLightRing = new THREE.Mesh(
    new THREE.TorusGeometry(5.45, 0.12, 6, 42),
    portalGlowMat,
  );
  portalLightRing.rotation.y = Math.PI / 2;
  portalLightRing.position.set(-19.28, 4.4, -20);
  portal.add(portalLightRing);
  const portalLight = new THREE.PointLight(0xff5a43, 2.6, 30, 1.8);
  portalLight.position.set(-18, 5, -20);
  portal.add(portalLight);
  root.add(portal);

  // Curved red station canopy over the boarding spur.
  const stationGroup = new THREE.Group();
  stationGroup.name = 'volcano-flex-station';
  stationGroup.position.set(stationLocal.x + 8, stationLocal.y, stationLocal.z);
  const canopyPositions: number[] = [];
  const canopyIndices: number[] = [];
  const canopyCols = 12;
  const canopyRows = 12;
  const canopyHalfX = 9.5;
  const canopyHalfZ = 10.5;
  for (let xi = 0; xi <= canopyCols; xi++) {
    const x = THREE.MathUtils.lerp(-canopyHalfX, canopyHalfX, xi / canopyCols);
    for (let zi = 0; zi <= canopyRows; zi++) {
      const z = THREE.MathUtils.lerp(-canopyHalfZ, canopyHalfZ, zi / canopyRows);
      const y = 8.25 + Math.cos((z / canopyHalfZ) * Math.PI * 0.5) * 1.55;
      canopyPositions.push(x, y, z);
    }
  }
  for (let xi = 0; xi < canopyCols; xi++) {
    for (let zi = 0; zi < canopyRows; zi++) {
      const a = xi * (canopyRows + 1) + zi;
      const b = a + canopyRows + 1;
      canopyIndices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const canopyGeometry = new THREE.BufferGeometry();
  canopyGeometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(canopyPositions, 3),
  );
  canopyGeometry.setIndex(canopyIndices);
  canopyGeometry.computeVertexNormals();
  const canopy = new THREE.Mesh(canopyGeometry, canopyGlass);
  canopy.name = 'tower-station-canopy';
  canopy.castShadow = true;
  stationGroup.add(canopy);

  for (const ribX of [-9.5, -6.4, -3.2, 0, 3.2, 6.4, 9.5]) {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= 12; i++) {
      const z = THREE.MathUtils.lerp(-canopyHalfZ, canopyHalfZ, i / 12);
      points.push(
        new THREE.Vector3(
          ribX,
          8.25 + Math.cos((z / canopyHalfZ) * Math.PI * 0.5) * 1.55 + 0.06,
          z,
        ),
      );
    }
    const rib = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 18, 0.17, 6, false),
      redSteel,
    );
    stationGroup.add(rib);
  }
  for (const edgeZ of [-canopyHalfZ, canopyHalfZ]) {
    const edge = new THREE.Mesh(
      new THREE.CylinderGeometry(0.19, 0.19, canopyHalfX * 2, 8),
      redSteel,
    );
    edge.rotation.z = Math.PI / 2;
    edge.position.set(0, 8.32, edgeZ);
    stationGroup.add(edge);
    const led = new THREE.Mesh(
      new THREE.BoxGeometry(canopyHalfX * 2, 0.12, 0.08),
      blueGlow,
    );
    led.position.set(0, 8.05, edgeZ);
    stationGroup.add(led);
  }
  for (const sx of [-9.1, 9.1]) {
    for (const sz of [-8.2, 8.2]) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.22, 8.3, 8),
        whiteSteel,
      );
      post.position.set(sx, 4.15, sz);
      post.castShadow = true;
      stationGroup.add(post);
    }
  }

  const signTexture = stationSignTexture();
  if (signTexture) {
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 3.5),
      new THREE.MeshBasicMaterial({
        map: signTexture,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
    );
    sign.name = 'volcano-flex-sign';
    sign.position.set(0, 6.35, canopyHalfZ + 0.35);
    stationGroup.add(sign);
    const signBack = new THREE.Mesh(
      new THREE.BoxGeometry(14.5, 4, 0.18),
      darkSteel,
    );
    signBack.position.set(0, 6.35, canopyHalfZ + 0.18);
    stationGroup.add(signBack);
  }
  const stationLamp = new THREE.PointLight(0xffb377, 2.2, 30, 1.8);
  stationLamp.position.set(0, 5.2, 0);
  stationGroup.add(stationLamp);
  root.add(stationGroup);

  // Palms and low blue plaza lights soften the base of the steel structure.
  const palms = new THREE.Group();
  palms.name = 'tower-palms';
  detail.add(palms);
  const trunkMaterial = new THREE.MeshStandardMaterial({
    color: 0x765239,
    roughness: 0.9,
  });
  const frondMaterial = new THREE.MeshStandardMaterial({
    color: 0x2d6b3b,
    roughness: 0.82,
    side: THREE.DoubleSide,
  });
  const palmCrowns: THREE.Group[] = [];
  const palmAngles = [0.25, 0.95, 1.7, 2.4, 3.15, 3.85, 4.55, 5.3];
  palmAngles.forEach((angle, index) => {
    const radius = 29.5 + seeded(index + 8) * 4;
    const palm = buildPalmTree(
      index,
      10.5 + seeded(index + 4) * 4.4,
      trunkMaterial,
      frondMaterial,
    );
    palm.position.set(
      Math.cos(angle) * radius,
      0,
      Math.sin(angle) * radius,
    );
    palm.rotation.y = seeded(index + 19) * Math.PI * 2;
    palms.add(palm);
    const crown = palm.children.find((child) => child.type === 'Group');
    if (crown instanceof THREE.Group) palmCrowns.push(crown);
  });
  for (let i = 0; i < 2; i++) {
    const palm = buildPalmTree(
      20 + i,
      9.5 + i * 2.2,
      trunkMaterial,
      frondMaterial,
    );
    palm.position.set(
      stationLocal.x + (i === 0 ? 18 : -12),
      0,
      stationLocal.z + (i === 0 ? 18 : -17),
    );
    palms.add(palm);
  }

  const plazaLights = new THREE.Group();
  plazaLights.name = 'tower-plaza-lights';
  detail.add(plazaLights);
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2 + 0.18;
    const lampGroup = new THREE.Group();
    lampGroup.position.set(Math.cos(angle) * 22.6, 0, Math.sin(angle) * 22.6);
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.1, 1.65, 6),
      whiteSteel,
    );
    pole.position.y = 0.82;
    lampGroup.add(pole);
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 8, 6),
      blueGlow,
    );
    lamp.position.y = 1.72;
    lampGroup.add(lamp);
    plazaLights.add(lampGroup);
  }

  const update = (dt: number, elapsed: number, speedKmh: number) => {
    const pulse = 0.5 + 0.5 * Math.sin(elapsed * 1.35);
    crownGlass.emissiveIntensity = 0.32 + pulse * 0.22;
    blueGlow.emissiveIntensity = 1.55 + pulse * 1.1;
    crownGlow.intensity = 6.5 + pulse * 2.4;
    lobbyLamp.intensity = 2.1 + Math.sin(elapsed * 2.1) * 0.24;
    stationLamp.intensity = 1.9 + Math.sin(elapsed * 2.5) * 0.16;
    portalGlowMat.emissiveIntensity =
      1.25 + Math.min(1.6, speedKmh * 0.005) + pulse * 0.45;
    portalLight.intensity = 2.2 + Math.min(2.6, speedKmh * 0.009);
    const beaconPulse = Math.max(0, Math.sin(elapsed * 2.4)) ** 8;
    beaconGlow.emissiveIntensity = 1.4 + beaconPulse * 5.5;
    beaconLight.intensity = 1.2 + beaconPulse * 7;

    const cycle = (elapsed % 34) / 34;
    const lift = 1 - Math.abs(cycle * 2 - 1);
    elevator.position.y = 9 + lift * (crownFloorY - 18);
    elevator.rotation.y += dt * 0.16;

    palmCrowns.forEach((crownGroup, index) => {
      crownGroup.rotation.z = Math.sin(elapsed * 0.55 + index * 1.4) * 0.035;
    });
  };

  const setDetailVisible = (visible: boolean) => {
    detail.visible = visible;
  };

  const dispose = () => {
    root.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.LineSegments) {
        object.geometry?.dispose();
        const material = object.material;
        if (Array.isArray(material)) material.forEach((m) => m.dispose());
        else material?.dispose();
      }
    });
    root.parent?.remove(root);
  };

  return { root, update, setDetailVisible, dispose };
}

/** Detailed five-car train with an armored Vader-inspired lead car. */
export function buildVolcanoFlexTrainCar(index: number, front: boolean): THREE.Group {
  const car = new THREE.Group();
  car.name = front ? 'volcano-flex-lead-car' : `volcano-flex-car-${index}`;
  const armor = new THREE.MeshPhysicalMaterial({
    color: 0x08090b,
    roughness: 0.2,
    metalness: 0.86,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
    envMapIntensity: 2.0,
  });
  const steel = new THREE.MeshPhysicalMaterial({
    color: 0x484c54,
    roughness: 0.24,
    metalness: 0.95,
    clearcoat: 0.45,
    clearcoatRoughness: 0.12,
    envMapIntensity: 1.85,
  });
  const trim = new THREE.MeshPhysicalMaterial({
    color: 0xb51622,
    emissive: 0x650007,
    emissiveIntensity: 0.32,
    roughness: 0.24,
    metalness: 0.3,
    clearcoat: 0.92,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1.8,
  });
  const seatMat = new THREE.MeshPhysicalMaterial({
    color: 0x160f0e,
    roughness: 0.56,
    metalness: 0.04,
    clearcoat: 0.24,
    clearcoatRoughness: 0.4,
    envMapIntensity: 0.8,
  });
  const lensMat = new THREE.MeshPhysicalMaterial({
    color: 0x220202,
    emissive: 0xff1a00,
    emissiveIntensity: 1.9,
    roughness: 0.09,
    metalness: 0.25,
    clearcoat: 1.0,
    clearcoatRoughness: 0.03,
    envMapIntensity: 2.2,
  });

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.22, 2.18), steel);
  chassis.position.y = 0.12;
  chassis.castShadow = true;
  car.add(chassis);

  const belly = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.2, 1.5), armor);
  belly.position.set(0, -0.04, 0);
  car.add(belly);

  for (const side of [-1, 1]) {
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.34, 2.0), armor);
    skirt.position.set(side * 0.72, 0.12, 0);
    skirt.rotation.z = side * -0.13;
    car.add(skirt);
    const glowStrip = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.055, 1.52), trim);
    glowStrip.position.set(side * 0.78, 0.29, 0.06);
    car.add(glowStrip);
  }

  const wheels: THREE.Mesh[] = [];
  const wheelGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.12, 16);
  wheelGeo.rotateZ(Math.PI / 2);
  for (const side of [-1, 1]) {
    for (const axleZ of [-0.76, 0.76]) {
      for (const offset of [-0.11, 0.11]) {
        const wheel = new THREE.Mesh(wheelGeo, steel);
        wheel.name = 'coaster-wheel';
        wheel.position.set(side * 0.6, 0.01, axleZ + offset);
        wheel.userData.radius = 0.2;
        car.add(wheel);
        wheels.push(wheel);
      }
    }
  }
  for (const side of [-1, 1]) {
    for (const axleZ of [-0.76, 0.76]) {
      const housing = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.28, 0.34), armor);
      housing.position.set(side * 0.62, 0.16, axleZ);
      car.add(housing);
    }
  }
  car.userData.wheels = wheels;

  const floor = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.12, 1.78), armor);
  floor.position.y = 0.36;
  car.add(floor);

  for (const seatX of [-0.3, 0.3]) {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.18, 0.5), seatMat);
    seat.name = 'coaster-seat';
    seat.position.set(seatX, 0.55, -0.05);
    car.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.7, 0.16), armor);
    back.name = 'seat-back';
    back.position.set(seatX, 0.91, -0.36);
    back.rotation.x = -0.14;
    car.add(back);
    const headrest = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.24, 0.16), seatMat);
    headrest.name = 'headrest';
    headrest.position.set(seatX, 1.3, -0.44);
    car.add(headrest);

    // Over-the-shoulder restraint with a locking lap bar.
    for (const s of [-1, 1]) {
      const upright = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.66, 8), steel);
      upright.position.set(seatX + s * 0.27, 1.03, -0.18);
      upright.rotation.x = -0.1;
      car.add(upright);
    }
    const overhead = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.68, 8), steel);
    overhead.name = 'over-shoulder-restraint';
    overhead.rotation.z = Math.PI / 2;
    overhead.position.set(seatX, 1.34, 0.06);
    car.add(overhead);
    const lapBar = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.075, 0.11), trim);
    lapBar.name = 'lap-bar';
    lapBar.position.set(seatX, 0.77, 0.23);
    car.add(lapBar);
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.1, 0.08), lensMat);
    buckle.name = 'restraint-lock';
    buckle.position.set(seatX, 0.81, 0.28);
    car.add(buckle);
  }

  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.34, 0.36, 0.48), armor);
  nose.position.set(0, 0.6, 1.0);
  nose.rotation.x = -0.12;
  car.add(nose);

  const headlampMat = new THREE.MeshStandardMaterial({
    color: 0xfff2d6,
    emissive: 0xffb066,
    emissiveIntensity: 2.2,
    roughness: 0.2,
  });
  for (const x of [-0.45, 0.45]) {
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), headlampMat);
    lamp.position.set(x, 0.35, 1.15);
    car.add(lamp);
  }

  if (front) {
    const mask = new THREE.Group();
    mask.name = 'vader-mask';
    mask.position.set(0, 0.85, 1.0);
    mask.rotation.x = -0.1;

    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.44, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.68),
      armor,
    );
    dome.scale.set(1.06, 0.92, 1.08);
    dome.position.y = 0.14;
    mask.add(dome);

    const faceplate = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.5, 0.18), armor);
    faceplate.position.set(0, -0.03, 0.27);
    faceplate.rotation.x = -0.13;
    mask.add(faceplate);

    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.115, 14, 10), lensMat);
      eye.name = 'vader-eye-lens';
      eye.scale.set(1.58, 0.58, 0.45);
      eye.position.set(side * 0.17, 0.09, 0.39);
      eye.rotation.z = side * 0.2;
      mask.add(eye);
      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.08), armor);
      brow.position.set(side * 0.17, 0.2, 0.4);
      brow.rotation.z = side * -0.25;
      mask.add(brow);
      const cheek = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.42, 5), armor);
      cheek.position.set(side * 0.28, -0.2, 0.31);
      cheek.rotation.z = side * -0.45;
      mask.add(cheek);
      const tusk = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.05, 0.24, 6), steel);
      tusk.position.set(side * 0.24, -0.35, 0.37);
      tusk.rotation.z = side * -0.25;
      mask.add(tusk);
    }

    const grille = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.36, 4), steel);
    grille.name = 'vader-breathing-grille';
    grille.rotation.x = -0.18;
    grille.position.set(0, -0.24, 0.41);
    mask.add(grille);
    for (let i = 0; i < 3; i++) {
      const slot = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.025, 0.03), lensMat);
      slot.position.set(0, -0.12 - i * 0.07, 0.45);
      mask.add(slot);
    }
    const crest = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.2), steel);
    crest.position.set(0, 0.43, 0.02);
    mask.add(crest);
    car.add(mask);
  }

  car.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  return car;
}
