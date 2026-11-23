import assert from 'node:assert/strict';
import test from 'node:test';
import {
  FERRY_DECK_Y,
  LOUISIANA_FERRY_CITY_DOCK_POS,
  LOUISIANA_FERRY_DIRECT_DURATION_MS,
  LOUISIANA_FERRY_DIRECT_ROUTE_METERS,
  LOUISIANA_FERRY_DIRECT_SPEED_MPS,
  LOUISIANA_FERRY_DOCK_POS,
  LouisianaFerryVoyageSystem,
} from './louisianaFerryVoyage';

const CLOCK_START = 1_700_000_000_000;
const FIXED_DT = 1 / 60;

function makeFerry(): LouisianaFerryVoyageSystem {
  return new LouisianaFerryVoyageSystem(() => CLOCK_START);
}

function boardDirect(ferry: LouisianaFerryVoyageSystem): {
  x: number;
  y: number;
  z: number;
} {
  ferry.enableDirectCrossing();
  assert.equal(ferry.clearBoarding(), true);
  const ramp = ferry.getRampWorldPoint();
  const boarded = ferry.boardFromRamp(ramp.x, ferry.boatY + FERRY_DECK_Y, ramp.z);
  assert.equal(boarded.ok, true);
  const deck = ferry.getBoardingDeckPoint();
  const player = {
    x: deck.x,
    y: ferry.getWalkSurfaceY(deck.x, deck.z) ?? ferry.boatY + FERRY_DECK_Y,
    z: deck.z,
  };
  const out = ferry.update(FIXED_DT, player.x, player.y, player.z);
  player.x += out.carryX;
  player.z += out.carryZ;
  assert.equal(ferry.phase, 'at_sea');
  return player;
}

function step(
  ferry: LouisianaFerryVoyageSystem,
  player: { x: number; y: number; z: number },
): void {
  const out = ferry.update(FIXED_DT, player.x, player.y, player.z);
  player.x += out.carryX;
  player.z += out.carryZ;
}

test('direct shuttle moves at speed * fixedDt toward the Louisiana mainland', () => {
  const ferry = makeFerry();
  const player = boardDirect(ferry);
  const startX = ferry.boatX;
  const startZ = ferry.boatZ;
  const startCity = Math.hypot(
    startX - LOUISIANA_FERRY_CITY_DOCK_POS.x,
    startZ - LOUISIANA_FERRY_CITY_DOCK_POS.z,
  );

  for (let i = 0; i < 60; i++) step(ferry, player);
  const moved = Math.hypot(ferry.boatX - startX, ferry.boatZ - startZ);
  assert.ok(
    Math.abs(moved - LOUISIANA_FERRY_DIRECT_SPEED_MPS) < 0.01,
    `one second at 1/60 should move exactly ${LOUISIANA_FERRY_DIRECT_SPEED_MPS} m, got ${moved}`,
  );
  const endCity = Math.hypot(
    ferry.boatX - LOUISIANA_FERRY_CITY_DOCK_POS.x,
    ferry.boatZ - LOUISIANA_FERRY_CITY_DOCK_POS.z,
  );
  assert.ok(endCity < startCity, 'the hull must close the distance to the mainland');
  assert.equal(ferry.getStatus().routeLengthMeters, LOUISIANA_FERRY_DIRECT_ROUTE_METERS);
  assert.equal(ferry.getStatus().durationMs, LOUISIANA_FERRY_DIRECT_DURATION_MS);

  const local = ferry.worldToFerryLocal(player.x, player.z);
  // The fixed-step controller translates the rider; the small heading change
  // at cast-off leaves them slightly off their original deck line but aboard.
  assert.ok(Math.abs(local.x) < 0.35);
  assert.ok(Math.abs(local.z + 10.5) < 0.1, 'the rider stays on the moving deck');
});

test('direct shuttle docks at the mainland and completes the island return', () => {
  const ferry = makeFerry();
  let player = boardDirect(ferry);

  for (let i = 0; i < 8000 && ferry.phase !== 'arrived'; i++) {
    step(ferry, player);
  }
  assert.equal(ferry.phase, 'arrived');
  assert.ok(Math.abs(ferry.boatX - LOUISIANA_FERRY_CITY_DOCK_POS.x) < 1e-6);
  assert.ok(Math.abs(ferry.boatZ - LOUISIANA_FERRY_CITY_DOCK_POS.z) < 1e-6);
  assert.equal(ferry.routeProgress, 1);

  ferry.prepareReturn();
  assert.equal(ferry.direction, 'return');
  assert.equal(ferry.destination, 'island');
  const ramp = ferry.getRampWorldPoint();
  assert.equal(ferry.clearBoarding(), true);
  assert.equal(ferry.boardFromRamp(ramp.x, ferry.boatY + FERRY_DECK_Y, ramp.z).ok, true);
  const deck = ferry.getBoardingDeckPoint();
  player = {
    x: deck.x,
    y: ferry.getWalkSurfaceY(deck.x, deck.z) ?? ferry.boatY + FERRY_DECK_Y,
    z: deck.z,
  };
  step(ferry, player);

  for (let i = 0; i < 8000 && ferry.phase !== 'arrived'; i++) {
    step(ferry, player);
  }
  assert.equal(ferry.phase, 'arrived');
  assert.ok(Math.abs(ferry.boatX - LOUISIANA_FERRY_DOCK_POS.x) < 1e-6);
  assert.ok(Math.abs(ferry.boatZ - LOUISIANA_FERRY_DOCK_POS.z) < 1e-6);
});

test('a direct crossing restores the exact step position and keeps moving', () => {
  const ferry = makeFerry();
  const player = boardDirect(ferry);
  for (let i = 0; i < 120; i++) step(ferry, player);
  const savedX = ferry.boatX;
  const savedZ = ferry.boatZ;
  const savedProgress = ferry.routeProgress;
  const save = ferry.serialize(CLOCK_START, { x: 0, z: -10.5 });

  const restored = makeFerry();
  restored.enableDirectCrossing();
  restored.restore(save, CLOCK_START);
  assert.equal(restored.phase, 'at_sea');
  assert.ok(Math.abs(restored.boatX - savedX) < 1e-6);
  assert.ok(Math.abs(restored.boatZ - savedZ) < 1e-6);
  assert.ok(Math.abs(restored.routeProgress - savedProgress) < 1e-6);

  const before = restored.boatZ;
  const restoredPlayer = {
    x: restored.getBoardingDeckPoint().x,
    y: restored.boatY + FERRY_DECK_Y,
    z: restored.getBoardingDeckPoint().z,
  };
  for (let i = 0; i < 60; i++) {
    const out = restored.update(
      FIXED_DT,
      restoredPlayer.x,
      restoredPlayer.y,
      restoredPlayer.z,
    );
    restoredPlayer.x += out.carryX;
    restoredPlayer.z += out.carryZ;
  }
  assert.ok(restored.boatZ > before + 6.9, 'the restored hull continues under way');
});

test('the fixed-step update reuses one result object', () => {
  const ferry = makeFerry();
  const player = boardDirect(ferry);
  const a = ferry.update(FIXED_DT, player.x, player.y, player.z);
  const b = ferry.update(FIXED_DT, player.x, player.y, player.z);
  assert.equal(a, b, 'the per-tick result must not allocate');
});
