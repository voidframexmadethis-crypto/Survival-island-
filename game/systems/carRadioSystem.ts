import type * as THREE from 'three';

export interface RadioCarDescriptor {
  id?: string;
  name?: string;
  class?: string;
  style?: string;
  preset?: string;
  hasTrunkBass?: boolean;
}

export type DrivingCameraMode = 'CHASE' | 'FIRST_PERSON';

export interface BuiltInRadioStation {
  id: string;
  name: string;
  genre: string;
  bpm: number;
  bassFreqs: number[];
  leadFreqs: number[];
}

export const BUILT_IN_RADIO_STATIONS: BuiltInRadioStation[] = [
  {
    id: 'slab_808',
    name: 'H-Town Candy SLAB 808',
    genre: 'Chopped & Screwed Trunk Bass',
    bpm: 78,
    bassFreqs: [46.2, 41.2, 49.0, 38.9],
    leadFreqs: [220, 261.63, 293.66, 329.63],
  },
  {
    id: 'west_coast_bounce',
    name: '64 Lowrider Cruise FM',
    genre: 'Classic West Coast G-Funk',
    bpm: 94,
    bassFreqs: [55.0, 49.0, 65.41, 43.65],
    leadFreqs: [392, 440, 493.88, 587.33],
  },
  {
    id: 'exotic_synth',
    name: 'Midnight Hypercar Horizon',
    genre: 'Clean Turbo Synthwave',
    bpm: 118,
    bassFreqs: [65.41, 73.42, 58.27, 82.41],
    leadFreqs: [523.25, 659.25, 783.99, 880.0],
  },
];

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

export const CABIN_BASS_AND_FIRST_PERSON = {
  audioCtx: null as AudioContext | null,
  analyser: null as AnalyserNode | null,
  bassFilter: null as BiquadFilterNode | null,
  compressor: null as DynamicsCompressorNode | null,
  masterGain: null as GainNode | null,
  freqData: null as Uint8Array<ArrayBuffer> | null,
  connectedElements: new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>(),
  cameraMode: 'CHASE' as DrivingCameraMode,
  lastThumpMs: 0,

  // Built-in stereo loop state (routes directly through bassFilter -> analyser -> compressor)
  stereoPlaying: false,
  stereoVolume: 0.78,
  activeStationId: 'slab_808',
  customTrackName: null as string | null,
  customAudioEl: null as HTMLAudioElement | null,
  synthTimer: null as number | null,
  synthStep: 0,

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
      this.audioCtx = new AudioCtx();

      // Punchy low-end shelf for old-school trunk + chest bass
      this.bassFilter = this.audioCtx.createBiquadFilter();
      this.bassFilter.type = 'lowshelf';
      this.bassFilter.frequency.value = 82;
      this.bassFilter.gain.value = 0;

      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.72;
      this.freqData = new Uint8Array(
        new ArrayBuffer(this.analyser.frequencyBinCount),
      );

      // Compressor prevents clipping when bass hits hard
      this.compressor = this.audioCtx.createDynamicsCompressor();
      this.compressor.threshold.value = -14;
      this.compressor.knee.value = 18;
      this.compressor.ratio.value = 6;

      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.value = this.stereoVolume;

      this.bassFilter.connect(this.analyser);
      this.analyser.connect(this.compressor);
      this.compressor.connect(this.masterGain);
      this.masterGain.connect(this.audioCtx.destination);
    }

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
  },

  attachAudioElement(audioEl: HTMLMediaElement | null): void {
    if (typeof window === 'undefined' || !audioEl) return;
    this.ensureAudioGraph();
    if (!this.audioCtx || !this.bassFilter) return;

    if (!this.connectedElements.has(audioEl)) {
      try {
        const source = this.audioCtx.createMediaElementSource(audioEl);
        source.connect(this.bassFilter);
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

  // Updates radio profile per vehicle: trunk + chest bass for old-school, clean radio for exotics
  applyVehicleRadioProfile(car: RadioCarDescriptor): {
    oldSchool: boolean;
    radioMode: 'OLD_SCHOOL_TRUNK_AND_CHEST_BASS' | 'STANDARD_RADIO';
  } {
    const oldSchool = this.isOldSchoolCar(car);
    if (this.bassFilter && this.audioCtx) {
      this.bassFilter.gain.setTargetAtTime(
        oldSchool ? 9.5 : 0,
        this.audioCtx.currentTime,
        0.03,
      );
    }
    return {
      oldSchool,
      radioMode: oldSchool ? 'OLD_SCHOOL_TRUNK_AND_CHEST_BASS' : 'STANDARD_RADIO',
    };
  },

  setVolume(vol: number): void {
    this.stereoVolume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setTargetAtTime(
        this.stereoVolume,
        this.audioCtx.currentTime,
        0.02,
      );
    }
    if (this.customAudioEl) {
      this.customAudioEl.volume = this.stereoVolume;
    }
  },

  startStation(stationId: string, car?: RadioCarDescriptor): void {
    this.ensureAudioGraph();
    this.stopAudioElementOnly();
    this.activeStationId = stationId;
    this.customTrackName = null;
    if (car) {
      this.applyVehicleRadioProfile(car);
    }
    this.stereoPlaying = true;
    this.startSynthLoop();
  },

  customTrackError: null as string | null,

  playCustomAudioFile(
    file: File,
    car?: RadioCarDescriptor,
    onError?: (msg: string) => void,
  ): string {
    this.ensureAudioGraph();
    this.stopSynthLoop();
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
    audioEl.volume = this.stereoVolume;
    audioEl.load();
    this.attachAudioElement(audioEl);
    if (car) {
      this.applyVehicleRadioProfile(car);
    }
    this.customTrackName = file.name.replace(/\.[^/.]+$/, '') || 'Custom Audio';
    this.stereoPlaying = true;
    audioEl.play().catch(() => {
      // Autoplay or codec fallback handled cleanly on user play click / onerror
    });
    return this.customTrackName;
  },

  togglePlay(car?: RadioCarDescriptor): boolean {
    if (this.stereoPlaying) {
      this.pause();
      return false;
    }
    this.ensureAudioGraph();
    if (car) {
      this.applyVehicleRadioProfile(car);
    }
    if (this.customAudioEl && this.customTrackName) {
      this.stereoPlaying = true;
      this.customAudioEl.play().catch(() => {});
    } else {
      this.startStation(this.activeStationId, car);
    }
    return this.stereoPlaying;
  },

  pause(): void {
    this.stereoPlaying = false;
    this.stopSynthLoop();
    if (this.customAudioEl) {
      this.customAudioEl.pause();
    }
  },

  stopAll(): void {
    this.stereoPlaying = false;
    this.stopSynthLoop();
    this.stopAudioElementOnly();
  },

  stopAudioElementOnly(): void {
    if (this.customAudioEl) {
      this.customAudioEl.pause();
    }
  },

  stopSynthLoop(): void {
    if (this.synthTimer !== null && typeof window !== 'undefined') {
      window.clearInterval(this.synthTimer);
      this.synthTimer = null;
    }
  },

  startSynthLoop(): void {
    this.stopSynthLoop();
    if (typeof window === 'undefined') return;
    const station =
      BUILT_IN_RADIO_STATIONS.find((s) => s.id === this.activeStationId) ||
      BUILT_IN_RADIO_STATIONS[0];
    const stepMs = Math.round((60 / station.bpm / 2) * 1000);
    this.triggerSynthStep(station);
    this.synthTimer = window.setInterval(() => {
      if (!this.stereoPlaying) return;
      const activeStation =
        BUILT_IN_RADIO_STATIONS.find((s) => s.id === this.activeStationId) ||
        BUILT_IN_RADIO_STATIONS[0];
      this.triggerSynthStep(activeStation);
    }, stepMs);
  },

  triggerSynthStep(station: BuiltInRadioStation): void {
    if (!this.audioCtx || !this.bassFilter || this.audioCtx.state !== 'running') {
      return;
    }
    try {
      const now = this.audioCtx.currentTime;
      const step = this.synthStep % 8;
      this.synthStep += 1;

      // Punchy 808 sub-bass kick on groove steps
      if (step === 0 || step === 3 || step === 4 || step === 6) {
        const subFreq = station.bassFreqs[step % station.bassFreqs.length];
        const osc = this.audioCtx.createOscillator();
        const g = this.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(subFreq * 1.65, now);
        osc.frequency.exponentialRampToValueAtTime(subFreq, now + 0.085);
        g.gain.setValueAtTime(step === 0 || step === 4 ? 0.55 : 0.42, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
        osc.connect(g);
        g.connect(this.bassFilter);
        osc.start(now);
        osc.stop(now + 0.36);
      }

      // Snare / clap on 2 and 6
      if (step === 2 || step === 6) {
        const dur = 0.09;
        const buf = this.audioCtx.createBuffer(
          1,
          Math.floor(this.audioCtx.sampleRate * dur),
          this.audioCtx.sampleRate,
        );
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.25));
        }
        const src = this.audioCtx.createBufferSource();
        src.buffer = buf;
        const hp = this.audioCtx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 1100;
        const sg = this.audioCtx.createGain();
        sg.gain.setValueAtTime(0.16, now);
        sg.gain.exponentialRampToValueAtTime(0.001, now + dur);
        src.connect(hp);
        hp.connect(sg);
        sg.connect(this.bassFilter);
        src.start(now);
      }

      // Melodic synth chord note
      if (step % 2 === 0) {
        const leadFreq = station.leadFreqs[(step / 2) % station.leadFreqs.length];
        const leadOsc = this.audioCtx.createOscillator();
        const lg = this.audioCtx.createGain();
        leadOsc.type = 'triangle';
        leadOsc.frequency.setValueAtTime(leadFreq, now);
        lg.gain.setValueAtTime(0.075, now);
        lg.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
        leadOsc.connect(lg);
        lg.connect(this.bassFilter);
        leadOsc.start(now);
        leadOsc.stop(now + 0.26);
      }
    } catch {
      // Ignore Web Audio scheduling edge cases
    }
  },

  // Returns real-time bass level (0..1) and chest-thump impulse (0..1)
  sampleBassAndChestThump(
    car: RadioCarDescriptor,
    nowMs = Date.now(),
  ): { bassLevel: number; chestThump: number; trunkPump: number } {
    if (
      !this.isOldSchoolCar(car) ||
      !this.stereoPlaying ||
      !this.analyser ||
      !this.freqData
    ) {
      return { bassLevel: 0, chestThump: 0, trunkPump: 0 };
    }

    this.analyser.getByteFrequencyData(this.freqData);

    // Sub-bass + chest punch bins (bins 1..8)
    let sum = 0;
    for (let i = 1; i <= 8; i++) {
      sum += this.freqData[i] || 0;
    }
    const normBass = sum / 8 / 255;
    const bassLevel = Math.max(0, Math.min(1, (normBass - 0.22) / 0.72));

    // Sharp chest thump on heavy low-end hits
    let chestThump = 0;
    if (bassLevel > 0.42 && nowMs - this.lastThumpMs > 110) {
      this.lastThumpMs = nowMs;
      chestThump = Math.min(1, (bassLevel - 0.42) * 1.85);

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
