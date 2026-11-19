import * as THREE from 'three';
import type { TvBassMode, TvSafetyMode } from '../types';

export type { TvBassMode };

export interface TvBassModeMeta {
  id: TvBassMode;
  label: string;
  badge: string;
  lowShelfDb: number;
  subPeakDb: number;
  bumpScale: number;
}

export const TV_BASS_MODES: TvBassModeMeta[] = [
  {
    id: 'off',
    label: 'Stock',
    badge: 'CLEAN',
    lowShelfDb: 0,
    subPeakDb: 0,
    bumpScale: 0,
  },
  {
    id: 'trunk',
    label: 'Car Trunk',
    badge: 'TRUNK SUB',
    lowShelfDb: 13.5,
    subPeakDb: 9.5,
    bumpScale: 0.78,
  },
  {
    id: 'extreme',
    label: '2x12" Sub',
    badge: 'MAX TRUNK',
    lowShelfDb: 18.5,
    subPeakDb: 14.5,
    bumpScale: 1.0,
  },
];

export function normalizeTvBassMode(mode: unknown): TvBassMode {
  if (mode === 'off' || mode === 'trunk' || mode === 'extreme') return mode;
  return 'trunk';
}

export function getTvBassModeMeta(mode: TvBassMode): TvBassModeMeta {
  return TV_BASS_MODES.find((m) => m.id === mode) || TV_BASS_MODES[1];
}

export function computeTrunkBassEnvelope(params: {
  timeSec: number;
  active: boolean;
  bassMode: TvBassMode;
  volume: number;
  spatialMult: number;
  analyserEnergy?: number;
  transientPulse?: number;
}): number {
  if (!params.active || params.bassMode === 'off') return 0;
  const vol = Math.max(0, Math.min(1, params.volume));
  const spatial = Math.max(0, Math.min(1, params.spatialMult));
  const acousticScale = Math.min(1, vol * spatial * 1.15);
  if (acousticScale <= 0.005) return 0;

  const meta = getTvBassModeMeta(params.bassMode);
  const t = Math.max(0, params.timeSec);
  const analyser = Math.max(0, Math.min(1, params.analyserEnergy ?? 0));
  const transient = Math.max(0, Math.min(1, params.transientPulse ?? 0));

  // Rhythmic sub-bass swell + double-kick 808 trunk cadence
  const beatPhase = (t * 2.15) % 1;
  const primaryKick = Math.exp(-beatPhase * 5.4);
  const doubleHitPhase = ((t * 4.3 + 0.35) % 1);
  const subDrop = Math.exp(-doubleHitPhase * 7.2) * 0.55;
  const subSwell = 0.14 + 0.16 * (0.5 + 0.5 * Math.sin(t * 6.75));
  const rawDriver = Math.max(analyser, transient, primaryKick * 0.72 + subDrop * 0.35 + subSwell);

  return Math.max(0, Math.min(1, rawDriver * acousticScale * meta.bumpScale));
}

export function computeTrunkVisualOffsets(
  energy: number,
  timeSec: number,
  bassMode: TvBassMode,
): {
  scaleBoost: number;
  offsetZ: number;
  offsetY: number;
  tiltXRad: number;
  tiltZRad: number;
  glowBoost: number;
} {
  const e = Math.max(0, Math.min(1, energy));
  if (e <= 0.002 || bassMode === 'off') {
    return {
      scaleBoost: 0,
      offsetZ: 0,
      offsetY: 0,
      tiltXRad: 0,
      tiltZRad: 0,
      glowBoost: 0,
    };
  }
  const amp = bassMode === 'extreme' ? 1.32 : 1.0;
  const rattle = Math.sin(timeSec * 58) * e * amp;
  const sideRattle = Math.cos(timeSec * 47) * e * amp;
  return {
    scaleBoost: e * 0.024 * amp,
    offsetZ: e * 0.026 * amp + rattle * 0.004,
    offsetY: Math.abs(rattle) * 0.009 + e * 0.007 * amp,
    tiltXRad: rattle * 0.011,
    tiltZRad: sideRattle * 0.0085,
    glowBoost: e * (bassMode === 'extreme' ? 2.45 : 1.55),
  };
}

export interface SmartTvTelemetry {
  dayCount: number;
  timeOfDay: number;
  weather: string;
  erosionActive: boolean;
  tamedCount: number;
  dinoCount: number;
  daysUntilBloodMoon: number;
  playerBiome: string;
}

export type TvChannelId = 1 | 2 | 3 | 4 | 5;

export interface TvChannelMeta {
  id: TvChannelId;
  name: string;
  tagline: string;
  badge: string;
  color: string;
}

export const TV_CHANNELS: TvChannelMeta[] = [
  {
    id: 1,
    name: 'Lo-Fi Chill Radio',
    tagline: 'Retro Sunset Visualizer & Chill Synth Beats',
    badge: 'CH 1 · LO-FI',
    color: '#a855f7',
  },
  {
    id: 2,
    name: 'Lost World Survival News',
    tagline: 'Blood Moon Radar, Weather & Island Alerts',
    badge: 'CH 2 · NEWS',
    color: '#ef4444',
  },
  {
    id: 3,
    name: 'Nature & Wildlife Cam',
    tagline: 'Island Ocean Waves, Forest & Wildlife Audio',
    badge: 'CH 3 · NATURE',
    color: '#10b981',
  },
  {
    id: 4,
    name: 'Retro Arcade & Gaming',
    tagline: 'Cyber-Dino Starfighter 3D/Pixel Action Loop',
    badge: 'CH 4 · ARCADE',
    color: '#06b6d4',
  },
  {
    id: 5,
    name: 'Static / Standby',
    tagline: 'CRT Snow Signal & Ambient Tube Hum',
    badge: 'CH 5 · STATIC',
    color: '#64748b',
  },
];

export function normalizeChannelId(ch: number | undefined): TvChannelId {
  if (ch === 1 || ch === 2 || ch === 3 || ch === 4 || ch === 5) return ch;
  return 1;
}

export function setupVirtualTV(
  mesh: THREE.Mesh,
  videoElement: HTMLVideoElement,
): () => void {
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;

  const mat = mesh.material as THREE.MeshStandardMaterial;
  mat.map = texture;
  mat.emissiveMap = texture;
  mat.emissive = new THREE.Color(0xffffff);
  mat.emissiveIntensity = 1.0;
  mat.needsUpdate = true;

  let rafId = 0;
  let active = true;
  const updateTV = () => {
    if (!active) return;
    if (videoElement.readyState >= videoElement.HAVE_CURRENT_DATA) {
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      texture.needsUpdate = true;
    }
    rafId = window.requestAnimationFrame(updateTV);
  };
  rafId = window.requestAnimationFrame(updateTV);

  return () => {
    active = false;
    window.cancelAnimationFrame(rafId);
    texture.dispose();
  };
}

export class SmartTvSystem {
  public canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  public canvasTexture: THREE.CanvasTexture;
  public localVideoElement: HTMLVideoElement | null = null;
  private localVideoObjectUrl: string | null = null;
  public isUsingLocalVideo = false;
  public localVideoName = '';
  public isUsingYouTube = false;
  public youtubeVideoId = '';
  public youtubeTitle = 'YouTube';
  public youtubeChannel = 'YouTube';

  public power = true;
  public isPaused = false;
  public isStopped = false;
  public currentChannel: TvChannelId = 1;
  public volume = 0.75;
  public isMuted = false;
  public autoCycleChannels = false;
  public currentTimestamp = 0;
  public bassMode: TvBassMode = 'trunk';
  private trunkBassEnergy = 0;
  private trunkTransientPulse = 0;
  private lastTrunkHitTime = 0;
  private trunkStep = 0;

  private turnOnProgress = 1.0;
  private turnOffProgress = 0.0;
  private isPoweringTransition = false;
  private segmentTimer = 0;
  private onAutoAdvanceCallback?: (ch: TvChannelMeta) => void;
  private onLocalVideoErrorCallback?: (message: string) => void;

  // WebGL & Performance Safety State
  private safetyMode: TvSafetyMode = 'auto';
  private drawIntervalMs = 66; // 15 FPS default for balanced GPU load
  private lastDrawPerfMs = -Infinity;
  private staticFrameDirty = true;
  private activeAudioNodes = 0;

  // Web Audio Synthesizer & Car Trunk Subwoofer DSP Chain
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private localVideoSourceGain: GainNode | null = null;
  private trunkLowShelf: BiquadFilterNode | null = null;
  private trunkSubPeak: BiquadFilterNode | null = null;
  private trunkWarmthShaper: WaveShaperNode | null = null;
  private trunkCompressor: DynamicsCompressorNode | null = null;
  private trunkAnalyser: AnalyserNode | null = null;
  private trunkFreqBins: Uint8Array<ArrayBuffer> | null = null;
  private connectedVideoElements = new WeakMap<
    HTMLVideoElement,
    MediaElementAudioSourceNode
  >();
  private lastAudioNoteTime = 0;
  private audioStep = 0;
  private lastSpatialMult = 1.0;
  private directListenOverride = false;

  // TV Screen mesh & Light references
  private screenMesh: THREE.Mesh | null = null;
  private screenMat: THREE.MeshStandardMaterial | null = null;
  private standbyLedMat: THREE.MeshStandardMaterial | null = null;
  private placedTvMats = new Set<THREE.MeshStandardMaterial>();
  public tvGlowLight: THREE.PointLight | null = null;
  public tvWorldPos = new THREE.Vector3(1.4, 1.24, 0.41);

  // Animation clocks (frozen cleanly when isPaused === true)
  private animClock = 0;
  private newsTickerOffset = 0;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 640;
    this.canvas.height = 360;
    this.ctx = this.canvas.getContext('2d', { alpha: false });

    this.canvasTexture = this.createCanvasTexture(this.canvas);
    this.tvGlowLight = new THREE.PointLight(0xa855f7, 1.5, 8.0);
    this.tvGlowLight.castShadow = false;
  }

  private createCanvasTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    return tex;
  }

  public setLocalVideoErrorCallback(cb?: (message: string) => void): void {
    this.onLocalVideoErrorCallback = cb;
  }

  public setSafetyMode(mode: TvSafetyMode): void {
    if (this.safetyMode === mode && this.canvasTexture) return;
    this.safetyMode = mode;
    const targetW = mode === 'full_3d' ? 960 : 640;
    const targetH = mode === 'full_3d' ? 540 : 360;
    this.drawIntervalMs = mode === 'full_3d' ? 42 : mode === 'safe_mini' ? 84 : 66;

    if (this.canvas.width !== targetW || this.canvas.height !== targetH) {
      const oldTex = this.canvasTexture;
      this.canvas.width = targetW;
      this.canvas.height = targetH;
      this.ctx = this.canvas.getContext('2d', { alpha: false });
      this.canvasTexture = this.createCanvasTexture(this.canvas);
      this.applyMaterialTexture();
      this.placedTvMats.forEach((mat) => {
        mat.map = this.canvasTexture;
        mat.emissiveMap = this.canvasTexture;
        mat.needsUpdate = true;
      });
      oldTex.dispose();
    }
    this.staticFrameDirty = true;
    this.lastDrawPerfMs = -Infinity;
  }

  public handleWebGLContextRestored(): void {
    this.staticFrameDirty = true;
    this.lastDrawPerfMs = -Infinity;
    this.canvasTexture.needsUpdate = true;
    this.applyMaterialTexture();
  }

  public setAutoAdvanceCallback(cb?: (ch: TvChannelMeta) => void): void {
    this.onAutoAdvanceCallback = cb;
  }

  public unlockAudio(): void {
    this.initAudioContext();
  }

  public getCurrentChannelMeta(): TvChannelMeta {
    return TV_CHANNELS.find((c) => c.id === this.currentChannel) || TV_CHANNELS[0];
  }

  public syncPlacedTvVisual(group: THREE.Group): void {
    const mat = group.userData.tvScreenMat as THREE.MeshStandardMaterial | undefined;
    if (mat) {
      this.placedTvMats.add(mat);
      if (mat.map !== this.canvasTexture || mat.emissiveMap !== this.canvasTexture) {
        mat.map = this.canvasTexture;
        mat.emissiveMap = this.canvasTexture;
        mat.needsUpdate = true;
      }
      if (this.power) {
        mat.color.setHex(0xffffff);
        mat.emissive.setHex(0xffffff);
        mat.emissiveIntensity = 1.0 + this.trunkBassEnergy * 0.35;
        mat.roughness = 0.18;
        mat.metalness = 0.1;
      } else {
        mat.color.setHex(0x94a3b8);
        mat.emissive.setHex(0xffffff);
        mat.emissiveIntensity = 0.22;
        mat.roughness = 0.07;
        mat.metalness = 0.88;
      }
    }
    const ledMat = group.userData.standbyLedMat as THREE.MeshStandardMaterial | undefined;
    if (ledMat) {
      if (this.power) {
        ledMat.color.setHex(this.isPaused ? 0xf59e0b : 0x22c55e);
        ledMat.emissive.setHex(this.isPaused ? 0xf59e0b : 0x22c55e);
        ledMat.emissiveIntensity = 1.45 + this.trunkBassEnergy * 0.9;
      } else {
        const pulse = 0.9 + Math.sin(this.animClock * 2.4) * 0.45;
        ledMat.color.setHex(0xef4444);
        ledMat.emissive.setHex(0xef4444);
        ledMat.emissiveIntensity = pulse;
      }
    }

    // Physical Car Trunk Subwoofer shake on placed 3D Smart TVs
    if (typeof group.userData.__tvBaseY !== 'number') {
      group.userData.__tvBaseY = group.position.y;
      group.userData.__tvBaseRotX = group.rotation.x;
      group.userData.__tvBaseRotZ = group.rotation.z;
    }
    const baseY = group.userData.__tvBaseY as number;
    const baseRotX = group.userData.__tvBaseRotX as number;
    const baseRotZ = group.userData.__tvBaseRotZ as number;
    const offsets = computeTrunkVisualOffsets(
      this.trunkBassEnergy,
      this.animClock,
      this.bassMode,
    );
    group.position.y = baseY + offsets.offsetY;
    group.rotation.x = baseRotX + offsets.tiltXRad;
    group.rotation.z = baseRotZ + offsets.tiltZRad;
  }

  public setWorldPosition(worldPos: THREE.Vector3): void {
    this.tvWorldPos.copy(worldPos);
    if (this.tvGlowLight) {
      this.tvGlowLight.position.set(
        this.tvWorldPos.x,
        this.tvWorldPos.y,
        this.tvWorldPos.z + 0.45,
      );
    }
  }

  public attachToMesh(
    mesh: THREE.Mesh,
    material: THREE.MeshStandardMaterial,
    worldPos?: THREE.Vector3,
  ): void {
    this.screenMesh = mesh;
    this.screenMat = material;
    if (!mesh.userData.__tvBasePos) {
      mesh.userData.__tvBasePos = mesh.position.clone();
      mesh.userData.__tvBaseRot = mesh.rotation.clone();
      mesh.userData.__tvBaseScale = mesh.scale.clone();
    }
    this.standbyLedMat =
      (mesh.userData.standbyLedMat as THREE.MeshStandardMaterial | undefined) || null;
    if (worldPos) {
      this.tvWorldPos.copy(worldPos);
    } else {
      mesh.updateWorldMatrix(true, false);
      mesh.getWorldPosition(this.tvWorldPos);
    }

    if (this.tvGlowLight) {
      this.tvGlowLight.position.set(
        this.tvWorldPos.x,
        this.tvWorldPos.y,
        this.tvWorldPos.z + 0.45,
      );
    }

    this.applyMaterialTexture();
  }

  private applyMaterialTexture(): void {
    if (!this.screenMat) return;
    // Always bind CanvasTexture to both map and emissiveMap so WebGL works identically on iOS Safari & desktop
    this.screenMat.map = this.canvasTexture;
    this.screenMat.emissiveMap = this.canvasTexture;
    if (this.power) {
      this.screenMat.color.setHex(0xffffff);
      this.screenMat.emissive.setHex(0xffffff);
      this.screenMat.emissiveIntensity = 1.0;
      this.screenMat.roughness = 0.2;
      this.screenMat.metalness = 0.1;
    } else {
      // Keep canvasTexture bound so realistic dark glass sheen + red standby LED render crisply
      this.screenMat.color.setHex(0x94a3b8);
      this.screenMat.emissive.setHex(0xffffff);
      this.screenMat.emissiveIntensity = 0.24;
      this.screenMat.roughness = 0.07;
      this.screenMat.metalness = 0.88;
    }
    this.screenMat.needsUpdate = true;

    if (this.standbyLedMat) {
      if (this.power) {
        this.standbyLedMat.color.setHex(this.isPaused ? 0xf59e0b : 0x22c55e);
        this.standbyLedMat.emissive.setHex(this.isPaused ? 0xf59e0b : 0x22c55e);
        this.standbyLedMat.emissiveIntensity = 1.5;
      } else {
        this.standbyLedMat.color.setHex(0xef4444);
        this.standbyLedMat.emissive.setHex(0xef4444);
        this.standbyLedMat.emissiveIntensity = 1.25;
      }
    }
  }

  public setAutoCycle(enabled: boolean): void {
    this.autoCycleChannels = enabled;
    this.segmentTimer = 0;
  }

  public togglePower(): boolean {
    this.initAudioContext();
    this.power = !this.power;
    this.isPoweringTransition = true;
    this.staticFrameDirty = true;
    if (this.power) {
      this.isPaused = false;
      this.isStopped = false;
      this.turnOnProgress = 0.0;
      this.turnOffProgress = 0.0;
      if (this.localVideoElement && this.isUsingLocalVideo) {
        this.localVideoElement.play().catch(() => {});
      }
    } else {
      this.turnOffProgress = 0.0;
      // Turning off the TV explicitly stops active video/YouTube playback
      this.cleanupLocalVideoElement();
      this.isUsingLocalVideo = false;
      this.localVideoName = '';
      this.isUsingYouTube = false;
      this.youtubeVideoId = '';
      this.youtubeTitle = 'YouTube';
      this.youtubeChannel = 'YouTube';
      this.currentTimestamp = 0;
      this.isPaused = false;
      this.isStopped = false;
    }
    this.updateSpatialAudioGain(this.lastSpatialMult);
    this.applyMaterialTexture();
    return this.power;
  }

  public stopPlayback(): void {
    this.initAudioContext();
    this.cleanupLocalVideoElement();
    this.isUsingLocalVideo = false;
    this.localVideoName = '';
    this.isUsingYouTube = false;
    this.youtubeVideoId = '';
    this.youtubeTitle = 'YouTube';
    this.youtubeChannel = 'YouTube';
    this.currentTimestamp = 0;
    this.isPaused = true;
    this.isStopped = true;
    this.staticFrameDirty = true;
    this.updateSpatialAudioGain(0);
    this.applyMaterialTexture();
  }

  public setPaused(paused: boolean): void {
    this.initAudioContext();
    this.staticFrameDirty = true;
    if (paused) {
      if (!this.power) return;
      this.isPaused = true;
      if (this.localVideoElement) {
        this.localVideoElement.pause();
      }
      this.updateSpatialAudioGain(0);
    } else {
      if (!this.power) {
        this.power = true;
        this.isPoweringTransition = true;
        this.turnOnProgress = 0.25;
      }
      this.isPaused = false;
      this.isStopped = false;
      if (this.localVideoElement && this.isUsingLocalVideo) {
        this.localVideoElement.play().catch(() => {});
      }
      this.updateSpatialAudioGain(this.lastSpatialMult);
    }
    this.applyMaterialTexture();
  }

  public togglePlayPause(): boolean {
    if (!this.power) {
      this.setPaused(false);
      return true;
    }
    this.setPaused(!this.isPaused);
    return !this.isPaused;
  }

  public setChannel(ch: TvChannelId): void {
    this.initAudioContext();
    const wasOff = !this.power;
    this.currentChannel = normalizeChannelId(ch);
    this.power = true;
    this.isPaused = false;
    this.isStopped = false;
    this.segmentTimer = 0;
    this.staticFrameDirty = true;
    if (wasOff) {
      this.isPoweringTransition = true;
      this.turnOnProgress = 0.25;
    }
    if (this.isUsingLocalVideo || this.localVideoElement) {
      this.cleanupLocalVideoElement();
      this.isUsingLocalVideo = false;
      this.localVideoName = '';
    }
    this.isUsingYouTube = false;
    this.youtubeVideoId = '';
    this.updateSpatialAudioGain(this.lastSpatialMult);
    this.applyMaterialTexture();
  }

  public setYouTubeStream(
    videoId: string,
    title = 'YouTube',
    channel = 'YouTube',
  ): void {
    this.initAudioContext();
    this.cleanupLocalVideoElement();
    this.isUsingLocalVideo = false;
    this.localVideoName = '';
    const isSameVideo = this.isUsingYouTube && this.youtubeVideoId === videoId;
    this.isUsingYouTube = true;
    this.youtubeVideoId = videoId;
    this.youtubeTitle = title;
    this.youtubeChannel = channel;
    this.staticFrameDirty = true;
    if (!isSameVideo) {
      this.currentTimestamp = 0;
    }

    const wasOff = !this.power;
    this.power = true;
    this.isPaused = false;
    this.isStopped = false;
    if (wasOff) {
      this.isPoweringTransition = true;
      this.turnOnProgress = 0.25;
    }
    this.updateSpatialAudioGain(
      this.directListenOverride ? 1.0 : this.lastSpatialMult,
    );
    this.applyMaterialTexture();
  }

  public setDirectListenOverride(direct: boolean): void {
    if (this.directListenOverride === direct) return;
    this.directListenOverride = direct;
    this.updateSpatialAudioGain(direct ? 1.0 : this.lastSpatialMult);
  }

  public getSpatialMultiplier(): number {
    return this.lastSpatialMult;
  }

  public nextChannel(): TvChannelMeta {
    const next = ((this.currentChannel % TV_CHANNELS.length) + 1) as TvChannelId;
    this.setChannel(next);
    return this.getCurrentChannelMeta();
  }

  public prevChannel(): TvChannelMeta {
    const prev = (
      this.currentChannel === 1 ? TV_CHANNELS.length : this.currentChannel - 1
    ) as TvChannelId;
    this.setChannel(prev);
    return this.getCurrentChannelMeta();
  }

  public setVolume(vol: number): void {
    this.initAudioContext();
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.volume > 0) this.isMuted = false;
    this.updateSpatialAudioGain(this.lastSpatialMult);
  }

  public toggleMute(): boolean {
    this.initAudioContext();
    this.isMuted = !this.isMuted;
    this.updateSpatialAudioGain(this.lastSpatialMult);
    return this.isMuted;
  }

  public setBassMode(mode: TvBassMode): TvBassMode {
    this.initAudioContext();
    this.bassMode = normalizeTvBassMode(mode);
    if (this.bassMode === 'off') {
      this.trunkBassEnergy = 0;
      this.trunkTransientPulse = 0;
    }
    this.applyTrunkDspEq();
    this.staticFrameDirty = true;
    return this.bassMode;
  }

  public getBassMode(): TvBassMode {
    return this.bassMode;
  }

  public getTrunkBassEnergy(): number {
    return this.trunkBassEnergy;
  }

  private cleanupLocalVideoElement(): void {
    if (this.localVideoElement) {
      try {
        this.localVideoElement.pause();
        this.localVideoElement.removeAttribute('src');
        this.localVideoElement.load();
        this.localVideoElement.remove();
      } catch {
        // Ignore cleanup errors
      }
      this.localVideoElement = null;
    }
    if (this.localVideoObjectUrl) {
      try {
        URL.revokeObjectURL(this.localVideoObjectUrl);
      } catch {
        // Ignore
      }
      this.localVideoObjectUrl = null;
    }
  }

  public loadLocalVideoFile(file: File): void {
    this.initAudioContext();
    this.cleanupLocalVideoElement();

    if (file.size > 512 * 1024 * 1024) {
      this.onLocalVideoErrorCallback?.(
        'Video file is very large (>512 MB); if playback stutters, try a shorter MP4/WebM clip.',
      );
    }

    const objectUrl = URL.createObjectURL(file);
    this.localVideoObjectUrl = objectUrl;

    const video = document.createElement('video');
    video.src = objectUrl;
    video.loop = true;
    video.muted = this.isMuted;
    video.volume = Math.max(0, Math.min(1, this.volume * this.lastSpatialMult));
    video.playsInline = true;
    video.preload = 'metadata';
    video.setAttribute('playsinline', 'true');
    video.setAttribute('webkit-playsinline', 'true');
    video.autoplay = true;

    this.localVideoName = file.name.replace(/\.[^/.]+$/, '') || 'Custom Video';
    this.isUsingYouTube = false;
    this.youtubeVideoId = '';
    this.isUsingLocalVideo = true;
    this.power = true;
    this.isPaused = false;
    this.isStopped = false;
    this.staticFrameDirty = true;
    this.applyMaterialTexture();

    video.addEventListener('error', () => {
      if (this.localVideoElement !== video) return;
      const errCode = video.error?.code;
      const msg =
        errCode === 4
          ? 'Unsupported video format. Please pick an H.264 MP4 or WebM file.'
          : 'Could not decode video file on this device.';
      this.cleanupLocalVideoElement();
      this.isUsingLocalVideo = false;
      this.localVideoName = '';
      this.isStopped = true;
      this.isPaused = true;
      this.staticFrameDirty = true;
      this.applyMaterialTexture();
      this.onLocalVideoErrorCallback?.(msg);
    });

    video.addEventListener('canplay', () => {
      if (this.localVideoElement === video && !this.isPaused && this.power) {
        this.attachLocalVideoToTrunkDsp(video);
        video.play().catch(() => {});
      }
    });
    video.load();
    this.attachLocalVideoToTrunkDsp(video);
    video.play().catch(() => {});

    this.localVideoElement = video;
  }

  private buildTrunkSaturationCurve(): Float32Array<ArrayBuffer> {
    const samples = 256;
    const buffer = new ArrayBuffer(samples * 4);
    const curve = new Float32Array(buffer);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // Soft car-amp warm saturation curve
      curve[i] = Math.tanh(x * 1.65);
    }
    return curve;
  }

  private applyTrunkDspEq(): void {
    if (!this.audioCtx || this.audioCtx.state === 'closed') return;
    const meta = getTvBassModeMeta(this.bassMode);
    const now = this.audioCtx.currentTime;
    try {
      this.trunkLowShelf?.gain.setTargetAtTime(meta.lowShelfDb, now, 0.04);
      this.trunkSubPeak?.gain.setTargetAtTime(meta.subPeakDb, now, 0.04);
    } catch {
      // Ignore AudioParam scheduling edge cases
    }
  }

  private attachLocalVideoToTrunkDsp(video: HTMLVideoElement): void {
    if (
      !this.audioCtx ||
      !this.localVideoSourceGain ||
      this.audioCtx.state === 'closed' ||
      this.connectedVideoElements.has(video)
    ) {
      return;
    }
    try {
      const src = this.audioCtx.createMediaElementSource(video);
      src.connect(this.localVideoSourceGain);
      this.connectedVideoElements.set(video, src);
    } catch {
      // Some browsers restrict MediaElementSource on already-bound or codec-limited elements;
      // fallback keeps standard HTML5 <video> audio playing cleanly.
    }
  }

  private initAudioContext(): void {
    if (typeof window === 'undefined') return;
    try {
      if (!this.audioCtx || this.audioCtx.state === 'closed') {
        const AudioCtxClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        if (AudioCtxClass) {
          this.audioCtx = new AudioCtxClass();
          this.masterGain = this.audioCtx.createGain();
          this.localVideoSourceGain = this.audioCtx.createGain();
          this.localVideoSourceGain.gain.value = 1.0;

          // Car Trunk Subwoofer Acoustic DSP Chain:
          // Low-shelf chest boost (88Hz) -> Tuned trunk cavity sub-peak (48Hz) ->
          // Warm amp saturation -> Tight compressor -> Sub-bass FFT Analyser -> Destination
          this.trunkLowShelf = this.audioCtx.createBiquadFilter();
          this.trunkLowShelf.type = 'lowshelf';
          this.trunkLowShelf.frequency.value = 88;

          this.trunkSubPeak = this.audioCtx.createBiquadFilter();
          this.trunkSubPeak.type = 'peaking';
          this.trunkSubPeak.frequency.value = 48;
          this.trunkSubPeak.Q.value = 1.35;

          this.trunkWarmthShaper = this.audioCtx.createWaveShaper();
          this.trunkWarmthShaper.curve = this.buildTrunkSaturationCurve();
          this.trunkWarmthShaper.oversample = '2x';

          this.trunkCompressor = this.audioCtx.createDynamicsCompressor();
          this.trunkCompressor.threshold.value = -16;
          this.trunkCompressor.knee.value = 18;
          this.trunkCompressor.ratio.value = 6;
          this.trunkCompressor.attack.value = 0.004;
          this.trunkCompressor.release.value = 0.18;

          this.trunkAnalyser = this.audioCtx.createAnalyser();
          this.trunkAnalyser.fftSize = 128;
          this.trunkAnalyser.smoothingTimeConstant = 0.72;
          this.trunkFreqBins = new Uint8Array(
            new ArrayBuffer(this.trunkAnalyser.frequencyBinCount),
          );

          this.masterGain.connect(this.trunkLowShelf);
          this.localVideoSourceGain.connect(this.trunkLowShelf);
          this.trunkLowShelf.connect(this.trunkSubPeak);
          this.trunkSubPeak.connect(this.trunkWarmthShaper);
          this.trunkWarmthShaper.connect(this.trunkCompressor);
          this.trunkCompressor.connect(this.trunkAnalyser);
          this.trunkAnalyser.connect(this.audioCtx.destination);

          this.applyTrunkDspEq();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
    } catch {
      // AudioContext blocked or unavailable; TV remains visual-safe
    }
  }

  private playTone(
    freq: number,
    type: OscillatorType,
    dur: number,
    gainVal: number,
  ): void {
    if (
      !this.audioCtx ||
      !this.masterGain ||
      this.audioCtx.state !== 'running' ||
      !this.power ||
      this.isMuted ||
      this.isPaused ||
      this.activeAudioNodes >= 8
    ) {
      return;
    }
    try {
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(Math.max(0.001, gainVal * this.volume), now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + dur);

      osc.connect(gain);
      gain.connect(this.masterGain);
      this.activeAudioNodes += 1;
      osc.onended = () => {
        this.activeAudioNodes = Math.max(0, this.activeAudioNodes - 1);
        try {
          osc.disconnect();
          gain.disconnect();
        } catch {
          // Ignore already disconnected nodes
        }
      };
      osc.start(now);
      osc.stop(now + dur + 0.01);
    } catch {
      // Ignore audio scheduling edge cases
    }
  }

  private playStaticBurst(dur: number, gainVal: number): void {
    if (
      !this.audioCtx ||
      !this.masterGain ||
      this.audioCtx.state !== 'running' ||
      !this.power ||
      this.isMuted ||
      this.isPaused ||
      this.activeAudioNodes >= 8
    ) {
      return;
    }
    try {
      const sampleCount = Math.max(256, Math.floor(this.audioCtx.sampleRate * dur));
      const buffer = this.audioCtx.createBuffer(1, sampleCount, this.audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < sampleCount; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.35;
      }
      const src = this.audioCtx.createBufferSource();
      src.buffer = buffer;

      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1200;
      filter.Q.value = 0.8;

      const gain = this.audioCtx.createGain();
      gain.gain.value = gainVal * this.volume;

      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      this.activeAudioNodes += 1;
      src.onended = () => {
        this.activeAudioNodes = Math.max(0, this.activeAudioNodes - 1);
        try {
          src.disconnect();
          filter.disconnect();
          gain.disconnect();
        } catch {
          // Ignore already disconnected nodes
        }
      };
      src.start();
    } catch {
      // Ignore audio edge cases
    }
  }

  public updateSpatialAudio(
    playerX: number,
    playerY: number,
    playerZ: number,
  ): void {
    const dist = Math.hypot(
      playerX - this.tvWorldPos.x,
      playerY + 1.2 - this.tvWorldPos.y,
      playerZ - this.tvWorldPos.z,
    );

    // Within 4.5m = 100% volume; smooth roll off to 0% at 30m
    let spatialMult = 1.0;
    if (dist > 4.5) {
      spatialMult = Math.max(0, 1.0 - (dist - 4.5) / 25.5);
    }
    this.lastSpatialMult = spatialMult;
    const effectiveMult = this.directListenOverride ? 1.0 : spatialMult;
    this.updateSpatialAudioGain(effectiveMult);

    if (this.localVideoElement) {
      const effectiveVol =
        !this.power || this.isMuted || this.isPaused ? 0 : this.volume * effectiveMult;
      this.localVideoElement.volume = Math.max(0, Math.min(1, effectiveVol));
    }
  }

  private updateSpatialAudioGain(spatialMult: number): void {
    const effectiveMult = this.directListenOverride ? 1.0 : spatialMult;
    if (this.localVideoElement) {
      this.localVideoElement.muted = this.isMuted;
      const effectiveVol =
        !this.power || this.isMuted || this.isPaused ? 0 : this.volume * effectiveMult;
      this.localVideoElement.volume = Math.max(0, Math.min(1, effectiveVol));
    }
    if (!this.masterGain || !this.audioCtx || this.audioCtx.state === 'closed') return;
    try {
      const channelHeadroom = this.isUsingYouTube ? 0.42 : 0.26;
      const finalGain =
        !this.power || this.isMuted || this.isPaused || this.isStopped
          ? 0
          : this.volume * effectiveMult * channelHeadroom;
      this.masterGain.gain.setTargetAtTime(finalGain, this.audioCtx.currentTime, 0.05);
    } catch {
      // Ignore AudioContext timing errors
    }
  }

  public drawPreviewToCanvas(targetCanvas: HTMLCanvasElement): void {
    try {
      const tCtx = targetCanvas.getContext('2d');
      if (!tCtx) return;
      tCtx.drawImage(this.canvas, 0, 0, targetCanvas.width, targetCanvas.height);
    } catch {
      // Ignore transient canvas blit issues
    }
  }

  public update(
    dt: number,
    telemetry: SmartTvTelemetry,
    options?: {
      skipTextureUpload?: boolean;
      youtubeCoversScreen?: boolean;
      playerDist?: number;
    },
  ): void {
    if (!this.power || !this.isPaused) {
      this.animClock += dt;
    }
    if (this.power && !this.isPaused) {
      this.currentTimestamp += dt;
      this.newsTickerOffset += dt * 88;
      if (this.autoCycleChannels && !this.isUsingLocalVideo && !this.isUsingYouTube) {
        this.segmentTimer += dt;
        if (this.segmentTimer >= 45) {
          this.segmentTimer = 0;
          const next = this.nextChannel();
          this.onAutoAdvanceCallback?.(next);
        }
      }
    }

    // Update live Car Trunk Subwoofer energy, sub-bass companion synth & physical 3D TV excursion
    this.updateTrunkSubBassState(dt);
    this.applyScreenMeshTrunkBump();

    if (!this.ctx) return;

    const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const skipUpload = Boolean(options?.skipTextureUpload);
    const farAway =
      typeof options?.playerDist === 'number' && options.playerDist > 34;

    if (!this.power) {
      if (this.isPoweringTransition) {
        this.turnOffProgress += dt * 3.5;
        if (this.turnOffProgress >= 1.0) {
          this.isPoweringTransition = false;
          this.renderLogicalFrame(() => this.drawOffScreen());
          this.canvasTexture.needsUpdate = true;
          this.staticFrameDirty = false;
          if (this.tvGlowLight) this.tvGlowLight.intensity = 0;
          return;
        }
        if (nowMs - this.lastDrawPerfMs >= this.drawIntervalMs) {
          this.lastDrawPerfMs = nowMs;
          this.renderLogicalFrame(() => this.drawPowerOffAnimation(this.turnOffProgress));
          this.canvasTexture.needsUpdate = true;
        }
      } else {
        if (this.staticFrameDirty && !skipUpload) {
          this.staticFrameDirty = false;
          this.renderLogicalFrame(() => this.drawOffScreen());
          this.canvasTexture.needsUpdate = true;
        }
        if (this.standbyLedMat) {
          this.standbyLedMat.emissiveIntensity =
            0.85 + Math.sin(this.animClock * 2.2) * 0.4;
        }
        if (this.tvGlowLight) this.tvGlowLight.intensity = 0;
      }
      return;
    }

    if (this.isPoweringTransition) {
      this.turnOnProgress += dt * 2.8;
      if (this.turnOnProgress >= 1.0) {
        this.turnOnProgress = 1.0;
        this.isPoweringTransition = false;
      }
    }

    const trunkGlowBoost = computeTrunkVisualOffsets(
      this.trunkBassEnergy,
      this.animClock,
      this.bassMode,
    ).glowBoost;

    if (this.isUsingYouTube) {
      if (this.tvGlowLight) {
        this.tvGlowLight.intensity = 1.35 + trunkGlowBoost;
        this.tvGlowLight.color.setHex(
          this.trunkBassEnergy > 0.55 ? 0xff3b30 : 0xef4444,
        );
      }
      // When the live YouTube iframe covers the screen (Inline, PiP, or 3D Wall) or player is far away,
      // draw the fallback card once and skip continuous 3D texture uploads to protect GPU memory.
      if (options?.youtubeCoversScreen || farAway || skipUpload) {
        if (this.staticFrameDirty && !skipUpload) {
          this.staticFrameDirty = false;
          this.renderLogicalFrame((ctx, w, h) => {
            this.drawYouTubeBroadcast(ctx, w, h);
            this.drawSmartTvOsOverlay(ctx, w, h, telemetry);
          });
          this.canvasTexture.needsUpdate = true;
        }
        return;
      }
      if (!this.staticFrameDirty && nowMs - this.lastDrawPerfMs < this.drawIntervalMs) {
        return;
      }
      this.lastDrawPerfMs = nowMs;
      this.staticFrameDirty = false;
      this.renderLogicalFrame((ctx, w, h) => {
        this.drawYouTubeBroadcast(ctx, w, h);
        this.drawSmartTvOsOverlay(ctx, w, h, telemetry);
        if (this.turnOnProgress < 1.0) {
          this.drawPowerOnAnimation(this.turnOnProgress);
        }
      });
      this.canvasTexture.needsUpdate = true;
      return;
    }

    if (this.isStopped) {
      if (this.tvGlowLight) {
        this.tvGlowLight.intensity = 0.55;
        this.tvGlowLight.color.setHex(0x64748b);
      }
      if (this.staticFrameDirty && !skipUpload) {
        this.staticFrameDirty = false;
        this.renderLogicalFrame((ctx, w, h) => {
          this.drawStoppedScreen(ctx, w, h);
          this.drawSmartTvOsOverlay(ctx, w, h, telemetry);
        });
        this.canvasTexture.needsUpdate = true;
      }
      return;
    }

    if (this.isUsingLocalVideo && this.localVideoElement) {
      if (this.tvGlowLight) {
        this.tvGlowLight.intensity = 1.45 + trunkGlowBoost;
        this.tvGlowLight.color.setHex(0x38bdf8);
      }
      if (skipUpload || farAway) return;
      if (this.isPaused && !this.staticFrameDirty) return;
      if (!this.staticFrameDirty && nowMs - this.lastDrawPerfMs < this.drawIntervalMs) {
        return;
      }
      this.lastDrawPerfMs = nowMs;
      this.staticFrameDirty = false;

      const vid = this.localVideoElement;
      if (vid.readyState >= vid.HAVE_CURRENT_DATA && vid.videoWidth > 0 && vid.videoHeight > 0) {
        try {
          this.ctx.setTransform(1, 0, 0, 1, 0, 0);
          this.ctx.drawImage(vid, 0, 0, this.canvas.width, this.canvas.height);
          this.renderLogicalFrame((ctx, w, h) => {
            this.drawSmartTvOsOverlay(ctx, w, h, telemetry);
            if (this.turnOnProgress < 1.0) {
              this.drawPowerOnAnimation(this.turnOnProgress);
            }
          });
          this.canvasTexture.needsUpdate = true;
        } catch {
          // Guard corrupted/hardware-evicted video frame draws so game loop never crashes
          this.cleanupLocalVideoElement();
          this.isUsingLocalVideo = false;
          this.localVideoName = '';
          this.isStopped = true;
          this.isPaused = true;
          this.staticFrameDirty = true;
          this.onLocalVideoErrorCallback?.(
            'Local video playback was interrupted; returned TV to standby safely.',
          );
        }
      } else {
        this.renderLogicalFrame((ctx, w, h) => {
          ctx.fillStyle = '#020617';
          ctx.fillRect(0, 0, w, h);
          ctx.fillStyle = '#e2e8f0';
          ctx.font = 'bold 28px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`LOADING VIDEO: ${this.localVideoName.toUpperCase()}...`, w / 2, h / 2);
          ctx.textAlign = 'left';
          this.drawSmartTvOsOverlay(ctx, w, h, telemetry);
        });
        this.canvasTexture.needsUpdate = true;
      }
      return;
    }

    // Native animated procedural channels (1–5)
    switch (this.currentChannel) {
      case 1:
        if (this.tvGlowLight) {
          this.tvGlowLight.intensity = 1.5 + trunkGlowBoost;
          this.tvGlowLight.color.setHex(0xa855f7);
        }
        break;
      case 2:
        if (this.tvGlowLight) {
          this.tvGlowLight.intensity = 1.45 + trunkGlowBoost;
          this.tvGlowLight.color.setHex(0xef4444);
        }
        break;
      case 3:
        if (this.tvGlowLight) {
          this.tvGlowLight.intensity = 1.45 + trunkGlowBoost;
          this.tvGlowLight.color.setHex(0x10b981);
        }
        break;
      case 4:
        if (this.tvGlowLight) {
          this.tvGlowLight.intensity = 1.55 + trunkGlowBoost;
          this.tvGlowLight.color.setHex(0x06b6d4);
        }
        break;
      case 5:
        if (this.tvGlowLight) {
          this.tvGlowLight.intensity = 0.85 + trunkGlowBoost * 0.4;
          this.tvGlowLight.color.setHex(0x94a3b8);
        }
        break;
    }

    this.updateProceduralAudio();

    if (skipUpload || farAway) return;
    if (this.isPaused && !this.staticFrameDirty && !this.isPoweringTransition) return;
    if (!this.staticFrameDirty && nowMs - this.lastDrawPerfMs < this.drawIntervalMs) {
      return;
    }
    this.lastDrawPerfMs = nowMs;
    this.staticFrameDirty = false;

    this.renderLogicalFrame((ctx, w, h) => {
      ctx.fillStyle = '#050508';
      ctx.fillRect(0, 0, w, h);

      switch (this.currentChannel) {
        case 1:
          this.drawLoFiChillRadio(ctx, w, h);
          break;
        case 2:
          this.drawSurvivalNewsChannel(ctx, w, h, telemetry);
          break;
        case 3:
          this.drawNatureWildlifeCam(ctx, w, h, telemetry);
          break;
        case 4:
          this.drawRetroArcadeGaming(ctx, w, h);
          break;
        case 5:
          this.drawStaticStandbyChannel(ctx, w, h);
          break;
      }

      this.drawSmartTvOsOverlay(ctx, w, h, telemetry);

      if (this.turnOnProgress < 1.0) {
        this.drawPowerOnAnimation(this.turnOnProgress);
      }
    });

    this.canvasTexture.needsUpdate = true;
  }

  private renderLogicalFrame(
    drawFn: (ctx: CanvasRenderingContext2D, logicalW: number, logicalH: number) => void,
  ): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const scaleX = this.canvas.width / 1280;
    const scaleY = this.canvas.height / 720;
    ctx.save();
    ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
    try {
      drawFn(ctx, 1280, 720);
    } finally {
      ctx.restore();
    }
  }

  private drawPowerOnAnimation(p: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const w = 1280;
    const h = 720;
    ctx.save();
    if (p < 0.4) {
      const lineH = Math.max(4, h * 0.04);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
      ctx.fillRect(0, 0, w, h / 2 - lineH / 2);
      ctx.fillRect(0, h / 2 + lineH / 2, w, h / 2 - lineH / 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, h / 2 - lineH / 2, w, lineH);
    } else {
      const vertExpand = (p - 0.4) / 0.6;
      const maskH = (h / 2) * (1 - vertExpand);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
      ctx.fillRect(0, 0, w, maskH);
      ctx.fillRect(0, h - maskH, w, maskH);
    }
    ctx.restore();
  }

  private drawPowerOffAnimation(p: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const w = 1280;
    const h = 720;
    ctx.save();
    const maskH = (h / 2) * Math.min(1, p * 1.5);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, maskH);
    ctx.fillRect(0, h - maskH, w, maskH);
    if (p > 0.6) {
      const flash = 1 - (p - 0.6) / 0.4;
      ctx.fillStyle = `rgba(255, 255, 255, ${flash})`;
      ctx.fillRect(w / 2 - 20, h / 2 - 2, 40, 4);
    }
    ctx.restore();
  }

  private drawOffScreen(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const w = 1280;
    const h = 720;

    const baseGrad = ctx.createLinearGradient(0, 0, w, h);
    baseGrad.addColorStop(0, '#070a10');
    baseGrad.addColorStop(0.5, '#030407');
    baseGrad.addColorStop(1, '#090d14');
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    const streak1 = ctx.createLinearGradient(w * 0.1, 0, w * 0.55, h);
    streak1.addColorStop(0, 'rgba(148, 163, 184, 0.09)');
    streak1.addColorStop(0.5, 'rgba(226, 232, 240, 0.03)');
    streak1.addColorStop(1, 'rgba(148, 163, 184, 0)');
    ctx.fillStyle = streak1;
    ctx.beginPath();
    ctx.moveTo(w * 0.08, 0);
    ctx.lineTo(w * 0.36, 0);
    ctx.lineTo(w * 0.62, h);
    ctx.lineTo(w * 0.32, h);
    ctx.closePath();
    ctx.fill();

    const streak2 = ctx.createLinearGradient(w * 0.45, 0, w * 0.85, h);
    streak2.addColorStop(0, 'rgba(186, 230, 253, 0.05)');
    streak2.addColorStop(1, 'rgba(186, 230, 253, 0)');
    ctx.fillStyle = streak2;
    ctx.beginPath();
    ctx.moveTo(w * 0.56, 0);
    ctx.lineTo(w * 0.66, 0);
    ctx.lineTo(w * 0.88, h);
    ctx.lineTo(w * 0.78, h);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, w - 6, h - 6);

    const pulse = 0.68 + Math.sin(this.animClock * 2.2) * 0.25;
    const ledX = w - 34;
    const ledY = h - 24;
    const ledGlow = ctx.createRadialGradient(ledX, ledY, 2, ledX, ledY, 22);
    ledGlow.addColorStop(0, `rgba(239, 68, 68, ${pulse * 0.85})`);
    ledGlow.addColorStop(1, 'rgba(239, 68, 68, 0)');
    ctx.fillStyle = ledGlow;
    ctx.beginPath();
    ctx.arc(ledX, ledY, 22, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(248, 113, 113, ${Math.min(1, pulse + 0.2)})`;
    ctx.beginPath();
    ctx.arc(ledX, ledY, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // CHANNEL 1: LO-FI CHILL RADIO (ANIMATED RETRO SUNSET / STUDIO VISUALIZER)
  private drawLoFiChillRadio(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const t = this.animClock;
    const sky = ctx.createLinearGradient(0, 0, 0, h * 0.68);
    sky.addColorStop(0, '#1e1b4b');
    sky.addColorStop(0.45, '#581c87');
    sky.addColorStop(0.82, '#be185d');
    sky.addColorStop(1, '#f97316');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Twinkling night stars above sunset
    for (let i = 0; i < 42; i++) {
      const sx = ((i * 197 + 41) % w);
      const sy = 50 + ((i * 89) % (h * 0.34));
      const alpha = 0.35 + 0.55 * Math.abs(Math.sin(t * 1.4 + i));
      ctx.fillStyle = `rgba(248, 250, 252, ${alpha.toFixed(2)})`;
      ctx.fillRect(sx, sy, 3, 3);
    }

    // Striped Synthwave Sun
    const sunX = w / 2;
    const sunY = h * 0.44 + Math.sin(t * 0.6) * 6;
    const sunR = 112;
    const sunGrad = ctx.createLinearGradient(sunX, sunY - sunR, sunX, sunY + sunR);
    sunGrad.addColorStop(0, '#fde047');
    sunGrad.addColorStop(0.55, '#fb923c');
    sunGrad.addColorStop(1, '#ec4899');
    ctx.save();
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
    ctx.fill();
    // Horizon slice cutouts
    ctx.fillStyle = '#3b0764';
    for (let k = 0; k < 5; k++) {
      const bandY = sunY + 12 + k * 20;
      const bandH = 3 + k * 2.1;
      ctx.fillRect(sunX - sunR - 4, bandY, sunR * 2 + 8, bandH);
    }
    ctx.restore();

    // Distant volcanic island silhouette (scaled to 1280x720)
    ctx.fillStyle = '#0f0728';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.62);
    ctx.lineTo(w * 0.14, h * 0.53);
    ctx.lineTo(w * 0.28, h * 0.61);
    ctx.lineTo(w * 0.42, h * 0.56);
    ctx.lineTo(w * 0.61, h * 0.59);
    ctx.lineTo(w * 0.78, h * 0.51);
    ctx.lineTo(w, h * 0.62);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    // Scrolling Synthwave Grid Floor
    const horizonY = h * 0.62;
    const groundGrad = ctx.createLinearGradient(0, horizonY, 0, h);
    groundGrad.addColorStop(0, '#1e1b4b');
    groundGrad.addColorStop(1, '#020617');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, horizonY, w, h - horizonY);

    ctx.strokeStyle = 'rgba(232, 121, 249, 0.55)';
    ctx.lineWidth = 2;
    for (let i = -12; i <= 12; i++) {
      ctx.beginPath();
      ctx.moveTo(w / 2 + i * 24, horizonY);
      ctx.lineTo(w / 2 + i * 115, h);
      ctx.stroke();
    }
    const scroll = (t * 0.65) % 1;
    for (let j = 0; j < 7; j++) {
      const p = ((j + scroll) / 7);
      const y = horizonY + Math.pow(p, 1.8) * (h - horizonY);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Center Floating Lo-Fi Vinyl & Studio Deck
    const deckX = w / 2;
    const deckY = h * 0.45;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(deckX - 185, deckY - 72, 370, 144, 18);
    ctx.fill();
    ctx.stroke();

    // Spinning vinyl platter
    const vx = deckX - 105;
    const vy = deckY;
    ctx.fillStyle = '#09090b';
    ctx.beginPath();
    ctx.arc(vx, vy, 50, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(vx, vy, 36, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.arc(vx, vy, 16, 0, Math.PI * 2);
    ctx.fill();
    // Spinning strobe dot
    const spin = t * 2.6;
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(vx + Math.cos(spin) * 28, vy + Math.sin(spin) * 28, 4, 0, Math.PI * 2);
    ctx.fill();

    // Track Meta inside Deck
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 21px sans-serif';
    ctx.fillText('LO-FI CHILL RADIO', deckX - 38, deckY - 20);
    ctx.fillStyle = '#f0abfc';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('NOW SPINNING: SUNSET COVE', deckX - 38, deckY + 8);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px monospace';
    ctx.fillText('WARM SYNTH · 24/7 LOOP', deckX - 38, deckY + 34);

    // 28-Bar Spectrum Equalizer across bottom
    const barCount = 28;
    const barW = (w - 120) / barCount - 6;
    for (let i = 0; i < barCount; i++) {
      const wave =
        Math.sin(t * 4.5 + i * 0.45) * 0.4 +
        Math.cos(t * 2.8 - i * 0.25) * 0.25 +
        0.5;
      const barH = 18 + Math.max(0.08, wave) * 112;
      const bx = 60 + i * (barW + 6);
      const by = h - 34 - barH;
      const barGrad = ctx.createLinearGradient(0, by, 0, by + barH);
      barGrad.addColorStop(0, '#fde047');
      barGrad.addColorStop(0.5, '#ec4899');
      barGrad.addColorStop(1, '#7e22ce');
      ctx.fillStyle = barGrad;
      ctx.beginPath();
      ctx.roundRect(bx, by, barW, barH, 4);
      ctx.fill();
    }
  }

  // CHANNEL 2: LOST WORLD SURVIVAL NEWS (TICKER, BLOOD MOON RADAR & ISLAND ALERTS)
  private drawSurvivalNewsChannel(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    telemetry: SmartTvTelemetry,
  ): void {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#091e3a');
    grad.addColorStop(0.55, '#1e293b');
    grad.addColorStop(1, '#0f172a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Studio backdrop volcano window
    ctx.save();
    ctx.fillStyle = '#020617';
    ctx.fillRect(40, 52, w - 80, 325);

    const cloudOffset = (this.animClock * 16) % (w - 80);
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(120 + cloudOffset, 125, 68, 0, Math.PI * 2);
    ctx.arc(195 + cloudOffset, 108, 86, 0, Math.PI * 2);
    ctx.arc(270 + cloudOffset, 134, 60, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(80, 377);
    ctx.lineTo(240, 175);
    ctx.lineTo(320, 232);
    ctx.lineTo(440, 142);
    ctx.lineTo(580, 377);
    ctx.fill();

    const bloodMoonUrgent = telemetry.daysUntilBloodMoon <= 1;
    ctx.fillStyle = bloodMoonUrgent ? '#dc2626' : '#ef4444';
    ctx.beginPath();
    ctx.arc(
      440,
      147,
      (bloodMoonUrgent ? 18 : 12) + Math.sin(this.animClock * 4.5) * 4,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.restore();

    // Animated Raptor News Anchor
    const anchorBob = Math.sin(this.animClock * 3.5) * 4;
    ctx.fillStyle = '#1e3a8a';
    ctx.beginPath();
    ctx.ellipse(295, 275 + anchorBob, 55, 75, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#16a34a';
    ctx.beginPath();
    ctx.arc(295, 180 + anchorBob, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.ellipse(322, 185 + anchorBob, 22, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Sunglasses
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(284, 170 + anchorBob, 34, 12);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(286, 173 + anchorBob, 12, 5);
    ctx.fillRect(303, 173 + anchorBob, 12, 5);

    const mouthOpen = this.isPaused ? 3 : Math.abs(Math.sin(this.animClock * 12)) * 8;
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(318, 191 + anchorBob, 18, Math.max(3, mouthOpen));

    const deskGrad = ctx.createLinearGradient(110, 295, 490, 390);
    deskGrad.addColorStop(0, '#0284c7');
    deskGrad.addColorStop(1, '#0369a1');
    ctx.fillStyle = deskGrad;
    ctx.beginPath();
    ctx.roundRect(110, 295, 370, 92, 12);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('LOST WORLD NEWS', 188, 348);

    // Live Blood Moon & Predator Weather Radar (Top-Right)
    const rx = w - 370;
    const ry = 66;
    const rw = 290;
    const rh = 240;

    ctx.fillStyle = 'rgba(2, 6, 23, 0.92)';
    ctx.strokeStyle = bloodMoonUrgent ? '#ef4444' : '#22c55e';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(rx, ry, rw, rh, 10);
    ctx.fill();
    ctx.stroke();

    const cx = rx + rw / 2;
    const cy = ry + rh / 2 + 6;
    ctx.strokeStyle = bloodMoonUrgent
      ? 'rgba(239, 68, 68, 0.35)'
      : 'rgba(34, 197, 94, 0.35)';
    ctx.lineWidth = 1;
    [32, 62, 92].forEach((rad) => {
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.stroke();
    });

    const sweepAngle = (this.animClock * 2.2) % (Math.PI * 2);
    ctx.strokeStyle = bloodMoonUrgent ? '#f87171' : '#4ade80';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(sweepAngle) * 92, cy + Math.sin(sweepAngle) * 92);
    ctx.stroke();

    ctx.fillStyle = '#166534';
    ctx.beginPath();
    ctx.ellipse(cx - 8, cy + 4, 44, 29, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Predator Blips
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(cx + 28, cy - 16, 4.5, 0, Math.PI * 2);
    ctx.arc(cx - 32, cy + 19, 4.5, 0, Math.PI * 2);
    ctx.arc(cx + 12, cy + 32, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Shelter Blip
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(cx + 4, cy + 8, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = bloodMoonUrgent ? '#fca5a5' : '#4ade80';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(
      `BLOOD MOON RADAR · IN ${telemetry.daysUntilBloodMoon}D`,
      rx + 14,
      ry + 22,
    );

    // Island Alert Banner
    ctx.fillStyle = bloodMoonUrgent ? '#991b1b' : '#b91c1c';
    ctx.fillRect(40, h - 165, w - 80, 48);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(
      bloodMoonUrgent
        ? 'ALERT: CRIMSON BLOOD MOON IMMINENT — FORTIFY SHELTER!'
        : `ISLAND ALERT: DAY ${telemetry.dayCount} · WEATHER ${telemetry.weather.toUpperCase()}`,
      62,
      h - 133,
    );

    // Scrolling Ticker
    ctx.fillStyle = '#090d16';
    ctx.fillRect(40, h - 117, w - 80, 38);
    const tickerText = `DAY ${telemetry.dayCount} · WEATHER: ${telemetry.weather.toUpperCase()} · BLOOD MOON IN ${
      telemetry.daysUntilBloodMoon
    } DAYS · FLUID EROSION: ${
      telemetry.erosionActive ? 'ACTIVE' : 'CALM'
    } · PREDATORS TRACKED: ${telemetry.dinoCount} · TAMED ALLIES: ${
      telemetry.tamedCount
    } · BIOME: ${telemetry.playerBiome.toUpperCase()} · STAY HYDRATED & FORTIFY PERIMETER`;

    ctx.save();
    ctx.beginPath();
    ctx.rect(40, h - 117, w - 80, 38);
    ctx.clip();
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 16px monospace';
    const textW = ctx.measureText(tickerText).width;
    const tickerX = w - 80 - (this.newsTickerOffset % (textW + w));
    ctx.fillText(tickerText, tickerX, h - 92);
    ctx.restore();
  }

  // CHANNEL 3: NATURE & WILDLIFE CAM (ISLAND OCEAN/FOREST SCENERY)
  private drawNatureWildlifeCam(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    telemetry: SmartTvTelemetry,
  ): void {
    const t = this.animClock;
    const sky = ctx.createLinearGradient(0, 0, 0, h * 0.62);
    sky.addColorStop(0, '#0284c7');
    sky.addColorStop(0.55, '#38bdf8');
    sky.addColorStop(1, '#bae6fd');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Warm Tropical Sun (scaled to 1280x720)
    const sunCenterX = w * 0.74;
    const sunCenterY = h * 0.25;
    ctx.fillStyle = 'rgba(254, 240, 138, 0.35)';
    ctx.beginPath();
    ctx.arc(sunCenterX, sunCenterY, 82 + Math.sin(t * 1.5) * 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(sunCenterX, sunCenterY, 54, 0, Math.PI * 2);
    ctx.fill();

    // Drifting Tropical Clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    for (let c = 0; c < 3; c++) {
      const cx = ((t * (18 + c * 7) + c * 420) % (w + 260)) - 130;
      const cy = 105 + c * 42;
      ctx.beginPath();
      ctx.arc(cx, cy, 32, 0, Math.PI * 2);
      ctx.arc(cx + 34, cy - 12, 38, 0, Math.PI * 2);
      ctx.arc(cx + 68, cy, 28, 0, Math.PI * 2);
      ctx.fill();
    }

    // Distant Emerald Jungle Ridge (full width)
    ctx.fillStyle = '#065f46';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.56);
    ctx.quadraticCurveTo(w * 0.2, h * 0.35, w * 0.44, h * 0.54);
    ctx.quadraticCurveTo(w * 0.68, h * 0.41, w * 0.94, h * 0.56);
    ctx.lineTo(0, h * 0.56);
    ctx.fill();

    // Ocean Waves (3 shimmering parallax bands)
    const waveColors = ['#0369a1', '#0284c7', '#0ea5e9'];
    for (let layer = 0; layer < 3; layer++) {
      const baseY = h * (0.56 + layer * 0.11);
      ctx.fillStyle = waveColors[layer];
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.lineTo(0, baseY);
      for (let x = 0; x <= w; x += 32) {
        const y =
          baseY +
          Math.sin(x * 0.015 + t * (1.8 + layer * 0.4) + layer * 2) * (8 + layer * 3);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();
    }

    // Animated Leaping Dolphin in the Cove
    const leapCycle = (t * 0.42) % 1;
    if (leapCycle < 0.55) {
      const u = leapCycle / 0.55;
      const dx = 340 + u * 290;
      const dy = h * 0.65 - Math.sin(u * Math.PI) * 95;
      const rot = (0.5 - u) * -1.1;
      ctx.save();
      ctx.translate(dx, dy);
      ctx.rotate(rot);
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.ellipse(0, 0, 34, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-6, -10);
      ctx.lineTo(-14, -24);
      ctx.lineTo(4, -10);
      ctx.fill();
      ctx.restore();
    }

    // Golden Sandy Shoreline Foreground
    ctx.fillStyle = '#eab308';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.78);
    ctx.quadraticCurveTo(220, h * 0.85, 520, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    // Swaying Left Palm Tree Silhouette
    const sway = Math.sin(t * 1.6) * 14;
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 22;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(75, h);
    ctx.quadraticCurveTo(95, h * 0.58, 145 + sway, 150);
    ctx.stroke();

    const tipX = 145 + sway;
    const tipY = 150;
    ctx.fillStyle = '#15803d';
    for (let f = 0; f < 6; f++) {
      const a = (f / 6) * Math.PI * 2 + Math.sin(t * 1.8) * 0.08;
      ctx.save();
      ctx.translate(tipX, tipY);
      ctx.rotate(a);
      ctx.beginPath();
      ctx.ellipse(54, 0, 62, 16, 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Wildlife Cam Soaring Tropical Birds
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3;
    for (let b = 0; b < 4; b++) {
      const bx = ((t * 55 + b * 220) % (w + 120)) - 60;
      const by = 110 + Math.sin(t * 2.5 + b) * 24 + b * 18;
      const flap = Math.sin(t * 8 + b * 2) * 8;
      ctx.beginPath();
      ctx.moveTo(bx - 12, by + flap);
      ctx.quadraticCurveTo(bx - 6, by - 6, bx, by);
      ctx.quadraticCurveTo(bx + 6, by - 6, bx + 12, by + flap);
      ctx.stroke();
    }

    // Wildlife Cam Viewfinder Frame & REC Badge
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    const pad = 28;
    ctx.strokeRect(pad, 58, w - pad * 2, h - 86);

    const recBlink = Math.sin(t * 4) > 0;
    ctx.fillStyle = 'rgba(2, 6, 23, 0.72)';
    ctx.beginPath();
    ctx.roundRect(44, 72, 260, 34, 8);
    ctx.fill();
    if (recBlink && !this.isPaused) {
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(62, 89, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(
      `CAM-04 · ${telemetry.playerBiome.toUpperCase()} COVE`,
      78,
      94,
    );
  }

  // CHANNEL 4: RETRO ARCADE & GAMING (ANIMATED PIXEL/3D GAMEPLAY LOOP)
  private drawRetroArcadeGaming(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const t = this.animClock;
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, w, h);

    // 3D Starfield Warp
    const starCount = 85;
    for (let i = 0; i < starCount; i++) {
      const angle = (i / starCount) * Math.PI * 2;
      const speed = (t * 165 + i * 35) % 480;
      const sx = w / 2 + Math.cos(angle) * speed * 1.6;
      const sy = h / 2 + Math.sin(angle) * speed;
      const starSize = Math.max(1.5, (speed / 480) * 5);
      ctx.fillStyle = i % 3 === 0 ? '#22d3ee' : '#a5f3fc';
      ctx.fillRect(sx, sy, starSize, starSize);
    }

    // Perspective Neon Grid
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 1.5;
    const gridY = h * 0.68;
    for (let i = -10; i <= 10; i++) {
      ctx.beginPath();
      ctx.moveTo(w / 2, gridY);
      ctx.lineTo(w / 2 + i * 95, h);
      ctx.stroke();
    }
    const gridScroll = (t * 1.1) % 1;
    for (let j = 0; j < 6; j++) {
      const lineY = gridY + ((j + gridScroll) / 6) * (h - gridY);
      ctx.beginPath();
      ctx.moveTo(0, lineY);
      ctx.lineTo(w, lineY);
      ctx.stroke();
    }

    // Animated Enemy Pixel Dino-Boss Target (Right)
    const enemyX = w * 0.76;
    const enemyY = h * 0.45 + Math.sin(t * 2.4) * 52;
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(enemyX - 38, enemyY - 34, 76, 68);
    ctx.fillStyle = '#f97316';
    ctx.fillRect(enemyX - 24, enemyY - 22, 48, 44);
    // Pixel eyes
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(enemyX - 18, enemyY - 12, 12, 10);
    ctx.fillRect(enemyX + 4, enemyY - 12, 12, 10);

    // Player Neon Fighter Jet (Left-Center)
    const jetX = w * 0.28 + Math.sin(t * 2.1) * 44;
    const jetY = h * 0.46 + Math.cos(t * 2.8) * 38;

    ctx.fillStyle = '#22d3ee';
    ctx.beginPath();
    ctx.moveTo(jetX - 44, jetY + 8);
    ctx.lineTo(jetX - 88 - Math.abs(Math.sin(t * 25)) * 28, jetY + 14);
    ctx.lineTo(jetX - 44, jetY + 22);
    ctx.fill();

    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(jetX + 72, jetY + 15);
    ctx.lineTo(jetX - 42, jetY - 18);
    ctx.lineTo(jetX - 32, jetY + 15);
    ctx.lineTo(jetX - 42, jetY + 46);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.ellipse(jetX + 16, jetY + 15, 22, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Laser Salvos + Hit Spark
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 4;
    const span = enemyX - jetX;
    const shotProg = (t * 2.4) % 1;
    const lx = jetX + 64 + shotProg * Math.max(120, span - 80);
    ctx.beginPath();
    ctx.moveTo(lx, jetY + 8);
    ctx.lineTo(lx + 54, jetY + 8);
    ctx.moveTo(lx, jetY + 22);
    ctx.lineTo(lx + 54, jetY + 22);
    ctx.stroke();

    if (shotProg > 0.8) {
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(enemyX - 24, enemyY, 26 * (1 - (shotProg - 0.8) * 4), 0, Math.PI * 2);
      ctx.fill();
    }

    // Retro Arcade HUD Bar
    const score = 98450 + Math.floor(t * 120) * 10;
    ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
    ctx.fillRect(36, 62, w - 72, 42);
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 2;
    ctx.strokeRect(36, 62, w - 72, 42);

    ctx.fillStyle = '#22d3ee';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('1UP · DINO STARFIGHTER', 54, 89);
    ctx.fillStyle = '#fde047';
    ctx.fillText(`SCORE ${score.toString().padStart(7, '0')}`, w - 340, 89);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(0, h - 68, w, 68);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 17px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      'INSERT COIN · WAVE 07 · LASER TURBO CHARGED [COMBO x4]',
      w / 2,
      h - 28,
    );
    ctx.textAlign = 'left';
  }

  // CHANNEL 5: STATIC / STANDBY (CRT SNOW & HORIZONTAL SYNC ROLL)
  private drawStaticStandbyChannel(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const step = 16;
    const seedBase = Math.floor(this.animClock * 24);
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        const hash = ((x * 73856093) ^ (y * 19349663) ^ (seedBase * 83492791)) >>> 0;
        const v = 26 + (hash % 150);
        ctx.fillStyle = `rgb(${v}, ${v}, ${Math.min(255, v + 8)})`;
        ctx.fillRect(x, y, step, step);
      }
    }

    // Rolling VHS horizontal interference band
    const rollY = ((this.animClock * 170) % (h + 90)) - 45;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.fillRect(0, rollY, w, 28);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
    ctx.fillRect(0, rollY + 28, w, 12);

    // Classic Center Blue/Dark OSD Box
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(w / 2 - 220, h / 2 - 64, 440, 128, 14);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CH 05 · STATIC / STANDBY', w / 2, h / 2 - 8);
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 15px monospace';
    ctx.fillText('NO BROADCAST SIGNAL · SWITCH CH 1–4', w / 2, h / 2 + 28);
    ctx.textAlign = 'left';
  }

  private drawYouTubeBroadcast(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
  ): void {
    const t = this.animClock;
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#0f0709');
    bg.addColorStop(0.5, '#1f0b12');
    bg.addColorStop(1, '#09090b');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Ambient Crimson Glow behind YouTube Player Card
    const glow = ctx.createRadialGradient(w / 2, h * 0.48, 30, w / 2, h * 0.48, 360);
    glow.addColorStop(0, 'rgba(239, 68, 68, 0.36)');
    glow.addColorStop(0.6, 'rgba(220, 38, 38, 0.12)');
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    // Center YouTube Red Play Badge
    const cardW = 200;
    const cardH = 136;
    const cardX = w / 2 - cardW / 2;
    const cardY = h * 0.33 - cardH / 2 + Math.sin(t * 2.1) * 5;
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 32);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    if (this.isPaused) {
      ctx.fillRect(w / 2 - 26, cardY + 38, 18, 60);
      ctx.fillRect(w / 2 + 8, cardY + 38, 18, 60);
    } else {
      ctx.moveTo(w / 2 - 22, cardY + 36);
      ctx.lineTo(w / 2 + 34, cardY + cardH / 2);
      ctx.lineTo(w / 2 - 22, cardY + cardH - 36);
      ctx.closePath();
      ctx.fill();
    }

    // Active Video Title & Channel
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 34px sans-serif';
    ctx.textAlign = 'center';
    const clippedTitle =
      this.youtubeTitle.length > 42
        ? `${this.youtubeTitle.slice(0, 40)}…`
        : this.youtubeTitle;
    ctx.fillText(clippedTitle, w / 2, h * 0.56);

    ctx.fillStyle = '#fca5a5';
    ctx.font = 'bold 20px monospace';
    ctx.fillText(
      `YOUTUBE · ${this.youtubeChannel.toUpperCase()}`,
      w / 2,
      h * 0.63,
    );
    ctx.textAlign = 'left';

    // Audio-Reactive Visualizer Bars at bottom (boosted by live Car Trunk Subwoofer energy)
    const barCount = 32;
    const barW = (w - 160) / barCount - 6;
    const bassLift = this.trunkBassEnergy * 46;
    for (let i = 0; i < barCount; i++) {
      const edgeSubWeight = i < 6 || i > barCount - 7 ? 1.25 : 0.85;
      const amp = this.isPaused
        ? 0.14
        : 0.25 + 0.65 * Math.abs(Math.sin(t * 4.2 + i * 0.52));
      const barH = Math.min(155, 14 + amp * 88 + bassLift * edgeSubWeight);
      const bx = 80 + i * (barW + 6);
      const by = h - 48 - barH;
      const barGrad = ctx.createLinearGradient(0, by, 0, by + barH);
      barGrad.addColorStop(0, this.trunkBassEnergy > 0.55 ? '#fb923c' : '#f87171');
      barGrad.addColorStop(1, '#991b1b');
      ctx.fillStyle = barGrad;
      ctx.beginPath();
      ctx.roundRect(bx, by, barW, barH, 4);
      ctx.fill();
    }

    if (this.bassMode !== 'off') {
      ctx.strokeStyle = `rgba(249, 115, 22, ${(0.18 + this.trunkBassEnergy * 0.68).toFixed(2)})`;
      ctx.lineWidth = 4 + this.trunkBassEnergy * 10;
      ctx.strokeRect(4, 50, w - 8, h - 54);
    }
  }

  // SMART TV OS TOP STATUS BAR
  private drawSmartTvOsOverlay(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    telemetry: SmartTvTelemetry,
  ): void {
    ctx.fillStyle = 'rgba(2, 6, 23, 0.78)';
    ctx.fillRect(0, 0, w, 46);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('LOST WORLD SMART TV', 26, 29);

    ctx.fillStyle = '#22c55e';
    ctx.fillRect(w - 216, 25, 4, 10);
    ctx.fillRect(w - 208, 21, 4, 14);
    ctx.fillRect(w - 200, 17, 4, 18);
    ctx.fillRect(w - 192, 13, 4, 22);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '13px monospace';
    const timeHr = Math.floor(telemetry.timeOfDay * 24);
    const timeMin = Math.floor((telemetry.timeOfDay * 24 - timeHr) * 60);
    ctx.fillText(
      `${timeHr.toString().padStart(2, '0')}:${timeMin
        .toString()
        .padStart(2, '0')} · DAY ${telemetry.dayCount}`,
      w - 174,
      29,
    );

    const curMeta = this.getCurrentChannelMeta();
    const activeBadgeText = this.isStopped
      ? 'PLAYBACK STOPPED · READY'
      : this.isUsingYouTube
        ? `YOUTUBE · ${this.youtubeTitle.slice(0, 26).toUpperCase()}`
        : this.isUsingLocalVideo
          ? `USB VIDEO · ${this.localVideoName.toUpperCase()}`
          : `${curMeta.badge} · ${curMeta.name.toUpperCase()}`;
    ctx.fillStyle = this.isStopped
      ? '#475569'
      : this.isPaused
        ? '#d97706'
        : this.isUsingYouTube
          ? '#dc2626'
          : this.isUsingLocalVideo
            ? '#0284c7'
            : curMeta.color;
    ctx.beginPath();
    ctx.roundRect(w / 2 - 225, 8, 450, 30, 15);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    const prefix = this.isStopped ? '' : this.isPaused ? 'PAUSED · ' : '';
    ctx.fillText(`${prefix}${activeBadgeText}`, w / 2, 28);
    ctx.textAlign = 'left';

    // Crisp translucent Pause Badge if paused
    if (this.isPaused && !this.isStopped) {
      ctx.fillStyle = 'rgba(2, 6, 23, 0.76)';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(w - 190, h - 72, 162, 46, 12);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('|| PAUSED', w - 109, h - 43);
      ctx.textAlign = 'left';
    }
  }

  private drawStoppedScreen(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
  ): void {
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#090d16');
    bg.addColorStop(0.5, '#0f172a');
    bg.addColorStop(1, '#020617');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(w / 2 - 250, h / 2 - 82, 500, 164, 24);
    ctx.stroke();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PLAYBACK STOPPED', w / 2, h / 2 - 12);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '16px monospace';
    ctx.fillText('OPEN REMOTE TO SELECT YOUTUBE OR TV CHANNEL', w / 2, h / 2 + 28);
    ctx.textAlign = 'left';
  }

  // PROCEDURAL WEB AUDIO SYNTH PER CHANNEL
  private updateProceduralAudio(): void {
    if (
      !this.audioCtx ||
      this.audioCtx.state !== 'running' ||
      !this.power ||
      this.isMuted ||
      this.isPaused
    ) {
      return;
    }
    const now = this.audioCtx.currentTime;
    const stepInterval =
      this.currentChannel === 1
        ? 0.44
        : this.currentChannel === 3
          ? 0.68
          : this.currentChannel === 4
            ? 0.22
            : 0.34;
    if (now - this.lastAudioNoteTime < stepInterval) return;
    this.lastAudioNoteTime = now;
    this.audioStep = (this.audioStep + 1) % 16;

    switch (this.currentChannel) {
      case 1: {
        // Lo-Fi Chill Radio warm Maj7 chords + car trunk 808 thump
        const lofiNotes = [220.0, 261.63, 329.63, 392.0, 440.0, 329.63, 293.66, 261.63];
        const freq = lofiNotes[this.audioStep % lofiNotes.length];
        this.playTone(freq, 'sine', 0.42, 0.11);
        if (this.audioStep % 4 === 0) {
          this.playTone(110.0, 'triangle', 0.55, 0.08);
          if (this.bassMode !== 'off') {
            this.playTrunkSubDrop(this.bassMode === 'extreme' ? 0.55 : 0.36);
            this.trunkTransientPulse = 1.0;
          }
        }
        break;
      }
      case 2: {
        // Lost World Survival News crisp broadcast pulse & radar ping
        if (this.audioStep % 4 === 0) {
          const newsScale = [440, 554.37, 659.25, 880];
          this.playTone(newsScale[(this.audioStep / 4) % newsScale.length], 'triangle', 0.2, 0.07);
          if (this.bassMode !== 'off') {
            this.playTrunkSubDrop(0.28);
            this.trunkTransientPulse = 0.8;
          }
        } else if (this.audioStep % 8 === 2) {
          this.playTone(1174.66, 'sine', 0.14, 0.04);
        }
        break;
      }
      case 3: {
        // Nature & Wildlife Cam serene pentatonic wind chimes & surf wash
        const natureScale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25];
        const freq = natureScale[(this.audioStep * 3) % natureScale.length];
        this.playTone(freq, 'sine', 0.65, 0.06);
        if (this.audioStep % 4 === 0) {
          this.playStaticBurst(0.35, 0.035);
          if (this.bassMode !== 'off') {
            this.playTrunkSubDrop(0.24);
            this.trunkTransientPulse = 0.65;
          }
        }
        break;
      }
      case 4: {
        // Retro Arcade & Gaming energetic chiptune synth + heavy sub kick
        const bass = this.audioStep % 4 === 0 ? 110 : 146.83;
        this.playTone(bass, 'sawtooth', 0.18, 0.07);
        const lead = [329.63, 392.0, 440.0, 523.25, 587.33, 659.25];
        this.playTone(lead[(this.audioStep * 2) % lead.length], 'square', 0.12, 0.045);
        if (this.bassMode !== 'off' && this.audioStep % 2 === 0) {
          this.playTrunkSubDrop(this.bassMode === 'extreme' ? 0.52 : 0.34);
          this.trunkTransientPulse = this.audioStep % 4 === 0 ? 1.0 : 0.7;
        }
        break;
      }
      case 5: {
        // Static / Standby gentle CRT static
        this.playStaticBurst(0.28, 0.06);
        break;
      }
    }
  }

  private playTrunkSubDrop(gainScale = 0.45): void {
    if (
      !this.audioCtx ||
      !this.masterGain ||
      this.audioCtx.state !== 'running' ||
      !this.power ||
      this.isMuted ||
      this.isPaused ||
      this.isStopped ||
      this.bassMode === 'off' ||
      this.activeAudioNodes >= 10
    ) {
      return;
    }
    try {
      const now = this.audioCtx.currentTime;
      const isExtreme = this.bassMode === 'extreme';
      const subOsc = this.audioCtx.createOscillator();
      const subFilter = this.audioCtx.createBiquadFilter();
      const subGain = this.audioCtx.createGain();

      // Tuned Car Trunk 12" Subwoofer 808 pitch-drop: 76Hz -> 43Hz -> 36Hz
      subOsc.type = isExtreme ? 'triangle' : 'sine';
      subOsc.frequency.setValueAtTime(isExtreme ? 82 : 72, now);
      subOsc.frequency.exponentialRampToValueAtTime(44, now + 0.09);
      subOsc.frequency.exponentialRampToValueAtTime(36, now + 0.34);

      subFilter.type = 'lowpass';
      subFilter.frequency.setValueAtTime(isExtreme ? 115 : 96, now);
      subFilter.Q.value = 1.6;

      const peakGain = Math.max(
        0.01,
        gainScale * this.volume * (isExtreme ? 0.95 : 0.68),
      );
      subGain.gain.setValueAtTime(0.0001, now);
      subGain.gain.linearRampToValueAtTime(peakGain, now + 0.014);
      subGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.36);

      subOsc.connect(subFilter);
      subFilter.connect(subGain);
      subGain.connect(this.masterGain);

      this.activeAudioNodes += 1;
      subOsc.onended = () => {
        this.activeAudioNodes = Math.max(0, this.activeAudioNodes - 1);
        try {
          subOsc.disconnect();
          subFilter.disconnect();
          subGain.disconnect();
        } catch {
          // Ignore already disconnected nodes
        }
      };

      subOsc.start(now);
      subOsc.stop(now + 0.38);
    } catch {
      // Ignore Web Audio edge cases
    }
  }

  private sampleTrunkAnalyserEnergy(): number {
    if (!this.trunkAnalyser || !this.trunkFreqBins || !this.audioCtx) return 0;
    if (this.audioCtx.state !== 'running') return 0;
    try {
      this.trunkAnalyser.getByteFrequencyData(this.trunkFreqBins);
      // Sub-bass & low-bass bins (first 4 bins at 128 FFT)
      let sum = 0;
      const count = Math.min(4, this.trunkFreqBins.length);
      for (let i = 0; i < count; i++) {
        sum += this.trunkFreqBins[i] / 255;
      }
      return count > 0 ? Math.min(1, (sum / count) * 1.4) : 0;
    } catch {
      return 0;
    }
  }

  private updateTrunkSubBassState(dt: number): void {
    const isPlaying =
      this.power &&
      !this.isPaused &&
      !this.isStopped &&
      !this.isMuted &&
      this.bassMode !== 'off';

    if (!isPlaying) {
      this.trunkTransientPulse = 0;
      this.trunkBassEnergy = Math.max(0, this.trunkBassEnergy - dt * 7.5);
      return;
    }

    this.trunkTransientPulse = Math.max(0, this.trunkTransientPulse - dt * 4.2);

    const effectiveSpatial = this.directListenOverride ? 1.0 : this.lastSpatialMult;

    // When YouTube video is playing in Trunk Sub mode, trigger deep low-passed 808 car-trunk
    // chest thumps synced to playback clock so cross-origin YouTube streams bump like a trunk sub.
    if (this.isUsingYouTube) {
      if (
        this.audioCtx &&
        this.audioCtx.state === 'running' &&
        this.volume > 0.01 &&
        effectiveSpatial > 0.02
      ) {
        const now = this.audioCtx.currentTime;
        const stepInterval = 0.23; // ~130 BPM sixteenth cadence
        if (now - this.lastTrunkHitTime >= stepInterval) {
          this.lastTrunkHitTime = now;
          this.trunkStep = (this.trunkStep + 1) % 16;
          // Classic hip-hop/car-trunk 808 kick pattern on steps 0, 3, 6, 8, 10, 14
          const isMainHit = this.trunkStep === 0 || this.trunkStep === 8;
          const isAccentHit =
            this.trunkStep === 3 ||
            this.trunkStep === 6 ||
            this.trunkStep === 10 ||
            this.trunkStep === 14;
          if (isMainHit || isAccentHit) {
            const hitPower = isMainHit ? 0.92 : 0.62;
            this.playTrunkSubDrop(
              hitPower * (this.bassMode === 'extreme' ? 0.95 : 0.65),
            );
            this.trunkTransientPulse = hitPower;
          }
        }
      }
    }

    const analyserEnergy = this.sampleTrunkAnalyserEnergy();
    const targetEnergy = computeTrunkBassEnvelope({
      timeSec: this.currentTimestamp,
      active: isPlaying,
      bassMode: this.bassMode,
      volume: this.volume,
      spatialMult: effectiveSpatial,
      analyserEnergy,
      transientPulse: this.trunkTransientPulse,
    });

    const lerpRate = targetEnergy > this.trunkBassEnergy ? 20 : 7.5;
    this.trunkBassEnergy +=
      (targetEnergy - this.trunkBassEnergy) * Math.min(1, dt * lerpRate);
  }

  private applyScreenMeshTrunkBump(): void {
    const mesh = this.screenMesh;
    if (!mesh) return;
    const basePos = mesh.userData.__tvBasePos as THREE.Vector3 | undefined;
    const baseRot = mesh.userData.__tvBaseRot as THREE.Euler | undefined;
    const baseScale = mesh.userData.__tvBaseScale as THREE.Vector3 | undefined;
    if (!basePos || !baseRot || !baseScale) return;

    const offsets = computeTrunkVisualOffsets(
      this.power && !this.isPaused && !this.isStopped ? this.trunkBassEnergy : 0,
      this.animClock,
      this.bassMode,
    );
    mesh.position.set(
      basePos.x,
      basePos.y + offsets.offsetY,
      basePos.z + offsets.offsetZ,
    );
    mesh.rotation.set(
      baseRot.x + offsets.tiltXRad,
      baseRot.y,
      baseRot.z + offsets.tiltZRad,
    );
    mesh.scale.set(
      baseScale.x * (1 + offsets.scaleBoost),
      baseScale.y * (1 + offsets.scaleBoost),
      baseScale.z,
    );
    if (this.screenMat && this.power) {
      this.screenMat.emissiveIntensity = 1.0 + this.trunkBassEnergy * 0.35;
    }
  }

  public dispose(): void {
    if (this.audioCtx) {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
    this.cleanupLocalVideoElement();
    this.placedTvMats.clear();
    this.canvasTexture.dispose();
    if (this.tvGlowLight && this.tvGlowLight.parent) {
      this.tvGlowLight.parent.remove(this.tvGlowLight);
      this.tvGlowLight.dispose();
    }
  }
}
