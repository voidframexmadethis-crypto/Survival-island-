import {
  DEFAULT_COASTER_TYPE_ID,
  DEFAULT_MANUFACTURER_ID,
} from './catalog';
import type {
  CameraPose,
  CoasterElementKind,
  CoasterProject,
  ManualSupport,
  SupportSettings,
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
  unload_station: 'Unload station',
  storage: 'Storage track',
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
      { key: 's_bend_left', label: 'Left S-bend', detail: 'Linked left/right transition' },
      { key: 's_bend_right', label: 'Right S-bend', detail: 'Linked right/left transition' },
      { key: 'banked_turn_left', label: 'Banked left turn', detail: '45° heartline-banked turn' },
      { key: 'banked_turn_right', label: 'Banked right turn', detail: '45° heartline-banked turn' },
      { key: 'overbanked_turn_left', label: 'Overbanked left', detail: '120° overbanked sweep' },
      { key: 'overbanked_turn_right', label: 'Overbanked right', detail: '120° overbanked sweep' },
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
      { key: 'immelmann', label: 'Immelmann', detail: 'Half loop into roll-out' },
      { key: 'dive_loop', label: 'Dive loop', detail: 'Diving half-loop inversion' },
      { key: 'cobra_roll', label: 'Cobra roll', detail: 'Twin half-loops with roll' },
      { key: 'corkscrew_left', label: 'Left corkscrew', detail: '540° corkscrew' },
      { key: 'corkscrew_right', label: 'Right corkscrew', detail: '540° corkscrew' },
      { key: 'barrel_roll', label: 'Barrel roll', detail: 'Full 360° inline roll' },
      { key: 'zero_g_roll', label: 'Zero-G roll', detail: 'Floating 360° roll' },
      { key: 'heartline_roll', label: 'Heartline roll', detail: 'Roll around the heartline' },
      { key: 'inline_twist', label: 'Inline twist', detail: 'Compact 360° twist' },
      { key: 'flying_transition', label: 'Flying transition', detail: 'Prone roll into a dive' },
      { key: 'custom_inversion', label: 'Custom inversion', detail: 'Freeform 360° roll' },
    ],
  },
  {
    category: 'Airtime & drops',
    items: [
      { key: 'airtime_hill', label: 'Airtime hill', detail: 'Floating parabolic crest' },
      { key: 'camelback', label: 'Camelback', detail: 'Twin airtime crests' },
      { key: 'bunny_hills', label: 'Bunny hills', detail: 'Three rapid hops' },
      { key: 'double_up', label: 'Double-up', detail: 'Two climbing airtime crests' },
      { key: 'double_down', label: 'Double-down', detail: 'Two descending airtime crests' },
      { key: 'steep_drop', label: 'Steep drop', detail: '70° first-drop profile' },
      { key: 'beyond_vertical_drop', label: 'Beyond-vertical drop', detail: '105° overhung drop' },
      { key: 'dive_track', label: 'Dive track', detail: 'Hold, plunge and pull-out' },
      { key: 'vertical_track', label: 'Vertical track', detail: 'True vertical climb/drop' },
      { key: 'spike', label: 'Spike track', detail: 'Vertical spike and return crest' },
    ],
  },
  {
    category: 'Lifts & launches',
    items: [
      { key: 'lift_chain', label: 'Chain lift', detail: 'Rises 18 m on a chain' },
      { key: 'lift_cable', label: 'Cable lift', detail: 'Fast cable lift hill' },
      { key: 'launch', label: 'Launch section', detail: 'Configurable target speed' },
      { key: 'launch_tire', label: 'Tire launch', detail: 'Drive-tire launch to 28 m/s' },
      { key: 'launch_magnetic', label: 'Magnetic launch', detail: 'Magnetic drive launch' },
      { key: 'launch_lsm', label: 'LSM launch', detail: 'Linear synchronous launch' },
      { key: 'launch_hydraulic', label: 'Hydraulic launch', detail: 'High-acceleration cable launch' },
      { key: 'swing_launch', label: 'Swing launch', detail: 'Multi-pass launch staging profile' },
    ],
  },
  {
    category: 'Brakes & blocks',
    items: [
      { key: 'brake', label: 'Brake run', detail: 'Configurable trim brake run' },
      { key: 'brake_friction', label: 'Friction brake', detail: 'Classic clamped brake run' },
      { key: 'brake_block', label: 'Block brake', detail: 'Adds a safety block' },
      { key: 'brake_magnetic', label: 'Magnetic brake', detail: 'Smooth eddy-current stop' },
      { key: 'magnetic_brake', label: 'Magnetic trim', detail: 'Smooth magnetic trim' },
      { key: 'block_brake', label: 'Block section', detail: 'Adds a safety block' },
    ],
  },
  {
    category: 'Stations & mechanical',
    items: [
      { key: 'station', label: 'Loading station', detail: '8 m boarding platform section' },
      { key: 'unload_station', label: 'Unload station', detail: 'Separate alighting platform' },
      { key: 'storage_track', label: 'Storage track', detail: 'Parked-train storage spur' },
      { key: 'transfer', label: 'Transfer track', detail: 'Automatic storage transfer' },
      { key: 'transfer_track', label: 'Transfer table', detail: 'Automatic storage transfer' },
      { key: 'switch', label: 'Switch track', detail: 'Automatic route select' },
      { key: 'switch_track', label: 'Switch section', detail: 'Automatic route select' },
      { key: 'drop', label: 'Drop track', detail: 'Lowers and resets' },
      { key: 'drop_track', label: 'Drop section', detail: 'Lowers and resets' },
      { key: 'tilt', label: 'Tilt track', detail: 'Tilts to vertical' },
      { key: 'tilt_track', label: 'Tilt section', detail: 'Tilts to vertical' },
      { key: 'movable_track', label: 'Movable track', detail: 'Tilting maintenance section' },
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
    chassisStyle: 'open',
    noseStyle: 'rounded',
    seatMaterial: 'padded',
    restraint: 'lap_bar',
    wheels: 'exposed',
    wheelColor: '#202329',
    primaryColor: '#d81f26',
    secondaryColor: '#16181d',
    accentColor: '#f5c542',
    lighting: true,
    aeroFairing: true,
    notes: ['Default steel train'],
  };
}

export function createDefaultSupportSettings(): SupportSettings {
  return {
    auto: true,
    material: 'steel',
    crossBrace: true,
    manual: [],
  };
}

export function createDefaultCameraPose(): CameraPose {
  return {
    projection: 'perspective',
    position: { x: 54, y: 40, z: 74 },
    target: { x: 0, y: 8, z: 26 },
    rideMode: 'free',
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
    manufacturerId: DEFAULT_MANUFACTURER_ID,
    coasterTypeId: DEFAULT_COASTER_TYPE_ID,
    editingMode: 'beginner',
    splineResolution: 14,
    supports: createDefaultSupportSettings(),
    camera: createDefaultCameraPose(),
    points: [
      makePoint(vec(0, 4, 0), 'station'),
      makePoint(vec(0, 4, 8), 'station'),
    ],
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

function hermitePoint(p0: Vec3, m0: Vec3, p1: Vec3, m1: Vec3, u: number): Vec3 {
  const u2 = u * u;
  const u3 = u2 * u;
  const h00 = 2 * u3 - 3 * u2 + 1;
  const h10 = u3 - 2 * u2 + u;
  const h01 = -2 * u3 + 3 * u2;
  const h11 = u3 - u2;
  return {
    x: p0.x * h00 + m0.x * h10 + p1.x * h01 + m1.x * h11,
    y: p0.y * h00 + m0.y * h10 + p1.y * h01 + m1.y * h11,
    z: p0.z * h00 + m0.z * h10 + p1.z * h01 + m1.z * h11,
  };
}

export function autoTangentFor(points: TrackPoint[], index: number, closed: boolean): Vec3 {
  const n = points.length;
  const at = (i: number) => points[closed ? ((i % n) + n) % n : clamp(i, 0, n - 1)];
  const prev = at(index - 1).position;
  const point = at(index).position;
  const next = at(index + 1).position;
  const before = distance(prev, point);
  const after = distance(point, next);
  const direction = normalize({
    x: next.x - prev.x,
    y: next.y - prev.y,
    z: next.z - prev.z,
  });
  const handleLength = clamp((before + after) / 6, 1.2, 18);
  return { x: direction.x * handleLength, y: direction.y * handleLength, z: direction.z * handleLength };
}

export function sampleTrack(
  points: TrackPoint[],
  closed: boolean,
  resolution = 14,
): TrackSample[] {
  if (points.length < 2) return [];
  const n = points.length;
  const segments = closed ? n : n - 1;
  const res = Math.max(2, Math.floor(resolution));
  const positions: { pos: Vec3; pointIndex: number; bank: number; kind: TrackPointKind; element?: CoasterElementKind; u: number }[] = [];
  const at = (index: number): TrackPoint => {
    if (closed) return points[((index % n) + n) % n];
    return points[clamp(index, 0, n - 1)];
  };
  const hasHandles = points.some((point) => point.tangentIn || point.tangentOut);
  const tangentOut = (index: number): Vec3 => {
    const point = at(index);
    return point.tangentOut ?? autoTangentFor(points, ((index % n) + n) % n, closed);
  };
  const tangentIn = (index: number): Vec3 => {
    const point = at(index);
    return point.tangentIn ?? autoTangentFor(points, ((index % n) + n) % n, closed);
  };

  for (let i = 0; i < segments; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    for (let j = 0; j < res; j++) {
      const u = j / res;
      positions.push({
        pos: hasHandles
          ? hermitePoint(p1.position, tangentOut(i), p2.position, tangentIn(i + 1), u)
          : catmullRom(p0.position, p1.position, p2.position, p3.position, u),
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
      estimatedMaxLateralG: 0,
      estimatedMaxVerticalG: 0,
      pointCount,
    };
  }
  let maxHeight = -Infinity;
  let minHeight = Infinity;
  let maxBank = 0;
  let inversions = 0;
  let estimatedMaxLateralG = 0;
  let estimatedMaxVerticalG = 0;
  let inverted = false;
  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i];
    maxHeight = Math.max(maxHeight, sample.position.y);
    minHeight = Math.min(minHeight, sample.position.y);
    maxBank = Math.max(maxBank, Math.abs((sample.bank * 180) / Math.PI));
    const isInverted = sample.up.y < -0.18;
    if (isInverted && !inverted) inversions += 1;
    inverted = isInverted;
    const localDrop = Math.max(0, maxHeight - sample.position.y);
    const localSpeed = Math.sqrt(2 * GRAVITY * localDrop + 25);
    const lateral = (localSpeed * localSpeed * sample.curvature) / GRAVITY;
    estimatedMaxLateralG = Math.max(estimatedMaxLateralG, lateral);
    estimatedMaxVerticalG = Math.max(estimatedMaxVerticalG, Math.abs(1 + lateral * sample.up.y));
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
    estimatedMaxLateralG,
    estimatedMaxVerticalG,
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

export function segmentEndIndex(points: TrackPoint[], index: number, closed: boolean): number {
  if (index < 0 || index >= points.length) return -1;
  if (index + 1 < points.length) return index + 1;
  return closed && points.length > 2 ? 0 : -1;
}

export interface SegmentMetrics {
  start: Vec3;
  end: Vec3;
  length: number;
  pitch: number;
  yaw: number;
  height: number;
  curvature: number;
}

export function segmentMetrics(points: TrackPoint[], index: number, closed: boolean): SegmentMetrics | null {
  const endIndex = segmentEndIndex(points, index, closed);
  if (endIndex < 0) return null;
  const start = points[index].position;
  const end = points[endIndex].position;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dz = end.z - start.z;
  const length = Math.max(0.001, Math.hypot(dx, dy, dz));
  const horizontal = Math.max(0.001, Math.hypot(dx, dz));
  return {
    start: { ...start },
    end: { ...end },
    length,
    pitch: (Math.atan2(dy, horizontal) * 180) / Math.PI,
    yaw: (Math.atan2(dx, dz) * 180) / Math.PI,
    height: end.y,
    curvature: (Math.abs(dy) / length) * 100,
  };
}

function rotateVectorAroundAxis(v: Vec3, axis: Vec3, radians: number): Vec3 {
  const k = normalize(axis);
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  const kv = cross(k, v);
  const kd = dot(k, v);
  return {
    x: v.x * c + kv.x * s + k.x * kd * (1 - c),
    y: v.y * c + kv.y * s + k.y * kd * (1 - c),
    z: v.z * c + kv.z * s + k.z * kd * (1 - c),
  };
}

export function moveSegmentEnd(points: TrackPoint[], index: number, end: Vec3, closed: boolean): TrackPoint[] {
  const endIndex = segmentEndIndex(points, index, closed);
  if (endIndex < 0) return points;
  return points.map((point, pointIndex) =>
    pointIndex === endIndex ? { ...point, position: { ...end } } : point,
  );
}

export function setSegmentLengthBetween(
  points: TrackPoint[],
  index: number,
  length: number,
  closed: boolean,
): TrackPoint[] {
  const endIndex = segmentEndIndex(points, index, closed);
  if (endIndex < 0) return points;
  const start = points[index].position;
  const end = points[endIndex].position;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dz = end.z - start.z;
  const current = Math.hypot(dx, dy, dz);
  if (current < 1e-5) return points;
  const scale = clamp(length, 0.25, 500) / current;
  return moveSegmentEnd(
    points,
    index,
    { x: start.x + dx * scale, y: start.y + dy * scale, z: start.z + dz * scale },
    closed,
  );
}

export function rotateSegmentYaw(
  points: TrackPoint[],
  index: number,
  degrees: number,
  closed: boolean,
): TrackPoint[] {
  const endIndex = segmentEndIndex(points, index, closed);
  if (endIndex < 0) return points;
  const start = points[index].position;
  const end = points[endIndex].position;
  const v = { x: end.x - start.x, y: end.y - start.y, z: end.z - start.z };
  const rotated = rotateVectorAroundAxis(v, UP, (degrees * Math.PI) / 180);
  return moveSegmentEnd(
    points,
    index,
    { x: start.x + rotated.x, y: start.y + rotated.y, z: start.z + rotated.z },
    closed,
  );
}

export function pitchSegment(
  points: TrackPoint[],
  index: number,
  degrees: number,
  closed: boolean,
): TrackPoint[] {
  const endIndex = segmentEndIndex(points, index, closed);
  if (endIndex < 0) return points;
  const start = points[index].position;
  const end = points[endIndex].position;
  const v = { x: end.x - start.x, y: end.y - start.y, z: end.z - start.z };
  const flat = normalize({ x: v.x, y: 0, z: v.z });
  const right = Math.hypot(flat.x, flat.z) > 1e-4 ? normalize(cross(UP, flat)) : { x: 1, y: 0, z: 0 };
  const rotated = rotateVectorAroundAxis(v, right, -(degrees * Math.PI) / 180);
  return moveSegmentEnd(
    points,
    index,
    { x: start.x + rotated.x, y: start.y + rotated.y, z: start.z + rotated.z },
    closed,
  );
}

export function curveSegment(
  points: TrackPoint[],
  index: number,
  offset: number,
  closed: boolean,
): TrackPoint[] {
  const endIndex = segmentEndIndex(points, index, closed);
  if (endIndex < 0) return points;
  const start = points[index].position;
  const end = points[endIndex].position;
  const direction = normalize({ x: end.x - start.x, y: 0, z: end.z - start.z });
  const right = Math.hypot(direction.x, direction.z) > 1e-4 ? normalize(cross(UP, direction)) : { x: 1, y: 0, z: 0 };
  const shift = clamp(offset, -40, 40);
  return moveSegmentEnd(
    points,
    index,
    { x: end.x + right.x * shift, y: end.y, z: end.z + right.z * shift },
    closed,
  );
}

export function autoTangents(points: TrackPoint[], closed: boolean): TrackPoint[] {
  return points.map((point, index) => {
    const tangent = autoTangentFor(points, index, closed);
    return { ...point, tangentOut: tangent, tangentIn: { ...tangent } };
  });
}

export function setPointTangent(points: TrackPoint[], index: number, tangent: Vec3): TrackPoint[] {
  if (!points[index]) return points;
  return points.map((point, pointIndex) =>
    pointIndex === index
      ? { ...point, tangentOut: { ...tangent }, tangentIn: { ...tangent } }
      : point,
  );
}

export function insertControlPoint(points: TrackPoint[], index: number, closed: boolean): TrackPoint[] {
  const endIndex = segmentEndIndex(points, index, closed);
  if (endIndex < 0) return points;
  const start = points[index];
  const end = points[endIndex];
  const position = {
    x: (start.position.x + end.position.x) / 2,
    y: (start.position.y + end.position.y) / 2,
    z: (start.position.z + end.position.z) / 2,
  };
  const inserted: TrackPoint = {
    id: newId('pt'),
    position,
    bank: (start.bank + end.bank) / 2,
    kind: start.kind,
    element: start.element,
    targetSpeed: start.targetSpeed,
  };
  if (endIndex === 0) return [...points, inserted];
  return [...points.slice(0, index + 1), inserted, ...points.slice(index + 1)];
}

export function updatePoint(
  points: TrackPoint[],
  id: string,
  patch: Partial<Pick<TrackPoint, 'kind' | 'bank' | 'targetSpeed' | 'element' | 'tangentIn' | 'tangentOut'>> & {
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

/**
 * Reduces local height and bank spikes without changing the layout footprint.
 * This is the de-pump pass used after hand-placing control points or importing
 * a CSV track: it blends each interior point toward its neighbours' average.
 */
export function dePumpPoints(
  points: TrackPoint[],
  closed: boolean,
  strength = 0.55,
): TrackPoint[] {
  if (points.length < 3) return points;
  const amount = clamp(strength, 0, 1);
  const result = points.map((point) => ({ ...point, position: { ...point.position } }));
  const source = result.map((point) => ({ ...point.position, bank: point.bank }));
  const n = result.length;
  for (let i = 0; i < n; i++) {
    const interior = closed || (i > 0 && i < n - 1);
    if (!interior) continue;
    const prev = source[closed ? (i - 1 + n) % n : i - 1];
    const next = source[closed ? (i + 1) % n : i + 1];
    result[i].position.y = source[i].y + ((prev.y + next.y) / 2 - source[i].y) * amount;
    result[i].bank = source[i].bank + ((prev.bank + next.bank) / 2 - source[i].bank) * amount;
  }
  return result;
}

export function addManualSupport(
  project: CoasterProject,
  pointIndex: number,
): CoasterProject {
  const point = project.points[pointIndex];
  if (!point) return project;
  const support: ManualSupport = {
    id: newId('support'),
    x: point.position.x,
    y: 0,
    z: point.position.z,
    height: Math.max(0.8, point.position.y),
    material: project.supports.material,
    crossBrace: project.supports.crossBrace,
  };
  return {
    ...project,
    supports: { ...project.supports, manual: [...project.supports.manual, support].slice(-120) },
  };
}

export function removeManualSupport(project: CoasterProject, supportId: string): CoasterProject {
  return {
    ...project,
    supports: {
      ...project.supports,
      manual: project.supports.manual.filter((support) => support.id !== supportId),
    },
  };
}

export function segmentLength(points: TrackPoint[], index: number): number {
  if (index <= 0 || index >= points.length) return 0;
  return distance(points[index - 1].position, points[index].position);
}

/** Moves a control point to an exact straight-line distance from its predecessor. */
export function setSegmentLength(points: TrackPoint[], index: number, length: number): TrackPoint[] {
  if (index <= 0 || index >= points.length) return points;
  const previous = points[index - 1].position;
  const point = points[index];
  const dx = point.position.x - previous.x;
  const dy = point.position.y - previous.y;
  const dz = point.position.z - previous.z;
  const current = Math.hypot(dx, dy, dz);
  const target = clamp(length, 0.25, 500);
  const scale = current > 1e-5 ? target / current : 0;
  return points.map((candidate, candidateIndex) =>
    candidateIndex === index
      ? {
          ...candidate,
          position: {
            x: previous.x + dx * scale,
            y: previous.y + dy * scale,
            z: previous.z + dz * scale,
          },
        }
      : candidate,
  );
}

/** Bends the layout at one point by offsetting it laterally in metres. */
export function offsetPointLateral(points: TrackPoint[], index: number, amount: number): TrackPoint[] {
  if (index <= 0 || index >= points.length - 1) return points;
  const previous = points[index - 1].position;
  const next = points[index + 1].position;
  const direction = normalize({ x: next.x - previous.x, y: 0, z: next.z - previous.z });
  const right = Math.hypot(direction.x, direction.z) > 1e-4 ? normalize(cross(UP, direction)) : { x: 1, y: 0, z: 0 };
  const offset = clamp(amount, -50, 50);
  return points.map((candidate, candidateIndex) =>
    candidateIndex === index
      ? {
          ...candidate,
          position: {
            x: candidate.position.x + right.x * offset,
            y: candidate.position.y,
            z: candidate.position.z + right.z * offset,
          },
        }
      : candidate,
  );
}

export function updateManualSupport(
  project: CoasterProject,
  supportId: string,
  patch: Partial<Omit<ManualSupport, 'id'>>,
): CoasterProject {
  return {
    ...project,
    supports: {
      ...project.supports,
      manual: project.supports.manual.map((support) =>
        support.id === supportId
          ? {
              ...support,
              ...patch,
              height: clamp(patch.height ?? support.height, 0.8, 140),
              material: patch.material ?? support.material,
            }
          : support,
      ),
    },
  };
}

const CSV_HEADER =
  'point_index,x,y,z,bank_deg,kind,element,target_speed_ms,tangent_out_x,tangent_out_y,tangent_out_z,tangent_in_x,tangent_in_y,tangent_in_z';

/** Plain-text exchange format for track geometry. */
export function projectToCsv(project: CoasterProject): string {
  const lines = [
    `# ${project.name.replace(/[\r\n]/g, ' ')}`,
    `# schema=1 closed=${project.closed}`,
    CSV_HEADER,
  ];
  project.points.forEach((point, index) => {
    lines.push(
      [
        index,
        point.position.x.toFixed(4),
        point.position.y.toFixed(4),
        point.position.z.toFixed(4),
        point.bank.toFixed(3),
        point.kind,
        point.element ?? '',
        point.targetSpeed === undefined ? '' : point.targetSpeed.toFixed(2),
        point.tangentOut?.x.toFixed(3) ?? '',
        point.tangentOut?.y.toFixed(3) ?? '',
        point.tangentOut?.z.toFixed(3) ?? '',
        point.tangentIn?.x.toFixed(3) ?? '',
        point.tangentIn?.y.toFixed(3) ?? '',
        point.tangentIn?.z.toFixed(3) ?? '',
      ].join(','),
    );
  });
  return `${lines.join('\n')}\n`;
}

const POINT_KIND_SET = new Set<TrackPointKind>([
  'track',
  'station',
  'unload_station',
  'storage',
  'chain_lift',
  'cable_lift',
  'launch',
  'brake',
  'block_brake',
  'magnetic_brake',
  'transfer',
  'switch',
  'drop',
  'tilt',
]);

export function pointsFromCsv(csv: string): TrackPoint[] {
  const rows = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
  if (!rows.length) throw new Error('CSV contains no track rows.');
  if (rows[0].toLowerCase().startsWith('point_index')) rows.shift();
  const points: TrackPoint[] = [];
  rows.slice(0, 500).forEach((row) => {
    const cells = row.split(',').map((cell) => cell.trim());
    // Accept both a plain x,y,z,bank,kind file and the studio's indexed export.
    const indexed = cells.length >= 8;
    const offset = indexed ? 1 : 0;
    const tangentOffset = indexed ? 8 : 7;
    const x = Number(cells[offset]);
    const y = Number(cells[offset + 1]);
    const z = Number(cells[offset + 2]);
    if (![x, y, z].every(Number.isFinite)) return;
    const kind = POINT_KIND_SET.has(cells[offset + 4] as TrackPointKind)
      ? (cells[offset + 4] as TrackPointKind)
      : 'track';
    const element = cells[offset + 5] ? (cells[offset + 5] as CoasterElementKind) : undefined;
    const targetSpeed = cells[offset + 6] ? Number(cells[offset + 6]) : undefined;
    const hasTangent = (base: number) =>
      [0, 1, 2].every(
        (column) => Boolean(cells[base + column]) && Number.isFinite(Number(cells[base + column])),
      );
    const tangentOut = hasTangent(tangentOffset)
      ? vec(
          Number(cells[tangentOffset]),
          Number(cells[tangentOffset + 1]),
          Number(cells[tangentOffset + 2]),
        )
      : undefined;
    const tangentIn = hasTangent(tangentOffset + 3)
      ? vec(
          Number(cells[tangentOffset + 3]),
          Number(cells[tangentOffset + 4]),
          Number(cells[tangentOffset + 5]),
        )
      : undefined;
    const point = makePoint(
      vec(x, y, z),
      kind,
      Number.isFinite(Number(cells[offset + 3])) ? Number(cells[offset + 3]) : 0,
      element,
      targetSpeed !== undefined && Number.isFinite(targetSpeed) ? targetSpeed : undefined,
    );
    if (tangentOut && tangentIn) {
      point.tangentOut = tangentOut;
      point.tangentIn = tangentIn;
    }
    points.push(point);
  });
  if (points.length < 2) throw new Error('CSV needs at least two valid geometry rows.');
  return points;
}

export function projectFromCsv(project: CoasterProject, csv: string): CoasterProject {
  const points = pointsFromCsv(csv);
  return {
    ...project,
    id: newId('project'),
    name: `${project.name} CSV`,
    points,
    closed: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
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
  const launchElements: CoasterElementKind[] = [
    'launch',
    'launch_tire',
    'launch_magnetic',
    'launch_lsm',
    'launch_hydraulic',
    'swing_launch',
  ];
  const brakeElements: CoasterElementKind[] = ['brake', 'brake_friction'];
  const blockElements: CoasterElementKind[] = ['block_brake', 'brake_block'];
  const magneticElements: CoasterElementKind[] = ['magnetic_brake', 'brake_magnetic'];
  const transferElements: CoasterElementKind[] = ['transfer', 'transfer_track'];
  const switchElements: CoasterElementKind[] = ['switch', 'switch_track'];
  const dropElements: CoasterElementKind[] = ['drop', 'drop_track'];
  const tiltElements: CoasterElementKind[] = ['tilt', 'tilt_track', 'movable_track'];
  const kind: TrackPointKind =
    element === 'station'
      ? 'station'
      : element === 'unload_station'
        ? 'unload_station'
        : element === 'storage_track'
          ? 'storage'
          : element === 'lift_chain'
      ? 'chain_lift'
      : element === 'lift_cable'
        ? 'cable_lift'
        : launchElements.includes(element)
          ? 'launch'
          : brakeElements.includes(element)
            ? 'brake'
            : blockElements.includes(element)
              ? 'block_brake'
              : magneticElements.includes(element)
                ? 'magnetic_brake'
                : transferElements.includes(element)
                  ? 'transfer'
                  : switchElements.includes(element)
                    ? 'switch'
                    : dropElements.includes(element)
                      ? 'drop'
                      : tiltElements.includes(element)
                        ? 'tilt'
                        : 'track';
  const add = (
    forward: number,
    lateral: number,
    lift: number,
    bank: number,
    sectionKind = kind,
    targetSpeed = options.targetSpeed,
  ) => {
    created.push(
      makePoint(
        vec(p.x + dir.x * forward + right.x * lateral, p.y + lift, p.z + dir.z * forward + right.z * lateral),
        sectionKind,
        bank,
        element,
        targetSpeed,
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
    case 's_bend_left':
    case 's_bend_right': {
      const side = element === 's_bend_right' ? 1 : -1;
      const len = options.length ?? 22;
      const amplitude = options.radius ?? 4.2;
      for (let i = 1; i <= 12; i++) {
        const f = i / 12;
        add(
          len * f,
          side * amplitude * Math.sin(Math.PI * 2 * f),
          0.4 * Math.sin(Math.PI * f),
          side * 22 * Math.sin(Math.PI * 2 * f),
          'track',
        );
      }
      break;
    }
    case 'banked_turn_left':
    case 'banked_turn_right': {
      const side = element === 'banked_turn_right' ? 1 : -1;
      const radius = options.radius ?? 14;
      for (let i = 1; i <= 8; i++) {
        const f = i / 8;
        const a = f * (Math.PI / 2);
        add(radius * Math.sin(a), side * radius * (1 - Math.cos(a)), 0, side * 45, 'track');
      }
      break;
    }
    case 'overbanked_turn_left':
    case 'overbanked_turn_right': {
      const side = element === 'overbanked_turn_right' ? 1 : -1;
      const radius = options.radius ?? 17;
      for (let i = 1; i <= 10; i++) {
        const f = i / 10;
        const a = f * (Math.PI * 0.67);
        add(
          radius * Math.sin(a),
          side * radius * (1 - Math.cos(a)),
          1.8 * Math.sin(Math.PI * f),
          side * 120 * f,
          'track',
        );
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
    case 'cobra_roll': {
      for (let i = 1; i <= 14; i++) {
        const f = i / 14;
        const a = f * Math.PI * 2;
        add(8 * f + 2.2 * Math.sin(a), 2.5 * Math.sin(Math.PI * f), 7 * (1 - Math.cos(a)), 360 * f, 'track');
      }
      break;
    }
    case 'heartline_roll': {
      const len = options.length ?? 16;
      for (let i = 1; i <= 10; i++) {
        const f = i / 10;
        add(f * len, 0, 2.4 * Math.sin(Math.PI * f), 360 * f, 'track');
      }
      break;
    }
    case 'inline_twist': {
      const len = options.length ?? 12;
      for (let i = 1; i <= 8; i++) {
        const f = i / 8;
        add(f * len, 0, 0.6 * Math.sin(Math.PI * f), 360 * f, 'track');
      }
      break;
    }
    case 'flying_transition': {
      const len = options.length ?? 14;
      for (let i = 1; i <= 10; i++) {
        const f = i / 10;
        add(f * len, 1.4 * Math.sin(Math.PI * f), -2.2 * Math.sin(Math.PI * f), 180 * f, 'track');
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
    case 'double_up':
    case 'double_down': {
      const len = options.length ?? 22;
      const height = options.height ?? 5.5;
      const direction = element === 'double_down' ? -1 : 1;
      for (let i = 1; i <= 10; i++) {
        const f = i / 10;
        add(f * len, 0, direction * Math.abs(Math.sin(Math.PI * 2 * f)) * height, last.bank, 'track');
      }
      break;
    }
    case 'steep_drop': {
      const len = options.length ?? 8;
      const drop = options.height ?? 18;
      for (let i = 1; i <= 8; i++) {
        const f = i / 8;
        add(f * len, 0, -f * drop, last.bank, 'track');
      }
      break;
    }
    case 'beyond_vertical_drop': {
      const drop = options.height ?? 22;
      for (let i = 1; i <= 9; i++) {
        const f = i / 9;
        add(f * 5.5, 0, -f * drop, 12 * Math.sin(Math.PI * f), 'track');
      }
      break;
    }
    case 'vertical_track': {
      const rise = options.height ?? 8;
      for (let i = 1; i <= 6; i++) {
        add((i / 6) * 0.25, 0, (i / 6) * rise, 0, 'track');
      }
      break;
    }
    case 'dive_track': {
      const drop = options.height ?? 10;
      add(3, 0, 0, 0, 'track');
      add(4.2, 0, -drop, 0, 'track');
      add(11, 0, -drop + 1.5, last.bank, 'track');
      break;
    }
    case 'spike': {
      for (let i = 1; i <= 10; i++) {
        const f = i / 10;
        add(2.2 * f, 0, Math.sin(Math.PI * f) * 12, 0, 'track');
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
    case 'station': {
      const len = options.length ?? 8;
      add(len * 0.5, 0, 0, 0, 'station');
      add(len, 0, 0, 0, 'station');
      break;
    }
    case 'unload_station': {
      const len = options.length ?? 8;
      add(len * 0.5, 0, 0, 0, 'unload_station');
      add(len, 0, 0, 0, 'unload_station');
      break;
    }
    case 'storage_track': {
      const len = options.length ?? 10;
      add(len * 0.5, 0, 0, 0, 'storage');
      add(len, 0, 0, 0, 'storage');
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
    case 'launch':
    case 'launch_tire':
    case 'launch_magnetic':
    case 'launch_lsm':
    case 'launch_hydraulic':
    case 'swing_launch': {
      const length = options.length ?? 18;
      const target =
        options.targetSpeed ??
        (element === 'launch_tire'
          ? 28
          : element === 'launch_magnetic'
            ? 32
            : element === 'launch_hydraulic'
              ? 42
              : element === 'swing_launch'
                ? 38
                : element === 'launch_lsm'
                  ? 36
                  : 34);
      for (let i = 1; i <= 3; i++) add((length * i) / 3, 0, 0, 0, 'launch', target);
      break;
    }
    case 'brake':
    case 'brake_friction':
    case 'block_brake':
    case 'brake_block':
    case 'magnetic_brake':
    case 'brake_magnetic': {
      const len = blockElements.includes(element) ? 10 : 12;
      add(len * 0.5, 0, 0, 0, kind);
      add(len, 0, 0, 0, kind);
      break;
    }
    case 'transfer':
    case 'transfer_track': {
      add(4, 0, 0, 0, 'transfer');
      add(8, 0, 0, 0, 'transfer');
      break;
    }
    case 'switch':
    case 'switch_track': {
      add(3, 0, 0, 0, 'switch');
      add(6, 2.4, 0, 0, 'switch');
      break;
    }
    case 'drop':
    case 'drop_track': {
      add(2, 0, 0, 0, 'drop');
      add(3.6, 0, -(options.height ?? 8), 0, 'drop');
      break;
    }
    case 'tilt':
    case 'tilt_track':
    case 'movable_track': {
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
