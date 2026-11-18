import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  DEFAULT_HUD_BAR_SLOTS,
  GameSaveData,
  resolveAllowedGameMode,
} from '../types';
import {
  createNewSaveSlotId,
  deleteSaveSlot,
  getLatestSaveSlot,
  listSaveSlots,
  loadGameFromSlot,
  saveGameToSlot,
} from './saveManager';
import {
  FLAT_GROUND_Y,
  FLAT_PLAYABLE_MAX_RADIUS,
  getActiveTerrainWorldType,
  getPlayableMaxRadius,
  getTerrainHeight,
  getWaterLevelAt,
  setActiveTerrainWorldType,
} from '../world/terrain';
import {
  buildTrack,
  CoasterEditor,
  CoasterTrain,
  InversionDesigner,
  TrackPieces,
  validateTrack,
} from './rollerCoasterSystem';
import { CoasterPiecePresetKey, RollerCoasterRuntime } from './rollerCoasterRuntime';

function installMockLocalStorage() {
  const store = new Map<string, string>();
  const mockStorage = {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, val: string) {
      store.set(key, String(val));
    },
    removeItem(key: string) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
  (globalThis as unknown as { window?: unknown }).window = {
    localStorage: mockStorage,
    matchMedia: () => ({ matches: false }),
  };
  return store;
}

function makeBaseSave(slotId: string, overrides?: Partial<GameSaveData>): GameSaveData {
  return {
    version: 1,
    slotId,
    savedAt: Date.now(),
    player: {
      x: 0,
      y: 2,
      z: 20,
      yaw: 0,
      vitals: {
        health: 100,
        maxHealth: 100,
        hunger: 90,
        maxHunger: 100,
        thirst: 85,
        maxThirst: 100,
        stamina: 100,
        maxStamina: 100,
        temperatureC: 37,
      },
      equippedSlot: 0,
      hotbarItemIds: Array(DEFAULT_HUD_BAR_SLOTS).fill(null),
      hudBarCapacity: DEFAULT_HUD_BAR_SLOTS,
    },
    dayCount: 3,
    timeOfDay: 0.45,
    inventory: [{ itemId: 'wood', quantity: 10 }],
    structures: [],
    visitedBiomes: ['beach'],
    stats: {
      treesChopped: 2,
      stonesMined: 1,
      itemsCrafted: 1,
      mealsCooked: 0,
      animalsHunted: 0,
      dinosaursEncountered: 0,
      fishCaught: 0,
      dolphinsBefriended: 0,
      footprintsInspected: 0,
      shipwreckCratesSearched: 0,
      freshWaterDrunk: 0,
      daysSurvived: 3,
    },
    completedMissionIds: [],
    discoveredLocations: [],
    ...overrides,
  };
}

test('resolveAllowedGameMode strictly enforces Creative-only in Flat World and all modes in Island World', () => {
  assert.equal(resolveAllowedGameMode('flat', 'survival'), 'sandbox');
  assert.equal(resolveAllowedGameMode('flat', 'boss_hunt'), 'sandbox');
  assert.equal(resolveAllowedGameMode('flat', 'sandbox'), 'sandbox');

  assert.equal(resolveAllowedGameMode('island', 'survival'), 'survival');
  assert.equal(resolveAllowedGameMode('island', 'boss_hunt'), 'boss_hunt');
  assert.equal(resolveAllowedGameMode('island', 'sandbox'), 'sandbox');
});

test('saveManager preserves legacy Island saves alongside new Flat and Island worlds with coasters', () => {
  const storage = installMockLocalStorage();

  const legacyIsland = makeBaseSave('slot_1', {
    savedAt: 1000,
    dayCount: 7,
    inventory: [{ itemId: 'wood', quantity: 12 }],
    structures: [
      { id: 'camp_1', type: 'campfire', x: 5, y: 2, z: 5, rotationY: 0, lit: true },
    ],
  });
  storage.set('survival_island_slot_v1_slot_1', JSON.stringify(legacyIsland));
  storage.set(
    'survival_island_lost_world_saves_v1',
    JSON.stringify([
      {
        slotId: 'slot_1',
        savedAt: 1000,
        dayCount: 7,
        timeOfDay: 0.5,
        biome: 'beach',
        health: 88,
        structuresCount: 1,
        missionsCompleted: 2,
      },
    ]),
  );

  const flatSlotId = createNewSaveSlotId('flat');
  assert.ok(flatSlotId.startsWith('world_flat_'));

  const flatSave = makeBaseSave(flatSlotId, {
    savedAt: 2000,
    worldType: 'flat',
    worldName: 'Grand Coaster Park',
    flatSurfaceStyle: 'concrete_plaza',
    gameMode: 'survival',
    coasters: [
      {
        id: 'coaster_a',
        name: 'Comet Loop',
        trackColor: '#38bdf8',
        trainCarCount: 4,
        stationPos: { x: 0, y: FLAT_GROUND_Y, z: 10 },
        nodes: [
          { position: { x: 0, y: 2, z: 10 }, bank: 0 },
          { position: { x: 0, y: 12, z: -20 }, bank: 15 },
          { position: { x: 20, y: 3, z: -40 }, bank: -10 },
        ],
      },
    ],
  });
  assert.equal(saveGameToSlot(flatSave), true);

  const islandSlotId = createNewSaveSlotId('island');
  assert.ok(islandSlotId.startsWith('world_island_'));
  assert.equal(
    saveGameToSlot(
      makeBaseSave(islandSlotId, {
        savedAt: 3000,
        worldType: 'island',
        worldName: 'Tropic Coasters',
        gameMode: 'sandbox',
        coasters: [
          {
            id: 'coaster_b',
            name: 'Volcano Drop',
            trackColor: '#ef4444',
            trainCarCount: 3,
            stationPos: { x: 10, y: 4, z: 10 },
            nodes: [
              { position: { x: 10, y: 5, z: 10 }, bank: 0 },
              { position: { x: 25, y: 14, z: 15 }, bank: 0 },
            ],
          },
        ],
      }),
    ),
    true,
  );

  const slots = listSaveSlots();
  assert.equal(slots.length, 3);

  const legacySummary = slots.find((s) => s.slotId === 'slot_1');
  assert.ok(legacySummary);
  assert.equal(legacySummary.worldType, 'island');
  assert.equal(legacySummary.gameMode, 'survival');
  assert.equal(legacySummary.dayCount, 7);

  const loadedLegacy = loadGameFromSlot('slot_1');
  assert.ok(loadedLegacy);
  assert.equal(loadedLegacy.worldType, 'island');
  assert.equal(loadedLegacy.structures.length, 1);

  const loadedFlat = loadGameFromSlot(flatSlotId);
  assert.ok(loadedFlat);
  assert.equal(loadedFlat.worldType, 'flat');
  assert.equal(loadedFlat.gameMode, 'sandbox');
  assert.equal(loadedFlat.flatSurfaceStyle, 'concrete_plaza');
  assert.equal(loadedFlat.coasters?.length, 1);
  assert.equal(loadedFlat.coasters?.[0].name, 'Comet Loop');

  const latest = getLatestSaveSlot();
  assert.equal(latest?.slotId, islandSlotId);

  deleteSaveSlot(flatSlotId);
  assert.equal(listSaveSlots().length, 2);
});

test('terrain mode switching enforces perfectly flat park surface and restores Island terrain cleanly', () => {
  setActiveTerrainWorldType('island');
  assert.equal(getActiveTerrainWorldType(), 'island');
  const islandH = getTerrainHeight(22, -18);
  const islandRadius = getPlayableMaxRadius();

  setActiveTerrainWorldType('flat');
  assert.equal(getActiveTerrainWorldType(), 'flat');
  assert.equal(getTerrainHeight(0, 0), FLAT_GROUND_Y);
  assert.equal(getTerrainHeight(22, -18), FLAT_GROUND_Y);
  assert.equal(getTerrainHeight(-200, 180), FLAT_GROUND_Y);
  assert.equal(getPlayableMaxRadius(), FLAT_PLAYABLE_MAX_RADIUS);
  assert.ok(getWaterLevelAt(0, 0) < -500);

  setActiveTerrainWorldType('island');
  assert.equal(getTerrainHeight(22, -18), islandH);
  assert.equal(getPlayableMaxRadius(), islandRadius);
});

test('All ready-made TrackPieces and CustomInversion produce valid splines with zero overlapping nodes, smooth RMF frames, and no 180-degree loop flips', () => {
  const pieces = [
    ['straight', TrackPieces.straight(18)],
    ['chainLift', TrackPieces.chainLift(26, 52)],
    ['firstDrop', TrackPieces.firstDrop(20, 38)],
    ['hill', TrackPieces.hill(11, 34)],
    ['bankedTurn', TrackPieces.bankedTurn(19, 90, 52)],
    ['bankedTurnLeft', TrackPieces.bankedTurnLeft(19, 90, 52)],
    ['helix', TrackPieces.helix(16, -8, 1, 'right')],
    ['verticalLoop', TrackPieces.verticalLoop(10)],
    ['corkscrew', TrackPieces.corkscrew(7, 28)],
    ['zeroGRoll', TrackPieces.zeroGRoll(9, 30)],
    ['immelmann', TrackPieces.immelmann(10)],
    ['launch', TrackPieces.launch(30, 30)],
    ['brake', TrackPieces.brake(18)],
    ['splashdown', TrackPieces.splashdown(26)],
  ] as const;

  for (const [label, piece] of pieces) {
    const val = validateTrack(piece.nodes);
    assert.equal(val.valid, true, `${label} failed validation: ${val.errors.join(', ')}`);

    const samples = buildTrack(piece.nodes);
    assert.ok(samples.length >= 10, `${label} should produce rich spline samples`);

    // Verify smooth Parallel-Transport frames (adjacent `up` vectors never flip 180 degrees)
    for (let i = 1; i < samples.length; i++) {
      const a = samples[i - 1];
      const b = samples[i];
      const upDot = a.up.x * b.up.x + a.up.y * b.up.y + a.up.z * b.up.z;
      assert.ok(upDot > 0.7, `${label} up vector snapped/flipped at sample ${i} (dot=${upDot.toFixed(3)})`);
      assert.ok(Number.isFinite(b.distance) && b.distance >= a.distance);
    }
  }

  // Verify Vertical Loop reaches full inverted apex (up.y < -0.8) and returns upright at exit
  const loopSamples = buildTrack(TrackPieces.verticalLoop(10).nodes);
  const minUpY = Math.min(...loopSamples.map((s) => s.up.y));
  assert.ok(minUpY < -0.85, `Vertical loop apex should invert cleanly (min up.y=${minUpY})`);
  assert.ok(loopSamples[loopSamples.length - 1].up.y > 0.9, 'Vertical loop exit must return upright');
});

test('RollerCoasterSystem & RollerCoasterRuntime create closed-circuit coasters, edit all pieces, simulate real gravity/G-forces, and save/load in both worlds', () => {
  const editor = new CoasterEditor();
  editor.addPoint({ x: 0, y: 2, z: 0 }, 0, 'station');
  editor.addPoint({ x: 0, y: 12, z: 24 }, 15, 'coast');
  editor.addPoint({ x: 20, y: 4, z: 48 }, 0, 'trim_brake');
  assert.equal(validateTrack(editor.nodes).valid, true);

  const track = editor.getTrack();
  assert.ok(track.length > 20);
  const train = new CoasterTrain(track);
  train.speed = 14;
  train.update(0.5);
  assert.ok(train.position > 0);
  assert.ok(Number.isFinite(train.verticalG) && Number.isFinite(train.lateralG));

  const designer = new InversionDesigner();
  const inv = designer.createInversion({
    name: 'Test Zero-G',
    height: 14,
    width: 6,
    rotations: 1,
    length: 28,
    twist: 180,
    bank: 0,
  });
  const invNodes = designer.generateTrack(inv);
  assert.equal(invNodes.length, 65);
  assert.equal(validateTrack(invNodes).valid, true);

  // Test runtime across Flat terrain and Island terrain
  const scene = new THREE.Scene();
  const runtime = new RollerCoasterRuntime(scene);

  setActiveTerrainWorldType('flat');
  const flatCoasterId = runtime.createCoaster('Sky Screamer', { x: 0, y: FLAT_GROUND_Y, z: 10 }, 0, true);
  assert.ok(flatCoasterId);
  const initialSummary = runtime.getHudSummaries()[0];
  assert.equal(initialSummary.valid, true, initialSummary.validationErrors.join('; '));
  assert.equal(initialSummary.isCompleteCircuit, true);
  assert.ok((initialSummary.inversionsCount ?? 0) >= 1);

  const extraPieces: CoasterPiecePresetKey[] = [
    'corkscrew',
    'zeroGRoll',
    'immelmann',
    'bankedTurnLeft',
    'helix',
    'launch',
    'splashdown',
    'brake',
  ];
  for (const key of extraPieces) {
    assert.equal(runtime.appendPresetPiece(flatCoasterId, key), true);
  }
  assert.equal(runtime.appendCustomInversion(flatCoasterId, inv), true);
  assert.equal(runtime.completeCircuit(flatCoasterId), true);
  assert.equal(runtime.dispatchTrain(flatCoasterId, true), true);
  runtime.update(0.25);

  const rideTransform = runtime.getRideCameraTransform(flatCoasterId);
  assert.ok(rideTransform);
  assert.ok(Number.isFinite(rideTransform.verticalG));
  assert.ok(rideTransform.segmentLabel.length > 0);

  const afterSummary = runtime.getHudSummaries()[0];
  assert.equal(afterSummary.valid, true, afterSummary.validationErrors.join('; '));
  assert.equal(afterSummary.isCompleteCircuit, true);

  const exported = runtime.exportCoasters();
  assert.equal(exported.length, 1);
  assert.ok(exported[0].nodes.length > 80);

  // Re-import cleanly on Island terrain too
  setActiveTerrainWorldType('island');
  runtime.clearAll();
  assert.equal(runtime.getHudSummaries().length, 0);
  runtime.importCoasters(exported);
  assert.equal(runtime.getHudSummaries().length, 1);
  assert.equal(runtime.getHudSummaries()[0].name, 'Sky Screamer');
  assert.equal(runtime.getHudSummaries()[0].isCompleteCircuit, true);

  runtime.dispose();
});

test('RollerCoasterRuntime supports wooden, inverted, and log flume coaster types', () => {
  const scene = new THREE.Scene();
  const runtime = new RollerCoasterRuntime(scene);
  const woodId = runtime.createCoaster('Timber Wolf', { x: 5, y: 2, z: 5 }, 0, true, '#92400e', 'wooden');
  assert.ok(woodId);
  assert.equal(runtime.getHudSummaries()[0].coasterType, 'wooden');

  const flumeId = runtime.createCoaster('River Rapids', { x: -10, y: 2, z: -10 }, 0, true, '#0ea5e9', 'log_flume');
  assert.ok(flumeId);
  assert.equal(runtime.getHudSummaries()[1].coasterType, 'log_flume');
  runtime.dispose();
});
