import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { buildIslandFerryDock } from './ferryDock';
import { FERRY_CALL_POS, FERRY_DOCK_CAR_STOP } from '../systems/ferryPickup';

test('island ferry builds a call box, pier, ramp and moored ferry', () => {
  const ferry = buildIslandFerryDock();
  let dockMeshes = 0;
  ferry.dockGroup.traverse((obj) => {
    if (obj instanceof THREE.Mesh) dockMeshes++;
  });
  let callMeshes = 0;
  ferry.callGroup.traverse((obj) => {
    if (obj instanceof THREE.Mesh) callMeshes++;
  });

  assert.ok(dockMeshes >= 40);
  assert.ok(callMeshes >= 5);
  assert.equal(ferry.callPos.x, FERRY_CALL_POS.x);
  assert.equal(ferry.callPos.z, FERRY_CALL_POS.z);
  assert.equal(ferry.carStopPos.x, FERRY_DOCK_CAR_STOP.x);
  assert.equal(ferry.carStopPos.z, FERRY_DOCK_CAR_STOP.z);
  assert.equal(ferry.colliders.length, 1);
  assert.ok(Number.isFinite(ferry.callPos.y));
  assert.ok(Number.isFinite(ferry.boatPos.y));
});
