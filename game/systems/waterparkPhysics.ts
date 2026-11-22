import type { WaterparkSlideKind } from '../world/waterparkLayout';

/**
 * Gravity-fed water-slide physics.
 *
 * `slopeY` is the vertical component of the unit tangent: -1 is a vertical
 * drop, 0 is flat. Riders gain energy from gravity, lose it to wall friction and
 * turbulent water drag, and receive a small push from the flowing water pumps.
 * Water coasters add jet boost on uphill sections so they can crest the next
 * hill the way real Master Blaster / water-coaster installations do.
 */
export interface WaterparkSlidePhysicsProfile {
  gravityScale: number;
  drag: number;
  friction: number;
  waterFlow: number;
  jetBoost: number;
  minSpeed: number;
  maxSpeed: number;
}

const PROFILES: Record<WaterparkSlideKind, WaterparkSlidePhysicsProfile> = {
  body: {
    gravityScale: 1.06,
    drag: 0.009,
    friction: 0.038,
    waterFlow: 0.9,
    jetBoost: 0,
    minSpeed: 2.2,
    maxSpeed: 32,
  },
  tube: {
    gravityScale: 1.03,
    drag: 0.012,
    friction: 0.046,
    waterFlow: 1.15,
    jetBoost: 0,
    minSpeed: 2.0,
    maxSpeed: 27,
  },
  raft: {
    gravityScale: 1.0,
    drag: 0.015,
    friction: 0.052,
    waterFlow: 1.3,
    jetBoost: 0,
    minSpeed: 1.9,
    maxSpeed: 24,
  },
  mat: {
    gravityScale: 1.05,
    drag: 0.01,
    friction: 0.04,
    waterFlow: 0.85,
    jetBoost: 0,
    minSpeed: 2.1,
    maxSpeed: 30,
  },
  bowl: {
    gravityScale: 1.02,
    drag: 0.014,
    friction: 0.048,
    waterFlow: 1.2,
    jetBoost: 0,
    minSpeed: 1.8,
    maxSpeed: 25,
  },
  halfpipe: {
    gravityScale: 1.08,
    drag: 0.011,
    friction: 0.036,
    waterFlow: 1.0,
    jetBoost: 0,
    minSpeed: 2.0,
    maxSpeed: 30,
  },
  watercoaster: {
    gravityScale: 1.02,
    drag: 0.018,
    friction: 0.035,
    waterFlow: 1.7,
    jetBoost: 7.2,
    minSpeed: 2.4,
    maxSpeed: 29,
  },
  drop: {
    gravityScale: 1.18,
    drag: 0.0065,
    friction: 0.025,
    waterFlow: 0.8,
    jetBoost: 0,
    minSpeed: 2.4,
    maxSpeed: 36,
  },
  log: {
    gravityScale: 1.0,
    drag: 0.019,
    friction: 0.03,
    waterFlow: 1.25,
    jetBoost: 2.4,
    minSpeed: 1.8,
    maxSpeed: 19,
  },
  kids: {
    gravityScale: 0.94,
    drag: 0.03,
    friction: 0.06,
    waterFlow: 1.2,
    jetBoost: 0,
    minSpeed: 1.5,
    maxSpeed: 10,
  },
};

export function getWaterparkPhysicsProfile(
  kind: WaterparkSlideKind,
): WaterparkSlidePhysicsProfile {
  return PROFILES[kind] ?? PROFILES.body;
}

/**
 * Advance a rider one physics step. Returns a finite speed inside the slide's
 * operating envelope even if a malformed frame supplies NaN.
 */
export function stepWaterparkSpeed(
  speed: number,
  slopeY: number,
  dt: number,
  kind: WaterparkSlideKind,
  boost = 1,
): number {
  const profile = getWaterparkPhysicsProfile(kind);
  const safeSpeed = Number.isFinite(speed) ? Math.max(0, speed) : 0;
  const safeSlope = Number.isFinite(slopeY)
    ? Math.min(0.2, Math.max(-1, slopeY))
    : 0;
  const step = Number.isFinite(dt) ? Math.min(1 / 20, Math.max(0, dt)) : 0;
  if (step <= 0) return safeSpeed;

  const downSlope = Math.max(0, -safeSlope);
  const normalForce = Math.sqrt(Math.max(0, 1 - safeSlope * safeSlope));
  const gravity = 9.81 * profile.gravityScale * downSlope;
  const drag = profile.drag * safeSpeed * Math.abs(safeSpeed);
  const friction = profile.friction * 9.81 * normalForce;
  const flow = profile.waterFlow * Math.max(0.15, 1 - safeSpeed / profile.maxSpeed);
  const uphillJet =
    safeSlope >= -0.02 && boost > 0
      ? profile.jetBoost * Math.min(1.5, Math.max(0, boost))
      : 0;
  const next =
    safeSpeed + (gravity + flow + uphillJet - drag - friction) * step;
  return Math.min(profile.maxSpeed, Math.max(profile.minSpeed, next));
}

export interface WaterparkRideLoads {
  verticalG: number;
  lateralG: number;
  /** Metres per second squared, for camera shake. */
  acceleration: number;
}

/**
 * Convert path curvature into rider loads. At the bottom of a valley the
 * vertical tangent turns upward, adding positive G; a banked arc adds lateral G.
 */
export function computeWaterparkLoads(
  speed: number,
  tangentPrev: { x: number; y: number; z: number },
  tangentNext: { x: number; y: number; z: number },
  right: { x: number; y: number; z: number },
  ds: number,
): WaterparkRideLoads {
  const safeDs = Math.max(0.05, ds);
  const curvatureX = (tangentNext.x - tangentPrev.x) / safeDs;
  const curvatureY = (tangentNext.y - tangentPrev.y) / safeDs;
  const curvatureZ = (tangentNext.z - tangentPrev.z) / safeDs;
  const lateral = curvatureX * right.x + curvatureY * right.y + curvatureZ * right.z;
  const safeSpeed = Number.isFinite(speed) ? Math.max(0, speed) : 0;
  return {
    verticalG: Math.max(
      -1.5,
      Math.min(4.5, 1 + (safeSpeed * safeSpeed * curvatureY) / 9.81),
    ),
    lateralG: Math.max(
      -2.5,
      Math.min(2.5, (safeSpeed * safeSpeed * lateral) / 9.81),
    ),
    acceleration: Math.abs(safeSpeed * safeSpeed * curvatureY),
  };
}
