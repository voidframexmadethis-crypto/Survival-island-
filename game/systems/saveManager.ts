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
    const data = JSON.parse(raw) as GameSaveData;
    if (data && data.player && Array.isArray(data.inventory)) {
      // Guarantee player always starts with gun, knife, ammo, and starter materials
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

      if (!Array.isArray(data.player.hotbarItemIds) || data.player.hotbarItemIds.length === 0) {
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
