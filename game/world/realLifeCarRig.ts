import * as THREE from 'three';
import { ensureGeometryHasUv, getCrossDrilledRotorTexture } from './textures';
import {
  buildCabinDetailKit,
  buildDetailedSteeringWheel,
  buildRealisticGrilleAssembly,
  buildRealisticHeadlightPod,
  buildRealisticSideMirror,
  buildRealisticTaillightPod,
  buildWindshieldWipers,
  createAutomotiveGlassMaterial,
  createAutomotiveLeatherMaterial,
  createAutomotivePaintMaterial,
  createCarbonFiberMaterial,
  createChromeMaterial,
  createConvertibleFabricMaterial,
  createTireRubberMaterial,
  createTireSidewallMaterial,
  createWalnutWoodMaterial,
  getGaugeClusterMap,
} from './automotiveMaterials';

export type VehicleArchetype =
  | 'mclaren'
  | 'chevy_tahoe'
  | 'cadillac'
  | 'donk'
  | 'slab'
  | 'lowrider'
  | 'generic_car';

export interface GarageCarVisualConfig {
  id: string;
  displayName: string;
  archetype: VehicleArchetype;
  paintColor: string;
  secondaryColor?: string;
  rimColor?: string;
  underglowColor?: string;
  wheelRadius: number;
  wheelWidth: number;
  wheelBaseZ: number;
  trackWidthX: number;
  hasSubwooferWall?: boolean;
  liveryText?: {
    title: string;
    badge?: string;
    accentColor: string;
  };
}

export interface RealLifeCarRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  wheels: THREE.Group[];
  subCones: THREE.Mesh[];
  dispose: () => void;
}

export function normalizeCarArchetype(rawNameOrId: string): VehicleArchetype {
  const s = rawNameOrId.toLowerCase();
  if (s.includes('mclaren') || s.includes('720s') || s.includes('supercar')) return 'mclaren';
  if (s.includes('tahoe') || s.includes('subwoofer') || s.includes('savage life')) return 'chevy_tahoe';
  if (s.includes('cadillac') || s.includes('coupe') || s.includes('deville') || s.includes('caddy')) return 'cadillac';
  if (s.includes('donk')) return 'donk';
  if (s.includes('slab')) return 'slab';
  if (s.includes('lowrider') || s.includes('hydraul')) return 'lowrider';
  return 'generic_car';
}

export function buildSilhouetteGeometry(archetype: VehicleArchetype): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();

  if (archetype === 'mclaren') {
    // Sculpted teardrop low-slung exotic supercar wedge with curved fender arches
    shape.moveTo(-2.18, 0.34);
    shape.lineTo(-1.74, 0.34);
    shape.absarc(-1.32, 0.36, 0.42, Math.PI, 0, true);
    shape.lineTo(0.92, 0.32);
    shape.absarc(1.38, 0.36, 0.42, Math.PI, 0, true);
    shape.lineTo(2.22, 0.28);
    shape.quadraticCurveTo(2.36, 0.42, 2.26, 0.54);
    shape.quadraticCurveTo(1.56, 0.74, 0.86, 0.78);
    shape.quadraticCurveTo(0.46, 1.0, 0.12, 1.15);
    shape.lineTo(-0.78, 1.16);
    shape.quadraticCurveTo(-1.42, 0.98, -1.84, 0.88);
    shape.lineTo(-2.18, 0.8);
    shape.closePath();
  } else if (archetype === 'chevy_tahoe') {
    // Full-size SUV with bold nose, sculpted wheel openings, upright cabin, and squared rear cargo hatch
    shape.moveTo(-2.38, 0.4);
    shape.lineTo(-1.82, 0.4);
    shape.absarc(-1.32, 0.44, 0.52, Math.PI, 0, true);
    shape.lineTo(0.9, 0.4);
    shape.absarc(1.44, 0.44, 0.52, Math.PI, 0, true);
    shape.lineTo(2.4, 0.42);
    shape.quadraticCurveTo(2.49, 0.72, 2.42, 0.95);
    shape.lineTo(1.16, 1.05);
    shape.quadraticCurveTo(0.84, 1.32, 0.58, 1.5);
    shape.lineTo(-2.26, 1.52);
    shape.quadraticCurveTo(-2.42, 1.44, -2.4, 1.34);
    shape.closePath();
  } else if (archetype === 'cadillac') {
    // Authentic 1959/1960s Cadillac silhouette with sweeping rear tailfin line & curved hood crown
    shape.moveTo(-2.46, 0.38);
    shape.lineTo(-1.72, 0.38);
    shape.absarc(-1.24, 0.4, 0.44, Math.PI, 0, true);
    shape.lineTo(0.92, 0.38);
    shape.absarc(1.38, 0.4, 0.44, Math.PI, 0, true);
    shape.lineTo(2.45, 0.38);
    shape.quadraticCurveTo(2.53, 0.66, 2.45, 0.88);
    shape.quadraticCurveTo(1.56, 0.96, 0.76, 0.95);
    shape.quadraticCurveTo(0.42, 1.21, 0.16, 1.34);
    shape.lineTo(-1.14, 1.34);
    shape.quadraticCurveTo(-1.42, 1.12, -1.68, 0.94);
    shape.quadraticCurveTo(-2.12, 0.94, -2.48, 1.04);
    shape.closePath();
  } else if (archetype === 'lowrider' || archetype === 'slab') {
    shape.moveTo(-2.45, 0.38);
    shape.lineTo(-1.72, 0.38);
    shape.absarc(-1.24, 0.4, 0.44, Math.PI, 0, true);
    shape.lineTo(0.92, 0.38);
    shape.absarc(1.38, 0.4, 0.44, Math.PI, 0, true);
    shape.lineTo(2.44, 0.38);
    shape.quadraticCurveTo(2.52, 0.64, 2.45, 0.86);
    shape.quadraticCurveTo(1.55, 0.93, 0.76, 0.94);
    shape.quadraticCurveTo(0.42, 1.2, 0.16, 1.34);
    shape.lineTo(-1.14, 1.34);
    shape.quadraticCurveTo(-1.44, 1.12, -1.68, 0.94);
    shape.lineTo(-2.45, 0.88);
    shape.closePath();
  } else if (archetype === 'donk') {
    shape.moveTo(-2.28, 0.56);
    shape.lineTo(-1.72, 0.56);
    shape.absarc(-1.24, 0.56, 0.5, Math.PI, 0, true);
    shape.lineTo(0.88, 0.56);
    shape.absarc(1.36, 0.56, 0.5, Math.PI, 0, true);
    shape.lineTo(2.26, 0.56);
    shape.quadraticCurveTo(2.34, 0.8, 2.28, 1.04);
    shape.lineTo(0.72, 1.12);
    shape.quadraticCurveTo(0.42, 1.36, 0.16, 1.52);
    shape.lineTo(-1.1, 1.52);
    shape.quadraticCurveTo(-1.42, 1.3, -1.62, 1.12);
    shape.lineTo(-2.28, 1.06);
    shape.closePath();
  } else {
    shape.moveTo(-2.15, 0.36);
    shape.lineTo(-1.68, 0.36);
    shape.absarc(-1.22, 0.38, 0.42, Math.PI, 0, true);
    shape.lineTo(0.84, 0.36);
    shape.absarc(1.28, 0.38, 0.42, Math.PI, 0, true);
    shape.lineTo(2.16, 0.36);
    shape.quadraticCurveTo(2.24, 0.62, 2.18, 0.84);
    shape.lineTo(0.7, 0.92);
    shape.quadraticCurveTo(0.38, 1.15, 0.1, 1.3);
    shape.lineTo(-1.05, 1.3);
    shape.quadraticCurveTo(-1.35, 1.1, -1.56, 0.9);
    shape.lineTo(-2.15, 0.84);
    shape.closePath();
  }

  const width = archetype === 'chevy_tahoe' || archetype === 'slab' ? 1.88 : 1.74;
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: width,
    bevelEnabled: true,
    bevelSegments: 5,
    steps: 1,
    bevelSize: 0.065,
    bevelThickness: 0.065,
  });

  geo.rotateY(-Math.PI / 2);
  geo.translate(width * 0.5, 0, 0);
  geo.computeVertexNormals();
  return ensureGeometryHasUv(geo) as THREE.ExtrudeGeometry;
}

const _liveryTextureCache = new Map<string, THREE.CanvasTexture>();

function createLiveryTexture(
  title: string,
  badge: string | undefined,
  accentColor: string,
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const isTouch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
  const w = isTouch ? 512 : 768;
  const h = isTouch ? 256 : 384;
  const cacheKey = `${title}|${badge ?? ''}|${accentColor}|${w}`;
  const cached = _liveryTextureCache.get(cacheKey);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const scale = w / 1024;
  ctx.scale(scale, scale);

  ctx.fillStyle = '#11141b';
  ctx.fillRect(0, 0, 1024, 512);

  ctx.fillStyle = accentColor;
  ctx.fillRect(0, 336, 1024, 26);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 66px Impact, Arial Black, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title.toUpperCase(), 512, 165);

  if (badge) {
    ctx.fillStyle = accentColor;
    ctx.fillRect(512 - 220, 205, 440, 92);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 54px Impact, Arial Black, sans-serif';
    ctx.fillText(badge.toUpperCase(), 512, 270);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = isTouch ? 2 : 4;
  tex.userData = { sharedAsset: true };
  tex.needsUpdate = true;
  _liveryTextureCache.set(cacheKey, tex);
  return tex;
}

export function buildRealLifeCarRig(config: GarageCarVisualConfig): RealLifeCarRig {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const isPearl = config.archetype === 'cadillac';
  const isSuv = config.archetype === 'chevy_tahoe';
  const isWedge = config.archetype === 'mclaren';
  const hasWhitewalls =
    isPearl || config.archetype === 'lowrider' || config.archetype === 'slab';

  const paintMat = createAutomotivePaintMaterial(config.paintColor, { isPearl });
  const chromeMat = createChromeMaterial(config.rimColor ?? '#f8fafc');
  const goldTrimMat = createChromeMaterial(0xfacc15);
  const trimMat = new THREE.MeshStandardMaterial({
    color: config.secondaryColor ?? '#1a1e26',
    metalness: 0.78,
    roughness: 0.22,
  });
  const glassMat = createAutomotiveGlassMaterial(0.38);
  const leatherMat = createAutomotiveLeatherMaterial(isPearl ? '#e7dcc8' : '#18181b');
  const dashTrimMat = isPearl ? createWalnutWoodMaterial() : createCarbonFiberMaterial();
  const dashPadMat = new THREE.MeshStandardMaterial({
    color: isPearl ? '#27201b' : '#0f1217',
    roughness: 0.65,
    metalness: 0.08,
  });
  const tireTreadMat = createTireRubberMaterial();
  const tireSidewallMat = createTireSidewallMaterial();
  const whitewallMat = new THREE.MeshStandardMaterial({
    color: '#f8fafc',
    roughness: 0.45,
    metalness: 0.04,
  });
  const rotorTex = typeof document !== 'undefined' ? getCrossDrilledRotorTexture() : null;
  const rotorMat = new THREE.MeshStandardMaterial({
    color: '#cbd5e1',
    map: rotorTex,
    metalness: 0.88,
    roughness: 0.24,
  });
  const caliperMat = new THREE.MeshPhysicalMaterial({
    color: isWedge ? '#f97316' : isPearl ? '#a3e635' : '#ef4444',
    metalness: 0.52,
    roughness: 0.18,
    clearcoat: 0.9,
  });
  const subBoxMat = new THREE.MeshStandardMaterial({
    color: '#0c0d10',
    metalness: 0.2,
    roughness: 0.65,
  });
  const subConeMat = new THREE.MeshStandardMaterial({
    color: '#252934',
    metalness: 0.35,
    roughness: 0.45,
  });

  // 1. Sculpted contoured car body silhouette with beveled wheel arches
  const bodyGeo = buildSilhouetteGeometry(config.archetype);
  const bodyMesh = new THREE.Mesh(bodyGeo, paintMat);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  bodyMesh.userData.isVehicleShadowHull = true;
  bodyGroup.add(bodyMesh);

  // Subtle sculpted hood crown crease / center ornament spear
  const bodyW = isSuv || config.archetype === 'slab' ? 1.88 : 1.74;
  const frontZ = isWedge ? 2.24 : isSuv ? 2.43 : 2.42;
  const rearZ = isWedge ? -2.16 : isSuv ? -2.4 : -2.42;
  const hlY = isWedge ? 0.5 : isSuv ? 0.74 : config.archetype === 'donk' ? 0.84 : 0.66;

  // Tinted windshield canopy / window band + chrome window frame + windshield wipers
  const glassW = bodyW - 0.12;
  const glassH = isWedge ? 0.24 : 0.32;
  const glassY = isWedge ? 0.91 : isSuv ? 1.24 : config.archetype === 'donk' ? 1.32 : 1.12;
  const glassZ = isSuv ? -0.42 : -0.25;
  const glassGeo = new THREE.BoxGeometry(glassW, glassH, isSuv ? 1.95 : 1.28);
  const glassMesh = new THREE.Mesh(glassGeo, glassMat);
  glassMesh.position.set(0, glassY, glassZ);
  bodyGroup.add(glassMesh);

  // Chrome A-pillar / roof window surrounds + twin windshield wipers
  const windshieldZ = glassZ + (isSuv ? 0.98 : 0.64);
  const headerTrim = new THREE.Mesh(
    new THREE.BoxGeometry(glassW + 0.04, 0.032, 0.045),
    isWedge ? trimMat : chromeMat,
  );
  headerTrim.position.set(0, glassY + glassH * 0.5, windshieldZ - 0.04);
  bodyGroup.add(headerTrim);

  const wipers = buildWindshieldWipers(glassW * 0.78);
  wipers.position.set(0, glassY - glassH * 0.44, windshieldZ + 0.06);
  bodyGroup.add(wipers);

  // 2. Full Photorealistic Interior (Seats, Dash, Gauges, Console, Rearview Mirror, Visors, Pedals)
  const seatGeo = new THREE.BoxGeometry(0.46, 0.44, 0.44);
  const headrestGeo = new THREE.BoxGeometry(0.24, 0.15, 0.1);
  const seatY = isWedge ? 0.68 : isSuv ? 0.88 : 0.82;
  [-0.4, 0.4].forEach((sx) => {
    const seat = new THREE.Mesh(seatGeo, leatherMat);
    seat.position.set(sx, seatY, -0.18);
    seat.rotation.x = -0.14;
    const hr = new THREE.Mesh(headrestGeo, leatherMat);
    hr.position.set(sx, seatY + 0.26, -0.24);
    bodyGroup.add(seat, hr);
  });

  // Padded dash + wood/carbon trim + backlit dual-dial gauge cluster
  const dashBody = new THREE.Mesh(
    new THREE.BoxGeometry(glassW - 0.14, 0.18, 0.34),
    dashPadMat,
  );
  dashBody.position.set(0, seatY + 0.08, 0.46);
  const dashFascia = new THREE.Mesh(
    new THREE.BoxGeometry(glassW - 0.18, 0.09, 0.04),
    dashTrimMat,
  );
  dashFascia.position.set(0, seatY + 0.06, 0.29);
  const centerConsole = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.18, 0.86),
    dashTrimMat,
  );
  centerConsole.position.set(0, seatY - 0.04, 0.02);
  const shifter = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.16, 8), chromeMat);
  shifter.position.set(0, seatY + 0.1, 0.12);
  const shifterKnob = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), chromeMat);
  shifterKnob.position.set(0, seatY + 0.19, 0.12);
  bodyGroup.add(dashBody, dashFascia, centerConsole, shifter, shifterKnob);

  const gaugeTex = getGaugeClusterMap();
  if (gaugeTex) {
    const gaugePlane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.38, 0.13),
      new THREE.MeshBasicMaterial({ map: gaugeTex }),
    );
    gaugePlane.position.set(-0.4, seatY + 0.1, 0.27);
    gaugePlane.rotation.y = Math.PI;
    bodyGroup.add(gaugePlane);
  }

  const cabinKit = buildCabinDetailKit({
    mirrorY: glassY + glassH * 0.32,
    mirrorZ: windshieldZ - 0.12,
    dashY: seatY + 0.12,
    pedalZ: 0.56,
    driverX: -0.4,
    trimMat: dashPadMat,
    chromeMat,
  });
  bodyGroup.add(cabinKit);

  const steerWheel = buildDetailedSteeringWheel({
    style: isWedge ? 'supercar' : isSuv ? 'sport_suv' : 'classic_luxury',
    radius: 0.15,
    chromeMat,
    leatherMat,
  });
  steerWheel.position.set(-0.4, seatY + 0.18, 0.26);
  steerWheel.rotation.x = 0.45;
  bodyGroup.add(steerWheel);

  // Stayfast woven canvas droptop soft-top on Cadillac showroom cars
  if (isPearl) {
    const stayfastTopMat = createConvertibleFabricMaterial(0x181a20);
    const softTop = new THREE.Mesh(
      new THREE.BoxGeometry(glassW + 0.06, 0.08, 1.32),
      stayfastTopMat,
    );
    softTop.position.set(0, 1.29, -0.25);
    bodyGroup.add(softTop);
  }

  // 3. Chrome Side Spear Molding, Sculpted Mirrors & Recessed Door Handles
  const spearY = isWedge ? 0.54 : isSuv ? 0.72 : 0.66;
  const sideSpear = new THREE.Mesh(
    new THREE.BoxGeometry(bodyW + 0.14, 0.032, 3.85),
    isWedge ? trimMat : chromeMat,
  );
  sideSpear.position.set(0, spearY, 0.02);
  bodyGroup.add(sideSpear);

  ([-1, 1] as const).forEach((side) => {
    const mirror = buildRealisticSideMirror({
      side,
      housingMat: isWedge ? trimMat : paintMat,
      chromeMat,
      style: isPearl || config.archetype === 'lowrider' ? 'classic_round' : 'aero',
    });
    mirror.position.set(side * (bodyW * 0.5 + 0.05), glassY - 0.11, windshieldZ - 0.12);
    bodyGroup.add(mirror);

    const handle = new THREE.Mesh(
      new THREE.BoxGeometry(0.036, 0.032, 0.16),
      isWedge ? trimMat : chromeMat,
    );
    handle.position.set(side * (bodyW * 0.5 + 0.07), spearY + 0.12, -0.22);
    bodyGroup.add(handle);
  });

  // 4. 3D Recessed Grille Assembly + Front License Plate + Multi-Layer Headlights & Taillights
  if (!isWedge) {
    const grille = buildRealisticGrilleAssembly({
      width: isSuv ? 1.24 : 1.18,
      height: isSuv ? 0.34 : 0.26,
      chromeMat,
      horizontalBars: isPearl ? 2 : 3,
    });
    grille.position.set(0, hlY - 0.02, frontZ + 0.03);
    bodyGroup.add(grille);

    // Classic front license plate frame in lower chrome bumper pocket
    const plateFrame = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.03), chromeMat);
    plateFrame.position.set(0, 0.42, frontZ + 0.08);
    const plateFace = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.13, 0.034),
      new THREE.MeshStandardMaterial({ color: 0x090b10, roughness: 0.4 }),
    );
    plateFace.position.set(0, 0.42, frontZ + 0.082);
    bodyGroup.add(plateFrame, plateFace);
  }

  // Headlight Pods
  if (isPearl || config.archetype === 'lowrider' || config.archetype === 'donk' || config.archetype === 'slab') {
    [-0.78, -0.63, 0.63, 0.78].forEach((hx) => {
      const pod = buildRealisticHeadlightPod({
        shape: 'round',
        radius: 0.068,
        chromeMat,
        withHood: isPearl,
      });
      pod.position.set(hx, hlY + 0.02, frontZ + 0.02);
      bodyGroup.add(pod);
    });
  } else {
    [-0.64, 0.64].forEach((hx) => {
      const pod = buildRealisticHeadlightPod({
        shape: 'quad_bar',
        width: 0.28,
        height: 0.095,
        chromeMat,
        tintColor: 0xe0f2fe,
      });
      pod.position.set(hx, hlY, frontZ);
      bodyGroup.add(pod);
    });
  }

  // Taillight Assemblies
  if (isPearl) {
    // 1959/1960s Cadillac signature twin bullet rocket-pod taillights + swept chrome tailfin crest spears + whip antenna!
    [-0.84, 0.84].forEach((fx) => {
      // Swept sculpted tailfin ridge + chrome spear
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.24, 1.08), paintMat);
      fin.position.set(fx, 0.94, rearZ + 0.56);
      fin.rotation.x = -0.14;
      const finSpear = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.036, 1.12), chromeMat);
      finSpear.position.set(fx, 1.04, rearZ + 0.56);
      finSpear.rotation.x = -0.14;
      bodyGroup.add(fin, finSpear);

      // Twin stacked chrome rocket-pod taillights
      const upperBullet = buildRealisticTaillightPod({
        style: 'cadillac_bullet',
        chromeMat,
      });
      upperBullet.position.set(fx, 0.98, rearZ + 0.02);
      const lowerBullet = buildRealisticTaillightPod({
        style: 'cadillac_bullet',
        chromeMat,
      });
      lowerBullet.position.set(fx, 0.72, rearZ + 0.02);
      bodyGroup.add(upperBullet, lowerBullet);

      // Chrome fender spear ornament near front headlight brows
      const fenderOrnament = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.045, 0.34), chromeMat);
      fenderOrnament.position.set(fx, hlY + 0.19, frontZ - 0.24);
      bodyGroup.add(fenderOrnament);
    });

    // Front hood V-crest ornament + slim rear-right chrome whip antenna
    const vCrestL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.022, 0.04), goldTrimMat);
    vCrestL.position.set(-0.1, hlY + 0.22, frontZ - 0.14);
    vCrestL.rotation.z = -0.18;
    const vCrestR = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.022, 0.04), goldTrimMat);
    vCrestR.position.set(0.1, hlY + 0.22, frontZ - 0.14);
    vCrestR.rotation.z = 0.18;
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.008, 0.65, 6), chromeMat);
    antenna.position.set(0.82, 1.18, frontZ - 0.52);
    bodyGroup.add(vCrestL, vCrestR, antenna);
  } else if (config.archetype === 'lowrider') {
    [-0.78, -0.62, -0.46, 0.46, 0.62, 0.78].forEach((tx) => {
      const pod = buildRealisticTaillightPod({ style: 'round', radius: 0.052, chromeMat });
      pod.position.set(tx, hlY + 0.05, rearZ);
      bodyGroup.add(pod);
    });
  } else {
    [-0.72, 0.72].forEach((tx) => {
      const pod = buildRealisticTaillightPod({
        style: 'blade',
        width: isSuv ? 0.16 : 0.42,
        height: isSuv ? 0.36 : 0.09,
        chromeMat,
      });
      pod.position.set(tx, hlY + 0.06, rearZ);
      bodyGroup.add(pod);
    });
  }

  // 5. Mirror Chrome Bumpers (+ Cadillac Dagmar pods) & Dual Chrome Exhaust Tips
  const bumperMat = isWedge ? trimMat : chromeMat;
  const frontLip = new THREE.Mesh(
    new THREE.BoxGeometry(config.trackWidthX + 0.14, 0.18, 0.22),
    bumperMat,
  );
  frontLip.position.set(0, isWedge ? 0.34 : 0.44, frontZ - 0.1);
  const rearLip = new THREE.Mesh(
    new THREE.BoxGeometry(config.trackWidthX + 0.14, 0.18, 0.22),
    bumperMat,
  );
  rearLip.position.set(0, isWedge ? 0.38 : 0.46, rearZ + 0.1);
  bodyGroup.add(frontLip, rearLip);

  if (isPearl) {
    // Signature Cadillac front Dagmar chrome bumper cones
    [-0.58, 0.58].forEach((dx) => {
      const dagmar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.088, 0.16, 14),
        chromeMat,
      );
      dagmar.rotation.x = Math.PI / 2;
      dagmar.position.set(dx, 0.45, frontZ + 0.04);
      bodyGroup.add(dagmar);
    });
  }

  const exhaustGeo = new THREE.CylinderGeometry(0.048, 0.048, 0.26, 12);
  exhaustGeo.rotateX(Math.PI / 2);
  [-0.54, 0.54].forEach((ex) => {
    const tip = new THREE.Mesh(exhaustGeo, chromeMat);
    tip.position.set(ex, isWedge ? 0.38 : 0.36, rearZ - 0.04);
    bodyGroup.add(tip);
  });

  if (isWedge) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.055, 0.32), trimMat);
    wing.position.set(0, 1.02, -2.02);
    wing.rotation.x = 0.14;
    [-0.52, 0.52].forEach((px) => {
      const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.22), trimMat);
      pylon.position.set(px, 0.9, -1.98);
      bodyGroup.add(pylon);
    });
    bodyGroup.add(wing);
  }

  // Optional side livery (e.g., SAVAGE LIFE GAMING + SUBSCRIBE)
  if (config.liveryText) {
    const tex = createLiveryTexture(
      config.liveryText.title,
      config.liveryText.badge,
      config.liveryText.accentColor,
    );
    const liveryMat = tex
      ? new THREE.MeshStandardMaterial({
          map: tex,
          roughness: 0.28,
          metalness: 0.25,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1,
        })
      : new THREE.MeshStandardMaterial({
          color: config.liveryText.accentColor,
          roughness: 0.28,
          metalness: 0.25,
        });
    const planeGeo = new THREE.PlaneGeometry(2.3, 0.56);
    const halfW = config.trackWidthX * 0.5 + 0.08;

    const leftSide = new THREE.Mesh(planeGeo, liveryMat);
    leftSide.position.set(-halfW, 0.74, -0.4);
    leftSide.rotation.y = -Math.PI / 2;

    const rightSide = new THREE.Mesh(planeGeo, liveryMat);
    rightSide.position.set(halfW, 0.74, -0.4);
    rightSide.rotation.y = Math.PI / 2;

    bodyGroup.add(leftSide, rightSide);
  }

  // Optional rear subwoofer wall (no backseat Tahoe build)
  const subCones: THREE.Mesh[] = [];
  if (config.hasSubwooferWall) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.72, 0.52), subBoxMat);
    wall.position.set(0, 0.94, -0.88);
    bodyGroup.add(wall);

    const coneGeo = new THREE.CylinderGeometry(0.23, 0.11, 0.14, 24);
    coneGeo.rotateX(Math.PI / 2);

    const coords: Array<[number, number]> = [
      [-0.42, 1.14],
      [0.42, 1.14],
      [-0.42, 0.74],
      [0.42, 0.74],
    ];
    for (const [x, y] of coords) {
      const cone = new THREE.Mesh(coneGeo, subConeMat);
      cone.position.set(x, y, -0.6);
      cone.userData.baseZ = -0.6;
      bodyGroup.add(cone);
      subCones.push(cone);
    }
  }

  // Optional neon underglow bar
  if (config.underglowColor) {
    const glowMat = new THREE.MeshStandardMaterial({
      color: config.underglowColor,
      emissive: config.underglowColor,
      emissiveIntensity: 1.9,
      roughness: 0.2,
    });
    const glowBar = new THREE.Mesh(
      new THREE.BoxGeometry(config.trackWidthX * 0.86, 0.03, config.wheelBaseZ * 1.9),
      glowMat,
    );
    glowBar.position.set(0, 0.24, 0);
    bodyGroup.add(glowBar);
  }

  // 6. Photorealistic Treaded Wheels, Whitewalls, Deep-Dish Rims, Lug Nuts & Drilled Brake Rotors
  const wheels: THREE.Group[] = [];
  const outerR = config.wheelRadius;
  const rimR = outerR * (hasWhitewalls ? 0.68 : 0.78);
  const wWidth = config.wheelWidth;

  const tireTreadGeo = new THREE.CylinderGeometry(outerR, outerR, wWidth, 28, 1, true);
  tireTreadGeo.rotateZ(Math.PI / 2);
  const tireSideGeo = new THREE.TorusGeometry(
    (outerR + rimR) * 0.5,
    (outerR - rimR) * 0.54,
    10,
    28,
  );
  tireSideGeo.rotateY(Math.PI / 2);
  const whitewallGeo = new THREE.TorusGeometry(rimR + (outerR - rimR) * 0.36, 0.028, 8, 28);
  whitewallGeo.rotateY(Math.PI / 2);

  const rimLipGeo = new THREE.TorusGeometry(rimR, 0.026, 10, 28);
  rimLipGeo.rotateY(Math.PI / 2);
  const rimBarrelGeo = new THREE.CylinderGeometry(rimR, rimR, wWidth * 0.88, 24, 1, true);
  rimBarrelGeo.rotateZ(Math.PI / 2);

  const rotorGeo = new THREE.CylinderGeometry(rimR * 0.8, rimR * 0.8, 0.028, 24);
  rotorGeo.rotateZ(Math.PI / 2);
  ensureGeometryHasUv(rotorGeo);

  const caliperGeo = new THREE.BoxGeometry(0.075, rimR * 0.44, rimR * 0.24);
  const spokeGeo = new THREE.BoxGeometry(0.042, rimR * 0.92, 0.044);
  const hubCapGeo = new THREE.CylinderGeometry(rimR * 0.24, rimR * 0.26, wWidth * 0.22, 16);
  hubCapGeo.rotateZ(Math.PI / 2);
  const lugGeo = new THREE.CylinderGeometry(0.011, 0.011, 0.032, 6);
  lugGeo.rotateZ(Math.PI / 2);

  const halfTrack = config.trackWidthX * 0.5;
  const wheelOffsets: Array<[number, number, number, -1 | 1]> = [
    [-halfTrack, outerR, config.wheelBaseZ, -1],
    [halfTrack, outerR, config.wheelBaseZ, 1],
    [-halfTrack, outerR, -config.wheelBaseZ, -1],
    [halfTrack, outerR, -config.wheelBaseZ, 1],
  ];

  for (const [wx, wy, wz, side] of wheelOffsets) {
    const cornerRoot = new THREE.Group();
    cornerRoot.position.set(wx, wy, wz);

    const rotor = new THREE.Mesh(rotorGeo, rotorMat);
    rotor.position.x = -side * (wWidth * 0.08);
    const caliper = new THREE.Mesh(caliperGeo, caliperMat);
    caliper.position.set(-side * (wWidth * 0.06), rimR * 0.36, -rimR * 0.38);
    caliper.rotation.x = 0.45;
    cornerRoot.add(rotor, caliper);

    const spinPivot = new THREE.Group();
    const tireTread = new THREE.Mesh(tireTreadGeo, tireTreadMat);
    tireTread.userData.isVehicleShadowHull = true;
    tireTread.castShadow = true;

    const sidewallOut = new THREE.Mesh(tireSideGeo, tireSidewallMat);
    sidewallOut.position.x = side * (wWidth * 0.41);
    const sidewallIn = new THREE.Mesh(tireSideGeo, tireSidewallMat);
    sidewallIn.position.x = -side * (wWidth * 0.41);

    const rimBarrel = new THREE.Mesh(rimBarrelGeo, trimMat);
    const rimLip = new THREE.Mesh(rimLipGeo, chromeMat);
    rimLip.position.x = side * (wWidth * 0.44);
    const hubCap = new THREE.Mesh(hubCapGeo, chromeMat);
    hubCap.position.x = side * (wWidth * 0.34);

    spinPivot.add(tireTread, sidewallOut, sidewallIn, rimBarrel, rimLip, hubCap);

    if (hasWhitewalls) {
      const ww = new THREE.Mesh(whitewallGeo, whitewallMat);
      ww.position.x = side * (wWidth * 0.45);
      spinPivot.add(ww);
    }

    // 7 sculpted chrome spokes + 5 lug nuts
    for (let s = 0; s < 7; s++) {
      const a = (s / 7) * Math.PI * 2;
      const spoke = new THREE.Mesh(spokeGeo, chromeMat);
      spoke.position.set(
        side * (wWidth * 0.28),
        Math.cos(a) * (rimR * 0.48),
        Math.sin(a) * (rimR * 0.48),
      );
      spoke.rotation.x = a;
      spinPivot.add(spoke);
    }
    for (let l = 0; l < 5; l++) {
      const la = (l / 5) * Math.PI * 2;
      const lug = new THREE.Mesh(lugGeo, chromeMat);
      lug.position.set(
        side * (wWidth * 0.39),
        Math.cos(la) * (rimR * 0.16),
        Math.sin(la) * (rimR * 0.16),
      );
      spinPivot.add(lug);
    }

    cornerRoot.add(spinPivot);
    root.add(cornerRoot);
    wheels.push(spinPivot);
  }

  // Prune shadow casting on small interior/trim/glass/spoke/brake sub-meshes
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh && !obj.userData.isVehicleShadowHull) {
      obj.userData.noShadowCast = true;
      obj.castShadow = false;
    }
  });

  return {
    root,
    bodyGroup,
    wheels,
    subCones,
    dispose: () => {
      const seenGeo = new Set<THREE.BufferGeometry>();
      const seenMat = new Set<THREE.Material>();
      root.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          if (obj.geometry && !obj.geometry.userData?.sharedAsset && !seenGeo.has(obj.geometry)) {
            seenGeo.add(obj.geometry);
            obj.geometry.dispose();
          }
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const m of mats) {
            if (!m || m.userData?.sharedAsset || seenMat.has(m)) continue;
            seenMat.add(m);
            const std = m as THREE.MeshPhysicalMaterial;
            if (std.map && !std.map.userData?.sharedAsset) std.map.dispose();
            if (std.normalMap && !std.normalMap.userData?.sharedAsset) std.normalMap.dispose();
            if (std.clearcoatNormalMap && !std.clearcoatNormalMap.userData?.sharedAsset) {
              std.clearcoatNormalMap.dispose();
            }
            if (std.emissiveMap && !std.emissiveMap.userData?.sharedAsset) std.emissiveMap.dispose();
            m.dispose();
          }
        }
      });
    },
  };
}
