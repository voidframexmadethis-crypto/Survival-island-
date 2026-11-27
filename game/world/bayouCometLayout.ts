import * as THREE from 'three';
import type { CoasterSegmentKind, SavedCoasterData, SavedCoasterNode } from '../types';
import { getTerrainSurfaceHeight } from './terrain';

/**
 * BAYOU COMET — the island's second walk-up coaster, sited on the far southern
 * Louisiana landmass.
 *
 * The world's playable radius is 2,380 m, so a literal 5,500-yard (5,029 m)
 * separation is outside the map. This site is 1,616 m from VOLCANO FLEX
 * (~1,767 yd / 5,300 ft), the greatest practical separation on solid ground.
 * It faces west along the bayou, with the spike towers tucked into the marsh.
 */
export const BAYOU_COMET_ID = 'bayou_comet';
export const BAYOU_COMET_NAME = 'BAYOU COMET';
export const BAYOU_COMET_THEME_TAG = 'bayou_comet';
export const BAYOU_COMET_LAYOUT_TAG = 'bayou_comet_switchback_v1_boarding';
export const BAYOU_COMET_HEIGHT_M = 42;

/** Same governed envelope as the island's first coaster (72 km/h). */
export const BAYOU_COMET_MAX_SPEED_MPS = 20;
export const BAYOU_COMET_STATION_SPEED_MPS = 2.4;
export const BAYOU_COMET_LAUNCH_TARGET_MPS = 15.5;
export const BAYOU_COMET_BRAKE_TARGET_MPS = 3.5;

export const BAYOU_COMET_SITE = {
  x: 260,
  z: 1800,
  /** World rotation of the station structure (track runs west). */
  yaw: Math.PI / 2,
} as const;

export function getBayouCometSite() {
  const ground = getTerrainSurfaceHeight(BAYOU_COMET_SITE.x, BAYOU_COMET_SITE.z);
  return {
    station: {
      x: BAYOU_COMET_SITE.x,
      y: ground,
      z: BAYOU_COMET_SITE.z,
      yaw: BAYOU_COMET_SITE.yaw,
    },
    ground,
  };
}

export interface BayouTunnel {
  /** World-space centreline of the tunnel bore. */
  points: { x: number; y: number; z: number }[];
  radius: number;
}

function smoothstep(t: number): number {
  const v = Math.max(0, Math.min(1, t));
  return v * v * (3 - 2 * v);
}

const STATION = getBayouCometSite();
const GROUND = STATION.ground;

/** Local (station frame) -> world. Local +Z points west, local +X north. */
function toWorld(node: SavedCoasterNode): SavedCoasterNode {
  return {
    ...node,
    position: {
      x: BAYOU_COMET_SITE.x - node.position.z,
      y: GROUND + node.position.y,
      z: BAYOU_COMET_SITE.z + node.position.x,
    },
  };
}

/**
 * Appends an element authored along local +Z, rotating it by the running
 * heading. Bank is authored absolutely from the horizon, matching the frame
 * builder used by the island coaster runtime.
 */
class TrackBuilder {
  nodes: SavedCoasterNode[] = [];
  x = 0;
  y = 1.35;
  z = 0;
  heading = 0;
  /** Carries full-roll bank so adjacent elements never unwind 360 degrees. */
  bankBase = 0;

  constructor() {
    this.nodes.push({
      position: { x: 0, y: this.y, z: 0 },
      bank: 0,
      segmentType: 'station',
      targetSpeed: BAYOU_COMET_STATION_SPEED_MPS,
    });
  }

  private append(
    piece: SavedCoasterNode[],
    netHeading: number,
    options: { skipFirst?: boolean } = {},
  ): void {
    const cos = Math.cos(this.heading);
    const sin = Math.sin(this.heading);
    const start = this.nodes.length === 0 ? 0 : 1;
    let last = { x: this.x, y: this.y, z: this.z };
    let lastBank = this.bankBase;
    for (let i = options.skipFirst ? 0 : start; i < piece.length; i++) {
      const n = piece[i];
      const x = this.x + n.position.x * cos + n.position.z * sin;
      const z = this.z - n.position.x * sin + n.position.z * cos;
      const y = this.y + n.position.y;
      lastBank = this.bankBase + n.bank;
      this.nodes.push({
        position: { x, y, z },
        bank: lastBank,
        segmentType: n.segmentType,
        targetSpeed: n.targetSpeed,
        frameMode: n.frameMode,
      });
      last = { x, y, z };
    }
    this.x = last.x;
    this.y = last.y;
    this.z = last.z;
    this.bankBase = lastBank;
    this.heading += netHeading;
  }

  straight(
    length: number,
    segmentType: CoasterSegmentKind = 'coast',
    targetSpeed?: number,
  ): void {
    this.append([
      ...Array.from({ length: 5 }, (_, i) => ({
        position: { x: 0, y: 0, z: (i / 4) * length },
        bank: 0,
        segmentType: i === 0 ? 'coast' : segmentType,
        targetSpeed,
      })),
    ], 0);
  }

  /** Smoothly graded straight; both ends are level so it blends into joins. */
  slope(
    length: number,
    rise: number,
    segmentType: CoasterSegmentKind = 'coast',
    targetSpeed?: number,
    steps = 10,
  ): void {
    this.append(
      Array.from({ length: steps + 1 }, (_, i) => {
        const t = i / steps;
        return {
          position: { x: 0, y: rise * smoothstep(t), z: t * length },
          bank: 0,
          segmentType: i === 0 ? 'coast' : segmentType,
          targetSpeed,
        } satisfies SavedCoasterNode;
      }),
      0,
    );
  }

  /** A shallow S-shaped transfer siding. */
  switchSiding(length: number, lateral: number): void {
    this.append(
      Array.from({ length: 17 }, (_, i) => {
        const t = i / 16;
        return {
          position: { x: lateral * smoothstep(t), y: 0, z: t * length },
          bank: 0,
          segmentType: i === 0 ? 'coast' : 'station',
          targetSpeed: 3,
        } satisfies SavedCoasterNode;
      }),
      0,
    );
  }

  /**
   * A 180-degree hairpin. `direction` mirrors the arc so every switchback leg
   * shifts to the same side of the plot: away from the station. Without the
   * mirror the reversed leg would fold back across the outbound track.
   */
  hairpin(radius: number, bankAngle: number, direction: 1 | -1 = 1, steps = 26): void {
    this.append(
      Array.from({ length: steps + 1 }, (_, i) => {
        const t = i / steps;
        const theta = t * Math.PI;
        return {
          position: {
            x: -direction * radius * (1 - Math.cos(theta)),
            y: 0,
            z: radius * Math.sin(theta),
          },
          bank: direction * bankAngle * Math.pow(Math.sin(Math.PI * t), 2),
          segmentType: 'coast',
        } satisfies SavedCoasterNode;
      }),
      Math.PI,
    );
  }

  /**
   * A powered launch spike: climb, a wide hairpin at the crest, and a gravity
   * drop. It reproduces the ride's signposted out-and-back spike without
   * reversing the train's direction on the same piece of track.
   */
  spike(
    height: number,
    climbLength: number,
    topRadius: number,
    dropLength: number,
    topBank: number,
    poweredTarget: number,
    direction: 1 | -1 = 1,
  ): void {
    const startY = this.y;
    const rise = height - startY;
    this.slope(climbLength, rise, 'lsm_launch', poweredTarget, 16);
    this.hairpin(topRadius, topBank, direction);
    this.slope(dropLength, 6 - this.y, 'coast', undefined, 16);
  }

  hill(height: number, length: number, bank = 0, segmentType: CoasterSegmentKind = 'coast'): void {
    // Level run-ins keep the Catmull-Rom from overshooting into a V-shaped
    // valley where the hill meets the preceding element.
    const runIn = 4;
    const runOut = 4;
    const total = runIn + length + runOut;
    this.append(
      Array.from({ length: 25 }, (_, i) => {
        const t = i / 24;
        const z = t * total;
        const u = (z - runIn) / length;
        const profile = u > 0 && u < 1 ? Math.pow(Math.sin(Math.PI * u), 2) : 0;
        return {
          position: { x: 0, y: height * profile, z },
          bank: bank * profile,
          segmentType: i === 0 ? 'coast' : segmentType,
        } satisfies SavedCoasterNode;
      }),
      0,
    );
  }

  preset(
    nodes: SavedCoasterNode[],
    netHeading = 0,
  ): void {
    this.append(nodes, netHeading);
  }

  corkscrew(length = 28): void {
    // A barrel-roll corkscrew around a straight centreline. The old lateral
    // helix preset folded back on itself at the ends, producing an 80 g tangent
    // spike when taken at launch speed. A straight-bore barrel roll reads the
    // same from the train and stays smooth.
    this.preset(
      Array.from({ length: 29 }, (_, i) => {
        const t = i / 28;
        return {
          position: {
            x: 0,
            y: 1.5 * Math.pow(Math.sin(Math.PI * t), 2),
            z: t * length,
          },
          bank: 360 * smoothstep(t),
          segmentType: 'inversion',
        } satisfies SavedCoasterNode;
      }),
    );
  }

  verticalLoop(radius = 8): void {
    this.append(
      Array.from({ length: 73 }, (_, i) => {
        const t = i / 72;
        const a = t * Math.PI * 2;
        return {
          position: {
            x: -2.6 * smoothstep(t),
            y: radius * (1 - Math.cos(a)),
            // A small smooth forward advance keeps the up/down legs clear of
            // each other without introducing a cusp at the apex.
            z: radius * Math.sin(a) + radius * 1.5 * smoothstep(t),
          },
          bank: 0,
          segmentType: 'inversion',
          frameMode: 'loop',
        } satisfies SavedCoasterNode;
      }),
      0,
    );
  }

  diveLoop(radius = 8, drop = 2): void {
    this.slope(12, -drop, 'coast');
    this.straight(4);
    this.verticalLoop(radius);
    this.straight(4);
    this.slope(12, drop, 'lsm_launch', 14);
  }

  /** A huge banked overbank with a whippy lateral S. */
  overbank(length: number, bank: number): void {
    this.append(
      Array.from({ length: 17 }, (_, i) => {
        const t = i / 16;
        return {
          position: {
            x: 3.4 * Math.sin(Math.PI * 2 * t) * Math.sin(Math.PI * t),
            y: 0,
            z: t * length,
          },
          bank: bank * Math.pow(Math.sin(Math.PI * t), 2),
          segmentType: 'coast',
        } satisfies SavedCoasterNode;
      }),
      0,
    );
  }

  /** A 180-degree banked hairpin that rolls fully inverted and upright again. */
  flipTurn(radius: number, bankAngle = 180, direction: 1 | -1 = 1): void {
    this.append(
      Array.from({ length: 33 }, (_, i) => {
        const t = i / 32;
        const theta = t * Math.PI;
        return {
          position: {
            x: -direction * radius * (1 - Math.cos(theta)),
            y: 0,
            z: radius * Math.sin(theta),
          },
          bank: direction * bankAngle * smoothstep(t),
          segmentType: 'inversion',
        } satisfies SavedCoasterNode;
      }),
      Math.PI,
    );
  }

  /** Rise, a half roll through an inverted crest, and a fall back to level. */
  invertedTopHat(rise: number, length: number): void {
    this.append(
      Array.from({ length: 25 }, (_, i) => {
        const t = i / 24;
        const z = t * length;
        let y = 0;
        let bank = 0;
        if (t < 0.32) {
          y = rise * smoothstep(t / 0.32);
          bank = 90 * smoothstep(t / 0.32);
        } else if (t < 0.68) {
          const u = (t - 0.32) / 0.36;
          y = rise;
          bank = 90 + 180 * smoothstep(u);
        } else {
          const u = (t - 0.68) / 0.32;
          y = rise * (1 - smoothstep(u));
          bank = 270 + 90 * smoothstep(u);
        }
        return {
          position: { x: 0, y, z },
          bank,
          segmentType: 'inversion',
        } satisfies SavedCoasterNode;
      }),
      0,
    );
  }

  /** Outward-turning right/left transition used before the final hills. */
  outwardTurn(length: number): void {
    this.append(
      Array.from({ length: 17 }, (_, i) => {
        const t = i / 16;
        return {
          position: {
            x: 2.2 * Math.sin(Math.PI * 2 * t) * Math.sin(Math.PI * t),
            y: 0,
            z: t * length,
          },
          bank: -42 * Math.pow(Math.sin(Math.PI * t), 2),
          segmentType: 'coast',
        } satisfies SavedCoasterNode;
      }),
      0,
    );
  }

  brake(length: number): void {
    this.append(
      Array.from({ length: 5 }, (_, i) => ({
        position: { x: 0, y: 0, z: (i / 4) * length },
        bank: 0,
        segmentType: i === 0 ? 'coast' : ('trim_brake' as CoasterSegmentKind),
        targetSpeed: BAYOU_COMET_BRAKE_TARGET_MPS,
      })),
      0,
    );
  }

  close(): void {
    const end = new THREE.Vector3(this.x, this.y, this.z);
    // A level transfer loop that stays south of every element, returns east,
    // then approaches the station from behind. Centripetal parameterisation
    // avoids the overshoot/cusp a uniform Catmull-Rom gave at the tight bend.
    const curve = new THREE.CatmullRomCurve3(
      [
        end,
        new THREE.Vector3(end.x, end.y - 0.4, end.z - 12),
        new THREE.Vector3(end.x + 4, end.y - 1.0, end.z - 24),
        new THREE.Vector3(end.x + 14, end.y - 1.4, end.z - 30),
        new THREE.Vector3(end.x + 38, end.y - 1.8, end.z - 32),
        new THREE.Vector3(end.x + 78, end.y - 2.1, end.z - 32),
        new THREE.Vector3(end.x + 118, end.y - 2.4, end.z - 32),
        new THREE.Vector3(end.x + 130, end.y - 2.6, end.z - 30),
        new THREE.Vector3(end.x + 136, end.y - 3.0, end.z - 24),
        new THREE.Vector3(end.x + 138, end.y - 3.6, end.z - 12),
        new THREE.Vector3(end.x + 138, end.y - 4.4, end.z + 8),
        new THREE.Vector3(end.x + 138, end.y - 5.0, end.z + 18),
        new THREE.Vector3(end.x + 138, end.y - 5.25, end.z + 26),
        new THREE.Vector3(0, 1.35, -20),
        new THREE.Vector3(0, 1.35, -16),
        new THREE.Vector3(0, 1.35, -12),
      ],
      false,
      'centripetal',
    );
    const steps = 130;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const p = curve.getPoint(t);
      const nearStation = t > 0.93;
      this.nodes.push({
        // Never dip below the platform grade on the final approach, even if
        // the spline overshoots slightly between control points.
        position: { x: p.x, y: Math.max(1.35, p.y), z: p.z },
        bank: this.bankBase,
        segmentType: nearStation ? 'station' : 'block_brake',
        targetSpeed: nearStation ? BAYOU_COMET_STATION_SPEED_MPS : 6,
      });
    }
    // The spline can overshoot laterally where its last control points bunch
    // up. Finish with an explicit straight so the docking approach and the
    // closed-loop seam are exactly collinear.
    for (let z = -10; z <= 0; z += 2) {
      this.nodes.push({
        position: { x: 0, y: 1.35, z },
        bank: this.bankBase,
        segmentType: 'station',
        targetSpeed: BAYOU_COMET_STATION_SPEED_MPS,
      });
    }
    const last = this.nodes[this.nodes.length - 1];
    last.position.x = 0;
    last.position.y = 1.35;
    last.position.z = 0;
    last.segmentType = 'station';
    last.targetSpeed = BAYOU_COMET_STATION_SPEED_MPS;
  }
}

/**
 * The circuit, in ride order:
 * station siding -> switch -> launch -> low spike -> launch hill -> tall
 * powered spike -> corkscrew -> tunnel -> whippy banked turn -> barrel roll ->
 * overbank -> speed hills -> dive loop tunnel -> big turn -> twisted airtime ->
 * vertical loop -> inverted top hat -> half flip -> outward/right transition ->
 * two airtime hills -> two corkscrews -> brake run -> transfer back to station.
 */
export function buildBayouCometNodes(): SavedCoasterNode[] {
  const b = new TrackBuilder();
  b.straight(16, 'station', BAYOU_COMET_STATION_SPEED_MPS);
  b.switchSiding(14, -3.5);
  b.slope(30, 1.5, 'lsm_launch', BAYOU_COMET_LAUNCH_TARGET_MPS);
  b.spike(26, 44, 13, 44, 36, 11);
  b.hill(5, 18);
  b.spike(42, 48, 13, 48, 32, 10.5, -1);
  b.corkscrew(28);
  b.slope(18, -1.5, 'trim_brake', 13);
  b.straight(16, 'trim_brake', 13);
  b.hairpin(13, 55, 1);
  b.straight(10, 'lsm_launch', 17);
  b.preset(
    Array.from({ length: 31 }, (_, i) => {
      const t = i / 30;
      return {
        position: {
          x: 0,
          y: 9 * Math.pow(Math.sin(Math.PI * t), 2),
          z: t * 30,
        },
        bank: 360 * smoothstep(t),
        segmentType: 'inversion',
      } satisfies SavedCoasterNode;
    }),
  );
  b.overbank(24, 76);
  b.hill(6, 22);
  b.hill(4, 18);
  b.straight(10, 'lsm_launch', 17);
  b.diveLoop(6.5, 2);
  b.hairpin(14, 48, -1);
  b.straight(10, 'lsm_launch', 18);
  // Twisted airtime hill.
  b.preset(
    Array.from({ length: 31 }, (_, i) => {
      const t = i / 30;
      return {
        position: {
          x: 0,
          y: 8 * Math.pow(Math.sin(Math.PI * t), 2),
          z: t * 30,
        },
        bank: 360 * smoothstep(t),
        segmentType: 'inversion',
      } satisfies SavedCoasterNode;
    }),
  );
  b.straight(10, 'lsm_launch', 17);
  b.verticalLoop(6.5);
  b.straight(8, 'lsm_launch', 18);
  b.invertedTopHat(16, 60);
  // Let the steep drop settle through a shallow transition instead of a
  // V-shaped valley right at the element join.
  b.slope(12, -1.2, 'coast');
  b.straight(6);
  // A 180-degree hairpin plus a 180-degree roll (the half flip).
  b.flipTurn(14, 360);
  b.straight(6);
  b.outwardTurn(20);
  b.hill(10, 34);
  b.hill(8, 30);
  b.corkscrew(24);
  b.corkscrew(24);
  b.brake(18);
  b.close();

  return b.nodes.map(toWorld);
}

export function buildBayouCometCoasterData(): SavedCoasterData {
  const site = getBayouCometSite();
  return {
    id: BAYOU_COMET_ID,
    name: BAYOU_COMET_NAME,
    trackColor: '#0f766e',
    trainCarCount: 5,
    stationPos: { x: site.station.x, y: site.station.y, z: site.station.z },
    nodes: buildBayouCometNodes(),
    pieceTags: [
      BAYOU_COMET_ID,
      BAYOU_COMET_THEME_TAG,
      'themed',
      'switch_track',
      'launch_spikes',
      'tunnels',
      'multi_inversion',
      BAYOU_COMET_LAYOUT_TAG,
    ],
    closedCircuit: true,
    coasterType: 'air_launch_wide',
  };
}

/** Tunnel bores, in world space, used by the themed environment builder. */
export function getBayouCometTunnels(): BayouTunnel[] {
  const nodes = buildBayouCometNodes();
  const byWorld = (x0: number, z0: number, x1: number, z1: number) =>
    nodes.filter((n) => {
      const { x, z } = n.position;
      return (
        x >= Math.min(x0, x1) - 2 &&
        x <= Math.max(x0, x1) + 2 &&
        z >= Math.min(z0, z1) - 2 &&
        z <= Math.max(z0, z1) + 2
      );
    });
  const station = getBayouCometSite().station;
  const tunnels: BayouTunnel[] = [
    {
      // The straight tunnel on the second pass, west of the corkscrew.
      points: byWorld(station.x - 112, station.z - 56, station.x - 78, station.z - 56).map(
        (n) => n.position,
      ),
      radius: 4.4,
    },
    {
      // The dive-loop tunnel on the third pass.
      points: byWorld(station.x - 24, station.z - 83, station.x + 48, station.z - 79).map(
        (n) => n.position,
      ),
      radius: 5.4,
    },
  ].filter((t) => t.points.length >= 2);
  return tunnels;
}
