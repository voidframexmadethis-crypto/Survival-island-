'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Disc3,
  ExternalLink,
  Eye,
  Music,
  Pause,
  Play,
  Radio,
  Search,
  Upload,
  Volume2,
  X,
} from 'lucide-react';
import {
  BUILT_IN_RADIO_STATIONS,
  CABIN_BASS_AND_FIRST_PERSON,
  CAR_RADIO_TRUNK_SYSTEM,
  DrivingCameraMode,
  PANDORA_APP_LAUNCHER,
  RadioCarDescriptor,
} from '@/game/systems/carRadioSystem';

interface CarRadioModalProps {
  car: RadioCarDescriptor;
  interiorView: boolean;
  trunkBassOn: boolean;
  onToggleInteriorView: () => void;
  onToggleTrunkBass: () => void;
  onClose: () => void;
}

export function CarRadioModal({
  car,
  interiorView,
  trunkBassOn,
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
  const [meters, setMeters] = useState({ bassLevel: 0, chestThump: 0, trunkPump: 0 });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    CAR_RADIO_TRUNK_SYSTEM.configureForCar(car);
    CABIN_BASS_AND_FIRST_PERSON.applyVehicleRadioProfile(car);
  }, [car]);

  useEffect(() => {
    let rafId = 0;
    const tick = () => {
      setMeters(CABIN_BASS_AND_FIRST_PERSON.sampleBassAndChestThump(car));
      setIsPlaying(CABIN_BASS_AND_FIRST_PERSON.stereoPlaying);
      rafId = window.requestAnimationFrame(tick);
    };
    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4"
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
        className="relative w-full max-w-4xl max-h-[92vh] overflow-hidden rounded-2xl bg-[#111522] border border-indigo-500/40 text-white shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3 bg-gradient-to-r from-[#0b0e17] via-[#13192b] to-[#1e1b4b]/80 border-b border-white/10">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                isOldSchool
                  ? 'bg-pink-500/20 border-pink-400/50 text-pink-300'
                  : 'bg-sky-500/20 border-sky-400/50 text-sky-300'
              }`}
            >
              <Radio className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
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
                  {isOldSchool
                    ? 'OLD-SCHOOL TRUNK + CHEST BASS (+9.5 dB)'
                    : 'STANDARD CAR RADIO (CLEAN EXOTIC EQ)'}
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
              className={`px-3 py-1.5 rounded-xl border text-xs font-extrabold flex items-center gap-1.5 transition ${
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
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 flex items-center justify-center text-stone-200 transition"
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

            {/* Real-Time Trunk Pump & Chest Thump DSP Telemetry */}
            <div className="rounded-xl bg-[#0b0e17] border border-white/10 p-3 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-stone-300">
                  {isOldSchool
                    ? 'Live Trunk Pump & Chest Thump'
                    : 'Exotic Clean Radio Profile'}
                </span>
                <span className="font-mono text-[10px] text-stone-400">
                  {isOldSchool ? '2x12" Trunk Sub Active' : '0 dB Flat (No Trunk Shake)'}
                </span>
              </div>
              <div className="space-y-1.5">
                <div>
                  <div className="flex justify-between text-[10px] text-stone-400 mb-0.5">
                    <span>Trunk Lid Pump</span>
                    <span>{Math.round(meters.trunkPump * 100)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-900 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-pink-500 to-amber-400 transition-all duration-75"
                      style={{ width: `${Math.round(meters.trunkPump * 100)}%` }}
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

            <form onSubmit={handlePandoraSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="pandora-song-input"
                  type="text"
                  value={pandoraQuery}
                  onChange={(e) => setPandoraQuery(e.target.value)}
                  placeholder="Search song or artist on Pandora..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#334] bg-[#070910] text-xs sm:text-sm text-white placeholder:text-stone-500 focus:outline-none focus:border-sky-400"
                />
              </div>
              <button
                type="submit"
                className="px-3.5 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs shrink-0 transition"
              >
                Search Pandora
              </button>
            </form>

            <iframe
              id="pandora-frame"
              title="Pandora Car Radio"
              src={pandoraUrl}
              className="w-full flex-1 min-h-[260px] rounded-lg border border-white/10 bg-black"
              allow="autoplay; encrypted-media"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
