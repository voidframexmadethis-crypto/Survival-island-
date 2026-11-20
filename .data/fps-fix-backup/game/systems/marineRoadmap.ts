import { ItemId } from '../types';

/**
 * Stage 2 Expansion Architecture: Fishing, Marine Wildlife, Boats & Ocean Exploration.
 * Stage 1 uses the Fishing Rod & interactive Dolphins hooks from this module.
 * Stage 2 will attach boat physics, deep-sea diving, and squid/reef ecosystems here.
 */

export type MarineZone = 'freshwater_river' | 'freshwater_lake' | 'coastal_shallows' | 'deep_ocean';

export interface MarineSpeciesConfig {
  id: string;
  name: string;
  zone: MarineZone;
  catchableByRod: boolean;
  interactiveWildlife: boolean; // true for Dolphins (playful, never ordinary fishing catch)
  rewardItemId?: ItemId;
  minRodTier: number;
  stageAvailable: 1 | 2;
}

export const MARINE_ECOSYSTEM_REGISTRY: MarineSpeciesConfig[] = [
  {
    id: 'river_perch',
    name: 'Prehistoric River Perch',
    zone: 'freshwater_river',
    catchableByRod: true,
    interactiveWildlife: false,
    rewardItemId: 'freshwater_fish',
    minRodTier: 1,
    stageAvailable: 1,
  },
  {
    id: 'lake_trout',
    name: 'Azure Lake Trout',
    zone: 'freshwater_lake',
    catchableByRod: true,
    interactiveWildlife: false,
    rewardItemId: 'freshwater_fish',
    minRodTier: 1,
    stageAvailable: 1,
  },
  {
    id: 'reef_snapper',
    name: 'Tropical Reef Snapper',
    zone: 'coastal_shallows',
    catchableByRod: true,
    interactiveWildlife: false,
    rewardItemId: 'ocean_fish',
    minRodTier: 1,
    stageAvailable: 1,
  },
  {
    id: 'pelagic_squid',
    name: 'Deep Reef Squid',
    zone: 'deep_ocean',
    catchableByRod: true,
    interactiveWildlife: false,
    minRodTier: 2,
    stageAvailable: 2,
  },
  {
    id: 'bottlenose_dolphin',
    name: 'Coastal Dolphin',
    zone: 'coastal_shallows',
    catchableByRod: false,
    interactiveWildlife: true,
    minRodTier: 0,
    stageAvailable: 1,
  },
];

export interface BoatBlueprintSpec {
  id: string;
  name: string;
  stageAvailable: 2 | 4 | 5;
  capacity: number;
  speedKnots: number;
  materials: Partial<Record<ItemId, number>>;
}

export const BOAT_EXPANSION_BLUEPRINTS: BoatBlueprintSpec[] = [
  {
    id: 'dugout_canoe',
    name: 'Outrigger Dugout Canoe',
    stageAvailable: 2,
    capacity: 1,
    speedKnots: 8,
    materials: { wood: 12, rope: 4, plant_material: 4 },
  },
  {
    id: 'expedition_raft',
    name: 'Sail Expedition Raft',
    stageAvailable: 2,
    capacity: 2,
    speedKnots: 12,
    materials: { wood: 24, rope: 8, hide: 6 },
  },
];

export function rollStage1FishCatch(zone: MarineZone): MarineSpeciesConfig | null {
  const pool = MARINE_ECOSYSTEM_REGISTRY.filter(
    (s) => s.stageAvailable === 1 && s.catchableByRod && s.zone === zone,
  );
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
