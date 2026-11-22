'use client';

import React, { useCallback, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Award,
  Building2,
  Camera,
  Car,
  CheckCircle2,
  CloudLightning,
  Compass,
  Droplets,
  Gauge,
  Hammer,
  Handshake,
  Heart,
  Home,
  Landmark,
  Leaf,
  MapPin,
  Music,
  Package,
  ShieldAlert,
  Sparkles,
  Store,
  Swords,
  Tent,
  Users,
  Waves,
  Wind,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import type { GameEngine } from '@/game/engine/GameEngine';
import {
  LOST_WORLD_TABS,
  type LostWorldActionDescriptor,
  type LostWorldState,
  type LostWorldTab,
} from '@/game/systems/lostWorldExpansion';

interface LostWorldModalProps {
  engine: GameEngine;
  onClose: () => void;
}

const TAB_ICONS: Record<LostWorldTab, React.ReactNode> = {
  world: <Compass className="w-3.5 h-3.5" />,
  survival: <Tent className="w-3.5 h-3.5" />,
  wildlife: <Leaf className="w-3.5 h-3.5" />,
  city: <Building2 className="w-3.5 h-3.5" />,
  vehicles: <Car className="w-3.5 h-3.5" />,
  adventure: <MapPin className="w-3.5 h-3.5" />,
  people: <Users className="w-3.5 h-3.5" />,
  coop: <Handshake className="w-3.5 h-3.5" />,
  build: <Hammer className="w-3.5 h-3.5" />,
  disaster: <CloudLightning className="w-3.5 h-3.5" />,
  lost: <Landmark className="w-3.5 h-3.5" />,
};

const TONE_STYLE: Record<string, string> = {
  good: 'border-emerald-500/50 bg-emerald-950/45 text-emerald-100',
  info: 'border-stone-600/70 bg-stone-900/70 text-stone-100',
  warning: 'border-amber-500/50 bg-amber-950/45 text-amber-100',
  danger: 'border-rose-500/50 bg-rose-950/45 text-rose-100',
  discovery: 'border-sky-500/50 bg-sky-950/45 text-sky-100',
};

function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-lg border border-stone-700/70 bg-stone-950/70 px-2.5 py-2">
      <div className="text-[9px] uppercase tracking-wider text-stone-500 font-bold">{label}</div>
      <div className="text-sm font-bold text-stone-100 leading-tight mt-0.5">{value}</div>
      {hint && <div className="text-[10px] text-stone-400 mt-0.5 leading-snug">{hint}</div>}
    </div>
  );
}

function SectionTitle({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <h3 className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-amber-300 font-bold mt-4 mb-1.5">
      {icon}
      {children}
    </h3>
  );
}

function Bar({
  value,
  max = 100,
  tone = 'amber',
}: {
  value: number;
  max?: number;
  tone?: 'amber' | 'emerald' | 'sky' | 'rose';
}) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  const color =
    tone === 'emerald'
      ? 'bg-emerald-400'
      : tone === 'sky'
        ? 'bg-sky-400'
        : tone === 'rose'
          ? 'bg-rose-400'
          : 'bg-amber-400';
  return (
    <div className="h-1.5 rounded-full bg-stone-800 overflow-hidden">
      <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function ActionList({
  actions,
  busy,
  message,
  onAct,
}: {
  actions: LostWorldActionDescriptor[];
  busy: string | null;
  message: string;
  onAct: (id: string) => void;
}) {
  const available = actions.filter((a) => a.available);
  const unavailable = actions.filter((a) => !a.available);
  const ordered = [...available, ...unavailable];
  return (
    <div className="mt-3">
      <SectionTitle icon={<Activity className="w-3.5 h-3.5" />}>Available Actions</SectionTitle>
      {message && (
        <div className="mb-2 rounded-lg border border-amber-500/40 bg-amber-950/40 px-3 py-2 text-xs text-amber-100">
          {message}
        </div>
      )}
      {ordered.length === 0 && (
        <p className="text-xs text-stone-400 rounded-lg border border-stone-800 bg-stone-950/60 p-3">
          No actions in this phase right now. Explore, build, or advance the day to unlock more.
        </p>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        {ordered.map((action) => (
          <button
            key={action.id}
            type="button"
            disabled={!action.available || busy === action.id}
            onClick={() => onAct(action.id)}
            title={action.reason ?? action.description}
            className={`min-h-[52px] text-left rounded-lg border px-3 py-2 transition ${
              action.available
                ? `${TONE_STYLE[action.tone ?? 'info']} hover:brightness-125 active:scale-[0.99] cursor-pointer`
                : 'border-stone-800 bg-stone-950/50 text-stone-500 cursor-not-allowed'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-bold leading-tight">{action.label}</span>
              <span className="text-[9px] font-mono shrink-0 text-stone-300">{action.costLabel}</span>
            </div>
            <div className="text-[10px] leading-snug mt-1 opacity-80 line-clamp-2">
              {action.available ? action.description : action.reason ?? action.description}
            </div>
            {busy === action.id && <div className="text-[9px] mt-1 text-amber-300">Working…</div>}
          </button>
        ))}
      </div>
    </div>
  );
}

function WorldPanel({ state }: { state: LostWorldState }) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Stat label="Season" value={state.seasons.label} hint={`Day ${state.seasons.dayInSeason}/${state.seasons.daysPerSeason}`} />
        <Stat label="Evolution" value={state.evolution.stageName} hint={`${state.evolution.score} points`} />
        <Stat
          label="Settlement"
          value={state.persistent.settlementFounded ? state.persistent.settlementName : 'Not founded'}
          hint={`Tier ${state.persistent.settlementTier} · ${state.shelters.filter((s) => s.built).length} shelters`}
        />
        <Stat label="World changes" value={state.persistent.changes.length} hint={`${state.persistent.totalDiscoveries} discoveries`} />
      </div>

      <SectionTitle icon={<Sparkles className="w-3.5 h-3.5" />}>Dynamic Events</SectionTitle>
      {state.events.filter((e) => !e.resolved).length === 0 ? (
        <p className="text-xs text-stone-400">No event is active. Festivals, accidents, emergencies and discoveries appear as the world runs.</p>
      ) : (
        <div className="space-y-1.5">
          {state.events
            .filter((e) => !e.resolved)
            .map((e) => (
              <div key={e.id} className="rounded-lg border border-stone-700/70 bg-stone-950/70 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-amber-200">{e.title}</span>
                  <span className="text-[10px] text-stone-400">{e.hoursLeft}h left</span>
                </div>
                <p className="text-[11px] text-stone-300 mt-0.5">{e.description}</p>
              </div>
            ))}
        </div>
      )}

      <SectionTitle icon={<Users className="w-3.5 h-3.5" />}>NPC Daily Schedules</SectionTitle>
      <div className="grid gap-1 sm:grid-cols-2">
        {state.npcs.map((npc) => (
          <div key={npc.id} className="flex items-center justify-between gap-2 rounded border border-stone-800 bg-stone-950/60 px-2 py-1.5">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-stone-100 truncate">{npc.name}</div>
              <div className="text-[9px] text-stone-400 truncate">
                {npc.role} · {npc.region === 'island' ? 'Island' : 'Crescent City'}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[9px] uppercase font-bold text-amber-300">{npc.activity}</div>
              <div className="text-[9px] text-stone-500">Trust {Math.round(npc.trust)}</div>
            </div>
          </div>
        ))}
      </div>

      <SectionTitle icon={<Landmark className="w-3.5 h-3.5" />}>Persistent World Changes</SectionTitle>
      {state.persistent.changes.length === 0 ? (
        <p className="text-xs text-stone-400">Nothing permanent yet. Built shelters, businesses, discoveries and story choices appear here and survive reloads.</p>
      ) : (
        <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
          {state.persistent.changes.slice(0, 12).map((change) => (
            <div key={change.id} className="flex items-center justify-between gap-2 text-[10px] border-b border-stone-800/80 pb-1">
              <span className="text-stone-200 truncate">{change.label}</span>
              <span className="text-stone-500 shrink-0">D{change.day} · {change.kind}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SurvivalPanel({ state }: { state: LostWorldState }) {
  const spoiled = state.food.filter((f) => f.spoiled);
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Stat label="Wetness" value={`${Math.round(state.temperature.wetness * 100)}%`} hint={`Comfort ${Math.round(state.temperature.comfort)}`} />
        <Stat label="Shelter warmth" value={`${Math.round(state.temperature.shelterInsulation * 100)}%`} hint={`${state.shelters.filter((s) => s.built).length} built`} />
        <Stat label="Kitchen" value={state.kitchen.kitchenBuilt ? 'Full kitchen' : state.kitchen.grillBuilt ? 'Grill only' : 'None'} hint={`${state.kitchen.mealsCooked} meals cooked`} />
        <Stat label="Spoiled" value={spoiled.length} hint={spoiled.length ? spoiled.map((s) => s.itemId).join(', ') : 'All food fresh'} />
      </div>

      <SectionTitle icon={<Tent className="w-3.5 h-3.5" />}>Shelters & Infrastructure</SectionTitle>
      {state.shelters.length === 0 ? (
        <p className="text-xs text-stone-400">No shelters built. Cabins, towers, bridges, workshops and underground shelters are available in the actions below.</p>
      ) : (
        <div className="grid gap-1 sm:grid-cols-2">
          {state.shelters.map((s) => (
            <div key={s.id} className="rounded border border-stone-800 bg-stone-950/60 p-2">
              <div className="flex justify-between text-[11px] font-semibold text-stone-100">
                <span>{s.label}</span>
                <span className="text-stone-400">{Math.round(s.integrity)}%</span>
              </div>
              <div className="mt-1"><Bar value={s.integrity} max={150} tone={s.integrity < 50 ? 'rose' : 'emerald'} /></div>
              <div className="text-[9px] text-stone-500 mt-1">
                Insulation {Math.round(s.insulation * 100)}% · Defense {s.defense}
              </div>
            </div>
          ))}
        </div>
      )}

      <SectionTitle icon={<Package className="w-3.5 h-3.5" />}>Food Freshness</SectionTitle>
      {state.food.length === 0 ? (
        <p className="text-xs text-stone-400">No perishable food tracked. Carry meat, fish, produce or meals to see spoilage.</p>
      ) : (
        <div className="grid gap-1 sm:grid-cols-2">
          {state.food.map((f) => (
            <div key={f.itemId} className="rounded border border-stone-800 bg-stone-950/60 p-2">
              <div className="flex justify-between text-[11px]">
                <span className="text-stone-200 capitalize">{f.itemId.replace(/_/g, ' ')}</span>
                <span className={f.spoiled ? 'text-rose-300' : 'text-stone-400'}>
                  {f.spoiled ? 'Spoiled' : f.preserved ? 'Preserved' : `${Math.round(f.freshness * 100)}%`}
                </span>
              </div>
              <div className="mt-1"><Bar value={f.spoiled ? 0 : f.freshness * 100} tone={f.spoiled ? 'rose' : 'emerald'} /></div>
            </div>
          ))}
        </div>
      )}

      <SectionTitle icon={<ShieldAlert className="w-3.5 h-3.5" />}>Rescue Signals</SectionTitle>
      <div className="grid grid-cols-3 gap-1">
        {state.rescueSignals.map((signal) => (
          <div key={signal.id} className="rounded border border-stone-800 bg-stone-950/60 p-2 text-center">
            <div className="text-[10px] font-bold text-stone-100">{signal.kind.replace(/_/g, ' ')}</div>
            <div className={`text-[9px] mt-0.5 ${signal.built ? 'text-emerald-300' : 'text-stone-500'}`}>
              {signal.built ? `Strength ${signal.strength}` : 'Not built'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WildlifePanel({ state }: { state: LostWorldState }) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Stat label="Catalogued" value={state.research.catalogued.filter((s) => s !== 'photo_blind').length} hint={`${state.research.photos.length} photographs`} />
        <Stat label="Research" value={state.research.researchPoints} hint="From tracks, photos & study" />
        <Stat label="Territories" value={state.territories.length} hint={`${state.territoryBattles.filter((b) => !b.resolved).length} active battles`} />
        <Stat label="Legendaries" value={`${state.legendaries.filter((l) => l.discovered).length}/${state.legendaries.length}`} hint={`${state.legendaries.filter((l) => l.photographed).length} photographed`} />
      </div>

      <SectionTitle icon={<Leaf className="w-3.5 h-3.5" />}>Wildlife Territories & Memory</SectionTitle>
      <div className="grid gap-1 sm:grid-cols-2">
        {state.territories.map((t) => {
          const memory = state.wildlifeMemory.find((m) => m.species === t.species);
          return (
            <div key={t.id} className="rounded border border-stone-800 bg-stone-950/60 p-2">
              <div className="flex justify-between text-[11px] font-semibold text-stone-100">
                <span>{t.displayName}</span>
                <span className={t.aggression > 60 ? 'text-rose-300' : t.aggression > 30 ? 'text-amber-300' : 'text-emerald-300'}>
                  {t.aggression > 60 ? 'Hostile' : t.aggression > 30 ? 'Wary' : 'Calm'}
                </span>
              </div>
              <div className="text-[9px] text-stone-400 mt-0.5">
                {t.species.replace(/_/g, ' ')} · pop {t.population} · {t.legendary ? 'legendary' : t.migrating ? 'migrating' : 'resident'}
              </div>
              <div className="text-[9px] text-stone-500">
                Encounters {memory?.encounters ?? 0} · threats {memory?.threats ?? 0}
              </div>
            </div>
          );
        })}
      </div>

      <SectionTitle icon={<Camera className="w-3.5 h-3.5" />}>Tracks & Legendary Discoveries</SectionTitle>
      {state.tracks.length > 0 && (
        <div className="grid gap-1 sm:grid-cols-2 mb-2">
          {state.tracks.map((t) => (
            <div key={t.id} className="rounded border border-sky-800/60 bg-sky-950/25 px-2 py-1 text-[10px] text-sky-100">
              {t.clue.replace(/_/g, ' ')} · {t.species.replace(/_/g, ' ')} · expires {Math.max(0, Math.round(t.expiresHours))}h
            </div>
          ))}
        </div>
      )}
      <div className="grid gap-1 sm:grid-cols-2">
        {state.legendaries.map((l) => (
          <div key={l.id} className={`rounded border p-2 ${l.discovered ? 'border-amber-600/60 bg-amber-950/25' : 'border-stone-800 bg-stone-950/60'}`}>
            <div className="flex justify-between text-[11px] font-semibold text-stone-100">
              <span>{l.name}</span>
              <span className="text-[9px] text-stone-400">{l.habitat}</span>
            </div>
            <p className="text-[10px] text-stone-400 mt-0.5">
              {l.discovered ? l.lore : 'Undiscovered. Track it in the right season and weather.'}
            </p>
            <div className="text-[9px] mt-1 text-stone-500">
              {l.discovered ? 'Discovered' : 'Unknown'} · {l.photographed ? 'Photographed' : 'No photo'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CityPanel({ state }: { state: LostWorldState }) {
  const owned = state.businesses.filter((b) => b.owned);
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Stat label="Businesses owned" value={owned.length} hint={`${owned.reduce((s, b) => s + b.uncollectedIncome, 0)}c waiting`} />
        <Stat label="Traffic signal" value={state.traffic.lastSignal} hint={`Congestion ${Math.round(state.traffic.congestion * 100)}%`} />
        <Stat label="Culture" value={state.culturalEvents.length} hint={state.culturalEvents[0]?.name ?? 'No event scheduled'} />
        <Stat label="Best district" value={[...state.districts].sort((a, b) => b.reputation - a.reputation)[0]?.name ?? '—'} hint="Reputation shapes prices" />
      </div>

      <SectionTitle icon={<Store className="w-3.5 h-3.5" />}>Crescent City Businesses</SectionTitle>
      <div className="grid gap-1 sm:grid-cols-2">
        {state.businesses.map((b) => (
          <div key={b.id} className={`rounded border p-2 ${b.owned ? 'border-emerald-700/60 bg-emerald-950/25' : 'border-stone-800 bg-stone-950/60'}`}>
            <div className="flex justify-between gap-2 text-[11px] font-semibold text-stone-100">
              <span className="truncate">{b.name}</span>
              <span className={`text-[9px] shrink-0 ${b.open ? 'text-emerald-300' : 'text-rose-300'}`}>{b.open ? 'Open' : 'Closed'}</span>
            </div>
            <div className="text-[9px] text-stone-400 capitalize">{b.kind.replace(/_/g, ' ')} · stock {Math.round(b.stock)} · {b.employees} staff</div>
            {b.owned && (
              <div className="text-[9px] text-amber-300 mt-0.5">
                Income {b.dailyIncome}c/day · {b.uncollectedIncome}c ready {b.sharedWithPeer ? '· shared' : ''}
              </div>
            )}
          </div>
        ))}
      </div>

      <SectionTitle icon={<Music className="w-3.5 h-3.5" />}>Neighborhood Reputation</SectionTitle>
      <div className="grid gap-1 sm:grid-cols-2">
        {state.districts.map((d) => (
          <div key={d.id} className="rounded border border-stone-800 bg-stone-950/60 p-2">
            <div className="flex justify-between text-[11px]">
              <span className="font-semibold text-stone-100">{d.name}</span>
              <span className={d.reputation < 0 ? 'text-rose-300' : 'text-emerald-300'}>{Math.round(d.reputation)}</span>
            </div>
            <div className="mt-1"><Bar value={d.reputation + 100} max={200} tone={d.reputation < 0 ? 'rose' : 'emerald'} /></div>
            <p className="text-[9px] text-stone-500 mt-1">{d.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function VehiclesPanel({ state, hudVehicles }: { state: LostWorldState; hudVehicles: { id: string; name: string }[] }) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Stat label="Custom builds" value={state.customization.length} hint={`${state.customization.reduce((s, c) => s + c.investment, 0)}c invested`} />
        <Stat label="Restorations" value={`${state.restorations.filter((r) => r.restored).length}/${state.restorations.length}`} hint={`${state.restorations.filter((r) => r.recovered && !r.restored).length} in progress`} />
        <Stat label="Bass battles" value={state.audioCompetitions.length} hint={state.audioCompetitions[0] ? `Best: ${state.audioCompetitions[0].score}` : 'No competitions yet'} />
        <Stat label="Car club" value={state.carClub.founded ? state.carClub.name : 'Not founded'} hint={`${state.carClub.members} members · ${state.carClub.meetsHeld} meets`} />
      </div>

      <SectionTitle icon={<Car className="w-3.5 h-3.5" />}>Your Vehicles</SectionTitle>
      {hudVehicles.length === 0 ? (
        <p className="text-xs text-stone-400">No parked vehicles. Build or restore one to customize it.</p>
      ) : (
        <div className="grid gap-1 sm:grid-cols-2">
          {hudVehicles.map((v) => {
            const custom = state.customization.find((c) => c.vehicleId === v.id);
            const mech = state.mechanical.find((m) => m.vehicleId === v.id);
            return (
              <div key={v.id} className="rounded border border-stone-800 bg-stone-950/60 p-2">
                <div className="flex justify-between text-[11px] font-semibold text-stone-100">
                  <span>{v.name}</span>
                  <span className={mech?.failed ? 'text-rose-300' : 'text-stone-400'}>
                    {mech?.failed ? 'Broken down' : `${Math.round(mech?.engineHeat ?? 0)}% heat`}
                  </span>
                </div>
                <div className="text-[9px] text-stone-400">
                  Paint {custom?.paint ?? 'stock'} · rims {custom?.rims ?? 'stock'} · tune {custom?.audioTune ?? 0}/10
                </div>
                <div className="text-[9px] text-stone-500">
                  Tires {Math.round(mech?.tireWear ?? 0)}% · brakes {Math.round(mech?.brakeWear ?? 0)}% · engine {Math.round(mech?.engineWear ?? 0)}%
                </div>
              </div>
            );
          })}
        </div>
      )}

      <SectionTitle icon={<Wrench className="w-3.5 h-3.5" />}>Restoration Projects</SectionTitle>
      <div className="grid gap-1 sm:grid-cols-2">
        {state.restorations.map((r) => (
          <div key={r.id} className="rounded border border-stone-800 bg-stone-950/60 p-2">
            <div className="flex justify-between text-[11px] font-semibold text-stone-100">
              <span>{r.name}</span>
              <span className={r.restored ? 'text-emerald-300' : 'text-amber-300'}>
                {r.restored ? 'Restored' : r.recovered ? `Stage ${r.stage}/4` : 'Abandoned'}
              </span>
            </div>
            <p className="text-[9px] text-stone-500">{r.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdventurePanel({ state }: { state: LostWorldState }) {
  const exp = state.expedition;
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Stat label="Dive sites" value={`${state.diveSites.filter((d) => d.explored).length}/${state.diveSites.length}`} hint="Shipwrecks, caves & ruins" />
        <Stat label="Treasures" value={`${state.treasures.filter((t) => t.dug).length}/${state.treasures.length}`} hint="Maps, clues & digs" />
        <Stat label="Adventures" value={`${state.adventures.filter((a) => a.completed).length}/${state.adventures.length}`} hint="Branching stories" />
        <Stat label="Expedition" value={exp ? (exp.active ? `${exp.hoursLeft}h left` : 'Debrief ready') : 'Idle'} hint={exp?.destination ?? 'Prepare a team'} />
      </div>

      <SectionTitle icon={<Compass className="w-3.5 h-3.5" />}>Multi-Stage Adventures</SectionTitle>
      <div className="grid gap-1 sm:grid-cols-2">
        {state.adventures.map((a) => (
          <div key={a.id} className={`rounded border p-2 ${a.completed ? 'border-emerald-700/60 bg-emerald-950/25' : 'border-stone-800 bg-stone-950/60'}`}>
            <div className="flex justify-between text-[11px] font-semibold text-stone-100">
              <span>{a.name}</span>
              <span className="text-[9px] text-stone-400">{a.completed ? 'Complete' : `Stage ${Math.min(a.stage + 1, a.stages.length)}/${a.stages.length}`}</span>
            </div>
            <p className="text-[10px] text-stone-400 mt-0.5">{a.summary}</p>
            {!a.completed && <div className="text-[9px] text-amber-300 mt-1">{a.stages[a.stage]?.objective}</div>}
          </div>
        ))}
      </div>

      <SectionTitle icon={<Waves className="w-3.5 h-3.5" />}>Underwater & Treasure Sites</SectionTitle>
      <div className="grid gap-1 sm:grid-cols-2">
        {state.diveSites.map((d) => (
          <div key={d.id} className="rounded border border-stone-800 bg-stone-950/60 p-2">
            <div className="flex justify-between text-[11px] font-semibold text-stone-100">
              <span>{d.name}</span>
              <span className={d.explored ? 'text-emerald-300' : 'text-sky-300'}>{d.explored ? 'Explored' : `${d.depth}m`}</span>
            </div>
            <p className="text-[9px] text-stone-500">{d.description}</p>
          </div>
        ))}
        {state.treasures.map((t) => (
          <div key={t.id} className="rounded border border-stone-800 bg-stone-950/60 p-2">
            <div className="flex justify-between text-[11px] font-semibold text-stone-100">
              <span>{t.name}</span>
              <span className={t.dug ? 'text-emerald-300' : 'text-amber-300'}>{t.dug ? 'Recovered' : `${t.cluesDecoded}/${t.cluesTotal} clues`}</span>
            </div>
            <p className="text-[9px] text-stone-500">{t.artifact}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PeoplePanel({ state }: { state: LostWorldState }) {
  const recruited = state.recruits.filter((r) => r.status === 'recruited' || r.status === 'assigned');
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Stat label="Recruited" value={recruited.length} hint={`${state.recruits.filter((r) => r.status === 'rescued').length} waiting to join`} />
        <Stat label="Community" value={`${state.communityProjects.filter((p) => p.built).length}/${state.communityProjects.length}`} hint="Projects completed" />
        <Stat label="Trust average" value={Math.round(state.npcs.reduce((s, n) => s + n.trust, 0) / Math.max(1, state.npcs.length))} hint="NPC memory persists" />
        <Stat label="Companion bond" value={state.companions[0]?.bond ?? 0} hint={state.companions[0]?.trait ?? 'navigator'} />
      </div>

      <SectionTitle icon={<Users className="w-3.5 h-3.5" />}>Survivors & Recruits</SectionTitle>
      <div className="grid gap-1 sm:grid-cols-2">
        {state.recruits.map((r) => (
          <div key={r.id} className="rounded border border-stone-800 bg-stone-950/60 p-2">
            <div className="flex justify-between text-[11px] font-semibold text-stone-100">
              <span>{r.name}</span>
              <span className="text-[9px] text-amber-300 capitalize">{r.status} · {r.skill}</span>
            </div>
            <p className="text-[9px] text-stone-500">{r.story}</p>
            {r.status === 'assigned' && <div className="text-[9px] text-emerald-300">Assigned to {r.assignment}</div>}
          </div>
        ))}
      </div>

      <SectionTitle icon={<Home className="w-3.5 h-3.5" />}>Community Projects</SectionTitle>
      <div className="grid gap-1 sm:grid-cols-2">
        {state.communityProjects.map((p) => (
          <div key={p.id} className="rounded border border-stone-800 bg-stone-950/60 p-2">
            <div className="flex justify-between text-[11px] font-semibold text-stone-100">
              <span>{p.name}</span>
              <span className={p.built ? 'text-emerald-300' : 'text-stone-400'}>{p.built ? 'Built' : `${p.progress}/${p.goal}`}</span>
            </div>
            <div className="mt-1"><Bar value={p.progress} max={p.goal} tone={p.built ? 'emerald' : 'amber'} /></div>
            <p className="text-[9px] text-stone-500 mt-1">{p.benefit}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CoopPanel({ state }: { state: LostWorldState }) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Stat label="Room" value={state.coop.lastSyncedDay > 0 ? 'Synced' : 'Local'} hint={`${state.coop.trades.length} trades`} />
        <Stat label="Challenge" value={state.coop.challengeId ? (state.coop.challengeCompleted ? 'Complete' : 'Active') : 'None'} hint={state.coop.challengeTitle || 'Start one in the actions'} />
        <Stat label="Shared business" value={state.coop.sharedBusinessId ? 'Shared' : 'None'} hint={state.businesses.find((b) => b.sharedWithPeer)?.name ?? 'Share an owned business'} />
        <Stat label="Shared activities" value={state.coop.sharedActivities.length} hint="Car meets & room events" />
      </div>
      {state.coop.challengeId && (
        <div className="rounded border border-sky-700/60 bg-sky-950/30 p-2">
          <div className="flex justify-between text-[11px] font-semibold text-sky-100">
            <span>{state.coop.challengeTitle}</span>
            <span>{state.coop.challengeProgress}/{state.coop.challengeGoal}</span>
          </div>
          <div className="mt-1"><Bar value={state.coop.challengeProgress} max={state.coop.challengeGoal} tone="sky" /></div>
          <div className="text-[9px] text-sky-200 mt-1">
            Reward {state.coop.challengeReward} coins · {state.coop.challengeCompleted ? 'complete' : 'in progress'}
          </div>
        </div>
      )}
      <SectionTitle icon={<Handshake className="w-3.5 h-3.5" />}>Trades</SectionTitle>
      {state.coop.trades.length === 0 ? (
        <p className="text-xs text-stone-400">No active trades. Join a P2P room and offer materials from the actions list.</p>
      ) : (
        <div className="space-y-1">
          {state.coop.trades.map((t) => (
            <div key={t.id} className="flex justify-between text-[10px] rounded border border-stone-800 bg-stone-950/60 px-2 py-1">
              <span>{t.direction === 'incoming' ? 'From' : 'To'} {t.peerName}</span>
              <span>{t.quantity}× {t.itemId.replace(/_/g, ' ')} for {t.price}c</span>
            </div>
          ))}
        </div>
      )}
      <p className="text-[10px] text-stone-500 leading-snug">
        Co-op uses the game&apos;s real WebRTC/relay room. Shared business ownership, community challenge progress,
        car meets and trades are broadcast only when connected; no simulated online players are created.
      </p>
    </div>
  );
}

function BuildPanel({ state }: { state: LostWorldState }) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Stat label="Power" value={`${state.power.outputKw.toFixed(1)} / ${state.power.demandKw.toFixed(1)} kW`} hint={state.power.brownout ? 'Brownout' : state.power.generatorBuilt ? 'Grid stable' : 'No generator'} />
        <Stat label="Water" value={`${Math.round(state.water.gallons)} gal`} hint={`Capacity ${state.water.capacity} · pressure ${Math.round(state.water.pressure * 100)}%`} />
        <Stat label="Homestead" value={`${state.engineering.homesteadStage}/4`} hint="Foundation, floors, stairs, doors" />
        <Stat label="Treehouse" value={`${state.engineering.treehouseStage}/4`} hint="Platform, climb, bridge, room" />
      </div>

      <SectionTitle icon={<Zap className="w-3.5 h-3.5" />}>Electricity</SectionTitle>
      <div className="grid grid-cols-3 gap-1 text-[10px]">
        <Stat label="Generator" value={state.power.generatorBuilt ? `${Math.round(state.power.generatorFuel)}% fuel` : 'None'} />
        <Stat label="Wiring" value={`${state.power.wiringMeters} m`} />
        <Stat label="Lights / switches" value={`${state.power.lights} / ${state.power.switches}`} />
      </div>

      <SectionTitle icon={<Droplets className="w-3.5 h-3.5" />}>Water Infrastructure</SectionTitle>
      <div className="grid grid-cols-2 gap-1 text-[10px]">
        <Stat label="Well / pump" value={`${state.water.wellBuilt ? 'Well' : '—'} / ${state.water.pumpBuilt ? 'Pump' : '—'}`} />
        <Stat label="Tank / irrigation" value={`${state.water.tankBuilt ? 'Tank' : '—'} / ${state.water.irrigationBuilt ? 'Drip lines' : '—'}`} />
      </div>

      <SectionTitle icon={<Hammer className="w-3.5 h-3.5" />}>Engineering</SectionTitle>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 text-[10px]">
        <Stat label="Roads repaired" value={state.engineering.roadsRepaired} />
        <Stat label="Bridges built" value={state.engineering.bridgesBuilt} />
        <Stat label="Machinery" value={state.engineering.machineryBuilt ? 'Assembled' : 'None'} />
        <Stat label="Contract" value={state.engineering.contractActive ? `${state.engineering.contractProgress}/${state.engineering.contractGoal}` : 'None'} />
      </div>
    </div>
  );
}

function DisasterPanel({ state }: { state: LostWorldState }) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Stat label="Hurricane" value={state.hurricane.active ? state.hurricane.name : 'None'} hint={state.hurricane.active ? `Cat ${state.hurricane.intensity} · ${state.hurricane.windMph} mph · ${state.hurricane.hoursLeft}h` : `Last day ${state.hurricane.lastHurricaneDay || '—'}`} />
        <Stat label="Flood" value={`${state.flood.level.toFixed(1)} m`} hint={state.flood.lowlandRoadBlocked ? 'Low roads blocked' : `Peak ${state.flood.peak.toFixed(1)} m`} />
        <Stat label="Wildfire" value={`${state.fire.cells.length} fronts`} hint={state.fire.cells.length ? 'Spreading with wind' : 'No active fire'} />
        <Stat label="Recovery" value={`${state.recovery.infrastructure}/100`} hint={`Settlement ${state.recovery.settlement}/100`} />
      </div>

      <SectionTitle icon={<AlertTriangle className="w-3.5 h-3.5" />}>Damage</SectionTitle>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 text-[10px]">
        <Stat label="Fallen trees" value={state.damage.fallenTrees} />
        <Stat label="Damaged shelters" value={state.damage.damagedShelters} />
        <Stat label="Damaged businesses" value={state.damage.damagedBusinesses} />
        <Stat label="Debris" value={state.damage.debris} />
      </div>
      <p className="text-[10px] text-stone-500 leading-snug">
        Hurricanes force storm weather, raise floodwater, fell trees and damage structures. Fire spreads with wind
        and is suppressed by rain. Recovery work restores shelters and infrastructure across save/reload.
      </p>
    </div>
  );
}

function LostPanel({ state }: { state: LostWorldState }) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Stat label="Civilization" value={`${state.civilization.excavationStage}/5`} hint={`${state.civilization.chambersFound}/6 chambers`} />
        <Stat label="World bosses" value={`${state.worldBosses.filter((b) => b.defeated).length}/${state.worldBosses.length}`} hint="Prep and team required" />
        <Stat label="Dragon bonds" value={state.dragonBonds.length} hint={`Best Lv ${Math.max(0, ...state.dragonBonds.map((d) => d.level))}`} />
        <Stat label="Mystery" value={`${state.mystery.cluesFound.length}/12`} hint={state.mystery.finalRevealed ? 'Revealed' : `Stage ${state.mystery.storyStage}`} />
      </div>

      <SectionTitle icon={<Landmark className="w-3.5 h-3.5" />}>The Lost Civilization</SectionTitle>
      <div className="rounded border border-amber-700/50 bg-amber-950/25 p-2">
        <div className="flex justify-between text-[11px] font-semibold text-amber-100">
          <span>Underground city excavation</span>
          <span>{state.civilization.gateOpened ? 'Gate open' : `${state.civilization.excavationStage}/5`}</span>
        </div>
        <div className="mt-1"><Bar value={state.civilization.excavationStage} max={5} /></div>
        <ul className="mt-1 space-y-0.5">
          {state.civilization.artifacts.slice(-4).map((a, i) => (
            <li key={`${a}_${i}`} className="text-[10px] text-amber-100/80">· {a}</li>
          ))}
        </ul>
      </div>

      <SectionTitle icon={<Swords className="w-3.5 h-3.5" />}>World Bosses</SectionTitle>
      <div className="grid gap-1 sm:grid-cols-2">
        {state.worldBosses.map((b) => (
          <div key={b.id} className={`rounded border p-2 ${b.defeated ? 'border-emerald-700/60 bg-emerald-950/25' : 'border-stone-800 bg-stone-950/60'}`}>
            <div className="flex justify-between text-[11px] font-semibold text-stone-100">
              <span>{b.name}</span>
              <span className={b.defeated ? 'text-emerald-300' : 'text-rose-300'}>{b.defeated ? 'Defeated' : `Prep ${b.prep}/${b.requiredPrep}`}</span>
            </div>
            <p className="text-[9px] text-stone-400 mt-0.5">{b.description}</p>
            <div className="text-[9px] text-amber-300 mt-1">{b.rewards}</div>
          </div>
        ))}
      </div>

      <SectionTitle icon={<Heart className="w-3.5 h-3.5" />}>Dragon Bonds</SectionTitle>
      {state.dragonBonds.length === 0 ? (
        <p className="text-xs text-stone-400">No dragon bonds yet. Open Dragon Valley and offer meat to begin.</p>
      ) : (
        <div className="grid gap-1 sm:grid-cols-2">
          {state.dragonBonds.map((d) => (
            <div key={d.dragonId} className="rounded border border-orange-700/50 bg-orange-950/25 p-2">
              <div className="flex justify-between text-[11px] font-semibold text-orange-100">
                <span>{d.name}</span>
                <span>Lv {d.level}</span>
              </div>
              <div className="mt-1"><Bar value={d.xp % 50} max={50} /></div>
            </div>
          ))}
        </div>
      )}

      <SectionTitle icon={<Sparkles className="w-3.5 h-3.5" />}>Living Mystery</SectionTitle>
      <div className="rounded border border-sky-700/50 bg-sky-950/25 p-2">
        <div className="flex justify-between text-[11px] font-semibold text-sky-100">
          <span>The island&apos;s twelve clues</span>
          <span>{state.mystery.cluesFound.length}/12</span>
        </div>
        <div className="mt-1"><Bar value={state.mystery.cluesFound.length} max={12} tone="sky" /></div>
        <ul className="mt-1 space-y-0.5">
          {state.mystery.lore.slice(-3).map((line, i) => (
            <li key={`${line}_${i}`} className="text-[10px] text-sky-100/80">· {line}</li>
          ))}
        </ul>
      </div>

      <SectionTitle icon={<Award className="w-3.5 h-3.5" />}>World Evolution</SectionTitle>
      <div className="rounded border border-emerald-700/50 bg-emerald-950/25 p-2">
        <div className="flex justify-between text-[11px] font-semibold text-emerald-100">
          <span>{state.evolution.stageName}</span>
          <span>{state.evolution.score} pts</span>
        </div>
        <div className="mt-1"><Bar value={state.evolution.score} max={700} tone="emerald" /></div>
        <div className="text-[9px] text-emerald-100/80 mt-1">
          Perks: {state.evolution.perks.length ? state.evolution.perks.slice(-3).join(' · ') : 'none yet'}
        </div>
      </div>
    </div>
  );
}

export function LostWorldModal({ engine, onClose }: LostWorldModalProps) {
  const [tab, setTab] = useState<LostWorldTab>('world');
  const [panel, setPanel] = useState(() => engine.getLostWorldPanel());
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const refresh = useCallback(() => {
    setPanel(engine.getLostWorldPanel());
  }, [engine]);

  const handleAction = useCallback(
    (actionId: string) => {
      setBusy(actionId);
      const result = engine.performLostWorldAction(actionId);
      setMessage(result.message);
      setBusy(null);
      refresh();
    },
    [engine, refresh],
  );

  const actions = useMemo(
    () => panel.actions.filter((a) => a.tab === tab),
    [panel.actions, tab],
  );
  const state = panel.state;
  const warnings =
    (state.hurricane.active ? 1 : 0) +
    (state.fire.cells.length > 0 ? 1 : 0) +
    state.events.filter((e) => !e.resolved).length +
    state.food.filter((f) => f.spoiled).length;

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-stone-950/80 backdrop-blur-sm p-2 sm:p-4">
      <div className="w-full max-w-6xl max-h-[94vh] flex flex-col rounded-xl border border-amber-600/40 bg-gradient-to-b from-stone-900 to-stone-950 shadow-2xl overflow-hidden">
        <div className="flex items-start justify-between gap-3 border-b border-stone-700/70 px-3 sm:px-4 py-2.5 bg-stone-950/80">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <GlobeMark />
              <h2 className="text-sm sm:text-base font-bold text-amber-200 tracking-wide">
                Survival Island: Lost World
              </h2>
              {warnings > 0 && (
                <span className="rounded-full bg-rose-600/90 text-white text-[9px] font-bold px-1.5 py-0.5">
                  {warnings} ALERT{warnings > 1 ? 'S' : ''}
                </span>
              )}
            </div>
            <p className="text-[10px] sm:text-[11px] text-stone-400 mt-0.5">
              {state.seasons.label} · Day {state.seasons.dayInSeason} · {state.evolution.stageName} ·{' '}
              {state.persistent.settlementName} tier {state.persistent.settlementTier}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] rounded-lg border border-stone-700 bg-stone-800 hover:bg-stone-700 text-stone-200 flex items-center justify-center"
            aria-label="Close Lost World"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-1 overflow-x-auto px-2 py-2 border-b border-stone-800 bg-stone-950/60">
          {LOST_WORLD_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`shrink-0 min-h-[44px] px-3 rounded-lg border text-[10px] font-bold flex items-center gap-1.5 transition ${
                tab === t.id
                  ? 'border-amber-400 bg-amber-500 text-stone-950'
                  : 'border-stone-700 bg-stone-900 text-stone-300 hover:bg-stone-800'
              }`}
            >
              {TAB_ICONS[t.id]}
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-2.5 sm:px-4 py-3">
          {tab === 'world' && <WorldPanel state={state} />}
          {tab === 'survival' && <SurvivalPanel state={state} />}
          {tab === 'wildlife' && <WildlifePanel state={state} />}
          {tab === 'city' && <CityPanel state={state} />}
          {tab === 'vehicles' && <VehiclesPanel state={state} hudVehicles={engine.getLostWorldActionContext().vehicles} />}
          {tab === 'adventure' && <AdventurePanel state={state} />}
          {tab === 'people' && <PeoplePanel state={state} />}
          {tab === 'coop' && <CoopPanel state={state} />}
          {tab === 'build' && <BuildPanel state={state} />}
          {tab === 'disaster' && <DisasterPanel state={state} />}
          {tab === 'lost' && <LostPanel state={state} />}

          <ActionList actions={actions} busy={busy} message={message} onAct={handleAction} />

          <div className="mt-3 flex flex-wrap gap-2 text-[9px] text-stone-500">
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-400" /> Saved with your world</span>
            <span className="flex items-center gap-1"><Gauge className="w-3 h-3 text-sky-400" /> 1s fixed-cost simulation</span>
            <span className="flex items-center gap-1"><Wind className="w-3 h-3 text-amber-400" /> Weather & seasons active</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function GlobeMark() {
  return (
    <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-emerald-600 text-stone-950 flex items-center justify-center shrink-0">
      <Compass className="w-4 h-4" />
    </span>
  );
}
