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
import {
  createAirfoilWingGeometry,
  createCadillacTailfinGeometry,
  createCurvedDashboardGeometry,
  createCurvedDeckPanelGeometry,
  createCurvedDoorSkinGeometry,
  createCurvedRearGlassGeometry,
  createCurvedSideGlassGeometry,
  createCurvedWheelhouseTubGeometry,
  createCurvedWindshieldGeometry,
  createSculptedBodyHullGeometry,
  createSculptedRoofCanopyGeometry,
  createSculptedScoopGeometry,
  createSculptedSeatBucketGeometry,
  createSweptTubeGeometry,
  createWrapAroundBumperGeometry,
  evaluateHullStation,
  getVehicleHullSurfaceSpec,
} from './automotiveSurfaceGeo';

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
  archRadius: number;
  archY: number;
} {
  const s = getVehicleHullSurfaceSpec(archetype);
  return {
    width: s.width,
    frontZ: s.frontZ,
    rearZ: s.rearZ,
    archZFront: s.archZFront,
    archZRear: s.archZRear,
    archRadius: s.archRadius,
    archY: s.archY,
  };
}

export function buildSilhouetteGeometry(archetype: VehicleArchetype): THREE.BufferGeometry {
  return createSculptedBodyHullGeometry(archetype);
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

  // 1. Compound-curved 3D sculpted body hull with flared wheel arches & door coves
  const hullSpec = getVehicleHullSurfaceSpec(arch);
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

  // Recessed dark wheelhouse fender tubs & chrome/carbon rolled arch moldings
  const archR = hullSpec.archRadius;
  const archZList = [dims.archZFront, dims.archZRear];
  const archY = hullSpec.archY;
  const tubGeo = createCurvedWheelhouseTubGeometry(arch, archR * 0.97, 0.32);
  const flareRimGeo = new THREE.TorusGeometry(archR * 1.01, isExotic ? 0.018 : 0.014, 10, 24, Math.PI);
  flareRimGeo.rotateY(Math.PI / 2);

  archZList.forEach((az) => {
    const station = evaluateHullStation(hullSpec, az);
    const fenderSideX = station.halfW * hullSpec.shoulderTuck + hullSpec.archLipFlare * 0.65;
    ([-1, 1] as const).forEach((side) => {
      const liner = new THREE.Mesh(tubGeo, panelSeamMat);
      liner.position.set(side * (fenderSideX - 0.14), archY, az);
      bodyGroup.add(liner);

      if (!isExotic) {
        const chromeLip = new THREE.Mesh(flareRimGeo, chromeMat);
        chromeLip.position.set(side * (fenderSideX + 0.008), archY, az);
        bodyGroup.add(chromeLip);
      } else if (arch === 'mclaren_720s' || arch === 'lamborghini_sian' || arch === 'bugatti_divo') {
        const wideFlare = new THREE.Mesh(flareRimGeo, carbonMat);
        wideFlare.position.set(side * (fenderSideX + 0.01), archY, az);
        bodyGroup.add(wideFlare);
      }
    });
  });

  // F1 exposed curved wishbone suspension arms for Aston Martin Valkyrie & Delage D12
  if (marque?.hasFrontWishbones) {
    ([-1, 1] as const).forEach((side) => {
      [0.34, 0.44].forEach((wy) => {
        const armGeo = createSweptTubeGeometry(
          `wishbone:${side}:${wy}`,
          [
            [side * 0.2, wy + 0.02, dims.archZFront - 0.1],
            [side * 0.44, wy + 0.01, dims.archZFront],
            [side * 0.68, wy - 0.01, dims.archZFront + 0.02],
          ],
          0.016,
          10,
          8,
        );
        bodyGroup.add(new THREE.Mesh(armGeo, carbonMat));
      });
    });
  }

  // Sculpted Compound-Curved Windshield, Swept A/B/C Pillars, Greenhouse Roof Canopy & Curved Side/Rear Glass
  const cowlStation = evaluateHullStation(hullSpec, hullSpec.windshieldZ);
  const windshieldZ = hullSpec.windshieldZ;
  const cowlY = Math.max(0.7, cowlStation.shoulderY - 0.02);
  const glassW = (hullSpec.roofHalfWidth + 0.08) * 2;
  const glassY = (cowlY + hullSpec.roofHeight) * 0.5;
  const roofFrontZ = windshieldZ - (isSuv ? 0.24 : 0.42);
  const cabinRearZ = hullSpec.cabinRearZ;

  if (marque?.openTopSpeedster) {
    // Ferrari Monza SP2: twin compound-curved smoked aero windscreens + sculpted fairing buttresses + chrome roll hoops
    const screenGeo = createCurvedWindshieldGeometry({
      key: `${arch}_aero_screen`,
      baseWidth: 0.44,
      topWidth: 0.38,
      bottomY: 0,
      topY: 0.14,
      bottomZ: 0.06,
      topZ: -0.08,
      wrapZ: 0.075,
      crown: 0.015,
    });
    ([-1, 1] as const).forEach((side) => {
      const aeroScreen = new THREE.Mesh(screenGeo, glassMat);
      aeroScreen.position.set(side * 0.4, cowlY + 0.01, windshieldZ - 0.02);

      const fairingHump = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 12), paintMat);
      fairingHump.scale.set(0.86, 0.58, 2.35);
      fairingHump.position.set(side * 0.4, cowlY + 0.03, -0.82);

      const hoopGeo = createSweptTubeGeometry(
        `monza_hoop:${side}`,
        [
          [side * 0.28, cowlY + 0.02, -0.52],
          [side * 0.34, cowlY + 0.2, -0.54],
          [side * 0.4, cowlY + 0.25, -0.55],
          [side * 0.46, cowlY + 0.2, -0.54],
          [side * 0.52, cowlY + 0.02, -0.52],
        ],
        0.02,
        14,
        8,
      );
      bodyGroup.add(aeroScreen, fairingHump, new THREE.Mesh(hoopGeo, chromeMat));
    });

    // Classic curved collector bonnet racing stripe conforming to Monza SP2 hood camber
    const stripeGeo = createCurvedDeckPanelGeometry({
      key: 'monza_stripe',
      width: 0.46,
      length: 1.38,
      crownY: 0.068,
      dropRearY: 0.21,
      taperRear: 0.28,
      forwardZ: true,
    });
    const racingStripe = new THREE.Mesh(stripeGeo, accentPaintMat);
    racingStripe.position.set(0, cowlY + 0.055, 0.85);
    bodyGroup.add(racingStripe);
  } else {
    const pillarMat = isExotic ? carbonMat : chromeMat;
    const baseWsW = cowlStation.halfW * hullSpec.shoulderTuck * 1.84;
    const topWsW = hullSpec.roofHalfWidth * 1.9;

    const wsGeo = createCurvedWindshieldGeometry({
      key: `${arch}_ws`,
      baseWidth: baseWsW,
      topWidth: topWsW,
      bottomY: cowlY,
      topY: hullSpec.roofHeight - 0.02,
      bottomZ: windshieldZ,
      topZ: roofFrontZ,
      wrapZ: hullSpec.windshieldWrap,
      crown: 0.04,
    });
    bodyGroup.add(new THREE.Mesh(wsGeo, glassMat));

    // Curved 3D swept A-pillars connecting cowl shoulders smoothly to roof header corners
    ([-1, 1] as const).forEach((side) => {
      const pGeo = createSweptTubeGeometry(
        `${arch}_apillar:${side}`,
        [
          [side * (baseWsW * 0.5), cowlY - 0.01, windshieldZ],
          [
            side * THREE.MathUtils.lerp(baseWsW * 0.5, topWsW * 0.5, 0.52),
            THREE.MathUtils.lerp(cowlY, hullSpec.roofHeight, 0.52),
            THREE.MathUtils.lerp(windshieldZ, roofFrontZ, 0.5) + hullSpec.windshieldWrap * 0.22,
          ],
          [side * (topWsW * 0.5), hullSpec.roofHeight - 0.015, roofFrontZ],
        ],
        isExotic ? 0.026 : 0.028,
        14,
        8,
      );
      bodyGroup.add(new THREE.Mesh(pGeo, pillarMat));
    });

    // Curved windshield top chrome/carbon header bow
    const headerGeo = createSweptTubeGeometry(
      `${arch}_ws_header`,
      [
        [-topWsW * 0.5, hullSpec.roofHeight - 0.015, roofFrontZ],
        [0, hullSpec.roofHeight + 0.032, roofFrontZ + hullSpec.windshieldWrap],
        [topWsW * 0.5, hullSpec.roofHeight - 0.015, roofFrontZ],
      ],
      0.022,
      14,
      8,
    );
    bodyGroup.add(new THREE.Mesh(headerGeo, pillarMat));

    if (!isPearl) {
      // Sculpted compound-curved coupe/fastback/SUV painted canopy roof
      const rearShoulder = evaluateHullStation(hullSpec, cabinRearZ);
      const roofTailZ = isSuv ? cabinRearZ + 0.06 : cabinRearZ + 0.34;
      const roofCapGeo = createSculptedRoofCanopyGeometry({
        key: `${arch}_roof`,
        frontZ: roofFrontZ,
        rearZ: roofTailZ,
        frontHalfW: topWsW * 0.5,
        rearHalfW: isSuv ? hullSpec.roofHalfWidth + 0.04 : hullSpec.roofHalfWidth * 0.88,
        frontY: hullSpec.roofHeight - 0.01,
        peakY: hullSpec.roofHeight + 0.025,
        rearY: isSuv ? hullSpec.roofHeight - 0.02 : hullSpec.roofHeight - 0.14,
        crown: isSuv ? 0.045 : 0.055,
        isSuv,
      });
      const roofMesh = new THREE.Mesh(roofCapGeo, isExotic && arch === 'pagani_huayra' ? carbonMat : paintMat);
      roofMesh.castShadow = true;
      roofMesh.userData.isVehicleShadowHull = true;
      bodyGroup.add(roofMesh);

      // Curved tumblehome side glass & fastback rear glass
      ([-1, 1] as const).forEach((side) => {
        const sGlassGeo = createCurvedSideGlassGeometry({
          key: `${arch}_sglass`,
          side,
          frontZ: windshieldZ - 0.06,
          rearZ: roofTailZ + 0.04,
          bottomY: cowlY,
          topY: hullSpec.roofHeight - 0.03,
          bottomX: baseWsW * 0.495,
          topX: topWsW * 0.485,
          midBowOut: 0.038,
        });
        bodyGroup.add(new THREE.Mesh(sGlassGeo, glassMat));

        // Swept C-pillar sail fairing connecting roof rear corner seamlessly to rear haunch
        const cPillarGeo = createSweptTubeGeometry(
          `${arch}_cpillar:${side}`,
          [
            [side * (hullSpec.roofHalfWidth * 0.88), hullSpec.roofHeight - (isSuv ? 0.04 : 0.14), roofTailZ],
            [side * (rearShoulder.halfW * 0.78), THREE.MathUtils.lerp(hullSpec.roofHeight, rearShoulder.shoulderY, 0.5), (roofTailZ + cabinRearZ) * 0.5],
            [side * (rearShoulder.halfW * 0.86), rearShoulder.shoulderY - 0.02, cabinRearZ],
          ],
          isSuv ? 0.055 : 0.044,
          12,
          8,
        );
        bodyGroup.add(new THREE.Mesh(cPillarGeo, isExotic ? paintMat : isSuv ? panelSeamMat : paintMat));
      });

      const rGlassGeo = createCurvedRearGlassGeometry({
        key: `${arch}_rglass`,
        topWidth: topWsW * 0.84,
        bottomWidth: rearShoulder.halfW * 1.48,
        topY: hullSpec.roofHeight - (isSuv ? 0.04 : 0.13),
        bottomY: rearShoulder.shoulderY + 0.02,
        topZ: roofTailZ,
        bottomZ: cabinRearZ,
        wrapZ: isSuv ? 0.05 : 0.16,
      });
      bodyGroup.add(new THREE.Mesh(rGlassGeo, glassMat));
    } else {
      // Classic Cadillac chrome vent-window quarter divider glass behind panoramic curved windshield
      ([-1, 1] as const).forEach((side) => {
        const ventPostGeo = createSweptTubeGeometry(
          `caddy_vent:${side}`,
          [
            [side * (baseWsW * 0.495), cowlY, 0.34],
            [side * (topWsW * 0.495), hullSpec.roofHeight - 0.05, 0.3],
          ],
          0.013,
          6,
          6,
        );
        const ventPaneGeo = createCurvedSideGlassGeometry({
          key: 'caddy_vent_pane',
          side,
          frontZ: windshieldZ - 0.08,
          rearZ: 0.32,
          bottomY: cowlY,
          topY: hullSpec.roofHeight - 0.06,
          bottomX: baseWsW * 0.492,
          topX: topWsW * 0.492,
          midBowOut: 0.015,
        });
        bodyGroup.add(new THREE.Mesh(ventPostGeo, chromeMat), new THREE.Mesh(ventPaneGeo, glassMat));
      });
    }

    const wipers = buildWindshieldWipers(baseWsW * 0.72);
    wipers.position.set(0, cowlY + 0.02, windshieldZ + hullSpec.windshieldWrap * 0.82);
    bodyGroup.add(wipers);
  }

  // 2. Sculpted Contoured Interior (Curved Bolstered Seats, Wrap-Around Dash, Gauges, Console)
  const seatY = isExotic ? 0.58 : isSuv ? 0.76 : 0.66;
  const crestTex = isPearl ? getCadillacCrestEmblemMap() : null;
  const seating = marque?.seatingLayout ?? 'two_seat';
  const driverX = seating === 'center_seat' || seating === 'tandem' ? 0 : -0.38;

  const seatPositions: Array<[number, number]> =
    seating === 'center_seat'
      ? [[0, 0.02], [-0.4, -0.34], [0.4, -0.34]]
      : seating === 'tandem'
        ? [[0, 0.06], [0, -0.6]]
        : seating === 'four_seat'
          ? [[-0.38, 0.14], [0.38, 0.14], [-0.38, -0.56], [0.38, -0.56]]
          : [[-0.38, -0.04], [0.38, -0.04]];

  const bucketGeo = createSculptedSeatBucketGeometry(
    isExotic ? 'racing_bucket' : 'luxury_cruiser',
    isPearl ? 0.5 : 0.44,
  );
  const stripeGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.34, 8, 1, false, 0, Math.PI);
  for (const [sx, sz] of seatPositions) {
    const seat = new THREE.Mesh(bucketGeo, leatherMat);
    seat.position.set(sx, seatY, sz);
    bodyGroup.add(seat);

    if (isExotic && sz > -0.25) {
      const seatStripe = new THREE.Mesh(stripeGeo, accentMetalMat);
      seatStripe.position.set(sx, seatY + 0.14, sz - 0.175);
      seatStripe.rotation.x = -0.18;
      bodyGroup.add(seatStripe);
    }

    if (crestTex) {
      const crestBadge = new THREE.Mesh(
        new THREE.PlaneGeometry(0.085, 0.085),
        new THREE.MeshBasicMaterial({ map: crestTex, transparent: true, alphaTest: 0.15 }),
      );
      crestBadge.position.set(sx, seatY + 0.42, sz - 0.21);
      bodyGroup.add(crestBadge);
    }
  }

  if (isPearl) {
    // Rear luxury contoured bench seat + sculpted woven Stayfast convertible boot behind rear cabin!
    const rearBenchGeo = createSculptedSeatBucketGeometry('luxury_cruiser', 1.38);
    const rearBench = new THREE.Mesh(rearBenchGeo, leatherMat);
    rearBench.position.set(0, seatY + 0.01, -0.74);
    bodyGroup.add(rearBench);

    [-0.4, 0.4].forEach((rx) => {
      if (crestTex) {
        const cBadge = new THREE.Mesh(
          new THREE.PlaneGeometry(0.075, 0.075),
          new THREE.MeshBasicMaterial({ map: crestTex, transparent: true, alphaTest: 0.15 }),
        );
        cBadge.position.set(rx, seatY + 0.41, -0.94);
        bodyGroup.add(cBadge);
      }
    });

    const stayfastTopMat = createConvertibleFabricMaterial(0x16181e);
    const bootGeo = createCurvedDeckPanelGeometry({
      key: 'caddy_folded_boot',
      width: glassW * 0.94,
      length: 0.36,
      crownY: 0.045,
      dropRearY: 0.03,
      taperRear: 0.06,
      forwardZ: false,
    });
    const foldedBoot = new THREE.Mesh(bootGeo, stayfastTopMat);
    foldedBoot.position.set(0, cowlY + 0.08, -0.84);
    const bootTrimGeo = createSweptTubeGeometry(
      'caddy_boot_trim',
      [
        [-glassW * 0.46, cowlY + 0.08, -0.84],
        [0, cowlY + 0.125, -0.81],
        [glassW * 0.46, cowlY + 0.08, -0.84],
      ],
      0.015,
      12,
      8,
    );
    bodyGroup.add(foldedBoot, new THREE.Mesh(bootTrimGeo, chromeMat));
  }

  // Swept wrap-around curved dashboard cowl + curved wood/carbon fascia + sculpted console tunnel + shift boot
  const dashWidth = Math.max(1.0, glassW - 0.16);
  const dashBody = new THREE.Mesh(
    createCurvedDashboardGeometry(`${arch}_dash`, dashWidth, 0.34),
    dashPadMat,
  );
  dashBody.position.set(0, seatY + 0.16, windshieldZ - 0.14);

  const dashFasciaGeo = createSweptTubeGeometry(
    `${arch}_fascia`,
    [
      [-dashWidth * 0.46, seatY + 0.14, windshieldZ - 0.3],
      [0, seatY + 0.16, windshieldZ - 0.25],
      [dashWidth * 0.46, seatY + 0.14, windshieldZ - 0.3],
    ],
    0.032,
    12,
    8,
  );
  const dashFascia = new THREE.Mesh(dashFasciaGeo, dashTrimMat);

  const centerConsole = new THREE.Mesh(
    createCurvedDeckPanelGeometry({
      key: `${arch}_console`,
      width: 0.22,
      length: 0.86,
      crownY: 0.04,
      dropRearY: 0.02,
      taperRear: 0.12,
      forwardZ: false,
    }),
    dashTrimMat,
  );
  centerConsole.position.set(0, seatY + 0.01, windshieldZ - 0.12);

  const shiftBoot = new THREE.Mesh(
    new THREE.ConeGeometry(0.052, 0.09, 12),
    bolsterMat,
  );
  shiftBoot.position.set(0, seatY + 0.06, 0.12);
  const shifter = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.14, 10), chromeMat);
  shifter.position.set(0, seatY + 0.13, 0.12);
  const shifterKnob = new THREE.Mesh(new THREE.SphereGeometry(0.028, 12, 10), chromeMat);
  shifterKnob.position.set(0, seatY + 0.21, 0.12);
  bodyGroup.add(dashBody, dashFascia, centerConsole, shiftBoot, shifter, shifterKnob);

  const gaugeTex = getGaugeClusterMap();
  if (gaugeTex) {
    const gaugePlane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.36, 0.125),
      new THREE.MeshBasicMaterial({ map: gaugeTex }),
    );
    gaugePlane.position.set(driverX, seatY + 0.17, windshieldZ - 0.28);
    gaugePlane.rotation.y = Math.PI;
    bodyGroup.add(gaugePlane);
  }

  if (!marque?.openTopSpeedster) {
    const cabinKit = buildCabinDetailKit({
      mirrorY: hullSpec.roofHeight - 0.08,
      mirrorZ: roofFrontZ - 0.08,
      dashY: seatY + 0.16,
      pedalZ: windshieldZ,
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

  // 3. Hinged Contoured Curved Doors + Mirrors + Handles + Swept Side Aero / Bugatti C-Line
  const doorStartZ = isExotic ? 0.58 : 0.68;
  const doorMidStation = evaluateHullStation(hullSpec, doorStartZ - 0.55);
  const doorWallX = doorMidStation.halfW * 0.99;
  const spearY = isExotic ? 0.54 : isSuv ? 0.72 : 0.62;
  let doorLeft: THREE.Group | undefined;
  let doorRight: THREE.Group | undefined;

  ([-1, 1] as const).forEach((side) => {
    const doorPivot = new THREE.Group();
    doorPivot.position.set(side * doorWallX, hullSpec.sillY + 0.06, doorStartZ);
    const doorLen = isExotic ? 1.06 : 1.36;
    const doorH = Math.max(0.34, doorMidStation.shoulderY - (hullSpec.sillY + 0.06));
    const doorSkin = new THREE.Mesh(
      createCurvedDoorSkinGeometry({
        key: `${arch}_door`,
        side,
        length: doorLen,
        height: doorH,
        bowOut: isExotic ? 0.055 : 0.048,
        tumblehomeTopIn: 0.045,
      }),
      paintMat,
    );
    const doorSeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, doorH * 0.96, 6),
      panelSeamMat,
    );
    doorSeam.position.set(0, doorH * 0.5, -doorLen);

    const handle = buildDoorHandleAssembly({
      side,
      chromeMat: isExotic ? trimMat : chromeMat,
      pocketMat: panelSeamMat,
      withKeyCylinder: !isExotic,
    });
    handle.position.set(side * 0.022, doorH * 0.72, -doorLen * 0.72);

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
    if (arch === 'pagani_huayra') {
      const fShoulder = evaluateHullStation(hullSpec, 0.96);
      mirror.position.set(side * (fShoulder.halfW * 0.96), fShoulder.shoulderY - 0.02, 0.96);
      bodyGroup.add(mirror);
    } else {
      mirror.position.set(side * 0.01, doorH + 0.02, -0.14);
      doorPivot.add(mirror);
    }

    doorPivot.add(doorSkin, doorSeam, handle);
    bodyGroup.add(doorPivot);
    if (side < 0) doorLeft = doorPivot;
    else doorRight = doorPivot;

    if (isPearl) {
      const fBadgeSt = evaluateHullStation(hullSpec, 0.88);
      const badges = buildCadillacFenderBadges(side);
      badges.position.set(side * (fBadgeSt.halfW * 1.045), spearY + 0.13, 0.88);
      bodyGroup.add(badges);
    }

    // Bugatti signature curved sweeping aluminum C-line intake arc clinging organically to flank
    if (marque?.hasBugattiCLine) {
      const cArc = new THREE.Mesh(
        createSweptTubeGeometry(
          `bugatti_cline:${side}`,
          [
            [side * (doorWallX + 0.015), 0.92, -0.52],
            [side * (doorWallX + 0.045), 0.9, -0.05],
            [side * (doorWallX + 0.05), 0.68, 0.18],
            [side * (doorWallX + 0.03), 0.42, 0.04],
            [side * (doorWallX + 0.02), 0.3, -0.65],
          ],
          0.024,
          20,
          10,
        ),
        chromeMat,
      );
      const sideBladeGeo = createSweptTubeGeometry(
        `bugatti_blade:${side}`,
        [
          [side * (doorWallX + 0.025), 0.28, -0.92],
          [side * (doorWallX + 0.01), 0.27, 0.0],
          [side * (doorWallX + 0.025), 0.27, 0.92],
        ],
        0.018,
        12,
        8,
      );
      bodyGroup.add(
        cArc,
        new THREE.Mesh(sideBladeGeo, arch === 'bugatti_divo' ? accentMetalMat : chromeMat),
      );
    } else if (isExotic) {
      // Curved carbon aero side skirts & accent pinstripe following waist contour
      const skirtGeo = createSweptTubeGeometry(
        `${arch}_skirt:${side}`,
        [
          [side * (doorWallX + 0.03), 0.24, -0.9],
          [side * (doorWallX - 0.01), 0.24, 0.0],
          [side * (doorWallX + 0.03), 0.24, 0.9],
        ],
        0.028,
        14,
        8,
      );
      const pinGeo = createSweptTubeGeometry(
        `${arch}_pin:${side}`,
        [
          [side * (doorWallX + 0.038), 0.27, -0.88],
          [side * (doorWallX - 0.002), 0.27, 0.0],
          [side * (doorWallX + 0.038), 0.27, 0.88],
        ],
        0.011,
        14,
        6,
      );
      const scoop = new THREE.Mesh(
        createSculptedScoopGeometry(`${arch}_sidescoop`, 0.2, 0.08, 0.42),
        panelSeamMat,
      );
      scoop.rotation.z = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      const scoopSt = evaluateHullStation(hullSpec, -0.7);
      scoop.position.set(side * (scoopSt.halfW * 0.99), 0.58, -0.7);
      bodyGroup.add(new THREE.Mesh(skirtGeo, carbonMat), new THREE.Mesh(pinGeo, accentMetalMat), scoop);
    }
  });

  // Curved Side Spear Molding hugging flank contour for Collector Classics & Tahoe
  if (!isExotic) {
    ([-1, 1] as const).forEach((side) => {
      const spearZList = [-2.0, -1.2, -0.2, 0.8, 1.85];
      const spearPts: Array<[number, number, number]> = spearZList.map((sz) => {
        const st = evaluateHullStation(hullSpec, sz);
        return [side * (st.halfW * 1.035), spearY, sz];
      });
      const spearGeo = createSweptTubeGeometry(`${arch}_spear:${side}`, spearPts, 0.016, 20, 8);
      bodyGroup.add(new THREE.Mesh(spearGeo, isPearl ? goldTrimMat : chromeMat));

      if (isPearl) {
        const chromePts: Array<[number, number, number]> = spearZList.map((sz) => {
          const st = evaluateHullStation(hullSpec, sz);
          return [side * (st.halfW * 1.04), spearY + 0.022, sz];
        });
        bodyGroup.add(
          new THREE.Mesh(
            createSweptTubeGeometry(`${arch}_spear_chr:${side}`, chromePts, 0.009, 20, 6),
            chromeMat,
          ),
        );
      }
    });
  }

  // 4. Front Grille / Wrap-Around Carbon Splitter + License Plate + Headlights + Taillights
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
    grille.position.set(0, hlY - 0.02, frontZ + 0.015);
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
    // Wrap-around curved carbon front aero splitter matching nose taper
    const splitterGeo = createWrapAroundBumperGeometry({
      key: `${arch}_splitter`,
      halfWidth: bodyW * 0.48,
      wrapBackZ: 0.38,
      centerCurveZ: 0.16,
      height: 0.044,
      thickness: 0.18,
    });
    const splitter = new THREE.Mesh(splitterGeo, carbonMat);
    splitter.position.set(0, 0.25, frontZ - 0.08);
    const splitterPinGeo = createWrapAroundBumperGeometry({
      key: `${arch}_splitter_pin`,
      halfWidth: bodyW * 0.485,
      wrapBackZ: 0.38,
      centerCurveZ: 0.165,
      height: 0.016,
      thickness: 0.186,
    });
    const splitterPin = new THREE.Mesh(splitterPinGeo, accentMetalMat);
    splitterPin.position.set(0, 0.272, frontZ - 0.08);
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
    exoticGrille.position.set(0, 0.4, frontZ + 0.015);
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

  // Taillight Assemblies + Sculpted Razor-Tapered 1959/60 Cadillac Tailfins
  if (isPearl) {
    const tailfinGeo = createCadillacTailfinGeometry({
      key: 'caddy_tailfin',
      length: 1.38,
      frontHeight: 0.06,
      rearHeight: 0.36,
      baseThickness: 0.13,
      crestThickness: 0.024,
    });
    const finSpearGeo = createSweptTubeGeometry(
      'caddy_finspear',
      [
        [0, 0.055, 0.68],
        [0, 0.21, 0.0],
        [0, 0.355, -0.68],
      ],
      0.014,
      12,
      8,
    );
    const rearSt = evaluateHullStation(hullSpec, rearZ + 0.65);
    const finX = rearSt.halfW * 0.85;
    [-finX, finX].forEach((fx) => {
      const fin = new THREE.Mesh(tailfinGeo, paintMat);
      fin.position.set(fx, 0.78, rearZ + 0.7);
      const finSpear = new THREE.Mesh(finSpearGeo, chromeMat);
      finSpear.position.set(fx, 0.78, rearZ + 0.7);
      bodyGroup.add(fin, finSpear);

      const upperBullet = buildRealisticTaillightPod({
        style: 'cadillac_bullet',
        chromeMat,
      });
      upperBullet.position.set(fx, 1.02, rearZ + 0.02);
      const lowerBullet = buildRealisticTaillightPod({
        style: 'cadillac_bullet',
        chromeMat,
      });
      lowerBullet.position.set(fx, 0.74, rearZ + 0.02);
      bodyGroup.add(upperBullet, lowerBullet);

      const ornamentGeo = createSweptTubeGeometry(
        'caddy_fender_spear',
        [
          [0, 0, -0.18],
          [0, 0.018, 0.04],
          [0, 0.004, 0.18],
        ],
        0.014,
        10,
        8,
      );
      const fenderOrnament = new THREE.Mesh(ornamentGeo, chromeMat);
      fenderOrnament.position.set(fx * 0.94, hlY + 0.17, frontZ - 0.28);
      bodyGroup.add(fenderOrnament);
    });

    const vCrestGeo = createSweptTubeGeometry(
      'caddy_vcrest',
      [
        [-0.22, 0.028, -0.04],
        [0, 0, 0.04],
        [0.22, 0.028, -0.04],
      ],
      0.012,
      10,
      8,
    );
    const vCrest = new THREE.Mesh(vCrestGeo, goldTrimMat);
    vCrest.position.set(0, hlY + 0.17, frontZ - 0.16);
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.008, 0.65, 6), chromeMat);
    antenna.position.set(finX, 1.15, frontZ - 0.54);
    bodyGroup.add(vCrest, antenna);
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

  // 5. Wrap-Around Chrome Bumpers / Curved Carbon Diffusers & Exhaust Clusters + Contoured Decklid
  if (!isExotic) {
    const frontWrap = createWrapAroundBumperGeometry({
      key: `${arch}_fbumper`,
      halfWidth: bodyW * 0.5 + 0.08,
      wrapBackZ: 0.34,
      centerCurveZ: 0.14,
      height: 0.17,
      thickness: 0.16,
    });
    const rearWrap = createWrapAroundBumperGeometry({
      key: `${arch}_rbumper`,
      halfWidth: bodyW * 0.5 + 0.08,
      wrapBackZ: 0.34,
      centerCurveZ: 0.12,
      height: 0.17,
      thickness: 0.16,
      isRear: true,
    });
    const frontLip = new THREE.Mesh(frontWrap, chromeMat);
    frontLip.position.set(0, 0.42, frontZ - 0.02);
    const rearLip = new THREE.Mesh(rearWrap, chromeMat);
    rearLip.position.set(0, 0.44, rearZ + 0.02);
    bodyGroup.add(frontLip, rearLip);

    if (isPearl) {
      [-0.58, 0.58].forEach((dx) => {
        const dagmar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.042, 0.088, 0.16, 16),
          chromeMat,
        );
        dagmar.rotation.x = Math.PI / 2;
        dagmar.position.set(dx, 0.43, frontZ + 0.12);
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 8), chromeMat);
        cap.position.set(dx, 0.43, frontZ + 0.2);
        bodyGroup.add(dagmar, cap);
      });
    }
  } else {
    const diffuserGeo = createWrapAroundBumperGeometry({
      key: `${arch}_diffuser`,
      halfWidth: bodyW * 0.47,
      wrapBackZ: 0.3,
      centerCurveZ: 0.1,
      height: 0.12,
      thickness: 0.18,
      isRear: true,
    });
    const rearDiffuser = new THREE.Mesh(diffuserGeo, carbonMat);
    rearDiffuser.position.set(0, 0.32, rearZ + 0.04);
    bodyGroup.add(rearDiffuser);
    [-0.6, -0.3, 0, 0.3, 0.6].forEach((sx) => {
      const strake = new THREE.Mesh(
        createCurvedDeckPanelGeometry({
          key: 'diffuser_strake',
          width: 0.02,
          length: 0.26,
          crownY: 0.008,
          dropRearY: 0.08,
          taperRear: 0.1,
          forwardZ: false,
        }),
        carbonMat,
      );
      strake.position.set(sx, 0.35, rearZ + 0.18);
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

  // Sculpted Teardrop Roof Scoops, Swept Dorsal Shark Fins & Cambered Airfoil Rear Wings
  if (marque?.hasRoofScoop) {
    const scoop = new THREE.Mesh(
      createSculptedScoopGeometry(`${arch}_roofscoop`, 0.32, 0.13, 0.52),
      carbonMat,
    );
    scoop.position.set(0, hullSpec.roofHeight - 0.01, -0.45);
    const inlet = new THREE.Mesh(new THREE.CircleGeometry(0.09, 14), panelSeamMat);
    inlet.position.set(0, hullSpec.roofHeight + 0.04, -0.2);
    bodyGroup.add(scoop, inlet);
  }
  if (marque?.hasDorsalFin) {
    const finGeo = createCadillacTailfinGeometry({
      key: `${arch}_dorsal`,
      length: 1.05,
      frontHeight: 0.24,
      rearHeight: 0.06,
      baseThickness: 0.036,
      crestThickness: 0.014,
    });
    const fin = new THREE.Mesh(finGeo, carbonMat);
    fin.position.set(0, 0.88, -1.25);
    const finStripeGeo = createSweptTubeGeometry(
      `${arch}_dorsal_stripe`,
      [
        [0, 0.24, 0.5],
        [0, 0.16, 0.0],
        [0, 0.065, -0.5],
      ],
      0.011,
      10,
      6,
    );
    const finStripe = new THREE.Mesh(finStripeGeo, accentMetalMat);
    finStripe.position.set(0, 0.88, -1.25);
    bodyGroup.add(fin, finStripe);
  }

  if (marque?.hasWing && marque.wingStyle !== 'none') {
    const wingY = marque.wingStyle === 'gt3_swan' ? 1.14 : 1.04;
    const wingSpan = bodyW + 0.12;
    const wingGeo = createAirfoilWingGeometry({
      key: `${arch}_wing`,
      span: wingSpan,
      chord: 0.34,
      thickness: 0.036,
      dihedral: 0.04,
      sweepBack: 0.06,
    });
    const wing = new THREE.Mesh(wingGeo, paintMat);
    wing.position.set(0, wingY, rearZ + 0.18);
    [-(wingSpan * 0.5), wingSpan * 0.5].forEach((ex) => {
      const epGeo = createCadillacTailfinGeometry({
        key: `${arch}_endplate`,
        length: 0.38,
        frontHeight: 0.18,
        rearHeight: 0.22,
        baseThickness: 0.026,
        crestThickness: 0.018,
      });
      const endplate = new THREE.Mesh(epGeo, carbonMat);
      endplate.position.set(ex, wingY - 0.06, rearZ + 0.12);
      bodyGroup.add(endplate);
    });
    const pylonSpan = marque.wingStyle === 'f1_split' ? 0.32 : 0.48;
    [-pylonSpan, pylonSpan].forEach((px) => {
      const pylonGeo = createSweptTubeGeometry(
        `${arch}_pylon:${px}`,
        [
          [px, 0.8, rearZ + 0.34],
          [px, (0.8 + wingY) * 0.5, rearZ + 0.28],
          [px, wingY + 0.01, rearZ + 0.2],
        ],
        0.028,
        10,
        8,
      );
      bodyGroup.add(new THREE.Mesh(pylonGeo, carbonMat));
    });
    bodyGroup.add(wing);
  }

  // Hinged Contoured Curved Rear Engine Decklid / Trunk Lid
  const deckHinge = new THREE.Group();
  deckHinge.position.set(0, isExotic ? 0.86 : 0.81, -0.96);
  const deckLen = Math.max(0.75, Math.abs(rearZ) - 1.18);
  const deckPanel = new THREE.Mesh(
    createCurvedDeckPanelGeometry({
      key: `${arch}_decklid`,
      width: bodyW * 0.62,
      length: deckLen,
      crownY: 0.048,
      dropRearY: isExotic ? 0.09 : 0.04,
      taperRear: 0.18,
      forwardZ: false,
    }),
    isExotic ? carbonMat : paintMat,
  );
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
