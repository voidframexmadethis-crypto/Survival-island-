import type { CoasterProject } from './types';

/**
 * Amusement-park layout authored next to a coaster project.
 *
 * Every element is placed in park-local metres. The studio renders parks on
 * its flat construction ground; Survival Island renders the same layout on a
 * surveyed flat site, so an imported park design stays faithful.
 */

export type ParkElementKind =
  | 'path'
  | 'queue'
  | 'gate'
  | 'carousel'
  | 'ferris_wheel'
  | 'swing_tower'
  | 'teacups'
  | 'drop_tower'
  | 'bumper_cars'
  | 'log_flume'
  | 'rapids'
  | 'splash_pool'
  | 'waterfall'
  | 'food_stall'
  | 'restaurant'
  | 'shop'
  | 'games_stall'
  | 'restroom'
  | 'arcade'
  | 'fountain'
  | 'tree'
  | 'bench'
  | 'lamp'
  | 'flower_bed'
  | 'stage';

export type ParkCategory = 'paths' | 'thrill' | 'family' | 'water' | 'shops' | 'scenery';

export type ParkTheme = 'gulf_coast' | 'boardwalk' | 'garden' | 'bayou';

export interface ParkElement {
  id: string;
  kind: ParkElementKind;
  /** Park-local X in metres. */
  x: number;
  /** Park-local Z in metres. */
  z: number;
  /** Yaw around Y in degrees. */
  rotation: number;
  /** Uniform footprint scale (0.6 - 2.4). */
  scale: number;
}

export interface ParkLayout {
  version: 1;
  name: string;
  theme: ParkTheme;
  elements: ParkElement[];
  visitorCount: number;
  entrance: { x: number; z: number; rotation: number };
}

export interface ParkCatalogEntry {
  kind: ParkElementKind;
  label: string;
  category: ParkCategory;
  description: string;
  footprint: { w: number; d: number };
  height: number;
  accent: string;
  /** Only one is meaningful per park (gate/entrance). */
  unique?: boolean;
}

export interface AmusementParkDeliveryPayload {
  name: string;
  park: ParkLayout;
  coaster?: {
    name: string;
    trackColor: string;
    trainCarCount: number;
    coasterType?: string;
    closed: boolean;
    points: {
      x: number;
      y: number;
      z: number;
      bank: number;
      kind: string;
      targetSpeed?: number;
    }[];
  };
  sentAt: number;
}

export const PARK_THEMES: { id: ParkTheme; label: string; description: string; grass: string; path: string }[] = [
  {
    id: 'gulf_coast',
    label: 'Gulf Coast',
    description: 'Sun-bleached boardwalk timber, teal accents and palm planting.',
    grass: '#6f8b5b',
    path: '#b8a88b',
  },
  {
    id: 'boardwalk',
    label: 'Seaside Boardwalk',
    description: 'Weathered planks, striped awnings and warm carnival lights.',
    grass: '#7d8d62',
    path: '#b58d5e',
  },
  {
    id: 'garden',
    label: 'Garden Park',
    description: 'Lush lawns, formal fountains and mature oak avenues.',
    grass: '#5f8055',
    path: '#c6bda8',
  },
  {
    id: 'bayou',
    label: 'Bayou Carnival',
    description: 'Cypress shades, rusted ironwork and amber lantern light.',
    grass: '#617a51',
    path: '#9d8b6f',
  },
];

export const PARK_CATALOG: readonly ParkCatalogEntry[] = [
  {
    kind: 'path',
    label: 'Park Path',
    category: 'paths',
    description: '4 m paved walkway. Click repeatedly to lay a connected promenade.',
    footprint: { w: 4, d: 4 },
    height: 0.12,
    accent: '#c2b39a',
  },
  {
    kind: 'queue',
    label: 'Queue Line',
    category: 'paths',
    description: 'Roped switchback queue feeding the nearest ride station.',
    footprint: { w: 3, d: 6 },
    height: 1.1,
    accent: '#7c8d9c',
  },
  {
    kind: 'gate',
    label: 'Entrance Gate',
    category: 'paths',
    description: 'Main park gate with ticket booths and a lit marquee.',
    footprint: { w: 14, d: 4 },
    height: 6.4,
    accent: '#f4c15f',
    unique: true,
  },
  {
    kind: 'carousel',
    label: 'Carousel',
    category: 'family',
    description: 'Double-decker carousel with 24 hand-painted horses.',
    footprint: { w: 14, d: 14 },
    height: 8,
    accent: '#e86f8a',
  },
  {
    kind: 'ferris_wheel',
    label: 'Ferris Wheel',
    category: 'family',
    description: '42 m observation wheel with sixteen passenger gondolas.',
    footprint: { w: 18, d: 10 },
    height: 42,
    accent: '#f2a541',
  },
  {
    kind: 'swing_tower',
    label: 'Swing Tower',
    category: 'thrill',
    description: 'Rotating chair swing with 12 gondolas on chains.',
    footprint: { w: 12, d: 12 },
    height: 26,
    accent: '#5fb3d9',
  },
  {
    kind: 'teacups',
    label: 'Teacup Spinners',
    category: 'family',
    description: 'Nine independently spinning teacups on a turn table.',
    footprint: { w: 12, d: 12 },
    height: 2.6,
    accent: '#a5d46a',
  },
  {
    kind: 'drop_tower',
    label: 'Drop Tower',
    category: 'thrill',
    description: '68 m free-fall tower with a magnetic brake run.',
    footprint: { w: 9, d: 9 },
    height: 68,
    accent: '#e05c4b',
  },
  {
    kind: 'bumper_cars',
    label: 'Bumper Cars',
    category: 'family',
    description: 'Covered arena with twelve live bumper cars.',
    footprint: { w: 18, d: 15 },
    height: 4.6,
    accent: '#6e7fd6',
  },
  {
    kind: 'log_flume',
    label: 'Log Flume',
    category: 'water',
    description: 'Elevated water trough with a lift, tunnel and splashdown trough.',
    footprint: { w: 19, d: 30 },
    height: 14,
    accent: '#4aa7c9',
  },
  {
    kind: 'rapids',
    label: 'River Rapids',
    category: 'water',
    description: 'Circular rapids channel with boulders, geysers and a station dock.',
    footprint: { w: 22, d: 22 },
    height: 3.2,
    accent: '#3f94ad',
  },
  {
    kind: 'splash_pool',
    label: 'Splash Pool',
    category: 'water',
    description: 'Splashdown basin that catches the flume boat and soaks onlookers.',
    footprint: { w: 16, d: 10 },
    height: 1.1,
    accent: '#4fb6cf',
  },
  {
    kind: 'waterfall',
    label: 'Concealment Waterfall',
    category: 'water',
    description: 'Tall rock waterfall that hides a ride entrance and a tunnel mouth behind it.',
    footprint: { w: 14, d: 6 },
    height: 22,
    accent: '#77c9dd',
  },
  {
    kind: 'food_stall',
    label: 'Food Stall',
    category: 'shops',
    description: 'Walk-up counter serving po-boys, corn dogs and snowballs.',
    footprint: { w: 5, d: 4 },
    height: 3.2,
    accent: '#e8894d',
  },
  {
    kind: 'restaurant',
    label: 'Park Restaurant',
    category: 'shops',
    description: 'Sit-down restaurant with an open kitchen and covered terrace.',
    footprint: { w: 14, d: 10 },
    height: 5.2,
    accent: '#c75f45',
  },
  {
    kind: 'shop',
    label: 'Souvenir Shop',
    category: 'shops',
    description: 'Walk-in shop with shelves, register and ride merchandise.',
    footprint: { w: 8, d: 6 },
    height: 4,
    accent: '#d7b25a',
  },
  {
    kind: 'games_stall',
    label: 'Midway Games',
    category: 'shops',
    description: 'Three carnival game booths with prizes and a lit marquee.',
    footprint: { w: 10, d: 4 },
    height: 3.6,
    accent: '#e267a0',
  },
  {
    kind: 'restroom',
    label: 'Restrooms',
    category: 'shops',
    description: 'Masonry restroom block with drinking fountains.',
    footprint: { w: 7, d: 5 },
    height: 3.4,
    accent: '#8fa1ae',
  },
  {
    kind: 'arcade',
    label: 'Arcade',
    category: 'shops',
    description: 'Glass-front arcade hall with cabinets and neon signage.',
    footprint: { w: 11, d: 7 },
    height: 4.6,
    accent: '#7b6ad1',
  },
  {
    kind: 'fountain',
    label: 'Fountain',
    category: 'scenery',
    description: 'Tiered fountain with lit water jets and a seating rim.',
    footprint: { w: 8, d: 8 },
    height: 4,
    accent: '#8fd3e8',
  },
  {
    kind: 'bench',
    label: 'Bench',
    category: 'scenery',
    description: 'Shaded bench facing the path.',
    footprint: { w: 2.2, d: 1.1 },
    height: 1.1,
    accent: '#8d6a48',
  },
  {
    kind: 'lamp',
    label: 'Park Lamp',
    category: 'scenery',
    description: 'Victorian lamp post with a warm evening globe.',
    footprint: { w: 1.2, d: 1.2 },
    height: 4.6,
    accent: '#f6cf7a',
  },
  {
    kind: 'tree',
    label: 'Live Oak',
    category: 'scenery',
    description: 'Mature live oak with a broad shade canopy.',
    footprint: { w: 6, d: 6 },
    height: 9,
    accent: '#4f7a45',
  },
  {
    kind: 'flower_bed',
    label: 'Flower Bed',
    category: 'scenery',
    description: 'Curbside bed of seasonal flowers and low shrubs.',
    footprint: { w: 4, d: 4 },
    height: 0.7,
    accent: '#e7839a',
  },
  {
    kind: 'stage',
    label: 'Show Stage',
    category: 'scenery',
    description: 'Covered amphitheatre stage for park shows and live music.',
    footprint: { w: 16, d: 11 },
    height: 7,
    accent: '#c76b8f',
  },
];

const CATALOG_BY_KIND = new Map(PARK_CATALOG.map((entry) => [entry.kind, entry]));

export function getParkCatalogEntry(kind: ParkElementKind): ParkCatalogEntry {
  return CATALOG_BY_KIND.get(kind) ?? PARK_CATALOG[0];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function finite(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function cleanId(value: unknown): string {
  return typeof value === 'string' && /^[a-z0-9_-]{1,64}$/i.test(value)
    ? value
    : `park_${Math.random().toString(36).slice(2, 10)}`;
}

export function createEmptyPark(name = 'Seaside Park'): ParkLayout {
  return {
    version: 1,
    name,
    theme: 'gulf_coast',
    visitorCount: 18,
    entrance: { x: 0, z: -14, rotation: 0 },
    elements: [
      { id: 'gate', kind: 'gate', x: 0, z: -14, rotation: 0, scale: 1 },
      { id: 'path_spine_1', kind: 'path', x: 0, z: -10, rotation: 0, scale: 1 },
      { id: 'path_spine_2', kind: 'path', x: 0, z: -6, rotation: 0, scale: 1 },
      { id: 'path_spine_3', kind: 'path', x: 0, z: -2, rotation: 0, scale: 1 },
      { id: 'path_spine_4', kind: 'path', x: 0, z: 2, rotation: 0, scale: 1 },
      { id: 'fountain', kind: 'fountain', x: 0, z: 6, rotation: 0, scale: 1 },
      { id: 'carousel', kind: 'carousel', x: -20, z: 8, rotation: 0, scale: 1 },
      { id: 'ferris', kind: 'ferris_wheel', x: 22, z: 10, rotation: 90, scale: 1 },
      { id: 'food_1', kind: 'food_stall', x: -9, z: -5, rotation: 0, scale: 1 },
      { id: 'food_2', kind: 'food_stall', x: 9, z: -5, rotation: 180, scale: 1 },
      { id: 'games', kind: 'games_stall', x: 16, z: -7, rotation: 0, scale: 1 },
      { id: 'stage', kind: 'stage', x: -8, z: 20, rotation: 0, scale: 1 },
      { id: 'tree_1', kind: 'tree', x: -30, z: -6, rotation: 0, scale: 1 },
      { id: 'tree_2', kind: 'tree', x: 31, z: -4, rotation: 0, scale: 1 },
      { id: 'lamp_1', kind: 'lamp', x: -3, z: 0, rotation: 0, scale: 1 },
      { id: 'lamp_2', kind: 'lamp', x: 3, z: 0, rotation: 0, scale: 1 },
      { id: 'bench_1', kind: 'bench', x: -2.4, z: 4, rotation: -90, scale: 1 },
      { id: 'bench_2', kind: 'bench', x: 2.4, z: 4, rotation: 90, scale: 1 },
    ],
  };
}

export function sanitizePark(raw: unknown, fallbackName = 'Seaside Park'): ParkLayout {
  if (!raw || typeof raw !== 'object') return createEmptyPark(fallbackName);
  const source = raw as Partial<ParkLayout>;
  const theme: ParkTheme = PARK_THEMES.some((entry) => entry.id === source.theme)
    ? (source.theme as ParkTheme)
    : 'gulf_coast';
  const allowed = new Set(PARK_CATALOG.map((entry) => entry.kind));
  const elements: ParkElement[] = Array.isArray(source.elements)
    ? source.elements
        .slice(0, 420)
        .map((entry, index) => {
          if (!entry || typeof entry !== 'object') return null;
          const element = entry as Partial<ParkElement>;
          if (!allowed.has(element.kind as ParkElementKind)) return null;
          return {
            id: cleanId(element.id) + `_${index}`,
            kind: element.kind as ParkElementKind,
            x: clamp(finite(element.x), -240, 240),
            z: clamp(finite(element.z), -240, 240),
            rotation: ((finite(element.rotation) % 360) + 360) % 360,
            scale: clamp(finite(element.scale, 1), 0.6, 2.4),
          };
        })
        .filter((entry): entry is ParkElement => entry !== null)
    : [];
  const uniqueSeen = new Set<ParkElementKind>();
  const deduped = elements.filter((element) => {
    const catalog = getParkCatalogEntry(element.kind);
    if (!catalog.unique) return true;
    if (uniqueSeen.has(element.kind)) return false;
    uniqueSeen.add(element.kind);
    return true;
  });
  const entrance = source.entrance && typeof source.entrance === 'object'
    ? {
        x: clamp(finite(source.entrance.x), -240, 240),
        z: clamp(finite(source.entrance.z), -240, 240),
        rotation: ((finite(source.entrance.rotation) % 360) + 360) % 360,
      }
    : { x: 0, z: -14, rotation: 0 };
  return {
    version: 1,
    name:
      typeof source.name === 'string' && source.name.trim()
        ? source.name.trim().slice(0, 64)
        : fallbackName,
    theme,
    elements: deduped,
    visitorCount: clamp(Math.round(finite(source.visitorCount, 18)), 0, 60),
    entrance,
  };
}

export function getParkTheme(theme: ParkTheme) {
  return PARK_THEMES.find((entry) => entry.id === theme) ?? PARK_THEMES[0];
}

/** Park-local bounds including an 8 m service margin. */
export function getParkBounds(park: ParkLayout): { minX: number; maxX: number; minZ: number; maxZ: number } {
  let minX = park.entrance.x - 10;
  let maxX = park.entrance.x + 10;
  let minZ = park.entrance.z - 10;
  let maxZ = park.entrance.z + 10;
  for (const element of park.elements) {
    const catalog = getParkCatalogEntry(element.kind);
    const halfW = catalog.footprint.w * element.scale * 0.5;
    const halfD = catalog.footprint.d * element.scale * 0.5;
    minX = Math.min(minX, element.x - halfW);
    maxX = Math.max(maxX, element.x + halfW);
    minZ = Math.min(minZ, element.z - halfD);
    maxZ = Math.max(maxZ, element.z + halfD);
  }
  return { minX: minX - 8, maxX: maxX + 8, minZ: minZ - 8, maxZ: maxZ + 8 };
}

export function countParkAttractions(park: ParkLayout): number {
  return park.elements.filter((element) => {
    const category = getParkCatalogEntry(element.kind).category;
    return category === 'thrill' || category === 'family' || category === 'water';
  }).length;
}

export function parkToJson(park: ParkLayout): string {
  return JSON.stringify({ format: 'si_amusement_park_v1', park }, null, 2);
}

export function parkFromJson(text: string, fallbackName = 'Imported Park'): ParkLayout {
  const parsed = JSON.parse(text) as { park?: unknown } | ParkLayout;
  const candidate =
    parsed && typeof parsed === 'object' && 'park' in parsed ? parsed.park : parsed;
  return sanitizePark(candidate, fallbackName);
}

/** Coaster geometry is authored around the origin; delivery keeps its relative shape. */
export function projectCoasterPoints(project: CoasterProject): AmusementParkDeliveryPayload['coaster'] {
  return {
    name: project.name,
    trackColor: project.trackColor,
    trainCarCount: Math.min(8, Math.max(1, project.train.cars)),
    coasterType: project.coasterTypeId,
    closed: project.closed,
    points: project.points.slice(0, 220).map((point) => ({
      x: finite(point.position.x),
      y: finite(point.position.y),
      z: finite(point.position.z),
      bank: finite(point.bank),
      kind: point.kind,
      targetSpeed: Number.isFinite(point.targetSpeed) ? point.targetSpeed : undefined,
    })),
  };
}

export function createDeliveryPayload(project: CoasterProject): AmusementParkDeliveryPayload {
  return {
    name: project.park?.name || project.name,
    park: sanitizePark(project.park, project.name),
    coaster: projectCoasterPoints(project),
    sentAt: Date.now(),
  };
}

/** Simple helper used by both the studio and the game to describe a park. */
export function describePark(park: ParkLayout): string {
  const attractions = countParkAttractions(park);
  return `${park.elements.length} elements · ${attractions} rides · ${park.visitorCount} visitors`;
}
