import { clamp, sampleAtDistance } from './track';
import type { MechanicalSnapshot, TrackPoint, TrackSample } from './types';

export type MechanicalAction = 'transfer' | 'switch' | 'drop' | 'tilt';

export interface MechanicsConfig {
  transfer: boolean;
  switchTrack: boolean;
  drop: boolean;
  tilt: boolean;
}

export function deriveMechanics(points: TrackPoint[]): MechanicsConfig {
  const kinds = new Set(points.map((p) => p.kind));
  return {
    transfer: kinds.has('transfer'),
    switchTrack: kinds.has('switch'),
    drop: kinds.has('drop'),
    tilt: kinds.has('tilt'),
  };
}

export interface BlockRange {
  index: number;
  start: number;
  end: number;
  kind: string;
}

export function buildBlockRanges(samples: TrackSample[]): BlockRange[] {
  if (!samples.length) return [];
  const total = samples[samples.length - 1].distance;
  const cuts: { distance: number; kind: string }[] = [];

  // The platform is always its own block, whether or not the designer added brakes.
  let sawStation = false;
  for (const sample of samples) {
    if (sample.kind === 'station') {
      sawStation = true;
    } else if (sawStation) {
      if (sample.distance > 3 && sample.distance < total - 3) {
        cuts.push({ distance: sample.distance, kind: 'Station exit' });
      }
      break;
    }
  }

  for (const sample of samples) {
    if (sample.kind === 'block_brake' && sample.distance > 1) {
      cuts.push({ distance: sample.distance, kind: 'Block brake' });
    }
  }
  if (!cuts.some((cut) => cut.kind === 'Block brake')) {
    // Without explicit brakes, automatic block boundaries keep multi-train
    // operation from deadlocking behind a single circuit-wide reservation.
    for (const fraction of [0.34, 0.67]) {
      const distance = total * fraction;
      if (!cuts.some((cut) => Math.abs(cut.distance - distance) < 3)) {
        cuts.push({ distance, kind: 'Automatic block' });
      }
    }
  }
  cuts.sort((a, b) => a.distance - b.distance);
  cuts.push({ distance: total, kind: 'Circuit' });

  const ranges: BlockRange[] = [];
  let start = 0;
  for (let i = 0; i < cuts.length; i++) {
    ranges.push({
      index: i,
      start,
      end: cuts[i].distance,
      kind: i === 0 ? 'Station block' : cuts[i].kind,
    });
    start = cuts[i].distance;
  }
  return ranges;
}

export class BlockSafetyController {
  readonly ranges: BlockRange[];
  private occupancy = new Map<number, number | null>();
  private sensors: string[] = [];

  constructor(ranges: BlockRange[]) {
    this.ranges = ranges;
    ranges.forEach((range) => this.occupancy.set(range.index, null));
  }

  blockAt(distance: number): BlockRange | null {
    return this.ranges.find((range) => distance >= range.start && distance <= range.end) ?? this.ranges[0] ?? null;
  }

  updateTrain(trainId: number, distance: number): void {
    const block = this.blockAt(distance);
    if (!block) return;
    for (const [index, occupant] of this.occupancy) {
      if (occupant === trainId && index !== block.index) this.occupancy.set(index, null);
    }
    this.occupancy.set(block.index, trainId);
    if (this.sensors[0] !== `B${block.index + 1}`) {
      this.sensors = [`B${block.index + 1}`, ...this.sensors].slice(0, 5);
    }
  }

  clearTrain(trainId: number): void {
    for (const [index, occupant] of this.occupancy) {
      if (occupant === trainId) this.occupancy.set(index, null);
    }
  }

  canDispatch(trainId: number, distance: number): boolean {
    const current = this.blockAt(distance);
    if (!current) return false;
    const next = this.ranges[(current.index + 1) % this.ranges.length];
    if (!next) return true;
    const occupant = this.occupancy.get(next.index);
    return occupant === undefined || occupant === null || occupant === trainId;
  }

  snapshot(): { index: number; occupiedBy: number | null; kind: string }[] {
    return this.ranges.map((range) => ({
      index: range.index,
      occupiedBy: this.occupancy.get(range.index) ?? null,
      kind: range.kind,
    }));
  }

  get sensorLog(): string[] {
    return [...this.sensors];
  }
}

type Phase = 'idle' | 'active' | 'returning';

export class MechanicalController {
  readonly config: MechanicsConfig;
  readonly blocks: BlockSafetyController;
  private snapshotState: MechanicalSnapshot;
  private timer = 0;
  private duration = 0;
  private phase: Phase = 'idle';
  private queued: MechanicalAction | null = null;

  constructor(samples: TrackSample[], config: MechanicsConfig) {
    this.config = config;
    this.blocks = new BlockSafetyController(buildBlockRanges(samples));
    this.snapshotState = {
      transfer: { installed: config.transfer, progress: 0, side: 'main' },
      switchTrack: { installed: config.switchTrack, route: 'main', progress: 0 },
      drop: { installed: config.drop, progress: 0, phase: 'up' },
      tilt: { installed: config.tilt, progress: 0, phase: 'level' },
      lastAction: 'Idle',
      blockStatus: this.blocks.snapshot(),
      dispatchAllowed: true,
      sensors: [],
    };
  }

  /** Route the current train to a block and update the sensor log. */
  senseTrain(trainId: number, distance: number, samples: TrackSample[]): void {
    this.blocks.updateTrain(trainId, distance);
    const sample = sampleAtDistance(samples, distance);
    if (sample && (sample.kind === 'transfer' || sample.kind === 'switch' || sample.kind === 'drop' || sample.kind === 'tilt')) {
      const label = `${sample.kind.toUpperCase()} @ ${Math.round(distance)}m`;
      if (!this.snapshotState.sensors.includes(label)) {
        this.snapshotState.sensors = [label, ...this.snapshotState.sensors].slice(0, 4);
      }
    }
  }

  request(action: MechanicalAction): boolean {
    if (action === 'transfer' && !this.config.transfer) return false;
    if (action === 'switch' && !this.config.switchTrack) return false;
    if (action === 'drop' && !this.config.drop) return false;
    if (action === 'tilt' && !this.config.tilt) return false;
    if (this.phase !== 'idle') {
      this.queued = action;
      return false;
    }
    this.start(action);
    return true;
  }

  private start(action: MechanicalAction): void {
    this.phase = 'active';
    this.timer = 0;
    this.snapshotState.lastAction = action;
    this.duration =
      action === 'transfer' ? 4 : action === 'switch' ? 1.6 : action === 'drop' ? 5 : 4;
    if (action === 'drop') {
      this.snapshotState.drop.phase = 'lowering';
      this.snapshotState.drop.progress = 0;
    }
    if (action === 'tilt') {
      this.snapshotState.tilt.phase = 'tilting';
      this.snapshotState.tilt.progress = 0;
    }
  }

  update(dt: number): void {
    if (this.phase === 'idle') return;
    this.timer += dt;
    const t = clamp(this.timer / this.duration, 0, 1);
    const action = this.snapshotState.lastAction as MechanicalAction;

    if (action === 'transfer') {
      this.snapshotState.transfer.progress = t;
      this.snapshotState.transfer.side = t >= 0.5 ? 'storage' : 'main';
    } else if (action === 'switch') {
      this.snapshotState.switchTrack.progress = t;
      this.snapshotState.switchTrack.route = t >= 0.5 ? 'storage' : 'main';
    } else if (action === 'drop') {
      if (t < 0.35) {
        this.snapshotState.drop.phase = 'lowering';
        this.snapshotState.drop.progress = t / 0.35;
      } else if (t < 0.65) {
        this.snapshotState.drop.phase = 'down';
        this.snapshotState.drop.progress = 1;
      } else if (t < 1) {
        this.snapshotState.drop.phase = 'raising';
        this.snapshotState.drop.progress = 1 - (t - 0.65) / 0.35;
      }
    } else if (action === 'tilt') {
      if (t < 0.4) {
        this.snapshotState.tilt.phase = 'tilting';
        this.snapshotState.tilt.progress = t / 0.4;
      } else if (t < 0.7) {
        this.snapshotState.tilt.phase = 'vertical';
        this.snapshotState.tilt.progress = 1;
      } else {
        this.snapshotState.tilt.phase = 'resetting';
        this.snapshotState.tilt.progress = 1 - (t - 0.7) / 0.3;
      }
    }

    if (t >= 1) {
      this.phase = 'idle';
      this.snapshotState.transfer.progress = 0;
      this.snapshotState.transfer.side = 'main';
      this.snapshotState.switchTrack.progress = 0;
      this.snapshotState.switchTrack.route = 'main';
      this.snapshotState.drop.progress = 0;
      this.snapshotState.drop.phase = 'up';
      this.snapshotState.tilt.progress = 0;
      this.snapshotState.tilt.phase = 'level';
      if (this.queued) {
        const next = this.queued;
        this.queued = null;
        this.start(next);
      }
    }
  }

  /** Automatic cycle after a train parks in the station. */
  handleTrainArrival(): void {
    if (this.config.transfer) this.request('transfer');
    else if (this.config.drop) this.request('drop');
    else if (this.config.tilt) this.request('tilt');
  }

  isHome(): boolean {
    return (
      this.phase === 'idle' &&
      this.snapshotState.drop.phase === 'up' &&
      this.snapshotState.tilt.phase === 'level' &&
      (this.snapshotState.transfer.side === 'main' || !this.config.transfer)
    );
  }

  canDispatch(trainId: number, distance: number): boolean {
    return this.isHome() && this.blocks.canDispatch(trainId, distance);
  }

  snapshot(): MechanicalSnapshot {
    return {
      ...this.snapshotState,
      blockStatus: this.blocks.snapshot(),
      sensors: [...this.blocks.sensorLog, ...this.snapshotState.sensors].slice(0, 5),
    };
  }
}
