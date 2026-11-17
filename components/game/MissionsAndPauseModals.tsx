'use client';

import React from 'react';
import {
  CheckCircle2,
  Circle,
  Eye,
  Gauge,
  Play,
  RotateCcw,
  Save,
  Settings,
  Sliders,
  Sparkles,
  Sun,
  Trash2,
  Trophy,
  Tv,
  Waves,
  X,
  Zap,
} from 'lucide-react';
import { STAGE_1_MISSIONS } from '@/game/data/missions';
import { getPresetSettings } from '@/game/systems/saveManager';
import {
  DrawDistanceTier,
  GameSettings,
  GraphicsPreset,
  HUDStateSnapshot,
  SaveSlotSummary,
  TvSafetyMode,
} from '@/game/types';

export function MissionsModal({
  hud,
  onClose,
}: {
  hud: HUDStateSnapshot;
  onClose: () => void;
}) {
  const ctx = {
    inventory: hud.inventory,
    structures: hud.structures,
    stats: hud.stats,
    visitedBiomes: hud.visitedBiomes,
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-stone-900 border border-stone-700/80 shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800">
          <div className="flex items-center gap-2.5">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="font-display text-lg font-bold text-stone-100">
              Survival Objectives
            </h2>
          </div>
          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200"
            aria-label="Close Missions"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto survival-scroll space-y-3">
          {STAGE_1_MISSIONS.map((m) => {
            const prog = m.checkProgress(ctx);
            const done =
              hud.completedMissionIds.includes(m.id) || prog >= m.targetCount;
            return (
              <div
                key={m.id}
                className={`rounded-xl border p-4 ${
                  done
                    ? 'bg-emerald-950/30 border-emerald-700/60'
                    : 'bg-stone-950/70 border-stone-800'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {done ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <Circle className="w-5 h-5 text-stone-500 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="text-sm font-semibold text-stone-100">
                        {m.title}
                      </div>
                      <p className="text-xs text-stone-300 mt-0.5">
                        {m.description}
                      </p>
                      {m.steps && m.steps.length > 0 && (
                        <div className="mt-2.5 space-y-1">
                          {m.steps.map((step) => {
                            const stepDone = step.done(ctx);
                            return (
                              <div
                                key={step.label}
                                className={`flex items-center gap-2 text-xs ${
                                  stepDone
                                    ? 'text-emerald-300 line-through opacity-80'
                                    : 'text-stone-200'
                                }`}
                              >
                                {stepDone ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                ) : (
                                  <Circle className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                                )}
                                <span>{step.label}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {!done && (
                        <p className="text-xs text-amber-400/90 mt-1.5">
                          Hint: {m.hint}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-mono-tabular font-semibold text-stone-300 shrink-0">
                    {Math.min(prog, m.targetCount)}/{m.targetCount}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const PRESET_CARDS: {
  id: GraphicsPreset;
  title: string;
  subtitle: string;
}[] = [
  { id: 'ultra', title: 'Ultra', subtitle: '60 FPS Desktop' },
  { id: 'balanced', title: 'Balanced', subtitle: '60 FPS Mobile Default' },
  { id: 'performance', title: 'Performance Boost', subtitle: 'Max Battery & FPS' },
];

export function SettingsModal({
  settings,
  onChange,
  onClose,
}: {
  settings: GameSettings;
  onChange: (next: GameSettings) => void;
  onClose: () => void;
}) {
  const activePreset: GraphicsPreset =
    settings.graphicsPreset ??
    (settings.graphicsQuality === 'high' ? 'ultra' : 'balanced');
  const shadowsOn = settings.shadowsEnabled !== false;
  const reflectionsOn = settings.waterReflectionsEnabled !== false;
  const particlesOn = settings.particlesEnabled !== false;
  const autoFpsOn = settings.dynamicAutoFps !== false;
  const drawDist: DrawDistanceTier = settings.drawDistance ?? 'medium';
  const tvSafetyMode: TvSafetyMode = settings.tvSafetyMode ?? 'auto';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-stone-900 border border-stone-700/80 shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h2 className="font-display text-lg font-bold text-stone-100">
              Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200"
            aria-label="Close Settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5 text-sm overflow-y-auto survival-scroll">
          {/* Graphics & 60 FPS Performance Section */}
          <div className="rounded-xl bg-stone-950/75 border border-stone-800 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-emerald-400" />
                <span className="font-display text-sm font-bold text-stone-100">
                  Graphics &amp; 60 FPS
                </span>
              </div>
              <span className="text-[11px] font-medium text-emerald-400">
                Locked 60 FPS Engine
              </span>
            </div>

            <div>
              <div className="text-xs text-stone-300 mb-2">Quality Preset</div>
              <div className="grid grid-cols-3 gap-2">
                {PRESET_CARDS.map((card) => {
                  const selected = activePreset === card.id;
                  return (
                    <button
                      key={card.id}
                      onClick={() => onChange(getPresetSettings(settings, card.id))}
                      className={`min-h-[54px] px-2 py-2 rounded-xl border text-center transition-colors ${
                        selected
                          ? 'bg-amber-600 text-stone-950 border-amber-400'
                          : 'bg-stone-900 hover:bg-stone-800 text-stone-200 border-stone-800'
                      }`}
                    >
                      <div className="text-xs font-bold leading-tight">
                        {card.title}
                      </div>
                      <div
                        className={`text-[10px] mt-0.5 leading-tight ${
                          selected ? 'text-stone-900 font-semibold' : 'text-stone-400'
                        }`}
                      >
                        {card.subtitle}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() =>
                  onChange({ ...settings, shadowsEnabled: !shadowsOn })
                }
                className={`min-h-[44px] px-3 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 ${
                  shadowsOn
                    ? 'bg-amber-600/20 border-amber-500 text-amber-200'
                    : 'bg-stone-900 border-stone-800 text-stone-400'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5 shrink-0" />
                  Shadows
                </span>
                <span>{shadowsOn ? 'On' : 'Off'}</span>
              </button>

              <button
                onClick={() =>
                  onChange({
                    ...settings,
                    waterReflectionsEnabled: !reflectionsOn,
                  })
                }
                className={`min-h-[44px] px-3 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 ${
                  reflectionsOn
                    ? 'bg-amber-600/20 border-amber-500 text-amber-200'
                    : 'bg-stone-900 border-stone-800 text-stone-400'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Waves className="w-3.5 h-3.5 shrink-0" />
                  Water Gloss
                </span>
                <span>{reflectionsOn ? 'On' : 'Off'}</span>
              </button>

              <button
                onClick={() =>
                  onChange({ ...settings, particlesEnabled: !particlesOn })
                }
                className={`min-h-[44px] px-3 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 ${
                  particlesOn
                    ? 'bg-amber-600/20 border-amber-500 text-amber-200'
                    : 'bg-stone-900 border-stone-800 text-stone-400'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  Particles
                </span>
                <span>{particlesOn ? 'On' : 'Off'}</span>
              </button>

              <button
                onClick={() =>
                  onChange({ ...settings, dynamicAutoFps: !autoFpsOn })
                }
                className={`min-h-[44px] px-3 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 ${
                  autoFpsOn
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-200'
                    : 'bg-stone-900 border-stone-800 text-stone-400'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 shrink-0" />
                  Auto-FPS Guard
                </span>
                <span>{autoFpsOn ? 'On' : 'Off'}</span>
              </button>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-xs text-stone-300 mb-1.5">
                <Eye className="w-3.5 h-3.5 text-stone-400" />
                <span>Draw Distance</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ['near', 'Near'],
                    ['medium', 'Medium'],
                    ['far', 'Far'],
                  ] as const
                ).map(([tier, label]) => (
                  <button
                    key={tier}
                    onClick={() => onChange({ ...settings, drawDistance: tier })}
                    className={`min-h-[40px] rounded-xl text-xs font-semibold border ${
                      drawDist === tier
                        ? 'bg-amber-600 text-stone-950 border-amber-400'
                        : 'bg-stone-900 text-stone-300 border-stone-800 hover:bg-stone-800'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-xs text-stone-300 mb-1.5">
                <Tv className="w-3.5 h-3.5 text-sky-400" />
                <span>Smart TV Stability Mode</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ['auto', 'Auto-Protected', '3D TV + Auto Fallback'],
                    ['safe_mini', 'Safe Mini-TV', 'Lowest GPU & RAM'],
                    ['full_3d', 'Full 3D Wall', 'Always 3D Wall TV'],
                  ] as const
                ).map(([mode, title, subtitle]) => {
                  const selected = tvSafetyMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => onChange({ ...settings, tvSafetyMode: mode })}
                      className={`min-h-[50px] px-2 py-1.5 rounded-xl border text-center transition-colors ${
                        selected
                          ? 'bg-sky-500 text-stone-950 border-sky-300'
                          : 'bg-stone-900 text-stone-300 border-stone-800 hover:bg-stone-800'
                      }`}
                    >
                      <div className="text-[11px] font-bold leading-tight">
                        {title}
                      </div>
                      <div
                        className={`text-[9px] mt-0.5 leading-tight ${
                          selected ? 'text-stone-900 font-semibold' : 'text-stone-400'
                        }`}
                      >
                        {subtitle}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs text-stone-300 mb-1.5">
              <span>Master Volume</span>
              <span className="font-mono-tabular">
                {Math.round(settings.masterVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.masterVolume}
              onChange={(e) =>
                onChange({ ...settings, masterVolume: parseFloat(e.target.value) })
              }
              className="w-full accent-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() =>
                onChange({ ...settings, sfxEnabled: !settings.sfxEnabled })
              }
              className={`min-h-[44px] px-3 rounded-xl border text-xs font-semibold ${
                settings.sfxEnabled
                  ? 'bg-amber-600/20 border-amber-500 text-amber-200'
                  : 'bg-stone-950 border-stone-800 text-stone-400'
              }`}
            >
              Sound Effects: {settings.sfxEnabled ? 'On' : 'Off'}
            </button>
            <button
              onClick={() =>
                onChange({
                  ...settings,
                  ambienceEnabled: !settings.ambienceEnabled,
                })
              }
              className={`min-h-[44px] px-3 rounded-xl border text-xs font-semibold ${
                settings.ambienceEnabled
                  ? 'bg-amber-600/20 border-amber-500 text-amber-200'
                  : 'bg-stone-950 border-stone-800 text-stone-400'
              }`}
            >
              Ocean & Wind: {settings.ambienceEnabled ? 'On' : 'Off'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() =>
                onChange({
                  ...settings,
                  showCompass: settings.showCompass === false,
                })
              }
              className={`min-h-[44px] px-3 rounded-xl border text-xs font-semibold ${
                settings.showCompass !== false
                  ? 'bg-amber-600/20 border-amber-500 text-amber-200'
                  : 'bg-stone-950 border-stone-800 text-stone-400'
              }`}
            >
              Compass HUD: {settings.showCompass !== false ? 'On' : 'Off'}
            </button>
            <button
              onClick={() =>
                onChange({ ...settings, compactHud: !settings.compactHud })
              }
              className={`min-h-[44px] px-3 rounded-xl border text-xs font-semibold ${
                settings.compactHud
                  ? 'bg-amber-600/20 border-amber-500 text-amber-200'
                  : 'bg-stone-950 border-stone-800 text-stone-400'
              }`}
            >
              Compact HUD: {settings.compactHud ? 'On' : 'Off'}
            </button>
          </div>

          <div>
            <div className="text-xs text-stone-300 mb-1.5">
              Touchscreen Controls (iPhone / iPad)
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ['auto', 'Auto'],
                  ['always', 'Always On'],
                  ['off', 'Off'],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  onClick={() => onChange({ ...settings, touchControlsMode: mode })}
                  className={`min-h-[44px] rounded-xl text-xs font-semibold border ${
                    settings.touchControlsMode === mode
                      ? 'bg-amber-600 text-stone-950 border-amber-400'
                      : 'bg-stone-950 text-stone-300 border-stone-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs text-stone-300 mb-1.5">
              <span>Camera Sensitivity</span>
              <span className="font-mono-tabular">
                {settings.cameraSensitivity.toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              min={0.5}
              max={2.0}
              step={0.1}
              value={settings.cameraSensitivity}
              onChange={(e) =>
                onChange({
                  ...settings,
                  cameraSensitivity: parseFloat(e.target.value),
                })
              }
              className="w-full accent-amber-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function PauseModal({
  saveSlots,
  onResume,
  onSaveNow,
  onLoadSlot,
  onDeleteSlot,
  onOpenSettings,
  onQuitToMenu,
}: {
  saveSlots: SaveSlotSummary[];
  onResume: () => void;
  onSaveNow: (slotId: string) => void;
  onLoadSlot: (slotId: string) => void;
  onDeleteSlot: (slotId: string) => void;
  onOpenSettings: () => void;
  onQuitToMenu: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-md rounded-2xl bg-stone-900 border border-stone-700/80 shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-800 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-stone-100">
            Expedition Paused
          </h2>
          <button
            onClick={onResume}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200"
            aria-label="Resume"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <button
            onClick={onResume}
            className="w-full min-h-[48px] rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold text-sm flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4" />
            <span>Resume Survival</span>
          </button>

          <button
            onClick={() => onSaveNow('slot_1')}
            className="w-full min-h-[46px] rounded-xl bg-emerald-700 hover:bg-emerald-600 text-stone-50 font-semibold text-sm flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Save Progress</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="w-full min-h-[46px] rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-100 font-semibold text-sm flex items-center justify-center gap-2"
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>

          {saveSlots.length > 0 && (
            <div className="pt-2 border-t border-stone-800 space-y-2">
              <div className="text-xs font-semibold text-stone-400">
                Saved Expeditions
              </div>
              {saveSlots.map((slot) => (
                <div
                  key={slot.slotId}
                  className="flex items-center justify-between gap-2 rounded-xl bg-stone-950/70 border border-stone-800 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-stone-200">
                      Day {slot.dayCount} · HP {slot.health}
                    </div>
                    <div className="text-[11px] text-stone-400 truncate">
                      {new Date(slot.savedAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => onLoadSlot(slot.slotId)}
                      className="min-h-[38px] px-3 rounded-lg bg-stone-800 hover:bg-amber-600 hover:text-stone-950 text-xs font-semibold text-stone-100"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => onDeleteSlot(slot.slotId)}
                      className="min-w-[38px] min-h-[38px] rounded-lg bg-stone-800 hover:bg-red-700 text-stone-300 flex items-center justify-center"
                      aria-label="Delete Save"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={onQuitToMenu}
            className="w-full min-h-[46px] rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-800 text-stone-300 font-semibold text-sm flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Return to Main Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
}
