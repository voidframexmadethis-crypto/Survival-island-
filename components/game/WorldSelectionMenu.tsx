'use client';

import React, { useState } from 'react';
import {
  Box,
  Compass,
  Gamepad2,
  Grid,
  Layers,
  Lock,
  LogOut,
  MapPin,
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
  Trophy,
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
  onOpenControls?: () => void;
  onOpenMap?: () => void;
  onOpenAchievements?: () => void;
  onQuit?: () => void;
}

const MODE_LABELS: Record<GameMode, string> = {
  survival: 'Survival',
  boss_hunt: 'Guardian Boss Hunt',
  sandbox: 'Creative / Sandbox',
};

function MossAccent({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 26"
      className={className}
      fill="none"
    >
      <path
        d="M2 8C14 3 22 14 35 9C47 4 56 15 71 10C84 6 95 16 118 8V0H2V8Z"
        fill="#3f6212"
        fillOpacity="0.88"
      />
      <path
        d="M8 12C19 7 28 18 41 12C53 7 63 17 77 12C90 8 98 15 112 10"
        stroke="#65a30d"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeOpacity="0.72"
      />
    </svg>
  );
}

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
  onOpenControls,
  onOpenMap,
  onOpenAchievements,
  onQuit,
}: WorldSelectionMenuProps) {
  const [selectedWorldType, setSelectedWorldType] = useState<WorldType | null>(null);
  const [selectedIslandMode, setSelectedIslandMode] = useState<GameMode>('survival');
  const [flatSurfaceStyle, setFlatSurfaceStyle] = useState<FlatSurfaceStyle>('turf_grid');
  const [worldNameInput, setWorldNameInput] = useState('');

  const handleSelectWorldType = (nextType: WorldType) => {
    setSelectedWorldType(nextType);
    if (
      !worldNameInput.trim() ||
      worldNameInput === 'Lost World Island' ||
      worldNameInput === 'Grand Coaster Park'
    ) {
      setWorldNameInput(nextType === 'flat' ? 'Grand Coaster Park' : 'Lost World Island');
    }
  };

  const handlePrimaryPlay = () => {
    if (latestSave) {
      onContinueLatest();
      return;
    }
    handleSelectWorldType('island');
    if (typeof document !== 'undefined') {
      window.requestAnimationFrame(() => {
        document
          .getElementById('world-config-panel')
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
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
      <span className="px-2 py-0.5 rounded bg-sky-950/90 border border-sky-500/60 text-sky-300 text-[10px] font-bold uppercase tracking-wide whitespace-nowrap shrink-0">
        Flat World
      </span>
    ) : (
      <span className="px-2 py-0.5 rounded bg-emerald-950/90 border border-emerald-500/60 text-emerald-300 text-[10px] font-bold uppercase tracking-wide whitespace-nowrap shrink-0">
        Island World
      </span>
    );

  const renderModeBadge = (wt?: WorldType, gm?: GameMode) => {
    const resolved = resolveAllowedGameMode(wt === 'flat' ? 'flat' : 'island', gm);
    if (resolved === 'sandbox') {
      return (
        <span className="px-2 py-0.5 rounded bg-sky-600/25 border border-sky-400/50 text-sky-200 text-[10px] font-bold uppercase whitespace-nowrap shrink-0">
          Creative Mode
        </span>
      );
    }
    if (resolved === 'boss_hunt') {
      return (
        <span className="px-2 py-0.5 rounded bg-red-600/25 border border-red-400/50 text-red-200 text-[10px] font-bold uppercase whitespace-nowrap shrink-0">
          Boss Hunt
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded bg-amber-600/25 border border-amber-400/50 text-amber-200 text-[10px] font-bold uppercase whitespace-nowrap shrink-0">
        Survival
      </span>
    );
  };

  return (
    <div className="relative z-10 w-full min-h-[100dvh] flex flex-col justify-between p-4 sm:p-6 lg:p-8 bg-gradient-to-t from-stone-950/90 via-stone-950/35 to-stone-950/65">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 safe-top">
        <div className="px-3 py-1.5 rounded-lg bg-stone-950/75 border border-stone-700/80 text-xs font-semibold tracking-wider text-amber-300 uppercase shadow-md">
          AdventureForgeGames · World Selection
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenMultiplayer}
            className="min-h-[42px] px-3.5 rounded-lg island-wood-plank border border-sky-400/45 text-sky-200 text-xs font-semibold flex items-center gap-2 whitespace-nowrap shrink-0 transition"
          >
            <Users className="w-4 h-4 text-sky-300" />
            <span>
              Multiplayer{multiplayerRoomCode ? ` (${multiplayerRoomCode})` : ''}
            </span>
          </button>
          <button
            type="button"
            onClick={onOpenExchange}
            className="min-h-[42px] px-3.5 rounded-lg island-wood-plank border border-amber-500/65 text-amber-200 text-xs font-bold tracking-wide uppercase flex items-center gap-2 whitespace-nowrap shrink-0 transition"
          >
            <Store className="w-4 h-4 text-amber-400" />
            <span>Survival Island Exchange</span>
          </button>
          <button
            type="button"
            onClick={onOpenMods}
            className="min-h-[42px] px-3.5 rounded-lg island-wood-plank border border-emerald-400/50 text-emerald-200 text-xs font-semibold flex items-center gap-2 whitespace-nowrap shrink-0 transition"
          >
            <Box className="w-4 h-4 text-emerald-300" />
            <span>Mods</span>
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="min-h-[42px] px-4 rounded-lg island-wood-plank border border-amber-700/60 text-stone-100 text-xs font-semibold flex items-center gap-2 whitespace-nowrap shrink-0 transition"
          >
            <Settings className="w-4 h-4 text-stone-200" />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl w-full mx-auto space-y-5 my-auto py-4">
        {/* Mossy Carved-Stone Header Monument */}
        <header className="relative island-stone-slab rounded-2xl border-2 border-stone-600/80 px-5 py-4 sm:px-7 sm:py-5 overflow-hidden">
          <MossAccent className="pointer-events-none absolute top-0 left-0 w-36 h-7 opacity-90" />
          <MossAccent className="pointer-events-none absolute top-0 right-0 w-36 h-7 opacity-85 -scale-x-100" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-lime-900/60 via-emerald-800/40 to-lime-900/60" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <h1 className="font-display font-black tracking-wide leading-[0.98] text-balance">
                <span className="block text-2xl sm:text-4xl lg:text-5xl island-stone-title">
                  SURVIVAL ISLAND:
                </span>
                <span className="block text-xl sm:text-3xl lg:text-4xl italic island-lostworld-title tracking-wider mt-0.5">
                  LOST WORLD
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-stone-200 max-w-2xl leading-relaxed drop-shadow">
                Explore the prehistoric island in Survival, Boss Hunt, or Creative—or launch an expansive level Flat World park built for enormous roller coasters and Music Pro.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {latestSave && (
                <button
                  type="button"
                  onClick={onContinueLatest}
                  className="min-h-[52px] px-4 py-2.5 rounded-lg island-wood-plank-play border-2 border-emerald-400/90 text-stone-50 font-bold text-sm flex items-center gap-3 whitespace-nowrap shrink-0 transition cursor-pointer"
                >
                  <Play className="w-5 h-5 text-emerald-300 fill-emerald-400 shrink-0" />
                  <span className="block text-left">
                    <span className="block leading-tight">
                      Continue: {latestSave.worldName || 'Saved World'}
                    </span>
                    <span className="block text-[11px] font-semibold text-emerald-200/95">
                      {latestSave.worldType === 'flat' ? 'Flat World' : 'Island World'} ·{' '}
                      {MODE_LABELS[
                        resolveAllowedGameMode(
                          latestSave.worldType === 'flat' ? 'flat' : 'island',
                          latestSave.gameMode,
                        )
                      ]}{' '}
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
                className="min-h-[52px] px-4 py-2.5 rounded-lg island-wood-plank border border-amber-500/75 text-amber-200 font-bold text-sm flex items-center gap-3 whitespace-nowrap shrink-0 transition cursor-pointer"
              >
                <Store className="w-5 h-5 text-amber-400 shrink-0" />
                <span className="block text-left">
                  <span className="block leading-tight tracking-wide uppercase">
                    SURVIVAL ISLAND EXCHANGE
                  </span>
                  <span className="block text-[11px] font-medium text-stone-300">
                    Gun Skins &amp; Tactical Backpack Skins · Cosmetic Only
                  </span>
                </span>
              </button>
            </div>
          </div>
        </header>

        {/* Main 2-Column Expedition Layout: Left Weathered Wooden Plank Stack + Right World Modes */}
        <div className="grid grid-cols-1 lg:grid-cols-[270px_1fr] gap-5 items-start">
          {/* Left Column: Weathered Wooden Plank Menu Stack */}
          <nav
            aria-label="Main Menu"
            className="flex flex-col gap-2.5 island-stone-slab rounded-2xl border border-stone-700/90 p-3"
          >
            <button
              type="button"
              onClick={handlePrimaryPlay}
              className="w-full min-h-[54px] px-4 py-2.5 rounded-lg island-wood-plank-play border-2 border-emerald-400/90 text-stone-50 flex items-center gap-3.5 text-left transition cursor-pointer"
            >
              <Play className="w-6 h-6 text-emerald-300 fill-emerald-400 shrink-0 drop-shadow" />
              <span className="min-w-0">
                <span className="block font-display text-lg font-black tracking-wider leading-none text-stone-50">
                  PLAY
                </span>
                <span className="block text-[10px] font-semibold text-emerald-200/90 truncate mt-1">
                  {latestSave
                    ? `Resume ${latestSave.worldName || 'Expedition'}`
                    : 'Choose Island or Flat World'}
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={onOpenSettings}
              className="w-full min-h-[46px] px-4 py-2 rounded-lg island-wood-plank border border-amber-800/75 text-stone-100 flex items-center gap-3.5 text-left transition cursor-pointer"
            >
              <Settings className="w-5 h-5 text-stone-300 shrink-0" />
              <span className="font-display text-sm font-bold tracking-wider uppercase">
                SETTINGS
              </span>
            </button>

            <button
              type="button"
              onClick={onOpenControls}
              className="w-full min-h-[46px] px-4 py-2 rounded-lg island-wood-plank border border-amber-800/75 text-stone-100 flex items-center gap-3.5 text-left transition cursor-pointer"
            >
              <Gamepad2 className="w-5 h-5 text-stone-300 shrink-0" />
              <span className="font-display text-sm font-bold tracking-wider uppercase">
                CONTROLS
              </span>
            </button>

            <button
              type="button"
              onClick={onOpenMap}
              className="w-full min-h-[46px] px-4 py-2 rounded-lg island-wood-plank border border-amber-800/75 text-stone-100 flex items-center gap-3.5 text-left transition cursor-pointer"
            >
              <MapPin className="w-5 h-5 text-stone-300 shrink-0" />
              <span className="font-display text-sm font-bold tracking-wider uppercase">
                MAP
              </span>
            </button>

            <button
              type="button"
              onClick={onOpenAchievements}
              className="w-full min-h-[46px] px-4 py-2 rounded-lg island-wood-plank border border-amber-800/75 text-stone-100 flex items-center gap-3.5 text-left transition cursor-pointer"
            >
              <Trophy className="w-5 h-5 text-amber-300 shrink-0" />
              <span className="font-display text-sm font-bold tracking-wider uppercase">
                ACHIEVEMENTS
              </span>
            </button>

            <button
              type="button"
              onClick={onQuit}
              className="w-full min-h-[46px] px-4 py-2 rounded-lg island-wood-plank border border-stone-700/80 text-stone-200 flex items-center gap-3.5 text-left transition cursor-pointer"
            >
              <LogOut className="w-5 h-5 text-stone-300 shrink-0" />
              <span className="font-display text-sm font-bold tracking-wider uppercase">
                QUIT
              </span>
            </button>
          </nav>

          {/* Right Column: World-Mode Carved Stone Cards, Step 2 Config & Saved Worlds */}
          <div className="space-y-4 min-w-0">
            {/* Create New World Section */}
            <div className="relative island-stone-slab rounded-2xl border-2 border-stone-600/80 p-4 sm:p-5 space-y-4 overflow-hidden">
              <MossAccent className="pointer-events-none absolute top-0 right-6 w-28 h-6 opacity-80" />

              <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create New World</span>
                  </div>
                  <p className="text-xs text-stone-300 mt-0.5">
                    Step 1: Choose your World Type before configuring your mode and entering.
                  </p>
                </div>
                {selectedWorldType && (
                  <span className="text-[11px] font-semibold text-stone-100 px-3 py-1 rounded-md island-wood-plank border border-amber-700/70 whitespace-nowrap shrink-0">
                    Selected:{' '}
                    {selectedWorldType === 'flat'
                      ? 'Flat World (Creative Only)'
                      : 'Island World'}
                  </span>
                )}
              </div>

              {/* Step 1: Choose World Type Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Island World Card */}
                <button
                  type="button"
                  data-world-type="island"
                  onClick={() => handleSelectWorldType('island')}
                  className={`relative p-4 rounded-xl border-2 text-left transition flex flex-col justify-between gap-3.5 island-stone-slab overflow-hidden cursor-pointer ${
                    selectedWorldType === 'island'
                      ? 'border-emerald-400 shadow-[0_0_24px_rgba(52,211,153,0.38)]'
                      : 'border-stone-600/85 hover:border-emerald-400/75'
                  }`}
                >
                  <MossAccent className="pointer-events-none absolute top-0 left-0 w-24 h-5 opacity-85" />
                  <span className="relative z-10 block space-y-2.5 w-full">
                    <span className="flex items-start justify-between gap-2.5">
                      <span className="flex items-center gap-3 min-w-0">
                        <span className="w-11 h-11 rounded-full bg-emerald-950/90 border-2 border-emerald-400/85 shadow-[0_0_16px_rgba(74,222,128,0.45)] flex items-center justify-center text-emerald-300 shrink-0">
                          <Trees className="w-5 h-5" />
                        </span>
                        <span className="block min-w-0">
                          <span className="block font-display text-lg font-extrabold text-stone-100 tracking-wide">
                            ISLAND WORLD
                          </span>
                          <span className="block text-[11px] font-bold text-emerald-300">
                            Survival · Boss Hunt · Creative
                          </span>
                        </span>
                      </span>
                      <span
                        className={`px-3 py-1.5 rounded-md text-[11px] font-extrabold uppercase tracking-wider whitespace-nowrap shrink-0 border ${
                          selectedWorldType === 'island'
                            ? 'bg-emerald-500 border-emerald-300 text-stone-950 shadow-[0_0_12px_rgba(74,222,128,0.5)]'
                            : 'island-wood-plank border-amber-700/80 text-stone-100'
                        }`}
                      >
                        {selectedWorldType === 'island' ? 'Selected' : 'Choose'}
                      </span>
                    </span>
                    <span className="block text-xs text-stone-200 leading-relaxed">
                      Full prehistoric island biomes, dynamic ocean, wildlife, villages, hilltop shelter, Music Pro, vehicles, and realistic Roller Coaster Creator.
                    </span>
                  </span>
                  <span className="relative z-10 flex flex-wrap gap-1.5 text-[10px] font-semibold text-amber-100">
                    <span className="px-2.5 py-1 rounded island-wood-plank border border-amber-800/75">
                      Biomes &amp; Wildlife
                    </span>
                    <span className="px-2.5 py-1 rounded island-wood-plank border border-amber-800/75">
                      Villages &amp; Shelters
                    </span>
                    <span className="px-2.5 py-1 rounded island-wood-plank border border-amber-800/75">
                      Coaster Creator
                    </span>
                  </span>
                </button>

                {/* Flat World Card */}
                <button
                  type="button"
                  data-world-type="flat"
                  onClick={() => handleSelectWorldType('flat')}
                  className={`relative p-4 rounded-xl border-2 text-left transition flex flex-col justify-between gap-3.5 island-stone-slab overflow-hidden cursor-pointer ${
                    selectedWorldType === 'flat'
                      ? 'border-sky-400 shadow-[0_0_24px_rgba(56,189,248,0.38)]'
                      : 'border-stone-600/85 hover:border-sky-400/75'
                  }`}
                >
                  <MossAccent className="pointer-events-none absolute top-0 right-0 w-24 h-5 opacity-80 -scale-x-100" />
                  <span className="relative z-10 block space-y-2.5 w-full">
                    <span className="flex items-start justify-between gap-2.5">
                      <span className="flex items-center gap-3 min-w-0">
                        <span className="w-11 h-11 rounded-full bg-sky-950/90 border-2 border-sky-400/85 shadow-[0_0_16px_rgba(56,189,248,0.45)] flex items-center justify-center text-sky-300 shrink-0">
                          <RollerCoaster className="w-5 h-5" />
                        </span>
                        <span className="block min-w-0">
                          <span className="block font-display text-lg font-extrabold text-stone-100 tracking-wide">
                            FLAT WORLD
                          </span>
                          <span className="block text-[11px] font-bold text-sky-300">
                            Creative Only — Survival Disabled
                          </span>
                        </span>
                      </span>
                      <span
                        className={`px-3 py-1.5 rounded-md text-[11px] font-extrabold uppercase tracking-wider whitespace-nowrap shrink-0 border ${
                          selectedWorldType === 'flat'
                            ? 'bg-sky-500 border-sky-300 text-stone-950 shadow-[0_0_12px_rgba(56,189,248,0.5)]'
                            : 'island-wood-plank border-amber-700/80 text-stone-100'
                        }`}
                      >
                        {selectedWorldType === 'flat' ? 'Selected' : 'Choose'}
                      </span>
                    </span>
                    <span className="block text-xs text-stone-200 leading-relaxed">
                      Massive level buildable park grounds (310m radius) with zero hunger, thirst, or wildlife threats. Ideal for enormous amusement parks, custom inversions, and Music Pro.
                    </span>
                  </span>
                  <span className="relative z-10 flex flex-wrap gap-1.5 text-[10px] font-semibold text-amber-100">
                    <span className="px-2.5 py-1 rounded island-wood-plank border border-amber-800/75">
                      No Survival Threats
                    </span>
                    <span className="px-2.5 py-1 rounded island-wood-plank border border-amber-800/75">
                      Roller Coasters &amp; Inversions
                    </span>
                    <span className="px-2.5 py-1 rounded island-wood-plank border border-amber-800/75">
                      Music Pro Pavilion
                    </span>
                  </span>
                </button>
              </div>

              {/* Step 2: Configure World & Launch (Appears once a World Type is chosen) */}
              {selectedWorldType && (
                <div
                  id="world-config-panel"
                  className="rounded-xl bg-stone-950/80 border border-stone-600/80 p-4 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <label
                        htmlFor="world-name-input"
                        className="block text-[11px] font-bold uppercase tracking-wider text-stone-200"
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
                        className="w-full min-h-[42px] px-3 rounded-lg bg-stone-900 border border-stone-600 focus:border-amber-400 focus:outline-none text-sm text-stone-100"
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
                          className={`p-3 rounded-lg border text-left transition cursor-pointer ${
                            selectedIslandMode === 'survival'
                              ? 'bg-amber-950/75 border-amber-400 text-stone-100'
                              : 'bg-stone-900/80 hover:bg-stone-900 border-stone-700 text-stone-300'
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
                          <p className="text-[11px] text-stone-300 leading-snug">
                            Hunger, thirst, fluid erosion &amp; 7-Day Blood Moon sieges.
                          </p>
                        </button>

                        <button
                          type="button"
                          data-game-mode="boss_hunt"
                          onClick={() => setSelectedIslandMode('boss_hunt')}
                          className={`p-3 rounded-lg border text-left transition cursor-pointer ${
                            selectedIslandMode === 'boss_hunt'
                              ? 'bg-red-950/75 border-red-400 text-stone-100'
                              : 'bg-stone-900/80 hover:bg-stone-900 border-stone-700 text-stone-300'
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
                          <p className="text-[11px] text-stone-300 leading-snug">
                            Track and defeat 4 colossal Titans across island biomes.
                          </p>
                        </button>

                        <button
                          type="button"
                          data-game-mode="sandbox"
                          onClick={() => setSelectedIslandMode('sandbox')}
                          className={`p-3 rounded-lg border text-left transition cursor-pointer ${
                            selectedIslandMode === 'sandbox'
                              ? 'bg-sky-950/75 border-sky-400 text-stone-100'
                              : 'bg-stone-900/80 hover:bg-stone-900 border-stone-700 text-stone-300'
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
                          <p className="text-[11px] text-stone-300 leading-snug">
                            Unlimited resources, flight &amp; island coaster construction.
                          </p>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div className="p-3 rounded-lg bg-sky-950/55 border border-sky-400/70 flex items-start gap-2.5">
                          <Zap className="w-4 h-4 text-sky-300 shrink-0 mt-0.5" />
                          <div>
                            <div className="text-xs font-bold text-sky-200 flex items-center gap-1.5">
                              <span>Creative Mode Active</span>
                              <span className="px-1.5 py-0.5 rounded bg-sky-500 text-stone-950 text-[9px] font-extrabold uppercase">
                                Only Mode
                              </span>
                            </div>
                            <p className="text-[11px] text-stone-200 mt-0.5">
                              Unlimited building tools, Roller Coaster Creator, custom inversions, and Music Pro enabled.
                            </p>
                          </div>
                        </div>

                        <div
                          aria-disabled="true"
                          className="p-3 rounded-lg bg-stone-900/80 border border-stone-700 opacity-75 flex items-start gap-2.5"
                        >
                          <ShieldOff className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                          <div>
                            <div className="text-xs font-bold text-stone-200 flex items-center gap-1.5">
                              <span>Survival Mode Disabled</span>
                              <Lock className="w-3 h-3 text-stone-400" />
                            </div>
                            <p className="text-[11px] text-stone-400 mt-0.5">
                              Hunger, thirst, wildlife threats, and survival progression are turned off in Flat World.
                            </p>
                          </div>
                        </div>
                      </div>

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
                            className={`p-3 rounded-lg border text-left flex items-center gap-3 transition cursor-pointer ${
                              flatSurfaceStyle === 'turf_grid'
                                ? 'bg-emerald-950/70 border-emerald-400 text-stone-100'
                                : 'bg-stone-900/80 hover:bg-stone-900 border-stone-700 text-stone-300'
                            }`}
                          >
                            <div className="w-9 h-9 rounded-lg bg-emerald-700/40 border border-emerald-400/50 flex items-center justify-center shrink-0">
                              <Grid className="w-4 h-4 text-emerald-300" />
                            </div>
                            <div>
                              <div className="text-xs font-bold">Sunlit Turf Grid</div>
                              <div className="text-[11px] text-stone-300">
                                Crisp level green lawn with 8m park alignment lines.
                              </div>
                            </div>
                          </button>

                          <button
                            type="button"
                            data-flat-surface="concrete_plaza"
                            onClick={() => setFlatSurfaceStyle('concrete_plaza')}
                            className={`p-3 rounded-lg border text-left flex items-center gap-3 transition cursor-pointer ${
                              flatSurfaceStyle === 'concrete_plaza'
                                ? 'bg-sky-950/70 border-sky-400 text-stone-100'
                                : 'bg-stone-900/80 hover:bg-stone-900 border-stone-700 text-stone-300'
                            }`}
                          >
                            <div className="w-9 h-9 rounded-lg bg-slate-600/40 border border-slate-400/50 flex items-center justify-center shrink-0">
                              <Layers className="w-4 h-4 text-slate-200" />
                            </div>
                            <div>
                              <div className="text-xs font-bold">Smooth Concrete Plaza</div>
                              <div className="text-[11px] text-stone-300">
                                Clean theme-park stone slab apron for giant coaster layouts.
                              </div>
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="text-[11px] text-stone-300 flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>
                        Creates a separate save slot — existing Island worlds are never overwritten.
                      </span>
                    </div>
                    <button
                      type="button"
                      data-start="true"
                      onClick={handleLaunch}
                      className={`min-h-[48px] px-6 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 shadow-xl whitespace-nowrap shrink-0 transition cursor-pointer ${
                        selectedWorldType === 'flat'
                          ? 'bg-sky-500 hover:bg-sky-400 text-stone-950'
                          : 'island-wood-plank-play border-2 border-emerald-400/90 text-stone-50'
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
              <div className="island-stone-slab rounded-2xl border border-stone-600/80 p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-stone-200">
                    Saved Worlds ({saveSlots.length}/12)
                  </div>
                  <div className="text-[11px] text-stone-300 flex items-center gap-1">
                    <Music className="w-3 h-3 text-amber-400" />
                    <span>Music Pro &amp; Coasters preserved per world</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-52 overflow-y-auto survival-scroll pr-1">
                  {saveSlots.map((slot) => (
                    <div
                      key={slot.slotId}
                      className="flex items-center justify-between gap-2.5 rounded-lg bg-stone-950/75 border border-stone-700/85 px-3 py-2.5"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {renderWorldBadge(slot.worldType)}
                          {renderModeBadge(slot.worldType, slot.gameMode)}
                        </div>
                        <div className="text-xs font-bold text-stone-100 truncate">
                          {slot.worldName || 'Saved World'}
                        </div>
                        <div className="text-[11px] text-stone-300 font-mono-tabular truncate">
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
                          className="min-h-[38px] px-3 rounded-lg island-wood-plank-play border border-emerald-400/80 text-stone-50 font-bold text-xs whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          Continue
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteSlot(slot.slotId)}
                          className="min-w-[38px] min-h-[38px] rounded-lg bg-stone-800 hover:bg-red-700 text-stone-200 flex items-center justify-center shrink-0 cursor-pointer"
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
        </div>
      </div>

      {/* Footer Controls */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-200 safe-bottom drop-shadow">
        <span>
          Desktop: WASD Move · Drag Look · C Crouch · E Act · P Place · B Craft · Space Jump
        </span>
        <span aria-hidden="true">·</span>
        <span>Mobile: Virtual Thumbstick &amp; Touch Camera</span>
      </div>
    </div>
  );
}
