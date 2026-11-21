'use client';

import React, { useState } from 'react';
import { Flame, Hammer, Lock, MapPin, Plus, ShieldCheck, Sparkles, Tag, Wind, X } from 'lucide-react';
import {
  DRAGON_VALLEY_SYSTEM,
  DragonCompanion,
  DragonElement,
} from '@/game/systems/dragonValleySystem';

interface DragonSanctuaryModalProps {
  dragons: DragonCompanion[];
  canRideDragon?: boolean;
  redDragonCave?: { x: number; z: number; discovered: boolean; bossDefeated?: boolean } | null;
  onHatch: (element: DragonElement, customName: string) => void;
  onFeed: (dragonId: string) => void;
  onCombine: (idA: string, idB: string, hybridName: string) => void;
  onRename: (dragonId: string, rawTagText: string) => void;
  onToggleMount: (dragonId: string) => void;
  onClose: () => void;
}

const ELEMENT_BADGE: Record<DragonElement, string> = {
  Ember: 'bg-orange-600/30 text-orange-200 border-orange-500/50',
  Frost: 'bg-sky-600/30 text-sky-200 border-sky-500/50',
  Storm: 'bg-indigo-600/30 text-indigo-200 border-indigo-500/50',
  Shadow: 'bg-purple-700/35 text-purple-200 border-purple-500/50',
};

export function DragonSanctuaryModal({
  dragons,
  canRideDragon = false,
  redDragonCave = null,
  onHatch,
  onFeed,
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

  const atCap = dragons.length >= DRAGON_VALLEY_SYSTEM.maxActiveDragons;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-stone-900 border border-orange-500/40 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <Flame className="w-5 h-5 text-orange-400" />
            <div>
              <h2 className="font-display text-lg font-bold text-stone-100">
                Dragon Valley Sanctuary
              </h2>
              <p className="text-[11px] text-stone-400">
                {dragons.length} / {DRAGON_VALLEY_SYSTEM.maxActiveDragons} Active Dragons •
                Hatch, Raise, Combine Hybrids, Anvil Name Tags &amp; Fly
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200"
            aria-label="Close Dragon Sanctuary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto survival-scroll text-sm">
          {/* Red Dragon Boss Unlock Gate Banner */}
          <div
            className={`rounded-xl border px-3.5 py-2.5 flex items-center justify-between gap-2 ${
              canRideDragon
                ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                : 'bg-red-950/60 border-red-500/50 text-red-100'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {canRideDragon ? (
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <Lock className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <div className="min-w-0">
                <div className="text-xs font-bold">
                  {canRideDragon
                    ? 'Dragon Riding Unlocked'
                    : 'Dragon Riding Locked — Defeat the Red Dragon Boss'}
                </div>
                <div className="text-[11px] opacity-85 truncate">
                  {canRideDragon
                    ? 'Red Dragon Boss defeated! Mount & Fly any of your dragons.'
                    : redDragonCave?.discovered
                      ? `Red Dragon Lair located at X ${Math.round(redDragonCave.x)} · Z ${Math.round(redDragonCave.z)}`
                      : 'Explore the 5,000 island caves to find & defeat the Red Dragon Boss.'}
                </div>
              </div>
            </div>
            {!canRideDragon && redDragonCave?.discovered && (
              <span className="px-2 py-1 rounded bg-red-900/70 border border-red-400/50 text-[10px] font-mono-tabular flex items-center gap-1 shrink-0">
                <MapPin className="w-3 h-3" />
                {Math.round(redDragonCave.x)}, {Math.round(redDragonCave.z)}
              </span>
            )}
          </div>

          {/* Hatch Egg Section */}
          <div className="rounded-xl bg-stone-950/75 border border-stone-800 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-display text-sm font-bold text-orange-300 flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> Hatch Elemental Egg
              </span>
              {atCap && (
                <span className="text-[11px] text-amber-400 font-semibold">
                  Cap reached ({DRAGON_VALLEY_SYSTEM.maxActiveDragons} max for steady FPS)
                </span>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {DRAGON_VALLEY_SYSTEM.elements.map((el) => (
                <button
                  key={el}
                  onClick={() => setSelectedElement(el)}
                  className={`py-2 px-2 rounded-xl border text-xs font-bold transition ${
                    selectedElement === el
                      ? 'bg-orange-600 text-stone-950 border-orange-400'
                      : 'bg-stone-900 text-stone-300 border-stone-800 hover:bg-stone-800'
                  }`}
                >
                  {el}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={eggName}
                onChange={(e) => setEggName(e.target.value)}
                maxLength={24}
                placeholder={`Name your ${selectedElement} Wyrm...`}
                className="flex-1 rounded-xl bg-stone-900 border border-stone-700 px-3 py-2 text-xs text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-orange-500"
              />
              <button
                disabled={atCap}
                onClick={() => {
                  onHatch(selectedElement, eggName);
                  setEggName('');
                }}
                className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-stone-950 font-bold text-xs transition shrink-0"
              >
                Hatch Egg
              </button>
            </div>
          </div>

          {/* Active Dragons Roster */}
          <div className="space-y-2.5">
            <div className="text-xs font-bold uppercase tracking-wider text-stone-400">
              Your Dragons
            </div>
            {dragons.length === 0 ? (
              <div className="rounded-xl bg-stone-950/60 border border-stone-800 p-4 text-xs text-stone-400 text-center">
                No dragons hatched yet. Hatch an elemental egg above to begin!
              </div>
            ) : (
              dragons.map((d) => (
                <div
                  key={d.id}
                  className={`rounded-xl border p-3.5 space-y-3 ${
                    d.isMounted
                      ? 'bg-orange-950/35 border-orange-500/70'
                      : 'bg-stone-950/75 border-stone-800'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display font-bold text-stone-100 text-sm">
                        {d.name}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-stone-800 text-stone-300 text-[10px] font-bold uppercase">
                        {d.stage}
                      </span>
                      {d.elements.map((el) => (
                        <span
                          key={el}
                          className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${ELEMENT_BADGE[el]}`}
                        >
                          {el}
                        </span>
                      ))}
                    </div>
                    <div className="text-[11px] font-mono text-amber-300">
                      Flight Speed: {d.speed}
                    </div>
                  </div>

                  {/* Growth Progress */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-stone-400">
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

                  {/* Actions: Feed, Mount/Fly, Anvil Name Tag */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      disabled={d.growth >= 100}
                      onClick={() => onFeed(d.id)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600/25 hover:bg-emerald-600/40 disabled:opacity-40 border border-emerald-500/50 text-emerald-200 text-xs font-semibold transition"
                    >
                      {d.growth >= 100 ? 'Max Adult' : 'Feed & Raise (+35%)'}
                    </button>
                    <button
                      disabled={!d.isMounted && !canRideDragon}
                      onClick={() => onToggleMount(d.id)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition ${
                        d.isMounted
                          ? 'bg-amber-500 text-stone-950 border-amber-300'
                          : !canRideDragon
                            ? 'bg-stone-900/80 border-red-500/40 text-red-300/80 opacity-75 cursor-not-allowed'
                            : 'bg-sky-600/25 hover:bg-sky-600/40 border-sky-500/50 text-sky-200'
                      }`}
                      title={
                        !d.isMounted && !canRideDragon
                          ? 'Defeat the Red Dragon Boss in the Red Dragon Cave to unlock Dragon Riding'
                          : undefined
                      }
                    >
                      {!d.isMounted && !canRideDragon ? (
                        <Lock className="w-3.5 h-3.5" />
                      ) : (
                        <Wind className="w-3.5 h-3.5" />
                      )}
                      {d.isMounted
                        ? 'Dismount Dragon'
                        : canRideDragon
                          ? 'Mount & Fly'
                          : 'Locked (Red Dragon)'}
                    </button>
                    <div className="flex items-center gap-1.5 flex-1 min-w-[180px]">
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
                        placeholder="Anvil Name Tag..."
                        className="flex-1 rounded-lg bg-stone-900 border border-stone-700 px-2.5 py-1.5 text-xs text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-amber-400"
                      />
                      <button
                        onClick={() => {
                          const txt = renameInputs[d.id] ?? '';
                          if (txt.trim()) {
                            onRename(d.id, txt);
                            setRenameInputs((prev) => ({ ...prev, [d.id]: '' }));
                          }
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-amber-600 hover:text-stone-950 border border-stone-700 text-stone-200 text-xs font-semibold flex items-center gap-1 transition"
                        title="Apply Anvil + Name Tag"
                      >
                        <Hammer className="w-3 h-3" />
                        <Tag className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Combine / Hybridize Two Dragons */}
          {dragons.length >= 2 && (
            <div className="rounded-xl bg-stone-950/75 border border-purple-500/35 p-4 space-y-3">
              <div className="font-display text-sm font-bold text-purple-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> Combine Two Dragons (Dual-Element Hybrid)
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
                  disabled={!combineA || !combineB || combineA === combineB}
                  onClick={() => {
                    onCombine(combineA, combineB, hybridName);
                    setCombineA('');
                    setCombineB('');
                    setHybridName('');
                  }}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold text-xs transition shrink-0"
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
