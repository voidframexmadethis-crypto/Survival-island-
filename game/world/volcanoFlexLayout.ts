import * as THREE from 'three';
import type { SavedCoasterData, SavedCoasterNode } from '../types';
import { getTerrainSurfaceHeight } from './terrain';
import {
  WATERPARK_DECK_HALF_W,
  WATERPARK_SITE,
} from './waterparkLayout';

/** 100 imperial feet — the surveyed gap between the station and the waterpark deck. */
export const VOLCANO_FLEX_CLEARANCE_M = 30.48;
export const VOLCANO_FLEX_ID = 'volcano_flex';
export const VOLCANO_FLEX_NAME = 'VOLCANO FLEX';
export const VOLCANO_FLEX_INVERSIONS = 15;
export const VOLCANO_FLEX_HEIGHT_M = 274.32; // 900 ft

const STATION_X = WATERPARK_SITE.x + WATERPARK_DECK_HALF_W + VOLCANO_FLEX_CLEARANCE_M;
const STATION_Z = WATERPARK_SITE.z;

/** The observation-tower centre in the coaster's local frame. */
const VOLCANO_LOCAL_X = -20;
const VOLCANO_LOCAL_Z = 58;
const TOWER_RADIUS = 20;
const ASCENT_TOP_Y = 200;
const DESCENT_BOTTOM_Y = 55;
const ROLL_BANK_END = 3600;

export interface VolcanoFlexSite {
  station: { x: number; y: number; z: number; yaw: number };
  mountain: { x: number; y: number; z: number; radius: number; height: number };
}

export function getVolcanoFlexSite(): VolcanoFlexSite {
  const stationGround = getTerrainSurfaceHeight(STATION_X, STATION_Z);
  // Track local +Z maps to world east and local +X maps to world south
  // (see buildVolcanoFlexNodes). Keep the tower on that same transform so the
  // 900-ft structure encloses the actual spiral rather than sitting beside it.
  const mountainX = STATION_X + VOLCANO_LOCAL_Z;
  const mountainZ = STATION_Z - VOLCANO_LOCAL_X;
  return {
    station: { x: STATION_X, y: stationGround, z: STATION_Z, yaw: Math.PI / 2 },
    mountain: {
      x: mountainX,
      y: getTerrainSurfaceHeight(mountainX, mountainZ) - 2,
      z: mountainZ,
      radius: 55,
      height: VOLCANO_FLEX_HEIGHT_M,
    },
  };
}

function smoothstep(value: number): number {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

/** Transform a local (+Z forward) track element into the coaster's local frame. */
function appendLocalElement(
  out: SavedCoasterNode[],
  pieceNodes: SavedCoasterNode[],
  start: { x: number; y: number; z: number },
  heading: number,
  baseBank: number,
): { x: number; y: number; z: number; bank: number } {
  const cos = Math.cos(heading);
  const sin = Math.sin(heading);
  const startIndex = out.length === 0 ? 0 : 1;
  let last = { ...start, bank: baseBank };
  for (let i = startIndex; i < pieceNodes.length; i++) {
    const node = pieceNodes[i];
    const x = start.x + node.position.x * cos + node.position.z * sin;
    const z = start.z - node.position.x * sin + node.position.z * cos;
    const y = start.y + node.position.y;
    const bank = baseBank + node.bank;
    out.push({
      position: { x, y, z },
      bank,
      segmentType: node.segmentType,
      targetSpeed: node.targetSpeed,
    });
    last = { x, y, z, bank };
  }
  return last;
}

function rollBankAt(t: number): number {
  const start = 0.08;
  const end = 0.92;
  const rolls = 10;
  if (t <= start) return 0;
  const span = (end - start) / rolls;
  const u = (t - start) / span;
  const index = Math.floor(u);
  if (index >= rolls) return 3600;
  return 360 * index + 360 * smoothstep(u - index);
}

/**
 * The complete Volcano Flex circuit. Distances and heights are in metres at
 * world scale; the 900-ft tower translates to 274.32 m. The ascent and the
 * inversion descent spiral tightly around the observation tower. Ten
 * barrel-roll inversions are stacked through the descent, followed by one
 * upside-down launch block and four return inversions.
 */
export function buildVolcanoFlexNodes(): SavedCoasterNode[] {
  const nodes: SavedCoasterNode[] = [];
  const ground = getTerrainSurfaceHeight(STATION_X, STATION_Z);

  // Boarding platform: level, powered drive tyres through the load/unload bay.
  for (let i = 0; i <= 5; i++) {
    nodes.push({
      position: {
        x: 0,
        y: 1.35,
        z: i * 3.2,
      },
      bank: 0,
      segmentType: 'station',
      targetSpeed: 4.8,
    });
  }

  // LSM launch straight into the volcano tunnel.
  const launchStartZ = nodes[nodes.length - 1].position.z;
  const launchLength = VOLCANO_LOCAL_Z - launchStartZ;
  for (let i = 1; i <= 10; i++) {
    const t = i / 10;
    nodes.push({
      position: {
        x: 0,
        y: 1.35 + smoothstep(t) * 2.15,
        z: launchStartZ + launchLength * t,
      },
      bank: 0,
      segmentType: 'lsm_launch',
      targetSpeed: 88,
    });
  }

  // Three powered spiral laps up and around the observation tower.
  for (let i = 1; i <= 104; i++) {
    const t = i / 104;
    const theta = t * Math.PI * 6;
    const y = 3.5 + smoothstep(t) * (ASCENT_TOP_Y - 3.5);
    nodes.push({
      position: {
        x: VOLCANO_LOCAL_X + Math.cos(theta) * TOWER_RADIUS,
        y,
        z: VOLCANO_LOCAL_Z + Math.sin(theta) * TOWER_RADIUS,
      },
      bank: Math.sin(theta * 1.5) * 8,
      segmentType: 'lsm_launch',
      targetSpeed: 88,
    });
  }

  // Ten inversions on the initial descent, spiralling down around the tower.
  for (let i = 1; i <= 108; i++) {
    const t = i / 108;
    const theta = t * Math.PI * 6;
    let bank = rollBankAt(t);
    let segmentType: SavedCoasterNode['segmentType'] = 'coast';
    let targetSpeed: number | undefined;

    if (t >= 0.938 && t <= 0.984) {
      bank = 3780;
      segmentType = 'lsm_launch';
      targetSpeed = 76;
    } else if (t > 0.922) {
      bank = ROLL_BANK_END;
    }

    nodes.push({
      position: {
        x: VOLCANO_LOCAL_X + Math.cos(theta) * TOWER_RADIUS,
        y: ASCENT_TOP_Y - smoothstep(t) * (ASCENT_TOP_Y - DESCENT_BOTTOM_Y),
        z: VOLCANO_LOCAL_Z + Math.sin(theta) * TOWER_RADIUS,
      },
      bank,
      segmentType,
      targetSpeed,
    });
  }

  // Half-turn tunnel exit, descending to the return inversions.
  for (let i = 1; i <= 30; i++) {
    const t = i / 30;
    const theta = t * Math.PI;
    nodes.push({
      position: {
        x: VOLCANO_LOCAL_X + Math.cos(theta) * TOWER_RADIUS,
        y: DESCENT_BOTTOM_Y - smoothstep(t) * 25,
        z: VOLCANO_LOCAL_Z + Math.sin(theta) * TOWER_RADIUS,
      },
      bank: ROLL_BANK_END,
      segmentType: 'coast',
    });
  }

  // Four additional inversions on the return run, followed by magnetic brakes.
  const returnStart = nodes[nodes.length - 1].position;
  const returnY = returnStart.y;
  const elementStart = { x: returnStart.x, y: returnY, z: returnStart.z };
  let baseBank = ROLL_BANK_END;

  const barrelRoll: SavedCoasterNode[] = [];
  const barrelLength = 28;
  for (let i = 0; i <= 28; i++) {
    const t = i / 28;
    barrelRoll.push({
      position: { x: 0, y: 0, z: t * barrelLength },
      bank: 360 * smoothstep(t),
      segmentType: 'inversion',
    });
  }

  const zeroGStall: SavedCoasterNode[] = [];
  const stallLength = 32;
  for (let i = 0; i <= 30; i++) {
    const t = i / 30;
    zeroGStall.push({
      position: { x: 0, y: 9 * Math.pow(Math.sin(Math.PI * t), 2), z: t * stallLength },
      bank: 360 * smoothstep(t),
      segmentType: 'inversion',
    });
  }

  const returnPieces: SavedCoasterNode[][] = [
    [
      { position: { x: 0, y: 0, z: 0 }, bank: 0, segmentType: 'inversion' },
      ...Array.from({ length: 28 }, (_, i) => {
        const t = (i + 1) / 28;
        const angle = t * Math.PI * 2;
        const env = Math.sin(Math.PI * t);
        return {
          position: {
            x: -7 * Math.sin(angle) * env,
            y: 7 * (1 - Math.cos(angle)),
            z: t * 28,
          },
          bank: 360 * smoothstep(t),
          segmentType: 'inversion' as const,
        };
      }),
    ],
    [
      { position: { x: 0, y: 0, z: 0 }, bank: 0, segmentType: 'inversion' },
      ...Array.from({ length: 24 }, (_, i) => {
        const t = (i + 1) / 24;
        return {
          position: { x: 0, y: 9 * Math.pow(Math.sin(Math.PI * t), 2), z: t * 30 },
          bank: 360 * smoothstep(t),
          segmentType: 'inversion' as const,
        };
      }),
    ],
    barrelRoll,
    zeroGStall,
  ];

  for (const piece of returnPieces) {
    const last = appendLocalElement(nodes, piece, elementStart, Math.PI, baseBank);
    elementStart.x = last.x;
    elementStart.y = last.y;
    elementStart.z = last.z;
    baseBank = last.bank;
  }

  // Custom return leg: stays south and east of the waterpark, climbs over the
  // boundary fence, then descends into the station from behind. Building this
  // explicitly avoids a ground support run through the waterpark and keeps the
  // attraction's 100-ft buffer clear.
  const closureCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(elementStart.x, elementStart.y, elementStart.z),
    new THREE.Vector3(elementStart.x, elementStart.y + 1, elementStart.z - 24),
    new THREE.Vector3(elementStart.x + 12, elementStart.y + 2, elementStart.z - 42),
    new THREE.Vector3(elementStart.x + 34, elementStart.y, elementStart.z - 52),
    new THREE.Vector3(elementStart.x + 52, elementStart.y - 5, elementStart.z - 40),
    new THREE.Vector3(elementStart.x + 58, elementStart.y - 10, elementStart.z - 16),
    new THREE.Vector3(elementStart.x + 50, elementStart.y - 14, elementStart.z + 2),
    new THREE.Vector3(elementStart.x + 30, 14, -36),
    new THREE.Vector3(16, 11, -24),
    new THREE.Vector3(8, 8, -12),
    new THREE.Vector3(2, 5.5, -5),
    new THREE.Vector3(0, 1.35, 0),
  ]);
  const closureSamples = 76;
  for (let i = 1; i <= closureSamples; i++) {
    const t = i / closureSamples;
    const pd = closureCurve.getPoint(t);
    const braking = t > 0.82;
    nodes.push({
      position: { x: pd.x, y: pd.y, z: pd.z },
      bank: baseBank,
      segmentType: braking ? 'trim_brake' : 'coast',
      targetSpeed: braking ? 6 : undefined,
    });
  }
  // A fixed station target on the closing node keeps the train moving through
  // the load bay after it wraps around the circuit.
  nodes[nodes.length - 1].segmentType = 'station';
  nodes[nodes.length - 1].targetSpeed = 4.8;
  nodes[nodes.length - 1].bank = 5040;

  return nodes.map((node) => ({
    ...node,
    position: {
      x: STATION_X + node.position.z,
      y: ground + node.position.y,
      z: STATION_Z - node.position.x,
    },
  }));
}

export function buildVolcanoFlexCoasterData(): SavedCoasterData {
  const site = getVolcanoFlexSite();
  return {
    id: VOLCANO_FLEX_ID,
    name: VOLCANO_FLEX_NAME,
    trackColor: '#d21f2b',
    trainCarCount: 5,
    stationPos: {
      x: site.station.x,
      y: site.station.y,
      z: site.station.z,
    },
    nodes: buildVolcanoFlexNodes(),
    pieceTags: [VOLCANO_FLEX_ID, 'themed', 'volcano', 'lsm', '15_inversions'],
    closedCircuit: true,
    coasterType: 'air_launch_wide',
  };
}

/** Local coordinates of the spiral chamber, exposed for the visual model. */
export const VOLCANO_FLEX_LOCAL_CHAMBER = {
  x: VOLCANO_LOCAL_X,
  z: VOLCANO_LOCAL_Z,
  radius: TOWER_RADIUS,
  ascentTop: ASCENT_TOP_Y,
  descentBottom: DESCENT_BOTTOM_Y,
} as const;
