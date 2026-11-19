import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  CoasterHudSummaryItem,
  CoasterModelType,
  SavedCoasterData,
  SavedCoasterNode,
} from '../types';
import { getTerrainHeight } from '../world/terrain';
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
  };
}

function makeBasisMatrix(sample: TrackSample): THREE.Matrix4 {
  const right = new THREE.Vector3(sample.right.x, sample.right.y, sample.right.z).normalize();
  const up = new THREE.Vector3(sample.up.x, sample.up.y, sample.up.z).normalize();
  const fwd = new THREE.Vector3(sample.tangent.x, sample.tangent.y, sample.tangent.z).normalize();
  return new THREE.Matrix4().makeBasis(right, up, fwd);
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

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.rootGroup.name = 'RollerCoasterRuntimeRoot';
    this.scene.add(this.rootGroup);
  }

  public clearAll(): void {
    for (const entry of this.coasters.values()) {
      this.disposeEntryMesh(entry);
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
    if (entry.running && entry.train.speed < 5.5) {
      entry.train.speed = 6.5;
    }
    this.hudCacheDirty = true;
    return true;
  }

  public resetTrain(coasterId: string): boolean {
    const entry = this.coasters.get(coasterId);
    if (!entry) return false;
    entry.running = false;
    entry.train.position = 0;
    entry.train.speed = 0;
    entry.train.verticalG = 1;
    entry.train.lateralG = 0;
    this.syncTrainCarsTransform(entry);
    this.hudCacheDirty = true;
    return true;
  }

  private rebuildEntryGeometry(entry: ActiveCoasterEntry): void {
    this.hudCacheDirty = true;
    this.disposeEntryMesh(entry);
    entry.meshGroup = new THREE.Group();
    entry.meshGroup.name = `Coaster_${entry.id}`;

    entry.samples = entry.editor.getTrack();
    entry.train.track = entry.samples;
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
    entry.estPeakSpeedKmh = Math.round(Math.max(hasLaunch ? 108 : 0, gravSpeed));

    if (entry.samples.length >= 2) {
      const leftPts: THREE.Vector3[] = [];
      const rightPts: THREE.Vector3[] = [];
      const spinePts: THREE.Vector3[] = [];

      const isLogFlume = entry.coasterType === 'log_flume';
      const isInverted = entry.coasterType === 'inverted';
      const isWooden = entry.coasterType === 'wooden';

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

      const railMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(isWooden ? '#78350f' : entry.trackColor),
        roughness: isWooden ? 0.75 : 0.28,
        metalness: isWooden ? 0.05 : 0.72,
      });
      const spineMat = new THREE.MeshStandardMaterial({
        color: isWooden ? '#451a03' : 0x334155,
        roughness: 0.65,
        metalness: isWooden ? 0.1 : 0.78,
      });
      const tieMat = new THREE.MeshStandardMaterial({
        color: isWooden ? '#92400e' : 0x1e293b,
        roughness: isWooden ? 0.8 : 0.45,
        metalness: isWooden ? 0.05 : 0.65,
      });
      const supportMat = new THREE.MeshStandardMaterial({
        color: isWooden ? '#57534e' : 0x64748b,
        roughness: 0.6,
        metalness: 0.4,
      });

      const segCount = Math.min(340, Math.max(32, Math.round(totalLength * 1.4)));
      const leftCurve = new THREE.CatmullRomCurve3(leftPts);
      const rightCurve = new THREE.CatmullRomCurve3(rightPts);
      const spineCurve = new THREE.CatmullRomCurve3(spinePts);

      const leftRail = new THREE.Mesh(
        new THREE.TubeGeometry(leftCurve, segCount, isLogFlume ? 0.14 : (isWooden ? 0.09 : 0.055), 10, false),
        railMat,
      );
      const rightRail = new THREE.Mesh(
        new THREE.TubeGeometry(rightCurve, segCount, isLogFlume ? 0.14 : (isWooden ? 0.09 : 0.055), 10, false),
        railMat,
      );
      const spineTube = isLogFlume
        ? new THREE.Mesh(new THREE.TubeGeometry(spineCurve, segCount, 0.45, 10, false), new THREE.MeshStandardMaterial({ color: '#0ea5e9', roughness: 0.15, metalness: 0.3, transparent: true, opacity: 0.85 }))
        : new THREE.Mesh(new THREE.TubeGeometry(spineCurve, segCount, isWooden ? 0.16 : 0.125, 10, false), spineMat);

      leftRail.castShadow = false;
      rightRail.castShadow = false;
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

        if (s.distance >= nextSupportDist && s.up.y > 0.25 && Math.abs(s.tangent.y) < 0.78) {
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
        entry.meshGroup.add(new THREE.Mesh(mergedTies, tieMat));
      }
      const mergedSupports = mergeNormalizedParts(supportParts);
      if (mergedSupports) {
        const mesh = new THREE.Mesh(mergedSupports, supportMat);
        mesh.castShadow = true;
        entry.meshGroup.add(mesh);
      }

      // Build Train Cars according to CoasterModelType
      const carColor = new THREE.Color(entry.trackColor).offsetHSL(0.05, 0.08, 0.06);
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.45, metalness: 0.78 });
      const chassisMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.38, metalness: 0.85 });

      for (let c = 0; c < entry.trainCarCount; c++) {
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

      const pos = new THREE.Vector3(sample.position.x, sample.position.y, sample.position.z);
      const up = new THREE.Vector3(sample.up.x, sample.up.y, sample.up.z).normalize();
      const basis = makeBasisMatrix(sample);

      const verticalOffset = isInverted ? 0.95 : 0.12;
      car.position.copy(pos).addScaledVector(up, verticalOffset);
      car.quaternion.setFromRotationMatrix(basis);
    }
  }

  public update(dt: number): void {
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
          if (entry.train.speed < 4.5) entry.train.speed = 5.2;
        } else {
          entry.train.position = total;
          entry.train.speed = 0;
          entry.running = false;
        }
      }

      this.syncTrainCarsTransform(entry);
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

    const seatHeight = entry.coasterType === 'inverted' ? -0.2 : 1.15;
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

  public getHudSummaries(): CoasterHudSummaryItem[] {
    if (!this.hudCacheDirty && this.cachedHudSummaries) {
      return this.cachedHudSummaries;
    }
    const out: CoasterHudSummaryItem[] = [];
    for (const entry of this.coasters.values()) {
      const val = validateTrack(entry.editor.nodes);
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
        nodes: entry.editor.nodes.map(cloneNode),
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
      if (!item || !Array.isArray(item.nodes) || item.nodes.length === 0) continue;
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
        );
      }
      const entry: ActiveCoasterEntry = {
        id: item.id || `coaster_loaded_${++this.seq}`,
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
      };
      this.coasters.set(entry.id, entry);
      this.rebuildEntryGeometry(entry);
    }
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
    this.scene.remove(this.rootGroup);
  }
}
