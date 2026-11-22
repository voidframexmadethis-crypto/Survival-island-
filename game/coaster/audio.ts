/**
 * Procedural coaster audio: rolling rumble, wind, chain clank, launch roar and
 * brake hiss. No samples or network assets; safe to instantiate in the browser.
 */
export class CoasterAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private windGain: GainNode | null = null;
  private rumbleGain: GainNode | null = null;
  private chainGain: GainNode | null = null;
  private noiseSource: AudioBufferSourceNode | null = null;
  private chainOsc: OscillatorNode | null = null;
  private muted = false;
  private started = false;

  get isMuted(): boolean {
    return this.muted;
  }

  async start(): Promise<void> {
    if (this.started) {
      await this.ctx?.resume();
      return;
    }
    const Ctor =
      typeof window !== 'undefined'
        ? window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        : undefined;
    if (!Ctor) return;
    try {
      const ctx = new Ctor();
      this.ctx = ctx;
      this.started = true;
      const master = ctx.createGain();
      master.gain.value = this.muted ? 0 : 0.55;
      master.connect(ctx.destination);
      this.master = master;

      const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      const windFilter = ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.value = 620;
      windFilter.Q.value = 0.55;
      const windGain = ctx.createGain();
      windGain.gain.value = 0;
      noise.connect(windFilter).connect(windGain).connect(master);
      noise.start();
      this.noiseSource = noise;
      this.windGain = windGain;

      const rumbleOsc = ctx.createOscillator();
      rumbleOsc.type = 'sawtooth';
      rumbleOsc.frequency.value = 38;
      const rumbleFilter = ctx.createBiquadFilter();
      rumbleFilter.type = 'lowpass';
      rumbleFilter.frequency.value = 110;
      const rumbleGain = ctx.createGain();
      rumbleGain.gain.value = 0;
      rumbleOsc.connect(rumbleFilter).connect(rumbleGain).connect(master);
      rumbleOsc.start();
      this.rumbleGain = rumbleGain;

      const chain = ctx.createOscillator();
      chain.type = 'square';
      chain.frequency.value = 240;
      const chainFilter = ctx.createBiquadFilter();
      chainFilter.type = 'highpass';
      chainFilter.frequency.value = 900;
      const chainGain = ctx.createGain();
      chainGain.gain.value = 0;
      chain.connect(chainFilter).connect(chainGain).connect(master);
      chain.start();
      this.chainOsc = chain;
      this.chainGain = chainGain;

      await ctx.resume();
    } catch {
      this.ctx = null;
      this.started = false;
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.55, this.ctx.currentTime, 0.05);
    }
  }

  update(speedKmh: number, section: string): void {
    if (!this.ctx || !this.windGain || !this.rumbleGain || !this.chainGain) return;
    const now = this.ctx.currentTime;
    const speed = Math.min(1.6, speedKmh / 100);
    this.windGain.gain.setTargetAtTime(speed * speed * 0.42, now, 0.12);
    this.rumbleGain.gain.setTargetAtTime(0.05 + speed * 0.11, now, 0.12);
    const onLift = section === 'chain_lift' || section === 'cable_lift' || section === 'launch';
    this.chainGain.gain.setTargetAtTime(onLift ? 0.12 : 0, now, 0.08);
    if (this.chainOsc) {
      this.chainOsc.frequency.setTargetAtTime(onLift ? 185 + speed * 90 : 240, now, 0.1);
    }
  }

  async dispose(): Promise<void> {
    try {
      this.noiseSource?.stop();
      this.chainOsc?.stop();
      this.rumbleGain?.disconnect();
      await this.ctx?.close();
    } catch {
      // Audio teardown is best effort.
    }
    this.ctx = null;
    this.started = false;
  }
}
