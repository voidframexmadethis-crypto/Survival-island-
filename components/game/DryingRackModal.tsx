'use client';

import React from 'react';
import { Flame, Sun, Utensils, X } from 'lucide-react';
import { ITEMS } from '@/game/data/items';
import { HUDStateSnapshot, ItemId, PlacedStructure } from '@/game/types';
import { ItemIcon } from './ItemIcon';

interface DryingRackModalProps {
  hud: HUDStateSnapshot;
  structureId?: string;
  onHangMeat: (structureId: string, itemId: ItemId) => void;
  onCollectMeat: (structureId: string, slotIdx: number) => void;
  onClose: () => void;
}

export function DryingRackModal({
  hud,
  structureId,
  onHangMeat,
  onCollectMeat,
  onClose,
}: DryingRackModalProps) {
  const structure = hud.structures.find((s) => s.id === structureId) as
    | (PlacedStructure & { dryingSlots?: { itemId: ItemId; quantity: number; progress: number }[] })
    | undefined;

  const dryingSlots = structure?.dryingSlots || [
    { itemId: 'washed_meat' as ItemId, quantity: 0, progress: 0 },
    { itemId: 'washed_meat' as ItemId, quantity: 0, progress: 0 },
    { itemId: 'washed_meat' as ItemId, quantity: 0, progress: 0 },
    { itemId: 'washed_meat' as ItemId, quantity: 0, progress: 0 },
  ];

  const washedMeatItems = hud.inventory.filter(
    (slot) =>
      slot.quantity > 0 &&
      (slot.itemId === 'washed_meat' || slot.itemId === 'washed_dino_meat'),
  );
  const unwashedMeatCount = hud.inventory
    .filter(
      (slot) =>
        slot.quantity > 0 &&
        (slot.itemId === 'raw_meat' || slot.itemId === 'dino_meat'),
    )
    .reduce((acc, s) => acc + s.quantity, 0);

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
    >
      <div className="w-full max-w-2xl rounded-2xl bg-stone-900 border border-amber-500/50 shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800 bg-stone-950/60">
          <div className="flex items-center gap-2.5">
            <Sun className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="font-display text-lg font-bold text-amber-300">
                Meat Drying Rack
              </h2>
              <p className="text-xs text-stone-400">
                Hang meat washed with soap in Azure Lake to air-dry into slabs, then cut them with your Hunting Knife.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 transition"
            aria-label="Close Drying Rack"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto survival-scroll space-y-5">
          {/* Hanging Slots on Rack */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5" />
              <span>Hanging Curing Slots (4 Hooks)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {dryingSlots.map((slot, idx) => {
                const isOccupied = Boolean(slot.itemId && slot.quantity > 0);
                const isReady = slot.progress >= 1.0;
                const def = isOccupied ? ITEMS[slot.itemId] : null;

                return (
                  <div
                    key={idx}
                    className={`rounded-xl border p-3.5 flex flex-col justify-between gap-3 ${
                      isReady
                        ? 'bg-emerald-950/35 border-emerald-500/60'
                        : isOccupied
                          ? 'bg-stone-950/80 border-amber-600/40'
                          : 'bg-stone-950/40 border-stone-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-stone-800 flex items-center justify-center shrink-0 border border-stone-700">
                          {isOccupied && def ? (
                            <ItemIcon itemId={slot.itemId} className="w-6 h-6" />
                          ) : (
                            <span className="text-xs font-mono text-stone-600">#{idx + 1}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-stone-100 truncate">
                            {isOccupied && def ? def.name : `Empty Hook #${idx + 1}`}
                          </div>
                          <div className="text-[11px] text-stone-400">
                            {isOccupied
                              ? isReady
                                ? 'Cured & Ready!'
                                : `Drying: ${Math.round(slot.progress * 100)}%`
                              : 'Ready for hanging meat'}
                          </div>
                        </div>
                      </div>

                      {isOccupied && structureId && (
                        <button
                          type="button"
                          disabled={!isReady}
                          onClick={() => onCollectMeat(structureId, idx)}
                          className={`min-h-[38px] px-3 rounded-lg text-xs font-bold transition ${
                            isReady
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-stone-950 shadow-lg animate-pulse'
                              : 'bg-stone-800 text-stone-400 cursor-not-allowed opacity-75'
                          }`}
                        >
                          {isReady ? 'Collect Dried Slab' : `${Math.round(slot.progress * 100)}%`}
                        </button>
                      )}
                    </div>

                    {isOccupied && (
                      <div className="w-full h-2 rounded-full bg-stone-800 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isReady ? 'bg-emerald-400' : 'bg-amber-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.round(slot.progress * 100))}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Backpack Washed Meat */}
          <div className="space-y-3 pt-3 border-t border-stone-800">
            <div className="text-xs font-semibold text-stone-300 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5">
                <Utensils className="w-3.5 h-3.5" />
                <span>Washed Meat in Backpack (Ready to Hang)</span>
              </span>
              {unwashedMeatCount > 0 && (
                <span className="text-[11px] text-cyan-300 font-normal">
                  {unwashedMeatCount} unwashed cut{unwashedMeatCount > 1 ? 's' : ''} — wash with Soap in Azure Lake first
                </span>
              )}
            </div>
            {washedMeatItems.length === 0 ? (
              <div className="rounded-xl bg-stone-950/60 border border-stone-800 p-5 text-xs text-stone-400 text-center space-y-1">
                <div>
                  No washed meat in backpack yet.
                </div>
                <div className="text-cyan-300">
                  Carry Raw Meat &amp; Soap to Azure Lake, wash &amp; scrub the meat clean, then hang it here to dry!
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {washedMeatItems.map((slot, idx) => {
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
                          <div className="text-[11px] font-mono-tabular text-amber-400">
                            Available: ×{slot.quantity}
                          </div>
                        </div>
                      </div>
                      {structureId && (
                        <button
                          type="button"
                          onClick={() => onHangMeat(structureId, slot.itemId)}
                          className="min-h-[38px] px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 text-xs font-bold transition"
                        >
                          Hang on Rack
                        </button>
                      )}
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
