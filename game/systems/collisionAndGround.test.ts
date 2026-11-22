import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  BADLANDS_MINESHAFT_POS,
  FLAT_GROUND_Y,
  HILL_HOUSE_POS,
  HILL_HOUSE_Y,
  PILLAGER_OUTPOST_POS,
  PLAYER_SPAWN,
  RESORT_CORNER_POS,
  RUINED_CASTLE_POS,
  SATURN_ROCKET_POS,
  SNOWY_IGLOO_POS,
  SWAMP_HUT_POS,
  TERRAIN_SEGS,
  TERRAIN_SIZE,
  TERRAIN_VERTS,
  VEHICLE_GARAGE_POS,
  VEHICLE_GARAGE_Y,
  WOODLAND_MANSION_POS,
  getHilltopBaseFloorY,
  getLandmarkFloorY,
  getOverworldStructureSurfaceY,
  getTerrainHeight,
  resetTerrainDeformation,
  samplePlaneGeometryHeight,
  setActiveTerrainWorldType,
} from '../world/terrain';
import { VolumetricTerrainEngine } from './terrainPhysics';
import {
  SPACE_ASTEROID_PADS,
  SPACE_BRIDGES,
  getDimensionArrivalPoint,
  getDimensionTerrainHeight,
  getSpacePlatformSurfaceY,
} from './multiverse';

test('samplePlaneGeometryHeight matches Three.js Raycaster across deformed diagonal triangles', () => {
  const geo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, TERRAIN_SEGS, TERRAIN_SEGS);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;

  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vz = pos.getZ(i);
    pos.setY(i, getTerrainHeight(vx, vz));
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  geo.computeBoundingSphere();

  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial());
  mesh.updateMatrixWorld(true);
  const raycaster = new THREE.Raycaster();
  const origin = new THREE.Vector3();
  const down = new THREE.Vector3(0, -1, 0);

  // Sample grid centers, edges, steep mountain slopes, and both triangle halves across cells
  const probes: [number, number][] = [
    [PLAYER_SPAWN.x, PLAYER_SPAWN.z],
    [HILL_HOUSE_POS.x + 12, HILL_HOUSE_POS.z],
    [14.2, -96.4],
    [-47.8, 33.1],
    [221.3, 148.9],
    [-312.6, -244.4],
    [0.1, 0.2],
    [7.4, 7.4],
  ];

  for (const [px, pz] of probes) {
    const sampled = samplePlaneGeometryHeight(geo, TERRAIN_SIZE, TERRAIN_SEGS, px, pz);
    assert.ok(sampled !== null && Number.isFinite(sampled));
    origin.set(px, 250, pz);
    raycaster.set(origin, down);
    const hits = raycaster.intersectObject(mesh, false);
    assert.ok(hits.length > 0, `Expected raycast hit at (${px}, ${pz})`);
    assert.ok(
      Math.abs((sampled as number) - hits[0].point.y) < 1e-4,
      `Triangle mismatch at (${px}, ${pz}): sampled=${sampled} ray=${hits[0].point.y}`,
    );
  }
});

test('VolumetricTerrainEngine syncs geometry vertices and updates bounding volumes on excavation', () => {
  resetTerrainDeformation();
  setActiveTerrainWorldType('island');
  const scene = new THREE.Scene();
  const engine = new VolumetricTerrainEngine(scene);

  const geo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, TERRAIN_SEGS, TERRAIN_SEGS);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const baseColors = new Float32Array(pos.count * 3);
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, getTerrainHeight(pos.getX(i), pos.getZ(i)));
    baseColors[i * 3] = 0.2;
    baseColors[i * 3 + 1] = 0.5;
    baseColors[i * 3 + 2] = 0.2;
    colors[i * 3] = 0.2;
    colors[i * 3 + 1] = 0.5;
    colors[i * 3 + 2] = 0.2;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  geo.computeBoundingSphere();

  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial());
  // Carve crater away from protected homestead structures
  const cx = 60;
  const cz = 45;
  const beforeH = getTerrainHeight(cx, cz);
  const moved = engine.excavateSoilBrush(cx, cz, 12, -2.5);
  assert.ok(moved > 0);

  const res = engine.step(0.05, mesh, baseColors, false, cx, cz, false);
  assert.equal(res.dirtyVertices, true);
  assert.ok(geo.boundingBox !== null);
  assert.ok(geo.boundingSphere !== null && geo.boundingSphere.radius > 0);

  const syncedY = samplePlaneGeometryHeight(geo, TERRAIN_SIZE, TERRAIN_SEGS, cx, cz);
  const analyticH = getTerrainHeight(cx, cz);
  assert.ok(syncedY !== null && syncedY < beforeH - 0.5);
  assert.ok(Math.abs((syncedY as number) - analyticH) < 0.15);

  engine.dispose(scene);
  resetTerrainDeformation();
  assert.equal(TERRAIN_VERTS, TERRAIN_SEGS + 1);
});

test('getOverworldStructureSurfaceY covers all 7 landmark surfaces and swept fall checks', () => {
  setActiveTerrainWorldType('island');

  // 1. Custom 4-Bay Vehicle Garage pad, bay pad & apron
  const bayY = getOverworldStructureSurfaceY(
    VEHICLE_GARAGE_POS.x - 9.0,
    VEHICLE_GARAGE_POS.z,
    VEHICLE_GARAGE_Y + 0.5,
  );
  assert.ok(Math.abs(bayY - (VEHICLE_GARAGE_Y + 0.165)) < 1e-4);

  const apronY = getOverworldStructureSurfaceY(
    VEHICLE_GARAGE_POS.x,
    VEHICLE_GARAGE_POS.z + 8.0,
    VEHICLE_GARAGE_Y + 0.4,
  );
  assert.ok(apronY > VEHICLE_GARAGE_Y && apronY < VEHICLE_GARAGE_Y + 0.2);

  // Swept fall protection: falling from above deck catches cleanly, far below does not snap up
  const sweptCatch = getOverworldStructureSurfaceY(
    VEHICLE_GARAGE_POS.x,
    VEHICLE_GARAGE_POS.z,
    VEHICLE_GARAGE_Y - 1.9,
    VEHICLE_GARAGE_Y + 0.4,
  );
  assert.ok(sweptCatch >= VEHICLE_GARAGE_Y + 0.13);

  const tooFarBelow = getOverworldStructureSurfaceY(
    VEHICLE_GARAGE_POS.x,
    VEHICLE_GARAGE_POS.z,
    VEHICLE_GARAGE_Y - 3.0,
    VEHICLE_GARAGE_Y - 2.5,
  );
  assert.equal(tooFarBelow, -9999);

  // 2. Hilltop House East Access Ramp
  const rampMidY = getOverworldStructureSurfaceY(
    HILL_HOUSE_POS.x + 13.5,
    HILL_HOUSE_POS.z,
    HILL_HOUSE_Y,
  );
  assert.ok(rampMidY > 3.25 && rampMidY < HILL_HOUSE_Y);

  // 3. Saturn V launch pad & ramp
  const saturnBase = getTerrainHeight(SATURN_ROCKET_POS.x, SATURN_ROCKET_POS.z);
  const saturnPadY = getOverworldStructureSurfaceY(
    SATURN_ROCKET_POS.x + 2,
    SATURN_ROCKET_POS.z,
    saturnBase + 1.0,
  );
  assert.ok(Math.abs(saturnPadY - (saturnBase + 0.6)) < 1e-4);

  // 4. Badlands mineshaft deck
  const mineBase = getTerrainHeight(BADLANDS_MINESHAFT_POS.x, BADLANDS_MINESHAFT_POS.z);
  const mineY = getOverworldStructureSurfaceY(
    BADLANDS_MINESHAFT_POS.x,
    BADLANDS_MINESHAFT_POS.z,
    mineBase + 0.8,
  );
  assert.ok(Math.abs(mineY - (mineBase + 0.2)) < 1e-4);

  // 5. Swamp hut raised deck
  const swampBase = getTerrainHeight(SWAMP_HUT_POS.x, SWAMP_HUT_POS.z);
  const swampY = getOverworldStructureSurfaceY(
    SWAMP_HUT_POS.x,
    SWAMP_HUT_POS.z,
    swampBase + 3.0,
  );
  assert.ok(Math.abs(swampY - (swampBase + 2.575)) < 1e-4);

  // 6. Resort corner Tiki deck
  const tikiBase = getTerrainHeight(RESORT_CORNER_POS.x, RESORT_CORNER_POS.z);
  const tikiY = getOverworldStructureSurfaceY(
    RESORT_CORNER_POS.x,
    RESORT_CORNER_POS.z,
    tikiBase + 1.2,
  );
  assert.ok(Math.abs(tikiY - (tikiBase + 0.6)) < 1e-4);

  // 7. Ruined castle throne dais
  const castleBase = getTerrainHeight(RUINED_CASTLE_POS.x, RUINED_CASTLE_POS.z);
  const daisY = getOverworldStructureSurfaceY(
    RUINED_CASTLE_POS.x,
    RUINED_CASTLE_POS.z - 6,
    castleBase + 1.5,
  );
  assert.ok(Math.abs(daisY - (castleBase + 1.2)) < 1e-4);

  // Flat world returns -9999 and flat ground height = FLAT_GROUND_Y
  setActiveTerrainWorldType('flat');
  assert.equal(getTerrainHeight(0, 0), FLAT_GROUND_Y);
  assert.equal(
    getOverworldStructureSurfaceY(VEHICLE_GARAGE_POS.x, VEHICLE_GARAGE_POS.z, 10),
    -9999,
  );
  setActiveTerrainWorldType('island');
});

test('getHilltopBaseFloorY and getLandmarkFloorY support interior floors cleanly', () => {
  setActiveTerrainWorldType('island');

  const hilltopFloor = getHilltopBaseFloorY(
    HILL_HOUSE_POS.x,
    HILL_HOUSE_POS.z,
    HILL_HOUSE_Y + 0.5,
  );
  assert.ok(Math.abs(hilltopFloor - (HILL_HOUSE_Y + 0.08)) < 1e-4);

  const mansionFloor = getLandmarkFloorY(
    WOODLAND_MANSION_POS.x,
    WOODLAND_MANSION_POS.z,
    5.0,
  );
  assert.ok(Math.abs(mansionFloor - 4.24) < 1e-4);

  const outpostFloor = getLandmarkFloorY(
    PILLAGER_OUTPOST_POS.x,
    PILLAGER_OUTPOST_POS.z,
    5.5,
  );
  assert.ok(Math.abs(outpostFloor - 5.12) < 1e-4);

  const iglooFloor = getLandmarkFloorY(SNOWY_IGLOO_POS.x, SNOWY_IGLOO_POS.z, 9.5);
  assert.ok(Math.abs(iglooFloor - 9.05) < 1e-4);
});

test('Space platforms/bridges and all dimension arrival points resolve valid solid ground', () => {
  const mainPad = SPACE_ASTEROID_PADS[0];
  const padSurface = getSpacePlatformSurfaceY(mainPad.x, mainPad.z, mainPad.y + 0.5);
  assert.ok(Math.abs(padSurface - mainPad.y) < 1e-4);

  const br = SPACE_BRIDGES[0];
  const midX = (br.ax + br.bx) * 0.5;
  const midZ = (br.az + br.bz) * 0.5;
  const midExpectedY = (br.ay + br.by) * 0.5;
  const bridgeSurface = getSpacePlatformSurfaceY(midX, midZ, midExpectedY + 0.5);
  assert.ok(Math.abs(bridgeSurface - midExpectedY) < 0.05);

  const dims = [
    'overworld',
    'space',
    'nether',
    'gold',
    'diamond',
    'alien',
    'island_arctic',
    'island_volcanic',
    'island_jungle',
    'bee_dimension',
  ] as const;

  for (const dim of dims) {
    const arrival = getDimensionArrivalPoint(dim);
    const ground = getDimensionTerrainHeight(dim, arrival.x, arrival.z);
    assert.ok(Number.isFinite(arrival.y) && Number.isFinite(ground));
    assert.ok(arrival.y >= ground, `Arrival below ground in ${dim}`);
  }
});
