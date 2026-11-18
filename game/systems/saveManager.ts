import {
  DrawDistanceTier,
  FlatSurfaceStyle,
  GameMode,
  GameSaveData,
  GameSettings,
  GraphicsPreset,
  SaveSlotSummary,
  TvSafetyMode,
  WorldType,
  resolveAllowedGameMode,
} from '../types';

const SAVE_INDEX_KEY = 'survival_island_lost_world_saves_v1';
const SAVE_SLOT_PREFIX = 'survival_island_slot_v1_';
const SETTINGS_KEY = 'survival_island_settings_v1';
const ACTIVE_SESSION_KEY = 'survival_island_active_session_v1';

export interface GraphicsPresetProfile {
  graphicsQuality: GraphicsPreset;
  graphicsPreset: GraphicsPreset;
  shadowsEnabled: boolean;
  waterReflectionsEnabled: boolean;
  particlesEnabled: boolean;
  drawDistance: DrawDistanceTier;
  dynamicAutoFps: boolean;
  tvSafetyMode: TvSafetyMode;
}

export function normalizeGraphicsPreset(
  rawPreset?: string,
  rawQuality?: string,
): GraphicsPreset {
  if (rawPreset === 'low' || rawPreset === 'performance') return 'low';
  if (rawPreset === 'ultra' || rawQuality === 'ultra') return 'ultra';
  if (rawPreset === 'high' || rawQuality === 'high') return 'high';
  if (rawPreset === 'medium' || rawPreset === 'balanced') return 'medium';
  if (rawQuality === 'high') return 'high';
  if (rawQuality === 'low') return 'low';
  return 'medium';
}

export const GRAPHICS_PRESET_PROFILES: Record<GraphicsPreset, GraphicsPresetProfile> = {
  low: {
    graphicsQuality: 'low',
    graphicsPreset: 'low',
    shadowsEnabled: false,
    waterReflectionsEnabled: false,
    particlesEnabled: true,
    drawDistance: 'near',
    dynamicAutoFps: true,
    tvSafetyMode: 'safe_mini',
  },
  medium: {
    graphicsQuality: 'medium',
    graphicsPreset: 'medium',
    shadowsEnabled: true,
    waterReflectionsEnabled: true,
    particlesEnabled: true,
    drawDistance: 'medium',
    dynamicAutoFps: true,
    tvSafetyMode: 'auto',
  },
  high: {
    graphicsQuality: 'high',
    graphicsPreset: 'high',
    shadowsEnabled: true,
    waterReflectionsEnabled: true,
    particlesEnabled: true,
    drawDistance: 'far',
    dynamicAutoFps: true,
    tvSafetyMode: 'auto',
  },
  ultra: {
    graphicsQuality: 'ultra',
    graphicsPreset: 'ultra',
    shadowsEnabled: true,
    waterReflectionsEnabled: true,
    particlesEnabled: true,
    drawDistance: 'far',
    dynamicAutoFps: false,
    tvSafetyMode: 'full_3d',
  },
};

export function isMobileOrTouchClient(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia?.('(pointer: coarse)')?.matches === true
  );
}

export function getPresetSettings(
  current: GameSettings,
  preset: GraphicsPreset,
): GameSettings {
  return {
    ...current,
    ...GRAPHICS_PRESET_PROFILES[preset],
  };
}

export const DEFAULT_SETTINGS: GameSettings = {
  masterVolume: 0.7,
  sfxEnabled: true,
  ambienceEnabled: true,
  graphicsQuality: 'medium',
  graphicsPreset: 'medium',
  shadowsEnabled: true,
  waterReflectionsEnabled: true,
  particlesEnabled: true,
  drawDistance: 'medium',
  dynamicAutoFps: true,
  tvSafetyMode: 'auto',
  touchControlsMode: 'auto',
  cameraSensitivity: 1.0,
  invertCameraY: false,
  showCompass: true,
  compactHud: false,
};

export function getDefaultSettingsForDevice(): GameSettings {
  // Keep Medium as the smooth iPhone-suitable default across mobile and touch devices
  const defaultPreset: GraphicsPreset = isMobileOrTouchClient() ? 'medium' : 'medium';
  return {
    ...DEFAULT_SETTINGS,
    ...GRAPHICS_PRESET_PROFILES[defaultPreset],
  };
}

export function loadSettings(): GameSettings {
  const base = getDefaultSettingsForDevice();
  if (typeof window === 'undefined') return base;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<GameSettings> & {
      graphicsPreset?: string;
      graphicsQuality?: string;
    };
    const normalizedPreset = normalizeGraphicsPreset(
      parsed.graphicsPreset,
      parsed.graphicsQuality,
    );
    const prof = GRAPHICS_PRESET_PROFILES[normalizedPreset];
    const merged: GameSettings = {
      ...base,
      ...parsed,
      graphicsPreset: normalizedPreset,
      graphicsQuality: normalizedPreset,
    };
    if (parsed.shadowsEnabled === undefined) merged.shadowsEnabled = prof.shadowsEnabled;
    if (parsed.waterReflectionsEnabled === undefined) {
      merged.waterReflectionsEnabled = prof.waterReflectionsEnabled;
    }
    if (parsed.particlesEnabled === undefined) {
      merged.particlesEnabled = prof.particlesEnabled;
    }
    if (parsed.drawDistance === undefined) merged.drawDistance = prof.drawDistance;
    if (merged.dynamicAutoFps === undefined) merged.dynamicAutoFps = true;
    if (
      merged.tvSafetyMode !== 'auto' &&
      merged.tvSafetyMode !== 'safe_mini' &&
      merged.tvSafetyMode !== 'full_3d'
    ) {
      merged.tvSafetyMode = 'auto';
    }
    return merged;
  } catch {
    return base;
  }
}

export function saveSettings(settings: GameSettings): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function markSessionPlaying(slotId: string, mode?: GameMode): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(
      ACTIVE_SESSION_KEY,
      JSON.stringify({
        slotId,
        mode: mode || 'survival',
        updatedAt: Date.now(),
      }),
    );
  } catch {
    // Ignore restricted sessionStorage environments
  }
}

export function clearSessionPlaying(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(ACTIVE_SESSION_KEY);
  } catch {
    // Ignore
  }
}

export function getActiveSessionRecovery(): {
  slotId: string;
  mode?: GameMode;
} | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(ACTIVE_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      slotId?: string;
      mode?: GameMode;
      updatedAt?: number;
    };
    if (
      typeof parsed?.slotId === 'string' &&
      parsed.slotId.trim() &&
      typeof parsed.updatedAt === 'number' &&
      Date.now() - parsed.updatedAt < 1000 * 60 * 60 * 12
    ) {
      return { slotId: parsed.slotId, mode: parsed.mode };
    }
    return null;
  } catch {
    return null;
  }
}

export function createNewSaveSlotId(worldType: WorldType): string {
  const safeType: WorldType = worldType === 'flat' ? 'flat' : 'island';
  const rand = Math.random().toString(36).slice(2, 6);
  return `world_${safeType}_${Date.now()}_${rand}`;
}

function normalizeSlotSummary(raw: SaveSlotSummary): SaveSlotSummary {
  const worldType: WorldType = raw.worldType === 'flat' ? 'flat' : 'island';
  const gameMode = resolveAllowedGameMode(worldType, raw.gameMode);
  const flatSurfaceStyle: FlatSurfaceStyle =
    raw.flatSurfaceStyle === 'concrete_plaza' ? 'concrete_plaza' : 'turf_grid';
  const defaultName =
    worldType === 'flat' ? 'Flat Park World' : 'Survival Island';
  return {
    ...raw,
    worldType,
    worldName:
      typeof raw.worldName === 'string' && raw.worldName.trim()
        ? raw.worldName.trim()
        : defaultName,
    flatSurfaceStyle: worldType === 'flat' ? flatSurfaceStyle : undefined,
    gameMode,
    coastersCount: typeof raw.coastersCount === 'number' ? raw.coastersCount : 0,
  };
}

export function listSaveSlots(): SaveSlotSummary[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(SAVE_INDEX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SaveSlotSummary[];
    return Array.isArray(parsed)
      ? parsed.map(normalizeSlotSummary).sort((a, b) => b.savedAt - a.savedAt)
      : [];
  } catch {
    return [];
  }
}

export function getLatestSaveSlot(): SaveSlotSummary | null {
  const slots = listSaveSlots();
  return slots.length > 0 ? slots[0] : null;
}

export function saveGameToSlot(data: GameSaveData): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const worldType: WorldType = data.worldType === 'flat' ? 'flat' : 'island';
    const gameMode = resolveAllowedGameMode(worldType, data.gameMode);
    const flatSurfaceStyle: FlatSurfaceStyle | undefined =
      worldType === 'flat'
        ? data.flatSurfaceStyle === 'concrete_plaza'
          ? 'concrete_plaza'
          : 'turf_grid'
        : undefined;
    const worldName =
      typeof data.worldName === 'string' && data.worldName.trim()
        ? data.worldName.trim()
        : worldType === 'flat'
          ? 'Flat Park World'
          : 'Survival Island';
    const normalizedData: GameSaveData = {
      ...data,
      worldType,
      worldName,
      flatSurfaceStyle,
      gameMode,
      coasters: Array.isArray(data.coasters) ? data.coasters : [],
    };
    const payload = JSON.stringify(normalizedData);
    window.localStorage.setItem(`${SAVE_SLOT_PREFIX}${data.slotId}`, payload);

    const existing = listSaveSlots().filter((s) => s.slotId !== data.slotId);
    const summary: SaveSlotSummary = {
      slotId: data.slotId,
      savedAt: data.savedAt,
      worldType,
      worldName,
      flatSurfaceStyle,
      gameMode,
      dayCount: data.dayCount,
      timeOfDay: data.timeOfDay,
      biome: data.visitedBiomes[data.visitedBiomes.length - 1] || 'beach',
      health: Math.round(data.player.vitals.health),
      structuresCount: data.structures.length,
      coastersCount: normalizedData.coasters?.length ?? 0,
      missionsCompleted: data.completedMissionIds.length,
    };
    window.localStorage.setItem(
      SAVE_INDEX_KEY,
      JSON.stringify([summary, ...existing].slice(0, 12)),
    );
    return true;
  } catch {
    return false;
  }
}

export function loadGameFromSlot(slotId: string): GameSaveData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(`${SAVE_SLOT_PREFIX}${slotId}`);
    if (!raw) return null;
    const data = JSON.parse(raw) as GameSaveData;
    if (data && data.player && Array.isArray(data.inventory)) {
      const worldType: WorldType = data.worldType === 'flat' ? 'flat' : 'island';
      data.worldType = worldType;
      data.gameMode = resolveAllowedGameMode(worldType, data.gameMode);
      data.worldName =
        typeof data.worldName === 'string' && data.worldName.trim()
          ? data.worldName.trim()
          : worldType === 'flat'
            ? 'Flat Park World'
            : 'Survival Island';
      if (worldType === 'flat') {
        data.flatSurfaceStyle =
          data.flatSurfaceStyle === 'concrete_plaza'
            ? 'concrete_plaza'
            : 'turf_grid';
      }
      if (!Array.isArray(data.coasters)) {
        data.coasters = [];
      }

      if (worldType === 'island') {
        // Guarantee island survivors retain starter essentials without resetting progress
        const hasGun = data.inventory.some((s) => s.itemId === 'gun');
        if (!hasGun) {
          data.inventory.unshift({ itemId: 'gun', quantity: 1 });
        }
        const hasKnife = data.inventory.some((s) => s.itemId === 'hunting_knife');
        if (!hasKnife) {
          data.inventory.splice(1, 0, { itemId: 'hunting_knife', quantity: 1 });
        }
        const hasSickle = data.inventory.some((s) => s.itemId === 'sickle');
        if (!hasSickle) {
          data.inventory.push({ itemId: 'sickle', quantity: 1 });
        }
        const hasAmmo = data.inventory.some((s) => s.itemId === 'ammo');
        if (!hasAmmo) {
          data.inventory.push({ itemId: 'ammo', quantity: 60 });
        } else {
          const ammoSlot = data.inventory.find((s) => s.itemId === 'ammo');
          if (ammoSlot && ammoSlot.quantity < 30) {
            ammoSlot.quantity = 60;
          }
        }
      }

      if (typeof data.coins !== 'number') {
        data.coins = 150;
      }
      if (!Array.isArray(data.plantedCrops)) {
        data.plantedCrops = [];
      }
      if (!Array.isArray(data.fridgeItems)) {
        data.fridgeItems = [
          { itemId: 'milk', quantity: 2 },
          { itemId: 'egg', quantity: 6 },
          { itemId: 'butter', quantity: 3 },
          { itemId: 'chocolate', quantity: 2 },
          { itemId: 'salt', quantity: 4 },
          { itemId: 'lettuce', quantity: 2 },
          { itemId: 'tomato', quantity: 2 },
        ];
      }

      if (worldType === 'island') {
        const baselineMaterials: { itemId: GameSaveData['inventory'][number]['itemId']; minQty: number }[] = [
          { itemId: 'wood', minQty: 4 },
          { itemId: 'branch', minQty: 4 },
          { itemId: 'stone', minQty: 4 },
          { itemId: 'flint', minQty: 3 },
          { itemId: 'fiber', minQty: 4 },
          { itemId: 'leaves', minQty: 3 },
          { itemId: 'grass', minQty: 3 },
          { itemId: 'clay', minQty: 2 },
          { itemId: 'metal_ore', minQty: 1 },
          { itemId: 'hide', minQty: 1 },
          { itemId: 'rope', minQty: 1 },
          { itemId: 'soap', minQty: 2 },
        ];
        for (const mat of baselineMaterials) {
          const current = data.inventory
            .filter((s) => s.itemId === mat.itemId)
            .reduce((sum, s) => sum + s.quantity, 0);
          if (current <= 0) {
            data.inventory.push({ itemId: mat.itemId, quantity: mat.minQty });
          }
        }

        const hasBottle = data.inventory.some(
          (s) =>
            s.itemId === 'dirty_water_bottle' ||
            s.itemId === 'filtered_water_bottle',
        );
        if (!hasBottle) {
          data.inventory.push({ itemId: 'dirty_water_bottle', quantity: 1 });
        }
      }

      if (!Array.isArray(data.player.hotbarItemIds) || data.player.hotbarItemIds.length === 0) {
        if (worldType === 'flat') {
          data.player.hotbarItemIds = [
            'coaster_station',
            'stone_block',
            'stone_arch',
            'stone_pillar',
            'timber_beam',
            'smart_tv',
            'vehicle_chassis_kit',
            'belt_pulley',
            null,
          ];
          data.player.equippedSlot = 0;
        } else {
          data.player.hotbarItemIds = [
            'gun',
            'hunting_knife',
            'ammo',
            null,
            'dirty_water_bottle',
            'sickle',
            null,
            null,
            null,
          ];
          const gunIdx = data.player.hotbarItemIds.indexOf('gun');
          if (gunIdx !== -1) {
            data.player.equippedSlot = gunIdx;
          }
        }
      }
      while (data.player.hotbarItemIds.length < 9) {
        data.player.hotbarItemIds.push(null);
      }
      if (data.player.hotbarItemIds.length > 5000) {
        data.player.hotbarItemIds = data.player.hotbarItemIds.slice(0, 5000);
      }
      if (!Array.isArray(data.backpackCompartments)) {
        data.backpackCompartments = [];
      }
      if (!data.weaponMagazines || typeof data.weaponMagazines !== 'object') {
        data.weaponMagazines = {};
      }
      if (typeof data.baseArmoryOpened !== 'boolean') {
        data.baseArmoryOpened = false;
      }
    }
    return data;
  } catch {
    return null;
  }
}

export function deleteSaveSlot(slotId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(`${SAVE_SLOT_PREFIX}${slotId}`);
    const filtered = listSaveSlots().filter((s) => s.slotId !== slotId);
    window.localStorage.setItem(SAVE_INDEX_KEY, JSON.stringify(filtered));
  } catch {
    // Ignore
  }
}
