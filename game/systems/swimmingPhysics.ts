/**
 * GTA-style surface swimming, diving and lung capacity. Kept pure so the
 * controller can be tested without a renderer or DOM.
 */
export const SWIM_SURFACE_OFFSET = 0.72;
export const SWIM_MAX_DEPTH = 28;
export const SWIM_DIVE_SPEED = 3.6;
export const SWIM_ASCEND_SPEED = 4.8;
export const SWIM_FLOAT_SPEED = 1.15;
export const SWIM_OXYGEN_DRAIN = 7.5;
export const SWIM_OXYGEN_RECOVERY = 22;
export const SWIM_DROWN_DAMAGE = 5;

export interface SwimStepInput {
  y: number;
  waterLevel: number;
  solidFloorY: number;
  dt: number;
  dive: boolean;
  ascend: boolean;
  moving: boolean;
  breath: number;
  health: number;
}

export interface SwimStepResult {
  y: number;
  verticalVelocity: number;
  underwater: boolean;
  breath: number;
  health: number;
  damage: number;
}

export function stepSwimPhysics(input: SwimStepInput): SwimStepResult {
  const dt = Math.max(0, Math.min(Number.isFinite(input.dt) ? input.dt : 0, 0.05));
  const surfaceY = input.waterLevel - SWIM_SURFACE_OFFSET;
  const deepestY = Math.max(
    input.solidFloorY + 0.15,
    input.waterLevel - SWIM_MAX_DEPTH,
  );
  const startY = Math.max(
    deepestY,
    Math.min(surfaceY + 0.06, Number.isFinite(input.y) ? input.y : surfaceY),
  );

  let verticalVelocity = 0;
  if (input.dive) {
    verticalVelocity = -SWIM_DIVE_SPEED;
  } else if (input.ascend) {
    verticalVelocity = SWIM_ASCEND_SPEED;
  } else if (startY < surfaceY - 0.08) {
    // Keep a forward stroke at depth, but idle swimmers naturally float up.
    verticalVelocity = input.moving ? 0.16 : SWIM_FLOAT_SPEED;
  }

  const y = Math.max(
    deepestY,
    Math.min(surfaceY + 0.06, startY + verticalVelocity * dt),
  );
  const underwater = y + 1.18 < input.waterLevel - 0.04;
  let breath = Math.max(0, Math.min(100, input.breath));
  let health = input.health;
  let damage = 0;

  if (underwater) {
    breath = Math.max(0, breath - SWIM_OXYGEN_DRAIN * dt);
    if (breath <= 0) {
      damage = SWIM_DROWN_DAMAGE * dt;
      health = Math.max(0, health - damage);
    }
  } else {
    breath = Math.min(100, breath + SWIM_OXYGEN_RECOVERY * dt);
  }

  return {
    y,
    verticalVelocity,
    underwater,
    breath,
    health,
    damage,
  };
}
