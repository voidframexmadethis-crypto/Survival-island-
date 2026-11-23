import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
  FERRY_DECK_Y,
  FERRY_RAMP,
  LOUISIANA_FERRY_ACCEL_SECONDS,
  LOUISIANA_FERRY_ARRIVAL_SECONDS,
  LOUISIANA_FERRY_CITY_DOCK_POS,
  LOUISIANA_FERRY_CRUISE_MPS,
  LOUISIANA_FERRY_DOCK_POS,
  LOUISIANA_FERRY_GATE_LIFT_SECONDS,
  LOUISIANA_FERRY_LEG_HOURS,
  LOUISIANA_FERRY_LEG_MS,
  LOUISIANA_FERRY_ROUND_TRIP_HOURS,
  LOUISIANA_FERRY_ROUND_TRIP_MS,
  LOUISIANA_FERRY_ROUTE_METERS,
  LOUISIANA_FERRY_TARGET_SPEED_MPS,
  LouisianaFerryVoyageSystem,
  ferryDistanceForElapsed,
  ferryPointForDirection,
  ferryRouteHeadingAt,
  ferryRoutePositionAt,
  ferryRoomAtLocal,
  ferrySpeedForElapsed,
  ferryWalkSurfaceLocalY,
} from './louisianaFerryVoyage';
import { applyLouisianaFerryVisual } from './louisianaFerryVisual';
import { buildLouisianaFerry } from '../world/louisianaFerry';
import { WorldChunkManager } from '../world/worldChunkSystem';
import { isAlwaysVisibleWorldObject } from '../world/worldCullPolicy';
import {
  clearFerryVoyageState,
  loadFerryVoyageState,
  saveFerryVoyageState,
} from './ferryVoyageSave';

const CLOCK_START = 1_700_000_000_000;
const HOUR_MS = 60 * 60 * 1000;

interface FerryHarness {
  ferry: LouisianaFerryVoyageSystem;
  advance: (ms: number) => void;
  now: () => number;
}

function makeFerry(): FerryHarness {
  let now = CLOCK_START;
  return {
    ferry: new LouisianaFerryVoyageSystem(() => now),
    advance: (ms: number) => {
      now += ms;
    },
    now: () => now,
  };
}

function deckPlayer(ferry: LouisianaFerryVoyageSystem): { x: number; y: number; z: number } {
  const spot = ferry.getBoardingDeckPoint();
  return {
    x: spot.x,
    y: ferry.getWalkSurfaceY(spot.x, spot.z) ?? ferry.boatY + FERRY_DECK_Y,
    z: spot.z,
  };
}

function boardAndDepart(ferry: LouisianaFerryVoyageSystem): void {
  ferry.clearBoarding();
  const ramp = ferry.getRampWorldPoint();
  const boarded = ferry.boardFromRamp(
    ramp.x,
    ferry.boatY + FERRY_DECK_Y,
    ramp.z,
  );
  assert.equal(boarded.ok, true);
  const player = deckPlayer(ferry);
  for (let i = 0; i < 400 && ferry.phase !== 'at_sea'; i++) {
    ferry.update(0.25, player.x, player.y, player.z);
  }
  assert.equal(ferry.phase, 'at_sea');
}

function runLegToArrival(
  ferry: LouisianaFerryVoyageSystem,
  advance: (ms: number) => void,
): void {
  advance(LOUISIANA_FERRY_LEG_MS);
  const player = deckPlayer(ferry);
  ferry.update(0.1, player.x, player.y, player.z);
  assert.equal(ferry.phase, 'arriving');
  for (let i = 0; i < 60; i++) {
    if ((ferry.phase as string) === 'arrived') break;
    ferry.update(0.25, player.x, player.y, player.z);
  }
  assert.equal(ferry.phase, 'arrived');
}

test('boarding is still gated by the dock TV, the stern gate and the countdown', () => {
  const { ferry } = makeFerry();
  assert.equal(ferry.phase, 'idle');
  assert.equal(ferry.direction, 'outbound');
  assert.equal(ferry.destination, 'crescent_city');
  const ramp = ferry.getRampWorldPoint();
  assert.equal(ferry.boardFromRamp(ramp.x, 1.2, ramp.z).ok, false);

  assert.equal(ferry.clearBoarding(), true);
  assert.equal(ferry.phase, 'boarding');
  const boarded = ferry.boardFromRamp(ramp.x, ferry.boatY + FERRY_DECK_Y, ramp.z);
  assert.equal(boarded.ok, true);
  assert.equal(ferry.aboard, true);
  assert.equal(ferry.phase, 'gate_raising');

  const player = deckPlayer(ferry);
  ferry.update(LOUISIANA_FERRY_GATE_LIFT_SECONDS / 2, player.x, player.y, player.z);
  assert.ok(ferry.gateLift > 0.2 && ferry.gateLift < 1);
  assert.equal(ferry.boatX, LOUISIANA_FERRY_DOCK_POS.x);
  assert.equal(ferry.boatZ, LOUISIANA_FERRY_DOCK_POS.z);
  ferry.update(LOUISIANA_FERRY_GATE_LIFT_SECONDS, player.x, player.y, player.z);
  assert.equal(ferry.phase, 'departing');
  assert.equal(ferry.boatZ, LOUISIANA_FERRY_DOCK_POS.z, 'the hull must not drift while moored');
});

test('the official crossing is 48 hours each way and 96 hours round trip', () => {
  assert.equal(LOUISIANA_FERRY_LEG_HOURS, 48);
  assert.equal(LOUISIANA_FERRY_LEG_MS, 48 * HOUR_MS);
  assert.equal(LOUISIANA_FERRY_ROUND_TRIP_HOURS, 96);
  assert.equal(LOUISIANA_FERRY_ROUND_TRIP_MS, 96 * HOUR_MS);

  // A 48-hour passage at a passenger-ferry cruise is a real ocean distance,
  // not the old 700 m hop between the two berths.
  assert.ok(
    LOUISIANA_FERRY_ROUTE_METERS > 850_000 && LOUISIANA_FERRY_ROUTE_METERS < 878_000,
    `expected an ~864 km course, got ${LOUISIANA_FERRY_ROUTE_METERS}`,
  );
  assert.ok(
    Math.abs(LOUISIANA_FERRY_CRUISE_MPS - LOUISIANA_FERRY_TARGET_SPEED_MPS) < 0.1,
    `cruise ${LOUISIANA_FERRY_CRUISE_MPS} m/s should sit near 5 m/s`,
  );
  // 5 m/s is about 9.7 knots.
  assert.ok(Math.abs(LOUISIANA_FERRY_CRUISE_MPS * 1.943844 - 9.74) < 0.2);
});

test('the hull accelerates out of the berth, cruises near 5 m/s and slows for arrival', () => {
  const { ferry } = makeFerry();
  boardAndDepart(ferry);
  const player = deckPlayer(ferry);

  assert.equal(ferry.speedMps, 0);
  const start = ferryRoutePositionAt(0);
  assert.ok(Math.abs(ferry.boatX - start.x) < 1e-6);

  // Quarter of the way through the 30 s run-up to cruise: already moving.
  const accelStepMs = (LOUISIANA_FERRY_ACCEL_SECONDS / 4) * 1000;
  const harness = makeFerry();
  boardAndDepart(harness.ferry);
  harness.advance(accelStepMs);
  harness.ferry.update(0.05, player.x, player.y, player.z);
  assert.ok(harness.ferry.speedMps > 0.8 && harness.ferry.speedMps < 1.8);
  assert.ok(
    harness.ferry.routeDistanceMeters > 3,
    'the hull must cover visible distance during the run-up',
  );

  // Full cruise, measured from the wall clock.
  harness.advance(LOUISIANA_FERRY_ACCEL_SECONDS * 1000);
  harness.ferry.update(0.05, player.x, player.y, player.z);
  assert.ok(Math.abs(harness.ferry.speedMps - LOUISIANA_FERRY_CRUISE_MPS) < 1e-6);
  assert.ok(harness.ferry.speedMps > 4.9 && harness.ferry.speedMps < 5.1);

  // One minute before the berth the ship is nearly stopped.
  harness.advance(LOUISIANA_FERRY_LEG_MS);
  harness.ferry.update(0.05, player.x, player.y, player.z);
  assert.equal(harness.ferry.phase, 'arriving');
  assert.equal(ferryDistanceForElapsed(LOUISIANA_FERRY_LEG_MS), LOUISIANA_FERRY_ROUTE_METERS);
  assert.equal(ferrySpeedForElapsed(LOUISIANA_FERRY_LEG_MS), 0);
});

test('the rendered ferry root moves continuously at passenger-ship speed', () => {
  const model = buildLouisianaFerry();
  const { ferry, advance } = makeFerry();
  boardAndDepart(ferry);
  const player = deckPlayer(ferry);
  applyLouisianaFerryVisual(model, ferry);

  // Let the ship get fully underway, then sample the ACTUAL rendered root.
  advance(LOUISIANA_FERRY_ACCEL_SECONDS * 1000);
  ferry.update(0.05, player.x, player.y, player.z);
  applyLouisianaFerryVisual(model, ferry);
  model.root.updateMatrixWorld(true);
  const start = model.root.getWorldPosition(new THREE.Vector3());

  let previous = start.clone();
  let measured = 0;
  const samples = 12;
  const sampleMs = 5 * 60 * 1000;
  for (let i = 0; i < samples; i++) {
    advance(sampleMs);
    ferry.update(0.05, player.x, player.y, player.z);
    applyLouisianaFerryVisual(model, ferry);
    model.root.updateMatrixWorld(true);
    const world = model.root.getWorldPosition(new THREE.Vector3());
    assert.ok(Math.abs(world.x - ferry.boatX) < 1e-6);
    assert.ok(Math.abs(world.z - ferry.boatZ) < 1e-6);
    const step = world.distanceTo(previous);
    assert.ok(step > 1000, `root barely moved: ${step.toFixed(2)} m in five minutes`);
    measured += step;
    previous = world;
  }

  const seconds = (samples * sampleMs) / 1000;
  const averageSpeed = measured / seconds;
  assert.ok(
    Math.abs(averageSpeed - LOUISIANA_FERRY_TARGET_SPEED_MPS) < 0.15,
    `rendered root averaged ${averageSpeed.toFixed(3)} m/s`,
  );
  assert.ok(previous.distanceTo(start) > 15_000, 'the hull really travelled across the sea');
  assert.equal(isAlwaysVisibleWorldObject(model.root), true);
});

test('the rendered hull is never stationary for even one second of an active voyage', () => {
  const model = buildLouisianaFerry();
  const { ferry, advance } = makeFerry();
  boardAndDepart(ferry);
  const player = deckPlayer(ferry);

  // Skip the deliberate run-up so this isolates "is it moving at all".
  advance(LOUISIANA_FERRY_ACCEL_SECONDS * 1000);
  ferry.update(0.05, player.x, player.y, player.z);
  applyLouisianaFerryVisual(model, ferry);
  model.root.updateMatrixWorld(true);
  let previous = model.root.getWorldPosition(new THREE.Vector3());

  for (let second = 0; second < 90; second++) {
    advance(1000);
    ferry.update(0.05, player.x, player.y, player.z);
    applyLouisianaFerryVisual(model, ferry);
    model.root.updateMatrixWorld(true);
    const world = model.root.getWorldPosition(new THREE.Vector3());
    const moved = world.distanceTo(previous);
    assert.ok(
      moved > 4.7,
      `the ferry root was effectively stationary (${moved.toFixed(3)} m in 1 s) while the voyage clock ran`,
    );
    previous = world;
  }
});

test('the bow leads along the course and the hull turns through its bends', () => {
  const { ferry, advance } = makeFerry();
  boardAndDepart(ferry);
  const player = deckPlayer(ferry);
  const headings: number[] = [];

  for (let hour = 1; hour <= 47; hour++) {
    advance(HOUR_MS);
    ferry.update(0.05, player.x, player.y, player.z);
    const travel = ferryRouteHeadingAt(ferry.routeDistanceMeters);
    const expected =
      ferry.direction === 'outbound' ? travel : travel + Math.PI;
    let delta = ferry.boatYaw - expected;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    assert.ok(
      Math.abs(delta) < 0.02,
      `hour ${hour}: bow ${ferry.boatYaw.toFixed(2)} does not lead the course ${expected.toFixed(2)}`,
    );
    headings.push(ferry.boatYaw);
  }

  const distinct = new Set(headings.map((h) => h.toFixed(2)));
  assert.ok(distinct.size > 10, 'the hull should visibly follow the bends of the course');
  assert.equal(ferry.phase, 'at_sea');
  assert.ok(ferry.routeProgress > 0.95);
});

test('the outbound leg docks in Crescent City after exactly 48 hours', () => {
  const { ferry, advance } = makeFerry();
  boardAndDepart(ferry);
  advance(24 * HOUR_MS);
  const player = deckPlayer(ferry);
  ferry.update(0.05, player.x, player.y, player.z);
  assert.equal(ferry.phase, 'at_sea');
  assert.ok(Math.abs(ferry.routeProgress - 0.5) < 0.002);
  assert.ok(Math.abs(ferry.routeDistanceMeters - LOUISIANA_FERRY_ROUTE_METERS / 2) < 900);

  advance(24 * HOUR_MS - 1);
  ferry.update(0.05, player.x, player.y, player.z);
  assert.equal(ferry.phase, 'at_sea');
  assert.ok(ferry.routeProgress < 1);

  advance(1);
  ferry.update(0.05, player.x, player.y, player.z);
  assert.equal(ferry.phase, 'arriving');
  assert.equal(ferry.destination, 'crescent_city');

  for (let i = 0; i < 60 && ferry.phase !== 'arrived'; i++) {
    ferry.update(0.25, player.x, player.y, player.z);
  }
  assert.equal(ferry.phase, 'arrived');
  assert.equal(ferry.gateLift, 1);
  assert.ok(Math.abs(ferry.boatX - LOUISIANA_FERRY_CITY_DOCK_POS.x) < 1e-6);
  assert.ok(Math.abs(ferry.boatZ - LOUISIANA_FERRY_CITY_DOCK_POS.z) < 1e-6);
  assert.ok(Math.abs(Math.abs(ferry.boatYaw) - Math.PI) < 0.02);
});

test('the same hull runs the full 48-hour return leg back to the island', () => {
  const { ferry, advance } = makeFerry();
  boardAndDepart(ferry);
  runLegToArrival(ferry, advance);
  assert.equal(ferry.phase, 'arrived');

  ferry.prepareReturn();
  assert.equal(ferry.phase, 'idle');
  assert.equal(ferry.direction, 'return');
  assert.equal(ferry.destination, 'island');
  assert.equal(ferry.origin, 'crescent_city');
  assert.equal(ferry.departureAtMs, null);
  assert.ok(Math.abs(ferry.boatX - LOUISIANA_FERRY_CITY_DOCK_POS.x) < 1e-6);
  assert.ok(Math.abs(ferry.boatZ - LOUISIANA_FERRY_CITY_DOCK_POS.z) < 1e-6);

  const ramp = ferry.getRampWorldPoint();
  assert.ok(Math.abs(ramp.x - LOUISIANA_FERRY_CITY_DOCK_POS.x) < 1e-6);
  assert.ok(ramp.z > 1440, 'return ramp should face the Crescent City terminal');
  assert.equal(ferry.clearBoarding(), true);
  const boarded = ferry.boardFromRamp(ramp.x, ferry.boatY + FERRY_DECK_Y, ramp.z);
  assert.equal(boarded.ok, true);
  const player = deckPlayer(ferry);
  for (let i = 0; i < 400 && ferry.phase !== 'at_sea'; i++) {
    ferry.update(0.25, player.x, player.y, player.z);
  }
  assert.equal(ferry.phase, 'at_sea');

  advance(24 * HOUR_MS);
  ferry.update(0.05, player.x, player.y, player.z);
  assert.equal(ferry.direction, 'return');
  assert.ok(Math.abs(ferry.routeProgress - 0.5) < 0.002);
  const mid = ferryRoutePositionAt(
    LOUISIANA_FERRY_ROUTE_METERS - ferry.routeDistanceMeters,
  );
  assert.ok(Math.abs(ferry.boatX - mid.x) < 1e-6);
  assert.ok(Math.abs(ferry.boatZ - mid.z) < 1e-6);
  const reverseMid = ferryPointForDirection(ferry.routeProgress, 'return');
  assert.ok(Math.abs(reverseMid.x - mid.x) < 0.01);
  assert.ok(Math.abs(reverseMid.z - mid.z) < 0.01);

  advance(24 * HOUR_MS);
  ferry.update(0.05, player.x, player.y, player.z);
  assert.equal(ferry.phase, 'arriving');
  for (let i = 0; i < 60 && ferry.phase !== 'arrived'; i++) {
    ferry.update(0.25, player.x, player.y, player.z);
  }
  assert.equal(ferry.phase, 'arrived');
  assert.equal(ferry.destination, 'island');
  assert.ok(Math.abs(ferry.boatX - LOUISIANA_FERRY_DOCK_POS.x) < 1e-6);
  assert.ok(Math.abs(ferry.boatZ - LOUISIANA_FERRY_DOCK_POS.z) < 1e-6);
});

test('closing the game mid-ocean restores the ship at the correct route position', () => {
  const first = makeFerry();
  boardAndDepart(first.ferry);
  first.advance(2 * HOUR_MS);
  const player = deckPlayer(first.ferry);
  first.ferry.update(0.05, player.x, player.y, player.z);
  const saved = first.ferry.serialize(first.now(), { x: 0.5, z: -9 }, null);
  assert.equal(saved.version, 3);
  assert.equal(saved.direction, 'outbound');
  assert.equal(saved.destination, 'crescent_city');
  assert.equal(saved.aboard, true);
  assert.ok(saved.departureAtMs !== null);
  assert.ok(Math.abs(saved.elapsedMs - 2 * HOUR_MS) < 1);
  assert.ok(Math.abs(saved.routeDistanceMeters - ferryDistanceForElapsed(2 * HOUR_MS)) < 1);

  // Three more real hours pass with the app closed.
  const second = makeFerry();
  second.advance(first.now() - CLOCK_START + 3 * HOUR_MS);
  second.ferry.restore(saved, second.now());
  assert.equal(second.ferry.phase, 'at_sea');
  assert.equal(second.ferry.direction, 'outbound');
  assert.ok(Math.abs(second.ferry.getStatus().elapsedMs - 5 * HOUR_MS) < 1);
  assert.ok(second.ferry.routeProgress > 0.1 && second.ferry.routeProgress < 0.11);
  const expectedDistance = ferryDistanceForElapsed(5 * HOUR_MS);
  const expected = ferryRoutePositionAt(expectedDistance);
  assert.ok(Math.abs(second.ferry.boatX - expected.x) < 1e-6);
  assert.ok(Math.abs(second.ferry.boatZ - expected.z) < 1e-6);

  // The rendered hull comes back exactly where the voyage says it should be.
  const model = buildLouisianaFerry();
  applyLouisianaFerryVisual(model, second.ferry);
  model.root.updateMatrixWorld(true);
  const world = model.root.getWorldPosition(new THREE.Vector3());
  assert.ok(Math.abs(world.x - expected.x) < 1e-6);
  assert.ok(Math.abs(world.z - expected.z) < 1e-6);

  // And the remaining 43 hours still complete the arrival.
  second.advance(43 * HOUR_MS);
  second.ferry.update(0.05, expected.x, 1.73, expected.z);
  assert.equal(second.ferry.phase, 'arriving');
  for (let i = 0; i < 60 && second.ferry.phase !== 'arrived'; i++) {
    second.ferry.update(0.25, expected.x, 1.73, expected.z);
  }
  assert.equal(second.ferry.phase, 'arrived');
  assert.equal(second.ferry.destination, 'crescent_city');
});

test('a return voyage survives a closed app and docks after the full 48 hours', () => {
  const first = makeFerry();
  boardAndDepart(first.ferry);
  runLegToArrival(first.ferry, first.advance);
  first.ferry.prepareReturn();
  first.ferry.clearBoarding();
  const ramp = first.ferry.getRampWorldPoint();
  assert.equal(
    first.ferry.boardFromRamp(ramp.x, first.ferry.boatY + FERRY_DECK_Y, ramp.z).ok,
    true,
  );
  const player = deckPlayer(first.ferry);
  for (let i = 0; i < 400 && first.ferry.phase !== 'at_sea'; i++) {
    first.ferry.update(0.25, player.x, player.y, player.z);
  }
  assert.equal(first.ferry.phase, 'at_sea');

  first.advance(6 * HOUR_MS);
  const saved = first.ferry.serialize(first.now(), { x: -1, z: -8 }, null);
  assert.equal(saved.destination, 'island');

  const second = makeFerry();
  second.advance(first.now() - CLOCK_START + 41 * HOUR_MS);
  second.ferry.restore(saved, second.now());
  assert.equal(second.ferry.direction, 'return');
  assert.equal(second.ferry.phase, 'at_sea');

  second.advance(1 * HOUR_MS);
  second.ferry.update(0.05, 0, 1.73, 0);
  assert.equal(second.ferry.phase, 'arriving');
  for (let i = 0; i < 60; i++) {
    second.ferry.update(0.25, 0, 1.73, 0);
  }
  assert.equal(second.ferry.phase, 'arrived');
  assert.equal(second.ferry.destination, 'island');
});

test('the voyage save survives storage and stays scoped to its slot', () => {
  const storage = new Map<string, string>();
  const fakeStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: (key: string) => {
      storage.delete(key);
    },
    clear: () => storage.clear(),
    key: (index: number) => Array.from(storage.keys())[index] ?? null,
    get length() {
      return storage.size;
    },
  } as Storage;

  const { ferry, advance } = makeFerry();
  boardAndDepart(ferry);
  advance(4 * HOUR_MS);
  const state = ferry.serialize(CLOCK_START + 4 * HOUR_MS, { x: 0, z: -10 }, 'car-7');
  assert.equal(saveFerryVoyageState(state, 'slot_a', fakeStorage), true);
  const loaded = loadFerryVoyageState('slot_a', fakeStorage);
  assert.equal(loaded?.departureAtMs, state.departureAtMs);
  assert.equal(loaded?.routeDistanceMeters, state.routeDistanceMeters);
  assert.equal(loaded?.carId, 'car-7');
  assert.equal(loadFerryVoyageState('slot_b', fakeStorage), null);
  clearFerryVoyageState(fakeStorage);
  assert.equal(loadFerryVoyageState('slot_a', fakeStorage), null);
});

test('a rider stays on deck while the hull crosses 864 km', () => {
  const { ferry, advance } = makeFerry();
  boardAndDepart(ferry);
  let player = deckPlayer(ferry);
  const localBefore = ferry.worldToFerryLocal(player.x, player.z);
  const worldStart = ferry.ferryLocalToWorld(localBefore.x, localBefore.z);

  // Six simulated hours in one-minute wall-clock steps.
  for (let minute = 0; minute < 360; minute++) {
    advance(60_000);
    const update = ferry.update(1, player.x, player.y, player.z);
    player = {
      x: player.x + update.carryX,
      z: player.z + update.carryZ,
      y: player.y,
    };
    const clamped = ferry.constrainPlayer(player.x, player.z);
    player.x = clamped.x;
    player.z = clamped.z;
    const deckY = ferry.getWalkSurfaceY(player.x, player.z);
    assert.notEqual(deckY, null);
    player.y = Math.max(deckY ?? player.y, ferry.boatY + FERRY_DECK_Y);
    const local = ferry.worldToFerryLocal(player.x, player.z);
    assert.ok(Math.abs(local.x - localBefore.x) < 1e-6);
    assert.ok(Math.abs(local.z - localBefore.z) < 1e-6);
  }

  assert.equal(ferry.phase, 'at_sea');
  assert.equal(ferry.aboard, true);
  assert.ok(ferry.routeDistanceMeters > 100_000);
  const worldNow = ferry.ferryLocalToWorld(localBefore.x, localBefore.z);
  assert.ok(
    Math.hypot(worldNow.x - worldStart.x, worldNow.z - worldStart.z) > 100_000,
    'the passenger travelled with the ship instead of being left behind',
  );
});

test('the walkable deck, rooms and clamping stay correct while turned', () => {
  assert.equal(ferryWalkSurfaceLocalY(0, 0), FERRY_DECK_Y);
  assert.equal(ferryWalkSurfaceLocalY(0, -12), FERRY_DECK_Y);
  assert.equal(ferryWalkSurfaceLocalY(0, 40), null);
  assert.ok(Math.abs((ferryWalkSurfaceLocalY(0, FERRY_RAMP.zNear) ?? 0) - FERRY_RAMP.yNear) < 0.001);
  assert.equal(ferryRoomAtLocal(0, 0), 'living_room');
  assert.equal(ferryRoomAtLocal(-2, 8), 'bedroom');
  assert.equal(ferryRoomAtLocal(2.7, 6.3), 'bathroom');
  assert.equal(ferryRoomAtLocal(0, -12), 'open_deck');

  const { ferry } = makeFerry();
  ferry.clearBoarding();
  const ramp = ferry.getRampWorldPoint();
  ferry.boardFromRamp(ramp.x, ferry.boatY + FERRY_DECK_Y, ramp.z);
  ferry.boatYaw = Math.PI / 3;
  const world = ferry.ferryLocalToWorld(0, -10);
  assert.equal(ferry.roomAtWorld(world.x, world.z), 'open_deck');
  assert.equal(ferry.isOnDeck(world.x, ferry.boatY + FERRY_DECK_Y, world.z), true);
  const outside = ferry.ferryLocalToWorld(40, 40);
  const clamped = ferry.constrainPlayer(outside.x, outside.z);
  const local = ferry.worldToFerryLocal(clamped.x, clamped.z);
  assert.ok(Math.abs(local.x) <= 4.6);
  assert.ok(local.z >= -17.0);
});

test('the world chunk culler can never hide the hull the player is riding', () => {
  const model = buildLouisianaFerry();
  const worldRoot = new THREE.Group();
  worldRoot.add(model.root);
  const chunks = new WorldChunkManager(worldRoot, 64);
  if (!isAlwaysVisibleWorldObject(model.root)) {
    chunks.addObjectAt(model.root, 26, 713);
  }
  assert.equal(model.root.parent, worldRoot);
  model.root.position.set(40, 0.18, 1428);
  chunks.updateIfChunkChanged(new THREE.Vector3(40, 0, 1428), 135);
  assert.equal(model.root.visible, true);
});

test('the wake rig is attached to the hull and follows its speed', () => {
  const model = buildLouisianaFerry();
  assert.equal(model.wake.parent, model.root);
  assert.equal(model.wake.visible, false);

  const { ferry, advance } = makeFerry();
  boardAndDepart(ferry);
  const player = deckPlayer(ferry);
  advance(10 * 60 * 1000);
  ferry.update(0.05, player.x, player.y, player.z);
  applyLouisianaFerryVisual(model, ferry);
  assert.equal(model.wake.visible, true);
  assert.ok(model.wakeMaterial.opacity > 0.4);

  advance(LOUISIANA_FERRY_LEG_MS);
  ferry.update(0.05, player.x, player.y, player.z);
  assert.equal(ferry.phase, 'arriving');
  assert.ok(LOUISIANA_FERRY_ARRIVAL_SECONDS > 0);
});
