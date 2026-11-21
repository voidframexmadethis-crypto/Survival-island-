import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
  CAVE_TOTAL,
  CaveBoss,
  IslandCaveSystem,
  LOAD_DISTANCE,
} from './islandCaveSystem';

test('IslandCaveSystem.generate creates 5,000 caves with all 5 special types inside radius', () => {
  const sys = new IslandCaveSystem();
  const center = new THREE.Vector3(20, 4, -30);
  const radius = 500;
  const caves = sys.generate(center, radius);

  assert.equal(caves.length, CAVE_TOTAL);
  assert.equal(CAVE_TOTAL, 5000);
  assert.equal(LOAD_DISTANCE, 450);

  const types = new Set(caves.map((c) => c.type));
  assert.ok(types.has('civilization'));
  assert.ok(types.has('monster-boss'));
  assert.ok(types.has('lush'));
  assert.ok(types.has('crystal'));
  assert.ok(types.has('red-dragon'));
  assert.ok(types.has('regular'));

  for (const c of caves) {
    const distXZ = Math.hypot(c.position.x - center.x, c.position.z - center.z);
    assert.ok(distXZ <= radius + 1e-6);
    assert.equal(c.position.y, center.y);
    assert.equal(c.discovered, false);
    assert.equal(c.built, false);
  }
});

test('IslandCaveSystem.carveTerrain removes triangles inside cave opening radii and rejects non-indexed geometry', () => {
  const sys = new IslandCaveSystem();

  const nonIndexed = new THREE.BufferGeometry();
  nonIndexed.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 0, 0, 1]), 3),
  );
  assert.equal(sys.carveTerrain(nonIndexed, [{ x: 0, z: 0, radius: 5 }]), false);
  nonIndexed.dispose();

  const plane = new THREE.PlaneGeometry(40, 40, 10, 10);
  plane.rotateX(-Math.PI / 2);
  const initialCount = plane.getIndex()!.count;

  const ok = sys.carveTerrain(plane, [{ x: 0, z: 0, radius: 6 }]);
  assert.equal(ok, true);
  const carvedCount = plane.getIndex()!.count;
  assert.ok(carvedCount < initialCount);
  assert.ok(carvedCount > 0);
  assert.equal(carvedCount % 3, 0);
  plane.dispose();
});

test('IslandCaveSystem.build and update stream tunnels by distance and dispose removed meshes', () => {
  const sys = new IslandCaveSystem();
  const scene = new THREE.Scene();

  sys.caves = [
    {
      id: 'cave-dragon',
      type: 'red-dragon',
      position: new THREE.Vector3(100, 2, -50),
      discovered: false,
      built: false,
    },
    {
      id: 'cave-stone',
      type: 'regular',
      position: new THREE.Vector3(120, 2, -50),
      discovered: false,
      built: false,
    },
  ];

  // Player within 25m of dragon cave -> discovered + both built (< 450m)
  sys.update(new THREE.Vector3(105, 2, -50), scene);
  assert.equal(sys.caves[0].discovered, true);
  assert.equal(sys.caves[0].built, true);
  assert.equal(sys.caves[1].discovered, true);
  assert.equal(sys.caves[1].built, true);
  assert.equal(sys.getActiveCount(), 2);
  assert.equal(scene.children.length, 2);

  // Verify group placement & crimson material on red-dragon tunnel
  const dragonGroup = scene.children.find(
    (g) => g.userData.caveId === 'cave-dragon',
  ) as THREE.Group;
  assert.ok(dragonGroup);
  assert.equal(dragonGroup.position.x, 100);
  assert.equal(dragonGroup.position.z, -50);
  const dragonMesh = dragonGroup.children[0] as THREE.Mesh;
  assert.ok(dragonMesh.geometry instanceof THREE.TubeGeometry);
  assert.equal(
    (dragonMesh.material as THREE.MeshStandardMaterial).color.getHex(),
    0x4a0808,
  );

  const stoneGroup = scene.children.find(
    (g) => g.userData.caveId === 'cave-stone',
  ) as THREE.Group;
  const stoneMesh = stoneGroup.children[0] as THREE.Mesh;
  assert.equal(
    (stoneMesh.material as THREE.MeshStandardMaterial).color.getHex(),
    0x514b43,
  );

  // Between 450m and 630m -> remains built (hysteresis)
  sys.update(new THREE.Vector3(600, 2, -50), scene);
  assert.equal(sys.caves[0].built, true);
  assert.equal(sys.caves[1].built, true);

  // Beyond 450 * 1.4 = 630m -> unloaded & disposed
  sys.update(new THREE.Vector3(900, 2, -50), scene);
  assert.equal(sys.caves[0].built, false);
  assert.equal(sys.caves[1].built, false);
  assert.equal(sys.getActiveCount(), 0);
  assert.equal(scene.children.length, 0);

  // Rebuild and verify full dispose(scene)
  sys.update(new THREE.Vector3(105, 2, -50), scene);
  assert.equal(sys.getActiveCount(), 2);
  sys.dispose(scene);
  assert.equal(sys.getActiveCount(), 0);
  assert.equal(scene.children.length, 0);
  assert.equal(sys.caves[0].built, false);
});

test('CaveBoss tracks 3 phases, scales speed/damage, and marks defeat at 0 HP', () => {
  const model = new THREE.Group();
  model.position.set(0, 0, 0);
  const boss = new CaveBoss('Red Dragon Boss', model, 25);

  assert.equal(boss.health, 1000);
  assert.equal(boss.phase, 1);
  assert.equal(boss.defeated, false);
  assert.equal(boss.attackCooldown, 0);

  let hits: number[] = [];
  // Outside 30m -> idle
  boss.update(1.0, new THREE.Vector3(50, 0, 0), (n) => hits.push(n));
  assert.equal(model.position.x, 0);
  assert.equal(hits.length, 0);

  // Between 4m and 30m -> advances toward player
  boss.update(1.0, new THREE.Vector3(10, 0, 0), (n) => hits.push(n));
  assert.ok(Math.abs(model.position.x - 5) < 1e-6);
  assert.equal(hits.length, 0);

  // Within 4m -> deals 25 * phase 1 = 25 damage and sets cooldown = 1.6s
  model.position.set(8, 0, 0);
  boss.update(0.1, new THREE.Vector3(10, 0, 0), (n) => hits.push(n));
  assert.deepEqual(hits, [25]);
  assert.ok(Math.abs(boss.attackCooldown - 1.6) < 1e-6);

  // Drop below 650 -> Phase 2
  assert.equal(boss.takeDamage(400), false);
  assert.equal(boss.health, 600);
  assert.equal(boss.phase, 2);

  // Cooldown expires after 1.6s, Phase 2 strike deals 25 * 2 = 50 damage
  boss.update(1.7, new THREE.Vector3(10, 0, 0), (n) => hits.push(n));
  assert.deepEqual(hits, [25, 50]);

  // Drop below 300 -> Phase 3
  assert.equal(boss.takeDamage(350), false);
  assert.equal(boss.health, 250);
  assert.equal(boss.phase, 3);

  boss.update(2.0, new THREE.Vector3(10, 0, 0), (n) => hits.push(n));
  assert.deepEqual(hits, [25, 50, 75]);

  // Lethal blow
  assert.equal(boss.takeDamage(300), true);
  assert.equal(boss.health, 0);
  assert.equal(boss.defeated, true);
  assert.equal(model.visible, false);

  // Subsequent damage/update are no-ops
  assert.equal(boss.takeDamage(50), false);
  boss.update(2.0, new THREE.Vector3(10, 0, 0), (n) => hits.push(n));
  assert.equal(hits.length, 3);
});
