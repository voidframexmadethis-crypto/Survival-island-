import { FERRY_DOCK_BOAT_POS } from './ferryPickup';

/**
 * Passenger ferry voyage from the island landing to Crescent City.
 *
 * This is deliberately separate from `FerryPickupSystem`: that system is the
 * worker/car escort to the pier. This one owns the walkable boat, the dock TV
 * that clears boarding, and the 18 in-game-day crossing itself.
 */

export const LOUISIANA_FERRY_DAYS = 18;
export const LOUISIANA_FERRY_SECONDS_PER_DAY = 6;
export const LOUISIANA_FERRY_DEPART_DELAY = 5;
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
  routeProgress: number;
  secondsToDeparture: number;
  room: FerryRoomId | 'open_deck' | 'ramp' | null;
  label: string;
}

export interface LouisianaFerryUpdate {
  phaseChanged: boolean;
  boarded: boolean;
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

/** Open-water route: south from the island pier, then north up the river. */
export const LOUISIANA_FERRY_ROUTE: readonly FerryPoint[] = [
  { x: LOUISIANA_FERRY_DOCK_POS.x, z: LOUISIANA_FERRY_DOCK_POS.z },
  { x: 26, z: 764 },
  { x: 27, z: 848 },
  { x: 30, z: 966 },
  { x: 34, z: 1092 },
  { x: 37, z: 1228 },
  { x: 39, z: 1336 },
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

export class LouisianaFerryVoyageSystem {
  phase: LouisianaFerryPhase = 'idle';
  boardingCleared = false;
  aboard = false;
  voyageDay = 0;
  routeProgress = 0;
  boatX: number = LOUISIANA_FERRY_DOCK_POS.x;
  boatZ: number = LOUISIANA_FERRY_DOCK_POS.z;
  boatY: number = FERRY_ROOT_Y;
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
    this.boatX = LOUISIANA_FERRY_DOCK_POS.x;
    this.boatZ = LOUISIANA_FERRY_DOCK_POS.z;
    this.boatY = FERRY_ROOT_Y;
    return this.emptyUpdate();
  }

  clearBoarding(): boolean {
    if (this.phase !== 'idle') return false;
    this.phase = 'boarding';
    this.boardingCleared = true;
    return true;
  }

  getStatus(): LouisianaFerryStatus {
    return {
      phase: this.phase,
      boardingCleared: this.boardingCleared,
      aboard: this.aboard,
      voyageDay: this.voyageDay,
      voyageDays: LOUISIANA_FERRY_DAYS,
      routeProgress: this.routeProgress,
      secondsToDeparture: this.departTimer,
      room: this.roomAtWorld(this.boatX, this.boatZ),
      label: this.label(),
    };
  }

  roomAtWorld(x: number, z: number): FerryRoomId | 'open_deck' | 'ramp' | null {
    return ferryRoomAtLocal(x - this.boatX, z - this.boatZ);
  }

  getWalkSurfaceY(x: number, z: number): number | null {
    const surface = ferryWalkSurfaceLocalY(x - this.boatX, z - this.boatZ);
    return surface === null ? null : this.boatY + surface;
  }

  isOnDeck(x: number, y: number, z: number): boolean {
    const surface = this.getWalkSurfaceY(x, z);
    if (surface === null) return false;
    return Math.abs(y - surface) <= 1.35;
  }

  /** Keeps the player inside the hull once the boat is away from the pier. */
  constrainPlayer(x: number, z: number): { x: number; z: number } {
    if (!this.aboard || this.phase === 'idle' || this.phase === 'boarding') {
      return { x, z };
    }
    const localX = Math.max(-FERRY_HALF_WIDTH + 0.34, Math.min(FERRY_HALF_WIDTH - 0.34, x - this.boatX));
    const localZ = Math.max(FERRY_STERN_Z + 0.5, Math.min(FERRY_BOW_Z - 0.7, z - this.boatZ));
    return { x: this.boatX + localX, z: this.boatZ + localZ };
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
    this.phase = 'departing';
    this.departTimer = LOUISIANA_FERRY_DEPART_DELAY;
    return {
      ok: true,
      message: 'You step aboard the Crescent Star. The stern gate swings shut.',
    };
  }

  /** Bridges can jump a day by sleeping in the cabin. */
  restForOneDay(): boolean {
    if (this.phase !== 'at_sea' || this.voyageDay >= LOUISIANA_FERRY_DAYS) return false;
    this.advanceVoyageDay();
    return true;
  }

  update(dt: number, playerX: number, playerY: number, playerZ: number): LouisianaFerryUpdate {
    const out = this.emptyUpdate();
    if (this.phase === 'idle' || this.phase === 'arrived') return out;

    const previousX = this.boatX;
    const previousZ = this.boatZ;

    if (this.phase === 'boarding') {
      if (this.isOnDeck(playerX, playerY, playerZ)) {
        this.aboard = true;
        this.phase = 'departing';
        this.departTimer = LOUISIANA_FERRY_DEPART_DELAY;
        out.phaseChanged = true;
        out.boarded = true;
      }
      return out;
    }

    if (this.phase === 'departing') {
      if (!this.aboard) {
        this.phase = 'boarding';
        out.phaseChanged = true;
        return out;
      }
      this.departTimer = Math.max(0, this.departTimer - dt);
      if (this.departTimer <= 0) {
        this.phase = 'at_sea';
        out.phaseChanged = true;
        out.departed = true;
      }
      return out;
    }

    if (this.phase === 'at_sea') {
      this.bobTime += dt;
      const previousDay = this.voyageDay;
      this.voyageSeconds += dt;
      this.routeProgress = Math.min(
        1,
        this.routeProgress + dt / (LOUISIANA_FERRY_DAYS * LOUISIANA_FERRY_SECONDS_PER_DAY),
      );
      const expectedDay = Math.min(
        LOUISIANA_FERRY_DAYS,
        Math.floor(this.voyageSeconds / LOUISIANA_FERRY_SECONDS_PER_DAY),
      );
      this.voyageDay = expectedDay;
      out.daysAdvanced = this.voyageDay - previousDay;

      const point = sampleFerryRoute(this.routeProgress);
      this.boatX = point.x;
      this.boatZ = point.z;
      this.boatY = FERRY_ROOT_Y + Math.sin(this.bobTime * 1.35) * 0.035;

      if (this.routeProgress >= 1) {
        this.phase = 'arriving';
        this.arrivalTimer = 1.8;
        out.phaseChanged = true;
      }
      out.carryX = this.boatX - previousX;
      out.carryZ = this.boatZ - previousZ;
      return out;
    }

    if (this.phase === 'arriving') {
      this.bobTime += dt;
      this.boatY = FERRY_ROOT_Y + Math.sin(this.bobTime * 1.35) * 0.025;
      this.arrivalTimer = Math.max(0, this.arrivalTimer - dt);
      if (this.arrivalTimer <= 0) {
        this.phase = 'arrived';
        out.phaseChanged = true;
        out.arrived = true;
      }
      return out;
    }

    return out;
  }

  private advanceVoyageDay(): void {
    this.voyageDay = Math.min(LOUISIANA_FERRY_DAYS, this.voyageDay + 1);
    this.voyageSeconds = this.voyageDay * LOUISIANA_FERRY_SECONDS_PER_DAY;
    this.routeProgress = Math.min(1, this.voyageDay / LOUISIANA_FERRY_DAYS);
    const point = sampleFerryRoute(this.routeProgress);
    this.boatX = point.x;
    this.boatZ = point.z;
    if (this.routeProgress >= 1) {
      this.phase = 'arriving';
      this.arrivalTimer = 1.8;
    }
  }

  private label(): string {
    switch (this.phase) {
      case 'idle':
        return 'Crescent Star · moored at the island pier';
      case 'boarding':
        return this.aboard ? 'Aboard the Crescent Star' : 'Boarding cleared · walk up the ramp';
      case 'departing':
        return `Casting off in ${Math.ceil(this.departTimer)}s`;
      case 'at_sea':
        return `Day ${Math.max(1, this.voyageDay)} of ${LOUISIANA_FERRY_DAYS} · Louisiana crossing`;
      case 'arriving':
        return 'Crescent City coming into view';
      case 'arrived':
        return 'Docked in Crescent City';
      default:
        return '';
    }
  }

  private emptyUpdate(): LouisianaFerryUpdate {
    return {
      phaseChanged: false,
      boarded: false,
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
