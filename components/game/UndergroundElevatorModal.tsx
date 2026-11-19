'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpFromLine,
  Car,
  Gauge,
  Monitor,
  Search,
  Sparkles,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import {
  ELEVATOR_EXOTIC_LIFT,
  ELEVATOR_VOICE_COMPUTER,
  ExoticCarClass,
  ExoticElevatorCar,
  PlayerHonorific,
  VAULT_COMPUTER_VOICE,
} from '@/game/systems/undergroundElevator';

interface UndergroundElevatorModalProps {
  onClose: () => void;
  onBringCarToSurface: (carId: string) => void;
}

const CLASS_FILTERS: Array<'All' | ExoticCarClass> = [
  'All',
  'Modern Exotic',
  'Modern Hypercar',
  'Ultra Rare',
];

const HONORIFIC_OPTIONS: PlayerHonorific[] = ['Sir', "Ma'am", 'Friend'];

export function UndergroundElevatorModal({
  onClose,
  onBringCarToSurface,
}: UndergroundElevatorModalProps) {
  const [selectedId, setSelectedId] = useState<string>(
    ELEVATOR_EXOTIC_LIFT.selectedCarId || ELEVATOR_EXOTIC_LIFT.cars[0].id,
  );
  const [filterClass, setFilterClass] = useState<'All' | ExoticCarClass>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [honorific, setHonorific] = useState<PlayerHonorific>(() =>
    VAULT_COMPUTER_VOICE.getHonorific(),
  );
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(() =>
    VAULT_COMPUTER_VOICE.isEnabled(),
  );
  const [aiMessage, setAiMessage] = useState<string>(
    `What kind of car do you want? Would you like me to bring it up today, ${VAULT_COMPUTER_VOICE.getHonorific()}?`,
  );

  // Greet the player out loud with the AI Computer Voice as soon as the computer opens!
  useEffect(() => {
    ELEVATOR_VOICE_COMPUTER.onApproachTerminal((line) => setAiMessage(line));
  }, []);

  const filteredCars = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return ELEVATOR_EXOTIC_LIFT.cars.filter((c) => {
      const classOk = filterClass === 'All' || c.class === filterClass;
      const searchOk =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.rarity.toLowerCase().includes(q) ||
        c.class.toLowerCase().includes(q);
      return classOk && searchOk;
    });
  }, [filterClass, searchQuery]);

  const selectedCar: ExoticElevatorCar = useMemo(() => {
    return (
      ELEVATOR_EXOTIC_LIFT.cars.find((c) => c.id === selectedId) ??
      ELEVATOR_EXOTIC_LIFT.cars[0]
    );
  }, [selectedId]);

  const handleChangeHonorific = (nextTitle: PlayerHonorific) => {
    setHonorific(nextTitle);
    ELEVATOR_VOICE_COMPUTER.setHonorific(nextTitle);
    ELEVATOR_VOICE_COMPUTER.onApproachTerminal((line) => setAiMessage(line));
  };

  const handleToggleVoice = () => {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    ELEVATOR_VOICE_COMPUTER.setEnabled(next);
    if (next) {
      const line = `Vault Computer voice online, ${honorific}.`;
      setAiMessage(line);
      ELEVATOR_VOICE_COMPUTER.speak(line);
    }
  };

  const handleSelectPreview = (car: ExoticElevatorCar) => {
    ELEVATOR_EXOTIC_LIFT.selectForPreview(car.id);
    setSelectedId(car.id);
    ELEVATOR_VOICE_COMPUTER.onPreviewCar(car.name, (line) => setAiMessage(line));
  };

  const handleSummon = () => {
    ELEVATOR_VOICE_COMPUTER.onConfirmBringUp(selectedCar.name, (line) =>
      setAiMessage(line),
    );
    onBringCarToSurface(selectedCar.id);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-2 sm:p-4"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="relative w-full max-w-5xl max-h-[92vh] overflow-hidden rounded-2xl bg-slate-950 border border-cyan-500/50 shadow-2xl flex flex-col">
        {/* Computer Terminal Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950/70 border-b border-white/10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-400/50 flex items-center justify-center text-cyan-300 shrink-0">
              <Monitor className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">
                UNDERGROUND GARAGE ELEVATOR COMPUTER · VOICE AI
              </div>
              <h2 className="text-base sm:text-lg font-black text-white truncate">
                Subterranean Exotic Vault Terminal (15 Cars)
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Address Me As: Sir / Ma'am / Boss */}
            <div className="flex items-center rounded-xl bg-slate-900 border border-white/15 p-0.5">
              {HONORIFIC_OPTIONS.map((title) => (
                <button
                  key={title}
                  type="button"
                  onClick={() => handleChangeHonorific(title)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition ${
                    honorific === title
                      ? 'bg-cyan-400 text-slate-950'
                      : 'text-stone-300 hover:text-white'
                  }`}
                >
                  {title}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleToggleVoice}
              className={`h-9 px-2.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition ${
                voiceEnabled
                  ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-300'
                  : 'bg-slate-800 border-white/15 text-stone-400'
              }`}
              title={voiceEnabled ? 'Mute AI Voice' : 'Enable AI Voice'}
            >
              {voiceEnabled ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">
                {voiceEnabled ? 'Voice ON' : 'Muted'}
              </span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 flex items-center justify-center text-stone-200 transition"
              aria-label="Close Underground Elevator Computer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* AI Computer Voice Prompt Banner */}
        <div className="px-4 sm:px-6 py-2.5 bg-cyan-950/40 border-b border-cyan-500/25 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />
            <p className="text-xs sm:text-sm font-semibold text-cyan-100 truncate">
              “{aiMessage}”
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              ELEVATOR_VOICE_COMPUTER.onApproachTerminal((line) =>
                setAiMessage(line),
              );
            }}
            className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-[11px] font-bold text-cyan-200 shrink-0 transition"
          >
            Replay Voice
          </button>
        </div>

        {/* Body: Live Car Preview Stage + Vault Roster */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 sm:p-5">
          {/* Left 7 cols: Live Car Preview Stage */}
          <div className="lg:col-span-7 flex flex-col gap-3">
            <div className="relative rounded-2xl bg-gradient-to-b from-slate-900 via-slate-950 to-black border border-white/10 p-5 overflow-hidden">
              {/* Top Badges */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-cyan-500/15 border border-cyan-400/40 text-[11px] font-extrabold text-cyan-300 uppercase tracking-wider">
                    {selectedCar.class}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-400/40 text-[11px] font-extrabold text-amber-300 uppercase tracking-wider">
                    {selectedCar.rarity}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-stone-400">
                  LIFT STATUS:{' '}
                  <strong className="text-emerald-400">
                    {ELEVATOR_EXOTIC_LIFT.activeSurfaceCarId === selectedCar.id
                      ? 'ON SURFACE PAD'
                      : 'READY IN VAULT'}
                  </strong>
                </span>
              </div>

              {/* Showroom Turntable & Live Stylized Exotic Preview */}
              <div className="relative h-44 sm:h-52 flex flex-col items-center justify-center">
                <div
                  className="absolute bottom-6 w-72 h-10 rounded-full blur-2xl opacity-60 transition-colors duration-300"
                  style={{ backgroundColor: selectedCar.underglowColor }}
                />
                <div className="absolute bottom-4 w-[82%] h-10 rounded-[100%] border-2 border-cyan-400/45 bg-slate-900/90 shadow-inner" />

                <div className="relative z-10 w-[86%] max-w-[360px] flex flex-col items-center">
                  <div className="w-full flex justify-start pl-4 -mb-2">
                    <div
                      className="w-12 h-2 rounded-sm shadow"
                      style={{ backgroundColor: selectedCar.accentColor }}
                    />
                  </div>
                  <div className="w-[54%] h-11 rounded-t-[42px] border-t-2 border-x-2 border-white/25 bg-gradient-to-b from-sky-200/35 to-slate-950/90 translate-y-2 shadow-inner" />
                  <div
                    className="relative w-full h-14 rounded-tl-[26px] rounded-tr-[44px] rounded-bl-xl rounded-br-2xl border border-white/25 shadow-2xl flex items-center justify-between px-4 transition-colors duration-300"
                    style={{
                      background: `linear-gradient(135deg, ${selectedCar.paintColor} 0%, ${selectedCar.paintColor}dd 65%, ${selectedCar.accentColor} 100%)`,
                    }}
                  >
                    <div className="w-4 h-2 rounded-full bg-red-500 shadow-[0_0_12px_#ef4444]" />
                    <div
                      className="w-24 h-3.5 rounded-full opacity-85 border border-white/20"
                      style={{ backgroundColor: selectedCar.accentColor }}
                    />
                    <div className="w-6 h-2 rounded-full bg-cyan-200 shadow-[0_0_14px_#67e8f9]" />
                  </div>
                  <div className="w-[78%] flex items-center justify-between -mt-5 px-2">
                    {[0, 1].map((w) => (
                      <div
                        key={w}
                        className="w-14 h-14 rounded-full bg-stone-950 border-[4px] border-stone-800 flex items-center justify-center shadow-xl"
                      >
                        <div
                          className="w-9 h-9 rounded-full border-2 border-dashed flex items-center justify-center"
                          style={{
                            borderColor: selectedCar.rimColor,
                            backgroundColor: '#1e293b',
                          }}
                        >
                          <div
                            className="w-3.5 h-3.5 rounded-full"
                            style={{ backgroundColor: selectedCar.accentColor }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-3">
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {selectedCar.name}
                </h3>
                <p className="text-xs sm:text-sm text-stone-300 mt-1">
                  {selectedCar.tagline}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4">
                <div className="rounded-xl bg-slate-900/90 border border-white/10 px-3 py-2">
                  <div className="text-[10px] uppercase tracking-wider text-stone-400 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-400" /> Power
                  </div>
                  <div className="text-sm sm:text-base font-black text-white">
                    {selectedCar.horsepower} HP
                  </div>
                </div>
                <div className="rounded-xl bg-slate-900/90 border border-white/10 px-3 py-2">
                  <div className="text-[10px] uppercase tracking-wider text-stone-400 flex items-center gap-1">
                    <Gauge className="w-3 h-3 text-cyan-400" /> Top Speed
                  </div>
                  <div className="text-sm sm:text-base font-black text-white">
                    {selectedCar.topSpeedMph} MPH
                  </div>
                </div>
                <div className="rounded-xl bg-slate-900/90 border border-white/10 px-3 py-2">
                  <div className="text-[10px] uppercase tracking-wider text-stone-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-emerald-400" /> 0–60 MPH
                  </div>
                  <div className="text-sm sm:text-base font-black text-white">
                    {selectedCar.zeroToSixty}
                  </div>
                </div>
              </div>

              <div className="mt-2.5 text-[11px] font-mono text-cyan-300/90">
                ENGINE: {selectedCar.engine} · WORKING OPENING DOORS & FULL INTERIOR
              </div>
            </div>

            {/* Primary CTA: Bring Car to Surface */}
            <button
              type="button"
              onClick={handleSummon}
              className="w-full min-h-[50px] rounded-xl bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-slate-950 font-black text-sm sm:text-base tracking-wide shadow-xl flex items-center justify-center gap-2 transition"
            >
              <ArrowUpFromLine className="w-5 h-5" />
              Bring {selectedCar.name} to Surface (“OK {honorific}!”)
            </button>
          </div>

          {/* Right 5 cols: Search + Filter + 15-Car Vault Roster */}
          <div className="lg:col-span-5 flex flex-col gap-2.5 min-h-0">
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type a car name (Bugatti, Ferrari, McLaren...)"
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-xs sm:text-sm text-white placeholder:text-stone-500 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {CLASS_FILTERS.map((cls) => (
                <button
                  key={cls}
                  type="button"
                  onClick={() => setFilterClass(cls)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold border transition ${
                    filterClass === cls
                      ? 'bg-cyan-400 border-cyan-200 text-slate-950'
                      : 'bg-slate-900 border-white/10 text-stone-300 hover:border-cyan-400/50'
                  }`}
                >
                  {cls}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto max-h-[340px] lg:max-h-[415px] space-y-2 pr-1">
              {filteredCars.map((car) => {
                const isSelected = car.id === selectedCar.id;
                const isOnSurface = ELEVATOR_EXOTIC_LIFT.activeSurfaceCarId === car.id;
                return (
                  <button
                    key={car.id}
                    type="button"
                    onClick={() => handleSelectPreview(car)}
                    className={`w-full text-left rounded-xl p-2.5 border transition flex items-center justify-between gap-2.5 ${
                      isSelected
                        ? 'bg-cyan-950/60 border-cyan-400 shadow-lg'
                        : 'bg-slate-900/80 border-white/10 hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-8 h-8 rounded-lg border border-white/25 shrink-0 flex items-center justify-center"
                        style={{ backgroundColor: car.paintColor }}
                      >
                        <Car className="w-4 h-4 text-white drop-shadow" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-extrabold text-white truncate">
                          {car.name}
                        </div>
                        <div className="text-[10px] text-stone-400 truncate">
                          {car.rarity} · {car.horsepower} HP
                        </div>
                      </div>
                    </div>
                    {isOnSurface && (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/50 text-[9px] font-black text-emerald-300 uppercase shrink-0">
                        Surface
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
