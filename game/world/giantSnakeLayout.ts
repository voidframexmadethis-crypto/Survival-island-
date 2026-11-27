import * as THREE from 'three';
import type { CoasterSegmentKind, SavedCoasterData, SavedCoasterNode } from '../types';
import { getTerrainSurfaceHeight } from './terrain';

/**
 * THE GIANT SNAKE — a single, continuous Intamin-inspired multi-launch
 * attraction on the far southern Louisiana landmass.
 *
 * Engineering notes:
 * - The station sits on the existing island platform spec. The train leaves
 *   over a sliding transfer siding, stalls on the first launch hill, reverses
 *   through the station and up the enormous return spike, then relaunches over
 *   the top hat into the main circuit. The runtime scripts that swing launch
 *   from the four survey markers exported below.
 * - The main loop closes through the station. The 46 m swing spike is a
 *   separate dead-end spur beside the transfer table and is never joined back
 *   into the circuit; the runtime scripts the train up and down it.
 * - Heights and speeds follow a 46 m / 119 km/h modern launch-coaster envelope.
 */
export const GIANT_SNAKE_ID = 'giant_snake';
export const GIANT_SNAKE_NAME = 'THE GIANT SNAKE';
export const GIANT_SNAKE_THEME_TAG = 'giant_snake';
export const GIANT_SNAKE_LAYOUT_TAG = 'giant_snake_swing_v2';
export const GIANT_SNAKE_HEIGHT_M = 46;

/** Modern multi-launch envelope: 33 m/s is 119 km/h. */
export const GIANT_SNAKE_MAX_SPEED_MPS = 33;
export const GIANT_SNAKE_STATION_SPEED_MPS = 2.4;
export const GIANT_SNAKE_LAUNCH_TARGET_MPS = 30;
export const GIANT_SNAKE_BOOST_TARGET_MPS = 32;
export const GIANT_SNAKE_BRAKE_TARGET_MPS = 4;

export const GIANT_SNAKE_SITE = {
  x: 260,
  z: 1800,
  /** World rotation of the station structure (track runs west). */
  yaw: Math.PI / 2,
} as const;

export function getGiantSnakeSite() {
  const ground = getTerrainSurfaceHeight(GIANT_SNAKE_SITE.x, GIANT_SNAKE_SITE.z);
  return {
    station: {
      x: GIANT_SNAKE_SITE.x,
      y: ground,
      z: GIANT_SNAKE_SITE.z,
      yaw: GIANT_SNAKE_SITE.yaw,
    },
    ground,
  };
}

export interface GiantSnakeTunnel {
  /** World-space centreline of the tunnel bore. */
  points: { x: number; y: number; z: number }[];
  radius: number;
  /** Portal caps / lighting are rendered from these endpoints. */
  label: string;
}

export interface GiantSnakeSwingLaunch {
  /** Train stops on the siding before the transfer table throws. */
  switchStop: { x: number; y: number; z: number };
  /** Lead car stalls partway up the first top hat. */
  forwardStall: { x: number; y: number; z: number };
  /** Foot of the dead-end vertical spike, beside the switch. */
  spikeBase: { x: number; y: number; z: number };
  /** Lead car reaches the crest of the dead-end spike while travelling backwards. */
  spikeApex: { x: number; y: number; z: number };
  /** The spike is a separate spur and is never joined back into the circuit. */
  spikeNodes: { x: number; y: number; z: number }[];
  /** The relaunch hands control back to the gravity simulation here. */
  release: { x: number; y: number; z: number };
  switchTravelM: number;
  switchDurationS: number;
  launchSpeedMps: number;
  boostSpeedMps: number;
  reverseSpeedMps: number;
}

interface MarkerPoint {
  x: number;
  y: number;
  z: number;
}

function smoothstep(t: number): number {
  const v = Math.max(0, Math.min(1, t));
  return v * v * (3 - 2 * v);
}

const STATION = getGiantSnakeSite();
const GROUND = STATION.ground;

/** Local (station frame) -> world. Local +Z points west, local +X north. */
function toWorld(node: SavedCoasterNode): SavedCoasterNode {
  return {
    ...node,
    position: {
      x: GIANT_SNAKE_SITE.x - node.position.z,
      y: GROUND + node.position.y,
      z: GIANT_SNAKE_SITE.z + node.position.x,
    },
  };
}

function pointToWorld(p: MarkerPoint): MarkerPoint {
  return {
    x: GIANT_SNAKE_SITE.x - p.z,
    y: GROUND + p.y,
    z: GIANT_SNAKE_SITE.z + p.x,
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
  tunnelRanges: { start: number; end: number; radius: number; label: string }[] = [];
  markers: {
    switchStop?: MarkerPoint;
    forwardStall?: MarkerPoint;
    spikeApex?: MarkerPoint;
    release?: MarkerPoint;
  } = {};

  constructor() {
    this.nodes.push({
      position: { x: 0, y: this.y, z: 0 },
      bank: 0,
      segmentType: 'station',
      targetSpeed: GIANT_SNAKE_STATION_SPEED_MPS,
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
    this.append(
      Array.from({ length: 5 }, (_, i) => ({
        position: { x: 0, y: 0, z: (i / 4) * length },
        bank: 0,
        segmentType: i === 0 ? 'coast' : segmentType,
        targetSpeed,
      })),
      0,
    );
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

  /** The train stops here; the transfer table then throws to the launch line. */
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
    this.markers.switchStop = { x: this.x, y: this.y, z: this.z };
  }

  /**
   * The opening launch hill. The first pass stalls on the ascent; after the
   * reverse spike the train returns and clears the crest at boost speed.
   */
  launchTopHat(
    rise: number,
    upLength: number,
    crestLength: number,
    downLength: number,
    endY: number,
    failFraction: number,
  ): void {
    const ascentStart = { x: this.x, y: this.y, z: this.z };
    this.slope(upLength, rise - this.y, 'lsm_launch', GIANT_SNAKE_LAUNCH_TARGET_MPS, 24);
    const failY = ascentStart.y + (this.y - ascentStart.y) * failFraction;
    this.markers.forwardStall = {
      x: ascentStart.x,
      y: failY,
      z: ascentStart.z + upLength * failFraction,
    };
    // A short crowned crest keeps the transition from snapping at the apex.
    this.slope(crestLength, 0.8, 'coast', undefined, 5);
    this.slope(downLength, endY - this.y, 'coast', undefined, 24);
    this.markers.release = { x: this.x, y: this.y, z: this.z };
  }

  /** A modern straight top hat with a rounded crest. */
  topHat(
    rise: number,
    upLength: number,
    crestLength: number,
    downLength: number,
    endY: number,
    targetSpeed?: number,
  ): void {
    this.slope(upLength, rise - this.y, 'lsm_launch', targetSpeed, 28);
    this.slope(crestLength, 1.1, 'coast', undefined, 5);
    this.slope(downLength, endY - this.y, 'coast', undefined, 28);
  }

  /**
   * A 180-degree hairpin. `direction` mirrors the arc so every switchback leg
   * shifts to the same side of the plot: away from the station.
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

  preset(nodes: SavedCoasterNode[], netHeading = 0): void {
    this.append(nodes, netHeading);
  }

  corkscrew(length = 28): void {
    // A straight-bore barrel roll. The old lateral helix preset folded back on
    // itself at the ends, producing an 80 g tangent spike at launch speed.
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

  /**
   * A steep vertical twist: the rails rise hard, roll through a full 360 and
   * drop away on the far side. Used immediately after the swing spike's first
   * hill to give the launch sequence a Kingda Ka-style vertical read.
   */
  verticalTwist(length: number, height: number, direction: 1 | -1 = 1): void {
    this.preset(
      Array.from({ length: 37 }, (_, i) => {
        const t = i / 36;
        const profile = Math.pow(Math.sin(Math.PI * t), 1.45);
        return {
          position: {
            x: direction * 2.2 * Math.sin(Math.PI * t) ** 2,
            y: height * profile,
            z: t * length,
          },
          bank: 360 * smoothstep(t),
          segmentType: 'inversion',
        } satisfies SavedCoasterNode;
      }),
    );
  }

  /** A sharp right-hand climbing turn with an outward banked crest. */
  sharpRightHill(radius: number, hillHeight: number, bankAngle = 52): void {
    const steps = 24;
    this.append(
      Array.from({ length: steps + 1 }, (_, i) => {
        const t = i / steps;
        const theta = (t * Math.PI) / 2;
        const profile = Math.sin(Math.PI * t) ** 2;
        return {
          position: {
            x: -radius * (1 - Math.cos(theta)),
            y: hillHeight * profile,
            z: radius * Math.sin(theta),
          },
          bank: bankAngle * profile,
          segmentType: 'coast',
        } satisfies SavedCoasterNode;
      }),
      -Math.PI / 2,
    );
  }

  /** A larger, slower rolling inversion with more vertical amplitude. */
  barrelRoll(length: number, height: number): void {
    this.preset(
      Array.from({ length: 33 }, (_, i) => {
        const t = i / 32;
        return {
          position: {
            x: 0,
            y: height * Math.pow(Math.sin(Math.PI * t), 2),
            z: t * length,
          },
          bank: 360 * smoothstep(t),
          segmentType: 'inversion',
        } satisfies SavedCoasterNode;
      }),
    );
  }

  tunnelSlope(length: number, rise: number, radius: number, label: string): void {
    const start = this.nodes.length;
    this.slope(length, rise, 'coast', undefined, 14);
    this.tunnelRanges.push({ start, end: this.nodes.length - 1, radius, label });
  }

  tunnelStraight(length: number, radius: number, label: string): void {
    const start = this.nodes.length;
    this.straight(length, 'coast');
    this.tunnelRanges.push({ start, end: this.nodes.length - 1, radius, label });
  }

  /**
   * A true below-grade tunnel: dive under the marsh, run level, then climb
   * back to the original height. Recording both slopes as one tunnel range
   * keeps the bore and portal aligned with the rails.
   */
  tunnelDip(length: number, depth: number, radius: number, label: string): void {
    const start = this.nodes.length;
    const half = length / 2;
    this.slope(half, -depth, 'coast', undefined, 14);
    this.slope(half, depth, 'coast', undefined, 14);
    this.tunnelRanges.push({ start, end: this.nodes.length - 1, radius, label });
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

  /**
   * A straight roll transition used for the half-inverted and flipping
   * elements. Keeping these rolls on a straight eliminates the low-level
   * self-intersection two mirrored hairpin flips produced.
   */
  rollTransition(length: number, bankDelta: number): void {
    this.append(
      Array.from({ length: 25 }, (_, i) => {
        const t = i / 24;
        return {
          position: { x: 0, y: 0.4 * Math.sin(Math.PI * t), z: t * length },
          bank: bankDelta * smoothstep(t),
          segmentType: 'inversion',
        } satisfies SavedCoasterNode;
      }),
      0,
    );
  }

  /** Rise, a full roll through an inverted crest, and a fall back to level. */
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

  /** Outward-turning S transition used before the final hills. */
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
        targetSpeed: GIANT_SNAKE_BRAKE_TARGET_MPS,
      })),
      0,
    );
  }

  /**
   * Route the long western arm back to the station. The swing spike is a
   * separate dead-end spur beside the switch, so this return never touches it.
   */
  returnToStation(): void {
    const end = new THREE.Vector3(this.x, this.y, this.z);
    // Continue in the end element's eastbound direction, swing around the
    // outside of the southern plot, then return along the north edge. The
    // wide oval avoids both a cusp at the join and a fold back over the ride.
    const curve = new THREE.CatmullRomCurve3(
      [
        end,
        new THREE.Vector3(-44, 8, 392),
        new THREE.Vector3(-54, 16, 375),
        new THREE.Vector3(-68, 24, 365),
        new THREE.Vector3(-88, 28, 365),
        new THREE.Vector3(-110, 26, 375),
        new THREE.Vector3(-132, 22, 395),
        new THREE.Vector3(-155, 16, 425),
        new THREE.Vector3(-170, 10, 465),
        new THREE.Vector3(-170, 6, 505),
        new THREE.Vector3(-158, 3.2, 545),
        new THREE.Vector3(-132, 1.6, 578),
        new THREE.Vector3(-96, 1.35, 600),
        new THREE.Vector3(-58, 1.35, 615),
        new THREE.Vector3(-16, 1.35, 620),
        new THREE.Vector3(30, 1.35, 615),
        new THREE.Vector3(68, 1.35, 600),
        new THREE.Vector3(89, 1.35, 580),
        new THREE.Vector3(89, 1.35, 400),
        new THREE.Vector3(89, 1.35, 300),
        new THREE.Vector3(89, 1.35, 200),
        new THREE.Vector3(89, 1.35, 100),
        new THREE.Vector3(89, 1.35, 20),
        new THREE.Vector3(72, 1.35, -10),
        new THREE.Vector3(42, 1.35, -34),
        new THREE.Vector3(18, 1.35, -48),
        new THREE.Vector3(0, 1.35, -40),
        new THREE.Vector3(0, 1.35, -20),
        new THREE.Vector3(0, 1.35, 0),
      ],
      false,
      'centripetal',
    );
    const curveLength = curve.getLength();
    const steps = Math.max(180, Math.ceil(curveLength / 2.2));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const p = curve.getPointAt(t);
      const nearStation = t > 0.985;
      const nearBrake = t > 0.94;
      this.nodes.push({
        position: { x: p.x, y: Math.max(1.35, p.y), z: p.z },
        bank: this.bankBase,
        // Boosted outside return, then a proper final brake run into the
        // station. The dead-end spike is elsewhere and is never on this line.
        segmentType: nearStation ? 'station' : nearBrake ? 'block_brake' : 'lsm_launch',
        targetSpeed: nearStation ? GIANT_SNAKE_STATION_SPEED_MPS : nearBrake ? 5 : 24,
      });
    }
    this.x = 0;
    this.y = 1.35;
    this.z = 0;
    this.heading = 0;
  }

}

/**
 * The complete Giant Snake circuit, in ride order:
 *
 * station siding -> transfer switch -> partial launch -> top hat stall ->
 * reverse to the switch -> dead-end vertical spike -> relaunch over the top
 * hat -> second top hat -> large hill -> steep vertical twist -> sharp right
 * climbing turn -> corkscrew -> tunnel -> huge whippy sweeping turn -> rolling
 * inversion -> descending turn -> overbank -> two speed hills -> dive loop ->
 * tunnel -> vertical loop -> twisted airtime -> large inverted top hat ->
 * half-inverted transition -> flip -> upside-down section -> outward bank ->
 * sweeping right turn -> two large airtime hills -> two corkscrews -> brake run
 * -> station.
 */
function buildTrack(): {
  nodes: SavedCoasterNode[];
  localTunnels: { start: number; end: number; radius: number; label: string }[];
  swing: GiantSnakeSwingLaunch;
} {
  const b = new TrackBuilder();
  b.straight(16, 'station', GIANT_SNAKE_STATION_SPEED_MPS);
  b.switchSiding(14, -3.5);
  b.slope(24, 2.5, 'lsm_launch', 18);
  b.launchTopHat(42, 58, 12, 58, 6, 0.66);
  // Post-spike launch hill: a second top hat, a large airtime hill, a steep
  // vertical twist and a sharp right-hand climbing turn.
  b.topHat(32, 48, 10, 48, 12, 24);
  b.hill(12, 30);
  b.verticalTwist(26, 13, 1);
  b.sharpRightHill(24, 11, 52);
  b.verticalTwist(22, 11, -1);
  b.corkscrew(28);

  b.tunnelDip(46, 15.6, 4.6, 'Cypress Hollow');
  b.hairpin(18, 62, 1);
  b.straight(6);
  b.barrelRoll(32, 9);
  b.slope(12, -2, 'coast');
  b.hairpin(16, 48, -1);
  b.overbank(30, 78);
  b.hill(6, 22);
  b.hill(4, 18);

  b.diveLoop(7, 2);
  b.tunnelDip(34, 14.4, 5.4, 'Serpent Vault');
  b.verticalLoop(7);
  b.barrelRoll(34, 8);

  b.invertedTopHat(28, 70);
  b.slope(12, -1.5, 'coast');
  // Half-inverted transition -> upside-down section -> flipping element.
  b.rollTransition(11, 180);
  b.straight(8, 'inversion');
  b.rollTransition(11, 180);
  b.outwardTurn(22);
  b.hairpin(20, 45, -1);
  b.hill(10, 34);
  b.hill(8, 30);
  b.corkscrew(26);
  b.corkscrew(26);

  b.returnToStation();

  const nodes = b.nodes;
  const localTunnels = b.tunnelRanges;
  const markers = b.markers;
  if (!markers.switchStop || !markers.forwardStall || !markers.release) {
    throw new Error('Giant Snake swing markers were not recorded');
  }

  // The spike is deliberately a separate dead-end spur. It starts at the
  // transfer table, leans away from the station throat, and ends in the air;
  // nothing is attached to its apex and it is not part of the main circuit.
  const spikeBaseLocal: MarkerPoint = { x: 12, y: 1.35, z: 45 };
  const spikeApexLocal: MarkerPoint = { x: 12, y: 46, z: 45 };
  const spikeApproach = new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(markers.switchStop.x, 1.35, markers.switchStop.z),
      new THREE.Vector3(markers.switchStop.x + 3, 1.35, markers.switchStop.z + 5),
      new THREE.Vector3(9, 1.35, 38),
      new THREE.Vector3(12, 1.35, 45),
    ],
    false,
    'centripetal',
  );
  const spikeApproachLocal: MarkerPoint[] = Array.from({ length: 13 }, (_, i) => {
    const p = spikeApproach.getPointAt(i / 12);
    return { x: p.x, y: 1.35, z: p.z };
  });
  const spikeVerticalLocal: MarkerPoint[] = Array.from({ length: 25 }, (_, i) => ({
    x: 12,
    y: 1.35 + (44.65 * i) / 24,
    z: 45,
  }));
  const spikeLocal: MarkerPoint[] = [...spikeApproachLocal, ...spikeVerticalLocal.slice(1)];
  const spikeNodes = spikeLocal.map(pointToWorld);
  markers.spikeApex = spikeApexLocal;

  const swing: GiantSnakeSwingLaunch = {
    switchStop: pointToWorld(markers.switchStop),
    forwardStall: pointToWorld(markers.forwardStall),
    spikeBase: pointToWorld(spikeBaseLocal),
    spikeApex: pointToWorld(spikeApexLocal),
    spikeNodes,
    release: pointToWorld(markers.release),
    switchTravelM: 3.5,
    switchDurationS: 2.2,
    launchSpeedMps: 24,
    boostSpeedMps: GIANT_SNAKE_BOOST_TARGET_MPS,
    reverseSpeedMps: 22,
  };
  return { nodes, localTunnels, swing };
}

export function buildGiantSnakeTrack(): {
  nodes: SavedCoasterNode[];
  tunnels: GiantSnakeTunnel[];
  swing: GiantSnakeSwingLaunch;
} {
  const { nodes, localTunnels, swing } = buildTrack();
  const tunnels: GiantSnakeTunnel[] = localTunnels.map((range) => ({
    points: nodes
      .slice(range.start, range.end + 1)
      .map((n) => pointToWorld({ x: n.position.x, y: n.position.y, z: n.position.z })),
    radius: range.radius,
    label: range.label,
  }));
  return {
    nodes: nodes.map(toWorld),
    tunnels,
    swing,
  };
}

export function buildGiantSnakeNodes(): SavedCoasterNode[] {
  return buildGiantSnakeTrack().nodes;
}

export function buildGiantSnakeCoasterData(): SavedCoasterData {
  const site = getGiantSnakeSite();
  const track = buildGiantSnakeTrack();
  return {
    id: GIANT_SNAKE_ID,
    name: GIANT_SNAKE_NAME,
    trackColor: '#c8a44a',
    trainCarCount: 5,
    stationPos: { x: site.station.x, y: site.station.y, z: site.station.z },
    nodes: track.nodes,
    swingLaunch: track.swing,
    pieceTags: [
      GIANT_SNAKE_ID,
      GIANT_SNAKE_THEME_TAG,
      'themed',
      'switch_track',
      'swing_launch',
      'launch_spikes',
      'tunnels',
      'multi_inversion',
      GIANT_SNAKE_LAYOUT_TAG,
    ],
    closedCircuit: true,
    coasterType: 'air_launch_wide',
  };
}

/** Tunnel bores, in world space, used by the themed environment builder. */
export function getGiantSnakeTunnels(): GiantSnakeTunnel[] {
  return buildGiantSnakeTrack().tunnels;
}

export function getGiantSnakeSwingLaunch(): GiantSnakeSwingLaunch {
  return buildGiantSnakeTrack().swing;
}
