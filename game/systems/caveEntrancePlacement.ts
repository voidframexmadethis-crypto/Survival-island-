import * as THREE from 'three';
import { getTerrainSurfaceHeight } from '../world/terrain';
import { getCaveEntranceYaw } from './islandCaveSystem';

/** How far the arch threshold is sunk under the rendered terrain at the cave centre. */
export const CAVE_ENTRANCE_SINK = 0.2;

/** Deepest pitch applied to an arch so it follows a hillside without looking toppled. */
export const CAVE_ENTRANCE_MAX_PITCH = 0.5;

/** Vertical sampling half-span used to measure the uphill grade. */
const SLOPE_SAMPLE_DISTANCE = 1.5;

/** Pier centres before the per-type scale (matches the pooled arch geometry). */
export const CAVE_PIER_CENTER_X = 1.3;
/** Local Y of the top of both piers, where they meet the lintel. */
export const CAVE_PIER_TOP_LOCAL_Y = 2.75;
/** Pooled pier box height. */
export const CAVE_PIER_HEIGHT = 2.8;

const _pierFoot = new THREE.Vector3();
const _pierTarget = new THREE.Vector3();

export interface CavePierFit {
  /** Local Y of the pier centre after stretching. */
  centerY: number;
  /** Stretched pier height in local units (never below the pooled 2.8). */
  height: number;
}

export interface CaveEntranceFit {
  /** Rotation about Y so the local -Z axis points uphill. */
  yaw: number;
  /** Rotation about local X so the portal leans with the hillside (positive raises uphill). */
  pitch: number;
  /** World Y for the arch group base at the cave site. */
  y: number;
}

function localToWorldXZ(
  x: number,
  z: number,
  yaw: number,
  localX: number,
  localZ: number,
): { x: number; z: number } {
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  return {
    x: x + localX * cos + localZ * sin,
    z: z - localX * sin + localZ * cos,
  };
}

/**
 * Fits an entrance arch to the rendered hillside:
 * - yaw turns the mouth downhill and the recess uphill,
 * - pitch matches the uphill grade (capped so the arch never looks toppled),
 * - y keeps the threshold and dark opening at the cave centre's ground level.
 *
 * Pier feet are fitted individually by the caller (`fitCavePierFoot`) so a
 * downhill jamb can reach the slope below without the opening sinking into the hillside.
 * Cave X/Z positions are untouched; this only changes how the entrance mesh sits.
 */
export function fitCaveEntrance(x: number, z: number): CaveEntranceFit {
  const yaw = getCaveEntranceYaw(x, z);

  const uphill = localToWorldXZ(x, z, yaw, 0, -SLOPE_SAMPLE_DISTANCE);
  const downhill = localToWorldXZ(x, z, yaw, 0, SLOPE_SAMPLE_DISTANCE);
  const rise =
    getTerrainSurfaceHeight(uphill.x, uphill.z) -
    getTerrainSurfaceHeight(downhill.x, downhill.z);
  const grade = rise / (SLOPE_SAMPLE_DISTANCE * 2);
  const pitch = Math.min(
    CAVE_ENTRANCE_MAX_PITCH,
    Math.max(0, Math.atan(grade)),
  );

  const y = getTerrainSurfaceHeight(x, z) - CAVE_ENTRANCE_SINK;
  return { yaw, pitch, y };
}

/**
 * Fits one jamb's foot to the rendered ground. Extending the pier changes where
 * its foot lands on a pitched arch, so re-sample a few times until it is seated.
 * `group.matrixWorld` must be current before calling.
 */
export function fitCavePierFoot(
  group: THREE.Object3D,
  side: -1 | 1,
): CavePierFit {
  let height = CAVE_PIER_HEIGHT;
  for (let attempt = 0; attempt < 4; attempt++) {
    _pierFoot
      .set(side * CAVE_PIER_CENTER_X, CAVE_PIER_TOP_LOCAL_Y - height, 0)
      .applyMatrix4(group.matrixWorld);
    const terrain = getTerrainSurfaceHeight(_pierFoot.x, _pierFoot.z);
    if (_pierFoot.y <= terrain - 0.1) break;
    _pierTarget.set(_pierFoot.x, terrain - 0.12, _pierFoot.z);
    group.worldToLocal(_pierTarget);
    height = Math.max(CAVE_PIER_HEIGHT, CAVE_PIER_TOP_LOCAL_Y - _pierTarget.y);
  }
  return { height, centerY: CAVE_PIER_TOP_LOCAL_Y - height / 2 };
}
