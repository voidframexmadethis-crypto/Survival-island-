import { FERRY_DOCK_BOAT_POS } from './ferryPickup';
import {
  IslandFerryController,
  type FerryEntity,
} from './islandFerryController';

/**
 * Passenger ferry voyage between the island landing and Crescent City.
 *
 * This is deliberately separate from `FerryPickupSystem`: that system is the
 * worker/car escort to the pier. This one owns the walkable boat, the dock TV
 * that clears boarding, and the official forty-eight-real-hour crossing in
 * each direction.
 *
 * The crossing is a real open-ocean passage, not a slowly interpolated 700 m
 * hop. The hull follows a Grand Gulf loop of roughly 864 km at a passenger-ship
 * cruise of about 5 m/s (9.7 knots), which is what makes the rendered Three.js
 * hull visibly sail instead of looking bolted to the pier.
 */

/** Official duration of one leg in real (wall-clock) hours. */
export const LOUISIANA_FERRY_LEG_HOURS = 48;
export const LOUISIANA_FERRY_LEG_MS = LOUISIANA_FERRY_LEG_HOURS * 60 * 60 * 1000;
export const LOUISIANA_FERRY_ROUND_TRIP_HOURS = LOUISIANA_FERRY_LEG_HOURS * 2;
export const LOUISIANA_FERRY_ROUND_TRIP_MS = LOUISIANA_FERRY_LEG_MS * 2;
export const LOUISIANA_FERRY_LEG_SECONDS = LOUISIANA_FERRY_LEG_MS / 1000;

/** Passenger-ship cruise target used to size the ocean passage. */
export const LOUISIANA_FERRY_TARGET_SPEED_MPS = 5;
export const LOUISIANA_FERRY_TARGET_ROUTE_METERS = 864_000;
/**
 * Short, smooth run-up to cruise. A four-minute ramp left the hull looking
 * nearly stationary for the first minute of the crossing; half a minute gets
 * the ship visibly underway out of the berth while staying gentle.
 */
export const LOUISIANA_FERRY_ACCEL_SECONDS = 30;
export const LOUISIANA_FERRY_DECEL_SECONDS = 600;

export const LOUISIANA_FERRY_DEPART_DELAY = 3.5;
export const LOUISIANA_FERRY_GATE_LIFT_SECONDS = 1.25;
export const LOUISIANA_FERRY_GATE_LIFT_HEIGHT = 2.65;
/** Includes the slow pivot at the berth before the gate is declared open. */
export const LOUISIANA_FERRY_ARRIVAL_SECONDS = 6;
export const LOUISIANA_FERRY_DOCK_POS = {
  x: FERRY_DOCK_BOAT_POS.x,
  z: 713,
} as const;
/** Crescent City berth. The hull waits here between the outbound and return legs. */
export const LOUISIANA_FERRY_CITY_DOCK_POS = { x: 40, z: 1428 } as const;

/**
 * Direct shuttle profile used by the live game. The old 864 km / 48-hour loop
 * remains available for its tests, but the playable Crescent Star now runs the
 * real island-to-mainland crossing in the locked 1/60 step at a visible speed.
 */
export const LOUISIANA_FERRY_DIRECT_SPEED_MPS = 7;
export const LOUISIANA_FERRY_DIRECT_ROUTE_METERS = Math.hypot(
  LOUISIANA_FERRY_CITY_DOCK_POS.x - LOUISIANA_FERRY_DOCK_POS.x,
  LOUISIANA_FERRY_CITY_DOCK_POS.z - LOUISIANA_FERRY_DOCK_POS.z,
);
export const LOUISIANA_FERRY_DIRECT_DURATION_MS =
  (LOUISIANA_FERRY_DIRECT_ROUTE_METERS / LOUISIANA_FERRY_DIRECT_SPEED_MPS) * 1000;

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
export type LouisianaFerryEngineState = 'off' | 'starting' | 'running' | 'starved';

export interface LouisianaFerryStatus {
  phase: LouisianaFerryPhase;
  direction: LouisianaFerryDirection;
  destination: LouisianaFerryDock;
  boardingCleared: boolean;
  aboard: boolean;
  gateLift: number;
  secondsToDeparture: number;
  routeProgress: number;
  routeDistanceMeters: number;
  routeLengthMeters: number;
  elapsedMs: number;
  remainingMs: number;
  durationMs: number;
  boatX: number;
  boatY: number;
  boatZ: number;
  boatYaw: number;
  boatRoll: number;
  speedMps: number;
  speedKnots: number;
  fuelLiters: number;
  fuelCapacityLiters: number;
  fuelPercent: number;
  engineState: LouisianaFerryEngineState;
  engineRunning: boolean;
  lowFuel: boolean;
  fuelStarved: boolean;
  canDepart: boolean;
  minimumDepartFuelLiters: number;
  reserveLiters: number;
  reserveUsed: boolean;
  biofuelLiters: number;
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
  reserveEngaged: boolean;
}

/** Everything needed to resume a crossing after the app was closed. */
export interface LouisianaFerrySaveState {
  version: 2 | 3 | 4;
  direction: LouisianaFerryDirection;
  phase: LouisianaFerryPhase;
  destination: LouisianaFerryDock;
  departureAtMs: number | null;
  savedAtMs: number;
  elapsedMs: number;
  routeProgress: number;
  /** Metres sailed on this leg; the authoritative resume position. */
  routeDistanceMeters: number;
  aboard: boolean;
  carId: string | null;
  /** Rider's spot on the hull, so a resumed voyage puts them back on deck. */
  playerLocalX: number;
  playerLocalZ: number;
  /** Fuel and engine state (v4; older saves resume with a full tank). */
  fuelLiters?: number;
  engineState?: LouisianaFerryEngineState;
  reserveUsed?: boolean;
}

export interface FerryPoint {
  x: number;
  z: number;
}

/* ------------------------------------------------------------------------- *
 * The Grand Gulf passage
 *
 * The island and Crescent City are only ~700 m apart on the world map, so a
 * 48-hour crossing cannot be a straight line between their berths. The
 * Crescent Star instead leaves the island landing, runs east through the
 * strait, and follows a roughly 864 km loop far out into the Gulf before
 * curving back through the strait to the Crescent City berth. The visible
 * hull covers every metre of that course; the ocean follows it.
 * ------------------------------------------------------------------------- */

interface RouteSample {
  x: number;
  z: number;
  distance: number;
}

const ROUTE_SAMPLE_SPACING = 20;
const ROUTE_SOLVE_ITERATIONS = 12;

const HARBOR_OUT: readonly FerryPoint[] = [
  { x: LOUISIANA_FERRY_DOCK_POS.x, z: LOUISIANA_FERRY_DOCK_POS.z },
  { x: 27, z: 770 },
  { x: 42, z: 842 },
  { x: 52, z: 940 },
  { x: 60, z: 1000 },
  { x: 140, z: 1000 },
  { x: 420, z: 1080 },
  { x: 900, z: 1200 },
  { x: 1700, z: 1450 },
  { x: 2600, z: 1850 },
];

const HARBOR_IN: readonly FerryPoint[] = [
  { x: -12000, z: 2200 },
  { x: -3000, z: 1550 },
  { x: 300, z: 1050 },
  { x: 900, z: 820 },
  { x: 420, z: 770 },
  { x: 140, z: 830 },
  { x: 58, z: 950 },
  { x: 40, z: 1080 },
  { x: 40, z: 1250 },
  { x: LOUISIANA_FERRY_CITY_DOCK_POS.x, z: LOUISIANA_FERRY_CITY_DOCK_POS.z },
];

const LOOP_CENTER = { x: 2600, z: 1850 } as const;
const LOOP_ARC = Math.PI * 2 * (350 / 360);
const LOOP_STEPS = 72;

function lerpPoint(a: FerryPoint, b: FerryPoint, t: number): FerryPoint {
  return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
}

/**
 * Centripetal Catmull-Rom: unlike the uniform variant it will not loop or
 * overshoot where the harbour waypoints are packed close together and the
 * offshore waypoints are kilometres apart.
 */
function catmullRom(
  p0: FerryPoint,
  p1: FerryPoint,
  p2: FerryPoint,
  p3: FerryPoint,
  t: number,
): FerryPoint {
  const alpha = 0.5;
  const d01 = Math.max(1e-4, Math.hypot(p1.x - p0.x, p1.z - p0.z) ** alpha);
  const d12 = Math.max(1e-4, Math.hypot(p2.x - p1.x, p2.z - p1.z) ** alpha);
  const d23 = Math.max(1e-4, Math.hypot(p3.x - p2.x, p3.z - p2.z) ** alpha);

  const t0 = 0;
  const t1 = t0 + d01;
  const t2 = t1 + d12;
  const t3 = t2 + d23;
  const tt = t1 + (t2 - t1) * t;

  const a1 = lerpPoint(p0, p1, (tt - t0) / (t1 - t0));
  const a2 = lerpPoint(p1, p2, (tt - t1) / (t2 - t1));
  const a3 = lerpPoint(p2, p3, (tt - t2) / (t3 - t2));

  const b1 = lerpPoint(a1, a2, (tt - t0) / (t2 - t0));
  const b2 = lerpPoint(a2, a3, (tt - t1) / (t3 - t1));

  return lerpPoint(b1, b2, (tt - t1) / (t2 - t1));
}

/** A large, gently wandering offshore loop that starts and ends near the isle. */
function seaLoopWaypoints(radius: number): FerryPoint[] {
  const points: FerryPoint[] = [];
  const start = -Math.PI / 2;
  for (let i = 0; i <= LOOP_STEPS; i++) {
    const f = i / LOOP_STEPS;
    const angle = start + LOOP_ARC * f;
    // Taper the wobble to zero at the seam so the harbour legs join cleanly.
    const taper = Math.sin(Math.PI * f);
    const wobble =
      1 +
      (0.0045 * Math.sin(angle * 3 + 0.6) + 0.002 * Math.sin(angle * 7 - 1.1)) *
        taper;
    points.push({
      x: LOOP_CENTER.x + Math.cos(angle) * radius * wobble,
      z: LOOP_CENTER.z + radius + Math.sin(angle) * radius * wobble,
    });
  }
  return points;
}

function ferryWaypoints(loopRadius: number): FerryPoint[] {
  // The loop's first point is exactly the mouth waypoint, so drop that
  // duplicate before building the spline.
  return [...HARBOR_OUT, ...seaLoopWaypoints(loopRadius).slice(1), ...HARBOR_IN];
}

function buildRouteSamples(waypoints: readonly FerryPoint[]): RouteSample[] {
  const samples: RouteSample[] = [];
  const count = waypoints.length;
  let distance = 0;
  let previous = waypoints[0];
  samples.push({ x: previous.x, z: previous.z, distance: 0 });

  const pushPoint = (point: FerryPoint): void => {
    const step = Math.hypot(point.x - previous.x, point.z - previous.z);
    if (step < 1e-4) return;
    distance += step;
    samples.push({ x: point.x, z: point.z, distance });
    previous = point;
  };

  for (let i = 0; i < count - 1; i++) {
    const p0 = waypoints[Math.max(0, i - 1)];
    const p1 = waypoints[i];
    const p2 = waypoints[i + 1];
    const p3 = waypoints[Math.min(count - 1, i + 2)];
    const span = Math.hypot(p2.x - p1.x, p2.z - p1.z);
    // ~half the target sample spacing so the chord/arc error stays negligible.
    const steps = Math.max(2, Math.ceil(span / (ROUTE_SAMPLE_SPACING * 0.5)));
    for (let s = 0; s < steps; s++) {
      pushPoint(catmullRom(p0, p1, p2, p3, s / steps));
    }
  }
  pushPoint(waypoints[count - 1]);
  return samples;
}

function measureRouteLength(loopRadius: number): number {
  const samples = buildRouteSamples(ferryWaypoints(loopRadius));
  return samples[samples.length - 1].distance;
}

/** Sizes the offshore loop so one leg is as close to 864 km as the spline allows. */
function solveLoopRadius(): number {
  let radius = 136_000;
  for (let i = 0; i < ROUTE_SOLVE_ITERATIONS; i++) {
    const length = measureRouteLength(radius);
    if (!Number.isFinite(length) || length <= 0) break;
    const next = radius * (LOUISIANA_FERRY_TARGET_ROUTE_METERS / length);
    if (!Number.isFinite(next) || next <= 0) break;
    if (Math.abs(next - radius) < 1) {
      radius = next;
      break;
    }
    radius = next;
  }
  return radius;
}

const FERRY_ROUTE_SAMPLES = buildRouteSamples(ferryWaypoints(solveLoopRadius()));

/** True length of the sailed course in metres (≈864 km). */
export const LOUISIANA_FERRY_ROUTE_METERS =
  FERRY_ROUTE_SAMPLES[FERRY_ROUTE_SAMPLES.length - 1].distance;

/** Crescent Star fuel system. One 48-hour leg burns 90 L of a 200 L tank. */
export const LOUISIANA_FERRY_FUEL_CAPACITY_LITERS = 200;
export const LOUISIANA_FERRY_FUEL_PER_LEG_LITERS = 90;
export const LOUISIANA_FERRY_FUEL_PER_METER =
  LOUISIANA_FERRY_FUEL_PER_LEG_LITERS / LOUISIANA_FERRY_ROUTE_METERS;
export const LOUISIANA_FERRY_MIN_DEPART_FUEL_LITERS = 90;
export const LOUISIANA_FERRY_LOW_FUEL_LITERS = 50;
/** Emergency reserve: enough to limp through one full leg and never strand. */
export const LOUISIANA_FERRY_RESERVE_LITERS = 100;
export const LOUISIANA_FERRY_BIOFUEL_LITERS = 25;
export const LOUISIANA_FERRY_BIOFUEL_COCONUTS = 3;
/** Seawater hauled up from the dock and tipped into the tank in one bucket. */
export const LOUISIANA_FERRY_OCEAN_BUCKET_LITERS = 25;

/** Biofuel one fresh coconut yields when dropped straight into the tank. */
export const LOUISIANA_FERRY_LITERS_PER_COCONUT =
  LOUISIANA_FERRY_BIOFUEL_LITERS / LOUISIANA_FERRY_BIOFUEL_COCONUTS;

/** Fuel produced by dropping `count` whole coconuts into the tank. */
export function ferryBiofuelFromCoconuts(count: number): number {
  if (!Number.isFinite(count) || count <= 0) return 0;
  return Math.floor(count) * LOUISIANA_FERRY_LITERS_PER_COCONUT;
}

/** Coconuts needed to produce `liters`, rounded up to whole nuts. */
export function ferryCoconutsForLiters(liters: number): number {
  if (!Number.isFinite(liters) || liters <= 0) return 0;
  return Math.ceil(liters / LOUISIANA_FERRY_LITERS_PER_COCONUT);
}
export const LOUISIANA_FERRY_ENGINE_START_MS = 2500;

/**
 * Speed needed to cover the whole course inside the official 48 hours while
 * spending `ACCEL_SECONDS` getting underway and `DECEL_SECONDS` slowing for the
 * berth. It lands within a few hundredths of the 5 m/s target.
 */
export const LOUISIANA_FERRY_CRUISE_MPS =
  LOUISIANA_FERRY_ROUTE_METERS /
  (LOUISIANA_FERRY_LEG_SECONDS -
    LOUISIANA_FERRY_ACCEL_SECONDS / 2 -
    LOUISIANA_FERRY_DECEL_SECONDS / 2);

export function ferryRouteDistance(): number {
  return LOUISIANA_FERRY_ROUTE_METERS;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** Position at an absolute distance (metres) along the outbound course. */
export function ferryRoutePositionAt(distance: number): FerryPoint {
  const target = Math.max(0, Math.min(LOUISIANA_FERRY_ROUTE_METERS, distance));
  const samples = FERRY_ROUTE_SAMPLES;
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
  return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
}

/** Direction of travel along the outbound course (bow +Z convention). */
export function ferryRouteHeadingAt(distance: number): number {
  const target = Math.max(0, Math.min(LOUISIANA_FERRY_ROUTE_METERS, distance));
  const behind = ferryRoutePositionAt(Math.max(0, target - 2));
  const ahead = ferryRoutePositionAt(Math.min(LOUISIANA_FERRY_ROUTE_METERS, target + 2));
  const dx = ahead.x - behind.x;
  const dz = ahead.z - behind.z;
  if (Math.hypot(dx, dz) < 1e-9) return 0;
  return Math.atan2(dx, dz);
}

/** Distance sailed on a leg for wall-clock milliseconds since departure. */
export function ferryDistanceForElapsed(elapsedMs: number): number {
  const seconds = Math.max(0, Math.min(LOUISIANA_FERRY_LEG_SECONDS, elapsedMs / 1000));
  const cruise = LOUISIANA_FERRY_CRUISE_MPS;
  const accel = LOUISIANA_FERRY_ACCEL_SECONDS;
  const decel = LOUISIANA_FERRY_DECEL_SECONDS;
  if (seconds <= 0) return 0;
  if (seconds >= LOUISIANA_FERRY_LEG_SECONDS) return LOUISIANA_FERRY_ROUTE_METERS;
  if (seconds < accel) {
    return (0.5 * cruise * seconds * seconds) / accel;
  }
  const cruiseEnd = LOUISIANA_FERRY_LEG_SECONDS - decel;
  if (seconds <= cruiseEnd) {
    return 0.5 * cruise * accel + cruise * (seconds - accel);
  }
  const remaining = LOUISIANA_FERRY_LEG_SECONDS - seconds;
  return LOUISIANA_FERRY_ROUTE_METERS - (0.5 * cruise * remaining * remaining) / decel;
}

/** Inverse of ferryDistanceForElapsed, used when fuel freezes the leg. */
export function ferryElapsedForDistance(distance: number): number {
  const target = Math.max(0, Math.min(LOUISIANA_FERRY_ROUTE_METERS, distance));
  if (target <= 0) return 0;
  if (target >= LOUISIANA_FERRY_ROUTE_METERS) return LOUISIANA_FERRY_LEG_MS;
  let low = 0;
  let high = LOUISIANA_FERRY_LEG_MS;
  for (let i = 0; i < 34; i++) {
    const mid = (low + high) / 2;
    if (ferryDistanceForElapsed(mid) < target) low = mid;
    else high = mid;
  }
  return high;
}

/** Instantaneous speed for wall-clock milliseconds since departure. */
export function ferrySpeedForElapsed(elapsedMs: number): number {
  const seconds = Math.max(0, Math.min(LOUISIANA_FERRY_LEG_SECONDS, elapsedMs / 1000));
  const cruise = LOUISIANA_FERRY_CRUISE_MPS;
  if (seconds <= 0 || seconds >= LOUISIANA_FERRY_LEG_SECONDS) return 0;
  if (seconds < LOUISIANA_FERRY_ACCEL_SECONDS) {
    return (cruise * seconds) / LOUISIANA_FERRY_ACCEL_SECONDS;
  }
  const cruiseEnd = LOUISIANA_FERRY_LEG_SECONDS - LOUISIANA_FERRY_DECEL_SECONDS;
  if (seconds <= cruiseEnd) return cruise;
  return (cruise * (LOUISIANA_FERRY_LEG_SECONDS - seconds)) / LOUISIANA_FERRY_DECEL_SECONDS;
}

/** Leg progress 0..1 -> absolute route distance, honouring the sailing direction. */
export function ferryRouteDistanceForLeg(
  progress: number,
  direction: LouisianaFerryDirection,
): number {
  const p = clamp01(progress);
  return direction === 'outbound'
    ? p * LOUISIANA_FERRY_ROUTE_METERS
    : (1 - p) * LOUISIANA_FERRY_ROUTE_METERS;
}

/** Position on the course for a leg progress (0 leaves the tier, 1 docks). */
export function sampleFerryRoute(progress: number): FerryPoint {
  return ferryRoutePositionAt(clamp01(progress) * LOUISIANA_FERRY_ROUTE_METERS);
}

/** Position 0..1 along the leg for a direction (`return` runs the course back). */
export function ferryPointForDirection(
  progress: number,
  direction: LouisianaFerryDirection,
): FerryPoint {
  return ferryRoutePositionAt(ferryRouteDistanceForLeg(progress, direction));
}

/** Course heading at a leg progress. */
export function ferryRouteHeading(progress: number): number {
  return ferryRouteHeadingAt(clamp01(progress) * LOUISIANA_FERRY_ROUTE_METERS);
}

/** Heading the hull should hold while travelling a leg. */
export function ferryHeadingForDirection(
  progress: number,
  direction: LouisianaFerryDirection,
): number {
  const distance = ferryRouteDistanceForLeg(progress, direction);
  const base = ferryRouteHeadingAt(distance);
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

function normalizeAngle(angle: number): number {
  let value = angle;
  while (value > Math.PI) value -= Math.PI * 2;
  while (value < -Math.PI) value += Math.PI * 2;
  return value;
}

export class LouisianaFerryVoyageSystem {
  phase: LouisianaFerryPhase = 'idle';
  direction: LouisianaFerryDirection = 'outbound';
  boardingCleared = false;
  aboard = false;
  routeProgress = 0;
  routeDistanceMeters = 0;
  elapsedMs = 0;
  gateLift = 0;
  speedMps = 0;
  boatX: number = LOUISIANA_FERRY_DOCK_POS.x;
  boatZ: number = LOUISIANA_FERRY_DOCK_POS.z;
  boatY: number = FERRY_ROOT_Y;
  boatYaw = 0;
  boatRoll = 0;
  departureAtMs: number | null = null;
  /** Fuel/engine state persists with the voyage. */
  fuelLiters = LOUISIANA_FERRY_FUEL_CAPACITY_LITERS;
  engineState: LouisianaFerryEngineState = 'off';
  reserveUsed = false;
  private engineStartupAtMs: number | null = null;
  private departTimer = 0;
  private arrivalTimer = 0;
  private bobTime = 0;

  /** Direct fixed-step crossing used by the playable game. */
  private directMode = false;
  private readonly directController = new IslandFerryController(
    { x: LOUISIANA_FERRY_DOCK_POS.x, y: FERRY_ROOT_Y, z: LOUISIANA_FERRY_DOCK_POS.z },
    { x: LOUISIANA_FERRY_CITY_DOCK_POS.x, y: FERRY_ROOT_Y, z: LOUISIANA_FERRY_CITY_DOCK_POS.z },
  );
  private readonly directEntity: FerryEntity = {
    id: 'crescent-star',
    position: { x: LOUISIANA_FERRY_DOCK_POS.x, y: FERRY_ROOT_Y, z: LOUISIANA_FERRY_DOCK_POS.z },
    yaw: 0,
    speed: LOUISIANA_FERRY_DIRECT_SPEED_MPS,
    isMoving: false,
    headingToMainland: true,
  };
  private readonly updateScratch: LouisianaFerryUpdate = {
    phaseChanged: false,
    boarded: false,
    gateOpened: false,
    departed: false,
    arrived: false,
    carryX: 0,
    carryZ: 0,
    reserveEngaged: false,
  };

  constructor(private readonly now: () => number = () => Date.now()) {}

  /** Switch the live hull to the direct, allocation-free fixed-step crossing. */
  enableDirectCrossing(): void {
    this.directMode = true;
    this.directEntity.speed = LOUISIANA_FERRY_DIRECT_SPEED_MPS;
  }

  isDirectCrossing(): boolean {
    return this.directMode;
  }

  get fuelPercent(): number {
    return (this.fuelLiters / LOUISIANA_FERRY_FUEL_CAPACITY_LITERS) * 100;
  }

  get lowFuel(): boolean {
    return this.fuelLiters <= LOUISIANA_FERRY_LOW_FUEL_LITERS;
  }

  /** Boarding is allowed if the tank or the emergency reserve can cover a leg. */
  get canDepart(): boolean {
    return (
      this.fuelLiters + (this.reserveUsed ? 0 : LOUISIANA_FERRY_RESERVE_LITERS) >=
      LOUISIANA_FERRY_MIN_DEPART_FUEL_LITERS
    );
  }

  /** Adds biofuel; returns litres actually accepted. */
  addFuel(liters: number): number {
    if (!Number.isFinite(liters) || liters <= 0) return 0;
    const before = this.fuelLiters;
    this.fuelLiters = Math.min(
      LOUISIANA_FERRY_FUEL_CAPACITY_LITERS,
      this.fuelLiters + liters,
    );
    return this.fuelLiters - before;
  }

  /** Drains the one-shot emergency reserve. Rebuilt whenever the hull docks. */
  drawReserve(): boolean {
    if (this.reserveUsed) return false;
    this.addFuel(LOUISIANA_FERRY_RESERVE_LITERS);
    this.reserveUsed = true;
    return true;
  }

  /** Boarding only needs one full leg; the reserve is drawn automatically. */
  private ensureDepartureFuel(): boolean {
    if (this.fuelLiters >= LOUISIANA_FERRY_MIN_DEPART_FUEL_LITERS) return true;
    if (!this.reserveUsed) this.drawReserve();
    return this.fuelLiters >= LOUISIANA_FERRY_MIN_DEPART_FUEL_LITERS;
  }

  /** Turns the ignition: starter whine for 2.5 s, then the engines run. */
  startEngine(): FerryUpdateResult {
    if (this.fuelLiters <= 0) {
      return {
        ok: false,
        message: 'The Crescent Star is out of fuel. Refill with coconut biofuel or draw the reserve tank.',
      };
    }
    if (this.engineState === 'running' || this.engineState === 'starting') {
      return {
        ok: true,
        message:
          this.engineState === 'running'
            ? 'The Crescent Star engines are already running.'
            : 'The Crescent Star engines are turning over.',
      };
    }
    if (this.phase === 'at_sea' || this.phase === 'departing') {
      this.departureAtMs = this.now() - this.elapsedMs;
    }
    this.engineState = 'starting';
    this.engineStartupAtMs = this.now();
    return {
      ok: true,
      message: 'The Crescent Star ignition catches. Engines starting.',
    };
  }

  /** Stops the engines. Under way this freezes the voyage and the fuel burn. */
  shutdownEngine(): FerryUpdateResult {
    if (this.engineState === 'off' || this.engineState === 'starved') {
      return { ok: true, message: 'The Crescent Star engines are already stopped.' };
    }
    if (this.phase === 'at_sea' || this.phase === 'departing') {
      this.elapsedMs = this.currentElapsedMs();
      this.departureAtMs = this.now() - this.elapsedMs;
    }
    this.engineState = 'off';
    this.engineStartupAtMs = null;
    this.speedMps = 0;
    return { ok: true, message: 'The Crescent Star engines shut down.' };
  }

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
    this.routeDistanceMeters = 0;
    this.elapsedMs = 0;
    this.departTimer = 0;
    this.arrivalTimer = 0;
    this.bobTime = 0;
    this.gateLift = 0;
    this.speedMps = 0;
    this.departureAtMs = null;
    this.fuelLiters = LOUISIANA_FERRY_FUEL_CAPACITY_LITERS;
    this.engineState = 'off';
    this.engineStartupAtMs = null;
    this.reserveUsed = false;
    const start = ferryRoutePositionAt(0);
    this.boatX = start.x;
    this.boatZ = start.z;
    this.boatY = FERRY_ROOT_Y;
    this.boatYaw = ferryOriginHeading('outbound');
    this.boatRoll = 0;
    if (this.directMode) {
      this.directEntity.headingToMainland = true;
      this.directEntity.isMoving = false;
      this.directEntity.position.x = LOUISIANA_FERRY_DOCK_POS.x;
      this.directEntity.position.y = FERRY_ROOT_Y;
      this.directEntity.position.z = LOUISIANA_FERRY_DOCK_POS.z;
      this.directEntity.yaw = ferryOriginHeading('outbound');
      this.boatX = this.directEntity.position.x;
      this.boatZ = this.directEntity.position.z;
    }
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
    this.routeDistanceMeters = 0;
    this.elapsedMs = 0;
    this.departTimer = 0;
    this.arrivalTimer = 0;
    this.gateLift = 0;
    this.speedMps = 0;
    this.departureAtMs = null;
    // The tank carries over; the emergency reserve is rebuilt at the berth.
    this.engineState = 'off';
    this.engineStartupAtMs = null;
    this.reserveUsed = false;
    const point = ferryPointForDirection(0, 'return');
    this.boatX = point.x;
    this.boatZ = point.z;
    this.boatY = FERRY_ROOT_Y;
    this.boatYaw = ferryOriginHeading('return');
    this.boatRoll = 0;
    if (this.directMode) {
      this.directEntity.headingToMainland = false;
      this.directEntity.isMoving = false;
      this.directEntity.position.x = LOUISIANA_FERRY_CITY_DOCK_POS.x;
      this.directEntity.position.y = FERRY_ROOT_Y;
      this.directEntity.position.z = LOUISIANA_FERRY_CITY_DOCK_POS.z;
      this.directEntity.yaw = ferryOriginHeading('return');
      this.boatX = this.directEntity.position.x;
      this.boatZ = this.directEntity.position.z;
    }
  }

  clearBoarding(): boolean {
    if (this.phase !== 'idle') return false;
    this.phase = 'boarding';
    this.boardingCleared = true;
    return true;
  }

  getStatus(): LouisianaFerryStatus {
    const durationMs = this.directMode
      ? LOUISIANA_FERRY_DIRECT_DURATION_MS
      : LOUISIANA_FERRY_LEG_MS;
    const elapsedMs = this.currentElapsedMs();
    const remainingMs = Math.max(0, durationMs - elapsedMs);
    return {
      phase: this.phase,
      direction: this.direction,
      destination: this.destination,
      boardingCleared: this.boardingCleared,
      aboard: this.aboard,
      gateLift: this.gateLift,
      secondsToDeparture: this.departTimer,
      routeProgress: this.routeProgress,
      routeDistanceMeters: this.routeDistanceMeters,
      routeLengthMeters: this.directMode
        ? LOUISIANA_FERRY_DIRECT_ROUTE_METERS
        : LOUISIANA_FERRY_ROUTE_METERS,
      elapsedMs,
      remainingMs,
      durationMs,
      boatX: this.boatX,
      boatY: this.boatY,
      boatZ: this.boatZ,
      boatYaw: this.boatYaw,
      boatRoll: this.boatRoll,
      speedMps: this.speedMps,
      speedKnots: this.speedMps * 1.943844,
      fuelLiters: this.fuelLiters,
      fuelCapacityLiters: LOUISIANA_FERRY_FUEL_CAPACITY_LITERS,
      fuelPercent: this.fuelPercent,
      engineState: this.engineState,
      engineRunning:
        this.engineState === 'starting' || this.engineState === 'running',
      lowFuel: this.lowFuel,
      fuelStarved: this.engineState === 'starved' || this.fuelLiters <= 0,
      canDepart: this.canDepart,
      minimumDepartFuelLiters: LOUISIANA_FERRY_MIN_DEPART_FUEL_LITERS,
      reserveLiters: LOUISIANA_FERRY_RESERVE_LITERS,
      reserveUsed: this.reserveUsed,
      biofuelLiters: LOUISIANA_FERRY_BIOFUEL_LITERS,
      room: this.roomAtWorld(this.boatX, this.boatZ),
      label: this.label(elapsedMs, remainingMs),
    };
  }

  /** Wall-clock time already spent on the current at-sea leg. */
  currentElapsedMs(): number {
    if (this.directMode) return this.elapsedMs;
    if (this.engineState !== 'starting' && this.engineState !== 'running') {
      return this.elapsedMs;
    }
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
    if (!this.ensureDepartureFuel()) {
      return {
        ok: false,
        message: `The Crescent Star cannot sail on ${this.fuelLiters.toFixed(0)} L of ${LOUISIANA_FERRY_FUEL_CAPACITY_LITERS} L. Craft coconut biofuel or use the dock reserve.`,
      };
    }
    this.aboard = true;
    // The gate is already up from the ramp; cast off on this frame. The old
    // gate-lift + countdown ran on simulation dt, which could leave the hull
    // frozen at the dock for many real seconds on a slow phone while the
    // voyage clock appeared to run.
    this.phase = 'departing';
    this.gateLift = 1;
    this.departTimer = 0;
    this.departureAtMs = this.now();
    // Fueling/boarding starts the engines automatically; the hull is under way
    // on the 48-hour wall clock without waiting for a simulation frame budget.
    this.startEngine();
    if (this.directMode) {
      this.directEntity.headingToMainland = this.direction === 'outbound';
      this.directEntity.isMoving = true;
      this.directEntity.position.x = this.boatX;
      this.directEntity.position.y = this.boatY;
      this.directEntity.position.z = this.boatZ;
      this.directEntity.yaw = this.boatYaw;
    }
    return {
      ok: true,
      message: this.direction === 'outbound'
        ? 'You step aboard the Crescent Star. The stern gate is open and the lines are cast off.'
        : 'You step aboard for the return crossing. The stern gate is open and the lines are cast off.',
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
        // Step straight from the deck into the crossing. The gate is open and
        // the wall clock below is the only thing that gates the movement.
        this.phase = 'departing';
        this.gateLift = 1;
        this.departTimer = 0;
        this.departureAtMs = this.now();
        this.startEngine();
        if (this.directMode) {
          this.directEntity.headingToMainland = this.direction === 'outbound';
          this.directEntity.isMoving = true;
          this.directEntity.position.x = this.boatX;
          this.directEntity.position.y = this.boatY;
          this.directEntity.position.z = this.boatZ;
          this.directEntity.yaw = this.boatYaw;
        }
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
        this.routeDistanceMeters = 0;
        out.phaseChanged = true;
        out.departed = true;
      }
      return out;
    }

    if (this.phase === 'at_sea') {
      if (this.directMode) {
        this.bobTime += dt;
        this.elapsedMs = Math.min(
          LOUISIANA_FERRY_DIRECT_DURATION_MS,
          this.elapsedMs + dt * 1000,
        );
        const startX = this.boatX;
        const startZ = this.boatZ;
        const arrived = this.directController.stepFixed(this.directEntity, null, dt);
        this.boatX = this.directEntity.position.x;
        this.boatZ = this.directEntity.position.z;
        this.boatY = FERRY_ROOT_Y + Math.sin(this.bobTime * 1.35) * 0.035;
        this.boatRoll =
          Math.sin(this.bobTime * 0.8) * 0.008 + Math.sin(this.bobTime * 2.1) * 0.003;
        this.boatYaw = this.directEntity.yaw;
        this.speedMps = this.directEntity.isMoving ? this.directEntity.speed : 0;
        const originX =
          this.direction === 'outbound'
            ? LOUISIANA_FERRY_DOCK_POS.x
            : LOUISIANA_FERRY_CITY_DOCK_POS.x;
        const originZ =
          this.direction === 'outbound'
            ? LOUISIANA_FERRY_DOCK_POS.z
            : LOUISIANA_FERRY_CITY_DOCK_POS.z;
        this.routeDistanceMeters = Math.min(
          LOUISIANA_FERRY_DIRECT_ROUTE_METERS,
          Math.hypot(this.boatX - originX, this.boatZ - originZ),
        );
        this.routeProgress =
          LOUISIANA_FERRY_DIRECT_ROUTE_METERS > 0
            ? this.routeDistanceMeters / LOUISIANA_FERRY_DIRECT_ROUTE_METERS
            : 1;
        out.carryX = this.boatX - startX;
        out.carryZ = this.boatZ - startZ;
        if (arrived) {
          this.elapsedMs = LOUISIANA_FERRY_DIRECT_DURATION_MS;
          this.routeProgress = 1;
          this.routeDistanceMeters = LOUISIANA_FERRY_DIRECT_ROUTE_METERS;
          this.phase = 'arriving';
          this.arrivalTimer = LOUISIANA_FERRY_ARRIVAL_SECONDS;
          this.speedMps = 0;
          this.boatRoll = 0;
          out.phaseChanged = true;
        }
        return out;
      }
      this.bobTime += dt;
      if (
        this.engineState === 'starting' &&
        this.engineStartupAtMs !== null &&
        this.now() - this.engineStartupAtMs >= LOUISIANA_FERRY_ENGINE_START_MS
      ) {
        this.engineState = 'running';
      }
      const driving =
        this.engineState === 'starting' || this.engineState === 'running';
      const carryLocal = this.localOffsetFrom(
        playerX,
        playerZ,
        previousX,
        previousZ,
        previousYaw,
      );
      if (!driving) {
        // Engines stopped or out of fuel: the hull holds its position and the
        // 48-hour clock is frozen until the player restarts or refuels.
        this.boatY = FERRY_ROOT_Y + Math.sin(this.bobTime * 1.35) * 0.035;
        this.boatRoll =
          Math.sin(this.bobTime * 0.8) * 0.008 + Math.sin(this.bobTime * 2.1) * 0.003;
        this.speedMps = 0;
        out.carryX = 0;
        out.carryZ = 0;
        return out;
      }
      const elapsed = this.currentElapsedMs();
      const targetDistance = ferryDistanceForElapsed(elapsed);
      let distance = targetDistance;
      const deltaDistance = Math.max(0, targetDistance - this.routeDistanceMeters);
      let starved = false;
      if (deltaDistance > 0) {
        const needed = deltaDistance * LOUISIANA_FERRY_FUEL_PER_METER;
        if (needed > this.fuelLiters && !this.reserveUsed) {
          // Never strand permanently: one emergency reserve is drawn before
          // the engines are allowed to starve.
          this.reserveUsed = true;
          this.fuelLiters = Math.min(
            LOUISIANA_FERRY_FUEL_CAPACITY_LITERS,
            this.fuelLiters + LOUISIANA_FERRY_RESERVE_LITERS,
          );
          out.reserveEngaged = true;
        }
        if (needed > this.fuelLiters) {
          distance = this.routeDistanceMeters +
            this.fuelLiters / LOUISIANA_FERRY_FUEL_PER_METER;
          this.fuelLiters = 0;
          starved = true;
        } else {
          this.fuelLiters = Math.max(0, this.fuelLiters - needed);
        }
      }
      this.routeDistanceMeters = Math.min(
        LOUISIANA_FERRY_ROUTE_METERS,
        distance,
      );
      this.routeProgress =
        LOUISIANA_FERRY_ROUTE_METERS > 0
          ? this.routeDistanceMeters / LOUISIANA_FERRY_ROUTE_METERS
          : 0;
      // The return leg samples the same course backwards, so progress 0 sits at
      // the Crescent City berth, not back at the island.
      const point = ferryPointForDirection(this.routeProgress, this.direction);
      this.boatX = point.x;
      this.boatZ = point.z;
      this.boatY = FERRY_ROOT_Y + Math.sin(this.bobTime * 1.35) * 0.035;
      this.boatRoll =
        Math.sin(this.bobTime * 0.8) * 0.008 + Math.sin(this.bobTime * 2.1) * 0.003;
      this.speedMps = starved ? 0 : ferrySpeedForElapsed(elapsed);

      // The course is already smooth, so following its tangent keeps the bow
      // leading through every bend without frame-rate-dependent lag.
      this.boatYaw = normalizeAngle(
        ferryHeadingForDirection(this.routeProgress, this.direction),
      );

      const carried = this.ferryLocalToWorld(carryLocal.x, carryLocal.z);
      out.carryX = carried.x - playerX;
      out.carryZ = carried.z - playerZ;

      if (starved) {
        this.elapsedMs = ferryElapsedForDistance(this.routeDistanceMeters);
        this.departureAtMs = this.now() - this.elapsedMs;
        this.engineState = 'starved';
        this.speedMps = 0;
        this.boatRoll = 0;
        out.phaseChanged = true;
        return out;
      }

      this.elapsedMs = elapsed;
      if (this.routeProgress >= 1) {
        this.phase = 'arriving';
        this.arrivalTimer = LOUISIANA_FERRY_ARRIVAL_SECONDS;
        out.phaseChanged = true;
        this.speedMps = 0;
        this.boatRoll = 0;
        this.engineState = 'off';
        this.engineStartupAtMs = null;
      }
      return out;
    }

    if (this.phase === 'arriving') {
      this.bobTime += dt;
      this.boatY = FERRY_ROOT_Y + Math.sin(this.bobTime * 1.35) * 0.02;
      this.gateLift = Math.min(1, this.gateLift + dt * 1.8);
      this.arrivalTimer = Math.max(0, this.arrivalTimer - dt);
      this.speedMps = 0;
      this.boatRoll = 0;

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
        const end = this.directMode
          ? this.direction === 'outbound'
            ? LOUISIANA_FERRY_CITY_DOCK_POS
            : LOUISIANA_FERRY_DOCK_POS
          : ferryRoutePositionAt(
              this.direction === 'outbound' ? LOUISIANA_FERRY_ROUTE_METERS : 0,
            );
        this.boatX = end.x;
        this.boatZ = end.z;
        this.routeDistanceMeters = this.directMode
          ? LOUISIANA_FERRY_DIRECT_ROUTE_METERS
          : LOUISIANA_FERRY_ROUTE_METERS;
        this.routeProgress = 1;
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
      version: 4,
      direction: this.direction,
      phase,
      destination: this.destination,
      departureAtMs: this.departureAtMs,
      savedAtMs: nowMs,
      elapsedMs: elapsed,
      routeProgress: this.routeProgress,
      routeDistanceMeters: this.directMode
        ? this.routeDistanceMeters
        : active &&
            (this.engineState === 'starting' || this.engineState === 'running')
          ? ferryDistanceForElapsed(elapsed)
          : this.routeDistanceMeters,
      aboard: this.aboard,
      carId,
      playerLocalX: playerLocal?.x ?? 0,
      playerLocalZ: playerLocal?.z ?? -10.5,
      fuelLiters: this.fuelLiters,
      engineState: this.engineState,
      reserveUsed: this.reserveUsed,
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
    this.fuelLiters = Math.max(
      0,
      Math.min(
        LOUISIANA_FERRY_FUEL_CAPACITY_LITERS,
        save.fuelLiters ?? LOUISIANA_FERRY_FUEL_CAPACITY_LITERS,
      ),
    );
    this.reserveUsed = Boolean(save.reserveUsed);
    this.engineStartupAtMs = null;

    if (this.directMode) {
      this.engineState =
        save.phase === 'at_sea' || save.phase === 'arriving' ? 'running' : 'off';
      this.restoreDirect(save, nowMs);
      return;
    }

    const resumeable =
      save.phase === 'at_sea' ||
      save.phase === 'arriving' ||
      save.phase === 'arrived';

    if (!resumeable || this.departureAtMs === null) {
      // Closed before the lines were cast off: nothing of the crossing has
      // elapsed yet, so the player can simply board again.
      this.phase = save.phase === 'boarding' ? 'boarding' : 'idle';
      this.boardingCleared = true;
      this.aboard = false;
      this.engineState = 'off';
      // Every leg's route progress starts at 0; direction picks the berth.
      this.routeProgress = 0;
      this.routeDistanceMeters = 0;
      this.elapsedMs = 0;
      this.gateLift = 0;
      this.boatRoll = 0;
      const start = ferryPointForDirection(0, direction);
      this.boatX = start.x;
      this.boatZ = start.z;
      this.boatY = FERRY_ROOT_Y;
      this.boatYaw = ferryOriginHeading(direction);
      return;
    }

    const savedEngine =
      save.engineState ??
      (save.phase === 'at_sea' || save.phase === 'arriving' ? 'running' : 'off');
    const engineActive =
      savedEngine === 'starting' || savedEngine === 'running';
    this.engineState = engineActive
      ? 'running'
      : savedEngine === 'starved'
        ? 'starved'
        : 'off';
    this.phase = 'at_sea';
    this.gateLift = 1;
    const savedDistance = Math.max(
      0,
      Math.min(
        LOUISIANA_FERRY_ROUTE_METERS,
        save.routeDistanceMeters ?? 0,
      ),
    );
    this.elapsedMs = engineActive
      ? Math.max(
          0,
          Math.min(LOUISIANA_FERRY_LEG_MS, nowMs - this.departureAtMs),
        )
      : Math.max(0, Math.min(LOUISIANA_FERRY_LEG_MS, save.elapsedMs));

    let distance = engineActive
      ? ferryDistanceForElapsed(this.elapsedMs)
      : savedDistance;
    let starved = this.engineState === 'starved' || this.fuelLiters <= 0;
    if (engineActive && distance > savedDistance) {
      const needed =
        (distance - savedDistance) * LOUISIANA_FERRY_FUEL_PER_METER;
      if (needed > this.fuelLiters && !this.reserveUsed) {
        this.reserveUsed = true;
        this.fuelLiters = Math.min(
          LOUISIANA_FERRY_FUEL_CAPACITY_LITERS,
          this.fuelLiters + LOUISIANA_FERRY_RESERVE_LITERS,
        );
      }
      if (needed > this.fuelLiters) {
        distance = savedDistance + this.fuelLiters / LOUISIANA_FERRY_FUEL_PER_METER;
        this.fuelLiters = 0;
        starved = true;
      } else {
        this.fuelLiters = Math.max(0, this.fuelLiters - needed);
      }
    }
    this.routeDistanceMeters = Math.min(LOUISIANA_FERRY_ROUTE_METERS, distance);
    this.routeProgress =
      LOUISIANA_FERRY_ROUTE_METERS > 0
        ? this.routeDistanceMeters / LOUISIANA_FERRY_ROUTE_METERS
        : 0;
    if (starved) {
      this.engineState = 'starved';
      this.elapsedMs = ferryElapsedForDistance(this.routeDistanceMeters);
      this.departureAtMs = nowMs - this.elapsedMs;
    }
    const point = ferryPointForDirection(this.routeProgress, direction);
    this.boatX = point.x;
    this.boatZ = point.z;
    this.boatY = FERRY_ROOT_Y;
    this.boatRoll = 0;
    this.speedMps =
      engineActive && !starved ? ferrySpeedForElapsed(this.elapsedMs) : 0;
    this.boatYaw = normalizeAngle(
      ferryHeadingForDirection(this.routeProgress, direction),
    );
    this.aboard = Boolean(save.aboard);

    if (this.routeProgress >= 1) {
      // Let the normal arrival sequence finish on the first resumed frame.
      this.phase = 'arriving';
      this.arrivalTimer = 1.2;
      this.gateLift = 1;
      this.speedMps = 0;
      this.boatYaw = ferryDockedHeading(direction);
      this.engineState = 'off';
    }
  }

  /** Resumes the direct fixed-step shuttle at its saved metre marker. */
  private restoreDirect(save: LouisianaFerrySaveState, nowMs: number): void {
    const direction = this.direction;
    const origin =
      direction === 'outbound'
        ? LOUISIANA_FERRY_DOCK_POS
        : LOUISIANA_FERRY_CITY_DOCK_POS;
    const target =
      direction === 'outbound'
        ? LOUISIANA_FERRY_CITY_DOCK_POS
        : LOUISIANA_FERRY_DOCK_POS;
    const phase = save.phase;
    const resumeable =
      phase === 'at_sea' || phase === 'arriving' || phase === 'arrived';
    const heading = Math.atan2(target.x - origin.x, target.z - origin.z);

    this.directEntity.headingToMainland = direction === 'outbound';
    this.directEntity.yaw = heading;
    this.directEntity.position.y = FERRY_ROOT_Y;

    if (!resumeable) {
      // Closed before the lines were cast off: board again at this berth.
      this.phase = phase === 'boarding' ? 'boarding' : 'idle';
      this.boardingCleared = true;
      this.aboard = false;
      this.routeProgress = 0;
      this.routeDistanceMeters = 0;
      this.elapsedMs = 0;
      this.gateLift = 0;
      this.speedMps = 0;
      this.boatRoll = 0;
      this.directEntity.isMoving = false;
      this.directEntity.position.x = origin.x;
      this.directEntity.position.z = origin.z;
      this.boatX = origin.x;
      this.boatZ = origin.z;
      this.boatY = FERRY_ROOT_Y;
      this.boatYaw = ferryOriginHeading(direction);
      return;
    }

    const progress =
      phase === 'arrived' || phase === 'arriving'
        ? 1
        : clamp01(save.routeProgress);
    this.routeProgress = progress;
    this.routeDistanceMeters = progress * LOUISIANA_FERRY_DIRECT_ROUTE_METERS;
    this.elapsedMs =
      phase === 'arrived'
        ? LOUISIANA_FERRY_DIRECT_DURATION_MS
        : Math.max(
            0,
            Math.min(
              LOUISIANA_FERRY_DIRECT_DURATION_MS,
              save.elapsedMs || progress * LOUISIANA_FERRY_DIRECT_DURATION_MS,
            ),
          );
    this.directEntity.position.x =
      origin.x + (target.x - origin.x) * progress;
    this.directEntity.position.z =
      origin.z + (target.z - origin.z) * progress;
    this.directEntity.isMoving = phase === 'at_sea';
    this.boatX = this.directEntity.position.x;
    this.boatZ = this.directEntity.position.z;
    this.boatY = FERRY_ROOT_Y;
    this.boatYaw = phase === 'at_sea' ? heading : ferryDockedHeading(direction);
    // A save taken on the arrival frame still needs the normal arrival step so
    // the car is unloaded and the player is placed on the destination quay.
    this.phase = phase === 'arrived' ? 'arriving' : phase;
    this.aboard = Boolean(save.aboard);
    this.gateLift = 0;
    this.speedMps = phase === 'at_sea' ? LOUISIANA_FERRY_DIRECT_SPEED_MPS : 0;
    this.departureAtMs = nowMs - this.elapsedMs;
    if (this.phase === 'arriving') {
      this.arrivalTimer = 1.2;
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
      case 'at_sea': {
        const fuel = `${this.fuelLiters.toFixed(0)} L · ${this.fuelPercent.toFixed(0)}%`;
        if (this.engineState === 'starved' || this.fuelLiters <= 0) {
          return `Adrift · out of fuel · ${fuel} · refuel in the engine room`;
        }
        if (this.engineState === 'off') {
          return `Hove to · engines stopped · ${fuel} · restart in the engine room`;
        }
        return `${formatFerryDuration(remainingMs)} to ${destinationName} · ${(this.routeProgress * 100).toFixed(1)}% · ${fuel}${this.lowFuel ? ' · LOW FUEL' : ''}`;
      }
      case 'arriving':
        return `Docking at ${destinationName}`;
      case 'arrived':
        return `Docked at ${destinationName} · stern gate open`;
      default:
        return elapsedMs > 0 ? `${formatFerryDuration(remainingMs)} remaining` : '';
    }
  }

  private emptyUpdate(): LouisianaFerryUpdate {
    // Reuse one result object: the fixed-step loop must not allocate per tick.
    const out = this.updateScratch;
    out.phaseChanged = false;
    out.boarded = false;
    out.gateOpened = false;
    out.departed = false;
    out.arrived = false;
    out.carryX = 0;
    out.carryZ = 0;
    out.reserveEngaged = false;
    return out;
  }
}

export interface FerryUpdateResult {
  ok: boolean;
  message: string;
}
