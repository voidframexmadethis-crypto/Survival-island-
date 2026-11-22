import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { filterTerrainIndexForCaveOpenings } from './caveTerrainOpenings';

function makeGrid(): THREE.BufferGeometry {
  const geometry = new THREE.PlaneGeometry(30, 30, 3, 3);
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

test('cave openings remove terrain triangles under the mouth', () => {
  const geometry = makeGrid();
  const index = geometry.getIndex()!;
  const positions = geometry.getAttribute('position');
  const before = index.count / 3;
  const filtered = filterTerrainIndexForCaveOpenings(index.array, positions, [
    { x: 0, z: 0, radius: 4.2 },
  ]);
  const after = filtered.length / 3;
  assert.ok(after < before, 'the cave mouth should remove terrain triangles');
  assert.ok(after > 0, 'the rest of the hillside should remain');

  const keptGeometry = new THREE.BufferGeometry();
  keptGeometry.setAttribute('position', positions.clone());
  keptGeometry.setIndex(filtered);
  const keptIndex = keptGeometry.getIndex()!;
  const keptPositions = keptGeometry.getAttribute('position');
  for (let i = 0; i < keptIndex.count; i += 3) {
    const tri = [keptIndex.getX(i), keptIndex.getX(i + 1), keptIndex.getX(i + 2)];
    const centreX =
      (keptPositions.getX(tri[0]) +
        keptPositions.getX(tri[1]) +
        keptPositions.getX(tri[2])) /
      3;
    const centreZ =
      (keptPositions.getZ(tri[0]) +
        keptPositions.getZ(tri[1]) +
        keptPositions.getZ(tri[2])) /
      3;
    assert.ok(
      Math.hypot(centreX, centreZ) > 2.4,
      'no intact triangle should remain across the cave mouth centre',
    );
  }
  geometry.dispose();
  keptGeometry.dispose();
});

test('clearing cave openings restores the complete terrain index', () => {
  const geometry = makeGrid();
  const index = geometry.getIndex()!;
  const positions = geometry.getAttribute('position');
  const restored = filterTerrainIndexForCaveOpenings(index.array, positions, []);
  assert.equal(restored.length, index.count);
  let changed = 0;
  for (let i = 0; i < index.count; i++) {
    if (restored[i] !== index.getX(i)) changed++;
  }
  assert.equal(changed, 0);
  geometry.dispose();
});
