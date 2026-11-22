import { createBlankProject, makePoint, vec } from './track';
import type { CoasterProject, TrackPointKind } from './types';

/**
 * Test-only layout used to exercise spline, physics and storage code. It is
 * deliberately not imported by the studio, so the Creative environment always
 * starts with an empty station and every production coaster is player-built.
 */
export function createTestLayoutProject(): CoasterProject {
  const base = createBlankProject('Test Circuit');
  const coords: [number, number, number, TrackPointKind, number][] = [
    [0, 5, 0, 'station', 0],
    [0, 5, 7, 'station', 0],
    [0, 8, 17, 'chain_lift', 0],
    [0, 20, 43, 'chain_lift', 0],
    [0, 26, 57, 'chain_lift', 0],
    [0, 24, 66, 'track', 0],
    [3, 14, 77, 'track', 20],
    [15, 8, 84, 'track', 28],
    [29, 16, 79, 'track', 36],
    [37, 21, 67, 'track', 30],
    [41, 13, 51, 'track', 24],
    [39, 19, 36, 'track', 28],
    [29, 21, 24, 'track', 18],
    [16, 18, 15, 'track', 10],
    [7, 9, 5, 'brake', 0],
    [2, 6, -2, 'station', 0],
  ];
  return {
    ...base,
    name: 'Test Circuit',
    closed: true,
    editingMode: 'advanced',
    points: coords.map(([x, y, z, kind, bank]) => makePoint(vec(x, y, z), kind, bank)),
  };
}
