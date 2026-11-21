export type CaveType =
  | 'regular'
  | 'civilization'
  | 'monster-boss'
  | 'lush'
  | 'crystal'
  | 'red-dragon';

export interface Cave {
  id: string;
  type: CaveType;
  x: number;
  z: number;
  discovered: boolean;
  explored: boolean;
  bossDefeated?: boolean;
}

export interface CaveCompactSave {
  islandRadius: number;
  dragonUnlocked: boolean;
  discoveredIds: string[];
  exploredIds: string[];
  specialCaves: Cave[];
}

export interface CaveSummarySnapshot {
  totalCaves: number;
  discoveredCount: number;
  exploredCount: number;
  dragonUnlocked: boolean;
  specialCaves: Cave[];
  discoveredSample: Cave[];
}

export const CAVE_COUNT = 5000;
export const CAVE_STREAM_CHUNK_SIZE = 64;

const SPECIAL_CAVE_TYPES: readonly CaveType[] = [
  'civilization',
  'monster-boss',
  'lush',
  'crystal',
  'red-dragon',
];

const SPECIAL_CAVE_LABELS: Record<CaveType, string> = {
  regular: 'Cavern Hollow',
  civilization: 'Ancient Civilization Cavern',
  'monster-boss': 'Monster Boss Cavern',
  lush: 'Bioluminescent Lush Cave',
  crystal: 'Resonant Crystal Cavern',
  'red-dragon': 'Red Dragon Lair',
};

export function getCaveTypeLabel(type: CaveType): string {
  return SPECIAL_CAVE_LABELS[type] ?? 'Cavern Hollow';
}

export const caveSystem = {
  caves: [] as Cave[],
  dragonUnlocked: false,
  islandRadius: 580,
  _idMap: new Map<string, Cave>(),
  _buckets: new Map<number, Cave[]>(),
  _discoveredCount: 0,
  _exploredCount: 0,

  _bucketKey(cx: number, cz: number): number {
    return (cx + 512) * 1024 + (cz + 512);
  },

  _rebuildIndex(): void {
    this._idMap.clear();
    this._buckets.clear();
    let discoveredCount = 0;
    let exploredCount = 0;
    for (let i = 0; i < this.caves.length; i++) {
      const c = this.caves[i];
      this._idMap.set(c.id, c);
      if (c.discovered) discoveredCount++;
      if (c.explored) exploredCount++;
      const cx = Math.floor(c.x / CAVE_STREAM_CHUNK_SIZE);
      const cz = Math.floor(c.z / CAVE_STREAM_CHUNK_SIZE);
      const key = this._bucketKey(cx, cz);
      let bucket = this._buckets.get(key);
      if (!bucket) {
        bucket = [];
        this._buckets.set(key, bucket);
      }
      bucket.push(c);
    }
    this._discoveredCount = discoveredCount;
    this._exploredCount = exploredCount;
  },

  generateIslandCaves(island: { x: number; z: number; radius: number }): Cave[] {
    const safeRadius = Math.max(60, Number.isFinite(island.radius) ? island.radius : 580);
    this.islandRadius = safeRadius;
    this.dragonUnlocked = false;

    this.caves = Array.from({ length: CAVE_COUNT }, (_, i) => {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.sqrt(Math.random()) * safeRadius;

      return {
        id: `cave-${i}`,
        type: i < SPECIAL_CAVE_TYPES.length ? SPECIAL_CAVE_TYPES[i] : 'regular',
        x: island.x + Math.cos(angle) * distance,
        z: island.z + Math.sin(angle) * distance,
        discovered: false,
        explored: false,
        bossDefeated: false,
      };
    });

    this._rebuildIndex();
    return this.caves;
  },

  getCaveById(id: string): Cave | undefined {
    return this._idMap.get(id) ?? this.caves.find((c) => c.id === id);
  },

  getRedDragonCave(): Cave | undefined {
    const quick = this.getCaveById('cave-4');
    if (quick && quick.type === 'red-dragon') return quick;
    return this.caves.find((c) => c.type === 'red-dragon');
  },

  discover(id: string): Cave | undefined {
    const cave = this.getCaveById(id);
    if (cave && !cave.discovered) {
      cave.discovered = true;
      this._discoveredCount++;
    }
    return cave;
  },

  explore(id: string): Cave | undefined {
    const cave = this.getCaveById(id);
    if (cave) {
      if (!cave.discovered) {
        cave.discovered = true;
        this._discoveredCount++;
      }
      if (!cave.explored) {
        cave.explored = true;
        this._exploredCount++;
      }
    }
    return cave;
  },

  defeatRedDragon(id: string): boolean {
    const cave = this.getCaveById(id);
    if (cave?.type !== 'red-dragon') return false;
    if (!cave.discovered) {
      cave.discovered = true;
      this._discoveredCount++;
    }
    cave.bossDefeated = true;
    this.dragonUnlocked = true;
    return true;
  },

  canRideDragon(): boolean {
    return this.dragonUnlocked;
  },

  getCavesNear(x: number, z: number, radius: number, out: Cave[] = []): Cave[] {
    out.length = 0;
    if (this.caves.length === 0) return out;
    const minCx = Math.floor((x - radius) / CAVE_STREAM_CHUNK_SIZE);
    const maxCx = Math.floor((x + radius) / CAVE_STREAM_CHUNK_SIZE);
    const minCz = Math.floor((z - radius) / CAVE_STREAM_CHUNK_SIZE);
    const maxCz = Math.floor((z + radius) / CAVE_STREAM_CHUNK_SIZE);
    const rSq = radius * radius;

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cz = minCz; cz <= maxCz; cz++) {
        const bucket = this._buckets.get(this._bucketKey(cx, cz));
        if (!bucket) continue;
        for (let i = 0; i < bucket.length; i++) {
          const c = bucket[i];
          const dx = c.x - x;
          const dz = c.z - z;
          if (dx * dx + dz * dz <= rSq) {
            out.push(c);
          }
        }
      }
    }
    return out;
  },

  findNearestCave(x: number, z: number, maxDistance: number): { cave: Cave; distance: number } | null {
    if (this.caves.length === 0) return null;
    const minCx = Math.floor((x - maxDistance) / CAVE_STREAM_CHUNK_SIZE);
    const maxCx = Math.floor((x + maxDistance) / CAVE_STREAM_CHUNK_SIZE);
    const minCz = Math.floor((z - maxDistance) / CAVE_STREAM_CHUNK_SIZE);
    const maxCz = Math.floor((z + maxDistance) / CAVE_STREAM_CHUNK_SIZE);
    let best: Cave | null = null;
    let bestSq = maxDistance * maxDistance;

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cz = minCz; cz <= maxCz; cz++) {
        const bucket = this._buckets.get(this._bucketKey(cx, cz));
        if (!bucket) continue;
        for (let i = 0; i < bucket.length; i++) {
          const c = bucket[i];
          const dx = c.x - x;
          const dz = c.z - z;
          const dSq = dx * dx + dz * dz;
          if (dSq <= bestSq) {
            bestSq = dSq;
            best = c;
          }
        }
      }
    }
    return best ? { cave: best, distance: Math.sqrt(bestSq) } : null;
  },

  getSpecialCaves(): Cave[] {
    const specials: Cave[] = [];
    for (let i = 0; i < SPECIAL_CAVE_TYPES.length && i < this.caves.length; i++) {
      const c = this.caves[i];
      if (c && c.type !== 'regular') specials.push(c);
    }
    if (specials.length === 0 && this.caves.length > 0) {
      for (let i = 0; i < this.caves.length; i++) {
        if (this.caves[i].type !== 'regular') specials.push(this.caves[i]);
      }
    }
    return specials;
  },

  getSummary(): CaveSummarySnapshot {
    const specialCaves = this.getSpecialCaves().map((c) => ({ ...c }));
    const discoveredSample: Cave[] = [];
    for (let i = 0; i < this.caves.length && discoveredSample.length < 180; i++) {
      const c = this.caves[i];
      if (c.discovered) {
        discoveredSample.push({ ...c });
      }
    }
    return {
      totalCaves: this.caves.length,
      discoveredCount: this._discoveredCount,
      exploredCount: this._exploredCount,
      dragonUnlocked: this.dragonUnlocked,
      specialCaves,
      discoveredSample,
    };
  },

  exportCompactState(): CaveCompactSave {
    const discoveredIds: string[] = [];
    const exploredIds: string[] = [];
    for (let i = 0; i < this.caves.length; i++) {
      const c = this.caves[i];
      if (c.discovered) discoveredIds.push(c.id);
      if (c.explored) exploredIds.push(c.id);
    }
    return {
      islandRadius: this.islandRadius,
      dragonUnlocked: this.dragonUnlocked,
      discoveredIds,
      exploredIds,
      specialCaves: this.getSpecialCaves().map((c) => ({ ...c })),
    };
  },

  hydrateCompactState(saved?: CaveCompactSave | null): void {
    if (!saved) return;
    if (this.caves.length === 0) {
      this.generateIslandCaves({ x: 0, z: 0, radius: saved.islandRadius || 580 });
    }
    if (Array.isArray(saved.specialCaves)) {
      for (const sc of saved.specialCaves) {
        const existing = this.getCaveById(sc.id);
        if (existing) {
          existing.type = sc.type;
          existing.x = sc.x;
          existing.z = sc.z;
          existing.discovered = Boolean(sc.discovered);
          existing.explored = Boolean(sc.explored);
          existing.bossDefeated = Boolean(sc.bossDefeated);
        }
      }
    }
    if (Array.isArray(saved.discoveredIds)) {
      for (const id of saved.discoveredIds) {
        const c = this.getCaveById(id);
        if (c) c.discovered = true;
      }
    }
    if (Array.isArray(saved.exploredIds)) {
      for (const id of saved.exploredIds) {
        const c = this.getCaveById(id);
        if (c) {
          c.discovered = true;
          c.explored = true;
        }
      }
    }
    this.dragonUnlocked = Boolean(saved.dragonUnlocked);
    this._rebuildIndex();
  },
};

// Keep UI panels outside the player-control safe area.
export const UI_LAYOUT = {
  reservePlayerControls: true,
  preventOverlap: true,
  mobileSafeArea: true,
  repositionMenus: true,
} as const;

export interface SafeHudLayoutMetrics {
  reserveLeftPx: number;
  reserveRightPx: number;
  reserveBottomPx: number;
  isLandscapeCompact: boolean;
  centerBandMaxWidthPx: number;
  repositionPromptAboveControls: boolean;
}

export function getSafeHudLayoutMetrics(
  viewportWidth: number,
  viewportHeight: number,
  touchVisible: boolean,
  controlsMinimized: boolean,
): SafeHudLayoutMetrics {
  const safeW = Math.max(320, Number.isFinite(viewportWidth) ? viewportWidth : 1280);
  const safeH = Math.max(320, Number.isFinite(viewportHeight) ? viewportHeight : 720);
  const isLandscapeCompact = safeH < 520;

  if (!UI_LAYOUT.reservePlayerControls || controlsMinimized) {
    return {
      reserveLeftPx: 12,
      reserveRightPx: 12,
      reserveBottomPx: 12,
      isLandscapeCompact,
      centerBandMaxWidthPx: Math.max(280, safeW - 24),
      repositionPromptAboveControls: false,
    };
  }

  if (touchVisible) {
    const reserveLeftPx = safeW < 640 ? 156 : 216;
    const reserveRightPx = safeW < 640 ? 182 : 264;
    const centerGap = safeW - reserveLeftPx - reserveRightPx;
    return {
      reserveLeftPx,
      reserveRightPx,
      reserveBottomPx: isLandscapeCompact ? 14 : 74,
      isLandscapeCompact,
      centerBandMaxWidthPx: isLandscapeCompact
        ? Math.max(220, centerGap - 16)
        : Math.max(280, safeW - 24),
      repositionPromptAboveControls:
        UI_LAYOUT.repositionMenus && (!isLandscapeCompact || centerGap < 280),
    };
  }

  const desktopBarReserveLeft = safeW >= 1200 ? 228 : 16;
  return {
    reserveLeftPx: desktopBarReserveLeft,
    reserveRightPx: safeW < 1024 ? 16 : 24,
    reserveBottomPx: 14,
    isLandscapeCompact,
    centerBandMaxWidthPx: Math.max(300, safeW - desktopBarReserveLeft * 2),
    repositionPromptAboveControls: false,
  };
}

export {
  CAVE_TOTAL,
  CaveBoss,
  IslandCaveSystem,
  LOAD_DISTANCE,
} from './islandCaveSystem';
export type { Cave as IslandCave } from './islandCaveSystem';

