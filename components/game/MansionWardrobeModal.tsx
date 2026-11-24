'use client';

import React from 'react';
import { Backpack, Check, Shirt, X } from 'lucide-react';
import { ITEMS } from '@/game/data/items';
import { HUDStateSnapshot, ItemId } from '@/game/types';
import { ItemIcon } from './ItemIcon';

interface MansionWardrobeModalProps {
  hud: HUDStateSnapshot;
  onStore: (itemId: ItemId) => void;
  onTake: (itemId: ItemId) => void;
  onWear: (itemId: ItemId) => void;
  onClose: () => void;
}

function storable(itemId: ItemId): boolean {
  const category = ITEMS[itemId].category;
  return category === 'equipment' || category === 'tool' || category === 'weapon';
}

export function MansionWardrobeModal({
  hud,
  onStore,
  onTake,
  onWear,
  onClose,
}: MansionWardrobeModalProps) {
  const stored = hud.wardrobeItems.filter((slot) => slot.quantity > 0);
  const carried = hud.inventory.filter((slot) => slot.quantity > 0 && storable(slot.itemId));
  const equippedId =
    hud.equippedSlot >= 0 ? hud.hotbarItemIds[hud.equippedSlot] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-5">
      <div className="flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-amber-500/35 bg-stone-950 shadow-2xl">
        <div className="flex items-start justify-between border-b border-stone-800 bg-gradient-to-r from-stone-900 to-amber-950/30 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-2">
              <Shirt className="h-6 w-6 text-amber-300" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[.22em] text-amber-400/80">
                Walk-in Wardrobe
              </div>
              <h2 className="font-display text-xl font-bold text-amber-100">
                Mansion Suite Wardrobe
              </h2>
              <p className="mt-1 text-xs text-stone-400">
                Store or retrieve equipment and wear it directly from the closet.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close wardrobe"
            className="rounded-xl border border-stone-700 bg-stone-900 p-2 text-stone-400 transition hover:bg-stone-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="survival-scroll grid gap-4 overflow-y-auto p-4 sm:grid-cols-2 sm:p-5">
          <section>
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-amber-200">
              <Shirt className="h-4 w-4" /> In the wardrobe
              <span className="ml-auto rounded-full bg-stone-800 px-2 py-0.5 text-xs text-stone-400">
                {stored.reduce((sum, slot) => sum + slot.quantity, 0)}
              </span>
            </div>
            <div className="space-y-2">
              {stored.length === 0 && (
                <div className="rounded-xl border border-dashed border-stone-700 bg-stone-900/60 p-5 text-center text-sm text-stone-500">
                  The closet is empty. Store extra gear from your pack.
                </div>
              )}
              {stored.map((slot) => {
                const def = ITEMS[slot.itemId];
                return (
                  <div
                    key={slot.itemId}
                    className="flex items-center gap-3 rounded-xl border border-stone-700 bg-stone-900/80 p-3"
                  >
                    <div className="rounded-lg border border-stone-700 bg-stone-950 p-2">
                      <ItemIcon itemId={slot.itemId} className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-stone-100">
                        {def.name} <span className="text-stone-500">×{slot.quantity}</span>
                      </div>
                      <div className="text-[11px] text-stone-500">{def.category}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onTake(slot.itemId)}
                      className="min-h-9 rounded-lg border border-stone-600 bg-stone-800 px-3 text-xs font-bold text-stone-200 transition hover:bg-stone-700"
                    >
                      Take
                    </button>
                    <button
                      type="button"
                      onClick={() => onWear(slot.itemId)}
                      className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-amber-400/50 bg-amber-400 px-3 text-xs font-bold text-stone-950 transition hover:bg-amber-300"
                    >
                      <Check className="h-3.5 w-3.5" /> Wear
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-stone-200">
              <Backpack className="h-4 w-4" /> Carried gear
              <span className="ml-auto rounded-full bg-stone-800 px-2 py-0.5 text-xs text-stone-400">
                {carried.reduce((sum, slot) => sum + slot.quantity, 0)}
              </span>
            </div>
            <div className="space-y-2">
              {carried.length === 0 && (
                <div className="rounded-xl border border-dashed border-stone-700 bg-stone-900/60 p-5 text-center text-sm text-stone-500">
                  No clothing, tools or equipment in the backpack.
                </div>
              )}
              {carried.map((slot) => {
                const def = ITEMS[slot.itemId];
                return (
                  <div
                    key={slot.itemId}
                    className="flex items-center gap-3 rounded-xl border border-stone-700 bg-stone-900/80 p-3"
                  >
                    <div className="rounded-lg border border-stone-700 bg-stone-950 p-2">
                      <ItemIcon itemId={slot.itemId} className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-stone-100">
                        {def.name} <span className="text-stone-500">×{slot.quantity}</span>
                      </div>
                      <div className="text-[11px] text-stone-500">
                        {equippedId === slot.itemId ? 'Currently equipped' : def.category}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onStore(slot.itemId)}
                      className="min-h-9 rounded-lg border border-stone-600 bg-stone-800 px-3 text-xs font-bold text-stone-200 transition hover:bg-stone-700"
                    >
                      Store
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
        <div className="border-t border-stone-800 bg-stone-900/70 px-5 py-3 text-xs text-stone-500">
          Wardrobe contents are saved with this game slot. Wearing an item equips it in your hotbar.
        </div>
      </div>
    </div>
  );
}
