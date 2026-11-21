'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Disc3,
  ExternalLink,
  Eye,
  Lightbulb,
  Music,
  Pause,
  Play,
  Radio,
  Search,
  Sparkles,
  Upload,
  Volume2,
  X,
} from 'lucide-react';
import {
  AUDIO_PROFILES,
  BUILT_IN_RADIO_STATIONS,
  CABIN_BASS_AND_FIRST_PERSON,
  CAR_RADIO_TRUNK_SYSTEM,
  CarType,
  DrivingCameraMode,
  PANDORA_APP_LAUNCHER,
  RadioCarDescriptor,
  resolveCarAudioType,
} from '@/game/systems/carRadioSystem';

interface CarRadioModalProps {
  car: RadioCarDescriptor;
  interiorView: boolean;
  trunkBassOn: boolean;
  rimLightMode?: 'off' | 'solid' | 'blink' | 'music';
  underglowEnabled?: boolean;
  onSetRimLightMode?: (mode: 'off' | 'solid' | 'blink' | 'music') => void;
  onToggleUnderglow?: () => void;
  onToggleInteriorView: () => void;
  onToggleTrunkBass: () => void;
  onClose: () => void;
}

export function CarRadioModal({
  car,
  interiorView,
  trunkBassOn,
  rimLightMode = 'blink',
  underglowEnabled = true,
  onSetRimLightMode,
  onToggleUnderglow,
  onToggleInteriorView,
  onToggleTrunkBass,
  onClose,
}: CarRadioModalProps) {
  const isOldSchool = CAR_RADIO_TRUNK_SYSTEM.isOldSchoolCar(car);
  const [pandoraQuery, setPandoraQuery] = useState(
    CAR_RADIO_TRUNK_SYSTEM.searchQuery || '',
  );
  const [pandoraUrl, setPandoraUrl] = useState(() =>
    CAR_RADIO_TRUNK_SYSTEM.searchQuery
      ? `https://www.pandora.com/search/${encodeURIComponent(
          CAR_RADIO_TRUNK_SYSTEM.searchQuery,
        )}/all`
      : 'https://www.pandora.com',
  );
  const [isPlaying, setIsPlaying] = useState(
    CABIN_BASS_AND_FIRST_PERSON.stereoPlaying,
  );
  const [activeStationId, setActiveStationId] = useState(
    CABIN_BASS_AND_FIRST_PERSON.activeStationId,
  );
  const [customTrackName, setCustomTrackName] = useState<string | null>(
    CABIN_BASS_AND_FIRST_PERSON.customTrackName,
  );
  const [audioError, setAudioError] = useState<string | null>(
    CABIN_BASS_AND_FIRST_PERSON.customTrackError,
  );
  const [volume, setVolume] = useState(CABIN_BASS_AND_FIRST_PERSON.stereoVolume);
  const carAudioType: CarType = resolveCarAudioType(car);
  const audioProfile = AUDIO_PROFILES[carAudioType];
  const [meters, setMeters] = useState({
    bassLevel: 0,
    chestThump: 0,
    trunkPump: 0,
    quarterFlex: 0,
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const quarterPanelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    CAR_RADIO_TRUNK_SYSTEM.configureForCar(car);
    CABIN_BASS_AND_FIRST_PERSON.applyVehicleRadioProfile(car);
  }, [car]);

  useEffect(() => {
    let rafId = 0;
    const panelEl = quarterPanelRef.current;
    const tick = () => {
      const sample = CABIN_BASS_AND_FIRST_PERSON.sampleBassAndChestThump(car);
      setMeters(sample);
      const playing = CABIN_BASS_AND_FIRST_PERSON.stereoPlaying;
      setIsPlaying(playing);
      const activePanel = quarterPanelRef.current ?? panelEl;
      if (activePanel) {
        if (playing && sample.quarterFlex > 0.005) {
          const movement = sample.quarterFlex;
          activePanel.style.transform = `translateX(${Math.sin(performance.now() * 0.08) * movement}px)`;
        } else {
          activePanel.style.transform = '';
        }
      }
      rafId = window.requestAnimationFrame(tick);
    };
    rafId = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(rafId);
      if (panelEl) {
        panelEl.style.transform = '';
      }
    };
  }, [car]);

  const handlePandoraSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const res = CAR_RADIO_TRUNK_SYSTEM.openPandoraSearch(pandoraQuery);
    setPandoraUrl(res.url);
  };

  const handleLaunchPandoraApp = () => {
    void PANDORA_APP_LAUNCHER.openPandoraApp(pandoraQuery);
  };

  const handleSelectStation = (stationId: string) => {
    setAudioError(null);
    CABIN_BASS_AND_FIRST_PERSON.startStation(stationId, car);
    setActiveStationId(stationId);
    setCustomTrackName(null);
    setIsPlaying(true);
  };

  const handleTogglePlay = () => {
    setAudioError(null);
    const playing = CABIN_BASS_AND_FIRST_PERSON.togglePlay(car);
    setIsPlaying(playing);
  };

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAudioError(null);
    const label = CABIN_BASS_AND_FIRST_PERSON.playCustomAudioFile(
      file,
      car,
      (errMsg) => {
        setAudioError(errMsg);
        setIsPlaying(false);
      },
    );
    setCustomTrackName(label);
    setIsPlaying(true);
    e.target.value = '';
  };

  const handleVolumeChange = (nextVol: number) => {
    setVolume(nextVol);
    CABIN_BASS_AND_FIRST_PERSON.setVolume(nextVol);
  };

  const cameraMode: DrivingCameraMode = interiorView ? 'FIRST_PERSON' : 'CHASE';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-2 sm:p-4 safe-top safe-bottom"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.m4a,.m4b,.m4p,.m4r,.mp4,.aac,.mp3,.wav,.ogg,.flac,audio/mp4,audio/x-m4a,audio/aac,video/mp4"
        className="hidden"
        onChange={handleFilePick}
      />

      <div
        id="car-radio-modal"
        className="relative w-full max-w-4xl max-h-[92dvh] overflow-hidden rounded-2xl bg-[#111522] border border-indigo-500/40 text-white shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 px-3.5 sm:px-5 py-2.5 sm:py-3 bg-gradient-to-r from-[#0b0e17] via-[#13192b] to-[#1e1b4b]/80 border-b border-white/10">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                isOldSchool
                  ? 'bg-pink-500/20 border-pink-400/50 text-pink-300'
                  : 'bg-sky-500/20 border-sky-400/50 text-sky-300'
              }`}
            >
              <Radio className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">
                  CAR RADIO &amp; PANDORA AUDIO DECK
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                    isOldSchool
                      ? 'bg-pink-500/25 border border-pink-400/50 text-pink-200'
                      : 'bg-sky-500/20 border border-sky-400/40 text-sky-200'
                  }`}
                >
                  {`${carAudioType.toUpperCase()} EQ · 150Hz +${(5 * audioProfile.bass).toFixed(1)}dB · 55Hz +${(4 * audioProfile.low).toFixed(1)}dB`}
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-black text-white truncate">
                {car.name || 'Vehicle Stereo'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleInteriorView}
              className={`min-h-[38px] px-3 py-1.5 rounded-xl border text-xs font-extrabold flex items-center gap-1.5 transition ${
                cameraMode === 'FIRST_PERSON'
                  ? 'bg-indigo-500 border-indigo-200 text-white'
                  : 'bg-slate-900 border-white/15 text-stone-200 hover:bg-slate-800'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>
                {cameraMode === 'FIRST_PERSON'
                  ? 'First-Person Cabin ON'
                  : 'Switch to 1st-Person'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                CAR_RADIO_TRUNK_SYSTEM.closePandora();
                onClose();
              }}
              className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 flex items-center justify-center text-stone-200 transition"
              aria-label="Close Car Radio"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 sm:p-5">
          {/* Left 5 cols: Bass DSP Deck, Stations & Real-Time Trunk/Chest Meters */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            {/* Live Playback Controls */}
            <div className="rounded-xl bg-[#0b0e17] border border-white/10 p-3.5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Disc3
                    className={`w-5 h-5 shrink-0 ${
                      isPlaying ? 'animate-spin text-pink-400' : 'text-stone-400'
                    }`}
                  />
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wider text-stone-400">
                      {customTrackName ? 'Custom Audio File' : 'Built-In Bass Deck'}
                    </div>
                    <div className="text-xs font-bold text-white truncate">
                      {customTrackName ||
                        BUILT_IN_RADIO_STATIONS.find((s) => s.id === activeStationId)
                          ?.name ||
                        'Stereo Ready'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleTogglePlay}
                  className={`px-3 py-2 rounded-xl font-black text-xs flex items-center gap-1.5 shrink-0 transition ${
                    isPlaying
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                  }`}
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>Play Audio</span>
                    </>
                  )}
                </button>
              </div>

              {/* Volume + Load Audio File */}
              <div className="flex items-center gap-3">
                <Volume2 className="w-4 h-4 text-stone-400 shrink-0" />
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.02}
                  value={volume}
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  className="flex-1 accent-indigo-400"
                />
                <span className="text-[11px] font-mono text-stone-300 w-9 text-right">
                  {Math.round(volume * 100)}%
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 min-w-[140px] px-3 py-2 rounded-lg bg-indigo-600/80 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Load M4A / MP3 / Audio</span>
                </button>
                {isOldSchool && (
                  <button
                    type="button"
                    onClick={onToggleTrunkBass}
                    className={`px-3 py-2 rounded-lg border text-xs font-bold transition ${
                      trunkBassOn
                        ? 'bg-pink-600 border-pink-300 text-white'
                        : 'bg-slate-900 border-white/15 text-stone-200 hover:bg-slate-800'
                    }`}
                  >
                    808 Sub {trunkBassOn ? 'ON' : 'OFF'}
                  </button>
                )}
              </div>
              {audioError && (
                <div className="rounded-lg bg-red-950/60 border border-red-500/40 px-2.5 py-1.5 text-[11px] text-red-200">
                  {audioError}
                </div>
              )}
            </div>

            {/* Built-in Stations */}
            <div className="rounded-xl bg-[#0b0e17] border border-white/10 p-3 space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5 text-pink-400" />
                <span>Cruising Stations (Real Sub-Bass FFT)</span>
              </div>
              <div className="space-y-1.5">
                {BUILT_IN_RADIO_STATIONS.map((station) => {
                  const selected =
                    isPlaying && !customTrackName && activeStationId === station.id;
                  return (
                    <button
                      key={station.id}
                      type="button"
                      onClick={() => handleSelectStation(station.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg border transition flex items-center justify-between gap-2 ${
                        selected
                          ? 'bg-pink-500/20 border-pink-400 text-white'
                          : 'bg-slate-900/70 border-white/10 text-stone-300 hover:border-white/25'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-extrabold truncate">
                          {station.name}
                        </div>
                        <div className="text-[10px] text-stone-400 truncate">
                          {station.genre} · {station.bpm} BPM
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/10 shrink-0">
                        {selected ? 'LIVE' : 'TUNE'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Real-Time Trunk Pump, Quarter-Panel Flex & Chest Thump DSP Telemetry */}
            <div
              ref={quarterPanelRef}
              className="rounded-xl bg-[#0b0e17] border border-white/10 p-3 space-y-2 will-change-transform"
            >
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-stone-300">
                  {isOldSchool
                    ? 'Live Quarter-Panel Flex & Chest Thump'
                    : 'Exotic Clean Radio Profile'}
                </span>
                <span className="font-mono text-[10px] text-stone-400">
                  {`Shake ${audioProfile.shake.toFixed(1)}x · 55Hz Peak`}
                </span>
              </div>
              <div className="space-y-1.5">
                <div>
                  <div className="flex justify-between text-[10px] text-stone-400 mb-0.5">
                    <span>Quarter-Panel &amp; Trunk Flex</span>
                    <span>{Math.round(Math.min(100, (meters.quarterFlex / Math.max(0.1, audioProfile.shake)) * 100))}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-900 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-pink-500 to-amber-400 transition-all duration-75"
                      style={{
                        width: `${Math.round(Math.min(100, Math.max(meters.trunkPump, meters.quarterFlex / Math.max(0.1, audioProfile.shake)) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] text-stone-400 mb-0.5">
                    <span>1st-Person Chest Thump</span>
                    <span>{Math.round(meters.chestThump * 100)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-900 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-75"
                      style={{ width: `${Math.round(meters.chestThump * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 40" Rim Lights & Underglow Music Sync Controls */}
            {(onSetRimLightMode || onToggleUnderglow) && (
              <div className="rounded-xl bg-[#0b0e17] border border-cyan-500/30 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Rim LEDs &amp; Underglow Sync</span>
                  </div>
                  {onToggleUnderglow && (
                    <button
                      type="button"
                      onClick={onToggleUnderglow}
                      className={`px-2 py-0.5 rounded border text-[10px] font-bold flex items-center gap-1 transition ${
                        underglowEnabled
                          ? 'bg-cyan-500 border-cyan-200 text-slate-950'
                          : 'bg-slate-900 border-white/15 text-stone-300 hover:bg-slate-800'
                      }`}
                    >
                      <Lightbulb className="w-3 h-3" />
                      <span>Underglow {underglowEnabled ? 'ON' : 'OFF'}</span>
                    </button>
                  )}
                </div>
                {onSetRimLightMode && (
                  <div className="grid grid-cols-4 gap-1.5">
                    {(
                      [
                        { id: 'solid', label: 'Lit' },
                        { id: 'blink', label: 'Blink' },
                        { id: 'music', label: 'Follow Music' },
                        { id: 'off', label: 'Off' },
                      ] as const
                    ).map((modeOpt) => {
                      const active = rimLightMode === modeOpt.id;
                      return (
                        <button
                          key={modeOpt.id}
                          type="button"
                          onClick={() => onSetRimLightMode(modeOpt.id)}
                          className={`px-2 py-1.5 rounded-lg border text-[10px] font-extrabold transition ${
                            active
                              ? modeOpt.id === 'music'
                                ? 'bg-pink-500 border-pink-200 text-white'
                                : modeOpt.id === 'off'
                                  ? 'bg-stone-600 border-stone-300 text-white'
                                  : 'bg-cyan-400 border-cyan-100 text-slate-950'
                              : 'bg-slate-900/80 border-white/10 text-stone-300 hover:border-white/25'
                          }`}
                        >
                          {modeOpt.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right 7 cols: Pandora Search & Embedded Overlay */}
          <div className="lg:col-span-7 flex flex-col gap-2.5 bg-[#0b0e17] border border-white/10 rounded-xl p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-xs font-black text-sky-300 uppercase tracking-wider">
                  Pandora Radio Search
                </div>
                <p className="text-[11px] text-stone-400">
                  Search inside the overlay or launch the Pandora app directly.
                </p>
              </div>
              <button
                type="button"
                onClick={handleLaunchPandoraApp}
                className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 border border-sky-300/40 text-[11px] font-extrabold text-white flex items-center gap-1.5 shrink-0 transition"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Open Pandora App</span>
              </button>
            </div>

            <form onSubmit={handlePandoraSearch} className="flex flex-wrap sm:flex-nowrap gap-2">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="pandora-song-input"
                  type="text"
                  value={pandoraQuery}
                  onChange={(e) => setPandoraQuery(e.target.value)}
                  placeholder="Search song or artist on Pandora..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#334] bg-[#070910] text-base sm:text-sm text-white placeholder:text-stone-500 focus:outline-none focus:border-sky-400"
                />
              </div>
              <button
                type="submit"
                className="min-h-[40px] px-3.5 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs shrink-0 transition"
              >
                Search Pandora
              </button>
            </form>

            <iframe
              id="pandora-frame"
              title="Pandora Car Radio"
              src={pandoraUrl}
              className="w-full flex-1 min-h-[200px] sm:min-h-[260px] rounded-lg border border-white/10 bg-black"
              allow="autoplay; encrypted-media"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
