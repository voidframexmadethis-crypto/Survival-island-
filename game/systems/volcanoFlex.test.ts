import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
  VOLCANO_FLEX_CLEARANCE_M,
  VOLCANO_FLEX_HEIGHT_M,
  VOLCANO_FLEX_ID,
  VOLCANO_FLEX_INVERSIONS,
  buildVolcanoFlexCoasterData,
  getVolcanoFlexSite,
} from '../world/volcanoFlexLayout';
import {
  WATERPARK_DECK_HALF_W,
  WATERPARK_SITE,
} from '../world/waterparkLayout';
import {
  buildVolcanoFlexEnvironment,
  buildVolcanoFlexTrainCar,
} from '../world/volcanoFlexModel';
import { RollerCoasterRuntime } from './rollerCoasterRuntime';

function assertClose(actual: number, expected: number, tolerance = 0.01): void {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${actual} is not within ${tolerance} of ${expected}`,
  );
}

test('Volcano Flex sits exactly 10 feet from the waterpark and is 900 feet tall', () => {
  const site = getVolcanoFlexSite();
  const deckEdge = WATERPARK_SITE.x + WATERPARK_DECK_HALF_W;
  assertClose(site.station.x - deckEdge, VOLCANO_FLEX_CLEARANCE_M, 0.001);
  assertClose(VOLCANO_FLEX_CLEARANCE_M, 3.048, 0.0001);
  assertClose(VOLCANO_FLEX_HEIGHT_M, 274.32, 0.001);
  assertClose(VOLCANO_FLEX_HEIGHT_M / 0.3048, 900, 0.01);
  assertClose(site.station.z, WATERPARK_SITE.z, 0.001);
  assert.ok(site.mountain.height >= 274.3);
  // The shell must be centred on the same local chamber as the spiral track.
  assertClose(site.mountain.x - site.station.x, 58, 0.01);
  assertClose(site.mountain.z - site.station.z, 20, 0.01);
});

test('the prebuilt track is a closed, valid, 15-inversion launch circuit', () => {
  const data = buildVolcanoFlexCoasterData();
  assert.equal(data.id, VOLCANO_FLEX_ID);
  assert.equal(data.name, 'VOLCANO FLEX');
  assert.equal(data.closedCircuit, true);
  assert.equal(data.trainCarCount, 5);
  assert.ok(data.nodes.length > 300);
  assert.ok(data.nodes.some((node) => node.segmentType === 'lsm_launch'));
  assert.ok(
    data.nodes.some(
      (node) => node.bank >= 3700 && node.segmentType === 'lsm_launch',
    ),
    'the launch circuit must include an upside-down powered block',
  );

  for (let i = 1; i < data.nodes.length; i++) {
    const prev = data.nodes[i - 1].position;
    const next = data.nodes[i].position;
    const step = Math.hypot(next.x - prev.x, next.y - prev.y, next.z - prev.z);
    assert.ok(Number.isFinite(step), `node ${i} contains a non-finite coordinate`);
    assert.ok(step > 0, `node ${i} overlaps the previous control point`);
    assert.ok(step < 22, `track gap of ${step.toFixed(1)}m at node ${i}`);
  }
  const first = data.nodes[0].position;
  const last = data.nodes[data.nodes.length - 1].position;
  assertClose(last.x, first.x, 0.01);
  assertClose(last.y, first.y, 0.01);
  assertClose(last.z, first.z, 0.01);

  const runtime = new RollerCoasterRuntime(new THREE.Scene());
  const id = runtime.addCoasterData(data);
  assert.equal(id, VOLCANO_FLEX_ID);
  const summary = runtime.getHudSummaries().find((entry) => entry.id === id);
  assert.ok(summary);
  assert.equal(summary.valid, true, summary.validationErrors.join('; '));
  assert.equal(summary.inversionsCount, VOLCANO_FLEX_INVERSIONS);
  assert.equal(summary.isCompleteCircuit, true);
  assert.ok((summary.maxHeightM ?? 0) > 190);
  assert.ok((summary.trackLengthM ?? 0) > 1200);
  runtime.dispose();
});

test('coaster detail is distance-culled and HUD node data is reused', () => {
  const scene = new THREE.Scene();
  const runtime = new RollerCoasterRuntime(scene);
  const id = runtime.addCoasterData(buildVolcanoFlexCoasterData());
  assert.ok(id);
  const first = runtime.getHudSummaries().find((entry) => entry.id === id);
  assert.ok(first);
  assert.ok(first.nodes.length > 300);

  runtime.setViewDistance(0, 0, 0, 0, 0);
  const track = scene.getObjectByName(`Coaster_${id}`);
  const environment = scene.getObjectByName('volcano-flex-environment');
  assert.ok(track);
  assert.ok(environment);
  assert.equal(track.visible, false);
  assert.equal(environment.visible, false);

  const site = getVolcanoFlexSite();
  runtime.setViewDistance(site.station.x, site.station.z, 340, 780, 360);
  assert.equal(track.visible, true);
  assert.equal(environment.visible, true);

  runtime.dispatchTrain(id, true);
  runtime.update(1 / 60, site.station.x, site.station.z);
  const second = runtime.getHudSummaries().find((entry) => entry.id === id);
  assert.ok(second);
  assert.equal(second.nodes, first.nodes, 'HUD snapshots must not clone 444 nodes every tick');
  runtime.dispose();
});

test('the train launches, completes every inversion, brakes and returns to the station', () => {
  const runtime = new RollerCoasterRuntime(new THREE.Scene());
  const id = runtime.addCoasterData(buildVolcanoFlexCoasterData());
  assert.ok(id);
  assert.equal(runtime.dispatchTrain(id, true), true);

  let maxProgress = 0;
  let maxSpeed = 0;
  let sawLaunch = false;
  let sawInverted = false;
  let sawBrakes = false;
  let minY = Infinity;
  let maxY = -Infinity;

  // Simulate at real ride-duration resolution. The circuit is roughly a minute
  // at full launch speed, so 150 seconds is enough for a complete lap.
  for (let i = 0; i < 150 * 60; i++) {
    runtime.update(1 / 60);
    const cam = runtime.getRideCameraTransform(id);
    if (!cam) continue;
    maxProgress = Math.max(maxProgress, cam.progressPercent);
    maxSpeed = Math.max(maxSpeed, cam.speedKmh);
    minY = Math.min(minY, cam.position.y);
    maxY = Math.max(maxY, cam.position.y);
    const segment = cam.segmentLabel ?? '';
    if (segment.includes('LSM Launch')) sawLaunch = true;
    if (segment.includes('Inversion') || cam.up.y < -0.35) sawInverted = true;
    if (segment.includes('Brake') || segment.includes('Station')) {
      sawBrakes = true;
    }
  }

  assert.equal(maxProgress, 100);
  assert.ok(maxSpeed > 250, `peak speed ${maxSpeed} km/h`);
  assert.ok(minY > 2.5, `train dipped below terrain at ${minY}`);
  assert.ok(maxY > 190, `train never reached the tower apex (${maxY})`);
  assert.ok(sawLaunch);
  assert.ok(sawInverted);
  assert.ok(sawBrakes);
  runtime.dispose();
});

test('the volcano environment, animated lava and armored lead car are fully modeled', () => {
  const environment = buildVolcanoFlexEnvironment();
  for (const name of [
    'volcano-outer-shell',
    'volcano-inner-chamber',
    'volcano-lava-pool',
    'volcano-lava-river',
    'volcano-lava-fall',
    'volcano-glowing-cracks',
    'volcano-embers',
    'volcano-smoke',
    'volcano-eruption-bombs',
    'volcano-launch-portal',
    'volcano-flex-station',
    'volcano-chamber-glow',
    'volcano-crater-glow',
  ]) {
    assert.ok(environment.root.getObjectByName(name), `missing ${name}`);
  }
  environment.update(1 / 60, 12.5, 240);
  environment.update(1 / 60, 12.6, 260);
  environment.dispose();

  const lead = buildVolcanoFlexTrainCar(0, true);
  const mask = lead.getObjectByName('vader-mask');
  assert.ok(mask);
  assert.ok(lead.getObjectByName('vader-eye-lens'));
  assert.ok(lead.getObjectByName('vader-breathing-grille'));
  assert.ok(lead.getObjectByName('lap-bar'));
  assert.ok(lead.getObjectByName('over-shoulder-restraint'));
  assert.ok(lead.getObjectByName('restraint-lock'));
  let seats = 0;
  let wheels = 0;
  lead.traverse((object) => {
    if (object.name === 'coaster-seat') seats += 1;
    if (object.name === 'coaster-wheel') wheels += 1;
  });
  assert.equal(seats, 2);
  assert.equal(wheels, 8);
  assert.equal((lead.userData.wheels as THREE.Mesh[]).length, 8);

  const rear = buildVolcanoFlexTrainCar(1, false);
  assert.equal(rear.getObjectByName('vader-mask'), undefined);
});
