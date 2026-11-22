import { clamp, sampleAtDistance, trackLength } from './track';
import type { TrackPointKind, TrackSample, TrainTelemetry } from './types';

export type TrainRunState = 'stopped' | 'running' | 'arriving' | 'stalled';

export interface SimTrain {
  id: number;
  s: number;
  v: number;
  state: TrainRunState;
  lap: number;
  hasLeftStation: boolean;
  block: number;
}

export interface SimulationOptions {
  gravity?: number;
  rollingResistance?: number;
  drag?: number;
  chainSpeed?: number;
  cableSpeed?: number;
  launchAccel?: number;
  launchSpeed?: number;
  /** Per-control-point launch targets, indexed by pointIndex. */
  targetSpeeds?: (number | undefined)[];
  emptyTrainMassKg?: number;
  riderMassKg?: number;
  ridersPerTrain?: number;
}

const SUBSTEP = 1 / 120;

export class CoasterSimulation {
  readonly samples: TrackSample[];
  readonly closed: boolean;
  readonly trains: SimTrain[] = [];
  readonly options: Required<SimulationOptions>;
  private stationDistance = 0;
  private stationExitDistance = 12;
  private accumulator = 0;
  private total = 0;
  private blockBounds: number[] = [];

  constructor(samples: TrackSample[], closed: boolean, trainCount = 1, options: SimulationOptions = {}) {
    this.samples = samples;
    this.closed = closed;
    this.options = {
      gravity: options.gravity ?? 9.81,
      rollingResistance: options.rollingResistance ?? 0.025,
      drag: options.drag ?? 0.0009,
      chainSpeed: options.chainSpeed ?? 7,
      cableSpeed: options.cableSpeed ?? 11,
      launchAccel: options.launchAccel ?? 14,
      launchSpeed: options.launchSpeed ?? 34,
      targetSpeeds: options.targetSpeeds ?? [],
      emptyTrainMassKg: options.emptyTrainMassKg ?? 7200,
      riderMassKg: options.riderMassKg ?? 78,
      ridersPerTrain: options.ridersPerTrain ?? 0,
    };
    this.total = trackLength(samples);
    this.findStation();
    this.findBlocks();
    this.setTrainCount(trainCount);
  }

  private findStation(): void {
    const index = this.samples.findIndex((s) => s.kind === 'station');
    this.stationDistance = index >= 0 ? this.samples[index].distance : 0;
    let i = index >= 0 ? index : 0;
    let end = this.stationDistance;
    // Station is normally at the start; scan circularly for the end of the
    // contiguous boarding section.
    for (let count = 0; count < this.samples.length; count++) {
      const sample = this.samples[(i + count) % this.samples.length];
      if (sample.kind !== 'station') break;
      end = sample.distance;
    }
    this.stationExitDistance = Math.max(this.stationDistance + 8, end);
  }

  private findBlocks(): void {
    const     bounds: number[] = [0];
    for (const sample of this.samples) {
      if (
        (sample.kind === 'block_brake' || sample.kind === 'unload_station' || sample.kind === 'storage') &&
        sample.distance > 1
      ) {
        bounds.push(sample.distance);
      }
    }
    if (bounds.length === 1 && this.total > 0) {
      // No block brakes: automatic block boundaries still isolate the platform
      // and keep enough spacing for multi-train operation.
      bounds.push(this.stationExitDistance);
      for (const fraction of [0.25, 0.5, 0.75]) bounds.push(this.total * fraction);
    }
    bounds.sort((a, b) => a - b);
    this.blockBounds = bounds.filter(
      (bound, index) => bound < this.total && (index === 0 || bound - bounds[index - 1] > 3),
    );
    if (this.blockBounds.length === 0) this.blockBounds = [0];
  }

  get length(): number {
    return this.total;
  }

  get riders(): number {
    return this.options.ridersPerTrain;
  }

  get massKg(): number {
    return this.options.emptyTrainMassKg + this.options.ridersPerTrain * this.options.riderMassKg;
  }

  get station(): { start: number; end: number } {
    return { start: this.stationDistance, end: this.stationExitDistance };
  }

  setTrainCount(count: number): void {
    const target = clamp(Math.round(count), 1, 3);
    while (this.trains.length > target) this.trains.pop();
    while (this.trains.length < target) {
      const index = this.trains.length;
      this.trains.push({
        id: index,
        // Queue trains front-to-back inside the boarding block so a dispatched
        // train never starts behind a waiting train.
        s: this.stationDistance + 6.5 - index * 2,
        v: 0,
        state: 'stopped',
        lap: 0,
        hasLeftStation: false,
        block: 0,
      });
    }
  }

  reset(): void {
    this.accumulator = 0;
    this.trains.forEach((train, index) => {
      train.s = this.stationDistance + 6.5 - index * 2;
      train.v = 0;
      train.state = 'stopped';
      train.lap = 0;
      train.hasLeftStation = false;
      train.block = 0;
    });
  }

  blockForDistance(distance: number): number {
    let block = 0;
    for (let i = 0; i < this.blockBounds.length; i++) {
      if (distance >= this.blockBounds[i]) block = i;
    }
    return block;
  }

  nextBlockClear(train: SimTrain): boolean {
    if (this.trains.length <= 1) return true;
    const currentBlock = this.blockForDistance(train.s);
    const nextBlock = (currentBlock + 1) % Math.max(1, this.blockBounds.length);
    return !this.trains.some((other) => {
      if (other.id === train.id) return false;
      const block = this.blockForDistance(other.s);
      // A moving train still in the boarding block holds the platform.
      const holdsPlatform =
        block === currentBlock && (other.state === 'running' || other.state === 'arriving');
      const holdsNextBlock = block === nextBlock;
      return holdsPlatform || holdsNextBlock;
    });
  }

  dispatch(trainId = 0): boolean {
    const train = this.trains.find((t) => t.id === trainId);
    if (!train || !this.closed) return false;
    if (train.state === 'running' || train.state === 'arriving') return false;
    if (!this.nextBlockClear(train)) return false;
    train.state = 'running';
    train.v = Math.max(2.4, train.v);
    train.hasLeftStation = true;
    return true;
  }

  stopAll(): void {
    this.trains.forEach((train) => {
      train.v = 0;
      if (train.state === 'running') train.state = 'stopped';
    });
  }

  step(dt: number): void {
    const clamped = Math.min(0.1, Math.max(0, dt));
    this.accumulator += clamped;
    let guard = 0;
    while (this.accumulator >= SUBSTEP && guard < 10) {
      this.fixedStep(SUBSTEP);
      this.accumulator -= SUBSTEP;
      guard += 1;
    }
  }

  private fixedStep(dt: number): void {
    if (!this.samples.length) return;
    for (const train of this.trains) {
      if (train.state === 'stopped' || train.state === 'stalled') {
        train.v = 0;
        continue;
      }
      const sample = sampleAtDistance(this.samples, train.s);
      if (!sample) continue;
      const inStation = this.isInStation(train.s);
      const arriving = inStation && train.lap > 0;
      const powered =
        sample.kind === 'chain_lift' ||
        sample.kind === 'cable_lift' ||
        sample.kind === 'launch' ||
        sample.kind === 'brake' ||
        sample.kind === 'magnetic_brake' ||
        sample.kind === 'station' ||
        sample.kind === 'unload_station' ||
        sample.kind === 'storage';

      if (arriving) {
        train.state = 'arriving';
        train.v = Math.max(0, train.v - 3.4 * dt);
      } else {
        train.state = 'running';
        let acceleration = -this.options.gravity * sample.tangent.y;
        // A loaded train carries more momentum: rolling resistance and aero
        // drag decelerate it less than an empty train with the same frontal area.
        const massRatio = this.massKg > 0 ? this.options.emptyTrainMassKg / this.massKg : 1;
        acceleration -= this.options.rollingResistance * Math.sign(train.v) * massRatio;
        acceleration -= this.options.drag * train.v * Math.abs(train.v) * massRatio;

        if (sample.kind === 'chain_lift') {
          acceleration += (this.options.chainSpeed - train.v) * 2.2;
        } else if (sample.kind === 'cable_lift') {
          acceleration += (this.options.cableSpeed - train.v) * 2.4;
        } else if (sample.kind === 'launch') {
          const target = this.options.targetSpeeds[sample.pointIndex] ?? this.options.launchSpeed;
          if (train.v < target) acceleration += this.options.launchAccel;
        } else if (sample.kind === 'brake') {
          train.v = Math.max(1.5, train.v - 7.5 * dt);
          acceleration = 0;
        } else if (sample.kind === 'magnetic_brake') {
          train.v = Math.max(1.2, train.v - 4.5 * dt);
          acceleration = 0;
        } else if (sample.kind === 'block_brake') {
          train.v = Math.max(0, train.v - 20 * dt);
          acceleration = 0;
        } else if (sample.kind === 'station') {
          // Station drive tires carry the train clear of the platform.
          acceleration += (6 - train.v) * 2.6;
        } else if (sample.kind === 'unload_station') {
          train.v = Math.max(0.8, train.v - 6.5 * dt);
          acceleration = 0;
        } else if (sample.kind === 'storage') {
          train.v = Math.max(0, train.v - 12 * dt);
          acceleration = 0;
        }

        train.v += acceleration * dt;
        if (!powered && train.v < 0.15 && sample.tangent.y > 0.08) {
          train.state = 'stalled';
          train.v = 0;
          continue;
        }
      }

      train.v = clamp(train.v, -6, 68);
      if (Math.abs(train.v) < 0.02) continue;
      train.s += train.v * dt;
      if (train.s >= this.total && this.total > 0) {
        train.s -= this.total;
        train.lap += 1;
      }
      if (train.s < 0) train.s += this.total;
      if (!inStation) train.hasLeftStation = true;
      train.block = this.blockForDistance(train.s);

      if (arriving && train.v <= 0.1) {
        train.v = 0;
        train.state = 'stopped';
        train.lap = 0;
        train.hasLeftStation = false;
      }
    }
    this.preventCollisions();
  }

  /** Last-resort physical interlock if block spacing is ever violated. */
  private preventCollisions(): void {
    if (this.trains.length < 2 || this.total <= 0) return;
    if (!this.trains.some((train) => train.state === 'running' || train.state === 'arriving')) return;
    for (let i = 0; i < this.trains.length; i++) {
      for (let j = i + 1; j < this.trains.length; j++) {
        const a = this.trains[i];
        const b = this.trains[j];
        const forward = (b.s - a.s + this.total) % this.total;
        const backward = (a.s - b.s + this.total) % this.total;
        if (Math.min(forward, backward) >= 5) continue;
        const rear = forward <= backward ? a : b;
        rear.v = 0;
        rear.state = 'stalled';
      }
    }
  }

  private isInStation(s: number): boolean {
    if (this.total <= 0) return true;
    if (this.stationExitDistance <= this.total) {
      return s >= this.stationDistance - 0.5 && s <= this.stationExitDistance + 0.5;
    }
    return s >= this.stationDistance - 0.5 || s <= this.stationExitDistance - this.total;
  }

  private isNearStation(s: number, radius: number): boolean {
    if (!this.total) return true;
    const delta = Math.abs(s - this.stationDistance);
    return Math.min(delta, this.total - delta) <= radius;
  }

  telemetry(trainId = 0): TrainTelemetry | null {
    const train = this.trains.find((t) => t.id === trainId);
    if (!train) return null;
    const sample = sampleAtDistance(this.samples, train.s);
    if (!sample) return null;
    const curvatureG = (train.v * train.v * sample.curvature) / this.options.gravity;
    const lateralG = clamp(curvatureG, 0, 5);
    const gForce = clamp(1 + curvatureG * Math.sign(sample.up.y || 1), -2, 6.5);
    return {
      speedKmh: train.v * 3.6,
      speedMs: train.v,
      height: sample.position.y,
      gForce,
      lateralG,
      combinedG: Math.hypot(gForce, lateralG),
      section: sample.kind,
      distance: train.s,
      lapProgress: this.total > 0 ? train.s / this.total : 0,
      state: train.state,
      massKg: this.massKg,
      riders: this.riders,
    };
  }

  sectionAt(s: number): TrackPointKind {
    return sampleAtDistance(this.samples, s)?.kind ?? 'track';
  }

  /**
   * Test hook and UI helper: speed needed to clear the next high point. Used by
   * the dispatch panel to warn before a rollout stalls.
   */
  rolloutSpeed(): number {
    const maxHeight = this.samples.reduce((max, sample) => Math.max(max, sample.position.y), 0);
    return Math.sqrt(Math.max(0, 2 * this.options.gravity * Math.max(0, maxHeight - 2)));
  }
}
