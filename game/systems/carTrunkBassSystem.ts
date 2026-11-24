import {
  VEHICLE_AUDIO_TUNINGS,
  type CarCabinAudioTuning,
} from './carAudioTunings';
import { Delta88TrunkRattleSynth } from './delta88TrunkRattleSynth';

/**
 * Dedicated slab/trunk sub-bass stage for the car stereo.
 *
 * The game's radio owns the HTMLMediaElement source, so when attached to the
 * live cabin graph this system reuses that AudioContext and source bus instead
 * of creating a second MediaElementAudioSourceNode. The same class can still be
 * used standalone with `init(audioElement)`.
 *
 * Signal path (all linear until the shared cabin compressor):
 *
 *   input
 *     -> 2x 28 Hz highpass        (removes inaudible subsonic energy)
 *     -> 58 Hz bass shelf         (broad old-school weight)
 *     -> 38-58 Hz sub band        (30-60 Hz subwoofer)
 *     -> 72-96 Hz low band        (60-100 Hz low bass)
 *     -> 118-148 Hz punch band    (100-160 Hz mid-bass)
 *     -> body resonance peak      (sheet-metal/cabin tuning)
 *     -> cabin lowpass
 *     -> compressor -> analyser -> master
 *
 * A parallel harmonic exciter takes the 90-220 Hz band, generates 2nd/3rd
 * harmonics and high-passes them at ~200 Hz. That is what lets phone speakers
 * convey the bass without needing 40 Hz reproduction.
 *
 * The cabin sub gain is a bass-only parallel branch ahead of the compressor,
 * so the final radio limiter always owns the ceiling.
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
const RATTLE_OUTPUT_GAIN = 12;

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
  private subsonicA: BiquadFilterNode | null = null;
  private subsonicB: BiquadFilterNode | null = null;
  private subBoostFilter: BiquadFilterNode | null = null;
  private subPeakFilter: BiquadFilterNode | null = null;
  private subBandFilter: BiquadFilterNode | null = null;
  private lowBandFilter: BiquadFilterNode | null = null;
  private midBandFilter: BiquadFilterNode | null = null;
  private harmonicSend: BiquadFilterNode | null = null;
  private harmonicShaper: WaveShaperNode | null = null;
  private harmonicHighpass: BiquadFilterNode | null = null;
  private harmonicGain: GainNode | null = null;
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
  // stay clean outside, and the default graph is built before a profile lands.
  private rattleEnabled = false;
  // Old-school cars can rattle in the cabin even when their profile keeps the
  // outside trunk quiet. Enabled from the radio profile.
  private cabinRattleEnabled = false;
  private rattleMultiplier = 1;
  private tuning: CarCabinAudioTuning = VEHICLE_AUDIO_TUNINGS.classic;

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
    if (audioElement && this.ctx && this.subsonicA) {
      try {
        this.sourceNode = this.ctx.createMediaElementSource(audioElement);
        this.sourceNode.connect(this.subsonicA);
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
    if (this.subsonicA) {
      try {
        input.connect(this.subsonicA);
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
   * Apply a whole vehicle tuning at once. All gains/frequencies ramp, so
   * swapping cars never produces a click or a sudden volume spike.
   */
  public setTuning(tuning: CarCabinAudioTuning): void {
    this.tuning = tuning;
    this.rattleSynth?.setCharacter(tuning.rattle);
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const ramp = 0.05;
    const set = (param: AudioParam | undefined, value: number) => {
      param?.setTargetAtTime(value, now, ramp);
    };
    set(this.subBandFilter?.frequency, tuning.subHz);
    set(this.subBandFilter?.gain, tuning.subDb);
    set(this.lowBandFilter?.frequency, tuning.lowHz);
    set(this.lowBandFilter?.gain, tuning.lowDb);
    set(this.midBandFilter?.frequency, tuning.midHz);
    set(this.midBandFilter?.gain, tuning.midDb);
    set(this.subBoostFilter?.gain, tuning.shelfDb);
    set(this.subPeakFilter?.frequency, tuning.bodyHz);
    set(this.subPeakFilter?.gain, tuning.bodyDb);
    set(this.subPeakFilter?.Q, tuning.bodyQ);
    set(this.harmonicGain?.gain, tuning.harmonics * 0.42);
    set(this.harmonicSend?.frequency, (tuning.lowHz + tuning.midHz) * 0.5);
  }

  /**
   * Set the extra trunk sub EQ. Kept for callers/tests that only change the
   * broad shelf; full vehicle tuning goes through `setTuning`.
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
   * Low-end for the driver only. Applied to a bass-only parallel branch ahead
   * of the cabin limiter, so it never clips the radio output.
   */
  public setCabinBassBoost(insideCar: boolean, gain = CABIN_BASS_GAIN): void {
    if (!this.ctx || !this.cabinBassGain) return;
    this.cabinBassGain.gain.setTargetAtTime(
      insideCar ? Math.max(1, gain) : 1,
      this.ctx.currentTime,
      0.06,
    );
  }

  public setRattleMultiplier(multiplier: number): void {
    this.rattleMultiplier = Math.max(0, Math.min(3, multiplier));
  }

  public getTuning(): CarCabinAudioTuning {
    return this.tuning;
  }

  private buildChain(ctx: AudioContext, output: AudioNode, masterLevel: number): void {
    // 1. Subsonic protection: two cascaded 28 Hz highpasses (24 dB/oct). This
    // is the part that stops cone-flapping, clicks and lost headroom.
    this.subsonicA = ctx.createBiquadFilter();
    this.subsonicA.type = 'highpass';
    this.subsonicA.frequency.value = 28;
    this.subsonicA.Q.value = 0.707;

    this.subsonicB = ctx.createBiquadFilter();
    this.subsonicB.type = 'highpass';
    this.subsonicB.frequency.value = 28;
    this.subsonicB.Q.value = 0.707;

    // 2. Broad old-school bass shelf.
    this.subBoostFilter = ctx.createBiquadFilter();
    this.subBoostFilter.type = 'lowshelf';
    this.subBoostFilter.frequency.value = 58;
    this.subBoostFilter.gain.value = 4;

    // 3. Four audible bands: sub, low bass, punch and body resonance.
    this.subBandFilter = ctx.createBiquadFilter();
    this.subBandFilter.type = 'peaking';
    this.subBandFilter.frequency.value = 48;
    this.subBandFilter.Q.value = 0.95;
    this.subBandFilter.gain.value = 3.6;

    this.lowBandFilter = ctx.createBiquadFilter();
    this.lowBandFilter.type = 'peaking';
    this.lowBandFilter.frequency.value = 82;
    this.lowBandFilter.Q.value = 1.0;
    this.lowBandFilter.gain.value = 3;

    this.midBandFilter = ctx.createBiquadFilter();
    this.midBandFilter.type = 'peaking';
    this.midBandFilter.frequency.value = 128;
    this.midBandFilter.Q.value = 1.1;
    this.midBandFilter.gain.value = 2.8;

    this.subPeakFilter = ctx.createBiquadFilter();
    this.subPeakFilter.type = 'peaking';
    this.subPeakFilter.frequency.value = 70;
    this.subPeakFilter.Q.value = 1.5;
    this.subPeakFilter.gain.value = 2.4;

    // 4. Cabin vs. outside-trunk acoustics.
    this.cabinLowpassFilter = ctx.createBiquadFilter();
    this.cabinLowpassFilter.type = 'lowpass';
    this.cabinLowpassFilter.frequency.value = 18000;
    this.cabinLowpassFilter.Q.value = 1.1;

    // 5. Harmonic exciter: 2nd/3rd harmonics of the 90-220 Hz band. Mobile
    // speakers cannot move at 40 Hz, but they can reproduce the octave above.
    this.harmonicSend = ctx.createBiquadFilter();
    this.harmonicSend.type = 'bandpass';
    this.harmonicSend.frequency.value = 105;
    this.harmonicSend.Q.value = 0.7;

    this.harmonicShaper = ctx.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < curve.length; i += 1) {
      const x = (i / (curve.length - 1)) * 2 - 1;
      // Mostly odd (tanh) with a touch of even harmonic for warmth.
      curve[i] = Math.tanh(x * 2.1) * 0.82 + x * x * 0.18;
    }
    this.harmonicShaper.curve = curve;
    this.harmonicShaper.oversample = '4x';

    this.harmonicHighpass = ctx.createBiquadFilter();
    this.harmonicHighpass.type = 'highpass';
    this.harmonicHighpass.frequency.value = 165;
    this.harmonicHighpass.Q.value = 0.7;

    this.harmonicGain = ctx.createGain();
    this.harmonicGain.gain.value = 0.11;

    // 6. Glue compressor: smooths the layered bass before the final limiter.
    this.compressor = ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -18;
    this.compressor.knee.value = 12;
    this.compressor.ratio.value = 4;
    this.compressor.attack.value = 0.012;
    this.compressor.release.value = 0.25;

    // 7. FFT analyser for trunk flex, rattle and camera pressure.
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.45;

    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = masterLevel;

    this.subsonicA.connect(this.subsonicB);
    this.subsonicB.connect(this.subBoostFilter);
    this.subBoostFilter.connect(this.subBandFilter);
    this.subBandFilter.connect(this.lowBandFilter);
    this.lowBandFilter.connect(this.midBandFilter);
    this.midBandFilter.connect(this.subPeakFilter);
    this.subPeakFilter.connect(this.cabinLowpassFilter);
    this.cabinLowpassFilter.connect(this.compressor);
    this.compressor.connect(this.analyser);
    this.analyser.connect(this.masterGain);
    this.masterGain.connect(output);

    // Harmonics run in parallel from the band-split output and join *after* the
    // bass compressor. Otherwise a 20-48x cabin boost squashes them and the
    // phone-speaker layer disappears exactly when the bass is loudest.
    this.lowBandFilter.connect(this.harmonicSend);
    this.harmonicSend.connect(this.harmonicShaper);
    this.harmonicShaper.connect(this.harmonicHighpass);
    this.harmonicHighpass.connect(this.harmonicGain);
    this.harmonicGain.connect(this.analyser);

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
    this.rattleSynth.setCharacter(this.tuning.rattle);

    // Cabin-only bass: a 160 Hz lowpass parallel branch joins the main path
    // before the compressor. The final cabin limiter still owns the ceiling:
    // no hard clipping, no distorted buzz on top, just panel rattle.
    this.cabinBassFilter = ctx.createBiquadFilter();
    this.cabinBassFilter.type = 'lowpass';
    this.cabinBassFilter.frequency.value = 160;
    this.cabinBassFilter.Q.value = 0.7;

    this.cabinBassGain = ctx.createGain();
    this.cabinBassGain.gain.value = 1;

    this.subPeakFilter.connect(this.cabinBassFilter);
    this.cabinBassFilter.connect(this.cabinBassGain);
    this.cabinBassGain.connect(this.compressor);
  }

  /** Short multi-panel metal pulse on a bass hit. */
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
    // moving it, the panel keeps chattering, and the synth's 60 ms cap paces
    // the pulses into a rattle instead of one hit per beat. Outside the cabin
    // only fresh attacks rattle the sheet metal.
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
      this.subsonicA?.disconnect();
      this.subsonicB?.disconnect();
      this.subBoostFilter?.disconnect();
      this.subBandFilter?.disconnect();
      this.lowBandFilter?.disconnect();
      this.midBandFilter?.disconnect();
      this.subPeakFilter?.disconnect();
      this.harmonicSend?.disconnect();
      this.harmonicShaper?.disconnect();
      this.harmonicHighpass?.disconnect();
      this.harmonicGain?.disconnect();
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
    this.subsonicA = null;
    this.subsonicB = null;
    this.subBoostFilter = null;
    this.subBandFilter = null;
    this.lowBandFilter = null;
    this.midBandFilter = null;
    this.subPeakFilter = null;
    this.harmonicSend = null;
    this.harmonicShaper = null;
    this.harmonicHighpass = null;
    this.harmonicGain = null;
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
    this.tuning = VEHICLE_AUDIO_TUNINGS.classic;
    if (this.ownsContext && this.ctx && this.ctx.state !== 'closed') {
      void this.ctx.close().catch(() => {});
    }
    this.ctx = null;
    this.ownsContext = false;
    this.attachedToExternalGraph = false;
  }
}
