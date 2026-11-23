import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SWIM_MAX_DEPTH,
  SWIM_OXYGEN_DRAIN,
  stepSwimPhysics,
} from './swimmingPhysics';

const WATER = 0;
const SURFACE_Y = WATER - 0.72;

test('surface swimming floats the character with their head above water', () => {
  let state = { y: SURFACE_Y, breath: 100, health: 100 };
  for (let i = 0; i < 120; i++) {
    const step = stepSwimPhysics({
      ...state,
      waterLevel: WATER,
      solidFloorY: -30,
      dt: 1 / 60,
      dive: false,
      ascend: false,
      moving: true,
    });
    state = { y: step.y, breath: step.breath, health: step.health };
    assert.equal(step.underwater, false);
    assert.equal(step.damage, 0);
  }
  assert.ok(Math.abs(state.y - SURFACE_Y) < 0.07);
  assert.equal(state.breath, 100);
});

test('holding dive reaches depth, drains oxygen and clamps to the seabed', () => {
  let step = stepSwimPhysics({
    y: SURFACE_Y,
    waterLevel: WATER,
    solidFloorY: -100,
    dt: 1 / 60,
    dive: true,
    ascend: false,
    moving: true,
    breath: 100,
    health: 100,
  });
  for (let i = 0; i < 300; i++) {
    step = stepSwimPhysics({
      y: step.y,
      waterLevel: WATER,
      solidFloorY: -100,
      dt: 1 / 60,
      dive: true,
      ascend: false,
      moving: true,
      breath: step.breath,
      health: step.health,
    });
  }
  assert.equal(step.underwater, true);
  assert.ok(step.y >= WATER - SWIM_MAX_DEPTH - 0.001);
  assert.ok(step.breath < 100 - SWIM_OXYGEN_DRAIN * 4.5);

  for (let i = 0; i < 300; i++) {
    step = stepSwimPhysics({
      y: step.y,
      waterLevel: WATER,
      solidFloorY: -2,
      dt: 1 / 60,
      dive: true,
      ascend: false,
      moving: true,
      breath: step.breath,
      health: step.health,
    });
  }
  assert.ok(step.y >= -2 + 0.15 - 0.001);
});

test('ascending resurfaces and refills the lungs while idle', () => {
  let step = stepSwimPhysics({
    y: -8,
    waterLevel: WATER,
    solidFloorY: -40,
    dt: 1 / 60,
    dive: false,
    ascend: true,
    moving: false,
    breath: 20,
    health: 100,
  });
  for (let i = 0; i < 420; i++) {
    step = stepSwimPhysics({
      y: step.y,
      waterLevel: WATER,
      solidFloorY: -40,
      dt: 1 / 60,
      dive: false,
      ascend: true,
      moving: false,
      breath: step.breath,
      health: step.health,
    });
  }
  assert.equal(step.underwater, false);
  assert.ok(step.y >= SURFACE_Y - 0.06);
  assert.equal(step.breath, 100);
});

test('empty lungs drown the swimmer until they reach the surface', () => {
  let step = stepSwimPhysics({
    y: -4,
    waterLevel: WATER,
    solidFloorY: -40,
    dt: 1 / 60,
    dive: true,
    ascend: false,
    moving: true,
    breath: 0,
    health: 100,
  });
  for (let i = 0; i < 30; i++) {
    step = stepSwimPhysics({
      y: step.y,
      waterLevel: WATER,
      solidFloorY: -40,
      dt: 1 / 60,
      dive: true,
      ascend: false,
      moving: true,
      breath: step.breath,
      health: step.health,
    });
  }
  assert.ok(step.health < 100);
  assert.ok(step.damage > 0);
  assert.ok(step.underwater);
});
