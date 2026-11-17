'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  AudioLines,
  Axe,
  Backpack,
  Box,
  Car,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Cloud,
  CloudLightning,
  CloudRain,
  Coins,
  Compass,
  Crosshair,
  Droplets,
  Eye,
  EyeOff,
  FastForward,
  Flame,
  Footprints,
  Hammer,
  Hand,
  Heart,
  Layers,
  LogOut,
  Map as MapIcon,
  Moon,
  PackageOpen,
  PackagePlus,
  Pause,
  Pickaxe,
  Play,
  Plus,
  RotateCcw,
  RotateCw,
  Settings,
  Shield,
  ShieldAlert,
  ShieldOff,
  Skull,
  Sparkles,
  Sun,
  Swords,
  Terminal,
  Thermometer,
  Trophy,
  Tv,
  Users,
  Utensils,
  Volume2,
  VolumeX,
  Waves,
  X,
  Zap,
} from 'lucide-react';
import { ITEMS, isActiveWeaponItem, isAmmoItem, isFirearmItem } from '@/game/data/items';
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
  GameMode,
  GameSettings,
  HUDStateSnapshot,
  ItemId,
  ResourceToast,
  SaveSlotSummary,
} from '@/game/types';
import { CookingModal } from './CookingModal';
import { CraftingModal } from './CraftingModal';
import { FarmerShopModal } from './FarmerShopModal';
import { FridgeModal } from './FridgeModal';
import { InventoryModal } from './InventoryModal';
import { IslandMapModal } from './IslandMapModal';
import { ItemIcon } from './ItemIcon';
import {
  MissionsModal,
  PauseModal,
  SettingsModal,
} from './MissionsAndPauseModals';
import { ModManagerModal } from './ModManagerModal';
import { MultiplayerModal } from './MultiplayerModal';
import { PlaceModal } from './PlaceModal';
import { TouchControls } from './TouchControls';
import { TvPlayerModal, YouTubeStreamSelection } from './TvPlayerModal';
import { VehicleBuilderModal } from './VehicleBuilderModal';
import { CommandConsoleModal } from './CommandConsoleModal';
import { DimensionWheelModal } from './DimensionWheelModal';

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
  const toastSeqRef = useRef(0);
  const hotbarScrollRef = useRef<HTMLDivElement | null>(null);
  const slotButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);

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
  const [telemetryExpanded, setTelemetryExpanded] = useState(false);
  const [hudWindowStart, setHudWindowStart] = useState(0);
  const [hudManagerOpen, setHudManagerOpen] = useState(false);
  const [hudSlotJumpInput, setHudSlotJumpInput] = useState('');
  const [draggingHudSlot, setDraggingHudSlot] = useState<number | null>(null);
  const [hudDropHover, setHudDropHover] = useState(false);
  const [inviteRoomCode, setInviteRoomCode] = useState('');
  const [tvSearchQuery, setTvSearchQuery] = useState('');
  const [tvSearchResults, setTvSearchResults] = useState<YouTubeStreamSelection[]>([]);
  const [tvSearchStatus, setTvSearchStatus] = useState('');
  const [youtubeErrorSignal, setYoutubeErrorSignal] = useState<{
    videoId: string;
    code: number;
    seq: number;
  } | null>(null);
  const [gamepadConnected, setGamepadConnected] = useState(false);
  const [gamepadJoystickOffset, setGamepadJoystickOffset] = useState({ x: 0, y: 0 });
  const hudRef = useRef<HUDStateSnapshot | null>(null);
  const activeModalRef = useRef<ActiveModal>(null);
  const lastGpKnobRef = useRef({ x: 0, y: 0 });
  const gamepadConnectedRef = useRef(false);
  const ytErrSeqRef = useRef(0);

  const handleTvInlinePlayerChange = useCallback(
    (active: boolean, syncTimeSec?: number) => {
      engineRef.current?.setTvInlinePlayerActive(active, syncTimeSec);
    },
    [],
  );

  const handleTvSyncYouTubeTime = useCallback((sec: number) => {
    engineRef.current?.syncTvYouTubeTime(sec);
  }, []);

  useEffect(() => {
    hudRef.current = hud;
  }, [hud]);

  useEffect(() => {
    activeModalRef.current = activeModal;
  }, [activeModal]);

  const refreshSaves = useCallback(() => {
    setSaveSlots(listSaveSlots());
    setLatestSave(getLatestSaveSlot());
  }, []);

  const pushToast = useCallback((toast: ResourceToast) => {
    toastSeqRef.current += 1;
    const uniqueId = `${toast.id}_${toastSeqRef.current}`;
    const nextToast: ResourceToast = { ...toast, id: uniqueId };
    setToasts((prev) => [
      ...prev.filter((t) => t.id !== uniqueId).slice(-3),
      nextToast,
    ]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== uniqueId));
    }, 2800);
  }, []);

  useEffect(() => {
    const hasAnyGamepad = () => {
      const gps = navigator.getGamepads ? navigator.getGamepads() : [];
      for (const gp of gps) {
        if (gp && gp.connected) return true;
      }
      return false;
    };

    const onConnected = (e: GamepadEvent) => {
      gamepadConnectedRef.current = true;
      setGamepadConnected(true);
      pushToast({
        id: `gp_${e.gamepad.index}`,
        text: `Xbox Controller Connected (${e.gamepad.id.slice(0, 24)})`,
        tone: 'discovery',
      });
    };
    const onDisconnected = (e: GamepadEvent) => {
      const anyLeft = hasAnyGamepad();
      gamepadConnectedRef.current = anyLeft;
      setGamepadConnected(anyLeft);
      engineRef.current?.setTouchJoystick(0, 0);
      engineRef.current?.setAiming(false);
      engineRef.current?.setGamepadDriveState(0, 0, false);
      lastGpKnobRef.current = { x: 0, y: 0 };
      setGamepadJoystickOffset({ x: 0, y: 0 });
      pushToast({
        id: `gp_dc_${e.gamepad.index}`,
        text: 'Xbox Controller Disconnected',
        tone: 'warning',
      });
    };
    window.addEventListener('gamepadconnected', onConnected as EventListener);
    window.addEventListener('gamepaddisconnected', onDisconnected as EventListener);

    let animId = 0;
    const prevButtonStates = new Map<number, boolean>();
    let wasGamepadActive = false;

    const pollGamepads = () => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      let activeGp: Gamepad | null = null;
      for (const gp of gamepads) {
        if (gp && gp.connected) {
          activeGp = gp;
          break;
        }
      }

      const isNowConnected = Boolean(activeGp);
      if (isNowConnected !== gamepadConnectedRef.current) {
        gamepadConnectedRef.current = isNowConnected;
        setGamepadConnected(isNowConnected);
      }

      const engine = engineRef.current;
      const modalOpen = activeModalRef.current;
      const currentHud = hudRef.current;

      if (activeGp && screen === 'playing' && engine && !currentHud?.gameOver && !currentHud?.cinematicActive) {
        wasGamepadActive = true;
        const isPressed = (btnIdx: number) =>
          Boolean(activeGp?.buttons[btnIdx]?.pressed);
        const btnValue = (btnIdx: number) =>
          activeGp?.buttons[btnIdx]?.value ?? (isPressed(btnIdx) ? 1 : 0);
        const checkEdge = (btnIdx: number, action: () => void) => {
          const pressed = isPressed(btnIdx);
          const wasPressed = prevButtonStates.get(btnIdx) || false;
          if (pressed && !wasPressed) action();
          prevButtonStates.set(btnIdx, pressed);
        };

        // Start button toggles Pause modal
        checkEdge(9, () => {
          if (activeModalRef.current) {
            setActiveModal(null);
            engine.setMode('playing');
          } else {
            setActiveModal('pause');
            engine.setMode('paused');
          }
        });

        // If a modal is open, allow B button to close it and reset sticks cleanly
        if (modalOpen) {
          checkEdge(1, () => {
            setActiveModal(null);
            engine.setMode('playing');
          });
          engine.setAiming(false);
          engine.setGamepadDriveState(0, 0, false);
          if (lastGpKnobRef.current.x !== 0 || lastGpKnobRef.current.y !== 0) {
            lastGpKnobRef.current = { x: 0, y: 0 };
            setGamepadJoystickOffset({ x: 0, y: 0 });
            engine.setTouchJoystick(0, 0);
          }
        } else {
          // Left Analog Stick (axes[0], axes[1]) with 0.15 deadzone
          const rawLx = activeGp.axes[0] ?? 0;
          const rawLy = activeGp.axes[1] ?? 0;
          const lx = Math.abs(rawLx) > 0.15 ? rawLx : 0;
          const ly = Math.abs(rawLy) > 0.15 ? rawLy : 0;
          engine.setTouchJoystick(lx, -ly);

          const knobX = lx * 48;
          const knobY = ly * 48;
          if (
            Math.abs(knobX - lastGpKnobRef.current.x) > 0.25 ||
            Math.abs(knobY - lastGpKnobRef.current.y) > 0.25 ||
            (knobX === 0 && knobY === 0 && (lastGpKnobRef.current.x !== 0 || lastGpKnobRef.current.y !== 0))
          ) {
            lastGpKnobRef.current = { x: knobX, y: knobY };
            setGamepadJoystickOffset({ x: knobX, y: knobY });
          }

          // Right Analog Stick (axes[2], axes[3]) smooth 360° camera look
          const rawRx = activeGp.axes[2] ?? 0;
          const rawRy = activeGp.axes[3] ?? 0;
          const rx = Math.abs(rawRx) > 0.15 ? rawRx : 0;
          const ry = Math.abs(rawRy) > 0.15 ? rawRy : 0;
          if (rx !== 0 || ry !== 0) {
            engine.addCameraLookDelta(rx * 16, ry * 16, false);
          }

          const isDriving = Boolean(currentHud?.activeVehicle);
          const ltVal = btnValue(6);
          const rtVal = btnValue(7);

          if (isDriving) {
            engine.setAiming(false);
            engine.setGamepadDriveState(
              rtVal > 0.12 ? rtVal : 0,
              ltVal > 0.12 ? ltVal : 0,
              isPressed(1),
            );
          } else {
            engine.setGamepadDriveState(0, 0, false);
            engine.setAiming(ltVal > 0.25);
            if (rtVal > 0.25) {
              engine.triggerPrimaryAction();
            }
          }

          // Face buttons A/B/X/Y & Bumpers LB/RB
          checkEdge(0, () => engine.triggerJump());
          checkEdge(1, () => engine.triggerXboxBAction());
          checkEdge(2, () => engine.triggerXboxXAction());
          checkEdge(3, () => engine.triggerXboxYAction());
          checkEdge(4, () => engine.triggerXboxBumper(-1));
          checkEdge(5, () => engine.triggerXboxBumper(1));

          // D-Pad (12=Up, 13=Down, 14=Left, 15=Right)
          checkEdge(12, () => {
            setActiveModal('multiverse');
            engine.setMode('paused');
          });
          checkEdge(13, () => {
            const muted = engine.toggleMicMute();
            pushToast({
              id: `mic_${Date.now()}`,
              text: muted ? 'Microphone Muted' : 'Microphone Unmuted',
              tone: muted ? 'warning' : 'craft',
            });
          });
          checkEdge(14, () => engine.triggerXboxDpadLeft());
          checkEdge(15, () => engine.triggerXboxDpadRight());
        }
      } else if (wasGamepadActive) {
        wasGamepadActive = false;
        engine?.setTouchJoystick(0, 0);
        engine?.setAiming(false);
        engine?.setGamepadDriveState(0, 0, false);
        lastGpKnobRef.current = { x: 0, y: 0 };
        setGamepadJoystickOffset({ x: 0, y: 0 });
      }

      animId = window.requestAnimationFrame(pollGamepads);
    };

    animId = window.requestAnimationFrame(pollGamepads);

    return () => {
      window.removeEventListener('gamepadconnected', onConnected as EventListener);
      window.removeEventListener('gamepaddisconnected', onDisconnected as EventListener);
      window.cancelAnimationFrame(animId);
    };
  }, [screen, pushToast]);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      setSettings(loadSettings());
      refreshSaves();
      const hasTouch =
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        window.matchMedia('(pointer: coarse)').matches;
      setIsTouchDevice(hasTouch);
      const roomParam = new URLSearchParams(window.location.search).get('room');
      if (roomParam) {
        setInviteRoomCode(roomParam.trim().toUpperCase());
        setActiveModal('multiplayer');
      }
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
        const eq = snapshot.equippedSlot;
        const total = snapshot.hotbarItemIds.length;
        if (eq >= 0) {
          setHudWindowStart((prev) => {
            const maxStart = Math.max(0, total - 9);
            if (eq < prev) return Math.min(maxStart, eq);
            if (eq >= prev + 9) return Math.min(maxStart, eq - 9 + 1);
            return Math.min(maxStart, prev);
          });
        }
      },
      onToast: pushToast,
      onOpenStation: (station, structureId) => {
        setActiveStationStructureId(structureId);
        setActiveModal(station);
        engine.setMode('paused');
      },
      onYouTubeError: (videoId, errorCode) => {
        ytErrSeqRef.current += 1;
        setYoutubeErrorSignal({
          videoId,
          code: errorCode,
          seq: ytErrSeqRef.current,
        });
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
    engineRef.current.setTvModalOpen(screen === 'playing' && activeModal === 'tv');
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
          engineRef.current?.toggleMicMute();
        } else if (e.code === 'KeyN') {
          setActiveModal('map');
          engineRef.current?.setMode('paused');
        } else if (e.code === 'KeyJ') {
          setActiveModal('missions');
          engineRef.current?.setMode('paused');
        } else if (e.code === 'KeyU' || e.code === 'KeyG') {
          setActiveModal('multiverse');
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

  // Smoothly keep the wheel-selected slot centered in the scrollable HUD bar (supports up to 5,000 HUD slots at 60 FPS)
  const HUD_BAR_WINDOW = 9;
  const equippedSlot = hud?.equippedSlot ?? -1;
  useEffect(() => {
    if (equippedSlot < 0) {
      hotbarScrollRef.current?.scrollTo({ left: 0, behavior: 'smooth' });
      return;
    }
    const btn = slotButtonRefs.current[equippedSlot - hudWindowStart];
    if (btn) {
      btn.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [equippedSlot, hudWindowStart]);

  const handleStartNewGame = (mode: GameMode = 'survival') => {
    if (!engineRef.current) return;
    engineRef.current.unlockAudio();
    engineRef.current.setGameMode(mode);
    engineRef.current.startNewWorldState('slot_1', true);
    engineRef.current.ensurePlayerHasGun(true);
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
    engineRef.current.ensurePlayerHasGun(false);
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
      id: `loaded_${Date.now()}`,
      text: `Loaded Day ${data.dayCount} Expedition · Gun, Knife & Supplies Ready`,
      tone: 'info',
    });
  };

  const handleSaveNow = (slotId = 'slot_1') => {
    if (!engineRef.current) return;
    const ok = saveGameToSlot(engineRef.current.exportSaveData(slotId));
    refreshSaves();
    pushToast({
      id: `saved_${Date.now()}`,
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
    !hud?.seatedLabel &&
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
    <div className="relative w-full min-h-[100dvh] overflow-x-hidden bg-stone-950 select-none">
      {/* Isolated WebGL Canvas Mount — Fixed Full-Bleed Behind Scrollable HUD */}
      <div
        ref={canvasMountRef}
        className="fixed inset-0 w-full h-full z-0 touch-surface touch-none"
        onPointerDown={(e) => {
          engineRef.current?.unlockAudio();
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

      {/* MAIN MENU / TITLE SCREEN OVERLAY */}
      {screen === 'menu' && (
        <div className="relative z-10 w-full min-h-[100dvh] flex flex-col justify-between p-5 sm:p-10 bg-gradient-to-t from-stone-950/90 via-stone-950/40 to-stone-950/70">
          <div className="flex flex-wrap items-center justify-between gap-2 safe-top">
            <div className="text-xs font-semibold tracking-wider text-amber-300 uppercase">
              AdventureForgeGames · Stage 1 Final Polish
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveModal('multiplayer')}
                className="min-h-[44px] px-3.5 rounded-xl bg-sky-950/90 hover:bg-sky-900 border border-sky-500/50 text-sky-200 text-xs font-semibold flex items-center gap-2 whitespace-nowrap shrink-0"
              >
                <Users className="w-4 h-4" />
                <span>Multiplayer{hud?.multiplayerState?.roomCode ? ` (${hud.multiplayerState.roomCode})` : ''}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveModal('mods')}
                className="min-h-[44px] px-3.5 rounded-xl bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-200 text-xs font-semibold flex items-center gap-2 whitespace-nowrap shrink-0"
              >
                <Box className="w-4 h-4" />
                <span>Mods</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveModal('settings')}
                className="min-h-[44px] px-4 rounded-xl bg-stone-900/90 hover:bg-stone-800 border border-stone-700 text-stone-100 text-xs font-semibold flex items-center gap-2 whitespace-nowrap shrink-0"
              >
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </button>
            </div>
          </div>

          <div className="max-w-3xl space-y-6 my-auto py-6">
            <div className="space-y-3">
              <h1 className="font-display text-4xl sm:text-6xl font-bold tracking-tight text-stone-50 leading-[1.05] text-balance drop-shadow-lg">
                SURVIVAL ISLAND: LOST WORLD
              </h1>
              <p className="text-sm sm:text-base text-stone-200 max-w-xl leading-relaxed">
                Realistic 3D prehistoric survival simulator — gather timber and ore, craft tools, hunt wildlife, roast meals, and outlast 7-Day Blood Moon Sieges.
              </p>
            </div>

            {latestSave && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleContinueGame(latestSave.slotId)}
                  className="min-h-[52px] px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-sm flex items-center gap-2.5 shadow-xl whitespace-nowrap"
                >
                  <Play className="w-5 h-5" />
                  <span>
                    Continue Expedition (Day {latestSave.dayCount} · HP {latestSave.health})
                  </span>
                </button>
              </div>
            )}

            {/* 3 Playable Game Modes */}
            <div className="space-y-2.5 pt-2">
              <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Select Game Mode
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => handleStartNewGame('survival')}
                  className="p-4 rounded-2xl bg-stone-900/90 hover:bg-stone-800 border border-amber-500/50 hover:border-amber-400 text-left transition shadow-xl flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-600 font-extrabold text-stone-950 uppercase">
                        Hardcore
                      </span>
                      <Compass className="w-4 h-4 text-amber-400 group-hover:scale-110 transition" />
                    </div>
                    <h3 className="text-sm font-bold text-stone-100 font-display">
                      Survival Mode
                    </h3>
                    <p className="text-[11px] text-stone-300 mt-1 leading-relaxed">
                      Full biological survival, Fluid Erosion, and 7-Day Blood Moon Sieges with nocturnal predator attacks.
                    </p>
                  </div>
                  <div className="mt-4 text-xs font-bold text-amber-400 flex items-center gap-1">
                    <span>Play Survival</span>
                    <Play className="w-3.5 h-3.5" />
                  </div>
                </button>

                <button
                  onClick={() => handleStartNewGame('boss_hunt')}
                  className="p-4 rounded-2xl bg-stone-900/90 hover:bg-stone-800 border border-red-500/50 hover:border-red-400 text-left transition shadow-xl flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-red-600 font-extrabold text-white uppercase">
                        Action
                      </span>
                      <Skull className="w-4 h-4 text-red-400 group-hover:scale-110 transition" />
                    </div>
                    <h3 className="text-sm font-bold text-stone-100 font-display">
                      Guardian Boss Hunt
                    </h3>
                    <p className="text-[11px] text-stone-300 mt-1 leading-relaxed">
                      Track and defeat 4 colossal Lost World Guardian Bosses across distinct biomes to claim Core Shards.
                    </p>
                  </div>
                  <div className="mt-4 text-xs font-bold text-red-400 flex items-center gap-1">
                    <span>Hunt Bosses</span>
                    <Play className="w-3.5 h-3.5" />
                  </div>
                </button>

                <button
                  onClick={() => handleStartNewGame('sandbox')}
                  className="p-4 rounded-2xl bg-stone-900/90 hover:bg-stone-800 border border-sky-500/50 hover:border-sky-400 text-left transition shadow-xl flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-sky-600 font-extrabold text-stone-950 uppercase">
                        Creative
                      </span>
                      <Zap className="w-4 h-4 text-sky-400 group-hover:scale-110 transition" />
                    </div>
                    <h3 className="text-sm font-bold text-stone-100 font-display">
                      Sandbox / God Mode
                    </h3>
                    <p className="text-[11px] text-stone-300 mt-1 leading-relaxed">
                      Unlimited resources, flight, instant Creator Relic spawner, and full Smart TV access.
                    </p>
                  </div>
                  <div className="mt-4 text-xs font-bold text-sky-400 flex items-center gap-1">
                    <span>Enter Sandbox</span>
                    <Play className="w-3.5 h-3.5" />
                  </div>
                </button>
              </div>
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
              Desktop: WASD Move · Drag Look · C Crouch · E Act · V Kick Debris · B Craft · Space Jump/Vault/Wall-Kick
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
        <div className="pointer-events-none relative z-10 min-h-[100dvh] w-full flex flex-col justify-between gap-2 p-2.5 sm:p-4 safe-top safe-bottom pb-5 sm:pb-5">
          {/* Subtle First-Person Aim Reticle + Dynamic Hitbox & Armor Inspector */}
          {!activeModal && !hud.gameOver && (
            <div className="fixed inset-0 pointer-events-none flex items-center justify-center">
              <div
                className={`w-1.5 h-1.5 rounded-full border border-black/60 ${
                  hud.targetHitbox
                    ? hud.targetHitbox.isGapSlip ||
                      hud.targetHitbox.armorHp <= 0
                      ? 'bg-emerald-400 scale-125'
                      : 'bg-amber-400 scale-125'
                    : hud.nearbyInteraction
                      ? 'bg-amber-400 scale-125'
                      : 'bg-white/75'
                }`}
              />
              {hud.targetHitbox && (
                <div className="absolute top-[54%] left-1/2 -translate-x-1/2 w-64 sm:w-72 rounded-xl bg-stone-950/90 border border-stone-700/85 px-3 py-2 shadow-2xl space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {hud.targetHitbox.isBoss && (
                        <Skull className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      )}
                      <span className="font-bold text-stone-100 truncate">
                        {hud.targetHitbox.name}
                      </span>
                      {hud.targetHitbox.isBoss && (
                        <span className="px-1 py-0.5 rounded bg-red-950 border border-red-600/70 text-[9px] font-bold text-red-300 uppercase shrink-0">
                          Boss
                        </span>
                      )}
                    </div>
                    <span className="font-mono-tabular text-stone-400 shrink-0">
                      {hud.targetHitbox.distance.toFixed(1)}m
                    </span>
                  </div>

                  {/* Target Health Bar */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-stone-800 overflow-hidden">
                      <div
                        className="h-full bg-red-500 transition-all duration-100"
                        style={{
                          width: `${Math.max(0, Math.min(100, (hud.targetHitbox.hp / Math.max(1, hud.targetHitbox.maxHp)) * 100))}%`,
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-mono-tabular text-stone-300 shrink-0">
                      {Math.ceil(hud.targetHitbox.hp)}/{hud.targetHitbox.maxHp}
                    </span>
                  </div>

                  {/* Body Zone + Armor Material Tier + Debuff Badges */}
                  <div className="flex flex-wrap items-center gap-1 text-[10px] font-semibold">
                    <span className="px-1.5 py-0.5 rounded bg-stone-800 border border-stone-600 text-amber-300 uppercase">
                      Zone: {hud.targetHitbox.zone}
                    </span>
                    {hud.targetHitbox.armorTier !== 'none' &&
                    hud.targetHitbox.armorHp > 0 ? (
                      <span className="px-1.5 py-0.5 rounded bg-stone-900 border border-stone-500/80 text-stone-200 flex items-center gap-1 uppercase font-mono-tabular">
                        <ShieldAlert className="w-3 h-3 text-amber-400" />
                        {hud.targetHitbox.armorTier}{' '}
                        {Math.ceil(hud.targetHitbox.armorHp)}/
                        {hud.targetHitbox.armorMaxHp}
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-950/90 border border-emerald-600/70 text-emerald-300 flex items-center gap-1 uppercase">
                        <ShieldOff className="w-3 h-3" />
                        {hud.targetHitbox.armorMaxHp > 0
                          ? 'Armor Shattered'
                          : 'Unarmored'}
                      </span>
                    )}
                    {hud.targetHitbox.blinded && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-950/90 border border-amber-500 text-amber-200 flex items-center gap-1 uppercase">
                        <EyeOff className="w-3 h-3" />
                        Blinded
                      </span>
                    )}
                    {hud.targetHitbox.staggered && (
                      <span className="px-1.5 py-0.5 rounded bg-sky-950/90 border border-sky-500 text-sky-200 uppercase">
                        Staggered
                      </span>
                    )}
                  </div>

                  {/* Weapon Material Reaction Hint */}
                  <div
                    className={`text-[10px] font-semibold leading-tight ${
                      hud.targetHitbox.isGapSlip ||
                      hud.targetHitbox.reactionHint.includes('Shatter') ||
                      hud.targetHitbox.reactionHint.includes('CRIT') ||
                      hud.targetHitbox.reactionHint.includes('Unarmored')
                        ? 'text-emerald-300'
                        : hud.targetHitbox.reactionHint.includes('Deflect') ||
                            hud.targetHitbox.reactionHint.includes('Ricochet')
                          ? 'text-red-300'
                          : 'text-amber-200'
                    }`}
                  >
                    {hud.targetHitbox.reactionHint}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Top Row: Vitals (Left), Active Objective (Center), Menu Buttons (Right) */}
          <div className="flex flex-wrap lg:flex-nowrap items-start justify-between gap-2">
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

              {/* Body Temperature, Visibility & Resource Summary (Collapsible) */}
              <div className="pt-1 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setTelemetryExpanded(!telemetryExpanded)}
                  className="w-full flex items-center justify-between text-[11px] text-stone-400 hover:text-stone-200 py-0.5"
                >
                  <span className="font-semibold">Telemetry &amp; Stats</span>
                  {telemetryExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
                {telemetryExpanded && (
                  <div className="space-y-1 text-[11px] font-mono-tabular text-stone-300 pt-1 border-t border-stone-800/60 mt-1">
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
                        title="Player Visibility"
                      >
                        <Eye className="w-3 h-3" />
                        Vis {hud.visibilityPercent}%
                      </span>
                    </div>
                    {!settings.compactHud && (
                      <div className="flex items-center justify-between text-stone-400">
                        <span>W:{countOf('wood')}</span>
                        <span>S:{countOf('stone')}</span>
                        <span className="text-amber-300 flex items-center gap-0.5">
                          <Coins className="w-3 h-3" />
                          {hud.coins}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Top-Center Horizontal Compass & Active Objective Tracker */}
            <div className="flex flex-col items-center gap-1.5 max-w-sm">
              {settings.showCompass !== false && (
                <CompassStrip playerYaw={hud.playerYaw} />
              )}
              {hud.objectiveText && (
                <div className="pointer-events-auto px-4 py-1.5 rounded-xl bg-stone-950/90 border border-amber-500/60 shadow-xl text-center">
                  <div className="text-[10px] font-bold text-amber-300 uppercase tracking-wide">
                    Active Objective
                  </div>
                  <div className="text-xs text-stone-100 font-medium">
                    {hud.objectiveText}
                  </div>
                </div>
              )}
            </div>

            {/* Top-Right HUD Action Triggers / Menu / Exit Car / Mic Toggle / Xbox Active Speaker Badges */}
            <div className="pointer-events-auto flex flex-col items-end gap-1.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const muted = engineRef.current?.toggleMicMute();
                    pushToast({
                      id: `mic_${Date.now()}`,
                      text: muted ? 'Microphone Muted' : 'Microphone Unmuted',
                      tone: muted ? 'warning' : 'craft',
                    });
                  }}
                  className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 shadow-lg transition ${
                    hud.multiplayerState?.micMuted
                      ? 'bg-red-950/90 border-red-500 text-red-200'
                      : hud.multiplayerState?.localSpeaking
                        ? 'bg-emerald-500 border-emerald-200 text-stone-950 shadow-emerald-500/40 animate-pulse'
                        : 'bg-emerald-950/90 border-emerald-500/60 text-emerald-200'
                  }`}
                  title="Toggle Mic (M or D-Pad Down)"
                >
                  {hud.multiplayerState?.micMuted ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                  <span>
                    {hud.multiplayerState?.micMuted
                      ? 'MUTED'
                      : hud.multiplayerState?.localSpeaking
                        ? 'SPEAKING'
                        : 'MIC ON'}
                  </span>
                </button>

                {hud?.activeVehicle ? (
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      engineRef.current?.exitVehicle();
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      engineRef.current?.exitVehicle();
                    }}
                    className="pointer-events-auto px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 active:bg-amber-400 text-stone-950 font-display font-extrabold text-xs sm:text-sm shadow-2xl border-2 border-amber-200 flex items-center gap-1.5 transition cursor-pointer"
                    style={{ position: 'relative', zIndex: 60 }}
                    title="Exit Vehicle (E)"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>EXIT CAR [E]</span>
                  </button>
                ) : hud?.seatedLabel ? (
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      engineRef.current?.standUp();
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      engineRef.current?.standUp();
                    }}
                    className="pointer-events-auto px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-stone-950 font-display font-extrabold text-xs sm:text-sm shadow-2xl border-2 border-sky-200 flex items-center gap-1.5 transition cursor-pointer"
                    style={{ position: 'relative', zIndex: 60 }}
                  >
                    <LogOut className="w-4 h-4" />
                    <span>STAND UP</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveModal('menu_drawer');
                      engineRef.current?.setMode('paused');
                    }}
                    className="px-4 py-2 rounded-xl bg-amber-600/90 hover:bg-amber-500 text-stone-950 font-display font-bold text-sm flex items-center gap-2 shadow-lg border border-amber-400/60 transition"
                  >
                    <Settings className="w-4 h-4" />
                    <span>MENU</span>
                  </button>
                )}
              </div>

              {/* Xbox-Style Active Speaker Indicator Stack (HUD Party/Proximity Voice) */}
              {hud.multiplayerState &&
                (hud.multiplayerState.localSpeaking ||
                  (hud.multiplayerState.speakingPeers?.length ?? 0) > 0) && (
                  <div className="flex flex-col items-end gap-1 pointer-events-none">
                    {hud.multiplayerState.localSpeaking && (
                      <div className="px-2.5 py-1 rounded-lg bg-stone-950/90 border border-emerald-400/80 shadow-[0_0_12px_rgba(16,185,129,0.45)] flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                        <AudioLines className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                        <span>{hud.multiplayerState.playerName}</span>
                      </div>
                    )}
                    {hud.multiplayerState.speakingPeers?.map((pid) => {
                      const peer = hud.multiplayerState?.peers.find((p) => p.peerId === pid);
                      return (
                        <div
                          key={pid}
                          className="px-2.5 py-1 rounded-lg bg-stone-950/90 border border-emerald-400/80 shadow-[0_0_12px_rgba(16,185,129,0.45)] flex items-center gap-1.5 text-xs font-bold text-emerald-300"
                        >
                          <AudioLines className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                          <span>{peer?.name || 'Survivor'}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
            </div>
          </div>

          {/* Upper Status Badges & Resource Toasts (Clear of Bottom Touch Controls & Empty Hands Banner) */}
          <div className="flex flex-col items-center gap-1.5 mt-1 mb-auto pointer-events-none">
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {hud.isSheltered && (
                <div className="px-2.5 py-0.5 rounded-lg bg-emerald-950/85 border border-emerald-700/60 text-[11px] font-medium text-emerald-200 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Sheltered</span>
                </div>
              )}
              {hud.cozyComfort?.active && (
                <button
                  type="button"
                  onClick={() => openModal('tv')}
                  className="pointer-events-auto px-2.5 py-0.5 rounded-lg bg-amber-950/90 hover:bg-amber-900 border border-amber-500/65 text-[11px] font-medium text-amber-200 flex items-center gap-1.5 transition"
                  title="Open Smart TV Remote"
                >
                  <Tv className="w-3.5 h-3.5 text-amber-300" />
                  <span>Cozy Base · Watch TV</span>
                </button>
              )}
              {hud.nearFire && (
                <div className="px-2.5 py-0.5 rounded-lg bg-orange-950/85 border border-orange-700/60 text-[11px] font-medium text-orange-200 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5" />
                  <span>Fire Warmth</span>
                </div>
              )}
              {hud.isCrouching && (
                <div className="px-2.5 py-0.5 rounded-lg bg-stone-900/90 border border-stone-600 text-[11px] font-medium text-stone-200">
                  Crouching (Stealth)
                </div>
              )}
              {hud.isNight && hud.nocturnalActiveCount > 0 && (
                <div className="px-2.5 py-0.5 rounded-lg bg-indigo-950/85 border border-indigo-700/60 text-[11px] font-medium text-indigo-200 flex items-center gap-1.5">
                  <Moon className="w-3.5 h-3.5" />
                  <span>Nocturnal Stalkers Active</span>
                </div>
              )}
              {hud.structuralSummary && hud.structuralSummary.bucklingCount > 0 && (
                <div className="px-2.5 py-0.5 rounded-lg bg-red-950/90 border border-red-600/80 text-[11px] font-bold text-red-200 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                  <span>
                    Structural Buckling ({hud.structuralSummary.bucklingCount})
                  </span>
                </div>
              )}
              {hud.terrainSummary &&
                (hud.terrainSummary.activeWaterStreams > 0 ||
                  (hud.terrainSummary.puddleCount ?? 0) > 0) && (
                  <div className="px-2.5 py-0.5 rounded-lg bg-sky-950/85 border border-sky-700/70 text-[11px] font-medium text-sky-200 flex items-center gap-1.5 font-mono-tabular">
                    <Waves className="w-3.5 h-3.5 text-sky-400" />
                    <span>
                      {hud.terrainSummary.activeWaterStreams > 0
                        ? `Fluid Erosion${(hud.terrainSummary.puddleCount ?? 0) > 0 ? ` · ${hud.terrainSummary.puddleCount} Puddles` : ''}`
                        : `Rainwater Pooling (${hud.terrainSummary.puddleCount})`}
                    </span>
                  </div>
                )}
              {hud.momentumState?.wallRunning && (
                <div className="px-2.5 py-0.5 rounded-lg bg-emerald-950/90 border border-emerald-500/80 text-[11px] font-bold text-emerald-200 flex items-center gap-1.5">
                  <Footprints className="w-3.5 h-3.5 text-emerald-300" />
                  <span>
                    Wall-Run ({hud.momentumState.wallSide < 0 ? 'Left' : 'Right'}) · Space Wall-Kick
                  </span>
                </div>
              )}
              {hud.momentumState?.vaulting && (
                <div className="px-2.5 py-0.5 rounded-lg bg-sky-950/90 border border-sky-500/80 text-[11px] font-bold text-sky-200 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-sky-300" />
                  <span>Obstacle Vault</span>
                </div>
              )}
              {hud.momentumState?.nearCaveBoss && (
                <div className="px-2.5 py-0.5 rounded-lg bg-red-950/90 border border-red-500/80 text-[11px] font-bold text-amber-200 flex items-center gap-1.5">
                  <Skull className="w-3.5 h-3.5 text-red-400" />
                  <span>
                    Cave Boss Lair · Shoot/Strike Glowing Ceiling Stalactites to Crush Armor!
                  </span>
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

          {/* Bottom-Center Contextual Prompt + Seated Stand Up + Collect Carcass + Equipped Readout + 6-Slot Quick Hotbar */}
          <div className="flex flex-col items-center gap-1.5 pb-1">
            <div className="flex flex-wrap items-center justify-center gap-2">
              {hud.seatedLabel && !activeModal && (
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => engineRef.current?.standUp()}
                  className="pointer-events-auto min-h-[44px] px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-stone-950 font-bold text-xs sm:text-sm shadow-xl flex items-center gap-2 whitespace-nowrap shrink-0"
                >
                  <span>{hud.seatedLabel} · Stand Up</span>
                  <span className="hidden sm:inline text-[11px] px-1.5 py-0.5 rounded bg-stone-950/20 font-mono-tabular">
                    Space / WASD
                  </span>
                </button>
              )}

              {hud.nearbyCarcass && !activeModal && (
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() =>
                    engineRef.current?.collectNearbyCarcass(hud.nearbyCarcass!.id)
                  }
                  className="pointer-events-auto min-h-[44px] px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-300 border border-emerald-200 text-stone-950 font-bold text-xs sm:text-sm shadow-xl flex items-center gap-2 whitespace-nowrap shrink-0"
                  title="Collect & prepare this hunted carcass for meat and hide (F)"
                >
                  <PackagePlus className="w-4 h-4 shrink-0" />
                  <span>
                    Collect {hud.nearbyCarcass.displayName} ({hud.nearbyCarcass.summary})
                  </span>
                  <span className="hidden sm:inline text-[11px] px-1.5 py-0.5 rounded bg-stone-950/20 font-mono-tabular">
                    F
                  </span>
                </button>
              )}

              {hud.nearbyInteraction &&
                !activeModal &&
                hud.nearbyInteraction.kind !== 'carcass' && (
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
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
                    ) : hud.nearbyInteraction.actionCategory === 'attack' ? (
                      <Swords className="w-4 h-4" />
                    ) : hud.nearbyInteraction.actionCategory === 'harvest' ? (
                      <Utensils className="w-4 h-4" />
                    ) : hud.nearbyInteraction.actionCategory === 'clean' ? (
                      <Droplets className="w-4 h-4" />
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
            </div>

            {/* Active Vehicle Driving HUD (Lowrider Hydraulics, DONK 30" Clearance, SLAB Trunk Bass, Aircraft Flight) */}
            {hud.activeVehicle && !activeModal && (
              <div
                onPointerDown={(e) => e.stopPropagation()}
                className="pointer-events-auto relative z-30 w-[min(95vw,600px)] rounded-2xl bg-stone-950/92 border border-amber-500/50 px-3.5 py-2.5 shadow-2xl space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0">
                      <Car className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-bold text-stone-100 truncate flex items-center gap-1.5">
                        <span>{hud.activeVehicle.name}</span>
                        {hud.activeVehicle.highClearance && (
                          <span className="px-1.5 py-0.5 rounded bg-sky-950 border border-sky-500/60 text-[9px] font-bold text-sky-300 uppercase shrink-0">
                            30&quot; Lifted
                          </span>
                        )}
                        {hud.activeVehicle.inWater && (
                          <span className="px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/60 text-[9px] font-bold text-cyan-300 uppercase shrink-0">
                            Fording Water
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono-tabular text-stone-400 flex items-center gap-2.5">
                        <span className="text-amber-300 font-bold">
                          {hud.activeVehicle.speedKmh} km/h
                        </span>
                        <span>Fuel {hud.activeVehicle.fuel}%</span>
                        <span>
                          HP {hud.activeVehicle.hp}/{hud.activeVehicle.maxHp}
                        </span>
                        {hud.activeVehicle.canFly && (
                          <span className="text-yellow-300">
                            Alt {hud.activeVehicle.altitudeM}m
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        engineRef.current?.openVehicleCargo(hud.activeVehicle!.id);
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        engineRef.current?.openVehicleCargo(hud.activeVehicle!.id);
                      }}
                      className="min-h-[36px] px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-100 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                      title="Vehicle Cargo (F)"
                    >
                      <Box className="w-3.5 h-3.5 text-amber-300" />
                      <span>Cargo [F]</span>
                    </button>
                    <button
                      type="button"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        engineRef.current?.exitVehicle();
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        engineRef.current?.exitVehicle();
                      }}
                      className="min-h-[36px] px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 active:bg-amber-400 text-stone-950 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                      title="Exit Vehicle (E)"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Exit [E]</span>
                    </button>
                  </div>
                </div>

                {hud.activeVehicle.hasHydraulics && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-stone-800">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1 mr-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>
                        {hud.activeVehicle.hydraulicStyle === 'up_down_side'
                          ? 'DONK Hydraulics (Up / Down / Side)'
                          : 'Lowrider High-Bounce'}
                      </span>
                    </span>
                    {hud.activeVehicle.hydraulicStyle === 'up_down_side' ? (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            engineRef.current?.triggerHydraulicAction('lock_up')
                          }
                          className={`min-h-[34px] px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 transition ${
                            hud.activeVehicle.hydraulicMode === 'lock_up'
                              ? 'bg-sky-500 border-sky-200 text-stone-950'
                              : 'bg-stone-900 hover:bg-stone-800 border-stone-700 text-stone-200'
                          }`}
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                          <span>Up [Space]</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            engineRef.current?.triggerHydraulicAction('drop')
                          }
                          className={`min-h-[34px] px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 transition ${
                            hud.activeVehicle.hydraulicMode === 'drop_down'
                              ? 'bg-sky-500 border-sky-200 text-stone-950'
                              : 'bg-stone-900 hover:bg-stone-800 border-stone-700 text-stone-200'
                          }`}
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                          <span>Down [Z]</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            engineRef.current?.triggerHydraulicAction('left_tilt')
                          }
                          className={`min-h-[34px] px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 transition ${
                            hud.activeVehicle.hydraulicMode === 'left_tilt'
                              ? 'bg-amber-500 border-amber-300 text-stone-950'
                              : 'bg-stone-900 hover:bg-stone-800 border-stone-700 text-stone-200'
                          }`}
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                          <span>Side L [Q]</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            engineRef.current?.triggerHydraulicAction('right_tilt')
                          }
                          className={`min-h-[34px] px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 transition ${
                            hud.activeVehicle.hydraulicMode === 'right_tilt'
                              ? 'bg-amber-500 border-amber-300 text-stone-950'
                              : 'bg-stone-900 hover:bg-stone-800 border-stone-700 text-stone-200'
                          }`}
                        >
                          <span>Side R [R]</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            engineRef.current?.triggerHydraulicAction('front_hop')
                          }
                          className="min-h-[34px] px-2.5 py-1 rounded-lg bg-purple-950/90 hover:bg-purple-700 border border-purple-500/60 text-purple-100 text-[11px] font-bold flex items-center gap-1 transition"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                          <span>Front Hop [Space]</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            engineRef.current?.triggerHydraulicAction('rear_hop')
                          }
                          className="min-h-[34px] px-2.5 py-1 rounded-lg bg-purple-950/90 hover:bg-purple-700 border border-purple-500/60 text-purple-100 text-[11px] font-bold flex items-center gap-1 transition"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                          <span>Rear Hop [Z]</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            engineRef.current?.triggerHydraulicAction('left_tilt')
                          }
                          className={`min-h-[34px] px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 transition ${
                            hud.activeVehicle.hydraulicMode === 'left_tilt'
                              ? 'bg-amber-500 border-amber-300 text-stone-950'
                              : 'bg-stone-900 hover:bg-stone-800 border-stone-700 text-stone-200'
                          }`}
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                          <span>Tilt L [Q]</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            engineRef.current?.triggerHydraulicAction('right_tilt')
                          }
                          className={`min-h-[34px] px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 transition ${
                            hud.activeVehicle.hydraulicMode === 'right_tilt'
                              ? 'bg-amber-500 border-amber-300 text-stone-950'
                              : 'bg-stone-900 hover:bg-stone-800 border-stone-700 text-stone-200'
                          }`}
                        >
                          <span>Tilt R [R]</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            engineRef.current?.triggerHydraulicAction('lock_up')
                          }
                          className={`min-h-[34px] px-2.5 py-1 rounded-lg border text-[11px] font-bold transition ${
                            hud.activeVehicle.hydraulicMode === 'lock_up'
                              ? 'bg-purple-500 border-purple-200 text-stone-950'
                              : 'bg-stone-900 hover:bg-stone-800 border-stone-700 text-stone-200'
                          }`}
                        >
                          Lock-Up [X]
                        </button>
                      </>
                    )}
                  </div>
                )}

                {hud.activeVehicle.hasTrunkBass && (
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-stone-800">
                    <span className="text-[11px] text-stone-300">
                      Swanger Elbows &amp; Candy Trunk Sub-Bass Audio
                    </span>
                    <button
                      type="button"
                      onClick={() => engineRef.current?.toggleTrunkBass()}
                      className={`min-h-[34px] px-3 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 transition ${
                        hud.activeVehicle.trunkBassOn
                          ? 'bg-pink-600 border-pink-300 text-white shadow-lg'
                          : 'bg-stone-900 hover:bg-stone-800 border-stone-700 text-stone-200'
                      }`}
                    >
                      {hud.activeVehicle.trunkBassOn ? (
                        <Volume2 className="w-3.5 h-3.5" />
                      ) : (
                        <VolumeX className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {hud.activeVehicle.trunkBassOn
                          ? 'Trunk Bass: SLAMMING [T]'
                          : 'Trunk Bass OFF [T]'}
                      </span>
                    </button>
                  </div>
                )}

                {hud.activeVehicle.canFly && (
                  <div className="flex items-center gap-2 pt-1.5 border-t border-stone-800">
                    <button
                      type="button"
                      onPointerDown={() =>
                        engineRef.current?.setVehicleVerticalHold('up')
                      }
                      onPointerUp={() =>
                        engineRef.current?.setVehicleVerticalHold(null)
                      }
                      onPointerLeave={() =>
                        engineRef.current?.setVehicleVerticalHold(null)
                      }
                      className="min-h-[34px] px-3 py-1 rounded-lg bg-sky-900 hover:bg-sky-800 border border-sky-500/60 text-sky-100 text-[11px] font-bold flex items-center gap-1"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                      <span>Ascend [Space]</span>
                    </button>
                    <button
                      type="button"
                      onPointerDown={() =>
                        engineRef.current?.setVehicleVerticalHold('down')
                      }
                      onPointerUp={() =>
                        engineRef.current?.setVehicleVerticalHold(null)
                      }
                      onPointerLeave={() =>
                        engineRef.current?.setVehicleVerticalHold(null)
                      }
                      className="min-h-[34px] px-3 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-600 text-stone-200 text-[11px] font-bold flex items-center gap-1"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                      <span>Descend [C]</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Current Equipped Item Indicator + Strictly Scoped Quick Actions (Hidden while driving) */}
            {!hud.activeVehicle && (() => {
              const eqId =
                hud.equippedSlot >= 0
                  ? hud.hotbarItemIds[hud.equippedSlot]
                  : null;
              const eqDef = eqId && countOf(eqId) > 0 ? ITEMS[eqId] : null;
              const weaponActive = isActiveWeaponItem(eqDef?.id);
              const gunState =
                eqDef && isFirearmItem(eqDef.id) ? hud.equippedWeaponState : null;
              const dirtyBottleCount = countOf('dirty_water_bottle');
              const filteredBottleCount = countOf('filtered_water_bottle');
              return (
                <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-1.5">
                  <div className="px-3 py-1 rounded-lg bg-stone-950/85 border border-stone-700/75 text-[11px] text-stone-200 flex items-center gap-2 shadow-md">
                    {eqDef ? (
                      <>
                        <ItemIcon itemId={eqDef.id} className="w-3.5 h-3.5 shrink-0" />
                        <span className="font-semibold text-amber-300">
                          {eqDef.name}
                        </span>
                        {gunState ? (
                          <div className="flex items-center gap-2 font-mono-tabular">
                            <span
                              className={
                                gunState.magCurrent === 0
                                  ? 'text-red-400 font-bold'
                                  : 'text-stone-200 font-bold'
                              }
                            >
                              {gunState.magCurrent}/{gunState.magMax}
                            </span>
                            <span className="text-stone-400">
                              / {gunState.reserveAmmo} · {gunState.caliberLabel}
                            </span>
                            {gunState.isReloading && (
                              <span className="inline-flex items-center gap-1.5 text-amber-300">
                                <span>Reloading</span>
                                <span className="w-12 h-1.5 rounded-full bg-stone-800 overflow-hidden inline-block">
                                  <span
                                    className="block h-full bg-amber-400 transition-all duration-75"
                                    style={{
                                      width: `${Math.round(gunState.reloadProgress * 100)}%`,
                                    }}
                                  />
                                </span>
                              </span>
                            )}
                          </div>
                        ) : eqDef.id === 'primitive_bow' ? (
                          <span className="text-stone-400 font-mono-tabular">
                            · DMG {eqDef.attackDamage} · {countOf('arrows')} arrows
                          </span>
                        ) : eqDef.preferredResource && !weaponActive ? (
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
                      <span className="text-stone-300 flex items-center gap-1.5">
                        <Hand className="w-3.5 h-3.5 text-amber-300" />
                        <span className="sm:hidden">Empty Hands</span>
                        <span className="hidden sm:inline">
                          Bare Hands (Gather, Cook &amp; Carcasses)
                        </span>
                      </span>
                    )}
                  </div>
                  {gunState &&
                    !gunState.isReloading &&
                    gunState.magCurrent < gunState.magMax &&
                    gunState.reserveAmmo > 0 && (
                      <button
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => engineRef.current?.reloadEquippedWeapon()}
                        className="px-2.5 py-1 rounded-lg bg-amber-950/90 hover:bg-amber-600 hover:text-stone-950 border border-amber-500/70 text-amber-200 font-bold text-[11px] shadow-md flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors"
                        title="Reload firearm (R)"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                        <span>Reload [R]</span>
                      </button>
                    )}
                  {!showTouchControls && (
                    <button
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => engineRef.current?.triggerDebrisKick()}
                      disabled={(hud.momentumState?.kickCooldown ?? 0) > 0}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] shadow-md flex items-center gap-1 whitespace-nowrap shrink-0 border transition-colors ${
                        (hud.momentumState?.kickCooldown ?? 0) > 0
                          ? 'bg-stone-900/75 border-stone-700 text-stone-500 cursor-not-allowed'
                          : 'bg-stone-900/90 hover:bg-amber-600 hover:text-stone-950 border-amber-500/60 text-amber-300'
                      }`}
                      title="Kick dust & gravel debris into enemies' faces to blind them & open armor gaps (V)"
                    >
                      <Footprints className="w-3.5 h-3.5" />
                      <span>
                        {(hud.momentumState?.kickCooldown ?? 0) > 0
                          ? `Kick ${hud.momentumState?.kickCooldown.toFixed(1)}s`
                          : 'Kick Debris [V]'}
                      </span>
                    </button>
                  )}
                  {!weaponActive &&
                    dirtyBottleCount > 0 &&
                    (eqDef?.id === 'dirty_water_bottle' || !eqDef) && (
                      <button
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => engineRef.current?.cleanAndFilterWaterBottle()}
                        className={`px-2.5 py-1 rounded-lg font-bold text-[11px] shadow-md flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors ${
                          hud.nearOceanWater
                            ? 'bg-sky-500 hover:bg-sky-400 text-stone-950'
                            : 'bg-sky-950/85 hover:bg-sky-900 border border-sky-700/70 text-sky-200'
                        }`}
                        title="Clean your water bottle in ocean water and fill it with filtered water"
                      >
                        <Droplets className="w-3.5 h-3.5" />
                        <span>
                          {hud.nearOceanWater ? 'Clean Water Bottle' : 'Clean Bottle (Ocean)'}
                        </span>
                      </button>
                    )}
                  {!weaponActive &&
                    filteredBottleCount > 0 &&
                    (eqDef?.id === 'filtered_water_bottle' ||
                      (!eqDef && hud.vitals.thirst < 95)) && (
                      <button
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() =>
                          engineRef.current?.useOrEquipItem('filtered_water_bottle')
                        }
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-bold text-[11px] shadow-md flex items-center gap-1 whitespace-nowrap shrink-0"
                        title="Drink filtered water (+55 Thirst)"
                      >
                        <Droplets className="w-3.5 h-3.5" />
                        <span>Drink ({filteredBottleCount})</span>
                      </button>
                    )}
                  {!weaponActive &&
                    eqDef &&
                    eqDef.structuralKind &&
                    hud.structuralSummary?.previewStressPercent !== null &&
                    hud.structuralSummary?.previewStressPercent !== undefined && (
                      <>
                        <div
                          className={`px-2.5 py-1 rounded-lg font-bold text-[11px] border shadow-md flex items-center gap-1.5 whitespace-nowrap shrink-0 font-mono-tabular ${
                            hud.structuralSummary.previewStressPercent >= 100
                              ? 'bg-red-950/90 border-red-500 text-red-200'
                              : hud.structuralSummary.previewStressPercent >= 55
                                ? 'bg-amber-950/90 border-amber-500 text-amber-200'
                                : 'bg-emerald-950/90 border-emerald-500 text-emerald-200'
                          }`}
                          title="Real-time structural bending & compression load at target snap point"
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>
                            {hud.structuralSummary.previewStressPercent >= 100
                              ? `OVERLOAD ${hud.structuralSummary.previewStressPercent}% — Add Pillar/Arch!`
                              : `Load ${hud.structuralSummary.previewStressPercent}%`}
                          </span>
                        </div>
                        <button
                          type="button"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={() => engineRef.current?.rotateBuildPiece()}
                          className="px-2.5 py-1 rounded-lg bg-stone-900/90 hover:bg-stone-800 border border-stone-600 text-stone-100 font-semibold text-[11px] shadow-md flex items-center gap-1 whitespace-nowrap shrink-0"
                          title="Rotate structural piece 90 degrees (R)"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                          <span>Rotate [R]</span>
                        </button>
                      </>
                    )}
                  {!weaponActive &&
                    eqDef &&
                    eqDef.category !== 'tool' &&
                    eqDef.category !== 'equipment' &&
                    !isAmmoItem(eqDef.id) && (
                      <button
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => engineRef.current?.placeItemInWorld(eqDef.id)}
                        className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-[11px] shadow-md flex items-center gap-1 whitespace-nowrap shrink-0"
                        title={`Place ${eqDef.name} in front of you`}
                      >
                        <PackageOpen className="w-3.5 h-3.5" />
                        <span>
                          {eqDef.structuralKind
                            ? 'Build Span'
                            : eqDef.structureType
                              ? 'Build'
                              : eqDef.id === 'powder_keg'
                                ? 'Throw Keg'
                                : eqDef.id === 'water_torrent'
                                  ? 'Release Torrent'
                                  : 'Set Down'}
                        </span>
                      </button>
                    )}
                </div>
              );
            })()}

            {/* HUD Bar Manager Popover (Expand up to 5,000 + Empty HUD Bar + Slot Jump) */}
            {hudManagerOpen && (
              <div
                onPointerDown={(e) => e.stopPropagation()}
                className="pointer-events-auto mb-1 w-[min(94vw,430px)] rounded-xl bg-stone-950/95 border border-amber-500/60 p-3 shadow-2xl space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-bold text-amber-300">
                    HUD Bar Capacity: {hud.hotbarItemIds.length.toLocaleString()} /{' '}
                    {(hud.maxHudBarCapacity ?? 5000).toLocaleString()} Items
                  </div>
                  <div className="text-[10px] font-mono-tabular text-emerald-300">
                    {(hud.emptyCompartmentsCount ?? 1_000_005_000).toLocaleString()} Empty Compartments
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => engineRef.current?.expandHudBar(10, false)}
                    className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-[11px] font-mono-tabular font-semibold text-stone-100"
                  >
                    +10
                  </button>
                  <button
                    type="button"
                    onClick={() => engineRef.current?.expandHudBar(100, false)}
                    className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-[11px] font-mono-tabular font-semibold text-stone-100"
                  >
                    +100
                  </button>
                  <button
                    type="button"
                    onClick={() => engineRef.current?.expandHudBar(1000, false)}
                    className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-[11px] font-mono-tabular font-semibold text-stone-100"
                  >
                    +1,000
                  </button>
                  <button
                    type="button"
                    onClick={() => engineRef.current?.expandHudBar(5000, true)}
                    className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-[11px] font-mono-tabular font-bold text-stone-950"
                  >
                    Expand to 5,000
                  </button>
                  <button
                    type="button"
                    onClick={() => engineRef.current?.emptyAllHudBarToCompartments()}
                    className="ml-auto px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-[11px] font-bold text-stone-50 flex items-center gap-1"
                  >
                    <ArrowDownToLine className="w-3.5 h-3.5" />
                    <span>Empty All → Pack</span>
                  </button>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-stone-800">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={1}
                      max={hud.hotbarItemIds.length}
                      value={hudSlotJumpInput}
                      onChange={(e) => setHudSlotJumpInput(e.target.value)}
                      placeholder={`Jump 1–${hud.hotbarItemIds.length}`}
                      className="w-28 px-2 py-1 rounded bg-stone-900 border border-stone-700 text-[11px] font-mono-tabular text-stone-100"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const target = parseInt(hudSlotJumpInput, 10);
                        if (!Number.isNaN(target) && target >= 1 && target <= hud.hotbarItemIds.length) {
                          const slotIdx = target - 1;
                          setHudWindowStart(
                            Math.min(
                              Math.max(0, hud.hotbarItemIds.length - HUD_BAR_WINDOW),
                              slotIdx,
                            ),
                          );
                          engineRef.current?.selectHotbarSlot(slotIdx);
                        }
                      }}
                      className="px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-[11px] font-semibold text-amber-300"
                    >
                      Go Slot
                    </button>
                  </div>
                  {hud.equippedSlot >= 0 && hud.hotbarItemIds[hud.equippedSlot] && (
                    <button
                      type="button"
                      onClick={() =>
                        engineRef.current?.moveHotbarSlotToCompartment(hud.equippedSlot)
                      }
                      className="px-2.5 py-1 rounded bg-emerald-900/80 hover:bg-emerald-800 border border-emerald-600/60 text-[11px] font-semibold text-emerald-200"
                    >
                      Drop Equipped → Compartment
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Bare Hands Toggle + Windowed HUD Bar (Hidden while driving) */}
            {!hud.activeVehicle && (
            <div
              data-hud-hotbar="true"
              className="pointer-events-auto flex items-center gap-1 p-1.5 rounded-xl bg-stone-950/92 border border-stone-700/80 shadow-xl max-w-[calc(100vw-20px)] overflow-x-auto survival-scroll"
              title="Drag any HUD slot to the Compartment drop icon (or right-click) to move it to your 1B+ Backpack Compartments"
            >
              <button
                type="button"
                aria-label="Bare Hands"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => engineRef.current?.selectHotbarSlot(-1)}
                className={`relative w-11 h-11 sm:w-12 sm:h-12 shrink-0 rounded-lg border flex flex-col items-center justify-center transition-colors ${
                  hud.equippedSlot === -1
                    ? 'bg-amber-950/75 border-amber-400 text-amber-300'
                    : 'bg-stone-900 border-stone-800 hover:border-stone-600 text-stone-400'
                }`}
                title="Bare Hands (0) — Gather, interact, cook & prepare carcasses"
              >
                <span className="absolute top-0.5 left-1 text-[9px] font-mono-tabular text-stone-500">
                  0
                </span>
                <Hand className="w-4 h-4" />
                <span className="text-[9px] font-semibold leading-none mt-0.5">
                  Hands
                </span>
              </button>

              <button
                type="button"
                aria-label="Previous HUD Slot"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => {
                  if (hud.hotbarItemIds.length > HUD_BAR_WINDOW && hudWindowStart > 0) {
                    setHudWindowStart((p) => Math.max(0, p - HUD_BAR_WINDOW));
                  } else {
                    engineRef.current?.cycleHotbarSlot(-1);
                  }
                }}
                className="w-6 h-11 sm:h-12 shrink-0 rounded-lg bg-stone-900/90 hover:bg-stone-800 border border-stone-800 hover:border-stone-600 text-stone-300 flex items-center justify-center transition-colors"
                title="Scroll Previous Slots"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div
                ref={hotbarScrollRef}
                onPointerDown={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 overflow-x-auto survival-scroll pb-1 min-w-0 max-w-[min(44vw,260px)] sm:max-w-[360px] md:max-w-[474px] snap-x snap-mandatory"
              >
                {(() => {
                  const clampedStart = Math.min(
                    hudWindowStart,
                    Math.max(0, hud.hotbarItemIds.length - HUD_BAR_WINDOW),
                  );
                  return hud.hotbarItemIds
                    .slice(clampedStart, clampedStart + HUD_BAR_WINDOW)
                    .map((itemId, localIdx) => {
                      const idx = clampedStart + localIdx;
                      const isSelected = hud.equippedSlot === idx;
                      const qty = itemId ? countOf(itemId) : 0;
                      return (
                        <button
                          key={idx}
                          ref={(el) => {
                            slotButtonRefs.current[localIdx] = el;
                          }}
                          draggable={Boolean(itemId && qty > 0)}
                          onDragStart={(e) => {
                            if (!itemId) return;
                            e.dataTransfer.setData('text/hud-slot', String(idx));
                            setDraggingHudSlot(idx);
                          }}
                          onDragEnd={() => {
                            setDraggingHudSlot(null);
                            setHudDropHover(false);
                          }}
                          onContextMenu={(e) => {
                            if (itemId && qty > 0) {
                              e.preventDefault();
                              engineRef.current?.moveHotbarSlotToCompartment(idx);
                            }
                          }}
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={() => {
                            if (
                              isSelected &&
                              itemId &&
                              qty > 0 &&
                              ITEMS[itemId].category === 'food'
                            ) {
                              engineRef.current?.useOrEquipItem(itemId);
                            } else {
                              engineRef.current?.selectHotbarSlot(idx);
                            }
                          }}
                          className={`relative w-11 h-11 sm:w-12 sm:h-12 shrink-0 snap-center rounded-lg border flex flex-col items-center justify-center transition-colors ${
                            isSelected
                              ? 'bg-amber-950/75 border-amber-400'
                              : 'bg-stone-900 border-stone-800 hover:border-stone-600'
                          }`}
                          title={
                            itemId && qty > 0
                              ? `${ITEMS[itemId].name} (Right-click or drag to Empty Compartment icon to remove from HUD bar)`
                              : `Empty Slot ${idx + 1}`
                          }
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
                    });
                })()}
              </div>

              <button
                type="button"
                aria-label="Next HUD Slot"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => {
                  if (
                    hud.hotbarItemIds.length > HUD_BAR_WINDOW &&
                    hudWindowStart + HUD_BAR_WINDOW < hud.hotbarItemIds.length
                  ) {
                    setHudWindowStart((p) =>
                      Math.min(hud.hotbarItemIds.length - HUD_BAR_WINDOW, p + HUD_BAR_WINDOW),
                    );
                  } else {
                    engineRef.current?.cycleHotbarSlot(1);
                  }
                }}
                className="w-6 h-11 sm:h-12 shrink-0 rounded-lg bg-stone-900/90 hover:bg-stone-800 border border-stone-800 hover:border-stone-600 text-stone-300 flex items-center justify-center transition-colors"
                title="Scroll Next Slots"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Empty Compartment Drop Zone & Expand to 5,000 Button */}
              <div
                onPointerDown={(e) => e.stopPropagation()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setHudDropHover(true);
                }}
                onDragLeave={() => setHudDropHover(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setHudDropHover(false);
                  const slotStr = e.dataTransfer.getData('text/hud-slot');
                  const slotIdx = slotStr ? parseInt(slotStr, 10) : draggingHudSlot;
                  if (slotIdx !== null && !Number.isNaN(slotIdx)) {
                    engineRef.current?.moveHotbarSlotToCompartment(slotIdx);
                  }
                  setDraggingHudSlot(null);
                }}
                className="flex items-center gap-1 shrink-0"
              >
                <button
                  type="button"
                  onClick={() => setHudManagerOpen((v) => !v)}
                  className={`h-11 sm:h-12 px-2 shrink-0 rounded-lg border flex flex-col items-center justify-center transition-colors ${
                    hudDropHover || draggingHudSlot !== null
                      ? 'bg-emerald-900 border-emerald-400 text-emerald-100'
                      : hudManagerOpen
                        ? 'bg-amber-950/80 border-amber-400 text-amber-200'
                        : 'bg-stone-900 hover:bg-stone-800 border-stone-700 text-emerald-300'
                  }`}
                  title="Drop HUD items here into Empty Backpack Compartments, or click to expand HUD Bar up to 5,000 slots"
                >
                  <div className="flex items-center gap-0.5 text-[10px] font-bold">
                    {draggingHudSlot !== null ? (
                      <ArrowDownToLine className="w-4 h-4" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    <span className="font-mono-tabular">
                      {hud.hotbarItemIds.length >= 1000
                        ? `${(hud.hotbarItemIds.length / 1000).toFixed(1)}K`
                        : hud.hotbarItemIds.length}
                    </span>
                  </div>
                  <span className="text-[8px] font-mono-tabular text-stone-400 leading-none mt-0.5">
                    {draggingHudSlot !== null ? 'Drop Pack' : '5K / Pack'}
                  </span>
                </button>
              </div>

              <button
                type="button"
                aria-label="Place Stuff"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => openModal('place')}
                className="h-11 sm:h-12 px-2.5 sm:px-3 shrink-0 rounded-lg bg-amber-600 hover:bg-amber-500 border border-amber-300/70 text-stone-950 font-bold text-xs flex flex-col sm:flex-row items-center justify-center gap-1 whitespace-nowrap"
                title="Place structures, supplies, or food down (P)"
              >
                <PackageOpen className="w-4 h-4" />
                <span>Place</span>
              </button>
            </div>
            )}
          </div>
        </div>
      )}

      {/* RESPONSIVE TOUCH CONTROLS & XBOX MIRRORED THUMBSTICK */}
      {hud && (
        <TouchControls
          visible={
            showTouchControls ||
            (gamepadConnected &&
              settings.touchControlsMode !== 'off' &&
              screen === 'playing' &&
              !activeModal &&
              !hud.gameOver &&
              !hud.cinematicActive)
          }
          gamepadConnected={gamepadConnected}
          mirroredJoystickOnly={!showTouchControls}
          gamepadJoystickOffset={gamepadJoystickOffset}
          actionLabel={hud.nearbyInteraction?.label || 'Action'}
          actionCategory={hud.nearbyInteraction?.actionCategory}
          isSprinting={hud.isSprinting}
          isCrouching={hud.isCrouching}
          onJoystickMove={(x, y) => engineRef.current?.setTouchJoystick(x, y)}
          onCameraDrag={(dx, dy) => engineRef.current?.addCameraLookDelta(dx, dy)}
          onAction={() => engineRef.current?.triggerPrimaryAction()}
          showReload={Boolean(hud.equippedWeaponState)}
          isReloading={Boolean(hud.equippedWeaponState?.isReloading)}
          onReload={() => engineRef.current?.reloadEquippedWeapon()}
          onJump={() => engineRef.current?.triggerJump()}
          onKickDebris={() => engineRef.current?.triggerDebrisKick()}
          kickCooldown={hud.momentumState?.kickCooldown ?? 0}
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
          nearOceanWater={hud.nearOceanWater}
          onUseOrEquip={(id) => engineRef.current?.useOrEquipItem(id)}
          onCleanBottle={() => engineRef.current?.cleanAndFilterWaterBottle()}
          onDropItem={(id) => engineRef.current?.dropItem(id, 1)}
          onAssignHotbar={(slotIdx, id) =>
            engineRef.current?.assignHotbarSlot(slotIdx, id)
          }
          onSelectHotbarSlot={(slotIdx) =>
            engineRef.current?.selectHotbarSlot(slotIdx)
          }
          onExpandHudBar={(val, isAbs) =>
            engineRef.current?.expandHudBar(val, isAbs)
          }
          onMoveHotbarSlotToCompartment={(slotIdx, cid) =>
            engineRef.current?.moveHotbarSlotToCompartment(slotIdx, cid)
          }
          onEmptyAllHudBar={() =>
            engineRef.current?.emptyAllHudBarToCompartments()
          }
          onMoveCompartmentToHotbar={(cid, targetSlot) =>
            engineRef.current?.moveCompartmentToHotbar(cid, targetSlot)
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
          nearOceanWater={hud.nearOceanWater}
          chestStructureId={activeStationStructureId}
          onUseOrEquip={(id) => engineRef.current?.useOrEquipItem(id)}
          onCleanBottle={() => engineRef.current?.cleanAndFilterWaterBottle()}
          onDropItem={(id) => engineRef.current?.dropItem(id, 1)}
          onAssignHotbar={(slotIdx, id) =>
            engineRef.current?.assignHotbarSlot(slotIdx, id)
          }
          onSelectHotbarSlot={(slotIdx) =>
            engineRef.current?.selectHotbarSlot(slotIdx)
          }
          onExpandHudBar={(val, isAbs) =>
            engineRef.current?.expandHudBar(val, isAbs)
          }
          onMoveHotbarSlotToCompartment={(slotIdx, cid) =>
            engineRef.current?.moveHotbarSlotToCompartment(slotIdx, cid)
          }
          onEmptyAllHudBar={() =>
            engineRef.current?.emptyAllHudBarToCompartments()
          }
          onMoveCompartmentToHotbar={(cid, targetSlot) =>
            engineRef.current?.moveCompartmentToHotbar(cid, targetSlot)
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

      {(activeModal === 'cooking' || activeModal === 'stove') && hud && (
        <CookingModal
          hud={hud}
          atCookingStation={nearCookingStation || activeModal === 'stove'}
          isStove={activeModal === 'stove'}
          onCook={(recipeId) =>
            engineRef.current?.cookRecipe(
              recipeId,
              nearCookingStation || activeModal === 'stove',
            ) || false
          }
          onEat={(itemId) => engineRef.current?.useOrEquipItem(itemId)}
          onClose={closeModal}
        />
      )}

      {activeModal === 'farmer' && hud && (
        <FarmerShopModal
          hud={hud}
          onBuy={(itemId) => engineRef.current?.buyFromFarmer(itemId) || false}
          onSell={(itemId, qty) =>
            engineRef.current?.sellToFarmer(itemId, qty) || false
          }
          onEquipSeed={(itemId) => engineRef.current?.useOrEquipItem(itemId)}
          onClose={closeModal}
        />
      )}

      {activeModal === 'fridge' && hud && (
        <FridgeModal
          hud={hud}
          onTake={(itemId) => engineRef.current?.transferFromFridge(itemId, 1)}
          onStore={(itemId) => engineRef.current?.transferToFridge(itemId, 1)}
          onEat={(itemId) => engineRef.current?.useOrEquipItem(itemId)}
          onClose={closeModal}
        />
      )}

      {screen === 'playing' && activeModal === 'tv' && (
        <TvPlayerModal
          tvState={hud?.tvState}
          searchQuery={tvSearchQuery}
          onSearchQueryChange={setTvSearchQuery}
          searchResults={tvSearchResults}
          onSearchResultsChange={setTvSearchResults}
          searchStatus={tvSearchStatus}
          onSearchStatusChange={setTvSearchStatus}
          onSelectChannel={(ch) => engineRef.current?.setTvChannel(ch)}
          onSelectYouTube={(stream, startSec) =>
            engineRef.current?.setTvYouTubeStream(
              stream.videoId,
              stream.title,
              stream.channel,
              startSec,
            )
          }
          onInlinePlayerChange={handleTvInlinePlayerChange}
          onSyncYouTubeTime={handleTvSyncYouTubeTime}
          youtubeErrorSignal={youtubeErrorSignal}
          onTogglePower={() => engineRef.current?.toggleTvPower()}
          onTogglePlayPause={() => engineRef.current?.toggleTvPlayPause()}
          onStop={() => engineRef.current?.stopTvPlayback()}
          onSetVolume={(vol) => engineRef.current?.setTvVolume(vol)}
          onToggleMute={() => engineRef.current?.toggleTvMute()}
          onNextChannel={() => engineRef.current?.nextTvChannel()}
          onPrevChannel={() => engineRef.current?.prevTvChannel()}
          onToggleAutoCycle={(enabled) => engineRef.current?.setTvAutoCycle(enabled)}
          onLoadLocalVideo={(file) => engineRef.current?.loadLocalTvVideo(file)}
          onDrawPreview={(canvas) => engineRef.current?.drawTvPreview(canvas)}
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

      {activeModal === 'vehicles' && hud && (
        <VehicleBuilderModal
          onClose={closeModal}
          onSpawnVehicle={(v) => engineRef.current?.spawnCustomVehicle(v)}
          vehicles={hud.vehicles}
          onCustomizeVehicle={(vid, patch) =>
            engineRef.current?.customizeVehicle(vid, patch)
          }
          onParkInGarage={(vid, bay) =>
            engineRef.current?.parkVehicleInGarage(vid, bay)
          }
          playerInventory={hud.inventory}
          playerX={hud.playerX}
          playerY={hud.playerY}
          playerZ={hud.playerZ}
          playerYaw={hud.playerYaw}
        />
      )}

      {activeModal === 'multiplayer' && (
        <MultiplayerModal
          mpState={hud?.multiplayerState}
          chatLog={hud?.multiplayerState?.chatLog ?? []}
          initialJoinCode={inviteRoomCode}
          onCreateRoom={(name) =>
            engineRef.current?.createMultiplayerRoom(name) ?? Promise.resolve(null)
          }
          onJoinRoom={(code, name) =>
            engineRef.current?.joinMultiplayerRoom(code, name) ?? Promise.resolve(false)
          }
          onLeaveRoom={() => engineRef.current?.leaveMultiplayerRoom()}
          onUpdateName={(name) => engineRef.current?.setMultiplayerName(name)}
          onTogglePvp={(enabled) => engineRef.current?.setPvpEnabled(enabled)}
          onSendChat={(text) => engineRef.current?.sendMultiplayerChat(text)}
          onInitMic={() => engineRef.current?.initMicrophone()}
          onToggleMicMute={() => engineRef.current?.toggleMicMute()}
          onSetVoiceMode={(mode) => engineRef.current?.setVoiceMode(mode)}
          onClose={closeModal}
        />
      )}

      {activeModal === 'mods' && (
        <ModManagerModal
          modState={hud?.modState}
          onSetTweaks={(partial) => engineRef.current?.setModTweaks(partial)}
          onResetTweaks={() => engineRef.current?.resetModTweaks()}
          onImportModelFile={(file) =>
            engineRef.current
              ? engineRef.current.importModModelFile(file)
              : Promise.reject(new Error('Engine not initialized'))
          }
          onImportModelUrl={(url) =>
            engineRef.current
              ? engineRef.current.importModModelUrl(url)
              : Promise.reject(new Error('Engine not initialized'))
          }
          onUpdateAssetTransform={(assetId, patch) =>
            engineRef.current?.updateModAssetTransform(assetId, patch)
          }
          onRemoveAsset={(assetId) => engineRef.current?.removeModAsset(assetId)}
          onLoadScriptUrl={(url, name) =>
            engineRef.current
              ? engineRef.current.loadModScriptUrl(url, name)
              : Promise.reject(new Error('Engine not initialized'))
          }
          onAddScript={(name, code) =>
            engineRef.current!.addModScript(name, code)
          }
          onToggleScript={(scriptId, enabled) =>
            engineRef.current?.toggleModScript(scriptId, enabled)
          }
          onRemoveScript={(scriptId) => engineRef.current?.removeModScript(scriptId)}
          onExportBundle={() => engineRef.current?.exportModAndBuildBundle()}
          onImportBundle={(bundle) =>
            engineRef.current?.importModAndBuildBundle(bundle)
          }
          onClose={closeModal}
        />
      )}

      {activeModal === 'menu_drawer' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="relative w-full max-w-md bg-stone-900 border border-amber-500/50 rounded-2xl shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <h3 className="font-display text-lg font-bold text-amber-300">
                Survival Island Menu &amp; Tools
              </h3>
              <button
                onClick={closeModal}
                className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setActiveModal('inventory')}
                className="p-3.5 rounded-xl bg-stone-800 hover:bg-amber-600 hover:text-stone-950 font-bold text-stone-100 text-sm flex items-center gap-2.5 transition"
              >
                <Backpack className="w-5 h-5 text-amber-400" />
                <span>Pack / Inventory</span>
              </button>
              <button
                onClick={() => { setActiveStationStructureId(undefined); setActiveModal('crafting'); }}
                className="p-3.5 rounded-xl bg-stone-800 hover:bg-amber-600 hover:text-stone-950 font-bold text-stone-100 text-sm flex items-center gap-2.5 transition"
              >
                <Hammer className="w-5 h-5 text-amber-400" />
                <span>Crafting Bay</span>
              </button>
              <button
                onClick={() => setActiveModal('map')}
                className="p-3.5 rounded-xl bg-stone-800 hover:bg-amber-600 hover:text-stone-950 font-bold text-stone-100 text-sm flex items-center gap-2.5 transition"
              >
                <MapIcon className="w-5 h-5 text-amber-400" />
                <span>Island Map</span>
              </button>
              <button
                onClick={() => setActiveModal('vehicles')}
                className="p-3.5 rounded-xl bg-stone-800 hover:bg-amber-600 hover:text-stone-950 font-bold text-stone-100 text-sm flex items-center gap-2.5 transition"
              >
                <Car className="w-5 h-5 text-amber-400" />
                <span>Vehicle Garage</span>
              </button>
              <button
                onClick={() => setActiveModal('multiverse')}
                className="p-3.5 rounded-xl bg-stone-800 hover:bg-amber-600 hover:text-stone-950 font-bold text-stone-100 text-sm flex items-center gap-2.5 transition"
              >
                <Sparkles className="w-5 h-5 text-amber-400" />
                <span>Realms Portal</span>
              </button>
              <button
                onClick={() => setActiveModal('multiplayer')}
                className="p-3.5 rounded-xl bg-stone-800 hover:bg-amber-600 hover:text-stone-950 font-bold text-stone-100 text-sm flex items-center gap-2.5 transition"
              >
                <Users className="w-5 h-5 text-amber-400" />
                <span>Multiplayer P2P</span>
              </button>
              <button
                onClick={() => setActiveModal('mods')}
                className="p-3.5 rounded-xl bg-stone-800 hover:bg-amber-600 hover:text-stone-950 font-bold text-stone-100 text-sm flex items-center gap-2.5 transition"
              >
                <Box className="w-5 h-5 text-amber-400" />
                <span>Mod Manager</span>
              </button>
              <button
                onClick={() => setActiveModal('console')}
                className="p-3.5 rounded-xl bg-stone-800 hover:bg-amber-600 hover:text-stone-950 font-bold text-stone-100 text-sm flex items-center gap-2.5 transition"
              >
                <Terminal className="w-5 h-5 text-amber-400" />
                <span>Console &amp; Relics</span>
              </button>
              <button
                onClick={() => setActiveModal('missions')}
                className="p-3.5 rounded-xl bg-stone-800 hover:bg-amber-600 hover:text-stone-950 font-bold text-stone-100 text-sm flex items-center gap-2.5 transition"
              >
                <Trophy className="w-5 h-5 text-amber-400" />
                <span>Missions &amp; Goals</span>
              </button>
              <button
                onClick={() => setActiveModal('settings')}
                className="p-3.5 rounded-xl bg-stone-800 hover:bg-amber-600 hover:text-stone-950 font-bold text-stone-100 text-sm flex items-center gap-2.5 transition"
              >
                <Settings className="w-5 h-5 text-amber-400" />
                <span>Settings</span>
              </button>
            </div>
            <button
              onClick={() => setActiveModal('pause')}
              className="w-full py-3 rounded-xl bg-stone-800 hover:bg-stone-700 font-bold text-stone-200 text-sm transition text-center"
            >
              Pause Menu &amp; Save / Quit
            </button>
          </div>
        </div>
      )}

      {activeModal === 'console' && (
        <CommandConsoleModal
          onClose={closeModal}
          onExecuteCommand={(cmd) => engineRef.current?.executeConsoleCommand(cmd)}
          onSpawnCreatorRelic={(relicKey) => engineRef.current?.spawnCreatorRelic(relicKey)}
        />
      )}

      {activeModal === 'multiverse' && (
        <DimensionWheelModal
          currentDimension={hud?.currentDimension ?? 'overworld'}
          selectedPortalDimension={hud?.selectedPortalDimension ?? 'space'}
          visitedDimensions={hud?.visitedDimensions ?? ['overworld']}
          unlockedGildedPaint={Boolean(hud?.unlockedGildedPaint)}
          crystalArmorHp={hud?.crystalArmorHp ?? 0}
          activePortals={hud?.activePortals ?? []}
          onSelectPortalDimension={(dim) => engineRef.current?.selectPortalDimension(dim)}
          onFirePortalGun={() => {
            closeModal();
            engineRef.current?.firePortalGun();
          }}
          onDirectWarp={(dim) => {
            closeModal();
            engineRef.current?.switchDimension(dim);
          }}
          onCloseAllPortals={() => engineRef.current?.closeAllPortals()}
          onClose={closeModal}
        />
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
                onClick={() => handleStartNewGame()}
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
