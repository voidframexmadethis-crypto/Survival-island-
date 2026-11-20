import assert from 'node:assert/strict';
import * as THREE from 'three';
import { WorldChunkManager, updateWorldChunks } from './worldChunkSystem';

// 1. Direct updateWorldChunks behavior across walking, driving, and flying coordinates
const parent = new THREE.Group();
const mgr = new WorldChunkManager(parent, 64);

const nearObj = new THREE.Mesh();
const midObj = new THREE.Mesh();
const farObj = new THREE.Mesh();

mgr.addObjectAt(nearObj, 10, 10); // chunk (0, 0)
mgr.addObjectAt(midObj, 140, 20); // chunk (2, 0)
mgr.addObjectAt(farObj, 480, 480); // chunk (7, 7)

assert.equal(mgr.chunks.length, 3, 'Should create 3 distinct WorldChunks');

const playerPos = new THREE.Vector3(12, 2, 12); // chunk (0, 0)
// Initial update should run
assert.equal(mgr.updateIfChunkChanged(playerPos, 180), true);
assert.equal(mgr.chunks[0].group.visible, true);
assert.equal(mgr.chunks[1].group.visible, true);
assert.equal(mgr.chunks[2].group.visible, false);

// Walking within same chunk (0, 0) must NOT trigger chunk visibility recalculation
playerPos.set(45, 2, 50);
assert.equal(mgr.updateIfChunkChanged(playerPos, 180), false);

// Driving across chunk boundary into chunk (2, 0) triggers update
playerPos.set(135, 2, 20);
assert.equal(mgr.updateIfChunkChanged(playerPos, 180), true);
assert.equal(mgr.chunks[0].group.visible, true);
assert.equal(mgr.chunks[1].group.visible, true);
assert.equal(mgr.chunks[2].group.visible, false);

// Flying across the island to chunk (7, 7) hides origin chunk and reveals far chunk
playerPos.set(490, 65, 490);
assert.equal(mgr.updateIfChunkChanged(playerPos, 180), true);
assert.equal(mgr.chunks[0].group.visible, false);
assert.equal(mgr.chunks[1].group.visible, false);
assert.equal(mgr.chunks[2].group.visible, true);

// Direct updateWorldChunks call matches circular radius exactly
updateWorldChunks(mgr.chunks, new THREE.Vector3(10, 0, 10), 64, 1);
assert.equal(mgr.chunks[0].group.visible, true);
assert.equal(mgr.chunks[1].group.visible, false);
assert.equal(mgr.chunks[2].group.visible, false);

console.log('worldChunkSystem tests passed!');
