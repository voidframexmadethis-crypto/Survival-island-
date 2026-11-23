import assert from 'node:assert/strict';
import test from 'node:test';
import {
  HYDRAULIC_SECTION_STEP,
  adjustHydraulicSection,
  createHydraulicControlState,
  hasManualHydraulicHeight,
  hydraulicBounceImpulse,
  hydraulicCornerTargets,
  resetHydraulicHeight,
  toggleHydraulicLock,
} from './hydraulicControls';

test('front, rear, left and right cylinders move independently', () => {
  let state = createHydraulicControlState();
  state = adjustHydraulicSection(state, 'rear', 1);
  assert.equal(state.rear, HYDRAULIC_SECTION_STEP);
  assert.equal(state.front, 0);
  assert.deepEqual(hydraulicCornerTargets(state), {
    fl: 0,
    fr: 0,
    rl: HYDRAULIC_SECTION_STEP,
    rr: HYDRAULIC_SECTION_STEP,
  });

  state = adjustHydraulicSection(state, 'front', 1);
  state = adjustHydraulicSection(state, 'left', 1);
  assert.equal(state.front, HYDRAULIC_SECTION_STEP);
  assert.equal(state.left, HYDRAULIC_SECTION_STEP);
  assert.equal(hydraulicCornerTargets(state).fl, HYDRAULIC_SECTION_STEP * 2);
  assert.equal(hydraulicCornerTargets(state).fr, HYDRAULIC_SECTION_STEP);
  assert.equal(hydraulicCornerTargets(state).rl, HYDRAULIC_SECTION_STEP * 2);
  assert.equal(hydraulicCornerTargets(state).rr, HYDRAULIC_SECTION_STEP);
});

test('locking rear height freezes it and repeated bouncing never lowers it', () => {
  let state = createHydraulicControlState();
  for (let i = 0; i < 10; i++) state = adjustHydraulicSection(state, 'rear', 1);
  state = adjustHydraulicSection(state, 'front', 1);
  const raisedRear = state.rear;
  assert.ok(raisedRear > 0.7);

  state = toggleHydraulicLock(state);
  assert.equal(state.locked, true);
  const lockedTargets = hydraulicCornerTargets(state);
  assert.equal(lockedTargets.rl, raisedRear);
  assert.equal(lockedTargets.rr, raisedRear);

  // Simulated repeated bounces must return to the same locked targets.
  let fl = lockedTargets.fl;
  let fr = lockedTargets.fr;
  let rl = lockedTargets.rl;
  let rr = lockedTargets.rr;
  let vfl = 0;
  let vfr = 0;
  let vrl = 0;
  let vrr = 0;
  const dt = 1 / 60;
  for (let hit = 0; hit < 24; hit++) {
    const impulse = hydraulicBounceImpulse(state, hit % 2 === 0 ? 1.75 : 0.65, 'all');
    vfl += impulse.fl;
    vfr += impulse.fr;
    vrl += impulse.rl;
    vrr += impulse.rr;
    for (let frame = 0; frame < 90; frame++) {
      vfl += ((lockedTargets.fl - fl) * 88 - vfl * 7) * dt;
      fl += vfl * dt;
      vfr += ((lockedTargets.fr - fr) * 88 - vfr * 7) * dt;
      fr += vfr * dt;
      vrl += ((lockedTargets.rl - rl) * 88 - vrl * 7) * dt;
      rl += vrl * dt;
      vrr += ((lockedTargets.rr - rr) * 88 - vrr * 7) * dt;
      rr += vrr * dt;
    }
    assert.deepEqual(hydraulicCornerTargets(state), lockedTargets);
  }
  assert.ok(Math.abs(rl - raisedRear) < 0.02, `rear drifted to ${rl}`);
  assert.ok(Math.abs(rr - raisedRear) < 0.02, `rear drifted to ${rr}`);
  assert.ok(rl > 0.7, 'rear did not stay raised through bouncing');
});

test('locked sections ignore height changes until unlocked', () => {
  let state = createHydraulicControlState();
  state = adjustHydraulicSection(state, 'rear', 1);
  state = toggleHydraulicLock(state);
  const locked = state.rear;
  state = adjustHydraulicSection(state, 'rear', -1);
  assert.equal(state.rear, locked);
  state = toggleHydraulicLock(state);
  state = adjustHydraulicSection(state, 'rear', -1);
  assert.equal(state.rear, locked - HYDRAULIC_SECTION_STEP);
});

test('stock height clears sections and bounce impulses keep direction', () => {
  let state = createHydraulicControlState();
  state = adjustHydraulicSection(state, 'left', 1);
  state = adjustHydraulicSection(state, 'front', 1);
  assert.equal(hasManualHydraulicHeight(state), true);
  state = resetHydraulicHeight(state);
  assert.equal(hasManualHydraulicHeight(state), false);
  assert.deepEqual(hydraulicCornerTargets(state), { fl: 0, fr: 0, rl: 0, rr: 0 });

  const rear = hydraulicBounceImpulse(createHydraulicControlState(), 1, 'rear');
  assert.ok(rear.rl > 0 && rear.rr > 0);
  assert.ok(rear.fl < 0 && rear.fr < 0);
});
