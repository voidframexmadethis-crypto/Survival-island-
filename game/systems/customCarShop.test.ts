import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CUSTOM_DONK_BUILD,
  CUSTOM_RESTORATION_STAGES,
  CUSTOM_SHOP_GAP_FEET,
  CUSTOM_SHOP_HALF_WIDTH,
  CUSTOM_SHOP_TRIP_BACK_SECONDS,
  CUSTOM_SHOP_TRIP_OUT_SECONDS,
  CUSTOM_SHOP_LOAD_SECONDS,
  CUSTOM_SHOP_WORKERS,
  JUNKYARD_CAVE,
  advanceCustomShopState,
  beginCustomShopRestoration,
  createCustomShopState,
  getCustomShopOverallProgress,
  markCustomShopComplete,
} from './customCarShop';
import { caveSystem } from './caveSystem';
import {
  CUSTOM_SHOP_POS,
  ISLAND_PLAY_RADIUS,
  VEHICLE_GARAGE_POS,
} from '../world/terrain';

test('Bayou Royal Customs sits about 50 ft east of the Motor Atelier without overlapping it', () => {
  assert.ok(CUSTOM_SHOP_GAP_FEET > 45 && CUSTOM_SHOP_GAP_FEET < 55);
  assert.ok(
    CUSTOM_SHOP_POS.x - CUSTOM_SHOP_HALF_WIDTH >
      VEHICLE_GARAGE_POS.x + 19.1,
  );
  assert.equal(CUSTOM_SHOP_POS.z, VEHICLE_GARAGE_POS.z);
});

test('Cave 12 Salvage resolves to the nearest generated cave mouth', () => {
  caveSystem.generateIslandCaves({
    x: 0,
    z: 0,
    radius: Math.max(580, ISLAND_PLAY_RADIUS * 0.85),
  });
  const nearest = caveSystem.findNearestCave(CUSTOM_SHOP_POS.x, CUSTOM_SHOP_POS.z, 100);
  assert.ok(nearest);
  assert.equal(nearest.cave.id, JUNKYARD_CAVE.id);
  assert.ok(Math.hypot(nearest.cave.x - JUNKYARD_CAVE.x, nearest.cave.z - JUNKYARD_CAVE.z) < 0.05);
  assert.ok(nearest.distance < 50);
});

test('the shop has exactly two named restoration workers', () => {
  assert.equal(CUSTOM_SHOP_WORKERS.length, 2);
  assert.deepEqual(
    CUSTOM_SHOP_WORKERS.map((worker) => worker.name),
    ['Duke', 'Rae'],
  );
});

test('restoration covers paint, DONK hydraulics, upholstery, shifter, steering wheel, speakers, rims and headlights', () => {
  const stageText = CUSTOM_RESTORATION_STAGES.map(
    (stage) => `${stage.label} ${stage.detail}`,
  )
    .join(' ')
    .toLowerCase();
  for (const requirement of [
    'stripe',
    'donk',
    'hydraulic',
    'upholstery',
    'seats',
    'shifter',
    'steering wheel',
    'speaker',
    'rim',
    'headlight',
    'chrome',
  ]) {
    assert.ok(stageText.includes(requirement), `missing restoration stage: ${requirement}`);
  }
  assert.ok(CUSTOM_DONK_BUILD.accessories.length >= 8);
});

test('one real second advances the salvage trip by one second, not a whole phase', () => {
  const state = createCustomShopState();
  beginCustomShopRestoration(state, 0);
  advanceCustomShopState(state, 1);
  assert.equal(state.phase, 'outbound');
  assert.ok(Math.abs(state.tripProgress - 1 / CUSTOM_SHOP_TRIP_OUT_SECONDS) < 0.0001);
});

test('the autonomous cave retrieval and restoration loop completes with the custom build', () => {
  const state = createCustomShopState();
  assert.equal(beginCustomShopRestoration(state, 12), true);
  assert.equal(beginCustomShopRestoration(state, 12), false);
  assert.equal(state.phase, 'outbound');

  const events = advanceCustomShopState(state, CUSTOM_SHOP_TRIP_OUT_SECONDS);
  assert.equal(state.phase, 'loading');
  assert.ok(events.some((event) => event.type === 'donor_loaded'));

  advanceCustomShopState(state, CUSTOM_SHOP_LOAD_SECONDS);
  assert.equal(state.phase, 'inbound');
  const returnEvents = advanceCustomShopState(state, CUSTOM_SHOP_TRIP_BACK_SECONDS);
  assert.equal(state.phase, 'restoring');

  const seenStages = new Set<string>();
  for (const event of returnEvents) {
    if (event.type === 'stage_started') seenStages.add(event.stage.id);
  }
  let previousProgress = getCustomShopOverallProgress(state);
  for (let i = 0; i < 300 && state.phase !== 'complete'; i++) {
    const tick = advanceCustomShopState(state, 1);
    for (const event of tick) {
      if (event.type === 'stage_started') seenStages.add(event.stage.id);
    }
    const progress = getCustomShopOverallProgress(state);
    assert.ok(progress >= previousProgress);
    previousProgress = progress;
  }

  assert.equal(state.phase, 'complete');
  assert.equal(state.completed, true);
  assert.equal(getCustomShopOverallProgress(state), 1);
  assert.deepEqual(
    [...seenStages],
    CUSTOM_RESTORATION_STAGES.map((stage) => stage.id),
  );
});

test('marking a saved custom car complete restores the finished shop state', () => {
  const state = createCustomShopState();
  markCustomShopComplete(state);
  assert.equal(state.phase, 'complete');
  assert.equal(state.completed, true);
  assert.equal(advanceCustomShopState(state, 1).length, 0);
});
