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
  Camera,
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
  Gauge,
  Gem,
  Globe2,
  Hexagon,
  Hammer,
  Hand,
  Heart,
  Layers,
  LogOut,
  Map as MapIcon,
  Moon,
  Music,
  Navigation,
  PackageOpen,
  PackagePlus,
  Pause,
  Pickaxe,
  Plane,
  Play,
  Plus,
  Radio,
  RollerCoaster,
  RotateCcw,
  RotateCw,
  Settings,
  Shield,
  ShieldAlert,
  ShieldOff,
  ShieldPlus,
  Skull,
  Sparkles,
  Store,
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
  createNewSaveSlotId,
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
  FlatSurfaceStyle,
  GameMode,
  GameSettings,
  HUDStateSnapshot,
  ItemId,
  ResourceToast,
  SaveSlotSummary,
  WorldType,
  resolveAllowedGameMode,
} from '@/game/types';
import { CookingModal } from './CookingModal';
import { DryingRackModal } from './DryingRackModal';
import { CraftingModal } from './CraftingModal';
import { FarmerShopModal } from './FarmerShopModal';
import { FridgeModal } from './FridgeModal';
import { VikingVillageModal } from './VikingVillageModal';
import { InventoryModal } from './InventoryModal';
import { IslandMapModal } from './IslandMapModal';
import { ItemIcon } from './ItemIcon';
import {
  ControlsModal,
  MissionsModal,
  PauseModal,
  SettingsModal,
} from './MissionsAndPauseModals';
import { ModManagerModal } from './ModManagerModal';
import { MultiplayerModal } from './MultiplayerModal';
import { PlaceModal } from './PlaceModal';
import { TouchControls, TouchControlsHandle } from './TouchControls';
import { PlayerControlsMinimizer } from '@/game/systems/playerControlsMinimizer';
import { MOBILE_HUD_ROCKET_CONTROLS } from '@/game/systems/multiverseSpace';
import { SaturnRocketModal } from './SaturnRocketModal';
import { UndergroundElevatorModal } from './UndergroundElevatorModal';
import { CarRadioModal } from './CarRadioModal';
import { TvPlayerModal, YouTubeStreamSelection } from './TvPlayerModal';
import {
  PersistentYouTubeOverlay,
  PersistentYouTubeOverlayHandle,
} from './PersistentYouTubeOverlay';
import { VehicleBuilderModal } from './VehicleBuilderModal';
import { CommandConsoleModal } from './CommandConsoleModal';
import { DimensionWheelModal } from './DimensionWheelModal';
import { MusicStudioModal } from './MusicStudioModal';
import { WorldSelectionMenu } from './WorldSelectionMenu';
import { CoasterStudioModal } from './CoasterStudioModal';
import { EcosystemJournalModal } from './EcosystemJournalModal';
import { DragonSanctuaryModal } from './DragonSanctuaryModal';
import { ExchangeModal } from './ExchangeModal';
import { PayhipMarketplaceModal } from './PayhipMarketplaceModal';
import { BlankPhoneMarketplaceModal } from './BlankPhoneMarketplaceModal';
import { NavigatorCompanionModal } from './NavigatorCompanionModal';
import { LouisianaMainlandModal } from './LouisianaMainlandModal';
import type { MainlandTab } from '@/game/systems/louisianaMainland';
import {
  CustomPhoneMarketplaceState,
  VaultPayhipState,
  addCustomMarketplaceSkin,
  attachCustomMarketplaceCheckout,
  equipCustomMarketplaceSkin,
  equipVaultPayhipItem,
  getCustomMarketplaceSnapshot,
  getVaultCatalogItems,
  getVaultPayhipSnapshot,
  refreshStorefront,
  subscribeExchangeState,
  unlockCustomMarketplaceSkin,
  unlockVaultPayhipItem,
  updateVaultItemPayhipEmbed,
} from '@/game/systems/exchangeManager';
import { SkinCatalogItem } from '@/game/data/exchangeCatalog';
import { EcosystemSimulationData } from '@/game/systems/livingEcosystemSystem';
import { DragonCompanion } from '@/game/systems/dragonValleySystem';
import { UI_LAYOUT, getSafeHudLayoutMetrics } from '@/game/systems/caveSystem';

function mainlandTabFromId(id?: string): MainlandTab {
  const raw = id?.startsWith('mainland_') ? id.slice('mainland_'.length) : 'district';
  if (
    raw === 'garage' ||
    raw === 'heat' ||
    raw === 'safehouse' ||
    raw === 'market' ||
    raw === 'transit' ||
    raw === 'outfitter' ||
    raw === 'challenges'
  ) {
    return raw;
  }
  if (raw.startsWith('services')) return 'services';
  return 'district';
}

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
  const [engineReady, setEngineReady] = useState(false);
  const [engineInstance, setEngineInstance] = useState<GameEngine | null>(null);
  const launchPendingRef = useRef(false);
  const [currentSlotId, setCurrentSlotId] = useState<string>('slot_1');
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [activeStationStructureId, setActiveStationStructureId] = useState<
    string | undefined
  >(undefined);
  const [elevatorTargetVehicleId, setElevatorTargetVehicleId] = useState<string | undefined>(
    undefined,
  );
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [saveSlots, setSaveSlots] = useState<SaveSlotSummary[]>([]);
  const [latestSave, setLatestSave] = useState<SaveSlotSummary | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [hud, setHud] = useState<HUDStateSnapshot | null>(null);
  const [ecosystemSnapshot, setEcosystemSnapshot] = useState<EcosystemSimulationData | null>(null);
  const [dragonsSnapshot, setDragonsSnapshot] = useState<DragonCompanion[]>([]);
  const [dragonEggsSnapshot, setDragonEggsSnapshot] = useState<string[]>([]);
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
  const [tvViewMode, setTvViewMode] = useState<'inline' | 'world3d'>('inline');
  const [tvInlineSlotEl, setTvInlineSlotEl] = useState<HTMLElement | null>(null);
  const [tvPipDismissed, setTvPipDismissed] = useState(false);
  const [tvStreamStartSec, setTvStreamStartSec] = useState(0);
  const [youtubeErrorSignal, setYoutubeErrorSignal] = useState<{
    videoId: string;
    code: number;
    seq: number;
  } | null>(null);
  const [gamepadConnected, setGamepadConnected] = useState(false);
  const touchControlsRef = useRef<TouchControlsHandle | null>(null);
  const tvOverlayRef = useRef<PersistentYouTubeOverlayHandle | null>(null);
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

  const [quickTpInput, setQuickTpInput] = useState('');
  const [webglError, setWebglError] = useState<string | null>(null);
  const [webglRetryNonce, setWebglRetryNonce] = useState(0);
  const [walkingControlsMinimized, setWalkingControlsMinimized] = useState(false);
  const [viewportSize, setViewportSize] = useState({ width: 1280, height: 720 });
  useEffect(() => {
    const updateViewport = () => {
      setViewportSize({
        width: window.innerWidth || 1280,
        height: window.innerHeight || 720,
      });
    };
    updateViewport();
    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', updateViewport);
    return () => {
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('orientationchange', updateViewport);
    };
  }, []);
  const [vehicleDeckExpandedForId, setVehicleDeckExpandedForId] = useState<string | null>(null);
  const activeVehicleIdForDeck = hud?.activeVehicle?.id ?? null;
  const vehicleDeckExpanded =
    Boolean(activeVehicleIdForDeck) && vehicleDeckExpandedForId === activeVehicleIdForDeck;
  const stickMinimized = walkingControlsMinimized && Boolean(hud?.activeVehicle);
  const controlsMinimizerRef = useRef<PlayerControlsMinimizer | null>(null);

  useEffect(() => {
    controlsMinimizerRef.current = new PlayerControlsMinimizer({
      onToggle: (minimized) => setWalkingControlsMinimized(minimized),
      onResetInputs: () => {
        touchControlsRef.current?.resetTouchJoystick();
        touchControlsRef.current?.setGamepadKnobOffset(0, 0);
        engineRef.current?.setTouchJoystick(0, 0);
        engineRef.current?.setTouchDrivePedals(0, 0, false);
        engineRef.current?.setVehicleVerticalHold(null);
        engineRef.current?.setTouchSprint(false);
        engineRef.current?.setTouchCrouch(false);
        engineRef.current?.setTouchFlyAscend(false);
        engineRef.current?.setTouchFlyDescend(false);
        engineRef.current?.setAiming(false);
        engineRef.current?.setGamepadDriveState(0, 0, false);
      },
    });
    return () => {
      controlsMinimizerRef.current = null;
    };
  }, []);

  const handleTvSyncYouTubeTime = useCallback((sec: number) => {
    engineRef.current?.syncTvYouTubeTime(sec);
  }, []);

  const handleTvYouTubeError = useCallback((videoId: string, errorCode: number) => {
    ytErrSeqRef.current += 1;
    setYoutubeErrorSignal({
      videoId,
      code: errorCode,
      seq: ytErrSeqRef.current,
    });
  }, []);

  useEffect(() => {
    hudRef.current = hud;
  }, [hud]);

  useEffect(() => {
    activeModalRef.current = activeModal;
  }, [activeModal]);

  const [rocketControlsActive, setRocketControlsActive] = useState(false);
  const [hudMinimizedMobile, setHudMinimizedMobile] = useState(false);
  const [vaultPayhipState, setVaultPayhipState] = useState<VaultPayhipState>(() =>
    getVaultPayhipSnapshot(),
  );
  const [vaultPayhipItems, setVaultPayhipItems] = useState<SkinCatalogItem[]>(() =>
    getVaultCatalogItems(),
  );
  const [customPhoneState, setCustomPhoneState] = useState<CustomPhoneMarketplaceState>(() =>
    getCustomMarketplaceSnapshot(),
  );

  useEffect(() => {
    const unsub = subscribeExchangeState(() => {
      setVaultPayhipState({ ...getVaultPayhipSnapshot() });
      setVaultPayhipItems(getVaultCatalogItems());
      setCustomPhoneState({ ...getCustomMarketplaceSnapshot() });
      engineRef.current?.applyExchangeCosmetics(true);
    });
    void refreshStorefront().catch(() => {});
    return unsub;
  }, []);

  useEffect(() => {
    MOBILE_HUD_ROCKET_CONTROLS.onResetInputs = () => {
      touchControlsRef.current?.resetTouchJoystick();
      touchControlsRef.current?.setGamepadKnobOffset(0, 0);
      engineRef.current?.setTouchJoystick(0, 0);
      engineRef.current?.setAiming(false);
    };
    MOBILE_HUD_ROCKET_CONTROLS.onStateChange = ({ isMinimized, rocketModeActive }) => {
      setHudMinimizedMobile(isMinimized);
      setRocketControlsActive(rocketModeActive);
    };
    return () => {
      MOBILE_HUD_ROCKET_CONTROLS.isMinimized = false;
      MOBILE_HUD_ROCKET_CONTROLS.rocketModeActive = false;
      MOBILE_HUD_ROCKET_CONTROLS.onResetInputs = null;
      MOBILE_HUD_ROCKET_CONTROLS.onStateChange = null;
    };
  }, []);

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
      touchControlsRef.current?.setGamepadKnobOffset(0, 0);
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
    let wasGpStickNonZero = false;

    const hasConnectedGamepad = () => {
      const gps = navigator.getGamepads ? navigator.getGamepads() : [];
      for (const gp of gps) {
        if (gp && gp.connected) return true;
      }
      return false;
    };

    const startPolling = () => {
      if (animId === 0) {
        animId = window.requestAnimationFrame(pollGamepads);
      }
    };

    const pollGamepads = () => {
      animId = 0;
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
          if (wasGpStickNonZero || lastGpKnobRef.current.x !== 0 || lastGpKnobRef.current.y !== 0) {
            wasGpStickNonZero = false;
            lastGpKnobRef.current = { x: 0, y: 0 };
            touchControlsRef.current?.setGamepadKnobOffset(0, 0);
            engine.setTouchJoystick(0, 0);
          }
        } else {
          // Left Analog Stick (axes[0], axes[1]) with radial deadzone — never clobber touch when gamepad is idle
          const rawLx = activeGp.axes[0] ?? 0;
          const rawLy = activeGp.axes[1] ?? 0;
          const lMag = Math.hypot(rawLx, rawLy);
          const lx = lMag > 0.18 ? rawLx : 0;
          const ly = lMag > 0.18 ? rawLy : 0;
          const isGpStickNowNonZero = lx !== 0 || ly !== 0;
          if (isGpStickNowNonZero || wasGpStickNonZero) {
            engine.setTouchJoystick(lx, -ly);
          }
          wasGpStickNonZero = isGpStickNowNonZero;

          const knobX = lx * 48;
          const knobY = ly * 48;
          if (
            Math.abs(knobX - lastGpKnobRef.current.x) > 0.25 ||
            Math.abs(knobY - lastGpKnobRef.current.y) > 0.25 ||
            (knobX === 0 && knobY === 0 && (lastGpKnobRef.current.x !== 0 || lastGpKnobRef.current.y !== 0))
          ) {
            lastGpKnobRef.current = { x: knobX, y: knobY };
            touchControlsRef.current?.setGamepadKnobOffset(knobX, knobY);
          }

          // Right Analog Stick (axes[2], axes[3]) smooth 360° camera look
          const rawRx = activeGp.axes[2] ?? 0;
          const rawRy = activeGp.axes[3] ?? 0;
          const rMag = Math.hypot(rawRx, rawRy);
          const rx = rMag > 0.18 ? rawRx : 0;
          const ry = rMag > 0.18 ? rawRy : 0;
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
        if (wasGpStickNonZero) {
          wasGpStickNonZero = false;
          engine?.setTouchJoystick(0, 0);
        }
        engine?.setAiming(false);
        engine?.setGamepadDriveState(0, 0, false);
        lastGpKnobRef.current = { x: 0, y: 0 };
        touchControlsRef.current?.setGamepadKnobOffset(0, 0);
      }

      if (isNowConnected) {
        animId = window.requestAnimationFrame(pollGamepads);
      }
    };

    const onConnectedWake = (e: GamepadEvent) => {
      onConnected(e);
      startPolling();
    };
    window.removeEventListener('gamepadconnected', onConnected as EventListener);
    window.addEventListener('gamepadconnected', onConnectedWake as EventListener);

    if (hasConnectedGamepad()) {
      startPolling();
    }

    return () => {
      window.removeEventListener('gamepadconnected', onConnectedWake as EventListener);
      window.removeEventListener('gamepaddisconnected', onDisconnected as EventListener);
      if (animId !== 0) window.cancelAnimationFrame(animId);
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

    let engine: GameEngine | null = null;
    let clearErrId = 0;
    let cancelled = false;
    setEngineReady(false);

    // Defer the heavy synchronous island/world build by one tick so the boot
    // screen can paint first. Previously the menu mounted over an unpainted
    // canvas and the whole page froze while the engine was constructed.
    const bootId = window.setTimeout(() => {
    if (cancelled) return;
    const initialSettings = loadSettings();
    try {
      engine = new GameEngine(mountEl, initialSettings, {
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
          if (station === 'mainland') {
            setActiveStationStructureId(structureId);
            setActiveModal('mainland');
            engine?.setMode('paused');
            return;
          }
          if (station === 'underground_elevator') {
            // Strictly clears any car menu and opens ONLY the elevator computer
            setActiveStationStructureId(structureId);
            setActiveModal('underground_elevator');
            engine?.setMode('paused');
            return;
          }
          if (
            station === 'vehicles' ||
            station === 'car_radio' ||
            station === 'vehicle_cargo'
          ) {
            // Block car menus if the elevator computer is currently active
            setActiveModal((prev) => {
              if (prev === 'underground_elevator') return prev;
              setActiveStationStructureId(structureId);
              engine?.setMode('paused');
              return station;
            });
            return;
          }
          if (station === 'tv') {
            setTvPipDismissed(false);
            setTvViewMode('inline');
          }
          setActiveStationStructureId(structureId);
          setActiveModal(station);
          engine?.setMode('paused');
        },
        onYouTubeError: (videoId, errorCode) => {
          ytErrSeqRef.current += 1;
          setYoutubeErrorSignal({
            videoId,
            code: errorCode,
            seq: ytErrSeqRef.current,
          });
        },
        onTvProjectionUpdate: (proj) => {
          tvOverlayRef.current?.updateProjection(proj);
        },
        onTvBassUpdate: (bassEnergy, bassMode) => {
          tvOverlayRef.current?.updateBassBump(bassEnergy, bassMode);
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to initialize WebGL 3D renderer.';
      setWebglError(msg);
      return;
    }

    if (cancelled) {
      engine?.dispose();
      engine = null;
      return;
    }
    if (!engine) return;
    const bootedEngine = engine;
    engineRef.current = bootedEngine;
    setEngineInstance(bootedEngine);
    clearErrId = window.requestAnimationFrame(() => {
      setWebglError(null);
      setEngineReady(true);
    });

    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      bootedEngine.startNewWorldState('slot_1', true, {
        worldType: 'island',
        worldName: 'Survival Island',
        gameMode: 'survival',
      });
      bootedEngine.ensurePlayerHasGun(true);
      bootedEngine.setMode('playing');
      window.requestAnimationFrame(() => {
        setCurrentSlotId('slot_1');
        setActiveModal(null);
        setScreen('playing');
      });
    }
    }, 32);

    return () => {
      cancelled = true;
      window.clearTimeout(bootId);
      if (clearErrId) window.cancelAnimationFrame(clearErrId);
      engine?.dispose();
      engineRef.current = null;
      setEngineInstance(null);
      mountEl.innerHTML = '';
    };
  }, [pushToast, webglRetryNonce]);

  // Keep engine mode strictly synchronized with active screen & modal state
  useEffect(() => {
    if (!engineRef.current) return;
    engineRef.current.setTvModalOpen(screen === 'playing' && activeModal === 'tv');
    if (screen !== 'playing') {
      lookPointerId.current = null;
      touchControlsRef.current?.resetTouchJoystick();
      touchControlsRef.current?.setGamepadKnobOffset(0, 0);
      engineRef.current.setTouchJoystick(0, 0);
      engineRef.current.setActiveModalKind('none');
      engineRef.current.setMode('menu');
    } else if (activeModal) {
      lookPointerId.current = null;
      touchControlsRef.current?.resetTouchJoystick();
      touchControlsRef.current?.setGamepadKnobOffset(0, 0);
      engineRef.current.setTouchJoystick(0, 0);
      const modalKind =
        activeModal === 'vault_store' ||
        activeModal === 'exchange' ||
        activeModal === 'custom_marketplace'
          ? 'vault_store'
          : activeModal === 'underground_elevator'
            ? 'elevator_computer'
            : activeModal === 'menu_drawer'
              ? 'menu_drawer'
              : 'build_panel';
      engineRef.current.setActiveModalKind(modalKind);
      engineRef.current.setMode('paused');
    } else {
      engineRef.current.setActiveModalKind('none');
      engineRef.current.setMode('playing');
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }
  }, [screen, activeModal]);

  useEffect(() => {
    if (stickMinimized) {
      touchControlsRef.current?.resetTouchJoystick();
      engineRef.current?.setTouchJoystick(0, 0);
    }
  }, [stickMinimized]);

  // Reset camera look pointer & joysticks whenever window loses focus, tab hides, or pointer ends globally
  useEffect(() => {
    const clearAllSticks = () => {
      lookPointerId.current = null;
      lastGpKnobRef.current = { x: 0, y: 0 };
      touchControlsRef.current?.resetTouchJoystick();
      touchControlsRef.current?.setGamepadKnobOffset(0, 0);
      engineRef.current?.setTouchJoystick(0, 0);
      engineRef.current?.setTouchFlyAscend(false);
      engineRef.current?.setTouchFlyDescend(false);
      engineRef.current?.setGamepadDriveState(0, 0, false);
      engineRef.current?.setAiming(false);
    };
    const onGlobalPointerEnd = (e: PointerEvent) => {
      if (lookPointerId.current === e.pointerId) {
        lookPointerId.current = null;
      }
    };
    const onGlobalPointerMove = (e: PointerEvent) => {
      if (
        lookPointerId.current === e.pointerId &&
        e.pointerType === 'mouse' &&
        e.buttons === 0
      ) {
        lookPointerId.current = null;
      }
    };
    const onGlobalTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) {
        lookPointerId.current = null;
      }
    };
    const onVisibility = () => {
      if (document.hidden) clearAllSticks();
    };
    window.addEventListener('blur', clearAllSticks);
    window.addEventListener('pagehide', clearAllSticks);
    window.addEventListener('pointerup', onGlobalPointerEnd, true);
    window.addEventListener('pointercancel', onGlobalPointerEnd, true);
    window.addEventListener('pointermove', onGlobalPointerMove, true);
    window.addEventListener('touchend', onGlobalTouchEnd, true);
    window.addEventListener('touchcancel', onGlobalTouchEnd, true);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('blur', clearAllSticks);
      window.removeEventListener('pagehide', clearAllSticks);
      window.removeEventListener('pointerup', onGlobalPointerEnd, true);
      window.removeEventListener('pointercancel', onGlobalPointerEnd, true);
      window.removeEventListener('pointermove', onGlobalPointerMove, true);
      window.removeEventListener('touchend', onGlobalTouchEnd, true);
      window.removeEventListener('touchcancel', onGlobalTouchEnd, true);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

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
        } else if (e.code === 'KeyY') {
          setActiveStationStructureId('mainland_district');
          setActiveModal('mainland');
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

  // Periodic Autosave during active play scheduled on browser idle time to avoid frame hitches
  useEffect(() => {
    if (screen !== 'playing') return;
    let idleHandle: number | null = null;
    let timeoutFallback: number | null = null;

    const runIdleSave = () => {
      if (!engineRef.current) return;
      const slotId = engineRef.current.getCurrentSlotId() || 'slot_1';
      saveGameToSlot(engineRef.current.exportSaveData(slotId));
    };

    const scheduleSave = () => {
      const win = window as Window & {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
        cancelIdleCallback?: (id: number) => void;
      };
      if (typeof win.requestIdleCallback === 'function') {
        idleHandle = win.requestIdleCallback(() => {
          idleHandle = null;
          runIdleSave();
        }, { timeout: 2000 });
      } else {
        timeoutFallback = window.setTimeout(() => {
          timeoutFallback = null;
          runIdleSave();
        }, 0);
      }
    };

    const id = window.setInterval(scheduleSave, 35000);
    return () => {
      window.clearInterval(id);
      const win = window as Window & { cancelIdleCallback?: (id: number) => void };
      if (idleHandle !== null && typeof win.cancelIdleCallback === 'function') {
        win.cancelIdleCallback(idleHandle);
      }
      if (timeoutFallback !== null) {
        window.clearTimeout(timeoutFallback);
      }
    };
  }, [screen]);

  // Refresh save list only when viewing Menu or Pause modal
  useEffect(() => {
    if (screen === 'menu' || activeModal === 'pause') {
      const id = window.requestAnimationFrame(() => refreshSaves());
      return () => window.cancelAnimationFrame(id);
    }
  }, [screen, activeModal, refreshSaves]);

  // Keep the wheel-selected slot centered in the scrollable HUD bar without smooth-scroll layout thrashing
  const HUD_BAR_WINDOW = 9;
  const equippedSlot = hud?.equippedSlot ?? -1;
  useEffect(() => {
    if (equippedSlot < 0) {
      hotbarScrollRef.current?.scrollTo({ left: 0, behavior: 'auto' });
      return;
    }
    const btn = slotButtonRefs.current[equippedSlot - hudWindowStart];
    if (btn) {
      btn.scrollIntoView({
        behavior: 'auto',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [equippedSlot, hudWindowStart]);

  const handleStartNewGame = (opts: {
    worldType: WorldType;
    worldName: string;
    gameMode: GameMode;
    flatSurfaceStyle?: FlatSurfaceStyle;
    playerGender?: 'boy' | 'girl';
  }) => {
    if (!engineRef.current || launchPendingRef.current) return;
    engineRef.current.unlockAudio();
    launchPendingRef.current = true;
    // Show the boot screen and let it paint before the synchronous world build.
    setEngineReady(false);
    window.setTimeout(() => {
      try {
        const engine = engineRef.current;
        if (!engine) return;
        const safeMode = resolveAllowedGameMode(opts.worldType, opts.gameMode);
        const slotId = createNewSaveSlotId(opts.worldType);
        const playCinematic = opts.worldType === 'island';
        engine.startNewWorldState(slotId, playCinematic, {
          worldType: opts.worldType,
          worldName: opts.worldName,
          flatSurfaceStyle: opts.flatSurfaceStyle,
          gameMode: safeMode,
          playerGender: opts.playerGender ?? 'boy',
        });
        if (opts.worldType === 'island') {
          engine.ensurePlayerHasGun(true);
        }
        saveGameToSlot(engine.exportSaveData(slotId));
        refreshSaves();
        engine.setMode('playing');
        setCurrentSlotId(slotId);
        setActiveModal(null);
        setScreen('playing');
      } finally {
        launchPendingRef.current = false;
        setEngineReady(true);
      }
    }, 48);
  };

  const handleContinueGame = (slotId?: string) => {
    if (!engineRef.current) return;
    const targetId = slotId || latestSave?.slotId;
    if (!targetId) return;
    const data = loadGameFromSlot(targetId);
    if (!data) return;
    if (launchPendingRef.current) return;
    engineRef.current.unlockAudio();
    launchPendingRef.current = true;
    setEngineReady(false);
    window.setTimeout(() => {
      try {
        const engine = engineRef.current;
        if (!engine) return;
        engine.loadFromSave(data);
        setCurrentSlotId(targetId);
        if (data.worldType !== 'flat') {
          engine.ensurePlayerHasGun(false);
        }
        if (data.hudPreferences) {
          const merged: GameSettings = {
            ...settings,
            showCompass: data.hudPreferences.showCompass,
            compactHud: data.hudPreferences.compactHud,
          };
          setSettings(merged);
          saveSettings(merged);
          engine.updateSettings(merged);
        }
        engine.setMode('playing');
        setActiveModal(null);
        setScreen('playing');
        pushToast({
          id: `loaded_${Date.now()}`,
          text:
            data.worldType === 'flat'
              ? `Loaded ${data.worldName || 'Flat Park World'} · Creative Park Ready`
              : `Loaded ${data.worldName || `Day ${data.dayCount} Expedition`}`,
          tone: 'info',
        });
      } finally {
        launchPendingRef.current = false;
        setEngineReady(true);
      }
    }, 48);
  };

  const handleSaveNow = (slotId?: string) => {
    if (!engineRef.current) return;
    const targetSlot = slotId || engineRef.current.getCurrentSlotId() || 'slot_1';
    const ok = saveGameToSlot(engineRef.current.exportSaveData(targetSlot));
    refreshSaves();
    pushToast({
      id: `saved_${Date.now()}`,
      text: ok ? 'World progress saved' : 'Could not save to storage',
      tone: ok ? 'craft' : 'warning',
    });
  };

  const handleSettingsChange = (next: GameSettings) => {
    setSettings(next);
    saveSettings(next);
    engineRef.current?.updateSettings(next);
  };

  const openElevatorComputer = useCallback((structureId?: string) => {
    // Strictly clears any car menu and opens ONLY the elevator computer
    setActiveStationStructureId(structureId);
    setActiveModal('underground_elevator');
    engineRef.current?.setMode('paused');
  }, []);

  const openVehicleMenu = useCallback(
    (menu: 'vehicles' | 'car_radio' | 'vehicle_cargo', structureId?: string) => {
      // Block car menus if the elevator computer is currently active
      setActiveModal((prev) => {
        if (prev === 'underground_elevator') return prev;
        setActiveStationStructureId(structureId);
        engineRef.current?.setMode('paused');
        return menu;
      });
    },
    [],
  );

  const openModal = useCallback(
    (modal: ActiveModal, structureId?: string) => {
      if (modal === 'underground_elevator') {
        openElevatorComputer(structureId);
        return;
      }
      if (
        modal === 'vehicles' ||
        modal === 'car_radio' ||
        modal === 'vehicle_cargo'
      ) {
        openVehicleMenu(modal, structureId);
        return;
      }
      if (modal === 'tv') {
        setTvPipDismissed(false);
        setTvViewMode('inline');
      }
      if (modal === 'ecosystem_journal' && engineRef.current) {
        setEcosystemSnapshot({ ...engineRef.current.ecosystem });
      }
      if (modal === 'dragon_sanctuary' && engineRef.current) {
        setDragonsSnapshot(engineRef.current.getDragons());
        setDragonEggsSnapshot(engineRef.current.getDragonEggs());
      }
      setActiveStationStructureId(structureId);
      setActiveModal(modal);
      engineRef.current?.setMode('paused');
    },
    [openElevatorComputer, openVehicleMenu],
  );

  const handleTouchJoystickMove = useCallback((x: number, y: number) => {
    if (activeModalRef.current !== null) {
      engineRef.current?.setTouchJoystick(0, 0);
      return;
    }
    engineRef.current?.setTouchJoystick(x, y);
  }, []);
  const handleTouchCameraDrag = useCallback((dx: number, dy: number) => {
    if (activeModalRef.current !== null) return;
    engineRef.current?.addCameraLookDelta(dx, dy, true);
  }, []);
  const handleTouchAction = useCallback(() => {
    if (activeModalRef.current !== null) return;
    engineRef.current?.triggerPrimaryAction();
  }, []);
  const handleTouchReload = useCallback(() => {
    if (activeModalRef.current !== null) return;
    engineRef.current?.reloadEquippedWeapon();
  }, []);
  const handleTouchJump = useCallback(() => {
    if (activeModalRef.current !== null) return;
    engineRef.current?.triggerJump();
  }, []);
  const handleTouchKickDebris = useCallback(() => {
    if (activeModalRef.current !== null) return;
    engineRef.current?.triggerDebrisKick();
  }, []);
  const handleTouchSprintToggle = useCallback((active: boolean) => {
    if (activeModalRef.current !== null) {
      engineRef.current?.setTouchSprint(false);
      return;
    }
    engineRef.current?.setTouchSprint(active);
  }, []);
  const handleTouchCrouchToggle = useCallback((active: boolean) => {
    if (activeModalRef.current !== null) {
      engineRef.current?.setTouchCrouch(false);
      return;
    }
    engineRef.current?.setTouchCrouch(active);
  }, []);
  const handleTouchFlightToggle = useCallback(() => {
    if (activeModalRef.current !== null) return;
    engineRef.current?.togglePlayerFlight();
  }, []);
  const handleTouchFlyAscend = useCallback((active: boolean) => {
    if (activeModalRef.current !== null) {
      engineRef.current?.setTouchFlyAscend(false);
      return;
    }
    engineRef.current?.setTouchFlyAscend(active);
  }, []);
  const handleTouchFlyDescend = useCallback((active: boolean) => {
    if (activeModalRef.current !== null) {
      engineRef.current?.setTouchFlyDescend(false);
      return;
    }
    engineRef.current?.setTouchFlyDescend(active);
  }, []);
  const handleTouchTeleportBiome = useCallback((dest: string) => {
    if (activeModalRef.current !== null) return;
    engineRef.current?.teleportToBiome(dest);
  }, []);
  const handleTouchVehiclePedals = useCallback(
    (gas: number, brake: number, handbrake = false) => {
      if (activeModalRef.current !== null) {
        engineRef.current?.setTouchDrivePedals(0, 0, false);
        return;
      }
      engineRef.current?.setTouchDrivePedals(gas, brake, handbrake);
    },
    [],
  );
  const handleTouchVehicleExit = useCallback(() => {
    if (activeModalRef.current !== null) return;
    engineRef.current?.setTouchDrivePedals(0, 0, false);
    engineRef.current?.exitVehicle();
  }, []);
  const handleTouchVehicleHop = useCallback(() => {
    if (activeModalRef.current !== null) return;
    engineRef.current?.triggerHydraulicAction('front_hop');
  }, []);
  const handleTouchVehicleAscend = useCallback((active: boolean) => {
    if (activeModalRef.current !== null) {
      engineRef.current?.setVehicleVerticalHold(null);
      return;
    }
    engineRef.current?.setVehicleVerticalHold(active ? 'up' : null);
  }, []);
  const handleTouchVehicleDescend = useCallback((active: boolean) => {
    if (activeModalRef.current !== null) {
      engineRef.current?.setVehicleVerticalHold(null);
      return;
    }
    engineRef.current?.setVehicleVerticalHold(active ? 'down' : null);
  }, []);
  const handleTouchOpenBackpack = useCallback(() => {
    openModal('inventory');
  }, [openModal]);
  const handleTouchOpenCraft = useCallback(() => {
    openModal('crafting');
  }, [openModal]);
  const handleTouchOpenPlace = useCallback(() => {
    openModal('place');
  }, [openModal]);

  const closeAllModals = useCallback(() => {
    setActiveModal(null);
    setActiveStationStructureId(undefined);
    if (screen === 'playing') {
      engineRef.current?.setMode('playing');
    }
  }, [screen]);

  const closeModal = closeAllModals;

  const showTouchControls =
    screen === 'playing' &&
    !activeModal &&
    !hud?.gameOver &&
    !hud?.cinematicActive &&
    !hud?.seatedLabel &&
    (settings.touchControlsMode === 'always' ||
      (settings.touchControlsMode === 'auto' && isTouchDevice));

  const touchVisibleForLayout =
    showTouchControls ||
    (gamepadConnected &&
      settings.touchControlsMode !== 'off' &&
      screen === 'playing' &&
      !activeModal &&
      !hud?.gameOver &&
      !hud?.cinematicActive);

  const safeHudLayout = useMemo(
    () =>
      getSafeHudLayoutMetrics(
        viewportSize.width,
        viewportSize.height,
        touchVisibleForLayout,
        stickMinimized || hudMinimizedMobile,
      ),
    [
      viewportSize.width,
      viewportSize.height,
      touchVisibleForLayout,
      stickMinimized,
      hudMinimizedMobile,
    ],
  );

  const hudStructures = hud?.structures;
  const hudPlayerX = hud?.playerX ?? 0;
  const hudPlayerZ = hud?.playerZ ?? 0;
  const hudCompletedMissionIds = hud?.completedMissionIds;
  const hudInventory = hud?.inventory;
  const hudStats = hud?.stats;
  const hudVisitedBiomes = hud?.visitedBiomes;

  const nearCraftingTable = useMemo(() => {
    if (!hudStructures) return false;
    return hudStructures.some(
      (s) =>
        s.type === 'crafting_table' &&
        Math.hypot(s.x - hudPlayerX, s.z - hudPlayerZ) < 6.5,
    );
  }, [hudStructures, hudPlayerX, hudPlayerZ]);

  const nearCookingStation = useMemo(() => {
    if (!hudStructures) return false;
    return hudStructures.some(
      (s) =>
        s.type === 'cooking_station' &&
        Math.hypot(s.x - hudPlayerX, s.z - hudPlayerZ) < 6.5,
    );
  }, [hudStructures, hudPlayerX, hudPlayerZ]);

  const currentMissionInfo = useMemo(() => {
    if (
      !hudCompletedMissionIds ||
      !hudInventory ||
      !hudStructures ||
      !hudStats ||
      !hudVisitedBiomes
    ) {
      return null;
    }
    const mission =
      STAGE_1_MISSIONS.find((m) => !hudCompletedMissionIds.includes(m.id)) ||
      null;
    if (!mission) return null;
    const ctx = {
      inventory: hudInventory,
      structures: hudStructures,
      stats: hudStats,
      visitedBiomes: hudVisitedBiomes,
    };
    const progress = mission.checkProgress(ctx);
    const nextStep = mission.steps?.find((s) => !s.done(ctx))?.label;
    return { mission, progress, nextStep };
  }, [
    hudCompletedMissionIds,
    hudInventory,
    hudStructures,
    hudStats,
    hudVisitedBiomes,
  ]);

  const countOf = (id: ItemId) =>
    hud?.inventory
      .filter((s) => s.itemId === id)
      .reduce((acc, s) => acc + s.quantity, 0) || 0;

  return (
    <div className="relative w-full min-h-[100dvh] overflow-x-hidden bg-stone-950 select-none">
      {webglError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/95 p-6 text-center text-stone-100">
          <div className="max-w-md space-y-4 rounded-2xl border border-stone-700/80 bg-stone-900/90 p-6 shadow-2xl">
            <AlertTriangle className="mx-auto h-10 w-10 text-amber-400" />
            <h2 className="text-lg font-bold">3D Graphics Context Interrupted</h2>
            <p className="text-sm text-stone-300">{webglError}</p>
            <button
              type="button"
              onClick={() => setWebglRetryNonce((n) => n + 1)}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-stone-950 hover:bg-amber-400"
            >
              <RotateCcw className="h-4 w-4" />
              Retry 3D Renderer
            </button>
          </div>
        </div>
      )}
      {/* Isolated WebGL Canvas Mount — Fixed Full-Bleed Behind Scrollable HUD */}
      <div
        ref={canvasMountRef}
        className="fixed inset-0 w-full h-full z-0 touch-surface touch-none"
        onContextMenu={(e) => {
          if (screen === 'playing' && !activeModal) {
            e.preventDefault();
          }
        }}
        onPointerDown={(e) => {
          engineRef.current?.unlockAudio();
          if (screen === 'playing' && !activeModal && !hud?.cinematicActive) {
            if (document.activeElement instanceof HTMLElement) {
              document.activeElement.blur();
            }
            if (lookPointerId.current === null || e.pointerType === 'touch') {
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
          if (screen !== 'playing' || activeModal) return;
          if (document.pointerLockElement === e.currentTarget) {
            engineRef.current?.addCameraLookDelta(
              e.movementX || 0,
              e.movementY || 0,
              false,
            );
            return;
          }
          if (
            e.pointerId === lookPointerId.current &&
            e.pointerType === 'mouse' &&
            e.buttons === 0
          ) {
            lookPointerId.current = null;
            return;
          }
          if (lookPointerId.current === e.pointerId) {
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
            try {
              if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                e.currentTarget.releasePointerCapture(e.pointerId);
              }
            } catch {
              // Ignore
            }
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
              !activeModalRef.current &&
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
        onLostPointerCapture={(e) => {
          if (lookPointerId.current === e.pointerId) {
            lookPointerId.current = null;
          }
        }}
      />

      {/* CINEMATIC BOOT SCREEN — paints before the heavy world build starts */}
      {!engineReady && !webglError && (
        <div className="fixed inset-0 z-40 flex items-center justify-center overflow-hidden bg-stone-950">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_115%,rgba(20,83,45,0.55),transparent_58%),radial-gradient(circle_at_50%_-10%,rgba(251,191,36,0.2),transparent_55%)]" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="relative z-10 w-full max-w-md px-6 text-center">
            <div className="mx-auto mb-7 h-12 w-12 animate-spin rounded-full border-2 border-amber-400/25 border-t-amber-300" />
            <div className="text-[10px] font-semibold uppercase tracking-[0.45em] text-amber-300/90">
              AdventureForgeGames
            </div>
            <h1 className="mt-2 font-display text-3xl font-black tracking-wide text-stone-100 sm:text-4xl">
              SURVIVAL ISLAND
            </h1>
            <p className="mt-1 font-display text-sm tracking-[0.32em] text-emerald-300/90">
              LOST WORLD
            </p>
            <div className="mt-7 h-1.5 w-full overflow-hidden rounded-full bg-stone-800">
              <div className="h-full w-1/3 animate-pulse rounded-full bg-gradient-to-r from-emerald-500 via-amber-300 to-emerald-500" />
            </div>
            <p className="mt-3 text-xs text-stone-400">
              Shaping terrain · planting forests · lighting the island
            </p>
          </div>
        </div>
      )}

      {/* MAIN MENU / WORLD SELECTION OVERLAY */}
      {screen === 'menu' && engineReady && (
        <WorldSelectionMenu
          latestSave={latestSave}
          saveSlots={saveSlots}
          multiplayerRoomCode={hud?.multiplayerState?.roomCode}
          onContinueLatest={() => {
            if (latestSave) handleContinueGame(latestSave.slotId);
          }}
          onLoadSlot={(slotId) => handleContinueGame(slotId)}
          onDeleteSlot={(slotId) => {
            deleteSaveSlot(slotId);
            refreshSaves();
          }}
          onCreateWorld={handleStartNewGame}
          onOpenMultiplayer={() => setActiveModal('multiplayer')}
          onOpenExchange={() => setActiveModal('exchange')}
          onOpenMods={() => setActiveModal('mods')}
          onOpenSettings={() => setActiveModal('settings')}
          onOpenControls={() => setActiveModal('controls')}
          onOpenMap={() => setActiveModal('map')}
          onOpenAchievements={() => setActiveModal('missions')}
          onQuit={() => {
            pushToast({
              id: `quit_${Date.now()}`,
              text: 'All island saves are stored locally — safe to close or choose a world to play.',
              tone: 'info',
            });
          }}
        />
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

          <div className="max-w-2xl mx-auto text-center pb-4 space-y-2">
            {hud.cinematicCrewShout && (
              <div className="inline-block rounded-lg bg-red-950/90 border border-amber-500/70 px-4 py-1.5 text-xs sm:text-sm font-extrabold tracking-wide uppercase text-amber-200 shadow-lg">
                {hud.cinematicCrewShout}
              </div>
            )}
            <div className="block">
              <div className="inline-block rounded-xl bg-stone-950/90 border border-stone-700/80 px-5 py-3 text-sm sm:text-base font-medium text-stone-100 shadow-2xl">
                {hud.cinematicSubtitle}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* IN-GAME FIRST-PERSON HUD (CLEAN MINECRAFT-INSPIRED LAYOUT) */}
      {screen === 'playing' && hud && !hud.cinematicActive && (
        <div
          data-ui-layout-safe={UI_LAYOUT.preventOverlap ? 'true' : 'false'}
          className="pointer-events-none relative z-10 min-h-[100dvh] w-full flex flex-col justify-between gap-1.5 p-2 sm:p-3.5 safe-top safe-bottom safe-left safe-right pb-2 sm:pb-3"
        >
          {/* Subtle Center Crosshair + Target Hitbox Readout (Only when aiming at enemy) */}
          {!activeModal && !hud.gameOver && (
            <div className="fixed inset-0 pointer-events-none flex items-center justify-center">
              {(() => {
                const aimedTarget =
                  hud.targetHitbox ||
                  hud.nearbyCarcass ||
                  (hud.nearbyInteraction &&
                    hud.nearbyInteraction.kind !== 'tool_action' &&
                    hud.nearbyInteraction.kind !== 'gun_action' &&
                    !(
                      hud.nearbyInteraction.kind === 'wash_meat' &&
                      !hud.nearLakeWater
                    ));
                const colorClass = hud.targetHitbox
                  ? hud.targetHitbox.isGapSlip || hud.targetHitbox.armorHp <= 0
                    ? 'bg-emerald-400'
                    : 'bg-amber-300'
                  : hud.nearbyCarcass
                    ? 'bg-emerald-400'
                    : aimedTarget
                      ? 'bg-amber-300'
                      : 'bg-white/85';
                return (
                  <div
                    className="relative w-4 h-4 flex items-center justify-center opacity-90"
                    aria-hidden="true"
                  >
                    <div
                      className={`absolute w-3.5 h-[2px] rounded-full shadow-[0_0_2px_rgba(0,0,0,0.95)] ${colorClass}`}
                    />
                    <div
                      className={`absolute h-3.5 w-[2px] rounded-full shadow-[0_0_2px_rgba(0,0,0,0.95)] ${colorClass}`}
                    />
                  </div>
                );
              })()}

              {hud.targetHitbox && (
                <div className="absolute top-[55%] left-1/2 -translate-x-1/2 w-56 sm:w-64 rounded-lg bg-stone-950/90 border border-stone-700/85 px-2.5 py-1.5 shadow-2xl space-y-1">
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <div className="flex items-center gap-1 min-w-0">
                      {hud.targetHitbox.isBoss && (
                        <Skull className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      )}
                      <span className="font-bold text-stone-100 truncate">
                        {hud.targetHitbox.name}
                      </span>
                    </div>
                    <span className="font-mono-tabular text-stone-400 shrink-0">
                      {hud.targetHitbox.distance.toFixed(1)}m
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-sm bg-stone-800 overflow-hidden">
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

                  <div className="flex flex-wrap items-center gap-1 text-[9px] font-semibold">
                    <span className="px-1 py-0.5 rounded bg-stone-800 text-amber-300 uppercase">
                      {hud.targetHitbox.zone}
                    </span>
                    {hud.targetHitbox.armorTier !== 'none' &&
                    hud.targetHitbox.armorHp > 0 ? (
                      <span className="px-1 py-0.5 rounded bg-stone-900 border border-stone-600 text-stone-200 flex items-center gap-1 uppercase font-mono-tabular">
                        <ShieldAlert className="w-2.5 h-2.5 text-amber-400" />
                        {hud.targetHitbox.armorTier} {Math.ceil(hud.targetHitbox.armorHp)}
                      </span>
                    ) : (
                      <span className="px-1 py-0.5 rounded bg-emerald-950/90 text-emerald-300 flex items-center gap-1 uppercase">
                        <ShieldOff className="w-2.5 h-2.5" />
                        Exposed
                      </span>
                    )}
                    {hud.targetHitbox.blinded && (
                      <span className="px-1 py-0.5 rounded bg-amber-950/90 text-amber-200 uppercase">
                        Blinded
                      </span>
                    )}
                    {hud.targetHitbox.staggered && (
                      <span className="px-1 py-0.5 rounded bg-sky-950/90 text-sky-200 uppercase">
                        Staggered
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Top Bar: Compact Survival Vitals (Left), Slim Compass (Center), Menu/Exit (Right) */}
          <div className="flex flex-nowrap items-start justify-between gap-1.5 sm:gap-3">
            {/* Top-Left Vitals / Flat World Park Tools Panel + Narrow-Viewport Flight/TP Stack */}
            <div className="flex flex-col items-start gap-1.5 shrink-0">
            <div className="pointer-events-auto rounded-lg bg-stone-950/90 border border-stone-700/80 p-1.5 sm:p-2.5 w-[138px] min-[430px]:w-[164px] sm:w-[236px] space-y-1.5 shadow-lg shrink-0">
              <div className="flex items-center justify-between gap-1 text-[10px] sm:text-[11px] text-stone-300 pb-0.5 border-b border-stone-800">
                <span className="font-semibold text-amber-300 truncate">
                  {hud.worldType === 'flat'
                    ? hud.worldName || 'Flat Park Grounds'
                    : hud.biomeName}
                </span>
                <span className="font-mono-tabular shrink-0 flex items-center gap-1.5">
                  <span
                    className={`flex items-center gap-0.5 font-bold ${
                      (hud.fps ?? 60) >= 55 ? 'text-emerald-400' : 'text-sky-300'
                    }`}
                    title="Frame Rate (60 FPS Cap)"
                  >
                    <Gauge className="w-3 h-3" />
                    {Math.min(60, Math.max(1, Math.round(hud.fps ?? 60)))} FPS
                  </span>
                  <span className="flex items-center gap-0.5">
                    {hud.worldType === 'flat' ? (
                      <Sun className="w-3 h-3 text-sky-400" />
                    ) : hud.weather === 'storm' ? (
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
                    D{hud.dayCount}
                  </span>
                </span>
              </div>

              {hud.worldType !== 'flat' &&
                hud.navigatorCompanion &&
                !hud.navigatorCompanion.gone && (
                  <button
                    type="button"
                    onClick={() => {
                      if (hud.navigatorCompanion?.departurePhase === 'active') {
                        openModal('navigator_companion');
                      }
                    }}
                    className={`w-full px-2 py-1 rounded border text-left flex items-center justify-between gap-1.5 text-[10px] transition ${
                      hud.navigatorCompanion.departurePhase !== 'active'
                        ? 'bg-rose-950/85 border-rose-500/60 text-rose-100 cursor-default'
                        : 'bg-teal-950/85 hover:bg-teal-900/90 border-teal-500/55 text-teal-100 cursor-pointer'
                    }`}
                  >
                    <span className="flex items-center gap-1 truncate font-semibold">
                      <Compass className="w-3 h-3 text-amber-300 shrink-0" />
                      <span className="truncate">
                        {hud.navigatorCompanion.name.split(' ')[0]}
                      </span>
                    </span>
                    <span className="text-[9px] uppercase font-bold text-amber-300 shrink-0">
                      {hud.navigatorCompanion.sittingAtWreck
                        ? 'Departed · Driftwood'
                        : hud.navigatorCompanion.departurePhase === 'swim_to_wood' ||
                            hud.navigatorCompanion.departurePhase === 'climb_wood'
                          ? 'Leaving the Ferry'
                          : hud.navigatorCompanion.departurePhase !== 'active'
                            ? 'Returning to Shipwreck'
                            : `${hud.navigatorCompanion.task.replace('_', ' ')} · ${hud.navigatorCompanion.distanceToPlayer}m`}
                    </span>
                  </button>
                )}

              {hud.worldType === 'flat' ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="px-1.5 py-0.5 rounded bg-sky-950 border border-sky-500/50 text-sky-300 font-bold uppercase">
                      Flat · Creative
                    </span>
                    <span className="font-mono-tabular text-stone-300">
                      {hud.coasters?.length ?? 0} Coasters
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      onClick={() => openModal('coaster')}
                      className="min-h-[28px] px-2 rounded bg-sky-500 hover:bg-sky-400 text-stone-950 font-bold text-[10px] flex items-center justify-center gap-1 whitespace-nowrap shrink-0"
                    >
                      <RollerCoaster className="w-3 h-3" />
                      <span>Coasters</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openModal('music_studio')}
                      className="min-h-[28px] px-2 rounded bg-stone-800 hover:bg-stone-700 border border-stone-600 text-amber-300 font-bold text-[10px] flex items-center justify-center gap-1 whitespace-nowrap shrink-0"
                    >
                      <Music className="w-3 h-3" />
                      <span>Music Pro</span>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      engineRef.current?.setFlatSurfaceStyle(
                        hud.flatSurfaceStyle === 'concrete_plaza'
                          ? 'turf_grid'
                          : 'concrete_plaza',
                      )
                    }
                    className="w-full min-h-[26px] px-2 rounded bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 text-[10px] font-semibold flex items-center justify-between gap-1"
                  >
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3 text-emerald-400" />
                      <span>Ground</span>
                    </span>
                    <span className="text-sky-300">
                      {hud.flatSurfaceStyle === 'concrete_plaza'
                        ? 'Concrete'
                        : 'Turf Grid'}
                    </span>
                  </button>
                </div>
              ) : (
                <>
                  <VitalBar
                    icon={<Heart className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-red-400" />}
                    label="Health"
                    value={hud.vitals.health}
                    barColor="bg-red-500"
                  />
                  {(hud.totemRegenSeconds ?? 0) > 0 && (
                    <div className="flex items-center justify-between gap-1.5 rounded bg-emerald-950/95 border border-amber-400/75 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                      <span className="flex items-center gap-1">
                        <ShieldPlus className="w-3 h-3 text-emerald-400" />
                        <span>Totem Regen</span>
                      </span>
                      <span className="font-mono-tabular text-emerald-300">
                        {hud.totemRegenSeconds?.toFixed(1)}s
                      </span>
                    </div>
                  )}
                  <VitalBar
                    icon={<Utensils className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400" />}
                    label="Hunger"
                    value={hud.vitals.hunger}
                    barColor="bg-amber-500"
                  />
                  <VitalBar
                    icon={<Droplets className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-sky-400" />}
                    label="Thirst"
                    value={hud.vitals.thirst}
                    barColor="bg-sky-500"
                  />
                  <VitalBar
                    icon={<Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-lime-400" />}
                    label="Stamina"
                    value={hud.vitals.stamina}
                    barColor="bg-lime-500"
                  />

                  {hud.finalIsland && (
                    <div className="rounded border border-amber-500/45 bg-amber-950/70 px-2 py-1 text-[10px] space-y-0.5">
                      <div className="flex items-center justify-between gap-1 font-bold uppercase tracking-wide text-amber-200">
                        <span className="flex items-center gap-1">
                          <Hexagon className="w-3 h-3 text-amber-300" />
                          Apiary
                        </span>
                        <span
                          className="font-mono-tabular text-[9px] text-amber-300/90"
                          title={`${hud.finalIsland.rideableBees} rideable`}
                        >
                          {hud.finalIsland.friendlyBees}/{hud.finalIsland.bees} Bees
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 font-mono-tabular text-stone-200">
                        <span title="Honey">Honey {hud.finalIsland.honey}</span>
                        <span title="Honeycomb">Comb {hud.finalIsland.honeycomb}</span>
                        <span className="flex items-center gap-0.5 text-amber-300" title="Honey Jewels">
                          <Gem className="w-3 h-3" />
                          {hud.finalIsland.honeyJewels}
                        </span>
                      </div>
                      {hud.currentDimension === 'bee_dimension' && (
                        <button
                          type="button"
                          onClick={() => engineRef.current?.donateHoneyToQueen()}
                          className="pointer-events-auto w-full mt-0.5 rounded bg-amber-500/90 hover:bg-amber-400 text-stone-950 font-bold text-[9px] uppercase tracking-wide py-1"
                          title="Offer 5 Honey to the Hive Queen"
                        >
                          Offer 5 Honey · Queen {hud.finalIsland.queenReputation}/3
                        </button>
                      )}
                    </div>
                  )}

                  {hud.mainland && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveStationStructureId('mainland_district');
                        setActiveModal('mainland');
                        engineRef.current?.setMode('paused');
                      }}
                      className="pointer-events-auto w-full text-left rounded border border-amber-500/45 bg-gradient-to-r from-stone-950 to-amber-950/50 px-2 py-1 text-[10px] space-y-0.5 hover:border-amber-400/80 transition"
                      title="Open Crescent City network (Y)"
                    >
                      <div className="flex items-center justify-between gap-1 font-bold uppercase tracking-wide text-amber-200">
                        <span className="flex items-center gap-1">
                          <Navigation className="w-3 h-3 text-amber-300" />
                          Crescent City
                        </span>
                        <span className="flex items-center gap-0.5">
                          {[0, 1, 2, 3, 4].map((i) => (
                            <span
                              key={i}
                              className={`h-1.5 w-1.5 rounded-full ${
                                i < hud.mainland!.heat
                                  ? 'bg-amber-400 shadow-[0_0_5px_rgba(251,191,36,0.7)]'
                                  : 'bg-stone-700'
                              }`}
                            />
                          ))}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-1 text-stone-300">
                        <span className="truncate">{hud.mainland.cityTier}</span>
                        <span className="font-mono-tabular text-[9px] text-amber-300/90">
                          {hud.mainland.pursuitActive
                            ? `PURSUIT ${hud.mainland.pursuitUnits}`
                            : `${hud.mainland.ownedProperties.length}/4 PROP`}
                        </span>
                      </div>
                    </button>
                  )}

                  {/* Optional Collapsible Extra Telemetry */}
                  <div className="pt-0.5 border-t border-stone-800/80">
                    <button
                      type="button"
                      onClick={() => setTelemetryExpanded(!telemetryExpanded)}
                      className="w-full flex items-center justify-between text-[10px] text-stone-400 hover:text-stone-200"
                    >
                      <span className="truncate">{formatTimePhase(hud.timeOfDay)}</span>
                      {telemetryExpanded ? (
                        <ChevronUp className="w-3 h-3 shrink-0" />
                      ) : (
                        <ChevronDown className="w-3 h-3 shrink-0" />
                      )}
                    </button>
                    {telemetryExpanded && (
                      <div className="space-y-1 text-[10px] font-mono-tabular text-stone-300 pt-1 mt-0.5 border-t border-stone-800/60">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-0.5">
                            <Thermometer className="w-3 h-3" />
                            {hud.vitals.temperatureC.toFixed(1)}°C
                          </span>
                          <span className="flex items-center gap-0.5">
                            <Eye className="w-3 h-3" />
                            {hud.visibilityPercent}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-stone-400">
                          <span>W:{countOf('wood')}</span>
                          <span>S:{countOf('stone')}</span>
                          <span className="text-amber-300 flex items-center gap-0.5">
                            <Coins className="w-3 h-3" />
                            {hud.coins}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {!touchVisibleForLayout &&
              viewportSize.width < 1200 &&
              !activeModal &&
              !hud.gameOver &&
              !hud.activeVehicle && (
                <div className="pointer-events-auto flex flex-col items-start gap-1 w-[174px] sm:w-[216px]">
                  <div className="flex items-center gap-1 w-full">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={Boolean(hud.isFlying)}
                      aria-label="Toggle Flight"
                      onClick={() => {
                        if (activeModalRef.current !== null) return;
                        engineRef.current?.togglePlayerFlight();
                      }}
                      className={`h-8 px-2 rounded-lg border flex items-center gap-1 shadow-lg transition-colors flex-1 justify-center ${
                        hud.isFlying
                          ? 'bg-sky-500 border-sky-200 text-stone-950'
                          : 'bg-stone-950/85 border-stone-500/60 text-stone-100 hover:border-sky-400/70'
                      }`}
                    >
                      <Plane className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-extrabold uppercase tracking-wider whitespace-nowrap">
                        Fly {hud.isFlying ? 'ON' : 'OFF'}
                      </span>
                    </button>
                    <button
                      type="button"
                      aria-label="Fly Higher"
                      title="Hold to Fly Higher"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        if (activeModalRef.current !== null) return;
                        engineRef.current?.setTouchFlyAscend(true);
                      }}
                      onPointerUp={(e) => {
                        e.stopPropagation();
                        engineRef.current?.setTouchFlyAscend(false);
                      }}
                      onPointerLeave={() => engineRef.current?.setTouchFlyAscend(false)}
                      onPointerCancel={() => engineRef.current?.setTouchFlyAscend(false)}
                      className={`w-8 h-8 rounded-lg border flex items-center justify-center shadow-lg transition-colors ${
                        hud.isFlying
                          ? 'bg-sky-500/90 border-sky-200 text-stone-950'
                          : 'bg-stone-950/85 border-stone-500/60 text-sky-300'
                      }`}
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Fly Down"
                      title="Hold to Fly Down"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        if (activeModalRef.current !== null) return;
                        engineRef.current?.setTouchFlyDescend(true);
                      }}
                      onPointerUp={(e) => {
                        e.stopPropagation();
                        engineRef.current?.setTouchFlyDescend(false);
                      }}
                      onPointerLeave={() => engineRef.current?.setTouchFlyDescend(false)}
                      onPointerCancel={() => engineRef.current?.setTouchFlyDescend(false)}
                      className={`w-8 h-8 rounded-lg border flex items-center justify-center shadow-lg transition-colors ${
                        hud.isFlying
                          ? 'bg-sky-500/90 border-sky-200 text-stone-950'
                          : 'bg-stone-950/85 border-stone-500/60 text-sky-300'
                      }`}
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <form
                    id="teleport-bar"
                    onSubmit={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (activeModalRef.current !== null) return;
                      const dest = quickTpInput.trim();
                      if (!dest) return;
                      engineRef.current?.teleportToBiome(dest);
                      setQuickTpInput('');
                    }}
                    onKeyDown={(e) => e.stopPropagation()}
                    onKeyUp={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 h-8 w-full bg-stone-950/92 border border-sky-500/50 rounded-lg px-2 shadow-lg"
                  >
                    <Navigation className="w-3 h-3 text-sky-400 shrink-0" />
                    <input
                      type="text"
                      value={quickTpInput}
                      onChange={(e) => setQuickTpInput(e.target.value)}
                      onKeyDown={(e) => e.stopPropagation()}
                      onKeyUp={(e) => e.stopPropagation()}
                      placeholder="TP biome..."
                      aria-label="Teleport to biome"
                      className="flex-1 min-w-0 bg-transparent text-[11px] text-stone-100 placeholder:text-stone-400 focus:outline-none select-text"
                    />
                    <button
                      type="submit"
                      className="px-2 py-0.5 rounded bg-sky-500 hover:bg-sky-400 text-stone-950 text-[10px] font-extrabold uppercase tracking-wider shrink-0"
                    >
                      TP
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Top-Center Slim Compass (No permanent objective box blocking center view) */}
            <div className="flex flex-col items-center gap-1 min-w-0">
              {settings.showCompass !== false && (
                <CompassStrip playerYaw={hud.playerYaw} />
              )}
            </div>

            {/* Top-Right Compact Actions: Coasters / Menu / Exit Vehicle / Stand Up / Exit Ride */}
            <div className="pointer-events-auto flex flex-col items-end gap-1 shrink-0">
              <div className="flex items-center gap-1.5">
                {hud.multiplayerState?.connected && (
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
                    className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold flex items-center gap-1 shadow-lg transition ${
                      hud.multiplayerState?.micMuted
                        ? 'bg-red-950/90 border-red-500 text-red-200'
                        : hud.multiplayerState?.localSpeaking
                          ? 'bg-emerald-500 border-emerald-200 text-stone-950'
                          : 'bg-emerald-950/90 border-emerald-500/60 text-emerald-200'
                    }`}
                    title="Toggle Mic (M)"
                  >
                    {hud.multiplayerState?.micMuted ? (
                      <VolumeX className="w-3.5 h-3.5" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5" />
                    )}
                    <span className="hidden sm:inline">
                      {hud.multiplayerState?.micMuted ? 'MUTED' : 'MIC'}
                    </span>
                  </button>
                )}

                {hud?.activeCoasterRide ? (
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      engineRef.current?.exitCoasterRide();
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      engineRef.current?.exitCoasterRide();
                    }}
                    className="pointer-events-auto px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-stone-950 font-display font-extrabold text-xs shadow-lg border border-sky-200 flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                    style={{ position: 'relative', zIndex: 60 }}
                    title="Exit Roller Coaster (E)"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>EXIT RIDE</span>
                  </button>
                ) : hud?.activeVehicle ? (
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
                    className="pointer-events-auto px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-display font-extrabold text-xs shadow-lg border border-amber-200 flex items-center gap-1 cursor-pointer"
                    style={{ position: 'relative', zIndex: 60 }}
                    title="Exit Vehicle (E)"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>EXIT</span>
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
                    className="pointer-events-auto px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-stone-950 font-display font-extrabold text-xs shadow-lg border border-sky-200 flex items-center gap-1 cursor-pointer"
                    style={{ position: 'relative', zIndex: 60 }}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>STAND</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => engineRef.current?.toggleCameraView()}
                      className="px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg bg-stone-950/90 hover:bg-stone-900 text-amber-200 font-display font-bold text-[11px] sm:text-sm flex items-center gap-1 sm:gap-1.5 shadow-lg border border-stone-700/85 transition whitespace-nowrap shrink-0"
                      title="Toggle 1st / 3rd Person Camera (F5 / K)"
                    >
                      <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
                      <span>{hud?.cameraViewMode === 'first_person' ? '1ST' : '3RD'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openModal('coaster')}
                      className="px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg bg-stone-950/90 hover:bg-stone-900 text-sky-300 font-display font-bold text-[11px] sm:text-sm flex items-center gap-1 sm:gap-1.5 shadow-lg border border-sky-500/40 transition whitespace-nowrap shrink-0"
                      title="Roller Coaster Creator"
                    >
                      <RollerCoaster className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">COASTER</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveModal('menu_drawer');
                        engineRef.current?.setMode('paused');
                      }}
                      className="px-2 py-1.5 sm:px-3.5 sm:py-2 rounded-lg bg-stone-950/90 hover:bg-stone-900 text-amber-300 font-display font-bold text-[11px] sm:text-sm flex items-center gap-1 sm:gap-1.5 shadow-lg border border-stone-700/85 transition whitespace-nowrap shrink-0"
                    >
                      <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span>MENU</span>
                    </button>
                  </>
                )}
              </div>

              {/* Active Voice Speakers (Only during Multiplayer Voice) */}
              {hud.multiplayerState?.connected &&
                (hud.multiplayerState.localSpeaking ||
                  (hud.multiplayerState.speakingPeers?.length ?? 0) > 0) && (
                  <div className="flex flex-col items-end gap-1 pointer-events-none">
                    {hud.multiplayerState.localSpeaking && (
                      <div className="px-2 py-0.5 rounded bg-stone-950/90 border border-emerald-400/80 flex items-center gap-1 text-[11px] font-bold text-emerald-300">
                        <AudioLines className="w-3 h-3 text-emerald-400" />
                        <span>{hud.multiplayerState.playerName}</span>
                      </div>
                    )}
                    {hud.multiplayerState.speakingPeers?.map((pid) => {
                      const peer = hud.multiplayerState?.peers.find((p) => p.peerId === pid);
                      return (
                        <div
                          key={pid}
                          className="px-2 py-0.5 rounded bg-stone-950/90 border border-emerald-400/80 flex items-center gap-1 text-[11px] font-bold text-emerald-300"
                        >
                          <AudioLines className="w-3 h-3 text-emerald-400" />
                          <span>{peer?.name || 'Survivor'}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
            </div>
          </div>

          {/* Minimal Brief Toasts & Critical Contextual Controls Only (Center viewport stays completely open) */}
          <div className="flex flex-col items-center gap-1 mt-1 mb-auto pointer-events-none">
            {((hud.tvState?.isYouTubeActive &&
              hud.tvState?.power &&
              !hud.tvState?.isStopped) ||
              (hud.structuralSummary && hud.structuralSummary.bucklingCount > 0) ||
              hud.momentumState?.wallRunning) && (
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {hud.tvState?.isYouTubeActive &&
                  hud.tvState?.power &&
                  !hud.tvState?.isStopped && (
                    <button
                      type="button"
                      onClick={() => openModal('tv')}
                      className="pointer-events-auto px-2.5 py-0.5 rounded-lg bg-stone-950/90 hover:bg-stone-800 border border-amber-500/60 text-[11px] font-medium text-amber-200 flex items-center gap-1.5 transition"
                      title="Open Smart TV Remote"
                    >
                      <Tv className="w-3 h-3 text-amber-300" />
                      <span>TV Remote</span>
                    </button>
                  )}
                {tvPipDismissed &&
                  hud.tvState?.isYouTubeActive &&
                  hud.tvState?.power &&
                  !hud.tvState?.isStopped && (
                    <button
                      type="button"
                      onClick={() => setTvPipDismissed(false)}
                      className="pointer-events-auto px-2.5 py-0.5 rounded-lg bg-red-950/90 hover:bg-red-900 border border-red-500/60 text-[11px] font-medium text-red-200 flex items-center gap-1 transition"
                    >
                      <Play className="w-3 h-3 fill-current text-red-300" />
                      <span>Show TV</span>
                    </button>
                  )}
                {hud.structuralSummary && hud.structuralSummary.bucklingCount > 0 && (
                  <div className="px-2.5 py-0.5 rounded-lg bg-red-950/90 border border-red-600/80 text-[11px] font-bold text-red-200 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-red-400" />
                    <span>Buckling ({hud.structuralSummary.bucklingCount})</span>
                  </div>
                )}
                {hud.momentumState?.wallRunning && (
                  <div className="px-2.5 py-0.5 rounded-lg bg-emerald-950/90 border border-emerald-500/80 text-[11px] font-bold text-emerald-200 flex items-center gap-1">
                    <Footprints className="w-3 h-3 text-emerald-300" />
                    <span>Wall-Run</span>
                  </div>
                )}
              </div>
            )}

            {hud.navigatorCompanion?.speechLine && !hud.cinematicActive && (
              <div className="max-w-[min(88vw,440px)] rounded-xl border border-amber-400/45 bg-stone-950/90 px-3.5 py-1.5 sm:px-4 sm:py-2 text-center shadow-2xl backdrop-blur-md">
                <div className="text-[10px] font-bold uppercase tracking-widest text-amber-300">
                  {hud.navigatorCompanion.name}
                </div>
                <div className="mt-0.5 text-xs sm:text-sm font-semibold text-stone-100 italic line-clamp-2">
                  &ldquo;{hud.navigatorCompanion.speechLine}&rdquo;
                </div>
              </div>
            )}

            {toasts.map((t) => (
              <div
                key={t.id}
                className={`px-3 py-1 rounded-lg text-[11px] sm:text-xs font-semibold border shadow-lg flex items-center gap-1.5 ${
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
                  <ItemIcon itemId={t.itemId} className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>{t.text}</span>
              </div>
            ))}
          </div>

          {/* Bottom-Center Contextual Prompts (Repositioned Outside Player Controls) + Compact Minecraft-Style Hotbar */}
          <div
            className="flex flex-col items-center gap-1.5 mx-auto w-full"
            style={
              UI_LAYOUT.reservePlayerControls &&
              touchVisibleForLayout &&
              !stickMinimized &&
              !hudMinimizedMobile &&
              safeHudLayout.isLandscapeCompact
                ? { maxWidth: `${safeHudLayout.centerBandMaxWidthPx}px` }
                : undefined
            }
          >
            {/* Contextual Action Buttons: Repositioned above touch controls on portrait phones so #joystick-pad & #combat-controls stay clear */}
            <div
              className={`flex flex-wrap items-center justify-center gap-1.5 max-w-[min(92vw,460px)] ${
                UI_LAYOUT.repositionMenus &&
                touchVisibleForLayout &&
                !stickMinimized &&
                !hudMinimizedMobile &&
                !safeHudLayout.isLandscapeCompact &&
                safeHudLayout.repositionPromptAboveControls
                  ? 'mb-[158px]'
                  : rocketControlsActive && !hudMinimizedMobile
                    ? 'mb-[64px]'
                    : ''
              }`}
            >
              {hud.seatedLabel && !activeModal && (
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => engineRef.current?.standUp()}
                  className="pointer-events-auto min-h-[40px] px-3.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-stone-950 font-bold text-xs shadow-xl flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <span>Stand Up</span>
                </button>
              )}

              {hud.nearbyCarcass && !activeModal && (
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() =>
                    engineRef.current?.collectNearbyCarcass(hud.nearbyCarcass!.id)
                  }
                  className="pointer-events-auto min-h-[44px] px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-300 border-2 border-emerald-200 text-stone-950 font-extrabold text-xs sm:text-sm shadow-2xl flex items-center gap-2 whitespace-nowrap shrink-0"
                  title="Collect meat & hide from carcass (F)"
                >
                  <PackagePlus className="w-4 h-4 shrink-0" />
                  <span className="tracking-wide">COLLECT</span>
                  <span className="font-semibold text-[11px] opacity-90">
                    {hud.nearbyCarcass.displayName} ({hud.nearbyCarcass.summary})
                  </span>
                  <span className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded bg-stone-950/20 font-mono-tabular">
                    F
                  </span>
                </button>
              )}

              {hud.nearbyInteraction &&
                !activeModal &&
                hud.nearbyInteraction.kind !== 'carcass' &&
                hud.nearbyInteraction.kind !== 'tool_action' &&
                hud.nearbyInteraction.kind !== 'gun_action' &&
                !(
                  hud.nearbyInteraction.kind === 'wash_meat' &&
                  !hud.nearLakeWater
                ) && (
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => engineRef.current?.triggerHudInteraction()}
                    className="pointer-events-auto min-h-[40px] px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 border border-amber-300/80 text-stone-950 font-bold text-xs sm:text-sm shadow-xl flex items-center gap-1.5 whitespace-nowrap shrink-0"
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
                        ? ` · ${hud.nearbyInteraction.sublabel}`
                        : ''}
                    </span>
                    <span className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded bg-stone-950/20 font-mono-tabular">
                      E
                    </span>
                  </button>
                )}

              {hud.nearLakeWater &&
                hud.hasWashableMeat &&
                !activeModal &&
                hud.nearbyInteraction?.kind !== 'wash_meat' && (
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => engineRef.current?.washAndScrubMeat()}
                    className="pointer-events-auto min-h-[40px] px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-stone-950 font-bold text-xs shadow-xl flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>
                      {hud.hasSoap ? 'Wash & Scrub Meat' : 'Need Soap to Wash'}
                    </span>
                  </button>
                )}

              {hud.hasDriedMeatToCut &&
                !activeModal &&
                hud.nearbyInteraction?.kind !== 'cut_meat' && (
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => engineRef.current?.cutDriedMeatWithKnife()}
                    className="pointer-events-auto min-h-[40px] px-3.5 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-stone-950 font-bold text-xs shadow-xl flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    <Utensils className="w-4 h-4" />
                    <span>Cut Dried Meat</span>
                  </button>
                )}
            </div>

            {/* Active Coaster First-Person Ride HUD */}
            {hud.activeCoasterRide && !activeModal && (
              <div
                onPointerDown={(e) => e.stopPropagation()}
                className="pointer-events-auto relative z-30 w-[min(95vw,520px)] rounded-xl bg-stone-950/92 border border-sky-400/60 px-3.5 py-2.5 shadow-2xl flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-400/50 flex items-center justify-center text-sky-300 shrink-0">
                    <RollerCoaster className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-stone-100 truncate">
                      {hud.activeCoasterRide.coasterName}
                    </div>
                    <div className="text-[11px] font-mono-tabular text-stone-300 flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                      <span className="text-sky-300 font-bold">
                        {Math.round(hud.activeCoasterRide.speedKmh)} km/h
                      </span>
                      <span>Elev {hud.activeCoasterRide.heightM.toFixed(1)}m</span>
                      <span>{(hud.activeCoasterRide.verticalG ?? 1).toFixed(1)}G</span>
                      {hud.activeCoasterRide.segmentLabel && (
                        <span className="font-sans text-stone-400">
                          {hud.activeCoasterRide.segmentLabel}
                        </span>
                      )}
                      <span>{Math.round(hud.activeCoasterRide.progressPercent)}%</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => engineRef.current?.exitCoasterRide()}
                  className="min-h-[34px] px-3 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-stone-950 text-xs font-bold flex items-center gap-1 whitespace-nowrap shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Disembark [E]</span>
                </button>
              </div>
            )}

            {/* Saturn V Launch Telemetry HUD (IGNITION -> STAGE 1 -> STAGE 2 -> ORBIT READY) */}
            {(hud.spaceState?.launchPhase === 'IGNITION' ||
              hud.spaceState?.launchPhase === 'ASCENT') && (
              <div
                onPointerDown={(e) => e.stopPropagation()}
                className="pointer-events-auto relative z-30 w-[min(95vw,520px)] rounded-xl bg-slate-950/95 border border-orange-500/80 px-4 py-2.5 shadow-2xl space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-orange-400">
                      SATURN V TELEMETRY · {hud.spaceState.launchPhase}
                    </div>
                    <div className="text-sm font-black text-white">
                      DESTINATION: {hud.spaceState.launchDestination || 'ORBIT'}
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <div className="text-xs font-extrabold text-amber-300">
                      STAGE {hud.spaceState.launchStage}{' '}
                      {hud.spaceState.launchStage === 1 ? '(S-IC F-1)' : '(S-II BURN)'}
                    </div>
                    <div className="text-[11px] text-sky-300">
                      ALT {hud.spaceState.launchAltitude}m / {hud.spaceState.launchOrbitAltitude}m ·{' '}
                      {hud.spaceState.launchVelocityY} m/s
                    </div>
                  </div>
                </div>
                <div className="relative h-2.5 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 via-amber-400 to-sky-400 transition-all duration-100"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(
                          (hud.spaceState.launchAltitude /
                            Math.max(1, hud.spaceState.launchOrbitAltitude)) *
                            100,
                        ),
                      )}%`,
                    }}
                  />
                  {/* Stage 1 Separation marker at 45% orbit altitude */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-white/80"
                    style={{ left: '45%' }}
                    title="Stage 1 Separation (45%)"
                  />
                </div>
              </div>
            )}

            {/* Space Planet & UFO Combat HUD Banner */}
            {hud.spaceState?.inSpacePlanet && !activeModal && (
              <div
                onPointerDown={(e) => e.stopPropagation()}
                className="planet-action-card pointer-events-auto relative z-30 w-[min(95vw,640px)] rounded-xl bg-slate-950/92 border border-sky-500/60 px-3 py-2 shadow-2xl flex flex-wrap items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-extrabold text-sky-200 truncate">
                    {hud.spaceState.planetName} · {hud.spaceState.gravity}g
                  </div>
                  <div className="text-[11px] text-stone-400 truncate">
                    {hud.spaceState.universeName} · {hud.spaceState.galaxyName}
                    {hud.spaceState.activeUfo && !hud.spaceState.activeUfo.isDowned
                      ? ` · UFO HP ${hud.spaceState.activeUfo.hp}/${hud.spaceState.activeUfo.maxHp}`
                      : ''}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => engineRef.current?.fireAlienBlaster()}
                    className="min-h-[32px] px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 border border-purple-300 text-white text-[11px] font-extrabold transition"
                  >
                    Fire {hud.spaceState.equippedAlienGunName || 'Alien Blaster'} (∞)
                  </button>
                  <button
                    type="button"
                    onClick={() => openModal('saturn_rocket')}
                    className="min-h-[32px] px-2.5 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-stone-950 text-[11px] font-extrabold transition"
                  >
                    Saturn V Console
                  </button>
                  <button
                    type="button"
                    onClick={() => engineRef.current?.returnToEarthFromSpace()}
                    className="min-h-[32px] px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-stone-950 text-[11px] font-extrabold transition"
                  >
                    Return to Earth
                  </button>
                </div>
              </div>
            )}

            {/* Active Vehicle Driving HUD — Never renders when Elevator Computer, another modal, or mobile Minimize HUD is active */}
            {hud.activeVehicle &&
              !activeModal &&
              !hudMinimizedMobile &&
              activeModal !== 'underground_elevator' && (
              <div
                id="car-hydraulics-deck"
                onPointerDown={(e) => e.stopPropagation()}
                className={`pointer-events-auto relative z-30 rounded-xl bg-stone-950/95 border border-amber-500/50 px-2.5 sm:px-3 py-1.5 sm:py-2 shadow-2xl space-y-1.5 transition-all ${
                  stickMinimized
                    ? 'controls-minimized-mode w-[min(96vw,680px)]'
                    : UI_LAYOUT.repositionMenus &&
                        touchVisibleForLayout &&
                        !safeHudLayout.isLandscapeCompact &&
                        vehicleDeckExpanded
                      ? 'w-[min(96vw,580px)] mb-[158px]'
                      : 'w-[min(96vw,580px)] max-w-full'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0">
                      <Car className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-bold text-stone-100 truncate flex items-center gap-1.5">
                        <span className="truncate">{hud.activeVehicle.name}</span>
                        {hud.activeVehicle.highClearance && (
                          <span className="hidden sm:inline px-1.5 py-0.5 rounded bg-sky-950 border border-sky-500/60 text-[9px] font-bold text-sky-300 uppercase shrink-0">
                            30&quot; Lifted
                          </span>
                        )}
                        {(hud.activeVehicle.preset === 'chevy_tahoe' ||
                          hud.activeVehicle.preset === 'chevy_2000_sub' ||
                          hud.activeVehicle.slammedStance) && (
                          <>
                            <span className="hidden sm:inline px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-400/60 text-[9px] font-bold text-cyan-200 uppercase shrink-0">
                              40&quot; Forgiato 44s
                            </span>
                            <span
                              className={`hidden sm:inline px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase shrink-0 ${
                                hud.activeVehicle.slammedStance
                                  ? 'bg-pink-950 border-pink-400/60 text-pink-200'
                                  : 'bg-emerald-950 border-emerald-400/60 text-emerald-200'
                              }`}
                            >
                              {hud.activeVehicle.slammedStance
                                ? '3" Slammed'
                                : `${hud.activeVehicle.liftHeightInches ?? 12}" Lifted`}
                            </span>
                          </>
                        )}
                        {hud.activeVehicle.inWater && (
                          <span className="px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/60 text-[9px] font-bold text-cyan-300 uppercase shrink-0">
                            Water
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono-tabular text-stone-400 flex items-center gap-2">
                        <span className="text-amber-300 font-bold">
                          {hud.activeVehicle.speedKmh} km/h
                        </span>
                        <span>Fuel {hud.activeVehicle.fuel}%</span>
                        <span className="hidden sm:inline">
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

                  <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => engineRef.current?.openCarRadio()}
                      className={`min-h-[34px] px-2 sm:px-2.5 py-1 rounded-lg border text-[11px] sm:text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                        hud.activeVehicle.isOldSchool
                          ? 'bg-pink-950/90 hover:bg-pink-900 border-pink-400/60 text-pink-200'
                          : 'bg-sky-950/90 hover:bg-sky-900 border-sky-400/60 text-sky-200'
                      }`}
                      title="Open Car Radio / Pandora [B]"
                    >
                      <Radio className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Radio</span>
                    </button>
                    <button
                      type="button"
                      aria-expanded={vehicleDeckExpanded}
                      onClick={() =>
                        setVehicleDeckExpandedForId((prev) =>
                          prev === activeVehicleIdForDeck ? null : activeVehicleIdForDeck,
                        )
                      }
                      className={`min-h-[34px] px-2 sm:px-2.5 py-1 rounded-lg border text-[11px] sm:text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                        vehicleDeckExpanded
                          ? 'bg-amber-500 border-amber-200 text-stone-950'
                          : 'bg-stone-800 hover:bg-stone-700 border-amber-500/40 text-amber-200'
                      }`}
                    >
                      <span>Tuning</span>
                      {vehicleDeckExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      id="minimize-controls-btn"
                      type="button"
                      aria-pressed={stickMinimized}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        controlsMinimizerRef.current?.setMinimized(!stickMinimized);
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      className={`min-h-[34px] px-2 sm:px-2.5 py-1 rounded-lg border text-[11px] sm:text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                        stickMinimized
                          ? 'bg-emerald-500 border-emerald-200 text-stone-950'
                          : 'bg-purple-900/90 hover:bg-purple-800 border-purple-400/70 text-purple-100'
                      }`}
                    >
                      <span className="sm:hidden">{stickMinimized ? 'Pad' : 'Hide Pad'}</span>
                      <span className="hidden sm:inline">
                        {stickMinimized ? 'Show Controls' : 'Minimize HUD'}
                      </span>
                    </button>
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
                      className="min-h-[34px] px-2 sm:px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-100 text-[11px] sm:text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                    >
                      <Box className="w-3.5 h-3.5 text-amber-300" />
                      <span className="hidden sm:inline">Cargo [F]</span>
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
                      className="min-h-[34px] px-2.5 sm:px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 text-[11px] sm:text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Exit</span>
                    </button>
                  </div>
                </div>

                {vehicleDeckExpanded && (
                <div className="max-h-[34dvh] sm:max-h-[40dvh] overflow-y-auto survival-scroll space-y-2 pt-1.5 border-t border-stone-800">
                {/* Universal Car Doors, Pop Trunk, Interior Camera & Interior Droptop Switch */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => engineRef.current?.toggleVehicleInteriorCamera()}
                    className={`min-h-[30px] px-2.5 py-1 rounded-lg border text-[11px] font-bold transition ${
                      hud.activeVehicle.interiorView
                        ? 'bg-indigo-500 border-indigo-200 text-white'
                        : 'bg-stone-900 border-stone-700 text-stone-200 hover:bg-stone-800'
                    }`}
                  >
                    {hud.activeVehicle.interiorView ? 'Outside Cam [V]' : 'Interior View [V]'}
                  </button>
                  <button
                    type="button"
                    onClick={() => engineRef.current?.toggleVehicleDoors()}
                    className={`min-h-[30px] px-2.5 py-1 rounded-lg border text-[11px] font-bold transition ${
                      hud.activeVehicle.doorsOpen
                        ? 'bg-emerald-500 border-emerald-200 text-stone-950'
                        : 'bg-stone-900 border-stone-700 text-stone-200 hover:bg-stone-800'
                    }`}
                  >
                    {hud.activeVehicle.doorsOpen ? 'Close Doors' : 'Open Doors (Interior)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => engineRef.current?.toggleVehicleTrunk()}
                    className={`min-h-[30px] px-2.5 py-1 rounded-lg border text-[11px] font-bold transition ${
                      hud.activeVehicle.trunkOpen
                        ? 'bg-amber-500 border-amber-200 text-stone-950'
                        : 'bg-stone-900 border-stone-700 text-stone-200 hover:bg-stone-800'
                    }`}
                  >
                    {hud.activeVehicle.trunkOpen ? 'Close Trunk' : 'Pop Trunk'}
                  </button>
                  <button
                    type="button"
                    onClick={() => engineRef.current?.openCarRadio()}
                    className={`min-h-[30px] px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 transition ${
                      hud.activeVehicle.isOldSchool
                        ? 'bg-pink-950/90 hover:bg-pink-900 border-pink-400/60 text-pink-200'
                        : 'bg-sky-950/90 hover:bg-sky-900 border-sky-400/60 text-sky-200'
                    }`}
                  >
                    <Radio className="w-3 h-3" />
                    <span>Car Radio / Pandora [B]</span>
                  </button>
                  {hud.activeVehicle.hasConvertibleTop && (
                    <button
                      type="button"
                      onClick={() => engineRef.current?.toggleConvertibleTop()}
                      className={`min-h-[30px] px-2.5 py-1 rounded-lg border text-[11px] font-bold transition ${
                        hud.activeVehicle.convertibleTopDown
                          ? 'bg-emerald-500 border-emerald-200 text-stone-950'
                          : 'bg-amber-500/20 border-amber-400 text-amber-200 hover:bg-amber-500/30'
                      }`}
                    >
                      {hud.activeVehicle.convertibleTopDown
                        ? hud.activeVehicle.convertibleTopProgress < 0.98
                          ? `Dropping Top (${Math.round(hud.activeVehicle.convertibleTopProgress * 100)}%)`
                          : 'Console Switch [T]: Raise Top'
                        : hud.activeVehicle.convertibleTopProgress > 0.02
                          ? `Raising Top (${Math.round((1 - hud.activeVehicle.convertibleTopProgress) * 100)}%)`
                          : 'Console Switch [T]: Drop Top'}
                    </button>
                  )}
                </div>

                {/* In-Car Console Buttons: Lift/3" Slam + 40" Rim Lights (Lit / Blink / Music Sync) & Underglow */}
                {(hud.activeVehicle.hasRimLights || hud.activeVehicle.hasUnderglow) && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-stone-800">
                    <button
                      type="button"
                      onClick={() => engineRef.current?.toggleVehicleSlamLift()}
                      className={`min-h-[30px] px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 transition ${
                        hud.activeVehicle.slammedStance
                          ? 'bg-sky-500 border-sky-200 text-stone-950'
                          : 'bg-pink-500 border-pink-200 text-white'
                      }`}
                    >
                      {hud.activeVehicle.slammedStance ? (
                        <>
                          <ArrowUp className="w-3 h-3" />
                          <span>Lift Ride</span>
                        </>
                      ) : (
                        <>
                          <ArrowDown className="w-3 h-3" />
                          <span>Slam 3&quot;</span>
                        </>
                      )}
                    </button>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 px-1">
                      40&quot; Rims [L]:
                    </span>
                    {(
                      [
                        { id: 'solid', label: 'Lit' },
                        { id: 'blink', label: 'Blink' },
                        { id: 'music', label: 'Music Sync' },
                        { id: 'off', label: 'Off' },
                      ] as const
                    ).map((opt) => {
                      const active = hud.activeVehicle?.rimLightMode === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => engineRef.current?.setVehicleRimLightMode(opt.id)}
                          className={`min-h-[30px] px-2 py-1 rounded-lg border text-[11px] font-bold transition ${
                            active
                              ? opt.id === 'music'
                                ? 'bg-pink-500 border-pink-200 text-white'
                                : opt.id === 'off'
                                  ? 'bg-stone-600 border-stone-300 text-white'
                                  : 'bg-cyan-400 border-cyan-100 text-stone-950'
                              : 'bg-stone-900 border-stone-700 text-stone-300 hover:bg-stone-800'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => engineRef.current?.toggleVehicleUnderglow()}
                      className={`min-h-[30px] px-2.5 py-1 rounded-lg border text-[11px] font-bold transition ${
                        hud.activeVehicle.underglowEnabled
                          ? 'bg-emerald-500 border-emerald-200 text-stone-950'
                          : 'bg-stone-900 border-stone-700 text-stone-300 hover:bg-stone-800'
                      }`}
                    >
                      Underglow {hud.activeVehicle.underglowEnabled ? 'ON' : 'OFF'}
                    </button>
                  </div>
                )}

                {hud.activeVehicle.hasHydraulics && (
                  <div className="space-y-2 pt-1 border-t border-stone-800">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {hud.activeVehicle.hydraulicStyle === 'airbag_coilover' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => engineRef.current?.triggerHydraulicAction('lock_up')}
                            className={`min-h-[30px] px-2 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 ${
                              hud.activeVehicle.hydraulicMode === 'lock_up'
                                ? 'bg-sky-400 border-sky-100 text-stone-950'
                                : 'bg-stone-900 border-stone-700 text-stone-200'
                            }`}
                          >
                            <ArrowUp className="w-3 h-3" />
                            <span>Up</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => engineRef.current?.triggerHydraulicAction('drop')}
                            className={`min-h-[30px] px-2 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 ${
                              hud.activeVehicle.hydraulicMode === 'drop_down'
                                ? 'bg-sky-400 border-sky-100 text-stone-950'
                                : 'bg-stone-900 border-stone-700 text-stone-200'
                            }`}
                          >
                            <ArrowDown className="w-3 h-3" />
                            <span>Down</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => engineRef.current?.triggerHydraulicAction('front_lock')}
                            className={`min-h-[30px] px-2 py-1 rounded-lg border text-[11px] font-bold ${
                              hud.activeVehicle.hydraulicMode === 'front_lock'
                                ? 'bg-amber-400 border-amber-100 text-stone-950'
                                : 'bg-stone-900 border-stone-700 text-stone-200'
                            }`}
                          >
                            Front Lock
                          </button>
                          <button
                            type="button"
                            onClick={() => engineRef.current?.triggerHydraulicAction('rear_lock')}
                            className={`min-h-[30px] px-2 py-1 rounded-lg border text-[11px] font-bold ${
                              hud.activeVehicle.hydraulicMode === 'rear_lock'
                                ? 'bg-amber-400 border-amber-100 text-stone-950'
                                : 'bg-stone-900 border-stone-700 text-stone-200'
                            }`}
                          >
                            Rear Lock
                          </button>
                          <button
                            type="button"
                            onClick={() => engineRef.current?.triggerHydraulicAction('left_tilt')}
                            className={`min-h-[30px] px-2 py-1 rounded-lg border text-[11px] font-bold ${
                              hud.activeVehicle.hydraulicMode === 'left_tilt'
                                ? 'bg-amber-400 border-amber-100 text-stone-950'
                                : 'bg-stone-900 border-stone-700 text-stone-200'
                            }`}
                          >
                            Left Lock
                          </button>
                          <button
                            type="button"
                            onClick={() => engineRef.current?.triggerHydraulicAction('right_tilt')}
                            className={`min-h-[30px] px-2 py-1 rounded-lg border text-[11px] font-bold ${
                              hud.activeVehicle.hydraulicMode === 'right_tilt'
                                ? 'bg-amber-400 border-amber-100 text-stone-950'
                                : 'bg-stone-900 border-stone-700 text-stone-200'
                            }`}
                          >
                            Right Lock
                          </button>
                          <button
                            type="button"
                            onClick={() => engineRef.current?.triggerHydraulicAction('side_to_side')}
                            className={`min-h-[30px] px-2 py-1 rounded-lg border text-[11px] font-bold ${
                              hud.activeVehicle.hydraulicMode === 'side_to_side'
                                ? 'bg-emerald-400 border-emerald-100 text-stone-950'
                                : 'bg-stone-900 border-stone-700 text-stone-200'
                            }`}
                          >
                            Side-to-Side
                          </button>
                          {hud.activeVehicle.preset === 'cadillac_coupe_deville' && (
                            <button
                              type="button"
                              onClick={() => engineRef.current?.triggerHydraulicAction('three_wheel')}
                              className={`min-h-[30px] px-2.5 py-1 rounded-lg border text-[11px] font-bold ${
                                hud.activeVehicle.hydraulicMode === 'three_wheel'
                                  ? 'bg-emerald-400 border-emerald-100 text-stone-950'
                                  : 'bg-stone-900 border-emerald-600/60 text-emerald-200'
                              }`}
                            >
                              3-Wheel [H]
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => engineRef.current?.triggerHydraulicAction('coil_bounce')}
                            className="min-h-[30px] px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 border border-purple-300 text-white text-[11px] font-bold"
                          >
                            Coil Bounce
                          </button>
                          <button
                            type="button"
                            onClick={() => engineRef.current?.toggleVehicleHydraulicsDance()}
                            className={`min-h-[30px] px-2.5 py-1 rounded-lg border text-[11px] font-bold transition ${
                              hud.activeVehicle.hydraulicsDanceEnabled
                                ? 'bg-pink-500 border-pink-200 text-white'
                                : 'bg-stone-900 border-pink-400/50 text-pink-200 hover:bg-pink-950/60'
                            }`}
                          >
                            {hud.activeVehicle.hydraulicsDanceEnabled
                              ? 'Dance Mode ON'
                              : 'Dance Mode'}
                          </button>
                        </>
                      ) : hud.activeVehicle.hydraulicStyle === 'up_down_side' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => engineRef.current?.triggerHydraulicAction('lock_up')}
                            className={`min-h-[32px] px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 ${
                              hud.activeVehicle.hydraulicMode === 'lock_up'
                                ? 'bg-sky-500 border-sky-200 text-stone-950'
                                : 'bg-stone-900 border-stone-700 text-stone-200'
                            }`}
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                            <span>Up</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => engineRef.current?.triggerHydraulicAction('drop')}
                            className={`min-h-[32px] px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 ${
                              hud.activeVehicle.hydraulicMode === 'drop_down'
                                ? 'bg-sky-500 border-sky-200 text-stone-950'
                                : 'bg-stone-900 border-stone-700 text-stone-200'
                            }`}
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                            <span>Down</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => engineRef.current?.triggerHydraulicAction('left_tilt')}
                            className={`min-h-[32px] px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 ${
                              hud.activeVehicle.hydraulicMode === 'left_tilt'
                                ? 'bg-amber-500 border-amber-300 text-stone-950'
                                : 'bg-stone-900 border-stone-700 text-stone-200'
                            }`}
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                            <span>Side L</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => engineRef.current?.triggerHydraulicAction('right_tilt')}
                            className={`min-h-[32px] px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 ${
                              hud.activeVehicle.hydraulicMode === 'right_tilt'
                                ? 'bg-amber-500 border-amber-300 text-stone-950'
                                : 'bg-stone-900 border-stone-700 text-stone-200'
                            }`}
                          >
                            <span>Side R</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => engineRef.current?.triggerHydraulicAction('front_hop')}
                            className="min-h-[32px] px-2.5 py-1 rounded-lg bg-purple-950/90 border border-purple-500/60 text-purple-100 text-[11px] font-bold flex items-center gap-1"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                            <span>Front</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => engineRef.current?.triggerHydraulicAction('rear_hop')}
                            className="min-h-[32px] px-2.5 py-1 rounded-lg bg-purple-950/90 border border-purple-500/60 text-purple-100 text-[11px] font-bold flex items-center gap-1"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                            <span>Rear</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => engineRef.current?.triggerHydraulicAction('left_tilt')}
                            className={`min-h-[32px] px-2.5 py-1 rounded-lg border text-[11px] font-bold ${
                              hud.activeVehicle.hydraulicMode === 'left_tilt'
                                ? 'bg-amber-500 border-amber-300 text-stone-950'
                                : 'bg-stone-900 border-stone-700 text-stone-200'
                            }`}
                          >
                            Tilt L
                          </button>
                          <button
                            type="button"
                            onClick={() => engineRef.current?.triggerHydraulicAction('right_tilt')}
                            className={`min-h-[32px] px-2.5 py-1 rounded-lg border text-[11px] font-bold ${
                              hud.activeVehicle.hydraulicMode === 'right_tilt'
                                ? 'bg-amber-500 border-amber-300 text-stone-950'
                                : 'bg-stone-900 border-stone-700 text-stone-200'
                            }`}
                          >
                            Tilt R
                          </button>
                          <button
                            type="button"
                            onClick={() => engineRef.current?.triggerHydraulicAction('lock_up')}
                            className={`min-h-[32px] px-2.5 py-1 rounded-lg border text-[11px] font-bold ${
                              hud.activeVehicle.hydraulicMode === 'lock_up'
                                ? 'bg-purple-500 border-purple-200 text-stone-950'
                                : 'bg-stone-900 border-stone-700 text-stone-200'
                            }`}
                          >
                            Lock [X]
                          </button>
                          <button
                            type="button"
                            onClick={() => engineRef.current?.triggerHydraulicAction('three_wheel')}
                            className={`min-h-[32px] px-2.5 py-1 rounded-lg border text-[11px] font-bold ${
                              hud.activeVehicle.hydraulicMode === 'three_wheel'
                                ? 'bg-emerald-400 border-emerald-100 text-stone-950'
                                : 'bg-stone-900 border-emerald-600/60 text-emerald-200'
                            }`}
                          >
                            3-Wheel [H]
                          </button>
                          <button
                            type="button"
                            onClick={() => engineRef.current?.toggleVehicleHydraulicsDance()}
                            className={`min-h-[32px] px-2.5 py-1 rounded-lg border text-[11px] font-bold transition ${
                              hud.activeVehicle.hydraulicsDanceEnabled
                                ? 'bg-pink-500 border-pink-200 text-white'
                                : 'bg-stone-900 border-pink-400/50 text-pink-200 hover:bg-pink-950/60'
                            }`}
                          >
                            {hud.activeVehicle.hydraulicsDanceEnabled
                              ? 'Dance Mode ON'
                              : 'Dance Mode'}
                          </button>
                        </>
                      )}
                    </div>

                    {/* Trunk-Gated Airbag Speed & Lock-Up Valve Tuner */}
                    {hud.activeVehicle.hasAirbagSuspension && (
                      <div className="rounded-lg bg-stone-950/90 border border-stone-800 p-2 space-y-1.5">
                        {!hud.activeVehicle.trunkOpen ? (
                          <div className="flex items-center justify-between gap-2 text-[11px] text-amber-300">
                            <span>Pop Trunk to adjust Airbag Speed &amp; Lock-Up Valves</span>
                            <button
                              type="button"
                              onClick={() => engineRef.current?.toggleVehicleTrunk()}
                              className="px-2 py-0.5 rounded bg-amber-500 text-stone-950 font-bold"
                            >
                              Pop Trunk
                            </button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <label className="space-y-0.5">
                              <div className="flex justify-between text-stone-300">
                                <span>Airbag Speed</span>
                                <span className="font-mono text-sky-300">
                                  {(hud.activeVehicle.airbagSpeed ?? 1.0) < 0.75
                                    ? 'Slow (Long Hiss)'
                                    : (hud.activeVehicle.airbagSpeed ?? 1.0) > 1.3
                                      ? 'Fast (Sharp Hiss)'
                                      : 'Med'}
                                </span>
                              </div>
                              <input
                                type="range"
                                min={0.25}
                                max={2.0}
                                step={0.05}
                                value={hud.activeVehicle.airbagSpeed ?? 1.0}
                                onChange={(e) =>
                                  engineRef.current?.setAirbagSpeed(Number(e.target.value))
                                }
                                className="w-full accent-sky-400"
                              />
                            </label>
                            <label className="space-y-0.5">
                              <div className="flex justify-between text-stone-300">
                                <span>Lock-Up Level</span>
                                <span className="font-mono text-amber-300">
                                  {Math.round((hud.activeVehicle.airbagLockLevel ?? 1.0) * 100)}%
                                </span>
                              </div>
                              <input
                                type="range"
                                min={0.4}
                                max={1.4}
                                step={0.05}
                                value={hud.activeVehicle.airbagLockLevel ?? 1.0}
                                onChange={(e) =>
                                  engineRef.current?.setAirbagLockLevel(Number(e.target.value))
                                }
                                className="w-full accent-amber-400"
                              />
                            </label>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {hud.activeVehicle.hasTrunkBass && (
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-800">
                    <span className="text-[11px] text-stone-300">Trunk Bass</span>
                    <button
                      type="button"
                      onClick={() => engineRef.current?.toggleTrunkBass()}
                      className={`min-h-[32px] px-3 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 ${
                        hud.activeVehicle.trunkBassOn
                          ? 'bg-pink-600 border-pink-300 text-white'
                          : 'bg-stone-900 border-stone-700 text-stone-200'
                      }`}
                    >
                      {hud.activeVehicle.trunkBassOn ? (
                        <Volume2 className="w-3.5 h-3.5" />
                      ) : (
                        <VolumeX className="w-3.5 h-3.5" />
                      )}
                      <span>{hud.activeVehicle.trunkBassOn ? 'ON [T]' : 'OFF [T]'}</span>
                    </button>
                  </div>
                )}

                {hud.activeVehicle.canFly && (
                  <div className="flex items-center gap-2 pt-1 border-t border-stone-800">
                    <button
                      type="button"
                      onPointerDown={() => engineRef.current?.setVehicleVerticalHold('up')}
                      onPointerUp={() => engineRef.current?.setVehicleVerticalHold(null)}
                      onPointerLeave={() => engineRef.current?.setVehicleVerticalHold(null)}
                      className="min-h-[32px] px-3 py-1 rounded-lg bg-sky-900 border border-sky-500/60 text-sky-100 text-[11px] font-bold flex items-center gap-1"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                      <span>Ascend</span>
                    </button>
                    <button
                      type="button"
                      onPointerDown={() => engineRef.current?.setVehicleVerticalHold('down')}
                      onPointerUp={() => engineRef.current?.setVehicleVerticalHold(null)}
                      onPointerLeave={() => engineRef.current?.setVehicleVerticalHold(null)}
                      className="min-h-[32px] px-3 py-1 rounded-lg bg-stone-900 border border-stone-600 text-stone-200 text-[11px] font-bold flex items-center gap-1"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                      <span>Descend</span>
                    </button>
                  </div>
                )}
                </div>
                )}
              </div>
            )}

            {/* Compact Equipped Item Label + Strictly Contextual Action Pills (No Permanent Instructional Text) */}
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
              const showAnyContextual =
                Boolean(eqDef) ||
                (!weaponActive && dirtyBottleCount > 0 && hud.nearOceanWater) ||
                (!weaponActive && filteredBottleCount > 0 && hud.vitals.thirst < 85);

              if (!showAnyContextual) return null;

              return (
                <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-1.5">
                  {eqDef && (
                    <div className="px-2.5 py-0.5 rounded bg-stone-950/85 border border-stone-700/80 text-[11px] text-stone-200 flex items-center gap-1.5 shadow">
                      <span className="font-semibold text-amber-300">
                        {eqDef.name}
                      </span>
                      {gunState && (
                        <span className="font-mono-tabular text-stone-300">
                          {gunState.magCurrent}/{gunState.magMax} · {gunState.reserveAmmo}
                        </span>
                      )}
                      {eqDef.id === 'primitive_bow' && (
                        <span className="font-mono-tabular text-stone-400">
                          {countOf('arrows')} arr
                        </span>
                      )}
                    </div>
                  )}

                  {gunState &&
                    !gunState.isReloading &&
                    gunState.magCurrent < gunState.magMax &&
                    gunState.reserveAmmo > 0 && (
                      <button
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => engineRef.current?.reloadEquippedWeapon()}
                        className="px-2 py-0.5 rounded bg-amber-950/90 hover:bg-amber-600 hover:text-stone-950 border border-amber-500/70 text-amber-200 font-bold text-[11px] flex items-center gap-1"
                      >
                        <RotateCw className="w-3 h-3" />
                        <span>Reload [R]</span>
                      </button>
                    )}

                  {!weaponActive &&
                    dirtyBottleCount > 0 &&
                    (eqDef?.id === 'dirty_water_bottle' || (!eqDef && hud.nearOceanWater)) &&
                    hud.nearOceanWater && (
                      <button
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => engineRef.current?.cleanAndFilterWaterBottle()}
                        className="px-2 py-0.5 rounded bg-sky-500 hover:bg-sky-400 text-stone-950 font-bold text-[11px] flex items-center gap-1"
                      >
                        <Droplets className="w-3 h-3" />
                        <span>Clean Bottle</span>
                      </button>
                    )}

                  {!weaponActive &&
                    filteredBottleCount > 0 &&
                    (eqDef?.id === 'filtered_water_bottle' ||
                      (!eqDef && hud.vitals.thirst < 85)) && (
                      <button
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() =>
                          engineRef.current?.useOrEquipItem('filtered_water_bottle')
                        }
                        className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-bold text-[11px] flex items-center gap-1"
                      >
                        <Droplets className="w-3 h-3" />
                        <span>Drink ({filteredBottleCount})</span>
                      </button>
                    )}

                  {!weaponActive &&
                    eqDef &&
                    eqDef.structuralKind &&
                    hud.structuralSummary?.previewStressPercent !== null &&
                    hud.structuralSummary?.previewStressPercent !== undefined && (
                      <>
                        <span
                          className={`px-2 py-0.5 rounded font-bold text-[10px] border font-mono-tabular ${
                            hud.structuralSummary.previewStressPercent >= 100
                              ? 'bg-red-950/90 border-red-500 text-red-200'
                              : hud.structuralSummary.previewStressPercent >= 55
                                ? 'bg-amber-950/90 border-amber-500 text-amber-200'
                                : 'bg-emerald-950/90 border-emerald-500 text-emerald-200'
                          }`}
                        >
                          Load {hud.structuralSummary.previewStressPercent}%
                        </span>
                        <button
                          type="button"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={() => engineRef.current?.rotateBuildPiece()}
                          className="px-2 py-0.5 rounded bg-stone-900 border border-stone-600 text-stone-100 font-semibold text-[10px] flex items-center gap-1"
                        >
                          <RotateCw className="w-3 h-3" />
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
                        className="px-2 py-0.5 rounded bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-[11px] flex items-center gap-1"
                      >
                        <PackageOpen className="w-3 h-3" />
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

            {/* HUD Bar Manager Popover */}
            {hudManagerOpen && (
              <div
                onPointerDown={(e) => e.stopPropagation()}
                className={`pointer-events-auto mb-1 w-[min(94vw,430px)] max-w-full rounded-xl bg-stone-950/95 border border-amber-500/60 p-3 shadow-2xl space-y-2.5 ${
                  UI_LAYOUT.repositionMenus &&
                  touchVisibleForLayout &&
                  !stickMinimized &&
                  !hudMinimizedMobile &&
                  !safeHudLayout.isLandscapeCompact
                    ? 'mb-[158px]'
                    : ''
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-bold text-amber-300">
                    Hotbar Capacity: {hud.hotbarItemIds.length.toLocaleString()} /{' '}
                    {(hud.maxHudBarCapacity ?? 5000).toLocaleString()}
                  </div>
                  <div className="text-[10px] font-mono-tabular text-emerald-300">
                    {(hud.emptyCompartmentsCount ?? 1_000_005_000).toLocaleString()} Pack Slots
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => engineRef.current?.expandHudBar(10, false)}
                    className="px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-[11px] font-mono-tabular font-semibold text-stone-100"
                  >
                    +10
                  </button>
                  <button
                    type="button"
                    onClick={() => engineRef.current?.expandHudBar(100, false)}
                    className="px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-[11px] font-mono-tabular font-semibold text-stone-100"
                  >
                    +100
                  </button>
                  <button
                    type="button"
                    onClick={() => engineRef.current?.expandHudBar(1000, false)}
                    className="px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-[11px] font-mono-tabular font-semibold text-stone-100"
                  >
                    +1,000
                  </button>
                  <button
                    type="button"
                    onClick={() => engineRef.current?.expandHudBar(5000, true)}
                    className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-[11px] font-mono-tabular font-bold text-stone-950"
                  >
                    Expand to 5,000
                  </button>
                  <button
                    type="button"
                    onClick={() => engineRef.current?.emptyAllHudBarToCompartments()}
                    className="ml-auto px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-[11px] font-bold text-stone-50 flex items-center gap-1"
                  >
                    <ArrowDownToLine className="w-3.5 h-3.5" />
                    <span>Empty → Pack</span>
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
                      placeholder={`Slot 1–${hud.hotbarItemIds.length}`}
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
                      Go
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
                      Store Equipped → Pack
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Compact Minecraft-Style Bottom Hotbar */}
            {!hud.activeVehicle && (
              <div
                id="hotbar-dock"
                data-hud-hotbar="true"
                className="hotbar-strip pointer-events-auto flex items-center gap-0.5 sm:gap-1 p-1 rounded-lg bg-stone-950/92 border-2 border-stone-700/90 shadow-2xl max-w-full"
              >
                <button
                  type="button"
                  aria-label="Bare Hands"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => engineRef.current?.selectHotbarSlot(-1)}
                  className={`relative w-9 h-9 sm:w-11 sm:h-11 shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
                    hud.equippedSlot === -1
                      ? 'bg-stone-800 border-amber-400 text-amber-300 ring-1 ring-amber-300/60'
                      : 'bg-stone-900/95 border-stone-700/80 hover:border-stone-500 text-stone-400'
                  }`}
                  title="Hands (0)"
                >
                  <Hand className="w-4 h-4" />
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
                  className="w-5 h-9 sm:w-6 sm:h-11 shrink-0 rounded bg-stone-900/90 hover:bg-stone-800 border border-stone-700/80 text-stone-300 flex items-center justify-center"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                <div
                  ref={hotbarScrollRef}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 overflow-x-auto survival-scroll flex-1 min-w-0 max-w-[196px] sm:max-w-[392px] md:max-w-[444px] snap-x snap-mandatory"
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
                            className={`relative w-9 h-9 sm:w-11 sm:h-11 shrink-0 snap-center rounded border-2 flex items-center justify-center transition-colors ${
                              isSelected
                                ? 'bg-stone-800 border-amber-400 ring-1 ring-amber-300/60'
                                : 'bg-stone-900/95 border-stone-700/80 hover:border-stone-500'
                            }`}
                            title={
                              itemId && qty > 0
                                ? `${ITEMS[itemId].name}`
                                : `Slot ${idx + 1}`
                            }
                          >
                            <span className="hidden sm:inline absolute top-0 left-0.5 text-[8px] font-mono-tabular text-stone-500 leading-none">
                              {idx + 1}
                            </span>
                            {itemId && qty > 0 ? (
                              <>
                                <ItemIcon itemId={itemId} className="w-5 h-5" />
                                {qty > 1 && (
                                  <span className="absolute bottom-0 right-0.5 text-[9px] font-mono-tabular font-bold text-stone-100 drop-shadow-[0_1px_1px_rgba(0,0,0,0.95)] leading-none">
                                    {qty}
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-[9px] text-stone-700">·</span>
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
                  className="w-5 h-9 sm:w-6 sm:h-11 shrink-0 rounded bg-stone-900/90 hover:bg-stone-800 border border-stone-700/80 text-stone-300 flex items-center justify-center"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

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
                  className="flex items-center shrink-0"
                >
                  <button
                    type="button"
                    aria-label="Hotbar Capacity & Pack"
                    onClick={() => setHudManagerOpen((v) => !v)}
                    className={`w-8 h-9 sm:w-10 sm:h-11 shrink-0 rounded border flex items-center justify-center transition-colors ${
                      hudDropHover || draggingHudSlot !== null
                        ? 'bg-emerald-900 border-emerald-400 text-emerald-100'
                        : hudManagerOpen
                          ? 'bg-amber-950/80 border-amber-400 text-amber-200'
                          : 'bg-stone-900 hover:bg-stone-800 border-stone-700 text-emerald-300'
                    }`}
                    title="Expand Hotbar (up to 5,000) or Pack Slots"
                  >
                    {draggingHudSlot !== null ? (
                      <ArrowDownToLine className="w-4 h-4" />
                    ) : (
                      <Backpack className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <button
                  type="button"
                  aria-label="Place Stuff"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => openModal('place')}
                  className="w-9 h-9 sm:w-auto sm:px-2.5 sm:h-11 shrink-0 rounded bg-amber-600 hover:bg-amber-500 border border-amber-300/70 text-stone-950 font-bold text-xs flex items-center justify-center gap-1"
                  title="Place Structures or Supplies (P)"
                >
                  <PackageOpen className="w-4 h-4" />
                  <span className="hidden sm:inline">Place</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RESPONSIVE TOUCH CONTROLS & XBOX MIRRORED THUMBSTICK */}
      {hud && (() => {
        const touchVisible =
          showTouchControls ||
          (gamepadConnected &&
            settings.touchControlsMode !== 'off' &&
            screen === 'playing' &&
            !activeModal &&
            !hud.gameOver &&
            !hud.cinematicActive);

        return (
          <>
            <TouchControls
              ref={touchControlsRef}
              visible={touchVisible && !stickMinimized}
              gamepadConnected={gamepadConnected}
              mirroredJoystickOnly={!showTouchControls}
              actionLabel={hud.nearbyInteraction?.label || 'Action'}
              actionCategory={hud.nearbyInteraction?.actionCategory}
              isSprinting={hud.isSprinting}
              isCrouching={hud.isCrouching}
              isFlying={Boolean(hud.isFlying)}
              isDriving={Boolean(hud.activeVehicle)}
              vehicleCanFly={Boolean(hud.activeVehicle?.canFly)}
              vehicleHasHydraulics={Boolean(hud.activeVehicle?.hasHydraulics)}
              onJoystickMove={handleTouchJoystickMove}
              onCameraDrag={handleTouchCameraDrag}
              onAction={handleTouchAction}
              showReload={Boolean(hud.equippedWeaponState)}
              isReloading={Boolean(hud.equippedWeaponState?.isReloading)}
              onReload={handleTouchReload}
              onJump={handleTouchJump}
              onKickDebris={handleTouchKickDebris}
              kickCooldown={hud.momentumState?.kickCooldown ?? 0}
              onSprintToggle={handleTouchSprintToggle}
              onCrouchToggle={handleTouchCrouchToggle}
              onFlightToggle={handleTouchFlightToggle}
              onFlyAscendChange={handleTouchFlyAscend}
              onFlyDescendChange={handleTouchFlyDescend}
              onVehiclePedals={handleTouchVehiclePedals}
              onVehicleExit={handleTouchVehicleExit}
              onVehicleHydraulicHop={handleTouchVehicleHop}
              onVehicleAscendChange={handleTouchVehicleAscend}
              onVehicleDescendChange={handleTouchVehicleDescend}
              onTeleportBiome={handleTouchTeleportBiome}
              onOpenBackpack={handleTouchOpenBackpack}
              onOpenCraft={handleTouchOpenCraft}
              onOpenPlace={handleTouchOpenPlace}
            />

            {!touchVisible &&
              viewportSize.width >= 1200 &&
              screen === 'playing' &&
              !activeModal &&
              !hud.gameOver &&
              !hud.cinematicActive &&
              !hud.activeVehicle && (
                <div className="pointer-events-auto fixed bottom-3 left-3.5 safe-bottom safe-left z-20 flex flex-col items-start gap-1.5 w-[216px]">
                  <div className="flex items-center gap-1.5 w-full">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={Boolean(hud.isFlying)}
                      aria-label="Toggle Flight"
                      onClick={() => {
                        if (activeModalRef.current !== null) return;
                        engineRef.current?.togglePlayerFlight();
                      }}
                      className={`h-8 px-2.5 rounded-lg border-2 flex items-center gap-1.5 shadow-xl transition-colors flex-1 justify-between ${
                        hud.isFlying
                          ? 'bg-sky-500 border-sky-200 text-stone-950'
                          : 'bg-stone-950/85 border-stone-500/60 text-stone-100 hover:border-sky-400/70'
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        <Plane className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-extrabold uppercase tracking-wider whitespace-nowrap">
                          Fly {hud.isFlying ? 'ON' : 'OFF'}
                        </span>
                      </span>
                      <span
                        className={`w-5 h-3 rounded-full p-0.5 flex items-center transition-colors ${
                          hud.isFlying ? 'bg-stone-950/40 justify-end' : 'bg-stone-700 justify-start'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            hud.isFlying ? 'bg-white' : 'bg-stone-400'
                          }`}
                        />
                      </span>
                    </button>

                    <button
                      type="button"
                      aria-label="Fly Higher"
                      title="Hold to Fly Higher"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        if (activeModalRef.current !== null) return;
                        engineRef.current?.setTouchFlyAscend(true);
                      }}
                      onPointerUp={(e) => {
                        e.stopPropagation();
                        engineRef.current?.setTouchFlyAscend(false);
                      }}
                      onPointerLeave={() => engineRef.current?.setTouchFlyAscend(false)}
                      onPointerCancel={() => engineRef.current?.setTouchFlyAscend(false)}
                      className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center shadow-xl transition-colors shrink-0 ${
                        hud.isFlying
                          ? 'bg-sky-500/90 border-sky-200 text-stone-950 active:bg-sky-300'
                          : 'bg-stone-950/85 border-stone-500/60 text-sky-300 hover:border-sky-400/70'
                      }`}
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Fly Down"
                      title="Hold to Fly Down"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        if (activeModalRef.current !== null) return;
                        engineRef.current?.setTouchFlyDescend(true);
                      }}
                      onPointerUp={(e) => {
                        e.stopPropagation();
                        engineRef.current?.setTouchFlyDescend(false);
                      }}
                      onPointerLeave={() => engineRef.current?.setTouchFlyDescend(false)}
                      onPointerCancel={() => engineRef.current?.setTouchFlyDescend(false)}
                      className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center shadow-xl transition-colors shrink-0 ${
                        hud.isFlying
                          ? 'bg-sky-500/90 border-sky-200 text-stone-950 active:bg-sky-300'
                          : 'bg-stone-950/85 border-stone-500/60 text-sky-300 hover:border-sky-400/70'
                      }`}
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>

                  <form
                    id="teleport-bar"
                    onSubmit={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (activeModalRef.current !== null) return;
                      const dest = quickTpInput.trim();
                      if (!dest) return;
                      engineRef.current?.teleportToBiome(dest);
                      setQuickTpInput('');
                    }}
                    onKeyDown={(e) => e.stopPropagation()}
                    onKeyUp={(e) => e.stopPropagation()}
                    className="flex items-center gap-1.5 h-8 w-full bg-stone-950/92 border border-sky-500/50 rounded-lg px-2 shadow-xl"
                  >
                    <Navigation className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <input
                      type="text"
                      value={quickTpInput}
                      onChange={(e) => setQuickTpInput(e.target.value)}
                      onKeyDown={(e) => e.stopPropagation()}
                      onKeyUp={(e) => e.stopPropagation()}
                      placeholder="Teleport biome..."
                      aria-label="Teleport to biome"
                      className="flex-1 min-w-0 bg-transparent text-xs text-stone-100 placeholder:text-stone-400 focus:outline-none select-text"
                    />
                    <button
                      type="submit"
                      className="px-2 py-0.5 rounded bg-sky-500 hover:bg-sky-400 active:bg-sky-300 text-stone-950 text-[10px] font-extrabold uppercase tracking-wider shrink-0"
                    >
                      TP
                    </button>
                  </form>
                </div>
              )}
          </>
        );
      })()}

      {/* MODALS */}
      {activeModal === 'inventory' && hud && (
        <InventoryModal
          hud={hud}
          nearTable={nearCraftingTable}
          nearOceanWater={hud.nearOceanWater}
          nearLakeWater={hud.nearLakeWater}
          onUseOrEquip={(id) => engineRef.current?.useOrEquipItem(id)}
          onCleanBottle={() => engineRef.current?.cleanAndFilterWaterBottle()}
          onWashMeat={(id) => engineRef.current?.washAndScrubMeat(id)}
          onCutMeat={(id) => engineRef.current?.cutDriedMeatWithKnife(id)}
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
          onCosmeticsChanged={() => engineRef.current?.applyExchangeCosmetics(true)}
          onClose={closeModal}
        />
      )}

      {activeModal === 'chest' && hud && (
        <InventoryModal
          hud={hud}
          nearTable={nearCraftingTable}
          nearOceanWater={hud.nearOceanWater}
          nearLakeWater={hud.nearLakeWater}
          chestStructureId={activeStationStructureId}
          onUseOrEquip={(id) => engineRef.current?.useOrEquipItem(id)}
          onCleanBottle={() => engineRef.current?.cleanAndFilterWaterBottle()}
          onWashMeat={(id) => engineRef.current?.washAndScrubMeat(id)}
          onCutMeat={(id) => engineRef.current?.cutDriedMeatWithKnife(id)}
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
          onCosmeticsChanged={() => engineRef.current?.applyExchangeCosmetics(true)}
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
          onStartCook={(recipeId) =>
            engineRef.current?.startInteractiveCook(
              recipeId,
              nearCookingStation || activeModal === 'stove',
            ) || false
          }
          onFinishCook={(recipeId, outcome, flipped) =>
            engineRef.current?.finishInteractiveCook(recipeId, outcome, flipped) ||
            false
          }
          onCancelCook={(recipeId) =>
            engineRef.current?.cancelInteractiveCook(recipeId)
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

      {activeModal === 'viking_village' && hud && (
        <VikingVillageModal
          hud={hud}
          initialVillagerId={activeStationStructureId}
          onInteractVillager={(id) =>
            engineRef.current?.interactVikingVillager(id) ?? null
          }
          onBuyOffer={(offerId) => engineRef.current?.buyFromViking(offerId) || false}
          onCompleteQuest={(questId) =>
            engineRef.current?.completeVikingQuest(questId) || false
          }
          onClose={closeModal}
        />
      )}

      {activeModal === 'mainland' && hud && engineInstance && (
        <LouisianaMainlandModal
          engine={engineInstance}
          hud={hud}
          initialTab={mainlandTabFromId(activeStationStructureId)}
          businessId={
            activeStationStructureId?.startsWith('mainland_services_')
              ? activeStationStructureId.slice('mainland_services_'.length)
              : undefined
          }
          onClose={closeModal}
          onOpenIslandFeature={(modal) => openModal(modal)}
        />
      )}

      {activeModal === 'navigator_companion' &&
        hud?.navigatorCompanion &&
        !hud.navigatorCompanion.gone && (
          <NavigatorCompanionModal
            companion={hud.navigatorCompanion}
            onClose={closeModal}
            onSetTask={(task) => engineRef.current?.setNavigatorTask(task)}
            onSetAllowDriving={(allowed) =>
              engineRef.current?.setNavigatorAllowDriving(allowed)
            }
            onSetNavigatorGender={(gender) =>
              engineRef.current?.setNavigatorGender(gender)
            }
            onCollectSharedLoot={() =>
              engineRef.current?.collectNavigatorSharedLoot()
            }
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

      {activeModal === 'drying_rack' && hud && (
        <DryingRackModal
          hud={hud}
          structureId={activeStationStructureId}
          onHangMeat={(structId, itemId) => engineRef.current?.hangMeatOnDryingRack(structId, itemId)}
          onCollectMeat={(structId, slotIdx) => engineRef.current?.collectDriedMeatFromRack(structId, slotIdx)}
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
          viewMode={tvViewMode}
          onViewModeChange={setTvViewMode}
          onInlineSlotChange={setTvInlineSlotEl}
          onSelectChannel={(ch) => engineRef.current?.setTvChannel(ch)}
          onSelectYouTube={(stream, startSec) => {
            setTvPipDismissed(false);
            setTvStreamStartSec(Math.max(0, Math.floor(startSec ?? 0)));
            engineRef.current?.setTvYouTubeStream(
              stream.videoId,
              stream.title,
              stream.channel,
              startSec,
            );
          }}
          onInlinePlayerChange={handleTvInlinePlayerChange}
          youtubeErrorSignal={youtubeErrorSignal}
          onTogglePower={() => engineRef.current?.toggleTvPower()}
          onTogglePlayPause={() => engineRef.current?.toggleTvPlayPause()}
          onStop={() => engineRef.current?.stopTvPlayback()}
          onSetVolume={(vol) => engineRef.current?.setTvVolume(vol)}
          onToggleMute={() => engineRef.current?.toggleTvMute()}
          onSetBassMode={(mode) => engineRef.current?.setTvBassMode(mode)}
          onNextChannel={() => engineRef.current?.nextTvChannel()}
          onPrevChannel={() => engineRef.current?.prevTvChannel()}
          onToggleAutoCycle={(enabled) => engineRef.current?.setTvAutoCycle(enabled)}
          onLoadLocalVideo={(file) => engineRef.current?.loadLocalTvVideo(file)}
          onDrawPreview={(canvas) => engineRef.current?.drawTvPreview(canvas)}
          onClose={closeModal}
        />
      )}

      {activeModal === 'music_studio' && (
        <MusicStudioModal
          initialTab={
            activeStationStructureId === 'house_studio_booth'
              ? 'booth'
              : 'sequencer'
          }
          onClose={closeModal}
          onToast={(text, tone = 'info') =>
            pushToast({
              id: `studio_${Date.now()}_${Math.random()}`,
              text,
              tone,
            })
          }
        />
      )}

      {/* Mobile HUD Mode Switch & Dedicated Rocket Controls Bar */}
      {screen === 'playing' && hud && !hud.cinematicActive && !activeModal && (
        <>
          <div
            id="hud-mode-switch"
            onPointerDown={(e) => e.stopPropagation()}
            className="fixed right-2.5 sm:right-5 top-[calc(max(env(safe-area-inset-top),12px)+44px)] sm:top-[calc(max(env(safe-area-inset-top),12px)+48px)] safe-right z-30 flex items-center gap-1.5 pointer-events-auto"
          >
            <button
              id="rocket-mode-btn"
              type="button"
              onClick={() =>
                MOBILE_HUD_ROCKET_CONTROLS.setRocketControls(
                  !MOBILE_HUD_ROCKET_CONTROLS.rocketModeActive,
                )
              }
              className={`min-h-[36px] px-2.5 sm:px-3 py-1.5 rounded-xl border text-[11px] sm:text-xs font-extrabold shadow-lg transition ${
                rocketControlsActive
                  ? 'bg-orange-500 border-orange-300 text-stone-950'
                  : 'bg-slate-950/90 border-sky-400/60 text-sky-200 hover:bg-slate-900'
              }`}
            >
              {rocketControlsActive ? 'Rocket Active' : 'Rocket Controls'}
            </button>
            <button
              id="minimize-hud-btn"
              type="button"
              onClick={() => MOBILE_HUD_ROCKET_CONTROLS.toggleMinimize()}
              className={`min-h-[36px] px-2.5 sm:px-3 py-1.5 rounded-xl border text-[11px] sm:text-xs font-extrabold shadow-lg transition ${
                hudMinimizedMobile
                  ? 'bg-amber-400 border-amber-200 text-stone-950'
                  : 'bg-slate-950/90 border-white/25 text-stone-100 hover:bg-slate-900'
              }`}
            >
              {hudMinimizedMobile ? 'Show HUD' : 'Minimize'}
            </button>
          </div>

          {rocketControlsActive && !hudMinimizedMobile && (
            <div
              id="rocket-controls-bar"
              onPointerDown={(e) => e.stopPropagation()}
              style={
                UI_LAYOUT.reservePlayerControls && safeHudLayout.isLandscapeCompact
                  ? { maxWidth: `${safeHudLayout.centerBandMaxWidthPx}px` }
                  : undefined
              }
              className="fixed left-1/2 -translate-x-1/2 bottom-2.5 safe-bottom w-[min(95vw,520px)] z-40 flex items-center justify-around gap-2 p-2 rounded-2xl bg-[rgba(10,14,24,0.94)] border border-white/20 shadow-2xl pointer-events-auto"
            >
              <button
                type="button"
                onClick={() => engineRef.current?.igniteSaturnVQuickLaunch()}
                className="flex-1 min-h-[44px] px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 hover:from-orange-400 hover:to-amber-300 text-stone-950 font-black text-xs sm:text-sm shadow-lg transition"
              >
                Launch
              </button>
              <button
                type="button"
                onClick={() => openModal('saturn_rocket')}
                className="flex-1 min-h-[44px] px-3 sm:px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-stone-950 font-extrabold text-xs sm:text-sm shadow-lg transition"
              >
                Flight Console
              </button>
              <button
                type="button"
                onClick={() => MOBILE_HUD_ROCKET_CONTROLS.setRocketControls(false)}
                className="flex-1 min-h-[44px] px-3 sm:px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/20 text-white font-bold text-xs sm:text-sm transition"
              >
                Exit Rocket
              </button>
            </div>
          )}
        </>
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

      {activeModal === 'controls' && (
        <ControlsModal onClose={closeModal} />
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

      {activeModal === 'saturn_rocket' && hud && (
        <SaturnRocketModal
          onClose={closeModal}
          spaceState={hud.spaceState ?? null}
          onLaunchPlanet={(planet, system) =>
            engineRef.current?.launchRocketToPlanet(planet, system)
          }
          onLaunchSun={(starName) => engineRef.current?.launchRocketToSun(starName)}
          onJumpSectorPlanet={(num) => engineRef.current?.jumpToSectorPlanet(num)}
          onReturnEarth={() => engineRef.current?.returnToEarthFromSpace()}
          onEquipAlienGun={(gunId) => engineRef.current?.equipAlienGun(gunId)}
          onClaimIslandUfoLoot={() => engineRef.current?.claimIslandUfoLoot()}
          onUseAlienLoot={(uid, mode) => engineRef.current?.useAlienLoot(uid, mode)}
        />
      )}

      {/* Car Elevator Computer — Completely isolated from car hydraulics/top & car menus */}
      {activeModal === 'underground_elevator' && hud && (
        <UndergroundElevatorModal
          isOpen={true}
          selectedElevatorVehicleId={elevatorTargetVehicleId}
          onSelectElevatorVehicle={(id) => {
            // Only sets which car the lift moves; NEVER opens a car menu
            setElevatorTargetVehicleId(id);
          }}
          onClose={closeAllModals}
          onBringCarToSurface={(carId) => {
            engineRef.current?.summonCarFromUndergroundElevator(carId);
          }}
        />
      )}

      {/* Car Radio & Vehicle Menus — Never render when elevator computer is open */}
      {activeModal === 'car_radio' &&
        hud?.activeVehicle &&
        activeModal !== ('underground_elevator' as ActiveModal) && (
        <CarRadioModal
          car={{
            id: hud.activeVehicle.id,
            name: hud.activeVehicle.name,
            preset: hud.activeVehicle.preset,
            class:
              hud.activeVehicle.preset === 'sports_car'
                ? 'Modern Exotic'
                : hud.activeVehicle.preset,
            style: hud.activeVehicle.preset,
            hasTrunkBass: hud.activeVehicle.hasTrunkBass,
          }}
          interiorView={hud.activeVehicle.interiorView}
          trunkBassOn={hud.activeVehicle.trunkBassOn}
          rimLightMode={hud.activeVehicle.rimLightMode}
          underglowEnabled={hud.activeVehicle.underglowEnabled}
          onSetRimLightMode={(mode) =>
            engineRef.current?.setVehicleRimLightMode(mode)
          }
          onToggleUnderglow={() =>
            engineRef.current?.toggleVehicleUnderglow()
          }
          onToggleInteriorView={() =>
            engineRef.current?.toggleVehicleInteriorCamera()
          }
          onToggleTrunkBass={() => engineRef.current?.toggleTrunkBass()}
          onClose={closeModal}
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

      {activeModal === 'coaster' && hud && (
        <CoasterStudioModal
          hud={hud}
          onCreateCoaster={(name, withStation) =>
            engineRef.current?.createCoaster(name, withStation) || null
          }
          onDeleteCoaster={(id) => engineRef.current?.deleteCoaster(id)}
          onRenameCoaster={(id, nextName) =>
            engineRef.current?.renameCoaster(id, nextName)
          }
          onSetColor={(id, color) => engineRef.current?.setCoasterColor(id, color)}
          onSetCoasterType={(id, type) => engineRef.current?.setCoasterType(id, type)}
          onSetCarCount={(id, count) =>
            engineRef.current?.setCoasterTrainCars(id, count)
          }
          onAppendPiece={(id, pieceKey) =>
            engineRef.current?.appendCoasterPiece(id, pieceKey)
          }
          onAppendInversion={(id, settingsObj) =>
            engineRef.current?.appendCoasterInversion(id, settingsObj)
          }
          onCompleteCircuit={(id) =>
            engineRef.current?.completeCoasterCircuit(id)
          }
          onDepumpCoaster={(id) => engineRef.current?.depumpCoaster(id)}
          onExportCSV={(id) => engineRef.current?.exportCoasterCSV(id) || ''}
          onImportCSV={(id, csv) => engineRef.current?.importCoasterCSV(id, csv)}
          onCreateDemoCoaster={(name, type) =>
            engineRef.current?.createDemoCoaster(name, type) || null
          }
          onAddNodeAhead={(id) => engineRef.current?.addCoasterNodeAhead(id)}
          onUpdateNode={(id, idx, patch) =>
            engineRef.current?.updateCoasterNode(id, idx, patch)
          }
          onRemoveNode={(id, idx) => engineRef.current?.removeCoasterNode(id, idx)}
          onToggleDispatch={(id, running) =>
            engineRef.current?.toggleCoasterDispatch(id, running)
          }
          onResetTrain={(id) => engineRef.current?.resetCoasterTrain(id)}
          onBoardRide={(id) => engineRef.current?.boardCoasterRide(id)}
          onOpenMusicStudio={() => openModal('music_studio')}
          onClose={closeModal}
        />
      )}

      {activeModal === 'ecosystem_journal' && ecosystemSnapshot && (
        <EcosystemJournalModal
          ecosystem={ecosystemSnapshot}
          onClose={closeModal}
          onRestoreHabitat={(zoneId) => {
            engineRef.current?.restoreHabitatZone(zoneId);
            if (engineRef.current) {
              setEcosystemSnapshot({ ...engineRef.current.ecosystem });
            }
          }}
        />
      )}

      {activeModal === 'dragon_sanctuary' && (
        <DragonSanctuaryModal
          dragons={dragonsSnapshot}
          eggs={hud?.dragonEggs ?? dragonEggsSnapshot}
          canRideDragon={hud?.caveSummary?.dragonUnlocked ?? false}
          redDragonCave={
            hud?.caveSummary?.specialCaves.find((c) => c.type === 'red-dragon') ?? null
          }
          onHatch={(el, name, requireEgg) => {
            engineRef.current?.hatchDragonEgg(el, name, requireEgg);
            if (engineRef.current) {
              setDragonsSnapshot(engineRef.current.getDragons());
              setDragonEggsSnapshot(engineRef.current.getDragonEggs());
            }
          }}
          onFeed={(id) => {
            engineRef.current?.feedDragon(id);
            if (engineRef.current) setDragonsSnapshot(engineRef.current.getDragons());
          }}
          onGrow={(id) => {
            engineRef.current?.growDragon(id);
            if (engineRef.current) setDragonsSnapshot(engineRef.current.getDragons());
          }}
          onCustomizeColor={(id, color) => {
            engineRef.current?.customizeDragonColor(id, color);
            if (engineRef.current) setDragonsSnapshot(engineRef.current.getDragons());
          }}
          onCombine={(idA, idB, hybridName) => {
            engineRef.current?.combineDragons(idA, idB, hybridName);
            if (engineRef.current) setDragonsSnapshot(engineRef.current.getDragons());
          }}
          onRename={(id, rawTag) => {
            engineRef.current?.renameDragonWithAnvil(id, rawTag);
            if (engineRef.current) setDragonsSnapshot(engineRef.current.getDragons());
          }}
          onToggleMount={(id) => {
            engineRef.current?.toggleMountDragon(id);
            if (engineRef.current) setDragonsSnapshot(engineRef.current.getDragons());
          }}
          onClose={closeModal}
        />
      )}

      {activeModal === 'exchange' && (
        <ExchangeModal
          onClose={closeModal}
          onCosmeticsChanged={() => {
            engineRef.current?.applyExchangeCosmetics(true);
          }}
          onOpenVaultStore={() => setActiveModal('vault_store')}
          onOpenCustomMarketplace={() => setActiveModal('custom_marketplace')}
        />
      )}

      <PayhipMarketplaceModal
        isOpen={activeModal === 'vault_store'}
        items={vaultPayhipItems}
        unlockedIds={vaultPayhipState.unlockedIds}
        equippedBackpackId={vaultPayhipState.equippedBackpackId}
        equippedWeaponId={vaultPayhipState.equippedWeaponId}
        onUnlockItem={(itemId) => {
          unlockVaultPayhipItem(itemId);
        }}
        onEquipItem={(item) => {
          equipVaultPayhipItem(item);
          engineRef.current?.applyExchangeCosmetics(true);
        }}
        onUpdateItemPayhipEmbed={(itemId, rawEmbedOrUrl) => {
          updateVaultItemPayhipEmbed(itemId, rawEmbedOrUrl);
        }}
        onClose={closeModal}
      />

      <BlankPhoneMarketplaceModal
        isOpen={activeModal === 'custom_marketplace'}
        skins={customPhoneState.skins}
        unlockedIds={customPhoneState.unlockedIds}
        equippedBackpackId={customPhoneState.equippedBackpackId}
        equippedWeaponId={customPhoneState.equippedWeaponId}
        onAddUploadedSkin={(skin) => {
          addCustomMarketplaceSkin(skin);
        }}
        onAttachCheckout={(skinId, payhipUrl, priceLabel) => {
          attachCustomMarketplaceCheckout(skinId, payhipUrl, priceLabel);
        }}
        onUnlockSkin={(skinId) => {
          unlockCustomMarketplaceSkin(skinId);
        }}
        onEquipSkin={(skin) => {
          equipCustomMarketplaceSkin(skin);
          engineRef.current?.applyExchangeCosmetics(true);
        }}
        onClose={closeModal}
      />

      {activeModal === 'menu_drawer' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 safe-top safe-bottom">
          <div className="relative w-full max-w-md bg-stone-900 border border-amber-500/50 rounded-2xl shadow-2xl p-5 sm:p-6 space-y-5 max-h-[calc(100dvh-2rem)] overflow-y-auto survival-scroll">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div>
                <h3 className="font-display text-lg font-bold text-amber-300">
                  {hud?.worldType === 'flat'
                    ? 'Flat Park Menu & Tools'
                    : 'Survival Island Menu & Tools'}
                </h3>
                <div className="text-[11px] text-stone-400">
                  {hud?.worldName || 'Active World'}
                </div>
              </div>
              <button
                onClick={closeModal}
                className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setActiveModal('exchange')}
                className="p-3.5 rounded-xl bg-amber-950/90 hover:bg-amber-500 hover:text-stone-950 border border-amber-500/60 font-bold text-amber-200 text-sm flex items-center justify-center gap-2 transition"
              >
                <Store className="w-5 h-5 text-amber-400 shrink-0" />
                <span className="tracking-wide uppercase">Exchange</span>
              </button>
              <button
                onClick={() => setActiveModal('vault_store')}
                className="p-3.5 rounded-xl bg-amber-500/15 hover:bg-amber-500 hover:text-stone-950 border border-amber-500/60 font-bold text-amber-200 text-sm flex items-center justify-center gap-2 transition"
              >
                <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
                <span className="tracking-wide uppercase">Vault Store</span>
              </button>
              <button
                onClick={() => setActiveModal('custom_marketplace')}
                className="col-span-2 p-3 rounded-xl bg-emerald-950/80 hover:bg-emerald-500 hover:text-stone-950 border border-emerald-500/50 font-bold text-emerald-200 text-sm flex items-center justify-center gap-2 transition"
              >
                <Plus className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="tracking-wide uppercase">Phone Skins &amp; Checkout Store</span>
              </button>
              <button
                onClick={() => setActiveModal('coaster')}
                className="p-3.5 rounded-xl bg-sky-950/80 hover:bg-sky-500 hover:text-stone-950 border border-sky-500/40 font-bold text-stone-100 text-sm flex items-center gap-2.5 transition"
              >
                <RollerCoaster className="w-5 h-5 text-sky-300 shrink-0" />
                <span>Coaster Studio</span>
              </button>
              <button
                onClick={() => openModal('dragon_sanctuary')}
                className="p-3.5 rounded-xl bg-orange-950/80 hover:bg-orange-500 hover:text-stone-950 border border-orange-500/40 font-bold text-stone-100 text-sm flex items-center gap-2.5 transition"
              >
                <Flame className="w-5 h-5 text-orange-300 shrink-0" />
                <span>Dragon Valley</span>
              </button>
              <button
                onClick={() => openModal('viking_village', 'viking_jarl_erik')}
                className="p-3.5 rounded-xl bg-amber-950/80 hover:bg-amber-500 hover:text-stone-950 border border-amber-500/40 font-bold text-stone-100 text-sm flex items-center gap-2.5 transition"
              >
                <Shield className="w-5 h-5 text-amber-300 shrink-0" />
                <span>Viking Village</span>
              </button>
              <button
                onClick={() => openModal('ecosystem_journal')}
                className="p-3.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-500 hover:text-stone-950 border border-emerald-500/40 font-bold text-stone-100 text-sm flex items-center gap-2.5 transition"
              >
                <Globe2 className="w-5 h-5 text-emerald-300 shrink-0" />
                <span>Ecosystem Journal</span>
              </button>
              <button
                onClick={() => setActiveModal('music_studio')}
                className="p-3.5 rounded-xl bg-stone-800 hover:bg-amber-600 hover:text-stone-950 font-bold text-stone-100 text-sm flex items-center gap-2.5 transition"
              >
                <Music className="w-5 h-5 text-amber-400 shrink-0" />
                <span>Music Pro</span>
              </button>
              <button
                onClick={() => setActiveModal('place')}
                className="p-3.5 rounded-xl bg-stone-800 hover:bg-amber-600 hover:text-stone-950 font-bold text-stone-100 text-sm flex items-center gap-2.5 transition"
              >
                <PackageOpen className="w-5 h-5 text-amber-400 shrink-0" />
                <span>Place &amp; Build</span>
              </button>
              <button
                onClick={() => setActiveModal('inventory')}
                className="p-3.5 rounded-xl bg-stone-800 hover:bg-amber-600 hover:text-stone-950 font-bold text-stone-100 text-sm flex items-center gap-2.5 transition"
              >
                <Backpack className="w-5 h-5 text-amber-400 shrink-0" />
                <span>Pack / Inventory</span>
              </button>
              <button
                onClick={() => { setActiveStationStructureId(undefined); setActiveModal('crafting'); }}
                className="p-3.5 rounded-xl bg-stone-800 hover:bg-amber-600 hover:text-stone-950 font-bold text-stone-100 text-sm flex items-center gap-2.5 transition"
              >
                <Hammer className="w-5 h-5 text-amber-400 shrink-0" />
                <span>Crafting Bay</span>
              </button>
              <button
                onClick={() => setActiveModal('map')}
                className="p-3.5 rounded-xl bg-stone-800 hover:bg-amber-600 hover:text-stone-950 font-bold text-stone-100 text-sm flex items-center gap-2.5 transition"
              >
                <MapIcon className="w-5 h-5 text-amber-400 shrink-0" />
                <span>{hud?.worldType === 'flat' ? 'Park Map' : 'Island Map'}</span>
              </button>
              <button
                onClick={() => setActiveModal('vehicles')}
                className="p-3.5 rounded-xl bg-stone-800 hover:bg-amber-600 hover:text-stone-950 font-bold text-stone-100 text-sm flex items-center gap-2.5 transition"
              >
                <Car className="w-5 h-5 text-amber-400 shrink-0" />
                <span>Vehicle Garage</span>
              </button>
              <button
                onClick={() => {
                  setActiveStationStructureId('mainland_district');
                  setActiveModal('mainland');
                  engineRef.current?.setMode('paused');
                }}
                className="p-3.5 rounded-xl bg-amber-950/80 hover:bg-amber-500 hover:text-stone-950 border border-amber-500/40 font-bold text-stone-100 text-sm flex items-center gap-2.5 transition"
              >
                <Navigation className="w-5 h-5 text-amber-300 shrink-0" />
                <span>Crescent City</span>
              </button>
              {hud?.worldType !== 'flat' && (
                <button
                  onClick={() => setActiveModal('multiverse')}
                  className="p-3.5 rounded-xl bg-stone-800 hover:bg-amber-600 hover:text-stone-950 font-bold text-stone-100 text-sm flex items-center gap-2.5 transition"
                >
                  <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
                  <span>Realms Portal</span>
                </button>
              )}
              <button
                onClick={() => setActiveModal('multiplayer')}
                className="p-3.5 rounded-xl bg-stone-800 hover:bg-amber-600 hover:text-stone-950 font-bold text-stone-100 text-sm flex items-center gap-2.5 transition"
              >
                <Users className="w-5 h-5 text-amber-400 shrink-0" />
                <span>Multiplayer P2P</span>
              </button>
              <button
                onClick={() => setActiveModal('mods')}
                className="p-3.5 rounded-xl bg-stone-800 hover:bg-amber-600 hover:text-stone-950 font-bold text-stone-100 text-sm flex items-center gap-2.5 transition"
              >
                <Box className="w-5 h-5 text-amber-400 shrink-0" />
                <span>Mod Manager</span>
              </button>
              <button
                onClick={() => setActiveModal('console')}
                className="p-3.5 rounded-xl bg-stone-800 hover:bg-amber-600 hover:text-stone-950 font-bold text-stone-100 text-sm flex items-center gap-2.5 transition"
              >
                <Terminal className="w-5 h-5 text-amber-400 shrink-0" />
                <span>Console &amp; Relics</span>
              </button>
              {hud?.worldType !== 'flat' && (
                <button
                  onClick={() => setActiveModal('missions')}
                  className="p-3.5 rounded-xl bg-stone-800 hover:bg-amber-600 hover:text-stone-950 font-bold text-stone-100 text-sm flex items-center gap-2.5 transition"
                >
                  <Trophy className="w-5 h-5 text-amber-400 shrink-0" />
                  <span>Missions &amp; Goals</span>
                </button>
              )}
              <button
                onClick={() => openModal('tv')}
                className="p-3.5 rounded-xl bg-stone-800 hover:bg-amber-600 hover:text-stone-950 font-bold text-stone-100 text-sm flex items-center gap-2.5 transition"
              >
                <Tv className="w-5 h-5 text-amber-400 shrink-0" />
                <span>Smart TV</span>
              </button>
              <button
                onClick={() => setActiveModal('settings')}
                className="p-3.5 rounded-xl bg-stone-800 hover:bg-amber-600 hover:text-stone-950 font-bold text-stone-100 text-sm flex items-center gap-2.5 transition"
              >
                <Settings className="w-5 h-5 text-amber-400 shrink-0" />
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
          currentSlotId={currentSlotId}
          worldType={hud?.worldType || 'island'}
          worldName={hud?.worldName}
          gameMode={hud?.gameMode || 'survival'}
          onResume={closeModal}
          onSaveNow={(slotId) => handleSaveNow(slotId)}
          onLoadSlot={(slotId) => handleContinueGame(slotId)}
          onDeleteSlot={(slotId) => {
            deleteSaveSlot(slotId);
            refreshSaves();
          }}
          onOpenSettings={() => setActiveModal('settings')}
          onQuitToMenu={() => {
            handleSaveNow(engineRef.current?.getCurrentSlotId() || 'slot_1');
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

      {screen === 'playing' && (hud?.totemFlashTimer ?? 0) > 0 && (
        <div className="pointer-events-none fixed inset-0 z-30 border-8 border-amber-400/80 bg-amber-400/15 flex items-center justify-center">
          <div className="rounded-xl bg-stone-950/90 border-2 border-amber-400 px-5 py-3 shadow-2xl flex items-center gap-3">
            <ShieldPlus className="w-7 h-7 text-amber-300" />
            <div>
              <div className="text-sm font-bold text-amber-300">
                Totem of Undying Activated!
              </div>
              <div className="text-xs text-emerald-300">
                Regenerating Health Rapidly
              </div>
            </div>
          </div>
        </div>
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
                onClick={() =>
                  handleStartNewGame({
                    worldType: hud.worldType || 'island',
                    worldName: hud.worldName || 'Lost World Island',
                    gameMode: resolveAllowedGameMode(
                      hud.worldType || 'island',
                      hud.gameMode,
                    ),
                    flatSurfaceStyle: hud.flatSurfaceStyle,
                  })
                }
                className="w-full min-h-[48px] rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-100 font-semibold text-sm flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Start Fresh Expedition</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* PERSISTENT YOUTUBE TV OVERLAY (Single IFrame across Remote, 3D Wall TV, & Floating PiP) */}
      <PersistentYouTubeOverlay
        ref={tvOverlayRef}
        active={Boolean(
          screen === 'playing' &&
            !hud?.cinematicActive &&
            !hud?.gameOver &&
            hud?.tvState?.power &&
            !hud?.tvState?.isStopped &&
            hud?.tvState?.isYouTubeActive &&
            hud?.tvState?.youtubeVideoId,
        )}
        videoId={hud?.tvState?.youtubeVideoId || ''}
        title={hud?.tvState?.youtubeTitle || 'YouTube'}
        isPaused={Boolean(hud?.tvState?.isPaused)}
        isMuted={Boolean(hud?.tvState?.isMuted)}
        volume={hud?.tvState?.volume ?? 0.75}
        spatialVolume={hud?.tvState?.spatialVolume}
        startSec={tvStreamStartSec}
        remoteOpen={activeModal === 'tv'}
        remoteViewMode={tvViewMode}
        inlineSlotElement={tvInlineSlotEl}
        pipDismissed={tvPipDismissed}
        onDismissPip={() => setTvPipDismissed(true)}
        onOpenRemote={() => openModal('tv')}
        onTogglePlayPause={() => engineRef.current?.toggleTvPlayPause()}
        onSyncTime={handleTvSyncYouTubeTime}
        onYouTubeError={handleTvYouTubeError}
      />
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
    <div className="flex items-center gap-1.5">
      <div className="shrink-0" aria-label={label}>
        {icon}
      </div>
      <div className="flex-1 h-1.5 sm:h-2 rounded-sm bg-stone-800 overflow-hidden border border-stone-700/60">
        <div
          className={`h-full ${barColor} transition-all duration-150`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-6 text-right text-[10px] sm:text-[11px] font-mono-tabular text-stone-200">
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
    <div className="w-[76px] min-[460px]:w-32 sm:w-48 rounded-lg bg-stone-950/85 border border-stone-700/80 px-1.5 sm:px-2.5 py-1.5 flex flex-col items-center gap-0.5 shadow-lg overflow-hidden shrink-0">
      <div className="relative w-full h-4 overflow-hidden">
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-amber-400/90 -translate-x-1/2 z-10" />
        {markers.map((m) => {
          const delta = ((m.deg - bearing + 540) % 360) - 180;
          if (Math.abs(delta) > 85) return null;
          const pct = 8 + ((delta + 85) / 170) * 84;
          return (
            <span
              key={m.label}
              style={{ left: `${pct}%` }}
              className={`absolute top-0 -translate-x-1/2 font-mono-tabular leading-4 whitespace-nowrap ${
                m.major
                  ? m.label === 'N'
                    ? 'text-[10px] font-bold text-amber-400'
                    : 'text-[10px] font-bold text-stone-100'
                  : 'text-[8px] text-stone-400'
              }`}
            >
              {m.label}
            </span>
          );
        })}
      </div>
      <div className="text-[9px] sm:text-[10px] font-mono-tabular tracking-wider text-stone-300 leading-none">
        {nearestCardinal.label} {String(Math.round(bearing)).padStart(3, '0')}°
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
