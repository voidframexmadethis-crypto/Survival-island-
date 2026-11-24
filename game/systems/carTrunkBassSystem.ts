import { Delta88TrunkRattleSynth } from './delta88TrunkRattleSynth';

/**
 * Dedicated slab/trunk sub-bass stage for the car stereo.
 *
 * The game's radio owns the HTMLMediaElement source, so when attached to the
 * live cabin graph this system reuses that AudioContext and source bus instead
 * of creating a second MediaElementAudioSourceNode. The same class can still be
 * used standalone with `init(audioElement)`.
 *
 * Hot-path rules:
 * - FFT data is allocated once.
 * - `step` performs no object allocations.
 * - short rattle pulses are only created on an actual bass hit.
 */

const TRUNK_RATTLE_RANGE_METERS = 28;
const TRUNK_RATTLE_NEAR_METERS = 14;

/**
 * The metallic trunk voice gets its own hot output stage so it stays audible
 * over the boosted sub-bass instead of being buried by the cabin compressor.
 */
const RATTLE_OUTPUT_GAIN = 8;

/**
 * Extra low-end the driver's seat gets while sitting in the car. The gain runs
 * before the cabin limiter, so it is loud but always kept under full scale —
 * the bass stays clean and the trunk panel supplies the noise.
 */
export const CABIN_BASS_GAIN = 20;

/** Average the analyser bins that cover roughly 40-170 Hz at a 1024 FFT. */
export function averageSubBassBins(data: Uint8Array, firstBin = 1, lastBin = 3): number {
  let sum = 0;
  let count = 0;
  for (let i = firstBin; i <= lastBin && i < data.length; i += 1) {
    sum += data[i] || 0;
    count += 1;
  }
  return count > 0 ? sum / (count * 255) : 0;
}

export class CarTrunkBassSystem {
  private ctx: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private subBoostFilter: BiquadFilterNode | null = null;
  private subPeakFilter: BiquadFilterNode | null = null;
  private cabinLowpassFilter: BiquadFilterNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private rattleLimiter: DynamicsCompressorNode | null = null;
  private rattleOutputGain: GainNode | null = null;
  private rattleSynth: Delta88TrunkRattleSynth | null = null;
  private cabinBassFilter: BiquadFilterNode | null = null;
  private cabinBassGain: GainNode | null = null;
  private ownsContext = false;
  private attachedToExternalGraph = false;
  private disposed = false;

  /** Pre-allocated FFT buffer: zero per-frame garbage. */
  private readonly fftData = new Uint8Array(new ArrayBuffer(64));
  private previousSubBass = 0;
  // Off unless a profile explicitly asks for it (DONK/Tahoe). Lowriders must
  // stay clean, and the default graph is built before a vehicle profile lands.
  private rattleEnabled = false;
  // Old-school cars can rattle in the cabin even when their profile keeps the
  // outside trunk quiet. Enabled from the radio profile.
  private cabinRattleEnabled = false;
  private rattleMultiplier = 1;

  /** 0.0 to 1.0, driven by the real playing track's sub-band energy. */
  public bassEnergy = 0;
  public isInsideCar = true;
  /** Exposed for telemetry/tests; increments when a pulse actually fires. */
  public rattleBursts = 0;

  /**
   * Standalone setup. Call from a user gesture. If an audio element is
   * supplied it becomes the source for this graph.
   */
  public init(audioElement?: HTMLAudioElement): void {
    if (typeof window === 'undefined' || this.masterGain) return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    this.disposed = false;
    this.ctx = new AudioCtx();
    this.ownsContext = true;
    this.buildChain(this.ctx, this.ctx.destination, 0.95);
    if (audioElement && this.ctx && this.subBoostFilter) {
      try {
        this.sourceNode = this.ctx.createMediaElementSource(audioElement);
        this.sourceNode.connect(this.subBoostFilter);
      } catch {
        // The element is already bound to another graph; leave the DSP idle.
        this.sourceNode = null;
      }
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
  }

  /**
   * Attach to the already-running car radio graph. The supplied input should
   * be the radio source bus and the output should continue into the existing
   * cabin/panner path. This keeps one shared AudioContext and one media-source
   * binding for the whole car.
   */
  public attachGraph(ctx: AudioContext, input: AudioNode, output: AudioNode): boolean {
    if (this.masterGain && this.ctx === ctx) return true;
    this.dispose();
    this.disposed = false;
    this.ctx = ctx;
    this.attachedToExternalGraph = true;
    this.ownsContext = false;
    this.buildChain(ctx, output, 1);
    let connected = false;
    if (this.subBoostFilter) {
      try {
        input.connect(this.subBoostFilter);
        connected = true;
      } catch {
        // Caller restores its original direct bus connection if this fails.
      }
    }
    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => {});
    }
    return connected;
  }

  /**
   * Set the extra trunk sub EQ. Loud, heavily boosted sub-bass is the main
   * source of clipping and speaker chatter, so profiles with more cabin bass
   * use a smaller additive shelf and let the clean subwoofer gain do the work.
   */
  public setSubBoost(shelfDb: number, peakDb: number): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.subBoostFilter) {
      this.subBoostFilter.gain.setTargetAtTime(shelfDb, now, 0.04);
    }
    if (this.subPeakFilter) {
      this.subPeakFilter.gain.setTargetAtTime(peakDb, now, 0.04);
    }
  }

  public setRattleEnabled(enabled: boolean): void {
    this.rattleEnabled = enabled;
  }

  /** Let an old-school car's trunk panel talk while the player is inside it. */
  public setCabinRattleEnabled(enabled: boolean): void {
    this.cabinRattleEnabled = enabled;
  }

  /**
   * 20x low-end for the driver only. Applied to a bass-only parallel branch
   * ahead of the cabin limiter, so it never clips the radio output.
   */
  public setCabinBassBoost(insideCar: boolean): void {
    if (!this.ctx || !this.cabinBassGain) return;
    this.cabinBassGain.gain.setTargetAtTime(
      insideCar ? CABIN_BASS_GAIN : 1,
      this.ctx.currentTime,
      0.06,
    );
  }

  public setRattleMultiplier(multiplier: number): void {
    this.rattleMultiplier = Math.max(0, Math.min(3, multiplier));
  }

  private buildChain(ctx: AudioContext, output: AudioNode, masterLevel: number): void {
    // 1. Deep slab shelf: 58 Hz with +18 dB of trunk-moving weight, plus a
    // focused 64 Hz resonance so the sub reads through the mix.
    this.subBoostFilter = ctx.createBiquadFilter();
    this.subBoostFilter.type = 'lowshelf';
    this.subBoostFilter.frequency.value = 58;
    this.subBoostFilter.gain.value = 18;

    this.subPeakFilter = ctx.createBiquadFilter();
    this.subPeakFilter.type = 'peaking';
    this.subPeakFilter.frequency.value = 64;
    this.subPeakFilter.Q.value = 0.9;
    this.subPeakFilter.gain.value = 7;

    // 2. Cabin vs. outside-trunk acoustics.
    this.cabinLowpassFilter = ctx.createBiquadFilter();
    this.cabinLowpassFilter.type = 'lowpass';
    this.cabinLowpassFilter.frequency.value = 18000;
    this.cabinLowpassFilter.Q.value = 1.1;

    // 3. Glue limiter so the boosted sub never clips into harsh distortion.
    this.compressor = ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -14;
    this.compressor.knee.value = 10;
    this.compressor.ratio.value = 8;
    this.compressor.attack.value = 0.008;
    this.compressor.release.value = 0.18;

    // 4. FFT analyser for trunk flex and camera pressure.
    this.analyser = ctx.createAnalyser();
    // 1024 gives ~43 Hz bin spacing: enough resolution for sub-bass at half
    // the FFT cost of the meter pass.
    this.analyser.fftSize = 1024;
    // Lower smoothing keeps kick/808 attacks sharp enough to drive the rattle
    // on the beat instead of smearing hits into a constant buzz.
    this.analyser.smoothingTimeConstant = 0.45;

    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = masterLevel;

    this.subBoostFilter.connect(this.subPeakFilter);
    this.subPeakFilter.connect(this.cabinLowpassFilter);
    this.cabinLowpassFilter.connect(this.compressor);
    this.compressor.connect(this.analyser);
    this.analyser.connect(this.masterGain);
    this.masterGain.connect(output);

    // Dedicated rattle limiter keeps the metallic pulses punchy and prevents
    // them from clipping the cabin mix on heavy 808s or the Blue DONK profile.
    this.rattleLimiter = ctx.createDynamicsCompressor();
    this.rattleLimiter.threshold.value = -8;
    this.rattleLimiter.knee.value = 6;
    this.rattleLimiter.ratio.value = 12;
    this.rattleLimiter.attack.value = 0.002;
    this.rattleLimiter.release.value = 0.09;

    this.rattleOutputGain = ctx.createGain();
    this.rattleOutputGain.gain.value = RATTLE_OUTPUT_GAIN;
    this.rattleLimiter.connect(this.rattleOutputGain);
    this.rattleOutputGain.connect(this.masterGain);
    this.rattleSynth = new Delta88TrunkRattleSynth(ctx, this.rattleLimiter);

    // Cabin-only 20x low-end. A bass-only parallel branch (150 Hz lowpass)
    // joins the main path before the compressor, so the final cabin limiter
    // still owns the ceiling: no hard clipping, no distorted buzz on top, just
    // the trunk panel rattling.
    this.cabinBassFilter = ctx.createBiquadFilter();
    this.cabinBassFilter.type = 'lowpass';
    this.cabinBassFilter.frequency.value = 150;
    this.cabinBassFilter.Q.value = 0.7;

    this.cabinBassGain = ctx.createGain();
    this.cabinBassGain.gain.value = 1;

    this.subPeakFilter.connect(this.cabinBassFilter);
    this.cabinBassFilter.connect(this.cabinBassGain);
    this.cabinBassGain.connect(this.compressor);
  }

  /** Short Delta 88-style metal pulse on a bass hit. */
  private triggerTrunkRattle(intensity: number): void {
    if ((!this.rattleEnabled && !this.cabinRattleEnabled) || !this.rattleSynth) {
      return;
    }
    if (
      this.rattleSynth.triggerOnBassHit(
        intensity,
        this.rattleMultiplier,
        this.isInsideCar,
      )
    ) {
      this.rattleBursts += 1;
    }
  }

  /**
   * Fixed-step audio update. `distanceToTrunkMeters` is only used outside the
   * car. Attached graphs leave loudness to the existing 3D car panner.
   */
  public step(
    isInsideCar: boolean,
    distanceToTrunkMeters: number,
    radioPlaying: boolean,
  ): void {
    if (!this.ctx || !this.analyser || !this.cabinLowpassFilter || !this.masterGain) {
      this.bassEnergy = 0;
      return;
    }
    if (this.disposed) {
      this.bassEnergy = 0;
      return;
    }

    this.isInsideCar = isInsideCar;
    const now = this.ctx.currentTime;

    if (!radioPlaying) {
      this.bassEnergy *= 0.85;
      this.previousSubBass = 0;
      if (!this.attachedToExternalGraph) {
        this.masterGain.gain.setTargetAtTime(0, now, 0.08);
      }
      return;
    }

    let falloff = 1;
    if (isInsideCar) {
      this.cabinLowpassFilter.frequency.setTargetAtTime(16000, now, 0.05);
      if (!this.attachedToExternalGraph) {
        this.masterGain.gain.setTargetAtTime(1, now, 0.05);
      }
    } else {
      falloff = Math.max(0, 1 - distanceToTrunkMeters / TRUNK_RATTLE_RANGE_METERS);
      const muffledCutoff = 420 + falloff * 1800;
      this.cabinLowpassFilter.frequency.setTargetAtTime(muffledCutoff, now, 0.05);
      if (!this.attachedToExternalGraph) {
        this.masterGain.gain.setTargetAtTime(falloff * falloff * 0.9, now, 0.05);
      }
    }

    this.analyser.getByteFrequencyData(this.fftData);
    const subAvg = averageSubBassBins(this.fftData);
    const bassRise = Math.max(0, subAvg - this.previousSubBass);
    this.bassEnergy = subAvg;
    this.previousSubBass = subAvg;

    // The trunk panel is what makes the noise: while the sub is genuinely
    // moving it, the panel keeps chattering, and the synth's 65 ms cap paces the
    // pulses into a rattle instead of one hit per beat. Outside the cabin only
    // fresh attacks rattle the sheet metal.
    const rattleGate = isInsideCar ? 0.32 : 0.5;
    const riseGate = isInsideCar ? 0.04 : 0.075;
    const sustainedShake = isInsideCar && subAvg > 0.4;
    if (
      subAvg > rattleGate &&
      (bassRise > riseGate || sustainedShake) &&
      (isInsideCar || distanceToTrunkMeters < TRUNK_RATTLE_NEAR_METERS) &&
      falloff > 0
    ) {
      this.triggerTrunkRattle(
        Math.min(1, 0.45 + bassRise * 1.1 + subAvg * 0.25),
      );
    }
  }

  public dispose(): void {
    this.disposed = true;
    this.bassEnergy = 0;
    this.previousSubBass = 0;
    try {
      this.sourceNode?.disconnect();
    } catch {
      // Already disconnected.
    }
    this.sourceNode = null;
    try {
      this.subBoostFilter?.disconnect();
      this.subPeakFilter?.disconnect();
      this.cabinLowpassFilter?.disconnect();
      this.compressor?.disconnect();
      this.analyser?.disconnect();
      this.masterGain?.disconnect();
      this.rattleLimiter?.disconnect();
      this.rattleOutputGain?.disconnect();
      this.cabinBassFilter?.disconnect();
      this.cabinBassGain?.disconnect();
    } catch {
      // Already disconnected.
    }
    this.subBoostFilter = null;
    this.subPeakFilter = null;
    this.cabinLowpassFilter = null;
    this.compressor = null;
    this.analyser = null;
    this.masterGain = null;
    this.rattleLimiter = null;
    this.rattleOutputGain = null;
    this.rattleSynth = null;
    this.cabinBassFilter = null;
    this.cabinBassGain = null;
    this.rattleMultiplier = 1;
    this.cabinRattleEnabled = false;
    if (this.ownsContext && this.ctx && this.ctx.state !== 'closed') {
      void this.ctx.close().catch(() => {});
    }
    this.ctx = null;
    this.ownsContext = false;
    this.attachedToExternalGraph = false;
  }
}
