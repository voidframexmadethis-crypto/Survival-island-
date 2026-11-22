import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { FinalIslandFeatures } from './finalIslandFeatures';

test('FinalIslandFeatures mirrors island caves and awards one Honey Jewel per crystal cave', () => {
  const features = new FinalIslandFeatures(new THREE.Scene());
  features.syncCaves(
    [
      { id: 'cave-0', type: 'crystal', x: 12, z: -8, discovered: false },
      { id: 'cave-1', type: 'regular', x: -20, z: 30, discovered: false },
      { id: 'cave-2', type: 'lush', x: 4, z: 4, discovered: true },
    ],
    () => 7,
  );

  assert.equal(features.caves.length, 3);
  assert.equal(features.caves[0].radius, 12);
  assert.equal(features.caves[1].radius, 5);
  assert.equal(features.caves[0].position.y, 7);
  assert.equal(features.caves[2].discovered, true);

  assert.equal(features.markDiscovered('cave-0'), true);
  assert.equal(features.honeyJewels, 1);
  assert.equal(features.markDiscovered('cave-0'), false);
  assert.equal(features.markDiscovered('cave-1'), true);
  assert.equal(features.honeyJewels, 1);
});

test('FinalIslandFeatures bee befriending unlocks riding after three friends', () => {
  const features = new FinalIslandFeatures(new THREE.Scene());
  features.seedWildBees();
  features.seedWildBees();
  assert.equal(features.bees.length, 6);

  for (let i = 0; i < 3; i++) {
    assert.ok(features.befriendNextWildBee());
  }
  assert.equal(features.getHudSnapshot().friendlyBees, 3);
  assert.equal(features.attemptBeeRidingUnlock().length, 3);
  assert.equal(features.getHudSnapshot().rideableBees, 3);
  assert.equal(features.attemptBeeRidingUnlock().length, 0);
});

test('FinalIslandFeatures queen donations gate a single reputation reward', () => {
  const features = new FinalIslandFeatures(new THREE.Scene());
  features.collectHoney(21);

  assert.equal(features.donateHoney(5), true);
  assert.equal(features.donateHoney(5), true);
  assert.equal(features.donateHoney(5), true);
  assert.equal(features.honey, 6);
  assert.equal(features.queenReputation, 3);

  assert.equal(features.queenReward(3, 'Bee Riding License', features.claimedQueenRewards), true);
  assert.equal(features.queenReward(3, 'Bee Riding License', features.claimedQueenRewards), false);
  assert.deepEqual(features.claimedQueenRewards, ['Bee Riding License']);
});

test('FinalIslandFeatures saves progress, cave discovery, and the hive gate disposes cleanly', () => {
  const scene = new THREE.Scene();
  const features = new FinalIslandFeatures(scene);
  features.syncCaves([{ id: 'cave-0', type: 'crystal', x: 0, z: 0, discovered: false }], () => 0);
  features.markDiscovered('cave-0');
  features.collectHoney(9);
  features.collectComb(4);
  features.seedWildBees();
  features.befriendNextWildBee();
  features.markRedDragonDefeated();

  const anchor = new THREE.Group();
  scene.add(anchor);
  const gate = features.createBeeDimension(anchor, () => {});
  features.update(0.016);
  assert.equal(gate.portal.parent, anchor);

  const save = features.serialize();
  const restored = new FinalIslandFeatures(scene);
  restored.syncCaves([{ id: 'cave-0', type: 'crystal', x: 0, z: 0, discovered: false }], () => 0);
  restored.hydrate(save);

  assert.equal(restored.honey, 9);
  assert.equal(restored.honeycomb, 4);
  assert.equal(restored.honeyJewels, 1);
  assert.equal(restored.dragonUnlocked, true);
  assert.equal(restored.bees.length, 6);
  assert.equal(restored.getCave('cave-0')?.discovered, true);

  features.dispose();
  assert.equal(gate.portal.parent, null);
});
