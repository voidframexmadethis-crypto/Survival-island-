import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
  createFirearmModelSet,
  resolveFirearmModelKind,
} from './firearmModels';
import { FIREARM_SPECS } from '../data/items';

test('every firearm resolves to a real model family, never a stretched pistol', () => {
  const expected: Record<string, string> = {
    gun: 'pistol',
    glock_19: 'pistol',
    colt_m1911: 'pistol',
    desert_eagle: 'pistol',
    magnum_44: 'revolver',
    mp5: 'smg',
    uzi: 'smg',
    vector: 'smg',
    ak_47: 'rifle_ak',
    m4a1: 'rifle_ar',
    scar_h: 'rifle_battle',
    fn_fal: 'rifle_battle',
    remington_870: 'shotgun',
    mossberg_590: 'shotgun',
    sawed_off: 'shotgun_double',
    barrett_50: 'sniper',
    remington_700: 'sniper',
    m249_saw: 'lmg',
    pirate_musket: 'musket',
    alien_plasma_gun: 'plasma',
  };
  assert.deepEqual(Object.keys(expected).sort(), Object.keys(FIREARM_SPECS).sort());
  for (const [itemId, kind] of Object.entries(expected)) {
    assert.equal(
      resolveFirearmModelKind(
        itemId as keyof typeof FIREARM_SPECS,
        FIREARM_SPECS[itemId as keyof typeof FIREARM_SPECS]?.soundProfile,
      ),
      kind,
      itemId,
    );
  }
});

test('all long guns use a dedicated rifle, shotgun, sniper or LMG silhouette', () => {
  for (const itemId of ['ak_47', 'm4a1', 'scar_h', 'fn_fal'] as const) {
    assert.notEqual(resolveFirearmModelKind(itemId, 'rifle'), 'pistol');
    assert.match(resolveFirearmModelKind(itemId, 'rifle'), /^rifle_/);
  }
  assert.equal(resolveFirearmModelKind('remington_870', 'shotgun'), 'shotgun');
  assert.equal(resolveFirearmModelKind('sawed_off', 'shotgun'), 'shotgun_double');
  assert.equal(resolveFirearmModelKind('barrett_50', 'sniper'), 'sniper');
  assert.equal(resolveFirearmModelKind('m249_saw', 'lmg'), 'lmg');
  assert.equal(resolveFirearmModelKind('pirate_musket', 'musket'), 'musket');
});

test('sound profile fallback still yields a sensible model', () => {
  assert.equal(resolveFirearmModelKind(null, 'rifle'), 'rifle_ar');
  assert.equal(resolveFirearmModelKind(null, 'shotgun'), 'shotgun');
  assert.equal(resolveFirearmModelKind(null, 'sniper'), 'sniper');
  assert.equal(resolveFirearmModelKind(null, undefined), 'pistol');
});

test('every long gun has real firearm proportions instead of a square block', () => {
  const dummyTextures = {
    map: null,
    normalMap: null,
    roughnessMap: null,
  } as unknown as Parameters<typeof createFirearmModelSet>[0];
  const models = createFirearmModelSet(dummyTextures);
  const minLength: Record<string, number> = {
    revolver: 0.38,
    smg: 0.6,
    rifle_ak: 0.95,
    rifle_ar: 0.95,
    rifle_battle: 0.95,
    shotgun: 0.9,
    shotgun_double: 0.5,
    sniper: 1.05,
    lmg: 1.0,
    musket: 1.05,
    plasma: 0.4,
  };
  for (const [kind, model] of Object.entries(models)) {
    model.updateMatrixWorld(true);
    const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
    assert.ok(Number.isFinite(size.x + size.y + size.z), `${kind} has NaN bounds`);
    assert.ok(size.z >= minLength[kind], `${kind} is too short (${size.z.toFixed(2)}m)`);
    assert.ok(size.z > size.x * 4, `${kind} is too wide/short (${size.x.toFixed(2)}m wide)`);
    assert.ok(size.z > size.y * 2.2, `${kind} is too tall/short (${size.y.toFixed(2)}m tall)`);
    let meshes = 0;
    model.traverse((obj) => {
      if (obj instanceof THREE.Mesh) meshes += 1;
    });
    assert.ok(meshes >= 12, `${kind} lacks mechanical detail (${meshes} meshes)`);
  }
});
