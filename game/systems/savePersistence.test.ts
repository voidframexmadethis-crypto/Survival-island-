import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { GameSaveData, GameSettings } from '../types';
import {
  DEFAULT_SETTINGS,
  loadGameFromSlot,
  loadSettings,
  saveGameToSlot,
  saveSettings,
} from './saveManager';

function installStorage() {
  const values = new Map<string, string>();
  const localStorage = {
    getItem(key: string) {
      return values.has(key) ? values.get(key)! : null;
    },
    setItem(key: string, value: string) {
      values.set(key, String(value));
    },
    removeItem(key: string) {
      values.delete(key);
    },
    clear() {
      values.clear();
    },
    key(index: number) {
      return Array.from(values.keys())[index] ?? null;
    },
    get length() {
      return values.size;
    },
  };
  (globalThis as unknown as { window: unknown }).window = {
    localStorage,
    matchMedia: () => ({ matches: false }),
  };
  return { values, localStorage };
}

function makeSave(slotId: string): GameSaveData {
  return {
    version: 4,
    slotId,
    savedAt: 1_700_000_000_000,
    worldType: 'island',
    worldName: 'Verification Island',
    gameMode: 'survival',
    player: {
      x: 42.5,
      y: 3.25,
      z: -17.75,
      yaw: 1.25,
      pitch: -0.15,
      vitals: {
        health: 72,
        maxHealth: 100,
        hunger: 64,
        maxHunger: 100,
        thirst: 58,
        maxThirst: 100,
        stamina: 80,
        maxStamina: 100,
        temperatureC: 36.8,
      },
      equippedSlot: 2,
      hotbarItemIds: ['gun', 'hunting_knife', 'ammo', null, null, null, null, null, null],
      hudBarCapacity: 9,
    },
    dayCount: 12,
    timeOfDay: 0.64,
    dayNightMode: 'cycle',
    inventory: [
      { itemId: 'gun', quantity: 1 },
      { itemId: 'ammo', quantity: 48 },
      { itemId: 'wood', quantity: 120 },
      { itemId: 'totem_of_undying', quantity: 1 },
    ],
    backpackCompartments: [{ compartmentId: 7, itemId: 'stone', quantity: 24 }],
    structures: [
      {
        id: 'shelter_1',
        type: 'basic_shelter',
        x: 38,
        y: 3,
        z: -20,
        rotationY: 0.5,
        chestItems: [{ itemId: 'rope', quantity: 4 }],
        lit: true,
      },
    ],
    modularVehicles: [
      {
        id: 'car_1',
        name: 'Bayou Cruiser',
        paintColor: '#22c55e',
        x: 44,
        y: 3,
        z: -15,
        yaw: 0.1,
        vx: 0,
        vy: 0,
        vz: 0,
        hp: 100,
        maxHp: 100,
        fuel: 75,
        modules: [],
        cargoItems: [{ itemId: 'wood', quantity: 12 }],
      },
    ],
    mainland: {
      heat: 2,
      pursuitActive: false,
      pursuitSeconds: 0,
      escapeProgress: 0,
      pursuitUnits: 0,
      bustedCount: 1,
      takedowns: 3,
      escapes: 4,
      ownedProperties: ['magazine_safehouse', 'bayou_customs'],
      activeSafehouse: 'magazine_safehouse',
      lastIncomeDay: 11,
      lastSafehouseClaimDay: 11,
      lastVaultLootDay: 9,
      ownedUpgrades: ['armory_bench'],
      ownedPackages: ['stock', 'lowrider_64'],
      equippedPackage: 'lowrider_64',
      unlockedPoints: ['terminal'],
      activeOutfit: 'bayou_runner',
      driftScore: 240,
      bestDrift: 900,
      cityKilometers: 12.4,
      boatTrips: 3,
      vaultsLooted: 2,
      factionReputation: { creole_kings: 4 },
      claimedChallenges: ['first_ride'],
      crossWorldBosses: 1,
      crossWorldStructures: 5,
      crossWorldBloodMoons: 2,
      totalEarned: 5_000,
    },
    clearedStructureIds: ['woodland_mansion'],
    coins: 1_850,
    completedMissionIds: ['build_campfire', 'build_shelter'],
    stats: {
      treesChopped: 42,
      stonesMined: 18,
      itemsCrafted: 12,
      mealsCooked: 5,
      animalsHunted: 7,
      dinosaursEncountered: 2,
      fishCaught: 9,
      dolphinsBefriended: 1,
      footprintsInspected: 6,
      shipwreckCratesSearched: 3,
      freshWaterDrunk: 14,
      daysSurvived: 12,
    },
    visitedBiomes: ['beach', 'jungle'],
    discoveredLocations: ['Hilltop Shelter'],
    hudPreferences: { showCompass: false, compactHud: true },
    fridgeItems: [{ itemId: 'milk', quantity: 2 }],
    wardrobeItems: [{ itemId: 'soap', quantity: 3 }],
    plantedCrops: [],
    weaponMagazines: { gun: 12 },
    knifeSharpness: 0.7,
    baseArmoryOpened: true,
  };
}

test('world saves round-trip inventory, position, vehicles, properties, currency, achievements and HUD choices', () => {
  installStorage();
  const save = makeSave('world_island_verification');
  assert.equal(saveGameToSlot(save), true);

  // Refresh: load from the same browser storage, not from the in-memory object.
  const loaded = loadGameFromSlot(save.slotId);
  assert.ok(loaded);
  assert.equal(loaded.worldName, 'Verification Island');
  assert.deepEqual(
    { x: loaded.player.x, y: loaded.player.y, z: loaded.player.z, yaw: loaded.player.yaw },
    { x: 42.5, y: 3.25, z: -17.75, yaw: 1.25 },
  );
  assert.equal(loaded.player.equippedSlot, 2);
  assert.equal(loaded.player.hotbarItemIds[0], 'gun');
  assert.equal(loaded.inventory.find((slot) => slot.itemId === 'wood')?.quantity, 120);
  assert.equal(loaded.backpackCompartments?.[0].itemId, 'stone');
  assert.equal(loaded.structures[0].type, 'basic_shelter');
  assert.equal(loaded.structures[0].chestItems?.[0].quantity, 4);
  assert.equal(loaded.modularVehicles?.[0].name, 'Bayou Cruiser');
  assert.deepEqual(loaded.mainland?.ownedProperties, [
    'magazine_safehouse',
    'bayou_customs',
  ]);
  assert.equal(loaded.mainland?.activeSafehouse, 'magazine_safehouse');
  assert.deepEqual(loaded.clearedStructureIds, ['woodland_mansion']);
  assert.equal(loaded.coins, 1_850);
  assert.deepEqual(loaded.completedMissionIds, ['build_campfire', 'build_shelter']);
  assert.equal(loaded.stats.daysSurvived, 12);
  assert.deepEqual(loaded.hudPreferences, { showCompass: false, compactHud: true });
  assert.equal(loaded.fridgeItems?.[0].quantity, 2);
  assert.equal(loaded.wardrobeItems?.[0].quantity, 3);
  assert.equal(loaded.weaponMagazines?.gun, 12);
  assert.equal(loaded.baseArmoryOpened, true);
});

test('graphics and gameplay settings survive a refresh', () => {
  installStorage();
  const settings: GameSettings = {
    ...DEFAULT_SETTINGS,
    masterVolume: 0.35,
    sfxEnabled: false,
    graphicsQuality: 'high',
    graphicsPreset: 'high',
    shadowsEnabled: false,
    waterReflectionsEnabled: true,
    waterEffectsEnabled: false,
    postProcessingEnabled: false,
    particlesEnabled: true,
    drawDistance: 'far',
    vegetationDensity: 0.55,
    wildlifeDensity: 0.25,
    dynamicAutoFps: false,
    touchControlsMode: 'always',
    cameraSensitivity: 1.4,
    invertCameraY: true,
    showCompass: false,
    compactHud: true,
  };
  saveSettings(settings);
  const loaded = loadSettings();
  assert.equal(loaded.graphicsPreset, 'high');
  assert.equal(loaded.graphicsQuality, 'high');
  assert.equal(loaded.shadowsEnabled, false);
  assert.equal(loaded.waterEffectsEnabled, false);
  assert.equal(loaded.postProcessingEnabled, false);
  assert.equal(loaded.drawDistance, 'far');
  assert.equal(loaded.masterVolume, 0.35);
  assert.equal(loaded.touchControlsMode, 'always');
  assert.equal(loaded.cameraSensitivity, 1.4);
  assert.equal(loaded.invertCameraY, true);
  assert.equal(loaded.showCompass, false);
  assert.equal(loaded.compactHud, true);
});

test('a rejected settings write reports failure instead of claiming preferences were saved', () => {
  const { localStorage } = installStorage();
  const originalSetItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = (key: string, value: string) => {
    if (key === 'survival_island_settings_v1') {
      throw new Error('QuotaExceededError');
    }
    originalSetItem(key, value);
  };

  assert.equal(saveSettings(DEFAULT_SETTINGS), false);
});

test('a rejected storage write reports failure instead of claiming the save succeeded', () => {
  const { localStorage } = installStorage();
  const originalSetItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = (key: string, value: string) => {
    if (key.startsWith('survival_island_slot_v1_')) {
      throw new Error('QuotaExceededError');
    }
    originalSetItem(key, value);
  };

  assert.equal(saveGameToSlot(makeSave('world_island_quota')), false);
  assert.equal(loadGameFromSlot('world_island_quota'), null);
});
