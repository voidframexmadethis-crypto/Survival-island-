import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  StructureManager,
  registerDefaultIslandStructures,
} from './structureManager';

test('StructureManager wakes structures in range and hibernates entities out of range', () => {
  const manager = new StructureManager();
  manager.registerStructure({
    id: 'test_outpost',
    name: 'Test Outpost',
    type: 'outpost',
    x: 100,
    z: 100,
    radius: 20,
    spawnPoints: [
      { enemyType: 'pillager', x: 100, y: 2, z: 100, maxHp: 60 },
      { enemyType: 'vindicator', x: 102, y: 2, z: 100, maxHp: 80 },
    ],
  });

  const site = manager.structures[0];
  assert.equal(site.isAwake, false);
  assert.equal(site.activeEntities.length, 0);

  // Player outside wake radius (dist = 30 > 20)
  manager.update({ x: 130, y: 2, z: 100 }, 0.016);
  assert.equal(site.isAwake, false);
  assert.equal(site.activeEntities.length, 0);

  // Player enters wake radius (dist = 10 < 20)
  manager.update({ x: 110, y: 2, z: 100 }, 0.016);
  assert.equal(site.isAwake, true);
  assert.equal(site.activeEntities.length, 2);

  // Player stays in hysteresis buffer (dist = 22, 22^2 = 484 <= 400 * 1.4 = 560)
  manager.update({ x: 122, y: 2, z: 100 }, 0.016);
  assert.equal(site.isAwake, true);

  // Player leaves past hysteresis threshold (dist = 25, 25^2 = 625 > 560)
  manager.update({ x: 125, y: 2, z: 100 }, 0.016);
  assert.equal(site.isAwake, false);
  assert.equal(site.activeEntities.length, 0);
});

test('StructureManager handles hostile chase, defeat, clearing, and cleared persistence', () => {
  const manager = new StructureManager();
  manager.registerStructure({
    id: 'test_mansion',
    name: 'Test Mansion',
    type: 'woodland_mansion',
    x: 0,
    z: 0,
    radius: 30,
    spawnPoints: [{ enemyType: 'evoker', x: 0, y: 2, z: 0, maxHp: 50 }],
  });

  let clearedCount = 0;
  manager.update({ x: 10, y: 2, z: 0 }, 0.1, {
    onStructureCleared: () => {
      clearedCount += 1;
    },
  });

  const site = manager.structures[0];
  const entity = site.activeEntities[0];
  assert.equal(entity.state, 'CHASE');
  assert.ok(entity.x > 0, 'Expected chasing entity to advance toward player');

  // Raycast and defeat entity
  const hit = manager.raycastEntities(
    new THREE.Vector3(entity.x, entity.y + 1.0, 5),
    new THREE.Vector3(0, 0, -1),
    12,
    false,
  );
  assert.ok(hit, 'Expected raycast to hit awake hostile entity');

  const dmgRes = manager.damageEntity(hit.entity, 60, {
    onStructureCleared: () => {
      clearedCount += 1;
    },
  });
  assert.equal(dmgRes.killed, true);
  assert.equal(site.cleared, true);
  assert.equal(clearedCount, 1);

  // Re-waking after hibernating must not respawn cleared defenders
  manager.hibernateStructure(site);
  manager.update({ x: 5, y: 2, z: 0 }, 0.016);
  assert.equal(site.isAwake, true);
  assert.equal(site.activeEntities.length, 0);

  // Save/load roundtrip
  const exported = manager.exportClearedIds();
  assert.deepEqual(exported, ['test_mansion']);

  const reloaded = new StructureManager();
  reloaded.registerStructure({
    id: 'test_mansion',
    name: 'Test Mansion',
    type: 'woodland_mansion',
    x: 0,
    z: 0,
    radius: 30,
    spawnPoints: [{ enemyType: 'evoker', x: 0, y: 2, z: 0, maxHp: 50 }],
  });
  reloaded.importClearedIds(exported);
  assert.equal(reloaded.structures[0].cleared, true);
});

test('Village merchants enable trading within 3m, resist damage, and registerDefaultIslandStructures loads all 6 sites', () => {
  const manager = new StructureManager();
  registerDefaultIslandStructures(manager);
  assert.equal(manager.structures.length, 6);

  const taiga = manager.structures.find((s) => s.id === 'taiga_village');
  assert.ok(taiga);

  // Wake village right beside first villager
  const pt = taiga.spawnPoints[0];
  manager.update({ x: pt.x + 1.2, y: 5.2, z: pt.z }, 0.016);
  assert.equal(taiga.isAwake, true);

  const villager = taiga.activeEntities[0];
  assert.equal(villager.type, 'villager');
  assert.equal(villager.canTrade, true);
  assert.ok(manager.getNearestTradableVillager({ x: pt.x + 1.2, y: villager.y, z: pt.z }));

  // Villagers cannot be killed and villages never mark as cleared
  const dmg = manager.damageEntity(villager, 999);
  assert.equal(dmg.killed, false);
  assert.equal(taiga.cleared, false);
});
