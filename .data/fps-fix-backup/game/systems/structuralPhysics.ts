import { StructuralBlock, StructuralBlockKind } from '../types';
import { getTerrainHeight } from '../world/terrain';

export const STRUCT_GRID_XZ = 2.4;
export const STRUCT_GRID_Y = 2.0;

export interface StructuralMaterialSpec {
  kind: StructuralBlockKind;
  name: string;
  mass: number;
  width: number;
  height: number;
  depth: number;
  isPillar: boolean;
  isArch: boolean;
  verticalCapacity: number; // Max stacked dead-load tonnage per pillar
  horizontalSpanLimit: number; // Safe horizontal hops without support pillar/arch
  archLoadMultiplier: number; // Multiplier on span penalty when stepping across archways
  walkableTop: boolean;
}

export const STRUCTURAL_SPECS: Record<StructuralBlockKind, StructuralMaterialSpec> = {
  stone_block: {
    kind: 'stone_block',
    name: 'Stone Masonry Block',
    mass: 3.2,
    width: 2.4,
    height: 2.0,
    depth: 2.4,
    isPillar: false,
    isArch: false,
    verticalCapacity: 18,
    horizontalSpanLimit: 2.0, // >2 horizontal spans without pillar/arch -> overload & collapse!
    archLoadMultiplier: 1.0,
    walkableTop: true,
  },
  stone_pillar: {
    kind: 'stone_pillar',
    name: 'Load-Bearing Stone Pillar',
    mass: 2.6,
    width: 1.2,
    height: 2.0,
    depth: 1.2,
    isPillar: true,
    isArch: false,
    verticalCapacity: 32, // Carries tall cliffside fortresses & bridge piers
    horizontalSpanLimit: 1.4,
    archLoadMultiplier: 1.0,
    walkableTop: true,
  },
  stone_arch: {
    kind: 'stone_arch',
    name: 'Keystone Stone Archway',
    mass: 2.4,
    width: 2.4,
    height: 2.0,
    depth: 2.4,
    isPillar: false,
    isArch: true,
    verticalCapacity: 24,
    horizontalSpanLimit: 5.0, // Engineered compression arch spans wide river/canyon bridges safely!
    archLoadMultiplier: 0.36,
    walkableTop: true,
  },
  timber_beam: {
    kind: 'timber_beam',
    name: 'Timber Bridge Span',
    mass: 1.25,
    width: 2.4,
    height: 2.0,
    depth: 2.4,
    isPillar: false,
    isArch: false,
    verticalCapacity: 9,
    horizontalSpanLimit: 2.6, // Lighter than stone, buckles if heavy masonry is stacked atop it
    archLoadMultiplier: 0.9,
    walkableTop: true,
  },
  timber_pillar: {
    kind: 'timber_pillar',
    name: 'Timber Support Post',
    mass: 1.0,
    width: 0.9,
    height: 2.0,
    depth: 0.9,
    isPillar: true,
    isArch: false,
    verticalCapacity: 15,
    horizontalSpanLimit: 1.2,
    archLoadMultiplier: 1.0,
    walkableTop: true,
  },
};

export function gridToWorld(gx: number, gy: number, gz: number): { x: number; y: number; z: number } {
  return {
    x: gx * STRUCT_GRID_XZ,
    y: gy * STRUCT_GRID_Y,
    z: gz * STRUCT_GRID_XZ,
  };
}

export function worldToGrid(x: number, y: number, z: number): { gx: number; gy: number; gz: number } {
  return {
    gx: Math.round(x / STRUCT_GRID_XZ),
    gy: Math.round(y / STRUCT_GRID_Y),
    gz: Math.round(z / STRUCT_GRID_XZ),
  };
}

function cellKey(gx: number, gy: number, gz: number): string {
  return `${gx},${gy},${gz}`;
}

/**
 * Checks whether a block at world (x, y, z) is physically anchored into solid earth or a cliff wall.
 */
export function isBlockAnchoredToTerrain(x: number, y: number, z: number): boolean {
  const groundY = getTerrainHeight(x, z);
  // Bottom footing touches or sits embedded in solid ground
  if (groundY >= y - 0.55) return true;

  // Cliff-face anchor: adjacent high terrain wall embeds horizontally into this block
  const probes: [number, number][] = [
    [STRUCT_GRID_XZ * 0.68, 0],
    [-STRUCT_GRID_XZ * 0.68, 0],
    [0, STRUCT_GRID_XZ * 0.68],
    [0, -STRUCT_GRID_XZ * 0.68],
  ];
  for (let i = 0; i < probes.length; i++) {
    const ph = getTerrainHeight(x + probes[i][0], z + probes[i][1]);
    if (ph >= y + 0.65) {
      return true;
    }
  }
  return false;
}

/**
 * Full structural engineering solver:
 * Evaluates ground/cliff footings, vertical compression columns, keystone arch thrust paths,
 * and cantilevered bending/shear overload stress across all structural blocks.
 * Blocks exceeding stress >= 1.0 enter buckling/collapse!
 */
export function solveStructuralIntegrity(blocks: StructuralBlock[]): {
  maxStress: number;
  overloadedIds: string[];
} {
  if (blocks.length === 0) {
    return { maxStress: 0, overloadedIds: [] };
  }

  const byKey = new Map<string, StructuralBlock>();
  for (const b of blocks) {
    byKey.set(cellKey(b.gx, b.gy, b.gz), b);
  }

  // Distance/cost from nearest bedrock/ground/cliff anchor
  const costMap = new Map<string, number>();
  const hopMap = new Map<string, number>();
  const queue: StructuralBlock[] = [];

  for (const b of blocks) {
    const anchored = isBlockAnchoredToTerrain(b.x, b.y, b.z);
    b.anchored = anchored;
    if (anchored) {
      const k = cellKey(b.gx, b.gy, b.gz);
      costMap.set(k, 0);
      hopMap.set(k, 0);
      queue.push(b);
    }
  }

  // Shortest weighted load path (Dijkstra-style BFS over 6-neighborhood)
  const dirs: [number, number, number][] = [
    [0, 1, 0],
    [0, -1, 0],
    [1, 0, 0],
    [-1, 0, 0],
    [0, 0, 1],
    [0, 0, -1],
  ];

  while (queue.length > 0) {
    // Pop lowest-cost element
    let bestIdx = 0;
    let bestCost = costMap.get(cellKey(queue[0].gx, queue[0].gy, queue[0].gz)) ?? 999;
    for (let i = 1; i < queue.length; i++) {
      const c = costMap.get(cellKey(queue[i].gx, queue[i].gy, queue[i].gz)) ?? 999;
      if (c < bestCost) {
        bestCost = c;
        bestIdx = i;
      }
    }
    const curr = queue[bestIdx];
    queue.splice(bestIdx, 1);

    const currKey = cellKey(curr.gx, curr.gy, curr.gz);
    const currCost = costMap.get(currKey) ?? 999;
    const currHops = hopMap.get(currKey) ?? 99;
    const currSpec = STRUCTURAL_SPECS[curr.kind];

    for (let d = 0; d < dirs.length; d++) {
      const ngx = curr.gx + dirs[d][0];
      const ngy = curr.gy + dirs[d][1];
      const ngz = curr.gz + dirs[d][2];
      const nKey = cellKey(ngx, ngy, ngz);
      const neighbor = byKey.get(nKey);
      if (!neighbor) continue;

      const nSpec = STRUCTURAL_SPECS[neighbor.kind];
      let stepCost = 1.0;

      if (dirs[d][1] === 1) {
        // Vertical step UP (compression column)
        if (currSpec.isPillar && nSpec.isPillar) {
          stepCost = 0.08; // Pillar stacked directly on grounded pillar transfers load straight down
        } else if (currSpec.isPillar || currSpec.isArch) {
          stepCost = 0.18;
        } else {
          // Stacking heavy walls on top of a flat deck adds significant strain if far from a pillar
          stepCost = currCost > 0.6 ? 0.95 : 0.28;
        }
      } else if (dirs[d][1] === -1) {
        // Hanging downward from above -> very weak in stone!
        stepCost = nSpec.isPillar ? 0.85 : 1.35;
      } else {
        // Horizontal cantilever / bridge span step
        if (nSpec.isArch || currSpec.isArch) {
          stepCost = 0.36; // Keystone stone arch transfers horizontal compression thrust cleanly!
        } else if (!nSpec.isPillar && currSpec.kind === 'timber_beam') {
          stepCost = 0.72; // Timber deck spans slightly lighter than heavy solid stone
        } else if (nSpec.isPillar && !neighbor.anchored) {
          // Floating pillar dangling sideways with no column below gives almost zero span benefit
          stepCost = 1.35;
        } else {
          stepCost = 1.0; // Unbraced horizontal stone overhang
        }
      }

      const nextCost = currCost + stepCost;
      const prevBest = costMap.get(nKey);
      if (prevBest === undefined || nextCost < prevBest - 0.001) {
        costMap.set(nKey, nextCost);
        hopMap.set(nKey, currHops + 1);
        queue.push(neighbor);
      }
    }
  }

  // Compute dead-load weight stacked atop each vertical column / span
  const columnMassAbove = new Map<string, number>();
  const sortedTopDown = [...blocks].sort((a, b) => b.gy - a.gy);
  for (const b of sortedTopDown) {
    const k = cellKey(b.gx, b.gy, b.gz);
    const spec = STRUCTURAL_SPECS[b.kind];
    const aboveKey = cellKey(b.gx, b.gy + 1, b.gz);
    const aboveMass = columnMassAbove.get(aboveKey) ?? 0;
    columnMassAbove.set(k, spec.mass + aboveMass);
  }

  let maxStress = 0;
  const overloadedIds: string[] = [];

  for (const b of blocks) {
    const k = cellKey(b.gx, b.gy, b.gz);
    const spec = STRUCTURAL_SPECS[b.kind];
    const pathCost = costMap.get(k);
    const hops = hopMap.get(k) ?? 99;
    b.supportHops = hops;

    if (pathCost === undefined) {
      // Completely disconnected floating structure -> immediate failure!
      b.stress = 1.85;
      maxStress = Math.max(maxStress, b.stress);
      overloadedIds.push(b.id);
      continue;
    }

    const totalStackMass = columnMassAbove.get(k) ?? spec.mass;
    const spanStress = pathCost / Math.max(1.2, spec.horizontalSpanLimit);
    const deadLoadRatio = totalStackMass / Math.max(4, spec.verticalCapacity);

    // Extra bending amplification when heavy loads sit atop an ungrounded horizontal overhang
    const cantileverFactor = !b.anchored && pathCost > 0.55 ? 1 + deadLoadRatio * 0.65 : 1.0;
    const combinedStress = b.anchored
      ? Math.min(0.92, deadLoadRatio * 0.55)
      : spanStress * cantileverFactor + deadLoadRatio * 0.25;

    b.stress = Math.round(combinedStress * 1000) / 1000;
    maxStress = Math.max(maxStress, b.stress);
    if (b.stress >= 1.0) {
      overloadedIds.push(b.id);
    }
  }

  return { maxStress, overloadedIds };
}

/**
 * Simulates placing a candidate block to preview live structural safety before building.
 */
export function previewBlockPlacementStress(
  existingBlocks: StructuralBlock[],
  candidate: Omit<StructuralBlock, 'id' | 'stress' | 'anchored' | 'supportHops' | 'bucklingTimer'>,
): { stress: number; anchored: boolean } {
  const clones: StructuralBlock[] = existingBlocks.map((b) => ({ ...b }));
  const testBlock: StructuralBlock = {
    ...candidate,
    id: '__preview__',
    stress: 0,
    anchored: false,
    supportHops: 0,
    bucklingTimer: 0,
  };
  clones.push(testBlock);
  solveStructuralIntegrity(clones);
  return {
    stress: testBlock.stress,
    anchored: testBlock.anchored,
  };
}
