import assert from 'node:assert/strict';
import test from 'node:test';
import {
  THREE_WHEEL_PARKED_POSE,
  getThreeWheelHydraulicTargets,
  isThreeWheelHydraulicVehicle,
} from './classicHydraulics';

test('three-wheel hydraulics cover full-cylinder lowriders but not DONKs or airbag vans', () => {
  assert.equal(isThreeWheelHydraulicVehicle('lowrider'), true);
  assert.equal(isThreeWheelHydraulicVehicle('cadillac_coupe_deville'), true);
  assert.equal(isThreeWheelHydraulicVehicle('town_car'), true);
  assert.equal(isThreeWheelHydraulicVehicle('mini_truck'), true);
  assert.equal(isThreeWheelHydraulicVehicle('el_camino'), true);
  assert.equal(isThreeWheelHydraulicVehicle('donk'), false);
  assert.equal(isThreeWheelHydraulicVehicle('chevy_tahoe'), false);
  assert.equal(isThreeWheelHydraulicVehicle('van_90s'), false);
  assert.equal(isThreeWheelHydraulicVehicle(undefined), false);
});

test('three-wheel stance holds three corners level and lifts only the rear-left wheel', () => {
  const targets = getThreeWheelHydraulicTargets(false);
  assert.equal(targets.fl, targets.fr);
  assert.equal(targets.fl, targets.rr);
  assert.ok(targets.rl > targets.fl + 0.6);
});

test('airbag lock level scales the stance without breaking the three-corner hold', () => {
  const low = getThreeWheelHydraulicTargets(true, 0.4);
  const high = getThreeWheelHydraulicTargets(true, 1.4);
  assert.equal(low.fl, low.fr);
  assert.equal(low.fl, low.rr);
  assert.ok(high.rl > low.rl);
  assert.ok(high.fl > low.fl);
  assert.ok(THREE_WHEEL_PARKED_POSE.wheelLift > 0);
  assert.ok(THREE_WHEEL_PARKED_POSE.airbagWheelLift > 0);
});
