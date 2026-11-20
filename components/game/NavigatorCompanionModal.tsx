'use client';

import React from 'react';
import {
  Axe,
  Backpack,
  Car,
  Compass,
  Crosshair,
  Hand,
  Home,
  PackageCheck,
  Shield,
  Users,
  X,
} from 'lucide-react';
import type { NavigatorCompanionHudState, NavigatorTask, PlayerGender } from '@/game/types';
import { ITEMS } from '@/game/data/items';

interface NavigatorCompanionModalProps {
  companion: NavigatorCompanionHudState;
  onClose: () => void;
  onSetTask: (task: NavigatorTask) => void;
  onSetAllowDriving: (allowed: boolean) => void;
  onSetNavigatorGender: (gender: PlayerGender) => void;
  onCollectSharedLoot: () => void;
}

export function NavigatorCompanionModal({
  companion,
  onClose,
  onSetTask,
  onSetAllowDriving,
  onSetNavigatorGender,
  onCollectSharedLoot,
}: NavigatorCompanionModalProps) {
  const isBoy = companion.gender === 'boy';
  const totalLootCount = companion.backpackItems.reduce((sum, s) => sum + s.quantity, 0);

  const taskButtons: {
    task: NavigatorTask;
    label: string;
    desc: string;
    icon: React.ReactNode;
    disabled?: boolean;
  }[] = [
    {
      task: 'follow',
      label: 'Follow & Protect',
      desc: 'Walks with you & shoots threats with rifle',
      icon: <Shield className="w-4 h-4 text-emerald-400" />,
    },
    {
      task: 'chop_trees',
      label: 'Chop Trees & Collect',
      desc: 'Chops nearby trees & packs wood for you',
      icon: <Axe className="w-4 h-4 text-amber-400" />,
    },
    {
      task: 'hunt_animals',
      label: 'Hunt Animals',
      desc: 'Hunts wildlife with gun & collects meat',
      icon: <Crosshair className="w-4 h-4 text-rose-400" />,
    },
    {
      task: 'lead_shelter',
      label: 'Lead to Premade Shelter',
      desc: `Guides you to Hilltop House (${companion.distanceToShelter}m)`,
      icon: <Home className="w-4 h-4 text-sky-400" />,
    },
    {
      task: 'drive_car',
      label: 'Drive Nearest Car',
      desc: companion.allowDriving
        ? 'Hops in a parked car & drives for you'
        : 'Turn on Car Driving Permission below first',
      icon: <Car className="w-4 h-4 text-violet-400" />,
      disabled: !companion.allowDriving,
    },
    {
      task: 'stay',
      label: 'Hold Position',
      desc: 'Stays put and watches camp',
      icon: <Hand className="w-4 h-4 text-stone-300" />,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75">
      <div className="w-full max-w-2xl max-h-[90dvh] overflow-y-auto survival-scroll rounded-2xl bg-stone-950 border-2 border-amber-600/70 shadow-2xl p-4 sm:p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-stone-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Compass className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg sm:text-xl font-bold text-stone-100">
                {companion.name}
              </h2>
              <span className="px-2 py-0.5 rounded bg-teal-950 border border-teal-500/60 text-teal-200 text-[10px] font-bold uppercase tracking-wider">
                Non-Playable Companion
              </span>
            </div>
            <p className="text-xs sm:text-sm text-stone-300">{companion.statusText}</p>
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-stone-400 pt-1">
              <span>Distance to you: {companion.distanceToPlayer}m</span>
              <span>·</span>
              <span>Trees chopped: {companion.treesChopped}</span>
              <span>·</span>
              <span>Animals hunted: {companion.animalsHunted}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 flex items-center justify-center text-stone-300 cursor-pointer"
            aria-label="Close Navigator Companion Panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Companion Gender & Driving Permission */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl bg-stone-900/90 border border-stone-800 p-3 space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              <span>Ship Navigator Identity</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onSetNavigatorGender('girl')}
                className={`min-h-[38px] rounded-lg border text-xs font-bold transition cursor-pointer ${
                  !isBoy
                    ? 'bg-rose-950/85 border-rose-400 text-rose-100'
                    : 'bg-stone-950 border-stone-700 text-stone-300 hover:bg-stone-800'
                }`}
              >
                Girl (Elena)
              </button>
              <button
                type="button"
                onClick={() => onSetNavigatorGender('boy')}
                className={`min-h-[38px] rounded-lg border text-xs font-bold transition cursor-pointer ${
                  isBoy
                    ? 'bg-sky-950/85 border-sky-400 text-sky-100'
                    : 'bg-stone-950 border-stone-700 text-stone-300 hover:bg-stone-800'
                }`}
              >
                Boy (Mateo)
              </button>
            </div>
          </div>

          <div className="rounded-xl bg-stone-900/90 border border-stone-800 p-3 flex flex-col justify-between gap-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-violet-300 flex items-center gap-1.5">
              <Car className="w-3.5 h-3.5" />
              <span>Car Driving Permission</span>
            </div>
            <button
              type="button"
              onClick={() => onSetAllowDriving(!companion.allowDriving)}
              className={`min-h-[38px] px-3 rounded-lg border text-xs font-bold transition cursor-pointer flex items-center justify-between ${
                companion.allowDriving
                  ? 'bg-emerald-950/85 border-emerald-400 text-emerald-100'
                  : 'bg-stone-950 border-stone-700 text-stone-300 hover:bg-stone-800'
              }`}
            >
              <span>Let Navigator Drive Cars</span>
              <span className="uppercase text-[10px] font-extrabold">
                {companion.allowDriving ? 'Allowed' : 'Locked'}
              </span>
            </button>
          </div>
        </div>

        {/* Companion Commands */}
        <div className="space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-stone-300">
            Companion Orders
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {taskButtons.map((btn) => {
              const active = companion.task === btn.task;
              return (
                <button
                  key={btn.task}
                  type="button"
                  disabled={btn.disabled}
                  onClick={() => onSetTask(btn.task)}
                  className={`p-3 rounded-xl border text-left transition flex items-start gap-3 ${
                    btn.disabled
                      ? 'bg-stone-900/40 border-stone-800 text-stone-500 cursor-not-allowed'
                      : active
                        ? 'bg-amber-950/75 border-amber-400 text-stone-100 cursor-pointer'
                        : 'bg-stone-900/80 hover:bg-stone-900 border-stone-700 text-stone-200 cursor-pointer'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">{btn.icon}</div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold leading-tight">{btn.label}</div>
                    <div className="text-[11px] text-stone-400 mt-0.5 leading-snug">
                      {btn.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Own Gear & Shared Backpack */}
        <div className="rounded-xl bg-stone-900/90 border border-stone-800 p-3.5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Backpack className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-amber-200">
                Navigator&apos;s Own Gear &amp; Backpack ({totalLootCount} items)
              </span>
            </div>
            <button
              type="button"
              disabled={totalLootCount === 0}
              onClick={onCollectSharedLoot}
              className={`min-h-[36px] px-3.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                totalLootCount > 0
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-stone-950 cursor-pointer'
                  : 'bg-stone-800 text-stone-500 cursor-not-allowed'
              }`}
            >
              <PackageCheck className="w-4 h-4" />
              <span>Take All Shared Supplies</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-2 text-[11px]">
            <span className="px-2.5 py-1 rounded bg-stone-950 border border-stone-700 text-stone-200">
              Own Survival Rifle
            </span>
            <span className="px-2.5 py-1 rounded bg-stone-950 border border-stone-700 text-stone-200">
              Own Woodcutting Axe
            </span>
            <span className="px-2.5 py-1 rounded bg-stone-950 border border-stone-700 text-stone-200">
              Own Survival Backpack
            </span>
            <span className="px-2.5 py-1 rounded bg-stone-950 border border-stone-700 text-stone-200">
              Premade Shelter Map
            </span>
          </div>

          {companion.backpackItems.length === 0 ? (
            <div className="text-xs text-stone-400 py-2">
              Backpack is empty — order {isBoy ? 'him' : 'her'} to chop trees or hunt animals to gather supplies for you!
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {companion.backpackItems.map((slot) => (
                <div
                  key={slot.itemId}
                  className="rounded-lg bg-stone-950 border border-stone-800 px-3 py-2 flex items-center justify-between text-xs"
                >
                  <span className="text-stone-200 truncate">
                    {ITEMS[slot.itemId]?.name || slot.itemId}
                  </span>
                  <span className="font-bold text-amber-300 ml-2">x{slot.quantity}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
