import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CATALOG_STATS,
  COASTER_TYPES,
  MANUFACTURERS,
  MANUFACTURER_CATEGORIES,
  defaultTrainForType,
  getCoasterType,
  getManufacturer,
  manufacturerSupportsElement,
  manufacturerSupportsType,
} from './catalog';
import { CoasterSimulation } from './physics';
import { CoasterProjectStore, MemoryStorage } from './storage';
import { trainDesignFromPrompt } from './trainDesigner';
import {
  ELEMENT_LIBRARY,
  addManualSupport,
  appendElement,
  autoTangents,
  createBlankProject,
  curveSegment,
  dePumpPoints,
  insertControlPoint,
  offsetPointLateral,
  pitchSegment,
  projectFromCsv,
  projectToCsv,
  removeManualSupport,
  rotateSegmentYaw,
  sampleTrack,
  segmentLength,
  segmentMetrics,
  setSegmentLength,
  setSegmentLengthBetween,
  updateManualSupport,
} from './track';
import { createTestLayoutProject } from './testFixture';
import type { CoasterElementKind } from './types';

test('catalog leads with the United States, then China, then international profiles', () => {
  assert.deepEqual(
    MANUFACTURER_CATEGORIES.map((category) => category.id),
    ['united_states', 'china', 'international'],
  );
  const requiredAmerican = [
    'Chance Rides',
    'S&S Worldwide',
    'Rocky Mountain Construction',
    'Great Coasters International',
    'The Gravity Group',
    'Premier Rides',
    'Skyline Attractions',
    'US Thrill Rides',
    'American Dream Rides',
    'E&F Miler',
    'Martin & Vleminckx',
    'Philadelphia Toboggan',
    'Wisdom Rides',
    'Arrow Development',
    'Arrow Dynamics',
    'Custom Coasters International',
    'Dinn Corporation',
    'D.H. Morgan',
    'Allan Herschell',
    'Hopkins Rides',
    'Roller Coaster Corporation of America',
    'National Amusement Devices',
    'B.A. Schiff',
    'Bradley & Kaye',
    'Eyerly Aircraft',
  ];
  for (const name of requiredAmerican) {
    const found = MANUFACTURERS.find((profile) => profile.name.includes(name));
    assert.ok(found, `missing ${name}`);
    assert.equal(found.category, 'united_states', `${name} must be in the first category`);
  }

  const requiredChinese = [
    'Jinma Rides',
    'Beijing Shibaolai',
    'LMQ Rides',
    'Hebei Zhongye',
    'Zhejiang Juma',
  ];
  for (const name of requiredChinese) {
    const found = MANUFACTURERS.find((profile) => profile.name.includes(name));
    assert.ok(found, `missing ${name}`);
    assert.equal(found.category, 'china', `${name} must be in the China category`);
  }

  const requiredInternational = [
    'Intamin',
    'Vekoma',
    'Bolliger & Mabillard',
    'Mack Rides',
    'Gerstlauer',
    'Maurer Rides',
    'Zierer',
    'Zamperla',
    'SBF Visa',
    'Schwarzkopf',
    'Pinfari',
    'Soquet',
    'Interpark',
    'Preston & Barbieri',
    'Reverchon',
    'ART Engineering',
    'Kumbak',
    'Fabbri',
    'Wiegand',
    'Sansei',
    'Senyo Kogyo',
    'TOGO',
    'Meisho',
    'Dynamic Structures',
    'Dynamic Attractions',
    'Ride Engineers Switzerland',
  ];
  for (const name of requiredInternational) {
    const found = MANUFACTURERS.find(
      (profile) => profile.name.includes(name) && (name !== 'Sansei' || profile.country === 'Japan'),
    );
    assert.ok(found, `missing ${name}`);
    assert.equal(found.category, 'international', `${name} must be international`);
  }

  assert.equal(CATALOG_STATS.manufacturers, MANUFACTURERS.length);
  assert.ok(CATALOG_STATS.american >= 25);
  assert.ok(CATALOG_STATS.chinese >= 7);
  assert.ok(CATALOG_STATS.international >= 26);
  assert.equal(CATALOG_STATS.coasterTypes, 26);
});

test('catalog ids are unique and every profile points at real types and elements', () => {
  const ids = new Set<string>();
  const elementKeys = new Set(
    ELEMENT_LIBRARY.flatMap((group) => group.items.map((item) => item.key)),
  );
  for (const profile of MANUFACTURERS) {
    assert.ok(!ids.has(profile.id), `duplicate manufacturer id ${profile.id}`);
    ids.add(profile.id);
    assert.ok(profile.name.trim().length > 0);
    assert.ok(profile.country.trim().length > 0);
    assert.ok(['active', 'historical', 'unverified'].includes(profile.status));
    assert.ok(Array.isArray(profile.documentedExamples));
    for (const type of profile.compatibleTypes) {
      assert.ok(getCoasterType(type), `${profile.id} references unknown type ${type}`);
    }
    for (const element of profile.compatibleElements) {
      assert.ok(elementKeys.has(element), `${profile.id} references unknown element ${element}`);
    }
  }
  const typeIds = new Set<string>();
  for (const type of COASTER_TYPES) {
    assert.ok(!typeIds.has(type.id), `duplicate coaster type ${type.id}`);
    typeIds.add(type.id);
    assert.ok(type.compatibleElements.length > 0);
    const defaults = defaultTrainForType(type.id);
    assert.ok(defaults.cars >= 1);
    assert.ok(defaults.rowsPerCar >= 1);
  }
});

test('manufacturer profiles are selectable design references, not ride generators', () => {
  const blank = createBlankProject();
  assert.equal(blank.points.length, 2);
  assert.ok(blank.points.every((point) => point.kind === 'station'));
  assert.equal(blank.closed, false);
  assert.equal(blank.supports.manual.length, 0);
  assert.equal(blank.camera.projection, 'perspective');

  const intamin = getManufacturer('intamin');
  assert.ok(intamin);
  assert.equal(manufacturerSupportsType(intamin, 'launch'), true);
  assert.equal(manufacturerSupportsType(intamin, 'wooden'), false);
  assert.equal(manufacturerSupportsElement(intamin, 'launch_lsm'), true);
  assert.equal(manufacturerSupportsElement(intamin, 'vertical_loop'), true);
  assert.equal(blank.points.length, 2, 'selecting a profile cannot append track');
});

test('new station, storage and mechanical element aliases create tagged geometry', () => {
  const base = createBlankProject();
  const cases: [CoasterElementKind, string][] = [
    ['station', 'station'],
    ['unload_station', 'unload_station'],
    ['storage_track', 'storage'],
    ['swing_launch', 'launch'],
    ['movable_track', 'tilt'],
    ['brake_magnetic', 'magnetic_brake'],
  ];
  for (const [element, kind] of cases) {
    const points = appendElement(base.points, element);
    assert.equal(points[points.length - 1].kind, kind, element);
  }
});

test('de-pump smooths a spike without changing point ids or the footprint', () => {
  const base = createBlankProject();
  const points = [
    { ...base.points[0], id: 'a', position: { x: 0, y: 4, z: 0 } },
    { ...base.points[0], id: 'b', position: { x: 0, y: 26, z: 10 } },
    { ...base.points[0], id: 'c', position: { x: 0, y: 4, z: 20 } },
  ];
  const smoothed = dePumpPoints(points, false, 0.7);
  assert.deepEqual(smoothed.map((point) => point.id), ['a', 'b', 'c']);
  assert.ok(smoothed[1].position.y < 26);
  assert.ok(smoothed[1].position.y > 4);
  assert.equal(smoothed[1].position.x, 0);
  assert.equal(smoothed[1].position.z, 10);
});

test('segment length and curve bias move one control point precisely', () => {
  const base = createTestLayoutProject();
  const index = 6;
  const before = base.points[index].position;
  const oldLength = segmentLength(base.points, index);
  const resized = setSegmentLength(base.points, index, 24);
  assert.ok(Math.abs(segmentLength(resized, index) - 24) < 1e-5);
  assert.equal(resized[index].id, base.points[index].id);
  assert.ok(
    Math.abs(
      resized[index].position.y -
        (base.points[index - 1].position.y + (before.y - base.points[index - 1].position.y) * (24 / oldLength)),
    ) < 1e-5,
  );

  const bent = offsetPointLateral(base.points, index, 3);
  assert.equal(bent[index].position.y, before.y);
  assert.notEqual(bent[index].position.x, before.x);
  assert.equal(bent.filter((point) => point.id === base.points[index].id).length, 1);
});

test('manual supports add, clamp, update and remove safely', () => {
  const base = createBlankProject();
  const withSupport = addManualSupport(base, 1);
  assert.equal(withSupport.supports.manual.length, 1);
  const id = withSupport.supports.manual[0].id;
  const raised = updateManualSupport(withSupport, id, { height: 500, crossBrace: false });
  assert.equal(raised.supports.manual[0].height, 140);
  assert.equal(raised.supports.manual[0].crossBrace, false);
  const removed = removeManualSupport(raised, id);
  assert.equal(removed.supports.manual.length, 0);
});

test('segment transforms pitch, yaw, curve and resize without replacing the layout', () => {
  const base = createBlankProject();
  const points = [
    { ...base.points[0], id: 'a', position: { x: 0, y: 4, z: 0 } },
    { ...base.points[0], id: 'b', position: { x: 0, y: 4, z: 12 } },
    { ...base.points[0], id: 'c', position: { x: 0, y: 4, z: 24 } },
  ];
  const before = segmentMetrics(points, 0, false);
  assert.ok(before);
  const pitched = pitchSegment(points, 0, 25, false);
  const pitchMetrics = segmentMetrics(pitched, 0, false);
  assert.ok(pitchMetrics);
  assert.ok(pitchMetrics.pitch > 20);
  assert.ok(Math.abs(pitchMetrics.length - before.length) < 1e-5);

  const yawed = rotateSegmentYaw(points, 0, 30, false);
  const yawMetrics = segmentMetrics(yawed, 0, false);
  assert.ok(yawMetrics);
  assert.ok(Math.abs(yawMetrics.length - before.length) < 1e-5);
  assert.ok(yawed[1].position.x > 0);

  const curved = curveSegment(points, 0, 4, false);
  assert.ok(curved[1].position.x > 3.9);
  assert.equal(curved[2].position.z, 24);

  const resized = setSegmentLengthBetween(points, 0, 30, false);
  const resizedMetrics = segmentMetrics(resized, 0, false);
  assert.ok(resizedMetrics);
  assert.ok(Math.abs(resizedMetrics.length - 30) < 1e-5);
  assert.equal(resized[0].id, 'a');
});

test('control point insertion and tangent handles produce continuous geometry', () => {
  const base = createBlankProject();
  const points = [
    { ...base.points[0], id: 'a', position: { x: 0, y: 4, z: 0 } },
    { ...base.points[0], id: 'b', position: { x: 0, y: 10, z: 12 } },
    { ...base.points[0], id: 'c', position: { x: 8, y: 4, z: 24 } },
  ];
  const inserted = insertControlPoint(points, 0, false);
  assert.equal(inserted.length, 4);
  assert.ok(Math.abs(inserted[1].position.z - 6) < 1e-6);
  assert.equal(inserted[0].id, 'a');
  assert.equal(inserted[2].id, 'b');

  const tangentPoints = autoTangents(points, false);
  const samples = sampleTrack(tangentPoints, false, 10);
  assert.ok(samples.length > 20);
  for (const point of points) {
    assert.ok(
      samples.some(
        (sample) =>
          Math.abs(sample.position.x - point.position.x) < 1e-2 &&
          Math.abs(sample.position.y - point.position.y) < 1e-2 &&
          Math.abs(sample.position.z - point.position.z) < 1e-2,
      ),
      `curve misses control point ${point.id}`,
    );
  }
});

test('CSV export and import round-trip track geometry as a new project', () => {
  const base = createBlankProject();
  const withLaunch = appendElement(base.points, 'launch_lsm', { targetSpeed: 31 });
  const withTangents = withLaunch.map((point, index) => ({
    ...point,
    tangentOut: { x: 0.1 * index, y: 0.2, z: 1 },
    tangentIn: { x: 0.3, y: 0.4 + index * 0.1, z: 1 },
  }));
  const project = { ...base, points: withTangents, closed: false };
  const csv = projectToCsv(project);
  const imported = projectFromCsv(project, csv);
  assert.deepEqual(imported.points[0].tangentOut, { x: 0, y: 0.2, z: 1 });
  assert.deepEqual(imported.points[1].tangentIn, { x: 0.3, y: 0.5, z: 1 });
  assert.notEqual(imported.id, project.id);
  assert.equal(imported.points.length, project.points.length);
  assert.equal(imported.points[imported.points.length - 1].kind, 'launch');
  assert.equal(imported.points[imported.points.length - 1].targetSpeed, 31);
  const original = project.points[project.points.length - 1].position;
  const restored = imported.points[imported.points.length - 1].position;
  assert.ok(Math.abs(original.x - restored.x) < 1e-3);
  assert.ok(Math.abs(original.y - restored.y) < 1e-3);
  assert.ok(Math.abs(original.z - restored.z) < 1e-3);

  const plain = projectFromCsv(base, 'x,y,z,bank,kind\n0,4,0,0,station\n0,4,8,0,track\n');
  assert.equal(plain.points.length, 2);
  assert.equal(plain.points[0].kind, 'station');
  assert.equal(plain.points[1].position.z, 8);
});

test('project storage keeps supports, camera, manufacturer and rename identities', () => {
  const store = new CoasterProjectStore(new MemoryStorage());
  const base = createBlankProject('Track One');
  const project = addManualSupport(
    {
      ...base,
      manufacturerId: 'rmc',
      coasterTypeId: 'hybrid',
      splineResolution: 22,
      points: base.points.map((point, index) => ({
        ...point,
        tangentOut: { x: index, y: 0.5, z: 1 },
        tangentIn: { x: index + 0.25, y: 0.75, z: 1 },
      })),
      camera: { ...base.camera, projection: 'orthographic', rideMode: 'passenger' },
    },
    0,
  );
  const saved = store.save(project);
  assert.equal(store.exists(saved.id), true);
  const loaded = store.load(saved.id);
  assert.ok(loaded);
  assert.equal(loaded.manufacturerId, 'rmc');
  assert.equal(loaded.coasterTypeId, 'hybrid');
  assert.equal(loaded.camera.projection, 'orthographic');
  assert.equal(loaded.camera.rideMode, 'passenger');
  assert.equal(loaded.supports.manual.length, 1);
  assert.equal(loaded.splineResolution, 22);
  assert.deepEqual(loaded.points[1].tangentIn, { x: 1.25, y: 0.75, z: 1 });

  const renamed = store.rename(saved.id, 'Renamed Project');
  assert.ok(renamed);
  assert.equal(renamed.name, 'Renamed Project');
  assert.equal(store.load(saved.id)?.name, 'Renamed Project');
  assert.equal(store.exists('missing'), false);
});

test('train designer parses chassis, nose, seat material and wheel colour fields', () => {
  const design = trainDesignFromPrompt(
    'monocoque chassis with a shark nose, molded seats, lap bars, covered wheels, 4 cars, 2 rows, 2 seats, LED lighting',
  );
  assert.equal(design.chassisStyle, 'monocoque');
  assert.equal(design.noseStyle, 'shark');
  assert.equal(design.seatMaterial, 'molded');
  assert.equal(design.cars, 4);
  assert.equal(design.rowsPerCar, 2);
  assert.equal(design.seatsPerRow, 2);
  assert.equal(design.restraint, 'lap_bar');
  assert.equal(design.wheels, 'covered');
  assert.equal(design.lighting, true);
  assert.ok(design.notes.some((note) => note.includes('monocoque')));
});

test('physics telemetry reports mass, riders, m/s speed and combined G', () => {
  const project = createTestLayoutProject();
  const samples = sampleTrack(project.points, project.closed, 16);
  const sim = new CoasterSimulation(samples, true, 1, {
    ridersPerTrain: 20,
    emptyTrainMassKg: 5000,
    riderMassKg: 82,
    targetSpeeds: project.points.map((point) => point.targetSpeed),
  });
  assert.equal(sim.dispatch(0), true);
  for (let i = 0; i < 120; i++) sim.step(1 / 60);
  const telemetry = sim.telemetry(0);
  assert.ok(telemetry);
  assert.equal(telemetry.riders, 20);
  assert.equal(telemetry.massKg, 5000 + 20 * 82);
  assert.ok(telemetry.speedMs > 0);
  assert.ok(Math.abs(telemetry.speedMs - telemetry.speedKmh / 3.6) < 1e-5);
  assert.ok(telemetry.combinedG >= Math.abs(telemetry.gForce));
  assert.ok(Number.isFinite(telemetry.lateralG));
});

test('physical separation stops a train that violates block spacing', () => {
  const project = createTestLayoutProject();
  const samples = sampleTrack(project.points, project.closed, 16);
  const sim = new CoasterSimulation(samples, true, 2);
  sim.trains[0].s = 40;
  sim.trains[0].state = 'running';
  sim.trains[0].v = 8;
  sim.trains[1].s = 42;
  sim.trains[1].state = 'running';
  sim.trains[1].v = 8;
  sim.step(1 / 30);
  assert.ok(sim.trains.some((train) => train.state === 'stalled'));
});
