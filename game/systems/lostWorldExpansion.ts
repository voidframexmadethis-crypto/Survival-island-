/* =========================================================
   SURVIVAL ISLAND: LOST WORLD — THE ULTIMATE WORLD EXPANSION
   One coordinated, persistent simulation layer for all 55 systems.
   The engine owns the world; this module owns expansion state,
   scheduling, economy, progression and disaster simulation.
   ========================================================= */

import type { CampStructureType, ItemId, PlayerVitals, WeatherType } from '../types';
import type { VehiclePresetKey } from './modularVehicle';
import { MAINLAND_BUSINESSES } from './louisianaBusinesses';

export const LOST_WORLD_STATE_VERSION = 2;
export const LOST_WORLD_LOG_LIMIT = 80;
export const LOST_WORLD_CHANGE_LIMIT = 80;

export type SeasonId = 'spring' | 'summer' | 'hurricane' | 'winter';
export type LostWorldTone = 'info' | 'good' | 'warning' | 'danger' | 'discovery';
export type LostWorldTab =
  | 'world'
  | 'survival'
  | 'wildlife'
  | 'city'
  | 'vehicles'
  | 'adventure'
  | 'people'
  | 'coop'
  | 'build'
  | 'disaster'
  | 'lost';

export const LOST_WORLD_TABS: { id: LostWorldTab; label: string }[] = [
  { id: 'world', label: 'Living World' },
  { id: 'survival', label: 'Survival' },
  { id: 'wildlife', label: 'Wildlife' },
  { id: 'city', label: 'Crescent City' },
  { id: 'vehicles', label: 'Car Culture' },
  { id: 'adventure', label: 'Adventures' },
  { id: 'people', label: 'People' },
  { id: 'coop', label: 'Co-op' },
  { id: 'build', label: 'Engineering' },
  { id: 'disaster', label: 'Disasters' },
  { id: 'lost', label: 'Lost World' },
];

export interface LostWorldLogEntry {
  id: string;
  day: number;
  text: string;
  tone: LostWorldTone;
}

export interface PersistentWorldChange {
  id: string;
  day: number;
  kind:
    | 'construction'
    | 'settlement'
    | 'discovery'
    | 'business'
    | 'restoration'
    | 'civilization'
    | 'recovery'
    | 'decision';
  label: string;
  x: number;
  z: number;
}

/* ------------------------------ Phase 1 ------------------------------ */

export interface NpcRoutineState {
  id: string;
  name: string;
  role: 'farmer' | 'merchant' | 'guard' | 'artisan' | 'fisher' | 'chef' | 'mechanic' | 'musician';
  region: 'island' | 'crescent_city';
  homeX: number;
  homeZ: number;
  workX: number;
  workZ: number;
  shopX: number;
  shopZ: number;
  socialX: number;
  socialZ: number;
  activity: 'sleeping' | 'commuting' | 'working' | 'shopping' | 'eating' | 'socializing' | 'home';
  x: number;
  z: number;
  trust: number;
  encounters: number;
  favors: number;
  conflicts: number;
  lastLine: string;
  personality: string;
}

export type WorldEventKind =
  | 'festival'
  | 'accident'
  | 'emergency'
  | 'storm'
  | 'discovery'
  | 'encounter';

export interface WorldEventState {
  id: string;
  defId: string;
  kind: WorldEventKind;
  title: string;
  description: string;
  region: 'island' | 'coast' | 'crescent_city';
  x: number;
  z: number;
  hoursLeft: number;
  resolved: boolean;
  rewardCoins: number;
  rewardItem?: ItemId;
  rewardQuantity?: number;
  trustDelta: number;
}

export interface WildlifeTerritoryState {
  id: string;
  species: string;
  displayName: string;
  centerX: number;
  centerZ: number;
  radius: number;
  aggression: number;
  population: number;
  seasonTargetX: number;
  seasonTargetZ: number;
  migrating: boolean;
  lastBattleDay: number;
  legendary: boolean;
}

export interface SeasonalState {
  id: SeasonId;
  index: number;
  dayInSeason: number;
  daysPerSeason: number;
  label: string;
}

export interface PersistentWorldState {
  changes: PersistentWorldChange[];
  settlementFounded: boolean;
  settlementName: string;
  settlementTier: number;
  totalDiscoveries: number;
}

/* ------------------------------ Phase 2 ------------------------------ */

export type ShelterKind =
  | 'cabin'
  | 'watchtower'
  | 'bridge'
  | 'workshop'
  | 'foundation'
  | 'underground_shelter'
  | 'treehouse';

export interface ShelterProject {
  id: string;
  kind: ShelterKind;
  label: string;
  x: number;
  z: number;
  built: boolean;
  integrity: number;
  insulation: number;
  defense: number;
  dayBuilt: number;
}

export interface TemperatureState {
  wetness: number;
  clothingInsulation: number;
  shelterInsulation: number;
  shade: number;
  comfort: number;
  lastExposure: 'clear' | 'rain' | 'storm';
}

export interface FoodFreshnessState {
  itemId: ItemId;
  freshness: number;
  preserved: boolean;
  spoiled: boolean;
}

export interface KitchenState {
  grillBuilt: boolean;
  kitchenBuilt: boolean;
  fuel: number;
  mealsCooked: number;
}

export interface RescueSignalState {
  id: string;
  kind: 'radio_tower' | 'flare' | 'signal_fire';
  strength: number;
  built: boolean;
  cooldownHours: number;
  lastUsedDay: number;
}

/* ------------------------------ Phase 3 ------------------------------ */

export interface WildlifeMemoryState {
  species: string;
  encounters: number;
  threats: number;
  lastEncounterDay: number;
  reaction: 'calm' | 'wary' | 'aggressive';
}

export interface AnimalTrackState {
  id: string;
  species: string;
  x: number;
  z: number;
  clue: 'footprint' | 'broken_branch' | 'fur' | 'droppings' | 'call';
  found: boolean;
  expiresHours: number;
}

export interface TerritoryBattleState {
  id: string;
  territoryId: string;
  challenger: string;
  defender: string;
  day: number;
  resolved: boolean;
  winner: string | null;
}

export interface LegendaryCreatureState {
  id: string;
  name: string;
  species: string;
  habitat: string;
  x: number;
  z: number;
  discovered: boolean;
  photographed: boolean;
  lore: string;
  rewardItem: ItemId;
  rewardCoins: number;
}

export interface PhotoRecord {
  id: string;
  subject: string;
  day: number;
  location: string;
  quality: number;
}

export interface WildlifeResearchState {
  photos: PhotoRecord[];
  catalogued: string[];
  researchPoints: number;
}

/* ------------------------------ Phase 4 ------------------------------ */

export interface BusinessState {
  id: string;
  name: string;
  kind: string;
  x: number;
  z: number;
  accent: string;
  owned: boolean;
  sharedWithPeer: string | null;
  stock: number;
  employees: number;
  dailyIncome: number;
  uncollectedIncome: number;
  visits: number;
  reputation: number;
  open: boolean;
}

export type DistrictId =
  | 'french_quarter'
  | 'garden_district'
  | 'marigny'
  | 'warehouse_row'
  | 'bayou_outskirts';

export interface DistrictState {
  id: DistrictId;
  name: string;
  reputation: number;
  trend: number;
  description: string;
}

export interface TrafficState {
  signalPhase: number;
  signalTimer: number;
  congestion: number;
  incidents: number;
  parkingAvailable: number;
  lastSignal: 'green' | 'yellow' | 'red';
}

export interface CulturalEventState {
  id: string;
  name: string;
  kind: 'parade' | 'festival' | 'live_music' | 'car_show' | 'car_meet';
  day: number;
  hoursLeft: number;
  attending: boolean;
  completed: boolean;
}

/* ------------------------------ Phase 5 ------------------------------ */

export interface VehicleCustomizationState {
  vehicleId: string;
  paint: string;
  interior: string;
  rims: string;
  bodyKit: number;
  hydraulicsLevel: number;
  lighting: string;
  audioTune: number;
  investment: number;
}

export interface VehicleMechanicalState {
  vehicleId: string;
  engineHeat: number;
  tireWear: number;
  brakeWear: number;
  engineWear: number;
  failed: boolean;
  lastServiceDay: number;
}

export interface AudioCompetitionState {
  id: string;
  name: string;
  day: number;
  score: number;
  placement: number;
  entrants: number;
  completed: boolean;
}

export interface RestorationProject {
  id: string;
  name: string;
  preset: VehiclePresetKey;
  x: number;
  z: number;
  stage: number;
  recovered: boolean;
  restored: boolean;
  description: string;
}

export interface CarClubState {
  name: string;
  founded: boolean;
  members: number;
  reputation: number;
  meetsHeld: number;
  duesCollected: number;
}

/* ------------------------------ Phase 6 ------------------------------ */

export interface DiveSiteState {
  id: string;
  name: string;
  kind: 'shipwreck' | 'submerged_cave' | 'underwater_ruins' | 'hidden_grotto';
  x: number;
  z: number;
  depth: number;
  explored: boolean;
  lootItem: ItemId;
  lootQuantity: number;
  coins: number;
  description: string;
}

export interface TreasureState {
  id: string;
  name: string;
  clueX: number;
  clueZ: number;
  digX: number;
  digZ: number;
  cluesDecoded: number;
  cluesTotal: number;
  dug: boolean;
  artifact: string;
  rewardCoins: number;
  rewardItem: ItemId;
}

export interface AdventureStage {
  title: string;
  description: string;
  objective: string;
  choices?: { id: string; label: string; consequence: string }[];
}

export interface AdventureState {
  id: string;
  name: string;
  summary: string;
  stages: AdventureStage[];
  stage: number;
  branch: string | null;
  completed: boolean;
  failed: boolean;
  log: string[];
}

export interface ExpeditionState {
  id: string;
  destination: string;
  durationHours: number;
  hoursLeft: number;
  teamSize: number;
  supplies: number;
  risk: number;
  active: boolean;
  resolved: boolean;
  outcome: string;
  rewardCoins: number;
  rewardItem: ItemId;
}

/* ------------------------------ Phase 7 ------------------------------ */

export interface NpcMemoryState {
  npcId: string;
  trust: number;
  encounters: number;
  favors: number;
  conflicts: number;
  lastTopic: string;
  lastLine: string;
}

export interface CompanionPersonalityState {
  id: string;
  name: string;
  trait: 'loyal' | 'curious' | 'cautious' | 'bold' | 'practical' | 'superstitious';
  preference: string;
  fear: string;
  routine: string;
  bond: number;
}

export interface RecruitState {
  id: string;
  name: string;
  skill: 'builder' | 'hunter' | 'medic' | 'mechanic' | 'scout' | 'musician';
  status: 'unmet' | 'rescued' | 'recruited' | 'assigned';
  assignment: 'construction' | 'defense' | 'supplies' | 'maintenance' | 'idle';
  morale: number;
  x: number;
  z: number;
  story: string;
}

export interface ConversationState {
  npcId: string;
  lastLine: string;
  context: string;
  day: number;
}

export interface CommunityProjectState {
  id: string;
  name: string;
  description: string;
  cost: number;
  progress: number;
  goal: number;
  built: boolean;
  benefit: string;
}

/* ------------------------------ Phase 8 ------------------------------ */

export interface TradeOfferState {
  id: string;
  peerId: string;
  peerName: string;
  itemId: ItemId;
  quantity: number;
  price: number;
  direction: 'incoming' | 'outgoing';
  day: number;
}

export interface CoopState {
  sharedBusinessId: string | null;
  challengeId: string | null;
  challengeTitle: string;
  challengeProgress: number;
  challengeGoal: number;
  challengeReward: number;
  challengeContributors: string[];
  challengeCompleted: boolean;
  trades: TradeOfferState[];
  lastSyncedDay: number;
  sharedActivities: string[];
}

/* ------------------------------ Phase 9 ------------------------------ */

export interface PowerGridState {
  generatorBuilt: boolean;
  generatorFuel: number;
  wiringMeters: number;
  lights: number;
  switches: number;
  outputKw: number;
  demandKw: number;
  brownout: boolean;
}

export interface WaterGridState {
  wellBuilt: boolean;
  pumpBuilt: boolean;
  tankBuilt: boolean;
  irrigationBuilt: boolean;
  gallons: number;
  capacity: number;
  pressure: number;
}

export interface EngineeringState {
  contractActive: string | null;
  contractProgress: number;
  contractGoal: number;
  roadsRepaired: number;
  bridgesBuilt: number;
  treehouseStage: number;
  homesteadStage: number;
  machineryBuilt: boolean;
}

/* ------------------------------ Phase 10 ------------------------------ */

export interface HurricaneState {
  active: boolean;
  name: string;
  intensity: number;
  windMph: number;
  hoursLeft: number;
  prepared: boolean;
  lastHurricaneDay: number;
}

export interface FloodState {
  level: number;
  peak: number;
  lowlandRoadBlocked: boolean;
}

export interface FireCellState {
  id: string;
  x: number;
  z: number;
  intensity: number;
}

export interface FireState {
  cells: FireCellState[];
  windX: number;
  windZ: number;
  lastSpreadTicks: number;
}

export interface EnvironmentalDamageState {
  fallenTrees: number;
  damagedShelters: number;
  damagedBusinesses: number;
  debris: number;
}

export interface RecoveryState {
  infrastructure: number;
  settlement: number;
  lastDisasterDay: number;
}

/* ------------------------------ Phase 11 ------------------------------ */

export interface LostCivilizationState {
  excavationStage: number;
  chambersFound: number;
  artifacts: string[];
  secretsFound: string[];
  gateOpened: boolean;
  lore: string[];
}

export interface WorldBossState {
  id: string;
  name: string;
  description: string;
  region: string;
  attempts: number;
  prep: number;
  defeated: boolean;
  requiredPrep: number;
  rewards: string;
}

export interface DragonBondState {
  dragonId: string;
  name: string;
  xp: number;
  level: number;
  lastBondDay: number;
}

export interface MysteryClue {
  id: string;
  title: string;
  text: string;
  x: number;
  z: number;
  region: string;
  found: boolean;
  rewardItem: ItemId;
}

export interface MysteryState {
  clueIds: string[];
  cluesFound: string[];
  storyStage: number;
  finalRevealed: boolean;
  lore: string[];
}

export interface EvolutionState {
  score: number;
  stage: number;
  stageName: string;
  lastClaimedStage: number;
  history: { day: number; score: number; stageName: string }[];
  perks: string[];
}

export interface LostWorldState {
  version: number;
  rng: number;
  lastDay: number;
  lastTickHour: number;
  seasons: SeasonalState;
  log: LostWorldLogEntry[];
  persistent: PersistentWorldState;
  npcs: NpcRoutineState[];
  events: WorldEventState[];
  eventCooldownHours: number;
  territories: WildlifeTerritoryState[];
  shelters: ShelterProject[];
  temperature: TemperatureState;
  food: FoodFreshnessState[];
  kitchen: KitchenState;
  rescueSignals: RescueSignalState[];
  wildlifeMemory: WildlifeMemoryState[];
  tracks: AnimalTrackState[];
  territoryBattles: TerritoryBattleState[];
  legendaries: LegendaryCreatureState[];
  research: WildlifeResearchState;
  businesses: BusinessState[];
  districts: DistrictState[];
  traffic: TrafficState;
  culturalEvents: CulturalEventState[];
  customization: VehicleCustomizationState[];
  mechanical: VehicleMechanicalState[];
  audioCompetitions: AudioCompetitionState[];
  restorations: RestorationProject[];
  carClub: CarClubState;
  diveSites: DiveSiteState[];
  treasures: TreasureState[];
  adventures: AdventureState[];
  expedition: ExpeditionState | null;
  npcMemory: NpcMemoryState[];
  companions: CompanionPersonalityState[];
  recruits: RecruitState[];
  conversations: ConversationState[];
  communityProjects: CommunityProjectState[];
  coop: CoopState;
  power: PowerGridState;
  water: WaterGridState;
  engineering: EngineeringState;
  hurricane: HurricaneState;
  flood: FloodState;
  fire: FireState;
  damage: EnvironmentalDamageState;
  recovery: RecoveryState;
  civilization: LostCivilizationState;
  worldBosses: WorldBossState[];
  dragonBonds: DragonBondState[];
  mystery: MysteryState;
  evolution: EvolutionState;
}

export interface LostWorldTickContext {
  dtSeconds: number;
  day: number;
  timeOfDay: number;
  weather: WeatherType;
  playerX: number;
  playerZ: number;
  sheltered: boolean;
  nearFire: boolean;
  isSwimming: boolean;
  activeVehicle: { id: string; speedKmh: number; fuel: number; hp: number; maxHp: number } | null;
  recruitedCount: number;
  scene: 'island' | 'mainland' | 'flat';
}

export interface LostWorldTickReport {
  alerts: { id: string; tone: LostWorldTone; text: string }[];
  forceWeather?: WeatherType;
  temperatureOffset: number;
  vehicleDamage?: { vehicleId: string; amount: number };
  fellTrees?: { x: number; z: number; count: number };
  floodVehicleStall?: boolean;
}

export interface LostWorldActionContext {
  coins: number;
  items: Partial<Record<ItemId, number>>;
  vitals: PlayerVitals;
  day: number;
  timeOfDay: number;
  weather: WeatherType;
  playerX: number;
  playerZ: number;
  scene: 'island' | 'mainland' | 'flat';
  sheltered: boolean;
  nearFire: boolean;
  isSwimming: boolean;
  vehicles: {
    id: string;
    name: string;
    preset?: string;
    paintColor?: string;
    hasTrunkBass?: boolean;
    trunkBassEnabled?: boolean;
    underglowColor?: string;
    rimLightColor?: string;
    hp: number;
    maxHp: number;
    fuel: number;
  }[];
  activeVehicleId: string | null;
  dragons: { id: string; name: string }[];
  navigatorActive: boolean;
  recruitedCount: number;
  multiplayerConnected: boolean;
  multiplayerPeers: { peerId: string; name: string }[];
}

export interface LostWorldEffects {
  coins?: number;
  items?: { itemId: ItemId; quantity: number }[];
  vitals?: Partial<Pick<PlayerVitals, 'health' | 'hunger' | 'thirst' | 'stamina'>>;
  placeStructure?: { type: CampStructureType; x: number; z: number; label: string };
  spawnVehiclePreset?: string;
  vehiclePatch?: { vehicleId: string; patch: Record<string, unknown> };
  feedDragonId?: string;
  waterCrops?: boolean;
  fellTreesNear?: { x: number; z: number; count: number };
  forceWeather?: WeatherType;
  cinematic?: { title: string; subtitle: string; duration: number };
  setWeather?: WeatherType;
  broadcast?: { kind: string; payload: Record<string, unknown> };
  evolvedStage?: string;
}

export interface LostWorldActionResult {
  ok: boolean;
  message: string;
  effects: LostWorldEffects;
  tab: LostWorldTab;
}

export interface LostWorldActionDescriptor {
  id: string;
  tab: LostWorldTab;
  label: string;
  description: string;
  costLabel: string;
  available: boolean;
  reason?: string;
  tone?: LostWorldTone;
}

export interface LostWorldHudState {
  seasonId: SeasonId;
  seasonLabel: string;
  seasonDay: number;
  evolutionScore: number;
  evolutionStage: string;
  alerts: number;
  hurricaneActive: boolean;
  hurricaneName: string;
  floodLevel: number;
  fireCells: number;
  activeEvent: string | null;
  settlementTier: number;
  recruitedCount: number;
}

/* ------------------------------ helpers ------------------------------ */

export function nextLostWorldRandom(state: LostWorldState): number {
  state.rng = (state.rng * 1664525 + 1013904223) >>> 0;
  return state.rng / 4294967296;
}

export function lostWorldLog(
  state: LostWorldState,
  day: number,
  text: string,
  tone: LostWorldTone = 'info',
): void {
  state.log.unshift({
    id: `lwlog_${day}_${state.log.length}_${Math.floor(state.rng % 9999)}`,
    day,
    text,
    tone,
  });
  if (state.log.length > LOST_WORLD_LOG_LIMIT) state.log.length = LOST_WORLD_LOG_LIMIT;
}

export function addPersistentChange(
  state: LostWorldState,
  day: number,
  kind: PersistentWorldChange['kind'],
  label: string,
  x: number,
  z: number,
): void {
  state.persistent.changes.unshift({
    id: `lwchange_${day}_${state.persistent.changes.length}`,
    day,
    kind,
    label,
    x,
    z,
  });
  if (state.persistent.changes.length > LOST_WORLD_CHANGE_LIMIT) {
    state.persistent.changes.length = LOST_WORLD_CHANGE_LIMIT;
  }
}

export function seasonForDay(day: number): SeasonalState {
  const daysPerSeason = 7;
  const safeDay = Math.max(1, Math.floor(day));
  const index = Math.floor((safeDay - 1) / daysPerSeason) % 4;
  const ids: SeasonId[] = ['spring', 'summer', 'hurricane', 'winter'];
  const labels = ['Spring Bloom', 'High Summer', 'Hurricane Season', 'Bayou Winter'];
  return {
    id: ids[index],
    index,
    dayInSeason: ((safeDay - 1) % daysPerSeason) + 1,
    daysPerSeason,
    label: labels[index],
  };
}

export function clockHour(timeOfDay: number): number {
  // Engine timeOfDay 0.25 = sunrise, 0.75 = sunset.
  return (timeOfDay * 24 + 6) % 24;
}

export function isBusinessOpen(hour: number): boolean {
  return hour >= 7 && hour < 22;
}

/* ------------------------------ catalogs ------------------------------ */

const npcSeeds: Omit<
  NpcRoutineState,
  'activity' | 'x' | 'z' | 'trust' | 'encounters' | 'favors' | 'conflicts' | 'lastLine'
>[] = [
  { id: 'npc_silas', name: 'Elder Silas', role: 'artisan', region: 'island', homeX: 34, homeZ: 62, workX: 28, workZ: 58, shopX: 12, shopZ: 44, socialX: 40, socialZ: 52, personality: 'Patient, watches the tide before he speaks.' },
  { id: 'npc_maren', name: 'Maren', role: 'merchant', region: 'island', homeX: 18, homeZ: 40, workX: 10, workZ: 36, shopX: 10, shopZ: 36, socialX: 26, socialZ: 48, personality: 'Sharp trader, soft spot for honest survivors.' },
  { id: 'npc_bram', name: 'Bram', role: 'farmer', region: 'island', homeX: -22, homeZ: 30, workX: -30, workZ: 24, shopX: -10, shopZ: 38, socialX: -18, socialZ: 44, personality: 'Up before the sun, distrusts idle hands.' },
  { id: 'npc_kaelen', name: 'Kaelen', role: 'fisher', region: 'island', homeX: 44, homeZ: 6, workX: 58, workZ: -4, shopX: 20, shopZ: 20, socialX: 38, socialZ: 14, personality: 'Quiet, reads weather in the gulls.' },
  { id: 'npc_junie', name: 'Junie Boudreaux', role: 'merchant', region: 'crescent_city', homeX: 158, homeZ: 1272, workX: 185, workZ: 1295, shopX: 185, shopZ: 1295, socialX: 120, socialZ: 1300, personality: 'Fast talker, remembers every regular.' },
  { id: 'npc_mamou', name: 'Mamou Thibodeaux', role: 'chef', region: 'crescent_city', homeX: -120, homeZ: 1320, workX: -150, workZ: 1360, shopX: 40, shopZ: 1305, socialX: -100, socialZ: 1330, personality: 'Feeds anyone who walks in, asks questions later.' },
  { id: 'npc_remy', name: 'Remy Duval', role: 'mechanic', region: 'crescent_city', homeX: -240, homeZ: 1280, workX: -215, workZ: 1335, shopX: 20, shopZ: 1320, socialX: -180, socialZ: 1300, personality: 'Talks to engines more than people.' },
  { id: 'npc_odette', name: 'Odette Laveau', role: 'musician', region: 'crescent_city', homeX: -60, homeZ: 1390, workX: -80, workZ: 1352, shopX: -30, shopZ: 1310, socialX: -20, socialZ: 1360, personality: 'Plays the room before she says hello.' },
  { id: 'npc_celeste', name: 'Officer Celeste', role: 'guard', region: 'crescent_city', homeX: 130, homeZ: 1350, workX: 95, workZ: 1325, shopX: 40, shopZ: 1310, socialX: 60, socialZ: 1340, personality: 'Even-tempered until a line is crossed.' },
  { id: 'npc_antoine', name: 'Antoine Prejean', role: 'fisher', region: 'crescent_city', homeX: -310, homeZ: 1420, workX: -290, workZ: 1385, shopX: -150, shopZ: 1360, socialX: -220, socialZ: 1390, personality: 'Knows every sandbar in the delta.' },
];

interface EventDef {
  id: string;
  kind: WorldEventKind;
  title: string;
  description: string;
  region: 'island' | 'coast' | 'crescent_city';
  durationHours: number;
  rewardCoins: number;
  rewardItem?: ItemId;
  rewardQuantity?: number;
  trustDelta: number;
}

const EVENT_DEFS: EventDef[] = [
  { id: 'bayou_festival', kind: 'festival', title: 'Bayou Boogaloo', description: 'Music, food stalls and a parade winding through the district. The whole neighborhood is out.', region: 'crescent_city', durationHours: 8, rewardCoins: 120, rewardItem: 'roasted_meat', rewardQuantity: 2, trustDelta: 8 },
  { id: 'dock_accident', kind: 'accident', title: 'Dock Crane Collapse', description: 'A crane has pinned a dockworker. Lifting the beam needs muscle and a steady hand.', region: 'coast', durationHours: 5, rewardCoins: 90, rewardItem: 'metal_ore', rewardQuantity: 4, trustDelta: 12 },
  { id: 'radio_emergency', kind: 'emergency', title: 'Distress Call', description: 'A broken transmission repeats coordinates from a sinking skiff offshore.', region: 'coast', durationHours: 4, rewardCoins: 140, rewardItem: 'filtered_water_bottle', rewardQuantity: 2, trustDelta: 10 },
  { id: 'squall', kind: 'storm', title: 'Gulf Squall', description: 'A fast squall is pushing across the water. Loose roofs and small boats are at risk.', region: 'coast', durationHours: 6, rewardCoins: 70, rewardItem: 'fiber', rewardQuantity: 6, trustDelta: 6 },
  { id: 'buried_cache', kind: 'discovery', title: 'Freshly Washed Cache', description: 'Storm runoff has uncovered a brass-bound chest in the creek bank.', region: 'island', durationHours: 10, rewardCoins: 110, rewardItem: 'gold_bar', rewardQuantity: 1, trustDelta: 2 },
  { id: 'lost_hiker', kind: 'encounter', title: 'Lost Surveyor', description: 'A surveyor with a broken leg is waving from the treeline.', region: 'island', durationHours: 7, rewardCoins: 60, rewardItem: 'bone', rewardQuantity: 2, trustDelta: 14 },
  { id: 'night_market', kind: 'festival', title: 'French Market Night', description: 'Vendors are trading late under string lights and a brass band.', region: 'crescent_city', durationHours: 6, rewardCoins: 85, rewardItem: 'berries', rewardQuantity: 4, trustDelta: 7 },
  { id: 'house_fire', kind: 'emergency', title: 'Kitchen Fire', description: 'Smoke is pouring from a restaurant kitchen. The family is trapped upstairs.', region: 'crescent_city', durationHours: 3, rewardCoins: 150, rewardItem: 'flour', rewardQuantity: 3, trustDelta: 15 },
  { id: 'rare_sighting', kind: 'discovery', title: 'Ivory Shape in the Reeds', description: 'Something pale and enormous moved through the cypress, too large for a deer.', region: 'island', durationHours: 12, rewardCoins: 40, rewardItem: 'hide', rewardQuantity: 2, trustDelta: 1 },
  { id: 'roadside_breakdown', kind: 'accident', title: 'Roadside Breakdown', description: 'A family van is smoking on the shoulder with a trailer full of supplies.', region: 'crescent_city', durationHours: 6, rewardCoins: 75, rewardItem: 'metal_ore', rewardQuantity: 3, trustDelta: 9 },
];

const TERRITORY_SEEDS: Omit<WildlifeTerritoryState, 'seasonTargetX' | 'seasonTargetZ' | 'migrating' | 'lastBattleDay'>[] = [
  { id: 'terr_forest', species: 'deer', displayName: 'Deer Meadow', centerX: 55, centerZ: -40, radius: 46, aggression: 10, population: 14, legendary: false },
  { id: 'terr_boar', species: 'wild_boar', displayName: 'Boar Wallow', centerX: -70, centerZ: 45, radius: 40, aggression: 35, population: 8, legendary: false },
  { id: 'terr_bear', species: 'grizzly_bear', displayName: 'Bear Ridge', centerX: -120, centerZ: -80, radius: 52, aggression: 65, population: 2, legendary: false },
  { id: 'terr_wolf', species: 'gray_wolf', displayName: 'Wolf Run', centerX: 120, centerZ: 70, radius: 44, aggression: 55, population: 5, legendary: false },
  { id: 'terr_gator', species: 'saltwater_crocodile', displayName: 'Gator Bayou', centerX: -240, centerZ: 1280, radius: 60, aggression: 70, population: 6, legendary: false },
  { id: 'terr_eagle', species: 'bald_eagle', displayName: 'Eagle Bluff', centerX: 10, centerZ: -130, radius: 50, aggression: 20, population: 3, legendary: false },
  { id: 'terr_rougarou', species: 'rougarou', displayName: 'Rougarou Marsh', centerX: -330, centerZ: 1440, radius: 55, aggression: 80, population: 1, legendary: true },
  { id: 'terr_leviathan', species: 'hurricane_leviathan', displayName: 'Leviathan Trench', centerX: -520, centerZ: 900, radius: 90, aggression: 90, population: 1, legendary: true },
];

const LEGENDARY_SEEDS: Omit<LegendaryCreatureState, 'discovered' | 'photographed'>[] = [
  { id: 'leg_rougarou', name: 'The Rougarou', species: 'rougarou', habitat: 'Rougarou Marsh', x: -330, z: 1440, lore: 'A wolf-headed shape that walks upright through the cane. Old families leave salt on the porch.', rewardItem: 'hide', rewardCoins: 300 },
  { id: 'leg_ivory_stag', name: 'The Ivory Stag', species: 'ivory_stag', habitat: 'Whispering Canopy', x: 70, z: -60, lore: 'A white stag with antlers like bare cypress branches. It only appears after rain.', rewardItem: 'bone', rewardCoins: 220 },
  { id: 'leg_black_panther', name: 'Black Panther of the Basin', species: 'black_panther', habitat: 'Atchafalaya Basin', x: -280, z: 1360, lore: 'Game cameras catch it once a decade. Locals insist it is a guardian, not a predator.', rewardItem: 'hide', rewardCoins: 260 },
  { id: 'leg_ghost_gator', name: 'The Ghost Gator', species: 'ghost_gator', habitat: 'Sunken Bayou', x: -360, z: 1300, lore: 'An albino gator longer than a flatboat. Its eyes shine red in lantern light.', rewardItem: 'bone', rewardCoins: 280 },
  { id: 'leg_thunderbird', name: 'The Thunderbird', species: 'thunderbird', habitat: 'Eagle Bluff', x: 10, z: -150, lore: 'A wingspan that darkens the ridge. The old stories say it carries storms on its back.', rewardItem: 'fiber', rewardCoins: 240 },
  { id: 'leg_cypress_mother', name: 'The Cypress Mother', species: 'cypress_mother', habitat: 'Old Growth Swamp', x: -180, z: 1420, lore: 'A tree that breathes. The rings on its trunk move when no wind blows.', rewardItem: 'plant_material', rewardCoins: 200 },
];

const BUSINESS_SEEDS = MAINLAND_BUSINESSES;

const DISTRICT_SEEDS: Omit<DistrictState, 'trend'>[] = [
  { id: 'french_quarter', name: 'French Quarter', reputation: 10, description: 'Tourists, music and old money. Reputation here spreads fast.' },
  { id: 'garden_district', name: 'Garden District', reputation: 5, description: 'Tree-lined streets and restored mansions. Owners value discretion.' },
  { id: 'marigny', name: 'Faubourg Marigny', reputation: 8, description: 'Artists, clubs and late-night kitchens. Word travels by song.' },
  { id: 'warehouse_row', name: 'Warehouse Row', reputation: 0, description: 'Garages, parts yards and honest grease. Skill beats pedigree.' },
  { id: 'bayou_outskirts', name: 'Bayou Outskirts', reputation: 6, description: 'Family land, crab traps and long memories.' },
];

const RESTORATION_SEEDS: Omit<RestorationProject, 'stage' | 'recovered' | 'restored'>[] = [
  { id: 'resto_deville', name: 'Barn-Find Coupe DeVille', preset: 'cadillac_coupe_deville', x: -205, z: 1310, description: 'A dust-covered coupe with a seized engine and dry-rotted top.' },
  { id: 'resto_slab', name: 'Abandoned Slab', preset: 'slab', x: 205, z: 1385, description: 'A slab parked nose-first in a drainage ditch after a storm.' },
  { id: 'resto_sub', name: 'Flooded Suburban', preset: 'chevy_2000_sub', x: -260, z: 1400, description: 'A waterline halfway up the doors and a trunk full of silt.' },
];

const DIVE_SEEDS: Omit<DiveSiteState, 'explored'>[] = [
  { id: 'dive_wreck', name: 'The Belle Riviere', kind: 'shipwreck', x: -420, z: 260, depth: 18, lootItem: 'gold_bar', lootQuantity: 2, coins: 180, description: 'A cotton packet sunk in a squall, its hold still sealed.' },
  { id: 'dive_cave', name: 'Blue Hole Cave', kind: 'submerged_cave', x: 320, z: -160, depth: 26, lootItem: 'emerald', lootQuantity: 2, coins: 220, description: 'A freshwater spring dropping into a limestone cavern.' },
  { id: 'dive_ruins', name: 'Sunken Mission', kind: 'underwater_ruins', x: -180, z: 520, depth: 22, lootItem: 'bone', lootQuantity: 4, coins: 160, description: 'Bell tower foundations and a graveyard of carved stone.' },
  { id: 'dive_grotto', name: 'Lantern Grotto', kind: 'hidden_grotto', x: 470, z: 330, depth: 12, lootItem: 'space_crystal', lootQuantity: 1, coins: 260, description: 'A sea cave lit by phosphorescence, far from any charted reef.' },
];

const ADVENTURE_SEEDS: Omit<AdventureState, 'stage' | 'branch' | 'completed' | 'failed' | 'log'>[] = [
  {
    id: 'adv_drowned_bell',
    name: 'The Drowned Bell',
    summary: 'A mission bell rings under the bay at low tide. Someone wants it recovered before the church sale.',
    stages: [
      { title: 'Hear the Bell', description: 'Wait for low tide and locate the ringing.', objective: 'Decode the tide chart and mark the site.' },
      { title: 'Choose a Diver', description: 'The current is too strong for one pair of lungs.', objective: 'Pick a plan.', choices: [{ id: 'hire', label: 'Hire a local diver (90 coins)', consequence: 'Safer, but the parish keeps the bell.' }, { id: 'alone', label: 'Dive alone', consequence: 'Keep the bell, risk injury.' }] },
      { title: 'Raise the Bell', description: 'Rig a lift and bring it up before the squall.', objective: 'Complete the lift.' },
      { title: 'Return the Bell', description: 'Decide where the bell belongs.', objective: 'Finish the story.' },
    ],
  },
  {
    id: 'adv_rougarou_trail',
    name: 'Trail of the Rougarou',
    summary: 'Livestock are missing and the marsh is full of tracks that do not belong to any dog.',
    stages: [
      { title: 'Read the Tracks', description: 'Follow the prints away from the pasture.', objective: 'Scan the marsh for tracks.' },
      { title: 'The Old Fisherman', description: 'An old fisherman knows more than he will say.', objective: 'Choose your approach.', choices: [{ id: 'pay', label: 'Pay for information (60 coins)', consequence: 'Learn the safe path.' }, { id: 'press', label: 'Press him', consequence: 'Learn faster, lose trust.' }] },
      { title: 'The Cane Break', description: 'Something is caught in the cane, and it is not an animal.', objective: 'Resolve the encounter.' },
      { title: 'Tell the Parish', description: 'The truth will change how the bayou sees you.', objective: 'Make the story public.' },
    ],
  },
  {
    id: 'adv_lost_ferry',
    name: 'The Last Ferry',
    summary: 'A ferry vanished with eleven passengers. Its radio still answers on a dead channel.',
    stages: [
      { title: 'Dead Channel', description: 'Triangulate the signal from the old dock.', objective: 'Tune the radio and fix the bearing.' },
      { title: 'Fog Bank', description: 'The bearing leads into a fog bank off the shipping lane.', objective: 'Choose whether to take the skiff.', choices: [{ id: 'skiff', label: 'Take the skiff', consequence: 'Fast, exposed to the weather.' }, { id: 'wait', label: 'Wait for the Coast Guard', consequence: 'Slow, safer, less reward.' }] },
      { title: 'The Ferry', description: 'The ferry is grounded on a sandbar, lights still burning.', objective: 'Bring the passengers home.' },
      { title: 'Dock Inquiry', description: 'The company wants to know what happened.', objective: 'Give your account.' },
    ],
  },
  {
    id: 'adv_civilization_gate',
    name: 'Beneath the Island',
    summary: 'A cave-in opened a stairwell that is too straight, too old and too deep to be natural.',
    stages: [
      { title: 'The Stairwell', description: 'Clear the collapse without bringing down the roof.', objective: 'Excavate the entrance.' },
      { title: 'The Marked Door', description: 'The door has twelve symbols and one missing.', objective: 'Choose how to open it.', choices: [{ id: 'solve', label: 'Solve the symbols', consequence: 'Rewards patience and research.' }, { id: 'force', label: 'Force the door', consequence: 'Faster, damages the history.' }] },
      { title: 'The Hall of Water', description: 'A flooded hall opens into a city that should not exist.', objective: 'Explore the first chamber.' },
      { title: 'The Sleeping City', description: 'Something in the city is still awake.', objective: 'Decide what to wake.' },
    ],
  },
  {
    id: 'adv_evolving_island',
    name: 'The Island Answers',
    summary: 'Your settlement has changed the island. Now the island is changing back.',
    stages: [
      { title: 'Strange Growth', description: 'Trees are growing in patterns that match your streets.', objective: 'Survey the new growth.' },
      { title: 'The Offer', description: 'A voice in the canopy offers a bargain.', objective: 'Choose a path.', choices: [{ id: 'accept', label: 'Accept the bargain', consequence: 'The island thrives, but demands tribute.' }, { id: 'refuse', label: 'Refuse', consequence: 'Keep control, face the consequences.' }] },
      { title: 'The Turning', description: 'The island shifts its rivers and trails overnight.', objective: 'Adapt the settlement.' },
      { title: 'A New Map', description: 'Draw the island as it is now.', objective: 'Complete the survey.' },
    ],
  },
];

const RECRUIT_SEEDS: Omit<RecruitState, 'status' | 'assignment' | 'morale'>[] = [
  { id: 'rec_inez', name: 'Inez Calloway', skill: 'medic', x: 60, z: 40, story: 'A paramedic who stayed behind when the mainland evacuated.' },
  { id: 'rec_tobias', name: 'Tobias Greene', skill: 'builder', x: -40, z: -70, story: 'A bridge carpenter looking for a crew that finishes what it starts.' },
  { id: 'rec_sable', name: 'Sable Robichaux', skill: 'scout', x: -300, z: 1370, story: 'A trapper who knows every cut in the basin.' },
  { id: 'rec_delphine', name: 'Delphine Arceneaux', skill: 'musician', x: -40, z: 1370, story: 'A bandleader who can turn a tense camp into a community.' },
  { id: 'rec_marcus', name: 'Marcus Bell', skill: 'mechanic', x: 120, z: 1340, story: 'A garage owner with a toolbox and no garage left.' },
  { id: 'rec_holly', name: 'Holly Tran', skill: 'hunter', x: 90, z: -20, story: 'A bowhunter who has been living off the ridge for a month.' },
];

const MYSTERY_SEEDS: Omit<MysteryClue, 'found'>[] = [
  { id: 'clue_1', title: 'Salt Line', text: 'A line of salt across a doorway, laid the night the first families disappeared.', x: 42, z: 58, region: 'island', rewardItem: 'salt' },
  { id: 'clue_2', title: 'Tide Log', text: 'A tide log ends mid-sentence: "The water went out and did not come back."', x: -88, z: 24, region: 'island', rewardItem: 'nautical_map' },
  { id: 'clue_3', title: 'Bell Fragment', text: 'A bronze fragment with a numeral cast into it. The mission bell was never numbered.', x: -420, z: 260, region: 'coast', rewardItem: 'metal_ore' },
  { id: 'clue_4', title: 'Surveyor Note', text: '"The island is larger at night. I measured it twice."', x: 120, z: -90, region: 'island', rewardItem: 'bone' },
  { id: 'clue_5', title: 'Cypress Carving', text: 'A spiral cut into living cypress, older than the bark around it.', x: -180, z: 1420, region: 'mainland', rewardItem: 'plant_material' },
  { id: 'clue_6', title: 'Radio Recording', text: 'A reel-to-reel recording of a woman counting down from twelve in a language no one recognizes.', x: -70, z: 1350, region: 'mainland', rewardItem: 'space_crystal' },
  { id: 'clue_7', title: 'Missing Symbol', text: 'Eleven symbols on the door, twelve in the song. One is missing on purpose.', x: -330, z: 1440, region: 'mainland', rewardItem: 'emerald' },
  { id: 'clue_8', title: 'Drowned Map', text: 'A map of the island with a second island drawn faintly beneath it.', x: 470, z: 330, region: 'coast', rewardItem: 'nautical_map' },
  { id: 'clue_9', title: 'The Watcher', text: 'A sketch of the player, signed with a date three days in the future.', x: 8, z: -60, region: 'island', rewardItem: 'bone' },
  { id: 'clue_10', title: 'Founder Stone', text: 'A cornerstone with two dates: one from 1812, one from next year.', x: 180, z: 1295, region: 'mainland', rewardItem: 'stone' },
  { id: 'clue_11', title: 'The Twelfth Room', text: 'A floor plan of the underground city with a room that has no door.', x: -205, z: 1310, region: 'mainland', rewardItem: 'gold_bar' },
  { id: 'clue_12', title: 'Your Own Voice', text: 'A recording of your voice, made tomorrow, telling you to stop digging.', x: -520, z: 900, region: 'coast', rewardItem: 'diamond' },
];

const BOSS_SEEDS: Omit<WorldBossState, 'attempts' | 'defeated' | 'prep'>[] = [
  { id: 'boss_colossus', name: 'The Colossus of the Deep', description: 'A reef that stands up. Its shell is older than the island and its wake swamps boats.', region: 'Leviathan Trench', requiredPrep: 3, rewards: 'Diamond cache, 900 coins, evolution surge' },
  { id: 'boss_ashen', name: 'The Ashen Behemoth', description: 'A volcanic grazer that wakes when the ridge vents. Fire follows its breath.', region: 'Crag Mountain', requiredPrep: 3, rewards: 'Obsidian plates, 750 coins, forge perk' },
  { id: 'boss_hurricane', name: 'The Hurricane Leviathan', description: 'A storm with a body. It circles the trench and answers the radio tower.', region: 'Open Gulf', requiredPrep: 4, rewards: 'Storm core, 1100 coins, hurricane shield' },
];

export function createLostWorldState(seed = 20261122): LostWorldState {
  return {
    version: LOST_WORLD_STATE_VERSION,
    rng: seed >>> 0,
    lastDay: 0,
    lastTickHour: -1,
    seasons: seasonForDay(1),
    log: [
      {
        id: 'lwlog_welcome',
        day: 1,
        text: 'The Lost World expansion is active. Schedules, seasons, businesses, disasters and discoveries now persist with the save.',
        tone: 'discovery',
      },
    ],
    persistent: {
      changes: [],
      settlementFounded: false,
      settlementName: 'Marsh Landing',
      settlementTier: 0,
      totalDiscoveries: 0,
    },
    npcs: npcSeeds.map((n) => ({
      ...n,
      activity: 'home',
      x: n.homeX,
      z: n.homeZ,
      trust: 0,
      encounters: 0,
      favors: 0,
      conflicts: 0,
      lastLine: '',
    })),
    events: [],
    eventCooldownHours: 6,
    territories: TERRITORY_SEEDS.map((t) => ({
      ...t,
      seasonTargetX: t.centerX,
      seasonTargetZ: t.centerZ,
      migrating: false,
      lastBattleDay: 0,
    })),
    shelters: [],
    temperature: {
      wetness: 0,
      clothingInsulation: 0.2,
      shelterInsulation: 0,
      shade: 0,
      comfort: 50,
      lastExposure: 'clear',
    },
    food: [],
    kitchen: { grillBuilt: false, kitchenBuilt: false, fuel: 0, mealsCooked: 0 },
    rescueSignals: [
      { id: 'sig_radio', kind: 'radio_tower', strength: 0, built: false, cooldownHours: 0, lastUsedDay: 0 },
      { id: 'sig_flare', kind: 'flare', strength: 0, built: false, cooldownHours: 0, lastUsedDay: 0 },
      { id: 'sig_fire', kind: 'signal_fire', strength: 0, built: false, cooldownHours: 0, lastUsedDay: 0 },
    ],
    wildlifeMemory: TERRITORY_SEEDS.map((t) => ({
      species: t.species,
      encounters: 0,
      threats: 0,
      lastEncounterDay: 0,
      reaction: 'calm',
    })),
    tracks: [],
    territoryBattles: [],
    legendaries: LEGENDARY_SEEDS.map((l) => ({ ...l, discovered: false, photographed: false })),
    research: { photos: [], catalogued: [], researchPoints: 0 },
    businesses: BUSINESS_SEEDS.map((b) => ({
      id: b.id,
      name: b.name,
      kind: b.kind,
      x: b.x,
      z: b.z,
      accent: b.accent,
      owned: false,
      sharedWithPeer: null,
      stock: 60,
      employees: 1,
      dailyIncome: 0,
      uncollectedIncome: 0,
      visits: 0,
      reputation: 0,
      open: true,
    })),
    districts: DISTRICT_SEEDS.map((d) => ({ ...d, trend: 0 })),
    traffic: { signalPhase: 0, signalTimer: 18, congestion: 0.2, incidents: 0, parkingAvailable: 12, lastSignal: 'green' },
    culturalEvents: [],
    customization: [],
    mechanical: [],
    audioCompetitions: [],
    restorations: RESTORATION_SEEDS.map((r) => ({ ...r, stage: 0, recovered: false, restored: false })),
    carClub: { name: 'Lost World Lowriders', founded: false, members: 0, reputation: 0, meetsHeld: 0, duesCollected: 0 },
    diveSites: DIVE_SEEDS.map((d) => ({ ...d, explored: false })),
    treasures: [
      { id: 'treasure_1', name: "Pirate's Ledger", clueX: 80, clueZ: 60, digX: 140, digZ: -40, cluesDecoded: 0, cluesTotal: 3, dug: false, artifact: 'Brass sextant', rewardCoins: 240, rewardItem: 'gold_bar' },
      { id: 'treasure_2', name: 'Mission Silver', clueX: -60, clueZ: 1320, digX: -180, digZ: 1260, cluesDecoded: 0, cluesTotal: 3, dug: false, artifact: 'Silver chalice', rewardCoins: 280, rewardItem: 'emerald' },
      { id: 'treasure_3', name: 'The Buried Bell Clapper', clueX: -420, clueZ: 260, digX: -390, digZ: 300, cluesDecoded: 0, cluesTotal: 3, dug: false, artifact: 'Bronze clapper', rewardCoins: 200, rewardItem: 'metal_ore' },
    ],
    adventures: ADVENTURE_SEEDS.map((a) => ({ ...a, stage: 0, branch: null, completed: false, failed: false, log: [] })),
    expedition: null,
    npcMemory: [],
    companions: [
      { id: 'navigator', name: 'Navigator', trait: 'loyal', preference: 'Sunset on the bow', fear: 'Deep water at night', routine: 'Checks the map at dawn, cooks at dusk', bond: 50 },
    ],
    recruits: RECRUIT_SEEDS.map((r) => ({ ...r, status: 'unmet', assignment: 'idle', morale: 60 })),
    conversations: [],
    communityProjects: [
      { id: 'comm_clinic', name: 'Clinic Tent', description: 'A covered treatment space with clean water and a cot.', cost: 180, progress: 0, goal: 100, built: false, benefit: 'Faster healing and fewer expedition injuries' },
      { id: 'comm_watch', name: 'Watch Platform', description: 'A raised lookout with a bell and a clear line of sight.', cost: 150, progress: 0, goal: 100, built: false, benefit: 'Early warning for storms and raids' },
      { id: 'comm_dock', name: 'Community Dock', description: 'A fixed dock for supply runs and ferry pickups.', cost: 240, progress: 0, goal: 100, built: false, benefit: 'More business income and cheaper expeditions' },
    ],
    coop: {
      sharedBusinessId: null,
      challengeId: null,
      challengeTitle: '',
      challengeProgress: 0,
      challengeGoal: 0,
      challengeReward: 0,
      challengeContributors: [],
      challengeCompleted: false,
      trades: [],
      lastSyncedDay: 0,
      sharedActivities: [],
    },
    power: {
      generatorBuilt: false,
      generatorFuel: 0,
      wiringMeters: 0,
      lights: 0,
      switches: 0,
      outputKw: 0,
      demandKw: 0,
      brownout: false,
    },
    water: {
      wellBuilt: false,
      pumpBuilt: false,
      tankBuilt: false,
      irrigationBuilt: false,
      gallons: 0,
      capacity: 0,
      pressure: 0,
    },
    engineering: {
      contractActive: null,
      contractProgress: 0,
      contractGoal: 0,
      roadsRepaired: 0,
      bridgesBuilt: 0,
      treehouseStage: 0,
      homesteadStage: 0,
      machineryBuilt: false,
    },
    hurricane: {
      active: false,
      name: '',
      intensity: 0,
      windMph: 0,
      hoursLeft: 0,
      prepared: false,
      lastHurricaneDay: 0,
    },
    flood: { level: 0, peak: 0, lowlandRoadBlocked: false },
    fire: { cells: [], windX: 0.8, windZ: 0.2, lastSpreadTicks: 0 },
    damage: { fallenTrees: 0, damagedShelters: 0, damagedBusinesses: 0, debris: 0 },
    recovery: { infrastructure: 0, settlement: 0, lastDisasterDay: 0 },
    civilization: {
      excavationStage: 0,
      chambersFound: 0,
      artifacts: [],
      secretsFound: [],
      gateOpened: false,
      lore: [
        'The island sits on a drowned plateau. Someone built down, not up.',
        'The twelve symbols repeat in the city, the bell and the tide log.',
        'The city is not abandoned. It is waiting for a twelfth name.',
      ],
    },
    worldBosses: BOSS_SEEDS.map((b) => ({ ...b, attempts: 0, prep: 0, defeated: false })),
    dragonBonds: [],
    mystery: {
      clueIds: MYSTERY_SEEDS.map((m) => m.id),
      cluesFound: [],
      storyStage: 0,
      finalRevealed: false,
      lore: [],
    },
    evolution: {
      score: 0,
      stage: 0,
      stageName: 'Unsettled Frontier',
      lastClaimedStage: 0,
      history: [],
      perks: [],
    },
  };
}

export function allMysteryClues(): MysteryClue[] {
  return MYSTERY_SEEDS.map((m) => ({ ...m, found: false }));
}

export function eventDefinitions(): readonly EventDef[] {
  return EVENT_DEFS;
}

export function seasonalTemperatureBias(season: SeasonId): number {
  if (season === 'summer') return 2.6;
  if (season === 'winter') return -2.2;
  if (season === 'hurricane') return 0.9;
  return 0.4;
}

export function wildlifeSeasonTarget(
  season: SeasonId,
  territory: WildlifeTerritoryState,
): { x: number; z: number } {
  if (!territory.migrating) return { x: territory.centerX, z: territory.centerZ };
  if (season === 'winter') return { x: territory.centerX - 90, z: territory.centerZ + 60 };
  if (season === 'summer') return { x: territory.centerX + 70, z: territory.centerZ - 40 };
  return { x: territory.centerX, z: territory.centerZ };
}
