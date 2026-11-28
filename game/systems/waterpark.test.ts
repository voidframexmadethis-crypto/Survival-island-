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
  WATERPARK_LAUNCH,
  WATERPARK_LAZY_RIVER,
  WATERPARK_POOLS,
  WATERPARK_SITE,
  WATERPARK_SLIDES,
  WATERPARK_TOWER_STAIR,
  WATERPARK_TOWERS,
  buildWaterparkSlidePath,
  getWaterparkStats,
  getWaterparkSlideAccess,
  getWaterparkSlideExitPoint,
  getWaterparkSurfaceY,
  getWaterparkTowerStairTurns,
  getWaterparkTowerStairY,
  getWaterparkTowerStepCount,
  getWaterparkTowerStepRise,
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

test('every tower staircase is continuously solid from deck to summit', () => {
  for (const tower of WATERPARK_TOWERS) {
    const stepCount = getWaterparkTowerStepCount(tower.height);
    const stepRise = getWaterparkTowerStepRise(tower.height);
    assert.ok(stepCount >= 12);
    assert.ok(stepRise > 0.1 && stepRise <= 0.18, `${tower.id} treads are too steep`);
    const turns = getWaterparkTowerStairTurns(tower.height);
    let previousY = WATERPARK_DECK_Y;
    const samples = turns * 72;
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const angle = t * turns * Math.PI * 2;
      const wx = WATERPARK_SITE.x + tower.x + Math.cos(angle) * WATERPARK_TOWER_STAIR.radius;
      const wz = WATERPARK_SITE.z + tower.z + Math.sin(angle) * WATERPARK_TOWER_STAIR.radius;
      const stairY = getWaterparkTowerStairY(tower.height, t);
      // A quarter-turn landing is a flat, widened tread. Its surface is the
      // authored landing height whenever the player's feet can reach it.
      let expectedY = stairY;
      for (const landingT of [0.25, 0.5, 0.75]) {
        const landingAngle = landingT * turns * Math.PI * 2;
        const landingY = getWaterparkTowerStairY(tower.height, landingT);
        const offsetX =
          WATERPARK_SITE.x +
          tower.x +
          Math.cos(angle) * WATERPARK_TOWER_STAIR.radius -
          (WATERPARK_SITE.x + tower.x + Math.cos(landingAngle) * WATERPARK_TOWER_STAIR.radius);
        const offsetZ =
          WATERPARK_SITE.z +
          tower.z +
          Math.sin(angle) * WATERPARK_TOWER_STAIR.radius -
          (WATERPARK_SITE.z + tower.z + Math.sin(landingAngle) * WATERPARK_TOWER_STAIR.radius);
        const radialOffset =
          offsetX * Math.cos(landingAngle) + offsetZ * Math.sin(landingAngle);
        const tangentOffset =
          -offsetX * Math.sin(landingAngle) + offsetZ * Math.cos(landingAngle);
        if (
          Math.abs(radialOffset) <= 1.2 &&
          Math.abs(tangentOffset) <= 0.5 &&
          landingY <= stairY + 0.63 &&
          Math.abs(stairY + 0.01 - landingY) <= 0.46
        ) {
          // A flat landing overrides the underlying helix while the feet are
          // within a step of its authored height.
          expectedY = landingY;
        }
      }
      const summitY =
        WATERPARK_DECK_Y + tower.height + WATERPARK_TOWER_STAIR.landingRise;
      if (
        Math.abs(Math.cos(angle) * WATERPARK_TOWER_STAIR.radius) <=
          WATERPARK_TOWER_STAIR.radius + 0.03 &&
        Math.abs(Math.sin(angle) * WATERPARK_TOWER_STAIR.radius) <=
          WATERPARK_TOWER_STAIR.radius + 0.03 &&
        summitY <= stairY + 0.41
      ) {
        expectedY = Math.max(expectedY, summitY);
      }
      let surfaceY = getWaterparkSurfaceY(wx, wz, stairY + 0.01, stairY + 0.01);
      // A launch platform that overlaps a stair is an authored flat deck and
      // takes precedence when it is within a step of the tread.
      const onLaunchDeck = WATERPARK_SLIDES.some((slide) => {
        const access = getWaterparkSlideAccess(slide);
        return (
          access.startY <= stairY + 0.09 &&
          access.startY >= stairY - 0.75 &&
          Math.abs(wx - WATERPARK_SITE.x - access.startX) <=
            WATERPARK_LAUNCH.platformHalf &&
          Math.abs(wz - WATERPARK_SITE.z - access.startZ) <=
            WATERPARK_LAUNCH.platformHalf &&
          access.startY >= stairY - 0.3
        );
      });
      if (onLaunchDeck) expectedY = surfaceY;
      assertClose(surfaceY, expectedY, 0.02);
      assert.ok(surfaceY - previousY <= 0.63, `${tower.id} stair has a non-walkable step`);
      previousY = surfaceY;
    }
    const summitY =
      WATERPARK_DECK_Y + tower.height + WATERPARK_TOWER_STAIR.landingRise;
    const summit = getWaterparkSurfaceY(
      WATERPARK_SITE.x + tower.x + 2.5,
      WATERPARK_SITE.z + tower.z - 2.5,
      summitY + 0.1,
      summitY + 0.1,
    );
    assertClose(summit, summitY, 0.02);
  }
});

test('every slide has a walkable catwalk, launch deck, and no interaction prompt', () => {
  const scene = new THREE.Scene();
  const runtime = new WaterparkRuntime(scene);
  for (const slide of WATERPARK_SLIDES) {
    const access = getWaterparkSlideAccess(slide);
    const entry = runtime.getPhysicalSlideEntry(slide.id);
    assert.ok(entry, `${slide.id} has no physical mouth`);
    assert.ok(
      Math.abs(entry.y - access.startY) < 1.0,
      `${slide.id} mouth must connect to its launch deck`,
    );
    assertClose(entry.x, WATERPARK_SITE.x + access.startX, 0.35);
    assertClose(entry.z, WATERPARK_SITE.z + access.startZ, 0.35);

    const launchSurface = getWaterparkSurfaceY(
      WATERPARK_SITE.x + access.startX,
      WATERPARK_SITE.z + access.startZ,
      access.startY,
      access.startY,
    );
    assertClose(launchSurface, access.startY, 0.03);

    for (let i = 1; i < access.catwalk.length; i++) {
      const catwalkX = (access.catwalk[i - 1].x + access.catwalk[i].x) * 0.5;
      const catwalkZ = (access.catwalk[i - 1].z + access.catwalk[i].z) * 0.5;
      const catwalkSurface = getWaterparkSurfaceY(
        WATERPARK_SITE.x + catwalkX,
        WATERPARK_SITE.z + catwalkZ,
        access.startY,
        access.startY,
      );
      assertClose(catwalkSurface, access.startY, 0.03);
    }

    const prompt = runtime.getNearbyInteraction(entry.x, entry.y + 0.1, entry.z);
    assert.equal(prompt, null, `${slide.id} must never ask for an interaction key`);
  }
  runtime.dispose();
});

test('all 28 slides are physically ridden end-to-end at 30, 60 and 120 Hz', () => {
  const scene = new THREE.Scene();
  const runtime = new WaterparkRuntime(scene);
  const rates = [1 / 30, 1 / 60, 1 / 120];
  const entrySpeeds = [1.2, 3.4, 7.5];
  for (let rateIndex = 0; rateIndex < rates.length; rateIndex++) {
    const dt = rates[rateIndex];
    const entrySpeed = entrySpeeds[rateIndex];
    for (const slide of WATERPARK_SLIDES) {
      runtime.cancelPhysicalSlide();
      const access = getWaterparkSlideAccess(slide);
      const entry = runtime.getPhysicalSlideEntry(slide.id)!;
      const approachDx = access.stairX - access.startX;
      const approachDz = access.stairZ - access.startZ;
      const approachLength = Math.hypot(approachDx, approachDz);
      if (approachLength > 2.2) {
        const before = runtime.tryEnterPhysicalSlide(
          entry.x + (approachDx / approachLength) * 1.8,
          access.startY + 0.1,
          entry.z + (approachDz / approachLength) * 1.8,
          entrySpeed,
        );
        assert.equal(before, null, `${slide.id} must not engage far from its mouth`);
      }

      let snapshot = runtime.tryEnterPhysicalSlide(
        entry.x,
        access.startY + 0.1,
        entry.z,
        entrySpeed,
      );
      assert.ok(snapshot, `${slide.id} did not engage by walking into it`);
      assert.equal(snapshot.slideId, slide.id);
      let previous = snapshot;
      let steps = 0;
      while (!snapshot.finished && steps < 20000) {
        const next = runtime.stepPhysicalSlide(dt);
        assert.ok(next, `${slide.id} lost its collision surface at ${dt.toFixed(3)} s`);
        snapshot = next;
        assert.ok(Number.isFinite(snapshot.x));
        assert.ok(Number.isFinite(snapshot.y));
        assert.ok(Number.isFinite(snapshot.z));
        assert.ok(Number.isFinite(snapshot.speed));
        assert.ok(snapshot.speed <= 32.01, `${slide.id} exceeded the speed limit`);
        assert.ok(
          snapshot.progressPercent >= previous.progressPercent - 0.001,
          `${slide.id} travelled backwards`,
        );
        assert.ok(
          Math.abs(snapshot.lateralOffset) <= snapshot.lateralLimit + 0.002,
          `${slide.id} clipped through a slide wall`,
        );
        assert.ok(
          Math.abs(snapshot.y - previous.y) <= 2.5,
          `${slide.id} tunnelled vertically at ${dt.toFixed(3)} s`,
        );
        assert.ok(snapshot.y >= WATERPARK_DECK_Y - 1.2, `${slide.id} fell below the deck`);
        assert.ok(
          snapshot.y <= WATERPARK_DECK_Y + slide.topHeight + 0.6,
          `${slide.id} launched above its launch height`,
        );
        previous = snapshot;
        steps++;
      }
      assert.ok(snapshot.finished, `${slide.id} never reached splashdown`);
      assert.equal(snapshot.progressPercent, 100);
      assert.equal(snapshot.speed, 0, `${slide.id} must be arrested by the splash pool`);
      assert.ok(Number.isFinite(snapshot.yaw), `${slide.id} has an invalid splashdown heading`);
      const safeExit = getWaterparkSlideExitPoint(slide);
      assertClose(snapshot.x, WATERPARK_SITE.x + safeExit.x, 0.001);
      assertClose(snapshot.z, WATERPARK_SITE.z + safeExit.z, 0.001);
      assertClose(snapshot.y, WATERPARK_DECK_Y, 0.001);
      const exitSurface = getWaterparkSurfaceY(
        snapshot.x,
        snapshot.z,
        snapshot.y + 0.1,
        snapshot.y + 0.1,
      );
      assertClose(exitSurface, WATERPARK_DECK_Y, 0.03);
    }
  }
  runtime.dispose();
});

test('every splashdown hands the player to a dry, walkable deck exit', () => {
  for (const slide of WATERPARK_SLIDES) {
    const exit = getWaterparkSlideExitPoint(slide);
    for (const pool of WATERPARK_POOLS) {
      const inside =
        Math.abs(exit.x - pool.x) <= pool.w * 0.5 &&
        Math.abs(exit.z - pool.z) <= pool.d * 0.5;
      assert.equal(inside, false, `${slide.id} exits inside ${pool.id}`);
    }
    assert.ok(Math.abs(exit.x) < WATERPARK_DECK_HALF_W);
    assert.ok(Math.abs(exit.z) < WATERPARK_DECK_HALF_D);
    assertClose(
      getWaterparkSurfaceY(
        WATERPARK_SITE.x + exit.x,
        WATERPARK_SITE.z + exit.z,
        exit.y + 0.1,
        exit.y + 0.1,
      ),
      WATERPARK_DECK_Y,
      0.03,
    );
  }
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
    assert.ok(slide.vehicle, `${slide.spec.id} has no aligned ride vehicle`);
    assert.equal(slide.vehicle.visible, false, `${slide.spec.id} vehicle should be parked`);
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

test('raft, tube and mat vehicles stay glued to the ridden slide path', () => {
  const scene = new THREE.Scene();
  const runtime = new WaterparkRuntime(scene);
  const handles = (
    runtime as unknown as {
      handles: {
        slides: Array<{
          spec: { id: string };
          vehicle: THREE.Group;
        }>;
      };
    }
  ).handles;
  for (const id of ['scorpions_tail', 'python_pit', 'sidewinder_racers']) {
    const slide = handles.slides.find((entry) => entry.spec.id === id)!;
    const access = getWaterparkSlideAccess(
      WATERPARK_SLIDES.find((entry) => entry.id === id)!,
    );
    const entry = runtime.getPhysicalSlideEntry(id)!;
    const snapshot = runtime.tryEnterPhysicalSlide(entry.x, access.startY + 0.1, entry.z, 3);
    assert.ok(snapshot, `${id} did not load`);
    assert.equal(slide.vehicle.visible, true, `${id} vehicle is missing at load`);
    assert.ok(
      Math.abs(slide.vehicle.position.x - (snapshot.x - WATERPARK_SITE.x)) < 0.02,
      `${id} vehicle detached laterally`,
    );
    assert.ok(
      Math.abs(slide.vehicle.position.z - (snapshot.z - WATERPARK_SITE.z)) < 0.02,
      `${id} vehicle detached longitudinally`,
    );
    let current = snapshot;
    for (let i = 0; i < 2000 && !current.finished; i++) {
      current = runtime.stepPhysicalSlide(1 / 60)!;
      if (!current.finished) {
        assert.ok(slide.vehicle.visible, `${id} vehicle vanished mid-ride`);
        assert.ok(Number.isFinite(slide.vehicle.position.y));
      }
    }
    assert.equal(current.finished, true);
    assert.equal(slide.vehicle.visible, false, `${id} vehicle did not park after splashdown`);
    runtime.cancelPhysicalSlide();
    (
      runtime as unknown as { physicalCooldown: number }
    ).physicalCooldown = 0;
  }
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
