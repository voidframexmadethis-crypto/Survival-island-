/** Independent lowrider hydraulic section control and lock state. */

export type HydraulicSection = 'front' | 'rear' | 'left' | 'right';

export interface HydraulicControlState {
  front: number;
  rear: number;
  left: number;
  right: number;
  /** Locked sections hold this exact height until explicitly unlocked. */
  locked: boolean;
}

export const HYDRAULIC_SECTION_STEP = 0.16;
export const HYDRAULIC_MIN_HEIGHT = -0.12;
export const HYDRAULIC_MAX_HEIGHT = 1.15;

export function createHydraulicControlState(): HydraulicControlState {
  return { front: 0, rear: 0, left: 0, right: 0, locked: false };
}

const clampHeight = (value: number): number =>
  Math.max(HYDRAULIC_MIN_HEIGHT, Math.min(HYDRAULIC_MAX_HEIGHT, value));

/** Raises or lowers one independent section. Locked heights do not drift. */
export function adjustHydraulicSection(
  state: HydraulicControlState,
  section: HydraulicSection,
  direction: 1 | -1,
): HydraulicControlState {
  if (state.locked) return state;
  return {
    ...state,
    [section]: clampHeight(state[section] + direction * HYDRAULIC_SECTION_STEP),
  };
}

export function toggleHydraulicLock(state: HydraulicControlState): HydraulicControlState {
  return { ...state, locked: !state.locked };
}

export function resetHydraulicHeight(state: HydraulicControlState): HydraulicControlState {
  return { ...createHydraulicControlState(), locked: state.locked };
}

/** Four-corner target heights from the independent section controls. */
export function hydraulicCornerTargets(state: HydraulicControlState): {
  fl: number;
  fr: number;
  rl: number;
  rr: number;
} {
  return {
    fl: clampHeight(state.front + state.left),
    fr: clampHeight(state.front + state.right),
    rl: clampHeight(state.rear + state.left),
    rr: clampHeight(state.rear + state.right),
  };
}

export function hasManualHydraulicHeight(state: HydraulicControlState): boolean {
  return (
    state.locked ||
    state.front !== 0 ||
    state.rear !== 0 ||
    state.left !== 0 ||
    state.right !== 0
  );
}

/**
 * Bouncing only adds spring impulses. The locked/selected heights are returned
 * unchanged so repeated bounces can never cancel a raised rear end.
 */
export function hydraulicBounceImpulse(
  state: HydraulicControlState,
  intensity: number,
  pattern: 'all' | 'front' | 'rear' | 'side',
): { fl: number; fr: number; rl: number; rr: number } {
  const power = Math.max(0.35, Math.min(2.2, intensity));
  const base = 7.4 * power;
  if (pattern === 'front') return { fl: base * 1.35, fr: base * 1.35, rl: -base * 0.32, rr: -base * 0.32 };
  if (pattern === 'rear') return { fl: -base * 0.32, fr: -base * 0.32, rl: base * 1.35, rr: base * 1.35 };
  if (pattern === 'side') {
    const high = state.left >= state.right;
    return high
      ? { fl: base, fr: -base * 0.3, rl: base, rr: -base * 0.3 }
      : { fl: -base * 0.3, fr: base, rl: -base * 0.3, rr: base };
  }
  return { fl: base, fr: base, rl: base, rr: base };
}

export function hydraulicSectionSummary(state: HydraulicControlState): string {
  const lock = state.locked ? 'LOCKED' : 'FREE';
  return `F ${state.front.toFixed(2)} · R ${state.rear.toFixed(2)} · L ${state.left.toFixed(2)} · Rt ${state.right.toFixed(2)} · ${lock}`;
}
