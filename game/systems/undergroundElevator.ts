import type { VehiclePresetKey } from './modularVehicle';

export type ElevatorLiftState =
  | 'IDLE'
  | 'PREVIEWING'
  | 'RISING_TO_SURFACE'
  | 'READY';

export type ExoticCarClass =
  | 'Show & Hydraulics'
  | 'Modern Exotic'
  | 'Modern Hypercar'
  | 'Ultra Rare';

export interface GarageVehicleLivery {
  channelName: string;
  ctaText: string;
  accentColor: string;
  bodyColor: string;
}

export interface GarageVehicleSpec {
  id: string;
  name: string;
  aliases: string[];
  modelType: 'cadillac' | 'chevy_tahoe' | 'lowrider' | 'donk' | 'slab' | 'sports';
  supportsHydraulics: boolean;
  hasSubwooferWall?: boolean;
  displayOnly?: boolean;
  livery?: GarageVehicleLivery;
}

export const GARAGE_VEHICLES: GarageVehicleSpec[] = [
  {
    id: 'cadillac-coupe',
    name: 'Cadillac Coupe DeVille',
    aliases: ['cadillac', 'coupe', 'deville', 'caddy', 'coupeville'],
    modelType: 'cadillac',
    supportsHydraulics: true,
  },
  {
    id: 'chevy-tahoe-subwoofer',
    name: 'Chevy Tahoe',
    aliases: [
      'chevy tahoe',
      'tahoe',
      'chevrolet tahoe',
      'subwoofer tahoe',
      'bass tahoe',
      'savage life',
      'savage life gaming',
    ],
    modelType: 'chevy_tahoe',
    supportsHydraulics: true,
    hasSubwooferWall: true,
    livery: {
      channelName: 'SAVAGE LIFE GAMING',
      ctaText: 'SUBSCRIBE',
      accentColor: '#ff2a55',
      bodyColor: '#111318',
    },
  },
  {
    id: 'mini-truck',
    name: 'Custom Mini Truck Lowrider',
    aliases: ['mini truck', 'minitruck', 'mini truck lowrider', 'custom mini truck'],
    modelType: 'slab',
    supportsHydraulics: true,
  },
  {
    id: 'ford-de-soto',
    name: 'Ford De Soto Lowrider',
    aliases: ['ford de soto', 'ford desoto', 'de soto', 'desoto', 'de soto lowrider'],
    modelType: 'lowrider',
    supportsHydraulics: true,
  },
  {
    id: 'nissan-mini-truck',
    name: 'Nissan Hardbody Mini Truck',
    aliases: ['nissan', 'nissan mini truck', 'nissan hardbody', 'hardbody', 'nissan truck'],
    modelType: 'slab',
    supportsHydraulics: true,
  },
  {
    id: 'el-camino-donk',
    name: 'Red DONK El Camino',
    aliases: ['el camino', 'elcamino', 'red el camino', 'el camino donk', 'red donk'],
    modelType: 'donk',
    supportsHydraulics: true,
  },
  {
    id: 'impala-ss-dancer',
    name: '1967 Impala SS Dancer Lowrider',
    aliases: ['1967 impala', '67 impala', 'impala ss', 'dancer lowrider', 'dancing impala'],
    modelType: 'lowrider',
    supportsHydraulics: true,
    displayOnly: true,
  },
  {
    id: 'van-90s',
    name: '1990s Extended Bubble Van',
    aliases: ['90s van', '1990s van', 'bubble van', 'extended van', 'custom van'],
    modelType: 'chevy_tahoe',
    supportsHydraulics: true,
  },
  {
    id: 'lincoln-town-car',
    name: 'Lincoln Town Car (Black on Black)',
    aliases: ['lincoln', 'town car', 'lincoln town car', 'black town car', 'black lincoln'],
    modelType: 'lowrider',
    supportsHydraulics: true,
  },
];

export function resolveGarageVehicleQuery(rawInput: string): GarageVehicleSpec | null {
  const normalized = rawInput
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized) return null;

  // 1. Exact name or alias match
  for (const car of GARAGE_VEHICLES) {
    if (car.name.toLowerCase() === normalized || car.aliases.includes(normalized)) {
      return car;
    }
  }

  // 2. Token / substring match (handles "bring up chevy tahoe" or "tahoe sub wall")
  for (const car of GARAGE_VEHICLES) {
    if (car.name.toLowerCase().includes(normalized) || normalized.includes(car.name.toLowerCase())) {
      return car;
    }
    if (car.aliases.some((alias) => normalized.includes(alias) || alias.includes(normalized))) {
      return car;
    }
  }

  return null;
}

export interface GarageDanceState {
  enabled: boolean;
  phase: number;
  bassPulse: number;
}

export function createGarageDanceState(): GarageDanceState {
  return {
    enabled: false,
    phase: 0,
    bassPulse: 0,
  };
}

export function stepGarageHydraulicsDance(
  rig: {
    bodyGroup: { position: { y: number }; rotation: { x: number; z: number } };
    subCones: Array<{ position: { z: number }; userData?: Record<string, unknown> }>;
  },
  dance: GarageDanceState,
  dt: number,
  baseBodyY = 0,
  bounceBoost = 1,
): void {
  if (!dance.enabled) {
    // Cleanly reset transforms and skip work when dance mode is off
    rig.bodyGroup.position.y = baseBodyY;
    rig.bodyGroup.rotation.z = 0;
    rig.bodyGroup.rotation.x = 0;
    return;
  }

  dance.phase += dt * 7.5;
  const boost = Math.max(0.5, Math.min(2.4, bounceBoost));
  const hop = Math.abs(Math.sin(dance.phase)) * 0.18 * boost;
  const tilt = Math.sin(dance.phase * 0.5) * 0.11 * Math.min(1.35, boost);
  const pitch = Math.cos(dance.phase) * 0.08 * Math.min(1.35, boost);

  rig.bodyGroup.position.y = baseBodyY + hop;
  rig.bodyGroup.rotation.z = tilt;
  rig.bodyGroup.rotation.x = pitch;

  // Pulse behind-driver subwoofer cones when bass is playing
  dance.bassPulse = Math.sin(dance.phase * 2) * 0.5 + 0.5;
  for (let i = 0; i < rig.subCones.length; i++) {
    const cone = rig.subCones[i];
    const baseZ =
      (cone.userData && typeof cone.userData.baseZ === 'number'
        ? cone.userData.baseZ
        : 0.36);
    if (cone.userData) {
      cone.userData.baseZ = baseZ;
    }
    cone.position.z = baseZ + dance.bassPulse * 0.045;
  }
}

export interface ExoticElevatorCar {
  id: string;
  name: string;
  rarity: string;
  class: ExoticCarClass;
  paintColor: string;
  accentColor: string;
  rimColor: string;
  underglowColor: string;
  horsepower: number;
  zeroToSixty: string;
  topSpeedMph: number;
  engine: string;
  turboBoost: number;
  tagline: string;
  preset?: VehiclePresetKey;
  aliases?: string[];
  supportsHydraulics?: boolean;
  hasSubwooferWall?: boolean;
  displayOnly?: boolean;
  suspensionOffset?: number;
  wheelScale?: number;
  airbagSuspension?: boolean;
  airbagSpeed?: number;
  airbagLockLevel?: number;
  hydraulicsDance?: boolean;
  hydraulicBounceBoost?: number;
  livery?: GarageVehicleLivery;
}

export const ELEVATOR_EXOTIC_LIFT = {
  selectedCarId: 'chevy-tahoe-subwoofer',
  activeSurfaceCarId: null as string | null,
  liftState: 'IDLE' as ElevatorLiftState,

  cars: [
    {
      id: 'chevy-tahoe-subwoofer',
      name: 'Chevy Tahoe',
      rarity: 'Savage Life Show Truck',
      class: 'Show & Hydraulics',
      paintColor: '#111318',
      accentColor: '#ff2a55',
      rimColor: '#f8fafc',
      underglowColor: '#38bdf8',
      horsepower: 880,
      zeroToSixty: '3.4s',
      topSpeedMph: 165,
      engine: '6.2L Supercharged V8 · 4-Subwoofer Wall (No Backseat)',
      turboBoost: 1.56,
      preset: 'chevy_tahoe',
      aliases: [
        'chevy tahoe',
        'tahoe',
        'chevrolet tahoe',
        'subwoofer tahoe',
        'bass tahoe',
        'savage life',
        'savage life gaming',
      ],
      supportsHydraulics: true,
      hasSubwooferWall: true,
      livery: {
        channelName: 'SAVAGE LIFE GAMING',
        ctaText: 'SUBSCRIBE',
        accentColor: '#ff2a55',
        bodyColor: '#111318',
      },
      tagline:
        '3" slammed show Tahoe on 40" Forgiato 44 auto-spinners, Savage Life Gaming SUBSCRIBE livery, undercarriage glow & behind-driver sub wall (no backseat).',
    },
    {
      id: 'cadillac-coupe',
      name: 'Cadillac Coupe DeVille',
      rarity: 'Droptop Show Classic',
      class: 'Show & Hydraulics',
      paintColor: '#f8fafc',
      accentColor: '#facc15',
      rimColor: '#f8fafc',
      underglowColor: '#38bdf8',
      horsepower: 620,
      zeroToSixty: '4.1s',
      topSpeedMph: 155,
      engine: '472 cu in Big-Block V8 · Airbag & Coil-Over Hydraulics',
      turboBoost: 1.44,
      preset: 'cadillac_coupe_deville',
      aliases: ['cadillac', 'coupe', 'deville', 'caddy', 'coupeville'],
      supportsHydraulics: true,
      tagline:
        'Pearl-white convertible Coupe DeVille on 13" chrome spinners with power droptop and full airbag + coil-over hydraulics.',
    },
    {
      id: 'mini-truck',
      name: 'Custom Mini Truck Lowrider',
      rarity: 'Teal Mini Truck Show Build',
      class: 'Show & Hydraulics',
      paintColor: '#0f766e',
      accentColor: '#f8fafc',
      rimColor: '#f8fafc',
      underglowColor: '#2dd4bf',
      horsepower: 260,
      zeroToSixty: '7.2s',
      topSpeedMph: 105,
      engine: '2.2L Built Four · Four-Corner Hydraulic Pumps',
      turboBoost: 1.08,
      preset: 'mini_truck',
      aliases: ['mini truck', 'minitruck', 'mini truck lowrider', 'custom mini truck'],
      supportsHydraulics: true,
      suspensionOffset: -0.24,
      wheelScale: 0.82,
      airbagSpeed: 1.15,
      airbagLockLevel: 1.0,
      hydraulicBounceBoost: 1.1,
      tagline:
        'Teal custom mini truck laid out on whitewalls with an open bed, visible chrome pump rack, four-corner hops, tilts and side-to-side dance.',
    },
    {
      id: 'ford-de-soto',
      name: 'Ford De Soto Lowrider',
      rarity: 'Classic Hydraulic Cruiser',
      class: 'Show & Hydraulics',
      paintColor: '#7f1d1d',
      accentColor: '#f8fafc',
      rimColor: '#f8fafc',
      underglowColor: '#f59e0b',
      horsepower: 340,
      zeroToSixty: '7.8s',
      topSpeedMph: 118,
      engine: '383 cu in V8 · Four-Pump Up/Down & Side-to-Side Hydraulics',
      turboBoost: 1.1,
      preset: 'lowrider',
      aliases: ['ford de soto', 'ford desoto', 'de soto', 'desoto', 'de soto lowrider'],
      supportsHydraulics: true,
      suspensionOffset: -0.16,
      wheelScale: 0.95,
      airbagSpeed: 1.25,
      airbagLockLevel: 1.05,
      hydraulicBounceBoost: 1.15,
      tagline:
        'Maroon-and-white Ford De Soto cruiser on chrome with four-pump hydraulics — full up/down hops, left/right tilt and a slow side-to-side walk.',
    },
    {
      id: 'nissan-mini-truck',
      name: 'Nissan Hardbody Mini Truck',
      rarity: 'Hydraulic Dance Mini Truck',
      class: 'Show & Hydraulics',
      paintColor: '#1e3a8a',
      accentColor: '#f8fafc',
      rimColor: '#e2e8f0',
      underglowColor: '#22d3ee',
      horsepower: 240,
      zeroToSixty: '7.4s',
      topSpeedMph: 108,
      engine: '2.4L KA24 Four · Four-Corner Dance Hydraulics',
      turboBoost: 1.06,
      preset: 'mini_truck',
      aliases: ['nissan', 'nissan mini truck', 'nissan hardbody', 'hardbody', 'nissan truck'],
      supportsHydraulics: true,
      hydraulicsDance: true,
      suspensionOffset: -0.22,
      wheelScale: 0.86,
      airbagSpeed: 1.4,
      airbagLockLevel: 1.1,
      hydraulicBounceBoost: 1.3,
      tagline:
        'Blue Nissan Hardbody mini truck with a four-corner hydraulic dance — continuous up/down hops and side-to-side body walk, plus manual tilt and hop controls.',
    },
    {
      id: 'el-camino-donk',
      name: 'Red DONK El Camino',
      rarity: 'Red DONK Pickup',
      class: 'Show & Hydraulics',
      paintColor: '#b91c1c',
      accentColor: '#f8fafc',
      rimColor: '#f8fafc',
      underglowColor: '#ef4444',
      horsepower: 560,
      zeroToSixty: '4.2s',
      topSpeedMph: 138,
      engine: '6.2L LS V8 · DONK-Spec Hydraulics',
      turboBoost: 1.24,
      preset: 'el_camino',
      aliases: ['el camino', 'elcamino', 'red el camino', 'el camino donk', 'red donk'],
      supportsHydraulics: true,
      suspensionOffset: -0.2,
      wheelScale: 1.26,
      airbagSpeed: 1.45,
      airbagLockLevel: 1.12,
      hydraulicBounceBoost: 1.2,
      tagline:
        'Candy-red El Camino DONK on oversized chrome, open pickup bed, front/rear hops, both-side tilt and full four-corner hydraulic bounce.',
    },
    {
      id: 'impala-ss-dancer',
      name: '1967 Impala SS Dancer Lowrider',
      rarity: 'Hydraulic Dance Display Car',
      class: 'Show & Hydraulics',
      paintColor: '#1c0b12',
      accentColor: '#f8fafc',
      rimColor: '#f8fafc',
      underglowColor: '#a855f7',
      horsepower: 410,
      zeroToSixty: '6.0s',
      topSpeedMph: 125,
      engine: '327 cu in V8 · Six-Pump Dancer Hydraulic Rack',
      turboBoost: 1.0,
      preset: 'lowrider',
      aliases: ['1967 impala', '67 impala', 'impala ss', 'dancer lowrider', 'dancing impala'],
      supportsHydraulics: true,
      displayOnly: true,
      hydraulicsDance: true,
      suspensionOffset: -0.18,
      wheelScale: 0.9,
      airbagSpeed: 1.65,
      airbagLockLevel: 1.25,
      hydraulicBounceBoost: 1.25,
      tagline:
        'Black-cherry 1967 Impala SS dancer with six visible pumps, front/rear/side hops and continuous body dance. Display only — push it to move it.',
    },
    {
      id: 'van-90s',
      name: '1990s Extended Bubble Van',
      rarity: 'Extended Custom Van',
      class: 'Show & Hydraulics',
      paintColor: '#d6d3d1',
      accentColor: '#334155',
      rimColor: '#cbd5e1',
      underglowColor: '#38bdf8',
      horsepower: 235,
      zeroToSixty: '9.0s',
      topSpeedMph: 96,
      engine: '5.7L V8 · Long-Travel Airbag & Coil-Over Bounce',
      turboBoost: 1.06,
      preset: 'van_90s',
      aliases: ['90s van', '1990s van', 'bubble van', 'extended van', 'custom van'],
      supportsHydraulics: true,
      suspensionOffset: 0.08,
      wheelScale: 1.08,
      airbagSuspension: true,
      airbagSpeed: 1.7,
      airbagLockLevel: 1.4,
      hydraulicBounceBoost: 1.85,
      tagline:
        'Extended 1990s bubble van with long-travel airbags, a huge vertical bounce, four-corner lift/drop and no rear subwoofer wall — just open cargo and hydraulic hardware.',
    },
    {
      id: 'lincoln-town-car',
      name: 'Lincoln Town Car (Black on Black)',
      rarity: 'Black-on-Black Hydraulic Sedan',
      class: 'Show & Hydraulics',
      paintColor: '#050505',
      accentColor: '#d4d4d8',
      rimColor: '#e2e8f0',
      underglowColor: '#71717a',
      horsepower: 285,
      zeroToSixty: '7.4s',
      topSpeedMph: 130,
      engine: '4.6L V8 · Four-Pump Cylinder Hydraulics (No Ball-Joint Lock-Up)',
      turboBoost: 1.12,
      preset: 'town_car',
      aliases: ['lincoln', 'town car', 'lincoln town car', 'black town car', 'black lincoln'],
      supportsHydraulics: true,
      suspensionOffset: -0.18,
      wheelScale: 0.88,
      airbagSpeed: 1.3,
      airbagLockLevel: 1.0,
      hydraulicBounceBoost: 1.18,
      tagline:
        'Black-on-black left-hand-drive Town Car with chrome trim, four-pump cylinder hydraulics, up/down, left/right tilt, both-side dance and a three-wheel stance — no high-lock ball joints.',
    },
    {
      id: 'mclaren_720s_lbw',
      name: 'McLaren 720S LB-Works',
      rarity: 'Rare Widebody',
      class: 'Modern Exotic',
      paintColor: '#f97316',
      accentColor: '#111827',
      rimColor: '#e2e8f0',
      underglowColor: '#fb923c',
      horsepower: 750,
      zeroToSixty: '2.7s',
      topSpeedMph: 214,
      engine: '4.0L Twin-Turbo V8',
      turboBoost: 1.52,
      aliases: ['mclaren 720s', '720s', 'lb works', 'lbw', 'liberty walk'],
      tagline: 'Liberty Walk widebody aero kit with dihedral doors and carbon diffuser.',
    },
    {
      id: 'aston_vantage_gt3',
      name: 'Aston Martin Vantage GT3 Evo',
      rarity: 'Track Exotic',
      class: 'Modern Exotic',
      paintColor: '#047857',
      accentColor: '#bef264',
      rimColor: '#cbd5e1',
      underglowColor: '#34d399',
      horsepower: 680,
      zeroToSixty: '2.9s',
      topSpeedMph: 205,
      engine: '4.0L Bi-Turbo V8 GT3',
      turboBoost: 1.48,
      aliases: ['aston vantage', 'vantage', 'vantage gt3', 'aston martin gt3'],
      tagline: 'Endurance-spec British GT3 chassis with full downforce splitter & wing.',
    },
    {
      id: 'huracan_gt3_evo2',
      name: 'Lamborghini Huracán GT3 EVO2',
      rarity: 'Track Exotic',
      class: 'Modern Exotic',
      paintColor: '#65a30d',
      accentColor: '#18181b',
      rimColor: '#f8fafc',
      underglowColor: '#a3e635',
      horsepower: 640,
      zeroToSixty: '2.8s',
      topSpeedMph: 208,
      engine: '5.2L Naturally Aspirated V10',
      turboBoost: 1.5,
      aliases: ['huracan', 'huracan gt3', 'lamborghini huracan', 'evo2', 'lambo huracan'],
      tagline: 'Screaming Squadra Corse V10 track weapon with hexagonal roof scoop.',
    },
    {
      id: 'ferrari_sf90',
      name: 'Ferrari SF90 Stradale',
      rarity: 'Hybrid Exotic',
      class: 'Modern Exotic',
      paintColor: '#dc2626',
      accentColor: '#facc15',
      rimColor: '#f1f5f9',
      underglowColor: '#ef4444',
      horsepower: 986,
      zeroToSixty: '2.5s',
      topSpeedMph: 211,
      engine: '4.0L Twin-Turbo V8 + 3 Electric Motors',
      turboBoost: 1.62,
      aliases: ['sf90', 'ferrari sf90', 'stradale', 'sf90 stradale'],
      tagline: 'Maranello plug-in hybrid AWD flagship with instant e-torque launch.',
    },
    {
      id: 'sls_amg_black',
      name: 'Mercedes-Benz SLS AMG Black',
      rarity: 'Limited Coupe',
      class: 'Modern Exotic',
      paintColor: '#eab308',
      accentColor: '#0f172a',
      rimColor: '#1e293b',
      underglowColor: '#facc15',
      horsepower: 622,
      zeroToSixty: '3.2s',
      topSpeedMph: 196,
      engine: '6.2L Hand-Built V8',
      turboBoost: 1.46,
      aliases: ['sls', 'sls amg', 'mercedes sls', 'amg black', 'gullwing', 'mercedes'],
      tagline: 'Iconic gullwing Black Series coupe with thunderous AMG V8 exhaust.',
    },
    {
      id: 'mclaren_speedtail',
      name: 'McLaren Speedtail',
      rarity: 'Hyper-GT',
      class: 'Modern Hypercar',
      paintColor: '#94a3b8',
      accentColor: '#38bdf8',
      rimColor: '#f8fafc',
      underglowColor: '#38bdf8',
      horsepower: 1055,
      zeroToSixty: '2.6s',
      topSpeedMph: 250,
      engine: '4.0L Hybrid Twin-Turbo V8',
      turboBoost: 1.72,
      aliases: ['speedtail', 'mclaren speedtail', 'hyper gt'],
      tagline: 'Teardrop three-seat Hyper-GT built for 250 mph straight-line velocity.',
    },
    {
      id: 'mclaren_p1_gtr',
      name: 'McLaren P1 GTR',
      rarity: 'Track Hypercar',
      class: 'Modern Hypercar',
      paintColor: '#facc15',
      accentColor: '#15803d',
      rimColor: '#1e293b',
      underglowColor: '#fde047',
      horsepower: 986,
      zeroToSixty: '2.4s',
      topSpeedMph: 225,
      engine: '3.8L Hybrid Twin-Turbo V8',
      turboBoost: 1.68,
      aliases: ['p1', 'p1 gtr', 'mclaren p1'],
      tagline: 'Track-only hybrid legend with fixed swan-neck rear wing & ERS boost.',
    },
    {
      id: 'bugatti_chiron',
      name: 'Bugatti Chiron',
      rarity: 'W16 Hypercar',
      class: 'Modern Hypercar',
      paintColor: '#2563eb',
      accentColor: '#0f172a',
      rimColor: '#e2e8f0',
      underglowColor: '#3b82f6',
      horsepower: 1500,
      zeroToSixty: '2.3s',
      topSpeedMph: 261,
      engine: '8.0L Quad-Turbo W16',
      turboBoost: 1.82,
      aliases: ['chiron', 'bugatti chiron', 'w16', 'bugatti'],
      tagline: 'Molsheim quad-turbocharged W16 masterpiece with signature C-line.',
    },
    {
      id: 'bugatti_divo',
      name: 'Bugatti Divo',
      rarity: 'Bespoke Hypercar',
      class: 'Modern Hypercar',
      paintColor: '#334155',
      accentColor: '#06b6d4',
      rimColor: '#22d3ee',
      underglowColor: '#06b6d4',
      horsepower: 1500,
      zeroToSixty: '2.4s',
      topSpeedMph: 236,
      engine: '8.0L Quad-Turbo W16',
      turboBoost: 1.78,
      aliases: ['divo', 'bugatti divo'],
      tagline: 'Coachbuilt corner-carving W16 limited to 40 units worldwide.',
    },
    {
      id: 'ferrari_monza_sp2',
      name: 'Ferrari Monza SP2',
      rarity: 'Limited Speedster',
      class: 'Modern Hypercar',
      paintColor: '#991b1b',
      accentColor: '#f8fafc',
      rimColor: '#cbd5e1',
      underglowColor: '#f87171',
      horsepower: 799,
      zeroToSixty: '2.9s',
      topSpeedMph: 186,
      engine: '6.5L Naturally Aspirated V12',
      turboBoost: 1.58,
      aliases: ['monza', 'monza sp2', 'sp2', 'ferrari monza'],
      tagline: 'Open-cockpit Icona series barchetta powered by an 8,500 rpm V12.',
    },
    {
      id: 'lamborghini_sian',
      name: 'Lamborghini Sián FKP 37',
      rarity: 'Supercapacitor Hybrid',
      class: 'Ultra Rare',
      paintColor: '#4d7c0f',
      accentColor: '#d97706',
      rimColor: '#fbbf24',
      underglowColor: '#84cc16',
      horsepower: 819,
      zeroToSixty: '2.7s',
      topSpeedMph: 220,
      engine: '6.5L V12 + Supercapacitor E-Motor',
      turboBoost: 1.66,
      aliases: ['sian', 'lamborghini sian', 'fkp 37', 'fkp37', 'lambo sian'],
      tagline: 'Y-shaped DRL razor aero with instant supercapacitor torque fill.',
    },
    {
      id: 'aston_valkyrie',
      name: 'Aston Martin Valkyrie',
      rarity: 'Aero Hypercar',
      class: 'Ultra Rare',
      paintColor: '#0f766e',
      accentColor: '#2dd4bf',
      rimColor: '#1e293b',
      underglowColor: '#14b8a6',
      horsepower: 1160,
      zeroToSixty: '2.3s',
      topSpeedMph: 250,
      engine: '6.5L Cosworth V12 Hybrid (11,100 RPM)',
      turboBoost: 1.85,
      aliases: ['valkyrie', 'aston valkyrie', 'aston martin valkyrie'],
      tagline: 'Formula 1 Venturi-tunnel hypercar engineered for extreme downforce.',
    },
    {
      id: 'pagani_huayra',
      name: 'Pagani Huayra Roadster',
      rarity: 'Boutique Exotic',
      class: 'Ultra Rare',
      paintColor: '#6d28d9',
      accentColor: '#f59e0b',
      rimColor: '#fcd34d',
      underglowColor: '#a855f7',
      horsepower: 764,
      zeroToSixty: '2.8s',
      topSpeedMph: 238,
      engine: '6.0L AMG Twin-Turbo V12',
      turboBoost: 1.65,
      aliases: ['pagani', 'huayra', 'huayra roadster', 'pagani huayra'],
      tagline: 'Carbo-Titanium Italian art piece with active aero flaps & billet cabin.',
    },
    {
      id: 'koenigsegg_gemera',
      name: 'Koenigsegg Gemera',
      rarity: 'Mega-GT',
      class: 'Ultra Rare',
      paintColor: '#e2e8f0',
      accentColor: '#f97316',
      rimColor: '#0f172a',
      underglowColor: '#e2e8f0',
      horsepower: 1700,
      zeroToSixty: '1.9s',
      topSpeedMph: 249,
      engine: 'Freevalve Hybrid Mega-GT Powertrain',
      turboBoost: 1.9,
      aliases: ['koenigsegg', 'gemera', 'koenigsegg gemera', 'mega gt'],
      tagline: 'World’s first 4-seat Mega-GT with automated dihedral synchro-helix doors.',
    },
    {
      id: 'delage_d12',
      name: 'Delage D12',
      rarity: 'Boutique Prototype',
      class: 'Ultra Rare',
      paintColor: '#0284c7',
      accentColor: '#f43f5e',
      rimColor: '#f8fafc',
      underglowColor: '#38bdf8',
      horsepower: 1100,
      zeroToSixty: '2.4s',
      topSpeedMph: 224,
      engine: '7.6L Naturally Aspirated V12 Hybrid',
      turboBoost: 1.8,
      aliases: ['delage', 'd12', 'delage d12'],
      tagline: 'Fighter-jet tandem cockpit street-legal F1 prototype from France.',
    },
  ] as ExoticElevatorCar[],

  selectForPreview(carIdOrQuery: string): ExoticElevatorCar | null {
    const car =
      this.cars.find((c) => c.id === carIdOrQuery) ??
      resolveElevatorCarQuery(carIdOrQuery);
    if (!car) return null;
    this.selectedCarId = car.id;
    this.liftState = 'PREVIEWING';
    return car;
  },

  bringCarToSurface(
    carIdOrQuery?: string,
    onComplete: ((car: ExoticElevatorCar) => void) | null = null,
  ): ExoticElevatorCar | null {
    const targetId = carIdOrQuery ?? this.selectedCarId;
    const car =
      this.cars.find((c) => c.id === targetId) ??
      resolveElevatorCarQuery(targetId);
    if (!car) return null;

    this.selectedCarId = car.id;
    this.activeSurfaceCarId = car.id;
    this.liftState = 'RISING_TO_SURFACE';

    if (typeof onComplete === 'function') {
      onComplete(car);
    }

    return car;
  },

  markReady(): void {
    this.liftState = 'READY';
  },
};

// When asking the vault computer for one of the 15 exotics, match natural phrases too
export function parseVaultComputerRequest<T extends { id: string; name: string; aliases: string[] }>(
  input: string,
  fleet: T[],
): T | null {
  const cleaned = input
    .toLowerCase()
    .replace(/\b(bring up|pull up|get me|spawn|summon|show|the|car|exotic|vault)\b/g, ' ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return null;

  return (
    fleet.find(
      (car) =>
        car.name.toLowerCase().includes(cleaned) ||
        cleaned.includes(car.name.toLowerCase()) ||
        car.aliases.some((alias) => cleaned.includes(alias) || alias.includes(cleaned)),
    ) ?? null
  );
}

export function resolveElevatorCarQuery(rawInput: string): ExoticElevatorCar | null {
  const normalized = rawInput
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized) return null;

  // 1. Check garage show/hydraulics alias resolver first (handles "bring up chevy tahoe", "tahoe sub wall", "savage life", "cadillac", etc.)
  const garageMatch = resolveGarageVehicleQuery(normalized);
  if (garageMatch) {
    const found = ELEVATOR_EXOTIC_LIFT.cars.find((c) => c.id === garageMatch.id);
    if (found) return found;
  }

  // 2. Exact id / name / alias match across full vault roster
  for (const car of ELEVATOR_EXOTIC_LIFT.cars) {
    if (
      car.id.toLowerCase() === normalized ||
      car.name.toLowerCase() === normalized ||
      car.aliases?.includes(normalized)
    ) {
      return car;
    }
  }

  // 3. Natural-phrase vault computer parser across the full fleet (handles "bring up the bugatti chiron", "get me the sf90", etc.)
  const fleet = ELEVATOR_EXOTIC_LIFT.cars.map((car) => ({
    car,
    id: car.id,
    name: car.name,
    aliases: car.aliases ?? [],
  }));
  const naturalMatch = parseVaultComputerRequest(rawInput, fleet);
  if (naturalMatch) {
    return naturalMatch.car;
  }

  // 4. Fallback token / substring match across full vault roster
  for (const car of ELEVATOR_EXOTIC_LIFT.cars) {
    if (
      car.name.toLowerCase().includes(normalized) ||
      normalized.includes(car.name.toLowerCase()) ||
      car.aliases?.some((a) => normalized.includes(a) || a.includes(normalized))
    ) {
      return car;
    }
  }

  return null;
}

export type PlayerHonorific = 'Sir' | "Ma'am" | 'Friend';

const HONORIFIC_STORAGE_KEY = 'survival_island_vault_honorific';
const VOICE_ENABLED_STORAGE_KEY = 'survival_island_vault_voice_enabled';

function loadSavedHonorific(): PlayerHonorific {
  if (typeof window === 'undefined') return 'Sir';
  try {
    const saved = window.localStorage.getItem(HONORIFIC_STORAGE_KEY);
    if (saved === 'Sir' || saved === "Ma'am" || saved === 'Friend') {
      return saved;
    }
    if (saved === 'Boss') {
      return 'Friend';
    }
  } catch {
    // ignore storage errors
  }
  return 'Sir';
}

function loadSavedVoiceEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const saved = window.localStorage.getItem(VOICE_ENABLED_STORAGE_KEY);
    if (saved === 'false') return false;
  } catch {
    // ignore storage errors
  }
  return true;
}

export const ELEVATOR_VOICE_COMPUTER = {
  honorific: 'Sir' as PlayerHonorific,
  selectedCarName: null as string | null,
  voiceEnabled: true,

  syncFromStorage(): void {
    this.honorific = loadSavedHonorific();
    this.voiceEnabled = loadSavedVoiceEnabled();
  },

  setHonorific(title: PlayerHonorific | string): PlayerHonorific {
    if (title === 'Sir' || title === "Ma'am" || title === 'Friend') {
      this.honorific = title;
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(HONORIFIC_STORAGE_KEY, title);
        } catch {
          // ignore storage errors
        }
      }
    }
    return this.honorific;
  },

  setEnabled(enabled: boolean): void {
    this.voiceEnabled = enabled;
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(VOICE_ENABLED_STORAGE_KEY, String(enabled));
      if (!enabled && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } catch {
      // ignore storage errors
    }
  },

  speak(line: string, onTextFallback: ((text: string) => void) | null = null): void {
    if (typeof onTextFallback === 'function') {
      onTextFallback(line);
    }

    if (
      !this.voiceEnabled ||
      typeof window === 'undefined' ||
      !('speechSynthesis' in window)
    ) {
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(line);
      utterance.rate = 1.0;
      utterance.pitch = 0.95;
      utterance.volume = 0.95;
      const voices = window.speechSynthesis.getVoices();
      const preferred =
        voices.find(
          (v) =>
            /en-US|en-GB/i.test(v.lang) &&
            /Google|Samantha|Daniel|Alex|Natural/i.test(v.name),
        ) ?? voices.find((v) => /^en/i.test(v.lang));
      if (preferred) {
        utterance.voice = preferred;
      }
      window.speechSynthesis.speak(utterance);
    } catch {
      // Ignore speech errors on restricted devices; text fallback still shows
    }
  },

  // 1. Player walks up to the surface computer terminal by the elevator
  onApproachTerminal(onSubtitle: ((text: string) => void) | null = null): string {
    this.syncFromStorage();
    const line = `What kind of car do you want? Would you like me to bring it up today, ${this.honorific}?`;
    this.speak(line, onSubtitle);
    return line;
  },

  // 2. Player picks a car in the preview menu
  onPreviewCar(
    carName: string,
    onSubtitle: ((text: string) => void) | null = null,
  ): string {
    this.syncFromStorage();
    this.selectedCarName = carName;
    const line = `${carName} selected on preview. Shall I bring it up to the surface today, ${this.honorific}?`;
    this.speak(line, onSubtitle);
    return line;
  },

  // 3. Player confirms and sends the car up on the elevator
  onConfirmBringUp(
    carName?: string | null,
    onSubtitle: ((text: string) => void) | null = null,
  ): string {
    this.syncFromStorage();
    const label = carName || this.selectedCarName || 'your ride';
    const line = `OK ${this.honorific}, bringing ${label} up to the surface now.`;
    this.speak(line, onSubtitle);
    return line;
  },
};

export const VAULT_COMPUTER_VOICE = {
  getHonorific(): PlayerHonorific {
    ELEVATOR_VOICE_COMPUTER.syncFromStorage();
    return ELEVATOR_VOICE_COMPUTER.honorific;
  },

  setHonorific(title: PlayerHonorific): void {
    ELEVATOR_VOICE_COMPUTER.setHonorific(title);
  },

  isEnabled(): boolean {
    ELEVATOR_VOICE_COMPUTER.syncFromStorage();
    return ELEVATOR_VOICE_COMPUTER.voiceEnabled;
  },

  setEnabled(enabled: boolean): void {
    ELEVATOR_VOICE_COMPUTER.setEnabled(enabled);
  },

  speak(text: string): void {
    ELEVATOR_VOICE_COMPUTER.syncFromStorage();
    ELEVATOR_VOICE_COMPUTER.speak(text);
  },

  speakGreeting(): string {
    return ELEVATOR_VOICE_COMPUTER.onApproachTerminal();
  },

  speakPreview(carName: string): string {
    return ELEVATOR_VOICE_COMPUTER.onPreviewCar(carName);
  },

  speakConfirmSummon(carName: string): string {
    return ELEVATOR_VOICE_COMPUTER.onConfirmBringUp(carName);
  },

  speakCarArrived(carName: string): string {
    const title = this.getHonorific();
    const line = `Your ${carName} is now on the surface, ${title}. Ready to drive.`;
    this.speak(line);
    return line;
  },
};
