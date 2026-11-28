'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Beef,
  Bone,
  Check,
  ChevronRight,
  Flame,
  Heart,
  Package,
  Scissors,
  Skull,
  Sword,
  Truck,
  X,
} from 'lucide-react';
import { ITEMS } from '@/game/data/items';
import {
  FIELD_PROCESSING_STEP_INFO,
  fieldProcessingDurationMs,
  type FieldProcessingStep,
} from '@/game/systems/fieldProcessingSystem';
import {
  FieldProcessingHudState,
  FieldProcessingStepResult,
  FieldProcessingYieldView,
} from '@/game/types';
import { ItemIcon } from './ItemIcon';

interface FieldProcessingModalProps {
  view: FieldProcessingHudState | null;
  onStep: (step: FieldProcessingStep) => FieldProcessingStepResult;
  onSharpen: () => void;
  onToggleDrag: () => void;
  onLoadVehicle: () => void;
  onUnloadVehicle: () => void;
  onClose: () => void;
}

interface ActiveCut {
  step: FieldProcessingStep;
  startedAt: number;
  durationMs: number;
  detailed: boolean;
}

const GROUP_TITLE: Record<FieldProcessingYieldView['group'], string> = {
  organs: 'Organs',
  hide: 'Hide & Pelt',
  prime: 'Prime Cuts',
  extras: 'Edible Extras',
  trophies: 'Crafting & Trophy',
  legacy: 'Field Loot',
  packaging: 'Meat Bags',
};

const GROUP_ICON: Record<FieldProcessingYieldView['group'], React.ReactNode> = {
  organs: <Heart className="h-3 w-3" />,
  hide: <Package className="h-3 w-3" />,
  prime: <Beef className="h-3 w-3" />,
  extras: <Bone className="h-3 w-3" />,
  trophies: <Skull className="h-3 w-3" />,
  legacy: <Package className="h-3 w-3" />,
  packaging: <Package className="h-3 w-3" />,
};

function YieldGrid({ yields }: { yields: FieldProcessingYieldView[] }) {
  if (yields.length === 0) {
    return (
      <div className="rounded-lg border border-stone-800 bg-stone-950/50 px-3 py-2 text-[11px] text-stone-400">
        No cuts remain. This carcass has been fully harvested.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
      {yields.map((y) => (
        <div
          key={`${y.group}_${y.itemId}`}
          className="flex items-center gap-2 rounded-lg border border-stone-800 bg-stone-950/60 px-2 py-1.5"
        >
          <ItemIcon itemId={y.itemId} className="h-4 w-4 shrink-0" />
          <div className="min-w-0">
            <div className="truncate text-[11px] font-semibold text-stone-200">
              {y.quantity}× {ITEMS[y.itemId].name}
            </div>
            <div className="text-[9px] text-stone-500 font-mono-tabular">
              {y.weightKg.toFixed(1)} kg · {y.sellValue}c
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function FieldProcessingModal({
  view,
  onStep,
  onSharpen,
  onToggleDrag,
  onLoadVehicle,
  onUnloadVehicle,
  onClose,
}: FieldProcessingModalProps) {
  const [active, setActive] = useState<ActiveCut | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [result, setResult] = useState<FieldProcessingStepResult | null>(null);
  const finishedRef = useRef(false);

  const progress = active
    ? Math.min(1, (now - active.startedAt) / Math.max(1, active.durationMs))
    : 0;

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), 50);
    return () => window.clearInterval(id);
  }, [active]);

  useEffect(() => {
    if (!active || finishedRef.current) return;
    if (now < active.startedAt + active.durationMs) return;
    finishedRef.current = true;
    const outcome = onStep(active.step);
    setResult(outcome);
    setActive(null);
  }, [active, now, onStep]);

  const startCut = (step: FieldProcessingStep) => {
    if (!view || active) return;
    if (view.hasKnife === false) return;
    if (view.knifeSharpness < FIELD_PROCESSING_STEP_INFO[step].sharpnessCost) return;
    if (step === 'field_dress' && view.stage !== 'whole') return;
    if (step === 'skin' && view.stage !== 'field_dressed') return;
    if ((step === 'butcher' || step === 'quarter') && view.stage !== 'skinned') return;
    if (step === 'quarter' && result?.complete) return;
    finishedRef.current = false;
    setResult(null);
    setNow(Date.now());
    setActive({
      step,
      startedAt: Date.now(),
      durationMs: fieldProcessingDurationMs(step, view.detailedAnimations),
      detailed: view.detailedAnimations,
    });
  };

  useEffect(() => {
    const advance = () => {
      if (view?.nextStep) startCut(view.nextStep);
    };
    const sharpen = () => onSharpen();
    const drag = () => onToggleDrag();
    const load = () => onLoadVehicle();
    const unload = () => onUnloadVehicle();
    window.addEventListener('fieldProcessingAdvance', advance);
    window.addEventListener('fieldProcessingSharpen', sharpen);
    window.addEventListener('fieldProcessingDrag', drag);
    window.addEventListener('fieldProcessingLoad', load);
    window.addEventListener('fieldProcessingUnload', unload);
    return () => {
      window.removeEventListener('fieldProcessingAdvance', advance);
      window.removeEventListener('fieldProcessingSharpen', sharpen);
      window.removeEventListener('fieldProcessingDrag', drag);
      window.removeEventListener('fieldProcessingLoad', load);
      window.removeEventListener('fieldProcessingUnload', unload);
    };
  });

  const cutInfo = active ? FIELD_PROCESSING_STEP_INFO[active.step] : null;
  const nextStepInfo =
    view?.nextStep ? FIELD_PROCESSING_STEP_INFO[view.nextStep] : null;
  const harvestDone = Boolean(result?.complete);
  const remainingYields = harvestDone ? [] : view?.remainingYields ?? [];
  const stageIndex =
    view?.stage === 'whole' ? 0 : view?.stage === 'field_dressed' ? 1 : 2;

  return (
    <div
      data-console-scope
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4"
    >
      <div className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-amber-900/70 bg-stone-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-800 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-700/60 bg-amber-950/40">
              <Sword className="h-5 w-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate font-display text-base font-bold text-stone-100">
                Field Processing · {view?.displayName ?? 'Harvest'}
              </h2>
              <p className="text-[10px] uppercase tracking-[0.16em] text-stone-400">
                {harvestDone ? 'Harvested' : view?.stageLabel ?? 'Harvest complete'}
                {view ? ` · ${harvestDone ? '0.0' : view.weightKg.toFixed(1)} kg` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-stone-700 text-stone-400 hover:bg-stone-800 hover:text-stone-100"
            aria-label="Close field processing"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 sm:p-4">
          <div className="rounded-xl border border-stone-800 bg-stone-950/70 p-3">
            <div className="flex items-center gap-1">
              {(['Field Dress', 'Skin', 'Butcher'] as const).map((label, index) => (
                <React.Fragment key={label}>
                  <div
                    className={`flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-wide ${
                      index < stageIndex
                        ? 'bg-emerald-950/70 text-emerald-300'
                        : index === stageIndex
                          ? 'bg-amber-500 text-stone-950'
                          : 'bg-stone-800 text-stone-500'
                    }`}
                  >
                    {index < stageIndex ? <Check className="h-3 w-3" /> : null}
                    {label}
                  </div>
                  {index < 2 ? (
                    <ChevronRight className="h-3 w-3 shrink-0 text-stone-600" />
                  ) : null}
                </React.Fragment>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
              <div>
                <div className="flex justify-between text-stone-400">
                  <span>Meat freshness</span>
                  <span className="font-mono-tabular text-stone-200">
                    {view ? `${Math.round(view.freshness * 100)}%` : '—'}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-stone-800">
                  <div
                    className={`h-full rounded-full ${
                      (view?.freshness ?? 0) > 0.55
                        ? 'bg-emerald-500'
                        : (view?.freshness ?? 0) > 0.25
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.round((view?.freshness ?? 0) * 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-stone-400">
                  <span>Knife sharpness</span>
                  <span className="font-mono-tabular text-stone-200">
                    {view ? `${Math.round(view.knifeSharpness)}%` : '—'}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-stone-800">
                  <div
                    className={`h-full rounded-full ${
                      (view?.knifeSharpness ?? 0) > 55
                        ? 'bg-sky-400'
                        : (view?.knifeSharpness ?? 0) > 25
                          ? 'bg-amber-400'
                          : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.round(view?.knifeSharpness ?? 0)}%` }}
                  />
                </div>
              </div>
            </div>
            {!view?.hasKnife ? (
              <p className="mt-2 rounded-md border border-rose-900/70 bg-rose-950/30 px-2 py-1 text-[10px] text-rose-200">
                No hunting knife in your pack or HUD bar. Equip one before cutting.
              </p>
            ) : null}
          </div>

          <div className="rounded-xl border border-stone-800 bg-stone-950/60 p-3">
            {active && cutInfo ? (
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-semibold text-amber-200">
                    <Scissors className="h-3.5 w-3.5" />
                    {cutInfo.label}…
                  </span>
                  <span className="font-mono-tabular text-stone-400">
                    {Math.round(progress * 100)}%
                  </span>
                </div>
                <div className="relative mt-3 flex h-24 items-center justify-center overflow-hidden rounded-lg border border-stone-800 bg-gradient-to-b from-stone-900 to-stone-950">
                  <div className="absolute inset-x-8 bottom-4 h-2 rounded-full bg-stone-800" />
                  <div
                    className="absolute bottom-5 h-8 w-20 rounded-lg border border-rose-900/50 bg-rose-950/50 transition-transform duration-100"
                    style={{
                      transform: active.detailed
                        ? `translateX(${Math.sin(progress * Math.PI * 8) * 18}px)`
                        : `scaleY(${1 - progress * 0.25})`,
                      opacity: active.detailed ? 1 : 0.35 + (1 - progress) * 0.65,
                    }}
                  >
                    <Beef className="mx-auto mt-1.5 h-5 w-5 text-rose-400/70" />
                  </div>
                  {active.detailed ? (
                    <>
                      <div
                        className="absolute bottom-10 h-8 w-[3px] rounded-full bg-stone-200 shadow-[0_0_8px_rgba(255,255,255,0.45)]"
                        style={{
                          left: `${22 + Math.sin(progress * Math.PI * 8) * 16}px`,
                          transform: `rotate(${18 + Math.sin(progress * Math.PI * 8) * 10}deg)`,
                        }}
                      />
                      <div className="absolute right-6 top-4 flex gap-1 opacity-60">
                        <span className="h-1 w-1 rounded-full bg-rose-400" />
                        <span className="mt-2 h-1 w-1 rounded-full bg-rose-300" />
                        <span className="mt-1 h-1 w-1 rounded-full bg-rose-500" />
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-stone-950/40 text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400">
                      Quick harvest fade
                    </div>
                  )}
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-[width] duration-75"
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
                <p className="mt-1 text-[10px] text-stone-400">
                  {active.detailed
                    ? 'Careful knife work keeps the hide intact and the cuts clean.'
                    : 'Quick Harvest Fade is enabled in Settings.'}
                </p>
              </div>
            ) : result ? (
              <div
                className={`rounded-lg border p-3 ${
                  result.ok
                    ? 'border-emerald-900/70 bg-emerald-950/30'
                    : 'border-amber-900/70 bg-amber-950/25'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-stone-100">
                  <Check className={`h-4 w-4 ${result.ok ? 'text-emerald-400' : 'text-amber-400'}`} />
                  {result.message}
                </div>
                {result.yields.length > 0 ? (
                  <div className="mt-2">
                    <YieldGrid yields={result.yields} />
                  </div>
                ) : null}
                {result.complete ? (
                  <p className="mt-2 text-[11px] text-stone-300">
                    All edible meat, organs, hide, and trophy parts are packed. Cook raw cuts soon
                    or store them in a cooler/fridge to pause spoilage.
                  </p>
                ) : null}
              </div>
            ) : null}

            {!active && view?.nextStep && !harvestDone ? (
              <div className={result ? 'mt-3 border-t border-stone-800 pt-3' : ''}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-200">
                      <Flame className="h-3.5 w-3.5" />
                      Next: {view.nextStepLabel}
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-stone-400">
                      {nextStepInfo?.description}
                    </p>
                  </div>
                  <div className="shrink-0 text-right text-[10px] text-stone-500 font-mono-tabular">
                    {(view.nextStepDurationMs / 1000).toFixed(1)}s
                    <br />
                    -{view.nextStepSharpnessCost} edge
                  </div>
                </div>
                <div className="mt-3">
                  <YieldGrid yields={view.nextStepYields} />
                </div>
                {view.blockedReason ? (
                  <p className="mt-2 rounded-md border border-amber-900/70 bg-amber-950/25 px-2 py-1 text-[10px] text-amber-200">
                    {view.blockedReason}
                  </p>
                ) : null}
                <button
                  type="button"
                  data-console-autofocus
                  onClick={() => startCut(view.nextStep!)}
                  disabled={!view.canPerformNext}
                  className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border-2 border-amber-300 bg-amber-500 px-4 py-2 text-sm font-extrabold text-stone-950 shadow-lg hover:bg-amber-400 disabled:cursor-not-allowed disabled:border-stone-700 disabled:bg-stone-800 disabled:text-stone-500"
                >
                  <Scissors className="h-4 w-4" />
                  {view.nextStepLabel}
                  <span className="hidden text-[10px] font-semibold opacity-80 sm:inline">
                    A / Tap
                  </span>
                </button>
                {view.stage === 'skinned' ? (
                  <button
                    type="button"
                    onClick={() => startCut('quarter')}
                    disabled={!view.hasKnife || view.knifeSharpness < 16}
                    className="mt-2 flex min-h-[40px] w-full items-center justify-center gap-2 rounded-xl border border-stone-700 bg-stone-800 px-3 py-2 text-xs font-bold text-stone-200 hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Package className="h-4 w-4" />
                    Quarter on the spot into meat bags
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onSharpen}
              disabled={!view?.hasKnife || view.knifeSharpness >= 95}
              className="min-h-[42px] rounded-xl border border-sky-900/70 bg-sky-950/30 px-3 py-2 text-left text-[11px] font-semibold text-sky-100 hover:bg-sky-950/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Hone Knife <span className="text-[9px] text-sky-300">+40 edge · 1 Stone</span>
            </button>
            {view?.loadedVehicleId ? (
              <button
                type="button"
                onClick={onUnloadVehicle}
                className="min-h-[42px] rounded-xl border border-amber-900/70 bg-amber-950/25 px-3 py-2 text-left text-[11px] font-semibold text-amber-100 hover:bg-amber-950/45"
              >
                Unload from {view.loadedVehicleName ?? 'vehicle'}
              </button>
            ) : (
              <button
                type="button"
                onClick={onToggleDrag}
                disabled={!view || view.stage === 'whole' || harvestDone}
                className="min-h-[42px] rounded-xl border border-stone-700 bg-stone-800 px-3 py-2 text-left text-[11px] font-semibold text-stone-200 hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {view?.dragging ? 'Release Carcass' : 'Drag Carcass'} (Y)
              </button>
            )}
            <button
              type="button"
              onClick={onLoadVehicle}
              disabled={
                !view ||
                view.stage === 'whole' ||
                Boolean(view.loadedVehicleId) ||
                harvestDone
              }
              className="col-span-2 flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-emerald-900/70 bg-emerald-950/25 px-3 py-2 text-[11px] font-semibold text-emerald-100 hover:bg-emerald-950/45 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Truck className="h-3.5 w-3.5" />
              {view?.nearVehicleName
                ? `Load into ${view.nearVehicleName}`
                : 'Drive a truck within 9 m to load'}
            </button>
          </div>

          <div className="rounded-xl border border-stone-800 bg-stone-950/50 p-3">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-stone-500">
              <span className="flex items-center gap-1.5">
                <Package className="h-3 w-3" />
                Remaining harvest value
              </span>
              <span className="font-mono-tabular text-emerald-300">
                {view && !harvestDone ? `${view.totalRemainingValue}c` : '0c'}
              </span>
            </div>
            <div className="mt-2 max-h-36 overflow-y-auto">
              <YieldGrid yields={remainingYields} />
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {Object.entries(GROUP_TITLE)
                .filter(([group]) => remainingYields.some((y) => y.group === group))
                .map(([group, title]) => (
                  <span
                    key={group}
                    className="inline-flex items-center gap-1 rounded-full border border-stone-800 px-2 py-0.5 text-[9px] text-stone-400"
                  >
                    {GROUP_ICON[group as FieldProcessingYieldView['group']]}
                    {title}
                  </span>
                ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-stone-800 px-4 py-2 text-[9px] text-stone-500">
          <span>Xbox: A cut · X hone · Y drag · LB unload · RB load · B close</span>
          <span>Touch: tap actions · Detailed animations in Settings</span>
        </div>
      </div>
    </div>
  );
}
