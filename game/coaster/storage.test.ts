import assert from 'node:assert/strict';
import test from 'node:test';
import { CoasterProjectStore, MemoryStorage, sanitizeProject } from './storage';
import { createTestLayoutProject } from './testFixture';

test('projects save, list, load, duplicate, and delete independently', () => {
  const store = new CoasterProjectStore(new MemoryStorage());
  const project = createTestLayoutProject();
  const saved = store.save(project);
  assert.equal(store.list().length, 1);
  assert.equal(store.list()[0].name, project.name);
  const loaded = store.load(saved.id);
  assert.ok(loaded);
  assert.equal(loaded.points.length, project.points.length);

  const copy = store.duplicate(saved.id);
  assert.ok(copy);
  assert.notEqual(copy.id, saved.id);
  assert.match(copy.name, /Copy$/);
  assert.equal(store.list().length, 2);

  store.remove(copy.id);
  assert.equal(store.list().length, 1);
});

test('draft autosave restores the exact working project', () => {
  const store = new CoasterProjectStore(new MemoryStorage());
  const project = createTestLayoutProject();
  project.name = 'Draft Layout';
  store.saveDraft(project);
  const draft = store.loadDraft();
  assert.ok(draft);
  assert.equal(draft.name, 'Draft Layout');
  assert.equal(draft.points.length, project.points.length);
  store.clearDraft();
  assert.equal(store.loadDraft(), null);
});

test('JSON export and import preserve track data with a fresh identity', () => {
  const store = new CoasterProjectStore(new MemoryStorage());
  const project = createTestLayoutProject();
  const json = store.exportJson(project);
  const imported = store.importJson(json);
  assert.notEqual(imported.id, project.id);
  assert.match(imported.name, /Imported/);
  assert.equal(imported.points.length, project.points.length);
  assert.equal(imported.train.cars, project.train.cars);
  assert.equal(imported.closed, project.closed);
});

test('sanitizer rejects missing points and clamps invalid numbers', () => {
  assert.throws(() => sanitizeProject({}), /points/i);
  const safe = sanitizeProject({
    name: 'Test',
    points: [
      { position: { x: 0, y: 4, z: 0 }, kind: 'station' },
      { position: { x: 0, y: 4, z: 10 }, kind: 'track' },
    ],
    trainCount: 99,
    closed: true,
  });
  assert.equal(safe.trainCount, 3);
  assert.equal(safe.name, 'Test');
  assert.equal(safe.points[0].kind, 'station');
});

test('train designs persist separately from projects', () => {
  const store = new CoasterProjectStore(new MemoryStorage());
  const design = createTestLayoutProject().train;
  store.saveTrain(design);
  assert.equal(store.listTrains().length, 1);
  assert.equal(store.listTrains()[0].name, design.name);
  store.removeTrain(design.id);
  assert.equal(store.listTrains().length, 0);
});

test('storage writes only in the coaster studio namespace', () => {
  const keys = new Set<string>();
  const spy = {
    getItem: (_key: string) => null,
    setItem: (key: string, _value: string) => {
      keys.add(key);
    },
    removeItem: (key: string) => {
      keys.add(key);
    },
  };
  const store = new CoasterProjectStore(spy);
  store.save(createTestLayoutProject());
  store.saveDraft(createTestLayoutProject());
  store.saveTrain(createTestLayoutProject().train);
  assert.ok(keys.size >= 3);
  for (const key of keys) {
    assert.match(key, /^si_ultimate_coaster_studio_v1/);
    assert.doesNotMatch(key, /save_slot|game_save/i);
  }
});
