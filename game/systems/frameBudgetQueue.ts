import * as THREE from 'three';
import { SmoothPlayerCameraRig } from './playerCameraRig';

export interface FrameWatchState {
  lastTimeMs: number;
  frameCount: number;
  hitchCount: number;
  maxFrameMs: number;
}

export function createFrameWatchState(
  nowMs = typeof performance !== 'undefined' ? performance.now() : 0,
): FrameWatchState {
  return {
    lastTimeMs: nowMs,
    frameCount: 0,
    hitchCount: 0,
    maxFrameMs: 0,
  };
}

/**
 * Returns clamped dt in seconds (max 50ms) and flags frames > 20ms without allocating.
 */
export function stepClampedFrame(
  watch: FrameWatchState,
  nowMs: number,
  hitchThresholdMs = 20,
): { dt: number; isHitch: boolean; frameMs: number } {
  const rawMs = nowMs - watch.lastTimeMs;
  watch.lastTimeMs = nowMs;

  const frameMs = rawMs > 0 && rawMs < 1000 ? rawMs : 16.67;
  if (frameMs > watch.maxFrameMs) {
    watch.maxFrameMs = frameMs;
  }

  const isHitch = frameMs > hitchThresholdMs;
  if (isHitch) {
    watch.hitchCount += 1;
  }

  watch.frameCount += 1;
  const dt = Math.min(frameMs / 1000, 0.05);
  return { dt, isHitch, frameMs };
}

export function getRendererLoadSnapshot(renderer: THREE.WebGLRenderer) {
  const { calls, triangles } = renderer.info.render;
  const { geometries, textures } = renderer.info.memory;
  return { calls, triangles, geometries, textures };
}

export class FrameBudgetQueue {
  private readonly budgetMs: number;
  private queue: (() => void)[] = [];
  private head = 0;

  constructor(budgetMs = 3.5) {
    this.budgetMs = budgetMs;
  }

  public enqueue(taskFn: () => void): void {
    this.queue.push(taskFn);
  }

  public get pending(): number {
    return this.queue.length - this.head;
  }

  public clear(): void {
    this.queue.length = 0;
    this.head = 0;
  }

  public flush(): void {
    if (this.head >= this.queue.length) return;
    const start = performance.now();
    while (this.head < this.queue.length) {
      const task = this.queue[this.head++];
      task();
      if (performance.now() - start >= this.budgetMs) {
        break; // Yield to the next frame so movement stays smooth
      }
    }
    if (this.head >= this.queue.length) {
      this.queue.length = 0;
      this.head = 0;
    } else if (this.head > 64) {
      this.queue = this.queue.slice(this.head);
      this.head = 0;
    }
  }
}

export type ActiveModalKind =
  | 'none'
  | 'vault_store'
  | 'elevator_computer'
  | 'menu_drawer'
  | 'build_panel';

export interface MasterRuntimeState {
  activeModal: ActiveModalKind;
  isThirdPerson: boolean;
  isInVehicle: boolean;
  activeVehicleId: string | null;
  activeVehicleName: string | null;
  lastFrameMs: number;
  hitchCount: number;
  worstFrameMs: number;
  frameCount: number;
}

export function createMasterRuntimeState(
  nowMs = typeof performance !== 'undefined' ? performance.now() : 0,
): MasterRuntimeState {
  return {
    activeModal: 'none',
    isThirdPerson: true,
    isInVehicle: false,
    activeVehicleId: null,
    activeVehicleName: null,
    lastFrameMs: nowMs,
    hitchCount: 0,
    worstFrameMs: 0,
    frameCount: 0,
  };
}

/**
 * Blocks gameplay/movement/vehicle inputs whenever any modal or drawer is active.
 */
export function canProcessGameplayInput(state: MasterRuntimeState): boolean {
  if (typeof document !== 'undefined' && document.hidden) return false;
  return state.activeModal === 'none';
}

/**
 * Opens a modal exclusively and clears stale gameplay input states.
 */
export function openExclusiveModal(
  state: MasterRuntimeState,
  modal: Exclude<ActiveModalKind, 'none'>,
  clearInputs?: () => void,
): void {
  state.activeModal = modal;
  clearInputs?.();
}

export function closeExclusiveModal(
  state: MasterRuntimeState,
  clearInputs?: () => void,
): void {
  state.activeModal = 'none';
  clearInputs?.();
}

/**
 * Zero-allocation frame step with clamped delta and hitch detection (> 20ms).
 */
export function stepMasterFrame(
  state: MasterRuntimeState,
  nowMs: number,
  hitchThresholdMs = 20,
): { dt: number; frameMs: number; isHitch: boolean } {
  const rawMs = nowMs - state.lastFrameMs;
  state.lastFrameMs = nowMs;

  const frameMs = rawMs > 0 && rawMs < 1000 ? rawMs : 16.67;
  if (frameMs > state.worstFrameMs) {
    state.worstFrameMs = frameMs;
  }

  const isHitch = frameMs > hitchThresholdMs;
  if (isHitch) {
    state.hitchCount += 1;
  }

  state.frameCount += 1;
  const dt = Math.min(frameMs / 1000, 0.05);
  return { dt, frameMs, isHitch };
}

/**
 * Reusable camera rig math with zero per-frame Vector3 allocations.
 */
export class ZeroAllocCameraFollower {
  private readonly desiredPos = new THREE.Vector3();
  private readonly lookTarget = new THREE.Vector3();
  private readonly forwardVec = new THREE.Vector3();

  update(
    camera: THREE.PerspectiveCamera,
    targetPos: THREE.Vector3,
    yawRadians: number,
    isThirdPerson: boolean,
    isInVehicle: boolean,
    dt: number,
  ): void {
    const lerpAlpha = 1 - Math.exp(-10 * dt);

    if (!isThirdPerson && !isInVehicle) {
      // First-person eye height
      this.desiredPos.set(targetPos.x, targetPos.y + 1.65, targetPos.z);
      camera.position.lerp(this.desiredPos, lerpAlpha);

      this.forwardVec.set(Math.sin(yawRadians), 0, Math.cos(yawRadians));
      this.lookTarget.copy(camera.position).add(this.forwardVec);
      camera.lookAt(this.lookTarget);
      return;
    }

    // 3rd-person or driving chase camera (shows backpack skin or full car profile)
    const dist = isInVehicle ? 6.8 : 4.2;
    const height = isInVehicle ? 2.5 : 2.15;

    this.desiredPos.set(
      targetPos.x - Math.sin(yawRadians) * dist,
      targetPos.y + height,
      targetPos.z - Math.cos(yawRadians) * dist,
    );

    camera.position.lerp(this.desiredPos, lerpAlpha);
    this.lookTarget.set(
      targetPos.x,
      targetPos.y + (isInVehicle ? 1.1 : 1.35),
      targetPos.z,
    );
    camera.lookAt(this.lookTarget);
  }
}

export interface GameStartPayload {
  spawnX: number;
  spawnZ: number;
  spawnYaw: number;
  sampleGroundY: (x: number, z: number) => number;
  isThirdPerson?: boolean;
}

/**
 * Resets player, camera, and modal state cleanly every time a game starts or restarts.
 */
export function resetGameSession(
  playerPos: THREE.Vector3,
  playerYawRef: { value: number },
  camera: THREE.PerspectiveCamera,
  cameraRig: SmoothPlayerCameraRig,
  payload: GameStartPayload,
): MasterRuntimeState {
  const runtime = createMasterRuntimeState(
    typeof performance !== 'undefined' ? performance.now() : 0,
  );
  const groundY = payload.sampleGroundY(payload.spawnX, payload.spawnZ);

  playerPos.set(payload.spawnX, groundY, payload.spawnZ);
  playerYawRef.value = payload.spawnYaw;

  cameraRig.yaw = payload.spawnYaw;
  cameraRig.pitch = 0.08;
  cameraRig.mode = payload.isThirdPerson === false ? 'first_person' : 'third_person';
  runtime.isThirdPerson = cameraRig.mode === 'third_person';

  cameraRig.update(camera, playerPos, false, 0.016, payload.sampleGroundY, true);
  return runtime;
}
