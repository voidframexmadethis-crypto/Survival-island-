/* =========================================================
   ECOSYSTEM JOURNAL & LIVING WORLD MANAGEMENT MODAL
   Displays species discoveries, wildlife census, forest stages,
   weather interaction, and habitat restoration.
   ========================================================= */

'use client';

import React, { useState } from 'react';
import {
  Trees,
  Sprout,
  Activity,
  CloudRain,
  Sun,
  ShieldCheck,
  Compass,
  AlertTriangle,
  Award,
  BookOpen,
  X,
  RefreshCw,
  Heart,
  Globe2
} from 'lucide-react';
import { EcosystemSimulationData, EcosystemZone } from '@/game/systems/livingEcosystemSystem';

interface EcosystemJournalModalProps {
  ecosystem: EcosystemSimulationData;
  onClose: () => void;
  onRestoreHabitat?: (zoneId: string) => void;
}

export function EcosystemJournalModal({
  ecosystem,
  onClose,
  onRestoreHabitat
}: EcosystemJournalModalProps) {
  const [activeTab, setActiveTab] = useState<'journal' | 'zones' | 'wildlife' | 'restoration'>('journal');
  const [selectedZone, setSelectedZone] = useState<EcosystemZone | null>(ecosystem.zones[0] || null);

  const healthColor =
    ecosystem.habitatHealthScore >= 75
      ? 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30'
      : ecosystem.habitatHealthScore >= 40
      ? 'text-amber-400 bg-amber-950/40 border-amber-500/30'
      : 'text-rose-400 bg-rose-950/40 border-rose-500/30';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
      <div className="relative w-full max-w-5xl h-[85vh] bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-stone-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Globe2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold tracking-wide text-emerald-300">
                LIVING ISLAND ECOSYSTEM & JOURNAL
              </h2>
              <p className="text-xs text-stone-400">
                Persistent world simulation, wildlife census, flora dynamics, and habitat management
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${healthColor}`}>
              <ShieldCheck className="w-4 h-4" />
              <span>Habitat Health: {ecosystem.habitatHealthScore}%</span>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-stone-800 bg-stone-950/30">
          <button
            onClick={() => setActiveTab('journal')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'journal'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                : 'text-stone-400 hover:bg-stone-800 hover:text-stone-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Discovery Journal</span>
          </button>

          <button
            onClick={() => setActiveTab('zones')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'zones'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                : 'text-stone-400 hover:bg-stone-800 hover:text-stone-200'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Ecosystem Zones</span>
          </button>

          <button
            onClick={() => setActiveTab('wildlife')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'wildlife'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                : 'text-stone-400 hover:bg-stone-800 hover:text-stone-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Wildlife Census</span>
          </button>

          <button
            onClick={() => setActiveTab('restoration')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'restoration'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                : 'text-stone-400 hover:bg-stone-800 hover:text-stone-200'
            }`}
          >
            <Sprout className="w-4 h-4" />
            <span>Habitat & Forestry</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* TAB 1: JOURNAL */}
          {activeTab === 'journal' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ecosystem.journal.map((entry, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border transition-all ${
                      entry.discovered
                        ? 'bg-stone-950/50 border-stone-800 hover:border-emerald-500/40'
                        : 'bg-stone-900/30 border-stone-800/50 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${entry.discovered ? 'bg-emerald-500/10 text-emerald-400' : 'bg-stone-800 text-stone-500'}`}>
                          {entry.category === 'wildlife' ? <Activity className="w-5 h-5" /> : <Trees className="w-5 h-5" />}
                        </div>
                        <div>
                          <h3 className="font-semibold text-stone-200 text-base">
                            {entry.discovered ? entry.name : '??? Undiscovered Species'}
                          </h3>
                          <span className="text-xs text-stone-400 capitalize">
                            {entry.category} {entry.rare ? '• Rare Sighting' : ''}
                          </span>
                        </div>
                      </div>

                      {entry.discovered && (
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-semibold">
                          Observed ({entry.observationCount})
                        </span>
                      )}
                    </div>

                    <p className="mt-3 text-sm text-stone-300">
                      {entry.discovered
                        ? entry.description
                        : 'Explore further into the island biomes to discover and record this species.'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: ZONES */}
          {activeTab === 'zones' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-stone-400 uppercase tracking-wider">Island Zones</h3>
                {ecosystem.zones.map((zone) => (
                  <button
                    key={zone.id}
                    onClick={() => setSelectedZone(zone)}
                    className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between ${
                      selectedZone?.id === zone.id
                        ? 'bg-emerald-600/20 border-emerald-500/60 text-emerald-300'
                        : 'bg-stone-950/40 border-stone-800 text-stone-300 hover:bg-stone-800/50'
                    }`}
                  >
                    <div>
                      <h4 className="font-semibold">{zone.name}</h4>
                      <p className="text-xs text-stone-400 capitalize">Biome: {zone.biome}</p>
                    </div>
                    {zone.activeEvent && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-xs">
                        Event Active
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="lg:col-span-2 bg-stone-950/50 border border-stone-800 rounded-2xl p-6 space-y-6">
                {selectedZone ? (
                  <>
                    <div className="flex items-center justify-between pb-4 border-b border-stone-800">
                      <div>
                        <h3 className="text-xl font-display font-bold text-emerald-300">{selectedZone.name}</h3>
                        <p className="text-sm text-stone-400 capitalize">Ecosystem Biome: {selectedZone.biome}</p>
                      </div>
                      {selectedZone.activeEvent && (
                        <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          <span>Active Event: {selectedZone.activeEvent.replace('_', ' ').toUpperCase()}</span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="p-4 rounded-xl bg-stone-900 border border-stone-800">
                        <span className="text-xs text-stone-400">Soil Moisture</span>
                        <p className="text-xl font-bold text-blue-400 mt-1">
                          {Math.round(selectedZone.soilMoisture * 100)}%
                        </p>
                      </div>

                      <div className="p-4 rounded-xl bg-stone-900 border border-stone-800">
                        <span className="text-xs text-stone-400">Temperature</span>
                        <p className="text-xl font-bold text-amber-400 mt-1">
                          {selectedZone.temperatureC}°C
                        </p>
                      </div>

                      <div className="p-4 rounded-xl bg-stone-900 border border-stone-800">
                        <span className="text-xs text-stone-400">Canopy Density</span>
                        <p className="text-xl font-bold text-emerald-400 mt-1">
                          {Math.round(selectedZone.canopyDensity * 100)}%
                        </p>
                      </div>

                      <div className="p-4 rounded-xl bg-stone-900 border border-stone-800">
                        <span className="text-xs text-stone-400">Pollution Index</span>
                        <p className="text-xl font-bold text-rose-400 mt-1">
                          {Math.round(selectedZone.pollutionLevel * 100)}%
                        </p>
                      </div>
                    </div>

                    <div className="p-5 rounded-xl bg-stone-900 border border-stone-800 space-y-4">
                      <h4 className="text-sm font-semibold text-stone-300">Wildlife Census in Zone</h4>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="p-3 rounded-lg bg-stone-950">
                          <span className="text-xs text-stone-400">Herbivores</span>
                          <p className="text-lg font-bold text-stone-200 mt-1">{selectedZone.herbivorePopulation}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-stone-950">
                          <span className="text-xs text-stone-400">Predators</span>
                          <p className="text-lg font-bold text-stone-200 mt-1">{selectedZone.predatorPopulation}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-stone-950">
                          <span className="text-xs text-stone-400">Aquatic Fish</span>
                          <p className="text-lg font-bold text-stone-200 mt-1">{selectedZone.fishPopulation}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => onRestoreHabitat?.(selectedZone.id)}
                        className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                      >
                        <Sprout className="w-5 h-5" />
                        <span>Restore Zone Habitat & Clean Pollution</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="text-stone-400 text-center py-12">Select an ecosystem zone to inspect</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: WILDLIFE */}
          {activeTab === 'wildlife' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-stone-400 uppercase tracking-wider">Active Wildlife Agents</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ecosystem.wildlifeAgents.map((agent) => (
                  <div key={agent.id} className="p-4 rounded-xl bg-stone-950/50 border border-stone-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
                        <Activity className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold capitalize text-stone-200">{agent.species.replace('_', ' ')}</h4>
                        <p className="text-xs text-stone-400">
                          State: <span className="text-emerald-400 capitalize">{agent.state}</span> • Age: {agent.ageDays}d {agent.isBaby ? '(Baby)' : ''}
                        </p>
                      </div>
                    </div>

                    <div className="text-right text-xs space-y-1">
                      <div className="text-stone-300">Energy: {Math.round(agent.energy)}%</div>
                      <div className="text-stone-300">Hydration: {Math.round(agent.hydration)}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: RESTORATION & FORESTRY */}
          {activeTab === 'restoration' && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-stone-950/60 border border-stone-800 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
                    <Trees className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-stone-100">Forest Density & Tree Growth Simulation</h3>
                    <p className="text-xs text-stone-400">Global canopy cover: {Math.round(ecosystem.forestDensity * 100)}%</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-stone-900 border border-stone-800">
                    <span className="text-xs text-stone-400">Total Tracked Trees</span>
                    <p className="text-2xl font-bold text-emerald-400 mt-1">{ecosystem.forestTrees.length}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-stone-900 border border-stone-800">
                    <span className="text-xs text-stone-400">Soil Moisture Level</span>
                    <p className="text-2xl font-bold text-blue-400 mt-1">{Math.round(ecosystem.soilMoisture * 100)}%</p>
                  </div>
                  <div className="p-4 rounded-xl bg-stone-900 border border-stone-800">
                    <span className="text-xs text-stone-400">Village NPCs Active</span>
                    <p className="text-2xl font-bold text-amber-400 mt-1">{ecosystem.npcs.length}</p>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-stone-950/60 border border-stone-800 space-y-4">
                <h3 className="text-md font-bold text-stone-200">Village Schedules & Community Activity</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ecosystem.npcs.map((npc) => (
                    <div key={npc.npcId} className="p-4 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-stone-200">{npc.name}</h4>
                        <p className="text-xs text-stone-400 capitalize">Role: {npc.role} • Village: {npc.villageId}</p>
                      </div>
                      <span className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-semibold capitalize">
                        {npc.currentActivity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
