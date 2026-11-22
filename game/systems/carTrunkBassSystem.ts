/**
 * Dedicated slab/trunk sub-bass stage for the car stereo.
 *
 * The game's radio owns the HTMLMediaElement source, so when attached to the
 * live cabin graph this system reuses that AudioContext and source bus instead
 * of creating a second MediaElementAudioSourceNode. The same class can still be
 * used standalone with `init(audioElement)`.
 *
 * Hot-path rules:
 * - FFT and rattle data are allocated once.
 * - `step` performs no object allocations.
 * - one looping rattle voice is preallocated; hits only gate its gain.
 */

const RATTLE_SECONDS = 0.045;
const RATTLE_MIN_INTERVAL_SECONDS = 0.055;
const TRUNK_RATTLE_RANGE_METERS = 28;
const TRUNK_RATTLE_NEAR_METERS = 14;

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
  private rattleSource: AudioBufferSourceNode | null = null;
  private rattleFilter: BiquadFilterNode | null = null;
  private rattleGain: GainNode | null = null;
  private ownsContext = false;
  private attachedToExternalGraph = false;
  private disposed = false;

  /** Pre-allocated FFT buffer: zero per-frame garbage. */
  private readonly fftData = new Uint8Array(new ArrayBuffer(64));
  private rattleNoiseBuffer: AudioBuffer | null = null;
  private lastRattleTime = -Infinity;
  private rattleEnabled = true;

  /** 0.0 to 1.0, driven by the real playing track's sub-band energy. */
  public bassEnergy = 0;
  public isInsideCar = true;
  /** Exposed for telemetry/tests; the rattle voice itself is preallocated. */
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

  public setRattleEnabled(enabled: boolean): void {
    this.rattleEnabled = enabled;
  }

  private buildChain(ctx: AudioContext, output: AudioNode, masterLevel: number): void {
    // 1. Deep slab shelf: 58 Hz with +16 dB of trunk-moving weight, plus a
    // focused 64 Hz resonance so the sub reads through the mix.
    this.subBoostFilter = ctx.createBiquadFilter();
    this.subBoostFilter.type = 'lowshelf';
    this.subBoostFilter.frequency.value = 58;
    this.subBoostFilter.gain.value = 16;

    this.subPeakFilter = ctx.createBiquadFilter();
    this.subPeakFilter.type = 'peaking';
    this.subPeakFilter.frequency.value = 64;
    this.subPeakFilter.Q.value = 0.9;
    this.subPeakFilter.gain.value = 5;

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
    this.compressor.attack.value = 0.004;
    this.compressor.release.value = 0.14;

    // 4. FFT analyser for trunk flex and camera pressure.
    this.analyser = ctx.createAnalyser();
    // 1024 gives ~43 Hz bin spacing: enough resolution for sub-bass at half
    // the FFT cost of the meter pass.
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.65;

    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = masterLevel;

    this.subBoostFilter.connect(this.subPeakFilter);
    this.subPeakFilter.connect(this.cabinLowpassFilter);
    this.cabinLowpassFilter.connect(this.compressor);
    this.compressor.connect(this.analyser);
    this.analyser.connect(this.masterGain);
    this.masterGain.connect(output);

    // One preallocated noise voice. Retriggering only turns its gain up/down;
    // it never creates three new Web Audio nodes per 808 hit.
    const sampleRate = ctx.sampleRate;
    const length = Math.max(1, Math.floor(sampleRate));
    this.rattleNoiseBuffer = ctx.createBuffer(1, length, sampleRate);
    const data = this.rattleNoiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }
    this.rattleSource = ctx.createBufferSource();
    this.rattleSource.buffer = this.rattleNoiseBuffer;
    this.rattleSource.loop = true;
    this.rattleFilter = ctx.createBiquadFilter();
    this.rattleFilter.type = 'bandpass';
    this.rattleFilter.frequency.value = 420;
    this.rattleFilter.Q.value = 4.5;
    this.rattleGain = ctx.createGain();
    this.rattleGain.gain.value = 0;
    this.rattleSource.connect(this.rattleFilter);
    this.rattleFilter.connect(this.rattleGain);
    this.rattleGain.connect(this.masterGain);
    this.rattleSource.start();
  }

  /** Synthesized sheet-metal / license-plate buzz on heavy 808 hits. */
  private triggerTrunkRattle(intensity: number): void {
    if (
      !this.rattleEnabled ||
      !this.ctx ||
      !this.rattleSource ||
      !this.rattleFilter ||
      !this.rattleGain
    ) {
      return;
    }
    const now = this.ctx.currentTime;
    if (now - this.lastRattleTime < RATTLE_MIN_INTERVAL_SECONDS) return;
    this.lastRattleTime = now;
    this.rattleBursts += 1;

    this.rattleFilter.frequency.setTargetAtTime(
      340 + intensity * 260,
      now,
      0.006,
    );

    const perspectiveMult = this.isInsideCar ? 0.28 : 0.78;
    const level = Math.min(0.52, Math.max(0, intensity) * perspectiveMult);
    const gain = this.rattleGain.gain;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(level, now);
    gain.exponentialRampToValueAtTime(0.001, now + 0.042);
    gain.setValueAtTime(0, now + RATTLE_SECONDS);
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
    this.bassEnergy = subAvg;

    if (
      subAvg > 0.58 &&
      (isInsideCar || distanceToTrunkMeters < TRUNK_RATTLE_NEAR_METERS) &&
      falloff > 0
    ) {
      this.triggerTrunkRattle((subAvg - 0.58) / 0.42);
    }
  }

  public dispose(): void {
    this.disposed = true;
    this.bassEnergy = 0;
    try {
      this.sourceNode?.disconnect();
    } catch {
      // Already disconnected.
    }
    this.sourceNode = null;
    try {
      this.rattleSource?.stop();
    } catch {
      // Source already stopped.
    }
    try {
      this.subBoostFilter?.disconnect();
      this.subPeakFilter?.disconnect();
      this.cabinLowpassFilter?.disconnect();
      this.compressor?.disconnect();
      this.analyser?.disconnect();
      this.masterGain?.disconnect();
      this.rattleSource?.disconnect();
      this.rattleFilter?.disconnect();
      this.rattleGain?.disconnect();
    } catch {
      // Already disconnected.
    }
    this.subBoostFilter = null;
    this.subPeakFilter = null;
    this.cabinLowpassFilter = null;
    this.compressor = null;
    this.analyser = null;
    this.masterGain = null;
    this.rattleSource = null;
    this.rattleFilter = null;
    this.rattleGain = null;
    this.rattleNoiseBuffer = null;
    if (this.ownsContext && this.ctx && this.ctx.state !== 'closed') {
      void this.ctx.close().catch(() => {});
    }
    this.ctx = null;
    this.ownsContext = false;
    this.attachedToExternalGraph = false;
  }
}
