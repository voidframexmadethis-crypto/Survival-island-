'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Clock, Hammer, Lock, X } from 'lucide-react';
import { ITEMS } from '@/game/data/items';
import { CRAFTING_RECIPES } from '@/game/data/recipes';
import { CraftingRecipe, HUDStateSnapshot, ItemId } from '@/game/types';
import { ItemIcon } from './ItemIcon';

interface CraftingModalProps {
  hud: HUDStateSnapshot;
  nearTable: boolean;
  onCraft: (recipeId: string) => void;
  onCraftSound?: () => void;
  onClose: () => void;
}

export function CraftingModal({
  hud,
  nearTable,
  onCraft,
  onCraftSound,
  onClose,
}: CraftingModalProps) {
  const [category, setCategory] = useState<'all' | CraftingRecipe['category']>('all');
  const [selectedId, setSelectedId] = useState<string>(CRAFTING_RECIPES[0].id);
  const [craftingProgress, setCraftingProgress] = useState<{
    recipeId: string;
    pct: number;
  } | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
      }
    };
  }, []);

  const countOf = (itemId: ItemId) =>
    hud.inventory
      .filter((s) => s.itemId === itemId)
      .reduce((acc, s) => acc + s.quantity, 0);

  const filtered = useMemo(
    () =>
      category === 'all'
        ? CRAFTING_RECIPES
        : CRAFTING_RECIPES.filter((r) => r.category === category),
    [category],
  );

  const selected =
    CRAFTING_RECIPES.find((r) => r.id === selectedId) || filtered[0];

  const hasIngredients = selected
    ? selected.ingredients.every((ing) => countOf(ing.itemId) >= ing.quantity)
    : false;
  const stationOk = selected ? !selected.requiresTable || nearTable : false;
  const canCraft = Boolean(
    selected && hasIngredients && stationOk && !craftingProgress,
  );

  const startTimedCraft = (recipe: CraftingRecipe) => {
    if (!canCraft) return;
    onCraftSound?.();
    const durationMs = Math.max(400, recipe.craftTimeSeconds * 1000);
    let elapsed = 0;
    setCraftingProgress({ recipeId: recipe.id, pct: 0 });

    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
    }
    timerRef.current = window.setInterval(() => {
      elapsed += 45;
      const pct = Math.min(100, Math.round((elapsed / durationMs) * 100));
      setCraftingProgress({ recipeId: recipe.id, pct });
      if (elapsed >= durationMs) {
        if (timerRef.current !== null) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setCraftingProgress(null);
        onCraft(recipe.id);
      }
    }, 45);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-3 sm:p-5">
      <div className="w-full max-w-4xl rounded-2xl bg-stone-900 border border-stone-700/80 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800">
          <div className="flex items-center gap-2.5">
            <Hammer className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="font-display text-lg font-bold text-stone-100">
                {nearTable ? 'Wooden Crafting Workbench' : 'Field Crafting'}
              </h2>
              <p className="text-xs text-stone-400">
                {nearTable
                  ? 'Workbench active: all tools, weapons, hunting gear & camp blueprints unlocked.'
                  : 'Craft basic tools & a Wooden Workbench, or stand beside a placed Workbench for advanced recipes.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200"
            aria-label="Close Crafting"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Filter Tabs */}
        <div className="px-5 py-3 border-b border-stone-800 flex items-center gap-2 overflow-x-auto">
          {(
            [
              ['all', 'All'],
              ['tools', 'Tools'],
              ['weapons', 'Weapons'],
              ['survival', 'Survival'],
              ['camp', 'Camp'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setCategory(key)}
              className={`min-h-[40px] px-4 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                category === key
                  ? 'bg-amber-600 text-stone-950'
                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto survival-scroll grid grid-cols-1 md:grid-cols-12">
          {/* Recipe List */}
          <div className="md:col-span-7 border-b md:border-b-0 md:border-r border-stone-800 p-4 space-y-2">
            {filtered.map((recipe) => {
              const item = ITEMS[recipe.resultItemId];
              const isSelected = selected?.id === recipe.id;
              const ingOk = recipe.ingredients.every(
                (i) => countOf(i.itemId) >= i.quantity,
              );
              const tableOk = !recipe.requiresTable || nearTable;
              const craftable = ingOk && tableOk;

              return (
                <button
                  key={recipe.id}
                  disabled={Boolean(craftingProgress)}
                  onClick={() => setSelectedId(recipe.id)}
                  className={`w-full min-h-[58px] px-3.5 py-2.5 rounded-xl border text-left flex items-center justify-between gap-3 transition-colors ${
                    isSelected
                      ? 'bg-amber-950/50 border-amber-500/70'
                      : 'bg-stone-950/60 border-stone-800 hover:border-stone-700'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-stone-800 flex items-center justify-center shrink-0">
                      <ItemIcon itemId={recipe.resultItemId} className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-stone-100 truncate">
                        {item.name}
                        {recipe.resultQuantity > 1
                          ? ` ×${recipe.resultQuantity}`
                          : ''}
                      </div>
                      <div className="text-xs text-stone-400 truncate">
                        {recipe.ingredients
                          .map((i) => `${ITEMS[i.itemId].name} ×${i.quantity}`)
                          .join(' · ')}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-0.5">
                    <span className="text-[10px] font-mono-tabular text-stone-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {recipe.craftTimeSeconds.toFixed(1)}s
                    </span>
                    {!tableOk ? (
                      <span className="text-[11px] text-stone-400 flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Workbench</span>
                      </span>
                    ) : craftable ? (
                      <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>Ready</span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-stone-500">Materials</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Recipe Inspector & Craft Action */}
          {selected && (
            <div className="md:col-span-5 p-5 flex flex-col justify-between gap-4 bg-stone-950/40">
              <div className="space-y-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-xl bg-stone-800 border border-stone-700 flex items-center justify-center shrink-0">
                    <ItemIcon itemId={selected.resultItemId} className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="font-display text-base font-bold text-stone-100">
                      {ITEMS[selected.resultItemId].name}
                    </h3>
                    <div className="text-xs text-amber-400">
                      Yields {selected.resultQuantity} ·{' '}
                      {selected.craftTimeSeconds.toFixed(1)}s ·{' '}
                      {selected.requiresTable
                        ? 'Requires Workbench'
                        : 'Field Craftable'}
                    </div>
                  </div>
                </div>

                <p className="text-xs leading-relaxed text-stone-300">
                  {selected.description}
                </p>

                {/* Workbench Blueprint Grid */}
                <div>
                  <div className="text-xs font-semibold text-stone-400 mb-2">
                    Required Materials (Owned / Needed)
                  </div>
                  <div className="space-y-2">
                    {selected.ingredients.map((ing) => {
                      const have = countOf(ing.itemId);
                      const ok = have >= ing.quantity;
                      return (
                        <div
                          key={ing.itemId}
                          className="flex items-center justify-between px-3 py-2 rounded-lg bg-stone-900 border border-stone-800"
                        >
                          <div className="flex items-center gap-2.5">
                            <ItemIcon itemId={ing.itemId} className="w-4 h-4" />
                            <span className="text-xs font-medium text-stone-200">
                              {ITEMS[ing.itemId].name}
                            </span>
                          </div>
                          <span
                            className={`text-xs font-mono-tabular font-semibold ${
                              ok ? 'text-emerald-400' : 'text-red-400'
                            }`}
                          >
                            {have} / {ing.quantity}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                {craftingProgress &&
                  craftingProgress.recipeId === selected.id && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-mono-tabular text-amber-300">
                        <span>Crafting at Workbench...</span>
                        <span>{craftingProgress.pct}%</span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-stone-800 overflow-hidden">
                        <div
                          className="h-full bg-amber-500 transition-all duration-75"
                          style={{ width: `${craftingProgress.pct}%` }}
                        />
                      </div>
                    </div>
                  )}

                <button
                  disabled={!canCraft}
                  onClick={() => startTimedCraft(selected)}
                  className={`w-full min-h-[48px] rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${
                    canCraft
                      ? 'bg-amber-600 hover:bg-amber-500 text-stone-950'
                      : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                  }`}
                >
                  <Hammer className="w-4 h-4" />
                  <span>
                    {craftingProgress
                      ? 'Crafting...'
                      : !stationOk
                        ? 'Stand Near a Wooden Workbench'
                        : !hasIngredients
                          ? 'Insufficient Materials'
                          : `Craft ${ITEMS[selected.resultItemId].name} (${selected.craftTimeSeconds.toFixed(1)}s)`}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
