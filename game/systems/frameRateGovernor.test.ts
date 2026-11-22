import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_RENDER_SCALE_STEPS,
  FrameRateGovernor,
} from './frameRateGovernor';

function run(
  governor: FrameRateGovernor,
  frameMs: number,
  frames: number,
  nowStart: { value: number },
): number {
  let changes = 0;
  for (let i = 0; i < frames; i++) {
    nowStart.value += frameMs;
    if (governor.noteFrame(frameMs, nowStart.value)) changes++;
  }
  return changes;
}

test('governor keeps full resolution when the device holds 60 FPS', () => {
  const governor = new FrameRateGovernor();
  const now = { value: 0 };
  governor.reset(0);
  run(governor, 1000 / 60, 600, now);
  assert.equal(governor.scale, 1);
  assert.equal(governor.tier, 0);
  assert.ok(governor.fps > 59);
});

test('governor steps resolution down under sustained load and stops at the floor', () => {
  const governor = new FrameRateGovernor();
  const now = { value: 0 };
  governor.reset(0);
  // 33 ms frames (~30 FPS) once past the startup grace.
  let changes = 0;
  for (let i = 0; i < 1200; i++) {
    now.value += 33.3;
    if (governor.noteFrame(33.3, now.value)) changes++;
  }
  assert.ok(changes >= 3, `expected several downgrades, got ${changes}`);
  assert.equal(governor.tier, DEFAULT_RENDER_SCALE_STEPS.length - 1);
  assert.equal(governor.atFloor, true);
  assert.ok(governor.scale < 0.7);
});

test('governor restores resolution after sustained 60 FPS headroom', () => {
  const governor = new FrameRateGovernor();
  const now = { value: 0 };
  governor.reset(0);
  for (let i = 0; i < 1400; i++) {
    now.value += 33.3;
    governor.noteFrame(33.3, now.value);
  }
  assert.ok(governor.tier > 0);

  for (let i = 0; i < 3200; i++) {
    now.value += 16.6;
    governor.noteFrame(16.6, now.value);
  }
  assert.equal(governor.tier, 0);
  assert.equal(governor.scale, 1);
});

test('governor cuts quality immediately on a burst of severe frames', () => {
  const governor = new FrameRateGovernor({
    startupGraceMs: 0,
    severeFrameMs: 50,
    severeFrameLimit: 2,
    sampleWindowMs: 1000,
  });
  const now = { value: 0 };
  governor.reset(0);
  let changes = 0;
  for (let i = 0; i < 12; i++) {
    now.value += 60;
    if (governor.noteFrame(60, now.value)) changes++;
  }
  assert.ok(changes >= 1, 'severe frames should trigger an immediate quality cut');
  assert.ok(governor.tier > 0, 'the render scale should move down');
});

test('governor ignores loading stalls and tab-switch frames', () => {
  const governor = new FrameRateGovernor();
  const now = { value: 0 };
  governor.reset(0);
  run(governor, 1000 / 60, 200, now);
  for (let i = 0; i < 30; i++) {
    now.value += 900;
    governor.noteFrame(900, now.value);
  }
  assert.equal(governor.tier, 0);
});

test('governor clamps the scale to the configured range', () => {
  const governor = new FrameRateGovernor({ minScale: 0.7, maxScale: 1 });
  const now = { value: 0 };
  governor.reset(0);
  for (let i = 0; i < 2000; i++) {
    now.value += 50;
    governor.noteFrame(50, now.value);
  }
  assert.ok(governor.scale >= 0.7);
  assert.ok(governor.scale <= 1);
});
