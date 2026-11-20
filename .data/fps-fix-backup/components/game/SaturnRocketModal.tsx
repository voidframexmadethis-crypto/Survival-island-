'use client';

import React, { useMemo, useState } from 'react';
import {
  Compass,
  Flame,
  Globe,
  Orbit,
  Rocket,
  ShieldAlert,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import {
  ALIEN_SPACE_SYSTEM,
  MULTIVERSE_SPACE_ENGINE,
  SpaceHudSnapshot,
  SpacePlanet,
  StarSystemData,
} from '@/game/systems/multiverseSpace';

interface SaturnRocketModalProps {
  onClose: () => void;
  spaceState: SpaceHudSnapshot | null;
  onLaunchPlanet: (planet: SpacePlanet, system: StarSystemData) => void;
  onLaunchSun: (starName: string) => void;
  onJumpSectorPlanet: (planetNumber: number) => void;
  onReturnEarth: () => void;
  onEquipAlienGun: (gunId: string) => void;
  onClaimIslandUfoLoot: () => void;
  onUseAlienLoot: (uid: string, mode: 'power_up' | 'decoration') => void;
}

export const SaturnRocketModal: React.FC<SaturnRocketModalProps> = ({
  onClose,
  spaceState,
  onLaunchPlanet,
  onLaunchSun,
  onJumpSectorPlanet,
  onReturnEarth,
  onEquipAlienGun,
  onClaimIslandUfoLoot,
  onUseAlienLoot,
}) => {
  const [tab, setTab] = useState<'multiverse' | 'sectors' | 'armory'>('multiverse');
  const [universeId, setUniverseId] = useState<number>(
    spaceState?.universeId ?? MULTIVERSE_SPACE_ENGINE.currentUniverseId,
  );
  const [galaxyIndex, setGalaxyIndex] = useState<number>(
    spaceState?.galaxyIndex ?? MULTIVERSE_SPACE_ENGINE.currentGalaxyIndex,
  );
  const [systemIndex, setSystemIndex] = useState<number>(
    spaceState?.systemIndex ?? MULTIVERSE_SPACE_ENGINE.currentSystemIndex,
  );
  const [sectorInput, setSectorInput] = useState<string>('42');
  const [lootVersion, setLootVersion] = useState(0);

  const starSystem = useMemo(
    () => MULTIVERSE_SPACE_ENGINE.generateStarSystem(universeId, galaxyIndex, systemIndex),
    [universeId, galaxyIndex, systemIndex],
  );

  const selectedUniverse = starSystem.universe;
  const lootItems = useMemo(() => {
    void lootVersion;
    return [...ALIEN_SPACE_SYSTEM.alienLootInventory];
  }, [lootVersion]);

  const handleSectorJump = (num: number) => {
    const clamped = Math.max(1, Math.min(ALIEN_SPACE_SYSTEM.totalPlanets, Math.floor(num)));
    onJumpSectorPlanet(clamped);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-5">
      <div className="relative w-full max-w-5xl max-h-[92vh] rounded-2xl bg-stone-950 border border-sky-500/50 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-slate-950 via-indigo-950/70 to-slate-950 border-b border-sky-500/30">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400/50 flex items-center justify-center text-sky-300 shrink-0">
              <Rocket className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-extrabold text-white tracking-wide truncate">
                SATURN V — MULTIVERSE &amp; SOLAR SYSTEM FLIGHT CONSOLE
              </h2>
              <p className="text-[11px] text-sky-300/90 truncate">
                {spaceState?.inSpacePlanet
                  ? `Landed on ${spaceState.planetName} (${spaceState.universeName} · ${spaceState.galaxyName})`
                  : 'Docked at Earth Launch Complex · 4 Universes · 12 Galaxies · 10,000+ Worlds'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {spaceState?.inSpacePlanet && (
              <button
                type="button"
                onClick={() => {
                  onReturnEarth();
                  onClose();
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-stone-950 text-xs font-extrabold transition"
              >
                Return to Earth
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 transition"
              aria-label="Close Saturn V Console"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-5 pt-2.5 bg-stone-950 border-b border-stone-800 overflow-x-auto">
          <button
            type="button"
            onClick={() => setTab('multiverse')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap flex items-center gap-1.5 transition ${
              tab === 'multiverse'
                ? 'border-sky-400 text-sky-300'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Orbit className="w-4 h-4" />
            <span>4 Universes &amp; Solar Systems</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('sectors')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap flex items-center gap-1.5 transition ${
              tab === 'sectors'
                ? 'border-purple-400 text-purple-300'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>10,000+ Deep Space Planets</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('armory')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap flex items-center gap-1.5 transition ${
              tab === 'armory'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>Alien Blasters &amp; UFO Loot ({lootItems.length})</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {tab === 'multiverse' && (
            <>
              {/* 4 Universe Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {MULTIVERSE_SPACE_ENGINE.universes.map((u) => {
                  const active = u.id === universeId;
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        setUniverseId(u.id);
                        setGalaxyIndex(0);
                        setSystemIndex(0);
                      }}
                      className={`text-left rounded-xl p-3 border transition ${
                        active
                          ? 'border-sky-400 bg-sky-500/15 shadow-lg'
                          : 'border-stone-800 bg-stone-900/70 hover:border-stone-600'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="w-3 h-3 rounded-full shrink-0 border border-white/40"
                          style={{ backgroundColor: u.nebulaColor }}
                        />
                        <span className="text-xs font-extrabold text-stone-100 truncate">
                          {u.name}
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-400 truncate">
                        {u.galaxies.join(' · ')}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Galaxy & Solar System Picker */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-stone-900/80 border border-stone-800 p-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-bold uppercase text-stone-400 mr-1">
                    Galaxy:
                  </span>
                  {selectedUniverse.galaxies.map((gName, idx) => (
                    <button
                      key={gName}
                      type="button"
                      onClick={() => {
                        setGalaxyIndex(idx);
                        setSystemIndex(0);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                        galaxyIndex === idx
                          ? 'bg-sky-500 border-sky-200 text-stone-950'
                          : 'bg-stone-950 border-stone-700 text-stone-300 hover:border-stone-500'
                      }`}
                    >
                      {gName}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase text-stone-400">
                    Star System:
                  </span>
                  <button
                    type="button"
                    onClick={() => setSystemIndex((s) => Math.max(0, s - 1))}
                    className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold"
                  >
                    Prev
                  </button>
                  <span className="text-xs font-mono font-bold text-amber-300 min-w-[78px] text-center">
                    {universeId === 1 && galaxyIndex === 0 && systemIndex === 0
                      ? 'Solar Sys'
                      : `System #${systemIndex + 1}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSystemIndex((s) => s + 1)}
                    className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold"
                  >
                    Next
                  </button>
                </div>
              </div>

              {/* Host Star Hazard Banner (Try launching to the Sun -> YOU BURN!) */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gradient-to-r from-amber-950/70 via-red-950/60 to-stone-950 border border-amber-500/50 p-3.5">
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-full shrink-0 border-2 border-amber-200 shadow-lg flex items-center justify-center"
                    style={{ backgroundColor: starSystem.star.color }}
                  >
                    <Flame className="w-5 h-5 text-red-900" />
                  </div>
                  <div>
                    <div className="text-sm font-extrabold text-amber-200">
                      Host Star: {starSystem.star.name} ({starSystem.star.type})
                    </div>
                    <div className="text-xs text-red-300 flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        EXTREME THERMAL HAZARD — Attempting to fly into the Sun burns the hull!
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onLaunchSun(starSystem.star.name);
                    onClose();
                  }}
                  className="px-3.5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-extrabold transition"
                >
                  Approach {starSystem.star.name} (BURN!)
                </button>
              </div>

              {/* Planets Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {starSystem.planets.map((planet) => {
                  const isEarth = planet.id === 'earth';
                  return (
                    <div
                      key={planet.id}
                      className="rounded-xl bg-stone-900/80 border border-stone-800 hover:border-sky-500/60 p-3.5 flex flex-col justify-between gap-3 transition"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-11 h-11 rounded-full shrink-0 border-2 border-white/30 shadow-inner flex items-center justify-center"
                          style={{ backgroundColor: planet.color }}
                        >
                          <Globe className="w-5 h-5 text-stone-950/70" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-extrabold text-stone-100 truncate">
                            {planet.name}
                          </div>
                          <div className="text-[11px] text-stone-400 capitalize">
                            Biome: {planet.biome.replace(/_/g, ' ')}
                          </div>
                          <div className="text-[11px] font-mono text-sky-300 mt-0.5">
                            Gravity {planet.gravity}g · Orbit {planet.orbitDist} AU
                            {planet.hasRings ? ' · Ringed' : ''}
                          </div>
                          {planet.hasUfoEncounter && (
                            <div className="text-[10px] font-bold text-emerald-400 mt-0.5">
                              UFO Signal Detected in Orbit
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (isEarth) {
                            onReturnEarth();
                          } else {
                            onLaunchPlanet(planet, starSystem);
                          }
                          onClose();
                        }}
                        className={`w-full py-2 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition ${
                          isEarth
                            ? 'bg-emerald-500 hover:bg-emerald-400 text-stone-950'
                            : 'bg-sky-500 hover:bg-sky-400 text-stone-950'
                        }`}
                      >
                        <Rocket className="w-3.5 h-3.5" />
                        <span>
                          {isEarth ? 'Land on Earth (Home Base)' : `Launch Saturn V → ${planet.name}`}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {tab === 'sectors' && (
            <div className="space-y-4">
              <div className="rounded-xl bg-stone-900/90 border border-purple-500/40 p-4 space-y-3">
                <h3 className="text-sm font-extrabold text-purple-200 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>Deep Space Hyper-Jump (10,000+ Procedural Alien Planets)</span>
                </h3>
                <p className="text-xs text-stone-300">
                  Enter any planet coordinates from <strong>1</strong> to{' '}
                  <strong>{ALIEN_SPACE_SYSTEM.totalPlanets.toLocaleString()}</strong> to warp your
                  Saturn V directly to an uncharted alien world with custom gravity and UFO encounters.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={ALIEN_SPACE_SYSTEM.totalPlanets}
                    value={sectorInput}
                    onChange={(e) => setSectorInput(e.target.value)}
                    className="w-36 rounded-lg bg-stone-950 border border-stone-700 px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-purple-400"
                  />
                  <button
                    type="button"
                    onClick={() => handleSectorJump(Number(sectorInput) || 1)}
                    className="px-4 py-2 rounded-lg bg-purple-500 hover:bg-purple-400 text-stone-950 text-xs font-extrabold transition"
                  >
                    Warp to Planet #{Math.max(1, Math.min(10000, Number(sectorInput) || 1))}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const rnd = 1 + Math.floor(Math.random() * ALIEN_SPACE_SYSTEM.totalPlanets);
                      setSectorInput(String(rnd));
                      handleSectorJump(rnd);
                    }}
                    className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-stone-950 text-xs font-extrabold transition"
                  >
                    Random Deep-Space Jump
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {ALIEN_SPACE_SYSTEM.portalGearTiers.map((tier) => (
                  <div
                    key={tier.tier}
                    className="rounded-xl bg-stone-900/70 border border-stone-800 p-3.5"
                  >
                    <div className="text-[11px] font-bold uppercase text-purple-400">
                      Portal Gear Tier {tier.tier}
                    </div>
                    <div className="text-sm font-extrabold text-stone-100 mt-0.5">
                      {tier.name}
                    </div>
                    <div className="text-xs text-stone-400 mt-1">
                      Max Jump Range: {tier.maxJumpRange.toLocaleString()} LY
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'armory' && (
            <div className="space-y-4">
              {/* Infinite-Energy Alien Guns */}
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-sky-300 mb-2">
                  Infinite-Energy Alien Weapons (Zero Ammo Drain)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ALIEN_SPACE_SYSTEM.alienGuns.map((gun) => {
                    const equipped = spaceState?.equippedAlienGunId === gun.id;
                    return (
                      <div
                        key={gun.id}
                        className={`rounded-xl p-3.5 border flex items-center justify-between gap-3 ${
                          equipped
                            ? 'border-sky-400 bg-sky-500/15'
                            : 'border-stone-800 bg-stone-900/80'
                        }`}
                      >
                        <div>
                          <div className="text-sm font-extrabold text-white">{gun.name}</div>
                          <div className="text-xs text-stone-400">
                            Damage {gun.damage} · Cooldown {gun.fireCooldownMs}ms ·{' '}
                            <span className="text-emerald-400 font-bold">UNLIMITED ENERGY</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onEquipAlienGun(gun.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-extrabold shrink-0 transition ${
                            equipped
                              ? 'bg-emerald-500 text-stone-950'
                              : 'bg-sky-500 hover:bg-sky-400 text-stone-950'
                          }`}
                        >
                          {equipped ? 'Equipped' : 'Equip'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Island-Landed UFO */}
              <div className="rounded-xl bg-stone-900/80 border border-emerald-500/40 p-3.5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-extrabold text-emerald-300">
                    Island-Landed Alien UFO (Coords: X: 40, Z: -35)
                  </div>
                  <div className="text-xs text-stone-400">
                    A glowing saucer landed on the main island carrying a Rift Portal Coil &amp;
                    Glowing Saucer Relic.
                  </div>
                </div>
                <button
                  type="button"
                  disabled={spaceState?.islandUfoClaimed}
                  onClick={() => {
                    onClaimIslandUfoLoot();
                    setLootVersion((v) => v + 1);
                  }}
                  className={`px-3.5 py-2 rounded-lg text-xs font-extrabold transition ${
                    spaceState?.islandUfoClaimed
                      ? 'bg-stone-800 text-stone-500 cursor-not-allowed'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-stone-950'
                  }`}
                >
                  {spaceState?.islandUfoClaimed ? 'Island UFO Loot Claimed' : 'Claim Island UFO Loot'}
                </button>
              </div>

              {/* Collected Alien Loot */}
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-300 mb-2">
                  Collected Alien Loot ({lootItems.length}) · Earth Power-Ups:{' '}
                  {spaceState?.earthPowerUps ?? 0}
                </h3>
                {lootItems.length === 0 ? (
                  <div className="rounded-xl bg-stone-900/60 border border-stone-800 p-4 text-xs text-stone-400 text-center">
                    Shoot down hovering Alien UFOs on other planets or claim the Island-Landed UFO
                    to collect Alien Power Cores &amp; Relics!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {lootItems.map((item) => (
                      <div
                        key={item.uid}
                        className="rounded-xl bg-stone-900 border border-stone-800 p-3 flex items-center justify-between gap-2"
                      >
                        <div>
                          <div className="text-xs font-extrabold text-stone-100">{item.name}</div>
                          <div className="text-[11px] text-stone-400">
                            {item.appliedToEarth
                              ? `Active (${item.mode === 'power_up' ? 'Earth Power-Up' : 'Base Decor'})`
                              : 'Ready to install'}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              onUseAlienLoot(item.uid, 'power_up');
                              setLootVersion((v) => v + 1);
                            }}
                            className="px-2.5 py-1 rounded bg-sky-500 hover:bg-sky-400 text-stone-950 text-[11px] font-extrabold"
                          >
                            Power Up
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onUseAlienLoot(item.uid, 'decoration');
                              setLootVersion((v) => v + 1);
                            }}
                            className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-stone-950 text-[11px] font-extrabold"
                          >
                            Place Decor
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
