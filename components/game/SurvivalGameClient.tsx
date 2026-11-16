'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Axe,
  Backpack,
  Cloud,
  CloudLightning,
  CloudRain,
  Compass,
  Crosshair,
  Droplets,
  Eye,
  FastForward,
  Flame,
  Hammer,
  Hand,
  Heart,
  Map as MapIcon,
  Moon,
  PackageOpen,
  PackagePlus,
  Pause,
  Pickaxe,
  Play,
  RotateCcw,
  Settings,
  Shield,
  Sun,
  Thermometer,
  Trophy,
  Utensils,
  Zap,
} from 'lucide-react';
import { ITEMS } from '@/game/data/items';
import { STAGE_1_MISSIONS } from '@/game/data/missions';
import { GameEngine } from '@/game/engine/GameEngine';
import {
  DEFAULT_SETTINGS,
  deleteSaveSlot,
  getLatestSaveSlot,
  listSaveSlots,
  loadGameFromSlot,
  loadSettings,
  saveGameToSlot,
  saveSettings,
} from '@/game/systems/saveManager';
import {
  ActiveModal,
  GameSettings,
  HUDStateSnapshot,
  ItemId,
  ResourceToast,
  SaveSlotSummary,
} from '@/game/types';
import { CookingModal } from './CookingModal';
import { CraftingModal } from './CraftingModal';
import { InventoryModal } from './InventoryModal';
import { IslandMapModal } from './IslandMapModal';
import { ItemIcon } from './ItemIcon';
import {
  MissionsModal,
  PauseModal,
  SettingsModal,
} from './MissionsAndPauseModals';
import { PlaceModal } from './PlaceModal';
import { TouchControls } from './TouchControls';

function formatTimePhase(t: number): string {
  if (t < 0.2 || t >= 0.84) return 'Night';
  if (t < 0.31) return 'Dawn';
  if (t < 0.44) return 'Morning';
  if (t < 0.62) return 'Midday';
  if (t < 0.74) return 'Golden Hour';
  return 'Dusk';
}

export function SurvivalGameClient() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const lookPointerId = useRef<number | null>(null);
  const lastLookPos = useRef({ x: 0, y: 0 });
  const pointerDownPos = useRef({ x: 0, y: 0 });
  const pointerDownTime = useRef(0);

  const [screen, setScreen] = useState<'menu' | 'playing'>('menu');
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [activeStationStructureId, setActiveStationStructureId] = useState<
    string | undefined
  >(undefined);
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [saveSlots, setSaveSlots] = useState<SaveSlotSummary[]>([]);
  const [latestSave, setLatestSave] = useState<SaveSlotSummary | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [hud, setHud] = useState<HUDStateSnapshot | null>(null);
  const [toasts, setToasts] = useState<ResourceToast[]>([]);

  const refreshSaves = useCallback(() => {
    setSaveSlots(listSaveSlots());
    setLatestSave(getLatestSaveSlot());
  }, []);

  const pushToast = useCallback((toast: ResourceToast) => {
    setToasts((prev) => [...prev.slice(-3), toast]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toast.id));
    }, 2800);
  }, []);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      setSettings(loadSettings());
      refreshSaves();
      const hasTouch =
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        window.matchMedia('(pointer: coarse)').matches;
      setIsTouchDevice(hasTouch);
    });
    return () => window.cancelAnimationFrame(id);
  }, [refreshSaves]);

  // Mount Three.js GameEngine once in isolated ref container
  useEffect(() => {
    const mountEl = canvasMountRef.current;
    if (!mountEl) return;

    const initialSettings = loadSettings();
    const engine = new GameEngine(mountEl, initialSettings, {
      onHudUpdate: (snapshot) => {
        setHud(snapshot);
      },
      onToast: pushToast,
      onOpenStation: (station, structureId) => {
        setActiveStationStructureId(structureId);
        setActiveModal(station);
        engine.setMode('paused');
      },
    });
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [pushToast]);

  // Keep engine mode strictly synchronized with active screen & modal state
  useEffect(() => {
    if (!engineRef.current) return;
    if (screen !== 'playing') {
      lookPointerId.current = null;
      engineRef.current.setMode('menu');
    } else if (activeModal) {
      lookPointerId.current = null;
      engineRef.current.setMode('paused');
    } else {
      engineRef.current.setMode('playing');
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }
  }, [screen, activeModal]);

  // Keyboard shortcuts for UI modals (I/Tab, B, M, J, Escape)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (screen !== 'playing') return;
      if (e.code === 'Escape') {
        if (activeModal) {
          setActiveModal(null);
          engineRef.current?.setMode('playing');
        } else {
          setActiveModal('pause');
          engineRef.current?.setMode('paused');
        }
      } else if (!activeModal) {
        if (e.code === 'KeyI' || e.code === 'Tab') {
          e.preventDefault();
          setActiveModal('inventory');
          engineRef.current?.setMode('paused');
        } else if (e.code === 'KeyB') {
          setActiveStationStructureId(undefined);
          setActiveModal('crafting');
          engineRef.current?.setMode('paused');
        } else if (e.code === 'KeyP') {
          setActiveModal('place');
          engineRef.current?.setMode('paused');
        } else if (e.code === 'KeyM') {
          setActiveModal('map');
          engineRef.current?.setMode('paused');
        } else if (e.code === 'KeyJ') {
          setActiveModal('missions');
          engineRef.current?.setMode('paused');
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screen, activeModal]);

  // Periodic Autosave during active play
  useEffect(() => {
    if (screen !== 'playing') return;
    const id = window.setInterval(() => {
      if (engineRef.current) {
        saveGameToSlot(engineRef.current.exportSaveData('slot_1'));
        refreshSaves();
      }
    }, 35000);
    return () => window.clearInterval(id);
  }, [screen, refreshSaves]);

  const handleStartNewGame = () => {
    if (!engineRef.current) return;
    engineRef.current.unlockAudio();
    engineRef.current.startNewWorldState('slot_1', true);
    engineRef.current.ensurePlayerHasGun();
    engineRef.current.setMode('playing');
    setActiveModal(null);
    setScreen('playing');
  };

  const handleContinueGame = (slotId?: string) => {
    if (!engineRef.current) return;
    const targetId = slotId || latestSave?.slotId;
    if (!targetId) return;
    const data = loadGameFromSlot(targetId);
    if (!data) return;
    engineRef.current.unlockAudio();
    engineRef.current.loadFromSave(data);
    engineRef.current.ensurePlayerHasGun();
    if (data.hudPreferences) {
      const merged: GameSettings = {
        ...settings,
        showCompass: data.hudPreferences.showCompass,
        compactHud: data.hudPreferences.compactHud,
      };
      setSettings(merged);
      saveSettings(merged);
      engineRef.current.updateSettings(merged);
    }
    engineRef.current.setMode('playing');
    setActiveModal(null);
    setScreen('playing');
    pushToast({
      id: 'loaded',
      text: `Loaded Day ${data.dayCount} Expedition`,
      tone: 'info',
    });
  };

  const handleSaveNow = (slotId = 'slot_1') => {
    if (!engineRef.current) return;
    const ok = saveGameToSlot(engineRef.current.exportSaveData(slotId));
    refreshSaves();
    pushToast({
      id: 'saved_' + Date.now(),
      text: ok ? 'Expedition progress saved' : 'Could not save to storage',
      tone: ok ? 'craft' : 'warning',
    });
  };

  const handleSettingsChange = (next: GameSettings) => {
    setSettings(next);
    saveSettings(next);
    engineRef.current?.updateSettings(next);
  };

  const openModal = (modal: ActiveModal, structureId?: string) => {
    setActiveStationStructureId(structureId);
    setActiveModal(modal);
    engineRef.current?.setMode('paused');
  };

  const closeModal = () => {
    setActiveModal(null);
    setActiveStationStructureId(undefined);
    if (screen === 'playing') {
      engineRef.current?.setMode('playing');
    }
  };

  const showTouchControls =
    screen === 'playing' &&
    !activeModal &&
    !hud?.gameOver &&
    !hud?.cinematicActive &&
    (settings.touchControlsMode === 'always' ||
      (settings.touchControlsMode === 'auto' && isTouchDevice));

  const nearCraftingTable = useMemo(() => {
    if (!hud) return false;
    return hud.structures.some(
      (s) =>
        s.type === 'crafting_table' &&
        Math.hypot(s.x - hud.playerX, s.z - hud.playerZ) < 6.5,
    );
  }, [hud]);

  const nearCookingStation = useMemo(() => {
    if (!hud) return false;
    return hud.structures.some(
      (s) =>
        s.type === 'cooking_station' &&
        Math.hypot(s.x - hud.playerX, s.z - hud.playerZ) < 6.5,
    );
  }, [hud]);

  const currentMissionInfo = useMemo(() => {
    if (!hud) return null;
    const mission =
      STAGE_1_MISSIONS.find((m) => !hud.completedMissionIds.includes(m.id)) ||
      null;
    if (!mission) return null;
    const ctx = {
      inventory: hud.inventory,
      structures: hud.structures,
      stats: hud.stats,
      visitedBiomes: hud.visitedBiomes,
    };
    const progress = mission.checkProgress(ctx);
    const nextStep = mission.steps?.find((s) => !s.done(ctx))?.label;
    return { mission, progress, nextStep };
  }, [hud]);

  const countOf = (id: ItemId) =>
    hud?.inventory
      .filter((s) => s.itemId === id)
      .reduce((acc, s) => acc + s.quantity, 0) || 0;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-stone-950 select-none">
      {/* Isolated WebGL Canvas Mount — Unified Finger Touch & Mouse Camera Look */}
      <div
        ref={canvasMountRef}
        className="absolute inset-0 w-full h-full touch-surface touch-none"
        onPointerDown={(e) => {
          if (screen === 'playing' && !activeModal && !hud?.cinematicActive) {
            if (document.activeElement instanceof HTMLElement) {
              document.activeElement.blur();
            }
            if (lookPointerId.current === null) {
              lookPointerId.current = e.pointerId;
              lastLookPos.current = { x: e.clientX, y: e.clientY };
              pointerDownPos.current = { x: e.clientX, y: e.clientY };
              pointerDownTime.current = Date.now();
              try {
                e.currentTarget.setPointerCapture(e.pointerId);
              } catch {
                // Ignore if synthetic event cannot capture
              }
            }
          }
        }}
        onPointerMove={(e) => {
          if (
            lookPointerId.current === e.pointerId &&
            screen === 'playing' &&
            !activeModal
          ) {
            const dx = e.clientX - lastLookPos.current.x;
            const dy = e.clientY - lastLookPos.current.y;
            lastLookPos.current = { x: e.clientX, y: e.clientY };
            engineRef.current?.addCameraLookDelta(
              dx,
              dy,
              e.pointerType === 'touch',
            );
          }
        }}
        onPointerUp={(e) => {
          if (lookPointerId.current === e.pointerId) {
            lookPointerId.current = null;
            const dist = Math.hypot(
              e.clientX - pointerDownPos.current.x,
              e.clientY - pointerDownPos.current.y,
            );
            const duration = Date.now() - pointerDownTime.current;
            if (
              dist < 8 &&
              duration < 320 &&
              screen === 'playing' &&
              !activeModal &&
              !hud?.cinematicActive
            ) {
              engineRef.current?.triggerPrimaryAction();
            }
          }
        }}
        onPointerCancel={(e) => {
          if (lookPointerId.current === e.pointerId) {
            lookPointerId.current = null;
          }
        }}
        onLostPointerCapture={() => {
          lookPointerId.current = null;
        }}
      />

      {/* MAIN MENU OVERLAY */}
      {screen === 'menu' && (
        <div className="relative z-10 w-full h-full flex flex-col justify-between p-5 sm:p-10 bg-gradient-to-t from-stone-950/90 via-stone-950/35 to-stone-950/65">
          <div className="flex items-center justify-between safe-top">
            <div className="text-xs font-semibold tracking-wider text-amber-300 uppercase">
              AdventureForgeGames · Stage 1
            </div>
            <button
              onClick={() => setActiveModal('settings')}
              className="min-h-[44px] px-4 rounded-xl bg-stone-900/90 hover:bg-stone-800 border border-stone-700 text-stone-100 text-xs font-semibold flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
          </div>

          <div className="max-w-xl space-y-6 my-auto">
            <div className="space-y-3">
              <h1 className="font-display text-4xl sm:text-6xl font-bold tracking-tight text-stone-50 leading-[1.05] text-balance drop-shadow-lg">
                SURVIVAL ISLAND: LOST WORLD
              </h1>
              <p className="text-sm sm:text-base text-stone-200 max-w-lg leading-relaxed">
                Stranded across uncharted prehistoric shores. Gather timber and
                ore, craft primitive weapons, roast hunted meals, and outlast
                roaming dinosaurs.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              {latestSave && (
                <button
                  onClick={() => handleContinueGame(latestSave.slotId)}
                  className="min-h-[54px] px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-sm flex items-center justify-center gap-2.5 shadow-xl whitespace-nowrap shrink-0"
                >
                  <Play className="w-5 h-5" />
                  <span>
                    Continue (Day {latestSave.dayCount} · HP {latestSave.health})
                  </span>
                </button>
              )}

              <button
                onClick={handleStartNewGame}
                className={`min-h-[54px] px-6 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 shadow-xl whitespace-nowrap shrink-0 ${
                  latestSave
                    ? 'bg-stone-900/95 hover:bg-stone-800 border border-stone-600 text-stone-100'
                    : 'bg-amber-600 hover:bg-amber-500 text-stone-950'
                }`}
              >
                <Compass className="w-5 h-5" />
                <span>New Game</span>
              </button>
            </div>

            {saveSlots.length > 0 && (
              <div className="rounded-xl bg-stone-950/85 border border-stone-800 p-4 max-w-md space-y-2">
                <div className="text-xs font-semibold text-stone-400">
                  Saved Expeditions
                </div>
                {saveSlots.slice(0, 3).map((slot) => (
                  <div
                    key={slot.slotId}
                    className="flex items-center justify-between gap-2 text-xs py-1.5 border-t border-stone-800/80 first:border-t-0"
                  >
                    <div className="text-stone-200 font-mono-tabular">
                      Day {slot.dayCount} · {slot.structuresCount} camp structures
                    </div>
                    <button
                      onClick={() => handleContinueGame(slot.slotId)}
                      className="min-h-[36px] px-3 rounded-lg bg-stone-800 hover:bg-amber-600 hover:text-stone-950 font-semibold text-stone-100"
                    >
                      Load
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-300 safe-bottom">
            <span>
              Desktop: WASD Move · Drag Look · C Crouch · E Act · B Craft · Space Jump
            </span>
            <span aria-hidden="true">·</span>
            <span>Mobile: Virtual Thumbstick &amp; Touch Camera</span>
          </div>
        </div>
      )}

      {/* SHIPWRECK INTRO CINEMATIC OVERLAY */}
      {screen === 'playing' && hud?.cinematicActive && (
        <div className="pointer-events-none fixed inset-0 z-30 flex flex-col justify-between p-5 sm:p-8 safe-top safe-bottom bg-gradient-to-t from-black/70 via-transparent to-black/45">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold tracking-wider uppercase text-amber-300">
              Survival Island: Lost World
            </div>
            <button
              onClick={() => engineRef.current?.skipCinematic()}
              className="pointer-events-auto min-h-[44px] px-4 py-2 rounded-xl bg-stone-950/90 hover:bg-stone-800 border border-stone-600 text-stone-100 text-xs font-semibold flex items-center gap-2"
            >
              <span>Skip Cinematic</span>
              <FastForward className="w-4 h-4 text-amber-400" />
            </button>
          </div>

          <div className="max-w-2xl mx-auto text-center pb-4">
            <div className="inline-block rounded-xl bg-stone-950/85 border border-stone-700/80 px-5 py-3 text-sm sm:text-base font-medium text-stone-100 shadow-2xl">
              {hud.cinematicSubtitle}
            </div>
          </div>
        </div>
      )}

      {/* IN-GAME FIRST-PERSON HUD */}
      {screen === 'playing' && hud && !hud.cinematicActive && (
        <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-3 sm:p-4 safe-top safe-bottom">
          {/* Subtle First-Person Aim Reticle */}
          {!activeModal && !hud.gameOver && (
            <div className="fixed inset-0 pointer-events-none flex items-center justify-center">
              <div
                className={`w-1.5 h-1.5 rounded-full border border-black/60 ${
                  hud.nearbyInteraction ? 'bg-amber-400 scale-125' : 'bg-white/75'
                }`}
              />
            </div>
          )}

          {/* Top Row: Vitals (Left), Active Objective (Center), Menu Buttons (Right) */}
          <div className="flex items-start justify-between gap-2">
            {/* Survival Status Panel */}
            <div className="pointer-events-auto rounded-xl bg-stone-950/85 border border-stone-700/70 p-2.5 sm:p-3 w-48 sm:w-60 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-stone-300 pb-1 border-b border-stone-800">
                <span className="font-semibold text-amber-300 truncate">
                  {hud.biomeName}
                </span>
                <span className="font-mono-tabular shrink-0 flex items-center gap-1">
                  {hud.weather === 'storm' ? (
                    <CloudLightning className="w-3 h-3 text-amber-300" />
                  ) : hud.weather === 'rain' ? (
                    <CloudRain className="w-3 h-3 text-sky-300" />
                  ) : hud.weather === 'overcast' ? (
                    <Cloud className="w-3 h-3 text-stone-300" />
                  ) : hud.isNight ? (
                    <Moon className="w-3 h-3 text-indigo-300" />
                  ) : (
                    <Sun className="w-3 h-3 text-amber-400" />
                  )}
                  D{hud.dayCount} · {formatTimePhase(hud.timeOfDay)}
                </span>
              </div>

              <VitalBar
                icon={<Heart className="w-3.5 h-3.5 text-red-400" />}
                label="Health"
                value={hud.vitals.health}
                barColor="bg-red-500"
              />
              <VitalBar
                icon={<Utensils className="w-3.5 h-3.5 text-amber-400" />}
                label="Hunger"
                value={hud.vitals.hunger}
                barColor="bg-amber-500"
              />
              <VitalBar
                icon={<Droplets className="w-3.5 h-3.5 text-sky-400" />}
                label="Thirst"
                value={hud.vitals.thirst}
                barColor="bg-sky-500"
              />
              <VitalBar
                icon={<Zap className="w-3.5 h-3.5 text-lime-400" />}
                label="Stamina"
                value={hud.vitals.stamina}
                barColor="bg-lime-500"
              />

              {/* Body Temperature, Visibility & Resource Summary */}
              <div className="pt-1 border-t border-stone-800 space-y-1 text-[11px] font-mono-tabular text-stone-300">
                <div className="flex items-center justify-between">
                  <span
                    className={`flex items-center gap-1 ${
                      hud.vitals.temperatureC < 34.5
                        ? 'text-sky-300'
                        : hud.nearFire
                          ? 'text-orange-300'
                          : 'text-stone-200'
                    }`}
                  >
                    <Thermometer className="w-3 h-3" />
                    {hud.vitals.temperatureC.toFixed(1)}°C
                  </span>
                  <span
                    className={`flex items-center gap-1 ${
                      hud.visibilityPercent <= 38
                        ? 'text-emerald-300'
                        : hud.visibilityPercent >= 78
                          ? 'text-amber-300'
                          : 'text-stone-300'
                    }`}
                    title="Player Visibility (Day/Night, Campfire, Crouch, Weather)"
                  >
                    <Eye className="w-3 h-3" />
                    Vis {hud.visibilityPercent}%
                  </span>
                </div>
                {!settings.compactHud && (
                  <div className="flex items-center justify-between text-stone-400">
                    <span>W:{countOf('wood')}</span>
                    <span>S:{countOf('stone')}</span>
                    <span>F:{countOf('flint')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Top-Center Horizontal Compass & Active Mission Hint */}
            <div className="flex flex-col items-center gap-1.5 max-w-sm">
              {settings.showCompass !== false && (
                <CompassStrip playerYaw={hud.playerYaw} />
              )}
              {currentMissionInfo && !settings.compactHud && (
                <button
                  onClick={() => openModal('missions')}
                  className="hidden md:block pointer-events-auto px-3.5 py-1.5 rounded-xl bg-stone-950/85 border border-stone-700/70 hover:border-amber-500/70 text-center"
                >
                  <div className="text-[11px] font-semibold text-amber-400">
                    {currentMissionInfo.mission.title} (
                    {currentMissionInfo.progress}/
                    {currentMissionInfo.mission.targetCount})
                  </div>
                  <div className="text-[11px] text-stone-200 truncate max-w-xs">
                    {currentMissionInfo.nextStep ||
                      currentMissionInfo.mission.description}
                  </div>
                </button>
              )}
            </div>

            {/* Top-Right HUD Action Triggers */}
            <div className="pointer-events-auto flex flex-wrap justify-end gap-1.5 sm:gap-2">
              <HudIconButton
                icon={<Backpack className="w-5 h-5" />}
                label="Pack"
                onClick={() => openModal('inventory')}
              />
              <HudIconButton
                icon={<Hammer className="w-5 h-5" />}
                label="Craft"
                onClick={() => openModal('crafting')}
              />
              <HudIconButton
                icon={<MapIcon className="w-5 h-5" />}
                label="Map"
                onClick={() => openModal('map')}
              />
              <HudIconButton
                icon={<Trophy className="w-5 h-5" />}
                label="Goals"
                onClick={() => openModal('missions')}
              />
              <HudIconButton
                icon={<Pause className="w-5 h-5" />}
                label="Pause"
                onClick={() => openModal('pause')}
              />
            </div>
          </div>

          {/* Status & Resource Toasts */}
          <div className="flex flex-col items-center gap-1.5 my-auto pointer-events-none">
            <div className="flex items-center gap-2">
              {hud.isSheltered && (
                <div className="px-3 py-1 rounded-lg bg-emerald-950/85 border border-emerald-700/60 text-[11px] font-medium text-emerald-200 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Sheltered</span>
                </div>
              )}
              {hud.nearFire && (
                <div className="px-3 py-1 rounded-lg bg-orange-950/85 border border-orange-700/60 text-[11px] font-medium text-orange-200 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5" />
                  <span>Fire Warmth</span>
                </div>
              )}
              {hud.isCrouching && (
                <div className="px-3 py-1 rounded-lg bg-stone-900/90 border border-stone-600 text-[11px] font-medium text-stone-200">
                  Crouching (Stealth)
                </div>
              )}
              {hud.isNight && hud.nocturnalActiveCount > 0 && (
                <div className="px-3 py-1 rounded-lg bg-indigo-950/85 border border-indigo-700/60 text-[11px] font-medium text-indigo-200 flex items-center gap-1.5">
                  <Moon className="w-3.5 h-3.5" />
                  <span>Nocturnal Stalkers Active</span>
                </div>
              )}
            </div>
            {toasts.map((t) => (
              <div
                key={t.id}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border shadow-lg flex items-center gap-2 ${
                  t.tone === 'warning'
                    ? 'bg-red-950/90 border-red-700 text-red-100'
                    : t.tone === 'craft'
                      ? 'bg-amber-950/90 border-amber-600 text-amber-100'
                      : t.tone === 'discovery'
                        ? 'bg-sky-950/90 border-sky-600 text-sky-100'
                        : 'bg-stone-950/90 border-stone-700 text-stone-100'
                }`}
              >
                {t.itemId && (
                  <ItemIcon itemId={t.itemId} className="w-4 h-4 shrink-0" />
                )}
                <span>{t.text}</span>
              </div>
            ))}
          </div>

          {/* Bottom-Center Contextual Prompt + Equipped Readout + 6-Slot Quick Hotbar */}
          <div className="flex flex-col items-center gap-1.5 pb-1">
            {hud.nearbyInteraction && !activeModal && (
              <button
                onClick={() => engineRef.current?.triggerPrimaryAction()}
                className="pointer-events-auto min-h-[44px] px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs sm:text-sm shadow-xl flex items-center gap-2 whitespace-nowrap shrink-0"
              >
                {hud.nearbyInteraction.actionCategory === 'chop' ? (
                  <Axe className="w-4 h-4" />
                ) : hud.nearbyInteraction.actionCategory === 'mine' ? (
                  <Pickaxe className="w-4 h-4" />
                ) : hud.nearbyInteraction.actionCategory === 'pickup' ? (
                  <PackagePlus className="w-4 h-4" />
                ) : hud.nearbyInteraction.actionCategory === 'craft' ? (
                  <Hammer className="w-4 h-4" />
                ) : hud.nearbyInteraction.actionCategory === 'cook' ? (
                  <Flame className="w-4 h-4" />
                ) : hud.nearbyInteraction.actionCategory === 'shoot' ? (
                  <Crosshair className="w-4 h-4" />
                ) : (
                  <Hand className="w-4 h-4" />
                )}
                <span>
                  {hud.nearbyInteraction.label}
                  {hud.nearbyInteraction.sublabel
                    ? ` (${hud.nearbyInteraction.sublabel})`
                    : ''}
                </span>
                <span className="hidden sm:inline text-[11px] px-1.5 py-0.5 rounded bg-stone-950/20 font-mono-tabular">
                  E
                </span>
              </button>
            )}

            {/* Current Equipped Item Indicator + Quick Place */}
            {(() => {
              const eqId = hud.hotbarItemIds[hud.equippedSlot];
              const eqDef = eqId && countOf(eqId) > 0 ? ITEMS[eqId] : null;
              return (
                <div className="pointer-events-auto flex items-center gap-1.5">
                  <div className="px-3 py-1 rounded-lg bg-stone-950/85 border border-stone-700/75 text-[11px] text-stone-200 flex items-center gap-2 shadow-md">
                    {eqDef ? (
                      <>
                        <ItemIcon itemId={eqDef.id} className="w-3.5 h-3.5 shrink-0" />
                        <span className="font-semibold text-amber-300">
                          {eqDef.name}
                        </span>
                        {eqDef.preferredResource ? (
                          <span className="text-stone-400 font-mono-tabular">
                            · {eqDef.preferredResource} ×{eqDef.gatherPower || 1}
                          </span>
                        ) : eqDef.attackDamage ? (
                          <span className="text-stone-400 font-mono-tabular">
                            · DMG {eqDef.attackDamage}
                          </span>
                        ) : null}
                      </>
                    ) : (
                      <span className="text-stone-400">
                        Equipped: Bare Hands (Slot {hud.equippedSlot + 1})
                      </span>
                    )}
                  </div>
                  {eqDef && (
                    <button
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => engineRef.current?.placeItemInWorld(eqDef.id)}
                      className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-[11px] shadow-md flex items-center gap-1 whitespace-nowrap shrink-0"
                      title={`Place ${eqDef.name} in front of you`}
                    >
                      <PackageOpen className="w-3.5 h-3.5" />
                      <span>{eqDef.structureType ? 'Build' : 'Set Down'}</span>
                    </button>
                  )}
                </div>
              );
            })()}

            {/* 6-Slot Hotbar + Dedicated Place Button */}
            <div className="pointer-events-auto flex items-center gap-1.5 p-1.5 rounded-xl bg-stone-950/88 border border-stone-700/80 shadow-xl">
              {hud.hotbarItemIds.map((itemId, idx) => {
                const isSelected = hud.equippedSlot === idx;
                const qty = itemId ? countOf(itemId) : 0;
                return (
                  <button
                    key={idx}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => {
                      engineRef.current?.selectHotbarSlot(idx);
                      if (itemId && ITEMS[itemId].category === 'food') {
                        engineRef.current?.useOrEquipItem(itemId);
                      }
                    }}
                    className={`relative w-11 h-11 sm:w-12 sm:h-12 rounded-lg border flex flex-col items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-amber-950/75 border-amber-400'
                        : 'bg-stone-900 border-stone-800 hover:border-stone-600'
                    }`}
                    title={itemId ? ITEMS[itemId].name : `Slot ${idx + 1}`}
                  >
                    <span className="absolute top-0.5 left-1 text-[9px] font-mono-tabular text-stone-500">
                      {idx + 1}
                    </span>
                    {itemId && qty > 0 ? (
                      <>
                        <ItemIcon itemId={itemId} className="w-5 h-5" />
                        <span className="absolute bottom-0.5 right-1 text-[10px] font-mono-tabular font-bold text-stone-200">
                          {qty > 1 ? qty : ''}
                        </span>
                      </>
                    ) : (
                      <span className="text-[10px] text-stone-700">—</span>
                    )}
                  </button>
                );
              })}

              <button
                type="button"
                aria-label="Place Stuff"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => openModal('place')}
                className="h-11 sm:h-12 px-2.5 sm:px-3 rounded-lg bg-amber-600 hover:bg-amber-500 border border-amber-300/70 text-stone-950 font-bold text-xs flex flex-col sm:flex-row items-center justify-center gap-1 whitespace-nowrap shrink-0"
                title="Place structures, supplies, or food down (P)"
              >
                <PackageOpen className="w-4 h-4" />
                <span>Place</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESPONSIVE TOUCH CONTROLS (iPhone Safari + Toggleable) */}
      {hud && (
        <TouchControls
          visible={showTouchControls}
          actionLabel={hud.nearbyInteraction?.label || 'Action'}
          actionCategory={hud.nearbyInteraction?.actionCategory}
          isSprinting={hud.isSprinting}
          isCrouching={hud.isCrouching}
          onJoystickMove={(x, y) => engineRef.current?.setTouchJoystick(x, y)}
          onCameraDrag={(dx, dy) => engineRef.current?.addCameraLookDelta(dx, dy)}
          onAction={() => engineRef.current?.triggerPrimaryAction()}
          onJump={() => engineRef.current?.triggerJump()}
          onSprintToggle={(active) => engineRef.current?.setTouchSprint(active)}
          onCrouchToggle={(active) => engineRef.current?.setTouchCrouch(active)}
          onOpenBackpack={() => openModal('inventory')}
          onOpenCraft={() => openModal('crafting')}
          onOpenPlace={() => openModal('place')}
        />
      )}

      {/* MODALS */}
      {activeModal === 'inventory' && hud && (
        <InventoryModal
          hud={hud}
          nearTable={nearCraftingTable}
          onUseOrEquip={(id) => engineRef.current?.useOrEquipItem(id)}
          onDropItem={(id) => engineRef.current?.dropItem(id, 1)}
          onAssignHotbar={(slotIdx, id) =>
            engineRef.current?.assignHotbarSlot(slotIdx, id)
          }
          onSelectHotbarSlot={(slotIdx) =>
            engineRef.current?.selectHotbarSlot(slotIdx)
          }
          onCraft={(recipeId) => engineRef.current?.craftRecipe(recipeId)}
          onCraftSound={() => engineRef.current?.playWorkbenchCraftSound()}
          onClose={closeModal}
        />
      )}

      {activeModal === 'chest' && hud && (
        <InventoryModal
          hud={hud}
          nearTable={nearCraftingTable}
          chestStructureId={activeStationStructureId}
          onUseOrEquip={(id) => engineRef.current?.useOrEquipItem(id)}
          onDropItem={(id) => engineRef.current?.dropItem(id, 1)}
          onAssignHotbar={(slotIdx, id) =>
            engineRef.current?.assignHotbarSlot(slotIdx, id)
          }
          onSelectHotbarSlot={(slotIdx) =>
            engineRef.current?.selectHotbarSlot(slotIdx)
          }
          onCraft={(recipeId) => engineRef.current?.craftRecipe(recipeId)}
          onCraftSound={() => engineRef.current?.playWorkbenchCraftSound()}
          onTransferToChest={(sid, id) =>
            engineRef.current?.transferToChest(sid, id, 1)
          }
          onTransferFromChest={(sid, id) =>
            engineRef.current?.transferFromChest(sid, id, 1)
          }
          onClose={closeModal}
        />
      )}

      {activeModal === 'crafting' && hud && (
        <CraftingModal
          hud={hud}
          nearTable={nearCraftingTable}
          onCraft={(recipeId) => engineRef.current?.craftRecipe(recipeId)}
          onCraftSound={() => engineRef.current?.playWorkbenchCraftSound()}
          onClose={closeModal}
        />
      )}

      {activeModal === 'cooking' && hud && (
        <CookingModal
          hud={hud}
          atCookingStation={nearCookingStation}
          onCook={(recipeId) =>
            engineRef.current?.cookRecipe(recipeId, nearCookingStation) || false
          }
          onClose={closeModal}
        />
      )}

      {activeModal === 'place' && hud && (
        <PlaceModal
          hud={hud}
          onPlaceItem={(itemId) =>
            engineRef.current?.placeItemInWorld(itemId) || false
          }
          onSparkCampfire={() =>
            engineRef.current?.sparkQuickCampfire() || false
          }
          onOpenCraft={() => openModal('crafting')}
          onClose={closeModal}
        />
      )}

      {activeModal === 'map' && hud && (
        <IslandMapModal hud={hud} onClose={closeModal} />
      )}

      {activeModal === 'missions' && hud && (
        <MissionsModal hud={hud} onClose={closeModal} />
      )}

      {activeModal === 'pause' && (
        <PauseModal
          saveSlots={saveSlots}
          onResume={closeModal}
          onSaveNow={(slotId) => handleSaveNow(slotId)}
          onLoadSlot={(slotId) => handleContinueGame(slotId)}
          onDeleteSlot={(slotId) => {
            deleteSaveSlot(slotId);
            refreshSaves();
          }}
          onOpenSettings={() => setActiveModal('settings')}
          onQuitToMenu={() => {
            handleSaveNow('slot_1');
            setActiveModal(null);
            setScreen('menu');
            engineRef.current?.setMode('menu');
          }}
        />
      )}

      {activeModal === 'settings' && (
        <SettingsModal
          settings={settings}
          onChange={handleSettingsChange}
          onClose={() => {
            if (screen === 'menu') {
              setActiveModal(null);
            } else {
              setActiveModal('pause');
            }
          }}
        />
      )}

      {/* GAME OVER OVERLAY */}
      {screen === 'playing' && hud?.gameOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <div className="w-full max-w-md rounded-2xl bg-stone-900 border border-red-800/70 p-6 text-center space-y-4 shadow-2xl">
            <h2 className="font-display text-2xl font-bold text-red-400">
              Expedition Fallen
            </h2>
            <p className="text-sm text-stone-300">{hud.gameOverReason}</p>
            <div className="text-xs font-mono-tabular text-stone-400">
              Survived {hud.dayCount} Days · {hud.stats.animalsHunted} Hunts ·{' '}
              {hud.stats.itemsCrafted} Crafts
            </div>
            <div className="flex flex-col gap-2.5 pt-2">
              <button
                onClick={() => engineRef.current?.respawnPlayer()}
                className="w-full min-h-[48px] rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-sm"
              >
                Wake on Shore (Respawn)
              </button>
              {latestSave && (
                <button
                  onClick={() => handleContinueGame(latestSave.slotId)}
                  className="w-full min-h-[48px] rounded-xl bg-emerald-700 hover:bg-emerald-600 text-stone-50 font-bold text-sm"
                >
                  Load Last Saved Checkpoint
                </button>
              )}
              <button
                onClick={handleStartNewGame}
                className="w-full min-h-[48px] rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-100 font-semibold text-sm flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Start Fresh Expedition</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function VitalBar({
  icon,
  label,
  value,
  barColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  barColor: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="flex items-center gap-2">
      <div className="shrink-0" aria-label={label}>
        {icon}
      </div>
      <div className="flex-1 h-2 rounded-full bg-stone-800 overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all duration-150`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-7 text-right text-[11px] font-mono-tabular text-stone-200">
        {Math.round(pct)}
      </span>
    </div>
  );
}

function CompassStrip({ playerYaw }: { playerYaw: number }) {
  const camYaw = playerYaw - Math.PI;
  const bearing = (((-camYaw * 180) / Math.PI) % 360 + 360) % 360;
  const markers: { label: string; deg: number; major?: boolean }[] = [
    { label: 'N', deg: 0, major: true },
    { label: 'NE', deg: 45 },
    { label: 'E', deg: 90, major: true },
    { label: 'SE', deg: 135 },
    { label: 'S', deg: 180, major: true },
    { label: 'SW', deg: 225 },
    { label: 'W', deg: 270, major: true },
    { label: 'NW', deg: 315 },
  ];

  const nearestCardinal = markers.reduce((best, cur) => {
    const dCur = Math.abs(((cur.deg - bearing + 540) % 360) - 180);
    const dBest = Math.abs(((best.deg - bearing + 540) % 360) - 180);
    return dCur < dBest ? cur : best;
  }, markers[0]);

  return (
    <div className="w-40 sm:w-56 rounded-xl bg-stone-950/85 border border-stone-700/70 px-2.5 py-1.5 flex flex-col items-center gap-0.5 shadow-lg overflow-hidden">
      <div className="relative w-full h-4 overflow-hidden">
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-amber-400/90 -translate-x-1/2 z-10" />
        {markers.map((m) => {
          const delta = ((m.deg - bearing + 540) % 360) - 180;
          if (Math.abs(delta) > 85) return null;
          const pct = 50 + (delta / 85) * 48;
          return (
            <span
              key={m.label}
              style={{ left: `${pct}%` }}
              className={`absolute top-0 -translate-x-1/2 font-mono-tabular leading-4 ${
                m.major
                  ? m.label === 'N'
                    ? 'text-[11px] font-bold text-amber-400'
                    : 'text-[11px] font-bold text-stone-100'
                  : 'text-[9px] text-stone-400'
              }`}
            >
              {m.label}
            </span>
          );
        })}
      </div>
      <div className="text-[10px] font-mono-tabular text-stone-300 leading-none">
        {nearestCardinal.label} · {String(Math.round(bearing)).padStart(3, '0')}°
      </div>
    </div>
  );
}

function HudIconButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="min-w-[44px] min-h-[44px] px-2.5 py-1.5 rounded-xl bg-stone-950/85 hover:bg-stone-800 border border-stone-700/80 text-stone-100 flex flex-col items-center justify-center gap-0.5 whitespace-nowrap shrink-0"
      aria-label={label}
    >
      {icon}
      <span className="text-[10px] font-medium leading-none">{label}</span>
    </button>
  );
}
