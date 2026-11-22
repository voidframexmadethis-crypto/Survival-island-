import type { ItemId } from '../types';

/**
 * Louisiana mainland gameplay layer for Crescent City.
 *
 * The mainland deliberately reuses the island's existing vehicle profiles,
 * survival simulation, weather, combat and portal systems. This module owns the
 * city-specific rules: street heat/pursuits, garage culture builds, safehouses,
 * property income, transit, outfits/loadouts and cross-world milestones.
 *
 * update() is allocation-free: it mutates numeric counters only and never
 * creates arrays, maps or objects inside the per-frame path.
 */

export type MainlandTab =
  | 'district'
  | 'garage'
  | 'heat'
  | 'safehouse'
  | 'market'
  | 'transit'
  | 'outfitter'
  | 'challenges';

export type MainlandPropertyId =
  | 'magazine_safehouse'
  | 'bayou_customs'
  | 'riverfront_dock'
  | 'vault_locker';

export type MainlandUpgradeId =
  | 'armory_bench'
  | 'stash_network'
  | 'bootlegger_map'
  | 'swamp_nav'
  | 'market_licenses'
  | 'kevlar_liners';

export type MainlandBuildId =
  | 'stock'
  | 'lowrider_64'
  | 'donk_box'
  | 'slab_swanger'
  | 'subwoofer_trunk';

export type MainlandOutfitId =
  | 'bayou_runner'
  | 'creole_king'
  | 'vault_raider'
  | 'storm_chaser'
  | 'island_legend';

export type MainlandFactionId = 'creole_kings' | 'bayou_mambo' | 'river_wardens';

export type MainlandChallengeMetric =
  | 'drift'
  | 'takedowns'
  | 'escapes'
  | 'properties'
  | 'vaults'
  | 'boatTrips'
  | 'bosses'
  | 'structures'
  | 'bloodMoons';

export interface MainlandProperty {
  id: MainlandPropertyId;
  name: string;
  subtitle: string;
  description: string;
  price: number;
  dailyIncome: number;
  stashSlots: number;
  x: number;
  z: number;
  accent: string;
}

export interface MainlandUpgrade {
  id: MainlandUpgradeId;
  name: string;
  subtitle: string;
  description: string;
  price: number;
  accent: string;
}

export interface MainlandGaragePackage {
  id: MainlandBuildId;
  name: string;
  subtitle: string;
  description: string;
  price: number;
  paintColor?: string;
  rimColor?: string;
  underglowColor?: string;
  underglowEnabled?: boolean;
  suspensionOffset?: number;
  wheelScale?: number;
  hydraulicHop?: boolean;
  airbagSuspension?: boolean;
  trunkBassEnabled?: boolean;
  turboBoost?: number;
  horsepowerBonus?: number;
  topSpeedBonus?: number;
  accent: string;
}

export interface MainlandOutfitPreset {
  id: MainlandOutfitId;
  name: string;
  subtitle: string;
  jacketHex: string;
  pantsHex: string;
  hotbar: ItemId[];
  accent: string;
}

export interface MainlandChallenge {
  id: string;
  name: string;
  description: string;
  metric: MainlandChallengeMetric;
  target: number;
  rewardCoins: number;
  accent: string;
}

export interface MainlandFaction {
  id: MainlandFactionId;
  name: string;
  territory: string;
  description: string;
  accent: string;
}

export interface MainlandFastTravelPoint {
  id: string;
  name: string;
  subtitle: string;
  region: 'mainland' | 'island';
  teleportKey: string;
  x: number;
  z: number;
  unlockedByDefault: boolean;
  accent: string;
}

export interface MainlandChallengeHudState {
  id: string;
  name: string;
  description: string;
  progress: number;
  target: number;
  complete: boolean;
  claimed: boolean;
  rewardCoins: number;
  accent: string;
}

export interface MainlandFactionHudState {
  id: MainlandFactionId;
  name: string;
  territory: string;
  reputation: number;
  tier: string;
  accent: string;
}

export interface MainlandHudState {
  heat: number;
  pursuitActive: boolean;
  pursuitSeconds: number;
  escapeProgress: number;
  pursuitUnits: number;
  bustedCount: number;
  takedowns: number;
  escapes: number;
  ownedProperties: MainlandPropertyId[];
  activeSafehouse: MainlandPropertyId | null;
  incomeReady: number;
  ownedUpgrades: MainlandUpgradeId[];
  ownedPackages: MainlandBuildId[];
  equippedPackage: MainlandBuildId;
  unlockedPoints: string[];
  activeOutfit: MainlandOutfitId;
  driftScore: number;
  bestDrift: number;
  cityKilometers: number;
  boatTrips: number;
  vaultsLooted: number;
  factionReputation: MainlandFactionHudState[];
  challenges: MainlandChallengeHudState[];
  claimedChallengeCount: number;
  totalChallengeCount: number;
  safehouseSuppliesReady: boolean;
  crossWorldBosses: number;
  crossWorldStructures: number;
  crossWorldBloodMoons: number;
  cityTier: string;
}

export interface MainlandSaveState {
  heat: number;
  pursuitActive: boolean;
  pursuitSeconds: number;
  escapeProgress: number;
  pursuitUnits: number;
  bustedCount: number;
  takedowns: number;
  escapes: number;
  ownedProperties: MainlandPropertyId[];
  activeSafehouse: MainlandPropertyId | null;
  lastIncomeDay: number;
  lastSafehouseClaimDay: number;
  lastVaultLootDay: number;
  ownedUpgrades: MainlandUpgradeId[];
  ownedPackages: MainlandBuildId[];
  equippedPackage: MainlandBuildId;
  unlockedPoints: string[];
  activeOutfit: MainlandOutfitId;
  driftScore: number;
  bestDrift: number;
  cityKilometers: number;
  boatTrips: number;
  vaultsLooted: number;
  factionReputation: Partial<Record<MainlandFactionId, number>>;
  claimedChallenges: string[];
  crossWorldBosses: number;
  crossWorldStructures: number;
  crossWorldBloodMoons: number;
  totalEarned: number;
}

export interface MainlandActionResult {
  ok: boolean;
  message: string;
  coinsDelta?: number;
}

export interface MainlandIncomeResult {
  ok: boolean;
  amount: number;
  message: string;
}

export const MAINLAND_PROPERTIES: readonly MainlandProperty[] = [
  {
    id: 'magazine_safehouse',
    name: 'Magazine Street Safehouse',
    subtitle: 'Shotgun house · private reload bench',
    description:
      'Wraparound porch, stash locker and a weapon workbench. Lose police heat by breaking line of sight here.',
    price: 350,
    dailyIncome: 120,
    stashSlots: 8,
    x: 120,
    z: 390,
    accent: '#f59e0b',
  },
  {
    id: 'bayou_customs',
    name: 'Bayou Customs Garage',
    subtitle: 'Hydraulics · DONK · SLAB bays',
    description:
      'Three tuning bays for lowrider hydraulics, box Chevy DONKs, swanger SLABs and subwoofer trunks.',
    price: 550,
    dailyIncome: 165,
    stashSlots: 6,
    x: 34,
    z: 390,
    accent: '#38bdf8',
  },
  {
    id: 'riverfront_dock',
    name: 'Riverfront Dock Lease',
    subtitle: 'Airboat mooring · river freight',
    description:
      'A working dock on the bayou with airboat transit and a smuggler market that beats city prices.',
    price: 500,
    dailyIncome: 140,
    stashSlots: 10,
    x: -40,
    z: 500,
    accent: '#22d3ee',
  },
  {
    id: 'vault_locker',
    name: 'Tunnel Vault Locker',
    subtitle: 'Hidden bunker · high-tier stash',
    description:
      'A decommissioned flood bunker beneath the parking garage. Deep stash, clean escape tunnel.',
    price: 900,
    dailyIncome: 240,
    stashSlots: 16,
    x: 120,
    z: 468,
    accent: '#a78bfa',
  },
];

export const MAINLAND_UPGRADES: readonly MainlandUpgrade[] = [
  {
    id: 'armory_bench',
    name: 'Street Armorer Bench',
    subtitle: 'Faster reloads · free daily ammunition',
    description: 'A proper vise and torque wrench at every safehouse cuts reload time by 12%.',
    price: 650,
    accent: '#f97316',
  },
  {
    id: 'stash_network',
    name: 'Stash Network',
    subtitle: '+8 stash slots per owned property',
    description: 'Courier drop boxes link every safehouse into one shared inventory locker.',
    price: 800,
    accent: '#22c55e',
  },
  {
    id: 'bootlegger_map',
    name: 'Bootlegger Map',
    subtitle: 'Reveals all mainland fast-travel points',
    description: 'Hand-drawn shortcuts through the bayou, city blocks and flood tunnels.',
    price: 550,
    accent: '#eab308',
  },
  {
    id: 'swamp_nav',
    name: 'Swamp Navigator',
    subtitle: 'Unlocks airboat transit to the island',
    description: 'A shallow-draft route across the marsh and open water straight to the island.',
    price: 700,
    accent: '#06b6d4',
  },
  {
    id: 'market_licenses',
    name: 'Market Licenses',
    subtitle: '+25% property income · better shop prices',
    description: 'Legal storefronts and a street vendor permit turn the city into steady income.',
    price: 950,
    accent: '#facc15',
  },
  {
    id: 'kevlar_liners',
    name: 'Kevlar Liners',
    subtitle: '+20 maximum health',
    description: 'Concealed plates sewn into every outfit. Survive a takedown or a bad alley.',
    price: 850,
    accent: '#ef4444',
  },
];

export const MAINLAND_GARAGE_PACKAGES: readonly MainlandGaragePackage[] = [
  {
    id: 'stock',
    name: 'Factory Street Trim',
    subtitle: 'Stock height · clean daily driver',
    description: 'Reset the vehicle to a neutral ride height with no hydraulic or bass hardware.',
    price: 0,
    accent: '#94a3b8',
  },
  {
    id: 'lowrider_64',
    name: "1964 Impala Lowrider",
    subtitle: 'Four-corner hydraulics · candy paint',
    description:
      'Classic lowrider stance with four-corner hydraulic hops, a candy purple respray and chrome rims.',
    price: 650,
    paintColor: '#7e22ce',
    rimColor: '#f8fafc',
    underglowColor: '#c084fc',
    underglowEnabled: true,
    suspensionOffset: -0.16,
    wheelScale: 0.86,
    hydraulicHop: true,
    accent: '#c084fc',
  },
  {
    id: 'donk_box',
    name: 'Box Chevy DONK',
    subtitle: '30" rims · high-lift stance',
    description:
      'Lifted box Chevy with oversized rims, hydraulic lift and a hard-hitting trunk build.',
    price: 800,
    paintColor: '#0284c7',
    rimColor: '#e2e8f0',
    underglowColor: '#38bdf8',
    underglowEnabled: true,
    suspensionOffset: 0.44,
    wheelScale: 1.28,
    hydraulicHop: true,
    airbagSuspension: true,
    trunkBassEnabled: true,
    turboBoost: 1.12,
    accent: '#38bdf8',
  },
  {
    id: 'slab_swanger',
    name: 'Houston Candy SLAB',
    subtitle: 'Swangers · candy paint · neon glow',
    description:
      'A slab build with swanger-style rims, candy paint, underglow and a chest-thumping system.',
    price: 900,
    paintColor: '#9f1239',
    rimColor: '#f8fafc',
    underglowColor: '#e879f9',
    underglowEnabled: true,
    suspensionOffset: -0.12,
    wheelScale: 0.92,
    hydraulicHop: true,
    trunkBassEnabled: true,
    topSpeedBonus: 4,
    accent: '#f472b6',
  },
  {
    id: 'subwoofer_trunk',
    name: 'Subwoofer Trunk Build',
    subtitle: 'Competition bass · reinforced chassis',
    description:
      'A full subwoofer wall and reinforced trunk. Heavy, loud and built for the boulevard cruise.',
    price: 1200,
    paintColor: '#1e293b',
    rimColor: '#facc15',
    underglowColor: '#38bdf8',
    underglowEnabled: true,
    suspensionOffset: -0.08,
    wheelScale: 0.96,
    trunkBassEnabled: true,
    turboBoost: 1.18,
    horsepowerBonus: 35,
    accent: '#fbbf24',
  },
];

export const MAINLAND_OUTFITS: readonly MainlandOutfitPreset[] = [
  {
    id: 'bayou_runner',
    name: 'Bayou Runner',
    subtitle: 'Waders · knife · water · campfire',
    jacketHex: '#166534',
    pantsHex: '#292524',
    hotbar: ['hunting_knife', 'stone_axe', 'filtered_water_bottle', 'campfire'],
    accent: '#22c55e',
  },
  {
    id: 'creole_king',
    name: 'Creole King',
    subtitle: 'Purple suit · pistol · street credentials',
    jacketHex: '#6b21a8',
    pantsHex: '#1c1917',
    hotbar: ['glock_19', 'hunting_knife', 'filtered_water_bottle', 'campfire'],
    accent: '#c084fc',
  },
  {
    id: 'vault_raider',
    name: 'Vault Raider',
    subtitle: 'Black tactical · rifle · breaching tools',
    jacketHex: '#0f172a',
    pantsHex: '#334155',
    hotbar: ['m4a1', 'stone_pickaxe', 'hunting_knife', 'filtered_water_bottle'],
    accent: '#38bdf8',
  },
  {
    id: 'storm_chaser',
    name: 'Storm Chaser',
    subtitle: 'Hi-vis rain shell · shotgun · field kit',
    jacketHex: '#ca8a04',
    pantsHex: '#1f2937',
    hotbar: ['remington_870', 'stone_axe', 'filtered_water_bottle', 'campfire'],
    accent: '#facc15',
  },
  {
    id: 'island_legend',
    name: 'Island Legend',
    subtitle: 'Gilded expedition kit · full loadout',
    jacketHex: '#b45309',
    pantsHex: '#134e4a',
    hotbar: ['m4a1', 'glock_19', 'hunting_knife', 'stone_pickaxe'],
    accent: '#fbbf24',
  },
];

export const MAINLAND_CHALLENGES: readonly MainlandChallenge[] = [
  {
    id: 'bourbon_burnout',
    name: 'Bourbon Burnout',
    description: 'Bank 2,500 drift score on the city blocks and highway ramps.',
    metric: 'drift',
    target: 2500,
    rewardCoins: 300,
    accent: '#f97316',
  },
  {
    id: 'heat_wave',
    name: 'Heat Wave',
    description: 'Complete 3 high-speed pursuits without getting busted.',
    metric: 'escapes',
    target: 3,
    rewardCoins: 350,
    accent: '#ef4444',
  },
  {
    id: 'street_justice',
    name: 'Street Justice',
    description: 'Land 5 dynamic takedowns on pursuing units.',
    metric: 'takedowns',
    target: 5,
    rewardCoins: 400,
    accent: '#facc15',
  },
  {
    id: 'landlord',
    name: 'Crescent City Landlord',
    description: 'Own all four mainland properties.',
    metric: 'properties',
    target: 4,
    rewardCoins: 750,
    accent: '#22c55e',
  },
  {
    id: 'vault_circuit',
    name: 'Vault Circuit',
    description: 'Loot 3 hidden tunnel vaults.',
    metric: 'vaults',
    target: 3,
    rewardCoins: 450,
    accent: '#a78bfa',
  },
  {
    id: 'airboat_ace',
    name: 'Airboat Ace',
    description: 'Make 2 airboat crossings between the city and the island.',
    metric: 'boatTrips',
    target: 2,
    rewardCoins: 300,
    accent: '#06b6d4',
  },
  {
    id: 'island_hunter',
    name: 'Island Hunter',
    description: 'Defeat 2 island bosses while the mainland is active.',
    metric: 'bosses',
    target: 2,
    rewardCoins: 900,
    accent: '#f43f5e',
  },
  {
    id: 'master_builder',
    name: 'Master Builder',
    description: 'Place 25 structures across the island or mainland.',
    metric: 'structures',
    target: 25,
    rewardCoins: 500,
    accent: '#eab308',
  },
  {
    id: 'blood_moon_regular',
    name: 'Blood Moon Regular',
    description: 'Survive 2 blood moons.',
    metric: 'bloodMoons',
    target: 2,
    rewardCoins: 650,
    accent: '#dc2626',
  },
];

export const MAINLAND_FACTIONS: readonly MainlandFaction[] = [
  {
    id: 'creole_kings',
    name: 'Creole Kings',
    territory: 'French Quarter',
    description: 'Old-money car club and bootlegging family. They pay for clean drift runs.',
    accent: '#a855f7',
  },
  {
    id: 'bayou_mambo',
    name: 'Bayou Mambo',
    territory: 'Cypress Marsh',
    description: 'Swamp guides and root workers. They know every tunnel and hidden dock.',
    accent: '#22c55e',
  },
  {
    id: 'river_wardens',
    name: 'River Wardens',
    territory: 'Flood Wall',
    description: 'Ex-cops running the riverfront. They trade protection for takedowns.',
    accent: '#38bdf8',
  },
];

export const MAINLAND_FAST_TRAVEL: readonly MainlandFastTravelPoint[] = [
  {
    id: 'crescent_terminal',
    name: 'Crescent City Terminal',
    subtitle: 'Streetcar stop · jobs board',
    region: 'mainland',
    teleportKey: 'crescent city',
    x: 72,
    z: 500,
    unlockedByDefault: true,
    accent: '#facc15',
  },
  {
    id: 'bayou_customs',
    name: 'Bayou Customs Garage',
    subtitle: 'Hydraulics · DONK · SLAB bays',
    region: 'mainland',
    teleportKey: 'bayou customs',
    x: 34,
    z: 390,
    unlockedByDefault: true,
    accent: '#38bdf8',
  },
  {
    id: 'magazine_safehouse',
    name: 'Magazine Street Safehouse',
    subtitle: 'Stash locker · workbench',
    region: 'mainland',
    teleportKey: 'magazine street',
    x: 120,
    z: 390,
    unlockedByDefault: false,
    accent: '#f59e0b',
  },
  {
    id: 'riverfront_dock',
    name: 'Riverfront Dock',
    subtitle: 'Airboat mooring · smuggler market',
    region: 'mainland',
    teleportKey: 'riverfront dock',
    x: -40,
    z: 500,
    unlockedByDefault: false,
    accent: '#22d3ee',
  },
  {
    id: 'vault_locker',
    name: 'Tunnel Vault Locker',
    subtitle: 'Hidden bunker · high-tier stash',
    region: 'mainland',
    teleportKey: 'vault locker',
    x: 120,
    z: 468,
    unlockedByDefault: false,
    accent: '#a78bfa',
  },
  {
    id: 'island_landing',
    name: 'Island Landing',
    subtitle: 'South beach · shipwreck shore',
    region: 'island',
    teleportKey: 'spawn',
    x: 0,
    z: 680,
    unlockedByDefault: true,
    accent: '#fbbf24',
  },
];

export const MAINLAND_LOCATION = {
  centerX: 72,
  centerZ: 430,
  radius: 190,
} as const;

const PROPERTY_BY_ID = new Map(MAINLAND_PROPERTIES.map((p) => [p.id, p]));
const UPGRADE_BY_ID = new Map(MAINLAND_UPGRADES.map((u) => [u.id, u]));
const PACKAGE_BY_ID = new Map(MAINLAND_GARAGE_PACKAGES.map((p) => [p.id, p]));
const OUTFIT_BY_ID = new Map(MAINLAND_OUTFITS.map((o) => [o.id, o]));
const CHALLENGE_BY_ID = new Map(MAINLAND_CHALLENGES.map((c) => [c.id, c]));
const FACTION_BY_ID = new Map(MAINLAND_FACTIONS.map((f) => [f.id, f]));

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

function getReputationTier(reputation: number): string {
  if (reputation >= 24) return 'Kingpin';
  if (reputation >= 15) return 'Trusted';
  if (reputation >= 8) return 'Known';
  return 'Unknown';
}

function getCityTier(properties: number, claimedChallenges: number, bestDrift: number): string {
  if (properties >= 4 && claimedChallenges >= 7 && bestDrift >= 2500) return 'Crescent City Legend';
  if (properties >= 3) return 'King of the Blocks';
  if (properties >= 1 || claimedChallenges >= 2) return 'Street Player';
  return 'New in Town';
}

export class LouisianaMainlandSystem {
  heat = 0;
  pursuitActive = false;
  pursuitSeconds = 0;
  escapeProgress = 0;
  pursuitUnits = 0;
  bustedCount = 0;
  takedowns = 0;
  escapes = 0;
  ownedProperties: MainlandPropertyId[] = [];
  activeSafehouse: MainlandPropertyId | null = null;
  lastIncomeDay = 0;
  lastSafehouseClaimDay = 0;
  lastVaultLootDay = 0;
  ownedUpgrades: MainlandUpgradeId[] = [];
  ownedPackages: MainlandBuildId[] = ['stock'];
  equippedPackage: MainlandBuildId = 'stock';
  unlockedPoints: string[] = MAINLAND_FAST_TRAVEL.filter((p) => p.unlockedByDefault).map(
    (p) => p.id,
  );
  activeOutfit: MainlandOutfitId = 'bayou_runner';
  driftScore = 0;
  bestDrift = 0;
  cityKilometers = 0;
  boatTrips = 0;
  vaultsLooted = 0;
  factionReputation: Record<MainlandFactionId, number> = {
    creole_kings: 0,
    bayou_mambo: 0,
    river_wardens: 0,
  };
  claimedChallenges: string[] = [];
  crossWorldBosses = 0;
  crossWorldStructures = 0;
  crossWorldBloodMoons = 0;
  totalEarned = 0;

  private heatCooldown = 0;
  private bustTimer = 0;
  private lastPursuitSuccessCooldown = 0;
  private factionJobCooldown = 0;

  reset(): void {
    this.heat = 0;
    this.pursuitActive = false;
    this.pursuitSeconds = 0;
    this.escapeProgress = 0;
    this.pursuitUnits = 0;
    this.bustedCount = 0;
    this.takedowns = 0;
    this.escapes = 0;
    this.ownedProperties = [];
    this.activeSafehouse = null;
    this.lastIncomeDay = 0;
    this.lastSafehouseClaimDay = 0;
    this.lastVaultLootDay = 0;
    this.ownedUpgrades = [];
    this.ownedPackages = ['stock'];
    this.equippedPackage = 'stock';
    this.unlockedPoints = MAINLAND_FAST_TRAVEL.filter((p) => p.unlockedByDefault).map(
      (p) => p.id,
    );
    this.activeOutfit = 'bayou_runner';
    this.driftScore = 0;
    this.bestDrift = 0;
    this.cityKilometers = 0;
    this.boatTrips = 0;
    this.vaultsLooted = 0;
    this.factionReputation = { creole_kings: 0, bayou_mambo: 0, river_wardens: 0 };
    this.claimedChallenges = [];
    this.crossWorldBosses = 0;
    this.crossWorldStructures = 0;
    this.crossWorldBloodMoons = 0;
    this.totalEarned = 0;
    this.heatCooldown = 0;
    this.bustTimer = 0;
    this.lastPursuitSuccessCooldown = 0;
    this.factionJobCooldown = 0;
  }

  serialize(): MainlandSaveState {
    return {
      heat: this.heat,
      pursuitActive: this.pursuitActive,
      pursuitSeconds: this.pursuitSeconds,
      escapeProgress: this.escapeProgress,
      pursuitUnits: this.pursuitUnits,
      bustedCount: this.bustedCount,
      takedowns: this.takedowns,
      escapes: this.escapes,
      ownedProperties: this.ownedProperties.slice(),
      activeSafehouse: this.activeSafehouse,
      lastIncomeDay: this.lastIncomeDay,
      lastSafehouseClaimDay: this.lastSafehouseClaimDay,
      lastVaultLootDay: this.lastVaultLootDay,
      ownedUpgrades: this.ownedUpgrades.slice(),
      ownedPackages: this.ownedPackages.slice(),
      equippedPackage: this.equippedPackage,
      unlockedPoints: this.unlockedPoints.slice(),
      activeOutfit: this.activeOutfit,
      driftScore: this.driftScore,
      bestDrift: this.bestDrift,
      cityKilometers: this.cityKilometers,
      boatTrips: this.boatTrips,
      vaultsLooted: this.vaultsLooted,
      factionReputation: { ...this.factionReputation },
      claimedChallenges: this.claimedChallenges.slice(),
      crossWorldBosses: this.crossWorldBosses,
      crossWorldStructures: this.crossWorldStructures,
      crossWorldBloodMoons: this.crossWorldBloodMoons,
      totalEarned: this.totalEarned,
    };
  }

  hydrate(save: MainlandSaveState | undefined | null): void {
    this.reset();
    if (!save) return;
    this.heat = clamp(save.heat || 0, 0, 5);
    this.pursuitActive = Boolean(save.pursuitActive);
    this.pursuitSeconds = Math.max(0, save.pursuitSeconds || 0);
    this.escapeProgress = clamp(save.escapeProgress || 0, 0, 100);
    this.pursuitUnits = Math.max(0, save.pursuitUnits || 0);
    this.bustedCount = Math.max(0, save.bustedCount || 0);
    this.takedowns = Math.max(0, save.takedowns || 0);
    this.escapes = Math.max(0, save.escapes || 0);
    this.ownedProperties = (save.ownedProperties || []).filter((id) => PROPERTY_BY_ID.has(id));
    this.activeSafehouse =
      save.activeSafehouse && PROPERTY_BY_ID.has(save.activeSafehouse)
        ? save.activeSafehouse
        : this.ownedProperties[0] ?? null;
    this.lastIncomeDay = Math.max(0, save.lastIncomeDay || 0);
    this.lastSafehouseClaimDay = Math.max(0, save.lastSafehouseClaimDay || 0);
    this.lastVaultLootDay = Math.max(0, save.lastVaultLootDay || 0);
    this.ownedUpgrades = (save.ownedUpgrades || []).filter((id) => UPGRADE_BY_ID.has(id));
    const packages = (save.ownedPackages || []).filter((id) => PACKAGE_BY_ID.has(id));
    this.ownedPackages = packages.includes('stock') ? packages : ['stock', ...packages];
    this.equippedPackage = PACKAGE_BY_ID.has(save.equippedPackage)
      ? save.equippedPackage
      : 'stock';
    const points = (save.unlockedPoints || []).filter((id) =>
      MAINLAND_FAST_TRAVEL.some((p) => p.id === id),
    );
    this.unlockedPoints = points.includes('crescent_terminal')
      ? points
      : ['crescent_terminal', ...points];
    this.activeOutfit = OUTFIT_BY_ID.has(save.activeOutfit)
      ? save.activeOutfit
      : 'bayou_runner';
    this.driftScore = Math.max(0, save.driftScore || 0);
    this.bestDrift = Math.max(this.driftScore, save.bestDrift || 0);
    this.cityKilometers = Math.max(0, save.cityKilometers || 0);
    this.boatTrips = Math.max(0, save.boatTrips || 0);
    this.vaultsLooted = Math.max(0, save.vaultsLooted || 0);
    this.factionReputation = {
      creole_kings: Math.max(0, save.factionReputation?.creole_kings || 0),
      bayou_mambo: Math.max(0, save.factionReputation?.bayou_mambo || 0),
      river_wardens: Math.max(0, save.factionReputation?.river_wardens || 0),
    };
    this.claimedChallenges = (save.claimedChallenges || []).filter((id) =>
      CHALLENGE_BY_ID.has(id),
    );
    this.crossWorldBosses = Math.max(0, save.crossWorldBosses || 0);
    this.crossWorldStructures = Math.max(0, save.crossWorldStructures || 0);
    this.crossWorldBloodMoons = Math.max(0, save.crossWorldBloodMoons || 0);
    this.totalEarned = Math.max(0, save.totalEarned || 0);
  }

  /**
   * Per-frame simulation. Allocation-free.
   * `driftMps` is the lateral slip speed of the active vehicle; the existing
   * vehicle physics already computes real drift, this only scores it.
   */
  update(
    rawDt: number,
    playerX: number,
    playerZ: number,
    speedKmh: number,
    driftMps: number,
    driving: boolean,
    dayCount: number,
  ): void {
    const dt = clamp(rawDt, 0, 0.05);
    if (dt <= 0) return;
    if (this.lastPursuitSuccessCooldown > 0) {
      this.lastPursuitSuccessCooldown = Math.max(0, this.lastPursuitSuccessCooldown - dt);
    }
    if (this.heatCooldown > 0) this.heatCooldown = Math.max(0, this.heatCooldown - dt);
    if (this.factionJobCooldown > 0) {
      this.factionJobCooldown = Math.max(0, this.factionJobCooldown - dt);
    }

    const dx = playerX - MAINLAND_LOCATION.centerX;
    const dz = playerZ - MAINLAND_LOCATION.centerZ;
    const inMainland = dx * dx + dz * dz <= MAINLAND_LOCATION.radius * MAINLAND_LOCATION.radius;
    const nearSafehouse = this.isNearOwnedSafehouse(playerX, playerZ);

    if (driving && speedKmh > 18) {
      this.cityKilometers += (speedKmh / 3600) * dt;
    }
    if (driving && driftMps > 3.2 && speedKmh > 28) {
      this.driftScore += driftMps * dt * 26;
      if (this.driftScore > this.bestDrift) this.bestDrift = this.driftScore;
    } else if (!driving && this.driftScore > 0) {
      this.driftScore = Math.max(0, this.driftScore - dt * 12);
    }

    if (!this.pursuitActive) {
      if (this.heat > 0 && this.heatCooldown <= 0 && inMainland) {
        this.heat = Math.max(0, this.heat - dt * 0.035);
      }
      return;
    }

    this.pursuitSeconds += dt;

    if (nearSafehouse && this.activeSafehouse) {
      this.escapeProgress = Math.min(100, this.escapeProgress + dt * 19);
      this.bustTimer = 0;
    } else if (speedKmh >= 62) {
      this.escapeProgress = Math.min(100, this.escapeProgress + dt * 3.2);
      this.bustTimer = 0;
    } else if (speedKmh <= 6) {
      this.bustTimer += dt;
      if (this.bustTimer >= 9) {
        this.failPursuit();
        return;
      }
    } else {
      this.escapeProgress = Math.min(100, this.escapeProgress + dt * 0.8);
      this.bustTimer = 0;
    }

    if (this.escapeProgress >= 100) {
      this.completePursuit();
    }
    void dayCount;
  }

  private isNearOwnedSafehouse(x: number, z: number): boolean {
    if (!this.activeSafehouse) return false;
    const property = PROPERTY_BY_ID.get(this.activeSafehouse);
    if (!property) return false;
    const dx = x - property.x;
    const dz = z - property.z;
    return dx * dx + dz * dz <= 16 * 16;
  }

  private failPursuit(): void {
    this.bustedCount += 1;
    this.pursuitActive = false;
    this.pursuitSeconds = 0;
    this.heat = 0;
    this.escapeProgress = 0;
    this.pursuitUnits = 0;
    this.bustTimer = 0;
    this.heatCooldown = 10;
  }

  private completePursuit(): void {
    this.escapes += 1;
    this.pursuitActive = false;
    this.pursuitSeconds = 0;
    this.heat = 0;
    this.escapeProgress = 0;
    this.pursuitUnits = 0;
    this.bustTimer = 0;
    this.heatCooldown = 14;
    this.lastPursuitSuccessCooldown = 1;
  }

  startPursuit(level: number): MainlandActionResult {
    const next = clamp(Math.round(level), 1, 5);
    if (this.pursuitActive) {
      this.heat = Math.max(this.heat, next);
    } else {
      this.heat = next;
    }
    this.pursuitActive = true;
    this.pursuitSeconds = 0;
    this.escapeProgress = 0;
    this.bustTimer = 0;
    this.pursuitUnits = Math.max(1, Math.round(this.heat) + 1);
    return {
      ok: true,
      message: `Heat ${Math.round(this.heat)} pursuit started. Break line of sight or hit the safehouse.`,
    };
  }

  attemptTakedown(speedKmh: number): MainlandActionResult {
    if (!this.pursuitActive) {
      return { ok: false, message: 'No active pursuit. Start a heat run first.' };
    }
    if (speedKmh < 28) {
      return { ok: false, message: 'Get above 28 km/h before attempting a PIT takedown.' };
    }
    if (this.lastPursuitSuccessCooldown > 0) {
      return { ok: false, message: 'The pursuit is still regrouping.' };
    }
    this.takedowns += 1;
    this.pursuitUnits = Math.max(0, this.pursuitUnits - 1);
    this.heat = Math.max(0, this.heat - 0.65);
    this.escapeProgress = Math.min(100, this.escapeProgress + 26);
    this.lastPursuitSuccessCooldown = 1.4;
    if (this.pursuitUnits <= 0 || this.escapeProgress >= 100) {
      this.completePursuit();
      return { ok: true, message: 'Takedown! Pursuit broken and heat cleared.' };
    }
    return {
      ok: true,
      message: `Takedown landed. ${this.pursuitUnits} unit(s) still on you.`,
    };
  }

  attemptEscape(): MainlandActionResult {
    if (!this.pursuitActive) {
      return { ok: false, message: 'No active pursuit.' };
    }
    this.escapeProgress = Math.min(100, this.escapeProgress + 22);
    if (this.escapeProgress >= 100) {
      this.completePursuit();
      return { ok: true, message: 'Escaped! You lost the units and cleared your heat.' };
    }
    return {
      ok: true,
      message: `Line of sight broken (${Math.round(this.escapeProgress)}%). Keep moving.`,
    };
  }

  clearHeat(): void {
    this.heat = 0;
    this.pursuitActive = false;
    this.pursuitSeconds = 0;
    this.escapeProgress = 0;
    this.pursuitUnits = 0;
    this.bustTimer = 0;
  }

  ownsProperty(id: MainlandPropertyId): boolean {
    return this.ownedProperties.includes(id);
  }

  purchaseProperty(id: MainlandPropertyId): MainlandActionResult {
    const property = PROPERTY_BY_ID.get(id);
    if (!property) return { ok: false, message: 'Unknown property.' };
    if (this.ownedProperties.includes(id)) {
      return { ok: false, message: `${property.name} is already yours.` };
    }
    this.ownedProperties.push(id);
    if (!this.activeSafehouse) this.activeSafehouse = id;
    if (!this.unlockedPoints.includes(id)) this.unlockedPoints.push(id);
    return {
      ok: true,
      message: `Deed signed: ${property.name}. +${property.dailyIncome} coins/day available.`,
      coinsDelta: -property.price,
    };
  }

  setActiveSafehouse(id: MainlandPropertyId): MainlandActionResult {
    if (!this.ownedProperties.includes(id)) {
      return { ok: false, message: 'You do not own that property yet.' };
    }
    this.activeSafehouse = id;
    const property = PROPERTY_BY_ID.get(id);
    return { ok: true, message: property ? `Active safehouse: ${property.name}.` : 'Safehouse set.' };
  }

  getIncomeReady(dayCount: number): number {
    if (this.ownedProperties.length === 0) return 0;
    if (dayCount <= this.lastIncomeDay) return 0;
    let total = 0;
    for (const id of this.ownedProperties) {
      const property = PROPERTY_BY_ID.get(id);
      if (property) total += property.dailyIncome;
    }
    if (this.hasUpgrade('market_licenses')) total = Math.round(total * 1.25);
    return total;
  }

  claimIncome(dayCount: number): MainlandIncomeResult {
    const amount = this.getIncomeReady(dayCount);
    if (amount <= 0) {
      return { ok: false, amount: 0, message: 'No property income ready. Come back next day.' };
    }
    this.lastIncomeDay = dayCount;
    this.totalEarned += amount;
    return { ok: true, amount, message: `Collected ${amount} coins from your properties.` };
  }

  buyUpgrade(id: MainlandUpgradeId): MainlandActionResult {
    const upgrade = UPGRADE_BY_ID.get(id);
    if (!upgrade) return { ok: false, message: 'Unknown upgrade.' };
    if (this.ownedUpgrades.includes(id)) {
      return { ok: false, message: `${upgrade.name} is already installed.` };
    }
    this.ownedUpgrades.push(id);
    if (id === 'bootlegger_map') {
      for (const point of MAINLAND_FAST_TRAVEL) {
        if (!this.unlockedPoints.includes(point.id)) this.unlockedPoints.push(point.id);
      }
    }
    return {
      ok: true,
      message: `${upgrade.name} installed.`,
      coinsDelta: -upgrade.price,
    };
  }

  hasUpgrade(id: MainlandUpgradeId): boolean {
    return this.ownedUpgrades.includes(id);
  }

  buyGaragePackage(id: MainlandBuildId): MainlandActionResult {
    const pkg = PACKAGE_BY_ID.get(id);
    if (!pkg) return { ok: false, message: 'Unknown garage build.' };
    const alreadyOwned = this.ownedPackages.includes(id);
    if (!alreadyOwned) this.ownedPackages.push(id);
    this.equippedPackage = id;
    return {
      ok: true,
      message: `${pkg.name} selected. Tuning parts are ready in the bay.`,
      coinsDelta: alreadyOwned ? 0 : -pkg.price,
    };
  }

  selectGaragePackage(id: MainlandBuildId): MainlandActionResult {
    const pkg = PACKAGE_BY_ID.get(id);
    if (!pkg) return { ok: false, message: 'Unknown garage build.' };
    if (!this.ownedPackages.includes(id)) {
      return { ok: false, message: `Buy the ${pkg.name} package first.` };
    }
    this.equippedPackage = id;
    return { ok: true, message: `${pkg.name} equipped.` };
  }

  recordBoatTrip(): void {
    this.boatTrips += 1;
  }

  recordVaultLoot(): void {
    this.vaultsLooted += 1;
  }

  claimVaultLoot(dayCount: number): MainlandActionResult {
    if (!this.ownedProperties.includes('vault_locker')) {
      return { ok: false, message: 'Buy the Tunnel Vault Locker to open the hidden cache.' };
    }
    if (dayCount <= this.lastVaultLootDay) {
      return { ok: false, message: 'The vault cache is empty. It restocks tomorrow.' };
    }
    this.lastVaultLootDay = dayCount;
    this.recordVaultLoot();
    return { ok: true, message: 'Flood tunnel vault cache opened.' };
  }

  claimSafehouseSupplies(dayCount: number): MainlandActionResult {
    if (!this.activeSafehouse) {
      return { ok: false, message: 'Own a safehouse to use the stash locker.' };
    }
    if (dayCount <= this.lastSafehouseClaimDay) {
      return { ok: false, message: 'Supplies already claimed today. Rest until tomorrow.' };
    }
    this.lastSafehouseClaimDay = dayCount;
    return {
      ok: true,
      message: 'Stash locker opened: ammunition, rations and a field medkit packed.',
    };
  }

  runFactionJob(id: MainlandFactionId): MainlandActionResult {
    const faction = FACTION_BY_ID.get(id);
    if (!faction) return { ok: false, message: 'Unknown faction.' };
    if (this.factionJobCooldown > 0) {
      return {
        ok: false,
        message: `${faction.name} is still setting up the next job (${Math.ceil(this.factionJobCooldown)}s).`,
      };
    }
    this.factionJobCooldown = 12;
    this.factionReputation[id] = (this.factionReputation[id] || 0) + 3;
    return {
      ok: true,
      message: `${faction.name} job complete · reputation ${this.factionReputation[id]}`,
      coinsDelta: 45,
    };
  }

  unlockPoint(id: string): void {
    if (!this.unlockedPoints.includes(id)) this.unlockedPoints.push(id);
  }

  isPointUnlocked(id: string): boolean {
    return this.unlockedPoints.includes(id);
  }

  setOutfit(id: MainlandOutfitId): MainlandActionResult {
    if (!OUTFIT_BY_ID.has(id)) return { ok: false, message: 'Unknown outfit.' };
    this.activeOutfit = id;
    return { ok: true, message: `Outfit switched: ${OUTFIT_BY_ID.get(id)?.name}.` };
  }

  getOutfit(id: MainlandOutfitId = this.activeOutfit): MainlandOutfitPreset {
    return OUTFIT_BY_ID.get(id) ?? MAINLAND_OUTFITS[0];
  }

  setCrossWorldProgress(bosses: number, structures: number, bloodMoons: number): void {
    this.crossWorldBosses = Math.max(0, Math.floor(bosses));
    this.crossWorldStructures = Math.max(0, Math.floor(structures));
    this.crossWorldBloodMoons = Math.max(0, Math.floor(bloodMoons));
  }

  private getChallengeProgress(challenge: MainlandChallenge): number {
    switch (challenge.metric) {
      case 'drift':
        return Math.floor(this.bestDrift);
      case 'takedowns':
        return this.takedowns;
      case 'escapes':
        return this.escapes;
      case 'properties':
        return this.ownedProperties.length;
      case 'vaults':
        return this.vaultsLooted;
      case 'boatTrips':
        return this.boatTrips;
      case 'bosses':
        return this.crossWorldBosses;
      case 'structures':
        return this.crossWorldStructures;
      case 'bloodMoons':
        return this.crossWorldBloodMoons;
      default:
        return 0;
    }
  }

  claimChallenge(id: string): MainlandActionResult {
    const challenge = CHALLENGE_BY_ID.get(id);
    if (!challenge) return { ok: false, message: 'Unknown challenge.' };
    if (this.claimedChallenges.includes(id)) {
      return { ok: false, message: 'Reward already claimed.' };
    }
    if (this.getChallengeProgress(challenge) < challenge.target) {
      return { ok: false, message: `${challenge.name} is not complete yet.` };
    }
    this.claimedChallenges.push(id);
    this.totalEarned += challenge.rewardCoins;
    return {
      ok: true,
      message: `${challenge.name} complete · +${challenge.rewardCoins} coins.`,
      coinsDelta: challenge.rewardCoins,
    };
  }

  getHudSnapshot(dayCount: number = this.lastIncomeDay + 1): MainlandHudState {
    const challenges: MainlandChallengeHudState[] = [];
    for (const challenge of MAINLAND_CHALLENGES) {
      const progress = this.getChallengeProgress(challenge);
      const complete = progress >= challenge.target;
      challenges.push({
        id: challenge.id,
        name: challenge.name,
        description: challenge.description,
        progress: Math.min(progress, challenge.target),
        target: challenge.target,
        complete,
        claimed: this.claimedChallenges.includes(challenge.id),
        rewardCoins: challenge.rewardCoins,
        accent: challenge.accent,
      });
    }
    const factions: MainlandFactionHudState[] = [];
    for (const faction of MAINLAND_FACTIONS) {
      const reputation = this.factionReputation[faction.id] || 0;
      factions.push({
        id: faction.id,
        name: faction.name,
        territory: faction.territory,
        reputation,
        tier: getReputationTier(reputation),
        accent: faction.accent,
      });
    }
    return {
      heat: Math.round(this.heat),
      pursuitActive: this.pursuitActive,
      pursuitSeconds: this.pursuitSeconds,
      escapeProgress: this.escapeProgress,
      pursuitUnits: this.pursuitUnits,
      bustedCount: this.bustedCount,
      takedowns: this.takedowns,
      escapes: this.escapes,
      ownedProperties: this.ownedProperties.slice(),
      activeSafehouse: this.activeSafehouse,
      incomeReady: this.getIncomeReady(dayCount),
      ownedUpgrades: this.ownedUpgrades.slice(),
      ownedPackages: this.ownedPackages.slice(),
      equippedPackage: this.equippedPackage,
      unlockedPoints: this.unlockedPoints.slice(),
      activeOutfit: this.activeOutfit,
      driftScore: this.driftScore,
      bestDrift: this.bestDrift,
      cityKilometers: this.cityKilometers,
      boatTrips: this.boatTrips,
      vaultsLooted: this.vaultsLooted,
      factionReputation: factions,
      challenges,
      claimedChallengeCount: this.claimedChallenges.length,
      totalChallengeCount: MAINLAND_CHALLENGES.length,
      safehouseSuppliesReady:
        Boolean(this.activeSafehouse) && dayCount > this.lastSafehouseClaimDay,
      crossWorldBosses: this.crossWorldBosses,
      crossWorldStructures: this.crossWorldStructures,
      crossWorldBloodMoons: this.crossWorldBloodMoons,
      cityTier: getCityTier(this.ownedProperties.length, this.claimedChallenges.length, this.bestDrift),
    };
  }
}
