export type Vec3 = { x: number; y: number; z: number };

export type TrackPointKind =
  | 'track'
  | 'station'
  | 'unload_station'
  | 'storage'
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
  | 'station'
  | 'unload_station'
  | 'storage_track'
  | 'turn_left'
  | 'turn_right'
  | 's_bend_left'
  | 's_bend_right'
  | 'banked_turn_left'
  | 'banked_turn_right'
  | 'overbanked_turn_left'
  | 'overbanked_turn_right'
  | 'helix_left'
  | 'helix_right'
  | 'vertical_loop'
  | 'immelmann'
  | 'dive_loop'
  | 'cobra_roll'
  | 'corkscrew_left'
  | 'corkscrew_right'
  | 'barrel_roll'
  | 'zero_g_roll'
  | 'heartline_roll'
  | 'inline_twist'
  | 'custom_inversion'
  | 'airtime_hill'
  | 'camelback'
  | 'bunny_hills'
  | 'double_up'
  | 'double_down'
  | 'wave_turn'
  | 'overbank'
  | 'steep_drop'
  | 'beyond_vertical_drop'
  | 'vertical_track'
  | 'dive_track'
  | 'flying_transition'
  | 'lift_chain'
  | 'lift_cable'
  | 'launch'
  | 'launch_tire'
  | 'launch_magnetic'
  | 'launch_lsm'
  | 'launch_hydraulic'
  | 'swing_launch'
  | 'brake'
  | 'brake_friction'
  | 'block_brake'
  | 'brake_block'
  | 'magnetic_brake'
  | 'brake_magnetic'
  | 'transfer'
  | 'transfer_track'
  | 'switch'
  | 'switch_track'
  | 'drop'
  | 'drop_track'
  | 'tilt'
  | 'tilt_track'
  | 'movable_track'
  | 'spike';

export type CoasterTypeId =
  | 'steel_sit_down'
  | 'inverted'
  | 'suspended'
  | 'flying'
  | 'wing'
  | 'floorless'
  | 'hyper'
  | 'giga'
  | 'strata'
  | 'launch'
  | 'multi_launch'
  | 'hybrid'
  | 'wooden'
  | 'modern_wooden'
  | 'mine_train'
  | 'family'
  | 'junior'
  | 'wild_mouse'
  | 'spinning'
  | 'bobsled'
  | 'water'
  | 'powered'
  | 'motorbike'
  | 'single_rail'
  | 'alpine'
  | 'custom_experimental';

export type EditingMode = 'beginner' | 'advanced';
export type CameraProjection = 'perspective' | 'orthographic';
export type RideCameraMode = 'free' | 'front' | 'rear' | 'passenger' | 'side' | 'trackside';
export type SupportMaterial = 'steel' | 'wood' | 'concrete';

export interface ManualSupport {
  id: string;
  x: number;
  y: number;
  z: number;
  height: number;
  material: SupportMaterial;
  crossBrace: boolean;
}

export interface SupportSettings {
  auto: boolean;
  material: SupportMaterial;
  crossBrace: boolean;
  manual: ManualSupport[];
}

export interface CameraPose {
  projection: CameraProjection;
  position: Vec3;
  target: Vec3;
  rideMode: RideCameraMode;
}

export interface TrackPoint {
  id: string;
  position: Vec3;
  /** Track roll in degrees. Positive lowers the right rail. */
  bank: number;
  kind: TrackPointKind;
  element?: CoasterElementKind;
  /** Target speed for launches and powered sections, m/s. */
  targetSpeed?: number;
  /**
   * Optional forward tangent handle (world-space offset). The advanced NURBS
   * editor stores both directions so a point can be kept smooth or broken.
   */
  tangentOut?: Vec3;
  tangentIn?: Vec3;
}

export type RestraintKind = 'lap_bar' | 'otsr' | 'harness' | 'none';
export type TrainBodyStyle = 'steel' | 'launch' | 'wood' | 'wing' | 'invert' | 'flying';
export type WheelStyle = 'exposed' | 'covered';
export type ChassisStyle = 'open' | 'enclosed' | 'monocoque';
export type NoseStyle = 'rounded' | 'pointed' | 'flat' | 'shark';
export type SeatMaterial = 'padded' | 'molded' | 'timber';

export interface TrainDesign {
  id: string;
  name: string;
  prompt: string;
  cars: number;
  rowsPerCar: number;
  seatsPerRow: number;
  bodyStyle: TrainBodyStyle;
  chassisStyle: ChassisStyle;
  noseStyle: NoseStyle;
  seatMaterial: SeatMaterial;
  restraint: RestraintKind;
  wheels: WheelStyle;
  wheelColor: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  lighting: boolean;
  aeroFairing: boolean;
  notes: string[];
}

export interface CoasterProject {
  schemaVersion: 1;
  /** Amusement-park layout authored alongside this coaster. */
  park?: import('./park').ParkLayout;
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
  manufacturerId: string;
  coasterTypeId: CoasterTypeId;
  editingMode: EditingMode;
  splineResolution?: number;
  supports: SupportSettings;
  camera: CameraPose;
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
  estimatedMaxLateralG: number;
  estimatedMaxVerticalG: number;
  pointCount: number;
}

export interface TrackValidation {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export interface TrainTelemetry {
  speedKmh: number;
  speedMs: number;
  height: number;
  gForce: number;
  lateralG: number;
  combinedG: number;
  section: TrackPointKind;
  distance: number;
  lapProgress: number;
  state: string;
  massKg: number;
  riders: number;
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
