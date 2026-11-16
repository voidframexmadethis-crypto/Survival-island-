import { ItemId } from '../types';

/**
 * Stage 3–5 Extensible Building System Architecture.
 * Stage 1 implements functional Camp Structures (Campfire, Sleeping Area,
 * Storage Chest, Crafting Table, Cooking Station, Basic Shelter).
 * Stage 3 introduces the Builder's Table with material deposits, multi-part
 * blueprints, interior customization, and cinematic time-lapse construction.
 */

export type StructuralPartCategory =
  | 'foundation'
  | 'wooden_frame'
  | 'wall'
  | 'floor'
  | 'roofing'
  | 'door'
  | 'window'
  | 'stairs'
  | 'balcony'
  | 'furniture';

export interface StructuralPieceSpec {
  id: string;
  category: StructuralPartCategory;
  name: string;
  dimensionsMeters: [number, number, number];
  snapSocket: 'ground' | 'edge' | 'frame' | 'roof' | 'interior';
  materials: Partial<Record<ItemId, number>>;
}

export interface BuildersTableBlueprint {
  id: string;
  name: string;
  targetStage: 3 | 4 | 5;
  footprintMeters: [number, number];
  totalMaterials: Partial<Record<ItemId, number>>;
  buildPhases: {
    phaseOrder: number;
    label: string;
    partCategories: StructuralPartCategory[];
    timelapseDurationSec: number;
  }[];
  interiorCustomizationSlots: string[];
}

export const STAGE_3_STRUCTURAL_PARTS: StructuralPieceSpec[] = [
  {
    id: 'timber_foundation',
    category: 'foundation',
    name: 'Elevated Timber Foundation',
    dimensionsMeters: [3, 0.5, 3],
    snapSocket: 'ground',
    materials: { wood: 4, stone: 4 },
  },
  {
    id: 'post_beam_frame',
    category: 'wooden_frame',
    name: 'Hardwood Post & Beam Frame',
    dimensionsMeters: [3, 2.8, 3],
    snapSocket: 'edge',
    materials: { wood: 4, rope: 2 },
  },
  {
    id: 'plank_wall',
    category: 'wall',
    name: 'Interlocking Plank Wall',
    dimensionsMeters: [3, 2.8, 0.2],
    snapSocket: 'frame',
    materials: { wood: 3, clay: 1 },
  },
  {
    id: 'upper_floor_deck',
    category: 'floor',
    name: 'Upper Hardwood Floor',
    dimensionsMeters: [3, 0.2, 3],
    snapSocket: 'frame',
    materials: { wood: 4 },
  },
  {
    id: 'thatch_gable_roof',
    category: 'roofing',
    name: 'Tropical Thatch Roof',
    dimensionsMeters: [3.2, 1.4, 3.2],
    snapSocket: 'roof',
    materials: { wood: 2, plant_material: 6, rope: 2 },
  },
  {
    id: 'hinged_door',
    category: 'door',
    name: 'Timber Expedition Door',
    dimensionsMeters: [1.1, 2.2, 0.15],
    snapSocket: 'frame',
    materials: { wood: 2, metal_ore: 1 },
  },
  {
    id: 'shuttered_window',
    category: 'window',
    name: 'Louvered Jungle Window',
    dimensionsMeters: [1.2, 1.1, 0.15],
    snapSocket: 'frame',
    materials: { wood: 2, sand: 2 },
  },
  {
    id: 'timber_stairs',
    category: 'stairs',
    name: 'Interior Timber Stairs',
    dimensionsMeters: [1.4, 2.8, 3],
    snapSocket: 'interior',
    materials: { wood: 5, rope: 1 },
  },
  {
    id: 'overlook_balcony',
    category: 'balcony',
    name: 'Coastal Overlook Balcony',
    dimensionsMeters: [3, 1.1, 1.6],
    snapSocket: 'edge',
    materials: { wood: 4, rope: 2 },
  },
  {
    id: 'explorer_desk_furniture',
    category: 'furniture',
    name: 'Explorer Table & Trophy Rack',
    dimensionsMeters: [1.6, 0.9, 0.8],
    snapSocket: 'interior',
    materials: { wood: 3, hide: 2, bone: 2 },
  },
];

export const STAGE_3_HOUSE_BLUEPRINTS: BuildersTableBlueprint[] = [
  {
    id: 'explorer_cabin',
    name: 'Timber Explorer Cabin',
    targetStage: 3,
    footprintMeters: [6, 6],
    totalMaterials: { wood: 36, stone: 16, plant_material: 20, rope: 10, clay: 8, metal_ore: 4 },
    buildPhases: [
      { phaseOrder: 1, label: 'Foundations & Footings', partCategories: ['foundation'], timelapseDurationSec: 3.0 },
      { phaseOrder: 2, label: 'Timber Framing', partCategories: ['wooden_frame', 'floor', 'stairs'], timelapseDurationSec: 4.0 },
      { phaseOrder: 3, label: 'Walls, Doors & Windows', partCategories: ['wall', 'door', 'window', 'balcony'], timelapseDurationSec: 4.5 },
      { phaseOrder: 4, label: 'Roofing & Interior Furnishings', partCategories: ['roofing', 'furniture'], timelapseDurationSec: 3.5 },
    ],
    interiorCustomizationSlots: ['hearth_rug', 'map_wall', 'weapon_rack', 'bunk_bed', 'lantern_chandelier'],
  },
];
