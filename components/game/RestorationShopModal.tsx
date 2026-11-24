'use client';

import React, { useMemo, useState } from 'react';
import {
  Armchair,
  Car,
  Check,
  CircleDot,
  Disc3,
  Gauge,
  Lightbulb,
  Package,
  Palette,
  Ship,
  Sparkles,
  Truck,
  Wrench,
  X,
} from 'lucide-react';
import type { GameEngine } from '@/game/engine/GameEngine';
import {
  CUSTOM_RESTORATION_STAGES,
  CUSTOM_SHOP_PART_CRATES,
  DONOR_CARS,
  DONOR_SHELL_CRATE,
  DONOR_SOURCES,
  DONOR_DAMAGE,
  HEADLIGHT_OPTIONS,
  INTERIOR_OPTIONS,
  PAINT_OPTIONS,
  RIM_OPTIONS,
  ROOF_OPTIONS,
  STEERING_WHEEL_OPTIONS,
  UNDERCARRIAGE_OPTIONS,
  resolveCustomShopBuild,
  type CustomShopBuild,
  type CustomShopBuildOptionKey,
  type RestorationShopHudState,
} from '@/game/systems/customCarShop';
import { HUDStateSnapshot } from '@/game/types';

interface RestorationShopModalProps {
  engine: GameEngine;
  hud: HUDStateSnapshot;
  onClose: () => void;
}

const FORKLIFT_LABELS: Record<RestorationShopHudState['forkliftLeg'], string> = {
  parked: 'Forklift parked at the bay',
  loading: 'Forklift at the barge, loading',
  to_shop: 'Forklift hauling to the shop',
  unloading: 'Forklift setting the crate down',
  to_ship: 'Empty forklift returning',
};

function SectionTitle({
  icon,
  step,
  title,
  hint,
}: {
  icon: React.ReactNode;
  step: string;
  title: string;
  hint: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300">
        {icon}
      </div>
      <div>
        <div className="flex items-baseline gap-2">
          <span className="font-mono-tabular text-[10px] font-bold uppercase tracking-[0.18em] text-amber-500/70">
            {step}
          </span>
          <h3 className="font-display text-sm font-bold text-stone-100">{title}</h3>
        </div>
        <p className="text-[11px] leading-snug text-stone-400">{hint}</p>
      </div>
    </div>
  );
}

function ChoiceCard({
  selected,
  disabled,
  onClick,
  title,
  subtitle,
  detail,
  swatch,
  badge,
}: {
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
  title: string;
  subtitle?: string;
  detail?: string;
  swatch?: string;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group relative w-full rounded-xl border p-3 text-left transition ${
        selected
          ? 'border-amber-400/80 bg-gradient-to-br from-amber-950/70 to-stone-950 shadow-[0_0_0_1px_rgba(251,191,36,0.25)]'
          : 'border-stone-800 bg-stone-950/70 hover:border-amber-500/40 hover:bg-stone-900/70'
      } ${disabled ? 'cursor-default opacity-80' : 'cursor-pointer'}`}
    >
      <div
        className={`flex items-start justify-between gap-2 ${
          selected ? 'pr-5' : ''
        }`}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {swatch && (
              <span
                className="h-3.5 w-3.5 shrink-0 rounded-full border border-white/25 shadow-inner"
                style={{ backgroundColor: swatch }}
              />
            )}
            <span className="truncate text-xs font-bold text-stone-100">{title}</span>
          </div>
          {subtitle && (
            <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-400/80">
              {subtitle}
            </div>
          )}
          {detail && (
            <p className="mt-1 line-clamp-2 text-[10.5px] leading-snug text-stone-400">
              {detail}
            </p>
          )}
        </div>
        {badge && (
          <span className="shrink-0 rounded-md border border-stone-700 bg-stone-900 px-1.5 py-0.5 font-mono-tabular text-[9px] font-semibold text-stone-300">
            {badge}
          </span>
        )}
        {selected && (
          <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-stone-950">
            <Check className="h-3 w-3" strokeWidth={3} />
          </span>
        )}
      </div>
    </button>
  );
}

export function RestorationShopModal({
  engine,
  hud,
  onClose,
}: RestorationShopModalProps) {
  const snapshot = hud.restorationShop ?? engine.getRestorationShopHudState();
  const [draft, setDraft] = useState<CustomShopBuild | null>(null);
  const build = snapshot.started ? snapshot.build : draft ?? snapshot.build;
  const locked = snapshot.started;
  const resolved = useMemo(() => resolveCustomShopBuild(build), [build]);
  const cargoCrates =
    build.donorSource === 'freight'
      ? [DONOR_SHELL_CRATE, ...CUSTOM_SHOP_PART_CRATES]
      : CUSTOM_SHOP_PART_CRATES;
  const delivered = new Set(snapshot.deliveredCrateIds);
  const currentStageIndex = snapshot.stageIndex;

  const choose = <K extends CustomShopBuildOptionKey>(
    key: K,
    value: CustomShopBuild[K],
  ) => {
    if (locked) return;
    setDraft((previous) => ({
      ...(previous ?? snapshot.build),
      [key]: value,
    }));
    engine.selectRestorationBuildOption(key, value);
  };

  const start = () => {
    if (engine.startRestorationBuild()) onClose();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-2 sm:p-5">
      <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-amber-900/40 bg-stone-950 shadow-2xl">
        {/* Header */}
        <div className="relative overflow-hidden border-b border-stone-800 bg-gradient-to-r from-[#241016] via-stone-950 to-stone-950 px-4 py-3.5 sm:px-5">
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                'radial-gradient(circle at 12% 0%, rgba(214,163,74,0.22), transparent 46%), radial-gradient(circle at 82% 100%, rgba(110,31,60,0.45), transparent 52%)',
            }}
          />
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-300">
                <Wrench className="h-5 w-5" />
              </div>
              <div>
                <div className="font-mono-tabular text-[10px] font-bold uppercase tracking-[0.3em] text-amber-500/80">
                  Bayou Royal Customs
                </div>
                <h2 className="font-display text-lg font-bold leading-tight text-stone-50 sm:text-xl">
                  Frame-off build sheet
                </h2>
                <p className="text-[11px] text-stone-400">
                  Pick a Cave 12 wreck or a wrapped Crescent City auction shell. The barge
                  takes three minutes; the crew strips the car while it crosses.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl border border-stone-700 bg-stone-900 text-stone-300 hover:bg-stone-800"
              aria-label="Close build sheet"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 overflow-hidden lg:grid-cols-[1fr_19rem]">
          {/* Left: options */}
          <div className="survival-scroll min-h-0 overflow-y-auto p-4 sm:p-5">
            {locked ? (
              <div className="mb-4 rounded-xl border border-amber-500/25 bg-amber-950/20 p-3">
                <div className="flex items-center gap-2 text-amber-200">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-xs font-bold">
                    {snapshot.completed ? 'Build complete' : 'Build locked in — work in progress'}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-snug text-stone-300">
                  {snapshot.completed
                    ? 'The car is finished, aligned and parked on the bay. Walk outside to drive it.'
                    : 'Close the sheet so the crew can keep working. Reopen it from the shop door to check the lift, the trunk install and the parts run.'}
                </p>
              </div>
            ) : (
              <p className="mb-4 rounded-xl border border-stone-800 bg-stone-900/50 p-3 text-[11px] leading-relaxed text-stone-300">
                Pick exactly what you want built. Nothing gets cut until you send the crew out.
              </p>
            )}

            <div className="space-y-5">
              <section className="space-y-2">
                <SectionTitle
                  icon={<Ship className="h-4 w-4" />}
                  step="ROUTE"
                  title="Where is the donor coming from?"
                  hint="Tow a Cave 12 wreck, or buy a wrapped auction shell off the Crescent City barge."
                />
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {DONOR_SOURCES.map((source) => (
                    <ChoiceCard
                      key={source.id}
                      selected={build.donorSource === source.id}
                      disabled={locked}
                      onClick={() => choose('donorSource', source.id)}
                      title={source.label}
                      subtitle={source.id === 'freight' ? '3-minute barge run' : 'Shop truck tow'}
                      detail={source.detail}
                    />
                  ))}
                </div>
                <div className="rounded-xl border border-stone-800 bg-stone-900/50 p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-400/80">
                    {build.donorSource === 'freight' ? 'Auction shell condition' : 'As-found condition'}
                  </div>
                  <p className="mt-1 text-[11px] leading-snug text-stone-300">
                    {resolved.damage.summary}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[9px] font-medium">
                    <span className="rounded border border-stone-700 bg-stone-950 px-1.5 py-0.5 text-stone-300">
                      {resolved.damage.dents} dents
                    </span>
                    <span className="rounded border border-stone-700 bg-stone-950 px-1.5 py-0.5 text-stone-300">
                      {resolved.damage.rustHoles} rust holes
                    </span>
                    {resolved.damage.collapsedRoof && (
                      <span className="rounded border border-amber-700/40 bg-amber-950/30 px-1.5 py-0.5 text-amber-200">
                        caved roof
                      </span>
                    )}
                    {resolved.damage.fireDamage && (
                      <span className="rounded border border-red-800/50 bg-red-950/30 px-1.5 py-0.5 text-red-200">
                        fire damage
                      </span>
                    )}
                    {resolved.damage.trash !== 'none' && (
                      <span className="rounded border border-lime-800/40 bg-lime-950/25 px-1.5 py-0.5 text-lime-200">
                        leaves &amp; animal mess
                      </span>
                    )}
                  </div>
                </div>
              </section>

              <section className="space-y-2">
                <SectionTitle
                  icon={<Car className="h-4 w-4" />}
                  step="01"
                  title="What kind of car do you want?"
                  hint={
                    build.donorSource === 'freight'
                      ? 'The barge brings a bare shell and chassis from a Crescent City car sale; crates bring the engine and parts.'
                      : 'These are real full-frame donors that Duke can pull out of Cave 12.'
                  }
                />
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {DONOR_CARS.map((donor) => (
                    <ChoiceCard
                      key={donor.id}
                      selected={build.donorCarId === donor.id}
                      disabled={locked}
                      onClick={() => choose('donorCarId', donor.id)}
                      title={donor.shortName}
                      subtitle={donor.body}
                      detail={donor.detail}
                      badge={`${DONOR_DAMAGE[donor.id].rustHoles} holes`}
                    />
                  ))}
                </div>
              </section>

              <section className="space-y-2">
                <SectionTitle
                  icon={<Palette className="h-4 w-4" />}
                  step="02"
                  title="Paint & pinstripe"
                  hint="Candy base, clear coat and hand-laid stripes."
                />
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {PAINT_OPTIONS.map((paint) => (
                    <ChoiceCard
                      key={paint.id}
                      selected={build.paintId === paint.id}
                      disabled={locked}
                      onClick={() => choose('paintId', paint.id)}
                      title={paint.label}
                      swatch={paint.color}
                      detail={paint.detail}
                    />
                  ))}
                </div>
              </section>

              <section className="space-y-2">
                <SectionTitle
                  icon={<Disc3 className="h-4 w-4" />}
                  step="03"
                  title="Rims & tires"
                  hint="Straight-lace Daytons, Vogues, Forgiatos or old-school steelies."
                />
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {RIM_OPTIONS.map((rim) => (
                    <ChoiceCard
                      key={rim.id}
                      selected={build.rimId === rim.id}
                      disabled={locked}
                      onClick={() => choose('rimId', rim.id)}
                      title={rim.label}
                      badge={`${rim.diameterInches}"`}
                      swatch={rim.color}
                      detail={rim.detail}
                    />
                  ))}
                </div>
              </section>

              <section className="space-y-2">
                <SectionTitle
                  icon={<CircleDot className="h-4 w-4" />}
                  step="04"
                  title="Steering wheel"
                  hint="Chain wheel, billet, wood rim, suede or a restored factory wheel."
                />
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {STEERING_WHEEL_OPTIONS.map((wheel) => (
                    <ChoiceCard
                      key={wheel.id}
                      selected={build.steeringWheelId === wheel.id}
                      disabled={locked}
                      onClick={() => choose('steeringWheelId', wheel.id)}
                      title={wheel.label}
                      swatch={wheel.accentColor}
                      detail={wheel.detail}
                    />
                  ))}
                </div>
              </section>

              <section className="space-y-2">
                <SectionTitle
                  icon={<Armchair className="h-4 w-4" />}
                  step="05"
                  title="Interior & upholstery"
                  hint="Seats rebuilt with new foam, hides, carpet and headliner."
                />
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {INTERIOR_OPTIONS.map((interior) => (
                    <ChoiceCard
                      key={interior.id}
                      selected={build.interiorId === interior.id}
                      disabled={locked}
                      onClick={() => choose('interiorId', interior.id)}
                      title={interior.label}
                      swatch={interior.color}
                      detail={interior.detail}
                    />
                  ))}
                </div>
              </section>

              <section className="space-y-2">
                <SectionTitle
                  icon={<Sparkles className="h-4 w-4" />}
                  step="06"
                  title="Roof & hardtop"
                  hint="Vinyl landau, shaved slick top, power ragtop, T-tops or factory steel."
                />
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {ROOF_OPTIONS.map((roof) => (
                    <ChoiceCard
                      key={roof.id}
                      selected={build.roofId === roof.id}
                      disabled={locked}
                      onClick={() => choose('roofId', roof.id)}
                      title={roof.label}
                      detail={roof.detail}
                    />
                  ))}
                </div>
              </section>

              <section className="space-y-2">
                <SectionTitle
                  icon={<Gauge className="h-4 w-4" />}
                  step="07"
                  title="Undercarriage & suspension"
                  hint="Stock suspension comes off before the hydraulics go in."
                />
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {UNDERCARRIAGE_OPTIONS.map((option) => (
                    <ChoiceCard
                      key={option.id}
                      selected={build.undercarriageId === option.id}
                      disabled={locked}
                      onClick={() => choose('undercarriageId', option.id)}
                      title={option.label}
                      detail={option.detail}
                    />
                  ))}
                </div>
              </section>

              <section className="space-y-2">
                <SectionTitle
                  icon={<Lightbulb className="h-4 w-4" />}
                  step="08"
                  title="Headlights & electrical"
                  hint="New buckets, relays and a proper beam aim on the shop wall."
                />
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {HEADLIGHT_OPTIONS.map((option) => (
                    <ChoiceCard
                      key={option.id}
                      selected={build.headlightId === option.id}
                      disabled={locked}
                      onClick={() => choose('headlightId', option.id)}
                      title={option.label}
                      swatch={option.color}
                      detail={option.detail}
                    />
                  ))}
                </div>
              </section>
            </div>
          </div>

          {/* Right: summary + live progress */}
          <aside className="survival-scroll min-h-0 overflow-y-auto border-t border-stone-800 bg-gradient-to-b from-stone-900/80 to-stone-950 p-4 lg:border-l lg:border-t-0">
            <div className="rounded-xl border border-amber-900/40 bg-[#1a1013] p-3">
              <div className="font-mono-tabular text-[9px] font-bold uppercase tracking-[0.24em] text-amber-500/80">
                Build summary
              </div>
              <div className="mt-1 font-display text-base font-bold leading-tight text-stone-50">
                {resolved.name}
              </div>
              <div className="mt-1 text-[11px] text-stone-400">{resolved.donor.body}</div>
              <div className="mt-3 grid grid-cols-2 gap-1.5 text-[10px]">
                <span className="rounded-md border border-stone-800 bg-stone-950 px-2 py-1 text-stone-300">
                  {resolved.rims.diameterInches}&quot; {resolved.rims.style}
                </span>
                <span className="rounded-md border border-stone-800 bg-stone-950 px-2 py-1 text-stone-300">
                  {resolved.interior.label}
                </span>
                <span className="rounded-md border border-stone-800 bg-stone-950 px-2 py-1 text-stone-300">
                  {resolved.steeringWheel.label}
                </span>
                <span className="rounded-md border border-stone-800 bg-stone-950 px-2 py-1 text-stone-300">
                  {resolved.roof.label}
                </span>
              </div>
              <div className="mt-3 space-y-1">
                {resolved.accessories.slice(0, 5).map((accessory) => (
                  <div key={accessory} className="flex items-start gap-1.5 text-[10px] text-stone-400">
                    <Check className="mt-0.5 h-2.5 w-2.5 shrink-0 text-emerald-400" />
                    <span>{accessory}</span>
                  </div>
                ))}
              </div>
            </div>

            {locked ? (
              <div className="mt-3 space-y-3">
                <div>
                  <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                    <span>Restoration</span>
                    <span className="font-mono-tabular text-amber-300">
                      {Math.round(snapshot.overallProgress * 100)}%
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full border border-stone-700 bg-stone-900">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-300 transition-all duration-500"
                      style={{ width: `${Math.round(snapshot.overallProgress * 100)}%` }}
                    />
                  </div>
                  <div className="mt-1.5 text-[11px] font-semibold text-stone-200">
                    {snapshot.stageLabel}
                  </div>
                  <p className="mt-0.5 text-[10px] leading-snug text-stone-400">
                    {snapshot.stageDetail}
                  </p>
                  {(snapshot.cargoPhase === 'steaming_in' ||
                    snapshot.phase === 'waiting_donor') && (
                    <div className="mt-1.5 flex items-center justify-between rounded-md border border-sky-500/30 bg-sky-950/30 px-2 py-1 font-mono-tabular text-[10px] text-sky-200">
                      <span>
                        {snapshot.cargoPhase === 'steaming_in'
                          ? 'Barge from Crescent City'
                          : 'Barge alongside the pier'}
                      </span>
                      <span className="font-bold">
                        {snapshot.cargoPhase === 'steaming_in'
                          ? `ETA ${snapshot.cargoEtaLabel}`
                          : 'Unloading shell'}
                      </span>
                    </div>
                  )}
                  {snapshot.waitingForParts && (
                    <div className="mt-1.5 rounded-md border border-sky-500/30 bg-sky-950/30 px-2 py-1 text-[10px] text-sky-200">
                      The lift is waiting on the Crescent City barge before this stage can start.
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-sky-300">
                    <Ship className="h-3 w-3" /> Parts run
                  </div>
                  <p className="mt-0.5 text-[10px] leading-snug text-stone-300">
                    {snapshot.cargoLabel}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-[10px] text-stone-500">
                    <Truck className="h-3 w-3" />
                    {FORKLIFT_LABELS[snapshot.forkliftLeg]}
                  </p>
                </div>

                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                    On the lift
                  </div>
                  <ol className="mt-1 space-y-1">
                    {CUSTOM_RESTORATION_STAGES.map((stage, index) => {
                      const done = index < currentStageIndex;
                      const active = index === currentStageIndex;
                      return (
                        <li
                          key={stage.id}
                          className={`flex items-start gap-1.5 text-[10px] leading-snug ${
                            active
                              ? 'text-amber-200'
                              : done
                                ? 'text-stone-500 line-through decoration-stone-700'
                                : 'text-stone-500'
                          }`}
                        >
                          <span
                            className={`mt-0.5 flex h-3 w-3 shrink-0 items-center justify-center rounded-full border ${
                              done
                                ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-300'
                                : active
                                  ? 'border-amber-400 bg-amber-400/20 text-amber-200'
                                  : 'border-stone-700 text-stone-600'
                            }`}
                          >
                            {done ? (
                              <Check className="h-2 w-2" strokeWidth={3} />
                            ) : (
                              <span className="text-[7px] font-bold">{index + 1}</span>
                            )}
                          </span>
                          <span>{stage.label}</span>
                        </li>
                      );
                    })}
                  </ol>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                    <Package className="h-3 w-3" /> Crescent City parts
                  </div>
                  <div className="mt-1 space-y-1">
                    {cargoCrates.map((crate) => {
                      const arrived = delivered.has(crate.id);
                      return (
                        <div
                          key={crate.id}
                          className={`rounded-md border px-2 py-1 text-[10px] ${
                            arrived
                              ? 'border-emerald-700/50 bg-emerald-950/20 text-emerald-200'
                              : 'border-stone-800 bg-stone-950 text-stone-500'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold">{crate.label}</span>
                            {arrived ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <span className="font-mono-tabular text-[9px]">ON BARGE</span>
                            )}
                          </div>
                          <div className="mt-0.5 text-[9px] leading-snug opacity-80">
                            {crate.manifest.slice(0, 2).join(' · ')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                <div className="rounded-xl border border-stone-800 bg-stone-950/70 p-3">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                    <Ship className="h-3 w-3" /> Parts logistics
                  </div>
                  <p className="mt-1 text-[10px] leading-snug text-stone-400">
                    The Crescent City barge takes three minutes up the bayou with five parts
                    crates{resolved.build.donorSource === 'freight' ? ' and the wrapped shell on its timber tray' : ''}.
                    Rae runs the forklift from the pier to the bay; Duke cuts, welds, paints and
                    stitches the car on the lift, then takes it on a road test.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={start}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 px-4 py-3 text-sm font-bold text-stone-950 shadow-lg shadow-amber-900/30 transition hover:from-amber-400 hover:to-amber-300"
                >
                  <Truck className="h-4 w-4" />
                  {resolved.build.donorSource === 'freight'
                    ? 'Order the auction shell from Crescent City'
                    : 'Send Duke & Rae to Cave 12'}
                </button>
                <p className="text-center text-[10px] leading-snug text-stone-500">
                  The car is stripped, hydraulicked, painted, re-trimmed, re-roofed, re-wheeled,
                  aligned and aimed — start to finish.
                </p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
