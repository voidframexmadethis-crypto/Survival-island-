'use client';

import React, { useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Axe,
  Backpack,
  Crosshair,
  Flame,
  Footprints,
  Hammer,
  Hand,
  PackageOpen,
  PackagePlus,
  Pickaxe,
  Zap,
} from 'lucide-react';
import { NearbyInteraction } from '@/game/types';

interface TouchControlsProps {
  visible: boolean;
  actionLabel: string;
  actionCategory?: NearbyInteraction['actionCategory'];
  isSprinting: boolean;
  isCrouching: boolean;
  onJoystickMove: (x: number, y: number) => void;
  onCameraDrag: (dx: number, dy: number) => void;
  onAction: () => void;
  onJump: () => void;
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
  onJoystickMove,
  onCameraDrag,
  onAction,
  onJump,
  onSprintToggle,
  onCrouchToggle,
  onOpenBackpack,
  onOpenCraft,
  onOpenPlace,
}: TouchControlsProps) {
  const joyRef = useRef<HTMLDivElement | null>(null);
  const joyPointerId = useRef<number | null>(null);
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });

  if (!visible) return null;

  const maxRadius = 46;

  const updateJoystickFromPoint = (clientX: number, clientY: number) => {
    const el = joyRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxRadius) {
      dx = (dx / dist) * maxRadius;
      dy = (dy / dist) * maxRadius;
    }
    setKnobOffset({ x: dx, y: dy });
    // Invert Y so pushing up yields +1 forward
    onJoystickMove(dx / maxRadius, -dy / maxRadius);
  };

  const resetJoystick = () => {
    joyPointerId.current = null;
    setKnobOffset({ x: 0, y: 0 });
    onJoystickMove(0, 0);
  };

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
      default:
        return 'Act';
    }
  })();

  return (
    <div className="pointer-events-none fixed inset-0 z-20 touch-surface">
      {/* Left Thumb Virtual Movement Joystick (Supports Multi-Touch + Mouse Pointer) */}
      <div className="pointer-events-auto absolute bottom-22 left-4 sm:left-6 safe-bottom">
        <div
          ref={joyRef}
          className="relative w-32 h-32 rounded-full bg-stone-950/60 border-2 border-stone-400/35 flex items-center justify-center touch-surface"
          onPointerDown={(e) => {
            e.stopPropagation();
            if (joyPointerId.current === null) {
              joyPointerId.current = e.pointerId;
              try {
                e.currentTarget.setPointerCapture(e.pointerId);
              } catch {
                // Ignore if synthetic event cannot capture
              }
              updateJoystickFromPoint(e.clientX, e.clientY);
            }
          }}
          onPointerMove={(e) => {
            if (e.pointerId === joyPointerId.current) {
              e.stopPropagation();
              updateJoystickFromPoint(e.clientX, e.clientY);
            }
          }}
          onPointerUp={(e) => {
            if (e.pointerId === joyPointerId.current) {
              resetJoystick();
            }
          }}
          onPointerCancel={(e) => {
            if (e.pointerId === joyPointerId.current) {
              resetJoystick();
            }
          }}
          onLostPointerCapture={() => {
            resetJoystick();
          }}
        >
          <div
            className="w-14 h-14 rounded-full bg-amber-500/85 border-2 border-amber-200/80 shadow-lg flex items-center justify-center"
            style={{
              transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`,
            }}
          >
            <Footprints className="w-5 h-5 text-stone-950" />
          </div>
        </div>
      </div>

      {/* Right Thumb Action Cluster + Quick Backpack & Craft */}
      <div className="pointer-events-auto absolute bottom-22 right-4 sm:right-6 safe-bottom flex items-end gap-3">
        <div className="flex flex-col gap-2">
          <button
            type="button"
            aria-label="Sprint"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onSprintToggle(!isSprinting);
            }}
            className={`w-12 h-12 min-w-[48px] min-h-[48px] rounded-full border-2 flex items-center justify-center transition-colors ${
              isSprinting
                ? 'bg-amber-500 border-amber-200 text-stone-950'
                : 'bg-stone-950/75 border-stone-500/50 text-stone-100'
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
            className={`w-12 h-12 min-w-[48px] min-h-[48px] rounded-full border-2 flex items-center justify-center transition-colors ${
              isCrouching
                ? 'bg-emerald-500 border-emerald-200 text-stone-950'
                : 'bg-stone-950/75 border-stone-500/50 text-stone-100'
            }`}
          >
            <ArrowDown className="w-5 h-5" />
          </button>

          <button
            type="button"
            aria-label="Jump"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onJump();
            }}
            className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-stone-950/75 border-2 border-stone-500/50 text-stone-100 active:bg-stone-800 flex items-center justify-center"
          >
            <ArrowUp className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-2.5">
          <div className="flex items-center gap-2">
            {onOpenBackpack && (
              <button
                type="button"
                aria-label="Open Backpack"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenBackpack();
                }}
                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-stone-950/80 border-2 border-stone-500/50 text-amber-300 active:bg-stone-800 flex items-center justify-center"
              >
                <Backpack className="w-4 h-4" />
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
                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-stone-950/80 border-2 border-stone-500/50 text-amber-300 active:bg-stone-800 flex items-center justify-center"
              >
                <Hammer className="w-4 h-4" />
              </button>
            )}
            {onOpenPlace && (
              <button
                type="button"
                aria-label="Place Stuff"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenPlace();
                }}
                className="h-11 min-w-[44px] min-h-[44px] px-2.5 rounded-full bg-amber-950/90 border-2 border-amber-400/70 text-amber-200 active:bg-amber-800 flex items-center justify-center gap-1"
              >
                <PackageOpen className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wide">
                  Place
                </span>
              </button>
            )}
          </div>

          <button
            type="button"
            aria-label={actionLabel}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onAction();
            }}
            className="w-18 h-18 min-w-[72px] min-h-[72px] rounded-full bg-amber-600/95 active:bg-amber-500 border-2 border-amber-200 text-stone-950 font-bold shadow-xl flex flex-col items-center justify-center gap-0.5"
          >
            {renderActionIcon()}
            <span className="text-[10px] uppercase tracking-wide leading-none">
              {shortVerb}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
