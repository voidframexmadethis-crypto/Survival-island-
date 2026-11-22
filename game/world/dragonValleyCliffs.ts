import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  DRAGON_VALLEY_POS,
  HILL_HOUSE_POS,
  getTerrainHeight,
} from './terrain';

/**
 * Rugged natural cliff face around the recessed Dragon Valley floor.
 *
 * The terrain heightfield supplies the actual carved bowl. These merged rock
 * buttresses add overhangs, vertical fractures and roost ledges so the wall
 * reads as fractured basalt instead of a smooth heightfield ramp. They are
 * seated two metres into the terrain, with a deliberate gap at the pass.
 */
export function buildDragonValleyCliffRing(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'dragon-valley-natural-cliffs';
  const passAngle = Math.atan2(
    HILL_HOUSE_POS.z - DRAGON_VALLEY_POS.z,
    HILL_HOUSE_POS.x - DRAGON_VALLEY_POS.x,
  );
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x292522,
    roughness: 0.97,
    metalness: 0.04,
  });
  const emberMat = new THREE.MeshStandardMaterial({
    color: 0x7c2d12,
    emissive: 0xea580c,
    emissiveIntensity: 0.52,
    roughness: 0.7,
  });
  const parts: THREE.BufferGeometry[] = [];
  const ledges: THREE.BufferGeometry[] = [];
  const veins: THREE.BufferGeometry[] = [];
  const matrix = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const pos = new THREE.Vector3();
  const scale = new THREE.Vector3();

  const count = 42;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + 0.08;
    let delta = angle - passAngle;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    if (Math.abs(delta) < 0.44) continue;
    const radius = 25.5 + Math.sin(angle * 7.1) * 2.4 + Math.cos(angle * 3.3) * 1.6;
    const x = DRAGON_VALLEY_POS.x + Math.cos(angle) * radius;
    const z = DRAGON_VALLEY_POS.z + Math.sin(angle) * radius;
    const ground = getTerrainHeight(x, z);
    const height = 13 + (Math.sin(angle * 5.3 + 1.2) * 0.5 + 0.5) * 15;
    const geo = new THREE.DodecahedronGeometry(1, 1);
    pos.set(x, ground + height * 0.26, z);
    scale.set(
      2.1 + Math.abs(Math.sin(angle * 4.2)) * 2.6,
      height * 0.52,
      2.0 + Math.abs(Math.cos(angle * 3.7)) * 2.4,
    );
    euler.set(
      Math.sin(angle * 2.9) * 0.12,
      angle + Math.sin(angle * 5) * 0.35,
      Math.cos(angle * 3.1) * 0.14,
    );
    quat.setFromEuler(euler);
    geo.applyMatrix4(matrix.compose(pos, quat, scale));
    parts.push(geo);

    if (i % 3 === 0) {
      const ledgeGeo = new THREE.DodecahedronGeometry(1, 1);
      const ledgeY = ground + height * (0.42 + (i % 2) * 0.16);
      pos.set(
        x - Math.cos(angle) * 2.1,
        ledgeY,
        z - Math.sin(angle) * 2.1,
      );
      scale.set(4.4, 0.55, 2.8);
      euler.set(0, angle + 0.3, 0);
      quat.setFromEuler(euler);
      ledgeGeo.applyMatrix4(matrix.compose(pos, quat, scale));
      ledges.push(ledgeGeo);
    }

    if (i % 4 === 0) {
      const veinGeo = new THREE.BoxGeometry(0.4, 6.5, 0.38);
      pos.set(x - Math.cos(angle) * 1.8, ground + height * 0.35, z - Math.sin(angle) * 1.8);
      scale.set(1, 1, 1);
      euler.set(0, angle, 0.16);
      quat.setFromEuler(euler);
      veinGeo.applyMatrix4(matrix.compose(pos, quat, scale));
      veins.push(veinGeo);
    }
  }

  const merged = mergeGeometries(parts, false);
  for (const part of parts) part.dispose();
  if (merged) {
    const mesh = new THREE.Mesh(merged, rockMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  const mergedLedges = mergeGeometries(ledges, false);
  for (const ledge of ledges) ledge.dispose();
  if (mergedLedges) {
    const mesh = new THREE.Mesh(mergedLedges, rockMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  const mergedVeins = mergeGeometries(veins, false);
  for (const vein of veins) vein.dispose();
  if (mergedVeins) {
    const mesh = new THREE.Mesh(mergedVeins, emberMat);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    group.add(mesh);
  }

  // A massive shoulder behind the valley anchors it into the mountain mass.
  const backAngle = passAngle + Math.PI;
  const shoulderX = DRAGON_VALLEY_POS.x + Math.cos(backAngle) * 47;
  const shoulderZ = DRAGON_VALLEY_POS.z + Math.sin(backAngle) * 47;
  const shoulderBase = getTerrainHeight(shoulderX, shoulderZ);
  const shoulderGeo = new THREE.DodecahedronGeometry(1, 1);
  pos.set(shoulderX, shoulderBase + 16, shoulderZ);
  scale.set(34, 27, 32);
  euler.set(0.12, backAngle, -0.05);
  quat.setFromEuler(euler);
  shoulderGeo.applyMatrix4(matrix.compose(pos, quat, scale));
  const shoulder = new THREE.Mesh(shoulderGeo, rockMat);
  shoulder.castShadow = true;
  shoulder.receiveShadow = true;
  group.add(shoulder);

  return group;
}
