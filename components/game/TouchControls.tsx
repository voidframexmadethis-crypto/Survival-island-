'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Axe,
  Backpack,
  ChevronDown,
  ChevronUp,
  Crosshair,
  Droplets,
  Flame,
  Footprints,
  Hammer,
  Hand,
  PackageOpen,
  PackagePlus,
  Pickaxe,
  RotateCw,
  Swords,
  Utensils,
  Wind,
  Zap,
} from 'lucide-react';
import { NearbyInteraction } from '@/game/types';

interface TouchControlsProps {
  visible: boolean;
  actionLabel: string;
  actionCategory?: NearbyInteraction['actionCategory'];
  isSprinting: boolean;
  isCrouching: boolean;
  kickCooldown?: number;
  showReload?: boolean;
  isReloading?: boolean;
  gamepadConnected?: boolean;
  mirroredJoystickOnly?: boolean;
  gamepadJoystickOffset?: { x: number; y: number };
  onJoystickMove: (x: number, y: number) => void;
  onCameraDrag: (dx: number, dy: number) => void;
  onAction: () => void;
  onReload?: () => void;
  onJump: () => void;
  onKickDebris?: () => void;
  onSprintToggle: (active: boolean) => void;
  onCrouchToggle: (active: boolean) => void;
  onOpenBackpack?: () => void;
  onOpenCraft?: () => void;
  onOpenPlace?: () => void;
}

export function TouchControls({
  visible,
  actionLabel,
  actionCategory,
  isSprinting,
  isCrouching,
  kickCooldown = 0,
  showReload = false,
  isReloading = false,
  gamepadConnected = false,
  mirroredJoystickOnly = false,
  gamepadJoystickOffset,
  onJoystickMove,
  onCameraDrag,
  onAction,
  onReload,
  onJump,
  onKickDebris,
  onSprintToggle,
  onCrouchToggle,
  onOpenBackpack,
  onOpenCraft,
  onOpenPlace,
}: TouchControlsProps) {
  const joyPadRef = useRef<HTMLDivElement | null>(null);
  const activePointerId = useRef<number | null>(null);
  const joyCenter = useRef({ x: 0, y: 0 });
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  const maxRadius = 48;

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    if (activePointerId.current !== null) return;
    const pad = joyPadRef.current;
    if (!pad) return;

    const rect = pad.getBoundingClientRect();
    joyCenter.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };

    activePointerId.current = e.pointerId;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore
    }

    const dx = e.clientX - joyCenter.current.x;
    const dy = e.clientY - joyCenter.current.y;
    const dist = Math.hypot(dx, dy);
    let clampedDx = dx;
    let clampedDy = dy;
    if (dist > maxRadius) {
      clampedDx = (dx / dist) * maxRadius;
      clampedDy = (dy / dist) * maxRadius;
    }
    setKnobOffset({ x: clampedDx, y: clampedDy });
    onJoystickMove(clampedDx / maxRadius, -clampedDy / maxRadius);
  }, [onJoystickMove]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (e.pointerId !== activePointerId.current) return;
    e.stopPropagation();

    const dx = e.clientX - joyCenter.current.x;
    const dy = e.clientY - joyCenter.current.y;
    const dist = Math.hypot(dx, dy);
    let clampedDx = dx;
    let clampedDy = dy;
    if (dist > maxRadius) {
      clampedDx = (dx / dist) * maxRadius;
      clampedDy = (dy / dist) * maxRadius;
    }
    setKnobOffset({ x: clampedDx, y: clampedDy });
    onJoystickMove(clampedDx / maxRadius, -clampedDy / maxRadius);
  }, [onJoystickMove]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (e.pointerId !== activePointerId.current) return;
    activePointerId.current = null;
    setKnobOffset({ x: 0, y: 0 });
    onJoystickMove(0, 0);
  }, [onJoystickMove]);

  if (!visible) return null;

  const renderActionIcon = () => {
    switch (actionCategory) {
      case 'chop':
        return <Axe className="w-7 h-7" />;
      case 'mine':
        return <Pickaxe className="w-7 h-7" />;
      case 'pickup':
        return <PackagePlus className="w-7 h-7" />;
      case 'craft':
        return <Hammer className="w-7 h-7" />;
      case 'cook':
        return <Flame className="w-7 h-7" />;
      case 'shoot':
        return <Crosshair className="w-7 h-7" />;
      case 'attack':
        return <Swords className="w-7 h-7" />;
      case 'harvest':
        return <Utensils className="w-7 h-7" />;
      case 'clean':
        return <Droplets className="w-7 h-7" />;
      default:
        return <Hand className="w-7 h-7" />;
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
      {/* LEFT ZONE: Unobstructed Movement Joystick */}
      <div className="pointer-events-auto absolute bottom-32 left-3 sm:left-6 safe-bottom">
        <div
          ref={joyPadRef}
          className="relative w-32 h-32 sm:w-38 sm:h-38 rounded-full bg-stone-950/75 border-2 border-amber-500/35 flex items-center justify-center touch-surface shadow-2xl backdrop-blur-md"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onLostPointerCapture={handlePointerUp}
        >
          {(() => {
            const rawX =
              knobOffset.x !== 0 ? knobOffset.x : (gamepadJoystickOffset?.x ?? 0);
            const rawY =
              knobOffset.y !== 0 ? knobOffset.y : (gamepadJoystickOffset?.y ?? 0);
            const mag = Math.hypot(rawX, rawY);
            const effectiveX = mag > maxRadius ? (rawX / mag) * maxRadius : rawX;
            const effectiveY = mag > maxRadius ? (rawY / mag) * maxRadius : rawY;
            const tiltX = (-effectiveY / maxRadius) * 18;
            const tiltY = (effectiveX / maxRadius) * 18;
            const isDeflected = mag > 2;
            return (
              <>
                <div
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-amber-500 border-2 shadow-xl flex items-center justify-center pointer-events-none ${
                    isDeflected ? 'border-emerald-300 ring-2 ring-emerald-400/50' : 'border-amber-200'
                  }`}
                  style={{
                    transform: `perspective(180px) translate(${effectiveX.toFixed(1)}px, ${effectiveY.toFixed(1)}px) rotateX(${tiltX.toFixed(1)}deg) rotateY(${tiltY.toFixed(1)}deg)`,
                  }}
                >
                  <Footprints className="w-6 h-6 text-stone-950" />
                </div>
                {gamepadConnected && (
                  <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-stone-950/90 border border-emerald-500/60 text-[9px] font-bold tracking-wider text-emerald-300 uppercase whitespace-nowrap pointer-events-none">
                    Xbox LS
                  </span>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {/* MID-LEFT ZONE: Sprint, Crouch & Jump / Vault Arc */}
      {!mirroredJoystickOnly && (
      <div className="pointer-events-auto absolute bottom-32 left-38 sm:left-50 safe-bottom flex items-end gap-2">
        <button
          type="button"
          aria-label="Sprint"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onSprintToggle(!isSprinting);
          }}
          className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full border-2 flex items-center justify-center shadow-lg transition-colors ${
            isSprinting
              ? 'bg-amber-500 border-amber-200 text-stone-950'
              : 'bg-stone-950/80 border-stone-500/60 text-stone-100'
          }`}
        >
          <Zap className="w-5 h-5" />
        </button>

        <button
          type="button"
          aria-label="Crouch"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onCrouchToggle(!isCrouching);
          }}
          className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full border-2 flex items-center justify-center shadow-lg transition-colors ${
            isCrouching
              ? 'bg-emerald-500 border-emerald-200 text-stone-950'
              : 'bg-stone-950/80 border-stone-500/60 text-stone-100'
          }`}
        >
          <ArrowDown className="w-5 h-5" />
        </button>

        <button
          type="button"
          aria-label="Jump & Vault"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onJump();
          }}
          className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-stone-950/85 border-2 border-amber-500/70 text-amber-300 active:bg-amber-600 active:text-stone-950 flex items-center justify-center shadow-2xl"
        >
          <ArrowUp className="w-6 h-6 sm:w-7 sm:h-7" />
        </button>
      </div>
      )}

      {/* RIGHT ZONE: Lifted & Right-Aligned Action Arc (Clear of Empty Hands & Status Badges) */}
      {!mirroredJoystickOnly && (
      <div className="pointer-events-auto absolute bottom-40 sm:bottom-36 right-2.5 sm:right-5 safe-bottom flex items-end gap-2.5">
        <div className="flex flex-col items-end gap-2">
          {/* Top row of right-side arc: Quick Backpack, Craft, and Build / Place Toggle */}
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
                className="w-11 h-11 rounded-full bg-stone-950/85 border-2 border-stone-500/60 text-amber-300 active:bg-stone-800 flex items-center justify-center shadow-lg"
              >
                <Backpack className="w-5 h-5" />
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
                className="w-11 h-11 rounded-full bg-stone-950/85 border-2 border-stone-500/60 text-amber-300 active:bg-stone-800 flex items-center justify-center shadow-lg"
              >
                <Hammer className="w-5 h-5" />
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
                className="h-11 px-3 rounded-full bg-amber-950/90 border-2 border-amber-400/80 text-amber-200 active:bg-amber-800 flex items-center gap-1.5 shadow-lg"
              >
                <PackageOpen className="w-4 h-4" />
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  Build
                </span>
              </button>
            )}
          </div>

          {/* Bottom row of right-side arc: Reload + KICK + Primary USE/Shoot Button shifted up & right */}
          <div className="flex items-center gap-2">
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
                className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full border-2 flex items-center justify-center shadow-xl transition-colors ${
                  isReloading
                    ? 'bg-amber-950/90 border-amber-400 text-amber-300'
                    : 'bg-stone-950/90 border-amber-500/80 text-amber-200 active:bg-amber-600 active:text-stone-950'
                }`}
              >
                <RotateCw className={`w-5 h-5 ${isReloading ? 'animate-spin' : ''}`} />
              </button>
            )}

            {onKickDebris && (
              <button
                type="button"
                aria-label="Dynamic Context (Kick / Interact)"
                disabled={kickCooldown > 0}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onKickDebris();
                }}
                className={`h-13 sm:h-14 px-3.5 rounded-full border-2 flex items-center gap-1.5 shadow-xl transition-colors ${
                  kickCooldown > 0
                    ? 'bg-stone-950/60 border-stone-700 text-stone-500'
                    : 'bg-stone-950/90 border-amber-400/85 text-amber-300 active:bg-amber-700 active:text-stone-950'
                }`}
              >
                <Wind className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-xs font-extrabold uppercase tracking-wide">
                  {kickCooldown > 0 ? `${kickCooldown.toFixed(0)}s` : 'Kick'}
                </span>
              </button>
            )}

            <button
              type="button"
              aria-label={actionLabel}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onAction();
              }}
              className="w-[74px] h-[74px] sm:w-20 sm:h-20 rounded-full bg-amber-600 hover:bg-amber-500 active:bg-amber-400 border-3 border-amber-200 text-stone-950 font-extrabold shadow-2xl flex flex-col items-center justify-center gap-0.5"
            >
              {renderActionIcon()}
              <span className="text-[11px] uppercase tracking-wider leading-none">
                {shortVerb}
              </span>
            </button>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
