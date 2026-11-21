game/systems/vehicleStereoAudioFix.ts

import type * as THREE from 'three';

export type StereoVehicleType =
  | 'BLUE_DONK'
  | 'CHEVY_TAHOE'
  | 'CLASSIC'
  | 'MODERN_SUPERCAR'
  | 'STANDARD';

export interface StereoVehicle {
  name?: string;
  id?: string;
  class?: string;
  style?: string;
  preset?: string;
  hasTrunkBass?: boolean;
}

export interface StereoAudioState {
  bassLevel: number;
  panelVibration: number;
  cabinBass: number;
  profile: StereoVehicleType;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export const VEHICLE_STEREO_AUDIO_FIX = {
  context: null as AudioContext | null,
  input: null as GainNode | null,
  equalizer: null as BiquadFilterNode | null,
  bassBoost: null as BiquadFilterNode | null,
  compressor: null as DynamicsCompressorNode | null,
  master: null as GainNode | null,
  analyser: null as AnalyserNode | null,
  frequencyData: null as Uint8Array<ArrayBuffer> | null,
  sourceNodes: new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>(),
  currentProfile: 'STANDARD' as StereoVehicleType,
  volume: 0.8,
  enabled: true,

  detectVehicle(vehicle: StereoVehicle = {}): StereoVehicleType {
    const description = [
      vehicle.name,
      vehicle.id,
      vehicle.class,
      vehicle.style,
      vehicle.preset,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    if (
      description.includes('blue donk') ||
      description.includes('blue_donk') ||
      description.includes('donk')
    ) {
      return 'BLUE_DONK';
    }

    if (
      description.includes('chevy tahoe') ||
      description.includes('chevy_tahoe') ||
      description.includes('tahoe') ||
      description.includes('subwoofer')
    ) {
      return 'CHEVY_TAHOE';
    }

    if (
      vehicle.hasTrunkBass ||
      description.includes('classic') ||
      description.includes('old school') ||
      description.includes('old-school') ||
      description.includes('lowrider') ||
      description.includes('slab') ||
      description.includes('cadillac') ||
      description.includes('impala')
    ) {
      return 'CLASSIC';
    }

    if (
      description.includes('supercar') ||
      description.includes('hypercar') ||
      description.includes('mclaren') ||
      description.includes('ferrari') ||
      description.includes('bugatti') ||
      description.includes('lamborghini') ||
      description.includes('aston') ||
      description.includes('pagani') ||
      description.includes('koenigsegg')
    ) {
      return 'MODERN_SUPERCAR';
    }

    return 'STANDARD';
  },

  initialize(): boolean {
    if (typeof window === 'undefined') return false;

    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as {
        webkitAudioContext?: typeof AudioContext;
      }).webkitAudioContext;

    if (!AudioContextClass) return false;

    if (this.context && this.context.state !== 'closed') {
      return true;
    }

    this.context = new AudioContextClass();

    this.input = this.context.createGain();

    this.equalizer = this.context.createBiquadFilter();
    this.equalizer.type = 'peaking';
    this.equalizer.frequency.value = 1000;
    this.equalizer.Q.value = 0.8;
    this.equalizer.gain.value = 0;

    this.bassBoost = this.context.createBiquadFilter();
    this.bassBoost.type = 'lowshelf';
    this.bassBoost.frequency.value = 75;
    this.bassBoost.gain.value = 0;

    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.78;

    this.frequencyData = new Uint8Array(
      new ArrayBuffer(this.analyser.frequencyBinCount)
    );

    this.compressor = this.context.createDynamicsCompressor();
    this.compressor.threshold.value = -12;
    this.compressor.knee.value = 16;
    this.compressor.ratio.value = 4;
    this.compressor.attack.value = 0.008;
    this.compressor.release.value = 0.18;

    this.master = this.context.createGain();
    this.master.gain.value = this.volume;

    this.input.connect(this.equalizer);
    this.equalizer.connect(this.bassBoost);
    this.bassBoost.connect(this.analyser);
    this.analyser.connect(this.compressor);
    this.compressor.connect(this.master);
    this.master.connect(this.context.destination);

    return true;
  },

  resume(): void {
    if (this.context?.state === 'suspended') {
      void this.context.resume().catch(() => {});
    }
  },

  connectAudioElement(element: HTMLMediaElement): boolean {
    if (!this.initialize() || !this.context || !this.input) {
      return false;
    }

    if (this.sourceNodes.has(element)) return true;

    try {
      const source = this.context.createMediaElementSource(element);
      source.connect(this.input);
      this.sourceNodes.set(element, source);
      this.resume();
      return true;
    } catch {
      return false;
    }
  },

  applyVehicleProfile(vehicle: StereoVehicle): StereoVehicleType {
    if (!this.initialize() || !this.context) {
      return this.detectVehicle(vehicle);
    }

    const profile = this.detectVehicle(vehicle);
    this.currentProfile = profile;

    const profiles: Record<
      StereoVehicleType,
      { bass: number; mid: number; volume: number }
    > = {
      BLUE_DONK: {
        bass: 15,
        mid: 1.5,
        volume: 0.9,
      },
      CHEVY_TAHOE: {
        bass: 12,
        mid: 2,
        volume: 0.88,
      },
      CLASSIC: {
        bass: 9,
        mid: 1,
        volume: 0.85,
      },
      MODERN_SUPERCAR: {
        bass: 1.5,
        mid: 0,
        volume: 0.8,
      },
      STANDARD: {
        bass: 3,
        mid: 0,
        volume: 0.8,
      },
    };

    const settings = profiles[profile];
    const now = this.context.currentTime;

    this.bassBoost?.gain.setTargetAtTime(
      settings.bass,
      now,
      0.04
    );

    this.equalizer?.gain.setTargetAtTime(
      settings.mid,
      now,
      0.04
    );

    this.master?.gain.setTargetAtTime(
      this.volume * settings.volume,
      now,
      0.04
    );

    return profile;
  },

  setVolume(value: number): void {
    this.volume = clamp(value, 0, 1);

    if (this.master && this.context) {
      const profileVolume =
        this.currentProfile === 'BLUE_DONK'
          ? 0.9
          : this.currentProfile === 'CHEVY_TAHOE'
            ? 0.88
            : this.currentProfile === 'CLASSIC'
              ? 0.85
              : this.currentProfile === 'MODERN_SUPERCAR'
                ? 0.8
                : 0.8;

      this.master.gain.setTargetAtTime(
        this.volume * profileVolume,
        this.context.currentTime,
        0.03
      );
    }
  },

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;

    if (this.master && this.context) {
      this.master.gain.setTargetAtTime(
        enabled ? this.volume : 0,
        this.context.currentTime,
        0.04
      );
    }
  },

  measureBass(): StereoAudioState {
    if (!this.analyser || !this.frequencyData) {
      return {
        bassLevel: 0,
        panelVibration: 0,
        cabinBass: 0,
        profile: this.currentProfile,
      };
    }

    this.analyser.getByteFrequencyData(this.frequencyData);

    let total = 0;
    const count = Math.min(12, this.frequencyData.length);

    for (let i = 1; i < count; i++) {
      total += this.frequencyData[i] || 0;
    }

    const average = count > 1 ? total / (count - 1) : 0;
    const bassLevel = clamp((average / 255 - 0.12) / 0.7, 0, 1);

    const panelMultiplier =
      this.currentProfile === 'BLUE_DONK'
        ? 1
        : this.currentProfile === 'CHEVY_TAHOE'
          ? 0.72
          : this.currentProfile === 'CLASSIC'
            ? 0.48
            : 0;

    return {
      bassLevel,
      panelVibration: bassLevel * panelMultiplier,
      cabinBass: bassLevel,
      profile: this.currentProfile,
    };
  },

  updateQuarterPanel(
    panel: THREE.Object3D | null,
    state?: StereoAudioState
  ): number {
    if (!panel) return 0;

    const audioState = state || this.measureBass();

    const intensity = audioState.panelVibration;
    const baseRotation = panel.userData.stereoBaseRotationX;

    if (baseRotation === undefined) {
      panel.userData.stereoBaseRotationX = panel.rotation.x;
    }

    const base = panel.userData.stereoBaseRotationX as number;

    panel.rotation.x =
      base + Math.sin(performance.now() * 0.055) * intensity * 0.035;

    panel.position.y =
      (panel.userData.stereoBasePositionY ?? panel.position.y) +
      Math.sin(performance.now() * 0.075) * intensity * 0.018;

    return intensity;
  },

  updateCabinBass(
    cabinParts: THREE.Object3D[],
    state?: StereoAudioState
  ): number {
    const audioState = state || this.measureBass();

    for (const part of cabinParts) {
      if (!part) continue;

      if (part.userData.stereoBaseY === undefined) {
        part.userData.stereoBaseY = part.position.y;
      }

      const baseY = part.userData.stereoBaseY as number;

      const movement =
        audioState.cabinBass *
        (this.currentProfile === 'CHEVY_TAHOE' ? 0.012 : 0.005);

      part.position.y =
        baseY + Math.sin(performance.now() * 0.065) * movement;
    }

    return audioState.cabinBass;
  },

  dispose(): void {
    if (this.context && this.context.state !== 'closed') {
      void this.context.close().catch(() => {});
    }

    this.context = null;
    this.input = null;
    this.equalizer = null;
    this.bassBoost = null;
    this.compressor = null;
    this.master = null;
    this.analyser = null;
    this.frequencyData = null;
  },
};

export default VEHICLE_STEREO_AUDIO_FIX;
