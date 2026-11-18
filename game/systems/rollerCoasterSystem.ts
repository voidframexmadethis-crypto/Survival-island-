// =============================================
// FEATURE 171: REALISTIC ROLLER COASTER CREATOR
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
    adjustableTrackSupports: true
  },

  propulsion: {
    chainLift: true,
    cableLift: true,
    lsmLaunch: true,
    limLaunch: true,
    swingLaunch: true,
    driveTires: true,
    adjustableLaunchSpeed: true
  },

  trainSystems: {
    realisticTrainModels: true,
    multipleTrainCars: true,
    workingWheels: true,
    upStopWheels: true,
    sideFrictionWheels: true,
    passengerSeating: true,
    restraints: true,
    trainDispatch: true
  },

  trackMechanics: {
    transferTracks: true,
    switchTracks: true,
    blockBrakes: true,
    magneticBrakes: true,
    frictionBrakes: true,
    stationBrakes: true,
    splashdownSections: true,
    trackAlignment: true
  },

  rideSimulation: {
    simulatedGravity: true,
    acceleration: true,
    deceleration: true,
    momentum: true,
    bankingPhysics: true,
    inversionSimulation: true,
    passengerRideCamera: true,
    firstPersonRideView: true
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
    multipleCoasters: true
  },

  management: {
    rideTesting: true,
    rideStatus: true,
    passengerCapacity: true,
    maintenanceSystem: true,
    rideStatistics: true,
    saveCustomCoasters: true
  }

};

// =============================================
// END FEATURE 171
// =============================================

// ==================================================
// FEATURE 171: REALISTIC ROLLER COASTER BUILDER
// FREEFORM + READY-MADE TRACK PIECES
// ==================================================

type Vector3 = {
  x: number;
  y: number;
  z: number;
};

type TrackNode = {
  position: Vector3;
  bank: number;
};

type TrackPieceType =
  | "straight"
  | "hill"
  | "bankedTurn"
  | "verticalLoop"
  | "corkscrew"
  | "chainLift"
  | "launch"
  | "brake"
  | "switch"
  | "splashdown";

type TrackPiece = {
  type: TrackPieceType;
  nodes: TrackNode[];
  speed?: number;
};

type TrackSample = TrackNode & {
  tangent: Vector3;
  distance: number;
};

const vec = (
  x: number,
  y: number,
  z: number
): Vector3 => ({ x, y, z });

const distance = (a: Vector3, b: Vector3) =>
  Math.hypot(
    b.x - a.x,
    b.y - a.y,
    b.z - a.z
  );

function normalize(v: Vector3): Vector3 {
  const length = Math.hypot(v.x, v.y, v.z) || 1;

  return vec(
    v.x / length,
    v.y / length,
    v.z / length
  );
}

// --------------------------------------------------
// 1. FREEFORM TRACK EDITOR
// --------------------------------------------------

export class CoasterEditor {

  nodes: TrackNode[] = [];

  addPoint(position: Vector3, bank = 0) {
    this.nodes.push({
      position,
      bank
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
// 2. SMOOTH TRACK INTERPOLATION
// --------------------------------------------------

function catmullRom(
  p0: number,
  p1: number,
  p2: number,
  p3: number,
  t: number
) {
  const t2 = t * t;
  const t3 = t2 * t;

  return 0.5 * (
    2 * p1 +
    (-p0 + p2) * t +
    (2*p0 - 5*p1 + 4*p2 - p3) * t2 +
    (-p0 + 3*p1 - 3*p2 + p3) * t3
  );
}

function interpolateNode(
  a: TrackNode,
  b: TrackNode,
  c: TrackNode,
  d: TrackNode,
  t: number
): TrackNode {

  return {
    position: vec(
      catmullRom(
        a.position.x,
        b.position.x,
        c.position.x,
        d.position.x,
        t
      ),
      catmullRom(
        a.position.y,
        b.position.y,
        c.position.y,
        d.position.y,
        t
      ),
      catmullRom(
        a.position.z,
        b.position.z,
        c.position.z,
        d.position.z,
        t
      )
    ),

    bank: catmullRom(
      a.bank,
      b.bank,
      c.bank,
      d.bank,
      t
    )
  };
}

// --------------------------------------------------
// 3. TRACK SAMPLING
// --------------------------------------------------

export function buildTrack(
  nodes: TrackNode[],
  resolution = 16
): TrackSample[] {

  if (nodes.length < 2) return [];

  const samples: TrackSample[] = [];

  for (let i = 0; i < nodes.length - 1; i++) {

    const a = nodes[Math.max(0, i - 1)];
    const b = nodes[i];
    const c = nodes[i + 1];
    const d = nodes[Math.min(nodes.length - 1, i + 2)];

    for (let j = 0; j < resolution; j++) {

      const t = j / resolution;

      samples.push({
        ...interpolateNode(a, b, c, d, t),
        tangent: vec(0, 0, 0),
        distance: 0
      });
    }
  }

  samples.push({
    ...nodes[nodes.length - 1],
    tangent: vec(0, 0, 0),
    distance: 0
  });

  let totalDistance = 0;

  for (let i = 0; i < samples.length; i++) {

    const previous = samples[Math.max(0, i - 1)];
    const next = samples[Math.min(samples.length - 1, i + 1)];

    samples[i].tangent = normalize(vec(
      next.position.x - previous.position.x,
      next.position.y - previous.position.y,
      next.position.z - previous.position.z
    ));

    if (i > 0) {
      totalDistance += distance(
        samples[i - 1].position,
        samples[i].position
      );
    }

    samples[i].distance = totalDistance;
  }

  return samples;
}

// --------------------------------------------------
// 4. READY-MADE TRACK PIECES
// --------------------------------------------------

export const TrackPieces = {

  straight(length = 20): TrackPiece {
    return {
      type: "straight",
      nodes: [
        { position: vec(0, 0, 0), bank: 0 },
        { position: vec(0, 0, length), bank: 0 }
      ]
    };
  },

  hill(height = 12, length = 35): TrackPiece {
    return {
      type: "hill",
      nodes: [
        { position: vec(0, 0, 0), bank: 0 },
        { position: vec(0, height, length / 2), bank: 0 },
        { position: vec(0, 0, length), bank: 0 }
      ]
    };
  },

  bankedTurn(radius = 20): TrackPiece {
    return {
      type: "bankedTurn",
      nodes: [
        { position: vec(0, 0, 0), bank: 0 },
        { position: vec(radius, 0, radius), bank: 30 },
        { position: vec(radius * 2, 0, 0), bank: 0 }
      ]
    };
  },

  verticalLoop(radius = 12): TrackPiece {
    const nodes: TrackNode[] = [];

    for (let i = 0; i <= 32; i++) {
      const angle = (i / 32) * Math.PI * 2;

      nodes.push({
        position: vec(
          radius * Math.sin(angle),
          radius * (1 - Math.cos(angle)),
          0
        ),
        bank: 0
      });
    }

    return {
      type: "verticalLoop",
      nodes
    };
  },

  corkscrew(radius = 8, length = 24): TrackPiece {
    const nodes: TrackNode[] = [];

    for (let i = 0; i <= 32; i++) {
      const t = i / 32;
      const angle = t * Math.PI * 2;

      nodes.push({
        position: vec(
          radius * Math.sin(angle),
          radius * Math.sin(angle) * 0.8,
          t * length
        ),
        bank: t * 360
      });
    }

    return {
      type: "corkscrew",
      nodes
    };
  },

  chainLift(height = 25, length = 50): TrackPiece {
    return {
      type: "chainLift",
      speed: 3,
      nodes: [
        { position: vec(0, 0, 0), bank: 0 },
        { position: vec(0, height, length), bank: 0 }
      ]
    };
  },

  launch(speed = 28, length = 30): TrackPiece {
    return {
      type: "launch",
      speed,
      nodes: [
        { position: vec(0, 0, 0), bank: 0 },
        { position: vec(0, 0, length), bank: 0 }
      ]
    };
  },

  brake(length = 15): TrackPiece {
    return {
      type: "brake",
      speed: 0,
      nodes: [
        { position: vec(0, 0, 0), bank: 0 },
        { position: vec(0, 0, length), bank: 0 }
      ]
    };
  },

  switchTrack(length = 20): TrackPiece {
    return {
      type: "switch",
      nodes: [
        { position: vec(0, 0, 0), bank: 0 },
        { position: vec(0, 0, length), bank: 0 }
      ]
    };
  },

  splashdown(length = 25): TrackPiece {
    return {
      type: "splashdown",
      nodes: [
        { position: vec(0, 0, 0), bank: 0 },
        { position: vec(0, -3, length / 2), bank: 0 },
        { position: vec(0, 0, length), bank: 0 }
      ]
    };
  }

};

// --------------------------------------------------
// 5. TRAIN SIMULATION
// --------------------------------------------------

export class CoasterTrain {

  position = 0;
  speed = 0;

  constructor(
    public track: TrackSample[]
  ) {}

  update(deltaTime: number) {

    if (this.track.length < 2) return;

    const totalLength =
      this.track[this.track.length - 1].distance;

    const sampleIndex = this.track.findIndex(
      point => point.distance >= this.position
    );

    const current =
      this.track[Math.max(0, sampleIndex)];

    if (!current) return;

    let acceleration = -0.15;

    if (current) {
      acceleration += -9.81 * current.tangent.y;
    }

    this.speed = Math.max(
      0,
      this.speed + acceleration * deltaTime
    );

    this.position = Math.min(
      totalLength,
      this.position + this.speed * deltaTime
    );
  }

  getCurrentPosition() {

    if (!this.track.length) return null;

    return this.track.find(
      point => point.distance >= this.position
    ) || this.track[this.track.length - 1];
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

    if (
      distance(
        nodes[i - 1].position,
        nodes[i].position
      ) < 0.01
    ) {
      errors.push(
        `Control points ${i - 1} and ${i} overlap.`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// --------------------------------------------------
// END FEATURE 171
// ==================================================

// ============================================
// FEATURE 172: CUSTOM INVERSION DESIGNER
// ============================================

type CustomInversion = {
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

  createInversion(
    settings: CustomInversion
  ) {

    const design = {
      name: settings.name,
      height: Math.max(2, settings.height),
      width: Math.max(2, settings.width),
      rotations: Math.max(0.1, settings.rotations),
      length: Math.max(5, settings.length),
      twist: settings.twist,
      bank: settings.bank
    };

    this.designs.push(design);

    return design;
  }

  generateTrack(
    design: CustomInversion
  ): TrackNode[] {

    const nodes: TrackNode[] = [];
    const resolution = 64;

    for (let i = 0; i <= resolution; i++) {

      const t = i / resolution;
      const angle =
        t * Math.PI * 2 * design.rotations;

      const twist =
        angle + t * design.twist * Math.PI / 180;

      nodes.push({
        position: vec(
          design.width * Math.sin(angle),
          design.height * (1 - Math.cos(angle)) +
            design.height * 0.15 * Math.sin(twist),
          t * design.length
        ),

        bank:
          Math.sin(twist) * design.bank
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

// ============================================
// END FEATURE 172
// ============================================
