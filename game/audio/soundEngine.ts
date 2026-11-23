import { CreatureSpecies, WeatherType } from '../types';
import type { EngineAudioConfig } from '../systems/vehicleProfiles';

/**
 * Per-firearm character. Pitch shapes the crack, weight the low-end punch,
 * bright the muzzle blast, tail the outdoor decay and mech the action sound.
 * Keys are item ids so every gun the player owns has its own voice.
 */
const GUN_VOICES: Record<
  string,
  { pitch: number; weight: number; bright: number; tail: number; mech?: 'slide' | 'pump' | 'bolt' | 'revolver' }
> = {
  gun: { pitch: 1.02, weight: 1.0, bright: 1.0, tail: 1.0, mech: 'slide' },
  pirate_musket: { pitch: 0.74, weight: 1.45, bright: 0.62, tail: 1.38 },
  glock_19: { pitch: 1.12, weight: 0.92, bright: 1.16, tail: 0.94, mech: 'slide' },
  colt_m1911: { pitch: 0.98, weight: 1.05, bright: 0.98, tail: 1.04, mech: 'slide' },
  desert_eagle: { pitch: 0.82, weight: 1.3, bright: 0.9, tail: 1.2, mech: 'slide' },
  magnum_44: { pitch: 0.88, weight: 1.22, bright: 1.0, tail: 1.28, mech: 'revolver' },
  remington_870: { pitch: 0.7, weight: 1.5, bright: 0.8, tail: 1.32, mech: 'pump' },
  mossberg_590: { pitch: 0.66, weight: 1.56, bright: 0.76, tail: 1.34, mech: 'pump' },
  sawed_off: { pitch: 0.6, weight: 1.64, bright: 0.7, tail: 1.12, mech: 'pump' },
  mp5: { pitch: 1.18, weight: 0.85, bright: 1.12, tail: 0.86 },
  uzi: { pitch: 1.26, weight: 0.8, bright: 1.24, tail: 0.8 },
  vector: { pitch: 1.08, weight: 0.95, bright: 1.0, tail: 0.9 },
  ak_47: { pitch: 0.86, weight: 1.2, bright: 0.96, tail: 1.12 },
  m4a1: { pitch: 1.0, weight: 1.05, bright: 1.14, tail: 1.0 },
  scar_h: { pitch: 0.92, weight: 1.15, bright: 1.02, tail: 1.1 },
  fn_fal: { pitch: 0.88, weight: 1.2, bright: 1.0, tail: 1.14 },
  barrett_50: { pitch: 0.62, weight: 1.72, bright: 0.86, tail: 1.58, mech: 'bolt' },
  remington_700: { pitch: 0.78, weight: 1.36, bright: 1.05, tail: 1.38, mech: 'bolt' },
  m249_saw: { pitch: 0.9, weight: 1.28, bright: 0.98, tail: 1.18 },
  alien_plasma_gun: { pitch: 1, weight: 1, bright: 1, tail: 1 },
};

/**
 * 100% Procedural Web Audio API Sound Engine (Zero external MP3/WAV 404s).
 * Safely unlocks on iPhone Safari first user gesture.
 */
export class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private ambienceGain: GainNode | null = null;
  private surfFilter: BiquadFilterNode | null = null;
  private surfGain: GainNode | null = null;
  private rainFilter: BiquadFilterNode | null = null;
  private rainGain: GainNode | null = null;
  private surfNoiseSrc: AudioBufferSourceNode | null = null;
  private rainNoiseSrc: AudioBufferSourceNode | null = null;
  private ambienceStarted = false;

  private masterVolume = 0.7;
  private sfxEnabled = true;
  private ambienceEnabled = true;
  private nextBirdTime = 0;
  private nextInsectTime = 0;
  private nextFireCrackleTime = 0;
  private whiteNoiseBuf: AudioBuffer | null = null;
  private brownNoiseBuf: AudioBuffer | null = null;

  // Continuous real-time multi-powertrain vehicle engine synthesizer
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineSubOsc: OscillatorNode | null = null;
  private engineForcedOsc: OscillatorNode | null = null;
  private engineLfo: OscillatorNode | null = null;
  private engineLfoGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineHarmGain: GainNode | null = null;
  private engineSubGain: GainNode | null = null;
  private engineForcedGain: GainNode | null = null;
  private engineMasterGain: GainNode | null = null;
  private engineRunning = false;
  private activeEngineProfileId: string | null = null;
  private lastBlowOffAt = 0;

  // Continuous turboprop drone for the Crescent Clipper.
  private jetEngineNodes: {
    osc1: OscillatorNode;
    osc2: OscillatorNode;
    noise: AudioBufferSourceNode | null;
    filter: BiquadFilterNode;
    gain: GainNode;
  } | null = null;

  public configure(opts: {
    masterVolume: number;
    sfxEnabled: boolean;
    ambienceEnabled: boolean;
  }): void {
    this.masterVolume = opts.masterVolume;
    this.sfxEnabled = opts.sfxEnabled;
    this.ambienceEnabled = opts.ambienceEnabled;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        this.masterVolume,
        this.ctx.currentTime,
        0.05,
      );
    }
    if (this.ambienceGain && this.ctx) {
      this.ambienceGain.gain.setTargetAtTime(
        this.ambienceEnabled ? 0.16 : 0,
        this.ctx.currentTime,
        0.15,
      );
    }
  }

  public unlock(): void {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.masterVolume;
      this.masterGain.connect(this.ctx.destination);

      this.ambienceGain = this.ctx.createGain();
      this.ambienceGain.gain.value = this.ambienceEnabled ? 0.16 : 0;
      this.ambienceGain.connect(this.masterGain);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    if (!this.whiteNoiseBuf || !this.brownNoiseBuf) {
      this.ensureNoiseBuffers();
    }

    if (!this.ambienceStarted && this.ctx && this.ambienceGain) {
      this.startAmbience();
    }
  }

  private ensureNoiseBuffers(): void {
    if (!this.ctx) return;
    const sr = this.ctx.sampleRate;
    const len = sr * 3;
    if (!this.whiteNoiseBuf) {
      const wBuf = this.ctx.createBuffer(1, len, sr);
      const wData = wBuf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        wData[i] = Math.random() * 2 - 1;
      }
      this.whiteNoiseBuf = wBuf;
    }
    if (!this.brownNoiseBuf) {
      const bBuf = this.ctx.createBuffer(1, len, sr);
      const bData = bBuf.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + 0.03 * white) / 1.03;
        bData[i] = Math.max(-1, Math.min(1, lastOut * 3.4));
      }
      this.brownNoiseBuf = bBuf;
    }
  }

  private createNoiseSource(kind: 'white' | 'brown' = 'white'): AudioBufferSourceNode | null {
    if (!this.ctx) return null;
    if (!this.whiteNoiseBuf || !this.brownNoiseBuf) {
      this.ensureNoiseBuffers();
    }
    const buf = kind === 'brown' ? this.brownNoiseBuf : this.whiteNoiseBuf;
    if (!buf) return null;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    return src;
  }

  private startAmbience(): void {
    if (!this.ctx || !this.ambienceGain) return;
    this.ambienceStarted = true;
    this.ensureNoiseBuffers();

    // Ocean surf + wind noise loop (reusing pre-baked brown noise buffer)
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.brownNoiseBuf;
    noise.loop = true;

    this.surfFilter = this.ctx.createBiquadFilter();
    this.surfFilter.type = 'lowpass';
    this.surfFilter.frequency.value = 380;

    this.surfGain = this.ctx.createGain();
    this.surfGain.gain.value = 0.55;

    noise.connect(this.surfFilter);
    this.surfFilter.connect(this.surfGain);
    this.surfGain.connect(this.ambienceGain);
    noise.start();
    this.surfNoiseSrc = noise;

    // Rain hiss layer (reusing pre-baked white noise buffer)
    const rainSrc = this.ctx.createBufferSource();
    rainSrc.buffer = this.whiteNoiseBuf;
    rainSrc.loop = true;

    this.rainFilter = this.ctx.createBiquadFilter();
    this.rainFilter.type = 'bandpass';
    this.rainFilter.frequency.value = 2400;

    this.rainGain = this.ctx.createGain();
    this.rainGain.gain.value = 0.0;

    rainSrc.connect(this.rainFilter);
    this.rainFilter.connect(this.rainGain);
    this.rainGain.connect(this.ambienceGain);
    rainSrc.start();
    this.rainNoiseSrc = rainSrc;
  }

  public updateEnvironmentAmbience(
    time: number,
    shoreProximity: number,
    nearFire: boolean,
    weather: WeatherType,
    isDaylight: boolean,
    inForest: boolean,
  ): void {
    if (!this.ctx || !this.surfFilter || !this.surfGain || !this.rainGain) return;
    const now = this.ctx.currentTime;
    const wave = 0.5 + 0.5 * Math.sin(time * 0.55);
    const windBoost = weather === 'storm' ? 320 : weather === 'rain' ? 180 : 0;
    const baseFreq = 220 + shoreProximity * 420 + wave * 180 + windBoost;
    this.surfFilter.frequency.setTargetAtTime(baseFreq, now, 0.25);

    const targetGain = 0.25 + shoreProximity * 0.55 + (weather === 'storm' ? 0.35 : 0);
    this.surfGain.gain.setTargetAtTime(targetGain, now, 0.25);

    const rainTarget =
      weather === 'storm' ? 0.52 : weather === 'rain' ? 0.32 : 0.0;
    this.rainGain.gain.setTargetAtTime(rainTarget, now, 0.4);

    if (!this.ambienceEnabled) return;

    // Daytime birds in forest/shore
    if (isDaylight && weather !== 'storm' && time > this.nextBirdTime) {
      this.nextBirdTime = time + (inForest ? 2.8 : 5.5) + Math.random() * 4.5;
      this.playBirdChirp();
    }

    // Dusk/Night jungle insects
    if (!isDaylight && weather === 'clear' && time > this.nextInsectTime) {
      this.nextInsectTime = time + 2.2 + Math.random() * 3.0;
      this.playInsectChirp();
    }

    // Campfire crackle when nearby
    if (nearFire && time > this.nextFireCrackleTime) {
      this.nextFireCrackleTime = time + 0.25 + Math.random() * 0.55;
      this.playFireCrackle();
    }
  }

  private playBirdChirp(): void {
    if (!this.ctx || !this.ambienceGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const f = 1900 + Math.random() * 950;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f, now);
    osc.frequency.exponentialRampToValueAtTime(f * 1.32, now + 0.06);
    osc.frequency.exponentialRampToValueAtTime(f * 0.9, now + 0.14);
    g.gain.setValueAtTime(0.08, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(g);
    g.connect(this.ambienceGain);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  private playInsectChirp(): void {
    if (!this.ctx || !this.ambienceGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(4200, now);
    g.gain.setValueAtTime(0.035, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(g);
    g.connect(this.ambienceGain);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  private playFireCrackle(): void {
    if (!this.ctx || !this.ambienceGain) return;
    const now = this.ctx.currentTime;
    const src = this.createNoiseSource('white');
    if (!src) return;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1800;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.22, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    src.connect(hp);
    hp.connect(g);
    g.connect(this.ambienceGain);
    src.start(now, Math.random() * 2.5, 0.05);
  }

  public playThunder(): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const dur = 1.6;
    const src = this.createNoiseSource('brown');
    if (!src) return;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 160;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.55, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    src.connect(lp);
    lp.connect(g);
    g.connect(this.masterGain);
    src.start(now, Math.random() * 1.2, dur + 0.02);
  }

  public playFootstep(surface: 'sand' | 'grass' | 'rock' | 'water'): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    if (!this.whiteNoiseBuf || !this.brownNoiseBuf) this.ensureNoiseBuffers();
    const buffer = this.whiteNoiseBuf;
    if (!buffer) return;
    const now = this.ctx.currentTime;

    // Each step is built from cached noise, so walking never allocates buffers
    // or hits the network. Only the short-lived filter/gain nodes are new.
    const bus = this.ctx.createGain();
    bus.gain.value = 1;
    bus.connect(this.masterGain);

    const burst = (
      frequency: number,
      type: BiquadFilterType,
      q: number,
      peak: number,
      duration: number,
      delay = 0,
    ): void => {
      if (!this.ctx) return;
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      // Slight per-step pitch variation keeps repeated steps from sounding looped.
      noise.playbackRate.value = 0.92 + Math.random() * 0.18;
      const filter = this.ctx.createBiquadFilter();
      filter.type = type;
      filter.frequency.value = frequency;
      filter.Q.value = q;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now + delay);
      gain.gain.exponentialRampToValueAtTime(peak, now + delay + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + duration);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(bus);
      noise.start(now + delay, Math.random() * 2.2, duration + 0.02);
    };

    const thump = (frequency: number, peak: number, duration: number): void => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, now);
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(35, frequency * 0.5),
        now + duration,
      );
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(peak, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain);
      gain.connect(bus);
      osc.start(now);
      osc.stop(now + duration + 0.01);
    };

    switch (surface) {
      case 'grass':
        // Soft heel rustle with a second leaf-drag behind it.
        burst(720, 'lowpass', 0.7, 0.075, 0.075);
        burst(980, 'bandpass', 0.8, 0.035, 0.06, 0.035);
        break;
      case 'sand':
        // Bright, dry crunch with a little low settling weight.
        burst(1650, 'bandpass', 0.65, 0.085, 0.07);
        burst(950, 'lowpass', 0.7, 0.03, 0.09, 0.015);
        break;
      case 'rock':
        // Hard grit click plus a short heel thump.
        burst(1300, 'bandpass', 1.4, 0.1, 0.045);
        thump(120, 0.09, 0.07);
        break;
      case 'water':
        burst(1100, 'bandpass', 0.55, 0.12, 0.16);
        burst(700, 'lowpass', 0.6, 0.05, 0.2, 0.03);
        break;
    }
  }

  public playGather(kind: 'wood' | 'stone' | 'plant', progress = 0): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    if (kind === 'plant') {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(680, now + 0.08);
      g.gain.setValueAtTime(0.14, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.1);
      return;
    }

    if (kind === 'wood') {
      // Heavy axe thud + wood fiber snap
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      const baseFreq = 165 + progress * 45;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(54, now + 0.14);
      g.gain.setValueAtTime(0.28, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.15);

      // Crisp bark crack
      const src = this.createNoiseSource('white');
      if (src) {
        const bp = this.ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 1400;
        const ng = this.ctx.createGain();
        ng.gain.setValueAtTime(0.18, now);
        ng.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
        src.connect(bp);
        bp.connect(ng);
        ng.connect(this.masterGain);
        src.start(now, Math.random() * 2.5, 0.065);
      }
      return;
    }

    // Metallic pickaxe clink + stone chip
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1180 + progress * 220, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.09);
    g.gain.setValueAtTime(0.16, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.11);

    const src = this.createNoiseSource('white');
    if (src) {
      const hp = this.ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 950;
      const ng = this.ctx.createGain();
      ng.gain.setValueAtTime(0.15, now);
      ng.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      src.connect(hp);
      hp.connect(ng);
      ng.connect(this.masterGain);
      src.start(now, Math.random() * 2.5, 0.08);
    }
  }

  public playTreeFall(): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    // Timber creak
    const creak = this.ctx.createOscillator();
    const cg = this.ctx.createGain();
    creak.type = 'sawtooth';
    creak.frequency.setValueAtTime(145, now);
    creak.frequency.exponentialRampToValueAtTime(72, now + 0.55);
    cg.gain.setValueAtTime(0.14, now);
    cg.gain.exponentialRampToValueAtTime(0.001, now + 0.58);
    creak.connect(cg);
    cg.connect(this.masterGain);
    creak.start(now);
    creak.stop(now + 0.6);

    // Ground impact crash after 0.72s
    const dur = 0.42;
    const src = this.createNoiseSource('white');
    if (src) {
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 340;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.32, now + 0.72);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.72 + dur);
      src.connect(lp);
      lp.connect(g);
      g.connect(this.masterGain);
      src.start(now + 0.72, Math.random() * 2.0, dur + 0.02);
    }
  }

  public playRockBreak(): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const dur = 0.35;
    const src = this.createNoiseSource('white');
    if (!src) return;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 520;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.28, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    src.connect(bp);
    bp.connect(g);
    g.connect(this.masterGain);
    src.start(now, Math.random() * 2.2, dur + 0.02);
  }

  public playPickup(): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.exponentialRampToValueAtTime(760, now + 0.09);
    g.gain.setValueAtTime(0.14, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  public playWorkbenchCraft(): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    // Tactile mallet taps on wood
    [0, 0.22].forEach((offset) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now + offset);
      osc.frequency.exponentialRampToValueAtTime(88, now + offset + 0.08);
      g.gain.setValueAtTime(0.18, now + offset);
      g.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.09);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now + offset);
      osc.stop(now + offset + 0.1);
    });
  }

  public playDryFire(): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1450, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.035);
    g.gain.setValueAtTime(0.14, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.045);
  }

  public playReloadClick(isShell = false): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = isShell ? 'triangle' : 'square';
    osc.frequency.setValueAtTime(isShell ? 620 : 480, now);
    osc.frequency.exponentialRampToValueAtTime(isShell ? 1120 : 880, now + 0.065);
    g.gain.setValueAtTime(0.16, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  public playPortalFire(): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc2.type = 'triangle';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(1180, now + 0.16);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.34);
    osc2.frequency.setValueAtTime(420, now);
    osc2.frequency.exponentialRampToValueAtTime(1640, now + 0.22);
    g.gain.setValueAtTime(0.26, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    osc.connect(g);
    osc2.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc2.start(now);
    osc.stop(now + 0.39);
    osc2.stop(now + 0.39);
  }

  public playPortalWarp(): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    [220, 330, 440, 660].forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq * 0.75, now + idx * 0.03);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.9, now + 0.45);
      g.gain.setValueAtTime(0.14, now + idx * 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.62);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now + idx * 0.03);
      osc.stop(now + 0.65);
    });
  }

  public playPlasmaShot(): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const sub = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1480, now);
    osc.frequency.exponentialRampToValueAtTime(190, now + 0.16);
    sub.type = 'sine';
    sub.frequency.setValueAtTime(360, now);
    sub.frequency.exponentialRampToValueAtTime(75, now + 0.14);
    g.gain.setValueAtTime(0.28, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(g);
    sub.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    sub.start(now);
    osc.stop(now + 0.19);
    sub.stop(now + 0.19);
  }

  public playGunshot(
    profile: 'pistol' | 'shotgun' | 'smg' | 'rifle' | 'sniper' | 'lmg' | 'musket' | 'plasma' = 'pistol',
    weaponId?: string,
  ): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    if (profile === 'plasma') {
      this.playPlasmaShot();
      return;
    }
    const now = this.ctx.currentTime;
    const voice = weaponId ? GUN_VOICES[weaponId] : undefined;
    const pitch = voice?.pitch ?? 1;
    const weight = voice?.weight ?? 1;
    const bright = voice?.bright ?? 1;
    const tail = voice?.tail ?? 1;

    const isHeavy = profile === 'shotgun' || profile === 'sniper' || profile === 'musket';
    const isRapid = profile === 'smg';
    const noiseDur = (isHeavy ? 0.34 : isRapid ? 0.16 : 0.24) * tail;
    const noiseSource = this.createNoiseSource('white');
    if (noiseSource) {
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime((isHeavy ? 2600 : isRapid ? 4200 : 3400) * bright * pitch, now);
      filter.frequency.exponentialRampToValueAtTime((isHeavy ? 240 : 420) * bright, now + noiseDur * 0.9);
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime((isHeavy ? 0.65 : isRapid ? 0.42 : 0.55) * Math.sqrt(weight), now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + noiseDur);
      noiseSource.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.masterGain);
      noiseSource.start(now, Math.random() * 2.2, noiseDur + 0.02);
    }

    // Supersonic snap: a very short high-passed transient on top of the body.
    const snapSource = this.createNoiseSource('white');
    if (snapSource) {
      const snapFilter = this.ctx.createBiquadFilter();
      snapFilter.type = 'highpass';
      snapFilter.frequency.value = (isHeavy ? 2900 : isRapid ? 4100 : 3500) * bright;
      const snapGain = this.ctx.createGain();
      snapGain.gain.setValueAtTime((isHeavy ? 0.2 : 0.16) * Math.sqrt(weight), now);
      snapGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.042);
      snapSource.connect(snapFilter);
      snapFilter.connect(snapGain);
      snapGain.connect(this.masterGain);
      snapSource.start(now, Math.random() * 1.8, 0.05);
    }

    const crackOsc = this.ctx.createOscillator();
    const crackGain = this.ctx.createGain();
    crackOsc.type = 'sawtooth';
    crackOsc.frequency.setValueAtTime((isHeavy ? 520 : isRapid ? 960 : 780) * pitch, now);
    crackOsc.frequency.exponentialRampToValueAtTime((isHeavy ? 52 : 95) * pitch, now + 0.09);
    crackGain.gain.setValueAtTime((isHeavy ? 0.42 : 0.34) * Math.sqrt(weight), now);
    crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    crackOsc.connect(crackGain);
    crackGain.connect(this.masterGain);
    crackOsc.start(now);
    crackOsc.stop(now + 0.11);

    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime((isHeavy ? 115 : 145) / pitch, now);
    subOsc.frequency.exponentialRampToValueAtTime((isHeavy ? 26 : 36) / pitch, now + (isHeavy ? 0.3 : 0.22) * tail);
    subGain.gain.setValueAtTime((isHeavy ? 0.52 : 0.38) * weight, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + (isHeavy ? 0.32 : 0.23) * tail);
    subOsc.connect(subGain);
    subGain.connect(this.masterGain);
    subOsc.start(now);
    subOsc.stop(now + 0.36 * tail);

    // Outdoor slap-back tail, tuned per weapon so rifles roll and SMGs snap.
    const slap = this.createNoiseSource('brown');
    if (slap) {
      const slapFilter = this.ctx.createBiquadFilter();
      slapFilter.type = 'lowpass';
      slapFilter.frequency.value = 520 * bright;
      const slapGain = this.ctx.createGain();
      slapGain.gain.setValueAtTime(0.0001, now);
      slapGain.gain.setValueAtTime(0.0001, now + 0.09);
      slapGain.gain.exponentialRampToValueAtTime(0.16 * weight, now + 0.14);
      slapGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42 * tail);
      slap.connect(slapFilter);
      slapFilter.connect(slapGain);
      slapGain.connect(this.masterGain);
      slap.start(now + 0.095, Math.random() * 2.0, 0.5 * tail);
    }

    if (voice?.mech) this.playGunActionClick(now, voice.mech, weight);
  }

  /**
   * Short impact transient for a bullet landing nearby. Dirt gets a dry thud,
   * metal a ringing tick, and flesh a wet low-frequency slap.
   */
  public playBulletImpact(surface: 'dirt' | 'metal' | 'flesh' = 'dirt'): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const duration = surface === 'metal' ? 0.12 : surface === 'flesh' ? 0.085 : 0.075;
    const noise = this.createNoiseSource('white');
    if (noise) {
      const filter = this.ctx.createBiquadFilter();
      filter.type = surface === 'metal' ? 'bandpass' : 'lowpass';
      filter.frequency.value = surface === 'metal' ? 2450 : surface === 'flesh' ? 460 : 720;
      filter.Q.value = surface === 'metal' ? 2.8 : 0.7;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(surface === 'metal' ? 0.13 : 0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      noise.start(now, Math.random() * 2.2, duration + 0.01);
    }

    const thump = this.ctx.createOscillator();
    const thumpGain = this.ctx.createGain();
    thump.type = surface === 'metal' ? 'triangle' : 'sine';
    thump.frequency.setValueAtTime(surface === 'metal' ? 1900 : surface === 'flesh' ? 92 : 135, now);
    thump.frequency.exponentialRampToValueAtTime(surface === 'metal' ? 760 : 38, now + duration);
    thumpGain.gain.setValueAtTime(surface === 'metal' ? 0.07 : 0.13, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + duration + 0.02);
    thump.connect(thumpGain);
    thumpGain.connect(this.masterGain);
    thump.start(now);
    thump.stop(now + duration + 0.03);
  }

  /** Pump, bolt, cylinder or slide mechanics after the shot. */
  private playGunActionClick(
    now: number,
    kind: 'slide' | 'pump' | 'bolt' | 'revolver',
    weight: number,
  ): void {
    if (!this.ctx || !this.masterGain) return;
    const delay = kind === 'pump' ? 0.34 : kind === 'bolt' ? 0.44 : kind === 'revolver' ? 0.17 : 0.055;
    const gain = (kind === 'pump' ? 0.16 : kind === 'bolt' ? 0.14 : 0.09) * Math.max(0.7, weight);

    const noise = this.createNoiseSource('white');
    if (noise) {
      const hp = this.ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = kind === 'pump' ? 1300 : 1900;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, now + delay);
      g.gain.exponentialRampToValueAtTime(gain, now + delay + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.07);
      noise.connect(hp);
      hp.connect(g);
      g.connect(this.masterGain);
      noise.start(now + delay, Math.random() * 1.5, 0.09);
    }

    const metal = this.ctx.createOscillator();
    const metalGain = this.ctx.createGain();
    metal.type = 'triangle';
    metal.frequency.setValueAtTime(kind === 'bolt' ? 2350 : 2950, now + delay);
    metal.frequency.exponentialRampToValueAtTime(kind === 'pump' ? 900 : 1500, now + delay + 0.06);
    metalGain.gain.setValueAtTime(0.0001, now + delay);
    metalGain.gain.exponentialRampToValueAtTime(gain * 0.55, now + delay + 0.005);
    metalGain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.075);
    metal.connect(metalGain);
    metalGain.connect(this.masterGain);
    metal.start(now + delay);
    metal.stop(now + delay + 0.09);
  }

  private roarShaperCurve: Float32Array<ArrayBuffer> | null = null;

  private getRoarShaperCurve(): Float32Array<ArrayBuffer> {
    if (this.roarShaperCurve) return this.roarShaperCurve;
    const size = 1024;
    const curve = new Float32Array(new ArrayBuffer(size * 4));
    for (let i = 0; i < size; i++) {
      const x = (i / (size - 1)) * 2 - 1;
      // Asymmetric soft clip adds throat grit without turning into a buzz.
      curve[i] = Math.tanh(x * 3.4) * (0.78 + 0.22 * Math.sin(x * 9.1));
    }
    this.roarShaperCurve = curve;
    return curve;
  }

  private connectToOutput(node: AudioNode, pan: number): void {
    if (!this.ctx || !this.masterGain) return;
    const clamped = Math.max(-1, Math.min(1, pan));
    if (Math.abs(clamped) < 0.02) {
      node.connect(this.masterGain);
      return;
    }
    const panner = this.ctx.createStereoPanner();
    panner.pan.value = clamped;
    node.connect(panner);
    panner.connect(this.masterGain);
  }

  /**
   * Layered dragon roar: chest sub, distorted throat growl, breath rasp through
   * moving formant filters and a long tail. Each variant has its own register.
   */
  public playDragonRoar(
    volume = 0.8,
    variant: 'ember' | 'storm' | 'shadow' = 'ember',
    pan = 0,
  ): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const level = Math.max(0.03, Math.min(1, volume));
    const register = variant === 'storm' ? 1.16 : variant === 'shadow' ? 0.84 : 1;
    const now = this.ctx.currentTime;
    const duration = 1.9 + level * 0.7;

    const output = this.ctx.createGain();
    output.gain.setValueAtTime(0.0001, now);
    output.gain.exponentialRampToValueAtTime(0.32 * level, now + 0.16);
    output.gain.exponentialRampToValueAtTime(0.24 * level, now + duration * 0.42);
    output.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    this.connectToOutput(output, pan);

    const shaper = this.ctx.createWaveShaper();
    shaper.curve = this.getRoarShaperCurve();
    shaper.oversample = '2x';

    // Throat formant makes it an animal vocal tract rather than a synth sweep.
    const formant = this.ctx.createBiquadFilter();
    formant.type = 'bandpass';
    formant.frequency.setValueAtTime(430 * register, now);
    formant.frequency.exponentialRampToValueAtTime(610 * register, now + 0.42);
    formant.frequency.exponentialRampToValueAtTime(300 * register, now + duration);
    formant.Q.value = 4.6;
    shaper.connect(formant);
    formant.connect(output);

    const growl = this.ctx.createOscillator();
    growl.type = 'sawtooth';
    growl.frequency.setValueAtTime(74 * register, now);
    growl.frequency.exponentialRampToValueAtTime(52 * register, now + 0.34);
    growl.frequency.exponentialRampToValueAtTime(33 * register, now + duration);
    growl.connect(shaper);

    const rasp = this.ctx.createOscillator();
    rasp.type = 'sawtooth';
    rasp.detune.value = 11;
    rasp.frequency.setValueAtTime(101 * register, now);
    rasp.frequency.exponentialRampToValueAtTime(69 * register, now + 0.6);
    rasp.frequency.exponentialRampToValueAtTime(41 * register, now + duration);
    rasp.connect(shaper);

    const vibrato = this.ctx.createOscillator();
    const vibratoGain = this.ctx.createGain();
    vibrato.type = 'sine';
    vibrato.frequency.value = 5.6 + level * 1.8;
    vibratoGain.gain.value = 6.5;
    vibrato.connect(vibratoGain);
    vibratoGain.connect(growl.frequency);
    vibratoGain.connect(rasp.frequency);

    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(46 * register, now);
    sub.frequency.exponentialRampToValueAtTime(24 * register, now + duration);
    subGain.gain.setValueAtTime(0.0001, now);
    subGain.gain.exponentialRampToValueAtTime(0.5 * level, now + 0.18);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.9);
    sub.connect(subGain);
    subGain.connect(output);

    // Nostril / lung rasp.
    const noise = this.createNoiseSource('brown');
    if (noise) {
      const breath = this.ctx.createBiquadFilter();
      breath.type = 'bandpass';
      breath.frequency.setValueAtTime(280 * register, now);
      breath.frequency.exponentialRampToValueAtTime(900 * register, now + 0.3);
      breath.frequency.exponentialRampToValueAtTime(220 * register, now + duration);
      breath.Q.value = 0.9;
      const breathGain = this.ctx.createGain();
      breathGain.gain.setValueAtTime(0.0001, now);
      breathGain.gain.exponentialRampToValueAtTime(0.2 * level, now + 0.22);
      breathGain.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.85);
      noise.connect(breath);
      breath.connect(breathGain);
      breathGain.connect(output);
      noise.start(now, Math.random() * 2.0, duration + 0.05);
    }

    growl.start(now);
    rasp.start(now);
    vibrato.start(now);
    sub.start(now);
    growl.stop(now + duration + 0.02);
    rasp.stop(now + duration + 0.02);
    vibrato.stop(now + duration + 0.02);
    sub.stop(now + duration + 0.02);
  }

  /** Heavy leathery wing beat whoosh with a low body thump. */
  public playDragonWingbeat(volume = 0.6, pan = 0): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const level = Math.max(0.03, Math.min(1, volume));
    const now = this.ctx.currentTime;
    const output = this.ctx.createGain();
    output.gain.setValueAtTime(0.0001, now);
    output.gain.exponentialRampToValueAtTime(0.22 * level, now + 0.06);
    output.gain.exponentialRampToValueAtTime(0.0001, now + 0.62);
    this.connectToOutput(output, pan);

    const noise = this.createNoiseSource('white');
    if (noise) {
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(950, now);
      filter.frequency.exponentialRampToValueAtTime(170, now + 0.5);
      filter.Q.value = 0.7;
      noise.connect(filter);
      filter.connect(output);
      noise.start(now, Math.random() * 1.5, 0.66);
    }

    const thump = this.ctx.createOscillator();
    const thumpGain = this.ctx.createGain();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(62, now);
    thump.frequency.exponentialRampToValueAtTime(30, now + 0.34);
    thumpGain.gain.setValueAtTime(0.0001, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.4 * level, now + 0.03);
    thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);
    thump.connect(thumpGain);
    thumpGain.connect(output);
    thump.start(now);
    thump.stop(now + 0.38);
  }

  public playAttack(weaponType: 'melee' | 'bow' | 'whip' | 'cast' | 'gun'): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    if (weaponType === 'gun') {
      this.playGunshot('pistol');
      return;
    }

    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    if (weaponType === 'bow') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.18);
      g.gain.setValueAtTime(0.22, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (weaponType === 'whip') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(900, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.11);
      g.gain.setValueAtTime(0.2, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.12);
    } else {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(95, now + 0.12);
      g.gain.setValueAtTime(0.18, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.12);
    }
  }

  public playCraftSuccess(): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    [392, 523.25, 659.25].forEach((freq, i) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.06);
      g.gain.setValueAtTime(0.14, now + i * 0.06);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.18);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.2);
    });
  }

  public playCookSizzle(): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const dur = 0.45;
    const src = this.createNoiseSource('white');
    if (!src) return;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 2800;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.12, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.masterGain);
    src.start(now, Math.random() * 2.0, dur + 0.02);
  }

  public playPrepareCarcass(): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    // 1. Blade slicing butcher carve noise burst
    const dur = 0.22;
    const src = this.createNoiseSource('white');
    if (src) {
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(3200, now);
      filter.frequency.exponentialRampToValueAtTime(1200, now + dur);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(0.18, now + dur * 0.35);
      g.gain.exponentialRampToValueAtTime(0.001, now + dur);
      src.connect(filter);
      filter.connect(g);
      g.connect(this.masterGain);
      src.start(now, Math.random() * 2.2, dur + 0.02);
    }

    // 2. Meat harvest chime tone
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.26);
    oscGain.gain.setValueAtTime(0.14, now + 0.08);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(now + 0.08);
    osc.stop(now + 0.33);
  }

  public playDrink(): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    [320, 460].forEach((freq, i) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.1);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.35, now + i * 0.1 + 0.08);
      g.gain.setValueAtTime(0.15, now + i * 0.1);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.1);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.11);
    });
  }

  public playEat(): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    // Two soft chewing crunches + nourishment chime
    [0, 0.13].forEach((offset) => {
      if (!this.ctx || !this.masterGain) return;
      const dur = 0.08;
      const src = this.createNoiseSource('white');
      if (!src) return;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1100;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.14, now + offset);
      g.gain.exponentialRampToValueAtTime(0.001, now + offset + dur);
      src.connect(filter);
      filter.connect(g);
      g.connect(this.masterGain);
      src.start(now + offset, Math.random() * 2.5, dur + 0.01);
    });
  }

  public playWashBottle(): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    // Ocean surf slosh + rinse bubbles
    [0, 0.24].forEach((offset) => {
      if (!this.ctx || !this.masterGain) return;
      const dur = 0.22;
      const src = this.createNoiseSource('white');
      if (!src) return;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(680 + offset * 900, now + offset);
      bp.frequency.exponentialRampToValueAtTime(1650, now + offset + dur);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.001, now + offset);
      g.gain.linearRampToValueAtTime(0.18, now + offset + dur * 0.4);
      g.gain.exponentialRampToValueAtTime(0.001, now + offset + dur);
      src.connect(bp);
      bp.connect(g);
      g.connect(this.masterGain);
      src.start(now + offset, Math.random() * 2.2, dur + 0.02);
    });
    // Clean filtered water chime
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + 0.48 + i * 0.07);
      g.gain.setValueAtTime(0.11, now + 0.48 + i * 0.07);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.48 + i * 0.07 + 0.22);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now + 0.48 + i * 0.07);
      osc.stop(now + 0.48 + i * 0.07 + 0.24);
    });
  }

  public playWashScrubMeat(): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    // Rhythmic soapy scrubbing strokes in lake water
    [0, 0.24, 0.48, 0.72, 0.96].forEach((offset, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const dur = 0.16;
      const src = this.createNoiseSource('white');
      if (!src) return;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      const baseFreq = idx % 2 === 0 ? 1150 : 1550;
      bp.frequency.setValueAtTime(baseFreq, now + offset);
      bp.frequency.exponentialRampToValueAtTime(baseFreq * 1.45, now + offset + dur);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.001, now + offset);
      g.gain.linearRampToValueAtTime(0.21, now + offset + dur * 0.4);
      g.gain.exponentialRampToValueAtTime(0.001, now + offset + dur);
      src.connect(bp);
      bp.connect(g);
      g.connect(this.masterGain);
      src.start(now + offset, Math.random() * 2.2, dur + 0.02);
    });
    // Final lake rinse splash + fresh chime
    const splashDur = 0.32;
    const sSrc = this.createNoiseSource('white');
    if (sSrc) {
      const sBp = this.ctx.createBiquadFilter();
      sBp.type = 'lowpass';
      sBp.frequency.setValueAtTime(1400, now + 1.28);
      const sg = this.ctx.createGain();
      sg.gain.setValueAtTime(0.2, now + 1.28);
      sg.gain.exponentialRampToValueAtTime(0.001, now + 1.28 + splashDur);
      sSrc.connect(sBp);
      sBp.connect(sg);
      sg.connect(this.masterGain);
      sSrc.start(now + 1.28, Math.random() * 2.2, splashDur + 0.02);
    }

    [587.33, 739.99, 880].forEach((freq, i) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + 1.48 + i * 0.07);
      g.gain.setValueAtTime(0.1, now + 1.48 + i * 0.07);
      g.gain.exponentialRampToValueAtTime(0.001, now + 1.48 + i * 0.07 + 0.2);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now + 1.48 + i * 0.07);
      osc.stop(now + 1.48 + i * 0.07 + 0.22);
    });
  }

  public playKnifeCutMeat(): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    // 3 crisp knife-slicing strokes through dried meat
    [0.14, 0.56, 0.98].forEach((offset) => {
      if (!this.ctx || !this.masterGain) return;
      const dur = 0.14;
      const src = this.createNoiseSource('white');
      if (src) {
        const hp = this.ctx.createBiquadFilter();
        hp.type = 'bandpass';
        hp.frequency.setValueAtTime(2600, now + offset);
        hp.frequency.exponentialRampToValueAtTime(900, now + offset + dur);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.24, now + offset);
        g.gain.exponentialRampToValueAtTime(0.001, now + offset + dur);
        src.connect(hp);
        hp.connect(g);
        g.connect(this.masterGain);
        src.start(now + offset, Math.random() * 2.2, dur + 0.02);
      }

      // Subtle knife-to-board tap at end of slice
      const tap = this.ctx.createOscillator();
      const tapGain = this.ctx.createGain();
      tap.type = 'triangle';
      tap.frequency.setValueAtTime(160, now + offset + 0.09);
      tap.frequency.exponentialRampToValueAtTime(75, now + offset + 0.15);
      tapGain.gain.setValueAtTime(0.14, now + offset + 0.09);
      tapGain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.16);
      tap.connect(tapGain);
      tapGain.connect(this.masterGain);
      tap.start(now + offset + 0.09);
      tap.stop(now + offset + 0.17);
    });
  }

  public playScavengerBite(dist: number, isBird: boolean): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain || dist > 38) return;
    const volScale = Math.max(0.12, 1 - dist / 38);
    const now = this.ctx.currentTime;
    const dur = isBird ? 0.055 : 0.14;
    const src = this.createNoiseSource('white');
    if (!src) return;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = isBird ? 2100 : 620;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.14 * volScale, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    src.connect(bp);
    bp.connect(g);
    g.connect(this.masterGain);
    src.start(now, Math.random() * 2.5, dur + 0.01);
  }

  public playCreatureCall(species: CreatureSpecies, volumeScale = 1): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const vol = Math.min(0.28, 0.2 * volumeScale);

    if (species === 'trex') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(115, now);
      osc.frequency.exponentialRampToValueAtTime(48, now + 0.75);
      g.gain.setValueAtTime(vol, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.82);
    } else if (species === 'velociraptor') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(620, now);
      osc.frequency.exponentialRampToValueAtTime(340, now + 0.22);
      g.gain.setValueAtTime(vol * 0.7, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (species === 'dolphin') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1100, now);
      osc.frequency.exponentialRampToValueAtTime(1750, now + 0.08);
      osc.frequency.exponentialRampToValueAtTime(980, now + 0.22);
      g.gain.setValueAtTime(vol * 0.7, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.26);
    } else if (species === 'cattle' || species === 'goat' || species === 'sheep') {
      osc.type = 'sawtooth';
      const startF = species === 'cattle' ? 132 : species === 'sheep' ? 235 : 310;
      const endF = species === 'cattle' ? 102 : species === 'sheep' ? 195 : 255;
      osc.frequency.setValueAtTime(startF, now);
      osc.frequency.linearRampToValueAtTime(endF, now + 0.38);
      g.gain.setValueAtTime(vol * 0.55, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.44);
    } else if (species === 'horse') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.14);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.46);
      g.gain.setValueAtTime(vol * 0.52, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.5);
    } else if (species === 'wild_boar' || species === 'pig') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(species === 'pig' ? 195 : 175, now);
      osc.frequency.exponentialRampToValueAtTime(105, now + 0.18);
      g.gain.setValueAtTime(vol * 0.6, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.21);
    } else if (species === 'duck') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.exponentialRampToValueAtTime(310, now + 0.16);
      g.gain.setValueAtTime(vol * 0.35, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.19);
    } else if (species === 'barn_cat') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(540, now);
      osc.frequency.exponentialRampToValueAtTime(760, now + 0.12);
      osc.frequency.exponentialRampToValueAtTime(490, now + 0.32);
      g.gain.setValueAtTime(vol * 0.4, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (species === 'bird' || species === 'jungle_fowl') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(species === 'jungle_fowl' ? 680 : 920, now);
      osc.frequency.exponentialRampToValueAtTime(
        species === 'jungle_fowl' ? 1050 : 1320,
        now + 0.14,
      );
      g.gain.setValueAtTime(vol * 0.45, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.19);
    } else if (species === 'grizzly_bear') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(108, now);
      osc.frequency.exponentialRampToValueAtTime(62, now + 0.55);
      g.gain.setValueAtTime(vol * 0.82, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.58);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.6);
    } else if (species === 'gray_wolf') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(290, now);
      osc.frequency.exponentialRampToValueAtTime(510, now + 0.24);
      osc.frequency.exponentialRampToValueAtTime(340, now + 0.85);
      g.gain.setValueAtTime(vol * 0.65, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.92);
    } else if (species === 'african_lion') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(128, now);
      osc.frequency.exponentialRampToValueAtTime(58, now + 0.68);
      g.gain.setValueAtTime(vol * 0.88, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.72);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.74);
    } else if (species === 'bald_eagle') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2150, now);
      osc.frequency.exponentialRampToValueAtTime(1480, now + 0.28);
      g.gain.setValueAtTime(vol * 0.42, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.32);
    } else if (species === 'red_fox') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(760, now);
      osc.frequency.exponentialRampToValueAtTime(1120, now + 0.08);
      osc.frequency.exponentialRampToValueAtTime(540, now + 0.2);
      g.gain.setValueAtTime(vol * 0.48, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.24);
    } else if (species === 'saltwater_crocodile') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(72, now);
      osc.frequency.linearRampToValueAtTime(54, now + 0.48);
      g.gain.setValueAtTime(vol * 0.78, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.52);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.54);
    } else if (species === 'bison') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(98, now);
      osc.frequency.exponentialRampToValueAtTime(74, now + 0.42);
      g.gain.setValueAtTime(vol * 0.68, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.47);
    } else if (species === 'great_horned_owl') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.setValueAtTime(360, now + 0.26);
      g.gain.setValueAtTime(vol * 0.48, now);
      g.gain.setValueAtTime(0.001, now + 0.18);
      g.gain.setValueAtTime(vol * 0.45, now + 0.26);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.52);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.54);
    } else if (species === 'deer' || species === 'reindeer' || species === 'moose' || species === 'parasaurolophus') {
      osc.type = 'triangle';
      const startF = species === 'moose' ? 145 : species === 'reindeer' ? 210 : 240;
      const endF = species === 'moose' ? 92 : 160;
      osc.frequency.setValueAtTime(startF, now);
      osc.frequency.exponentialRampToValueAtTime(endF, now + 0.44);
      g.gain.setValueAtTime(vol * 0.62, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.46);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.48);
    } else if (species === 'elephant') {
      // Resonant brassy elephant trumpet
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(510, now + 0.18);
      osc.frequency.exponentialRampToValueAtTime(260, now + 0.65);
      g.gain.setValueAtTime(vol * 0.85, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.68);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.7);
    } else if (species === 'tiger' || species === 'polar_bear' || species === 'spinosaurus' || species === 'allosaurus') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(species === 'spinosaurus' ? 98 : 138, now);
      osc.frequency.exponentialRampToValueAtTime(52, now + 0.72);
      g.gain.setValueAtTime(vol * 0.86, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.77);
    } else if (species === 'cheetah' || species === 'hyena' || species === 'dilophosaurus') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(species === 'hyena' ? 480 : 690, now);
      osc.frequency.exponentialRampToValueAtTime(species === 'hyena' ? 820 : 380, now + 0.18);
      osc.frequency.exponentialRampToValueAtTime(290, now + 0.34);
      g.gain.setValueAtTime(vol * 0.56, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.38);
    } else if (species === 'pteranodon' || species === 'peregrine_falcon') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(species === 'pteranodon' ? 1480 : 2350, now);
      osc.frequency.exponentialRampToValueAtTime(species === 'pteranodon' ? 920 : 1620, now + 0.32);
      g.gain.setValueAtTime(vol * 0.45, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.36);
    } else if (species === 'toucan' || species === 'flamingo' || species === 'penguin' || species === 'ostrich') {
      osc.type = 'triangle';
      const f1 = species === 'toucan' ? 880 : species === 'flamingo' ? 580 : species === 'penguin' ? 620 : 185;
      const f2 = species === 'toucan' ? 460 : species === 'flamingo' ? 410 : species === 'penguin' ? 740 : 120;
      osc.frequency.setValueAtTime(f1, now);
      osc.frequency.exponentialRampToValueAtTime(f2, now + 0.22);
      g.gain.setValueAtTime(vol * 0.44, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.26);
    } else if (species === 'rhinoceros' || species === 'hippopotamus' || species === 'gorilla') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(92, now);
      osc.frequency.exponentialRampToValueAtTime(56, now + 0.44);
      g.gain.setValueAtTime(vol * 0.72, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.46);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.48);
    } else if (species === 'creaking') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(148, now);
      osc.frequency.linearRampToValueAtTime(96, now + 0.16);
      osc.frequency.linearRampToValueAtTime(172, now + 0.36);
      g.gain.setValueAtTime(vol * 0.52, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.44);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.46);
    } else if (species === 'bee') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(245, now + 0.25);
      g.gain.setValueAtTime(vol * 0.18, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (species === 'parrot' || species === 'white_fox' || species === 'ocelot' || species === 'panda') {
      osc.type = species === 'panda' ? 'sine' : 'triangle';
      const f1 = species === 'parrot' ? 1240 : species === 'white_fox' ? 840 : species === 'ocelot' ? 620 : 185;
      const f2 = species === 'parrot' ? 860 : species === 'white_fox' ? 580 : species === 'ocelot' ? 760 : 145;
      osc.frequency.setValueAtTime(f1, now);
      osc.frequency.exponentialRampToValueAtTime(f2, now + 0.22);
      g.gain.setValueAtTime(vol * 0.4, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.27);
    } else if (species === 'vex') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(980, now);
      osc.frequency.exponentialRampToValueAtTime(1420, now + 0.14);
      osc.frequency.exponentialRampToValueAtTime(720, now + 0.28);
      g.gain.setValueAtTime(vol * 0.34, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.32);
    } else if (species === 'evoker' || species === 'pillager') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(species === 'evoker' ? 230 : 175, now);
      osc.frequency.linearRampToValueAtTime(species === 'evoker' ? 295 : 142, now + 0.14);
      osc.frequency.linearRampToValueAtTime(species === 'evoker' ? 190 : 162, now + 0.34);
      g.gain.setValueAtTime(vol * 0.56, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.4);
    } else if (species === 'witch') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.linearRampToValueAtTime(780, now + 0.08);
      osc.frequency.linearRampToValueAtTime(460, now + 0.18);
      osc.frequency.linearRampToValueAtTime(710, now + 0.28);
      g.gain.setValueAtTime(vol * 0.42, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.36);
    } else {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.35);
      g.gain.setValueAtTime(vol * 0.65, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.38);
    }
  }

  public playHurt(): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(65, now + 0.18);
    g.gain.setValueAtTime(0.24, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  public playExplosion(): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const dur = 1.2;
    const src = this.createNoiseSource('brown');
    if (src) {
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(520, now);
      filter.frequency.exponentialRampToValueAtTime(90, now + dur);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.65, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + dur);
      src.connect(filter);
      filter.connect(g);
      g.connect(this.masterGain);
      src.start(now, Math.random() * 1.5, dur + 0.02);
    }

    // Sub-bass punch
    const osc = this.ctx.createOscillator();
    const og = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 0.45);
    og.gain.setValueAtTime(0.55, now);
    og.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
    osc.connect(og);
    og.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.5);
  }

  public playCannonBoom(): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const dur = 0.95;
    const src = this.createNoiseSource('brown');
    if (src) {
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(640, now);
      lp.frequency.exponentialRampToValueAtTime(75, now + dur);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.58, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + dur);
      src.connect(lp);
      lp.connect(g);
      g.connect(this.masterGain);
      src.start(now, Math.random() * 1.2, dur + 0.02);
    }

    const osc = this.ctx.createOscillator();
    const og = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(145, now);
    osc.frequency.exponentialRampToValueAtTime(34, now + 0.36);
    og.gain.setValueAtTime(0.62, now);
    og.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(og);
    og.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.42);
  }

  public playOceanSplash(): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const dur = 0.9;
    const src = this.createNoiseSource('white');
    if (src) {
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(1600, now);
      bp.frequency.exponentialRampToValueAtTime(340, now + dur);
      bp.Q.value = 0.7;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.45, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + dur);
      src.connect(bp);
      bp.connect(g);
      g.connect(this.masterGain);
      src.start(now, Math.random() * 1.4, dur + 0.02);
    }

    const thump = this.ctx.createOscillator();
    const tg = this.ctx.createGain();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(120, now);
    thump.frequency.exponentialRampToValueAtTime(42, now + 0.22);
    tg.gain.setValueAtTime(0.32, now);
    tg.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    thump.connect(tg);
    tg.connect(this.masterGain);
    thump.start(now);
    thump.stop(now + 0.26);
  }

  public playStructuralCreak(): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(95, now);
    osc.frequency.linearRampToValueAtTime(62, now + 0.28);
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 340;
    g.gain.setValueAtTime(0.18, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(bp);
    bp.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.32);
  }

  public playCollapseCrash(): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const dur = 0.72;
    const src = this.createNoiseSource('white');
    if (!src) return;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(750, now);
    lp.frequency.exponentialRampToValueAtTime(160, now + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.42, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    src.connect(lp);
    lp.connect(g);
    g.connect(this.masterGain);
    src.start(now, Math.random() * 2.0, dur + 0.02);
  }

  public playDigSoil(): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const dur = 0.16;
    const src = this.createNoiseSource('white');
    if (!src) return;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 460;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.28, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    src.connect(bp);
    bp.connect(g);
    g.connect(this.masterGain);
    src.start(now, Math.random() * 2.4, dur + 0.02);
  }

  public playWaterRush(): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const dur = 0.85;
    const src = this.createNoiseSource('white');
    if (!src) return;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(980, now);
    bp.frequency.linearRampToValueAtTime(620, now + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.25, now + dur * 0.4);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    src.connect(bp);
    bp.connect(g);
    g.connect(this.masterGain);
    src.start(now, Math.random() * 1.8, dur + 0.02);
  }

  public playArmorShatter(): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const dur = 0.42;
    const src = this.createNoiseSource('white');
    if (src) {
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(1450, now);
      bp.frequency.exponentialRampToValueAtTime(320, now + dur);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.42, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + dur);
      src.connect(bp);
      bp.connect(g);
      g.connect(this.masterGain);
      src.start(now, Math.random() * 2.2, dur + 0.02);
    }

    const osc = this.ctx.createOscillator();
    const og = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(175, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.26);
    og.gain.setValueAtTime(0.38, now);
    og.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.connect(og);
    og.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  public playArmorDeflect(): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1620, now);
    osc.frequency.exponentialRampToValueAtTime(2480, now + 0.06);
    osc.frequency.exponentialRampToValueAtTime(980, now + 0.19);
    g.gain.setValueAtTime(0.22, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.21);
  }

  public playBladeGapCrit(): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(920, now);
    osc.frequency.exponentialRampToValueAtTime(340, now + 0.14);
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 600;
    g.gain.setValueAtTime(0.24, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(hp);
    hp.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  public playDebrisKick(): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const dur = 0.22;
    const src = this.createNoiseSource('white');
    if (src) {
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(780, now);
      bp.frequency.exponentialRampToValueAtTime(1600, now + dur);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.32, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + dur);
      src.connect(bp);
      bp.connect(g);
      g.connect(this.masterGain);
      src.start(now, Math.random() * 2.2, dur + 0.02);
    }

    const osc = this.ctx.createOscillator();
    const og = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(155, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.12);
    og.gain.setValueAtTime(0.28, now);
    og.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    osc.connect(og);
    og.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  public playWallRunStep(): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220 + Math.random() * 50, now);
    osc.frequency.exponentialRampToValueAtTime(95, now + 0.06);
    g.gain.setValueAtTime(0.14, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  public playCeilingCollapse(): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const dur = 1.45;
    const src = this.createNoiseSource('brown');
    if (src) {
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(640, now);
      filter.frequency.exponentialRampToValueAtTime(110, now + dur);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.62, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + dur);
      src.connect(filter);
      filter.connect(g);
      g.connect(this.masterGain);
      src.start(now, Math.random() * 1.4, dur + 0.02);
    }

    const osc = this.ctx.createOscillator();
    const og = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(92, now);
    osc.frequency.exponentialRampToValueAtTime(24, now + 0.65);
    og.gain.setValueAtTime(0.55, now);
    og.gain.exponentialRampToValueAtTime(0.001, now + 0.68);
    osc.connect(og);
    og.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.7);
  }

  public playWeldSnap(): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const clank = this.ctx.createOscillator();
    const cg = this.ctx.createGain();
    clank.type = 'triangle';
    clank.frequency.setValueAtTime(620, now);
    clank.frequency.exponentialRampToValueAtTime(190, now + 0.09);
    cg.gain.setValueAtTime(0.24, now);
    cg.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    clank.connect(cg);
    cg.connect(this.masterGain);
    clank.start(now);
    clank.stop(now + 0.12);

    const dur = 0.12;
    const src = this.createNoiseSource('white');
    if (src) {
      const hp = this.ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 1800;
      const hg = this.ctx.createGain();
      hg.gain.setValueAtTime(0.16, now);
      hg.gain.exponentialRampToValueAtTime(0.001, now + dur);
      src.connect(hp);
      hp.connect(hg);
      hg.connect(this.masterGain);
      src.start(now, Math.random() * 2.5, dur + 0.02);
    }
  }

  public playKineticGearTick(): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.05);
    g.gain.setValueAtTime(0.08, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  public playSteamHiss(): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const dur = 0.32;
    const src = this.createNoiseSource('white');
    if (!src) return;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2600;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.14, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    src.connect(bp);
    bp.connect(g);
    g.connect(this.masterGain);
    src.start(now, Math.random() * 2.2, dur + 0.02);
  }

  /** Deep marine horn for the Crescent Star: two detuned reeds under a low-pass. */
  public playFerryHorn(): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const duration = 1.6;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(760, now);
    filter.frequency.exponentialRampToValueAtTime(420, now + duration);
    filter.Q.value = 1.4;
    const hornGain = this.ctx.createGain();
    hornGain.gain.setValueAtTime(0.0001, now);
    hornGain.gain.exponentialRampToValueAtTime(0.3, now + 0.14);
    hornGain.gain.setValueAtTime(0.3, now + 1.05);
    hornGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    filter.connect(hornGain);
    hornGain.connect(this.masterGain);

    const voices: readonly [number, OscillatorType][] = [
      [98, 'sawtooth'],
      [123.5, 'sawtooth'],
      [196, 'square'],
    ];
    for (let i = 0; i < voices.length; i++) {
      const [freq, type] = voices[i];
      const osc = this.ctx.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.linearRampToValueAtTime(freq * 1.012, now + 0.9);
      osc.frequency.linearRampToValueAtTime(freq * 0.995, now + duration);
      const voiceGain = this.ctx.createGain();
      voiceGain.gain.value = i === 2 ? 0.45 : 0.8;
      osc.connect(voiceGain);
      voiceGain.connect(filter);
      osc.start(now);
      osc.stop(now + duration + 0.05);
    }
  }

  /** Low diesel rumble and starter whine when the Crescent Star's engines turn over. */
  public playFerryEngineStart(): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const duration = 2.4;
    const rumble = this.ctx.createOscillator();
    const rumbleGain = this.ctx.createGain();
    rumble.type = 'sawtooth';
    rumble.frequency.setValueAtTime(28, now);
    rumble.frequency.linearRampToValueAtTime(44, now + 0.9);
    rumble.frequency.linearRampToValueAtTime(38, now + duration);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 180;
    rumbleGain.gain.setValueAtTime(0.0001, now);
    rumbleGain.gain.exponentialRampToValueAtTime(0.26, now + 0.7);
    rumbleGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    rumble.connect(lp);
    lp.connect(rumbleGain);
    rumbleGain.connect(this.masterGain);
    rumble.start(now);
    rumble.stop(now + duration + 0.05);

    const starter = this.ctx.createOscillator();
    const starterGain = this.ctx.createGain();
    starter.type = 'square';
    starter.frequency.setValueAtTime(150, now);
    starter.frequency.exponentialRampToValueAtTime(62, now + 0.85);
    starterGain.gain.setValueAtTime(0.07, now);
    starterGain.gain.exponentialRampToValueAtTime(0.0005, now + 0.9);
    starter.connect(starterGain);
    starterGain.connect(this.masterGain);
    starter.start(now);
    starter.stop(now + 0.95);
  }

  /** Dies down from a marine diesel rumble to silence as the engines stop. */
  public playFerryEngineStop(): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const duration = 1.8;
    const rumble = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(220, now);
    lp.frequency.exponentialRampToValueAtTime(90, now + duration);
    rumble.type = 'sawtooth';
    rumble.frequency.setValueAtTime(42, now);
    rumble.frequency.exponentialRampToValueAtTime(18, now + duration);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.16, now + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    rumble.connect(lp);
    lp.connect(g);
    g.connect(this.masterGain);
    rumble.start(now);
    rumble.stop(now + duration + 0.05);
  }

  /** Twin turboprop drone that runs for the whole Crescent Clipper flight. */
  public startJetEngines(): boolean {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain || this.jetEngineNodes) return false;
    const now = this.ctx.currentTime;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.connect(this.masterGain);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 820;
    filter.Q.value = 0.7;
    filter.connect(gain);

    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.value = 54;
    osc1.connect(filter);
    osc1.start(now);

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.value = 108;
    osc2.connect(filter);
    osc2.start(now);

    const noise = this.createNoiseSource('brown');
    if (noise) {
      noise.loop = true;
      noise.connect(filter);
      noise.start(now);
    }

    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.9);
    this.jetEngineNodes = { osc1, osc2, noise, filter, gain };
    return true;
  }

  public updateJetEngines(intensity: number, speedRatio: number): void {
    const nodes = this.jetEngineNodes;
    if (!nodes || !this.ctx) return;
    const now = this.ctx.currentTime;
    const power = Math.max(0, Math.min(1, intensity));
    const speed = Math.max(0, Math.min(1, speedRatio));
    nodes.osc1.frequency.setTargetAtTime(52 + power * 26 + speed * 22, now, 0.1);
    nodes.osc2.frequency.setTargetAtTime(104 + power * 52 + speed * 44, now, 0.1);
    nodes.filter.frequency.setTargetAtTime(760 + power * 900 + speed * 700, now, 0.12);
    nodes.gain.gain.setTargetAtTime(0.055 + power * 0.075, now, 0.14);
  }

  public stopJetEngines(): void {
    const nodes = this.jetEngineNodes;
    if (!nodes || !this.ctx) return;
    const now = this.ctx.currentTime;
    nodes.gain.gain.cancelScheduledValues(now);
    nodes.gain.gain.setTargetAtTime(0.0001, now, 0.1);
    for (const node of [nodes.osc1, nodes.osc2]) {
      try {
        node.stop(now + 0.45);
      } catch {
        // Ignore already stopped oscillators.
      }
    }
    try {
      nodes.noise?.stop(now + 0.45);
    } catch {
      // Ignore already stopped noise sources.
    }
    this.jetEngineNodes = null;
  }

  public playHydraulicHop(kind: 'hop' | 'tilt' | 'lock'): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // Electric hydraulic pump whine
    const pump = this.ctx.createOscillator();
    const pg = this.ctx.createGain();
    pump.type = 'sawtooth';
    const startF = kind === 'lock' ? 280 : kind === 'hop' ? 240 : 210;
    const peakF = kind === 'lock' ? 620 : kind === 'hop' ? 540 : 410;
    pump.frequency.setValueAtTime(startF, now);
    pump.frequency.exponentialRampToValueAtTime(peakF, now + 0.08);
    pump.frequency.exponentialRampToValueAtTime(140, now + 0.16);
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 680;
    pg.gain.setValueAtTime(0.18, now);
    pg.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    pump.connect(bp);
    bp.connect(pg);
    pg.connect(this.masterGain);
    pump.start(now);
    pump.stop(now + 0.19);

    // Hydraulic valve snap + suspension thump
    const thump = this.ctx.createOscillator();
    const tg = this.ctx.createGain();
    thump.type = 'triangle';
    thump.frequency.setValueAtTime(kind === 'hop' ? 125 : 98, now + 0.01);
    thump.frequency.exponentialRampToValueAtTime(38, now + 0.16);
    tg.gain.setValueAtTime(kind === 'hop' ? 0.32 : 0.24, now + 0.01);
    tg.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    thump.connect(tg);
    tg.connect(this.masterGain);
    thump.start(now + 0.01);
    thump.stop(now + 0.19);
  }

  public playTotemUndying(): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const t0 = now + idx * 0.065;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = idx % 2 === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.015, t0 + 0.48);
      g.gain.setValueAtTime(0.22, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.52);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(t0);
      osc.stop(t0 + 0.54);
    });
  }

  /**
   * Pneumatic airbag suspension hiss:
   * - Low speed (0.25..0.7): long, smooth, drawn-out air release hiss (0.9s - 1.45s)
   * - High speed (1.3..2.0): fast, sharp, high-pressure burst + coil-over spring thump (0.18s - 0.34s)
   */
  public playAirbagHiss(speed = 1.0, withCoilThump = false): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const clampedSpd = Math.max(0.25, Math.min(2.0, speed));
    // Inverse mapping: slower speed => longer hiss duration
    const dur = Math.max(0.18, Math.min(1.45, 0.55 / clampedSpd + (clampedSpd < 0.7 ? 0.35 : 0)));
    const src = this.createNoiseSource('white');
    if (src) {
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = clampedSpd >= 1.2 ? 1.6 : 2.2;
      const startFreq = clampedSpd >= 1.2 ? 4200 : 2600;
      const endFreq = clampedSpd >= 1.2 ? 1750 : 1050;
      bp.frequency.setValueAtTime(startFreq, now);
      bp.frequency.exponentialRampToValueAtTime(endFreq, now + dur);

      const gain = this.ctx.createGain();
      const peakGain = clampedSpd >= 1.2 ? 0.44 : 0.32;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(peakGain, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

      src.connect(bp);
      bp.connect(gain);
      gain.connect(this.masterGain);
      src.start(now, Math.random() * 1.4, dur + 0.02);
    }

    // Solenoid valve click at start
    const click = this.ctx.createOscillator();
    const cg = this.ctx.createGain();
    click.type = 'triangle';
    click.frequency.setValueAtTime(clampedSpd >= 1.2 ? 520 : 310, now);
    click.frequency.exponentialRampToValueAtTime(110, now + 0.045);
    cg.gain.setValueAtTime(0.18, now);
    cg.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    click.connect(cg);
    cg.connect(this.masterGain);
    click.start(now);
    click.stop(now + 0.055);

    if (withCoilThump || clampedSpd >= 1.35) {
      // Coil-over spring bounce thump
      const thump = this.ctx.createOscillator();
      const tg = this.ctx.createGain();
      thump.type = 'sine';
      thump.frequency.setValueAtTime(135, now);
      thump.frequency.exponentialRampToValueAtTime(48, now + 0.16);
      tg.gain.setValueAtTime(0.28, now);
      tg.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      thump.connect(tg);
      tg.connect(this.masterGain);
      thump.start(now);
      thump.stop(now + 0.2);
    }
  }

  public playCarDoorLatch(opening: boolean): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(opening ? 260 : 140, now);
    osc.frequency.exponentialRampToValueAtTime(opening ? 130 : 58, now + 0.12);
    g.gain.setValueAtTime(0.26, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playConvertibleMotor(): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const lp = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(155, now);
    osc.frequency.linearRampToValueAtTime(195, now + 0.45);
    osc.frequency.linearRampToValueAtTime(145, now + 0.72);
    lp.type = 'lowpass';
    lp.frequency.value = 520;
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.12, now + 0.08);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.76);
    osc.connect(lp);
    lp.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.8);
  }

  private startEngineNodes(config: EngineAudioConfig): void {
    if (!this.ctx || !this.masterGain) return;
    this.stopVehicleEngine();

    const now = this.ctx.currentTime;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 2.1;
    filter.frequency.setValueAtTime(
      Math.max(80, config.exhaustCutoffMin),
      now,
    );

    const master = this.ctx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    filter.connect(master);
    master.connect(this.masterGain);

    const osc1 = this.ctx.createOscillator();
    osc1.type = config.primaryWave;
    osc1.frequency.setValueAtTime(Math.max(20, config.idleHz), now);
    osc1.connect(filter);

    const osc2 = this.ctx.createOscillator();
    osc2.type = config.secondaryWave;
    osc2.frequency.setValueAtTime(
      Math.max(20, config.idleHz * config.harmonicRatio),
      now,
    );
    const harmGain = this.ctx.createGain();
    harmGain.gain.setValueAtTime(0.46, now);
    osc2.connect(harmGain);
    harmGain.connect(filter);

    const subOsc = this.ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(Math.max(18, config.idleHz * 0.5), now);
    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(
      Math.max(0.1, Math.min(1.0, config.subHarmonicMix * 0.55)),
      now,
    );
    subOsc.connect(subGain);
    subGain.connect(filter);

    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(Math.max(2, config.lopeHz), now);
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(
      config.lopeDepth * config.exhaustCutoffMin * 0.65,
      now,
    );
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    const forcedOsc = this.ctx.createOscillator();
    forcedOsc.type =
      config.forcedInduction === 'supercharger'
        ? 'triangle'
        : config.forcedInduction === 'steam_chug'
          ? 'sawtooth'
          : 'sine';
    forcedOsc.frequency.setValueAtTime(320, now);
    const forcedGain = this.ctx.createGain();
    forcedGain.gain.setValueAtTime(0.0001, now);
    forcedOsc.connect(forcedGain);
    forcedGain.connect(master);

    osc1.start(now);
    osc2.start(now);
    subOsc.start(now);
    lfo.start(now);
    forcedOsc.start(now);

    this.engineOsc1 = osc1;
    this.engineOsc2 = osc2;
    this.engineSubOsc = subOsc;
    this.engineForcedOsc = forcedOsc;
    this.engineLfo = lfo;
    this.engineLfoGain = lfoGain;
    this.engineFilter = filter;
    this.engineHarmGain = harmGain;
    this.engineSubGain = subGain;
    this.engineForcedGain = forcedGain;
    this.engineMasterGain = master;
    this.engineRunning = true;
    this.activeEngineProfileId = config.profileId;
  }

  private playExhaustShiftPop(gainScale: number): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain || gainScale <= 0.02) return;
    const now = this.ctx.currentTime;
    const dur = 0.095;
    const src = this.createNoiseSource('brown');
    if (src) {
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(380, now);
      bp.frequency.exponentialRampToValueAtTime(140, now + dur);
      bp.Q.value = 1.4;
      const g = this.ctx.createGain();
      const peak = Math.min(0.32, gainScale * 0.48);
      g.gain.setValueAtTime(peak, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + dur);
      src.connect(bp);
      bp.connect(g);
      g.connect(this.masterGain);
      src.start(now, Math.random() * 1.4, dur + 0.02);
    }

    const thump = this.ctx.createOscillator();
    const tg = this.ctx.createGain();
    thump.type = 'triangle';
    thump.frequency.setValueAtTime(125, now);
    thump.frequency.exponentialRampToValueAtTime(42, now + 0.08);
    tg.gain.setValueAtTime(Math.min(0.22, gainScale * 0.34), now);
    tg.gain.exponentialRampToValueAtTime(0.001, now + 0.085);
    thump.connect(tg);
    tg.connect(this.masterGain);
    thump.start(now);
    thump.stop(now + 0.09);
  }

  private playTurboBlowOff(isQuadTurbo: boolean): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    if (now - this.lastBlowOffAt < 0.35) return;
    this.lastBlowOffAt = now;

    const dur = isQuadTurbo ? 0.24 : 0.17;
    const src = this.createNoiseSource('white');
    if (!src) return;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 3.2;
    bp.frequency.setValueAtTime(isQuadTurbo ? 4600 : 3800, now);
    bp.frequency.exponentialRampToValueAtTime(1400, now + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(isQuadTurbo ? 0.14 : 0.1, now + 0.015);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    src.connect(bp);
    bp.connect(g);
    g.connect(this.masterGain);
    src.start(now, Math.random() * 2.0, dur + 0.02);
  }

  public updateVehicleEngine(
    _dt: number,
    config: EngineAudioConfig,
    telemetry: {
      rpmNorm: number;
      throttle: number;
      braking: boolean;
      speedRatio: number;
      boosting: boolean;
      shifting: boolean;
      justShifted?: boolean;
      throttleReleased?: boolean;
    },
  ): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) {
      if (this.engineRunning) this.stopVehicleEngine();
      return;
    }

    if (!this.engineRunning || this.activeEngineProfileId !== config.profileId) {
      this.startEngineNodes(config);
    }

    if (
      !this.engineOsc1 ||
      !this.engineOsc2 ||
      !this.engineSubOsc ||
      !this.engineForcedOsc ||
      !this.engineLfo ||
      !this.engineLfoGain ||
      !this.engineFilter ||
      !this.engineHarmGain ||
      !this.engineSubGain ||
      !this.engineForcedGain ||
      !this.engineMasterGain
    ) {
      return;
    }

    const now = this.ctx.currentTime;
    const rpm = Math.max(0, Math.min(1.08, telemetry.rpmNorm));
    const throttle = Math.max(0, Math.min(1, telemetry.throttle));
    const speedRatio = Math.max(0, Math.min(1.2, telemetry.speedRatio));
    const loadBoost = throttle * 0.55 + (telemetry.boosting ? 0.3 : 0);

    // Non-linear realistic RPM pitch curve
    const pitchNorm = Math.pow(rpm, 1.08);
    const fundamental = Math.max(
      18,
      config.idleHz + (config.maxHz - config.idleHz) * pitchNorm,
    );

    if (Number.isFinite(fundamental)) {
      this.engineOsc1.frequency.setTargetAtTime(fundamental, now, 0.032);
      this.engineOsc2.frequency.setTargetAtTime(
        Math.max(18, fundamental * config.harmonicRatio),
        now,
        0.032,
      );
      this.engineSubOsc.frequency.setTargetAtTime(
        Math.max(16, fundamental * 0.5),
        now,
        0.035,
      );
    }

    // Filter opens wide under throttle & high RPM for rich exhaust bark vs smooth idle murmur
    const cutoffRange = Math.max(100, config.exhaustCutoffMax - config.exhaustCutoffMin);
    const targetCutoff = Math.max(
      90,
      Math.min(
        6500,
        config.exhaustCutoffMin +
          cutoffRange * (0.28 * rpm + 0.72 * rpm * (0.45 + 0.55 * loadBoost)) +
          throttle * 180,
      ),
    );
    if (Number.isFinite(targetCutoff)) {
      this.engineFilter.frequency.setTargetAtTime(targetCutoff, now, 0.045);
    }

    // Cam lope thump is strongest at idle and smooths out as engine climbs into powerband
    const lopeFreq = Math.max(3, config.lopeHz * (0.85 + rpm * 1.65));
    const lopeAmount =
      config.lopeDepth * targetCutoff * (1.0 - rpm * 0.62) * 0.52;
    if (Number.isFinite(lopeFreq)) {
      this.engineLfo.frequency.setTargetAtTime(lopeFreq, now, 0.06);
    }
    if (Number.isFinite(lopeAmount)) {
      this.engineLfoGain.gain.setTargetAtTime(Math.max(0, lopeAmount), now, 0.06);
    }

    // Harmonic richness scales under throttle
    this.engineHarmGain.gain.setTargetAtTime(
      0.34 + throttle * 0.24 + rpm * 0.14,
      now,
      0.04,
    );
    this.engineSubGain.gain.setTargetAtTime(
      config.subHarmonicMix * (0.48 + (1 - rpm) * 0.18),
      now,
      0.04,
    );

    // Forced induction / hybrid e-motor / steam / rotor layer
    let forcedFreq = 400;
    let forcedGain = 0.0001;
    if (config.forcedInduction === 'supercharger') {
      forcedFreq = Math.max(180, fundamental * 5.2 + rpm * 1400);
      forcedGain = config.forcedInductionGain * (0.08 + rpm * 0.48 + throttle * 0.35);
    } else if (
      config.forcedInduction === 'twin_turbo' ||
      config.forcedInduction === 'quad_turbo'
    ) {
      const quadMult = config.forcedInduction === 'quad_turbo' ? 1.24 : 1.0;
      forcedFreq = (740 + rpm * 2050 + (telemetry.boosting ? 350 : 0)) * quadMult;
      const spool = Math.max(0, (rpm - 0.24) * 1.32);
      forcedGain = config.forcedInductionGain * spool * (0.28 + throttle * 0.55);
    } else if (config.forcedInduction === 'hybrid_e') {
      forcedFreq = 390 + speedRatio * 1250 + rpm * 480;
      forcedGain = config.forcedInductionGain * (0.14 + speedRatio * 0.42 + throttle * 0.24);
    } else if (config.forcedInduction === 'steam_chug') {
      forcedFreq = 75 + rpm * 165;
      forcedGain = config.forcedInductionGain * (0.2 + throttle * 0.38);
    } else if (config.forcedInduction === 'rotor_prop') {
      forcedFreq = 110 + rpm * 145;
      forcedGain = config.forcedInductionGain * (0.3 + speedRatio * 0.4 + throttle * 0.25);
    }

    if (Number.isFinite(forcedFreq) && Number.isFinite(forcedGain)) {
      this.engineForcedOsc.frequency.setTargetAtTime(forcedFreq, now, 0.045);
      this.engineForcedGain.gain.setTargetAtTime(
        Math.max(0.0001, Math.min(0.18, forcedGain)),
        now,
        0.045,
      );
    }

    // Overall engine presence: warm idle + commanding pull under load + brief dip during gear shift
    const shiftDip = telemetry.shifting ? 0.62 : 1.0;
    const masterLevel =
      (0.052 + rpm * 0.068 + throttle * 0.052 + (telemetry.boosting ? 0.025 : 0)) *
      shiftDip;
    if (Number.isFinite(masterLevel)) {
      this.engineMasterGain.gain.setTargetAtTime(
        Math.max(0.001, Math.min(0.24, masterLevel)),
        now,
        0.04,
      );
    }

    if (telemetry.justShifted) {
      this.playExhaustShiftPop(config.shiftPopGain);
    }
    if (
      telemetry.throttleReleased &&
      rpm > 0.48 &&
      (config.forcedInduction === 'twin_turbo' ||
        config.forcedInduction === 'quad_turbo')
    ) {
      this.playTurboBlowOff(config.forcedInduction === 'quad_turbo');
    }
  }

  public stopVehicleEngine(): void {
    const nodes: Array<OscillatorNode | null> = [
      this.engineOsc1,
      this.engineOsc2,
      this.engineSubOsc,
      this.engineForcedOsc,
      this.engineLfo,
    ];
    for (const node of nodes) {
      if (!node) continue;
      try {
        node.stop();
        node.disconnect();
      } catch {
        // Ignore already stopped oscillators
      }
    }
    const gains: Array<AudioNode | null> = [
      this.engineLfoGain,
      this.engineHarmGain,
      this.engineSubGain,
      this.engineForcedGain,
      this.engineFilter,
      this.engineMasterGain,
    ];
    for (const g of gains) {
      if (!g) continue;
      try {
        g.disconnect();
      } catch {
        // Ignore already disconnected nodes
      }
    }
    this.engineOsc1 = null;
    this.engineOsc2 = null;
    this.engineSubOsc = null;
    this.engineForcedOsc = null;
    this.engineLfo = null;
    this.engineLfoGain = null;
    this.engineFilter = null;
    this.engineHarmGain = null;
    this.engineSubGain = null;
    this.engineForcedGain = null;
    this.engineMasterGain = null;
    this.engineRunning = false;
    this.activeEngineProfileId = null;
  }

  public dispose(): void {
    this.stopVehicleEngine();
    try {
      this.surfNoiseSrc?.stop();
      this.surfNoiseSrc?.disconnect();
    } catch {
      // Ignore already stopped source
    }
    try {
      this.rainNoiseSrc?.stop();
      this.rainNoiseSrc?.disconnect();
    } catch {
      // Ignore already stopped source
    }
    this.surfNoiseSrc = null;
    this.rainNoiseSrc = null;
    this.ambienceStarted = false;
    this.whiteNoiseBuf = null;
    this.brownNoiseBuf = null;
    this.masterGain = null;
    this.ambienceGain = null;
    this.surfFilter = null;
    this.surfGain = null;
    this.rainFilter = null;
    this.rainGain = null;
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}
