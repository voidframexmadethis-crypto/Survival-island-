'use client';

import React, { useEffect, useState } from 'react';
import { Check, Flame, Lock, RotateCw, Utensils, X } from 'lucide-react';
import { ITEMS } from '@/game/data/items';
import { COOKING_RECIPES } from '@/game/data/recipes';
import {
  CookingItem,
  CookingStatus,
  FoodType,
  flipFood,
  getCookingProgress,
  getCookingRawProgress,
  getCookingStatus,
  startCooking,
} from '@/game/systems/cookingSystem';
import { CookingRecipe, HUDStateSnapshot, ItemId } from '@/game/types';
import { ItemIcon } from './ItemIcon';

interface CookingModalProps {
  hud: HUDStateSnapshot;
  atCookingStation: boolean;
  isStove?: boolean;
  onStartCook: (recipeId: string) => boolean;
  onFinishCook: (
    recipeId: string,
    outcome: 'cooked' | 'burnt',
    flipped: boolean,
  ) => boolean;
  onCancelCook: (recipeId: string) => void;
  onEat?: (itemId: ItemId) => void;
  onClose: () => void;
}

type CookFilter = 'all' | 'ready' | 'bakery' | 'veggie' | 'meat' | 'fish' | 'fruit';

function resolveCookingFoodType(recipe: CookingRecipe): FoodType {
  if (
    recipe.ingredients.some(
      (i) => i.itemId === 'freshwater_fish' || i.itemId === 'ocean_fish',
    )
  ) {
    return 'raw_fish';
  }
  if (recipe.ingredients.some((i) => i.itemId === 'cheese')) {
    return 'cheese';
  }
  if (
    recipe.ingredients.some(
      (i) => i.itemId === 'bread_loaf' || i.itemId === 'wheat_bread' || i.itemId === 'dough',
    )
  ) {
    return 'bread';
  }
  if (recipe.ingredients.some((i) => i.itemId === 'milk')) {
    return 'milk';
  }
  return 'raw_meat';
}

export function CookingModal({
  hud,
  atCookingStation,
  isStove = false,
  onStartCook,
  onFinishCook,
  onCancelCook,
  onEat,
  onClose,
}: CookingModalProps) {
  const [cookingRecipe, setCookingRecipe] = useState<CookingRecipe | null>(null);
  const [cookingItem, setCookingItem] = useState<CookingItem | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [filter, setFilter] = useState<CookFilter>('all');

  const countOf = (itemId: ItemId) =>
    hud.inventory
      .filter((s) => s.itemId === itemId)
      .reduce((acc, s) => acc + s.quantity, 0);

  useEffect(() => {
    if (!cookingItem) return;
    const id = window.setInterval(() => {
      setNowMs(Date.now());
    }, 60);
    return () => window.clearInterval(id);
  }, [cookingItem]);

  const beginCookingRecipe = (recipe: CookingRecipe) => {
    if (cookingRecipe) return;
    const started = onStartCook(recipe.id);
    if (!started) return;
    const speedMultiplier = atCookingStation ? 0.75 : 1;
    const totalMs = Math.round(recipe.cookTimeSeconds * speedMultiplier * 1000);
    const now = Date.now();
    setNowMs(now);
    setCookingRecipe(recipe);
    setCookingItem(startCooking(resolveCookingFoodType(recipe), totalMs, now));
  };

  const handleFlip = () => {
    if (!cookingItem) return;
    const updated = flipFood({ ...cookingItem });
    setCookingItem(updated);
  };

  const handleTakeOffFire = () => {
    if (!cookingRecipe || !cookingItem) return;
    const status = getCookingStatus(cookingItem, nowMs);
    if (status !== 'cooked' && status !== 'burnt') return;
    const removedItem: CookingItem = { ...cookingItem, removed: true };
    onFinishCook(
      cookingRecipe.id,
      status === 'burnt' ? 'burnt' : 'cooked',
      removedItem.flipped,
    );
    setCookingRecipe(null);
    setCookingItem(null);
  };

  const handleCloseModal = () => {
    if (cookingRecipe && cookingItem) {
      const status = getCookingStatus(cookingItem, Date.now());
      if (status === 'cooked' || status === 'burnt') {
        onFinishCook(
          cookingRecipe.id,
          status === 'burnt' ? 'burnt' : 'cooked',
          cookingItem.flipped,
        );
      } else {
        onCancelCook(cookingRecipe.id);
      }
      setCookingRecipe(null);
      setCookingItem(null);
    }
    onClose();
  };

  const progress = cookingItem ? getCookingProgress(cookingItem, nowMs) : 0;
  const rawProgress = cookingItem ? getCookingRawProgress(cookingItem, nowMs) : 0;
  const status: CookingStatus | null = cookingItem
    ? getCookingStatus(cookingItem, nowMs)
    : null;
  const burnThreshold = cookingItem?.flipped ? 1.65 : 1.5;
  const burnDangerPct = Math.min(
    100,
    Math.max(0, ((rawProgress - 1) / Math.max(0.1, burnThreshold - 1)) * 100),
  );

  const hasIngredients = (r: CookingRecipe) =>
    r.ingredients.every((i) => countOf(i.itemId) >= i.quantity);

  const matchesFilter = (r: CookingRecipe) => {
    if (filter === 'all') return true;
    if (filter === 'ready') return hasIngredients(r);
    const ids = [r.resultItemId, ...r.ingredients.map((i) => i.itemId)];
    if (filter === 'meat') {
      return ids.some(
        (id) =>
          id === 'dino_meat' ||
          id === 'raw_meat' ||
          id === 'washed_meat' ||
          id === 'washed_dino_meat' ||
          id === 'dried_raw_meat' ||
          id === 'dried_dino_meat' ||
          id === 'cut_meat' ||
          id === 'cut_dino_meat' ||
          id === 'roasted_dino_meat' ||
          id === 'roasted_meat' ||
          id === 'cheeseburger' ||
          id === 'dino_feast' ||
          id === 'hearty_stew' ||
          id === 'heart' ||
          id === 'liver' ||
          id === 'kidneys' ||
          id === 'backstrap' ||
          id === 'tenderloin' ||
          id === 'hindquarter_steak' ||
          id === 'shoulder_roast' ||
          id === 'ribs' ||
          id === 'tongue' ||
          id === 'meat_bag' ||
          id === 'cooked_backstrap' ||
          id === 'cooked_organs' ||
          id === 'bone_broth',
      );
    }
    if (filter === 'fish') {
      return ids.some(
        (id) =>
          id === 'freshwater_fish' ||
          id === 'ocean_fish' ||
          id === 'grilled_fish' ||
          id === 'coconut_fish_curry',
      );
    }
    if (filter === 'bakery') {
      return ids.some(
        (id) =>
          id === 'flour' ||
          id === 'sugar' ||
          id === 'dough' ||
          id === 'cheese' ||
          id === 'cheeseburger' ||
          id === 'bread_loaf' ||
          id === 'wheat_bread' ||
          id === 'cake' ||
          id === 'chocolate_cake' ||
          id === 'cookies' ||
          id === 'jalapeno_cornbread' ||
          id === 'pumpkin_pie' ||
          id === 'sugarcane' ||
          id === 'chocolate' ||
          id === 'butter',
      );
    }
    if (filter === 'veggie') {
      return ids.some(
        (id) =>
          id === 'lettuce' ||
          id === 'tomato' ||
          id === 'cucumber' ||
          id === 'jalapeno' ||
          id === 'carrot' ||
          id === 'potato' ||
          id === 'onion' ||
          id === 'corn' ||
          id === 'bell_pepper' ||
          id === 'pumpkin' ||
          id === 'garlic' ||
          id === 'garden_salad' ||
          id === 'fresh_salsa' ||
          id === 'cucumber_salad' ||
          id === 'stuffed_pepper' ||
          id === 'vegetable_soup' ||
          id === 'garlic_herb_roast',
      );
    }
    if (filter === 'fruit') {
      return ids.some(
        (id) =>
          id === 'coconut' ||
          id === 'banana' ||
          id === 'apple' ||
          id === 'maple_syrup' ||
          id === 'berries' ||
          id === 'mushrooms' ||
          id === 'wheat',
      );
    }
    return true;
  };

  const sortedRecipes = [...COOKING_RECIPES]
    .filter(matchesFilter)
    .sort((a, b) => Number(hasIngredients(b)) - Number(hasIngredients(a)));

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-3 sm:p-5">
      <div className="w-full max-w-2xl rounded-2xl bg-stone-900 border border-stone-700/80 shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800">
          <div className="flex items-center gap-2.5">
            <Flame className="w-5 h-5 text-orange-400" />
            <div>
              <h2 className="font-display text-lg font-bold text-stone-100">
                {isStove
                  ? 'Kitchen Stove & Baking Oven'
                  : atCookingStation
                    ? 'Cooking Station Hearth'
                    : 'Campfire Cooking'}
              </h2>
              <p className="text-xs text-stone-400">
                {isStove
                  ? 'Grill cheeseburgers, steaks & fish or bake bread & cakes 25% faster — flip halfway and pull before burning.'
                  : atCookingStation
                    ? 'Cook 25% faster — flip at 50% for a golden sear and pull off the fire when ready.'
                    : 'Grill steaks, fish & cheeseburgers over open flames — flip halfway and pull before 150% burn.'}
              </p>
            </div>
          </div>
          <button
            onClick={handleCloseModal}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200"
            aria-label="Close Cooking"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Filters */}
        <div className="px-5 py-2.5 bg-stone-950/60 border-b border-stone-800 flex flex-wrap gap-1.5">
          {(
            [
              ['all', 'All Dishes'],
              ['ready', 'Ready Now'],
              ['meat', 'Burgers & Meat'],
              ['fish', 'Fish'],
              ['bakery', 'Cheese, Bread & Cake'],
              ['veggie', 'Salads & Veggies'],
              ['fruit', 'Fruit & Camp'],
            ] as [CookFilter, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filter === key
                  ? 'bg-orange-600 text-stone-950'
                  : 'bg-stone-900 text-stone-300 border border-stone-700 hover:border-stone-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {cookingRecipe && cookingItem && status && (
          <div
            className={`px-5 py-3.5 border-b ${
              status === 'burnt'
                ? 'bg-red-950/75 border-red-700/70'
                : status === 'cooked'
                  ? 'bg-emerald-950/70 border-emerald-700/70'
                  : status === 'nearly_ready'
                    ? 'bg-amber-950/65 border-amber-700/70'
                    : 'bg-orange-950/60 border-orange-800/60'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold mb-2">
              <div className="flex items-center gap-2">
                <span className="text-stone-100">
                  {ITEMS[cookingRecipe.resultItemId].name}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wide ${
                    status === 'burnt'
                      ? 'bg-red-600 text-stone-50'
                      : status === 'cooked'
                        ? 'bg-emerald-500 text-stone-950'
                        : status === 'nearly_ready'
                          ? 'bg-amber-400 text-stone-950'
                          : 'bg-orange-500/30 text-orange-200'
                  }`}
                >
                  {status === 'burnt'
                    ? 'Burnt!'
                    : status === 'cooked'
                      ? 'Cooked — Pull Now'
                      : status === 'nearly_ready'
                        ? cookingItem.flipped
                          ? 'Flipped · Almost Done'
                          : 'Nearly Ready — Flip!'
                        : 'Cooking'}
                </span>
                {cookingItem.flipped && status !== 'burnt' && (
                  <span className="text-[11px] text-amber-300">
                    ✓ Flipped
                  </span>
                )}
              </div>
              <span className="font-mono-tabular text-stone-200">
                {status === 'cooked'
                  ? `100% · Burn Risk ${Math.round(burnDangerPct)}%`
                  : status === 'burnt'
                    ? '150%+ Overcooked'
                    : `${Math.round(progress * 100)}%`}
              </span>
            </div>

            <div className="w-full h-2.5 rounded-full bg-stone-950 overflow-hidden mb-3">
              <div
                className={`h-full transition-all duration-75 ${
                  status === 'burnt'
                    ? 'bg-red-500'
                    : status === 'cooked'
                      ? 'bg-emerald-500'
                      : status === 'nearly_ready'
                        ? 'bg-amber-400'
                        : 'bg-orange-500'
                }`}
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={cookingItem.flipped || status === 'burnt'}
                onClick={handleFlip}
                className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 ${
                  !cookingItem.flipped && status !== 'burnt'
                    ? status === 'nearly_ready'
                      ? 'bg-amber-400 hover:bg-amber-300 text-stone-950'
                      : 'bg-stone-800 hover:bg-stone-700 text-stone-100 border border-stone-600'
                    : 'bg-stone-800/60 text-stone-500 cursor-not-allowed'
                }`}
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>{cookingItem.flipped ? 'Flipped' : 'Flip Food'}</span>
              </button>

              <button
                type="button"
                disabled={status !== 'cooked' && status !== 'burnt'}
                onClick={handleTakeOffFire}
                className={`min-h-[40px] px-4 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 ${
                  status === 'cooked'
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-stone-950'
                    : status === 'burnt'
                      ? 'bg-red-600 hover:bg-red-500 text-stone-50'
                      : 'bg-stone-800/60 text-stone-500 cursor-not-allowed'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>
                  {status === 'burnt'
                    ? 'Clear Burnt Scrap'
                    : status === 'cooked'
                      ? 'Take Off Fire'
                      : 'Wait Until Cooked'}
                </span>
              </button>
            </div>
          </div>
        )}

        <div className="p-5 overflow-y-auto survival-scroll space-y-3">
          {sortedRecipes.length === 0 ? (
            <div className="rounded-xl bg-stone-950/70 border border-stone-800 p-6 text-center text-xs text-stone-400">
              No matching recipes ready yet. Gather coconuts, bananas, apples, maple syrup, fish, cheese, or hunt wildlife & dinosaurs!
            </div>
          ) : (
            sortedRecipes.map((recipe) => {
              const outItem = ITEMS[recipe.resultItemId];
              const stationOk = !recipe.requiresStation || atCookingStation;
              const ingOk = hasIngredients(recipe);
              const canCook = stationOk && ingOk && !cookingRecipe;
              const cookSecs = (
                recipe.cookTimeSeconds * (atCookingStation ? 0.75 : 1)
              ).toFixed(1);

              return (
                <div
                  key={recipe.id}
                  className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    ingOk
                      ? 'bg-stone-950/85 border-emerald-700/50'
                      : 'bg-stone-950/55 border-stone-800'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-lg bg-stone-800 flex items-center justify-center shrink-0">
                      <ItemIcon itemId={recipe.resultItemId} className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-stone-100 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span>{outItem.name}</span>
                        <span className="text-[11px] text-amber-400 font-mono-tabular">
                          {[
                            outItem.hungerRestore ? `+${outItem.hungerRestore} Hunger` : null,
                            outItem.thirstRestore ? `+${outItem.thirstRestore} Thirst` : null,
                            outItem.healthRestore ? `+${outItem.healthRestore} HP` : null,
                            outItem.staminaRestore ? `+${outItem.staminaRestore} Stam` : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </div>
                      <p className="text-xs text-stone-400 mt-0.5">
                        {recipe.description}
                      </p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs">
                        {recipe.ingredients.map((ing) => {
                          const have = countOf(ing.itemId);
                          return (
                            <span
                              key={ing.itemId}
                              className={`font-mono-tabular ${
                                have >= ing.quantity
                                  ? 'text-emerald-400'
                                  : 'text-red-400'
                              }`}
                            >
                              {ITEMS[ing.itemId].name}: {have}/{ing.quantity}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {onEat && countOf(recipe.resultItemId) > 0 && (
                      <button
                        type="button"
                        onClick={() => onEat(recipe.resultItemId)}
                        className="min-h-[44px] px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-stone-950 text-xs font-semibold whitespace-nowrap shrink-0"
                      >
                        Eat (×{countOf(recipe.resultItemId)})
                      </button>
                    )}

                    <button
                      disabled={!canCook}
                      onClick={() => beginCookingRecipe(recipe)}
                      className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 flex items-center justify-center gap-1.5 ${
                        canCook
                          ? 'bg-orange-600 hover:bg-orange-500 text-stone-950'
                          : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                      }`}
                    >
                      {!stationOk ? (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>Need Cooking Station</span>
                        </>
                      ) : (
                        <>
                          <Utensils className="w-3.5 h-3.5" />
                          <span>Cook ({cookSecs}s)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
