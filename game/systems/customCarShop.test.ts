import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CUSTOM_DONK_BUILD,
  CUSTOM_FREIGHT_DOCK,
  CUSTOM_FREIGHT_ROUTE,
  CUSTOM_FREIGHT_SHIP_MOORING,
  CUSTOM_RESTORATION_STAGES,
  CUSTOM_SHOP_GAP_FEET,
  CUSTOM_SHOP_HALF_WIDTH,
  CUSTOM_SHOP_PART_CRATES,
  CUSTOM_SHOP_TRIP_BACK_SECONDS,
  CUSTOM_SHOP_TRIP_OUT_SECONDS,
  CUSTOM_SHOP_LOAD_SECONDS,
  CUSTOM_SHOP_WORKERS,
  DEFAULT_CUSTOM_BUILD,
  DONOR_CARS,
  HEADLIGHT_OPTIONS,
  INTERIOR_OPTIONS,
  JUNKYARD_CAVE,
  PAINT_OPTIONS,
  RIM_OPTIONS,
  ROOF_OPTIONS,
  STEERING_WHEEL_OPTIONS,
  UNDERCARRIAGE_OPTIONS,
  advanceCargoSupply,
  advanceCustomShopState,
  areCustomShopWheelsRemoved,
  beginCustomShopRestoration,
  createCargoSupplyState,
  createCustomShopState,
  getCargoSupplyLabel,
  getCustomShopFreightRoutePoint,
  getCustomShopLiftOffset,
  getCustomShopOverallProgress,
  isCustomShopTrunkOpen,
  isOnCustomShopFreightRoute,
  markCustomShopComplete,
  resolveCustomShopBuild,
} from './customCarShop';
import { caveSystem } from './caveSystem';
import {
  CUSTOM_SHOP_POS,
  ISLAND_PLAY_RADIUS,
  VEHICLE_GARAGE_POS,
  getTerrainHeight,
  getWaterLevelAt,
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

test('the build sheet offers real donors, Daytons, chain wheels, roofs and interiors', () => {
  assert.equal(DONOR_CARS.length, 7);
  assert.ok(DONOR_CARS.some((donor) => donor.preset === 'donk'));
  assert.ok(DONOR_CARS.some((donor) => donor.preset === 'lowrider'));
  assert.ok(RIM_OPTIONS.some((rim) => rim.label.includes('Dayton')));
  assert.ok(RIM_OPTIONS.some((rim) => rim.diameterInches === 30));
  assert.ok(STEERING_WHEEL_OPTIONS.some((wheel) => wheel.id === 'chain'));
  assert.ok(ROOF_OPTIONS.some((roof) => roof.id === 'ragtop' && roof.convertible));
  assert.ok(ROOF_OPTIONS.some((roof) => roof.id === 'landau'));
  assert.ok(INTERIOR_OPTIONS.length >= 4);
  assert.ok(PAINT_OPTIONS.length >= 4);
  assert.ok(HEADLIGHT_OPTIONS.length >= 3);
  assert.ok(UNDERCARRIAGE_OPTIONS.length >= 3);
});

test('resolving a build carries the chosen paint, rims, wheel, roof and interior', () => {
  const resolved = resolveCustomShopBuild({
    ...DEFAULT_CUSTOM_BUILD,
    donorCarId: 'impala_64',
    paintId: 'candy_teal',
    rimId: 'vogue_24',
    steeringWheelId: 'wood',
    roofId: 'ragtop',
    interiorId: 'oxblood_leather',
    headlightId: 'hid_projector',
    undercarriageId: 'airbag_notched',
  });
  assert.equal(resolved.donor.preset, 'lowrider');
  assert.equal(resolved.paint.label, 'Candy Teal');
  assert.equal(resolved.rims.diameterInches, 24);
  assert.equal(resolved.steeringWheel.id, 'wood');
  assert.equal(resolved.roof.id, 'ragtop');
  assert.equal(resolved.convertibleTop, true);
  assert.equal(resolved.interior.id, 'oxblood_leather');
  assert.equal(resolved.headlights.id, 'hid_projector');
  assert.equal(resolved.undercarriage.suspensionOffset, 0.62);
  assert.ok(resolved.name.includes('1964 Chevrolet Impala'));
  assert.ok(resolved.accessories.length >= 8);
  assert.equal(resolved.vehicleId, CUSTOM_DONK_BUILD.vehicleId);
});

test('restoration covers the real teardown, trunk hydraulics, undercarriage, interior, roof, rims, alignment and lights', () => {
  const stageText = CUSTOM_RESTORATION_STAGES.map(
    (stage) => `${stage.label} ${stage.detail}`,
  )
    .join(' ')
    .toLowerCase();
  for (const requirement of [
    'suspension',
    'teardown',
    'trunk',
    'pump',
    'cylinders',
    'batteries',
    'solenoids',
    'undercarriage',
    'frame',
    'rust',
    'pinstripe',
    'upholstery',
    'carpet',
    'headliner',
    'steering wheel',
    'glovebox',
    'roof',
    'rims',
    'tires',
    'alignment',
    'headlights',
    'rim detail',
  ]) {
    assert.ok(stageText.includes(requirement), `missing restoration stage: ${requirement}`);
  }
  assert.ok(CUSTOM_DONK_BUILD.accessories.length >= 8);
  assert.equal(CUSTOM_RESTORATION_STAGES.length, 13);
  assert.ok(
    CUSTOM_RESTORATION_STAGES.every((stage, index) =>
      index === 0 ? stage.requiresCrate === undefined : Boolean(stage.requiresCrate),
    ),
  );
});

test('the Crescent City barge moors on real water one forklift run from the shop', () => {
  const shipWater = getWaterLevelAt(
    CUSTOM_FREIGHT_SHIP_MOORING.x,
    CUSTOM_FREIGHT_SHIP_MOORING.z,
  );
  assert.ok(shipWater > 0.4);
  assert.ok(
    getTerrainHeight(
      CUSTOM_FREIGHT_SHIP_MOORING.x,
      CUSTOM_FREIGHT_SHIP_MOORING.z,
    ) < shipWater,
  );
  const pierDistance = Math.hypot(
    CUSTOM_FREIGHT_DOCK.x - CUSTOM_SHOP_POS.x,
    CUSTOM_FREIGHT_DOCK.z - CUSTOM_SHOP_POS.z,
  );
  assert.ok(pierDistance > 35 && pierDistance < 70);
  assert.ok(CUSTOM_FREIGHT_ROUTE.length >= 6);
  assert.ok(isOnCustomShopFreightRoute(CUSTOM_FREIGHT_ROUTE[2].x, CUSTOM_FREIGHT_ROUTE[2].z));
  const end = getCustomShopFreightRoutePoint(1);
  assert.ok(Math.hypot(end.x - 95.4, end.z - 149.8) < 0.1);
});

test('cargo advances from the bayou mouth to four delivered crates and a departure', () => {
  const cargo = createCargoSupplyState();
  cargo.phase = 'steaming_in';
  const events = advanceCargoSupply(cargo, 200);
  const delivered = events.filter((event) => event.type === 'crate_delivered');
  assert.equal(delivered.length, CUSTOM_SHOP_PART_CRATES.length);
  assert.deepEqual(
    cargo.deliveredCrateIds,
    CUSTOM_SHOP_PART_CRATES.map((crate) => crate.id),
  );
  assert.equal(cargo.phase, 'done');
  assert.ok(events.some((event) => event.type === 'cargo_arrived'));
  assert.ok(events.some((event) => event.type === 'cargo_departed'));
  assert.ok(events.some((event) => event.type === 'cargo_done'));
  assert.equal(getCargoSupplyLabel(cargo).includes('cleared the bayou'), true);
});

test('one real second advances the salvage trip by one second, not a whole phase', () => {
  const state = createCustomShopState();
  beginCustomShopRestoration(state, 0);
  advanceCustomShopState(state, 1);
  assert.equal(state.phase, 'outbound');
  assert.ok(Math.abs(state.tripProgress - 1 / CUSTOM_SHOP_TRIP_OUT_SECONDS) < 0.0001);
});

test('the full cave retrieval and build waits on parts but always finishes', () => {
  const state = createCustomShopState();
  assert.equal(beginCustomShopRestoration(state, 12), true);
  assert.equal(beginCustomShopRestoration(state, 12), false);
  assert.equal(state.phase, 'outbound');

  const events = advanceCustomShopState(state, CUSTOM_SHOP_TRIP_OUT_SECONDS);
  assert.equal(state.phase, 'loading');
  assert.ok(events.some((event) => event.type === 'donor_loaded'));

  advanceCustomShopState(state, CUSTOM_SHOP_LOAD_SECONDS);
  assert.equal(state.phase, 'inbound');
  advanceCustomShopState(state, CUSTOM_SHOP_TRIP_BACK_SECONDS);
  assert.equal(state.phase, 'restoring');

  const seenStages = new Set<string>();
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
  assert.equal(
    state.cargo.deliveredCrateIds.length,
    CUSTOM_SHOP_PART_CRATES.length,
  );
  assert.deepEqual(
    [...seenStages],
    CUSTOM_RESTORATION_STAGES.map((stage) => stage.id),
  );
  assert.ok(state.startedAt === 12);
});

test('a stage cannot start until its Crescent City crate is on the bay floor', () => {
  const state = createCustomShopState();
  state.phase = 'restoring';
  state.stageIndex = CUSTOM_RESTORATION_STAGES.findIndex(
    (stage) => stage.id === 'suspension',
  );
  state.stageAnnounced = false;

  const blocked = advanceCustomShopState(state, 1);
  assert.equal(state.waitingForParts, true);
  assert.equal(state.waitingForCrateId, 'suspension_hydraulics');
  assert.equal(state.stageProgress, 0);
  assert.equal(
    blocked.some((event) => event.type === 'stage_started'),
    false,
  );

  state.cargo.deliveredCrateIds.push('suspension_hydraulics');
  const unlocked = advanceCustomShopState(state, 0.5);
  assert.equal(state.waitingForParts, false);
  assert.ok(
    unlocked.some(
      (event) => event.type === 'stage_started' && event.stage.id === 'suspension',
    ),
  );
  assert.ok(state.stageProgress > 0);
});

test('lift, trunk and wheel animation state follow the teardown stages', () => {
  const state = createCustomShopState();
  state.phase = 'restoring';
  const indexOf = (id: string) =>
    CUSTOM_RESTORATION_STAGES.findIndex((stage) => stage.id === id);

  state.stageIndex = indexOf('suspension');
  assert.ok(getCustomShopLiftOffset(state) > 1);
  assert.equal(areCustomShopWheelsRemoved(state), true);
  assert.equal(isCustomShopTrunkOpen(state), false);

  state.stageIndex = indexOf('hydraulics');
  assert.equal(isCustomShopTrunkOpen(state), true);

  state.stageIndex = indexOf('rims');
  assert.equal(areCustomShopWheelsRemoved(state), false);
  assert.equal(getCustomShopLiftOffset(state), 0);

  state.phase = 'complete';
  assert.equal(getCustomShopLiftOffset(state), 0);
});

test('marking a saved custom car complete restores the finished shop state', () => {
  const state = createCustomShopState();
  markCustomShopComplete(state);
  assert.equal(state.phase, 'complete');
  assert.equal(state.completed, true);
  assert.equal(state.cargo.phase, 'done');
  assert.equal(state.cargo.deliveredCrateIds.length, CUSTOM_SHOP_PART_CRATES.length);
  assert.equal(advanceCustomShopState(state, 1).length, 0);
});
