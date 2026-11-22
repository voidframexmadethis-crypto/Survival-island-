import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BlockSafetyController,
  MechanicalController,
  buildBlockRanges,
  deriveMechanics,
} from './mechanics';
import { makePoint, vec } from './track';
import type { TrackSample } from './types';

function samples(): TrackSample[] {
  return Array.from({ length: 101 }, (_, i) => ({
    position: { x: 0, y: 5, z: i },
    tangent: { x: 0, y: 0, z: 1 },
    right: { x: 1, y: 0, z: 0 },
    up: { x: 0, y: 1, z: 0 },
    bank: 0,
    distance: i,
    curvature: 0,
    kind: i === 40 || i === 70 ? 'block_brake' : i < 5 ? 'station' : 'track',
    pointIndex: 0,
  }));
}

test('mechanical elements are detected from track points', () => {
  const points = [
    makePoint(vec(0, 4, 0), 'station'),
    makePoint(vec(0, 4, 10), 'transfer'),
    makePoint(vec(0, 4, 14), 'switch'),
    makePoint(vec(0, 4, 18), 'drop'),
    makePoint(vec(0, 4, 22), 'tilt'),
  ];
  assert.deepEqual(deriveMechanics(points), {
    transfer: true,
    switchTrack: true,
    drop: true,
    tilt: true,
  });
  assert.deepEqual(deriveMechanics([makePoint(vec(0, 4, 0), 'track')]), {
    transfer: false,
    switchTrack: false,
    drop: false,
    tilt: false,
  });
});

test('blocks split at the platform exit and every block brake', () => {
  const ranges = buildBlockRanges(samples());
  assert.equal(ranges.length, 4);
  assert.deepEqual(ranges.map((range) => range.start), [0, 5, 40, 70]);
  assert.equal(ranges[3].end, 100);
});

test('layouts without block brakes still get automatic safety blocks', () => {
  const autoSamples = samples().map((sample) => ({
    ...sample,
    kind: sample.kind === 'block_brake' ? 'track' : sample.kind,
  }));
  const ranges = buildBlockRanges(autoSamples);
  assert.ok(ranges.length >= 4);
  assert.ok(ranges.some((range) => range.kind === 'Automatic block'));
});

test('block controller forbids dispatching into an occupied block', () => {
  const controller = new BlockSafetyController(buildBlockRanges(samples()));
  controller.updateTrain(0, 2);
  controller.updateTrain(1, 20);
  assert.equal(controller.canDispatch(0, 2), false);
  controller.updateTrain(1, 80);
  assert.equal(controller.canDispatch(0, 2), true);
  assert.ok(controller.snapshot().some((block) => block.occupiedBy === 0));
  assert.ok(controller.sensorLog.length > 0);
});

test('transfer track cycles automatically and returns home', () => {
  const controller = new MechanicalController(samples(), {
    transfer: true,
    switchTrack: false,
    drop: false,
    tilt: false,
  });
  assert.equal(controller.canDispatch(0, 2), true);
  assert.equal(controller.request('transfer'), true);
  assert.equal(controller.canDispatch(0, 2), false);
  controller.update(2);
  assert.equal(controller.snapshot().transfer.side, 'storage');
  controller.update(2.1);
  assert.equal(controller.snapshot().transfer.progress, 0);
  assert.equal(controller.snapshot().transfer.side, 'main');
  assert.equal(controller.isHome(), true);
});

test('drop track lowers, holds, and resets', () => {
  const controller = new MechanicalController(samples(), {
    transfer: false,
    switchTrack: false,
    drop: true,
    tilt: false,
  });
  controller.request('drop');
  controller.update(1.2);
  assert.equal(controller.snapshot().drop.phase, 'lowering');
  assert.ok(controller.snapshot().drop.progress > 0.5);
  controller.update(1.2);
  assert.equal(controller.snapshot().drop.phase, 'down');
  controller.update(1.2);
  assert.equal(controller.snapshot().drop.phase, 'raising');
  controller.update(2);
  assert.equal(controller.snapshot().drop.phase, 'up');
  assert.equal(controller.isHome(), true);
});

test('tilt track reaches vertical and resets', () => {
  const controller = new MechanicalController(samples(), {
    transfer: false,
    switchTrack: false,
    drop: false,
    tilt: true,
  });
  controller.request('tilt');
  controller.update(2);
  assert.equal(controller.snapshot().tilt.phase, 'vertical');
  assert.equal(controller.snapshot().tilt.progress, 1);
  controller.update(2.2);
  assert.equal(controller.snapshot().tilt.phase, 'level');
  assert.equal(controller.isHome(), true);
});

test('arrival triggers automatic transfer and unavailable actions are rejected', () => {
  const controller = new MechanicalController(samples(), {
    transfer: true,
    switchTrack: false,
    drop: false,
    tilt: false,
  });
  controller.handleTrainArrival();
  assert.equal(controller.snapshot().lastAction, 'transfer');
  assert.equal(controller.request('drop'), false);
  assert.equal(controller.request('transfer'), false);
  controller.update(4.1);
  assert.equal(controller.snapshot().transfer.progress, 0);
});

test('switch track selects the storage route mid-cycle', () => {
  const controller = new MechanicalController(samples(), {
    transfer: false,
    switchTrack: true,
    drop: false,
    tilt: false,
  });
  controller.request('switch');
  controller.update(0.9);
  assert.equal(controller.snapshot().switchTrack.route, 'storage');
  controller.update(0.8);
  assert.equal(controller.snapshot().switchTrack.route, 'main');
});
