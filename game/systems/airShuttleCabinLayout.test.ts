import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AIR_SHUTTLE_CABIN,
  cabinBlockerAt,
  cabinCameraLocalY,
  canStandAt,
  maxCabinJumpFeetY,
  resolveCabinMove,
} from './airShuttleCabinLayout';

const OPEN = { bedroomOpen: true, bathroomOpen: true };
const CLOSED = { bedroomOpen: false, bathroomOpen: false };

test('the walkable cabin has real luxury-jet headroom for the player and crew', () => {
  const height = AIR_SHUTTLE_CABIN.ceilingY - AIR_SHUTTLE_CABIN.floorTopY;
  assert.ok(height >= 2.5, `cabin height ${height} should provide real standing room`);
  assert.ok(
    height >= AIR_SHUTTLE_CABIN.playerHeight + 0.65,
    'player should have comfortable clearance above their head',
  );
  const jumpHead = maxCabinJumpFeetY() + AIR_SHUTTLE_CABIN.playerHeight;
  assert.ok(jumpHead <= AIR_SHUTTLE_CABIN.ceilingY - 0.03);
  assert.ok(
    cabinCameraLocalY(maxCabinJumpFeetY()) <=
      AIR_SHUTTLE_CABIN.ceilingY - AIR_SHUTTLE_CABIN.cameraCeilingClearance,
  );
});

test('the whole lounge, aisle, bedroom and bathroom are reachable without clipping', () => {
  const route: [number, number][] = [
    [0, 3.2],
    [0, 2.95],
    [0, 2.9],
    [0, 1.35],
    [0, 0.9],
    [0.05, 0.45],
    [0, 0.0],
    [0, -0.6],
    [0, -2.5],
    [-0.71, -2.6],
    [-0.71, -3.2],
    [-0.55, -3.55],
    [0.71, -2.6],
    [0.71, -3.2],
    [0.68, -3.5],
  ];
  for (const [x, z] of route) {
    assert.equal(canStandAt(x, z, OPEN), true, `route point ${x}, ${z} must be walkable`);
  }
});

test('closed doors and the shell are solid; furniture is solid too', () => {
  assert.equal(canStandAt(-0.71, -2.94, CLOSED), false);
  assert.equal(canStandAt(0.71, -2.94, CLOSED), false);
  assert.equal(canStandAt(-0.71, -3.2, CLOSED), false);
  assert.equal(canStandAt(-0.71, -3.2, OPEN), true);

  assert.equal(canStandAt(1.4, 0, OPEN), false, 'starboard wall');
  assert.equal(canStandAt(-1.4, 0, OPEN), false, 'port wall');
  assert.equal(canStandAt(0, 4.0, OPEN), false, 'front bulkhead');
  assert.equal(canStandAt(0, -6.5, OPEN), false, 'rear bulkhead');
  assert.equal(canStandAt(-0.55, -4.5, OPEN), false, 'bed');
  assert.equal(canStandAt(0.8, -4.2, OPEN), false, 'bathroom vanity');

  const door = cabinBlockerAt(-0.71, -2.94, CLOSED);
  assert.equal(door?.id, 'bedroom-door');
});

test('movement slides along a wall and cannot tunnel into the ceiling capsule', () => {
  // Walk diagonally into the starboard wall; one axis slides, the other stops.
  const slid = resolveCabinMove(0.7, -3.1, 0.4, 0.2, OPEN);
  assert.ok(Math.abs(slid.x - 0.7) < 1e-9);
  assert.ok(slid.z > -3.1);
  assert.ok(slid.hitX);
  assert.ok(slid.x <= AIR_SHUTTLE_CABIN.innerHalfWidth - AIR_SHUTTLE_CABIN.playerRadius);

  // Axis-separated movement stops before entering a seat from the aisle.
  const seatEdge = resolveCabinMove(0.1, 1.15, 0.8, 0, OPEN);
  assert.ok(seatEdge.x < 0.42 - AIR_SHUTTLE_CABIN.playerRadius + 0.001);

  // Heading forward into the cockpit bulkhead never passes the shell.
  const front = resolveCabinMove(0, 3.0, 0, 2, OPEN);
  assert.ok(front.z <= AIR_SHUTTLE_CABIN.frontBulkheadZ - AIR_SHUTTLE_CABIN.playerRadius);
});

test('the door openings are wider than the player capsule', () => {
  assert.ok(AIR_SHUTTLE_CABIN.doorWidth > AIR_SHUTTLE_CABIN.playerRadius * 2 + 0.1);
  assert.ok(AIR_SHUTTLE_CABIN.doorHeight > AIR_SHUTTLE_CABIN.playerHeight);
});
