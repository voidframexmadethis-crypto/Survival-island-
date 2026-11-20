'use client';

import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState, useCallback } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Axe,
  Backpack,
  Crosshair,
  Droplets,
  Flame,
  Footprints,
  Hammer,
  Hand,
  Navigation,
  PackageOpen,
  PackagePlus,
  Pickaxe,
  Plane,
  RotateCw,
  Swords,
  Utensils,
  Wind,
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
  onTeleportBiome,
  onOpenBackpack,
  onOpenCraft,
  onOpenPlace,
}, ref) {
  const [tpInput, setTpInput] = useState('');
  const joyPadRef = useRef<HTMLDivElement | null>(null);
  const knobRef = useRef<HTMLDivElement | null>(null);
  const activePointerId = useRef<number | null>(null);
  const activePointerType = useRef<string | null>(null);
  const joyCenter = useRef({ x: 0, y: 0 });
  const touchKnobRef = useRef({ x: 0, y: 0 });
  const gpKnobRef = useRef({ x: 0, y: 0 });
  const knobDeflectedRef = useRef(false);
  const onJoystickMoveRef = useRef(onJoystickMove);
  onJoystickMoveRef.current = onJoystickMove;
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

  const maxRadius = isCompact ? 38 : 46;

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
    knob.style.transform = `perspective(180px) translate(${effectiveX.toFixed(1)}px, ${effectiveY.toFixed(1)}px) rotateX(${tiltX.toFixed(1)}deg) rotateY(${tiltY.toFixed(1)}deg)`;
    const isDeflected = mag > 2;
    if (isDeflected !== knobDeflectedRef.current) {
      knobDeflectedRef.current = isDeflected;
      if (isDeflected) {
        knob.classList.remove('border-amber-200');
        knob.classList.add('border-emerald-300', 'ring-2', 'ring-emerald-400/50');
      } else {
        knob.classList.remove('border-emerald-300', 'ring-2', 'ring-emerald-400/50');
        knob.classList.add('border-amber-200');
      }
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
      },
    }),
    [syncKnobDom, resetJoystick],
  );

  useEffect(() => {
    if (!visible) {
      resetJoystick(true);
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
      if (activePointerId.current === null) return;
      if (activePointerType.current === 'touch' && e.touches.length === 0) {
        resetJoystick(true);
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
    };
  }, [visible, syncKnobDom, resetJoystick]);

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

    // If a previous pointer stalled without firing pointerup, replace cleanly
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
        return <Axe className="w-6 h-6 sm:w-7 sm:h-7" />;
      case 'mine':
        return <Pickaxe className="w-6 h-6 sm:w-7 sm:h-7" />;
      case 'pickup':
        return <PackagePlus className="w-6 h-6 sm:w-7 sm:h-7" />;
      case 'craft':
        return <Hammer className="w-6 h-6 sm:w-7 sm:h-7" />;
      case 'cook':
        return <Flame className="w-6 h-6 sm:w-7 sm:h-7" />;
      case 'shoot':
        return <Crosshair className="w-6 h-6 sm:w-7 sm:h-7" />;
      case 'attack':
        return <Swords className="w-6 h-6 sm:w-7 sm:h-7" />;
      case 'harvest':
        return <Utensils className="w-6 h-6 sm:w-7 sm:h-7" />;
      case 'clean':
        return <Droplets className="w-6 h-6 sm:w-7 sm:h-7" />;
      default:
        return <Hand className="w-6 h-6 sm:w-7 sm:h-7" />;
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

  return (
    <div className="pointer-events-none fixed inset-0 z-20 touch-surface select-none overflow-hidden">
      {/* LEFT ZONE: Sprint/Crouch + Flight ON/OFF Switch stacked cleanly above Movement Joystick + Teleport Box */}
      <div
        id="joystick-pad"
        className="joystick-pad pointer-events-auto absolute bottom-[74px] sm:bottom-[86px] left-2.5 sm:left-5 safe-bottom flex flex-col items-start gap-2"
      >
        <div className="flex items-center gap-1.5 pl-1">
          {!mirroredJoystickOnly && (
            <>
              <button
                type="button"
                aria-label="Sprint"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onSprintToggle(!isSprinting);
                }}
                className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full border-2 flex items-center justify-center shadow-lg transition-colors ${
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
                className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full border-2 flex items-center justify-center shadow-lg transition-colors ${
                  isCrouching
                    ? 'bg-emerald-500 border-emerald-200 text-stone-950'
                    : 'bg-stone-950/80 border-stone-500/60 text-stone-100'
                }`}
              >
                <ArrowDown className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </>
          )}

          {onFlightToggle && (
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
              className={`h-9 sm:h-11 px-2.5 sm:px-3 rounded-lg border-2 flex items-center gap-1.5 shadow-lg transition-colors ${
                isFlying
                  ? 'bg-sky-500 border-sky-200 text-stone-950'
                  : 'bg-stone-950/85 border-stone-500/60 text-stone-100 hover:border-sky-400/70'
              }`}
            >
              <Plane className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider whitespace-nowrap">
                Fly {isFlying ? 'ON' : 'OFF'}
              </span>
              <span
                className={`w-6 h-3.5 rounded-full p-0.5 flex items-center transition-colors ${
                  isFlying ? 'bg-stone-950/40 justify-end' : 'bg-stone-700 justify-start'
                }`}
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isFlying ? 'bg-white' : 'bg-stone-400'
                  }`}
                />
              </span>
            </button>
          )}
        </div>

        <div className="flex items-end gap-2">
          <div
            ref={joyPadRef}
            className="relative w-26 h-26 sm:w-32 sm:h-32 shrink-0 rounded-full bg-stone-950/70 border-2 border-amber-500/40 flex items-center justify-center touch-surface shadow-2xl"
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
            <div
              ref={knobRef}
              className="w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-amber-500 border-2 border-amber-200 shadow-xl flex items-center justify-center pointer-events-none will-change-transform"
              style={{
                transform: 'perspective(180px) translate(0px, 0px) rotateX(0deg) rotateY(0deg)',
              }}
            >
              <Footprints className="w-5 h-5 sm:w-6 sm:h-6 text-stone-950" />
            </div>
            {gamepadConnected && (
              <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-stone-950/90 border border-emerald-500/60 text-[9px] font-bold tracking-wider text-emerald-300 uppercase whitespace-nowrap pointer-events-none">
                Xbox LS
              </span>
            )}
          </div>

          {(onFlyAscendChange || onFlyDescendChange) && (
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

          {onTeleportBiome && (
            <form
              id="teleport-bar"
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const dest = tpInput.trim();
                if (!dest) return;
                onTeleportBiome(dest);
                setTpInput('');
              }}
              onPointerDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              className="flex items-center gap-1 bg-stone-950/92 border border-sky-500/50 rounded-lg px-1.5 py-1 shadow-xl"
            >
              <Navigation className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <input
                type="text"
                value={tpInput}
                onChange={(e) => setTpInput(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder="TP biome..."
                aria-label="Teleport to biome"
                className="w-24 sm:w-32 bg-transparent text-[11px] sm:text-xs text-stone-100 placeholder:text-stone-400 focus:outline-none select-text"
              />
              <button
                type="submit"
                className="px-2 py-0.5 rounded bg-sky-500 hover:bg-sky-400 active:bg-sky-300 text-stone-950 text-[10px] font-extrabold uppercase tracking-wider shrink-0"
              >
                TP
              </button>
            </form>
          )}
        </div>
      </div>

      {/* RIGHT ZONE: Compact Minecraft-PE-Style Jump + Primary Action Arc + Quick Utility Row */}
      {!mirroredJoystickOnly && (
      <div
        id="combat-controls"
        className="action-wheel pointer-events-auto absolute bottom-[74px] sm:bottom-[86px] right-2.5 sm:right-5 safe-bottom flex flex-col items-end gap-2"
      >
        {/* Compact Utility Row: Backpack, Craft, Build */}
        <div className="flex items-center gap-1.5">
          {onOpenBackpack && (
            <button
              type="button"
              aria-label="Open Backpack"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onOpenBackpack();
              }}
              className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-stone-950/85 border-2 border-stone-500/60 text-amber-300 active:bg-stone-800 flex items-center justify-center shadow-lg"
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
              className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-stone-950/85 border-2 border-stone-500/60 text-amber-300 active:bg-stone-800 flex items-center justify-center shadow-lg"
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
              className="h-9 sm:h-11 px-2.5 sm:px-3 rounded-full bg-amber-950/90 border-2 border-amber-400/80 text-amber-200 active:bg-amber-800 flex items-center gap-1 shadow-lg"
            >
              <PackageOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
                Build
              </span>
            </button>
          )}
        </div>

        {/* Thumb Arc: Reload + Kick + Jump + Primary Action */}
        <div className="flex items-end gap-1.5 sm:gap-2">
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
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-amber-600 hover:bg-amber-500 active:bg-amber-400 border-3 border-amber-200 text-stone-950 font-extrabold shadow-2xl flex flex-col items-center justify-center gap-0.5"
          >
            {renderActionIcon()}
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider leading-none">
              {shortVerb}
            </span>
          </button>
        </div>
      </div>
      )}
    </div>
  );
}));
