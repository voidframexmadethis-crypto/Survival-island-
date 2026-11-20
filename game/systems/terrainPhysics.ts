import * as THREE from 'three';
import {
  FARM_POND_POS,
  LAKE_CENTER,
  OCEAN_LEVEL,
  PLAYER_SPAWN,
  TERRAIN_HALF,
  TERRAIN_STEP,
  TERRAIN_VERTS,
  getBaseTerrainHeight,
  getRiverSample,
  getTerrainHeight,
  isTerrainProtectedAt,
  markTerrainDeformed,
  terrainDeltaGrid,
  terrainLoosenessGrid,
  terrainPuddleGrid,
  terrainScorchGrid,
  terrainWetnessGrid,
} from '../world/terrain';

export interface ActiveWaterDroplet {
  x: number;
  z: number;
  vx: number;
  vz: number;
  water: number;
  sediment: number;
  life: number;
  maxLife: number;
}

export interface ActiveWaterEmitter {
  x: number;
  z: number;
  life: number;
  rateAccumulator: number;
}

export interface AvalancheEvent {
  x: number;
  y: number;
  z: number;
  intensity: number;
}

export interface ErosionStepResult {
  dirtyVertices: boolean;
  avalanches: AvalancheEvent[];
  erodedVolumeDelta: number;
  puddleCount: number;
}

const _dummy = new THREE.Object3D();
const _streamColor = new THREE.Color();

export class VolumetricTerrainEngine {
  private droplets: ActiveWaterDroplet[] = [];
  private emitters: ActiveWaterEmitter[] = [];
  private waterInstancedMesh: THREE.InstancedMesh;
  private puddleInstancedMesh: THREE.InstancedMesh;
  private dirtyRect: { minIx: number; maxIx: number; minIz: number; maxIz: number } | null = null;
  private dirtyHeightChanged = false;
  private looseScanRect: { minIx: number; maxIx: number; minIz: number; maxIz: number } | null = null;
  private hasWetnessOrPuddles = false;
  private hasDeformedOrLooseCells = false;
  private lastDropletVisCount = 0;
  private lastPuddleVisCount = 0;
  private lastPuddleScanX = NaN;
  private lastPuddleScanZ = NaN;
  private puddleScanDirty = false;
  private avalancheCooldown = 0;
  private breachCheckCooldown = 0;
  private puddleUpdateCooldown = 0;
  private coastalErosionCooldown = 0;
  public cratersCarved = 0;
  public totalErodedVolume = 0;
  public activePuddleCount = 0;

  private readonly maxDropletVisuals = 320;
  private readonly maxPuddleVisuals = 240;

  constructor(scene: THREE.Scene) {
    const dropGeo = new THREE.CylinderGeometry(0.45, 0.72, 0.14, 8);
    const dropMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.28,
      roughness: 0.15,
      metalness: 0.15,
      transparent: true,
      opacity: 0.76,
    });
    this.waterInstancedMesh = new THREE.InstancedMesh(
      dropGeo,
      dropMat,
      this.maxDropletVisuals,
    );
    this.waterInstancedMesh.count = 0;
    this.waterInstancedMesh.frustumCulled = false;
    scene.add(this.waterInstancedMesh);

    const puddleGeo = new THREE.CircleGeometry(1.45, 14);
    puddleGeo.rotateX(-Math.PI / 2);
    const puddleMat = new THREE.MeshStandardMaterial({
      color: 0x1d4e6e,
      emissive: 0x0c4a6e,
      emissiveIntensity: 0.16,
      roughness: 0.08,
      metalness: 0.45,
      transparent: true,
      opacity: 0.62,
      depthWrite: false,
    });
    this.puddleInstancedMesh = new THREE.InstancedMesh(
      puddleGeo,
      puddleMat,
      this.maxPuddleVisuals,
    );
    this.puddleInstancedMesh.count = 0;
    this.puddleInstancedMesh.frustumCulled = false;
    scene.add(this.puddleInstancedMesh);
  }

  public clearAll(): void {
    this.droplets = [];
    this.emitters = [];
    this.dirtyRect = null;
    this.dirtyHeightChanged = false;
    this.looseScanRect = null;
    this.hasWetnessOrPuddles = false;
    this.hasDeformedOrLooseCells = false;
    this.lastDropletVisCount = 0;
    this.lastPuddleVisCount = 0;
    this.lastPuddleScanX = NaN;
    this.lastPuddleScanZ = NaN;
    this.puddleScanDirty = false;
    this.cratersCarved = 0;
    this.totalErodedVolume = 0;
    this.activePuddleCount = 0;
    this.waterInstancedMesh.count = 0;
    this.waterInstancedMesh.instanceMatrix.needsUpdate = true;
    this.puddleInstancedMesh.count = 0;
    this.puddleInstancedMesh.instanceMatrix.needsUpdate = true;
  }

  public getActiveStreamCount(): number {
    return this.droplets.length + this.emitters.length * 4;
  }

  private markDirtyArea(cx: number, cz: number, radius: number, heightChanged = true): void {
    const pad = radius + TERRAIN_STEP * 2;
    const minIx = Math.max(0, Math.floor((cx - pad + TERRAIN_HALF) / TERRAIN_STEP));
    const maxIx = Math.min(
      TERRAIN_VERTS - 1,
      Math.ceil((cx + pad + TERRAIN_HALF) / TERRAIN_STEP),
    );
    const minIz = Math.max(0, Math.floor((cz - pad + TERRAIN_HALF) / TERRAIN_STEP));
    const maxIz = Math.min(
      TERRAIN_VERTS - 1,
      Math.ceil((cz + pad + TERRAIN_HALF) / TERRAIN_STEP),
    );
    if (!this.dirtyRect) {
      this.dirtyRect = { minIx, maxIx, minIz, maxIz };
    } else {
      this.dirtyRect.minIx = Math.min(this.dirtyRect.minIx, minIx);
      this.dirtyRect.maxIx = Math.max(this.dirtyRect.maxIx, maxIx);
      this.dirtyRect.minIz = Math.min(this.dirtyRect.minIz, minIz);
      this.dirtyRect.maxIz = Math.max(this.dirtyRect.maxIz, maxIz);
    }
    if (heightChanged) {
      markTerrainDeformed();
      this.dirtyHeightChanged = true;
      this.hasDeformedOrLooseCells = true;
      const lMinIx = Math.max(2, minIx - 2);
      const lMaxIx = Math.min(TERRAIN_VERTS - 3, maxIx + 2);
      const lMinIz = Math.max(2, minIz - 2);
      const lMaxIz = Math.min(TERRAIN_VERTS - 3, maxIz + 2);
      if (!this.looseScanRect) {
        this.looseScanRect = { minIx: lMinIx, maxIx: lMaxIx, minIz: lMinIz, maxIz: lMaxIz };
      } else {
        this.looseScanRect.minIx = Math.min(this.looseScanRect.minIx, lMinIx);
        this.looseScanRect.maxIx = Math.max(this.looseScanRect.maxIx, lMaxIx);
        this.looseScanRect.minIz = Math.min(this.looseScanRect.minIz, lMinIz);
        this.looseScanRect.maxIz = Math.max(this.looseScanRect.maxIz, lMaxIz);
      }
    }
  }

  /**
   * Carves an organic, jagged, asymmetric explosion crater into the earth with radial blast fractures
   * and an upturned ejecta rim (never uniform cubes).
   */
  public carveJaggedCrater(cx: number, cz: number, radius = 6.6, depth = 3.2): void {
    const phaseA = Math.random() * Math.PI * 2;
    const phaseB = Math.random() * Math.PI * 2;
    const phaseC = Math.random() * Math.PI * 2;

    const outerRadius = radius * 1.48;
    const minIx = Math.max(1, Math.floor((cx - outerRadius + TERRAIN_HALF) / TERRAIN_STEP));
    const maxIx = Math.min(
      TERRAIN_VERTS - 2,
      Math.ceil((cx + outerRadius + TERRAIN_HALF) / TERRAIN_STEP),
    );
    const minIz = Math.max(1, Math.floor((cz - outerRadius + TERRAIN_HALF) / TERRAIN_STEP));
    const maxIz = Math.min(
      TERRAIN_VERTS - 2,
      Math.ceil((cz + outerRadius + TERRAIN_HALF) / TERRAIN_STEP),
    );

    for (let iz = minIz; iz <= maxIz; iz++) {
      const vz = -TERRAIN_HALF + iz * TERRAIN_STEP;
      for (let ix = minIx; ix <= maxIx; ix++) {
        const vx = -TERRAIN_HALF + ix * TERRAIN_STEP;
        if (isTerrainProtectedAt(vx, vz)) continue;

        const dx = vx - cx;
        const dz = vz - cz;
        const dist = Math.hypot(dx, dz);
        if (dist > outerRadius) continue;

        const angle = Math.atan2(dz, dx);
        // Multi-harmonic jagged blast rays & fracture asymmetry
        const radialRayNoise =
          0.78 +
          0.22 * Math.sin(angle * 5 + phaseA) +
          0.16 * Math.cos(angle * 9 + phaseB) +
          0.11 * Math.sin(angle * 13 + phaseC);
        const effRadius = radius * Math.max(0.62, Math.min(1.36, radialRayNoise));
        const u = dist / effRadius;

        const idx = iz * TERRAIN_VERTS + ix;
        if (u < 1.0) {
          // Deep jagged fracture pocket
          const strataJitter =
            0.84 +
            0.28 * Math.sin(vx * 0.95 + vz * 0.72 + phaseA) * Math.cos(vz * 1.15 - phaseB);
          const bowl = Math.pow(Math.max(0, 1 - u * u), 1.32);
          const carve = depth * bowl * strataJitter;
          terrainDeltaGrid[idx] = Math.max(-14.0, terrainDeltaGrid[idx] - carve);
          terrainScorchGrid[idx] = Math.min(1, Math.max(terrainScorchGrid[idx], (1 - u * 0.65) * 0.95));
          terrainLoosenessGrid[idx] = Math.min(1, terrainLoosenessGrid[idx] + 0.85 * (1 - u * 0.5));
          this.totalErodedVolume += carve;
        } else if (u < 1.38) {
          // Jagged upturned ejecta rim around the crater edge
          const rimT = (u - 1.0) / 0.38;
          const rimBell = Math.sin(rimT * Math.PI);
          const clodNoise = 0.7 + 0.55 * Math.abs(Math.sin(angle * 7 + phaseB));
          const lift = depth * 0.22 * rimBell * clodNoise;
          terrainDeltaGrid[idx] += lift;
          terrainScorchGrid[idx] = Math.min(1, Math.max(terrainScorchGrid[idx], 0.32 * (1 - rimT)));
          terrainLoosenessGrid[idx] = Math.min(1, terrainLoosenessGrid[idx] + 0.65);
        }
      }
    }

    this.cratersCarved += 1;
    this.markDirtyArea(cx, cz, outerRadius + 4);
  }

  /**
   * Continuous soil excavation / grading brush (for Excavator Shovel & hydraulic digging).
   */
  public excavateSoilBrush(cx: number, cz: number, radius = 3.2, deltaY = -1.15): number {
    const minIx = Math.max(1, Math.floor((cx - radius + TERRAIN_HALF) / TERRAIN_STEP));
    const maxIx = Math.min(
      TERRAIN_VERTS - 2,
      Math.ceil((cx + radius + TERRAIN_HALF) / TERRAIN_STEP),
    );
    const minIz = Math.max(1, Math.floor((cz - radius + TERRAIN_HALF) / TERRAIN_STEP));
    const maxIz = Math.min(
      TERRAIN_VERTS - 2,
      Math.ceil((cz + radius + TERRAIN_HALF) / TERRAIN_STEP),
    );

    let moved = 0;
    for (let iz = minIz; iz <= maxIz; iz++) {
      const vz = -TERRAIN_HALF + iz * TERRAIN_STEP;
      for (let ix = minIx; ix <= maxIx; ix++) {
        const vx = -TERRAIN_HALF + ix * TERRAIN_STEP;
        if (isTerrainProtectedAt(vx, vz)) continue;
        const dist = Math.hypot(vx - cx, vz - cz);
        if (dist > radius) continue;

        const w = Math.cos((dist / radius) * Math.PI * 0.5);
        const weight = w * w;
        const idx = iz * TERRAIN_VERTS + ix;
        const d = deltaY * weight;
        terrainDeltaGrid[idx] = Math.max(-14.0, terrainDeltaGrid[idx] + d);
        terrainLoosenessGrid[idx] = Math.min(1, terrainLoosenessGrid[idx] + 0.55 * weight);
        terrainScorchGrid[idx] = Math.max(0, terrainScorchGrid[idx] - 0.15 * weight);
        moved += Math.abs(d);
      }
    }

    if (moved > 0) {
      this.totalErodedVolume += moved;
      this.markDirtyArea(cx, cz, radius + 3);
    }
    return moved;
  }

  /**
   * Spawns a pressurized hydraulic water torrent that flows downhill via fluid dynamics,
   * carving gullies through soil and depositing silt fans where slopes flatten.
   */
  public spawnWaterTorrent(
    x: number,
    z: number,
    emitterLife = 10.5,
    initialVx = 0,
    initialVz = 0,
  ): void {
    this.emitters.push({
      x,
      z,
      life: emitterLife,
      rateAccumulator: 0.4,
    });
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 0.6 + Math.random() * 1.4;
      this.spawnDroplet(
        x + (Math.random() - 0.5) * 1.2,
        z + (Math.random() - 0.5) * 1.2,
        initialVx + Math.cos(a) * spd,
        initialVz + Math.sin(a) * spd,
        1.15,
      );
    }
  }

  private spawnDroplet(
    x: number,
    z: number,
    vx = 0,
    vz = 0,
    water = 1.0,
    maxLife = 7.5,
  ): void {
    if (this.droplets.length >= 280) {
      this.droplets.shift();
    }
    this.droplets.push({
      x,
      z,
      vx,
      vz,
      water,
      sediment: 0,
      life: maxLife,
      maxLife,
    });
  }

  private sampleHeightAndGradient(x: number, z: number): {
    h: number;
    gx: number;
    gz: number;
  } {
    const eps = 1.1;
    const h = getTerrainHeight(x, z);
    const hx1 = getTerrainHeight(x + eps, z);
    const hx0 = getTerrainHeight(x - eps, z);
    const hz1 = getTerrainHeight(x, z + eps);
    const hz0 = getTerrainHeight(x, z - eps);
    return {
      h,
      gx: (hx1 - hx0) / (2 * eps),
      gz: (hz1 - hz0) / (2 * eps),
    };
  }

  private modifyTerrainSmoothAt(x: number, z: number, delta: number, wetBoost: number): void {
    if (isTerrainProtectedAt(x, z)) return;
    const gx = (x + TERRAIN_HALF) / TERRAIN_STEP;
    const gz = (z + TERRAIN_HALF) / TERRAIN_STEP;
    const ix0 = Math.max(1, Math.min(TERRAIN_VERTS - 3, Math.floor(gx)));
    const iz0 = Math.max(1, Math.min(TERRAIN_VERTS - 3, Math.floor(gz)));
    const fx = Math.max(0, Math.min(1, gx - ix0));
    const fz = Math.max(0, Math.min(1, gz - iz0));

    const w00 = (1 - fx) * (1 - fz);
    const w10 = fx * (1 - fz);
    const w01 = (1 - fx) * fz;
    const w11 = fx * fz;
    const idx00 = iz0 * TERRAIN_VERTS + ix0;
    const idx10 = idx00 + 1;
    const idx01 = idx00 + TERRAIN_VERTS;
    const idx11 = idx01 + 1;

    if (w00 > 0.001) {
      terrainDeltaGrid[idx00] = Math.max(-14.0, terrainDeltaGrid[idx00] + delta * w00);
      terrainWetnessGrid[idx00] = Math.min(1, terrainWetnessGrid[idx00] + wetBoost * w00);
      if (delta < 0) terrainLoosenessGrid[idx00] = Math.min(1, terrainLoosenessGrid[idx00] + 0.14 * w00);
    }
    if (w10 > 0.001) {
      terrainDeltaGrid[idx10] = Math.max(-14.0, terrainDeltaGrid[idx10] + delta * w10);
      terrainWetnessGrid[idx10] = Math.min(1, terrainWetnessGrid[idx10] + wetBoost * w10);
      if (delta < 0) terrainLoosenessGrid[idx10] = Math.min(1, terrainLoosenessGrid[idx10] + 0.14 * w10);
    }
    if (w01 > 0.001) {
      terrainDeltaGrid[idx01] = Math.max(-14.0, terrainDeltaGrid[idx01] + delta * w01);
      terrainWetnessGrid[idx01] = Math.min(1, terrainWetnessGrid[idx01] + wetBoost * w01);
      if (delta < 0) terrainLoosenessGrid[idx01] = Math.min(1, terrainLoosenessGrid[idx01] + 0.14 * w01);
    }
    if (w11 > 0.001) {
      terrainDeltaGrid[idx11] = Math.max(-14.0, terrainDeltaGrid[idx11] + delta * w11);
      terrainWetnessGrid[idx11] = Math.min(1, terrainWetnessGrid[idx11] + wetBoost * w11);
      if (delta < 0) terrainLoosenessGrid[idx11] = Math.min(1, terrainLoosenessGrid[idx11] + 0.14 * w11);
    }
    if (wetBoost > 0) {
      this.hasWetnessOrPuddles = true;
    }
    this.markDirtyArea(x, z, TERRAIN_STEP * 1.6, delta !== 0);
  }

  /**
   * Advances dynamic fluid hydraulic erosion, lake/river breach outflows,
   * and slope-stability avalanches/landslides, then syncs the live Three.js BufferGeometry.
   */
  public step(
    dt: number,
    terrainMesh: THREE.Mesh,
    baseColors: Float32Array,
    isRaining: boolean,
    playerX: number,
    playerZ: number,
    isStorming = false,
  ): ErosionStepResult {
    let dirtyVertices = false;
    let erodedVolumeDelta = 0;
    const avalanches: AvalancheEvent[] = [];

    // 1. Dry/fade wetness slowly when clear (skip completely when nothing is wet)
    if (!isRaining && this.hasWetnessOrPuddles && Math.random() < dt * 1.4) {
      let stillWet = false;
      for (let i = 0; i < terrainWetnessGrid.length; i += 2) {
        if (terrainWetnessGrid[i] > 0.005) {
          const nw = Math.max(0, terrainWetnessGrid[i] - 0.018);
          terrainWetnessGrid[i] = nw;
          if (nw > 0.005) stillWet = true;
        }
        if (terrainPuddleGrid[i] > 0.005) {
          const np = Math.max(0, terrainPuddleGrid[i] - 0.022);
          terrainPuddleGrid[i] = np;
          if (np > 0.005) stillWet = true;
          this.puddleScanDirty = true;
        }
      }
      if (!stillWet) {
        this.hasWetnessOrPuddles = false;
      }
    }

    // 1B. Dynamic Rainwater Puddle Accumulation & Evaporation
    this.puddleUpdateCooldown -= dt;
    if (this.puddleUpdateCooldown <= 0) {
      this.puddleUpdateCooldown = 0.35;
      if (isRaining) {
        const fillRate = isStorming ? 0.14 : 0.075;
        const maxRange = 76;
        const minIx = Math.max(2, Math.floor((playerX - maxRange + TERRAIN_HALF) / TERRAIN_STEP));
        const maxIx = Math.min(TERRAIN_VERTS - 3, Math.ceil((playerX + maxRange + TERRAIN_HALF) / TERRAIN_STEP));
        const minIz = Math.max(2, Math.floor((playerZ - maxRange + TERRAIN_HALF) / TERRAIN_STEP));
        const maxIz = Math.min(TERRAIN_VERTS - 3, Math.ceil((playerZ + maxRange + TERRAIN_HALF) / TERRAIN_STEP));

        for (let iz = minIz; iz <= maxIz; iz += 2) {
          const vz = -TERRAIN_HALF + iz * TERRAIN_STEP;
          for (let ix = minIx; ix <= maxIx; ix += 2) {
            const vx = -TERRAIN_HALF + ix * TERRAIN_STEP;
            if (isTerrainProtectedAt(vx, vz)) continue;
            const idx = iz * TERRAIN_VERTS + ix;
            const hC = getBaseTerrainHeight(vx, vz) + terrainDeltaGrid[idx];
            if (hC < OCEAN_LEVEL + 0.35 || hC > 11.5) continue;
            const river = getRiverSample(vx, vz);
            const ldx = vx - LAKE_CENTER.x;
            const ldz = vz - LAKE_CENTER.z;
            const lakeLim = LAKE_CENTER.radius + 1.5;
            if (river.inRiver || ldx * ldx + ldz * ldz < lakeLim * lakeLim) {
              continue;
            }
            const hN = getBaseTerrainHeight(vx, vz - TERRAIN_STEP) + terrainDeltaGrid[idx - TERRAIN_VERTS];
            const hS = getBaseTerrainHeight(vx, vz + TERRAIN_STEP) + terrainDeltaGrid[idx + TERRAIN_VERTS];
            const hW = getBaseTerrainHeight(vx - TERRAIN_STEP, vz) + terrainDeltaGrid[idx - 1];
            const hE = getBaseTerrainHeight(vx + TERRAIN_STEP, vz) + terrainDeltaGrid[idx + 1];
            const avgNeighbor = (hN + hS + hW + hE) * 0.25;
            const concavity = avgNeighbor - hC;
            if (concavity > 0.035 || (isStorming && Math.abs(concavity) < 0.04 && hC < 4.5)) {
              const prevWet = terrainWetnessGrid[idx];
              terrainPuddleGrid[idx] = Math.min(1.0, terrainPuddleGrid[idx] + fillRate + Math.max(0, concavity) * 0.25);
              terrainWetnessGrid[idx] = Math.min(1.0, prevWet + fillRate * 1.4);
              this.hasWetnessOrPuddles = true;
              this.puddleScanDirty = true;
              if (terrainWetnessGrid[idx] - prevWet > 0.05) {
                this.markDirtyArea(vx, vz, TERRAIN_STEP, false);
              }
            } else {
              terrainWetnessGrid[idx] = Math.min(0.65, terrainWetnessGrid[idx] + fillRate * 0.45);
              this.hasWetnessOrPuddles = true;
            }
          }
        }
      }
    }

    // 1C. Coastal Shoreline Sand Erosion during Rainfall & Storm Surge
    this.coastalErosionCooldown -= dt;
    if (isRaining && this.coastalErosionCooldown <= 0) {
      this.coastalErosionCooldown = 0.55;
      const sandErode = isStorming ? 0.022 : 0.009;
      for (let k = 0; k < (isStorming ? 18 : 10); k++) {
        const angle = Math.random() * Math.PI * 2;
        const rad = 98 + Math.random() * 44;
        const sx = Math.cos(angle) * rad;
        const sz = Math.sin(angle) * rad;
        if (isTerrainProtectedAt(sx, sz)) continue;
        if (Math.hypot(sx - PLAYER_SPAWN.x, sz - PLAYER_SPAWN.z) < 9.5) continue;
        const ix = Math.round((sx + TERRAIN_HALF) / TERRAIN_STEP);
        const iz = Math.round((sz + TERRAIN_HALF) / TERRAIN_STEP);
        if (ix < 2 || ix >= TERRAIN_VERTS - 2 || iz < 2 || iz >= TERRAIN_VERTS - 2) continue;
        const idx = iz * TERRAIN_VERTS + ix;
        const vx = -TERRAIN_HALF + ix * TERRAIN_STEP;
        const vz = -TERRAIN_HALF + iz * TERRAIN_STEP;
        const h = getBaseTerrainHeight(vx, vz) + terrainDeltaGrid[idx];
        if (h >= -0.35 && h <= 1.85 && terrainDeltaGrid[idx] > -0.68) {
          terrainDeltaGrid[idx] = Math.max(-0.68, terrainDeltaGrid[idx] - sandErode);
          terrainWetnessGrid[idx] = Math.min(1.0, terrainWetnessGrid[idx] + 0.16);
          terrainLoosenessGrid[idx] = Math.min(1.0, terrainLoosenessGrid[idx] + 0.08);
          this.hasWetnessOrPuddles = true;
          this.markDirtyArea(vx, vz, TERRAIN_STEP * 1.5, true);
          erodedVolumeDelta += sandErode;
          this.totalErodedVolume += sandErode;
          dirtyVertices = true;
        }
      }
    }

    // 2. Active Water Emitters (Water Torrents)
    for (let i = this.emitters.length - 1; i >= 0; i--) {
      const em = this.emitters[i];
      em.life -= dt;
      em.rateAccumulator += dt * 18;
      while (em.rateAccumulator >= 1) {
        em.rateAccumulator -= 1;
        this.spawnDroplet(
          em.x + (Math.random() - 0.5) * 1.1,
          em.z + (Math.random() - 0.5) * 1.1,
          (Math.random() - 0.5) * 0.9,
          (Math.random() - 0.5) * 0.9,
          1.1,
          7.0,
        );
      }
      if (em.life <= 0) {
        this.emitters.splice(i, 1);
      }
    }

    // 3. Detect natural river/lake bank breaches (if player dug/blasted beside Azure Lake, Farm Pond, or River)
    this.breachCheckCooldown -= dt;
    if (this.breachCheckCooldown <= 0) {
      this.breachCheckCooldown = 0.45;
      // Sample perimeter around Azure Lake
      for (let k = 0; k < 10; k++) {
        const a = Math.random() * Math.PI * 2;
        const px = LAKE_CENTER.x + Math.cos(a) * (LAKE_CENTER.radius + 1.5);
        const pz = LAKE_CENTER.z + Math.sin(a) * (LAKE_CENTER.radius + 1.5);
        const h = getTerrainHeight(px, pz);
        if (h < LAKE_CENTER.waterY - 0.15) {
          this.spawnDroplet(
            px,
            pz,
            Math.cos(a) * 2.2,
            Math.sin(a) * 2.2,
            1.15,
            8.0,
          );
        }
      }
      // Farm pond overflow
      for (let k = 0; k < 4; k++) {
        const a = Math.random() * Math.PI * 2;
        const px = FARM_POND_POS.x + Math.cos(a) * (FARM_POND_POS.radius + 1.2);
        const pz = FARM_POND_POS.z + Math.sin(a) * (FARM_POND_POS.radius + 1.2);
        if (getTerrainHeight(px, pz) < FARM_POND_POS.waterY - 0.12) {
          this.spawnDroplet(px, pz, Math.cos(a) * 1.6, Math.sin(a) * 1.6, 0.9, 6.0);
        }
      }
      // Rainstorm hillslope runoff droplets near player
      if (isRaining && this.droplets.length < (isStorming ? 220 : 180)) {
        const runoffCount = isStorming ? 6 : 3;
        for (let k = 0; k < runoffCount; k++) {
          const rx = playerX + (Math.random() - 0.5) * 64;
          const rz = playerZ + (Math.random() - 0.5) * 64;
          const { h, gx, gz } = this.sampleHeightAndGradient(rx, rz);
          if (h > 3.2 && Math.hypot(gx, gz) > 0.2) {
            this.spawnDroplet(rx, rz, -gx * 1.6, -gz * 1.6, isStorming ? 0.8 : 0.6, 5.0);
          }
        }
      }
    }

    // 4. Shallow-Water Droplet Hydrodynamics & Sediment Transport Erosion
    const gravity = 11.5;
    const friction = 0.94;
    const erosionRate = 0.58;
    const depositRate = 0.42;

    for (let i = this.droplets.length - 1; i >= 0; i--) {
      const d = this.droplets[i];
      d.life -= dt;
      if (d.life <= 0 || d.water <= 0.04) {
        if (d.sediment > 0.01) {
          this.modifyTerrainSmoothAt(d.x, d.z, d.sediment * 0.6, 0.2);
          dirtyVertices = true;
        }
        this.droplets.splice(i, 1);
        continue;
      }

      const oldInfo = this.sampleHeightAndGradient(d.x, d.z);
      // Gravity accelerates downhill along negative terrain gradient
      d.vx = d.vx * friction - oldInfo.gx * gravity * dt;
      d.vz = d.vz * friction - oldInfo.gz * gravity * dt;

      const speed = Math.hypot(d.vx, d.vz);
      const maxSpeed = 12.5;
      if (speed > maxSpeed) {
        d.vx = (d.vx / speed) * maxSpeed;
        d.vz = (d.vz / speed) * maxSpeed;
      }

      const stepX = d.vx * dt;
      const stepZ = d.vz * dt;
      const nx = d.x + stepX;
      const nz = d.z + stepZ;

      if (Math.abs(nx) > TERRAIN_HALF - 4 || Math.abs(nz) > TERRAIN_HALF - 4) {
        this.droplets.splice(i, 1);
        continue;
      }

      const newH = getTerrainHeight(nx, nz);
      const deltaH = newH - oldInfo.h;

      // Also wet riverbanks naturally if crossing river
      const river = getRiverSample(nx, nz);
      const riverFactor = river.inRiver ? 0.45 : 1.0;

      // Carrying capacity proportional to downhill slope * flow speed * water volume
      const slopeDown = Math.max(0.015, -deltaH / Math.max(0.2, speed * dt + 0.1));
      const capacity = Math.max(0.03, slopeDown * Math.max(0.4, speed) * d.water * 0.11);

      if (deltaH > 0.06) {
        // Water hits an uphill lip or basin depression -> deposit silt smoothly
        const deposit = Math.min(d.sediment, deltaH * 0.55);
        if (deposit > 0.002) {
          d.sediment -= deposit;
          this.modifyTerrainSmoothAt(d.x, d.z, deposit, 0.35);
          dirtyVertices = true;
        }
        d.vx *= 0.62;
        d.vz *= 0.62;
      } else if (d.sediment > capacity) {
        const deposit = (d.sediment - capacity) * Math.min(1, depositRate * dt * 4);
        d.sediment -= deposit;
        this.modifyTerrainSmoothAt(d.x, d.z, deposit, 0.35);
        dirtyVertices = true;
      } else {
        // Active hydraulic scouring of dirt along stream path
        const erode = Math.min(
          0.24,
          (capacity - d.sediment) * erosionRate * riverFactor * Math.min(1, dt * 6),
        );
        if (erode > 0.002) {
          d.sediment += erode;
          this.modifyTerrainSmoothAt(d.x, d.z, -erode, 0.55);
          erodedVolumeDelta += erode;
          this.totalErodedVolume += erode;
          dirtyVertices = true;
        }
      }

      d.x = nx;
      d.z = nz;
      d.water = Math.max(0, d.water * (1 - 0.085 * dt));

      // Evaporate droplets that reach the deep ocean
      if (newH < -0.35 && speed < 1.2) {
        this.droplets.splice(i, 1);
      }
    }

    // 5. Slope-Stability Avalanche / Landslide Cellular Mass Wasting (bounded to deformed/loose subrect, zero alloc)
    this.avalancheCooldown -= dt;
    if (this.avalancheCooldown <= 0 && this.hasDeformedOrLooseCells) {
      this.avalancheCooldown = 0.18;
      const scanRect = this.looseScanRect ?? {
        minIx: 2,
        maxIx: TERRAIN_VERTS - 3,
        minIz: 2,
        maxIz: TERRAIN_VERTS - 3,
      };
      let anyLooseRemaining = false;
      let slidAny = false;
      for (let iz = scanRect.minIz; iz <= scanRect.maxIz; iz++) {
        const vz = -TERRAIN_HALF + iz * TERRAIN_STEP;
        for (let ix = scanRect.minIx; ix <= scanRect.maxIx; ix++) {
          const idx = iz * TERRAIN_VERTS + ix;
          const looseness = terrainLoosenessGrid[idx];
          if (looseness <= 0.08 && Math.abs(terrainDeltaGrid[idx]) < 0.08) continue;
          if (looseness > 0.04) anyLooseRemaining = true;

          const vx = -TERRAIN_HALF + ix * TERRAIN_STEP;
          if (isTerrainProtectedAt(vx, vz)) continue;

          const hCenter = getBaseTerrainHeight(vx, vz) + terrainDeltaGrid[idx];
          const wet = terrainWetnessGrid[idx];
          const maxDiff = Math.max(1.25, 2.35 - looseness * 0.72 - wet * 0.45);

          let worstDiff = 0;
          let worstNx = ix;
          let worstNz = iz;
          let worstNIdx = idx;

          for (let n = 0; n < 4; n++) {
            const nix = n === 0 ? ix + 1 : n === 1 ? ix - 1 : ix;
            const niz = n === 2 ? iz + 1 : n === 3 ? iz - 1 : iz;
            const nvx = -TERRAIN_HALF + nix * TERRAIN_STEP;
            const nvz = -TERRAIN_HALF + niz * TERRAIN_STEP;
            if (isTerrainProtectedAt(nvx, nvz)) continue;
            const nIdx = niz * TERRAIN_VERTS + nix;
            const nh = getBaseTerrainHeight(nvx, nvz) + terrainDeltaGrid[nIdx];
            const diff = hCenter - nh;
            if (diff > maxDiff && diff > worstDiff) {
              worstDiff = diff;
              worstNx = nix;
              worstNz = niz;
              worstNIdx = nIdx;
            }
          }

          if (worstDiff > maxDiff) {
            const slideAmount = Math.min(0.65, (worstDiff - maxDiff) * 0.34);
            terrainDeltaGrid[idx] -= slideAmount;
            terrainDeltaGrid[worstNIdx] += slideAmount * 0.92;
            terrainLoosenessGrid[idx] = Math.max(0.05, looseness * 0.92);
            terrainLoosenessGrid[worstNIdx] = Math.min(
              1,
              terrainLoosenessGrid[worstNIdx] + 0.42,
            );
            this.markDirtyArea(vx, vz, TERRAIN_STEP * 2, true);
            dirtyVertices = true;
            anyLooseRemaining = true;
            slidAny = true;

            if (slideAmount > 0.14 && avalanches.length < 8) {
              const nvx = -TERRAIN_HALF + worstNx * TERRAIN_STEP;
              const nvz = -TERRAIN_HALF + worstNz * TERRAIN_STEP;
              avalanches.push({
                x: (vx + nvx) * 0.5,
                y: hCenter - slideAmount * 0.5,
                z: (vz + nvz) * 0.5,
                intensity: slideAmount,
              });
            }
          } else if (looseness > 0) {
            const nl = Math.max(0, looseness - 0.04);
            terrainLoosenessGrid[idx] = nl;
            if (nl > 0.04) anyLooseRemaining = true;
          }
        }
      }
      if (!anyLooseRemaining && !slidAny) {
        this.hasDeformedOrLooseCells = false;
        this.looseScanRect = null;
      }
    }

    // 6. Sync dirty BufferGeometry region (Y positions + wet/scorch/rock vertex colors + normals)
    if (this.dirtyRect) {
      this.syncTerrainGeometryRegion(
        terrainMesh,
        baseColors,
        this.dirtyRect,
        this.dirtyHeightChanged,
      );
      this.dirtyRect = null;
      this.dirtyHeightChanged = false;
      dirtyVertices = true;
    }

    // 7. Update active fluid water droplets InstancedMesh visuals (only upload matrices when active/changed)
    const visCount = Math.min(this.droplets.length, this.maxDropletVisuals);
    this.waterInstancedMesh.count = visCount;
    if (visCount > 0) {
      for (let i = 0; i < visCount; i++) {
        const d = this.droplets[i];
        const h = getTerrainHeight(d.x, d.z);
        const speed = Math.hypot(d.vx, d.vz);
        const stretch = Math.min(2.8, 1.0 + speed * 0.18);
        const thickness = Math.max(0.45, Math.min(1.45, d.water * 0.9));
        _dummy.position.set(d.x, h + 0.08, d.z);
        _dummy.rotation.set(0, Math.atan2(d.vx, d.vz), 0);
        _dummy.scale.set(thickness, 1, thickness * stretch);
        _dummy.updateMatrix();
        this.waterInstancedMesh.setMatrixAt(i, _dummy.matrix);
        const mudT = Math.min(0.65, d.sediment * 1.4);
        _streamColor.setRGB(
          0.22 + mudT * 0.34,
          0.74 - mudT * 0.25,
          0.96 - mudT * 0.52,
        );
        this.waterInstancedMesh.setColorAt(i, _streamColor);
      }
      this.waterInstancedMesh.instanceMatrix.needsUpdate = true;
      if (this.waterInstancedMesh.instanceColor) {
        this.waterInstancedMesh.instanceColor.needsUpdate = true;
      }
    } else if (this.lastDropletVisCount > 0) {
      this.waterInstancedMesh.instanceMatrix.needsUpdate = true;
    }
    this.lastDropletVisCount = visCount;

    // 8. Update Instanced Rainwater Puddles pooled in basins & depressions (skip completely when dry)
    if (!this.hasWetnessOrPuddles && !isRaining) {
      if (this.lastPuddleVisCount > 0) {
        this.activePuddleCount = 0;
        this.puddleInstancedMesh.count = 0;
        this.puddleInstancedMesh.instanceMatrix.needsUpdate = true;
        this.lastPuddleVisCount = 0;
      }
    } else {
      const movedFarFromPuddleScan =
        Number.isNaN(this.lastPuddleScanX) ||
        Math.abs(playerX - this.lastPuddleScanX) > 4 ||
        Math.abs(playerZ - this.lastPuddleScanZ) > 4;
      if (this.puddleScanDirty || movedFarFromPuddleScan) {
        this.puddleScanDirty = false;
        this.lastPuddleScanX = playerX;
        this.lastPuddleScanZ = playerZ;
        let puddleIdx = 0;
        const minIz = Math.max(2, Math.floor((playerZ - 85 + TERRAIN_HALF) / TERRAIN_STEP));
        const maxIz = Math.min(TERRAIN_VERTS - 3, Math.ceil((playerZ + 85 + TERRAIN_HALF) / TERRAIN_STEP));
        const minIx = Math.max(2, Math.floor((playerX - 85 + TERRAIN_HALF) / TERRAIN_STEP));
        const maxIx = Math.min(TERRAIN_VERTS - 3, Math.ceil((playerX + 85 + TERRAIN_HALF) / TERRAIN_STEP));
        const startIz = (minIz & 1) === 0 ? minIz : minIz + 1;
        const startIx = (minIx & 1) === 0 ? minIx : minIx + 1;

        for (let iz = startIz; iz <= maxIz && puddleIdx < this.maxPuddleVisuals; iz += 2) {
          const vz = -TERRAIN_HALF + iz * TERRAIN_STEP;
          for (let ix = startIx; ix <= maxIx && puddleIdx < this.maxPuddleVisuals; ix += 2) {
            const vx = -TERRAIN_HALF + ix * TERRAIN_STEP;
            const idx = iz * TERRAIN_VERTS + ix;
            const depth = terrainPuddleGrid[idx];
            if (depth > 0.18) {
              const h = getBaseTerrainHeight(vx, vz) + terrainDeltaGrid[idx];
              const sc = 0.65 + depth * 0.95;
              _dummy.position.set(vx, h + 0.045, vz);
              _dummy.rotation.set(0, ((ix * 7 + iz * 13) % 6) * 0.5, 0);
              _dummy.scale.set(sc, 1, sc * 0.88);
              _dummy.updateMatrix();
              this.puddleInstancedMesh.setMatrixAt(puddleIdx, _dummy.matrix);
              puddleIdx++;
            }
          }
        }
        this.activePuddleCount = puddleIdx;
        this.puddleInstancedMesh.count = puddleIdx;
        if (puddleIdx > 0 || this.lastPuddleVisCount > 0) {
          this.puddleInstancedMesh.instanceMatrix.needsUpdate = true;
        }
        this.lastPuddleVisCount = puddleIdx;
      }
    }

    return {
      dirtyVertices,
      avalanches,
      erodedVolumeDelta,
      puddleCount: this.activePuddleCount,
    };
  }

  public syncAllDeformedVertices(terrainMesh: THREE.Mesh, baseColors: Float32Array): void {
    this.syncTerrainGeometryRegion(terrainMesh, baseColors, {
      minIx: 0,
      maxIx: TERRAIN_VERTS - 1,
      minIz: 0,
      maxIz: TERRAIN_VERTS - 1,
    });
  }

  private syncTerrainGeometryRegion(
    terrainMesh: THREE.Mesh,
    baseColors: Float32Array,
    rect: { minIx: number; maxIx: number; minIz: number; maxIz: number },
    heightChanged = true,
  ): void {
    const geo = terrainMesh.geometry as THREE.BufferGeometry;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const col = geo.attributes.color as THREE.BufferAttribute;
    let minUpdatedY = Infinity;
    let maxUpdatedY = -Infinity;

    for (let iz = rect.minIz; iz <= rect.maxIz; iz++) {
      const vz = -TERRAIN_HALF + iz * TERRAIN_STEP;
      for (let ix = rect.minIx; ix <= rect.maxIx; ix++) {
        const vx = -TERRAIN_HALF + ix * TERRAIN_STEP;
        const idx = iz * TERRAIN_VERTS + ix;
        const delta = terrainDeltaGrid[idx];
        if (heightChanged) {
          const y = getBaseTerrainHeight(vx, vz) + delta;
          pos.setY(idx, y);
          if (y < minUpdatedY) minUpdatedY = y;
          if (y > maxUpdatedY) maxUpdatedY = y;
        }

        let r = baseColors[idx * 3];
        let g = baseColors[idx * 3 + 1];
        let b = baseColors[idx * 3 + 2];

        // Exposed subsoil / bedrock strata when carved deeper
        if (delta < -0.25) {
          const carveT = Math.min(1, Math.abs(delta) / 2.8);
          const rockT = Math.min(1, Math.max(0, (Math.abs(delta) - 1.5) / 2.2));
          // Fresh dirt -> fractured bedrock gray
          const er = 0.42 * (1 - rockT) + 0.34 * rockT;
          const eg = 0.29 * (1 - rockT) + 0.32 * rockT;
          const eb = 0.2 * (1 - rockT) + 0.31 * rockT;
          r = r * (1 - carveT) + er * carveT;
          g = g * (1 - carveT) + eg * carveT;
          b = b * (1 - carveT) + eb * carveT;
        } else if (delta > 0.25) {
          // Deposited alluvial silt / blast ejecta
          const depT = Math.min(0.85, delta / 1.8);
          r = r * (1 - depT) + 0.46 * depT;
          g = g * (1 - depT) + 0.36 * depT;
          b = b * (1 - depT) + 0.24 * depT;
        }

        // Scorched crater charcoal
        const scorch = terrainScorchGrid[idx];
        if (scorch > 0.01) {
          const s = Math.min(0.88, scorch);
          r = r * (1 - s) + 0.14 * s;
          g = g * (1 - s) + 0.12 * s;
          b = b * (1 - s) + 0.11 * s;
        }

        // Wet darkened hydraulic channel mud
        const wet = terrainWetnessGrid[idx];
        if (wet > 0.01) {
          const w = Math.min(0.85, wet);
          r = r * (1 - w) + 0.18 * w;
          g = g * (1 - w) + 0.24 * w;
          b = b * (1 - w) + 0.26 * w;
        }

        col.setXYZ(idx, r, g, b);
      }
    }

    col.needsUpdate = true;
    if (heightChanged) {
      pos.needsUpdate = true;
      const isFullGrid =
        rect.minIx === 0 &&
        rect.maxIx >= TERRAIN_VERTS - 1 &&
        rect.minIz === 0 &&
        rect.maxIz >= TERRAIN_VERTS - 1;
      const norm = geo.attributes.normal as THREE.BufferAttribute | undefined;
      if (isFullGrid || !norm) {
        geo.computeVertexNormals();
        geo.computeBoundingBox();
        geo.computeBoundingSphere();
      } else {
        // Compute smooth vertex normals ONLY over the dirty region (+1 border ring)
        const nMinIx = Math.max(0, rect.minIx - 1);
        const nMaxIx = Math.min(TERRAIN_VERTS - 1, rect.maxIx + 1);
        const nMinIz = Math.max(0, rect.minIz - 1);
        const nMaxIz = Math.min(TERRAIN_VERTS - 1, rect.maxIz + 1);
        const invDoubleStep = 1 / (2 * TERRAIN_STEP);
        for (let iz = nMinIz; iz <= nMaxIz; iz++) {
          const izPrev = iz > 0 ? iz - 1 : 0;
          const izNext = iz < TERRAIN_VERTS - 1 ? iz + 1 : TERRAIN_VERTS - 1;
          const spanZ = (izNext - izPrev) * TERRAIN_STEP;
          const invSpanZ = spanZ > 0 ? 1 / spanZ : invDoubleStep;
          const row = iz * TERRAIN_VERTS;
          const rowPrev = izPrev * TERRAIN_VERTS;
          const rowNext = izNext * TERRAIN_VERTS;
          for (let ix = nMinIx; ix <= nMaxIx; ix++) {
            const ixPrev = ix > 0 ? ix - 1 : 0;
            const ixNext = ix < TERRAIN_VERTS - 1 ? ix + 1 : TERRAIN_VERTS - 1;
            const spanX = (ixNext - ixPrev) * TERRAIN_STEP;
            const invSpanX = spanX > 0 ? 1 / spanX : invDoubleStep;
            const hL = pos.getY(row + ixPrev);
            const hR = pos.getY(row + ixNext);
            const hD = pos.getY(rowPrev + ix);
            const hU = pos.getY(rowNext + ix);
            const nx = (hL - hR) * invSpanX;
            const nz = (hD - hU) * invSpanZ;
            const invLen = 1 / Math.hypot(nx, 1, nz);
            norm.setXYZ(row + ix, nx * invLen, invLen, nz * invLen);
          }
        }
        norm.needsUpdate = true;
        if (geo.boundingBox && maxUpdatedY >= minUpdatedY) {
          if (minUpdatedY < geo.boundingBox.min.y) geo.boundingBox.min.y = minUpdatedY;
          if (maxUpdatedY > geo.boundingBox.max.y) geo.boundingBox.max.y = maxUpdatedY;
        }
      }
    }
  }

  public dispose(scene: THREE.Scene): void {
    scene.remove(this.waterInstancedMesh);
    this.waterInstancedMesh.geometry.dispose();
    (this.waterInstancedMesh.material as THREE.Material).dispose();
    scene.remove(this.puddleInstancedMesh);
    this.puddleInstancedMesh.geometry.dispose();
    (this.puddleInstancedMesh.material as THREE.Material).dispose();
  }
}
