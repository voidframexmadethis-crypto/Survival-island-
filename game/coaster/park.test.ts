import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PARK_CATALOG,
  createDeliveryPayload,
  createEmptyPark,
  getParkBounds,
  getParkCatalogEntry,
  parkFromJson,
  parkToJson,
  sanitizePark,
} from './park';
import { buildParkModel, updateParkModel } from './parkModels';
import { createBlankProject } from './track';

test('the starter park includes a gate, path spine, attractions and shops', () => {
  const park = createEmptyPark('Test Park');
  assert.equal(park.name, 'Test Park');
  assert.equal(park.elements.some((element) => element.kind === 'gate'), true);
  assert.ok(park.elements.filter((element) => element.kind === 'path').length > 2);
  assert.equal(park.elements.some((element) => element.kind === 'carousel'), true);
  assert.equal(park.elements.some((element) => element.kind === 'food_stall'), true);
  assert.ok(park.visitorCount > 0);
});

test('sanitization clamps coordinates, drops unknown kinds and keeps one unique gate', () => {
  const park = sanitizePark({
    name: '  Bayou Park  ',
    theme: 'bayou',
    visitorCount: 200,
    entrance: { x: 9999, z: -9999, rotation: -45 },
    elements: [
      { id: 'a', kind: 'gate', x: 0, z: 0, rotation: 0, scale: 1 },
      { id: 'b', kind: 'gate', x: 8, z: 2, rotation: 90, scale: 2 },
      { id: 'c', kind: 'not_a_ride', x: 4, z: 4, rotation: 0, scale: 1 },
      { id: 'd', kind: 'ferris_wheel', x: 600, z: -600, rotation: 720, scale: 9 },
    ],
  });
  assert.equal(park.name, 'Bayou Park');
  assert.equal(park.theme, 'bayou');
  assert.equal(park.visitorCount, 60);
  assert.ok(park.entrance.x <= 240);
  assert.equal(park.elements.filter((element) => element.kind === 'gate').length, 1);
  assert.equal(park.elements.some((element) => element.kind === 'ferris_wheel'), true);
  const wheel = park.elements.find((element) => element.kind === 'ferris_wheel');
  assert.equal(wheel?.rotation, 0);
  assert.ok((wheel?.scale ?? 3) <= 2.4);
});

test('park JSON round-trips with every catalog kind available', () => {
  const park = createEmptyPark('Round Trip');
  const restored = parkFromJson(parkToJson(park));
  assert.equal(restored.name, 'Round Trip');
  assert.equal(restored.elements.length, park.elements.length);
  assert.ok(PARK_CATALOG.length > 20);
  for (const entry of PARK_CATALOG) {
    assert.ok(getParkCatalogEntry(entry.kind).label.length > 0);
    assert.ok(entry.footprint.w > 0);
  }
});

test('bounds contain every ride footprint with a service margin', () => {
  const park = createEmptyPark('Bounds');
  const bounds = getParkBounds(park);
  for (const element of park.elements) {
    const entry = getParkCatalogEntry(element.kind);
    assert.ok(element.x - entry.footprint.w * 0.5 >= bounds.minX);
    assert.ok(element.x + entry.footprint.w * 0.5 <= bounds.maxX);
    assert.ok(element.z - entry.footprint.d * 0.5 >= bounds.minZ);
    assert.ok(element.z + entry.footprint.d * 0.5 <= bounds.maxZ);
  }
});

test('a coaster project delivery carries the park and editable track points', () => {
  const project = createBlankProject('Gulf Screamer');
  project.park = createEmptyPark('Gulf Screamer Park');
  const payload = createDeliveryPayload(project);
  assert.equal(payload.park.name, 'Gulf Screamer Park');
  assert.equal(payload.coaster?.points.length, project.points.length);
  assert.equal(payload.coaster?.closed, project.closed);
  assert.ok(payload.sentAt > 0);
});

test('the 3D park model builds real ride and shop geometry and animates rides', () => {
  const park = createEmptyPark('Model Park');
  const handles = buildParkModel(park, { includeVisitors: true });
  assert.ok(handles.group.children.length > 10);
  assert.ok(handles.visitors.length > 0);
  assert.ok(handles.animations.length > 0);
  let meshes = 0;
  handles.group.traverse((object) => {
    if ((object as { isMesh?: boolean }).isMesh) meshes += 1;
  });
  assert.ok(meshes > 50);
  const spinning = handles.animations.find((animation) => animation.kind === 'spin_y');
  const before = spinning?.object.rotation.y ?? 0;
  updateParkModel(handles, 0.5, 2.5);
  assert.notEqual(spinning?.object.rotation.y ?? 0, before);
  handles.dispose();
});
