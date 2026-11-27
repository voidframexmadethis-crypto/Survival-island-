'use client';

import React, { useState } from 'react';
import {
  Box,
  ChevronRight,
  Clock3,
  Compass,
  Download,
  Gamepad2,
  Grid,
  Layers,
  Lock,
  LogOut,
  MapPin,
  Moon,
  Music,
  Play,
  Plus,
  RollerCoaster,
  Settings,
  ShieldOff,
  Skull,
  Sparkles,
  Store,
  Sun,
  Trash2,
  Trees,
  Trophy,
  Upload,
  Users,
  X,
  Zap,
} from 'lucide-react';
import {
  DayNightMode,
  FlatSurfaceStyle,
  GameMode,
  PlayerGender,
  SaveSlotSummary,
  WorldType,
  resolveAllowedGameMode,
} from '@/game/types';
import { exportSaveTransfer, importSaveTransferFile } from '@/game/systems/saveTransfer';

interface WorldSelectionMenuProps {
  latestSave: SaveSlotSummary | null;
  saveSlots: SaveSlotSummary[];
  multiplayerRoomCode?: string | null;
  /** Rooms live inside a running world, so the fresh menu hides this entry. */
  multiplayerAvailable?: boolean;
  onContinueLatest: () => void;
  onLoadSlot: (slotId: string) => void;
  onDeleteSlot: (slotId: string) => void;
  onCreateWorld: (opts: {
    worldType: WorldType;
    worldName: string;
    gameMode: GameMode;
    flatSurfaceStyle?: FlatSurfaceStyle;
    playerGender?: PlayerGender;
    dayNightMode?: DayNightMode;
  }) => void;
  onImportIsland?: (file: File) => Promise<{ ok: boolean; message: string }>;
  onOpenMarketplaceUpload?: () => void;
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
  multiplayerAvailable = true,
  onContinueLatest,
  onLoadSlot,
  onDeleteSlot,
  onCreateWorld,
  onOpenMultiplayer,
  onOpenExchange,
  onImportIsland,
  onOpenMarketplaceUpload,
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
  const [playerGender, setPlayerGender] = useState<PlayerGender>('boy');
  const [worldNameInput, setWorldNameInput] = useState('');
  const [dayNightMode, setDayNightMode] = useState<DayNightMode>('cycle');
  const [islandSiteOpen, setIslandSiteOpen] = useState(false);
  const [islandSiteMessage, setIslandSiteMessage] = useState('');
  const [islandSiteBusy, setIslandSiteBusy] = useState(false);
  const [saveTransferMessage, setSaveTransferMessage] = useState('');
  const [saveTransferBusy, setSaveTransferBusy] = useState(false);

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
      playerGender,
      dayNightMode: selectedWorldType === 'island' ? dayNightMode : undefined,
    });
  };

  const handleExportAllSaves = async () => {
    setSaveTransferBusy(true);
    const result = await exportSaveTransfer();
    setSaveTransferMessage(result.message);
    setSaveTransferBusy(false);
  };

  const handleRestoreAllSaves = async (file: File | undefined) => {
    if (!file) return;
    if (
      !window.confirm(
        'Restore this backup into local storage? Existing worlds with the same save ids will be overwritten. Export a backup first if unsure.',
      )
    ) {
      return;
    }
    setSaveTransferBusy(true);
    const result = await importSaveTransferFile(file);
    setSaveTransferMessage(result.message);
    setSaveTransferBusy(false);
    if (result.ok) {
      window.setTimeout(() => window.location.reload(), 650);
    }
  };

  const handleIslandUpload = async (file: File | undefined) => {
    if (!file) return;
    if (!onImportIsland) {
      setIslandSiteMessage('Island importing is not available in this build.');
      return;
    }
    setIslandSiteBusy(true);
    setIslandSiteMessage('Reading island file…');
    try {
      const result = await onImportIsland(file);
      setIslandSiteMessage(result.message);
      if (result.ok) setIslandSiteOpen(false);
    } catch {
      setIslandSiteMessage('That file is not a valid Survival Island save.');
    } finally {
      setIslandSiteBusy(false);
    }
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
    <div className="menu-shell relative z-10 min-h-[100dvh] w-full overflow-x-clip bg-[linear-gradient(180deg,rgba(9,14,10,0.35)_0%,rgba(9,14,10,0.05)_38%,rgba(9,14,10,0.72)_100%)]">
      {/* Cinematic atmosphere layered over the live 3D island backdrop */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_50%_42%,transparent_30%,rgba(4,8,5,0.46)_100%)]" />
      <div className="pointer-events-none fixed inset-x-0 top-0 z-0 h-36 bg-gradient-to-b from-stone-950/85 via-stone-950/25 to-transparent" />
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-0 h-60 bg-gradient-to-t from-stone-950/92 via-stone-950/45 to-transparent" />

      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-7xl box-border flex-col gap-4 px-3 py-3 sm:gap-5 sm:px-5 sm:py-5 lg:px-8 lg:py-6">
        {/* Top Bar */}
        <div className="safe-top flex w-full flex-wrap items-center justify-between gap-2.5">
          <div className="max-w-full shrink-0 rounded-lg border border-stone-700/80 bg-stone-950/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300 shadow-md sm:text-xs">
            AdventureForgeGames
            <span className="hidden text-stone-400 sm:inline"> · World Selection</span>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:justify-end">
            {multiplayerAvailable && (
              <button
                type="button"
                onClick={onOpenMultiplayer}
                className="menu-top-action island-wood-plank flex min-h-[42px] min-w-0 items-center justify-center gap-1.5 rounded-lg border border-sky-400/45 px-2.5 text-[11px] font-semibold text-sky-200 sm:px-3.5 sm:text-xs"
              >
                <Users className="h-4 w-4 shrink-0 text-sky-300" />
                <span className="min-w-0 break-words text-left">
                  Multiplayer{multiplayerRoomCode ? ` (${multiplayerRoomCode})` : ''}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={onOpenExchange}
              className="menu-top-action island-wood-plank flex min-h-[42px] min-w-0 items-center justify-center gap-1.5 rounded-lg border border-amber-500/65 px-2.5 text-[11px] font-bold uppercase tracking-wide text-amber-200 sm:px-3.5 sm:text-xs"
            >
              <Store className="h-4 w-4 shrink-0 text-amber-400" />
              <span className="min-w-0 break-words text-left">
                <span className="sm:hidden">Exchange</span>
                <span className="hidden sm:inline">Survival Island Exchange</span>
              </span>
            </button>
            <button
              type="button"
              onClick={onOpenMods}
              className="menu-top-action island-wood-plank flex min-h-[42px] min-w-0 items-center justify-center gap-1.5 rounded-lg border border-emerald-400/50 px-2.5 text-[11px] font-semibold text-emerald-200 sm:px-3.5 sm:text-xs"
            >
              <Box className="h-4 w-4 shrink-0 text-emerald-300" />
              <span className="min-w-0 break-words text-left">Mods</span>
            </button>
            <button
              type="button"
              onClick={onOpenSettings}
              className="menu-top-action island-wood-plank flex min-h-[42px] min-w-0 items-center justify-center gap-1.5 rounded-lg border border-amber-700/60 px-2.5 text-[11px] font-semibold text-stone-100 sm:px-4 sm:text-xs"
            >
              <Settings className="h-4 w-4 shrink-0 text-stone-200" />
              <span className="min-w-0 break-words text-left">Settings</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 py-1 sm:gap-5">
          {/* Mossy Carved-Stone Header Monument */}
          <header className="island-stone-slab menu-3d-panel relative overflow-hidden rounded-3xl border border-stone-500/55 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <MossAccent className="pointer-events-none absolute top-0 left-0 w-36 h-7 opacity-90" />
          <MossAccent className="pointer-events-none absolute top-0 right-0 w-36 h-7 opacity-85 -scale-x-100" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-lime-900/60 via-emerald-800/40 to-lime-900/60" />

          <div className="relative z-10 flex flex-col justify-between gap-4 lg:flex-row lg:items-center lg:gap-6">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-[9px] font-bold uppercase tracking-[0.3em] text-emerald-300/95 sm:text-[10px]">
                <span className="h-px w-6 bg-emerald-400/70" aria-hidden="true" />
                <span>AdventureForgeGames Presents</span>
              </div>
              <h1 className="font-display font-black leading-[0.98] tracking-wide text-balance">
                <span className="island-stone-title block text-[clamp(1.75rem,5.2vw,3.35rem)]">
                  SURVIVAL ISLAND:
                </span>
                <span className="island-lostworld-title mt-0.5 block text-[clamp(1.45rem,4.2vw,2.85rem)] italic tracking-wider">
                  LOST WORLD
                </span>
              </h1>
              <p className="max-w-2xl text-xs leading-relaxed text-stone-200 drop-shadow sm:text-sm">
                Explore the prehistoric island in Survival, Boss Hunt, or Creative—or launch an expansive level Flat World park built for enormous roller coasters and Music Pro.
              </p>
              <div className="flex flex-wrap gap-1.5 pt-0.5 text-[10px] font-semibold uppercase tracking-wider text-stone-300">
                {['Survival', 'Boss Hunt', 'Creative', 'Flat World'].map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-stone-500/45 bg-stone-950/55 px-2.5 py-1"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex w-full min-w-0 flex-col gap-2.5 lg:w-[min(21rem,36%)] lg:shrink-0">
              {latestSave && (
                <button
                  type="button"
                  onClick={onContinueLatest}
                  className="menu-cta island-wood-plank-play flex min-h-[56px] w-full min-w-0 cursor-pointer items-center gap-3 rounded-xl border-2 border-emerald-400/80 px-4 py-3 text-sm font-bold text-stone-50"
                >
                  <Play className="h-5 w-5 shrink-0 fill-emerald-400 text-emerald-300" />
                  <span className="block min-w-0 flex-1 text-left">
                    <span className="block break-words leading-snug">
                      Continue: {latestSave.worldName || 'Saved World'}
                    </span>
                    <span className="block break-words text-[11px] font-semibold leading-snug text-emerald-200/95">
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
                className="island-wood-plank flex min-h-[56px] w-full min-w-0 cursor-pointer items-center gap-3 rounded-xl border border-amber-500/70 px-4 py-3 text-sm font-bold text-amber-200"
              >
                <Store className="h-5 w-5 shrink-0 text-amber-400" />
                <span className="block min-w-0 flex-1 text-left">
                  <span className="block break-words uppercase leading-tight tracking-wide">
                    SURVIVAL ISLAND EXCHANGE
                  </span>
                  <span className="block break-words text-[11px] font-medium leading-snug text-stone-300">
                    Gun Skins &amp; Tactical Backpack Skins · Cosmetic Only
                  </span>
                </span>
              </button>
              {onOpenMarketplaceUpload && (
                <button
                  type="button"
                  onClick={onOpenMarketplaceUpload}
                  className="island-wood-plank flex min-h-[56px] w-full min-w-0 cursor-pointer items-center gap-3 rounded-xl border border-emerald-500/70 px-4 py-3 text-sm font-bold text-emerald-200"
                >
                  <Upload className="h-5 w-5 shrink-0 text-emerald-300" />
                  <span className="block min-w-0 flex-1 text-left">
                    <span className="block break-words uppercase leading-tight tracking-wide">
                      MARKETPLACE UPLOAD
                    </span>
                    <span className="block break-words text-[11px] font-medium leading-snug text-stone-300">
                      Upload gun &amp; backpack skins · Phone or desktop
                    </span>
                  </span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setIslandSiteMessage('');
                  setIslandSiteOpen(true);
                }}
                className="island-wood-plank flex min-h-[56px] w-full min-w-0 cursor-pointer items-center gap-3 rounded-xl border border-emerald-500/70 px-4 py-3 text-sm font-bold text-emerald-200"
              >
                <Upload className="h-5 w-5 shrink-0 text-emerald-300" />
                <span className="block min-w-0 flex-1 text-left">
                  <span className="block break-words uppercase leading-tight tracking-wide">
                    ISLAND SITE
                  </span>
                  <span className="block break-words text-[11px] font-medium leading-snug text-stone-300">
                    Import &amp; upload your own custom islands
                  </span>
                </span>
              </button>
            </div>
          </div>
        </header>

          {/* Main 2-Column Expedition Layout: Left Weathered Wooden Plank Stack + Right World Modes */}
          <div className="grid w-full grid-cols-1 items-start gap-4 sm:gap-5 lg:grid-cols-[minmax(240px,280px)_minmax(0,1fr)]">
            {/* Left Column: Weathered Wooden Plank Menu Stack */}
            <nav
              aria-label="Main Menu"
              className="island-stone-slab menu-3d-panel flex w-full min-w-0 flex-col gap-2.5 rounded-3xl border border-stone-600/65 p-3 sm:p-3.5"
            >
              <div className="px-1.5 pb-0.5 text-[9px] font-bold uppercase tracking-[0.34em] text-stone-400">
                Expedition Command
              </div>
              <button
                type="button"
                onClick={handlePrimaryPlay}
                className="menu-primary-cta island-wood-plank-play group relative flex min-h-[78px] w-full min-w-0 cursor-pointer items-center gap-3.5 overflow-hidden rounded-xl border-2 border-emerald-400/80 px-3.5 py-3 text-left text-stone-50"
              >
                <span className="pointer-events-none absolute inset-0 z-0 opacity-70 [background:linear-gradient(100deg,transparent_18%,rgba(255,255,255,0.16)_42%,rgba(255,255,255,0.04)_54%,transparent_74%)]" />
                <span className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-emerald-300/70 bg-emerald-950/80 shadow-[0_0_20px_rgba(74,222,128,0.35)]">
                  <Play className="h-6 w-6 fill-emerald-400 text-emerald-300 drop-shadow" />
                </span>
                <span className="relative z-10 min-w-0 flex-1">
                  <span className="block font-display text-2xl font-black leading-none tracking-wider text-stone-50">
                    PLAY
                  </span>
                  <span className="mt-1.5 block break-words text-[11px] font-semibold leading-snug text-emerald-200/95">
                    {latestSave
                      ? `Resume ${latestSave.worldName || 'Expedition'}`
                      : 'Choose Island or Flat World'}
                  </span>
                </span>
                <ChevronRight className="relative z-10 h-5 w-5 shrink-0 text-emerald-300/80 transition-transform duration-200 group-hover:translate-x-0.5" />
              </button>

            <button
              type="button"
              onClick={onOpenSettings}
              className="menu-nav-row island-wood-plank flex min-h-[48px] w-full min-w-0 cursor-pointer items-center gap-3 rounded-xl border border-amber-800/70 px-4 py-2.5 text-left text-stone-100"
            >
              <Settings className="w-5 h-5 text-stone-300 shrink-0" />
              <span className="min-w-0 break-words font-display text-sm font-bold uppercase tracking-wider">
                SETTINGS
              </span>
            </button>

            <button
              type="button"
              onClick={onOpenControls}
              className="menu-nav-row island-wood-plank flex min-h-[48px] w-full min-w-0 cursor-pointer items-center gap-3 rounded-xl border border-amber-800/70 px-4 py-2.5 text-left text-stone-100"
            >
              <Gamepad2 className="w-5 h-5 text-stone-300 shrink-0" />
              <span className="min-w-0 break-words font-display text-sm font-bold uppercase tracking-wider">
                CONTROLS
              </span>
            </button>

            {onOpenMap && (
              <button
                type="button"
                onClick={onOpenMap}
                className="menu-nav-row island-wood-plank flex min-h-[48px] w-full min-w-0 cursor-pointer items-center gap-3 rounded-xl border border-amber-800/70 px-4 py-2.5 text-left text-stone-100"
              >
                <MapPin className="w-5 h-5 text-stone-300 shrink-0" />
                <span className="min-w-0 break-words font-display text-sm font-bold uppercase tracking-wider">
                  MAP
                </span>
              </button>
            )}

            {onOpenAchievements && (
              <button
                type="button"
                onClick={onOpenAchievements}
                className="menu-nav-row island-wood-plank flex min-h-[48px] w-full min-w-0 cursor-pointer items-center gap-3 rounded-xl border border-amber-800/70 px-4 py-2.5 text-left text-stone-100"
              >
                <Trophy className="w-5 h-5 text-amber-300 shrink-0" />
                <span className="min-w-0 break-words font-display text-sm font-bold uppercase tracking-wider">
                  ACHIEVEMENTS
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={onQuit}
              className="menu-nav-row island-wood-plank flex min-h-[48px] w-full min-w-0 cursor-pointer items-center gap-3 rounded-xl border border-stone-700/75 px-4 py-2.5 text-left text-stone-200"
            >
              <LogOut className="w-5 h-5 text-stone-300 shrink-0" />
              <span className="min-w-0 break-words font-display text-sm font-bold uppercase tracking-wider">
                QUIT
              </span>
            </button>
          </nav>

          {/* Right Column: World-Mode Carved Stone Cards, Step 2 Config & Saved Worlds */}
          <div className="flex w-full min-w-0 flex-col gap-4">
            {/* Create New World Section */}
            <div className="island-stone-slab menu-3d-panel relative w-full min-w-0 space-y-4 overflow-hidden rounded-3xl border border-stone-600/65 p-4 sm:p-5">
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
                  <span className="max-w-full break-words rounded-md border border-amber-700/70 px-3 py-1 text-left text-[11px] font-semibold text-stone-100 island-wood-plank">
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
                  className={`island-stone-slab relative flex min-w-0 cursor-pointer flex-col justify-between gap-3.5 overflow-hidden rounded-2xl border-2 p-4 text-left transition sm:p-5 ${
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
                  className={`island-stone-slab relative flex min-w-0 cursor-pointer flex-col justify-between gap-3.5 overflow-hidden rounded-2xl border-2 p-4 text-left transition sm:p-5 ${
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

                    <div className="w-full space-y-1.5 sm:w-auto sm:shrink-0">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                        Survivor Character
                      </div>
                      <div className="grid w-full grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setPlayerGender('boy')}
                          className={`min-h-[42px] px-4 rounded-lg border text-xs font-bold transition cursor-pointer ${
                            playerGender === 'boy'
                              ? 'bg-sky-950/85 border-sky-400 text-sky-100'
                              : 'bg-stone-900/80 hover:bg-stone-900 border-stone-700 text-stone-300'
                          }`}
                        >
                          Boy Survivor
                        </button>
                        <button
                          type="button"
                          onClick={() => setPlayerGender('girl')}
                          className={`min-h-[42px] px-4 rounded-lg border text-xs font-bold transition cursor-pointer ${
                            playerGender === 'girl'
                              ? 'bg-rose-950/85 border-rose-400 text-rose-100'
                              : 'bg-stone-900/80 hover:bg-stone-900 border-stone-700 text-stone-300'
                          }`}
                        >
                          Girl Survivor
                        </button>
                      </div>
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

                  {selectedWorldType !== 'flat' && (
                    <div className="space-y-2 rounded-xl border border-stone-700/70 bg-stone-900/55 p-3">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                        <Clock3 className="h-3.5 w-3.5" />
                        <span>Island Daylight</span>
                      </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <button
                        type="button"
                        onClick={() => setDayNightMode('day')}
                        className={`flex min-h-[48px] items-center gap-2 rounded-lg border px-3 text-left transition cursor-pointer ${
                          dayNightMode === 'day'
                            ? 'border-amber-300 bg-amber-500/20 text-amber-100'
                            : 'border-stone-700 bg-stone-950/60 text-stone-300 hover:border-amber-500/60'
                        }`}
                      >
                        <Sun className="h-4 w-4 shrink-0 text-amber-300" />
                        <span className="text-xs font-bold">Permanent Day</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDayNightMode('cycle')}
                        className={`flex min-h-[48px] items-center gap-2 rounded-lg border px-3 text-left transition cursor-pointer ${
                          dayNightMode === 'cycle'
                            ? 'border-emerald-300 bg-emerald-500/20 text-emerald-100'
                            : 'border-stone-700 bg-stone-950/60 text-stone-300 hover:border-emerald-500/60'
                        }`}
                      >
                        <Clock3 className="h-4 w-4 shrink-0 text-emerald-300" />
                        <span className="text-xs font-bold">Normal Day/Night Cycle</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDayNightMode('night')}
                        className={`flex min-h-[48px] items-center gap-2 rounded-lg border px-3 text-left transition cursor-pointer ${
                          dayNightMode === 'night'
                            ? 'border-sky-300 bg-sky-500/20 text-sky-100'
                            : 'border-stone-700 bg-stone-950/60 text-stone-300 hover:border-sky-500/60'
                        }`}
                      >
                        <Moon className="h-4 w-4 shrink-0 text-sky-300" />
                        <span className="text-xs font-bold">Permanent Night</span>
                      </button>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col items-stretch justify-between gap-3 border-t border-stone-700/50 pt-3 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 items-start gap-2 text-[11px] leading-relaxed text-stone-300">
                      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                      <span className="min-w-0 break-words">
                        Creates a separate save slot — existing Island worlds are never overwritten.
                      </span>
                    </div>
                    <button
                      type="button"
                      data-start="true"
                      onClick={handleLaunch}
                      className={`menu-cta flex min-h-[48px] w-full min-w-0 cursor-pointer items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold shadow-xl transition sm:w-auto sm:shrink-0 ${
                        selectedWorldType === 'flat'
                          ? 'bg-sky-500 text-stone-950 hover:bg-sky-400'
                          : 'island-wood-plank-play border-2 border-emerald-400/90 text-stone-50'
                      }`}
                    >
                      <Play className="h-4 w-4 shrink-0" />
                      <span className="min-w-0 break-words text-center">
                        {selectedWorldType === 'flat'
                          ? 'Create & Enter Flat Park'
                          : 'Create & Enter Island World'}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {selectedWorldType && effectiveMode === 'sandbox' && (
                <a
                  href="/coaster-studio"
                  target="_blank"
                  rel="noopener noreferrer"
                  data-coaster-studio="true"
                  className="group mt-3 flex min-w-0 flex-col gap-3 rounded-2xl border-2 border-amber-400/55 bg-gradient-to-br from-stone-900 via-stone-950 to-sky-950/80 p-3.5 transition hover:border-amber-300 hover:shadow-[0_0_32px_rgba(251,191,36,0.16)] sm:flex-row sm:items-center sm:p-4"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-amber-300/40 bg-amber-400/10">
                    <RollerCoaster className="h-6 w-6 text-amber-300" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-sm font-black tracking-wide text-stone-50">
                        ULTIMATE COASTER STUDIO
                      </span>
                      <span className="rounded bg-amber-400 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-stone-950">
                        Standalone
                      </span>
                    </span>
                    <span className="mt-1 block text-[11px] leading-snug text-stone-300">
                      A separate flat, empty creative world for manual spline track building, working mechanical systems,
                      the manufacturer catalog, 3D train customization and ride physics. Every coaster is built from
                      scratch. Never touches island saves.
                    </span>
                    <span className="mt-1.5 flex flex-wrap gap-1.5 text-[9px] font-bold uppercase tracking-wider text-sky-200/90">
                      <span className="rounded border border-sky-400/30 bg-sky-400/10 px-1.5 py-0.5">Manual-only builds</span>
                      <span className="rounded border border-sky-400/30 bg-sky-400/10 px-1.5 py-0.5">Manufacturer catalog</span>
                      <span className="rounded border border-sky-400/30 bg-sky-400/10 px-1.5 py-0.5">Train designer</span>
                      <span className="rounded border border-sky-400/30 bg-sky-400/10 px-1.5 py-0.5">Ride simulation</span>
                    </span>
                  </span>
                  <span className="flex min-h-[40px] shrink-0 items-center justify-center gap-1.5 rounded-xl border border-amber-300/50 bg-amber-400/15 px-3 py-2 text-[11px] font-black text-amber-100 transition group-hover:bg-amber-400 group-hover:text-stone-950">
                    Open studio
                    <ChevronRight className="h-4 w-4" />
                  </span>
                </a>
              )}
            </div>

            {/* Saved Worlds List */}
            {saveSlots.length > 0 && (
              <div className="island-stone-slab menu-3d-panel w-full min-w-0 space-y-2.5 rounded-3xl border border-stone-600/65 p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <div className="text-xs font-bold uppercase tracking-wider text-stone-200">
                    Saved Worlds ({saveSlots.length}/12)
                  </div>
                  <div className="flex min-w-0 items-center gap-1 text-[11px] text-stone-300">
                    <Music className="h-3 w-3 shrink-0 text-amber-400" />
                    <span className="min-w-0 break-words">Music Pro &amp; Coasters preserved per world</span>
                  </div>
                </div>
                <div className="survival-scroll grid max-h-[min(22rem,44dvh)] grid-cols-1 gap-2 overflow-y-auto pr-1 md:grid-cols-2">
                  {saveSlots.map((slot) => (
                    <div
                      key={slot.slotId}
                      className="flex min-w-0 flex-wrap items-center justify-between gap-2.5 rounded-xl border border-stone-700/85 bg-stone-950/75 px-3 py-2.5 sm:flex-nowrap"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {renderWorldBadge(slot.worldType)}
                          {renderModeBadge(slot.worldType, slot.gameMode)}
                        </div>
                        <div className="break-words text-xs font-bold text-stone-100">
                          {slot.worldName || 'Saved World'}
                        </div>
                        <div className="break-words font-mono-tabular text-[11px] text-stone-300">
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

            <div className="island-stone-slab w-full min-w-0 space-y-2.5 rounded-3xl border border-sky-500/45 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <div className="text-xs font-bold uppercase tracking-wider text-stone-200">
                  Save Transfer
                </div>
                <div className="text-[11px] text-stone-300">
                  Backup all worlds and settings
                </div>
              </div>
              <p className="text-[11px] leading-relaxed text-stone-300">
                Export a JSON backup, then restore it on another device. The existing save schema,
                world slots, and settings are preserved. Authentication tokens are never exported.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={saveTransferBusy}
                  onClick={() => void handleExportAllSaves()}
                  className="inline-flex min-h-[38px] items-center gap-2 rounded-lg border border-sky-400/70 bg-sky-950/60 px-3 text-xs font-bold text-sky-100 transition hover:bg-sky-800/70 disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  Export backup
                </button>
                <label
                  className={`inline-flex min-h-[38px] cursor-pointer items-center gap-2 rounded-lg border border-emerald-400/70 bg-emerald-950/60 px-3 text-xs font-bold text-emerald-100 transition hover:bg-emerald-800/70 ${
                    saveTransferBusy ? 'pointer-events-none opacity-50' : ''
                  }`}
                >
                  <Upload className="h-4 w-4" />
                  Restore backup
                  <input
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    disabled={saveTransferBusy}
                    onChange={(event) => {
                      void handleRestoreAllSaves(event.target.files?.[0]);
                      event.currentTarget.value = '';
                    }}
                  />
                </label>
              </div>
              {saveTransferMessage ? (
                <div className="text-[11px] font-semibold text-sky-200">{saveTransferMessage}</div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

        {/* Footer Controls */}
        <div className="safe-bottom flex w-full max-w-full flex-wrap items-center gap-x-3 gap-y-1 text-[11px] leading-relaxed text-stone-300 drop-shadow sm:text-xs">
          <span className="min-w-0 break-words">
            Desktop: WASD Move · Drag Look · C Crouch · E Act · P Place · B Craft · Space Jump
          </span>
          <span aria-hidden="true" className="hidden sm:inline">·</span>
          <span className="min-w-0 break-words">Mobile: Virtual Thumbstick &amp; Touch Camera</span>
        </div>
      </div>

      {islandSiteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <div className="island-stone-slab relative w-full max-w-lg rounded-3xl border border-emerald-500/60 bg-stone-950 p-5 shadow-2xl sm:p-6">
            <button
              type="button"
              onClick={() => setIslandSiteOpen(false)}
              className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-xl border border-stone-700 bg-stone-900 text-stone-300 hover:bg-stone-800"
              aria-label="Close Island Site"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3 pr-12">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-400/50 bg-emerald-500/10 text-emerald-300">
                <Upload className="h-5 w-5" />
              </span>
              <div>
                <div className="font-display text-xl font-black tracking-wide text-stone-50">
                  ISLAND SITE
                </div>
                <div className="text-[11px] text-stone-300">
                  Import and upload your own custom islands
                </div>
              </div>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-stone-300">
              Upload a Survival Island save file exported from the game. The
              island becomes a new save slot, so your existing worlds are never
              overwritten. Custom structures, vehicles, progress and daylight
              settings travel with it.
            </p>

            <label className="mt-4 flex min-h-[88px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-emerald-500/50 bg-emerald-950/20 px-4 py-5 text-center transition hover:border-emerald-300 hover:bg-emerald-950/35">
              <Upload className="h-6 w-6 text-emerald-300" />
              <span className="text-sm font-bold text-emerald-100">
                Choose an island file
              </span>
              <span className="text-[10.5px] text-stone-400">
                .json Survival Island save · imported as a new slot
              </span>
              <input
                type="file"
                accept=".json,application/json"
                className="hidden"
                disabled={islandSiteBusy}
                onChange={(event) => {
                  void handleIslandUpload(event.target.files?.[0]);
                  event.currentTarget.value = '';
                }}
              />
            </label>

            {islandSiteMessage ? (
              <div className="mt-3 rounded-lg border border-stone-700 bg-stone-900/80 px-3 py-2 text-[11px] leading-snug text-stone-200">
                {islandSiteMessage}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
