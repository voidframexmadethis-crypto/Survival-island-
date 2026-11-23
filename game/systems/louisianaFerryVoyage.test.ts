import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
  FERRY_DECK_Y,
  FERRY_RAMP,
  LOUISIANA_FERRY_CROSSING_SECONDS,
  LOUISIANA_FERRY_DAYS,
  LOUISIANA_FERRY_DAYS_PER_MONTH,
  LOUISIANA_FERRY_GATE_LIFT_SECONDS,
  LOUISIANA_FERRY_MONTHS,
  LOUISIANA_FERRY_ROUTE,
  LOUISIANA_FERRY_SECONDS_PER_DAY,
  LouisianaFerryVoyageSystem,
  ferryRoomAtLocal,
  ferryRouteHeading,
  ferryWalkSurfaceLocalY,
} from './louisianaFerryVoyage';
import { applyLouisianaFerryVisual } from './louisianaFerryVisual';
import { buildLouisianaFerry } from '../world/louisianaFerry';
import { WorldChunkManager } from '../world/worldChunkSystem';
import { isAlwaysVisibleWorldObject } from '../world/worldCullPolicy';

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

function runDepartureCountdown(ferry: LouisianaFerryVoyageSystem): void {
  boardAndOpenGate(ferry);
  for (let i = 0; i < 40 && ferry.phase === 'departing'; i++) {
    ferry.update(0.25, ferry.boatX, ferry.boatY + FERRY_DECK_Y, ferry.boatZ - 10);
  }
  assert.equal(ferry.phase, 'at_sea');
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
  runDepartureCountdown(ferry);
  assert.equal(ferry.getStatus().secondsToDeparture, 0);

  let playerX = ferry.boatX;
  let playerZ = ferry.boatZ - 10;
  let previousX = ferry.boatX;
  let previousZ = ferry.boatZ;
  const localBefore = ferry.worldToFerryLocal(playerX, playerZ);
  for (let i = 0; i < 40; i++) {
    const update = ferry.update(0.1, playerX, ferry.boatY + FERRY_DECK_Y, playerZ);
    const dx = ferry.boatX - previousX;
    const dz = ferry.boatZ - previousZ;
    assert.ok(Math.hypot(dx, dz) > 0);
    const carriedX = playerX + update.carryX;
    const carriedZ = playerZ + update.carryZ;
    // Rigid carry: the rider's spot on the hull is unchanged even as it turns.
    const localAfter = ferry.worldToFerryLocal(carriedX, carriedZ);
    assert.ok(Math.abs(localAfter.x - localBefore.x) < 1e-6);
    assert.ok(Math.abs(localAfter.z - localBefore.z) < 1e-6);
    assert.ok(Math.abs(update.carryX) + Math.abs(update.carryZ) > 0);
    playerX = carriedX;
    playerZ = carriedZ;
    previousX = ferry.boatX;
    previousZ = ferry.boatZ;
  }
  assert.ok(ferry.routeProgress > 0);
  assert.ok(ferry.speedMps > 0);
});

test('the crossing covers 18 in-game months (540 days) while the hull travels the whole route', () => {
  assert.equal(LOUISIANA_FERRY_MONTHS, 18);
  assert.equal(LOUISIANA_FERRY_DAYS_PER_MONTH, 30);
  assert.equal(LOUISIANA_FERRY_DAYS, 540);
  assert.ok(LOUISIANA_FERRY_CROSSING_SECONDS > 0);
  assert.ok(LOUISIANA_FERRY_SECONDS_PER_DAY > 0);

  const ferry = new LouisianaFerryVoyageSystem();
  runDepartureCountdown(ferry);

  let days = 0;
  let arrived = false;
  let arrivalEvents = 0;
  let maxStepDistance = 0;
  let previousX = ferry.boatX;
  let previousZ = ferry.boatZ;
  const steps = Math.ceil(LOUISIANA_FERRY_CROSSING_SECONDS / 0.25) + 40;
  for (let i = 0; i < steps; i++) {
    const update = ferry.update(0.25, ferry.boatX, ferry.boatY + FERRY_DECK_Y, ferry.boatZ - 10);
    days += update.daysAdvanced;
    maxStepDistance = Math.max(
      maxStepDistance,
      Math.hypot(ferry.boatX - previousX, ferry.boatZ - previousZ),
    );
    previousX = ferry.boatX;
    previousZ = ferry.boatZ;
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
  assert.equal(ferry.voyageMonth, LOUISIANA_FERRY_MONTHS);
  assert.equal(ferry.routeProgress, 1);
  assert.equal(ferry.gateLift, 1);

  const last = LOUISIANA_FERRY_ROUTE[LOUISIANA_FERRY_ROUTE.length - 1];
  assert.ok(Math.abs(ferry.boatX - last.x) < 1e-9);
  assert.ok(Math.abs(ferry.boatZ - last.z) < 1e-9);
  // The hull never jumps: every step is a small continuous move.
  assert.ok(maxStepDistance < 3);

  const afterDocking = ferry.update(1, ferry.boatX, ferry.boatY + FERRY_DECK_Y, ferry.boatZ - 10);
  assert.equal(afterDocking.arrived, false);
  assert.ok(Math.abs(ferry.boatZ - last.z) < 1e-9);
});

test('the visible Crescent Star root follows the voyage and lifts its gate', () => {
  const model = buildLouisianaFerry();
  const voyage = new LouisianaFerryVoyageSystem();
  voyage.clearBoarding();
  assert.equal(voyage.boardFromRamp(rampPlayer.x, rampPlayer.y, rampPlayer.z).ok, true);
  applyLouisianaFerryVisual(model, voyage);

  // Closed gate sits in the stern frame at deck height.
  assert.equal(model.gate.position.y, FERRY_DECK_Y);

  const gateStartY = model.gate.position.y;
  voyage.update(LOUISIANA_FERRY_GATE_LIFT_SECONDS / 2, voyage.boatX, voyage.boatY + FERRY_DECK_Y, voyage.boatZ - 10);
  applyLouisianaFerryVisual(model, voyage);
  assert.ok(model.gate.position.y > gateStartY);

  for (
    let i = 0;
    i < 80 && (voyage.phase === 'gate_raising' || voyage.phase === 'departing');
    i++
  ) {
    voyage.update(0.25, voyage.boatX, voyage.boatY + FERRY_DECK_Y, voyage.boatZ - 10);
  }
  assert.equal(voyage.phase, 'at_sea');

  model.root.updateMatrixWorld(true);
  const start = model.root.getWorldPosition(new THREE.Vector3());
  const startZ = start.z;
  let previousZ = startZ;
  for (let i = 0; i < 900; i++) {
    voyage.update(1 / 60, voyage.boatX, voyage.boatY + FERRY_DECK_Y, voyage.boatZ - 10);
    applyLouisianaFerryVisual(model, voyage);
    model.root.updateMatrixWorld(true);
    const world = model.root.getWorldPosition(new THREE.Vector3());
    assert.ok(Math.abs(world.x - voyage.boatX) < 1e-6);
    assert.ok(Math.abs(world.z - voyage.boatZ) < 1e-6);
    assert.ok(world.z >= previousZ - 1e-9);
    previousZ = world.z;
  }
  assert.ok(previousZ - startZ > 8);

  // The dynamic hull can never be reparented into a distance-culled chunk.
  assert.equal(isAlwaysVisibleWorldObject(model.root), true);
  assert.equal(isAlwaysVisibleWorldObject(new THREE.Group()), false);
});

test('the rider stays on the moving deck for the whole crossing instead of falling into the sea', () => {
  const ferry = new LouisianaFerryVoyageSystem();
  ferry.clearBoarding();
  ferry.boardFromRamp(rampPlayer.x, rampPlayer.y, rampPlayer.z);
  const dockX = ferry.boatX;
  const dockZ = ferry.boatZ;
  let playerX = ferry.boatX;
  let playerZ = ferry.boatZ - 10;
  let playerY = ferry.boatY + FERRY_DECK_Y;

  // Gate lift + countdown must never move the hull.
  for (let i = 0; i < 200 && ferry.phase !== 'at_sea'; i++) {
    const update = ferry.update(0.05, playerX, playerY, playerZ);
    playerX += update.carryX;
    playerZ += update.carryZ;
    playerY = ferry.getWalkSurfaceY(playerX, playerZ) ?? playerY;
    assert.ok(Math.abs(ferry.boatX - dockX) < 1e-9);
    assert.ok(Math.abs(ferry.boatZ - dockZ) < 1e-9);
  }
  assert.equal(ferry.phase, 'at_sea');

  const startX = ferry.boatX;
  const startZ = ferry.boatZ;
  for (let i = 0; i < 1800; i++) {
    const update = ferry.update(1 / 60, playerX, playerY, playerZ);
    playerX += update.carryX;
    playerZ += update.carryZ;
    const clamp = ferry.constrainPlayer(playerX, playerZ);
    playerX = clamp.x;
    playerZ = clamp.z;
    // Engine order: deck lift first, then normal ground collision on the same deck.
    const deckY = ferry.getWalkSurfaceY(playerX, playerZ);
    assert.notEqual(deckY, null);
    playerY = Math.max(playerY - 21 * (1 / 60) * (1 / 60), deckY ?? playerY);
    const local = ferry.worldToFerryLocal(playerX, playerZ);
    assert.ok(Math.abs(local.x) <= 4.6);
    assert.ok(local.z >= -17.0 && local.z <= 16.9);
    assert.ok(Math.abs(playerY - (ferry.boatY + FERRY_DECK_Y)) < 0.2);
  }
  assert.ok(Math.hypot(ferry.boatX - startX, ferry.boatZ - startZ) > 10);
  assert.equal(ferry.phase, 'at_sea');
});

test('the world chunk culler can never hide the hull the player is riding', () => {
  const model = buildLouisianaFerry();
  const worldRoot = new THREE.Group();
  worldRoot.add(model.root);
  const chunks = new WorldChunkManager(worldRoot, 64);
  // Mirrors the registration guard in worldBuilder: persistent roots stay direct children.
  if (!isAlwaysVisibleWorldObject(model.root)) {
    chunks.addObjectAt(model.root, 26, 713);
  }
  assert.equal(model.root.parent, worldRoot);

  model.root.position.set(40, 0.18, 1428);
  chunks.updateIfChunkChanged(new THREE.Vector3(40, 0, 1428), 135);
  assert.equal(model.root.visible, true);
  assert.equal(worldRoot.children.includes(model.root), true);
});

test('the hull turns through the channel instead of crabbing sideways', () => {
  const ferry = new LouisianaFerryVoyageSystem();
  runDepartureCountdown(ferry);
  const headings = new Set<string>();
  for (let i = 0; i < 600; i++) {
    ferry.update(0.25, ferry.boatX, ferry.boatY + FERRY_DECK_Y, ferry.boatZ - 10);
    headings.add(ferry.boatYaw.toFixed(3));
  }
  assert.ok(headings.size > 3);
  const routeHeading = ferryRouteHeading(ferry.routeProgress);
  assert.ok(Math.abs(ferry.boatYaw - routeHeading) < 0.12);
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

test('deck queries and player clamping stay correct while the hull is turned', () => {
  const ferry = new LouisianaFerryVoyageSystem();
  runDepartureCountdown(ferry);
  ferry.boatYaw = Math.PI / 3;
  const world = ferry.ferryLocalToWorld(0, -10);
  const local = ferry.worldToFerryLocal(world.x, world.z);
  assert.ok(Math.abs(local.x) < 1e-9);
  assert.ok(Math.abs(local.z + 10) < 1e-9);
  assert.equal(ferry.roomAtWorld(world.x, world.z), 'open_deck');
  assert.ok(Math.abs((ferry.getWalkSurfaceY(world.x, world.z) ?? 0) - (ferry.boatY + FERRY_DECK_Y)) < 1e-9);
  assert.equal(ferry.isOnDeck(world.x, ferry.boatY + FERRY_DECK_Y, world.z), true);

  const outside = ferry.ferryLocalToWorld(40, 40);
  const clamped = ferry.constrainPlayer(outside.x, outside.z);
  const clampedLocal = ferry.worldToFerryLocal(clamped.x, clamped.z);
  assert.ok(Math.abs(clampedLocal.x) <= 4.6);
  assert.ok(clampedLocal.z >= -17.0);
});

test('sleeping in the ferry bedroom skips a whole month and carries the boat forward', () => {
  const ferry = new LouisianaFerryVoyageSystem();
  runDepartureCountdown(ferry);
  for (let i = 0; i < 20; i++) {
    ferry.update(0.5, ferry.boatX, ferry.boatY + FERRY_DECK_Y, ferry.boatZ - 10);
  }
  assert.equal(ferry.phase, 'at_sea');
  const beforeProgress = ferry.routeProgress;
  const beforeDay = ferry.voyageDay;
  const beforeX = ferry.boatX;
  const beforeZ = ferry.boatZ;

  assert.equal(ferry.restForDays(LOUISIANA_FERRY_DAYS_PER_MONTH), LOUISIANA_FERRY_DAYS_PER_MONTH);
  assert.equal(ferry.voyageDay, beforeDay + LOUISIANA_FERRY_DAYS_PER_MONTH);
  assert.ok(ferry.routeProgress > beforeProgress);
  assert.ok(ferry.boatZ > beforeZ || ferry.boatX !== beforeX);

  // The rider keeps their exact spot on deck after the fast-forward.
  const deckSpot = ferry.ferryLocalToWorld(0, -10);
  assert.equal(ferry.roomAtWorld(deckSpot.x, deckSpot.z), 'open_deck');
  const clamped = ferry.constrainPlayer(deckSpot.x, deckSpot.z);
  assert.ok(Math.abs(clamped.x - deckSpot.x) < 1e-9);
  assert.ok(Math.abs(clamped.z - deckSpot.z) < 1e-9);
  assert.ok(ferry.restForOneDay());
  assert.equal(ferry.voyageDay, beforeDay + LOUISIANA_FERRY_DAYS_PER_MONTH + 1);
});
