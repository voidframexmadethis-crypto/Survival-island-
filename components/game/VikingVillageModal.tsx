'use client';

import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Coins,
  Compass,
  MessageSquare,
  ScrollText,
  Shield,
  ShoppingBag,
  Users,
  X,
} from 'lucide-react';
import { ITEMS } from '@/game/data/items';
import {
  VIKING_QUESTS,
  VIKING_TRADE_OFFERS,
  VikingInteractionResult,
  vikingVillage,
} from '@/game/systems/vikingVillageSystem';
import { HUDStateSnapshot, ItemId } from '@/game/types';
import { DRAGON_VALLEY_POS } from '@/game/world/terrain';
import { ItemIcon } from './ItemIcon';

interface VikingVillageModalProps {
  hud: HUDStateSnapshot;
  initialVillagerId?: string;
  onInteractVillager: (villagerId: string) => VikingInteractionResult | null;
  onBuyOffer: (offerId: string) => boolean;
  onCompleteQuest: (questId: string) => boolean;
  onClose: () => void;
}

type VikingTab = 'conversation' | 'trading' | 'quests';

export function VikingVillageModal({
  hud,
  initialVillagerId,
  onInteractVillager,
  onBuyOffer,
  onCompleteQuest,
  onClose,
}: VikingVillageModalProps) {
  const defaultId =
    initialVillagerId && vikingVillage.villagers.some((v) => v.id === initialVillagerId)
      ? initialVillagerId
      : vikingVillage.villagers[0]?.id || 'viking_jarl_erik';

  const [selectedVillagerId, setSelectedVillagerId] = useState<string>(defaultId);
  const [tab, setTab] = useState<VikingTab>('conversation');

  const interaction = useMemo(
    () => onInteractVillager(selectedVillagerId) ?? vikingVillage.interact(selectedVillagerId),
    [onInteractVillager, selectedVillagerId],
  );

  const completedQuestIds = hud.vikingVillageProgress?.completedQuestIds ?? [];
  const reputation = hud.vikingVillageProgress?.reputation ?? 0;
  const dragonUnlocked = hud.caveSummary?.dragonUnlocked ?? false;

  const countOf = (itemId: ItemId) =>
    hud.inventory
      .filter((slot) => slot.itemId === itemId)
      .reduce((sum, slot) => sum + slot.quantity, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-5">
      <div className="w-full max-w-3xl rounded-2xl bg-stone-900 border border-amber-600/40 shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-950/70 border border-amber-600/50 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-amber-400" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-lg font-bold text-stone-100 truncate">
                Viking Village — Fjellhavn Longhouse
              </h2>
              <p className="text-xs text-stone-400 truncate">
                Friendly Nordic Clan · Clan Reputation {reputation} ·{' '}
                {completedQuestIds.length}/{VIKING_QUESTS.length} Quests Done
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="px-3 py-1.5 rounded-xl bg-amber-950/70 border border-amber-600/55 text-amber-300 text-xs font-mono-tabular font-bold flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-amber-400" />
              <span>{hud.coins} Coins</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 transition-colors"
              aria-label="Close Viking Village"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Friendly Villagers Selector */}
        <div className="px-5 py-3 bg-stone-950/70 border-b border-stone-800 space-y-2 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-stone-400">
            <Users className="w-3.5 h-3.5 text-amber-400" />
            <span>Speak with a Villager</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {vikingVillage.villagers.map((v) => {
              const active = v.id === selectedVillagerId;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedVillagerId(v.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-amber-500 text-stone-950 border-amber-300'
                      : 'bg-stone-900 text-stone-200 border-stone-700 hover:border-stone-500'
                  }`}
                >
                  {v.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Interaction Mode Tabs */}
        <div className="px-5 py-2.5 bg-stone-950/40 border-b border-stone-800 flex flex-wrap gap-2 shrink-0">
          {interaction?.conversation && (
            <button
              type="button"
              onClick={() => setTab('conversation')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                tab === 'conversation'
                  ? 'bg-amber-500 text-stone-950'
                  : 'bg-stone-900 text-stone-300 border border-stone-700 hover:border-stone-500'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Conversation</span>
            </button>
          )}
          {interaction?.trading && (
            <button
              type="button"
              onClick={() => setTab('trading')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                tab === 'trading'
                  ? 'bg-emerald-500 text-stone-950'
                  : 'bg-stone-900 text-stone-300 border border-stone-700 hover:border-stone-500'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Nordic Trade ({VIKING_TRADE_OFFERS.length})</span>
            </button>
          )}
          {interaction?.quests && (
            <button
              type="button"
              onClick={() => setTab('quests')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                tab === 'quests'
                  ? 'bg-sky-500 text-stone-950'
                  : 'bg-stone-900 text-stone-300 border border-stone-700 hover:border-stone-500'
              }`}
            >
              <ScrollText className="w-4 h-4" />
              <span>Clan Quests ({VIKING_QUESTS.length})</span>
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto survival-scroll space-y-3 text-sm">
          {tab === 'conversation' && interaction?.villager && (
            <div className="space-y-3">
              <div className="rounded-xl bg-stone-950/75 border border-stone-800 p-4 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-display text-base font-bold text-stone-100">
                      {interaction.villager.name}
                    </h3>
                    <div className="text-xs text-amber-300/90">
                      {interaction.villager.role || 'Nordic Villager'} ·{' '}
                      {interaction.villager.friendly ? 'Friendly Ally' : 'Neutral'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTab('trading')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/35 border border-emerald-500/40 text-emerald-200 text-xs font-semibold whitespace-nowrap shrink-0"
                    >
                      Open Trade
                    </button>
                    <button
                      type="button"
                      onClick={() => setTab('quests')}
                      className="px-3 py-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600/35 border border-sky-500/40 text-sky-200 text-xs font-semibold whitespace-nowrap shrink-0"
                    >
                      View Quests
                    </button>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  {(interaction.villager.dialogue || []).map((line, i) => (
                    <p
                      key={i}
                      className="rounded-lg bg-stone-900/90 border border-stone-800/80 px-3.5 py-2.5 text-xs leading-relaxed text-stone-200"
                    >
                      &ldquo;{line}&rdquo;
                    </p>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-stone-950/60 border border-stone-800 p-3.5 flex items-center gap-2.5 text-xs text-stone-300">
                <Compass className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  Dragon Valley rises beneath the golden beacon at X {DRAGON_VALLEY_POS.x}, Z {DRAGON_VALLEY_POS.z}, on the remote northern ridge over 800 m from the hill house. Gather wild elemental eggs there or trade with Freya for Storm &amp; Shadow eggs.
                </span>
              </div>
            </div>
          )}

          {tab === 'trading' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {VIKING_TRADE_OFFERS.map((offer) => {
                const canAfford = hud.coins >= offer.costCoins;
                const itemDef = offer.giveItemId ? ITEMS[offer.giveItemId] : null;
                return (
                  <div
                    key={offer.id}
                    className="rounded-xl bg-stone-950/75 border border-stone-800 p-3.5 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-stone-800 flex items-center justify-center shrink-0">
                        {offer.giveItemId ? (
                          <ItemIcon itemId={offer.giveItemId} className="w-5 h-5" />
                        ) : (
                          <Shield className="w-5 h-5 text-amber-300" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-stone-100 truncate">
                          {offer.title}
                        </div>
                        <div className="text-[11px] text-stone-400 truncate">
                          {offer.description}
                        </div>
                        {itemDef && (
                          <div className="text-[11px] text-amber-300/90 font-mono-tabular mt-0.5">
                            Owned: {countOf(itemDef.id)}
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!canAfford}
                      onClick={() => onBuyOffer(offer.id)}
                      className={`min-h-[40px] px-3.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-colors ${
                        canAfford
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-stone-950'
                          : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                      }`}
                    >
                      <Coins className="w-3.5 h-3.5" />
                      <span>{offer.costCoins}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'quests' && (
            <div className="space-y-3">
              {VIKING_QUESTS.map((quest) => {
                const isDone = completedQuestIds.includes(quest.id);
                const giver = vikingVillage.villagers.find((v) => v.id === quest.giverId);
                const meetsRequirements =
                  quest.requirementType === 'red_dragon'
                    ? dragonUnlocked
                    : (quest.requiredItems || []).every(
                        (req) => countOf(req.itemId) >= req.quantity,
                      );

                return (
                  <div
                    key={quest.id}
                    className={`rounded-xl border p-4 space-y-2.5 ${
                      isDone
                        ? 'bg-emerald-950/35 border-emerald-500/45'
                        : 'bg-stone-950/75 border-stone-800'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-display font-bold text-stone-100 text-sm">
                            {quest.title}
                          </span>
                          {isDone && (
                            <span className="text-xs font-semibold text-emerald-300 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-stone-400">
                          From {giver?.name || 'Viking Villager'} · {quest.description}
                        </div>
                      </div>

                      {!isDone && (
                        <button
                          type="button"
                          disabled={!meetsRequirements}
                          onClick={() => onCompleteQuest(quest.id)}
                          className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-colors ${
                            meetsRequirements
                              ? 'bg-sky-500 hover:bg-sky-400 text-stone-950'
                              : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                          }`}
                        >
                          Turn In Quest
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs font-mono-tabular pt-1">
                      {quest.requirementType === 'red_dragon' ? (
                        <span className={dragonUnlocked ? 'text-emerald-300' : 'text-amber-300'}>
                          Red Dragon Boss: {dragonUnlocked ? 'Defeated' : 'Active in Cave'}
                        </span>
                      ) : (
                        (quest.requiredItems || []).map((req) => {
                          const have = countOf(req.itemId);
                          return (
                            <span
                              key={req.itemId}
                              className={have >= req.quantity ? 'text-emerald-300' : 'text-stone-300'}
                            >
                              {ITEMS[req.itemId]?.name || req.itemId}: {Math.min(have, req.quantity)}/{req.quantity}
                            </span>
                          );
                        })
                      )}
                      <span className="text-stone-500">·</span>
                      <span className="text-amber-300">
                        Reward: {quest.rewardCoins} Coins
                        {quest.rewardItems?.map(
                          (rw) => `, ${ITEMS[rw.itemId]?.name || rw.itemId} ×${rw.quantity}`,
                        )}
                        {quest.rewardDragonEgg ? `, ${quest.rewardDragonEgg} Dragon Egg` : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
