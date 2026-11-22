import * as THREE from 'three';
import {
  WATERPARK_DECK_Y,
  WATERPARK_DUMP_BUCKET,
  WATERPARK_FEATURES,
  WATERPARK_LAZY_RIVER,
  WATERPARK_NAME,
  WATERPARK_POOLS,
  WATERPARK_SITE,
  WATERPARK_SLIDES,
  DEFAULT_WATERPARK_STATE,
  sanitizeWaterparkState,
  type WaterparkSavedState,
  type WaterparkSlideKind,
} from '../world/waterparkLayout';
import {
  buildWaterparkModel,
  getWaterparkSlideEyeHeight,
  sampleWaterparkPath,
  type WaterparkModelHandles,
  type WaterparkSlideHandles,
} from '../world/waterparkModels';
import { stepWaterparkSpeed } from './waterparkPhysics';

export type WaterparkInteractionKind = 'slide' | 'lazy' | 'wave' | 'bucket';

export interface WaterparkInteraction {
  rideId: string;
  label: string;
  sublabel: string;
  kind: WaterparkInteractionKind;
  x: number;
  y: number;
  z: number;
  distance: number;
}

export interface WaterparkRideTransform {
  position: THREE.Vector3;
  lookAt: THREE.Vector3;
  up: THREE.Vector3;
  speedKmh: number;
  heightM: number;
  progressPercent: number;
  verticalG: number;
  lateralG: number;
  segmentLabel: string;
}

export interface WaterparkHudState {
  rideId: string;
  name: string;
  kind: WaterparkInteractionKind;
  speedKmh: number;
  heightM: number;
  progressPercent: number;
  verticalG: number;
  lateralG: number;
  segmentLabel: string;
  elapsedSeconds: number;
}

export type WaterparkEvent =
  | {
      type: 'ride_complete';
      rideId: string;
      name: string;
      timeSeconds: number;
      speedKmh: number;
      newBest: boolean;
    }
  | {
      type: 'soaked';
      source: 'bucket';
      amount: number;
    };

interface SlideRide {
  kind: 'slide';
  slide: WaterparkSlideHandles;
  distance: number;
  speed: number;
  elapsed: number;
  sprayTimer: number;
}

interface LazyRide {
  kind: 'lazy';
  distance: number;
  speed: number;
  elapsed: number;
}

interface WaveRide {
  kind: 'wave';
  angle: number;
  elapsed: number;
}

interface BucketRide {
  kind: 'bucket';
  elapsed: number;
  tipped: boolean;
}

type ActiveRide = SlideRide | LazyRide | WaveRide | BucketRide;

interface ExitPoint {
  x: number;
  y: number;
  z: number;
  yaw: number;
}

interface Kiosk {
  rideId: string;
  slide: WaterparkSlideHandles;
  x: number;
  z: number;
}

const MAX_PARTICLES = 520;
const SITE = new THREE.Vector3(WATERPARK_SITE.x, WATERPARK_DECK_Y, WATERPARK_SITE.z);

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function slideKindLabel(kind: WaterparkSlideKind): string {
  switch (kind) {
    case 'body':
      return 'Body slide';
    case 'tube':
      return 'Enclosed tube';
    case 'raft':
      return 'Family raft';
    case 'mat':
      return 'Mat racer';
    case 'bowl':
      return 'Bowl slide';
    case 'halfpipe':
      return 'Halfpipe';
    case 'watercoaster':
      return 'Water coaster';
    case 'drop':
      return 'Capsule drop';
    case 'log':
      return 'Log flume';
    case 'kids':
      return 'Kids slide';
    default:
      return 'Water slide';
  }
}

/**
 * The complete Hilltop Waterpark runtime. Geometry is built once; this class
 * owns guest interactions, ride cameras, gravity/water physics, splashes and
 * persistent ride records.
 */
export class WaterparkRuntime {
  private readonly scene: THREE.Scene;
  private readonly handles: WaterparkModelHandles;
  private readonly root: THREE.Group;
  private readonly kiosks: Kiosk[] = [];
  private readonly events: WaterparkEvent[] = [];
  private readonly partPositions = new Float32Array(MAX_PARTICLES * 3);
  private readonly partVelocity = new Float32Array(MAX_PARTICLES * 3);
  private readonly partLife = new Float32Array(MAX_PARTICLES);
  private readonly particlePoints: THREE.Points;
  private readonly particleGeometry: THREE.BufferGeometry;
  private readonly particleMaterial: THREE.PointsMaterial;
  private readonly scratchPoint = new THREE.Vector3();
  private readonly scratchTangent = new THREE.Vector3();
  private readonly scratchRight = new THREE.Vector3();
  private readonly scratchUp = new THREE.Vector3();
  private readonly ridePosition = new THREE.Vector3();
  private readonly rideLookAt = new THREE.Vector3();
  private readonly rideUp = new THREE.Vector3();

  private active: ActiveRide | null = null;
  private visible = true;
  private disposed = false;
  private elapsed = 0;
  private waveTimer = 0;
  private bucketPhase = 0;
  private bucketDumpAge = 999;
  private particleCursor = 0;
  private lastExit: ExitPoint = {
    x: WATERPARK_SITE.x + 38,
    y: WATERPARK_DECK_Y,
    z: WATERPARK_SITE.z - 38,
    yaw: 0,
  };
  private stats: WaterparkSavedState = {
    ...DEFAULT_WATERPARK_STATE,
    bestTimes: {},
  };
  private lastRideSeconds = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.handles = buildWaterparkModel();
    this.root = this.handles.root;
    this.root.name = 'hilltop-waterpark-runtime';
    this.scene.add(this.root);

    for (const slide of this.handles.slides) {
      this.kiosks.push({
        rideId: slide.spec.id,
        slide,
        x: slide.boarding.x,
        z: slide.boarding.z,
      });
    }

    this.particleGeometry = new THREE.BufferGeometry();
    this.particleGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.partPositions, 3),
    );
    this.particleMaterial = new THREE.PointsMaterial({
      color: 0xbdefff,
      size: 0.18,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.particlePoints = new THREE.Points(
      this.particleGeometry,
      this.particleMaterial,
    );
    this.particlePoints.frustumCulled = false;
    this.root.add(this.particlePoints);
    this.hideAllParticles();
  }

  public get isActive(): boolean {
    return this.active !== null;
  }

  public get activeRideId(): string | null {
    return this.active ? this.getActiveId() : null;
  }

  public getStats(): WaterparkSavedState {
    return {
      ...this.stats,
      bestTimes: { ...this.stats.bestTimes },
    };
  }

  public serialize(): WaterparkSavedState {
    return this.getStats();
  }

  public restore(saved: WaterparkSavedState | undefined): void {
    this.stats = sanitizeWaterparkState(saved);
  }

  public resetProgress(): void {
    this.stats = { ...DEFAULT_WATERPARK_STATE, bestTimes: {} };
    this.active = null;
    this.lastRideSeconds = 0;
  }

  public setVisible(visible: boolean): void {
    this.visible = visible;
    this.root.visible = visible;
  }

  public getNearbyInteraction(
    playerX: number,
    playerY: number,
    playerZ: number,
  ): WaterparkInteraction | null {
    if (!this.visible || this.active) return null;
    if (Math.abs(playerY - WATERPARK_DECK_Y) > 4.2) return null;
    let best: WaterparkInteraction | null = null;
    const consider = (candidate: WaterparkInteraction) => {
      if (candidate.distance > 3.9) return;
      if (!best || candidate.distance < best.distance) best = candidate;
    };

    for (const kiosk of this.kiosks) {
      const x = WATERPARK_SITE.x + kiosk.x;
      const z = WATERPARK_SITE.z + kiosk.z;
      const distance = Math.hypot(playerX - x, playerZ - z);
      if (distance > 3.9) continue;
      consider({
        rideId: kiosk.rideId,
        label: `Ride ${kiosk.slide.spec.name}`,
        sublabel: `${slideKindLabel(kiosk.slide.spec.kind)} · ${kiosk.slide.spec.topHeight.toFixed(0)} m tower · press E to board`,
        kind: 'slide',
        x,
        y: WATERPARK_DECK_Y,
        z,
        distance,
      });
    }

    for (const feature of WATERPARK_FEATURES) {
      const x = WATERPARK_SITE.x + feature.x;
      const z = WATERPARK_SITE.z + feature.z;
      const distance = Math.hypot(playerX - x, playerZ - z);
      if (distance > 4.4) continue;
      if (feature.kind === 'lazy') {
        consider({
          rideId: 'lazy_river',
          label: `Float the ${WATERPARK_LAZY_RIVER.name}`,
          sublabel: '1.35 m/s lazy current · press E to float, E again to step out',
          kind: 'lazy',
          x,
          y: WATERPARK_DECK_Y,
          z,
          distance,
        });
      } else if (feature.kind === 'wave') {
        consider({
          rideId: 'wave_pool',
          label: 'Enter the Hurricane Bay Wave Pool',
          sublabel: 'Bob in the swell · press E to step out',
          kind: 'wave',
          x,
          y: WATERPARK_DECK_Y,
          z,
          distance,
        });
      } else if (feature.kind === 'bucket') {
        consider({
          rideId: 'dump_bucket',
          label: 'Stand Under the 1,500-Gallon Dump Bucket',
          sublabel: 'The Delta Dump Bucket cycles every 12 seconds · press E to wait in the soak zone',
          kind: 'bucket',
          x,
          y: WATERPARK_DECK_Y,
          z,
          distance,
        });
      }
    }
    return best;
  }

  public startRide(rideId: string): boolean {
    if (this.active) return false;
    const slide = this.handles.slides.find((entry) => entry.spec.id === rideId);
    if (slide) {
      this.lastExit = {
        x: WATERPARK_SITE.x + slide.spec.exit.x,
        y: WATERPARK_DECK_Y,
        z: WATERPARK_SITE.z + slide.spec.exit.z,
        yaw: 0,
      };
      this.active = {
        kind: 'slide',
        slide,
        distance: 0,
        speed: 2.4,
        elapsed: 0,
        sprayTimer: 0,
      };
      this.stats.visits += 1;
      this.stats.lastRideId = rideId;
      this.lastRideSeconds = 0;
      return true;
    }
    if (rideId === 'lazy_river') {
      const feature = WATERPARK_FEATURES.find((entry) => entry.kind === 'lazy');
      this.lastExit = {
        x: WATERPARK_SITE.x + (feature?.x ?? 0),
        y: WATERPARK_DECK_Y,
        z: WATERPARK_SITE.z + (feature?.z ?? -40),
        yaw: Math.PI,
      };
      this.active = {
        kind: 'lazy',
        distance: 0,
        speed: WATERPARK_LAZY_RIVER.speed,
        elapsed: 0,
      };
      this.stats.visits += 1;
      this.stats.lastRideId = rideId;
      return true;
    }
    if (rideId === 'wave_pool') {
      const feature = WATERPARK_FEATURES.find((entry) => entry.kind === 'wave');
      this.lastExit = {
        x: WATERPARK_SITE.x + (feature?.x ?? -2),
        y: WATERPARK_DECK_Y,
        z: WATERPARK_SITE.z + (feature?.z ?? 14),
        yaw: Math.PI,
      };
      this.active = { kind: 'wave', angle: 0, elapsed: 0 };
      this.stats.visits += 1;
      this.stats.lastRideId = rideId;
      return true;
    }
    if (rideId === 'dump_bucket') {
      const feature = WATERPARK_FEATURES.find((entry) => entry.kind === 'bucket');
      this.lastExit = {
        x: WATERPARK_SITE.x + (feature?.x ?? WATERPARK_DUMP_BUCKET.x),
        y: WATERPARK_DECK_Y,
        z: WATERPARK_SITE.z + (feature?.z ?? WATERPARK_DUMP_BUCKET.z + 2),
        yaw: Math.PI,
      };
      this.active = { kind: 'bucket', elapsed: 0, tipped: false };
      this.stats.visits += 1;
      this.stats.lastRideId = rideId;
      return true;
    }
    return false;
  }

  public exitRide(): ExitPoint {
    if (this.active?.kind === 'lazy' || this.active?.kind === 'wave') {
      const transform = this.getRideTransform();
      if (transform) {
        this.lastExit = {
          x: transform.position.x,
          y: WATERPARK_DECK_Y,
          z: transform.position.z,
          yaw: 0,
        };
      }
    }
    this.active = null;
    return { ...this.lastExit };
  }

  public getRideTransform(): WaterparkRideTransform | null {
    if (!this.active) return null;
    if (this.active.kind === 'slide') {
      return this.buildSlideTransform(this.active);
    }
    if (this.active.kind === 'lazy') {
      return this.buildLazyTransform(this.active);
    }
    if (this.active.kind === 'wave') {
      return this.buildWaveTransform(this.active);
    }
    return this.buildBucketTransform(this.active);
  }

  public getHudState(): WaterparkHudState | null {
    const transform = this.getRideTransform();
    if (!transform || !this.active) return null;
    return {
      rideId: this.getActiveId(),
      name: this.getActiveName(),
      kind:
        this.active.kind === 'slide'
          ? 'slide'
          : this.active.kind === 'lazy'
            ? 'lazy'
            : this.active.kind === 'wave'
              ? 'wave'
              : 'bucket',
      speedKmh: transform.speedKmh,
      heightM: transform.heightM,
      progressPercent: transform.progressPercent,
      verticalG: transform.verticalG,
      lateralG: transform.lateralG,
      segmentLabel: transform.segmentLabel,
      elapsedSeconds:
        this.active.kind === 'slide' ||
        this.active.kind === 'lazy' ||
        this.active.kind === 'wave' ||
        this.active.kind === 'bucket'
          ? this.active.elapsed
          : this.lastRideSeconds,
    };
  }

  public consumeEvents(): WaterparkEvent[] {
    if (this.events.length === 0) return [];
    return this.events.splice(0, this.events.length);
  }

  public update(dt: number, playerX?: number, playerY?: number, playerZ?: number): void {
    if (this.disposed) return;
    const frameTime = Number.isFinite(dt) ? clamp(dt, 0, 0.25) : 0;
    if (frameTime <= 0) return;
    this.elapsed += frameTime;
    this.animateWavePool(frameTime);
    this.updateInnerTubes();
    this.updateBucket(frameTime, playerX, playerY, playerZ);
    this.updateParticles(frameTime);

    if (!this.active) return;
    if (this.active.kind === 'slide') {
      this.updateSlideRide(this.active, frameTime);
    } else if (this.active.kind === 'lazy') {
      this.active.distance = (this.active.distance + this.active.speed * frameTime) % Math.max(1, this.handles.lazyLength);
      this.active.elapsed += frameTime;
    } else if (this.active.kind === 'wave') {
      this.active.angle += frameTime * 0.72;
      this.active.elapsed += frameTime;
    } else {
      this.active.elapsed += frameTime;
      if (!this.active.tipped && this.active.elapsed >= 2.25) {
        this.active.tipped = true;
        this.triggerBucketDump(true);
      }
      if (this.active.elapsed >= 5.2) {
        this.active = null;
      }
    }
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.scene.remove(this.root);
    this.handles.dispose();
    this.particleGeometry.dispose();
    this.particleMaterial.dispose();
  }

  private getActiveId(): string {
    if (!this.active) return '';
    if (this.active.kind === 'slide') return this.active.slide.spec.id;
    if (this.active.kind === 'lazy') return 'lazy_river';
    if (this.active.kind === 'wave') return 'wave_pool';
    return 'dump_bucket';
  }

  private getActiveName(): string {
    if (!this.active) return WATERPARK_NAME;
    if (this.active.kind === 'slide') return this.active.slide.spec.name;
    if (this.active.kind === 'lazy') return WATERPARK_LAZY_RIVER.name;
    if (this.active.kind === 'wave') return 'Hurricane Bay Wave Pool';
    return WATERPARK_DUMP_BUCKET.name;
  }

  private updateSlideRide(ride: SlideRide, dt: number): void {
    const sample = sampleWaterparkPath(
      ride.slide.samples,
      ride.distance,
      this.scratchPoint,
      this.scratchTangent,
      this.scratchRight,
      this.scratchUp,
    );
    const boost =
      ride.slide.spec.kind === 'watercoaster' || ride.slide.spec.kind === 'log'
        ? 1
        : 0;
    ride.speed = stepWaterparkSpeed(
      ride.speed,
      this.scratchTangent.y,
      dt,
      ride.slide.spec.kind,
      boost,
    );
    ride.elapsed += dt;
    ride.distance += ride.speed * dt;
    this.lastRideSeconds = ride.elapsed;

    if (ride.speed > 11) {
      ride.sprayTimer += dt;
      if (ride.sprayTimer > 0.08) {
        ride.sprayTimer = 0;
        this.spawnParticle(
          this.scratchPoint.x,
          this.scratchPoint.y + 0.25,
          this.scratchPoint.z,
          1,
        );
      }
    }

    if (ride.distance >= ride.slide.length - 0.15) {
      const exit = ride.slide.spec.exit;
      this.lastExit = {
        x: WATERPARK_SITE.x + exit.x,
        y: WATERPARK_DECK_Y,
        z: WATERPARK_SITE.z + exit.z,
        yaw: 0,
      };
      this.finishSlideRide(ride);
    }
  }

  private finishSlideRide(ride: SlideRide): void {
    const best = this.stats.bestTimes[ride.slide.spec.id] ?? Infinity;
    const timeSeconds = Math.max(0.1, ride.elapsed);
    const newBest = timeSeconds < best;
    if (newBest) this.stats.bestTimes[ride.slide.spec.id] = timeSeconds;
    this.stats.ridesCompleted += 1;
    this.stats.lastRideId = ride.slide.spec.id;
    const exitLocal = ride.slide.spec.exit;
    this.spawnSplash(exitLocal.x, 0.25, exitLocal.z, 70);
    this.events.push({
      type: 'ride_complete',
      rideId: ride.slide.spec.id,
      name: ride.slide.spec.name,
      timeSeconds,
      speedKmh: ride.speed * 3.6,
      newBest,
    });
    this.active = null;
  }

  private buildSlideTransform(ride: SlideRide): WaterparkRideTransform {
    const sample = sampleWaterparkPath(
      ride.slide.samples,
      ride.distance,
      this.scratchPoint,
      this.scratchTangent,
      this.scratchRight,
      this.scratchUp,
    );
    const speedScale = Math.max(0.35, Math.min(2.6, ride.speed / 12));
    const eye = getWaterparkSlideEyeHeight(ride.slide.spec.kind);
    const bank = THREE.MathUtils.clamp(sample.roll * speedScale, -0.85, 0.85);
    this.rideUp.copy(this.scratchUp).applyAxisAngle(this.scratchTangent, bank);
    const shake = Math.min(0.045, ride.speed * 0.0022);
    const shakeX = Math.sin(this.elapsed * 18.3) * shake;
    const shakeY = Math.cos(this.elapsed * 15.7) * shake;
    this.ridePosition
      .copy(this.scratchPoint)
      .addScaledVector(this.scratchUp, eye)
      .addScaledVector(this.scratchRight, shakeX)
      .addScaledVector(this.scratchUp, shakeY)
      .add(SITE);
    const lookDistance = 2.6 + Math.min(5.5, ride.speed * 0.15);
    this.rideLookAt
      .copy(this.scratchPoint)
      .addScaledVector(this.scratchTangent, lookDistance)
      .addScaledVector(this.scratchUp, eye + 0.35)
      .add(SITE);
    const progress = clamp(ride.distance / Math.max(0.1, ride.slide.length), 0, 1);
    return {
      position: this.ridePosition,
      lookAt: this.rideLookAt,
      up: this.rideUp,
      speedKmh: ride.speed * 3.6,
      heightM: Math.max(0, this.ridePosition.y - WATERPARK_SITE.y),
      progressPercent: progress * 100,
      verticalG: 1 + (sample.verticalG - 1) * speedScale * speedScale,
      lateralG: sample.lateralG * speedScale * speedScale,
      segmentLabel: this.segmentLabelFor(ride, progress),
    };
  }

  private segmentLabelFor(ride: SlideRide, progress: number): string {
    if (progress < 0.035) return 'Load Platform';
    if (progress > 0.93) return 'Splashdown';
    if (
      (ride.slide.spec.kind === 'watercoaster' || ride.slide.spec.kind === 'log') &&
      this.scratchTangent.y > -0.05
    ) {
      return 'Uphill Water Jets';
    }
    if (this.scratchTangent.y < -0.76) return 'Freefall';
    if (ride.slide.spec.style === 'bowl' && progress > 0.3) return 'Bowl Spiral';
    if (ride.slide.spec.style === 'spiral') return 'Enclosed Helix';
    if (ride.slide.spec.kind === 'log') return 'Timber Train Flume';
    return 'Water Channel';
  }

  private buildLazyTransform(ride: LazyRide): WaterparkRideTransform {
    const sample = sampleWaterparkPath(
      this.handles.lazySamples,
      ride.distance,
      this.scratchPoint,
      this.scratchTangent,
      this.scratchRight,
      this.scratchUp,
    );
    const bob = Math.sin(this.elapsed * 1.7) * 0.035;
    this.ridePosition
      .copy(this.scratchPoint)
      .add(new THREE.Vector3(0, 0.48 + bob, 0))
      .add(SITE);
    this.rideLookAt
      .copy(this.scratchPoint)
      .addScaledVector(this.scratchTangent, 3.4)
      .add(new THREE.Vector3(0, 0.4 + bob, 0))
      .add(SITE);
    this.rideUp.set(0, 1, 0);
    const progress =
      (ride.distance / Math.max(0.1, this.handles.lazyLength)) * 100;
    return {
      position: this.ridePosition,
      lookAt: this.rideLookAt,
      up: this.rideUp,
      speedKmh: ride.speed * 3.6,
      heightM: 0.4,
      progressPercent: progress,
      verticalG: 1,
      lateralG: 0,
      segmentLabel: 'Bayou Slow Current',
    };
  }

  private buildWaveTransform(ride: WaveRide): WaterparkRideTransform {
    const pool = WATERPARK_POOLS.find((entry) => entry.id === 'wave') ?? WATERPARK_POOLS[0];
    const x = pool.x + Math.cos(ride.angle) * 5.2;
    const z = pool.z + Math.sin(ride.angle) * 3.8;
    const bob = Math.sin(this.elapsed * 2.1) * 0.16 + Math.sin(this.elapsed * 0.8) * 0.08;
    this.ridePosition.set(
      WATERPARK_SITE.x + x,
      WATERPARK_DECK_Y + 0.72 + bob,
      WATERPARK_SITE.z + z,
    );
    this.rideLookAt.set(
      WATERPARK_SITE.x + x - Math.sin(ride.angle) * 3,
      WATERPARK_DECK_Y + 0.72 + bob,
      WATERPARK_SITE.z + z + Math.cos(ride.angle) * 3,
    );
    this.rideUp.set(0, 1, 0);
    return {
      position: this.ridePosition,
      lookAt: this.rideLookAt,
      up: this.rideUp,
      speedKmh: 10,
      heightM: 0.7,
      progressPercent: ((ride.angle / (Math.PI * 2)) * 100) % 100,
      verticalG: 1,
      lateralG: 0,
      segmentLabel: 'Hurricane Bay Swell',
    };
  }

  private buildBucketTransform(ride: BucketRide): WaterparkRideTransform {
    const entry = WATERPARK_FEATURES.find((feature) => feature.kind === 'bucket');
    const x = WATERPARK_SITE.x + (entry?.x ?? WATERPARK_DUMP_BUCKET.x);
    const z = WATERPARK_SITE.z + (entry?.z ?? WATERPARK_DUMP_BUCKET.z + 6);
    this.ridePosition.set(x, WATERPARK_DECK_Y + 0.9, z);
    this.rideLookAt.set(
      WATERPARK_SITE.x + WATERPARK_DUMP_BUCKET.x,
      WATERPARK_DECK_Y + WATERPARK_DUMP_BUCKET.top + 3,
      WATERPARK_SITE.z + WATERPARK_DUMP_BUCKET.z,
    );
    this.rideUp.set(0, 1, 0);
    return {
      position: this.ridePosition,
      lookAt: this.rideLookAt,
      up: this.rideUp,
      speedKmh: 0,
      heightM: 1,
      progressPercent: clamp(ride.elapsed / 5.2, 0, 1) * 100,
      verticalG: 1,
      lateralG: 0,
      segmentLabel: ride.elapsed < 2.25 ? 'Splash Zone — Hold On' : '1,500 Gallons Incoming',
    };
  }

  private animateWavePool(dt: number): void {
    this.waveTimer += dt;
    if (this.waveTimer < 0.045) return;
    this.waveTimer = 0;
    const geo = this.handles.waveGeometry;
    const base = this.handles.waveBasePositions;
    if (!geo || !base) return;
    const attr = geo.getAttribute('position') as THREE.BufferAttribute;
    const array = attr.array as Float32Array;
    for (let i = 0; i < attr.count; i++) {
      const bx = base[i * 3];
      const bz = base[i * 3 + 2];
      array[i * 3 + 1] =
        base[i * 3 + 1] +
        Math.sin(bx * 0.46 + this.elapsed * 2.0) * 0.22 +
        Math.cos(bz * 0.55 + this.elapsed * 1.35) * 0.15 +
        Math.sin((bx + bz) * 0.23 + this.elapsed * 1.1) * 0.08;
    }
    attr.needsUpdate = true;
    geo.computeVertexNormals();
  }

  private updateInnerTubes(): void {
    for (const tube of this.handles.innerTubes) {
      const distance = (tube.offset + this.elapsed * WATERPARK_LAZY_RIVER.speed) % Math.max(1, this.handles.lazyLength);
      sampleWaterparkPath(
        this.handles.lazySamples,
        distance,
        this.scratchPoint,
        this.scratchTangent,
        this.scratchRight,
        this.scratchUp,
      );
      tube.mesh.position.copy(this.scratchPoint);
      tube.mesh.position.y += 0.13;
      tube.mesh.rotation.y = Math.atan2(this.scratchTangent.x, this.scratchTangent.z);
      tube.mesh.rotation.z = Math.sin(this.elapsed * 1.4 + tube.offset) * 0.04;
    }
  }

  private updateBucket(
    dt: number,
    playerX?: number,
    playerY?: number,
    playerZ?: number,
  ): void {
    if (!this.handles.bucketPivot) return;
    const cycle = WATERPARK_DUMP_BUCKET.cycleSeconds;
    const phase = this.elapsed % cycle;
    const previousPhase = this.bucketPhase;
    this.bucketPhase = phase;
    if (phase >= WATERPARK_DUMP_BUCKET.tipAt && previousPhase < WATERPARK_DUMP_BUCKET.tipAt) {
      const near =
        typeof playerX === 'number' && typeof playerZ === 'number'
          ? Math.hypot(
              playerX - (WATERPARK_SITE.x + WATERPARK_DUMP_BUCKET.x),
              playerZ - (WATERPARK_SITE.z + WATERPARK_DUMP_BUCKET.z),
            ) <= WATERPARK_DUMP_BUCKET.soakRadius &&
            Math.abs((playerY ?? WATERPARK_DECK_Y) - WATERPARK_DECK_Y) < 4
          : false;
      this.triggerBucketDump(near);
    }

    let tip = 0;
    if (phase > WATERPARK_DUMP_BUCKET.tipAt - 0.1 && phase < WATERPARK_DUMP_BUCKET.tipAt + 1.25) {
      tip = smoothstep(
        WATERPARK_DUMP_BUCKET.tipAt - 0.1,
        WATERPARK_DUMP_BUCKET.tipAt + 0.8,
        phase,
      );
    } else if (phase >= WATERPARK_DUMP_BUCKET.tipAt + 1.25 && phase < cycle - 0.7) {
      tip = 1 - smoothstep(
        WATERPARK_DUMP_BUCKET.tipAt + 1.25,
        cycle - 0.7,
        phase,
      );
    }
    const manualTip =
      this.active?.kind === 'bucket' ? 1 - smoothstep(2.25, 3.3, this.active.elapsed) : 0;
    const angle = Math.max(tip, manualTip) * 1.85;
    this.handles.bucketPivot.rotation.z = -angle;

    const fill = clamp(
      phase < WATERPARK_DUMP_BUCKET.tipAt
        ? phase / (WATERPARK_DUMP_BUCKET.tipAt - 0.4)
        : 0.1,
      0,
      1,
    );
    if (this.handles.bucketWater) {
      this.handles.bucketWater.scale.setScalar(0.35 + fill * 0.65);
      this.handles.bucketWater.visible = angle < 0.8;
    }
    this.bucketDumpAge += dt;
    const dumping = angle > 0.55 && this.bucketDumpAge < 1.6;
    if (this.handles.bucketStream) {
      this.handles.bucketStream.visible = dumping;
      if (dumping) {
        this.handles.bucketStream.scale.y = clamp(
          1.1 - this.bucketDumpAge * 0.3,
          0.65,
          1.15,
        );
      }
    }
    if (this.handles.bucketSplash) {
      this.handles.bucketSplash.visible = dumping;
      if (dumping) {
        const pulse = 1 + this.bucketDumpAge * 1.6;
        this.handles.bucketSplash.scale.setScalar(pulse);
      }
    }
  }

  private triggerBucketDump(soakPlayer: boolean): void {
    this.bucketDumpAge = 0;
    this.spawnSplash(
      WATERPARK_DUMP_BUCKET.x,
      0.4,
      WATERPARK_DUMP_BUCKET.z,
      210,
    );
    if (this.handles.bucketStream) this.handles.bucketStream.visible = true;
    if (this.handles.bucketSplash) this.handles.bucketSplash.visible = true;
    if (soakPlayer) {
      this.stats.soaks += 1;
      this.events.push({ type: 'soaked', source: 'bucket', amount: 1 });
    }
  }

  private spawnParticle(x: number, y: number, z: number, spread = 2): void {
    const idx = this.particleCursor;
    this.particleCursor = (this.particleCursor + 1) % MAX_PARTICLES;
    this.partPositions[idx * 3] = x;
    this.partPositions[idx * 3 + 1] = y;
    this.partPositions[idx * 3 + 2] = z;
    this.partVelocity[idx * 3] = (Math.random() - 0.5) * spread;
    this.partVelocity[idx * 3 + 1] = 1.4 + Math.random() * 3.4;
    this.partVelocity[idx * 3 + 2] = (Math.random() - 0.5) * spread;
    this.partLife[idx] = 0.6 + Math.random() * 0.9;
  }

  private spawnSplash(x: number, y: number, z: number, count: number): void {
    for (let i = 0; i < count; i++) {
      this.spawnParticle(x, y, z, 3.8);
    }
  }

  private updateParticles(dt: number): void {
    const positions = this.partPositions;
    let anyAlive = false;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (this.partLife[i] <= 0) continue;
      anyAlive = true;
      this.partLife[i] -= dt;
      if (this.partLife[i] <= 0) {
        positions[i * 3 + 1] = -500;
        continue;
      }
      this.partVelocity[i * 3 + 1] -= 11.5 * dt;
      positions[i * 3] += this.partVelocity[i * 3] * dt;
      positions[i * 3 + 1] += this.partVelocity[i * 3 + 1] * dt;
      positions[i * 3 + 2] += this.partVelocity[i * 3 + 2] * dt;
    }
    if (anyAlive) {
      (this.particleGeometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    }
  }

  private hideAllParticles(): void {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.partPositions[i * 3 + 1] = -500;
      this.partLife[i] = 0;
    }
    (this.particleGeometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
  }
}
