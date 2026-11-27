import * as THREE from 'three';
import {
  SmoothPlayerCameraRig,
  ZeroStutterCameraController,
} from './playerCameraRig';

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
  cameraRig: SmoothPlayerCameraRig | ZeroStutterCameraController,
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

  cameraRig.snapTo(camera, playerPos, false, payload.sampleGroundY);
  return runtime;
}

export interface StepHandlers {
  onFixedStep: (fixedDt: number) => void;
  onRender: (alpha: number, elapsedSeconds: number) => void;
}

export class Permanent60FpsController {
  public static readonly TARGET_FPS = 60;
  public static readonly FIXED_DT = 1 / 60;
  public static readonly FRAME_BUDGET_MS = 1000 / 60;

  private rafId: number | null = null;
  private lastNowMs = 0;
  private accumulator = 0;
  private renderAccumulatorMs = 0;
  private elapsedSeconds = 0;
  private running = false;

  public resetTiming(): void {
    const now = typeof performance !== 'undefined' ? performance.now() : 0;
    this.lastNowMs = now;
    this.accumulator = 0;
    this.renderAccumulatorMs = 0;
  }

  public start(handlers: StepHandlers): void {
    if (this.running) return;
    if (typeof requestAnimationFrame === 'undefined') return;
    this.running = true;
    const now = typeof performance !== 'undefined' ? performance.now() : 0;
    this.lastNowMs = now;
    this.accumulator = 0;
    this.renderAccumulatorMs = 0;

    const tick = (currentMs: number) => {
      if (!this.running) return;
      this.rafId = requestAnimationFrame(tick);

      if (typeof document !== 'undefined' && document.hidden) {
        this.lastNowMs = currentMs;
        this.accumulator = 0;
        this.renderAccumulatorMs = 0;
        return;
      }

      const rawDtMs = Math.max(0, currentMs - this.lastNowMs);
      const rawDt = Math.min(rawDtMs / 1000, 0.05);
      this.lastNowMs = currentMs;

      if (rawDt <= 0) return;

      this.elapsedSeconds += rawDt;
      this.accumulator += rawDt;

      // Cap substeps per frame to 3 so heavy frames stay bounded
      let substeps = 0;
      while (this.accumulator >= Permanent60FpsController.FIXED_DT && substeps < 3) {
        handlers.onFixedStep(Permanent60FpsController.FIXED_DT);
        this.accumulator -= Permanent60FpsController.FIXED_DT;
        substeps++;
      }
      if (substeps === 3 && this.accumulator > Permanent60FpsController.FIXED_DT) {
        this.accumulator = Permanent60FpsController.FIXED_DT;
      }
      // Do not let a tab switch, asset load or long frame leave a backlog that
      // fires back-to-back renders afterwards. That catch-up burst reads as a
      // second stutter even though the original hitch is already over.
      if (rawDtMs > 100) {
        this.accumulator = 0;
        this.renderAccumulatorMs = 0;
      }

      // Render on a true 60 FPS cadence. Rendering every display refresh made
      // 90/120/144 Hz devices do 1.5-2.4x the GPU work, which heated phones and
      // produced periodic throttling stutter. A small tolerance keeps native
      // 60 Hz panels from skipping frames, while the accumulator still averages
      // 60 renders/second on 75, 90, 120 and 144 Hz displays.
      //
      // Keep the fractional overshoot so 90/120/144 Hz displays average a true
      // 60 renders/second instead of losing time on every cadence cycle.
      const nextRenderAccumulator = this.renderAccumulatorMs + rawDtMs;
      if (
        nextRenderAccumulator + 1.5 <
        Permanent60FpsController.FRAME_BUDGET_MS
      ) {
        this.renderAccumulatorMs = nextRenderAccumulator;
        return;
      }
      // A genuinely long frame must not leave render debt. Preserve normal
      // overshoot for high-refresh pacing, but clear the backlog after a hitch.
      const longFrame = rawDtMs > 30;
      this.renderAccumulatorMs = longFrame
        ? 0
        : Math.min(
            Math.max(0, nextRenderAccumulator - Permanent60FpsController.FRAME_BUDGET_MS),
            Permanent60FpsController.FRAME_BUDGET_MS * 0.5,
          );

      const alpha = this.accumulator / Permanent60FpsController.FIXED_DT;
      handlers.onRender(alpha, this.elapsedSeconds);
    };

    this.rafId = requestAnimationFrame(tick);
  }

  public stop(): void {
    this.running = false;
    if (this.rafId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}

