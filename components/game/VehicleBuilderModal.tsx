'use client';

import React, { useState } from 'react';
import {
  Car,
  Anchor,
  Compass,
  Shield,
  Cpu,
  Wrench,
  Package,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Trash2,
  Plus,
} from 'lucide-react';
import {
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
import { ItemId } from '@/game/types';
import { ITEMS } from '@/game/data/items';
import { ItemIcon } from './ItemIcon';

interface VehicleBuilderModalProps {
  onClose: () => void;
  onSpawnVehicle: (vehicle: ModularVehicleData) => void;
  playerInventory: { itemId: ItemId; quantity: number }[];
  playerX: number;
  playerY: number;
  playerZ: number;
  playerYaw: number;
}

export const VehicleBuilderModal: React.FC<VehicleBuilderModalProps> = ({
  onClose,
  onSpawnVehicle,
  playerInventory,
  playerX,
  playerY,
  playerZ,
  playerYaw,
}) => {
  const [activeTab, setActiveTab] = useState<'preset' | 'modules'>('preset');
  const [selectedPreset, setSelectedPreset] = useState<VehiclePresetKey>('expedition_rover');
  const [presetName, setPresetName] = useState('Expedition 4x4 Steam Rover');
  const [modules, setModules] = useState<VehicleModulePlacement[]>(
    buildPresetModules('expedition_rover')
  );
  const [selectedKindToAdd, setSelectedKindToAdd] = useState<VehicleModuleKind>('armor_plate');
  const [addGx, setAddGx] = useState(0);
  const [addGy, setAddGy] = useState(1);
  const [addGz, setAddGz] = useState(2);

  const specs = computeVehicleSpecs(modules);

  const handleSelectPreset = (preset: VehiclePresetKey) => {
    setSelectedPreset(preset);
    const names: Record<VehiclePresetKey, string> = {
      expedition_rover: 'Expedition 4x4 Steam Rover',
      steam_boat: 'Pontoon Valley Explorer Boat',
      gyro_airship: 'Island Gyro Rotor Airship',
    };
    setPresetName(names[preset]);
    setModules(buildPresetModules(preset));
  };

  const handleAddModule = () => {
    const exists = modules.some((m) => m.gx === addGx && m.gy === addGy && m.gz === addGz);
    if (exists) return;

    const newPlacement: VehicleModulePlacement = {
      id: `mod_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
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
    const spawnX = playerX + Math.sin(playerYaw) * 4;
    const spawnZ = playerZ + Math.cos(playerYaw) * 4;
    const spawnY = playerY + 0.5;

    const vehicleId = `vehicle_${Date.now()}`;
    const newVehicle: ModularVehicleData = {
      id: vehicleId,
      name: presetName || specs.craftClass,
      paintColor: specs.craftClass === 'Steam Boat' ? '#0284c7' : specs.craftClass === 'Gyro Airship' ? '#eab308' : '#d97706',
      x: spawnX,
      y: spawnY,
      z: spawnZ,
      yaw: playerYaw,
      vx: 0,
      vy: 0,
      vz: 0,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
      <div className="relative w-full max-w-5xl bg-stone-900 border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-stone-950/80 border-b border-stone-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Car className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-display text-amber-100 tracking-wide">
                Modular Vehicle & Craft Assembly Bay
              </h2>
              <p className="text-xs text-stone-400">
                Design custom land rovers, steam pontoon boats, or gyro airships piece-by-piece
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-sm font-semibold transition"
          >
            Close
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-stone-800 bg-stone-950/40 px-6 pt-2 space-x-4">
          <button
            onClick={() => setActiveTab('preset')}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition ${
              activeTab === 'preset'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            Expedition Presets
          </button>
          <button
            onClick={() => setActiveTab('modules')}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition ${
              activeTab === 'modules'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            Piece-by-Piece Grid Designer ({modules.length} Modules)
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 survival-scroll">
          {/* Left / Main Workspace */}
          <div className="lg:col-span-2 space-y-6">
            {activeTab === 'preset' ? (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-stone-300 uppercase tracking-wider">
                  Select Foundation Blueprint
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    {
                      key: 'expedition_rover' as VehiclePresetKey,
                      title: 'Expedition 4x4 Rover',
                      desc: 'Armored multi-wheel terrain explorer with steam drive engine & steering.',
                      icon: Car,
                      color: 'border-amber-500/50 bg-amber-500/10 text-amber-400',
                    },
                    {
                      key: 'steam_boat' as VehiclePresetKey,
                      title: 'Pontoon Valley Boat',
                      desc: 'Sealed pontoons & twin paddle steam engine for ocean & lake travel.',
                      icon: Anchor,
                      color: 'border-sky-500/50 bg-sky-500/10 text-sky-400',
                    },
                    {
                      key: 'gyro_airship' as VehiclePresetKey,
                      title: 'Island Gyro Airship',
                      desc: 'Rotating wing lift blades & steam turbine for vertical mountain peaks.',
                      icon: Compass,
                      color: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400',
                    },
                  ].map((p) => {
                    const IconComp = p.icon;
                    const isSel = selectedPreset === p.key;
                    return (
                      <div
                        key={p.key}
                        onClick={() => handleSelectPreset(p.key)}
                        className={`cursor-pointer rounded-xl p-4 border transition flex flex-col justify-between ${
                          isSel
                            ? 'border-amber-500 bg-amber-500/15 shadow-lg shadow-amber-500/10'
                            : 'border-stone-800 bg-stone-900/60 hover:border-stone-700'
                        }`}
                      >
                        <div>
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 border ${p.color}`}>
                            <IconComp className="w-5 h-5" />
                          </div>
                          <h4 className="font-bold text-stone-100 text-sm mb-1">{p.title}</h4>
                          <p className="text-xs text-stone-400 leading-relaxed">{p.desc}</p>
                        </div>
                        <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-stone-800/80">
                          <span className="text-stone-400">Status</span>
                          <span className={isSel ? 'text-amber-400 font-bold' : 'text-stone-500'}>
                            {isSel ? 'Selected' : 'Click to Load'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-3">
                  <label className="block text-xs font-semibold text-stone-300">
                    Craft Custom Name
                  </label>
                  <input
                    type="text"
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-stone-100 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-4">
                  <h3 className="text-sm font-semibold text-stone-300 uppercase tracking-wider">
                    Weld & Attach New Module Component
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
                    onClick={handleAddModule}
                    className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold flex items-center justify-center space-x-2 transition shadow-lg shadow-amber-600/20"
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
                          <div className="flex items-center space-x-3">
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

          {/* Right Column: Telemetry & Specs */}
          <div className="bg-stone-950 border border-stone-800 rounded-2xl p-5 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-2">
                <Wrench className="w-4 h-4" />
                <span>Craft Telemetry & Specs</span>
              </h3>

              <div className="p-3 rounded-xl bg-stone-900 border border-stone-800 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-stone-400">Craft Classification</span>
                  <span className="font-bold text-amber-300">{specs.craftClass}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Total Mass</span>
                  <span className="font-mono text-stone-200">{specs.totalMassKg} kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Max Structural HP</span>
                  <span className="font-mono text-emerald-400">{specs.maxHp} HP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Top Land Speed</span>
                  <span className="font-mono text-stone-200">{specs.topLandSpeed} m/s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Top Water Speed</span>
                  <span className="font-mono text-sky-400">{specs.topWaterSpeed} m/s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Top Air Speed</span>
                  <span className="font-mono text-yellow-400">{specs.topAirSpeed} m/s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Cargo Slots</span>
                  <span className="font-mono text-stone-200">{specs.cargoCapacity} slots</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-xs text-stone-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Wheels equipped: {specs.wheelCount}</span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-stone-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Steam engines: {specs.engineCount}</span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-stone-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Pontoon hulls: {specs.pontoonCount} (Float: {specs.canFloat ? 'Yes' : 'No'})</span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-stone-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Rotor wings: {specs.rotorCount} (Fly: {specs.canFly ? 'Yes' : 'No'})</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleDeploy}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-extrabold text-sm flex items-center justify-center space-x-2 shadow-xl shadow-amber-500/20 transition"
            >
              <Car className="w-5 h-5" />
              <span>Deploy & Spawn Craft in World</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
