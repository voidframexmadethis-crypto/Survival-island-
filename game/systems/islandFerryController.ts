export interface Vec3Like {
  x: number;
  y: number;
  z: number;
}

export interface FerryEntity {
  id: string;
  position: Vec3Like;
  yaw: number;
  speed: number;
  isMoving: boolean;
  headingToMainland: boolean;
}

/**
 * Allocation-free fixed-step movement for the island / Louisiana mainland
 * ferry. The engine calls `stepFixed` once per locked 1/60 simulation step, so
 * the hull advances by `speed * fixedDt` and never jumps on a wall-clock tick.
 * The passenger is moved by the same delta, keeping them on the deck.
 */
export class IslandFerryController {
  public readonly islandDock: Vec3Like;
  public readonly mainlandDock: Vec3Like;
  private readonly arriveThresholdSq = 4.0; // 2 meters squared

  constructor(islandDock: Vec3Like, mainlandDock: Vec3Like) {
    this.islandDock = { ...islandDock };
    this.mainlandDock = { ...mainlandDock };
  }

  /** Call when the player boards / presses "Leave Island / Sail to Mainland". */
  public departToMainland(ferry: FerryEntity): void {
    ferry.headingToMainland = true;
    ferry.isMoving = true;
  }

  public departToIsland(ferry: FerryEntity): void {
    ferry.headingToMainland = false;
    ferry.isMoving = true;
  }

  public toggleRoute(ferry: FerryEntity): void {
    ferry.headingToMainland = !ferry.headingToMainland;
    ferry.isMoving = true;
  }

  /**
   * Call once per fixed 60 FPS step (FIXED_DT = 1/60).
   * Returns true on the exact step the ferry reaches its destination dock.
   */
  public stepFixed(
    ferry: FerryEntity,
    passengerPos: Vec3Like | null,
    fixedDt: number,
  ): boolean {
    if (!ferry.isMoving) return false;

    const target = ferry.headingToMainland ? this.mainlandDock : this.islandDock;
    const dx = target.x - ferry.position.x;
    const dy = target.y - ferry.position.y;
    const dz = target.z - ferry.position.z;
    const distSq = dx * dx + dy * dy + dz * dz;

    if (distSq <= this.arriveThresholdSq) {
      ferry.position.x = target.x;
      ferry.position.y = target.y;
      ferry.position.z = target.z;
      ferry.isMoving = false;

      if (passengerPos) {
        passengerPos.x = target.x;
        passengerPos.y = target.y + 1.5;
        passengerPos.z = target.z;
      }
      return true;
    }

    const dist = Math.sqrt(distSq);
    const stepDist = Math.min(dist, ferry.speed * fixedDt);
    const nx = dx / dist;
    const ny = dy / dist;
    const nz = dz / dist;

    const prevX = ferry.position.x;
    const prevY = ferry.position.y;
    const prevZ = ferry.position.z;

    ferry.position.x += nx * stepDist;
    ferry.position.y += ny * stepDist;
    ferry.position.z += nz * stepDist;

    // Face movement direction smoothly
    ferry.yaw = Math.atan2(nx, nz);

    // Move player/car along with the ferry without allocations
    if (passengerPos) {
      passengerPos.x += ferry.position.x - prevX;
      passengerPos.y += ferry.position.y - prevY;
      passengerPos.z += ferry.position.z - prevZ;
    }

    return false;
  }
}
