import assert from 'node:assert/strict';
import test from 'node:test';
import type { ModularVehicleData } from '../types';
import {
  FERRY_DOCK_CAR_STOP,
  FerryPickupSystem,
  selectFerryCar,
} from './ferryPickup';

function makeCar(id: string, x: number, z: number, preset?: string): ModularVehicleData {
  return {
    id,
    name: id,
    preset,
    paintColor: '#ffffff',
    x,
    y: 3,
    z,
    yaw: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    hp: 100,
    maxHp: 100,
    fuel: 100,
    modules: [],
    cargoItems: [],
  };
}

const flatGround = () => 3;

test('island ferry chooses the nearest parked land car and ignores boats and other dimensions', () => {
  const near = makeCar('near', -52, 152);
  const boat = makeCar('boat', -50, 150, 'steam_boat');
  const otherDimension = { ...makeCar('other', -51, 151), dimension: 'bee_dimension' as const };
  const far = makeCar('far', 80, 220);

  assert.equal(selectFerryCar([far, boat, otherDimension, near], { x: -44, z: 134 }, 58), near);
  assert.equal(selectFerryCar([boat, far], { x: -44, z: 134 }, 20), null);
});

test('island ferry worker walks to the shelter, waits, then drives the player to the pier', () => {
  const car = makeCar('Impala', -52, 152);
  const ferry = new FerryPickupSystem();
  const request = ferry.request(car);
  assert.equal(request.ok, true);
  assert.equal(ferry.phase, 'worker_walking');

  for (let i = 0; i < 500 && ferry.phase === 'worker_walking'; i++) {
    ferry.update(0.05, car, flatGround);
  }
  assert.equal(ferry.phase, 'waiting_for_passenger');
  assert.ok(Math.abs(ferry.getStatus().workerX - (-52 - Math.cos(car.yaw) * 1.45)) < 0.01);

  assert.equal(ferry.boardPassenger(car), true);
  assert.equal(ferry.phase, 'driving');
  assert.equal(ferry.passengerAboard, true);

  for (let i = 0; i < 1600 && ferry.phase === 'driving'; i++) {
    ferry.update(0.05, car, flatGround);
  }

  assert.equal(ferry.phase, 'arrived');
  assert.ok(Math.abs(car.x - FERRY_DOCK_CAR_STOP.x) < 0.01);
  assert.ok(Math.abs(car.z - FERRY_DOCK_CAR_STOP.z) < 0.01);
  assert.ok(ferry.getStatus().label.includes('pier'));
});

test('island ferry will not leave before the passenger boards', () => {
  const car = makeCar('SLAB', -52, 152);
  const ferry = new FerryPickupSystem();
  ferry.request(car);
  for (let i = 0; i < 500 && ferry.phase === 'worker_walking'; i++) {
    ferry.update(0.05, car, flatGround);
  }
  const startX = car.x;
  for (let i = 0; i < 20; i++) ferry.update(0.05, car, flatGround);
  assert.equal(car.x, startX);
  assert.equal(ferry.boardPassenger(makeCar('other', 0, 0)), false);
});
