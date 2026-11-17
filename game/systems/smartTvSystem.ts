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

export type TvChannelId = 1 | 2 | 3 | 4;

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
    name: 'Island Live TV',
    tagline: 'Breaking News & Island Radar',
    badge: 'LIVE',
    color: '#ef4444',
  },
  {
    id: 2,
    name: 'Toon+',
    tagline: 'Chompy & Rexy Cartoon Shorts',
    badge: 'RETRO',
    color: '#a855f7',
  },
  {
    id: 3,
    name: 'Net-Free Cinema',
    tagline: 'Chrono-Strike: Lost Horizon',
    badge: 'SCI-FI',
    color: '#06b6d4',
  },
  {
    id: 4,
    name: 'TubeCast',
    tagline: 'Lo-Fi Visualizer & Local Video Player',
    badge: 'MUSIC/VID',
    color: '#3b82f6',
  },
];

export class SmartTvSystem {
  public canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  public canvasTexture: THREE.CanvasTexture;
  public videoTexture: THREE.VideoTexture | null = null;
  public localVideoElement: HTMLVideoElement | null = null;
  public isUsingLocalVideo = false;

  public power = true;
  public currentChannel: TvChannelId = 1;
  public volume = 0.75;
  public isMuted = false;
  private turnOnProgress = 1.0;
  private turnOffProgress = 0.0;
  private isPoweringTransition = false;

  // Web Audio Synthesizer
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private synthTimer: number | null = null;
  private lastAudioNoteTime = 0;
  private audioStep = 0;

  // TV Screen mesh & Light references
  private screenMesh: THREE.Mesh | null = null;
  private screenMat: THREE.MeshStandardMaterial | null = null;
  public tvGlowLight: THREE.PointLight | null = null;
  public tvWorldPos = new THREE.Vector3(1.4, 1.24, 0.41);

  // Animation clocks
  private animClock = 0;
  private newsTickerOffset = 0;
  private cartoonStep = 0;
  private scifiCamCut = 0;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1024;
    this.canvas.height = 576;
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

    this.tvGlowLight = new THREE.PointLight(0x38bdf8, 1.4, 7.5);
    this.tvGlowLight.castShadow = false;
  }

  public attachToMesh(
    mesh: THREE.Mesh,
    material: THREE.MeshStandardMaterial,
    worldPos?: THREE.Vector3,
  ): void {
    this.screenMesh = mesh;
    this.screenMat = material;
    if (worldPos) {
      this.tvWorldPos.copy(worldPos);
    } else {
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
    if (this.power && this.isUsingLocalVideo && this.videoTexture) {
      this.screenMat.map = this.videoTexture;
      this.screenMat.emissiveMap = this.videoTexture;
      this.screenMat.emissive.setHex(0xffffff);
      this.screenMat.emissiveIntensity = 0.95;
      this.screenMat.roughness = 0.2;
    } else if (this.power) {
      this.screenMat.map = this.canvasTexture;
      this.screenMat.emissiveMap = this.canvasTexture;
      this.screenMat.emissive.setHex(0xffffff);
      this.screenMat.emissiveIntensity = 0.88;
      this.screenMat.roughness = 0.25;
    } else {
      this.screenMat.map = null;
      this.screenMat.emissiveMap = null;
      this.screenMat.emissive.setHex(0x000000);
      this.screenMat.emissiveIntensity = 0;
      this.screenMat.color.setHex(0x080808);
      this.screenMat.roughness = 0.15;
      this.screenMat.metalness = 0.85;
    }
    this.screenMat.needsUpdate = true;
  }

  public togglePower(): boolean {
    this.initAudioContext();
    this.power = !this.power;
    this.isPoweringTransition = true;
    if (this.power) {
      this.turnOnProgress = 0.0;
      this.turnOffProgress = 0.0;
    } else {
      this.turnOffProgress = 0.0;
      if (this.localVideoElement) {
        this.localVideoElement.pause();
      }
    }
    this.applyMaterialTexture();
    return this.power;
  }

  public setChannel(ch: TvChannelId): void {
    this.initAudioContext();
    this.currentChannel = ch;
    if (this.isUsingLocalVideo && this.localVideoElement) {
      this.localVideoElement.pause();
      this.isUsingLocalVideo = false;
    }
    this.applyMaterialTexture();
  }

  public nextChannel(): void {
    const next = (this.currentChannel % 4) + 1;
    this.setChannel(next as TvChannelId);
  }

  public prevChannel(): void {
    const prev = this.currentChannel === 1 ? 4 : this.currentChannel - 1;
    this.setChannel(prev as TvChannelId);
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.volume > 0) this.isMuted = false;
    this.updateSpatialAudioGain(1.0);
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    this.updateSpatialAudioGain(1.0);
    return this.isMuted;
  }

  public loadLocalVideoFile(file: File): void {
    this.initAudioContext();
    if (this.localVideoElement) {
      this.localVideoElement.pause();
      this.localVideoElement.remove();
      this.localVideoElement = null;
    }
    if (this.videoTexture) {
      this.videoTexture.dispose();
      this.videoTexture = null;
    }

    const video = document.createElement('video');
    video.src = URL.createObjectURL(file);
    video.crossOrigin = 'anonymous';
    video.loop = true;
    video.muted = false;
    video.playsInline = true;
    video.autoplay = true;

    video.addEventListener('canplay', () => {
      video.play().catch(() => {});
      this.videoTexture = new THREE.VideoTexture(video);
      this.videoTexture.colorSpace = THREE.SRGBColorSpace;
      this.videoTexture.minFilter = THREE.LinearFilter;
      this.videoTexture.magFilter = THREE.LinearFilter;
      this.isUsingLocalVideo = true;
      this.currentChannel = 4;
      this.applyMaterialTexture();
    });

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

  private playTone(freq: number, type: OscillatorType, dur: number, gainVal: number): void {
    if (!this.audioCtx || !this.masterGain || !this.power || this.isMuted) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

      gain.gain.setValueAtTime(gainVal * this.volume, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        this.audioCtx.currentTime + dur,
      );

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(this.audioCtx.currentTime + dur);
    } catch {
      // Ignore audio glitches
    }
  }

  public updateSpatialAudio(playerX: number, playerY: number, playerZ: number): void {
    const dist = Math.hypot(
      playerX - this.tvWorldPos.x,
      playerY - this.tvWorldPos.y,
      playerZ - this.tvWorldPos.z,
    );

    // Within 3.5m = 100% volume; roll off to 0% at 22m
    let spatialMult = 1.0;
    if (dist > 3.5) {
      spatialMult = Math.max(0, 1.0 - (dist - 3.5) / 18.5);
    }
    this.updateSpatialAudioGain(spatialMult);

    if (this.localVideoElement) {
      const effectiveVol = this.isMuted ? 0 : this.volume * spatialMult;
      this.localVideoElement.volume = Math.max(0, Math.min(1, effectiveVol));
    }
  }

  private updateSpatialAudioGain(spatialMult: number): void {
    if (!this.masterGain || !this.audioCtx) return;
    const finalGain = !this.power || this.isMuted ? 0 : this.volume * spatialMult * 0.22;
    this.masterGain.gain.setTargetAtTime(finalGain, this.audioCtx.currentTime, 0.05);
  }

  public update(dt: number, telemetry: SmartTvTelemetry): void {
    this.animClock += dt;
    this.newsTickerOffset += dt * 82;

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

    if (this.isUsingLocalVideo && this.videoTexture) {
      // Local video handles its own frames
      if (this.tvGlowLight) {
        this.tvGlowLight.intensity = 1.2;
        this.tvGlowLight.color.setHex(0x38bdf8);
      }
      return;
    }

    // Render Procedural TV OS Channels
    const w = this.canvas.width;
    const h = this.canvas.height;
    const ctx = this.ctx;

    ctx.fillStyle = '#050508';
    ctx.fillRect(0, 0, w, h);

    switch (this.currentChannel) {
      case 1:
        this.drawIslandLiveNews(ctx, w, h, telemetry);
        if (this.tvGlowLight) {
          this.tvGlowLight.intensity = 1.35;
          this.tvGlowLight.color.setHex(0xef4444);
        }
        break;
      case 2:
        this.drawToonPlusCartoons(ctx, w, h);
        if (this.tvGlowLight) {
          this.tvGlowLight.intensity = 1.45;
          this.tvGlowLight.color.setHex(0xa855f7);
        }
        break;
      case 3:
        this.drawNetFreeSciFi(ctx, w, h);
        if (this.tvGlowLight) {
          this.tvGlowLight.intensity = 1.5;
          this.tvGlowLight.color.setHex(0x06b6d4);
        }
        break;
      case 4:
        this.drawTubeCastVisualizer(ctx, w, h);
        if (this.tvGlowLight) {
          this.tvGlowLight.intensity = 1.3;
          this.tvGlowLight.color.setHex(0x3b82f6);
        }
        break;
    }

    // Samsung Tizen-Style Smart Hub Top Header & Bottom Dock
    this.drawSamsungSmartHubOverlay(ctx, w, h, telemetry);

    // If powering on, apply CRT expansion line
    if (this.turnOnProgress < 1.0) {
      this.drawPowerOnAnimation(this.turnOnProgress);
    }

    this.canvasTexture.needsUpdate = true;

    // Web Audio Sound Loop (gentle procedural synth music per channel)
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
      const flash = (1 - (p - 0.6) / 0.4);
      ctx.fillStyle = `rgba(255, 255, 255, ${flash})`;
      ctx.fillRect(w / 2 - 20, h / 2 - 2, 40, 4);
    }
    ctx.restore();
  }

  private drawOffScreen(): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.fillStyle = '#050507';
    ctx.fillRect(0, 0, w, h);
  }

  // CHANNEL 1: ISLAND LIVE TV (NEWS & RADAR)
  private drawIslandLiveNews(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    telemetry: SmartTvTelemetry,
  ): void {
    // Studio backdrop gradient
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#091e3a');
    grad.addColorStop(0.55, '#1e293b');
    grad.addColorStop(1, '#0f172a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Studio window view of Lost World volcano & storm clouds
    ctx.save();
    ctx.fillStyle = '#020617';
    ctx.fillRect(40, 40, w - 80, 320);

    // Moving sky clouds
    const cloudOffset = (this.animClock * 15) % (w - 80);
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(120 + cloudOffset, 120, 70, 0, Math.PI * 2);
    ctx.arc(190 + cloudOffset, 100, 90, 0, Math.PI * 2);
    ctx.arc(270 + cloudOffset, 130, 65, 0, Math.PI * 2);
    ctx.fill();

    // Volcanic Mountain silhouette
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(80, 360);
    ctx.lineTo(240, 160);
    ctx.lineTo(320, 220);
    ctx.lineTo(440, 130);
    ctx.lineTo(580, 360);
    ctx.fill();

    // Lava glow on volcano peak
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(440, 135, 12 + Math.sin(this.animClock * 4) * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Animated News Anchor Desk (Center-Left)
    const anchorBob = Math.sin(this.animClock * 3.5) * 4;
    // Anchor Body
    ctx.fillStyle = '#1e3a8a';
    ctx.beginPath();
    ctx.ellipse(320, 270 + anchorBob, 55, 75, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(320, 175 + anchorBob, 36, 0, Math.PI * 2);
    ctx.fill();

    // Raptor Snout & Sunglasses (Lost World News Anchor!)
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.ellipse(345, 180 + anchorBob, 22, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes / Glasses
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(310, 165 + anchorBob, 32, 12);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(312, 168 + anchorBob, 12, 5);
    ctx.fillRect(328, 168 + anchorBob, 12, 5);

    // Mouth talking
    const mouthOpen = Math.abs(Math.sin(this.animClock * 12)) * 8;
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(342, 186 + anchorBob, 18, Math.max(3, mouthOpen));

    // News Desk Glass Top
    const deskGrad = ctx.createLinearGradient(120, 290, 520, 390);
    deskGrad.addColorStop(0, '#0284c7');
    deskGrad.addColorStop(1, '#0369a1');
    ctx.fillStyle = deskGrad;
    ctx.beginPath();
    ctx.roundRect(140, 290, 360, 95, 12);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('ISLAND 7 NEWS', 230, 345);

    // Picture-in-Picture: Live Island Weather Radar (Top-Right)
    const rx = w - 340;
    const ry = 60;
    const rw = 260;
    const rh = 210;

    ctx.fillStyle = 'rgba(2, 6, 23, 0.9)';
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(rx, ry, rw, rh, 8);
    ctx.fill();
    ctx.stroke();

    // Radar concentric circles
    const cx = rx + rw / 2;
    const cy = ry + rh / 2;
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.35)';
    ctx.lineWidth = 1;
    [30, 60, 90].forEach((rad) => {
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Radar sweeping beam
    const sweepAngle = (this.animClock * 2.2) % (Math.PI * 2);
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(sweepAngle) * 92, cy + Math.sin(sweepAngle) * 92);
    ctx.stroke();

    // Island landmass blip
    ctx.fillStyle = '#166534';
    ctx.beginPath();
    ctx.ellipse(cx - 10, cy + 5, 42, 28, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Red blips (predators)
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(cx + 25, cy - 15, 4, 0, Math.PI * 2);
    ctx.arc(cx - 30, cy + 18, 4, 0, Math.PI * 2);
    ctx.fill();

    // Green blip (Player Shelter)
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(cx + 5, cy + 8, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('LIVE SATELLITE RADAR', rx + 14, ry + 22);

    // Lower-Third News Banner
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(40, h - 165, w - 80, 48);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('BREAKING: LOST WORLD SPECIAL REPORT', 65, h - 132);

    // Scrolling Ticker Bar
    ctx.fillStyle = '#090d16';
    ctx.fillRect(40, h - 117, w - 80, 36);

    const tickerText = `DAY ${telemetry.dayCount} IN PROGRESS · WEATHER: ${telemetry.weather.toUpperCase()} · FLUID EROSION: ${
      telemetry.erosionActive ? 'CARVING ACTIVE CHANNELS' : 'CALM'
    } · MEGAGAUNA: ${telemetry.dinoCount} PREDATORS TRACKED · TAMED ALLIES: ${telemetry.tamedCount} · BLOOD MOON IN: ${telemetry.daysUntilBloodMoon} DAYS · SEEK SHELTER BEFORE SUNSET · BIOME: ${telemetry.playerBiome}`;

    ctx.save();
    ctx.beginPath();
    ctx.rect(40, h - 117, w - 80, 36);
    ctx.clip();
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 16px monospace';
    const tickerX = w - 80 - (this.newsTickerOffset % (ctx.measureText(tickerText).width + w));
    ctx.fillText(tickerText, tickerX, h - 93);
    ctx.restore();
  }

  // CHANNEL 2: TOON+ (ANIMATED CARTOONS)
  private drawToonPlusCartoons(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    // Vibrant sunny cartoon jungle backdrop
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#38bdf8');
    grad.addColorStop(0.65, '#fef08a');
    grad.addColorStop(1, '#84cc16');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Smiling Cartoon Sun
    const sunGlow = Math.sin(this.animClock * 3) * 6;
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(140, 110, 48 + sunGlow, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(140, 110, 40, 0, Math.PI * 2);
    ctx.fill();
    // Sun sunglasses
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(115, 100, 50, 12);

    // Lush cartoon palm trees
    ctx.fillStyle = '#78350f';
    ctx.fillRect(220, 210, 22, 190);
    ctx.fillRect(w - 240, 190, 24, 210);

    // Palm leaves
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.arc(230, 200, 60, 0, Math.PI * 2);
    ctx.arc(w - 230, 180, 65, 0, Math.PI * 2);
    ctx.fill();

    // Animated Rolling Coconut
    const coconutX = ((this.animClock * 240) % (w - 180)) + 60;
    const coconutY = 380 - Math.abs(Math.sin(this.animClock * 7)) * 55;
    ctx.fillStyle = '#451a03';
    ctx.beginPath();
    ctx.arc(coconutX, coconutY, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.arc(coconutX + 6, coconutY - 6, 8, 0, Math.PI * 2);
    ctx.fill();

    // Animated Baby T-Rex Chasing the Coconut
    const rexX = Math.max(60, coconutX - 160);
    const rexBob = Math.sin(this.animClock * 14) * 16;
    const rexLegSwing = Math.sin(this.animClock * 14) * 22;

    // Tail
    ctx.fillStyle = '#16a34a';
    ctx.beginPath();
    ctx.moveTo(rexX - 50, 370 + rexBob);
    ctx.quadraticCurveTo(rexX - 90, 360, rexX - 120, 330);
    ctx.lineTo(rexX - 45, 385 + rexBob);
    ctx.fill();

    // Body
    ctx.beginPath();
    ctx.ellipse(rexX, 360 + rexBob, 48, 38, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Head with big goofy cartoon eye
    ctx.beginPath();
    ctx.ellipse(rexX + 45, 320 + rexBob, 36, 28, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Big eye
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(rexX + 50, 310 + rexBob, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(rexX + 54, 310 + rexBob, 6, 0, Math.PI * 2);
    ctx.fill();

    // Sharp goofy teeth
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(rexX + 35 + i * 10, 335 + rexBob);
      ctx.lineTo(rexX + 40 + i * 10, 347 + rexBob);
      ctx.lineTo(rexX + 45 + i * 10, 335 + rexBob);
      ctx.fill();
    }

    // Legs
    ctx.strokeStyle = '#15803d';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(rexX - 15, 390 + rexBob);
    ctx.lineTo(rexX - 25 - rexLegSwing, 430);
    ctx.moveTo(rexX + 20, 390 + rexBob);
    ctx.lineTo(rexX + 15 + rexLegSwing, 430);
    ctx.stroke();

    // Comic Onomatopoeia Caption Pop
    const popCycle = Math.floor(this.animClock * 1.5) % 3;
    const popWords = ['BOING!!', 'ZOOM!!', 'ROAR!!'];
    ctx.save();
    ctx.translate(coconutX, coconutY - 60);
    ctx.rotate(-0.15 + Math.sin(this.animClock * 6) * 0.1);
    ctx.fillStyle = '#f43f5e';
    ctx.font = '900 36px sans-serif';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.strokeText(popWords[popCycle], 0, 0);
    ctx.fillText(popWords[popCycle], 0, 0);
    ctx.restore();

    // Show Title Watermark
    ctx.fillStyle = '#a855f7';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('TOON+ : CHOMPY & REXY', 50, 65);
  }

  // CHANNEL 3: NET-FREE SCI-FI CINEMA
  private drawNetFreeSciFi(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    // Deep Space Starfield Warp
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, w, h);

    // Dynamic 3D Warp Stars
    const starCount = 90;
    ctx.fillStyle = '#38bdf8';
    for (let i = 0; i < starCount; i++) {
      const angle = (i / starCount) * Math.PI * 2;
      const speed = ((this.animClock * 140 + i * 35) % 480);
      const sx = w / 2 + Math.cos(angle) * speed * 1.6;
      const sy = h / 2 + Math.sin(angle) * speed;
      const starSize = Math.max(1, (speed / 480) * 4.5);
      ctx.beginPath();
      ctx.arc(sx, sy, starSize, 0, Math.PI * 2);
      ctx.fill();
    }

    // Neon Cyberpunk Horizon Grid
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 1.5;
    const gridY = h * 0.68;
    for (let i = -10; i <= 10; i++) {
      ctx.beginPath();
      ctx.moveTo(w / 2, gridY);
      ctx.lineTo(w / 2 + i * 90, h);
      ctx.stroke();
    }
    for (let j = 0; j < 5; j++) {
      const lineY = gridY + (j / 5) * (h - gridY);
      ctx.beginPath();
      ctx.moveTo(0, lineY);
      ctx.lineTo(w, lineY);
      ctx.stroke();
    }

    // Futuristic Fighter Jet (Center Stage)
    const jetX = w / 2 + Math.sin(this.animClock * 2.5) * 60;
    const jetY = h * 0.52 + Math.cos(this.animClock * 3.2) * 20;

    // Thruster Flames
    ctx.fillStyle = '#06b6d4';
    ctx.beginPath();
    ctx.moveTo(jetX - 45, jetY + 12);
    ctx.lineTo(jetX - 90 - Math.random() * 35, jetY + 12);
    ctx.lineTo(jetX - 45, jetY + 22);
    ctx.fill();

    // Jet Body
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(jetX + 75, jetY + 15);
    ctx.lineTo(jetX - 45, jetY - 18);
    ctx.lineTo(jetX - 35, jetY + 15);
    ctx.lineTo(jetX - 45, jetY + 45);
    ctx.closePath();
    ctx.fill();

    // Cockpit Canopy
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.ellipse(jetX + 15, jetY + 15, 24, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Laser Blasts from Jet
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 4;
    const laserOffset = (this.animClock * 600) % w;
    ctx.beginPath();
    ctx.moveTo(jetX + laserOffset, jetY + 8);
    ctx.lineTo(jetX + laserOffset + 70, jetY + 8);
    ctx.moveTo(jetX + laserOffset, jetY + 22);
    ctx.lineTo(jetX + laserOffset + 70, jetY + 22);
    ctx.stroke();

    // Cinematic Letterbox Subtitles
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, h - 90, w, 90);

    const subStep = Math.floor(this.animClock * 0.4) % 3;
    const subtitles = [
      '[COMMANDER] All fighter units: The Apex Cyber-Titan has entered Sector 9!',
      '[PILOT] Engaging quantum warp thrusters! Weapons locked onto target!',
      '[TACTICAL] Plasma shields at maximum. Fire all torpedoes on my mark!',
    ];

    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(subtitles[subStep], w / 2, h - 42);
    ctx.textAlign = 'left';

    // Cinematic Stamp
    ctx.fillStyle = '#06b6d4';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('NET-FREE CINEMA · CHRONO-STRIKE', 50, 65);
  }

  // CHANNEL 4: TUBECAST (NEON AUDIO VISUALIZER & LOCAL VIDEO)
  private drawTubeCastVisualizer(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    // Cyberpunk Dark Gradient
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(0.5, '#1e1b4b');
    grad.addColorStop(1, '#020617');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Retro Neon Cassette Tape in Center
    const cx = w / 2;
    const cy = h * 0.42;

    // Cassette Body
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(cx - 160, cy - 90, 320, 180, 14);
    ctx.fill();
    ctx.stroke();

    // Cassette Label
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.roundRect(cx - 130, cy - 70, 260, 80, 6);
    ctx.fill();

    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('SIDE A · LOST WORLD CHILLWAVE', cx - 110, cy - 42);
    ctx.font = '12px monospace';
    ctx.fillText('STEREO DOLBY SURROUND · TUBECAST', cx - 110, cy - 16);

    // Spinning Tape Spools
    const spoolAngle = this.animClock * 3.5;
    [-65, 65].forEach((offset) => {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx + offset, cy + 32, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx + offset, cy + 32, 14, 0, Math.PI * 2);
      ctx.stroke();

      // Spokes
      for (let s = 0; s < 3; s++) {
        const a = spoolAngle + (s * Math.PI * 2) / 3;
        ctx.beginPath();
        ctx.moveTo(cx + offset, cy + 32);
        ctx.lineTo(cx + offset + Math.cos(a) * 22, cy + 32 + Math.sin(a) * 22);
        ctx.stroke();
      }
    });

    // 24-Bar Spectrum Equalizer at Bottom
    const barCount = 28;
    const barW = (w - 120) / barCount - 6;
    for (let i = 0; i < barCount; i++) {
      const freq = Math.sin(this.animClock * 5 + i * 0.4) * 0.5 + 0.5;
      const barH = 20 + freq * 95;
      const bx = 60 + i * (barW + 6);
      const by = h - 140 - barH;

      const barGrad = ctx.createLinearGradient(0, by, 0, by + barH);
      barGrad.addColorStop(0, '#38bdf8');
      barGrad.addColorStop(0.5, '#6366f1');
      barGrad.addColorStop(1, '#ec4899');
      ctx.fillStyle = barGrad;
      ctx.beginPath();
      ctx.roundRect(bx, by, barW, barH, 4);
      ctx.fill();
    }

    // Now Playing Tracker
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('NOW PLAYING: SURVIVAL BEATS · 100% NATIVE AUDIO', 50, 65);
  }

  // SAMSUNG TIZEN SMART HUB OVERLAY (STATUS BAR & DOCK)
  private drawSamsungSmartHubOverlay(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    telemetry: SmartTvTelemetry,
  ): void {
    // Sleek Samsung Top Status Bar
    ctx.fillStyle = 'rgba(2, 6, 23, 0.7)';
    ctx.fillRect(0, 0, w, 44);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('SAMSUNG Smart Hub', 32, 28);

    // Live Satellite signal icon
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(w - 220, 24, 4, 10);
    ctx.fillRect(w - 212, 20, 4, 14);
    ctx.fillRect(w - 204, 16, 4, 18);
    ctx.fillRect(w - 196, 12, 4, 22);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px monospace';
    const timeHr = Math.floor(telemetry.timeOfDay * 24);
    const timeMin = Math.floor((telemetry.timeOfDay * 24 - timeHr) * 60);
    ctx.fillText(
      `${timeHr.toString().padStart(2, '0')}:${timeMin
        .toString()
        .padStart(2, '0')} · DAY ${telemetry.dayCount}`,
      w - 180,
      28,
    );

    // Active Channel Pill
    const curMeta = TV_CHANNELS.find((x) => x.id === this.currentChannel);
    if (curMeta) {
      ctx.fillStyle = curMeta.color;
      ctx.beginPath();
      ctx.roundRect(w / 2 - 80, 8, 160, 28, 14);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`CH ${curMeta.id} · ${curMeta.badge}`, w / 2, 26);
      ctx.textAlign = 'left';
    }
  }

  // PROCEDURAL WEB AUDIO SYNTH MUSIC
  private updateProceduralAudio(): void {
    if (!this.audioCtx || !this.power || this.isMuted) return;
    const now = this.audioCtx.currentTime;
    if (now - this.lastAudioNoteTime < 0.28) return;
    this.lastAudioNoteTime = now;
    this.audioStep = (this.audioStep + 1) % 16;

    switch (this.currentChannel) {
      case 1: {
        // News Anchor Arpeggio
        const scale = [220, 277.18, 329.63, 440, 554.37];
        const freq = scale[this.audioStep % scale.length];
        this.playTone(freq, 'triangle', 0.18, 0.08);
        break;
      }
      case 2: {
        // Playful Cartoon Xylophone Boings
        const cartoonScale = [329.63, 392.0, 440.0, 493.88, 587.33, 659.25];
        const freq = cartoonScale[(this.audioStep * 2) % cartoonScale.length];
        this.playTone(freq, 'sine', 0.14, 0.12);
        break;
      }
      case 3: {
        // Deep Sci-Fi Synth Bass & Lead
        const bassFreq = this.audioStep % 4 === 0 ? 110 : 130.81;
        this.playTone(bassFreq, 'sawtooth', 0.26, 0.09);
        if (this.audioStep % 2 === 0) {
          this.playTone(440 + (this.audioStep % 8) * 44, 'square', 0.12, 0.05);
        }
        break;
      }
      case 4: {
        // Lo-Fi Chillwave Chords
        const lofiScale = [174.61, 220.0, 261.63, 329.63];
        const freq = lofiScale[this.audioStep % lofiScale.length];
        this.playTone(freq, 'sine', 0.35, 0.11);
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
    if (this.videoTexture) {
      this.videoTexture.dispose();
      this.videoTexture = null;
    }
    this.canvasTexture.dispose();
    if (this.tvGlowLight && this.tvGlowLight.parent) {
      this.tvGlowLight.parent.remove(this.tvGlowLight);
      this.tvGlowLight.dispose();
    }
  }
}
