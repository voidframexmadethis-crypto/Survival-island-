import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  CoasterHudSummaryItem,
  CoasterModelType,
  SavedCoasterData,
  SavedCoasterNode,
} from '../types';
import { getTerrainHeight } from '../world/terrain';
import { VOLCANO_FLEX_BOARDING_SETBACK_M } from '../world/coasterStationLayout';
import {
  buildVolcanoFlexEnvironment,
  buildVolcanoFlexTrainCar,
  type VolcanoFlexEnvironment,
} from '../world/volcanoFlexModel';
import { BAYOU_COMET_THEME_TAG } from '../world/bayouCometLayout';
import {
  buildBayouCometEnvironment,
  buildBayouCometTrainCar,
} from '../world/bayouCometModel';
import {
  CoasterEditor,
  CoasterTrain,
  CustomInversion,
  InversionDesigner,
  TrackNode,
  TrackPiece,
  TrackSample,
  TrackSegmentType,
  TrackPieces,
  depumpTrack,
  exportTrackCSV,
  importTrackCSV,
  getSegmentDisplayLabel,
  validateTrack,
} from './rollerCoasterSystem';


export type CoasterPiecePresetKey =
  | 'straight'
  | 'chainLift'
  | 'firstDrop'
  | 'hill'
  | 'bankedTurn'
  | 'bankedTurnLeft'
  | 'helix'
  | 'verticalLoop'
  | 'corkscrew'
  | 'zeroGRoll'
  | 'immelmann'
  | 'launch'
  | 'brake'
  | 'splashdown';

interface ActiveCoasterEntry {
  id: string;
  name: string;
  trackColor: string;
  trainCarCount: number;
  stationPos: { x: number; y: number; z: number };
  editor: CoasterEditor;
  pieceTags: string[];
  closedCircuit: boolean;
  coasterType: CoasterModelType;
  samples: TrackSample[];
  train: CoasterTrain;
  running: boolean;
  meshGroup: THREE.Group;
  carMeshes: THREE.Group[];
  maxHeightM: number;
  estPeakSpeedKmh: number;
  inversionsCount: number;
  theme: 'volcano_flex' | 'bayou_comet' | null;
  /** Train lead-car distance where the whole train is inside the station. */
  boardingDistance: number;
  /** A full lap has wrapped and the train is rolling in to park. */
  arrivalPending: boolean;
  /** Train has parked at the loading position and the rider can get off. */
  arrivedAtStation: boolean;
  hudNodesCache?: SavedCoasterNode[];
  validationCache?: { valid: boolean; errors: string[] };
}

type CoasterTheme = NonNullable<ActiveCoasterEntry['theme']>;

interface ThemedCoasterConfig {
  maxSpeed: number;
  stationSpeed: number;
  driveAccel: number;
  boardingDistance: number;
}

/** Both island attractions share the same governed envelope and deck geometry. */
const THEMED_COASTER_CONFIG: Record<CoasterTheme, ThemedCoasterConfig> = {
  volcano_flex: { maxSpeed: 20, stationSpeed: 2.4, driveAccel: 8.5, boardingDistance: 12.6 },
  bayou_comet: { maxSpeed: 20, stationSpeed: 2.4, driveAccel: 8.5, boardingDistance: 12.6 },
};

function themeConfig(theme: CoasterTheme | null): ThemedCoasterConfig | null {
  return theme ? THEMED_COASTER_CONFIG[theme] : null;
}

const TRACK_COLORS = [
  '#ef4444',
  '#38bdf8',
  '#f59e0b',
  '#a855f7',
  '#10b981',
  '#ec4899',
];

function cloneNode(n: TrackNode): SavedCoasterNode {
  return {
    position: {
      x: Math.round(n.position.x * 100) / 100,
      y: Math.round(n.position.y * 100) / 100,
      z: Math.round(n.position.z * 100) / 100,
    },
    bank: Math.round(n.bank * 10) / 10,
    segmentType: n.segmentType,
    targetSpeed: n.targetSpeed,
    frameMode: n.frameMode,
  };
}

const _coasterRight = new THREE.Vector3();
const _coasterUp = new THREE.Vector3();
const _coasterFwd = new THREE.Vector3();
const _coasterPos = new THREE.Vector3();
const _coasterBasis = new THREE.Matrix4();

/**
 * Proper right-handed car/tie basis. The stored frame uses
 * `up = side x tangent`, so the side vector is the *negative* of the proper
 * right axis; using it directly produced a reflection matrix (determinant -1)
 * and `setFromRotationMatrix` then returned unreliable car rotations.
 */
function makeBasisMatrix(sample: TrackSample): THREE.Matrix4 {
  _coasterUp.set(sample.up.x, sample.up.y, sample.up.z).normalize();
  _coasterFwd.set(sample.tangent.x, sample.tangent.y, sample.tangent.z).normalize();
  _coasterRight.crossVectors(_coasterUp, _coasterFwd).normalize();
  return _coasterBasis.makeBasis(_coasterRight, _coasterUp, _coasterFwd);
}

/**
 * VOLCANO FLEX authors its bank as an absolute roll from the horizon (0 at the
 * station, 360-degree multiples through the rolls, 5040 at the dock). Parallel
 * transport ignores that and accumulates its own roll around the 377 m spiral,
 * leaving the train upside down for ~90 m of the climb and twisted at the
 * station. Build the frame from the horizon plus the authored bank instead, and
 * carry the previous side vector through near-vertical tangents so loops stay
 * continuous.
 */
export function applyLoopPlaneFrames(samples: TrackSample[]): void {
  const worldUp = new THREE.Vector3(0, 1, 0);
  const normal = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const up = new THREE.Vector3();
  const right = new THREE.Vector3();
  let i = 0;
  while (i < samples.length) {
    if (samples[i].frameMode !== 'loop') {
      i += 1;
      continue;
    }
    let end = i;
    while (end < samples.length && samples[end].frameMode === 'loop') end += 1;
    tangent.set(samples[i].tangent.x, samples[i].tangent.y, samples[i].tangent.z).normalize();
    normal.crossVectors(tangent, worldUp).normalize();
    if (normal.lengthSq() < 0.5) normal.set(0, 0, 1);
    for (let j = i; j < end; j++) {
      tangent
        .set(samples[j].tangent.x, samples[j].tangent.y, samples[j].tangent.z)
        .normalize();
      up.crossVectors(normal, tangent).normalize();
      right.crossVectors(tangent, up).normalize();
      samples[j].up = { x: up.x, y: up.y, z: up.z };
      samples[j].right = { x: right.x, y: right.y, z: right.z };
    }
    i = end;
  }
}

export function applyIslandHorizonFrames(samples: TrackSample[]): void {
  if (samples.length < 2) return;
  const worldUp = new THREE.Vector3(0, 1, 0);
  const tangent = new THREE.Vector3();
  const side = new THREE.Vector3();
  const flatUp = new THREE.Vector3();
  const up = new THREE.Vector3();
  let previousSide: THREE.Vector3 | null = null;
  for (const sample of samples) {
    tangent.set(sample.tangent.x, sample.tangent.y, sample.tangent.z).normalize();
    side.crossVectors(tangent, worldUp);
    if (side.lengthSq() < 0.02) {
      if (previousSide) {
        side.copy(previousSide).addScaledVector(tangent, -previousSide.dot(tangent));
      }
      if (side.lengthSq() < 1e-4) side.set(1, 0, 0);
    }
    side.normalize();
    flatUp.crossVectors(side, tangent).normalize();
    const bank = (sample.bank * Math.PI) / 180;
    side.multiplyScalar(Math.cos(bank)).addScaledVector(flatUp, -Math.sin(bank)).normalize();
    up.crossVectors(side, tangent).normalize();
    sample.right = { x: side.x, y: side.y, z: side.z };
    sample.up = { x: up.x, y: up.y, z: up.z };
    previousSide = side.clone();
  }
}

function mergeNormalizedParts(parts: THREE.BufferGeometry[]): THREE.BufferGeometry | null {
  if (parts.length === 0) return null;
  const prepared: THREE.BufferGeometry[] = [];
  for (const g of parts) {
    const nonIdx = g.index ? g.toNonIndexed() : g;
    if (!nonIdx.attributes.normal) nonIdx.computeVertexNormals();
    if (!nonIdx.attributes.uv) {
      const count = nonIdx.attributes.position.count;
      nonIdx.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
    }
    prepared.push(nonIdx);
    if (nonIdx !== g) g.dispose();
  }
  const merged = mergeGeometries(prepared, false);
  for (const p of prepared) p.dispose();
  return merged;
}

export class RollerCoasterRuntime {
  private scene: THREE.Scene;
  private rootGroup = new THREE.Group();
  private coasters = new Map<string, ActiveCoasterEntry>();
  private inversionDesigner = new InversionDesigner();
  private seq = 0;
  private cachedHudSummaries: CoasterHudSummaryItem[] | null = null;
  private hudCacheDirty = true;
  private themeElapsed = 0;
  private themeSimAccum = 0;
  private themedEnvironments = new Map<string, VolcanoFlexEnvironment>();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.rootGroup.name = 'RollerCoasterRuntimeRoot';
    this.scene.add(this.rootGroup);
  }

  public clearAll(): void {
    for (const entry of this.coasters.values()) {
      this.disposeEntryMesh(entry);
      const themed = this.themedEnvironments.get(entry.id);
      if (themed) {
        themed.dispose();
        this.themedEnvironments.delete(entry.id);
      }
    }
    this.coasters.clear();
    this.hudCacheDirty = true;
  }

  private disposeEntryMesh(entry: ActiveCoasterEntry): void {
    this.rootGroup.remove(entry.meshGroup);
    entry.meshGroup.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material?.dispose();
        }
      }
    });
    entry.carMeshes = [];
  }

  public createCoaster(
    name: string,
    stationPos: { x: number; y: number; z: number },
    yaw = 0,
    withStarterTrack = true,
    trackColor?: string,
    coasterType: CoasterModelType = 'steel',
  ): string {
    this.seq += 1;
    const id = `coaster_${Date.now()}_${this.seq}`;
    const color = trackColor || TRACK_COLORS[(this.seq - 1) % TRACK_COLORS.length];
    const editor = new CoasterEditor();

    const fwdX = -Math.sin(yaw);
    const fwdZ = -Math.cos(yaw);
    const groundY = Math.max(stationPos.y, getTerrainHeight(stationPos.x, stationPos.z));

    editor.addPoint({ x: stationPos.x, y: groundY + 1.25, z: stationPos.z }, 0, 'station', 4.8);
    editor.addPoint(
      { x: stationPos.x + fwdX * 7, y: groundY + 1.25, z: stationPos.z + fwdZ * 7 },
      0,
      'station',
      4.8,
    );
    editor.addPoint(
      { x: stationPos.x + fwdX * 14, y: groundY + 1.25, z: stationPos.z + fwdZ * 14 },
      0,
      'coast',
    );

    const entry: ActiveCoasterEntry = {
      id,
      name: name.trim() || `Coaster ${this.seq}`,
      trackColor: color,
      trainCarCount: coasterType === 'log_flume' ? 3 : 4,
      stationPos: { x: stationPos.x, y: groundY, z: stationPos.z },
      editor,
      pieceTags: ['station'],
      closedCircuit: false,
      coasterType,
      samples: [],
      train: new CoasterTrain([]),
      running: false,
      meshGroup: new THREE.Group(),
      carMeshes: [],
      maxHeightM: 1.25,
      estPeakSpeedKmh: 0,
      inversionsCount: 0,
      theme: null,
      boardingDistance: 0,
      arrivalPending: false,
      arrivedAtStation: false,
    };
    this.coasters.set(id, entry);

    if (withStarterTrack) {
      this.appendPresetPiece(id, 'chainLift');
      this.appendPresetPiece(id, 'firstDrop');
      this.appendPresetPiece(id, coasterType === 'wooden' ? 'hill' : 'verticalLoop');
      this.appendPresetPiece(id, 'bankedTurn');
      this.appendPresetPiece(id, 'hill');
      this.completeCircuit(id);
      return id;
    }

    this.rebuildEntryGeometry(entry);
    return id;
  }

  public deleteCoaster(coasterId: string): boolean {
    const entry = this.coasters.get(coasterId);
    if (!entry) return false;
    this.disposeEntryMesh(entry);
    const themed = this.themedEnvironments.get(coasterId);
    if (themed) {
      themed.dispose();
      this.themedEnvironments.delete(coasterId);
    }
    this.coasters.delete(coasterId);
    this.hudCacheDirty = true;
    return true;
  }

  public renameCoaster(coasterId: string, nextName: string): boolean {
    const entry = this.coasters.get(coasterId);
    if (!entry) return false;
    const clean = nextName.trim();
    if (clean) {
      entry.name = clean;
      this.hudCacheDirty = true;
    }
    return true;
  }

  public setCoasterColor(coasterId: string, color: string): boolean {
    const entry = this.coasters.get(coasterId);
    if (!entry) return false;
    entry.trackColor = color;
    this.rebuildEntryGeometry(entry);
    return true;
  }

  public setCoasterType(coasterId: string, coasterType: CoasterModelType): boolean {
    const entry = this.coasters.get(coasterId);
    if (!entry) return false;
    entry.coasterType = coasterType;
    if (coasterType === 'log_flume' && entry.trainCarCount > 4) {
      entry.trainCarCount = 3;
    }
    this.rebuildEntryGeometry(entry);
    return true;
  }

  public setTrainCarCount(coasterId: string, count: number): boolean {
    const entry = this.coasters.get(coasterId);
    if (!entry) return false;
    entry.trainCarCount = Math.max(1, Math.min(8, Math.round(count)));
    this.rebuildEntryGeometry(entry);
    return true;
  }

  public addNode(
    coasterId: string,
    pos: { x: number; y: number; z: number },
    bank = 0,
  ): boolean {
    const entry = this.coasters.get(coasterId);
    if (!entry) return false;
    entry.closedCircuit = false;
    const minGround = getTerrainHeight(pos.x, pos.z) + 0.9;
    entry.editor.addPoint(
      { x: pos.x, y: Math.max(minGround, pos.y), z: pos.z },
      bank,
      'coast',
    );
    this.rebuildEntryGeometry(entry);
    return true;
  }

  public updateNode(
    coasterId: string,
    index: number,
    patch: { x?: number; y?: number; z?: number; bank?: number; segmentType?: TrackSegmentType },
  ): boolean {
    const entry = this.coasters.get(coasterId);
    if (!entry || !entry.editor.nodes[index]) return false;
    const cur = entry.editor.nodes[index];
    const nx = patch.x ?? cur.position.x;
    const nz = patch.z ?? cur.position.z;
    const ny = Math.max(getTerrainHeight(nx, nz) + 0.75, patch.y ?? cur.position.y);
    entry.editor.movePoint(index, { x: nx, y: ny, z: nz });
    if (typeof patch.bank === 'number') {
      entry.editor.setBank(index, patch.bank);
    }
    if (patch.segmentType) {
      entry.editor.setSegmentType(index, patch.segmentType, cur.targetSpeed);
    }
    this.rebuildEntryGeometry(entry);
    return true;
  }

  public removeNode(coasterId: string, index: number): boolean {
    const entry = this.coasters.get(coasterId);
    if (!entry || entry.editor.nodes.length <= 2) return false;
    entry.closedCircuit = false;
    entry.editor.removePoint(index);
    this.rebuildEntryGeometry(entry);
    return true;
  }

  private getEndBasis(entry: ActiveCoasterEntry): {
    endPos: THREE.Vector3;
    yaw: number;
    endBank: number;
    endSegment: TrackSegmentType;
  } {
    const nodes = entry.editor.nodes;
    if (nodes.length === 0) {
      return {
        endPos: new THREE.Vector3(
          entry.stationPos.x,
          entry.stationPos.y + 1.25,
          entry.stationPos.z,
        ),
        yaw: 0,
        endBank: 0,
        endSegment: 'coast',
      };
    }
    const lastNode = nodes[nodes.length - 1];
    const last = lastNode.position;
    if (nodes.length === 1) {
      return {
        endPos: new THREE.Vector3(last.x, last.y, last.z),
        yaw: 0,
        endBank: lastNode.bank,
        endSegment: lastNode.segmentType ?? 'coast',
      };
    }
    const prev = nodes[nodes.length - 2].position;
    const dx = last.x - prev.x;
    const dz = last.z - prev.z;
    const horiz = Math.hypot(dx, dz);
    const yaw = horiz > 0.05 ? Math.atan2(dx, dz) : 0;
    return {
      endPos: new THREE.Vector3(last.x, last.y, last.z),
      yaw,
      endBank: lastNode.bank,
      endSegment: lastNode.segmentType ?? 'coast',
    };
  }

  private appendTransformedLocalNodes(
    entry: ActiveCoasterEntry,
    localNodes: TrackNode[],
    tag: string,
  ): void {
    entry.closedCircuit = false;
    const { endPos, yaw, endBank } = this.getEndBasis(entry);
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);

    let liftOffsetY = 0;
    const transformed: { x: number; y: number; z: number; bank: number; segmentType?: TrackSegmentType; targetSpeed?: number }[] = [];
    const startIdx = entry.editor.nodes.length > 0 ? 1 : 0;

    for (let i = startIdx; i < localNodes.length; i++) {
      const ln = localNodes[i];
      const wx = endPos.x + ln.position.x * cosY + ln.position.z * sinY;
      const wz = endPos.z - ln.position.x * sinY + ln.position.z * cosY;
      const rawY = endPos.y + ln.position.y;
      const minY = getTerrainHeight(wx, wz) + 0.95;
      if (rawY < minY) {
        liftOffsetY = Math.max(liftOffsetY, minY - rawY);
      }
      transformed.push({
        x: wx,
        y: rawY,
        z: wz,
        bank: endBank + ln.bank,
        segmentType: ln.segmentType,
        targetSpeed: ln.targetSpeed,
      });
    }

    for (let i = 0; i < transformed.length; i++) {
      const p = transformed[i];
      const ramp = transformed.length > 1 ? Math.sin((Math.PI * (i + 1)) / (transformed.length + 1)) : 1;
      const wy = Math.max(getTerrainHeight(p.x, p.z) + 0.9, p.y + liftOffsetY * Math.max(0.35, ramp));
      entry.editor.addPoint(
        { x: p.x, y: wy, z: p.z },
        p.bank,
        p.segmentType ?? 'coast',
        p.targetSpeed,
      );
    }
    entry.pieceTags.push(tag);
  }

  public appendPresetPiece(
    coasterId: string,
    pieceKey: CoasterPiecePresetKey,
  ): boolean {
    const entry = this.coasters.get(coasterId);
    if (!entry) return false;

    const { endPos, yaw } = this.getEndBasis(entry);
    const groundAtEnd = getTerrainHeight(endPos.x, endPos.z);

    let piece: TrackPiece;
    switch (pieceKey) {
      case 'chainLift':
        piece = TrackPieces.chainLift(entry.coasterType === 'wooden' ? 20 : 26, 52);
        break;
      case 'firstDrop': {
        const cosY = Math.cos(yaw);
        const sinY = Math.sin(yaw);
        const targetZ = endPos.z + 36 * cosY;
        const targetX = endPos.x + 36 * sinY;
        const terrainAhead = getTerrainHeight(targetX, targetZ);
        const availableDrop = Math.max(4, endPos.y - (terrainAhead + 4.5));
        piece = TrackPieces.firstDrop(Math.min(20, availableDrop), 38);
        break;
      }
      case 'hill':
        piece = TrackPieces.hill(entry.coasterType === 'wooden' ? 9 : 11, 34);
        break;
      case 'bankedTurn':
        piece = TrackPieces.bankedTurn(19, 90, entry.coasterType === 'wooden' ? 35 : 52);
        break;
      case 'bankedTurnLeft':
        piece = TrackPieces.bankedTurn(19, -90, entry.coasterType === 'wooden' ? 35 : 52);
        break;
      case 'helix': {
        const dropRoom = Math.max(0, endPos.y - (groundAtEnd + 6.5));
        const hDelta = dropRoom >= 7 ? -7 : 4;
        piece = TrackPieces.helix(16, hDelta, 1, 'right');
        break;
      }
      case 'verticalLoop':
        if (entry.coasterType === 'wooden') {
          piece = TrackPieces.hill(12, 35); // Wooden coasters historically rarely have inversions
        } else {
          piece = TrackPieces.verticalLoop(8.5);
        }
        break;
      case 'corkscrew':
        piece = entry.coasterType === 'wooden' ? TrackPieces.bankedTurn(18, 90, 30) : TrackPieces.corkscrew(6.8, 28);
        break;
      case 'zeroGRoll':
        piece = TrackPieces.zeroGRoll(9, 30);
        break;
      case 'immelmann':
        piece = entry.coasterType === 'wooden' ? TrackPieces.hill(10, 32) : TrackPieces.immelmann(9.5);
        break;
      case 'launch':
        piece = TrackPieces.launch(30, 30);
        break;
      case 'brake':
        piece = TrackPieces.brake(18);
        break;
      case 'splashdown':
        piece = TrackPieces.splashdown(26);
        break;
      case 'straight':
      default:
        piece = TrackPieces.straight(18);
        break;
    }

    this.appendTransformedLocalNodes(entry, piece.nodes, piece.type);
    this.rebuildEntryGeometry(entry);
    return true;
  }

  public appendCustomInversion(
    coasterId: string,
    settings: CustomInversion,
  ): boolean {
    const entry = this.coasters.get(coasterId);
    if (!entry || entry.coasterType === 'wooden') return false;
    const design = this.inversionDesigner.createInversion(settings);
    const localNodes = this.inversionDesigner.generateTrack(design);
    this.appendTransformedLocalNodes(entry, localNodes, `inversion:${design.name}`);
    this.rebuildEntryGeometry(entry);
    return true;
  }

  public completeCircuit(coasterId: string): boolean {
    const entry = this.coasters.get(coasterId);
    if (!entry || entry.editor.nodes.length < 3) return false;
    if (entry.closedCircuit) return true;

    const nodes = entry.editor.nodes;
    const s0 = new THREE.Vector3(nodes[0].position.x, nodes[0].position.y, nodes[0].position.z);
    const s1 = new THREE.Vector3(nodes[1].position.x, nodes[1].position.y, nodes[1].position.z);
    const stationDir = s1.clone().sub(s0);
    stationDir.y = 0;
    if (stationDir.lengthSq() < 0.01) stationDir.set(0, 0, 1);
    else stationDir.normalize();

    const pEnd = new THREE.Vector3(
      nodes[nodes.length - 1].position.x,
      nodes[nodes.length - 1].position.y,
      nodes[nodes.length - 1].position.z,
    );
    const pPrev = new THREE.Vector3(
      nodes[nodes.length - 2].position.x,
      nodes[nodes.length - 2].position.y,
      nodes[nodes.length - 2].position.z,
    );
    const endDir = pEnd.clone().sub(pPrev);
    endDir.y = 0;
    if (endDir.lengthSq() < 0.01) endDir.copy(stationDir);
    else endDir.normalize();

    const baseBank = nodes[nodes.length - 1].bank;
    const targetEndBank = Math.round(baseBank / 360) * 360;

    const pBrakeStart = s0.clone().addScaledVector(stationDir, -24);
    pBrakeStart.y = s0.y;
    const pBrakeMid = s0.clone().addScaledVector(stationDir, -12);
    pBrakeMid.y = s0.y;
    const pStationRear = s0.clone().addScaledVector(stationDir, -3);
    pStationRear.y = s0.y;

    const toBrake = pBrakeStart.clone().sub(pEnd);
    const flatDist = Math.hypot(toBrake.x, toBrake.z);
    const forwardDot = flatDist > 0.1 ? (toBrake.x * endDir.x + toBrake.z * endDir.z) / flatDist : 1;

    const worldUp = new THREE.Vector3(0, 1, 0);
    const endRight = new THREE.Vector3().crossVectors(endDir, worldUp).normalize();
    const waypoints: THREE.Vector3[] = [pEnd];

    const outLead = Math.max(14, Math.min(28, flatDist * 0.3));
    const wp1 = pEnd.clone().addScaledVector(endDir, outLead);
    wp1.y = Math.max(getTerrainHeight(wp1.x, wp1.z) + 1.5, THREE.MathUtils.lerp(pEnd.y, s0.y, 0.25));
    waypoints.push(wp1);

    if (forwardDot < 0.15 || flatDist < 22) {
      const sideSign = endRight.dot(toBrake) >= 0 ? 1 : -1;
      const swing = wp1
        .clone()
        .addScaledVector(endRight, sideSign * 24)
        .addScaledVector(stationDir, -14);
      swing.y = Math.max(getTerrainHeight(swing.x, swing.z) + 1.5, THREE.MathUtils.lerp(pEnd.y, s0.y, 0.6));
      waypoints.push(swing);
    }

    const wpIn = pBrakeStart.clone().addScaledVector(stationDir, -16);
    wpIn.y = Math.max(getTerrainHeight(wpIn.x, wpIn.z) + 1.3, s0.y + 0.6);
    waypoints.push(wpIn);
    waypoints.push(pBrakeStart);

    const curve = new THREE.CatmullRomCurve3(waypoints);
    const approxLen = curve.getLength();
    const curveSteps = Math.max(8, Math.min(24, Math.round(approxLen / 6.5)));

    for (let i = 1; i <= curveSteps; i++) {
      const t = i / curveSteps;
      const pt = curve.getPoint(t);
      const tan = curve.getTangent(t);
      const prevTan = curve.getTangent(Math.max(0, t - 0.06));
      const yawTurn = prevTan.x * tan.z - prevTan.z * tan.x;
      const bankStrength = THREE.MathUtils.clamp(yawTurn * 220, -45, 45);
      const envelope = Math.sin(Math.PI * t);
      const bank = THREE.MathUtils.lerp(baseBank, targetEndBank, t) + bankStrength * envelope;
      const safeY = Math.max(getTerrainHeight(pt.x, pt.z) + 1.15, pt.y);

      entry.editor.addPoint(
        { x: pt.x, y: safeY, z: pt.z },
        bank,
        i >= curveSteps - 1 ? 'trim_brake' : 'coast',
        i >= curveSteps - 1 ? 6 : undefined,
      );
    }

    entry.editor.addPoint(
      { x: pBrakeMid.x, y: Math.max(getTerrainHeight(pBrakeMid.x, pBrakeMid.z) + 1.1, pBrakeMid.y), z: pBrakeMid.z },
      targetEndBank,
      'block_brake',
      5.5,
    );
    entry.editor.addPoint(
      { x: pStationRear.x, y: Math.max(getTerrainHeight(pStationRear.x, pStationRear.z) + 1.1, pStationRear.y), z: pStationRear.z },
      targetEndBank,
      'station',
      4.8,
    );

    entry.closedCircuit = true;
    entry.pieceTags.push('circuit_return');
    this.rebuildEntryGeometry(entry);
    return true;
  }

  public dispatchTrain(coasterId: string, running?: boolean): boolean {
    const entry = this.coasters.get(coasterId);
    if (!entry) return false;
    const val = validateTrack(entry.editor.nodes);
    if (!val.valid || entry.samples.length < 2) return false;
    entry.running = typeof running === 'boolean' ? running : !entry.running;
    entry.arrivalPending = false;
    entry.arrivedAtStation = false;
    if (entry.running && entry.train.speed < 5.5) {
      entry.train.speed = themeConfig(entry.theme)?.stationSpeed ?? 6.5;
    }
    this.hudCacheDirty = true;
    return true;
  }

  public resetTrain(coasterId: string): boolean {
    const entry = this.coasters.get(coasterId);
    if (!entry) return false;
    entry.running = false;
    entry.train.position = themeConfig(entry.theme) ? entry.boardingDistance : 0;
    entry.train.speed = 0;
    entry.train.verticalG = 1;
    entry.train.lateralG = 0;
    entry.arrivalPending = false;
    entry.arrivedAtStation = true;
    this.syncTrainCarsTransform(entry);
    this.hudCacheDirty = true;
    return true;
  }

  /** Distance to the boarding platform centreline, for walk-up interaction. */
  public getBoardingProximity(
    coasterId: string,
    x: number,
    z: number,
  ): number | null {
    const entry = this.coasters.get(coasterId);
    if (!entry || entry.samples.length < 2) return null;
    let best = Number.POSITIVE_INFINITY;
    for (const sample of entry.samples) {
      if (sample.segmentType !== 'station' || sample.distance > 20) continue;
      const dx = sample.position.x - x;
      const dz = sample.position.z - z;
      best = Math.min(best, Math.hypot(dx, dz));
    }
    return Number.isFinite(best) ? best : null;
  }

  /** True once per lap, after the train has parked back at the platform. */
  public consumeStationArrival(coasterId: string): boolean {
    const entry = this.coasters.get(coasterId);
    if (!entry?.arrivedAtStation) return false;
    entry.arrivedAtStation = false;
    return true;
  }

  public isTrainAtStation(coasterId: string): boolean {
    const entry = this.coasters.get(coasterId);
    if (!entry || entry.samples.length < 2) return false;
    return (
      !entry.running &&
      Math.abs(entry.train.position - entry.boardingDistance) <= 0.5
    );
  }

  private rebuildEntryGeometry(entry: ActiveCoasterEntry): void {
    this.hudCacheDirty = true;
    entry.hudNodesCache = undefined;
    entry.validationCache = undefined;
    this.disposeEntryMesh(entry);
    entry.meshGroup = new THREE.Group();
    entry.meshGroup.name = `Coaster_${entry.id}`;

    entry.samples = entry.editor.getTrack();
    const config = themeConfig(entry.theme);
    if (config) {
      // The horizon frame keeps switchback turns and barrel rolls predictable.
      // Vertical loops need their own basis: a fixed horizontal loop-plane
      // normal rotated with the tangent. That inverts the car at the top and
      // rejoins the horizon frame upright at both ends.
      applyIslandHorizonFrames(entry.samples);
      applyLoopPlaneFrames(entry.samples);
    }
    entry.train.track = entry.samples;
    entry.boardingDistance = this.computeBoardingDistance(entry);
    entry.train.maxSpeed = config?.maxSpeed ?? Number.POSITIVE_INFINITY;
    // 8.5 m/s² clears the powered climbs with margin while staying far below
    // the old 2 g launch.
    entry.train.driveAccel = config?.driveAccel ?? 19.5;
    if (config && !entry.running) {
      entry.train.position = entry.boardingDistance;
    }
    const totalLength =
      entry.samples.length >= 2
        ? entry.samples[entry.samples.length - 1].distance
        : 0;
    entry.train.position = Math.min(entry.train.position, totalLength);

    let maxY = entry.stationPos.y;
    let invTransitions = 0;
    let wasInverted = false;
    for (const s of entry.samples) {
      if (s.position.y > maxY) maxY = s.position.y;
      const invertedNow = s.up.y < -0.35;
      if (invertedNow && !wasInverted) {
        invTransitions += 1;
      }
      wasInverted = invertedNow;
    }
    entry.maxHeightM = Math.max(0, Math.round((maxY - entry.stationPos.y) * 10) / 10);
    entry.inversionsCount = entry.coasterType === 'wooden' ? 0 : invTransitions;
    const hasLaunch = entry.samples.some((s) => s.segmentType === 'lsm_launch');
    const gravSpeed = Math.sqrt(2 * 9.81 * Math.max(1, entry.maxHeightM)) * 3.6;
    const estimated = Math.max(hasLaunch ? 108 : 0, gravSpeed);
    entry.estPeakSpeedKmh = Math.round(
      config ? Math.min(estimated, config.maxSpeed * 3.6) : estimated,
    );

    if (entry.samples.length >= 2) {
      const leftPts: THREE.Vector3[] = [];
      const rightPts: THREE.Vector3[] = [];
      const spinePts: THREE.Vector3[] = [];

      const isLogFlume = entry.coasterType === 'log_flume';
      const isInverted = entry.coasterType === 'inverted';
      const isWooden = entry.coasterType === 'wooden';
      const isVolcanoFlex = entry.theme === 'volcano_flex';

      const gaugeHalf = isLogFlume ? 0.65 : 0.46;
      const spineOffset = isInverted ? 0.48 : (isWooden ? -0.18 : -0.26);

      for (let i = 0; i < entry.samples.length; i++) {
        const s = entry.samples[i];
        const p = new THREE.Vector3(s.position.x, s.position.y, s.position.z);
        const right = new THREE.Vector3(s.right.x, s.right.y, s.right.z).normalize();
        const up = new THREE.Vector3(s.up.x, s.up.y, s.up.z).normalize();

        leftPts.push(p.clone().addScaledVector(right, -gaugeHalf));
        rightPts.push(p.clone().addScaledVector(right, gaugeHalf));
        spinePts.push(p.clone().addScaledVector(up, spineOffset));
      }

      const railMat = isVolcanoFlex
        ? new THREE.MeshPhysicalMaterial({
            color: new THREE.Color(entry.trackColor),
            roughness: 0.24,
            metalness: 0.28,
            clearcoat: 0.9,
            clearcoatRoughness: 0.08,
            envMapIntensity: 1.55,
          })
        : new THREE.MeshStandardMaterial({
            color: new THREE.Color(isWooden ? '#78350f' : entry.trackColor),
            roughness: isWooden ? 0.75 : 0.28,
            metalness: isWooden ? 0.05 : 0.72,
          });
      const spineMat = isVolcanoFlex
        ? new THREE.MeshPhysicalMaterial({
            color: 0xa1141f,
            roughness: 0.3,
            metalness: 0.3,
            clearcoat: 0.72,
            clearcoatRoughness: 0.12,
            envMapIntensity: 1.4,
          })
        : new THREE.MeshStandardMaterial({
            color: isWooden ? '#451a03' : 0x334155,
            roughness: 0.65,
            metalness: isWooden ? 0.1 : 0.78,
          });
      const tieMat = new THREE.MeshStandardMaterial({
        color: isWooden ? '#92400e' : isVolcanoFlex ? '#a3131e' : 0x1e293b,
        roughness: isWooden ? 0.8 : isVolcanoFlex ? 0.48 : 0.45,
        metalness: isWooden ? 0.05 : isVolcanoFlex ? 0.22 : 0.65,
      });
      const supportMat = new THREE.MeshStandardMaterial({
        color: isWooden ? '#57534e' : isVolcanoFlex ? '#b81724' : 0x64748b,
        roughness: isVolcanoFlex ? 0.4 : 0.6,
        metalness: isVolcanoFlex ? 0.24 : 0.4,
      });

      // The hero coaster gets a much denser sweep and rounder tubes so the
      // 900-ft helix reads as a smooth fabricated rail, not a faceted preview.
      const segCount = isVolcanoFlex
        ? Math.min(1200, Math.max(600, Math.round(totalLength * 1.6)))
        : Math.min(340, Math.max(32, Math.round(totalLength * 1.4)));
      const radialSegments = isVolcanoFlex ? 16 : 10;
      const leftCurve = new THREE.CatmullRomCurve3(leftPts);
      const rightCurve = new THREE.CatmullRomCurve3(rightPts);
      const spineCurve = new THREE.CatmullRomCurve3(spinePts);

      const railRadius = isLogFlume ? 0.14 : isVolcanoFlex ? 0.085 : isWooden ? 0.09 : 0.055;
      const leftRail = new THREE.Mesh(
        new THREE.TubeGeometry(leftCurve, segCount, railRadius, radialSegments, false),
        railMat,
      );
      const rightRail = new THREE.Mesh(
        new THREE.TubeGeometry(rightCurve, segCount, railRadius, radialSegments, false),
        railMat,
      );
      const spineTube = isLogFlume
        ? new THREE.Mesh(new THREE.TubeGeometry(spineCurve, segCount, 0.45, 10, false), new THREE.MeshStandardMaterial({ color: '#0ea5e9', roughness: 0.15, metalness: 0.3, transparent: true, opacity: 0.85 }))
        : new THREE.Mesh(new THREE.TubeGeometry(spineCurve, segCount, isVolcanoFlex ? 0.17 : isWooden ? 0.16 : 0.125, radialSegments, false), spineMat);

      leftRail.castShadow = isVolcanoFlex;
      rightRail.castShadow = isVolcanoFlex;
      spineTube.castShadow = !isLogFlume;
      entry.meshGroup.add(leftRail, rightRail, spineTube);

      const tieParts: THREE.BufferGeometry[] = [];
      const supportParts: THREE.BufferGeometry[] = [];

      const baseCrossbar = new THREE.BoxGeometry(gaugeHalf * 2 + 0.14, isWooden ? 0.14 : 0.065, 0.14);
      baseCrossbar.translate(0, isWooden ? -0.06 : -0.055, 0);

      let nextTieDist = 0;
      let nextSupportDist = 3.5;

      for (let i = 0; i < entry.samples.length; i++) {
        const s = entry.samples[i];
        const basis = makeBasisMatrix(s);
        const pos = new THREE.Vector3(s.position.x, s.position.y, s.position.z);

        if (s.distance >= nextTieDist) {
          nextTieDist = s.distance + (isWooden ? 1.2 : 1.45);
          const xform = basis.clone().setPosition(pos);
          const cBar = baseCrossbar.clone();
          cBar.applyMatrix4(xform);
          tieParts.push(cBar);

          // Wooden lattice timber bents
          if (isWooden) {
            const legL = new THREE.BoxGeometry(0.12, 1.4, 0.12);
            legL.translate(-gaugeHalf * 0.9, -0.7, 0);
            legL.applyMatrix4(xform);
            const legR = new THREE.BoxGeometry(0.12, 1.4, 0.12);
            legR.translate(gaugeHalf * 0.9, -0.7, 0);
            legR.applyMatrix4(xform);
            tieParts.push(legL, legR);
          }
        }

        if (
          entry.theme !== 'volcano_flex' &&
          s.distance >= nextSupportDist &&
          s.up.y > 0.25 &&
          Math.abs(s.tangent.y) < 0.78
        ) {
          nextSupportDist = s.distance + (isWooden ? 6.5 : 9.5);
          const groundY = getTerrainHeight(s.position.x, s.position.z);
          const pillarTop = s.position.y - 0.42;
          const pillarHeight = pillarTop - groundY;

          if (pillarHeight > 0.45) {
            const col = new THREE.CylinderGeometry(0.16, 0.22, pillarHeight, 8);
            col.translate(s.position.x, groundY + pillarHeight * 0.5, s.position.z);
            supportParts.push(col);
          }
        }
      }

      baseCrossbar.dispose();
      const mergedTies = mergeNormalizedParts(tieParts);
      if (mergedTies) {
        const tieMesh = new THREE.Mesh(mergedTies, tieMat);
        tieMesh.castShadow = isVolcanoFlex;
        entry.meshGroup.add(tieMesh);
      }
      const mergedSupports = mergeNormalizedParts(supportParts);
      if (mergedSupports) {
        const mesh = new THREE.Mesh(mergedSupports, supportMat);
        mesh.castShadow = true;
        entry.meshGroup.add(mesh);
      }

      // Build Train Cars according to CoasterModelType
      const carColor = new THREE.Color(entry.trackColor).offsetHSL(0.05, 0.08, 0.06);
      const chassisMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.38, metalness: 0.85 });

      for (let c = 0; c < entry.trainCarCount; c++) {
        if (entry.theme === 'volcano_flex' || entry.theme === 'bayou_comet') {
          const carModel =
            entry.theme === 'bayou_comet'
              ? buildBayouCometTrainCar(c, c === 0)
              : buildVolcanoFlexTrainCar(c, c === 0);
          entry.carMeshes.push(carModel);
          entry.meshGroup.add(carModel);
          continue;
        }
        const car = new THREE.Group();
        const bodyMat = new THREE.MeshStandardMaterial({
          color: isLogFlume ? '#78350f' : (c === 0 ? carColor : 0xf1f5f9),
          roughness: isLogFlume ? 0.6 : 0.24,
          metalness: isLogFlume ? 0.1 : 0.45,
        });

        if (isLogFlume) {
          const logHull = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.48, 2.1, 12), bodyMat);
          logHull.rotation.x = Math.PI * 0.5;
          logHull.position.y = 0.35;
          logHull.castShadow = true;
          car.add(logHull);
        } else if (isInverted) {
          // Inverted coaster: passenger seating hangs suspended BELOW the track
          const hanger = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.95, 0.12), chassisMat);
          hanger.position.set(0, 0.55, 0);
          car.add(hanger);

          const suspendedCabin = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.62, 1.75), bodyMat);
          suspendedCabin.position.set(0, -0.35, 0);
          suspendedCabin.castShadow = true;
          car.add(suspendedCabin);
        } else {
          const floor = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.22, 1.84), bodyMat);
          floor.position.y = entry.coasterType === 'standup' ? 0.18 : 0.28;
          floor.castShadow = true;
          car.add(floor);

          for (const seatX of [-0.24, 0.24]) {
            const seatBack = new THREE.Mesh(
              new THREE.BoxGeometry(0.36, entry.coasterType === 'standup' ? 0.75 : 0.48, 0.14),
              chassisMat,
            );
            seatBack.position.set(seatX, 0.62, -0.45);
            car.add(seatBack);
          }
        }

        entry.carMeshes.push(car);
        entry.meshGroup.add(car);
      }

      this.syncTrainCarsTransform(entry);
    }

    this.rootGroup.add(entry.meshGroup);
  }

  /**
   * Lead-car distance that keeps the whole train on the station straight.
   * The island station run is 16 m; a five-car train is 11.75 m long, so the
   * lead car parks at the end of the run minus the trailing train length.
   */
  private computeBoardingDistance(entry: ActiveCoasterEntry): number {
    if (entry.samples.length < 2) return 0;
    const config = themeConfig(entry.theme);
    if (config) {
      const total = entry.samples[entry.samples.length - 1].distance;
      return Math.max(0, Math.min(config.boardingDistance, total - 2));
    }
    let stationEnd = 0;
    for (const sample of entry.samples) {
      if (sample.segmentType === 'station') {
        stationEnd = sample.distance;
      } else if (stationEnd > 0) {
        break;
      }
    }
    if (stationEnd <= 0.5) return 0;
    return Math.max(0, stationEnd - VOLCANO_FLEX_BOARDING_SETBACK_M);
  }

  private sampleAtDistance(
    samples: TrackSample[],
    targetDist: number,
  ): TrackSample | null {
    if (samples.length === 0) return null;
    const total = samples[samples.length - 1].distance;
    const d = THREE.MathUtils.clamp(targetDist, 0, total);
    let lo = 0;
    let hi = samples.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (samples[mid].distance < d) lo = mid + 1;
      else hi = mid;
    }
    return samples[lo] || samples[samples.length - 1];
  }

  private syncTrainCarsTransform(entry: ActiveCoasterEntry): void {
    if (entry.samples.length < 2 || entry.carMeshes.length === 0) return;
    const total = entry.samples[entry.samples.length - 1].distance;
    const carSpacing = 2.35;
    const isInverted = entry.coasterType === 'inverted';

    for (let i = 0; i < entry.carMeshes.length; i++) {
      const car = entry.carMeshes[i];
      let carDist = entry.train.position - i * carSpacing;
      if (entry.closedCircuit && total > 1) {
        carDist = ((carDist % total) + total) % total;
      } else {
        carDist = Math.max(0, carDist);
      }
      const sample = this.sampleAtDistance(entry.samples, carDist);
      if (!sample) continue;

      _coasterPos.set(sample.position.x, sample.position.y, sample.position.z);
      _coasterUp.set(sample.up.x, sample.up.y, sample.up.z).normalize();
      const basis = makeBasisMatrix(sample);

      // 0.275 m puts the wheel flanges on top of the rails (0.085 m rail top
      // plus the 0.19 m wheel radius) instead of sinking them into the tube.
      const verticalOffset = themeConfig(entry.theme)
        ? isInverted ? 1.04 : 0.275
        : isInverted ? 0.95 : 0.12;
      car.position.copy(_coasterPos).addScaledVector(_coasterUp, verticalOffset);
      car.quaternion.setFromRotationMatrix(basis);
      const wheels = car.userData.wheels as THREE.Mesh[] | undefined;
      if (wheels) {
        const angle = (carDist / 0.2) % (Math.PI * 2);
        for (const wheel of wheels) wheel.rotation.x = -angle;
      }
    }
  }

  public update(dt: number, playerX?: number, playerZ?: number): void {
    this.themeElapsed += dt;
    const hasCoords = typeof playerX === 'number' && typeof playerZ === 'number';
    let themeNear = false;
    for (const entry of this.coasters.values()) {
      if (!themeConfig(entry.theme)) continue;
      const themed = this.themedEnvironments.get(entry.id);
      if (!themed) continue;
      const dx = entry.stationPos.x - (playerX ?? entry.stationPos.x);
      const dz = entry.stationPos.z - (playerZ ?? entry.stationPos.z);
      const near = !hasCoords || dx * dx + dz * dz <= 360 * 360;
      themed.setDetailVisible(near);
      if (near) themeNear = true;
    }
    if (themeNear) {
      this.themeSimAccum += dt;
      if (this.themeSimAccum >= 1 / 30) {
        for (const entry of this.coasters.values()) {
          if (!themeConfig(entry.theme)) continue;
          this.themedEnvironments
            .get(entry.id)
            ?.update(this.themeSimAccum, this.themeElapsed, entry.train.speed * 3.6);
        }
        this.themeSimAccum = 0;
      }
    } else {
      this.themeSimAccum = 0;
    }
    let anyMoved = false;
    for (const entry of this.coasters.values()) {
      if (!entry.running || entry.samples.length < 2) continue;
      const total = entry.samples[entry.samples.length - 1].distance;
      if (total <= 0.5) continue;

      // Anti-Collision Block System: Ensure trains never tailgate or crash into each other
      entry.train.update(dt);

      if (entry.train.position >= total - 0.15) {
        if (entry.closedCircuit) {
          entry.train.position = 0;
          const config = themeConfig(entry.theme);
          if (config) {
            // Roll gently through the station and park at the boarding mark
            // instead of looping straight back out at line speed.
            entry.arrivalPending = true;
            if (entry.train.speed > config.stationSpeed) {
              entry.train.speed = config.stationSpeed;
            }
          } else if (entry.train.speed < 4.5) {
            entry.train.speed = 5.2;
          }
        } else {
          entry.train.position = total;
          entry.train.speed = 0;
          entry.running = false;
        }
      }

      if (
        themeConfig(entry.theme) &&
        entry.arrivalPending &&
        entry.running &&
        entry.train.position >= entry.boardingDistance
      ) {
        entry.train.position = entry.boardingDistance;
        entry.train.speed = 0;
        entry.running = false;
        entry.arrivalPending = false;
        entry.arrivedAtStation = true;
      }

      if (hasCoords) {
        const dx = entry.stationPos.x - playerX;
        const dz = entry.stationPos.z - playerZ;
        if (dx * dx + dz * dz <= 290 * 290) {
          this.syncTrainCarsTransform(entry);
        }
      } else {
        this.syncTrainCarsTransform(entry);
      }
      anyMoved = true;
    }
    if (anyMoved) {
      this.hudCacheDirty = true;
    }
  }

  public getRideCameraTransform(coasterId: string): {
    position: THREE.Vector3;
    lookAt: THREE.Vector3;
    up: THREE.Vector3;
    coasterName: string;
    speedKmh: number;
    heightM: number;
    progressPercent: number;
    verticalG: number;
    lateralG: number;
    segmentLabel: string;
  } | null {
    const entry = this.coasters.get(coasterId);
    if (!entry || entry.samples.length < 2) return null;
    const total = entry.samples[entry.samples.length - 1].distance || 1;
    const sample = entry.train.getCurrentPosition() || entry.samples[0];

    const up = new THREE.Vector3(sample.up.x, sample.up.y, sample.up.z).normalize();
    const tangent = new THREE.Vector3(
      sample.tangent.x,
      sample.tangent.y,
      sample.tangent.z,
    ).normalize();

    // Seat eye height above the rail centreline. The island car's floor sits
    // 0.695 m above the rails, so the rider's eye is ~1.5 m up.
    const seatHeight =
      entry.coasterType === 'inverted'
        ? -0.2
        : themeConfig(entry.theme)
          ? 1.5
          : 1.15;
    const seatPos = new THREE.Vector3(
      sample.position.x,
      sample.position.y,
      sample.position.z,
    ).addScaledVector(up, seatHeight);

    const lookDist = entry.closedCircuit
      ? (entry.train.position + 8) % total
      : Math.min(total, entry.train.position + 8);
    const ahead = this.sampleAtDistance(entry.samples, lookDist);
    const lookAt = ahead
      ? new THREE.Vector3(ahead.position.x, ahead.position.y, ahead.position.z)
          .addScaledVector(new THREE.Vector3(ahead.up.x, ahead.up.y, ahead.up.z).normalize(), seatHeight)
      : seatPos.clone().addScaledVector(tangent, 10);

    return {
      position: seatPos,
      lookAt,
      up,
      coasterName: entry.name,
      speedKmh: Math.round(entry.train.speed * 3.6),
      heightM: Math.max(0, Math.round((sample.position.y - entry.stationPos.y) * 10) / 10),
      progressPercent: Math.round((entry.train.position / total) * 100),
      verticalG: entry.train.verticalG,
      lateralG: entry.train.lateralG,
      segmentLabel: getSegmentDisplayLabel(sample.segmentType),
    };
  }

  /**
   * Distance-culls track meshes and the tower detail without stopping the
   * train simulation, so approaching the park never rebuilds anything.
   */
  public setViewDistance(
    playerX: number,
    playerZ: number,
    maxTrackDist = 340,
    maxEnvironmentDist = 780,
    maxDetailDist = 360,
  ): void {
    const trackSq = maxTrackDist * maxTrackDist;
    const envSq = maxEnvironmentDist * maxEnvironmentDist;
    const detailSq = maxDetailDist * maxDetailDist;
    for (const entry of this.coasters.values()) {
      const dx = entry.stationPos.x - playerX;
      const dz = entry.stationPos.z - playerZ;
      const distSq = dx * dx + dz * dz;
      entry.meshGroup.visible = maxTrackDist > 0 && distSq <= trackSq;
      const themed = this.themedEnvironments.get(entry.id);
      if (themed) {
        themed.root.visible =
          maxEnvironmentDist > 0 &&
          (themeConfig(entry.theme) ? distSq <= envSq : distSq <= trackSq);
        themed.setDetailVisible(maxDetailDist > 0 && distSq <= detailSq);
      }
    }
  }

  public getHudSummaries(): CoasterHudSummaryItem[] {
    if (!this.hudCacheDirty && this.cachedHudSummaries) {
      return this.cachedHudSummaries;
    }
    const out: CoasterHudSummaryItem[] = [];
    for (const entry of this.coasters.values()) {
      const val =
        entry.validationCache ??
        (entry.validationCache = validateTrack(entry.editor.nodes));
      const nodes =
        entry.hudNodesCache ?? (entry.hudNodesCache = entry.editor.nodes.map(cloneNode));
      const total =
        entry.samples.length >= 2
          ? entry.samples[entry.samples.length - 1].distance
          : 0;
      const current = entry.train.getCurrentPosition();
      out.push({
        id: entry.id,
        name: entry.name,
        trackColor: entry.trackColor,
        nodeCount: entry.editor.nodes.length,
        trackLengthM: Math.round(total),
        trainCarCount: entry.trainCarCount,
        running: entry.running,
        valid: val.valid,
        validationErrors: val.errors,
        speedKmh: Math.round(entry.train.speed * 3.6),
        maxHeightM: entry.maxHeightM,
        estPeakSpeedKmh: entry.estPeakSpeedKmh,
        inversionsCount: entry.inversionsCount,
        isCompleteCircuit: entry.closedCircuit,
        verticalG: entry.train.verticalG,
        lateralG: entry.train.lateralG,
        segmentLabel: current ? getSegmentDisplayLabel(current.segmentType) : 'Load Station',
        coasterType: entry.coasterType,
        nodes,
      });
    }
    this.cachedHudSummaries = out;
    this.hudCacheDirty = false;
    return out;
  }

  public exportCoasters(): SavedCoasterData[] {
    const out: SavedCoasterData[] = [];
    for (const entry of this.coasters.values()) {
      out.push({
        id: entry.id,
        name: entry.name,
        trackColor: entry.trackColor,
        trainCarCount: entry.trainCarCount,
        stationPos: { ...entry.stationPos },
        nodes: entry.editor.nodes.map(cloneNode),
        pieceTags: [...entry.pieceTags],
        closedCircuit: entry.closedCircuit,
        coasterType: entry.coasterType,
      });
    }
    return out;
  }

  public importCoasters(list?: SavedCoasterData[]): void {
    this.clearAll();
    if (!Array.isArray(list)) return;
    for (const item of list) {
      this.addCoasterData(item);
    }
  }

  /** Adds one coaster without clearing the existing island layout. */
  public addCoasterData(item: SavedCoasterData): string | null {
    if (!item || !Array.isArray(item.nodes) || item.nodes.length < 2) return null;
    this.seq += 1;
    const editor = new CoasterEditor();
    for (const n of item.nodes) {
      editor.addPoint(
        {
          x: Number(n.position?.x) || 0,
          y: Number(n.position?.y) || 2,
          z: Number(n.position?.z) || 0,
        },
        Number(n.bank) || 0,
        n.segmentType,
        n.targetSpeed,
        n.frameMode,
      );
    }
    const requestedId = item.id || `coaster_loaded_${this.seq}`;
    const id = this.coasters.has(requestedId)
      ? `${requestedId}_${Date.now().toString(36)}`
      : requestedId;
    const entry: ActiveCoasterEntry = {
      id,
      name: item.name || `Coaster ${this.seq}`,
      trackColor: item.trackColor || TRACK_COLORS[0],
      trainCarCount: Math.max(1, Math.min(8, item.trainCarCount || 4)),
      stationPos: item.stationPos || { x: 0, y: 1, z: 0 },
      editor,
      pieceTags: Array.isArray(item.pieceTags) ? [...item.pieceTags] : [],
      closedCircuit: Boolean(item.closedCircuit),
      coasterType: item.coasterType || 'steel',
      samples: [],
      train: new CoasterTrain([]),
      running: false,
      meshGroup: new THREE.Group(),
      carMeshes: [],
             maxHeightM: 0,
      estPeakSpeedKmh: 0,
      inversionsCount: 0,
      theme: item.pieceTags?.includes(BAYOU_COMET_THEME_TAG)
        ? 'bayou_comet'
        : item.pieceTags?.includes('volcano_flex')
          ? 'volcano_flex'
          : null,
      boardingDistance: 0,
      arrivalPending: false,
      arrivedAtStation: true,
    };
    this.coasters.set(entry.id, entry);
    this.rebuildEntryGeometry(entry);
    if (!this.themedEnvironments.has(entry.id)) {
      const themed =
        entry.theme === 'bayou_comet'
          ? buildBayouCometEnvironment()
          : entry.theme === 'volcano_flex'
            ? buildVolcanoFlexEnvironment()
            : null;
      if (themed) {
        this.rootGroup.add(themed.root);
        this.themedEnvironments.set(entry.id, themed);
      }
    }
    this.hudCacheDirty = true;
    return id;
  }

  public depumpCoaster(coasterId: string): boolean {
    const entry = this.coasters.get(coasterId);
    if (!entry) return false;
    entry.editor.nodes = depumpTrack(entry.editor.nodes);
    this.rebuildEntryGeometry(entry);
    return true;
  }

  public exportCoasterCSV(coasterId: string): string {
    const entry = this.coasters.get(coasterId);
    if (!entry) return '';
    return exportTrackCSV(entry.editor.nodes);
  }

  public importCoasterCSV(coasterId: string, csvText: string): boolean {
    const entry = this.coasters.get(coasterId);
    if (!entry) return false;
    const nodes = importTrackCSV(csvText);
    if (nodes.length < 2) return false;
    entry.editor.nodes = nodes;
    this.rebuildEntryGeometry(entry);
    return true;
  }

  public dispose(): void {
    this.clearAll();
    for (const themed of this.themedEnvironments.values()) themed.dispose();
    this.themedEnvironments.clear();
    this.scene.remove(this.rootGroup);
  }
}
