'use client';

import React, { useState } from 'react';
import {
  Anchor,
  Car,
  CheckCircle2,
  Compass,
  Gauge,
  Paintbrush,
  ParkingSquare,
  Plus,
  Sparkles,
  Trash2,
  Wrench,
  Zap,
} from 'lucide-react';
import {
  ItemId,
  ModularVehicleData,
  VehicleModuleKind,
  VehicleModulePlacement,
} from '@/game/types';
import {
  VEHICLE_MODULE_SPECS,
  VehiclePresetKey,
  buildPresetModules,
  computeVehicleSpecs,
  createVehicleFromPreset,
} from '@/game/systems/modularVehicle';

interface VehicleBuilderModalProps {
  onClose: () => void;
  onSpawnVehicle: (vehicle: ModularVehicleData) => void;
  vehicles?: ModularVehicleData[];
  onCustomizeVehicle?: (
    vehicleId: string,
    patch: {
      name?: string;
      paintColor?: string;
      rimColor?: string;
      suspensionOffset?: number;
      wheelScale?: number;
      hydraulicHop?: boolean;
      turboBoost?: number;
    },
  ) => void;
  onParkInGarage?: (vehicleId: string, bay: 'A' | 'B' | 'C') => void;
  playerInventory: { itemId: ItemId; quantity: number }[];
  playerX: number;
  playerY: number;
  playerZ: number;
  playerYaw: number;
}

const PAINT_SWATCHES = [
  '#dc2626',
  '#d97706',
  '#eab308',
  '#facc15',
  '#38bdf8',
  '#84cc16',
  '#0284c7',
  '#7e22ce',
  '#ec4899',
  '#1c1917',
  '#f8fafc',
];

const RIM_SWATCHES = ['#facc15', '#e2e8f0', '#334155', '#d97706', '#dc2626', '#38bdf8'];

export const VehicleBuilderModal: React.FC<VehicleBuilderModalProps> = ({
  onClose,
  onSpawnVehicle,
  vehicles = [],
  onCustomizeVehicle,
  onParkInGarage,
  playerX,
  playerY,
  playerZ,
  playerYaw,
}) => {
  const [activeTab, setActiveTab] = useState<'preset' | 'customize' | 'modules'>('preset');
  const [selectedPreset, setSelectedPreset] = useState<VehiclePresetKey>('sports_car');
  const [presetName, setPresetName] = useState('Island GT Street Car');
  const [paintColor, setPaintColor] = useState('#dc2626');
  const [rimColor, setRimColor] = useState('#e2e8f0');
  const [suspensionOffset, setSuspensionOffset] = useState(-0.1);
  const [wheelScale, setWheelScale] = useState(0.88);
  const [hydraulicHop, setHydraulicHop] = useState(false);
  const [turboBoost, setTurboBoost] = useState(1.35);

  const [modules, setModules] = useState<VehicleModulePlacement[]>(
    buildPresetModules('sports_car'),
  );
  const [selectedKindToAdd, setSelectedKindToAdd] = useState<VehicleModuleKind>('armor_plate');
  const [addGx, setAddGx] = useState(0);
  const [addGy, setAddGy] = useState(1);
  const [addGz, setAddGz] = useState(2);

  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(vehicles[0]?.id ?? '');
  const activeGarageVehicle =
    vehicles.find((v) => v.id === selectedVehicleId) ?? vehicles[0] ?? null;

  const specs = computeVehicleSpecs(modules);

  const handleSelectPreset = (preset: VehiclePresetKey) => {
    setSelectedPreset(preset);
    const sample = createVehicleFromPreset('preview', preset, 0, 0, 0, 0);
    setPresetName(sample.name);
    setPaintColor(sample.paintColor);
    setRimColor(sample.rimColor ?? '#e2e8f0');
    setSuspensionOffset(sample.suspensionOffset ?? 0);
    setWheelScale(sample.wheelScale ?? 1.0);
    setHydraulicHop(Boolean(sample.hydraulicHop));
    setTurboBoost(sample.turboBoost ?? 1.0);
    setModules(sample.modules);
  };

  const handleAddModule = () => {
    const exists = modules.some((m) => m.gx === addGx && m.gy === addGy && m.gz === addGz);
    if (exists) return;

    const newPlacement: VehicleModulePlacement = {
      id: `mod_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      kind: selectedKindToAdd,
      gx: addGx,
      gy: addGy,
      gz: addGz,
    };
    setModules([...modules, newPlacement]);
  };

  const handleRemoveModule = (id: string) => {
    setModules(modules.filter((m) => m.id !== id));
  };

  const handleDeploy = () => {
    const spawnX = playerX - Math.sin(playerYaw) * 4.5;
    const spawnZ = playerZ - Math.cos(playerYaw) * 4.5;
    const spawnY = playerY + 0.4;
    const basePreset = createVehicleFromPreset(
      `vehicle_${Date.now()}`,
      selectedPreset,
      spawnX,
      spawnY,
      spawnZ,
      playerYaw,
    );

    const newVehicle: ModularVehicleData = {
      ...basePreset,
      name: presetName || specs.craftClass,
      paintColor,
      rimColor,
      suspensionOffset,
      wheelScale,
      hydraulicHop,
      turboBoost,
      hp: specs.maxHp,
      maxHp: specs.maxHp,
      fuel: 100,
      modules,
      cargoItems: [],
    };

    onSpawnVehicle(newVehicle);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="relative w-full max-w-5xl bg-stone-900 border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-stone-950/90 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Car className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-display text-amber-100 tracking-wide">
                Vehicle Garage &amp; Modular Assembly Bay
              </h2>
              <p className="text-xs text-stone-400">
                Build &amp; customize Lowriders, 30&quot; Lifted DONKs, Houston SLABs, Sports Cars, Buggies, Rovers &amp; Boats
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-sm font-semibold transition"
          >
            Close
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-stone-800 bg-stone-950/50 px-6 pt-2 gap-4 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('preset')}
            className={`pb-3 px-3 text-sm font-semibold border-b-2 whitespace-nowrap transition ${
              activeTab === 'preset'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            Cars, Buggies &amp; Blueprints
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('customize')}
            className={`pb-3 px-3 text-sm font-semibold border-b-2 whitespace-nowrap transition ${
              activeTab === 'customize'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            Garage Customizer ({vehicles.length} Parked/Owned)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('modules')}
            className={`pb-3 px-3 text-sm font-semibold border-b-2 whitespace-nowrap transition ${
              activeTab === 'modules'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            Grid Modules ({modules.length})
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 survival-scroll">
          {/* Left / Main Workspace */}
          <div className="lg:col-span-2 space-y-5">
            {activeTab === 'preset' ? (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-stone-300 uppercase tracking-wider">
                  Select Vehicle Blueprint
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      key: 'lowrider' as VehiclePresetKey,
                      title: '1964 Candy Lowrider',
                      desc: 'Classic Impala cruiser with whitewall wire rims & high-bounce 2-wheel hydraulics.',
                      icon: Sparkles,
                      color: 'border-purple-500/50 bg-purple-500/10 text-purple-400',
                    },
                    {
                      key: 'donk' as VehiclePresetKey,
                      title: '30" Lifted DONK',
                      desc: '1970s Box Chevy lifted on 30-inch chrome rims with up/down & side-to-side hydraulics.',
                      icon: Car,
                      color: 'border-sky-500/50 bg-sky-500/10 text-sky-400',
                    },
                    {
                      key: 'slab' as VehiclePresetKey,
                      title: 'Houston Candy SLAB',
                      desc: 'Luxury sedan on extended Swanger wire elbows, fifth-wheel spare, neon glow & trunk bass.',
                      icon: Zap,
                      color: 'border-pink-500/50 bg-pink-500/10 text-pink-400',
                    },
                    {
                      key: 'sports_car' as VehiclePresetKey,
                      title: 'Island GT Car',
                      desc: 'Twin-turbo low-slung sports coupe with rear aero wing & fast cornering.',
                      icon: Zap,
                      color: 'border-red-500/50 bg-red-500/10 text-red-400',
                    },
                    {
                      key: 'dune_buggy' as VehiclePresetKey,
                      title: 'Sandstorm Buggy',
                      desc: 'Tubular roll-cage chassis & tall off-road tires built for beaches & dunes.',
                      icon: Gauge,
                      color: 'border-lime-500/50 bg-lime-500/10 text-lime-400',
                    },
                    {
                      key: 'expedition_rover' as VehiclePresetKey,
                      title: 'Expedition 4x4 Rover',
                      desc: 'Armored multi-wheel terrain explorer with cargo rack & heavy steel plates.',
                      icon: Car,
                      color: 'border-amber-500/50 bg-amber-500/10 text-amber-400',
                    },
                    {
                      key: 'steam_boat' as VehiclePresetKey,
                      title: 'Pontoon Boat',
                      desc: 'Sealed pontoons & twin paddle engine for ocean & lake exploration.',
                      icon: Anchor,
                      color: 'border-sky-500/50 bg-sky-500/10 text-sky-400',
                    },
                    {
                      key: 'gyro_airship' as VehiclePresetKey,
                      title: 'Gyro Airship',
                      desc: 'Spinning rotor lift blades & steam turbine for flying over island cliffs.',
                      icon: Compass,
                      color: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400',
                    },
                  ].map((p) => {
                    const IconComp = p.icon;
                    const isSel = selectedPreset === p.key;
                    return (
                      <button
                        type="button"
                        key={p.key}
                        onClick={() => handleSelectPreset(p.key)}
                        className={`text-left rounded-xl p-3.5 border transition flex flex-col justify-between ${
                          isSel
                            ? 'border-amber-500 bg-amber-500/15 shadow-lg'
                            : 'border-stone-800 bg-stone-900/60 hover:border-stone-700'
                        }`}
                      >
                        <div>
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2.5 border ${p.color}`}>
                            <IconComp className="w-4 h-4" />
                          </div>
                          <h4 className="font-bold text-stone-100 text-sm mb-1">{p.title}</h4>
                          <p className="text-[11px] text-stone-400 leading-relaxed">{p.desc}</p>
                        </div>
                        <div className="mt-3 text-[11px] font-bold text-amber-400">
                          {isSel ? 'Selected Blueprint' : 'Load Blueprint'}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* New Vehicle Paint & Trim */}
                <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                        Vehicle Name
                      </label>
                      <input
                        type="text"
                        value={presetName}
                        onChange={(e) => setPresetName(e.target.value)}
                        className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-stone-100 text-sm focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                        Body Paint &amp; Rim Finish
                      </label>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {PAINT_SWATCHES.map((c) => (
                          <button
                            type="button"
                            key={c}
                            onClick={() => setPaintColor(c)}
                            aria-label={`Body color ${c}`}
                            className={`w-6 h-6 rounded-md border-2 transition ${
                              paintColor === c ? 'border-white scale-110' : 'border-stone-700'
                            }`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                        <span className="text-[11px] text-stone-500 mx-1">|</span>
                        {RIM_SWATCHES.map((r) => (
                          <button
                            type="button"
                            key={r}
                            onClick={() => setRimColor(r)}
                            aria-label={`Rim color ${r}`}
                            className={`w-5 h-5 rounded-full border-2 transition ${
                              rimColor === r ? 'border-amber-400 scale-110' : 'border-stone-700'
                            }`}
                            style={{ backgroundColor: r }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : activeTab === 'customize' ? (
              <div className="space-y-4">
                {vehicles.length === 0 ? (
                  <div className="p-6 rounded-xl bg-stone-950 border border-stone-800 text-sm text-stone-400 text-center">
                    No vehicles deployed yet. Pick a blueprint to spawn your first ride!
                  </div>
                ) : (
                  <>
                    <div>
                      <h3 className="text-xs font-bold text-stone-300 uppercase tracking-wider mb-2">
                        Choose Garage / World Vehicle to Customize
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {vehicles.map((v) => {
                          const isSel = activeGarageVehicle?.id === v.id;
                          return (
                            <button
                              type="button"
                              key={v.id}
                              onClick={() => setSelectedVehicleId(v.id)}
                              className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
                                isSel
                                  ? 'border-amber-500 bg-amber-500/15'
                                  : 'border-stone-800 bg-stone-950 hover:border-stone-700'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span
                                  className="w-4 h-4 rounded-full border border-white/30 shrink-0"
                                  style={{ backgroundColor: v.paintColor }}
                                />
                                <div className="min-w-0">
                                  <div className="text-sm font-bold text-stone-100 truncate">
                                    {v.name}
                                  </div>
                                  <div className="text-[11px] text-stone-400">
                                    HP {Math.round(v.hp)}/{v.maxHp} · Fuel {Math.round(v.fuel)}%
                                  </div>
                                </div>
                              </div>
                              <Paintbrush className="w-4 h-4 text-amber-400 shrink-0" />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {activeGarageVehicle && onCustomizeVehicle && (
                      <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h4 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                            <Paintbrush className="w-4 h-4" />
                            <span>Customizing: {activeGarageVehicle.name}</span>
                          </h4>
                          {onParkInGarage && (
                            <div className="flex items-center gap-1.5">
                              {(['A', 'B', 'C'] as const).map((bay) => (
                                <button
                                  type="button"
                                  key={bay}
                                  onClick={() => onParkInGarage(activeGarageVehicle.id, bay)}
                                  className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-amber-600 hover:text-stone-950 text-[11px] font-bold text-stone-200 flex items-center gap-1 transition"
                                >
                                  <ParkingSquare className="w-3.5 h-3.5" />
                                  <span>Bay {bay}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="text-xs text-stone-400 mb-1.5">Body Paint</div>
                          <div className="flex flex-wrap gap-2">
                            {PAINT_SWATCHES.map((c) => (
                              <button
                                type="button"
                                key={c}
                                onClick={() =>
                                  onCustomizeVehicle(activeGarageVehicle.id, { paintColor: c })
                                }
                                className={`w-7 h-7 rounded-lg border-2 ${
                                  activeGarageVehicle.paintColor === c
                                    ? 'border-white scale-110'
                                    : 'border-stone-700'
                                }`}
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs text-stone-400 mb-1.5">Chrome &amp; Alloy Rims</div>
                          <div className="flex flex-wrap gap-2">
                            {RIM_SWATCHES.map((r) => (
                              <button
                                type="button"
                                key={r}
                                onClick={() =>
                                  onCustomizeVehicle(activeGarageVehicle.id, { rimColor: r })
                                }
                                className={`w-6 h-6 rounded-full border-2 ${
                                  (activeGarageVehicle.rimColor ?? '#d97706') === r
                                    ? 'border-amber-400 scale-110'
                                    : 'border-stone-700'
                                }`}
                                style={{ backgroundColor: r }}
                              />
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <div className="flex justify-between text-xs text-stone-300 mb-1">
                              <span>Suspension Stance</span>
                              <span className="font-mono text-amber-300">
                                {(activeGarageVehicle.suspensionOffset ?? 0).toFixed(2)}m
                              </span>
                            </div>
                            <input
                              type="range"
                              min={-0.3}
                              max={0.55}
                              step={0.02}
                              value={activeGarageVehicle.suspensionOffset ?? 0}
                              onChange={(e) =>
                                onCustomizeVehicle(activeGarageVehicle.id, {
                                  suspensionOffset: Number(e.target.value),
                                })
                              }
                              className="w-full accent-amber-500"
                            />
                          </div>

                          <div>
                            <div className="flex justify-between text-xs text-stone-300 mb-1">
                              <span>Wheel Size</span>
                              <span className="font-mono text-amber-300">
                                {(activeGarageVehicle.wheelScale ?? 1).toFixed(2)}x
                              </span>
                            </div>
                            <input
                              type="range"
                              min={0.65}
                              max={1.65}
                              step={0.05}
                              value={activeGarageVehicle.wheelScale ?? 1}
                              onChange={(e) =>
                                onCustomizeVehicle(activeGarageVehicle.id, {
                                  wheelScale: Number(e.target.value),
                                })
                              }
                              className="w-full accent-amber-500"
                            />
                          </div>

                          <div>
                            <div className="flex justify-between text-xs text-stone-300 mb-1">
                              <span>Turbo Tune</span>
                              <span className="font-mono text-amber-300">
                                {(activeGarageVehicle.turboBoost ?? 1).toFixed(2)}x
                              </span>
                            </div>
                            <input
                              type="range"
                              min={0.8}
                              max={2.0}
                              step={0.05}
                              value={activeGarageVehicle.turboBoost ?? 1}
                              onChange={(e) =>
                                onCustomizeVehicle(activeGarageVehicle.id, {
                                  turboBoost: Number(e.target.value),
                                })
                              }
                              className="w-full accent-amber-500"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-stone-800">
                          <div>
                            <div className="text-xs font-bold text-stone-200">
                              {activeGarageVehicle.preset === 'donk'
                                ? 'DONK Hydraulics [Up / Down / Side-to-Side]'
                                : 'Hydraulic Suspension [Bounce / Tilt]'}
                            </div>
                            <div className="text-[11px] text-stone-400">
                              {activeGarageVehicle.preset === 'donk'
                                ? 'Raise, drop, and tilt left/right on 30-inch rims while staying planted'
                                : 'Bounce high off the ground with 2-wheel hops & side tilts'}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              onCustomizeVehicle(activeGarageVehicle.id, {
                                hydraulicHop: !activeGarageVehicle.hydraulicHop,
                              })
                            }
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border transition ${
                              activeGarageVehicle.hydraulicHop
                                ? 'bg-purple-600 border-purple-400 text-white'
                                : 'bg-stone-800 border-stone-700 text-stone-300'
                            }`}
                          >
                            {activeGarageVehicle.hydraulicHop ? 'Hydraulics ON' : 'Enable Hydraulics'}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-4">
                  <h3 className="text-sm font-semibold text-stone-300 uppercase tracking-wider">
                    Weld &amp; Attach New Module Component
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-stone-400 mb-1">Module Type</label>
                      <select
                        value={selectedKindToAdd}
                        onChange={(e) => setSelectedKindToAdd(e.target.value as VehicleModuleKind)}
                        className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-stone-200 text-sm focus:outline-none focus:border-amber-500"
                      >
                        {Object.entries(VEHICLE_MODULE_SPECS).map(([k, sp]) => (
                          <option key={k} value={k}>
                            {sp.name} ({sp.massKg}kg, +{sp.hpBonus} HP)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs text-stone-400 mb-1">Grid X (-2..2)</label>
                        <input
                          type="number"
                          min={-2}
                          max={2}
                          value={addGx}
                          onChange={(e) => setAddGx(Number(e.target.value))}
                          className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2 py-2 text-stone-200 text-sm text-center"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-stone-400 mb-1">Grid Y (0..3)</label>
                        <input
                          type="number"
                          min={0}
                          max={3}
                          value={addGy}
                          onChange={(e) => setAddGy(Number(e.target.value))}
                          className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2 py-2 text-stone-200 text-sm text-center"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-stone-400 mb-1">Grid Z (-2..2)</label>
                        <input
                          type="number"
                          min={-2}
                          max={2}
                          value={addGz}
                          onChange={(e) => setAddGz(Number(e.target.value))}
                          className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2 py-2 text-stone-200 text-sm text-center"
                        />
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddModule}
                    className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold flex items-center justify-center gap-2 transition shadow-lg"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Weld Component to Grid Position</span>
                  </button>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-stone-300 uppercase tracking-wider">
                    Attached Vehicle Modules ({modules.length})
                  </h3>
                  <div className="space-y-2 max-h-56 overflow-y-auto survival-scroll pr-2">
                    {modules.map((m) => {
                      const sp = VEHICLE_MODULE_SPECS[m.kind];
                      return (
                        <div
                          key={m.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-stone-950 border border-stone-800"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: sp.color }}
                            />
                            <div>
                              <div className="text-sm font-semibold text-stone-200">{sp.name}</div>
                              <div className="text-xs text-stone-400">
                                Position: X:{m.gx}, Y:{m.gy}, Z:{m.gz} | {sp.massKg} kg | +{sp.hpBonus} HP
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveModule(m.id)}
                            className="p-1.5 rounded-lg bg-stone-900 hover:bg-red-500/20 text-stone-400 hover:text-red-400 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Telemetry & Deploy */}
          <div className="bg-stone-950 border border-stone-800 rounded-2xl p-5 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <Wrench className="w-4 h-4" />
                <span>Blueprint Specs</span>
              </h3>

              <div className="p-3 rounded-xl bg-stone-900 border border-stone-800 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-stone-400">Class</span>
                  <span className="font-bold text-amber-300">{specs.craftClass}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Total Mass</span>
                  <span className="font-mono text-stone-200">{specs.totalMassKg} kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Max HP</span>
                  <span className="font-mono text-emerald-400">{specs.maxHp} HP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Land Speed</span>
                  <span className="font-mono text-stone-200">
                    {(specs.topLandSpeed * turboBoost).toFixed(1)} m/s
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Water Speed</span>
                  <span className="font-mono text-sky-400">{specs.topWaterSpeed} m/s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Air Speed</span>
                  <span className="font-mono text-yellow-400">{specs.topAirSpeed} m/s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Cargo Slots</span>
                  <span className="font-mono text-stone-200">{specs.cargoCapacity} slots</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-stone-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Wheels equipped: {specs.wheelCount}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-stone-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Steam engines: {specs.engineCount}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-stone-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Hydraulics: {hydraulicHop ? 'Enabled (Space)' : 'Standard'}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDeploy}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl transition"
            >
              <Car className="w-5 h-5" />
              <span>Deploy {presetName.split(' ')[0]} in World</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
