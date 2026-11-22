export interface CaveTerrainOpening {
  x: number;
  z: number;
  radius: number;
}

interface PositionLike {
  count: number;
  getX(index: number): number;
  getY(index: number): number;
  getZ(index: number): number;
}

function pointInTriangle2D(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number,
  cx: number,
  cz: number,
): boolean {
  const d1 = (px - bx) * (az - bz) - (ax - bx) * (pz - bz);
  const d2 = (px - cx) * (bz - cz) - (bx - cx) * (pz - cz);
  const d3 = (px - ax) * (cz - az) - (cx - ax) * (pz - az);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

function distSqToSegment2D(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number,
): number {
  const abx = bx - ax;
  const abz = bz - az;
  const lengthSq = abx * abx + abz * abz;
  if (lengthSq < 1e-9) {
    const dx = px - ax;
    const dz = pz - az;
    return dx * dx + dz * dz;
  }
  const t = Math.max(0, Math.min(1, ((px - ax) * abx + (pz - az) * abz) / lengthSq));
  const qx = ax + abx * t;
  const qz = az + abz * t;
  const dx = px - qx;
  const dz = pz - qz;
  return dx * dx + dz * dz;
}

function triangleOverlapsCircle(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  cx: number,
  cz: number,
  ox: number,
  oz: number,
  radiusSq: number,
): boolean {
  if (pointInTriangle2D(ox, oz, ax, az, bx, bz, cx, cz)) return true;
  if (
    distSqToSegment2D(ox, oz, ax, az, bx, bz) <= radiusSq ||
    distSqToSegment2D(ox, oz, bx, bz, cx, cz) <= radiusSq ||
    distSqToSegment2D(ox, oz, cx, cz, ax, az) <= radiusSq
  ) {
    return true;
  }
  return false;
}

/**
 * Returns a triangle index with every terrain triangle that overlaps a cave
 * mouth removed. The remaining terrain is a genuine hole instead of a surface
 * sheet hidden behind a decorative arch. The caller can feed the result to
 * BufferGeometry.setIndex and restore the original index when caves unload.
 */
export function filterTerrainIndexForCaveOpenings(
  index: ArrayLike<number>,
  positions: PositionLike,
  openings: readonly CaveTerrainOpening[],
): number[] {
  const triangleCount = Math.floor(index.length / 3);
  const kept: number[] = [];
  if (openings.length === 0) {
    for (let i = 0; i < index.length; i++) kept.push(index[i]);
    return kept;
  }

  const active = openings.filter(
    (opening) =>
      Number.isFinite(opening.x) &&
      Number.isFinite(opening.z) &&
      Number.isFinite(opening.radius) &&
      opening.radius > 0,
  );
  if (active.length === 0) {
    for (let i = 0; i < index.length; i++) kept.push(index[i]);
    return kept;
  }

  const removed = new Uint8Array(triangleCount);
  for (let tri = 0; tri < triangleCount; tri++) {
    const ia = index[tri * 3];
    const ib = index[tri * 3 + 1];
    const ic = index[tri * 3 + 2];
    if (ia >= positions.count || ib >= positions.count || ic >= positions.count) continue;
    const ax = positions.getX(ia);
    const az = positions.getZ(ia);
    const bx = positions.getX(ib);
    const bz = positions.getZ(ib);
    const cx = positions.getX(ic);
    const cz = positions.getZ(ic);

    const minX = Math.min(ax, bx, cx);
    const maxX = Math.max(ax, bx, cx);
    const minZ = Math.min(az, bz, cz);
    const maxZ = Math.max(az, bz, cz);

    for (let oi = 0; oi < active.length; oi++) {
      const opening = active[oi];
      const r = opening.radius;
      if (
        opening.x + r < minX ||
        opening.x - r > maxX ||
        opening.z + r < minZ ||
        opening.z - r > maxZ
      ) {
        continue;
      }
      if (
        triangleOverlapsCircle(
          ax,
          az,
          bx,
          bz,
          cx,
          cz,
          opening.x,
          opening.z,
          r * r,
        )
      ) {
        removed[tri] = 1;
        break;
      }
    }
  }

  for (let tri = 0; tri < triangleCount; tri++) {
    if (removed[tri]) continue;
    kept.push(index[tri * 3], index[tri * 3 + 1], index[tri * 3 + 2]);
  }
  return kept;
}
