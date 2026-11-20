/* =========================================================
   FEATURES 173–175 & SHELTER / WEB PLUGIN ARCHITECTURE
   VILLAGES, PLAYER HOMES, REAL AUDIO STUDIO & PLUG-INS
   ========================================================= */

/* ---------------- VILLAGES & TRADING ---------------- */

export type ItemStack = {
  itemId: string;
  quantity: number;
};

export type TradeOffer = {
  itemId: string;
  itemName: string;
  price: number;
  stock: number;
};

export type Village = {
  id: string;
  name: string;
  discovered: boolean;
  reputation: number;
  population: number;
  specialty: string;
  merchants: TradeOffer[];
};

export type PlayerEconomy = {
  coins: number;
  inventory: ItemStack[];
};

export const islandVillages: Village[] = [
  {
    id: "coastal-village",
    name: "Palm Harbor",
    discovered: false,
    reputation: 0,
    population: 18,
    specialty: "Fishing",
    merchants: [
      { itemId: "fish", itemName: "Fresh Fish", price: 15, stock: 30 },
      { itemId: "wood", itemName: "Wood Bundle", price: 25, stock: 20 },
      { itemId: "rope", itemName: "Rope", price: 18, stock: 12 }
    ]
  },
  {
    id: "forest-village",
    name: "Greenwood",
    discovered: false,
    reputation: 0,
    population: 24,
    specialty: "Woodworking",
    merchants: [
      { itemId: "planks", itemName: "Wooden Planks", price: 30, stock: 25 },
      { itemId: "stone", itemName: "Stone", price: 12, stock: 40 },
      { itemId: "tools", itemName: "Tool Set", price: 85, stock: 5 }
    ]
  }
];

export function discoverVillage(villageId: string) {
  const village = islandVillages.find(v => v.id === villageId);
  if (!village) return false;

  village.discovered = true;
  return true;
}

export function tradeWithMerchant(
  villageId: string,
  itemId: string,
  quantity: number,
  player: PlayerEconomy
) {
  const village = islandVillages.find(v => v.id === villageId);
  const offer = village?.merchants.find(m => m.itemId === itemId);

  if (!village?.discovered) {
    return { success: false, message: "Discover this village first." };
  }

  if (!offer || quantity <= 0 || !Number.isInteger(quantity)) {
    return { success: false, message: "Invalid trade." };
  }

  const totalCost = offer.price * quantity;

  if (offer.stock < quantity) {
    return { success: false, message: "The merchant does not have enough stock." };
  }

  if (player.coins < totalCost) {
    return { success: false, message: "You need more coins." };
  }

  player.coins -= totalCost;
  offer.stock -= quantity;

  const existing = player.inventory.find(i => i.itemId === itemId);

  if (existing) existing.quantity += quantity;
  else player.inventory.push({ itemId, quantity });

  village.reputation += 1;

  return {
    success: true,
    message: `Purchased ${quantity} ${offer.itemName}.`,
    remainingCoins: player.coins
  };
}

/* ---------------- PLAYER HOMES ---------------- */

export type HomeUpgrade =
  | "bedroom"
  | "kitchen"
  | "storage"
  | "workshop"
  | "music-studio"
  | "recording-booth"
  | "mixing-room";

export type PlayerHome = {
  id: string;
  name: string;
  level: number;
  upgrades: HomeUpgrade[];
  studioInstalled: boolean;
};

export function createPlayerHome(name: string): PlayerHome {
  return {
    id: crypto.randomUUID(),
    name,
    level: 1,
    upgrades: ["bedroom"],
    studioInstalled: false
  };
}

export function expandHome(
  home: PlayerHome,
  upgrade: HomeUpgrade
) {
  if (home.upgrades.includes(upgrade)) {
    return { success: false, message: "Already installed." };
  }

  home.upgrades.push(upgrade);
  home.level += 1;

  if (upgrade === "music-studio") {
    home.studioInstalled = true;
  }

  return {
    success: true,
    message: `${upgrade} added to your home.`
  };
}

/* ---------------- SHELTERS & STUDIO ACCESS ---------------- */

export type ShelterType = "premade" | "player-built";

export type ShelterUpgrade =
  | "bedroom"
  | "kitchen"
  | "storage"
  | "workshop"
  | "music-studio"
  | "recording-booth"
  | "mixing-room";

export type PlayerShelter = {
  id: string;
  name: string;
  type: ShelterType;
  level: number;
  upgrades: ShelterUpgrade[];
  hasMusicStudio: boolean;
};

export function createPremadeShelter(name: string): PlayerShelter {
  return {
    id: crypto.randomUUID(),
    name,
    type: "premade",
    level: 1,
    upgrades: [
      "bedroom",
      "kitchen",
      "storage",
      "workshop"
    ],
    hasMusicStudio: true
  };
}

export function createPlayerBuiltHouse(name: string): PlayerShelter {
  return {
    id: crypto.randomUUID(),
    name,
    type: "player-built",
    level: 1,
    upgrades: ["bedroom"],
    hasMusicStudio: false
  };
}

export function addShelterUpgrade(
  shelter: PlayerShelter,
  upgrade: ShelterUpgrade
) {
  if (shelter.upgrades.includes(upgrade)) {
    return { success: false, message: "Already installed." };
  }

  shelter.upgrades.push(upgrade);
  shelter.level++;

  return { success: true, message: `${upgrade} installed.` };
}

export function canOpenMusicStudio(shelter: PlayerShelter) {
  return shelter.type === "premade" && shelter.hasMusicStudio;
}

/* ---------------- WEB PLUG-IN ARCHITECTURE ---------------- */

export type WebPluginType = "instrument" | "effect";

export type WebPluginManifest = {
  id: string;
  name: string;
  version: string;
  type: WebPluginType;
  format: "web-audio-worklet";
  entryPoint: string;
  processorName?: string;
  developer: string;
};

export type LoadedWebPlugin = {
  manifest: WebPluginManifest;
  loaded: boolean;
  enabled: boolean;
};

export function validateWebPluginManifest(
  manifest: Partial<WebPluginManifest>
): { valid: boolean; reason?: string } {
  if (!manifest.id || !manifest.id.trim()) {
    return { valid: false, reason: "Plug-in ID is required." };
  }
  if (!manifest.name || !manifest.name.trim()) {
    return { valid: false, reason: "Plug-in name is required." };
  }
  if (manifest.format !== "web-audio-worklet") {
    return {
      valid: false,
      reason: "Unsupported plug-in format. Only web-audio-worklet modules are supported in browser."
    };
  }
  if (!manifest.entryPoint || !manifest.entryPoint.trim()) {
    return { valid: false, reason: "AudioWorklet module entryPoint URL is required." };
  }
  return { valid: true };
}

export class WebAudioPluginRegistry {
  private plugins = new Map<string, LoadedWebPlugin>();

  async install(
    manifest: WebPluginManifest,
    audioContext: AudioContext
  ) {
    const check = validateWebPluginManifest(manifest);
    if (!check.valid) {
      throw new Error(check.reason || "Unsupported web audio plug-in.");
    }

    if (!audioContext.audioWorklet) {
      throw new Error("AudioWorklet API is unavailable in this browser context.");
    }

    // Plug-in code must be hosted securely and permit CORS (or use a verified Blob URL).
    await audioContext.audioWorklet.addModule(manifest.entryPoint);

    const plugin: LoadedWebPlugin = {
      manifest,
      loaded: true,
      enabled: true
    };

    this.plugins.set(manifest.id, plugin);
    return plugin;
  }

  setPluginEnabled(id: string, enabled: boolean) {
    const p = this.plugins.get(id);
    if (!p) return false;
    p.enabled = enabled;
    return true;
  }

  getInstalledPlugins() {
    return Array.from(this.plugins.values());
  }

  getPlugin(id: string) {
    return this.plugins.get(id) ?? null;
  }
}

/* ---------------- PURE SEQUENCER & SYNTH HELPERS ---------------- */

export function midiToFrequency(midiNote: number): number {
  return 440 * Math.pow(2, (midiNote - 69) / 12);
}

const NOTE_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

export function midiToNoteName(midiNote: number): string {
  const clamped = Math.max(0, Math.min(127, Math.round(midiNote)));
  const octave = Math.floor(clamped / 12) - 1;
  return `${NOTE_NAMES[clamped % 12]}${octave}`;
}

export type PianoRollNote = {
  id: string;
  channelId: number;
  midi: number;
  step: number;
  duration: number;
  velocity: number;
};

export type PianoRollPresetId =
  | "trap_minor"
  | "arp_dream"
  | "chord_prog"
  | "bass_808";

export function toggleOrAddPianoRollNote(
  notes: PianoRollNote[],
  channelId: number,
  midi: number,
  step: number,
  duration = 2,
  velocity = 0.85,
  totalSteps = 16
): { nextNotes: PianoRollNote[]; added: boolean } {
  const clampedStep = ((Math.floor(step) % totalSteps) + totalSteps) % totalSteps;
  const clampedDur = Math.max(1, Math.min(totalSteps - clampedStep, Math.round(duration)));
  const existingIdx = notes.findIndex(
    (n) => n.channelId === channelId && n.midi === midi && n.step === clampedStep
  );
  if (existingIdx >= 0) {
    return {
      nextNotes: notes.filter((_, idx) => idx !== existingIdx),
      added: false,
    };
  }
  const newNote: PianoRollNote = {
    id: `pr_${channelId}_${midi}_${clampedStep}_${Math.random().toString(36).slice(2, 7)}`,
    channelId,
    midi: Math.max(24, Math.min(96, Math.round(midi))),
    step: clampedStep,
    duration: clampedDur,
    velocity: Math.max(0.2, Math.min(1, velocity)),
  };
  return {
    nextNotes: [...notes, newNote],
    added: true,
  };
}

export function transposePianoRollChannel(
  notes: PianoRollNote[],
  channelId: number,
  semitones: number,
  minMidi = 48,
  maxMidi = 72
): PianoRollNote[] {
  return notes.map((n) => {
    if (n.channelId !== channelId) return n;
    const shifted = Math.max(minMidi, Math.min(maxMidi, n.midi + semitones));
    return { ...n, midi: shifted };
  });
}

export function buildMelodyPresetNotes(
  preset: PianoRollPresetId,
  channelId: number
): PianoRollNote[] {
  const mk = (midi: number, step: number, duration: number, velocity = 0.85): PianoRollNote => ({
    id: `preset_${preset}_${channelId}_${midi}_${step}`,
    channelId,
    midi,
    step,
    duration,
    velocity,
  });

  if (preset === "trap_minor") {
    return [
      mk(60, 0, 2, 0.9),  // C4
      mk(63, 2, 2, 0.84), // D#4
      mk(67, 4, 2, 0.92), // G4
      mk(68, 6, 2, 0.86), // G#4
      mk(67, 8, 2, 0.9),  // G4
      mk(63, 10, 2, 0.8), // D#4
      mk(62, 12, 2, 0.88),// D4
      mk(59, 14, 2, 0.84),// B3
    ];
  }

  if (preset === "arp_dream") {
    return [
      mk(57, 0, 1, 0.82), // A3
      mk(60, 1, 1, 0.78), // C4
      mk(64, 2, 1, 0.86), // E4
      mk(69, 3, 2, 0.92), // A4
      mk(67, 5, 1, 0.84), // G4
      mk(64, 6, 2, 0.86), // E4
      mk(53, 8, 1, 0.82), // F3
      mk(57, 9, 1, 0.78), // A3
      mk(60, 10, 1, 0.85),// C4
      mk(65, 11, 2, 0.9), // F4
      mk(64, 13, 1, 0.82),// E4
      mk(62, 14, 2, 0.86),// D4
    ];
  }

  if (preset === "chord_prog") {
    return [
      // Cm chord (Bar 1 beat 1)
      mk(60, 0, 4, 0.82),
      mk(63, 0, 4, 0.78),
      mk(67, 0, 4, 0.8),
      // G#maj chord (beat 2)
      mk(56, 4, 4, 0.8),
      mk(60, 4, 4, 0.78),
      mk(63, 4, 4, 0.82),
      // Fm chord (beat 3)
      mk(53, 8, 4, 0.82),
      mk(56, 8, 4, 0.78),
      mk(60, 8, 4, 0.8),
      // Gmaj turnaround (beat 4)
      mk(55, 12, 4, 0.84),
      mk(59, 12, 4, 0.8),
      mk(62, 12, 4, 0.82),
    ];
  }

  // bass_808
  return [
    mk(48, 0, 3, 0.95), // C3
    mk(48, 3, 2, 0.88), // C3
    mk(51, 6, 2, 0.9),  // D#3
    mk(48, 8, 3, 0.95), // C3
    mk(56, 11, 2, 0.9), // G#3
    mk(55, 13, 3, 0.92),// G3
  ];
}

export function mapMidiSequenceToPianoRollNotes(
  sequence: ParsedMidiSequence,
  channelId: number,
  totalSteps = 16
): PianoRollNote[] {
  const stepTicks = Math.max(1, sequence.ticksPerQuarterNote / 4);
  const out: PianoRollNote[] = [];
  const seen = new Set<string>();

  for (const track of sequence.tracks) {
    for (const n of track.notes) {
      if (n.channel === 9) continue; // skip percussion track
      const step = ((n.stepIndex % totalSteps) + totalSteps) % totalSteps;
      const clampedMidi = Math.max(48, Math.min(72, n.note));
      const key = `${clampedMidi}:${step}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const rawDur = Math.max(1, Math.round(n.durationTicks / stepTicks));
      const duration = Math.max(1, Math.min(totalSteps - step, rawDur));
      out.push({
        id: `mid_pr_${channelId}_${clampedMidi}_${step}`,
        channelId,
        midi: clampedMidi,
        step,
        duration,
        velocity: Math.max(0.25, Math.min(1, n.velocity / 127)),
      });
      if (out.length >= 64) return out;
    }
  }
  return out;
}

export function computeStepDurationMs(bpm: number, stepsPerBeat = 4): number {
  const clampedBpm = Math.max(40, Math.min(240, bpm));
  return (60 / clampedBpm / stepsPerBeat) * 1000;
}

export type StudioSample = {
  id: string;
  name: string;
  category: "kick" | "snare" | "hat" | "clap" | "808" | "loop" | "vocal" | "other";
  buffer: AudioBuffer;
  builtIn?: boolean;
};

export type StudioSampleSummary = {
  id: string;
  name: string;
  category: StudioSample["category"];
  duration: number;
  builtIn: boolean;
};

export type DrumTrackMix = {
  volume: number; // 0..1.5
  pan: number; // -1..1
  muted: boolean;
  solo: boolean;
  reverbSend: number; // 0..1
};

export type DrumTrack = {
  id: string;
  name: string;
  sampleId: string;
  activeSteps: boolean[];
  mix?: DrumTrackMix;
};

export type DrumPattern = {
  bpm: number;
  steps: number;
  swing?: number; // 0..0.5
  tracks: DrumTrack[];
};

export function createDefaultMix(): DrumTrackMix {
  return {
    volume: 0.9,
    pan: 0,
    muted: false,
    solo: false,
    reverbSend: 0.15
  };
}

export function togglePatternStep(
  pattern: DrumPattern,
  trackIndex: number,
  stepIndex: number
): DrumPattern {
  const tracks = pattern.tracks.map((track, idx) => {
    if (idx !== trackIndex) return track;
    const nextSteps = [...track.activeSteps];
    if (stepIndex >= 0 && stepIndex < nextSteps.length) {
      nextSteps[stepIndex] = !nextSteps[stepIndex];
    }
    return { ...track, activeSteps: nextSteps };
  });
  return { ...pattern, tracks };
}

/* ---------------- STUDIO UNIVERSAL FILE IMPORTER ---------------- */

export type ParsedMidiNote = {
  note: number;
  velocity: number;
  channel: number;
  startTick: number;
  durationTicks: number;
  stepIndex: number; // 0..15 quantized 16th-note step
};

export type ParsedMidiTrack = {
  name: string;
  notes: ParsedMidiNote[];
};

export type ParsedMidiSequence = {
  name: string;
  format: number;
  ticksPerQuarterNote: number;
  bpm: number;
  tracks: ParsedMidiTrack[];
  totalNotes: number;
};

export type LoadedCustomProcessor = {
  name: string;
  url: string;
  loadedAt: number;
};

export type StudioImportBatchResult = {
  importedAudioNames: string[];
  midiSequence: ParsedMidiSequence | null;
  loadedProcessors: LoadedCustomProcessor[];
  errors: { fileName: string; reason: string }[];
};

export type StudioImportFileEvent =
  | { target: { files: FileList | File[] | null } }
  | FileList
  | File[];

function readVarLen(view: DataView, offset: number, end: number): { value: number; next: number } {
  let value = 0;
  let pos = offset;
  for (let i = 0; i < 4 && pos < end; i++) {
    const byte = view.getUint8(pos++);
    value = (value << 7) | (byte & 0x7f);
    if ((byte & 0x80) === 0) break;
  }
  return { value, next: pos };
}

export class StudioImportManager {
  public ctx: AudioContext;
  public drumKit: Record<string, AudioBuffer>;
  public midiSequence: ParsedMidiSequence | null;
  public customProcessors: Map<string, LoadedCustomProcessor>;
  private objectUrls: string[] = [];

  constructor(audioContext: AudioContext) {
    this.ctx = audioContext;
    this.drumKit = {};
    this.midiSequence = null;
    this.customProcessors = new Map();
  }

  async handleFiles(event: StudioImportFileEvent): Promise<StudioImportBatchResult> {
    const rawFiles =
      "target" in event ? event.target?.files : event;

    const result: StudioImportBatchResult = {
      importedAudioNames: [],
      midiSequence: null,
      loadedProcessors: [],
      errors: [],
    };
    if (!rawFiles || rawFiles.length === 0) return result;

    const files: File[] = Array.from(rawFiles as ArrayLike<File>);
    for (const file of files) {
      const lower = file.name.toLowerCase();
      try {
        if (lower.endsWith(".mid") || lower.endsWith(".midi")) {
          const arrayBuffer = await file.arrayBuffer();
          const parsed = await this.parseMidi(arrayBuffer, file.name);
          this.midiSequence = parsed;
          result.midiSequence = parsed;
        } else if (
          /\.(wav|mp3|ogg|flac|m4a|aac|webm)$/i.test(file.name) ||
          file.type.startsWith("audio/")
        ) {
          const arrayBuffer = await file.arrayBuffer();
          const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
          this.drumKit[file.name] = audioBuffer;
          result.importedAudioNames.push(file.name);
        } else if (lower.endsWith(".js") || lower.endsWith(".mjs")) {
          const proc = await this.loadCustomAudioProcessor(file);
          result.loadedProcessors.push(proc);
        } else {
          result.errors.push({
            fileName: file.name,
            reason: "Unsupported file type. Expected .mid/.midi, .wav/.mp3 audio, or .js AudioWorklet.",
          });
        }
      } catch (err) {
        result.errors.push({
          fileName: file.name,
          reason: err instanceof Error ? err.message : "Failed to import file",
        });
      }
    }

    return result;
  }

  async parseMidi(buffer: ArrayBuffer, name = "Imported MIDI"): Promise<ParsedMidiSequence> {
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);

    const fallback: ParsedMidiSequence = {
      name,
      format: 0,
      ticksPerQuarterNote: 480,
      bpm: 120,
      tracks: [],
      totalNotes: 0,
    };

    // Check Standard MIDI File header "MThd"
    if (bytes.byteLength < 14) return fallback;
    const headerTag = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
    if (headerTag !== "MThd") return fallback;

    const headerLen = view.getUint32(4, false);
    const format = view.getUint16(8, false);
    const trackCount = view.getUint16(10, false);
    const division = view.getUint16(12, false);
    const ticksPerQuarterNote = division > 0 && (division & 0x8000) === 0 ? division : 480;
    const stepTicks = Math.max(1, ticksPerQuarterNote / 4);

    let offset = 8 + headerLen;
    let bpm = 120;
    const tracks: ParsedMidiTrack[] = [];
    let totalNotes = 0;

    for (let t = 0; t < trackCount && offset + 8 <= bytes.byteLength; t++) {
      const chunkTag = String.fromCharCode(
        bytes[offset],
        bytes[offset + 1],
        bytes[offset + 2],
        bytes[offset + 3],
      );
      const chunkLen = view.getUint32(offset + 4, false);
      const chunkStart = offset + 8;
      const chunkEnd = Math.min(bytes.byteLength, chunkStart + chunkLen);
      offset = chunkEnd;

      if (chunkTag !== "MTrk") continue;

      let pos = chunkStart;
      let absTick = 0;
      let runningStatus = 0;
      let trackName = `Track ${tracks.length + 1}`;
      const activeNotes = new Map<string, { startTick: number; velocity: number; channel: number; note: number }>();
      const notes: ParsedMidiNote[] = [];

      while (pos < chunkEnd) {
        const delta = readVarLen(view, pos, chunkEnd);
        pos = delta.next;
        absTick += delta.value;
        if (pos >= chunkEnd) break;

        let status = view.getUint8(pos);
        if (status < 0x80) {
          if (runningStatus === 0) break;
          status = runningStatus;
        } else {
          pos += 1;
          if (status < 0xf0) runningStatus = status;
        }

        if (status === 0xff) {
          // Meta event
          if (pos >= chunkEnd) break;
          const metaType = view.getUint8(pos++);
          const metaLen = readVarLen(view, pos, chunkEnd);
          pos = metaLen.next;
          const dataEnd = Math.min(chunkEnd, pos + metaLen.value);

          if (metaType === 0x03 && dataEnd > pos) {
            // Sequence/Track Name
            const chars: string[] = [];
            for (let k = pos; k < dataEnd; k++) {
              chars.push(String.fromCharCode(bytes[k]));
            }
            const decoded = chars.join("").trim();
            if (decoded) trackName = decoded;
          } else if (metaType === 0x51 && dataEnd - pos >= 3) {
            // Set Tempo (microseconds per quarter note)
            const usPerQuarter =
              (bytes[pos] << 16) | (bytes[pos + 1] << 8) | bytes[pos + 2];
            if (usPerQuarter > 0) {
              bpm = Math.max(40, Math.min(240, Math.round(60_000_000 / usPerQuarter)));
            }
          }
          pos = dataEnd;
        } else if (status === 0xf0 || status === 0xf7) {
          // SysEx event
          const syxLen = readVarLen(view, pos, chunkEnd);
          pos = Math.min(chunkEnd, syxLen.next + syxLen.value);
        } else {
          const eventType = status & 0xf0;
          const channel = status & 0x0f;
          const dataLen = eventType === 0xc0 || eventType === 0xd0 ? 1 : 2;
          if (pos + dataLen > chunkEnd) break;

          const d1 = view.getUint8(pos);
          const d2 = dataLen === 2 ? view.getUint8(pos + 1) : 0;
          pos += dataLen;

          if (eventType === 0x90 && d2 > 0) {
            const key = `${channel}:${d1}`;
            activeNotes.set(key, {
              startTick: absTick,
              velocity: d2,
              channel,
              note: d1,
            });
          } else if (eventType === 0x80 || (eventType === 0x90 && d2 === 0)) {
            const key = `${channel}:${d1}`;
            const open = activeNotes.get(key);
            if (open) {
              activeNotes.delete(key);
              const durationTicks = Math.max(1, absTick - open.startTick);
              notes.push({
                note: open.note,
                velocity: open.velocity,
                channel: open.channel,
                startTick: open.startTick,
                durationTicks,
                stepIndex: Math.floor(open.startTick / stepTicks) % 16,
              });
            }
          }
        }
      }

      // Close any hanging notes
      for (const open of activeNotes.values()) {
        notes.push({
          note: open.note,
          velocity: open.velocity,
          channel: open.channel,
          startTick: open.startTick,
          durationTicks: Math.max(1, Math.round(stepTicks)),
          stepIndex: Math.floor(open.startTick / stepTicks) % 16,
        });
      }

      notes.sort((a, b) => a.startTick - b.startTick);
      totalNotes += notes.length;
      tracks.push({ name: trackName, notes });
    }

    return {
      name,
      format,
      ticksPerQuarterNote,
      bpm,
      tracks,
      totalNotes,
    };
  }

  async loadCustomAudioProcessor(file: File): Promise<LoadedCustomProcessor> {
    if (!this.ctx.audioWorklet) {
      throw new Error("AudioWorklet API is unavailable in this browser context.");
    }
    const blob = new Blob([file], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);
    this.objectUrls.push(url);

    await this.ctx.audioWorklet.addModule(url);
    const proc: LoadedCustomProcessor = {
      name: file.name,
      url,
      loadedAt: Date.now(),
    };
    this.customProcessors.set(file.name, proc);
    return proc;
  }

  dispose(): void {
    for (const url of this.objectUrls) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // Ignore in non-browser environments
      }
    }
    this.objectUrls = [];
  }
}

export function mapMidiSequenceToDrumSteps(
  sequence: ParsedMidiSequence,
  trackCount = 5,
): boolean[][] {
  const matrix: boolean[][] = Array.from({ length: trackCount }, () =>
    Array(16).fill(false),
  );
  for (const track of sequence.tracks) {
    for (const n of track.notes) {
      const step = ((n.stepIndex % 16) + 16) % 16;
      let lane = 4; // default bass / synth lane
      if (n.note <= 36 || n.note === 35 || n.note === 36) {
        lane = 0; // Kick
      } else if (n.note === 38 || n.note === 40) {
        lane = 1; // Snare
      } else if (n.note === 42 || n.note === 44 || n.note === 46) {
        lane = 2; // Hi-Hat
      } else if (n.note === 39 || n.note === 37) {
        lane = 3; // Clap / Rim
      } else if (n.channel === 9) {
        lane = n.note % Math.min(4, trackCount);
      } else {
        lane = n.note < 48 ? 4 : n.note % trackCount;
      }
      if (lane >= 0 && lane < trackCount) {
        matrix[lane][step] = true;
      }
    }
  }
  return matrix;
}

/* ---------------- REAL MUSIC STUDIO ENGINE ---------------- */

export class MusicStudioEngine {
  private context: AudioContext;
  private preMaster: GainNode;
  private filter: BiquadFilterNode;
  private compressor: DynamicsCompressorNode;
  private reverbSend: GainNode;
  private convolver: ConvolverNode;
  private reverbReturn: GainNode;
  private master: GainNode;
  private analyser: AnalyserNode;
  private analyserData: Uint8Array<ArrayBuffer>;
  private samples = new Map<string, StudioSample>();
  private playing = false;
  private timer: number | null = null;
  private activePattern: DrumPattern | null = null;
  private currentStep = 0;
  private onStepCallback: ((step: number) => void) | null = null;
  private compressorEnabled = true;
  private reverbEnabled = true;
  private filterCutoffHz = 18000;
  private mediaRecorder: MediaRecorder | null = null;
  private micStream: MediaStream | null = null;
  private recordedChunks: Blob[] = [];
  public readonly pluginRegistry = new WebAudioPluginRegistry();
  public readonly importManager: StudioImportManager;

  constructor() {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.context = new AudioCtx();
    this.importManager = new StudioImportManager(this.context);

    this.preMaster = this.context.createGain();
    this.preMaster.gain.value = 1.0;

    this.filter = this.context.createBiquadFilter();
    this.filter.type = "lowpass";
    this.filter.frequency.value = this.filterCutoffHz;
    this.filter.Q.value = 0.8;

    this.compressor = this.context.createDynamicsCompressor();
    this.compressor.threshold.value = -16;
    this.compressor.knee.value = 18;
    this.compressor.ratio.value = 4;
    this.compressor.attack.value = 0.005;
    this.compressor.release.value = 0.16;

    this.reverbSend = this.context.createGain();
    this.reverbSend.gain.value = 0.25;
    this.convolver = this.context.createConvolver();
    this.convolver.buffer = this.buildStudioImpulseResponse(1.4, 2.8);
    this.reverbReturn = this.context.createGain();
    this.reverbReturn.gain.value = 0.38;

    this.master = this.context.createGain();
    this.master.gain.value = 0.8;

    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.78;
    this.analyserData = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));

    // Signal routing:
    // preMaster -> filter -> compressor -> master -> analyser -> destination
    // reverbSend -> convolver -> reverbReturn -> master
    this.preMaster.connect(this.filter);
    this.filter.connect(this.compressor);
    this.compressor.connect(this.master);

    this.reverbSend.connect(this.convolver);
    this.convolver.connect(this.reverbReturn);
    this.reverbReturn.connect(this.master);

    this.master.connect(this.analyser);
    this.analyser.connect(this.context.destination);

    this.initBuiltInDrumKit();
  }

  private buildStudioImpulseResponse(durationSec: number, decay: number): AudioBuffer {
    const rate = this.context.sampleRate;
    const length = Math.max(1, Math.floor(rate * durationSec));
    const impulse = this.context.createBuffer(2, length, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        const env = Math.pow(1 - i / length, decay);
        data[i] = (Math.random() * 2 - 1) * env;
      }
    }
    return impulse;
  }

  private initBuiltInDrumKit(): void {
    const sr = this.context.sampleRate;

    // 1. Punchy 808 Kick
    const kickLen = Math.floor(sr * 0.42);
    const kickBuf = this.context.createBuffer(1, kickLen, sr);
    const kickData = kickBuf.getChannelData(0);
    let phase = 0;
    for (let i = 0; i < kickLen; i++) {
      const t = i / sr;
      const freq = 46 + 135 * Math.exp(-t * 28);
      phase += (2 * Math.PI * freq) / sr;
      const amp = Math.exp(-t * 7.5);
      const click = t < 0.008 ? Math.sin(t * 2 * Math.PI * 1400) * (1 - t / 0.008) * 0.35 : 0;
      kickData[i] = Math.tanh((Math.sin(phase) * amp + click) * 1.25) * 0.9;
    }
    this.samples.set("builtin_kick", {
      id: "builtin_kick",
      name: "Studio 808 Kick",
      category: "kick",
      buffer: kickBuf,
      builtIn: true
    });

    // 2. Crisp Studio Snare
    const snareLen = Math.floor(sr * 0.24);
    const snareBuf = this.context.createBuffer(1, snareLen, sr);
    const snareData = snareBuf.getChannelData(0);
    for (let i = 0; i < snareLen; i++) {
      const t = i / sr;
      const body = Math.sin(2 * Math.PI * (190 - 40 * t) * t) * Math.exp(-t * 24) * 0.55;
      const noise = (Math.random() * 2 - 1) * Math.exp(-t * 16) * 0.65;
      snareData[i] = Math.tanh(body + noise) * 0.85;
    }
    this.samples.set("builtin_snare", {
      id: "builtin_snare",
      name: "Studio Snare",
      category: "snare",
      buffer: snareBuf,
      builtIn: true
    });

    // 3. Closed Hi-Hat
    const hatLen = Math.floor(sr * 0.09);
    const hatBuf = this.context.createBuffer(1, hatLen, sr);
    const hatData = hatBuf.getChannelData(0);
    let prevNoise = 0;
    for (let i = 0; i < hatLen; i++) {
      const t = i / sr;
      const raw = Math.random() * 2 - 1;
      const hp = raw - prevNoise * 0.85;
      prevNoise = raw;
      const metal =
        Math.sin(2 * Math.PI * 3400 * t) * 0.15 +
        Math.sin(2 * Math.PI * 5230 * t) * 0.15;
      hatData[i] = (hp * 0.55 + metal) * Math.exp(-t * 48) * 0.7;
    }
    this.samples.set("builtin_hat", {
      id: "builtin_hat",
      name: "Closed Hi-Hat",
      category: "hat",
      buffer: hatBuf,
      builtIn: true
    });

    // 4. Studio Hand Clap
    const clapLen = Math.floor(sr * 0.22);
    const clapBuf = this.context.createBuffer(1, clapLen, sr);
    const clapData = clapBuf.getChannelData(0);
    for (let i = 0; i < clapLen; i++) {
      const t = i / sr;
      const burst1 = t < 0.014 ? 1 : 0;
      const burst2 = t >= 0.016 && t < 0.03 ? 0.9 : 0;
      const burst3 = t >= 0.032 ? Math.exp(-(t - 0.032) * 18) : 0;
      const env = Math.max(burst1, burst2, burst3);
      clapData[i] = (Math.random() * 2 - 1) * env * 0.72;
    }
    this.samples.set("builtin_clap", {
      id: "builtin_clap",
      name: "Studio Clap",
      category: "clap",
      buffer: clapBuf,
      builtIn: true
    });

    // 5. Deep 808 Sub Bass
    const subLen = Math.floor(sr * 0.65);
    const subBuf = this.context.createBuffer(1, subLen, sr);
    const subData = subBuf.getChannelData(0);
    let subPhase = 0;
    for (let i = 0; i < subLen; i++) {
      const t = i / sr;
      const f = 55 + 45 * Math.exp(-t * 32);
      subPhase += (2 * Math.PI * f) / sr;
      subData[i] = Math.tanh(Math.sin(subPhase) * 1.4) * Math.exp(-t * 3.8) * 0.85;
    }
    this.samples.set("builtin_808", {
      id: "builtin_808",
      name: "Sub 808 Bass",
      category: "808",
      buffer: subBuf,
      builtIn: true
    });
  }

  getAudioContext(): AudioContext {
    return this.context;
  }

  async unlockAudio() {
    if (this.context.state !== "running") {
      await this.context.resume();
    }
  }

  async importSample(file: File, category: StudioSample["category"]) {
    await this.unlockAudio();
    const bytes = await file.arrayBuffer();
    const buffer = await this.context.decodeAudioData(bytes);
    this.importManager.drumKit[file.name] = buffer;
    return this.registerDecodedSample(file.name, buffer, category);
  }

  registerDecodedSample(
    name: string,
    buffer: AudioBuffer,
    category: StudioSample["category"] = "other",
  ): StudioSample {
    const sample: StudioSample = {
      id: crypto.randomUUID(),
      name,
      category,
      buffer,
      builtIn: false
    };

    this.samples.set(sample.id, sample);
    return sample;
  }

  async importStudioFiles(
    event: StudioImportFileEvent,
    audioCategory: StudioSample["category"] = "loop",
  ): Promise<StudioImportBatchResult> {
    await this.unlockAudio();
    const result = await this.importManager.handleFiles(event);
    for (const audioName of result.importedAudioNames) {
      const buf = this.importManager.drumKit[audioName];
      if (buf) {
        this.registerDecodedSample(audioName, buf, audioCategory);
      }
    }
    return result;
  }

  playMidiSequence(
    sequence: ParsedMidiSequence,
    waveform: OscillatorType = "sawtooth",
    cutoffHz = 4200,
  ): number {
    const stepMs = computeStepDurationMs(sequence.bpm, 4);
    let scheduled = 0;
    for (const track of sequence.tracks) {
      for (const note of track.notes.slice(0, 96)) {
        const delayMs = (note.startTick / Math.max(1, sequence.ticksPerQuarterNote / 4)) * stepMs;
        const durSec = Math.max(
          0.14,
          Math.min(1.4, (note.durationTicks / Math.max(1, sequence.ticksPerQuarterNote / 4)) * (stepMs / 1000)),
        );
        window.setTimeout(() => {
          if (this.context.state !== "closed") {
            this.playSynthNote(note.note, waveform, durSec, cutoffHz);
          }
        }, Math.min(16000, Math.max(0, delayMs)));
        scheduled += 1;
      }
    }
    return scheduled;
  }

  getSamples(): StudioSampleSummary[] {
    return Array.from(this.samples.values()).map(sample => ({
      id: sample.id,
      name: sample.name,
      category: sample.category,
      duration: sample.buffer.duration,
      builtIn: Boolean(sample.builtIn)
    }));
  }

  playSample(
    sampleId: string,
    when = this.context.currentTime,
    mix?: Partial<DrumTrackMix>
  ) {
    const sample = this.samples.get(sampleId);
    if (!sample) return false;

    if (this.context.state === "suspended") {
      this.context.resume().catch(() => undefined);
    }

    const source = this.context.createBufferSource();
    source.buffer = sample.buffer;

    const gain = this.context.createGain();
    gain.gain.value = Math.max(0, Math.min(1.5, mix?.volume ?? 0.9));

    if (typeof this.context.createStereoPanner === "function") {
      const panner = this.context.createStereoPanner();
      panner.pan.value = Math.max(-1, Math.min(1, mix?.pan ?? 0));
      source.connect(gain);
      gain.connect(panner);
      panner.connect(this.preMaster);
    } else {
      source.connect(gain);
      gain.connect(this.preMaster);
    }

    const revAmt = Math.max(0, Math.min(1, mix?.reverbSend ?? 0.12));
    if (this.reverbEnabled && revAmt > 0.01) {
      const send = this.context.createGain();
      send.gain.value = revAmt;
      gain.connect(send);
      send.connect(this.reverbSend);
    }

    source.start(when);
    return true;
  }

  playSynthNote(
    midiNote: number,
    waveform: OscillatorType = "sawtooth",
    durationSec = 0.35,
    cutoffHz = 3600
  ) {
    if (this.context.state === "suspended") {
      this.context.resume().catch(() => undefined);
    }
    const now = this.context.currentTime;
    const osc = this.context.createOscillator();
    const noteFilter = this.context.createBiquadFilter();
    const env = this.context.createGain();

    osc.type = waveform;
    osc.frequency.setValueAtTime(midiToFrequency(midiNote), now);

    noteFilter.type = "lowpass";
    noteFilter.frequency.setValueAtTime(Math.max(180, Math.min(16000, cutoffHz)), now);
    noteFilter.Q.value = 1.6;

    env.gain.setValueAtTime(0.0001, now);
    env.gain.exponentialRampToValueAtTime(0.28, now + 0.012);
    env.gain.exponentialRampToValueAtTime(0.14, now + durationSec * 0.45);
    env.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    osc.connect(noteFilter);
    noteFilter.connect(env);
    env.connect(this.preMaster);
    if (this.reverbEnabled) {
      const rev = this.context.createGain();
      rev.gain.value = 0.25;
      env.connect(rev);
      rev.connect(this.reverbSend);
    }

    osc.start(now);
    osc.stop(now + durationSec + 0.03);
  }

  setMasterVolume(value: number) {
    this.master.gain.setTargetAtTime(
      Math.max(0, Math.min(1, value)),
      this.context.currentTime,
      0.02
    );
  }

  setMasterFilterCutoff(hz: number) {
    this.filterCutoffHz = Math.max(250, Math.min(18000, hz));
    this.filter.frequency.setTargetAtTime(
      this.filterCutoffHz,
      this.context.currentTime,
      0.03
    );
  }

  setCompressorEnabled(enabled: boolean) {
    this.compressorEnabled = enabled;
    this.compressor.ratio.setTargetAtTime(
      enabled ? 4 : 1,
      this.context.currentTime,
      0.02
    );
  }

  setReverbEnabled(enabled: boolean) {
    this.reverbEnabled = enabled;
    this.reverbReturn.gain.setTargetAtTime(
      enabled ? 0.38 : 0,
      this.context.currentTime,
      0.03
    );
  }

  getAnalyserBinCount(): number {
    return this.analyser.frequencyBinCount;
  }

  getAnalyserFftSize(): number {
    return this.analyser.fftSize;
  }

  copyAnalyserData(
    freqOut: Uint8Array<ArrayBuffer>,
    timeOut: Uint8Array<ArrayBuffer>
  ): void {
    this.analyser.getByteFrequencyData(freqOut);
    this.analyser.getByteTimeDomainData(timeOut);
  }

  triggerDawVoice(opts: {
    synthType: "kick" | "808" | "snare" | "hat" | "openhat" | "perc" | "pluck" | "lead";
    freq?: number;
    vol?: number;
    pan?: number;
    sampleName?: string | null;
    stripVol?: number;
    stripPan?: number;
    stripMuted?: boolean;
    durationSec?: number;
    waveform?: OscillatorType;
    pitchShiftFromHz?: number;
  }): void {
    if (opts.stripMuted) return;
    if (this.context.state === "suspended") {
      this.context.resume().catch(() => undefined);
    }

    const now = this.context.currentTime;
    const freq = opts.freq ?? 440;
    const vol = Math.max(0, Math.min(1.4, (opts.vol ?? 0.8) * (opts.stripVol ?? 1)));
    const combinedPan = Math.max(
      -1,
      Math.min(1, (opts.pan ?? 0) + (opts.stripPan ?? 0))
    );

    const voiceGain = this.context.createGain();
    if (typeof this.context.createStereoPanner === "function") {
      const voicePan = this.context.createStereoPanner();
      voicePan.pan.setValueAtTime(combinedPan, now);
      voiceGain.connect(voicePan);
      voicePan.connect(this.preMaster);
    } else {
      voiceGain.connect(this.preMaster);
    }

    if (opts.sampleName && this.importManager.drumKit[opts.sampleName]) {
      const src = this.context.createBufferSource();
      src.buffer = this.importManager.drumKit[opts.sampleName];
      if (opts.pitchShiftFromHz && opts.pitchShiftFromHz > 0) {
        src.playbackRate.setValueAtTime(
          Math.max(0.25, Math.min(4, freq / opts.pitchShiftFromHz)),
          now
        );
      }
      voiceGain.gain.setValueAtTime(vol, now);
      src.connect(voiceGain);
      src.start(now);
      return;
    }

    const synthType = opts.synthType;
    const holdDur = Math.max(0.08, Math.min(2.4, opts.durationSec ?? 0.26));

    if (synthType === "kick") {
      const osc = this.context.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(Math.max(85, freq * 2.4), now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(28, freq * 0.65), now + 0.16);

      voiceGain.gain.setValueAtTime(vol * 1.15, now);
      voiceGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(voiceGain);
      osc.start(now);
      osc.stop(now + 0.23);
    } else if (synthType === "808") {
      const dur808 = Math.max(0.25, Math.min(2.2, opts.durationSec ?? 0.45));
      const osc = this.context.createOscillator();
      const filter = this.context.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(420, now);

      osc.type = opts.waveform ?? "triangle";
      osc.frequency.setValueAtTime(freq * 1.2, now);
      osc.frequency.exponentialRampToValueAtTime(freq, now + 0.04);

      voiceGain.gain.setValueAtTime(vol, now);
      voiceGain.gain.exponentialRampToValueAtTime(0.001, now + dur808);

      osc.connect(filter);
      filter.connect(voiceGain);
      osc.start(now);
      osc.stop(now + dur808 + 0.02);
    } else if (
      synthType === "snare" ||
      synthType === "hat" ||
      synthType === "openhat" ||
      synthType === "perc"
    ) {
      const duration = synthType === "openhat" ? 0.24 : synthType === "hat" ? 0.055 : 0.14;
      const bufferSize = Math.max(1, Math.floor(this.context.sampleRate * duration));
      const noiseBuf = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.context.createBufferSource();
      noise.buffer = noiseBuf;

      const filter = this.context.createBiquadFilter();
      if (synthType === "snare") {
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(freq * 6, now);
        filter.Q.setValueAtTime(1.2, now);
      } else {
        filter.type = "highpass";
        filter.frequency.setValueAtTime(Math.min(12000, freq), now);
      }

      voiceGain.gain.setValueAtTime(vol * 0.75, now);
      voiceGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      noise.connect(filter);
      filter.connect(voiceGain);
      noise.start(now);
      noise.stop(now + duration + 0.01);
    } else {
      const osc = this.context.createOscillator();
      const filter = this.context.createBiquadFilter();
      osc.type = opts.waveform ?? (synthType === "lead" ? "sawtooth" : "triangle");
      osc.frequency.setValueAtTime(freq, now);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(Math.min(14000, freq * 4.5), now);
      filter.frequency.exponentialRampToValueAtTime(Math.max(180, freq * 1.15), now + holdDur);

      voiceGain.gain.setValueAtTime(0.001, now);
      voiceGain.gain.linearRampToValueAtTime(vol * 0.52, now + 0.01);
      voiceGain.gain.exponentialRampToValueAtTime(0.001, now + holdDur);

      osc.connect(filter);
      filter.connect(voiceGain);
      osc.start(now);
      osc.stop(now + holdDur + 0.02);
    }
  }

  getMasterPeakLevel(): number {
    this.analyser.getByteTimeDomainData(this.analyserData);
    let maxDev = 0;
    for (let i = 0; i < this.analyserData.length; i++) {
      const dev = Math.abs(this.analyserData[i] - 128) / 128;
      if (dev > maxDev) maxDev = dev;
    }
    return Math.min(1, maxDev * 2.2);
  }

  updatePattern(pattern: DrumPattern) {
    this.activePattern = pattern;
  }

  async playPattern(pattern: DrumPattern, onStep?: (step: number) => void) {
    await this.unlockAudio();
    this.stopPattern();

    this.playing = true;
    this.activePattern = pattern;
    this.onStepCallback = onStep || null;
    this.currentStep = 0;

    const tick = () => {
      if (!this.playing || !this.activePattern) return;

      const pat = this.activePattern;
      const step = this.currentStep;
      const now = this.context.currentTime + 0.02;
      const hasSolo = pat.tracks.some(t => t.mix?.solo);

      for (const track of pat.tracks) {
        const mix = track.mix;
        const muted = mix?.muted || (hasSolo && !mix?.solo);
        if (!muted && track.activeSteps[step]) {
          this.playSample(track.sampleId, now, mix);
        }
      }

      if (this.onStepCallback) {
        this.onStepCallback(step);
      }

      const swing = Math.max(0, Math.min(0.45, pat.swing ?? 0));
      const baseMs = computeStepDurationMs(pat.bpm, 4);
      const swingMs = step % 2 === 0 ? baseMs * (1 + swing) : baseMs * (1 - swing);

      this.currentStep = (step + 1) % Math.max(1, pat.steps);
      this.timer = window.setTimeout(tick, Math.max(25, swingMs));
    };

    tick();
  }

  stopPattern() {
    this.playing = false;

    if (this.timer !== null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
  }

  async startMicRecording(): Promise<void> {
    await this.unlockAudio();
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      throw new Error("Microphone recording is not supported in this browser environment.");
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.micStream = stream;
    this.recordedChunks = [];
    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (ev) => {
      if (ev.data.size > 0) this.recordedChunks.push(ev.data);
    };
    this.mediaRecorder = recorder;
    recorder.start();
  }

  async stopMicRecording(takeName = "Booth Vocal Take"): Promise<StudioSample> {
    const recorder = this.mediaRecorder;
    if (!recorder || recorder.state === "inactive") {
      throw new Error("No active recording.");
    }

    const blob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        resolve(new Blob(this.recordedChunks, { type: recorder.mimeType || "audio/webm" }));
      };
      recorder.stop();
    });

    if (this.micStream) {
      this.micStream.getTracks().forEach(t => t.stop());
      this.micStream = null;
    }
    this.mediaRecorder = null;

    const bytes = await blob.arrayBuffer();
    const buffer = await this.context.decodeAudioData(bytes);
    const sample: StudioSample = {
      id: crypto.randomUUID(),
      name: takeName,
      category: "vocal",
      buffer,
      builtIn: false
    };
    this.samples.set(sample.id, sample);
    return sample;
  }

  dispose() {
    this.stopPattern();
    this.importManager.dispose();
    if (this.micStream) {
      this.micStream.getTracks().forEach(t => t.stop());
      this.micStream = null;
    }
    if (this.context.state !== "closed") {
      this.context.close().catch(() => undefined);
    }
  }
}
