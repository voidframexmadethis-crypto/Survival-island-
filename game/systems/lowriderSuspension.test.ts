import assert from 'node:assert/strict';
import test from 'node:test';
import {
  LOWRIDER_CORNERS,
  LOWRIDER_FLEET_PRESETS,
  LOWRIDER_MAX_WHEEL_LIFT,
  adjustLowriderCorner,
  createLowriderControls,
  createLowriderRigState,
  createLowriderVehicleRigSpec,
  impulseLowriderCorner,
  launchLowriderFullHop,
  lowriderContactCount,
  lowriderCornerClearance,
  lowriderWheelClearances,
  pumpLowriderCorners,
  resetLowriderControls,
  resumeLowriderLevel,
  setLowriderBodyTrim,
  setLowriderCornerTarget,
  setLowriderSide,
  stepLowriderRig,
  toggleLowriderAxleLock,
  toggleLowriderCornerLock,
  toggleLowriderSideLock,
  toggleLowriderThreeWheel,
} from './lowriderSuspension';
import { createVehicleFromPreset } from './modularVehicle';
import { isThreeWheelHydraulicVehicle } from './classicHydraulics';

const FRAME = 1 / 60;

function run(
  rig: ReturnType<typeof createLowriderRigState>,
  controls: ReturnType<typeof createLowriderControls>,
  seconds: number,
  onStep?: (elapsed: number) => void,
  spec?: ReturnType<typeof createLowriderVehicleRigSpec>,
): void {
  const frames = Math.ceil(seconds / FRAME);
  for (let i = 0; i < frames; i++) {
    stepLowriderRig(rig, controls, FRAME, { spec });
    onStep?.((i + 1) * FRAME);
  }
}

function settledRig(corner: 'fl' | 'fr' | 'rl' | 'rr', height: number) {
  const rig = createLowriderRigState();
  const controls = createLowriderControls();
  setLowriderCornerTarget(controls, corner, height);
  run(rig, controls, 1.4);
  return { rig, controls };
}

test('each of the four corners moves independently and the other three stay grounded', () => {
  for (const corner of LOWRIDER_CORNERS) {
    const { rig } = settledRig(corner, 0.55);
    const clearances = lowriderWheelClearances(rig);
    assert.ok(
      clearances[corner] > 0.5,
      `${corner} should lift above 0.5 m, got ${clearances[corner].toFixed(3)}`,
    );
    for (const other of LOWRIDER_CORNERS) {
      if (other === corner) continue;
      assert.ok(
        Math.abs(clearances[other]) < 0.01,
        `${other} must stay on the road while ${corner} lifts, got ${clearances[other].toFixed(3)}`,
      );
      assert.equal(rig.corners[other].contact, true);
    }
    assert.equal(rig.corners[corner].contact, false);
    assert.equal(lowriderContactCount(rig), 3);
    assert.equal(rig.rootHeight, 0);
  }
});

test('three-wheel stance holds one raised corner while the car balances on three tires', () => {
  const rig = createLowriderRigState();
  const controls = createLowriderControls();
  controls.selectedCorner = 'rl';
  assert.equal(toggleLowriderThreeWheel(controls, 'rl'), true);
  run(rig, controls, 1.4);

  const clearances = lowriderWheelClearances(rig);
  assert.ok(clearances.rl > 0.5, `rear-left should be airborne, got ${clearances.rl.toFixed(3)}`);
  assert.ok(Math.abs(clearances.fl) < 0.01);
  assert.ok(Math.abs(clearances.fr) < 0.01);
  assert.ok(Math.abs(clearances.rr) < 0.01);
  assert.equal(lowriderContactCount(rig), 3);
  assert.equal(rig.rootHeight, 0, 'chassis stays supported by the three grounded wheels');
  assert.notEqual(rig.roll, 0, 'body should lean into the three-wheel stance');

  // Lowering the corner is progressive, not a snap back to stock.
  for (let i = 0; i < 5; i++) adjustLowriderCorner(controls, 'rl', -1);
  stepLowriderRig(rig, controls, FRAME);
  assert.ok(rig.corners.rl.lift > 0.4, 'first frame of lowering must still be high');
  run(rig, controls, 1.6);
  assert.ok(Math.abs(rig.corners.rl.lift) < 0.02);
  assert.equal(lowriderContactCount(rig), 4);
});

test('repeated three-wheel hops cycle the raised wheel through its full travel', () => {
  const rig = createLowriderRigState();
  const controls = createLowriderControls();
  toggleLowriderThreeWheel(controls, 'rl');
  run(rig, controls, 1.2);

  const peaks: number[] = [];
  for (let hop = 0; hop < 4; hop++) {
    impulseLowriderCorner(rig, 'rl', 5.2);
    let peak = -Infinity;
    run(rig, controls, 0.42, () => {
      peak = Math.max(peak, lowriderCornerClearance(rig, 'rl'));
      assert.ok(lowriderCornerClearance(rig, 'fl') < 0.01);
      assert.ok(lowriderCornerClearance(rig, 'fr') < 0.01);
      assert.ok(lowriderCornerClearance(rig, 'rr') < 0.01);
    });
    peaks.push(peak);
    run(rig, controls, 0.5);
  }

  for (const peak of peaks) {
    assert.ok(peak > 0.62, `hop must visibly extend the wheel, peak ${peak.toFixed(3)}`);
    assert.ok(peak <= LOWRIDER_MAX_WHEEL_LIFT + 0.001);
  }
  assert.equal(rig.corners.rl.contact, false);
  assert.equal(lowriderContactCount(rig), 3);
  assert.equal(rig.rootHeight, 0);
});

test('front and rear hops lift only their own axle and settle back to the road', () => {
  for (const axle of ['front', 'rear'] as const) {
    const rig = createLowriderRigState();
    const controls = createLowriderControls();
    const corners = axle === 'front' ? (['fl', 'fr'] as const) : (['rl', 'rr'] as const);
    pumpLowriderCorners(rig, corners, 6.2);

    let peak = 0;
    run(rig, controls, 0.34, () => {
      peak = Math.max(peak, lowriderCornerClearance(rig, corners[0]));
      const other = axle === 'front' ? (['rl', 'rr'] as const) : (['fl', 'fr'] as const);
      for (const corner of other) {
        assert.ok(lowriderCornerClearance(rig, corner) < 0.01);
        assert.equal(rig.corners[corner].contact, true);
      }
    });
    assert.ok(peak > 0.25, `${axle} wheels must leave the road, peak ${peak.toFixed(3)}`);

    run(rig, controls, 1.8);
    assert.equal(lowriderContactCount(rig), 4);
    assert.ok(Math.abs(rig.corners[corners[0]].lift) < 0.02);
  }
});

test('full hop lifts all four tires, lands and can be repeated', () => {
  const rig = createLowriderRigState();
  const controls = createLowriderControls();

  assert.equal(launchLowriderFullHop(rig), true);
  let apex = 0;
  run(rig, controls, 2.0, () => {
    apex = Math.max(apex, rig.rootHeight);
  });
  assert.ok(apex > 0.55, `full hop must launch the car, apex ${apex.toFixed(3)}`);

  // Re-run to the apex and measure every corner at the same instant.
  assert.equal(launchLowriderFullHop(rig), true);
  let clearances: Record<string, number> = {};
  let contactsAtApex = 4;
  let capturedApex = false;
  run(rig, controls, 2.0, () => {
    if (!capturedApex && rig.rootHeight > 0.6) {
      clearances = lowriderWheelClearances(rig);
      contactsAtApex = lowriderContactCount(rig);
      capturedApex = true;
    }
  });
  assert.equal(capturedApex, true);
  for (const corner of LOWRIDER_CORNERS) {
    assert.ok(
      clearances[corner] > 0.55,
      `${corner} tire must be visibly airborne, got ${clearances[corner].toFixed(3)}`,
    );
  }
  assert.equal(contactsAtApex, 0);
  assert.equal(rig.rootHeight, 0);
  assert.equal(lowriderContactCount(rig), 4);

  run(rig, controls, 0.6);
  assert.equal(launchLowriderFullHop(rig), true);
  run(rig, controls, 2.0);
  assert.equal(rig.hopCount, 3);
  assert.equal(rig.rootHeight, 0);
});

test('side-to-side movement raises one side, then the other, with no permanent lift', () => {
  const rig = createLowriderRigState();
  const controls = createLowriderControls();

  setLowriderSide(controls, 'left');
  run(rig, controls, 1.2);
  assert.ok(rig.corners.fl.lift > 0.35);
  assert.ok(rig.corners.rl.lift > 0.35);
  assert.equal(rig.corners.fr.contact, true);
  assert.equal(rig.corners.rr.contact, true);
  assert.ok(rig.roll < -0.02);

  setLowriderSide(controls, 'right');
  run(rig, controls, 1.4);
  assert.ok(rig.corners.fr.lift > 0.35);
  assert.ok(rig.corners.rr.lift > 0.35);
  assert.equal(rig.corners.fl.contact, true);
  assert.equal(rig.corners.rl.contact, true);
  assert.ok(rig.roll > 0.02);

  resetLowriderControls(controls);
  run(rig, controls, 2.2);
  assert.equal(lowriderContactCount(rig), 4);
  for (const corner of LOWRIDER_CORNERS) {
    assert.ok(Math.abs(rig.corners[corner].lift) < 0.01);
  }
  assert.ok(Math.abs(rig.roll) < 0.01);
  assert.ok(Math.abs(rig.pitch) < 0.01);
  assert.ok(Math.abs(rig.bodyHeave) < 0.01);
  assert.equal(rig.rootHeight, 0);
});

test('axle locks hold ride height but still allow the hop to move the wheels', () => {
  const rig = createLowriderRigState();
  const controls = createLowriderControls();
  setLowriderCornerTarget(controls, 'fl', 0.34);
  setLowriderCornerTarget(controls, 'fr', 0.34);
  run(rig, controls, 1.2);

  assert.equal(toggleLowriderAxleLock(controls, 'front'), true);
  assert.equal(controls.locked.fl, true);
  assert.equal(controls.locked.fr, true);
  assert.equal(controls.locked.rl, false);
  assert.equal(controls.locked.rr, false);
  assert.equal(adjustLowriderCorner(controls, 'fl', 1), false);
  assert.equal(controls.targets.fl, 0.34);

  pumpLowriderCorners(rig, ['fl', 'fr'], 3.6);
  let peak = 0;
  run(rig, controls, 0.4, () => {
    peak = Math.max(peak, rig.corners.fl.lift);
  });
  assert.ok(peak > 0.42, 'locked height must still hop');
  run(rig, controls, 2.0);
  assert.ok(Math.abs(rig.corners.fl.lift - 0.34) < 0.015);
  assert.ok(Math.abs(rig.corners.fr.lift - 0.34) < 0.015);

  assert.equal(toggleLowriderAxleLock(controls, 'front'), false);
  assert.equal(controls.locked.fl, false);
});

test('a locked corner keeps its exact height through stance changes and hops', () => {
  const rig = createLowriderRigState();
  const controls = createLowriderControls();
  setLowriderCornerTarget(controls, 'rl', 0.42);
  run(rig, controls, 1.2);
  toggleLowriderCornerLock(controls, 'rl');
  toggleLowriderThreeWheel(controls, 'rl');
  assert.equal(controls.targets.rl, 0.42, '3-wheel must not overwrite a locked target');
  run(rig, controls, 0.8);
  assert.ok(Math.abs(rig.corners.rl.lift - 0.42) < 0.015);

  pumpLowriderCorners(rig, ['rl'], 5.2);
  let peak = 0;
  run(rig, controls, 0.4, () => {
    peak = Math.max(peak, rig.corners.rl.lift);
  });
  assert.ok(peak > 0.5, 'hop must move the locked corner');
  run(rig, controls, 1.8);
  assert.ok(Math.abs(rig.corners.rl.lift - 0.42) < 0.015);

  controls.stance = 'three_wheel';
  resumeLowriderLevel(controls);
  assert.equal(controls.targets.rl, 0.42, 'lowering the pose must not release a lock');
});

test('UP/DOWN trim raises and lowers the chassis without lifting the tires', () => {
  const rig = createLowriderRigState();
  const controls = createLowriderControls();
  setLowriderBodyTrim(controls, 0.36);
  run(rig, controls, 1.6);
  assert.ok(rig.bodyHeave > 0.3);
  assert.equal(lowriderContactCount(rig), 4);

  setLowriderBodyTrim(controls, -0.72);
  run(rig, controls, 1.8);
  assert.ok(rig.bodyHeave < -0.05);
  assert.equal(lowriderContactCount(rig), 4);
  assert.ok(rig.bodyHeave > -0.2, 'chassis must not pass through the road');
});

test('normal driving state is restored after hydraulics and the hop remains bounded', () => {
  const rig = createLowriderRigState();
  const controls = createLowriderControls();
  setLowriderCornerTarget(controls, 'rl', 0.6);
  setLowriderBodyTrim(controls, 0.3);
  run(rig, controls, 1.2);
  launchLowriderFullHop(rig);
  run(rig, controls, 2.0);

  resetLowriderControls(controls);
  run(rig, controls, 2.4);
  assert.equal(rig.rootHeight, 0);
  assert.equal(rig.rootVelocity, 0);
  assert.equal(lowriderContactCount(rig), 4);
  for (const corner of LOWRIDER_CORNERS) {
    assert.ok(Math.abs(rig.corners[corner].lift) < 0.015);
    assert.ok(Math.abs(rig.corners[corner].velocity) < 0.05);
  }
  assert.ok(Math.abs(rig.pitch) < 0.01);
  assert.ok(Math.abs(rig.roll) < 0.01);

  // Even with maximum hop power the chassis is capped, never launched out of the map.
  for (let i = 0; i < 8; i++) {
    launchLowriderFullHop(rig, 1.6);
    run(rig, controls, 0.18);
    assert.ok(rig.rootHeight <= 1.5501);
  }
  run(rig, controls, 2.0);
  assert.equal(rig.rootHeight, 0);
});

test('body follows full suspension travel and pitches with a front lift', () => {
  const rig = createLowriderRigState();
  const controls = createLowriderControls();
  for (const corner of LOWRIDER_CORNERS) {
    setLowriderCornerTarget(controls, corner, 0.52);
  }
  run(rig, controls, 1.6);
  assert.ok(
    rig.bodyHeave > 0.38,
    `body must rise with the actuators, got ${rig.bodyHeave.toFixed(3)}`,
  );
  assert.ok(Math.abs(rig.pitch) < 0.01);

  // Front-only extension raises the nose: positive rotation.x would drop it.
  for (const corner of ['rl', 'rr'] as const) {
    setLowriderCornerTarget(controls, corner, 0);
  }
  run(rig, controls, 1.4);
  assert.ok(rig.pitch < -0.015, `front lift must raise the nose, got ${rig.pitch.toFixed(3)}`);
  assert.ok(rig.bodyHeave > 0.15);
});

test('side lock holds a raised side through repeated hops', () => {
  const rig = createLowriderRigState();
  const controls = createLowriderControls();
  setLowriderCornerTarget(controls, 'fl', 0.42);
  setLowriderCornerTarget(controls, 'rl', 0.42);
  run(rig, controls, 1.4);
  assert.equal(toggleLowriderSideLock(controls, 'left'), true);
  assert.equal(adjustLowriderCorner(controls, 'fl', 1), false);
  assert.equal(controls.locked.fr, false, 'right side must remain independently adjustable');

  for (let i = 0; i < 3; i++) {
    pumpLowriderCorners(rig, ['fl', 'rl'], 3.2);
    run(rig, controls, 0.45);
    run(rig, controls, 0.8);
  }
  run(rig, controls, 0.8);
  assert.ok(Math.abs(rig.corners.fl.lift - 0.42) < 0.02);
  assert.ok(Math.abs(rig.corners.rl.lift - 0.42) < 0.02);
  assert.ok(rig.corners.fr.lift < 0.01);
  assert.ok(rig.corners.rr.lift < 0.01);
  assert.equal(toggleLowriderSideLock(controls, 'left'), false);
});

test('fleet tuning uses each vehicle’s dimensions and mass instead of fixed values', () => {
  const specs = LOWRIDER_FLEET_PRESETS.map((preset) => {
    const vehicle = createVehicleFromPreset(`tune_${preset}`, preset, 0, 0, 0);
    return { preset, spec: createLowriderVehicleRigSpec(vehicle) };
  });
  const travels = new Set(specs.map(({ spec }) => spec.maxWheelLift.toFixed(3)));
  const hops = new Set(specs.map(({ spec }) => spec.hopLaunch.toFixed(3)));
  assert.ok(travels.size >= 3, 'suspension travel must differ between vehicle packages');
  assert.ok(hops.size >= 3, 'hop energy must differ between heavy and light cars');
  const mini = specs.find(({ preset }) => preset === 'mini_truck')!.spec;
  const cadillac = specs.find(({ preset }) => preset === 'cadillac_coupe_deville')!.spec;
  assert.ok(mini.bodySpring > cadillac.bodySpring, 'lighter mini truck settles faster');
  assert.ok(cadillac.wheelDamping > mini.wheelDamping, 'heavier Cadillac needs more damping');
});

for (const preset of LOWRIDER_FLEET_PRESETS) {
  test(`${preset}: complete hydraulic cycle and return to driving height`, () => {
    const vehicle = createVehicleFromPreset(`fleet_${preset}`, preset, 0, 0, 0);
    const spec = createLowriderVehicleRigSpec(vehicle);
    const rig = createLowriderRigState();
    const controls = createLowriderControls();
    assert.ok(Number.isFinite(spec.maxWheelLift));
    assert.ok(spec.maxWheelLift >= 0.46 && spec.maxWheelLift <= 0.82);

    // All four corners raise the sprung body, then lower it back down.
    for (const corner of LOWRIDER_CORNERS) {
      setLowriderCornerTarget(controls, corner, spec.maxWheelLift * 0.86);
    }
    run(rig, controls, 1.7, undefined, spec);
    const raisedBody = rig.bodyHeave;
    assert.ok(raisedBody > 0.3, `${preset} body must rise, got ${raisedBody.toFixed(3)}`);
    resetLowriderControls(controls);
    run(rig, controls, 2.5, undefined, spec);
    assert.ok(rig.bodyHeave < 0.01, `${preset} body must lower`);
    assert.equal(lowriderContactCount(rig), 4);

    // Front and rear axle hops move their own end and settle.
    for (const axle of ['front', 'rear'] as const) {
      const corners = axle === 'front' ? (['fl', 'fr'] as const) : (['rl', 'rr'] as const);
      pumpLowriderCorners(rig, corners, 5.6);
      let peak = 0;
      run(rig, controls, 0.36, () => {
        peak = Math.max(peak, lowriderCornerClearance(rig, corners[0]));
      }, spec);
      assert.ok(peak > 0.2, `${preset} ${axle} hop must lift a tyre, peak ${peak.toFixed(3)}`);
      run(rig, controls, 2.0, undefined, spec);
      assert.equal(lowriderContactCount(rig), 4);
    }

    // Three-wheel stance is supported by all traditional lowrider models.
    if (isThreeWheelHydraulicVehicle(preset)) {
      toggleLowriderThreeWheel(controls, 'rl');
      run(rig, controls, 1.6, undefined, spec);
      assert.ok(rig.corners.rl.lift > 0.3, `${preset} three-wheel must lift rl`);
      assert.equal(lowriderContactCount(rig), 3);
      toggleLowriderThreeWheel(controls, 'rl');
      run(rig, controls, 1.8, undefined, spec);
    }

    // Repeated side hops and a full four-wheel launch remain stable.
    setLowriderSide(controls, 'left');
    run(rig, controls, 1.2, undefined, spec);
    assert.ok(rig.roll < -0.02, `${preset} left lift must roll body`);
    setLowriderSide(controls, 'right');
    run(rig, controls, 1.5, undefined, spec);
    assert.ok(rig.roll > 0.02, `${preset} right lift must roll body`);
    resetLowriderControls(controls);
    run(rig, controls, 2.0, undefined, spec);

    for (let hop = 0; hop < 3; hop++) {
      assert.equal(launchLowriderFullHop(rig, 1, spec), true, `${preset} hop ${hop + 1}`);
      run(rig, controls, 1.5, undefined, spec);
      assert.equal(rig.rootHeight, 0);
      assert.equal(lowriderContactCount(rig), 4);
    }

    // Driving state: stock height, all tyres down, no residual motion.
    resetLowriderControls(controls);
    run(rig, controls, 2.4, undefined, spec);
    assert.equal(lowriderContactCount(rig), 4);
    assert.equal(rig.rootHeight, 0);
    assert.ok(Math.abs(rig.bodyHeave) < 0.01);
    assert.ok(Math.abs(rig.pitch) < 0.01);
    assert.ok(Math.abs(rig.roll) < 0.01);
    for (const corner of LOWRIDER_CORNERS) {
      assert.ok(Math.abs(rig.corners[corner].lift) < 0.01);
    }
  });
}
