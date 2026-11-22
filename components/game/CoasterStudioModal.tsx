'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  FileSpreadsheet,
  GitMerge,
  Minus,
  Music,
  Palette,
  Pause,
  Play,
  Plus,
  RollerCoaster,
  RotateCcw,
   ShieldCheck,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from 'lucide-react';
import type { CoasterPiecePresetKey } from '@/game/systems/rollerCoasterRuntime';
import type { CustomInversion } from '@/game/systems/rollerCoasterSystem';
import {
  CoasterHudSummaryItem,
  CoasterModelType,
  CoasterSegmentKind,
  HUDStateSnapshot,
} from '@/game/types';

interface CoasterStudioModalProps {
  hud: HUDStateSnapshot;
  onCreateCoaster: (name?: string, withStation?: boolean) => string | null;
  onDeleteCoaster: (coasterId: string) => void;
  onRenameCoaster: (coasterId: string, nextName: string) => void;
  onSetColor: (coasterId: string, color: string) => void;
  onSetCoasterType: (coasterId: string, coasterType: CoasterModelType) => void;
  onSetCarCount: (coasterId: string, count: number) => void;
  onAppendPiece: (coasterId: string, pieceKey: CoasterPiecePresetKey) => void;
  onAppendInversion: (coasterId: string, settings: CustomInversion) => void;
  onCompleteCircuit?: (coasterId: string) => void;
  onDepumpCoaster?: (coasterId: string) => void;
  onExportCSV?: (coasterId: string) => string;
  onImportCSV?: (coasterId: string, csvText: string) => void;
  onCreateDemoCoaster?: (demoName: string, coasterType: CoasterModelType) => string | null;
  onAddNodeAhead: (coasterId: string) => void;
  onUpdateNode: (
    coasterId: string,
    index: number,
    patch: {
      x?: number;
      y?: number;
      z?: number;
      bank?: number;
      segmentType?: CoasterSegmentKind;
    },
  ) => void;
  onRemoveNode: (coasterId: string, index: number) => void;
  onToggleDispatch: (coasterId: string, running?: boolean) => void;
  onResetTrain: (coasterId: string) => void;
  onBoardRide: (coasterId: string) => void;
  onOpenMusicStudio?: () => void;
  onClose: () => void;
}

const COLOR_SWATCHES = [
  '#ef4444',
  '#38bdf8',
  '#f59e0b',
  '#a855f7',
  '#10b981',
  '#ec4899',
];

const COASTER_CATALOG_TYPES: {
  type: CoasterModelType;
  label: string;
  detail: string;
  priceTag: string;
}[] = [
  { type: 'sit_down', label: 'Sit-Down Coaster', detail: 'Versatile steel base model', priceTag: 'Free Base' },
  { type: 'tilt', label: 'Tilt Coaster', detail: 'Holding brake & 90-degree vertical drop', priceTag: 'Pro' },
  { type: 'single_rail', label: 'Single-Rail Coaster (RMC Raptor)', detail: 'Agile monorail twisting thrill', priceTag: 'Pro' },
  { type: 'hybrid_classic', label: 'Hybrid Coaster (Classic)', detail: 'Wood support structure + steel I-beam track', priceTag: 'Pro' },
  { type: 'hybrid_modern', label: 'Hybrid Coaster (Modern)', detail: 'Smooth multi-inversion hybrid layout', priceTag: 'Pro' },
  { type: 'wood_3row', label: 'Wood (3-Row) Coaster', detail: 'Heavy timber bent lattice & classic rattle', priceTag: 'Pro' },
  { type: 'classic_hyper', label: 'Classic Hyper (3-Row)', detail: 'Towering airtime hills & immense speed', priceTag: 'Pro' },
  { type: 'twister_hyper', label: 'Twister Hyper Coaster', detail: 'High-speed directional turns & helixes', priceTag: 'Pro' },
  { type: 'twister_hyper_staggered', label: 'Twister Hyper (Staggered)', detail: 'Staggered seating hyper coaster', priceTag: 'Pro' },
  { type: 'twister_dive', label: 'Twister Dive Coaster (10-Across)', detail: 'Wide body 90° hold & plunging drop', priceTag: 'Pro' },
  { type: 'twister_invert', label: 'Twister Invert Coaster', detail: 'Suspended seats tracking below box-spine', priceTag: 'Pro' },
  { type: 'twister_wing', label: 'Twister Wing Coaster', detail: 'Seating outboard of track rails', priceTag: 'Pro' },
  { type: 'lay_down', label: 'Lay Down Coaster (Flying)', detail: 'Prone face-down flying harness', priceTag: 'Pro' },
  { type: 'classic_corkscrew', label: 'Classic Corkscrew (Arrow Looper)', detail: 'Vintage multi-corkscrew loops', priceTag: 'Pro' },
  { type: 'blitz_lapbar', label: 'Blitz (Lapbar) Coaster', detail: 'Intense LSM launches & snappy transitions', priceTag: 'Pro' },
  { type: 'blitz_wide', label: 'Blitz (Wide) Coaster', detail: 'Extended wide-train blitz coaster', priceTag: 'Pro' },
  { type: 'air_launch_classic', label: 'Air Launch (Classic)', detail: 'Pneumatic hydraulic launch system', priceTag: 'Pro' },
  { type: 'air_launch_modern', label: 'Air Launch (Modern)', detail: 'Next-gen high acceleration launch', priceTag: 'Pro' },
  { type: 'air_launch_wide', label: 'Air Launch (Wide)', detail: 'Wide-body air launch coaster', priceTag: 'Pro' },
  { type: 'rocket_lapbar', label: 'Rocket (Lapbar) Coaster', detail: 'Top-hat tower & hydraulic surge', priceTag: 'Pro' },
  { type: 'rocket_otsr', label: 'Rocket (OTSR) Coaster', detail: 'Over-the-shoulder restraint rocket coaster', priceTag: 'Pro' },
  { type: 'sky_launch', label: 'Sky Launch (Premier Rides)', detail: 'Vertical spike shuttle launch coaster', priceTag: 'Pro' },
  { type: 'wooden', label: 'Wooden Coaster (Bent)', detail: 'Traditional timber coaster bents', priceTag: 'Free' },
  { type: 'steel', label: 'B&M Steel Hyper', detail: 'Tubular box-spine mega coaster', priceTag: 'Free' },
  { type: 'inverted', label: 'B&M Inverted', detail: 'Suspended inverted train', priceTag: 'Free' },
  { type: 'flying', label: 'Flying Coaster', detail: 'Prone flyer chassis', priceTag: 'Free' },
  { type: 'standup', label: 'Stand-Up Coaster', detail: 'Standing bicycle saddle seats', priceTag: 'Free' },
  { type: 'log_flume', label: 'Water Log Flume', detail: 'Hydrodynamic water channel & log boats', priceTag: 'Free' },
];

const DEMO_COASTERS = [
  { name: 'Speed-Racer', type: 'air_launch_modern' as CoasterModelType },
  { name: 'Boltin', type: 'classic_hyper' as CoasterModelType },
  { name: 'Monster', type: 'single_rail' as CoasterModelType },
  { name: 'Vortex', type: 'classic_corkscrew' as CoasterModelType },
  { name: 'Wildcat', type: 'sky_launch' as CoasterModelType },
  { name: 'Kumba-inspired Demo', type: 'twister_invert' as CoasterModelType },
];

const PIECE_PRESETS: {
  key: CoasterPiecePresetKey;
  label: string;
  detail: string;
}[] = [
  { key: 'chainLift', label: 'Chain Lift Hill', detail: '+26m climb · anti-rollback dogs' },
  { key: 'firstDrop', label: 'First Drop', detail: '-20m · steep crest pull-out' },
  { key: 'hill', label: 'Airtime Camelback', detail: '+11m floater parabola' },
  { key: 'launch', label: 'LSM Launch Track', detail: 'Linear stator boost · 108 km/h' },
  { key: 'bankedTurn', label: 'Banked Turn Right', detail: '90° curve · 52° heartline bank' },
  { key: 'bankedTurnLeft', label: 'Banked Turn Left', detail: '90° curve · -52° heartline bank' },
  { key: 'helix', label: 'Banked Helix', detail: '360° descending spiral' },
  { key: 'verticalLoop', label: 'Clothoid Vertical Loop', detail: 'Teardrop 360° inversion' },
  { key: 'corkscrew', label: 'Corkscrew', detail: '360° helical flat spin' },
  { key: 'zeroGRoll', label: 'Zero-G Barrel Roll', detail: 'Weightless inline twist' },
  { key: 'immelmann', label: 'Immelmann Loop', detail: '180° half-loop + roll-out' },
  { key: 'brake', label: 'Magnetic Brake Run', detail: 'Eddy-current trim block' },
  { key: 'splashdown', label: 'Splashdown Trough', detail: 'Hydrodynamic water scoop' },
  { key: 'straight', label: 'Straight Block', detail: '18m level tangent run' },
];

const SEGMENT_KIND_OPTIONS: { value: CoasterSegmentKind; label: string }[] = [
  { value: 'station', label: 'Load Station' },
  { value: 'chain_lift', label: 'Chain Lift' },
  { value: 'lsm_launch', label: 'LSM Launch' },
  { value: 'coast', label: 'Gravity Coast' },
  { value: 'inversion', label: 'Inversion' },
  { value: 'trim_brake', label: 'Trim Brakes' },
  { value: 'block_brake', label: 'Block Brake' },
  { value: 'splashdown', label: 'Splashdown' },
];

export function CoasterStudioModal({
  hud,
  onCreateCoaster,
  onDeleteCoaster,
  onRenameCoaster,
  onSetColor,
  onSetCoasterType,
  onSetCarCount,
  onAppendPiece,
  onAppendInversion,
  onCompleteCircuit,
  onDepumpCoaster,
  onExportCSV,
  onImportCSV,
  onCreateDemoCoaster,
  onAddNodeAhead,
  onUpdateNode,
  onRemoveNode,
  onToggleDispatch,
  onResetTrain,
  onBoardRide,
  onOpenMusicStudio,
  onClose,
}: CoasterStudioModalProps) {
  const coasters: CoasterHudSummaryItem[] = hud.coasters ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(
    coasters[0]?.id ?? null,
  );
  const [editingDraft, setEditingDraft] = useState<{
    id: string;
    value: string;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<'pieces' | 'catalog' | 'inversions' | 'nodes' | 'tools'>(
    'pieces',
  );
  const [invName, setInvName] = useState('Zero-G Barrel Roll');
  const [invHeight, setInvHeight] = useState(14);
  const [invWidth, setInvWidth] = useState(7);
  const [invRotations, setInvRotations] = useState(1);
  const [invLength, setInvLength] = useState(32);
  const [invTwist, setInvTwist] = useState(180);
  const [invBank, setInvBank] = useState(0);
  const [csvTextOutput, setCsvTextOutput] = useState('');
  const [csvTextInput, setCsvTextInput] = useState('');

  const selected: CoasterHudSummaryItem | null =
    coasters.find((c) => c.id === selectedId) ?? coasters[0] ?? null;

  const nameDraft =
    selected && editingDraft?.id === selected.id
      ? editingDraft.value
      : (selected?.name ?? '');

  const handleCreate = () => {
    const newId = onCreateCoaster(
      `Coaster #${coasters.length + 1}`,
      true,
    );
    if (newId) {
      setSelectedId(newId);
      setEditingDraft(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-5">
      <div className="w-full max-w-4xl rounded-2xl bg-stone-900 border border-stone-700/85 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800 gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <RollerCoaster className="w-5 h-5 text-sky-400 shrink-0" />
            <div className="min-w-0">
              <h2 className="font-display text-base sm:text-lg font-bold text-stone-100 truncate">
                Ultimate Coaster 3 <span className="text-xs text-sky-400 font-mono">v1.0.31</span>
                <span className="text-stone-400 font-normal text-xs ml-2 hidden sm:inline">by Jason Hu / Phony Studios</span>
              </h2>
              <p className="text-xs text-stone-400 truncate">
                22+ Coaster Catalog, NURBS Spline Depump, CSV Tools &amp; Anti-Collision Block Safety.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href="/coaster-studio"
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[40px] px-3 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/50 text-amber-200 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0"
              title="Open the standalone flat-world coaster construction studio"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Standalone Studio</span>
            </a>
            {onOpenMusicStudio && (
              <button
                type="button"
                onClick={onOpenMusicStudio}
                className="min-h-[40px] px-3 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-amber-300 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Music className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Music Pro</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleCreate}
              className="min-h-[40px] px-3.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-stone-950 font-bold text-xs flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>New Station &amp; Coaster</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 shrink-0"
              aria-label="Close Coaster Studio"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Coaster Tabs */}
        {coasters.length > 0 && (
          <div className="px-5 py-2.5 bg-stone-950/75 border-b border-stone-800 flex items-center gap-2 overflow-x-auto survival-scroll">
            {coasters.map((c) => {
              const active = selected?.id === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  className={`min-h-[36px] px-3 rounded-xl border text-xs font-semibold flex items-center gap-2 whitespace-nowrap shrink-0 transition ${
                    active
                      ? 'bg-sky-950/80 border-sky-400 text-sky-200'
                      : 'bg-stone-900 border-stone-800 text-stone-300 hover:border-stone-600'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: c.trackColor }}
                  />
                  <span>{c.name}</span>
                  <span className="font-mono-tabular text-[10px] opacity-80">
                    {Math.round(c.trackLengthM)}m
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Body */}
        <div className="p-5 overflow-y-auto survival-scroll space-y-5">
          {!selected ? (
            <div className="space-y-6">
              <div className="rounded-2xl bg-stone-950/80 border border-stone-800 p-8 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-sky-500/15 border border-sky-500/40 flex items-center justify-center mx-auto text-sky-300">
                  <RollerCoaster className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-display text-base font-bold text-stone-100">
                    No Roller Coasters Built Yet
                  </h3>
                  <p className="text-xs text-stone-400 max-w-md mx-auto">
                    Spawn a fresh station or load one of the real-world inspired demo coasters below!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCreate}
                  className="min-h-[46px] px-5 rounded-xl bg-sky-500 hover:bg-sky-400 text-stone-950 font-bold text-sm inline-flex items-center gap-2 whitespace-nowrap shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Build First Coaster Here</span>
                </button>
              </div>

              {/* Demo Coasters Presets */}
              {onCreateDemoCoaster && (
                <div className="rounded-2xl bg-stone-950/80 border border-stone-800 p-4 space-y-3">
                  <div className="text-xs font-bold text-stone-200 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Pre-Built Demo Coasters (Real-Life Inspirations)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {DEMO_COASTERS.map((demo) => (
                      <button
                        key={demo.name}
                        type="button"
                        onClick={() => {
                          const newId = onCreateDemoCoaster(demo.name, demo.type);
                          if (newId) setSelectedId(newId);
                        }}
                        className="p-3 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-800 hover:border-amber-500/60 text-left transition flex items-center justify-between gap-2"
                      >
                        <div>
                          <div className="text-xs font-bold text-stone-100">{demo.name}</div>
                          <div className="text-[10px] text-stone-400">{demo.type.replace(/_/g, ' ')}</div>
                        </div>
                        <Plus className="w-4 h-4 text-amber-400 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Selected Coaster Metadata & Dispatch Console */}
              <div className="rounded-xl bg-stone-950/80 border border-stone-800 p-4 space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <input
                      type="text"
                      maxLength={36}
                      value={nameDraft}
                      onChange={(e) =>
                        setEditingDraft({ id: selected.id, value: e.target.value })
                      }
                      onBlur={() => {
                        const trimmed = nameDraft.trim();
                        if (trimmed && trimmed !== selected.name) {
                          onRenameCoaster(selected.id, trimmed);
                        }
                        setEditingDraft(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const trimmed = nameDraft.trim();
                          if (trimmed && trimmed !== selected.name) {
                            onRenameCoaster(selected.id, trimmed);
                          }
                          setEditingDraft(null);
                        }
                      }}
                      className="flex-1 min-h-[38px] px-3 rounded-lg bg-stone-900 border border-stone-700 focus:border-sky-400 focus:outline-none text-sm font-semibold text-stone-100"
                    />
                    <button
                      type="button"
                      onClick={() => onDeleteCoaster(selected.id)}
                      className="min-w-[38px] min-h-[38px] rounded-lg bg-stone-900 hover:bg-red-700 border border-stone-700 text-stone-300 flex items-center justify-center shrink-0"
                      aria-label="Delete Coaster"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Rail Color & Consist Length */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-stone-400" />
                      {COLOR_SWATCHES.map((col) => (
                        <button
                          key={col}
                          type="button"
                          onClick={() => onSetColor(selected.id, col)}
                          style={{ backgroundColor: col }}
                          aria-label={`Rail color ${col}`}
                          className={`w-6 h-6 rounded-full border-2 transition ${
                            selected.trackColor === col
                              ? 'border-white scale-110'
                              : 'border-stone-800 opacity-75 hover:opacity-100'
                          }`}
                        />
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5 bg-stone-900 border border-stone-800 rounded-lg px-2 py-1 text-xs">
                      <span className="text-stone-400">Cars:</span>
                      <button
                        type="button"
                        onClick={() =>
                          onSetCarCount(
                            selected.id,
                            Math.max(1, selected.trainCarCount - 1),
                          )
                        }
                        className="w-6 h-6 rounded bg-stone-800 hover:bg-stone-700 flex items-center justify-center"
                        aria-label="Decrease train cars"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-mono-tabular font-bold w-5 text-center text-stone-100">
                        {selected.trainCarCount}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          onSetCarCount(
                            selected.id,
                            Math.min(8, selected.trainCarCount + 1),
                          )
                        }
                        className="w-6 h-6 rounded bg-stone-800 hover:bg-stone-700 flex items-center justify-center"
                        aria-label="Increase train cars"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Live Telemetry & Anti-Collision Block Safety Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-800/80">
                  <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs font-mono-tabular text-stone-300">
                    <span>Length: {Math.round(selected.trackLengthM)}m</span>
                    <span>Apex: {(selected.maxHeightM ?? 0).toFixed(1)}m</span>
                    <span>Est. Peak: {selected.estPeakSpeedKmh ?? 0} km/h</span>
                    <span>Type: <strong className="text-sky-300 uppercase">{selected.coasterType ?? 'sit_down'}</strong></span>
                    <span>
                      Live: {Math.round(selected.speedKmh)} km/h · {(selected.verticalG ?? 1).toFixed(1)}G
                    </span>
                    <span className="text-emerald-400 flex items-center gap-1 font-sans font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Anti-Collision Block Safe
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {onCompleteCircuit && !selected.isCompleteCircuit && (
                      <button
                        type="button"
                        onClick={() => onCompleteCircuit(selected.id)}
                        className="min-h-[38px] px-3 rounded-xl bg-stone-800 hover:bg-sky-900/70 border border-sky-500/40 text-sky-200 font-semibold text-xs flex items-center gap-1.5 whitespace-nowrap shrink-0"
                      >
                        <GitMerge className="w-3.5 h-3.5" />
                        <span>Complete Circuit</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        onToggleDispatch(selected.id, !selected.running)
                      }
                      className={`min-h-[38px] px-3.5 rounded-xl font-bold text-xs flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                        selected.running
                          ? 'bg-amber-600 hover:bg-amber-500 text-stone-950'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-stone-950'
                      }`}
                    >
                      {selected.running ? (
                        <>
                          <Pause className="w-3.5 h-3.5" />
                          <span>E-Stop Brake</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          <span>Dispatch Train</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => onResetTrain(selected.id)}
                      className="min-h-[38px] px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold text-xs flex items-center gap-1.5 whitespace-nowrap shrink-0"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Return to Station</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onBoardRide(selected.id);
                        onClose();
                      }}
                      className="min-h-[38px] px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-stone-950 font-bold text-xs flex items-center gap-1.5 whitespace-nowrap shrink-0"
                    >
                      <RollerCoaster className="w-4 h-4" />
                      <span>Board Front Row (POV)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Editor Tabs */}
              <div className="flex items-center gap-2 border-b border-stone-800 pb-2">
                {(
                  [
                    ['pieces', 'Track Blocks'],
                    ['catalog', '22+ Coaster Catalog'],
                    ['inversions', 'Custom Inversions'],
                    ['tools', 'Depump & CSV Tools'],
                    ['nodes', `Spline Nodes (${selected.nodeCount})`],
                  ] as const
                ).map(([tabKey, label]) => (
                  <button
                    key={tabKey}
                    type="button"
                    onClick={() => setActiveTab(tabKey)}
                    className={`min-h-[38px] px-3.5 rounded-xl text-xs font-bold border transition whitespace-nowrap shrink-0 ${
                      activeTab === tabKey
                        ? 'bg-sky-500 border-sky-300 text-stone-950'
                        : 'bg-stone-950 border-stone-800 text-stone-300 hover:bg-stone-800'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              {activeTab === 'pieces' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {PIECE_PRESETS.map((piece) => (
                    <button
                      key={piece.key}
                      type="button"
                      onClick={() => onAppendPiece(selected.id, piece.key)}
                      className="p-3 rounded-xl bg-stone-950/80 hover:bg-stone-800 border border-stone-800 hover:border-sky-400/70 text-left transition flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-stone-100">
                          {piece.label}
                        </div>
                        <div className="text-[11px] text-stone-400">
                          {piece.detail}
                        </div>
                      </div>
                      <Plus className="w-4 h-4 text-sky-400 shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {activeTab === 'catalog' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {COASTER_CATALOG_TYPES.map((cat) => {
                    const isSelected = (selected.coasterType || 'sit_down') === cat.type;
                    return (
                      <button
                        key={cat.type}
                        type="button"
                        onClick={() => onSetCoasterType(selected.id, cat.type)}
                        className={`p-4 rounded-xl border text-left transition flex flex-col justify-between gap-3 ${
                          isSelected
                            ? 'bg-sky-950/85 border-sky-400 text-sky-100 shadow-lg'
                            : 'bg-stone-950/80 border-stone-800 text-stone-300 hover:border-stone-600'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold flex items-center justify-between gap-2">
                            <span>{cat.label}</span>
                            <span className="text-[10px] font-mono-tabular px-2 py-0.5 rounded bg-stone-800 text-amber-300">
                              {cat.priceTag}
                            </span>
                          </div>
                          <div className="text-[11px] text-stone-400 mt-1">
                            {cat.detail}
                          </div>
                        </div>
                        {isSelected && (
                          <div className="text-[10px] font-mono-tabular uppercase tracking-wider text-sky-300 flex items-center gap-1 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Active Track Catalog
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {activeTab === 'tools' && (
                <div className="rounded-xl bg-stone-950/80 border border-stone-800 p-4 space-y-5">
                  {/* Depump Tool */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-stone-800">
                    <div>
                      <div className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                        <Wand2 className="w-4 h-4" />
                        <span>Depump NURBS Control Point Smoother</span>
                      </div>
                      <p className="text-[11px] text-stone-400 mt-0.5">
                        Instantly smooth out sharp jitter bumps across your track control points using Laplacian curve smoothing.
                      </p>
                    </div>
                    {onDepumpCoaster && (
                      <button
                        type="button"
                        onClick={() => onDepumpCoaster(selected.id)}
                        className="min-h-[40px] px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-stone-950 font-bold text-xs flex items-center gap-1.5 whitespace-nowrap shrink-0"
                      >
                        <Wand2 className="w-4 h-4" />
                        <span>Depump / Smooth Spline</span>
                      </button>
                    )}
                  </div>

                  {/* CSV Export & Import */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-2">
                      <span className="text-stone-300 font-semibold flex items-center gap-1.5">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Export Track Shape to CSV</span>
                      </span>
                      <textarea
                        readOnly
                        value={csvTextOutput || 'Click Export to generate raw CSV track points.'}
                        className="w-full h-28 rounded-lg bg-stone-900 border border-stone-700 p-2.5 font-mono text-[11px] text-stone-300 select-all"
                      />
                      {onExportCSV && (
                        <button
                          type="button"
                          onClick={() => {
                            const csv = onExportCSV(selected.id);
                            setCsvTextOutput(csv);
                          }}
                          className="min-h-[36px] px-3.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold text-xs"
                        >
                          Generate CSV Text
                        </button>
                      )}
                    </div>

                    <div className="space-y-2">
                      <span className="text-stone-300 font-semibold flex items-center gap-1.5">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Import Track Shape from CSV</span>
                      </span>
                      <textarea
                        placeholder="Paste raw CSV track data (x,y,z,bank,segmentType) here..."
                        value={csvTextInput}
                        onChange={(e) => setCsvTextInput(e.target.value)}
                        className="w-full h-28 rounded-lg bg-stone-900 border border-stone-700 p-2.5 font-mono text-[11px] text-stone-300 focus:outline-none focus:border-sky-400"
                      />
                      {onImportCSV && (
                        <button
                          type="button"
                          onClick={() => {
                            if (csvTextInput.trim()) {
                              onImportCSV(selected.id, csvTextInput);
                              setCsvTextInput('');
                            }
                          }}
                          className="min-h-[36px] px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-bold text-xs"
                        >
                          Import &amp; Rebuild Track
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'inversions' && (
                <div className="rounded-xl bg-stone-950/80 border border-stone-800 p-4 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4" />
                        <span>Custom Inversion Designer</span>
                      </div>
                      <p className="text-[11px] text-stone-400 mt-0.5">
                        Sculpt custom loops, zero-G rolls, and banked corkscrews onto the end of your coaster.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onAppendInversion(selected.id, {
                          name: invName.trim() || 'Custom Inversion',
                          height: invHeight,
                          width: invWidth,
                          rotations: invRotations,
                          length: invLength,
                          twist: invTwist,
                          bank: invBank,
                        })
                      }
                      className="min-h-[40px] px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-stone-950 font-bold text-xs flex items-center gap-1.5 whitespace-nowrap shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Custom Inversion</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                    <label className="space-y-1 sm:col-span-2 lg:col-span-3">
                      <span className="text-stone-300 font-semibold">
                        Element Name
                      </span>
                      <input
                        type="text"
                        value={invName}
                        onChange={(e) => setInvName(e.target.value)}
                        className="w-full min-h-[38px] px-3 rounded-lg bg-stone-900 border border-stone-700 text-stone-100"
                      />
                    </label>

                    <label className="space-y-1">
                      <span className="flex justify-between text-stone-300">
                        <span>Height</span>
                        <span className="font-mono-tabular text-sky-300">
                          {invHeight}m
                        </span>
                      </span>
                      <input
                        type="range"
                        min={6}
                        max={36}
                        value={invHeight}
                        onChange={(e) => setInvHeight(Number(e.target.value))}
                        className="w-full accent-sky-400"
                      />
                    </label>

                    <label className="space-y-1">
                      <span className="flex justify-between text-stone-300">
                        <span>Width Offset</span>
                        <span className="font-mono-tabular text-sky-300">
                          {invWidth}m
                        </span>
                      </span>
                      <input
                        type="range"
                        min={2}
                        max={22}
                        value={invWidth}
                        onChange={(e) => setInvWidth(Number(e.target.value))}
                        className="w-full accent-sky-400"
                      />
                    </label>

                    <label className="space-y-1">
                      <span className="flex justify-between text-stone-300">
                        <span>Span Length</span>
                        <span className="font-mono-tabular text-sky-300">
                          {invLength}m
                        </span>
                      </span>
                      <input
                        type="range"
                        min={16}
                        max={64}
                        value={invLength}
                        onChange={(e) => setInvLength(Number(e.target.value))}
                        className="w-full accent-sky-400"
                      />
                    </label>

                    <label className="space-y-1">
                      <span className="flex justify-between text-stone-300">
                        <span>Rotations</span>
                        <span className="font-mono-tabular text-sky-300">
                          {invRotations}
                        </span>
                      </span>
                      <input
                        type="range"
                        min={1}
                        max={3}
                        step={1}
                        value={invRotations}
                        onChange={(e) => setInvRotations(Number(e.target.value))}
                        className="w-full accent-sky-400"
                      />
                    </label>

                    <label className="space-y-1">
                      <span className="flex justify-between text-stone-300">
                        <span>Roll Twist</span>
                        <span className="font-mono-tabular text-sky-300">
                          {invTwist}°
                        </span>
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={360}
                        step={15}
                        value={invTwist}
                        onChange={(e) => setInvTwist(Number(e.target.value))}
                        className="w-full accent-sky-400"
                      />
                    </label>

                    <label className="space-y-1">
                      <span className="flex justify-between text-stone-300">
                        <span>Exit Bank</span>
                        <span className="font-mono-tabular text-sky-300">
                          {invBank}°
                        </span>
                      </span>
                      <input
                        type="range"
                        min={-75}
                        max={75}
                        step={5}
                        value={invBank}
                        onChange={(e) => setInvBank(Number(e.target.value))}
                        className="w-full accent-sky-400"
                      />
                    </label>
                  </div>
                </div>
              )}

              {activeTab === 'nodes' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-stone-300">
                      Fine-tune spline node coordinates &amp; banking angles, or extend track along your camera direction.
                    </span>
                    <button
                      type="button"
                      onClick={() => onAddNodeAhead(selected.id)}
                      className="min-h-[36px] px-3 rounded-lg bg-sky-500 hover:bg-sky-400 text-stone-950 font-bold text-xs flex items-center gap-1 whitespace-nowrap shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Node Ahead</span>
                    </button>
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto survival-scroll pr-1">
                    {selected.nodes.map((node, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl bg-stone-950/80 border border-stone-800 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs font-mono-tabular"
                      >
                        <span className="font-bold text-sky-300 w-9">
                          #{idx + 1}
                        </span>
                        <div className="flex flex-wrap items-center gap-2.5 text-stone-200">
                          <div className="flex items-center gap-1">
                            <span className="text-stone-400">Elev</span>
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateNode(selected.id, idx, {
                                  y: node.position.y - 2,
                                })
                              }
                              className="w-6 h-6 rounded bg-stone-800 hover:bg-stone-700"
                            >
                              -
                            </button>
                            <span className="w-11 text-center">
                              {node.position.y.toFixed(1)}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateNode(selected.id, idx, {
                                  y: node.position.y + 2,
                                })
                              }
                              className="w-6 h-6 rounded bg-stone-800 hover:bg-stone-700"
                            >
                              +
                            </button>
                          </div>

                          <div className="flex items-center gap-1">
                            <span className="text-stone-400">Bank</span>
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateNode(selected.id, idx, {
                                  bank: node.bank - 15,
                                })
                              }
                              className="w-6 h-6 rounded bg-stone-800 hover:bg-stone-700"
                            >
                              -
                            </button>
                            <span className="w-11 text-center">
                              {Math.round(node.bank)}°
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateNode(selected.id, idx, {
                                  bank: node.bank + 15,
                                })
                              }
                              className="w-6 h-6 rounded bg-stone-800 hover:bg-stone-700"
                            >
                              +
                            </button>
                          </div>

                          <select
                            value={node.segmentType ?? 'coast'}
                            onChange={(e) =>
                              onUpdateNode(selected.id, idx, {
                                segmentType: e.target.value as CoasterSegmentKind,
                              })
                            }
                            className="bg-stone-900 border border-stone-700 rounded px-1.5 py-1 text-[11px] font-sans text-stone-200"
                            aria-label={`Block type for node ${idx + 1}`}
                          >
                            {SEGMENT_KIND_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>

                          <span className="text-[11px] text-stone-400">
                            ({Math.round(node.position.x)},{' '}
                            {Math.round(node.position.z)})
                          </span>
                        </div>

                        <button
                          type="button"
                          disabled={selected.nodes.length <= 2}
                          onClick={() => onRemoveNode(selected.id, idx)}
                          className="min-w-[30px] min-h-[30px] rounded bg-stone-800 hover:bg-red-700 disabled:opacity-40 text-stone-300 flex items-center justify-center"
                          aria-label={`Remove node ${idx + 1}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
