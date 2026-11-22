/**
 * Frame-rate governor.
 *
 * Keeps presentation at 60 FPS by trimming internal render resolution in small,
 * discrete steps when the GPU is consistently behind, and restoring it once
 * there is sustained headroom. Resolution is the cheapest lever that preserves
 * gameplay, world geometry and shader programs (no shader recompiles, unlike
 * toggling presets mid-game).
 *
 * The logic is intentionally pure and allocation-free so it can be unit-tested
 * and sampled from the render loop without adding garbage.
 */

export interface FrameRateGovernorOptions {
  targetFps?: number;
  /** Lowest multiplier applied to the preset's base pixel ratio. */
  minScale?: number;
  /** Highest multiplier applied to the preset's base pixel ratio. */
  maxScale?: number;
  /** Milliseconds of warm-up ignored after a reset (menu load, world build). */
  startupGraceMs?: number;
  /** Rolling window used to compute the average frame rate. */
  sampleWindowMs?: number;
  /** Drop a step when the window average falls below this. */
  downFps?: number;
  /** Restore a step after this many healthy windows. */
  upFps?: number;
  upWindows?: number;
  /** Frames longer than this are treated as tab-switch/loading stalls, not GPU load. */
  stallFrameMs?: number;
  /** A frame at or above this duration counts toward an immediate quality drop. */
  severeFrameMs?: number;
  /** Consecutive severe frames that force a drop before the sample window closes. */
  severeFrameLimit?: number;
  /** Optional discrete scale ladder; defaults to an 8% stepped ladder. */
  steps?: readonly number[];
}

export const DEFAULT_RENDER_SCALE_STEPS = [1, 0.92, 0.84, 0.76, 0.68, 0.6] as const;

export class FrameRateGovernor {
  private readonly targetFps: number;
  private readonly maxScale: number;
  private readonly startupGraceMs: number;
  private readonly sampleWindowMs: number;
  private readonly downFps: number;
  private readonly upFps: number;
  private readonly upWindows: number;
  private readonly stallFrameMs: number;
  private readonly severeFrameMs: number;
  private readonly severeFrameLimit: number;
  private readonly steps: readonly number[];

  private level = 0;
  private startedAtMs = 0;
  private windowStartMs = 0;
  private windowFrames = 0;
  private windowFrameMs = 0;
  private healthyWindows = 0;
  private lastFps = 0;
  private settleWindows = 0;
  private severeFrames = 0;

  constructor(options: FrameRateGovernorOptions = {}) {
    this.targetFps = Math.max(30, options.targetFps ?? 60);
    this.maxScale = Math.max(0.25, Math.min(2, options.maxScale ?? 1));
    const minScale = Math.max(0.25, Math.min(this.maxScale, options.minScale ?? 0.6));
    const ladder = (options.steps ?? DEFAULT_RENDER_SCALE_STEPS)
      .filter((step) => step >= minScale - 1e-6 && step <= this.maxScale + 1e-6)
      .sort((a, b) => b - a);
    this.steps = ladder.length > 0 ? ladder : [this.maxScale];
    this.startupGraceMs = Math.max(0, options.startupGraceMs ?? 2600);
    this.sampleWindowMs = Math.max(250, options.sampleWindowMs ?? 1000);
    // Wider dead zone + more healthy windows before scaling back up: the
    // governor should not hunt between two resolution rungs every few seconds,
    // because each change reallocates the framebuffer (a one-frame hitch).
    this.downFps = Math.min(this.targetFps - 0.5, options.downFps ?? 54);
    this.upFps = Math.min(this.targetFps + 4, options.upFps ?? 59);
    this.upWindows = Math.max(1, Math.round(options.upWindows ?? 8));
    this.stallFrameMs = Math.max(60, options.stallFrameMs ?? 220);
    this.severeFrameMs = Math.max(24, options.severeFrameMs ?? 34);
    this.severeFrameLimit = Math.max(1, Math.round(options.severeFrameLimit ?? 2));
  }

  /** Multiplier currently applied to the preset base pixel ratio. */
  get scale(): number {
    return this.steps[Math.min(this.steps.length - 1, this.level)];
  }

  /** 0 = full resolution, steps.length-1 = lowest resolution. */
  get tier(): number {
    return this.level;
  }

  /** Last completed window's measured FPS (0 before the first window closes). */
  get fps(): number {
    return this.lastFps;
  }

  get atFloor(): boolean {
    return this.level >= this.steps.length - 1;
  }

  get atCeiling(): boolean {
    return this.level <= 0;
  }

  reset(nowMs = performance.now()): void {
    this.level = 0;
    this.startedAtMs = nowMs;
    this.windowStartMs = nowMs;
    this.windowFrames = 0;
    this.windowFrameMs = 0;
    this.healthyWindows = 0;
    this.lastFps = 0;
    this.settleWindows = 0;
    this.severeFrames = 0;
  }

  /**
   * Records one presented frame. Returns true when the caller should re-apply
   * the render scale (at most once per sample window).
   */
  noteFrame(frameMs: number, nowMs = performance.now()): boolean {
    if (!Number.isFinite(frameMs) || frameMs <= 0) return false;

    if (this.startedAtMs === 0) this.reset(nowMs);
    if (nowMs < this.startedAtMs + this.startupGraceMs) {
      this.windowStartMs = nowMs;
      this.windowFrames = 0;
      this.windowFrameMs = 0;
      return false;
    }

    // A backgrounded tab or an asset load stall must not force a permanent downgrade.
    if (frameMs > this.stallFrameMs) {
      this.windowStartMs = nowMs;
      this.windowFrames = 0;
      this.windowFrameMs = 0;
      return false;
    }

    // Emergency fast path: a short burst of visibly long frames should trim
    // render scale immediately instead of waiting for a full one-second window.
    if (frameMs >= this.severeFrameMs) {
      this.severeFrames += 1;
    } else {
      this.severeFrames = Math.max(0, this.severeFrames - 1);
    }
    if (
      this.severeFrames >= this.severeFrameLimit &&
      this.settleWindows === 0 &&
      this.level < this.steps.length - 1
    ) {
      this.level += 1;
      this.severeFrames = 0;
      this.healthyWindows = 0;
      this.settleWindows = 1;
      this.windowStartMs = nowMs;
      this.windowFrames = 0;
      this.windowFrameMs = 0;
      return true;
    }

    this.windowFrames += 1;
    this.windowFrameMs += frameMs;

    const windowMs = nowMs - this.windowStartMs;
    if (windowMs < this.sampleWindowMs || this.windowFrames < 8) return false;

    const fps = (this.windowFrames * 1000) / this.windowFrameMs;
    this.lastFps = fps;
    this.windowStartMs = nowMs;
    this.windowFrames = 0;
    this.windowFrameMs = 0;

    if (this.settleWindows > 0) {
      // Give a fresh resolution two clean windows to prove itself before judging.
      this.settleWindows -= 1;
      this.healthyWindows = 0;
      return false;
    }

    if (fps < this.downFps) {
      this.healthyWindows = 0;
      if (this.level < this.steps.length - 1) {
        this.level += 1;
        this.settleWindows = 2;
        return true;
      }
      return false;
    }

    if (fps >= this.upFps) {
      this.healthyWindows += 1;
      if (this.level > 0 && this.healthyWindows >= this.upWindows) {
        this.level -= 1;
        this.healthyWindows = 0;
        this.settleWindows = 2;
        return true;
      }
    } else {
      this.healthyWindows = 0;
    }

    return false;
  }
}
