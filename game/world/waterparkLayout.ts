import { HILL_HOUSE_POS } from './terrain';

/**
 * The premade Hilltop Waterpark sits directly behind the starter shelter,
 * downhill from the back of the hill house. Its deck is a single level so the
 * slides, pools and lazy river can use real gravity-fed water without carving a
 * second crater into the island.
 */
export const WATERPARK_SITE = { x: -126, y: 5.35, z: 214, yaw: 0 };
export const WATERPARK_DECK_HALF_W = 47;
export const WATERPARK_DECK_HALF_D = 44;
export const WATERPARK_DECK_Y = WATERPARK_SITE.y;
export const WATERPARK_NAME = 'Bayou Thunder Waterpark';

export interface WaterparkPoint {
  x: number;
  y: number;
  z: number;
}

export type WaterparkSlideKind =
  | 'body'
  | 'tube'
  | 'raft'
  | 'mat'
  | 'bowl'
  | 'halfpipe'
  | 'watercoaster'
  | 'drop'
  | 'log'
  | 'kids';

export type WaterparkSlideStyle =
  | 'spiral'
  | 'snake'
  | 'straight'
  | 'drop'
  | 'wave'
  | 'bowl'
  | 'halfpipe'
  | 'racer'
  | 'kids'
  | 'log';

export type WaterparkTowerId = 'main' | 'east' | 'family' | 'kids';

export interface WaterparkTowerSpec {
  id: WaterparkTowerId;
  name: string;
  x: number;
  z: number;
  height: number;
  color: string;
}

export interface WaterparkSlideSpec {
  id: string;
  name: string;
  kind: WaterparkSlideKind;
  style: WaterparkSlideStyle;
  tower: WaterparkTowerId;
  /** Metres above the deck at the top platform. */
  topHeight: number;
  start: { x: number; z: number };
  /** Local splashdown edge; the rider exits onto the pool deck here. */
  exit: { x: number; z: number };
  /** Horizontal metres covered by a full helix / bowl, when relevant. */
  turns?: number;
  radius?: number;
  side?: -1 | 1;
  lanes?: number;
  color: string;
  accent: string;
  /** Optional authored local path with heights measured above deck. */
  customPath?: { x: number; z: number; height: number }[];
}

export const WATERPARK_TOWERS: readonly WaterparkTowerSpec[] = [
  { id: 'main', name: 'Bayou Thunder Summit', x: 0, z: -8, height: 64, color: '#0f766e' },
  { id: 'east', name: 'Anaconda Ridge', x: 31, z: 2, height: 44, color: '#166534' },
  { id: 'family', name: 'Scorpion Hollow', x: -30, z: -10, height: 32, color: '#b45309' },
  { id: 'kids', name: 'Tadpole Landing', x: -30, z: 20, height: 13, color: '#0369a1' },
];

/** One continuous spiral staircase wraps each tower from the deck to its summit deck. */
export const WATERPARK_TOWER_STAIR = {
  radius: 4.55,
  width: 1.45,
  baseRise: 0.35,
  landingRise: 0.25,
} as const;

export function getWaterparkTowerStairTurns(height: number): number {
  return height > 50 ? 4 : height > 30 ? 3 : 2;
}

/** Stair-walking height at t = 0 (deck) through t = 1 (summit landing). */
export function getWaterparkTowerStairY(height: number, t: number): number {
  return (
    WATERPARK_DECK_Y +
    WATERPARK_TOWER_STAIR.baseRise +
    clamp(t, 0, 1) * (height - 0.1)
  );
}

export const WATERPARK_POOLS = [
  { id: 'wave', name: 'Hurricane Bay Wave Pool', x: -2, z: 26, w: 38, d: 20, depth: 1.8 },
  { id: 'splash', name: 'Anaconda Splash Basin', x: 36, z: 12, w: 18, d: 14, depth: 1.4 },
  { id: 'family', name: 'Scorpion Family Lagoon', x: -33, z: 4, w: 20, d: 12, depth: 1.2 },
  { id: 'dump', name: 'Delta Drench Deck', x: 27, z: 28, w: 22, d: 16, depth: 0.4 },
  { id: 'kids', name: 'Tadpole Splash Pad', x: -31, z: 31, w: 22, d: 10, depth: 0.55 },
  { id: 'log', name: 'Timber Train Splash Pool', x: 36, z: 40, w: 16, d: 9, depth: 1.6 },
] as const;

/**
 * 28 individually named slides. The list deliberately covers body slides,
 * enclosed tubes, family rafts, mat racers, bowls, a halfpipe, a water coaster
 * and a log flume, so the park has the full 15-35 attraction range requested.
 */
export const WATERPARK_SLIDES: readonly WaterparkSlideSpec[] = [
  {
    id: 'mississippi_monster',
    name: 'Mississippi Monster',
    kind: 'drop',
    style: 'drop',
    tower: 'main',
    topHeight: 63.5,
    start: { x: -3, z: -6 },
    exit: { x: -18, z: 21 },
    side: -1,
    color: '#e11d48',
    accent: '#fde68a',
  },
  {
    id: 'black_anaconda',
    name: 'Black Anaconda Water Coaster',
    kind: 'watercoaster',
    style: 'wave',
    tower: 'main',
    topHeight: 56,
    start: { x: 3, z: -6 },
    exit: { x: 36, z: 20 },
    side: 1,
    color: '#14532d',
    accent: '#bef264',
  },
  {
    id: 'scorpions_tail',
    name: "Scorpion's Tail Family Raft",
    kind: 'raft',
    style: 'snake',
    tower: 'main',
    topHeight: 51,
    start: { x: 0, z: -12 },
    exit: { x: 12, z: 34 },
    side: -1,
    color: '#d97706',
    accent: '#fef3c7',
  },
  {
    id: 'king_cobra',
    name: 'King Cobra Freefall',
    kind: 'drop',
    style: 'drop',
    tower: 'main',
    topHeight: 58,
    start: { x: -4, z: -10 },
    exit: { x: 0, z: 35 },
    side: 1,
    color: '#7c3aed',
    accent: '#ddd6fe',
  },
  {
    id: 'python_pit',
    name: 'Python Pit Enclosed Tube',
    kind: 'tube',
    style: 'spiral',
    tower: 'main',
    topHeight: 44,
    start: { x: 4, z: -10 },
    exit: { x: -14, z: 35 },
    turns: 2.15,
    radius: 11,
    side: -1,
    color: '#0f766e',
    accent: '#5eead4',
  },
  {
    id: 'mamba_madness',
    name: 'Mamba Madness Bowl',
    kind: 'bowl',
    style: 'bowl',
    tower: 'main',
    topHeight: 38,
    start: { x: -2, z: -5 },
    exit: { x: 10, z: 15 },
    turns: 1.35,
    radius: 10,
    side: 1,
    color: '#be123c',
    accent: '#fecdd3',
  },
  {
    id: 'sidewinder_racers',
    name: 'Sidewinder Mat Racers',
    kind: 'mat',
    style: 'racer',
    tower: 'main',
    topHeight: 34,
    start: { x: 2, z: -5 },
    exit: { x: 18, z: 28 },
    lanes: 4,
    side: 1,
    color: '#0284c7',
    accent: '#e0f2fe',
  },
  {
    id: 'anaconda_rapids',
    name: 'Anaconda Rapids Group Raft',
    kind: 'raft',
    style: 'snake',
    tower: 'main',
    topHeight: 30,
    start: { x: -5, z: -8 },
    exit: { x: -20, z: 30 },
    side: -1,
    color: '#15803d',
    accent: '#dcfce7',
  },
  {
    id: 'delta_drop',
    name: 'Delta Drop Capsule',
    kind: 'drop',
    style: 'drop',
    tower: 'main',
    topHeight: 62,
    start: { x: 5, z: -8 },
    exit: { x: 2, z: 35 },
    side: 1,
    color: '#0891b2',
    accent: '#cffafe',
  },
  {
    id: 'bayou_blaster',
    name: 'Bayou Blaster Uphill Coaster',
    kind: 'watercoaster',
    style: 'wave',
    tower: 'east',
    topHeight: 42,
    start: { x: 34, z: 0 },
    exit: { x: 42, z: 9 },
    side: 1,
    color: '#4d7c0f',
    accent: '#ecfccb',
  },
  {
    id: 'hurricane_halfpipe',
    name: 'Hurricane Halfpipe',
    kind: 'halfpipe',
    style: 'halfpipe',
    tower: 'east',
    topHeight: 36,
    start: { x: 30, z: -1 },
    exit: { x: 29, z: 18 },
    side: -1,
    color: '#1d4ed8',
    accent: '#dbeafe',
  },
  {
    id: 'cyclone_bowl',
    name: 'Cyclone Bowl',
    kind: 'bowl',
    style: 'bowl',
    tower: 'east',
    topHeight: 33,
    start: { x: 33, z: 1 },
    exit: { x: 42, z: 15 },
    turns: 1.15,
    radius: 8,
    side: 1,
    color: '#7e22ce',
    accent: '#f3e8ff',
  },
  {
    id: 'pelican_plummet',
    name: 'Pelican Plummet Body Slide',
    kind: 'body',
    style: 'drop',
    tower: 'east',
    topHeight: 30,
    start: { x: 29, z: 3 },
    exit: { x: 35, z: 5 },
    side: -1,
    color: '#f59e0b',
    accent: '#fffbeb',
  },
  {
    id: 'gator_gulch',
    name: 'Gator Gulch Family Raft',
    kind: 'raft',
    style: 'snake',
    tower: 'east',
    topHeight: 26,
    start: { x: 32, z: 4 },
    exit: { x: 30, z: 19 },
    side: 1,
    color: '#365314',
    accent: '#d9f99d',
  },
  {
    id: 'cypress_twist',
    name: 'Cypress Twist Tube',
    kind: 'tube',
    style: 'spiral',
    tower: 'east',
    topHeight: 22,
    start: { x: 28, z: 0 },
    exit: { x: 43, z: 11 },
    turns: 1.4,
    radius: 8,
    side: -1,
    color: '#047857',
    accent: '#a7f3d0',
  },
  {
    id: 'jambalaya_jet',
    name: 'Jambalaya Jet',
    kind: 'body',
    style: 'snake',
    tower: 'east',
    topHeight: 18,
    start: { x: 35, z: 3 },
    exit: { x: 28, z: 14 },
    side: 1,
    color: '#c2410c',
    accent: '#ffedd5',
  },
  {
    id: 'timber_train_log_flume',
    name: 'Timber Train Log Flume',
    kind: 'log',
    style: 'log',
    tower: 'east',
    topHeight: 28,
    start: { x: 31, z: 0 },
    exit: { x: 36, z: 39 },
    side: 1,
    color: '#78350f',
    accent: '#fde68a',
    customPath: [
      { x: 31, z: 0, height: 28 },
      { x: 39, z: -25, height: 25 },
      { x: 43, z: -37, height: 17 },
      { x: 44, z: 22, height: 9 },
      { x: 42, z: 34, height: 4 },
      { x: 36, z: 39, height: 0.42 },
    ],
  },
  {
    id: 'bayou_boomerang',
    name: 'Bayou Boomerang Raft',
    kind: 'raft',
    style: 'bowl',
    tower: 'family',
    topHeight: 30,
    start: { x: -33, z: -13 },
    exit: { x: -33, z: 2 },
    turns: 1.2,
    radius: 8,
    side: -1,
    color: '#9a3412',
    accent: '#ffedd5',
  },
  {
    id: 'crawfish_crawl',
    name: 'Crawfish Crawl',
    kind: 'body',
    style: 'snake',
    tower: 'family',
    topHeight: 25,
    start: { x: -27, z: -8 },
    exit: { x: -26, z: 9 },
    side: 1,
    color: '#dc2626',
    accent: '#fee2e2',
  },
  {
    id: 'mossy_maze',
    name: 'Mossy Maze Enclosed Tube',
    kind: 'tube',
    style: 'spiral',
    tower: 'family',
    topHeight: 21,
    start: { x: -33, z: -7 },
    exit: { x: -40, z: 3 },
    turns: 1.6,
    radius: 7,
    side: -1,
    color: '#4d7c0f',
    accent: '#ecfccb',
  },
  {
    id: 'sugar_cane_double',
    name: 'Sugar Cane Double Tube',
    kind: 'raft',
    style: 'snake',
    tower: 'family',
    topHeight: 18,
    start: { x: -27, z: -12 },
    exit: { x: -28, z: 9 },
    side: -1,
    lanes: 2,
    color: '#65a30d',
    accent: '#f7fee7',
  },
  {
    id: 'voodoo_vortex',
    name: 'Voodoo Vortex',
    kind: 'bowl',
    style: 'bowl',
    tower: 'family',
    topHeight: 15,
    start: { x: -35, z: -10 },
    exit: { x: -24, z: 6 },
    turns: 1,
    radius: 6,
    side: 1,
    color: '#6b21a8',
    accent: '#f3e8ff',
  },
  {
    id: 'midnight_express',
    name: 'Midnight Express',
    kind: 'tube',
    style: 'spiral',
    tower: 'family',
    topHeight: 12,
    start: { x: -30, z: -13 },
    exit: { x: -42, z: 6 },
    turns: 1.2,
    radius: 6,
    side: 1,
    color: '#1e293b',
    accent: '#93c5fd',
  },
  {
    id: 'pelican_peewee',
    name: 'Pelican Peewee',
    kind: 'kids',
    style: 'kids',
    tower: 'kids',
    topHeight: 11,
    start: { x: -30, z: 17 },
    exit: { x: -30, z: 26 },
    side: -1,
    color: '#0ea5e9',
    accent: '#e0f2fe',
  },
  {
    id: 'tadpole_twister',
    name: 'Tadpole Twister',
    kind: 'kids',
    style: 'spiral',
    tower: 'kids',
    topHeight: 10,
    start: { x: -34, z: 20 },
    exit: { x: -21, z: 33 },
    turns: 0.8,
    radius: 5,
    side: 1,
    color: '#22c55e',
    accent: '#dcfce7',
  },
  {
    id: 'gator_giggle',
    name: 'Gator Giggle Double Slide',
    kind: 'kids',
    style: 'kids',
    tower: 'kids',
    topHeight: 8,
    start: { x: -26, z: 21 },
    exit: { x: -38, z: 33 },
    side: -1,
    lanes: 2,
    color: '#f97316',
    accent: '#ffedd5',
  },
  {
    id: 'cypress_jr',
    name: 'Cypress Jr. Bowl',
    kind: 'kids',
    style: 'bowl',
    tower: 'kids',
    topHeight: 7,
    start: { x: -33, z: 23 },
    exit: { x: -30, z: 36 },
    turns: 0.8,
    radius: 4,
    side: 1,
    color: '#14b8a6',
    accent: '#ccfbf1',
  },
  {
    id: 'bayou_bubble',
    name: 'Bayou Bubble Body Slide',
    kind: 'kids',
    style: 'kids',
    tower: 'kids',
    topHeight: 5,
    start: { x: -27, z: 24 },
    exit: { x: -22, z: 36 },
    side: -1,
    color: '#eab308',
    accent: '#fef9c3',
  },
] as const;

export const WATERPARK_LAZY_RIVER = {
  name: 'Bayou Slow Current',
  x: 0,
  z: 0,
  halfW: 40,
  halfD: 37,
  corner: 14,
  width: 5.6,
  speed: 1.35,
} as const;

export const WATERPARK_DUMP_BUCKET = {
  id: 'delta_dump_bucket',
  name: 'Delta Dump Bucket',
  x: 27,
  z: 35,
  top: 18,
  capacityGallons: 1500,
  cycleSeconds: 12,
  tipAt: 8.6,
  soakRadius: 12,
} as const;

export const WATERPARK_FEATURES = [
  {
    id: 'lazy_river',
    name: 'Bayou Slow Current Lazy River',
    x: 0,
    z: -40,
    kind: 'lazy' as const,
  },
  {
    id: 'wave_pool',
    name: 'Hurricane Bay Wave Pool',
    x: -2,
    z: 14,
    kind: 'wave' as const,
  },
  {
    id: 'dump_bucket',
    name: 'Delta Dump Bucket Soak Zone',
    x: 27,
    z: 37,
    kind: 'bucket' as const,
  },
] as const;

export interface WaterparkSavedState {
  version: 1;
  ridesCompleted: number;
  visits: number;
  soaks: number;
  bestTimes: Record<string, number>;
  lastRideId: string | null;
}

export const DEFAULT_WATERPARK_STATE: WaterparkSavedState = {
  version: 1,
  ridesCompleted: 0,
  visits: 0,
  soaks: 0,
  bestTimes: {},
  lastRideId: null,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function pointInRoundRect(
  x: number,
  z: number,
  halfW: number,
  halfD: number,
  corner: number,
): boolean {
  const ax = Math.abs(x);
  const az = Math.abs(z);
  if (ax > halfW || az > halfD) return false;
  const ix = Math.max(0, ax - (halfW - corner));
  const iz = Math.max(0, az - (halfD - corner));
  return Math.hypot(ix, iz) <= corner;
}

/** True for the deck footprint, service apron and the back-of-house access bridge. */
export function isInWaterparkClearZone(x: number, z: number): boolean {
  const dx = x - WATERPARK_SITE.x;
  const dz = z - WATERPARK_SITE.z;
  if (pointInRoundRect(dx, dz, WATERPARK_DECK_HALF_W + 10, WATERPARK_DECK_HALF_D + 10, 24)) {
    return true;
  }
  // Raised skybridge from the rear of the hill house to the park gate.
  const bx0 = HILL_HOUSE_POS.x - 8;
  const bz0 = HILL_HOUSE_POS.z + 10;
  const bx1 = WATERPARK_SITE.x + 38;
  const bz1 = WATERPARK_SITE.z - 44;
  const vx = bx1 - bx0;
  const vz = bz1 - bz0;
  const lenSq = vx * vx + vz * vz;
  const t = lenSq > 0 ? clamp(((x - bx0) * vx + (z - bz0) * vz) / lenSq, 0, 1) : 0;
  return Math.hypot(x - (bx0 + vx * t), z - (bz0 + vz * t)) < 7;
}

/**
 * Walkable deck, skybridge, spiral tower stairs and summit decks. The ground
 * solver calls this every frame, so a player can physically climb every tower
 * instead of only boarding from a ground kiosk.
 */
export function getWaterparkSurfaceY(
  x: number,
  z: number,
  footY: number,
  prevFootY = footY,
): number {
  const dx = x - WATERPARK_SITE.x;
  const dz = z - WATERPARK_SITE.z;
  const sweepFootY = Math.max(footY, prevFootY);
  let bestY = -9999;

  if (
    pointInRoundRect(dx, dz, WATERPARK_DECK_HALF_W, WATERPARK_DECK_HALF_D, 16) &&
    sweepFootY >= WATERPARK_DECK_Y - 1.85
  ) {
    bestY = WATERPARK_DECK_Y;
  }

  for (const tower of WATERPARK_TOWERS) {
    const localX = dx - tower.x;
    const localZ = dz - tower.z;
    const summitY = WATERPARK_DECK_Y + tower.height + WATERPARK_TOWER_STAIR.landingRise;

    // Summit landing, inset just enough that the rising spiral stair is not
    // mistaken for the deck on the turn directly below it.
    if (
      Math.abs(localX) <= 4.6 &&
      Math.abs(localZ) <= 4.6 &&
      Math.hypot(localX, localZ) <= 4.18 &&
      sweepFootY >= summitY - 0.65 &&
      summitY > bestY
    ) {
      bestY = summitY;
    }

    // Spiral stair ribbon. Multiple turns occupy the same X/Z footprint at
    // different heights, so pick the tread closest to the player's feet.
    const radial = Math.hypot(localX, localZ);
    if (Math.abs(radial - WATERPARK_TOWER_STAIR.radius) > 0.82) continue;
    let angle = Math.atan2(localZ, localX);
    if (angle < 0) angle += Math.PI * 2;
    const turns = getWaterparkTowerStairTurns(tower.height);
    for (let turn = 0; turn <= turns; turn++) {
      const t = (angle / (Math.PI * 2) + turn) / turns;
      if (t > 1.000001) continue;
      const stairY = getWaterparkTowerStairY(tower.height, t);
      if (stairY <= sweepFootY + 0.62 && stairY > bestY) {
        bestY = stairY;
      }
    }
  }

  const bx0 = HILL_HOUSE_POS.x - 8;
  const bz0 = HILL_HOUSE_POS.z + 10;
  const bx1 = WATERPARK_SITE.x + 38;
  const bz1 = WATERPARK_SITE.z - 44;
  const vx = bx1 - bx0;
  const vz = bz1 - bz0;
  const lenSq = vx * vx + vz * vz;
  const t = lenSq > 0 ? clamp(((x - bx0) * vx + (z - bz0) * vz) / lenSq, 0, 1) : 0;
  const distance = Math.hypot(x - (bx0 + vx * t), z - (bz0 + vz * t));
  if (distance < 3.2) {
    const bridgeY = lerp(8.4, WATERPARK_DECK_Y, t);
    if (sweepFootY >= bridgeY - 1.85 && bridgeY > bestY) bestY = bridgeY;
  }
  return bestY;
}

export function getWaterparkBridgeLine() {
  return {
    x0: HILL_HOUSE_POS.x - 8,
    z0: HILL_HOUSE_POS.z + 10,
    y0: 8.4,
    x1: WATERPARK_SITE.x + 38,
    z1: WATERPARK_SITE.z - 44,
    y1: WATERPARK_DECK_Y,
  };
}

/** Deterministic control points for one slide, in park-local metres. */
export function buildWaterparkSlidePath(
  slide: WaterparkSlideSpec,
  deckY = WATERPARK_DECK_Y,
): WaterparkPoint[] {
  const startY = deckY + slide.topHeight;
  const endY = deckY + 0.42;
  const sx = slide.start.x;
  const sz = slide.start.z;
  const ex = slide.exit.x;
  const ez = slide.exit.z;
  const dx = ex - sx;
  const dz = ez - sz;
  const horizontal = Math.max(0.001, Math.hypot(dx, dz));
  const dirX = dx / horizontal;
  const dirZ = dz / horizontal;
  const side = slide.side ?? 1;
  const perpX = -dirZ * side;
  const perpZ = dirX * side;
  const maxY = startY;
  const minY = deckY + 0.34;
  const half = WATERPARK_DECK_HALF_W - 1.4;
  const depth = WATERPARK_DECK_HALF_D - 1.4;

  const safe = (x: number, y: number, z: number): WaterparkPoint => ({
    x: clamp(x, -half, half),
    y: clamp(y, minY, maxY),
    z: clamp(z, -depth, depth),
  });

  if (slide.customPath && slide.customPath.length >= 2) {
    return slide.customPath.map((p) => safe(p.x, deckY + p.height, p.z));
  }

  if (slide.style === 'spiral' || slide.style === 'bowl') {
    const radius = slide.radius ?? 8;
    const turns = slide.turns ?? 1.6;
    const points: WaterparkPoint[] = [];
    const spiralSteps = Math.max(18, Math.round(turns * 14));
    const spiralEndY = slide.style === 'bowl' ? deckY + 7.5 : deckY + 1.1;
    for (let i = 0; i <= spiralSteps; i++) {
      const t = i / spiralSteps;
      const angle = -Math.PI * 0.5 + t * turns * Math.PI * 2;
      const r = radius * (1.0 - 0.42 * t);
      points.push(
        safe(
          sx + Math.cos(angle) * r,
          lerp(startY, spiralEndY, smoothstep(0, 1, t)),
          sz + Math.sin(angle) * r,
        ),
      );
    }
    if (slide.style === 'bowl') {
      const bowlRadius = Math.max(4.5, radius * 0.72);
      const bowlSteps = 18;
      const bowlStartY = deckY + 7.5;
      for (let i = 1; i <= bowlSteps; i++) {
        const t = i / bowlSteps;
        const angle = Math.PI * 1.4 * t;
        const r = bowlRadius * (1 - 0.72 * t);
        points.push(
          safe(
            ex + Math.cos(angle) * r,
            lerp(bowlStartY, deckY + 0.8, t),
            ez + Math.sin(angle) * r,
          ),
        );
      }
    }
    const last = points[points.length - 1];
    for (let i = 1; i <= 6; i++) {
      const t = i / 6;
      points.push(
        safe(
          lerp(last.x, ex, t),
          lerp(last.y, endY, t),
          lerp(last.z, ez, t),
        ),
      );
    }
    return points;
  }

  if (slide.style === 'log') {
    const points: WaterparkPoint[] = [];
    const count = 30;
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      const angle = t * Math.PI * 1.75;
      const r = 20 + Math.sin(angle * 2) * 5;
      const x = lerp(sx, ex, t) + Math.cos(angle) * r * (1 - t) * 0.8;
      const z = lerp(sz, ez, t) + Math.sin(angle) * r * (1 - t) * 0.7;
      const y =
        t < 0.25
          ? lerp(startY, deckY + 17, t / 0.25)
          : t < 0.82
            ? lerp(deckY + 17, deckY + 2.4, (t - 0.25) / 0.57)
            : lerp(deckY + 2.4, endY, (t - 0.82) / 0.18);
      points.push(safe(x, y, z));
    }
    return points;
  }

  if (slide.style === 'drop') {
    const points: WaterparkPoint[] = [];
    const count = 26;
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      const bend = Math.sin(t * Math.PI) * Math.min(7, horizontal * 0.22);
      const run = smoothstep(0.12, 0.72, t);
      points.push(
        safe(
          sx + dirX * horizontal * t + perpX * bend,
          lerp(startY, deckY + 0.6, run),
          sz + dirZ * horizontal * t + perpZ * bend,
        ),
      );
    }
    return points;
  }

  if (slide.style === 'halfpipe') {
    const points: WaterparkPoint[] = [];
    const count = 30;
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      const base = lerp(startY, deckY + 2.6, smoothstep(0.08, 0.62, t));
      const wave = Math.sin(t * Math.PI * 3.2) * 4.2 * Math.sin(t * Math.PI);
      const lateral = Math.sin(t * Math.PI * 2) * 7 * Math.sin(t * Math.PI);
      points.push(
        safe(
          sx + dirX * horizontal * t + perpX * lateral,
          t > 0.82 ? lerp(base + wave, endY, (t - 0.82) / 0.18) : base + wave,
          sz + dirZ * horizontal * t + perpZ * lateral,
        ),
      );
    }
    return points;
  }

  const points: WaterparkPoint[] = [];
  const count =
    slide.style === 'racer' ? 18 : slide.style === 'kids' ? 16 : 28;
  const wiggleCount =
    slide.style === 'snake' ? 5 : slide.style === 'kids' ? 2 : 1;
  const amplitude =
    slide.style === 'snake'
      ? Math.min(13, 7 + horizontal * 0.22)
      : slide.style === 'kids'
        ? 2.6
        : slide.style === 'wave'
          ? 5
          : slide.style === 'racer'
            ? 0
            : 2.4;
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const envelope = Math.sin(t * Math.PI);
    const lateral = Math.sin(t * Math.PI * wiggleCount * 2) * amplitude * envelope;
    const extra = slide.style === 'wave' ? Math.sin(t * Math.PI * 4) * 4.5 * envelope : 0;
    points.push(
      safe(
        sx + dirX * horizontal * t + perpX * lateral,
        lerp(startY, endY, smoothstep(0.02, 0.98, t)) + extra,
        sz + dirZ * horizontal * t + perpZ * lateral,
      ),
    );
  }
  return points;
}

/** The full attraction's footprint is deliberately kept inside the deck. */
export function getWaterparkStats(): {
  slideCount: number;
  tallestM: number;
  totalDropM: number;
  bodySlides: number;
  familySlides: number;
  waterCoasters: number;
} {
  return {
    slideCount: WATERPARK_SLIDES.length,
    tallestM: Math.max(...WATERPARK_SLIDES.map((slide) => slide.topHeight)),
    totalDropM: WATERPARK_SLIDES.reduce((sum, slide) => sum + slide.topHeight, 0),
    bodySlides: WATERPARK_SLIDES.filter((slide) => slide.kind === 'body').length,
    familySlides: WATERPARK_SLIDES.filter(
      (slide) => slide.kind === 'raft' || slide.kind === 'kids',
    ).length,
    waterCoasters: WATERPARK_SLIDES.filter(
      (slide) => slide.kind === 'watercoaster' || slide.kind === 'log',
    ).length,
  };
}

export function sanitizeWaterparkState(raw: unknown): WaterparkSavedState {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Partial<WaterparkSavedState>;
  const bestTimes: Record<string, number> = {};
  if (source.bestTimes && typeof source.bestTimes === 'object') {
    for (const [id, time] of Object.entries(source.bestTimes)) {
      if (
        WATERPARK_SLIDES.some((slide) => slide.id === id) &&
        Number.isFinite(time) &&
        time > 0
      ) {
        bestTimes[id] = Math.min(3600, Math.max(1, Number(time)));
      }
    }
  }
  return {
    version: 1,
    ridesCompleted: clamp(Math.round(Number(source.ridesCompleted) || 0), 0, 1_000_000),
    visits: clamp(Math.round(Number(source.visits) || 0), 0, 1_000_000),
    soaks: clamp(Math.round(Number(source.soaks) || 0), 0, 1_000_000),
    bestTimes,
    lastRideId:
      typeof source.lastRideId === 'string' &&
      WATERPARK_SLIDES.some((slide) => slide.id === source.lastRideId)
        ? source.lastRideId
        : null,
  };
}
