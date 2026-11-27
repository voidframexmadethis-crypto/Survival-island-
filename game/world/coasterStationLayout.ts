/**
 * Shared geometry for the island's walk-up coaster boarding platform.
 *
 * The visual deck in `createCampStructureModel`, the player's walkable surface
 * in `GameEngine`, and the ride's boarding/exit points all read the same
 * numbers from here so the station cannot drift out of alignment again.
 */
export interface CoasterStationPlatformSpec {
  /** Walking surface height above the structure origin (metres). */
  deckTop: number;
  /** Deck size in the structure's local frame. */
  deckWidth: number;
  deckLength: number;
  deckCenterX: number;
  deckCenterZ: number;
  /** Stair run in local Z; when stairRun is 0 no staircase is built. */
  stairWidth: number;
  stairRun: number;
  stairCenterX: number;
}

/** Lead car offset back from the end of the station run while loading. */
export const VOLCANO_FLEX_BOARDING_SETBACK_M = 3.5;

/**
 * Lead-car distance along the station where the whole five-car train (11.75 m)
 * stands on the 13.6 m deck. The deck spans station x +0.4 .. +14.0.
 */
export const VOLCANO_FLEX_BOARDING_DISTANCE_M = 12.6;

/**
 * Where the station structure sits relative to the track's station start.
 * The deck's inner edge is 0.75 m from the track centreline.
 */
export const VOLCANO_FLEX_STATION_PLACEMENT = {
  xOffset: 2.8,
  zOffset: 0.58,
  rotationY: -Math.PI / 2,
} as const;

/**
 * VOLCANO FLEX boarding platform. The train's car floor sits 0.695 m above the
 * rail centreline (0.275 m wheel-set offset + 0.42 m floor top), and the
 * station rails run 1.35 m above grade, so the deck top is 2.045 m.
 */
export const VOLCANO_FLEX_STATION_PLATFORM: CoasterStationPlatformSpec = {
  deckTop: 2.045,
  deckWidth: 3.4,
  deckLength: 13.6,
  deckCenterX: 1.9,
  deckCenterZ: -4.4,
  stairWidth: 1.2,
  stairRun: 3.5,
  stairCenterX: 2.5,
};

/** Platform surface height for a structure-local point, or -Infinity. */
function platformHeightAt(
  spec: CoasterStationPlatformSpec,
  lx: number,
  lz: number,
): number {
  const halfW = spec.deckWidth * 0.5;
  const halfL = spec.deckLength * 0.5;
  const inDeck =
    lx >= spec.deckCenterX - halfW &&
    lx <= spec.deckCenterX + halfW &&
    lz >= spec.deckCenterZ - halfL &&
    lz <= spec.deckCenterZ + halfL;
  if (inDeck) return spec.deckTop;

  if (spec.stairRun > 0) {
    const stairHalf = spec.stairWidth * 0.5;
    const deckNearZ = spec.deckCenterZ + halfL;
    const stairEndZ = deckNearZ + spec.stairRun;
    if (
      lx >= spec.stairCenterX - stairHalf &&
      lx <= spec.stairCenterX + stairHalf &&
      lz >= deckNearZ &&
      lz <= stairEndZ
    ) {
      // Match the twelve visible steps exactly so the player's feet land on
      // each tread instead of sinking halfway into the risers.
      const steps = 12;
      const stepDepth = spec.stairRun / steps;
      const index = Math.floor((stairEndZ - lz) / stepDepth);
      const step = Math.max(0, Math.min(steps - 1, index));
      return (spec.deckTop * (step + 1)) / steps;
    }
  }

  return -Infinity;
}

interface StationTransform {
  x: number;
  y: number;
  z: number;
  rotationY: number;
}

/** World point -> platform-local (x, z). */
export function toCoasterStationLocal(
  station: StationTransform,
  x: number,
  z: number,
): { x: number; z: number } {
  const dx = x - station.x;
  const dz = z - station.z;
  const cos = Math.cos(station.rotationY);
  const sin = Math.sin(station.rotationY);
  return { x: dx * cos - dz * sin, z: dx * sin + dz * cos };
}

/** Platform-local (x, z) -> world point. */
export function toCoasterStationWorld(
  station: StationTransform,
  lx: number,
  lz: number,
): { x: number; z: number } {
  const cos = Math.cos(station.rotationY);
  const sin = Math.sin(station.rotationY);
  return {
    x: station.x + lx * cos + lz * sin,
    z: station.z - lx * sin + lz * cos,
  };
}

/**
 * Walkable height of the boarding deck and staircase for a world position.
 * Returns -Infinity when the player is not over the platform, and ignores the
 * platform when the player's feet are far below it (walking underneath).
 */
export function getCoasterStationSurfaceY(
  station: StationTransform,
  x: number,
  z: number,
  footY: number,
  spec: CoasterStationPlatformSpec = VOLCANO_FLEX_STATION_PLATFORM,
): number {
  const local = toCoasterStationLocal(station, x, z);
  const localHeight = platformHeightAt(spec, local.x, local.z);
  if (!Number.isFinite(localHeight)) return -Infinity;
  const worldTop = station.y + localHeight;
  // Same 1.15 m step-up tolerance used by the other walkable structure floors.
  return footY >= worldTop - 1.15 ? worldTop : -Infinity;
}

/**
 * Safe place to stand after the train parks: on the deck beside the lead car.
 * `leadWorldX` is the lead car's world X along the station run.
 */
export function getCoasterStationExitPoint(
  station: StationTransform,
  leadWorldX: number,
  spec: CoasterStationPlatformSpec = VOLCANO_FLEX_STATION_PLATFORM,
): { x: number; y: number; z: number } {
  const leadLocal = toCoasterStationLocal(station, leadWorldX, station.z);
  const lx = spec.deckCenterX - spec.deckWidth * 0.15;
  const point = toCoasterStationWorld(station, lx, leadLocal.z);
  return { x: point.x, y: station.y + spec.deckTop, z: point.z };
}
