import { getActiveTerrainWorldType } from '../world/terrain';
import { LOUISIANA_CITY_GROUND_Y } from '../world/louisianaLandmass';

/**
 * The island stays separated from Louisiana by open water. This module now
 * owns the Mississippi river bridge inside Crescent City: it links the French
 * Quarter/west bank to the East Bank terminal and police district.
 */

export const CAUSEWAY_PATH = [
  { x: 140, z: 1430 },
  { x: 190, z: 1428 },
  { x: 245, z: 1430 },
  { x: 300, z: 1432 },
  { x: 345, z: 1430 },
] as const;

export const CAUSEWAY_WIDTH = 12.0;
export const CAUSEWAY_HALF_WIDTH = CAUSEWAY_WIDTH * 0.5;
export const CAUSEWAY_DECK_LIFT = 0.95;
export const CAUSEWAY_RAMP_LENGTH = 24;
export const CAUSEWAY_DECK_Y = LOUISIANA_CITY_GROUND_Y + 1.07;
export const CAUSEWAY_GATEWAY_POINT = { x: 140, z: 1430 } as const;
export const CAUSEWAY_ISLAND_POINT = { x: 345, z: 1430 } as const;

export interface CausewaySegment {
  ax: number;
  az: number;
  bx: number;
  bz: number;
  dx: number;
  dz: number;
  length: number;
  yaw: number;
  startDistance: number;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function buildSegments(): CausewaySegment[] {
  const segments: CausewaySegment[] = [];
  let distance = 0;
  for (let i = 0; i < CAUSEWAY_PATH.length - 1; i++) {
    const a = CAUSEWAY_PATH[i];
    const b = CAUSEWAY_PATH[i + 1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const length = Math.hypot(dx, dz);
    segments.push({
      ax: a.x,
      az: a.z,
      bx: b.x,
      bz: b.z,
      dx,
      dz,
      length,
      yaw: Math.atan2(dx, dz),
      startDistance: distance,
    });
    distance += length;
  }
  return segments;
}

const CAUSEWAY_SEGMENTS = buildSegments();
export const CAUSEWAY_LENGTH = CAUSEWAY_SEGMENTS.reduce(
  (sum, segment) => sum + segment.length,
  0,
);

/**
 * Allocation-free bridge deck sample. The deck stays level above the river;
 * only the two 24 m approach ramps rise from the city shelf.
 */
export function getCausewaySurfaceY(x: number, z: number, footY = Infinity): number {
  if (getActiveTerrainWorldType() !== 'island') return -9999;
  let bestDistSq = CAUSEWAY_HALF_WIDTH * CAUSEWAY_HALF_WIDTH;
  let bestDistance = 0;
  let found = false;

  for (let i = 0; i < CAUSEWAY_SEGMENTS.length; i++) {
    const segment = CAUSEWAY_SEGMENTS[i];
    const lenSq = segment.length * segment.length;
    if (lenSq <= 0.0001) continue;
    const px = x - segment.ax;
    const pz = z - segment.az;
    const t = Math.max(0, Math.min(1, (px * segment.dx + pz * segment.dz) / lenSq));
    const cx = segment.ax + segment.dx * t;
    const cz = segment.az + segment.dz * t;
    const dx = x - cx;
    const dz = z - cz;
    const distSq = dx * dx + dz * dz;
    if (distSq > bestDistSq) continue;
    bestDistSq = distSq;
    bestDistance = segment.startDistance + segment.length * t;
    found = true;
  }

  if (!found) return -9999;
  const edgeDistance = Math.min(bestDistance, CAUSEWAY_LENGTH - bestDistance);
  const ramp = smoothstep(0, CAUSEWAY_RAMP_LENGTH, edgeDistance);
  const surfaceY = LOUISIANA_CITY_GROUND_Y + 0.12 + ramp * CAUSEWAY_DECK_LIFT;
  if (footY < surfaceY - 0.8) return -9999;
  return surfaceY;
}

export interface CausewayFrame {
  x: number;
  z: number;
  y: number;
  yaw: number;
  distance: number;
}

/** Samples a deck frame at a distance along the bridge. Build-time only. */
export function sampleCausewayFrame(distance: number): CausewayFrame {
  const clamped = Math.max(0, Math.min(CAUSEWAY_LENGTH, distance));
  for (let i = 0; i < CAUSEWAY_SEGMENTS.length; i++) {
    const segment = CAUSEWAY_SEGMENTS[i];
    if (clamped > segment.startDistance + segment.length && i < CAUSEWAY_SEGMENTS.length - 1) {
      continue;
    }
    const t = Math.max(
      0,
      Math.min(1, (clamped - segment.startDistance) / Math.max(0.0001, segment.length)),
    );
    const edgeDistance = Math.min(clamped, CAUSEWAY_LENGTH - clamped);
    const ramp = smoothstep(0, CAUSEWAY_RAMP_LENGTH, edgeDistance);
    return {
      x: segment.ax + segment.dx * t,
      z: segment.az + segment.dz * t,
      y: LOUISIANA_CITY_GROUND_Y + 0.12 + ramp * CAUSEWAY_DECK_LIFT,
      yaw: segment.yaw,
      distance: clamped,
    };
  }
  const last = CAUSEWAY_SEGMENTS[CAUSEWAY_SEGMENTS.length - 1];
  return {
    x: last.bx,
    z: last.bz,
    y: CAUSEWAY_DECK_Y,
    yaw: last.yaw,
    distance: CAUSEWAY_LENGTH,
  };
}

export function isOnCauseway(x: number, z: number): boolean {
  return getCausewaySurfaceY(x, z, Infinity) > -999;
}

export const CAUSEWAY_SIGNS = {
  island: {
    title: 'EAST BANK',
    subtitle: 'Terminal · Police District',
  },
  mainland: {
    title: 'FRENCH QUARTER',
    subtitle: 'Canal Street · Riverbend',
  },
} as const;
