import { GameSaveData, GameSettings, SaveSlotSummary } from '../types';

const SAVE_INDEX_KEY = 'survival_island_lost_world_saves_v1';
const SAVE_SLOT_PREFIX = 'survival_island_slot_v1_';
const SETTINGS_KEY = 'survival_island_settings_v1';

export const DEFAULT_SETTINGS: GameSettings = {
  masterVolume: 0.7,
  sfxEnabled: true,
  ambienceEnabled: true,
  graphicsQuality: 'high',
  touchControlsMode: 'auto',
  cameraSensitivity: 1.0,
  invertCameraY: false,
  showCompass: true,
  compactHud: false,
};

export function loadSettings(): GameSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
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

export function listSaveSlots(): SaveSlotSummary[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(SAVE_INDEX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SaveSlotSummary[];
    return Array.isArray(parsed)
      ? parsed.sort((a, b) => b.savedAt - a.savedAt)
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
    const payload = JSON.stringify(data);
    window.localStorage.setItem(`${SAVE_SLOT_PREFIX}${data.slotId}`, payload);

    const existing = listSaveSlots().filter((s) => s.slotId !== data.slotId);
    const summary: SaveSlotSummary = {
      slotId: data.slotId,
      savedAt: data.savedAt,
      dayCount: data.dayCount,
      timeOfDay: data.timeOfDay,
      biome: data.visitedBiomes[data.visitedBiomes.length - 1] || 'beach',
      health: Math.round(data.player.vitals.health),
      structuresCount: data.structures.length,
      missionsCompleted: data.completedMissionIds.length,
    };
    window.localStorage.setItem(
      SAVE_INDEX_KEY,
      JSON.stringify([summary, ...existing].slice(0, 6)),
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
    return JSON.parse(raw) as GameSaveData;
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
