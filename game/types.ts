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

export type DimensionId =
  | 'overworld'
  | 'space'
  | 'nether'
  | 'gold'
  | 'diamond'
  | 'alien'
  | 'island_arctic'
  | 'island_volcanic'
  | 'island_jungle';

export interface PortalLinkState {
  id: string;
  pairId: string;
  sourceDim: DimensionId;
  targetDim: DimensionId;
  x: number;
  y: number;
  z: number;
  yaw: number;
  destX: number;
  destY: number;
  destZ: number;
  destYaw: number;
  isReturn: boolean;
  createdAt: number;
}

export type WeatherType = 'clear' | 'overcast' | 'rain' | 'storm';

export type ItemCategory =
  | 'resource'
  | 'tool'
  | 'weapon'
  | 'food'
  | 'structure'
  | 'equipment'
  | 'seed';

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
  | 'sugarcane'
  | 'flour'
  | 'sugar'
  | 'dough'
  | 'milk'
  | 'egg'
  | 'butter'
  | 'chocolate'
  | 'salt'
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
  | 'soap'
  | 'washed_meat'
  | 'washed_dino_meat'
  | 'dried_raw_meat'
  | 'dried_dino_meat'
  | 'cut_meat'
  | 'cut_dino_meat'
  | 'hide'
  | 'bone'
  | 'freshwater_fish'
  | 'ocean_fish'
  // Farm Vegetables
  | 'lettuce'
  | 'tomato'
  | 'cucumber'
  | 'jalapeno'
  | 'carrot'
  | 'potato'
  | 'onion'
  | 'corn'
  | 'bell_pepper'
  | 'pumpkin'
  | 'garlic'
  // Farm Seeds & Cuttings
  | 'wheat_seeds'
  | 'sugarcane_cutting'
  | 'lettuce_seeds'
  | 'tomato_seeds'
  | 'cucumber_seeds'
  | 'jalapeno_seeds'
  | 'carrot_seeds'
  | 'potato_seeds'
  | 'onion_seeds'
  | 'corn_seeds'
  | 'bell_pepper_seeds'
  | 'pumpkin_seeds'
  | 'garlic_seeds'
  // Cooked / Prepared Foods & Bakery
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
  | 'bread_loaf'
  | 'cake'
  | 'chocolate_cake'
  | 'cookies'
  | 'jalapeno_cornbread'
  | 'pumpkin_pie'
  | 'garden_salad'
  | 'fresh_salsa'
  | 'cucumber_salad'
  | 'stuffed_pepper'
  | 'vegetable_soup'
  | 'garlic_herb_roast'
  | 'hearty_stew'
  | 'grilled_fish'
  | 'roasted_mushrooms'
  // Tools & Weapons & Equipment
  | 'gun'
  | 'ammo'
  | 'stone_axe'
  | 'stone_pickaxe'
  | 'sickle'
  | 'hunting_knife'
  | 'wooden_club'
  | 'wooden_spear'
  | 'stone_warhammer'
  | 'rope'
  | 'rope_whip'
  | 'lasso'
  | 'primitive_bow'
  | 'arrows'
  | 'fishing_rod'
  | 'dirty_water_bottle'
  | 'filtered_water_bottle'
  | 'excavator_shovel'
  | 'powder_keg'
  | 'water_torrent'
  | 'drying_rack'
  | 'dried_meat'
  // Placeable Camp Structures
  | 'campfire'
  | 'sleeping_area'
  | 'storage_chest'
  | 'crafting_table'
  | 'cooking_station'
  | 'basic_shelter'
  // Structural Engineering Pieces (Load-Bearing Bridges & Cliffside Fortresses)
  | 'stone_block'
  | 'stone_pillar'
  | 'stone_arch'
  | 'timber_beam'
  | 'timber_pillar'
  // Kinetic Power Networks & Automated Assembly Machinery
  | 'water_wheel'
  | 'steam_boiler'
  | 'steam_engine'
  | 'drive_shaft'
  | 'gear_box'
  | 'belt_pulley'
  | 'fluid_pipe'
  | 'auto_assembler'
  // Modular Vehicle & Craft Parts
  | 'vehicle_chassis_kit'
  // 7-Day Blood Moon & Advanced Lost World Tech
  | 'core_shard'
  | 'glider_wings'
  | 'kinetic_grapple'
  | 'auto_turret'
  | 'smart_tv'
  | 'gold_bar'
  | 'diamond'
  | 'sapphire'
  | 'ruby'
  | 'iron_ingot'
  | 'space_crystal'
  | 'pirate_musket'
  | 'emerald'
  | 'nautical_map'
  | 'navigation_sextant'
  | 'captain_key'
  | 'space_gem'
  | 'glock_19'
  | 'desert_eagle'
  | 'colt_m1911'
  | 'magnum_44'
  | 'remington_870'
  | 'mossberg_590'
  | 'sawed_off'
  | 'mp5'
  | 'uzi'
  | 'vector'
  | 'ak_47'
  | 'm4a1'
  | 'scar_h'
  | 'fn_fal'
  | 'barrett_50'
  | 'remington_700'
  | 'm249_saw'
  // Dimensional Portal Gun & Multiverse Gear / Loot
  | 'portal_gun'
  | 'alien_plasma_gun'
  | 'inferno_blade'
  | 'diamond_ammo'
  | 'crystal_armor'
  | 'nether_ember'
  | 'alien_core'
  | 'diamond_crystal';

export type StructuralBlockKind =
  | 'stone_block'
  | 'stone_pillar'
  | 'stone_arch'
  | 'timber_beam'
  | 'timber_pillar';

export type KineticNodeKind =
  | 'water_wheel'
  | 'steam_boiler'
  | 'steam_engine'
  | 'drive_shaft'
  | 'gear_box'
  | 'belt_pulley'
  | 'fluid_pipe'
  | 'auto_assembler';

export interface KineticNode {
  id: string;
  kind: KineticNodeKind;
  x: number;
  y: number;
  z: number;
  rotationY: number;
  rpm: number; // Signed angular speed (gears reverse polarity!)
  torque: number;
  steamPsi: number; // 0..100 PSI pressure in boiler/pipe/engine network
  waterFlow: number; // 0..1 flow pressure in river/pipe network
  active: boolean;
  stalled: boolean;
  cycleProgress: number; // 0..1 assembler production cycle
  storedOutputCount: number; // Manufactured parts ready in auto_assembler buffer
  connectedIds: string[];
}

export interface BeltLink {
  id: string;
  fromId: string;
  toId: string;
  fromX: number;
  fromY: number;
  fromZ: number;
  toX: number;
  toY: number;
  toZ: number;
  distance: number;
  active: boolean;
  rpm: number;
}

export type VehicleModuleKind =
  | 'cockpit_seat'
  | 'chassis_frame'
  | 'armor_plate'
  | 'offroad_wheel'
  | 'steam_engine_pod'
  | 'boat_hull'
  | 'rotor_wing'
  | 'steering_rudder'
  | 'storage_rack';

export interface VehicleModulePlacement {
  id: string;
  kind: VehicleModuleKind;
  gx: number; // -2..2 lateral
  gy: number; // 0..2 vertical
  gz: number; // -3..3 longitudinal (+Z = forward nose)
}

export interface ModularVehicleData {
  id: string;
  name: string;
  paintColor: string;
  preset?: string;
  rimColor?: string;
  suspensionOffset?: number;
  wheelScale?: number;
  hydraulicHop?: boolean;
  turboBoost?: number;
  trunkBassEnabled?: boolean;
  underglowColor?: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  vx: number;
  vy: number;
  vz: number;
  hp: number;
  maxHp: number;
  fuel: number; // Steam coal/wood fuel 0..100
  modules: VehicleModulePlacement[];
  cargoItems: InventorySlot[];
  dimension?: DimensionId;
}

export interface KineticHudSummary {
  nodeCount: number;
  beltSpanCount: number;
  totalRpmOutput: number;
  maxSteamPsi: number;
  activeAssemblers: number;
  readyProducts: number;
  targetNode: {
    id: string;
    name: string;
    kind: KineticNodeKind;
    rpm: number;
    torque: number;
    steamPsi: number;
    waterFlow: number;
    active: boolean;
    readyProducts: number;
    cycleProgress: number;
  } | null;
}

export type HydraulicMode =
  | 'level'
  | 'front_hop'
  | 'rear_hop'
  | 'left_tilt'
  | 'right_tilt'
  | 'lock_up'
  | 'drop_down';

export interface ActiveVehicleHudState {
  id: string;
  name: string;
  preset?: string;
  craftClass: 'Land Rover' | 'Steam Boat' | 'Amphibious Craft' | 'Gyro Airship' | 'Armored Rig';
  speedKmh: number;
  altitudeM: number;
  steamPsi: number;
  fuel: number;
  hp: number;
  maxHp: number;
  inWater: boolean;
  airborne: boolean;
  canFloat: boolean;
  canFly: boolean;
  hasHydraulics: boolean;
  hydraulicStyle: 'full_bounce' | 'up_down_side';
  hydraulicMode: HydraulicMode;
  hasTrunkBass: boolean;
  trunkBassOn: boolean;
  highClearance: boolean;
  cargoUsed: number;
  cargoCapacity: number;
}

export interface StructuralBlock {
  id: string;
  kind: StructuralBlockKind;
  gx: number;
  gy: number;
  gz: number;
  x: number;
  y: number;
  z: number;
  rotationY: number;
  stress: number; // 0..1 safe/strained, >= 1.0 critical collapse
  anchored: boolean;
  supportHops: number;
  bucklingTimer: number; // > 0 when actively buckling before detaching
  dimension?: DimensionId;
}

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
  weaponClass?: WeaponMaterialClass;
  preferredResource?: 'wood' | 'stone' | 'meat' | 'plant';
  hungerRestore?: number;
  thirstRestore?: number;
  healthRestore?: number;
  staminaRestore?: number;
  structureType?: CampStructureType;
  structuralKind?: StructuralBlockKind;
  kineticKind?: KineticNodeKind;
}

export type FirearmReloadMode = 'magazine' | 'single';

export type FirearmSoundProfile =
  | 'pistol'
  | 'shotgun'
  | 'smg'
  | 'rifle'
  | 'sniper'
  | 'lmg'
  | 'musket'
  | 'plasma';

export interface FirearmSpec {
  magSize: number;
  reloadTime: number;
  reloadMode: FirearmReloadMode;
  fireRate: number;
  pelletCount: number;
  spread: number;
  recoil: number;
  damage: number;
  muzzleSpeed: number;
  range: number;
  autoFire: boolean;
  caliberLabel: string;
  soundProfile: FirearmSoundProfile;
}

export type BodyZone = 'head' | 'chest' | 'limb';

export type ArmorMaterialTier = 'none' | 'hide' | 'bone' | 'stone';

export type WeaponMaterialClass =
  | 'blunt_heavy'
  | 'blade'
  | 'pierce'
  | 'ballistic'
  | 'blunt_light';

export interface ZoneArmorState {
  tier: ArmorMaterialTier;
  hp: number;
  maxHp: number;
}

export type CreatureZoneArmor = Record<BodyZone, ZoneArmorState>;

export interface TargetHitboxSnapshot {
  creatureId: string;
  name: string;
  hp: number;
  maxHp: number;
  zone: BodyZone;
  armorTier: ArmorMaterialTier;
  armorHp: number;
  armorMaxHp: number;
  isGapSlip: boolean;
  reactionHint: string;
  blinded: boolean;
  staggered: boolean;
  isBoss?: boolean;
  distance: number;
}

export interface MomentumHudState {
  wallRunning: boolean;
  wallSide: -1 | 0 | 1;
  vaulting: boolean;
  speedMps: number;
  kickCooldown: number;
  nearCaveBoss: boolean;
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

export type GameMode = 'survival' | 'boss_hunt' | 'sandbox';

export type CampStructureType =
  | 'campfire'
  | 'sleeping_area'
  | 'storage_chest'
  | 'crafting_table'
  | 'cooking_station'
  | 'basic_shelter'
  | 'gravity_monolith'
  | 'spike_barricade'
  | 'timeshift_sundial'
  | 'auto_turret'
  | 'smart_tv'
  | 'drying_rack';

export interface PlacedStructure {
  id: string;
  type: CampStructureType;
  x: number;
  y: number;
  z: number;
  rotationY: number;
  chestItems?: InventorySlot[];
  dryingSlots?: { itemId: ItemId; quantity: number; progress: number }[];
  lit?: boolean;
  dimension?: DimensionId;
}

export interface PlantedCrop {
  id: string;
  seedItemId: ItemId;
  produceItemId: ItemId;
  x: number;
  y: number;
  z: number;
  growthProgress: number; // 0 to 1
  watered: boolean;
  mature: boolean;
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
  | 'sugarcane_patch'
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
  dimension?: DimensionId;
}

export interface SavedResourceNodeState {
  id: string;
  hp: number;
  respawnTimer: number;
  felled?: boolean;
}

export type CreatureSpecies =
  // Ordinary Island, Wild & Homestead Wildlife
  | 'deer'
  | 'rabbit'
  | 'wild_boar'
  | 'pig'
  | 'cattle'
  | 'horse'
  | 'sheep'
  | 'jungle_fowl'
  | 'goat'
  | 'duck'
  | 'barn_cat'
  | 'grizzly_bear'
  | 'gray_wolf'
  | 'african_lion'
  | 'bald_eagle'
  | 'red_fox'
  | 'saltwater_crocodile'
  | 'bison'
  | 'great_horned_owl'
  | 'bird'
  | 'fish_school'
  // Expanded Global Wild Animals, Arctic, Savanna, Jungle & Birds
  | 'elephant'
  | 'reindeer'
  | 'giraffe'
  | 'zebra'
  | 'rhinoceros'
  | 'hippopotamus'
  | 'tiger'
  | 'cheetah'
  | 'hyena'
  | 'polar_bear'
  | 'moose'
  | 'penguin'
  | 'gorilla'
  | 'kangaroo'
  | 'camel'
  | 'toucan'
  | 'flamingo'
  | 'peregrine_falcon'
  | 'ostrich'
  // Marine Interactive
  | 'dolphin'
  | 'sea_turtle'
  | 'great_white_shark'
  | 'manta_ray'
  // Prehistoric Dinosaurs & Pterosaurs
  | 'trex'
  | 'triceratops'
  | 'velociraptor'
  | 'stegosaurus'
  | 'brachiosaurus'
  | 'parasaurolophus'
  | 'spinosaurus'
  | 'ankylosaurus'
  | 'allosaurus'
  | 'dilophosaurus'
  | 'diplodocus'
  | 'pteranodon';

export type CreatureTemperament =
  | 'apex_predator'
  | 'pack_predator'
  | 'defensive_herbivore'
  | 'timid_herbivore'
  | 'domestic_calm'
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

export type GraphicsPreset = 'ultra' | 'balanced' | 'performance';
export type DrawDistanceTier = 'near' | 'medium' | 'far';
export type TvSafetyMode = 'auto' | 'safe_mini' | 'full_3d';

export interface GameSettings {
  masterVolume: number;
  sfxEnabled: boolean;
  ambienceEnabled: boolean;
  graphicsQuality: 'balanced' | 'high';
  graphicsPreset?: GraphicsPreset;
  shadowsEnabled?: boolean;
  waterReflectionsEnabled?: boolean;
  particlesEnabled?: boolean;
  drawDistance?: DrawDistanceTier;
  dynamicAutoFps?: boolean;
  tvSafetyMode?: TvSafetyMode;
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

export const TOTAL_BACKPACK_COMPARTMENTS = 1_000_005_000;
export const MAX_HUD_BAR_SLOTS = 5000;
export const DEFAULT_HUD_BAR_SLOTS = 9;

export interface BackpackCompartmentEntry {
  compartmentId: number; // 1 .. TOTAL_BACKPACK_COMPARTMENTS
  itemId: ItemId;
  quantity: number;
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
    hudBarCapacity?: number;
  };
  dayCount: number;
  timeOfDay: number;
  weather?: WeatherType;
  inventory: InventorySlot[];
  backpackCompartments?: BackpackCompartmentEntry[];
  structures: PlacedStructure[];
  structuralBlocks?: StructuralBlock[];
  kineticNodes?: KineticNode[];
  modularVehicles?: ModularVehicleData[];
  terrainDeltas?: [number, number][]; // sparse [vertexIndex, deltaY] persisted craters/channels
  coins?: number;
  plantedCrops?: PlantedCrop[];
  fridgeItems?: InventorySlot[];
  visitedBiomes: BiomeId[];
  exploredCells?: number[]; // Indices of 32x32 fog-of-war map cells discovered
  resourceStates?: SavedResourceNodeState[];
  activePickups?: WorldPickupSave[];
  activeCarcasses?: CarcassSaveData[];
  hudPreferences?: { showCompass: boolean; compactHud: boolean };
  stats: GameStats;
  completedMissionIds: string[];
  discoveredLocations: string[];
  gameMode?: GameMode;
  tvChannel?: number;
  tvPower?: boolean;
  tvEmbedSrc?: string;
  tvTitle?: string;
  tvCategory?: string;
  tvTimestamp?: number;
  tvVolume?: number;
  tvIsMuted?: boolean;
  tvAutoCycle?: boolean;
  tvPaused?: boolean;
  tamedCreatures?: { species: CreatureSpecies; name: string }[];
  weaponMagazines?: Partial<Record<ItemId, number>>;
  baseArmoryOpened?: boolean;
  currentDimension?: DimensionId;
  selectedPortalDimension?: DimensionId;
  activePortals?: PortalLinkState[];
  unlockedGildedPaint?: boolean;
  crystalArmorHp?: number;
  visitedDimensions?: DimensionId[];
}

export interface CarcassSaveData {
  id: string;
  species: CreatureSpecies;
  displayName: string;
  isDino: boolean;
  x: number;
  y: number;
  z: number;
  yaw: number;
  drops: { itemId: ItemId; quantity: number }[];
  life: number;
}

export type ActiveModal =
  | null
  | 'inventory'
  | 'crafting'
  | 'cooking'
  | 'stove'
  | 'chest'
  | 'fridge'
  | 'farmer'
  | 'tv'
  | 'drying_rack'
  | 'place'
  | 'vehicles'
  | 'vehicle_cargo'
  | 'map'
  | 'missions'
  | 'pause'
  | 'settings'
  | 'console'
  | 'multiplayer'
  | 'mods'
  | 'multiverse'
  | 'menu_drawer';

export interface NearbyInteraction {
  id: string;
  label: string;
  sublabel?: string;
  kind:
    | 'resource'
    | 'pickup'
    | 'carcass'
    | 'water'
    | 'campfire'
    | 'cooking_station'
    | 'crafting_table'
    | 'storage_chest'
    | 'sleeping_area'
    | 'basic_shelter'
    | 'gravity_monolith'
    | 'spike_barricade'
    | 'timeshift_sundial'
    | 'auto_turret'
    | 'smart_tv'
    | 'drying_rack'
    | 'creature'
    | 'mount'
    | 'tame'
    | 'footprint'
    | 'dolphin'
    | 'fishing'
    | 'expedition_journal'
    | 'gun_action'
    | 'clean_bottle'
    | 'wash_meat'
    | 'cut_meat'
    | 'tool_action'
    | 'farmer'
    | 'planted_crop'
    | 'house_couch'
    | 'house_bed'
    | 'house_tv'
    | 'house_fridge'
    | 'house_stove'
    | 'house_toilet'
    | 'house_sink'
    | 'house_shower'
    | 'structural_block'
    | 'kinetic_node'
    | 'modular_vehicle'
    | 'shipwreck'
    | 'garage_bench'
    | 'armory_chest'
    | 'portal';
  actionCategory?:
    | 'chop'
    | 'mine'
    | 'gather'
    | 'pickup'
    | 'craft'
    | 'cook'
    | 'use'
    | 'shoot'
    | 'attack'
    | 'harvest'
    | 'clean'
    | 'search';
  distance: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  structureId?: string;
  creatureId?: string;
  species?: CreatureSpecies;
  pickupItemId?: ItemId;
  pickupQuantity?: number;
  carcassId?: string;
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
  nearOceanWater: boolean;
  nearLakeWater?: boolean;
  hasWashableMeat?: boolean;
  hasSoap?: boolean;
  hasDriedMeatToCut?: boolean;
  visibilityPercent: number;
  isNight: boolean;
  nocturnalActiveCount: number;
  coins: number;
  seatedLabel: string | null;
  plantedCrops: PlantedCrop[];
  fridgeItems: InventorySlot[];
  nearbyInteraction: NearbyInteraction | null;
  nearbyCarcass: {
    id: string;
    displayName: string;
    summary: string;
    hasKnife: boolean;
    distance: number;
  } | null;
  inventory: InventorySlot[];
  hotbarItemIds: (ItemId | null)[];
  equippedSlot: number;
  hudBarCapacity: number;
  maxHudBarCapacity: number;
  backpackCompartments: BackpackCompartmentEntry[];
  totalBackpackCompartments: number;
  emptyCompartmentsCount: number;
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
  structuralSummary?: {
    blockCount: number;
    maxStressPercent: number;
    bucklingCount: number;
    previewStressPercent: number | null;
    previewSupported: boolean;
    previewLabel: string | null;
  };
  terrainSummary?: {
    cratersCarved: number;
    activeWaterStreams: number;
    erodedVolume: number;
    puddleCount?: number;
  };
  equippedWeaponState?: {
    itemId: ItemId;
    magCurrent: number;
    magMax: number;
    reserveAmmo: number;
    isReloading: boolean;
    reloadProgress: number;
    reloadMode: FirearmReloadMode;
    caliberLabel: string;
  } | null;
  cozyComfort?: {
    active: boolean;
    level: number;
    label: string;
    warmProtected: boolean;
    tvActive: boolean;
    restedBonus: boolean;
  };
  garageSummary?: {
    parkedCount: number;
    damagedCount: number;
    needsFuelCount: number;
  };
  targetHitbox?: TargetHitboxSnapshot | null;
  momentumState?: MomentumHudState;
  kineticSummary?: KineticHudSummary;
  vehicles?: ModularVehicleData[];
  activeVehicle?: ActiveVehicleHudState | null;
  selectedCargoVehicleId?: string | null;
  gameMode?: GameMode;
  bloodMoonActive?: boolean;
  daysUntilBloodMoon?: number;
  bossesDefeatedCount?: number;
  objectiveText?: string;
  hitMarkerActive?: boolean;
  tvState?: {
    power: boolean;
    channel: number;
    channelName: string;
    title: string;
    category: string;
    embedSrc: string;
    volume: number;
    isMuted: boolean;
    isZoomedToTv: boolean;
    autoCycle: boolean;
    isPaused: boolean;
    isStopped?: boolean;
    currentTime: number;
    isLocalVideo?: boolean;
    localVideoName?: string;
    isYouTubeActive?: boolean;
    youtubeVideoId?: string;
    youtubeTitle?: string;
    youtubeChannel?: string;
    spatialVolume?: number;
    safetyMode?: TvSafetyMode;
    effectiveSafetyMode?: TvSafetyMode;
  };
  buildGhost?: {
    visible: boolean;
    valid: boolean;
    x: number;
    y: number;
    z: number;
    rotationY: number;
    label: string;
    snapGrid: boolean;
  } | null;
  currentBossTarget?: {
    name: string;
    biome: string;
    distance: number;
    hp: number;
    maxHp: number;
  } | null;
  multiplayerState?: MultiplayerStatusSnapshot;
  modState?: ModSystemSnapshot;
  currentDimension?: DimensionId;
  currentDimensionName?: string;
  selectedPortalDimension?: DimensionId;
  activePortals?: PortalLinkState[];
  visitedDimensions?: DimensionId[];
  unlockedGildedPaint?: boolean;
  crystalArmorHp?: number;
  crystalArmorMaxHp?: number;
  portalNearHint?: string | null;
}

export interface ModGameplayTweaks {
  moveSpeedMultiplier: number;
  gravityMultiplier: number;
  damageMultiplier: number;
  dayLengthMultiplier: number;
  jumpMultiplier: number;
  gatherYieldMultiplier: number;
  vehicleSpeedMultiplier: number;
}

export interface CustomModAsset {
  id: string;
  name: string;
  format: 'gltf' | 'glb' | 'obj';
  sourceType: 'file' | 'url';
  sourceUrl?: string;
  x: number;
  y: number;
  z: number;
  scale: number;
  rotationY: number;
  meshCount: number;
}

export interface CustomModScript {
  id: string;
  name: string;
  sourceUrl?: string;
  code: string;
  enabled: boolean;
  lastError?: string;
}

export interface ModExportBundle {
  format: 'survival-island-modpack-v1';
  exportedAt: number;
  tweaks: ModGameplayTweaks;
  scripts: { name: string; sourceUrl?: string; code: string; enabled: boolean }[];
  build?: {
    structures: PlacedStructure[];
    structuralBlocks: StructuralBlock[];
    vehicles: ModularVehicleData[];
  };
}

export interface ModSystemSnapshot {
  tweaks: ModGameplayTweaks;
  assets: CustomModAsset[];
  scripts: CustomModScript[];
}

export interface MultiplayerPeerInfo {
  peerId: string;
  name: string;
  x: number;
  y: number;
  z: number;
  biome: string;
  connected: boolean;
  transport: 'webrtc' | 'relay' | 'local';
}

export interface MultiplayerStatusSnapshot {
  connected: boolean;
  isHost: boolean;
  roomCode: string | null;
  localPeerId: string;
  playerName: string;
  peers: MultiplayerPeerInfo[];
  pvpEnabled: boolean;
  statusMessage: string;
  chatLog?: { peerId: string; name: string; text: string; time: number }[];
  micMuted?: boolean;
  micEnabled?: boolean;
  voiceMode?: 'party' | 'proximity';
  localSpeaking?: boolean;
  speakingPeers?: string[];
}


