'use client';

import React, { useState } from 'react';
import { Flame, Hammer, MapPin, PackageOpen, X } from 'lucide-react';
import { ITEMS } from '@/game/data/items';
import { HUDStateSnapshot, ItemId } from '@/game/types';
import { ItemIcon } from './ItemIcon';

interface PlaceModalProps {
  hud: HUDStateSnapshot;
  onPlaceItem: (itemId: ItemId) => boolean;
  onSparkCampfire?: () => boolean;
  onOpenCraft: () => void;
  onClose: () => void;
}

const STRUCTURE_ITEM_IDS: ItemId[] = [
  'coaster_station',
  'campfire',
  'crafting_table',
  'cooking_station',
  'storage_chest',
  'sleeping_area',
  'basic_shelter',
  'auto_turret',
  'smart_tv',
  'stone_block',
  'stone_pillar',
  'stone_arch',
  'timber_beam',
  'timber_pillar',
];

export function PlaceModal({
  hud,
  onPlaceItem,
  onSparkCampfire,
  onOpenCraft,
  onClose,
}: PlaceModalProps) {
  const [keepOpen, setKeepOpen] = useState(false);
  const isCreativeOrFlat =
    hud.gameMode === 'sandbox' || hud.worldType === 'flat';

  const countOf = (itemId: ItemId) =>
    hud.inventory
      .filter((s) => s.itemId === itemId)
      .reduce((acc, s) => acc + s.quantity, 0);

  const equippedId =
    hud.equippedSlot >= 0 ? hud.hotbarItemIds[hud.equippedSlot] : null;
  const equippedQty = equippedId ? countOf(equippedId) : 0;
  const equippedDef =
    equippedId && (equippedQty > 0 || isCreativeOrFlat) ? ITEMS[equippedId] : null;

  const ownedStructures = hud.inventory.filter(
    (s) =>
      s.quantity > 0 &&
      Boolean(ITEMS[s.itemId].structureType || ITEMS[s.itemId].structuralKind),
  );
  const ownedSupplies = hud.inventory.filter(
    (s) =>
      s.quantity > 0 &&
      !ITEMS[s.itemId].structureType &&
      !ITEMS[s.itemId].structuralKind,
  );
  const unownedStructureIds = STRUCTURE_ITEM_IDS.filter(
    (id) => countOf(id) <= 0,
  );
  const creativeStructureIds = Array.from(
    new Set<ItemId>([
      ...STRUCTURE_ITEM_IDS,
      ...ownedStructures.map((s) => s.itemId),
    ]),
  );

  const handlePlace = (itemId: ItemId) => {
    const ok = onPlaceItem(itemId);
    if (ok && !keepOpen) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-3 sm:p-5">
      <div className="w-full max-w-2xl rounded-2xl bg-stone-900 border border-stone-700/85 shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800 gap-3">
          <div className="flex items-center gap-2.5">
            <PackageOpen className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <h2 className="font-display text-lg font-bold text-stone-100">
                Place in World
              </h2>
              <p className="text-xs text-stone-400">
                {isCreativeOrFlat
                  ? 'Creative Free Build active — place Coaster Stations, Structures, and Masonry directly.'
                  : 'Build camp structures or set supplies, food, and gear down in front of you.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 shrink-0"
            aria-label="Close Place Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Keep-open bar */}
        <div className="px-5 py-2.5 bg-stone-950/60 border-b border-stone-800 flex items-center justify-between gap-3">
          <span className="text-xs text-stone-400">
            Placed items appear ~2m ahead on dry ground.
          </span>
          <button
            type="button"
            onClick={() => setKeepOpen((v) => !v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 ${
              keepOpen
                ? 'bg-amber-600 border-amber-400 text-stone-950'
                : 'bg-stone-900 border-stone-700 text-stone-300 hover:border-stone-500'
            }`}
          >
            {keepOpen ? 'Multi-Place: On' : 'Multi-Place: Off'}
          </button>
        </div>

        <div className="p-5 overflow-y-auto survival-scroll space-y-5">
          {/* Flint + Kindling Quick Fire-Starter */}
          {(() => {
            const hasFlint = countOf('flint') > 0;
            const hasFuel =
              countOf('branch') > 0 ||
              countOf('wood') > 0 ||
              countOf('grass') > 0;
            return (
              <div className="rounded-xl bg-orange-950/35 border border-orange-700/60 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-900/50 border border-orange-600/50 flex items-center justify-center shrink-0">
                    <Flame className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-orange-200">
                      Spark Fire on Ground (Branch + Flint)
                    </div>
                    <p className="text-[11px] text-stone-300 mt-0.5">
                      Place a Dry Branch (or Wood/Grass) and Sharp Flint together on the ground to ignite a still Campfire, or strike them directly here.
                    </p>
                  </div>
                </div>
                {onSparkCampfire && (
                  <button
                    type="button"
                    disabled={!hasFlint || !hasFuel}
                    onClick={() => {
                      const ok = onSparkCampfire();
                      if (ok && !keepOpen) onClose();
                    }}
                    className={`min-h-[42px] px-3.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 flex items-center justify-center gap-1.5 ${
                      hasFlint && hasFuel
                        ? 'bg-orange-600 hover:bg-orange-500 text-stone-950'
                        : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                    }`}
                  >
                    <Flame className="w-4 h-4" />
                    <span>Make Fire</span>
                  </button>
                )}
              </div>
            );
          })()}

          {/* Quick Place Currently Equipped Item */}
          {equippedDef && (
            <div className="rounded-xl bg-amber-950/35 border border-amber-700/60 p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-lg bg-stone-800 border border-amber-500/40 flex items-center justify-center shrink-0">
                  <ItemIcon itemId={equippedDef.id} className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-300">
                    Currently Equipped
                  </div>
                  <div className="text-sm font-bold text-stone-100 truncate">
                    {equippedDef.name}{' '}
                    {equippedQty > 0 ? `(×${equippedQty})` : '(Free Build)'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handlePlace(equippedDef.id)}
                className="min-h-[44px] px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <MapPin className="w-4 h-4" />
                <span>
                  {equippedDef.structureType || equippedDef.structuralKind
                    ? 'Build Here'
                    : 'Place Down'}
                </span>
              </button>
            </div>
          )}

          {/* Camp Structures & Structural Engineering */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-300">
                Park &amp; Camp Structures &amp; Masonry
              </h3>
              <button
                type="button"
                onClick={onOpenCraft}
                className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1"
              >
                <Hammer className="w-3.5 h-3.5" />
                <span>Craft More</span>
              </button>
            </div>

            {isCreativeOrFlat ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {creativeStructureIds.map((itemId) => {
                  const def = ITEMS[itemId];
                  const qty = countOf(itemId);
                  return (
                    <div
                      key={itemId}
                      className="rounded-xl bg-stone-950/75 border border-stone-800 p-3 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-stone-800 flex items-center justify-center shrink-0">
                          <ItemIcon itemId={itemId} className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-stone-100 truncate">
                            {def.name}
                          </div>
                          <div className="text-[11px] text-sky-400 font-mono-tabular">
                            {qty > 0 ? `Ready: ×${qty}` : 'Free Build'}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handlePlace(itemId)}
                        className="min-h-[40px] px-3.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs whitespace-nowrap shrink-0"
                      >
                        Place
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <>
                {ownedStructures.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {ownedStructures.map((slot, idx) => {
                      const def = ITEMS[slot.itemId];
                      return (
                        <div
                          key={`${slot.itemId}_${idx}`}
                          className="rounded-xl bg-stone-950/75 border border-stone-800 p-3 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-lg bg-stone-800 flex items-center justify-center shrink-0">
                              <ItemIcon itemId={slot.itemId} className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-stone-100 truncate">
                                {def.name}
                              </div>
                              <div className="text-[11px] text-amber-400 font-mono-tabular">
                                Ready: ×{slot.quantity}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handlePlace(slot.itemId)}
                            className="min-h-[40px] px-3.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs whitespace-nowrap shrink-0"
                          >
                            Place
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl bg-stone-950/50 border border-stone-800/80 p-3.5 text-xs text-stone-400 flex items-center justify-between gap-3">
                    <span>
                      No crafted camp structures in your bag yet. Craft a Campfire, Workbench, Box, or Coaster Station to build it here.
                    </span>
                    <button
                      type="button"
                      onClick={onOpenCraft}
                      className="min-h-[38px] px-3 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 font-semibold text-xs whitespace-nowrap shrink-0"
                    >
                      Open Craft
                    </button>
                  </div>
                )}

                {unownedStructureIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {unownedStructureIds.map((id) => (
                      <button
                        key={id}
                        type="button"
                        onClick={onOpenCraft}
                        className="px-2.5 py-1 rounded-lg bg-stone-950/60 border border-stone-800 text-[11px] text-stone-500 hover:text-stone-300 hover:border-stone-600 flex items-center gap-1.5"
                        title="Craft this structure first"
                      >
                        <ItemIcon itemId={id} className="w-3.5 h-3.5 opacity-60" />
                        <span>{ITEMS[id].name} (0)</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* General Supplies, Fruits, Wood, Stones & Gear */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-300">
              Set Down Supplies, Food & Gear
            </h3>
            {ownedSupplies.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {ownedSupplies.map((slot, idx) => {
                  const def = ITEMS[slot.itemId];
                  return (
                    <div
                      key={`${slot.itemId}_${idx}`}
                      className="rounded-xl bg-stone-950/75 border border-stone-800 p-3 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-stone-800 flex items-center justify-center shrink-0">
                          <ItemIcon itemId={slot.itemId} className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-stone-100 truncate">
                            {def.name}
                          </div>
                          <div className="text-[11px] text-stone-400 font-mono-tabular">
                            Owned: ×{slot.quantity}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handlePlace(slot.itemId)}
                        className="min-h-[40px] px-3.5 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-100 font-semibold text-xs whitespace-nowrap shrink-0"
                      >
                        Place
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl bg-stone-950/50 border border-stone-800/80 p-3.5 text-xs text-stone-400">
                Your bag is currently empty. Gather wood, stones, or fruit from the island to place items down.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
