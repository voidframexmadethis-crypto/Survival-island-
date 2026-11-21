import { ItemDefinition, ResourceNodeKind } from '../types';

export const TREE_FALL_DURATION_SEC = 1.65;
export const TREE_FALL_IMPACT_FRACTION = 0.68;

export const TREE_RESOURCE_KINDS: ReadonlySet<ResourceNodeKind> = new Set<ResourceNodeKind>([
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
]);

export function isTreeResourceKind(kind: ResourceNodeKind): boolean {
  return TREE_RESOURCE_KINDS.has(kind);
}

export function isChoppableNodeKind(kind: ResourceNodeKind): boolean {
  return (
    TREE_RESOURCE_KINDS.has(kind) ||
    kind === 'branch_pile' ||
    kind === 'bamboo_stalk' ||
    kind === 'jungle_bush'
  );
}

/**
 * Any tool, weapon, equipment, or bare hands can chop down any tree.
 * Axes remain fastest; heavy warhammers/tools deal strong chop damage;
 * all other tools/weapons/hands deal at least 1-2 damage per swing.
 */
export function computeTreeChopPower(equippedTool: ItemDefinition | null | undefined): number {
  if (!equippedTool) return 1;
  if (equippedTool.preferredResource === 'wood') {
    return Math.max(2, equippedTool.gatherPower || 3);
  }
  if (equippedTool.weaponClass === 'blunt_heavy' || (equippedTool.attackDamage ?? 0) >= 35) {
    return 3;
  }
  if (
    (equippedTool.gatherPower ?? 0) >= 2 ||
    (equippedTool.attackDamage ?? 0) >= 18 ||
    equippedTool.category === 'tool' ||
    equippedTool.category === 'weapon'
  ) {
    return 2;
  }
  return 1;
}

export interface TreeFallPose {
  axisX: number;
  axisZ: number;
  tiltRad: number;
  dropY: number;
  sinkScale: number;
  impacted: boolean;
}

/**
 * Computes a gimbal-free local-space hinge axis and physically eased gravity/bounce/settle
 * pose for a falling tree given world fall direction (fallDirX, fallDirZ), root Y yaw, and
 * normalized animation progress [0..1].
 */
export function computeTreeFallPose(
  fallDirX: number,
  fallDirZ: number,
  rootYaw: number,
  progress: number,
): TreeFallPose {
  const dirLen = Math.hypot(fallDirX, fallDirZ);
  const fdx = dirLen > 1e-5 ? fallDirX / dirLen : 1;
  const fdz = dirLen > 1e-5 ? fallDirZ / dirLen : 0;

  // Transform world fall vector into handle.root local XZ space (inverse of rotation.y = rootYaw)
  const cy = Math.cos(rootYaw);
  const sy = Math.sin(rootYaw);
  const lx = fdx * cy - fdz * sy;
  const lz = fdx * sy + fdz * cy;

  // Hinge axis A_local such that A_local x (0, 1, 0) = (lx, 0, lz) => (lz, 0, -lx)
  const axisLen = Math.hypot(lz, -lx);
  const axisX = axisLen > 1e-5 ? lz / axisLen : 0;
  const axisZ = axisLen > 1e-5 ? -lx / axisLen : -1;

  const p = Math.max(0, Math.min(1, progress));
  const impactAngle = Math.PI / 2.06; // ~87.4 deg so trunk & crown rest naturally along terrain

  if (p < TREE_FALL_IMPACT_FRACTION) {
    const u = p / TREE_FALL_IMPACT_FRACTION;
    // Accelerating rotational gravity as the notched hinge snaps
    const gravityCurve = 0.22 * u * u + 0.78 * u * u * u;
    return {
      axisX,
      axisZ,
      tiltRad: gravityCurve * impactAngle,
      dropY: -0.04 * u * u,
      sinkScale: 1,
      impacted: false,
    };
  }

  if (p < 0.84) {
    const b = (p - TREE_FALL_IMPACT_FRACTION) / (0.84 - TREE_FALL_IMPACT_FRACTION);
    // Elastic limb & ground rebound bounce upon impact
    const bounce = Math.sin(b * Math.PI) * 0.095 * (1 - 0.45 * b);
    return {
      axisX,
      axisZ,
      tiltRad: impactAngle - bounce,
      dropY: -0.04 - 0.05 * b,
      sinkScale: 1,
      impacted: true,
    };
  }

  // Final settle & smooth fade-sink into forest floor so felled log never pops out abruptly
  const s = (p - 0.84) / 0.16;
  const sinkPhase = Math.max(0, (s - 0.35) / 0.65);
  return {
    axisX,
    axisZ,
    tiltRad: impactAngle,
    dropY: -0.09 - sinkPhase * 0.36,
    sinkScale: sinkPhase > 0 ? Math.max(0.02, 1 - sinkPhase * 0.98) : 1,
    impacted: true,
  };
}

export function canCollectPickupWithinRange(
  pickup: { collected: boolean; x: number; y: number; z: number },
  playerX: number,
  playerY: number,
  playerZ: number,
  maxHorizontalDist: number,
  maxVerticalDist = 3.2,
): boolean {
  if (pickup.collected) return false;
  if (
    !Number.isFinite(pickup.x) ||
    !Number.isFinite(pickup.y) ||
    !Number.isFinite(pickup.z)
  ) {
    return false;
  }
  const dy = Math.abs(pickup.y - playerY);
  if (dy > maxVerticalDist) return false;
  const dx = pickup.x - playerX;
  const dz = pickup.z - playerZ;
  return dx * dx + dz * dz <= maxHorizontalDist * maxHorizontalDist;
}
