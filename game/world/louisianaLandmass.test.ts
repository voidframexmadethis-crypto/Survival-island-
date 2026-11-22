import assert from 'node:assert/strict';
import test from 'node:test';
import {
  LOUISIANA_BOUNDS,
  LOUISIANA_CITY_CENTER,
  LOUISIANA_CITY_GROUND_Y,
  LOUISIANA_POLYGON,
  getLouisianaBaseHeight,
  getLouisianaCoastDistance,
} from './louisianaLandmass';
import { getTerrainHeight, setActiveTerrainWorldType } from './terrain';
import {
  MAINLAND_BUSINESSES,
  getMainlandBusinessFloorY,
} from '../systems/louisianaBusinesses';

test('Louisiana is a separate landmass with open water between it and the island', () => {
  setActiveTerrainWorldType('island');

  const openWater = getTerrainHeight(0, 900);
  assert.ok(openWater < 0, `expected ocean between island and mainland, got ${openWater}`);
  assert.ok(getLouisianaBaseHeight(0, 900) === null);

  const cityGround = getTerrainHeight(LOUISIANA_CITY_CENTER.x, LOUISIANA_CITY_CENTER.z);
  assert.ok(Math.abs(cityGround - LOUISIANA_CITY_GROUND_Y) < 0.8);
  assert.ok(getLouisianaCoastDistance(LOUISIANA_CITY_CENTER.x, LOUISIANA_CITY_CENTER.z) > 0);
  assert.ok(LOUISIANA_POLYGON.length >= 20);
  assert.ok(LOUISIANA_BOUNDS.minZ > 900);
});

test('every mainland business sits inside Louisiana and has a walkable interior floor', () => {
  setActiveTerrainWorldType('island');
  for (const business of MAINLAND_BUSINESSES) {
    assert.ok(
      getLouisianaCoastDistance(business.x, business.z) > 0,
      `${business.name} is outside the Louisiana coastline`,
    );
    assert.ok(
      Math.hypot(business.x, business.z) > 1000,
      `${business.name} must not be placed on the survival island`,
    );
    const floorY = getMainlandBusinessFloorY(business.x, business.z, 4.2);
    assert.ok(floorY > LOUISIANA_CITY_GROUND_Y);
    assert.ok(floorY < LOUISIANA_CITY_GROUND_Y + 0.3);
  }
});
