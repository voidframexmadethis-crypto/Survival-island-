import assert from 'node:assert/strict';
import test from 'node:test';
import {
  COASTER_RELOCATION_FEET,
  COASTER_RELOCATION_METERS,
  MANSION_MAIDS,
  MANSION_SPEC,
  createMaidPatrolState,
  describeMaidDuties,
  stepMaidPatrol,
} from './mansionMaids';

test('the premade mansion has 16 bedrooms, 16 baths, three storeys and five maids', () => {
  assert.equal(MANSION_SPEC.stories, 3);
  assert.equal(MANSION_SPEC.bedrooms, 16);
  assert.equal(MANSION_SPEC.bathrooms, 16);
  assert.equal(MANSION_SPEC.musicLounges, 2);
  assert.equal(MANSION_SPEC.talkingAreas, 1);
  assert.equal(MANSION_SPEC.indoorPools, 1);
  assert.equal(MANSION_SPEC.maids, 5);
  assert.equal(MANSION_MAIDS.length, 5);
});

test('maid duties cover cooking, cleaning, serving, cars and repairs', () => {
  const tasks = new Set(MANSION_MAIDS.flatMap((maid) => maid.tasks));
  for (const expected of [
    'cook',
    'serve',
    'make_bed',
    'clean_room',
    'clean_bath',
    'clean_car',
    'clean_interior',
    'hydraulics',
    'speakers',
    'headlights',
    'repair',
    'coaster_feat',
  ] as const) {
    assert.ok(tasks.has(expected), `no maid handles ${expected}`);
  }
  assert.equal(new Set(MANSION_MAIDS.map((maid) => maid.name)).size, 5);
  assert.match(describeMaidDuties(MANSION_MAIDS[0]), /cook/i);
});

test('every maid has a duty route inside the mansion or its motor court', () => {
  for (const maid of MANSION_MAIDS) {
    assert.ok(maid.route.length >= 4, `${maid.name} has too few duties`);
    assert.ok(maid.speed > 0.5);
    for (const point of maid.route) {
      assert.ok(Math.abs(point.x) <= 20, `${maid.name} route leaves the grounds`);
      assert.ok(Math.abs(point.z) <= 9.5, `${maid.name} route leaves the grounds`);
      assert.ok(point.y >= 0 && point.y <= 7.3);
      assert.ok(point.pause > 0);
    }
  }
});

test('the strongwoman feat moves the coaster exactly 100 feet', () => {
  assert.equal(COASTER_RELOCATION_FEET, 100);
  assert.equal(COASTER_RELOCATION_METERS, 30.48);
  const bianca = MANSION_MAIDS.find((maid) => maid.id === 'maid_bianca');
  assert.ok(bianca);
  assert.ok(bianca!.route.some((point) => point.work === 'coaster_feat'));
});

test('maid patrol walks, then works at each waypoint before continuing', () => {
  const maid = MANSION_MAIDS[0];
  const state = createMaidPatrolState(maid);
  const startX = state.x;
  const startZ = state.z;
  const startWaypoint = state.waypoint;

  const moving = stepMaidPatrol(maid, state, 0.5);
  assert.equal(moving.moving, true);
  assert.notEqual(`${state.x},${state.z}`, `${startX},${startZ}`);

  let working = null as ReturnType<typeof stepMaidPatrol> | null;
  for (let i = 0; i < 240 && !working; i++) {
    const pose = stepMaidPatrol(maid, state, 0.25);
    if (!pose.moving && pose.working) working = pose;
  }
  assert.ok(working, 'maid never reached a duty point');
  assert.equal(working!.workProgress, 0);

  const done = stepMaidPatrol(maid, state, 30);
  assert.equal(done.waypoint, (startWaypoint + 1) % maid.route.length);
});
