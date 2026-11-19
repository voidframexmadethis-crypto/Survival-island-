import { CreatureSpecies, WeatherType } from '../types';

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
  private ambienceStarted = false;

  private masterVolume = 0.7;
  private sfxEnabled = true;
  private ambienceEnabled = true;
  private nextBirdTime = 0;
  private nextInsectTime = 0;
  private nextFireCrackleTime = 0;
  private trunkBassTimer = 0;
  private trunkBassStep = 0;
  private trunkBassPulse = 0;
  private whiteNoiseBuf: AudioBuffer | null = null;
  private brownNoiseBuf: AudioBuffer | null = null;

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
    const now = this.ctx.currentTime;
    const dur = surface === 'water' ? 0.14 : 0.075;
    const src = this.createNoiseSource('white');
    if (!src) return;

    const filter = this.ctx.createBiquadFilter();
    filter.type = surface === 'water' ? 'bandpass' : 'lowpass';
    filter.frequency.value =
      surface === 'rock' ? 950 : surface === 'water' ? 1200 : surface === 'sand' ? 520 : 650;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(surface === 'water' ? 0.14 : 0.08, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);

    src.connect(filter);
    filter.connect(g);
    g.connect(this.masterGain);
    src.start(now, Math.random() * 2.5, dur + 0.01);
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
  ): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    if (profile === 'plasma') {
      this.playPlasmaShot();
      return;
    }
    const now = this.ctx.currentTime;

    const isHeavy = profile === 'shotgun' || profile === 'sniper' || profile === 'musket';
    const isRapid = profile === 'smg';
    const noiseDur = isHeavy ? 0.34 : isRapid ? 0.16 : 0.24;
    const noiseSource = this.createNoiseSource('white');
    if (noiseSource) {
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(isHeavy ? 2600 : isRapid ? 4200 : 3400, now);
      filter.frequency.exponentialRampToValueAtTime(isHeavy ? 240 : 420, now + noiseDur * 0.9);
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(isHeavy ? 0.65 : isRapid ? 0.42 : 0.55, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + noiseDur);
      noiseSource.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.masterGain);
      noiseSource.start(now, Math.random() * 2.2, noiseDur + 0.02);
    }

    const crackOsc = this.ctx.createOscillator();
    const crackGain = this.ctx.createGain();
    crackOsc.type = 'sawtooth';
    crackOsc.frequency.setValueAtTime(isHeavy ? 520 : isRapid ? 960 : 780, now);
    crackOsc.frequency.exponentialRampToValueAtTime(isHeavy ? 52 : 95, now + 0.09);
    crackGain.gain.setValueAtTime(isHeavy ? 0.42 : 0.34, now);
    crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    crackOsc.connect(crackGain);
    crackGain.connect(this.masterGain);
    crackOsc.start(now);
    crackOsc.stop(now + 0.11);

    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(isHeavy ? 115 : 145, now);
    subOsc.frequency.exponentialRampToValueAtTime(isHeavy ? 26 : 36, now + (isHeavy ? 0.3 : 0.22));
    subGain.gain.setValueAtTime(isHeavy ? 0.52 : 0.38, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + (isHeavy ? 0.32 : 0.23));
    subOsc.connect(subGain);
    subGain.connect(this.masterGain);
    subOsc.start(now);
    subOsc.stop(now + 0.34);
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

  public stopTrunkBass(): void {
    this.trunkBassTimer = 0;
    this.trunkBassStep = 0;
    this.trunkBassPulse = 0;
  }

  public updateTrunkBass(active: boolean, dt: number): number {
    if (!active || !this.sfxEnabled || !this.ctx || !this.masterGain) {
      this.trunkBassTimer = 0;
      this.trunkBassStep = 0;
      this.trunkBassPulse *= Math.exp(-dt * 12);
      if (this.trunkBassPulse < 0.01) this.trunkBassPulse = 0;
      return this.trunkBassPulse;
    }

    this.trunkBassPulse *= Math.exp(-dt * 8.5);
    this.trunkBassTimer -= dt;

    if (this.trunkBassTimer <= 0) {
      const stepDur = 0.195; // Chopped & screwed ~77 BPM Houston groove
      this.trunkBassTimer = stepDur;
      const step = this.trunkBassStep % 8;
      this.trunkBassStep = (this.trunkBassStep + 1) % 8;

      const now = this.ctx.currentTime;
      const isBoom = step === 0 || step === 3 || step === 4 || step === 6;
      if (isBoom) {
        const subFreq = step === 3 ? 49 : step === 6 ? 41.2 : 46.2;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(subFreq * 1.45, now);
        osc.frequency.exponentialRampToValueAtTime(subFreq, now + 0.09);
        g.gain.setValueAtTime(step === 0 || step === 4 ? 0.42 : 0.34, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
        osc.connect(g);
        g.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.36);

        // Warm trunk-rattle lowpass harmonic
        const harm = this.ctx.createOscillator();
        const lp = this.ctx.createBiquadFilter();
        const hg = this.ctx.createGain();
        harm.type = 'triangle';
        harm.frequency.setValueAtTime(subFreq * 2, now);
        lp.type = 'lowpass';
        lp.frequency.value = 180;
        hg.gain.setValueAtTime(0.14, now);
        hg.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
        harm.connect(lp);
        lp.connect(hg);
        hg.connect(this.masterGain);
        harm.start(now);
        harm.stop(now + 0.26);

        this.trunkBassPulse = step === 3 ? 0.78 : 1.0;
      }

      if (step === 2 || step === 6) {
        // Subtle crisp hi-hat tick
        const dur = 0.04;
        const src = this.createNoiseSource('white');
        if (src) {
          const hp = this.ctx.createBiquadFilter();
          hp.type = 'highpass';
          hp.frequency.value = 6200;
          const hg = this.ctx.createGain();
          hg.gain.setValueAtTime(0.06, now);
          hg.gain.exponentialRampToValueAtTime(0.001, now + dur);
          src.connect(hp);
          hp.connect(hg);
          hg.connect(this.masterGain);
          src.start(now, Math.random() * 2.5, dur + 0.01);
        }
      }
    }

    return this.trunkBassPulse;
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
}
