/**
 * Data-only definition of the premade hilltop mansion and its five live-in
 * maids. Geometry lives in world/premadeMansion.ts; the engine walks the
 * patrol routes declared here.
 */

export const MANSION_SPEC = {
  stories: 3,
  bedrooms: 16,
  bathrooms: 16,
  musicLounges: 2,
  talkingAreas: 1,
  indoorPools: 1,
  maids: 5,
} as const;

/** 100 ft, the distance the head maid can carry a coaster with one hand. */
export const COASTER_RELOCATION_FEET = 100;
export const COASTER_RELOCATION_METERS = 30.48;

export type MaidWork =
  | 'cook'
  | 'serve'
  | 'make_bed'
  | 'clean_room'
  | 'clean_bath'
  | 'clean_car'
  | 'clean_interior'
  | 'hydraulics'
  | 'speakers'
  | 'headlights'
  | 'repair'
  | 'coaster_feat';

export interface MaidWaypoint {
  /** Mansion-local metres. */
  x: number;
  y: number;
  z: number;
  label: string;
  work: MaidWork;
  pause: number;
}

export interface MaidDefinition {
  id: string;
  name: string;
  role: string;
  uniform: 'classic' | 'housekeeping' | 'laundry' | 'detailer' | 'repair';
  speed: number;
  tasks: MaidWork[];
  route: MaidWaypoint[];
}

const GROUND = 0.08;
const SECOND = 3.68;
const THIRD = 7.28;

const suiteBedRoute = (y: number): MaidWaypoint[] => {
  const points: MaidWaypoint[] = [];
  for (const side of [-1, 1]) {
    for (let col = 0; col < 4; col++) {
      points.push({
        x: -9.3 + col * 6.2,
        y,
        z: side * 6,
        label: side < 0 ? `North suite ${col + 1}` : `South suite ${col + 1}`,
        work: 'make_bed',
        pause: 6,
      });
    }
  }
  return points;
};

const suiteBathRoute = (y: number): MaidWaypoint[] =>
  suiteBedRoute(y).map((point, index) => ({
    x: point.x + 2.15,
    y,
    z: point.z - Math.sign(point.z) * 1.45,
    label: `En-suite bath ${index + 1}`,
    work: 'clean_bath',
    pause: 5,
  }));

export const MANSION_MAIDS: MaidDefinition[] = [
  {
    id: 'maid_beatrice',
    name: 'Beatrice',
    role: 'Head Housekeeper · Cook & Server',
    uniform: 'classic',
    speed: 0.85,
    tasks: ['cook', 'serve', 'make_bed', 'repair'],
    route: [
      { x: 9.6, y: GROUND, z: -5.2, label: 'Kitchen range', work: 'cook', pause: 7 },
      { x: 9.6, y: GROUND, z: -1.2, label: 'Prep island', work: 'cook', pause: 4 },
      { x: 9.4, y: GROUND, z: 4.6, label: 'Dining room', work: 'serve', pause: 5 },
      { x: 1.4, y: GROUND, z: 2.4, label: 'Talking lounge', work: 'serve', pause: 5 },
      { x: 0, y: GROUND, z: 6.6, label: 'Grand foyer', work: 'serve', pause: 3 },
    ],
  },
  {
    id: 'maid_rosa',
    name: 'Rosa',
    role: 'Bedroom Housekeeper · Beds & Linens',
    uniform: 'housekeeping',
    speed: 1.1,
    tasks: ['make_bed', 'clean_room', 'repair'],
    route: suiteBedRoute(SECOND),
  },
  {
    id: 'maid_imani',
    name: 'Imani',
    role: 'Bathroom & Laundry Maid',
    uniform: 'laundry',
    speed: 1.05,
    tasks: ['clean_bath', 'clean_room', 'repair'],
    route: suiteBathRoute(THIRD),
  },
  {
    id: 'maid_tasha',
    name: 'Tasha',
    role: 'Vehicle Detailer · Interiors, Hydraulics & Speakers',
    uniform: 'detailer',
    speed: 1.2,
    tasks: [
      'clean_car',
      'clean_interior',
      'hydraulics',
      'speakers',
      'headlights',
      'repair',
    ],
    route: [
      { x: 18.2, y: GROUND, z: -5.5, label: 'Detail bay · black coupe', work: 'clean_car', pause: 6 },
      { x: 18.2, y: GROUND, z: -3.7, label: 'Hydraulic pump rack', work: 'hydraulics', pause: 5 },
      { x: 18.2, y: GROUND, z: 2.4, label: 'Interior vacuum', work: 'clean_interior', pause: 6 },
      { x: 16.8, y: GROUND, z: 4.4, label: 'Speaker test bench', work: 'speakers', pause: 5 },
      { x: 18.2, y: GROUND, z: 0.2, label: 'Headlight aiming wall', work: 'headlights', pause: 4 },
    ],
  },
  {
    id: 'maid_bianca',
    name: 'Bianca',
    role: 'Repair Maid & Resident Strongwoman',
    uniform: 'repair',
    speed: 1.15,
    tasks: ['repair', 'speakers', 'headlights', 'hydraulics', 'coaster_feat'],
    route: [
      { x: -4.6, y: GROUND, z: -5.2, label: 'Music lounge A speakers', work: 'speakers', pause: 5 },
      { x: 4.6, y: GROUND, z: -5.2, label: 'Music lounge B amplifier', work: 'speakers', pause: 5 },
      { x: 0, y: GROUND, z: 5.4, label: 'Grand chandelier', work: 'repair', pause: 4 },
      { x: 16.8, y: GROUND, z: 1.2, label: 'Motor court headlights', work: 'headlights', pause: 4 },
      { x: 16.4, y: GROUND, z: 7.4, label: 'Waterpark coaster display', work: 'coaster_feat', pause: 7 },
    ],
  },
];

export const MANSION_MAID_NAMES = MANSION_MAIDS.map((maid) => maid.name);

export function getMansionMaid(id: string): MaidDefinition | undefined {
  return MANSION_MAIDS.find((maid) => maid.id === id);
}

export interface MaidPatrolState {
  waypoint: number;
  x: number;
  y: number;
  z: number;
  pauseLeft: number;
  walkPhase: number;
}

export function createMaidPatrolState(maid: MaidDefinition): MaidPatrolState {
  const start = maid.route[0];
  return {
    waypoint: maid.route.length > 1 ? 1 : 0,
    x: start?.x ?? 0,
    y: start?.y ?? 0,
    z: start?.z ?? 0,
    pauseLeft: 0,
    walkPhase: 0,
  };
}

export interface MaidPatrolStep {
  x: number;
  y: number;
  z: number;
  moving: boolean;
  working: MaidWork | null;
  waypoint: number;
  /** 0..1 progress through the current work pause, for animation. */
  workProgress: number;
}

/** Advances one maid along her duty route. Mutates `state`, returns the frame pose. */
export function stepMaidPatrol(
  maid: MaidDefinition,
  state: MaidPatrolState,
  dt: number,
): MaidPatrolStep {
  const route = maid.route;
  if (!route.length) {
    return {
      x: state.x,
      y: state.y,
      z: state.z,
      moving: false,
      working: null,
      waypoint: 0,
      workProgress: 0,
    };
  }
  const target = route[state.waypoint % route.length];
  const pause = target.pause;

  if (state.pauseLeft > 0) {
    state.pauseLeft = Math.max(0, state.pauseLeft - dt);
    state.walkPhase = 0;
    const progress = pause > 0 ? 1 - state.pauseLeft / pause : 0;
    if (state.pauseLeft === 0) {
      state.waypoint = (state.waypoint + 1) % route.length;
    }
    return {
      x: state.x,
      y: state.y,
      z: state.z,
      moving: false,
      working: target.work,
      waypoint: state.waypoint,
      workProgress: progress,
    };
  }

  const dx = target.x - state.x;
  const dy = target.y - state.y;
  const dz = target.z - state.z;
  const distance = Math.hypot(dx, dy, dz);
  if (distance <= 0.08) {
    state.pauseLeft = pause;
    state.x = target.x;
    state.y = target.y;
    state.z = target.z;
    return {
      x: state.x,
      y: state.y,
      z: state.z,
      moving: false,
      working: target.work,
      waypoint: state.waypoint,
      workProgress: 0,
    };
  }

  const step = Math.min(distance, Math.max(0.001, maid.speed) * Math.max(0, dt));
  const inv = 1 / distance;
  state.x += dx * inv * step;
  state.y += dy * inv * step;
  state.z += dz * inv * step;
  state.walkPhase += dt * 8.4;
  return {
    x: state.x,
    y: state.y,
    z: state.z,
    moving: true,
    working: null,
    waypoint: state.waypoint,
    workProgress: 0,
  };
}

/** Short human-readable duty line used by toasts and tests. */
export function describeMaidDuties(maid: MaidDefinition): string {
  return `${maid.name}: ${maid.tasks.join(', ').replaceAll('_', ' ')}`;
}
