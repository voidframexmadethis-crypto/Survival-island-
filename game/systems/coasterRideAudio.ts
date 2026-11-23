/**
 * Procedural ride soundtrack for Volcano Flex. It uses one AudioContext and
 * layered noise/oscillators so the launch, wheel rumble, wind and volcanic
 * roar respond to the train's real speed without shipping audio assets.
 */
export class CoasterRideAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private wheelGain: GainNode | null = null;
  private windGain: GainNode | null = null;
  private rumbleGain: GainNode | null = null;
  private launchGain: GainNode | null = null;
  private wheelFilter: BiquadFilterNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private lastSegment = '';
  private launchCooldown = 0;
  private started = false;

  public start(): void {
    if (this.started) return;
    if (typeof window === 'undefined') return;
    const AudioCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;
    try {
      const ctx = new AudioCtor();
      void ctx.resume();
      const master = ctx.createGain();
      master.gain.value = 0.0001;
      master.connect(ctx.destination);

      const noiseLength = Math.floor(ctx.sampleRate * 2);
      const noiseBuffer = ctx.createBuffer(1, noiseLength, ctx.sampleRate);
      const channel = noiseBuffer.getChannelData(0);
      let brown = 0;
      for (let i = 0; i < noiseLength; i++) {
        brown = (brown + (Math.random() * 2 - 1) * 0.035) * 0.996;
        channel[i] = brown;
      }

      const wheelSource = ctx.createBufferSource();
      wheelSource.buffer = noiseBuffer;
      wheelSource.loop = true;
      const wheelFilter = ctx.createBiquadFilter();
      wheelFilter.type = 'bandpass';
      wheelFilter.frequency.value = 420;
      wheelFilter.Q.value = 1.7;
      const wheelGain = ctx.createGain();
      wheelGain.gain.value = 0.0001;
      wheelSource.connect(wheelFilter).connect(wheelGain).connect(master);
      wheelSource.start();

      const windSource = ctx.createBufferSource();
      windSource.buffer = noiseBuffer;
      windSource.loop = true;
      const windFilter = ctx.createBiquadFilter();
      windFilter.type = 'lowpass';
      windFilter.frequency.value = 900;
      const windGain = ctx.createGain();
      windGain.gain.value = 0.0001;
      windSource.connect(windFilter).connect(windGain).connect(master);
      windSource.start();

      const rumble = ctx.createOscillator();
      rumble.type = 'sawtooth';
      rumble.frequency.value = 43;
      const rumbleFilter = ctx.createBiquadFilter();
      rumbleFilter.type = 'lowpass';
      rumbleFilter.frequency.value = 115;
      const rumbleGain = ctx.createGain();
      rumbleGain.gain.value = 0.0001;
      rumble.connect(rumbleFilter).connect(rumbleGain).connect(master);
      rumble.start();

      const launch = ctx.createOscillator();
      launch.type = 'sawtooth';
      launch.frequency.value = 90;
      const launchFilter = ctx.createBiquadFilter();
      launchFilter.type = 'bandpass';
      launchFilter.frequency.value = 420;
      launchFilter.Q.value = 1.1;
      const launchGain = ctx.createGain();
      launchGain.gain.value = 0.0001;
      launch.connect(launchFilter).connect(launchGain).connect(master);
      launch.start();

      this.ctx = ctx;
      this.master = master;
      this.wheelGain = wheelGain;
      this.windGain = windGain;
      this.rumbleGain = rumbleGain;
      this.launchGain = launchGain;
      this.wheelFilter = wheelFilter;
      this.windFilter = windFilter;
      this.started = true;
      const now = ctx.currentTime;
      master.gain.linearRampToValueAtTime(0.72, now + 0.7);
    } catch {
      // Browsers can deny audio creation until a gesture; the coaster remains
      // fully playable without sound in that case.
      this.dispose();
    }
  }

  public update(speedKmh: number, segmentLabel: string): void {
    if (!this.ctx || !this.wheelGain || !this.windGain || !this.rumbleGain || !this.launchGain) {
      return;
    }
    const norm = Math.min(1, Math.max(0, speedKmh / 320));
    const now = this.ctx.currentTime;
    this.wheelGain.gain.setTargetAtTime(0.025 + norm * 0.23, now, 0.08);
    this.windGain.gain.setTargetAtTime(0.006 + norm * norm * 0.18, now, 0.12);
    this.rumbleGain.gain.setTargetAtTime(0.008 + norm * 0.1, now, 0.1);
    if (this.wheelFilter) {
      this.wheelFilter.frequency.setTargetAtTime(280 + norm * 1550, now, 0.1);
    }
    if (this.windFilter) {
      this.windFilter.frequency.setTargetAtTime(480 + norm * 2600, now, 0.14);
    }

    this.launchCooldown = Math.max(0, this.launchCooldown - 0.02);
    const isLaunch = segmentLabel.toLowerCase().includes('launch');
    if (isLaunch && this.lastSegment !== segmentLabel && this.launchCooldown <= 0) {
      this.launchCooldown = 1.8;
      this.launchGain.gain.cancelScheduledValues(now);
      this.launchGain.gain.setValueAtTime(0.0001, now);
      this.launchGain.gain.linearRampToValueAtTime(0.24, now + 0.15);
      this.launchGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
    }
    this.lastSegment = segmentLabel;
  }

  public stop(): void {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    try {
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setValueAtTime(this.master.gain.value, now);
      this.master.gain.linearRampToValueAtTime(0.0001, now + 0.45);
      window.setTimeout(() => this.dispose(), 520);
    } catch {
      this.dispose();
    }
    this.started = false;
  }

  public dispose(): void {
    try {
      void this.ctx?.close();
    } catch {
      // Already closed.
    }
    this.ctx = null;
    this.master = null;
    this.wheelGain = null;
    this.windGain = null;
    this.rumbleGain = null;
    this.launchGain = null;
    this.wheelFilter = null;
    this.windFilter = null;
    this.started = false;
    this.lastSegment = '';
  }
}
