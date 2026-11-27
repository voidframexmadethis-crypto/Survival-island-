import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
  GIANT_SNAKE_HEIGHT_M,
  GIANT_SNAKE_ID,
  GIANT_SNAKE_LAYOUT_TAG,
  GIANT_SNAKE_NAME,
  buildGiantSnakeCoasterData,
  buildGiantSnakeNodes,
  buildGiantSnakeTrack,
  getGiantSnakeSite,
  getGiantSnakeSwingLaunch,
  getGiantSnakeTunnels,
} from '../world/giantSnakeLayout';
import {
  buildGiantSnakeEnvironment,
  buildGiantSnakeTrainCar,
} from '../world/giantSnakeModel';
import {
  RollerCoasterRuntime,
  applyIslandHorizonFrames,
  applyLoopPlaneFrames,
} from './rollerCoasterRuntime';
import { CoasterEditor } from './rollerCoasterSystem';

function stationTransform() {
  const site = getGiantSnakeSite();
  return {
    x: site.station.x - 2.8,
    y: site.station.y,
    z: site.station.z - 0.58,
    rotationY: Math.PI / 2,
  };
}

function runtimeForGiantSnake(): RollerCoasterRuntime {
  const scene = new THREE.Scene();
  const runtime = new RollerCoasterRuntime(scene);
  runtime.addCoasterData(buildGiantSnakeCoasterData());
  return runtime;
}

test('THE GIANT SNAKE is one closed, valid modern launch circuit', () => {
  const data = buildGiantSnakeCoasterData();
  assert.equal(data.id, GIANT_SNAKE_ID);
  assert.equal(data.name, GIANT_SNAKE_NAME);
  assert.equal(data.closedCircuit, true);
  assert.ok(data.pieceTags?.includes(GIANT_SNAKE_LAYOUT_TAG));
  assert.ok(data.pieceTags?.includes('switch_track'));
  assert.ok(data.pieceTags?.includes('swing_launch'));
  assert.ok(data.pieceTags?.includes('tunnels'));
  assert.ok(data.swingLaunch);

  const first = data.nodes[0].position;
  const last = data.nodes[data.nodes.length - 1].position;
  assert.ok(Math.hypot(last.x - first.x, last.y - first.y, last.z - first.z) < 0.01);

  for (let i = 1; i < data.nodes.length; i++) {
    const a = data.nodes[i - 1].position;
    const b = data.nodes[i].position;
    const step = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
    assert.ok(Number.isFinite(step) && step < 7, `bad gap ${step.toFixed(2)} at ${i}`);
    assert.ok(b.y > -6, `node ${i} sinks below the tunnel envelope at y=${b.y.toFixed(2)}`);
  }

  const tunnels = getGiantSnakeTunnels();
  assert.equal(tunnels.length, 2);
  assert.ok(tunnels.every((t) => t.points.length > 20));
  assert.ok(tunnels.every((t) => t.points.some((p) => p.y < 0)));

  const heights = data.nodes.map((n) => n.position.y);
  const ground = getGiantSnakeSite().ground;
  assert.ok(Math.max(...heights) - ground > 42);
  assert.ok(Math.max(...heights) < 50);
  assert.ok(Math.abs(Math.max(...heights) - ground - GIANT_SNAKE_HEIGHT_M) < 4);
});

test('swing markers describe a short forward stall and a huge backward spike', () => {
  const track = buildGiantSnakeTrack();
  const editor = new CoasterEditor();
  for (const n of track.nodes) editor.addPoint(n.position, n.bank, n.segmentType, n.targetSpeed, n.frameMode);
  const samples = editor.getTrack();
  const total = samples[samples.length - 1].distance;
  const marker = (point: { x: number; y: number; z: number }) => {
    let best = Number.POSITIVE_INFINITY;
    let distance = 0;
    for (const sample of samples) {
      const d =
        (sample.position.x - point.x) ** 2 +
        (sample.position.y - point.y) ** 2 +
        (sample.position.z - point.z) ** 2;
      if (d < best) {
        best = d;
        distance = sample.distance;
      }
    }
    return distance;
  };
  const swing = getGiantSnakeSwingLaunch();
  const forward = marker(swing.forwardStall);
  const spike = marker(swing.spikeApex);
  const reverseMetres = ((forward - spike) % total + total) % total;
  assert.ok(forward > 70 && forward < 140, `forward stall at ${forward}`);
  assert.ok(reverseMetres > 300, `backward spike is only ${reverseMetres} m`);
  assert.ok(swing.launchSpeedMps > 20);
  assert.ok(swing.boostSpeedMps > swing.launchSpeedMps);
  assert.equal(swing.switchDurationS > 1, true);
});

test('Giant Snake clearances, frames and high-speed seams stay smooth', () => {
  const nodes = buildGiantSnakeNodes();
  const editor = new CoasterEditor();
  for (const n of nodes) editor.addPoint(n.position, n.bank, n.segmentType, n.targetSpeed, n.frameMode);
  const samples = editor.getTrack();
  applyIslandHorizonFrames(samples);
  applyLoopPlaneFrames(samples);

  const total = samples[samples.length - 1].distance;
  assert.ok(total > 2400 && total < 3200, `unexpected track length ${total}`);
  let closest = Number.POSITIVE_INFINITY;
  for (let i = 0; i < samples.length; i += 2) {
    for (let j = i + 2; j < samples.length; j += 2) {
      let along = Math.abs(samples[i].distance - samples[j].distance);
      along = Math.min(along, total - along);
      if (along < 14) continue;
      const a = samples[i].position;
      const b = samples[j].position;
      closest = Math.min(closest, Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z));
    }
  }
  assert.ok(closest > 2.2, `non-adjacent track only ${closest.toFixed(2)} m apart`);

  for (let i = 1; i < samples.length; i++) {
    const prev = samples[i - 1];
    const next = samples[i];
    assert.ok(Math.hypot(
      next.position.x - prev.position.x,
      next.position.y - prev.position.y,
      next.position.z - prev.position.z,
    ) < 7);
    assert.ok(Math.abs(next.up.x) <= 1.01 && Math.abs(next.up.y) <= 1.01);
  }

  // Every major block is present and no section is left with a vertical kink.
  const labels = new Set(samples.map((s) => s.segmentType));
  for (const label of ['station', 'lsm_launch', 'inversion', 'block_brake', 'coast'] as const) {
    assert.ok(labels.has(label), `missing ${label}`);
  }
});

test('the train is boardable and the five-car train aligns with the island deck', () => {
  const car = buildGiantSnakeTrainCar(0, true);
  const box = new THREE.Box3().setFromObject(car);
  assert.ok(box.min.y >= -0.21 && box.min.y <= 0.02, `wheel bottom ${box.min.y}`);
  assert.ok(box.max.y > 1.0);
  assert.ok(car.userData.wheels?.length === 4);

  const runtime = runtimeForGiantSnake();
  const summary = runtime.getHudSummaries().find((s) => s.id === GIANT_SNAKE_ID);
  assert.ok(summary);
  assert.equal(summary?.name, GIANT_SNAKE_NAME);
  assert.ok((summary?.trackLengthM ?? 0) > 2400);
  assert.ok((summary?.inversionsCount ?? 0) >= 8);
  assert.ok(runtime.getBoardingProximity(GIANT_SNAKE_ID, stationTransform().x, stationTransform().z) !== null);
  runtime.dispose();
});

test('dispatch runs the complete swing launch and returns to the station', () => {
  const runtime = runtimeForGiantSnake();
  const internal = runtime as unknown as {
    coasters: Map<
      string,
      {
        swingState: string;
        swingDirection: 1 | -1;
        train: { position: number; speed: number };
      }
    >;
  };
  assert.ok(runtime.dispatchTrain(GIANT_SNAKE_ID, true));
  const entry = internal.coasters.get(GIANT_SNAKE_ID);
  assert.ok(entry);

  const seen = new Set<string>();
  let sawReverse = false;
  let maxSpeed = 0;
  const dt = 1 / 30;
  for (let i = 0; i < 265 / dt; i++) {
    runtime.update(dt);
    seen.add(entry.swingState);
    if (entry.swingDirection === -1) sawReverse = true;
    maxSpeed = Math.max(maxSpeed, entry.train.speed);
  }

  assert.ok(seen.has('to-switch'));
  assert.ok(seen.has('throwing-switch'));
  assert.ok(seen.has('forward-stall'));
  assert.ok(seen.has('reverse-spike'));
  assert.ok(seen.has('relaunch'));
  assert.ok(seen.has('coast'));
  assert.equal(sawReverse, true);
  assert.ok(maxSpeed > 25, `swing only reached ${maxSpeed.toFixed(1)} m/s`);
  assert.equal(runtime.consumeStationArrival(GIANT_SNAKE_ID), true);
  assert.equal(runtime.isTrainAtStation(GIANT_SNAKE_ID), true);
  runtime.dispose();
});

test('swing spec survives save, reload and stays a single coaster', () => {
  const runtime = runtimeForGiantSnake();
  const exported = runtime.exportCoasters();
  assert.equal(exported.length, 1);
  assert.ok(exported[0].swingLaunch);
  assert.equal(exported[0].pieceTags?.includes('switch_track'), true);

  const reloaded = new RollerCoasterRuntime(new THREE.Scene());
  reloaded.importCoasters(exported);
  const names = reloaded.getHudSummaries().map((s) => s.name);
  assert.deepEqual(names, [GIANT_SNAKE_NAME]);
  assert.equal(reloaded.dispatchTrain(GIANT_SNAKE_ID, true), true);
  assert.equal(reloaded.isTrainAtStation(GIANT_SNAKE_ID), false);
  reloaded.dispose();
  runtime.dispose();
});

test('themed environment builds tunnels, switch hardware and a readable sign', () => {
  const env = buildGiantSnakeEnvironment();
  const names = new Set<string>();
  env.root.traverse((obj) => {
    if (obj.name) names.add(obj.name);
  });
  assert.ok(names.has('giant-snake-tunnel-bore'));
  assert.ok(names.has('giant-snake-switch-table'));
  env.setSwitchOffset(1.4);
  env.update(0.016, 1, 90);
  assert.ok(env.root.children.length > 2);
  env.dispose();
});
