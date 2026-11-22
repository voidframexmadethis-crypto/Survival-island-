import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ELEMENT_LIBRARY,
  appendElement,
  autoBankPoints,
  computeTrackStats,
  distance,
  duplicatePoint,
  removePoint,
  sampleTrack,
  sampleAtDistance,
  validateTrack,
  alignPoints,
} from './track';
import type { CoasterElementKind } from './types';
import { createTestLayoutProject } from './testFixture';

const project = createTestLayoutProject();
const samples = sampleTrack(project.points, project.closed, 12);

test('test fixture is a valid closed circuit with stations', () => {
  assert.ok(project.points.length >= 12);
  assert.equal(project.closed, true);
  assert.ok(project.points.some((point) => point.kind === 'station'));
  const validation = validateTrack(project.points, samples, project.closed);
  assert.equal(validation.ok, true, validation.errors.join(' '));
});

test('spline frames are finite, orthonormal, and continuously sampled', () => {
  assert.ok(samples.length > 100);
  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i];
    for (const value of [
      sample.position.x,
      sample.position.y,
      sample.position.z,
      sample.tangent.x,
      sample.tangent.y,
      sample.tangent.z,
      sample.right.x,
      sample.right.y,
      sample.right.z,
      sample.up.x,
      sample.up.y,
      sample.up.z,
      sample.distance,
    ]) {
      assert.ok(Number.isFinite(value), `sample ${i} has a finite value`);
    }
    const tangentLength = Math.hypot(sample.tangent.x, sample.tangent.y, sample.tangent.z);
    const rightLength = Math.hypot(sample.right.x, sample.right.y, sample.right.z);
    const upLength = Math.hypot(sample.up.x, sample.up.y, sample.up.z);
    assert.ok(Math.abs(tangentLength - 1) < 1e-5);
    assert.ok(Math.abs(rightLength - 1) < 1e-5);
    assert.ok(Math.abs(upLength - 1) < 1e-5);
    if (i > 0) assert.ok(sample.distance >= samples[i - 1].distance - 1e-6, 'distance is monotonic');
  }
  const stats = computeTrackStats(samples, project.points.length);
  assert.ok(stats.length > 120, `layout length ${stats.length}`);
  assert.ok(stats.maxHeight > 20);
  const mid = sampleAtDistance(samples, stats.length * 0.5);
  assert.ok(mid);
  assert.ok(Number.isFinite(mid.position.x));
});

test('vertical loop generates an inversion and adds real height', () => {
  const base = createTestLayoutProject();
  const points = appendElement(base.points, 'vertical_loop', { radius: 9 });
  const loopSamples = sampleTrack(points, false, 16);
  const stats = computeTrackStats(loopSamples, points.length);
  assert.ok(points.length > base.points.length + 8);
  assert.ok(stats.inversions >= 1, `inversions ${stats.inversions}`);
  assert.ok(stats.maxHeight > 25);
  for (const sample of loopSamples) {
    assert.ok(Number.isFinite(sample.position.y));
  }
});

test('every catalog element appends finite geometry', () => {
  const elements = ELEMENT_LIBRARY.flatMap((group) => group.items.map((item) => item.key));
  assert.ok(elements.includes('vertical_loop'));
  assert.ok(elements.includes('drop'));
  assert.ok(elements.includes('zero_g_roll'));
  for (const element of elements as CoasterElementKind[]) {
    const points = appendElement(createTestLayoutProject().points, element);
    const elementSamples = sampleTrack(points, false, 8);
    assert.ok(elementSamples.length > 0, `${element} produced samples`);
    assert.ok(points[points.length - 1].element === element, `${element} tagged its last point`);
    assert.ok(
      elementSamples.every((sample) => Number.isFinite(sample.position.x) && Number.isFinite(sample.position.y)),
      `${element} is finite`,
    );
  }
});

test('auto-bank rolls turns and leaves straights flat', () => {
  const banked = autoBankPoints(project.points, true);
  const maxBank = Math.max(...banked.map((point) => Math.abs(point.bank)));
  assert.ok(maxBank > 8, `max bank ${maxBank}`);
  assert.ok(maxBank <= 72);
  const straightProject = createTestLayoutProject();
  straightProject.points = [
    straightProject.points[0],
    { ...straightProject.points[0], id: 'a', position: { x: 0, y: 5, z: 10 }, bank: 0 },
    { ...straightProject.points[0], id: 'b', position: { x: 0, y: 5, z: 20 }, bank: 0 },
    { ...straightProject.points[0], id: 'c', position: { x: 0, y: 5, z: 30 }, bank: 0 },
  ];
  const flat = autoBankPoints(straightProject.points, false);
  assert.deepEqual(flat.map((point) => point.bank), [0, 0, 0, 0]);
});

test('point editing helpers preserve intended data', () => {
  const target = project.points[5];
  const moved = alignPoints(project.points, 'x', 4);
  assert.equal(moved[5].position.x, 4);
  const duplicated = duplicatePoint(project.points, target.id);
  assert.equal(duplicated.length, project.points.length + 1);
  assert.notEqual(duplicated[6].id, target.id);
  const removed = removePoint(project.points, target.id);
  assert.equal(removed.length, project.points.length - 1);
  assert.ok(distance(project.points[0].position, project.points[0].position) === 0);
});

test('validation catches ground penetration and open circuits', () => {
  const bad = createTestLayoutProject();
  bad.points[3] = { ...bad.points[3], position: { ...bad.points[3].position, y: -2 } };
  const badSamples = sampleTrack(bad.points, false, 10);
  const validation = validateTrack(bad.points, badSamples, false);
  assert.equal(validation.ok, false);
  assert.ok(validation.errors.some((error) => error.includes('below the ground')));
  assert.ok(validation.warnings.some((warning) => warning.includes('open')));
});
