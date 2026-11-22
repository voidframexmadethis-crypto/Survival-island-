import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  GRASS_VARIANTS,
  createGrassVariantGeometry,
  createPalmBootGeometry,
  createPalmFrondGeometries,
  createPalmTrunkSegmentGeometry,
} from './vegetation';

function triangleCount(geo: THREE.BufferGeometry): number {
  return geo.index ? geo.index.count / 3 : geo.attributes.position.count / 3;
}

function assertFiniteGeometry(geo: THREE.BufferGeometry, label: string): void {
  const pos = geo.attributes.position;
  assert.ok(pos, `${label} has positions`);
  for (let i = 0; i < pos.array.length; i++) {
    assert.ok(Number.isFinite(pos.array[i]), `${label} position ${i} is finite`);
  }
  assert.ok(geo.attributes.normal, `${label} has normals`);
  assert.ok(geo.attributes.uv, `${label} has uvs`);
  assert.ok(geo.index, `${label} is indexed`);
}

// --- Palm fronds -----------------------------------------------------------
const fronds = createPalmFrondGeometries();
assert.equal(fronds.length, 3, 'three shared frond shapes');

const frondSignatures = new Set<number>();
for (const [i, geo] of fronds.entries()) {
  assertFiniteGeometry(geo, `frond ${i}`);
  const tris = triangleCount(geo);
  assert.ok(tris >= 100 && tris <= 150, `frond ${i} triangle budget (${tris})`);
  frondSignatures.add(geo.attributes.position.count);

  geo.computeBoundingBox();
  const box = geo.boundingBox!;
  // Long, arched, drooping silhouette rather than the old radial cone spike.
  assert.ok(box.max.x - box.min.x > 0.95, `frond ${i} spans a full frond length`);
  assert.ok(box.max.z - box.min.z > 0.4, `frond ${i} spreads leaflets sideways`);
  assert.ok(box.min.y < -0.15, `frond ${i} droops below the crown`);
  assert.ok(box.max.y > 0.05, `frond ${i} arches above the crown`);

  const colors = geo.attributes.color;
  assert.ok(colors, `frond ${i} has leaflet vertex colours`);
  let r = 0;
  let g = 0;
  let b = 0;
  for (let v = 0; v < colors.count; v++) {
    r += colors.getX(v);
    g += colors.getY(v);
    b += colors.getZ(v);
  }
  assert.ok(g > r && g > b, `frond ${i} is green-dominant`);
}
assert.equal(frondSignatures.size, 3, 'frond shapes are geometrically distinct');

// Trunk segment: unit height, tapered, reusable buffer.
const trunk = createPalmTrunkSegmentGeometry();
assertFiniteGeometry(trunk, 'palm trunk');
trunk.computeBoundingBox();
const trunkBox = trunk.boundingBox!;
assert.ok(Math.abs(trunkBox.max.y - 1) < 1e-6, 'trunk segment spans exactly 0..1 height');
assert.ok(trunkBox.max.x <= 1.05 && trunkBox.min.x >= -1.05, 'trunk uses a unit radius');
assert.ok(triangleCount(trunk) <= 120, 'trunk segment stays low-poly');

const boot = createPalmBootGeometry();
assertFiniteGeometry(boot, 'palm boot');
assert.ok(triangleCount(boot) < 40, 'boot collar is a tiny shared buffer');

// --- Grass species ---------------------------------------------------------
assert.deepEqual(GRASS_VARIANTS, ['lush', 'tall', 'dune', 'alpine']);

const heights: Record<string, number> = {};
for (const variant of GRASS_VARIANTS) {
  const set = createGrassVariantGeometry(variant);
  const nearTris = triangleCount(set.near);
  const ultraTris = triangleCount(set.ultra);
  const farTris = triangleCount(set.far);
  assert.ok(nearTris >= 36, `${variant} near clump has real blade detail (${nearTris})`);
  assert.ok(ultraTris > nearTris, `${variant} ultra clump is denser`);
  assert.ok(farTris < nearTris * 0.6, `${variant} far LOD cuts blade count`);

  for (const [lod, geo] of Object.entries({ near: set.near, ultra: set.ultra, far: set.far })) {
    assertFiniteGeometry(geo, `${variant} ${lod}`);
    geo.computeBoundingBox();
    assert.ok(geo.boundingBox!.max.y > 0.15, `${variant} ${lod} grows above ground`);
    assert.ok(geo.boundingBox!.min.y >= -1e-6, `${variant} ${lod} stays above its root plane`);
    const colors = geo.attributes.color;
    assert.ok(colors, `${variant} ${lod} has blade colour gradient`);
    assert.ok(colors.getY(0) <= colors.getY(colors.count - 1), `${variant} ${lod} brightens to the tip`);
  }
  heights[variant] = set.near.boundingBox!.max.y;
}

assert.ok(heights.tall > heights.lush, 'savanna bunch grass is taller than meadow turf');
assert.ok(heights.alpine < heights.lush, 'alpine turf is shorter than meadow turf');
assert.ok(heights.dune > 0.8, 'dune grass grows tall enough to lean over the sand');

console.log('vegetation geometry tests passed!');
