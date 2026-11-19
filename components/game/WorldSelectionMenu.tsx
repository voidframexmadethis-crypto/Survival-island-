'use client';

import React, { useState } from 'react';
import {
  Box,
  Compass,
  Grid,
  Layers,
  Lock,
  Music,
  Play,
  Plus,
  RollerCoaster,
  Settings,
  ShieldOff,
  Skull,
  Sparkles,
  Store,
  Trash2,
  Trees,
  Users,
  Zap,
} from 'lucide-react';
import {
  FlatSurfaceStyle,
  GameMode,
  SaveSlotSummary,
  WorldType,
  resolveAllowedGameMode,
} from '@/game/types';

interface WorldSelectionMenuProps {
  latestSave: SaveSlotSummary | null;
  saveSlots: SaveSlotSummary[];
  multiplayerRoomCode?: string | null;
  onContinueLatest: () => void;
  onLoadSlot: (slotId: string) => void;
  onDeleteSlot: (slotId: string) => void;
  onCreateWorld: (opts: {
    worldType: WorldType;
    worldName: string;
    gameMode: GameMode;
    flatSurfaceStyle?: FlatSurfaceStyle;
  }) => void;
  onOpenMultiplayer: () => void;
  onOpenExchange: () => void;
  onOpenMods: () => void;
  onOpenSettings: () => void;
}

const MODE_LABELS: Record<GameMode, string> = {
  survival: 'Survival',
  boss_hunt: 'Guardian Boss Hunt',
  sandbox: 'Creative / Sandbox',
};

export function WorldSelectionMenu({
  latestSave,
  saveSlots,
  multiplayerRoomCode,
  onContinueLatest,
  onLoadSlot,
  onDeleteSlot,
  onCreateWorld,
  onOpenMultiplayer,
  onOpenExchange,
  onOpenMods,
  onOpenSettings,
}: WorldSelectionMenuProps) {
  const [selectedWorldType, setSelectedWorldType] = useState<WorldType | null>(null);
  const [selectedIslandMode, setSelectedIslandMode] = useState<GameMode>('survival');
  const [flatSurfaceStyle, setFlatSurfaceStyle] = useState<FlatSurfaceStyle>('turf_grid');
  const [worldNameInput, setWorldNameInput] = useState('');

  const handleSelectWorldType = (nextType: WorldType) => {
    setSelectedWorldType(nextType);
    if (!worldNameInput.trim() || worldNameInput === 'Lost World Island' || worldNameInput === 'Grand Coaster Park') {
      setWorldNameInput(nextType === 'flat' ? 'Grand Coaster Park' : 'Lost World Island');
    }
  };

  const effectiveMode: GameMode =
    selectedWorldType === 'flat'
      ? resolveAllowedGameMode('flat', 'sandbox')
      : resolveAllowedGameMode('island', selectedIslandMode);

  const handleLaunch = () => {
    if (!selectedWorldType) return;
    const defaultName =
      selectedWorldType === 'flat' ? 'Grand Coaster Park' : 'Lost World Island';
    onCreateWorld({
      worldType: selectedWorldType,
      worldName: worldNameInput.trim() || defaultName,
      gameMode: effectiveMode,
      flatSurfaceStyle: selectedWorldType === 'flat' ? flatSurfaceStyle : undefined,
    });
  };

  const renderWorldBadge = (wt?: WorldType) =>
    wt === 'flat' ? (
      <span className="px-2 py-0.5 rounded bg-sky-950 border border-sky-500/60 text-sky-300 text-[10px] font-bold uppercase tracking-wide whitespace-nowrap shrink-0">
        Flat World
      </span>
    ) : (
      <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/60 text-emerald-300 text-[10px] font-bold uppercase tracking-wide whitespace-nowrap shrink-0">
        Island World
      </span>
    );

  const renderModeBadge = (wt?: WorldType, gm?: GameMode) => {
    const resolved = resolveAllowedGameMode(wt === 'flat' ? 'flat' : 'island', gm);
    if (resolved === 'sandbox') {
      return (
        <span className="px-2 py-0.5 rounded bg-sky-600/20 border border-sky-400/50 text-sky-200 text-[10px] font-bold uppercase whitespace-nowrap shrink-0">
          Creative Mode
        </span>
      );
    }
    if (resolved === 'boss_hunt') {
      return (
        <span className="px-2 py-0.5 rounded bg-red-600/20 border border-red-400/50 text-red-200 text-[10px] font-bold uppercase whitespace-nowrap shrink-0">
          Boss Hunt
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded bg-amber-600/20 border border-amber-400/50 text-amber-200 text-[10px] font-bold uppercase whitespace-nowrap shrink-0">
        Survival
      </span>
    );
  };

  return (
    <div className="relative z-10 w-full min-h-[100dvh] flex flex-col justify-between p-4 sm:p-8 bg-gradient-to-t from-stone-950/95 via-stone-950/60 to-stone-950/80">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 safe-top">
        <div className="text-xs font-semibold tracking-wider text-amber-300 uppercase">
          AdventureForgeGames · World Selection
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenMultiplayer}
            className="min-h-[42px] px-3.5 rounded-xl bg-sky-950/95 hover:bg-sky-900 border border-sky-500/50 text-sky-200 text-xs font-semibold flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <Users className="w-4 h-4" />
            <span>
              Multiplayer{multiplayerRoomCode ? ` (${multiplayerRoomCode})` : ''}
            </span>
          </button>
          <button
            type="button"
            onClick={onOpenExchange}
            className="min-h-[42px] px-3.5 rounded-xl bg-amber-950/95 hover:bg-amber-900 border border-amber-500/60 text-amber-200 text-xs font-bold tracking-wide uppercase flex items-center gap-2 whitespace-nowrap shrink-0 shadow-lg"
          >
            <Store className="w-4 h-4 text-amber-400" />
            <span>Survival Island Exchange</span>
          </button>
          <button
            type="button"
            onClick={onOpenMods}
            className="min-h-[42px] px-3.5 rounded-xl bg-emerald-950/95 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-200 text-xs font-semibold flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <Box className="w-4 h-4" />
            <span>Mods</span>
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="min-h-[42px] px-4 rounded-xl bg-stone-900/95 hover:bg-stone-800 border border-stone-700 text-stone-100 text-xs font-semibold flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl w-full mx-auto space-y-6 my-auto py-5">
        {/* Hero Title & Primary Continue Action */}
        <div className="space-y-3">
          <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-stone-50 leading-[1.06] text-balance drop-shadow-lg">
            SURVIVAL ISLAND: LOST WORLD
          </h1>
          <p className="text-sm sm:text-base text-stone-200 max-w-2xl leading-relaxed">
            Explore the prehistoric island in Survival, Boss Hunt, or Creative—or launch an expansive level Flat World park built for enormous roller coasters and Music Pro.
          </p>

          <div className="pt-1 flex flex-wrap items-center gap-3">
            {latestSave && (
              <button
                type="button"
                onClick={onContinueLatest}
                className="min-h-[52px] px-5 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-sm flex items-center gap-3 shadow-xl whitespace-nowrap shrink-0 transition"
              >
                <Play className="w-5 h-5 shrink-0" />
                <span className="block text-left">
                  <span className="block leading-tight">
                    Continue: {latestSave.worldName || 'Saved World'}
                  </span>
                  <span className="block text-[11px] font-semibold opacity-90">
                    {latestSave.worldType === 'flat' ? 'Flat World' : 'Island World'} ·{' '}
                    {MODE_LABELS[resolveAllowedGameMode(latestSave.worldType === 'flat' ? 'flat' : 'island', latestSave.gameMode)]}{' '}
                    · Day {latestSave.dayCount}
                    {(latestSave.coastersCount ?? 0) > 0
                      ? ` · ${latestSave.coastersCount} Coaster${latestSave.coastersCount === 1 ? '' : 's'}`
                      : ''}
                  </span>
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={onOpenExchange}
              className="min-h-[52px] px-5 py-3 rounded-xl bg-stone-950/95 hover:bg-stone-900 border border-amber-500/70 text-amber-200 font-bold text-sm flex items-center gap-3 shadow-xl whitespace-nowrap shrink-0 transition"
            >
              <Store className="w-5 h-5 text-amber-400 shrink-0" />
              <span className="block text-left">
                <span className="block leading-tight tracking-wide uppercase">
                  SURVIVAL ISLAND EXCHANGE
                </span>
                <span className="block text-[11px] font-medium text-stone-400">
                  Gun Skins &amp; Tactical Backpack Skins · Cosmetic Only
                </span>
              </span>
            </button>
          </div>
        </div>

        {/* Create New World Section */}
        <div className="rounded-2xl bg-stone-950/90 border border-stone-800 p-4 sm:p-5 space-y-4 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                <span>Create New World</span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                Step 1: Choose your World Type before configuring your mode and entering.
              </p>
            </div>
            {selectedWorldType && (
              <span className="text-[11px] font-semibold text-stone-300 px-2.5 py-1 rounded-lg bg-stone-900 border border-stone-700">
                Selected: {selectedWorldType === 'flat' ? 'Flat World (Creative Only)' : 'Island World'}
              </span>
            )}
          </div>

          {/* Step 1: Choose World Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Island World Card */}
            <button
              type="button"
              data-world-type="island"
              onClick={() => handleSelectWorldType('island')}
              className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between gap-3 ${
                selectedWorldType === 'island'
                  ? 'bg-emerald-950/55 border-emerald-400 shadow-lg'
                  : 'bg-stone-900/90 hover:bg-stone-900 border-stone-700 hover:border-emerald-500/60'
              }`}
            >
              <span className="block space-y-2 w-full">
                <span className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <span className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-300 shrink-0">
                      <Trees className="w-5 h-5" />
                    </span>
                    <span className="block">
                      <span className="block font-display text-base font-bold text-stone-100">
                        ISLAND WORLD
                      </span>
                      <span className="block text-[11px] font-semibold text-emerald-300">
                        Survival · Boss Hunt · Creative
                      </span>
                    </span>
                  </span>
                  <span
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase whitespace-nowrap shrink-0 ${
                      selectedWorldType === 'island'
                        ? 'bg-emerald-500 text-stone-950'
                        : 'bg-stone-800 text-stone-300'
                    }`}
                  >
                    {selectedWorldType === 'island' ? 'Selected' : 'Choose'}
                  </span>
                </span>
                <span className="block text-xs text-stone-300 leading-relaxed">
                  Full prehistoric island biomes, dynamic ocean, wildlife, villages, hilltop shelter, Music Pro, vehicles, and realistic Roller Coaster Creator.
                </span>
              </span>
              <span className="flex flex-wrap gap-1.5 text-[10px] font-semibold text-stone-300">
                <span className="px-2 py-0.5 rounded bg-stone-950 border border-stone-800">
                  Biomes &amp; Wildlife
                </span>
                <span className="px-2 py-0.5 rounded bg-stone-950 border border-stone-800">
                  Villages &amp; Shelters
                </span>
                <span className="px-2 py-0.5 rounded bg-stone-950 border border-stone-800">
                  Coaster Creator
                </span>
              </span>
            </button>

            {/* Flat World Card */}
            <button
              type="button"
              data-world-type="flat"
              onClick={() => handleSelectWorldType('flat')}
              className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between gap-3 ${
                selectedWorldType === 'flat'
                  ? 'bg-sky-950/55 border-sky-400 shadow-lg'
                  : 'bg-stone-900/90 hover:bg-stone-900 border-stone-700 hover:border-sky-500/60'
              }`}
            >
              <span className="block space-y-2 w-full">
                <span className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <span className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/40 flex items-center justify-center text-sky-300 shrink-0">
                      <RollerCoaster className="w-5 h-5" />
                    </span>
                    <span className="block">
                      <span className="block font-display text-base font-bold text-stone-100">
                        FLAT WORLD
                      </span>
                      <span className="block text-[11px] font-semibold text-sky-300">
                        Creative Only — Survival Disabled
                      </span>
                    </span>
                  </span>
                  <span
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase whitespace-nowrap shrink-0 ${
                      selectedWorldType === 'flat'
                        ? 'bg-sky-500 text-stone-950'
                        : 'bg-stone-800 text-stone-300'
                    }`}
                  >
                    {selectedWorldType === 'flat' ? 'Selected' : 'Choose'}
                  </span>
                </span>
                <span className="block text-xs text-stone-300 leading-relaxed">
                  Massive level buildable park grounds (310m radius) with zero hunger, thirst, or wildlife threats. Ideal for enormous amusement parks, custom inversions, and Music Pro.
                </span>
              </span>
              <span className="flex flex-wrap gap-1.5 text-[10px] font-semibold text-stone-300">
                <span className="px-2 py-0.5 rounded bg-stone-950 border border-stone-800">
                  No Survival Threats
                </span>
                <span className="px-2 py-0.5 rounded bg-stone-950 border border-stone-800">
                  Roller Coasters &amp; Inversions
                </span>
                <span className="px-2 py-0.5 rounded bg-stone-950 border border-stone-800">
                  Music Pro Pavilion
                </span>
              </span>
            </button>
          </div>

          {/* Step 2: Configure World & Launch (Appears once a World Type is chosen) */}
          {selectedWorldType && (
            <div className="rounded-xl bg-stone-900/90 border border-stone-700/80 p-4 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div className="flex-1 min-w-0 space-y-1.5">
                  <label
                    htmlFor="world-name-input"
                    className="block text-[11px] font-bold uppercase tracking-wider text-stone-300"
                  >
                    Step 2: World Name
                  </label>
                  <input
                    id="world-name-input"
                    type="text"
                    maxLength={40}
                    value={worldNameInput}
                    onChange={(e) => setWorldNameInput(e.target.value)}
                    placeholder={
                      selectedWorldType === 'flat'
                        ? 'Grand Coaster Park'
                        : 'Lost World Island'
                    }
                    className="w-full min-h-[42px] px-3 rounded-xl bg-stone-950 border border-stone-700 focus:border-amber-400 focus:outline-none text-sm text-stone-100"
                  />
                </div>
              </div>

              {selectedWorldType === 'island' ? (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                    Select Island Game Mode
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      data-game-mode="survival"
                      onClick={() => setSelectedIslandMode('survival')}
                      className={`p-3 rounded-xl border text-left transition ${
                        selectedIslandMode === 'survival'
                          ? 'bg-amber-950/60 border-amber-400 text-stone-100'
                          : 'bg-stone-950/70 hover:bg-stone-950 border-stone-800 text-stone-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold flex items-center gap-1.5">
                          <Compass className="w-3.5 h-3.5 text-amber-400" />
                          Survival Mode
                        </span>
                        <span className="text-[10px] font-extrabold uppercase text-amber-300">
                          Hardcore
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-400 leading-snug">
                        Hunger, thirst, fluid erosion &amp; 7-Day Blood Moon sieges.
                      </p>
                    </button>

                    <button
                      type="button"
                      data-game-mode="boss_hunt"
                      onClick={() => setSelectedIslandMode('boss_hunt')}
                      className={`p-3 rounded-xl border text-left transition ${
                        selectedIslandMode === 'boss_hunt'
                          ? 'bg-red-950/60 border-red-400 text-stone-100'
                          : 'bg-stone-950/70 hover:bg-stone-950 border-stone-800 text-stone-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold flex items-center gap-1.5">
                          <Skull className="w-3.5 h-3.5 text-red-400" />
                          Guardian Boss Hunt
                        </span>
                        <span className="text-[10px] font-extrabold uppercase text-red-300">
                          Action
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-400 leading-snug">
                        Track and defeat 4 colossal Titans across island biomes.
                      </p>
                    </button>

                    <button
                      type="button"
                      data-game-mode="sandbox"
                      onClick={() => setSelectedIslandMode('sandbox')}
                      className={`p-3 rounded-xl border text-left transition ${
                        selectedIslandMode === 'sandbox'
                          ? 'bg-sky-950/60 border-sky-400 text-stone-100'
                          : 'bg-stone-950/70 hover:bg-stone-950 border-stone-800 text-stone-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-sky-400" />
                          Creative / Sandbox
                        </span>
                        <span className="text-[10px] font-extrabold uppercase text-sky-300">
                          Free Build
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-400 leading-snug">
                        Unlimited resources, flight &amp; island coaster construction.
                      </p>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Flat World Mode Restriction Notice */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="p-3 rounded-xl bg-sky-950/50 border border-sky-400/70 flex items-start gap-2.5">
                      <Zap className="w-4 h-4 text-sky-300 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-bold text-sky-200 flex items-center gap-1.5">
                          <span>Creative Mode Active</span>
                          <span className="px-1.5 py-0.5 rounded bg-sky-500 text-stone-950 text-[9px] font-extrabold uppercase">
                            Only Mode
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-300 mt-0.5">
                          Unlimited building tools, Roller Coaster Creator, custom inversions, and Music Pro enabled.
                        </p>
                      </div>
                    </div>

                    <div
                      aria-disabled="true"
                      className="p-3 rounded-xl bg-stone-950/70 border border-stone-800 opacity-65 flex items-start gap-2.5"
                    >
                      <ShieldOff className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-bold text-stone-300 flex items-center gap-1.5">
                          <span>Survival Mode Disabled</span>
                          <Lock className="w-3 h-3 text-stone-400" />
                        </div>
                        <p className="text-[11px] text-stone-400 mt-0.5">
                          Hunger, thirst, wildlife threats, and survival progression are turned off in Flat World.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Ground Surface Style Selector */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-sky-300 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" />
                      <span>Select Park Ground Surface</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        data-flat-surface="turf_grid"
                        onClick={() => setFlatSurfaceStyle('turf_grid')}
                        className={`p-3 rounded-xl border text-left flex items-center gap-3 transition ${
                          flatSurfaceStyle === 'turf_grid'
                            ? 'bg-emerald-950/60 border-emerald-400 text-stone-100'
                            : 'bg-stone-950/70 hover:bg-stone-950 border-stone-800 text-stone-300'
                        }`}
                      >
                        <div className="w-9 h-9 rounded-lg bg-emerald-700/40 border border-emerald-400/50 flex items-center justify-center shrink-0">
                          <Grid className="w-4 h-4 text-emerald-300" />
                        </div>
                        <div>
                          <div className="text-xs font-bold">Sunlit Turf Grid</div>
                          <div className="text-[11px] text-stone-400">
                            Crisp level green lawn with 8m park alignment lines.
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        data-flat-surface="concrete_plaza"
                        onClick={() => setFlatSurfaceStyle('concrete_plaza')}
                        className={`p-3 rounded-xl border text-left flex items-center gap-3 transition ${
                          flatSurfaceStyle === 'concrete_plaza'
                            ? 'bg-sky-950/60 border-sky-400 text-stone-100'
                            : 'bg-stone-950/70 hover:bg-stone-950 border-stone-800 text-stone-300'
                        }`}
                      >
                        <div className="w-9 h-9 rounded-lg bg-slate-600/40 border border-slate-400/50 flex items-center justify-center shrink-0">
                          <Layers className="w-4 h-4 text-slate-200" />
                        </div>
                        <div>
                          <div className="text-xs font-bold">Smooth Concrete Plaza</div>
                          <div className="text-[11px] text-stone-400">
                            Clean theme-park stone slab apron for giant coaster layouts.
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="text-[11px] text-stone-400 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>
                    Creates a separate save slot — existing Island worlds are never overwritten.
                  </span>
                </div>
                <button
                  type="button"
                  data-start="true"
                  onClick={handleLaunch}
                  className={`min-h-[48px] px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-xl whitespace-nowrap shrink-0 transition ${
                    selectedWorldType === 'flat'
                      ? 'bg-sky-500 hover:bg-sky-400 text-stone-950'
                      : 'bg-amber-600 hover:bg-amber-500 text-stone-950'
                  }`}
                >
                  <Play className="w-4 h-4" />
                  <span>
                    {selectedWorldType === 'flat'
                      ? 'Create & Enter Flat Park'
                      : 'Create & Enter Island World'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Saved Worlds List */}
        {saveSlots.length > 0 && (
          <div className="rounded-2xl bg-stone-950/90 border border-stone-800 p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-bold uppercase tracking-wider text-stone-300">
                Saved Worlds ({saveSlots.length}/12)
              </div>
              <div className="text-[11px] text-stone-400 flex items-center gap-1">
                <Music className="w-3 h-3 text-amber-400" />
                <span>Music Pro &amp; Coasters preserved per world</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-56 overflow-y-auto survival-scroll pr-1">
              {saveSlots.map((slot) => (
                <div
                  key={slot.slotId}
                  className="flex items-center justify-between gap-2.5 rounded-xl bg-stone-900/90 border border-stone-800 px-3 py-2.5"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {renderWorldBadge(slot.worldType)}
                      {renderModeBadge(slot.worldType, slot.gameMode)}
                    </div>
                    <div className="text-xs font-bold text-stone-100 truncate">
                      {slot.worldName || 'Saved World'}
                    </div>
                    <div className="text-[11px] text-stone-400 font-mono-tabular truncate">
                      Day {slot.dayCount} · {slot.structuresCount} struct
                      {(slot.coastersCount ?? 0) > 0
                        ? ` · ${slot.coastersCount} coaster${slot.coastersCount === 1 ? '' : 's'}`
                        : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onLoadSlot(slot.slotId)}
                      className="min-h-[38px] px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs whitespace-nowrap shrink-0"
                    >
                      Continue
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteSlot(slot.slotId)}
                      className="min-w-[38px] min-h-[38px] rounded-lg bg-stone-800 hover:bg-red-700 text-stone-300 flex items-center justify-center shrink-0"
                      aria-label={`Delete ${slot.worldName || slot.slotId}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-300 safe-bottom">
        <span>
          Desktop: WASD Move · Drag Look · C Crouch · E Act · P Place · B Craft · Space Jump
        </span>
        <span aria-hidden="true">·</span>
        <span>Mobile: Virtual Thumbstick &amp; Touch Camera</span>
      </div>
    </div>
  );
}
