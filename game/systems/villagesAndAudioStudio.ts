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

  constructor() {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.context = new AudioCtx();

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
    this.analyser.fftSize = 128;
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

    const sample: StudioSample = {
      id: crypto.randomUUID(),
      name: file.name,
      category,
      buffer,
      builtIn: false
    };

    this.samples.set(sample.id, sample);
    return sample;
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
    if (this.micStream) {
      this.micStream.getTracks().forEach(t => t.stop());
      this.micStream = null;
    }
    if (this.context.state !== "closed") {
      this.context.close().catch(() => undefined);
    }
  }
}
