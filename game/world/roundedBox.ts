import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/**
 * Structural geometry with softened edges.
 *
 * Survival Island's shelter and garage are built from slabs and wall panels.
 * A small bevel catches the sun instead of presenting knife-edge corners, so
 * the structures belong in the same curved, handmade world as the terrain and
 * vegetation without changing their collision footprints.
 */
export function roundedBox(
  width: number,
  height: number,
  depth: number,
  radius = 0.08,
  segments = 2,
): RoundedBoxGeometry {
  const limit = Math.min(Math.abs(width), Math.abs(height), Math.abs(depth)) * 0.45;
  const safeRadius = Math.max(0.005, Math.min(radius, limit));
  return new RoundedBoxGeometry(width, height, depth, Math.max(1, segments), safeRadius);
}
