'use client';

import React from 'react';
import { ArrowLeftRight, Snowflake, Utensils, X } from 'lucide-react';
import { ITEMS } from '@/game/data/items';
import { HUDStateSnapshot, ItemId } from '@/game/types';
import { ItemIcon } from './ItemIcon';

interface FridgeModalProps {
  hud: HUDStateSnapshot;
  onTake: (itemId: ItemId) => void;
  onStore: (itemId: ItemId) => void;
  onEat?: (itemId: ItemId) => void;
  onClose: () => void;
}

export function FridgeModal({
  hud,
  onTake,
  onStore,
  onEat,
  onClose,
}: FridgeModalProps) {
  const storableInventory = hud.inventory.filter((slot) => {
    const def = ITEMS[slot.itemId];
    return (
      slot.quantity > 0 &&
      (def.category === 'food' ||
        slot.itemId === 'wheat' ||
        slot.itemId === 'sugarcane' ||
        slot.itemId === 'flour' ||
        slot.itemId === 'sugar' ||
        slot.itemId === 'salt' ||
        slot.itemId === 'dough')
    );
  });

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-3 sm:p-5">
      <div className="w-full max-w-3xl rounded-2xl bg-stone-900 border border-stone-700/80 shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800">
          <div className="flex items-center gap-2.5">
            <Snowflake className="w-5 h-5 text-sky-400" />
            <div>
              <h2 className="font-display text-lg font-bold text-stone-100">
                Hilltop Kitchen Refrigerator
              </h2>
              <p className="text-xs text-stone-400">
                Chilled storage for fresh dairy, produce, baking staples, and home-cooked meals.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200"
            aria-label="Close Refrigerator"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto survival-scroll grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Fridge Contents */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-sky-300 flex items-center gap-1.5">
              <Snowflake className="w-3.5 h-3.5" />
              <span>Inside Refrigerator ({hud.fridgeItems.length} items)</span>
            </div>
            {hud.fridgeItems.length === 0 ? (
              <div className="rounded-xl bg-stone-950/60 border border-stone-800 p-5 text-xs text-stone-400 text-center">
                Refrigerator is empty. Store food or ingredients from your backpack.
              </div>
            ) : (
              <div className="space-y-2">
                {hud.fridgeItems.map((slot) => {
                  const def = ITEMS[slot.itemId];
                  return (
                    <div
                      key={slot.itemId}
                      className="rounded-xl bg-stone-950/80 border border-stone-800 px-3.5 py-2.5 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-stone-800 flex items-center justify-center shrink-0">
                          <ItemIcon itemId={slot.itemId} className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-stone-100 truncate">
                            {def.name}
                          </div>
                          <div className="text-[11px] font-mono-tabular text-sky-300">
                            Stored ×{slot.quantity}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onTake(slot.itemId)}
                        className="min-h-[38px] px-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-stone-950 text-xs font-bold shrink-0"
                      >
                        Take 1
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Backpack Ingredients & Food */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
              <Utensils className="w-3.5 h-3.5" />
              <span>Your Backpack Food &amp; Pantry</span>
            </div>
            {storableInventory.length === 0 ? (
              <div className="rounded-xl bg-stone-950/60 border border-stone-800 p-5 text-xs text-stone-400 text-center">
                No food or cooking ingredients in backpack right now.
              </div>
            ) : (
              <div className="space-y-2">
                {storableInventory.map((slot, idx) => {
                  const def = ITEMS[slot.itemId];
                  return (
                    <div
                      key={`${slot.itemId}_${idx}`}
                      className="rounded-xl bg-stone-950/80 border border-stone-800 px-3.5 py-2.5 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-stone-800 flex items-center justify-center shrink-0">
                          <ItemIcon itemId={slot.itemId} className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-stone-100 truncate">
                            {def.name}
                          </div>
                          <div className="text-[11px] font-mono-tabular text-stone-400">
                            In pack ×{slot.quantity}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {onEat && def.category === 'food' && (
                          <button
                            type="button"
                            onClick={() => onEat(slot.itemId)}
                            className="min-h-[38px] px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-stone-950 text-xs font-bold"
                          >
                            Eat
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onStore(slot.itemId)}
                          className="min-h-[38px] px-3 rounded-lg bg-stone-800 hover:bg-amber-600 hover:text-stone-950 text-stone-200 text-xs font-semibold flex items-center gap-1"
                        >
                          <ArrowLeftRight className="w-3.5 h-3.5" />
                          <span>Store</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
