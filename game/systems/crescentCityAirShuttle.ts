/**
 * Crescent Clipper seaplane shuttle.
 *
 * A no-fuel, automatic passenger flight between the Driftwood Island seaplane
 * base and a water runway on Lake Pontchartrain in Crescent City. The player
 * boards, the gull-wing door closes, the engines catch, the plane taxis out,
 * takes off, flies for exactly fifty-five minutes of wall-clock time, lands,
 * taxis in and turns around ready for the return leg.
 *
 * Like the Crescent Star ferry, the airborne leg is measured against the wall
 * clock so closing the tab does not restart the trip. Ground phases use the
 * simulation step; the visible aircraft covers the full route instead of
 * teleporting between runways.
 */

export type AirShuttleDirection = 'outbound' | 'return';
export type AirShuttleBaseId = 'island' | 'crescent_city';
export type AirShuttlePhase =
  | 'idle'
  | 'doors_closing'
  | 'engine_start'
  | 'taxi_out'
  | 'takeoff'
  | 'airborne'
  | 'landing'
  | 'taxi_in'
  | 'turnaround'
  | 'parked';

/** The advertised crossing time, exactly fifty-five real minutes. */
export const AIR_SHUTTLE_LEG_MINUTES = 55;
export const AIR_SHUTTLE_LEG_MS = AIR_SHUTTLE_LEG_MINUTES * 60 * 1000;
export const AIR_SHUTTLE_LEG_SECONDS = AIR_SHUTTLE_LEG_MS / 1000;

/** Express cabin service: the whole hop to Crescent City takes 30 seconds. */
export const AIR_SHUTTLE_EXPRESS_SECONDS = 30;
export const AIR_SHUTTLE_EXPRESS_AIRBORNE_SECONDS = 18;

/** Express phase budget; the pieces add up to exactly 30 seconds. */
const EXPRESS_PHASE_MS = {
  doorsClosing: 700,
  engineStart: 700,
  taxiOut: 2_200,
  takeoff: 2_200,
  airborne: AIR_SHUTTLE_EXPRESS_AIRBORNE_SECONDS * 1000,
  landing: 2_200,
  taxiIn: 2_200,
  turnaround: 1_800,
} as const;

export const AIR_SHUTTLE_DOOR_SECONDS = 1.4;
export const AIR_SHUTTLE_ENGINE_START_SECONDS = 2.4;
export const AIR_SHUTTLE_TAXI_OUT_SECONDS = 18;
export const AIR_SHUTTLE_TAKEOFF_SECONDS = 16;
export const AIR_SHUTTLE_LANDING_SECONDS = 9;
export const AIR_SHUTTLE_TAXI_IN_SECONDS = 15;
export const AIR_SHUTTLE_TURNAROUND_SECONDS = 5;
/** Service ceiling and cruise altitude for the Crescent Clipper. */
export const AIR_SHUTTLE_CRUISE_ALTITUDE_FT = 38_000;
export const AIR_SHUTTLE_CRUISE_ALTITUDE_M = AIR_SHUTTLE_CRUISE_ALTITUDE_FT * 0.3048;

export interface AirShuttleBase {
  id: AirShuttleBaseId;
  label: string;
  /** Where the plane is parked, ready for the next departure. */
  parkingX: number;
  parkingZ: number;
  /** Direction the plane faces when parked for an outbound departure. */
  outboundYaw: number;
  /** Runway threshold where the takeoff roll begins. */
  runwayStartX: number;
  runwayStartZ: number;
  /** Point off the end of the runway where the plane becomes airborne. */
  takeoffEndX: number;
  takeoffEndZ: number;
  /** Touchdown point and the end of the landing rollout. */
  landingStartX: number;
  landingStartZ: number;
  landingEndX: number;
  landingEndZ: number;
  /** Floating runway slab (used by the world builder). */
  runwayCenterX: number;
  runwayCenterZ: number;
  runwayLength: number;
  runwayWidth: number;
  runwayAxis: 'x' | 'z';
  hangarX: number;
  hangarZ: number;
  waterY: number;
  boardingRadius: number;
  /** Solid ground beside the hangar where a passenger is set down. */
  disembarkX: number;
  disembarkZ: number;
}

/**
 * The island base sits between the ferry pier and the outbound channel. The
 * plane is moored ten metres off the beach, close enough to walk up to.
 */
export const ISLAND_SEAPLANE_BASE: AirShuttleBase = {
  id: 'island',
  label: 'Driftwood Seaplane Base',
  parkingX: 88,
  parkingZ: 690,
  outboundYaw: 0,
  runwayStartX: 88,
  runwayStartZ: 912,
  takeoffEndX: 88,
  takeoffEndZ: 1030,
  landingStartX: 88,
  landingStartZ: 912,
  landingEndX: 88,
  landingEndZ: 828,
  runwayCenterX: 88,
  runwayCenterZ: 810,
  runwayLength: 260,
  runwayWidth: 26,
  runwayAxis: 'z',
  hangarX: 88,
  hangarZ: 670,
  waterY: 0,
  boardingRadius: 28,
  disembarkX: 88,
  disembarkZ: 668,
};

/**
 * Crescent City's water runway floats on Lake Pontchartrain, within sight of
 * the north edge of the city and a short walk from the seaplane dock.
 */
export const CRESCENT_CITY_SEAPLANE_BASE: AirShuttleBase = {
  id: 'crescent_city',
  label: 'Lake Pontchartrain Seaplane Base',
  parkingX: -108,
  parkingZ: 1164,
  outboundYaw: Math.PI / 2,
  runwayStartX: 110,
  runwayStartZ: 1164,
  takeoffEndX: 240,
  takeoffEndZ: 1164,
  landingStartX: 110,
  landingStartZ: 1164,
  landingEndX: 20,
  landingEndZ: 1164,
  runwayCenterX: 10,
  runwayCenterZ: 1164,
  runwayLength: 260,
  runwayWidth: 26,
  runwayAxis: 'x',
  hangarX: -128,
  hangarZ: 1164,
  waterY: 1.35,
  boardingRadius: 26,
  disembarkX: -106,
  disembarkZ: 1190,
};

export interface AirShuttleStatus {
  phase: AirShuttlePhase;
  direction: AirShuttleDirection;
  origin: AirShuttleBaseId;
  destination: AirShuttleBaseId;
  label: string;
  aboard: boolean;
  doorsOpen: number;
  engineOn: boolean;
  /** Airborne progress 0..1; also 1 after touchdown. */
  routeProgress: number;
  elapsedMs: number;
  remainingMs: number;
  durationMs: number;
  /** True while the aircraft is flying the 30-second express hop. */
  express: boolean;
  /** True when the player is aboard and may still call for express service. */
  expressAvailable: boolean;
  expressSeconds: number;
  planeX: number;
  planeY: number;
  planeZ: number;
  planeYaw: number;
  planePitch: number;
  planeRoll: number;
  altitudeM: number;
  speedMps: number;
  canBoard: boolean;
  canDisembark: boolean;
  boardingBase: AirShuttleBaseId;
}

export interface AirShuttleUpdate {
  doorsClosed: boolean;
  engineStarted: boolean;
  tookOff: boolean;
  landed: boolean;
  arrived: boolean;
  /** Change in hull yaw this frame, so a rider's camera can follow. */
  yawDelta: number;
}

export interface AirShuttleSaveState {
  version: 1;
  /** Parked direction, or the direction of the leg in progress. */
  direction: AirShuttleDirection;
  phase: 'airborne' | 'parked';
  departureAtMs: number | null;
  savedAtMs: number;
  elapsedMs: number;
  aboard: boolean;
  /** Present on saves written after express service shipped. */
  express?: boolean;
}

export interface AirShuttleRestoreResult {
  completed: boolean;
  wasAboard: boolean;
}

interface Point2 {
  x: number;
  z: number;
}

interface RouteSample extends Point2 {
  distance: number;
}

interface FlightRoute {
  samples: RouteSample[];
  length: number;
}

const ROUTE_SAMPLES = 900;
/** The final eight percent of the route is the descent into the water runway. */
const DESCENT_FRACTION = 0.08;

const ISLAND_ROUTE_CONTROL = {
  p0: { x: ISLAND_SEAPLANE_BASE.takeoffEndX, z: ISLAND_SEAPLANE_BASE.takeoffEndZ },
  p1: { x: ISLAND_SEAPLANE_BASE.takeoffEndX, z: 340_000 },
  p2: { x: 360_000, z: CRESCENT_CITY_SEAPLANE_BASE.landingStartZ },
  p3: {
    x: CRESCENT_CITY_SEAPLANE_BASE.landingStartX,
    z: CRESCENT_CITY_SEAPLANE_BASE.landingStartZ,
  },
};

const RETURN_ROUTE_CONTROL = {
  p0: {
    x: CRESCENT_CITY_SEAPLANE_BASE.takeoffEndX,
    z: CRESCENT_CITY_SEAPLANE_BASE.takeoffEndZ,
  },
  p1: { x: 360_000, z: CRESCENT_CITY_SEAPLANE_BASE.takeoffEndZ },
  p2: { x: ISLAND_SEAPLANE_BASE.landingStartX, z: 340_000 },
  p3: {
    x: ISLAND_SEAPLANE_BASE.landingStartX,
    z: ISLAND_SEAPLANE_BASE.landingStartZ,
  },
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smoothstep(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

function bezierAt(
  p0: Point2,
  p1: Point2,
  p2: Point2,
  p3: Point2,
  t: number,
): Point2 {
  const mt = 1 - t;
  const a = mt * mt * mt;
  const b = 3 * mt * mt * t;
  const c = 3 * mt * t * t;
  const d = t * t * t;
  return {
    x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
    z: a * p0.z + b * p1.z + c * p2.z + d * p3.z,
  };
}

function buildFlightRoute(control: {
  p0: Point2;
  p1: Point2;
  p2: Point2;
  p3: Point2;
}): FlightRoute {
  const samples: RouteSample[] = [];
  let distance = 0;
  let previous = control.p0;
  samples.push({ ...previous, distance: 0 });
  for (let i = 1; i <= ROUTE_SAMPLES; i++) {
    const point = bezierAt(control.p0, control.p1, control.p2, control.p3, i / ROUTE_SAMPLES);
    distance += Math.hypot(point.x - previous.x, point.z - previous.z);
    samples.push({ ...point, distance });
    previous = point;
  }
  return { samples, length: distance };
}

const OUTBOUND_ROUTE = buildFlightRoute(ISLAND_ROUTE_CONTROL);
const RETURN_ROUTE = buildFlightRoute(RETURN_ROUTE_CONTROL);

/** Exposed for tests and for sizing the runway approach. */
export function airShuttleRouteLength(direction: AirShuttleDirection): number {
  return direction === 'outbound' ? OUTBOUND_ROUTE.length : RETURN_ROUTE.length;
}

/** Airborne cruise speed needed to cover the route in exactly fifty-five minutes. */
export function airShuttleCruiseSpeed(direction: AirShuttleDirection): number {
  return airShuttleRouteLength(direction) / AIR_SHUTTLE_LEG_SECONDS;
}

function routePositionAt(route: FlightRoute, distance: number): Point2 {
  const target = Math.max(0, Math.min(route.length, distance));
  const samples = route.samples;
  let low = 0;
  let high = samples.length - 1;
  while (low + 1 < high) {
    const mid = (low + high) >> 1;
    if (samples[mid].distance <= target) low = mid;
    else high = mid;
  }
  const a = samples[low];
  const b = samples[high];
  const span = b.distance - a.distance;
  const t = span > 1e-9 ? (target - a.distance) / span : 0;
  return { x: lerp(a.x, b.x, t), z: lerp(a.z, b.z, t) };
}

function routeHeadingAt(route: FlightRoute, distance: number): number {
  const behind = routePositionAt(route, Math.max(0, distance - 4));
  const ahead = routePositionAt(route, Math.min(route.length, distance + 4));
  const dx = ahead.x - behind.x;
  const dz = ahead.z - behind.z;
  if (Math.hypot(dx, dz) < 1e-9) return 0;
  return Math.atan2(dx, dz);
}

function normalizeAngle(angle: number): number {
  let value = angle;
  while (value > Math.PI) value -= Math.PI * 2;
  while (value < -Math.PI) value += Math.PI * 2;
  return value;
}

function shortestAngleDelta(from: number, to: number): number {
  return normalizeAngle(to - from);
}

function opposite(direction: AirShuttleDirection): AirShuttleDirection {
  return direction === 'outbound' ? 'return' : 'outbound';
}

export function airShuttleBaseFor(direction: AirShuttleDirection): AirShuttleBase {
  return direction === 'outbound' ? ISLAND_SEAPLANE_BASE : CRESCENT_CITY_SEAPLANE_BASE;
}

function destinationBaseFor(direction: AirShuttleDirection): AirShuttleBase {
  return direction === 'outbound' ? CRESCENT_CITY_SEAPLANE_BASE : ISLAND_SEAPLANE_BASE;
}

export function formatAirShuttleDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.ceil(ms / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

/** Second-by-second countdown for the express hop. */
export function formatAirShuttleCountdown(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  if (seconds < 60) return `${seconds}s`;
  return formatAirShuttleDuration(ms);
}

export class AirShuttleVoyageSystem {
  phase: AirShuttlePhase = 'idle';
  direction: AirShuttleDirection = 'outbound';
  aboard = false;
  express = false;

  planeX = ISLAND_SEAPLANE_BASE.parkingX;
  planeY = ISLAND_SEAPLANE_BASE.waterY + 0.1;
  planeZ = ISLAND_SEAPLANE_BASE.parkingZ;
  planeYaw = ISLAND_SEAPLANE_BASE.outboundYaw;
  planePitch = 0;
  planeRoll = 0;
  altitudeM = 0;
  speedMps = 0;
  doorOpen = 1;
  engineOn = false;
  routeProgress = 0;
  elapsedMs = 0;
  departureAtMs: number | null = null;

  private phaseStartedAtMs: number | null = null;
  private previousYaw = ISLAND_SEAPLANE_BASE.outboundYaw;
  private readonly outboundRoute = OUTBOUND_ROUTE;
  private readonly returnRoute = RETURN_ROUTE;

  constructor(private readonly now: () => number = () => Date.now()) {}

  get cruiseAltitude(): number {
    return AIR_SHUTTLE_CRUISE_ALTITUDE_M;
  }

  get currentBase(): AirShuttleBase {
    return airShuttleBaseFor(this.direction);
  }

  get destination(): AirShuttleBase {
    return destinationBaseFor(this.direction);
  }

  /** Airborne budget for the leg currently being flown. */
  get legDurationMs(): number {
    return this.express
      ? AIR_SHUTTLE_EXPRESS_AIRBORNE_SECONDS * 1000
      : AIR_SHUTTLE_LEG_MS;
  }

  get remainingMs(): number {
    return Math.max(0, this.legDurationMs - this.elapsedMs);
  }

  get canBoard(): boolean {
    return this.phase === 'idle' && !this.aboard;
  }

  /** Express is offered to Crescent City only, before the wheels leave the water. */
  get expressAvailable(): boolean {
    return (
      this.aboard &&
      !this.express &&
      this.direction === 'outbound' &&
      (this.phase === 'doors_closing' ||
        this.phase === 'engine_start' ||
        this.phase === 'taxi_out')
    );
  }

  get canDisembark(): boolean {
    return this.aboard && (this.phase === 'idle' || this.phase === 'parked');
  }

  get destinationId(): AirShuttleBaseId {
    return this.destination.id;
  }

  get originId(): AirShuttleBaseId {
    return this.currentBase.id;
  }

  reset(): void {
    this.phase = 'idle';
    this.direction = 'outbound';
    this.aboard = false;
    this.express = false;
    this.phaseStartedAtMs = null;
    this.departureAtMs = null;
    this.elapsedMs = 0;
    this.routeProgress = 0;
    this.speedMps = 0;
    this.engineOn = false;
    this.doorOpen = 1;
    this.altitudeM = 0;
    this.setParkedPose('outbound');
  }

  private routeFor(direction: AirShuttleDirection): FlightRoute {
    return direction === 'outbound' ? this.outboundRoute : this.returnRoute;
  }

  private setParkedPose(direction: AirShuttleDirection): void {
    const base = airShuttleBaseFor(direction);
    this.planeX = base.parkingX;
    this.planeY = base.waterY + 0.1;
    this.planeZ = base.parkingZ;
    this.planeYaw = base.outboundYaw;
    this.previousYaw = base.outboundYaw;
    this.planePitch = 0;
    this.planeRoll = 0;
    this.altitudeM = 0;
    this.speedMps = 0;
  }

  /** Seat the passenger. Doors lift shut, then the engines catch on their own. */
  board(): { ok: boolean; message: string } {
    if (this.aboard) {
      return { ok: false, message: 'You are already inside the Crescent Clipper.' };
    }
    if (this.phase !== 'idle') {
      return { ok: false, message: 'The Crescent Clipper is already moving. Wait for it to park.' };
    }
    this.aboard = true;
    this.express = false;
    this.phase = 'doors_closing';
    this.phaseStartedAtMs = this.now();
    this.doorOpen = 1;
    this.engineOn = false;
    const destination = this.destination.label;
    return {
      ok: true,
      message: `The Crescent Clipper's gull-wing door lifts shut. Engines starting for the fifty-five-minute flight to ${destination}.`,
    };
  }

  /**
   * Switches the current boarding to express service: a thirty-second hop to
   * Crescent City with every ground and airborne phase compressed to fit.
   */
  requestExpress(): { ok: boolean; message: string } {
    if (!this.aboard) {
      return {
        ok: false,
        message: 'Board the Crescent Clipper first, then call for express service.',
      };
    }
    if (this.express) {
      return { ok: false, message: 'Express service is already confirmed.' };
    }
    if (this.direction !== 'outbound') {
      return {
        ok: false,
        message: 'Express service runs to Crescent City only.',
      };
    }
    if (!this.expressAvailable) {
      return {
        ok: false,
        message: 'The Crescent Clipper has already left the water runway.',
      };
    }
    this.express = true;
    return {
      ok: true,
      message: 'Express service confirmed — Crescent City in thirty seconds.',
    };
  }

  /** Leave the plane once it is parked with the door open. */
  disembark(): { ok: boolean; message: string } {
    if (!this.aboard) {
      return { ok: false, message: 'You are not inside the Crescent Clipper.' };
    }
    if (this.phase !== 'idle' && this.phase !== 'parked') {
      return { ok: false, message: 'The Crescent Clipper is still moving. Wait until it parks.' };
    }
    this.aboard = false;
    this.express = false;
    this.phase = 'idle';
    this.doorOpen = 1;
    this.engineOn = false;
    this.phaseStartedAtMs = null;
    return {
      ok: true,
      message: `You step down from the Crescent Clipper at ${this.currentBase.label}.`,
    };
  }

  /** World point of the boarding door, used for the walk-up prompt. */
  getBoardingPoint(): Point2 {
    const base = this.currentBase;
    const localX = -1.8;
    const localZ = 2.0;
    const c = Math.cos(base.outboundYaw);
    const s = Math.sin(base.outboundYaw);
    return {
      x: base.parkingX + localX * c + localZ * s,
      z: base.parkingZ - localX * s + localZ * c,
    };
  }

  /** Rider's feet inside the cabin. */
  getSeatWorldPoint(): { x: number; y: number; z: number } {
    const localX = 0;
    const localZ = 2.4;
    const c = Math.cos(this.planeYaw);
    const s = Math.sin(this.planeYaw);
    return {
      x: this.planeX + localX * c + localZ * s,
      y: this.planeY + 1.9,
      z: this.planeZ - localX * s + localZ * c,
    };
  }

  getDisembarkPoint(): Point2 {
    const base = this.currentBase;
    return { x: base.disembarkX, z: base.disembarkZ };
  }

  getStatus(): AirShuttleStatus {
    return {
      phase: this.phase,
      direction: this.direction,
      origin: this.originId,
      destination: this.destinationId,
      label: this.label(),
      aboard: this.aboard,
      doorsOpen: this.doorOpen,
      engineOn: this.engineOn,
      routeProgress: this.routeProgress,
      elapsedMs: this.elapsedMs,
      remainingMs: this.remainingMs,
      durationMs: this.legDurationMs,
      express: this.express,
      expressAvailable: this.expressAvailable,
      expressSeconds: AIR_SHUTTLE_EXPRESS_SECONDS,
      planeX: this.planeX,
      planeY: this.planeY,
      planeZ: this.planeZ,
      planeYaw: this.planeYaw,
      planePitch: this.planePitch,
      planeRoll: this.planeRoll,
      altitudeM: this.altitudeM,
      speedMps: this.speedMps,
      canBoard: this.canBoard,
      canDisembark: this.canDisembark,
      boardingBase: this.originId,
    };
  }

  private label(): string {
    const destination = this.destination.label;
    switch (this.phase) {
      case 'idle':
        return `Crescent Clipper parked at ${this.currentBase.label}`;
      case 'doors_closing':
        return 'Gull-wing door lifting shut · engines coming online';
      case 'engine_start':
        return 'Twin turboprops turning over';
      case 'taxi_out':
        return 'Taxiing to the water runway';
      case 'takeoff':
        return `Taking off for ${destination}`;
      case 'airborne':
        return this.express
          ? `${formatAirShuttleCountdown(this.remainingMs)} to ${destination} · EXPRESS`
          : `${formatAirShuttleDuration(this.remainingMs)} to ${destination}`;
      case 'landing':
        return `Landing at ${this.destination.label}`;
      case 'taxi_in':
        return 'Taxiing in to the seaplane dock';
      case 'turnaround':
        return 'Turning around on the water';
      case 'parked':
        return `Parked at ${this.currentBase.label} · ready for the return flight`;
      default:
        return 'Crescent Clipper';
    }
  }

  update(dt: number): AirShuttleUpdate {
    const events: AirShuttleUpdate = {
      doorsClosed: false,
      engineStarted: false,
      tookOff: false,
      landed: false,
      arrived: false,
      yawDelta: 0,
    };
    this.previousYaw = this.planeYaw;
    const now = this.now();
    const elapsedMs =
      this.phaseStartedAtMs === null ? 0 : Math.max(0, now - this.phaseStartedAtMs);
    const startPhase = (phase: AirShuttlePhase): void => {
      this.phase = phase;
      this.phaseStartedAtMs = phase === 'airborne' || phase === 'parked' ? null : now;
    };

    switch (this.phase) {
      case 'idle':
      case 'parked': {
        this.doorOpen = 1;
        this.engineOn = false;
        this.speedMps = 0;
        // A gentle water bob keeps the parked aircraft from reading as a
        // frozen prop, even before the player steps aboard.
        this.planeY = this.currentBase.waterY + 0.1 + Math.sin(now / 900) * 0.025;
        this.planeRoll = Math.sin(now / 1700) * 0.005;
        break;
      }
      case 'doors_closing': {
        const t = Math.min(
          1,
          elapsedMs /
            (this.express
              ? EXPRESS_PHASE_MS.doorsClosing
              : AIR_SHUTTLE_DOOR_SECONDS * 1000),
        );
        this.doorOpen = 1 - smoothstep(t);
        this.speedMps = 0;
        if (t >= 1) {
          startPhase('engine_start');
          this.doorOpen = 0;
          events.doorsClosed = true;
        }
        break;
      }
      case 'engine_start': {
        this.doorOpen = 0;
        this.engineOn = true;
        this.speedMps = 0;
        if (
          elapsedMs >=
          (this.express
            ? EXPRESS_PHASE_MS.engineStart
            : AIR_SHUTTLE_ENGINE_START_SECONDS * 1000)
        ) {
          startPhase('taxi_out');
          events.engineStarted = true;
        }
        break;
      }
      case 'taxi_out': {
        const base = this.currentBase;
        const t = Math.min(
          1,
          elapsedMs /
            (this.express
              ? EXPRESS_PHASE_MS.taxiOut
              : AIR_SHUTTLE_TAXI_OUT_SECONDS * 1000),
        );
        this.planeX = lerp(base.parkingX, base.runwayStartX, t);
        this.planeZ = lerp(base.parkingZ, base.runwayStartZ, t);
        this.planeY = base.waterY + 0.1;
        this.planeYaw = base.outboundYaw;
        this.planePitch = 0;
        this.planeRoll = Math.sin(t * Math.PI * 6) * 0.012;
        this.speedMps = 11;
        if (t >= 1) {
          startPhase('takeoff');
        }
        break;
      }
      case 'takeoff': {
        const base = this.currentBase;
        const t = Math.min(
          1,
          elapsedMs /
            (this.express
              ? EXPRESS_PHASE_MS.takeoff
              : AIR_SHUTTLE_TAKEOFF_SECONDS * 1000),
        );
        const eased = t * t;
        this.planeX = lerp(base.runwayStartX, base.takeoffEndX, eased);
        this.planeZ = lerp(base.runwayStartZ, base.takeoffEndZ, eased);
        this.altitudeM = AIR_SHUTTLE_CRUISE_ALTITUDE_M * smoothstep(t);
        this.planeY = base.waterY + 0.1 + this.altitudeM;
        this.planeYaw = base.outboundYaw;
        this.planePitch = 0.11 * Math.sin(Math.min(1, t) * Math.PI);
        this.planeRoll = 0;
        this.speedMps = lerp(14, 120, t);
        if (t >= 1) {
          startPhase('airborne');
          this.departureAtMs = now;
          this.elapsedMs = 0;
          this.routeProgress = 0;
          events.tookOff = true;
        }
        break;
      }
      case 'airborne': {
        const route = this.routeFor(this.direction);
        const elapsed =
          this.departureAtMs === null
            ? this.elapsedMs + dt * 1000
            : Math.max(0, now - this.departureAtMs);
        const legMs = this.legDurationMs;
        this.elapsedMs = Math.min(legMs, elapsed);
        this.routeProgress = this.elapsedMs / legMs;
        const meters = route.length * this.routeProgress;
        const point = routePositionAt(route, meters);
        this.planeX = point.x;
        this.planeZ = point.z;
        const descentT = Math.max(
          0,
          (this.routeProgress - (1 - DESCENT_FRACTION)) / DESCENT_FRACTION,
        );
        this.altitudeM =
          AIR_SHUTTLE_CRUISE_ALTITUDE_M * (1 - smoothstep(descentT));
        const destination = this.destination;
        const waterLine = lerp(
          this.currentBase.waterY,
          destination.waterY,
          this.routeProgress,
        );
        this.planeY = waterLine + 0.1 + this.altitudeM;
        this.planeYaw = routeHeadingAt(route, meters);
        this.planePitch = -0.035 * smoothstep(descentT);
        const bankTurn = shortestAngleDelta(
          routeHeadingAt(route, Math.max(0, meters - 2000)),
          routeHeadingAt(route, Math.min(route.length, meters + 2000)),
        );
        const bankTarget = Math.max(-0.36, Math.min(0.36, -bankTurn * 2.4));
        this.planeRoll += (bankTarget - this.planeRoll) * 0.06;
        this.speedMps = route.length / (legMs / 1000);
        if (this.elapsedMs >= legMs) {
          startPhase('landing');
          this.planeX = destination.landingStartX;
          this.planeZ = destination.landingStartZ;
          this.planeY = destination.waterY + 0.1;
          this.planeYaw = normalizeAngle(destination.outboundYaw + Math.PI);
          this.altitudeM = 0;
          this.planePitch = 0;
          this.routeProgress = 1;
          events.landed = true;
        }
        break;
      }
      case 'landing': {
        const destination = this.destination;
        const t = Math.min(
          1,
          elapsedMs /
            (this.express
              ? EXPRESS_PHASE_MS.landing
              : AIR_SHUTTLE_LANDING_SECONDS * 1000),
        );
        const eased = 1 - (1 - t) * (1 - t);
        this.planeX = lerp(destination.landingStartX, destination.landingEndX, eased);
        this.planeZ = lerp(destination.landingStartZ, destination.landingEndZ, eased);
        this.planeY = destination.waterY + 0.1;
        this.planeYaw = normalizeAngle(destination.outboundYaw + Math.PI);
        this.planePitch = 0;
        this.planeRoll = 0;
        this.speedMps = lerp(95, 8, t);
        if (t >= 1) {
          startPhase('taxi_in');
        }
        break;
      }
      case 'taxi_in': {
        const destination = this.destination;
        const t = Math.min(
          1,
          elapsedMs /
            (this.express
              ? EXPRESS_PHASE_MS.taxiIn
              : AIR_SHUTTLE_TAXI_IN_SECONDS * 1000),
        );
        this.planeX = lerp(destination.landingEndX, destination.parkingX, t);
        this.planeZ = lerp(destination.landingEndZ, destination.parkingZ, t);
        this.planeY = destination.waterY + 0.1;
        this.planeYaw = normalizeAngle(destination.outboundYaw + Math.PI);
        this.planePitch = 0;
        this.planeRoll = 0;
        this.speedMps = 9;
        if (t >= 1) {
          startPhase('turnaround');
        }
        break;
      }
      case 'turnaround': {
        const destination = this.destination;
        const t = Math.min(
          1,
          elapsedMs /
            (this.express
              ? EXPRESS_PHASE_MS.turnaround
              : AIR_SHUTTLE_TURNAROUND_SECONDS * 1000),
        );
        const startYaw = normalizeAngle(destination.outboundYaw + Math.PI);
        const endYaw = destination.outboundYaw;
        this.planeYaw = normalizeAngle(
          startYaw + shortestAngleDelta(startYaw, endYaw) * smoothstep(t),
        );
        this.planeX = destination.parkingX;
        this.planeZ = destination.parkingZ;
        this.planeY = destination.waterY + 0.1;
        this.planePitch = 0;
        this.planeRoll = 0;
        this.speedMps = 0;
        this.doorOpen = t > 0.55 ? smoothstep((t - 0.55) / 0.45) : 0;
        this.engineOn = t < 0.82;
        if (t >= 1) {
          startPhase('parked');
          this.express = false;
          this.direction = opposite(this.direction);
          this.planeYaw = this.currentBase.outboundYaw;
          this.previousYaw = this.planeYaw;
          this.doorOpen = 1;
          this.engineOn = false;
          this.planeRoll = 0;
          events.arrived = true;
        }
        break;
      }
    }

    events.yawDelta = shortestAngleDelta(this.previousYaw, this.planeYaw);
    return events;
  }

  serialize(nowMs: number = this.now()): AirShuttleSaveState {
    const airborne = this.phase === 'airborne';
    const postFlight =
      this.phase === 'landing' || this.phase === 'taxi_in' || this.phase === 'turnaround';
    return {
      version: 1,
      direction: postFlight ? opposite(this.direction) : this.direction,
      phase: airborne ? 'airborne' : 'parked',
      departureAtMs: airborne ? this.departureAtMs : null,
      savedAtMs: nowMs,
      elapsedMs: airborne ? this.elapsedMs : 0,
      aboard: this.aboard,
      express: this.express,
    };
  }

  /**
   * Resumes a flight from storage. A trip that completed while the app was
   * closed comes back parked at the destination, ready for the return leg.
   */
  restore(
    save: AirShuttleSaveState,
    nowMs: number = this.now(),
  ): AirShuttleRestoreResult {
    this.reset();
    const direction: AirShuttleDirection =
      save.direction === 'return' ? 'return' : 'outbound';

    if (
      save.phase === 'airborne' &&
      typeof save.departureAtMs === 'number' &&
      Number.isFinite(save.departureAtMs)
    ) {
      const express = Boolean(save.express);
      const legMs = express
        ? AIR_SHUTTLE_EXPRESS_AIRBORNE_SECONDS * 1000
        : AIR_SHUTTLE_LEG_MS;
      const elapsed = Math.max(
        0,
        Math.min(legMs, nowMs - save.departureAtMs),
      );
      if (elapsed >= legMs) {
        this.direction = opposite(direction);
        this.aboard = false;
        this.setParkedPose(this.direction);
        this.phase = 'idle';
        this.doorOpen = 1;
        this.engineOn = false;
        return { completed: true, wasAboard: Boolean(save.aboard) };
      }

      this.direction = direction;
      this.aboard = Boolean(save.aboard);
      this.express = express;
      this.phase = 'airborne';
      this.departureAtMs = save.departureAtMs;
      this.elapsedMs = elapsed;
      this.routeProgress = elapsed / legMs;
      const route = this.routeFor(direction);
      const point = routePositionAt(route, route.length * this.routeProgress);
      this.planeX = point.x;
      this.planeZ = point.z;
      const descentT = Math.max(
        0,
        (this.routeProgress - (1 - DESCENT_FRACTION)) / DESCENT_FRACTION,
      );
      this.altitudeM = AIR_SHUTTLE_CRUISE_ALTITUDE_M * (1 - smoothstep(descentT));
      this.planeY =
        lerp(this.currentBase.waterY, this.destination.waterY, this.routeProgress) +
        0.1 +
        this.altitudeM;
      this.planeYaw = routeHeadingAt(route, route.length * this.routeProgress);
      this.previousYaw = this.planeYaw;
      this.planePitch = -0.035 * smoothstep(descentT);
      this.speedMps = route.length / (legMs / 1000);
      this.doorOpen = 0;
      this.engineOn = true;
      return { completed: false, wasAboard: Boolean(save.aboard) };
    }

    this.direction = direction;
    this.aboard = false;
    this.setParkedPose(direction);
    this.phase = 'idle';
    this.doorOpen = 1;
    this.engineOn = false;
    return { completed: Boolean(save.aboard), wasAboard: Boolean(save.aboard) };
  }
}
