'use client';

import React, { useCallback, useState } from 'react';
import {
  BadgeCheck,
  Building2,
  Car,
  CheckCircle2,
  CircleDollarSign,
  Coins,
  Crosshair,
  Flame,
  Gauge,
  Hammer,
  Home,
  Lock,
  MapPin,
  Music,
  Navigation,
  Package,
  Route,
  Shield,
  Shirt,
  Ship,
  Sparkles,
  Store,
  Trophy,
  Users,
  Waves,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import type { GameEngine } from '@/game/engine/GameEngine';
import type { HUDStateSnapshot } from '@/game/types';
import {
  MAINLAND_FAST_TRAVEL,
  MAINLAND_FACTIONS,
  MAINLAND_GARAGE_PACKAGES,
  MAINLAND_OUTFITS,
  MAINLAND_PROPERTIES,
  MAINLAND_UPGRADES,
  type MainlandActionResult,
  type MainlandBuildId,
  type MainlandFactionId,
  type MainlandOutfitId,
  type MainlandPropertyId,
  type MainlandTab,
  type MainlandUpgradeId,
} from '@/game/systems/louisianaMainland';

interface LouisianaMainlandModalProps {
  engine: GameEngine;
  hud: HUDStateSnapshot;
  initialTab?: MainlandTab;
  onClose: () => void;
  onOpenIslandFeature?: (
    modal: 'crafting' | 'vehicles' | 'multiverse' | 'missions' | 'map' | 'ecosystem_journal' | 'dragon_sanctuary',
  ) => void;
}

const TABS: { id: MainlandTab; label: string; icon: React.ReactNode }[] = [
  { id: 'district', label: 'District', icon: <MapPin className="w-4 h-4" /> },
  { id: 'garage', label: 'Garage', icon: <Car className="w-4 h-4" /> },
  { id: 'heat', label: 'Heat', icon: <Flame className="w-4 h-4" /> },
  { id: 'safehouse', label: 'Safehouse', icon: <Home className="w-4 h-4" /> },
  { id: 'market', label: 'Market', icon: <Store className="w-4 h-4" /> },
  { id: 'transit', label: 'Transit', icon: <Ship className="w-4 h-4" /> },
  { id: 'outfitter', label: 'Outfitter', icon: <Shirt className="w-4 h-4" /> },
  { id: 'challenges', label: 'Legacy', icon: <Trophy className="w-4 h-4" /> },
];

const HEAT_COLORS = ['#22c55e', '#facc15', '#f59e0b', '#f97316', '#ef4444', '#dc2626'];

function HeatStars({ heat, large = false }: { heat: number; large?: boolean }) {
  return (
    <div className="flex items-center gap-1" aria-label={`${heat} of 5 heat`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={`${large ? 'w-3 h-3' : 'w-2 h-2'} rounded-full border ${
            i < heat
              ? 'border-amber-300 bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.55)]'
              : 'border-stone-700 bg-stone-800'
          }`}
        />
      ))}
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
  accent = 'text-amber-300',
}: {
  label: string;
  value: React.ReactNode;
  detail?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-stone-800 bg-stone-950/80 p-3">
      <div className="text-[10px] uppercase tracking-wide text-stone-500">{label}</div>
      <div className={`mt-0.5 font-mono-tabular text-lg font-bold ${accent}`}>{value}</div>
      {detail && <div className="mt-0.5 text-[10px] text-stone-500">{detail}</div>}
    </div>
  );
}

export function LouisianaMainlandModal({
  engine,
  hud,
  initialTab = 'district',
  onClose,
  onOpenIslandFeature,
}: LouisianaMainlandModalProps) {
  const [tab, setTab] = useState<MainlandTab>(initialTab);
  const [snapshot, setSnapshot] = useState(() => engine.getMainlandSnapshot());
  const [message, setMessage] = useState<string | null>(null);
  const [messageOk, setMessageOk] = useState(true);

  const refresh = useCallback(() => {
    setSnapshot(engine.getMainlandSnapshot());
  }, [engine]);

  const run = useCallback(
    (result: MainlandActionResult) => {
      setMessage(result.message);
      setMessageOk(result.ok);
      refresh();
    },
    [refresh],
  );

  const activeVehicleLabel = hud.activeVehicle?.name ?? 'No vehicle selected';
  const ownedProperties = new Set(snapshot.ownedProperties);
  const ownedUpgrades = new Set(snapshot.ownedUpgrades);
  const ownedPackages = new Set(snapshot.ownedPackages);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-5">
      <div className="w-full max-w-5xl max-h-[92vh] overflow-hidden rounded-2xl border border-amber-500/35 bg-stone-950 shadow-[0_30px_90px_rgba(0,0,0,0.8)] flex flex-col">
        <div className="relative overflow-hidden border-b border-stone-800 bg-gradient-to-r from-stone-950 via-stone-900 to-amber-950/60 px-4 py-3 sm:px-5">
          <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-amber-500/10 blur-2xl" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-amber-400/90">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]" />
                Louisiana Mainland · Crescent City
              </div>
              <h2 className="mt-0.5 truncate font-display text-xl sm:text-2xl font-black text-stone-50">
                City Network
              </h2>
              <p className="mt-0.5 text-[11px] text-stone-400">
                Bayou backroads, hydraulics, street heat and a one-way tunnel into the island.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="hidden sm:flex flex-col items-end rounded-lg border border-stone-700 bg-stone-950/80 px-2.5 py-1.5">
                <span className="text-[9px] uppercase tracking-wide text-stone-500">Wallet</span>
                <span className="flex items-center gap-1 font-mono-tabular text-sm font-bold text-amber-300">
                  <Coins className="w-3.5 h-3.5" />
                  {hud.coins}
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-stone-700 bg-stone-900 p-2 text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition"
                aria-label="Close city network"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-3 rounded-lg border border-stone-800 bg-stone-950/70 px-3 py-1.5 text-[11px]">
            <span className="flex items-center gap-1 font-semibold text-amber-200">
              <Gauge className="w-3.5 h-3.5" />
              {snapshot.cityTier}
            </span>
            <span className="text-stone-700">|</span>
            <span className="flex items-center gap-1 text-stone-300">
              <Home className="w-3.5 h-3.5 text-emerald-400" />
              {snapshot.ownedProperties.length}/4 properties
            </span>
            <span className="text-stone-700">|</span>
            <span className="flex items-center gap-1 text-stone-300">
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              {snapshot.pursuitActive ? `Pursuit · ${snapshot.pursuitUnits} units` : 'Heat clean'}
            </span>
            <span className="ml-auto hidden items-center gap-1 text-stone-400 sm:flex">
              <Car className="w-3.5 h-3.5 text-sky-400" />
              <span className="max-w-[180px] truncate">{activeVehicleLabel}</span>
            </span>
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-stone-800 bg-stone-900/60 px-2 py-1.5 survival-scroll">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setTab(item.id);
                setMessage(null);
              }}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition ${
                tab === item.id
                  ? 'bg-amber-500 text-stone-950 shadow-lg shadow-amber-500/20'
                  : 'text-stone-400 hover:bg-stone-800 hover:text-stone-100'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>

        {message && (
          <div
            className={`mx-3 mt-3 flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-[11px] sm:mx-5 ${
              messageOk
                ? 'border-emerald-500/40 bg-emerald-950/50 text-emerald-200'
                : 'border-amber-500/40 bg-amber-950/50 text-amber-200'
            }`}
          >
            <span className="flex items-center gap-1.5">
              {messageOk ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              {message}
            </span>
            <button type="button" onClick={() => setMessage(null)} className="opacity-60 hover:opacity-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto survival-scroll p-3 sm:p-5">
          {tab === 'district' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <StatCard label="Heat" value={<HeatStars heat={snapshot.heat} large />} detail={snapshot.pursuitActive ? 'Active pursuit' : 'No active units'} />
                <StatCard label="Drift best" value={Math.round(snapshot.bestDrift).toLocaleString()} detail="Street drift score" accent="text-orange-300" />
                <StatCard label="City distance" value={`${snapshot.cityKilometers.toFixed(1)} km`} detail="Driven on the mainland" accent="text-sky-300" />
                <StatCard label="Takedowns" value={snapshot.takedowns} detail={`${snapshot.escapes} clean escapes`} accent="text-fuchsia-300" />
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <div className="rounded-xl border border-stone-800 bg-stone-950/70 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-stone-100">
                      <Crosshair className="w-4 h-4 text-red-400" />
                      Street Heat
                    </h3>
                    <HeatStars heat={snapshot.heat} />
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-stone-400">
                    Start a run, then break line of sight through the bayou, the parking garage roof or an owned safehouse.
                    Fast driving fills the escape meter; stopping too long gets you busted.
                  </p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 transition-all"
                      style={{ width: `${snapshot.escapeProgress}%` }}
                    />
                  </div>
                  <div className="mt-1 flex justify-between text-[10px] text-stone-500">
                    <span>Escape line</span>
                    <span>{Math.round(snapshot.escapeProgress)}%</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[1, 3, 5].map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => run(engine.mainlandStartHeatRun(level))}
                        className="rounded-lg border border-red-500/40 bg-red-950/50 px-3 py-2 text-xs font-bold text-red-200 hover:bg-red-600 hover:text-white transition"
                      >
                        {level} star run
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => run(engine.mainlandAttemptTakedown())}
                      className="rounded-lg border border-amber-500/40 bg-amber-950/40 px-3 py-2 text-xs font-bold text-amber-200 hover:bg-amber-500 hover:text-stone-950 transition"
                    >
                      PIT takedown
                    </button>
                    <button
                      type="button"
                      onClick={() => run(engine.mainlandAttemptEscape())}
                      className="rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-3 py-2 text-xs font-bold text-emerald-200 hover:bg-emerald-500 hover:text-stone-950 transition"
                    >
                      Break line of sight
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-stone-800 bg-stone-950/70 p-4">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-stone-100">
                    <Car className="w-4 h-4 text-sky-400" />
                    Active Ride
                  </h3>
                  <div className="mt-2 rounded-lg border border-stone-800 bg-stone-900/70 p-3">
                    <div className="font-bold text-stone-100">{activeVehicleLabel}</div>
                    <div className="mt-1 grid grid-cols-2 gap-2 text-[11px] text-stone-400">
                      <span className="flex items-center gap-1">
                        <Gauge className="w-3 h-3 text-sky-400" />
                        {hud.activeVehicle ? `${hud.activeVehicle.speedKmh} km/h` : 'Parked / on foot'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Wrench className="w-3 h-3 text-amber-400" />
                        {snapshot.equippedPackage.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTab('garage')}
                      className="rounded-lg border border-sky-500/40 bg-sky-950/50 px-3 py-2 text-xs font-bold text-sky-200 hover:bg-sky-500 hover:text-stone-950 transition"
                    >
                      Open garage
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const result = engine.mainlandBoardTransit('island');
                        run(result);
                      }}
                      className="rounded-lg border border-cyan-500/40 bg-cyan-950/50 px-3 py-2 text-xs font-bold text-cyan-200 hover:bg-cyan-500 hover:text-stone-950 transition"
                    >
                      Cross to island
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-stone-800 bg-stone-950/70 p-4">
                <h3 className="flex items-center gap-2 text-sm font-bold text-stone-100">
                  <Navigation className="w-4 h-4 text-amber-400" />
                  District Routes
                </h3>
                <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    ['Bayou backroads', 'Cypress marsh, wooden docks and dirt roads', <Waves key="w" className="w-4 h-4" />],
                    ['French Quarter blocks', 'Pastel townhouses, galleries and streetcar rails', <Building2 key="b" className="w-4 h-4" />],
                    ['Parking garage', 'Three decks, ramps and a rooftop stunt jump', <Route key="r" className="w-4 h-4" />],
                    ['Flood tunnels', 'Bunker vaults and service tunnels under the city', <Lock key="l" className="w-4 h-4" />],
                    ['Highway ramps', 'Elevated sweepers and drift entries', <Zap key="z" className="w-4 h-4" />],
                    ['Riverfront', 'Airboat mooring and island transit', <Ship key="s" className="w-4 h-4" />],
                  ].map(([title, detail, icon]) => (
                    <div key={String(title)} className="rounded-lg border border-stone-800 bg-stone-900/60 p-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-stone-100">
                        <span className="text-amber-400">{icon}</span>
                        {title}
                      </div>
                      <div className="mt-1 text-[10px] text-stone-500">{detail}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'garage' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-sky-500/30 bg-sky-950/20 p-3">
                <div>
                  <div className="text-xs font-bold text-sky-200">Bayou Customs · three tuning bays</div>
                  <div className="text-[10px] text-stone-400">
                    Reuses the existing lowrider, DONK and SLAB vehicle profiles. No new cars are added.
                  </div>
                </div>
                <div className="rounded-lg border border-stone-700 bg-stone-950 px-3 py-1.5 text-[11px] text-stone-300">
                  Tuning target: <span className="font-bold text-sky-300">{activeVehicleLabel}</span>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {MAINLAND_GARAGE_PACKAGES.map((pkg) => {
                  const owned = ownedPackages.has(pkg.id);
                  const equipped = snapshot.equippedPackage === pkg.id;
                  return (
                    <div
                      key={pkg.id}
                      className={`rounded-xl border p-4 ${
                        equipped ? 'border-sky-400/60 bg-sky-950/30' : 'border-stone-800 bg-stone-950/70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 text-sm font-bold text-stone-100">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: pkg.accent }} />
                            {pkg.name}
                          </div>
                          <div className="mt-0.5 text-[10px] uppercase tracking-wide text-stone-500">{pkg.subtitle}</div>
                        </div>
                        {equipped && <BadgeCheck className="h-5 w-5 shrink-0 text-sky-300" />}
                      </div>
                      <p className="mt-2 text-[11px] leading-relaxed text-stone-400">{pkg.description}</p>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1 text-[11px] font-bold text-amber-300">
                          <Coins className="w-3.5 h-3.5" />
                          {owned ? 'Owned' : pkg.price}
                        </span>
                        <button
                          type="button"
                          onClick={() => run(engine.mainlandApplyGaragePackage(pkg.id as MainlandBuildId))}
                          className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                            equipped
                              ? 'border border-stone-700 bg-stone-900 text-stone-400'
                              : 'bg-sky-500 text-stone-950 hover:bg-sky-400'
                          }`}
                        >
                          {equipped ? 'Equipped' : owned ? 'Install' : 'Buy & install'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 text-[11px] text-amber-200/90">
                <span className="font-bold">Zero new cars:</span> these packages tune vehicles already in the garage.
                Lowrider hydraulics, DONK lift, SLAB swangers and subwoofer trunks all use the existing vehicle presets
                and the game&apos;s real hydraulic/drift physics.
              </div>
            </div>
          )}

          {tab === 'heat' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-red-500/30 bg-gradient-to-br from-red-950/40 to-stone-950 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-red-300/80">Crescent City Police</div>
                    <div className="mt-1 flex items-center gap-3">
                      <HeatStars heat={snapshot.heat} large />
                      <span className="text-lg font-black text-stone-100">
                        {snapshot.pursuitActive ? `Pursuit · ${snapshot.pursuitUnits} units` : 'No active pursuit'}
                      </span>
                    </div>
                  </div>
                  <div className="rounded-lg border border-red-500/30 bg-stone-950/70 px-3 py-2 text-[11px] text-red-200">
                    {snapshot.pursuitActive
                      ? `${Math.round(snapshot.escapeProgress)}% escape line`
                      : `${snapshot.escapes} escapes · ${snapshot.bustedCount} busts`}
                  </div>
                </div>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-stone-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-red-600"
                    style={{ width: `${snapshot.escapeProgress}%` }}
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => run(engine.mainlandStartHeatRun(level))}
                      className="rounded-lg border border-red-500/40 bg-red-950/50 px-3 py-2 text-xs font-bold text-red-200 hover:bg-red-600 hover:text-white transition"
                    >
                      {level}★
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => run(engine.mainlandAttemptTakedown())}
                    className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-black text-stone-950 hover:bg-amber-400 transition"
                  >
                    Dynamic PIT takedown
                  </button>
                  <button
                    type="button"
                    onClick={() => run(engine.mainlandAttemptEscape())}
                    className="rounded-lg border border-emerald-500/40 bg-emerald-950/50 px-3 py-2 text-xs font-bold text-emerald-200 hover:bg-emerald-500 hover:text-stone-950 transition"
                  >
                    Break line of sight
                  </button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <StatCard label="Takedowns" value={snapshot.takedowns} detail="PIT + dynamic escapes" accent="text-amber-300" />
                <StatCard label="Clean escapes" value={snapshot.escapes} detail="Heat fully cleared" accent="text-emerald-300" />
                <StatCard label="Busted" value={snapshot.bustedCount} detail="Stopped for too long" accent="text-red-300" />
              </div>

              <div className="rounded-xl border border-stone-800 bg-stone-950/70 p-4 text-[11px] leading-relaxed text-stone-400">
                <div className="mb-1 flex items-center gap-2 text-xs font-bold text-stone-100">
                  <Shield className="w-4 h-4 text-red-400" />
                  How to lose the heat
                </div>
                Reach an owned safehouse, hold 62+ km/h to open distance, or chain a PIT takedown. The escape meter fills
                during fast driving and at a safehouse. If you stop below 6 km/h for 9 seconds, the units box you in.
              </div>
            </div>
          )}

          {tab === 'safehouse' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <StatCard label="Properties" value={`${snapshot.ownedProperties.length}/4`} detail="Deeded mainland real estate" accent="text-emerald-300" />
                <StatCard label="Income ready" value={`${snapshot.incomeReady}`} detail="Coins available today" />
                <StatCard label="Stash locker" value={snapshot.safehouseSuppliesReady ? 'Ready' : 'Claimed'} detail="Ammo · rations · water" accent="text-sky-300" />
                <StatCard label="Vaults" value={snapshot.vaultsLooted} detail="Tunnel caches looted" accent="text-fuchsia-300" />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => run(engine.mainlandClaimIncome())}
                  className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-bold text-stone-950 hover:bg-emerald-400 transition"
                >
                  Collect {snapshot.incomeReady} property income
                </button>
                <button
                  type="button"
                  onClick={() => run(engine.mainlandClaimSafehouseSupplies())}
                  className="rounded-lg border border-sky-500/40 bg-sky-950/50 px-3 py-2 text-xs font-bold text-sky-200 hover:bg-sky-500 hover:text-stone-950 transition"
                >
                  Open stash locker
                </button>
                <button
                  type="button"
                  onClick={() => run(engine.mainlandLootVault())}
                  className="rounded-lg border border-fuchsia-500/40 bg-fuchsia-950/50 px-3 py-2 text-xs font-bold text-fuchsia-200 hover:bg-fuchsia-500 hover:text-stone-950 transition"
                >
                  Loot tunnel vault
                </button>
                {onOpenIslandFeature && (
                  <button
                    type="button"
                    onClick={() => onOpenIslandFeature('crafting')}
                    className="rounded-lg border border-amber-500/40 bg-amber-950/50 px-3 py-2 text-xs font-bold text-amber-200 hover:bg-amber-500 hover:text-stone-950 transition"
                  >
                    Open weapon workbench
                  </button>
                )}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {MAINLAND_PROPERTIES.map((property) => {
                  const owned = ownedProperties.has(property.id);
                  const active = snapshot.activeSafehouse === property.id;
                  return (
                    <div
                      key={property.id}
                      className={`rounded-xl border p-4 ${
                        active ? 'border-emerald-400/60 bg-emerald-950/25' : 'border-stone-800 bg-stone-950/70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-bold text-stone-100">{property.name}</div>
                          <div className="text-[10px] uppercase tracking-wide text-stone-500">{property.subtitle}</div>
                        </div>
                        <span className="rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ backgroundColor: `${property.accent}22`, color: property.accent }}>
                          {owned ? (active ? 'Active' : 'Owned') : 'For sale'}
                        </span>
                      </div>
                      <p className="mt-2 text-[11px] text-stone-400">{property.description}</p>
                      <div className="mt-2 flex items-center gap-2 text-[10px] text-stone-500">
                        <span className="flex items-center gap-1"><Coins className="w-3 h-3 text-amber-400" />{property.price}</span>
                        <span>·</span>
                        <span>{property.dailyIncome}/day</span>
                        <span>·</span>
                        <span>{property.stashSlots} stash slots</span>
                      </div>
                      <div className="mt-3 flex gap-2">
                        {owned ? (
                          <button
                            type="button"
                            onClick={() => run(engine.mainlandSetActiveSafehouse(property.id))}
                            className="flex-1 rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-3 py-2 text-xs font-bold text-emerald-200 hover:bg-emerald-500 hover:text-stone-950 transition"
                          >
                            {active ? 'Active safehouse' : 'Set as safehouse'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => run(engine.mainlandPurchaseProperty(property.id as MainlandPropertyId))}
                            className="flex-1 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-bold text-stone-950 hover:bg-emerald-400 transition"
                          >
                            Buy deed · {property.price}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'market' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 text-[11px] text-amber-200/90">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-100">
                  <Store className="w-4 h-4" />
                  Crescent City Marketplace
                </div>
                <div className="mt-1">
                  Property income, stash network, armory benches and faction jobs feed the same coin economy as the island.
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {MAINLAND_UPGRADES.map((upgrade) => {
                  const owned = ownedUpgrades.has(upgrade.id);
                  return (
                    <div key={upgrade.id} className="rounded-xl border border-stone-800 bg-stone-950/70 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 text-sm font-bold text-stone-100">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: upgrade.accent }} />
                            {upgrade.name}
                          </div>
                          <div className="text-[10px] uppercase tracking-wide text-stone-500">{upgrade.subtitle}</div>
                        </div>
                        {owned && <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />}
                      </div>
                      <p className="mt-2 text-[11px] text-stone-400">{upgrade.description}</p>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="flex items-center gap-1 text-[11px] font-bold text-amber-300">
                          <Coins className="w-3.5 h-3.5" />
                          {owned ? 'Installed' : upgrade.price}
                        </span>
                        <button
                          type="button"
                          disabled={owned}
                          onClick={() => run(engine.mainlandBuyUpgrade(upgrade.id as MainlandUpgradeId))}
                          className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                            owned
                              ? 'cursor-default border border-stone-800 bg-stone-900 text-stone-500'
                              : 'bg-amber-500 text-stone-950 hover:bg-amber-400'
                          }`}
                        >
                          {owned ? 'Owned' : 'Install'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-xl border border-stone-800 bg-stone-950/70 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-bold text-stone-100">
                  <Users className="w-4 h-4 text-fuchsia-400" />
                  Faction Jobs
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {MAINLAND_FACTIONS.map((faction) => (
                    <div key={faction.id} className="rounded-lg border border-stone-800 bg-stone-900/60 p-3">
                      <div className="text-xs font-bold" style={{ color: faction.accent }}>{faction.name}</div>
                      <div className="text-[10px] text-stone-500">{faction.territory}</div>
                      <div className="mt-1 text-[10px] text-stone-400">{faction.description}</div>
                      <button
                        type="button"
                        onClick={() => run(engine.mainlandRunFactionJob(faction.id as MainlandFactionId))}
                        className="mt-2 w-full rounded-lg bg-stone-800 px-2 py-1.5 text-[10px] font-bold text-stone-200 hover:bg-fuchsia-500 hover:text-stone-950 transition"
                      >
                        Run job · +45 coins
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'transit' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-bold text-cyan-100">
                      <Ship className="w-4 h-4" />
                      Riverfront Airboat
                    </div>
                    <div className="mt-1 text-[11px] text-stone-400">
                      Shallow-draft crossing between Crescent City and the island landing.
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => run(engine.mainlandBoardTransit('island'))}
                      className="rounded-lg bg-cyan-500 px-3 py-2 text-xs font-bold text-stone-950 hover:bg-cyan-400 transition"
                    >
                      Cross to island
                    </button>
                    <button
                      type="button"
                      onClick={() => run(engine.mainlandBoardTransit('city'))}
                      className="rounded-lg border border-cyan-500/40 bg-stone-950/70 px-3 py-2 text-xs font-bold text-cyan-200 hover:bg-cyan-500 hover:text-stone-950 transition"
                    >
                      Return to city
                    </button>
                  </div>
                </div>
                <div className="mt-2 text-[10px] text-stone-500">
                  Airboat crossings: {snapshot.boatTrips} · unlock the Riverfront Dock or Swamp Navigator upgrade for the city route.
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {MAINLAND_FAST_TRAVEL.map((point) => {
                  const unlocked = snapshot.unlockedPoints.includes(point.id);
                  return (
                    <div key={point.id} className="rounded-xl border border-stone-800 bg-stone-950/70 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 text-sm font-bold text-stone-100">
                            <MapPin className="h-4 w-4" style={{ color: point.accent }} />
                            {point.name}
                          </div>
                          <div className="text-[10px] uppercase tracking-wide text-stone-500">{point.subtitle}</div>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${point.region === 'island' ? 'bg-amber-500/20 text-amber-300' : 'bg-cyan-500/20 text-cyan-300'}`}>
                          {point.region}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-[10px] text-stone-500">
                          {unlocked ? `${Math.round(point.x)}, ${Math.round(point.z)} · unlocked` : 'Locked · buy property or map'}
                        </span>
                        <button
                          type="button"
                          disabled={!unlocked}
                          onClick={() => run(engine.mainlandFastTravel(point.id))}
                          className={`flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold transition ${
                            unlocked
                              ? 'bg-stone-800 text-stone-100 hover:bg-amber-500 hover:text-stone-950'
                              : 'cursor-not-allowed border border-stone-800 bg-stone-900 text-stone-600'
                          }`}
                        >
                          {unlocked ? <Navigation className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                          Travel
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'outfitter' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-fuchsia-500/30 bg-fuchsia-950/20 p-3">
                <div className="flex items-center gap-2 text-sm font-bold text-fuchsia-100">
                  <Shirt className="w-4 h-4" />
                  Outfits & Loadout Presets
                </div>
                <div className="mt-1 text-[11px] text-stone-400">
                  Each preset applies the jacket/pants colors to your 3rd-person avatar and swaps your hotbar to the
                  matching owned gear. Instant switching, no menu nesting.
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {MAINLAND_OUTFITS.map((outfit) => {
                  const active = snapshot.activeOutfit === outfit.id;
                  return (
                    <div
                      key={outfit.id}
                      className={`rounded-xl border p-4 ${
                        active ? 'border-fuchsia-400/60 bg-fuchsia-950/25' : 'border-stone-800 bg-stone-950/70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="flex h-10 w-10 items-center justify-center rounded-lg border" style={{ borderColor: `${outfit.accent}55`, backgroundColor: `${outfit.accent}1a` }}>
                            <Shirt className="h-5 w-5" style={{ color: outfit.accent }} />
                          </span>
                          <div>
                            <div className="text-sm font-bold text-stone-100">{outfit.name}</div>
                            <div className="text-[10px] uppercase tracking-wide text-stone-500">{outfit.subtitle}</div>
                          </div>
                        </div>
                        {active && <BadgeCheck className="h-5 w-5 shrink-0 text-fuchsia-300" />}
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <span className="h-4 w-4 rounded border border-stone-600" style={{ backgroundColor: outfit.jacketHex }} />
                        <span className="h-4 w-4 rounded border border-stone-600" style={{ backgroundColor: outfit.pantsHex }} />
                        <span className="text-[10px] text-stone-500">{outfit.hotbar.length} loadout slots</span>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => run(engine.mainlandEquipOutfit(outfit.id as MainlandOutfitId))}
                          className="flex-1 rounded-lg border border-fuchsia-500/40 bg-fuchsia-950/40 px-3 py-2 text-xs font-bold text-fuchsia-200 hover:bg-fuchsia-500 hover:text-stone-950 transition"
                        >
                          Wear outfit
                        </button>
                        <button
                          type="button"
                          onClick={() => run(engine.mainlandEquipOutfit(outfit.id as MainlandOutfitId, true))}
                          className="flex-1 rounded-lg bg-fuchsia-500 px-3 py-2 text-xs font-bold text-stone-950 hover:bg-fuchsia-400 transition"
                        >
                          Apply + loadout
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-xl border border-stone-800 bg-stone-950/70 p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-stone-100">
                  <Music className="w-4 h-4 text-amber-400" />
                  Car Culture Radio
                </div>
                <div className="mt-1 text-[11px] text-stone-400">
                  The existing car radio and subwoofer trunk systems stay available while cruising. Use the vehicle radio
                  hotkey inside a car; the subwoofer package above feeds the same audio system.
                </div>
              </div>
            </div>
          )}

          {tab === 'challenges' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <StatCard label="Milestones" value={`${snapshot.claimedChallengeCount}/${snapshot.totalChallengeCount}`} detail="Claimed rewards" accent="text-amber-300" />
                <StatCard label="Island bosses" value={snapshot.crossWorldBosses} detail="Boss hunts completed" accent="text-rose-300" />
                <StatCard label="Structures" value={snapshot.crossWorldStructures} detail="Built across both regions" accent="text-emerald-300" />
                <StatCard label="Blood moons" value={snapshot.crossWorldBloodMoons} detail="Survived nights" accent="text-red-300" />
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                {snapshot.challenges.map((challenge) => {
                  const pct = Math.min(100, (challenge.progress / Math.max(1, challenge.target)) * 100);
                  return (
                    <div key={challenge.id} className="rounded-xl border border-stone-800 bg-stone-950/70 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 text-xs font-bold text-stone-100">
                            <Trophy className="w-3.5 h-3.5" style={{ color: challenge.accent }} />
                            {challenge.name}
                          </div>
                          <div className="mt-0.5 text-[10px] text-stone-500">{challenge.description}</div>
                        </div>
                        <span className="font-mono-tabular text-[10px] text-stone-400">
                          {challenge.progress}/{challenge.target}
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-800">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: challenge.accent }} />
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="flex items-center gap-1 text-[10px] text-amber-300">
                          <Coins className="w-3 h-3" />
                          {challenge.rewardCoins}
                        </span>
                        <button
                          type="button"
                          disabled={!challenge.complete || challenge.claimed}
                          onClick={() => run(engine.mainlandClaimChallenge(challenge.id))}
                          className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition ${
                            challenge.claimed
                              ? 'cursor-default border border-stone-800 bg-stone-900 text-stone-500'
                              : challenge.complete
                                ? 'bg-amber-500 text-stone-950 hover:bg-amber-400'
                                : 'cursor-not-allowed border border-stone-800 bg-stone-900 text-stone-600'
                          }`}
                        >
                          {challenge.claimed ? 'Claimed' : challenge.complete ? 'Claim reward' : 'In progress'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-xl border border-stone-800 bg-stone-950/70 p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-stone-100">
                  <Sparkles className="w-4 h-4 text-violet-400" />
                  Island & Cross-World Ops
                </div>
                <div className="mt-1 text-[11px] text-stone-400">
                  The island already owns the Minecraft-style survival, building, portals, wildlife and boss systems.
                  Jump straight into those systems without leaving the city network.
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {onOpenIslandFeature && (
                    <>
                      <button type="button" onClick={() => onOpenIslandFeature('crafting')} className="flex items-center gap-1.5 rounded-lg border border-stone-700 bg-stone-900 px-2.5 py-2 text-[11px] font-bold text-stone-200 hover:bg-emerald-500 hover:text-stone-950 transition">
                        <Hammer className="w-3.5 h-3.5" /> Build & craft
                      </button>
                      <button type="button" onClick={() => onOpenIslandFeature('multiverse')} className="flex items-center gap-1.5 rounded-lg border border-stone-700 bg-stone-900 px-2.5 py-2 text-[11px] font-bold text-stone-200 hover:bg-violet-500 hover:text-stone-950 transition">
                        <Sparkles className="w-3.5 h-3.5" /> Boss realms
                      </button>
                      <button type="button" onClick={() => onOpenIslandFeature('missions')} className="flex items-center gap-1.5 rounded-lg border border-stone-700 bg-stone-900 px-2.5 py-2 text-[11px] font-bold text-stone-200 hover:bg-amber-500 hover:text-stone-950 transition">
                        <Trophy className="w-3.5 h-3.5" /> Boss hunts
                      </button>
                      <button type="button" onClick={() => onOpenIslandFeature('ecosystem_journal')} className="flex items-center gap-1.5 rounded-lg border border-stone-700 bg-stone-900 px-2.5 py-2 text-[11px] font-bold text-stone-200 hover:bg-emerald-500 hover:text-stone-950 transition">
                        <Waves className="w-3.5 h-3.5" /> Wildlife
                      </button>
                      <button type="button" onClick={() => onOpenIslandFeature('vehicles')} className="flex items-center gap-1.5 rounded-lg border border-stone-700 bg-stone-900 px-2.5 py-2 text-[11px] font-bold text-stone-200 hover:bg-sky-500 hover:text-stone-950 transition">
                        <Car className="w-3.5 h-3.5" /> Boats & aircraft
                      </button>
                      <button type="button" onClick={() => onOpenIslandFeature('dragon_sanctuary')} className="flex items-center gap-1.5 rounded-lg border border-stone-700 bg-stone-900 px-2.5 py-2 text-[11px] font-bold text-stone-200 hover:bg-orange-500 hover:text-stone-950 transition">
                        <Flame className="w-3.5 h-3.5" /> Dragon Valley
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-stone-800 bg-stone-950 px-4 py-2.5 text-[10px] text-stone-500">
          <span className="flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-amber-400" />
            Zero new cars · existing vehicle profiles only · 60 FPS frame clamp preserved
          </span>
          <span className="hidden items-center gap-1.5 sm:flex">
            <CircleDollarSign className="w-3.5 h-3.5 text-emerald-400" />
            Shared coin economy with the island
          </span>
        </div>
      </div>
    </div>
  );
}
