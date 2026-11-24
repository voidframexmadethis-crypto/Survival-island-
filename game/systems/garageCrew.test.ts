import assert from 'node:assert/strict';
import test from 'node:test';
import {
  GARAGE_ATELIER_BAYS,
  GARAGE_CREW_PER_CAR,
  GARAGE_CREW_TASKS,
  getGarageCrewPlacements,
  isGarageCarFullyDetailed,
  supportsHydraulicUpgrade,
} from './garageCrew';

test('the motor atelier houses six cars with one crew member per service task', () => {
  assert.equal(GARAGE_ATELIER_BAYS.length, 6);
  assert.equal(GARAGE_CREW_PER_CAR, 5);
  assert.deepEqual(
    GARAGE_CREW_TASKS.map((task) => task.id),
    ['wash', 'interior', 'hydraulics', 'audio', 'lights'],
  );

  const garageX = 100;
  const garageZ = 200;
  const placements = getGarageCrewPlacements(garageX, garageZ);
  assert.equal(placements.length, 30);
  assert.equal(new Set(placements.map((worker) => worker.id)).size, 30);

  for (const bay of GARAGE_ATELIER_BAYS) {
    const bayCrew = placements.filter((worker) => worker.bayIndex === bay.index);
    assert.equal(bayCrew.length, 5, `${bay.label} should have a five-person crew`);
    assert.deepEqual(
      bayCrew.map((worker) => worker.task).sort(),
      [...GARAGE_CREW_TASKS.map((task) => task.id)].sort(),
    );
    for (const worker of bayCrew) {
      assert.ok(Math.abs(worker.x - garageX - bay.x) <= 1.55);
      assert.ok(Math.abs(worker.z - garageZ - bay.z) <= 3.1);
    }
  }
});

test('only a finished five-task pass services a car and hydraulic upgrades are limited to hydraulic builds', () => {
  assert.equal(isGarageCarFullyDetailed([]), false);
  assert.equal(isGarageCarFullyDetailed(['wash', 'interior', 'hydraulics', 'audio']), false);
  assert.equal(
    isGarageCarFullyDetailed(['wash', 'interior', 'hydraulics', 'audio', 'lights']),
    true,
  );

  assert.equal(supportsHydraulicUpgrade('lowrider'), true);
  assert.equal(supportsHydraulicUpgrade('chevy_tahoe'), true);
  assert.equal(supportsHydraulicUpgrade('expedition_rover'), false);
  assert.equal(supportsHydraulicUpgrade(undefined), false);
});
