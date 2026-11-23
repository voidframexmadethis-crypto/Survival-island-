import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PREMADE_MANSION_FLOOR_Y,
  PREMADE_MANSION_POS,
  PREMADE_MANSION_TOP_FLOOR_Y,
  PREMADE_MANSION_UPPER_FLOOR_Y,
  getHilltopBaseFloorY,
} from './terrain';
import { createPremadeMansion } from './premadeMansion';

test('premade mansion builds three storeys with 16 bedroom and 16 bathroom stations', () => {
  const mansion = createPremadeMansion();

  const beds = mansion.stations.filter(
    (station) => station.id.startsWith('mansion_suite_') && station.id.endsWith('_bed'),
  );
  const baths = mansion.stations.filter(
    (station) => station.id.startsWith('mansion_suite_') && station.id.endsWith('_bath'),
  );
  assert.equal(beds.length, 16);
  assert.equal(baths.length, 16);
  assert.equal(new Set(beds.map((station) => station.id)).size, 16);

  const lounges = mansion.stations.filter((station) => station.id.includes('music_lounge'));
  assert.equal(lounges.length, 2);
  assert.ok(mansion.stations.some((station) => station.id === 'mansion_indoor_pool'));
  assert.ok(mansion.stations.some((station) => station.id === 'mansion_talking_lounge'));
  assert.ok(mansion.stations.some((station) => station.id === 'mansion_kitchen'));
  assert.ok(mansion.stations.some((station) => station.id === 'mansion_dining'));

  // Suite beds are split across the second and third storeys.
  const upperBeds = beds.filter((station) => station.y > PREMADE_MANSION_UPPER_FLOOR_Y - 0.5);
  const topBeds = beds.filter((station) => station.y > PREMADE_MANSION_TOP_FLOOR_Y - 0.5);
  assert.equal(upperBeds.length, 16);
  assert.equal(topBeds.length, 8);
});

test('premade mansion includes five animated maids and a coaster display', () => {
  const mansion = createPremadeMansion();
  assert.equal(mansion.maids.length, 5);
  assert.equal(new Set(mansion.maids.map((maid) => maid.group.name)).size, 5);
  for (const maid of mansion.maids) {
    assert.equal(maid.group.userData.dynamic, true);
    assert.ok(maid.group.children.length >= 8);
    maid.group.traverse((child) => {
      assert.equal(child.userData.noStaticMerge, true);
    });
  }
  assert.equal(mansion.coasterDisplay.userData.dynamic, true);
  assert.equal(mansion.coasterDisplay.position.z, mansion.coasterBase.z);
  assert.equal(mansion.poolWaterMat.transparent, true);
  assert.equal(mansion.group.position.x, PREMADE_MANSION_POS.x);
});

test('all three mansion floors resolve as solid walkable ground', () => {
  const x = PREMADE_MANSION_POS.x;
  const z = PREMADE_MANSION_POS.z;
  assert.equal(getHilltopBaseFloorY(x, z, PREMADE_MANSION_FLOOR_Y), PREMADE_MANSION_FLOOR_Y);
  assert.equal(
    getHilltopBaseFloorY(x, z, PREMADE_MANSION_UPPER_FLOOR_Y),
    PREMADE_MANSION_UPPER_FLOOR_Y,
  );
  assert.equal(
    getHilltopBaseFloorY(x, z, PREMADE_MANSION_TOP_FLOOR_Y),
    PREMADE_MANSION_TOP_FLOOR_Y,
  );
});
