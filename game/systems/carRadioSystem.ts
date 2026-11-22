import * as THREE from 'three';
import { CarTrunkBassSystem } from './carTrunkBassSystem';

export interface RadioCarDescriptor {
  id?: string;
  name?: string;
  class?: string;
  style?: string;
  preset?: string;
  hasTrunkBass?: boolean;
}

export type DrivingCameraMode = 'CHASE' | 'FIRST_PERSON';

/**
 * Master gain for the cabin stereo. Real car systems are loud: full volume is
 * intentionally hotter than unity so the sub-bass hits hard, and the limiter
 * downstream keeps it from clipping. At 0 the output is silent.
 */
export function stereoOutputGain(volume: number, spatial = 1): number {
  const v = THREE.MathUtils.clamp(volume, 0, 1);
  const s = THREE.MathUtils.clamp(spatial, 0, 1);
  return Math.pow(v, 1.22) * 2.6 * s;
}

export function isOldSchoolVehicleDescriptor(car: RadioCarDescriptor = {}): boolean {
  const preset = (car.preset || '').toLowerCase();
  if (
    preset === 'slab' ||
    preset === 'lowrider' ||
    preset === 'donk' ||
    preset === 'cadillac_coupe_deville' ||
    preset === 'chevy_tahoe' ||
    preset === 'chevy_2000_sub'
  ) {
    return true;
  }
  const tag = `${car.class || ''} ${car.style || ''} ${car.name || ''}`.toLowerCase();
  if (
    tag.includes('modern exotic') ||
    tag.includes('modern hypercar') ||
    tag.includes('ultra rare')
  ) {
    return false;
  }
  return (
    car.hasTrunkBass === true ||
    tag.includes('old school') ||
    tag.includes('old-school') ||
    tag.includes('classic') ||
    tag.includes('slab') ||
    tag.includes('donk') ||
    tag.includes('lowrider') ||
    tag.includes('impala') ||
    tag.includes('chevy') ||
    tag.includes('tahoe') ||
    tag.includes('cadillac') ||
    tag.includes('deville')
  );
}

export type CarType = 'classic' | 'tahoe' | 'donk' | 'supercar';

export interface CarAudioProfile {
  bass: number;
  low: number;
  shake: number;
}

export const AUDIO_PROFILES: Record<CarType, CarAudioProfile> = {
  classic: { bass: 1.8, low: 1.5, shake: 0.5 },
  tahoe: { bass: 2.8, low: 2.5, shake: 1.0 },
  donk: { bass: 3.0, low: 2.8, shake: 1.8 },
  supercar: { bass: 0.8, low: 0.7, shake: 0.1 },
};

export function resolveCarAudioType(car: RadioCarDescriptor = {}): CarType {
  const preset = (car.preset || '').toLowerCase();
  const tag = `${car.class || ''} ${car.style || ''} ${car.name || ''}`.toLowerCase();
  if (preset === 'donk' || tag.includes('donk')) {
    return 'donk';
  }
  if (
    preset === 'chevy_tahoe' ||
    preset === 'chevy_2000_sub' ||
    tag.includes('tahoe') ||
    tag.includes('subwoofer') ||
    tag.includes('savage life')
  ) {
    return 'tahoe';
  }
  if (
    preset === 'sports_car' ||
    tag.includes('modern exotic') ||
    tag.includes('modern hypercar') ||
    tag.includes('ultra rare') ||
    tag.includes('supercar') ||
    tag.includes('mclaren')
  ) {
    return 'supercar';
  }
  if (isOldSchoolVehicleDescriptor(car)) {
    return 'classic';
  }
  return 'supercar';
}

export interface CarSubwooferHandles {
  subGain: GainNode;
  destroy: () => void;
}

export function addCarSubwoofer(
  sourceBus: AudioNode,
  carPanner: PannerNode,
  profile: { low: number },
): CarSubwooferHandles {
  const ctx = sourceBus.context;

  // Protect the subwoofer from infrasonic frequencies.
  const subsonic = ctx.createBiquadFilter();
  subsonic.type = 'highpass';
  subsonic.frequency.value = 26;

  // Dedicated subwoofer crossover (wide enough to energise a real trunk).
  const crossover = ctx.createBiquadFilter();
  crossover.type = 'lowpass';
  crossover.frequency.value = 120;
  crossover.Q.value = 0.9;

  // Cabin/trunk resonance: a car body naturally peaks around 60-80 Hz, which is
  // what makes the sheet metal and trim buzz instead of just thumping.
  const resonance = ctx.createBiquadFilter();
  resonance.type = 'peaking';
  resonance.frequency.value = 72;
  resonance.Q.value = 1.1;
  resonance.gain.value = 9;

  // Amplifier-style harmonic saturation. Pushing harder adds the gritty upper
  // harmonics you hear when a real system is loud enough to rattle panels.
  const saturation = ctx.createWaveShaper();
  const curve = new Float32Array(512);
  const drive = 2.6;
  const norm = Math.tanh(drive);

  for (let i = 0; i < curve.length; i++) {
    const x = (i / (curve.length - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * drive) / norm;
  }

  saturation.curve = curve;
  saturation.oversample = '4x';

  // Control peaks before the subwoofer output.
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -10;
  limiter.knee.value = 12;
  limiter.ratio.value = 5;
  limiter.attack.value = 0.004;
  limiter.release.value = 0.16;

  const subGain = ctx.createGain();
  subGain.gain.value = Math.min(1, 0.42 * profile.low);

  // Parallel branch: original stereo remains untouched.
  sourceBus.connect(subsonic);
  subsonic.connect(crossover);
  crossover.connect(resonance);
  resonance.connect(saturation);
  saturation.connect(limiter);
  limiter.connect(subGain);
  subGain.connect(carPanner);

  return {
    subGain,
    destroy() {
      try {
        sourceBus.disconnect(subsonic);
      } catch {
        // Ignore if already disconnected
      }
      try {
        subsonic.disconnect();
        crossover.disconnect();
        resonance.disconnect();
        saturation.disconnect();
        limiter.disconnect();
        subGain.disconnect();
      } catch {
        // Ignore teardown disconnect errors
      }
    },
  };
}

export interface SetupCarAudioHandles {
  ctx: AudioContext;
  bass: BiquadFilterNode;
  sub: BiquadFilterNode;
  gain: GainNode;
  analyser: AnalyserNode;
  panner: PannerNode;
  profile: CarAudioProfile;
  subwoofer: CarSubwooferHandles;
  destroy: () => void;
}

export function setupCarAudio(
  audio: HTMLAudioElement,
  car: CarType,
  quarterPanel?: HTMLElement,
): SetupCarAudioHandles {
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioCtx();
  const source = ctx.createMediaElementSource(audio);
  const bass = ctx.createBiquadFilter();
  const sub = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  const analyser = ctx.createAnalyser();
  const carPanner = ctx.createPanner();

  const profile = AUDIO_PROFILES[car];

  bass.type = 'lowshelf';
  bass.frequency.value = 100;
  bass.gain.value = 6 * profile.bass;

  sub.type = 'peaking';
  sub.frequency.value = 48;
  sub.Q.value = 0.8;
  sub.gain.value = 5 * profile.low;

  gain.gain.value = 0.8;
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.78;

  carPanner.panningModel = 'HRTF';
  carPanner.distanceModel = 'inverse';
  carPanner.refDistance = 2;
  carPanner.maxDistance = 55;
  carPanner.rolloffFactor = 1.4;

  source.connect(bass);
  bass.connect(sub);
  sub.connect(gain);
  gain.connect(analyser);
  analyser.connect(carPanner);
  carPanner.connect(ctx.destination);

  const subwoofer = addCarSubwoofer(source, carPanner, profile);

  const data = new Uint8Array(analyser.frequencyBinCount);
  let rafId = 0;
  let destroyed = false;

  function update() {
    if (destroyed) return;
    analyser.getByteFrequencyData(data);

    let sum = 0;
    for (let i = 0; i < 8; i++) {
      sum += data[i] || 0;
    }
    const intensity = sum / (8 * 255);

    if (quarterPanel) {
      const movement = intensity * profile.shake;
      quarterPanel.style.transform = `translateX(${Math.sin(performance.now() * 0.08) * movement}px)`;
    }

    if (!audio.paused && !audio.ended) {
      rafId = requestAnimationFrame(update);
    }
  }

  const onPlay = () => {
    if (destroyed) return;
    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => {});
    }
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(update);
  };

  const onPause = () => {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    if (quarterPanel) {
      quarterPanel.style.transform = '';
    }
  };

  audio.addEventListener('play', onPlay);
  audio.addEventListener('pause', onPause);
  audio.addEventListener('ended', onPause);

  return {
    ctx,
    bass,
    sub,
    gain,
    analyser,
    panner: carPanner,
    profile,
    subwoofer,
    destroy: () => {
      destroyed = true;
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onPause);
      if (quarterPanel) {
        quarterPanel.style.transform = '';
      }
      subwoofer.destroy();
      try {
        source.disconnect();
        bass.disconnect();
        sub.disconnect();
        gain.disconnect();
        analyser.disconnect();
        carPanner.disconnect();
      } catch {
        // Ignore teardown disconnect errors
      }
      if (ctx.state !== 'closed') {
        void ctx.close().catch(() => {});
      }
    },
  };
}

export const CABIN_BASS_AND_FIRST_PERSON = {
  audioCtx: null as AudioContext | null,
  sourceBus: null as GainNode | null,
  analyser: null as AnalyserNode | null,
  bassFilter: null as BiquadFilterNode | null,
  subFilter: null as BiquadFilterNode | null,
  compressor: null as DynamicsCompressorNode | null,
  masterGain: null as GainNode | null,
  limiter: null as DynamicsCompressorNode | null,
  carPanner: null as PannerNode | null,
  subwoofer: null as CarSubwooferHandles | null,
  trunkBassSystem: null as CarTrunkBassSystem | null,
  freqData: null as Uint8Array<ArrayBuffer> | null,
  connectedElements: new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>(),
  cameraMode: 'CHASE' as DrivingCameraMode,
  lastThumpMs: 0,
  activeCarType: 'classic' as CarType,

  // Stereo playback state (user-supplied audio only; nothing is generated).
  stereoPlaying: false,
  userPaused: false,
  spatialAttenuation: 1,
  stereoVolume: 0.78,
  customTrackName: null as string | null,
  customAudioEl: null as HTMLAudioElement | null,

  isOldSchoolCar(car: RadioCarDescriptor = {}): boolean {
    return isOldSchoolVehicleDescriptor(car);
  },

  ensureAudioGraph(): void {
    if (typeof window === 'undefined') return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      this.trunkBassSystem?.dispose();
      this.trunkBassSystem = null;
      this.audioCtx = new AudioCtx();
      const profile = AUDIO_PROFILES[this.activeCarType];

      this.sourceBus = this.audioCtx.createGain();
      this.sourceBus.gain.value = 1.0;

      // 100 Hz lowshelf bass + 48 Hz peaking sub tuned per CarType profile
      this.bassFilter = this.audioCtx.createBiquadFilter();
      this.bassFilter.type = 'lowshelf';
      this.bassFilter.frequency.value = 100;
      this.bassFilter.gain.value = 6 * profile.bass;

      this.subFilter = this.audioCtx.createBiquadFilter();
      this.subFilter.type = 'peaking';
      this.subFilter.frequency.value = 48;
      this.subFilter.Q.value = 0.8;
      this.subFilter.gain.value = 5 * profile.low;

      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.78;
      this.freqData = new Uint8Array(
        new ArrayBuffer(this.analyser.frequencyBinCount),
      );

      // Light glue compression keeps the mix dense without squashing the sub.
      this.compressor = this.audioCtx.createDynamicsCompressor();
      this.compressor.threshold.value = -8;
      this.compressor.knee.value = 10;
      this.compressor.ratio.value = 3;
      this.compressor.attack.value = 0.004;
      this.compressor.release.value = 0.22;

      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.value = stereoOutputGain(
        this.stereoVolume,
        this.spatialAttenuation,
      );

      // Hard safety limiter so a loud cabin mix never clips the output device.
      this.limiter = this.audioCtx.createDynamicsCompressor();
      this.limiter.threshold.value = -2.5;
      this.limiter.knee.value = 0;
      this.limiter.ratio.value = 14;
      this.limiter.attack.value = 0.002;
      this.limiter.release.value = 0.12;

      this.carPanner = this.audioCtx.createPanner();
      this.carPanner.panningModel = 'HRTF';
      this.carPanner.distanceModel = 'inverse';
      this.carPanner.refDistance = 4;
      this.carPanner.maxDistance = 90;
      this.carPanner.rolloffFactor = 0.9;

      // The slab sub-bass stage sits between the radio bus and the existing
      // cabin/panner chain. It reuses this context and source bus, so there is
      // still only one media-source binding and one car audio graph.
      this.trunkBassSystem = new CarTrunkBassSystem();
      if (!this.trunkBassSystem.attachGraph(this.audioCtx, this.sourceBus, this.bassFilter)) {
        this.trunkBassSystem.dispose();
        this.trunkBassSystem = null;
        this.sourceBus.connect(this.bassFilter);
      }
      this.bassFilter.connect(this.subFilter);
      this.subFilter.connect(this.analyser);
      this.analyser.connect(this.compressor);
      this.compressor.connect(this.carPanner);
      this.carPanner.connect(this.masterGain);
      this.masterGain.connect(this.limiter);
      this.limiter.connect(this.audioCtx.destination);

      this.subwoofer?.destroy();
      this.subwoofer = addCarSubwoofer(this.sourceBus, this.carPanner, profile);
    }

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
  },

  attachAudioElement(audioEl: HTMLMediaElement | null): void {
    if (typeof window === 'undefined' || !audioEl) return;
    this.ensureAudioGraph();
    if (!this.audioCtx || !this.sourceBus) return;

    if (!this.connectedElements.has(audioEl)) {
      try {
        const source = this.audioCtx.createMediaElementSource(audioEl);
        source.connect(this.sourceBus);
        this.connectedElements.set(audioEl, source);
      } catch {
        // Element already bound or CORS-restricted; keep standard audio playback safe
      }
    }
  },

  setCameraMode(mode: DrivingCameraMode): DrivingCameraMode {
    this.cameraMode = mode === 'FIRST_PERSON' ? 'FIRST_PERSON' : 'CHASE';
    return this.cameraMode;
  },

  toggleCameraMode(): DrivingCameraMode {
    this.cameraMode =
      this.cameraMode === 'FIRST_PERSON' ? 'CHASE' : 'FIRST_PERSON';
    return this.cameraMode;
  },

  bassBoost: false,

  /**
   * "808 Sub" toggle: boosts the shelf/sub stages for the old-school trunk-bass
   * cars. Even off, the player's track still has a real subwoofer — this only
   * controls the extra trunk-rattling headroom.
   */
  setBassBoost(enabled: boolean): void {
    const next = Boolean(enabled);
    if (next === this.bassBoost) return;
    this.bassBoost = next;
    if (!this.audioCtx) return;
    const profile = AUDIO_PROFILES[this.activeCarType];
    const t = this.audioCtx.currentTime;
    if (this.bassFilter) {
      this.bassFilter.gain.setTargetAtTime(
        6 * profile.bass * (next ? 1.35 : 1),
        t,
        0.05,
      );
    }
    if (this.subFilter) {
      this.subFilter.gain.setTargetAtTime(
        5 * profile.low * (next ? 1.2 : 1),
        t,
        0.05,
      );
    }
    if (this.subwoofer) {
      this.subwoofer.subGain.gain.setTargetAtTime(
        Math.min(1, 0.42 * profile.low) * (next ? 1 : 0.62),
        t,
        0.05,
      );
    }
  },

  // Updates radio profile per vehicle using AUDIO_PROFILES (100Hz lowshelf + 48Hz sub peaking)
  applyVehicleRadioProfile(car: RadioCarDescriptor): {
    oldSchool: boolean;
    carType: CarType;
    profile: CarAudioProfile;
    radioMode: 'OLD_SCHOOL_TRUNK_AND_CHEST_BASS' | 'STANDARD_RADIO';
  } {
    const oldSchool = this.isOldSchoolCar(car);
    const carType = resolveCarAudioType(car);
    const profile = AUDIO_PROFILES[carType];
    this.activeCarType = carType;
    this.trunkBassSystem?.setRattleEnabled(oldSchool);
    const boost = this.bassBoost ? 1 : 0;
    if (this.bassFilter && this.audioCtx) {
      this.bassFilter.frequency.value = 100;
      this.bassFilter.gain.setTargetAtTime(
        6 * profile.bass * (boost ? 1.35 : 1),
        this.audioCtx.currentTime,
        0.03,
      );
    }
    if (this.subFilter && this.audioCtx) {
      this.subFilter.frequency.value = 48;
      this.subFilter.Q.value = 0.8;
      this.subFilter.gain.setTargetAtTime(
        5 * profile.low * (boost ? 1.2 : 1),
        this.audioCtx.currentTime,
        0.03,
      );
    }
    if (this.subwoofer && this.audioCtx) {
      this.subwoofer.subGain.gain.setTargetAtTime(
        Math.min(1, 0.42 * profile.low) * (boost ? 1 : 0.62),
        this.audioCtx.currentTime,
        0.03,
      );
    }
    return {
      oldSchool,
      carType,
      profile,
      radioMode: oldSchool ? 'OLD_SCHOOL_TRUNK_AND_CHEST_BASS' : 'STANDARD_RADIO',
    };
  },

  setVolume(vol: number): void {
    this.stereoVolume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.audioCtx) {
      const spatial = this.customAudioEl && this.customTrackName ? 1 : this.spatialAttenuation;
      this.masterGain.gain.setTargetAtTime(
        stereoOutputGain(this.stereoVolume, spatial),
        this.audioCtx.currentTime,
        0.02,
      );
    }
  },

  setSpatialAttenuation(factor: number): void {
    const clamped = THREE.MathUtils.clamp(factor, 0, 1);
    this.spatialAttenuation = clamped;
    if (this.masterGain && this.audioCtx) {
      const spatial = this.customAudioEl && this.customTrackName ? 1 : clamped;
      this.masterGain.gain.setTargetAtTime(
        stereoOutputGain(this.stereoVolume, spatial),
        this.audioCtx.currentTime,
        0.03,
      );
    }
  },

  customTrackError: null as string | null,

  playCustomAudioFile(
    file: File,
    car?: RadioCarDescriptor,
    onError?: (msg: string) => void,
  ): string {
    this.ensureAudioGraph();
    this.customTrackError = null;

    const url = URL.createObjectURL(file);
    if (!this.customAudioEl) {
      this.customAudioEl = new Audio();
      this.customAudioEl.loop = true;
      this.customAudioEl.preload = 'auto';
      this.customAudioEl.setAttribute('playsinline', 'true');
      this.customAudioEl.setAttribute('webkit-playsinline', 'true');
      this.customAudioEl.crossOrigin = 'anonymous';
    } else if (this.customAudioEl.src.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(this.customAudioEl.src);
      } catch {
        // ignore
      }
    }

    const audioEl = this.customAudioEl;
    audioEl.onerror = () => {
      if (this.customAudioEl !== audioEl) return;
      const lower = (file.name || '').toLowerCase();
      const msg = lower.endsWith('.m4p')
        ? 'DRM-protected .m4p files cannot be decoded by browsers. Try an unprotected .m4a, .mp4, .mp3, or .wav file.'
        : `Could not decode "${file.name}". Try an .m4a, .mp3, .wav, or .ogg audio file.`;
      this.customTrackError = msg;
      this.stereoPlaying = false;
      onError?.(msg);
    };

    audioEl.src = url;
    // The Web Audio graph owns loudness; keep the element at unity so the two
    // volume stages do not multiply into a quiet, muddy result.
    audioEl.volume = 1;
    audioEl.load();
    this.attachAudioElement(audioEl);
    if (car) {
      this.applyVehicleRadioProfile(car);
    }
    this.customTrackName = file.name.replace(/\.[^/.]+$/, '') || 'Custom Audio';
    this.userPaused = false;
    this.stereoPlaying = true;
    audioEl.play().catch(() => {
      // Autoplay or codec fallback handled cleanly on user play click / onerror
    });
    return this.customTrackName;
  },

  hasTrack(): boolean {
    return Boolean(this.customAudioEl && this.customTrackName);
  },

  togglePlay(car?: RadioCarDescriptor): boolean {
    if (this.stereoPlaying) {
      this.pause();
      return false;
    }
    this.ensureAudioGraph();
    this.userPaused = false;
    if (car) {
      this.applyVehicleRadioProfile(car);
    }
    // Only the player's own uploaded audio plays. There is deliberately no
    // generated/placeholder music to fall back to.
    if (this.hasTrack() && this.customAudioEl) {
      this.stereoPlaying = true;
      this.customAudioEl.volume = 1;
      this.customAudioEl.play().catch(() => {});
    }
    return this.stereoPlaying;
  },

  pause(): void {
    this.userPaused = true;
    this.stereoPlaying = false;
    if (this.customAudioEl) {
      this.customAudioEl.pause();
    }
  },

  stopAll(): void {
    this.userPaused = true;
    this.stereoPlaying = false;
    this.stopAudioElementOnly();
  },

  stopAudioElementOnly(): void {
    if (this.customAudioEl) {
      this.customAudioEl.pause();
    }
  },

  // Returns real-time bass level (0..1), chest-thump impulse (0..1), and quarter-panel flex
  sampleBassAndChestThump(
    car: RadioCarDescriptor,
    nowMs = Date.now(),
  ): {
    bassLevel: number;
    chestThump: number;
    trunkPump: number;
    quarterFlex: number;
    carType: CarType;
  } {
    const carType = resolveCarAudioType(car);
    const profile = AUDIO_PROFILES[carType];
    if (!this.stereoPlaying || !this.analyser || !this.freqData) {
      return { bassLevel: 0, chestThump: 0, trunkPump: 0, quarterFlex: 0, carType };
    }

    this.analyser.getByteFrequencyData(this.freqData);

    // Low-frequency sub-bass bins (0..9 ≈ 0-215 Hz for a 2048-point FFT)
    let sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += this.freqData[i] || 0;
    }
    const rawIntensity = sum / (10 * 255);
    const quarterFlex = Math.min(1, rawIntensity * profile.shake * 1.35);

    if (!this.isOldSchoolCar(car)) {
      return {
        bassLevel: Math.min(1, rawIntensity * 0.5),
        chestThump: 0,
        trunkPump: 0,
        quarterFlex,
        carType,
      };
    }

    const bassLevel = Math.max(0, Math.min(1, (rawIntensity - 0.12) / 0.66));

    // Sharp chest thump on heavy low-end hits
    let chestThump = 0;
    if (bassLevel > 0.38 && nowMs - this.lastThumpMs > 110) {
      this.lastThumpMs = nowMs;
      chestThump = Math.min(1, (bassLevel - 0.38) * 1.9);

      // Subtle mobile haptic thud in first-person old-school driving
      if (
        this.cameraMode === 'FIRST_PERSON' &&
        typeof navigator !== 'undefined' &&
        typeof navigator.vibrate === 'function' &&
        chestThump > 0.65
      ) {
        navigator.vibrate(18);
      }
    }

    return {
      bassLevel,
      chestThump,
      trunkPump: bassLevel,
      quarterFlex,
      carType,
    };
  },

  // Applies first-person driver view + old-school chest bass pulse to camera & trunk
  updateDrivingView(
    car: RadioCarDescriptor,
    camera: THREE.Camera | null,
    trunkMesh: THREE.Object3D | null,
    seatOffset = { x: -0.35, y: 1.05, z: 0.15 },
    lookYaw = 0,
    lookPitch = 0,
  ): {
    mode: DrivingCameraMode;
    trunkPump: number;
    chestThump: number;
  } {
    const { trunkPump, chestThump } = this.sampleBassAndChestThump(car);

    // 1. Trunk pump on old-school cars only
    if (trunkMesh) {
      const baseY = trunkMesh.userData.baseY ?? trunkMesh.position.y;
      trunkMesh.userData.baseY = baseY;
      trunkMesh.position.y = baseY + trunkPump * 0.05;
      trunkMesh.rotation.x = -(trunkPump * 0.035);
    }

    // 2. First-person interior seat camera for ALL cars
    if (this.cameraMode === 'FIRST_PERSON' && camera) {
      camera.position.set(seatOffset.x, seatOffset.y, seatOffset.z);

      // Old-school cars add chest-thump camera pulse; modern exotics stay steady
      const thumpZ = this.isOldSchoolCar(car) ? -chestThump * 0.025 : 0;
      const thumpY = this.isOldSchoolCar(car) ? chestThump * 0.018 : 0;

      camera.position.z += thumpZ;
      camera.position.y += thumpY;
      camera.rotation.order = 'YXZ';
      camera.rotation.y = lookYaw;
      camera.rotation.x = Math.max(-0.55, Math.min(0.45, lookPitch));
    }

    return {
      mode: this.cameraMode,
      trunkPump,
      chestThump,
    };
  },
};

export const CAR_RADIO_TRUNK_SYSTEM = {
  pandoraOpen: false,
  searchQuery: '',

  // Old-school cars get real trunk pump; modern exotics/hypercars stay clean standard radio
  isOldSchoolCar(car: RadioCarDescriptor = {}): boolean {
    return isOldSchoolVehicleDescriptor(car);
  },

  initAudioPipeline(audioElement: HTMLMediaElement): void {
    CABIN_BASS_AND_FIRST_PERSON.attachAudioElement(audioElement);
  },

  configureForCar(car: RadioCarDescriptor): {
    carName: string;
    radioMode: 'OLD_SCHOOL_TRUNK_PUMP' | 'STANDARD_CAR_RADIO';
    trunkPumpEnabled: boolean;
  } {
    const oldSchool = this.isOldSchoolCar(car);
    CABIN_BASS_AND_FIRST_PERSON.applyVehicleRadioProfile(car);
    return {
      carName: car?.name || 'Vehicle',
      radioMode: oldSchool ? 'OLD_SCHOOL_TRUNK_PUMP' : 'STANDARD_CAR_RADIO',
      trunkPumpEnabled: oldSchool,
    };
  },

  // Returns a 0.0 -> 1.0 bass intensity from the actual playing audio (0 for modern exotics)
  getTrunkPumpLevel(car: RadioCarDescriptor): number {
    return CABIN_BASS_AND_FIRST_PERSON.sampleBassAndChestThump(car).trunkPump;
  },

  // Open Pandora search view inside the game overlay
  openPandoraSearch(query = ''): {
    pandoraOpen: boolean;
    searchQuery: string;
    url: string;
  } {
    this.pandoraOpen = true;
    this.searchQuery = query.trim();
    const encoded = encodeURIComponent(this.searchQuery);
    const pandoraSearchUrl = this.searchQuery
      ? `https://www.pandora.com/search/${encoded}/all`
      : 'https://www.pandora.com';

    return {
      pandoraOpen: true,
      searchQuery: this.searchQuery,
      url: pandoraSearchUrl,
    };
  },

  closePandora(): { pandoraOpen: boolean } {
    this.pandoraOpen = false;
    return { pandoraOpen: false };
  },
};

export function updateCarTrunkAudio(
  carState: RadioCarDescriptor,
  trunkMesh: THREE.Object3D | null | undefined,
): number {
  const pump = CAR_RADIO_TRUNK_SYSTEM.getTrunkPumpLevel(carState);
  if (!trunkMesh) return pump;

  if (pump > 0) {
    // Real bass-driven trunk lid lift + subtle vibration on old-school cars only
    const baseY = trunkMesh.userData.baseY ?? trunkMesh.position.y;
    trunkMesh.userData.baseY = baseY;
    trunkMesh.position.y = baseY + pump * 0.045;
    trunkMesh.rotation.x = -(pump * 0.03);
  } else if (trunkMesh.userData.baseY !== undefined) {
    trunkMesh.position.y = trunkMesh.userData.baseY;
    trunkMesh.rotation.x = 0;
  }

  return pump;
}

export function updateCarAudioPosition(
  audio: HTMLAudioElement,
  car: THREE.Object3D,
  player: THREE.Object3D,
  listener: THREE.AudioListener,
) {
  const distance = player.position.distanceTo(car.position);
  const inside = distance < 3;

  // The Web Audio graph (and HRTF panner) applies the distance attenuation, so
  // the media element itself stays at unity. Writing a second, multiplied
  // attenuation here is what previously made the stereo quiet and thin.
  audio.volume = 1;
  const volume = THREE.MathUtils.clamp(1 - distance / 50, 0, 1);

  if (inside && audio.paused) {
    if (listener?.context?.state === 'suspended') {
      listener.context.resume().catch(() => {});
    }
    audio.play().catch(() => {});
  }

  return { inside, distance, volume };
}

const _carPos3D = new THREE.Vector3();
const _camPos3D = new THREE.Vector3();
const _camQuat3D = new THREE.Quaternion();
const _camForward3D = new THREE.Vector3();

export function updateCarStereo3D(
  panner: PannerNode,
  car: THREE.Object3D,
  camera: THREE.Camera,
) {
  const t = panner.context.currentTime;
  car.updateMatrixWorld();
  camera.updateMatrixWorld();
  const pos = car.getWorldPosition(_carPos3D);
  const listener = panner.context.listener;
  const camPos = camera.getWorldPosition(_camPos3D);
  const forward = _camForward3D
    .set(0, 0, -1)
    .applyQuaternion(camera.getWorldQuaternion(_camQuat3D));

  if (panner.positionX) {
    panner.positionX.setTargetAtTime(pos.x, t, 0.04);
    panner.positionY.setTargetAtTime(pos.y, t, 0.04);
    panner.positionZ.setTargetAtTime(pos.z, t, 0.04);
  } else {
    const legacyPanner = panner as unknown as {
      setPosition?: (x: number, y: number, z: number) => void;
    };
    legacyPanner.setPosition?.(pos.x, pos.y, pos.z);
  }

  if (listener.positionX) {
    listener.positionX.setTargetAtTime(camPos.x, t, 0.04);
    listener.positionY.setTargetAtTime(camPos.y, t, 0.04);
    listener.positionZ.setTargetAtTime(camPos.z, t, 0.04);
  } else {
    const legacyListener = listener as unknown as {
      setPosition?: (x: number, y: number, z: number) => void;
    };
    legacyListener.setPosition?.(camPos.x, camPos.y, camPos.z);
  }

  if (listener.forwardX) {
    listener.forwardX.setTargetAtTime(forward.x, t, 0.04);
    listener.forwardY.setTargetAtTime(forward.y, t, 0.04);
    listener.forwardZ.setTargetAtTime(forward.z, t, 0.04);
  } else {
    const legacyListener = listener as unknown as {
      setOrientation?: (
        fx: number,
        fy: number,
        fz: number,
        ux: number,
        uy: number,
        uz: number,
      ) => void;
    };
    legacyListener.setOrientation?.(forward.x, forward.y, forward.z, 0, 1, 0);
  }
}

interface CapacitorAppLauncherPlugin {
  canOpenUrl?: (options: { url: string }) => Promise<{ value?: boolean }>;
  openUrl?: (options: { url: string }) => Promise<{ completed?: boolean }>;
}

interface CapacitorGlobal {
  Plugins?: {
    AppLauncher?: CapacitorAppLauncherPlugin;
  };
}

function openExternalUrlInNewTab(url: string): void {
  if (typeof document === 'undefined') return;
  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } catch {
    // Ignore link launch issues on restricted environments
  }
}

export const PANDORA_APP_LAUNCHER = {
  waitingForReturn: false,
  _returnListenerBound: false,

  bindReturnListener(): void {
    if (this._returnListenerBound || typeof window === 'undefined') return;
    this._returnListenerBound = true;
    const handleReturn = () => {
      if (!this.waitingForReturn) return;
      if (document.visibilityState && document.visibilityState === 'hidden') return;
      this.waitingForReturn = false;
      if (
        CABIN_BASS_AND_FIRST_PERSON.audioCtx &&
        CABIN_BASS_AND_FIRST_PERSON.audioCtx.state === 'suspended'
      ) {
        CABIN_BASS_AND_FIRST_PERSON.audioCtx.resume().catch(() => {});
      }
    };
    window.addEventListener('focus', handleReturn);
    document.addEventListener('visibilitychange', handleReturn);
  },

  async openPandoraApp(
    query = '',
  ): Promise<{ launched: 'pandora_app' | 'web_fallback'; url: string }> {
    this.waitingForReturn = true;
    this.bindReturnListener();

    const trimmed = query.trim();
    const webUrl = trimmed
      ? `https://www.pandora.com/search/${encodeURIComponent(trimmed)}/all`
      : 'https://www.pandora.com';

    const cap =
      typeof window !== 'undefined'
        ? (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor
        : null;
    const launcher = cap?.Plugins?.AppLauncher;

    // 1. Native Capacitor build: try launching the Pandora app directly
    if (launcher && typeof launcher.openUrl === 'function') {
      try {
        if (typeof launcher.canOpenUrl === 'function') {
          const check = await launcher.canOpenUrl({ url: 'pandora://' });
          if (check && check.value === false) {
            openExternalUrlInNewTab(webUrl);
            return { launched: 'web_fallback', url: webUrl };
          }
        }

        const result = await launcher.openUrl({ url: 'pandora://' });
        if (result?.completed) {
          return { launched: 'pandora_app', url: 'pandora://' };
        }
      } catch {
        // Fall through to web fallback if scheme isn't registered or fails
      }
    }

    // 2. Fallback: open Pandora in browser/tab instead of stalling an in-game frame
    openExternalUrlInNewTab(webUrl);
    return { launched: 'web_fallback', url: webUrl };
  },
};
