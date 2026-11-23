import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
  FERRY_DECK_Y,
  FERRY_RAMP,
  LOUISIANA_FERRY_ARRIVAL_SECONDS,
  LOUISIANA_FERRY_GATE_LIFT_SECONDS,
  LOUISIANA_FERRY_LEG_HOURS,
  LOUISIANA_FERRY_LEG_MS,
  LOUISIANA_FERRY_ROUND_TRIP_HOURS,
  LOUISIANA_FERRY_ROUND_TRIP_MS,
  LOUISIANA_FERRY_ROUTE,
  LouisianaFerryVoyageSystem,
  ferryPointForDirection,
  ferryRoomAtLocal,
  ferryRouteHeading,
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
  for (let i = 0; i < 40; i++) {
    ferry.update(0.25, player.x, player.y, player.z);
  }
  assert.equal(ferry.phase, 'arrived');
}

test('the dock TV clears boarding before the outbound Crescent Star can be boarded', () => {
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
});

test('the stern gate lifts fully before the countdown and departure', () => {
  const { ferry } = makeFerry();
  ferry.clearBoarding();
  const ramp = ferry.getRampWorldPoint();
  ferry.boardFromRamp(ramp.x, ferry.boatY + FERRY_DECK_Y, ramp.z);
  const player = deckPlayer(ferry);

  const half = ferry.update(LOUISIANA_FERRY_GATE_LIFT_SECONDS / 2, player.x, player.y, player.z);
  assert.equal(half.gateOpened, false);
  assert.ok(ferry.gateLift > 0.2 && ferry.gateLift < 1);
  assert.equal(ferry.boatZ, 713);

  const raised = ferry.update(LOUISIANA_FERRY_GATE_LIFT_SECONDS, player.x, player.y, player.z);
  assert.equal(raised.gateOpened, true);
  assert.equal(ferry.phase, 'departing');
  assert.ok(ferry.getStatus().secondsToDeparture > 0);
  assert.equal(ferry.boatZ, 713, 'the hull must not drift during the countdown');

  for (let i = 0; i < 40 && ferry.phase === 'departing'; i++) {
    ferry.update(0.25, player.x, player.y, player.z);
  }
  assert.equal(ferry.phase, 'at_sea');
  assert.ok(typeof ferry.departureAtMs === 'number');
});

test('the official crossing is nine real hours and the hull moves continuously the whole time', () => {
  assert.equal(LOUISIANA_FERRY_LEG_HOURS, 9);
  assert.equal(LOUISIANA_FERRY_LEG_MS, 9 * 60 * 60 * 1000);
  assert.equal(LOUISIANA_FERRY_ROUND_TRIP_HOURS, 18);
  assert.equal(LOUISIANA_FERRY_ROUND_TRIP_MS, 18 * 60 * 60 * 1000);

  const { ferry, advance } = makeFerry();
  boardAndDepart(ferry);
  let player = deckPlayer(ferry);
  const startX = ferry.boatX;
  const startZ = ferry.boatZ;

  const checkpoints = [1, 2, 4, 6, 8];
  let previousProgress = 0;
  let previousHour = 0;
  let previousX = startX;
  let previousZ = startZ;
  for (const hour of checkpoints) {
    advance((hour - previousHour) * 60 * 60 * 1000);
    previousHour = hour;
    const update = ferry.update(0.05, player.x, player.y, player.z);
    assert.ok(ferry.routeProgress > previousProgress);
    assert.ok(Math.hypot(ferry.boatX - previousX, ferry.boatZ - previousZ) > 1);
    assert.ok(Math.abs(ferry.routeProgress - hour / 9) < 0.002);
    player = {
      x: player.x + update.carryX,
      y: ferry.getWalkSurfaceY(player.x + update.carryX, player.z + update.carryZ) ?? player.y,
      z: player.z + update.carryZ,
    };
    previousProgress = ferry.routeProgress;
    previousX = ferry.boatX;
    previousZ = ferry.boatZ;
  }
  assert.ok(Math.hypot(ferry.boatX - startX, ferry.boatZ - startZ) > 200);
  assert.equal(ferry.getStatus().remainingMs, LOUISIANA_FERRY_LEG_MS - 8 * 60 * 60 * 1000);

  advance(60 * 60 * 1000);
  ferry.update(0.05, player.x, player.y, player.z);
  assert.equal(ferry.phase, 'arriving');
  assert.equal(ferry.routeProgress, 1);
});

test('the outbound leg arrives at Crescent City after exactly nine hours', () => {
  const { ferry, advance } = makeFerry();
  boardAndDepart(ferry);
  advance(8 * 60 * 60 * 1000);
  const player = deckPlayer(ferry);
  ferry.update(0.05, player.x, player.y, player.z);
  assert.equal(ferry.phase, 'at_sea');

  advance(60 * 60 * 1000 - 1);
  ferry.update(0.05, player.x, player.y, player.z);
  assert.equal(ferry.phase, 'at_sea');
  assert.ok(ferry.routeProgress < 1);

  advance(1);
  ferry.update(0.05, player.x, player.y, player.z);
  assert.equal(ferry.phase, 'arriving');
  assert.equal(ferry.destination, 'crescent_city');

  for (let i = 0; i < 40 && ferry.phase !== 'arrived'; i++) {
    ferry.update(0.25, player.x, player.y, player.z);
  }
  assert.equal(ferry.phase, 'arrived');
  assert.equal(ferry.gateLift, 1);
  const city = LOUISIANA_FERRY_ROUTE[LOUISIANA_FERRY_ROUTE.length - 1];
  assert.ok(Math.abs(ferry.boatX - city.x) < 1e-9);
  assert.ok(Math.abs(ferry.boatZ - city.z) < 1e-9);
  assert.equal(ferry.destination, 'crescent_city');
});

test('the same hull runs the nine-hour return leg back to the island', () => {
  const { ferry, advance } = makeFerry();
  boardAndDepart(ferry);
  runLegToArrival(ferry, advance);
  assert.equal(ferry.phase, 'arrived');

  // Disembark at the city: the hull stays berthed for the return.
  ferry.prepareReturn();
  assert.equal(ferry.phase, 'idle');
  assert.equal(ferry.direction, 'return');
  assert.equal(ferry.destination, 'island');
  assert.equal(ferry.origin, 'crescent_city');
  assert.equal(ferry.departureAtMs, null);
  assert.ok(Math.abs(ferry.boatZ - 1428) < 1e-9);

  const ramp = ferry.getRampWorldPoint();
  assert.ok(Math.abs(ramp.x - 40) < 1e-6);
  assert.ok(ramp.z > 1440, 'return ramp should face the Crescent City terminal');
  assert.equal(ferry.clearBoarding(), true);
  const boarded = ferry.boardFromRamp(ramp.x, ferry.boatY + FERRY_DECK_Y, ramp.z);
  assert.equal(boarded.ok, true);
  const player = deckPlayer(ferry);
  for (let i = 0; i < 400 && ferry.phase !== 'at_sea'; i++) {
    ferry.update(0.25, player.x, player.y, player.z);
  }
  assert.equal(ferry.phase, 'at_sea');
  assert.equal(ferry.direction, 'return');

  advance(4.5 * 60 * 60 * 1000);
  ferry.update(0.05, player.x, player.y, player.z);
  assert.ok(Math.abs(ferry.routeProgress - 0.5) < 0.002);
  const mid = ferryPointForDirection(0.5, 'return');
  assert.ok(Math.abs(ferry.boatX - mid.x) < 1e-6);
  assert.ok(Math.abs(ferry.boatZ - mid.z) < 1e-6);

  advance(4.5 * 60 * 60 * 1000);
  ferry.update(0.05, player.x, player.y, player.z);
  assert.equal(ferry.phase, 'arriving');
  for (let i = 0; i < 60 && ferry.phase !== 'arrived'; i++) {
    ferry.update(0.25, player.x, player.y, player.z);
  }
  assert.equal(ferry.phase, 'arrived');
  assert.equal(ferry.destination, 'island');
  assert.ok(Math.abs(ferry.boatX - LOUISIANA_FERRY_ROUTE[0].x) < 1e-9);
  assert.ok(Math.abs(ferry.boatZ - LOUISIANA_FERRY_ROUTE[0].z) < 1e-9);
});

test('a saved voyage resumes from its departure timestamp instead of restarting', () => {
  const first = makeFerry();
  boardAndDepart(first.ferry);
  first.advance(2 * 60 * 60 * 1000);
  const player = deckPlayer(first.ferry);
  const saved = first.ferry.serialize(first.now(), { x: 0.5, z: -9 }, null);
  assert.equal(saved.version, 2);
  assert.equal(saved.direction, 'outbound');
  assert.equal(saved.aboard, true);
  assert.ok(saved.departureAtMs !== null);
  assert.ok(Math.abs(saved.elapsedMs - 2 * 60 * 60 * 1000) < 1);

  // Three more real hours pass with the app closed.
  const second = makeFerry();
  second.advance(first.now() - CLOCK_START + 3 * 60 * 60 * 1000);
  second.ferry.restore(saved, second.now());
  assert.equal(second.ferry.phase, 'at_sea');
  assert.equal(second.ferry.direction, 'outbound');
  assert.ok(Math.abs(second.ferry.getStatus().elapsedMs - 5 * 60 * 60 * 1000) < 1);
  assert.ok(Math.abs(second.ferry.routeProgress - 5 / 9) < 1e-6);
  const expected = ferryPointForDirection(5 / 9, 'outbound');
  assert.ok(Math.abs(second.ferry.boatX - expected.x) < 1e-9);
  assert.ok(Math.abs(second.ferry.boatZ - expected.z) < 1e-9);

  // Four more hours and the same voyage docks without ever resetting.
  second.advance(4 * 60 * 60 * 1000);
  second.ferry.update(0.05, expected.x, 1.73, expected.z);
  assert.equal(second.ferry.phase, 'arriving');
  for (let i = 0; i < 60 && second.ferry.phase !== 'arrived'; i++) {
    second.ferry.update(0.25, expected.x, 1.73, expected.z);
  }
  assert.equal(second.ferry.phase, 'arrived');
  assert.equal(second.ferry.destination, 'crescent_city');
});

test('a return voyage also survives closing the game mid-ocean', () => {
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

  first.advance(6 * 60 * 60 * 1000);
  const saved = first.ferry.serialize(first.now(), { x: -1, z: -8 }, null);
  const second = makeFerry();
  second.advance(first.now() - CLOCK_START + 4 * 60 * 60 * 1000);
  second.ferry.restore(saved, second.now());
  assert.equal(second.ferry.direction, 'return');
  assert.ok(Math.abs(second.ferry.routeProgress - 1) < 1e-9);
  assert.equal(second.ferry.phase, 'arriving');
  for (let i = 0; i < 60; i++) {
    second.ferry.update(0.25, 0, 1.73, 0);
  }
  assert.equal(second.ferry.phase, 'arrived');
  assert.equal(second.ferry.destination, 'island');
});

test('the voyage save survives a storage round trip and is slot-scoped', () => {
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
  advance(4 * 60 * 60 * 1000);
  const state = ferry.serialize(CLOCK_START + 4 * 60 * 60 * 1000, { x: 0, z: -10 }, 'car-7');
  assert.equal(saveFerryVoyageState(state, 'slot_a', fakeStorage), true);
  const loaded = loadFerryVoyageState('slot_a', fakeStorage);
  assert.equal(loaded?.departureAtMs, state.departureAtMs);
  assert.equal(loaded?.carId, 'car-7');
  assert.equal(loadFerryVoyageState('slot_b', fakeStorage), null);
  clearFerryVoyageState(fakeStorage);
  assert.equal(loadFerryVoyageState('slot_a', fakeStorage), null);
});

test('the visible Crescent Star root follows the nine-hour voyage', () => {
  const model = buildLouisianaFerry();
  const { ferry, advance } = makeFerry();
  ferry.clearBoarding();
  const ramp = ferry.getRampWorldPoint();
  assert.equal(ferry.boardFromRamp(ramp.x, ferry.boatY + FERRY_DECK_Y, ramp.z).ok, true);
  applyLouisianaFerryVisual(model, ferry);

  const gateStartY = model.gate.position.y;
  ferry.update(LOUISIANA_FERRY_GATE_LIFT_SECONDS / 2, ramp.x, ferry.boatY + FERRY_DECK_Y, ramp.z);
  applyLouisianaFerryVisual(model, ferry);
  assert.ok(model.gate.position.y > gateStartY);

  const player = deckPlayer(ferry);
  for (let i = 0; i < 400 && ferry.phase !== 'at_sea'; i++) {
    ferry.update(0.25, player.x, player.y, player.z);
  }
  assert.equal(ferry.phase, 'at_sea');

  model.root.updateMatrixWorld(true);
  const start = model.root.getWorldPosition(new THREE.Vector3());
  const startZ = start.z;
  let previousZ = startZ;

  // One real hour at a time: the rendered root is the object being moved.
  for (let hour = 0; hour < 5; hour++) {
    advance(60 * 60 * 1000);
    ferry.update(0.05, player.x, player.y, player.z);
    applyLouisianaFerryVisual(model, ferry);
    model.root.updateMatrixWorld(true);
    const world = model.root.getWorldPosition(new THREE.Vector3());
    assert.ok(Math.abs(world.x - ferry.boatX) < 1e-6);
    assert.ok(Math.abs(world.z - ferry.boatZ) < 1e-6);
    assert.ok(world.z > previousZ + 10, 'the hull advances every real hour');
    previousZ = world.z;
  }
  assert.ok(previousZ - startZ > 200);
  assert.equal(isAlwaysVisibleWorldObject(model.root), true);
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

test('a rider is carried with the hull and stays on deck for the whole leg', () => {
  const { ferry, advance } = makeFerry();
  boardAndDepart(ferry);
  let player = deckPlayer(ferry);
  const localBefore = ferry.worldToFerryLocal(player.x, player.z);

  for (let second = 0; second < 900; second++) {
    advance(1000);
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
  assert.ok(ferry.routeProgress > 0);
  assert.equal(ferry.aboard, true);
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

test('the hull turns through the channel on both legs and pivots at the berth', () => {
  const { ferry, advance } = makeFerry();
  boardAndDepart(ferry);
  const headings = new Set<string>();
  for (let i = 0; i < 60; i++) {
    advance(6 * 60 * 1000);
    ferry.update(0.25, ferry.boatX, ferry.boatY + FERRY_DECK_Y, ferry.boatZ - 10);
    headings.add(ferry.boatYaw.toFixed(3));
  }
  assert.ok(headings.size > 2);
  const progress = ferry.routeProgress;
  assert.ok(
    Math.abs(
      Math.atan2(
        Math.sin(ferry.boatYaw - ferryRouteHeading(progress)),
        Math.cos(ferry.boatYaw - ferryRouteHeading(progress)),
      ),
    ) < 0.2,
  );

  // Finish the outbound leg: the hull pivots 180 degrees so the stern gate
  // faces the Crescent City terminal.
  advance(LOUISIANA_FERRY_LEG_MS);
  ferry.update(0.1, ferry.boatX, ferry.boatY + FERRY_DECK_Y, ferry.boatZ - 10);
  for (let i = 0; i < 60 && ferry.phase !== 'arrived'; i++) {
    ferry.update(0.25, ferry.boatX, ferry.boatY + FERRY_DECK_Y, ferry.boatZ - 10);
  }
  assert.equal(ferry.phase, 'arrived');
  assert.ok(Math.abs(Math.abs(ferry.boatYaw) - Math.PI) < 0.02);
  assert.ok(LOUISIANA_FERRY_ARRIVAL_SECONDS > 0);
});
