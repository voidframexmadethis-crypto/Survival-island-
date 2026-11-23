import { EcosystemSimulationData } from './systems/livingEcosystemSystem';

export type BiomeId =
  | 'ocean'
  | 'beach'
  | 'forest'
  | 'flower_forest'
  | 'birch_forest'
  | 'old_growth_birch_forest'
  | 'dark_forest'
  | 'pale_garden'
  | 'taiga'
  | 'old_growth_pine_taiga'
  | 'old_growth_spruce_taiga'
  | 'snowy_taiga'
  | 'jungle'
  | 'sparse_jungle'
  | 'bamboo_jungle'
  | 'grassland'
  | 'plains'
  | 'sunflower_plains'
  | 'snowy_plains'
  | 'ice_spikes'
  | 'meadow'
  | 'cherry_grove'
  | 'grove'
  | 'snowy_slopes'
  | 'jagged_peaks'
  | 'frozen_peaks'
  | 'stony_peaks'
  | 'windswept_hills'
  | 'windswept_gravelly_hills'
  | 'windswept_forest'
  | 'desert'
  | 'savanna'
  | 'savanna_plateau'
  | 'windswept_savanna'
  | 'badlands'
  | 'wooded_badlands'
  | 'eroded_badlands'
  | 'swamp'
  | 'mangrove_swamp'
  | 'frozen_river'
  | 'snowy_beach'
  | 'stony_shore'
  | 'warm_ocean'
  | 'lukewarm_ocean'
  | 'cold_ocean'
  | 'frozen_ocean'
  | 'mushroom_fields'
  | 'river'
  | 'lake'
  | 'mountain'
  | 'cave'
  | 'expedition'
  | 'dragon_valley'
  | 'viking_village'
  | 'resort_corner'
  | 'ruined_castle';

export type DimensionId =
  | 'overworld'
  | 'space'
  | 'nether'
  | 'gold'
  | 'diamond'
  | 'alien'
  | 'island_arctic'
  | 'island_volcanic'
  | 'island_jungle'
  | 'bee_dimension';

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
  | 'coconut_biofuel'
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
  | 'beans'
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
  | 'cheese'
  | 'cheeseburger'
  | 'burnt_food'
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
  | 'car_key'
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
  | 'diamond_crystal'
  | 'coaster_station'
  | 'totem_of_undying';

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
  carId?: string;
  name: string;
  paintColor: string;
  accentColor?: string;
  preset?: string;
  rimColor?: string;
  horsepower?: number;
  topSpeedMph?: number;
  zeroToSixtySec?: number;
  engineLabel?: string;
  suspensionOffset?: number;
  wheelScale?: number;
  hydraulicHop?: boolean;
  hasAirbagSuspension?: boolean;
  airbagSpeed?: number; // 0.25 (slow long hiss) .. 2.0 (fast sharp hiss + bounce)
  airbagLockLevel?: number; // 0.4 .. 1.4 adjustable lock-up height
  /** Display-only garage builds are animated but cannot be driven; they can be pushed. */
  displayOnly?: boolean;
  hydraulicBounceBoost?: number; // >1 gives extra vertical travel on tall coil-over builds
  hasConvertibleTop?: boolean;
  convertibleTopDown?: boolean;
  doorsOpen?: boolean;
  /** Right-side door only, used when boarding the ferry as a passenger. */
  passengerDoorOpen?: boolean;
  trunkOpen?: boolean;
  turboBoost?: number;
  trunkBassEnabled?: boolean;
  underglowColor?: string;
  underglowEnabled?: boolean;
  rimLightMode?: 'off' | 'solid' | 'blink' | 'music';
  rimLightColor?: string;
  hydraulicsDanceEnabled?: boolean;
  /** Parked hydraulic pose that remains visible after exiting the car. */
  hydraulicStance?: 'three_wheel';
  livery?: {
    channelName: string;
    ctaText: string;
    accentColor: string;
    bodyColor?: string;
  };
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
  | 'drop_down'
  | 'front_lock'
  | 'rear_lock'
  | 'side_to_side'
  | 'three_wheel';

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
  hydraulicStyle: 'full_bounce' | 'up_down_side' | 'airbag_coilover';
  hydraulicMode: HydraulicMode;
  hasAirbagSuspension: boolean;
  airbagSpeed: number;
  airbagLockLevel: number;
  doorsOpen: boolean;
  trunkOpen: boolean;
  hasConvertibleTop: boolean;
  convertibleTopDown: boolean;
  convertibleTopProgress: number;
  interiorView: boolean;
  hasTrunkBass: boolean;
  trunkBassOn: boolean;
  isOldSchool?: boolean;
  radioMode?: 'OLD_SCHOOL_TRUNK_AND_CHEST_BASS' | 'STANDARD_RADIO';
  trunkPumpLevel?: number;
  chestThumpLevel?: number;
  hasRimLights?: boolean;
  rimLightMode?: 'off' | 'solid' | 'blink' | 'music';
  rimLightColor?: string;
  hasUnderglow?: boolean;
  underglowEnabled?: boolean;
  underglowColor?: string;
  slammedStance?: boolean;
  liftHeightInches?: number;
  hydraulicsDanceEnabled?: boolean;
  hasSubwooferWall?: boolean;
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

export type WorldType = 'island' | 'flat';

export type FlatSurfaceStyle = 'turf_grid' | 'concrete_plaza';

export type PlayerGender = 'boy' | 'girl';

export type NavigatorTask =
  | 'follow'
  | 'chop_trees'
  | 'hunt_animals'
  | 'lead_shelter'
  | 'drive_car'
  | 'stay';

export type NavigatorDeparturePhase =
  | 'active'
  | 'swim_to_wood'
  | 'climb_wood'
  | 'sitting_wood'
  | 'heartbroken_notice'
  | 'returning_to_shore'
  | 'dropping_gun'
  | 'walking_into_ocean'
  | 'fading_away'
  | 'gone';

export type NavigatorRelationship = 'companion' | 'departed';

/** Persisted separately from survival progress so a departed navigator never respawns. */
export interface NavigatorCompanionSaveData {
  gender: PlayerGender;
  x: number;
  y: number;
  z: number;
  yaw: number;
  task: NavigatorTask;
  departurePhase: NavigatorDeparturePhase;
  relationship: NavigatorRelationship;
  cinematicSeen: boolean;
  droppedGunPos?: { x: number; y: number; z: number } | null;
}

export interface NavigatorCompanionHudState {
  gender: PlayerGender;
  name: string;
  task: NavigatorTask;
  statusText: string;
  allowDriving: boolean;
  isDrivingVehicleId: string | null;
  distanceToPlayer: number;
  distanceToShelter: number;
  equippedTool: 'gun' | 'axe' | 'map';
  backpackItems: InventorySlot[];
  treesChopped: number;
  animalsHunted: number;
  departurePhase: NavigatorDeparturePhase;
  relationship: NavigatorRelationship;
  speechLine: string | null;
  droppedGunPos: { x: number; y: number; z: number } | null;
  gone: boolean;
  departed: boolean;
  sittingAtWreck: boolean;
}

export function resolveAllowedGameMode(
  worldType: WorldType,
  requestedMode?: GameMode,
): GameMode {
  if (worldType === 'flat') {
    return 'sandbox';
  }
  if (
    requestedMode === 'survival' ||
    requestedMode === 'boss_hunt' ||
    requestedMode === 'sandbox'
  ) {
    return requestedMode;
  }
  return 'survival';
}

export type CoasterSegmentKind =
  | 'station'
  | 'chain_lift'
  | 'lsm_launch'
  | 'coast'
  | 'trim_brake'
  | 'block_brake'
  | 'splashdown'
  | 'inversion';

export interface SavedCoasterNode {
  position: { x: number; y: number; z: number };
  bank: number;
  segmentType?: CoasterSegmentKind;
  targetSpeed?: number;
}

export type CoasterModelType =
  | 'sit_down'
  | 'tilt'
  | 'single_rail'
  | 'hybrid_classic'
  | 'hybrid_modern'
  | 'wood_3row'
  | 'classic_hyper'
  | 'twister_hyper'
  | 'twister_hyper_staggered'
  | 'twister_dive'
  | 'twister_invert'
  | 'twister_wing'
  | 'lay_down'
  | 'classic_corkscrew'
  | 'blitz_lapbar'
  | 'blitz_wide'
  | 'air_launch_classic'
  | 'air_launch_modern'
  | 'air_launch_wide'
  | 'rocket_lapbar'
  | 'rocket_otsr'
  | 'sky_launch'
  | 'wooden'
  | 'steel'
  | 'inverted'
  | 'flying'
  | 'standup'
  | 'log_flume';

export interface SavedCoasterData {
  id: string;
  name: string;
  trackColor: string;
  trainCarCount: number;
  stationPos: { x: number; y: number; z: number };
  nodes: SavedCoasterNode[];
  pieceTags?: string[];
  closedCircuit?: boolean;
  coasterType?: CoasterModelType;
}

export interface CoasterHudSummaryItem {
  id: string;
  name: string;
  trackColor: string;
  nodeCount: number;
  trackLengthM: number;
  trainCarCount: number;
  running: boolean;
  valid: boolean;
  validationErrors: string[];
  speedKmh: number;
  maxHeightM?: number;
  estPeakSpeedKmh?: number;
  inversionsCount?: number;
  isCompleteCircuit?: boolean;
  verticalG?: number;
  lateralG?: number;
  segmentLabel?: string;
  coasterType?: CoasterModelType;
  nodes: SavedCoasterNode[];
}

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
  | 'drying_rack'
  | 'coaster_station';

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
  | 'oak_tree'
  | 'dark_oak_tree'
  | 'huge_red_mushroom'
  | 'huge_brown_mushroom'
  | 'banyan_tree'
  | 'highland_cedar'
  | 'birch_tree'
  | 'old_growth_birch_tree'
  | 'pale_oak_tree'
  | 'taiga_pine_tree'
  | 'old_growth_pine_tree'
  | 'spruce_tree'
  | 'mega_spruce_tree'
  | 'snowy_spruce_tree'
  | 'jungle_tree'
  | 'mega_jungle_tree'
  | 'cherry_tree'
  | 'bee_nest_oak'
  | 'acacia_tree'
  | 'swamp_oak_tree'
  | 'mangrove_tree'
  | 'cactus_plant'
  | 'blue_orchid_patch'
  | 'terracotta_spire'
  | 'coral_cluster'
  | 'jungle_bush'
  | 'bamboo_stalk'
  | 'flower_patch'
  | 'sunflower_patch'
  | 'pink_petals'
  | 'rose_bush'
  | 'lilac_bush'
  | 'peony_bush'
  | 'eyeblossom_patch'
  | 'dead_bush'
  | 'melon_patch'
  | 'ice_spike'
  | 'mossy_cobble_boulder'
  | 'branch_pile'
  | 'small_stone'
  | 'stone_boulder'
  | 'mountain_rock'
  | 'ore_vein'
  | 'emerald_ore_vein'
  | 'gold_ore_vein'
  | 'flint_outcrop'
  | 'fiber_fern'
  | 'grass_tuft'
  | 'wheat_patch'
  | 'bean_patch'
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
  fallDuration?: number;
  fallImpactDone?: boolean;
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
  // Biome-Specific Wildlife & Pale Garden Creaking
  | 'bee'
  | 'creaking'
  | 'white_fox'
  | 'parrot'
  | 'ocelot'
  | 'panda'
  // Woodland Mansion & Pillager Outpost Illager Enemies
  | 'vex'
  | 'evoker'
  | 'pillager'
  | 'witch'
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
  hygiene?: number; // 0..100 (100 = clean, 0 = filthy)
  fatigue?: number; // 0..100 (0 = well rested, 100 = exhausted)
  injuryState?: 'healthy' | 'bruised' | 'bleeding' | 'fractured';
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

export type GraphicsPreset = 'low' | 'medium' | 'high' | 'ultra';
export type DrawDistanceTier = 'near' | 'medium' | 'far';
export type TvSafetyMode = 'auto' | 'safe_mini' | 'full_3d';
export type TvBassMode = 'off' | 'trunk' | 'extreme';

export interface GameSettings {
  masterVolume: number;
  sfxEnabled: boolean;
  ambienceEnabled: boolean;
  graphicsQuality: GraphicsPreset;
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
  worldType?: WorldType;
  worldName?: string;
  flatSurfaceStyle?: FlatSurfaceStyle;
  gameMode?: GameMode;
  playerGender?: PlayerGender;
  dayCount: number;
  timeOfDay: number;
  biome: BiomeId;
  health: number;
  structuresCount: number;
  coastersCount?: number;
  missionsCompleted: number;
}

export const TOTAL_BACKPACK_COMPARTMENTS = 12_000_000_000;
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
    gender?: PlayerGender;
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
  worldType?: WorldType;
  worldName?: string;
  flatSurfaceStyle?: FlatSurfaceStyle;
  gameMode?: GameMode;
  coasters?: SavedCoasterData[];
  amusementParks?: import('./systems/amusementParkRuntime').SavedAmusementPark[];
  waterpark?: import('./world/waterparkLayout').WaterparkSavedState;
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
  tvBassMode?: TvBassMode;
  tamedCreatures?: { species: CreatureSpecies; name: string }[];
  weaponMagazines?: Partial<Record<ItemId, number>>;
  baseArmoryOpened?: boolean;
  currentDimension?: DimensionId;
  selectedPortalDimension?: DimensionId;
  activePortals?: PortalLinkState[];
  unlockedGildedPaint?: boolean;
  crystalArmorHp?: number;
  visitedDimensions?: DimensionId[];
  ecosystem?: EcosystemSimulationData;
  lostWorld?: import('./systems/lostWorldExpansion').LostWorldState;
  clearedStructureIds?: string[];
  caveProgress?: import('./systems/caveSystem').CaveCompactSave;
  finalIsland?: import('./systems/finalIslandFeatures').FinalIslandSaveState;
  mainland?: import('./systems/louisianaMainland').MainlandSaveState;
  dragonValleySave?: import('./systems/dragonValleySystem').DragonValleySaveData;
  vikingVillageSave?: import('./systems/vikingVillageSystem').VikingVillageSaveData;
  navigatorCompanion?: NavigatorCompanionSaveData;
  ferryVoyage?: import('./systems/louisianaFerryVoyage').LouisianaFerrySaveState;
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
  owner?: 'player' | 'world';
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
  | 'controls'
  | 'pause'
  | 'settings'
  | 'console'
  | 'multiplayer'
  | 'mods'
  | 'multiverse'
  | 'menu_drawer'
  | 'music_studio'
  | 'coaster'
  | 'ecosystem_journal'
  | 'dragon_sanctuary'
  | 'exchange'
  | 'vault_store'
  | 'custom_marketplace'
  | 'saturn_rocket'
  | 'underground_elevator'
  | 'car_radio'
  | 'navigator_companion'
  | 'viking_village'
  | 'air_shuttle_entertainment'
  | 'mainland'
  | 'lost_world';

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
    | 'house_music_studio'
    | 'house_studio_drums'
    | 'house_studio_booth'
    | 'house_door'
    | 'house_bowling'
    | 'structural_block'
    | 'kinetic_node'
    | 'modular_vehicle'
    | 'shipwreck'
    | 'garage_bench'
    | 'armory_chest'
    | 'portal'
    | 'coaster_station'
    | 'saturn_rocket'
    | 'island_ufo'
    | 'underground_elevator'
    | 'cave_entrance'
    | 'viking_villager'
    | 'dragon_egg'
    | 'dragon_sanctuary'
    | 'dragon_abandoned'
    | 'ferry_pickup'
    | 'ferry_dock_tv'
    | 'ferry_boarding'
    | 'ferry_room'
    | 'ferry_fuel'
    | 'air_shuttle'
    | 'mainland_terminal'
    | 'waterpark_ride'
    | 'mainland_business';
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
  cameraViewMode?: 'first_person' | 'third_person';
  isSwimming: boolean;
  isUnderwater: boolean;
  swimBreath: number;
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
  cinematicCrewShout?: string;
  playerGender?: PlayerGender;
  navigatorCompanion?: NavigatorCompanionHudState;
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
  worldType?: WorldType;
  worldName?: string;
  flatSurfaceStyle?: FlatSurfaceStyle;
  gameMode?: GameMode;
  coasters?: CoasterHudSummaryItem[];
  activeCoasterRide?: {
    coasterId: string;
    coasterName: string;
    speedKmh: number;
    heightM: number;
    progressPercent: number;
    firstPerson: boolean;
    verticalG?: number;
    lateralG?: number;
    segmentLabel?: string;
  } | null;
  activeWaterparkRide?: {
    rideId: string;
    name: string;
    kind: 'slide' | 'lazy' | 'wave' | 'bucket';
    speedKmh: number;
    heightM: number;
    progressPercent: number;
    verticalG: number;
    lateralG: number;
    segmentLabel: string;
    elapsedSeconds: number;
  } | null;
  bloodMoonActive?: boolean;
  daysUntilBloodMoon?: number;
  bossesDefeatedCount?: number;
  objectiveText?: string;
  hitMarkerActive?: boolean;
  isFlying?: boolean;
  fps: number;
  totemFlashTimer?: number;
  totemRegenSeconds?: number;
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
    bassMode?: TvBassMode;
    bassEnergy?: number;
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
  spaceState?: import('./systems/multiverseSpace').SpaceHudSnapshot;
  caveSummary?: import('./systems/caveSystem').CaveSummarySnapshot;
  finalIsland?: import('./systems/finalIslandFeatures').FinalIslandHudState;
  mainland?: import('./systems/louisianaMainland').MainlandHudState;
  airShuttle?: import('./systems/crescentCityAirShuttle').AirShuttleStatus;
  ferryFuelDrop?: {
    open: boolean;
    coconutCount: number;
    biofuelCount: number;
    tankLiters: number;
    tankCapacityLiters: number;
    litersPerCoconut: number;
    litersPerCanister: number;
    oceanBucketLiters: number;
    canFillFromOcean: boolean;
    canDrawReserve: boolean;
  };
  ferryVoyage?: {
    phase: string;
    label: string;
    direction: 'outbound' | 'return';
    destination: 'island' | 'crescent_city';
    routeProgress: number;
    routeDistanceMeters: number;
    routeLengthMeters: number;
    elapsedMs: number;
    remainingMs: number;
    durationMs: number;
    secondsToDeparture: number;
    gateLift: number;
    boatX: number;
    boatY: number;
    boatZ: number;
    boatYaw: number;
    boatRoll: number;
    speedMps: number;
    speedKnots: number;
    fuelLiters: number;
    fuelCapacityLiters: number;
    fuelPercent: number;
    engineState: string;
    engineRunning: boolean;
    lowFuel: boolean;
    fuelStarved: boolean;
    canDepart: boolean;
    minimumDepartFuelLiters: number;
    reserveLiters: number;
    reserveUsed: boolean;
    biofuelLiters: number;
    room: string | null;
    aboard: boolean;
    boardingCleared: boolean;
  };
  lostWorld?: import('./systems/lostWorldExpansion').LostWorldHudState;
  lostWorldBeat?: { title: string; subtitle: string; active: boolean };
  dragonEggs?: string[];
  vikingVillageProgress?: {
    completedQuestIds: string[];
    reputation: number;
  };
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


