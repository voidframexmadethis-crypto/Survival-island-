import type { TrunkRattleCharacter } from './carAudioTunings';

/**
 * Old-school trunk/panel rattle layer.
 *
 * This is a single pre-rendered "ensemble" buffer per hit, mixed from five
 * physically distinct panels so the noise reads as bodywork rather than a
 * synth beep:
 *
 *   - trunk lid: low metal thunk with a short structural ring
 *   - license plate: thin, bright double-metal buzz
 *   - rear deck: low parcel-shelf thud
 *   - rear quarter: mid resonance from the big stamped panels
 *   - interior trim: dry plastic crackle
 *
 * The buffer is normalised and every trigger goes through its own short
 * envelope + tone filter, so hits never stack into a continuous buzz and never
 * run past the cabin limiter. Sources are created only on a hit; nothing plays
 * while the music is quiet.
 */
export class Delta88TrunkRattleSynth {
  private readonly ctx: AudioContext;
  private readonly out: AudioNode;
  private buffers: AudioBuffer[] = [];
  private variant = 0;
  private lastHitMs = 0;
  private character: TrunkRattleCharacter = {
    intensity: 1,
    brightness: 0.45,
    decay: 1,
    lid: 0.8,
    plate: 0.7,
    deck: 0.7,
    quarter: 0.6,
    trim: 0.6,
  };
  private renderedKey = '';

  constructor(ctx: AudioContext, destination: AudioNode) {
    this.ctx = ctx;
    this.out = destination;
    this.setCharacter(this.character);
  }

  /**
   * Re-render the five-panel buffer for a vehicle. Called when the radio
   * profile changes, never from the per-frame update loop.
   */
  public setCharacter(character: TrunkRattleCharacter): void {
    this.character = { ...character };
    const key = [
      character.brightness.toFixed(2),
      character.decay.toFixed(2),
      character.lid.toFixed(2),
      character.plate.toFixed(2),
      character.deck.toFixed(2),
      character.quarter.toFixed(2),
      character.trim.toFixed(2),
    ].join('|');
    if (key === this.renderedKey && this.buffers.length > 0) return;
    this.renderedKey = key;
    this.buffers = [0, 1, 2].map((variant) => this.renderVariant(variant));
  }

  private renderVariant(variant: number): AudioBuffer {
    const sr = this.ctx.sampleRate;
    const duration = 0.034 + 0.022 * this.character.decay;
    const len = Math.max(1, Math.floor(sr * duration));
    const buffer = this.ctx.createBuffer(1, len, sr);
    const ch = buffer.getChannelData(0);
    const c = this.character;
    const brightness = Math.max(0, Math.min(1, c.brightness));
    let peak = 0;

    for (let i = 0; i < len; i += 1) {
      const t = i / sr;
      const fast = Math.exp(-t * (46 + brightness * 26));
      const slow = Math.exp(-t * 18);
      const noise = Math.random() * 2 - 1;
      const noise2 = Math.random() * 2 - 1;

      // Trunk lid: 170/268 Hz stamped-steel thunk, slight delayed chatter.
      const lid =
        (Math.sin(2 * Math.PI * 172 * t) * 0.62 +
          Math.sin(2 * Math.PI * 269 * t) * 0.24 +
          noise * 0.18) *
        fast *
        c.lid *
        0.55;

      // Rear deck: lower parcel-shelf thud, 3 ms behind the lid.
      const deckEnv = t < 0.003 ? 0 : Math.exp(-(t - 0.003) * 32);
      const deck =
        (Math.sin(2 * Math.PI * 101 * t) * 0.7 +
          Math.sin(2 * Math.PI * 154 * t) * 0.22) *
        deckEnv *
        c.deck *
        0.4;

      // License plate: bright narrow ring against the bumper.
      const plateEnv = t < 0.002 ? 0 : Math.exp(-(t - 0.002) * (70 + brightness * 50));
      const plate =
        (Math.sin(2 * Math.PI * (1850 + brightness * 380) * t) * 0.4 +
          Math.sin(2 * Math.PI * 2470 * t) * 0.28 +
          Math.sin(2 * Math.PI * 3120 * t) * 0.16) *
        plateEnv *
        c.plate *
        0.5;

      // Rear quarter panels: resonant 420-640 Hz body ring.
      const quarterEnv = Math.exp(-t * 26);
      const quarter =
        (Math.sin(2 * Math.PI * 418 * t) * 0.5 +
          Math.sin(2 * Math.PI * 637 * t) * 0.24 +
          Math.sin(2 * Math.PI * 913 * t) * 0.1) *
        quarterEnv *
        c.quarter *
        0.34;

      // Interior trim: dry high plastic crackle, slightly delayed.
      const trimEnv = t < 0.005 ? 0 : Math.exp(-(t - 0.005) * 58);
      const trim =
        noise2 * (0.42 + brightness * 0.3) * trimEnv * c.trim * 0.3;

      const jitter = 1 + (variant - 1) * 0.04;
      const sample = (lid + deck + plate + quarter + trim) * jitter;
      ch[i] = sample;
      const abs = Math.abs(sample);
      if (abs > peak) peak = abs;
    }

    // Normalise with headroom so the rattle gain (not the buffer) sets level.
    const norm = peak > 1e-5 ? 0.82 / peak : 1;
    for (let i = 0; i < len; i += 1) ch[i] *= norm;
    return buffer;
  }

  private pickBuffer(): AudioBuffer | null {
    if (this.buffers.length === 0) return null;
    const buffer = this.buffers[this.variant % this.buffers.length];
    this.variant = (this.variant + 1) % this.buffers.length;
    return buffer;
  }

  /**
   * strength: 0..1 sub-bass energy of the current hit.
   * rattleMultiplier: profile intensity (DONK is the hottest).
   * Uses the audio clock so the pacing follows the simulation, not wall time.
   */
  public triggerOnBassHit(
    strength: number,
    rattleMultiplier = 1,
    isInsideCar = false,
  ): boolean {
    const nowMs = this.ctx.currentTime * 1000;
    if (nowMs - this.lastHitMs < 60) return false;
    const buffer = this.pickBuffer();
    if (!buffer) return false;
    this.lastHitMs = nowMs;

    const t = this.ctx.currentTime;
    const clamped = Math.max(0, Math.min(1, strength));
    const brightness = this.character.brightness;

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = 0.94 + clamped * 0.2;

    // Keep the full five-panel voice (don't bandpass away the plate buzz),
    // but let bright profiles open the top end up.
    const tone = this.ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.setValueAtTime(2200 + brightness * 4200 + clamped * 900, t);
    tone.Q.setValueAtTime(0.7, t);

    const presence = this.ctx.createBiquadFilter();
    presence.type = 'peaking';
    presence.frequency.setValueAtTime(2400 + brightness * 900, t);
    presence.Q.setValueAtTime(1.4, t);
    presence.gain.setValueAtTime(1.5 + brightness * 3, t);

    const gain = this.ctx.createGain();
    const cabinScale = isInsideCar ? 1 : 0.72;
    const peakGain = Math.min(1, clamped * rattleMultiplier * cabinScale * 0.95);

    const duration = buffer.duration;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(Math.max(0.001, peakGain), t + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0008, t + duration);

    src.connect(tone);
    tone.connect(presence);
    presence.connect(gain);
    gain.connect(this.out);

    src.start(t);
    src.stop(t + duration + 0.005);
    return true;
  }
}
