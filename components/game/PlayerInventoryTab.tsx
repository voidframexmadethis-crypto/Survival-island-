'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Backpack,
  Box,
  Droplets,
  Heart,
  Image as ImageIcon,
  Upload,
  Utensils,
  Zap,
} from 'lucide-react';
import { ITEMS } from '@/game/data/items';
import { HUDStateSnapshot, ItemId } from '@/game/types';
import {
  addCustomMarketplaceSkin,
  equipCustomMarketplaceSkin,
  equipExchangeProduct,
  getCustomMarketplaceSnapshot,
  getExchangeStateSnapshot,
  subscribeExchangeState,
  type CustomPhoneSkinRecord,
} from '@/game/systems/exchangeManager';
import {
  checkMarketplaceUploadFile,
  formatMarketplaceUploadSize,
} from '@/game/systems/marketplaceUploads';
import { ItemIcon } from './ItemIcon';
import { PlayerAvatarPreview } from './PlayerAvatarPreview';

interface PlayerInventoryTabProps {
  hud: HUDStateSnapshot;
  onSelectHotbarSlot?: (slotIdx: number) => void;
  onInspectItem?: (itemId: ItemId) => void;
  onCosmeticsChanged?: () => void;
}

interface PackDraft {
  name: string;
  dataUrl: string;
  size: number;
}

interface BackpackChoice {
  id: string;
  name: string;
  imageUrl: string | null;
  primaryHex: string;
  accentHex: string;
  custom: CustomPhoneSkinRecord | null;
}

const VITAL_ROWS: {
  key: 'health' | 'hunger' | 'thirst' | 'stamina';
  label: string;
  bar: string;
  icon: React.ReactNode;
}[] = [
  { key: 'health', label: 'Health', bar: 'bg-rose-500', icon: <Heart className="h-3.5 w-3.5" /> },
  {
    key: 'hunger',
    label: 'Hunger',
    bar: 'bg-amber-500',
    icon: <Utensils className="h-3.5 w-3.5" />,
  },
  {
    key: 'thirst',
    label: 'Thirst',
    bar: 'bg-sky-500',
    icon: <Droplets className="h-3.5 w-3.5" />,
  },
  {
    key: 'stamina',
    label: 'Stamina',
    bar: 'bg-emerald-500',
    icon: <Zap className="h-3.5 w-3.5" />,
  },
];

export function PlayerInventoryTab({
  hud,
  onSelectHotbarSlot,
  onInspectItem,
  onCosmeticsChanged,
}: PlayerInventoryTabProps) {
  const [exchangeState, setExchangeState] = useState(() => getExchangeStateSnapshot());
  const [customMarketplace, setCustomMarketplace] = useState(() =>
    getCustomMarketplaceSnapshot(),
  );
  const [draft, setDraft] = useState<PackDraft | null>(null);
  const [packName, setPackName] = useState('');
  const [packError, setPackError] = useState('');
  const [packNotice, setPackNotice] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return subscribeExchangeState(() => {
      setExchangeState({ ...getExchangeStateSnapshot() });
      setCustomMarketplace({ ...getCustomMarketplaceSnapshot() });
    });
  }, []);

  const backpackChoices = useMemo(() => {
    const choices: BackpackChoice[] = [];
    const seen = new Set<string>();

    for (const skin of customMarketplace.skins) {
      if (skin.category !== 'backpack' || seen.has(skin.id)) continue;
      seen.add(skin.id);
      choices.push({
        id: skin.id,
        name: skin.name,
        imageUrl: skin.mediaKind === 'image' ? skin.mediaDataUrl ?? null : null,
        primaryHex: skin.primaryHex,
        accentHex: skin.accentHex,
        custom: skin,
      });
    }
    for (const product of exchangeState.ownedProducts) {
      if (product.category !== 'backpack_skin' || seen.has(product.id)) continue;
      seen.add(product.id);
      choices.push({
        id: product.id,
        name: product.name,
        imageUrl: product.productImageUrl ?? null,
        primaryHex: product.visual.primaryHex,
        accentHex: product.visual.accentHex,
        custom: null,
      });
    }
    return choices;
  }, [customMarketplace.skins, exchangeState.ownedProducts]);

  const equippedPackId =
    customMarketplace.equippedBackpackId ?? exchangeState.equippedBackpackSkinId ?? null;
  const equippedPack =
    backpackChoices.find((choice) => choice.id === equippedPackId) ?? null;
  const equippedPackLabel = equippedPack?.name ?? 'Default Explorer Pack';
  const previewSkinKey = equippedPack
    ? `${equippedPack.id}:${equippedPack.imageUrl ?? ''}`
    : 'default-explorer-pack';

  const equippedItemId =
    hud.equippedSlot >= 0 ? hud.hotbarItemIds[hud.equippedSlot] ?? null : null;
  const equippedItem = equippedItemId ? ITEMS[equippedItemId] : null;
  const hotbar = hud.hotbarItemIds.slice(0, 9);
  const inventoryCells = useMemo(
    () => Array.from({ length: 27 }, (_, index) => hud.inventory[index] ?? null),
    [hud.inventory],
  );
  const worldLabel = hud.worldType === 'flat' ? 'Flat Park' : 'Survival Island';

  const resetDraft = () => {
    setDraft(null);
    setPackName('');
    setPackError('');
    setDragActive(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const usePackFile = (file: File | undefined) => {
    if (!file) return;
    setPackError('');
    setPackNotice('');
    const check = checkMarketplaceUploadFile(file);
    if (!check.ok) {
      resetDraft();
      setPackError(check.message);
      return;
    }
    if (check.kind !== 'image') {
      resetDraft();
      setPackError('Choose a PNG, JPG, WEBP or GIF image for an in-world backpack skin.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        setPackError('Could not read that image. Try another file.');
        return;
      }
      const source = reader.result;
      const baseName = file.name.replace(/\.[^/.]+$/, '').trim();
      const image = new Image();
      image.onload = () => {
        // Camera photos are far larger than a backpack texture needs. Downscale
        // and compress before storing so imports fit in local storage and load
        // quickly on phones.
        const maxSide = 1024;
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const ctx = canvas.getContext('2d');
        let dataUrl = source;
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
          const compressed = canvas.toDataURL('image/webp', 0.9);
          if (compressed.startsWith('data:image/webp')) dataUrl = compressed;
        }
        const storedBytes = Math.round(((dataUrl.length - dataUrl.indexOf(',') - 1) * 3) / 4);
        setDraft({ name: file.name, dataUrl, size: storedBytes || file.size });
        setPackName(baseName.slice(0, 48));
        setPackError('');
      };
      image.onerror = () => {
        setDraft({ name: file.name, dataUrl: source, size: file.size });
        setPackName(baseName.slice(0, 48));
        setPackError('');
      };
      image.src = source;
    };
    reader.onerror = () => setPackError('Could not read that image. Try another file.');
    reader.readAsDataURL(file);
  };

  const importAndEquip = () => {
    if (!draft) {
      setPackError('Choose a backpack image first.');
      return;
    }
    const finalName =
      packName.trim() || draft.name.replace(/\.[^/.]+$/, '').trim() || 'Imported Pack';
    const skin: CustomPhoneSkinRecord = {
      id: `imported_pack_${Date.now()}`,
      name: finalName.slice(0, 48),
      category: 'backpack',
      priceLabel: 'Free',
      payhipUrl: '',
      payhipProductId: null,
      freeByDefault: true,
      primaryHex: '#365314',
      secondaryHex: '#1a2e05',
      accentHex: '#f59e0b',
      pattern: 'solid',
      mediaDataUrl: draft.dataUrl,
      mediaKind: 'image',
      launchVisible: true,
    };
    addCustomMarketplaceSkin(skin);
    equipCustomMarketplaceSkin(skin);
    setCustomMarketplace({ ...getCustomMarketplaceSnapshot() });
    onCosmeticsChanged?.();
    resetDraft();
    setPackNotice(`"${skin.name}" imported and equipped.`);
  };

  const toggleChoice = async (choice: BackpackChoice) => {
    setPackNotice('');
    if (choice.custom) {
      equipCustomMarketplaceSkin(choice.custom);
      setCustomMarketplace({ ...getCustomMarketplaceSnapshot() });
      onCosmeticsChanged?.();
      return;
    }
    await equipExchangeProduct(
      choice.id,
      equippedPackId === choice.id ? 'unequip' : 'equip',
    );
    onCosmeticsChanged?.();
  };

  return (
    <div className="flex-1 overflow-y-auto survival-scroll p-4 space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="overflow-hidden rounded-2xl border border-stone-700/80 bg-gradient-to-br from-stone-900 via-stone-950 to-amber-950/30 shadow-xl">
          <div className="flex items-start justify-between gap-3 p-4 pb-1">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-amber-400/90">
                Player
              </div>
              <h3 className="font-display text-xl font-bold text-stone-50">
                Island Explorer
              </h3>
              <p className="mt-0.5 text-[11px] text-stone-400">
                {worldLabel} · Day {hud.dayCount} · {hud.biomeName}
              </p>
            </div>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-right">
              <div className="text-[9px] font-bold uppercase tracking-wider text-amber-300/80">
                Coins
              </div>
              <div className="font-mono-tabular text-sm font-bold text-amber-200">
                {hud.coins.toLocaleString()}
              </div>
            </div>
          </div>

          <PlayerAvatarPreview
            skinKey={previewSkinKey}
            className="h-[286px] w-full"
          />

          <div className="grid grid-cols-3 gap-2 px-4 pb-4">
            <div className="rounded-xl border border-amber-700/50 bg-stone-950/80 p-2 text-center">
              <div className="text-[9px] font-bold uppercase tracking-wider text-stone-500">
                Back
              </div>
              <div className="mx-auto my-1.5 flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-stone-700 bg-stone-900">
                {equippedPack?.imageUrl ? (
                  <img
                    src={equippedPack.imageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div
                    className="h-full w-full"
                    style={{
                      background: equippedPack
                        ? `linear-gradient(135deg, ${equippedPack.primaryHex}, ${equippedPack.accentHex})`
                        : 'linear-gradient(135deg, #78350f, #d97706)',
                    }}
                  />
                )}
              </div>
              <div className="truncate text-[9px] font-semibold text-amber-200">
                {equippedPackLabel}
              </div>
            </div>

            <div className="rounded-xl border border-stone-700/70 bg-stone-950/80 p-2 text-center">
              <div className="text-[9px] font-bold uppercase tracking-wider text-stone-500">
                Main hand
              </div>
              <div className="mx-auto my-1.5 flex h-9 w-9 items-center justify-center rounded-lg border border-stone-700 bg-stone-900">
                {equippedItemId ? (
                  <ItemIcon itemId={equippedItemId} className="h-5 w-5" />
                ) : (
                  <Box className="h-4 w-4 text-stone-600" />
                )}
              </div>
              <div className="truncate text-[9px] font-semibold text-stone-300">
                {equippedItem?.name ?? 'Bare hands'}
              </div>
            </div>

            <div className="rounded-xl border border-stone-700/70 bg-stone-950/80 p-2 text-center">
              <div className="text-[9px] font-bold uppercase tracking-wider text-stone-500">
                Off hand
              </div>
              <div className="mx-auto my-1.5 flex h-9 w-9 items-center justify-center rounded-lg border border-stone-700 bg-stone-900">
                <Box className="h-4 w-4 text-stone-600" />
              </div>
              <div className="truncate text-[9px] font-semibold text-stone-400">
                Empty
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-stone-800 p-4">
            {VITAL_ROWS.map((row) => {
              const value = hud.vitals[row.key];
              const max =
                row.key === 'health'
                  ? hud.vitals.maxHealth
                  : row.key === 'hunger'
                    ? hud.vitals.maxHunger
                    : row.key === 'thirst'
                      ? hud.vitals.maxThirst
                      : hud.vitals.maxStamina;
              const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
              return (
                <div key={row.key} className="space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="flex items-center gap-1 font-semibold text-stone-300">
                      <span className="text-amber-400">{row.icon}</span>
                      {row.label}
                    </span>
                    <span className="font-mono-tabular text-stone-400">
                      {Math.round(value)}/{Math.round(max)}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-stone-800">
                    <div
                      className={`h-full rounded-full ${row.bar}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="space-y-4">
          <section className="rounded-2xl border border-emerald-700/40 bg-emerald-950/20 p-3.5 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600/20 text-emerald-300">
                  <Backpack className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-stone-100">Backpack Skin</div>
                  <div className="text-[10px] text-stone-400">
                    Import an image from this device and wear it immediately.
                  </div>
                </div>
              </div>
              <span className="rounded-full border border-emerald-600/40 bg-emerald-950/70 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300">
                Follows your player
              </span>
            </div>

            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(event) => usePackFile(event.target.files?.[0])}
            />

            <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <div
                role="button"
                tabIndex={0}
                onClick={() => inputRef.current?.click()}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click();
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragActive(false);
                  usePackFile(event.dataTransfer.files?.[0]);
                }}
                className={`flex min-h-[92px] cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed p-3 transition-colors ${
                  dragActive
                    ? 'border-emerald-400 bg-emerald-900/40'
                    : 'border-stone-700 bg-stone-950/60 hover:border-emerald-500/70 hover:bg-stone-900/80'
                }`}
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-stone-700 bg-stone-900">
                  {draft ? (
                    <img src={draft.dataUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Upload className="h-6 w-6 text-emerald-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[11px] font-bold text-stone-100">
                    {draft ? draft.name : 'Drop a backpack image here'}
                  </div>
                  <div className="mt-0.5 text-[10px] text-stone-400">
                    {draft ? formatMarketplaceUploadSize(draft.size) : 'PNG, JPG, WEBP or GIF · tap to browse'}
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-emerald-400">
                    <ImageIcon className="h-3 w-3" />
                    <span>{draft ? 'Ready to import' : 'Easy phone import'}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-center gap-2 sm:w-36">
                <input
                  value={packName}
                  onChange={(event) => setPackName(event.target.value)}
                  maxLength={48}
                  placeholder="Skin name"
                  className="w-full rounded-lg border border-stone-700 bg-stone-950 px-2.5 py-1.5 text-[11px] text-stone-100 placeholder:text-stone-600 focus:border-emerald-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={importAndEquip}
                  disabled={!draft}
                  className={`min-h-[36px] rounded-lg px-3 text-[11px] font-bold transition-colors ${
                    draft
                      ? 'bg-emerald-500 text-stone-950 hover:bg-emerald-400'
                      : 'cursor-not-allowed bg-stone-800 text-stone-500'
                  }`}
                >
                  Import &amp; Equip
                </button>
                {draft && (
                  <button
                    type="button"
                    onClick={resetDraft}
                    className="text-[10px] font-semibold text-stone-400 hover:text-stone-200"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            {(packError || packNotice) && (
              <div
                className={`mt-2 rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold ${
                  packError
                    ? 'border-rose-700/60 bg-rose-950/40 text-rose-200'
                    : 'border-emerald-700/60 bg-emerald-950/40 text-emerald-200'
                }`}
              >
                {packError || packNotice}
              </div>
            )}

            <div className="mt-3 border-t border-stone-800/80 pt-2.5">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  Available Packs ({backpackChoices.length})
                </span>
                <span className="text-[9px] text-stone-500">Tap to equip</span>
              </div>
              {backpackChoices.length === 0 ? (
                <div className="rounded-lg border border-stone-800 bg-stone-950/60 px-3 py-2 text-[10px] text-stone-500">
                  No imported or purchased packs yet. The default Explorer Pack is active.
                </div>
              ) : (
                <div className="grid max-h-28 grid-cols-2 gap-2 overflow-y-auto survival-scroll pr-1">
                  {backpackChoices.map((choice) => {
                    const active = equippedPackId === choice.id;
                    return (
                      <button
                        key={choice.id}
                        type="button"
                        onClick={() => void toggleChoice(choice)}
                        className={`flex items-center gap-2 rounded-lg border p-1.5 text-left transition-colors ${
                          active
                            ? 'border-emerald-500/80 bg-emerald-950/60'
                            : 'border-stone-800 bg-stone-950/70 hover:border-stone-600'
                        }`}
                      >
                        <div className="h-8 w-8 shrink-0 overflow-hidden rounded-md border border-stone-700 bg-stone-900">
                          {choice.imageUrl ? (
                            <img src={choice.imageUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div
                              className="h-full w-full"
                              style={{
                                background: `linear-gradient(135deg, ${choice.primaryHex}, ${choice.accentHex})`,
                              }}
                            />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-[10px] font-bold text-stone-100">
                            {choice.name}
                          </div>
                          <div
                            className={`text-[9px] font-semibold ${
                              active ? 'text-emerald-300' : 'text-stone-500'
                            }`}
                          >
                            {active ? 'Equipped' : 'Equip'}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-stone-700/70 bg-stone-950/50 p-3.5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                Inventory · 27 slots
              </span>
              <span className="text-[9px] text-stone-500">
                {hud.inventory.length} stacks carried
              </span>
            </div>
            <div className="grid grid-cols-9 gap-1.5">
              {inventoryCells.map((slot, index) => {
                const def = slot ? ITEMS[slot.itemId] : null;
                return (
                  <button
                    key={`${slot?.itemId ?? 'empty'}_${index}`}
                    type="button"
                    onClick={() => {
                      if (slot && onInspectItem) onInspectItem(slot.itemId);
                    }}
                    disabled={!slot}
                    title={def ? `${def.name} ×${slot.quantity}` : `Empty slot ${index + 1}`}
                    className={`relative flex aspect-square items-center justify-center rounded-md border transition-colors ${
                      def
                        ? 'border-stone-700 bg-stone-900 hover:border-amber-500'
                        : 'cursor-default border-stone-800/80 bg-stone-950/70'
                    }`}
                  >
                    {def && (
                      <>
                        <ItemIcon itemId={def.id} className="h-4 w-4 sm:h-5 sm:w-5" />
                        <span className="absolute bottom-0.5 right-1 font-mono-tabular text-[9px] font-bold text-amber-300">
                          {slot.quantity}
                        </span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mb-2 mt-3 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/90">
                Hotbar · 9 active slots
              </span>
              {hud.hotbarItemIds.length > 9 && (
                <span className="text-[9px] text-stone-500">
                  +{hud.hotbarItemIds.length - 9} more in Inventory
                </span>
              )}
            </div>
            <div className="grid grid-cols-9 gap-1.5 rounded-xl border border-amber-700/30 bg-amber-950/10 p-1.5">
              {hotbar.map((itemId, index) => {
                const def = itemId ? ITEMS[itemId] : null;
                const active = hud.equippedSlot === index;
                return (
                  <button
                    key={`hotbar_${index}`}
                    type="button"
                    onClick={() => onSelectHotbarSlot?.(index)}
                    title={def ? `Slot ${index + 1}: ${def.name}` : `Empty hotbar slot ${index + 1}`}
                    className={`relative flex aspect-square items-center justify-center rounded-md border ${
                      active
                        ? 'border-amber-400 bg-amber-500/20'
                        : 'border-stone-700 bg-stone-900 hover:border-stone-500'
                    }`}
                  >
                    {def ? (
                      <ItemIcon itemId={def.id} className="h-4 w-4 sm:h-5 sm:w-5" />
                    ) : (
                      <span className="text-[9px] text-stone-600">{index + 1}</span>
                    )}
                    <span className="absolute left-0.5 top-0.5 font-mono-tabular text-[8px] text-stone-500">
                      {index + 1}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[9px] leading-relaxed text-stone-500">
              Your gear is saved with the active world. Imported backpack skins stay on
              your player across Island and Flat Park sessions.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
