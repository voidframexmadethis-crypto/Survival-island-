'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Car,
  CornerDownLeft,
  Hammer,
  Send,
  Terminal,
  Wrench,
  X,
} from 'lucide-react';
import type { GameEngine } from '@/game/engine/GameEngine';
import { HUDStateSnapshot } from '@/game/types';
import {
  FACILITY_CATEGORIES,
  FACILITY_ENGRAVING_DESIGNS,
  formatFacilityTime,
  type FacilityFeature,
} from '@/game/systems/restorationFacility';

interface RestorationShopModalProps {
  engine: GameEngine;
  hud: HUDStateSnapshot;
  onClose: () => void;
}

interface ChatMessage {
  id: number;
  from: 'computer' | 'player';
  text: string;
}

const QUICK_REQUESTS = [
  "'64 Impala",
  "'74 Caprice Box",
  "'87 Regal",
  "'79 Coupe de Ville",
  'El Camino',
  'Town Car',
  'Surprise me',
];

const ENGINE_REQUESTS = [
  'Sweet 350',
  'Supercharged',
  'Twin turbo',
  'Blown black stroker',
  'One-off billet',
  'With a cage',
];

type ShopTab = 'terminal' | 'facility' | 'vehicles';

function signedPercent(value: number): string {
  const pct = Math.round(value * 100);
  return `${pct >= 0 ? '+' : ''}${pct}%`;
}

function formatValue(value: number): string {
  return `$${Math.round(value).toLocaleString()}`;
}

export function RestorationShopModal({
  engine,
  hud,
  onClose,
}: RestorationShopModalProps) {
  const snapshot = hud.restorationShop ?? engine.getRestorationShopHudState();
  const facility = snapshot.facility;
  const [tab, setTab] = useState<ShopTab>(() =>
    engine.getRestorationShopStartTab(),
  );
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    { id: 0, from: 'computer', text: engine.getRestorationShopGreeting() },
  ]);
  const [vehicles, setVehicles] = useState(() =>
    engine.getRestorationFacilityVehicles(),
  );
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(
    () =>
      facility.selectedVehicleId ??
      engine.getRestorationFacilityVehicles()[0]?.id ??
      null,
  );
  const [engravingFor, setEngravingFor] = useState<string | null>(null);
  const nextId = useRef(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const features = useMemo(() => engine.getRestorationFacilityFeatures(), [engine]);
  const installed = useMemo(
    () => new Set(facility.installedFeatureIds),
    [facility.installedFeatureIds],
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, tab]);

  useEffect(() => {
    setVehicles(engine.getRestorationFacilityVehicles());
  }, [engine, hud]);

  const selectedVehicle =
    vehicles.find((vehicle) => vehicle.id === selectedVehicleId) ??
    vehicles[0] ??
    null;
  const selectedRecord = selectedVehicle?.record ?? null;
  const selectedEngraving = selectedVehicle?.engravingDesign
    ? FACILITY_ENGRAVING_DESIGNS.find(
        (design) => design.id === selectedVehicle.engravingDesign,
      )
    : null;

  const status = useMemo(() => {
    if (facility.engravingJob) {
      return `ENGRAVING · ${Math.round(facility.engravingJob.progress * 100)}%`;
    }
    if (snapshot.completed) return 'READY · CAR IN THE BAY';
    if (snapshot.phase === 'waiting_donor') {
      return `FREIGHT · SHELL ETA ${snapshot.cargoEtaLabel}`;
    }
    if (snapshot.phase === 'restoring') {
      return `${snapshot.stageLabel.toUpperCase()} · ${Math.round(
        snapshot.overallProgress * 100,
      )}%`;
    }
    if (snapshot.phase !== 'idle') {
      return `${snapshot.stageLabel.toUpperCase()} · ${Math.round(
        snapshot.overallProgress * 100,
      )}%`;
    }
    return `BAY OPEN · ${facility.bays} BAYS · ${facility.equipmentCount} SYSTEMS`;
  }, [snapshot, facility]);

  const send = (value: string) => {
    const text = value.trim();
    if (!text) return;
    const playerMessage: ChatMessage = {
      id: nextId.current++,
      from: 'player',
      text,
    };
    const reply = engine.chatWithRestorationShop(text);
    const computerMessage: ChatMessage = {
      id: nextId.current++,
      from: 'computer',
      text: reply,
    };
    setMessages((previous) => [...previous, playerMessage, computerMessage]);
    setInput('');
  };

  const refreshVehicles = () => {
    setVehicles(engine.getRestorationFacilityVehicles());
  };

  const installFeature = (feature: FacilityFeature) => {
    engine.installRestorationFacilityFeature(feature.id);
    refreshVehicles();
  };

  const renderTerminal = () => (
    <>
      <div
        ref={scrollRef}
        className="survival-scroll relative min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5"
      >
        {messages.map((message) =>
          message.from === 'computer' ? (
            <div key={message.id} className="flex items-start gap-2.5">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-emerald-500/30 bg-emerald-500/10 font-mono-tabular text-[9px] font-bold text-emerald-300">
                BR
              </div>
              <div className="max-w-[88%] rounded-xl rounded-tl-sm border border-emerald-900/50 bg-emerald-950/35 px-3 py-2">
                <div className="font-mono-tabular text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-500/70">
                  Shop computer
                </div>
                <p className="mt-1 text-[12.5px] leading-relaxed text-emerald-100/85">
                  {message.text}
                </p>
              </div>
            </div>
          ) : (
            <div key={message.id} className="flex justify-end">
              <div className="max-w-[85%] rounded-xl rounded-tr-sm border border-amber-700/40 bg-amber-950/30 px-3 py-2">
                <div className="font-mono-tabular text-[9px] font-bold uppercase tracking-[0.18em] text-amber-500/80">
                  You
                </div>
                <p className="mt-1 text-[12.5px] leading-relaxed text-amber-50/90">
                  {message.text}
                </p>
              </div>
            </div>
          ),
        )}
      </div>

      <div className="relative border-t border-emerald-900/50 bg-[#08150f] p-3 sm:p-4">
        <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
          {QUICK_REQUESTS.map((request) => (
            <button
              key={request}
              type="button"
              onClick={() => send(request)}
              className="shrink-0 rounded-full border border-emerald-900 bg-emerald-950/50 px-2.5 py-1 text-[10px] font-medium text-emerald-300/80 transition hover:border-emerald-500/50 hover:text-emerald-200"
            >
              {request}
            </button>
          ))}
        </div>
        <div className="mb-2 flex items-center gap-1.5 overflow-x-auto pb-1">
          <span className="shrink-0 font-mono-tabular text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-600">
            Engine
          </span>
          {ENGINE_REQUESTS.map((request) => (
            <button
              key={request}
              type="button"
              onClick={() => send(request)}
              className="shrink-0 rounded-full border border-amber-900/70 bg-amber-950/20 px-2.5 py-1 text-[10px] font-medium text-amber-300/80 transition hover:border-amber-500/50 hover:text-amber-200"
            >
              {request}
            </button>
          ))}
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            send(input);
          }}
          className="flex items-center gap-2"
        >
          <span className="font-mono-tabular text-sm text-emerald-500">&gt;</span>
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder='Name a car, then pick an engine… try "64 Impala"'
            className="min-h-[44px] min-w-0 flex-1 rounded-lg border border-emerald-900/80 bg-[#06100d] px-3 font-mono-tabular text-sm text-emerald-100 placeholder:text-emerald-800 focus:border-emerald-500/60 focus:outline-none"
            autoFocus
          />
          <button
            type="submit"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-emerald-500/40 bg-emerald-500/15 text-emerald-200 transition hover:bg-emerald-500/25"
            aria-label="Send message to the shop computer"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
        <div className="mt-2 flex items-center gap-1 text-[10px] text-emerald-700">
          <CornerDownLeft className="h-3 w-3" />
          Enter sends · close the terminal to let the crew work
        </div>
      </div>
    </>
  );

  const renderFacility = () => (
    <div className="survival-scroll relative min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ['Bays', `${facility.bays}`],
          ['Expansion', `${facility.expansionLevel}/4`],
          ['Systems', `${facility.installedCount}/51`],
          ['Build speed', signedPercent(facility.stats.buildSpeedMultiplier - 1)],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-lg border border-emerald-900/60 bg-emerald-950/25 px-3 py-2"
          >
            <div className="font-mono-tabular text-[9px] uppercase tracking-[0.16em] text-emerald-600">
              {label}
            </div>
            <div className="mt-0.5 text-lg font-semibold text-emerald-100">
              {value}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <div className="rounded-lg border border-emerald-900/50 bg-[#0a1712] px-3 py-2">
          <div className="font-mono-tabular text-[9px] uppercase tracking-[0.16em] text-emerald-600">
            Quality bonus
          </div>
          <div className="text-sm text-emerald-100">+{Math.round(facility.stats.qualityBonus)}</div>
        </div>
        <div className="rounded-lg border border-emerald-900/50 bg-[#0a1712] px-3 py-2">
          <div className="font-mono-tabular text-[9px] uppercase tracking-[0.16em] text-emerald-600">
            Parts recovery
          </div>
          <div className="text-sm text-emerald-100">{Math.round(facility.stats.partsRecovery * 100)}%</div>
        </div>
        <div className="rounded-lg border border-emerald-900/50 bg-[#0a1712] px-3 py-2">
          <div className="font-mono-tabular text-[9px] uppercase tracking-[0.16em] text-emerald-600">
            Parts ledger
          </div>
          <div className="text-sm text-emerald-100">
            {facility.partsReceived} received · {facility.partsInstalled} installed ·{' '}
            {facility.partsRecycled} recycled
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-emerald-900/50 bg-[#0a1712] p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="font-mono-tabular text-[10px] uppercase tracking-[0.16em] text-emerald-500">
            Crew & personal challenge
          </div>
          <button
            type="button"
            disabled={!installed.has('restoration_challenges') || facility.challenge.active}
            onClick={() => engine.startRestorationFacilityChallenge()}
            className="rounded-md border border-emerald-700/70 bg-emerald-900/30 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-200 transition enabled:hover:bg-emerald-800/40 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {facility.challenge.active
              ? 'Challenge running'
              : facility.challenge.bestSeconds
                ? `Best ${formatFacilityTime(facility.challenge.bestSeconds)}`
                : 'Start 4:00 challenge'}
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {facility.mechanics.map((mechanic) => (
            <div
              key={mechanic.id}
              className="rounded-md border border-emerald-900/60 bg-emerald-950/30 px-2 py-1.5 text-[10px] text-emerald-200/85"
            >
              <span className="font-semibold text-emerald-100">{mechanic.name}</span>{' '}
              · Lv {mechanic.level} · {mechanic.xp} XP · {mechanic.shift}
            </div>
          ))}
        </div>
        {facility.engravingJob ? (
          <div className="mt-2 rounded-md border border-amber-800/60 bg-amber-950/20 px-2 py-1.5 text-[10px] text-amber-200">
            Engraving{' '}
            {FACILITY_ENGRAVING_DESIGNS.find(
              (design) => design.id === facility.engravingJob?.designId,
            )?.label ?? 'design'}{' '}
            · {Math.round(facility.engravingJob.progress * 100)}%
          </div>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!installed.has('parts_recycling')}
            onClick={() => {
              engine.recycleRestorationFacilityParts();
              refreshVehicles();
            }}
            className="rounded-md border border-emerald-800 bg-emerald-950/40 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-200 transition enabled:hover:bg-emerald-900/50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Recycle installed parts
          </button>
          <span className="text-[10px] text-emerald-500">
            {facility.lastMessage}
          </span>
        </div>
      </div>

      {FACILITY_CATEGORIES.map((category) => {
        const categoryFeatures = features.filter(
          (feature) => feature.category === category.id,
        );
        return (
          <div key={category.id} className="mt-4">
            <div className="mb-1.5">
              <div className="font-display text-sm font-bold text-emerald-100">
                {category.label}
              </div>
              <div className="text-[10px] text-emerald-500">{category.detail}</div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {categoryFeatures.map((feature) => {
                const isInstalled = installed.has(feature.id);
                return (
                  <div
                    key={feature.id}
                    className={`rounded-lg border p-2.5 ${
                      isInstalled
                        ? 'border-emerald-700/60 bg-emerald-900/25'
                        : 'border-emerald-950 bg-[#08130f]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-mono-tabular text-[9px] text-emerald-600">
                          SYS {feature.index.toString().padStart(2, '0')}
                        </div>
                        <div className="text-[12px] font-semibold leading-snug text-emerald-100">
                          {feature.name}
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={isInstalled}
                        onClick={() => installFeature(feature)}
                        className="shrink-0 rounded-md border border-emerald-700/70 bg-emerald-900/30 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-emerald-200 transition enabled:hover:bg-emerald-800/50 disabled:cursor-default disabled:border-emerald-800/40 disabled:bg-transparent disabled:text-emerald-500"
                      >
                        {isInstalled ? 'Installed' : 'Install'}
                      </button>
                    </div>
                    <p className="mt-1 text-[10.5px] leading-snug text-emerald-200/60">
                      {feature.detail}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1 font-mono-tabular text-[8.5px] uppercase tracking-wide text-emerald-500">
                      <span>{signedPercent(feature.buildSpeedBonus)} speed</span>
                      {feature.qualityBonus > 0 ? (
                        <span>+{feature.qualityBonus} quality</span>
                      ) : null}
                      {feature.partsRecoveryBonus > 0 ? (
                        <span>+{Math.round(feature.partsRecoveryBonus * 100)}% recovery</span>
                      ) : null}
                      {feature.equipment ? <span>expands bays</span> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderVehicles = () => (
    <div className="relative grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden px-4 py-4 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] sm:px-5">
      <div className="survival-scroll min-h-0 overflow-y-auto rounded-lg border border-emerald-900/50 bg-[#08130f] p-2">
        <div className="mb-1 px-1 font-mono-tabular text-[9px] uppercase tracking-[0.16em] text-emerald-600">
          Personal collection · {vehicles.length}
        </div>
        <div className="space-y-1">
          {vehicles.map((vehicle) => (
            <button
              key={vehicle.id}
              type="button"
              onClick={() => {
                setSelectedVehicleId(vehicle.id);
                engine.selectRestorationFacilityVehicle(vehicle.id);
                setEngravingFor(null);
              }}
              className={`w-full rounded-md border px-2 py-1.5 text-left transition ${
                selectedVehicle?.id === vehicle.id
                  ? 'border-amber-600/60 bg-amber-950/20'
                  : 'border-emerald-950 bg-emerald-950/15 hover:border-emerald-800'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[11px] font-semibold text-emerald-100">
                  {vehicle.name}
                </span>
                {vehicle.active ? (
                  <span className="shrink-0 font-mono-tabular text-[8px] uppercase text-amber-400">
                    driving
                  </span>
                ) : null}
              </div>
              <div className="mt-0.5 flex gap-2 font-mono-tabular text-[8.5px] uppercase tracking-wide text-emerald-600">
                <span>{Math.round(vehicle.distanceToShop)}m</span>
                {vehicle.record ? (
                  <span>Q{vehicle.record.qualityScore}</span>
                ) : (
                  <span>no record</span>
                )}
                {vehicle.record?.displayed ? <span>on display</span> : null}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="survival-scroll min-h-0 overflow-y-auto rounded-lg border border-emerald-900/50 bg-[#08130f] p-3">
        {!selectedVehicle ? (
          <p className="text-sm text-emerald-300/70">No player vehicles found.</p>
        ) : (
          <div>
            <div className="font-display text-lg font-bold text-emerald-50">
              {selectedVehicle.name}
            </div>
            <div className="mt-0.5 font-mono-tabular text-[9px] uppercase tracking-[0.16em] text-emerald-600">
              {selectedVehicle.id === 'veh_custom_shop_bayou_royal'
                ? 'Current restoration bay car'
                : selectedVehicle.active
                  ? 'Player driving'
                  : 'Player-owned'}
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="rounded-md border border-emerald-900/50 px-2 py-1.5">
                <div className="font-mono-tabular text-[8px] uppercase text-emerald-600">
                  Appraisal
                </div>
                <div className="text-sm text-emerald-100">
                  {selectedRecord ? formatValue(selectedRecord.appraisedValue) : 'Not appraised'}
                </div>
              </div>
              <div className="rounded-md border border-emerald-900/50 px-2 py-1.5">
                <div className="font-mono-tabular text-[8px] uppercase text-emerald-600">
                  Condition
                </div>
                <div className="text-sm text-emerald-100">
                  {selectedRecord ? `${selectedRecord.conditionScore}/100` : '—'}
                </div>
              </div>
              <div className="rounded-md border border-emerald-900/50 px-2 py-1.5">
                <div className="font-mono-tabular text-[8px] uppercase text-emerald-600">
                  Quality
                </div>
                <div className="text-sm text-emerald-100">
                  {selectedRecord ? `${selectedRecord.qualityScore}/100` : '—'}
                </div>
              </div>
              <div className="rounded-md border border-emerald-900/50 px-2 py-1.5">
                <div className="font-mono-tabular text-[8px] uppercase text-emerald-600">
                  Warranty
                </div>
                <div className="text-sm text-emerald-100">
                  {selectedRecord?.warrantyMonths
                    ? `${selectedRecord.warrantyMonths} months`
                    : '—'}
                </div>
              </div>
            </div>

            <div className="mt-2 rounded-md border border-emerald-900/50 px-2 py-1.5 text-[10px] text-emerald-200/70">
              {selectedRecord?.certificateId
                ? `Inspection certificate ${selectedRecord.certificateId}`
                : 'No inspection certificate issued yet.'}
              {selectedEngraving ? (
                <div className="mt-1 text-amber-200">
                  Engraved: {selectedEngraving.label} — visible on bumpers, quarters and wheels.
                </div>
              ) : (
                <div className="mt-1 text-emerald-500">No engraving on this car yet.</div>
              )}
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
              <button
                type="button"
                disabled={!installed.has('condition_appraisal')}
                onClick={() => {
                  engine.appraiseRestorationFacilityVehicle(selectedVehicle.id);
                  refreshVehicles();
                }}
                className="rounded-md border border-emerald-700/70 bg-emerald-900/30 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-200 transition enabled:hover:bg-emerald-800/50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Appraise
              </button>
              <button
                type="button"
                disabled={
                  !installed.has('display_area') ||
                  selectedVehicle.active ||
                  !selectedRecord
                }
                onClick={() => {
                  engine.setRestorationFacilityDisplay(
                    selectedVehicle.id,
                    !selectedRecord?.displayed,
                  );
                  refreshVehicles();
                }}
                className="rounded-md border border-emerald-700/70 bg-emerald-900/30 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-200 transition enabled:hover:bg-emerald-800/50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {selectedRecord?.displayed ? 'Remove from display' : 'Put on display'}
              </button>
              <button
                type="button"
                disabled={
                  !installed.has('engraving_studio') ||
                  selectedVehicle.active ||
                  !selectedRecord
                }
                onClick={() =>
                  setEngravingFor(
                    engravingFor === selectedVehicle.id ? null : selectedVehicle.id,
                  )
                }
                className="rounded-md border border-amber-700/70 bg-amber-950/20 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200 transition enabled:hover:bg-amber-900/30 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Engrave car
              </button>
            </div>

            {engravingFor === selectedVehicle.id ? (
              <div className="mt-2 rounded-lg border border-amber-800/60 bg-amber-950/15 p-2">
                <div className="mb-1 font-mono-tabular text-[9px] uppercase tracking-[0.16em] text-amber-500">
                  Choose an engraving design
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {FACILITY_ENGRAVING_DESIGNS.map((design) => (
                    <button
                      key={design.id}
                      type="button"
                      onClick={() => {
                        engine.startRestorationFacilityEngraving(
                          selectedVehicle.id,
                          design.id,
                        );
                        setEngravingFor(null);
                        refreshVehicles();
                      }}
                      className="rounded-md border border-amber-900/70 bg-[#120f08] px-2 py-1.5 text-left transition hover:border-amber-600/70"
                    >
                      <div
                        className="text-[11px] font-semibold"
                        style={{ color: design.color }}
                      >
                        {design.label}
                      </div>
                      <div className="text-[9px] leading-snug text-emerald-200/55">
                        {design.detail}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {selectedRecord?.photos.length ? (
              <div className="mt-2">
                <div className="font-mono-tabular text-[9px] uppercase tracking-[0.16em] text-emerald-600">
                  Progress photography
                </div>
                <div className="mt-1 space-y-1">
                  {selectedRecord.photos.slice(-6).map((photo) => (
                    <div
                      key={photo.id}
                      className="flex items-center justify-between gap-2 rounded border border-emerald-950 bg-emerald-950/20 px-2 py-1 text-[9.5px] text-emerald-200/70"
                    >
                      <span className="truncate">{photo.label}</span>
                      <span className="shrink-0 font-mono-tabular text-emerald-600">
                        T+{formatFacilityTime(photo.at)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/85 p-3 sm:p-6">
      <div className="relative flex h-[min(780px,94vh)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-emerald-900/60 bg-[#07110f] shadow-[0_30px_90px_rgba(0,0,0,0.75)]">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, rgba(134,239,172,0.18) 0px, rgba(134,239,172,0.18) 1px, transparent 1px, transparent 3px)',
          }}
        />
        <div className="relative flex items-start justify-between gap-3 border-b border-emerald-900/50 bg-[#0a1a15] px-4 py-3 sm:px-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-300">
              <Terminal className="h-5 w-5" />
            </div>
            <div>
              <div className="font-mono-tabular text-[10px] font-bold uppercase tracking-[0.32em] text-emerald-500/80">
                Bayou Royal Customs
              </div>
              <h2 className="font-display text-lg font-bold leading-tight text-emerald-50">
                Player workshop computer
              </h2>
              <p className="text-[11px] text-emerald-200/55">
                Your cars only. Order builds in the terminal, fit the facility, and
                send finished cars through the engraving studio.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl border border-emerald-900 bg-emerald-950/60 text-emerald-300 transition hover:bg-emerald-900/60"
            aria-label="Close shop computer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative flex items-center justify-between gap-2 border-b border-emerald-900/40 bg-[#08150f] px-4 py-1.5 font-mono-tabular text-[10px] uppercase tracking-wider text-emerald-400/70">
          <span className="flex min-w-0 items-center gap-1.5">
            <Wrench className="h-3 w-3 shrink-0" />
            <span className="truncate">{status}</span>
          </span>
          <span className="shrink-0 text-emerald-600">
            {facility.challenge.active
              ? 'CHALLENGE LIVE'
              : `${facility.bays} BAYS · PRIVATE`}
          </span>
        </div>

        <div className="relative flex gap-1 border-b border-emerald-900/40 bg-[#07120f] px-3 pt-2">
          {(
            [
              ['terminal', 'Terminal', Terminal],
              ['facility', 'Facility', Hammer],
              ['vehicles', 'My cars', Car],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 rounded-t-lg border-x border-t px-3 py-2 text-[10.5px] font-bold uppercase tracking-wide transition ${
                tab === id
                  ? 'border-emerald-700/60 bg-[#0b1a15] text-emerald-100'
                  : 'border-transparent text-emerald-500 hover:text-emerald-300'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {tab === 'terminal' ? (
          <>
            {renderTerminal()}
          </>
        ) : tab === 'facility' ? (
          renderFacility()
        ) : (
          renderVehicles()
        )}
      </div>
    </div>
  );
}
