import assert from 'node:assert/strict';
import test from 'node:test';
import { CoasterSimulation } from './physics';
import { makePoint, sampleTrack, trackLength, vec } from './track';
import { createTestLayoutProject } from './testFixture';
import type { TrackSample } from './types';

function makeSamples(): TrackSample[] {
  return Array.from({ length: 120 }, (_, i) => ({
    position: { x: 0, y: 4 + Math.sin((i / 120) * Math.PI * 2) * 2, z: i * 0.8 },
    tangent: { x: 0, y: 0, z: 1 },
    right: { x: 1, y: 0, z: 0 },
    up: { x: 0, y: 1, z: 0 },
    bank: 0,
    distance: i * 0.8,
    curvature: 0.002,
    kind: i < 8 ? 'station' : i === 50 || i === 90 ? 'block_brake' : 'track',
    pointIndex: i < 8 ? 0 : i === 50 ? 1 : 2,
  }));
}

test('default layout produces a running train and real telemetry', () => {
  const project = createTestLayoutProject();
  project.trainCount = 1;
  const samples = sampleTrack(project.points, project.closed, 16);
  const sim = new CoasterSimulation(samples, true, 1, {
    targetSpeeds: project.points.map((point) => point.targetSpeed),
  });
  sim.reset();
  assert.ok(trackLength(samples) > 100);
  assert.equal(sim.dispatch(0), true);
  for (let i = 0; i < 240; i++) sim.step(1 / 60);
  const telemetry = sim.telemetry(0);
  assert.ok(telemetry);
  assert.ok(telemetry.speedKmh > 5, `speed ${telemetry.speedKmh}`);
  assert.ok(telemetry.distance > 5);
  assert.ok(Number.isFinite(telemetry.gForce));
  assert.ok(['running', 'arriving'].includes(telemetry.state));
});

test('lift accelerates a stopped train and brakes slow it', () => {
  const samples = makeSamples();
  samples[20] = { ...samples[20], kind: 'chain_lift' };
  for (let i = 30; i < 42; i++) samples[i] = { ...samples[i], kind: 'brake' };
  const sim = new CoasterSimulation(samples, true, 1, {
    rollingResistance: 0,
    drag: 0,
    gravity: 9.81,
  });
  const train = sim.trains[0];
  train.s = samples[20].distance;
  train.v = 0;
  train.state = 'running';
  sim.step(1);
  assert.ok(train.v > 1, `lift speed ${train.v}`);

  train.s = samples[30].distance;
  train.v = 25;
  train.state = 'running';
  train.lap = 0;
  for (let i = 0; i < 5; i++) sim.step(0.1);
  assert.ok(train.v < 24, `brake speed ${train.v}`);
});

test('block safety prevents dispatch into an occupied block', () => {
  const samples = makeSamples();
  const sim = new CoasterSimulation(samples, true, 2);
  sim.trains[0].s = 2;
  sim.trains[1].s = 60;
  const dispatched = sim.dispatch(0);
  assert.equal(dispatched, false);
  sim.trains[1].s = 100;
  assert.equal(sim.dispatch(0), true);
});

test('simulation never emits NaN through a full multi-minute run', () => {
  const project = createTestLayoutProject();
  const samples = sampleTrack(project.points, project.closed, 20);
  const sim = new CoasterSimulation(samples, true, 2, {
    targetSpeeds: project.points.map((point) => point.targetSpeed),
  });
  sim.dispatch(0);
  for (let i = 0; i < 60 * 180; i++) {
    sim.step(1 / 60);
  }
  for (const train of sim.trains) {
    assert.ok(Number.isFinite(train.s), 'train distance finite');
    assert.ok(Number.isFinite(train.v), 'train speed finite');
  }
  const telemetry = sim.telemetry(0);
  assert.ok(telemetry);
  assert.ok(Number.isFinite(telemetry.speedKmh));
  assert.ok(Number.isFinite(telemetry.gForce));
});

test('a dispatched train completes the circuit and parks at the station', () => {
  const project = createTestLayoutProject();
  const samples = sampleTrack(project.points, project.closed, 20);
  const sim = new CoasterSimulation(samples, true, 1, {
    targetSpeeds: project.points.map((point) => point.targetSpeed),
  });
  sim.dispatch(0);
  for (let i = 0; i < 60 * 90; i++) sim.step(1 / 60);
  const telemetry = sim.telemetry(0);
  assert.ok(telemetry);
  assert.equal(telemetry.state, 'stopped');
  assert.equal(telemetry.speedKmh, 0);
  assert.ok(telemetry.section === 'station' || telemetry.section === 'track');
});

test('a second train waits for the first to clear the platform and block', () => {
  const project = createTestLayoutProject();
  const samples = sampleTrack(project.points, project.closed, 20);
  const sim = new CoasterSimulation(samples, true, 2, {
    targetSpeeds: project.points.map((point) => point.targetSpeed),
  });
  assert.equal(sim.dispatch(0), true);
  assert.equal(sim.dispatch(1), false);
  for (let i = 0; i < 60 * 12; i++) sim.step(1 / 60);
  assert.equal(sim.dispatch(1), true);
});

test('reset returns trains to the station at rest', () => {
  const sim = new CoasterSimulation(makeSamples(), true, 1);
  sim.dispatch(0);
  sim.step(1);
  assert.ok(sim.trains[0].v > 0);
  sim.reset();
  assert.equal(sim.trains[0].v, 0);
  assert.equal(sim.trains[0].state, 'stopped');
});

test('launch section uses the configured target speed', () => {
  const points = [
    makePoint(vec(0, 2, 0), 'station'),
    makePoint(vec(0, 2, 6), 'station'),
    makePoint(vec(0, 2, 12), 'launch', 0, 'launch', 42),
    makePoint(vec(0, 2, 32), 'track'),
    makePoint(vec(30, 2, 60), 'track'),
    makePoint(vec(0, 2, 0), 'station'),
  ];
  const samples = sampleTrack(points, false, 14);
  const launch = samples.find((sample) => sample.kind === 'launch');
  assert.ok(launch);
  const sim = new CoasterSimulation(samples, false, 1, {
    targetSpeeds: points.map((point) => point.targetSpeed),
  });
  const train = sim.trains[0];
  train.s = launch.distance;
  train.v = 4;
  train.state = 'running';
  train.lap = 0;
  for (let i = 0; i < 120; i++) sim.step(1 / 60);
  assert.ok(train.v > 10, `launch speed ${train.v}`);
});
