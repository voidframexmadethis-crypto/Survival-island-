import { FERRY_DOCK_BOAT_POS } from './ferryPickup';

/**
 * Passenger ferry voyage between the island landing and Crescent City.
 *
 * This is deliberately separate from `FerryPickupSystem`: that system is the
 * worker/car escort to the pier. This one owns the walkable boat, the dock TV
 * that clears boarding, and the official nine-real-hour crossing in each
 * direction.
 */

/** Official duration of one leg in real (wall-clock) hours. */
export const LOUISIANA_FERRY_LEG_HOURS = 9;
export const LOUISIANA_FERRY_LEG_MS = LOUISIANA_FERRY_LEG_HOURS * 60 * 60 * 1000;
export const LOUISIANA_FERRY_ROUND_TRIP_HOURS = LOUISIANA_FERRY_LEG_HOURS * 2;
export const LOUISIANA_FERRY_ROUND_TRIP_MS = LOUISIANA_FERRY_LEG_MS * 2;

export const LOUISIANA_FERRY_DEPART_DELAY = 3.5;
export const LOUISIANA_FERRY_GATE_LIFT_SECONDS = 1.25;
export const LOUISIANA_FERRY_GATE_LIFT_HEIGHT = 2.65;
/** Includes the slow pivot at the berth before the gate is declared open. */
export const LOUISIANA_FERRY_ARRIVAL_SECONDS = 6;
export const LOUISIANA_FERRY_DOCK_POS = {
  x: FERRY_DOCK_BOAT_POS.x,
  z: 713,
} as const;

export const FERRY_DECK_Y = 1.55;
export const FERRY_ROOT_Y = 0.18;
export const FERRY_HALF_WIDTH = 4.6;
export const FERRY_STERN_Z = -17.5;
export const FERRY_BOW_Z = 17.6;
export const FERRY_CABIN_Z = -4;
export const FERRY_CABIN_FRONT_Z = 15.4;
export const FERRY_CABIN_ROOF_Y = 4.35;

export const FERRY_RAMP = {
  halfWidth: 2.4,
  zNear: -21.7,
  zFar: -17.5,
  yNear: 0.62,
  yFar: FERRY_DECK_Y,
} as const;

export const FERRY_ROOMS = [
  {
    id: 'living_room',
    label: 'Ferry Living Room',
    x0: -FERRY_HALF_WIDTH,
    x1: FERRY_HALF_WIDTH,
    z0: FERRY_CABIN_Z,
    z1: 4.4,
  },
  {
    id: 'bedroom',
    label: 'Ferry Bedroom',
    x0: -FERRY_HALF_WIDTH,
    x1: 0.75,
    z0: 4.4,
    z1: 12.1,
  },
  {
    id: 'bathroom',
    label: 'Ferry Bathroom',
    x0: 0.75,
    x1: FERRY_HALF_WIDTH,
    z0: 4.4,
    z1: 12.1,
  },
] as const;

export type FerryRoomId = (typeof FERRY_ROOMS)[number]['id'];
export type LouisianaFerryPhase =
  | 'idle'
  | 'boarding'
  | 'gate_raising'
  | 'departing'
  | 'at_sea'
  | 'arriving'
  | 'arrived';
export type LouisianaFerryDirection = 'outbound' | 'return';
export type LouisianaFerryDock = 'island' | 'crescent_city';

export interface LouisianaFerryStatus {
  phase: LouisianaFerryPhase;
  direction: LouisianaFerryDirection;
  destination: LouisianaFerryDock;
  boardingCleared: boolean;
  aboard: boolean;
  gateLift: number;
  secondsToDeparture: number;
  routeProgress: number;
  elapsedMs: number;
  remainingMs: number;
  durationMs: number;
  boatX: number;
  boatY: number;
  boatZ: number;
  boatYaw: number;
  speedMps: number;
  room: FerryRoomId | 'open_deck' | 'ramp' | null;
  label: string;
}

export interface LouisianaFerryUpdate {
  phaseChanged: boolean;
  boarded: boolean;
  gateOpened: boolean;
  departed: boolean;
  arrived: boolean;
  carryX: number;
  carryZ: number;
}

/** Everything needed to resume a crossing after the app was closed. */
export interface LouisianaFerrySaveState {
  version: 2;
  direction: LouisianaFerryDirection;
  phase: LouisianaFerryPhase;
  departureAtMs: number | null;
  savedAtMs: number;
  elapsedMs: number;
  routeProgress: number;
  aboard: boolean;
  carId: string | null;
  /** Rider's spot on the hull, so a resumed voyage puts them back on deck. */
  playerLocalX: number;
  playerLocalZ: number;
}

export interface FerryPoint {
  x: number;
  z: number;
}

/**
 * Open-water channel between the island pier and the Crescent City berth.
 * The route is water only; its gentle bends are what the hull turns through.
 * The return leg samples this same channelled route in reverse.
 */
export const LOUISIANA_FERRY_ROUTE: readonly FerryPoint[] = [
  { x: LOUISIANA_FERRY_DOCK_POS.x, z: LOUISIANA_FERRY_DOCK_POS.z },
  { x: 27, z: 770 },
  { x: 42, z: 842 },
  { x: 52, z: 940 },
  { x: 50, z: 1060 },
  { x: 38, z: 1180 },
  { x: 32, z: 1280 },
  { x: 38, z: 1365 },
  { x: 40, z: 1428 },
];

const ROUTE_LENGTH = (() => {
  let total = 0;
  for (let i = 1; i < LOUISIANA_FERRY_ROUTE.length; i++) {
    total += Math.hypot(
      LOUISIANA_FERRY_ROUTE[i].x - LOUISIANA_FERRY_ROUTE[i - 1].x,
      LOUISIANA_FERRY_ROUTE[i].z - LOUISIANA_FERRY_ROUTE[i - 1].z,
    );
  }
  return total;
})();

export function ferryRouteDistance(): number {
  return ROUTE_LENGTH;
}

export function sampleFerryRoute(progress: number): FerryPoint {
  const p = Math.max(0, Math.min(1, progress));
  if (p <= 0) return { ...LOUISIANA_FERRY_ROUTE[0] };
  const target = p * ROUTE_LENGTH;
  let travelled = 0;
  for (let i = 1; i < LOUISIANA_FERRY_ROUTE.length; i++) {
    const a = LOUISIANA_FERRY_ROUTE[i - 1];
    const b = LOUISIANA_FERRY_ROUTE[i];
    const segment = Math.hypot(b.x - a.x, b.z - a.z);
    if (travelled + segment >= target) {
      const t = segment > 0 ? (target - travelled) / segment : 0;
      return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
    }
    travelled += segment;
  }
  return { ...LOUISIANA_FERRY_ROUTE[LOUISIANA_FERRY_ROUTE.length - 1] };
}

/**
 * Course heading at a point on the route. The hull's bow is local +Z, so a
 * heading of 0 points down the channel and positive values swing to port.
 */
export function ferryRouteHeading(progress: number): number {
  const p = Math.max(0, Math.min(1, progress));
  const window = 0.002;
  const ahead = sampleFerryRoute(Math.min(1, p + window));
  const behind = sampleFerryRoute(Math.max(0, p - window));
  const dx = ahead.x - behind.x;
  const dz = ahead.z - behind.z;
  if (Math.hypot(dx, dz) < 1e-6) return 0;
  return Math.atan2(dx, dz);
}

/** Progress 0..1 along the leg for a direction (`return` runs the route backwards). */
export function ferryPointForDirection(
  progress: number,
  direction: LouisianaFerryDirection,
): FerryPoint {
  return sampleFerryRoute(direction === 'outbound' ? progress : 1 - progress);
}

/** Heading the hull should hold while travelling a leg. */
export function ferryHeadingForDirection(
  progress: number,
  direction: LouisianaFerryDirection,
): number {
  const base = ferryRouteHeading(direction === 'outbound' ? progress : 1 - progress);
  return direction === 'outbound' ? base : base + Math.PI;
}

/** Heading the hull holds while moored, so the stern ramp faces the pier. */
export function ferryDockedHeading(direction: LouisianaFerryDirection): number {
  return direction === 'outbound' ? Math.PI : 0;
}

/** The hull is turned around at the far berth during the arrival sequence. */
export function ferryOriginHeading(direction: LouisianaFerryDirection): number {
  return direction === 'outbound' ? 0 : Math.PI;
}

/** Local point (x,z) -> footprint surface height relative to the boat root. */
export function ferryWalkSurfaceLocalY(x: number, z: number): number | null {
  if (Math.abs(x) > FERRY_HALF_WIDTH - 0.24) return null;
  if (z >= FERRY_STERN_Z && z <= FERRY_BOW_Z) return FERRY_DECK_Y;
  if (
    Math.abs(x) <= FERRY_RAMP.halfWidth &&
    z >= FERRY_RAMP.zNear &&
    z <= FERRY_RAMP.zFar
  ) {
    const t = (z - FERRY_RAMP.zNear) / (FERRY_RAMP.zFar - FERRY_RAMP.zNear);
    return FERRY_RAMP.yNear + (FERRY_RAMP.yFar - FERRY_RAMP.yNear) * t;
  }
  return null;
}

export function ferryRoomAtLocal(x: number, z: number): FerryRoomId | 'open_deck' | 'ramp' | null {
  if (z >= FERRY_RAMP.zNear && z <= FERRY_RAMP.zFar) return 'ramp';
  if (z < FERRY_STERN_Z || z > FERRY_BOW_Z) return null;
  if (z < FERRY_CABIN_Z) return 'open_deck';
  for (const room of FERRY_ROOMS) {
    if (x >= room.x0 && x <= room.x1 && z >= room.z0 && z <= room.z1) {
      return room.id;
    }
  }
  return 'open_deck';
}

export function formatFerryDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.ceil(ms / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

function shortestAngleDelta(from: number, to: number): number {
  let delta = ((to - from + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
}

function finiteOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export class LouisianaFerryVoyageSystem {
  phase: LouisianaFerryPhase = 'idle';
  direction: LouisianaFerryDirection = 'outbound';
  boardingCleared = false;
  aboard = false;
  routeProgress = 0;
  elapsedMs = 0;
  gateLift = 0;
  speedMps = 0;
  boatX: number = LOUISIANA_FERRY_DOCK_POS.x;
  boatZ: number = LOUISIANA_FERRY_DOCK_POS.z;
  boatY: number = FERRY_ROOT_Y;
  boatYaw = 0;
  departureAtMs: number | null = null;
  private departTimer = 0;
  private arrivalTimer = 0;
  private bobTime = 0;

  constructor(private readonly now: () => number = () => Date.now()) {}

  get destination(): LouisianaFerryDock {
    return this.direction === 'outbound' ? 'crescent_city' : 'island';
  }

  get origin(): LouisianaFerryDock {
    return this.direction === 'outbound' ? 'island' : 'crescent_city';
  }

  reset(): LouisianaFerryUpdate {
    this.phase = 'idle';
    this.direction = 'outbound';
    this.boardingCleared = false;
    this.aboard = false;
    this.routeProgress = 0;
    this.elapsedMs = 0;
    this.departTimer = 0;
    this.arrivalTimer = 0;
    this.bobTime = 0;
    this.gateLift = 0;
    this.speedMps = 0;
    this.departureAtMs = null;
    this.boatX = LOUISIANA_FERRY_DOCK_POS.x;
    this.boatZ = LOUISIANA_FERRY_DOCK_POS.z;
    this.boatY = FERRY_ROOT_Y;
    this.boatYaw = ferryOriginHeading('outbound');
    return this.emptyUpdate();
  }

  /** After outbound disembark: the same hull waits in Crescent City for the return. */
  prepareReturn(): void {
    this.phase = 'idle';
    this.direction = 'return';
    this.boardingCleared = false;
    this.aboard = false;
    // Progress is per-leg: the return leg starts at the Crescent City berth.
    this.routeProgress = 0;
    this.elapsedMs = 0;
    this.departTimer = 0;
    this.arrivalTimer = 0;
    this.gateLift = 0;
    this.speedMps = 0;
    this.departureAtMs = null;
    const point = ferryPointForDirection(0, 'return');
    this.boatX = point.x;
    this.boatZ = point.z;
    this.boatY = FERRY_ROOT_Y;
    this.boatYaw = ferryOriginHeading('return');
  }

  clearBoarding(): boolean {
    if (this.phase !== 'idle') return false;
    this.phase = 'boarding';
    this.boardingCleared = true;
    return true;
  }

  getStatus(): LouisianaFerryStatus {
    const elapsedMs = this.currentElapsedMs();
    const remainingMs = Math.max(0, LOUISIANA_FERRY_LEG_MS - elapsedMs);
    return {
      phase: this.phase,
      direction: this.direction,
      destination: this.destination,
      boardingCleared: this.boardingCleared,
      aboard: this.aboard,
      gateLift: this.gateLift,
      secondsToDeparture: this.departTimer,
      routeProgress: this.routeProgress,
      elapsedMs,
      remainingMs,
      durationMs: LOUISIANA_FERRY_LEG_MS,
      boatX: this.boatX,
      boatY: this.boatY,
      boatZ: this.boatZ,
      boatYaw: this.boatYaw,
      speedMps: this.speedMps,
      room: this.roomAtWorld(this.boatX, this.boatZ),
      label: this.label(elapsedMs, remainingMs),
    };
  }

  /** Wall-clock time already spent on the current at-sea leg. */
  currentElapsedMs(): number {
    if (this.departureAtMs === null) return this.elapsedMs;
    return Math.max(
      0,
      Math.min(LOUISIANA_FERRY_LEG_MS, this.now() - this.departureAtMs),
    );
  }

  /** World point -> boat local space, accounting for the hull's current heading. */
  worldToFerryLocal(x: number, z: number): FerryPoint {
    return this.localOffsetFrom(x, z, this.boatX, this.boatZ, this.boatYaw);
  }

  /** Boat local space -> world point, accounting for the hull's current heading. */
  ferryLocalToWorld(x: number, z: number): FerryPoint {
    const c = Math.cos(this.boatYaw);
    const s = Math.sin(this.boatYaw);
    return { x: this.boatX + x * c + z * s, z: this.boatZ - x * s + z * c };
  }

  /** Foot of the stern boarding ramp in world space, for either berth. */
  getRampWorldPoint(): FerryPoint {
    return this.ferryLocalToWorld(0, FERRY_RAMP.zNear - 0.9);
  }

  /** Local spot where a boarding passenger is placed on the deck. */
  getBoardingDeckPoint(): FerryPoint {
    return this.ferryLocalToWorld(0, -10.5);
  }

  roomAtWorld(x: number, z: number): FerryRoomId | 'open_deck' | 'ramp' | null {
    const local = this.worldToFerryLocal(x, z);
    return ferryRoomAtLocal(local.x, local.z);
  }

  getWalkSurfaceY(x: number, z: number): number | null {
    const local = this.worldToFerryLocal(x, z);
    const surface = ferryWalkSurfaceLocalY(local.x, local.z);
    return surface === null ? null : this.boatY + surface;
  }

  isOnDeck(x: number, y: number, z: number): boolean {
    const local = this.worldToFerryLocal(x, z);
    // The ramp is how the player reaches the boat; actual boarding only counts
    // once their feet are on the hull deck beyond the stern opening.
    if (local.z < FERRY_STERN_Z + 0.35 || local.z > FERRY_BOW_Z) return false;
    if (Math.abs(local.x) > FERRY_HALF_WIDTH - 0.2) return false;
    return Math.abs(y - (this.boatY + FERRY_DECK_Y)) <= 1.35;
  }

  /** Keeps the player inside the hull once the boat is away from the pier. */
  constrainPlayer(x: number, z: number): { x: number; z: number } {
    if (!this.aboard || this.phase === 'idle' || this.phase === 'boarding') {
      return { x, z };
    }
    const local = this.worldToFerryLocal(x, z);
    const localX = Math.max(
      -FERRY_HALF_WIDTH + 0.34,
      Math.min(FERRY_HALF_WIDTH - 0.34, local.x),
    );
    const localZ = Math.max(
      FERRY_STERN_Z + 0.5,
      Math.min(FERRY_BOW_Z - 0.7, local.z),
    );
    return this.ferryLocalToWorld(localX, localZ);
  }

  /** Boarding interaction at the foot of the pier ramp (either berth). */
  boardFromRamp(playerX: number, playerY: number, playerZ: number): FerryUpdateResult {
    if (this.phase !== 'boarding') {
      return {
        ok: false,
        message: this.phase === 'idle'
          ? this.direction === 'outbound'
            ? 'The ferry is roped off. Tap the departure TV on the pier first.'
            : 'Walk to the Crescent Star ramp and board for the island.'
          : 'The ferry is already underway.',
      };
    }
    const ramp = this.getRampWorldPoint();
    const dx = playerX - ramp.x;
    const dz = playerZ - ramp.z;
    if (Math.hypot(dx, dz) > 6.2 || Math.abs(playerY - (this.boatY + FERRY_DECK_Y)) > 3.2) {
      return { ok: false, message: 'Walk to the foot of the ferry ramp.' };
    }
    this.aboard = true;
    this.phase = 'gate_raising';
    this.gateLift = 0;
    this.departTimer = LOUISIANA_FERRY_DEPART_DELAY;
    return {
      ok: true,
      message: this.direction === 'outbound'
        ? 'You step aboard the Crescent Star. The stern gate is lifting clear.'
        : 'You step aboard for the return crossing. The stern gate is lifting clear.',
    };
  }

  update(dt: number, playerX: number, playerY: number, playerZ: number): LouisianaFerryUpdate {
    const out = this.emptyUpdate();
    if (this.phase === 'idle' || this.phase === 'arrived') return out;

    const previousX = this.boatX;
    const previousZ = this.boatZ;
    const previousYaw = this.boatYaw;

    if (this.phase === 'boarding') {
      if (this.isOnDeck(playerX, playerY, playerZ)) {
        this.aboard = true;
        this.phase = 'gate_raising';
        this.gateLift = 0;
        this.departTimer = LOUISIANA_FERRY_DEPART_DELAY;
        out.phaseChanged = true;
        out.boarded = true;
      }
      return out;
    }

    if (this.phase === 'gate_raising') {
      this.gateLift = Math.min(1, this.gateLift + dt / LOUISIANA_FERRY_GATE_LIFT_SECONDS);
      if (this.gateLift >= 1) {
        this.phase = 'departing';
        this.departTimer = LOUISIANA_FERRY_DEPART_DELAY;
        out.phaseChanged = true;
        out.gateOpened = true;
      }
      return out;
    }

    if (this.phase === 'departing') {
      // Once aboard, movement around the cabin can never cancel the sailing.
      this.aboard = true;
      this.departTimer = Math.max(0, this.departTimer - dt);
      if (this.departTimer <= 0) {
        this.phase = 'at_sea';
        this.departureAtMs = this.now();
        this.elapsedMs = 0;
        this.routeProgress = 0;
        out.phaseChanged = true;
        out.departed = true;
      }
      return out;
    }

    if (this.phase === 'at_sea') {
      this.bobTime += dt;
      const carryLocal = this.localOffsetFrom(
        playerX,
        playerZ,
        previousX,
        previousZ,
        previousYaw,
      );
      const elapsed = this.currentElapsedMs();
      this.elapsedMs = elapsed;
      this.routeProgress = Math.max(
        0,
        Math.min(1, elapsed / LOUISIANA_FERRY_LEG_MS),
      );
      const point = ferryPointForDirection(this.routeProgress, this.direction);
      this.boatX = point.x;
      this.boatZ = point.z;
      this.boatY = FERRY_ROOT_Y + Math.sin(this.bobTime * 1.35) * 0.035;

      const targetYaw = ferryHeadingForDirection(this.routeProgress, this.direction);
      this.boatYaw += shortestAngleDelta(this.boatYaw, targetYaw) * Math.min(1, dt * 0.55);
      this.speedMps =
        dt > 0
          ? Math.hypot(this.boatX - previousX, this.boatZ - previousZ) / dt
          : 0;

      const carried = this.ferryLocalToWorld(carryLocal.x, carryLocal.z);
      out.carryX = carried.x - playerX;
      out.carryZ = carried.z - playerZ;

      if (this.routeProgress >= 1) {
        this.phase = 'arriving';
        this.arrivalTimer = LOUISIANA_FERRY_ARRIVAL_SECONDS;
        out.phaseChanged = true;
        this.speedMps = 0;
      }
      return out;
    }

    if (this.phase === 'arriving') {
      this.bobTime += dt;
      this.boatY = FERRY_ROOT_Y + Math.sin(this.bobTime * 1.35) * 0.02;
      this.gateLift = Math.min(1, this.gateLift + dt * 1.8);
      this.arrivalTimer = Math.max(0, this.arrivalTimer - dt);
      this.speedMps = 0;

      // Pivot at the berth so the stern gate always faces the disembark pier.
      const carryLocal = this.localOffsetFrom(
        playerX,
        playerZ,
        previousX,
        previousZ,
        previousYaw,
      );
      const dockYaw = ferryDockedHeading(this.direction);
      this.boatYaw +=
        shortestAngleDelta(this.boatYaw, dockYaw) * Math.min(1, dt * 0.95);
      const carried = this.ferryLocalToWorld(carryLocal.x, carryLocal.z);
      out.carryX = carried.x - playerX;
      out.carryZ = carried.z - playerZ;

      if (this.arrivalTimer <= 0) {
        this.phase = 'arrived';
        this.gateLift = 1;
        this.boatYaw = dockYaw;
        const end = ferryPointForDirection(1, this.direction);
        this.boatX = end.x;
        this.boatZ = end.z;
        out.phaseChanged = true;
        out.arrived = true;
      }
      return out;
    }

    return out;
  }

  /** Persists the wall-clock departure so progress survives closing the app. */
  serialize(
    nowMs: number = this.now(),
    playerLocal?: FerryPoint,
    carId: string | null = null,
  ): LouisianaFerrySaveState {
    const phase: LouisianaFerryPhase =
      this.phase === 'gate_raising' || this.phase === 'departing'
        ? 'boarding'
        : this.phase;
    const active = this.departureAtMs !== null && phase !== 'idle';
    const elapsed = active ? this.currentElapsedMs() : 0;
    return {
      version: 2,
      direction: this.direction,
      phase,
      departureAtMs: this.departureAtMs,
      savedAtMs: nowMs,
      elapsedMs: elapsed,
      routeProgress: this.routeProgress,
      aboard: this.aboard,
      carId,
      playerLocalX: playerLocal?.x ?? 0,
      playerLocalZ: playerLocal?.z ?? -10.5,
    };
  }

  /**
   * Resumes a saved crossing. Progress is recomputed from the saved departure
   * timestamp, so hours spent with the app closed still count.
   */
  restore(save: LouisianaFerrySaveState, nowMs: number = this.now()): void {
    const direction: LouisianaFerryDirection =
      save.direction === 'return' ? 'return' : 'outbound';
    this.direction = direction;
    this.aboard = Boolean(save.aboard);
    this.boardingCleared = false;
    this.departureAtMs =
      typeof save.departureAtMs === 'number' && Number.isFinite(save.departureAtMs)
        ? save.departureAtMs
        : null;
    this.departTimer = LOUISIANA_FERRY_DEPART_DELAY;
    this.arrivalTimer = 0;
    this.speedMps = 0;

    const resumeable =
      save.phase === 'at_sea' ||
      save.phase === 'arriving' ||
      save.phase === 'arrived';

    if (!resumeable || this.departureAtMs === null) {
      // Closed before the lines were cast off: nothing of the nine hours has
      // elapsed yet, so the player can simply board again.
      this.phase = save.phase === 'boarding' ? 'boarding' : 'idle';
      this.boardingCleared = true;
      this.aboard = false;
      // Every leg's route progress starts at 0; direction picks the berth.
      this.routeProgress = 0;
      this.elapsedMs = 0;
      this.gateLift = 0;
      const start = ferryPointForDirection(0, direction);
      this.boatX = start.x;
      this.boatZ = start.z;
      this.boatY = FERRY_ROOT_Y;
      this.boatYaw = ferryOriginHeading(direction);
      return;
    }

    this.phase = 'at_sea';
    this.gateLift = 1;
    this.elapsedMs = Math.max(
      0,
      Math.min(LOUISIANA_FERRY_LEG_MS, nowMs - this.departureAtMs),
    );
    this.routeProgress = this.elapsedMs / LOUISIANA_FERRY_LEG_MS;
    const point = ferryPointForDirection(this.routeProgress, direction);
    this.boatX = point.x;
    this.boatZ = point.z;
    this.boatY = FERRY_ROOT_Y;
    this.boatYaw = ferryHeadingForDirection(this.routeProgress, direction);

    if (this.routeProgress >= 1) {
      // Let the normal arrival sequence finish on the first resumed frame.
      this.phase = 'arriving';
      this.arrivalTimer = 1.2;
      this.gateLift = 1;
      this.boatYaw = ferryDockedHeading(direction);
      this.aboard = Boolean(save.aboard);
    }
  }

  private localOffsetFrom(
    x: number,
    z: number,
    originX: number,
    originZ: number,
    yaw: number,
  ): FerryPoint {
    const dx = x - originX;
    const dz = z - originZ;
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    return { x: dx * c - dz * s, z: dx * s + dz * c };
  }

  private label(elapsedMs: number, remainingMs: number): string {
    const destinationName =
      this.destination === 'crescent_city' ? 'Crescent City' : 'the island';
    switch (this.phase) {
      case 'idle':
        return this.direction === 'outbound'
          ? 'Crescent Star · moored at the island pier'
          : 'Crescent Star · moored at Crescent City';
      case 'boarding':
        return this.aboard
          ? 'Aboard the Crescent Star'
          : 'Boarding cleared · walk up the stern ramp';
      case 'gate_raising':
        return 'Raising the stern boarding gate';
      case 'departing':
        return `Casting off in ${Math.ceil(this.departTimer)}s`;
      case 'at_sea':
        return `${formatFerryDuration(remainingMs)} to ${destinationName} · ${(this.routeProgress * 100).toFixed(1)}%`;
      case 'arriving':
        return `Docking at ${destinationName}`;
      case 'arrived':
        return `Docked at ${destinationName} · stern gate open`;
      default:
        return elapsedMs > 0 ? `${formatFerryDuration(remainingMs)} remaining` : '';
    }
  }

  private emptyUpdate(): LouisianaFerryUpdate {
    return {
      phaseChanged: false,
      boarded: false,
      gateOpened: false,
      departed: false,
      arrived: false,
      carryX: 0,
      carryZ: 0,
    };
  }
}

export interface FerryUpdateResult {
  ok: boolean;
  message: string;
}
