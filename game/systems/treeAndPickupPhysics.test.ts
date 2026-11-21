import assert from 'node:assert/strict';
import test from 'node:test';
import { ITEMS } from '../data/items';
import { ResourceNodeKind } from '../types';
import {
  TREE_FALL_IMPACT_FRACTION,
  TREE_RESOURCE_KINDS,
  canCollectPickupWithinRange,
  computeTreeChopPower,
  computeTreeFallPose,
  isChoppableNodeKind,
  isTreeResourceKind,
} from './treeAndPickupPhysics';

const ALL_23_TREE_KINDS: ResourceNodeKind[] = [
  'palm_tree',
  'tropical_tree',
  'oak_tree',
  'dark_oak_tree',
  'huge_red_mushroom',
  'huge_brown_mushroom',
  'banyan_tree',
  'highland_cedar',
  'birch_tree',
  'old_growth_birch_tree',
  'pale_oak_tree',
  'taiga_pine_tree',
  'old_growth_pine_tree',
  'spruce_tree',
  'mega_spruce_tree',
  'snowy_spruce_tree',
  'jungle_tree',
  'mega_jungle_tree',
  'cherry_tree',
  'bee_nest_oak',
  'acacia_tree',
  'swamp_oak_tree',
  'mangrove_tree',
];

test('isTreeResourceKind covers all 23 tree and giant mushroom species and rejects boulders', () => {
  assert.equal(TREE_RESOURCE_KINDS.size, 23);
  for (const kind of ALL_23_TREE_KINDS) {
    assert.equal(isTreeResourceKind(kind), true, `${kind} should be recognized as a tree`);
    assert.equal(isChoppableNodeKind(kind), true, `${kind} should be choppable`);
  }
  assert.equal(isTreeResourceKind('stone_boulder'), false);
  assert.equal(isChoppableNodeKind('branch_pile'), true);
  assert.equal(isChoppableNodeKind('bamboo_stalk'), true);
  assert.equal(isChoppableNodeKind('jungle_bush'), true);
});

test('computeTreeChopPower grants >= 1 damage for every tool, weapon, and bare hands', () => {
  assert.equal(computeTreeChopPower(null), 1);
  assert.equal(computeTreeChopPower(undefined), 1);
  assert.equal(computeTreeChopPower(ITEMS.stone_axe), 3);
  assert.equal(computeTreeChopPower(ITEMS.stone_warhammer), 3);
  assert.equal(computeTreeChopPower(ITEMS.stone_pickaxe), 2);
  assert.equal(computeTreeChopPower(ITEMS.sickle), 2);
  assert.equal(computeTreeChopPower(ITEMS.excavator_shovel), 2);
  assert.equal(computeTreeChopPower(ITEMS.hunting_knife), 2);
  assert.equal(computeTreeChopPower(ITEMS.wooden_club), 2);
  assert.equal(computeTreeChopPower(ITEMS.wooden_spear), 2);
  assert.equal(computeTreeChopPower(ITEMS.fishing_rod), 1);
  assert.equal(computeTreeChopPower(ITEMS.gun), 3);
  assert.equal(computeTreeChopPower(ITEMS.berries), 1);
});

test('computeTreeFallPose aligns local hinge tip direction with world fall direction across any rootYaw', () => {
  const yaws = [0, Math.PI / 4, Math.PI / 2, -1.85, 2.7];
  const dirs = [
    [1, 0],
    [0, 1],
    [-0.6, 0.8],
    [-0.7, -0.7],
  ];

  for (const yaw of yaws) {
    for (const [fdx, fdz] of dirs) {
      const len = Math.hypot(fdx, fdz);
      const nx = fdx / len;
      const nz = fdz / len;
      const pose = computeTreeFallPose(fdx, fdz, yaw, TREE_FALL_IMPACT_FRACTION);

      // Rotate local up (0, 1, 0) around horizontal axis (axisX, 0, axisZ) by tiltRad
      const sinT = Math.sin(pose.tiltRad);
      // k x (0, 1, 0) = (-axisZ, 0, axisX)
      const localTipX = -pose.axisZ * sinT;
      const localTipZ = pose.axisX * sinT;

      // Rotate local XZ tip vector into world space by root.rotation.y = yaw
      const cy = Math.cos(yaw);
      const sy = Math.sin(yaw);
      const worldTipX = localTipX * cy + localTipZ * sy;
      const worldTipZ = -localTipX * sy + localTipZ * cy;

      const dot = worldTipX * nx + worldTipZ * nz;
      assert.ok(
        dot > 0.99,
        `Expected world fall tip to match (${nx.toFixed(2)}, ${nz.toFixed(2)}) for yaw=${yaw}, got dot=${dot}`,
      );
    }
  }
});

test('computeTreeFallPose models gravity acceleration, elastic ground bounce, and smooth floor settle', () => {
  const early = computeTreeFallPose(1, 0, 0, 0.25);
  const mid = computeTreeFallPose(1, 0, 0, 0.5);
  const impact = computeTreeFallPose(1, 0, 0, TREE_FALL_IMPACT_FRACTION);
  const bounce = computeTreeFallPose(1, 0, 0, 0.76);
  const settled = computeTreeFallPose(1, 0, 0, 0.98);

  assert.equal(early.impacted, false);
  assert.equal(mid.impacted, false);
  assert.ok(mid.tiltRad > early.tiltRad * 2.5, 'gravity curve should accelerate sharply');
  assert.equal(impact.impacted, true);
  assert.equal(bounce.impacted, true);
  assert.ok(bounce.tiltRad < impact.tiltRad, 'ground impact should produce a subtle elastic rebound');
  assert.equal(settled.impacted, true);
  assert.ok(settled.sinkScale < 1 && settled.sinkScale >= 0.02);
  assert.ok(settled.dropY < impact.dropY);
});

test('canCollectPickupWithinRange checks collected state, finite coords, horizontal radius, and vertical height', () => {
  assert.equal(
    canCollectPickupWithinRange({ collected: false, x: 10.5, y: 2, z: -4 }, 10, 1.8, -3.5, 1.65),
    true,
  );
  assert.equal(
    canCollectPickupWithinRange({ collected: true, x: 10.1, y: 2, z: -4 }, 10, 1.8, -4, 1.65),
    false,
  );
  assert.equal(
    canCollectPickupWithinRange({ collected: false, x: 14, y: 2, z: -4 }, 10, 1.8, -4, 1.65),
    false,
  );
  assert.equal(
    canCollectPickupWithinRange({ collected: false, x: 10.1, y: 8, z: -4 }, 10, 1.8, -4, 1.65, 3.2),
    false,
  );
  assert.equal(
    canCollectPickupWithinRange({ collected: false, x: Number.NaN, y: 2, z: -4 }, 10, 1.8, -4, 1.65),
    false,
  );
});
