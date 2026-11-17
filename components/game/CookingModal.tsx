'use client';

import React, { useEffect, useState } from 'react';
import { Flame, Lock, Utensils, X } from 'lucide-react';
import { ITEMS } from '@/game/data/items';
import { COOKING_RECIPES } from '@/game/data/recipes';
import { CookingRecipe, HUDStateSnapshot, ItemId } from '@/game/types';
import { ItemIcon } from './ItemIcon';

interface CookingModalProps {
  hud: HUDStateSnapshot;
  atCookingStation: boolean;
  isStove?: boolean;
  onCook: (recipeId: string) => boolean;
  onEat?: (itemId: ItemId) => void;
  onClose: () => void;
}

type CookFilter = 'all' | 'ready' | 'bakery' | 'veggie' | 'meat' | 'fish' | 'fruit';

export function CookingModal({
  hud,
  atCookingStation,
  isStove = false,
  onCook,
  onEat,
  onClose,
}: CookingModalProps) {
  const [cookingRecipe, setCookingRecipe] = useState<CookingRecipe | null>(null);
  const [progress, setProgress] = useState(0);
  const [filter, setFilter] = useState<CookFilter>('all');

  const countOf = (itemId: ItemId) =>
    hud.inventory
      .filter((s) => s.itemId === itemId)
      .reduce((acc, s) => acc + s.quantity, 0);

  useEffect(() => {
    if (!cookingRecipe) return;
    const stepMs = 60;
    const speedMultiplier = atCookingStation ? 0.75 : 1;
    const totalMs = cookingRecipe.cookTimeSeconds * speedMultiplier * 1000;
    let elapsed = 0;

    const id = window.setInterval(() => {
      elapsed += stepMs;
      const pct = Math.min(100, (elapsed / totalMs) * 100);
      setProgress(pct);
      if (pct >= 100) {
        window.clearInterval(id);
        onCook(cookingRecipe.id);
        setCookingRecipe(null);
        setProgress(0);
      }
    }, stepMs);

    return () => window.clearInterval(id);
  }, [cookingRecipe, atCookingStation, onCook]);

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
          id === 'roasted_dino_meat' ||
          id === 'roasted_meat' ||
          id === 'dino_feast' ||
          id === 'hearty_stew',
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
                  ? 'Bake real-life bread, cakes & cookies from flour & sugar, or sauté fresh farm vegetables 25% faster.'
                  : atCookingStation
                    ? 'Cook anything 25% faster — bread, cakes, cookies, dinosaur meat, fish, fruit & stews.'
                    : 'Cook over the fire — bread, meat, fish, coconut, banana, apple, maple glazes & more.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
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
              ['bakery', 'Bread, Cake & Cookies'],
              ['veggie', 'Salads & Veggies'],
              ['meat', 'Dino & Meat'],
              ['fish', 'Fish'],
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

        {cookingRecipe && (
          <div className="px-5 py-3 bg-orange-950/60 border-b border-orange-800/60">
            <div className="flex items-center justify-between text-xs font-semibold text-orange-200 mb-1.5">
              <span>Cooking {ITEMS[cookingRecipe.resultItemId].name}...</span>
              <span className="font-mono-tabular">{Math.round(progress)}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-stone-950 overflow-hidden">
              <div
                className="h-full bg-orange-500 transition-all duration-75"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="p-5 overflow-y-auto survival-scroll space-y-3">
          {sortedRecipes.length === 0 ? (
            <div className="rounded-xl bg-stone-950/70 border border-stone-800 p-6 text-center text-xs text-stone-400">
              No matching recipes ready yet. Gather coconuts, bananas, apples, maple syrup, fish, or hunt wildlife & dinosaurs!
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
                      onClick={() => setCookingRecipe(recipe)}
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
