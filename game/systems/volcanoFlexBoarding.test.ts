import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
  VOLCANO_FLEX_STATION_PLACEMENT,
  VOLCANO_FLEX_STATION_PLATFORM,
  getCoasterStationExitPoint,
  getCoasterStationSurfaceY,
  toCoasterStationWorld,
} from '../world/coasterStationLayout';
import { buildVolcanoFlexCoasterData, getVolcanoFlexSite } from '../world/volcanoFlexLayout';
import { buildVolcanoFlexTrainCar } from '../world/volcanoFlexModel';
import { createCampStructureModel } from '../world/models';
import { RollerCoasterRuntime } from './rollerCoasterRuntime';

function stationTransform() {
  const site = getVolcanoFlexSite();
  return {
    x: site.station.x + VOLCANO_FLEX_STATION_PLACEMENT.xOffset,
    y: site.station.y,
    z: site.station.z + VOLCANO_FLEX_STATION_PLACEMENT.zOffset,
    rotationY: VOLCANO_FLEX_STATION_PLACEMENT.rotationY,
  };
}

test('island boarding deck meets the car step and is reachable by stairs', () => {
  const station = stationTransform();
  const spec = VOLCANO_FLEX_STATION_PLATFORM;
  const model = createCampStructureModel('coaster_station', undefined, spec);
  const deck = model.group.getObjectByName('coaster-station-deck');
  assert.ok(deck, 'station model must expose its boarding deck');
  // The model group is built at the origin; the engine positions it on site.
  const deckTop = new THREE.Box3().setFromObject(deck).max.y;
  assert.ok(
    Math.abs(deckTop - spec.deckTop) < 0.01,
    `deck top ${deckTop.toFixed(3)} must match the ${spec.deckTop} m deck spec`,
  );

  // Car floor top = wheel-set offset 0.275 + floor top 0.42 above the 1.35 m rail.
  const carFloorAboveGrade = 1.35 + 0.275 + 0.42;
  assert.ok(
    Math.abs(spec.deckTop - carFloorAboveGrade) < 0.01,
    `platform ${spec.deckTop} not level with car floor ${carFloorAboveGrade.toFixed(3)}`,
  );

  // The exit beside the parked lead car must be on the walkable deck.
  const site = getVolcanoFlexSite();
  const exit = getCoasterStationExitPoint(station, site.station.x + 12.6);
  const exitSurface = getCoasterStationSurfaceY(
    station,
    exit.x,
    exit.z,
    station.y + spec.deckTop,
  );
  assert.ok(
    Math.abs(exitSurface - exit.y) < 0.01,
    'the deck must be a walkable floor where the rider steps off',
  );

  // Bottom of the staircase is at grade; it rises monotonically to the deck.
  const deckNearZ = spec.deckCenterZ + spec.deckLength * 0.5;
  let lastY = Infinity;
  let bottomY = 0;
  for (let i = 0; i <= 6; i++) {
    const lz = deckNearZ + (spec.stairRun * i) / 6;
    const p = toCoasterStationWorld(station, spec.stairCenterX, lz);
    const footY = station.y + spec.deckTop * (1 - i / 6);
    const y = getCoasterStationSurfaceY(station, p.x, p.z, footY);
    assert.ok(Number.isFinite(y), `stair sample ${i} is not walkable`);
    if (i > 0) assert.ok(y <= lastY + 1e-6, `stair sample ${i} rises away from the deck`);
    lastY = y;
    bottomY = y;
  }
  const firstRise = station.y + spec.deckTop / 12;
  assert.ok(
    Math.abs(bottomY - firstRise) < 0.01,
    `stair bottom step ${bottomY.toFixed(2)} must sit one rise above grade (${firstRise.toFixed(2)})`,
  );
});

test('the five-car train loads level on the deck with wheels on the rails', () => {
  const car = buildVolcanoFlexTrainCar(0, true);
  const wheelX = new Set<number>();
  car.traverse((object) => {
    if (object.name === 'coaster-wheel') {
      wheelX.add(Math.round(object.position.x * 100) / 100);
    }
  });
  assert.deepEqual([...wheelX].sort((a, b) => a - b), [-0.46, 0.46]);

  const scene = new THREE.Scene();
  const runtime = new RollerCoasterRuntime(scene);
  runtime.importCoasters([buildVolcanoFlexCoasterData()]);
  const id = runtime.getHudSummaries()[0].id;
  runtime.resetTrain(id);
  runtime.update(1 / 60);

  const cars: THREE.Object3D[] = [];
  scene.getObjectByName('RollerCoasterRuntimeRoot')!.traverse((object) => {
    if (
      object.name === 'volcano-flex-lead-car' ||
      object.name.startsWith('volcano-flex-car-')
    ) {
      cars.push(object);
    }
  });
  assert.equal(cars.length, 5);
  const xs = cars.map((c) => c.getWorldPosition(new THREE.Vector3()).x);
  const heights = cars.map((c) => c.getWorldPosition(new THREE.Vector3()).y);
  for (const y of heights) {
    assert.ok(
      Math.abs(y - heights[0]) < 0.02,
      `car height ${y.toFixed(2)} is not level with ${heights[0].toFixed(2)}`,
    );
  }

  const site = getVolcanoFlexSite();
  const station = stationTransform();
  const spec = VOLCANO_FLEX_STATION_PLATFORM;
  const deckA = toCoasterStationWorld(
    station,
    spec.deckCenterX - spec.deckWidth * 0.5,
    spec.deckCenterZ - spec.deckLength * 0.5,
  );
  const deckB = toCoasterStationWorld(
    station,
    spec.deckCenterX + spec.deckWidth * 0.5,
    spec.deckCenterZ + spec.deckLength * 0.5,
  );
  const deckMinX = Math.min(deckA.x, deckB.x);
  const deckMaxX = Math.max(deckA.x, deckB.x);
  const leadX = Math.max(...xs);
  const tailX = Math.min(...xs);
  assert.ok(tailX >= deckMinX - 0.5, `tail car ${tailX} is behind the deck ${deckMinX}`);
  assert.ok(leadX <= deckMaxX + 0.5, `lead car ${leadX} is past the deck ${deckMaxX}`);

  const proximity = runtime.getBoardingProximity(id, leadX, site.station.z + 2);
  assert.ok(proximity !== null && proximity < 3.6, `boarding prompt distance ${proximity}`);
  runtime.dispose();
});

test('a full circuit stays governed, aligned, and parks at the platform', () => {
  const scene = new THREE.Scene();
  const runtime = new RollerCoasterRuntime(scene);
  runtime.importCoasters([buildVolcanoFlexCoasterData()]);
  const id = runtime.getHudSummaries()[0].id;
  const entry = (runtime as unknown as { coasters: Map<string, any> }).coasters.get(id);
  const samples = entry.samples as any[];

  // No frame flips anywhere on the circuit (the climb and dock used to snap).
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1];
    const b = samples[i];
    const dot = a.up.x * b.up.x + a.up.y * b.up.y + a.up.z * b.up.z;
    assert.ok(dot > 0.9, `frame snap at ${b.distance.toFixed(1)} m (dot ${dot.toFixed(2)})`);
  }
  assert.ok(Math.abs(samples[0].up.y - 1) < 1e-6, 'station frame must be upright');
  assert.ok(
    Math.abs(samples[samples.length - 1].up.y - 1) < 1e-6,
    'dock frame must be upright',
  );

  runtime.resetTrain(id);
  assert.equal(runtime.dispatchTrain(id, true), true);

  let maxSpeed = 0;
  let parked = false;
  for (let i = 0; i < 180 * 60; i++) {
    runtime.update(1 / 60);
    const ride = runtime.getRideCameraTransform(id);
    if (ride) maxSpeed = Math.max(maxSpeed, ride.speedKmh);
    if (runtime.consumeStationArrival(id)) {
      parked = true;
      break;
    }
  }
  assert.ok(parked, 'train did not park at the station after a lap');
  assert.ok(maxSpeed > 40, `ride never accelerated (${maxSpeed} km/h)`);
  assert.ok(maxSpeed <= 73, `ride exceeded the governed envelope (${maxSpeed} km/h)`);
  assert.equal(runtime.isTrainAtStation(id), true);
  assert.ok(Math.abs(entry.train.position - entry.boardingDistance) < 0.01);
  runtime.dispose();
});
