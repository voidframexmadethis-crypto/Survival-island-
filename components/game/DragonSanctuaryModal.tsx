'use client';

import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Egg,
  Flame,
  Gem,
  Hammer,
  Heart,
  Lock,
  MapPin,
  Palette,
  Plus,
  ShieldCheck,
  Sparkles,
  Tag,
  TrendingUp,
  Wind,
  X,
} from 'lucide-react';
import {
  DRAGON_COLOR_OPTIONS,
  DRAGON_SPECIES_INFO,
  DRAGON_VALLEY_SYSTEM,
  DragonCard,
  DragonCompanion,
  DragonElement,
  DragonRarity,
  rarityFromElements,
} from '@/game/systems/dragonValleySystem';

interface DragonSanctuaryModalProps {
  dragons: DragonCompanion[];
  eggs: string[];
  cards: DragonCard[];
  abandonedDragonRescued?: boolean;
  canRideDragon?: boolean;
  redDragonCave?: { x: number; z: number; discovered: boolean; bossDefeated?: boolean } | null;
  onHatch: (element: DragonElement, customName: string, requireCollectedEgg?: boolean) => void;
  onFeed: (dragonId: string) => void;
  onGrow: (dragonId: string) => void;
  onCustomizeColor: (dragonId: string, color: string) => void;
  onCombine: (idA: string, idB: string, hybridName: string) => void;
  onRename: (dragonId: string, rawTagText: string) => void;
  onToggleMount: (dragonId: string) => void;
  onClose: () => void;
}

const ELEMENT_BADGE: Record<DragonElement, string> = {
  Ember: 'bg-orange-600/25 text-orange-200 border-orange-500/45',
  Frost: 'bg-sky-600/25 text-sky-200 border-sky-500/45',
  Storm: 'bg-indigo-600/25 text-indigo-200 border-indigo-500/45',
  Shadow: 'bg-purple-700/30 text-purple-200 border-purple-500/45',
};

const RARITY_BADGE: Record<DragonRarity, string> = {
  Common: 'bg-stone-700/50 text-stone-200 border-stone-500/45',
  Rare: 'bg-sky-600/20 text-sky-200 border-sky-400/45',
  Epic: 'bg-fuchsia-700/25 text-fuchsia-200 border-fuchsia-400/45',
  Legendary: 'bg-amber-500/20 text-amber-200 border-amber-400/55',
};

export function DragonSanctuaryModal({
  dragons,
  eggs,
  cards,
  abandonedDragonRescued = false,
  canRideDragon = false,
  redDragonCave = null,
  onHatch,
  onFeed,
  onGrow,
  onCustomizeColor,
  onCombine,
  onRename,
  onToggleMount,
  onClose,
}: DragonSanctuaryModalProps) {
  const [selectedElement, setSelectedElement] = useState<DragonElement>('Ember');
  const [eggName, setEggName] = useState('');
  const [combineA, setCombineA] = useState<string>('');
  const [combineB, setCombineB] = useState<string>('');
  const [hybridName, setHybridName] = useState('');
  const [renameInputs, setRenameInputs] = useState<Record<string, string>>({});
  const [customColorInputs, setCustomColorInputs] = useState<Record<string, string>>({});

  const atCap = dragons.length >= DRAGON_VALLEY_SYSTEM.maxActiveDragons;

  const eggCounts = useMemo(() => {
    const counts: Record<DragonElement, number> = {
      Ember: 0,
      Frost: 0,
      Storm: 0,
      Shadow: 0,
    };
    for (const e of eggs) {
      if (e in counts) {
        counts[e as DragonElement] += 1;
      }
    }
    return counts;
  }, [eggs]);

  const selectedEggCount = eggCounts[selectedElement] || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-stone-900 border border-orange-500/40 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-orange-950/70 border border-orange-500/40 flex items-center justify-center shrink-0">
              <Flame className="w-5 h-5 text-orange-400" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-lg font-bold text-stone-100 truncate">
                Dragon Valley Sanctuary
              </h2>
              <p className="text-xs text-stone-400 truncate">
                {dragons.length} / {DRAGON_VALLEY_SYSTEM.maxActiveDragons} Active Dragons ·{' '}
                {eggs.length} Eggs · {cards.length} Cards · Hatch, Feed, Rescue &amp; Fly
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 transition-colors shrink-0"
            aria-label="Close Dragon Sanctuary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto survival-scroll text-sm">
          {/* Riding Unlock Status */}
          <div
            className={`rounded-xl border px-4 py-3 flex items-center justify-between gap-3 ${
              canRideDragon
                ? 'bg-emerald-950/50 border-emerald-500/45 text-emerald-100'
                : 'bg-red-950/50 border-red-500/45 text-red-100'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {canRideDragon ? (
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <Lock className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <div className="min-w-0">
                <div className="text-xs font-bold">
                  {canRideDragon
                    ? 'Island Dragon Flight Unlocked'
                    : 'Dragon Flight Locked — Defeat the Red Dragon Boss'}
                </div>
                <div className="text-xs opacity-85 truncate">
                  {canRideDragon
                    ? 'Any dragon raised to Age 3 (Rideable) can be mounted for aerial flight.'
                    : redDragonCave?.discovered
                      ? `Red Dragon Lair discovered at X ${Math.round(redDragonCave.x)} · Z ${Math.round(redDragonCave.z)}`
                      : 'Explore the 5,000 island caves or visit Viking Village for dragon lore.'}
                </div>
              </div>
            </div>
            {!canRideDragon && redDragonCave?.discovered && (
              <span className="px-2.5 py-1 rounded-lg bg-red-900/60 border border-red-400/45 text-xs font-mono-tabular flex items-center gap-1 shrink-0">
                <MapPin className="w-3.5 h-3.5" />
                {Math.round(redDragonCave.x)}, {Math.round(redDragonCave.z)}
              </span>
            )}
          </div>

          {/* Dragon Codex & Abandoned Dragon Encounter */}
          <div className="rounded-xl bg-stone-950/75 border border-amber-500/35 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-display text-sm font-bold text-amber-300 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                <span>Dragon Cards &amp; Valley Encounters</span>
              </div>
              <span className="text-[11px] font-mono-tabular text-stone-400">
                {cards.length} Cards Collected
              </span>
            </div>

            <div className="rounded-lg border border-indigo-500/35 bg-indigo-950/30 px-3 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <Gem className="w-4 h-4 text-indigo-300 shrink-0" />
                <div className="min-w-0">
                  <div className="font-bold text-indigo-100">
                    {abandonedDragonRescued
                      ? 'Ashwing rescued — Legendary card claimed'
                      : 'Abandoned Ashwing roams the valley edge'}
                  </div>
                  <div className="text-indigo-200/75">
                    {abandonedDragonRescued
                      ? 'The grown Storm-Shadow dragon now lives in your sanctuary.'
                      : 'Find the grown Storm-Shadow dragon at X 401, Z -365 for a Legendary card, 2 Gold Bars & 1 Diamond Crystal.'}
                  </div>
                </div>
              </div>
              <span className="px-2 py-1 rounded-md border border-amber-400/50 bg-amber-500/15 text-amber-200 font-bold shrink-0">
                {abandonedDragonRescued ? 'Claimed' : 'Rescue'}
              </span>
            </div>

            {cards.length === 0 ? (
              <div className="text-xs text-stone-400 text-center py-3">
                No cards yet. Hatch an egg, combine a hybrid, or rescue Ashwing to build your codex.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {cards.map((card) => (
                  <div
                    key={card.id}
                    className={`rounded-lg border bg-stone-900/85 px-3 py-2.5 ${RARITY_BADGE[card.rarity]}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-stone-100 truncate">{card.name}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wide shrink-0">
                        {card.rarity}
                      </span>
                    </div>
                    <div className="text-[11px] opacity-85 mt-1 flex flex-wrap items-center gap-1.5">
                      <span>{card.species}</span>
                      <span>·</span>
                      <span>{card.stage}</span>
                      <span>·</span>
                      <span>{card.source}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Egg Bag & Hatchery */}
          <div className="rounded-xl bg-stone-950/75 border border-stone-800 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-display text-sm font-bold text-orange-300 flex items-center gap-2">
                <Egg className="w-4 h-4" />
                <span>Collected Egg Bag &amp; Hatchery</span>
              </div>
              <div className="text-xs text-stone-400 font-mono-tabular">
                {atCap
                  ? `Sanctuary full (${DRAGON_VALLEY_SYSTEM.maxActiveDragons} max)`
                  : 'Find eggs at Dragon Valley nests (X 420, Z -380) or Viking Village'}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DRAGON_VALLEY_SYSTEM.elements.map((el) => {
                const count = eggCounts[el] || 0;
                const active = selectedElement === el;
                return (
                  <button
                    key={el}
                    type="button"
                    onClick={() => setSelectedElement(el)}
                    className={`py-2.5 px-3 rounded-xl border text-left transition-colors ${
                      active
                        ? 'bg-orange-600 text-stone-950 border-orange-400'
                        : 'bg-stone-900 text-stone-200 border-stone-800 hover:bg-stone-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 text-xs font-bold">
                      <span>{el}</span>
                      <span className="font-mono-tabular">×{count}</span>
                    </div>
                    <div
                      className={`text-[11px] mt-0.5 truncate ${
                        active ? 'text-stone-900/80' : 'text-stone-400'
                      }`}
                    >
                      {DRAGON_SPECIES_INFO[el].species}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={eggName}
                onChange={(e) => setEggName(e.target.value)}
                maxLength={24}
                placeholder={`Name your ${selectedElement} Wyrm...`}
                className="flex-1 rounded-xl bg-stone-900 border border-stone-700 px-3 py-2 text-xs text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-orange-500"
              />
              <button
                type="button"
                disabled={atCap || selectedEggCount <= 0}
                onClick={() => {
                  onHatch(selectedElement, eggName, true);
                  setEggName('');
                }}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-stone-950 font-bold text-xs transition-colors whitespace-nowrap shrink-0 flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>
                  {selectedEggCount > 0
                    ? `Hatch Collected ${selectedElement} Egg`
                    : `No ${selectedElement} Egg`}
                </span>
              </button>
            </div>
          </div>

          {/* Active Dragons Roster */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-stone-400">
              <span className="font-semibold text-stone-300">Sanctuary Dragon Roster</span>
              <span className="font-mono-tabular">Age 3+ unlocks Riding</span>
            </div>

            {dragons.length === 0 ? (
              <div className="rounded-xl bg-stone-950/60 border border-stone-800 p-5 text-xs text-stone-400 text-center">
                No dragons hatched yet. Collect an egg and hatch it above to begin!
              </div>
            ) : (
              dragons.map((d) => {
                const colorOption = DRAGON_COLOR_OPTIONS.find(
                  (c) => c.id.toLowerCase() === (d.color || 'Original').toLowerCase(),
                );
                const swatchHex = colorOption?.hex || '#ea580c';
                const canMountNow = d.isMounted || (d.rideable && canRideDragon);
                const mountLockReason = !d.rideable
                  ? `Raise to Age 3 first (${d.age}/3)`
                  : !canRideDragon
                    ? 'Defeat Red Dragon Boss first'
                    : '';

                return (
                  <div
                    key={d.id}
                    className={`rounded-xl border p-4 space-y-3.5 ${
                      d.isMounted
                        ? 'bg-orange-950/35 border-orange-500/65'
                        : 'bg-stone-950/75 border-stone-800'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-white/30 shrink-0"
                          style={{ backgroundColor: swatchHex }}
                          title={`Scale Color: ${d.color}`}
                        />
                        <span className="font-display font-bold text-stone-100 text-sm">
                          {d.name}
                        </span>
                        <span className="text-xs text-stone-400">
                          {d.species} · {d.stage} · {d.color}
                        </span>
                        {d.elements.map((el) => (
                          <span
                            key={el}
                            className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold ${ELEMENT_BADGE[el]}`}
                          >
                            {el}
                          </span>
                        ))}
                        <span
                          className={`px-2 py-0.5 rounded-md border text-[11px] font-bold uppercase tracking-wide ${
                            RARITY_BADGE[rarityFromElements(d.elements, d.species)]
                          }`}
                        >
                          {rarityFromElements(d.elements, d.species)}
                        </span>
                      </div>
                      <div className="text-xs font-mono-tabular text-amber-300">
                        Speed {d.speed}
                      </div>
                    </div>

                    {/* Age, Hunger, Bond & Growth Stats */}
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="rounded-lg bg-stone-900/90 border border-stone-800 px-3 py-2">
                        <div className="text-stone-400 text-[11px]">Age &amp; Riding</div>
                        <div className="font-mono-tabular font-bold text-stone-100 mt-0.5">
                          Age {d.age} · {d.rideable ? 'Rideable' : `${Math.max(0, 3 - d.age)} to ride`}
                        </div>
                      </div>
                      <div className="rounded-lg bg-stone-900/90 border border-stone-800 px-3 py-2">
                        <div className="text-stone-400 text-[11px]">Hunger</div>
                        <div className="font-mono-tabular font-bold text-emerald-300 mt-0.5">
                          {d.hunger}%
                        </div>
                      </div>
                      <div className="rounded-lg bg-stone-900/90 border border-stone-800 px-3 py-2">
                        <div className="text-stone-400 text-[11px] flex items-center gap-1">
                          <Heart className="w-3 h-3 text-rose-400" /> Bond
                        </div>
                        <div className="font-mono-tabular font-bold text-rose-300 mt-0.5">
                          {d.bond}
                        </div>
                      </div>
                    </div>

                    {/* Growth Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-stone-400 font-mono-tabular">
                        <span>Growth Progress</span>
                        <span>{d.growth}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-stone-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all"
                          style={{ width: `${d.growth}%` }}
                        />
                      </div>
                    </div>

                    {/* Core Actions */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onFeed(d.id)}
                        className="min-h-[40px] px-3.5 py-2 rounded-xl bg-emerald-600/25 hover:bg-emerald-600/40 border border-emerald-500/45 text-emerald-200 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
                      >
                        Feed (+25 Hunger · +5 Bond)
                      </button>

                      <button
                        type="button"
                        onClick={() => onGrow(d.id)}
                        className="min-h-[40px] px-3.5 py-2 rounded-xl bg-amber-600/25 hover:bg-amber-600/40 border border-amber-500/45 text-amber-200 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
                      >
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>Grow (+1 Age)</span>
                      </button>

                      <button
                        type="button"
                        disabled={!canMountNow}
                        onClick={() => onToggleMount(d.id)}
                        title={mountLockReason || undefined}
                        className={`min-h-[40px] px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                          d.isMounted
                            ? 'bg-amber-500 text-stone-950 border-amber-300'
                            : !canMountNow
                              ? 'bg-stone-900 border-red-500/40 text-red-300/80 opacity-75 cursor-not-allowed'
                              : 'bg-sky-600/25 hover:bg-sky-600/40 border-sky-500/50 text-sky-200'
                        }`}
                      >
                        {!canMountNow ? (
                          <Lock className="w-3.5 h-3.5" />
                        ) : (
                          <Wind className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {d.isMounted
                            ? 'Dismount Dragon'
                            : canMountNow
                              ? 'Mount & Fly'
                              : !d.rideable
                                ? `Grow to Age 3 (${d.age}/3)`
                                : 'Locked (Red Dragon)'}
                        </span>
                      </button>
                    </div>

                    {/* Color Customization & Anvil Rename */}
                    <div className="pt-2 border-t border-stone-800/80 space-y-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-stone-400 flex items-center gap-1 mr-1">
                          <Palette className="w-3.5 h-3.5 text-orange-300" /> Scales:
                        </span>
                        {DRAGON_COLOR_OPTIONS.map((opt) => {
                          const selected = d.color.toLowerCase() === opt.id.toLowerCase();
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => onCustomizeColor(d.id, opt.id)}
                              className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                                selected
                                  ? 'bg-stone-100 text-stone-950 border-white'
                                  : 'bg-stone-900 text-stone-300 border-stone-700 hover:border-stone-500'
                              }`}
                            >
                              <span
                                className="w-2.5 h-2.5 rounded-full border border-black/25 shrink-0"
                                style={{ backgroundColor: opt.hex }}
                              />
                              <span>{opt.id}</span>
                            </button>
                          );
                        })}
                        <div className="flex items-center gap-1.5 ml-auto">
                          <input
                            type="text"
                            maxLength={24}
                            value={customColorInputs[d.id] ?? ''}
                            onChange={(e) =>
                              setCustomColorInputs((prev) => ({
                                ...prev,
                                [d.id]: e.target.value,
                              }))
                            }
                            placeholder="Custom color..."
                            className="w-28 rounded-lg bg-stone-900 border border-stone-700 px-2 py-1 text-xs text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-orange-400"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const val = (customColorInputs[d.id] ?? '').trim();
                              if (val) {
                                onCustomizeColor(d.id, val);
                                setCustomColorInputs((prev) => ({ ...prev, [d.id]: '' }));
                              }
                            }}
                            className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-xs text-stone-200 font-semibold whitespace-nowrap shrink-0"
                          >
                            Apply
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          maxLength={24}
                          value={renameInputs[d.id] ?? ''}
                          onChange={(e) =>
                            setRenameInputs((prev) => ({
                              ...prev,
                              [d.id]: e.target.value,
                            }))
                          }
                          placeholder="Rename dragon with Anvil Name Tag..."
                          className="flex-1 rounded-xl bg-stone-900 border border-stone-700 px-3 py-2 text-xs text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-amber-400"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const txt = renameInputs[d.id] ?? '';
                            if (txt.trim()) {
                              onRename(d.id, txt);
                              setRenameInputs((prev) => ({ ...prev, [d.id]: '' }));
                            }
                          }}
                          className="min-h-[40px] px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-amber-600 hover:text-stone-950 border border-stone-700 text-stone-200 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                        >
                          <Hammer className="w-3.5 h-3.5" />
                          <Tag className="w-3.5 h-3.5" />
                          <span>Rename</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Combine / Hybridize Two Dragons */}
          {dragons.length >= 2 && (
            <div className="rounded-xl bg-stone-950/75 border border-purple-500/35 p-4 space-y-3">
              <div className="font-display text-sm font-bold text-purple-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                <span>Combine Two Dragons (Dual-Element Hybrid)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  value={combineA}
                  onChange={(e) => setCombineA(e.target.value)}
                  className="rounded-xl bg-stone-900 border border-stone-700 px-3 py-2 text-xs text-stone-100"
                >
                  <option value="">Select Dragon A...</option>
                  {dragons.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.elements.join('/')})
                    </option>
                  ))}
                </select>
                <select
                  value={combineB}
                  onChange={(e) => setCombineB(e.target.value)}
                  className="rounded-xl bg-stone-900 border border-stone-700 px-3 py-2 text-xs text-stone-100"
                >
                  <option value="">Select Dragon B...</option>
                  {dragons.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.elements.join('/')})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={hybridName}
                  onChange={(e) => setHybridName(e.target.value)}
                  maxLength={24}
                  placeholder="Optional custom hybrid name..."
                  className="flex-1 rounded-xl bg-stone-900 border border-stone-700 px-3 py-2 text-xs text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-purple-500"
                />
                <button
                  type="button"
                  disabled={!combineA || !combineB || combineA === combineB}
                  onClick={() => {
                    onCombine(combineA, combineB, hybridName);
                    setCombineA('');
                    setCombineB('');
                    setHybridName('');
                  }}
                  className="min-h-[40px] px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold text-xs transition-colors whitespace-nowrap shrink-0"
                >
                  Combine Hybrid
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
