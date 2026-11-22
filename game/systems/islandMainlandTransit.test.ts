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
import { FERRY_DRIVE_ROUTE } from './ferryPickup';
import { getTerrainHeight, setActiveTerrainWorldType } from '../world/terrain';
import { MAINLAND_FAST_TRAVEL } from './louisianaMainland';

test('island-to-mainland causeway is a raised, drivable deck with ground-level ramps', () => {
  setActiveTerrainWorldType('island');
  const mid = sampleCausewayFrame(CAUSEWAY_LENGTH * 0.5);
  const midDeck = getCausewaySurfaceY(mid.x, mid.z, mid.y);
  assert.ok(midDeck > getTerrainHeight(mid.x, mid.z) + 1.0);

  const start = sampleCausewayFrame(0);
  const startDeck = getCausewaySurfaceY(start.x, start.z, start.y);
  assert.ok(startDeck <= getTerrainHeight(start.x, start.z) + 0.2);

  const edge = sampleCausewayFrame(CAUSEWAY_LENGTH * 0.5);
  const outside = getCausewaySurfaceY(edge.x + CAUSEWAY_WIDTH, edge.z, edge.y + 4);
  assert.ok(outside < -9000);
});

test('causeway surface does not snap a player walking underneath the span', () => {
  setActiveTerrainWorldType('island');
  const mid = sampleCausewayFrame(CAUSEWAY_LENGTH * 0.5);
  const underFoot = getTerrainHeight(mid.x, mid.z);
  assert.ok(getCausewaySurfaceY(mid.x, mid.z, underFoot) < -9000);
  assert.ok(getCausewaySurfaceY(mid.x, mid.z, underFoot + 2.5) > underFoot);
});

test('causeway shares its route with ferry travel and fast travel', () => {
  assert.ok(
    CAUSEWAY_PATH.some(
      (point) => point.x === CAUSEWAY_GATEWAY_POINT.x && point.z === CAUSEWAY_GATEWAY_POINT.z,
    ),
  );
  assert.deepEqual(CAUSEWAY_ISLAND_POINT, { x: 22, z: 650 });
  assert.deepEqual(CAUSEWAY_PATH[CAUSEWAY_PATH.length - 1], { x: 22, z: 674 });

  for (let i = 1; i < CAUSEWAY_PATH.length; i++) {
    const point = CAUSEWAY_PATH[i];
    assert.ok(
      FERRY_DRIVE_ROUTE.some(
        (routePoint) =>
          Math.abs(routePoint.x - point.x) < 0.01 &&
          Math.abs(routePoint.z - point.z) < 0.01,
      ),
      `ferry route missing causeway point ${point.x},${point.z}`,
    );
  }

  assert.equal(
    MAINLAND_FAST_TRAVEL.find((point) => point.id === 'crescent_causeway')?.x,
    64,
  );
  assert.equal(
    MAINLAND_FAST_TRAVEL.find((point) => point.id === 'island_causeway')?.x,
    22,
  );
});
