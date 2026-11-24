/**
 * Six-car hilltop motor atelier layout and its five-person service crew.
 * Geometry and NPC meshes live in world/hilltopMotorAtelier.ts; the engine
 * runs the crew animation and applies the completed service cycle.
 */

export type GarageCrewTask = 'wash' | 'interior' | 'hydraulics' | 'audio' | 'lights';

export interface GarageCrewTaskSpec {
  id: GarageCrewTask;
  label: string;
  shortLabel: string;
  uniformColor: number;
  accentColor: number;
  tool: 'sponge' | 'vacuum' | 'wrench' | 'speaker' | 'lamp';
  /** Local metres from the car centre. */
  offsetX: number;
  offsetZ: number;
}

export const GARAGE_CREW_TASKS: readonly GarageCrewTaskSpec[] = [
  {
    id: 'wash',
    label: 'Exterior wash & ceramic wipe-down',
    shortLabel: 'Wash',
    uniformColor: 0x0ea5e9,
    accentColor: 0xe0f2fe,
    tool: 'sponge',
    offsetX: -1.45,
    offsetZ: 1.9,
  },
  {
    id: 'interior',
    label: 'Interior vacuum, shampoo & leather care',
    shortLabel: 'Interior',
    uniformColor: 0xf8fafc,
    accentColor: 0x94a3b8,
    tool: 'vacuum',
    offsetX: 1.5,
    offsetZ: 1.15,
  },
  {
    id: 'hydraulics',
    label: 'Hydraulic rebuild & new pump install',
    shortLabel: 'Hydraulics',
    uniformColor: 0xf59e0b,
    accentColor: 0x78350f,
    tool: 'wrench',
    offsetX: -1.45,
    offsetZ: -1.65,
  },
  {
    id: 'audio',
    label: 'Speaker & subwoofer install',
    shortLabel: 'Audio',
    uniformColor: 0xa855f7,
    accentColor: 0x3b0764,
    tool: 'speaker',
    offsetX: 1.5,
    offsetZ: -1.45,
  },
  {
    id: 'lights',
    label: 'Headlight repair & beam aiming',
    shortLabel: 'Lights',
    uniformColor: 0xfacc15,
    accentColor: 0x713f12,
    tool: 'lamp',
    offsetX: 0,
    offsetZ: 3.05,
  },
] as const;

export const GARAGE_CREW_PER_CAR = GARAGE_CREW_TASKS.length;

export interface GarageAtelierBay {
  index: number;
  label: string;
  /** Local metres from the atelier centre. */
  x: number;
  z: number;
  kind: 'lift' | 'display';
}

/** Four service lifts plus a display turntable at each end, all under one roof. */
export const GARAGE_ATELIER_BAYS: readonly GarageAtelierBay[] = [
  { index: 0, label: 'Lift A', x: -9, z: 0.6, kind: 'lift' },
  { index: 1, label: 'Lift B', x: -3, z: 0.6, kind: 'lift' },
  { index: 2, label: 'Lift C', x: 3, z: 0.6, kind: 'lift' },
  { index: 3, label: 'Lift D', x: 9, z: 0.6, kind: 'lift' },
  { index: 4, label: 'West Gallery', x: -15, z: 0.6, kind: 'display' },
  { index: 5, label: 'East Gallery', x: 15, z: 0.6, kind: 'display' },
] as const;

export interface GarageCrewPlacement {
  id: string;
  bayIndex: number;
  bayLabel: string;
  task: GarageCrewTask;
  x: number;
  z: number;
  facing: number;
}

/**
 * Produces exactly one worker for every task on every car, e.g. 5 x 6 = 30.
 * Coordinates are world-space and account for the atelier ground height.
 */
export function getGarageCrewPlacements(
  garageX: number,
  garageZ: number,
): GarageCrewPlacement[] {
  const placements: GarageCrewPlacement[] = [];
  for (const bay of GARAGE_ATELIER_BAYS) {
    for (const task of GARAGE_CREW_TASKS) {
      const x = garageX + bay.x + task.offsetX;
      const z = garageZ + bay.z + task.offsetZ;
      placements.push({
        id: `garage-tech-${bay.index}-${task.id}`,
        bayIndex: bay.index,
        bayLabel: bay.label,
        task: task.id,
        x,
        z,
        facing: Math.atan2(bay.x - (bay.x + task.offsetX), bay.z - (bay.z + task.offsetZ)),
      });
    }
  }
  return placements;
}

/** Five workers are assigned to one car; all five tasks must finish to service it. */
export function isGarageCarFullyDetailed(completedTasks: readonly GarageCrewTask[]): boolean {
  return GARAGE_CREW_TASKS.every((task) => completedTasks.includes(task.id));
}

/** True when the car should receive the hydraulic pump upgrade during service. */
export function supportsHydraulicUpgrade(preset: string | undefined): boolean {
  return (
    preset === 'lowrider' ||
    preset === 'donk' ||
    preset === 'slab' ||
    preset === 'cadillac_coupe_deville' ||
    preset === 'chevy_tahoe'
  );
}
