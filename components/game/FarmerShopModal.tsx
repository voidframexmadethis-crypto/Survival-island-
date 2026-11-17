'use client';

import React, { useMemo, useState } from 'react';
import {
  Coins,
  ShoppingBag,
  Sprout,
  Store,
  Tag,
  X,
} from 'lucide-react';
import {
  FARM_SHOP_STOCK,
  ITEMS,
  ITEM_SELL_PRICES,
} from '@/game/data/items';
import { HUDStateSnapshot, ItemId } from '@/game/types';
import { ItemIcon } from './ItemIcon';

interface FarmerShopModalProps {
  hud: HUDStateSnapshot;
  onBuy: (itemId: ItemId) => boolean;
  onSell: (itemId: ItemId, qty: number) => boolean;
  onEquipSeed?: (itemId: ItemId) => void;
  onClose: () => void;
}

type ShopTab = 'seeds' | 'market' | 'sell';

export function FarmerShopModal({
  hud,
  onBuy,
  onSell,
  onEquipSeed,
  onClose,
}: FarmerShopModalProps) {
  const [tab, setTab] = useState<ShopTab>('seeds');

  const countOf = (itemId: ItemId) =>
    hud.inventory
      .filter((s) => s.itemId === itemId)
      .reduce((acc, s) => acc + s.quantity, 0);

  const seedListings = useMemo(
    () => FARM_SHOP_STOCK.filter((s) => s.group === 'seeds'),
    [],
  );

  const marketListings = useMemo(
    () => FARM_SHOP_STOCK.filter((s) => s.group !== 'seeds'),
    [],
  );

  const sellableInventory = useMemo(
    () =>
      hud.inventory.filter(
        (slot) =>
          slot.quantity > 0 &&
          typeof ITEM_SELL_PRICES[slot.itemId] === 'number',
      ),
    [hud.inventory],
  );

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-3 sm:p-5">
      <div className="w-full max-w-3xl rounded-2xl bg-stone-900 border border-stone-700/80 shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-950/70 border border-amber-700/60 flex items-center justify-center shrink-0">
              <Store className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-stone-100">
                Farmer Elias — Island Farm Market
              </h2>
              <p className="text-xs text-stone-400">
                Buy crop seeds to plant &amp; grow, fresh vegetables, baking staples, or sell your harvest.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="px-3 py-1.5 rounded-xl bg-amber-950/70 border border-amber-600/60 text-amber-300 text-xs font-mono-tabular font-bold flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-amber-400" />
              <span>{hud.coins} Coins</span>
            </div>
            <button
              onClick={onClose}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200"
              aria-label="Close Farm Market"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-5 py-2.5 bg-stone-950/60 border-b border-stone-800 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTab('seeds')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              tab === 'seeds'
                ? 'bg-emerald-600 text-stone-950'
                : 'bg-stone-900 text-stone-300 border border-stone-700 hover:border-stone-500'
            }`}
          >
            <Sprout className="w-4 h-4" />
            <span>Seeds ({seedListings.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('market')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              tab === 'market'
                ? 'bg-amber-600 text-stone-950'
                : 'bg-stone-900 text-stone-300 border border-stone-700 hover:border-stone-500'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Veggies, Bakery &amp; Tools ({marketListings.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('sell')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              tab === 'sell'
                ? 'bg-sky-600 text-stone-950'
                : 'bg-stone-900 text-stone-300 border border-stone-700 hover:border-stone-500'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>Sell Harvest ({sellableInventory.length})</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto survival-scroll space-y-2.5">
          {tab === 'seeds' && (
            <>
              <div className="rounded-xl bg-emerald-950/35 border border-emerald-800/50 px-3.5 py-2 text-xs text-emerald-200">
                Tip: Purchased seeds auto-pin to your HUD bar! Walk beside the tilled soil boxes outside and press Action (E) to plant, then water &amp; harvest when mature.
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {seedListings.map((entry) => {
                  const def = ITEMS[entry.itemId];
                  const owned = countOf(entry.itemId);
                  const canAfford = hud.coins >= entry.price;
                  return (
                    <div
                      key={entry.itemId}
                      className="rounded-xl bg-stone-950/75 border border-stone-800 p-3.5 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-stone-800 flex items-center justify-center shrink-0">
                          <ItemIcon itemId={entry.itemId} className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-stone-100 truncate">
                            {def.name} ×{entry.quantity}
                          </div>
                          <div className="text-[11px] text-stone-400 truncate">
                            {def.description}
                          </div>
                          {owned > 0 && (
                            <div className="text-[11px] text-emerald-400 font-mono-tabular mt-0.5">
                              In pack: {owned}
                              {onEquipSeed && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onEquipSeed(entry.itemId);
                                    onClose();
                                  }}
                                  className="ml-2 underline text-amber-300 hover:text-amber-200"
                                >
                                  Equip to Plant
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={!canAfford}
                        onClick={() => onBuy(entry.itemId)}
                        className={`min-h-[42px] px-3.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                          canAfford
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-stone-950'
                            : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                        }`}
                      >
                        <Coins className="w-3.5 h-3.5" />
                        <span>{entry.price}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {tab === 'market' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {marketListings.map((entry) => {
                const def = ITEMS[entry.itemId];
                const owned = countOf(entry.itemId);
                const canAfford = hud.coins >= entry.price;
                return (
                  <div
                    key={entry.itemId}
                    className="rounded-xl bg-stone-950/75 border border-stone-800 p-3.5 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-stone-800 flex items-center justify-center shrink-0">
                        <ItemIcon itemId={entry.itemId} className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-stone-100 truncate">
                          {def.name} {entry.quantity > 1 ? `×${entry.quantity}` : ''}
                        </div>
                        <div className="text-[11px] text-stone-400 truncate">
                          {def.description}
                        </div>
                        {owned > 0 && (
                          <div className="text-[11px] text-amber-400 font-mono-tabular mt-0.5">
                            Owned: {owned}
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!canAfford}
                      onClick={() => onBuy(entry.itemId)}
                      className={`min-h-[42px] px-3.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                        canAfford
                          ? 'bg-amber-600 hover:bg-amber-500 text-stone-950'
                          : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                      }`}
                    >
                      <Coins className="w-3.5 h-3.5" />
                      <span>{entry.price}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'sell' && (
            <>
              {sellableInventory.length === 0 ? (
                <div className="rounded-xl bg-stone-950/70 border border-stone-800 p-6 text-center text-xs text-stone-400">
                  Harvest wheat, sugarcane, home-grown vegetables, bake artisan bread/cakes, or hunt meat to sell for Farm Coins!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {sellableInventory.map((slot, idx) => {
                    const def = ITEMS[slot.itemId];
                    const unitPrice = ITEM_SELL_PRICES[slot.itemId] ?? 4;
                    return (
                      <div
                        key={`${slot.itemId}_${idx}`}
                        className="rounded-xl bg-stone-950/75 border border-stone-800 p-3.5 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-stone-800 flex items-center justify-center shrink-0">
                            <ItemIcon itemId={slot.itemId} className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-stone-100 truncate">
                              {def.name} (×{slot.quantity})
                            </div>
                            <div className="text-[11px] font-mono-tabular text-amber-300">
                              +{unitPrice} Coins each
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => onSell(slot.itemId, 1)}
                            className="min-h-[40px] px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-stone-950 text-xs font-bold whitespace-nowrap"
                          >
                            Sell 1
                          </button>
                          {slot.quantity > 1 && (
                            <button
                              type="button"
                              onClick={() => onSell(slot.itemId, slot.quantity)}
                              className="min-h-[40px] px-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold whitespace-nowrap"
                            >
                              All
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
