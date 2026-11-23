import { FERRY_DOCK_BOAT_POS } from './ferryPickup';

/**
 * Passenger ferry voyage from the island landing to Crescent City.
 *
 * This is deliberately separate from `FerryPickupSystem`: that system is the
 * worker/car escort to the pier. This one owns the walkable boat, the dock TV
 * that clears boarding, and the 18 in-game-month crossing itself.
 */

export const LOUISIANA_FERRY_MONTHS = 18;
export const LOUISIANA_FERRY_DAYS_PER_MONTH = 30;
export const LOUISIANA_FERRY_DAYS =
  LOUISIANA_FERRY_MONTHS * LOUISIANA_FERRY_DAYS_PER_MONTH;

/**
 * Real seconds the Crescent Star spends crossing the route. The in-game
 * calendar is compressed into this window so the hull is always visibly
 * moving; the trip never sits still waiting for the day counter.
 */
export const LOUISIANA_FERRY_CROSSING_SECONDS = 180;

/** Equivalent real seconds per in-game day. Kept exported so the crossing is tunable. */
export const LOUISIANA_FERRY_SECONDS_PER_DAY =
  LOUISIANA_FERRY_CROSSING_SECONDS / LOUISIANA_FERRY_DAYS;

export const LOUISIANA_FERRY_DEPART_DELAY = 3.5;
export const LOUISIANA_FERRY_GATE_LIFT_SECONDS = 1.25;
export const LOUISIANA_FERRY_GATE_LIFT_HEIGHT = 2.65;
export const LOUISIANA_FERRY_ARRIVAL_SECONDS = 2.4;
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

export interface LouisianaFerryStatus {
  phase: LouisianaFerryPhase;
  boardingCleared: boolean;
  aboard: boolean;
  voyageDay: number;
  voyageDays: number;
  voyageMonth: number;
  voyageMonths: number;
  routeProgress: number;
  secondsToDeparture: number;
  gateLift: number;
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
  daysAdvanced: number;
  arrived: boolean;
  carryX: number;
  carryZ: number;
}

export interface FerryPoint {
  x: number;
  z: number;
}

/**
 * Open-water channel between the island pier and the Crescent City berth.
 * The route is water only; its gentle bends are what the hull turns through.
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

/** Smooth 0..1 acceleration/berthing curve applied to the route progress. */
function ferryEaseInOut(t: number): number {
  const u = Math.max(0, Math.min(1, t));
  return u * u * (3 - 2 * u);
}

function shortestAngleDelta(from: number, to: number): number {
  let delta = ((to - from + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
}

export class LouisianaFerryVoyageSystem {
  phase: LouisianaFerryPhase = 'idle';
  boardingCleared = false;
  aboard = false;
  voyageDay = 0;
  routeProgress = 0;
  boatX: number = LOUISIANA_FERRY_DOCK_POS.x;
  boatZ: number = LOUISIANA_FERRY_DOCK_POS.z;
  boatY: number = FERRY_ROOT_Y;
  boatYaw = 0;
  gateLift = 0;
  speedMps = 0;
  private departTimer = 0;
  private arrivalTimer = 0;
  private voyageSeconds = 0;
  private bobTime = 0;

  reset(): LouisianaFerryUpdate {
    this.phase = 'idle';
    this.boardingCleared = false;
    this.aboard = false;
    this.voyageDay = 0;
    this.routeProgress = 0;
    this.departTimer = 0;
    this.arrivalTimer = 0;
    this.voyageSeconds = 0;
    this.bobTime = 0;
    this.gateLift = 0;
    this.speedMps = 0;
    this.boatX = LOUISIANA_FERRY_DOCK_POS.x;
    this.boatZ = LOUISIANA_FERRY_DOCK_POS.z;
    this.boatY = FERRY_ROOT_Y;
    this.boatYaw = 0;
    return this.emptyUpdate();
  }

  clearBoarding(): boolean {
    if (this.phase !== 'idle') return false;
    this.phase = 'boarding';
    this.boardingCleared = true;
    return true;
  }

  get voyageMonth(): number {
    if (this.voyageDay >= LOUISIANA_FERRY_DAYS) return LOUISIANA_FERRY_MONTHS;
    return Math.min(
      LOUISIANA_FERRY_MONTHS,
      Math.floor(this.voyageDay / LOUISIANA_FERRY_DAYS_PER_MONTH) + 1,
    );
  }

  getStatus(): LouisianaFerryStatus {
    return {
      phase: this.phase,
      boardingCleared: this.boardingCleared,
      aboard: this.aboard,
      voyageDay: this.voyageDay,
      voyageDays: LOUISIANA_FERRY_DAYS,
      voyageMonth: this.voyageMonth,
      voyageMonths: LOUISIANA_FERRY_MONTHS,
      routeProgress: this.routeProgress,
      secondsToDeparture: this.departTimer,
      gateLift: this.gateLift,
      boatX: this.boatX,
      boatY: this.boatY,
      boatZ: this.boatZ,
      boatYaw: this.boatYaw,
      speedMps: this.speedMps,
      room: this.roomAtWorld(this.boatX, this.boatZ),
      label: this.label(),
    };
  }

  /** World point -> boat local space, accounting for the hull's current heading. */
  worldToFerryLocal(x: number, z: number): FerryPoint {
    const dx = x - this.boatX;
    const dz = z - this.boatZ;
    const c = Math.cos(this.boatYaw);
    const s = Math.sin(this.boatYaw);
    return { x: dx * c - dz * s, z: dx * s + dz * c };
  }

  /** Boat local space -> world point, accounting for the hull's current heading. */
  ferryLocalToWorld(x: number, z: number): FerryPoint {
    const c = Math.cos(this.boatYaw);
    const s = Math.sin(this.boatYaw);
    return { x: this.boatX + x * c + z * s, z: this.boatZ - x * s + z * c };
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

  /** Boarding interaction at the top of the pier ramp. */
  boardFromRamp(playerX: number, playerY: number, playerZ: number): FerryUpdateResult {
    if (this.phase !== 'boarding') {
      return {
        ok: false,
        message: this.phase === 'idle'
          ? 'The ferry is roped off. Tap the departure TV on the pier first.'
          : 'The ferry is already underway.',
      };
    }
    const dx = playerX - (this.boatX + 0);
    const dz = playerZ - 692.2;
    if (Math.hypot(dx, dz) > 5.8 || Math.abs(playerY - 1.1) > 2.6) {
      return { ok: false, message: 'Walk to the foot of the ferry ramp.' };
    }
    this.aboard = true;
    this.phase = 'gate_raising';
    this.gateLift = 0;
    this.departTimer = LOUISIANA_FERRY_DEPART_DELAY;
    return {
      ok: true,
      message: 'You step aboard the Crescent Star. The stern gate is lifting clear.',
    };
  }

  /** Bridges can skip a single voyage day from the cabin bed. */
  restForOneDay(): boolean {
    return this.restForDays(1) > 0;
  }

  /**
   * Fast-forwards the crossing from the cabin bed. Returns the number of
   * in-game days that actually elapsed. The hull, camera and player are all
   * moved together by the normal per-frame integration afterwards.
   */
  restForDays(days: number): number {
    if (this.phase !== 'at_sea' || days <= 0) return 0;
    const remainingDays = LOUISIANA_FERRY_DAYS - this.voyageDay;
    if (remainingDays <= 0) return 0;
    const advance = Math.min(Math.floor(days), remainingDays);
    this.voyageSeconds = Math.min(
      LOUISIANA_FERRY_CROSSING_SECONDS,
      this.voyageSeconds + advance * LOUISIANA_FERRY_SECONDS_PER_DAY,
    );
    this.syncVoyageFromTime();
    if (this.routeProgress >= 1) {
      this.phase = 'arriving';
      this.arrivalTimer = LOUISIANA_FERRY_ARRIVAL_SECONDS;
    }
    return advance;
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
        this.voyageSeconds = 0;
        this.syncVoyageFromTime();
        out.phaseChanged = true;
        out.departed = true;
      }
      return out;
    }

    if (this.phase === 'at_sea') {
      this.bobTime += dt;
      const previousDay = this.voyageDay;
      // The rider's spot on the deck before the hull moves or turns. Carrying
      // this local offset (not just the position delta) keeps them planted
      // while the bow swings through the channel.
      const carryLocal = this.localOffsetFrom(
        playerX,
        playerZ,
        previousX,
        previousZ,
        previousYaw,
      );
      this.voyageSeconds = Math.min(
        LOUISIANA_FERRY_CROSSING_SECONDS,
        this.voyageSeconds + dt,
      );
      this.syncVoyageFromTime();
      out.daysAdvanced = this.voyageDay - previousDay;

      // Real ferries swing their bow through the channel instead of crabbing.
      const targetYaw = ferryRouteHeading(this.routeProgress + 0.01);
      this.boatYaw += shortestAngleDelta(this.boatYaw, targetYaw) * Math.min(1, dt * 0.55);
      this.boatY = FERRY_ROOT_Y + Math.sin(this.bobTime * 1.35) * 0.035;
      this.speedMps = dt > 0 ? Math.hypot(this.boatX - previousX, this.boatZ - previousZ) / dt : 0;

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
      if (this.arrivalTimer <= 0) {
        this.phase = 'arrived';
        this.gateLift = 1;
        out.phaseChanged = true;
        out.arrived = true;
      }
      return out;
    }

    return out;
  }

  /**
   * Single source of truth for the crossing: route progress, calendar day and
   * the rendered hull position all derive from the same elapsed time, so the
   * counter and the visible boat can never drift apart.
   */
  private syncVoyageFromTime(): void {
    const u = Math.max(
      0,
      Math.min(1, this.voyageSeconds / LOUISIANA_FERRY_CROSSING_SECONDS),
    );
    this.routeProgress = ferryEaseInOut(u);
    this.voyageDay = Math.min(
      LOUISIANA_FERRY_DAYS,
      Math.floor(u * LOUISIANA_FERRY_DAYS + 1e-9),
    );
    const point = sampleFerryRoute(this.routeProgress);
    this.boatX = point.x;
    this.boatZ = point.z;
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

  private label(): string {
    switch (this.phase) {
      case 'idle':
        return 'Crescent Star · moored at the island pier';
      case 'boarding':
        return this.aboard ? 'Aboard the Crescent Star' : 'Boarding cleared · walk up the ramp';
      case 'gate_raising':
        return 'Raising the stern boarding gate';
      case 'departing':
        return `Casting off in ${Math.ceil(this.departTimer)}s`;
      case 'at_sea':
        return `Month ${this.voyageMonth} of ${LOUISIANA_FERRY_MONTHS} · Day ${Math.max(1, this.voyageDay)} of ${LOUISIANA_FERRY_DAYS} · Louisiana crossing`;
      case 'arriving':
        return 'Slowing into the Crescent City berth';
      case 'arrived':
        return 'Docked in Crescent City · stern gate open';
      default:
        return '';
    }
  }

  private emptyUpdate(): LouisianaFerryUpdate {
    return {
      phaseChanged: false,
      boarded: false,
      gateOpened: false,
      departed: false,
      daysAdvanced: 0,
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
