export type Vec3 = { x: number; y: number; z: number };

export type TrackPointKind =
  | 'track'
  | 'station'
  | 'chain_lift'
  | 'cable_lift'
  | 'launch'
  | 'brake'
  | 'block_brake'
  | 'magnetic_brake'
  | 'transfer'
  | 'switch'
  | 'drop'
  | 'tilt';

export type CoasterElementKind =
  | 'straight'
  | 'turn_left'
  | 'turn_right'
  | 'helix_left'
  | 'helix_right'
  | 'vertical_loop'
  | 'corkscrew_left'
  | 'corkscrew_right'
  | 'barrel_roll'
  | 'zero_g_roll'
  | 'airtime_hill'
  | 'camelback'
  | 'bunny_hills'
  | 'wave_turn'
  | 'dive_loop'
  | 'overbank'
  | 'immelmann'
  | 'lift_chain'
  | 'lift_cable'
  | 'launch'
  | 'brake'
  | 'block_brake'
  | 'magnetic_brake'
  | 'transfer'
  | 'switch'
  | 'drop'
  | 'tilt'
  | 'custom_inversion';

export interface TrackPoint {
  id: string;
  position: Vec3;
  /** Track roll in degrees. Positive lowers the right rail. */
  bank: number;
  kind: TrackPointKind;
  element?: CoasterElementKind;
  /** Target speed for launches and powered sections, m/s. */
  targetSpeed?: number;
}

export type RestraintKind = 'lap_bar' | 'otsr' | 'harness' | 'none';
export type TrainBodyStyle = 'steel' | 'launch' | 'wood' | 'wing' | 'invert' | 'flying';
export type WheelStyle = 'exposed' | 'covered';

export interface TrainDesign {
  id: string;
  name: string;
  prompt: string;
  cars: number;
  rowsPerCar: number;
  seatsPerRow: number;
  bodyStyle: TrainBodyStyle;
  restraint: RestraintKind;
  wheels: WheelStyle;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  lighting: boolean;
  aeroFairing: boolean;
  notes: string[];
}

export interface CoasterProject {
  schemaVersion: 1;
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  points: TrackPoint[];
  closed: boolean;
  autoBank: boolean;
  trackColor: string;
  supportColor: string;
  train: TrainDesign;
  trainCount: number;
}

export interface TrackSample {
  position: Vec3;
  tangent: Vec3;
  right: Vec3;
  up: Vec3;
  bank: number;
  distance: number;
  curvature: number;
  kind: TrackPointKind;
  element?: CoasterElementKind;
  pointIndex: number;
}

export interface TrackStats {
  length: number;
  maxHeight: number;
  minHeight: number;
  inversions: number;
  maxBank: number;
  estimatedPeakSpeedKmh: number;
  pointCount: number;
}

export interface TrackValidation {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export interface TrainTelemetry {
  speedKmh: number;
  height: number;
  gForce: number;
  lateralG: number;
  section: TrackPointKind;
  distance: number;
  lapProgress: number;
  state: string;
}

export interface MechanicalSnapshot {
  transfer: { installed: boolean; progress: number; side: 'main' | 'storage' };
  switchTrack: { installed: boolean; route: 'main' | 'storage'; progress: number };
  drop: { installed: boolean; progress: number; phase: 'up' | 'lowering' | 'down' | 'raising' };
  tilt: { installed: boolean; progress: number; phase: 'level' | 'tilting' | 'vertical' | 'resetting' };
  lastAction: string;
  blockStatus: { index: number; occupiedBy: number | null; kind: string }[];
  dispatchAllowed: boolean;
  sensors: string[];
}
