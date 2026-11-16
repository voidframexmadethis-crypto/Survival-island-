'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  Backpack,
  Box,
  Check,
  Clock,
  Droplets,
  Hammer,
  Layers,
  Lock,
  Shield,
  Trash2,
  X,
} from 'lucide-react';
import { ITEMS } from '@/game/data/items';
import { CRAFTING_RECIPES } from '@/game/data/recipes';
import { CraftingRecipe, HUDStateSnapshot, ItemId } from '@/game/types';
import { ItemIcon } from './ItemIcon';

type BackpackTab = 'inventory' | 'crafting' | 'equipment' | 'resources';

const RESOURCE_ORDER: ItemId[] = [
  'wood',
  'branch',
  'stone',
  'flint',
  'metal_ore',
  'fiber',
  'grass',
  'leaves',
  'wheat',
  'clay',
  'sand',
  'hide',
  'bone',
  'raw_meat',
  'rope',
];

interface InventoryModalProps {
  hud: HUDStateSnapshot;
  nearTable?: boolean;
  nearOceanWater?: boolean;
  chestStructureId?: string;
  onUseOrEquip: (itemId: ItemId) => void;
  onCleanBottle?: () => void;
  onDropItem?: (itemId: ItemId) => void;
  onAssignHotbar: (slotIdx: number, itemId: ItemId | null) => void;
  onSelectHotbarSlot?: (slotIdx: number) => void;
  onCraft?: (recipeId: string) => void;
  onCraftSound?: () => void;
  onTransferToChest?: (structureId: string, itemId: ItemId) => void;
  onTransferFromChest?: (structureId: string, itemId: ItemId) => void;
  onClose: () => void;
}

export function InventoryModal({
  hud,
  nearTable = false,
  nearOceanWater = false,
  chestStructureId,
  onUseOrEquip,
  onCleanBottle,
  onDropItem,
  onAssignHotbar,
  onSelectHotbarSlot,
  onCraft,
  onCraftSound,
  onTransferToChest,
  onTransferFromChest,
  onClose,
}: InventoryModalProps) {
  const [activeTab, setActiveTab] = useState<BackpackTab>('inventory');
  const [selectedItemId, setSelectedItemId] = useState<ItemId | null>(
    hud.inventory[0]?.itemId || null,
  );
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>(
    CRAFTING_RECIPES[0].id,
  );
  const [craftingProgress, setCraftingProgress] = useState<{
    recipeId: string;
    pct: number;
  } | null>(null);
  const craftTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (craftTimerRef.current !== null) {
        window.clearInterval(craftTimerRef.current);
      }
    };
  }, []);

  const chest = chestStructureId
    ? hud.structures.find((s) => s.id === chestStructureId)
    : undefined;

  const countOf = (itemId: ItemId) =>
    hud.inventory
      .filter((s) => s.itemId === itemId)
      .reduce((acc, s) => acc + s.quantity, 0);

  const selectedDef = selectedItemId ? ITEMS[selectedItemId] : null;
  const selectedSlot = selectedItemId
    ? hud.inventory.find((s) => s.itemId === selectedItemId)
    : undefined;

  const selectedRecipe: CraftingRecipe | undefined =
    CRAFTING_RECIPES.find((r) => r.id === selectedRecipeId) ||
    CRAFTING_RECIPES[0];

  const equipmentItems = useMemo(
    () =>
      hud.inventory.filter((slot) => {
        const cat = ITEMS[slot.itemId].category;
        return cat === 'tool' || cat === 'weapon' || cat === 'equipment';
      }),
    [hud.inventory],
  );

  const resourceBreakdown = useMemo(
    () =>
      RESOURCE_ORDER.map((id) => ({
        id,
        def: ITEMS[id],
        qty: hud.inventory
          .filter((s) => s.itemId === id)
          .reduce((sum, s) => sum + s.quantity, 0),
      })),
    [hud.inventory],
  );

  const startTimedCraft = (recipe: CraftingRecipe) => {
    if (!onCraft || craftingProgress) return;
    const hasMats = recipe.ingredients.every(
      (ing) => countOf(ing.itemId) >= ing.quantity,
    );
    const stationOk = !recipe.requiresTable || nearTable;
    if (!hasMats || !stationOk) return;

    onCraftSound?.();
    const durationMs = Math.max(400, recipe.craftTimeSeconds * 1000);
    let elapsed = 0;
    setCraftingProgress({ recipeId: recipe.id, pct: 0 });

    if (craftTimerRef.current !== null) {
      window.clearInterval(craftTimerRef.current);
    }

    craftTimerRef.current = window.setInterval(() => {
      elapsed += 45;
      const pct = Math.min(100, Math.round((elapsed / durationMs) * 100));
      setCraftingProgress({ recipeId: recipe.id, pct });
      if (elapsed >= durationMs) {
        if (craftTimerRef.current !== null) {
          window.clearInterval(craftTimerRef.current);
          craftTimerRef.current = null;
        }
        setCraftingProgress(null);
        onCraft(recipe.id);
      }
    }, 45);
  };

  const tabs: { id: BackpackTab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'inventory',
      label: 'Inventory',
      icon: <Backpack className="w-4 h-4" />,
    },
    {
      id: 'crafting',
      label: 'Crafting',
      icon: <Hammer className="w-4 h-4" />,
    },
    {
      id: 'equipment',
      label: 'Equipment',
      icon: <Shield className="w-4 h-4" />,
    },
    {
      id: 'resources',
      label: 'Resources',
      icon: <Layers className="w-4 h-4" />,
    },
  ];

  const recipeHasMats = selectedRecipe
    ? selectedRecipe.ingredients.every((ing) => countOf(ing.itemId) >= ing.quantity)
    : false;
  const recipeStationOk = selectedRecipe
    ? !selectedRecipe.requiresTable || nearTable
    : false;
  const recipeCanCraft = Boolean(
    selectedRecipe && recipeHasMats && recipeStationOk && !craftingProgress,
  );

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-3 sm:p-5">
      <div className="w-full max-w-4xl rounded-2xl bg-stone-900 border border-stone-700/80 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-800">
          <div className="flex items-center gap-2.5">
            {chest ? (
              <Box className="w-5 h-5 text-amber-400" />
            ) : (
              <Backpack className="w-5 h-5 text-amber-400" />
            )}
            <div>
              <h2 className="font-display text-lg font-bold text-stone-100">
                {chest ? 'Storage Box & Explorer Backpack' : 'Explorer Backpack'}
              </h2>
              <p className="text-[11px] text-stone-400">
                {hud.inventory.length} carried stacks ·{' '}
                {hud.equippedSlot >= 0
                  ? `Equipped Slot ${hud.equippedSlot + 1}`
                  : 'Bare Hands'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200"
            aria-label="Close Backpack"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4 Backpack Tabs */}
        <div className="px-4 py-2.5 border-b border-stone-800 bg-stone-950/50 flex items-center gap-2 overflow-x-auto">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors ${
                  active
                    ? 'bg-amber-600 text-stone-950'
                    : 'bg-stone-800/90 text-stone-300 hover:bg-stone-700'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Bodies */}
        {activeTab === 'inventory' && (
          <div className="flex-1 overflow-y-auto survival-scroll grid grid-cols-1 md:grid-cols-12">
            {/* Explorer Inventory Grid */}
            <div className="md:col-span-7 p-4 border-b md:border-b-0 md:border-r border-stone-800 space-y-4">
              <div className="flex items-center justify-between text-xs font-semibold text-stone-400">
                <span>Carried Items ({hud.inventory.length} stacks)</span>
                <span className="font-mono-tabular text-stone-500">
                  Qty / Max Stack
                </span>
              </div>
              {hud.inventory.length === 0 ? (
                <div className="rounded-xl bg-stone-950/60 border border-stone-800 p-6 text-center text-sm text-stone-400">
                  Your backpack is empty. Chop trees, break rocks, and gather
                  island flora.
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                  {hud.inventory.map((slot, idx) => {
                    const def = ITEMS[slot.itemId];
                    const isSel = selectedItemId === slot.itemId;
                    const hotbarSlot = hud.hotbarItemIds.indexOf(slot.itemId);
                    return (
                      <button
                        key={`${slot.itemId}_${idx}`}
                        onClick={() => setSelectedItemId(slot.itemId)}
                        className={`relative min-h-[82px] p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-colors ${
                          isSel
                            ? 'bg-amber-950/50 border-amber-500'
                            : 'bg-stone-950/70 border-stone-800 hover:border-stone-600'
                        }`}
                      >
                        {hotbarSlot !== -1 && (
                          <span className="absolute top-1 left-1.5 text-[9px] font-mono-tabular px-1 rounded bg-stone-800 text-amber-300">
                            H{hotbarSlot + 1}
                          </span>
                        )}
                        <ItemIcon itemId={slot.itemId} className="w-6 h-6" />
                        <div className="text-[11px] font-medium text-stone-200 truncate w-full text-center">
                          {def.name}
                        </div>
                        <div className="text-[11px] font-mono-tabular font-bold text-amber-400">
                          {slot.quantity}
                          <span className="text-stone-500 font-normal">
                            /{def.maxStack}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Chest Contents if open */}
              {chest && (
                <div className="pt-3 border-t border-stone-800 space-y-3">
                  <div className="text-xs font-semibold text-amber-300">
                    Stored in Box ({chest.chestItems?.length || 0} stacks)
                  </div>
                  {!chest.chestItems || chest.chestItems.length === 0 ? (
                    <div className="text-xs text-stone-500 py-2">
                      Storage box is empty. Select an item to deposit.
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {chest.chestItems.map((cSlot) => (
                        <button
                          key={cSlot.itemId}
                          onClick={() =>
                            onTransferFromChest?.(chest.id, cSlot.itemId)
                          }
                          className="min-h-[68px] p-2 rounded-xl bg-stone-950 border border-stone-800 hover:border-amber-500 flex flex-col items-center justify-center gap-1"
                        >
                          <ItemIcon itemId={cSlot.itemId} className="w-5 h-5" />
                          <span className="text-[11px] text-stone-200 truncate w-full text-center">
                            {ITEMS[cSlot.itemId].name}
                          </span>
                          <span className="text-[11px] font-mono-tabular text-emerald-400">
                            Take (×{cSlot.quantity})
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Item Inspector */}
            <div className="md:col-span-5 p-5 bg-stone-950/40 flex flex-col justify-between gap-4">
              {selectedDef && selectedSlot ? (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-stone-800 border border-stone-700 flex items-center justify-center shrink-0">
                        <ItemIcon itemId={selectedDef.id} className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-display text-base font-bold text-stone-100">
                          {selectedDef.name}
                        </h3>
                        <div className="text-xs text-stone-400 capitalize">
                          {selectedDef.category} · Stack {selectedSlot.quantity}/
                          {selectedDef.maxStack}
                        </div>
                      </div>
                    </div>
                    <p className="text-xs leading-relaxed text-stone-300">
                      {selectedDef.description}
                    </p>

                    {(selectedDef.hungerRestore ||
                      selectedDef.thirstRestore ||
                      selectedDef.healthRestore ||
                      selectedDef.staminaRestore) && (
                      <div className="text-xs text-emerald-400 font-mono-tabular">
                        Restores{' '}
                        {[
                          selectedDef.hungerRestore
                            ? `+${selectedDef.hungerRestore} Hunger`
                            : null,
                          selectedDef.thirstRestore
                            ? `+${selectedDef.thirstRestore} Thirst`
                            : null,
                          selectedDef.healthRestore
                            ? `+${selectedDef.healthRestore} Health`
                            : null,
                          selectedDef.staminaRestore
                            ? `+${selectedDef.staminaRestore} Stamina`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </div>
                    )}
                    {(selectedDef.attackDamage || selectedDef.gatherPower) && (
                      <div className="text-xs text-amber-400 font-mono-tabular">
                        {selectedDef.attackDamage
                          ? `Damage ${selectedDef.attackDamage}`
                          : ''}
                        {selectedDef.gatherPower
                          ? ` · Harvest ×${selectedDef.gatherPower}`
                          : ''}
                        {selectedDef.attackRange
                          ? ` · Range ${selectedDef.attackRange}m`
                          : ''}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    {selectedDef.id === 'dirty_water_bottle' && onCleanBottle && (
                      <button
                        onClick={() => {
                          onCleanBottle();
                          if (nearOceanWater) onClose();
                        }}
                        className={`w-full min-h-[46px] rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${
                          nearOceanWater
                            ? 'bg-sky-500 hover:bg-sky-400 text-stone-950'
                            : 'bg-sky-950/70 hover:bg-sky-900/80 border border-sky-700/70 text-sky-200'
                        }`}
                      >
                        <Droplets className="w-4 h-4" />
                        <span>
                          {nearOceanWater
                            ? 'Clean & Fill in Ocean Water'
                            : 'Clean Water Bottle (Walk to Ocean)'}
                        </span>
                      </button>
                    )}

                    {(selectedDef.category === 'food' ||
                      selectedDef.category === 'tool' ||
                      selectedDef.category === 'weapon' ||
                      selectedDef.category === 'equipment' ||
                      selectedDef.structureType) && (
                      <button
                        onClick={() => {
                          onUseOrEquip(selectedDef.id);
                          if (selectedDef.structureType) onClose();
                        }}
                        className="w-full min-h-[46px] rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold text-sm"
                      >
                        {selectedDef.id === 'filtered_water_bottle'
                          ? 'Drink Filtered Water'
                          : selectedDef.category === 'food'
                            ? 'Eat Now'
                            : selectedDef.structureType
                              ? 'Place in World'
                              : 'Equip Tool / Weapon'}
                      </button>
                    )}

                    {chest && onTransferToChest && (
                      <button
                        onClick={() =>
                          onTransferToChest(chest.id, selectedDef.id)
                        }
                        className="w-full min-h-[44px] rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-100 text-xs font-semibold flex items-center justify-center gap-2"
                      >
                        <ArrowLeftRight className="w-4 h-4" />
                        <span>Store 1 in Box</span>
                      </button>
                    )}

                    {onDropItem && (
                      <button
                        onClick={() => onDropItem(selectedDef.id)}
                        className="w-full min-h-[42px] rounded-xl bg-stone-900 hover:bg-red-950/70 border border-stone-800 hover:border-red-800/70 text-stone-300 hover:text-red-200 text-xs font-semibold flex items-center justify-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Drop 1 Item</span>
                      </button>
                    )}

                    <div>
                      <div className="text-[11px] text-stone-400 mb-1.5">
                        Move / Pin to Hotbar Slot
                      </div>
                      <div className="grid grid-cols-6 gap-1.5">
                        {[0, 1, 2, 3, 4, 5].map((slotIdx) => (
                          <button
                            key={slotIdx}
                            onClick={() =>
                              onAssignHotbar(slotIdx, selectedDef.id)
                            }
                            className={`min-h-[40px] rounded-lg text-xs font-mono-tabular font-semibold transition-colors ${
                              hud.hotbarItemIds[slotIdx] === selectedDef.id
                                ? 'bg-amber-600 text-stone-950'
                                : 'bg-stone-800 hover:bg-amber-600 hover:text-stone-950 text-stone-200'
                            }`}
                          >
                            {slotIdx + 1}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-xs text-stone-400">
                  Select an item to inspect, equip, move, eat, or drop.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'crafting' && (
          <div className="flex-1 overflow-y-auto survival-scroll grid grid-cols-1 md:grid-cols-12">
            <div className="md:col-span-7 border-b md:border-b-0 md:border-r border-stone-800 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-stone-400 pb-1">
                <span>
                  {nearTable
                    ? 'Near Wooden Workbench — All Recipes Unlocked'
                    : 'Field Backpack Crafting (Stand near Workbench for advanced gear)'}
                </span>
              </div>
              {CRAFTING_RECIPES.map((recipe) => {
                const item = ITEMS[recipe.resultItemId];
                const isSelected = selectedRecipe?.id === recipe.id;
                const ingOk = recipe.ingredients.every(
                  (i) => countOf(i.itemId) >= i.quantity,
                );
                const tableOk = !recipe.requiresTable || nearTable;
                const craftable = ingOk && tableOk;

                return (
                  <button
                    key={recipe.id}
                    disabled={Boolean(craftingProgress)}
                    onClick={() => setSelectedRecipeId(recipe.id)}
                    className={`w-full min-h-[56px] px-3.5 py-2 rounded-xl border text-left flex items-center justify-between gap-3 transition-colors ${
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
                          <Lock className="w-3 h-3" />
                          <span>Workbench</span>
                        </span>
                      ) : craftable ? (
                        <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>Ready</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-stone-500">
                          Need Mats
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedRecipe && (
              <div className="md:col-span-5 p-5 flex flex-col justify-between gap-4 bg-stone-950/40">
                <div className="space-y-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-xl bg-stone-800 border border-stone-700 flex items-center justify-center shrink-0">
                      <ItemIcon
                        itemId={selectedRecipe.resultItemId}
                        className="w-7 h-7"
                      />
                    </div>
                    <div>
                      <h3 className="font-display text-base font-bold text-stone-100">
                        {ITEMS[selectedRecipe.resultItemId].name}
                      </h3>
                      <div className="text-xs text-amber-400">
                        Yields {selectedRecipe.resultQuantity} ·{' '}
                        {selectedRecipe.craftTimeSeconds.toFixed(1)}s ·{' '}
                        {selectedRecipe.requiresTable
                          ? 'Workbench Required'
                          : 'Field Craftable'}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs leading-relaxed text-stone-300">
                    {selectedRecipe.description}
                  </p>
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-stone-400">
                      Materials (Owned / Required)
                    </div>
                    {selectedRecipe.ingredients.map((ing) => {
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

                <div className="space-y-2.5">
                  {craftingProgress &&
                    craftingProgress.recipeId === selectedRecipe.id && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-mono-tabular text-amber-300">
                          <span>Crafting...</span>
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
                    disabled={!recipeCanCraft}
                    onClick={() => startTimedCraft(selectedRecipe)}
                    className={`w-full min-h-[48px] rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${
                      recipeCanCraft
                        ? 'bg-amber-600 hover:bg-amber-500 text-stone-950'
                        : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                    }`}
                  >
                    <Hammer className="w-4 h-4" />
                    <span>
                      {craftingProgress
                        ? 'Crafting in Progress...'
                        : !recipeStationOk
                          ? 'Requires Wooden Workbench'
                          : !recipeHasMats
                            ? 'Insufficient Materials'
                            : `Craft (${selectedRecipe.craftTimeSeconds.toFixed(1)}s)`}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'equipment' && (
          <div className="flex-1 overflow-y-auto survival-scroll p-5 space-y-5">
            <div>
              <div className="text-xs font-semibold text-stone-400 mb-2.5">
                Active 6-Slot Hotbar Loadout (Tap a slot to equip)
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                {hud.hotbarItemIds.map((itemId, idx) => {
                  const active = hud.equippedSlot === idx;
                  const def = itemId ? ITEMS[itemId] : null;
                  const qty = itemId ? countOf(itemId) : 0;
                  return (
                    <div
                      key={idx}
                      className={`rounded-xl border p-3 flex flex-col items-center justify-between gap-2 ${
                        active
                          ? 'bg-amber-950/50 border-amber-500'
                          : 'bg-stone-950/70 border-stone-800'
                      }`}
                    >
                      <button
                        onClick={() => onSelectHotbarSlot?.(idx)}
                        className="w-full flex flex-col items-center gap-1.5"
                      >
                        <div className="text-[10px] font-mono-tabular text-stone-400">
                          Slot {idx + 1} {active ? '· Equipped' : ''}
                        </div>
                        {def && qty > 0 ? (
                          <>
                            <ItemIcon itemId={def.id} className="w-6 h-6" />
                            <div className="text-xs font-semibold text-stone-100 truncate w-full text-center">
                              {def.name}
                            </div>
                          </>
                        ) : (
                          <div className="py-3 text-xs text-stone-600">
                            Empty
                          </div>
                        )}
                      </button>
                      {def && (
                        <button
                          onClick={() => onAssignHotbar(idx, null)}
                          className="text-[10px] text-stone-400 hover:text-red-300"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-stone-800 pt-4 space-y-3">
              <div className="text-xs font-semibold text-stone-400">
                Tools, Weapons &amp; Survival Gear ({equipmentItems.length})
              </div>
              {equipmentItems.length === 0 ? (
                <div className="rounded-xl bg-stone-950/60 border border-stone-800 p-5 text-xs text-stone-400 text-center">
                  No tools or weapons crafted yet. Switch to the Crafting tab to
                  forge a Stone Axe, Pickaxe, or Spear.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {equipmentItems.map((slot, idx) => {
                    const def = ITEMS[slot.itemId];
                    const equipped =
                      hud.equippedSlot >= 0 &&
                      hud.hotbarItemIds[hud.equippedSlot] === slot.itemId;
                    return (
                      <div
                        key={`${slot.itemId}_${idx}`}
                        className="rounded-xl bg-stone-950/70 border border-stone-800 p-3.5 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-11 h-11 rounded-xl bg-stone-800 flex items-center justify-center shrink-0">
                            <ItemIcon itemId={slot.itemId} className="w-6 h-6" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-stone-100 truncate">
                              {def.name}
                              {slot.quantity > 1 ? ` ×${slot.quantity}` : ''}
                            </div>
                            <div className="text-[11px] font-mono-tabular text-stone-400">
                              {def.attackDamage ? `DMG ${def.attackDamage}` : ''}
                              {def.gatherPower
                                ? ` · Gather ×${def.gatherPower}`
                                : ''}
                              {def.preferredResource
                                ? ` (${def.preferredResource})`
                                : ''}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => onUseOrEquip(slot.itemId)}
                          className={`min-h-[38px] px-3.5 rounded-lg text-xs font-semibold shrink-0 ${
                            equipped
                              ? 'bg-emerald-700 text-stone-50'
                              : 'bg-amber-600 hover:bg-amber-500 text-stone-950'
                          }`}
                        >
                          {equipped ? 'Equipped' : 'Equip'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'resources' && (
          <div className="flex-1 overflow-y-auto survival-scroll p-5 space-y-3">
            <div className="text-xs text-stone-400">
              Harvested Timber, Minerals &amp; Natural Materials
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {resourceBreakdown.map(({ id, def, qty }) => (
                <div
                  key={id}
                  className={`rounded-xl border p-3 flex items-center justify-between gap-3 ${
                    qty > 0
                      ? 'bg-stone-950/80 border-stone-700'
                      : 'bg-stone-950/35 border-stone-800/70 opacity-65'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-stone-800 flex items-center justify-center shrink-0">
                      <ItemIcon itemId={id} className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-stone-100 truncate">
                        {def.name}
                      </div>
                      <div className="text-[10px] text-stone-400 truncate">
                        Max Stack {def.maxStack}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-mono-tabular font-bold text-amber-400 shrink-0">
                    {qty}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
