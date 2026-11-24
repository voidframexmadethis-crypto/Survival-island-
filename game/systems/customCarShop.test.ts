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
  CARGO_SHIP_STEAM_IN_SECONDS,
  RED_CARGO_SHIP_VOYAGE_SECONDS,
  CUSTOM_SHOP_TRIP_OUT_SECONDS,
  CUSTOM_SHOP_LOAD_SECONDS,
  CUSTOM_SHOP_WORKERS,
  DEFAULT_CUSTOM_BUILD,
  DONOR_CARS,
  DONOR_DAMAGE,
  DONOR_SHELL_CRATE,
  DONOR_SOURCES,
  ENGINE_DRIVETRAIN_CRATE,
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
  createNpcBuild,
  formatCargoEta,
  getCargoEtaSeconds,
  getCargoSchedule,
  getCargoSupplyLabel,
  getCustomShopShellRemoval,
  getCustomShopTestDrivePoint,
  getCustomShopWorkerTool,
  getCustomShopFreightRoutePoint,
  getCustomShopLiftOffset,
  getCustomShopOverallProgress,
  getCustomShopPaintBoothTransfer,
  isCustomShopTestDrive,
  isCustomShopTrunkOpen,
  isOnCustomShopFreightRoute,
  markCustomShopComplete,
  matchDonorRequest,
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
  assert.equal(DONOR_SOURCES.length, 2);
  assert.ok(DONOR_SOURCES.some((source) => source.id === 'cave'));
  assert.ok(DONOR_SOURCES.some((source) => source.id === 'freight'));
  for (const donor of DONOR_CARS) {
    const damage = DONOR_DAMAGE[donor.id];
    assert.ok(damage.dents >= 2, `${donor.id} needs dents`);
    assert.ok(damage.rustHoles >= 1, `${donor.id} needs rust holes`);
    assert.ok(damage.summary.length > 20);
  }
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
  assert.equal(resolved.donorSource.id, 'cave');
  assert.equal(resolved.damage, DONOR_DAMAGE.impala_64);
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
    'doors',
    'quarter panels',
    'engine',
    'test drive',
  ]) {
    assert.ok(stageText.includes(requirement), `missing restoration stage: ${requirement}`);
  }
  assert.ok(CUSTOM_DONK_BUILD.accessories.length >= 8);
  assert.equal(CUSTOM_RESTORATION_STAGES.length, 19);
  const firstGated = CUSTOM_RESTORATION_STAGES.findIndex(
    (stage) => stage.requiresCrate !== undefined,
  );
  assert.ok(firstGated > 0);
  assert.ok(
    CUSTOM_RESTORATION_STAGES.slice(0, firstGated).every(
      (stage) => stage.requiresCrate === undefined,
    ),
  );
  assert.equal(
    CUSTOM_RESTORATION_STAGES[CUSTOM_RESTORATION_STAGES.length - 1].id,
    'road_test',
  );
  assert.ok(
    CUSTOM_RESTORATION_STAGES.some((stage) => stage.requiresCrate === 'engine_drivetrain'),
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

test('the fast Crescent City barge lands five crates in 30 seconds', () => {
  assert.equal(CARGO_SHIP_STEAM_IN_SECONDS, 30);
  assert.equal(RED_CARGO_SHIP_VOYAGE_SECONDS, 1800);
  const cargo = createCargoSupplyState();
  cargo.phase = 'steaming_in';
  advanceCargoSupply(cargo, 10);
  assert.ok(getCargoEtaSeconds(cargo) > 15);
  assert.equal(formatCargoEta(125), '2:05');
  assert.ok(getCargoSupplyLabel(cargo).includes('ETA 0:20'));

  const events = advanceCargoSupply(cargo, 500);
  const delivered = events.filter((event) => event.type === 'crate_delivered');
  assert.equal(CUSTOM_SHOP_PART_CRATES.length, 5);
  assert.equal(delivered.length, CUSTOM_SHOP_PART_CRATES.length);
  assert.deepEqual(
    cargo.deliveredCrateIds,
    CUSTOM_SHOP_PART_CRATES.map((crate) => crate.id),
  );
  assert.ok(cargo.deliveredCrateIds.includes(ENGINE_DRIVETRAIN_CRATE.id));
  assert.equal(cargo.phase, 'done');
  assert.ok(events.some((event) => event.type === 'cargo_arrived'));
  assert.ok(events.some((event) => event.type === 'cargo_departed'));
  assert.ok(events.some((event) => event.type === 'cargo_done'));
  assert.equal(getCargoSupplyLabel(cargo).includes('cleared the bayou'), true);
});

test('a freight donor puts the wrapped shell on the barge before the parts', () => {
  const freightBuild = { ...DEFAULT_CUSTOM_BUILD, donorSource: 'freight' as const };
  const schedule = getCargoSchedule(freightBuild);
  assert.equal(schedule[0], DONOR_SHELL_CRATE.id);
  assert.equal(schedule.length, CUSTOM_SHOP_PART_CRATES.length + 1);

  const state = createCustomShopState(freightBuild);
  assert.equal(beginCustomShopRestoration(state, 0), true);
  assert.equal(state.phase, 'waiting_donor');
  assert.equal(state.cargo.phase, 'steaming_in');
  assert.equal(state.cargo.crateIds[0], DONOR_SHELL_CRATE.id);

  // The shell only appears after the barge crossing and unloading.
  advanceCustomShopState(state, 30);
  assert.equal(state.phase, 'waiting_donor');
  const landed = advanceCustomShopState(state, 20);
  assert.equal(state.phase, 'restoring');
  assert.ok(landed.some((event) => event.type === 'donor_shell_landed'));
  assert.ok(state.cargo.deliveredCrateIds.includes(DONOR_SHELL_CRATE.id));
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
  for (let i = 0; i < 600 && state.phase !== 'complete'; i++) {
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
    state.cargo.crateIds.length,
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
  assert.equal(state.cargo.deliveredCrateIds.length, state.cargo.crateIds.length);
  assert.equal(advanceCustomShopState(state, 1).length, 0);
});

test('teardown removes trim, doors, panels and engine in a believable order', () => {
  const state = createCustomShopState();
  state.phase = 'restoring';
  const indexOf = (id: string) =>
    CUSTOM_RESTORATION_STAGES.findIndex((stage) => stage.id === id);

  state.stageIndex = indexOf('intake');
  let removal = getCustomShopShellRemoval(state);
  assert.equal(removal.trimOff, false);
  assert.equal(removal.doorsOff, false);
  assert.equal(removal.panelsOff, false);
  assert.equal(removal.engineOut, false);

  state.stageIndex = indexOf('strip_doors');
  removal = getCustomShopShellRemoval(state);
  assert.equal(removal.hoodOpen, true);
  assert.equal(removal.trunkOpen, true);
  assert.equal(removal.doorsOff, false);

  state.stageIndex = indexOf('engine_pull') + 1;
  removal = getCustomShopShellRemoval(state);
  assert.equal(removal.trimOff, true);
  assert.equal(removal.doorsOff, true);
  assert.equal(removal.panelsOff, true);
  assert.equal(removal.engineOut, true);

  state.stageIndex = indexOf('paint');
  removal = getCustomShopShellRemoval(state);
  assert.equal(removal.doorsOff, false);
  assert.equal(removal.panelsOff, false);

  state.stageIndex = indexOf('engine_install');
  assert.equal(getCustomShopShellRemoval(state).engineOut, false);
});

test('workers hold the right tool and the finished car goes on a road test', () => {
  const indexOf = (id: string) =>
    CUSTOM_RESTORATION_STAGES.findIndex((stage) => stage.id === id);
  const stageAt = (id: string) => CUSTOM_RESTORATION_STAGES[indexOf(id)];
  assert.equal(getCustomShopWorkerTool(stageAt('strip_panels')), 'hammer');
  assert.equal(getCustomShopWorkerTool(stageAt('hydraulics')), 'wrench');
  assert.equal(getCustomShopWorkerTool(stageAt('paint')), 'spray');
  assert.equal(getCustomShopWorkerTool(stageAt('detail')), 'polish');
  assert.equal(getCustomShopWorkerTool(stageAt('road_test')), 'none');

  const state = createCustomShopState();
  state.phase = 'restoring';
  state.stageIndex = indexOf('road_test');
  state.stageProgress = 0.5;
  assert.equal(isCustomShopTestDrive(state), true);
  const point = getCustomShopTestDrivePoint(state.stageProgress);
  assert.ok(Number.isFinite(point.x) && Number.isFinite(point.z));
  assert.ok(Number.isFinite(point.heading));
  assert.ok(
    getCustomShopTestDrivePoint(0).z !== getCustomShopTestDrivePoint(0.5).z ||
      getCustomShopTestDrivePoint(0).x !== getCustomShopTestDrivePoint(0.5).x,
  );
});

test('the shop computer matches a named car and lets the NPC crew surprise the player', () => {
  assert.equal(matchDonorRequest("I want a '64 Impala")?.id, 'impala_64');
  assert.equal(matchDonorRequest('96 Impala SS')?.id, 'impala_96');
  assert.equal(matchDonorRequest('box chevy on Daytons')?.id, 'caprice_74');
  assert.equal(matchDonorRequest('Buick Regal')?.id, 'regal_87');
  assert.equal(matchDonorRequest('Coupe de Ville')?.id, 'deville_79');
  assert.equal(matchDonorRequest('El Camino')?.id, 'elcamino_86');
  assert.equal(matchDonorRequest('Lincoln Town Car')?.id, 'towncar_03');
  assert.equal(matchDonorRequest('a banana'), null);

  const surprised = createNpcBuild("build me a '64 Impala", () => 0.1);
  assert.ok(surprised);
  assert.equal(surprised.requestedDonor.id, 'impala_64');
  assert.equal(surprised.surprise, true);
  assert.notEqual(surprised.actualDonor.id, 'impala_64');
  assert.equal(surprised.build.donorCarId, surprised.actualDonor.id);

  const straight = createNpcBuild("build me a '64 Impala", () => 0.99);
  assert.ok(straight);
  assert.equal(straight.surprise, false);
  assert.equal(straight.actualDonor.id, 'impala_64');
  assert.ok(straight.build.paintId.length > 0);
  assert.equal(createNpcBuild('a banana'), null);

  const randomPick = createNpcBuild('surprise me', () => 0.5);
  assert.ok(randomPick);
  assert.equal(randomPick.surprise, true);
});

test('the paint stage drives the car into the booth, closes the door and returns', () => {
  const state = createCustomShopState();
  state.phase = 'restoring';
  state.stageIndex = CUSTOM_RESTORATION_STAGES.findIndex(
    (stage) => stage.id === 'paint',
  );

  state.stageProgress = 0;
  let transfer = getCustomShopPaintBoothTransfer(state);
  assert.equal(transfer.active, true);
  assert.equal(transfer.inside, false);
  assert.equal(transfer.doorsClosed, false);

  state.stageProgress = 0.5;
  transfer = getCustomShopPaintBoothTransfer(state);
  assert.equal(transfer.inside, true);
  assert.equal(transfer.doorsClosed, true);
  assert.ok(transfer.x > 8.5);

  state.stageProgress = 0.55;
  const held = getCustomShopPaintBoothTransfer(state);
  assert.equal(held.x, transfer.x);
  assert.equal(held.z, transfer.z);

  state.stageProgress = 0.95;
  transfer = getCustomShopPaintBoothTransfer(state);
  assert.equal(transfer.inside, false);
  assert.equal(transfer.doorsClosed, false);

  state.stageIndex = CUSTOM_RESTORATION_STAGES.findIndex(
    (stage) => stage.id === 'engine_install',
  );
  assert.equal(getCustomShopPaintBoothTransfer(state).active, false);
  assert.ok(getCustomShopLiftOffset(state) > 0);
});
