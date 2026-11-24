import { CUSTOM_SHOP_POS, VEHICLE_GARAGE_POS } from '../world/terrain';

/**
 * Bayou Royal Customs is a separate restoration shop east of the Motor Atelier.
 * The gap is measured from the atelier's outer glazing to the shop's west wall
 * so the two buildings stay visually and physically distinct.
 */
export const CUSTOM_SHOP_HALF_WIDTH = 6;
export const CUSTOM_SHOP_HALF_DEPTH = 4.5;
export const ATELIER_OUTER_HALF_WIDTH = 19.1;
export const CUSTOM_SHOP_GAP_METERS =
  CUSTOM_SHOP_POS.x -
  CUSTOM_SHOP_HALF_WIDTH -
  (VEHICLE_GARAGE_POS.x + ATELIER_OUTER_HALF_WIDTH);
export const CUSTOM_SHOP_GAP_FEET = CUSTOM_SHOP_GAP_METERS * 3.28084;

/**
 * The donor yard lives at the mouth of a real generated cave. `cave-2312` is
 * deterministically placed here for the shipped island and verifies in
 * customCarShop.test.ts against the live cave generator.
 */
export const JUNKYARD_CAVE = {
  id: 'cave-2312',
  name: 'Cave 12 Salvage',
  x: 56.28371668673408,
  z: 102.7388947060495,
} as const;

export const CUSTOM_SHOP_WORKERS = [
  {
    id: 'duke',
    name: 'Duke',
    role: 'Body, paint & upholstery',
    uniformColor: 0x8a6a3f,
    accentColor: 0xd6a34a,
  },
  {
    id: 'rae',
    name: 'Rae',
    role: 'Hydraulics, audio, rims & lights',
    uniformColor: 0x7c2d3a,
    accentColor: 0xe7c07a,
  },
] as const;

export type CustomShopWorkerId = (typeof CUSTOM_SHOP_WORKERS)[number]['id'];

export const CUSTOM_SHOP_TRIP_OUT_SECONDS = 7.5;
export const CUSTOM_SHOP_LOAD_SECONDS = 2.4;
export const CUSTOM_SHOP_TRIP_BACK_SECONDS = 8.5;

/** Forecourt -> hillside cave approach, kept clear of the atelier footprint. */
export const CUSTOM_SHOP_ROUTE = [
  { x: 44.4, z: 150.2 },
  { x: 49.0, z: 143.0 },
  { x: 51.5, z: 132.0 },
  { x: 52.6, z: 120.0 },
  { x: 54.9, z: 110.0 },
  { x: 56.1, z: 105.5 },
  { x: JUNKYARD_CAVE.x, z: JUNKYARD_CAVE.z },
] as const;

export type RestorationStageId =
  | 'strip'
  | 'body'
  | 'paint'
  | 'hydraulics'
  | 'interior'
  | 'audio'
  | 'rims'
  | 'lights'
  | 'accessories';

export interface RestorationStage {
  id: RestorationStageId;
  label: string;
  detail: string;
  duration: number;
  particleColor: number;
  /** Give the player a toast when this stage starts. */
  announce: boolean;
  /** Local bay offsets for Duke and Rae while they work this stage. */
  workerOffsets: readonly [
    { x: number; z: number },
    { x: number; z: number },
  ];
}

export const CUSTOM_RESTORATION_STAGES: readonly RestorationStage[] = [
  {
    id: 'strip',
    label: 'Strip & rust repair',
    detail: 'The cave donor is stripped, straightened and save-worthy again.',
    duration: 7,
    particleColor: 0x9a6a43,
    announce: false,
    workerOffsets: [
      { x: -2.15, z: 0.55 },
      { x: 2.15, z: -0.45 },
    ],
  },
  {
    id: 'body',
    label: 'Bodywork & primer',
    detail: 'Dents hammered out, panel gaps reset and fresh primer laid down.',
    duration: 7,
    particleColor: 0xc9a27a,
    announce: false,
    workerOffsets: [
      { x: -2.2, z: -0.8 },
      { x: 2.2, z: 0.9 },
    ],
  },
  {
    id: 'paint',
    label: 'Candy paint & stripes',
    detail: 'Deep burgundy lowrider delivery paint with hand-laid cream stripes.',
    duration: 8,
    particleColor: 0x9f2948,
    announce: true,
    workerOffsets: [
      { x: -2.5, z: 0.1 },
      { x: 2.5, z: 1.4 },
    ],
  },
  {
    id: 'hydraulics',
    label: 'DONK lift & hydraulics',
    detail: 'DONK stance, reinforced frame and a six-pump hydraulic dancing setup.',
    duration: 8,
    particleColor: 0x38bdf8,
    announce: true,
    workerOffsets: [
      { x: -1.3, z: -2.3 },
      { x: 1.3, z: -2.3 },
    ],
  },
  {
    id: 'interior',
    label: 'Seats, shifter & wheel',
    detail: 'New cream leather upholstery, rebuilt seats, billet shifter and steering wheel.',
    duration: 8,
    particleColor: 0xe3c9a5,
    announce: true,
    workerOffsets: [
      { x: -2.25, z: -1.1 },
      { x: 2.25, z: -1.1 },
    ],
  },
  {
    id: 'audio',
    label: 'Speakers & trunk bass',
    detail: 'Door speakers, rear deck speakers and a trunk wall of subwoofers.',
    duration: 6,
    particleColor: 0x8b5cf6,
    announce: false,
    workerOffsets: [
      { x: -2.2, z: 1.5 },
      { x: 2.2, z: 1.5 },
    ],
  },
  {
    id: 'rims',
    label: '30-inch gold rims',
    detail: 'New 30-inch gold wheels, fresh tires and a dialled-in DONK stance.',
    duration: 6,
    particleColor: 0xf2c14e,
    announce: false,
    workerOffsets: [
      { x: -2.35, z: 0.6 },
      { x: 2.35, z: -0.6 },
    ],
  },
  {
    id: 'lights',
    label: 'Headlights & LEDs',
    detail: 'New headlight buckets, LED halo accents and restored tail lamps.',
    duration: 5,
    particleColor: 0xfef08a,
    announce: false,
    workerOffsets: [
      { x: -1.8, z: 2.45 },
      { x: 1.8, z: 2.45 },
    ],
  },
  {
    id: 'accessories',
    label: 'Chrome & accessories',
    detail: 'Chrome spears, mirrors, underglow, rim lights and the final detail.',
    duration: 5,
    particleColor: 0xf59e0b,
    announce: false,
    workerOffsets: [
      { x: -2.4, z: -0.2 },
      { x: 2.4, z: -0.2 },
    ],
  },
] as const;

export const CUSTOM_SHOP_RESTORE_SECONDS = CUSTOM_RESTORATION_STAGES.reduce(
  (total, stage) => total + stage.duration,
  0,
);

export const CUSTOM_SHOP_TOTAL_SECONDS =
  CUSTOM_SHOP_TRIP_OUT_SECONDS +
  CUSTOM_SHOP_LOAD_SECONDS +
  CUSTOM_SHOP_TRIP_BACK_SECONDS +
  CUSTOM_SHOP_RESTORE_SECONDS;

export type CustomShopPhase =
  | 'idle'
  | 'outbound'
  | 'loading'
  | 'inbound'
  | 'restoring'
  | 'complete';

export interface CustomShopState {
  phase: CustomShopPhase;
  tripProgress: number;
  stageIndex: number;
  stageProgress: number;
  completed: boolean;
  startedAt: number | null;
}

export type CustomShopEvent =
  | { type: 'departed' }
  | { type: 'donor_loaded' }
  | { type: 'returned' }
  | { type: 'stage_started'; stage: RestorationStage }
  | { type: 'stage_finished'; stage: RestorationStage }
  | { type: 'complete' };

export function createCustomShopState(): CustomShopState {
  return {
    phase: 'idle',
    tripProgress: 0,
    stageIndex: 0,
    stageProgress: 0,
    completed: false,
    startedAt: null,
  };
}

export function beginCustomShopRestoration(
  state: CustomShopState,
  startedAt = 0,
): boolean {
  if (state.phase !== 'idle' || state.completed) return false;
  state.phase = 'outbound';
  state.tripProgress = 0;
  state.startedAt = startedAt;
  return true;
}

export function markCustomShopComplete(state: CustomShopState): void {
  state.phase = 'complete';
  state.completed = true;
  state.tripProgress = 0;
  state.stageIndex = CUSTOM_RESTORATION_STAGES.length;
  state.stageProgress = 0;
}

/**
 * Advances the autonomous salvage/restoration loop. State is mutated for the
 * render loop; events let GameEngine trigger toasts and particles exactly once.
 */
export function advanceCustomShopState(
  state: CustomShopState,
  dt: number,
): CustomShopEvent[] {
  const events: CustomShopEvent[] = [];
  let remaining = Math.max(0, dt);

  while (remaining > 0) {
    if (state.phase === 'idle' || state.phase === 'complete') break;

    if (state.phase === 'outbound') {
      const needed = (1 - state.tripProgress) * CUSTOM_SHOP_TRIP_OUT_SECONDS;
      if (remaining < needed) {
        state.tripProgress += remaining / CUSTOM_SHOP_TRIP_OUT_SECONDS;
        remaining = 0;
      } else {
        remaining -= needed;
        state.phase = 'loading';
        state.tripProgress = 0;
        events.push({ type: 'donor_loaded' });
      }
      continue;
    }

    if (state.phase === 'loading') {
      const needed = (1 - state.tripProgress) * CUSTOM_SHOP_LOAD_SECONDS;
      if (remaining < needed) {
        state.tripProgress += remaining / CUSTOM_SHOP_LOAD_SECONDS;
        remaining = 0;
      } else {
        remaining -= needed;
        state.phase = 'inbound';
        state.tripProgress = 0;
      }
      continue;
    }

    if (state.phase === 'inbound') {
      const needed = (1 - state.tripProgress) * CUSTOM_SHOP_TRIP_BACK_SECONDS;
      if (remaining < needed) {
        state.tripProgress += remaining / CUSTOM_SHOP_TRIP_BACK_SECONDS;
        remaining = 0;
      } else {
        remaining -= needed;
        state.phase = 'restoring';
        state.tripProgress = 0;
        state.stageIndex = 0;
        state.stageProgress = 0;
        events.push({ type: 'returned' });
        events.push({
          type: 'stage_started',
          stage: CUSTOM_RESTORATION_STAGES[0],
        });
      }
      continue;
    }

    const stage = CUSTOM_RESTORATION_STAGES[state.stageIndex];
    if (!stage) {
      state.phase = 'complete';
      state.completed = true;
      remaining = 0;
      events.push({ type: 'complete' });
      continue;
    }

    const needed = (1 - state.stageProgress) * stage.duration;
    if (remaining < needed) {
      state.stageProgress += remaining / stage.duration;
      remaining = 0;
      continue;
    }

    remaining -= needed;
    state.stageProgress = 0;
    events.push({ type: 'stage_finished', stage });
    state.stageIndex++;
    const nextStage = CUSTOM_RESTORATION_STAGES[state.stageIndex];
    if (nextStage) {
      events.push({ type: 'stage_started', stage: nextStage });
    } else {
      state.phase = 'complete';
      state.completed = true;
      events.push({ type: 'complete' });
      remaining = 0;
    }
  }

  return events;
}

export function getCustomShopStage(
  state: Pick<CustomShopState, 'stageIndex'>,
): RestorationStage | undefined {
  return CUSTOM_RESTORATION_STAGES[state.stageIndex];
}

export function getCustomShopOverallProgress(state: CustomShopState): number {
  if (state.phase === 'idle') return 0;
  if (state.phase === 'complete') return 1;
  if (state.phase === 'outbound') return state.tripProgress * 0.1;
  if (state.phase === 'loading') return 0.1 + state.tripProgress * 0.04;
  if (state.phase === 'inbound') return 0.14 + state.tripProgress * 0.12;
  return (
    0.26 +
    (state.stageIndex + state.stageProgress) /
      CUSTOM_RESTORATION_STAGES.length *
      0.74
  );
}

export function getCustomShopPhaseLabel(state: CustomShopState): string {
  switch (state.phase) {
    case 'idle':
      return 'Waiting for the next cave donor';
    case 'outbound':
      return 'Shop truck heading to Cave 12 Salvage';
    case 'loading':
      return 'Loading a donor from the cave junkyard';
    case 'inbound':
      return 'Towing the donor back to Bayou Royal Customs';
    case 'complete':
      return 'Bayou Royal DONK complete';
    case 'restoring': {
      const stage = getCustomShopStage(state);
      return stage ? stage.label : 'Final detail';
    }
  }
}

export const CUSTOM_DONK_BUILD = {
  vehicleId: 'veh_custom_shop_bayou_royal',
  name: 'Bayou Royal DONK',
  paintColor: '#6e1f3c',
  stripeColor: '#f4e3c1',
  interiorColor: '#d8bd96',
  rimColor: '#f1c453',
  wheelScale: 1.34,
  suspensionOffset: 0.5,
  hydraulicBounceBoost: 1.42,
  airbagSpeed: 1.05,
  airbagLockLevel: 1.28,
  underglowColor: '#f59e0b',
  rimLightColor: '#fef3c7',
  accessories: [
    'Cream double pinstripes over candy burgundy',
    '30-inch gold rims and new tires',
    'Six-pump DONK hydraulic dancing suspension',
    'New cream leather seats and upholstery',
    'New billet shifter and steering wheel',
    'Door, deck and trunk subwoofer system',
    'New headlights and LED halo accents',
    'Chrome spears, mirrors, underglow and rim lights',
  ],
} as const;
