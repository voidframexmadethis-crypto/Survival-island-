import * as THREE from 'three';
import {
  LOUISIANA_BOUNDS,
  LOUISIANA_CITY_PLATEAU,
  getLouisianaBaseHeight,
  getLouisianaBiome,
  getLouisianaWaterAt,
} from './louisianaLandmass';

const WILD_SECTORS_X = 4;
const WILD_SECTORS_Z = 2;

function seededRand(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function inCityShelf(x: number, z: number, pad = 24): boolean {
  return (
    Math.abs(x - LOUISIANA_CITY_PLATEAU.cx) < LOUISIANA_CITY_PLATEAU.halfX + pad &&
    Math.abs(z - LOUISIANA_CITY_PLATEAU.cz) < LOUISIANA_CITY_PLATEAU.halfZ + pad
  );
}

/**
 * Cypress marsh, reeds and riverbank driftwood, split into small sectors so
 * the existing world culler can sleep the mainland nature when the player is
 * back on the survival island.
 */
export function buildLouisianaWilds(): THREE.Group[] {
  const groups: THREE.Group[] = [];
  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x4b3524,
    roughness: 0.96,
  });
  const canopyMat = new THREE.MeshStandardMaterial({
    color: 0x2f5636,
    roughness: 0.9,
  });
  const mossMat = new THREE.MeshStandardMaterial({
    color: 0x81946a,
    roughness: 0.96,
  });
  const reedMat = new THREE.MeshStandardMaterial({
    color: 0x55713f,
    roughness: 0.94,
  });
  const trunkGeo = new THREE.CylinderGeometry(0.28, 0.52, 1, 6);
  const canopyGeo = new THREE.ConeGeometry(2.4, 5.2, 7);
  const mossGeo = new THREE.ConeGeometry(1.35, 2.6, 6);
  const reedGeo = new THREE.BoxGeometry(0.1, 1.35, 0.1);
  const dummy = new THREE.Object3D();
  const spanX = (LOUISIANA_BOUNDS.maxX - LOUISIANA_BOUNDS.minX) / WILD_SECTORS_X;
  const spanZ = (LOUISIANA_BOUNDS.maxZ - LOUISIANA_BOUNDS.minZ) / WILD_SECTORS_Z;

  for (let sz = 0; sz < WILD_SECTORS_Z; sz++) {
    for (let sx = 0; sx < WILD_SECTORS_X; sx++) {
      const group = new THREE.Group();
      group.name = `louisiana-wilds-${sx}-${sz}`;
      const rand = seededRand(7139 + sx * 97 + sz * 131);
      const cypressCount = 34;
      const reedCount = 62;
      const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, cypressCount);
      const canopies = new THREE.InstancedMesh(canopyGeo, canopyMat, cypressCount);
      const moss = new THREE.InstancedMesh(mossGeo, mossMat, cypressCount);
      const reeds = new THREE.InstancedMesh(reedGeo, reedMat, reedCount);
      trunks.castShadow = true;
      canopies.castShadow = true;
      reeds.castShadow = false;
      trunks.receiveShadow = true;
      canopies.receiveShadow = true;
      let placed = 0;
      let attempts = 0;
      while (placed < cypressCount && attempts < 400) {
        attempts++;
        const x = LOUISIANA_BOUNDS.minX + (sx + rand()) * spanX;
        const z = LOUISIANA_BOUNDS.minZ + (sz + rand()) * spanZ;
        if (inCityShelf(x, z)) continue;
        if (getLouisianaWaterAt(x, z)) continue;
        const h = getLouisianaBaseHeight(x, z);
        if (h === null || h < 1.2) continue;
        const biome = getLouisianaBiome(x, z);
        if (biome !== 'swamp' && biome !== 'forest' && biome !== 'beach') continue;
        const scale = 0.85 + rand() * 0.75;
        dummy.position.set(x, h + 3.2 * scale, z);
        dummy.rotation.set(0, rand() * Math.PI * 2, 0);
        dummy.scale.set(scale, 6.4 * scale, scale);
        dummy.updateMatrix();
        trunks.setMatrixAt(placed, dummy.matrix);
        dummy.position.set(x, h + 6.4 * scale, z);
        dummy.scale.set(scale, scale, scale);
        dummy.updateMatrix();
        canopies.setMatrixAt(placed, dummy.matrix);
        dummy.position.set(x + 0.4 * scale, h + 5.0 * scale, z + 0.2 * scale);
        dummy.scale.set(scale, scale, scale);
        dummy.updateMatrix();
        moss.setMatrixAt(placed, dummy.matrix);
        placed++;
      }
      for (let i = placed; i < cypressCount; i++) {
        dummy.position.set(0, -999, 0);
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        trunks.setMatrixAt(i, dummy.matrix);
        canopies.setMatrixAt(i, dummy.matrix);
        moss.setMatrixAt(i, dummy.matrix);
      }
      let reedPlaced = 0;
      let reedAttempts = 0;
      while (reedPlaced < reedCount && reedAttempts < 400) {
        reedAttempts++;
        const x = LOUISIANA_BOUNDS.minX + (sx + rand()) * spanX;
        const z = LOUISIANA_BOUNDS.minZ + (sz + rand()) * spanZ;
        if (inCityShelf(x, z)) continue;
        const water = getLouisianaWaterAt(x, z);
        if (!water) continue;
        const h = getLouisianaBaseHeight(x, z);
        if (h === null) continue;
        dummy.position.set(x, Math.max(h, water.waterY) + 0.5, z);
        dummy.rotation.set(0, rand() * Math.PI, 0);
        dummy.scale.set(1, 0.75 + rand() * 0.9, 1);
        dummy.updateMatrix();
        reeds.setMatrixAt(reedPlaced++, dummy.matrix);
      }
      for (let i = reedPlaced; i < reedCount; i++) {
        dummy.position.set(0, -999, 0);
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        reeds.setMatrixAt(i, dummy.matrix);
      }
      trunks.instanceMatrix.needsUpdate = true;
      canopies.instanceMatrix.needsUpdate = true;
      moss.instanceMatrix.needsUpdate = true;
      reeds.instanceMatrix.needsUpdate = true;
      trunks.computeBoundingSphere();
      canopies.computeBoundingSphere();
      moss.computeBoundingSphere();
      reeds.computeBoundingSphere();
      group.add(trunks, canopies, moss, reeds);
      groups.push(group);
    }
  }
  return groups;
}
