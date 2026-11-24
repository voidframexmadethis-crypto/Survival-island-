import { CUSTOM_SHOP_POS, VEHICLE_GARAGE_POS } from '../world/terrain';
import type { VehiclePresetKey } from './modularVehicle';

/**
 * Bayou Royal Customs is a separate restoration shop east of the Motor Atelier.
 * The gap is measured from the atelier's outer glazing to the shop's west wall
 * so the two buildings stay visually and physically distinct.
 */
export const CUSTOM_SHOP_HALF_WIDTH = 6;
export const CUSTOM_SHOP_HALF_DEPTH = 4.5;
export const ATELIER_OUTER_HALF_WIDTH = 19.1;
export const CUSTOM_SHOP_GAP_METERS =
  CUSTOM_SHOP_POS.x -
  CUSTOM_SHOP_HALF_WIDTH -
  (VEHICLE_GARAGE_POS.x + ATELIER_OUTER_HALF_WIDTH);
export const CUSTOM_SHOP_GAP_FEET = CUSTOM_SHOP_GAP_METERS * 3.28084;

/**
 * The donor yard lives at the mouth of a real generated cave. `cave-2312` is
 * deterministically placed here for the shipped island and verifies in
 * customCarShop.test.ts against the live cave generator.
 */
export const JUNKYARD_CAVE = {
  id: 'cave-2312',
  name: 'Cave 12 Salvage',
  x: 56.28371668673408,
  z: 102.7388947060495,
} as const;

export const CUSTOM_SHOP_WORKERS = [
  {
    id: 'duke',
    name: 'Duke',
    role: 'Body, paint & upholstery',
    uniformColor: 0x8a6a3f,
    accentColor: 0xd6a34a,
  },
  {
    id: 'rae',
    name: 'Rae',
    role: 'Hydraulics, audio, rims & lights',
    uniformColor: 0x7c2d3a,
    accentColor: 0xe7c07a,
  },
] as const;

export type CustomShopWorkerId = (typeof CUSTOM_SHOP_WORKERS)[number]['id'];

export const CUSTOM_SHOP_TRIP_OUT_SECONDS = 7.5;
export const CUSTOM_SHOP_LOAD_SECONDS = 2.4;
export const CUSTOM_SHOP_TRIP_BACK_SECONDS = 8.5;

/** Forecourt -> hillside cave approach, kept clear of the atelier footprint. */
export const CUSTOM_SHOP_ROUTE = [
  { x: 44.4, z: 150.2 },
  { x: 49.0, z: 143.0 },
  { x: 51.5, z: 132.0 },
  { x: 52.6, z: 120.0 },
  { x: 54.9, z: 110.0 },
  { x: 56.1, z: 105.5 },
  { x: JUNKYARD_CAVE.x, z: JUNKYARD_CAVE.z },
] as const;

/**
 * Crescent City freight landing. The bayou channel east of the shop is real
 * generated water, so a shallow-draft parts barge can moor within one forklift
 * run of the bay instead of teleporting parts into the shop.
 */
export const CUSTOM_FREIGHT_DOCK = { x: 92.4, z: 150.2 } as const;
export const CUSTOM_FREIGHT_SHIP_MOORING = { x: 100.2, z: 151.8 } as const;
export const CUSTOM_FREIGHT_PIER_DECK_ABOVE_WATER = 1.0;

/** Shop apron -> gravel freight road -> pier head -> pier tip beside the barge. */
export const CUSTOM_FREIGHT_ROUTE = [
  { x: 46.6, z: 153.2 },
  { x: 56.0, z: 154.2 },
  { x: 70.0, z: 154.0 },
  { x: 82.0, z: 153.2 },
  { x: 89.0, z: 151.6 },
  { x: CUSTOM_FREIGHT_DOCK.x, z: CUSTOM_FREIGHT_DOCK.z },
  { x: 95.4, z: 149.8 },
] as const;

/** Channel waypoints used when the barge steams in from the Crescent City docks. */
export const CUSTOM_FREIGHT_SHIP_ROUTE = [
  { x: 84.0, z: 104.0 },
  { x: 88.0, z: 118.0 },
  { x: 92.0, z: 132.0 },
  { x: 96.0, z: 142.0 },
  { x: 99.0, z: 148.0 },
  { x: CUSTOM_FREIGHT_SHIP_MOORING.x, z: CUSTOM_FREIGHT_SHIP_MOORING.z },
] as const;

export function getCustomShopFreightRoutePoint(progress: number): {
  x: number;
  z: number;
  yaw: number;
} {
  return sampleRoute(CUSTOM_FREIGHT_ROUTE, progress);
}

export function getCustomShopShipRoutePoint(progress: number): {
  x: number;
  z: number;
  yaw: number;
} {
  return sampleRoute(CUSTOM_FREIGHT_SHIP_ROUTE, progress);
}

function sampleRoute(
  route: readonly { x: number; z: number }[],
  progress: number,
): { x: number; z: number; yaw: number } {
  if (route.length === 0) return { x: 0, z: 0, yaw: 0 };
  if (route.length === 1) return { x: route[0].x, z: route[0].z, yaw: 0 };
  let total = 0;
  for (let i = 1; i < route.length; i++) {
    total += Math.hypot(route[i].x - route[i - 1].x, route[i].z - route[i - 1].z);
  }
  const target = Math.max(0, Math.min(1, progress)) * total;
  let travelled = 0;
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1];
    const b = route[i];
    const segment = Math.hypot(b.x - a.x, b.z - a.z);
    if (travelled + segment >= target || i === route.length - 1) {
      const t = segment > 0 ? (target - travelled) / segment : 0;
      return {
        x: a.x + (b.x - a.x) * t,
        z: a.z + (b.z - a.z) * t,
        yaw: Math.atan2(b.x - a.x, b.z - a.z),
      };
    }
    travelled += segment;
  }
  const last = route[route.length - 1];
  return { x: last.x, z: last.z, yaw: 0 };
}

export function isOnCustomShopFreightRoute(x: number, z: number): boolean {
  for (const point of CUSTOM_FREIGHT_ROUTE) {
    if (Math.hypot(x - point.x, z - point.z) < 5.5) return true;
  }
  return Math.hypot(
    x - CUSTOM_FREIGHT_SHIP_MOORING.x,
    z - CUSTOM_FREIGHT_SHIP_MOORING.z,
  ) < 16;
}

/* ------------------------------------------------------------------------- */
/* Player build sheet                                                        */
/* ------------------------------------------------------------------------- */

export interface DonorCarOption {
  id: string;
  name: string;
  shortName: string;
  preset: VehiclePresetKey;
  body: string;
  detail: string;
}

/**
 * Real-world donor cars that map onto the existing vehicle meshes. Every one
 * is a rear-drive body-on-frame or full-frame car that people actually cut up
 * for lowrider, DONK and slab builds.
 */
export const DONOR_CARS: readonly DonorCarOption[] = [
  {
    id: 'impala_64',
    name: '1964 Chevrolet Impala',
    shortName: "'64 Impala",
    preset: 'lowrider',
    body: '2-door hardtop · X-frame',
    detail: 'The original lowrider. Big chrome, thin pillars and endless trunk room for pumps.',
  },
  {
    id: 'caprice_74',
    name: '1974 Chevrolet Caprice Classic',
    shortName: "'74 Caprice",
    preset: 'donk',
    body: '2-door Box Chevy · full frame',
    detail: 'The Box Chevy everybody wants on 30s. Wide arches, long frame and a trunk floor worth notching.',
  },
  {
    id: 'regal_87',
    name: '1987 Buick Regal Limited',
    shortName: "'87 Regal",
    preset: 'donk',
    body: '2-door G-body · full frame',
    detail: 'G-body coupe with a small trunk and a strong following. Perfect for a clean 26-inch build.',
  },
  {
    id: 'impala_96',
    name: '1996 Chevrolet Impala SS',
    shortName: "'96 Impala SS",
    preset: 'slab',
    body: '4-door B-body · full frame',
    detail: 'The last big rear-drive Impala. A Houston slab classic that takes swangers and a full trunk wall.',
  },
  {
    id: 'deville_79',
    name: '1979 Cadillac Coupe de Ville',
    shortName: "'79 Coupe de Ville",
    preset: 'cadillac_coupe_deville',
    body: '2-door hardtop · full frame',
    detail: 'Long hood, factory vinyl roof and a trunk big enough for a six-pump dancing setup.',
  },
  {
    id: 'elcamino_86',
    name: '1986 Chevrolet El Camino',
    shortName: "'86 El Camino",
    preset: 'el_camino',
    body: '2-door coupe utility · full frame',
    detail: 'Half car, half truck. A bed makes the hydraulic and battery layout a genuinely different job.',
  },
  {
    id: 'towncar_03',
    name: '2003 Lincoln Town Car',
    shortName: "'03 Town Car",
    preset: 'town_car',
    body: '4-door sedan · full frame',
    detail: 'The black-on-black slab. Air suspension from the factory makes the hydraulic conversion a bolt-in.',
  },
] as const;

export type DonorCarId = (typeof DONOR_CARS)[number]['id'];

export interface DonorDamageProfile {
  dents: number;
  rustHoles: number;
  collapsedRoof: boolean;
  fireDamage: boolean;
  /** What the last owner left in the floor pans and trunk. */
  trash: 'none' | 'leaves' | 'poop' | 'both';
  glassMissing: boolean;
  summary: string;
}

/** Cave donors are wrecks, not rollers: every one needs rust, dents and trash fixed. */
export const DONOR_DAMAGE: Record<DonorCarId, DonorDamageProfile> = {
  impala_64: {
    dents: 4,
    rustHoles: 3,
    collapsedRoof: false,
    fireDamage: true,
    trash: 'both',
    glassMissing: true,
    summary:
      'Trunk fire, rusted rear window ledge, leaves and animal droppings through the cabin.',
  },
  caprice_74: {
    dents: 6,
    rustHoles: 4,
    collapsedRoof: true,
    fireDamage: false,
    trash: 'both',
    glassMissing: false,
    summary:
      'Roof caved in, both quarters dented, floor pans full of leaves and old food wrappers.',
  },
  regal_87: {
    dents: 5,
    rustHoles: 2,
    collapsedRoof: false,
    fireDamage: true,
    trash: 'poop',
    glassMissing: true,
    summary:
      'Engine-bay fire, burned hood, missing back glass and years of animal mess inside.',
  },
  impala_96: {
    dents: 3,
    rustHoles: 2,
    collapsedRoof: false,
    fireDamage: false,
    trash: 'leaves',
    glassMissing: false,
    summary:
      'Side-swiped doors, rocker rust, a trunk packed with wet leaves and a cracked dash.',
  },
  deville_79: {
    dents: 5,
    rustHoles: 3,
    collapsedRoof: true,
    fireDamage: false,
    trash: 'both',
    glassMissing: true,
    summary:
      'Vinyl roof collapsed, trunk lid rotten, glass gone and the interior full of debris.',
  },
  elcamino_86: {
    dents: 4,
    rustHoles: 2,
    collapsedRoof: false,
    fireDamage: true,
    trash: 'leaves',
    glassMissing: false,
    summary:
      'Bed fire, burned wiring, dented tailgate and a load of wet leaves in the bed.',
  },
  towncar_03: {
    dents: 2,
    rustHoles: 1,
    collapsedRoof: false,
    fireDamage: false,
    trash: 'poop',
    glassMissing: false,
    summary:
      'Sitting under a tree for years: one rust hole, dented fender and animal mess inside.',
  },
};

export type DonorSource = 'cave' | 'freight';

export interface DonorSourceOption {
  id: DonorSource;
  label: string;
  detail: string;
}

/**
 * Two realistic supply routes: winch a wreck out of Cave 12, or buy a
 * plastic-wrapped auction shell that crosses from Crescent City on the barge.
 */
export const DONOR_SOURCES: readonly DonorSourceOption[] = [
  {
    id: 'cave',
    label: 'Cave 12 tow-out',
    detail:
      'Duke and Rae drive the shop truck to the cave yard and winch back a full wreck. Rust, holes, dents and trash included.',
  },
  {
    id: 'freight',
    label: 'Crescent City auction shell',
    detail:
      'A bare shell and chassis from a car sale, wrapped in plastic on a huge wooden tray. It rides the barge from the mainland; the engine and parts follow in the crates.',
  },
] as const;

export interface PaintOption {
  id: string;
  label: string;
  color: string;
  stripeColor: string;
  detail: string;
}

export const PAINT_OPTIONS: readonly PaintOption[] = [
  {
    id: 'candy_burgundy',
    label: 'Candy Burgundy',
    color: '#6e1f3c',
    stripeColor: '#f4e3c1',
    detail: 'Deep burgundy base with cream hand-laid pinstripes.',
  },
  {
    id: 'candy_teal',
    label: 'Candy Teal',
    color: '#0f5f5c',
    stripeColor: '#e8d9b0',
    detail: 'Green-teal candy with gold leaf stripes.',
  },
  {
    id: 'gloss_black',
    label: 'Gloss Black',
    color: '#111114',
    stripeColor: '#b9b2a4',
    detail: 'Wet-sanded black with a subtle silver stripe.',
  },
  {
    id: 'pearl_white',
    label: 'Pearl White',
    color: '#e8e3d8',
    stripeColor: '#8f1d2c',
    detail: 'Tri-stage pearl with a red pinstripe.',
  },
  {
    id: 'root_beer',
    label: 'Root Beer',
    color: '#5a2d16',
    stripeColor: '#f0c982',
    detail: 'Old-school root beer flake with gold stripes.',
  },
  {
    id: 'candy_red',
    label: 'Candy Apple Red',
    color: '#8c1024',
    stripeColor: '#f5e6c8',
    detail: 'Traditional candy apple red over a gold base.',
  },
] as const;

export type PaintId = (typeof PAINT_OPTIONS)[number]['id'];

export interface RimOption {
  id: string;
  label: string;
  diameterInches: number;
  style: string;
  color: string;
  detail: string;
  /** Multiplies the donor preset's factory wheel scale. */
  scaleFactor: number;
}

/**
 * Dayton wire wheels are the default for a reason: real straight-lace Daytons
 * are built to order, so the barge has to bring them up the bayou.
 */
export const RIM_OPTIONS: readonly RimOption[] = [
  {
    id: 'dayton_gold_30',
    label: '30" Dayton Straight Lace',
    diameterInches: 30,
    style: 'wire',
    color: '#f1c453',
    detail: 'Gold-plated straight-lace Daytons with chrome knock-offs and fresh 255/30 tires.',
    scaleFactor: 1.16,
  },
  {
    id: 'dayton_chrome_26',
    label: '26" Dayton Chrome',
    diameterInches: 26,
    style: 'wire',
    color: '#d9d7cf',
    detail: 'Chrome straight-lace Daytons, hub-centric adapters and a square tire setup.',
    scaleFactor: 1.0,
  },
  {
    id: 'vogue_24',
    label: '24" Vogue Signature',
    diameterInches: 24,
    style: 'vogue',
    color: '#efe6cf',
    detail: 'White-and-gold Vogue tyres on forged Signature wheels with gold accents.',
    scaleFactor: 0.92,
  },
  {
    id: 'forgiato_28',
    label: '28" Forgiato Brushed',
    diameterInches: 28,
    style: 'forgiato',
    color: '#2b2b2e',
    detail: 'Brushed-black Forgiatos with a deep concave and low-profile rubber.',
    scaleFactor: 1.08,
  },
  {
    id: 'og_chrome_22',
    label: '22" OG Chrome 5-Star',
    diameterInches: 22,
    style: 'star',
    color: '#cfd3d8',
    detail: 'Classic chrome five-star OG wheels for a cleaner, older-school look.',
    scaleFactor: 0.85,
  },
  {
    id: 'steelie_20',
    label: '20" Steelies & Caps',
    diameterInches: 20,
    style: 'steelie',
    color: '#8d9298',
    detail: 'Widened steel wheels with chrome spider caps — a proper sleeper stance.',
    scaleFactor: 0.78,
  },
] as const;

export type RimId = (typeof RIM_OPTIONS)[number]['id'];

export interface SteeringWheelOption {
  id: string;
  label: string;
  detail: string;
  /** Optional colour used by the interior mesh. */
  accentColor: string;
}

export const STEERING_WHEEL_OPTIONS: readonly SteeringWheelOption[] = [
  {
    id: 'chain',
    label: 'Chrome Chain Wheel',
    detail: 'Three-spoke chrome chain-link wheel on a quick-release hub.',
    accentColor: '#d7d9de',
  },
  {
    id: 'billet',
    label: 'Polished Billet',
    detail: 'Machined billet aluminum three-spoke with a leather half-wrap.',
    accentColor: '#c9ccd2',
  },
  {
    id: 'wood',
    label: 'Walnut Rim',
    detail: 'Real walnut rim with chrome spokes and a horn button.',
    accentColor: '#7a4b24',
  },
  {
    id: 'suede',
    label: 'Flat-Bottom Suede',
    detail: 'Black suede flat-bottom wheel with a stitched center marker.',
    accentColor: '#26262a',
  },
  {
    id: 'factory',
    label: 'Restored Factory',
    detail: 'Correct factory wheel, restored and recast to match the interior.',
    accentColor: '#4a3a2c',
  },
] as const;

export type SteeringWheelId = (typeof STEERING_WHEEL_OPTIONS)[number]['id'];

export interface RoofOption {
  id: string;
  label: string;
  detail: string;
  convertible: boolean;
}

export const ROOF_OPTIONS: readonly RoofOption[] = [
  {
    id: 'landau',
    label: 'Padded Landau Vinyl',
    detail: 'Correct padded vinyl top with opera lights and new trim.',
    convertible: false,
  },
  {
    id: 'slick_top',
    label: 'Shaved Slick Top',
    detail: 'Roof seams shaved smooth and painted body colour.',
    convertible: false,
  },
  {
    id: 'ragtop',
    label: 'Power Ragtop',
    detail: 'New cloth top, rebuilt bows, cables and a resealed header.',
    convertible: true,
  },
  {
    id: 't_top',
    label: 'T-Top Glass Panels',
    detail: 'Removable smoked glass panels with new weatherstrip and locks.',
    convertible: false,
  },
  {
    id: 'factory_hardtop',
    label: 'Factory Hardtop',
    detail: 'Original steel roof stripped, sealed and repainted.',
    convertible: false,
  },
] as const;

export type RoofId = (typeof ROOF_OPTIONS)[number]['id'];

export interface InteriorOption {
  id: string;
  label: string;
  color: string;
  detail: string;
}

export const INTERIOR_OPTIONS: readonly InteriorOption[] = [
  {
    id: 'cream_leather',
    label: 'Cream Leather',
    color: '#d8bd96',
    detail: 'New cream hides on rebuilt seats, door cards, console and headliner.',
  },
  {
    id: 'oxblood_leather',
    label: 'Oxblood Leather',
    color: '#5c1f24',
    detail: 'Oxblood leather with cream French stitching and matching carpet.',
  },
  {
    id: 'black_suede',
    label: 'Black Suede',
    color: '#26262a',
    detail: 'Black suede seats and headliner with a suede dash pad.',
  },
  {
    id: 'gator',
    label: 'Gator Print',
    color: '#6d5a3c',
    detail: 'Gator-print inserts, new foam and hand-stitched door panels.',
  },
  {
    id: 'velour',
    label: 'Factory Velour',
    color: '#7c6a54',
    detail: 'Correct velour cloth, rebuilt springs and a new carpet set.',
  },
] as const;

export type InteriorId = (typeof INTERIOR_OPTIONS)[number]['id'];

export interface HeadlightOption {
  id: string;
  label: string;
  detail: string;
  color: string;
}

export const HEADLIGHT_OPTIONS: readonly HeadlightOption[] = [
  {
    id: 'led_halo',
    label: 'LED Halo Projectors',
    detail: 'New buckets, LED halo projectors and a properly aimed cutoff.',
    color: '#fef3c7',
  },
  {
    id: 'hid_projector',
    label: 'HID Projectors',
    detail: 'HID projectors with new relays, ceramic plugs and a beam aim.',
    color: '#e0f2fe',
  },
  {
    id: 'sealed_beam',
    label: 'Restored Sealed Beam',
    detail: 'Correct sealed-beam buckets, new lenses and a factory-spec aim.',
    color: '#fde68a',
  },
] as const;

export type HeadlightId = (typeof HEADLIGHT_OPTIONS)[number]['id'];

export interface UndercarriageOption {
  id: string;
  label: string;
  detail: string;
  suspensionOffset: number;
}

export const UNDERCARRIAGE_OPTIONS: readonly UndercarriageOption[] = [
  {
    id: 'show_frame',
    label: 'Show Frame & Powdercoat',
    detail: 'Frame stripped, welded, seam-sealed, powdercoated and re-bushed.',
    suspensionOffset: 0.5,
  },
  {
    id: 'airbag_notched',
    label: 'Notched Frame & Airbags',
    detail: 'Frame notched and reinforced for full drop on airbags with a new compressor.',
    suspensionOffset: 0.62,
  },
  {
    id: 'street_stock',
    label: 'Street Stock Refresh',
    detail: 'New bushings, ball joints, tie rods, brakes and a factory-height rebuild.',
    suspensionOffset: 0.18,
  },
] as const;

export type UndercarriageId = (typeof UNDERCARRIAGE_OPTIONS)[number]['id'];

export interface CustomShopBuild {
  donorSource: DonorSource;
  donorCarId: DonorCarId;
  paintId: PaintId;
  rimId: RimId;
  steeringWheelId: SteeringWheelId;
  roofId: RoofId;
  interiorId: InteriorId;
  headlightId: HeadlightId;
  undercarriageId: UndercarriageId;
}

export type CustomShopBuildOptionKey =
  | 'donorSource'
  | 'donorCarId'
  | 'paintId'
  | 'rimId'
  | 'steeringWheelId'
  | 'roofId'
  | 'interiorId'
  | 'headlightId'
  | 'undercarriageId';

export const DEFAULT_CUSTOM_BUILD: CustomShopBuild = {
  donorSource: 'cave',
  donorCarId: 'caprice_74',
  paintId: 'candy_burgundy',
  rimId: 'dayton_gold_30',
  steeringWheelId: 'chain',
  roofId: 'landau',
  interiorId: 'cream_leather',
  headlightId: 'led_halo',
  undercarriageId: 'show_frame',
};

export function createCustomShopBuild(
  overrides: Partial<CustomShopBuild> = {},
): CustomShopBuild {
  return { ...DEFAULT_CUSTOM_BUILD, ...overrides };
}

function pickOption<T extends { id: string }>(
  options: readonly T[],
  random: () => number,
): T {
  return options[Math.min(options.length - 1, Math.floor(random() * options.length))];
}

const DONOR_REQUEST_RULES: readonly {
  donorId: DonorCarId;
  patterns: readonly RegExp[];
}[] = [
  { donorId: 'impala_96', patterns: [/\b96\b/, /impala\s*ss/, /\bss\b/, /\b1996\b/] },
  { donorId: 'impala_64', patterns: [/\b64\b/, /\b1964\b/, /impala/, /lowrider/] },
  { donorId: 'caprice_74', patterns: [/caprice/, /box\s*chevy/, /\b74\b/, /\b1974\b/] },
  { donorId: 'regal_87', patterns: [/regal/, /buick/, /g-?body/, /\b87\b/] },
  { donorId: 'deville_79', patterns: [/de\s*ville/, /deville/, /cadillac/, /\b79\b/] },
  { donorId: 'elcamino_86', patterns: [/el\s*camino/, /elco/, /\b86\b/] },
  { donorId: 'towncar_03', patterns: [/town\s*car/, /lincoln/, /\b03\b/] },
];

export function matchDonorRequest(message: string): DonorCarOption | null {
  const text = message.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ');
  for (const rule of DONOR_REQUEST_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(text))) {
      return DONOR_CARS.find((donor) => donor.id === rule.donorId) ?? null;
    }
  }
  return null;
}

export interface NpcBuildPlan {
  build: CustomShopBuild;
  requestedDonor: DonorCarOption;
  actualDonor: DonorCarOption;
  surprise: boolean;
}

/**
 * The shop computer does the spec itself: the player only names the car. Duke
 * occasionally brings back a different donor he is sure the player will love.
 */
export function createNpcBuild(
  message: string,
  random: () => number = Math.random,
): NpcBuildPlan | null {
  const wantsSurprise = /surprise|you pick|your pick|whatever|dealer'?s choice/i.test(message);
  const requested = wantsSurprise ? pickOption(DONOR_CARS, random) : matchDonorRequest(message);
  if (!requested) return null;
  const surprise = wantsSurprise || random() < 0.22;
  const alternatives = DONOR_CARS.filter((donor) => donor.id !== requested.id);
  const actualDonor = surprise
    ? alternatives[Math.min(alternatives.length - 1, Math.floor(random() * alternatives.length))]
    : requested;
  const build: CustomShopBuild = {
    donorSource: random() < 0.35 ? 'freight' : 'cave',
    donorCarId: actualDonor.id,
    paintId: pickOption(PAINT_OPTIONS, random).id,
    rimId: pickOption(RIM_OPTIONS, random).id,
    steeringWheelId: pickOption(STEERING_WHEEL_OPTIONS, random).id,
    roofId: pickOption(ROOF_OPTIONS, random).id,
    interiorId: pickOption(INTERIOR_OPTIONS, random).id,
    headlightId: pickOption(HEADLIGHT_OPTIONS, random).id,
    undercarriageId: pickOption(UNDERCARRIAGE_OPTIONS, random).id,
  };
  return { build, requestedDonor: requested, actualDonor, surprise };
}

function findOption<T extends { id: string }>(
  options: readonly T[],
  id: string | undefined,
): T {
  return options.find((option) => option.id === id) ?? options[0];
}

export interface ResolvedCustomShopBuild {
  build: CustomShopBuild;
  vehicleId: string;
  name: string;
  donorSource: DonorSourceOption;
  damage: DonorDamageProfile;
  donor: DonorCarOption;
  paint: PaintOption;
  rims: RimOption;
  steeringWheel: SteeringWheelOption;
  roof: RoofOption;
  interior: InteriorOption;
  headlights: HeadlightOption;
  undercarriage: UndercarriageOption;
  wheelScaleFactor: number;
  convertibleTop: boolean;
  accessories: string[];
}

export const CUSTOM_SHOP_VEHICLE_ID = 'veh_custom_shop_bayou_royal';

export function resolveCustomShopBuild(
  build: CustomShopBuild,
): ResolvedCustomShopBuild {
  const donorSource = findOption(DONOR_SOURCES, build.donorSource);
  const donor = findOption(DONOR_CARS, build.donorCarId);
  const damage = DONOR_DAMAGE[donor.id];
  const paint = findOption(PAINT_OPTIONS, build.paintId);
  const rims = findOption(RIM_OPTIONS, build.rimId);
  const steeringWheel = findOption(
    STEERING_WHEEL_OPTIONS,
    build.steeringWheelId,
  );
  const roof = findOption(ROOF_OPTIONS, build.roofId);
  const interior = findOption(INTERIOR_OPTIONS, build.interiorId);
  const headlights = findOption(HEADLIGHT_OPTIONS, build.headlightId);
  const undercarriage = findOption(
    UNDERCARRIAGE_OPTIONS,
    build.undercarriageId,
  );
  return {
    build,
    vehicleId: CUSTOM_SHOP_VEHICLE_ID,
    name: `Bayou Royal ${donor.name}`,
    donorSource,
    damage,
    donor,
    paint,
    rims,
    steeringWheel,
    roof,
    interior,
    headlights,
    undercarriage,
    wheelScaleFactor: rims.scaleFactor,
    convertibleTop: roof.convertible,
    accessories: [
      `${paint.label} with ${paint.stripeColor} hand-laid pinstripes`,
      `${rims.label} and new tires`,
      `${undercarriage.label} undercarriage`,
      `${interior.label} seats, door cards, carpet and headliner`,
      `${steeringWheel.label} and rebuilt column`,
      `${roof.label}`,
      `${headlights.label}`,
      'New dash pad, glovebox liner and door handles',
      'Fresh chrome, mirrors, weatherstrip and badges',
    ],
  };
}

/* ------------------------------------------------------------------------- */
/* Parts logistics                                                           */
/* ------------------------------------------------------------------------- */

export type PartsCrateId =
  | 'suspension_hydraulics'
  | 'body_paint'
  | 'engine_drivetrain'
  | 'interior_roof'
  | 'wheels_lights';

/** A wrapped auction shell is freight, not a parts box, so it has its own id. */
export type CargoCrateId = PartsCrateId | 'donor_shell';

export interface PartsCrate {
  id: CargoCrateId;
  label: string;
  manifest: readonly string[];
}

export const DONOR_SHELL_CRATE: PartsCrate = {
  id: 'donor_shell',
  label: 'Wrapped Shell & Chassis',
  manifest: [
    'Bare body shell shrink-wrapped to a 4.8 m timber tray',
    'Chassis rails, floor pan and subframe',
    'Core support, glass and auction paperwork',
    'No engine or driveline — those follow in the crates',
  ],
};

export const ENGINE_DRIVETRAIN_CRATE: PartsCrate = {
  id: 'engine_drivetrain',
  label: 'Engine & Drivetrain Crate',
  manifest: [
    'Rebuilt small-block long block',
    'Transmission, converter and driveshaft',
    'Radiator, fans, hoses and accessory drive',
    'Wiring harness, ECU, mounts and exhaust',
  ],
};

export const CUSTOM_SHOP_PART_CRATES: readonly PartsCrate[] = [
  {
    id: 'suspension_hydraulics',
    label: 'Suspension & Hydraulic Kit',
    manifest: [
      'Two 1/2-inch hydraulic pumps',
      'Four 10-inch cylinders and two accumulators',
      'Three deep-cycle batteries with trays',
      'Four solenoids, relay bank, switches and lines',
      'New ball joints, bushings, tie rods and brakes',
    ],
  },
  {
    id: 'body_paint',
    label: 'Body & Paint Crate',
    manifest: [
      'Doors, trunk lid, hood, fenders and quarter skins',
      'Rear quarter patches and rocker steel',
      'Primer, sealer and candy basecoat',
      'Cream pinstripe and clear coat',
    ],
  },
  ENGINE_DRIVETRAIN_CRATE,
  {
    id: 'interior_roof',
    label: 'Interior & Roof Crate',
    manifest: [
      'Leather hides, foam and carpet',
      'Headliner, door cards, dash pad and glovebox liner',
      'Steering wheel, hub and column parts',
      'Roof material, bows and weatherstrip',
    ],
  },
  {
    id: 'wheels_lights',
    label: 'Wheels & Lighting Crate',
    manifest: [
      'Four rims, tires, lugs and valve stems',
      'Hub-centric adapters and knock-offs',
      'Headlight buckets, relays and LED halos',
      'Chrome trim, mirrors and badges',
    ],
  },
] as const;

const ALL_CARGO_CRATES: readonly PartsCrate[] = [
  DONOR_SHELL_CRATE,
  ...CUSTOM_SHOP_PART_CRATES,
];

export function getPartsCrate(id: CargoCrateId): PartsCrate {
  return (
    ALL_CARGO_CRATES.find((crate) => crate.id === id) ??
    CUSTOM_SHOP_PART_CRATES[0]
  );
}

/** The wrapped auction shell is unloaded before the parts crates. */
export function getCargoSchedule(build: CustomShopBuild): CargoCrateId[] {
  const parts = CUSTOM_SHOP_PART_CRATES.map((crate) => crate.id);
  return build.donorSource === 'freight'
    ? [DONOR_SHELL_CRATE.id, ...parts]
    : parts;
}

export type CargoSupplyPhase =
  | 'waiting'
  | 'steaming_in'
  | 'at_dock'
  | 'steaming_out'
  | 'done';

export type ForkliftLeg =
  | 'parked'
  | 'loading'
  | 'to_shop'
  | 'unloading'
  | 'to_ship';

export interface CargoSupplyState {
  phase: CargoSupplyPhase;
  /** 0 at the channel mouth, 1 alongside the pier. */
  shipProgress: number;
  crateIndex: number;
  forkliftLeg: ForkliftLeg;
  forkliftProgress: number;
  deliveredCrateIds: CargoCrateId[];
  /** Crates loaded on this voyage, in unloading order. */
  crateIds: CargoCrateId[];
}

/** The fast Crescent City parts barge covers the bayou run in 30 seconds. */
export const CARGO_SHIP_STEAM_IN_SECONDS = 30;
/** The red deep-water freighter is a slow 30-minute background supply run. */
export const RED_CARGO_SHIP_VOYAGE_SECONDS = 30 * 60;
export const CARGO_FORKLIFT_LOAD_SECONDS = 2.4;
export const CARGO_FORKLIFT_OUTBOUND_SECONDS = 6;
export const CARGO_FORKLIFT_UNLOAD_SECONDS = 2.4;
export const CARGO_FORKLIFT_INBOUND_SECONDS = 4.5;
export const CARGO_SHIP_STEAM_OUT_SECONDS = 14;

export function createCargoSupplyState(
  crateIds: CargoCrateId[] = getCargoSchedule(DEFAULT_CUSTOM_BUILD),
): CargoSupplyState {
  return {
    phase: 'waiting',
    shipProgress: 0,
    crateIndex: 0,
    forkliftLeg: 'parked',
    forkliftProgress: 0,
    deliveredCrateIds: [],
    crateIds: [...crateIds],
  };
}

export function getCargoEtaSeconds(cargo: CargoSupplyState): number {
  if (cargo.phase === 'steaming_in') {
    return Math.max(0, Math.round((1 - cargo.shipProgress) * CARGO_SHIP_STEAM_IN_SECONDS));
  }
  return 0;
}

export function formatCargoEta(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${minutes}:${rest.toString().padStart(2, '0')}`;
}

export type CargoSupplyEvent =
  | { type: 'cargo_arrived' }
  | { type: 'crate_loaded'; crate: PartsCrate }
  | { type: 'crate_delivered'; crate: PartsCrate }
  | { type: 'cargo_departed' }
  | { type: 'cargo_done' };

function forkliftLegSeconds(leg: ForkliftLeg): number {
  switch (leg) {
    case 'loading':
      return CARGO_FORKLIFT_LOAD_SECONDS;
    case 'to_shop':
      return CARGO_FORKLIFT_OUTBOUND_SECONDS;
    case 'unloading':
      return CARGO_FORKLIFT_UNLOAD_SECONDS;
    case 'to_ship':
      return CARGO_FORKLIFT_INBOUND_SECONDS;
    default:
      return 0;
  }
}

/**
 * Drives the Crescent City parts barge and the shop forklift. The voyage takes
 * three minutes; each crate is then forklifted from the pier to the bay before
 * the matching restoration stage can finish. Timing is per real second.
 */
export function advanceCargoSupply(
  cargo: CargoSupplyState,
  dt: number,
  events: CargoSupplyEvent[] = [],
): CargoSupplyEvent[] {
  let remaining = Math.max(0, dt);

  while (remaining > 0) {
    if (cargo.phase === 'waiting' || cargo.phase === 'done') break;

    if (cargo.phase === 'steaming_in') {
      const needed = (1 - cargo.shipProgress) * CARGO_SHIP_STEAM_IN_SECONDS;
      if (remaining < needed) {
        cargo.shipProgress += remaining / CARGO_SHIP_STEAM_IN_SECONDS;
        remaining = 0;
      } else {
        remaining -= needed;
        cargo.shipProgress = 1;
        cargo.phase = 'at_dock';
        cargo.forkliftLeg = 'loading';
        cargo.forkliftProgress = 0;
        events.push({ type: 'cargo_arrived' });
      }
      continue;
    }

    if (cargo.phase === 'at_dock') {
      const crate = getPartsCrate(cargo.crateIds[cargo.crateIndex]);
      if (!crate) {
        cargo.phase = 'steaming_out';
        cargo.shipProgress = 0;
        events.push({ type: 'cargo_departed' });
        continue;
      }

      const leg = cargo.forkliftLeg;
      const legSeconds = forkliftLegSeconds(leg);
      if (legSeconds <= 0) {
        cargo.forkliftLeg = 'loading';
        cargo.forkliftProgress = 0;
        continue;
      }
      const needed = (1 - cargo.forkliftProgress) * legSeconds;
      if (remaining < needed) {
        cargo.forkliftProgress += remaining / legSeconds;
        remaining = 0;
        continue;
      }

      remaining -= needed;
      cargo.forkliftProgress = 0;

      if (leg === 'loading') {
        cargo.forkliftLeg = 'to_shop';
        events.push({ type: 'crate_loaded', crate });
        continue;
      }
      if (leg === 'to_shop') {
        cargo.forkliftLeg = 'unloading';
        continue;
      }
      if (leg === 'unloading') {
        if (!cargo.deliveredCrateIds.includes(crate.id)) {
          cargo.deliveredCrateIds.push(crate.id);
        }
        cargo.crateIndex++;
        events.push({ type: 'crate_delivered', crate });
        const nextId = cargo.crateIds[cargo.crateIndex];
        if (!nextId) {
          cargo.forkliftLeg = 'to_ship';
          cargo.phase = 'steaming_out';
          cargo.shipProgress = 0;
          events.push({ type: 'cargo_departed' });
        } else {
          cargo.forkliftLeg = 'to_ship';
        }
        continue;
      }

      // Returning empty to the barge.
      cargo.forkliftLeg = 'loading';
      continue;
    }

    if (cargo.phase === 'steaming_out') {
      const needed = (1 - cargo.shipProgress) * CARGO_SHIP_STEAM_OUT_SECONDS;
      if (remaining < needed) {
        cargo.shipProgress += remaining / CARGO_SHIP_STEAM_OUT_SECONDS;
        remaining = 0;
      } else {
        remaining -= needed;
        cargo.shipProgress = 1;
        cargo.phase = 'done';
        events.push({ type: 'cargo_done' });
      }
      continue;
    }

    break;
  }

  return events;
}

export function getCargoSupplyLabel(cargo: CargoSupplyState): string {
  const crate = getPartsCrate(cargo.crateIds[cargo.crateIndex]);
  switch (cargo.phase) {
    case 'waiting':
      return 'Freight barge waiting at the Crescent City docks';
    case 'steaming_in':
      return `Crescent City barge coming up the bayou · ETA ${formatCargoEta(
        getCargoEtaSeconds(cargo),
      )}`;
    case 'at_dock': {
      if (!crate) return 'Barge empty — casting off';
      switch (cargo.forkliftLeg) {
        case 'loading':
          return `Forklift loading the ${crate.label} from the barge`;
        case 'to_shop':
          return `Rae hauling the ${crate.label} up the freight road`;
        case 'unloading':
          return `Setting the ${crate.label} down at the bay`;
        default:
          return `Empty forklift returning to the barge`;
      }
    }
    case 'steaming_out':
      return 'Loaded barge backing out of the bayou for Crescent City';
    case 'done':
      return 'Barge cleared the bayou — parts delivered';
  }
}

/* ------------------------------------------------------------------------- */
/* Restoration stages                                                        */
/* ------------------------------------------------------------------------- */

export type RestorationStageId =
  | 'intake'
  | 'strip_trim'
  | 'strip_doors'
  | 'strip_panels'
  | 'engine_pull'
  | 'suspension'
  | 'hydraulics'
  | 'undercarriage'
  | 'body'
  | 'paint'
  | 'engine_install'
  | 'interior'
  | 'steering'
  | 'roof'
  | 'rims'
  | 'alignment'
  | 'lights'
  | 'detail'
  | 'road_test';

export interface RestorationStage {
  id: RestorationStageId;
  label: string;
  detail: string;
  duration: number;
  particleColor: number;
  /** Give the player a toast when this stage starts. */
  announce: boolean;
  /** Parts that must land from the Crescent City barge first. */
  requiresCrate?: PartsCrateId;
  /** Local bay offsets for Duke and Rae while they work this stage. */
  workerOffsets: readonly [
    { x: number; z: number },
    { x: number; z: number },
  ];
}

export const CUSTOM_RESTORATION_STAGES: readonly RestorationStage[] = [
  {
    id: 'intake',
    label: 'Intake, fluids & bag-and-tag',
    detail:
      'Duke drains the fluids, photographs the car and bags every fastener before teardown.',
    duration: 6,
    particleColor: 0x9a6a43,
    announce: false,
    workerOffsets: [
      { x: -2.15, z: 0.55 },
      { x: 2.15, z: -0.45 },
    ],
  },
  {
    id: 'strip_trim',
    label: 'Strip glass, seats, carpet & years of trash',
    detail:
      'Duke bags the leaves, animal droppings and old food, then pulls the glass, seats, carpet and dash.',
    duration: 10,
    particleColor: 0x6b7f4a,
    announce: true,
    workerOffsets: [
      { x: -1.9, z: 0.9 },
      { x: 1.9, z: -0.7 },
    ],
  },
  {
    id: 'strip_doors',
    label: 'Unbolt doors, trunk lid & hood',
    detail:
      'Doors unplugged and lifted off, trunk lid and hood unbolted, hinges and latches bagged.',
    duration: 9,
    particleColor: 0xb08b57,
    announce: false,
    workerOffsets: [
      { x: -2.3, z: 0.3 },
      { x: 2.3, z: 0.3 },
    ],
  },
  {
    id: 'strip_panels',
    label: 'Cut fenders, quarter panels & core support',
    detail:
      'Fenders and quarter skins cut away, core support unbolted and the rusted rockers exposed.',
    duration: 10,
    particleColor: 0x9a6a43,
    announce: false,
    workerOffsets: [
      { x: -2.25, z: 1.5 },
      { x: 2.25, z: -1.5 },
    ],
  },
  {
    id: 'engine_pull',
    label: 'Pull the seized engine & transmission',
    detail:
      'Hood off, cooling system drained and the seized engine and transmission lifted out on the hoist.',
    duration: 8,
    particleColor: 0x57534e,
    announce: true,
    workerOffsets: [
      { x: -2.2, z: 2.0 },
      { x: 2.2, z: 2.0 },
    ],
  },
  {
    id: 'suspension',
    label: 'Lift & suspension teardown',
    detail:
      'Car up on the two-post lift: stock springs, shocks, control arms and rear axle come out.',
    duration: 8,
    particleColor: 0xb45309,
    announce: true,
    requiresCrate: 'suspension_hydraulics',
    workerOffsets: [
      { x: -1.3, z: -2.3 },
      { x: 1.3, z: -2.3 },
    ],
  },
  {
    id: 'hydraulics',
    label: 'Trunk hydraulics: pumps, cylinders, batteries & solenoids',
    detail:
      'Trunk opened, floor notched and braced. Two pumps, four cylinders, three batteries, solenoids and lines go in.',
    duration: 9,
    particleColor: 0x38bdf8,
    announce: true,
    requiresCrate: 'suspension_hydraulics',
    workerOffsets: [
      { x: -2.3, z: 1.5 },
      { x: 2.3, z: 1.5 },
    ],
  },
  {
    id: 'undercarriage',
    label: 'Frame, floors & undercarriage',
    detail:
      'Frame wire-wheeled, welded, seam-sealed and powdercoated; floors and brake lines replaced.',
    duration: 7,
    particleColor: 0x78716c,
    announce: false,
    requiresCrate: 'body_paint',
    workerOffsets: [
      { x: -2.2, z: -1.9 },
      { x: 2.2, z: -1.9 },
    ],
  },
  {
    id: 'body',
    label: 'Rust repair & panel gaps',
    detail:
      'Rust cut out, quarter panels patched, dents hammered and every panel gap reset.',
    duration: 7,
    particleColor: 0xc9a27a,
    announce: false,
    requiresCrate: 'body_paint',
    workerOffsets: [
      { x: -2.2, z: -0.8 },
      { x: 2.2, z: 0.9 },
    ],
  },
  {
    id: 'paint',
    label: 'Primer, candy paint & pinstripe',
    detail:
      'Block-sanded primer, sealer, candy base and hand-laid pinstripes under clear.',
    duration: 8,
    particleColor: 0x9f2948,
    announce: true,
    requiresCrate: 'body_paint',
    workerOffsets: [
      { x: 8.1, z: 1.2 },
      { x: 10.9, z: -0.2 },
    ],
  },
  {
    id: 'engine_install',
    label: 'Install engine, cooling & exhaust',
    detail:
      'The rebuilt engine and transmission go back in on new mounts with radiator, hoses, harness and exhaust.',
    duration: 8,
    particleColor: 0x64748b,
    announce: true,
    requiresCrate: 'engine_drivetrain',
    workerOffsets: [
      { x: -2.1, z: 2.0 },
      { x: 2.1, z: 0.6 },
    ],
  },
  {
    id: 'interior',
    label: 'New upholstery, carpet & headliner',
    detail:
      'Seats stripped and rebuilt with new foam and hides, new carpet, door cards and headliner.',
    duration: 9,
    particleColor: 0xe3c9a5,
    announce: true,
    requiresCrate: 'interior_roof',
    workerOffsets: [
      { x: -2.25, z: -1.1 },
      { x: 2.25, z: -1.1 },
    ],
  },
  {
    id: 'steering',
    label: 'Steering wheel, column & glovebox',
    detail:
      'Chosen wheel on a rebuilt column, new turn signal switch, dash pad and a lined glovebox.',
    duration: 6,
    particleColor: 0xd6d3ca,
    announce: false,
    requiresCrate: 'interior_roof',
    workerOffsets: [
      { x: -1.7, z: 0.4 },
      { x: 1.7, z: 0.4 },
    ],
  },
  {
    id: 'roof',
    label: 'Roof, hardtop & weatherstrip',
    detail:
      'The chosen roof goes on: padding, vinyl or cloth, bows, seals and opera lights.',
    duration: 7,
    particleColor: 0x7a2e3a,
    announce: false,
    requiresCrate: 'interior_roof',
    workerOffsets: [
      { x: -2.35, z: 0.4 },
      { x: 2.35, z: 0.4 },
    ],
  },
  {
    id: 'rims',
    label: 'Mount rims & new tires',
    detail:
      'Adapters fitted, chosen rims mounted, tires seated and torqued to spec on the lift.',
    duration: 7,
    particleColor: 0xf2c14e,
    announce: true,
    requiresCrate: 'wheels_lights',
    workerOffsets: [
      { x: -2.35, z: 0.6 },
      { x: 2.35, z: -0.6 },
    ],
  },
  {
    id: 'alignment',
    label: 'Road-force balance & alignment',
    detail:
      'Tires rotated front-to-rear, road-force balanced, ride height set and a four-wheel alignment dialled in.',
    duration: 5,
    particleColor: 0x60a5fa,
    announce: false,
    requiresCrate: 'wheels_lights',
    workerOffsets: [
      { x: -2.2, z: 2.2 },
      { x: 2.2, z: 2.2 },
    ],
  },
  {
    id: 'lights',
    label: 'Headlights, aim & electrical',
    detail:
      'New buckets and chosen headlights wired through relays, then aimed on the shop wall.',
    duration: 5,
    particleColor: 0xfef08a,
    announce: false,
    requiresCrate: 'wheels_lights',
    workerOffsets: [
      { x: -1.8, z: 2.45 },
      { x: 1.8, z: 2.45 },
    ],
  },
  {
    id: 'detail',
    label: 'Rim detail, fluids & final QC',
    detail:
      'Rims polished, interior detailed, fluids topped off and every switch, light and hydraulic function checked.',
    duration: 4,
    particleColor: 0xf59e0b,
    announce: false,
    requiresCrate: 'wheels_lights',
    workerOffsets: [
      { x: -2.4, z: -0.2 },
      { x: 2.4, z: -0.2 },
    ],
  },
  {
    id: 'road_test',
    label: 'Test drive around the shop road',
    detail:
      'Rae takes the finished car out of the bay, around the shop road and back—brakes, alignment and hydraulics checked under load.',
    duration: 10,
    particleColor: 0xfacc15,
    announce: true,
    requiresCrate: 'wheels_lights',
    workerOffsets: [
      { x: -2.5, z: 7.4 },
      { x: -2.1, z: 7.0 },
    ],
  },
] as const;

export const CUSTOM_SHOP_RESTORE_SECONDS = CUSTOM_RESTORATION_STAGES.reduce(
  (total, stage) => total + stage.duration,
  0,
);

export const CUSTOM_SHOP_TOTAL_SECONDS =
  CUSTOM_SHOP_TRIP_OUT_SECONDS +
  CUSTOM_SHOP_LOAD_SECONDS +
  CUSTOM_SHOP_TRIP_BACK_SECONDS +
  CUSTOM_SHOP_RESTORE_SECONDS;

export type CustomShopPhase =
  | 'idle'
  | 'outbound'
  | 'loading'
  | 'inbound'
  | 'waiting_donor'
  | 'restoring'
  | 'complete';

export interface CustomShopState {
  phase: CustomShopPhase;
  tripProgress: number;
  stageIndex: number;
  stageProgress: number;
  completed: boolean;
  startedAt: number | null;
  build: CustomShopBuild;
  cargo: CargoSupplyState;
  waitingForParts: boolean;
  waitingForCrateId: PartsCrateId | null;
  stageAnnounced: boolean;
}

export type CustomShopEvent =
  | { type: 'departed' }
  | { type: 'donor_loaded' }
  | { type: 'returned' }
  | { type: 'donor_shell_landed' }
  | { type: 'stage_started'; stage: RestorationStage }
  | { type: 'stage_finished'; stage: RestorationStage }
  | { type: 'complete' }
  | CargoSupplyEvent;

export function createCustomShopState(
  build: CustomShopBuild = DEFAULT_CUSTOM_BUILD,
): CustomShopState {
  return {
    phase: 'idle',
    tripProgress: 0,
    stageIndex: 0,
    stageProgress: 0,
    completed: false,
    startedAt: null,
    build: { ...build },
    cargo: createCargoSupplyState(getCargoSchedule(build)),
    waitingForParts: false,
    waitingForCrateId: null,
    stageAnnounced: false,
  };
}

export function beginCustomShopRestoration(
  state: CustomShopState,
  startedAt = 0,
  build?: Partial<CustomShopBuild>,
): boolean {
  if (state.phase !== 'idle' || state.completed) return false;
  if (build) state.build = { ...state.build, ...build };
  state.phase = state.build.donorSource === 'freight' ? 'waiting_donor' : 'outbound';
  state.tripProgress = 0;
  state.startedAt = startedAt;
  state.cargo = createCargoSupplyState(getCargoSchedule(state.build));
  state.cargo.phase = 'steaming_in';
  state.waitingForParts = false;
  state.waitingForCrateId = null;
  state.stageAnnounced = false;
  return true;
}

export function markCustomShopComplete(state: CustomShopState): void {
  state.phase = 'complete';
  state.completed = true;
  state.tripProgress = 0;
  state.stageIndex = CUSTOM_RESTORATION_STAGES.length;
  state.stageProgress = 0;
  state.waitingForParts = false;
  state.waitingForCrateId = null;
  state.stageAnnounced = false;
  state.cargo.phase = 'done';
  state.cargo.shipProgress = 1;
  state.cargo.crateIndex = state.cargo.crateIds.length;
  state.cargo.forkliftLeg = 'parked';
  state.cargo.deliveredCrateIds = [...state.cargo.crateIds];
}

/**
 * Advances the autonomous salvage/restoration loop and the parallel Crescent
 * City parts run. State is mutated for the render loop; events let GameEngine
 * trigger toasts and particles exactly once.
 */
export function advanceCustomShopState(
  state: CustomShopState,
  dt: number,
): CustomShopEvent[] {
  const events: CustomShopEvent[] = [];
  const step = Math.max(0, dt);

  // The barge and forklift run on their own clock; parts keep moving even
  // while the car sits on the lift waiting for the next crate.
  advanceCargoSupply(state.cargo, step, events as CargoSupplyEvent[]);

  let remaining = step;

  // A Crescent City auction shell has no cave tow: the car only appears once
  // the wrapped shell has been forklifted off the barge and unloaded.
  if (
    state.phase === 'waiting_donor' &&
    state.cargo.deliveredCrateIds.includes('donor_shell')
  ) {
    state.phase = 'restoring';
    state.stageIndex = 0;
    state.stageProgress = 0;
    state.stageAnnounced = false;
    state.waitingForParts = false;
    state.waitingForCrateId = null;
    events.push({ type: 'donor_shell_landed' });
  }

  while (remaining > 0) {
    if (
      state.phase === 'idle' ||
      state.phase === 'complete' ||
      state.phase === 'waiting_donor'
    ) {
      break;
    }

    if (state.phase === 'outbound') {
      const needed = (1 - state.tripProgress) * CUSTOM_SHOP_TRIP_OUT_SECONDS;
      if (remaining < needed) {
        state.tripProgress += remaining / CUSTOM_SHOP_TRIP_OUT_SECONDS;
        remaining = 0;
      } else {
        remaining -= needed;
        state.phase = 'loading';
        state.tripProgress = 0;
        events.push({ type: 'donor_loaded' });
      }
      continue;
    }

    if (state.phase === 'loading') {
      const needed = (1 - state.tripProgress) * CUSTOM_SHOP_LOAD_SECONDS;
      if (remaining < needed) {
        state.tripProgress += remaining / CUSTOM_SHOP_LOAD_SECONDS;
        remaining = 0;
      } else {
        remaining -= needed;
        state.phase = 'inbound';
        state.tripProgress = 0;
      }
      continue;
    }

    if (state.phase === 'inbound') {
      const needed = (1 - state.tripProgress) * CUSTOM_SHOP_TRIP_BACK_SECONDS;
      if (remaining < needed) {
        state.tripProgress += remaining / CUSTOM_SHOP_TRIP_BACK_SECONDS;
        remaining = 0;
      } else {
        remaining -= needed;
        state.phase = 'restoring';
        state.tripProgress = 0;
        state.stageIndex = 0;
        state.stageProgress = 0;
        state.stageAnnounced = false;
        events.push({ type: 'returned' });
      }
      continue;
    }

    // Restoring. Each stage waits on its Crescent City crate before starting.
    state.waitingForParts = false;
    state.waitingForCrateId = null;
    const stage = CUSTOM_RESTORATION_STAGES[state.stageIndex];
    if (!stage) {
      state.phase = 'complete';
      state.completed = true;
      state.stageAnnounced = false;
      events.push({ type: 'complete' });
      remaining = 0;
      break;
    }

    if (!state.stageAnnounced) {
      if (
        stage.requiresCrate &&
        !state.cargo.deliveredCrateIds.includes(stage.requiresCrate)
      ) {
        state.waitingForParts = true;
        state.waitingForCrateId = stage.requiresCrate;
        remaining = 0;
        break;
      }
      state.stageAnnounced = true;
      events.push({ type: 'stage_started', stage });
    }

    const needed = (1 - state.stageProgress) * stage.duration;
    if (remaining < needed) {
      state.stageProgress += remaining / stage.duration;
      remaining = 0;
      break;
    }

    remaining -= needed;
    state.stageProgress = 0;
    events.push({ type: 'stage_finished', stage });
    state.stageIndex++;
    state.stageAnnounced = false;
    const nextStage = CUSTOM_RESTORATION_STAGES[state.stageIndex];
    if (!nextStage) {
      state.phase = 'complete';
      state.completed = true;
      events.push({ type: 'complete' });
      remaining = 0;
      break;
    }
  }

  return events;
}

export function getCustomShopStage(
  state: Pick<CustomShopState, 'stageIndex'>,
): RestorationStage | undefined {
  return CUSTOM_RESTORATION_STAGES[state.stageIndex];
}

export function getCustomShopOverallProgress(state: CustomShopState): number {
  if (state.phase === 'idle') return 0;
  if (state.phase === 'complete') return 1;
  if (state.phase === 'waiting_donor') {
    return 0.02 + state.cargo.shipProgress * 0.18;
  }
  if (state.phase === 'outbound') return state.tripProgress * 0.1;
  if (state.phase === 'loading') return 0.1 + state.tripProgress * 0.04;
  if (state.phase === 'inbound') return 0.14 + state.tripProgress * 0.12;
  return (
    0.26 +
    ((state.stageIndex + state.stageProgress) /
      CUSTOM_RESTORATION_STAGES.length) *
      0.74
  );
}

export function getCustomShopPhaseLabel(state: CustomShopState): string {
  switch (state.phase) {
    case 'idle':
      return 'Waiting for a build sheet';
    case 'outbound':
      return 'Shop truck heading to Cave 12 Salvage';
    case 'loading':
      return 'Loading a donor from the cave junkyard';
    case 'inbound':
      return 'Towing the donor back to Bayou Royal Customs';
    case 'waiting_donor':
      return `Waiting for the wrapped auction shell · barge ETA ${formatCargoEta(
        getCargoEtaSeconds(state.cargo),
      )}`;
    case 'complete':
      return 'Bayou Royal restoration complete';
    case 'restoring': {
      if (state.waitingForParts) {
        const crate = CUSTOM_SHOP_PART_CRATES.find(
          (entry) => entry.id === state.waitingForCrateId,
        );
        return crate
          ? `Waiting on the Crescent City barge: ${crate.label}`
          : 'Waiting on Crescent City parts';
      }
      const stage = getCustomShopStage(state);
      return stage ? stage.label : 'Final detail';
    }
  }
}

export function getCustomShopLiftOffset(state: CustomShopState): number {
  if (state.phase !== 'restoring') return 0;
  const stage = getCustomShopStage(state);
  if (!stage) return 0;
  switch (stage.id) {
    case 'suspension':
    case 'hydraulics':
    case 'undercarriage':
    case 'body':
    case 'interior':
    case 'steering':
      return 1.35;
    case 'engine_install':
      return 1.15;
    case 'paint':
      return 0;
    case 'roof':
      return 0.9;
    default:
      return 0;
  }
}

export function isCustomShopTrunkOpen(state: CustomShopState): boolean {
  if (state.phase === 'complete') return false;
  if (state.phase !== 'restoring') return false;
  const stage = getCustomShopStage(state);
  return (
    stage?.id === 'strip_doors' ||
    stage?.id === 'hydraulics' ||
    stage?.id === 'interior'
  );
}

export interface CustomShopShellRemoval {
  trimOff: boolean;
  doorsOff: boolean;
  panelsOff: boolean;
  engineOut: boolean;
  hoodOpen: boolean;
  trunkOpen: boolean;
}

/**
 * Tells the renderer which bolt-on parts are currently off the donor. Real
 * teardown order: glass and interior first, then doors/trunk/hood, then the
 * unboltable fenders and quarter skins, then the engine and transmission.
 */
export function getCustomShopShellRemoval(
  state: CustomShopState,
): CustomShopShellRemoval {
  const stage = getCustomShopStage(state);
  const indexOf = (id: RestorationStageId) =>
    CUSTOM_RESTORATION_STAGES.findIndex((entry) => entry.id === id);
  const restoring = state.phase === 'restoring';
  const index = state.stageIndex;
  const between = (start: RestorationStageId, end: RestorationStageId) =>
    restoring && index > indexOf(start) && index < indexOf(end);
  return {
    trimOff: between('strip_trim', 'interior'),
    doorsOff: between('strip_doors', 'body'),
    panelsOff: between('strip_panels', 'body'),
    engineOut: between('engine_pull', 'engine_install'),
    hoodOpen:
      restoring &&
      (stage?.id === 'strip_doors' ||
        stage?.id === 'strip_panels' ||
        stage?.id === 'engine_pull'),
    trunkOpen: isCustomShopTrunkOpen(state),
  };
}

export type CustomShopToolKind =
  | 'hammer'
  | 'wrench'
  | 'spray'
  | 'needle'
  | 'polish'
  | 'none';

/** Each stage uses the tool a real tech would actually be holding. */
export function getCustomShopWorkerTool(
  stage: RestorationStage | undefined,
): CustomShopToolKind {
  switch (stage?.id) {
    case 'strip_trim':
      return 'needle';
    case 'strip_doors':
    case 'suspension':
    case 'hydraulics':
    case 'engine_pull':
    case 'engine_install':
    case 'steering':
    case 'rims':
    case 'alignment':
    case 'lights':
      return 'wrench';
    case 'strip_panels':
    case 'undercarriage':
    case 'body':
      return 'hammer';
    case 'paint':
      return 'spray';
    case 'roof':
      return 'needle';
    case 'detail':
      return 'polish';
    default:
      return 'none';
  }
}

/** Local space loop for the final road test, in front of the bay. */
export const CUSTOM_SHOP_TEST_DRIVE_POINTS: readonly {
  x: number;
  z: number;
}[] = [
  { x: 0, z: 0.4 },
  { x: 0, z: 6.9 },
  { x: -3.6, z: 8.2 },
  { x: -4.3, z: 5.3 },
  { x: 0, z: 4.7 },
  { x: 4.3, z: 5.3 },
  { x: 3.6, z: 8.2 },
  { x: 0, z: 6.9 },
  { x: 0, z: 0.4 },
];

export function isCustomShopTestDrive(state: CustomShopState): boolean {
  return state.phase === 'restoring' && getCustomShopStage(state)?.id === 'road_test';
}

export const CUSTOM_SHOP_PAINT_BOOTH = {
  /** Local-space centre of the booth extension east of the shop. */
  x: 9.5,
  z: 0.5,
  width: 6.0,
  depth: 6.8,
  doorZ: 3.75,
} as const;

const PAINT_BOOTH_ROUTE: readonly { x: number; z: number }[] = [
  { x: 0, z: 0.35 },
  { x: 0, z: 6.4 },
  { x: CUSTOM_SHOP_PAINT_BOOTH.x, z: 6.4 },
  { x: CUSTOM_SHOP_PAINT_BOOTH.x, z: CUSTOM_SHOP_PAINT_BOOTH.z },
];

function paintBoothRoutePoint(t: number): { x: number; z: number; heading: number } {
  const clamped = Math.min(0.999, Math.max(0, t));
  const segments = PAINT_BOOTH_ROUTE.length - 1;
  const raw = clamped * segments;
  const index = Math.min(segments - 1, Math.floor(raw));
  const local = raw - index;
  const from = PAINT_BOOTH_ROUTE[index];
  const to = PAINT_BOOTH_ROUTE[index + 1];
  return {
    x: from.x + (to.x - from.x) * local,
    z: from.z + (to.z - from.z) * local,
    heading: Math.atan2(to.x - from.x, to.z - from.z),
  };
}

export interface CustomShopPaintBoothTransfer {
  active: boolean;
  x: number;
  z: number;
  heading: number;
  inside: boolean;
  doorsClosed: boolean;
}

/** Drives the car into the booth, holds it for paint, then brings it back. */
export function getCustomShopPaintBoothTransfer(
  state: CustomShopState,
): CustomShopPaintBoothTransfer {
  const stage = getCustomShopStage(state);
  const active = state.phase === 'restoring' && stage?.id === 'paint';
  if (!active) {
    return {
      active: false,
      x: 0,
      z: 0.35,
      heading: 0,
      inside: false,
      doorsClosed: false,
    };
  }
  const progress = Math.min(1, Math.max(0, state.stageProgress));
  const entering = progress < 0.26;
  const leaving = progress > 0.8;
  const t = entering
    ? progress / 0.26
    : leaving
      ? 1 - (progress - 0.8) / 0.2
      : 1;
  const point = paintBoothRoutePoint(t);
  return {
    active: true,
    x: point.x,
    z: point.z,
    heading: point.heading,
    inside: !entering && !leaving,
    doorsClosed: progress > 0.28 && progress < 0.78,
  };
}

export function getCustomShopTestDrivePoint(progress: number): {
  x: number;
  z: number;
  heading: number;
} {
  const clamped = Math.min(0.999, Math.max(0, progress));
  const segments = CUSTOM_SHOP_TEST_DRIVE_POINTS.length - 1;
  const raw = clamped * segments;
  const index = Math.min(segments - 1, Math.floor(raw));
  const t = raw - index;
  const from = CUSTOM_SHOP_TEST_DRIVE_POINTS[index];
  const to = CUSTOM_SHOP_TEST_DRIVE_POINTS[index + 1];
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  return {
    x: from.x + dx * t,
    z: from.z + dz * t,
    heading: Math.atan2(dx, dz),
  };
}

export function areCustomShopWheelsRemoved(state: CustomShopState): boolean {
  if (state.phase !== 'restoring') return false;
  const index = CUSTOM_RESTORATION_STAGES.findIndex(
    (stage) => stage.id === 'suspension',
  );
  const rimsIndex = CUSTOM_RESTORATION_STAGES.findIndex(
    (stage) => stage.id === 'rims',
  );
  return state.stageIndex >= index && state.stageIndex < rimsIndex;
}

export interface RestorationShopHudState {
  phase: CustomShopPhase;
  build: CustomShopBuild;
  stageLabel: string;
  stageDetail: string;
  stageIndex: number;
  stageCount: number;
  stageProgress: number;
  overallProgress: number;
  waitingForParts: boolean;
  waitingForCrateId: PartsCrateId | null;
  cargoLabel: string;
  cargoPhase: CargoSupplyPhase;
  cargoEtaSeconds: number;
  cargoEtaLabel: string;
  forkliftLeg: ForkliftLeg;
  deliveredCrateIds: CargoCrateId[];
  cargoCrateCount: number;
  donorSource: DonorSource;
  completed: boolean;
  started: boolean;
}

export function getRestorationShopHudState(
  state: CustomShopState,
): RestorationShopHudState {
  const stage = getCustomShopStage(state);
  return {
    phase: state.phase,
    build: { ...state.build },
    stageLabel: getCustomShopPhaseLabel(state),
    stageDetail:
      state.phase === 'restoring'
        ? stage?.detail ?? 'Final detail.'
        : getCargoSupplyLabel(state.cargo),
    stageIndex: state.stageIndex,
    stageCount: CUSTOM_RESTORATION_STAGES.length,
    stageProgress: state.stageProgress,
    overallProgress: getCustomShopOverallProgress(state),
    waitingForParts: state.waitingForParts,
    waitingForCrateId: state.waitingForCrateId,
    cargoLabel: getCargoSupplyLabel(state.cargo),
    cargoPhase: state.cargo.phase,
    cargoEtaSeconds: getCargoEtaSeconds(state.cargo),
    cargoEtaLabel: formatCargoEta(getCargoEtaSeconds(state.cargo)),
    forkliftLeg: state.cargo.forkliftLeg,
    deliveredCrateIds: [...state.cargo.deliveredCrateIds],
    cargoCrateCount: state.cargo.crateIds.length,
    donorSource: state.build.donorSource,
    completed: state.completed,
    started: state.phase !== 'idle',
  };
}

/**
 * Backwards-compatible description of the original show car. The live build
 * now comes from `resolveCustomShopBuild(state.build)`.
 */
export const CUSTOM_DONK_BUILD = {
  vehicleId: CUSTOM_SHOP_VEHICLE_ID,
  name: 'Bayou Royal DONK',
  paintColor: '#6e1f3c',
  stripeColor: '#f4e3c1',
  interiorColor: '#d8bd96',
  rimColor: '#f1c453',
  wheelScale: 1.34,
  suspensionOffset: 0.5,
  hydraulicBounceBoost: 1.42,
  airbagSpeed: 1.05,
  airbagLockLevel: 1.28,
  underglowColor: '#f59e0b',
  rimLightColor: '#fef3c7',
  accessories: [
    'Cream double pinstripes over candy burgundy',
    '30-inch gold rims and new tires',
    'Six-pump DONK hydraulic dancing suspension',
    'New cream leather seats and upholstery',
    'New billet shifter and steering wheel',
    'Door, deck and trunk subwoofer system',
    'New headlights and LED halo accents',
    'Chrome spears, mirrors, underglow and rim lights',
  ],
} as const;
