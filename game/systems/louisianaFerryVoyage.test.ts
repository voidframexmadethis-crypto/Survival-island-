import assert from 'node:assert/strict';
import test from 'node:test';
import {
  FERRY_DECK_Y,
  FERRY_RAMP,
  LOUISIANA_FERRY_DAYS,
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

test('the dock TV is required before the passenger ferry can be boarded', () => {
  const ferry = new LouisianaFerryVoyageSystem();
  assert.equal(ferry.phase, 'idle');
  assert.equal(ferry.boardFromRamp(rampPlayer.x, rampPlayer.y, rampPlayer.z).ok, false);

  assert.equal(ferry.clearBoarding(), true);
  assert.equal(ferry.phase, 'boarding');
  const boarded = ferry.boardFromRamp(rampPlayer.x, rampPlayer.y, rampPlayer.z);
  assert.equal(boarded.ok, true);
  assert.equal(ferry.aboard, true);
  assert.equal(ferry.phase, 'departing');
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

test('the automatic crossing advances exactly 18 island days before docking in Louisiana', () => {
  const ferry = new LouisianaFerryVoyageSystem();
  ferry.clearBoarding();
  assert.equal(ferry.boardFromRamp(rampPlayer.x, rampPlayer.y, rampPlayer.z).ok, true);

  let days = 0;
  let departed = false;
  let arrived = false;
  for (let i = 0; i < 400; i++) {
    const update = ferry.update(0.5, ferry.boatX, ferry.boatY + FERRY_DECK_Y, ferry.boatZ - 10);
    days += update.daysAdvanced;
    departed ||= update.departed;
    arrived ||= update.arrived;
    if (arrived) break;
  }

  assert.equal(departed, true);
  assert.equal(arrived, true);
  assert.equal(days, LOUISIANA_FERRY_DAYS);
  assert.equal(ferry.voyageDay, LOUISIANA_FERRY_DAYS);
  assert.equal(ferry.routeProgress, 1);
  assert.ok(days >= Math.floor((LOUISIANA_FERRY_DAYS * LOUISIANA_FERRY_SECONDS_PER_DAY) / 6));
});

test('sleeping in the ferry bedroom skips one voyage day and carries the boat forward', () => {
  const ferry = new LouisianaFerryVoyageSystem();
  ferry.clearBoarding();
  ferry.boardFromRamp(rampPlayer.x, rampPlayer.y, rampPlayer.z);
  for (let i = 0; i < 16; i++) {
    ferry.update(0.5, ferry.boatX, ferry.boatY + FERRY_DECK_Y, ferry.boatZ - 10);
  }
  assert.equal(ferry.phase, 'at_sea');
  const beforeProgress = ferry.routeProgress;
  const beforeDay = ferry.voyageDay;
  assert.equal(ferry.restForOneDay(), true);
  assert.equal(ferry.voyageDay, beforeDay + 1);
  assert.ok(ferry.routeProgress > beforeProgress);
});
