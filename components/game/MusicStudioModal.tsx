'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Disc,
  Headphones,
  Keyboard,
  Mic,
  Music,
  Play,
  Plus,
  Radio,
  Sliders,
  Square,
  Upload,
  Volume2,
  X,
} from 'lucide-react';
import {
  createDefaultMix,
  DrumPattern,
  DrumTrack,
  DrumTrackMix,
  LoadedWebPlugin,
  MusicStudioEngine,
  StudioSample,
  StudioSampleSummary,
  WebPluginType,
} from '@/game/systems/villagesAndAudioStudio';

export type StudioTab =
  | 'sequencer'
  | 'keyboard'
  | 'samples'
  | 'mixing'
  | 'booth'
  | 'plugins';

interface MusicStudioModalProps {
  initialTab?: StudioTab;
  onClose: () => void;
  onToast: (msg: string, tone?: 'gain' | 'craft' | 'warning' | 'discovery' | 'info') => void;
}

const DEFAULT_TRACKS: DrumTrack[] = [
  {
    id: 'trk_kick',
    name: 'Kick Drum',
    sampleId: 'builtin_kick',
    activeSteps: [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
    mix: { ...createDefaultMix(), volume: 1.0, reverbSend: 0.04 },
  },
  {
    id: 'trk_snare',
    name: 'Studio Snare',
    sampleId: 'builtin_snare',
    activeSteps: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
    mix: { ...createDefaultMix(), volume: 0.92, reverbSend: 0.22 },
  },
  {
    id: 'trk_hat',
    name: 'Closed Hi-Hat',
    sampleId: 'builtin_hat',
    activeSteps: [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, true],
    mix: { ...createDefaultMix(), volume: 0.72, pan: 0.2, reverbSend: 0.12 },
  },
  {
    id: 'trk_clap',
    name: 'Studio Clap',
    sampleId: 'builtin_clap',
    activeSteps: [false, false, false, false, true, false, false, false, false, false, false, true, true, false, false, false],
    mix: { ...createDefaultMix(), volume: 0.85, pan: -0.2, reverbSend: 0.28 },
  },
  {
    id: 'trk_808',
    name: 'Sub 808 Bass',
    sampleId: 'builtin_808',
    activeSteps: [true, false, false, true, false, false, false, false, true, false, false, false, false, false, true, false],
    mix: { ...createDefaultMix(), volume: 0.95, reverbSend: 0.02 },
  },
];

const PATTERN_PRESETS: Record<string, { bpm: number; steps: boolean[][] }> = {
  island_groove: {
    bpm: 112,
    steps: [
      [true, false, false, false, true, false, false, true, true, false, false, false, true, false, false, false],
      [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
      [true, true, true, false, true, true, true, false, true, true, true, false, true, true, true, true],
      [false, false, false, true, false, false, false, false, false, false, false, true, false, false, false, false],
      [true, false, false, false, false, false, true, false, true, false, false, false, false, false, true, false],
    ],
  },
  four_floor: {
    bpm: 124,
    steps: [
      [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
      [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
      [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false],
      [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
      [true, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false],
    ],
  },
  trap_808: {
    bpm: 138,
    steps: [
      [true, false, false, false, false, false, false, true, false, false, true, false, false, false, false, false],
      [false, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false],
      [true, true, true, true, true, false, true, true, true, true, true, false, true, true, true, true],
      [false, false, false, false, false, false, false, false, true, false, false, false, false, false, true, false],
      [true, false, false, false, false, false, false, true, false, false, true, false, false, true, false, false],
    ],
  },
};

const PIANO_KEYS: { midi: number; label: string; black: boolean; hotkey?: string }[] = [
  { midi: 48, label: 'C3', black: false, hotkey: 'A' },
  { midi: 49, label: 'C#3', black: true, hotkey: 'W' },
  { midi: 50, label: 'D3', black: false, hotkey: 'S' },
  { midi: 51, label: 'D#3', black: true, hotkey: 'E' },
  { midi: 52, label: 'E3', black: false, hotkey: 'D' },
  { midi: 53, label: 'F3', black: false, hotkey: 'F' },
  { midi: 54, label: 'F#3', black: true, hotkey: 'T' },
  { midi: 55, label: 'G3', black: false, hotkey: 'G' },
  { midi: 56, label: 'G#3', black: true, hotkey: 'Y' },
  { midi: 57, label: 'A3', black: false, hotkey: 'H' },
  { midi: 58, label: 'A#3', black: true, hotkey: 'U' },
  { midi: 59, label: 'B3', black: false, hotkey: 'J' },
  { midi: 60, label: 'C4', black: false, hotkey: 'K' },
  { midi: 61, label: 'C#4', black: true, hotkey: 'O' },
  { midi: 62, label: 'D4', black: false, hotkey: 'L' },
  { midi: 63, label: 'D#4', black: true },
  { midi: 64, label: 'E4', black: false },
  { midi: 65, label: 'F4', black: false },
  { midi: 66, label: 'F#4', black: true },
  { midi: 67, label: 'G4', black: false },
  { midi: 68, label: 'G#4', black: true },
  { midi: 69, label: 'A4', black: false },
  { midi: 70, label: 'A#4', black: true },
  { midi: 71, label: 'B4', black: false },
];

export function MusicStudioModal({
  initialTab = 'sequencer',
  onClose,
  onToast,
}: MusicStudioModalProps) {
  const engineRef = useRef<MusicStudioEngine | null>(null);
  const [activeTab, setActiveTab] = useState<StudioTab>(initialTab);
  const [samples, setSamples] = useState<StudioSampleSummary[]>([]);
  const [tracks, setTracks] = useState<DrumTrack[]>(() =>
    DEFAULT_TRACKS.map((t) => ({
      ...t,
      activeSteps: [...t.activeSteps],
      mix: { ...(t.mix || createDefaultMix()) },
    })),
  );
  const [bpm, setBpm] = useState(120);
  const [swing, setSwing] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(-1);
  const [masterVol, setMasterVol] = useState(0.8);
  const [masterCutoff, setMasterCutoff] = useState(18000);
  const [compressorOn, setCompressorOn] = useState(true);
  const [reverbOn, setReverbOn] = useState(true);
  const [vuLevel, setVuLevel] = useState(0);

  // MIDI Synth state
  const [synthWave, setSynthWave] = useState<OscillatorType>('sawtooth');
  const [synthCutoff, setSynthCutoff] = useState(4200);
  const [synthDecay, setSynthDecay] = useState(0.42);
  const [activeMidiNote, setActiveMidiNote] = useState<number | null>(null);

  // Sample import state
  const [importCategory, setImportCategory] = useState<StudioSample['category']>('loop');
  const [activePadId, setActivePadId] = useState<string | null>(null);

  // Recording booth state
  const [isRecordingMic, setIsRecordingMic] = useState(false);
  const [takeName, setTakeName] = useState('Studio Vocal Take 1');
  const [micStatus, setMicStatus] = useState<string>('Condenser Mic & Booth Ready');

  // Web Audio plug-in registry state
  const [plugins, setPlugins] = useState<LoadedWebPlugin[]>([]);
  const [pluginId, setPluginId] = useState('custom-tape-sat');
  const [pluginName, setPluginName] = useState('Tape Saturator Worklet');
  const [pluginType, setPluginType] = useState<WebPluginType>('effect');
  const [pluginUrl, setPluginUrl] = useState('');
  const [pluginMsg, setPluginMsg] = useState<string | null>(null);

  const currentPattern: DrumPattern = useMemo(
    () => ({
      bpm,
      steps: 16,
      swing,
      tracks,
    }),
    [bpm, swing, tracks],
  );

  useEffect(() => {
    const engine = new MusicStudioEngine();
    engineRef.current = engine;
    const rafId = window.requestAnimationFrame(() => {
      if (engineRef.current) {
        setSamples(engineRef.current.getSamples());
      }
    });

    const vuTimer = window.setInterval(() => {
      if (engineRef.current) {
        setVuLevel(engineRef.current.getMasterPeakLevel());
      }
    }, 80);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearInterval(vuTimer);
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Push live pattern updates to sequencer while playing
  useEffect(() => {
    if (isPlaying && engineRef.current) {
      engineRef.current.updatePattern(currentPattern);
    }
  }, [isPlaying, currentPattern]);

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !engineRef.current) return;

    let importedCount = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        await engineRef.current.importSample(file, importCategory);
        importedCount += 1;
        onToast(`Imported studio audio: ${file.name}`, 'gain');
      } catch {
        onToast(`Could not decode audio file: ${file.name}`, 'warning');
      }
    }
    if (importedCount > 0) {
      setSamples(engineRef.current.getSamples());
    }
    e.target.value = '';
  };

  const toggleStep = (trackIdx: number, stepIdx: number) => {
    setTracks((prev) =>
      prev.map((track, idx) => {
        if (idx !== trackIdx) return track;
        const nextSteps = [...track.activeSteps];
        nextSteps[stepIdx] = !nextSteps[stepIdx];
        return { ...track, activeSteps: nextSteps };
      }),
    );
  };

  const updateTrackSample = (trackIdx: number, sampleId: string) => {
    setTracks((prev) =>
      prev.map((t, idx) => (idx === trackIdx ? { ...t, sampleId } : t)),
    );
  };

  const updateTrackMix = (trackIdx: number, patch: Partial<DrumTrackMix>) => {
    setTracks((prev) =>
      prev.map((t, idx) =>
        idx === trackIdx
          ? { ...t, mix: { ...(t.mix || createDefaultMix()), ...patch } }
          : t,
      ),
    );
  };

  const applyPreset = (key: string) => {
    if (key === 'clear') {
      setTracks((prev) =>
        prev.map((t) => ({ ...t, activeSteps: Array(16).fill(false) })),
      );
      return;
    }
    const preset = PATTERN_PRESETS[key];
    if (!preset) return;
    setBpm(preset.bpm);
    setTracks((prev) =>
      prev.map((t, idx) => ({
        ...t,
        activeSteps: preset.steps[idx] ? [...preset.steps[idx]] : [...t.activeSteps],
      })),
    );
    onToast(`Loaded ${key.replace(/_/g, ' ')} beat pattern (${preset.bpm} BPM)`, 'info');
  };

  const handlePlayPattern = async () => {
    if (!engineRef.current) return;
    await engineRef.current.unlockAudio();
    setIsPlaying(true);
    await engineRef.current.playPattern(currentPattern, (step) => {
      setCurrentStep(step);
    });
    onToast(`Sequencer playing at ${bpm} BPM`, 'info');
  };

  const handleStopPattern = () => {
    engineRef.current?.stopPattern();
    setIsPlaying(false);
    setCurrentStep(-1);
  };

  const triggerPad = async (sampleId: string, padKey: string, mix?: Partial<DrumTrackMix>) => {
    if (!engineRef.current) return;
    await engineRef.current.unlockAudio();
    engineRef.current.playSample(sampleId, undefined, mix);
    setActivePadId(padKey);
    window.setTimeout(() => {
      setActivePadId((cur) => (cur === padKey ? null : cur));
    }, 150);
  };

  const playPianoKey = async (midi: number) => {
    if (!engineRef.current) return;
    await engineRef.current.unlockAudio();
    engineRef.current.playSynthNote(midi, synthWave, synthDecay, synthCutoff);
    setActiveMidiNote(midi);
    window.setTimeout(() => {
      setActiveMidiNote((cur) => (cur === midi ? null : cur));
    }, 180);
  };

  // Support computer keyboard playing when MIDI tab is open
  useEffect(() => {
    if (activeTab !== 'keyboard') return;
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.repeat || ev.target instanceof HTMLInputElement || ev.target instanceof HTMLSelectElement) {
        return;
      }
      const keyChar = ev.key.toUpperCase();
      const match = PIANO_KEYS.find((k) => k.hotkey === keyChar);
      if (match && engineRef.current) {
        engineRef.current.unlockAudio().then(() => {
          engineRef.current?.playSynthNote(match.midi, synthWave, synthDecay, synthCutoff);
        });
        setActiveMidiNote(match.midi);
        window.setTimeout(() => {
          setActiveMidiNote((cur) => (cur === match.midi ? null : cur));
        }, 180);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeTab, synthWave, synthDecay, synthCutoff]);

  const handleStartBoothRecord = async () => {
    if (!engineRef.current) return;
    try {
      await engineRef.current.startMicRecording();
      setIsRecordingMic(true);
      setMicStatus('ON AIR — Recording live booth microphone...');
      onToast('Recording booth microphone active', 'discovery');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Microphone access unavailable';
      setMicStatus(`Mic unavailable: ${msg}`);
      onToast(`Booth mic error: ${msg}`, 'warning');
    }
  };

  const handleStopBoothRecord = async () => {
    if (!engineRef.current) return;
    try {
      const saved = await engineRef.current.stopMicRecording(takeName.trim() || 'Booth Take');
      setIsRecordingMic(false);
      setSamples(engineRef.current.getSamples());
      setMicStatus(`Saved "${saved.name}" (${saved.buffer.duration.toFixed(2)}s) to Sample Library`);
      onToast(`Saved booth recording: ${saved.name}`, 'gain');
    } catch (err) {
      setIsRecordingMic(false);
      const msg = err instanceof Error ? err.message : 'Recording failed';
      setMicStatus(msg);
      onToast(msg, 'warning');
    }
  };

  const handleInstallWorkletPlugin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!engineRef.current) return;
    setPluginMsg(null);
    try {
      const installed = await engineRef.current.pluginRegistry.install(
        {
          id: pluginId.trim(),
          name: pluginName.trim(),
          version: '1.0.0',
          type: pluginType,
          format: 'web-audio-worklet',
          entryPoint: pluginUrl.trim(),
          developer: 'Studio User',
        },
        engineRef.current.getAudioContext(),
      );
      setPlugins(engineRef.current.pluginRegistry.getInstalledPlugins());
      setPluginMsg(`Loaded AudioWorklet plug-in: ${installed.manifest.name}`);
      onToast(`Loaded Web Audio plug-in: ${installed.manifest.name}`, 'gain');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load AudioWorklet plug-in';
      setPluginMsg(msg);
      onToast(msg, 'warning');
    }
  };

  const padSlots = useMemo(() => {
    const base = samples.slice(0, 16);
    const pads = [];
    for (let i = 0; i < 16; i++) {
      const sample = base[i % Math.max(1, base.length)];
      pads.push({
        padIndex: i,
        sampleId: sample?.id || 'builtin_kick',
        label: sample ? sample.name : `Pad ${i + 1}`,
        category: sample?.category || 'kick',
      });
    }
    return pads;
  }, [samples]);

  const whiteKeys = PIANO_KEYS.filter((k) => !k.black);
  const vocalSamples = samples.filter((s) => s.category === 'vocal');

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-2 sm:p-5"
    >
      <div className="relative w-full max-w-6xl bg-stone-900 border border-amber-500/45 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Top Studio Control Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3.5 bg-stone-950 border-b border-stone-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <Music className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-stone-100 flex items-center gap-2 truncate">
                Hilltop Premade Shelter — Music Production Studio
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono shrink-0">
                  Web Audio Engine
                </span>
              </h2>
              <p className="text-[11px] text-stone-400 truncate">
                Drum Machine · MIDI Synth · Mixing Console · Recording Booth · Custom WAV/MP3 Samples
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Transport Quick Bar */}
            <button
              type="button"
              onClick={isPlaying ? handleStopPattern : handlePlayPattern}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                isPlaying
                  ? 'bg-red-600 hover:bg-red-500 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {isPlaying ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isPlaying ? 'Stop' : 'Play Beat'}</span>
            </button>

            {/* Live VU Meter */}
            <div className="hidden md:flex items-center gap-2 bg-stone-900 border border-stone-800 px-2.5 py-1.5 rounded-lg">
              <span className="text-[10px] font-mono text-stone-400">VU</span>
              <div className="w-20 h-2.5 rounded bg-stone-950 overflow-hidden border border-stone-800">
                <div
                  className={`h-full transition-all duration-75 ${
                    vuLevel > 0.85 ? 'bg-red-500' : vuLevel > 0.55 ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                  style={{ width: `${Math.round(vuLevel * 100)}%` }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close Studio"
              className="w-8 h-8 rounded-lg bg-stone-800 text-stone-300 hover:text-white hover:bg-stone-700 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 px-4 sm:px-6 py-2.5 bg-stone-900 border-b border-stone-800 text-xs font-medium">
          {[
            { id: 'sequencer' as const, label: 'Sequencer & Pads', Icon: Activity },
            { id: 'keyboard' as const, label: 'MIDI Synth', Icon: Keyboard },
            { id: 'samples' as const, label: `Samples (${samples.length})`, Icon: Upload },
            { id: 'mixing' as const, label: 'Mixing Console', Icon: Sliders },
            { id: 'booth' as const, label: 'Recording Booth', Icon: Mic },
            { id: 'plugins' as const, label: 'Web Plug-ins', Icon: Radio },
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === id
                  ? 'bg-amber-600 text-stone-950 font-bold shadow'
                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-stone-950">
          {/* TAB 1: SEQUENCER & 4x4 DRUM MACHINE PADS */}
          {activeTab === 'sequencer' && (
            <div className="space-y-5">
              {/* Transport & Presets */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-900 border border-stone-800 p-4 rounded-xl">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={isPlaying ? handleStopPattern : handlePlayPattern}
                    className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 ${
                      isPlaying
                        ? 'bg-red-600 hover:bg-red-500 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    {isPlaying ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                    <span>{isPlaying ? 'Stop Beat' : 'Play Beat'}</span>
                  </button>

                  <label className="flex items-center gap-2 bg-stone-950 px-3 py-1.5 rounded-lg border border-stone-800 text-xs">
                    <span className="text-stone-400">BPM</span>
                    <input
                      type="number"
                      min={40}
                      max={240}
                      value={bpm}
                      onChange={(e) => setBpm(Math.max(40, Math.min(240, Number(e.target.value) || 120)))}
                      className="w-14 bg-transparent text-amber-400 font-mono font-bold text-center focus:outline-none"
                    />
                  </label>

                  <label className="flex items-center gap-2 bg-stone-950 px-3 py-1.5 rounded-lg border border-stone-800 text-xs">
                    <span className="text-stone-400">Swing</span>
                    <input
                      type="range"
                      min={0}
                      max={0.4}
                      step={0.02}
                      value={swing}
                      onChange={(e) => setSwing(Number(e.target.value))}
                      className="w-20 accent-amber-500"
                    />
                    <span className="font-mono text-amber-300 w-8">{Math.round(swing * 100)}%</span>
                  </label>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-stone-400 mr-1">Pattern:</span>
                  {[
                    { key: 'island_groove', label: 'Island Groove' },
                    { key: 'four_floor', label: '4-on-Floor' },
                    { key: 'trap_808', label: 'Trap 808' },
                    { key: 'clear', label: 'Clear' },
                  ].map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => applyPreset(p.key)}
                      className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 transition-colors"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 16-Step Sequencer Grid */}
              <div className="bg-stone-900 border border-stone-800 p-4 rounded-xl space-y-3 overflow-x-auto">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-stone-100">16-Step Drum Pattern Matrix</h3>
                  <span className="text-[11px] font-mono text-stone-400">
                    {isPlaying && currentStep >= 0 ? `Step ${currentStep + 1} / 16` : 'Click steps to edit beat'}
                  </span>
                </div>
                <div className="space-y-2 min-w-[660px]">
                  {tracks.map((track, trackIdx) => (
                    <div key={track.id} className="flex items-center gap-2.5">
                      <div className="w-40 shrink-0 space-y-1">
                        <div className="text-xs font-semibold text-stone-200 truncate">{track.name}</div>
                        <select
                          value={track.sampleId}
                          onChange={(e) => updateTrackSample(trackIdx, e.target.value)}
                          className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 text-[11px] text-amber-300 focus:outline-none"
                        >
                          {samples.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-16 gap-1 flex-1">
                        {track.activeSteps.map((active, stepIdx) => {
                          const isHead = isPlaying && currentStep === stepIdx;
                          return (
                            <button
                              key={stepIdx}
                              type="button"
                              onClick={() => toggleStep(trackIdx, stepIdx)}
                              className={`h-10 rounded transition-colors relative ${
                                active
                                  ? stepIdx % 4 === 0
                                    ? 'bg-amber-500 text-stone-950'
                                    : 'bg-amber-600 text-stone-950'
                                  : stepIdx % 4 === 0
                                    ? 'bg-stone-800 border border-stone-700'
                                    : 'bg-stone-800/60'
                              } ${isHead ? 'ring-2 ring-emerald-400' : ''}`}
                              title={`${track.name} Step ${stepIdx + 1}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4x4 Interactive Drum Machine Pads */}
              <div className="bg-stone-900 border border-stone-800 p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-stone-100 flex items-center gap-2">
                    <Disc className="w-4 h-4 text-amber-400" />
                    Drum Machine Live Trigger Pads (4×4)
                  </h3>
                  <span className="text-[11px] text-stone-400">Tap any pad to audition sounds live</span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {padSlots.slice(0, 8).map((pad) => {
                    const lit = activePadId === `pad_${pad.padIndex}`;
                    return (
                      <button
                        key={pad.padIndex}
                        type="button"
                        onClick={() => triggerPad(pad.sampleId, `pad_${pad.padIndex}`)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          lit
                            ? 'bg-amber-500 border-amber-300 text-stone-950 scale-95'
                            : 'bg-stone-950 hover:bg-stone-800 border-stone-700 text-stone-200'
                        }`}
                      >
                        <div className="text-[10px] font-mono uppercase opacity-75">{pad.category}</div>
                        <div className="text-xs font-bold truncate mt-0.5">{pad.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MIDI KEYBOARD SYNTH */}
          {activeTab === 'keyboard' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4 bg-stone-900 border border-stone-800 p-4 rounded-xl">
                <div className="flex flex-wrap items-center gap-4 text-xs">
                  <label className="flex items-center gap-2">
                    <span className="text-stone-400">Waveform</span>
                    <select
                      value={synthWave}
                      onChange={(e) => setSynthWave(e.target.value as OscillatorType)}
                      className="bg-stone-950 border border-stone-700 rounded-lg px-2.5 py-1.5 text-amber-300 font-medium"
                    >
                      <option value="sawtooth">Analog Saw</option>
                      <option value="triangle">Warm Triangle</option>
                      <option value="square">Retro Square</option>
                      <option value="sine">Pure Sine</option>
                    </select>
                  </label>

                  <label className="flex items-center gap-2">
                    <span className="text-stone-400">Filter</span>
                    <input
                      type="range"
                      min={350}
                      max={12000}
                      step={50}
                      value={synthCutoff}
                      onChange={(e) => setSynthCutoff(Number(e.target.value))}
                      className="w-28 accent-amber-500"
                    />
                    <span className="font-mono text-amber-300">{synthCutoff} Hz</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <span className="text-stone-400">Release</span>
                    <input
                      type="range"
                      min={0.18}
                      max={1.2}
                      step={0.04}
                      value={synthDecay}
                      onChange={(e) => setSynthDecay(Number(e.target.value))}
                      className="w-24 accent-amber-500"
                    />
                    <span className="font-mono text-amber-300">{synthDecay.toFixed(2)}s</span>
                  </label>
                </div>
                <span className="text-[11px] text-stone-400">
                  Play with mouse or keys A–L (white) & W/E/T/Y/U/O (black)
                </span>
              </div>

              {/* Playable 2-Octave Keyboard */}
              <div className="bg-stone-900 border border-stone-800 p-4 rounded-xl space-y-3 overflow-x-auto">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-stone-100">49-Key Studio MIDI Controller (C3 – B4)</h3>
                  {activeMidiNote !== null && (
                    <span className="text-xs font-mono text-emerald-400">
                      Playing MIDI #{activeMidiNote}
                    </span>
                  )}
                </div>

                {/* White keys row */}
                <div className="grid grid-cols-14 gap-1 min-w-[680px]">
                  {whiteKeys.map((k) => {
                    const isLit = activeMidiNote === k.midi;
                    return (
                      <button
                        key={k.midi}
                        type="button"
                        onClick={() => playPianoKey(k.midi)}
                        className={`h-32 rounded-b-lg border flex flex-col justify-end items-center pb-2 transition-colors ${
                          isLit
                            ? 'bg-amber-400 border-amber-300 text-stone-950'
                            : 'bg-stone-100 hover:bg-amber-100 border-stone-400 text-stone-900'
                        }`}
                      >
                        {k.hotkey && (
                          <span className="text-[10px] font-mono text-stone-500">{k.hotkey}</span>
                        )}
                        <span className="text-[11px] font-bold">{k.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Sharp/Flat keys strip */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-stone-400 mr-2">Accidentals:</span>
                  {PIANO_KEYS.filter((k) => k.black).map((k) => {
                    const isLit = activeMidiNote === k.midi;
                    return (
                      <button
                        key={k.midi}
                        type="button"
                        onClick={() => playPianoKey(k.midi)}
                        className={`px-2.5 py-2 rounded-md border text-[11px] font-mono font-bold transition-colors ${
                          isLit
                            ? 'bg-amber-500 border-amber-300 text-stone-950'
                            : 'bg-stone-950 hover:bg-stone-800 border-stone-700 text-stone-200'
                        }`}
                      >
                        {k.label}
                        {k.hotkey ? ` (${k.hotkey})` : ''}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SAMPLE LIBRARY & CUSTOM AUDIO IMPORT */}
          {activeTab === 'samples' && (
            <div className="space-y-5">
              <div className="bg-stone-900 border border-stone-800 p-5 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/35 flex items-center justify-center text-amber-400 shrink-0">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-stone-100">Import Drum Kits, WAV Samples & Loops</h3>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Load local WAV, MP3, OGG, FLAC, or M4A audio files via Web Audio decodeAudioData.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <select
                    value={importCategory}
                    onChange={(e) => setImportCategory(e.target.value as StudioSample['category'])}
                    className="bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-xs text-stone-200"
                  >
                    <option value="loop">Loop / Melody</option>
                    <option value="kick">Kick</option>
                    <option value="snare">Snare</option>
                    <option value="hat">Hi-Hat</option>
                    <option value="clap">Clap</option>
                    <option value="808">808 / Bass</option>
                    <option value="vocal">Vocal</option>
                    <option value="other">Other FX</option>
                  </select>

                  <label className="cursor-pointer bg-amber-600 hover:bg-amber-500 text-stone-950 px-4 py-2 rounded-lg font-bold text-xs transition-colors flex items-center gap-1.5">
                    <Plus className="w-4 h-4" />
                    <span>Import Audio Files...</span>
                    <input
                      type="file"
                      accept="audio/*,.wav,.mp3,.ogg,.m4a,.flac"
                      multiple
                      onChange={handleFileImport}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-2.5">
                <h3 className="text-sm font-bold text-stone-200">
                  Studio Audio Library ({samples.length} loaded)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {samples.map((s) => (
                    <div
                      key={s.id}
                      className="bg-stone-900 border border-stone-800 p-3.5 rounded-xl flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-stone-100 truncate">{s.name}</p>
                        <div className="text-[10px] font-mono text-amber-400 uppercase mt-0.5">
                          {s.category} · {s.duration.toFixed(2)}s {s.builtIn ? '· Built-in' : '· Custom'}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => triggerPad(s.id, `lib_${s.id}`)}
                        className="px-3 py-1.5 bg-amber-600/20 border border-amber-500/40 text-amber-300 hover:bg-amber-600 hover:text-stone-950 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Play</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: MIXING CONSOLE */}
          {activeTab === 'mixing' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {tracks.map((track, idx) => {
                  const mix = track.mix || createDefaultMix();
                  return (
                    <div
                      key={track.id}
                      className="bg-stone-900 border border-stone-800 p-3.5 rounded-xl space-y-3 flex flex-col justify-between"
                    >
                      <div>
                        <div className="text-xs font-bold text-stone-100 truncate">{track.name}</div>
                        <div className="text-[10px] text-stone-400 font-mono">
                          CH {idx + 1} · {Math.round(mix.volume * 100)}%
                        </div>
                      </div>

                      <div className="space-y-2.5 text-[11px]">
                        <label className="block space-y-1">
                          <span className="text-stone-400">Fader Volume</span>
                          <input
                            type="range"
                            min={0}
                            max={1.4}
                            step={0.02}
                            value={mix.volume}
                            onChange={(e) => updateTrackMix(idx, { volume: Number(e.target.value) })}
                            className="w-full accent-amber-500"
                          />
                        </label>

                        <label className="block space-y-1">
                          <span className="text-stone-400 flex justify-between">
                            <span>Pan</span>
                            <span className="font-mono text-amber-300">
                              {mix.pan === 0 ? 'C' : mix.pan < 0 ? `L${Math.round(-mix.pan * 100)}` : `R${Math.round(mix.pan * 100)}`}
                            </span>
                          </span>
                          <input
                            type="range"
                            min={-1}
                            max={1}
                            step={0.05}
                            value={mix.pan}
                            onChange={(e) => updateTrackMix(idx, { pan: Number(e.target.value) })}
                            className="w-full accent-amber-500"
                          />
                        </label>

                        <label className="block space-y-1">
                          <span className="text-stone-400">Reverb Send</span>
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.02}
                            value={mix.reverbSend}
                            onChange={(e) => updateTrackMix(idx, { reverbSend: Number(e.target.value) })}
                            className="w-full accent-amber-500"
                          />
                        </label>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => updateTrackMix(idx, { muted: !mix.muted })}
                          className={`flex-1 py-1.5 rounded text-xs font-bold border ${
                            mix.muted
                              ? 'bg-red-600 border-red-400 text-white'
                              : 'bg-stone-950 border-stone-700 text-stone-300'
                          }`}
                        >
                          M
                        </button>
                        <button
                          type="button"
                          onClick={() => updateTrackMix(idx, { solo: !mix.solo })}
                          className={`flex-1 py-1.5 rounded text-xs font-bold border ${
                            mix.solo
                              ? 'bg-amber-500 border-amber-300 text-stone-950'
                              : 'bg-stone-950 border-stone-700 text-stone-300'
                          }`}
                        >
                          S
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Master Bus Console */}
              <div className="bg-stone-900 border border-stone-800 p-5 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-5 items-center">
                <div className="space-y-3">
                  <div className="flex justify-between text-xs text-stone-300 font-medium">
                    <span className="flex items-center gap-1.5">
                      <Volume2 className="w-4 h-4 text-amber-400" />
                      Master Bus Output Gain
                    </span>
                    <span className="font-mono text-amber-400">{Math.round(masterVol * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={masterVol}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setMasterVol(v);
                      engineRef.current?.setMasterVolume(v);
                    }}
                    className="w-full accent-amber-500 cursor-pointer"
                  />

                  <div className="flex justify-between text-xs text-stone-300 font-medium pt-1">
                    <span>Master Low-Pass EQ</span>
                    <span className="font-mono text-amber-400">{masterCutoff} Hz</span>
                  </div>
                  <input
                    type="range"
                    min={400}
                    max={18000}
                    step={100}
                    value={masterCutoff}
                    onChange={(e) => {
                      const hz = Number(e.target.value);
                      setMasterCutoff(hz);
                      engineRef.current?.setMasterFilterCutoff(hz);
                    }}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div className="bg-stone-950 border border-stone-800 p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-stone-200">
                      <Headphones className="w-4 h-4 text-amber-400" />
                      <span>Studio Monitors &amp; Headphones Out</span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400">ACTIVE</span>
                  </div>
                  <div className="w-full h-3 rounded bg-stone-900 overflow-hidden border border-stone-800">
                    <div
                      className={`h-full transition-all duration-75 ${
                        vuLevel > 0.85 ? 'bg-red-500' : vuLevel > 0.55 ? 'bg-amber-400' : 'bg-emerald-400'
                      }`}
                      style={{ width: `${Math.round(vuLevel * 100)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-stone-400">
                    Routed through Web Audio DynamicsCompressor + Stereo Convolver Reverb.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: RECORDING BOOTH & MICROPHONE */}
          {activeTab === 'booth' && (
            <div className="space-y-5">
              <div className="bg-stone-900 border border-stone-800 p-5 rounded-xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center border ${
                        isRecordingMic
                          ? 'bg-red-600/25 border-red-500 text-red-400'
                          : 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                      }`}
                    >
                      <Mic className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-stone-100 flex items-center gap-2">
                        Isolated Vocal &amp; Acoustic Recording Booth
                        {isRecordingMic && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-red-600 text-white font-mono uppercase">
                            ON AIR
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-stone-400">{micStatus}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="text"
                    value={takeName}
                    onChange={(e) => setTakeName(e.target.value)}
                    placeholder="Recording take name..."
                    className="flex-1 min-w-[200px] bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                  {!isRecordingMic ? (
                    <button
                      type="button"
                      onClick={handleStartBoothRecord}
                      className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-2"
                    >
                      <Mic className="w-4 h-4" />
                      <span>Arm &amp; Record Mic</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStopBoothRecord}
                      className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>Stop &amp; Save Take</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-stone-900 border border-stone-800 p-4 rounded-xl space-y-2.5">
                <h4 className="text-sm font-bold text-stone-200">
                  Recorded Booth Takes ({vocalSamples.length})
                </h4>
                {vocalSamples.length === 0 ? (
                  <p className="text-xs text-stone-400">
                    No microphone takes recorded yet. Recorded takes are decoded into the Sample Library for playback and sequencing.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {vocalSamples.map((vs) => (
                      <div
                        key={vs.id}
                        className="bg-stone-950 border border-stone-800 p-3 rounded-lg flex items-center justify-between"
                      >
                        <div>
                          <div className="text-xs font-bold text-stone-100">{vs.name}</div>
                          <div className="text-[10px] font-mono text-amber-400">{vs.duration.toFixed(2)}s</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => triggerPad(vs.id, `vocal_${vs.id}`)}
                          className="px-3 py-1.5 rounded bg-amber-600 text-stone-950 text-xs font-bold flex items-center gap-1"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          Play
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: WEB AUDIO PLUG-INS */}
          {activeTab === 'plugins' && (
            <div className="space-y-5">
              <div className="bg-stone-900 border border-stone-800 p-5 rounded-xl space-y-4">
                <div>
                  <h3 className="text-base font-bold text-stone-100">
                    Web Audio DSP Rack &amp; Extensible AudioWorklet Plug-ins
                  </h3>
                  <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                    Runs real Web Audio DSP processing in-browser and supports loading external{' '}
                    <code className="text-amber-300 font-mono">AudioWorklet</code> modules over HTTPS/CORS.
                    Native desktop VST3 and Apple AUv3 binary plug-ins are not supported inside web browsers.
                  </p>
                </div>

                {/* Built-in Master DSP Toggles */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      const next = !compressorOn;
                      setCompressorOn(next);
                      engineRef.current?.setCompressorEnabled(next);
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-colors ${
                      compressorOn
                        ? 'bg-emerald-950/50 border-emerald-500/60 text-emerald-200'
                        : 'bg-stone-950 border-stone-800 text-stone-400'
                    }`}
                  >
                    <div className="font-bold">Bus Dynamics Compressor</div>
                    <div className="text-[10px] font-mono mt-1">{compressorOn ? 'ACTIVE (4:1)' : 'BYPASSED'}</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const next = !reverbOn;
                      setReverbOn(next);
                      engineRef.current?.setReverbEnabled(next);
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-colors ${
                      reverbOn
                        ? 'bg-emerald-950/50 border-emerald-500/60 text-emerald-200'
                        : 'bg-stone-950 border-stone-800 text-stone-400'
                    }`}
                  >
                    <div className="font-bold">Studio Convolver Reverb</div>
                    <div className="text-[10px] font-mono mt-1">{reverbOn ? 'ACTIVE (1.4s Room)' : 'BYPASSED'}</div>
                  </button>

                  <div className="p-3.5 rounded-xl border bg-stone-950 border-stone-800 text-stone-200">
                    <div className="font-bold">Master Filter Cutoff</div>
                    <div className="text-[10px] font-mono text-amber-300 mt-1">{masterCutoff} Hz Low-Pass</div>
                  </div>
                </div>
              </div>

              {/* Load Custom AudioWorklet Plug-in */}
              <form
                onSubmit={handleInstallWorkletPlugin}
                className="bg-stone-900 border border-stone-800 p-5 rounded-xl space-y-3"
              >
                <h4 className="text-sm font-bold text-stone-200">
                  Register Custom Web AudioWorklet Plug-in
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
                  <input
                    type="text"
                    value={pluginId}
                    onChange={(e) => setPluginId(e.target.value)}
                    placeholder="Plug-in ID"
                    className="bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-stone-100"
                  />
                  <input
                    type="text"
                    value={pluginName}
                    onChange={(e) => setPluginName(e.target.value)}
                    placeholder="Plug-in Name"
                    className="bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-stone-100"
                  />
                  <select
                    value={pluginType}
                    onChange={(e) => setPluginType(e.target.value as WebPluginType)}
                    className="bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-stone-100"
                  >
                    <option value="effect">DSP Effect</option>
                    <option value="instrument">Synth Instrument</option>
                  </select>
                  <input
                    type="url"
                    value={pluginUrl}
                    onChange={(e) => setPluginUrl(e.target.value)}
                    placeholder="https://.../worklet.js"
                    className="bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-stone-100"
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs"
                  >
                    Load AudioWorklet Module
                  </button>
                  {pluginMsg && <span className="text-xs text-amber-300">{pluginMsg}</span>}
                </div>

                {plugins.length > 0 && (
                  <div className="pt-2 space-y-2">
                    {plugins.map((p) => (
                      <div
                        key={p.manifest.id}
                        className="bg-stone-950 border border-stone-800 px-3 py-2 rounded-lg flex items-center justify-between text-xs"
                      >
                        <span className="text-stone-100 font-medium">
                          {p.manifest.name} ({p.manifest.format})
                        </span>
                        <span className="text-emerald-400 font-mono">
                          {p.enabled ? 'ENABLED' : 'BYPASSED'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </form>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 bg-stone-950 border-t border-stone-800 flex items-center justify-between text-xs text-stone-400">
          <span>Exclusive to Premade Hilltop Shelter · Zero-latency Web Audio API</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg font-medium transition-colors"
          >
            Return to Studio Room
          </button>
        </div>
      </div>
    </div>
  );
}
