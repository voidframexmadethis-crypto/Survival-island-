import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
  DEFAULT_WATERPARK_STATE,
  WATERPARK_DECK_Y,
  WATERPARK_DECK_HALF_D,
  WATERPARK_DECK_HALF_W,
  WATERPARK_DUMP_BUCKET,
  WATERPARK_FEATURES,
  WATERPARK_LAZY_RIVER,
  WATERPARK_POOLS,
  WATERPARK_SITE,
  WATERPARK_SLIDES,
  buildWaterparkSlidePath,
  getWaterparkStats,
  getWaterparkSurfaceY,
  isInWaterparkClearZone,
  sanitizeWaterparkState,
} from '../world/waterparkLayout';
import { buildWaterparkModel } from '../world/waterparkModels';
import { WaterparkRuntime } from './waterparkRuntime';
import {
  computeWaterparkLoads,
  stepWaterparkSpeed,
} from './waterparkPhysics';

function localToWorld(x: number, z: number) {
  return { x: WATERPARK_SITE.x + x, z: WATERPARK_SITE.z + z };
}

function assertClose(actual: number, expected: number, epsilon = 0.001) {
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `expected ${actual} to be within ${epsilon} of ${expected}`,
  );
}

test('waterpark ships 28 unique, fully specified slides in the requested 15-35 range', () => {
  const stats = getWaterparkStats();
  assert.equal(stats.slideCount, 28);
  assert.ok(stats.slideCount >= 15);
  assert.ok(stats.slideCount <= 35);
  assert.ok(stats.tallestM >= 60);
  assert.ok(stats.bodySlides >= 3);
  assert.ok(stats.familySlides >= 8);
  assert.ok(stats.waterCoasters >= 3);
  assert.equal(new Set(WATERPARK_SLIDES.map((slide) => slide.id)).size, 28);
  assert.equal(new Set(WATERPARK_SLIDES.map((slide) => slide.name)).size, 28);
  assert.ok(WATERPARK_SLIDES.some((slide) => slide.name.includes('Black Anaconda')));
  assert.ok(WATERPARK_SLIDES.some((slide) => slide.name.includes("Scorpion's Tail")));
  assert.ok(WATERPARK_SLIDES.some((slide) => slide.name.includes('Timber Train Log Flume')));
  assert.ok(WATERPARK_SLIDES.some((slide) => slide.name.includes('Double')));
  assert.ok(WATERPARK_POOLS.length >= 5);
});

test('every slide path is finite, descends from its tower, and stays on the deck footprint', () => {
  for (const slide of WATERPARK_SLIDES) {
    const points = buildWaterparkSlidePath(slide);
    assert.ok(points.length >= 6, `${slide.id} has too few path points`);
    let minY = Infinity;
    for (const point of points) {
      assert.ok(Number.isFinite(point.x));
      assert.ok(Number.isFinite(point.y));
      assert.ok(Number.isFinite(point.z));
      assert.ok(Math.abs(point.x) <= WATERPARK_DECK_HALF_W);
      assert.ok(Math.abs(point.z) <= WATERPARK_DECK_HALF_D);
      minY = Math.min(minY, point.y);
    }
    assertClose(points[0].y, WATERPARK_DECK_Y + slide.topHeight, 0.01);
    assert.ok(points[points.length - 1].y < WATERPARK_DECK_Y + 1);
    assert.ok(minY >= WATERPARK_DECK_Y + 0.3);
  }
});

test('waterpark clear zone covers the deck and access bridge but not the wider island', () => {
  assert.equal(isInWaterparkClearZone(WATERPARK_SITE.x, WATERPARK_SITE.z), true);
  assert.equal(
    isInWaterparkClearZone(WATERPARK_SITE.x + 46, WATERPARK_SITE.z + 42),
    true,
  );
  assert.equal(
    isInWaterparkClearZone(WATERPARK_SITE.x + 90, WATERPARK_SITE.z + 90),
    false,
  );
  assert.equal(
    getWaterparkSurfaceY(WATERPARK_SITE.x, WATERPARK_SITE.z, WATERPARK_DECK_Y),
    WATERPARK_DECK_Y,
  );
  assert.equal(getWaterparkSurfaceY(WATERPARK_SITE.x, WATERPARK_SITE.z, 0), -9999);
});

test('steeper water channels accelerate harder than nearly flat runouts', () => {
  const steepStart = stepWaterparkSpeed(3, -0.9, 1 / 60, 'body');
  const flatStart = stepWaterparkSpeed(3, -0.02, 1 / 60, 'body');
  assert.ok(steepStart > flatStart);
  assert.ok(steepStart > 3);
});

test('drag and friction produce a finite terminal speed and jet boosts clear an uphill', () => {
  let body = 2;
  let coaster = 2;
  for (let i = 0; i < 1800; i++) {
    body = stepWaterparkSpeed(body, -0.8, 1 / 60, 'body');
    coaster = stepWaterparkSpeed(coaster, 0.08, 1 / 60, 'watercoaster', 1);
  }
  assert.ok(Number.isFinite(body));
  assert.ok(body <= 32);
  assert.ok(Number.isFinite(coaster));
  assert.ok(coaster > 8);
});

test('curvature yields finite vertical and lateral G values', () => {
  const loads = computeWaterparkLoads(
    18,
    new THREE.Vector3(0, -0.2, 1),
    new THREE.Vector3(0, 0.2, 1),
    new THREE.Vector3(1, 0, 0),
    2,
  );
  assert.ok(Number.isFinite(loads.verticalG));
  assert.ok(Number.isFinite(loads.lateralG));
  assert.ok(loads.verticalG > 1);
  assert.ok(loads.verticalG <= 4.5);
});

test('waterpark model builds all 28 slides, waves, bucket and lazy river without excessive draw calls', () => {
  const model = buildWaterparkModel();
  assert.equal(model.slides.length, 28);
  assert.ok(model.lazyLength > 200);
  assert.notEqual(model.wavePoolMesh, null);
  assert.notEqual(model.bucketPivot, null);
  assert.equal(model.innerTubes.length, 10);
  let meshes = 0;
  let instanced = 0;
  model.root.traverse((object) => {
    if (object instanceof THREE.InstancedMesh) instanced += 1;
    else if (object instanceof THREE.Mesh) meshes += 1;
  });
  assert.ok(meshes < 260, `model uses ${meshes} meshes`);
  assert.equal(instanced, 2);
  for (const slide of model.slides) {
    assert.ok(slide.length > 15);
    assert.ok(slide.samples.length > 20);
  }
  model.dispose();
});

test('a rider completes the tallest slide and records a personal best', () => {
  const runtime = new WaterparkRuntime(new THREE.Scene());
  assert.equal(runtime.getHudState(), null);
  assert.equal(runtime.startRide('mississippi_monster'), true);
  let steps = 0;
  let maxSpeed = 0;
  while (runtime.isActive && steps < 2000) {
    runtime.update(1 / 60);
    const hud = runtime.getHudState();
    if (hud) maxSpeed = Math.max(maxSpeed, hud.speedKmh);
    steps += 1;
  }
  assert.ok(steps < 2000);
  assert.ok(maxSpeed > 70);
  const events = runtime.consumeEvents();
  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'ride_complete');
  if (events[0].type === 'ride_complete') {
    assert.equal(events[0].rideId, 'mississippi_monster');
    assert.equal(events[0].newBest, true);
  }
  assert.equal(runtime.getStats().ridesCompleted, 1);
  assert.ok(runtime.getStats().bestTimes.mississippi_monster > 0);
  runtime.dispose();
});

test('all 28 attractions complete with finite camera physics', () => {
  const runtime = new WaterparkRuntime(new THREE.Scene());
  for (const slide of WATERPARK_SLIDES) {
    assert.equal(runtime.startRide(slide.id), true);
    let steps = 0;
    let finite = true;
    while (runtime.isActive && steps < 2500) {
      runtime.update(1 / 60);
      const frame = runtime.getRideTransform();
      if (
        frame &&
        (!Number.isFinite(frame.position.x) ||
          !Number.isFinite(frame.position.y) ||
          !Number.isFinite(frame.position.z) ||
          !Number.isFinite(frame.speedKmh) ||
          !Number.isFinite(frame.verticalG))
      ) {
        finite = false;
      }
      steps += 1;
    }
    assert.ok(steps < 2500, `${slide.id} never finished`);
    assert.equal(finite, true, `${slide.id} produced invalid physics`);
    const completed = runtime
      .consumeEvents()
      .some((event) => event.type === 'ride_complete');
    assert.equal(completed, true, `${slide.id} did not complete`);
  }
  assert.equal(runtime.getStats().ridesCompleted, 28);
  runtime.dispose();
});

test('the lazy river and dump bucket are interactive and return the rider to the deck', () => {
  const runtime = new WaterparkRuntime(new THREE.Scene());
  const lazy = WATERPARK_FEATURES.find((entry) => entry.kind === 'lazy')!;
  const lazyPos = localToWorld(lazy.x, lazy.z);
  const near = runtime.getNearbyInteraction(lazyPos.x, WATERPARK_DECK_Y, lazyPos.z);
  assert.equal(near?.kind, 'lazy');

  assert.equal(runtime.startRide('dump_bucket'), true);
  const bucketPos = localToWorld(WATERPARK_DUMP_BUCKET.x, WATERPARK_DUMP_BUCKET.z);
  for (let i = 0; i < 200; i++) {
    runtime.update(1 / 60, bucketPos.x, WATERPARK_DECK_Y, bucketPos.z);
  }
  assert.ok(runtime.consumeEvents().some((event) => event.type === 'soaked'));
  assert.equal(runtime.exitRide().y, WATERPARK_DECK_Y);

  assert.equal(runtime.startRide('lazy_river'), true);
  runtime.update(1 / 60);
  const lazyRide = runtime.getHudState();
  assert.equal(lazyRide?.name, WATERPARK_LAZY_RIVER.name);
  assert.equal(lazyRide?.kind, 'lazy');
  assert.equal(runtime.exitRide().y, WATERPARK_DECK_Y);
  runtime.dispose();
});

test('save data clamps hostile values and preserves valid park records', () => {
  const saved = sanitizeWaterparkState({
    version: 1,
    ridesCompleted: 99,
    visits: 4,
    soaks: 2,
    bestTimes: {
      mississippi_monster: 9.4,
      black_anaconda: -3,
      not_a_slide: 8,
    },
    lastRideId: 'black_anaconda',
  });
  assert.equal(saved.ridesCompleted, 99);
  assert.equal(saved.visits, 4);
  assert.equal(saved.soaks, 2);
  assert.equal(saved.bestTimes.mississippi_monster, 9.4);
  assert.equal(saved.bestTimes.black_anaconda, undefined);
  assert.equal(saved.bestTimes.not_a_slide, undefined);
  assert.equal(saved.lastRideId, 'black_anaconda');
  assert.deepEqual(sanitizeWaterparkState(null), DEFAULT_WATERPARK_STATE);
});
