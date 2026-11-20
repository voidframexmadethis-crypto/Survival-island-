'use client';

import React, { useState } from 'react';
import {
  Box,
  Check,
  Code2,
  Copy,
  Download,
  Play,
  RotateCcw,
  Share2,
  Sliders,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  CustomModAsset,
  CustomModScript,
  ModExportBundle,
  ModGameplayTweaks,
  ModSystemSnapshot,
} from '@/game/types';
import { DEFAULT_MOD_TWEAKS, STARTER_MOD_PRESETS } from '@/game/systems/modManager';

interface ModManagerModalProps {
  modState?: ModSystemSnapshot;
  onSetTweaks: (partial: Partial<ModGameplayTweaks>) => void;
  onResetTweaks: () => void;
  onImportModelFile: (file: File) => Promise<CustomModAsset>;
  onImportModelUrl: (url: string) => Promise<CustomModAsset>;
  onUpdateAssetTransform: (assetId: string, patch: { scale?: number; rotationY?: number }) => void;
  onRemoveAsset: (assetId: string) => void;
  onLoadScriptUrl: (url: string, name?: string) => Promise<CustomModScript>;
  onAddScript: (name: string, code: string) => CustomModScript;
  onToggleScript: (scriptId: string, enabled: boolean) => void;
  onRemoveScript: (scriptId: string) => void;
  onExportBundle: () => ModExportBundle | undefined;
  onImportBundle: (bundle: ModExportBundle) => void;
  onClose: () => void;
}

export const ModManagerModal: React.FC<ModManagerModalProps> = ({
  modState,
  onSetTweaks,
  onResetTweaks,
  onImportModelFile,
  onImportModelUrl,
  onUpdateAssetTransform,
  onRemoveAsset,
  onLoadScriptUrl,
  onAddScript,
  onToggleScript,
  onRemoveScript,
  onExportBundle,
  onImportBundle,
  onClose,
}) => {
  const [tab, setTab] = useState<'tweaks' | 'assets' | 'scripts' | 'share'>('tweaks');
  const [modelUrl, setModelUrl] = useState('');
  const [scriptUrl, setScriptUrl] = useState('');
  const [scriptName, setScriptName] = useState('Custom Island Mod');
  const [scriptCode, setScriptCode] = useState(
    `// Available helpers: api.setTweaks({...}), api.toast(msg), api.giveItem(id, qty), api.setWeather('clear'|'rain'|'storm')\napi.setTweaks({ jumpMultiplier: 1.5, damageMultiplier: 1.5 });\napi.toast('Custom Super-Jump Mod active!');`,
  );
  const [importJsonText, setImportJsonText] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [copiedBundle, setCopiedBundle] = useState(false);

  const tweaks = modState?.tweaks ?? DEFAULT_MOD_TWEAKS;
  const assets = modState?.assets ?? [];
  const scripts = modState?.scripts ?? [];

  const handleModelFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatusMsg(`Loading 3D model ${file.name}...`);
    try {
      await onImportModelFile(file);
      setStatusMsg(`Spawned "${file.name}" right in front of you!`);
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Failed to parse 3D file');
    }
    e.target.value = '';
  };

  const handleModelUrlLoad = async () => {
    if (!modelUrl.trim()) return;
    setStatusMsg('Fetching 3D model URL...');
    try {
      await onImportModelUrl(modelUrl);
      setModelUrl('');
      setStatusMsg('Spawned remote 3D model in front of you!');
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Failed to load remote 3D asset');
    }
  };

  const handleLoadScriptUrl = async () => {
    if (!scriptUrl.trim()) return;
    setStatusMsg('Fetching mod script URL...');
    try {
      await onLoadScriptUrl(scriptUrl);
      setScriptUrl('');
      setStatusMsg('Mod script loaded and executed!');
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Failed to fetch mod script URL');
    }
  };

  const handleDownloadBundle = () => {
    const bundle = onExportBundle();
    if (!bundle) return;
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `survival-island-mod-bundle-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMsg('Downloaded Mod & Build bundle (.json)');
  };

  const handleCopyBundle = () => {
    const bundle = onExportBundle();
    if (!bundle) return;
    navigator.clipboard?.writeText(JSON.stringify(bundle)).catch(() => {});
    setCopiedBundle(true);
    window.setTimeout(() => setCopiedBundle(false), 1800);
  };

  const handleBundleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const txt = await file.text();
      const parsed = JSON.parse(txt) as ModExportBundle;
      onImportBundle(parsed);
      setStatusMsg('Imported friend Mod & Build bundle!');
    } catch {
      setStatusMsg('Invalid bundle JSON file');
    }
    e.target.value = '';
  };

  const handleImportTextBundle = () => {
    try {
      const parsed = JSON.parse(importJsonText) as ModExportBundle;
      onImportBundle(parsed);
      setImportJsonText('');
      setStatusMsg('Imported Mod & Build bundle from text!');
    } catch {
      setStatusMsg('Invalid JSON bundle text');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-4xl bg-stone-900 border border-emerald-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-stone-950 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-display text-stone-100">
                In-Game Mod Manager &amp; 3D Asset Importer
              </h2>
              <p className="text-xs text-stone-400">
                Tune gameplay physics, import GLB/GLTF/OBJ 3D models, run script mods &amp; share builds
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300"
            aria-label="Close mod manager"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-stone-800 bg-stone-950/50 px-6 pt-2 gap-4 overflow-x-auto">
          {[
            { id: 'tweaks', label: 'Gameplay Values', icon: Sliders },
            { id: 'assets', label: `3D Model Importer (${assets.length})`, icon: Box },
            { id: 'scripts', label: `Custom Scripts (${scripts.length})`, icon: Code2 },
            { id: 'share', label: 'Export & Share Builds', icon: Share2 },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                type="button"
                key={t.id}
                onClick={() => setTab(t.id as typeof tab)}
                className={`pb-3 px-2 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition ${
                  tab === t.id
                    ? 'border-emerald-400 text-emerald-300'
                    : 'border-transparent text-stone-400 hover:text-stone-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5 survival-scroll">
          {statusMsg && (
            <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-600/50 text-xs text-emerald-200">
              {statusMsg}
            </div>
          )}

          {tab === 'tweaks' && (
            <div className="space-y-5">
              {/* Starter Presets */}
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">
                  One-Click Starter Mods
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {STARTER_MOD_PRESETS.map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => {
                        if (p.tweaks) onSetTweaks(p.tweaks);
                        if (p.code) onAddScript(p.name, p.code);
                        setStatusMsg(`Applied preset "${p.name}"`);
                      }}
                      className="p-3.5 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-800 hover:border-emerald-500/50 text-left transition"
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300 mb-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{p.name}</span>
                      </div>
                      <p className="text-[11px] text-stone-400 leading-relaxed">{p.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Gameplay Multipliers */}
              <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-300">
                    Live Physics &amp; Rules Multipliers
                  </span>
                  <button
                    type="button"
                    onClick={onResetTweaks}
                    className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs text-stone-200 flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset 1.0x</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    {
                      key: 'moveSpeedMultiplier' as const,
                      label: 'Player Move Speed',
                      min: 0.4,
                      max: 3.0,
                      step: 0.1,
                      suffix: 'x',
                    },
                    {
                      key: 'gravityMultiplier' as const,
                      label: 'World Gravity',
                      min: 0.2,
                      max: 2.5,
                      step: 0.05,
                      suffix: 'x',
                    },
                    {
                      key: 'jumpMultiplier' as const,
                      label: 'Jump & Wall-Kick Height',
                      min: 0.5,
                      max: 2.5,
                      step: 0.1,
                      suffix: 'x',
                    },
                    {
                      key: 'damageMultiplier' as const,
                      label: 'Firearm & Melee Damage',
                      min: 0.5,
                      max: 5.0,
                      step: 0.1,
                      suffix: 'x',
                    },
                    {
                      key: 'vehicleSpeedMultiplier' as const,
                      label: 'Vehicle Top Speed',
                      min: 0.5,
                      max: 2.5,
                      step: 0.1,
                      suffix: 'x',
                    },
                    {
                      key: 'gatherYieldMultiplier' as const,
                      label: 'Harvest Yield Multiplier',
                      min: 1,
                      max: 5,
                      step: 1,
                      suffix: 'x',
                    },
                    {
                      key: 'dayLengthMultiplier' as const,
                      label: 'Day/Night Cycle Length',
                      min: 0.2,
                      max: 4.0,
                      step: 0.2,
                      suffix: 'x',
                    },
                  ].map((slider) => (
                    <div key={slider.key} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-stone-300 font-medium">{slider.label}</span>
                        <span className="font-mono text-emerald-300 font-bold">
                          {tweaks[slider.key].toFixed(slider.step === 1 ? 0 : 2)}
                          {slider.suffix}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={slider.min}
                        max={slider.max}
                        step={slider.step}
                        value={tweaks[slider.key]}
                        onChange={(e) =>
                          onSetTweaks({ [slider.key]: Number(e.target.value) })
                        }
                        className="w-full accent-emerald-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'assets' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-3">
                  <div className="text-xs font-bold text-emerald-300 uppercase">
                    Upload Local 3D Model (.glb / .gltf / .obj)
                  </div>
                  <p className="text-xs text-stone-400">
                    Spawns normalized &amp; grounded directly in front of your survivor on the island.
                  </p>
                  <label className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition">
                    <Upload className="w-4 h-4" />
                    <span>Select 3D Model File</span>
                    <input
                      type="file"
                      accept=".glb,.gltf,.obj"
                      onChange={handleModelFile}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-3">
                  <div className="text-xs font-bold text-sky-300 uppercase">
                    Load Remote 3D Model URL
                  </div>
                  <input
                    type="url"
                    value={modelUrl}
                    onChange={(e) => setModelUrl(e.target.value)}
                    placeholder="https://.../custom-model.glb"
                    className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-sky-500"
                  />
                  <button
                    type="button"
                    onClick={handleModelUrlLoad}
                    className="w-full py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-stone-950 font-bold text-xs"
                  >
                    Import Model from URL
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-bold uppercase text-stone-300">
                  Spawned Custom 3D Assets ({assets.length})
                </div>
                {assets.length === 0 ? (
                  <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-500 text-center">
                    No custom 3D models imported yet.
                  </div>
                ) : (
                  assets.map((a) => (
                    <div
                      key={a.id}
                      className="p-3 rounded-xl bg-stone-950 border border-stone-800 flex flex-wrap items-center justify-between gap-3"
                    >
                      <div>
                        <div className="text-sm font-bold text-stone-100">{a.name}</div>
                        <div className="text-[11px] text-stone-400">
                          {a.format.toUpperCase()} · {a.meshCount} meshes · ({Math.round(a.x)},{' '}
                          {Math.round(a.z)})
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="text-[11px] text-stone-300 flex items-center gap-1.5">
                          <span>Scale</span>
                          <input
                            type="range"
                            min={0.3}
                            max={4}
                            step={0.1}
                            value={a.scale}
                            onChange={(e) =>
                              onUpdateAssetTransform(a.id, { scale: Number(e.target.value) })
                            }
                            className="w-20 accent-emerald-500"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => onRemoveAsset(a.id)}
                          className="p-1.5 rounded-lg bg-stone-900 hover:bg-red-950 text-stone-400 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {tab === 'scripts' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-2.5">
                <div className="text-xs font-bold text-amber-300 uppercase">
                  Load Script Mod from URL (.js)
                </div>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={scriptUrl}
                    onChange={(e) => setScriptUrl(e.target.value)}
                    placeholder="https://.../island-mod.js"
                    className="flex-1 bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={handleLoadScriptUrl}
                    className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs"
                  >
                    Load URL
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="text"
                    value={scriptName}
                    onChange={(e) => setScriptName(e.target.value)}
                    className="bg-stone-900 border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-stone-100 font-semibold w-56"
                    placeholder="Mod Script Name"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      onAddScript(scriptName, scriptCode);
                      setStatusMsg(`Ran mod "${scriptName}"`);
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-bold text-xs flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Run &amp; Register Mod</span>
                  </button>
                </div>
                <textarea
                  rows={5}
                  value={scriptCode}
                  onChange={(e) => setScriptCode(e.target.value)}
                  className="w-full bg-stone-900 border border-stone-700 rounded-xl p-3 text-xs font-mono text-emerald-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {scripts.length > 0 && (
                <div className="space-y-2">
                  {scripts.map((s) => (
                    <div
                      key={s.id}
                      className="p-3 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="text-xs font-bold text-stone-100">{s.name}</div>
                        {s.lastError && (
                          <div className="text-[11px] text-red-400">{s.lastError}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onToggleScript(s.id, !s.enabled)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                            s.enabled
                              ? 'bg-emerald-700 text-white'
                              : 'bg-stone-800 text-stone-400'
                          }`}
                        >
                          {s.enabled ? 'Active' : 'Disabled'}
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoveScript(s.id)}
                          className="p-1.5 rounded-lg bg-stone-900 hover:bg-red-950 text-stone-400 hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'share' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-3">
                <div className="text-xs font-bold uppercase text-emerald-300">
                  Export Mods, Structures &amp; Custom Vehicles
                </div>
                <p className="text-xs text-stone-400">
                  Bundles your gameplay tweaks, script mods, placed buildings, and custom garage vehicles into one portable file for friends.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadBundle}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-bold text-xs flex items-center gap-1.5"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download .JSON Bundle</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyBundle}
                    className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-100 font-bold text-xs flex items-center gap-1.5"
                  >
                    {copiedBundle ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    <span>{copiedBundle ? 'Bundle Copied' : 'Copy Bundle JSON'}</span>
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-3">
                <div className="text-xs font-bold uppercase text-sky-300">
                  Import Friend&apos;s Mod &amp; Build Bundle
                </div>
                <label className="inline-flex px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-stone-950 font-bold text-xs items-center gap-1.5 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span>Upload .JSON Bundle</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleBundleFile}
                    className="hidden"
                  />
                </label>
                <textarea
                  rows={3}
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  placeholder="Or paste exported bundle JSON here..."
                  className="w-full bg-stone-900 border border-stone-700 rounded-xl p-2.5 text-xs font-mono text-stone-200 focus:outline-none focus:border-sky-500"
                />
                <button
                  type="button"
                  onClick={handleImportTextBundle}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs"
                >
                  Apply Pasted Bundle
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
