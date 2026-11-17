import * as THREE from 'three';

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
  private ctx: CanvasRenderingContext2D;
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

  private turnOnProgress = 1.0;
  private turnOffProgress = 0.0;
  private isPoweringTransition = false;
  private segmentTimer = 0;
  private onAutoAdvanceCallback?: (ch: TvChannelMeta) => void;

  // Web Audio Synthesizer
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private lastAudioNoteTime = 0;
  private audioStep = 0;
  private lastSpatialMult = 1.0;

  // TV Screen mesh & Light references
  private screenMesh: THREE.Mesh | null = null;
  private screenMat: THREE.MeshStandardMaterial | null = null;
  private standbyLedMat: THREE.MeshStandardMaterial | null = null;
  public tvGlowLight: THREE.PointLight | null = null;
  public tvWorldPos = new THREE.Vector3(1.4, 1.24, 0.41);

  // Animation clocks (frozen cleanly when isPaused === true)
  private animClock = 0;
  private newsTickerOffset = 0;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1280;
    this.canvas.height = 720;
    const ctx = this.canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      throw new Error('Failed to create 2D context for Smart TV');
    }
    this.ctx = ctx;

    this.canvasTexture = new THREE.CanvasTexture(this.canvas);
    this.canvasTexture.colorSpace = THREE.SRGBColorSpace;
    this.canvasTexture.minFilter = THREE.LinearFilter;
    this.canvasTexture.magFilter = THREE.LinearFilter;
    this.canvasTexture.generateMipmaps = false;

    this.tvGlowLight = new THREE.PointLight(0xa855f7, 1.5, 8.0);
    this.tvGlowLight.castShadow = false;
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
      mat.map = this.canvasTexture;
      mat.emissiveMap = this.canvasTexture;
      if (this.power) {
        mat.color.setHex(0xffffff);
        mat.emissive.setHex(0xffffff);
        mat.emissiveIntensity = 1.0;
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
        ledMat.emissiveIntensity = 1.45;
      } else {
        const pulse = 0.9 + Math.sin(this.animClock * 2.4) * 0.45;
        ledMat.color.setHex(0xef4444);
        ledMat.emissive.setHex(0xef4444);
        ledMat.emissiveIntensity = pulse;
      }
    }
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
      if (this.localVideoElement) {
        this.localVideoElement.pause();
        try {
          this.localVideoElement.currentTime = 0;
        } catch {
          // Ignore if metadata not loaded
        }
      }
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
    if (this.localVideoElement) {
      this.localVideoElement.pause();
      try {
        this.localVideoElement.currentTime = 0;
      } catch {
        // Ignore if metadata not loaded
      }
    }
    this.isUsingLocalVideo = false;
    this.localVideoName = '';
    this.isUsingYouTube = false;
    this.youtubeVideoId = '';
    this.youtubeTitle = 'YouTube';
    this.youtubeChannel = 'YouTube';
    this.currentTimestamp = 0;
    this.isPaused = true;
    this.isStopped = true;
    this.updateSpatialAudioGain(0);
    this.applyMaterialTexture();
  }

  public setPaused(paused: boolean): void {
    this.initAudioContext();
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
    if (wasOff) {
      this.isPoweringTransition = true;
      this.turnOnProgress = 0.25;
    }
    if (this.isUsingLocalVideo && this.localVideoElement) {
      this.localVideoElement.pause();
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
    if (this.localVideoElement) {
      this.localVideoElement.pause();
    }
    this.isUsingLocalVideo = false;
    this.localVideoName = '';
    const isSameVideo = this.isUsingYouTube && this.youtubeVideoId === videoId;
    this.isUsingYouTube = true;
    this.youtubeVideoId = videoId;
    this.youtubeTitle = title;
    this.youtubeChannel = channel;
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
    this.updateSpatialAudioGain(0);
    this.applyMaterialTexture();
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

  public loadLocalVideoFile(file: File): void {
    this.initAudioContext();
    if (this.localVideoElement) {
      this.localVideoElement.pause();
      this.localVideoElement.remove();
      this.localVideoElement = null;
    }
    if (this.localVideoObjectUrl) {
      URL.revokeObjectURL(this.localVideoObjectUrl);
      this.localVideoObjectUrl = null;
    }

    const objectUrl = URL.createObjectURL(file);
    this.localVideoObjectUrl = objectUrl;

    const video = document.createElement('video');
    video.src = objectUrl;
    video.crossOrigin = 'anonymous';
    video.loop = true;
    video.muted = this.isMuted;
    video.volume = Math.max(0, Math.min(1, this.volume * this.lastSpatialMult));
    video.playsInline = true;
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
    this.applyMaterialTexture();

    video.addEventListener('canplay', () => {
      video.play().catch(() => {});
    });
    video.load();
    video.play().catch(() => {});

    this.localVideoElement = video;
  }

  private initAudioContext(): void {
    if (typeof window === 'undefined') return;
    if (!this.audioCtx) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
        this.masterGain = this.audioCtx.createGain();
        this.masterGain.connect(this.audioCtx.destination);
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
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
      this.isPaused
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
      this.isPaused
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
    this.updateSpatialAudioGain(spatialMult);

    if (this.localVideoElement) {
      const effectiveVol =
        !this.power || this.isMuted || this.isPaused ? 0 : this.volume * spatialMult;
      this.localVideoElement.volume = Math.max(0, Math.min(1, effectiveVol));
    }
  }

  private updateSpatialAudioGain(spatialMult: number): void {
    if (this.localVideoElement) {
      this.localVideoElement.muted = this.isMuted;
      const effectiveVol =
        !this.power || this.isMuted || this.isPaused ? 0 : this.volume * spatialMult;
      this.localVideoElement.volume = Math.max(0, Math.min(1, effectiveVol));
    }
    if (!this.masterGain || !this.audioCtx) return;
    const finalGain =
      !this.power || this.isMuted || this.isPaused ? 0 : this.volume * spatialMult * 0.24;
    this.masterGain.gain.setTargetAtTime(finalGain, this.audioCtx.currentTime, 0.05);
  }

  public drawPreviewToCanvas(targetCanvas: HTMLCanvasElement): void {
    const tCtx = targetCanvas.getContext('2d');
    if (!tCtx) return;
    tCtx.drawImage(this.canvas, 0, 0, targetCanvas.width, targetCanvas.height);
  }

  public update(dt: number, telemetry: SmartTvTelemetry): void {
    if (!this.power || !this.isPaused) {
      this.animClock += dt;
    }
    if (this.power && !this.isPaused) {
      this.currentTimestamp += dt;
      this.newsTickerOffset += dt * 88;
      if (this.autoCycleChannels && !this.isUsingLocalVideo) {
        this.segmentTimer += dt;
        if (this.segmentTimer >= 45) {
          this.segmentTimer = 0;
          const next = this.nextChannel();
          this.onAutoAdvanceCallback?.(next);
        }
      }
    }

    if (!this.power) {
      if (this.isPoweringTransition) {
        this.turnOffProgress += dt * 3.5;
        if (this.turnOffProgress >= 1.0) {
          this.isPoweringTransition = false;
          this.drawOffScreen();
          this.canvasTexture.needsUpdate = true;
          if (this.tvGlowLight) this.tvGlowLight.intensity = 0;
          return;
        }
        this.drawPowerOffAnimation(this.turnOffProgress);
        this.canvasTexture.needsUpdate = true;
      } else {
        this.drawOffScreen();
        this.canvasTexture.needsUpdate = true;
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

    if (this.isUsingLocalVideo && this.localVideoElement) {
      const w = this.canvas.width;
      const h = this.canvas.height;
      const ctx = this.ctx;
      const vid = this.localVideoElement;
      if (vid.readyState >= vid.HAVE_CURRENT_DATA) {
        ctx.drawImage(vid, 0, 0, w, h);
        this.drawSmartTvOsOverlay(ctx, w, h, telemetry);
        if (this.turnOnProgress < 1.0) {
          this.drawPowerOnAnimation(this.turnOnProgress);
        }
        this.canvasTexture.needsUpdate = true;
      } else {
        ctx.fillStyle = '#020617';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 28px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`LOADING VIDEO: ${this.localVideoName.toUpperCase()}...`, w / 2, h / 2);
        ctx.textAlign = 'left';
        this.drawSmartTvOsOverlay(ctx, w, h, telemetry);
        this.canvasTexture.needsUpdate = true;
      }
      if (this.tvGlowLight) {
        this.tvGlowLight.intensity = 1.45;
        this.tvGlowLight.color.setHex(0x38bdf8);
      }
      return;
    }

    if (this.isUsingYouTube) {
      const w = this.canvas.width;
      const h = this.canvas.height;
      const ctx = this.ctx;
      this.drawYouTubeBroadcast(ctx, w, h);
      this.drawSmartTvOsOverlay(ctx, w, h, telemetry);
      if (this.turnOnProgress < 1.0) {
        this.drawPowerOnAnimation(this.turnOnProgress);
      }
      this.canvasTexture.needsUpdate = true;
      if (this.tvGlowLight) {
        this.tvGlowLight.intensity = 1.5;
        this.tvGlowLight.color.setHex(0xef4444);
      }
      return;
    }

    if (this.isStopped) {
      const w = this.canvas.width;
      const h = this.canvas.height;
      const ctx = this.ctx;
      this.drawStoppedScreen(ctx, w, h);
      this.drawSmartTvOsOverlay(ctx, w, h, telemetry);
      this.canvasTexture.needsUpdate = true;
      if (this.tvGlowLight) {
        this.tvGlowLight.intensity = 0.55;
        this.tvGlowLight.color.setHex(0x64748b);
      }
      return;
    }

    const w = this.canvas.width;
    const h = this.canvas.height;
    const ctx = this.ctx;

    ctx.fillStyle = '#050508';
    ctx.fillRect(0, 0, w, h);

    switch (this.currentChannel) {
      case 1:
        this.drawLoFiChillRadio(ctx, w, h);
        if (this.tvGlowLight) {
          this.tvGlowLight.intensity = 1.5;
          this.tvGlowLight.color.setHex(0xa855f7);
        }
        break;
      case 2:
        this.drawSurvivalNewsChannel(ctx, w, h, telemetry);
        if (this.tvGlowLight) {
          this.tvGlowLight.intensity = 1.45;
          this.tvGlowLight.color.setHex(0xef4444);
        }
        break;
      case 3:
        this.drawNatureWildlifeCam(ctx, w, h, telemetry);
        if (this.tvGlowLight) {
          this.tvGlowLight.intensity = 1.45;
          this.tvGlowLight.color.setHex(0x10b981);
        }
        break;
      case 4:
        this.drawRetroArcadeGaming(ctx, w, h);
        if (this.tvGlowLight) {
          this.tvGlowLight.intensity = 1.55;
          this.tvGlowLight.color.setHex(0x06b6d4);
        }
        break;
      case 5:
        this.drawStaticStandbyChannel(ctx, w, h);
        if (this.tvGlowLight) {
          this.tvGlowLight.intensity = 0.85;
          this.tvGlowLight.color.setHex(0x94a3b8);
        }
        break;
    }

    this.drawSmartTvOsOverlay(ctx, w, h, telemetry);

    if (this.turnOnProgress < 1.0) {
      this.drawPowerOnAnimation(this.turnOnProgress);
    }

    this.canvasTexture.needsUpdate = true;
    this.updateProceduralAudio();
  }

  private drawPowerOnAnimation(p: number): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
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
    const w = this.canvas.width;
    const h = this.canvas.height;
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
    const w = this.canvas.width;
    const h = this.canvas.height;

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

    // Audio-Reactive Visualizer Bars at bottom
    const barCount = 32;
    const barW = (w - 160) / barCount - 6;
    for (let i = 0; i < barCount; i++) {
      const amp = this.isPaused
        ? 0.14
        : 0.25 + 0.65 * Math.abs(Math.sin(t * 4.2 + i * 0.52));
      const barH = 14 + amp * 95;
      const bx = 80 + i * (barW + 6);
      const by = h - 48 - barH;
      const barGrad = ctx.createLinearGradient(0, by, 0, by + barH);
      barGrad.addColorStop(0, '#f87171');
      barGrad.addColorStop(1, '#991b1b');
      ctx.fillStyle = barGrad;
      ctx.beginPath();
      ctx.roundRect(bx, by, barW, barH, 4);
      ctx.fill();
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
        // Lo-Fi Chill Radio warm Maj7 chords
        const lofiNotes = [220.0, 261.63, 329.63, 392.0, 440.0, 329.63, 293.66, 261.63];
        const freq = lofiNotes[this.audioStep % lofiNotes.length];
        this.playTone(freq, 'sine', 0.42, 0.11);
        if (this.audioStep % 4 === 0) {
          this.playTone(110.0, 'triangle', 0.55, 0.08);
        }
        break;
      }
      case 2: {
        // Lost World Survival News crisp broadcast pulse & radar ping
        if (this.audioStep % 4 === 0) {
          const newsScale = [440, 554.37, 659.25, 880];
          this.playTone(newsScale[(this.audioStep / 4) % newsScale.length], 'triangle', 0.2, 0.07);
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
        }
        break;
      }
      case 4: {
        // Retro Arcade & Gaming energetic chiptune synth
        const bass = this.audioStep % 4 === 0 ? 110 : 146.83;
        this.playTone(bass, 'sawtooth', 0.18, 0.07);
        const lead = [329.63, 392.0, 440.0, 523.25, 587.33, 659.25];
        this.playTone(lead[(this.audioStep * 2) % lead.length], 'square', 0.12, 0.045);
        break;
      }
      case 5: {
        // Static / Standby gentle CRT static
        this.playStaticBurst(0.28, 0.06);
        break;
      }
    }
  }

  public dispose(): void {
    if (this.audioCtx) {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
    if (this.localVideoElement) {
      this.localVideoElement.pause();
      this.localVideoElement.remove();
      this.localVideoElement = null;
    }
    if (this.localVideoObjectUrl) {
      URL.revokeObjectURL(this.localVideoObjectUrl);
      this.localVideoObjectUrl = null;
    }
    this.canvasTexture.dispose();
    if (this.tvGlowLight && this.tvGlowLight.parent) {
      this.tvGlowLight.parent.remove(this.tvGlowLight);
      this.tvGlowLight.dispose();
    }
  }
}
