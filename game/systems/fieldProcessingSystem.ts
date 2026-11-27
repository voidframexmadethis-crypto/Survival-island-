import type {
  CarcassProcessingStage,
  CarcassProcessingState,
  CreatureSpecies,
  ItemId,
} from '../types';

export type FieldProcessingStep = 'field_dress' | 'skin' | 'butcher' | 'quarter';

export type HarvestGroup =
  | 'organs'
  | 'hide'
  | 'prime'
  | 'extras'
  | 'trophies'
  | 'legacy'
  | 'packaging';

export interface HarvestYield {
  itemId: ItemId;
  quantity: number;
  group: HarvestGroup;
}

export interface CarcassYieldPlan {
  organs: HarvestYield[];
  hide: HarvestYield[];
  prime: HarvestYield[];
  extras: HarvestYield[];
  trophies: HarvestYield[];
  legacy: HarvestYield[];
}

export interface FieldProcessingStepInfo {
  label: string;
  shortLabel: string;
  description: string;
  detailedMs: number;
  quickMs: number;
  sharpnessCost: number;
}

export const FIELD_PROCESSING_STEP_INFO: Record<
  FieldProcessingStep,
  FieldProcessingStepInfo
> = {
  field_dress: {
    label: 'Field Dress',
    shortLabel: 'Gut',
    description:
      'Open the body cavity, remove the organs, and cool the meat. Slows spoilage and cuts carrying weight.',
    detailedMs: 4800,
    quickMs: 1400,
    sharpnessCost: 10,
  },
  skin: {
    label: 'Skin & Peel',
    shortLabel: 'Skin',
    description:
      'Score the hide along the limbs, peel it free, and expose the butcherable muscle layer.',
    detailedMs: 4200,
    quickMs: 1200,
    sharpnessCost: 8,
  },
  butcher: {
    label: 'Butcher Cuts',
    shortLabel: 'Butcher',
    description:
      'Break the skinned carcass into backstrap, tenderloin, steaks, roasts, ribs, marrow, and trophy parts.',
    detailedMs: 5600,
    quickMs: 1800,
    sharpnessCost: 14,
  },
  quarter: {
    label: 'Quarter & Bag',
    shortLabel: 'Quarter',
    description:
      'Quarter the skinned carcass on the spot, bag the prime cuts, and leave the frame behind.',
    detailedMs: 6200,
    quickMs: 2000,
    sharpnessCost: 16,
  },
};

export const FIELD_PROCESSING_STAGE_LABELS: Record<CarcassProcessingStage, string> = {
  whole: 'Whole Carcass',
  field_dressed: 'Field Dressed',
  skinned: 'Skinned',
  butchered: 'Harvested',
};

const ANTLER_SPECIES: ReadonlySet<CreatureSpecies> = new Set<CreatureSpecies>([
  'deer',
  'reindeer',
  'moose',
]);

const HORN_SPECIES: ReadonlySet<CreatureSpecies> = new Set<CreatureSpecies>([
  'goat',
  'sheep',
  'bison',
  'cattle',
  'giraffe',
  'rhinoceros',
  'triceratops',
  'stegosaurus',
  'ankylosaurus',
]);

const TUSK_SPECIES: ReadonlySet<CreatureSpecies> = new Set<CreatureSpecies>([
  'elephant',
  'wild_boar',
  'pig',
  'hippopotamus',
  'spinosaurus',
]);

export function trophyItemForSpecies(species: CreatureSpecies, isDino: boolean): ItemId {
  if (ANTLER_SPECIES.has(species)) return 'antlers';
  if (HORN_SPECIES.has(species)) return 'horns';
  if (TUSK_SPECIES.has(species)) return 'tusks';
  if (
    isDino ||
    species === 'grizzly_bear' ||
    species === 'gray_wolf' ||
    species === 'african_lion' ||
    species === 'tiger' ||
    species === 'cheetah' ||
    species === 'hyena' ||
    species === 'polar_bear' ||
    species === 'saltwater_crocodile'
  ) {
    return 'teeth_claws';
  }
  return 'teeth_claws';
}

function mergeYields(yields: HarvestYield[]): HarvestYield[] {
  const merged = new Map<ItemId, HarvestYield>();
  for (let i = 0; i < yields.length; i++) {
    const y = yields[i];
    if (y.quantity <= 0) continue;
    const existing = merged.get(y.itemId);
    if (existing) existing.quantity += y.quantity;
    else merged.set(y.itemId, { ...y });
  }
  return Array.from(merged.values());
}

export function createCarcassProcessingState(params: {
  isDino: boolean;
  meatQuantity?: number;
  stage?: CarcassProcessingStage;
  freshness?: number;
  weightKg?: number;
}): CarcassProcessingState {
  const stage = params.stage ?? 'whole';
  const meatQty = Math.max(1, params.meatQuantity ?? 2);
  const baseWeight = params.isDino
    ? 260 + meatQty * 18
    : 48 + meatQty * 9;
  return {
    stage,
    freshness:
      typeof params.freshness === 'number' && Number.isFinite(params.freshness)
        ? Math.max(0, Math.min(1, params.freshness))
        : 1,
    weightKg:
      typeof params.weightKg === 'number' && Number.isFinite(params.weightKg)
        ? Math.max(0, params.weightKg)
        : baseWeight,
    dragging: false,
    hideRemoved: stage === 'skinned' || stage === 'butchered',
    organYielded: stage !== 'whole',
    trophyYielded: stage === 'butchered',
    meatYielded: stage === 'butchered',
  };
}

export function buildCarcassYieldPlan(params: {
  isDino: boolean;
  species: CreatureSpecies;
  drops: { itemId: ItemId; quantity: number }[];
}): CarcassYieldPlan {
  const { isDino, species, drops } = params;
  const meatQty = Math.max(
    1,
    drops
      .filter((d) => d.itemId === 'raw_meat' || d.itemId === 'dino_meat')
      .reduce((sum, d) => sum + d.quantity, 0),
  );
  const size = Math.max(1, Math.round(meatQty / (isDino ? 4 : 2)));

  return {
    organs: mergeYields([
      { itemId: 'heart', quantity: 1, group: 'organs' },
      { itemId: 'liver', quantity: 1, group: 'organs' },
      { itemId: 'kidneys', quantity: isDino ? 2 : 1, group: 'organs' },
    ]),
    hide: mergeYields([
      { itemId: 'raw_hide', quantity: isDino ? 2 + size : 1 + Math.floor(size / 2), group: 'hide' },
      { itemId: 'pelt', quantity: isDino ? 0 : 1, group: 'hide' },
    ]),
    prime: mergeYields([
      { itemId: 'backstrap', quantity: 1 + Math.floor(size / 2), group: 'prime' },
      { itemId: 'tenderloin', quantity: 1, group: 'prime' },
      { itemId: 'hindquarter_steak', quantity: isDino ? 3 + size : 2, group: 'prime' },
      { itemId: 'shoulder_roast', quantity: isDino ? 2 : 1, group: 'prime' },
      { itemId: 'ribs', quantity: isDino ? 2 + size : 1, group: 'prime' },
    ]),
    extras: mergeYields([
      { itemId: 'tongue', quantity: 1, group: 'extras' },
      { itemId: 'bone_marrow', quantity: isDino ? 2 + size : 1, group: 'extras' },
      { itemId: 'tallow', quantity: isDino ? 2 + size : 1, group: 'extras' },
      { itemId: 'soup_bones', quantity: isDino ? 3 + size : 2, group: 'extras' },
    ]),
    trophies: mergeYields([
      {
        itemId: trophyItemForSpecies(species, isDino),
        quantity: isDino ? 2 : 1,
        group: 'trophies',
      },
      { itemId: 'sinew', quantity: isDino ? 3 : 2, group: 'trophies' },
    ]),
    legacy: mergeYields(drops.map((d) => ({ ...d, group: 'legacy' as const }))),
  };
}

export function nextFieldProcessingStep(
  stage: CarcassProcessingStage,
): FieldProcessingStep | null {
  if (stage === 'whole') return 'field_dress';
  if (stage === 'field_dressed') return 'skin';
  if (stage === 'skinned') return 'butcher';
  return null;
}

export function stepYields(
  step: FieldProcessingStep,
  state: CarcassProcessingState,
  plan: CarcassYieldPlan,
): HarvestYield[] {
  if (step === 'field_dress') {
    return state.organYielded ? [] : plan.organs;
  }
  if (step === 'skin') {
    return state.hideRemoved ? [] : plan.hide;
  }
  if (step === 'butcher' || step === 'quarter') {
    const yields: HarvestYield[] = [];
    if (!state.organYielded) yields.push(...plan.organs);
    if (!state.hideRemoved) yields.push(...plan.hide);
    yields.push(...plan.prime, ...plan.extras, ...plan.trophies, ...plan.legacy);
    if (step === 'quarter') {
      yields.push({ itemId: 'meat_bag', quantity: 2, group: 'packaging' });
    }
    return mergeYields(yields);
  }
  return [];
}

export function remainingYields(
  state: CarcassProcessingState,
  plan: CarcassYieldPlan,
): HarvestYield[] {
  if (state.stage === 'butchered') return [];
  const yields: HarvestYield[] = [];
  if (!state.organYielded) yields.push(...plan.organs);
  if (!state.hideRemoved) yields.push(...plan.hide);
  return mergeYields([
    ...yields,
    ...plan.prime,
    ...plan.extras,
    ...plan.trophies,
    ...plan.legacy,
  ]);
}

export function canPerformFieldProcessingStep(
  state: CarcassProcessingState,
  step: FieldProcessingStep,
  hasKnife: boolean,
  sharpness: number,
): { ok: boolean; reason: string | null } {
  if (state.stage === 'butchered') {
    return { ok: false, reason: 'This carcass has already been fully harvested.' };
  }
  if (!hasKnife) {
    return { ok: false, reason: 'You need a hunting knife equipped or in your pack.' };
  }
  if (sharpness < FIELD_PROCESSING_STEP_INFO[step].sharpnessCost) {
    return {
      ok: false,
      reason: 'Knife is too dull. Hone it on a sharpening stone before cutting.',
    };
  }
  if (step === 'field_dress' && state.stage !== 'whole') {
    return { ok: false, reason: 'This carcass is already field dressed.' };
  }
  if (step === 'skin' && state.stage !== 'field_dressed') {
    return {
      ok: false,
      reason:
        state.stage === 'whole'
          ? 'Field dress the carcass before skinning.'
          : 'This carcass has already been skinned.',
    };
  }
  if ((step === 'butcher' || step === 'quarter') && state.stage !== 'skinned') {
    return {
      ok: false,
      reason:
        state.stage === 'field_dressed'
          ? 'Skin the carcass before butchering.'
          : 'Field dress and skin the carcass before butchering.',
    };
  }
  return { ok: true, reason: null };
}

export function applyFieldProcessingStep(
  state: CarcassProcessingState,
  step: FieldProcessingStep,
  plan: CarcassYieldPlan,
): { state: CarcassProcessingState; yields: HarvestYield[]; complete: boolean } {
  const yields = stepYields(step, state, plan);
  const next: CarcassProcessingState = { ...state };

  if (step === 'field_dress') {
    next.stage = 'field_dressed';
    next.organYielded = true;
    next.weightKg = Math.max(0, state.weightKg * 0.62);
    next.freshness = Math.max(next.freshness, 0.98);
  } else if (step === 'skin') {
    next.stage = 'skinned';
    next.hideRemoved = true;
    next.weightKg = Math.max(0, state.weightKg * 0.86);
  } else {
    next.stage = 'butchered';
    next.organYielded = true;
    next.hideRemoved = true;
    next.meatYielded = true;
    next.trophyYielded = true;
    next.dragging = false;
    next.weightKg = 0;
  }

  return { state: next, yields, complete: next.stage === 'butchered' };
}

export function fieldProcessingDurationMs(
  step: FieldProcessingStep,
  detailedAnimations: boolean,
): number {
  const info = FIELD_PROCESSING_STEP_INFO[step];
  return detailedAnimations ? info.detailedMs : info.quickMs;
}
