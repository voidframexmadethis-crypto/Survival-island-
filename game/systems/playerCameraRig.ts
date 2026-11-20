import * as THREE from 'three';

export type CameraViewMode = 'first_person' | 'third_person';

export interface PlayerCameraConfig {
  firstPersonEyeHeight: number;
  thirdPersonDistance: number;
  thirdPersonHeight: number;
  vehicleDistance: number;
  vehicleHeight: number;
  followResponsiveness: number;
  minGroundClearance: number;
}

export const DEFAULT_PLAYER_CAMERA_CONFIG: PlayerCameraConfig = {
  firstPersonEyeHeight: 1.65,
  thirdPersonDistance: 4.1,
  thirdPersonHeight: 2.05,
  vehicleDistance: 6.6,
  vehicleHeight: 2.45,
  followResponsiveness: 12,
  minGroundClearance: 0.65,
};

export class SmoothPlayerCameraRig {
  private readonly desiredPos = new THREE.Vector3();
  private readonly lookAtPos = new THREE.Vector3();
  private readonly forwardDir = new THREE.Vector3();

  public yaw = 0;
  public pitch = 0.08;
  public mode: CameraViewMode = 'third_person';

  /**
   * Applies drag or right-stick look deltas with clamped pitch so the camera never flips.
   */
  public applyLookDelta(deltaYaw: number, deltaPitch: number): void {
    this.yaw -= deltaYaw;
    this.pitch = THREE.MathUtils.clamp(this.pitch - deltaPitch, -0.75, 1.05);
  }

  public toggleMode(): CameraViewMode {
    this.mode = this.mode === 'third_person' ? 'first_person' : 'third_person';
    return this.mode;
  }

  /**
   * Zero-allocation immediate snap (used after teleports, spawns, world switches, or mode toggles).
   */
  public snapTo(
    camera: THREE.PerspectiveCamera,
    anchorPos: THREE.Vector3,
    isInVehicle: boolean,
    sampleGroundY?: (x: number, z: number) => number,
  ): void {
    this.update(camera, anchorPos, isInVehicle, 1.0, sampleGroundY, true);
  }

  /**
   * Zero-allocation per-frame camera update.
   * Pass a fast terrain/ground height sampler (math/heightmap lookup, NOT a heavy raycast).
   */
  public update(
    camera: THREE.PerspectiveCamera,
    anchorPos: THREE.Vector3,
    isInVehicle: boolean,
    dt: number,
    sampleGroundY?: (x: number, z: number) => number,
    immediate = false,
  ): void {
    const clampedDt = dt > 0 && dt < 0.05 ? dt : 0.01667;
    const alpha = immediate
      ? 1
      : 1 - Math.exp(-DEFAULT_PLAYER_CAMERA_CONFIG.followResponsiveness * clampedDt);

    const cosPitch = Math.cos(this.pitch);
    const sinPitch = Math.sin(this.pitch);
    const sinYaw = Math.sin(this.yaw);
    const cosYaw = Math.cos(this.yaw);

    if (!isInVehicle && this.mode === 'first_person') {
      this.desiredPos.set(
        anchorPos.x,
        anchorPos.y + DEFAULT_PLAYER_CAMERA_CONFIG.firstPersonEyeHeight,
        anchorPos.z,
      );
      if (immediate || camera.position.distanceToSquared(this.desiredPos) > 144) {
        camera.position.copy(this.desiredPos);
      } else {
        camera.position.lerp(this.desiredPos, alpha);
      }

      this.forwardDir.set(sinYaw * cosPitch, sinPitch, cosYaw * cosPitch);
      this.lookAtPos.copy(camera.position).add(this.forwardDir);
      camera.lookAt(this.lookAtPos);
      return;
    }

    const dist = isInVehicle
      ? DEFAULT_PLAYER_CAMERA_CONFIG.vehicleDistance
      : DEFAULT_PLAYER_CAMERA_CONFIG.thirdPersonDistance;
    const extraHeight = isInVehicle
      ? DEFAULT_PLAYER_CAMERA_CONFIG.vehicleHeight
      : DEFAULT_PLAYER_CAMERA_CONFIG.thirdPersonHeight;

    const backX = -sinYaw * cosPitch * dist;
    const backY = extraHeight + sinPitch * dist * 0.65;
    const backZ = -cosYaw * cosPitch * dist;

    this.desiredPos.set(anchorPos.x + backX, anchorPos.y + backY, anchorPos.z + backZ);

    // Cheap O(1) ground floor check so camera never dips below terrain
    if (sampleGroundY) {
      const groundAtCam = sampleGroundY(this.desiredPos.x, this.desiredPos.z);
      const minAllowedY = groundAtCam + DEFAULT_PLAYER_CAMERA_CONFIG.minGroundClearance;
      if (this.desiredPos.y < minAllowedY) {
        this.desiredPos.y = minAllowedY;
      }
    }

    if (immediate || camera.position.distanceToSquared(this.desiredPos) > 144) {
      camera.position.copy(this.desiredPos);
    } else {
      camera.position.lerp(this.desiredPos, alpha);
    }
    this.lookAtPos.set(
      anchorPos.x,
      anchorPos.y + (isInVehicle ? 1.15 : 1.35),
      anchorPos.z,
    );
    camera.lookAt(this.lookAtPos);
  }
}
