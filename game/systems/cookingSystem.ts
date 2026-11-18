export type FoodType =
  | 'raw_meat'
  | 'raw_fish'
  | 'cheese'
  | 'bread'
  | 'milk';

export type Recipe = {
  name: string;
  ingredients: Partial<Record<FoodType, number>>;
  cookingTime: number;
};

export const RECIPES: Recipe[] = [
  {
    name: 'Grilled Meat',
    ingredients: { raw_meat: 1 },
    cookingTime: 12000,
  },
  {
    name: 'Cooked Fish',
    ingredients: { raw_fish: 1 },
    cookingTime: 9000,
  },
  {
    name: 'Cheeseburger',
    ingredients: {
      raw_meat: 1,
      cheese: 1,
      bread: 1,
    },
    cookingTime: 15000,
  },
];

export type CookingStatus = 'cooking' | 'nearly_ready' | 'cooked' | 'burnt';

export type CookingItem = {
  food: FoodType;
  startedAt: number;
  cookingTime: number;
  flipped: boolean;
  removed: boolean;
};

export function startCooking(
  food: FoodType,
  cookingTime: number,
  now = Date.now(),
): CookingItem {
  return {
    food,
    startedAt: now,
    cookingTime: Math.max(100, cookingTime),
    flipped: false,
    removed: false,
  };
}

export function getCookingRawProgress(
  item: CookingItem,
  now = Date.now(),
): number {
  return Math.max(0, (now - item.startedAt) / Math.max(1, item.cookingTime));
}

export function getCookingProgress(
  item: CookingItem,
  now = Date.now(),
): number {
  return Math.min(1, getCookingRawProgress(item, now));
}

export function getCookingStatus(
  item: CookingItem,
  now = Date.now(),
): CookingStatus {
  const rawProgress = getCookingRawProgress(item, now);
  // Flipping buys a small grace buffer before food chars past 150%
  const burnThreshold = item.flipped ? 1.65 : 1.5;

  if (rawProgress >= burnThreshold) return 'burnt';
  if (rawProgress >= 1) return 'cooked';
  if (rawProgress >= 0.5) return 'nearly_ready';

  return 'cooking';
}

export function flipFood(item: CookingItem): CookingItem {
  if (item.removed) return item;

  item.flipped = true;
  return item;
}
