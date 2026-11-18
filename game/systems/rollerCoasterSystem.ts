// =============================================
// FEATURE 171: REALISTIC ROLLER COASTER ENGINE
// =============================================

export const rollerCoasterSystem = {
  enabled: true,

  trackBuilder: {
    smoothCurves: true,
    bankedTurns: true,
    customElevation: true,
    verticalLoops: true,
    doubleLoops: true,
    corkscrews: true,
    barrelRolls: true,
    zeroGRolls: true,
    immelmannLoops: true,
    diveLoops: true,
    verticalDrops: true,
    airtimeHills: true,
    customTrackTransitions: true,
    continuousTrackMesh: true,
    adjustableTrackSupports: true,
  },

  propulsion: {
    chainLift: true,
    cableLift: true,
    lsmLaunch: true,
    limLaunch: true,
    swingLaunch: true,
    driveTires: true,
    adjustableLaunchSpeed: true,
  },

  trainSystems: {
    realisticTrainModels: true,
    multipleTrainCars: true,
    workingWheels: true,
    upStopWheels: true,
    sideFrictionWheels: true,
    passengerSeating: true,
    restraints: true,
    trainDispatch: true,
  },

  trackMechanics: {
    transferTracks: true,
    switchTracks: true,
    blockBrakes: true,
    magneticBrakes: true,
    frictionBrakes: true,
    stationBrakes: true,
    splashdownSections: true,
    trackAlignment: true,
  },

  rideSimulation: {
    simulatedGravity: true,
    acceleration: true,
    deceleration: true,
    momentum: true,
    bankingPhysics: true,
    inversionSimulation: true,
    passengerRideCamera: true,
    firstPersonRideView: true,
  },

  amusementPark: {
    customStations: true,
    queueLines: true,
    passengerBoarding: true,
    passengerUnloading: true,
    parkPaths: true,
    sceneryCustomization: true,
    rideLighting: true,
    rideAudio: true,
    multipleCoasters: true,
  },

  management: {
    rideTesting: true,
    rideStatus: true,
    passengerCapacity: true,
    maintenanceSystem: true,
    rideStatistics: true,
    saveCustomCoasters: true,
  },
};

export type Vector3 = {
  x: number;
  y: number;
  z: number;
};

export type TrackSegmentType =
  | "station"
  | "chain_lift"
  | "lsm_launch"
  | "coast"
  | "trim_brake"
  | "block_brake"
  | "splashdown"
  | "inversion";

export type TrackNode = {
  position: Vector3;
  bank: number;
  segmentType?: TrackSegmentType;
  targetSpeed?: number;
};

export type TrackPieceType =
  | "straight"
  | "firstDrop"
  | "hill"
  | "bankedTurn"
  | "bankedTurnLeft"
  | "helix"
  | "verticalLoop"
  | "corkscrew"
  | "zeroGRoll"
  | "immelmann"
  | "chainLift"
  | "launch"
  | "brake"
  | "switch"
  | "splashdown";

export type TrackPiece = {
  type: TrackPieceType;
  nodes: TrackNode[];
  speed?: number;
};

export type TrackSample = {
  position: Vector3;
  bank: number;
  tangent: Vector3;
  right: Vector3;
  up: Vector3;
  distance: number;
  segmentType: TrackSegmentType;
  targetSpeed?: number;
  curvature: number;
  verticalG: number;
  lateralG: number;
};

const vec = (x: number, y: number, z: number): Vector3 => ({ x, y, z });

const addVec = (a: Vector3, b: Vector3): Vector3 => ({
  x: a.x + b.x,
  y: a.y + b.y,
  z: a.z + b.z,
});

const subVec = (a: Vector3, b: Vector3): Vector3 => ({
  x: a.x - b.x,
  y: a.y - b.y,
  z: a.z - b.z,
});

const scaleVec = (v: Vector3, s: number): Vector3 => ({
  x: v.x * s,
  y: v.y * s,
  z: v.z * s,
});

const dotVec = (a: Vector3, b: Vector3): number =>
  a.x * b.x + a.y * b.y + a.z * b.z;

const crossVec = (a: Vector3, b: Vector3): Vector3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});

const distance = (a: Vector3, b: Vector3) =>
  Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);

function normalize(v: Vector3): Vector3 {
  const length = Math.hypot(v.x, v.y, v.z);
  if (length < 1e-8) return vec(0, 0, 1);
  return vec(v.x / length, v.y / length, v.z / length);
}

/** Rotate vector `v` around unit vector `axis` by `angleRad` (Rodrigues formula). */
function rotateAroundAxis(v: Vector3, axis: Vector3, angleRad: number): Vector3 {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const kCrossV = crossVec(axis, v);
  const kDotV = dotVec(axis, v);
  return vec(
    v.x * cos + kCrossV.x * sin + axis.x * kDotV * (1 - cos),
    v.y * cos + kCrossV.y * sin + axis.y * kDotV * (1 - cos),
    v.z * cos + kCrossV.z * sin + axis.z * kDotV * (1 - cos),
  );
}

export function getSegmentDisplayLabel(seg: TrackSegmentType): string {
  switch (seg) {
    case "station":
      return "Load Station";
    case "chain_lift":
      return "Chain Lift Hill";
    case "lsm_launch":
      return "LSM Launch Block";
    case "trim_brake":
      return "Magnetic Trim Brakes";
    case "block_brake":
      return "Block Brake Run";
    case "splashdown":
      return "Splashdown Trough";
    case "inversion":
      return "Inversion Element";
    case "coast":
    default:
      return "Gravity Coast";
  }
}

// --------------------------------------------------
// 1. SPLINE TRACK EDITOR
// --------------------------------------------------

export class CoasterEditor {
  nodes: TrackNode[] = [];

  addPoint(
    position: Vector3,
    bank = 0,
    segmentType?: TrackSegmentType,
    targetSpeed?: number,
  ) {
    this.nodes.push({
      position,
      bank,
      segmentType,
      targetSpeed,
    });
  }

  movePoint(index: number, position: Vector3) {
    if (!this.nodes[index]) return;
    this.nodes[index].position = position;
  }

  setBank(index: number, degrees: number) {
    if (!this.nodes[index]) return;
    this.nodes[index].bank = degrees;
  }

  setSegmentType(index: number, segmentType: TrackSegmentType, targetSpeed?: number) {
    if (!this.nodes[index]) return;
    this.nodes[index].segmentType = segmentType;
    this.nodes[index].targetSpeed = targetSpeed;
  }

  removePoint(index: number) {
    this.nodes.splice(index, 1);
  }

  clear() {
    this.nodes = [];
  }

  getTrack() {
    return buildTrack(this.nodes);
  }
}

// --------------------------------------------------
// 2. SMOOTH CATMULL-ROM SPLINE INTERPOLATION
// --------------------------------------------------

function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number) {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

function interpolateNode(
  a: TrackNode,
  b: TrackNode,
  c: TrackNode,
  d: TrackNode,
  t: number,
): Omit<TrackNode, "segmentType"> & { segmentType: TrackSegmentType; targetSpeed?: number } {
  const seg = b.segmentType ?? c.segmentType ?? "coast";
  const targetSpeed = b.targetSpeed ?? c.targetSpeed;
  return {
    position: vec(
      catmullRom(a.position.x, b.position.x, c.position.x, d.position.x, t),
      catmullRom(a.position.y, b.position.y, c.position.y, d.position.y, t),
      catmullRom(a.position.z, b.position.z, c.position.z, d.position.z, t),
    ),
    bank: catmullRom(a.bank, b.bank, c.bank, d.bank, t),
    segmentType: seg,
    targetSpeed,
  };
}

// --------------------------------------------------
// 3. PARALLEL-TRANSPORT TRACK SAMPLING
// --------------------------------------------------

export function buildTrack(nodes: TrackNode[], resolution = 12): TrackSample[] {
  if (nodes.length < 2) return [];

  // Deduplicate ultra-close nodes (< 0.05m) so tangents never collapse
  const cleanNodes: TrackNode[] = [nodes[0]];
  for (let i = 1; i < nodes.length; i++) {
    if (distance(cleanNodes[cleanNodes.length - 1].position, nodes[i].position) >= 0.05) {
      cleanNodes.push(nodes[i]);
    }
  }
  if (cleanNodes.length < 2) return [];

  const rawSamples: {
    position: Vector3;
    bank: number;
    segmentType: TrackSegmentType;
    targetSpeed?: number;
  }[] = [];

  for (let i = 0; i < cleanNodes.length - 1; i++) {
    const a = cleanNodes[Math.max(0, i - 1)];
    const b = cleanNodes[i];
    const c = cleanNodes[i + 1];
    const d = cleanNodes[Math.min(cleanNodes.length - 1, i + 2)];

    const segLen = distance(b.position, c.position);
    const steps = Math.max(4, Math.min(resolution * 2, Math.ceil(segLen * 1.4)));

    for (let j = 0; j < steps; j++) {
      const t = j / steps;
      const interp = interpolateNode(a, b, c, d, t);
      rawSamples.push({
        position: interp.position,
        bank: interp.bank,
        segmentType: interp.segmentType,
        targetSpeed: interp.targetSpeed,
      });
    }
  }

  const last = cleanNodes[cleanNodes.length - 1];
  rawSamples.push({
    position: { ...last.position },
    bank: last.bank,
    segmentType: last.segmentType ?? "coast",
    targetSpeed: last.targetSpeed,
  });

  // Compute tangents & arc distances
  const samples: TrackSample[] = [];
  let totalDistance = 0;

  for (let i = 0; i < rawSamples.length; i++) {
    const prev = rawSamples[Math.max(0, i - 1)];
    const next = rawSamples[Math.min(rawSamples.length - 1, i + 1)];
    const tangent = normalize(subVec(next.position, prev.position));

    if (i > 0) {
      totalDistance += distance(rawSamples[i - 1].position, rawSamples[i].position);
    }

    samples.push({
      position: rawSamples[i].position,
      bank: rawSamples[i].bank,
      tangent,
      right: vec(-1, 0, 0),
      up: vec(0, 1, 0),
      distance: totalDistance,
      segmentType: rawSamples[i].segmentType,
      targetSpeed: rawSamples[i].targetSpeed,
      curvature: 0,
      verticalG: 1,
      lateralG: 0,
    });
  }

  // Propagate continuous Rotation-Minimizing Frame (Bishop Parallel-Transport Frame)
  // Prevents gimbal flips when track goes straight vertical or upside down in loops!
  const worldUp = vec(0, 1, 0);
  const t0 = samples[0].tangent;
  let refRight = crossVec(t0, worldUp);
  if (Math.hypot(refRight.x, refRight.y, refRight.z) < 0.01) {
    refRight = vec(-1, 0, 0);
  } else {
    refRight = normalize(refRight);
  }
  let refUp = normalize(crossVec(refRight, t0));

  for (let i = 0; i < samples.length; i++) {
    const ti = samples[i].tangent;
    if (i > 0) {
      const prevT = samples[i - 1].tangent;
      const axisRaw = crossVec(prevT, ti);
      const sinA = Math.hypot(axisRaw.x, axisRaw.y, axisRaw.z);
      const cosA = Math.max(-1, Math.min(1, dotVec(prevT, ti)));
      if (sinA > 1e-6) {
        const axis = scaleVec(axisRaw, 1 / sinA);
        const angle = Math.atan2(sinA, cosA);
        refRight = rotateAroundAxis(refRight, axis, angle);
      }
      // Orthonormalize against current tangent
      const proj = dotVec(refRight, ti);
      refRight = normalize(subVec(refRight, scaleVec(ti, proj)));
      refUp = normalize(crossVec(refRight, ti));
    }

    // Apply banking roll clockwise around forward tangent
    const bankRad = (samples[i].bank * Math.PI) / 180;
    const cosB = Math.cos(bankRad);
    const sinB = Math.sin(bankRad);
    // right = refRight * cosB - refUp * sinB (so +bank leans head right & drops right rail)
    const bankedRight = normalize(
      subVec(scaleVec(refRight, cosB), scaleVec(refUp, sinB)),
    );
    const bankedUp = normalize(crossVec(bankedRight, ti));

    samples[i].right = bankedRight;
    samples[i].up = bankedUp;
  }

  // Precompute curvature magnitude
  for (let i = 0; i < samples.length; i++) {
    const prev = samples[Math.max(0, i - 1)];
    const next = samples[Math.min(samples.length - 1, i + 1)];
    const ds = Math.max(0.05, next.distance - prev.distance);
    const dtVec = subVec(next.tangent, prev.tangent);
    samples[i].curvature = Math.hypot(dtVec.x, dtVec.y, dtVec.z) / ds;
  }

  return samples;
}

// --------------------------------------------------
// 4. REALISTIC ENGINEERED TRACK ELEMENTS
// All local pieces start at (0,0,0) heading +Z with bank=0
// and exit smoothly with zero overlapping nodes.
// --------------------------------------------------

export const TrackPieces = {
  straight(length = 18): TrackPiece {
    const nodes: TrackNode[] = [];
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      nodes.push({
        position: vec(0, 0, (i / steps) * length),
        bank: 0,
        segmentType: "coast",
      });
    }
    return { type: "straight", nodes };
  },

  chainLift(height = 22, length = 50): TrackPiece {
    const nodes: TrackNode[] = [];
    const steps = 12;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      // C2 quintic pull-up and crest curve so entry & exit slope are smoothly horizontal
      const sCurve = t * t * t * (10 + t * (-15 + 6 * t));
      const seg: TrackSegmentType =
        t > 0.04 && t < 0.92 ? "chain_lift" : "coast";
      nodes.push({
        position: vec(0, height * sCurve, t * length),
        bank: 0,
        segmentType: seg,
        targetSpeed: seg === "chain_lift" ? 7.5 : undefined,
      });
    }
    return { type: "chainLift", speed: 7.5, nodes };
  },

  firstDrop(drop = 18, length = 36): TrackPiece {
    const nodes: TrackNode[] = [];
    const steps = 12;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const y = -drop * (0.5 - 0.5 * Math.cos(Math.PI * t));
      nodes.push({
        position: vec(0, y, t * length),
        bank: 0,
        segmentType: "coast",
      });
    }
    return { type: "firstDrop", nodes };
  },

  hill(height = 12, length = 34): TrackPiece {
    const nodes: TrackNode[] = [];
    const steps = 12;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const y = height * Math.pow(Math.sin(Math.PI * t), 2);
      nodes.push({
        position: vec(0, y, t * length),
        bank: 0,
        segmentType: "coast",
      });
    }
    return { type: "hill", nodes };
  },

  bankedTurn(radius = 20, sweepDeg = 90, bankAngle = 52): TrackPiece {
    const nodes: TrackNode[] = [];
    const dir = sweepDeg >= 0 ? 1 : -1;
    const absSweep = Math.max(15, Math.abs(sweepDeg));
    const steps = Math.max(8, Math.round(absSweep / 10));
    const sweepRad = (absSweep * Math.PI) / 180;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const theta = t * sweepRad;
      // dir=+1 => Right turn toward -X; dir=-1 => Left turn toward +X
      const x = -dir * radius * (1 - Math.cos(theta));
      const z = radius * Math.sin(theta);
      const bank = dir * bankAngle * Math.pow(Math.sin(Math.PI * t), 2);
      nodes.push({
        position: vec(x, 0, z),
        bank,
        segmentType: "coast",
      });
    }
    return { type: dir >= 0 ? "bankedTurn" : "bankedTurnLeft", nodes };
  },

  bankedTurnLeft(radius = 20, sweepDeg = 90, bankAngle = 52): TrackPiece {
    return TrackPieces.bankedTurn(radius, -Math.abs(sweepDeg), bankAngle);
  },

  helix(
    radius = 16,
    heightChange = -8,
    turns = 1,
    direction: "right" | "left" = "right",
  ): TrackPiece {
    const nodes: TrackNode[] = [];
    const dir = direction === "right" ? 1 : -1;
    const steps = Math.max(18, Math.round(turns * 24));
    const totalAngle = turns * Math.PI * 2;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const theta = t * totalAngle;
      const x = -dir * radius * (1 - Math.cos(theta));
      const z = radius * Math.sin(theta);
      const y = heightChange * (3 * t * t - 2 * t * t * t);
      const bank = dir * 48 * Math.pow(Math.sin(Math.PI * t), 0.75);
      nodes.push({
        position: vec(x, y, z),
        bank,
        segmentType: "coast",
      });
    }
    return { type: "helix", nodes };
  },

  verticalLoop(radius = 11): TrackPiece {
    const nodes: TrackNode[] = [];
    const steps = 36;
    const lateralShift = 2.6;
    const forwardAdvance = radius * 0.7;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const angle = t * Math.PI * 2;
      // Teardrop clothoid tightening near apex keeps positive Gs smooth
      const teardrop = 1 - 0.18 * (1 - Math.cos(angle));
      const x = -lateralShift * (3 * t * t - 2 * t * t * t);
      const y = radius * 1.12 * (1 - Math.cos(angle));
      const z = radius * 0.86 * Math.sin(angle) * teardrop + forwardAdvance * t;
      nodes.push({
        position: vec(x, y, z),
        bank: 0,
        segmentType: "inversion",
      });
    }

    return { type: "verticalLoop", nodes };
  },

  corkscrew(radius = 7, length = 28): TrackPiece {
    const nodes: TrackNode[] = [];
    const steps = 28;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const angle = t * Math.PI * 2;
      const env = Math.sin(Math.PI * t);
      const x = -radius * Math.sin(angle) * env;
      const y = radius * (1 - Math.cos(angle));
      const z = t * length;
      const bank = 360 * (3 * t * t - 2 * t * t * t);
      nodes.push({
        position: vec(x, y, z),
        bank,
        segmentType: "inversion",
      });
    }

    return { type: "corkscrew", nodes };
  },

  zeroGRoll(height = 9, length = 30): TrackPiece {
    const nodes: TrackNode[] = [];
    const steps = 24;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const y = height * Math.pow(Math.sin(Math.PI * t), 2);
      const bank = 360 * (3 * t * t - 2 * t * t * t);
      nodes.push({
        position: vec(0, y, t * length),
        bank,
        segmentType: "inversion",
      });
    }
    return { type: "zeroGRoll", nodes };
  },

  immelmann(radius = 10): TrackPiece {
    // Half vertical loop up -> roll upright 180° at apex -> sweeping banked dive back to level exiting along -Z
    const nodes: TrackNode[] = [];
    const steps = 32;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      if (t <= 0.5) {
        const u = t * 2; // 0..1 ascending half-loop
        const angle = u * Math.PI;
        const y = radius * (1 - Math.cos(angle));
        const z = radius * 0.9 * Math.sin(angle);
        nodes.push({
          position: vec(0, y, z),
          bank: 0,
          segmentType: "inversion",
        });
      } else {
        const v = (t - 0.5) * 2; // 0..1 roll-out & smooth return dive heading -Z
        const smoothV = 3 * v * v - 2 * v * v * v;
        const x = -11 * smoothV;
        const y = radius * 2 * (1 - smoothV);
        const z = -v * radius * 2.2;
        const bank = 180 * smoothV;
        nodes.push({
          position: vec(x, y, z),
          bank,
          segmentType: "inversion",
        });
      }
    }
    return { type: "immelmann", nodes };
  },

  launch(speed = 30, length = 30): TrackPiece {
    const nodes: TrackNode[] = [];
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      nodes.push({
        position: vec(0, 0, (i / steps) * length),
        bank: 0,
        segmentType: i > 0 ? "lsm_launch" : "coast",
        targetSpeed: speed,
      });
    }
    return { type: "launch", speed, nodes };
  },

  brake(length = 18): TrackPiece {
    const nodes: TrackNode[] = [];
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      nodes.push({
        position: vec(0, 0, (i / steps) * length),
        bank: 0,
        segmentType: "trim_brake",
        targetSpeed: 5.5,
      });
    }
    return { type: "brake", speed: 5.5, nodes };
  },

  switchTrack(length = 20): TrackPiece {
    return {
      type: "switch",
      nodes: [
        { position: vec(0, 0, 0), bank: 0, segmentType: "block_brake", targetSpeed: 6 },
        { position: vec(0, 0, length * 0.5), bank: 0, segmentType: "block_brake", targetSpeed: 6 },
        { position: vec(0, 0, length), bank: 0, segmentType: "block_brake", targetSpeed: 6 },
      ],
    };
  },

  splashdown(length = 26): TrackPiece {
    const nodes: TrackNode[] = [];
    const steps = 10;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const y = -1.6 * Math.pow(Math.sin(Math.PI * t), 2);
      nodes.push({
        position: vec(0, y, t * length),
        bank: 0,
        segmentType: t > 0.15 && t < 0.85 ? "splashdown" : "coast",
      });
    }
    return { type: "splashdown", nodes };
  },
};

// --------------------------------------------------
// 5. PHYSICS-BASED TRAIN SIMULATION
// --------------------------------------------------

export class CoasterTrain {
  position = 0;
  speed = 0;
  verticalG = 1;
  lateralG = 0;
  currentSegmentType: TrackSegmentType = "station";

  constructor(public track: TrackSample[]) {}

  private sampleIndexAt(dist: number): number {
    if (this.track.length === 0) return 0;
    // Binary search for fast lookup
    let lo = 0;
    let hi = this.track.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.track[mid].distance < dist) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  update(deltaTime: number) {
    if (this.track.length < 2) return;

    const totalLength = this.track[this.track.length - 1].distance;
    if (totalLength <= 0.1) return;

    const clampedDt = Math.min(0.25, Math.max(0, deltaTime));
    const subSteps = Math.max(1, Math.ceil(clampedDt / 0.016));
    const dt = clampedDt / subSteps;

    for (let step = 0; step < subSteps; step++) {
      const idx = this.sampleIndexAt(this.position);
      const current = this.track[idx];
      if (!current) break;

      this.currentSegmentType = current.segmentType;
      const seg = current.segmentType;

      // Real gravity along tangent + rolling & aerodynamic drag
      let accel = -9.81 * current.tangent.y;
      accel -= 0.045 + 0.00055 * this.speed * this.speed;

      if (seg === "chain_lift") {
        const liftTarget = current.targetSpeed ?? 7.5;
        if (this.speed < liftTarget) {
          accel = (liftTarget - this.speed) * 6.5 + 9.81 * current.tangent.y * 0; // chain dogs hold steady climb
          this.speed = Math.min(liftTarget, this.speed + Math.max(2.5, accel) * dt);
          accel = 0;
        }
      } else if (seg === "lsm_launch") {
        const launchTarget = current.targetSpeed ?? 30;
        if (this.speed < launchTarget) {
          accel += 19.5;
        }
      } else if (seg === "trim_brake" || seg === "block_brake" || seg === "station") {
        const brakeTarget = current.targetSpeed ?? (seg === "station" ? 4.8 : 5.5);
        if (this.speed > brakeTarget) {
          accel = Math.min(accel, -11.5);
        } else if (this.speed < brakeTarget) {
          // Drive tires gently keep train rolling through station/brake block
          accel = Math.max(accel, 3.2);
        }
      } else if (seg === "splashdown") {
        accel -= 0.018 * this.speed * this.speed;
      }

      if (seg !== "chain_lift") {
        this.speed = Math.max(0, this.speed + accel * dt);
      }

      // Gentle drive-wheel anti-stall safeguard if stalled mid-course during custom editing
      if (this.speed < 2.2 && seg === "coast" && current.tangent.y >= -0.05) {
        this.speed = Math.min(4.2, this.speed + 5.5 * dt);
      }

      this.position = Math.min(totalLength, this.position + this.speed * dt);

      // Compute authentic Vertical & Lateral G-forces from track curvature vector
      const prevSample = this.track[Math.max(0, idx - 1)];
      const nextSample = this.track[Math.min(this.track.length - 1, idx + 1)];
      const ds = Math.max(0.1, nextSample.distance - prevSample.distance);
      const dTan = subVec(nextSample.tangent, prevSample.tangent);
      const curvatureVec = scaleVec(dTan, 1 / ds);
      const centripetal = scaleVec(curvatureVec, this.speed * this.speed);
      // Normal force per unit mass N/m = a_c - g (with g = (0, -9.81, 0))
      const feltAccel = vec(centripetal.x, centripetal.y + 9.81, centripetal.z);

      this.verticalG = Math.round((dotVec(feltAccel, current.up) / 9.81) * 100) / 100;
      this.lateralG = Math.round((dotVec(feltAccel, current.right) / 9.81) * 100) / 100;
    }
  }

  getCurrentPosition() {
    if (!this.track.length) return null;
    const idx = this.sampleIndexAt(this.position);
    return this.track[idx] || this.track[this.track.length - 1];
  }
}

// --------------------------------------------------
// 6. TRACK VALIDATION
// --------------------------------------------------

export function validateTrack(nodes: TrackNode[]) {
  const errors: string[] = [];

  if (nodes.length < 2) {
    errors.push("Track needs at least two control points.");
  }

  for (let i = 1; i < nodes.length; i++) {
    const segDist = distance(nodes[i - 1].position, nodes[i].position);
    if (segDist < 0.05) {
      errors.push(`Control points ${i - 1} and ${i} overlap.`);
    }
  }

  for (let i = 1; i < nodes.length - 1; i++) {
    const v1 = subVec(nodes[i].position, nodes[i - 1].position);
    const v2 = subVec(nodes[i + 1].position, nodes[i].position);
    const l1 = Math.hypot(v1.x, v1.y, v1.z);
    const l2 = Math.hypot(v2.x, v2.y, v2.z);
    if (l1 > 0.05 && l2 > 0.05) {
      const dot = (v1.x * v2.x + v1.y * v2.y + v1.z * v2.z) / (l1 * l2);
      if (dot < -0.7) {
        errors.push(`Sharp kink detected near node #${i + 1}.`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// --------------------------------------------------
// FEATURE 172: CUSTOM INVERSION DESIGNER
// --------------------------------------------------

export type CustomInversion = {
  name: string;
  height: number;
  width: number;
  rotations: number;
  length: number;
  twist: number;
  bank: number;
};

export class InversionDesigner {
  designs: CustomInversion[] = [];

  createInversion(settings: CustomInversion) {
    const design = {
      name: settings.name,
      height: Math.max(4, settings.height),
      width: Math.max(2, settings.width),
      rotations: Math.max(1, Math.round(settings.rotations)),
      length: Math.max(12, settings.length),
      twist: settings.twist,
      bank: settings.bank,
    };

    this.designs.push(design);
    return design;
  }

  generateTrack(design: CustomInversion): TrackNode[] {
    const nodes: TrackNode[] = [];
    const resolution = 64;

    for (let i = 0; i <= resolution; i++) {
      const t = i / resolution;
      const angle = t * Math.PI * 2 * design.rotations;
      // Smooth sine envelope guarantees horizontal +Z entry & exit with zero overlap
      const env = Math.sin(Math.PI * t);
      const smoothT = 3 * t * t - 2 * t * t * t;

      const x = -design.width * Math.sin(angle) * env;
      const y = (design.height * 0.5) * (1 - Math.cos(angle));
      const z = t * design.length;
      const bank =
        360 * design.rotations * smoothT +
        design.twist * Math.sin(Math.PI * t) +
        design.bank * smoothT;

      nodes.push({
        position: vec(x, y, z),
        bank,
        segmentType: "inversion",
      });
    }

    return nodes;
  }

  saveDesign() {
    return JSON.stringify(this.designs);
  }

  loadDesign(data: string) {
    this.designs = JSON.parse(data);
  }
}

// --------------------------------------------------
// ULTIMATE COASTER 3: DEPUMP & CSV TOOLS
// --------------------------------------------------

export function depumpTrack(nodes: TrackNode[]): TrackNode[] {
  if (nodes.length < 3) return nodes.map((n) => ({ ...n, position: { ...n.position } }));
  const smoothed: TrackNode[] = [{ ...nodes[0], position: { ...nodes[0].position } }];
  for (let i = 1; i < nodes.length - 1; i++) {
    const prev = nodes[i - 1].position;
    const curr = nodes[i].position;
    const next = nodes[i + 1].position;
    smoothed.push({
      ...nodes[i],
      position: {
        x: curr.x * 0.5 + (prev.x + next.x) * 0.25,
        y: curr.y * 0.5 + (prev.y + next.y) * 0.25,
        z: curr.z * 0.5 + (prev.z + next.z) * 0.25,
      },
    });
  }
  const last = nodes[nodes.length - 1];
  smoothed.push({ ...last, position: { ...last.position } });
  return smoothed;
}

export function exportTrackCSV(nodes: TrackNode[]): string {
  let csv = 'x,y,z,bank,segmentType\n';
  for (const n of nodes) {
    csv += `${n.position.x.toFixed(2)},${n.position.y.toFixed(2)},${n.position.z.toFixed(2)},${n.bank.toFixed(1)},${n.segmentType || 'coast'}\n`;
  }
  return csv;
}

export function importTrackCSV(csvText: string): TrackNode[] {
  const lines = csvText.split('\n');
  const nodes: TrackNode[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(',');
    if (parts.length >= 3) {
      nodes.push({
        position: { x: Number(parts[0]) || 0, y: Number(parts[1]) || 2, z: Number(parts[2]) || 0 },
        bank: Number(parts[3]) || 0,
        segmentType: (parts[4] as TrackSegmentType) || 'coast',
      });
    }
  }
  return nodes;
}

