import * as THREE from 'three';
import { ensureGeometryHasUv, getCrossDrilledRotorTexture } from './textures';
import {
  buildCabinDetailKit,
  buildCadillacFenderBadges,
  buildDetailedSteeringWheel,
  buildDoorHandleAssembly,
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
  createMultiPistonCaliperMesh,
  createTireRubberMaterial,
  createTireSidewallMaterial,
  createWalnutWoodMaterial,
  getAmberSignalLensTextureSet,
  getCadillacCrestEmblemMap,
  getChevyBowtieMap,
  getGaugeClusterMap,
  getLicensePlateMap,
  getSculptedSpokeGeometry,
  HeadlightPodShape,
  markVehicleLightingPreserved,
  TaillightPodStyle,
} from './automotiveMaterials';
import {
  resolveVehicleArchetype,
  VehicleVisualArchetype,
} from '../systems/vehicleProfiles';

export type VehicleArchetype = VehicleVisualArchetype;

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

export interface RealLifeWheelCornerHandle {
  obj: THREE.Group;
  corner: 'fl' | 'fr' | 'rl' | 'rr';
  baseY: number;
}

export interface RealLifeCarRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  wheels: THREE.Group[];
  steerWheels: THREE.Group[];
  wheelCorners: RealLifeWheelCornerHandle[];
  doorLeft?: THREE.Group;
  doorRight?: THREE.Group;
  trunkLid?: THREE.Group;
  helmWheel?: THREE.Group;
  underglowMeshes?: THREE.Mesh[];
  underglowLight?: THREE.PointLight;
  subCones: THREE.Mesh[];
  dispose: () => void;
}

export function normalizeCarArchetype(rawNameOrId: string): VehicleArchetype {
  return resolveVehicleArchetype(rawNameOrId);
}

export function isExoticSupercarArchetype(archetype: VehicleArchetype): boolean {
  return (
    archetype !== 'chevy_tahoe' &&
    archetype !== 'cadillac' &&
    archetype !== 'donk' &&
    archetype !== 'slab' &&
    archetype !== 'lowrider' &&
    archetype !== 'generic_car'
  );
}

function getBodyDimensions(archetype: VehicleArchetype): {
  width: number;
  frontZ: number;
  rearZ: number;
  archZFront: number;
  archZRear: number;
} {
  switch (archetype) {
    case 'mclaren_speedtail':
      return { width: 1.76, frontZ: 2.34, rearZ: -2.54, archZFront: 1.44, archZRear: -1.42 };
    case 'koenigsegg_gemera':
      return { width: 1.84, frontZ: 2.32, rearZ: -2.32, archZFront: 1.48, archZRear: -1.46 };
    case 'bugatti_chiron':
    case 'bugatti_divo':
      return { width: 1.88, frontZ: 2.26, rearZ: -2.22, archZFront: 1.44, archZRear: -1.38 };
    case 'aston_valkyrie':
      return { width: 1.74, frontZ: 2.36, rearZ: -2.24, archZFront: 1.44, archZRear: -1.36 };
    case 'delage_d12':
      return { width: 1.7, frontZ: 2.38, rearZ: -2.26, archZFront: 1.42, archZRear: -1.36 };
    case 'aston_vantage_gt3':
    case 'sls_amg_black':
      return { width: 1.8, frontZ: 2.28, rearZ: -2.14, archZFront: 1.42, archZRear: -1.32 };
    case 'ferrari_monza_sp2':
      return { width: 1.8, frontZ: 2.28, rearZ: -2.16, archZFront: 1.4, archZRear: -1.32 };
    case 'lamborghini_sian':
    case 'huracan_gt3':
      return { width: 1.84, frontZ: 2.26, rearZ: -2.16, archZFront: 1.38, archZRear: -1.32 };
    case 'chevy_tahoe':
    case 'slab':
      return { width: 1.88, frontZ: 2.43, rearZ: -2.4, archZFront: 1.44, archZRear: -1.32 };
    case 'cadillac':
      return { width: 1.78, frontZ: 2.48, rearZ: -2.5, archZFront: 1.42, archZRear: -1.3 };
    case 'lowrider':
      return { width: 1.76, frontZ: 2.44, rearZ: -2.45, archZFront: 1.38, archZRear: -1.24 };
    case 'donk':
      return { width: 1.76, frontZ: 2.28, rearZ: -2.28, archZFront: 1.36, archZRear: -1.24 };
    default:
      return { width: 1.78, frontZ: 2.24, rearZ: -2.18, archZFront: 1.38, archZRear: -1.32 };
  }
}

export function buildSilhouetteGeometry(archetype: VehicleArchetype): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  const { width, archZFront, archZRear } = getBodyDimensions(archetype);

  if (archetype === 'mclaren_speedtail') {
    // Ultra-sleek elongated teardrop streamliner with long tapered tail
    shape.moveTo(-2.52, 0.32);
    shape.lineTo(archZRear - 0.42, 0.32);
    shape.absarc(archZRear, 0.36, 0.42, Math.PI, 0, true);
    shape.lineTo(archZFront - 0.44, 0.3);
    shape.absarc(archZFront, 0.36, 0.42, Math.PI, 0, true);
    shape.lineTo(2.3, 0.28);
    shape.quadraticCurveTo(2.42, 0.42, 2.3, 0.52);
    shape.quadraticCurveTo(1.56, 0.72, 0.88, 0.78);
    shape.quadraticCurveTo(0.42, 1.04, 0.04, 1.12);
    shape.lineTo(-0.76, 1.1);
    shape.quadraticCurveTo(-1.48, 0.9, -2.16, 0.68);
    shape.lineTo(-2.54, 0.56);
    shape.closePath();
  } else if (archetype === 'ferrari_monza_sp2') {
    // Open-cockpit barchetta speedster: long sculptural front hood, low open beltline, dual rear aero fairings
    shape.moveTo(-2.16, 0.34);
    shape.lineTo(archZRear - 0.42, 0.34);
    shape.absarc(archZRear, 0.36, 0.42, Math.PI, 0, true);
    shape.lineTo(archZFront - 0.44, 0.32);
    shape.absarc(archZFront, 0.36, 0.42, Math.PI, 0, true);
    shape.lineTo(2.26, 0.3);
    shape.quadraticCurveTo(2.38, 0.48, 2.26, 0.62);
    shape.quadraticCurveTo(1.5, 0.82, 0.62, 0.84);
    shape.lineTo(0.24, 0.78);
    shape.lineTo(-0.56, 0.8);
    shape.quadraticCurveTo(-0.78, 0.98, -1.04, 0.96);
    shape.lineTo(-2.14, 0.82);
    shape.closePath();
  } else if (archetype === 'aston_vantage_gt3' || archetype === 'sls_amg_black') {
    // Muscular long-hood front-engine GT coupe with cab-rearward roofline & short fastback tail
    shape.moveTo(-2.14, 0.34);
    shape.lineTo(archZRear - 0.42, 0.34);
    shape.absarc(archZRear, 0.36, 0.42, Math.PI, 0, true);
    shape.lineTo(archZFront - 0.44, 0.34);
    shape.absarc(archZFront, 0.36, 0.42, Math.PI, 0, true);
    shape.lineTo(2.26, 0.3);
    shape.quadraticCurveTo(2.36, 0.5, 2.24, 0.68);
    shape.quadraticCurveTo(1.52, 0.84, 0.62, 0.86);
    shape.quadraticCurveTo(0.28, 1.12, -0.02, 1.2);
    shape.lineTo(-0.88, 1.2);
    shape.quadraticCurveTo(-1.42, 1.0, -1.9, 0.88);
    shape.lineTo(-2.14, 0.84);
    shape.closePath();
  } else if (archetype === 'bugatti_chiron' || archetype === 'bugatti_divo') {
    // Wide muscular W16 hypercar with broad haunches & raised spine
    shape.moveTo(-2.22, 0.34);
    shape.lineTo(archZRear - 0.44, 0.34);
    shape.absarc(archZRear, 0.37, 0.44, Math.PI, 0, true);
    shape.lineTo(archZFront - 0.45, 0.32);
    shape.absarc(archZFront, 0.37, 0.44, Math.PI, 0, true);
    shape.lineTo(2.26, 0.3);
    shape.quadraticCurveTo(2.38, 0.46, 2.26, 0.64);
    shape.quadraticCurveTo(1.56, 0.8, 0.88, 0.86);
    shape.quadraticCurveTo(0.46, 1.1, 0.14, 1.2);
    shape.lineTo(-0.78, 1.2);
    shape.quadraticCurveTo(-1.38, 1.04, -1.94, 0.94);
    shape.lineTo(-2.22, 0.88);
    shape.closePath();
  } else if (archetype === 'koenigsegg_gemera') {
    // Extended 4-seat Mega-GT cabin profile
    shape.moveTo(-2.3, 0.34);
    shape.lineTo(archZRear - 0.43, 0.34);
    shape.absarc(archZRear, 0.37, 0.43, Math.PI, 0, true);
    shape.lineTo(archZFront - 0.44, 0.32);
    shape.absarc(archZFront, 0.37, 0.43, Math.PI, 0, true);
    shape.lineTo(2.3, 0.3);
    shape.quadraticCurveTo(2.42, 0.46, 2.28, 0.62);
    shape.quadraticCurveTo(1.58, 0.78, 0.96, 0.84);
    shape.quadraticCurveTo(0.58, 1.12, 0.24, 1.22);
    shape.lineTo(-1.02, 1.2);
    shape.quadraticCurveTo(-1.58, 1.02, -2.02, 0.88);
    shape.lineTo(-2.3, 0.84);
    shape.closePath();
  } else if (archetype === 'aston_valkyrie' || archetype === 'delage_d12') {
    // Extreme F1 Venturi undercut hypercar spine + jetfighter center teardrop bubble
    shape.moveTo(-2.24, 0.34);
    shape.lineTo(archZRear - 0.42, 0.34);
    shape.absarc(archZRear, 0.36, 0.42, Math.PI, 0, true);
    shape.lineTo(0.8, 0.42);
    shape.lineTo(archZFront - 0.44, 0.34);
    shape.absarc(archZFront, 0.36, 0.42, Math.PI, 0, true);
    shape.lineTo(2.34, 0.26);
    shape.quadraticCurveTo(2.42, 0.36, 2.3, 0.44);
    shape.quadraticCurveTo(1.56, 0.64, 0.82, 0.72);
    shape.quadraticCurveTo(0.42, 0.98, 0.04, 1.08);
    shape.lineTo(-0.78, 1.06);
    shape.quadraticCurveTo(-1.38, 0.86, -1.92, 0.78);
    shape.lineTo(-2.24, 0.72);
    shape.closePath();
  } else if (archetype === 'huracan_gt3' || archetype === 'lamborghini_sian') {
    // Sharp angular Lamborghini stealth fighter wedge
    shape.moveTo(-2.16, 0.34);
    shape.lineTo(archZRear - 0.42, 0.34);
    shape.absarc(archZRear, 0.36, 0.42, Math.PI, 0, true);
    shape.lineTo(archZFront - 0.44, 0.32);
    shape.absarc(archZFront, 0.36, 0.42, Math.PI, 0, true);
    shape.lineTo(2.26, 0.26);
    shape.lineTo(2.22, 0.48);
    shape.lineTo(0.86, 0.76);
    shape.lineTo(0.14, 1.12);
    shape.lineTo(-0.78, 1.12);
    shape.lineTo(-1.82, 0.88);
    shape.lineTo(-2.16, 0.82);
    shape.closePath();
  } else if (isExoticSupercarArchetype(archetype) || archetype === 'mclaren') {
    // Sculpted mid-engine exotic wedge (720S, SF90, P1 GTR, Huayra, generic exotic)
    shape.moveTo(-2.18, 0.34);
    shape.lineTo(archZRear - 0.42, 0.34);
    shape.absarc(archZRear, 0.36, 0.42, Math.PI, 0, true);
    shape.lineTo(archZFront - 0.44, 0.32);
    shape.absarc(archZFront, 0.36, 0.42, Math.PI, 0, true);
    shape.lineTo(2.22, 0.28);
    shape.quadraticCurveTo(2.36, 0.42, 2.26, 0.56);
    shape.quadraticCurveTo(1.56, 0.74, 0.86, 0.78);
    shape.quadraticCurveTo(0.46, 1.0, 0.12, 1.15);
    shape.lineTo(-0.78, 1.16);
    shape.quadraticCurveTo(-1.42, 0.98, -1.84, 0.88);
    shape.lineTo(-2.18, 0.8);
    shape.closePath();
  } else if (archetype === 'chevy_tahoe') {
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
    // 1959/1960 Collector Cadillac Coupe DeVille open convertible silhouette w/ crisp beltline & tailfins
    shape.moveTo(-2.5, 0.35);
    shape.lineTo(-1.74, 0.35);
    shape.absarc(-1.3, 0.39, 0.43, Math.PI, 0, true);
    shape.lineTo(0.96, 0.35);
    shape.absarc(1.42, 0.39, 0.43, Math.PI, 0, true);
    shape.lineTo(2.48, 0.35);
    shape.quadraticCurveTo(2.56, 0.62, 2.47, 0.86);
    shape.quadraticCurveTo(1.66, 0.93, 0.76, 0.91);
    shape.lineTo(0.45, 0.91);
    shape.lineTo(-1.14, 0.92);
    shape.quadraticCurveTo(-1.76, 0.94, -2.52, 1.08);
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

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: width,
    bevelEnabled: true,
    bevelSegments: 5,
    steps: 1,
    bevelSize: 0.068,
    bevelThickness: 0.068,
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

interface MarqueVisualSpec {
  headlightShape: HeadlightPodShape;
  taillightStyle: TaillightPodStyle;
  spokeCount: number;
  hasWing: boolean;
  wingStyle: 'gt3_swan' | 'twin_pylon' | 'f1_split' | 'none';
  hasRoofScoop: boolean;
  hasDorsalFin: boolean;
  exhaustLayout: 'quad_corner' | 'pagani_quad_center' | 'center_single' | 'dual_high' | 'gemera_top' | 'monza_quad';
  seatingLayout: 'two_seat' | 'center_seat' | 'tandem' | 'four_seat';
  openTopSpeedster: boolean;
  frontWheelCovers: boolean;
  hasBugattiCLine: boolean;
  hasFrontWishbones: boolean;
}

function getMarqueVisualSpec(archetype: VehicleArchetype): MarqueVisualSpec {
  const base: MarqueVisualSpec = {
    headlightShape: 'quad_bar',
    taillightStyle: 'blade',
    spokeCount: 10,
    hasWing: true,
    wingStyle: 'twin_pylon',
    hasRoofScoop: false,
    hasDorsalFin: false,
    exhaustLayout: 'quad_corner',
    seatingLayout: 'two_seat',
    openTopSpeedster: false,
    frontWheelCovers: false,
    hasBugattiCLine: false,
    hasFrontWishbones: false,
  };

  switch (archetype) {
    case 'mclaren_720s':
      return {
        ...base,
        headlightShape: 'mclaren_eye',
        taillightStyle: 'p1_crescent',
        spokeCount: 10,
        wingStyle: 'twin_pylon',
      };
    case 'aston_vantage_gt3':
      return {
        ...base,
        headlightShape: 'quad_bar',
        taillightStyle: 'blade',
        spokeCount: 12,
        wingStyle: 'gt3_swan',
      };
    case 'huracan_gt3':
      return {
        ...base,
        headlightShape: 'y_drl',
        taillightStyle: 'sian_hex',
        spokeCount: 10,
        wingStyle: 'gt3_swan',
        hasRoofScoop: true,
        hasDorsalFin: true,
      };
    case 'ferrari_sf90':
      return {
        ...base,
        headlightShape: 'l_blade',
        taillightStyle: 'ferrari_quad_rings',
        spokeCount: 5,
        hasWing: false,
        wingStyle: 'none',
        exhaustLayout: 'dual_high',
      };
    case 'sls_amg_black':
      return {
        ...base,
        headlightShape: 'quad_bar',
        taillightStyle: 'blade',
        spokeCount: 10,
        wingStyle: 'twin_pylon',
      };
    case 'mclaren_speedtail':
      return {
        ...base,
        headlightShape: 'l_blade',
        taillightStyle: 'speedtail_flush',
        spokeCount: 10,
        hasWing: false,
        wingStyle: 'none',
        exhaustLayout: 'dual_high',
        seatingLayout: 'center_seat',
        frontWheelCovers: true,
      };
    case 'mclaren_p1_gtr':
      return {
        ...base,
        headlightShape: 'mclaren_eye',
        taillightStyle: 'p1_crescent',
        spokeCount: 10,
        wingStyle: 'gt3_swan',
        hasRoofScoop: true,
        exhaustLayout: 'center_single',
      };
    case 'bugatti_chiron':
      return {
        ...base,
        headlightShape: 'quad_bugatti',
        taillightStyle: 'bugatti_blade',
        spokeCount: 10,
        hasWing: false,
        wingStyle: 'none',
        exhaustLayout: 'quad_corner',
        hasBugattiCLine: true,
      };
    case 'bugatti_divo':
      return {
        ...base,
        headlightShape: 'fang_drl',
        taillightStyle: 'bugatti_divo_fin',
        spokeCount: 10,
        wingStyle: 'twin_pylon',
        hasRoofScoop: true,
        hasDorsalFin: true,
        hasBugattiCLine: true,
      };
    case 'ferrari_monza_sp2':
      return {
        ...base,
        headlightShape: 'l_blade',
        taillightStyle: 'speedtail_flush',
        spokeCount: 5,
        hasWing: false,
        wingStyle: 'none',
        exhaustLayout: 'monza_quad',
        openTopSpeedster: true,
      };
    case 'lamborghini_sian':
      return {
        ...base,
        headlightShape: 'y_drl',
        taillightStyle: 'sian_hex',
        spokeCount: 12,
        wingStyle: 'twin_pylon',
      };
    case 'aston_valkyrie':
      return {
        ...base,
        headlightShape: 'fang_drl',
        taillightStyle: 'speedtail_flush',
        spokeCount: 10,
        wingStyle: 'f1_split',
        hasRoofScoop: true,
        hasDorsalFin: true,
        exhaustLayout: 'center_single',
        hasFrontWishbones: true,
      };
    case 'pagani_huayra':
      return {
        ...base,
        headlightShape: 'oval_pagani',
        taillightStyle: 'round',
        spokeCount: 14,
        wingStyle: 'f1_split',
        exhaustLayout: 'pagani_quad_center',
      };
    case 'koenigsegg_gemera':
      return {
        ...base,
        headlightShape: 'fang_drl',
        taillightStyle: 'blade',
        spokeCount: 5,
        hasWing: false,
        wingStyle: 'none',
        exhaustLayout: 'gemera_top',
        seatingLayout: 'four_seat',
      };
    case 'delage_d12':
      return {
        ...base,
        headlightShape: 'fang_drl',
        taillightStyle: 'sian_hex',
        spokeCount: 10,
        wingStyle: 'f1_split',
        hasRoofScoop: true,
        hasDorsalFin: true,
        exhaustLayout: 'center_single',
        seatingLayout: 'tandem',
        hasFrontWishbones: true,
      };
    default:
      return base;
  }
}

/**
 * Shared photorealistic assembly builder used both for the Underground Garage turntable preview
 * AND for open-world drivable exotic cars & collector classics (populating doors, decklid, wheels, steer pivots, corners, underglow).
 */
export function buildRealLifeCarRig(config: GarageCarVisualConfig): RealLifeCarRig {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const arch = config.archetype;
  const isPearl = arch === 'cadillac';
  const isSuv = arch === 'chevy_tahoe';
  const isExotic = isExoticSupercarArchetype(arch) || arch === 'mclaren';
  const hasWhitewalls = isPearl || arch === 'lowrider' || arch === 'slab';
  const marque = isExotic ? getMarqueVisualSpec(arch) : null;

  const paintMat = createAutomotivePaintMaterial(
    isPearl ? '#f8fafc' : config.paintColor,
    { isPearl },
  );
  const accentColor = config.secondaryColor ?? '#111827';
  const accentPaintMat = createAutomotivePaintMaterial(accentColor);
  const chromeMat = createChromeMaterial(config.rimColor ?? '#f8fafc');
  const goldTrimMat = createChromeMaterial(0xeab308);
  const carbonMat = createCarbonFiberMaterial();
  const trimMat = isExotic
    ? carbonMat
    : new THREE.MeshStandardMaterial({
        color: accentColor,
        metalness: 0.78,
        roughness: 0.22,
      });
  const accentMetalMat = new THREE.MeshPhysicalMaterial({
    color: accentColor,
    metalness: 0.65,
    roughness: 0.22,
    clearcoat: 0.9,
  });
  accentMetalMat.userData.preserveEnvMapIntensity = true;

  const panelSeamMat = new THREE.MeshStandardMaterial({
    color: 0x090b10,
    roughness: 0.85,
    metalness: 0.1,
  });
  const glassMat = createAutomotiveGlassMaterial(isPearl ? 0.42 : 0.36);
  const leatherColor =
    arch === 'ferrari_monza_sp2'
      ? '#6b2f1c'
      : arch === 'pagani_huayra'
        ? '#8b5e34'
        : isPearl
          ? '#efe6d5'
          : '#18181b';
  const leatherMat = createAutomotiveLeatherMaterial(leatherColor);
  const bolsterMat = createAutomotiveLeatherMaterial(
    isPearl ? '#dfd2ba' : arch === 'ferrari_monza_sp2' ? '#4a1f12' : '#0f1116',
  );
  const dashTrimMat = isPearl || arch === 'pagani_huayra' ? createWalnutWoodMaterial() : carbonMat;
  const dashPadMat = new THREE.MeshStandardMaterial({
    color: isPearl ? '#27201b' : '#0f1217',
    roughness: 0.65,
    metalness: 0.08,
  });
  const tireTreadMat = createTireRubberMaterial();
  const tireSidewallMat = createTireSidewallMaterial();
  const whitewallMat = new THREE.MeshStandardMaterial({
    color: '#f8fafc',
    roughness: 0.42,
    metalness: 0.04,
  });
  const rotorTex = typeof document !== 'undefined' ? getCrossDrilledRotorTexture() : null;
  const rotorMat = new THREE.MeshStandardMaterial({
    color: '#cbd5e1',
    map: rotorTex,
    metalness: 0.9,
    roughness: 0.22,
  });
  const caliperColor =
    arch === 'cadillac'
      ? '#a3e635'
      : arch === 'lamborghini_sian' || arch === 'pagani_huayra'
        ? '#f59e0b'
        : arch === 'bugatti_divo'
          ? '#06b6d4'
          : arch === 'aston_vantage_gt3'
            ? '#bef264'
            : arch === 'koenigsegg_gemera' || arch === 'mclaren_720s'
              ? '#f97316'
              : '#ef4444';
  const caliperMat = new THREE.MeshPhysicalMaterial({
    color: caliperColor,
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
  const bodyGeo = buildSilhouetteGeometry(arch);
  const bodyMesh = new THREE.Mesh(bodyGeo, paintMat);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  bodyMesh.userData.isVehicleShadowHull = true;
  bodyGroup.add(bodyMesh);

  const dims = getBodyDimensions(arch);
  const bodyW = dims.width;
  const frontZ = dims.frontZ;
  const rearZ = dims.rearZ;
  const hlY = isExotic
    ? arch === 'bugatti_chiron' || arch === 'bugatti_divo'
      ? 0.56
      : arch === 'aston_vantage_gt3' || arch === 'sls_amg_black'
        ? 0.54
        : 0.49
    : isSuv
      ? 0.74
      : arch === 'donk'
        ? 0.84
        : 0.68;

  // Inner fender liners & chrome wheel arches (classics/SUVs) OR carbon widebody flares (exotics)
  const archR = isSuv ? 0.53 : arch === 'donk' ? 0.51 : 0.445;
  const archZList = [dims.archZFront, dims.archZRear];
  const archY = isSuv ? 0.44 : arch === 'donk' ? 0.56 : 0.38;
  archZList.forEach((az) => {
    ([-1, 1] as const).forEach((side) => {
      const liner = new THREE.Mesh(
        new THREE.CylinderGeometry(archR * 0.94, archR * 0.94, 0.28, 18, 1, true, 0, Math.PI),
        panelSeamMat,
      );
      liner.rotation.z = Math.PI / 2;
      liner.rotation.y = Math.PI / 2;
      liner.position.set(side * (bodyW * 0.5 - 0.06), archY, az);
      bodyGroup.add(liner);

      if (!isExotic) {
        const chromeLip = new THREE.Mesh(
          new THREE.TorusGeometry(archR, 0.016, 8, 22, Math.PI),
          chromeMat,
        );
        chromeLip.rotation.y = Math.PI / 2;
        chromeLip.position.set(side * (bodyW * 0.5 + 0.072), archY, az);
        bodyGroup.add(chromeLip);
      } else if (arch === 'mclaren_720s' || arch === 'lamborghini_sian' || arch === 'bugatti_divo') {
        const wideFlare = new THREE.Mesh(
          new THREE.TorusGeometry(archR * 0.98, 0.022, 8, 20, Math.PI),
          carbonMat,
        );
        wideFlare.rotation.y = Math.PI / 2;
        wideFlare.position.set(side * (bodyW * 0.5 + 0.07), archY, az);
        bodyGroup.add(wideFlare);
      }
    });
  });

  // F1 exposed carbon wishbone arms for Aston Martin Valkyrie & Delage D12
  if (marque?.hasFrontWishbones) {
    ([-1, 1] as const).forEach((side) => {
      [0.34, 0.44].forEach((wy) => {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.022, 0.06), carbonMat);
        arm.position.set(side * (bodyW * 0.32), wy, dims.archZFront);
        arm.rotation.z = side * 0.08;
        bodyGroup.add(arm);
      });
    });
  }

  // Windshield, A-Pillars, Side Windows & Wipers
  const glassW = arch === 'aston_valkyrie' || arch === 'delage_d12' ? bodyW - 0.56 : bodyW - 0.1;
  const glassY = isExotic ? 0.92 : isSuv ? 1.26 : arch === 'donk' ? 1.32 : 1.15;
  const windshieldZ =
    arch === 'aston_vantage_gt3' || arch === 'sls_amg_black'
      ? 0.24
      : arch === 'koenigsegg_gemera'
        ? 0.72
        : isExotic
          ? 0.52
          : isSuv
            ? 0.78
            : 0.54;
  const windshieldPitch = isExotic ? -0.92 : isSuv ? -0.44 : -0.62;
  const windshieldH = arch === 'koenigsegg_gemera' ? 0.66 : isExotic ? 0.58 : isSuv ? 0.58 : 0.52;

  if (marque?.openTopSpeedster) {
    // Ferrari Monza SP2: twin smoked-glass virtual windscreens + dual sculpted fairing humps (NO full windshield/roof!)
    ([-1, 1] as const).forEach((side) => {
      const aeroScreen = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.026), glassMat);
      aeroScreen.position.set(side * 0.4, 0.88, 0.44);
      aeroScreen.rotation.x = -0.82;

      const fairingHump = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 10), paintMat);
      fairingHump.scale.set(0.85, 0.65, 2.2);
      fairingHump.position.set(side * 0.4, 0.88, -0.78);

      const rollBar = new THREE.Mesh(
        new THREE.TorusGeometry(0.14, 0.024, 8, 16, Math.PI),
        chromeMat,
      );
      rollBar.position.set(side * 0.4, 0.96, -0.46);
      bodyGroup.add(aeroScreen, fairingHump, rollBar);
    });

    // Classic white collector racing nose & bonnet stripe on Monza SP2
    const racingStripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.022, 1.35),
      accentPaintMat,
    );
    racingStripe.position.set(0, 0.835, 1.48);
    racingStripe.rotation.x = 0.12;
    bodyGroup.add(racingStripe);
  } else {
    const windshield = new THREE.Mesh(
      new THREE.BoxGeometry(glassW - 0.08, windshieldH, 0.036),
      glassMat,
    );
    windshield.position.set(0, glassY, windshieldZ);
    windshield.rotation.x = windshieldPitch;
    bodyGroup.add(windshield);

    const pillarMat = isExotic ? carbonMat : chromeMat;
    [-glassW * 0.48, glassW * 0.48].forEach((px) => {
      const aPillar = new THREE.Mesh(
        new THREE.BoxGeometry(0.052, windshieldH * 1.04, 0.056),
        pillarMat,
      );
      aPillar.position.set(px, glassY, windshieldZ);
      aPillar.rotation.x = windshieldPitch;
      bodyGroup.add(aPillar);
    });

    const headerTrim = new THREE.Mesh(
      new THREE.BoxGeometry(glassW + 0.02, 0.034, 0.05),
      pillarMat,
    );
    headerTrim.position.set(
      0,
      glassY + Math.cos(windshieldPitch) * windshieldH * 0.5,
      windshieldZ + Math.sin(windshieldPitch) * windshieldH * 0.5,
    );
    bodyGroup.add(headerTrim);

    if (!isPearl) {
      const cabinRearZ = isSuv ? -2.2 : arch === 'koenigsegg_gemera' ? -1.16 : -0.95;
      const sideGlassLen = isSuv ? 2.4 : arch === 'koenigsegg_gemera' ? 1.56 : 1.15;
      [-glassW * 0.49, glassW * 0.49].forEach((gx) => {
        const sideGlass = new THREE.Mesh(
          new THREE.BoxGeometry(0.028, isSuv ? 0.42 : 0.28, sideGlassLen),
          glassMat,
        );
        sideGlass.position.set(gx, glassY + 0.01, (windshieldZ + cabinRearZ) * 0.44);
        bodyGroup.add(sideGlass);
      });
      const rearGlass = new THREE.Mesh(
        new THREE.BoxGeometry(glassW - 0.14, isSuv ? 0.44 : 0.34, 0.036),
        glassMat,
      );
      rearGlass.position.set(0, glassY - 0.02, cabinRearZ);
      rearGlass.rotation.x = isSuv ? 0.2 : 0.82;
      bodyGroup.add(rearGlass);
    } else {
      // Classic Cadillac chrome vent-window quarter divider glass behind A-pillar
      ([-1, 1] as const).forEach((side) => {
        const ventPost = new THREE.Mesh(
          new THREE.BoxGeometry(0.024, 0.32, 0.024),
          chromeMat,
        );
        ventPost.position.set(side * (glassW * 0.49), 1.07, 0.28);
        const ventPane = new THREE.Mesh(
          new THREE.BoxGeometry(0.018, 0.3, 0.22),
          glassMat,
        );
        ventPane.position.set(side * (glassW * 0.49), 1.07, 0.38);
        bodyGroup.add(ventPost, ventPane);
      });
    }

    const wipers = buildWindshieldWipers(glassW * 0.78);
    wipers.position.set(
      0,
      glassY - Math.cos(windshieldPitch) * windshieldH * 0.44,
      windshieldZ - Math.sin(windshieldPitch) * windshieldH * 0.44 + 0.05,
    );
    bodyGroup.add(wipers);
  }

  // 2. Authentic Interior (Seating matched per vehicle: Speedtail 3-seat center, Delage 1+1 tandem, Gemera 4-seat, DeVille quilted bench)
  const seatY = isExotic ? 0.62 : isSuv ? 0.88 : 0.78;
  const crestTex = isPearl ? getCadillacCrestEmblemMap() : null;
  const seating = marque?.seatingLayout ?? 'two_seat';
  const driverX = seating === 'center_seat' || seating === 'tandem' ? 0 : -0.4;

  const seatPositions: Array<[number, number]> =
    seating === 'center_seat'
      ? [[0, 0.02], [-0.42, -0.36], [0.42, -0.36]]
      : seating === 'tandem'
        ? [[0, 0.06], [0, -0.62]]
        : seating === 'four_seat'
          ? [[-0.4, 0.14], [0.4, 0.14], [-0.4, -0.58], [0.4, -0.58]]
          : [[-0.4, -0.05], [0.4, -0.05]];

  for (const [sx, sz] of seatPositions) {
    const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.44), leatherMat);
    cushion.position.set(sx, seatY - 0.14, sz);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.46, 0.13), leatherMat);
    back.position.set(sx, seatY + 0.05, sz - 0.18);
    back.rotation.x = -0.18;
    [-0.19, 0.19].forEach((bx) => {
      const bolster = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.44, 0.15), bolsterMat);
      bolster.position.set(sx + bx, seatY + 0.05, sz - 0.15);
      bolster.rotation.x = -0.18;
      bodyGroup.add(bolster);
    });
    const hr = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.15, 0.095), leatherMat);
    hr.position.set(sx, seatY + 0.34, sz - 0.23);
    bodyGroup.add(cushion, back, hr);

    if (isExotic && sz > -0.25) {
      const seatStripe = new THREE.Mesh(
        new THREE.BoxGeometry(0.11, 0.4, 0.138),
        accentMetalMat,
      );
      seatStripe.position.set(sx, seatY + 0.05, sz - 0.18);
      seatStripe.rotation.x = -0.18;
      bodyGroup.add(seatStripe);
    }

    if (crestTex) {
      const crestBadge = new THREE.Mesh(
        new THREE.PlaneGeometry(0.085, 0.085),
        new THREE.MeshBasicMaterial({ map: crestTex, transparent: true, alphaTest: 0.15 }),
      );
      crestBadge.position.set(sx, seatY + 0.34, sz - 0.178);
      bodyGroup.add(crestBadge);
    }
  }

  if (isPearl) {
    // Rear luxury quilted bench seats + folded black Stayfast convertible boot behind rear cabin!
    const rearBench = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.36, 0.42), leatherMat);
    rearBench.position.set(0, seatY + 0.02, -0.78);
    rearBench.rotation.x = -0.14;
    [-0.42, 0.42].forEach((rx) => {
      const rHr = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.09), leatherMat);
      rHr.position.set(rx, seatY + 0.28, -0.84);
      bodyGroup.add(rHr);
      if (crestTex) {
        const cBadge = new THREE.Mesh(
          new THREE.PlaneGeometry(0.075, 0.075),
          new THREE.MeshBasicMaterial({ map: crestTex, transparent: true, alphaTest: 0.15 }),
        );
        cBadge.position.set(rx, seatY + 0.28, -0.793);
        bodyGroup.add(cBadge);
      }
    });

    const stayfastTopMat = createConvertibleFabricMaterial(0x16181e);
    const foldedBoot = new THREE.Mesh(
      new THREE.BoxGeometry(glassW + 0.04, 0.14, 0.36),
      stayfastTopMat,
    );
    foldedBoot.position.set(0, 1.0, -1.04);
    const bootTrim = new THREE.Mesh(
      new THREE.BoxGeometry(glassW + 0.06, 0.032, 0.04),
      chromeMat,
    );
    bootTrim.position.set(0, 1.05, -0.86);
    bodyGroup.add(rearBench, foldedBoot, bootTrim);
  }

  // Padded dash + wood/carbon trim + backlit dual-dial gauge cluster + console
  const dashBody = new THREE.Mesh(
    new THREE.BoxGeometry(glassW - 0.14, 0.18, 0.34),
    dashPadMat,
  );
  dashBody.position.set(0, seatY + 0.12, 0.44);
  const dashFascia = new THREE.Mesh(
    new THREE.BoxGeometry(glassW - 0.18, 0.09, 0.04),
    dashTrimMat,
  );
  dashFascia.position.set(0, seatY + 0.1, 0.27);
  const centerConsole = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.18, 0.86),
    dashTrimMat,
  );
  centerConsole.position.set(0, seatY - 0.02, 0.02);
  const shifter = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.16, 8), chromeMat);
  shifter.position.set(0, seatY + 0.12, 0.12);
  const shifterKnob = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), chromeMat);
  shifterKnob.position.set(0, seatY + 0.21, 0.12);
  bodyGroup.add(dashBody, dashFascia, centerConsole, shifter, shifterKnob);

  const gaugeTex = getGaugeClusterMap();
  if (gaugeTex) {
    const gaugePlane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.38, 0.13),
      new THREE.MeshBasicMaterial({ map: gaugeTex }),
    );
    gaugePlane.position.set(driverX, seatY + 0.14, 0.248);
    gaugePlane.rotation.y = Math.PI;
    bodyGroup.add(gaugePlane);
  }

  if (!marque?.openTopSpeedster) {
    const cabinKit = buildCabinDetailKit({
      mirrorY: glassY + 0.16,
      mirrorZ: windshieldZ - 0.12,
      dashY: seatY + 0.14,
      pedalZ: 0.56,
      driverX,
      trimMat: dashPadMat,
      chromeMat,
    });
    bodyGroup.add(cabinKit);
  }

  const helmWheel = buildDetailedSteeringWheel({
    style: isExotic ? 'supercar' : isSuv ? 'sport_suv' : 'classic_luxury',
    radius: isExotic ? 0.145 : 0.155,
    chromeMat,
    leatherMat,
    accentColor,
  });
  helmWheel.position.set(driverX, seatY + 0.2, 0.24);
  helmWheel.rotation.x = 0.45;
  bodyGroup.add(helmWheel);

  // 3. Hinged Left & Right Doors (or dihedral/gullwing panels) + Mirrors + Door Handles + Marque Side Hardware
  const spearY = isExotic ? 0.54 : isSuv ? 0.72 : 0.62;
  let doorLeft: THREE.Group | undefined;
  let doorRight: THREE.Group | undefined;

  ([-1, 1] as const).forEach((side) => {
    const doorPivot = new THREE.Group();
    doorPivot.position.set(side * (bodyW * 0.5 + 0.04), isExotic ? 0.4 : 0.42, isExotic ? 0.54 : 0.64);
    const doorLen = isExotic ? 1.08 : 1.36;
    const doorSkin = new THREE.Mesh(
      new THREE.BoxGeometry(0.055, isExotic ? 0.34 : 0.44, doorLen),
      paintMat,
    );
    doorSkin.position.set(0, 0.14, -doorLen * 0.5);
    const doorSeam = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.36, 0.014), panelSeamMat);
    doorSeam.position.set(0, 0.14, -doorLen);

    const handle = buildDoorHandleAssembly({
      side,
      chromeMat: isExotic ? trimMat : chromeMat,
      pocketMat: panelSeamMat,
      withKeyCylinder: !isExotic,
    });
    handle.position.set(side * 0.032, 0.24, -doorLen * 0.72);

    const mirror = buildRealisticSideMirror({
      side,
      housingMat:
        arch === 'pagani_huayra'
          ? carbonMat
          : isExotic
            ? carbonMat
            : isPearl
              ? chromeMat
              : paintMat,
      chromeMat,
      style: isPearl || arch === 'lowrider' ? 'classic_round' : 'aero',
    });
    // Pagani Huayra iconic fender-mounted leaf mirrors; standard aero/classic wing mirrors otherwise
    if (arch === 'pagani_huayra') {
      mirror.position.set(side * (bodyW * 0.5 + 0.06), 0.72, 0.92);
      bodyGroup.add(mirror);
    } else {
      mirror.position.set(side * 0.04, isExotic ? 0.38 : glassY - 0.54, -0.12);
      doorPivot.add(mirror);
    }

    doorPivot.add(doorSkin, doorSeam, handle);
    bodyGroup.add(doorPivot);
    if (side < 0) doorLeft = doorPivot;
    else doorRight = doorPivot;

    if (isPearl) {
      const badges = buildCadillacFenderBadges(side);
      badges.position.set(side * (bodyW * 0.5 + 0.074), spearY + 0.13, 0.88);
      bodyGroup.add(badges);
    }

    // Bugatti signature sweeping silver C-line intake arc along side of cabin
    if (marque?.hasBugattiCLine) {
      const cArc = new THREE.Mesh(
        new THREE.TorusGeometry(0.42, 0.024, 8, 24, Math.PI * 1.15),
        chromeMat,
      );
      cArc.rotation.y = Math.PI / 2;
      cArc.rotation.x = side > 0 ? Math.PI * 0.92 : -Math.PI * 0.92;
      cArc.position.set(side * (bodyW * 0.5 + 0.072), 0.74, -0.2);
      const sideTrimAccent = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.035, 2.3),
        arch === 'bugatti_divo' ? accentMetalMat : chromeMat,
      );
      sideTrimAccent.position.set(side * (bodyW * 0.5 + 0.068), 0.34, 0.02);
      bodyGroup.add(cArc, sideTrimAccent);
    } else if (isExotic) {
      // Carbon aero side skirts + accent pinstripe + sculpted side intake duct
      const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.07, 2.2), carbonMat);
      skirt.position.set(side * (bodyW * 0.5 + 0.05), 0.28, 0.02);
      const pin = new THREE.Mesh(new THREE.BoxGeometry(0.086, 0.022, 2.18), accentMetalMat);
      pin.position.set(side * (bodyW * 0.5 + 0.052), 0.31, 0.02);
      const sideScoop = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.44), panelSeamMat);
      sideScoop.position.set(side * (bodyW * 0.5 + 0.06), 0.58, -0.68);
      bodyGroup.add(skirt, pin, sideScoop);
    }
  });

  // Side Spear molding for Collector Classics & Tahoe
  if (!isExotic) {
    const sideSpear = new THREE.Mesh(
      new THREE.BoxGeometry(bodyW + 0.145, 0.032, 4.25),
      isPearl ? goldTrimMat : chromeMat,
    );
    sideSpear.position.set(0, spearY, 0.02);
    bodyGroup.add(sideSpear);
  }

  if (isPearl) {
    const chromeBeltHighlight = new THREE.Mesh(
      new THREE.BoxGeometry(bodyW + 0.152, 0.014, 4.25),
      chromeMat,
    );
    chromeBeltHighlight.position.set(0, spearY + 0.018, 0.02);
    const rockerSill = new THREE.Mesh(
      new THREE.BoxGeometry(bodyW + 0.142, 0.044, 2.02),
      chromeMat,
    );
    rockerSill.position.set(0, 0.37, 0.05);
    bodyGroup.add(chromeBeltHighlight, rockerSill);
  }

  // 4. Front Grille / Spliter Intake + License Plate + Headlights + Taillights + Marque Aero & Engine Cover
  if (!isExotic) {
    const bowtieTex = isSuv ? getChevyBowtieMap() : null;
    const grille = buildRealisticGrilleAssembly({
      width: isSuv ? 1.24 : 1.28,
      height: isSuv ? 0.34 : 0.28,
      chromeMat,
      horizontalBars: isPearl ? 2 : 3,
      emblemTexture: isPearl ? getCadillacCrestEmblemMap() : bowtieTex,
      variant: 'egg_crate',
    });
    grille.position.set(0, hlY - 0.02, frontZ + 0.035);
    bodyGroup.add(grille);

    const plateTex = getLicensePlateMap(isPearl ? 'DE VILLE' : isSuv ? 'SAVAGE' : 'ISLAND 1');
    const plateFrame = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.17, 0.03), chromeMat);
    plateFrame.position.set(0, 0.42, frontZ + 0.09);
    const plateFace = new THREE.Mesh(
      new THREE.PlaneGeometry(0.29, 0.135),
      plateTex
        ? new THREE.MeshStandardMaterial({ map: plateTex, roughness: 0.32, metalness: 0.25 })
        : new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 }),
    );
    plateFace.position.set(0, 0.42, frontZ + 0.107);
    bodyGroup.add(plateFrame, plateFace);
  } else {
    // Exotic front splitter + grille (Bugatti horseshoe / AMG Panamericana / Aston Slotted / Carbon Honeycomb)
    const splitter = new THREE.Mesh(
      new THREE.BoxGeometry(bodyW + 0.16, 0.048, 0.34),
      carbonMat,
    );
    splitter.position.set(0, 0.26, frontZ + 0.02);
    const splitterPin = new THREE.Mesh(
      new THREE.BoxGeometry(bodyW + 0.17, 0.018, 0.35),
      accentMetalMat,
    );
    splitterPin.position.set(0, 0.285, frontZ + 0.025);
    bodyGroup.add(splitter, splitterPin);

    const grilleVariant =
      arch === 'bugatti_chiron' || arch === 'bugatti_divo'
        ? 'horseshoe_bugatti'
        : arch === 'sls_amg_black'
          ? 'panamericana_vertical'
          : arch === 'aston_vantage_gt3' || arch === 'aston_valkyrie'
            ? 'aston_slotted'
            : 'honeycomb_intake';

    const exoticGrille = buildRealisticGrilleAssembly({
      width: grilleVariant === 'horseshoe_bugatti' ? 0.56 : 1.05,
      height: grilleVariant === 'horseshoe_bugatti' ? 0.32 : 0.18,
      chromeMat,
      horizontalBars: 2,
      variant: grilleVariant,
      accentMat: accentMetalMat,
    });
    exoticGrille.position.set(0, 0.4, frontZ + 0.03);
    bodyGroup.add(exoticGrille);
  }

  // Headlight Pods
  if (isPearl || arch === 'lowrider' || arch === 'donk' || arch === 'slab') {
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
    if (isPearl) {
      const amberTex = getAmberSignalLensTextureSet();
      const amberMat = new THREE.MeshPhysicalMaterial({
        color: 0xf59e0b,
        map: amberTex.map,
        normalMap: amberTex.normalMap,
        emissive: 0xd97706,
        emissiveIntensity: 0.55,
        clearcoat: 1.0,
        roughness: 0.08,
        envMapIntensity: 2.0,
      });
      amberMat.userData.preserveEnvMapIntensity = true;
      ([-1, 1] as const).forEach((side) => {
        const cornerAmber = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.18, 0.13), amberMat);
        cornerAmber.position.set(side * (bodyW * 0.5 + 0.055), hlY + 0.02, frontZ - 0.1);
        const bezel = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.2, 0.15), chromeMat);
        bezel.position.set(side * (bodyW * 0.5 + 0.048), hlY + 0.02, frontZ - 0.1);
        bodyGroup.add(bezel, cornerAmber);
      });
    }
  } else {
    ([-1, 1] as const).forEach((sideSign) => {
      const pod = buildRealisticHeadlightPod({
        shape: marque?.headlightShape ?? 'quad_bar',
        width: 0.34,
        height: 0.095,
        chromeMat,
        tintColor: 0xe0f2fe,
        sideSign,
      });
      pod.position.set(sideSign * 0.64, hlY, frontZ + 0.01);
      bodyGroup.add(pod);
    });
  }

  // Taillight Assemblies
  if (isPearl) {
    [-0.86, 0.86].forEach((fx) => {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.26, 1.18), paintMat);
      fin.position.set(fx, 0.96, rearZ + 0.62);
      fin.rotation.x = -0.14;
      const finSpear = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.036, 1.22), chromeMat);
      finSpear.position.set(fx, 1.07, rearZ + 0.62);
      finSpear.rotation.x = -0.14;
      bodyGroup.add(fin, finSpear);

      const upperBullet = buildRealisticTaillightPod({
        style: 'cadillac_bullet',
        chromeMat,
      });
      upperBullet.position.set(fx, 1.0, rearZ + 0.02);
      const lowerBullet = buildRealisticTaillightPod({
        style: 'cadillac_bullet',
        chromeMat,
      });
      lowerBullet.position.set(fx, 0.72, rearZ + 0.02);
      bodyGroup.add(upperBullet, lowerBullet);

      const fenderOrnament = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.048, 0.36), chromeMat);
      fenderOrnament.position.set(fx, hlY + 0.2, frontZ - 0.26);
      bodyGroup.add(fenderOrnament);
    });

    const vCrestL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.024, 0.04), goldTrimMat);
    vCrestL.position.set(-0.1, hlY + 0.21, frontZ - 0.14);
    vCrestL.rotation.z = -0.18;
    const vCrestR = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.024, 0.04), goldTrimMat);
    vCrestR.position.set(0.1, hlY + 0.21, frontZ - 0.14);
    vCrestR.rotation.z = 0.18;
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.008, 0.65, 6), chromeMat);
    antenna.position.set(0.84, 1.18, frontZ - 0.54);
    bodyGroup.add(vCrestL, vCrestR, antenna);
  } else if (arch === 'lowrider') {
    [-0.78, -0.62, -0.46, 0.46, 0.62, 0.78].forEach((tx) => {
      const pod = buildRealisticTaillightPod({ style: 'round', radius: 0.052, chromeMat });
      pod.position.set(tx, hlY + 0.05, rearZ);
      bodyGroup.add(pod);
    });
  } else if (marque?.taillightStyle === 'bugatti_blade') {
    const pod = buildRealisticTaillightPod({
      style: 'bugatti_blade',
      width: 1.66,
      height: 0.045,
      chromeMat,
    });
    pod.position.set(0, hlY + 0.12, rearZ - 0.02);
    bodyGroup.add(pod);
  } else if (arch === 'pagani_huayra') {
    [-0.76, -0.64, -0.52, 0.52, 0.64, 0.76].forEach((tx) => {
      const pod = buildRealisticTaillightPod({ style: 'round', radius: 0.042, chromeMat });
      pod.position.set(tx, hlY + 0.12, rearZ - 0.01);
      bodyGroup.add(pod);
    });
  } else {
    [-0.64, 0.64].forEach((tx) => {
      const pod = buildRealisticTaillightPod({
        style: marque?.taillightStyle ?? 'blade',
        width: isSuv ? 0.16 : 0.48,
        height: isSuv ? 0.38 : 0.095,
        chromeMat,
      });
      pod.position.set(tx, hlY + 0.1, rearZ - 0.01);
      bodyGroup.add(pod);
    });
  }

  // 5. Mirror Chrome Bumpers / Carbon Diffusers & Exhaust Clusters + Trunk / Engine Decklid
  if (!isExotic) {
    const frontLip = new THREE.Mesh(
      new THREE.BoxGeometry(config.trackWidthX + 0.14, 0.18, 0.22),
      chromeMat,
    );
    frontLip.position.set(0, 0.44, frontZ - 0.1);
    const rearLip = new THREE.Mesh(
      new THREE.BoxGeometry(config.trackWidthX + 0.14, 0.18, 0.22),
      chromeMat,
    );
    rearLip.position.set(0, 0.46, rearZ + 0.1);
    bodyGroup.add(frontLip, rearLip);

    if (isPearl) {
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
  } else {
    const rearDiffuser = new THREE.Mesh(new THREE.BoxGeometry(bodyW + 0.08, 0.14, 0.28), carbonMat);
    rearDiffuser.position.set(0, 0.32, rearZ + 0.04);
    bodyGroup.add(rearDiffuser);
    [-0.62, -0.31, 0, 0.31, 0.62].forEach((sx) => {
      const strake = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.16, 0.3), carbonMat);
      strake.position.set(sx, 0.29, rearZ + 0.02);
      bodyGroup.add(strake);
    });
  }

  // Exhaust cluster authentic per marquee
  const exhaustBoreMat = new THREE.MeshStandardMaterial({ color: 0x05070a, roughness: 0.9 });
  const addExhaustTip = (x: number, y: number, z: number, r = 0.046) => {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.22, 14, 1, true), chromeMat);
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(x, y, z);
    const bore = new THREE.Mesh(new THREE.CircleGeometry(r * 0.86, 12), exhaustBoreMat);
    bore.rotation.y = Math.PI;
    bore.position.set(x, y, z - 0.112);
    bodyGroup.add(pipe, bore);
  };

  if (marque?.exhaustLayout === 'pagani_quad_center') {
    const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.024, 10, 20), chromeMat);
    bezel.position.set(0, 0.58, rearZ - 0.02);
    bodyGroup.add(bezel);
    addExhaustTip(-0.055, 0.63, rearZ - 0.04, 0.036);
    addExhaustTip(0.055, 0.63, rearZ - 0.04, 0.036);
    addExhaustTip(-0.055, 0.53, rearZ - 0.04, 0.036);
    addExhaustTip(0.055, 0.53, rearZ - 0.04, 0.036);
  } else if (marque?.exhaustLayout === 'center_single') {
    addExhaustTip(0, 0.56, rearZ - 0.04, 0.075);
  } else if (marque?.exhaustLayout === 'dual_high') {
    addExhaustTip(-0.16, 0.58, rearZ - 0.04, 0.048);
    addExhaustTip(0.16, 0.58, rearZ - 0.04, 0.048);
  } else if (marque?.exhaustLayout === 'gemera_top') {
    addExhaustTip(-0.2, 0.84, rearZ + 0.36, 0.048);
    addExhaustTip(0.2, 0.84, rearZ + 0.36, 0.048);
  } else if (marque?.exhaustLayout === 'monza_quad') {
    [-0.64, -0.52, 0.52, 0.64].forEach((ex) => addExhaustTip(ex, 0.36, rearZ - 0.04, 0.036));
  } else {
    [-0.54, 0.54].forEach((ex) => addExhaustTip(ex, isExotic ? 0.38 : 0.36, rearZ - 0.04, 0.046));
  }

  // Roof scoops, Dorsal shark fins & Rear Wings tailored per marque
  if (marque?.hasRoofScoop) {
    const scoop = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.48), carbonMat);
    scoop.position.set(0, 1.18, -0.45);
    const inlet = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.06), panelSeamMat);
    inlet.position.set(0, 1.19, -0.2);
    bodyGroup.add(scoop, inlet);
  }
  if (marque?.hasDorsalFin) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.24, 1.05), carbonMat);
    fin.position.set(0, 1.02, -1.25);
    const finStripe = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.025, 1.04), accentMetalMat);
    finStripe.position.set(0, 1.13, -1.25);
    bodyGroup.add(fin, finStripe);
  }

  if (marque?.hasWing && marque.wingStyle !== 'none') {
    const wingY = marque.wingStyle === 'gt3_swan' ? 1.14 : 1.04;
    const wing = new THREE.Mesh(new THREE.BoxGeometry(bodyW + 0.16, 0.052, 0.34), paintMat);
    wing.position.set(0, wingY, rearZ + 0.18);
    wing.rotation.x = 0.14;
    [-(bodyW * 0.5 + 0.08), bodyW * 0.5 + 0.08].forEach((ex) => {
      const endplate = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.22, 0.4), carbonMat);
      endplate.position.set(ex, wingY, rearZ + 0.18);
      const plateAccent = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.04, 0.36), accentMetalMat);
      plateAccent.position.set(ex, wingY + 0.06, rearZ + 0.18);
      bodyGroup.add(endplate, plateAccent);
    });
    const pylonSpan = marque.wingStyle === 'f1_split' ? 0.32 : 0.5;
    [-pylonSpan, pylonSpan].forEach((px) => {
      const pylon = new THREE.Mesh(
        new THREE.BoxGeometry(0.054, wingY - 0.78, 0.2),
        carbonMat,
      );
      pylon.position.set(px, 0.8 + (wingY - 0.8) * 0.5, rearZ + 0.22);
      bodyGroup.add(pylon);
    });
    bodyGroup.add(wing);
  }

  // Hinged rear engine decklid / trunk
  const deckHinge = new THREE.Group();
  deckHinge.position.set(0, 0.84, -0.92);
  const deckLen = Math.max(0.75, Math.abs(rearZ) - 1.15);
  const deckPanel = new THREE.Mesh(
    new THREE.BoxGeometry(bodyW * 0.62, 0.055, deckLen),
    isExotic ? carbonMat : paintMat,
  );
  deckPanel.position.set(0, 0, -deckLen * 0.5);
  deckHinge.add(deckPanel);
  bodyGroup.add(deckHinge);
  const trunkLid = deckHinge;

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
          roughness: 0.24,
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

  // Optional rear subwoofer wall
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

  // Optional neon underglow bars + pool light handle
  const underglowMeshes: THREE.Mesh[] = [];
  let underglowLight: THREE.PointLight | undefined;
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
    underglowMeshes.push(glowBar);

    underglowLight = new THREE.PointLight(
      new THREE.Color(config.underglowColor).getHex(),
      1.8,
      8.5,
      1.4,
    );
    underglowLight.position.set(0, 0.24, 0);
    bodyGroup.add(underglowLight);
  }

  // 6. Photorealistic Treaded Wheels, Marque Forged Spokes, Center Locks / Whitewalls, Rotors & Multi-Piston Calipers
  const wheels: THREE.Group[] = [];
  const steerWheels: THREE.Group[] = [];
  const wheelCorners: RealLifeWheelCornerHandle[] = [];

  const outerR = config.wheelRadius;
  const rimR = outerR * (hasWhitewalls ? 0.68 : 0.8);
  const wWidth = config.wheelWidth;

  const tireTreadGeo = new THREE.CylinderGeometry(outerR, outerR, wWidth, 30, 1, true);
  tireTreadGeo.rotateZ(Math.PI / 2);
  const tireSideGeo = new THREE.TorusGeometry(
    (outerR + rimR) * 0.5,
    (outerR - rimR) * 0.54,
    10,
    30,
  );
  tireSideGeo.rotateY(Math.PI / 2);
  const whitewallGeo = new THREE.TorusGeometry(rimR + (outerR - rimR) * 0.36, 0.028, 8, 28);
  whitewallGeo.rotateY(Math.PI / 2);

  const rimLipGeo = new THREE.TorusGeometry(rimR, 0.024, 10, 30);
  rimLipGeo.rotateY(Math.PI / 2);
  const rimBarrelGeo = new THREE.CylinderGeometry(rimR, rimR, wWidth * 0.88, 26, 1, true);
  rimBarrelGeo.rotateZ(Math.PI / 2);

  const rotorGeo = new THREE.CylinderGeometry(rimR * 0.82, rimR * 0.82, 0.028, 24);
  rotorGeo.rotateZ(Math.PI / 2);
  ensureGeometryHasUv(rotorGeo);

  const spokeCount = marque?.spokeCount ?? (isSuv ? 7 : 8);
  const spokeGeo = getSculptedSpokeGeometry(rimR * 0.94, 0.044, 0.026, 0.034);
  const boltGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.016, 6);
  boltGeo.rotateZ(Math.PI / 2);
  const hubCapGeo = new THREE.CylinderGeometry(rimR * 0.24, rimR * 0.26, wWidth * 0.22, 16);
  hubCapGeo.rotateZ(Math.PI / 2);
  const lugGeo = new THREE.CylinderGeometry(0.011, 0.011, 0.032, 6);
  lugGeo.rotateZ(Math.PI / 2);
  const aeroCoverGeo = new THREE.CylinderGeometry(rimR * 0.96, rimR * 0.96, 0.024, 24);
  aeroCoverGeo.rotateZ(Math.PI / 2);
  const crestCapTex = isPearl ? getCadillacCrestEmblemMap() : null;

  const halfTrack = config.trackWidthX * 0.5;
  const wheelOffsets: Array<{
    corner: 'fl' | 'fr' | 'rl' | 'rr';
    x: number;
    y: number;
    z: number;
    side: -1 | 1;
    isFront: boolean;
  }> = [
    { corner: 'fl', x: -halfTrack, y: outerR, z: config.wheelBaseZ, side: -1, isFront: true },
    { corner: 'fr', x: halfTrack, y: outerR, z: config.wheelBaseZ, side: 1, isFront: true },
    { corner: 'rl', x: -halfTrack, y: outerR, z: -config.wheelBaseZ, side: -1, isFront: false },
    { corner: 'rr', x: halfTrack, y: outerR, z: -config.wheelBaseZ, side: 1, isFront: false },
  ];

  for (const wc of wheelOffsets) {
    const cornerRoot = new THREE.Group();
    cornerRoot.position.set(wc.x, wc.y, wc.z);

    const steerPivot = new THREE.Group();
    const rotor = new THREE.Mesh(rotorGeo, rotorMat);
    rotor.position.x = -wc.side * (wWidth * 0.08);
    const caliper = createMultiPistonCaliperMesh(caliperMat, chromeMat, rimR * 0.82);
    caliper.position.set(-wc.side * (wWidth * 0.06), rimR * 0.36, -rimR * 0.38);
    caliper.rotation.x = 0.45;
    steerPivot.add(rotor, caliper);

    const spinPivot = new THREE.Group();
    const tireTread = new THREE.Mesh(tireTreadGeo, tireTreadMat);
    tireTread.userData.isVehicleShadowHull = true;
    tireTread.castShadow = true;

    const sidewallOut = new THREE.Mesh(tireSideGeo, tireSidewallMat);
    sidewallOut.position.x = wc.side * (wWidth * 0.41);
    const sidewallIn = new THREE.Mesh(tireSideGeo, tireSidewallMat);
    sidewallIn.position.x = -wc.side * (wWidth * 0.41);

    const rimBarrel = new THREE.Mesh(rimBarrelGeo, trimMat);
    const rimLip = new THREE.Mesh(rimLipGeo, chromeMat);
    rimLip.position.x = wc.side * (wWidth * 0.44);
    const hubCap = new THREE.Mesh(hubCapGeo, isExotic ? caliperMat : chromeMat);
    hubCap.position.x = wc.side * (wWidth * 0.34);

    spinPivot.add(tireTread, sidewallOut, sidewallIn, rimBarrel, rimLip, hubCap);

    // McLaren Speedtail signature front carbon aero wheel discs!
    if (marque?.frontWheelCovers && wc.isFront) {
      const aeroDisc = new THREE.Mesh(aeroCoverGeo, carbonMat);
      aeroDisc.position.x = wc.side * (wWidth * 0.42);
      const aeroRing = new THREE.Mesh(
        new THREE.TorusGeometry(rimR * 0.68, 0.012, 8, 24),
        accentMetalMat,
      );
      aeroRing.rotation.y = Math.PI / 2;
      aeroRing.position.x = wc.side * (wWidth * 0.435);
      spinPivot.add(aeroDisc, aeroRing);
    }

    if (crestCapTex) {
      const capEmblem = new THREE.Mesh(
        new THREE.CircleGeometry(rimR * 0.18, 16),
        new THREE.MeshBasicMaterial({ map: crestCapTex, transparent: true, alphaTest: 0.15 }),
      );
      capEmblem.rotation.y = wc.side > 0 ? Math.PI / 2 : -Math.PI / 2;
      capEmblem.position.x = wc.side * (wWidth * 0.455);
      spinPivot.add(capEmblem);
    }

    if (hasWhitewalls) {
      const ww = new THREE.Mesh(whitewallGeo, whitewallMat);
      ww.position.x = wc.side * (wWidth * 0.45);
      spinPivot.add(ww);
    }

    for (let b = 0; b < 14; b++) {
      const ba = (b / 14) * Math.PI * 2;
      const bolt = new THREE.Mesh(boltGeo, chromeMat);
      bolt.position.set(
        wc.side * (wWidth * 0.445),
        Math.cos(ba) * (rimR * 0.94),
        Math.sin(ba) * (rimR * 0.94),
      );
      spinPivot.add(bolt);
    }

    for (let s = 0; s < spokeCount; s++) {
      const a = (s / spokeCount) * Math.PI * 2;
      const spoke = new THREE.Mesh(spokeGeo, chromeMat);
      spoke.position.set(
        wc.side * (wWidth * 0.28),
        Math.cos(a) * (rimR * 0.5),
        Math.sin(a) * (rimR * 0.5),
      );
      spoke.rotation.x = a;
      spinPivot.add(spoke);
    }
    for (let l = 0; l < 5; l++) {
      const la = (l / 5) * Math.PI * 2;
      const lug = new THREE.Mesh(lugGeo, chromeMat);
      lug.position.set(
        wc.side * (wWidth * 0.39),
        Math.cos(la) * (rimR * 0.18),
        Math.sin(la) * (rimR * 0.18),
      );
      spinPivot.add(lug);
    }

    steerPivot.add(spinPivot);
    cornerRoot.add(steerPivot);
    root.add(cornerRoot);
    wheels.push(spinPivot);
    if (wc.isFront) steerWheels.push(steerPivot);
    wheelCorners.push({
      obj: cornerRoot,
      corner: wc.corner,
      baseY: wc.y,
    });
  }

  markVehicleLightingPreserved(root);
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
    steerWheels,
    wheelCorners,
    doorLeft,
    doorRight,
    trunkLid,
    helmWheel,
    underglowMeshes,
    underglowLight,
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
