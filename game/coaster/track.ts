import type {
  CoasterElementKind,
  CoasterProject,
  TrackPoint,
  TrackPointKind,
  TrackSample,
  TrackStats,
  TrackValidation,
  TrainDesign,
  Vec3,
} from './types';

const GRAVITY = 9.81;
const UP: Vec3 = { x: 0, y: 1, z: 0 };

export const TRACK_GAUGE = 1.22;

export const SECTION_LABELS: Record<TrackPointKind, string> = {
  track: 'Track',
  station: 'Station',
  chain_lift: 'Chain lift',
  cable_lift: 'Cable lift',
  launch: 'Launch',
  brake: 'Brake run',
  block_brake: 'Block brake',
  magnetic_brake: 'Magnetic brake',
  transfer: 'Transfer track',
  switch: 'Switch track',
  drop: 'Drop track',
  tilt: 'Tilt track',
};

export const ELEMENT_LIBRARY: {
  category: string;
  items: { key: CoasterElementKind; label: string; detail: string }[];
}[] = [
  {
    category: 'Track & turns',
    items: [
      { key: 'straight', label: 'Straight', detail: '8 m alignment section' },
      { key: 'turn_left', label: 'Left turn', detail: 'Smooth 90° banked curve' },
      { key: 'turn_right', label: 'Right turn', detail: 'Smooth 90° banked curve' },
      { key: 'helix_left', label: 'Left helix', detail: 'Two-turn climbing helix' },
      { key: 'helix_right', label: 'Right helix', detail: 'Two-turn descending helix' },
      { key: 'wave_turn', label: 'Wave turn', detail: 'S-bend with outward roll' },
      { key: 'overbank', label: 'Overbank', detail: '120° banked sweeping turn' },
    ],
  },
  {
    category: 'Inversions',
    items: [
      { key: 'vertical_loop', label: 'Vertical loop', detail: 'Classic 360° loop' },
      { key: 'corkscrew_left', label: 'Left corkscrew', detail: '540° corkscrew' },
      { key: 'corkscrew_right', label: 'Right corkscrew', detail: '540° corkscrew' },
      { key: 'barrel_roll', label: 'Barrel roll', detail: 'Full 360° inline roll' },
      { key: 'zero_g_roll', label: 'Zero-G roll', detail: 'Floating 360° roll' },
      { key: 'dive_loop', label: 'Dive loop', detail: 'Diving half-loop inversion' },
      { key: 'immelmann', label: 'Immelmann', detail: 'Half loop into roll-out' },
      { key: 'custom_inversion', label: 'Custom inversion', detail: 'Freeform 360° roll' },
    ],
  },
  {
    category: 'Airtime',
    items: [
      { key: 'airtime_hill', label: 'Airtime hill', detail: 'Floating parabolic crest' },
      { key: 'camelback', label: 'Camelback', detail: 'Twin airtime crests' },
      { key: 'bunny_hills', label: 'Bunny hills', detail: 'Three rapid hops' },
    ],
  },
  {
    category: 'Lifts & launches',
    items: [
      { key: 'lift_chain', label: 'Chain lift', detail: 'Rises 18 m on a chain' },
      { key: 'lift_cable', label: 'Cable lift', detail: 'Fast cable lift hill' },
      { key: 'launch', label: 'LSM launch', detail: 'Accelerates to 34 m/s' },
    ],
  },
  {
    category: 'Brakes & blocks',
    items: [
      { key: 'brake', label: 'Friction brake', detail: 'Trim brake run' },
      { key: 'block_brake', label: 'Block brake', detail: 'Adds a safety block' },
      { key: 'magnetic_brake', label: 'Magnetic brake', detail: 'Smooth magnetic stop' },
    ],
  },
  {
    category: 'Mechanical',
    items: [
      { key: 'transfer', label: 'Transfer track', detail: 'Automatic storage transfer' },
      { key: 'switch', label: 'Switch track', detail: 'Automatic route select' },
      { key: 'drop', label: 'Drop track', detail: 'Lowers and resets' },
      { key: 'tilt', label: 'Tilt track', detail: 'Tilts to vertical' },
    ],
  },
];

export function newId(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function vec(x: number, y: number, z: number): Vec3 {
  return { x, y, z };
}

export function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

export function normalize(v: Vec3): Vec3 {
  const len = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

export function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function lerpVec(a: Vec3, b: Vec3, t: number): Vec3 {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t };
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

export function createDefaultTrain(): TrainDesign {
  return {
    id: newId('train'),
    name: 'Aether Steel',
    prompt: 'A realistic four-car steel coaster train with black and red seats and lap-bar restraints',
    cars: 4,
    rowsPerCar: 2,
    seatsPerRow: 2,
    bodyStyle: 'steel',
    restraint: 'lap_bar',
    wheels: 'exposed',
    primaryColor: '#d81f26',
    secondaryColor: '#16181d',
    accentColor: '#f5c542',
    lighting: true,
    aeroFairing: true,
    notes: ['Default steel train'],
  };
}

export function createBlankProject(name = 'Untitled Coaster'): CoasterProject {
  const now = Date.now();
  const train = createDefaultTrain();
  return {
    schemaVersion: 1,
    id: newId('project'),
    name,
    createdAt: now,
    updatedAt: now,
    closed: false,
    autoBank: true,
    trackColor: '#d6dde4',
    supportColor: '#58646c',
    train,
    trainCount: 1,
    points: [
      makePoint(vec(0, 4, 0), 'station'),
      makePoint(vec(0, 4, 8), 'station'),
    ],
  };
}

export function createDefaultProject(): CoasterProject {
  const now = Date.now();
  const train = createDefaultTrain();
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
    schemaVersion: 1,
    id: newId('project'),
    name: 'Aether Loop',
    createdAt: now,
    updatedAt: now,
    closed: true,
    autoBank: true,
    trackColor: '#dbe3ea',
    supportColor: '#5d6a72',
    train,
    trainCount: 1,
    points: coords.map(([x, y, z, kind, bank]) => makePoint(vec(x, y, z), kind, bank)),
  };
}

export function makePoint(
  position: Vec3,
  kind: TrackPointKind = 'track',
  bank = 0,
  element?: CoasterElementKind,
  targetSpeed?: number,
): TrackPoint {
  return {
    id: newId('pt'),
    position: { x: position.x, y: position.y, z: position.z },
    bank,
    kind,
    element,
    targetSpeed,
  };
}

function catmullRom(p0: Vec3, p1: Vec3, p2: Vec3, p3: Vec3, u: number, alpha = 0.5): Vec3 {
  const t0 = 0;
  const t1 = t0 + Math.pow(Math.max(distance(p0, p1), 1e-5), alpha);
  const t2 = t1 + Math.pow(Math.max(distance(p1, p2), 1e-5), alpha);
  const t3 = t2 + Math.pow(Math.max(distance(p2, p3), 1e-5), alpha);
  const t = t1 + (t2 - t1) * u;
  const mix = (a: Vec3, b: Vec3, ta: number, tb: number): Vec3 => {
    const d = tb - ta || 1e-5;
    const w0 = (tb - t) / d;
    const w1 = (t - ta) / d;
    return { x: a.x * w0 + b.x * w1, y: a.y * w0 + b.y * w1, z: a.z * w0 + b.z * w1 };
  };
  const a1 = mix(p0, p1, t0, t1);
  const a2 = mix(p1, p2, t1, t2);
  const a3 = mix(p2, p3, t2, t3);
  const b1 = mix(a1, a2, t0, t2);
  const b2 = mix(a2, a3, t1, t3);
  return mix(b1, b2, t1, t2);
}

export function sampleTrack(points: TrackPoint[], closed: boolean, resolution = 14): TrackSample[] {
  if (points.length < 2) return [];
  const n = points.length;
  const segments = closed ? n : n - 1;
  const res = Math.max(2, Math.floor(resolution));
  const positions: { pos: Vec3; pointIndex: number; bank: number; kind: TrackPointKind; element?: CoasterElementKind; u: number }[] = [];
  const at = (index: number): TrackPoint => {
    if (closed) return points[((index % n) + n) % n];
    return points[clamp(index, 0, n - 1)];
  };

  for (let i = 0; i < segments; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    for (let j = 0; j < res; j++) {
      const u = j / res;
      positions.push({
        pos: catmullRom(p0.position, p1.position, p2.position, p3.position, u),
        pointIndex: i,
        bank: (p1.bank + (p2.bank - p1.bank) * smooth(u)) * (Math.PI / 180),
        kind: p1.kind,
        element: p1.element,
        u,
      });
    }
  }
  const last = at(closed ? n - 1 : n - 1);
  if (!closed) {
    positions.push({
      pos: { ...last.position },
      pointIndex: n - 1,
      bank: last.bank * (Math.PI / 180),
      kind: last.kind,
      element: last.element,
      u: 1,
    });
  }

  const count = positions.length;
  const tangents: Vec3[] = [];
  for (let i = 0; i < count; i++) {
    const prev = positions[closed ? (i - 1 + count) % count : Math.max(0, i - 1)].pos;
    const next = positions[closed ? (i + 1) % count : Math.min(count - 1, i + 1)].pos;
    let tangent = normalize({ x: next.x - prev.x, y: next.y - prev.y, z: next.z - prev.z });
    if (Math.hypot(tangent.x, tangent.y, tangent.z) < 1e-6) tangent = UP;
    tangents.push(tangent);
  }

  const rightFrames: Vec3[] = [];
  const upFrames: Vec3[] = [];
  // Parallel transport keeps an unbanked reference frame; the requested bank is
  // then applied once per sample. Feeding a banked frame back into transport
  // would accumulate roll and falsely report inversions.
  let transportRight = normalize(cross(UP, tangents[0]));
  let transportUp = normalize(cross(tangents[0], transportRight));
  for (let i = 0; i < count; i++) {
    const tangent = tangents[i];
    if (i > 0) {
      const prevTangent = tangents[i - 1];
      const axis = cross(prevTangent, tangent);
      const axisLen = Math.hypot(axis.x, axis.y, axis.z);
      if (axisLen > 1e-7) {
        const angle = Math.atan2(axisLen, dot(prevTangent, tangent));
        const k = normalize(axis);
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        const rotate = (v: Vec3): Vec3 => {
          const kv = cross(k, v);
          const kd = dot(k, v);
          return {
            x: v.x * c + kv.x * s + k.x * kd * (1 - c),
            y: v.y * c + kv.y * s + k.y * kd * (1 - c),
            z: v.z * c + kv.z * s + k.z * kd * (1 - c),
          };
        };
        transportRight = rotate(transportRight);
        transportUp = rotate(transportUp);
      }
    }
    transportRight = normalize({
      x: transportRight.x - tangent.x * dot(transportRight, tangent),
      y: transportRight.y - tangent.y * dot(transportRight, tangent),
      z: transportRight.z - tangent.z * dot(transportRight, tangent),
    });
    transportUp = normalize(cross(tangent, transportRight));
    const bank = positions[i].bank;
    const c = Math.cos(bank);
    const s = Math.sin(bank);
    rightFrames.push({
      x: transportRight.x * c - transportUp.x * s,
      y: transportRight.y * c - transportUp.y * s,
      z: transportRight.z * c - transportUp.z * s,
    });
    upFrames.push({
      x: transportUp.x * c + transportRight.x * s,
      y: transportUp.y * c + transportRight.y * s,
      z: transportUp.z * c + transportRight.z * s,
    });
  }

  const samples: TrackSample[] = [];
  let total = 0;
  for (let i = 0; i < count; i++) {
    if (i > 0) total += distance(positions[i].pos, positions[i - 1].pos);
    const prevTangent = tangents[Math.max(0, i - 1)];
    const nextTangent = tangents[Math.min(count - 1, i + 1)];
    const turn = Math.acos(clamp(dot(prevTangent, nextTangent), -1, 1));
    const span = Math.max(0.001, distance(positions[Math.max(0, i - 1)].pos, positions[Math.min(count - 1, i + 1)].pos));
    samples.push({
      position: positions[i].pos,
      tangent: tangents[i],
      right: rightFrames[i],
      up: upFrames[i],
      bank: positions[i].bank,
      distance: total,
      curvature: turn / span,
      kind: positions[i].kind,
      element: positions[i].element,
      pointIndex: positions[i].pointIndex,
    });
  }

  if (closed) {
    total += distance(positions[count - 1].pos, positions[0].pos);
    samples.push({
      ...samples[0],
      distance: total,
      pointIndex: 0,
    });
  }

  return samples;
}

export function trackLength(samples: TrackSample[]): number {
  return samples.length ? samples[samples.length - 1].distance : 0;
}

export function sampleAtDistance(samples: TrackSample[], s: number): TrackSample | null {
  if (!samples.length) return null;
  const total = trackLength(samples);
  let d = total > 0 ? ((s % total) + total) % total : 0;
  let lo = 0;
  let hi = samples.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].distance <= d) lo = mid + 1;
    else hi = mid;
  }
  const i1 = clamp(lo, 1, samples.length - 1);
  const a = samples[i1 - 1];
  const b = samples[i1];
  const span = Math.max(1e-5, b.distance - a.distance);
  const t = clamp((d - a.distance) / span, 0, 1);
  const lerp = (x: Vec3, y: Vec3): Vec3 => ({
    x: x.x + (y.x - x.x) * t,
    y: x.y + (y.y - x.y) * t,
    z: x.z + (y.z - x.z) * t,
  });
  return {
    position: lerp(a.position, b.position),
    tangent: normalize(lerp(a.tangent, b.tangent)),
    right: normalize(lerp(a.right, b.right)),
    up: normalize(lerp(a.up, b.up)),
    bank: a.bank + (b.bank - a.bank) * t,
    distance: d,
    curvature: a.curvature + (b.curvature - a.curvature) * t,
    kind: t < 0.5 ? a.kind : b.kind,
    element: t < 0.5 ? a.element : b.element,
    pointIndex: t < 0.5 ? a.pointIndex : b.pointIndex,
  };
}

export function computeTrackStats(samples: TrackSample[], pointCount: number): TrackStats {
  if (!samples.length) {
    return {
      length: 0,
      maxHeight: 0,
      minHeight: 0,
      inversions: 0,
      maxBank: 0,
      estimatedPeakSpeedKmh: 0,
      pointCount,
    };
  }
  let maxHeight = -Infinity;
  let minHeight = Infinity;
  let maxBank = 0;
  let inversions = 0;
  let inverted = false;
  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i];
    maxHeight = Math.max(maxHeight, sample.position.y);
    minHeight = Math.min(minHeight, sample.position.y);
    maxBank = Math.max(maxBank, Math.abs((sample.bank * 180) / Math.PI));
    const isInverted = sample.up.y < -0.18;
    if (isInverted && !inverted) inversions += 1;
    inverted = isInverted;
  }
  const drop = Math.max(0, maxHeight - minHeight);
  const estimatedPeakSpeedKmh = Math.sqrt(2 * GRAVITY * drop + 25) * 3.6;
  return {
    length: trackLength(samples),
    maxHeight,
    minHeight,
    inversions,
    maxBank,
    estimatedPeakSpeedKmh,
    pointCount,
  };
}

export function validateTrack(points: TrackPoint[], samples: TrackSample[], closed: boolean): TrackValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (points.length < 2) errors.push('Add at least two control points.');
  if (!samples.length) errors.push('Track has no usable geometry.');
  if (!points.some((p) => p.kind === 'station')) errors.push('Add a station section for boarding.');
  if (!closed) warnings.push('Track is open. Close the circuit before dispatching trains.');
  if (samples.some((s) => s.position.y < 0.25)) errors.push('Track passes below the ground plane.');
  if (closed) {
    const first = points[0];
    const last = points[points.length - 1];
    if (distance(first.position, last.position) > 24) {
      warnings.push('Closure spline spans more than 24 m — add control points to shape it.');
    }
  }
  if (points.length > 3) {
    for (let i = 1; i < points.length; i++) {
      if (distance(points[i - 1].position, points[i].position) < 0.4) {
        warnings.push(`Points ${i} and ${i + 1} are extremely close.`);
        break;
      }
    }
  }
  if (samples.length > 2) {
    let maxGrade = 0;
    for (let i = 1; i < samples.length; i++) {
      const ds = Math.max(0.01, samples[i].distance - samples[i - 1].distance);
      maxGrade = Math.max(maxGrade, Math.abs(samples[i].position.y - samples[i - 1].position.y) / ds);
    }
    if (maxGrade > 1.35) warnings.push('Track exceeds a 53° gradient — consider smoothing that section.');
  }
  return { ok: errors.length === 0, errors, warnings };
}

/** Auto-bank control points into their horizontal turns. */
export function autoBankPoints(points: TrackPoint[], closed: boolean): TrackPoint[] {
  if (points.length < 3) return points;
  const result = points.map((p) => ({ ...p, position: { ...p.position } }));
  const n = result.length;
  const at = (i: number) => result[closed ? ((i % n) + n) % n : clamp(i, 0, n - 1)];
  const banks: number[] = [];
  for (let i = 0; i < n; i++) {
    const prev = at(i - 1).position;
    const cur = at(i).position;
    const next = at(i + 1).position;
    const v1 = { x: cur.x - prev.x, y: 0, z: cur.z - prev.z };
    const v2 = { x: next.x - cur.x, y: 0, z: next.z - cur.z };
    const l1 = Math.hypot(v1.x, v1.z);
    const l2 = Math.hypot(v2.x, v2.z);
    if (l1 < 0.1 || l2 < 0.1) {
      banks.push(result[i].bank);
      continue;
    }
    const a1 = Math.atan2(v1.x, v1.z);
    const a2 = Math.atan2(v2.x, v2.z);
    let turn = a2 - a1;
    while (turn > Math.PI) turn -= Math.PI * 2;
    while (turn < -Math.PI) turn += Math.PI * 2;
    if (Math.abs(turn) < 0.02) {
      banks.push(0);
      continue;
    }
    const radius = Math.max(3, (l1 + l2) / 2 / Math.abs(turn));
    const speed = Math.sqrt(2 * GRAVITY * Math.max(0, 30 - cur.y)) + 6;
    const bank = Math.atan((speed * speed) / (radius * GRAVITY)) * (180 / Math.PI);
    // Positive turn (toward +X for +Z heading) is a right turn; positive bank
    // lowers the right rail, which banks into that turn.
    banks.push(clamp(Math.sign(turn) * bank, -72, 72));
  }
  for (let i = 0; i < n; i++) {
    result[i].bank = Math.round(banks[i] * 10) / 10;
  }
  return result;
}

export function updatePoint(
  points: TrackPoint[],
  id: string,
  patch: Partial<Pick<TrackPoint, 'kind' | 'bank' | 'targetSpeed' | 'element'>> & {
    position?: Partial<Vec3>;
  },
): TrackPoint[] {
  return points.map((p) =>
    p.id === id
      ? {
          ...p,
          ...patch,
          position: p.position ? { ...p.position, ...(patch.position ?? {}) } : p.position,
        }
      : p,
  );
}

export function removePoint(points: TrackPoint[], id: string): TrackPoint[] {
  return points.filter((p) => p.id !== id);
}

export function duplicatePoint(points: TrackPoint[], id: string): TrackPoint[] {
  const index = points.findIndex((p) => p.id === id);
  if (index < 0) return points;
  const src = points[index];
  const next = points[index + 1];
  const dx = next ? (next.position.x - src.position.x) * 0.35 : 4;
  const dz = next ? (next.position.z - src.position.z) * 0.35 : 0;
  const copy: TrackPoint = {
    ...src,
    id: newId('pt'),
    position: { x: src.position.x + dx, y: src.position.y + 1, z: src.position.z + dz },
  };
  return [...points.slice(0, index + 1), copy, ...points.slice(index + 1)];
}

export function alignPoints(
  points: TrackPoint[],
  axis: 'x' | 'y' | 'z',
  value: number,
): TrackPoint[] {
  return points.map((p) => ({ ...p, position: { ...p.position, [axis]: value } }));
}

function headingFromPoints(points: TrackPoint[]): Vec3 {
  if (points.length === 0) return { x: 0, y: 0, z: 1 };
  const last = points[points.length - 1].position;
  const prev = points[Math.max(0, points.length - 2)].position;
  const flat = { x: last.x - prev.x, y: 0, z: last.z - prev.z };
  if (Math.hypot(flat.x, flat.z) < 0.05) return { x: 0, y: 0, z: 1 };
  return normalize(flat);
}

export interface ElementOptions {
  length?: number;
  height?: number;
  radius?: number;
  targetSpeed?: number;
}

/**
 * Appends a shaped element from the end of the current track. The returned
 * points always advance smoothly from the last point and never contain
 * duplicates; the caller controls circuit closure.
 */
export function appendElement(
  points: TrackPoint[],
  element: CoasterElementKind,
  options: ElementOptions = {},
): TrackPoint[] {
  const base = points.length > 0 ? points : [makePoint(vec(0, 4, 0), 'station')];
  const last = base[base.length - 1];
  const p = last.position;
  const dir = headingFromPoints(base);
  const right = normalize(cross(UP, dir));
  const created: TrackPoint[] = [];
  const kind: TrackPointKind =
    element === 'lift_chain'
      ? 'chain_lift'
      : element === 'lift_cable'
        ? 'cable_lift'
        : element === 'launch'
          ? 'launch'
          : element === 'brake'
            ? 'brake'
            : element === 'block_brake'
              ? 'block_brake'
              : element === 'magnetic_brake'
                ? 'magnetic_brake'
                : element === 'transfer'
                  ? 'transfer'
                  : element === 'switch'
                    ? 'switch'
                    : element === 'drop'
                      ? 'drop'
                      : element === 'tilt'
                        ? 'tilt'
                        : 'track';
  const add = (forward: number, lateral: number, lift: number, bank: number, sectionKind = kind) => {
    created.push(
      makePoint(
        vec(p.x + dir.x * forward + right.x * lateral, p.y + lift, p.z + dir.z * forward + right.z * lateral),
        sectionKind,
        bank,
        element,
        options.targetSpeed,
      ),
    );
  };

  switch (element) {
    case 'straight': {
      const len = options.length ?? 8;
      add(len, 0, 0, last.bank, 'track');
      break;
    }
    case 'turn_left':
    case 'turn_right': {
      const side = element === 'turn_right' ? 1 : -1;
      const radius = options.radius ?? 16;
      for (let i = 1; i <= 7; i++) {
        const a = (i / 7) * (Math.PI / 2);
        add(radius * Math.sin(a), side * radius * (1 - Math.cos(a)), 0, side * 34 * (i / 7), 'track');
      }
      break;
    }
    case 'helix_left':
    case 'helix_right': {
      const side = element === 'helix_right' ? 1 : -1;
      const radius = options.radius ?? 15;
      const rise = options.height ?? 15;
      for (let i = 1; i <= 14; i++) {
        const a = (i / 14) * Math.PI * 4;
        add(
          radius * Math.sin(a),
          side * radius * (1 - Math.cos(a)),
          (rise * i) / 14,
          side * 30,
          'track',
        );
      }
      break;
    }
    case 'vertical_loop': {
      const radius = options.radius ?? 8;
      for (let i = 1; i <= 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        add(radius * Math.sin(a) + i * 0.5, 0, radius * (1 - Math.cos(a)), 0, 'track');
      }
      break;
    }
    case 'corkscrew_left':
    case 'corkscrew_right': {
      const side = element === 'corkscrew_right' ? 1 : -1;
      const len = options.length ?? 17;
      for (let i = 1; i <= 10; i++) {
        const f = i / 10;
        add(f * len, side * 2.6 * Math.sin(Math.PI * f), 2.4 * Math.sin(Math.PI * f), side * 540 * f, 'track');
      }
      break;
    }
    case 'barrel_roll': {
      const len = options.length ?? 15;
      for (let i = 1; i <= 8; i++) {
        const f = i / 8;
        add(f * len, 0, 2.2 * Math.sin(Math.PI * f), 360 * f, 'track');
      }
      break;
    }
    case 'zero_g_roll': {
      const len = options.length ?? 18;
      for (let i = 1; i <= 8; i++) {
        const f = i / 8;
        add(f * len, 0, 3.1 * Math.sin(Math.PI * f), 360 * f, 'track');
      }
      break;
    }
    case 'airtime_hill': {
      const len = options.length ?? 22;
      const height = options.height ?? 10;
      for (let i = 1; i <= 6; i++) {
        const f = i / 6;
        add(f * len, 0, Math.sin(Math.PI * f) * height, last.bank, 'track');
      }
      break;
    }
    case 'camelback': {
      const len = options.length ?? 34;
      const height = options.height ?? 9;
      for (let i = 1; i <= 8; i++) {
        const f = i / 8;
        add(f * len, 0, Math.sin(Math.PI * f * 2) * height, last.bank, 'track');
      }
      break;
    }
    case 'bunny_hills': {
      const len = options.length ?? 26;
      const height = options.height ?? 4.5;
      for (let i = 1; i <= 12; i++) {
        const f = i / 12;
        add(f * len, 0, Math.abs(Math.sin(Math.PI * f * 3)) * height, last.bank, 'track');
      }
      break;
    }
    case 'wave_turn': {
      const len = options.length ?? 20;
      for (let i = 1; i <= 8; i++) {
        const f = i / 8;
        add(f * len, Math.sin(Math.PI * 2 * f) * 5, 1.2 * Math.sin(Math.PI * f), 38 * Math.sin(Math.PI * f), 'track');
      }
      break;
    }
    case 'overbank': {
      const radius = options.radius ?? 19;
      for (let i = 1; i <= 9; i++) {
        const f = i / 9;
        const a = f * (Math.PI * 0.66);
        add(radius * Math.sin(a), radius * (1 - Math.cos(a)), 2 * Math.sin(Math.PI * f), 100 * f, 'track');
      }
      break;
    }
    case 'dive_loop': {
      const height = options.height ?? 12;
      for (let i = 1; i <= 9; i++) {
        const f = i / 9;
        add(6 * f, 4 * Math.sin(Math.PI * f), Math.sin(Math.PI * f) * height, 170 * f, 'track');
      }
      break;
    }
    case 'immelmann': {
      for (let i = 1; i <= 10; i++) {
        const f = i / 10;
        const a = f * Math.PI;
        add(4 * f + 2.5 * Math.sin(a), 0, 9 * (1 - Math.cos(a)), 180 * f, 'track');
      }
      break;
    }
    case 'custom_inversion': {
      const len = options.length ?? 16;
      const height = options.height ?? 5;
      for (let i = 1; i <= 10; i++) {
        const f = i / 10;
        add(f * len, 3.5 * Math.sin(Math.PI * f), Math.sin(Math.PI * f) * height, 360 * f, 'track');
      }
      break;
    }
    case 'lift_chain':
    case 'lift_cable': {
      const rise = options.height ?? (element === 'lift_cable' ? 20 : 18);
      const len = options.length ?? 30;
      for (let i = 1; i <= 3; i++) {
        const f = i / 3;
        add(f * len, 0, f * rise, 0, kind);
      }
      break;
    }
    case 'launch': {
      const length = options.length ?? 18;
      for (let i = 1; i <= 3; i++) add((length * i) / 3, 0, 0, 0, 'launch');
      break;
    }
    case 'brake':
    case 'block_brake':
    case 'magnetic_brake': {
      const len = element === 'block_brake' ? 10 : 12;
      add(len * 0.5, 0, 0, 0, kind);
      add(len, 0, 0, 0, kind);
      break;
    }
    case 'transfer': {
      add(4, 0, 0, 0, 'transfer');
      add(8, 0, 0, 0, 'transfer');
      break;
    }
    case 'switch': {
      add(3, 0, 0, 0, 'switch');
      add(6, 2.4, 0, 0, 'switch');
      break;
    }
    case 'drop': {
      add(2, 0, 0, 0, 'drop');
      add(3.6, 0, -(options.height ?? 8), 0, 'drop');
      break;
    }
    case 'tilt': {
      add(2, 0, 0, 0, 'tilt');
      add(4, 0, 0, 90, 'tilt');
      break;
    }
    default:
      add(8, 0, 0, last.bank, 'track');
  }

  return [...base, ...created];
}

export function closeCircuit(points: TrackPoint[]): TrackPoint[] {
  if (points.length < 3) return points;
  const first = points[0];
  const last = points[points.length - 1];
  if (distance(last.position, first.position) < 0.8) return points;
  return [
    ...points,
    {
      ...first,
      id: newId('pt'),
      position: { ...first.position },
      bank: last.bank,
      element: undefined,
    },
  ];
}

export function projectWithAutoBank(project: CoasterProject): CoasterProject {
  if (!project.autoBank) return project;
  return { ...project, points: autoBankPoints(project.points, project.closed) };
}
