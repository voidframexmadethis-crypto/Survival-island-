import type { ModularVehicleData } from '../types';
import { resolveVehicleProfile } from './vehicleProfiles';

/**
 * Four-corner lowrider hydraulic suspension.
 *
 * Completed feature set:
 *  - Independent FL/FR/RL/RR actuator travel, per-corner and axle/side locks.
 *  - Front/rear/side hops, three-wheel stance, rhythmic pump bursts, a short
 *    whole-car Bounce, and a larger ballistic Full Hop.
 *  - Per-vehicle spring rates, damping, travel and hop energy derived from the
 *    real wheelbase, track, mass and centre of gravity.
 *  - A sprung body that follows actuator travel with underdamped compression
 *    and rebound, plus pitch/roll from the actual corner loads.
 *  - Ground-contact and wheel-clearance state consumed by the HUD.
 *
 * The game uses this deterministic in-house rig for every hydraulic vehicle;
 * it does not run a second Cannon-es/Rapier controller. Hydraulic/airbag audio
 * lives in soundEngine, and driving squat/dive/roll tuning lives in
 * vehicleProfiles and the vehicle render loop.
 *
 * Each corner is a spring/damper actuator: commands move the wheel vertically
 * relative to the chassis, and hops inject real velocity into that actuator. A
 * full-car hop launches the whole chassis on a ballistic arc under gravity, so
 * every tire leaves the ground and the vehicle returns to the road rather than
 * being pinned by a visual offset.
 *
 * Coordinates: `corner.lift` is wheel-centre displacement above its resting
 * contact position (positive = wheel moves up into the arch). `rootHeight` is
 * the chassis/root height above the road. Tire ground clearance is therefore
 * `rootHeight + lift`; a corner is in contact when that value is <= 0.
 */

export type LowriderCorner = 'fl' | 'fr' | 'rl' | 'rr';
export const LOWRIDER_CORNERS: readonly LowriderCorner[] = ['fl', 'fr', 'rl', 'rr'];

export type LowriderStance =
  | 'level'
  | 'three_wheel'
  | 'front'
  | 'rear'
  | 'left'
  | 'right';

export interface LowriderCornerState {
  /** Wheel-centre height above its resting contact position (metres). */
  lift: number;
  velocity: number;
  contact: boolean;
}

export interface LowriderRigState {
  corners: Record<LowriderCorner, LowriderCornerState>;
  /** Whole-vehicle height above the road (metres). */
  rootHeight: number;
  rootVelocity: number;
  /** Sprung chassis heave used for body motion and landing compression. */
  bodyHeave: number;
  bodyVelocity: number;
  pitch: number;
  roll: number;
  lastImpactSpeed: number;
  hopCooldown: number;
  hopCount: number;
}

export interface LowriderControls {
  /** Commanded wheel lift for each corner (0 = tire on the road). */
  targets: Record<LowriderCorner, number>;
  /** A locked corner keeps its commanded height and ignores trim input. */
  locked: Record<LowriderCorner, boolean>;
  /** Chassis ride-height trim from the UP/DOWN controls. */
  bodyTarget: number;
  selectedCorner: LowriderCorner;
  stance: LowriderStance;
}

export const LOWRIDER_MAX_WHEEL_LIFT = 0.72;
export const LOWRIDER_MIN_WHEEL_LIFT = 0;
export const LOWRIDER_TRIM_STEP = 0.14;
export const LOWRIDER_MAX_BODY_TRIM = 0.46;
export const LOWRIDER_MIN_BODY_TRIM = -0.12;

const WHEEL_SPRING = 150;
// A show car rebounds once or twice before the shocks settle it. The old
// over-damped values killed that movement almost instantly and made the car
// look rigid even while the pumps were running.
const WHEEL_DAMPING = 8.2;
const WHEEL_MAX_VELOCITY = 6.2;
const BODY_SPRING = 50;
const BODY_DAMPING = 4.8;
const GRAVITY = 16;
export const LOWRIDER_FULL_HOP_LAUNCH = 5.1;
/** Ordinary Bounce is a lighter chassis arc than the full four-wheel hop. */
export const LOWRIDER_BOUNCE_LAUNCH_RATIO = 0.62;
const FULL_HOP_COOLDOWN = 0.42;
const BOUNCE_COOLDOWN = 0.34;
const MAX_ROOT_HEIGHT = 1.55;
const CONTACT_EPSILON = 0.004;

/**
 * Per-vehicle hydraulic tuning. A long, heavy Cadillac moves more slowly and
 * carries more travel than a short mini truck; the spring rates and ballistic
 * hop are derived from those dimensions instead of being identical fleet-wide.
 */
export interface LowriderRigSpec {
  maxWheelLift: number;
  wheelSpring: number;
  wheelDamping: number;
  bodySpring: number;
  bodyDamping: number;
  /** Fraction of average actuator travel the sprung body follows. */
  bodyFollow: number;
  hopLaunch: number;
  gravity: number;
  maxRootHeight: number;
  minBodyTrim: number;
  maxBodyTrim: number;
}

export interface LowriderRigSpecInput {
  wheelRadiusM?: number;
  wheelbaseM?: number;
  trackWidthM?: number;
  massKg?: number;
  centerOfGravityM?: number;
  suspensionStiffness?: number;
  /** Extra travel for tall show builds, e.g. a DONK. */
  travelScale?: number;
}

export const DEFAULT_LOWRIDER_RIG_SPEC: LowriderRigSpec = {
  maxWheelLift: LOWRIDER_MAX_WHEEL_LIFT,
  wheelSpring: WHEEL_SPRING,
  wheelDamping: WHEEL_DAMPING,
  bodySpring: BODY_SPRING,
  bodyDamping: BODY_DAMPING,
  bodyFollow: 0.95,
  hopLaunch: LOWRIDER_FULL_HOP_LAUNCH,
  gravity: GRAVITY,
  maxRootHeight: MAX_ROOT_HEIGHT,
  minBodyTrim: LOWRIDER_MIN_BODY_TRIM,
  maxBodyTrim: LOWRIDER_MAX_BODY_TRIM,
};

/**
 * Derives spring, damper, travel and hop values from the actual car package.
 * Heavier cars need more spring force and respond more slowly; a longer
 * wheelbase adds usable travel while a taller centre of gravity reduces hop.
 */
export function deriveLowriderRigSpec(
  input: LowriderRigSpecInput = {},
): LowriderRigSpec {
  const wheelRadius = clamp(input.wheelRadiusM ?? 0.36, 0.26, 0.66);
  const wheelbase = clamp(input.wheelbaseM ?? 2.8, 2.1, 3.6);
  const trackWidth = clamp(input.trackWidthM ?? 1.9, 1.5, 2.3);
  const mass = clamp(input.massKg ?? 1850, 1150, 2900);
  const cog = clamp(input.centerOfGravityM ?? 0.54, 0.38, 0.72);
  const stiffness = clamp(input.suspensionStiffness ?? 5.8, 3.5, 9);
  const travelScale = clamp(input.travelScale ?? 1, 0.8, 1.35);

  const massRatio = mass / 1850;
  const lengthRatio = wheelbase / 2.8;
  const trackRatio = trackWidth / 1.9;
  const stiffnessRatio = stiffness / 5.8;
  const travel =
    (0.52 + (wheelRadius - 0.36) * 0.42 + (lengthRatio - 1) * 0.12) *
    travelScale;

  return {
    maxWheelLift: clamp(travel, 0.46, 0.82),
    wheelSpring: WHEEL_SPRING * (0.82 + massRatio * 0.22) * (0.9 + trackRatio * 0.1),
    wheelDamping: WHEEL_DAMPING * Math.sqrt(massRatio) * (0.92 + stiffnessRatio * 0.08),
    bodySpring: BODY_SPRING * (0.88 + stiffnessRatio * 0.12),
    bodyDamping: BODY_DAMPING * Math.sqrt(massRatio),
    bodyFollow: clamp(0.93 + (0.6 - cog) * 0.16, 0.9, 0.97),
    hopLaunch:
      LOWRIDER_FULL_HOP_LAUNCH *
      clamp(1.06 - (massRatio - 1) * 0.22 - (cog - 0.52) * 0.18, 0.86, 1.14),
    gravity: GRAVITY + clamp((mass - 1850) / 220, -1.2, 1.6),
    maxRootHeight: MAX_ROOT_HEIGHT,
    minBodyTrim: LOWRIDER_MIN_BODY_TRIM,
    maxBodyTrim: LOWRIDER_MAX_BODY_TRIM,
  };
}

/** All hydraulic lowrider packages, tuned from their preset dimensions. */
export const LOWRIDER_FLEET_PRESETS = [
  'cadillac_coupe_deville',
  'lowrider',
  'town_car',
  'mini_truck',
  'el_camino',
  'donk',
  'chevy_tahoe',
  'chevy_2000_sub',
  'van_90s',
] as const;

const FLEET_MASS_KG: Record<string, number> = {
  cadillac_coupe_deville: 2150,
  lowrider: 1880,
  town_car: 2050,
  mini_truck: 1450,
  el_camino: 1810,
  donk: 1960,
  chevy_tahoe: 2480,
  chevy_2000_sub: 2600,
  van_90s: 2360,
};

const FLEET_CENTER_OF_GRAVITY_M: Record<string, number> = {
  mini_truck: 0.5,
  lowrider: 0.54,
  cadillac_coupe_deville: 0.54,
  town_car: 0.55,
  el_camino: 0.6,
  donk: 0.6,
  chevy_tahoe: 0.65,
  chevy_2000_sub: 0.66,
  van_90s: 0.68,
};

const FLEET_TRAVEL_SCALE: Record<string, number> = {
  donk: 1.22,
  el_camino: 1.22,
  chevy_tahoe: 1.18,
  chevy_2000_sub: 1.18,
  van_90s: 1.14,
};

/** Resolves the actual suspension package for a spawned lowrider or hydraulic truck. */
export function createLowriderVehicleRigSpec(
  vehicle: Pick<ModularVehicleData, 'id' | 'name' | 'preset' | 'carId'>,
): LowriderRigSpec {
  const profile = resolveVehicleProfile(vehicle);
  const preset = vehicle.preset ?? '';
  return deriveLowriderRigSpec({
    wheelRadiusM: profile.wheelRadius,
    wheelbaseM: profile.wheelBaseZ * 2,
    trackWidthM: profile.trackWidthX,
    massKg: FLEET_MASS_KG[preset] ?? 1850,
    centerOfGravityM: FLEET_CENTER_OF_GRAVITY_M[preset] ?? 0.54,
    suspensionStiffness: profile.handling.suspensionStiffness,
    travelScale: FLEET_TRAVEL_SCALE[preset] ?? 1,
  });
}

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

function createCorner(): LowriderCornerState {
  return { lift: 0, velocity: 0, contact: true };
}

export function createLowriderRigState(): LowriderRigState {
  return {
    corners: {
      fl: createCorner(),
      fr: createCorner(),
      rl: createCorner(),
      rr: createCorner(),
    },
    rootHeight: 0,
    rootVelocity: 0,
    bodyHeave: 0,
    bodyVelocity: 0,
    pitch: 0,
    roll: 0,
    lastImpactSpeed: 0,
    hopCooldown: 0,
    hopCount: 0,
  };
}

export function createLowriderControls(): LowriderControls {
  return {
    targets: { fl: 0, fr: 0, rl: 0, rr: 0 },
    locked: { fl: false, fr: false, rl: false, rr: false },
    bodyTarget: 0,
    selectedCorner: 'rl',
    stance: 'level',
  };
}

export function lowriderCornerClearance(
  rig: LowriderRigState,
  corner: LowriderCorner,
): number {
  return rig.rootHeight + rig.corners[corner].lift;
}

export function lowriderWheelClearances(
  rig: LowriderRigState,
): Record<LowriderCorner, number> {
  return {
    fl: lowriderCornerClearance(rig, 'fl'),
    fr: lowriderCornerClearance(rig, 'fr'),
    rl: lowriderCornerClearance(rig, 'rl'),
    rr: lowriderCornerClearance(rig, 'rr'),
  };
}

export function lowriderContactCount(rig: LowriderRigState): number {
  return LOWRIDER_CORNERS.filter((corner) => rig.corners[corner].contact).length;
}

/** Trim one corner. Locked corners refuse the change, preserving their height. */
export function adjustLowriderCorner(
  controls: LowriderControls,
  corner: LowriderCorner,
  direction: 1 | -1,
): boolean {
  if (controls.locked[corner]) return false;
  controls.targets[corner] = clamp(
    controls.targets[corner] + direction * LOWRIDER_TRIM_STEP,
    0,
    LOWRIDER_MAX_WHEEL_LIFT,
  );
  controls.stance = 'level';
  return true;
}

export function setLowriderCornerTarget(
  controls: LowriderControls,
  corner: LowriderCorner,
  height: number,
): boolean {
  if (controls.locked[corner]) return false;
  controls.targets[corner] = clamp(height, 0, LOWRIDER_MAX_WHEEL_LIFT);
  return true;
}

export function toggleLowriderCornerLock(
  controls: LowriderControls,
  corner: LowriderCorner,
): void {
  controls.locked[corner] = !controls.locked[corner];
}

export function toggleLowriderAxleLock(
  controls: LowriderControls,
  axle: 'front' | 'rear',
): boolean {
  const corners: LowriderCorner[] =
    axle === 'front' ? ['fl', 'fr'] : ['rl', 'rr'];
  const next = !corners.every((corner) => controls.locked[corner]);
  for (const corner of corners) controls.locked[corner] = next;
  return next;
}

/** Locks or releases the left or right pair without touching the other side. */
export function toggleLowriderSideLock(
  controls: LowriderControls,
  side: 'left' | 'right',
): boolean {
  const corners: LowriderCorner[] =
    side === 'left' ? ['fl', 'rl'] : ['fr', 'rr'];
  const next = !corners.every((corner) => controls.locked[corner]);
  for (const corner of corners) controls.locked[corner] = next;
  return next;
}

export function setLowriderBodyTrim(
  controls: LowriderControls,
  delta: number,
): void {
  controls.bodyTarget = clamp(
    controls.bodyTarget + delta,
    LOWRIDER_MIN_BODY_TRIM,
    LOWRIDER_MAX_BODY_TRIM,
  );
}

/** Clear every commanded height and unlock all corners. */
export function resetLowriderControls(controls: LowriderControls): void {
  controls.targets = { fl: 0, fr: 0, rl: 0, rr: 0 };
  controls.locked = { fl: false, fr: false, rl: false, rr: false };
  controls.bodyTarget = 0;
  controls.stance = 'level';
}

/**
 * Classic three-wheel stance: retract one corner's actuator so that wheel
 * climbs, leaving the other three carrying the car. Calling again drops it.
 */
/** Clears stance targets without touching corners the player has locked. */
function clearUnlockedTargets(controls: LowriderControls): void {
  for (const corner of LOWRIDER_CORNERS) {
    if (!controls.locked[corner]) controls.targets[corner] = 0;
  }
}

export function toggleLowriderThreeWheel(
  controls: LowriderControls,
  corner: LowriderCorner,
): boolean {
  if (controls.stance === 'three_wheel' && controls.selectedCorner === corner) {
    resumeLowriderLevel(controls);
    return false;
  }
  controls.selectedCorner = corner;
  clearUnlockedTargets(controls);
  // A locked corner keeps its held ride height even when it is selected for a
  // 3-wheel pose; the hop still moves it around that locked target.
  if (!controls.locked[corner]) controls.targets[corner] = 0.6;
  controls.stance = 'three_wheel';
  return true;
}

/** Symmetric side stance used by the LEFT/RIGHT buttons. */
export function setLowriderSide(
  controls: LowriderControls,
  side: 'left' | 'right',
): void {
  clearUnlockedTargets(controls);
  const corners: LowriderCorner[] =
    side === 'left' ? ['fl', 'rl'] : ['fr', 'rr'];
  for (const corner of corners) {
    if (!controls.locked[corner]) controls.targets[corner] = 0.46;
  }
  controls.stance = side;
}

export function resumeLowriderLevel(controls: LowriderControls): void {
  clearUnlockedTargets(controls);
  controls.stance = 'level';
}

/** Adds an actuator velocity impulse. Locks never suppress a hop. */
export function impulseLowriderCorner(
  rig: LowriderRigState,
  corner: LowriderCorner,
  velocity: number,
): void {
  rig.corners[corner].velocity = clamp(
    rig.corners[corner].velocity + velocity,
    -WHEEL_MAX_VELOCITY,
    WHEEL_MAX_VELOCITY,
  );
}

export function pumpLowriderCorners(
  rig: LowriderRigState,
  corners: readonly LowriderCorner[],
  velocity: number,
): void {
  for (const corner of corners) impulseLowriderCorner(rig, corner, velocity);
}

/**
 * Fires a lighter whole-car bounce for the normal Bounce/Coil Bounce control.
 * It is deliberately shorter than the full four-wheel hop: the chassis leaves
 * the pavement, the sprung body rebounds, and the wheel actuators keep pumping.
 */
export function launchLowriderBounce(
  rig: LowriderRigState,
  power = 1,
  spec: LowriderRigSpec = DEFAULT_LOWRIDER_RIG_SPEC,
): boolean {
  if (rig.rootHeight > 0.05 || rig.hopCooldown > 0) return false;
  const boost = clamp(power, 0.5, 1.7);
  rig.rootVelocity = clamp(
    spec.hopLaunch * LOWRIDER_BOUNCE_LAUNCH_RATIO * boost,
    1.6,
    4.25,
  );
  rig.hopCooldown = BOUNCE_COOLDOWN;
  rig.hopCount += 1;
  // The body is thrown upward before the tires unload, which gives the visible
  // body-first hydraulic bounce instead of a rigid chassis sliding upward.
  rig.bodyVelocity += 0.4 * boost;
  return true;
}

/**
 * Launches the whole car. The wheels stay attached and the entire root leaves
 * the ground on a gravity-driven arc; returns false while already airborne or
 * during the landing cooldown.
 */
export function launchLowriderFullHop(
  rig: LowriderRigState,
  power = 1,
  spec: LowriderRigSpec = DEFAULT_LOWRIDER_RIG_SPEC,
): boolean {
  if (rig.rootHeight > 0.06 || rig.hopCooldown > 0) return false;
  rig.rootVelocity = clamp(
    spec.hopLaunch * power,
    3.2,
    7.2,
  );
  rig.hopCooldown = FULL_HOP_COOLDOWN;
  rig.hopCount += 1;
  // The sudden extension unloads the springs; the wheels droop as the chassis
  // travels upward, then the whole assembly falls back together.
  for (const corner of LOWRIDER_CORNERS) {
    rig.corners[corner].velocity = clamp(
      rig.corners[corner].velocity + 0.9,
      -WHEEL_MAX_VELOCITY,
      WHEEL_MAX_VELOCITY,
    );
  }
  return true;
}

interface StepOptions {
  /** 0.25 (slow valves) .. 2.0 (fast show pumps). */
  speed?: number;
  /** 0.4 .. 1.4 lock-up pressure. */
  pressure?: number;
  /** Car-specific spring/damper/travel package. */
  spec?: LowriderRigSpec;
}

/** Advances the four actuators, the sprung body and the whole-car arc. */
export function stepLowriderRig(
  rig: LowriderRigState,
  controls: LowriderControls,
  dt: number,
  options: StepOptions = {},
): LowriderRigState {
  const speed = clamp(options.speed ?? 1, 0.25, 2);
  const pressure = clamp(options.pressure ?? 1, 0.4, 1.4);
  const spec = options.spec ?? DEFAULT_LOWRIDER_RIG_SPEC;
  const dtSafe = clamp(dt, 0, 1 / 30);
  // Sub-step so the stiff show-car springs stay stable at low frame rates.
  const steps = Math.max(1, Math.ceil(dtSafe / (1 / 120)));
  const h = dtSafe / steps;

  for (let step = 0; step < steps; step++) {
    if (rig.hopCooldown > 0) {
      rig.hopCooldown = Math.max(0, rig.hopCooldown - h);
    }

    // Whole-car ballistic arc. This is the only way all four tires can leave
    // the road at once; the wheel actuators remain attached underneath.
    if (rig.rootHeight > 0 || rig.rootVelocity > 0) {
      rig.rootVelocity -= spec.gravity * h;
      rig.rootHeight += rig.rootVelocity * h;
      if (rig.rootHeight >= spec.maxRootHeight) {
        rig.rootHeight = spec.maxRootHeight;
        rig.rootVelocity = Math.min(0, rig.rootVelocity);
      }
      if (rig.rootHeight <= 0) {
        rig.lastImpactSpeed = Math.max(0, -rig.rootVelocity);
        rig.rootHeight = 0;
        rig.rootVelocity = 0;
        rig.bodyVelocity -= Math.min(4.4, rig.lastImpactSpeed * 0.42);
      }
    } else {
      rig.rootHeight = 0;
      rig.rootVelocity = 0;
    }

    for (const corner of LOWRIDER_CORNERS) {
      const state = rig.corners[corner];
      const target = clamp(controls.targets[corner], 0, spec.maxWheelLift);
      // A locked corner holds its commanded height exactly, allowing the body
      // to be trimmed around it without the corner drifting.
      const springTarget = controls.locked[corner]
        ? clamp(controls.targets[corner], 0, spec.maxWheelLift)
        : target;
      const stiffness = spec.wheelSpring * (0.72 + speed * 0.38) * pressure;
      const damping = spec.wheelDamping * (0.82 + speed * 0.18);
      const accel = (springTarget - state.lift) * stiffness - state.velocity * damping;
      state.velocity = clamp(
        state.velocity + accel * h,
        -WHEEL_MAX_VELOCITY,
        WHEEL_MAX_VELOCITY,
      );
      state.lift = clamp(
        state.lift + state.velocity * h,
        LOWRIDER_MIN_WHEEL_LIFT,
        spec.maxWheelLift,
      );
      if (state.lift <= 0 && state.velocity < 0) {
        // Tire meets the road: stop the downward travel instead of sinking the
        // wheel through the terrain, and let the tire rebound slightly.
        state.lift = 0;
        state.velocity = Math.abs(state.velocity) < 0.6 ? 0 : -state.velocity * 0.14;
      }
      state.contact = rig.rootHeight + state.lift <= CONTACT_EPSILON;
    }

    // Sprung-body response: hydraulic lift loads the body, and a landing
    // compresses it before the dampers settle it back to the commanded trim.
    const averageLift =
      (rig.corners.fl.lift +
        rig.corners.fr.lift +
        rig.corners.rl.lift +
        rig.corners.rr.lift) /
      4;
    const bodyGoal = clamp(
      controls.bodyTarget + averageLift * spec.bodyFollow,
      spec.minBodyTrim - 0.06,
      spec.maxBodyTrim + 0.18,
    );
    rig.bodyVelocity +=
      ((bodyGoal - rig.bodyHeave) * spec.bodySpring - rig.bodyVelocity * spec.bodyDamping) * h;
    rig.bodyHeave += rig.bodyVelocity * h;
    rig.bodyHeave = clamp(
      rig.bodyHeave,
      spec.minBodyTrim - 0.08,
      spec.maxBodyTrim + 0.22,
    );

    // Chassis attitude follows the corner loads. A raised corner leans the
    // body toward the still-grounded side and the body settles with the dampers.
    const leftLift = (rig.corners.fl.lift + rig.corners.rl.lift) * 0.5;
    const rightLift = (rig.corners.fr.lift + rig.corners.rr.lift) * 0.5;
    const frontLift = (rig.corners.fl.lift + rig.corners.fr.lift) * 0.5;
    const rearLift = (rig.corners.rl.lift + rig.corners.rr.lift) * 0.5;
    const airborne = rig.rootHeight > 0.04;
    const rollTarget = airborne
      ? rig.roll * 0.98
      : clamp((rightLift - leftLift) * 0.3, -0.2, 0.2);
    // Positive rotation.x drops the +Z nose, so a raised front axle needs a
    // negative pitch angle. This is the chassis attitude, not a decorative
    // body pose: it comes from the same four corner states as the wheels.
    const pitchTarget = airborne
      ? clamp(-rig.rootVelocity * 0.012 + (rearLift - frontLift) * 0.18, -0.14, 0.14)
      : clamp((rearLift - frontLift) * 0.28, -0.18, 0.18);
    rig.roll += (rollTarget - rig.roll) * Math.min(1, 7 * h);
    rig.pitch += (pitchTarget - rig.pitch) * Math.min(1, 7 * h);
  }

  return rig;
}
