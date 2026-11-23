import assert from 'node:assert/strict';
import test from 'node:test';
import {
  FERRY_DECK_Y,
  FERRY_RAMP,
  LOUISIANA_FERRY_DAYS,
  LOUISIANA_FERRY_GATE_LIFT_SECONDS,
  LOUISIANA_FERRY_ROUTE,
  LOUISIANA_FERRY_SECONDS_PER_DAY,
  LouisianaFerryVoyageSystem,
  ferryRoomAtLocal,
  ferryWalkSurfaceLocalY,
} from './louisianaFerryVoyage';

const rampPlayer = {
  x: 26,
  y: 1.2,
  z: 692.2,
};

function boardAndOpenGate(ferry: LouisianaFerryVoyageSystem): void {
  ferry.clearBoarding();
  const boarded = ferry.boardFromRamp(rampPlayer.x, rampPlayer.y, rampPlayer.z);
  assert.equal(boarded.ok, true);
  for (let i = 0; i < 20 && ferry.phase === 'gate_raising'; i++) {
    ferry.update(0.25, ferry.boatX, ferry.boatY + FERRY_DECK_Y, ferry.boatZ - 10);
  }
}

test('the dock TV is required before the passenger ferry can be boarded', () => {
  const ferry = new LouisianaFerryVoyageSystem();
  assert.equal(ferry.phase, 'idle');
  assert.equal(ferry.boardFromRamp(rampPlayer.x, rampPlayer.y, rampPlayer.z).ok, false);

  assert.equal(ferry.clearBoarding(), true);
  assert.equal(ferry.phase, 'boarding');
  const boarded = ferry.boardFromRamp(rampPlayer.x, rampPlayer.y, rampPlayer.z);
  assert.equal(boarded.ok, true);
  assert.equal(ferry.aboard, true);
  assert.equal(ferry.phase, 'gate_raising');
  assert.equal(ferry.gateLift, 0);
});

test('walking onto the deck detects boarding and animates the stern gate upward', () => {
  const ferry = new LouisianaFerryVoyageSystem();
  ferry.clearBoarding();
  const deckY = ferry.boatY + FERRY_DECK_Y;

  const onRamp = ferry.update(0.25, ferry.boatX, ferry.boatY + 1.0, ferry.boatZ - 20);
  assert.equal(onRamp.boarded, false);
  assert.equal(ferry.phase, 'boarding');

  const onDeck = ferry.update(0.25, ferry.boatX, deckY, ferry.boatZ - 10);
  assert.equal(onDeck.boarded, true);
  assert.equal(ferry.phase, 'gate_raising');

  const halfway = ferry.update(LOUISIANA_FERRY_GATE_LIFT_SECONDS / 2, ferry.boatX, deckY, ferry.boatZ - 10);
  assert.equal(halfway.gateOpened, false);
  assert.ok(ferry.gateLift > 0.2 && ferry.gateLift < 1);

  const raised = ferry.update(LOUISIANA_FERRY_GATE_LIFT_SECONDS, ferry.boatX, deckY, ferry.boatZ - 10);
  assert.equal(raised.gateOpened, true);
  assert.equal(ferry.gateLift, 1);
  assert.equal(ferry.phase, 'departing');
  assert.ok(ferry.getStatus().secondsToDeparture > 0);
});

test('the departure countdown completes and the boat keeps moving along the route', () => {
  const ferry = new LouisianaFerryVoyageSystem();
  boardAndOpenGate(ferry);
  assert.equal(ferry.phase, 'departing');

  let departed = false;
  for (let i = 0; i < 20 && !departed; i++) {
    const update = ferry.update(0.5, ferry.boatX, ferry.boatY + FERRY_DECK_Y, ferry.boatZ - 10);
    departed = update.departed;
  }
  assert.equal(departed, true);
  assert.equal(ferry.phase, 'at_sea');
  assert.equal(ferry.getStatus().secondsToDeparture, 0);

  let playerX = ferry.boatX;
  let playerZ = ferry.boatZ - 10;
  let previousX = ferry.boatX;
  let previousZ = ferry.boatZ;
  let stepsMoved = 0;
  for (let i = 0; i < 20; i++) {
    const update = ferry.update(0.1, playerX, ferry.boatY + FERRY_DECK_Y, playerZ);
    const dx = ferry.boatX - previousX;
    const dz = ferry.boatZ - previousZ;
    assert.ok(Math.abs(update.carryX - dx) < 1e-9);
    assert.ok(Math.abs(update.carryZ - dz) < 1e-9);
    assert.ok(Math.hypot(dx, dz) > 0);
    playerX += update.carryX;
    playerZ += update.carryZ;
    assert.ok(Math.abs(playerZ - (ferry.boatZ - 10)) < 1e-6);
    previousX = ferry.boatX;
    previousZ = ferry.boatZ;
    stepsMoved++;
  }
  assert.equal(stepsMoved, 20);
  assert.ok(ferry.routeProgress > 0);
});

test('the automatic crossing advances exactly 18 island days and stops at the Louisiana berth', () => {
  const ferry = new LouisianaFerryVoyageSystem();
  boardAndOpenGate(ferry);

  let days = 0;
  let arrived = false;
  let arrivalEvents = 0;
  for (let i = 0; i < 500; i++) {
    const update = ferry.update(0.5, ferry.boatX, ferry.boatY + FERRY_DECK_Y, ferry.boatZ - 10);
    days += update.daysAdvanced;
    if (update.arrived) {
      arrived = true;
      arrivalEvents++;
    }
    if (arrived) break;
  }
  assert.equal(arrived, true);
  assert.equal(arrivalEvents, 1);
  assert.equal(ferry.phase, 'arrived');
  assert.equal(days, LOUISIANA_FERRY_DAYS);
  assert.equal(ferry.voyageDay, LOUISIANA_FERRY_DAYS);
  assert.equal(ferry.routeProgress, 1);
  assert.equal(ferry.gateLift, 1);

  const last = LOUISIANA_FERRY_ROUTE[LOUISIANA_FERRY_ROUTE.length - 1];
  assert.ok(Math.abs(ferry.boatX - last.x) < 1e-9);
  assert.ok(Math.abs(ferry.boatZ - last.z) < 1e-9);

  const afterDocking = ferry.update(1, ferry.boatX, ferry.boatY + FERRY_DECK_Y, ferry.boatZ - 10);
  assert.equal(afterDocking.arrived, false);
  assert.ok(Math.abs(ferry.boatZ - last.z) < 1e-9);
});

test('the walkable ferry deck spans the living room, bedroom, bathroom and open deck', () => {
  assert.equal(ferryWalkSurfaceLocalY(0, 0), FERRY_DECK_Y);
  assert.equal(ferryWalkSurfaceLocalY(-2, 8), FERRY_DECK_Y);
  assert.equal(ferryWalkSurfaceLocalY(2, 8), FERRY_DECK_Y);
  assert.equal(ferryWalkSurfaceLocalY(0, -12), FERRY_DECK_Y);
  assert.equal(ferryWalkSurfaceLocalY(0, 40), null);
  assert.ok(Math.abs((ferryWalkSurfaceLocalY(0, FERRY_RAMP.zNear) ?? 0) - FERRY_RAMP.yNear) < 0.001);
  assert.ok(Math.abs((ferryWalkSurfaceLocalY(0, FERRY_RAMP.zFar) ?? 0) - FERRY_RAMP.yFar) < 0.001);

  assert.equal(ferryRoomAtLocal(0, 0), 'living_room');
  assert.equal(ferryRoomAtLocal(-2, 8), 'bedroom');
  assert.equal(ferryRoomAtLocal(2.7, 6.3), 'bathroom');
  assert.equal(ferryRoomAtLocal(0, -12), 'open_deck');
});

test('sleeping in the ferry bedroom skips one voyage day and carries the boat forward', () => {
  const ferry = new LouisianaFerryVoyageSystem();
  boardAndOpenGate(ferry);
  for (let i = 0; i < 16; i++) {
    ferry.update(0.5, ferry.boatX, ferry.boatY + FERRY_DECK_Y, ferry.boatZ - 10);
  }
  assert.equal(ferry.phase, 'at_sea');
  const beforeProgress = ferry.routeProgress;
  const beforeDay = ferry.voyageDay;
  assert.equal(ferry.restForOneDay(), true);
  assert.equal(ferry.voyageDay, beforeDay + 1);
  assert.ok(ferry.routeProgress > beforeProgress);
  assert.ok(LOUISIANA_FERRY_SECONDS_PER_DAY > 0);
});
