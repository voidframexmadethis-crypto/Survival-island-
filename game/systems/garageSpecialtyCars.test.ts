import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
  ELEVATOR_EXOTIC_LIFT,
  GARAGE_VEHICLES,
  createGarageDanceState,
  resolveElevatorCarQuery,
  resolveGarageVehicleQuery,
  stepGarageHydraulicsDance,
} from './undergroundElevator';
import {
  createVehicleFromPreset,
  type VehiclePresetKey,
} from './modularVehicle';
import { createModularVehicleMesh } from '../world/engineeringModels';
import { resolveVehicleProfile } from './vehicleProfiles';
import {
  getThreeWheelHydraulicTargets,
  isThreeWheelHydraulicVehicle,
} from './classicHydraulics';

const NEW_CAR_IDS = [
  'mini-truck',
  'el-camino-donk',
  'impala-ss-dancer',
  'van-90s',
  'lincoln-town-car',
];

test('underground garage roster includes the five new specialty cars', () => {
  for (const id of NEW_CAR_IDS) {
    assert.ok(
      GARAGE_VEHICLES.some((car) => car.id === id),
      `${id} is missing from the garage roster`,
    );
    assert.ok(
      ELEVATOR_EXOTIC_LIFT.cars.some((car) => car.id === id),
      `${id} is missing from the elevator vault`,
    );
  }
  assert.equal(ELEVATOR_EXOTIC_LIFT.cars.filter((car) => NEW_CAR_IDS.includes(car.id)).length, 5);

  const impala = ELEVATOR_EXOTIC_LIFT.cars.find((car) => car.id === 'impala-ss-dancer');
  assert.equal(impala?.displayOnly, true);
  assert.equal(impala?.hydraulicsDance, true);
  const townCar = ELEVATOR_EXOTIC_LIFT.cars.find((car) => car.id === 'lincoln-town-car');
  assert.equal(townCar?.preset, 'town_car');
  assert.match(townCar?.tagline ?? '', /left-hand-drive/i);
  assert.match(townCar?.tagline ?? '', /no high-lock ball joints/i);
  const van = ELEVATOR_EXOTIC_LIFT.cars.find((car) => car.id === 'van-90s');
  assert.equal(van?.airbagSuspension, true);
  assert.ok((van?.hydraulicBounceBoost ?? 1) > 1.5);
});

test('Ford De Soto and Nissan mini truck are in the vault and resolve by name', () => {
  for (const id of ['ford-de-soto', 'nissan-mini-truck']) {
    assert.ok(GARAGE_VEHICLES.some((car) => car.id === id), `${id} missing from roster`);
    assert.ok(ELEVATOR_EXOTIC_LIFT.cars.some((car) => car.id === id), `${id} missing from vault`);
  }

  const deSoto = resolveGarageVehicleQuery('bring up the ford de soto');
  assert.equal(deSoto?.id, 'ford-de-soto');
  assert.equal(deSoto?.supportsHydraulics, true);
  const nissan = resolveElevatorCarQuery('nissan mini truck');
  assert.equal(nissan?.id, 'nissan-mini-truck');
  assert.equal(nissan?.hydraulicsDance, true);
  assert.equal(nissan?.preset, 'mini_truck');

  const deSotoCar = createVehicleFromPreset('de_soto', 'lowrider', 0, 0, 0);
  assert.equal(deSotoCar.hydraulicHop, true);
  const nissanCar = createVehicleFromPreset('nissan', 'mini_truck', 0, 0, 0);
  assert.equal(nissanCar.hydraulicHop, true);
  assert.equal(createModularVehicleMesh(nissanCar).wheelCorners.length, 4);
});

test('natural garage requests resolve every new car', () => {
  assert.equal(resolveGarageVehicleQuery('pull up the red el camino')?.id, 'el-camino-donk');
  assert.equal(resolveGarageVehicleQuery('mini truck')?.id, 'mini-truck');
  assert.equal(resolveGarageVehicleQuery('1990s bubble van')?.id, 'van-90s');
  assert.equal(resolveElevatorCarQuery('bring up the 67 impala')?.id, 'impala-ss-dancer');
  assert.equal(resolveElevatorCarQuery('black lincoln town car')?.id, 'lincoln-town-car');
});

test('each new preset builds a four-wheel drivable car with visible hydraulic parts', () => {
  const presets: VehiclePresetKey[] = ['mini_truck', 'el_camino', 'van_90s', 'town_car'];
  for (const preset of presets) {
    const vehicle = createVehicleFromPreset(`test_${preset}`, preset, 0, 0, 0);
    assert.equal(vehicle.hydraulicHop, true, `${preset} should support hydraulics`);
    assert.ok(vehicle.modules.length >= 12);
    const handles = createModularVehicleMesh(vehicle);
    assert.equal(handles.wheelCorners.length, 4, `${preset} must have four wheels`);
    assert.equal(handles.steerWheels.length, 2);
    assert.ok(handles.chassisGroup.children.length > 12, `${preset} body is too sparse`);
    assert.ok(handles.doorLeft && handles.doorRight);
    let meshes = 0;
    handles.root.traverse((object) => {
      if (object instanceof THREE.Mesh) meshes += 1;
    });
    assert.ok(meshes > 30, `${preset} should include body, interior and hydraulic hardware`);
  }
});

test('the dancing Impala is display-only and its hydraulic dance has extra travel', () => {
  const impala = ELEVATOR_EXOTIC_LIFT.cars.find((car) => car.id === 'impala-ss-dancer')!;
  const vehicle = createVehicleFromPreset('impala', impala.preset ?? 'lowrider', 0, 0, 0);
  vehicle.carId = impala.id;
  vehicle.name = impala.name;
  vehicle.displayOnly = true;
  vehicle.hydraulicsDanceEnabled = true;
  vehicle.hydraulicBounceBoost = impala.hydraulicBounceBoost;
  assert.equal(vehicle.displayOnly, true);
  assert.equal(vehicle.hydraulicsDanceEnabled, true);

  const dance = createGarageDanceState();
  dance.enabled = true;
  const body = {
    bodyGroup: {
      position: { y: 0 },
      rotation: { x: 0, z: 0 },
    },
    subCones: [],
  };
  let maxY = 0;
  let maxWheelLift = 0;
  let maxSway = 0;
  for (let i = 0; i < 60; i++) {
    stepGarageHydraulicsDance(body, dance, 1 / 30, 0.25, 1.25);
    maxY = Math.max(maxY, body.bodyGroup.position.y);
    maxWheelLift = Math.max(maxWheelLift, dance.wheelLift);
    maxSway = Math.max(maxSway, Math.abs(dance.sway));
  }
  assert.ok(maxY > 0.38, `dance travel was only ${maxY.toFixed(3)}m`);
  assert.ok(maxWheelLift > 0.02, `dancer tyres never left the ground`);
  assert.ok(maxSway > 0.01, `dancer never shimmied side to side`);

  dance.enabled = false;
  stepGarageHydraulicsDance(body, dance, 1 / 30, 0.25, 1.25);
  assert.equal(dance.wheelLift, 0);
  assert.equal(dance.sway, 0);
  assert.equal(body.bodyGroup.position.y, 0.25);
});

test('only purpose-built dancer builds can hop all four wheels', () => {
  const dancers = ELEVATOR_EXOTIC_LIFT.cars
    .filter((car) => car.hydraulicsDance)
    .map((car) => car.id)
    .sort();
  assert.deepEqual(dancers, ['impala-ss-dancer', 'nissan-mini-truck']);
});

test('Town Car, mini truck and El Camino support the three-wheel stance', () => {
  assert.equal(isThreeWheelHydraulicVehicle('town_car'), true);
  assert.equal(isThreeWheelHydraulicVehicle('mini_truck'), true);
  assert.equal(isThreeWheelHydraulicVehicle('el_camino'), true);
  assert.equal(isThreeWheelHydraulicVehicle('lowrider'), true);
  assert.equal(isThreeWheelHydraulicVehicle('van_90s'), false);
  const targets = getThreeWheelHydraulicTargets(false, 1);
  assert.ok(targets.rl > targets.fl);
});

test('new garage cars resolve to real preview profiles', () => {
  const expectations: Record<string, string> = {
    'mini-truck': 'slab',
    'el-camino-donk': 'donk',
    'impala-ss-dancer': 'lowrider',
    'van-90s': 'chevy_tahoe',
    'lincoln-town-car': 'lowrider',
  };
  for (const [id, archetype] of Object.entries(expectations)) {
    const car = ELEVATOR_EXOTIC_LIFT.cars.find((entry) => entry.id === id)!;
    const profile = resolveVehicleProfile(car.id);
    assert.equal(profile.archetype, archetype, `${id} preview archetype`);
    assert.equal(profile.id, id);
  }
});
