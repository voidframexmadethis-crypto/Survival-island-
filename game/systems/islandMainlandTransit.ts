import { getActiveTerrainWorldType, getTerrainHeight } from '../world/terrain';

/**
 * Island <-> Louisiana mainland transit corridor.
 *
 * The causeway is both a playable road bridge and the final leg of the ferry
 * worker's drive. Keeping the path and the raised deck heights here means the
 * rendered bridge, player ground support, vehicle support and the ferry route
 * all share one source of truth.
 */

export const CAUSEWAY_PATH = [
  // Start south of the terminal kiosk, on the boulevard's outside lane.
  { x: 64, z: 505 },
  { x: 64, z: 520 },
  { x: 50, z: 545 },
  { x: 35, z: 575 },
  { x: 22, z: 615 },
  { x: 22, z: 650 },
  { x: 22, z: 674 },
] as const;

export const CAUSEWAY_WIDTH = 10.6;
export const CAUSEWAY_HALF_WIDTH = CAUSEWAY_WIDTH * 0.5;
export const CAUSEWAY_DECK_LIFT = 1.15;
export const CAUSEWAY_RAMP_LENGTH = 18;
export const CAUSEWAY_GATEWAY_POINT = { x: 64, z: 520 } as const;
export const CAUSEWAY_ISLAND_POINT = { x: 22, z: 650 } as const;

export interface CausewaySegment {
  ax: number;
  az: number;
  ay: number;
  bx: number;
  bz: number;
  by: number;
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
      ay: getTerrainHeight(a.x, a.z),
      bx: b.x,
      bz: b.z,
      by: getTerrainHeight(b.x, b.z),
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
 * Allocation-free bridge deck sample. Returns -9999 when outside the raised
 * deck or when the foot is too far below it (so walking beneath the span does
 * not teleport the player onto it).
 */
export function getCausewaySurfaceY(x: number, z: number, footY = Infinity): number {
  if (getActiveTerrainWorldType() !== 'island') return -9999;
  let bestDistSq = CAUSEWAY_HALF_WIDTH * CAUSEWAY_HALF_WIDTH;
  let bestY = -9999;
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
    const along = segment.startDistance + segment.length * t;
    const edgeDistance = Math.min(along, CAUSEWAY_LENGTH - along);
    const lift = CAUSEWAY_DECK_LIFT * smoothstep(0, CAUSEWAY_RAMP_LENGTH, edgeDistance);
    bestY = segment.ay + (segment.by - segment.ay) * t + lift + 0.12;
    found = true;
  }

  if (!found) return -9999;
  if (footY < bestY - 0.8) return -9999;
  return bestY;
}

export interface CausewayFrame {
  x: number;
  z: number;
  y: number;
  yaw: number;
  distance: number;
}

/** Samples a deck frame at a distance along the causeway. Build-time only. */
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
    const lift = CAUSEWAY_DECK_LIFT * smoothstep(0, CAUSEWAY_RAMP_LENGTH, edgeDistance);
    return {
      x: segment.ax + segment.dx * t,
      z: segment.az + segment.dz * t,
      y: segment.ay + (segment.by - segment.ay) * t + lift + 0.12,
      yaw: segment.yaw,
      distance: clamped,
    };
  }
  const last = CAUSEWAY_SEGMENTS[CAUSEWAY_SEGMENTS.length - 1];
  return {
    x: last.bx,
    z: last.bz,
    y: last.by + 0.12,
    yaw: last.yaw,
    distance: CAUSEWAY_LENGTH,
  };
}

/** The nearest causeway fast-travel point to an arbitrary bridge coordinate. */
export function isOnCauseway(x: number, z: number): boolean {
  return getCausewaySurfaceY(x, z, Infinity) > -999;
}

/** Sign text kept here so both the world geometry and UI labels stay aligned. */
export const CAUSEWAY_SIGNS = {
  island: {
    title: 'ISLAND LANDING',
    subtitle: 'Ferry Pier · Causeway South',
  },
  mainland: {
    title: 'CRESCENT CITY',
    subtitle: 'French Quarter · Causeway North',
  },
} as const;
