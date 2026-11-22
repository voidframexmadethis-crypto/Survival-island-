import type { ItemId } from '../types';
import type {
  LostWorldActionContext,
  LostWorldActionResult,
  LostWorldEffects,
  LostWorldState,
  LostWorldTab,
  ShelterKind,
} from './lostWorldExpansion';

export type ActionEmitter = (descriptor: {
  id: string;
  tab: LostWorldTab;
  label: string;
  description: string;
  costLabel: string;
  available: boolean;
  reason?: string;
  tone?: 'info' | 'good' | 'warning' | 'danger' | 'discovery';
}) => void;

export interface ActionOutcome extends LostWorldActionResult {}

export function actionOk(
  tab: LostWorldTab,
  message: string,
  effects: LostWorldEffects = {},
): ActionOutcome {
  return { ok: true, message, effects, tab };
}

export function actionFail(tab: LostWorldTab, message: string): ActionOutcome {
  return { ok: false, message, effects: {}, tab };
}

export function itemCount(ctx: LostWorldActionContext, itemId: ItemId): number {
  return ctx.items[itemId] ?? 0;
}

export function canAfford(
  ctx: LostWorldActionContext,
  coins: number,
  items: readonly (readonly [ItemId, number])[] = [],
): boolean {
  if (ctx.coins < coins) return false;
  for (let i = 0; i < items.length; i++) {
    if (itemCount(ctx, items[i][0]) < items[i][1]) return false;
  }
  return true;
}

export function missingReason(
  ctx: LostWorldActionContext,
  coins: number,
  items: readonly (readonly [ItemId, number])[] = [],
): string {
  if (ctx.coins < coins) return `Need ${coins - ctx.coins} more coins`;
  for (let i = 0; i < items.length; i++) {
    const have = itemCount(ctx, items[i][0]);
    if (have < items[i][1]) {
      return `Need ${items[i][1] - have} more ${items[i][0].replace(/_/g, ' ')}`;
    }
  }
  return '';
}

export function spend(
  effects: LostWorldEffects,
  ctx: LostWorldActionContext,
  coins: number,
  items: readonly (readonly [ItemId, number])[] = [],
): void {
  void ctx;
  if (coins !== 0) effects.coins = (effects.coins ?? 0) - coins;
  if (items.length === 0) return;
  effects.items = effects.items ?? [];
  for (let i = 0; i < items.length; i++) {
    effects.items.push({ itemId: items[i][0], quantity: -items[i][1] });
  }
}

export function grant(
  effects: LostWorldEffects,
  coins: number,
  items: readonly (readonly [ItemId, number])[] = [],
): void {
  if (coins !== 0) effects.coins = (effects.coins ?? 0) + coins;
  if (items.length === 0) return;
  effects.items = effects.items ?? [];
  for (let i = 0; i < items.length; i++) {
    effects.items.push({ itemId: items[i][0], quantity: items[i][1] });
  }
}

export function costLabel(
  coins: number,
  items: readonly (readonly [ItemId, number])[] = [],
): string {
  const parts: string[] = [];
  if (coins > 0) parts.push(`${coins}c`);
  for (let i = 0; i < items.length; i++) {
    parts.push(`${items[i][1]} ${items[i][0].replace(/_/g, ' ')}`);
  }
  return parts.length > 0 ? parts.join(' · ') : 'Free';
}

export function distanceTo(
  ctx: LostWorldActionContext,
  x: number,
  z: number,
): number {
  return Math.hypot(ctx.playerX - x, ctx.playerZ - z);
}

export function freshFood(state: LostWorldState, itemId: ItemId): void {
  const existing = state.food.find((f) => f.itemId === itemId);
  if (existing) {
    existing.freshness = 1;
    existing.preserved = false;
    existing.spoiled = false;
  } else {
    state.food.push({ itemId, freshness: 1, preserved: false, spoiled: false });
  }
}

export function adjustDistrict(
  state: LostWorldState,
  districtId: string,
  delta: number,
): void {
  const district = state.districts.find((d) => d.id === districtId);
  if (!district) return;
  district.reputation = Math.max(-100, Math.min(100, district.reputation + delta));
  district.trend += delta;
}

export function adjustTrust(state: LostWorldState, npcId: string, delta: number): void {
  const npc = state.npcs.find((n) => n.id === npcId);
  if (!npc) return;
  npc.trust = Math.max(-100, Math.min(100, npc.trust + delta));
  if (delta > 0) npc.favors += delta >= 5 ? 1 : 0;
  if (delta < 0) npc.conflicts += 1;
  let memory = state.npcMemory.find((m) => m.npcId === npcId);
  if (!memory) {
    memory = {
      npcId,
      trust: npc.trust,
      encounters: npc.encounters,
      favors: npc.favors,
      conflicts: npc.conflicts,
      lastTopic: '',
      lastLine: npc.lastLine,
    };
    state.npcMemory.push(memory);
  }
  memory.trust = npc.trust;
  memory.encounters = npc.encounters;
  memory.favors = npc.favors;
  memory.conflicts = npc.conflicts;
  memory.lastLine = npc.lastLine;
}

export interface ShelterBlueprint {
  kind: ShelterKind;
  label: string;
  description: string;
  coins: number;
  items: readonly (readonly [ItemId, number])[];
  structure: 'basic_shelter' | 'crafting_table' | 'campfire' | 'storage_chest';
  insulation: number;
  defense: number;
  integrity: number;
}

export const SHELTER_BLUEPRINTS: readonly ShelterBlueprint[] = [
  {
    kind: 'cabin',
    label: 'Raise a Cabin',
    description: 'A framed cabin with a door, roof and sleeping loft. Real shelter from rain and cold.',
    coins: 120,
    items: [['wood', 24], ['stone', 8], ['fiber', 6]],
    structure: 'basic_shelter',
    insulation: 0.55,
    defense: 5,
    integrity: 100,
  },
  {
    kind: 'watchtower',
    label: 'Build a Watchtower',
    description: 'A raised lookout over the settlement. Early warning for storms, fires and raids.',
    coins: 150,
    items: [['wood', 30], ['stone', 20], ['rope', 4]],
    structure: 'basic_shelter',
    insulation: 0.2,
    defense: 20,
    integrity: 95,
  },
  {
    kind: 'bridge',
    label: 'Span a Bridge',
    description: 'A load-bearing timber and stone crossing over a creek or washed-out road.',
    coins: 110,
    items: [['wood', 20], ['stone', 18], ['rope', 3]],
    structure: 'basic_shelter',
    insulation: 0,
    defense: 2,
    integrity: 110,
  },
  {
    kind: 'workshop',
    label: 'Build a Workshop',
    description: 'A covered bench with tool storage. Unlocks faster construction and repairs.',
    coins: 140,
    items: [['wood', 22], ['metal_ore', 6], ['stone', 10]],
    structure: 'crafting_table',
    insulation: 0.25,
    defense: 4,
    integrity: 100,
  },
  {
    kind: 'foundation',
    label: 'Pour a Foundation',
    description: 'A level stone footing for multi-floor construction above the flood line.',
    coins: 80,
    items: [['stone', 20], ['clay', 6]],
    structure: 'basic_shelter',
    insulation: 0.1,
    defense: 3,
    integrity: 120,
  },
  {
    kind: 'underground_shelter',
    label: 'Dig an Underground Shelter',
    description: 'A reinforced cellar that stays cool in summer and holds heat in winter.',
    coins: 200,
    items: [['stone', 30], ['wood', 16], ['metal_ore', 4]],
    structure: 'basic_shelter',
    insulation: 0.8,
    defense: 12,
    integrity: 140,
  },
  {
    kind: 'treehouse',
    label: 'Finish the Treehouse',
    description: 'The final elevated room, reached by the rope bridge you built.',
    coins: 160,
    items: [['wood', 20], ['fiber', 6], ['rope', 4]],
    structure: 'basic_shelter',
    insulation: 0.45,
    defense: 8,
    integrity: 90,
  },
];

export interface CookingRecipe {
  id: string;
  label: string;
  description: string;
  coins: number;
  ingredients: readonly (readonly [ItemId, number])[];
  result: ItemId;
  quantity: number;
  requiresKitchen: boolean;
}

export const COOKING_RECIPES: readonly CookingRecipe[] = [
  {
    id: 'gumbo',
    label: 'Bayou Gumbo',
    description: 'A dark roux, meat, corn and tomato. Restores a large meal and warms the body.',
    coins: 10,
    ingredients: [['raw_meat', 2], ['tomato', 1], ['onion', 1], ['corn', 1]],
    result: 'hearty_stew',
    quantity: 1,
    requiresKitchen: false,
  },
  {
    id: 'skillet',
    label: 'Camp Skillet',
    description: 'Seared meat and potatoes with salt. Two filling portions off one cut.',
    coins: 0,
    ingredients: [['raw_meat', 1], ['potato', 1], ['salt', 1]],
    result: 'roasted_meat',
    quantity: 2,
    requiresKitchen: false,
  },
  {
    id: 'grilled_catch',
    label: 'Grilled Catch',
    description: 'A whole fish grilled over coals with salt and citrus.',
    coins: 0,
    ingredients: [['freshwater_fish', 1], ['salt', 1]],
    result: 'grilled_fish',
    quantity: 2,
    requiresKitchen: false,
  },
  {
    id: 'garden_salad',
    label: 'Garden Salad',
    description: 'Fresh vegetables with a light dressing. Restores thirst and a little hunger.',
    coins: 0,
    ingredients: [['lettuce', 1], ['tomato', 1], ['cucumber', 1]],
    result: 'garden_salad',
    quantity: 2,
    requiresKitchen: false,
  },
  {
    id: 'cake',
    label: 'Celebration Cake',
    description: 'Flour, sugar, egg and milk. A community morale meal for festivals.',
    coins: 15,
    ingredients: [['flour', 2], ['sugar', 1], ['egg', 2], ['milk', 1]],
    result: 'cake',
    quantity: 1,
    requiresKitchen: true,
  },
];

export const PERISHABLE_FOOD_NAMES: Partial<Record<ItemId, string>> = {
  raw_meat: 'raw meat',
  roasted_meat: 'roasted meat',
  grilled_fish: 'grilled fish',
  berries: 'berries',
  milk: 'milk',
  egg: 'eggs',
  bread_loaf: 'bread',
  hearty_stew: 'stew',
};

export function itemName(itemId: ItemId): string {
  return (PERISHABLE_FOOD_NAMES[itemId] ?? itemId).replace(/_/g, ' ');
}
