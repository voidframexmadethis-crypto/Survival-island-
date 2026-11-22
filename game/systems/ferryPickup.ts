import type { ModularVehicleData } from '../types';

/**
 * Crescent City ferry pickup.
 *
 * The mainland is reached by the island ferry, not a menu teleport: the worker
 * walks up to the hilltop shelter, takes one of the player's parked cars and
 * drives it down the island road to the ferry pier while the player rides
 * shotgun. This module owns the deterministic route/state machine; the engine
 * owns the meshes, camera, doors and vehicle physics hand-off.
 */

export const FERRY_CALL_POS = { x: -44, z: 134 } as const;
export const FERRY_WORKER_SPAWN = { x: -38, z: 116 } as const;
export const FERRY_SHELTER_STOP = { x: -62, z: 128 } as const;
export const FERRY_DOCK_CAR_STOP = { x: 22, z: 674 } as const;
export const FERRY_DOCK_BOAT_POS = { x: 26, z: 697 } as const;
export const FERRY_PICKUP_RANGE = 58;

/** Wide, gently curving access route from the hilltop garage to the south pier. */
export const FERRY_DRIVE_ROUTE: readonly { x: number; z: number }[] = [
  { x: -48, z: 176 },
  { x: -28, z: 212 },
  { x: 2, z: 250 },
  { x: 22, z: 290 },
  { x: 48, z: 330 },
  { x: 68, z: 365 },
  // Join the main north-south boulevard rather than clipping city blocks.
  { x: 72, z: 400 },
  { x: 72, z: 440 },
  { x: 64, z: 470 },
  // Pass the terminal in the outside lane instead of through its kiosk.
  { x: 64, z: 505 },
  { x: 64, z: 520 },
  { x: 50, z: 545 },
  { x: 35, z: 575 },
  { x: 22, z: 615 },
  { x: 22, z: 650 },
  { x: FERRY_DOCK_CAR_STOP.x, z: FERRY_DOCK_CAR_STOP.z },
];

const WALK_SPEED = 4.1;
const DRIVE_SPEED = 18.5;
const TURN_RATE = 1.35;

export type FerryPickupPhase =
  | 'idle'
  | 'worker_walking'
  | 'waiting_for_passenger'
  | 'driving'
  | 'arrived';

export interface FerryPickupStatus {
  phase: FerryPickupPhase;
  carId: string | null;
  carName: string | null;
  workerX: number;
  workerY: number;
  workerZ: number;
  workerYaw: number;
  workerMoving: boolean;
  passengerAboard: boolean;
  routeIndex: number;
  speed: number;
  distanceToDock: number;
  label: string;
}

export interface FerryPickupUpdate {
  phaseChanged: boolean;
  arrived: boolean;
  workerMoving: boolean;
  driving: boolean;
}

export interface FerryPickupResult {
  ok: boolean;
  message: string;
}

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

function normalizeAngle(value: number): number {
  let angle = value;
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

function distanceSq(ax: number, az: number, bx: number, bz: number): number {
  const dx = ax - bx;
  const dz = az - bz;
  return dx * dx + dz * dz;
}

function driverDoorPoint(car: ModularVehicleData): { x: number; z: number } {
  // Driver seat is the local -X side of every car in this project.
  return {
    x: car.x - Math.cos(car.yaw) * 1.45,
    z: car.z + Math.sin(car.yaw) * 1.45,
  };
}

/**
 * Picks the nearest player-owned land vehicle to the shelter. Boats and
 * vehicles in another dimension are deliberately excluded; the worker needs a
 * car that can actually make the road drive to the pier.
 */
export function selectFerryCar(
  vehicles: readonly ModularVehicleData[],
  shelter: { x: number; z: number } = FERRY_CALL_POS,
  maxDistance: number = FERRY_PICKUP_RANGE,
): ModularVehicleData | null {
  let best: ModularVehicleData | null = null;
  let bestDistSq = maxDistance * maxDistance;
  for (let i = 0; i < vehicles.length; i++) {
    const vehicle = vehicles[i];
    if (vehicle.preset === 'steam_boat') continue;
    if (vehicle.dimension && vehicle.dimension !== 'overworld') continue;
    const distSq = distanceSq(vehicle.x, vehicle.z, shelter.x, shelter.z);
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      best = vehicle;
    }
  }
  return best;
}

export class FerryPickupSystem {
  phase: FerryPickupPhase = 'idle';
  carId: string | null = null;
  carName: string | null = null;
  workerX: number = FERRY_WORKER_SPAWN.x;
  workerY = 0;
  workerZ: number = FERRY_WORKER_SPAWN.z;
  workerYaw = 0;
  workerMoving = false;
  passengerAboard = false;
  routeIndex = 0;
  speed = 0;
  private workerStage = 0;

  reset(): void {
    this.phase = 'idle';
    this.carId = null;
    this.carName = null;
    this.workerX = FERRY_WORKER_SPAWN.x;
    this.workerY = 0;
    this.workerZ = FERRY_WORKER_SPAWN.z;
    this.workerYaw = 0;
    this.workerMoving = false;
    this.passengerAboard = false;
    this.routeIndex = 0;
    this.speed = 0;
    this.workerStage = 0;
  }

  request(car: ModularVehicleData): FerryPickupResult {
    if (this.phase !== 'idle') {
      return { ok: false, message: 'The ferry worker is already on a pickup.' };
    }
    if (!car) {
      return { ok: false, message: 'Park one of your cars beside the shelter first.' };
    }
    this.reset();
    this.phase = 'worker_walking';
    this.carId = car.id;
    this.carName = car.name || 'your car';
    this.workerStage = 0;
    this.workerMoving = true;
    return {
      ok: true,
      message: `Ferry worker is walking up to the shelter. He'll take the ${this.carName}.`,
    };
  }

  boardPassenger(car: ModularVehicleData | null): boolean {
    if (this.phase !== 'waiting_for_passenger' || !car || car.id !== this.carId) {
      return false;
    }
    this.phase = 'driving';
    this.passengerAboard = true;
    this.routeIndex = 0;
    this.speed = 0;
    car.passengerDoorOpen = true;
    return true;
  }

  /** Called after the ferry has crossed and the engine has placed the car in the city. */
  completeCrossing(): void {
    this.reset();
  }

  cancel(): void {
    this.reset();
  }

  getStatus(): FerryPickupStatus {
    let label = '';
    if (this.phase === 'worker_walking') {
      label = `Ferry worker walking to the shelter for ${this.carName ?? 'your car'}`;
    } else if (this.phase === 'waiting_for_passenger') {
      label = `Ride shotgun in ${this.carName ?? 'your car'} — worker at the wheel`;
    } else if (this.phase === 'driving') {
      label = `Ferry worker driving ${this.carName ?? 'your car'} to the landing`;
    } else if (this.phase === 'arrived') {
      label = 'Car loaded at the island ferry pier';
    }
    return {
      phase: this.phase,
      carId: this.carId,
      carName: this.carName,
      workerX: this.workerX,
      workerY: this.workerY,
      workerZ: this.workerZ,
      workerYaw: this.workerYaw,
      workerMoving: this.workerMoving,
      passengerAboard: this.passengerAboard,
      routeIndex: this.routeIndex,
      speed: this.speed,
      distanceToDock: Math.hypot(
        this.workerX - FERRY_DOCK_CAR_STOP.x,
        this.workerZ - FERRY_DOCK_CAR_STOP.z,
      ),
      label,
    };
  }

  /**
   * Allocation-free update. The car is mutated only while the worker is
   * driving; walking is handled independently so the player can still move
   * around the shelter before boarding.
   */
  update(
    rawDt: number,
    car: ModularVehicleData | null,
    sampleGround: (x: number, z: number) => number,
  ): FerryPickupUpdate {
    const dt = clamp(rawDt, 0, 0.05);
    const previousPhase = this.phase;
    let arrived = false;

    if (dt <= 0 || this.phase === 'idle') {
      return {
        phaseChanged: false,
        arrived: false,
        workerMoving: false,
        driving: false,
      };
    }

    if (this.phase === 'worker_walking') {
      if (!car || car.id !== this.carId) {
        this.workerMoving = false;
        return {
          phaseChanged: false,
          arrived: false,
          workerMoving: false,
          driving: false,
        };
      }
      const target =
        this.workerStage === 0 ? FERRY_SHELTER_STOP : driverDoorPoint(car);
      const dx = target.x - this.workerX;
      const dz = target.z - this.workerZ;
      const dist = Math.hypot(dx, dz);
      this.workerMoving = true;
      this.workerYaw = Math.atan2(dx, dz);
      if (dist <= 0.9) {
        this.workerX = target.x;
        this.workerZ = target.z;
        this.workerY = sampleGround(target.x, target.z);
        if (this.workerStage === 0) {
          this.workerStage = 1;
        } else {
          this.phase = 'waiting_for_passenger';
          this.workerMoving = false;
        }
      } else {
        const step = Math.min(dist, WALK_SPEED * dt);
        this.workerX += (dx / dist) * step;
        this.workerZ += (dz / dist) * step;
        this.workerY = sampleGround(this.workerX, this.workerZ);
      }
    } else if (this.phase === 'waiting_for_passenger') {
      this.workerMoving = false;
      if (car && car.id === this.carId) {
        const door = driverDoorPoint(car);
        this.workerX = door.x;
        this.workerZ = door.z;
        this.workerY = sampleGround(door.x, door.z);
        this.workerYaw = Math.atan2(car.x - door.x, car.z - door.z);
      }
    } else if (this.phase === 'driving') {
      if (!car || car.id !== this.carId) {
        this.workerMoving = false;
        return {
          phaseChanged: false,
          arrived: false,
          workerMoving: false,
          driving: false,
        };
      }
      const waypoint = FERRY_DRIVE_ROUTE[Math.min(this.routeIndex, FERRY_DRIVE_ROUTE.length - 1)];
      const dx = waypoint.x - car.x;
      const dz = waypoint.z - car.z;
      const dist = Math.hypot(dx, dz);
      const desiredYaw = Math.atan2(dx, dz);
      const diff = normalizeAngle(desiredYaw - car.yaw);
      const maxTurn = TURN_RATE * dt;
      car.yaw = normalizeAngle(car.yaw + clamp(diff, -maxTurn, maxTurn));

      const isLastLeg = this.routeIndex >= FERRY_DRIVE_ROUTE.length - 1;
      const targetSpeed = isLastLeg ? Math.min(DRIVE_SPEED, Math.max(2.5, dist * 1.6)) : DRIVE_SPEED;
      this.speed = THREE_LIKE_DAMP(this.speed, targetSpeed, isLastLeg ? 2.4 : 1.35, dt);

      const move = this.speed * dt;
      if (dist <= Math.max(2.4, move)) {
        car.x = waypoint.x;
        car.z = waypoint.z;
        this.routeIndex += 1;
        if (this.routeIndex >= FERRY_DRIVE_ROUTE.length) {
          this.phase = 'arrived';
          this.speed = 0;
          this.workerMoving = false;
          car.vx = 0;
          car.vz = 0;
          arrived = true;
        }
      } else {
        car.x += Math.sin(car.yaw) * move;
        car.z += Math.cos(car.yaw) * move;
        car.vx = Math.sin(car.yaw) * this.speed;
        car.vz = Math.cos(car.yaw) * this.speed;
        this.workerMoving = this.speed > 0.2;
      }
      car.y = sampleGround(car.x, car.z) + 0.14;
    } else if (this.phase === 'arrived') {
      this.workerMoving = false;
      this.speed = 0;
    }

    return {
      phaseChanged: this.phase !== previousPhase,
      arrived,
      workerMoving: this.workerMoving,
      driving: this.phase === 'driving',
    };
  }
}

/** Small exponential damp helper kept local to stay dependency-free. */
function THREE_LIKE_DAMP(current: number, target: number, lambda: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}
