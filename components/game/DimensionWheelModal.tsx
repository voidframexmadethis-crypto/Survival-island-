'use client';

import React from 'react';
import {
  Orbit,
  Sparkles,
  Globe,
  Flame,
  Coins,
  Gem,
  Radio,
  Snowflake,
  Mountain,
  TreePine,
  Shield,
  Zap,
  X,
  ArrowRight,
  Compass,
} from 'lucide-react';
import { DimensionId, PortalLinkState } from '@/game/types';
import { DIMENSION_DEFINITIONS, PORTAL_DESTINATION_ORDER } from '@/game/systems/multiverse';

interface DimensionWheelModalProps {
  currentDimension: DimensionId;
  selectedPortalDimension: DimensionId;
  visitedDimensions: string[];
  unlockedGildedPaint: boolean;
  crystalArmorHp: number;
  activePortals: PortalLinkState[];
  onSelectPortalDimension: (dim: DimensionId) => void;
  onFirePortalGun: () => void;
  onDirectWarp: (dim: DimensionId) => void;
  onCloseAllPortals: () => void;
  onClose: () => void;
}

export const DimensionWheelModal: React.FC<DimensionWheelModalProps> = ({
  currentDimension,
  selectedPortalDimension,
  visitedDimensions,
  unlockedGildedPaint,
  crystalArmorHp,
  activePortals,
  onSelectPortalDimension,
  onFirePortalGun,
  onDirectWarp,
  onCloseAllPortals,
  onClose,
}) => {
  const currentDef = DIMENSION_DEFINITIONS[currentDimension] || DIMENSION_DEFINITIONS.overworld;
  const selectedDef = DIMENSION_DEFINITIONS[selectedPortalDimension] || DIMENSION_DEFINITIONS.space;

  const realms = PORTAL_DESTINATION_ORDER.filter(
    (id) => DIMENSION_DEFINITIONS[id]?.category === 'dimension',
  );
  const islands = PORTAL_DESTINATION_ORDER.filter(
    (id) => DIMENSION_DEFINITIONS[id]?.category === 'island',
  );

  const getDimensionIcon = (id: DimensionId) => {
    switch (id) {
      case 'space':
        return <Orbit className="w-5 h-5 text-indigo-400" />;
      case 'nether':
        return <Flame className="w-5 h-5 text-orange-400" />;
      case 'gold':
        return <Coins className="w-5 h-5 text-amber-400" />;
      case 'diamond':
        return <Gem className="w-5 h-5 text-sky-400" />;
      case 'alien':
        return <Radio className="w-5 h-5 text-teal-400" />;
      case 'island_arctic':
        return <Snowflake className="w-5 h-5 text-cyan-300" />;
      case 'island_volcanic':
        return <Mountain className="w-5 h-5 text-rose-500" />;
      case 'island_jungle':
        return <TreePine className="w-5 h-5 text-emerald-400" />;
      default:
        return <Globe className="w-5 h-5 text-emerald-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto survival-scroll">
      <div className="relative w-full max-w-5xl rounded-2xl bg-stone-900 border border-stone-700/80 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-stone-950 border-b border-stone-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Orbit className="w-6 h-6 animate-spin" style={{ animationDuration: '14s' }} />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-stone-100 tracking-wide">
                Dimensional Portal Chamber &amp; Multiverse Network
              </h2>
              <p className="text-xs text-stone-400 font-mono-tabular">
                Current Realm: <span className="text-amber-400 font-bold">{currentDef.name}</span> ·
                Visited: {visitedDimensions.length}/{PORTAL_DESTINATION_ORDER.length} Realms
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-stone-800/80 hover:bg-stone-700 text-stone-300 hover:text-stone-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-3 bg-stone-950/60 border-b border-stone-800/80 text-xs font-mono-tabular text-stone-300 shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Shield className={`w-4 h-4 ${crystalArmorHp > 0 ? 'text-sky-400' : 'text-stone-500'}`} />
              <span>Crystal Armor Shield: <strong className={crystalArmorHp > 0 ? 'text-sky-400' : 'text-stone-400'}>{Math.round(crystalArmorHp)}/150 HP</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Coins className={`w-4 h-4 ${unlockedGildedPaint ? 'text-amber-400' : 'text-stone-500'}`} />
              <span>24K Gilded Paint &amp; Rims: <strong className={unlockedGildedPaint ? 'text-amber-400' : 'text-stone-400'}>{unlockedGildedPaint ? 'UNLOCKED' : 'Locked (Visit Gold Realm)'}</strong></span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-stone-400">Active Portals: {activePortals.length}</span>
            {activePortals.length > 0 && (
              <button
                onClick={onCloseAllPortals}
                className="px-2.5 py-1 rounded-lg bg-red-950/80 hover:bg-red-900 border border-red-700/60 text-red-300 text-[11px] font-semibold transition-colors"
              >
                Close All Portals
              </button>
            )}
          </div>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto survival-scroll p-6 space-y-6">
          {/* Selected target preview banner */}
          <div
            className="rounded-2xl border p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg transition-all"
            style={{
              backgroundColor: `${selectedDef.primaryColor}10`,
              borderColor: `${selectedDef.primaryColor}40`,
            }}
          >
            <div className="flex items-start gap-4">
              <div
                className="p-3.5 rounded-2xl border shadow-inner flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: `${selectedDef.primaryColor}25`,
                  borderColor: `${selectedDef.primaryColor}60`,
                }}
              >
                {getDimensionIcon(selectedDef.id)}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-mono-tabular" style={{ color: selectedDef.primaryColor }}>
                  <span>TARGET CHAMBER</span>
                  <span aria-hidden="true">·</span>
                  <span>{selectedDef.subtitle}</span>
                </div>
                <h3 className="font-display text-xl font-bold text-stone-100">
                  {selectedDef.name}
                </h3>
                <p className="text-xs text-stone-300 max-w-2xl leading-relaxed">
                  {selectedDef.description}
                </p>
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {selectedDef.lootHighlights.map((hl) => (
                    <span
                      key={hl}
                      className="text-[11px] font-mono-tabular px-2.5 py-0.5 rounded-full border bg-stone-950/60"
                      style={{ borderColor: `${selectedDef.primaryColor}40`, color: selectedDef.secondaryColor }}
                    >
                      {hl}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto shrink-0 pt-2 md:pt-0">
              <button
                onClick={() => {
                  onFirePortalGun();
                  onClose();
                }}
                className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                <span>Fire Portal [E]</span>
              </button>
              <button
                onClick={() => {
                  onDirectWarp(selectedDef.id);
                  onClose();
                }}
                className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-100 font-semibold text-xs flex items-center justify-center gap-2 border border-stone-600/70 transition-colors"
              >
                <span>Direct Warp Now</span>
                <ArrowRight className="w-4 h-4 text-stone-400" />
              </button>
            </div>
          </div>

          {/* Section 1: Multi-Dimension Realms */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono-tabular uppercase tracking-wider text-stone-400 font-semibold">
              Multi-Dimension Realms (Unique Physics &amp; Loot)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {realms.map((dimId) => {
                const def = DIMENSION_DEFINITIONS[dimId];
                const isSelected = selectedPortalDimension === dimId;
                const isCurrent = currentDimension === dimId;
                const isVisited = visitedDimensions.includes(dimId);

                return (
                  <div
                    key={dimId}
                    onClick={() => onSelectPortalDimension(dimId)}
                    className={`rounded-2xl border p-4 cursor-pointer transition-all flex flex-col justify-between gap-3 ${
                      isSelected
                        ? 'bg-stone-800/90 shadow-xl ring-2 ring-amber-500/80'
                        : 'bg-stone-950/60 hover:bg-stone-800/60 border-stone-800 hover:border-stone-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div
                          className="p-2.5 rounded-xl border flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: `${def.primaryColor}20`,
                            borderColor: `${def.primaryColor}50`,
                          }}
                        >
                          {getDimensionIcon(dimId)}
                        </div>
                        <div>
                          <div className="text-[10px] font-mono-tabular text-stone-400">
                            {def.subtitle}
                          </div>
                          <h5 className="font-display font-bold text-stone-100 text-sm">
                            {def.name}
                          </h5>
                        </div>
                      </div>
                      {isCurrent && (
                        <span className="text-[10px] font-mono-tabular px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 font-bold">
                          Active
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-stone-300 line-clamp-2 leading-relaxed">
                      {def.description}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-stone-800/80 text-[11px] font-mono-tabular">
                      <span className="text-stone-400">
                        {isVisited ? 'Visited' : 'Unexplored'}
                      </span>
                      <span className="font-semibold text-amber-400">
                        {isSelected ? 'Selected' : 'Click to Load'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Multi-Island Warp Network */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono-tabular uppercase tracking-wider text-stone-400 font-semibold">
              Multi-Island Warp Network (Ocean Archipelago)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {islands.map((dimId) => {
                const def = DIMENSION_DEFINITIONS[dimId];
                const isSelected = selectedPortalDimension === dimId;
                const isCurrent = currentDimension === dimId;
                const isVisited = visitedDimensions.includes(dimId);

                return (
                  <div
                    key={dimId}
                    onClick={() => onSelectPortalDimension(dimId)}
                    className={`rounded-2xl border p-4 cursor-pointer transition-all flex flex-col justify-between gap-3 ${
                      isSelected
                        ? 'bg-stone-800/90 shadow-xl ring-2 ring-amber-500/80'
                        : 'bg-stone-950/60 hover:bg-stone-800/60 border-stone-800 hover:border-stone-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div
                          className="p-2.5 rounded-xl border flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: `${def.primaryColor}20`,
                            borderColor: `${def.primaryColor}50`,
                          }}
                        >
                          {getDimensionIcon(dimId)}
                        </div>
                        <div>
                          <div className="text-[10px] font-mono-tabular text-stone-400">
                            {def.subtitle}
                          </div>
                          <h5 className="font-display font-bold text-stone-100 text-sm">
                            {def.shortName}
                          </h5>
                        </div>
                      </div>
                      {isCurrent && (
                        <span className="text-[10px] font-mono-tabular px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 font-bold">
                          Active
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-stone-300 line-clamp-2 leading-relaxed">
                      {def.description}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-stone-800/80 text-[11px] font-mono-tabular">
                      <span className="text-stone-400">
                        {isVisited ? 'Discovered' : 'Uncharted'}
                      </span>
                      <span className="font-semibold text-amber-400">
                        {isSelected ? 'Selected' : 'Select'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
