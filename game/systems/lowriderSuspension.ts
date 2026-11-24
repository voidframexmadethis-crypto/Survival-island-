/**
 * Four-corner lowrider hydraulic suspension.
 *
 * Each corner is an independent spring/damper actuator: commands move the
 * wheel vertically relative to the chassis, and hops inject real velocity into
 * that actuator. A full-car hop launches the whole chassis on a ballistic arc
 * under gravity, so every tire leaves the ground and the vehicle returns to the
 * road rather than being pinned by a visual offset.
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
const WHEEL_DAMPING = 9.5;
const WHEEL_MAX_VELOCITY = 6.2;
const BODY_SPRING = 54;
const BODY_DAMPING = 9.4;
const GRAVITY = 16;
export const LOWRIDER_FULL_HOP_LAUNCH = 5.1;
const FULL_HOP_COOLDOWN = 0.42;
const MAX_ROOT_HEIGHT = 1.55;
const CONTACT_EPSILON = 0.004;

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
 * Launches the whole car. The wheels stay attached and the entire root leaves
 * the ground on a gravity-driven arc; returns false while already airborne or
 * during the landing cooldown.
 */
export function launchLowriderFullHop(
  rig: LowriderRigState,
  power = 1,
): boolean {
  if (rig.rootHeight > 0.06 || rig.hopCooldown > 0) return false;
  rig.rootVelocity = clamp(
    LOWRIDER_FULL_HOP_LAUNCH * power,
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
      rig.rootVelocity -= GRAVITY * h;
      rig.rootHeight += rig.rootVelocity * h;
      if (rig.rootHeight >= MAX_ROOT_HEIGHT) {
        rig.rootHeight = MAX_ROOT_HEIGHT;
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
      const target = clamp(
        controls.targets[corner],
        0,
        LOWRIDER_MAX_WHEEL_LIFT,
      );
      // A locked corner holds its commanded height exactly, allowing the body
      // to be trimmed around it without the corner drifting.
      const springTarget = controls.locked[corner]
        ? controls.targets[corner]
        : target;
      const stiffness = WHEEL_SPRING * (0.72 + speed * 0.38) * pressure;
      const damping = WHEEL_DAMPING * (0.82 + speed * 0.18);
      const accel = (springTarget - state.lift) * stiffness - state.velocity * damping;
      state.velocity = clamp(
        state.velocity + accel * h,
        -WHEEL_MAX_VELOCITY,
        WHEEL_MAX_VELOCITY,
      );
      state.lift = clamp(
        state.lift + state.velocity * h,
        LOWRIDER_MIN_WHEEL_LIFT,
        LOWRIDER_MAX_WHEEL_LIFT,
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
      controls.bodyTarget + averageLift * 0.16,
      LOWRIDER_MIN_BODY_TRIM - 0.06,
      LOWRIDER_MAX_BODY_TRIM + 0.18,
    );
    rig.bodyVelocity +=
      ((bodyGoal - rig.bodyHeave) * BODY_SPRING - rig.bodyVelocity * BODY_DAMPING) * h;
    rig.bodyHeave += rig.bodyVelocity * h;
    rig.bodyHeave = clamp(
      rig.bodyHeave,
      LOWRIDER_MIN_BODY_TRIM - 0.08,
      LOWRIDER_MAX_BODY_TRIM + 0.22,
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
    const pitchTarget = airborne
      ? clamp(-rig.rootVelocity * 0.012 + (frontLift - rearLift) * 0.1, -0.14, 0.14)
      : clamp((frontLift - rearLift) * 0.2, -0.16, 0.16);
    rig.roll += (rollTarget - rig.roll) * Math.min(1, 9 * h);
    rig.pitch += (pitchTarget - rig.pitch) * Math.min(1, 9 * h);
  }

  return rig;
}
