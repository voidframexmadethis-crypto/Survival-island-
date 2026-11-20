import * as THREE from 'three';
import { VehicleVisualArchetype } from '../systems/vehicleProfiles';
import { ensureGeometryHasUv } from './textures';

export interface VehicleHullDimensions {
  width: number;
  frontZ: number;
  rearZ: number;
  archZFront: number;
  archZRear: number;
  archRadius: number;
  archY: number;
}

export interface VehicleHullSurfaceSpec extends VehicleHullDimensions {
  archetype: VehicleVisualArchetype;
  /** Baseline beltline shoulder height */
  beltY: number;
  /** Lower rocker height outside wheel arches */
  sillY: number;
  /** Nose tip height at frontZ */
  noseY: number;
  /** Tail deck height at rearZ */
  tailY: number;
  /** Peak lateral camber crown added at x=0 across hood/trunk */
  crownHeight: number;
  /** Raised twin front fender crests (e.g. classic Cadillac / Monza SP2 / Vantage) */
  fenderCrestLift: number;
  /** Concave door cove / aero waist scallop depth along cabin sides */
  waistPinch: number;
  /** Muscular haunch flare over rear axle */
  rearHaunchFlare: number;
  /** Muscular front fender flare over front axle */
  frontFenderFlare: number;
  /** Nose plan-view corner rounding (0..1) */
  noseTaper: number;
  /** Tail plan-view corner rounding / boat-tail taper (0..1) */
  tailTaper: number;
  /** Rocker tuck-under & mid-door belly curve */
  lowerTuck: number;
  midBelly: number;
  shoulderTuck: number;
  /** Open cockpit cavity (true for convertible Cadillac, Monza SP2, show roadsters) */
  openCockpit: boolean;
  cockpitFrontZ: number;
  cockpitRearZ: number;
  cockpitHalfWidth: number;
  cockpitFloorY: number;
  /** Optional raised fastback / rear engine buttresses or SUV body shoulder height */
  hoodPeakY: number;
  hoodPeakZ: number;
  rearDeckY: number;
  rearDeckZ: number;
  /** Crispness (0 = liquid smooth GT/streamliner, 1 = sharp Lamborghini stealth chamfer) */
  shoulderSharpness: number;
  /** Arch rolled fender lip outward flare */
  archLipFlare: number;
  /** Deep F1 Venturi sidepod undercut between axles (Valkyrie / Delage D12) */
  venturiUndercut: number;
  /** Curved windshield & canopy proportions */
  windshieldZ: number;
  cabinRearZ: number;
  roofHeight: number;
  roofHalfWidth: number;
  windshieldWrap: number;
}

const _sharedSurfaceCache = new Map<string, THREE.BufferGeometry>();

function cachedGeo(key: string, factory: () => THREE.BufferGeometry): THREE.BufferGeometry {
  const hit = _sharedSurfaceCache.get(key);
  if (hit) return hit;
  const geo = factory();
  ensureGeometryHasUv(geo);
  geo.computeBoundingSphere();
  geo.userData = { ...(geo.userData ?? {}), sharedAsset: true };
  _sharedSurfaceCache.set(key, geo);
  return geo;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0 || 1));
  return t * t * (3 - 2 * t);
}

function bell(x: number, center: number, radius: number): number {
  const d = Math.abs(x - center) / Math.max(1e-4, radius);
  if (d >= 1) return 0;
  const u = 1 - d * d;
  return u * u;
}

export function getVehicleHullSurfaceSpec(
  archetype: VehicleVisualArchetype,
): VehicleHullSurfaceSpec {
  const base: VehicleHullSurfaceSpec = {
    archetype,
    width: 1.84,
    frontZ: 2.24,
    rearZ: -2.18,
    archZFront: 1.4,
    archZRear: -1.34,
    archRadius: 0.43,
    archY: 0.37,
    beltY: 0.78,
    sillY: 0.25,
    noseY: 0.48,
    tailY: 0.79,
    crownHeight: 0.085,
    fenderCrestLift: 0.035,
    waistPinch: 0.075,
    rearHaunchFlare: 0.095,
    frontFenderFlare: 0.06,
    noseTaper: 0.36,
    tailTaper: 0.3,
    lowerTuck: 0.85,
    midBelly: 1.045,
    shoulderTuck: 0.91,
    openCockpit: false,
    cockpitFrontZ: 0.62,
    cockpitRearZ: -0.78,
    cockpitHalfWidth: 0.68,
    cockpitFloorY: 0.42,
    hoodPeakY: 0.78,
    hoodPeakZ: 0.92,
    rearDeckY: 0.86,
    rearDeckZ: -1.24,
    shoulderSharpness: 0.15,
    archLipFlare: 0.048,
    venturiUndercut: 0.0,
    windshieldZ: 0.56,
    cabinRearZ: -0.95,
    roofHeight: 1.15,
    roofHalfWidth: 0.68,
    windshieldWrap: 0.24,
  };

  switch (archetype) {
    case 'mclaren_speedtail':
      return {
        ...base,
        width: 1.82,
        frontZ: 2.34,
        rearZ: -2.56,
        archZFront: 1.44,
        archZRear: -1.42,
        beltY: 0.75,
        noseY: 0.44,
        tailY: 0.52,
        crownHeight: 0.11,
        fenderCrestLift: 0.045,
        waistPinch: 0.06,
        rearHaunchFlare: 0.07,
        frontFenderFlare: 0.05,
        noseTaper: 0.48,
        tailTaper: 0.62,
        midBelly: 1.055,
        shoulderTuck: 0.88,
        hoodPeakY: 0.78,
        hoodPeakZ: 0.9,
        rearDeckY: 0.88,
        rearDeckZ: -1.15,
        windshieldZ: 0.6,
        cabinRearZ: -1.2,
        roofHeight: 1.13,
        roofHalfWidth: 0.62,
        windshieldWrap: 0.34,
      };

    case 'ferrari_monza_sp2':
      return {
        ...base,
        width: 1.88,
        frontZ: 2.28,
        rearZ: -2.16,
        archZFront: 1.4,
        archZRear: -1.32,
        beltY: 0.8,
        noseY: 0.5,
        tailY: 0.8,
        crownHeight: 0.11,
        fenderCrestLift: 0.055,
        waistPinch: 0.085,
        rearHaunchFlare: 0.1,
        frontFenderFlare: 0.075,
        noseTaper: 0.42,
        tailTaper: 0.34,
        midBelly: 1.06,
        shoulderTuck: 0.9,
        openCockpit: true,
        cockpitFrontZ: 0.48,
        cockpitRearZ: -0.58,
        cockpitHalfWidth: 0.68,
        cockpitFloorY: 0.46,
        hoodPeakY: 0.86,
        hoodPeakZ: 1.05,
        rearDeckY: 0.84,
        rearDeckZ: -1.12,
        windshieldZ: 0.46,
        cabinRearZ: -0.68,
        roofHeight: 0.96,
        roofHalfWidth: 0.68,
        windshieldWrap: 0.28,
      };

    case 'aston_vantage_gt3':
    case 'sls_amg_black':
      return {
        ...base,
        width: 1.9,
        frontZ: 2.28,
        rearZ: -2.14,
        archZFront: 1.42,
        archZRear: -1.32,
        beltY: 0.82,
        noseY: 0.52,
        tailY: 0.82,
        crownHeight: 0.095,
        fenderCrestLift: 0.05,
        waistPinch: 0.08,
        rearHaunchFlare: 0.12,
        frontFenderFlare: 0.09,
        noseTaper: 0.34,
        tailTaper: 0.28,
        midBelly: 1.055,
        shoulderTuck: 0.91,
        cockpitFrontZ: 0.34,
        cockpitRearZ: -0.84,
        hoodPeakY: 0.86,
        hoodPeakZ: 0.92,
        rearDeckY: 0.88,
        rearDeckZ: -1.3,
        windshieldZ: 0.28,
        cabinRearZ: -1.04,
        roofHeight: 1.19,
        roofHalfWidth: 0.67,
        windshieldWrap: 0.26,
      };

    case 'bugatti_chiron':
    case 'bugatti_divo':
      return {
        ...base,
        width: 1.96,
        frontZ: 2.26,
        rearZ: -2.22,
        archZFront: 1.44,
        archZRear: -1.38,
        archRadius: 0.44,
        beltY: 0.84,
        noseY: 0.52,
        tailY: 0.85,
        crownHeight: 0.1,
        fenderCrestLift: 0.045,
        waistPinch: 0.105,
        rearHaunchFlare: 0.125,
        frontFenderFlare: 0.08,
        noseTaper: 0.38,
        tailTaper: 0.25,
        midBelly: 1.065,
        shoulderTuck: 0.9,
        hoodPeakY: 0.84,
        hoodPeakZ: 1.0,
        rearDeckY: 0.93,
        rearDeckZ: -1.25,
        windshieldZ: 0.62,
        cabinRearZ: -0.98,
        roofHeight: 1.2,
        roofHalfWidth: 0.72,
        windshieldWrap: 0.3,
      };

    case 'koenigsegg_gemera':
      return {
        ...base,
        width: 1.9,
        frontZ: 2.32,
        rearZ: -2.32,
        archZFront: 1.48,
        archZRear: -1.46,
        beltY: 0.8,
        noseY: 0.48,
        tailY: 0.83,
        crownHeight: 0.095,
        fenderCrestLift: 0.04,
        waistPinch: 0.075,
        rearHaunchFlare: 0.1,
        frontFenderFlare: 0.07,
        noseTaper: 0.4,
        tailTaper: 0.34,
        cockpitFrontZ: 0.76,
        cockpitRearZ: -0.96,
        hoodPeakY: 0.82,
        hoodPeakZ: 1.15,
        rearDeckY: 0.88,
        rearDeckZ: -1.45,
        windshieldZ: 0.74,
        cabinRearZ: -1.16,
        roofHeight: 1.21,
        roofHalfWidth: 0.71,
        windshieldWrap: 0.44,
      };

    case 'aston_valkyrie':
    case 'delage_d12':
      return {
        ...base,
        width: archetype === 'delage_d12' ? 1.78 : 1.82,
        frontZ: 2.38,
        rearZ: -2.26,
        archZFront: 1.44,
        archZRear: -1.36,
        beltY: 0.72,
        sillY: 0.23,
        noseY: 0.38,
        tailY: 0.71,
        crownHeight: 0.12,
        fenderCrestLift: 0.06,
        waistPinch: 0.24,
        rearHaunchFlare: 0.15,
        frontFenderFlare: 0.12,
        noseTaper: 0.56,
        tailTaper: 0.48,
        midBelly: 1.03,
        shoulderTuck: 0.86,
        cockpitHalfWidth: 0.46,
        venturiUndercut: 0.18,
        hoodPeakY: 0.7,
        hoodPeakZ: 1.02,
        rearDeckY: 0.78,
        rearDeckZ: -1.25,
        windshieldZ: 0.56,
        cabinRearZ: -0.92,
        roofHeight: 1.08,
        roofHalfWidth: 0.46,
        windshieldWrap: 0.42,
      };

    case 'lamborghini_sian':
    case 'huracan_gt3':
      return {
        ...base,
        width: 1.92,
        frontZ: 2.26,
        rearZ: -2.16,
        archZFront: 1.38,
        archZRear: -1.32,
        beltY: 0.77,
        sillY: 0.23,
        noseY: 0.42,
        tailY: 0.81,
        crownHeight: 0.065,
        fenderCrestLift: 0.04,
        waistPinch: 0.095,
        rearHaunchFlare: 0.12,
        frontFenderFlare: 0.085,
        noseTaper: 0.36,
        tailTaper: 0.22,
        midBelly: 1.04,
        shoulderTuck: 0.9,
        shoulderSharpness: 0.82,
        hoodPeakY: 0.76,
        hoodPeakZ: 0.92,
        rearDeckY: 0.87,
        rearDeckZ: -1.28,
        windshieldZ: 0.58,
        cabinRearZ: -0.9,
        roofHeight: 1.12,
        roofHalfWidth: 0.67,
        windshieldWrap: 0.2,
      };

    case 'mclaren_720s':
    case 'mclaren_p1_gtr':
    case 'ferrari_sf90':
    case 'pagani_huayra':
    case 'mclaren':
      return {
        ...base,
        width: archetype === 'pagani_huayra' ? 1.88 : 1.9,
        frontZ: 2.24,
        rearZ: -2.18,
        archZFront: 1.4,
        archZRear: -1.34,
        beltY: 0.78,
        noseY: 0.46,
        tailY: 0.8,
        crownHeight: 0.1,
        fenderCrestLift: 0.048,
        waistPinch: 0.11,
        rearHaunchFlare: 0.12,
        frontFenderFlare: 0.075,
        noseTaper: 0.4,
        tailTaper: 0.32,
        midBelly: 1.06,
        shoulderTuck: 0.88,
        hoodPeakY: 0.78,
        hoodPeakZ: 0.95,
        rearDeckY: 0.88,
        rearDeckZ: -1.22,
        windshieldZ: 0.56,
        cabinRearZ: -0.95,
        roofHeight: 1.15,
        roofHalfWidth: 0.65,
        windshieldWrap: 0.3,
      };

    case 'chevy_tahoe':
      return {
        ...base,
        width: 1.98,
        frontZ: 2.44,
        rearZ: -2.38,
        archZFront: 1.44,
        archZRear: -1.32,
        archRadius: 0.54,
        archY: 0.44,
        beltY: 0.96,
        sillY: 0.22,
        noseY: 0.82,
        tailY: 0.94,
        crownHeight: 0.065,
        fenderCrestLift: 0.032,
        waistPinch: 0.018,
        rearHaunchFlare: 0.042,
        frontFenderFlare: 0.042,
        noseTaper: 0.22,
        tailTaper: 0.16,
        lowerTuck: 0.89,
        midBelly: 1.035,
        shoulderTuck: 0.94,
        cockpitFrontZ: 0.78,
        cockpitRearZ: -2.1,
        cockpitHalfWidth: 0.78,
        cockpitFloorY: 0.44,
        hoodPeakY: 0.99,
        hoodPeakZ: 1.12,
        rearDeckY: 0.95,
        rearDeckZ: -2.25,
        shoulderSharpness: 0.25,
        archLipFlare: 0.055,
        windshieldZ: 0.78,
        cabinRearZ: -2.2,
        roofHeight: 1.54,
        roofHalfWidth: 0.82,
        windshieldWrap: 0.18,
      };

    case 'cadillac':
      return {
        ...base,
        width: 1.9,
        frontZ: 2.48,
        rearZ: -2.5,
        archZFront: 1.4,
        archZRear: -1.26,
        archRadius: 0.44,
        archY: 0.38,
        beltY: 0.82,
        sillY: 0.25,
        noseY: 0.74,
        tailY: 0.8,
        crownHeight: 0.072,
        fenderCrestLift: 0.048,
        waistPinch: 0.032,
        rearHaunchFlare: 0.048,
        frontFenderFlare: 0.045,
        noseTaper: 0.24,
        tailTaper: 0.22,
        lowerTuck: 0.86,
        midBelly: 1.045,
        shoulderTuck: 0.94,
        openCockpit: true,
        cockpitFrontZ: 0.68,
        cockpitRearZ: -0.96,
        cockpitHalfWidth: 0.72,
        cockpitFloorY: 0.36,
        hoodPeakY: 0.84,
        hoodPeakZ: 1.05,
        rearDeckY: 0.81,
        rearDeckZ: -1.45,
        shoulderSharpness: 0.2,
        archLipFlare: 0.04,
        windshieldZ: 0.66,
        cabinRearZ: -0.95,
        roofHeight: 1.32,
        roofHalfWidth: 0.75,
        windshieldWrap: 0.36,
      };

    case 'lowrider':
    case 'slab':
      return {
        ...base,
        width: 1.88,
        frontZ: 2.42,
        rearZ: -2.42,
        archZFront: 1.38,
        archZRear: -1.24,
        archRadius: 0.44,
        archY: 0.38,
        beltY: 0.8,
        sillY: 0.25,
        noseY: 0.72,
        tailY: 0.78,
        crownHeight: 0.075,
        fenderCrestLift: 0.04,
        waistPinch: 0.035,
        rearHaunchFlare: 0.05,
        frontFenderFlare: 0.045,
        noseTaper: 0.24,
        tailTaper: 0.22,
        lowerTuck: 0.87,
        midBelly: 1.04,
        shoulderTuck: 0.94,
        cockpitFrontZ: 0.68,
        cockpitRearZ: -0.94,
        cockpitHalfWidth: 0.72,
        cockpitFloorY: 0.36,
        hoodPeakY: 0.82,
        hoodPeakZ: 1.05,
        rearDeckY: 0.79,
        rearDeckZ: -1.45,
        shoulderSharpness: 0.22,
        windshieldZ: 0.66,
        cabinRearZ: -0.96,
        roofHeight: 1.32,
        roofHalfWidth: 0.74,
        windshieldWrap: 0.28,
      };

    case 'donk':
      return {
        ...base,
        width: 1.88,
        frontZ: 2.28,
        rearZ: -2.28,
        archZFront: 1.36,
        archZRear: -1.24,
        archRadius: 0.56,
        archY: 0.48,
        beltY: 0.94,
        sillY: 0.38,
        noseY: 0.84,
        tailY: 0.9,
        crownHeight: 0.075,
        fenderCrestLift: 0.042,
        waistPinch: 0.03,
        rearHaunchFlare: 0.055,
        frontFenderFlare: 0.055,
        noseTaper: 0.24,
        tailTaper: 0.2,
        lowerTuck: 0.88,
        midBelly: 1.04,
        shoulderTuck: 0.94,
        cockpitFrontZ: 0.64,
        cockpitRearZ: -0.92,
        cockpitHalfWidth: 0.72,
        cockpitFloorY: 0.5,
        hoodPeakY: 0.96,
        hoodPeakZ: 1.05,
        rearDeckY: 0.92,
        rearDeckZ: -1.4,
        shoulderSharpness: 0.22,
        windshieldZ: 0.62,
        cabinRearZ: -0.96,
        roofHeight: 1.46,
        roofHalfWidth: 0.74,
        windshieldWrap: 0.24,
      };

    default:
      return base;
  }
}

/** Evaluates longitudinal hull width, heights, arch curve, and cockpit trough at station z */
export function evaluateHullStation(
  spec: VehicleHullSurfaceSpec,
  z: number,
): {
  halfW: number;
  flankBottomY: number;
  shoulderY: number;
  centerTopY: number;
  fenderCrestY: number;
  archCut: number;
  archLipOut: number;
  coveIn: number;
  cockpitTrough: number;
  underTrayY: number;
  inCockpit: number;
} {
  const { frontZ, rearZ } = spec;
  const uZ = clamp01((z - rearZ) / (frontZ - rearZ));

  // Nose & tail plan-view ellipse rounding
  const frontEndDist = clamp01((frontZ - z) / 0.52);
  const rearEndDist = clamp01((z - rearZ) / 0.54);
  const frontPlan =
    frontEndDist >= 1
      ? 1
      : 1 - spec.noseTaper * Math.pow(1 - frontEndDist, 1.85);
  const rearPlan =
    rearEndDist >= 1
      ? 1
      : 1 - spec.tailTaper * Math.pow(1 - rearEndDist, 1.75);

  const frontFenderBell = bell(z, spec.archZFront, 0.54) * spec.frontFenderFlare;
  const rearHaunchBell = bell(z, spec.archZRear, 0.64) * spec.rearHaunchFlare;
  const waistCenter = (spec.archZFront + spec.archZRear) * 0.5 - 0.05;
  const waistRadius = Math.max(0.4, (spec.archZFront - spec.archZRear) * 0.42);
  const waistDip = bell(z, waistCenter, waistRadius) * spec.waistPinch;

  const baseHalfW = spec.width * 0.5;
  const halfW = Math.max(
    0.22,
    (baseHalfW + frontFenderBell + rearHaunchBell - waistDip) * frontPlan * rearPlan,
  );

  // Scalloped door cove behind front wheel (mid-engine intakes & classic side spear scallop)
  const coveCenter = (spec.archZFront + spec.archZRear) * 0.5 - 0.18;
  const coveIn = bell(z, coveCenter, 0.52) * Math.max(0.03, spec.waistPinch * 0.85);

  // Wheel arch semicircular carving
  const dzF = z - spec.archZFront;
  const dzR = z - spec.archZRear;
  const archRF = spec.archRadius;
  const archRR = spec.archRadius * 1.02;

  let archLiftF = 0;
  let archCutF = 0;
  if (Math.abs(dzF) < archRF) {
    const chord = Math.sqrt(Math.max(0, archRF * archRF - dzF * dzF));
    archLiftF = spec.archY + chord;
    archCutF = clamp01(chord / archRF);
  }
  let archLiftR = 0;
  let archCutR = 0;
  if (Math.abs(dzR) < archRR) {
    const chord = Math.sqrt(Math.max(0, archRR * archRR - dzR * dzR));
    archLiftR = spec.archY + chord;
    archCutR = clamp01(chord / archRR);
  }

  const archCut = Math.max(archCutF, archCutR);
  const archLipOut = Math.sin(archCut * Math.PI * 0.68) * spec.archLipFlare;

  // Base sill / Venturi floor kick-up
  const rearKickUp = smoothstep(spec.archZRear - 0.25, rearZ, z) * 0.085;
  const frontLipDrop = smoothstep(spec.archZFront + 0.15, frontZ, z) * 0.025;
  const sillBaseY = spec.sillY + rearKickUp - frontLipDrop;

  const flankBottomY = Math.max(sillBaseY, archLiftF, archLiftR);
  const underTrayY = sillBaseY + 0.02;

  // Longitudinal beltline / shoulder profile
  let shoulderY = spec.beltY;
  if (z > spec.hoodPeakZ) {
    const tFront = smoothstep(spec.hoodPeakZ, frontZ, z);
    shoulderY = THREE.MathUtils.lerp(spec.hoodPeakY, spec.noseY, Math.pow(tFront, 1.35));
  } else if (z < spec.rearDeckZ) {
    const tRear = smoothstep(spec.rearDeckZ, rearZ, z);
    shoulderY = THREE.MathUtils.lerp(spec.rearDeckY, spec.tailY, Math.pow(tRear, 1.25));
  } else {
    // Gentle curved rise from front cowl toward muscular rear haunch
    const tMid = smoothstep(spec.hoodPeakZ, spec.rearDeckZ, z);
    shoulderY = THREE.MathUtils.lerp(spec.hoodPeakY, spec.rearDeckY, tMid);
    // Subtle wheel-arch crown swell over front fender & rear haunch
    shoulderY +=
      bell(z, spec.archZFront, 0.56) * 0.042 +
      bell(z, spec.archZRear, 0.62) * 0.048;
  }

  // Open or recessed cockpit depression at center top
  const cockFadeF = 1 - smoothstep(spec.cockpitFrontZ - 0.14, spec.cockpitFrontZ + 0.12, z);
  const cockFadeR = smoothstep(spec.cockpitRearZ - 0.14, spec.cockpitRearZ + 0.14, z);
  const inCockpit = clamp01(cockFadeF * cockFadeR);
  const cockpitTrough = inCockpit * (shoulderY - spec.cockpitFloorY);

  // Centerline hood/deck crown
  const endDrop = Math.min(1, Math.min(frontEndDist, rearEndDist) * 1.4);
  const centerCrown = spec.crownHeight * (0.45 + 0.55 * endDrop) * (1 - inCockpit);
  const fenderCrestY =
    shoulderY +
    spec.fenderCrestLift *
      (bell(z, spec.archZFront, 0.78) + 0.6 * bell(z, spec.archZRear, 0.72));

  const centerTopY =
    shoulderY + centerCrown - (spec.openCockpit ? cockpitTrough : cockpitTrough * 0.55);

  // Unused uZ suppression check
  void uZ;

  return {
    halfW,
    flankBottomY,
    shoulderY,
    centerTopY,
    fenderCrestY,
    archCut,
    archLipOut,
    coveIn,
    cockpitTrough,
    underTrayY,
    inCockpit,
  };
}

/**
 * Generates adaptive sorted Z stations from rearZ to frontZ with extra density
 * around nose cone, tail taper, front/rear circular wheel arches, and cockpit cowl.
 */
function buildAdaptiveZStations(spec: VehicleHullSurfaceSpec): number[] {
  const { rearZ, frontZ, archZFront, archZRear, archRadius } = spec;
  const raw: number[] = [];

  // Uniform backbone (~34 stations)
  const baseSteps = 34;
  for (let i = 0; i <= baseSteps; i++) {
    raw.push(THREE.MathUtils.lerp(rearZ, frontZ, i / baseSteps));
  }

  // Dense circular wheel-arch framing (9 stations each)
  for (const [az, ar] of [
    [archZRear, archRadius * 1.02],
    [archZFront, archRadius],
  ] as const) {
    for (let k = -4; k <= 4; k++) {
      const ang = (k / 4) * (Math.PI * 0.48);
      raw.push(az + Math.sin(ang) * ar);
    }
    raw.push(az - ar - 0.015, az + ar + 0.015);
  }

  // Extra nose & tail rounding stations
  raw.push(
    frontZ - 0.04,
    frontZ - 0.11,
    frontZ - 0.22,
    rearZ + 0.04,
    rearZ + 0.11,
    rearZ + 0.22,
    spec.cockpitFrontZ + 0.06,
    spec.cockpitFrontZ - 0.06,
    spec.cockpitRearZ + 0.06,
    spec.cockpitRearZ - 0.06,
  );

  const clamped = raw
    .map((v) => Math.max(rearZ, Math.min(frontZ, v)))
    .sort((a, b) => a - b);

  // Deduplicate closer than 0.02m except exact endpoints
  const out: number[] = [clamped[0]];
  for (let i = 1; i < clamped.length; i++) {
    const prev = out[out.length - 1];
    if (clamped[i] - prev > 0.022 || i === clamped.length - 1) {
      out.push(clamped[i]);
    }
  }
  return out;
}

/**
 * Evaluates closed perimeter cross-section points (29 points around left sill -> left flank ->
 * top crown -> right flank -> right sill -> center undertray) at longitudinal station z.
 */
function evaluateCrossSectionLoop(
  spec: VehicleHullSurfaceSpec,
  z: number,
  endScale = 1,
): Array<[number, number]> {
  const st = evaluateHullStation(spec, z);
  const w = st.halfW * endScale;
  const lipOut = st.archLipOut * endScale;
  const midCenterY = (st.flankBottomY + st.shoulderY) * 0.5;

  const yAt = (baseY: number) =>
    endScale >= 0.999 ? baseY : THREE.MathUtils.lerp(midCenterY, baseY, endScale);

  // Left side goes from bottom-outer UP to top-shoulder; Top goes left-to-right; Right goes DOWN; Bottom goes right-to-left.
  const pts: Array<[number, number]> = [];

  // 1. Left lower sill / arch lip -> mid flank -> upper shoulder (6 points, tY from 0..1)
  const leftFlankSteps = 5;
  for (let k = 0; k <= leftFlankSteps; k++) {
    const t = k / leftFlankSteps;
    const bellyCurve = Math.sin(t * Math.PI);
    const covePull = st.coveIn * Math.sin(t * Math.PI) * (1 - spec.shoulderSharpness * 0.45);
    const venturiPull =
      spec.venturiUndercut *
      bell(z, (spec.archZFront + spec.archZRear) * 0.5, 0.68) *
      (1 - t);
    const xMult =
      t < 0.5
        ? THREE.MathUtils.lerp(spec.lowerTuck, spec.midBelly, smoothstep(0, 0.5, t))
        : THREE.MathUtils.lerp(spec.midBelly, spec.shoulderTuck, smoothstep(0.5, 1, t));
    const lipBoost = k <= 1 ? lipOut * (1 - k * 0.45) : 0;
    const sharpnessBelly = spec.shoulderSharpness > 0.5 ? 1 + (bellyCurve - 0.5) * 0.04 : 1;
    const x = -((w * xMult * sharpnessBelly + lipBoost) - covePull - venturiPull);
    const y = yAt(THREE.MathUtils.lerp(st.flankBottomY, st.shoulderY, t));
    pts.push([x, y]);
  }

  // 2. Top lateral deck / hood / cockpit trough (11 points across -X -> 0 -> +X)
  const topSteps = 10;
  const shX = w * spec.shoulderTuck;
  const cockRatio = clamp01(spec.cockpitHalfWidth / Math.max(0.35, shX));

  for (let k = 1; k < topSteps; k++) {
    const u = k / topSteps; // 0 (left shoulder) -> 1 (right shoulder)
    const sX = u * 2 - 1; // -1 -> +1
    const absX = Math.abs(sX);
    const x = sX * shX;

    // Fender crest bump around |sX| ~ 0.72 tapering to center crown
    const crestBlend = Math.exp(-Math.pow((absX - 0.76) / 0.22, 2));
    const crownBlend = Math.cos(absX * Math.PI * 0.5);
    let topY = THREE.MathUtils.lerp(
      st.shoulderY,
      st.fenderCrestY,
      crestBlend * 0.85,
    );
    topY += (st.centerTopY - st.shoulderY) * Math.max(0, crownBlend);

    // If inside cockpit opening, curve smoothly down to cockpit sill & floor
    if (st.inCockpit > 0.02 && absX < cockRatio) {
      const innerT = clamp01(1 - absX / cockRatio);
      const wallDrop = smoothstep(0, 0.32, innerT);
      const dropAmt =
        (spec.openCockpit ? st.cockpitTrough : st.cockpitTrough * 0.65) * wallDrop;
      topY -= dropAmt;
    }

    pts.push([x, yAt(topY)]);
  }

  // 3. Right shoulder -> mid flank -> right lower sill / arch lip (6 points, tY from 1..0)
  for (let k = leftFlankSteps; k >= 0; k--) {
    const t = k / leftFlankSteps;
    const bellyCurve = Math.sin(t * Math.PI);
    const covePull = st.coveIn * Math.sin(t * Math.PI) * (1 - spec.shoulderSharpness * 0.45);
    const venturiPull =
      spec.venturiUndercut *
      bell(z, (spec.archZFront + spec.archZRear) * 0.5, 0.68) *
      (1 - t);
    const xMult =
      t < 0.5
        ? THREE.MathUtils.lerp(spec.lowerTuck, spec.midBelly, smoothstep(0, 0.5, t))
        : THREE.MathUtils.lerp(spec.midBelly, spec.shoulderTuck, smoothstep(0.5, 1, t));
    const lipBoost = k <= 1 ? lipOut * (1 - k * 0.45) : 0;
    const sharpnessBelly = spec.shoulderSharpness > 0.5 ? 1 + (bellyCurve - 0.5) * 0.04 : 1;
    const x = (w * xMult * sharpnessBelly + lipBoost) - covePull - venturiPull;
    const y = yAt(THREE.MathUtils.lerp(st.flankBottomY, st.shoulderY, t));
    pts.push([x, y]);
  }

  // 4. Right underbody tuck -> center floor -> left underbody tuck (closes loop!)
  const innerFloorW = st.archCut > 0.08 ? Math.max(0.32, w * 0.52) : w * 0.72;
  pts.push([innerFloorW, yAt(st.underTrayY)]);
  pts.push([0, yAt(st.underTrayY - 0.015)]);
  pts.push([-innerFloorW, yAt(st.underTrayY)]);

  return pts;
}

/**
 * Builds a true 3D compound-curved, arch-carved automotive body hull geometry
 * with plan-view taper, waist/haunch swells, tumblehome, fender crests, and flared wheel openings.
 */
export function createSculptedBodyHullGeometry(
  archetype: VehicleVisualArchetype,
): THREE.BufferGeometry {
  return cachedGeo(`hull:${archetype}`, () => {
    const spec = getVehicleHullSurfaceSpec(archetype);
    const zStations = buildAdaptiveZStations(spec);

    // Add rounded nose & tail cap closure rings
    const rings: Array<{ z: number; pts: Array<[number, number]> }> = [];

    // Rear collapsed cap
    rings.push({
      z: spec.rearZ - 0.025,
      pts: evaluateCrossSectionLoop(spec, spec.rearZ, 0.08),
    });
    rings.push({
      z: spec.rearZ - 0.01,
      pts: evaluateCrossSectionLoop(spec, spec.rearZ, 0.62),
    });

    for (const z of zStations) {
      rings.push({
        z,
        pts: evaluateCrossSectionLoop(spec, z, 1.0),
      });
    }

    // Front collapsed cap
    rings.push({
      z: spec.frontZ + 0.012,
      pts: evaluateCrossSectionLoop(spec, spec.frontZ, 0.64),
    });
    rings.push({
      z: spec.frontZ + 0.03,
      pts: evaluateCrossSectionLoop(spec, spec.frontZ, 0.08),
    });

    const ringCount = rings.length;
    const loopLen = rings[0].pts.length;
    const stride = loopLen + 1; // duplicate first point at end for clean UV seam

    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    const totalLen = Math.max(0.1, spec.frontZ - spec.rearZ);

    for (let i = 0; i < ringCount; i++) {
      const r = rings[i];
      const vCoord = clamp01((r.z - spec.rearZ) / totalLen);
      for (let j = 0; j < stride; j++) {
        const pt = r.pts[j % loopLen];
        positions.push(pt[0], pt[1], r.z);
        uvs.push(j / loopLen, vCoord);
      }
    }

    for (let i = 0; i < ringCount - 1; i++) {
      for (let j = 0; j < loopLen; j++) {
        const a = i * stride + j;
        const b = (i + 1) * stride + j;
        const c = (i + 1) * stride + (j + 1);
        const d = i * stride + (j + 1);
        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    // Close front & rear tiny cap poles so the mesh is a closed manifold
    const rearCenterIdx = positions.length / 3;
    const r0 = rings[0];
    let r0AvgY = 0;
    for (const p of r0.pts) r0AvgY += p[1];
    r0AvgY /= r0.pts.length;
    positions.push(0, r0AvgY, r0.z);
    uvs.push(0.5, 0);
    for (let j = 0; j < loopLen; j++) {
      indices.push(rearCenterIdx, j, j + 1);
    }

    const frontCenterIdx = positions.length / 3;
    const rLast = rings[ringCount - 1];
    let rLAvgY = 0;
    for (const p of rLast.pts) rLAvgY += p[1];
    rLAvgY /= rLast.pts.length;
    positions.push(0, rLAvgY, rLast.z);
    uvs.push(0.5, 1);
    const lastBase = (ringCount - 1) * stride;
    for (let j = 0; j < loopLen; j++) {
      indices.push(frontCenterIdx, lastBase + j + 1, lastBase + j);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  });
}

/**
 * Generates a curved 3D lofted surface from front-to-back cross-section ribs
 * (shared helper for curved windshields, canopies, curved roofs, curved hoods, and bumpers).
 */
function buildLoftedSurfaceShell(
  ribs: Array<Array<[number, number, number]>>,
  doubleSidedShell = false,
): THREE.BufferGeometry {
  const nRows = ribs.length;
  const nCols = ribs[0].length;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i < nRows; i++) {
    const v = i / Math.max(1, nRows - 1);
    for (let j = 0; j < nCols; j++) {
      const u = j / Math.max(1, nCols - 1);
      const p = ribs[i][j];
      positions.push(p[0], p[1], p[2]);
      uvs.push(u, v);
    }
  }

  for (let i = 0; i < nRows - 1; i++) {
    for (let j = 0; j < nCols - 1; j++) {
      const a = i * nCols + j;
      const b = (i + 1) * nCols + j;
      const c = (i + 1) * nCols + (j + 1);
      const d = i * nCols + (j + 1);
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  if (doubleSidedShell) {
    const baseOffset = positions.length / 3;
    const thick = 0.022;
    for (let i = 0; i < nRows; i++) {
      const v = i / Math.max(1, nRows - 1);
      for (let j = 0; j < nCols; j++) {
        const u = j / Math.max(1, nCols - 1);
        const p = ribs[i][j];
        positions.push(p[0] * 0.988, p[1] - thick, p[2] - 0.008);
        uvs.push(u, v);
      }
    }
    for (let i = 0; i < nRows - 1; i++) {
      for (let j = 0; j < nCols - 1; j++) {
        const a = baseOffset + i * nCols + j;
        const b = baseOffset + (i + 1) * nCols + j;
        const c = baseOffset + (i + 1) * nCols + (j + 1);
        const d = baseOffset + i * nCols + (j + 1);
        indices.push(a, d, b);
        indices.push(b, d, c);
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Compound-curved wrap-around windshield geometry fitted to the car's beltline & roof crown.
 */
export function createCurvedWindshieldGeometry(opts: {
  key: string;
  baseWidth: number;
  topWidth: number;
  bottomY: number;
  topY: number;
  bottomZ: number;
  topZ: number;
  wrapZ: number;
  crown?: number;
}): THREE.BufferGeometry {
  return cachedGeo(`ws:${opts.key}`, () => {
    const rows = 8;
    const cols = 16;
    const crown = opts.crown ?? 0.045;
    const ribs: Array<Array<[number, number, number]>> = [];

    for (let i = 0; i <= rows; i++) {
      const tY = i / rows;
      const halfW = THREE.MathUtils.lerp(opts.baseWidth * 0.5, opts.topWidth * 0.5, tY);
      const yBase = THREE.MathUtils.lerp(opts.bottomY, opts.topY, tY);
      const zBase = THREE.MathUtils.lerp(opts.bottomZ, opts.topZ, tY);
      const row: Array<[number, number, number]> = [];
      for (let j = 0; j <= cols; j++) {
        const sX = (j / cols) * 2 - 1; // -1..1
        const x = sX * halfW;
        const zCurve = (1 - sX * sX) * opts.wrapZ;
        const yCrown = (1 - sX * sX) * crown * (0.4 + 0.6 * tY);
        row.push([x, yBase + yCrown, zBase + zCurve]);
      }
      row.reverse();
      ribs.push(row);
    }
    return buildLoftedSurfaceShell(ribs, true);
  });
}

/**
 * Sculpted compound-curved coupe / fastback / SUV painted roof & rear pillar shell.
 */
export function createSculptedRoofCanopyGeometry(opts: {
  key: string;
  frontZ: number;
  rearZ: number;
  frontHalfW: number;
  rearHalfW: number;
  frontY: number;
  peakY: number;
  rearY: number;
  crown?: number;
  isSuv?: boolean;
}): THREE.BufferGeometry {
  return cachedGeo(`roof:${opts.key}`, () => {
    const rows = 14;
    const cols = 14;
    const crown = opts.crown ?? 0.055;
    const ribs: Array<Array<[number, number, number]>> = [];

    for (let i = 0; i <= rows; i++) {
      const tZ = i / rows; // 0 = rearZ -> 1 = frontZ
      const z = THREE.MathUtils.lerp(opts.rearZ, opts.frontZ, tZ);
      const archY = opts.isSuv
        ? THREE.MathUtils.lerp(opts.rearY, opts.frontY, tZ) + Math.sin(tZ * Math.PI) * 0.032
        : tZ < 0.48
          ? THREE.MathUtils.lerp(opts.rearY, opts.peakY, smoothstep(0, 0.48, tZ))
          : THREE.MathUtils.lerp(opts.peakY, opts.frontY, smoothstep(0.48, 1, tZ));
      const halfW = THREE.MathUtils.lerp(opts.rearHalfW, opts.frontHalfW, smoothstep(0, 1, tZ)) *
        (0.96 + 0.04 * Math.sin(tZ * Math.PI));

      const row: Array<[number, number, number]> = [];
      for (let j = 0; j <= cols; j++) {
        const sX = (j / cols) * 2 - 1;
        const x = sX * halfW;
        const edgeDrop = Math.pow(Math.abs(sX), 2.2) * (crown + 0.025);
        const y = archY + crown * (1 - sX * sX) - edgeDrop * 0.4;
        const zWrap = (1 - sX * sX) * (tZ > 0.7 ? 0.14 * (tZ - 0.7) / 0.3 : -0.06 * (1 - tZ));
        row.push([x, y, z + zWrap]);
      }
      ribs.push(row);
    }
    return buildLoftedSurfaceShell(ribs, true);
  });
}

/**
 * Curved tumblehome side window glass matching cabin slope from windshield to C-pillar.
 */
export function createCurvedSideGlassGeometry(opts: {
  key: string;
  side: -1 | 1;
  frontZ: number;
  rearZ: number;
  bottomY: number;
  topY: number;
  bottomX: number;
  topX: number;
  midBowOut?: number;
}): THREE.BufferGeometry {
  return cachedGeo(`sglass:${opts.key}:${opts.side}`, () => {
    const rows = 10;
    const cols = 6;
    const bow = opts.midBowOut ?? 0.035;
    const ribs: Array<Array<[number, number, number]>> = [];

    for (let j = 0; j <= cols; j++) {
      const tY = j / cols;
      const y = THREE.MathUtils.lerp(opts.bottomY, opts.topY, tY);
      const baseX = THREE.MathUtils.lerp(opts.bottomX, opts.topX, tY);
      const zInset = tY * 0.18;
      const row: Array<[number, number, number]> = [];
      for (let i = 0; i <= rows; i++) {
        const tZ = i / rows;
        const fZ = opts.frontZ - zInset * 1.45;
        const rZ = opts.rearZ + zInset * 0.9;
        const z = THREE.MathUtils.lerp(rZ, fZ, tZ);
        const curveX = Math.sin(tZ * Math.PI) * bow * (1 - tY * 0.35);
        row.push([opts.side * (baseX + curveX), y, z]);
      }
      if (opts.side < 0) row.reverse();
      ribs.push(row);
    }
    return buildLoftedSurfaceShell(ribs, false);
  });
}

/**
 * Curved fastback / rear cabin glass fitted between roof rear edge and rear deck.
 */
export function createCurvedRearGlassGeometry(opts: {
  key: string;
  topWidth: number;
  bottomWidth: number;
  topY: number;
  bottomY: number;
  topZ: number;
  bottomZ: number;
  wrapZ: number;
}): THREE.BufferGeometry {
  return cachedGeo(`rglass:${opts.key}`, () => {
    const rows = 8;
    const cols = 12;
    const ribs: Array<Array<[number, number, number]>> = [];
    for (let i = 0; i <= rows; i++) {
      const tY = i / rows;
      const halfW = THREE.MathUtils.lerp(opts.bottomWidth * 0.5, opts.topWidth * 0.5, tY);
      const y = THREE.MathUtils.lerp(opts.bottomY, opts.topY, tY);
      const zBase = THREE.MathUtils.lerp(opts.bottomZ, opts.topZ, tY);
      const row: Array<[number, number, number]> = [];
      for (let j = 0; j <= cols; j++) {
        const sX = (j / cols) * 2 - 1;
        const x = sX * halfW;
        const zCurve = -(1 - sX * sX) * opts.wrapZ;
        row.push([x, y + (1 - sX * sX) * 0.025, zBase + zCurve]);
      }
      row.reverse(); // face outward toward -Z
      ribs.push(row);
    }
    return buildLoftedSurfaceShell(ribs, false);
  });
}

/**
 * Smooth swept 3D tube along a CatmullRomCurve3 for A/B/C pillars, Bugatti C-line, and roll hoops.
 */
export function createSweptTubeGeometry(
  key: string,
  points: Array<[number, number, number]>,
  radius: number,
  tubularSegments = 18,
  radialSegments = 10,
): THREE.BufferGeometry {
  return cachedGeo(`tube:${key}`, () => {
    const curve = new THREE.CatmullRomCurve3(
      points.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
    );
    const geo = new THREE.TubeGeometry(curve, tubularSegments, radius, radialSegments, false);
    geo.computeVertexNormals();
    return geo;
  });
}

/**
 * Wrap-around sculpted chrome bumper / carbon splitter / rear diffuser lip curving smoothly around corners.
 */
export function createWrapAroundBumperGeometry(opts: {
  key: string;
  halfWidth: number;
  wrapBackZ: number;
  centerCurveZ: number;
  height: number;
  thickness: number;
  isRear?: boolean;
}): THREE.BufferGeometry {
  return cachedGeo(`bumper:${opts.key}`, () => {
    const dir = opts.isRear ? -1 : 1;
    const { halfWidth, wrapBackZ, centerCurveZ, height, thickness } = opts;

    // Cross section shape in X-Y (extruded along spline) -> actually build swept oval profile along U-curve!
    const pathPts: THREE.Vector3[] = [];
    const segs = 22;
    for (let i = 0; i <= segs; i++) {
      const s = (i / segs) * 2 - 1; // -1..1
      const absS = Math.abs(s);
      const x = s * halfWidth;
      const cornerWrap = Math.pow(Math.max(0, (absS - 0.45) / 0.55), 2.1) * wrapBackZ;
      const noseArc = (1 - s * s) * centerCurveZ;
      const z = dir * (noseArc - cornerWrap);
      pathPts.push(new THREE.Vector3(x, 0, z));
    }

    const nU = pathPts.length;
    const nV = 12;
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i < nU; i++) {
      const p = pathPts[i];
      const prev = pathPts[Math.max(0, i - 1)];
      const next = pathPts[Math.min(nU - 1, i + 1)];
      const tangent = new THREE.Vector3().subVectors(next, prev).normalize();
      const outward = new THREE.Vector3(tangent.z * dir, 0, -tangent.x * dir).normalize();
      const capScale = i === 0 || i === nU - 1 ? 0.3 : 1;

      for (let j = 0; j <= nV; j++) {
        const ang = (j / nV) * Math.PI * 2;
        const nx = Math.cos(ang);
        const ny = Math.sin(ang);
        const rOut = thickness * 0.5 * capScale * (nx > 0 ? 1.15 : 0.85);
        const rY = height * 0.5 * capScale;
        const vx = p.x + outward.x * nx * rOut;
        const vy = ny * rY;
        const vz = p.z + outward.z * nx * rOut;
        positions.push(vx, vy, vz);
        uvs.push(i / (nU - 1), j / nV);
      }
    }

    const stride = nV + 1;
    for (let i = 0; i < nU - 1; i++) {
      for (let j = 0; j < nV; j++) {
        const a = i * stride + j;
        const b = (i + 1) * stride + j;
        const c = (i + 1) * stride + (j + 1);
        const d = i * stride + (j + 1);
        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  });
}

/**
 * Compound-curved hinged door outer panel matching body tumblehome, beltline, and waist scallop.
 */
export function createCurvedDoorSkinGeometry(opts: {
  key: string;
  side: -1 | 1;
  length: number;
  height: number;
  bowOut?: number;
  tumblehomeTopIn?: number;
}): THREE.BufferGeometry {
  return cachedGeo(`door:${opts.key}:${opts.side}`, () => {
    const bow = opts.bowOut ?? 0.048;
    const tumbleIn = opts.tumblehomeTopIn ?? 0.042;
    const thickness = 0.044;
    const rows = 10; // along length (-Z from hinge 0 to -length)
    const cols = 7;  // along height (0 to height)

    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    // Outer face then inner face for solid closed skin
    for (let face = 0; face < 2; face++) {
      const signFace = face === 0 ? 1 : -1;
      for (let i = 0; i <= rows; i++) {
        const tZ = i / rows;
        const z = -tZ * opts.length;
        const endTaper = 0.72 + 0.28 * Math.sin(tZ * Math.PI);
        for (let j = 0; j <= cols; j++) {
          const tY = j / cols;
          const y = tY * opts.height;
          const midBelly = Math.sin(tY * Math.PI) * bow * endTaper;
          const topSlope = -Math.pow(tY, 1.5) * tumbleIn;
          const lowerTuck = -(1 - smoothstep(0, 0.28, tY)) * 0.025;
          const xOuter = opts.side * (midBelly + topSlope + lowerTuck);
          const x = face === 0 ? xOuter : xOuter - opts.side * thickness;
          positions.push(x, y, z);
          uvs.push(tZ, tY);
        }
      }
      void signFace;
    }

    const stride = cols + 1;
    const faceVerts = (rows + 1) * stride;
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const a = i * stride + j;
        const b = (i + 1) * stride + j;
        const c = (i + 1) * stride + (j + 1);
        const d = i * stride + (j + 1);
        if (opts.side > 0) {
          indices.push(a, d, b, b, d, c);
          indices.push(faceVerts + a, faceVerts + b, faceVerts + d, faceVerts + b, faceVerts + c, faceVerts + d);
        } else {
          indices.push(a, b, d, b, c, d);
          indices.push(faceVerts + a, faceVerts + d, faceVerts + b, faceVerts + b, faceVerts + d, faceVerts + c);
        }
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  });
}

/**
 * Tapered, flowing 1959/1960s Cadillac sweeping tailfin (thick base over rear quarter tapering to razor crest).
 */
export function createCadillacTailfinGeometry(opts: {
  key: string;
  length: number;
  frontHeight: number;
  rearHeight: number;
  baseThickness: number;
  crestThickness: number;
}): THREE.BufferGeometry {
  return cachedGeo(`fin:${opts.key}`, () => {
    const nZ = 14;
    const nY = 6;
    const ribs: Array<Array<[number, number, number]>> = [];
    // Loop around fin cross-section: left base -> crest -> right base -> close bottom
    for (let i = 0; i <= nZ; i++) {
      const tZ = i / nZ; // 0 = rear tip, 1 = front fade
      const z = -tZ * opts.length + opts.length * 0.5;
      const h = THREE.MathUtils.lerp(opts.rearHeight, opts.frontHeight, Math.pow(tZ, 0.82));
      const row: Array<[number, number, number]> = [];
      for (let k = 0; k <= nY * 2; k++) {
        const s = k / (nY * 2); // 0 = left base, 0.5 = top crest, 1 = right base
        const tH = 1 - Math.abs(s * 2 - 1);
        const side = s < 0.5 ? -1 : 1;
        const halfT = THREE.MathUtils.lerp(opts.baseThickness * 0.5, opts.crestThickness * 0.5, Math.pow(tH, 0.7)) *
          (0.6 + 0.4 * Math.sin(tZ * Math.PI * 0.85 + 0.2));
        const x = s === 0.5 ? 0 : side * halfT;
        const y = tH * h;
        const zSwept = z - tH * 0.12 * (1 - tZ); // graceful rearward sweep at crest
        row.push([x, y, zSwept]);
      }
      ribs.push(row);
    }
    return buildLoftedSurfaceShell(ribs, false);
  });
}

/**
 * Cambered GT/hypercar inverted airfoil wing blade with optional dihedral sweep.
 */
export function createAirfoilWingGeometry(opts: {
  key: string;
  span: number;
  chord: number;
  thickness?: number;
  dihedral?: number;
  sweepBack?: number;
}): THREE.BufferGeometry {
  return cachedGeo(`wing:${opts.key}`, () => {
    const thick = opts.thickness ?? 0.038;
    const dihedral = opts.dihedral ?? 0.035;
    const sweepBack = opts.sweepBack ?? 0.055;

    const airfoil = new THREE.Shape();
    airfoil.moveTo(0, 0);
    airfoil.quadraticCurveTo(opts.chord * 0.38, -thick, opts.chord, -thick * 0.15);
    airfoil.quadraticCurveTo(opts.chord * 0.45, thick * 0.6, 0, 0);

    const geo = new THREE.ExtrudeGeometry(airfoil, {
      depth: opts.span,
      steps: 14,
      bevelEnabled: true,
      bevelSegments: 3,
      bevelSize: 0.012,
      bevelThickness: 0.014,
    });
    // Extrude is along +Z, airfoil chord along +X; rotate so span runs along X and chord runs along -Z
    geo.rotateY(-Math.PI / 2);
    geo.translate(opts.span * 0.5, 0, opts.chord * 0.5);

    const pos = geo.attributes.position as THREE.BufferAttribute;
    const halfSpan = Math.max(0.1, opts.span * 0.5);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const u = Math.min(1, Math.abs(x) / halfSpan);
      const curveLift = Math.pow(u, 1.8) * dihedral;
      const curveSweep = -Math.pow(u, 1.6) * sweepBack;
      pos.setY(i, pos.getY(i) + curveLift);
      pos.setZ(i, pos.getZ(i) + curveSweep);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  });
}

/**
 * Sculpted bolstered automotive seat cushion + contoured backrest (replaces flat boxes).
 */
export function createSculptedSeatBucketGeometry(
  style: 'racing_bucket' | 'luxury_cruiser',
  width = 0.48,
): THREE.BufferGeometry {
  return cachedGeo(`seat:${style}:${width.toFixed(2)}`, () => {
    const rows = 18; // continuous from front thigh edge -> seat pan -> lumbar -> backrest -> headrest!
    const cols = 10;
    const ribs: Array<Array<[number, number, number]>> = [];
    const isRace = style === 'racing_bucket';

    // Backbone path in (Y, Z) + bolster height at each station
    const spine: Array<{ y: number; z: number; tiltAngle: number; bolster: number; wScale: number }> = [
      { y: -0.14, z: 0.24, tiltAngle: 0.08, bolster: 0.03, wScale: 0.92 },
      { y: -0.13, z: 0.14, tiltAngle: 0.02, bolster: 0.055, wScale: 0.98 },
      { y: -0.15, z: 0.02, tiltAngle: -0.05, bolster: 0.065, wScale: 1.0 },
      { y: -0.13, z: -0.11, tiltAngle: 0.6, bolster: 0.075, wScale: 1.02 },
      { y: -0.04, z: -0.16, tiltAngle: 1.28, bolster: 0.095, wScale: 1.02 },
      { y: 0.08, z: -0.185, tiltAngle: 1.38, bolster: isRace ? 0.105 : 0.07, wScale: 0.98 },
      { y: 0.2, z: -0.205, tiltAngle: 1.38, bolster: isRace ? 0.095 : 0.055, wScale: 0.92 },
      { y: 0.3, z: -0.225, tiltAngle: 1.38, bolster: isRace ? 0.07 : 0.04, wScale: 0.86 },
      { y: 0.39, z: -0.24, tiltAngle: 1.45, bolster: 0.03, wScale: 0.62 },
      { y: 0.47, z: -0.23, tiltAngle: 1.55, bolster: 0.025, wScale: 0.56 },
    ];

    for (let i = 0; i < spine.length; i++) {
      const s = spine[i];
      const hw = width * 0.5 * s.wScale;
      const row: Array<[number, number, number]> = [];
      const ny = Math.cos(s.tiltAngle);
      const nz = Math.sin(s.tiltAngle);

      for (let j = 0; j <= cols; j++) {
        const sX = (j / cols) * 2 - 1;
        const absX = Math.abs(sX);
        const x = sX * hw;
        // Side thigh/torso bolsters curve forward/upward at the edges!
        const bolsterLift = Math.pow(absX, 2.2) * s.bolster;
        // Back thickness swell slightly behind center
        const centerPad = (1 - absX * absX) * 0.014;
        const y = s.y + ny * (bolsterLift + centerPad);
        const z = s.z + nz * (bolsterLift + centerPad);
        row.push([x, y, z]);
      }
      ribs.push(row);
    }

    // Pad with rows ref if needed
    void rows;
    return buildLoftedSurfaceShell(ribs, true);
  });
}

/**
 * Swept wrap-around curved dashboard cowl + hooded instrument cluster brow.
 */
export function createCurvedDashboardGeometry(
  key: string,
  width: number,
  depth = 0.34,
): THREE.BufferGeometry {
  return cachedGeo(`dash:${key}:${width.toFixed(2)}`, () => {
    const rows = 8; // front-to-back across dash top to lower knee-bolster
    const cols = 16; // left-to-right sweep
    const ribs: Array<Array<[number, number, number]>> = [];
    const halfW = width * 0.5;

    for (let i = 0; i <= rows; i++) {
      const tProfile = i / rows; // 0 = windshield edge -> 0.5 = cowl lip -> 1 = lower face
      const angle = tProfile * Math.PI * 0.9;
      const row: Array<[number, number, number]> = [];
      for (let j = 0; j <= cols; j++) {
        const sX = (j / cols) * 2 - 1;
        const x = sX * halfW;
        // Double-cowl driver binnacle rise on left (-0.45) + gentle sweep back at doors
        const doorSweep = -Math.pow(Math.abs(sX), 2.1) * 0.085;
        const driverPod = Math.exp(-Math.pow((sX + 0.45) / 0.24, 2)) * 0.055;
        const y = Math.sin(angle) * 0.095 - tProfile * 0.08 + driverPod * (1 - Math.abs(tProfile - 0.45));
        const z = Math.cos(angle) * (depth * 0.5) + doorSweep;
        row.push([x, y, z]);
      }
      ribs.push(row);
    }
    return buildLoftedSurfaceShell(ribs, true);
  });
}

/**
 * Curved inner wheelhouse fender tub liner geometry to seal carved wheel arches cleanly.
 */
export function createCurvedWheelhouseTubGeometry(
  key: string,
  radius: number,
  depth: number,
): THREE.BufferGeometry {
  return cachedGeo(`tub:${key}:${radius.toFixed(2)}`, () => {
    const geo = new THREE.CylinderGeometry(radius, radius * 0.94, depth, 20, 1, true, 0, Math.PI);
    geo.rotateZ(Math.PI / 2);
    geo.rotateY(Math.PI / 2);
    ensureGeometryHasUv(geo);
    geo.computeVertexNormals();
    return geo;
  });
}

/**
 * Curved aerodynamic teardrop mirror housing + swept stalk (used if callers need shared sculpted mirror shell).
 */
export function createSculptedScoopGeometry(
  key: string,
  width: number,
  height: number,
  length: number,
): THREE.BufferGeometry {
  return cachedGeo(`scoop:${key}`, () => {
    const nZ = 8;
    const nU = 10;
    const ribs: Array<Array<[number, number, number]>> = [];
    for (let i = 0; i <= nZ; i++) {
      const tZ = i / nZ; // 0 = rear taper -> 1 = open front intake
      const z = (tZ - 0.5) * length;
      const wScale = 0.25 + 0.75 * Math.pow(tZ, 0.55);
      const hScale = 0.15 + 0.85 * Math.pow(tZ, 0.5);
      const row: Array<[number, number, number]> = [];
      for (let j = 0; j <= nU; j++) {
        const ang = (j / nU) * Math.PI;
        const x = -Math.cos(ang) * width * 0.5 * wScale;
        const y = Math.sin(ang) * height * hScale;
        row.push([x, y, z]);
      }
      ribs.push(row);
    }
    return buildLoftedSurfaceShell(ribs, true);
  });
}

/**
 * Compound-curved decklid / hood / tonneau skin (hinges cleanly at z = 0 extending to -length).
 */
export function createCurvedDeckPanelGeometry(opts: {
  key: string;
  width: number;
  length: number;
  crownY?: number;
  dropRearY?: number;
  taperRear?: number;
  forwardZ?: boolean;
}): THREE.BufferGeometry {
  return cachedGeo(`deck:${opts.key}`, () => {
    const crown = opts.crownY ?? 0.045;
    const dropRear = opts.dropRearY ?? 0.06;
    const taper = opts.taperRear ?? 0.14;
    const nZ = 10;
    const nX = 10;
    const ribs: Array<Array<[number, number, number]>> = [];
    const dir = opts.forwardZ ? 1 : -1;

    for (let i = 0; i <= nZ; i++) {
      const tZ = i / nZ; // 0 = hinge edge -> 1 = tip edge
      const z = dir * tZ * opts.length;
      const hw = opts.width * 0.5 * (1 - taper * Math.pow(tZ, 1.5));
      const ySlope = -dropRear * Math.pow(tZ, 1.25);
      const row: Array<[number, number, number]> = [];
      for (let j = 0; j <= nX; j++) {
        const sX = (j / nX) * 2 - 1;
        const x = sX * hw;
        const yCrown = (1 - sX * sX) * crown * (1 - tZ * 0.35);
        row.push([x, ySlope + yCrown, z]);
      }
      if (!opts.forwardZ) row.reverse();
      ribs.push(row);
    }
    return buildLoftedSurfaceShell(ribs, true);
  });
}

