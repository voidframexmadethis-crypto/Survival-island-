import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { fixGround, fixPlayerGroundCollision } from './playerGroundPhysics';
import { createCave } from '../world/models';
import {
  FLAT_GROUND_Y,
  TERRAIN_HALF,
  TERRAIN_SEGS,
  TERRAIN_SIZE,
  TERRAIN_STEP,
  TERRAIN_VERTS,
  getTerrainHeight,
  getTerrainSurfaceHeight,
  resetTerrainDeformation,
  setActiveTerrainWorldType,
  terrainDeltaGrid,
} from '../world/terrain';

test('fixGround clamps objects below finite groundY and resets verticalVelocity', () => {
  const obj = new THREE.Object3D();
  obj.position.set(2, 1.5, -3);
  obj.userData.verticalVelocity = -6.2;
  obj.userData.grounded = false;

  fixGround(obj, 4.0);
  assert.equal(obj.position.y, 4.0);
  assert.equal(obj.userData.verticalVelocity, 0);
  assert.equal(obj.userData.grounded, true);

  // Non-finite groundY is ignored safely
  obj.position.y = 3.0;
  obj.userData.grounded = false;
  fixGround(obj, Number.NaN);
  assert.equal(obj.position.y, 3.0);
  assert.equal(obj.userData.grounded, false);
});

test('createCave builds rock ring and glowing crystals attached to scene', () => {
  const scene = new THREE.Scene();
  const cave = createCave(scene, { seed: 42 });
  assert.equal(cave.parent, scene);
  assert.equal(cave.children.length, 36);
});

test('fixPlayerGroundCollision prevents falling below ground and floating after landing', () => {
  const player = new THREE.Object3D();

  // 1. Falling below ground snaps cleanly, zeros velocity, and marks grounded
  player.position.set(10, 3.2, -5);
  player.userData.verticalVelocity = -9.5;
  player.userData.grounded = false;
  assert.equal(fixPlayerGroundCollision(player, 4.5, 1 / 60), true);
  assert.equal(player.position.y, 4.5);
  assert.equal(player.userData.verticalVelocity, 0);
  assert.equal(player.userData.grounded, true);

  // 2. Hovering within +0.02m after landing snaps flush to groundY
  player.position.set(10, 4.518, -5);
  player.userData.verticalVelocity = -0.2;
  player.userData.grounded = false;
  assert.equal(fixPlayerGroundCollision(player, 4.5, 1 / 60), true);
  assert.equal(player.position.y, 4.5);
  assert.equal(player.userData.verticalVelocity, 0);
  assert.equal(player.userData.grounded, true);

  // 3. Active upward jump takeoff at high FPS does NOT get cancelled
  player.position.set(10, 4.514, -5);
  player.userData.verticalVelocity = 7.4;
  player.userData.grounded = true;
  assert.equal(fixPlayerGroundCollision(player, 4.5, 1 / 240), false);
  assert.equal(player.position.y, 4.514);
  assert.equal(player.userData.verticalVelocity, 7.4);
  assert.equal(player.userData.grounded, false);

  // 4. Walking off a ledge clears grounded state
  player.position.set(10, 5.2, -5);
  player.userData.verticalVelocity = 0;
  player.userData.grounded = true;
  assert.equal(fixPlayerGroundCollision(player, 4.5, 1 / 60), false);
  assert.equal(player.userData.grounded, false);

  // 5. Non-finite position/velocity recovers cleanly
  player.position.set(Number.NaN, Number.POSITIVE_INFINITY, Number.NaN);
  player.userData.verticalVelocity = Number.NaN;
  player.userData.grounded = false;
  assert.equal(fixPlayerGroundCollision(player, 6.25, 1 / 60), true);
  assert.equal(player.position.x, 0);
  assert.equal(player.position.z, 0);
  assert.equal(player.position.y, 6.25);
  assert.equal(player.userData.verticalVelocity, 0);
  assert.equal(player.userData.grounded, true);
});

test('getTerrainSurfaceHeight matches rendered PlaneGeometry mesh triangles including slopes and deformations', () => {
  setActiveTerrainWorldType('island');
  resetTerrainDeformation();

  const terrainGeo = new THREE.PlaneGeometry(
    TERRAIN_SIZE,
    TERRAIN_SIZE,
    TERRAIN_SEGS,
    TERRAIN_SEGS,
  );
  terrainGeo.rotateX(-Math.PI / 2);
  const pos = terrainGeo.attributes.position;

  // Apply a simulated crater deformation in terrainDeltaGrid around (120, -140)
  for (let iz = 0; iz < TERRAIN_VERTS; iz++) {
    const vz = -TERRAIN_HALF + iz * TERRAIN_STEP;
    for (let ix = 0; ix < TERRAIN_VERTS; ix++) {
      const vx = -TERRAIN_HALF + ix * TERRAIN_STEP;
      const d = Math.hypot(vx - 120, vz + 140);
      if (d < 18) {
        terrainDeltaGrid[iz * TERRAIN_VERTS + ix] = -3.5 * (1 - d / 18);
      }
    }
  }

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, getTerrainHeight(x, z));
  }
  terrainGeo.computeBoundingBox();
  terrainGeo.computeBoundingSphere();

  const terrainMesh = new THREE.Mesh(terrainGeo, new THREE.MeshBasicMaterial());
  terrainMesh.updateMatrixWorld(true);
  const raycaster = new THREE.Raycaster();
  const down = new THREE.Vector3(0, -1, 0);

  const sampleCoords: [number, number][] = [
    [0, 680],
    [-451.25, -117.5], // Steep western Windswept cliff edge
    [281.25, 213.75], // Badlands terraced mesa
    [-392.1, 41.3], // Savanna crags
    [122.3, -137.4], // Inside deformed crater
    [10.4, -87.9], // Waterfall cliff
    [-77.2, 128.4], // Hilltop house plateau
  ];

  for (const [x, z] of sampleCoords) {
    const surfaceY = getTerrainSurfaceHeight(x, z);
    raycaster.set(new THREE.Vector3(x, 200, z), down);
    const hits = raycaster.intersectObject(terrainMesh, false);
    assert.ok(hits.length >= 1, `Expected raycast hit on terrain mesh at (${x}, ${z})`);
    const meshY = hits[0].point.y;
    assert.ok(
      Math.abs(surfaceY - meshY) < 1e-4,
      `Expected getTerrainSurfaceHeight(${x}, ${z})=${surfaceY} to match meshY=${meshY}`,
    );
  }

  terrainGeo.dispose();
  (terrainMesh.material as THREE.Material).dispose();
  resetTerrainDeformation();

  // Flat world always returns FLAT_GROUND_Y
  setActiveTerrainWorldType('flat');
  assert.equal(getTerrainSurfaceHeight(-451.25, -117.5), FLAT_GROUND_Y);
  setActiveTerrainWorldType('island');
});

test('full jump-and-land cycle across 60Hz and 240Hz never falls below or floats above groundY', () => {
  for (const dt of [1 / 60, 1 / 240]) {
    const player = new THREE.Object3D();
    const groundY = 8.4;
    player.position.set(0, groundY, 0);
    player.userData.verticalVelocity = 7.4;
    player.userData.grounded = false;

    let maxReachedY = groundY;
    let landed = false;
    for (let step = 0; step < Math.ceil(2.5 / dt); step++) {
      player.userData.verticalVelocity -= 21 * dt;
      player.position.y += player.userData.verticalVelocity * dt;
      const isGrounded = fixPlayerGroundCollision(player, groundY, dt);
      maxReachedY = Math.max(maxReachedY, player.position.y);
      assert.ok(player.position.y >= groundY, 'Player must never fall below groundY');
      if (step > 5 && isGrounded) {
        landed = true;
        assert.equal(player.position.y, groundY, 'Player must land flush on groundY');
        assert.equal(player.userData.verticalVelocity, 0);
        break;
      }
    }
    assert.ok(maxReachedY > groundY + 1.1, `Jump should leave ground cleanly at dt=${dt}`);
    assert.equal(landed, true, `Jump should land cleanly at dt=${dt}`);
  }
});
