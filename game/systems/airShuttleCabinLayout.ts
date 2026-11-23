/**
 * Shared dimensions and solid geometry for the Crescent Clipper's walkable
 * cabin. The model, player controller, crew and tests all read these values so
 * the visible shell and its collision can never drift apart.
 *
 * Local aircraft coordinates: +Z is the bow, +X is starboard, +Y is up.
 */
export const AIR_SHUTTLE_CABIN = {
  /** Structural floor and the walking surface laid on top of it. */
  floorY: 2.02,
  floorTopY: 2.1,
  /** Underside of the finished ceiling panels. */
  ceilingY: 4.62,
  /** Interior wall faces and the outer collision envelope. */
  innerHalfWidth: 1.2,
  wallHalfWidth: 1.28,
  frontBulkheadZ: 3.64,
  rearBulkheadZ: -6.3,
  /** Standing player capsule. */
  playerRadius: 0.29,
  playerHeight: 1.82,
  eyeHeight: 1.45,
  /** Keep the camera lens clear of the finished ceiling. */
  cameraCeilingClearance: 0.1,
  doorWidth: 0.78,
  doorHeight: 2.04,
  doorHeaderY: 4.16,
  bedroomDoorX: -0.71,
  bathroomDoorX: 0.71,
  rearPartitionZ: -2.94,
};

export interface CabinBlocker {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface CabinDoorState {
  bedroomOpen: boolean;
  bathroomOpen: boolean;
}

export interface CabinMoveResult {
  x: number;
  z: number;
  hitX: boolean;
  hitZ: boolean;
}

const HALF_DOOR = AIR_SHUTTLE_CABIN.doorWidth / 2;
const DOOR_EPSILON = 0.02;

/**
 * Solid furniture and partitions. These match the rendered meshes; expanding
 * each box by the player radius gives capsule collision without a navmesh.
 */
export const AIR_SHUTTLE_CABIN_BLOCKERS: readonly CabinBlocker[] = [
  // Front galley runs along the port wall.
  { id: 'galley', minX: -1.34, maxX: -0.62, minZ: 2.58, maxZ: 3.78 },
  // Six club seats, port and starboard, in three rows.
  ...([2.55, 1.15, -0.25] as const).flatMap((z, row): CabinBlocker[] => [
    {
      id: `seat-port-${row}`,
      minX: -1.06,
      maxX: -0.42,
      minZ: z - 0.34,
      maxZ: z + 0.34,
    },
    {
      id: `seat-starboard-${row}`,
      minX: 0.42,
      maxX: 1.06,
      minZ: z - 0.34,
      maxZ: z + 0.34,
    },
  ]),
  // Two round club tables. They sit slightly outboard of the original model
  // so the central aisle remains wide enough for a 0.58 m player capsule.
  { id: 'table-starboard', minX: 0.32, maxX: 0.92, minZ: 1.54, maxZ: 2.16 },
  { id: 'table-port', minX: -0.93, maxX: -0.33, minZ: 0.14, maxZ: 0.76 },
  // Lounge couch and its side tables. Pulled forward of the rear partition so
  // the starboard bathroom doorway has a real approach lane.
  { id: 'couch', minX: 0.55, maxX: 1.24, minZ: -2.12, maxZ: -0.72 },
  { id: 'tv-console', minX: -1.4, maxX: -1.16, minZ: -2.2, maxZ: -0.86 },
  // Rear partition: solid centre pier plus outer returns. The two door gaps
  // are handled separately so an open door becomes a real opening.
  {
    id: 'rear-partition-centre',
    minX: -0.32,
    maxX: 0.32,
    minZ: AIR_SHUTTLE_CABIN.rearPartitionZ - 0.06,
    maxZ: AIR_SHUTTLE_CABIN.rearPartitionZ + 0.06,
  },
  {
    id: 'rear-partition-port',
    minX: -AIR_SHUTTLE_CABIN.innerHalfWidth,
    maxX: -1.1,
    minZ: AIR_SHUTTLE_CABIN.rearPartitionZ - 0.06,
    maxZ: AIR_SHUTTLE_CABIN.rearPartitionZ + 0.06,
  },
  {
    id: 'rear-partition-starboard',
    minX: 1.1,
    maxX: AIR_SHUTTLE_CABIN.innerHalfWidth,
    minZ: AIR_SHUTTLE_CABIN.rearPartitionZ - 0.06,
    maxZ: AIR_SHUTTLE_CABIN.rearPartitionZ + 0.06,
  },
  // Longitudinal divider between bedroom and bathroom.
  {
    id: 'rear-divider',
    minX: -0.05,
    maxX: 0.05,
    minZ: AIR_SHUTTLE_CABIN.rearBulkheadZ,
    maxZ: AIR_SHUTTLE_CABIN.rearPartitionZ,
  },
  // Aft bedroom: bed, footboard and nightstand.
  { id: 'bed', minX: -1.15, maxX: -0.01, minZ: -6.02, maxZ: -3.98 },
  { id: 'nightstand', minX: -1.12, maxX: -0.76, minZ: -4.52, maxZ: -4.16 },
  // Aft bathroom: vanity, toilet, shower screen and rear cabinet.
  { id: 'bath-vanity', minX: 0.44, maxX: 1.22, minZ: -4.54, maxZ: -3.96 },
  { id: 'bath-toilet', minX: 0.56, maxX: 1.08, minZ: -5.86, maxZ: -5.24 },
  { id: 'bath-shower', minX: 0.31, maxX: 0.39, minZ: -4.38, maxZ: -3.62 },
  { id: 'bath-rear-cabinet', minX: 0.79, maxX: 1.24, minZ: -6.02, maxZ: -5.8 },
];

const BEDROOM_DOOR: CabinBlocker = {
  id: 'bedroom-door',
  minX: AIR_SHUTTLE_CABIN.bedroomDoorX - HALF_DOOR,
  maxX: AIR_SHUTTLE_CABIN.bedroomDoorX + HALF_DOOR,
  minZ: AIR_SHUTTLE_CABIN.rearPartitionZ - DOOR_EPSILON,
  maxZ: AIR_SHUTTLE_CABIN.rearPartitionZ + DOOR_EPSILON,
};

const BATHROOM_DOOR: CabinBlocker = {
  id: 'bathroom-door',
  minX: AIR_SHUTTLE_CABIN.bathroomDoorX - HALF_DOOR,
  maxX: AIR_SHUTTLE_CABIN.bathroomDoorX + HALF_DOOR,
  minZ: AIR_SHUTTLE_CABIN.rearPartitionZ - DOOR_EPSILON,
  maxZ: AIR_SHUTTLE_CABIN.rearPartitionZ + DOOR_EPSILON,
};

// A 90-degree open door sits against the longitudinal wall. Its leaf is still
// solid, so a player or maid standing too close cannot pass through it.
const BEDROOM_DOOR_OPEN: CabinBlocker = {
  id: 'bedroom-door-open',
  minX: -1.16,
  maxX: -1.06,
  minZ: -3.76,
  maxZ: AIR_SHUTTLE_CABIN.rearPartitionZ,
};

const BATHROOM_DOOR_OPEN: CabinBlocker = {
  id: 'bathroom-door-open',
  minX: 1.06,
  maxX: 1.16,
  minZ: -3.76,
  maxZ: AIR_SHUTTLE_CABIN.rearPartitionZ,
};

export function cabinBlockerAt(
  x: number,
  z: number,
  doors: CabinDoorState,
  radius = AIR_SHUTTLE_CABIN.playerRadius,
): CabinBlocker | null {
  const halfWidth = AIR_SHUTTLE_CABIN.innerHalfWidth - radius;
  if (x < -halfWidth || x > halfWidth) return { id: 'wall', minX: -99, maxX: 99, minZ: -99, maxZ: 99 };
  if (
    z < AIR_SHUTTLE_CABIN.rearBulkheadZ + radius ||
    z > AIR_SHUTTLE_CABIN.frontBulkheadZ - radius
  ) {
    return { id: 'bulkhead', minX: -99, maxX: 99, minZ: -99, maxZ: 99 };
  }
  for (const blocker of AIR_SHUTTLE_CABIN_BLOCKERS) {
    if (
      x > blocker.minX - radius &&
      x < blocker.maxX + radius &&
      z > blocker.minZ - radius &&
      z < blocker.maxZ + radius
    ) {
      return blocker;
    }
  }
  if (!doors.bedroomOpen) {
    if (
      x > BEDROOM_DOOR.minX - radius &&
      x < BEDROOM_DOOR.maxX + radius &&
      z > BEDROOM_DOOR.minZ - radius &&
      z < BEDROOM_DOOR.maxZ + radius
    ) {
      return BEDROOM_DOOR;
    }
  }
  if (!doors.bathroomOpen) {
    if (
      x > BATHROOM_DOOR.minX - radius &&
      x < BATHROOM_DOOR.maxX + radius &&
      z > BATHROOM_DOOR.minZ - radius &&
      z < BATHROOM_DOOR.maxZ + radius
    ) {
      return BATHROOM_DOOR;
    }
  }
  if (doors.bedroomOpen) {
    if (
      x > BEDROOM_DOOR_OPEN.minX - radius &&
      x < BEDROOM_DOOR_OPEN.maxX + radius &&
      z > BEDROOM_DOOR_OPEN.minZ - radius &&
      z < BEDROOM_DOOR_OPEN.maxZ + radius
    ) {
      return BEDROOM_DOOR_OPEN;
    }
  }
  if (doors.bathroomOpen) {
    if (
      x > BATHROOM_DOOR_OPEN.minX - radius &&
      x < BATHROOM_DOOR_OPEN.maxX + radius &&
      z > BATHROOM_DOOR_OPEN.minZ - radius &&
      z < BATHROOM_DOOR_OPEN.maxZ + radius
    ) {
      return BATHROOM_DOOR_OPEN;
    }
  }
  return null;
}

export function canStandAt(
  x: number,
  z: number,
  doors: CabinDoorState,
  radius = AIR_SHUTTLE_CABIN.playerRadius,
): boolean {
  return cabinBlockerAt(x, z, doors, radius) === null;
}

/**
 * Axis-separated capsule movement. Trying X and Z independently lets the
 * player slide along walls and furniture without tunnelling through corners.
 */
export function resolveCabinMove(
  fromX: number,
  fromZ: number,
  dx: number,
  dz: number,
  doors: CabinDoorState,
  radius = AIR_SHUTTLE_CABIN.playerRadius,
): CabinMoveResult {
  const targetX = fromX + dx;
  const targetZ = fromZ + dz;
  if (canStandAt(targetX, targetZ, doors, radius)) {
    return { x: targetX, z: targetZ, hitX: false, hitZ: false };
  }
  const xFree = canStandAt(targetX, fromZ, doors, radius);
  const zFree = canStandAt(fromX, targetZ, doors, radius);
  if (xFree && zFree) {
    return Math.abs(dx) >= Math.abs(dz)
      ? { x: targetX, z: fromZ, hitX: false, hitZ: true }
      : { x: fromX, z: targetZ, hitX: true, hitZ: false };
  }
  if (xFree) return { x: targetX, z: fromZ, hitX: false, hitZ: true };
  if (zFree) return { x: fromX, z: targetZ, hitX: true, hitZ: false };
  return { x: fromX, z: fromZ, hitX: true, hitZ: true };
}

/** Highest the player's feet can reach under the finished ceiling. */
export function maxCabinJumpFeetY(height = AIR_SHUTTLE_CABIN.playerHeight): number {
  return Math.max(
    AIR_SHUTTLE_CABIN.floorTopY,
    AIR_SHUTTLE_CABIN.ceilingY - height - 0.04,
  );
}

/** Eye position clamped inside the shell, used by the first-person camera. */
export function cabinCameraLocalY(feetY: number): number {
  return Math.min(
    Math.max(
      feetY + AIR_SHUTTLE_CABIN.eyeHeight,
      AIR_SHUTTLE_CABIN.floorTopY + AIR_SHUTTLE_CABIN.eyeHeight,
    ),
    AIR_SHUTTLE_CABIN.ceilingY - AIR_SHUTTLE_CABIN.cameraCeilingClearance,
  );
}
