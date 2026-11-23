import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AIR_SHUTTLE_LEG_MINUTES,
  AIR_SHUTTLE_LEG_MS,
  AirShuttleVoyageSystem,
  CRESCENT_CITY_SEAPLANE_BASE,
  ISLAND_SEAPLANE_BASE,
  airShuttleCruiseSpeed,
  airShuttleRouteLength,
} from './crescentCityAirShuttle';
import { applyAirShuttleVisual } from './airShuttleVisual';
import { buildCrescentClipper } from '../world/crescentClipper';

const CLOCK_START = 1_700_000_000_000;

interface ShuttleHarness {
  shuttle: AirShuttleVoyageSystem;
  advance: (ms: number) => void;
  now: () => number;
}

function makeShuttle(): ShuttleHarness {
  let now = CLOCK_START;
  return {
    shuttle: new AirShuttleVoyageSystem(() => now),
    advance: (ms: number) => {
      now += ms;
    },
    now: () => now,
  };
}

function runUntil(
  harness: ShuttleHarness,
  predicate: (shuttle: AirShuttleVoyageSystem) => boolean,
  maxSeconds = 120,
): void {
  const dt = 0.25;
  for (let i = 0; i < maxSeconds / dt && !predicate(harness.shuttle); i++) {
    harness.shuttle.update(dt);
    harness.advance(dt * 1000);
  }
  assert.ok(predicate(harness.shuttle), `condition not reached from ${harness.shuttle.phase}`);
}

test('boarding starts the automatic door, engine, taxi and takeoff sequence', () => {
  const harness = makeShuttle();
  const { shuttle } = harness;
  assert.equal(shuttle.phase, 'idle');
  assert.equal(shuttle.canBoard, true);

  const boarded = shuttle.board();
  assert.equal(boarded.ok, true);
  assert.equal(shuttle.phase, 'doors_closing');
  assert.equal(shuttle.aboard, true);

  runUntil(harness, (s) => s.phase === 'airborne');
  const status = shuttle.getStatus();
  assert.equal(status.destination, 'crescent_city');
  assert.equal(status.engineOn, true);
  assert.equal(status.doorsOpen, 0);
  assert.ok(status.planeZ > ISLAND_SEAPLANE_BASE.takeoffEndZ - 1);
});

test('ground phases run on the wall clock even when simulation frames are sparse', () => {
  const harness = makeShuttle();
  const { shuttle } = harness;
  shuttle.board();
  // A slow phone might deliver only a handful of frames during the whole
  // taxi/takeoff sequence. The clock must still advance the phases.
  for (let i = 0; i < 8 && shuttle.phase !== 'airborne'; i++) {
    harness.advance(10_000);
    shuttle.update(0.001);
  }
  assert.equal(shuttle.phase, 'airborne');
});

test('the airborne leg is exactly fifty-five minutes and covers the route', () => {
  const harness = makeShuttle();
  const { shuttle } = harness;
  shuttle.board();
  runUntil(harness, (s) => s.phase === 'airborne');

  const startX = shuttle.planeX;
  const startZ = shuttle.planeZ;
  harness.advance(30 * 60 * 1000);
  shuttle.update(0.05);
  assert.equal(shuttle.phase, 'airborne');
  assert.ok(shuttle.routeProgress > 0.53 && shuttle.routeProgress < 0.56);
  assert.ok(Math.hypot(shuttle.planeX - startX, shuttle.planeZ - startZ) > 100_000);
  assert.ok(shuttle.remainingMs > 24 * 60 * 1000);
  assert.ok(shuttle.remainingMs < 26 * 60 * 1000);

  harness.advance(25 * 60 * 1000 + 1000);
  shuttle.update(0.05);
  assert.equal(shuttle.phase, 'landing');
  assert.equal(shuttle.routeProgress, 1);
  assert.ok(Math.abs(shuttle.planeX - CRESCENT_CITY_SEAPLANE_BASE.landingStartX) < 1);
  assert.ok(Math.abs(shuttle.planeZ - CRESCENT_CITY_SEAPLANE_BASE.landingStartZ) < 1);
});

test('the plane lands, taxis in, turns around and is ready for the return', () => {
  const harness = makeShuttle();
  const { shuttle } = harness;
  shuttle.board();
  runUntil(harness, (s) => s.phase === 'airborne');
  harness.advance(AIR_SHUTTLE_LEG_MS + 1000);
  shuttle.update(0.05);
  assert.equal(shuttle.phase, 'landing');

  runUntil(harness, (s) => s.phase === 'parked', 60);
  assert.equal(shuttle.phase, 'parked');
  assert.equal(shuttle.direction, 'return');
  assert.equal(shuttle.currentBase.id, 'crescent_city');
  assert.ok(Math.abs(shuttle.planeX - CRESCENT_CITY_SEAPLANE_BASE.parkingX) < 0.5);
  assert.ok(Math.abs(shuttle.planeZ - CRESCENT_CITY_SEAPLANE_BASE.parkingZ) < 0.5);
  assert.ok(Math.abs(shuttle.planeYaw - CRESCENT_CITY_SEAPLANE_BASE.outboundYaw) < 0.01);
  assert.equal(shuttle.doorOpen, 1);

  const disembark = shuttle.disembark();
  assert.equal(disembark.ok, true);
  assert.equal(shuttle.aboard, false);
  assert.equal(shuttle.canBoard, true);
  assert.equal(shuttle.getStatus().destination, 'island');
});

test('a flight in progress resumes on the wall clock and a completed one parks at the destination', () => {
  const harness = makeShuttle();
  const { shuttle } = harness;
  shuttle.board();
  runUntil(harness, (s) => s.phase === 'airborne');
  harness.advance(20 * 60 * 1000);
  shuttle.update(0.05);
  const saved = shuttle.serialize(harness.now());

  const resumedHarness = makeShuttle();
  const resumed = resumedHarness.shuttle;
  const restored = resumed.restore(saved, harness.now());
  assert.equal(restored.completed, false);
  assert.equal(resumed.phase, 'airborne');
  assert.equal(resumed.aboard, true);
  assert.ok(resumed.remainingMs > 34 * 60 * 1000);
  assert.ok(resumed.remainingMs < 36 * 60 * 1000);

  const completedSave = {
    ...saved,
    departureAtMs: harness.now() - AIR_SHUTTLE_LEG_MS - 60_000,
  };
  const completedHarness = makeShuttle();
  const completed = completedHarness.shuttle.restore(completedSave, harness.now());
  assert.equal(completed.completed, true);
  assert.equal(completed.wasAboard, true);
  assert.equal(completedHarness.shuttle.phase, 'idle');
  assert.equal(completedHarness.shuttle.direction, 'return');
  assert.equal(completedHarness.shuttle.currentBase.id, 'crescent_city');
});

test('the route is a long visible flight and the visual rig follows the door and props', () => {
  assert.ok(airShuttleRouteLength('outbound') > 300_000);
  assert.ok(airShuttleRouteLength('return') > 300_000);
  assert.ok(airShuttleCruiseSpeed('outbound') > 90);

  const rig = buildCrescentClipper();
  const harness = makeShuttle();
  const { shuttle } = harness;
  applyAirShuttleVisual(rig, shuttle, 0);
  assert.ok(Math.abs(rig.root.position.x - ISLAND_SEAPLANE_BASE.parkingX) < 0.01);
  assert.ok(rig.door.rotation.z < -1);
  assert.equal(rig.cabinSeats.length, 6);
  assert.equal(rig.maids.length, 2);
  assert.ok(rig.maid);
  assert.ok(rig.stairs);
  assert.ok(rig.bedroomDoor);
  assert.ok(rig.bathroomDoor);
  assert.ok(rig.servicePlate);
  assert.ok(rig.landingGear);
  assert.ok(rig.cabinTvMat);
  assert.ok(rig.bedroomLampMat);
  assert.ok(rig.bathroomLightMat);
  assert.ok(Math.abs(rig.stairs.rotation.z) < 0.01);

  shuttle.board();
  runUntil(harness, (s) => s.phase === 'airborne');
  const propBefore = rig.propellers[0].rotation.z;
  applyAirShuttleVisual(rig, shuttle, 0.5);
  assert.ok(rig.door.rotation.z > -0.01);
  assert.ok(rig.propellers[0].rotation.z > propBefore);
  assert.ok(Math.abs(rig.root.position.z - shuttle.planeZ) < 0.01);

  assert.equal(AIR_SHUTTLE_LEG_MINUTES, 55);
});
