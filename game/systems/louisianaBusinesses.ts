import { LOUISIANA_CITY_GROUND_Y } from '../world/louisianaLandmass';

/**
 * Crescent City's enterable businesses.
 *
 * These coordinates are world-space on the separated Louisiana city shelf.
 * The world builder uses the same definitions for geometry, colliders and
 * employee placement; the engine and HUD use them for services and map pins.
 */

export type MainlandBusinessKind =
  | 'restaurant'
  | 'store'
  | 'hotel'
  | 'police'
  | 'gas'
  | 'bar'
  | 'bank'
  | 'music'
  | 'cafe'
  | 'outfitter'
  | 'auto_parts'
  | 'terminal';

export type MainlandServiceEffect =
  | 'meal'
  | 'hearty_meal'
  | 'drink'
  | 'coffee'
  | 'groceries'
  | 'medical'
  | 'ammo'
  | 'hotel'
  | 'police_fine'
  | 'refuel'
  | 'repair'
  | 'bank_exchange'
  | 'music'
  | 'garage_menu'
  | 'market_menu'
  | 'transit_menu'
  | 'outfitter_menu'
  | 'network';

export interface MainlandBusinessService {
  id: string;
  label: string;
  description: string;
  price: number;
  effect: MainlandServiceEffect;
  itemId?: 'roasted_meat' | 'filtered_water_bottle' | 'ammo';
  quantity?: number;
}

export interface MainlandBusiness {
  id: string;
  name: string;
  kind: MainlandBusinessKind;
  subtitle: string;
  description: string;
  accent: string;
  x: number;
  z: number;
  w: number;
  d: number;
  employeeName: string;
  employeeTitle: string;
  services: readonly MainlandBusinessService[];
}

const mealServices: readonly MainlandBusinessService[] = [
  {
    id: 'hot_plate',
    label: 'Hot plate special',
    description: 'Red beans, rice and sausage. Restores hunger and a little health.',
    price: 18,
    effect: 'meal',
  },
  {
    id: 'po_boy',
    label: 'Shrimp po-boy',
    description: 'A heavy dressed po-boy that restores a large amount of hunger.',
    price: 32,
    effect: 'hearty_meal',
  },
  {
    id: 'sweet_tea',
    label: 'Sweet tea',
    description: 'Ice-cold southern sweet tea. Restores thirst and stamina.',
    price: 7,
    effect: 'drink',
  },
];

export const MAINLAND_BUSINESSES: readonly MainlandBusiness[] = [
  {
    id: 'mamou_table',
    name: "Mamou's Table",
    kind: 'restaurant',
    subtitle: 'Creole kitchen · dine-in counter',
    description:
      'A family-run Creole restaurant with a working kitchen, tables and a takeout counter.',
    accent: '#f59e0b',
    x: -150,
    z: 1360,
    w: 25,
    d: 18,
    employeeName: 'Mamou Thibodeaux',
    employeeTitle: 'Owner & chef',
    services: mealServices,
  },
  {
    id: 'bayou_mercantile',
    name: 'Bayou Mercantile',
    kind: 'store',
    subtitle: 'General store · shelves & cashier',
    description:
      'Shelves of water, food and ammunition behind a working cashier counter.',
    accent: '#22c55e',
    x: 185,
    z: 1295,
    w: 26,
    d: 18,
    employeeName: 'Junie Boudreaux',
    employeeTitle: 'Shopkeeper',
    services: [
      {
        id: 'grocery_bag',
        label: 'Grocery bag',
        description: 'Two roasted meals and two filtered waters.',
        price: 35,
        effect: 'groceries',
      },
      {
        id: 'field_medical',
        label: 'Field medical kit',
        description: 'Restores a large chunk of health immediately.',
        price: 45,
        effect: 'medical',
      },
      {
        id: 'ammo_box',
        label: 'Ammunition box',
        description: 'Thirty rounds for your firearms.',
        price: 60,
        effect: 'ammo',
      },
    ],
  },
  {
    id: 'hotel_monteleone',
    name: 'Hotel Monteleone',
    kind: 'hotel',
    subtitle: 'Lobby · front desk · rooms',
    description:
      'A grand hotel with a staffed desk, lobby seating and three usable guest rooms.',
    accent: '#eab308',
    x: -165,
    z: 1260,
    w: 30,
    d: 24,
    employeeName: 'Celeste Dupre',
    employeeTitle: 'Front desk',
    services: [
      {
        id: 'single_room',
        label: 'Rent a room',
        description: 'Restore health and stamina in a clean guest room.',
        price: 50,
        effect: 'hotel',
      },
      {
        id: 'late_checkout',
        label: 'Late checkout & bath',
        description: 'Full health, stamina and a fresh start at the hotel.',
        price: 85,
        effect: 'hotel',
      },
    ],
  },
  {
    id: 'nopd_eighth',
    name: 'Eighth District Police Station',
    kind: 'police',
    subtitle: 'Lobby · front desk · holding cells',
    description:
      'A staffed police station with a public lobby, report desk and holding area.',
    accent: '#38bdf8',
    x: 350,
    z: 1430,
    w: 27,
    d: 20,
    employeeName: 'Sergeant Landry',
    employeeTitle: 'Desk sergeant',
    services: [
      {
        id: 'pay_fine',
        label: 'Pay outstanding fine',
        description: 'Clear city heat and end an active pursuit.',
        price: 75,
        effect: 'police_fine',
      },
      {
        id: 'case_file',
        label: 'View city case board',
        description: 'Open the city network heat and pursuit records.',
        price: 0,
        effect: 'network',
      },
    ],
  },
  {
    id: 'creole_fuel',
    name: 'Creole Fuel & Service',
    kind: 'gas',
    subtitle: 'Fuel pumps · air · convenience counter',
    description:
      'A working gas station with lit pumps, a service counter and a repair bay.',
    accent: '#f97316',
    x: -310,
    z: 1430,
    w: 20,
    d: 14,
    employeeName: 'Tee-Jean Fontenot',
    employeeTitle: 'Station attendant',
    services: [
      {
        id: 'fill_tank',
        label: 'Fill active vehicle',
        description: 'Fill the tank of the vehicle you are currently driving.',
        price: 40,
        effect: 'refuel',
      },
      {
        id: 'repair_vehicle',
        label: 'Repair active vehicle',
        description: 'Restore the active vehicle to full hull integrity.',
        price: 65,
        effect: 'repair',
      },
    ],
  },
  {
    id: 'bayou_brew',
    name: 'Bayou Brew House',
    kind: 'bar',
    subtitle: 'Live music · bar counter · back tables',
    description:
      'A dim neighborhood bar with a long counter, tables and a small band stage.',
    accent: '#a855f7',
    x: -270,
    z: 1540,
    w: 22,
    d: 16,
    employeeName: 'Remy LeBlanc',
    employeeTitle: 'Bartender',
    services: [
      {
        id: 'house_drink',
        label: 'House drink',
        description: 'Restores thirst and a little stamina.',
        price: 12,
        effect: 'drink',
      },
      {
        id: 'live_set',
        label: 'Cover charge · live set',
        description: 'Catch the band and restore stamina.',
        price: 20,
        effect: 'music',
      },
    ],
  },
  {
    id: 'creole_bank',
    name: 'Creole Savings & Loan',
    kind: 'bank',
    subtitle: 'Teller windows · safe deposit',
    description:
      'A marble-floored bank with teller windows and an exchange counter.',
    accent: '#facc15',
    x: 170,
    z: 1510,
    w: 21,
    d: 16,
    employeeName: 'Odette Marchand',
    employeeTitle: 'Teller',
    services: [
      {
        id: 'emerald_exchange',
        label: 'Exchange an emerald',
        description: 'Trade one emerald for 160 coins.',
        price: 0,
        effect: 'bank_exchange',
      },
      {
        id: 'vault_network',
        label: 'Safe deposit network',
        description: 'Open the city network safehouse and vault ledger.',
        price: 0,
        effect: 'network',
      },
    ],
  },
  {
    id: 'crescent_music_hall',
    name: 'Crescent Music Hall',
    kind: 'music',
    subtitle: 'Box office · stage · record wall',
    description:
      'A working music hall with a box office, stage and listening room.',
    accent: '#ec4899',
    x: -60,
    z: 1245,
    w: 28,
    d: 20,
    employeeName: 'Ivory Baptiste',
    employeeTitle: 'Box office',
    services: [
      {
        id: 'show_ticket',
        label: 'Show ticket',
        description: 'A live set that restores stamina and lifts your spirits.',
        price: 30,
        effect: 'music',
      },
      {
        id: 'band_merch',
        label: 'Browse stage outfits',
        description: 'Open the mainland outfitter catalog.',
        price: 0,
        effect: 'outfitter_menu',
      },
    ],
  },
  {
    id: 'beignet_stand',
    name: 'Cafe du Monde Corner',
    kind: 'cafe',
    subtitle: 'Coffee · beignets · street window',
    description:
      'A small cafe with a service window, coffee bar and powder-sugar counter.',
    accent: '#fbbf24',
    x: 165,
    z: 1235,
    w: 17,
    d: 13,
    employeeName: 'Marcel Arceneaux',
    employeeTitle: 'Coffee counter',
    services: [
      {
        id: 'cafe_au_lait',
        label: 'Cafe au lait',
        description: 'Restores thirst and stamina.',
        price: 8,
        effect: 'coffee',
      },
      {
        id: 'beignets',
        label: 'Bag of beignets',
        description: 'Restores hunger and health.',
        price: 14,
        effect: 'meal',
      },
    ],
  },
  {
    id: 'river_parish_outfitters',
    name: 'River Parish Outfitters',
    kind: 'outfitter',
    subtitle: 'Workwear · boots · street fits',
    description:
      'A clothing store with racks, a fitting room and a working counter.',
    accent: '#84cc16',
    x: -300,
    z: 1310,
    w: 21,
    d: 16,
    employeeName: 'Nadine Prejean',
    employeeTitle: 'Outfitter',
    services: [
      {
        id: 'outfit_catalog',
        label: 'Browse outfits',
        description: 'Open the mainland outfit catalog.',
        price: 0,
        effect: 'outfitter_menu',
      },
      {
        id: 'work_boots',
        label: 'Waterproof work boots',
        description: 'Restore stamina and prepare for the marsh.',
        price: 24,
        effect: 'coffee',
      },
    ],
  },
  {
    id: 'parish_auto_parts',
    name: 'Parish Auto Parts',
    kind: 'auto_parts',
    subtitle: 'Parts counter · lift bay · paint desk',
    description:
      'A working parts store and service bay for hydraulics, paint and repairs.',
    accent: '#06b6d4',
    x: 210,
    z: 1580,
    w: 24,
    d: 18,
    employeeName: 'Curtis "Curt" Hollis',
    employeeTitle: 'Parts counter',
    services: [
      {
        id: 'repair_bay',
        label: 'Repair active vehicle',
        description: 'Restore the active vehicle to full hull integrity.',
        price: 55,
        effect: 'repair',
      },
      {
        id: 'parts_catalog',
        label: 'Browse garage packages',
        description: 'Open the Bayou Customs garage catalog.',
        price: 0,
        effect: 'garage_menu',
      },
    ],
  },
  {
    id: 'riverbend_grocery',
    name: 'Riverbend Grocery',
    kind: 'store',
    subtitle: 'Neighborhood grocery · cold cases',
    description:
      'A neighborhood grocery with produce bins, cold cases and a checkout lane.',
    accent: '#4ade80',
    x: -40,
    z: 1550,
    w: 25,
    d: 18,
    employeeName: 'Elise Chenet',
    employeeTitle: 'Cashier',
    services: [
      {
        id: 'river_grocery_bag',
        label: 'River grocery bag',
        description: 'Two roasted meals and two filtered waters.',
        price: 30,
        effect: 'groceries',
      },
      {
        id: 'cold_drink',
        label: 'Cold bottled water',
        description: 'Restores thirst.',
        price: 6,
        effect: 'drink',
      },
    ],
  },
  {
    id: 'east_bank_terminal',
    name: 'East Bank City Terminal',
    kind: 'terminal',
    subtitle: 'Streetcar network · jobs · fast travel',
    description:
      'A working city terminal on the east bank with a full network board.',
    accent: '#38bdf8',
    x: 375,
    z: 1515,
    w: 18,
    d: 12,
    employeeName: 'Transit Clerk',
    employeeTitle: 'Network desk',
    services: [
      {
        id: 'city_network',
        label: 'Open city network',
        description: 'Jobs, fast travel, property market and transit.',
        price: 0,
        effect: 'network',
      },
    ],
  },
];

const BUSINESS_BY_ID = new Map(MAINLAND_BUSINESSES.map((business) => [business.id, business]));

export function getMainlandBusinessById(id: string): MainlandBusiness | undefined {
  return BUSINESS_BY_ID.get(id);
}

export function getMainlandBusinessService(
  business: MainlandBusiness,
  serviceId: string,
): MainlandBusinessService | undefined {
  return business.services.find((service) => service.id === serviceId);
}

export function isInsideMainlandBusiness(
  business: MainlandBusiness,
  x: number,
  z: number,
): boolean {
  return (
    Math.abs(x - business.x) <= business.w * 0.5 - 0.25 &&
    Math.abs(z - business.z) <= business.d * 0.5 - 0.25
  );
}

/** Walkable raised floor inside every enterable business. */
export function getMainlandBusinessFloorY(
  x: number,
  z: number,
  footY: number,
): number {
  for (let i = 0; i < MAINLAND_BUSINESSES.length; i++) {
    const business = MAINLAND_BUSINESSES[i];
    if (!isInsideMainlandBusiness(business, x, z)) continue;
    const floorY = LOUISIANA_CITY_GROUND_Y + 0.1;
    if (footY >= floorY - 1.35) return floorY;
  }
  return -9999;
}

export function getMainlandBusinessServicePoints(
  business: MainlandBusiness,
): readonly { x: number; z: number; label: string }[] {
  if (business.kind === 'hotel') {
    return [
      { x: business.x, z: business.z + business.d * 0.5 - 2.2, label: 'front desk' },
      { x: business.x - business.w * 0.24, z: business.z - business.d * 0.22, label: 'guest room' },
      { x: business.x + business.w * 0.24, z: business.z - business.d * 0.22, label: 'guest room' },
    ];
  }
  if (business.kind === 'gas') {
    return [
      { x: business.x - 5, z: business.z + business.d * 0.5 + 3.0, label: 'pump' },
      { x: business.x + 5, z: business.z + business.d * 0.5 + 3.0, label: 'pump' },
      { x: business.x, z: business.z + business.d * 0.5 - 1.6, label: 'service counter' },
    ];
  }
  return [
    {
      x: business.x,
      z: business.z + business.d * 0.5 - 1.8,
      label: 'service counter',
    },
  ];
}
