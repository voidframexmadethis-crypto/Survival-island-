import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
  CAVE_ENTRANCE_MAX_PITCH,
  fitCaveEntrance,
  fitCavePierFoot,
} from './caveEntrancePlacement';
import { computeTunnelSink, getCaveEntranceYaw } from './islandCaveSystem';
import { getTerrainSurfaceHeight } from '../world/terrain';

const STEEP_SITES: { x: number; z: number; name: string }[] = [
  { x: -60, z: -150, name: 'western ridge' },
  { x: 120, z: -140, name: 'northern slope' },
  { x: 0, z: -260, name: 'mountain flank' },
];

function makeEntranceGroup(
  x: number,
  z: number,
  scale: number,
): { group: THREE.Group; fit: ReturnType<typeof fitCaveEntrance> } {
  const fit = fitCaveEntrance(x, z);
  const group = new THREE.Group();
  group.position.set(x, fit.y, z);
  group.scale.setScalar(scale);
  group.rotation.order = 'YXZ';
  group.rotation.set(fit.pitch, fit.yaw, 0);
  group.updateMatrixWorld(true);
  return { group, fit };
}

test('cave arches face downhill on the rendered terrain', () => {
  for (const site of STEEP_SITES) {
    const yaw = getCaveEntranceYaw(site.x, site.z);
    const e = 3;
    const sin = Math.sin(yaw);
    const cos = Math.cos(yaw);
    // local +Z is downhill, local -Z is uphill.
    const downhill = getTerrainSurfaceHeight(site.x + sin * e, site.z + cos * e);
    const uphill = getTerrainSurfaceHeight(site.x - sin * e, site.z - cos * e);
    assert.ok(
      uphill > downhill + 0.1,
      `${site.name}: expected uphill (${uphill.toFixed(2)}) above downhill (${downhill.toFixed(2)})`,
    );
  }
});

test('cave arches sit on both slopes without floating piers or a buried opening', () => {
  for (const site of STEEP_SITES) {
    const { group, fit } = makeEntranceGroup(site.x, site.z, 1);
    assert.ok(fit.pitch >= 0);
    assert.ok(fit.pitch <= CAVE_ENTRANCE_MAX_PITCH + 1e-9);

    for (const side of [-1, 1] as const) {
      const foot = fitCavePierFoot(group, side);
      // Rebuild the foot from the fitted pier geometry.
      const localFoot = new THREE.Vector3(
        side * 1.3,
        2.75 - foot.height,
        0,
      ).applyMatrix4(group.matrixWorld);
      const ground = getTerrainSurfaceHeight(localFoot.x, localFoot.z);
      assert.ok(
        localFoot.y <= ground + 0.05,
        `${site.name} side ${side}: pier foot floats ${(localFoot.y - ground).toFixed(2)}m`,
      );

      // The jamb stays attached to the lintel and reaches its own slope.
      assert.ok(foot.height >= 2.8 - 1e-9);
      assert.ok(
        Math.abs(foot.centerY + foot.height / 2 - 2.75) < 1e-9,
        'pier top must remain at the lintel',
      );
    }

    const centerGround = getTerrainSurfaceHeight(site.x, site.z);
    const mouthTop = new THREE.Vector3(0, 1.35 + 1.16, 0).applyMatrix4(
      group.matrixWorld,
    );
    assert.ok(
      mouthTop.y > centerGround + 0.8,
      `${site.name}: dark opening is buried (${(mouthTop.y - centerGround).toFixed(2)}m tall)`,
    );

    const lintelTop = new THREE.Vector3(0, 3.375, 0).applyMatrix4(group.matrixWorld);
    assert.ok(
      lintelTop.y > centerGround + 1,
      `${site.name}: lintel is buried`,
    );
  }
});

test('special cave bores stay under the rendered hillside for their whole length', () => {
  const cave = { x: -60, z: -150 };
  const radius = 5.2;
  const baseY = getTerrainSurfaceHeight(cave.x, cave.z);
  const yaw = getCaveEntranceYaw(cave.x, cave.z);
  const path = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.2, 0),
    new THREE.Vector3(0, 0.5, -8),
    new THREE.Vector3(2.2, -2.6, -20),
    new THREE.Vector3(3.4, -7, -34),
    new THREE.Vector3(0, -13, -55),
  ]);

  const sink = computeTunnelSink(cave.x, cave.z, baseY, yaw, path, radius);
  assert.ok(Number.isFinite(sink));
  assert.ok(sink >= radius + 0.45);

  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  for (let i = 0; i <= 100; i++) {
    const point = path.getPointAt(i / 100);
    const worldX = cave.x + point.x * cos + point.z * sin;
    const worldZ = cave.z - point.x * sin + point.z * cos;
    const terrain = getTerrainSurfaceHeight(worldX, worldZ);
    const tubeTop = baseY - sink + point.y + radius;
    assert.ok(
      tubeTop <= terrain + 0.01,
      `bore emerges above terrain at sample ${i}: ${(tubeTop - terrain).toFixed(2)}m`,
    );
  }
});
