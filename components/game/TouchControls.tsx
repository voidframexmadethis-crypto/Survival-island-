'use client';

import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState, useCallback } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Axe,
  Backpack,
  Car,
  Crosshair,
  Droplets,
  Flame,
  Footprints,
  Hammer,
  Hand,
  LogOut,
  Navigation,
  OctagonAlert,
  PackageOpen,
  PackagePlus,
  Pickaxe,
  Plane,
  RotateCw,
  Swords,
  Utensils,
  Wind,
  X,
  Zap,
} from 'lucide-react';
import { NearbyInteraction } from '@/game/types';

export interface TouchControlsHandle {
  setGamepadKnobOffset: (x: number, y: number) => void;
  resetTouchJoystick: () => void;
}

interface TouchControlsProps {
  visible: boolean;
  actionLabel: string;
  actionCategory?: NearbyInteraction['actionCategory'];
  isSprinting: boolean;
  isCrouching: boolean;
  isFlying?: boolean;
  isDriving?: boolean;
  vehicleCanFly?: boolean;
  vehicleHasHydraulics?: boolean;
  kickCooldown?: number;
  showReload?: boolean;
  isReloading?: boolean;
  gamepadConnected?: boolean;
  mirroredJoystickOnly?: boolean;
  onJoystickMove: (x: number, y: number) => void;
  onCameraDrag: (dx: number, dy: number) => void;
  onAction: () => void;
  onReload?: () => void;
  onJump: () => void;
  onKickDebris?: () => void;
  onSprintToggle: (active: boolean) => void;
  onCrouchToggle: (active: boolean) => void;
  onFlightToggle?: () => void;
  onFlyAscendChange?: (active: boolean) => void;
  onFlyDescendChange?: (active: boolean) => void;
  onVehiclePedals?: (gas: number, brake: number, handbrake?: boolean) => void;
  onVehicleExit?: () => void;
  onVehicleHydraulicHop?: () => void;
  onVehicleAscendChange?: (active: boolean) => void;
  onVehicleDescendChange?: (active: boolean) => void;
  onTeleportBiome?: (destination: string) => void;
  onOpenBackpack?: () => void;
  onOpenCraft?: () => void;
  onOpenPlace?: () => void;
}

export const TouchControls = React.memo(forwardRef<TouchControlsHandle, TouchControlsProps>(function TouchControls({
  visible,
  actionLabel,
  actionCategory,
  isSprinting,
  isCrouching,
  isFlying = false,
  isDriving = false,
  vehicleCanFly = false,
  vehicleHasHydraulics = false,
  kickCooldown = 0,
  showReload = false,
  isReloading = false,
  gamepadConnected = false,
  mirroredJoystickOnly = false,
  onJoystickMove,
  onAction,
  onReload,
  onJump,
  onKickDebris,
  onSprintToggle,
  onCrouchToggle,
  onFlightToggle,
  onFlyAscendChange,
  onFlyDescendChange,
  onVehiclePedals,
  onVehicleExit,
  onVehicleHydraulicHop,
  onVehicleAscendChange,
  onVehicleDescendChange,
  onTeleportBiome,
  onOpenBackpack,
  onOpenCraft,
  onOpenPlace,
}, ref) {
  const [tpInput, setTpInput] = useState('');
  const [tpOpen, setTpOpen] = useState(false);
  const [pedalsActive, setPedalsActive] = useState({ gas: false, brake: false, handbrake: false });
  const joyPadRef = useRef<HTMLDivElement | null>(null);
  const knobRef = useRef<HTMLDivElement | null>(null);
  const activePointerId = useRef<number | null>(null);
  const activePointerType = useRef<string | null>(null);
  const joyCenter = useRef({ x: 0, y: 0 });
  const touchKnobRef = useRef({ x: 0, y: 0 });
  const gpKnobRef = useRef({ x: 0, y: 0 });
  const knobDeflectedRef = useRef(false);
  const pedalStateRef = useRef({ gas: false, brake: false, handbrake: false });
  const onJoystickMoveRef = useRef(onJoystickMove);
  onJoystickMoveRef.current = onJoystickMove;
  const onVehiclePedalsRef = useRef(onVehiclePedals);
  onVehiclePedalsRef.current = onVehiclePedals;
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    const checkViewport = () => {
      setIsCompact(window.innerWidth < 640 || window.innerHeight < 500);
    };
    checkViewport();
    window.addEventListener('resize', checkViewport);
    window.addEventListener('orientationchange', checkViewport);
    return () => {
      window.removeEventListener('resize', checkViewport);
      window.removeEventListener('orientationchange', checkViewport);
    };
  }, []);

  const maxRadius = isCompact ? 38 : 54;

  const resetPedals = useCallback(() => {
    const prev = pedalStateRef.current;
    if (prev.gas || prev.brake || prev.handbrake) {
      pedalStateRef.current = { gas: false, brake: false, handbrake: false };
      setPedalsActive({ gas: false, brake: false, handbrake: false });
    }
    onVehiclePedalsRef.current?.(0, 0, false);
  }, []);

  const setPedalState = useCallback(
    (key: 'gas' | 'brake' | 'handbrake', active: boolean) => {
      if (pedalStateRef.current[key] === active) return;
      const next = { ...pedalStateRef.current, [key]: active };
      pedalStateRef.current = next;
      setPedalsActive(next);
      onVehiclePedalsRef.current?.(
        next.gas ? 1 : 0,
        next.brake ? 1 : 0,
        next.handbrake,
      );
    },
    [],
  );

  const syncKnobDom = useCallback(() => {
    const knob = knobRef.current;
    if (!knob) return;
    const tx = touchKnobRef.current.x;
    const ty = touchKnobRef.current.y;
    const rawX = tx !== 0 ? tx : gpKnobRef.current.x;
    const rawY = ty !== 0 ? ty : gpKnobRef.current.y;
    const mag = Math.hypot(rawX, rawY);
    const effectiveX = mag > maxRadius ? (rawX / mag) * maxRadius : rawX;
    const effectiveY = mag > maxRadius ? (rawY / mag) * maxRadius : rawY;
    const tiltX = (-effectiveY / maxRadius) * 16;
    const tiltY = (effectiveX / maxRadius) * 16;
    knob.style.transform = `perspective(180px) translate3d(${effectiveX.toFixed(1)}px, ${effectiveY.toFixed(1)}px, 0) rotateX(${tiltX.toFixed(1)}deg) rotateY(${tiltY.toFixed(1)}deg)`;
    const isDeflected = mag > 2;
    if (isDeflected !== knobDeflectedRef.current) {
      knobDeflectedRef.current = isDeflected;
      knob.classList.toggle('is-deflected', isDeflected);
      joyPadRef.current?.classList.toggle('is-deflected', isDeflected);
    }
  }, [maxRadius]);

  const resetJoystick = useCallback((forceZero = false) => {
    const prevId = activePointerId.current;
    activePointerId.current = null;
    activePointerType.current = null;
    if (prevId !== null && joyPadRef.current) {
      try {
        if (joyPadRef.current.hasPointerCapture(prevId)) {
          joyPadRef.current.releasePointerCapture(prevId);
        }
      } catch {
        // Ignore if element is already detached or capture was lost
      }
    }
    const hadTouchOffset =
      touchKnobRef.current.x !== 0 || touchKnobRef.current.y !== 0;
    touchKnobRef.current.x = 0;
    touchKnobRef.current.y = 0;
    syncKnobDom();
    if (forceZero || prevId !== null || hadTouchOffset) {
      onJoystickMoveRef.current(0, 0);
    }
  }, [syncKnobDom]);

  useImperativeHandle(
    ref,
    () => ({
      setGamepadKnobOffset(x: number, y: number) {
        gpKnobRef.current.x = x;
        gpKnobRef.current.y = y;
        syncKnobDom();
      },
      resetTouchJoystick() {
        resetJoystick(true);
        resetPedals();
      },
    }),
    [syncKnobDom, resetJoystick, resetPedals],
  );

  useEffect(() => {
    if (!visible || !isDriving) {
      resetPedals();
    }
  }, [visible, isDriving, resetPedals]);

  useEffect(() => {
    if (!visible) {
      resetJoystick(true);
      resetPedals();
      setTpOpen(false);
      return;
    }
    syncKnobDom();

    const handleGlobalPointerEnd = (e: PointerEvent) => {
      if (activePointerId.current === null) return;
      if (
        activePointerId.current === e.pointerId ||
        (activePointerType.current === 'mouse' && e.pointerType === 'mouse')
      ) {
        resetJoystick(true);
      }
    };
    const handleGlobalPointerMove = (e: PointerEvent) => {
      if (activePointerId.current === null) return;
      if (
        e.pointerId === activePointerId.current &&
        e.pointerType === 'mouse' &&
        e.buttons === 0
      ) {
        resetJoystick(true);
      }
    };
    const handleGlobalTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) {
        if (activePointerId.current !== null) {
          resetJoystick(true);
        }
        resetPedals();
      }
    };
    const handleGlobalReset = () => {
      if (
        activePointerId.current !== null ||
        touchKnobRef.current.x !== 0 ||
        touchKnobRef.current.y !== 0
      ) {
        resetJoystick(true);
      }
      resetPedals();
    };
    const handleVisibility = () => {
      if (document.hidden) {
        handleGlobalReset();
      }
    };

    window.addEventListener('pointerup', handleGlobalPointerEnd, true);
    window.addEventListener('pointercancel', handleGlobalPointerEnd, true);
    window.addEventListener('pointermove', handleGlobalPointerMove, true);
    window.addEventListener('touchend', handleGlobalTouchEnd, true);
    window.addEventListener('touchcancel', handleGlobalTouchEnd, true);
    window.addEventListener('blur', handleGlobalReset);
    window.addEventListener('pagehide', handleGlobalReset);
    window.addEventListener('contextmenu', handleGlobalReset, true);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('pointerup', handleGlobalPointerEnd, true);
      window.removeEventListener('pointercancel', handleGlobalPointerEnd, true);
      window.removeEventListener('pointermove', handleGlobalPointerMove, true);
      window.removeEventListener('touchend', handleGlobalTouchEnd, true);
      window.removeEventListener('touchcancel', handleGlobalTouchEnd, true);
      window.removeEventListener('blur', handleGlobalReset);
      window.removeEventListener('pagehide', handleGlobalReset);
      window.removeEventListener('contextmenu', handleGlobalReset, true);
      document.removeEventListener('visibilitychange', handleVisibility);
      resetJoystick(true);
      resetPedals();
    };
  }, [visible, syncKnobDom, resetJoystick, resetPedals]);

  const emitVectorFromClient = useCallback(
    (clientX: number, clientY: number) => {
      const dx = clientX - joyCenter.current.x;
      const dy = clientY - joyCenter.current.y;
      const dist = Math.hypot(dx, dy);
      if (dist < maxRadius * 0.05) {
        touchKnobRef.current.x = 0;
        touchKnobRef.current.y = 0;
        syncKnobDom();
        onJoystickMoveRef.current(0, 0);
        return;
      }
      let clampedDx = dx;
      let clampedDy = dy;
      if (dist > maxRadius) {
        clampedDx = (dx / dist) * maxRadius;
        clampedDy = (dy / dist) * maxRadius;
      }
      touchKnobRef.current.x = clampedDx;
      touchKnobRef.current.y = clampedDy;
      syncKnobDom();
      onJoystickMoveRef.current(clampedDx / maxRadius, -clampedDy / maxRadius);
    },
    [maxRadius, syncKnobDom],
  );

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const pad = joyPadRef.current;
    if (!pad || pad.offsetParent === null) return;

    if (activePointerId.current !== null && activePointerId.current !== e.pointerId) {
      resetJoystick(true);
    }

    const rect = pad.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    joyCenter.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };

    activePointerId.current = e.pointerId;
    activePointerType.current = e.pointerType || null;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore
    }

    emitVectorFromClient(e.clientX, e.clientY);
  }, [emitVectorFromClient, resetJoystick]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (e.pointerId !== activePointerId.current) return;
    const pad = joyPadRef.current;
    if (!pad || pad.offsetParent === null) {
      resetJoystick(true);
      return;
    }
    if (e.pointerType === 'mouse' && e.buttons === 0) {
      resetJoystick(true);
      return;
    }
    e.stopPropagation();
    emitVectorFromClient(e.clientX, e.clientY);
  }, [emitVectorFromClient, resetJoystick]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (
      activePointerId.current === null ||
      (e.pointerId !== activePointerId.current &&
        !(activePointerType.current === 'mouse' && e.pointerType === 'mouse'))
    ) {
      return;
    }
    e.stopPropagation();
    resetJoystick(true);
  }, [resetJoystick]);

  const handleLostCapture = useCallback((e: React.PointerEvent) => {
    if (e.pointerId === activePointerId.current) {
      resetJoystick(true);
    }
  }, [resetJoystick]);

  if (!visible) return null;

  const renderActionIcon = () => {
    switch (actionCategory) {
      case 'chop':
        return <Axe className="w-5 h-5 sm:w-7 sm:h-7" />;
      case 'mine':
        return <Pickaxe className="w-5 h-5 sm:w-7 sm:h-7" />;
      case 'pickup':
        return <PackagePlus className="w-5 h-5 sm:w-7 sm:h-7" />;
      case 'craft':
        return <Hammer className="w-5 h-5 sm:w-7 sm:h-7" />;
      case 'cook':
        return <Flame className="w-5 h-5 sm:w-7 sm:h-7" />;
      case 'shoot':
        return <Crosshair className="w-5 h-5 sm:w-7 sm:h-7" />;
      case 'attack':
        return <Swords className="w-5 h-5 sm:w-7 sm:h-7" />;
      case 'harvest':
        return <Utensils className="w-5 h-5 sm:w-7 sm:h-7" />;
      case 'clean':
        return <Droplets className="w-5 h-5 sm:w-7 sm:h-7" />;
      default:
        return <Hand className="w-5 h-5 sm:w-7 sm:h-7" />;
    }
  };

  const shortVerb = (() => {
    switch (actionCategory) {
      case 'chop':
        return 'Chop';
      case 'mine':
        return 'Mine';
      case 'pickup':
        return 'Take';
      case 'craft':
        return 'Craft';
      case 'cook':
        return 'Cook';
      case 'gather':
        return 'Gather';
      case 'shoot':
        return 'Shoot';
      case 'attack':
        return 'Strike';
      case 'harvest':
        return 'Harvest';
      case 'clean':
        return 'Clean';
      default:
        return 'Use';
    }
  })();

  const handlePedalPointerDown =
    (key: 'gas' | 'brake' | 'handbrake') => (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Ignore capture failure on synthetic pointers
      }
      setPedalState(key, true);
    };

  const handlePedalPointerUp =
    (key: 'gas' | 'brake' | 'handbrake') => (e: React.PointerEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Ignore
      }
      setPedalState(key, false);
    };

  return (
    <div className="pointer-events-none fixed inset-0 z-20 touch-surface select-none overflow-hidden">
      {/* LEFT ZONE: Movement / Steering Joystick + Compact Popover Teleport */}
      <div
        id="joystick-pad"
        data-safe-zone="player-controls"
        className="joystick-pad player-controls-left pointer-events-auto absolute bottom-[72px] sm:bottom-[86px] left-1 sm:left-4 flex flex-col items-start gap-2 landscape:gap-3"
      >
        {/* Floating Teleport Popover (opens above left pad so it never stretches across narrow screens) */}
        {onTeleportBiome && tpOpen && (
          <form
            id="teleport-bar"
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const dest = tpInput.trim();
              if (!dest) return;
              onTeleportBiome(dest);
              setTpInput('');
              setTpOpen(false);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 bg-stone-950/95 border border-sky-400/70 rounded-xl px-2 py-1.5 shadow-2xl w-[min(248px,calc(100vw-32px))]"
          >
            <Navigation className="w-4 h-4 text-sky-400 shrink-0" />
            <input
              type="text"
              value={tpInput}
              onChange={(e) => setTpInput(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder="TP biome..."
              aria-label="Teleport to biome"
              className="flex-1 min-w-0 bg-transparent text-base sm:text-xs text-stone-100 placeholder:text-stone-400 focus:outline-none select-text"
            />
            <button
              type="submit"
              className="min-h-[34px] px-2.5 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 active:bg-sky-300 text-stone-950 text-[11px] font-extrabold uppercase tracking-wider shrink-0"
            >
              Go
            </button>
            <button
              type="button"
              aria-label="Close Teleport"
              onClick={(e) => {
                e.stopPropagation();
                setTpOpen(false);
              }}
              className="w-8 h-8 rounded-lg bg-stone-800 text-stone-300 flex items-center justify-center shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </form>
        )}

        <div className="flex items-center gap-2 landscape:gap-3">
          {!isDriving && !mirroredJoystickOnly && (
            <>
              <button
                type="button"
                aria-label="Sprint"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onSprintToggle(!isSprinting);
                }}
                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full border-2 flex items-center justify-center shadow-lg transition-colors ${
                  isSprinting
                    ? 'bg-amber-500 border-amber-200 text-stone-950'
                    : 'bg-stone-950/80 border-stone-500/60 text-stone-100'
                }`}
              >
                <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              <button
                type="button"
                aria-label="Crouch"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onCrouchToggle(!isCrouching);
                }}
                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full border-2 flex items-center justify-center shadow-lg transition-colors ${
                  isCrouching
                    ? 'bg-emerald-500 border-emerald-200 text-stone-950'
                    : 'bg-stone-950/80 border-stone-500/60 text-stone-100'
                }`}
              >
                <ArrowDown className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </>
          )}

          {!isDriving && onFlightToggle && (
            <button
              type="button"
              role="switch"
              aria-checked={isFlying}
              aria-label="Toggle Flight"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onFlightToggle();
              }}
              className={`h-10 sm:h-11 px-2.5 sm:px-3 rounded-lg border-2 flex items-center gap-1.5 shadow-lg transition-colors ${
                isFlying
                  ? 'bg-sky-500 border-sky-200 text-stone-950'
                  : 'bg-stone-950/85 border-stone-500/60 text-stone-100 hover:border-sky-400/70'
              }`}
            >
              <Plane className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider whitespace-nowrap">
                Fly {isFlying ? 'ON' : 'OFF'}
              </span>
            </button>
          )}

          {isDriving && (
            <span className="h-7 px-2 rounded-md bg-stone-950/85 border border-amber-500/40 text-[10px] font-extrabold uppercase tracking-wider text-amber-300 flex items-center gap-1 pointer-events-none">
              <Car className="w-3 h-3" />
              <span>Steer</span>
            </span>
          )}

          {onTeleportBiome && !mirroredJoystickOnly && (
            <button
              type="button"
              aria-label="Toggle Biome Teleport"
              aria-expanded={tpOpen}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setTpOpen((prev) => !prev);
              }}
              className={`h-10 sm:h-11 px-2.5 rounded-lg border-2 flex items-center gap-1 shadow-lg transition-colors ${
                tpOpen
                  ? 'bg-sky-500 border-sky-200 text-stone-950'
                  : 'bg-stone-950/85 border-sky-500/50 text-sky-300'
              }`}
            >
              <Navigation className="w-3.5 h-3.5" />
              <span className="text-[10px] font-extrabold uppercase">TP</span>
            </button>
          )}
        </div>

        <div className="flex items-end gap-2 landscape:gap-3">
          <div
            ref={joyPadRef}
            className="xbox-stick relative w-28 h-28 sm:w-36 sm:h-36 shrink-0 rounded-full border-2 flex items-center justify-center touch-surface"
            style={{ touchAction: 'none' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onLostPointerCapture={handleLostCapture}
            onTouchCancel={() => resetJoystick(true)}
            onContextMenu={(e) => {
              e.preventDefault();
              resetJoystick(true);
            }}
          >
            <span className="xbox-stick-well" aria-hidden="true" />
            <span className="xbox-stick-gate" aria-hidden="true" />
            <div
              ref={knobRef}
              className="xbox-stick-knob relative w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center pointer-events-none will-change-transform"
              style={{
                transform: 'perspective(180px) translate(0px, 0px) rotateX(0deg) rotateY(0deg)',
              }}
            >
              <span className="xbox-stick-grip" aria-hidden="true" />
              {isDriving ? (
                <Car className="relative z-10 w-4 h-4 sm:w-5 sm:h-5 text-white/35" />
              ) : (
                <Footprints className="relative z-10 w-4 h-4 sm:w-5 sm:h-5 text-white/35" />
              )}
            </div>
            {gamepadConnected && (
              <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-stone-950/90 border border-emerald-500/60 text-[9px] font-bold tracking-wider text-emerald-300 uppercase whitespace-nowrap pointer-events-none">
                Xbox LS
              </span>
            )}
          </div>

          {!isDriving && (onFlyAscendChange || onFlyDescendChange) && (
            <div id="flight-controls" className="flex flex-col gap-1.5 shrink-0">
              {onFlyAscendChange && (
                <button
                  type="button"
                  aria-label="Fly Higher"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    onFlyAscendChange(true);
                  }}
                  onPointerUp={(e) => {
                    e.stopPropagation();
                    onFlyAscendChange(false);
                  }}
                  onPointerLeave={() => onFlyAscendChange(false)}
                  onPointerCancel={() => onFlyAscendChange(false)}
                  onLostPointerCapture={() => onFlyAscendChange(false)}
                  onContextMenu={(e) => e.preventDefault()}
                  className={`w-10 h-10 sm:w-11 sm:h-11 rounded-lg border-2 flex items-center justify-center shadow-lg transition-colors touch-none ${
                    isFlying
                      ? 'bg-sky-500/90 border-sky-200 text-stone-950 active:bg-sky-300'
                      : 'bg-stone-950/80 border-stone-500/60 text-sky-300 active:bg-sky-500 active:text-stone-950'
                  }`}
                >
                  <ArrowUp className="w-5 h-5" />
                </button>
              )}
              {onFlyDescendChange && (
                <button
                  type="button"
                  aria-label="Fly Down"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    onFlyDescendChange(true);
                  }}
                  onPointerUp={(e) => {
                    e.stopPropagation();
                    onFlyDescendChange(false);
                  }}
                  onPointerLeave={() => onFlyDescendChange(false)}
                  onPointerCancel={() => onFlyDescendChange(false)}
                  onLostPointerCapture={() => onFlyDescendChange(false)}
                  onContextMenu={(e) => e.preventDefault()}
                  className={`w-10 h-10 sm:w-11 sm:h-11 rounded-lg border-2 flex items-center justify-center shadow-lg transition-colors touch-none ${
                    isFlying
                      ? 'bg-sky-500/90 border-sky-200 text-stone-950 active:bg-sky-300'
                      : 'bg-stone-950/80 border-stone-500/60 text-sky-300 active:bg-sky-500 active:text-stone-950'
                  }`}
                >
                  <ArrowDown className="w-5 h-5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT ZONE: Either Driving Pedals (Gas/Brake/Handbrake/Hop/Exit) OR Foot Combat/Build Arc */}
      {!mirroredJoystickOnly && (
        <div
          id="combat-controls"
          data-safe-zone="player-controls"
          className="action-wheel player-controls-right pointer-events-auto absolute bottom-[72px] sm:bottom-[86px] right-1 sm:right-4 flex flex-col items-end gap-2 landscape:gap-3"
        >
          {isDriving ? (
            <div id="vehicle-touch-pedals" className="flex flex-col items-end gap-1.5 sm:gap-2">
              {/* Top Quick Driving Row: Flight Altitude (if airship), Hop (if hydraulics), Handbrake, Exit */}
              <div className="flex items-center gap-1.5">
                {vehicleCanFly && onVehicleAscendChange && (
                  <button
                    type="button"
                    aria-label="Ascend Vehicle"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onVehicleAscendChange(true);
                    }}
                    onPointerUp={(e) => {
                      e.stopPropagation();
                      onVehicleAscendChange(false);
                    }}
                    onPointerLeave={() => onVehicleAscendChange(false)}
                    onPointerCancel={() => onVehicleAscendChange(false)}
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-sky-900/90 border-2 border-sky-400 text-sky-100 flex items-center justify-center shadow-lg touch-none"
                  >
                    <ArrowUp className="w-5 h-5" />
                  </button>
                )}
                {vehicleCanFly && onVehicleDescendChange && (
                  <button
                    type="button"
                    aria-label="Descend Vehicle"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onVehicleDescendChange(true);
                    }}
                    onPointerUp={(e) => {
                      e.stopPropagation();
                      onVehicleDescendChange(false);
                    }}
                    onPointerLeave={() => onVehicleDescendChange(false)}
                    onPointerCancel={() => onVehicleDescendChange(false)}
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-stone-900/90 border-2 border-stone-500 text-stone-200 flex items-center justify-center shadow-lg touch-none"
                  >
                    <ArrowDown className="w-5 h-5" />
                  </button>
                )}
                {vehicleHasHydraulics && onVehicleHydraulicHop && (
                  <button
                    type="button"
                    aria-label="Hydraulic Hop"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onVehicleHydraulicHop();
                    }}
                    className="h-10 sm:h-11 px-2.5 sm:px-3 rounded-xl bg-purple-700/95 border-2 border-purple-300 text-white text-[11px] font-extrabold uppercase tracking-wider shadow-lg active:bg-purple-500"
                  >
                    Hop
                  </button>
                )}
                <button
                  type="button"
                  aria-label="Handbrake"
                  onPointerDown={handlePedalPointerDown('handbrake')}
                  onPointerUp={handlePedalPointerUp('handbrake')}
                  onPointerCancel={handlePedalPointerUp('handbrake')}
                  onLostPointerCapture={handlePedalPointerUp('handbrake')}
                  onContextMenu={(e) => e.preventDefault()}
                  className={`h-10 sm:h-11 px-2.5 rounded-xl border-2 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 shadow-lg touch-none transition-colors ${
                    pedalsActive.handbrake
                      ? 'bg-red-500 border-red-200 text-white'
                      : 'bg-stone-950/90 border-stone-500/70 text-stone-200'
                  }`}
                >
                  <OctagonAlert className="w-3.5 h-3.5" />
                  <span>Park</span>
                </button>
                {onVehicleExit && (
                  <button
                    type="button"
                    aria-label="Exit Vehicle"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      resetPedals();
                      onVehicleExit();
                    }}
                    className="h-10 sm:h-11 px-2.5 rounded-xl bg-amber-600 active:bg-amber-400 border-2 border-amber-200 text-stone-950 text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1 shadow-lg"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Exit</span>
                  </button>
                )}
              </div>

              {/* Bottom Ergonomic Two-Pedal Cluster: Brake / Reverse + Gas */}
              <div className="flex items-end gap-2">
                <button
                  id="touch-brake-pedal"
                  type="button"
                  aria-label="Brake and Reverse"
                  onPointerDown={handlePedalPointerDown('brake')}
                  onPointerUp={handlePedalPointerUp('brake')}
                  onPointerCancel={handlePedalPointerUp('brake')}
                  onLostPointerCapture={handlePedalPointerUp('brake')}
                  onContextMenu={(e) => e.preventDefault()}
                  className={`w-[58px] h-[58px] sm:w-[70px] sm:h-[70px] rounded-2xl border-2 font-extrabold shadow-2xl flex flex-col items-center justify-center gap-0.5 touch-none transition-colors ${
                    pedalsActive.brake
                      ? 'bg-red-500 border-red-200 text-white scale-95'
                      : 'bg-stone-950/90 border-red-500/80 text-red-300'
                  }`}
                >
                  <ArrowDown className="w-5 h-5 sm:w-6 sm:h-6" />
                  <span className="text-[10px] sm:text-[11px] uppercase tracking-wider leading-none">
                    Brake
                  </span>
                </button>

                <button
                  id="touch-gas-pedal"
                  type="button"
                  aria-label="Accelerate Gas"
                  onPointerDown={handlePedalPointerDown('gas')}
                  onPointerUp={handlePedalPointerUp('gas')}
                  onPointerCancel={handlePedalPointerUp('gas')}
                  onLostPointerCapture={handlePedalPointerUp('gas')}
                  onContextMenu={(e) => e.preventDefault()}
                  className={`w-[66px] h-[72px] sm:w-[78px] sm:h-[84px] rounded-2xl border-3 font-black shadow-2xl flex flex-col items-center justify-center gap-1 touch-none transition-colors ${
                    pedalsActive.gas
                      ? 'bg-emerald-400 border-emerald-100 text-stone-950 scale-95'
                      : 'bg-emerald-600/95 border-emerald-200 text-stone-950'
                  }`}
                >
                  <ArrowUp className="w-6 h-6 sm:w-7 sm:h-7" />
                  <span className="text-[11px] sm:text-xs uppercase tracking-wider leading-none">
                    Gas
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Compact Utility Row: Backpack, Craft, Build */}
              <div className="flex items-center gap-2 landscape:gap-3">
                {onOpenBackpack && (
                  <button
                    type="button"
                    aria-label="Open Backpack"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenBackpack();
                    }}
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-stone-950/85 border-2 border-stone-500/60 text-amber-300 active:bg-stone-800 flex items-center justify-center shadow-lg"
                  >
                    <Backpack className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                )}
                {onOpenCraft && (
                  <button
                    type="button"
                    aria-label="Open Crafting"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenCraft();
                    }}
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-stone-950/85 border-2 border-stone-500/60 text-amber-300 active:bg-stone-800 flex items-center justify-center shadow-lg"
                  >
                    <Hammer className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                )}
                {onOpenPlace && (
                  <button
                    type="button"
                    aria-label="Build / Place"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenPlace();
                    }}
                    className="h-10 sm:h-11 px-2.5 sm:px-3 rounded-full bg-amber-950/90 border-2 border-amber-400/80 text-amber-200 active:bg-amber-800 flex items-center gap-1 shadow-lg"
                  >
                    <PackageOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
                      Build
                    </span>
                  </button>
                )}
              </div>

              {/* Thumb Arc: Reload + Kick + Jump + Primary Action */}
              <div className="flex items-end gap-2 landscape:gap-3">
                {showReload && onReload && (
                  <button
                    type="button"
                    aria-label="Reload Weapon"
                    disabled={isReloading}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onReload();
                    }}
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 flex items-center justify-center shadow-xl transition-colors ${
                      isReloading
                        ? 'bg-amber-950/90 border-amber-400 text-amber-300'
                        : 'bg-stone-950/90 border-amber-500/80 text-amber-200 active:bg-amber-600 active:text-stone-950'
                    }`}
                  >
                    <RotateCw className={`w-4 h-4 sm:w-5 sm:h-5 ${isReloading ? 'animate-spin' : ''}`} />
                  </button>
                )}

                {onKickDebris && (
                  <button
                    type="button"
                    aria-label="Kick Debris"
                    disabled={kickCooldown > 0}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onKickDebris();
                    }}
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 flex items-center justify-center shadow-xl transition-colors ${
                      kickCooldown > 0
                        ? 'bg-stone-950/60 border-stone-700 text-stone-500'
                        : 'bg-stone-950/90 border-amber-400/85 text-amber-300 active:bg-amber-700 active:text-stone-950'
                    }`}
                  >
                    {kickCooldown > 0 ? (
                      <span className="text-[10px] font-mono-tabular font-bold">
                        {kickCooldown.toFixed(0)}s
                      </span>
                    ) : (
                      <Wind className="w-4 h-4 sm:w-5 sm:h-5" />
                    )}
                  </button>
                )}

                <button
                  type="button"
                  aria-label="Jump & Vault"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onJump();
                  }}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-stone-950/85 border-2 border-amber-500/70 text-amber-300 active:bg-amber-600 active:text-stone-950 flex items-center justify-center shadow-2xl"
                >
                  <ArrowUp className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>

                <button
                  type="button"
                  aria-label={actionLabel}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction();
                  }}
                  className="w-15 h-15 sm:w-20 sm:h-20 rounded-full bg-amber-600 hover:bg-amber-500 active:bg-amber-400 border-3 border-amber-200 text-stone-950 font-extrabold shadow-2xl flex flex-col items-center justify-center gap-0.5"
                >
                  {renderActionIcon()}
                  <span className="text-[10px] sm:text-[11px] uppercase tracking-wider leading-none">
                    {shortVerb}
                  </span>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}));

