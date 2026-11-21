import * as THREE from 'three';

export function fixGround(p: THREE.Object3D, groundY: number): void {
  if (Number.isFinite(groundY) && p.position.y < groundY) {
    p.position.y = groundY;
    p.userData.verticalVelocity = 0;
    p.userData.grounded = true;
  }
}

/**
 * Enforces stable ground collision for a player Object3D:
 * - Prevents falling below groundY (clamps Y, zeros downward velocity, marks grounded)
 * - Prevents micro-floating after landing (snaps Y within +0.02m when not actively jumping upward)
 * - Recovers cleanly from non-finite position/velocity/groundY values
 */
export function fixPlayerGroundCollision(
  player: THREE.Object3D,
  groundY: number,
  deltaTime: number,
): boolean {
  void deltaTime;
  const p = player.position;
  const safeGroundY = Number.isFinite(groundY) ? groundY : 0;

  if (!Number.isFinite(p.x)) p.x = 0;
  if (!Number.isFinite(p.z)) p.z = 0;

  const rawVelY = player.userData.verticalVelocity;
  const velY = typeof rawVelY === 'number' && Number.isFinite(rawVelY) ? rawVelY : 0;
  player.userData.verticalVelocity = velY;

  // Keep physics values stable
  if (!Number.isFinite(p.y)) {
    p.y = safeGroundY;
    player.userData.verticalVelocity = 0;
    player.userData.grounded = true;
    return true;
  }

  // Prevent player from falling below the ground
  if (p.y < safeGroundY) {
    p.y = safeGroundY;
    player.userData.verticalVelocity = 0;
    player.userData.grounded = true;
  } else if (p.y <= safeGroundY + 0.02 && velY <= 0) {
    // Prevent floating after landing without cancelling active upward jump takeoff
    p.y = safeGroundY;
    player.userData.verticalVelocity = 0;
    player.userData.grounded = true;
  } else {
    player.userData.grounded = false;
  }

  return player.userData.grounded === true;
}
