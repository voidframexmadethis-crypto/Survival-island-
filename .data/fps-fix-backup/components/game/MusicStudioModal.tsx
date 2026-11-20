'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Copy,
  Disc,
  Folder,
  Headphones,
  Keyboard,
  Layers,
  ListMusic,
  Mic,
  MousePointer,
  Music,
  Paintbrush,
  PanelLeft,
  Pause,
  Pencil,
  Play,
  Plus,
  Radio,
  Sliders,
  Square,
  Trash2,
  Upload,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  buildMelodyPresetNotes,
  LoadedCustomProcessor,
  LoadedWebPlugin,
  mapMidiSequenceToDrumSteps,
  mapMidiSequenceToPianoRollNotes,
  midiToFrequency,
  midiToNoteName,
  MusicStudioEngine,
  ParsedMidiSequence,
  PianoRollNote,
  PianoRollPresetId,
  StudioSample,
  StudioSampleSummary,
  toggleOrAddPianoRollNote,
  transposePianoRollChannel,
  WebPluginType,
} from '@/game/systems/villagesAndAudioStudio';

export type StudioTab =
  | 'sequencer'
  | 'pianoroll'
  | 'keyboard'
  | 'samples'
  | 'mixing'
  | 'booth'
  | 'plugins';

type MobilePane = 'all' | 'browser' | 'sequencer' | 'playlist' | 'mixer';
type EditTool = 'draw' | 'paint' | 'mute';
type TransportMode = 'pat' | 'song';
type DawSynthType =
  | 'kick'
  | '808'
  | 'snare'
  | 'hat'
  | 'openhat'
  | 'perc'
  | 'pluck'
  | 'lead';

interface MusicStudioModalProps {
  initialTab?: StudioTab;
  onClose: () => void;
  onToast: (
    msg: string,
    tone?: 'gain' | 'craft' | 'warning' | 'discovery' | 'info',
  ) => void;
}

interface BrowserItem {
  id: string;
  name: string;
  synthType: DawSynthType;
  pitch: number;
  plugin?: string;
  isCustomSample?: boolean;
  isCustomMidi?: boolean;
  isCustomWorklet?: boolean;
  sampleId?: string;
  midiSequence?: ParsedMidiSequence;
}

interface BrowserFolder {
  id: string;
  name: string;
  open: boolean;
  items: BrowserItem[];
}

interface DawChannel {
  id: number;
  name: string;
  color: string;
  synthType: DawSynthType;
  freq: number;
  vol: number;
  pan: number;
  reverbSend: number;
  mute: boolean;
  solo: boolean;
  mixerTrack: number;
  fx: string[];
  sampleName?: string | null;
}

interface PlaylistTrack {
  id: number;
  name: string;
  color: string;
  muted: boolean;
}

interface PlaylistClip {
  id: string;
  track: number;
  startBar: number;
  lengthBars: number;
  label: string;
  color: string;
  kind: 'pattern' | 'audio' | 'auto';
}

interface MixerStrip {
  index: number;
  name: string;
  groupColor: string;
  headerColor: string;
  vol: number;
  pan: number;
  mute: boolean;
  peak: number;
  fxSlots: string[];
}

const NUM_STEPS = 16;
const NUM_BARS = 16;
const PIXELS_PER_BAR = 46;
const PATTERN_NAMES = [
  'Pat 1 — Trap Bounce',
  'Pat 2 — Late Night Arp',
  'Pat 3 — Half-Time Roll',
  'Pat 4 — Custom Session',
];

const INITIAL_FOLDERS: BrowserFolder[] = [
  {
    id: 'samples',
    name: 'Samples',
    open: true,
    items: [
      { id: 'smp_808', name: 'Sub808_Deep.wav', synthType: '808', pitch: 55 },
      { id: 'smp_kick', name: 'PunchKick_01.wav', synthType: 'kick', pitch: 60 },
      { id: 'smp_snare', name: 'CrispSnare_04.wav', synthType: 'snare', pitch: 180 },
      { id: 'smp_hat', name: 'ClosedHat_Tight.wav', synthType: 'hat', pitch: 8000 },
    ],
  },
  {
    id: 'drumkits',
    name: 'Drum Kits',
    open: true,
    items: [
      { id: 'dk_kick', name: 'TrapVault_Kick.wav', synthType: 'kick', pitch: 58 },
      { id: 'dk_rim', name: 'RimShot_Snap.wav', synthType: 'snare', pitch: 240 },
      { id: 'dk_ohat', name: 'OpenHat_Shimmer.wav', synthType: 'openhat', pitch: 6500 },
      { id: 'dk_perc', name: 'Perc_WoodClick.wav', synthType: 'perc', pitch: 920 },
    ],
  },
  {
    id: 'midiloops',
    name: 'MIDI Loops',
    open: false,
    items: [
      { id: 'mid_pluck', name: 'DarkMinor_Pluck.mid', synthType: 'pluck', pitch: 330 },
      { id: 'mid_lead', name: 'Midnight_Lead.mid', synthType: 'lead', pitch: 440 },
    ],
  },
  {
    id: 'presets',
    name: 'Presets',
    open: false,
    items: [
      { id: 'pre_bass', name: 'AnalogSaw_Bass.fst', synthType: '808', pitch: 65.4 },
      { id: 'pre_bell', name: 'CrystalBell_Arp.fst', synthType: 'pluck', pitch: 523.25 },
    ],
  },
  {
    id: 'plugins',
    name: 'Plugins',
    open: false,
    items: [
      { id: 'plg_eq', name: 'MP_Parametric_EQ.worklet', synthType: 'pluck', pitch: 440, plugin: 'EQ' },
      { id: 'plg_lim', name: 'MP_Master_Limiter.worklet', synthType: 'pluck', pitch: 440, plugin: 'Limiter' },
      { id: 'plg_cho', name: 'MP_Warm_Chorus.worklet', synthType: 'pluck', pitch: 440, plugin: 'Chorus' },
    ],
  },
];

const INITIAL_CHANNELS: DawChannel[] = [
  { id: 0, name: 'Kick', color: '#3b5998', synthType: 'kick', freq: 58, vol: 0.92, pan: 0.0, reverbSend: 0.05, mute: false, solo: false, mixerTrack: 0, fx: ['EQ', 'Comp'] },
  { id: 1, name: 'Clap', color: '#2b7a78', synthType: 'snare', freq: 240, vol: 0.82, pan: -0.1, reverbSend: 0.25, mute: false, solo: false, mixerTrack: 1, fx: ['EQ', 'Verb'] },
  { id: 2, name: 'Snare Hit', color: '#5b518a', synthType: 'snare', freq: 205, vol: 0.84, pan: 0.05, reverbSend: 0.2, mute: false, solo: false, mixerTrack: 2, fx: ['EQ', 'Comp'] },
  { id: 3, name: 'Hi-Hat', color: '#365f78', synthType: 'hat', freq: 7800, vol: 0.65, pan: 0.22, reverbSend: 0.12, mute: false, solo: false, mixerTrack: 3, fx: ['Delay'] },
  { id: 4, name: 'Sub 808', color: '#784863', synthType: '808', freq: 55, vol: 0.88, pan: 0.0, reverbSend: 0.04, mute: false, solo: false, mixerTrack: 4, fx: ['Sat', 'EQ'] },
  { id: 5, name: 'Synth Pluck', color: '#456957', synthType: 'pluck', freq: 392, vol: 0.74, pan: -0.22, reverbSend: 0.3, mute: false, solo: false, mixerTrack: 5, fx: ['Chorus'] },
  { id: 6, name: 'Lead Arp', color: '#745938', synthType: 'lead', freq: 587.33, vol: 0.7, pan: 0.18, reverbSend: 0.28, mute: false, solo: false, mixerTrack: 6, fx: ['Delay'] },
  { id: 7, name: 'Open Hat', color: '#4a5568', synthType: 'openhat', freq: 6500, vol: 0.62, pan: -0.18, reverbSend: 0.22, mute: false, solo: false, mixerTrack: 7, fx: ['EQ'] },
];

const INITIAL_PATTERNS: number[][][] = [
  [
    [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0],
    [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1],
    [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0],
    [0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0],
    [1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0],
    [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0],
  ],
  [
    [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0],
    [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
    [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
    [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0],
    [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
    [0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0],
  ],
  [
    [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    [1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0],
    [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1],
    [1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
  ],
  [
    [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  ],
];

const INITIAL_PLAYLIST_TRACKS: PlaylistTrack[] = [
  { id: 0, name: 'Vocal', color: '#6b4776', muted: false },
  { id: 1, name: 'Vocal Dist', color: '#5c4166', muted: false },
  { id: 2, name: 'Delay Bus', color: '#2b5e68', muted: false },
  { id: 3, name: 'Kick', color: '#394b78', muted: false },
  { id: 4, name: 'Clap / Snare', color: '#324873', muted: false },
  { id: 5, name: 'Hi-Hat Roll', color: '#2d4c69', muted: false },
  { id: 6, name: '808 Sub', color: '#453e6e', muted: false },
  { id: 7, name: 'Open Hat', color: '#3b4a5e', muted: false },
];

const INITIAL_CLIPS: PlaylistClip[] = [
  { id: 'c1', track: 0, startBar: 0, lengthBars: 4, label: 'Pat 1 — Trap Bounce', color: '#6b4776', kind: 'pattern' },
  { id: 'c2', track: 0, startBar: 4, lengthBars: 4, label: 'Vocal Hook Stem', color: '#74487e', kind: 'audio' },
  { id: 'c3', track: 1, startBar: 2, lengthBars: 4, label: 'Vocal Dist Delay', color: '#563c62', kind: 'auto' },
  { id: 'c4', track: 2, startBar: 1, lengthBars: 6, label: 'Delay Vol Curve', color: '#265c66', kind: 'auto' },
  { id: 'c5', track: 3, startBar: 0, lengthBars: 8, label: 'Pat 1 — Kick Pattern', color: '#354b7a', kind: 'pattern' },
  { id: 'c6', track: 4, startBar: 4, lengthBars: 8, label: 'Pat 2 — Clap & Snare', color: '#2f4570', kind: 'pattern' },
  { id: 'c7', track: 5, startBar: 0, lengthBars: 12, label: 'Hi-Hat Roll Loops', color: '#294c66', kind: 'pattern' },
  { id: 'c8', track: 6, startBar: 4, lengthBars: 8, label: 'Sub 808 Drop', color: '#443c6d', kind: 'audio' },
  { id: 'c9', track: 7, startBar: 8, lengthBars: 4, label: 'Open Hat Fill', color: '#394a5e', kind: 'pattern' },
];

const MIXER_INSERT_DEFS: { name: string; groupColor: string; headerColor: string; fxSlots: string[] }[] = [
  { name: 'Kick', groupColor: '#2c3246', headerColor: '#3d4766', fxSlots: ['EQ', 'Comp'] },
  { name: 'Clap', groupColor: '#2c3246', headerColor: '#3d4766', fxSlots: ['EQ', 'Verb'] },
  { name: 'Snare', groupColor: '#2c3246', headerColor: '#3d4766', fxSlots: ['EQ', 'Comp'] },
  { name: 'Hi-Hat', groupColor: '#2c3246', headerColor: '#3d4766', fxSlots: ['HPF', 'Delay'] },
  { name: '808 Bass', groupColor: '#243740', headerColor: '#2e4e5c', fxSlots: ['Sat', 'EQ'] },
  { name: 'Pluck', groupColor: '#243740', headerColor: '#2e4e5c', fxSlots: ['Chorus', 'Verb'] },
  { name: 'Lead Arp', groupColor: '#243740', headerColor: '#2e4e5c', fxSlots: ['Delay', 'EQ'] },
  { name: 'Open Hat', groupColor: '#243740', headerColor: '#2e4e5c', fxSlots: ['EQ', 'Widener'] },
  { name: 'Vocal', groupColor: '#383628', headerColor: '#524e35', fxSlots: ['DeEss', 'Comp'] },
  { name: 'Vocal Dist', groupColor: '#383628', headerColor: '#524e35', fxSlots: ['Dist', 'EQ'] },
  { name: 'Drum Bus', groupColor: '#383628', headerColor: '#524e35', fxSlots: ['Glue', 'Limit'] },
  { name: 'Delay Bus', groupColor: '#3f282b', headerColor: '#5c363b', fxSlots: ['Ping', 'LPF'] },
  { name: 'Reverb', groupColor: '#3f282b', headerColor: '#5c363b', fxSlots: ['Hall', 'Damp'] },
  { name: 'Aux Send', groupColor: '#3f282b', headerColor: '#5c363b', fxSlots: ['Stereo', 'Sat'] },
];

const INITIAL_MIXER_STRIPS: MixerStrip[] = MIXER_INSERT_DEFS.map((def, idx) => ({
  index: idx,
  name: def.name,
  groupColor: def.groupColor,
  headerColor: def.headerColor,
  vol: 0.82,
  pan: 0,
  mute: false,
  peak: 0.06,
  fxSlots: def.fxSlots,
}));

const PICKER_CLIPS = [
  { id: 'pk_pat1', label: 'Pat 1 — Trap Bounce', color: '#475569', kind: 'pattern' as const },
  { id: 'pk_pat2', label: 'Pat 2 — Late Night Arp', color: '#3b5998', kind: 'pattern' as const },
  { id: 'pk_pat3', label: 'Pat 3 — Half-Time Roll', color: '#5b518a', kind: 'pattern' as const },
  { id: 'pk_vox', label: 'Vocal Hook.wav', color: '#6b4776', kind: 'audio' as const },
  { id: 'pk_808', label: '808 Sub Drop.wav', color: '#2b6a73', kind: 'audio' as const },
  { id: 'pk_hat', label: 'Hi-Hat Loop.wav', color: '#324873', kind: 'audio' as const },
  { id: 'pk_auto', label: 'Delay Vol Auto', color: '#564166', kind: 'auto' as const },
];

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

type ScaleGuideId = 'all' | 'c_minor' | 'a_minor' | 'c_major' | 'pentatonic';

const PIANO_ROLL_PITCHES = Array.from({ length: 25 }, (_, i) => {
  const midi = 72 - i; // C5 (72) down to C3 (48)
  const noteIdx = midi % 12;
  const black = noteIdx === 1 || noteIdx === 3 || noteIdx === 6 || noteIdx === 8 || noteIdx === 10;
  return {
    midi,
    label: midiToNoteName(midi),
    black,
    pitchClass: noteIdx,
  };
});

const SCALE_PITCH_CLASSES: Record<ScaleGuideId, Set<number>> = {
  all: new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]),
  c_minor: new Set([0, 2, 3, 5, 7, 8, 10]),
  a_minor: new Set([0, 2, 4, 5, 7, 9, 11]),
  c_major: new Set([0, 2, 4, 5, 7, 9, 11]),
  pentatonic: new Set([0, 3, 5, 7, 10]),
};

function createInitialPianoRollPatterns(): Record<number, PianoRollNote[]> {
  return {
    0: [
      ...buildMelodyPresetNotes('trap_minor', 5),
      ...buildMelodyPresetNotes('bass_808', 4),
    ],
    1: [
      ...buildMelodyPresetNotes('arp_dream', 6),
      ...buildMelodyPresetNotes('chord_prog', 5),
    ],
    2: [...buildMelodyPresetNotes('chord_prog', 5)],
    3: [],
  };
}

export function MusicStudioModal({
  initialTab = 'sequencer',
  onClose,
  onToast,
}: MusicStudioModalProps) {
  const engineRef = useRef<MusicStudioEngine | null>(null);
  const spectrumCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const miniOscCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const playheadElRef = useRef<HTMLDivElement | null>(null);
  const timeCounterElRef = useRef<HTMLSpanElement | null>(null);
  const peakReadoutElRef = useRef<HTMLDivElement | null>(null);
  const mixerMeterElsRef = useRef<(HTMLDivElement | null)[]>([]);
  const masterMeterLElRef = useRef<HTMLDivElement | null>(null);
  const masterMeterRElRef = useRef<HTMLDivElement | null>(null);

  const [activeTab, setActiveTab] = useState<StudioTab>(initialTab);
  const [mobilePane, setMobilePane] = useState<MobilePane>('all');
  const [showBrowserDrawer, setShowBrowserDrawer] = useState(false);
  const [audioLive, setAudioLive] = useState(false);

  // Transport & Sequencer State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transportMode, setTransportMode] = useState<TransportMode>('pat');
  const [bpm, setBpm] = useState(130.7);
  const [activePattern, setActivePattern] = useState(0);
  const [activeTool, setActiveTool] = useState<EditTool>('draw');
  const [snapDivision, setSnapDivision] = useState(2);
  const [playheadStep, setPlayheadStep] = useState(-1);
  const [selectedPickerClipId, setSelectedPickerClipId] = useState('pk_pat1');
  const [isDropActive, setIsDropActive] = useState(false);

  // DAW Data State
  const [folders, setFolders] = useState<BrowserFolder[]>(() =>
    INITIAL_FOLDERS.map((f) => ({ ...f, items: f.items.map((i) => ({ ...i })) })),
  );
  const [samples, setSamples] = useState<StudioSampleSummary[]>([]);
  const [channels, setChannels] = useState<DawChannel[]>(() =>
    INITIAL_CHANNELS.map((c) => ({ ...c, fx: [...c.fx] })),
  );
  const [patterns, setPatterns] = useState<number[][][]>(() =>
    INITIAL_PATTERNS.map((pat) => pat.map((row) => [...row])),
  );
  const [playlistTracks, setPlaylistTracks] = useState<PlaylistTrack[]>(() =>
    INITIAL_PLAYLIST_TRACKS.map((t) => ({ ...t })),
  );
  const [playlistClips, setPlaylistClips] = useState<PlaylistClip[]>(() =>
    INITIAL_CLIPS.map((c) => ({ ...c })),
  );
  const [mixerStrips, setMixerStrips] = useState<MixerStrip[]>(() =>
    INITIAL_MIXER_STRIPS.map((s) => ({ ...s, fxSlots: [...s.fxSlots] })),
  );
  const [masterVol, setMasterVol] = useState(0.85);
  const [masterCutoff, setMasterCutoff] = useState(18000);
  const [compressorOn, setCompressorOn] = useState(true);
  const [reverbOn, setReverbOn] = useState(true);

  // Sample Tab State
  const [importCategory, setImportCategory] = useState<StudioSample['category']>('loop');
  const [activePadId, setActivePadId] = useState<string | null>(null);
  const [importedMidi, setImportedMidi] = useState<ParsedMidiSequence | null>(null);

  // MIDI Synth Keyboard State
  const [synthWave, setSynthWave] = useState<OscillatorType>('sawtooth');
  const [synthCutoff, setSynthCutoff] = useState(4200);
  const [synthDecay, setSynthDecay] = useState(0.42);
  const [activeMidiNote, setActiveMidiNote] = useState<number | null>(null);

  // Piano Roll Pattern Melody State
  const [pianoRollPatterns, setPianoRollPatterns] = useState<
    Record<number, PianoRollNote[]>
  >(() => createInitialPianoRollPatterns());
  const [pianoRollChannelId, setPianoRollChannelId] = useState(5); // Synth Pluck
  const [pianoRollBrushDuration, setPianoRollBrushDuration] = useState<1 | 2 | 4 | 8>(2);
  const [pianoRollScale, setPianoRollScale] = useState<ScaleGuideId>('c_minor');
  const [pianoRollWaveform, setPianoRollWaveform] = useState<'auto' | OscillatorType>('auto');
  const [showGhostNotes, setShowGhostNotes] = useState(true);
  const [selectedPrNoteId, setSelectedPrNoteId] = useState<string | null>(null);

  // Recording Booth State
  const [isRecordingMic, setIsRecordingMic] = useState(false);
  const [takeName, setTakeName] = useState('Studio Vocal Take 1');
  const [micStatus, setMicStatus] = useState('Condenser Mic & Booth Ready');
  const [recordedTakes, setRecordedTakes] = useState<
    { id: string; name: string; duration: number }[]
  >([]);

  // Web Audio Plug-in Registry State
  const [plugins, setPlugins] = useState<LoadedWebPlugin[]>([]);
  const [customProcessors, setCustomProcessors] = useState<LoadedCustomProcessor[]>([]);
  const [pluginId, setPluginId] = useState('custom-tape-sat');
  const [pluginName, setPluginName] = useState('Tape Saturator Worklet');
  const [pluginType, setPluginType] = useState<WebPluginType>('effect');
  const [pluginUrl, setPluginUrl] = useState('');
  const [pluginMsg, setPluginMsg] = useState<string | null>(null);

  // Live mutable state ref for 60 FPS animation loop
  const liveRef = useRef({
    isPlaying: false,
    bpm: 130.7,
    activePattern: 0,
    currentStep: 0,
    playheadBarFloat: 0,
    channels,
    patterns,
    pianoRollPatterns,
    pianoRollWaveform: 'auto' as 'auto' | OscillatorType,
    mixerStrips,
    masterVol: 0.85,
  });

  useEffect(() => {
    liveRef.current.isPlaying = isPlaying;
    liveRef.current.bpm = bpm;
    liveRef.current.activePattern = activePattern;
    liveRef.current.channels = channels;
    liveRef.current.patterns = patterns;
    liveRef.current.pianoRollPatterns = pianoRollPatterns;
    liveRef.current.pianoRollWaveform = pianoRollWaveform;
    liveRef.current.mixerStrips = mixerStrips;
    liveRef.current.masterVol = masterVol;
  }, [
    isPlaying,
    bpm,
    activePattern,
    channels,
    patterns,
    pianoRollPatterns,
    pianoRollWaveform,
    mixerStrips,
    masterVol,
  ]);

  const ensureAudioReady = useCallback(async () => {
    if (!engineRef.current) return null;
    try {
      await engineRef.current.unlockAudio();
      setAudioLive(true);
    } catch {
      // Fallback: keep working gracefully
    }
    return engineRef.current;
  }, []);

  const triggerChannelVoice = useCallback((channelIndex: number) => {
    const engine = engineRef.current;
    if (!engine) return;
    const snap = liveRef.current;
    const ch = snap.channels[channelIndex];
    if (!ch) return;

    const anySolo = snap.channels.some((c) => c.solo);
    if (ch.mute || (anySolo && !ch.solo)) return;

    const strip = snap.mixerStrips[ch.mixerTrack % snap.mixerStrips.length];
    if (strip) {
      strip.peak = Math.min(1, Math.max(strip.peak, ch.vol * 0.96));
    }

    engine.triggerDawVoice({
      synthType: ch.synthType,
      freq: ch.freq,
      vol: ch.vol,
      pan: ch.pan,
      sampleName: ch.sampleName ?? null,
      stripVol: strip ? strip.vol : 1,
      stripPan: strip ? strip.pan : 0,
      stripMuted: strip ? strip.mute : false,
    });
  }, []);

  const triggerPianoRollVoice = useCallback(
    (note: PianoRollNote, durationSec: number) => {
      const engine = engineRef.current;
      if (!engine) return;
      const snap = liveRef.current;
      const ch =
        snap.channels.find((c) => c.id === note.channelId) ||
        snap.channels[note.channelId];
      if (!ch) return;

      const anySolo = snap.channels.some((c) => c.solo);
      if (ch.mute || (anySolo && !ch.solo)) return;

      const strip = snap.mixerStrips[ch.mixerTrack % snap.mixerStrips.length];
      if (strip) {
        strip.peak = Math.min(1, Math.max(strip.peak, ch.vol * note.velocity * 0.98));
      }

      const melodicType =
        ch.synthType === '808' || ch.synthType === 'pluck' || ch.synthType === 'lead'
          ? ch.synthType
          : 'pluck';
      const chosenWave =
        snap.pianoRollWaveform !== 'auto'
          ? snap.pianoRollWaveform
          : ch.synthType === 'lead'
          ? 'sawtooth'
          : ch.synthType === '808'
          ? 'triangle'
          : 'triangle';

      engine.triggerDawVoice({
        synthType: melodicType,
        freq: midiToFrequency(note.midi),
        vol: ch.vol * note.velocity,
        pan: ch.pan,
        sampleName: ch.sampleName ?? null,
        pitchShiftFromHz: ch.sampleName ? 261.63 : undefined,
        stripVol: strip ? strip.vol : 1,
        stripPan: strip ? strip.pan : 0,
        stripMuted: strip ? strip.mute : false,
        durationSec: Math.max(0.12, durationSec),
        waveform: chosenWave,
      });
    },
    [],
  );

  // Initialize Engine + 60 FPS Canvas Spectrum + Mini Toolbar Wave + Mixer Meters
  useEffect(() => {
    const engine = new MusicStudioEngine();
    engineRef.current = engine;
    engine.setMasterVolume(liveRef.current.masterVol);

    const binCount = engine.getAnalyserBinCount();
    const fftSize = engine.getAnalyserFftSize();
    const freqData = new Uint8Array(new ArrayBuffer(binCount));
    const timeData = new Uint8Array(new ArrayBuffer(fftSize));

    let rafId = 0;
    let lastTime = performance.now();
    let stepAccumulatorSec = 0;

    // Schedule initial built-in samples snapshot outside effect body
    const initSamplesRaf = window.requestAnimationFrame(() => {
      if (engineRef.current) {
        setSamples(engineRef.current.getSamples());
      }
    });

    const resizeCanvas = (canvas: HTMLCanvasElement | null) => {
      if (!canvas) return;
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      if (w <= 0 || h <= 0) return;
      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
      }
    };

    const drawVisuals = (dt: number) => {
      const snap = liveRef.current;
      const running = snap.isPlaying || engine.getAudioContext().state === 'running';
      if (running) {
        engine.copyAnalyserData(freqData, timeData);
      }

      // 1. Channel Rack Embedded Bright Cyan Piano/Spectrum Visualizer (matches FL Studio screenshot)
      resizeCanvas(spectrumCanvasRef.current);
      const specCanvas = spectrumCanvasRef.current;
      const specCtx = specCanvas?.getContext('2d');
      let maxLevel = 0.04;

      if (specCanvas && specCtx) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = specCanvas.clientWidth;
        const h = specCanvas.clientHeight;
        if (w > 0 && h > 0) {
          specCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
          specCtx.fillStyle = '#071422';
          specCtx.fillRect(0, 0, w, h);

          // Draw vertical cyan spectrum columns framed cleanly like the screenshot
          const barCount = 16;
          const gap = 3;
          const barWidth = Math.max(4, (w - gap * (barCount + 1)) / barCount);

          for (let i = 0; i < barCount; i++) {
            const binIdx = Math.min(
              freqData.length - 1,
              Math.floor((i / barCount) * freqData.length * 0.7),
            );
            const liveBin = freqData[binIdx] / 255;

            let norm = 0.25 + 0.14 * Math.sin(performance.now() * 0.002 + i * 0.6);
            if (liveBin > 0.04) {
              norm = Math.max(0.22, liveBin);
            } else if (snap.isPlaying) {
              const wave = Math.sin(performance.now() * 0.01 + i * 0.55) * 0.5 + 0.5;
              norm = 0.28 + wave * 0.58;
            }
            if (norm > maxLevel) maxLevel = norm;

            const barH = Math.max(8, norm * (h - 14));
            const x = gap + i * (barWidth + gap);
            const y = h - barH - 4;

            const grad = specCtx.createLinearGradient(0, y, 0, h);
            grad.addColorStop(0, '#7dd3fc');
            grad.addColorStop(0.4, '#38bdf8');
            grad.addColorStop(1, '#0369a1');
            specCtx.fillStyle = grad;
            specCtx.fillRect(x, y, barWidth, barH);

            // Top dark key cap accent like the screenshot's cyan keyboard/bar analyzer
            if (i % 7 === 1 || i % 7 === 2 || i % 7 === 4 || i % 7 === 5 || i % 7 === 6) {
              specCtx.fillStyle = 'rgba(7, 20, 34, 0.78)';
              specCtx.fillRect(x + barWidth * 0.55, 4, barWidth * 0.55, h * 0.44);
            }
          }

          // Subtle oscilloscope trace
          specCtx.beginPath();
          for (let x = 0; x < w; x += 3) {
            const idx = Math.min(timeData.length - 1, Math.floor((x / w) * timeData.length));
            const sample = running ? (timeData[idx] - 128) / 128 : 0;
            const py = h * 0.5 + sample * (h * 0.3);
            if (x === 0) specCtx.moveTo(x, py);
            else specCtx.lineTo(x, py);
          }
          specCtx.strokeStyle = 'rgba(224, 242, 254, 0.65)';
          specCtx.lineWidth = 1.25;
          specCtx.stroke();
        }
      }

      // 2. Top Toolbar Mini Oscilloscope next to LCD Timer
      resizeCanvas(miniOscCanvasRef.current);
      const miniCanvas = miniOscCanvasRef.current;
      const miniCtx = miniCanvas?.getContext('2d');
      if (miniCanvas && miniCtx) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = miniCanvas.clientWidth;
        const h = miniCanvas.clientHeight;
        if (w > 0 && h > 0) {
          miniCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
          miniCtx.fillStyle = '#181d25';
          miniCtx.fillRect(0, 0, w, h);

          miniCtx.beginPath();
          for (let x = 0; x < w; x += 2) {
            const idx = Math.min(timeData.length - 1, Math.floor((x / w) * timeData.length));
            const sample = running
              ? (timeData[idx] - 128) / 128
              : Math.sin(x * 0.14 + performance.now() * 0.004) * 0.14;
            const py = h * 0.5 + sample * (h * 0.42);
            if (x === 0) miniCtx.moveTo(x, py);
            else miniCtx.lineTo(x, py);
          }
          miniCtx.strokeStyle = '#a5f3fc';
          miniCtx.lineWidth = 1.4;
          miniCtx.stroke();
        }
      }

      if (peakReadoutElRef.current) {
        const db = maxLevel > 0.05 ? (20 * Math.log10(maxLevel)).toFixed(1) : '-24.0';
        peakReadoutElRef.current.textContent = `${db} dB`;
      }

      // 3. Mixer Strip Peak Meters & Master L/R Meters
      let masterPeak = 0.08;
      snap.mixerStrips.forEach((strip, idx) => {
        strip.peak = Math.max(0.06, strip.peak - dt * 1.85);
        const activeVal = snap.isPlaying
          ? Math.max(strip.peak, maxLevel * 0.65 * strip.vol)
          : strip.peak;
        if (activeVal > masterPeak) masterPeak = activeVal;

        const barEl = mixerMeterElsRef.current[idx];
        if (barEl) {
          barEl.style.height = `${Math.min(100, Math.round(activeVal * 100))}%`;
        }
      });

      const mPct = Math.min(100, Math.round(masterPeak * snap.masterVol * 115));
      if (masterMeterLElRef.current) {
        masterMeterLElRef.current.style.height = `${mPct}%`;
      }
      if (masterMeterRElRef.current) {
        masterMeterRElRef.current.style.height = `${Math.max(4, mPct - 4)}%`;
      }
    };

    const syncHudPlayhead = () => {
      const snap = liveRef.current;
      if (playheadElRef.current) {
        const leftOffset = 112 + snap.playheadBarFloat * PIXELS_PER_BAR;
        playheadElRef.current.style.left = `${leftOffset}px`;
      }
      if (timeCounterElRef.current) {
        const bar = Math.floor(snap.playheadBarFloat) + 1;
        const beat = Math.floor((snap.currentStep % 16) / 4) + 1;
        const subStep = (snap.currentStep % 4) + 1;
        timeCounterElRef.current.textContent = `${String(bar).padStart(2, '0')}:${String(beat).padStart(2, '0')}:${String(subStep).padStart(2, '0')}`;
      }
    };

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const snap = liveRef.current;

      if (snap.isPlaying) {
        const secondsPerStep = 60 / Math.max(40, snap.bpm) / 4;
        stepAccumulatorSec += dt;

        while (stepAccumulatorSec >= secondsPerStep) {
          stepAccumulatorSec -= secondsPerStep;

          const step = snap.currentStep;
          const pat = snap.patterns[snap.activePattern];
          const prNotes = snap.pianoRollPatterns[snap.activePattern] || [];
          const channelsWithPr = new Set(prNotes.map((n) => n.channelId));

          if (pat) {
            snap.channels.forEach((ch, idx) => {
              if (!channelsWithPr.has(ch.id) && pat[idx] && pat[idx][step] === 1) {
                triggerChannelVoice(idx);
              }
            });
          }

          if (prNotes.length > 0) {
            for (const note of prNotes) {
              if (note.step === step) {
                triggerPianoRollVoice(note, Math.max(0.12, note.duration * secondsPerStep));
              }
            }
          }

          setPlayheadStep(step);
          snap.currentStep = (step + 1) % NUM_STEPS;
        }

        const barsPerSecond = Math.max(40, snap.bpm) / 60 / 4;
        snap.playheadBarFloat = (snap.playheadBarFloat + barsPerSecond * dt) % NUM_BARS;
        syncHudPlayhead();
      }

      drawVisuals(dt);
      rafId = window.requestAnimationFrame(loop);
    };

    rafId = window.requestAnimationFrame(loop);

    return () => {
      window.cancelAnimationFrame(initSamplesRaf);
      window.cancelAnimationFrame(rafId);
      engine.dispose();
      engineRef.current = null;
    };
  }, [triggerChannelVoice, triggerPianoRollVoice]);

  const handleTogglePlay = useCallback(async () => {
    await ensureAudioReady();
    setIsPlaying((prev) => {
      const next = !prev;
      if (!next) setPlayheadStep(-1);
      return next;
    });
  }, [ensureAudioReady]);

  const handleStop = useCallback(() => {
    setIsPlaying(false);
    setPlayheadStep(-1);
    liveRef.current.currentStep = 0;
    liveRef.current.playheadBarFloat = 0;
    if (playheadElRef.current) {
      playheadElRef.current.style.left = '112px';
    }
    if (timeCounterElRef.current) {
      timeCounterElRef.current.textContent = '01:01:01';
    }
  }, []);

  const handleToggleRecord = useCallback(async () => {
    await ensureAudioReady();
    setIsRecording((prev) => {
      const next = !prev;
      onToast(
        next ? 'Recording Mode Armed' : 'Recording Mode Off',
        next ? 'discovery' : 'info',
      );
      return next;
    });
  }, [ensureAudioReady, onToast]);

  // Global keyboard shortcuts (Escape exit + Spacebar play/pause + Piano Keys)
  useEffect(() => {
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        ev.preventDefault();
        onClose();
        return;
      }

      if (
        ev.repeat ||
        ev.target instanceof HTMLInputElement ||
        ev.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (ev.code === 'Space') {
        ev.preventDefault();
        handleTogglePlay();
        return;
      }

      if (activeTab === 'keyboard') {
        const keyChar = ev.key.toUpperCase();
        const match = PIANO_KEYS.find((k) => k.hotkey === keyChar);
        if (match && engineRef.current) {
          ensureAudioReady().then(() => {
            engineRef.current?.playSynthNote(match.midi, synthWave, synthDecay, synthCutoff);
          });
          setActiveMidiNote(match.midi);
          window.setTimeout(() => {
            setActiveMidiNote((cur) => (cur === match.midi ? null : cur));
          }, 180);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeTab, ensureAudioReady, handleTogglePlay, onClose, synthCutoff, synthDecay, synthWave]);

  // Import local files (.wav, .mp3, .ogg, .mid, .midi, .js) via StudioImportManager
  const handleImportFiles = useCallback(
    async (fileList: FileList | File[] | null, categoryOverride?: StudioSample['category']) => {
      if (!fileList || fileList.length === 0) return;
      const engine = await ensureAudioReady();
      if (!engine) return;

      const batch = await engine.importStudioFiles(
        Array.from(fileList),
        categoryOverride ?? importCategory,
      );

      if (batch.importedAudioNames.length > 0) {
        setSamples(engine.getSamples());
        const newAudioNames = batch.importedAudioNames;
        setFolders((prev) =>
          prev.map((folder) => {
            if (folder.id !== 'samples') return folder;
            const addedItems: BrowserItem[] = newAudioNames.map((name) => ({
              id: `custom_aud_${name}_${Date.now()}`,
              name,
              synthType: 'kick',
              pitch: 60,
              isCustomSample: true,
            }));
            return { ...folder, open: true, items: [...addedItems, ...folder.items] };
          }),
        );

        setChannels((prev) => {
          const next = [...prev];
          for (const name of newAudioNames) {
            const newIdx = next.length;
            next.push({
              id: newIdx,
              name: name.replace(/\.[^/.]+$/, '').slice(0, 14),
              color: '#2b7a78',
              synthType: 'kick',
              freq: 60,
              vol: 0.85,
              pan: 0,
              reverbSend: 0.15,
              mute: false,
              solo: false,
              mixerTrack: newIdx % INITIAL_MIXER_STRIPS.length,
              fx: ['EQ'],
              sampleName: name,
            });
          }
          return next;
        });

        setPatterns((prev) =>
          prev.map((pat) => [
            ...pat,
            ...newAudioNames.map(() =>
              Array.from({ length: NUM_STEPS }, (_, s) => (s % 4 === 0 ? 1 : 0)),
            ),
          ]),
        );

        onToast(`Imported ${newAudioNames.length} audio file(s) into MUSIC PRO`, 'gain');
      }

      if (batch.midiSequence) {
        const seq = batch.midiSequence;
        setImportedMidi(seq);
        setBpm(seq.bpm);
        const mapped = mapMidiSequenceToDrumSteps(seq, Math.max(5, channels.length));
        setPatterns((prev) =>
          prev.map((pat, pIdx) => {
            if (pIdx !== activePattern) return pat;
            return pat.map((row, cIdx) =>
              mapped[cIdx] ? mapped[cIdx].map((b) => (b ? 1 : 0)) : row,
            );
          }),
        );
        const importedPrNotes = mapMidiSequenceToPianoRollNotes(seq, pianoRollChannelId);
        if (importedPrNotes.length > 0) {
          setPianoRollPatterns((prev) => ({
            ...prev,
            [activePattern]: [
              ...(prev[activePattern] || []).filter((n) => n.channelId !== pianoRollChannelId),
              ...importedPrNotes,
            ],
          }));
        }
        setFolders((prev) =>
          prev.map((folder) => {
            if (folder.id !== 'midiloops') return folder;
            return {
              ...folder,
              open: true,
              items: [
                {
                  id: `custom_mid_${seq.name}_${Date.now()}`,
                  name: seq.name,
                  synthType: 'pluck',
                  pitch: 440,
                  isCustomMidi: true,
                  midiSequence: seq,
                },
                ...folder.items,
              ],
            };
          }),
        );
        onToast(
          `Imported MIDI "${seq.name}" (${seq.totalNotes} notes @ ${seq.bpm} BPM)`,
          'discovery',
        );
      }

      if (batch.loadedProcessors.length > 0) {
        const allProcs = Array.from(engine.importManager.customProcessors.values());
        setCustomProcessors(allProcs);
        setPluginMsg(
          `Loaded custom AudioWorklet processor(s): ${batch.loadedProcessors.map((p) => p.name).join(', ')}`,
        );
        setFolders((prev) =>
          prev.map((folder) => {
            if (folder.id !== 'plugins') return folder;
            const added: BrowserItem[] = batch.loadedProcessors.map((p) => ({
              id: `custom_js_${p.name}_${p.loadedAt}`,
              name: p.name,
              synthType: 'pluck',
              pitch: 440,
              plugin: 'Worklet',
              isCustomWorklet: true,
            }));
            return { ...folder, open: true, items: [...added, ...folder.items] };
          }),
        );
        onToast(
          `Loaded AudioWorklet processor: ${batch.loadedProcessors.map((p) => p.name).join(', ')}`,
          'gain',
        );
      }

      for (const err of batch.errors) {
        onToast(`${err.fileName}: ${err.reason}`, 'warning');
      }
    },
    [activePattern, channels.length, ensureAudioReady, importCategory, onToast, pianoRollChannelId],
  );

  const handleBrowserItemClick = async (item: BrowserItem) => {
    const engine = await ensureAudioReady();
    if (!engine) return;

    if (item.plugin) {
      onToast(`Loaded ${item.name} on Master FX`, 'info');
      return;
    }

    if (item.sampleId) {
      engine.playSample(item.sampleId);
      onToast(`Preview: ${item.name}`, 'info');
      return;
    }

    if (item.midiSequence) {
      const count = engine.playMidiSequence(item.midiSequence, synthWave, synthCutoff);
      onToast(
        count > 0
          ? `Playing ${count} MIDI notes from "${item.name}"`
          : `Preview: ${item.name}`,
        'info',
      );
      return;
    }

    engine.triggerDawVoice({
      synthType: item.synthType,
      freq: item.pitch,
      vol: 0.8,
      sampleName: item.isCustomSample ? item.name : null,
    });
    onToast(`Preview: ${item.name}`, 'info');
  };

  const handleAddChannel = () => {
    const idx = channels.length;
    const synthChoices: DawSynthType[] = ['kick', 'snare', 'hat', '808', 'pluck', 'lead'];
    const colorChoices = ['#3b5998', '#2b7a78', '#5b518a', '#784863', '#456957', '#745938'];
    const synthType = synthChoices[idx % synthChoices.length];
    const freqMap: Record<DawSynthType, number> = {
      kick: 60,
      snare: 220,
      hat: 8200,
      openhat: 6500,
      perc: 920,
      '808': 55,
      pluck: 440,
      lead: 659.25,
    };

    setChannels((prev) => [
      ...prev,
      {
        id: idx,
        name: `Synth ${idx + 1}`,
        color: colorChoices[idx % colorChoices.length],
        synthType,
        freq: freqMap[synthType] || 440,
        vol: 0.78,
        pan: 0,
        reverbSend: 0.15,
        mute: false,
        solo: false,
        mixerTrack: idx % mixerStrips.length,
        fx: ['EQ'],
      },
    ]);
    setPatterns((prev) => prev.map((pat) => [...pat, Array(NUM_STEPS).fill(0)]));
    onToast(`Added Synth ${idx + 1} to Channel Rack`, 'info');
  };

  const handleClearPattern = () => {
    setPatterns((prev) =>
      prev.map((pat, pIdx) =>
        pIdx === activePattern ? channels.map(() => Array(NUM_STEPS).fill(0)) : pat,
      ),
    );
    onToast('Cleared active pattern steps', 'info');
  };

  const handleToggleStep = async (chIdx: number, stepIdx: number) => {
    if (activeTool === 'mute') {
      setChannels((prev) =>
        prev.map((c, idx) => (idx === chIdx ? { ...c, mute: !c.mute } : c)),
      );
      return;
    }

    await ensureAudioReady();
    const curVal = patterns[activePattern]?.[chIdx]?.[stepIdx] ?? 0;
    const nextVal = curVal ? 0 : 1;

    setPatterns((prev) =>
      prev.map((pat, pIdx) => {
        if (pIdx !== activePattern) return pat;
        return pat.map((row, rIdx) => {
          if (rIdx !== chIdx) return row;
          const updated = [...row];
          updated[stepIdx] = nextVal;
          return updated;
        });
      }),
    );

    if (nextVal === 1) {
      triggerChannelVoice(chIdx);
    }
  };

  const handleAddClip = () => {
    const picked = PICKER_CLIPS.find((c) => c.id === selectedPickerClipId) || PICKER_CLIPS[0];
    const startBar = Math.min(NUM_BARS - 2, Math.floor(liveRef.current.playheadBarFloat));
    const trackIdx = activePattern % playlistTracks.length;
    setPlaylistClips((prev) => [
      ...prev,
      {
        id: `clip_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
        track: trackIdx,
        startBar,
        lengthBars: 2,
        label: picked.label,
        color: picked.color,
        kind: picked.kind,
      },
    ]);
    onToast(`Placed "${picked.label}" at Bar ${startBar + 1}`, 'info');
  };

  const handleLaneClick = (e: React.MouseEvent<HTMLDivElement>, track: PlaylistTrack) => {
    if (activeTool !== 'paint') return;
    const picked = PICKER_CLIPS.find((c) => c.id === selectedPickerClipId) || PICKER_CLIPS[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const snapBars = Math.max(0.25, snapDivision / 4);
    const rawBar = clickX / PIXELS_PER_BAR;
    const snappedBar = Math.max(
      0,
      Math.min(NUM_BARS - 2, Math.floor(rawBar / snapBars) * snapBars),
    );
    setPlaylistClips((prev) => [
      ...prev,
      {
        id: `clip_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
        track: track.id,
        startBar: snappedBar,
        lengthBars: 2,
        label: picked.label,
        color: picked.color,
        kind: picked.kind,
      },
    ]);
    onToast(`Added "${picked.label}" on ${track.name}`, 'info');
  };

  const triggerPad = async (sampleId: string, padKey: string) => {
    const engine = await ensureAudioReady();
    if (!engine) return;
    engine.playSample(sampleId);
    setActivePadId(padKey);
    window.setTimeout(() => {
      setActivePadId((cur) => (cur === padKey ? null : cur));
    }, 150);
  };

  const playPianoKey = async (midi: number) => {
    const engine = await ensureAudioReady();
    if (!engine) return;
    engine.playSynthNote(midi, synthWave, synthDecay, synthCutoff);
    setActiveMidiNote(midi);
    window.setTimeout(() => {
      setActiveMidiNote((cur) => (cur === midi ? null : cur));
    }, 180);
  };

  // Piano Roll Actions (Pattern-Linked Melodies)
  const openChannelInPianoRoll = (channelId: number) => {
    setPianoRollChannelId(channelId);
    setActiveTab('pianoroll');
  };

  const previewPianoRollNote = useCallback(
    (midi: number, durationSec: number, velocity = 0.88) => {
      const engine = engineRef.current;
      if (!engine) return;
      const ch =
        channels.find((c) => c.id === pianoRollChannelId) ||
        channels[pianoRollChannelId];
      if (!ch) return;

      const strip = mixerStrips[ch.mixerTrack % mixerStrips.length];
      const melodicType =
        ch.synthType === '808' || ch.synthType === 'pluck' || ch.synthType === 'lead'
          ? ch.synthType
          : 'pluck';
      const chosenWave =
        pianoRollWaveform !== 'auto'
          ? pianoRollWaveform
          : ch.synthType === 'lead'
          ? 'sawtooth'
          : 'triangle';

      engine.triggerDawVoice({
        synthType: melodicType,
        freq: midiToFrequency(midi),
        vol: ch.vol * velocity,
        pan: ch.pan,
        sampleName: ch.sampleName ?? null,
        pitchShiftFromHz: ch.sampleName ? 261.63 : undefined,
        stripVol: strip ? strip.vol : 1,
        stripPan: strip ? strip.pan : 0,
        stripMuted: strip ? strip.mute : false,
        durationSec: Math.max(0.12, durationSec),
        waveform: chosenWave,
      });
    },
    [channels, mixerStrips, pianoRollChannelId, pianoRollWaveform],
  );

  const auditionPianoRollKey = useCallback(
    async (midi: number) => {
      await ensureAudioReady();
      previewPianoRollNote(
        midi,
        Math.max(0.22, (60 / Math.max(40, bpm) / 4) * pianoRollBrushDuration),
        0.9,
      );
      setActiveMidiNote(midi);
      window.setTimeout(() => {
        setActiveMidiNote((cur) => (cur === midi ? null : cur));
      }, 180);
    },
    [bpm, ensureAudioReady, pianoRollBrushDuration, previewPianoRollNote],
  );

  const handlePianoRollCellClick = useCallback(
    async (midi: number, step: number) => {
      await ensureAudioReady();
      const curNotes = pianoRollPatterns[activePattern] || [];
      const { nextNotes, added } = toggleOrAddPianoRollNote(
        curNotes,
        pianoRollChannelId,
        midi,
        step,
        pianoRollBrushDuration,
        0.88,
        NUM_STEPS,
      );
      setPianoRollPatterns((prev) => ({
        ...prev,
        [activePattern]: nextNotes,
      }));
      if (added) {
        const created = nextNotes[nextNotes.length - 1];
        setSelectedPrNoteId(created?.id || null);
        const secPerStep = 60 / Math.max(40, bpm) / 4;
        previewPianoRollNote(
          midi,
          Math.max(0.18, secPerStep * pianoRollBrushDuration),
          0.88,
        );
      }
    },
    [
      activePattern,
      bpm,
      ensureAudioReady,
      pianoRollBrushDuration,
      pianoRollChannelId,
      pianoRollPatterns,
      previewPianoRollNote,
    ],
  );

  const handleAdjustNoteDuration = (noteId: string, delta: number) => {
    setPianoRollPatterns((prev) => {
      const list = prev[activePattern] || [];
      return {
        ...prev,
        [activePattern]: list.map((n) => {
          if (n.id !== noteId) return n;
          const maxLen = Math.max(1, NUM_STEPS - n.step);
          const nextDur = Math.max(1, Math.min(maxLen, n.duration + delta));
          return { ...n, duration: nextDur };
        }),
      };
    });
  };

  const handleCycleStepVelocity = (stepIdx: number) => {
    const levels = [0.45, 0.72, 0.9, 1.0];
    setPianoRollPatterns((prev) => {
      const list = prev[activePattern] || [];
      return {
        ...prev,
        [activePattern]: list.map((n) => {
          if (n.channelId !== pianoRollChannelId || n.step !== stepIdx) return n;
          const nextVel =
            levels.find((v) => v > n.velocity + 0.05) ?? levels[0];
          return { ...n, velocity: nextVel };
        }),
      };
    });
  };

  const handleApplyMelodyPreset = async (preset: PianoRollPresetId) => {
    await ensureAudioReady();
    const generated = buildMelodyPresetNotes(preset, pianoRollChannelId);
    setPianoRollPatterns((prev) => {
      const others = (prev[activePattern] || []).filter(
        (n) => n.channelId !== pianoRollChannelId,
      );
      return {
        ...prev,
        [activePattern]: [...others, ...generated],
      };
    });
    const labels: Record<PianoRollPresetId, string> = {
      trap_minor: 'Trap Minor Melody',
      arp_dream: 'Dream Arp Sequence',
      chord_prog: 'Minor Chord Progression',
      bass_808: '808 Bassline Pattern',
    };
    onToast(`Loaded "${labels[preset]}" into ${PATTERN_NAMES[activePattern]}`, 'discovery');
  };

  const handleTransposeChannel = (semitones: number) => {
    setPianoRollPatterns((prev) => ({
      ...prev,
      [activePattern]: transposePianoRollChannel(
        prev[activePattern] || [],
        pianoRollChannelId,
        semitones,
        48,
        72,
      ),
    }));
  };

  const handleClearPianoRollChannel = () => {
    setPianoRollPatterns((prev) => ({
      ...prev,
      [activePattern]: (prev[activePattern] || []).filter(
        (n) => n.channelId !== pianoRollChannelId,
      ),
    }));
    setSelectedPrNoteId(null);
    onToast(`Cleared Piano Roll notes for channel in ${PATTERN_NAMES[activePattern]}`, 'info');
  };

  const handleCopyMelodyToNextPattern = () => {
    const nextPatternIdx = (activePattern + 1) % PATTERN_NAMES.length;
    const sourceNotes = (pianoRollPatterns[activePattern] || []).map((n, idx) => ({
      ...n,
      id: `pr_copy_${nextPatternIdx}_${idx}_${Date.now()}`,
    }));
    setPianoRollPatterns((prev) => ({
      ...prev,
      [nextPatternIdx]: sourceNotes,
    }));
    setActivePattern(nextPatternIdx);
    onToast(`Copied melody to ${PATTERN_NAMES[nextPatternIdx]}`, 'gain');
  };

  const handleStartBoothRecord = async () => {
    const engine = await ensureAudioReady();
    if (!engine) return;
    try {
      await engine.startMicRecording();
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
      setRecordedTakes((prev) => [
        { id: saved.id, name: saved.name, duration: saved.buffer.duration },
        ...prev,
      ]);
      setFolders((prev) =>
        prev.map((f) => {
          if (f.id !== 'samples') return f;
          return {
            ...f,
            open: true,
            items: [
              {
                id: `take_${saved.id}`,
                name: `${saved.name}.wav`,
                synthType: 'pluck',
                pitch: 440,
                sampleId: saved.id,
              },
              ...f.items,
            ],
          };
        }),
      );
      setMicStatus(`Saved "${saved.name}" (${saved.buffer.duration.toFixed(2)}s) to Samples`);
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
    const engine = await ensureAudioReady();
    if (!engine) return;
    setPluginMsg(null);
    try {
      const installed = await engine.pluginRegistry.install(
        {
          id: pluginId.trim(),
          name: pluginName.trim(),
          version: '1.0.0',
          type: pluginType,
          format: 'web-audio-worklet',
          entryPoint: pluginUrl.trim(),
          developer: 'Studio User',
        },
        engine.getAudioContext(),
      );
      setPlugins(engine.pluginRegistry.getInstalledPlugins());
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

  const activePatternRows = patterns[activePattern] || [];
  const whiteKeys = PIANO_KEYS.filter((k) => !k.black);
  const allPatternNotes = pianoRollPatterns[activePattern] || [];
  const activeChannelObj =
    channels.find((c) => c.id === pianoRollChannelId) || channels[0];
  const activeChNotes = allPatternNotes.filter(
    (n) => n.channelId === pianoRollChannelId,
  );
  const ghostNotes = showGhostNotes
    ? allPatternNotes.filter((n) => n.channelId !== pianoRollChannelId)
    : [];
  const allowedScaleClasses = SCALE_PITCH_CLASSES[pianoRollScale];

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-1 sm:p-3"
    >
      <div className="relative w-full max-w-[1440px] h-[95vh] bg-[#2a303a] text-[#e6ecf5] border border-[#4a5363] rounded-lg shadow-2xl flex flex-col overflow-hidden select-none">
        {/* =================================================================
            1. FL-STYLE METALLIC TOOLBAR & TRANSPORT HEADER ("MUSIC PRO 20")
           ================================================================= */}
        <header className="w-full bg-[#363d49] border-b border-[#1c2128] px-2 py-1 flex flex-col gap-1 shrink-0">
          {/* Top Menu & Transport Row + Pinned Right-Hand X Exit */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0 flex flex-wrap items-center justify-between gap-2">
              {/* Left: Menu Strip + Brand + Transport */}
              <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-[#2a303a] border border-[#495262] rounded px-2 py-1">
                <Music className="w-4 h-4 text-orange-400 shrink-0" />
                <div className="leading-none">
                  <div className="text-[11px] font-bold tracking-wider text-white whitespace-nowrap">
                    MUSIC PRO
                  </div>
                  <div className="text-[8px] font-mono-tabular uppercase tracking-widest text-orange-400">
                    STUDIO 20
                  </div>
                </div>
              </div>

              <div className="hidden xl:flex items-center gap-2 text-[10px] font-semibold text-slate-300 px-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('samples')}
                  className="hover:text-white cursor-pointer"
                >
                  FILE
                </button>
                <button
                  type="button"
                  onClick={handleClearPattern}
                  className="hover:text-white cursor-pointer"
                >
                  EDIT
                </button>
                <button
                  type="button"
                  onClick={handleAddChannel}
                  className="hover:text-white cursor-pointer"
                >
                  ADD
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('sequencer')}
                  className="hover:text-white cursor-pointer"
                >
                  PATTERNS
                </button>
                <button
                  type="button"
                  onClick={() => setShowBrowserDrawer((v) => !v)}
                  className="hover:text-white cursor-pointer"
                >
                  VIEW
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('plugins')}
                  className="hover:text-white cursor-pointer"
                >
                  OPTIONS
                </button>
              </div>

              {/* PAT / SONG + Transport Buttons */}
              <div className="flex items-center gap-1 rounded bg-[#232831] border border-[#444d5c] p-0.5">
                <div className="flex flex-col text-[8px] font-bold leading-none">
                  <button
                    type="button"
                    onClick={() => setTransportMode('pat')}
                    className={`px-1.5 py-0.5 rounded-xs cursor-pointer ${
                      transportMode === 'pat'
                        ? 'bg-orange-500 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    PAT
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransportMode('song')}
                    className={`px-1.5 py-0.5 rounded-xs cursor-pointer ${
                      transportMode === 'song'
                        ? 'bg-emerald-500 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    SONG
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleTogglePlay}
                  title="Play / Pause (Space)"
                  className={`flex items-center gap-1 rounded px-2.5 py-1.5 text-[11px] font-bold text-white transition cursor-pointer ${
                    isPlaying
                      ? 'bg-amber-500 hover:bg-amber-400'
                      : 'bg-emerald-600 hover:bg-emerald-500'
                  }`}
                >
                  {isPlaying ? (
                    <Pause className="w-3.5 h-3.5 fill-current" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current" />
                  )}
                  <span className="hidden sm:inline">{isPlaying ? 'PAUSE' : 'PLAY'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleStop}
                  title="Stop & Rewind"
                  className="rounded bg-[#343b48] hover:bg-[#424b5b] p-1.5 text-slate-200 transition cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                </button>

                <button
                  type="button"
                  onClick={handleToggleRecord}
                  title="Arm Record"
                  className={`flex items-center gap-1 rounded px-2 py-1.5 text-[11px] font-bold transition cursor-pointer ${
                    isRecording
                      ? 'bg-rose-600 text-white'
                      : 'bg-[#343b48] hover:bg-rose-950/70 text-rose-400'
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full bg-rose-400 ${
                      isRecording ? 'animate-ping' : ''
                    }`}
                  />
                  <span>REC</span>
                </button>
              </div>

              {/* Tempo + Big Recessed LCD Counter + Mini Waveform Display (matches screenshot) */}
              <div className="flex items-center gap-2 rounded bg-[#181d25] border border-[#475060] px-2 py-0.5 shadow-inner">
                <div className="flex flex-col leading-tight">
                  <span className="text-[8px] uppercase text-slate-400">BPM</span>
                  <input
                    type="number"
                    min={40}
                    max={260}
                    step={0.1}
                    value={bpm}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!Number.isNaN(val) && val >= 40 && val <= 260) {
                        setBpm(val);
                      }
                    }}
                    className="w-14 bg-transparent font-mono-tabular text-xs font-bold text-orange-400 focus:outline-none"
                  />
                </div>
                <div className="h-6 w-px bg-[#303846]" />
                <span
                  ref={timeCounterElRef}
                  className="font-mono-tabular text-base sm:text-lg font-bold tracking-wider text-slate-100"
                >
                  01:01:01
                </span>
                <div className="hidden sm:block w-24 h-7 rounded bg-[#10151d] border border-[#2f3948] overflow-hidden">
                  <canvas ref={miniOscCanvasRef} className="w-full h-full block" />
                </div>
              </div>
            </div>

            {/* Right: Pattern Selector, Tools, Snap, Browser Toggle, Close */}
            <div className="flex flex-wrap items-center gap-1.5">
              <div className="flex items-center gap-1 rounded bg-[#272d37] border border-[#464f5f] px-1.5 py-0.5">
                <select
                  value={activePattern}
                  onChange={(e) => {
                    const idx = parseInt(e.target.value, 10) || 0;
                    setActivePattern(idx);
                    onToast(`Switched to ${PATTERN_NAMES[idx]}`, 'info');
                  }}
                  className="bg-[#1b2028] border border-[#3c4554] rounded px-1.5 py-0.5 text-[11px] font-mono-tabular font-semibold text-white focus:outline-none"
                >
                  {PATTERN_NAMES.map((name, idx) => (
                    <option key={name} value={idx}>
                      {name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleClearPattern}
                  className="rounded bg-[#39414f] hover:bg-rose-600/80 px-1.5 py-0.5 text-[10px] font-bold text-slate-200 cursor-pointer"
                >
                  CLR
                </button>
              </div>

              {/* Editing Tools */}
              <div className="hidden md:flex items-center gap-0.5 rounded bg-[#232831] border border-[#444d5c] p-0.5">
                <button
                  type="button"
                  title="Pencil Step Tool"
                  onClick={() => setActiveTool('draw')}
                  className={`p-1 rounded cursor-pointer ${
                    activeTool === 'draw'
                      ? 'bg-orange-500/25 text-orange-300 border border-orange-400/50'
                      : 'text-slate-300 hover:bg-[#323a47]'
                  }`}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Paint Playlist Clip Tool"
                  onClick={() => {
                    setActiveTool('paint');
                    onToast('Paint Tool active: Click any Playlist lane to place clip', 'info');
                  }}
                  className={`p-1 rounded cursor-pointer ${
                    activeTool === 'paint'
                      ? 'bg-sky-500/25 text-sky-300 border border-sky-400/50'
                      : 'text-slate-300 hover:bg-[#323a47]'
                  }`}
                >
                  <Paintbrush className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Mute Tool"
                  onClick={() => {
                    setActiveTool('mute');
                    onToast('Mute Tool active: Click any step or channel to mute', 'info');
                  }}
                  className={`p-1 rounded cursor-pointer ${
                    activeTool === 'mute'
                      ? 'bg-rose-500/25 text-rose-300 border border-rose-400/50'
                      : 'text-slate-300 hover:bg-[#323a47]'
                  }`}
                >
                  <VolumeX className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Select Tool"
                  onClick={() => setActiveTool('draw')}
                  className="p-1 rounded text-slate-300 hover:bg-[#323a47] cursor-pointer"
                >
                  <MousePointer className="w-3.5 h-3.5" />
                </button>
                <select
                  value={snapDivision}
                  onChange={(e) => setSnapDivision(parseInt(e.target.value, 10) || 2)}
                  className="ml-1 bg-[#1b2028] border border-[#3a4352] rounded px-1 py-0.5 text-[10px] font-mono-tabular text-amber-300 focus:outline-none"
                >
                  <option value={1}>Step</option>
                  <option value={2}>1/2 Beat</option>
                  <option value={4}>Beat</option>
                  <option value={16}>Bar</option>
                </select>
              </div>

              {activeTab === 'sequencer' && (
                <button
                  type="button"
                  onClick={() => setShowBrowserDrawer((v) => !v)}
                  title="Toggle Left File Browser"
                  className={`hidden lg:flex items-center gap-1 rounded border px-2 py-1 text-[11px] font-semibold cursor-pointer whitespace-nowrap ${
                    showBrowserDrawer
                      ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                      : 'bg-[#272d37] border-[#464f5f] text-slate-300 hover:text-white'
                  }`}
                >
                  <PanelLeft className="w-3.5 h-3.5" />
                  <span>Browser</span>
                </button>
              )}

                <span className="hidden sm:inline-block rounded bg-[#1b2028] border border-[#3c4554] px-2 py-1 text-[10px] font-mono-tabular whitespace-nowrap">
                  <span className={audioLive ? 'text-emerald-400' : 'text-amber-400'}>
                    {audioLive ? 'AUDIO: LIVE' : 'AUDIO: READY'}
                  </span>
                </span>
              </div>
            </div>

            {/* Pinned Top-Right X Exit Button (Always Top-Right on Every Tab) */}
            <div className="shrink-0 flex items-center pl-1.5 border-l border-[#292f39]">
              <button
                type="button"
                onClick={onClose}
                aria-label="Exit Music Studio"
                title="Exit Music Studio (Esc)"
                className="w-8 h-8 rounded bg-rose-600/90 hover:bg-rose-500 border border-rose-400/70 text-white shadow-sm flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* ===============================================================
              ALL-TABS ACCESS BAR (Direct 1-Click Access to Every Studio Tab)
             =============================================================== */}
          <nav
            aria-label="Music Pro Tabs"
            className="flex items-center gap-1 overflow-x-auto pt-1 border-t border-[#292f39]"
          >
            {(
              [
                { id: 'sequencer' as const, label: 'Studio DAW (Rack · Playlist · Mixer)', Icon: Layers },
                { id: 'pianoroll' as const, label: 'Piano Roll', Icon: ListMusic },
                { id: 'keyboard' as const, label: 'MIDI Synth & Piano', Icon: Keyboard },
                { id: 'samples' as const, label: `Samples & Import (${samples.length})`, Icon: Upload },
                { id: 'mixing' as const, label: 'Mixing Console', Icon: Sliders },
                { id: 'booth' as const, label: 'Recording Booth', Icon: Mic },
                { id: 'plugins' as const, label: 'Web Plug-ins', Icon: Radio },
              ] as const
            ).map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-semibold transition cursor-pointer whitespace-nowrap shrink-0 border ${
                  activeTab === id
                    ? 'bg-orange-500 border-orange-300 text-white shadow'
                    : 'bg-[#2a303a] border-[#424b5a] text-slate-300 hover:bg-[#3a4250] hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </header>

        {/* Mobile Pane Switcher inside Studio DAW */}
        {activeTab === 'sequencer' && (
          <div className="flex lg:hidden items-center gap-1 bg-[#252b34] border-b border-[#1c2128] px-2 py-1 overflow-x-auto shrink-0">
            {(
              [
                { id: 'all', label: 'All Panes' },
                { id: 'browser', label: 'Browser' },
                { id: 'sequencer', label: 'Channel Rack' },
                { id: 'playlist', label: 'Playlist' },
                { id: 'mixer', label: 'Mixer' },
              ] as const
            ).map((pane) => (
              <button
                key={pane.id}
                type="button"
                onClick={() => setMobilePane(pane.id)}
                className={`shrink-0 rounded border px-2.5 py-0.5 text-[11px] font-semibold cursor-pointer whitespace-nowrap ${
                  mobilePane === pane.id
                    ? 'bg-orange-500 text-white border-orange-400'
                    : 'bg-[#313844] border-[#454f60] text-slate-300'
                }`}
              >
                {pane.label}
              </button>
            ))}
          </div>
        )}

        {/* =================================================================
            TAB 1: FULL FL-STUDIO STYLE WORKSTATION (CHANNEL RACK + PICKER + PLAYLIST + COLORED MIXER)
           ================================================================= */}
        {activeTab === 'sequencer' && (
          <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden bg-[#232831]">
            {/* Collapsible Left Browser Drawer */}
            <aside
              className={`w-full lg:w-60 shrink-0 bg-[#2b313c] border-b lg:border-b-0 lg:border-r border-[#1a1f26] flex-col max-h-60 lg:max-h-none overflow-hidden ${
                mobilePane === 'browser'
                  ? 'flex'
                  : showBrowserDrawer
                  ? 'hidden lg:flex'
                  : 'hidden'
              }`}
            >
              <div className="flex items-center justify-between px-2.5 py-1.5 bg-[#383f4c] border-b border-[#1f242c]">
                <div className="flex items-center gap-1.5">
                  <Folder className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[11px] font-bold uppercase tracking-wide text-slate-100">
                    Browser
                  </span>
                </div>
                <label className="cursor-pointer rounded bg-orange-500/25 hover:bg-orange-500/40 border border-orange-400/50 px-2 py-0.5 text-[10px] font-semibold text-orange-200 whitespace-nowrap">
                  + Import
                  <input
                    type="file"
                    accept=".wav,.mp3,.ogg,.flac,.m4a,.mid,.midi,.js,audio/*"
                    multiple
                    onChange={(e) => {
                      handleImportFiles(e.target.files);
                      e.target.value = '';
                    }}
                    className="hidden"
                  />
                </label>
              </div>

              <div
                onDragEnter={(e) => {
                  e.preventDefault();
                  setIsDropActive(true);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDropActive(true);
                }}
                onDragLeave={() => setIsDropActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDropActive(false);
                  handleImportFiles(e.dataTransfer.files);
                }}
                className={`m-2 rounded border border-dashed px-2 py-1.5 text-center text-[10px] ${
                  isDropActive
                    ? 'border-sky-400 bg-sky-950/40 text-sky-200'
                    : 'border-[#4d5768] bg-[#20252e] text-slate-300'
                }`}
              >
                Drop .WAV / .MP3 / .MID / .JS
              </div>

              <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1 text-xs">
                {folders.map((folder) => (
                  <div
                    key={folder.id}
                    className="rounded bg-[#313844] border border-[#414a59] overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setFolders((prev) =>
                          prev.map((f) =>
                            f.id === folder.id ? { ...f, open: !f.open } : f,
                          ),
                        )
                      }
                      className="w-full flex items-center justify-between px-2 py-1 text-left font-semibold text-slate-100 hover:bg-[#3b4352] cursor-pointer"
                    >
                      <span className="flex items-center gap-1">
                        {folder.open ? (
                          <ChevronDown className="w-3 h-3 text-orange-400" />
                        ) : (
                          <ChevronRight className="w-3 h-3 text-orange-400" />
                        )}
                        <span>{folder.name}</span>
                      </span>
                      <span className="text-[10px] font-mono-tabular text-slate-400">
                        {folder.items.length}
                      </span>
                    </button>
                    {folder.open && (
                      <div className="bg-[#232832] divide-y divide-[#2f3643]">
                        {folder.items.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleBrowserItemClick(item)}
                            className="w-full flex items-center justify-between px-2.5 py-1 text-[11px] text-slate-200 hover:bg-[#313948] cursor-pointer text-left"
                          >
                            <span className="truncate pr-1">{item.name}</span>
                            <span className="text-[9px] font-mono-tabular text-sky-300 shrink-0">
                              {item.plugin ? 'FX' : item.isCustomMidi ? 'MID' : 'WAV'}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </aside>

            {/* MAIN DESKTOP CANVAS: UPPER WINDOWS + BOTTOM FULL MIXER */}
            <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-y-auto lg:overflow-hidden p-1 gap-1">
              {/* UPPER WINDOWS ROW: Channel Rack + Clip Picker + Playlist Arrangement */}
              <div className="flex-1 flex flex-col xl:flex-row min-h-0 lg:overflow-hidden gap-1">
                {/* 1. CHANNEL RACK WINDOW (Matches Screenshot Left Window) */}
                <section
                  className={`w-full xl:w-[41%] flex-col bg-[#2f3540] border border-[#4a5363] rounded overflow-hidden min-h-0 ${
                    mobilePane === 'all' || mobilePane === 'sequencer'
                      ? 'flex'
                      : 'hidden lg:flex'
                  }`}
                >
                  {/* Window Titlebar */}
                  <div className="flex items-center justify-between px-2.5 py-1 bg-[#3a414e] border-b border-[#20252d]">
                    <div className="flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-orange-400" />
                      <span className="text-[11px] font-bold text-slate-100">
                        Channel rack
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleAddChannel}
                        className="rounded bg-[#495262] hover:bg-[#586376] px-2 py-0.5 text-[10px] font-semibold text-white cursor-pointer"
                      >
                        + Channel
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('pianoroll')}
                        className="rounded bg-emerald-500/25 hover:bg-emerald-500/40 border border-emerald-400/50 px-2 py-0.5 text-[10px] font-semibold text-emerald-200 cursor-pointer flex items-center gap-1"
                      >
                        <ListMusic className="w-3 h-3" />
                        <span>Piano Roll</span>
                      </button>
                    </div>
                  </div>

                  {/* Top Channels (Step Sequencer rows) + Embedded Cyan/Blue Visualizer + Bottom Channels */}
                  <div className="flex-1 overflow-y-auto p-1.5 space-y-1 bg-[#292e38]">
                    {channels.slice(0, 4).map((ch, chIdx) => {
                      const rowSteps = activePatternRows[chIdx] || Array(NUM_STEPS).fill(0);
                      const prChannelNotes = (pianoRollPatterns[activePattern] || []).filter(
                        (n) => n.channelId === ch.id,
                      );
                      return (
                        <div
                          key={ch.id}
                          className="flex items-center gap-1.5 bg-[#323845] border border-[#424a59] rounded px-1.5 py-1"
                        >
                          {/* Mute LED + Pan/Vol + Mixer Routing Index + Colored Name Pill + PR button */}
                          <div className="flex items-center gap-1 w-44 sm:w-48 shrink-0">
                            <button
                              type="button"
                              title="Mute Channel"
                              onClick={() =>
                                setChannels((prev) =>
                                  prev.map((c, i) =>
                                    i === chIdx ? { ...c, mute: !c.mute } : c,
                                  ),
                                )
                              }
                              className={`w-2.5 h-2.5 rounded-full shrink-0 cursor-pointer ${
                                ch.mute ? 'bg-slate-600' : 'bg-emerald-400 shadow-[0_0_5px_#4ade80]'
                              }`}
                            />
                            <input
                              type="range"
                              min={0}
                              max={1}
                              step={0.02}
                              value={ch.vol}
                              title={`Vol ${Math.round(ch.vol * 100)}%`}
                              onChange={(e) => {
                                const vol = parseFloat(e.target.value);
                                setChannels((prev) =>
                                  prev.map((c, i) => (i === chIdx ? { ...c, vol } : c)),
                                );
                              }}
                              className="daw-mini-slider w-8 shrink-0"
                            />
                            <span className="w-4 text-center font-mono-tabular text-[9px] text-slate-300 bg-[#212630] border border-[#3e4656] rounded-xs">
                              {ch.mixerTrack + 1}
                            </span>
                            <button
                              type="button"
                              onClick={async () => {
                                await ensureAudioReady();
                                triggerChannelVoice(chIdx);
                              }}
                              style={{ backgroundColor: ch.color }}
                              className="flex-1 truncate px-1.5 py-0.5 rounded-xs border border-white/15 text-[10px] font-bold text-white text-left cursor-pointer hover:brightness-110"
                            >
                              {ch.name}
                            </button>
                            <button
                              type="button"
                              title={`Open ${ch.name} in Piano Roll`}
                              onClick={() => openChannelInPianoRoll(ch.id)}
                              className={`px-1 py-0.5 rounded-xs border text-[8px] font-bold cursor-pointer ${
                                prChannelNotes.length > 0
                                  ? 'bg-emerald-500/25 border-emerald-400/50 text-emerald-300'
                                  : 'bg-[#212630] border-[#3e4656] text-slate-400 hover:text-white'
                              }`}
                            >
                              PR
                            </button>
                          </div>

                          {/* Either Piano Roll Mini-Score Preview or 16 FL-Style Step Sequencer Pads */}
                          {prChannelNotes.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => openChannelInPianoRoll(ch.id)}
                              title={`${prChannelNotes.length} melody notes — Click to edit in Piano Roll`}
                              className="flex-1 h-5 rounded-[2px] bg-[#181f27] border border-emerald-500/40 relative overflow-hidden cursor-pointer hover:border-emerald-300"
                            >
                              {prChannelNotes.map((n) => (
                                <span
                                  key={n.id}
                                  style={{
                                    left: `${(n.step / NUM_STEPS) * 100}%`,
                                    width: `${Math.max(4, (n.duration / NUM_STEPS) * 100)}%`,
                                    bottom: `${Math.max(8, Math.min(82, ((n.midi - 48) / 24) * 76 + 8))}%`,
                                  }}
                                  className="absolute h-[3px] rounded-xs bg-emerald-400 shadow-[0_0_4px_rgba(74,222,128,0.6)]"
                                />
                              ))}
                              {isPlaying && playheadStep >= 0 && (
                                <span
                                  style={{ left: `${(playheadStep / NUM_STEPS) * 100}%` }}
                                  className="absolute top-0 bottom-0 w-0.5 bg-amber-300"
                                />
                              )}
                            </button>
                          ) : (
                            <div className="flex-1 grid grid-cols-8 sm:grid-cols-16 gap-0.5">
                              {rowSteps.map((val, stepIdx) => {
                                const isActive = val === 1;
                                const isBeatGroup = Math.floor(stepIdx / 4) % 2 === 1;
                                const isHead = isPlaying && playheadStep === stepIdx;
                                return (
                                  <button
                                    key={stepIdx}
                                    type="button"
                                    aria-label={`${ch.name} step ${stepIdx + 1}`}
                                    onClick={() => handleToggleStep(chIdx, stepIdx)}
                                    className={`daw-step-pad h-5 rounded-[2px] border cursor-pointer ${
                                      isActive
                                        ? 'active'
                                        : isBeatGroup
                                        ? 'beat-group'
                                        : 'bg-[#485060] border-[#5d6678] hover:border-slate-300'
                                    } ${isHead ? 'step-playhead' : ''}`}
                                  />
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Embedded Cyan / Blue Spectrum & Keyboard Block (Iconic Visual Centerpiece from Screenshot) */}
                    <div className="my-1 rounded border border-[#4a5668] bg-[#071422] p-1 shadow-inner">
                      <div className="relative h-24 sm:h-28 w-full rounded-xs overflow-hidden">
                        <canvas ref={spectrumCanvasRef} className="w-full h-full block" />
                        <div className="pointer-events-none absolute top-1 left-2 text-[9px] font-mono-tabular text-cyan-200/90">
                          WAVE / SPECTRUM ANALYZER
                        </div>
                        <div
                          ref={peakReadoutElRef}
                          className="pointer-events-none absolute top-1 right-2 text-[9px] font-mono-tabular text-cyan-200/90"
                        >
                          -24.0 dB
                        </div>
                      </div>
                    </div>

                    {/* Remaining Channels below the Cyan Analyzer */}
                    {channels.slice(4).map((ch, offsetIdx) => {
                      const chIdx = offsetIdx + 4;
                      const rowSteps = activePatternRows[chIdx] || Array(NUM_STEPS).fill(0);
                      const prChannelNotes = (pianoRollPatterns[activePattern] || []).filter(
                        (n) => n.channelId === ch.id,
                      );
                      return (
                        <div
                          key={ch.id}
                          className="flex items-center gap-1.5 bg-[#323845] border border-[#424a59] rounded px-1.5 py-1"
                        >
                          <div className="flex items-center gap-1 w-44 sm:w-48 shrink-0">
                            <button
                              type="button"
                              title="Mute Channel"
                              onClick={() =>
                                setChannels((prev) =>
                                  prev.map((c, i) =>
                                    i === chIdx ? { ...c, mute: !c.mute } : c,
                                  ),
                                )
                              }
                              className={`w-2.5 h-2.5 rounded-full shrink-0 cursor-pointer ${
                                ch.mute ? 'bg-slate-600' : 'bg-emerald-400 shadow-[0_0_5px_#4ade80]'
                              }`}
                            />
                            <input
                              type="range"
                              min={0}
                              max={1}
                              step={0.02}
                              value={ch.vol}
                              title={`Vol ${Math.round(ch.vol * 100)}%`}
                              onChange={(e) => {
                                const vol = parseFloat(e.target.value);
                                setChannels((prev) =>
                                  prev.map((c, i) => (i === chIdx ? { ...c, vol } : c)),
                                );
                              }}
                              className="daw-mini-slider w-8 shrink-0"
                            />
                            <span className="w-4 text-center font-mono-tabular text-[9px] text-slate-300 bg-[#212630] border border-[#3e4656] rounded-xs">
                              {ch.mixerTrack + 1}
                            </span>
                            <button
                              type="button"
                              onClick={async () => {
                                await ensureAudioReady();
                                triggerChannelVoice(chIdx);
                              }}
                              style={{ backgroundColor: ch.color }}
                              className="flex-1 truncate px-1.5 py-0.5 rounded-xs border border-white/15 text-[10px] font-bold text-white text-left cursor-pointer hover:brightness-110"
                            >
                              {ch.name}
                            </button>
                            <button
                              type="button"
                              title={`Open ${ch.name} in Piano Roll`}
                              onClick={() => openChannelInPianoRoll(ch.id)}
                              className={`px-1 py-0.5 rounded-xs border text-[8px] font-bold cursor-pointer ${
                                prChannelNotes.length > 0
                                  ? 'bg-emerald-500/25 border-emerald-400/50 text-emerald-300'
                                  : 'bg-[#212630] border-[#3e4656] text-slate-400 hover:text-white'
                              }`}
                            >
                              PR
                            </button>
                          </div>

                          {prChannelNotes.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => openChannelInPianoRoll(ch.id)}
                              title={`${prChannelNotes.length} melody notes — Click to edit in Piano Roll`}
                              className="flex-1 h-5 rounded-[2px] bg-[#181f27] border border-emerald-500/40 relative overflow-hidden cursor-pointer hover:border-emerald-300"
                            >
                              {prChannelNotes.map((n) => (
                                <span
                                  key={n.id}
                                  style={{
                                    left: `${(n.step / NUM_STEPS) * 100}%`,
                                    width: `${Math.max(4, (n.duration / NUM_STEPS) * 100)}%`,
                                    bottom: `${Math.max(8, Math.min(82, ((n.midi - 48) / 24) * 76 + 8))}%`,
                                  }}
                                  className="absolute h-[3px] rounded-xs bg-emerald-400 shadow-[0_0_4px_rgba(74,222,128,0.6)]"
                                />
                              ))}
                              {isPlaying && playheadStep >= 0 && (
                                <span
                                  style={{ left: `${(playheadStep / NUM_STEPS) * 100}%` }}
                                  className="absolute top-0 bottom-0 w-0.5 bg-amber-300"
                                />
                              )}
                            </button>
                          ) : (
                            <div className="flex-1 grid grid-cols-8 sm:grid-cols-16 gap-0.5">
                              {rowSteps.map((val, stepIdx) => {
                                const isActive = val === 1;
                                const isBeatGroup = Math.floor(stepIdx / 4) % 2 === 1;
                                const isHead = isPlaying && playheadStep === stepIdx;
                                return (
                                  <button
                                    key={stepIdx}
                                    type="button"
                                    aria-label={`${ch.name} step ${stepIdx + 1}`}
                                    onClick={() => handleToggleStep(chIdx, stepIdx)}
                                    className={`daw-step-pad h-5 rounded-[2px] border cursor-pointer ${
                                      isActive
                                        ? 'active'
                                        : isBeatGroup
                                        ? 'beat-group'
                                        : 'bg-[#485060] border-[#5d6678] hover:border-slate-300'
                                    } ${isHead ? 'step-playhead' : ''}`}
                                  />
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* 2. CLIP PICKER PANEL (Center Strip between Channel Rack & Playlist in Screenshot) */}
                <aside className="hidden lg:flex w-44 shrink-0 flex-col bg-[#2b313c] border border-[#4a5363] rounded overflow-hidden">
                  <div className="flex items-center justify-between px-2 py-1 bg-[#3a414e] border-b border-[#20252d]">
                    <span className="text-[11px] font-bold text-slate-100">Picker</span>
                    <label className="cursor-pointer rounded bg-[#495262] hover:bg-[#586376] px-1.5 py-0.5 text-[9px] font-semibold text-orange-300">
                      + File
                      <input
                        type="file"
                        accept=".wav,.mp3,.ogg,.mid,.midi,.js,audio/*"
                        multiple
                        onChange={(e) => {
                          handleImportFiles(e.target.files);
                          e.target.value = '';
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div className="flex-1 overflow-y-auto p-1.5 space-y-1 bg-[#252a34]">
                    {PICKER_CLIPS.map((clip) => (
                      <button
                        key={clip.id}
                        type="button"
                        onClick={() => {
                          setSelectedPickerClipId(clip.id);
                          setActiveTool('paint');
                          onToast(`Brush: ${clip.label} (Click Playlist lane to place)`, 'info');
                        }}
                        style={{ backgroundColor: clip.color }}
                        className={`w-full px-2 py-1.5 rounded-xs text-left text-[10px] font-bold text-white border transition cursor-pointer truncate ${
                          selectedPickerClipId === clip.id
                            ? 'border-orange-300 ring-1 ring-orange-400 brightness-110'
                            : 'border-white/15 hover:brightness-110'
                        }`}
                      >
                        {clip.label}
                      </button>
                    ))}
                  </div>
                </aside>

                {/* 3. PLAYLIST ARRANGEMENT WINDOW (Matches Screenshot Right Window) */}
                <section
                  className={`flex-1 flex-col bg-[#2b313c] border border-[#4a5363] rounded min-h-[240px] xl:min-h-0 overflow-hidden ${
                    mobilePane === 'all' || mobilePane === 'playlist'
                      ? 'flex'
                      : 'hidden lg:flex'
                  }`}
                >
                  <div className="flex items-center justify-between px-2.5 py-1 bg-[#3a414e] border-b border-[#20252d]">
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-[11px] font-bold text-slate-100">
                        Playlist - Arrangement
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleAddClip}
                        className="rounded bg-emerald-600/30 hover:bg-emerald-600/45 border border-emerald-400/50 px-2 py-0.5 text-[10px] font-semibold text-emerald-200 cursor-pointer whitespace-nowrap"
                      >
                        + Place Clip
                      </button>
                      <span className="text-[10px] font-mono-tabular text-slate-300">
                        BARS 1–16
                      </span>
                    </div>
                  </div>

                  {/* Ruler + Track Lanes */}
                  <div className="flex-1 overflow-auto relative bg-[#262b34]">
                    <div className="min-w-[848px] relative">
                      {/* Bar Ruler */}
                      <div className="sticky top-0 z-20 flex h-5 bg-[#1f242c] border-b border-[#3c4554] pl-28 font-mono-tabular text-[10px] text-slate-300">
                        {Array.from({ length: NUM_BARS }, (_, i) => (
                          <div
                            key={i}
                            style={{ width: `${PIXELS_PER_BAR}px` }}
                            className="shrink-0 border-r border-[#333b49] flex items-center pl-1.5"
                          >
                            {i + 1}
                          </div>
                        ))}
                      </div>

                      {/* Track Rows */}
                      <div className="relative">
                        {playlistTracks.map((track) => (
                          <div
                            key={track.id}
                            className="flex h-10 border-b border-[#333a47] relative"
                          >
                            {/* Left FL-Colored Track Header */}
                            <div
                              style={{ backgroundColor: track.color }}
                              className="sticky left-0 z-10 w-28 shrink-0 border-r border-[#1f242c] px-2 flex items-center justify-between text-[10px] font-bold text-white shadow-sm"
                            >
                              <span className="truncate pr-1">{track.name}</span>
                              <button
                                type="button"
                                title="Mute Track"
                                onClick={() =>
                                  setPlaylistTracks((prev) =>
                                    prev.map((t) =>
                                      t.id === track.id ? { ...t, muted: !t.muted } : t,
                                    ),
                                  )
                                }
                                className={`w-2.5 h-2.5 rounded-full shrink-0 cursor-pointer ${
                                  track.muted
                                    ? 'bg-slate-800 border border-white/30'
                                    : 'bg-emerald-400 shadow-[0_0_4px_#4ade80]'
                                }`}
                              />
                            </div>

                            {/* Arrangement Grid Lane */}
                            <div
                              onClick={(e) => handleLaneClick(e, track)}
                              style={{
                                width: `${NUM_BARS * PIXELS_PER_BAR}px`,
                                backgroundImage: `repeating-linear-gradient(to right, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent ${PIXELS_PER_BAR}px)`,
                              }}
                              className="relative shrink-0 h-full"
                            >
                              {playlistClips
                                .filter((c) => c.track === track.id)
                                .map((clip) => (
                                  <button
                                    key={clip.id}
                                    type="button"
                                    title={`${clip.label} (Click to remove)`}
                                    onClick={(ev) => {
                                      ev.stopPropagation();
                                      setPlaylistClips((prev) =>
                                        prev.filter((item) => item.id !== clip.id),
                                      );
                                      onToast('Removed clip from playlist', 'info');
                                    }}
                                    style={{
                                      left: `${clip.startBar * PIXELS_PER_BAR}px`,
                                      width: `${Math.max(24, clip.lengthBars * PIXELS_PER_BAR - 2)}px`,
                                      backgroundColor: clip.color,
                                    }}
                                    className="daw-playlist-clip flex-col items-stretch justify-between py-0.5"
                                  >
                                    <span className="text-[9px] font-bold leading-none text-left truncate">
                                      {clip.label}
                                    </span>
                                    {/* Mini pattern notes / audio waveform strips inside clip */}
                                    <div className="flex items-center gap-0.5 h-2.5 opacity-80 overflow-hidden">
                                      {Array.from({ length: 12 }, (_, k) => (
                                        <span
                                          key={k}
                                          style={{
                                            height:
                                              clip.kind === 'audio'
                                                ? `${40 + ((k * 37) % 60)}%`
                                                : k % 3 === 0
                                                ? '85%'
                                                : '30%',
                                          }}
                                          className="flex-1 bg-white/70 rounded-xs"
                                        />
                                      ))}
                                    </div>
                                  </button>
                                ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Bright Lime-Green Playhead Line */}
                      <div
                        ref={playheadElRef}
                        style={{ left: '112px' }}
                        className="pointer-events-none absolute top-0 bottom-0 z-30 w-[2px] bg-emerald-400 shadow-[0_0_8px_#4ade80]"
                      >
                        <div className="w-2.5 h-2.5 -ml-[4px] bg-emerald-400 rotate-45 -mt-[4px]" />
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              {/* ===============================================================
                  4. BOTTOM FULL-WIDTH COLOR-CODED MIXER DOCK ("Mixer - Master")
                 =============================================================== */}
              <section
                className={`h-auto lg:h-52 xl:h-56 shrink-0 bg-[#262b34] border border-[#4a5363] rounded flex-col overflow-hidden ${
                  mobilePane === 'all' || mobilePane === 'mixer'
                    ? 'flex'
                    : 'hidden lg:flex'
                }`}
              >
                <div className="flex items-center justify-between px-2.5 py-1 bg-[#3a414e] border-b border-[#20252d]">
                  <div className="flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[11px] font-bold text-slate-100">
                      Mixer - Master
                    </span>
                  </div>
                  <span className="text-[10px] font-mono-tabular text-slate-300">
                    MASTER + 14 COLOR-CODED INSERTS · PEAKS · FX SLOTS
                  </span>
                </div>

                <div className="flex-1 flex overflow-x-auto px-1.5 py-1 gap-1 items-stretch bg-[#1f242c]">
                  {/* LEFTMOST MASTER STRIP (Just like FL Studio Screenshot) */}
                  <div className="shrink-0 w-24 rounded-xs bg-[#2c323d] border border-orange-400/50 px-1.5 py-1 flex flex-col justify-between shadow-md">
                    <div className="text-center">
                      <div className="bg-[#3d4656] rounded-xs py-0.5 text-[10px] font-bold uppercase text-orange-300">
                        Master
                      </div>
                      <div className="mt-1 grid grid-cols-2 gap-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            const next = !compressorOn;
                            setCompressorOn(next);
                            engineRef.current?.setCompressorEnabled(next);
                            onToast(
                              next ? 'Master Limiter ON' : 'Master Limiter Bypassed',
                              'info',
                            );
                          }}
                          className={`rounded-xs py-0.5 text-[8px] font-mono-tabular border cursor-pointer ${
                            compressorOn
                              ? 'bg-[#1a222d] border-emerald-500/50 text-emerald-300'
                              : 'bg-[#1a2028] border-[#333c4a] text-slate-500'
                          }`}
                        >
                          Lim
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const next = !reverbOn;
                            setReverbOn(next);
                            engineRef.current?.setReverbEnabled(next);
                            onToast(
                              next ? 'Master Reverb ON' : 'Master Reverb Bypassed',
                              'info',
                            );
                          }}
                          className={`rounded-xs py-0.5 text-[8px] font-mono-tabular border cursor-pointer ${
                            reverbOn
                              ? 'bg-[#1a222d] border-sky-500/50 text-sky-300'
                              : 'bg-[#1a2028] border-[#333c4a] text-slate-500'
                          }`}
                        >
                          Rev
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-1.5 my-0.5">
                      <div className="flex gap-0.5 h-20 bg-[#12161c] p-0.5 rounded-xs border border-[#3a4252]">
                        <div className="w-2 h-full bg-[#1b222c] relative overflow-hidden flex flex-col justify-end">
                          <div
                            ref={masterMeterLElRef}
                            style={{ height: '18%' }}
                            className="w-full bg-gradient-to-t from-emerald-500 via-lime-400 to-amber-400"
                          />
                        </div>
                        <div className="w-2 h-full bg-[#1b222c] relative overflow-hidden flex flex-col justify-end">
                          <div
                            ref={masterMeterRElRef}
                            style={{ height: '15%' }}
                            className="w-full bg-gradient-to-t from-emerald-500 via-lime-400 to-amber-400"
                          />
                        </div>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={masterVol}
                        title="Master Fader"
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          setMasterVol(v);
                          engineRef.current?.setMasterVolume(v);
                        }}
                        className="daw-mixer-fader"
                      />
                    </div>

                    <div className="text-center font-mono-tabular text-[9px] text-slate-200 bg-[#181c23] rounded-xs py-0.5">
                      {Math.round(masterVol * 100)}% OUT
                    </div>
                  </div>

                  {/* 14 COLOR-CODED MIXER INSERT STRIPS (Indigo / Teal / Olive / Rust) */}
                  <div className="flex gap-1 items-stretch">
                    {mixerStrips.map((strip, idx) => (
                      <div
                        key={strip.index}
                        style={{ backgroundColor: strip.groupColor }}
                        className="shrink-0 w-16 rounded-xs border border-[#444d5d] px-1 py-1 flex flex-col justify-between"
                      >
                        <div className="text-center">
                          <div
                            style={{ backgroundColor: strip.headerColor }}
                            className="rounded-xs px-1 py-0.5 text-[9px] font-bold text-white truncate"
                          >
                            {idx + 1} · {strip.name}
                          </div>
                          <div className="mt-0.5 flex gap-0.5 justify-center">
                            {strip.fxSlots.map((fx) => (
                              <span
                                key={fx}
                                className="rounded-xs bg-[#171b22] px-1 text-[7px] font-mono-tabular text-sky-300"
                              >
                                {fx}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-center gap-1 my-0.5">
                          <div className="w-2 h-[74px] bg-[#12161c] rounded-xs border border-[#3a4352] overflow-hidden flex flex-col justify-end">
                            <div
                              ref={(el) => {
                                mixerMeterElsRef.current[idx] = el;
                              }}
                              style={{ height: '14%' }}
                              className="w-full bg-gradient-to-t from-emerald-500 via-lime-400 to-amber-400"
                            />
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.01}
                            value={strip.vol}
                            title={`${strip.name} Volume`}
                            onChange={(e) => {
                              const vol = parseFloat(e.target.value);
                              setMixerStrips((prev) =>
                                prev.map((s, i) => (i === idx ? { ...s, vol } : s)),
                              );
                            }}
                            className="daw-mixer-fader"
                          />
                        </div>

                        <div className="flex flex-col items-center gap-1">
                          <input
                            type="range"
                            min={-1}
                            max={1}
                            step={0.05}
                            value={strip.pan}
                            title="Pan"
                            onChange={(e) => {
                              const pan = parseFloat(e.target.value);
                              setMixerStrips((prev) =>
                                prev.map((s, i) => (i === idx ? { ...s, pan } : s)),
                              );
                            }}
                            className="daw-mini-slider w-12"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setMixerStrips((prev) =>
                                prev.map((s, i) =>
                                  i === idx ? { ...s, mute: !s.mute } : s,
                                ),
                              )
                            }
                            className={`w-full rounded-xs py-0.5 text-[8px] font-bold cursor-pointer ${
                              strip.mute
                                ? 'bg-rose-600 text-white'
                                : 'bg-[#191e26] text-emerald-400 hover:bg-[#2a313e]'
                            }`}
                          >
                            {strip.mute ? 'MUTED' : 'ACTIVE'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}

        {/* =================================================================
            TAB 2: FL-STYLE PIANO ROLL (PATTERN MELODIES & CHORDS)
           ================================================================= */}
        {activeTab === 'pianoroll' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#1e232c]">
              {/* Piano Roll Control Bar */}
              <div className="bg-[#2e3440] border-b border-[#181c23] px-3 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {/* Pattern Selector */}
                  <div className="flex items-center gap-1.5 bg-[#1e232c] border border-[#424b5a] rounded px-2 py-1">
                    <span className="text-[10px] font-semibold uppercase text-slate-400">
                      Pattern
                    </span>
                    <select
                      value={activePattern}
                      onChange={(e) => {
                        const idx = parseInt(e.target.value, 10) || 0;
                        setActivePattern(idx);
                      }}
                      className="bg-transparent text-orange-300 font-mono-tabular font-bold text-xs focus:outline-none cursor-pointer"
                    >
                      {PATTERN_NAMES.map((name, idx) => (
                        <option key={name} value={idx} className="bg-[#1b2028]">
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Target Channel Instrument Selector */}
                  <div className="flex items-center gap-1.5 bg-[#1e232c] border border-[#424b5a] rounded px-2 py-1">
                    <span
                      style={{ backgroundColor: activeChannelObj?.color || '#456957' }}
                      className="w-2.5 h-2.5 rounded-xs shrink-0"
                    />
                    <span className="text-[10px] font-semibold uppercase text-slate-400">
                      Channel
                    </span>
                    <select
                      value={pianoRollChannelId}
                      onChange={(e) =>
                        setPianoRollChannelId(parseInt(e.target.value, 10) || 0)
                      }
                      className="bg-transparent text-emerald-300 font-bold text-xs focus:outline-none cursor-pointer"
                    >
                      {channels.map((ch) => (
                        <option key={ch.id} value={ch.id} className="bg-[#1b2028]">
                          {ch.name} ({ch.synthType.toUpperCase()})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Synth Tone Override */}
                  <div className="flex items-center gap-1.5 bg-[#1e232c] border border-[#424b5a] rounded px-2 py-1">
                    <span className="text-[10px] font-semibold uppercase text-slate-400">
                      Tone
                    </span>
                    <select
                      value={pianoRollWaveform}
                      onChange={(e) =>
                        setPianoRollWaveform(e.target.value as 'auto' | OscillatorType)
                      }
                      className="bg-transparent text-sky-300 font-semibold text-xs focus:outline-none cursor-pointer"
                    >
                      <option value="auto" className="bg-[#1b2028]">Channel Auto</option>
                      <option value="triangle" className="bg-[#1b2028]">Warm Bell / Pluck</option>
                      <option value="sawtooth" className="bg-[#1b2028]">Supersaw Lead</option>
                      <option value="square" className="bg-[#1b2028]">Retro Square</option>
                      <option value="sine" className="bg-[#1b2028]">Pure Keys / 808</option>
                    </select>
                  </div>

                  {/* Note Length Brush */}
                  <div className="flex items-center gap-1 bg-[#1e232c] border border-[#424b5a] rounded p-0.5">
                    <span className="text-[10px] font-semibold text-slate-400 px-1.5">
                      Length
                    </span>
                    {(
                      [
                        { val: 1 as const, label: '1/16' },
                        { val: 2 as const, label: '1/8' },
                        { val: 4 as const, label: '1/4' },
                        { val: 8 as const, label: '1/2' },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => setPianoRollBrushDuration(opt.val)}
                        className={`px-2 py-0.5 rounded-xs font-mono-tabular text-[10px] font-bold cursor-pointer transition ${
                          pianoRollBrushDuration === opt.val
                            ? 'bg-emerald-500 text-slate-950'
                            : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {/* Scale Highlighting */}
                  <div className="flex items-center gap-1.5 bg-[#1e232c] border border-[#424b5a] rounded px-2 py-1">
                    <span className="text-[10px] font-semibold uppercase text-slate-400">
                      Scale
                    </span>
                    <select
                      value={pianoRollScale}
                      onChange={(e) =>
                        setPianoRollScale(e.target.value as ScaleGuideId)
                      }
                      className="bg-transparent text-amber-300 font-semibold text-xs focus:outline-none cursor-pointer"
                    >
                      <option value="c_minor" className="bg-[#1b2028]">C Minor</option>
                      <option value="pentatonic" className="bg-[#1b2028]">C Minor Pentatonic</option>
                      <option value="a_minor" className="bg-[#1b2028]">A Minor / C Maj</option>
                      <option value="all" className="bg-[#1b2028]">All Chromatic</option>
                    </select>
                  </div>
                </div>

                {/* Right Toolbar: Melody Presets, Transpose, Ghost Notes, Clear */}
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <div className="flex items-center gap-1 bg-[#1e232c] border border-[#424b5a] rounded p-0.5">
                    <span className="text-[10px] text-slate-400 px-1.5">Melodies:</span>
                    {(
                      [
                        { id: 'trap_minor' as const, label: 'Trap' },
                        { id: 'arp_dream' as const, label: 'Arp' },
                        { id: 'chord_prog' as const, label: 'Chords' },
                        { id: 'bass_808' as const, label: '808' },
                      ] as const
                    ).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleApplyMelodyPreset(p.id)}
                        className="px-2 py-0.5 rounded-xs bg-[#2a313d] hover:bg-orange-500 hover:text-white text-slate-200 font-semibold cursor-pointer transition"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-0.5 bg-[#1e232c] border border-[#424b5a] rounded p-0.5">
                    <button
                      type="button"
                      title="Transpose -1 Octave"
                      onClick={() => handleTransposeChannel(-12)}
                      className="px-1.5 py-0.5 rounded-xs hover:bg-[#343c4a] text-slate-200 font-mono-tabular cursor-pointer"
                    >
                      -Oct
                    </button>
                    <button
                      type="button"
                      title="Transpose -1 Semitone"
                      onClick={() => handleTransposeChannel(-1)}
                      className="p-1 rounded-xs hover:bg-[#343c4a] text-slate-200 cursor-pointer"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      title="Transpose +1 Semitone"
                      onClick={() => handleTransposeChannel(1)}
                      className="p-1 rounded-xs hover:bg-[#343c4a] text-slate-200 cursor-pointer"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      title="Transpose +1 Octave"
                      onClick={() => handleTransposeChannel(12)}
                      className="px-1.5 py-0.5 rounded-xs hover:bg-[#343c4a] text-slate-200 font-mono-tabular cursor-pointer"
                    >
                      +Oct
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowGhostNotes((v) => !v)}
                    className={`px-2 py-1 rounded border text-[10px] font-semibold cursor-pointer ${
                      showGhostNotes
                        ? 'bg-sky-500/20 border-sky-400/50 text-sky-200'
                        : 'bg-[#1e232c] border-[#424b5a] text-slate-400'
                    }`}
                  >
                    Ghost Notes
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyMelodyToNextPattern}
                    title="Clone this pattern melody into next pattern slot"
                    className="px-2 py-1 rounded border bg-[#1e232c] hover:bg-[#313948] border-[#424b5a] text-slate-200 text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3 text-emerald-400" />
                    <span>Clone Pat</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleClearPianoRollChannel}
                    title="Clear active channel notes in this pattern"
                    className="px-2 py-1 rounded border bg-rose-950/60 hover:bg-rose-600 border-rose-500/50 text-rose-200 hover:text-white text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                </div>
              </div>

              {/* Main Scrollable Piano Roll Canvas */}
              <div className="flex-1 overflow-auto bg-[#1b2029] relative">
                <div className="min-w-[760px] flex flex-col">
                  {/* Sticky Top Step & Beat Ruler */}
                  <div className="sticky top-0 z-30 flex bg-[#252b35] border-b border-[#3a4252]">
                    <div className="sticky left-0 z-40 w-24 shrink-0 bg-[#252b35] border-r border-[#3a4252] px-2 py-1 flex items-center justify-between text-[10px] font-mono-tabular text-slate-300">
                      <span>PITCH</span>
                      <span className="text-emerald-400">{activeChNotes.length}n</span>
                    </div>
                    <div className="flex-1 grid grid-cols-16 relative">
                      {Array.from({ length: NUM_STEPS }, (_, stepIdx) => {
                        const isBeatStart = stepIdx % 4 === 0;
                        const beatNum = Math.floor(stepIdx / 4) + 1;
                        const isHead = isPlaying && playheadStep === stepIdx;
                        return (
                          <div
                            key={stepIdx}
                            className={`h-6 border-r px-1 flex items-center justify-between font-mono-tabular text-[10px] ${
                              isBeatStart
                                ? 'border-[#4a5568] text-slate-100 font-bold bg-[#2c3340]'
                                : 'border-[#2f3644] text-slate-400'
                            } ${isHead ? 'bg-emerald-500/35 text-emerald-200' : ''}`}
                          >
                            <span>{isBeatStart ? `1.${beatNum}` : stepIdx + 1}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 25 Chromatic Pitch Rows (C5 down to C3) */}
                  <div className="relative">
                    {PIANO_ROLL_PITCHES.map((row) => {
                      const inScale = allowedScaleClasses.has(row.pitchClass);
                      const isOctaveC = row.pitchClass === 0;
                      const isLit = activeMidiNote === row.midi;
                      const rowActiveNotes = activeChNotes.filter(
                        (n) => n.midi === row.midi,
                      );
                      const rowGhostNotes = ghostNotes.filter(
                        (n) => n.midi === row.midi,
                      );

                      return (
                        <div
                          key={row.midi}
                          className={`flex h-6 border-b ${
                            isOctaveC ? 'border-[#475266]' : 'border-[#272d38]'
                          }`}
                        >
                          {/* Sticky Left Vertical Piano Key */}
                          <button
                            type="button"
                            onClick={() => auditionPianoRollKey(row.midi)}
                            className={`sticky left-0 z-20 w-24 shrink-0 border-r border-[#141820] px-2 flex items-center justify-between text-[10px] font-mono-tabular cursor-pointer transition-colors ${
                              isLit
                                ? 'bg-orange-400 text-slate-950 font-bold'
                                : row.black
                                ? 'bg-[#1a1f27] hover:bg-[#2a313e] text-slate-300'
                                : 'bg-[#dce3ec] hover:bg-orange-100 text-slate-900 font-semibold'
                            }`}
                          >
                            <span>{row.label}</span>
                            {inScale && pianoRollScale !== 'all' && (
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  row.black ? 'bg-amber-400/70' : 'bg-emerald-600/80'
                                }`}
                              />
                            )}
                          </button>

                          {/* 16 Step Grid Cells + Note Overlay */}
                          <div className="flex-1 relative">
                            <div className="grid grid-cols-16 h-full">
                              {Array.from({ length: NUM_STEPS }, (_, stepIdx) => {
                                const isBeatGroup = Math.floor(stepIdx / 4) % 2 === 1;
                                const isHead = isPlaying && playheadStep === stepIdx;
                                return (
                                  <button
                                    key={stepIdx}
                                    type="button"
                                    aria-label={`Place ${row.label} at step ${stepIdx + 1}`}
                                    onClick={() =>
                                      handlePianoRollCellClick(row.midi, stepIdx)
                                    }
                                    className={`h-full border-r cursor-crosshair transition-colors ${
                                      stepIdx % 4 === 3
                                        ? 'border-[#3f4859]'
                                        : 'border-[#272d38]'
                                    } ${
                                      isHead
                                        ? 'bg-emerald-500/20'
                                        : row.black
                                        ? isBeatGroup
                                          ? 'bg-[#181c24] hover:bg-[#2a3342]'
                                          : 'bg-[#1c212a] hover:bg-[#2a3342]'
                                        : inScale && pianoRollScale !== 'all'
                                        ? isBeatGroup
                                          ? 'bg-[#242c38] hover:bg-[#323e4f]'
                                          : 'bg-[#293240] hover:bg-[#323e4f]'
                                        : isBeatGroup
                                        ? 'bg-[#1f2530] hover:bg-[#2e3847]'
                                        : 'bg-[#222834] hover:bg-[#2e3847]'
                                    }`}
                                  />
                                );
                              })}
                            </div>

                            {/* Ghost Notes from other channels in the same pattern */}
                            {rowGhostNotes.map((g) => (
                              <div
                                key={g.id}
                                style={{
                                  left: `${(g.step / NUM_STEPS) * 100}%`,
                                  width: `${(g.duration / NUM_STEPS) * 100}%`,
                                }}
                                className="pointer-events-none absolute top-0.5 bottom-0.5 rounded-xs bg-slate-400/20 border border-slate-300/25 px-1 flex items-center text-[8px] font-mono-tabular text-slate-300/60 overflow-hidden"
                              >
                                {midiToNoteName(g.midi)}
                              </div>
                            ))}

                            {/* Active Channel Notes */}
                            {rowActiveNotes.map((note) => {
                              const isSelected = selectedPrNoteId === note.id;
                              return (
                                <div
                                  key={note.id}
                                  style={{
                                    left: `${(note.step / NUM_STEPS) * 100}%`,
                                    width: `${(note.duration / NUM_STEPS) * 100}%`,
                                  }}
                                  className={`absolute top-0.5 bottom-0.5 z-10 rounded-xs border flex items-center justify-between px-1 shadow-sm ${
                                    isSelected
                                      ? 'bg-emerald-300 border-white text-slate-950 ring-1 ring-amber-300'
                                      : 'bg-emerald-400/95 hover:bg-emerald-300 border-emerald-100/80 text-slate-950'
                                  }`}
                                >
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handlePianoRollCellClick(note.midi, note.step)
                                    }
                                    title={`${midiToNoteName(note.midi)} · Step ${note.step + 1} · Len ${note.duration} (Click to remove)`}
                                    className="flex-1 h-full text-left text-[9px] font-mono-tabular font-bold truncate cursor-pointer"
                                  >
                                    {midiToNoteName(note.midi)}
                                  </button>
                                  <div className="flex items-center gap-0.5 shrink-0">
                                    <button
                                      type="button"
                                      title="Shorten note (-1 step)"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleAdjustNoteDuration(note.id, -1);
                                      }}
                                      className="w-3.5 h-3.5 rounded-xs bg-slate-900/25 hover:bg-slate-900/50 text-[9px] font-bold leading-none flex items-center justify-center cursor-pointer"
                                    >
                                      -
                                    </button>
                                    <button
                                      type="button"
                                      title="Extend note (+1 step)"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleAdjustNoteDuration(note.id, 1);
                                      }}
                                      className="w-3.5 h-3.5 rounded-xs bg-slate-900/25 hover:bg-slate-900/50 text-[9px] font-bold leading-none flex items-center justify-center cursor-pointer"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                    {/* Live Vertical Playhead Line across Piano Roll */}
                    {isPlaying && playheadStep >= 0 && (
                      <div
                        style={{
                          left: `calc(6rem + ((100% - 6rem) * ${playheadStep / NUM_STEPS}))`,
                        }}
                        className="pointer-events-none absolute top-0 bottom-0 z-20 w-[2px] bg-emerald-400 shadow-[0_0_8px_#4ade80]"
                      />
                    )}
                  </div>

                  {/* Velocity Lane (Aligned 1:1 with the 16 Steps) */}
                  <div className="sticky bottom-0 z-20 flex h-14 bg-[#222832] border-t border-[#3a4252]">
                    <div className="sticky left-0 z-30 w-24 shrink-0 bg-[#222832] border-r border-[#3a4252] px-2 flex flex-col justify-center text-[9px] font-mono-tabular text-slate-300">
                      <span className="font-bold text-slate-100">VELOCITY</span>
                      <span className="text-slate-400">Click bar</span>
                    </div>
                    <div className="flex-1 grid grid-cols-16">
                      {Array.from({ length: NUM_STEPS }, (_, stepIdx) => {
                        const notesAtStep = activeChNotes.filter(
                          (n) => n.step === stepIdx,
                        );
                        const avgVel =
                          notesAtStep.length > 0
                            ? notesAtStep.reduce((sum, n) => sum + n.velocity, 0) /
                              notesAtStep.length
                            : 0;
                        return (
                          <button
                            key={stepIdx}
                            type="button"
                            onClick={() => handleCycleStepVelocity(stepIdx)}
                            title={
                              notesAtStep.length > 0
                                ? `Step ${stepIdx + 1} Velocity: ${Math.round(avgVel * 100)}% (Click to cycle)`
                                : `Step ${stepIdx + 1}`
                            }
                            className="h-full border-r border-[#2d3544] px-1.5 py-1 flex items-end justify-center cursor-pointer hover:bg-[#2b3341]"
                          >
                            {avgVel > 0 && (
                              <div
                                style={{ height: `${Math.round(avgVel * 100)}%` }}
                                className="w-full max-w-[14px] rounded-t-xs bg-gradient-to-t from-emerald-600 to-emerald-300"
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Piano Roll Footer Tip & Playlist Sync Action */}
              <div className="bg-[#2a303a] border-t border-[#181c23] px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] shrink-0">
                <span className="text-slate-300">
                  Click any grid cell to place or remove notes · Use{' '}
                  <strong className="text-emerald-300">- / +</strong> on notes to resize length · Press{' '}
                  <strong className="text-orange-300">Space</strong> to hear melody with your pattern drums.
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddClip}
                    className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold cursor-pointer"
                  >
                    + Send Pattern to Playlist
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('sequencer')}
                    className="px-2.5 py-1 rounded bg-[#39414f] hover:bg-[#495365] text-slate-100 text-[10px] font-bold cursor-pointer"
                  >
                    Back to Channel Rack
                  </button>
                </div>
              </div>
            </div>
        )}

        {/* =================================================================
            TAB 3: MIDI SYNTH & PIANO KEYBOARD
           ================================================================= */}
        {activeTab === 'keyboard' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-[#232831]">
            <div className="flex flex-wrap items-center justify-between gap-4 bg-[#2f3540] border border-[#4a5363] p-4 rounded-lg">
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <label className="flex items-center gap-2">
                  <span className="text-slate-300">Waveform</span>
                  <select
                    value={synthWave}
                    onChange={(e) => setSynthWave(e.target.value as OscillatorType)}
                    className="bg-[#1b2028] border border-[#464f5f] rounded px-2.5 py-1.5 text-orange-400 font-medium"
                  >
                    <option value="sawtooth">Analog Saw</option>
                    <option value="triangle">Warm Triangle</option>
                    <option value="square">Retro Square</option>
                    <option value="sine">Pure Sine</option>
                  </select>
                </label>

                <label className="flex items-center gap-2">
                  <span className="text-slate-300">Filter</span>
                  <input
                    type="range"
                    min={350}
                    max={12000}
                    step={50}
                    value={synthCutoff}
                    onChange={(e) => setSynthCutoff(Number(e.target.value))}
                    className="w-28 accent-sky-400"
                  />
                  <span className="font-mono-tabular text-sky-300">{synthCutoff} Hz</span>
                </label>

                <label className="flex items-center gap-2">
                  <span className="text-slate-300">Release</span>
                  <input
                    type="range"
                    min={0.18}
                    max={1.2}
                    step={0.04}
                    value={synthDecay}
                    onChange={(e) => setSynthDecay(Number(e.target.value))}
                    className="w-24 accent-orange-400"
                  />
                  <span className="font-mono-tabular text-orange-300">
                    {synthDecay.toFixed(2)}s
                  </span>
                </label>
              </div>
              <span className="text-[11px] text-slate-300">
                Play with mouse or keys A–L (white) &amp; W/E/T/Y/U/O (black)
              </span>
            </div>

            <div className="bg-[#2f3540] border border-[#4a5363] p-4 rounded-lg space-y-3 overflow-x-auto">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-100">
                  49-Key Studio MIDI Controller (C3 – B4)
                </h3>
                {activeMidiNote !== null && (
                  <span className="text-xs font-mono-tabular text-emerald-400">
                    Playing MIDI #{activeMidiNote}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-14 gap-1 min-w-[680px]">
                {whiteKeys.map((k) => {
                  const isLit = activeMidiNote === k.midi;
                  return (
                    <button
                      key={k.midi}
                      type="button"
                      onClick={() => playPianoKey(k.midi)}
                      className={`h-36 rounded-b-md border flex flex-col justify-end items-center pb-2 transition-colors cursor-pointer ${
                        isLit
                          ? 'bg-orange-400 border-orange-300 text-slate-950'
                          : 'bg-slate-100 hover:bg-orange-100 border-slate-400 text-slate-900'
                      }`}
                    >
                      {k.hotkey && (
                        <span className="text-[10px] font-mono-tabular text-slate-500">
                          {k.hotkey}
                        </span>
                      )}
                      <span className="text-[11px] font-bold">{k.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-slate-300 mr-2">Accidentals:</span>
                {PIANO_KEYS.filter((k) => k.black).map((k) => {
                  const isLit = activeMidiNote === k.midi;
                  return (
                    <button
                      key={k.midi}
                      type="button"
                      onClick={() => playPianoKey(k.midi)}
                      className={`px-2.5 py-2 rounded border text-[11px] font-mono-tabular font-bold transition-colors cursor-pointer ${
                        isLit
                          ? 'bg-orange-500 border-orange-300 text-white'
                          : 'bg-[#1b2028] hover:bg-[#3a4250] border-[#464f5f] text-slate-200'
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

        {/* =================================================================
            TAB 3: SAMPLES, DRUM PADS & STUDIO FILE IMPORT (.WAV/.MP3/.MID/.JS)
           ================================================================= */}
        {activeTab === 'samples' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-[#232831]">
            <div className="bg-[#2f3540] border border-[#4a5363] p-5 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-orange-500/20 border border-orange-400/40 flex items-center justify-center text-orange-300 shrink-0">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">
                    Import WAV/MP3 Samples, Drum Kits, MIDI Loops &amp; JS Worklets
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Imported audio files decode into Web Audio buffers and auto-add to your Channel Rack.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <select
                  value={importCategory}
                  onChange={(e) =>
                    setImportCategory(e.target.value as StudioSample['category'])
                  }
                  className="bg-[#1b2028] border border-[#464f5f] rounded px-3 py-2 text-xs text-slate-100"
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

                <label className="cursor-pointer bg-orange-500 hover:bg-orange-400 text-white px-4 py-2 rounded font-bold text-xs transition-colors flex items-center gap-1.5">
                  <Plus className="w-4 h-4" />
                  <span>Import Studio Files...</span>
                  <input
                    type="file"
                    accept="audio/*,.wav,.mp3,.ogg,.m4a,.flac,.mid,.midi,.js"
                    multiple
                    onChange={(e) => {
                      handleImportFiles(e.target.files, importCategory);
                      e.target.value = '';
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {importedMidi && (
              <div className="bg-[#2f3540] border border-orange-400/50 px-4 py-3 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-bold text-orange-300">
                    MIDI Loaded: {importedMidi.name}
                  </span>
                  <span className="text-slate-300 ml-2 font-mono-tabular">
                    {importedMidi.tracks.length} tracks · {importedMidi.totalNotes} notes ·{' '}
                    {importedMidi.bpm} BPM
                  </span>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const eng = await ensureAudioReady();
                    const count = eng?.playMidiSequence(importedMidi, synthWave, synthCutoff) || 0;
                    onToast(
                      count > 0
                        ? `Playing ${count} MIDI notes from "${importedMidi.name}"`
                        : 'No playable notes in MIDI sequence',
                      'info',
                    );
                  }}
                  className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Play MIDI Synth</span>
                </button>
              </div>
            )}

            {/* 4x4 Drum Machine Live Pads */}
            <div className="bg-[#2f3540] border border-[#4a5363] p-4 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Disc className="w-4 h-4 text-orange-400" />
                  <span>Drum Machine Live Trigger Pads</span>
                </h3>
                <span className="text-[11px] text-slate-300">Tap any pad to audition live</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                {padSlots.slice(0, 8).map((pad) => {
                  const lit = activePadId === `pad_${pad.padIndex}`;
                  return (
                    <button
                      key={pad.padIndex}
                      type="button"
                      onClick={() => triggerPad(pad.sampleId, `pad_${pad.padIndex}`)}
                      className={`p-3 rounded border text-left transition-all cursor-pointer ${
                        lit
                          ? 'bg-orange-500 border-orange-300 text-white scale-95'
                          : 'bg-[#1f242c] hover:bg-[#38404e] border-[#464f5f] text-slate-200'
                      }`}
                    >
                      <div className="text-[10px] font-mono-tabular uppercase opacity-75">
                        {pad.category}
                      </div>
                      <div className="text-xs font-bold truncate mt-0.5">{pad.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Loaded Samples Library */}
            <div className="space-y-2.5">
              <h3 className="text-sm font-bold text-slate-200">
                Studio Sample Library ({samples.length} loaded)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {samples.map((s) => (
                  <div
                    key={s.id}
                    className="bg-[#2f3540] border border-[#4a5363] p-3.5 rounded-lg flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-100 truncate">{s.name}</p>
                      <div className="text-[10px] font-mono-tabular text-sky-300 uppercase mt-0.5">
                        {s.category} · {s.duration.toFixed(2)}s{' '}
                        {s.builtIn ? '· Built-in' : '· Custom'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => triggerPad(s.id, `lib_${s.id}`)}
                      className="px-3 py-1.5 bg-orange-500/20 border border-orange-400/40 text-orange-300 hover:bg-orange-500 hover:text-white rounded text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer"
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

        {/* =================================================================
            TAB 4: EXPANDED MIXING CONSOLE & MASTER BUS
           ================================================================= */}
        {activeTab === 'mixing' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-[#232831]">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {channels.map((ch, idx) => (
                <div
                  key={ch.id}
                  className="bg-[#2f3540] border border-[#4a5363] p-3.5 rounded-lg space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      style={{ backgroundColor: ch.color }}
                      className="px-2 py-0.5 rounded text-xs font-bold text-white truncate"
                    >
                      {ch.name}
                    </span>
                    <span className="text-[10px] font-mono-tabular text-slate-300">
                      INS {ch.mixerTrack + 1} · {Math.round(ch.vol * 100)}%
                    </span>
                  </div>

                  <div className="space-y-2 text-[11px]">
                    <label className="block space-y-1">
                      <span className="text-slate-300">Channel Fader</span>
                      <input
                        type="range"
                        min={0}
                        max={1.2}
                        step={0.02}
                        value={ch.vol}
                        onChange={(e) => {
                          const vol = Number(e.target.value);
                          setChannels((prev) =>
                            prev.map((c, i) => (i === idx ? { ...c, vol } : c)),
                          );
                        }}
                        className="w-full accent-orange-400"
                      />
                    </label>

                    <label className="block space-y-1">
                      <span className="text-slate-300 flex justify-between">
                        <span>Pan</span>
                        <span className="font-mono-tabular text-sky-300">
                          {ch.pan === 0
                            ? 'C'
                            : ch.pan < 0
                            ? `L${Math.round(-ch.pan * 100)}`
                            : `R${Math.round(ch.pan * 100)}`}
                        </span>
                      </span>
                      <input
                        type="range"
                        min={-1}
                        max={1}
                        step={0.05}
                        value={ch.pan}
                        onChange={(e) => {
                          const pan = Number(e.target.value);
                          setChannels((prev) =>
                            prev.map((c, i) => (i === idx ? { ...c, pan } : c)),
                          );
                        }}
                        className="w-full accent-sky-400"
                      />
                    </label>
                  </div>

                  <div className="flex gap-1.5 text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() =>
                        setChannels((prev) =>
                          prev.map((c, i) =>
                            i === idx ? { ...c, mute: !c.mute } : c,
                          ),
                        )
                      }
                      className={`flex-1 py-1.5 rounded cursor-pointer ${
                        ch.mute
                          ? 'bg-rose-600 text-white'
                          : 'bg-[#1b2028] text-slate-300'
                      }`}
                    >
                      MUTE
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setChannels((prev) =>
                          prev.map((c, i) =>
                            i === idx ? { ...c, solo: !c.solo } : c,
                          ),
                        )
                      }
                      className={`flex-1 py-1.5 rounded cursor-pointer ${
                        ch.solo
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-[#1b2028] text-slate-300'
                      }`}
                    >
                      SOLO
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-[#2f3540] border border-[#4a5363] p-5 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-3">
                <div className="flex justify-between text-xs text-slate-200 font-medium">
                  <span className="flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4 text-orange-400" />
                    <span>Master Bus Output Gain</span>
                  </span>
                  <span className="font-mono-tabular text-orange-300">
                    {Math.round(masterVol * 100)}%
                  </span>
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
                  className="w-full accent-orange-400 cursor-pointer"
                />

                <div className="flex justify-between text-xs text-slate-200 font-medium pt-1">
                  <span>Master Low-Pass EQ</span>
                  <span className="font-mono-tabular text-sky-300">{masterCutoff} Hz</span>
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
                  className="w-full accent-sky-400 cursor-pointer"
                />
              </div>

              <div className="bg-[#1f242c] border border-[#3e4656] p-4 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                    <Headphones className="w-4 h-4 text-orange-400" />
                    <span>Master Limiter &amp; Studio Convolver</span>
                  </div>
                  <span className="text-[10px] font-mono-tabular text-emerald-400">
                    ROUTED
                  </span>
                </div>
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      const next = !compressorOn;
                      setCompressorOn(next);
                      engineRef.current?.setCompressorEnabled(next);
                    }}
                    className={`flex-1 py-2 rounded font-bold cursor-pointer ${
                      compressorOn
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#2a303a] text-slate-300'
                    }`}
                  >
                    Limiter: {compressorOn ? 'ON' : 'OFF'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !reverbOn;
                      setReverbOn(next);
                      engineRef.current?.setReverbEnabled(next);
                    }}
                    className={`flex-1 py-2 rounded font-bold cursor-pointer ${
                      reverbOn ? 'bg-sky-600 text-white' : 'bg-[#2a303a] text-slate-300'
                    }`}
                  >
                    Reverb: {reverbOn ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================
            TAB 5: ISOLATED RECORDING BOOTH
           ================================================================= */}
        {activeTab === 'booth' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-[#232831]">
            <div className="bg-[#2f3540] border border-[#4a5363] p-5 rounded-lg space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-lg flex items-center justify-center border ${
                      isRecordingMic
                        ? 'bg-rose-600/25 border-rose-500 text-rose-400'
                        : 'bg-orange-500/20 border-orange-400/50 text-orange-300'
                    }`}
                  >
                    <Mic className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                      Isolated Vocal &amp; Acoustic Recording Booth
                      {isRecordingMic && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-rose-600 text-white font-mono-tabular uppercase">
                          ON AIR
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-300">{micStatus}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  value={takeName}
                  onChange={(e) => setTakeName(e.target.value)}
                  placeholder="Recording take name..."
                  className="flex-1 min-w-[200px] bg-[#1b2028] border border-[#464f5f] rounded px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-orange-400"
                />
                {!isRecordingMic ? (
                  <button
                    type="button"
                    onClick={handleStartBoothRecord}
                    className="px-4 py-2 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer"
                  >
                    <Mic className="w-4 h-4" />
                    <span>Arm &amp; Record Mic</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStopBoothRecord}
                    className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Stop &amp; Save Take</span>
                  </button>
                )}
              </div>
            </div>

            <div className="bg-[#2f3540] border border-[#4a5363] p-4 rounded-lg space-y-2.5">
              <h4 className="text-sm font-bold text-slate-100">
                Recorded Booth Takes ({recordedTakes.length})
              </h4>
              {recordedTakes.length === 0 ? (
                <p className="text-xs text-slate-300">
                  No microphone takes recorded yet. Recorded takes save directly into your Samples library &amp; DAW Browser.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {recordedTakes.map((take) => (
                    <div
                      key={take.id}
                      className="bg-[#1f242c] border border-[#3e4656] p-3 rounded flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-100">{take.name}</div>
                        <div className="text-[10px] font-mono-tabular text-orange-400">
                          {take.duration.toFixed(2)}s
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          const eng = await ensureAudioReady();
                          eng?.playSample(take.id);
                        }}
                        className="px-3 py-1.5 rounded bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Play</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* =================================================================
            TAB 6: WEB AUDIO DSP & AUDIOWORKLET PLUG-INS
           ================================================================= */}
        {activeTab === 'plugins' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-[#232831]">
            <div className="bg-[#2f3540] border border-[#4a5363] p-5 rounded-lg space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-100">
                  Web Audio DSP Rack &amp; AudioWorklet Plug-ins
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  Toggle built-in master DSP effects or register custom{' '}
                  <code className="text-sky-300 font-mono-tabular">.js</code> AudioWorklet
                  modules.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    const next = !compressorOn;
                    setCompressorOn(next);
                    engineRef.current?.setCompressorEnabled(next);
                  }}
                  className={`p-3.5 rounded border text-left transition-colors cursor-pointer ${
                    compressorOn
                      ? 'bg-emerald-950/50 border-emerald-500/60 text-emerald-200'
                      : 'bg-[#1f242c] border-[#3e4656] text-slate-400'
                  }`}
                >
                  <div className="font-bold">Bus Dynamics Compressor</div>
                  <div className="text-[10px] font-mono-tabular mt-1">
                    {compressorOn ? 'ACTIVE (4:1)' : 'BYPASSED'}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const next = !reverbOn;
                    setReverbOn(next);
                    engineRef.current?.setReverbEnabled(next);
                  }}
                  className={`p-3.5 rounded border text-left transition-colors cursor-pointer ${
                    reverbOn
                      ? 'bg-emerald-950/50 border-emerald-500/60 text-emerald-200'
                      : 'bg-[#1f242c] border-[#3e4656] text-slate-400'
                  }`}
                >
                  <div className="font-bold">Studio Convolver Reverb</div>
                  <div className="text-[10px] font-mono-tabular mt-1">
                    {reverbOn ? 'ACTIVE (1.4s Room)' : 'BYPASSED'}
                  </div>
                </button>

                <div className="p-3.5 rounded border bg-[#1f242c] border-[#3e4656] text-slate-200 space-y-2">
                  <div className="flex justify-between font-bold">
                    <span>Master Low-Pass EQ</span>
                    <span className="font-mono-tabular text-sky-300">{masterCutoff} Hz</span>
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
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <form
              onSubmit={handleInstallWorkletPlugin}
              className="bg-[#2f3540] border border-[#4a5363] p-5 rounded-lg space-y-3"
            >
              <h4 className="text-sm font-bold text-slate-100">
                Register Custom Web AudioWorklet Plug-in
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
                <input
                  type="text"
                  value={pluginId}
                  onChange={(e) => setPluginId(e.target.value)}
                  placeholder="Plug-in ID"
                  className="bg-[#1b2028] border border-[#464f5f] rounded px-3 py-2 text-slate-100"
                />
                <input
                  type="text"
                  value={pluginName}
                  onChange={(e) => setPluginName(e.target.value)}
                  placeholder="Plug-in Name"
                  className="bg-[#1b2028] border border-[#464f5f] rounded px-3 py-2 text-slate-100"
                />
                <select
                  value={pluginType}
                  onChange={(e) => setPluginType(e.target.value as WebPluginType)}
                  className="bg-[#1b2028] border border-[#464f5f] rounded px-3 py-2 text-slate-100"
                >
                  <option value="effect">DSP Effect</option>
                  <option value="instrument">Synth Instrument</option>
                </select>
                <input
                  type="url"
                  value={pluginUrl}
                  onChange={(e) => setPluginUrl(e.target.value)}
                  placeholder="https://.../worklet.js"
                  className="bg-[#1b2028] border border-[#464f5f] rounded px-3 py-2 text-slate-100"
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded bg-orange-500 hover:bg-orange-400 text-white font-bold text-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Load AudioWorklet Module</span>
                  </button>
                  <label className="cursor-pointer px-4 py-2 rounded bg-[#3b4352] hover:bg-[#495365] text-slate-100 font-bold text-xs flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-orange-400" />
                    <span>Import Local .JS Processor</span>
                    <input
                      type="file"
                      accept=".js,.mjs"
                      multiple
                      onChange={(e) => {
                        handleImportFiles(e.target.files);
                        e.target.value = '';
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
                {pluginMsg && <span className="text-xs text-sky-300">{pluginMsg}</span>}
              </div>

              {(plugins.length > 0 || customProcessors.length > 0) && (
                <div className="pt-2 space-y-2">
                  {plugins.map((p) => (
                    <div
                      key={p.manifest.id}
                      className="bg-[#1f242c] border border-[#3e4656] px-3 py-2 rounded flex items-center justify-between text-xs"
                    >
                      <span className="text-slate-100 font-medium">
                        {p.manifest.name} ({p.manifest.format})
                      </span>
                      <span className="text-emerald-400 font-mono-tabular">
                        {p.enabled ? 'ENABLED' : 'BYPASSED'}
                      </span>
                    </div>
                  ))}
                  {customProcessors.map((cp) => (
                    <div
                      key={cp.name}
                      className="bg-[#1f242c] border border-[#3e4656] px-3 py-2 rounded flex items-center justify-between text-xs"
                    >
                      <span className="text-slate-100 font-medium">
                        {cp.name} (Local JS AudioWorklet)
                      </span>
                      <span className="text-emerald-400 font-mono-tabular">LOADED</span>
                    </div>
                  ))}
                </div>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
