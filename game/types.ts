export type BiomeId =
  | 'ocean'
  | 'beach'
  | 'forest'
  | 'grassland'
  | 'river'
  | 'lake'
  | 'mountain'
  | 'cave'
  | 'expedition';

export type WeatherType = 'clear' | 'overcast' | 'rain' | 'storm';

export type ItemCategory =
  | 'resource'
  | 'tool'
  | 'weapon'
  | 'food'
  | 'structure'
  | 'equipment';

export type ItemId =
  // Raw Resources
  | 'wood'
  | 'branch'
  | 'stone'
  | 'metal_ore'
  | 'flint'
  | 'fiber'
  | 'grass'
  | 'leaves'
  | 'wheat'
  | 'clay'
  | 'sand'
  | 'berries'
  | 'coconut'
  | 'apple'
  | 'banana'
  | 'maple_syrup'
  | 'mushrooms'
  | 'plant_material'
  | 'raw_meat'
  | 'dino_meat'
  | 'hide'
  | 'bone'
  | 'freshwater_fish'
  | 'ocean_fish'
  // Cooked / Prepared Foods
  | 'roasted_meat'
  | 'roasted_dino_meat'
  | 'roasted_coconut'
  | 'roasted_banana'
  | 'baked_apple'
  | 'maple_glazed_fruit'
  | 'coconut_fish_curry'
  | 'dino_feast'
  | 'berry_medley'
  | 'wheat_bread'
  | 'hearty_stew'
  | 'grilled_fish'
  | 'roasted_mushrooms'
  // Tools & Weapons & Equipment
  | 'gun'
  | 'ammo'
  | 'stone_axe'
  | 'stone_pickaxe'
  | 'hunting_knife'
  | 'wooden_club'
  | 'wooden_spear'
  | 'rope'
  | 'rope_whip'
  | 'lasso'
  | 'primitive_bow'
  | 'arrows'
  | 'fishing_rod'
  // Placeable Camp Structures
  | 'campfire'
  | 'sleeping_area'
  | 'storage_chest'
  | 'crafting_table'
  | 'cooking_station'
  | 'basic_shelter';

export interface ItemDefinition {
  id: ItemId;
  name: string;
  category: ItemCategory;
  description: string;
  stackable: boolean;
  maxStack: number;
  iconKey: string;
  color: string;
  gatherPower?: number;
  attackDamage?: number;
  attackRange?: number;
  preferredResource?: 'wood' | 'stone' | 'meat' | 'plant';
  hungerRestore?: number;
  thirstRestore?: number;
  healthRestore?: number;
  staminaRestore?: number;
  structureType?: CampStructureType;
}

export interface InventorySlot {
  itemId: ItemId;
  quantity: number;
}

export interface CraftingIngredient {
  itemId: ItemId;
  quantity: number;
}

export interface CraftingRecipe {
  id: string;
  resultItemId: ItemId;
  resultQuantity: number;
  category: 'tools' | 'weapons' | 'survival' | 'camp';
  requiresTable: boolean;
  craftTimeSeconds: number;
  ingredients: CraftingIngredient[];
  description: string;
}

export interface CookingRecipe {
  id: string;
  resultItemId: ItemId;
  resultQuantity: number;
  requiresStation: boolean;
  cookTimeSeconds: number;
  ingredients: CraftingIngredient[];
  description: string;
}

export type CampStructureType =
  | 'campfire'
  | 'sleeping_area'
  | 'storage_chest'
  | 'crafting_table'
  | 'cooking_station'
  | 'basic_shelter';

export interface PlacedStructure {
  id: string;
  type: CampStructureType;
  x: number;
  y: number;
  z: number;
  rotationY: number;
  chestItems?: InventorySlot[];
  lit?: boolean;
}

export type ResourceNodeKind =
  | 'palm_tree'
  | 'tropical_tree'
  | 'banyan_tree'
  | 'highland_cedar'
  | 'branch_pile'
  | 'small_stone'
  | 'stone_boulder'
  | 'mountain_rock'
  | 'ore_vein'
  | 'flint_outcrop'
  | 'fiber_fern'
  | 'grass_tuft'
  | 'wheat_patch'
  | 'clay_deposit'
  | 'sand_mound'
  | 'berry_bush'
  | 'mushroom_cluster'
  | 'plant_cluster'
  | 'shipwreck_crate'
  | 'expedition_crate';

export interface ResourceNodeState {
  id: string;
  kind: ResourceNodeKind;
  x: number;
  y: number;
  z: number;
  scale: number;
  hp: number;
  maxHp: number;
  respawnTimer: number;
  felled?: boolean;
  fallTimer?: number;
  fallDirX?: number;
  fallDirZ?: number;
}

export interface WorldPickupSave {
  id: string;
  itemId: ItemId;
  quantity: number;
  x: number;
  y: number;
  z: number;
  life: number;
}

export interface SavedResourceNodeState {
  id: string;
  hp: number;
  respawnTimer: number;
  felled?: boolean;
}

export type CreatureSpecies =
  // Ordinary Island Wildlife
  | 'deer'
  | 'rabbit'
  | 'wild_boar'
  | 'cattle'
  | 'jungle_fowl'
  | 'goat'
  | 'bird'
  | 'fish_school'
  // Marine Interactive
  | 'dolphin'
  // Prehistoric Dinosaurs
  | 'trex'
  | 'triceratops'
  | 'velociraptor'
  | 'stegosaurus'
  | 'brachiosaurus'
  | 'parasaurolophus';

export type CreatureTemperament =
  | 'apex_predator'
  | 'pack_predator'
  | 'defensive_herbivore'
  | 'timid_herbivore'
  | 'aerial_ambient'
  | 'aquatic_school'
  | 'friendly_marine';

export interface TrackedSighting {
  species: CreatureSpecies;
  name: string;
  x: number;
  z: number;
  timestamp: number;
}

export interface PlayerVitals {
  health: number;
  maxHealth: number;
  hunger: number;
  maxHunger: number;
  thirst: number;
  maxThirst: number;
  stamina: number;
  maxStamina: number;
  temperatureC: number; // ~37°C ideal; drops in storm/night/swim, warms by fire/shelter
}

export interface MissionDefinition {
  id: string;
  title: string;
  description: string;
  hint: string;
  targetCount: number;
  steps?: { label: string; done: (ctx: MissionCheckContext) => boolean }[];
  checkProgress: (state: MissionCheckContext) => number;
}

export interface MissionCheckContext {
  inventory: InventorySlot[];
  structures: PlacedStructure[];
  stats: GameStats;
  visitedBiomes: BiomeId[];
}

export interface GameStats {
  treesChopped: number;
  stonesMined: number;
  itemsCrafted: number;
  mealsCooked: number;
  animalsHunted: number;
  dinosaursEncountered: number;
  fishCaught: number;
  dolphinsBefriended: number;
  footprintsInspected: number;
  shipwreckCratesSearched: number;
  freshWaterDrunk: number;
  daysSurvived: number;
}

export interface GameSettings {
  masterVolume: number;
  sfxEnabled: boolean;
  ambienceEnabled: boolean;
  graphicsQuality: 'balanced' | 'high';
  touchControlsMode: 'auto' | 'always' | 'off';
  cameraSensitivity: number;
  invertCameraY: boolean;
  showCompass?: boolean;
  compactHud?: boolean;
}

export interface SaveSlotSummary {
  slotId: string;
  savedAt: number;
  dayCount: number;
  timeOfDay: number;
  biome: BiomeId;
  health: number;
  structuresCount: number;
  missionsCompleted: number;
}

export interface GameSaveData {
  version: number;
  slotId: string;
  savedAt: number;
  player: {
    x: number;
    y: number;
    z: number;
    yaw: number;
    pitch?: number;
    vitals: PlayerVitals;
    equippedSlot: number;
    hotbarItemIds: (ItemId | null)[];
  };
  dayCount: number;
  timeOfDay: number;
  weather?: WeatherType;
  inventory: InventorySlot[];
  structures: PlacedStructure[];
  visitedBiomes: BiomeId[];
  exploredCells?: number[]; // Indices of 32x32 fog-of-war map cells discovered
  resourceStates?: SavedResourceNodeState[];
  activePickups?: WorldPickupSave[];
  hudPreferences?: { showCompass: boolean; compactHud: boolean };
  stats: GameStats;
  completedMissionIds: string[];
  discoveredLocations: string[];
}

export type ActiveModal =
  | null
  | 'inventory'
  | 'crafting'
  | 'cooking'
  | 'chest'
  | 'place'
  | 'map'
  | 'missions'
  | 'pause'
  | 'settings';

export interface NearbyInteraction {
  id: string;
  label: string;
  sublabel?: string;
  kind:
    | 'resource'
    | 'pickup'
    | 'water'
    | 'campfire'
    | 'cooking_station'
    | 'crafting_table'
    | 'storage_chest'
    | 'sleeping_area'
    | 'basic_shelter'
    | 'creature'
    | 'footprint'
    | 'dolphin'
    | 'fishing'
    | 'expedition_journal'
    | 'gun_action';
  actionCategory?: 'chop' | 'mine' | 'gather' | 'pickup' | 'craft' | 'cook' | 'use' | 'shoot';
  distance: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  structureId?: string;
  creatureId?: string;
  species?: CreatureSpecies;
  pickupItemId?: ItemId;
  pickupQuantity?: number;
}

export interface ResourceToast {
  id: string;
  text: string;
  tone: 'gain' | 'craft' | 'warning' | 'discovery' | 'info';
  itemId?: ItemId;
  quantity?: number;
}

export interface HUDStateSnapshot {
  vitals: PlayerVitals;
  dayCount: number;
  timeOfDay: number;
  weather: WeatherType;
  biome: BiomeId;
  biomeName: string;
  playerX: number;
  playerY: number;
  playerZ: number;
  playerYaw: number;
  isSwimming: boolean;
  isSprinting: boolean;
  isCrouching: boolean;
  isSheltered: boolean;
  nearFire: boolean;
  visibilityPercent: number;
  isNight: boolean;
  nocturnalActiveCount: number;
  nearbyInteraction: NearbyInteraction | null;
  inventory: InventorySlot[];
  hotbarItemIds: (ItemId | null)[];
  equippedSlot: number;
  structures: PlacedStructure[];
  visitedBiomes: BiomeId[];
  exploredCells: number[];
  stats: GameStats;
  completedMissionIds: string[];
  trackedSightings: TrackedSighting[];
  cinematicActive: boolean;
  cinematicSubtitle: string;
  gameOver: boolean;
  gameOverReason?: string;
}
