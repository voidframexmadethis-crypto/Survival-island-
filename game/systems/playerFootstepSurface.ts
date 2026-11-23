import type { BiomeId } from '../types';

export type FootstepSurface = 'grass' | 'sand' | 'rock' | 'water';

/** Distance walked between footstep sounds. */
export const FOOTSTEP_STRIDE_METERS = {
  walk: 2.3,
  sprint: 2.85,
} as const;

const SAND_BIOMES: ReadonlySet<BiomeId> = new Set<BiomeId>([
  'beach',
  'snowy_beach',
  'desert',
  'badlands',
  'wooded_badlands',
  'eroded_badlands',
]);

const ROCK_BIOMES: ReadonlySet<BiomeId> = new Set<BiomeId>([
  'mountain',
  'cave',
  'stony_peaks',
  'stony_shore',
  'jagged_peaks',
  'frozen_peaks',
  'windswept_gravelly_hills',
  'ruined_castle',
]);

export interface FootstepSurfaceInput {
  biome: BiomeId;
  /** Standing on a built deck, dock, bridge or structural floor. */
  onStructure: boolean;
  swimming: boolean;
  /** Flat creative world rather than the survival island. */
  flat: boolean;
  flatSurfaceStyle?: string;
}

/**
 * Picks the footstep material the player is actually standing on. Grass,
 * sand and stone each get a distinct sound; water and built surfaces take
 * priority so decks never rustle like grass.
 */
export function resolveFootstepSurface(input: FootstepSurfaceInput): FootstepSurface {
  if (input.flat) {
    return input.flatSurfaceStyle === 'concrete_plaza' ? 'rock' : 'grass';
  }
  if (input.onStructure) return 'rock';
  if (input.swimming) return 'water';
  if (SAND_BIOMES.has(input.biome)) return 'sand';
  if (ROCK_BIOMES.has(input.biome)) return 'rock';
  return 'grass';
}

/** Footstep cadence for the current movement mode. */
export function footstepStrideMeters(sprinting: boolean): number {
  return sprinting ? FOOTSTEP_STRIDE_METERS.sprint : FOOTSTEP_STRIDE_METERS.walk;
}
