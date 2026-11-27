import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
  BAYOU_COMET_HEIGHT_M,
  BAYOU_COMET_ID,
  BAYOU_COMET_LAYOUT_TAG,
  buildBayouCometCoasterData,
  buildBayouCometNodes,
  getBayouCometSite,
  getBayouCometTunnels,
} from '../world/bayouCometLayout';
import {
  buildBayouCometEnvironment,
  buildBayouCometTrainCar,
} from '../world/bayouCometModel';
import { getVolcanoFlexSite } from '../world/volcanoFlexLayout';
import {
  VOLCANO_FLEX_STATION_PLATFORM,
  getCoasterStationExitPoint,
  getCoasterStationSurfaceY,
  toCoasterStationLocal,
  toCoasterStationWorld,
} from '../world/coasterStationLayout';
import { createCampStructureModel } from '../world/models';
import {
  RollerCoasterRuntime,
  applyIslandHorizonFrames,
  applyLoopPlaneFrames,
} from './rollerCoasterRuntime';
import { CoasterEditor } from './rollerCoasterSystem';

function stationTransform() {
  const site = getBayouCometSite();
  return {
    x: site.station.x - 2.8,
    y: site.station.y,
    z: site.station.z - 0.58,
    rotationY: Math.PI / 2,
  };
}

test('BAYOU COMET is a closed, valid circuit with the expected signature elements', () => {
  const data = buildBayouCometCoasterData();
  assert.equal(data.id, BAYOU_COMET_ID);
  assert.equal(data.closedCircuit, true);
  assert.ok(data.pieceTags?.includes(BAYOU_COMET_LAYOUT_TAG));
  assert.ok(data.pieceTags?.includes('switch_track'));
  assert.ok(data.pieceTags?.includes('tunnels'));

  const first = data.nodes[0].position;
  const last = data.nodes[data.nodes.length - 1].position;
  assert.ok(Math.hypot(last.x - first.x, last.y - first.y, last.z - first.z) < 0.01);

  for (let i = 1; i < data.nodes.length; i++) {
    const a = data.nodes[i - 1].position;
    const b = data.nodes[i].position;
    const step = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
    assert.ok(Number.isFinite(step) && step < 22, `bad gap ${step.toFixed(2)} at ${i}`);
    assert.ok(
      b.y > 2.5,
      `node ${i} sinks below the marsh surface at y=${b.y.toFixed(2)}`,
    );
  }

  // Tunnels are real geometry descriptors, not just labels.
  const tunnels = getBayouCometTunnels();
  assert.equal(tunnels.length, 2);
  assert.ok(tunnels.every((t) => t.points.length > 8));

  // The described ride includes both spike tops and low tunnel sections.
  const heights = data.nodes.map((n) => n.position.y);
  assert.ok(Math.max(...heights) - Math.min(...heights) > 35);
  assert.ok(Math.max(...heights) < 48);
});

test('bayou switchbacks, loops and frame seams stay smooth and correctly oriented', () => {
  const nodes = buildBayouCometNodes();
  const editor = new CoasterEditor();
  for (const n of nodes) {
    editor.addPoint(n.position, n.bank, n.segmentType, n.targetSpeed, n.frameMode);
  }
  const samples = editor.getTrack();
  applyIslandHorizonFrames(samples);
  applyLoopPlaneFrames(samples);

  let worstUpStep = 0;
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1].up;
    const b = samples[i].up;
    const dot = Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y + a.z * b.z));
    worstUpStep = Math.max(worstUpStep, (Math.acos(dot) * 180) / Math.PI);
  }
  assert.ok(
    worstUpStep < 25,
    `frame snapped ${worstUpStep.toFixed(1)} degrees in one sample`,
  );

  const loopSamples = samples.filter((s) => s.frameMode === 'loop');
  assert.ok(loopSamples.length > 200, 'both vertical loops must use the loop frame');
  const apex = loopSamples.reduce((a, b) => (b.position.y > a.position.y ? b : a));
  assert.ok(
    apex.up.y < -0.7,
    `the train must be inverted over the loop apex (up.y=${apex.up.y.toFixed(2)})`,
  );

  // The two loop blocks must rejoin upright, with no seam snap.
  for (let i = 1; i < samples.length; i++) {
    if (samples[i].frameMode !== samples[i - 1].frameMode) {
      const dot = Math.max(
        -1,
        Math.min(
          1,
          samples[i].up.x * samples[i - 1].up.x +
            samples[i].up.y * samples[i - 1].up.y +
            samples[i].up.z * samples[i - 1].up.z,
        ),
      );
      const step = (Math.acos(dot) * 180) / Math.PI;
      assert.ok(step < 20, `loop seam snaps ${step.toFixed(1)} degrees`);
    }
  }
});

test('the circuit does not clip back through itself', () => {
  const editor = new CoasterEditor();
  for (const n of buildBayouCometNodes()) {
    editor.addPoint(n.position, n.bank, n.segmentType, n.targetSpeed, n.frameMode);
  }
  const samples = editor.getTrack();
  const total = samples[samples.length - 1].distance;
  let closest = Infinity;
  for (let i = 0; i < samples.length; i += 2) {
    for (let j = i + 2; j < samples.length; j += 2) {
      let along = Math.abs(samples[i].distance - samples[j].distance);
      along = Math.min(along, total - along);
      // Adjacent samples, the loop's own near-return, and the closed seam are
      // part of the same continuous rail.
      if (along < 12) continue;
      const a = samples[i].position;
      const b = samples[j].position;
      closest = Math.min(closest, Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z));
    }
  }
  assert.ok(
    closest >= 2,
    `two ride sections pass only ${closest.toFixed(2)} m apart`,
  );
});

test('the platform, train and boarding mark share one level deck', () => {
  const site = getBayouCometSite();
  const station = stationTransform();
  const spec = VOLCANO_FLEX_STATION_PLATFORM;
  const model = createCampStructureModel('coaster_station', undefined, spec);
  const deck = model.group.getObjectByName('coaster-station-deck');
  assert.ok(deck);
  const deckTop = new THREE.Box3().setFromObject(deck).max.y;
  assert.ok(Math.abs(deckTop - spec.deckTop) < 0.01);

  const carFloorAboveGrade = 1.35 + 0.275 + 0.42;
  assert.ok(Math.abs(spec.deckTop - carFloorAboveGrade) < 0.01);

  // Boarding distance is 12.6 m from the station start, which must land the
  // whole five-car train on the 13.6 m deck.
  const exit = getCoasterStationExitPoint(station, site.station.x - 12.6);
  const exitLocal = toCoasterStationLocal(station, exit.x, exit.z);
  assert.ok(exitLocal.z > spec.deckCenterZ - spec.deckLength * 0.5);
  assert.ok(exitLocal.z < spec.deckCenterZ + spec.deckLength * 0.5);
  const surface = getCoasterStationSurfaceY(
    station,
    exit.x,
    exit.z,
    station.y + spec.deckTop,
  );
  assert.ok(Math.abs(surface - exit.y) < 0.01);

  // Stairs land at grade and rise to the deck.
  const deckNearZ = spec.deckCenterZ + spec.deckLength * 0.5;
  const bottom = toCoasterStationWorld(
    station,
    spec.stairCenterX,
    deckNearZ + spec.stairRun,
  );
  const bottomY = getCoasterStationSurfaceY(
    station,
    bottom.x,
    bottom.z,
    station.y + spec.deckTop,
  );
  assert.ok(
    Math.abs(bottomY - (station.y + spec.deckTop / 12)) < 0.02,
    `stair bottom ${bottomY.toFixed(2)} is not at the first riser`,
  );

  const car = buildBayouCometTrainCar(0, true);
  const wheelX = new Set<number>();
  car.traverse((obj) => {
    if (obj instanceof THREE.Mesh && obj.geometry instanceof THREE.CylinderGeometry) {
      const p = obj.position.x;
      if (Math.abs(p) > 0.4 && Math.abs(p) < 0.5) {
        wheelX.add(Math.round(p * 100) / 100);
      }
    }
  });
  assert.deepEqual([...wheelX].sort((a, b) => a - b), [-0.46, 0.46]);
});

test('BAYOU COMET boards, runs a governed lap and parks at the platform', () => {
  const scene = new THREE.Scene();
  const runtime = new RollerCoasterRuntime(scene);
  const id = runtime.addCoasterData(buildBayouCometCoasterData());
  assert.equal(id, BAYOU_COMET_ID);
  const summary = runtime.getHudSummaries().find((s) => s.id === id);
  assert.ok(summary);
  assert.equal(summary.valid, true, summary.validationErrors.join('; '));
  assert.equal(summary.name, 'BAYOU COMET');
  assert.equal(summary.isCompleteCircuit, true);
  assert.ok((summary.trackLengthM ?? 0) > 1200);
  assert.ok((summary.inversionsCount ?? 0) >= 6);
  assert.ok((summary.maxHeightM ?? 0) > BAYOU_COMET_HEIGHT_M - 2);

  assert.ok(runtime.isTrainAtStation(id));
  assert.ok(runtime.resetTrain(id));
  assert.equal(runtime.dispatchTrain(id, true), true);

  let maxSpeed = 0;
  let arrived = false;
  let minSpeedAfterStart = Infinity;
  let sawLaunch = false;
  let sawTunnelBrake = false;
  for (let i = 0; i < 190 * 60; i++) {
    runtime.update(1 / 60);
    if (runtime.consumeStationArrival(id)) {
      arrived = true;
      break;
    }
    const cam = runtime.getRideCameraTransform(id);
    if (!cam) continue;
    maxSpeed = Math.max(maxSpeed, cam.speedKmh);
    if (i > 60 * 4 && cam.progressPercent < 95) {
      minSpeedAfterStart = Math.min(minSpeedAfterStart, cam.speedKmh);
    }
    if (cam.segmentLabel === 'LSM Launch Block') sawLaunch = true;
    if (cam.segmentLabel === 'Magnetic Trim Brakes') sawTunnelBrake = true;
  }
  assert.ok(arrived, 'train never returned to the load station');
  assert.ok(runtime.isTrainAtStation(id));
  assert.ok(maxSpeed <= 72.5, `speed cap exceeded: ${maxSpeed.toFixed(0)} km/h`);
  assert.ok(sawLaunch && sawTunnelBrake);
  assert.ok(
    Number.isFinite(minSpeedAfterStart) && minSpeedAfterStart > 0.5,
    `train stalled mid-circuit at ${minSpeedAfterStart.toFixed(2)} km/h`,
  );

  // Five custom bayou cars are present and level on the deck after parking.
  const root = scene.getObjectByName('RollerCoasterRuntimeRoot');
  assert.ok(root);
  const cars: THREE.Object3D[] = [];
  root.traverse((obj) => {
    if (obj.name.startsWith('BayouCometCar_')) cars.push(obj);
  });
  assert.equal(cars.length, 5);
  const heights = cars.map((c) => c.getWorldPosition(new THREE.Vector3()).y);
  for (const y of heights) {
    assert.ok(Math.abs(y - heights[0]) < 0.02);
  }
  assert.ok(scene.getObjectByName('BayouCometAttraction'));

  runtime.dispose();
});

test('the coasters save and reload with loop-frame hints intact', () => {
  const runtime = new RollerCoasterRuntime(new THREE.Scene());
  runtime.addCoasterData(buildBayouCometCoasterData());
  const exported = runtime.exportCoasters().find((c) => c.id === BAYOU_COMET_ID);
  assert.ok(exported);
  assert.ok(exported.nodes.some((n) => n.frameMode === 'loop'));
  assert.ok(exported.pieceTags?.includes(BAYOU_COMET_LAYOUT_TAG));
  runtime.dispose();

  const loaded = new RollerCoasterRuntime(new THREE.Scene());
  loaded.importCoasters([exported]);
  const summary = loaded.getHudSummaries().find((s) => s.id === BAYOU_COMET_ID);
  assert.ok(summary);
  assert.equal(summary.valid, true, summary.validationErrors.join('; '));
  assert.equal(summary.name, 'BAYOU COMET');
  assert.ok(loaded.isTrainAtStation(BAYOU_COMET_ID));
  loaded.dispose();
});

test('the themed environment and tunnels are disposable and cullable', () => {
  const environment = buildBayouCometEnvironment();
  assert.ok(environment.root.getObjectByName('bayou-comet-tunnel-0'));
  assert.ok(environment.root.getObjectByName('bayou-comet-tunnel-1'));
  environment.setDetailVisible(false);
  environment.update(1 / 60, 1, 40);
  environment.dispose();

  const site = getBayouCometSite();
  assert.ok(
    Math.hypot(
      site.station.x - getVolcanoFlexSite().station.x,
      site.station.z - getVolcanoFlexSite().station.z,
    ) > 1_500,
    'the second park must sit on the distant Louisiana landmass',
  );
});
