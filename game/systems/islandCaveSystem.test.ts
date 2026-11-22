import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
  CAVE_TOTAL,
  CaveBoss,
  IslandCaveSystem,
  LOAD_DISTANCE,
  getCaveEntranceYaw,
} from './islandCaveSystem';
import { getTerrainSurfaceHeight } from '../world/terrain';

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

test('IslandCaveSystem streams real tunnel meshes, collision and terrain openings by distance', () => {
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
      position: new THREE.Vector3(128, 2, -50),
      discovered: false,
      built: false,
    },
  ];

  sys.update(new THREE.Vector3(105, 2, -50), scene);
  assert.equal(sys.caves[0].discovered, true);
  assert.equal(sys.caves[0].built, true);
  assert.equal(sys.caves[1].discovered, true);
  assert.equal(sys.caves[1].built, true);
  assert.equal(sys.getActiveCount(), 2);
  assert.equal(scene.children.length, 2);
  assert.equal(sys.getOpenings().length, 2);

  const dragonGroup = scene.children.find(
    (g) => g.userData.caveId === 'cave-dragon',
  ) as THREE.Group;
  assert.ok(dragonGroup);
  assert.equal(dragonGroup.position.x, 100);
  assert.equal(dragonGroup.position.z, -50);
  const dragonMesh = dragonGroup.children[0] as THREE.Mesh;
  assert.ok(dragonMesh.geometry instanceof THREE.BufferGeometry);
  assert.ok(dragonMesh.geometry.getIndex()!.count > 0);
  assert.equal(
    (dragonMesh.material as THREE.MeshStandardMaterial).color.getHex(),
    0x3f1712,
  );

  const stoneGroup = scene.children.find(
    (g) => g.userData.caveId === 'cave-stone',
  ) as THREE.Group;
  const stoneMesh = stoneGroup.children[0] as THREE.Mesh;
  assert.equal(
    (stoneMesh.material as THREE.MeshStandardMaterial).color.getHex(),
    0x4e4a43,
  );

  // A player inside the corridor gets a real floor and ceiling; a player on the
  // mountain above the tunnel is left on the terrain.
  const x = 100;
  const z = -50;
  const terrainY = getTerrainSurfaceHeight(x, z);
  const mouth = sys.getWalkSurface(x, z, terrainY);
  assert.ok(mouth, 'the cave mouth must be walkable');
  assert.ok(mouth!.ceilingY > mouth!.floorY + 2.7);
  assert.ok(mouth!.halfWidth > 1.8);
  const yaw = getCaveEntranceYaw(x, z);
  const insideX = x - Math.sin(yaw) * 8;
  const insideZ = z - Math.cos(yaw) * 8;
  const inside = sys.getWalkSurface(insideX, insideZ, mouth!.floorY - 1.2);
  assert.ok(inside, 'the tunnel must continue underground');
  assert.ok(inside!.floorY < mouth!.floorY);
  assert.equal(sys.getWalkSurface(insideX, insideZ, terrainY + 6), null);

  // The streamed opening is removed from the hillside and unloads when distant.
  sys.update(new THREE.Vector3(600, 2, -50), scene);
  assert.equal(sys.caves[0].built, false);
  assert.equal(sys.caves[1].built, false);
  assert.equal(sys.getActiveCount(), 0);
  assert.equal(sys.getOpenings().length, 0);
  assert.equal(scene.children.length, 0);

  sys.update(new THREE.Vector3(105, 2, -50), scene);
  assert.equal(sys.getActiveCount(), 2);
  sys.dispose(scene);
  assert.equal(sys.getActiveCount(), 0);
  assert.equal(scene.children.length, 0);
  assert.equal(sys.caves[0].built, false);
});

test('all five special cave identities build walkable entrances without duplicate networks', () => {
  const sys = new IslandCaveSystem();
  const scene = new THREE.Scene();
  const types = ['civilization', 'monster-boss', 'lush', 'crystal', 'red-dragon'] as const;
  sys.caves = types.map((type, index) => ({
    id: `special-${index}`,
    type,
    position: new THREE.Vector3(260 + index * 18, 4, 180),
    discovered: false,
    built: false,
  }));
  sys.update(new THREE.Vector3(278, 4, 180), scene);
  assert.equal(sys.getActiveCount(), 5);
  assert.equal(sys.getOpenings().length, 5);
  for (const cave of sys.caves) {
    assert.equal(cave.built, true);
    const group = scene.children.find((g) => g.userData.caveId === cave.id) as THREE.Group;
    assert.ok(group, `${cave.type} must stream a 3D interior`);
    assert.ok(group.children.length >= 4);
    const mouthY = getTerrainSurfaceHeight(cave.position.x, cave.position.z);
    const surface = sys.getWalkSurface(cave.position.x, cave.position.z, mouthY);
    assert.ok(surface, `${cave.type} mouth must be walkable`);
    assert.equal(surface!.caveType, cave.type);
    const yaw = getCaveEntranceYaw(cave.position.x, cave.position.z);
    let footY = surface!.floorY;
    for (let distance = 1; distance <= 6; distance += 1) {
      const px = cave.position.x - Math.sin(yaw) * distance;
      const pz = cave.position.z - Math.cos(yaw) * distance;
      const next = sys.getWalkSurface(px, pz, footY);
      assert.ok(next, `${cave.type} tunnel closed ${distance}m inside`);
      assert.ok(
        Math.abs(next!.floorY - footY) <= 0.9,
        `${cave.type} floor breaks ${distance}m inside`,
      );
      footY = next!.floorY;
    }
  }
  sys.dispose(scene);
});

test('walk profile crosses the mouth and continues downhill without a blocking step', () => {
  const sys = new IslandCaveSystem();
  const scene = new THREE.Scene();
  const x = 100;
  const z = -50;
  const terrainY = getTerrainSurfaceHeight(x, z);
  sys.caves = [
    {
      id: 'cave-walk',
      type: 'regular',
      position: new THREE.Vector3(x, terrainY, z),
      discovered: false,
      built: false,
    },
  ];
  sys.update(new THREE.Vector3(x, terrainY, z + 6), scene);
  const yaw = getCaveEntranceYaw(x, z);
  const forwardX = -Math.sin(yaw);
  const forwardZ = -Math.cos(yaw);
  let footY = getTerrainSurfaceHeight(x - forwardX * 3.2, z - forwardZ * 3.2);
  let previousFloor = footY;
  for (let distance = -3.2; distance <= 14; distance += 0.5) {
    const px = x + forwardX * distance;
    const pz = z + forwardZ * distance;
    const surface = sys.getWalkSurface(px, pz, footY);
    assert.ok(surface, `walk surface missing ${distance.toFixed(1)}m into the cave`);
    assert.ok(
      Math.abs(surface!.floorY - previousFloor) <= 0.75,
      `floor jumps at ${distance.toFixed(1)}m`,
    );
    assert.ok(surface!.ceilingY - surface!.floorY >= 2.7);
    footY = surface!.floorY;
    previousFloor = surface!.floorY;
  }
  sys.dispose(scene);
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
