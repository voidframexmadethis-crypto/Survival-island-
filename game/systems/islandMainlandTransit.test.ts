import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CAUSEWAY_GATEWAY_POINT,
  CAUSEWAY_ISLAND_POINT,
  CAUSEWAY_LENGTH,
  CAUSEWAY_PATH,
  CAUSEWAY_WIDTH,
  getCausewaySurfaceY,
  sampleCausewayFrame,
} from './islandMainlandTransit';
import { getTerrainHeight, setActiveTerrainWorldType } from '../world/terrain';
import { MAINLAND_FAST_TRAVEL } from './louisianaMainland';

test('Mississippi bridge is a raised, drivable deck with ground-level ramps', () => {
  setActiveTerrainWorldType('island');
  const mid = sampleCausewayFrame(CAUSEWAY_LENGTH * 0.5);
  const midDeck = getCausewaySurfaceY(mid.x, mid.z, mid.y);
  assert.ok(midDeck > getTerrainHeight(mid.x, mid.z) + 1.0);

  const start = sampleCausewayFrame(0);
  const startDeck = getCausewaySurfaceY(start.x, start.z, start.y);
  assert.ok(startDeck <= getTerrainHeight(start.x, start.z) + 0.2);

  const edge = sampleCausewayFrame(CAUSEWAY_LENGTH * 0.5);
  const outside = getCausewaySurfaceY(edge.x, edge.z + CAUSEWAY_WIDTH * 4, edge.y + 4);
  assert.ok(outside < -9000);
});

test('bridge surface does not snap a player walking underneath the span', () => {
  setActiveTerrainWorldType('island');
  const mid = sampleCausewayFrame(CAUSEWAY_LENGTH * 0.5);
  const underFoot = getTerrainHeight(mid.x, mid.z);
  assert.ok(getCausewaySurfaceY(mid.x, mid.z, underFoot) < -9000);
  assert.ok(getCausewaySurfaceY(mid.x, mid.z, underFoot + 3.5) > underFoot);
});

test('the bridge is entirely inside Louisiana and never reaches the survival island', () => {
  assert.ok(
    CAUSEWAY_PATH.some(
      (point) => point.x === CAUSEWAY_GATEWAY_POINT.x && point.z === CAUSEWAY_GATEWAY_POINT.z,
    ),
  );
  assert.deepEqual(CAUSEWAY_ISLAND_POINT, { x: 345, z: 1430 });
  assert.deepEqual(CAUSEWAY_PATH[CAUSEWAY_PATH.length - 1], { x: 345, z: 1430 });
  for (const point of CAUSEWAY_PATH) {
    assert.ok(point.z > 1200, `bridge point ${point.x},${point.z} is too close to the island`);
    assert.ok(Math.hypot(point.x, point.z) > 1300, 'bridge must be well south of the island coast');
  }

  assert.equal(MAINLAND_FAST_TRAVEL.find((point) => point.id === 'crescent_bridge')?.x, 140);
  assert.equal(MAINLAND_FAST_TRAVEL.find((point) => point.id === 'east_bank')?.x, 375);
  assert.equal(MAINLAND_FAST_TRAVEL.find((point) => point.id === 'island_causeway'), undefined);
});
