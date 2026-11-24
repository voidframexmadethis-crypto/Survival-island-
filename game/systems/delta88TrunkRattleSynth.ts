/**
 * Delta 88-style trunk/latch rattle: a short filtered noise + plate pulse on
 * each bass hit. The source graph is created only on a hit, never per frame,
 * and a 65 ms cap keeps the rattle rhythmic instead of a constant buzz.
 */
export class Delta88TrunkRattleSynth {
  private readonly ctx: AudioContext;
  private readonly out: AudioNode;
  private readonly pulseBuffer: AudioBuffer;
  private lastHitMs = 0;

  constructor(ctx: AudioContext, destination: AudioNode) {
    this.ctx = ctx;
    this.out = destination;

    const sr = ctx.sampleRate;
    const len = Math.max(1, Math.floor(sr * 0.032));
    this.pulseBuffer = ctx.createBuffer(1, len, sr);
    const ch = this.pulseBuffer.getChannelData(0);

    for (let i = 0; i < len; i += 1) {
      const t = i / len;
      const env = Math.pow(1 - t, 2.4);
      const noise = Math.random() * 2 - 1;
      const plateWave = Math.sin(2 * Math.PI * 195 * (i / sr)) * 0.35;
      ch[i] = (noise * 0.75 + plateWave) * env;
    }
  }

  /**
   * strength: 0..1, rattleMultiplier: 1.0 normal, ~1.65 for Blue DONK.
   * Uses the audio clock so the 65 ms pacing is testable and follows the
   * fixed-step simulation instead of wall time.
   */
  public triggerOnBassHit(
    strength: number,
    rattleMultiplier = 1,
    isInsideCar = false,
  ): boolean {
    const nowMs = this.ctx.currentTime * 1000;
    if (nowMs - this.lastHitMs < 65) return false;
    this.lastHitMs = nowMs;

    const t = this.ctx.currentTime;
    const clamped = Math.max(0, Math.min(1, strength));

    const src = this.ctx.createBufferSource();
    src.buffer = this.pulseBuffer;
    src.playbackRate.value = 0.92 + clamped * 0.24;

    const bodyBand = this.ctx.createBiquadFilter();
    bodyBand.type = 'bandpass';
    bodyBand.frequency.setValueAtTime(480 + clamped * 280, t);
    bodyBand.Q.setValueAtTime(3.2, t);

    const edgeHigh = this.ctx.createBiquadFilter();
    edgeHigh.type = 'peaking';
    edgeHigh.frequency.setValueAtTime(2100, t);
    edgeHigh.Q.setValueAtTime(2.0, t);
    edgeHigh.gain.setValueAtTime(3.5, t);

    const gain = this.ctx.createGain();
    // The player wants to hear the trunk sheet metal working from the driver's
    // seat, so the in-cabin pulse is as loud as the outside one instead of being
    // tucked 11 dB down behind the music.
    const cabinScale = isInsideCar ? 1.0 : 0.72;
    const peakGain = Math.min(
      1.0,
      clamped * rattleMultiplier * cabinScale * 0.95,
    );

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(Math.max(0.001, peakGain), t + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.032);

    src.connect(bodyBand);
    bodyBand.connect(edgeHigh);
    edgeHigh.connect(gain);
    gain.connect(this.out);

    src.start(t);
    src.stop(t + 0.035);
    return true;
  }
}
