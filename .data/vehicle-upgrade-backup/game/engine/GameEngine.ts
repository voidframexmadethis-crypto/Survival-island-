import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SoundEngine } from '../audio/soundEngine';
import {
  EcosystemSimulationData,
  createInitialEcosystem,
  simulateEcosystemTick,
} from '../systems/livingEcosystemSystem';
import {
  SmartTvSystem,
  TvChannelId,
  normalizeChannelId,
  normalizeTvBassMode,
} from '../systems/smartTvSystem';
import {
  FARM_SHOP_STOCK,
  FIREARM_SPECS,
  ITEMS,
  ITEM_SELL_PRICES,
  SEED_SPECS,
  isActiveWeaponItem,
  isAmmoItem,
  isFirearmItem,
  isSeedItem,
} from '../data/items';
import { STAGE_1_MISSIONS } from '../data/missions';
import { COOKING_RECIPES, CRAFTING_RECIPES } from '../data/recipes';
import {
  GRAND_FINALE_PACK,
  GrandFinaleGhostEntity,
  GrandFinalePlayerState,
  GrandFinaleZoneKey,
  TikiDrinkKey,
} from '../data/grandFinalePack';
import {
  DRAGON_VALLEY_SYSTEM,
  DragonCompanion,
  DragonElement,
  DragonFlightSystem,
  DragonPlayerRef,
} from '../systems/dragonValleySystem';
import {
  FlightAndTeleportSystem,
  FlightPlayerState,
  ISLAND_TELEPORT_DESTINATIONS,
} from '../systems/flightAndTeleportSystem';
import { sanitizeWorldAndEntities } from '../systems/worldSanitizer';
import {
  getCosmeticImageTexture,
  getCosmeticPatternTexture,
} from '../data/exchangeCatalog';
import {
  getEquippedBackpackSkin,
  getEquippedGunSkinForWeapon,
  getExchangeItemById,
} from '../systems/exchangeManager';
import {
  ActiveCreature,
  CreatureManager,
  ScavengerCarcassTarget,
} from '../systems/creatureSystem';
import {
  ActiveStructureEntity,
  StructureManager,
  StructureSite,
  registerDefaultIslandStructures,
} from '../systems/structureManager';
import {
  GUNSHOT_FLEE_DISTANCE,
  canAnimalEatCarcass,
} from '../systems/animalReactionSystem';
import {
  evaluateWeaponEffectivenessLabel,
  raycastCreatureZone,
  resolveWeaponZoneHit,
} from '../systems/combatSystem';
import {
  BELT_MAX_SPAN_METERS,
  KINETIC_SPECS,
  solveKineticNetwork,
} from '../systems/kineticPhysics';
import { rollStage1FishCatch } from '../systems/marineRoadmap';
import {
  computeVehicleSpecs,
  createVehicleFromPreset,
  VEHICLE_MODULE_SPECS,
  VehiclePresetKey,
} from '../systems/modularVehicle';
import {
  STRUCT_GRID_XZ,
  STRUCT_GRID_Y,
  STRUCTURAL_SPECS,
  gridToWorld,
  previewBlockPlacementStress,
  solveStructuralIntegrity,
  worldToGrid,
} from '../systems/structuralPhysics';
import { VolumetricTerrainEngine } from '../systems/terrainPhysics';
import { ModSystemManager } from '../systems/modManager';
import {
  DIMENSION_DEFINITIONS,
  getDimensionArrivalPoint,
} from '../systems/multiverse';
import {
  isMobileOrTouchClient,
  normalizeGraphicsPreset,
} from '../systems/saveManager';
import {
  applySafeStandardMaps,
  ensureGeometryHasUv,
  updateShaderEnvironment,
} from '../world/shaders';
import {
  P2PMultiplayerManager,
  P2PPacket,
  RemoteAnimState,
} from '../systems/p2pMultiplayer';
import {
  ActiveModalKind,
  FrameBudgetQueue,
  FrameWatchState,
  MasterRuntimeState,
  Permanent60FpsController,
  StepHandlers,
  canProcessGameplayInput,
  closeExclusiveModal,
  createFrameWatchState,
  createMasterRuntimeState,
  getRendererLoadSnapshot,
  openExclusiveModal,
  resetGameSession,
  stepClampedFrame,
  stepMasterFrame,
} from '../systems/frameBudgetQueue';
import {
  CameraViewMode,
  DEFAULT_PLAYER_CAMERA_CONFIG,
  ZeroStutterCameraController,
} from '../systems/playerCameraRig';
import {
  ActiveModal,
  ActiveVehicleHudState,
  BackpackCompartmentEntry,
  BeltLink,
  BiomeId,
  BodyZone,
  CampStructureType,
  CarcassSaveData,
  CoasterHudSummaryItem,
  CoasterModelType,
  CoasterSegmentKind,
  CreatureSpecies,
  CustomModAsset,
  CustomModScript,
  DEFAULT_HUD_BAR_SLOTS,
  DimensionId,
  FlatSurfaceStyle,
  PortalLinkState,
  FirearmReloadMode,
  GameMode,
  GameSaveData,
  GameSettings,
  GameStats,
  HUDStateSnapshot,
  HydraulicMode,
  InventorySlot,
  ItemDefinition,
  ItemId,
  MAX_HUD_BAR_SLOTS,
  ModExportBundle,
  ModGameplayTweaks,
  TOTAL_BACKPACK_COMPARTMENTS,
  KineticHudSummary,
  KineticNode,
  KineticNodeKind,
  ModularVehicleData,
  MomentumHudState,
  NavigatorTask,
  NearbyInteraction,
  PlacedStructure,
  PlantedCrop,
  PlayerGender,
  PlayerVitals,
  ResourceNodeKind,
  ResourceNodeState,
  ResourceToast,
  SavedResourceNodeState,
  StructuralBlock,
  StructuralBlockKind,
  TargetHitboxSnapshot,
  TrackedSighting,
  TvBassMode,
  VehicleModulePlacement,
  WeaponMaterialClass,
  WeatherType,
  WorldPickupSave,
  WorldType,
  resolveAllowedGameMode,
} from '../types';
import {
  BeltSpanMeshHandles,
  KineticMeshHandles,
  ModularVehicleMeshHandles,
  createBeltSpanMesh,
  createKineticNodeMesh,
  createModularVehicleMesh,
} from '../world/engineeringModels';
import { StructureEntityKind } from '../world/structureEntityModels';
import {
  HouseStationTarget,
  RemotePlayerMeshHandle,
  applyBackpackSkinToPlayerHandle,
  createCampStructureModel,
  createCarcassMesh,
  createCropPlantMesh,
  createFirstPersonHandsRig,
  createPickupMesh,
  createPowderKegMesh,
  createRemotePlayerMesh,
  createSailingShipModel,
  createSkyCelestialBodies,
  createStructuralBlockMesh,
  createWaterTorrentMesh,
  FirstPersonHandsRig,
  SkyCelestialHandles,
} from '../world/models';
import { PirateCinematicRig } from '../world/pirateCinematicRig';
import { NavigatorCompanionController } from '../systems/navigatorCompanionSystem';
import {
  createGamePerformanceMonitor,
  GamePerformanceRecorder,
} from '../systems/performanceMonitor';
import { RealisticRainSystem } from '../world/realisticRainSystem';
import {
  AUTUMN_GROVE_POS,
  BIOME_INFO,
  CAVE_POS,
  EXPEDITION_POS,
  FARMER_POS,
  FLAT_GROUND_Y,
  FLAT_PLAYER_SPAWN,
  HILL_HOUSE_POS,
  HILL_HOUSE_Y,
  HOMESTEAD_POS,
  LAKE_CENTER,
  ISLAND_UFO_POS,
  OCEAN_LEVEL,
  PILLAGER_OUTPOST_POS,
  PLAYABLE_MAX_RADIUS,
  PLAYER_SPAWN,
  SATURN_ROCKET_POS,
  SHIPWRECK_POS,
  SNOWY_IGLOO_POS,
  SNOWY_VILLAGE_POS,
  SNOWY_WOODLAND_POS,
  SWAMP_POS,
  TAIGA_VILLAGE_POS,
  UNDERGROUND_ELEVATOR_KIOSK_POS,
  UNDERGROUND_ELEVATOR_POS,
  VEHICLE_GARAGE_POS,
  WATERFALL_POS,
  WHEATFIELD_POS,
  WOODLAND_MANSION_POS,
  exportSparseTerrainDeltas,
  getBiomeAt,
  getHilltopBaseFloorY,
  getLandmarkFloorY,
  getPlayableMaxRadius,
  getTerrainHeight,
  getTerrainSlope,
  getWaterLevelAt,
  importSparseTerrainDeltas,
  isFreshwaterAt,
  resetTerrainDeformation,
  setActiveTerrainWorldType,
} from '../world/terrain';
import {
  ALIEN_SPACE_SYSTEM,
  MULTIVERSE_SPACE_ENGINE,
  SATURN_V_LAUNCH_CONTROLLER,
  SpaceHudSnapshot,
  SpacePlanet,
  StarSystemData,
} from '../systems/multiverseSpace';
import {
  SpacePlanetArenaHandles,
  buildSpacePlanetArena,
} from '../world/saturnRocketModel';
import {
  createGarageDanceState,
  ELEVATOR_EXOTIC_LIFT,
  ELEVATOR_VOICE_COMPUTER,
  ExoticElevatorCar,
  GarageDanceState,
  resolveElevatorCarQuery,
  stepGarageHydraulicsDance,
  VAULT_COMPUTER_VOICE,
} from '../systems/undergroundElevator';
import {
  CABIN_BASS_AND_FIRST_PERSON,
  CAR_RADIO_TRUNK_SYSTEM,
  DrivingCameraMode,
  RadioCarDescriptor,
} from '../systems/carRadioSystem';
import {
  buildIslandWorld,
  CaveCeilingCluster,
  ShipwreckChestHandle,
  WorldHandles,
} from '../world/worldBuilder';
import { buildFlatWorld, FlatWorldHandles } from '../world/flatWorldBuilder';
import {
  CoasterPiecePresetKey,
  RollerCoasterRuntime,
} from '../systems/rollerCoasterRuntime';
import { CustomInversion } from '../systems/rollerCoasterSystem';
import { RealisticOcean } from '../world/RealisticOcean';
import {
  applyRealisticMeshLightingPass,
  enableRealisticIslandLighting,
} from '../world/realisticLighting';
import {
  buildDimensionWorld,
  createPortalVortexMesh,
  DimensionWorldHandle,
  disposeDimensionWorld,
  disposePortalVortex,
  PortalVortexHandle,
} from '../world/multiverseModels';

const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _vec3C = new THREE.Vector3();
const _vec3D = new THREE.Vector3();
const _upAxis = new THREE.Vector3(0, 1, 0);
const _raycaster = new THREE.Raycaster();
const _ndcCenter = new THREE.Vector2(0, 0);
const _normalMatrix = new THREE.Matrix3();
const _hitNormal = new THREE.Vector3();
const _probeOrigin = new THREE.Vector3();
const _probeDir = new THREE.Vector3();
const _probeEuler = new THREE.Euler(0, 0, 0, 'YXZ');
const _scratchQuat = new THREE.Quaternion();
const _scratchScale = new THREE.Vector3(1, 1, 1);
const _scratchMat4 = new THREE.Matrix4();
const _zeroMat4 = new THREE.Matrix4().makeScale(0, 0, 0);
const _scratchColorA = new THREE.Color();
const _skyColor = new THREE.Color(0x6db0dc);
const _fogDayColor = new THREE.Color(0xb8dcf5);
const _fogScratchColor = new THREE.Color(0xb8dcf5);
const _nightSky = new THREE.Color(0x060b16);
const _dawnSky = new THREE.Color(0xf68d3e);
const _duskSky = new THREE.Color(0xf58434);
const _daySky = new THREE.Color(0x5faef0);
const _zenithDaySky = new THREE.Color(0x134fb8);
const _zenithNightSky = new THREE.Color(0x040712);
const _zenithScratchColor = new THREE.Color(0x134fb8);
const _horizonScratchColor = new THREE.Color(0x9ecbe6);
const _stormSky = new THREE.Color(0x334155);
const _stormDeepSky = new THREE.Color(0x1e293b);
const _lightningSky = new THREE.Color(0xe2e8f0);
const _sunOrangeColor = new THREE.Color(0xff9c38);
const _hemiDayColor = new THREE.Color(0xe4f2ff);
const _hemiTwilightColor = new THREE.Color(0xffc078);
const _hemiGroundDayColor = new THREE.Color(0x3f4f28);
const _hemiGroundTwilightColor = new THREE.Color(0x6b4226);
const _skyFillDayColor = new THREE.Color(0xb6dbff);
const _oceanDayColor = new THREE.Color(0x0b7285);
const _lakeDayColor = new THREE.Color(0x14b8a6);

const FOG_GRID_SIZE = 32;
const FOG_WORLD_SPAN = 1760;
const MAX_POOLED_PARTICLES = 192;
const ELEVATOR_TERMINAL_INTERACT_RADIUS_SQ = 3.2 * 3.2; // 3.2m radius around elevator computer terminal
const VEHICLE_INTERACT_RADIUS_SQ = 4.0 * 4.0; // 4.0m radius for nearby vehicles

interface ArrowProjectile {
  mesh: THREE.Mesh;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  damage: number;
  isBullet?: boolean;
}

interface PooledParticle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
}

interface ActivePickup {
  id: string;
  itemId: ItemId;
  quantity: number;
  x: number;
  y: number;
  z: number;
  currentY?: number;
  fallYVel?: number;
  life: number;
  autoCollectDelay?: number;
  placedOnGround?: boolean;
  collected: boolean;
  mesh: THREE.Group;
}

interface ActiveCarcass {
  id: string;
  species: CreatureSpecies;
  displayName: string;
  isDino: boolean;
  x: number;
  y: number;
  z: number;
  yaw: number;
  drops: { itemId: ItemId; quantity: number }[];
  initialTotalQty: number;
  life: number;
  autoCollectDelay?: number;
  fallProgress: number;
  currentY?: number;
  fallYVel?: number;
  scavengeToastCooldown: number;
  mesh: THREE.Group;
  harvested: boolean;
  owner: 'player' | 'world';
}

export interface TvScreenProjection {
  visible: boolean;
  cssMatrix3d: string;
  width: number;
  height: number;
  spatialVolume: number;
  isHouseTv: boolean;
  bassEnergy?: number;
  bassMode?: TvBassMode;
}

export interface EngineCallbacks {
  onHudUpdate: (snapshot: HUDStateSnapshot) => void;
  onToast: (toast: ResourceToast) => void;
  onOpenStation: (
    station: Extract<
      NonNullable<ActiveModal>,
      | 'crafting'
      | 'cooking'
      | 'chest'
      | 'stove'
      | 'fridge'
      | 'farmer'
      | 'tv'
      | 'drying_rack'
      | 'vehicles'
      | 'vehicle_cargo'
      | 'music_studio'
      | 'coaster'
      | 'saturn_rocket'
      | 'underground_elevator'
      | 'car_radio'
      | 'navigator_companion'
    >,
    structureId?: string,
  ) => void;
  onYouTubeError?: (videoId: string, errorCode: number) => void;
  onTvProjectionUpdate?: (projection: TvScreenProjection | null) => void;
  onTvBassUpdate?: (bassEnergy: number, bassMode: TvBassMode) => void;
}

function formatTimePhase(t: number): string {
  if (t < 0.2 || t >= 0.84) return 'Night';
  if (t < 0.31) return 'Dawn';
  if (t < 0.44) return 'Morning';
  if (t < 0.62) return 'Midday';
  if (t < 0.74) return 'Golden Hour';
  return 'Dusk';
}

// Emergency Freeze-Shield: keeps player moving & prevents heavy loops from locking the tab
const FREEZE_SHIELD = {
  maxDt: 0.033, // Never jump more than ~33ms in one step
  maxFrameMs: 14, // Leave GPU render headroom inside 16.6ms frame budget
  maxActiveVines: 120, // Hard cap so vine & extra ambient updates never snowball
} as const;

export class GameEngine {
  private container: HTMLElement;
  private callbacks: EngineCallbacks;
  private sound = new SoundEngine();

  private isSoftwareGl = false;
  private isTouchDevice = isMobileOrTouchClient();
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private envTexture: THREE.Texture | null = null;
  private camera!: THREE.PerspectiveCamera;
  private smartTv!: SmartTvSystem;
  private tvProjectionCallback: ((projection: TvScreenProjection | null) => void) | null = null;
  private lastTvProjVisible = false;
  private tvOccluderMeshes: THREE.Object3D[] = [];
  private tvRaycaster = new THREE.Raycaster();
  private tvIsZoomed = false;
  private tvModalOpen = false;
  private tvInlinePlayerActive = false;
  private tvYouTubeStartSec = 0;
  private _tvWorldPos = new THREE.Vector3();
  private _tvWorldQuat = new THREE.Quaternion();
  private _tvForward = new THREE.Vector3();
  private _tvRight = new THREE.Vector3();
  private _tvUp = new THREE.Vector3();
  private _tvCorner = new THREE.Vector3();
  private _tvLookTarget = new THREE.Vector3();
  private _tvTmpVec = new THREE.Vector3();
  private _tvToCam = new THREE.Vector3();
  private _tvToTarget = new THREE.Vector3();
  private _camForward = new THREE.Vector3();
  private _tvRayDirScratch = new THREE.Vector3();
  private tvLastRayElapsed = -10;
  private tvLastRayResult = false;
  private tvLastRayCamX = 0;
  private tvLastRayCamY = 0;
  private tvLastRayCamZ = 0;
  private sunLight!: THREE.DirectionalLight;
  private moonLight!: THREE.DirectionalLight;
  private skyFillLight!: THREE.DirectionalLight;
  private nightVisionLight!: THREE.PointLight;
  private hemiLight!: THREE.HemisphereLight;
  private world!: WorldHandles;
  private realisticOcean!: RealisticOcean;
  private shipwreckChests: (ShipwreckChestHandle & {
    opened: boolean;
    lootTable: [ItemId, number][];
  })[] = [];
  private armoryChestState!: ShipwreckChestHandle & {
    opened: boolean;
    lootTable: [ItemId, number][];
  };
  private skyBodies!: SkyCelestialHandles;
  private handsRig!: FirstPersonHandsRig;
  private shipModel!: THREE.Group;
  private rainSystem!: RealisticRainSystem;
  private creatures!: CreatureManager;
  private structureManager!: StructureManager;

  private readonly fpsController = new Permanent60FpsController();
  private perfMonitor: GamePerformanceRecorder | null = null;
  private disposed = false;
  private rafPausedByVisibility = false;
  private clock = new THREE.Clock();
  private elapsed = 0;
  private hudSyncTimer = 0;

  // Performance Engine & Locked 60 FPS Fixed-Step Loop + 3.5ms FrameBudgetQueue
  private ecosystemTickAccum = 0;
  private worldCullTimer = 0;
  private pendingCameraDt = Permanent60FpsController.FIXED_DT;
  private shadowUpdateFrame = 0;
  private shadowLastCamX = NaN;
  private shadowLastCamY = NaN;
  private shadowLastCamZ = NaN;
  private shadowLastYaw = NaN;
  private shadowLastPitch = NaN;
  private worldQueue = new FrameBudgetQueue(3.5);
  private _scavengerTargetsScratch: ScavengerCarcassTarget[] = [];
  private readonly _onCreatureDamage = (amount: number, sourceName: string) => {
    this.applyPlayerDamage(amount, sourceName);
  };
  private readonly _onCreatureCall = (species: CreatureSpecies, dist: number) => {
    this.sound.playCreatureCall(species, Math.max(0.2, 1 - dist / 50));
  };
  private readonly _onCreatureSightings = (sightings: TrackedSighting[]) => {
    this.trackedSightings = sightings;
  };
  private readonly _onCarcassScavenged = (
    carcassId: string,
    species: CreatureSpecies,
    displayName: string,
  ) => {
    this.handleCarcassScavenged(carcassId, species, displayName);
  };
  private readonly _structureCallbacks = {
    onPlayerDamaged: (amount: number, sourceName: string) => {
      this.applyPlayerDamage(amount, sourceName);
    },
    onEntityCall: (type: StructureEntityKind, dist: number) => {
      if (type !== 'villager') {
        const mapped: CreatureSpecies =
          type === 'vindicator' || type === 'vex' ? 'pillager' : type;
        this.sound.playCreatureCall(mapped, Math.max(0.2, 1 - dist / 50));
      }
    },
    onStructureCleared: (site: StructureSite) => {
      this.handleStructureCleared(site);
    },
  };
  private readonly _stepHandlers: StepHandlers = {
    onFixedStep: (fixedDt: number) => this.handleFixedStep(fixedDt),
    onRender: (alpha: number, elapsedSeconds: number) =>
      this.handleRender(alpha, elapsedSeconds),
  };
  private currentFps = 60;
  private fpsDisplayTimer = 0;
  private fpsDisplayFrames = 0;
  private fpsDisplayAccumMs = 0;
  private autoFpsTier = 0;
  private fpsSampleTimer = 0;
  private fpsSampleFrames = 0;
  private fpsSampleAccumMs = 0;
  private lastFramePerfMs = 0;
  private frameWatch: FrameWatchState = createFrameWatchState();
  private masterRuntime: MasterRuntimeState = {
    ...createMasterRuntimeState(),
    isThirdPerson: false,
  };
  private playerCameraRig = new ZeroStutterCameraController({
    firstPersonEyeY: DEFAULT_PLAYER_CAMERA_CONFIG.firstPersonEyeHeight,
    thirdPersonDistance: DEFAULT_PLAYER_CAMERA_CONFIG.thirdPersonDistance,
    thirdPersonHeight: DEFAULT_PLAYER_CAMERA_CONFIG.thirdPersonHeight,
    vehicleDistance: DEFAULT_PLAYER_CAMERA_CONFIG.vehicleDistance,
    vehicleHeight: DEFAULT_PLAYER_CAMERA_CONFIG.vehicleHeight,
    smoothness: 14,
    minGroundClearance: DEFAULT_PLAYER_CAMERA_CONFIG.minGroundClearance,
  });
  private _chaseTargetScratch = new THREE.Vector3();
  private _sessionYawRef = { value: 0 };
  private localPlayerHandle: RemotePlayerMeshHandle | null = null;
  private localAppliedBackpackSkinId: string | null | undefined = undefined;
  private localAppliedGunSkinId: string | null | undefined = undefined;
  private readonly _groundSampleFn = (x: number, z: number): number => {
    if (this.worldType === 'flat') return 0;
    return Math.max(getTerrainHeight(x, z), getWaterLevelAt(x, z));
  };
  private consecutiveSlowSeconds = 0;
  private consecutiveFastSeconds = 0;
  private autoFpsRestoreCooldown = 0;
  private effectiveShadowsEnabled = true;
  private effectiveShadowMapSize = 1024;
  private effectiveShadowExtent = 64;
  private effectiveWaterReflections = true;
  private effectiveParticleScale = 1.0;
  private effectiveMaxDrawDistance = 205;
  private effectiveFogMult = 1.0;
  private shaderQualityTier = 1;
  private oceanDetailLevel = 1.0;
  private maxActivePointLights = 6;
  private nodeHitShakeTimers = new Map<string, number>();
  private _sunDirScratch = new THREE.Vector3(0.4, 0.85, 0.35);

  // Grand Finale Pack runtime state (Tiki Drink buffs & lightweight zone loot interactions)
  private grandFinalePlayer: GrandFinalePlayerState = { hp: 100, maxHp: 100, activeBuff: null };
  private grandFinaleDrinkIdx = 0;
  private grandFinaleTikiCooldown = 0;
  private grandFinaleZoneCheckTimer = 0;
  private grandFinaleGhosts: GrandFinaleGhostEntity[] = [
    { id: 'gf_dragon_1', zoneKey: 'dragon valley', x: 420, z: -380, hp: 100, maxHp: 100, active: true, name: 'Cinder Drake' },
    { id: 'gf_viking_1', zoneKey: 'viking village', x: 560, z: -260, hp: 100, maxHp: 100, active: true, name: 'Draugr Raider' },
    { id: 'gf_resort_1', zoneKey: 'resort corner', x: -480, z: 410, hp: 80, maxHp: 80, active: true, name: 'Tide Wraith' },
    { id: 'gf_castle_boss', zoneKey: 'ruined castle', x: -360, z: -520, hp: 180, maxHp: 180, active: true, isBoss: true, name: 'Fallen King Ghost' },
  ];

  // Spatial Hash Grids (16m cells) for O(1) zero-GC world collider and resource node lookups
  private colliderGrid = new Map<number, { x: number; z: number; radius: number; nodeId?: string }[]>();
  private resourceNodeGrid = new Map<number, ResourceNodeState[]>();
  private activeFellingNodeIds = new Set<string>();
  private respawningNodeIds = new Set<string>();
  private interactionProbeTimer = 0;
  private smartTvUpdateTimer = 0;
  private tvBassReportTimer = 0;
  private lastReportedTvBass = -1;
  private lastReportedTvBassMode = '';

  // Survival & Creative Flight + Biome Teleport System
  private lastSpaceTapMs = 0;
  private touchFlyAscend = false;
  private touchFlyDescend = false;
  private flightPlayerProxy: FlightPlayerState = {
    x: PLAYER_SPAWN.x,
    y: 2,
    z: PLAYER_SPAWN.z,
    vx: 0,
    vy: 0,
    vz: 0,
    isFlying: false,
    mode: 'Survival',
  };
  private flightAndTeleport: FlightAndTeleportSystem = new FlightAndTeleportSystem(
    this.flightPlayerProxy,
    ISLAND_TELEPORT_DESTINATIONS,
    {
      flySpeed: 32,
      verticalSpeed: 22,
      boostMultiplier: 1.8,
      getGroundHeight: (x, z) =>
        Math.max(getTerrainHeight(x, z), getWaterLevelAt(x, z)),
      onStatusChange: (msg, type) => {
        this.toast(
          msg,
          type === 'error'
            ? 'warning'
            : type === 'success' || type === 'flight'
              ? 'discovery'
              : 'info',
        );
      },
    },
  );

  // Dragon Valley System (max 6 active dragons, hatching, raising, hybrids, Anvil+NameTag, flight mount)
  public dragons: DragonCompanion[] = [
    DRAGON_VALLEY_SYSTEM.hatchEgg('Ember', 'Ignis'),
  ];
  private dragonPlayerRef: DragonPlayerRef = { mountedDragonId: null };
  private dragonFlight: DragonFlightSystem = {
    flying: false,
    flySpeed: 48,
    toggleFlight: (active: boolean) => {
      this.dragonFlight.flying = active;
      this.togglePlayerFlight(active, active ? Math.max(32, this.dragonFlight.flySpeed * 0.85) : 32);
    },
  };

  // Multiverse & Portal Vortex Handles
  private activeDimensionWorld: DimensionWorldHandle | null = null;
  private inSpacePlanet = false;
  private spaceArena: SpacePlanetArenaHandles | null = null;
  private activeSpacePlanet: SpacePlanet | null = null;
  private activeSpaceSystem: StarSystemData | null = null;
  private spaceGravity = 1.0;
  private lastAlienShotMs = 0;
  private alienRelicDecorMeshes: THREE.Object3D[] = [];
  private pendingLaunchTarget: {
    planet: SpacePlanet;
    system: StarSystemData;
  } | null = null;
  private saturnLaunchCameraShake = 0;
  private lastLaunchStage = 1;
  private launchExhaustAccum = 0;
  private launchHudAccum = 0;
  private elevatorLiftActive = false;
  private elevatorLiftProgress = 1;
  private elevatorSummonedVehicleId: string | null = null;
  private elevatorTargetCar: ExoticElevatorCar | null = null;
  private elevatorSteamAccum = 0;
  private elevatorTerminalGreeted = false;
  private portalHandles = new Map<string, PortalVortexHandle>();
  private portalWarpCooldown = 0;

  // Game Mode & Intro Cinematic
  private mode: 'menu' | 'playing' | 'paused' = 'menu';
  private settings: GameSettings;
  private pirateCinematic!: PirateCinematicRig;
  private navigatorCompanion!: NavigatorCompanionController;
  private playerGender: PlayerGender = 'boy';
  private cinematicActive = false;
  private cinematicTimer = 0;
  private cinematicSubtitle = '';
  private cinematicCrewShout = '';
  private lastCinematicHudSubtitle = '';
  private lastCinematicHudCrewShout = '';
  private cinematicCameraInitialized = false;
  private readonly _cinematicPosTarget = new THREE.Vector3();
  private readonly _cinematicLookTarget = new THREE.Vector3();
  private readonly _cinematicLookCurrent = new THREE.Vector3();
  private menuCameraSnapped = false;
  private menuOrbitAngle = 0;

  // Weather & Atmosphere
  private weather: WeatherType = 'clear';
  private weatherTimer = 75;
  private lightningFlash = 0;
  private nextLightningTimer = 7;
  private coldWarnCooldown = 0;
  private playerVisibility = 1.0;
  private nocturnalActiveCount = 0;
  private lastIsNight = false;

  // Player First-Person State
  private playerX = PLAYER_SPAWN.x;
  private playerY = 2;
  private playerZ = PLAYER_SPAWN.z;
  private playerVelY = 0;
  private playerYaw = Math.PI;
  private grounded = true;
  private isSwimming = false;
  private isSprinting = false;
  private isCrouching = false;
  private currentEyeHeight = 1.62;
  private walkBobPhase = 0;
  private camBobBlend = 0;
  private camStepOffsetY = 0;
  private lastSimDt = 0.016;
  private swingTimer = 0;
  private actionCooldown = 0;
  private recoilTimer = 0;
  private weaponMagazines = new Map<ItemId, number>();
  private reloadingItemId: ItemId | null = null;
  private reloadTimer = 0;
  private reloadDuration = 0;
  private reloadMode: FirearmReloadMode | null = null;
  private cozyComfortActive = false;
  private cozyComfortLabel = '';
  private eatTimer = 0;
  private eatBiteCount = 0;
  private drinkTimer = 0;
  private washBottleTimer = 0;
  private washMeatTimer = 0;
  private washMeatIsDino = false;
  private washMeatSplashStep = 0;
  private cutMeatTimer = 0;
  private cutMeatIsDino = false;
  private cutMeatSliceStep = 0;
  private activeConsumeColor = '#b91c1c';
  private footstepAccum = 0;
  private hurtFlash = 0;
  private totemFlashTimer = 0;
  private totemRegenTimer = 0;

  // Fluid Momentum & Combat Interaction State
  private wallRunTimer = 0;
  private wallRunSide: -1 | 0 | 1 = 0;
  private wallRunNormX = 0;
  private wallRunNormZ = 0;
  private wallRunCooldown = 0;
  private wallRunStepAccum = 0;
  private wallTiltAngle = 0;
  private vaultTimer = 0;
  private vaultDuration = 0.34;
  private vaultStartX = 0;
  private vaultStartY = 0;
  private vaultStartZ = 0;
  private vaultEndX = 0;
  private vaultEndY = 0;
  private vaultEndZ = 0;
  private kickCooldown = 0;
  private currentSpeedMps = 0;
  private debrisProjectiles: {
    mesh: THREE.Mesh;
    pos: THREE.Vector3;
    vel: THREE.Vector3;
    life: number;
  }[] = [];
  private targetHitbox: TargetHitboxSnapshot | null = null;
  private caveCeilingRespawnTimers = new Map<string, number>();

  // First-Person Camera State
  private camYaw = 0;
  private camPitch = -0.06;

  // Input State
  private keys: Record<string, boolean> = {};
  private joyX = 0;
  private joyY = 0;
  private touchSprint = false;
  private touchCrouch = false;
  private isAiming = false;
  private gamepadGas = 0;
  private gamepadBrake = 0;
  private gamepadHandbrake = false;

  // Survival & World State
  public ecosystem: EcosystemSimulationData = createInitialEcosystem();
  private vitals: PlayerVitals = {
    health: 100,
    maxHealth: 100,
    hunger: 100,
    maxHunger: 100,
    thirst: 100,
    maxThirst: 100,
    stamina: 100,
    maxStamina: 100,
    temperatureC: 37.0,
  };
  private dayCount = 1;
  private timeOfDay = 0.278;
  private inventory: InventorySlot[] = [];
  private backpackCompartments: BackpackCompartmentEntry[] = [];
  private hotbarItemIds: (ItemId | null)[] = [
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
  ];
  private equippedSlot = 0;
  private wheelAccum = 0;
  private lastWheelSwitchTime = 0;
  private structures: PlacedStructure[] = [];
  private structureVisuals = new Map<
    string,
    {
      group: THREE.Group;
      fireLight?: THREE.PointLight;
      flameGroup?: THREE.Group;
      lightMeta?: {
        localX: number;
        localY: number;
        localZ: number;
        colorHex: number;
        baseIntensity: number;
        currentIntensity: number;
        distance: number;
        decay: number;
      };
    }
  >();
  private structureLightPool: THREE.PointLight[] = [];
  private vehicleUnderglowPool: THREE.PointLight[] = [];
  private vehicleUnderglowMeta = new Map<
    string,
    {
      localX: number;
      localY: number;
      localZ: number;
      colorHex: number;
      distance: number;
      decay: number;
    }
  >();
  private visitedBiomes: Set<BiomeId> = new Set(['beach']);
  private cachedVisitedBiomes: BiomeId[] = ['beach'];
  private exploredCells: Set<number> = new Set();
  private cachedExploredCells: number[] = [];
  private exploredCellsDirty = true;
  private lastExploredCx = -9999;
  private lastExploredCz = -9999;
  private discoveredLocations: Set<string> = new Set();
  private completedMissionIds: Set<string> = new Set();
  private cachedCompletedMissionIds: string[] = [];
  private cachedVisitedDimensions: DimensionId[] = ['overworld'];
  private cachedHudInventory: InventorySlot[] = [];
  private cachedHudBackpack: BackpackCompartmentEntry[] = [];
  private cachedHudStructures: PlacedStructure[] = [];
  private cachedHudCrops: PlantedCrop[] = [];
  private cachedHudFridge: InventorySlot[] = [];
  private cachedHudVehicles: ModularVehicleData[] = [];
  private vehicleSpecsCache = new WeakMap<
    VehicleModulePlacement[],
    ReturnType<typeof computeVehicleSpecs>
  >();
  private vehicleRestCache = new Map<
    string,
    {
      x: number;
      z: number;
      structVer: number;
      restY: number;
      groundSurf: number;
      nextRefreshAt: number;
    }
  >();
  private lastBuildPreviewKey = '';
  private structuralVersion = 0;
  private trackedSightings: TrackedSighting[] = [];
  private stats: GameStats = this.createEmptyStats();
  private gameOver = false;
  private gameOverReason = '';
  private currentDimension: DimensionId = 'overworld';
  private selectedPortalDimension: DimensionId = 'space';
  private visitedDimensions: Set<DimensionId> = new Set(['overworld']);
  private unlockedGildedPaint = false;
  private crystalArmorHp = 0;
  private activePortals: PortalLinkState[] = [];
  private currentSlotId = 'slot_1';
  private worldType: WorldType = 'island';
  private worldName = 'Survival Island';
  private flatSurfaceStyle: FlatSurfaceStyle = 'turf_grid';
  private flatWorld!: FlatWorldHandles;
  private coasterRuntime!: RollerCoasterRuntime;
  private ridingCoasterId: string | null = null;
  private gameMode: GameMode = 'survival';
  private hitMarkerActive = false;
  private nearbyInteraction: NearbyInteraction | null = null;

  // Farming, Economy, Hilltop House Fridge & Interactive Seating
  private coins = 150;
  private plantedCrops: PlantedCrop[] = [];
  private cropMeshes = new Map<string, THREE.Group>();
  private fridgeItems: InventorySlot[] = [];
  private seatedState: {
    label: string;
    x: number;
    y: number;
    z: number;
    yaw: number;
    returnX: number;
    returnZ: number;
  } | null = null;

  // Dynamic Projectiles, Pickups & Pooled VFX (Zero-GC)
  private arrows: ArrowProjectile[] = [];
  private arrowEntryPool: ArrowProjectile[] = [];
  private arrowMeshPool: THREE.Mesh[] = [];
  private bulletMeshPool: THREE.Mesh[] = [];
  private debrisEntryPool: {
    mesh: THREE.Mesh;
    pos: THREE.Vector3;
    vel: THREE.Vector3;
    life: number;
  }[] = [];
  private pickupMeshPool = new Map<ItemId, THREE.Group[]>();
  private readonly rainCount = 340;
  private arrowGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.85, 5);
  private arrowMat = new THREE.MeshStandardMaterial({ color: 0xe7e5e4 });
  private bulletGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.42, 6);
  private bulletMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.9,
    roughness: 0.2,
  });
  private particleInstanced!: THREE.InstancedMesh;
  private particlePool: PooledParticle[] = [];
  private particleWriteIdx = 0;
  private hasActiveParticles = false;
  private particleGeo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
  private particleMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  private shellCasingGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.048, 6);
  private shellCasingMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    metalness: 0.85,
    roughness: 0.28,
  });
  private shellCasingPool: {
    mesh: THREE.Mesh;
    active: boolean;
    pos: THREE.Vector3;
    vel: THREE.Vector3;
    rx: number;
    rz: number;
    life: number;
  }[] = [];
  private shellCasingIdx = 0;
  private muzzleFlashGeo = new THREE.OctahedronGeometry(0.12, 0);
  private muzzleFlashMat = new THREE.MeshBasicMaterial({
    color: 0xfef08a,
    transparent: true,
    opacity: 0.92,
  });
  private muzzleFlashPool: { mesh: THREE.Mesh; life: number }[] = [];
  private muzzleFlashIdx = 0;
  private debrisGeo = new THREE.DodecahedronGeometry(0.12, 0);
  private debrisMat = new THREE.MeshStandardMaterial({
    color: 0x78716c,
    roughness: 0.92,
  });
  private debrisMeshPool: THREE.Mesh[] = [];
  private p2pTracerGeo = new THREE.CylinderGeometry(0.018, 0.018, 1, 5);
  private p2pTracerMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
  private p2pTracerPool: { mesh: THREE.Mesh; life: number }[] = [];
  private p2pTracerIdx = 0;
  private vehicleShadowGeo = new THREE.CircleGeometry(2.15, 14);
  private vehicleShadowMat = new THREE.MeshBasicMaterial({
    color: 0x0c0a09,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
  });
  private vehicleShadowDiscs = new Map<string, THREE.Mesh>();
  private pickups: ActivePickup[] = [];
  private carcasses: ActiveCarcass[] = [];
  private pendingTreeDrops = new Map<string, [ItemId, number][]>();
  private shakenTreeDropIds = new Set<string>();
  private nodeById = new Map<string, ResourceNodeState>();

  // Volumetric Terrain Deformation & Structural Integrity Engineering
  private terrainEngine!: VolumetricTerrainEngine;
  private structuralBlocks: StructuralBlock[] = [];
  private structuralMeshes = new Map<string, THREE.Group>();
  private cachedStructuralMeshList: THREE.Object3D[] = [];
  private structuralMeshListDirty = true;
  private collapsingBlocks: {
    mesh: THREE.Group;
    kind: StructuralBlockKind;
    vx: number;
    vy: number;
    vz: number;
    rx: number;
    rz: number;
    life: number;
    hitGround: boolean;
  }[] = [];
  private primedKegs: {
    mesh: THREE.Group;
    pos: THREE.Vector3;
    vel: THREE.Vector3;
    fuse: number;
  }[] = [];
  private torrentCasks: { mesh: THREE.Group; life: number }[] = [];
  private buildRotationStep = 0;
  private previewGroup: THREE.Group | null = null;
  private previewKind: StructuralBlockKind | null = null;
  private previewTarget: {
    gx: number;
    gy: number;
    gz: number;
    x: number;
    y: number;
    z: number;
    rotationY: number;
    stress: number;
    anchored: boolean;
  } | null = null;
  private cameraShakeTimer = 0;
  private creakCooldown = 0;
  private trenchCooldown = 0;

  // Kinetic Power Networks & Automated Valley Assembly Lines
  private kineticNodes: KineticNode[] = [];
  private kineticMeshes = new Map<string, KineticMeshHandles>();
  private beltLinks: BeltLink[] = [];
  private beltSpanMeshes: BeltSpanMeshHandles[] = [];
  private kineticPreviewGroup: THREE.Group | null = null;
  private kineticPreviewKind: KineticNodeKind | null = null;
  private kineticPreviewTarget: {
    x: number;
    y: number;
    z: number;
    rotationY: number;
  } | null = null;
  private beltPhase = 0;
  private kineticTotalRpm = 0;
  private kineticMaxPsi = 0;
  private kineticActiveAssemblers = 0;
  private kineticTickSoundAccum = 0;
  private targetKineticNode: KineticNode | null = null;

  // Modular Physics-Driven Vehicles (Land, Water & Gyro Air)
  private vehicles: ModularVehicleData[] = [];
  private vehicleMeshes = new Map<string, ModularVehicleMeshHandles>();
  private activeVehicleId: string | null = null;
  private selectedCargoVehicleId: string | null = null;
  private vehicleForwardSpeed = 0;
  private vehicleSteerAngle = 0;
  private vehicleVisualPitch = 0;
  private vehicleVisualRoll = 0;
  private vehicleAltitudeVel = 0;
  private vehicleAscendHold = false;
  private vehicleDescendHold = false;
  private vehicleEngineSoundAccum = 0;
  private hydraulicMode: HydraulicMode = 'level';
  private hydCorners = { fl: 0, fr: 0, rl: 0, rr: 0 };
  private vehicleInteriorCamera = false;
  private convertibleTopProgressMap = new Map<string, number>();
  private droptopButtonPressTimer = 0;
  private rimLightButtonPressTimer = 0;
  private liftButtonPressTimer = 0;
  private readonly _tapNdc = new THREE.Vector2();
  private hydVel = { fl: 0, fr: 0, rl: 0, rr: 0 };
  private trunkBassPulse = 0;
  private chestThumpPulse = 0;
  private vehicleDanceStates = new Map<string, GarageDanceState>();

  // Creature Taming & Mounting & Sandbox
  private mountedCreatureId: string | null = null;
  private gravityScale = 1.0;
  private erosionSpeedMult = 1.0;

  // Native P2P Multiplayer & In-Game Mod System
  private p2p!: P2PMultiplayerManager;
  private modSystem!: ModSystemManager;
  private remotePlayers = new Map<
    string,
    {
      name: string;
      handle: RemotePlayerMeshHandle;
      targetX: number;
      targetY: number;
      targetZ: number;
      targetYaw: number;
      anim: RemoteAnimState;
      vehicleId: string | null;
      biome: string;
      walkPhase: number;
      appliedGunSkinId?: string | null;
      appliedBackpackSkinId?: string | null;
    }
  >();
  private lastAppliedGunSkinKey = '';
  private p2pStateSendAccum = 0;
  private p2pVehicleSyncAccum = 0;
  private p2pChatLog: { peerId: string; name: string; text: string; time: number }[] = [];
  private hydraulicBounceTimer = 0;
  private autoParkJobs = new Map<
    string,
    {
      vehicleId: string;
      targetX: number;
      targetZ: number;
      targetYaw: number;
      bayLabel: string;
      phase: 'approach' | 'park';
      speed: number;
      steerAngle: number;
      pitchAngle: number;
      elapsed: number;
      stuckTimer: number;
      lastProgressX: number;
      lastProgressZ: number;
    }
  >();

  constructor(
    container: HTMLElement,
    settings: GameSettings,
    callbacks: EngineCallbacks,
  ) {
    this.container = container;
    this.settings = settings;
    this.callbacks = callbacks;
    this.sound.configure(settings);
    this.playerCameraRig.mode = 'first_person';

    this.initScene();
    this.initMultiplayerAndMods();
    this.setupInputs();
    this.startNewWorldState('slot_1', false);
    this.mode = 'menu';
    this.menuCameraSnapped = false;
    this.applyMenuCullImmediate();
    this.resetFrameTiming();
    this.emitHud();

    this.clock.start();
    this.fpsController.start(this._stepHandlers);
  }

  private createEmptyStats(): GameStats {
    return {
      treesChopped: 0,
      stonesMined: 0,
      itemsCrafted: 0,
      mealsCooked: 0,
      animalsHunted: 0,
      dinosaursEncountered: 0,
      fishCaught: 0,
      dolphinsBefriended: 0,
      footprintsInspected: 0,
      shipwreckCratesSearched: 0,
      freshWaterDrunk: 0,
      daysSurvived: 1,
    };
  }

  private detectSoftwareGl(): boolean {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param) || '');
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    } catch {
      return false;
    }
  }

  private initScene(): void {
    this.isSoftwareGl = this.detectSoftwareGl();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl && !this.isTouchDevice,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.perfMonitor = createGamePerformanceMonitor(this.renderer);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;
    // Cap DPR cleanly at <= 2 without redundant canvas reallocations
    ZeroStutterCameraController.applyRendererCaps(
      this.renderer,
      this.isSoftwareGl ? 1 : this.isTouchDevice ? 1.5 : 2,
    );
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = !this.isSoftwareGl;
    this.renderer.setSize(
      this.container.clientWidth,
      this.container.clientHeight,
    );
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.position = 'relative';
    this.renderer.domElement.style.zIndex = '1';
    this.renderer.domElement.style.touchAction = 'none';

    this.renderer.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
    });

    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = this.envTexture;
    pmrem.dispose();

    const aspect =
      (this.container.clientWidth || 1) / (this.container.clientHeight || 1);
    this.camera = new THREE.PerspectiveCamera(68, aspect, 0.08, 420);
    this.camera.rotation.order = 'YXZ';

    // Attach First-Person Hands & Held Tool Rig at 1.1 scale directly to Camera
    this.handsRig = createFirstPersonHandsRig();
    this.handsRig.root.scale.setScalar(1.1);
    this.handsRig.root.traverse((o) => {
      o.userData.ignoreLightingPass = true;
    });
    this.camera.add(this.handsRig.root);
    this.nightVisionLight = new THREE.PointLight(0x94a3b8, 0, 11, 1.8);
    this.camera.add(this.nightVisionLight);
    this.scene.add(this.camera);

    // Local 3rd-Person Avatar Rig (visible when SmoothPlayerCameraRig is in 'third_person')
    this.localPlayerHandle = createRemotePlayerMesh('Player', 0x38bdf8, false);
    this.localPlayerHandle.group.visible = false;
    this.scene.add(this.localPlayerHandle.group);

    // Realistic Island Lighting Rig (Sunlight, Hemisphere Bounce, Sky Fill, ACES Tone Mapping & Soft Shadows)
    const lightingRig = enableRealisticIslandLighting(
      this.scene,
      this.renderer,
      {
        shadowsEnabled: !this.isSoftwareGl,
        shadowMapSize: 1024,
        shadowHalfExtent: 64,
        shadowNear: 1,
        shadowFar: 220,
        shadowRadius: 3,
        exposure: 1.15,
        applyMeshPass: false,
      },
    );
    this.sunLight = lightingRig.sunlight;
    this.hemiLight = lightingRig.ambient;
    this.skyFillLight = lightingRig.skyFill;
    this.scene.background = _skyColor;

    this.moonLight = new THREE.DirectionalLight(0x93c5fd, 0);
    this.scene.add(this.moonLight);
    this.scene.add(this.moonLight.target);

    this.skyBodies = createSkyCelestialBodies();
    this.skyBodies.group.traverse((o) => {
      o.userData.ignoreLightingPass = true;
    });
    this.scene.add(this.skyBodies.group);

    // Build World, Volumetric Terrain Engine, Sailing Ship (for Intro), Rain Particles & Creatures
    this.world = buildIslandWorld(this.scene, this.renderer);
    this.world.cloudsGroup.traverse((o) => {
      o.userData.ignoreLightingPass = true;
    });
    this.flatWorld = buildFlatWorld(this.scene, this.renderer);
    this.flatWorld.flatGroup.traverse((o) => {
      if (o instanceof THREE.Mesh && !o.castShadow && o.receiveShadow) {
        o.userData.noShadowCast = true;
      }
    });
    this.flatWorld.setVisible(false);
    this.coasterRuntime = new RollerCoasterRuntime(this.scene);
    this.realisticOcean = new RealisticOcean(
      this.scene,
      6400,
      6400,
      this.isTouchDevice ? 64 : 72,
    );
    this.realisticOcean.buildShoreDepthTexture(getTerrainHeight);
    this.world.oceanMesh.visible = false;
    this.world.resourceNodes.forEach((n) => this.nodeById.set(n.id, n));
    this.buildResourceNodeSpatialGrid();
    this.buildColliderSpatialGrid();
    this.terrainEngine = new VolumetricTerrainEngine(this.scene);

    const chestLootMap: Record<string, [ItemId, number][]> = {
      deck: [
        ['glock_19', 1],
        ['colt_m1911', 1],
        ['ammo', 90],
        ['roasted_meat', 5],
        ['filtered_water_bottle', 4],
        ['gold_bar', 5],
      ],
      cargo: [
        ['remington_870', 1],
        ['mossberg_590', 1],
        ['sawed_off', 1],
        ['glock_19', 1],
        ['desert_eagle', 1],
        ['ammo', 140],
        ['roasted_meat', 6],
      ],
      armory: [
        ['ak_47', 1],
        ['m4a1', 1],
        ['scar_h', 1],
        ['fn_fal', 1],
        ['mp5', 1],
        ['vector', 1],
        ['uzi', 1],
        ['space_gem', 4],
        ['ammo', 180],
      ],
      captain: [
        ['barrett_50', 1],
        ['remington_700', 1],
        ['m249_saw', 1],
        ['magnum_44', 1],
        ['desert_eagle', 1],
        ['gold_bar', 15],
        ['diamond', 5],
        ['ruby', 5],
        ['emerald', 5],
        ['sapphire', 5],
        ['space_crystal', 6],
        ['captain_key', 1],
        ['nautical_map', 1],
        ['navigation_sextant', 1],
        ['ammo', 220],
      ],
    };

    this.shipwreckChests = (this.world.shipwreckChests || []).map((ch) => ({
      ...ch,
      opened: false,
      lootTable: chestLootMap[ch.id] || chestLootMap.deck,
    }));

    this.armoryChestState = {
      ...this.world.armoryChest,
      opened: false,
      lootTable: [
        ['glock_19', 1],
        ['remington_870', 1],
        ['m4a1', 1],
        ['ammo', 120],
        ['gold_bar', 3],
      ],
    };

    // Initialize Persistent Native 3D CanvasTexture Smart TV OS
    this.smartTv = new SmartTvSystem();
    if (this.world.tvScreenMesh && this.world.tvScreenMat) {
      this.world.overworldGroup.updateMatrixWorld(true);
      this.smartTv.attachToMesh(
        this.world.tvScreenMesh,
        this.world.tvScreenMat,
        this.world.tvWorldPos,
      );
      if (this.world.tvScreenMesh.parent) {
        this.world.tvScreenMesh.parent.traverse((obj) => {
          if (obj.userData?.isHouseWall) {
            this.tvOccluderMeshes.push(obj);
          }
        });
      }
    }
    if (this.smartTv.tvGlowLight) {
      this.scene.add(this.smartTv.tvGlowLight);
    }
    this.smartTv.setAutoAdvanceCallback((ch) => {
      this.toast(`3D TV Auto-Next: ${ch.badge} · ${ch.name}`, 'info');
      this.emitHud();
    });

    this.shipModel = createSailingShipModel();
    this.shipModel.visible = false;
    this.scene.add(this.shipModel);

    this.pirateCinematic = new PirateCinematicRig();
    this.pirateCinematic.root.visible = false;
    this.scene.add(this.pirateCinematic.root);

    // Non-playable Ship Navigator Companion (Boy or Girl) with backpack, gun, axe & autonomous AI
    this.navigatorCompanion = new NavigatorCompanionController();
    const navX = PLAYER_SPAWN.x + 4.2;
    const navZ = PLAYER_SPAWN.z - 5.2;
    this.navigatorCompanion.resetAtSpawn(
      PLAYER_SPAWN.x,
      PLAYER_SPAWN.z,
      getTerrainHeight(navX, navZ),
    );
    this.navigatorCompanion.group.visible = false;
    this.scene.add(this.navigatorCompanion.group);
    this.scene.add(this.navigatorCompanion.droppedGunGroup);

    // Ultra-realistic GPU-driven Volumetric Rain Streaks + Ground Splash Ripples (0 CPU loop, 2 draw calls)
    this.rainSystem = new RealisticRainSystem();
    this.scene.add(this.rainSystem.group);

    this.creatures = new CreatureManager(this.scene);
    this.structureManager = new StructureManager(this.scene);
    registerDefaultIslandStructures(this.structureManager);
    this.sanitizeWorld();

    // Pre-allocate Zero-GC VFX Pools (1 InstancedMesh particle batch = 1 draw call)
    this.vehicleShadowGeo.rotateX(-Math.PI / 2);
    this.particleInstanced = new THREE.InstancedMesh(
      this.particleGeo,
      this.particleMat,
      MAX_POOLED_PARTICLES,
    );
    this.particleInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.particleInstanced.frustumCulled = false;
    this.particleInstanced.castShadow = false;
    this.particleInstanced.receiveShadow = false;
    this.particleInstanced.userData.ignoreLightingPass = true;
    _scratchColorA.setHex(0xffffff);
    for (let i = 0; i < MAX_POOLED_PARTICLES; i++) {
      this.particleInstanced.setMatrixAt(i, _zeroMat4);
      this.particleInstanced.setColorAt(i, _scratchColorA);
      this.particlePool.push({
        active: false,
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 0.5,
      });
    }
    this.particleInstanced.instanceMatrix.needsUpdate = true;
    if (this.particleInstanced.instanceColor) {
      this.particleInstanced.instanceColor.needsUpdate = true;
    }
    this.scene.add(this.particleInstanced);

    for (let i = 0; i < 16; i++) {
      const mesh = new THREE.Mesh(this.shellCasingGeo, this.shellCasingMat);
      mesh.visible = false;
      mesh.userData.ignoreLightingPass = true;
      this.scene.add(mesh);
      this.shellCasingPool.push({
        mesh,
        active: false,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        rx: 0,
        rz: 0,
        life: 0,
      });
    }
    for (let i = 0; i < 4; i++) {
      const mesh = new THREE.Mesh(this.muzzleFlashGeo, this.muzzleFlashMat);
      mesh.visible = false;
      mesh.userData.ignoreLightingPass = true;
      this.scene.add(mesh);
      this.muzzleFlashPool.push({ mesh, life: 0 });
    }
    for (let i = 0; i < 12; i++) {
      const mesh = new THREE.Mesh(this.p2pTracerGeo, this.p2pTracerMat);
      mesh.visible = false;
      mesh.userData.ignoreLightingPass = true;
      this.scene.add(mesh);
      this.p2pTracerPool.push({ mesh, life: 0 });
    }

    // Fixed-size PointLight pools added BEFORE boot renderer.compile so WebGL shader
    // programs are compiled once at startup and numPointLights never changes mid-game.
    for (let i = 0; i < 4; i++) {
      const sLight = new THREE.PointLight(0xffffff, 0, 16, 1.6);
      sLight.castShadow = false;
      this.scene.add(sLight);
      this.structureLightPool.push(sLight);
    }
    for (let i = 0; i < 2; i++) {
      const uLight = new THREE.PointLight(0x38bdf8, 0, 9.5, 1.4);
      uLight.castShadow = false;
      this.scene.add(uLight);
      this.vehicleUnderglowPool.push(uLight);
    }

    applyRealisticMeshLightingPass(this.scene, {
      shadowsEnabled: !this.isSoftwareGl,
      envMapIntensity: 1.0,
    });
    this.applyGraphicsProfile();

    if (!this.isSoftwareGl) {
      // Temporarily mark hidden worlds/ship/storm FX visible during boot compilation so shaders pre-warm
      const prevFlatVis = this.flatWorld.flatGroup.visible;
      const prevShipVis = this.shipModel.visible;
      const prevRainVis = this.rainSystem.group.visible;
      const prevStarVis = this.skyBodies.starPoints.visible;
      this.flatWorld.setVisible(true);
      this.shipModel.visible = true;
      this.rainSystem.group.visible = true;
      this.skyBodies.starPoints.visible = true;
      this.renderer.compile(this.scene, this.camera);
      this.prewarmSceneTextures(this.scene);
      this.flatWorld.setVisible(prevFlatVis);
      this.shipModel.visible = prevShipVis;
      this.rainSystem.group.visible = prevRainVis;
      this.skyBodies.starPoints.visible = prevStarVis;
    }
  }

  private prewarmSceneTextures(root: THREE.Object3D = this.scene): void {
    if (this.isSoftwareGl || !this.renderer) return;
    const seen = new Set<THREE.Texture>();
    const visitTex = (t: unknown) => {
      if (t instanceof THREE.Texture && t.isTexture && !seen.has(t)) {
        seen.add(t);
        this.renderer.initTexture(t);
      }
    };
    root.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const m of mats) {
        if (!m) continue;
        const std = m as THREE.MeshStandardMaterial;
        visitTex(std.map);
        visitTex(std.normalMap);
        visitTex(std.roughnessMap);
        visitTex(std.bumpMap);
        visitTex(std.emissiveMap);
        visitTex(std.aoMap);
        visitTex(std.metalnessMap);
      }
    });
  }

  private setupInputs(): void {
    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp, true);
    window.addEventListener('wheel', this.onWheel, { passive: true });
    window.addEventListener('blur', this.onWindowBlur);
    window.addEventListener('pagehide', this.onWindowBlur);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.renderer.domElement.addEventListener('pointerdown', this.onCanvasPointerDown);
  }

  private onCanvasPointerDown = (e: PointerEvent): void => {
    if (
      this.mode !== 'playing' ||
      !canProcessGameplayInput(this.masterRuntime) ||
      this.gameOver ||
      this.cinematicActive
    ) {
      return;
    }
    if (e.button !== 0) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    this._tapNdc.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );

    // 1. HIGHEST PRIORITY: Car Elevator Computer Terminal (never cascade to nearby vehicles)
    const kioskGroup = this.world?.undergroundElevator?.computerGroup;
    if (
      kioskGroup &&
      !this.inSpacePlanet &&
      this.currentDimension === 'overworld' &&
      !this.activeVehicleId
    ) {
      const kx = UNDERGROUND_ELEVATOR_KIOSK_POS.x - this.playerX;
      const kz = UNDERGROUND_ELEVATOR_KIOSK_POS.z - this.playerZ;
      if (kx * kx + kz * kz <= 8.5 * 8.5) {
        _raycaster.setFromCamera(this._tapNdc, this.camera);
        _raycaster.far = 7.5;
        const kioskHits = _raycaster.intersectObject(kioskGroup, true);
        if (kioskHits.length > 0) {
          this.openUndergroundElevator();
          return;
        }
      }
    }

    // If standing directly at the Elevator Computer Terminal on foot, block car console raycasts
    if (!this.activeVehicleId && this.isNearElevatorTerminal()) {
      return;
    }

    // 2. LOWER PRIORITY: Raycast nearby or active vehicle's 3D interior console buttons (Droptop, Rim Lights, Lift)
    const buttonMeshes: THREE.Object3D[] = [];
    const buttonActionMap = new Map<
      THREE.Object3D,
      { vehicleId: string; action: 'droptop' | 'rim_light' | 'lift' }
    >();
    for (const v of this.vehicles) {
      const dx = v.x - this.playerX;
      const dz = v.z - this.playerZ;
      if (v.id !== this.activeVehicleId && dx * dx + dz * dz > VEHICLE_INTERACT_RADIUS_SQ) {
        continue;
      }
      const handles = this.vehicleMeshes.get(v.id);
      if (!handles) continue;
      if (
        handles.droptopButton &&
        (v.hasConvertibleTop || v.preset === 'cadillac_coupe_deville')
      ) {
        buttonMeshes.push(handles.droptopButton);
        buttonActionMap.set(handles.droptopButton, {
          vehicleId: v.id,
          action: 'droptop',
        });
      }
      if (handles.rimLightButton) {
        buttonMeshes.push(handles.rimLightButton);
        buttonActionMap.set(handles.rimLightButton, {
          vehicleId: v.id,
          action: 'rim_light',
        });
      }
      if (handles.liftButton) {
        buttonMeshes.push(handles.liftButton);
        buttonActionMap.set(handles.liftButton, {
          vehicleId: v.id,
          action: 'lift',
        });
      }
    }
    if (buttonMeshes.length === 0) return;

    _raycaster.setFromCamera(this._tapNdc, this.camera);
    _raycaster.far = 7.5;
    const hits = _raycaster.intersectObjects(buttonMeshes, true);
    if (hits.length > 0) {
      let obj: THREE.Object3D | null = hits[0].object;
      while (obj) {
        const meta = buttonActionMap.get(obj);
        if (meta) {
          if (meta.action === 'droptop') {
            this.toggleConvertibleTop(meta.vehicleId);
          } else if (meta.action === 'rim_light') {
            this.cycleVehicleRimLights(meta.vehicleId);
          } else if (meta.action === 'lift') {
            this.toggleVehicleSlamLift(meta.vehicleId);
          }
          return;
        }
        obj = obj.parent;
      }
    }
  };

  private onWindowBlur = (): void => {
    this.clearMovementInputs();
  };

  private onVisibilityChange = (): void => {
    if (document.hidden) {
      this.clearMovementInputs();
      this.rafPausedByVisibility = true;
      this.fpsController.stop();
      this.clock.stop();
    } else if (this.rafPausedByVisibility && !this.disposed) {
      this.rafPausedByVisibility = false;
      this.clock.start();
      this.clock.getDelta();
      this.resetFrameTiming();
      this.fpsController.start(this._stepHandlers);
    }
  };

  private clearMovementInputs(): void {
    this.keys = {};
    this.joyX = 0;
    this.joyY = 0;
    this.touchSprint = false;
    this.touchFlyAscend = false;
    this.touchFlyDescend = false;
    this.vehicleAscendHold = false;
    this.vehicleDescendHold = false;
    this.isAiming = false;
    this.gamepadGas = 0;
    this.gamepadBrake = 0;
    this.gamepadHandbrake = false;
    this.camBobBlend = 0;
    this.camStepOffsetY = 0;
  }

  private onResize = (): void => {
    if (this.disposed || !this.container) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    ZeroStutterCameraController.applyRendererCaps(
      this.renderer,
      this.isSoftwareGl ? 1 : this.isTouchDevice ? 1.5 : 2,
    );
    this.renderer.setSize(w, h);
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    const activeEl = document.activeElement as HTMLElement | null;
    if (
      activeEl &&
      (activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.isContentEditable)
    ) {
      return;
    }
    this.keys[e.code] = true;
    const keyLower = e.key ? e.key.toLowerCase() : '';
    if (keyLower) this.keys[`key_${keyLower}`] = true;
    this.sound.unlock();
    if (this.ridingCoasterId && !this.gameOver && (e.code === 'KeyE' || keyLower === 'e' || e.code === 'Space')) {
      e.preventDefault();
      this.exitCoasterRide();
      return;
    }
    if (this.activeVehicleId && !this.gameOver && (e.code === 'KeyE' || keyLower === 'e')) {
      e.preventDefault();
      this.exitVehicle();
      return;
    }
    if (
      this.mode !== 'playing' ||
      !canProcessGameplayInput(this.masterRuntime) ||
      this.gameOver ||
      this.cinematicActive
    ) {
      if (this.cinematicActive && e.code === 'Space') {
        e.preventDefault();
        this.skipCinematic();
      }
      return;
    }

    if (
      e.code === 'Space' ||
      e.code === 'ArrowUp' ||
      e.code === 'ArrowDown' ||
      e.code === 'ArrowLeft' ||
      e.code === 'ArrowRight'
    ) {
      e.preventDefault();
    }

    const activeVehicle = this.activeVehicleId
      ? this.vehicles.find((v) => v.id === this.activeVehicleId)
      : undefined;
    const activeHasHyd = this.vehicleHasHydraulics(activeVehicle);
    const activeHasBass = this.isOldSchoolVehicle(activeVehicle);

    if (e.code === 'Space') {
      if (this.activeVehicleId) {
        if (activeHasHyd) {
          this.triggerHydraulicAction('front_hop');
        } else {
          this.vehicleAscendHold = true;
        }
      } else if (this.seatedState) {
        this.standUp();
      } else if (!e.repeat) {
        const now = performance.now();
        if (now - this.lastSpaceTapMs < 280) {
          this.lastSpaceTapMs = 0;
          this.togglePlayerFlight();
        } else {
          this.lastSpaceTapMs = now;
          if (!this.flightAndTeleport.flying) {
            this.triggerJump();
          }
        }
      }
    } else if (activeHasHyd && (e.code === 'Digit1' || e.code === 'Numpad1')) {
      this.triggerHydraulicAction('front_hop');
    } else if (activeHasHyd && (e.code === 'KeyZ' || e.code === 'Digit2' || e.code === 'Numpad2')) {
      this.triggerHydraulicAction('rear_hop');
    } else if (activeHasHyd && (e.code === 'KeyQ' || e.code === 'Digit3' || e.code === 'Numpad3')) {
      this.triggerHydraulicAction('left_tilt');
    } else if (activeHasHyd && (e.code === 'KeyR' || e.code === 'Digit4' || e.code === 'Numpad4')) {
      this.triggerHydraulicAction('right_tilt');
    } else if (activeHasHyd && (e.code === 'KeyX' || e.code === 'Digit5' || e.code === 'Numpad5')) {
      this.triggerHydraulicAction('lock_up');
    } else if (
      activeVehicle &&
      (activeVehicle.hasConvertibleTop || activeVehicle.preset === 'cadillac_coupe_deville') &&
      (e.code === 'KeyT' || e.code === 'KeyG')
    ) {
      this.toggleConvertibleTop(activeVehicle.id);
    } else if (activeHasBass && (e.code === 'KeyT' || e.code === 'KeyG')) {
      this.toggleTrunkBass();
    } else if (e.code === 'KeyL' && this.activeVehicleId) {
      this.cycleVehicleRimLights(this.activeVehicleId);
    } else if (e.code === 'KeyB' && this.activeVehicleId) {
      this.openCarRadio();
    } else if (e.code === 'F5' || (e.code === 'KeyK' && !this.activeVehicleId && !this.ridingCoasterId)) {
      if (e.code === 'F5') e.preventDefault();
      this.toggleCameraView();
    } else if (e.code === 'KeyV') {
      if (this.activeVehicleId) {
        this.toggleVehicleInteriorCamera();
      } else {
        this.triggerDebrisKick();
      }
    } else if (e.code === 'KeyC' || e.code === 'ControlLeft') {
      if (this.activeVehicleId) {
        if (activeHasHyd && !this.getVehicleSpecs(activeVehicle!).canFly) {
          this.triggerHydraulicAction('drop');
        } else {
          this.vehicleDescendHold = true;
        }
      } else {
        this.isCrouching = !this.isCrouching;
        this.touchCrouch = this.isCrouching;
        this.emitHud();
      }
    } else if (e.code === 'KeyE') {
      if (this.activeVehicleId) {
        this.exitVehicle();
      } else {
        this.triggerPrimaryAction();
      }
    } else if (e.code === 'KeyF') {
      if (this.activeVehicleId) {
        this.openVehicleCargo(this.activeVehicleId);
      } else {
        this.collectNearbyCarcass();
      }
    } else if (e.code === 'KeyX') {
      if (!this.activeVehicleId) {
        this.dismantleNearbyKineticNode();
      }
    } else if (e.code === 'KeyR') {
      const eqId = this.getEquippedItemId();
      if (
        eqId &&
        isFirearmItem(eqId) &&
        !ITEMS[eqId].structuralKind &&
        !ITEMS[eqId].kineticKind
      ) {
        this.reloadEquippedWeapon();
      } else {
        this.rotateBuildPiece();
      }
    } else if (e.code === 'Digit0' || e.code === 'Backquote') {
      this.selectHotbarSlot(-1);
    } else if (e.code.startsWith('Digit')) {
      const idx = parseInt(e.code.replace('Digit', ''), 10) - 1;
      if (idx >= 0 && idx < this.hotbarItemIds.length) {
        this.selectHotbarSlot(idx);
      }
    }
  };

  private onWheel = (e: WheelEvent): void => {
    if (this.mode !== 'playing' || this.gameOver || this.cinematicActive) {
      return;
    }
    const targetEl = e.target as HTMLElement | null;
    const overHotbar = Boolean(targetEl?.closest?.('[data-hud-hotbar]'));
    // Allow normal vertical mouse wheel to scroll the whole game freely;
    // only cycle hotbar slots when Shift+Wheel is used or horizontally over the hotbar.
    if (!e.shiftKey && !(overHotbar && Math.abs(e.deltaX) > Math.abs(e.deltaY))) {
      return;
    }
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (delta === 0) return;

    const now = performance.now();
    if (now - this.lastWheelSwitchTime < 55) return;

    this.wheelAccum += delta;
    if (Math.abs(this.wheelAccum) < 18) return;

    const dir: 1 | -1 = this.wheelAccum > 0 ? 1 : -1;
    this.wheelAccum = 0;
    this.lastWheelSwitchTime = now;
    this.cycleHotbarSlot(dir);
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys[e.code] = false;
    const keyLower = e.key ? e.key.toLowerCase() : '';
    if (keyLower) this.keys[`key_${keyLower}`] = false;
    if (e.code === 'Space') {
      this.vehicleAscendHold = false;
    }
    if (e.code === 'KeyC' || e.code === 'ControlLeft') {
      this.vehicleDescendHold = false;
    }
  };

  public unlockAudio(): void {
    this.sound.unlock();
    this.smartTv?.unlockAudio();
  }

  public setActiveModalKind(kind: ActiveModalKind): void {
    if (kind === 'none') {
      closeExclusiveModal(this.masterRuntime, () => this.clearMovementInputs());
    } else {
      openExclusiveModal(this.masterRuntime, kind, () => this.clearMovementInputs());
    }
  }

  public getMasterRuntimeSnapshot(): Readonly<MasterRuntimeState> {
    return this.masterRuntime;
  }

  public toggleCameraView(): CameraViewMode {
    const next = this.playerCameraRig.toggleMode();
    this.masterRuntime.isThirdPerson = next === 'third_person';
    this.snapPlayerCamera();
    this.toast(
      next === 'third_person'
        ? '3rd-Person Follow Camera ON'
        : '1st-Person View ON',
      'info',
    );
    this.emitHud();
    return next;
  }

  public setCameraViewMode(mode: CameraViewMode): void {
    if (this.playerCameraRig.mode === mode) return;
    this.playerCameraRig.setMode(mode);
    this.masterRuntime.isThirdPerson = mode === 'third_person';
    this.snapPlayerCamera();
    this.emitHud();
  }

  private snapPlayerCamera(): void {
    if (!this.camera) return;
    const inVehicle = Boolean(this.activeVehicleId && !this.vehicleInteriorCamera);
    if (inVehicle) {
      const activeV = this.vehicles.find((v) => v.id === this.activeVehicleId);
      if (activeV) {
        this._chaseTargetScratch.set(activeV.x, activeV.y, activeV.z);
        this.playerCameraRig.yaw = this.camYaw + Math.PI;
        this.playerCameraRig.pitch = THREE.MathUtils.clamp(-this.camPitch, -0.55, 0.75);
        this.playerCameraRig.snapTo(
          this.camera,
          this._chaseTargetScratch,
          true,
          this._groundSampleFn,
        );
        return;
      }
    }
    this._chaseTargetScratch.set(this.playerX, this.playerY, this.playerZ);
    this.playerCameraRig.yaw = this.camYaw + Math.PI;
    this.playerCameraRig.pitch =
      this.playerCameraRig.mode === 'third_person'
        ? THREE.MathUtils.clamp(-this.camPitch, -0.75, 1.05)
        : THREE.MathUtils.clamp(this.camPitch, -1.42, 1.42);
    this.playerCameraRig.snapTo(
      this.camera,
      this._chaseTargetScratch,
      false,
      this._groundSampleFn,
    );
  }

  public updateZeroAllocFollowCamera(
    dt: number,
    isThirdPerson = this.masterRuntime.isThirdPerson,
  ): void {
    if (!this.camera) return;
    this.playerCameraRig.setMode(isThirdPerson ? 'third_person' : 'first_person');
    this.masterRuntime.isThirdPerson = isThirdPerson;
    this._chaseTargetScratch.set(this.playerX, this.playerY, this.playerZ);
    this.playerCameraRig.yaw = this.camYaw + Math.PI;
    this.playerCameraRig.pitch = isThirdPerson
      ? THREE.MathUtils.clamp(-this.camPitch, -0.75, 1.05)
      : THREE.MathUtils.clamp(this.camPitch, -1.42, 1.42);
    this.playerCameraRig.step(
      this.camera,
      this._chaseTargetScratch,
      this.masterRuntime.isInVehicle,
      dt,
      this._groundSampleFn,
    );
  }

  private resetFrameTiming(): void {
    const now = performance.now();
    this.frameWatch.lastTimeMs = now;
    this.masterRuntime.lastFrameMs = now;
    this.lastFramePerfMs = now;
    this.pendingCameraDt = Permanent60FpsController.FIXED_DT;
    this.fpsController.resetTiming();
    this.fpsSampleTimer = 0;
    this.fpsSampleFrames = 0;
    this.fpsSampleAccumMs = 0;
    this.fpsDisplayTimer = 0;
    this.fpsDisplayFrames = 0;
    this.fpsDisplayAccumMs = 0;
    this.consecutiveSlowSeconds = 0;
    this.consecutiveFastSeconds = 0;
    this.autoFpsRestoreCooldown = 0;
  }

  private cullPlacedObjectsByDistance(cx: number, cz: number, maxDist: number): void {
    const inOverworld = this.currentDimension === 'overworld';
    const maxDistSq = maxDist * maxDist;
    for (let i = 0; i < this.structures.length; i++) {
      const st = this.structures[i];
      const vis = this.structureVisuals.get(st.id);
      if (vis) {
        const dx = st.x - cx;
        const dz = st.z - cz;
        vis.group.visible = inOverworld && dx * dx + dz * dz <= maxDistSq;
      }
    }
    for (let i = 0; i < this.structuralBlocks.length; i++) {
      const blk = this.structuralBlocks[i];
      const mesh = this.structuralMeshes.get(blk.id);
      if (mesh) {
        const dx = blk.x - cx;
        const dz = blk.z - cz;
        mesh.visible = inOverworld && dx * dx + dz * dz <= maxDistSq;
      }
    }
    this.updateStructureLightPool(cx, cz, maxDistSq, inOverworld);
  }

  private applyMenuCullImmediate(): void {
    if (!this.world) return;
    this.worldQueue.clear();
    if (this.currentDimension === 'overworld' && this.worldType === 'island') {
      const cullDist = Math.min(this.effectiveMaxDrawDistance, 220);
      this.world.cullWorldByDistance(0, 0, cullDist, undefined, this.maxActivePointLights);
      this.cullPlacedObjectsByDistance(0, 0, cullDist);
    }
    this.shadowLastCamX = NaN;
    this.shadowUpdateFrame = 0;
  }

  private applyCinematicCullImmediate(): void {
    if (!this.world) return;
    this.worldQueue.clear();
    if (this.currentDimension === 'overworld' && this.worldType === 'island') {
      const cullDist = Math.max(this.effectiveMaxDrawDistance, 210);
      this.world.cullWorldByDistance(0, 740, cullDist, undefined, this.maxActivePointLights);
      this.cullPlacedObjectsByDistance(0, 740, cullDist);
    }
    this.shadowLastCamX = NaN;
    this.shadowUpdateFrame = 0;
  }

  private applyPlayingCullImmediate(): void {
    if (!this.world) return;
    this.worldQueue.clear();
    if (this.currentDimension === 'overworld' && this.worldType === 'island') {
      this.world.cullWorldByDistance(
        this.playerX,
        this.playerZ,
        this.effectiveMaxDrawDistance,
        undefined,
        this.maxActivePointLights,
      );
      this.cullPlacedObjectsByDistance(this.playerX, this.playerZ, this.effectiveMaxDrawDistance);
    }
    this.shadowLastCamX = NaN;
    this.shadowUpdateFrame = 0;
  }

  public setMode(mode: 'menu' | 'playing' | 'paused'): void {
    const prevMode = this.mode;
    const wasNotPlaying = prevMode !== 'playing';
    this.mode = mode;
    if (mode !== 'playing') {
      this.clearMovementInputs();
      this.sound.stopTrunkBass();
      if (mode === 'menu' && prevMode !== 'menu') {
        this.menuCameraSnapped = false;
        this.applyMenuCullImmediate();
        this.resetFrameTiming();
      }
    } else {
      closeExclusiveModal(this.masterRuntime);
      this.sound.unlock();
      this.smartTv?.unlockAudio();
      if (wasNotPlaying) {
        this.ensurePlayerHasGun(false);
        if (!this.cinematicActive) {
          this.snapPlayerCamera();
          this.applyPlayingCullImmediate();
        } else {
          this.applyCinematicCullImmediate();
        }
        this.resetFrameTiming();
        this.emitHud();
      }
    }
  }

  public updateSettings(settings: GameSettings): void {
    this.settings = settings;
    this.sound.configure(settings);
    this.autoFpsTier = 0;
    this.consecutiveSlowSeconds = 0;
    this.consecutiveFastSeconds = 0;
    this.autoFpsRestoreCooldown = 0;
    this.fpsSampleTimer = 0;
    this.fpsSampleFrames = 0;
    this.fpsSampleAccumMs = 0;
    this.applyGraphicsProfile();
  }

  private applyGraphicsProfile(): void {
    if (!this.renderer || !this.scene || !this.camera) return;

    const preset = normalizeGraphicsPreset(
      this.settings.graphicsPreset,
      this.settings.graphicsQuality,
    );

    // Stable Hardware-Calibrated Graphics Profile (zero mid-game shader recompilations or framebuffer resizes):
    // Respects the user's chosen preset, shadows, and draw distance permanently without oscillating.
    const shadowsOn =
      this.settings.shadowsEnabled !== false &&
      preset !== 'low' &&
      !this.isSoftwareGl;

    const shadowMapSize =
      preset === 'ultra' && !this.isTouchDevice
        ? 2048
        : 1024;
    const shadowHalfExtent =
      preset === 'ultra'
        ? this.isTouchDevice
          ? 52
          : 80
        : preset === 'high'
          ? this.isTouchDevice
            ? 46
            : 64
          : preset === 'medium'
            ? this.isTouchDevice
              ? 40
              : 48
            : 36;
    const shadowFar =
      preset === 'ultra' && !this.isTouchDevice
        ? 260
        : preset === 'high' && !this.isTouchDevice
          ? 210
          : 175;
    const shadowRadius = this.isTouchDevice
      ? 1.0
      : preset === 'ultra'
        ? 2.5
        : 2.0;

    let dpr = 1;
    if (!this.isSoftwareGl) {
      const nativeDpr = window.devicePixelRatio || 1;
      if (preset === 'low') {
        dpr = 1;
      } else if (this.isTouchDevice) {
        // Crisp iPhone/mobile Retina clarity without 3x pixel fillrate meltdown (9x fewer fragments than 3x DPR)
        dpr = Math.min(nativeDpr, preset === 'ultra' || preset === 'high' ? 1.3 : 1.15);
      } else if (preset === 'medium' || preset === 'high') {
        dpr = Math.min(nativeDpr, 1.5);
      } else {
        dpr = Math.min(nativeDpr, 1.75);
      }
    }

    const waterRefl =
      this.settings.waterReflectionsEnabled !== false &&
      preset !== 'low' &&
      !this.isSoftwareGl;
    const particlesOn = this.settings.particlesEnabled !== false;
    const particleScale = !particlesOn
      ? 0
      : preset === 'low'
        ? 0.5
        : preset === 'medium'
          ? 0.8
          : preset === 'ultra'
            ? this.isTouchDevice
              ? 1.0
              : 1.25
            : this.isTouchDevice
              ? 0.85
              : 1.0;
    this.effectiveParticleScale = particleScale;

    this.shaderQualityTier =
      this.isSoftwareGl || preset === 'low'
        ? 0
        : preset === 'ultra'
          ? this.isTouchDevice
            ? 1.5
            : 2.5
          : preset === 'high'
            ? this.isTouchDevice
              ? 1.25
              : 2
            : 1;

    this.oceanDetailLevel =
      this.isSoftwareGl || preset === 'low'
        ? 0.4
        : this.isTouchDevice
          ? 0.72
          : 1.0;
    this.realisticOcean?.setDetailLevel(this.oceanDetailLevel);

    this.maxActivePointLights = this.isSoftwareGl
      ? 1
      : this.isTouchDevice
        ? 3
        : 6;

    const userDistTier =
      this.settings.drawDistance ??
      (preset === 'high' ? 'far' : preset === 'low' ? 'near' : 'medium');
    let cullDist = userDistTier === 'near' ? 135 : userDistTier === 'far' ? 310 : 215;
    if (this.isTouchDevice && userDistTier === 'far') {
      cullDist = 240;
    }
    const camFar =
      cullDist <= 145
        ? 250
        : cullDist >= 260
          ? 440
          : 340;
    this.effectiveFogMult =
      userDistTier === 'near' ? 1.32 : userDistTier === 'far' ? 0.78 : 0.95;
    this.effectiveMaxDrawDistance = cullDist;
    this.effectiveShadowsEnabled = shadowsOn;
    this.effectiveShadowExtent = shadowHalfExtent;
    this.effectiveWaterReflections = waterRefl;

    dpr = Math.min(dpr, 2);
    if (Math.abs(this.renderer.getPixelRatio() - dpr) > 0.01) {
      this.renderer.setPixelRatio(dpr);
    }
    this.renderer.shadowMap.enabled = shadowsOn;
    if (this.sunLight) {
      this.sunLight.castShadow = shadowsOn;
      this.sunLight.shadow.bias = -0.00015;
      this.sunLight.shadow.normalBias = 0.025;
      this.sunLight.shadow.radius = shadowRadius;
      this.sunLight.shadow.camera.left = -shadowHalfExtent;
      this.sunLight.shadow.camera.right = shadowHalfExtent;
      this.sunLight.shadow.camera.top = shadowHalfExtent;
      this.sunLight.shadow.camera.bottom = -shadowHalfExtent;
      this.sunLight.shadow.camera.near = 1;
      this.sunLight.shadow.camera.far = shadowFar;
      this.sunLight.shadow.camera.updateProjectionMatrix();
      if (this.effectiveShadowMapSize !== shadowMapSize) {
        this.effectiveShadowMapSize = shadowMapSize;
        this.sunLight.shadow.mapSize.set(shadowMapSize, shadowMapSize);
        if (this.sunLight.shadow.map) {
          this.sunLight.shadow.map.dispose();
          (this.sunLight.shadow.map as unknown) = null;
        }
      }
      if (shadowsOn) {
        this.renderer.shadowMap.needsUpdate = true;
      }
    }

    if (this.camera.far !== camFar) {
      this.camera.far = camFar;
      this.camera.updateProjectionMatrix();
    }

    this.scene.environment = waterRefl ? this.envTexture : null;
    if (this.world) {
      this.world.setWorldShadowCasting(shadowsOn);
      const waterMats = [
        this.world.oceanMesh?.material,
        this.world.lakeMesh?.material,
      ];
      for (const m of waterMats) {
        if (m instanceof THREE.MeshStandardMaterial) {
          m.envMapIntensity = waterRefl ? 1.15 : 0.0;
          m.roughness = waterRefl ? 0.12 : 0.42;
          m.metalness = waterRefl ? 0.34 : 0.08;
        }
      }
    }

    this.creatures?.setGraphicsOptions({
      shadowsEnabled: shadowsOn,
      maxDrawDistance: cullDist,
    });

    for (const [vid, vh] of this.vehicleMeshes.entries()) {
      vh.root.userData.vShadowCast = undefined;
      applyRealisticMeshLightingPass(vh.root, {
        shadowsEnabled: shadowsOn,
        envMapIntensity: 1.0,
      });
      const disc = this.vehicleShadowDiscs.get(vid);
      if (disc) {
        disc.visible = !shadowsOn;
      }
    }
  }

  public setTouchJoystick(x: number, y: number): void {
    this.joyX = x;
    this.joyY = y;
  }

  public setTouchSprint(active: boolean): void {
    this.touchSprint = active;
  }

  public setTouchCrouch(active: boolean): void {
    this.touchCrouch = active;
    this.isCrouching = active;
    this.emitHud();
  }

  public getDragons(): DragonCompanion[] {
    return this.dragons.map((d) => ({ ...d, elements: [...d.elements] }));
  }

  public hatchDragonEgg(element: DragonElement, customName: string): DragonCompanion | null {
    if (this.dragons.length >= DRAGON_VALLEY_SYSTEM.maxActiveDragons) {
      this.toast(
        `Dragon cap reached (${DRAGON_VALLEY_SYSTEM.maxActiveDragons} max for steady FPS).`,
        'warning',
      );
      return null;
    }
    const dragon = DRAGON_VALLEY_SYSTEM.hatchEgg(element, customName);
    this.dragons.push(dragon);
    this.toast(`Hatched ${dragon.name} (${element} Hatchling)!`, 'discovery');
    return dragon;
  }

  public feedDragon(dragonId: string, amount = 35): DragonCompanion | null {
    const d = this.dragons.find((item) => item.id === dragonId);
    if (!d) return null;
    const prevStage = d.stage;
    DRAGON_VALLEY_SYSTEM.feedAndRaise(d, amount);
    if (d.isMounted) {
      this.dragonFlight.flySpeed = d.speed;
    }
    this.toast(
      d.stage !== prevStage
        ? `${d.name} evolved into a ${d.stage} (Speed ${d.speed})!`
        : `Fed ${d.name} (${d.growth}% growth).`,
      'discovery',
    );
    return d;
  }

  public combineDragons(idA: string, idB: string, hybridName: string): DragonCompanion | null {
    const a = this.dragons.find((d) => d.id === idA);
    const b = this.dragons.find((d) => d.id === idB);
    if (!a || !b || a.id === b.id) return null;
    if (a.isMounted) DRAGON_VALLEY_SYSTEM.toggleMount(this.dragonPlayerRef, a, this.dragonFlight);
    if (b.isMounted) DRAGON_VALLEY_SYSTEM.toggleMount(this.dragonPlayerRef, b, this.dragonFlight);
    const hybrid = DRAGON_VALLEY_SYSTEM.combineDragons(a, b, hybridName);
    if (this.dragons.length >= DRAGON_VALLEY_SYSTEM.maxActiveDragons) {
      this.dragons = this.dragons.filter((d) => d.id !== a.id && d.id !== b.id);
    }
    this.dragons.push(hybrid);
    this.toast(
      `Combined into ${hybrid.name} (${hybrid.elements.join('-')} • Speed ${hybrid.speed})!`,
      'discovery',
    );
    return hybrid;
  }

  public renameDragonWithAnvil(dragonId: string, rawTagText: string): boolean {
    const d = this.dragons.find((item) => item.id === dragonId);
    if (!d) return false;
    const res = DRAGON_VALLEY_SYSTEM.applyAnvilNameTag(d, rawTagText, true, true);
    if (!res.ok) {
      this.toast(res.reason, 'warning');
      return false;
    }
    this.toast(`Anvil Name Tag applied: ${res.name}`, 'discovery');
    return true;
  }

  public toggleMountDragon(dragonId: string): boolean {
    const target = this.dragons.find((d) => d.id === dragonId);
    if (!target) return false;
    for (const other of this.dragons) {
      if (other.id !== target.id && other.isMounted) {
        DRAGON_VALLEY_SYSTEM.toggleMount(this.dragonPlayerRef, other, this.dragonFlight);
      }
    }
    const mounted = DRAGON_VALLEY_SYSTEM.toggleMount(
      this.dragonPlayerRef,
      target,
      this.dragonFlight,
    );
    this.toast(
      mounted
        ? `Mounted ${target.name}! Space = Ascend, Shift/C = Descend, WASD = Fly.`
        : `Dismounted ${target.name}.`,
      'discovery',
    );
    return mounted;
  }

  public setAiming(active: boolean): void {
    this.isAiming = active;
  }

  public setGamepadDriveState(
    gas: number,
    brake: number,
    handbrake: boolean,
  ): void {
    this.gamepadGas = THREE.MathUtils.clamp(gas, 0, 1);
    this.gamepadBrake = THREE.MathUtils.clamp(brake, 0, 1);
    this.gamepadHandbrake = handbrake;
  }

  public triggerXboxBAction(): void {
    this.sound.unlock();
    if (this.mode !== 'playing' || this.gameOver || this.cinematicActive) return;
    if (this.activeVehicleId) {
      const av = this.vehicles.find((v) => v.id === this.activeVehicleId);
      if (av && this.vehicleHasHydraulics(av)) {
        this.triggerHydraulicAction('rear_hop');
      }
      return;
    }
    this.setTouchCrouch(!this.isCrouching);
  }

  public triggerXboxXAction(): void {
    this.sound.unlock();
    if (this.mode !== 'playing' || this.gameOver || this.cinematicActive) return;
    if (this.activeVehicleId) {
      const av = this.vehicles.find((v) => v.id === this.activeVehicleId);
      if (av && this.vehicleHasHydraulics(av)) {
        this.triggerHydraulicAction('lock_up');
      }
      return;
    }

    const near = this.nearbyInteraction;
    const isInteractableWorldObject = Boolean(
      near &&
        near.kind !== 'gun_action' &&
        near.kind !== 'tool_action',
    );
    if (isInteractableWorldObject) {
      if (near?.kind === 'carcass') {
        this.collectNearbyCarcass();
        return;
      }
      this.triggerPrimaryAction();
      return;
    }

    const eqId = this.getEquippedItemId();
    if (eqId && isFirearmItem(eqId)) {
      this.reloadEquippedWeapon();
      return;
    }

    this.triggerPrimaryAction();
  }

  public triggerXboxYAction(): void {
    this.sound.unlock();
    if (this.mode !== 'playing' || this.gameOver || this.cinematicActive) return;
    if (this.activeVehicleId) {
      this.exitVehicle();
      return;
    }
    if (this.seatedState) {
      this.standUp();
      return;
    }
    let nearestVeh: ModularVehicleData | null = null;
    let bestDist = 6.2;
    for (const v of this.vehicles) {
      const d = Math.hypot(v.x - this.playerX, v.z - this.playerZ);
      if (d < bestDist && Math.abs(v.y - this.playerY) < 4.5) {
        bestDist = d;
        nearestVeh = v;
      }
    }
    if (nearestVeh) {
      this.enterVehicle(nearestVeh.id);
    } else {
      this.toast('Move closer to a vehicle to enter (Y)', 'info');
    }
  }

  public triggerXboxBumper(dir: -1 | 1): void {
    this.sound.unlock();
    if (this.mode !== 'playing' || this.gameOver || this.cinematicActive) return;
    if (this.activeVehicleId) {
      const av = this.vehicles.find((v) => v.id === this.activeVehicleId);
      if (av && this.vehicleHasHydraulics(av)) {
        this.triggerHydraulicAction(dir < 0 ? 'left_tilt' : 'right_tilt');
      }
      return;
    }
    this.cycleHotbarSlot(dir);
  }

  public toggleSmartRadio(): void {
    this.sound.unlock();
    this.smartTv?.unlockAudio();
    if (!this.smartTv.power) {
      if (this.smartTv.currentChannel === 5) {
        this.smartTv.setChannel(1);
      }
      this.smartTv.togglePower();
      const meta = this.smartTv.getCurrentChannelMeta();
      this.toast(`Radio & TV ON: ${meta.badge} · ${meta.name}`, 'discovery');
    } else if (this.smartTv.isPaused) {
      this.smartTv.togglePlayPause();
      const meta = this.smartTv.getCurrentChannelMeta();
      this.toast(`Radio & TV Resumed: ${meta.name}`, 'info');
    } else {
      this.smartTv.togglePower();
      this.toast('Radio & TV OFF', 'info');
    }
    this.emitHud();
  }

  public triggerXboxDpadLeft(): void {
    this.sound.unlock();
    if (this.mode !== 'playing' || this.gameOver || this.cinematicActive) return;
    if (this.activeVehicleId) {
      const av = this.vehicles.find((v) => v.id === this.activeVehicleId);
      if (this.isOldSchoolVehicle(av)) {
        this.toggleTrunkBass();
      } else {
        this.toggleSmartRadio();
      }
      return;
    }
    const nearBassVeh = this.vehicles.find(
      (v) =>
        this.isOldSchoolVehicle(v) &&
        Math.hypot(v.x - this.playerX, v.z - this.playerZ) < 8,
    );
    if (nearBassVeh) {
      nearBassVeh.trunkBassEnabled = !nearBassVeh.trunkBassEnabled;
      this.toast(
        nearBassVeh.trunkBassEnabled ? 'Trunk Bass ON' : 'Trunk Bass OFF',
        nearBassVeh.trunkBassEnabled ? 'discovery' : 'info',
      );
      this.emitHud();
      return;
    }
    this.toggleSmartRadio();
  }

  public triggerXboxDpadRight(): void {
    if (this.mode !== 'playing' || this.gameOver || this.cinematicActive) return;
    this.toggleSmartRadio();
  }

  public addCameraLookDelta(dx: number, dy: number, isTouch = false): void {
    if (this.mode !== 'playing' || this.gameOver || this.cinematicActive) return;
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) return;
    if (!Number.isFinite(this.camYaw)) this.camYaw = 0;
    if (!Number.isFinite(this.camPitch)) this.camPitch = -0.05;
    const clampedDx = THREE.MathUtils.clamp(dx, -140, 140);
    const clampedDy = THREE.MathUtils.clamp(dy, -140, 140);
    const baseSens = isTouch ? 0.0078 : 0.0048;
    const sens = baseSens * this.settings.cameraSensitivity;
    this.camYaw -= clampedDx * sens;
    const ySign = this.settings.invertCameraY ? -1 : 1;
    this.camPitch = THREE.MathUtils.clamp(
      this.camPitch - clampedDy * sens * ySign,
      -1.42,
      1.42,
    );
    this.playerYaw = this.camYaw + Math.PI;
    this.playerCameraRig.yaw = this.playerYaw;
    this.playerCameraRig.pitch =
      this.playerCameraRig.mode === 'third_person'
        ? THREE.MathUtils.clamp(-this.camPitch, -0.75, 1.05)
        : this.camPitch;
  }

  public triggerJump(): void {
    this.sound.unlock();
    if (
      this.mode !== 'playing' ||
      !canProcessGameplayInput(this.masterRuntime) ||
      this.gameOver ||
      this.cinematicActive
    ) {
      return;
    }
    if (this.activeVehicleId) {
      const av = this.vehicles.find((v) => v.id === this.activeVehicleId);
      if (av && this.vehicleHasHydraulics(av)) {
        this.triggerHydraulicAction('front_hop');
      }
      return;
    }
    if (this.seatedState) {
      this.standUp();
      return;
    }
    const jumpMult = this.modSystem?.tweaks.jumpMultiplier ?? 1;
    if (this.wallRunTimer > 0) {
      // Wall-Kick Leap off vertical wall!
      this.playerVelY = 9.0 * jumpMult;
      this.playerX += this.wallRunNormX * 1.15;
      this.playerZ += this.wallRunNormZ * 1.15;
      this.wallRunTimer = 0;
      this.wallRunSide = 0;
      this.wallRunCooldown = 0.32;
      this.grounded = false;
      this.sound.playWallRunStep();
      this.spawnParticles(this.playerX, this.playerY + 0.6, this.playerZ, 0xa8a29e, 7);
      this.toast('Wall-Kick Leap!', 'info');
      this.emitHud();
      return;
    }
    if (this.tryTriggerVault()) {
      return;
    }
    if (this.grounded && !this.isSwimming) {
      this.playerVelY = 7.4 * jumpMult;
      this.grounded = false;
    }
  }

  public setPlayerGender(gender: PlayerGender): void {
    this.playerGender = gender === 'girl' ? 'girl' : 'boy';
    this.pirateCinematic?.setPlayerGender(this.playerGender);
    this.navigatorCompanion?.setGenderForPlayer(this.playerGender);
    this.emitHud();
  }

  public setNavigatorTask(task: NavigatorTask): void {
    this.navigatorCompanion?.setTask(task);
    this.emitHud();
  }

  public setNavigatorAllowDriving(allowed: boolean): void {
    this.navigatorCompanion?.setAllowDriving(allowed);
    this.toast(
      allowed
        ? `${this.navigatorCompanion.getName()} is now allowed to drive your cars!`
        : `${this.navigatorCompanion.getName()} will no longer drive cars.`,
      'info',
    );
    this.emitHud();
  }

  public setNavigatorGender(gender: PlayerGender): void {
    this.navigatorCompanion?.setGender(gender);
    this.emitHud();
  }

  public collectNavigatorSharedLoot(): void {
    if (!this.navigatorCompanion) return;
    const items = this.navigatorCompanion.collectAllSharedLoot();
    if (items.length === 0) return;
    for (const slot of items) {
      this.addItem(slot.itemId, slot.quantity, false);
    }
    this.sound.playPickup();
    this.toast(
      `Collected ${items.reduce((s, x) => s + x.quantity, 0)} shared supplies from ${this.navigatorCompanion.getName()}'s backpack!`,
      'craft',
    );
    this.emitHud();
  }

  public replayPirateIntro(): void {
    if (this.worldType !== 'island') return;
    this.cinematicActive = true;
    this.cinematicCameraInitialized = false;
    this.cinematicTimer = 0;
    this.cinematicSubtitle =
      'Thunder splits the sky! Broadside cannons BOOM as the pirate crew battles the storm!';
    this.cinematicCrewShout = 'CAPTAIN: "HOLD FAST! MAN THE DECK!" · CANNONS BOOMING';
    this.lastCinematicHudSubtitle = this.cinematicSubtitle;
    this.lastCinematicHudCrewShout = this.cinematicCrewShout;
    this.weather = 'storm';
    this.shipModel.visible = false;
    this.pirateCinematic.setPlayerGender(this.playerGender);
    this.pirateCinematic.reset(OCEAN_LEVEL);
    this.pirateCinematic.root.visible = true;
    this.shipModel.position.set(-34, OCEAN_LEVEL - 0.15, 846);
    this.applyCinematicCullImmediate();
    this.mode = 'playing';
    this.emitHud();
  }

  public skipCinematic(): void {
    if (!this.cinematicActive) return;
    this.finishCinematic();
  }

  private finishCinematic(): void {
    this.cinematicActive = false;
    this.cinematicCameraInitialized = false;
    this.cinematicSubtitle = '';
    this.cinematicCrewShout = '';
    this.lastCinematicHudSubtitle = '';
    this.lastCinematicHudCrewShout = '';
    this.shipModel.visible = false;
    if (this.pirateCinematic) {
      this.pirateCinematic.root.visible = false;
    }
    this.weather = 'clear';
    this.weatherTimer = 85;
    this.lightningFlash = 0;

    this.playerX = PLAYER_SPAWN.x;
    this.playerZ = PLAYER_SPAWN.z;
    this.playerY = getTerrainHeight(this.playerX, this.playerZ);
    this.camYaw = 0.12;
    this.camPitch = -0.05;
    this.playerYaw = this.camYaw + Math.PI;
    this.snapPlayerCamera();
    this.applyPlayingCullImmediate();
    this.markExploredAroundPlayer();

    const wreckX = SHIPWRECK_POS.x;
    const wreckZ = SHIPWRECK_POS.z;
    const treasureDrops: [ItemId, number][] = [
      ['gold_bar', 10],
      ['diamond', 4],
      ['sapphire', 5],
      ['ruby', 5],
      ['emerald', 4],
      ['iron_ingot', 20],
      ['space_crystal', 5],
      ['space_gem', 3],
      ['glock_19', 1],
      ['desert_eagle', 1],
      ['ak_47', 1],
      ['m4a1', 1],
      ['remington_870', 1],
      ['barrett_50', 1],
      ['mp5', 1],
      ['m249_saw', 1],
      ['nautical_map', 1],
      ['navigation_sextant', 1],
      ['captain_key', 1],
      ['ammo', 120],
    ];
    // Spread shipwreck loot mesh creation across frames via FrameBudgetQueue to avoid a transition hitch
    const dropBatches = [
      { cx: wreckX - 2.8, cz: wreckZ - 7.0, items: treasureDrops.slice(0, 8) },
      { cx: wreckX - 1.5, cz: wreckZ - 2.0, items: treasureDrops.slice(8) },
    ];
    for (const batch of dropBatches) {
      batch.items.forEach(([itemId, quantity], idx) => {
        const angle = (idx / Math.max(1, batch.items.length)) * Math.PI * 2 + Math.random() * 0.6;
        const r = 0.55 + (idx % 3) * 0.32;
        const px = batch.cx + Math.cos(angle) * r;
        const pz = batch.cz + Math.sin(angle) * r;
        this.worldQueue.enqueue(() => {
          this.spawnPickup(itemId, quantity, px, pz, 180, undefined, 0, false);
        });
      });
    }

    this.toast(
      'SHIPWRECK BEACHED! 4 Unlocked Loot Chests on ship & shoreline (Shotguns, Rifles, Barrett .50, Glocks & Ammo)!',
      'discovery',
    );
    this.resetFrameTiming();
    this.emitHud();
  }

  public getEquippedItemId(): ItemId | null {
    if (
      this.equippedSlot < 0 ||
      this.equippedSlot >= this.hotbarItemIds.length
    ) {
      return null;
    }
    const id = this.hotbarItemIds[this.equippedSlot];
    if (!id || this.getItemCount(id) <= 0) return null;
    return id;
  }

  public selectHotbarSlot(index: number): void {
    if (index === -1 || (index >= 0 && index < this.hotbarItemIds.length)) {
      this.equippedSlot = index;
      const nextEq = this.getEquippedItemId();
      if (this.reloadingItemId && nextEq !== this.reloadingItemId) {
        this.cancelReload();
      }
      this.emitHud();
    }
  }

  public cycleHotbarSlot(dir: 1 | -1): void {
    const len = this.hotbarItemIds.length;
    // Order: -1 (Hands), 0, 1, ..., len - 1
    const totalPositions = len + 1;
    const currentPos = this.equippedSlot < 0 ? 0 : this.equippedSlot + 1;
    const nextPos = (currentPos + dir + totalPositions) % totalPositions;
    this.selectHotbarSlot(nextPos - 1);
  }

  public assignHotbarSlot(slotIndex: number, itemId: ItemId | null): void {
    if (slotIndex < 0 || slotIndex >= this.hotbarItemIds.length) return;
    if (itemId === null) {
      if (this.hotbarItemIds[slotIndex] !== null) {
        this.moveHotbarSlotToCompartment(slotIndex);
      } else {
        this.hotbarItemIds[slotIndex] = null;
        if (this.equippedSlot === slotIndex) {
          this.equippedSlot = -1;
        }
        this.emitHud();
      }
      return;
    }
    this.hotbarItemIds[slotIndex] = itemId;
    this.equippedSlot = slotIndex;
    this.emitHud();
  }

  private findNextEmptyCompartmentId(startFrom = 1): number {
    const used = new Set(this.backpackCompartments.map((c) => c.compartmentId));
    let candidate = Math.max(1, Math.min(TOTAL_BACKPACK_COMPARTMENTS, Math.floor(startFrom)));
    while (used.has(candidate) && candidate < TOTAL_BACKPACK_COMPARTMENTS) {
      candidate++;
    }
    return candidate;
  }

  public expandHudBar(targetOrDelta: number, isAbsolute = false): void {
    const rawTarget = isAbsolute
      ? Math.round(targetOrDelta)
      : this.hotbarItemIds.length + Math.round(targetOrDelta);
    const target = Math.max(
      DEFAULT_HUD_BAR_SLOTS,
      Math.min(MAX_HUD_BAR_SLOTS, rawTarget),
    );
    if (target === this.hotbarItemIds.length) {
      this.toast(`HUD Bar is at ${target.toLocaleString()} slots (Max ${MAX_HUD_BAR_SLOTS.toLocaleString()}).`, 'info');
      return;
    }
    if (target > this.hotbarItemIds.length) {
      const added = target - this.hotbarItemIds.length;
      for (let i = 0; i < added; i++) {
        this.hotbarItemIds.push(null);
      }
      this.sound.playPickup();
      this.toast(
        `HUD Bar expanded to ${target.toLocaleString()} item slots!`,
        'discovery',
      );
    } else {
      // Move any items in trimmed trailing slots safely into empty backpack compartments
      for (let i = target; i < this.hotbarItemIds.length; i++) {
        const displaced = this.hotbarItemIds[i];
        if (displaced) {
          const cid = this.findNextEmptyCompartmentId();
          this.backpackCompartments.push({
            compartmentId: cid,
            itemId: displaced,
            quantity: Math.max(1, this.getItemCount(displaced)),
          });
        }
      }
      this.hotbarItemIds = this.hotbarItemIds.slice(0, target);
      if (this.equippedSlot >= target) {
        this.equippedSlot = -1;
      }
      this.toast(`HUD Bar resized to ${target.toLocaleString()} slots.`, 'info');
    }
    this.emitHud();
  }

  public moveHotbarSlotToCompartment(
    hotbarSlotIdx: number,
    targetCompartmentId?: number,
  ): boolean {
    if (hotbarSlotIdx < 0 || hotbarSlotIdx >= this.hotbarItemIds.length) {
      return false;
    }
    const itemId = this.hotbarItemIds[hotbarSlotIdx];
    if (!itemId) return false;

    const usedIds = new Set(this.backpackCompartments.map((c) => c.compartmentId));
    let cid: number;
    if (
      targetCompartmentId !== undefined &&
      targetCompartmentId >= 1 &&
      targetCompartmentId <= TOTAL_BACKPACK_COMPARTMENTS &&
      !usedIds.has(targetCompartmentId)
    ) {
      cid = Math.floor(targetCompartmentId);
    } else {
      cid = this.findNextEmptyCompartmentId(1);
    }

    const qty = Math.max(1, this.getItemCount(itemId));
    this.backpackCompartments.push({
      compartmentId: cid,
      itemId,
      quantity: qty,
    });
    this.hotbarItemIds[hotbarSlotIdx] = null;
    if (this.equippedSlot === hotbarSlotIdx) {
      this.equippedSlot = -1;
    }
    this.sound.playPickup();
    this.toast(
      `Dropped ${ITEMS[itemId].name} into Empty Compartment #${cid.toLocaleString()} (HUD slot ${hotbarSlotIdx + 1} emptied)`,
      'info',
      itemId,
      qty,
    );
    this.emitHud();
    return true;
  }

  public emptyAllHudBarToCompartments(): void {
    let movedCount = 0;
    let nextCid = 1;
    const usedIds = new Set(this.backpackCompartments.map((c) => c.compartmentId));
    for (let i = 0; i < this.hotbarItemIds.length; i++) {
      const itemId = this.hotbarItemIds[i];
      if (!itemId) continue;
      while (usedIds.has(nextCid) && nextCid < TOTAL_BACKPACK_COMPARTMENTS) {
        nextCid++;
      }
      usedIds.add(nextCid);
      this.backpackCompartments.push({
        compartmentId: nextCid,
        itemId,
        quantity: Math.max(1, this.getItemCount(itemId)),
      });
      this.hotbarItemIds[i] = null;
      movedCount++;
    }
    this.equippedSlot = -1;
    this.sound.playPickup();
    this.toast(
      movedCount > 0
        ? `Emptied ${movedCount} HUD bar item${movedCount === 1 ? '' : 's'} into Backpack Compartments!`
        : 'HUD bar is already completely empty.',
      'discovery',
    );
    this.emitHud();
  }

  public moveCompartmentToHotbar(
    compartmentId: number,
    targetHotbarSlot?: number,
  ): boolean {
    const idx = this.backpackCompartments.findIndex(
      (c) => c.compartmentId === compartmentId,
    );
    if (idx === -1) return false;
    const entry = this.backpackCompartments[idx];

    let destSlot: number;
    if (
      targetHotbarSlot !== undefined &&
      targetHotbarSlot >= 0 &&
      targetHotbarSlot < this.hotbarItemIds.length
    ) {
      destSlot = targetHotbarSlot;
    } else {
      const emptyIdx = this.hotbarItemIds.indexOf(null);
      destSlot = emptyIdx !== -1 ? emptyIdx : 0;
    }

    const displaced = this.hotbarItemIds[destSlot];
    this.backpackCompartments.splice(idx, 1);
    if (displaced && displaced !== entry.itemId) {
      this.backpackCompartments.push({
        compartmentId,
        itemId: displaced,
        quantity: Math.max(1, this.getItemCount(displaced)),
      });
    }

    this.hotbarItemIds[destSlot] = entry.itemId;
    this.equippedSlot = destSlot;
    this.sound.playPickup();
    this.toast(
      `Moved ${ITEMS[entry.itemId].name} to HUD Slot ${destSlot + 1}`,
      'info',
      entry.itemId,
    );
    this.emitHud();
    return true;
  }

  public setTvChannel(ch: TvChannelId): void {
    this.smartTv.setChannel(ch);
    const meta = this.smartTv.getCurrentChannelMeta();
    this.toast(`3D TV Tuned: ${meta.badge} · ${meta.name}`, 'info');
    this.emitHud();
  }

  public toggleTvPower(): boolean {
    const powerOn = this.smartTv.togglePower();
    this.toast(powerOn ? 'Smart TV Powered On' : 'Smart TV Standby (Off)', 'info');
    this.emitHud();
    return powerOn;
  }

  public toggleTvPlayPause(): boolean {
    const isPlaying = this.smartTv.togglePlayPause();
    this.toast(isPlaying ? '3D TV Playing' : '3D TV Paused', 'info');
    this.emitHud();
    return isPlaying;
  }

  public stopTvPlayback(): void {
    this.smartTv.stopPlayback();
    this.toast('3D TV Playback Stopped', 'info');
    this.emitHud();
  }

  public setTvVolume(vol: number): void {
    this.smartTv.setVolume(vol);
    this.emitHud();
  }

  public toggleTvMute(): boolean {
    const muted = this.smartTv.toggleMute();
    this.emitHud();
    return muted;
  }

  public setTvBassMode(mode: TvBassMode): TvBassMode {
    const next = this.smartTv.setBassMode(mode);
    const label =
      next === 'extreme'
        ? '2x12" Competition Trunk Sub'
        : next === 'trunk'
          ? 'Car Trunk Subwoofer ON'
          : 'Stock TV Speakers (Bass Boost Off)';
    this.toast(`3D TV Audio: ${label}`, 'info');
    this.emitHud();
    return next;
  }

  public setTvAutoCycle(enabled: boolean): void {
    this.smartTv.setAutoCycle(enabled);
    this.emitHud();
  }

  public nextTvChannel(): void {
    const next = this.smartTv.nextChannel();
    this.toast(`3D TV Tuned: ${next.badge} · ${next.name}`, 'info');
    this.emitHud();
  }

  public prevTvChannel(): void {
    const prev = this.smartTv.prevChannel();
    this.toast(`3D TV Tuned: ${prev.badge} · ${prev.name}`, 'info');
    this.emitHud();
  }

  public drawTvPreview(targetCanvas: HTMLCanvasElement): void {
    this.smartTv?.drawPreviewToCanvas(targetCanvas);
  }

  public loadLocalTvVideo(file: File): void {
    this.smartTv.loadLocalVideoFile(file);
    this.toast(`Playing local video on 3D TV: ${file.name}`, 'info');
    this.emitHud();
  }

  public setTvYouTubeStream(
    videoId: string,
    title = 'YouTube',
    channel = 'YouTube',
    startSec = 0,
  ): void {
    this.tvYouTubeStartSec = Math.max(0, Math.floor(startSec));
    this.smartTv.setYouTubeStream(videoId, title, channel);
    if (this.tvYouTubeStartSec > 0) {
      this.smartTv.currentTimestamp = this.tvYouTubeStartSec;
    }
    this.toast(`YouTube on TV: ${title}`, 'info');
    if (!this.disposed && this.mode !== 'menu') {
      this.updateCamera();
      this.syncTvScreenProjection();
    }
    this.emitHud();
  }

  public setTvProjectionCallback(
    cb: ((projection: TvScreenProjection | null) => void) | null,
  ): void {
    this.tvProjectionCallback = cb;
  }

  public setTvModalOpen(open: boolean): void {
    this.tvModalOpen = open;
    if (open) {
      this.smartTv.unlockAudio();
    } else if (this.tvInlinePlayerActive) {
      this.tvInlinePlayerActive = false;
    }
    if (!this.disposed && this.mode !== 'menu') {
      this.updateCamera();
      this.syncTvScreenProjection();
    }
  }

  public setTvInlinePlayerActive(active: boolean, syncTimeSec?: number): void {
    if (typeof syncTimeSec === 'number' && Number.isFinite(syncTimeSec) && syncTimeSec >= 0) {
      this.tvYouTubeStartSec = Math.floor(syncTimeSec);
      this.smartTv.currentTimestamp = syncTimeSec;
    }
    this.tvInlinePlayerActive = active;
    if (!this.disposed && this.mode !== 'menu') {
      this.updateCamera();
      this.syncTvScreenProjection();
    }
  }

  public syncTvYouTubeTime(sec: number): void {
    if (!Number.isFinite(sec) || sec < 0) return;
    this.smartTv.currentTimestamp = sec;
    this.tvYouTubeStartSec = Math.floor(sec);
  }

  private emitTvProjection(proj: TvScreenProjection | null): void {
    const visible = Boolean(proj?.visible);
    if (!visible && !this.lastTvProjVisible) return;
    this.lastTvProjVisible = visible;
    this.tvProjectionCallback?.(proj);
    this.callbacks.onTvProjectionUpdate?.(proj);
  }

  private syncTvScreenProjection(): void {
    const tvTarget = this.resolveNearestTvTarget(false);
    if (tvTarget) {
      this.smartTv.setWorldPosition(tvTarget.worldPos);
    }

    const shouldProjectYouTube =
      this.smartTv.power &&
      !this.smartTv.isStopped &&
      this.smartTv.isUsingYouTube &&
      Boolean(this.smartTv.youtubeVideoId) &&
      !this.tvInlinePlayerActive &&
      this.mode !== 'menu' &&
      !this.cinematicActive;

    if (!shouldProjectYouTube || !tvTarget) {
      this.emitTvProjection(null);
      this.smartTv.setDirectListenOverride(
        Boolean(
          this.tvInlinePlayerActive ||
            (this.smartTv.power &&
              !this.smartTv.isStopped &&
              this.smartTv.isUsingYouTube &&
              Boolean(this.smartTv.youtubeVideoId)),
        ),
      );
      return;
    }

    this.camera.updateMatrixWorld();
    this.camera.matrixWorldInverse.copy(this.camera.matrixWorld).invert();
    this.camera.getWorldDirection(this._camForward);

    this._tvToCam.subVectors(this.camera.position, tvTarget.worldPos);
    const facingDot = this._tvToCam.dot(tvTarget.forward);
    this._tvToTarget.subVectors(tvTarget.worldPos, this.camera.position);
    const camDist = this._tvToTarget.length();
    const inFrontOfCam =
      camDist > 0.05 &&
      (this._tvToTarget.dot(this._camForward) / camDist) > 0.12;

    if (facingDot <= 0.06 || !inFrontOfCam || camDist > 22) {
      this.emitTvProjection(null);
      return;
    }

    if (tvTarget.isHouseTv && this.tvOccluderMeshes.length > 0 && camDist > 0.4) {
      const rdx = this.camera.position.x - this.tvLastRayCamX;
      const rdy = this.camera.position.y - this.tvLastRayCamY;
      const rdz = this.camera.position.z - this.tvLastRayCamZ;
      const camMovedSq = rdx * rdx + rdy * rdy + rdz * rdz;
      if (this.elapsed - this.tvLastRayElapsed >= 0.1 || camMovedSq > 0.0144) {
        this._tvRayDirScratch.copy(this._tvToTarget).divideScalar(camDist);
        this.tvRaycaster.set(this.camera.position, this._tvRayDirScratch);
        this.tvRaycaster.near = 0.05;
        this.tvRaycaster.far = camDist - 0.2;
        const hits = this.tvRaycaster.intersectObjects(this.tvOccluderMeshes, false);
        this.tvLastRayResult = hits.length > 0;
        this.tvLastRayElapsed = this.elapsed;
        this.tvLastRayCamX = this.camera.position.x;
        this.tvLastRayCamY = this.camera.position.y;
        this.tvLastRayCamZ = this.camera.position.z;
      }
      if (this.tvLastRayResult) {
        this.emitTvProjection(null);
        return;
      }
    }

    const vw = this.container.clientWidth || window.innerWidth || 1280;
    const vh = this.container.clientHeight || window.innerHeight || 720;
    const halfW = tvTarget.halfW ?? (tvTarget.isHouseTv ? 0.8 : 0.84);
    const halfH = tvTarget.halfH ?? (tvTarget.isHouseTv ? 0.43 : 0.465);
    this._tvUp.set(0, 1, 0).applyQuaternion(tvTarget.worldQuat);

    let x0 = 0, y0 = 0, x1 = 0, y1 = 0, x2 = 0, y2 = 0, x3 = 0, y3 = 0;
    for (let cIdx = 0; cIdx < 4; cIdx++) {
      const sx = (cIdx & 1) === 0 ? -1 : 1;
      const sy = cIdx < 2 ? 1 : -1;
      this._tvCorner
        .copy(tvTarget.worldPos)
        .addScaledVector(tvTarget.right, sx * halfW)
        .addScaledVector(this._tvUp, sy * halfH);

      const depth = this._tvTmpVec
        .subVectors(this._tvCorner, this.camera.position)
        .dot(this._camForward);
      if (depth <= 0.15) {
        this.emitTvProjection(null);
        return;
      }

      this._tvCorner.project(this.camera);
      const px = (this._tvCorner.x * 0.5 + 0.5) * vw;
      const py = (-this._tvCorner.y * 0.5 + 0.5) * vh;
      if (cIdx === 0) { x0 = px; y0 = py; }
      else if (cIdx === 1) { x1 = px; y1 = py; }
      else if (cIdx === 2) { x2 = px; y2 = py; }
      else { x3 = px; y3 = py; }
    }

    const minX = Math.min(x0, x1, x2, x3);
    const maxX = Math.max(x0, x1, x2, x3);
    const minY = Math.min(y0, y1, y2, y3);
    const maxY = Math.max(y0, y1, y2, y3);

    if (
      maxX < 0 ||
      minX > vw ||
      maxY < 0 ||
      minY > vh ||
      maxX - minX < 40 ||
      maxY - minY < 24
    ) {
      this.emitTvProjection(null);
      return;
    }

    // Verify front-facing winding in screen coordinates
    const cross = (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0);
    if (cross <= 10) {
      this.emitTvProjection(null);
      return;
    }

    const refW = 640;
    const refH = 360;
    const dx1 = x1 - x3;
    const dx2 = x2 - x3;
    const dy1 = y1 - y3;
    const dy2 = y2 - y3;
    const det = dx1 * dy2 - dx2 * dy1;
    if (Math.abs(det) < 1e-3) {
      this.emitTvProjection(null);
      return;
    }

    const sxSum = x0 - x1 + x3 - x2;
    const sySum = y0 - y1 + y3 - y2;
    const g = (sxSum * dy2 - sySum * dx2) / det;
    const h = (dx1 * sySum - dy1 * sxSum) / det;

    const a = (x1 - x0 + g * x1) / refW;
    const b = (x2 - x0 + h * x2) / refH;
    const c = x0;
    const d = (y1 - y0 + g * y1) / refW;
    const e = (y2 - y0 + h * y2) / refH;
    const f = y0;
    const gp = g / refW;
    const hp = h / refH;

    const cssMatrix3d = `matrix3d(${a.toFixed(6)},${d.toFixed(6)},0,${gp.toFixed(8)},${b.toFixed(6)},${e.toFixed(6)},0,${hp.toFixed(8)},0,0,1,0,${c.toFixed(2)},${f.toFixed(2)},0,1)`;
    const spatialVolume = Math.max(
      0,
      Math.min(
        100,
        Math.round(this.smartTv.volume * this.smartTv.getSpatialMultiplier() * 100),
      ),
    );

    this.smartTv.setDirectListenOverride(Boolean(this.tvInlinePlayerActive));
    this.emitTvProjection({
      visible: true,
      cssMatrix3d,
      width: refW,
      height: refH,
      spatialVolume,
      isHouseTv: tvTarget.isHouseTv,
      bassEnergy: this.smartTv.getTrunkBassEnergy(),
      bassMode: this.smartTv.getBassMode(),
    });
  }

  private resolveNearestTvTarget(usePlayerAnchor = false): {
    dist: number;
    worldPos: THREE.Vector3;
    worldQuat: THREE.Quaternion;
    forward: THREE.Vector3;
    right: THREE.Vector3;
    scaleX: number;
    scaleY: number;
    halfW: number;
    halfH: number;
    isHouseTv: boolean;
  } | null {
    const refX = usePlayerAnchor ? this.playerX : this.camera.position.x;
    const refY = usePlayerAnchor ? this.playerY + 1.4 : this.camera.position.y;
    const refZ = usePlayerAnchor ? this.playerZ : this.camera.position.z;

    let bestDist = Infinity;
    let hasTarget = false;
    let scaleX = 1.6 / 800;
    let scaleY = 0.86 / 430;
    let halfW = 0.8;
    let halfH = 0.43;
    let isHouseTv = true;

    for (const st of this.structures) {
      if (st.type !== 'smart_tv') continue;
      const d = Math.hypot(st.x - refX, st.y + 0.95 - refY, st.z - refZ);
      if (d < bestDist) {
        bestDist = d;
        this._tvWorldQuat.setFromAxisAngle(_upAxis, st.rotationY);
        this._tvForward.set(0, 0, 1).applyQuaternion(this._tvWorldQuat);
        this._tvRight.set(1, 0, 0).applyQuaternion(this._tvWorldQuat);
        this._tvWorldPos.set(st.x, st.y + 0.95, st.z).addScaledVector(this._tvForward, 0.06);
        scaleX = 1.68 / 800;
        scaleY = 0.93 / 430;
        halfW = 0.84;
        halfH = 0.465;
        isHouseTv = false;
        hasTarget = true;
      }
    }

    const baseTvMesh =
      this.worldType === 'flat' ? this.flatWorld?.tvScreenMesh : this.world?.tvScreenMesh;
    if (baseTvMesh) {
      baseTvMesh.getWorldPosition(this._tvTmpVec);
      const houseDist = Math.hypot(
        this._tvTmpVec.x - refX,
        this._tvTmpVec.y - refY,
        this._tvTmpVec.z - refZ,
      );
      if (houseDist < bestDist) {
        bestDist = houseDist;
        this._tvWorldPos.copy(this._tvTmpVec);
        baseTvMesh.getWorldQuaternion(this._tvWorldQuat);
        this._tvForward.set(0, 0, 1).applyQuaternion(this._tvWorldQuat);
        this._tvRight.set(1, 0, 0).applyQuaternion(this._tvWorldQuat);
        this._tvWorldPos.addScaledVector(this._tvForward, 0.015);
        if (this.worldType === 'flat') {
          scaleX = 3.52 / 800;
          scaleY = 1.92 / 430;
          halfW = 1.76;
          halfH = 0.96;
        } else {
          scaleX = 1.6 / 800;
          scaleY = 0.86 / 430;
          halfW = 0.8;
          halfH = 0.43;
        }
        isHouseTv = this.worldType === 'island';
        hasTarget = true;
      }
    }

    if (!hasTarget) return null;
    return {
      dist: bestDist,
      worldPos: this._tvWorldPos,
      worldQuat: this._tvWorldQuat,
      forward: this._tvForward,
      right: this._tvRight,
      scaleX,
      scaleY,
      halfW,
      halfH,
      isHouseTv,
    };
  }

  public getCurrentSlotId(): string {
    return this.currentSlotId;
  }

  public getWorldType(): WorldType {
    return this.worldType;
  }

  public getWorldName(): string {
    return this.worldName;
  }

  private getActiveStations(): HouseStationTarget[] {
    return this.worldType === 'flat'
      ? this.flatWorld?.flatStations || []
      : this.world?.houseStations || [];
  }

  private applyWorldEnvironment(
    worldType: WorldType,
    flatSurfaceStyle: FlatSurfaceStyle = this.flatSurfaceStyle,
  ): void {
    this.worldType = worldType;
    this.flatSurfaceStyle = flatSurfaceStyle;
    setActiveTerrainWorldType(worldType);

    if (this.flatWorld) {
      this.flatWorld.setSurfaceStyle(flatSurfaceStyle);
    }

    this.setOverworldActiveState(this.currentDimension === 'overworld');

    if (this.smartTv) {
      if (worldType === 'flat' && this.flatWorld?.tvScreenMesh && this.flatWorld?.tvScreenMat) {
        this.flatWorld.flatGroup.updateMatrixWorld(true);
        this.smartTv.attachToMesh(
          this.flatWorld.tvScreenMesh,
          this.flatWorld.tvScreenMat,
          this.flatWorld.tvWorldPos,
        );
      } else if (this.world?.tvScreenMesh && this.world?.tvScreenMat) {
        this.world.overworldGroup.updateMatrixWorld(true);
        this.smartTv.attachToMesh(
          this.world.tvScreenMesh,
          this.world.tvScreenMat,
          this.world.tvWorldPos,
        );
      }
    }
  }

  public setFlatSurfaceStyle(style: FlatSurfaceStyle): void {
    this.flatSurfaceStyle = style;
    this.flatWorld?.setSurfaceStyle(style);
    if (this.worldType === 'flat') {
      this.toast(
        style === 'concrete_plaza'
          ? 'Park Ground switched to Smooth Concrete Plaza'
          : 'Park Ground switched to Sunlit Turf Grid',
        'info',
      );
    }
    this.emitHud();
  }

  public setGameMode(mode: GameMode): void {
    const resolvedMode = resolveAllowedGameMode(this.worldType, mode);
    if (this.worldType === 'flat' && mode !== 'sandbox') {
      this.toast('Flat World supports Creative Mode only (Survival disabled).', 'warning');
    }
    this.gameMode = resolvedMode;
    if (resolvedMode === 'boss_hunt' && this.worldType === 'island') {
      this.creatures.spawnGuardianBosses();
      this.toast('Guardian Boss Hunt active: 4 colossal Lost World Titans spawned across biomes!', 'discovery');
    } else if (resolvedMode === 'sandbox') {
      this.vitals.health = 9999;
      this.vitals.maxHealth = 9999;
      this.vitals.hunger = 100;
      this.vitals.thirst = 100;
      this.vitals.stamina = 100;
      this.vitals.temperatureC = 37.0;
      this.toast(
        this.worldType === 'flat'
          ? 'Flat Park Creative Mode active: Unlimited building, Coaster Studio & Music Pro ready'
          : 'Sandbox / God Mode active: Unlimited vitals, flight & Smart TV access',
        'discovery',
      );
    } else {
      this.vitals.maxHealth = 100;
      this.vitals.health = Math.min(100, this.vitals.health);
      this.toast('Survival Mode active: Biological survival, Fluid Erosion & Blood Moon Sieges', 'discovery');
    }
    this.emitHud();
  }

  private isBloodMoonNight(): boolean {
    if (this.worldType === 'flat') return false;
    const sunElev = Math.sin((this.timeOfDay - 0.25) * Math.PI * 2);
    const isNight = sunElev < -0.05;
    return isNight && (this.dayCount % 7 === 0);
  }

  private computeObjectiveText(): string {
    if (this.worldType === 'flat') {
      return `Flat Park Creative: Build amusement parks, custom roller coasters & Music Pro tracks`;
    }
    if (this.isBloodMoonNight()) {
      return `BLOOD MOON SIEGE: Defend your base from nocturnal predators!`;
    }
    if (this.gameMode === 'boss_hunt') {
      const aliveBosses = this.creatures.creatures.filter((c) => c.isBoss && c.alive).length;
      return `Boss Hunt: Defeat remaining Guardian Titans (${aliveBosses}/4 remaining)`;
    }
    if (this.gameMode === 'sandbox') {
      return `Sandbox Mode: Unlimited resources, flight & Smart TV active`;
    }
    if (this.dayCount === 1) {
      return `Day 1: Build a Campfire & Basic Shelter before nightfall`;
    }
    return `Day ${this.dayCount}: Expand homestead, craft gear & survive`;
  }

  public startNewWorldState(
    slotId = 'slot_1',
    playCinematic = true,
    options?: {
      worldType?: WorldType;
      worldName?: string;
      flatSurfaceStyle?: FlatSurfaceStyle;
      gameMode?: GameMode;
      playerGender?: PlayerGender;
    },
  ): void {
    this.currentSlotId = slotId;
    if (options?.playerGender) {
      this.playerGender = options.playerGender === 'girl' ? 'girl' : 'boy';
    }
    this.pirateCinematic?.setPlayerGender(this.playerGender);
    if (this.navigatorCompanion) {
      this.navigatorCompanion.setGenderForPlayer(this.playerGender);
      const navX = PLAYER_SPAWN.x + 4.2;
      const navZ = PLAYER_SPAWN.z - 5.2;
      this.navigatorCompanion.resetAtSpawn(
        PLAYER_SPAWN.x,
        PLAYER_SPAWN.z,
        getTerrainHeight(navX, navZ),
      );
    }
    const nextWorldType: WorldType = options?.worldType === 'flat' ? 'flat' : 'island';
    const nextSurfaceStyle: FlatSurfaceStyle =
      options?.flatSurfaceStyle === 'concrete_plaza' ? 'concrete_plaza' : 'turf_grid';
    const defaultMode: GameMode = nextWorldType === 'flat' ? 'sandbox' : 'survival';
    const nextMode = resolveAllowedGameMode(nextWorldType, options?.gameMode ?? defaultMode);

    this.worldName =
      (options?.worldName || (nextWorldType === 'flat' ? 'Flat Park Grounds' : 'Survival Island')).trim() ||
      (nextWorldType === 'flat' ? 'Flat Park Grounds' : 'Survival Island');
    this.gameMode = nextMode;
    this.clearTransitAndElevatorState();
    this.flightAndTeleport.toggleFlight(false);
    this.clearMovementInputs();
    this.ridingCoasterId = null;
    this.currentDimension = 'overworld';
    if (this.activeDimensionWorld) {
      disposeDimensionWorld(this.activeDimensionWorld);
      this.activeDimensionWorld = null;
    }

    this.applyWorldEnvironment(nextWorldType, nextSurfaceStyle);
    this.coasterRuntime?.clearAll();
    this.structureManager?.resetCleared();

    if (nextWorldType === 'flat') {
      this.camYaw = 0;
      this.camPitch = -0.05;
      this.masterRuntime = resetGameSession(
        this._chaseTargetScratch,
        this._sessionYawRef,
        this.camera,
        this.playerCameraRig,
        {
          spawnX: FLAT_PLAYER_SPAWN.x,
          spawnZ: FLAT_PLAYER_SPAWN.z,
          spawnYaw: this.camYaw + Math.PI,
          sampleGroundY: () => FLAT_GROUND_Y,
          isThirdPerson: this.playerCameraRig.mode === 'third_person',
        },
      );
      this.playerX = this._chaseTargetScratch.x;
      this.playerY = this._chaseTargetScratch.y;
      this.playerZ = this._chaseTargetScratch.z;
      this.playerYaw = this._sessionYawRef.value;
      this.playerVelY = 0;
      this.snapPlayerCamera();
      this.isCrouching = false;
      this.touchCrouch = false;
      this.currentEyeHeight = 1.62;

      this.vitals = {
        health: 9999,
        maxHealth: 9999,
        hunger: 100,
        maxHunger: 100,
        thirst: 100,
        maxThirst: 100,
        stamina: 100,
        maxStamina: 100,
        temperatureC: 37.0,
      };
      this.dayCount = 1;
      this.timeOfDay = 0.42;
      this.lastIsNight = false;
      this.playerVisibility = 1.0;
      this.nocturnalActiveCount = 0;
      this.weather = 'clear';
      this.weatherTimer = 9999;
      this.lightningFlash = 0;
      this.gameOver = false;
      this.gameOverReason = '';

      this.inventory = [
        { itemId: 'coaster_station', quantity: 10 },
        { itemId: 'smart_tv', quantity: 4 },
        { itemId: 'stone_block', quantity: 50 },
        { itemId: 'stone_pillar', quantity: 30 },
        { itemId: 'stone_arch', quantity: 30 },
        { itemId: 'timber_beam', quantity: 30 },
        { itemId: 'timber_pillar', quantity: 24 },
        { itemId: 'crafting_table', quantity: 4 },
        { itemId: 'storage_chest', quantity: 4 },
        { itemId: 'basic_shelter', quantity: 4 },
        { itemId: 'excavator_shovel', quantity: 1 },
        { itemId: 'vehicle_chassis_kit', quantity: 24 },
        { itemId: 'belt_pulley', quantity: 10 },
        { itemId: 'drive_shaft', quantity: 12 },
        { itemId: 'gear_box', quantity: 6 },
        { itemId: 'steam_boiler', quantity: 4 },
        { itemId: 'steam_engine', quantity: 4 },
        { itemId: 'auto_assembler', quantity: 2 },
        { itemId: 'portal_gun', quantity: 1 },
      ];
      this.backpackCompartments = [];
      this.hotbarItemIds = [
        'coaster_station',
        'stone_block',
        'stone_arch',
        'timber_beam',
        'smart_tv',
        'vehicle_chassis_kit',
        'excavator_shovel',
        'belt_pulley',
        'portal_gun',
      ];
      this.equippedSlot = 0;
      this.weaponMagazines.clear();
      this.cancelReload();

      resetTerrainDeformation();
      this.terrainEngine.clearAll();
      this.clearStructuralWorld();
      this.clearKineticAndVehicleWorld();
      this.coins = 99999;
      this.seatedState = null;
      this.fridgeItems = [];
      this.clearPlantedCrops();
      this.clearPlacedStructures();
      this.clearAlienRelicDecorMeshes();
      this.clearPickups();
      this.clearCarcasses();
      this.visitedBiomes = new Set(['grassland']);
      this.exploredCells = new Set();
      this.exploredCellsDirty = true;
      this.lastExploredCx = -9999;
      this.lastExploredCz = -9999;
      this.vehicleRestCache.clear();
      this.markExploredAroundPlayer();
      this.discoveredLocations = new Set();
      this.completedMissionIds = new Set();
      this.stats = this.createEmptyStats();
      this.cinematicActive = false;
      this.cinematicSubtitle = '';
      this.cinematicCrewShout = '';
      this.shipModel.visible = false;
      if (this.pirateCinematic) this.pirateCinematic.root.visible = false;

      // Starter Coaster Station & Park Cyclone roller coaster right beside the Park Plaza
      this.spawnStructure({
        id: 'flat_starter_coaster_station',
        type: 'coaster_station',
        x: 18,
        y: FLAT_GROUND_Y,
        z: -4,
        rotationY: 0,
      });
      this.coasterRuntime?.createCoaster(
        'Park Cyclone',
        { x: 18, y: FLAT_GROUND_Y, z: -6 },
        0,
        true,
        '#ef4444',
      );

      this.applyExchangeCosmetics(true);
      this.resetFrameTiming();
      this.emitHud();
      return;
    }

    this.camYaw = 0.12;
    this.camPitch = -0.05;
    this.masterRuntime = resetGameSession(
      this._chaseTargetScratch,
      this._sessionYawRef,
      this.camera,
      this.playerCameraRig,
      {
        spawnX: PLAYER_SPAWN.x,
        spawnZ: PLAYER_SPAWN.z,
        spawnYaw: this.camYaw + Math.PI,
        sampleGroundY: getTerrainHeight,
        isThirdPerson: this.playerCameraRig.mode === 'third_person',
      },
    );
    this.playerX = this._chaseTargetScratch.x;
    this.playerY = this._chaseTargetScratch.y;
    this.playerZ = this._chaseTargetScratch.z;
    this.playerYaw = this._sessionYawRef.value;
    this.playerVelY = 0;
    this.snapPlayerCamera();
    this.isCrouching = false;
    this.touchCrouch = false;
    this.currentEyeHeight = 1.62;

    this.vitals = {
      health: nextMode === 'sandbox' ? 9999 : 100,
      maxHealth: nextMode === 'sandbox' ? 9999 : 100,
      hunger: 100,
      maxHunger: 100,
      thirst: 100,
      maxThirst: 100,
      stamina: 100,
      maxStamina: 100,
      temperatureC: 37.0,
    };
    this.dayCount = 1;
    this.timeOfDay = 0.278;
    this.lastIsNight = false;
    this.playerVisibility = 1.0;
    this.nocturnalActiveCount = 0;
    this.weather = playCinematic ? 'storm' : 'clear';
    this.weatherTimer = 85;
    this.lightningFlash = 0;
    this.gameOver = false;
    this.gameOverReason = '';

    // Starter survival pack salvaged on shore: Survival Gun, Basic Knife, Sickle, Engineering & Terraforming kit
    this.inventory = [
      { itemId: 'gun', quantity: 1 },
      { itemId: 'hunting_knife', quantity: 1 },
      { itemId: 'stone_warhammer', quantity: 1 },
      { itemId: 'ammo', quantity: 60 },
      { itemId: 'berries', quantity: 4 },
      { itemId: 'wood', quantity: 10 },
      { itemId: 'branch', quantity: 6 },
      { itemId: 'stone', quantity: 14 },
      { itemId: 'flint', quantity: 5 },
      { itemId: 'fiber', quantity: 6 },
      { itemId: 'leaves', quantity: 4 },
      { itemId: 'grass', quantity: 4 },
      { itemId: 'clay', quantity: 3 },
      { itemId: 'metal_ore', quantity: 2 },
      { itemId: 'hide', quantity: 2 },
      { itemId: 'rope', quantity: 2 },
      { itemId: 'soap', quantity: 3 },
      { itemId: 'dirty_water_bottle', quantity: 1 },
      { itemId: 'sickle', quantity: 1 },
      { itemId: 'excavator_shovel', quantity: 1 },
      { itemId: 'powder_keg', quantity: 4 },
      { itemId: 'water_torrent', quantity: 3 },
      { itemId: 'stone_block', quantity: 12 },
      { itemId: 'stone_pillar', quantity: 6 },
      { itemId: 'stone_arch', quantity: 6 },
      { itemId: 'timber_beam', quantity: 6 },
      { itemId: 'timber_pillar', quantity: 4 },
      { itemId: 'water_wheel', quantity: 2 },
      { itemId: 'steam_boiler', quantity: 1 },
      { itemId: 'steam_engine', quantity: 1 },
      { itemId: 'drive_shaft', quantity: 4 },
      { itemId: 'gear_box', quantity: 2 },
      { itemId: 'belt_pulley', quantity: 3 },
      { itemId: 'fluid_pipe', quantity: 4 },
      { itemId: 'auto_assembler', quantity: 1 },
      { itemId: 'vehicle_chassis_kit', quantity: 14 },
      { itemId: 'coaster_station', quantity: 2 },
    ];
    this.backpackCompartments = [];
    this.hotbarItemIds = [
      'gun',
      'hunting_knife',
      'stone_warhammer',
      'berries',
      'dirty_water_bottle',
      'sickle',
      'belt_pulley',
      'drive_shaft',
      'stone_arch',
    ];
    this.equippedSlot = 0;
    this.weaponMagazines.clear();
    this.cancelReload();
    this.shipwreckChests.forEach((ch) => {
      ch.opened = false;
      ch.lidGroup.rotation.x = 0;
      if (ch.glowMesh?.material) {
        const mat = ch.glowMesh.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.45;
        mat.color.setHex(0xfacc15);
      }
    });
    if (this.armoryChestState) {
      this.armoryChestState.opened = false;
      this.armoryChestState.lidGroup.rotation.x = 0;
      if (this.armoryChestState.glowMesh?.material) {
        const mat = this.armoryChestState.glowMesh.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.42;
        mat.color.setHex(0x10b981);
      }
    }

    resetTerrainDeformation();
    this.terrainEngine.clearAll();
    this.terrainEngine.syncAllDeformedVertices(
      this.world.terrainMesh,
      this.world.baseTerrainColors,
    );
    this.clearStructuralWorld();
    this.clearKineticAndVehicleWorld();
    this.setupStarterEngineeringShowcase(true, true);

    this.coins = 150;
    this.seatedState = null;
    this.fridgeItems = [
      { itemId: 'milk', quantity: 2 },
      { itemId: 'egg', quantity: 6 },
      { itemId: 'butter', quantity: 3 },
      { itemId: 'chocolate', quantity: 2 },
      { itemId: 'salt', quantity: 4 },
      { itemId: 'lettuce', quantity: 2 },
      { itemId: 'tomato', quantity: 2 },
    ];
    this.clearPlantedCrops();

    this.clearPlacedStructures();
    this.clearAlienRelicDecorMeshes();
    // Initial weathered Crafting Station at the Abandoned Expedition Camp
    this.spawnStructure({
      id: 'exp_workbench',
      type: 'crafting_table',
      x: EXPEDITION_POS.x - 1.2,
      y: getTerrainHeight(EXPEDITION_POS.x - 1.2, EXPEDITION_POS.z + 2.4),
      z: EXPEDITION_POS.z + 2.4,
      rotationY: 0.4,
    });
    // Lakeside Meat Drying Rack on Azure Lake's eastern shore
    const rackX = LAKE_CENTER.x + LAKE_CENTER.radius + 5.5;
    const rackZ = LAKE_CENTER.z + 3.5;
    this.spawnStructure({
      id: 'lake_drying_rack',
      type: 'drying_rack',
      x: rackX,
      y: Math.max(LAKE_CENTER.waterY + 0.35, getTerrainHeight(rackX, rackZ)),
      z: rackZ,
      rotationY: -0.6,
      dryingSlots: [
        { itemId: 'washed_meat' as ItemId, quantity: 0, progress: 0 },
        { itemId: 'washed_meat' as ItemId, quantity: 0, progress: 0 },
        { itemId: 'washed_meat' as ItemId, quantity: 0, progress: 0 },
        { itemId: 'washed_meat' as ItemId, quantity: 0, progress: 0 },
      ],
    });
    // Meat Drying Rack right next to the premade shelter (Hilltop House front porch / yard)
    this.ensurePremadeShelterDryingRack();

    this.visitedBiomes = new Set(['beach']);
    this.exploredCells = new Set();
    this.exploredCellsDirty = true;
    this.lastExploredCx = -9999;
    this.lastExploredCz = -9999;
    this.vehicleRestCache.clear();
    this.markExploredAroundPlayer();
    this.discoveredLocations = new Set();
    this.completedMissionIds = new Set();
    this.stats = this.createEmptyStats();

    this.clearPickups();
    this.clearCarcasses();
    this.pendingTreeDrops.clear();
    this.shakenTreeDropIds.clear();
    this.spawnBeachBottles();

    // Also place a spare Harvesting Sickle & Wheat/Tomato Seeds right beside the Wheatfield gate
    this.spawnPickup(
      'sickle',
      1,
      WHEATFIELD_POS.x - 2.0,
      WHEATFIELD_POS.z + 7.4,
      9999,
      'wheatfield_sickle',
      0,
      false,
    );
    this.spawnPickup(
      'tomato_seeds',
      2,
      FARMER_POS.x + 1.8,
      FARMER_POS.z + 2.5,
      9999,
      'starter_farm_seeds',
      0,
      false,
    );

    // Reset all resource nodes
    this.nodeHitShakeTimers.clear();
    this.pendingTreeDrops.clear();
    this.shakenTreeDropIds.clear();
    this.activeFellingNodeIds.clear();
    this.respawningNodeIds.clear();
    this.ecosystemTickAccum = 0;
    this.world.resourceNodes.forEach((n) => {
      n.hp = n.maxHp;
      n.respawnTimer = 0;
      n.felled = false;
      n.fallTimer = 0;
      this.world.restoreBatchedNode(n.id);
      this.syncResourceVisual(n);
    });

    if (playCinematic) {
      this.cinematicActive = true;
      this.cinematicCameraInitialized = false;
      this.cinematicTimer = 0;
      this.cinematicSubtitle =
        'Thunder splits the sky! Broadside cannons BOOM as the pirate crew battles the storm!';
      this.cinematicCrewShout = 'CAPTAIN: "HOLD FAST! MAN THE DECK!" · CANNONS BOOMING';
      this.lastCinematicHudSubtitle = this.cinematicSubtitle;
      this.lastCinematicHudCrewShout = this.cinematicCrewShout;
      this.shipModel.visible = false;
      this.pirateCinematic.setPlayerGender(this.playerGender);
      this.pirateCinematic.reset(OCEAN_LEVEL);
      this.pirateCinematic.root.visible = true;
      // Keep shipModel position synced for rain/lightning centering during cinematic
      this.shipModel.position.set(-34, OCEAN_LEVEL - 0.15, 846);
      this.shipModel.rotation.set(0, Math.PI * 0.82, 0);
      this.applyCinematicCullImmediate();
    } else {
      this.cinematicActive = false;
      this.cinematicCameraInitialized = false;
      this.cinematicSubtitle = '';
      this.cinematicCrewShout = '';
      this.lastCinematicHudSubtitle = '';
      this.lastCinematicHudCrewShout = '';
      this.shipModel.visible = false;
      if (this.pirateCinematic) this.pirateCinematic.root.visible = false;
      if (this.mode === 'menu') {
        this.applyMenuCullImmediate();
      } else {
        this.applyPlayingCullImmediate();
      }
    }

    if (this.gameMode === 'boss_hunt') {
      this.creatures.spawnGuardianBosses();
    }
    this.ensurePlayerHasGun(true);
    this.applyExchangeCosmetics(true);
    this.resetFrameTiming();
    this.emitHud();
  }

  private clearTransitAndElevatorState(): void {
    this.activeVehicleId = null;
    this.mountedCreatureId = null;
    this.vehicleInteriorCamera = false;
    this.vehicleForwardSpeed = 0;
    this.vehicleAltitudeVel = 0;
    this.vehicleAscendHold = false;
    this.vehicleDescendHold = false;
    this.vehicleVisualPitch = 0;
    this.vehicleVisualRoll = 0;
    this.hydraulicMode = 'level';
    this.hydCorners = { fl: 0, fr: 0, rl: 0, rr: 0 };
    this.hydVel = { fl: 0, fr: 0, rl: 0, rr: 0 };
    this.trunkBassPulse = 0;
    this.chestThumpPulse = 0;
    this.elevatorLiftActive = false;
    this.elevatorSummonedVehicleId = null;
    this.elevatorTargetCar = null;
    this.elevatorLiftProgress = 0;
    this.elevatorSteamAccum = 0;
    this.autoParkJobs.clear();
    this.sound.stopTrunkBass();
    CABIN_BASS_AND_FIRST_PERSON.setCameraMode('CHASE');
  }

  private ensurePremadeShelterDryingRack(): void {
    const sx = HILL_HOUSE_POS.x + 5.8;
    const sz = HILL_HOUSE_POS.z + 4.8;
    const alreadyPlacedNearShelter = this.structures.some(
      (s) =>
        s.id === 'shelter_drying_rack' ||
        (s.type === 'drying_rack' &&
          Math.hypot(s.x - HILL_HOUSE_POS.x, s.z - HILL_HOUSE_POS.z) < 12),
    );
    if (alreadyPlacedNearShelter) return;
    this.spawnStructure({
      id: 'shelter_drying_rack',
      type: 'drying_rack',
      x: sx,
      y: getTerrainHeight(sx, sz),
      z: sz,
      rotationY: -0.35,
      dryingSlots: [
        { itemId: 'washed_meat' as ItemId, quantity: 0, progress: 0 },
        { itemId: 'washed_meat' as ItemId, quantity: 0, progress: 0 },
        { itemId: 'washed_meat' as ItemId, quantity: 0, progress: 0 },
        { itemId: 'washed_meat' as ItemId, quantity: 0, progress: 0 },
      ],
    });
  }

  public loadFromSave(save: GameSaveData): void {
    this.currentSlotId = save.slotId;
    const loadedWorldType: WorldType = save.worldType === 'flat' ? 'flat' : 'island';
    const loadedSurface: FlatSurfaceStyle =
      save.flatSurfaceStyle === 'concrete_plaza' ? 'concrete_plaza' : 'turf_grid';
    this.worldName =
      save.worldName ||
      (loadedWorldType === 'flat' ? 'Flat Park Grounds' : 'Survival Island');
    this.gameMode = resolveAllowedGameMode(
      loadedWorldType,
      save.gameMode || (loadedWorldType === 'flat' ? 'sandbox' : 'survival'),
    );
    this.clearTransitAndElevatorState();
    this.flightAndTeleport.toggleFlight(false);
    this.clearMovementInputs();
    this.ridingCoasterId = null;
    this.currentDimension = 'overworld';
    if (this.activeDimensionWorld) {
      disposeDimensionWorld(this.activeDimensionWorld);
      this.activeDimensionWorld = null;
    }
    this.applyWorldEnvironment(loadedWorldType, loadedSurface);

    this.masterRuntime = resetGameSession(
      this._chaseTargetScratch,
      this._sessionYawRef,
      this.camera,
      this.playerCameraRig,
      {
        spawnX: save.player.x,
        spawnZ: save.player.z,
        spawnYaw: save.player.yaw,
        sampleGroundY: () => save.player.y,
        isThirdPerson: this.playerCameraRig.mode === 'third_person',
      },
    );
    this.playerX = save.player.x;
    this.playerY = save.player.y;
    this.playerZ = save.player.z;
    this.playerYaw = save.player.yaw;
    this.playerVelY = 0;
    this.playerGender = save.player.gender === 'girl' ? 'girl' : 'boy';
    this.pirateCinematic?.setPlayerGender(this.playerGender);
    if (this.navigatorCompanion && loadedWorldType === 'island') {
      this.navigatorCompanion.setGenderForPlayer(this.playerGender);
      const navX = this.playerX + 3.6;
      const navZ = this.playerZ - 3.2;
      this.navigatorCompanion.resetAtSpawn(
        this.playerX,
        this.playerZ,
        getTerrainHeight(navX, navZ),
      );
    }
    this.camYaw = this.playerYaw - Math.PI;
    this.camPitch = save.player.pitch ?? -0.05;
    this.snapPlayerCamera();
    this.vitals = {
      health: loadedWorldType === 'flat' ? 9999 : (save.player.vitals.health ?? 100),
      maxHealth: loadedWorldType === 'flat' ? 9999 : (save.player.vitals.maxHealth ?? 100),
      hunger: loadedWorldType === 'flat' ? 100 : (save.player.vitals.hunger ?? 100),
      maxHunger: save.player.vitals.maxHunger ?? 100,
      thirst: loadedWorldType === 'flat' ? 100 : (save.player.vitals.thirst ?? 100),
      maxThirst: save.player.vitals.maxThirst ?? 100,
      stamina: loadedWorldType === 'flat' ? 100 : (save.player.vitals.stamina ?? 100),
      maxStamina: save.player.vitals.maxStamina ?? 100,
      temperatureC: loadedWorldType === 'flat' ? 37.0 : (save.player.vitals.temperatureC ?? 37.0),
    };
    this.equippedSlot = save.player.equippedSlot;
    this.hotbarItemIds = [...save.player.hotbarItemIds];
    while (this.hotbarItemIds.length < DEFAULT_HUD_BAR_SLOTS) {
      this.hotbarItemIds.push(null);
    }
    if (this.hotbarItemIds.length > MAX_HUD_BAR_SLOTS) {
      this.hotbarItemIds = this.hotbarItemIds.slice(0, MAX_HUD_BAR_SLOTS);
    }
    this.dayCount = save.dayCount;
    this.timeOfDay = save.timeOfDay;
    this.lastIsNight =
      Math.sin((this.timeOfDay - 0.25) * Math.PI * 2) < -0.05;
    this.weather = loadedWorldType === 'flat' ? 'clear' : (save.weather || 'clear');
    this.inventory = save.inventory.map((s) => ({ ...s }));
    this.backpackCompartments = Array.isArray(save.backpackCompartments)
      ? save.backpackCompartments.map((c) => ({ ...c }))
      : [];
    this.coins = typeof save.coins === 'number' ? save.coins : 150;
    this.fridgeItems = Array.isArray(save.fridgeItems)
      ? save.fridgeItems.map((s) => ({ ...s }))
      : loadedWorldType === 'island'
        ? [
            { itemId: 'milk', quantity: 2 },
            { itemId: 'egg', quantity: 6 },
            { itemId: 'butter', quantity: 3 },
            { itemId: 'chocolate', quantity: 2 },
            { itemId: 'salt', quantity: 4 },
            { itemId: 'lettuce', quantity: 2 },
            { itemId: 'tomato', quantity: 2 },
          ]
        : [];
    this.seatedState = null;
    this.clearPlantedCrops();
    if (Array.isArray(save.plantedCrops)) {
      this.plantedCrops = save.plantedCrops.map((c) => ({ ...c }));
      this.plantedCrops.forEach((c) => this.rebuildCropMesh(c));
    }

    this.visitedBiomes = new Set(save.visitedBiomes);
    this.exploredCells = new Set(save.exploredCells || []);
    this.exploredCellsDirty = true;
    this.lastExploredCx = -9999;
    this.lastExploredCz = -9999;
    this.vehicleRestCache.clear();
    this.markExploredAroundPlayer();
    this.discoveredLocations = new Set(save.discoveredLocations || []);
    this.completedMissionIds = new Set(save.completedMissionIds || []);
    this.stats = { ...this.createEmptyStats(), ...save.stats };
    this.weaponMagazines.clear();
    this.cancelReload();
    if (save.weaponMagazines) {
      Object.entries(save.weaponMagazines).forEach(([id, mag]) => {
        const itemId = id as ItemId;
        const spec = FIREARM_SPECS[itemId];
        if (spec && typeof mag === 'number') {
          this.weaponMagazines.set(
            itemId,
            THREE.MathUtils.clamp(Math.floor(mag), 0, spec.magSize),
          );
        }
      });
    }
    if (this.armoryChestState && loadedWorldType === 'island') {
      const opened = Boolean(save.baseArmoryOpened);
      this.armoryChestState.opened = opened;
      this.armoryChestState.lidGroup.rotation.x = opened ? -Math.PI * 0.45 : 0;
      if (this.armoryChestState.glowMesh?.material) {
        const mat = this.armoryChestState.glowMesh.material as THREE.MeshBasicMaterial;
        mat.opacity = opened ? 0.12 : 0.42;
        mat.color.setHex(0x10b981);
      }
    }
    this.cinematicActive = false;
    this.cinematicSubtitle = '';
    this.cinematicCrewShout = '';
    this.shipModel.visible = false;
    if (this.pirateCinematic) this.pirateCinematic.root.visible = false;
    this.gameOver = false;
    this.gameOverReason = '';

    importSparseTerrainDeltas(save.terrainDeltas);
    this.terrainEngine.clearAll();
    if (loadedWorldType === 'island') {
      this.terrainEngine.syncAllDeformedVertices(
        this.world.terrainMesh,
        this.world.baseTerrainColors,
      );
    }

    this.clearStructuralWorld();
    if (Array.isArray(save.structuralBlocks)) {
      for (const b of save.structuralBlocks) {
        this.spawnStructuralBlockInstance({ ...b });
      }
      this.recalculateStructuralIntegrity(false);
    }

    this.clearKineticAndVehicleWorld();
    if (Array.isArray(save.kineticNodes) && save.kineticNodes.length > 0) {
      for (const kn of save.kineticNodes) {
        this.spawnKineticNodeInstance({
          ...kn,
          connectedIds: [...(kn.connectedIds || [])],
        });
      }
      this.rebuildKineticNetwork(false);
    } else if (loadedWorldType === 'island') {
      this.setupStarterEngineeringShowcase(false, true);
    }

    if (Array.isArray(save.modularVehicles) && save.modularVehicles.length > 0) {
      for (const v of save.modularVehicles) {
        this.spawnVehicleInstance({
          ...v,
          vx: 0,
          vy: 0,
          vz: 0,
          modules: v.modules.map((m) => ({ ...m })),
          cargoItems: (v.cargoItems || []).map((c) => ({ ...c })),
        });
      }
      if (loadedWorldType === 'island') {
        if (!this.vehicles.some((v) => v.preset === 'donk')) {
          const bay2X = VEHICLE_GARAGE_POS.x - 3.0;
          const bay2Z = VEHICLE_GARAGE_POS.z + 0.6;
          this.spawnVehicleInstance(
            createVehicleFromPreset(
              'veh_starter_donk',
              'donk',
              bay2X,
              getTerrainHeight(bay2X, bay2Z) + 0.14,
              bay2Z,
              0,
            ),
          );
        }
        if (!this.vehicles.some((v) => v.preset === 'slab')) {
          const bay3X = VEHICLE_GARAGE_POS.x + 3.0;
          const bay3Z = VEHICLE_GARAGE_POS.z + 0.6;
          this.spawnVehicleInstance(
            createVehicleFromPreset(
              'veh_starter_slab',
              'slab',
              bay3X,
              getTerrainHeight(bay3X, bay3Z) + 0.14,
              bay3Z,
              0,
            ),
          );
        }
        if (!this.vehicles.some((v) => v.preset === 'cadillac_coupe_deville')) {
          const bay4X = VEHICLE_GARAGE_POS.x + 9.0;
          const bay4Z = VEHICLE_GARAGE_POS.z + 0.6;
          this.spawnVehicleInstance(
            createVehicleFromPreset(
              'veh_starter_deville',
              'cadillac_coupe_deville',
              bay4X,
              getTerrainHeight(bay4X, bay4Z) + 0.14,
              bay4Z,
              0,
            ),
          );
        }
        if (!this.vehicles.some((v) => v.preset === 'chevy_tahoe')) {
          const westX = VEHICLE_GARAGE_POS.x - 16.0;
          const westZ = VEHICLE_GARAGE_POS.z + 5.2;
          this.spawnVehicleInstance(
            createVehicleFromPreset(
              'veh_starter_tahoe',
              'chevy_tahoe',
              westX,
              getTerrainHeight(westX, westZ) + 0.14,
              westZ,
              0,
            ),
          );
        }
      }
    } else if (loadedWorldType === 'island') {
      this.setupStarterEngineeringShowcase(true, false);
    }

    this.clearPlacedStructures();
    this.clearAlienRelicDecorMeshes();
    save.structures.forEach((st) => this.spawnStructure(st));
    if (loadedWorldType === 'island') {
      this.ensurePremadeShelterDryingRack();
    }

    this.coasterRuntime?.importCoasters(save.coasters);
    this.ecosystem = save.ecosystem || createInitialEcosystem();

    // Restore saved Smart TV channel, power state & playback controls
    if (typeof save.tvVolume === 'number') {
      this.smartTv.setVolume(save.tvVolume);
    }
    if (typeof save.tvIsMuted === 'boolean' && save.tvIsMuted !== this.smartTv.isMuted) {
      this.smartTv.toggleMute();
    }
    if (typeof save.tvAutoCycle === 'boolean') {
      this.smartTv.setAutoCycle(save.tvAutoCycle);
    }
    if (typeof save.tvChannel === 'number') {
      this.smartTv.setChannel(normalizeChannelId(save.tvChannel));
    }
    if (save.tvBassMode !== undefined) {
      this.smartTv.setBassMode(normalizeTvBassMode(save.tvBassMode));
    }
    if (save.tvPower === false && this.smartTv.power) {
      this.smartTv.togglePower();
    } else if (save.tvPaused && this.smartTv.power) {
      this.smartTv.setPaused(true);
    }

    if (loadedWorldType === 'island') {
      // Restore resource node states (felled stumps, rock damage, depleted nodes)
      this.nodeHitShakeTimers.clear();
      this.activeFellingNodeIds.clear();
      this.respawningNodeIds.clear();
      this.ecosystemTickAccum = 0;
      const savedNodeMap = new Map<string, SavedResourceNodeState>();
      if (save.resourceStates) {
        save.resourceStates.forEach((rs) => savedNodeMap.set(rs.id, rs));
      }
      this.world.resourceNodes.forEach((n) => {
        const savedNode = savedNodeMap.get(n.id);
        if (savedNode) {
          n.hp = savedNode.hp;
          n.respawnTimer = savedNode.respawnTimer;
          n.felled = Boolean(savedNode.felled);
          n.fallTimer = 0;
          if (n.hp <= 0) {
            this.respawningNodeIds.add(n.id);
          }
        } else {
          n.hp = n.maxHp;
          n.respawnTimer = 0;
          n.felled = false;
          n.fallTimer = 0;
        }
        if (!n.felled && n.hp >= n.maxHp) {
          this.world.restoreBatchedNode(n.id);
        } else if (!n.felled && n.hp > 0) {
          this.world.activateInteractiveNode(n.id);
        }
        this.syncResourceVisual(n);
      });
    }

    // Restore physical ground pickups and carcasses
    this.clearPickups();
    this.clearCarcasses();
    this.pendingTreeDrops.clear();
    this.shakenTreeDropIds.clear();
    if (save.activePickups) {
      save.activePickups.forEach((p) => {
        this.spawnPickup(p.itemId, p.quantity, p.x, p.z, p.life, p.id);
      });
    }
    if (loadedWorldType === 'island' && save.activeCarcasses) {
      save.activeCarcasses.forEach((c) => {
        this.spawnCarcass(
          c.species,
          c.displayName,
          c.isDino,
          c.x,
          c.z,
          c.yaw,
          c.drops,
          c.life,
          c.id,
          0,
          undefined,
          c.owner ?? 'player',
        );
      });
    }

    if (loadedWorldType === 'island') {
      // Ensure vital survival gear exists in backpack without overriding emptied HUD bar
      this.ensurePlayerHasGun(false);
      const hasBeachBottle = this.pickups.some(
        (p) =>
          p.itemId === 'dirty_water_bottle' ||
          p.itemId === 'filtered_water_bottle',
      );
      if (!hasBeachBottle) {
        this.spawnBeachBottles();
      }
      if (this.gameMode === 'boss_hunt') {
        this.creatures.spawnGuardianBosses();
      }
    }
    this.structureManager?.importClearedIds(
      loadedWorldType === 'island' ? save.clearedStructureIds : [],
    );
    this.applyExchangeCosmetics(true);
    this.applyPlayingCullImmediate();
    this.resetFrameTiming();
    this.emitHud();
  }

  public respawnPlayer(): void {
    this.clearTransitAndElevatorState();
    this.seatedState = null;
    this.ridingCoasterId = null;
    if (this.worldType === 'flat') {
      this.playerX = FLAT_PLAYER_SPAWN.x;
      this.playerZ = FLAT_PLAYER_SPAWN.z;
      this.playerY = FLAT_GROUND_Y;
      this.playerVelY = 0;
      this.vitals.health = 9999;
      this.vitals.maxHealth = 9999;
      this.vitals.hunger = 100;
      this.vitals.thirst = 100;
      this.vitals.stamina = 100;
      this.vitals.temperatureC = 37.0;
      this.gameOver = false;
      this.gameOverReason = '';
      this.snapPlayerCamera();
      this.toast('Returned to Flat Park Plaza.', 'info');
      this.emitHud();
      return;
    }
    const campBed = this.structures.find(
      (s) => s.type === 'basic_shelter' || s.type === 'sleeping_area',
    );
    this.playerX = campBed ? campBed.x : PLAYER_SPAWN.x;
    this.playerZ = campBed ? campBed.z + 2.2 : PLAYER_SPAWN.z;
    this.playerY = getTerrainHeight(this.playerX, this.playerZ);
    this.playerVelY = 0;
    this.vitals.health = 100;
    this.vitals.hunger = Math.max(55, this.vitals.hunger);
    this.vitals.thirst = Math.max(55, this.vitals.thirst);
    this.vitals.stamina = 100;
    this.vitals.temperatureC = 37.0;
    this.gameOver = false;
    this.gameOverReason = '';
    this.snapPlayerCamera();
    this.toast(
      campBed ? 'Woke up back at your camp shelter.' : 'Washed back onto the beach.',
      'info',
    );
    this.ensurePlayerHasGun(true);
    this.applyExchangeCosmetics(true);
  }

  /**
   * Guarantees that the character starts with the Survival Gun, Basic Knife,
   * Gun Cartridges, and diverse starter materials, with the Gun assigned to
   * hotbar slot 0 and Knife to hotbar slot 1.
   * Runs at every new game, load game (even previous/last saved games), and respawn.
   */
  public ensurePlayerHasGun(forceEquip = true): void {
    if (this.worldType === 'flat') return;
    // 1. Ensure Gun in inventory
    const existingGun = this.inventory.find((slot) => slot.itemId === 'gun');
    if (!existingGun) {
      this.inventory.unshift({ itemId: 'gun', quantity: 1 });
    } else if (existingGun.quantity <= 0) {
      existingGun.quantity = 1;
    }

    // 2. Ensure Knife in inventory
    const existingKnife = this.inventory.find(
      (slot) => slot.itemId === 'hunting_knife',
    );
    if (!existingKnife) {
      this.inventory.splice(1, 0, { itemId: 'hunting_knife', quantity: 1 });
    } else if (existingKnife.quantity <= 0) {
      existingKnife.quantity = 1;
    }

    // 3. Ensure Ammo in inventory (at least 60 rounds)
    const existingAmmo = this.inventory.find((slot) => slot.itemId === 'ammo');
    if (!existingAmmo) {
      this.inventory.push({ itemId: 'ammo', quantity: 60 });
    } else if (existingAmmo.quantity < 30) {
      existingAmmo.quantity = 60;
    }

    // Initialize magazines for any owned firearms
    this.inventory.forEach((slot) => {
      if (isFirearmItem(slot.itemId) && !this.weaponMagazines.has(slot.itemId)) {
        const spec = FIREARM_SPECS[slot.itemId];
        if (spec) {
          this.weaponMagazines.set(slot.itemId, spec.magSize);
        }
      }
    });

    // 4. Ensure diverse baseline materials if missing (e.g. older save files)
    if (forceEquip) {
      this.ensureStarterMaterials();
    }

    // 5. Only force Gun / Knife / Ammo onto hotbar when forceEquip is true (e.g. new game)
    if (forceEquip) {
      let hotbarGunIdx = this.hotbarItemIds.indexOf('gun');
      if (hotbarGunIdx === -1) {
        const emptyIdx = this.hotbarItemIds.findIndex((id) => id === null);
        if (emptyIdx !== -1) {
          this.hotbarItemIds[emptyIdx] = 'gun';
          hotbarGunIdx = emptyIdx;
        } else {
          const displaced = this.hotbarItemIds[0];
          if (displaced && !this.inventory.some((s) => s.itemId === displaced)) {
            this.inventory.push({ itemId: displaced, quantity: 1 });
          }
          this.hotbarItemIds[0] = 'gun';
          hotbarGunIdx = 0;
        }
      }

      let hotbarKnifeIdx = this.hotbarItemIds.indexOf('hunting_knife');
      if (hotbarKnifeIdx === -1) {
        const emptyIdx = this.hotbarItemIds.findIndex((id) => id === null);
        if (emptyIdx !== -1) {
          this.hotbarItemIds[emptyIdx] = 'hunting_knife';
          hotbarKnifeIdx = emptyIdx;
        } else {
          const displaced = this.hotbarItemIds[1];
          if (displaced && !this.inventory.some((s) => s.itemId === displaced)) {
            this.inventory.push({ itemId: displaced, quantity: 1 });
          }
          this.hotbarItemIds[1] = 'hunting_knife';
          hotbarKnifeIdx = 1;
        }
      }

      if (!this.hotbarItemIds.includes('ammo')) {
        const emptyIdx = this.hotbarItemIds.findIndex((id) => id === null);
        if (emptyIdx !== -1) {
          this.hotbarItemIds[emptyIdx] = 'ammo';
        }
      }

      if (hotbarGunIdx !== 0) {
        const displaced = this.hotbarItemIds[0];
        this.hotbarItemIds[0] = 'gun';
        this.hotbarItemIds[hotbarGunIdx] = displaced;
        hotbarGunIdx = 0;
      }
      hotbarKnifeIdx = this.hotbarItemIds.indexOf('hunting_knife');
      if (hotbarKnifeIdx !== -1 && hotbarKnifeIdx !== 1) {
        const displaced = this.hotbarItemIds[1];
        this.hotbarItemIds[1] = 'hunting_knife';
        this.hotbarItemIds[hotbarKnifeIdx] = displaced;
      }
      this.equippedSlot = 0;
    } else if (
      this.equippedSlot < -1 ||
      this.equippedSlot >= this.hotbarItemIds.length
    ) {
      this.equippedSlot = -1;
    }

    // Update hands rig mesh immediately so equipped tool/gun is visible in hands
    if (this.handsRig) {
      const eqId = this.getEquippedItemId();
      const isGun = isFirearmItem(eqId);
      const hasWeaponOrTool = Boolean(
        eqId &&
          (isActiveWeaponItem(eqId) ||
            ITEMS[eqId].category === 'tool' ||
            eqId === 'fishing_rod' ||
            eqId === 'lasso'),
      );
      this.handsRig.toolGroup.visible = hasWeaponOrTool;
      this.handsRig.gunMesh.visible = isGun;
      this.handsRig.soapMesh.visible = false;
      this.handsRig.leftMeatGroup.visible = false;
      if (!hasWeaponOrTool || isGun) {
        this.handsRig.shaft.visible = false;
        this.handsRig.axeHead.visible = false;
        this.handsRig.spearTip.visible = false;
        this.handsRig.knifeBlade.visible = false;
        this.handsRig.clubHead.visible = false;
        this.handsRig.bowArc.visible = false;
        this.handsRig.rodTip.visible = false;
        this.handsRig.sickleBlade.visible = false;
        this.handsRig.warhammerHead.visible = false;
      }
    }

    this.emitHud();
  }

  private ensureStarterMaterials(): void {
    const baseline: { itemId: ItemId; minQty: number }[] = [
      { itemId: 'wood', minQty: 4 },
      { itemId: 'branch', minQty: 4 },
      { itemId: 'stone', minQty: 4 },
      { itemId: 'flint', minQty: 3 },
      { itemId: 'fiber', minQty: 4 },
      { itemId: 'leaves', minQty: 3 },
      { itemId: 'grass', minQty: 3 },
      { itemId: 'clay', minQty: 2 },
      { itemId: 'metal_ore', minQty: 1 },
      { itemId: 'hide', minQty: 1 },
      { itemId: 'rope', minQty: 1 },
      { itemId: 'soap', minQty: 2 },
      { itemId: 'stone_warhammer', minQty: 1 },
      { itemId: 'sickle', minQty: 1 },
      { itemId: 'excavator_shovel', minQty: 1 },
      { itemId: 'powder_keg', minQty: 3 },
      { itemId: 'water_torrent', minQty: 2 },
      { itemId: 'stone_block', minQty: 8 },
      { itemId: 'stone_pillar', minQty: 4 },
      { itemId: 'stone_arch', minQty: 4 },
      { itemId: 'water_wheel', minQty: 1 },
      { itemId: 'drive_shaft', minQty: 2 },
      { itemId: 'gear_box', minQty: 1 },
      { itemId: 'belt_pulley', minQty: 2 },
      { itemId: 'fluid_pipe', minQty: 2 },
      { itemId: 'steam_boiler', minQty: 1 },
      { itemId: 'steam_engine', minQty: 1 },
      { itemId: 'auto_assembler', minQty: 1 },
      { itemId: 'vehicle_chassis_kit', minQty: 12 },
    ];
    for (const mat of baseline) {
      if (this.getItemCount(mat.itemId) <= 0) {
        this.inventory.push({ itemId: mat.itemId, quantity: mat.minQty });
      }
    }
    if (!this.hotbarItemIds.includes('stone_warhammer')) {
      const emptyIdx = this.hotbarItemIds.indexOf(null);
      if (emptyIdx !== -1) {
        this.hotbarItemIds[emptyIdx] = 'stone_warhammer';
      }
    }
    if (!this.hotbarItemIds.includes('sickle')) {
      const emptyIdx = this.hotbarItemIds.indexOf(null);
      if (emptyIdx !== -1) {
        this.hotbarItemIds[emptyIdx] = 'sickle';
      }
    }
    const hasAnyBottle =
      this.getItemCount('dirty_water_bottle') > 0 ||
      this.getItemCount('filtered_water_bottle') > 0;
    if (!hasAnyBottle) {
      this.inventory.push({ itemId: 'dirty_water_bottle', quantity: 1 });
    }
    if (
      !this.hotbarItemIds.includes('dirty_water_bottle') &&
      !this.hotbarItemIds.includes('filtered_water_bottle')
    ) {
      const bottleId: ItemId =
        this.getItemCount('filtered_water_bottle') > 0
          ? 'filtered_water_bottle'
          : 'dirty_water_bottle';
      const emptyIdx = this.hotbarItemIds.indexOf(null);
      if (emptyIdx !== -1) {
        this.hotbarItemIds[emptyIdx] = bottleId;
      }
    }
  }

  private spawnBeachBottles(): void {
    const coords: [number, number][] = [
      [-3.5, 117.5],
      [5.2, 118.5],
      [-11.5, 120.2],
      [11.8, 121.0],
    ];
    coords.forEach(([bx, bz], idx) => {
      this.spawnPickup(
        'dirty_water_bottle',
        1,
        bx,
        bz,
        9999,
        `beach_bottle_${idx}`,
        0,
        false,
      );
    });
  }

  public isNearOceanWater(): boolean {
    if (isFreshwaterAt(this.playerX, this.playerZ)) return false;
    const hereH = getTerrainHeight(this.playerX, this.playerZ);
    if (hereH < OCEAN_LEVEL + 1.15) return true;
    const fwdX = -Math.sin(this.camYaw);
    const fwdZ = -Math.cos(this.camYaw);
    for (const dist of [2.0, 3.6]) {
      const tx = this.playerX + fwdX * dist;
      const tz = this.playerZ + fwdZ * dist;
      if (!isFreshwaterAt(tx, tz) && getTerrainHeight(tx, tz) < OCEAN_LEVEL + 0.55) {
        return true;
      }
    }
    return false;
  }

  public isNearLakeWater(): boolean {
    const dPlayer = Math.hypot(
      this.playerX - LAKE_CENTER.x,
      this.playerZ - LAKE_CENTER.z,
    );
    if (dPlayer <= LAKE_CENTER.radius + 5.8) {
      return true;
    }
    const fwdX = -Math.sin(this.camYaw);
    const fwdZ = -Math.cos(this.camYaw);
    for (const dist of [2.2, 3.8]) {
      const tx = this.playerX + fwdX * dist;
      const tz = this.playerZ + fwdZ * dist;
      const dAhead = Math.hypot(tx - LAKE_CENTER.x, tz - LAKE_CENTER.z);
      if (dAhead <= LAKE_CENTER.radius + 3.2) {
        return true;
      }
    }
    return false;
  }

  private getLakeDirectionHint(): string {
    const dx = LAKE_CENTER.x - this.playerX;
    const dz = LAKE_CENTER.z - this.playerZ;
    const dist = Math.round(Math.max(0, Math.hypot(dx, dz) - LAKE_CENTER.radius));
    const ns = dz < -4 ? 'North' : dz > 4 ? 'South' : '';
    const ew = dx > 4 ? 'East' : dx < -4 ? 'West' : '';
    const dir = ns && ew ? `${ns}-${ew}` : ns || ew || 'nearby';
    return `Azure Lake (${dist}m ${dir})`;
  }

  public washAndScrubMeat(preferredItemId?: ItemId): boolean {
    this.sound.unlock();
    if (this.washMeatTimer > 0 || this.cutMeatTimer > 0) return false;

    const rawCount = this.getItemCount('raw_meat');
    const dinoCount = this.getItemCount('dino_meat');
    let targetId: ItemId | null = null;
    if (preferredItemId === 'dino_meat' && dinoCount > 0) {
      targetId = 'dino_meat';
    } else if (preferredItemId === 'raw_meat' && rawCount > 0) {
      targetId = 'raw_meat';
    } else if (dinoCount > 0) {
      targetId = 'dino_meat';
    } else if (rawCount > 0) {
      targetId = 'raw_meat';
    }

    if (!targetId) {
      this.toast(
        'Hunt wildlife or dinosaurs to get Raw Meat or Dinosaur Meat first!',
        'warning',
      );
      return false;
    }

    if (this.getItemCount('soap') <= 0) {
      this.toast(
        'You need Natural Soap to wash & scrub meat! Craft Soap (2 Leaves + 1 Fiber) or buy from the Farmer.',
        'warning',
      );
      return false;
    }

    if (!this.isNearLakeWater()) {
      this.toast(
        `Walk to ${this.getLakeDirectionHint()} to wash & scrub meat in clean lake water with Soap!`,
        'warning',
      );
      return false;
    }

    const isDino = targetId === 'dino_meat';
    const outId: ItemId = isDino ? 'washed_dino_meat' : 'washed_meat';
    this.removeItem(targetId, 1);
    this.removeItem('soap', 1);
    this.addItem(outId, 1, false);

    this.washMeatTimer = 1.85;
    this.washMeatIsDino = isDino;
    this.washMeatSplashStep = 0;
    this.actionCooldown = 1.25;
    this.sound.playWashScrubMeat();

    const fwdX = -Math.sin(this.camYaw);
    const fwdZ = -Math.cos(this.camYaw);
    this.spawnParticles(
      this.playerX + fwdX * 1.05,
      this.playerY + 0.55,
      this.playerZ + fwdZ * 1.05,
      0xf8fafc,
      10,
    );
    this.spawnParticles(
      this.playerX + fwdX * 1.15,
      this.playerY + 0.45,
      this.playerZ + fwdZ * 1.15,
      0x7dd3fc,
      10,
    );
    this.toast(
      `Washed & scrubbed ${ITEMS[targetId].name} with Soap in Azure Lake! Hang it on a Drying Rack next.`,
      'craft',
      outId,
      1,
    );
    this.emitHud();
    return true;
  }

  public cutDriedMeatWithKnife(preferredItemId?: ItemId): boolean {
    this.sound.unlock();
    if (this.cutMeatTimer > 0 || this.washMeatTimer > 0) return false;

    if (this.getItemCount('hunting_knife') <= 0) {
      this.toast(
        'You need a Hunting Knife to cut dried meat! Craft one at the Workbench.',
        'warning',
      );
      return false;
    }

    const driedRawCount = this.getItemCount('dried_raw_meat');
    const driedDinoCount = this.getItemCount('dried_dino_meat');
    let targetId: ItemId | null = null;
    if (preferredItemId === 'dried_dino_meat' && driedDinoCount > 0) {
      targetId = 'dried_dino_meat';
    } else if (preferredItemId === 'dried_raw_meat' && driedRawCount > 0) {
      targetId = 'dried_raw_meat';
    } else if (driedDinoCount > 0) {
      targetId = 'dried_dino_meat';
    } else if (driedRawCount > 0) {
      targetId = 'dried_raw_meat';
    }

    if (!targetId) {
      if (this.getItemCount('washed_meat') > 0 || this.getItemCount('washed_dino_meat') > 0) {
        this.toast(
          'Hang your Washed Meat on a Meat Drying Rack first so it dries before cutting with a knife!',
          'warning',
        );
      } else if (this.getItemCount('raw_meat') > 0 || this.getItemCount('dino_meat') > 0) {
        this.toast(
          'Wash raw meat with Soap in Azure Lake, dry it on a Drying Rack, then cut it with a knife!',
          'warning',
        );
      } else {
        this.toast(
          'Dry washed meat on a Meat Drying Rack first before cutting with your Hunting Knife.',
          'warning',
        );
      }
      return false;
    }

    // Equip Hunting Knife so the blade renders cleanly in the cutting animation
    const knifeSlot = this.hotbarItemIds.indexOf('hunting_knife');
    if (knifeSlot !== -1) {
      this.equippedSlot = knifeSlot;
    } else {
      const emptyIdx = this.hotbarItemIds.indexOf(null);
      if (emptyIdx !== -1) {
        this.hotbarItemIds[emptyIdx] = 'hunting_knife';
        this.equippedSlot = emptyIdx;
      } else {
        this.hotbarItemIds[this.equippedSlot] = 'hunting_knife';
      }
    }

    const isDino = targetId === 'dried_dino_meat';
    const outId: ItemId = isDino ? 'cut_dino_meat' : 'cut_meat';
    this.removeItem(targetId, 1);
    this.addItem(outId, 2, false);
    this.addItem('dried_meat', 1, false);
    this.stats.itemsCrafted += 1;

    this.cutMeatTimer = 1.45;
    this.cutMeatIsDino = isDino;
    this.cutMeatSliceStep = 0;
    this.actionCooldown = 1.05;
    this.sound.playKnifeCutMeat();

    const fwdX = -Math.sin(this.camYaw);
    const fwdZ = -Math.cos(this.camYaw);
    this.spawnParticles(
      this.playerX + fwdX * 0.72,
      this.playerY + this.currentEyeHeight - 0.25,
      this.playerZ + fwdZ * 0.72,
      isDino ? 0x991b1b : 0xdc2626,
      10,
    );
    this.toast(
      `Sliced ${ITEMS[targetId].name} with Hunting Knife → +2 ${ITEMS[outId].name} & +1 Dried Jerky!`,
      'craft',
      outId,
      2,
    );
    this.evaluateMissions();
    this.emitHud();
    return true;
  }

  public cleanAndFilterWaterBottle(): boolean {
    if (this.getItemCount('dirty_water_bottle') <= 0) {
      if (this.getItemCount('filtered_water_bottle') > 0) {
        this.toast(
          'Your Water Bottle is already clean and filled with Filtered Water!',
          'info',
          'filtered_water_bottle',
          1,
        );
      } else {
        this.toast(
          'Find an empty Water Bottle on the beach sand first.',
          'warning',
        );
      }
      return false;
    }

    if (!this.isNearOceanWater()) {
      this.toast(
        'Walk to the ocean surf to rinse and clean your Water Bottle!',
        'warning',
      );
      return false;
    }

    const oldHotbarIdx = this.hotbarItemIds.indexOf('dirty_water_bottle');
    this.removeItem('dirty_water_bottle', 1);
    this.addItem('filtered_water_bottle', 1, false);

    if (oldHotbarIdx !== -1 && this.getItemCount('dirty_water_bottle') === 0) {
      this.hotbarItemIds[oldHotbarIdx] = 'filtered_water_bottle';
      this.equippedSlot = oldHotbarIdx;
    } else if (!this.hotbarItemIds.includes('filtered_water_bottle')) {
      const emptyIdx = this.hotbarItemIds.indexOf(null);
      if (emptyIdx !== -1) {
        this.hotbarItemIds[emptyIdx] = 'filtered_water_bottle';
        this.equippedSlot = emptyIdx;
      }
    } else {
      const cleanIdx = this.hotbarItemIds.indexOf('filtered_water_bottle');
      if (cleanIdx !== -1) this.equippedSlot = cleanIdx;
    }

    this.washBottleTimer = 1.25;
    this.actionCooldown = 0.85;
    this.sound.playWashBottle();
    const fwdX = -Math.sin(this.camYaw);
    const fwdZ = -Math.cos(this.camYaw);
    this.spawnParticles(
      this.playerX + fwdX * 1.15,
      this.playerY + 0.45,
      this.playerZ + fwdZ * 1.15,
      0x7dd3fc,
      12,
    );
    this.toast(
      'Rinsed in ocean surf & automatically filled with Filtered Water!',
      'craft',
      'filtered_water_bottle',
      1,
    );
    this.emitHud();
    return true;
  }

  public exportSaveData(slotId = this.currentSlotId): GameSaveData {
    if (this.worldType === 'island') {
      this.ensurePlayerHasGun(false);
    }
    const resourceStates: SavedResourceNodeState[] = [];
    if (this.worldType === 'island') {
      for (const n of this.world.resourceNodes) {
        if (n.hp < n.maxHp || n.felled || n.respawnTimer > 0) {
          resourceStates.push({
            id: n.id,
            hp: n.hp,
            respawnTimer: n.respawnTimer,
            felled: n.felled,
          });
        }
      }
    }

    const activePickups: WorldPickupSave[] = this.pickups
      .filter((p) => !p.collected)
      .map((p) => ({
        id: p.id,
        itemId: p.itemId,
        quantity: p.quantity,
        x: p.x,
        y: p.y,
        z: p.z,
        life: p.life,
      }));

    const activeCarcasses: CarcassSaveData[] =
      this.worldType === 'island'
        ? this.carcasses
            .filter((c) => !c.harvested)
            .map((c) => ({
              id: c.id,
              species: c.species,
              displayName: c.displayName,
              isDino: c.isDino,
              x: c.x,
              y: c.y,
              z: c.z,
              yaw: c.yaw,
              drops: c.drops.map((d) => ({ ...d })),
              life: c.life,
              owner: c.owner,
            }))
        : [];

    const effectiveMode = resolveAllowedGameMode(this.worldType, this.gameMode);

    return {
      version: 4,
      slotId,
      savedAt: Date.now(),
      worldType: this.worldType,
      worldName: this.worldName,
      flatSurfaceStyle: this.flatSurfaceStyle,
      player: {
        x: this.playerX,
        y: this.playerY,
        z: this.playerZ,
        yaw: this.playerYaw,
        pitch: this.camPitch,
        vitals: { ...this.vitals },
        equippedSlot: this.equippedSlot,
        hotbarItemIds: [...this.hotbarItemIds],
        hudBarCapacity: this.hotbarItemIds.length,
        gender: this.playerGender,
      },
      dayCount: this.dayCount,
      timeOfDay: this.timeOfDay,
      weather: this.worldType === 'flat' ? 'clear' : this.weather,
      inventory: this.inventory.map((s) => ({ ...s })),
      backpackCompartments: this.backpackCompartments.map((c) => ({ ...c })),
      structures: this.structures.map((s) => ({
        ...s,
        chestItems: s.chestItems ? s.chestItems.map((c) => ({ ...c })) : undefined,
      })),
      structuralBlocks: this.structuralBlocks.map((b) => ({ ...b })),
      kineticNodes: this.kineticNodes.map((n) => ({
        ...n,
        connectedIds: [...n.connectedIds],
      })),
      modularVehicles: this.vehicles.map((v) => ({
        ...v,
        modules: v.modules.map((m) => ({ ...m })),
        cargoItems: v.cargoItems.map((c) => ({ ...c })),
      })),
      coasters: this.coasterRuntime?.exportCoasters() || [],
      ecosystem: { ...this.ecosystem },
      terrainDeltas: this.worldType === 'island' ? exportSparseTerrainDeltas() : [],
      visitedBiomes: Array.from(this.visitedBiomes),
      exploredCells: this.getExploredCellsArray(),
      resourceStates,
      activePickups,
      activeCarcasses,
      hudPreferences: {
        showCompass: this.settings.showCompass !== false,
        compactHud: Boolean(this.settings.compactHud),
      },
      stats: { ...this.stats },
      completedMissionIds: Array.from(this.completedMissionIds),
      discoveredLocations: Array.from(this.discoveredLocations),
      coins: this.coins,
      gameMode: effectiveMode,
      plantedCrops: this.plantedCrops.map((c) => ({ ...c })),
      fridgeItems: this.fridgeItems.map((s) => ({ ...s })),
      tvChannel: this.smartTv.currentChannel,
      tvPower: this.smartTv.power,
      tvTitle: this.smartTv.getCurrentChannelMeta().name,
      tvCategory: this.smartTv.getCurrentChannelMeta().badge,
      tvTimestamp: Math.floor(this.smartTv.currentTimestamp),
      tvVolume: this.smartTv.volume,
      tvIsMuted: this.smartTv.isMuted,
      tvAutoCycle: this.smartTv.autoCycleChannels,
      tvPaused: this.smartTv.isPaused,
      tvBassMode: this.smartTv.getBassMode(),
      weaponMagazines: Object.fromEntries(this.weaponMagazines.entries()),
      baseArmoryOpened: Boolean(this.armoryChestState?.opened),
      clearedStructureIds:
        this.worldType === 'island'
          ? this.structureManager?.exportClearedIds() || []
          : [],
    };
  }

  private markExploredAroundPlayer(): void {
    const cx = Math.floor(
      ((this.playerX + FOG_WORLD_SPAN / 2) / FOG_WORLD_SPAN) * FOG_GRID_SIZE,
    );
    const cz = Math.floor(
      ((this.playerZ + FOG_WORLD_SPAN / 2) / FOG_WORLD_SPAN) * FOG_GRID_SIZE,
    );
    if (cx === this.lastExploredCx && cz === this.lastExploredCz) return;
    this.lastExploredCx = cx;
    this.lastExploredCz = cz;
    for (let dz = -2; dz <= 2; dz++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (dx * dx + dz * dz > 5) continue;
        const gx = cx + dx;
        const gz = cz + dz;
        if (gx >= 0 && gx < FOG_GRID_SIZE && gz >= 0 && gz < FOG_GRID_SIZE) {
          const cellKey = gz * FOG_GRID_SIZE + gx;
          if (!this.exploredCells.has(cellKey)) {
            this.exploredCells.add(cellKey);
            this.exploredCellsDirty = true;
          }
        }
      }
    }
  }

  private clearAlienRelicDecorMeshes(): void {
    for (let i = 0; i < this.alienRelicDecorMeshes.length; i++) {
      const m = this.alienRelicDecorMeshes[i];
      this.scene.remove(m);
      this.disposeObject3D(m);
    }
    this.alienRelicDecorMeshes.length = 0;
  }

  private clearPlacedStructures(): void {
    this.structureVisuals.forEach((v) => {
      this.scene.remove(v.group);
      this.disposeObject3D(v.group);
    });
    this.structureVisuals.clear();
    this.structures = [];
    for (let i = 0; i < this.structureLightPool.length; i++) {
      this.structureLightPool[i].intensity = 0;
    }
  }

  private updateStructureLightPool(
    cx = this.playerX,
    cz = this.playerZ,
    maxDistSq = this.effectiveMaxDrawDistance * this.effectiveMaxDrawDistance,
    inOverworld = this.currentDimension === 'overworld',
  ): void {
    const poolLen = this.structureLightPool.length;
    if (poolLen === 0) return;
    if (!inOverworld) {
      for (let i = 0; i < poolLen; i++) {
        this.structureLightPool[i].intensity = 0;
      }
      return;
    }
    const maxSlots = Math.min(poolLen, this.autoFpsTier >= 2 ? 2 : 4);
    const bestIdx = [-1, -1, -1, -1];
    const bestDistSq = [Infinity, Infinity, Infinity, Infinity];

    for (let i = 0; i < this.structures.length; i++) {
      const st = this.structures[i];
      const vis = this.structureVisuals.get(st.id);
      if (!vis || !vis.group.visible || !vis.lightMeta || vis.lightMeta.currentIntensity <= 0) {
        continue;
      }
      const dx = st.x - cx;
      const dz = st.z - cz;
      const dSq = dx * dx + dz * dz;
      if (dSq > maxDistSq) continue;
      for (let s = 0; s < maxSlots; s++) {
        if (dSq < bestDistSq[s]) {
          for (let k = maxSlots - 1; k > s; k--) {
            bestDistSq[k] = bestDistSq[k - 1];
            bestIdx[k] = bestIdx[k - 1];
          }
          bestDistSq[s] = dSq;
          bestIdx[s] = i;
          break;
        }
      }
    }

    for (let s = 0; s < poolLen; s++) {
      const pl = this.structureLightPool[s];
      const idx = s < maxSlots ? bestIdx[s] : -1;
      if (idx === -1) {
        pl.intensity = 0;
        continue;
      }
      const st = this.structures[idx];
      const vis = this.structureVisuals.get(st.id);
      const meta = vis?.lightMeta;
      if (!vis || !meta) {
        pl.intensity = 0;
        continue;
      }
      const cosR = Math.cos(st.rotationY);
      const sinR = Math.sin(st.rotationY);
      pl.position.set(
        vis.group.position.x + meta.localX * cosR + meta.localZ * sinR,
        vis.group.position.y + meta.localY,
        vis.group.position.z - meta.localX * sinR + meta.localZ * cosR,
      );
      pl.color.setHex(meta.colorHex);
      pl.distance = meta.distance;
      pl.decay = meta.decay;
      pl.intensity = meta.currentIntensity;
    }
  }

  private spawnStructure(st: PlacedStructure): void {
    const built = createCampStructureModel(st.type, this.world.woodTex);
    built.group.position.set(st.x, st.y, st.z);
    built.group.rotation.y = st.rotationY;
    let lightMeta:
      | {
          localX: number;
          localY: number;
          localZ: number;
          colorHex: number;
          baseIntensity: number;
          currentIntensity: number;
          distance: number;
          decay: number;
        }
      | undefined;
    if (built.fireLight) {
      lightMeta = {
        localX: built.fireLight.position.x,
        localY: built.fireLight.position.y,
        localZ: built.fireLight.position.z,
        colorHex: built.fireLight.color.getHex(),
        baseIntensity: built.fireLight.intensity,
        currentIntensity: built.fireLight.intensity,
        distance: built.fireLight.distance,
        decay: built.fireLight.decay,
      };
      built.fireLight.parent?.remove(built.fireLight);
      built.fireLight.dispose();
      built.fireLight = undefined;
    }
    applyRealisticMeshLightingPass(built.group, {
      shadowsEnabled: this.effectiveShadowsEnabled,
      envMapIntensity: 1.0,
    });
    this.scene.add(built.group);
    this.structureVisuals.set(st.id, { ...built, lightMeta });
    this.structures.push(st);
    this.updateStructureLightPool();
  }

  public getItemCount(itemId: ItemId): number {
    return this.inventory
      .filter((s) => s.itemId === itemId)
      .reduce((sum, s) => sum + s.quantity, 0);
  }

  public addItem(itemId: ItemId, qty: number, notify = true): void {
    if (qty <= 0) return;
    const def = ITEMS[itemId];
    let remaining = qty;

    if (def.stackable) {
      for (const slot of this.inventory) {
        if (slot.itemId === itemId && slot.quantity < def.maxStack) {
          const add = Math.min(remaining, def.maxStack - slot.quantity);
          slot.quantity += add;
          remaining -= add;
          if (remaining <= 0) break;
        }
      }
    }

    while (remaining > 0) {
      const add = def.stackable ? Math.min(remaining, def.maxStack) : 1;
      this.inventory.push({ itemId, quantity: add });
      remaining -= add;
    }

    const storedInCompartment = this.backpackCompartments.some(
      (c) => c.itemId === itemId,
    );
    if (storedInCompartment) {
      const totalNow = this.getItemCount(itemId);
      for (const comp of this.backpackCompartments) {
        if (comp.itemId === itemId) comp.quantity = totalNow;
      }
    } else if (
      (def.category !== 'resource' ||
        itemId === 'wheat' ||
        itemId === 'sugarcane' ||
        itemId === 'raw_meat' ||
        itemId === 'dino_meat' ||
        itemId === 'hide' ||
        itemId === 'bone' ||
        itemId === 'ocean_fish' ||
        itemId === 'freshwater_fish') &&
      !this.hotbarItemIds.includes(itemId)
    ) {
      const emptyIdx = this.hotbarItemIds.indexOf(null);
      if (emptyIdx !== -1) {
        this.hotbarItemIds[emptyIdx] = itemId;
      }
    }

    if (notify) {
      this.toast(`+${qty} ${def.name}`, 'gain', itemId, qty);
    }
    this.evaluateMissions();
    this.emitHud();
  }

  public playWorkbenchCraftSound(): void {
    this.sound.playWorkbenchCraft();
  }

  public removeItem(itemId: ItemId, qty: number): boolean {
    if (this.getItemCount(itemId) < qty) return false;
    let left = qty;
    for (let i = this.inventory.length - 1; i >= 0 && left > 0; i--) {
      if (this.inventory[i].itemId === itemId) {
        const take = Math.min(left, this.inventory[i].quantity);
        this.inventory[i].quantity -= take;
        left -= take;
        if (this.inventory[i].quantity <= 0) {
          this.inventory.splice(i, 1);
        }
      }
    }
    const remainingQty = this.getItemCount(itemId);
    if (remainingQty === 0) {
      this.hotbarItemIds = this.hotbarItemIds.map((h) => (h === itemId ? null : h));
      this.backpackCompartments = this.backpackCompartments.filter(
        (c) => c.itemId !== itemId,
      );
    } else {
      for (const comp of this.backpackCompartments) {
        if (comp.itemId === itemId) comp.quantity = remainingQty;
      }
    }
    return true;
  }

  public dropItem(itemId: ItemId, qty = 1): void {
    if (itemId === 'gun' && this.getItemCount('gun') <= 1) {
      this.toast('Survival Gun is vital equipment and cannot be discarded.', 'warning', 'gun', 1);
      return;
    }
    if (itemId === 'hunting_knife' && this.getItemCount('hunting_knife') <= 1) {
      this.toast('Basic Knife is vital for preparing carcasses and cannot be discarded.', 'warning', 'hunting_knife', 1);
      return;
    }
    if (qty === 1 && this.getItemCount(itemId) >= 1) {
      const fwdX = -Math.sin(this.camYaw);
      const fwdZ = -Math.cos(this.camYaw);
      const px = this.playerX + fwdX * 2.0;
      const pz = this.playerZ + fwdZ * 2.0;
      if (this.trySparkCampfireOnGround(itemId, px, pz)) {
        this.removeItem(itemId, 1);
        this.evaluateMissions();
        this.emitHud();
        return;
      }
    }
    if (this.removeItem(itemId, qty)) {
      const fwdX = -Math.sin(this.camYaw);
      const fwdZ = -Math.cos(this.camYaw);
      const px = this.playerX + fwdX * 2.0;
      const pz = this.playerZ + fwdZ * 2.0;
      this.spawnPickup(itemId, qty, px, pz, 600, undefined, 2.8, true);
      this.sound.playPickup();
      this.toast(`Placed ${qty}x ${ITEMS[itemId].name} on the ground`, 'info', itemId, qty);
      this.emitHud();
    }
  }

  public craftRecipe(recipeId: string): boolean {
    const recipe = CRAFTING_RECIPES.find((r) => r.id === recipeId);
    if (!recipe) return false;

    for (const ing of recipe.ingredients) {
      if (this.getItemCount(ing.itemId) < ing.quantity) {
        this.toast(`Missing ${ITEMS[ing.itemId].name}`, 'warning');
        return false;
      }
    }

    for (const ing of recipe.ingredients) {
      this.removeItem(ing.itemId, ing.quantity);
    }

    this.addItem(recipe.resultItemId, recipe.resultQuantity, false);
    this.stats.itemsCrafted += 1;
    this.sound.playCraftSuccess();
    this.toast(
      `Crafted ${recipe.resultQuantity}x ${ITEMS[recipe.resultItemId].name}`,
      'craft',
    );
    this.evaluateMissions();
    this.emitHud();
    return true;
  }

  public cookRecipe(recipeId: string, atStation: boolean): boolean {
    const recipe = COOKING_RECIPES.find((r) => r.id === recipeId);
    if (!recipe) return false;
    if (recipe.requiresStation && !atStation) {
      this.toast('Requires a Cooking Station', 'warning');
      return false;
    }

    for (const ing of recipe.ingredients) {
      if (this.getItemCount(ing.itemId) < ing.quantity) {
        this.toast(`Need ${ITEMS[ing.itemId].name}`, 'warning');
        return false;
      }
    }

    for (const ing of recipe.ingredients) {
      this.removeItem(ing.itemId, ing.quantity);
    }

    this.addItem(recipe.resultItemId, recipe.resultQuantity, false);
    this.stats.mealsCooked += 1;
    this.sound.playCookSizzle();
    this.toast(`Cooked ${ITEMS[recipe.resultItemId].name}`, 'craft');
    this.evaluateMissions();
    this.emitHud();
    return true;
  }

  public startInteractiveCook(recipeId: string, atStation: boolean): boolean {
    const recipe = COOKING_RECIPES.find((r) => r.id === recipeId);
    if (!recipe) return false;
    if (recipe.requiresStation && !atStation) {
      this.toast('Requires a Cooking Station', 'warning');
      return false;
    }
    for (const ing of recipe.ingredients) {
      if (this.getItemCount(ing.itemId) < ing.quantity) {
        this.toast(`Need ${ITEMS[ing.itemId].name}`, 'warning');
        return false;
      }
    }
    for (const ing of recipe.ingredients) {
      this.removeItem(ing.itemId, ing.quantity);
    }
    this.sound.playCookSizzle();
    this.emitHud();
    return true;
  }

  public cancelInteractiveCook(recipeId: string): void {
    const recipe = COOKING_RECIPES.find((r) => r.id === recipeId);
    if (!recipe) return;
    for (const ing of recipe.ingredients) {
      this.addItem(ing.itemId, ing.quantity, false);
    }
    this.emitHud();
  }

  public finishInteractiveCook(
    recipeId: string,
    outcome: 'cooked' | 'burnt',
    flipped: boolean,
  ): boolean {
    const recipe = COOKING_RECIPES.find((r) => r.id === recipeId);
    if (!recipe) return false;

    if (outcome === 'burnt') {
      this.addItem('burnt_food', 1, false);
      this.sound.playCookSizzle();
      this.toast(
        `${ITEMS[recipe.resultItemId].name} burned on the fire! Pull dishes before 150%.`,
        'warning',
        'burnt_food',
        1,
      );
      this.emitHud();
      return true;
    }

    this.addItem(recipe.resultItemId, recipe.resultQuantity, false);
    this.stats.mealsCooked += 1;
    this.sound.playCookSizzle();
    if (flipped) {
      this.vitals.stamina = Math.min(
        this.vitals.maxStamina,
        this.vitals.stamina + 8,
      );
      this.toast(
        `Perfectly flipped & seared ${ITEMS[recipe.resultItemId].name}!`,
        'craft',
        recipe.resultItemId,
        recipe.resultQuantity,
      );
    } else {
      this.toast(
        `Cooked ${ITEMS[recipe.resultItemId].name}`,
        'craft',
        recipe.resultItemId,
        recipe.resultQuantity,
      );
    }
    this.evaluateMissions();
    this.emitHud();
    return true;
  }

  public useOrEquipItem(itemId: ItemId): void {
    const def = ITEMS[itemId];
    if (this.getItemCount(itemId) <= 0) return;

    if (itemId === 'raw_meat' || itemId === 'dino_meat' || itemId === 'soap') {
      if (this.isNearLakeWater()) {
        this.washAndScrubMeat(itemId === 'soap' ? undefined : itemId);
        return;
      }
      const existingIdx = this.hotbarItemIds.indexOf(itemId);
      if (existingIdx !== -1) {
        this.equippedSlot = existingIdx;
      } else {
        this.hotbarItemIds[this.equippedSlot] = itemId;
      }
      this.toast(
        `Walk to ${this.getLakeDirectionHint()} with Soap to wash & scrub meat clean!`,
        'info',
        itemId,
        1,
      );
      this.emitHud();
      return;
    }

    if (itemId === 'washed_meat' || itemId === 'washed_dino_meat') {
      const nearRack = this.structures.find(
        (s) =>
          s.type === 'drying_rack' &&
          Math.hypot(s.x - this.playerX, s.z - this.playerZ) < 4.5,
      );
      if (nearRack) {
        this.callbacks.onOpenStation('drying_rack', nearRack.id);
        return;
      }
      const existingIdx = this.hotbarItemIds.indexOf(itemId);
      if (existingIdx !== -1) {
        this.equippedSlot = existingIdx;
      } else {
        this.hotbarItemIds[this.equippedSlot] = itemId;
      }
      this.toast(
        'Hang Washed Meat on a Meat Drying Rack (next to the premade shelter or by Azure Lake) to dry before cutting.',
        'info',
        itemId,
        1,
      );
      this.emitHud();
      return;
    }

    if (itemId === 'dried_raw_meat' || itemId === 'dried_dino_meat') {
      this.cutDriedMeatWithKnife(itemId);
      return;
    }

    if (itemId === 'dirty_water_bottle') {
      if (this.isNearOceanWater()) {
        this.cleanAndFilterWaterBottle();
        return;
      }
      const existingIdx = this.hotbarItemIds.indexOf(itemId);
      if (existingIdx !== -1) {
        this.equippedSlot = existingIdx;
      } else {
        this.hotbarItemIds[this.equippedSlot] = itemId;
      }
      this.toast(
        'Equipped Water Bottle — walk to the ocean shore and press Clean Water Bottle.',
        'info',
        itemId,
        1,
      );
      this.emitHud();
      return;
    }

    if (def.category === 'food') {
      const prevCleanSlot = this.hotbarItemIds.indexOf('filtered_water_bottle');
      this.removeItem(itemId, 1);
      if (def.hungerRestore) {
        this.vitals.hunger = Math.min(
          this.vitals.maxHunger,
          this.vitals.hunger + def.hungerRestore,
        );
      }
      if (def.thirstRestore) {
        this.vitals.thirst = Math.min(
          this.vitals.maxThirst,
          this.vitals.thirst + def.thirstRestore,
        );
      }
      if (def.healthRestore) {
        this.vitals.health = Math.min(
          this.vitals.maxHealth,
          this.vitals.health + def.healthRestore,
        );
      }
      if (def.staminaRestore) {
        this.vitals.stamina = Math.min(
          this.vitals.maxStamina,
          this.vitals.stamina + def.staminaRestore,
        );
      }

      if (itemId === 'filtered_water_bottle') {
        this.stats.freshWaterDrunk += 1;
        this.drinkTimer = 0.95;
        this.sound.playDrink();
        // Return the empty bottle so it can be cleaned & refilled again at the ocean
        this.addItem('dirty_water_bottle', 1, false);
        if (
          prevCleanSlot !== -1 &&
          this.getItemCount('filtered_water_bottle') === 0
        ) {
          this.hotbarItemIds[prevCleanSlot] = 'dirty_water_bottle';
        }
        this.toast(
          `Drank Filtered Water (+${def.thirstRestore || 55} Thirst) — bottle ready to clean again`,
          'info',
          itemId,
          1,
        );
        this.evaluateMissions();
        this.emitHud();
        return;
      }

      this.eatTimer = 0.92;
      this.eatBiteCount = 0;
      this.activeConsumeColor = def.color;
      this.sound.playEat();
      const fwdX = -Math.sin(this.camYaw);
      const fwdZ = -Math.cos(this.camYaw);
      this.spawnParticles(
        this.playerX + fwdX * 0.48,
        this.playerY + this.currentEyeHeight - 0.14,
        this.playerZ + fwdZ * 0.48,
        parseInt(def.color.replace('#', ''), 16) || 0xb91c1c,
        6,
      );
      this.toast(`Ate ${def.name}`, 'info', itemId, 1);
      this.emitHud();
      return;
    }

    if (def.structureType) {
      this.placeStructureFromInventory(itemId);
      return;
    }

    const existingIdx = this.hotbarItemIds.indexOf(itemId);
    if (existingIdx !== -1) {
      this.equippedSlot = existingIdx;
    } else {
      const emptyIdx = this.hotbarItemIds.indexOf(null);
      const maxSlot = Math.max(0, this.hotbarItemIds.length - 1);
      const targetSlot =
        this.equippedSlot >= 0 && this.equippedSlot < this.hotbarItemIds.length
          ? this.equippedSlot
          : emptyIdx !== -1
            ? emptyIdx
            : maxSlot;
      this.hotbarItemIds[targetSlot] = itemId;
      this.equippedSlot = targetSlot;
    }
    this.toast(`Equipped ${def.name}`, 'info');
    this.emitHud();
  }

  public placeStructureFromInventory(itemId: ItemId): boolean {
    const def = ITEMS[itemId];
    const creativeBuild = this.gameMode === 'sandbox' || this.worldType === 'flat';
    if (!def.structureType || (!creativeBuild && this.getItemCount(itemId) <= 0)) {
      return false;
    }

    const placeDist = 2.8;
    const fwdX = -Math.sin(this.camYaw);
    const fwdZ = -Math.cos(this.camYaw);
    const px = this.playerX + fwdX * placeDist;
    const pz = this.playerZ + fwdZ * placeDist;
    const py = getTerrainHeight(px, pz);

    if (py < getWaterLevelAt(px, pz) + 0.15) {
      this.toast('Cannot build in deep water', 'warning');
      return false;
    }

    if (!creativeBuild && this.getItemCount(itemId) > 0) {
      this.removeItem(itemId, 1);
    }
    const st: PlacedStructure = {
      id: `struct_${Date.now()}_${Math.floor(Math.random() * 999)}`,
      type: def.structureType,
      x: px,
      y: py,
      z: pz,
      rotationY: this.camYaw,
      chestItems: def.structureType === 'storage_chest' ? [] : undefined,
      dryingSlots: def.structureType === 'drying_rack' ? [
        { itemId: 'washed_meat' as ItemId, quantity: 0, progress: 0 },
        { itemId: 'washed_meat' as ItemId, quantity: 0, progress: 0 },
        { itemId: 'washed_meat' as ItemId, quantity: 0, progress: 0 },
        { itemId: 'washed_meat' as ItemId, quantity: 0, progress: 0 },
      ] : undefined,
      lit:
        def.structureType === 'campfire' ||
        def.structureType === 'cooking_station',
    };
    this.spawnStructure(st);
    this.p2p?.broadcast({ type: 'place_structure', structure: st });
    this.sound.playCraftSuccess();
    this.toast(`Built ${def.name}`, 'craft');
    this.evaluateMissions();
    this.emitHud();
    return true;
  }

  private isKindlingItem(itemId: ItemId): boolean {
    return (
      itemId === 'branch' ||
      itemId === 'wood' ||
      itemId === 'grass' ||
      itemId === 'leaves'
    );
  }

  private trySparkCampfireOnGround(
    placedItemId: ItemId,
    px: number,
    pz: number,
  ): boolean {
    const needsKindling = placedItemId === 'flint';
    const needsFlint = this.isKindlingItem(placedItemId);
    if (!needsKindling && !needsFlint) return false;

    let matchIdx = -1;
    let bestDist = 3.2;
    for (let i = 0; i < this.pickups.length; i++) {
      const p = this.pickups[i];
      if (p.collected) continue;
      const isValidMatch = needsKindling
        ? this.isKindlingItem(p.itemId)
        : p.itemId === 'flint';
      if (!isValidMatch) continue;
      const d = Math.hypot(p.x - px, p.z - pz);
      if (d <= bestDist) {
        bestDist = d;
        matchIdx = i;
      }
    }
    if (matchIdx === -1) return false;

    const match = this.pickups[matchIdx];
    const fireX = match.x;
    const fireZ = match.z;
    const fireY = getTerrainHeight(fireX, fireZ);
    if (fireY < getWaterLevelAt(fireX, fireZ) + 0.1) {
      return false;
    }

    const fuelLabel = needsKindling
      ? ITEMS[match.itemId].name
      : ITEMS[placedItemId].name;

    if (match.quantity > 1) {
      match.quantity -= 1;
    } else {
      match.collected = true;
      this.recyclePickupMesh(match.itemId, match.mesh);
      this.pickups.splice(matchIdx, 1);
    }

    const st: PlacedStructure = {
      id: `struct_${Date.now()}_${Math.floor(Math.random() * 999)}`,
      type: 'campfire',
      x: fireX,
      y: fireY,
      z: fireZ,
      rotationY: this.camYaw,
      lit: true,
    };
    this.spawnStructure(st);
    this.spawnParticles(fireX, fireY + 0.35, fireZ, 0xf97316, 14);
    this.sound.playCookSizzle();
    this.sound.playCraftSuccess();
    this.toast(
      `Struck Sharp Flint & ${fuelLabel} — Campfire ignited!`,
      'craft',
      'campfire',
      1,
    );
    return true;
  }

  public sparkQuickCampfire(): boolean {
    if (this.getItemCount('flint') <= 0) {
      this.toast('Need Sharp Flint to spark a fire', 'warning');
      return false;
    }
    const fuelId: ItemId | null =
      this.getItemCount('branch') > 0
        ? 'branch'
        : this.getItemCount('wood') > 0
          ? 'wood'
          : this.getItemCount('grass') > 0
            ? 'grass'
            : null;
    if (!fuelId) {
      this.toast('Need Dry Branch, Wood, or Dried Grass to spark a fire', 'warning');
      return false;
    }

    const placeDist = 2.4;
    const fwdX = -Math.sin(this.camYaw);
    const fwdZ = -Math.cos(this.camYaw);
    const px = this.playerX + fwdX * placeDist;
    const pz = this.playerZ + fwdZ * placeDist;
    const py = getTerrainHeight(px, pz);
    if (py < getWaterLevelAt(px, pz) + 0.15) {
      this.toast('Move onto dry ground to build a campfire', 'warning');
      return false;
    }

    this.removeItem('flint', 1);
    this.removeItem(fuelId, 1);
    const st: PlacedStructure = {
      id: `struct_${Date.now()}_${Math.floor(Math.random() * 999)}`,
      type: 'campfire',
      x: px,
      y: py,
      z: pz,
      rotationY: this.camYaw,
      lit: true,
    };
    this.spawnStructure(st);
    this.spawnParticles(px, py + 0.35, pz, 0xf97316, 14);
    this.sound.playCookSizzle();
    this.sound.playCraftSuccess();
    this.toast(
      `Struck Sharp Flint & ${ITEMS[fuelId].name} — Campfire ignited!`,
      'craft',
      'campfire',
      1,
    );
    this.evaluateMissions();
    this.emitHud();
    return true;
  }

  public placeItemInWorld(itemId: ItemId): boolean {
    const def = ITEMS[itemId];
    const creativeBuild =
      (this.gameMode === 'sandbox' || this.worldType === 'flat') &&
      Boolean(def.structureType || def.structuralKind || def.kineticKind);
    if (!creativeBuild && this.getItemCount(itemId) <= 0) {
      this.toast(`You don't have any ${def.name}`, 'warning');
      return false;
    }

    if (def.structuralKind) {
      return this.placeStructuralBlock(itemId);
    }

    if (def.kineticKind) {
      return this.placeKineticNode(itemId);
    }

    if (def.structureType) {
      return this.placeStructureFromInventory(itemId);
    }

    if (itemId === 'powder_keg') {
      return this.throwPowderKeg();
    }

    if (itemId === 'water_torrent') {
      return this.releaseWaterTorrent();
    }

    const placeDist = 2.1;
    const fwdX = -Math.sin(this.camYaw);
    const fwdZ = -Math.cos(this.camYaw);
    const px = this.playerX + fwdX * placeDist;
    const pz = this.playerZ + fwdZ * placeDist;
    const py = getTerrainHeight(px, pz);

    if (py < getWaterLevelAt(px, pz) - 0.15) {
      this.toast('Move onto dry ground to place items down', 'warning');
      return false;
    }

    this.removeItem(itemId, 1);

    if (this.trySparkCampfireOnGround(itemId, px, pz)) {
      this.evaluateMissions();
      this.emitHud();
      return true;
    }

    this.spawnPickup(itemId, 1, px, pz, 600, undefined, 2.8, true);
    this.spawnParticles(px, py + 0.25, pz, 0xfbbf24, 5);
    this.sound.playPickup();
    this.toast(`Placed ${def.name}`, 'info', itemId, 1);
    this.emitHud();
    return true;
  }

  public transferToChest(
    structureId: string,
    itemId: ItemId,
    qty = 1,
  ): void {
    const chest = this.structures.find(
      (s) => s.id === structureId && s.type === 'storage_chest',
    );
    if (!chest || !this.removeItem(itemId, qty)) return;
    if (!chest.chestItems) chest.chestItems = [];
    const existing = chest.chestItems.find((c) => c.itemId === itemId);
    if (existing) existing.quantity += qty;
    else chest.chestItems.push({ itemId, quantity: qty });
    this.emitHud();
  }

  public transferFromChest(
    structureId: string,
    itemId: ItemId,
    qty = 1,
  ): void {
    const chest = this.structures.find(
      (s) => s.id === structureId && s.type === 'storage_chest',
    );
    if (!chest || !chest.chestItems) return;
    const idx = chest.chestItems.findIndex((c) => c.itemId === itemId);
    if (idx === -1) return;
    const take = Math.min(qty, chest.chestItems[idx].quantity);
    chest.chestItems[idx].quantity -= take;
    if (chest.chestItems[idx].quantity <= 0) chest.chestItems.splice(idx, 1);
    this.addItem(itemId, take, false);
    this.emitHud();
  }

  public hangMeatOnDryingRack(structureId: string, itemId: ItemId): void {
    const st = this.structures.find((s) => s.id === structureId && s.type === 'drying_rack');
    if (!st || !st.dryingSlots) return;

    if (itemId !== 'washed_meat' && itemId !== 'washed_dino_meat') {
      this.toast(
        `Wash & scrub ${ITEMS[itemId].name} with Soap in Azure Lake before hanging it to dry!`,
        'warning',
      );
      return;
    }

    if (this.getItemCount(itemId) <= 0) {
      this.toast(`No ${ITEMS[itemId].name} in inventory`, 'warning');
      return;
    }

    const emptySlot = st.dryingSlots.find((slot) => !slot.itemId || slot.quantity === 0);
    if (!emptySlot) {
      this.toast('All drying rack hooks are currently occupied', 'warning');
      return;
    }

    if (!this.removeItem(itemId, 1)) return;
    emptySlot.itemId = itemId;
    emptySlot.quantity = 1;
    emptySlot.progress = 0.0;
    this.sound.playCraftSuccess();
    this.toast(`Hung ${ITEMS[itemId].name} on Drying Rack to air-dry`, 'discovery');
    this.emitHud();
  }

  public collectDriedMeatFromRack(structureId: string, slotIdx: number): void {
    const st = this.structures.find((s) => s.id === structureId && s.type === 'drying_rack');
    if (!st || !st.dryingSlots || !st.dryingSlots[slotIdx]) return;

    const slot = st.dryingSlots[slotIdx];
    if (!slot.itemId || slot.quantity <= 0 || slot.progress < 1.0) {
      this.toast('Meat is still drying on the rack', 'warning');
      return;
    }

    const isDino = slot.itemId === 'washed_dino_meat';
    const outId: ItemId = isDino ? 'dried_dino_meat' : 'dried_raw_meat';
    this.addItem(outId, 1, false);
    slot.itemId = 'washed_meat';
    slot.quantity = 0;
    slot.progress = 0;
    this.sound.playCraftSuccess();
    this.toast(
      `Collected ${ITEMS[outId].name}! Now cut it with your Hunting Knife.`,
      'discovery',
      outId,
      1,
    );
    this.emitHud();
  }

  public transferToFridge(itemId: ItemId, qty = 1): void {
    if (!this.removeItem(itemId, qty)) return;
    const existing = this.fridgeItems.find((s) => s.itemId === itemId);
    if (existing) existing.quantity += qty;
    else this.fridgeItems.push({ itemId, quantity: qty });
    this.sound.playPickup();
    this.emitHud();
  }

  public transferFromFridge(itemId: ItemId, qty = 1): void {
    const idx = this.fridgeItems.findIndex((s) => s.itemId === itemId);
    if (idx === -1) return;
    const take = Math.min(qty, this.fridgeItems[idx].quantity);
    this.fridgeItems[idx].quantity -= take;
    if (this.fridgeItems[idx].quantity <= 0) this.fridgeItems.splice(idx, 1);
    this.addItem(itemId, take, false);
    this.sound.playPickup();
    this.emitHud();
  }

  public buyFromFarmer(itemId: ItemId): boolean {
    const entry = FARM_SHOP_STOCK.find((s) => s.itemId === itemId);
    if (!entry) return false;
    if (this.coins < entry.price) {
      this.toast(`Need ${entry.price} Coins (you have ${this.coins})`, 'warning');
      return false;
    }
    this.coins -= entry.price;
    this.addItem(itemId, entry.quantity, false);
    this.sound.playCraftSuccess();
    this.toast(
      `Bought ${entry.quantity}x ${ITEMS[itemId].name} (-${entry.price} Coins)`,
      'craft',
      itemId,
      entry.quantity,
    );
    this.emitHud();
    return true;
  }

  public sellToFarmer(itemId: ItemId, qty = 1): boolean {
    const unitPrice = ITEM_SELL_PRICES[itemId] ?? 4;
    if (this.getItemCount(itemId) < qty) return false;
    this.removeItem(itemId, qty);
    const total = unitPrice * qty;
    this.coins += total;
    this.sound.playPickup();
    this.toast(`Sold ${qty}x ${ITEMS[itemId].name} (+${total} Coins)`, 'gain', itemId, qty);
    this.emitHud();
    return true;
  }

  public standUp(): void {
    if (!this.seatedState) return;
    this.playerX = this.seatedState.returnX;
    this.playerZ = this.seatedState.returnZ;
    this.playerY = getTerrainHeight(this.playerX, this.playerZ);
    this.seatedState = null;
    this.emitHud();
  }

  private clearPlantedCrops(): void {
    this.cropMeshes.forEach((m) => {
      this.scene.remove(m);
      this.disposeObject3D(m);
    });
    this.cropMeshes.clear();
    this.plantedCrops = [];
  }

  private rebuildCropMesh(crop: PlantedCrop): void {
    const prev = this.cropMeshes.get(crop.id);
    if (prev) {
      this.scene.remove(prev);
      this.disposeObject3D(prev);
    }
    const mesh = createCropPlantMesh(
      crop.produceItemId,
      crop.mature ? 1 : crop.growthProgress,
      crop.watered,
    );
    mesh.position.set(crop.x, crop.y, crop.z);
    this.scene.add(mesh);
    this.cropMeshes.set(crop.id, mesh);
  }

  private plantSeed(seedItemId: ItemId): boolean {
    const spec = SEED_SPECS[seedItemId];
    if (!spec || this.getItemCount(seedItemId) <= 0) return false;

    const fwdX = -Math.sin(this.camYaw);
    const fwdZ = -Math.cos(this.camYaw);
    let tx = this.playerX + fwdX * 1.9;
    let tz = this.playerZ + fwdZ * 1.9;
    let ty = getTerrainHeight(tx, tz);

    // Prefer nearest vacant tilled soil bed next to the Farmer if standing beside it
    let bestPlotDist = 3.2;
    for (const plot of this.world.soilPlots) {
      const occupied = this.plantedCrops.some(
        (c) => Math.hypot(c.x - plot.x, c.z - plot.z) < 0.9,
      );
      if (occupied) continue;
      const d = Math.hypot(plot.x - this.playerX, plot.z - this.playerZ);
      if (d < bestPlotDist) {
        bestPlotDist = d;
        tx = plot.x;
        tz = plot.z;
        ty = plot.y;
      }
    }

    if (ty < getWaterLevelAt(tx, tz) + 0.15) {
      this.toast('Find dry soil or tilled farm plots to plant seeds', 'warning');
      return false;
    }
    if (Math.hypot(tx - HILL_HOUSE_POS.x, tz - HILL_HOUSE_POS.z) < 8.5) {
      this.toast('Step outside the house onto soil to plant crops', 'warning');
      return false;
    }

    this.removeItem(seedItemId, 1);
    const crop: PlantedCrop = {
      id: `crop_${Date.now()}_${Math.floor(Math.random() * 9999)}`,
      seedItemId,
      produceItemId: spec.produceItemId,
      x: tx,
      y: ty,
      z: tz,
      growthProgress: 0.12,
      watered: this.weather === 'rain' || this.weather === 'storm',
      mature: false,
    };
    this.plantedCrops.push(crop);
    this.rebuildCropMesh(crop);
    this.spawnParticles(tx, ty + 0.2, tz, 0x65a30d, 6);
    this.sound.playGather('plant', 0.4);
    this.toast(
      `Planted ${ITEMS[spec.produceItemId].name}! Press E near it to water.`,
      'craft',
      spec.produceItemId,
      1,
    );
    this.emitHud();
    return true;
  }

  private harvestPlantedCrop(cropId: string): boolean {
    const idx = this.plantedCrops.findIndex((c) => c.id === cropId);
    if (idx === -1) return false;
    const crop = this.plantedCrops[idx];
    const spec = SEED_SPECS[crop.seedItemId];
    const m = this.cropMeshes.get(crop.id);
    if (m) {
      this.scene.remove(m);
      this.disposeObject3D(m);
    }
    this.cropMeshes.delete(crop.id);
    this.plantedCrops.splice(idx, 1);

    const yieldQty = spec ? spec.yieldQty : 3;
    this.spawnWorldPickupsFromGrants(crop.x, crop.z, [
      [crop.produceItemId, yieldQty],
      [crop.seedItemId, 1],
    ]);
    this.spawnParticles(crop.x, crop.y + 0.4, crop.z, 0x84cc16, 8);
    this.sound.playGather('plant', 1);
    this.toast(
      `Harvested ${yieldQty}x ${ITEMS[crop.produceItemId].name}!`,
      'gain',
      crop.produceItemId,
      yieldQty,
    );
    this.emitHud();
    return true;
  }

  private interactHouseStation(st: HouseStationTarget): void {
    switch (st.kind) {
      case 'house_couch': {
        const sitYaw = st.sitYaw ?? 0;
        const sitX = st.sitX ?? st.x;
        const sitY = st.sitY ?? st.y + 0.2;
        const sitZ = st.sitZ ?? st.z;
        this.seatedState = {
          label: 'Relaxing on Sofa',
          x: sitX,
          y: sitY,
          z: sitZ,
          yaw: sitYaw,
          returnX: sitX,
          returnZ: sitZ - 0.9,
        };
        this.camYaw = sitYaw;
        this.playerYaw = sitYaw + Math.PI;
        this.camPitch = -0.02;
        this.vitals.stamina = Math.min(this.vitals.maxStamina, this.vitals.stamina + 18);
        this.vitals.temperatureC = Math.max(this.vitals.temperatureC, 37.0);
        this.toast('Sat on the living room sofa facing the Smart TV (Cozy Lounge active)', 'info');
        this.emitHud();
        break;
      }
      case 'house_toilet': {
        const sitYaw = st.sitYaw ?? Math.PI;
        const sitX = st.sitX ?? st.x;
        const sitY = st.sitY ?? st.y + 0.1;
        const sitZ = st.sitZ ?? st.z;
        this.seatedState = {
          label: 'Using Toilet',
          x: sitX,
          y: sitY,
          z: sitZ,
          yaw: sitYaw,
          returnX: sitX,
          returnZ: sitZ + 0.9,
        };
        this.camYaw = sitYaw;
        this.playerYaw = sitYaw + Math.PI;
        this.toast('Seated in the bathroom', 'info');
        this.emitHud();
        break;
      }
      case 'house_music_studio':
      case 'house_studio_drums':
      case 'house_studio_booth': {
        this.callbacks.onOpenStation('music_studio', st.id);
        break;
      }
      case 'house_tv': {
        this.callbacks.onOpenStation('tv', st.id);
        break;
      }
      case 'house_fridge': {
        this.callbacks.onOpenStation('fridge', st.id);
        break;
      }
      case 'house_stove': {
        this.callbacks.onOpenStation('stove', st.id);
        break;
      }
      case 'house_bed': {
        this.vitals.health = this.vitals.maxHealth;
        this.vitals.stamina = this.vitals.maxStamina;
        this.vitals.temperatureC = 37.0;
        this.dayCount += 1;
        this.stats.daysSurvived = this.dayCount;
        this.timeOfDay = 0.28;
        this.lastIsNight = false;
        this.toast(`Slept soundly in Hilltop House until Day ${this.dayCount} morning!`, 'discovery');
        this.emitHud();
        break;
      }
      case 'house_sink': {
        this.vitals.thirst = Math.min(this.vitals.maxThirst, this.vitals.thirst + 45);
        this.stats.freshWaterDrunk += 1;
        this.sound.playDrink();
        const dirtyQty = this.getItemCount('dirty_water_bottle');
        if (dirtyQty > 0) {
          this.removeItem('dirty_water_bottle', dirtyQty);
          this.addItem('filtered_water_bottle', dirtyQty, false);
          this.toast('Drank clean tap water & refilled your bottle!', 'craft', 'filtered_water_bottle', dirtyQty);
        } else {
          this.toast('Drank fresh tap water at the sink (+45 Thirst)', 'info');
        }
        this.emitHud();
        break;
      }
      case 'house_shower': {
        this.vitals.stamina = this.vitals.maxStamina;
        this.vitals.health = Math.min(this.vitals.maxHealth, this.vitals.health + 25);
        this.vitals.temperatureC = 37.1;
        this.sound.playWashBottle();
        this.spawnParticles(st.x, st.y + 1.5, st.z, 0x7dd3fc, 14);
        this.toast('Hot shower refreshed Health, Stamina & Warmth!', 'craft');
        this.emitHud();
        break;
      }
    }
  }

  private handleShipwreckInteraction(near: NearbyInteraction): void {
    if (near.id.startsWith('shipwreck_chest_')) {
      const chestId = near.id.replace('shipwreck_chest_', '');
      const chest = this.shipwreckChests.find((c) => c.id === chestId);
      if (!chest) return;

      if (!chest.opened) {
        chest.opened = true;
        // Animate lid open
        chest.lidGroup.rotation.x = -Math.PI * 0.45;
        // Fade aura beacon
        if (chest.glowMesh && chest.glowMesh.material) {
          (chest.glowMesh.material as THREE.MeshBasicMaterial).opacity = 0.12;
          (chest.glowMesh.material as THREE.MeshBasicMaterial).color.setHex(0x10b981);
        }

        this.sound.playWeldSnap();
        this.sound.playCraftSuccess();
        this.spawnParticles(chest.x, chest.y + 0.6, chest.z, 0xeab308, 30);

        chest.lootTable.forEach(([id, qty]) => {
          this.addItem(id, qty, true);
        });

        this.spawnWorldPickupsFromGrants(
          chest.x,
          chest.z,
          chest.lootTable.slice(0, 4),
          0.3,
          0.3,
        );

        const primaryGunId = chest.lootTable[0][0];
        const primaryGunName = ITEMS[primaryGunId]?.name || 'Firearm Arsenal';
        this.toast(
          `UNLOCKED ${chest.name.toUpperCase()}! Acquired ${primaryGunName} & full ammunition loadout.`,
          'discovery',
          primaryGunId,
          1,
        );

        this.stats.shipwreckCratesSearched += 1;
        this.evaluateMissions();
      } else {
        // Bonus ammo on subsequent searches
        this.addItem('ammo', 30, true);
        this.sound.playPickup();
        this.spawnParticles(chest.x, chest.y + 0.4, chest.z, 0x38bdf8, 12);
        this.toast(
          `Salvaged 30x spare cartridges from ${chest.name}!`,
          'gain',
          'ammo',
          30,
        );
      }
      this.actionCooldown = 0.35;
      this.emitHud();
      return;
    }

    if (near.id === 'search_shipwreck') {
      const unopened = this.shipwreckChests.find((c) => !c.opened);
      if (unopened) {
        this.handleShipwreckInteraction({
          ...near,
          id: `shipwreck_chest_${unopened.id}`,
        });
        return;
      }

      this.addItem('ammo', 40, true);
      this.sound.playPickup();
      this.toast(
        'Shipwreck fully salvaged! Gathered 40x extra ammunition cartridges.',
        'gain',
        'ammo',
        40,
      );
      this.actionCooldown = 0.35;
      this.emitHud();
      return;
    }
  }

  private handleArmoryChestInteraction(): void {
    const chest = this.armoryChestState;
    if (!chest) return;

    if (!chest.opened) {
      chest.opened = true;
      chest.lidGroup.rotation.x = -Math.PI * 0.45;
      if (chest.glowMesh && chest.glowMesh.material) {
        (chest.glowMesh.material as THREE.MeshBasicMaterial).opacity = 0.14;
        (chest.glowMesh.material as THREE.MeshBasicMaterial).color.setHex(0x10b981);
      }

      this.sound.playWeldSnap();
      this.sound.playCraftSuccess();
      this.spawnParticles(chest.x, chest.y + 0.6, chest.z, 0x10b981, 26);

      chest.lootTable.forEach(([id, qty]) => {
        this.addItem(id, qty, true);
        if (isFirearmItem(id)) {
          const spec = FIREARM_SPECS[id];
          if (spec) this.weaponMagazines.set(id, spec.magSize);
        }
      });

      this.toast(
        'OPENED BASE ARMORY CHEST! Equipped Glock 19, Remington 870, M4A1 & 120x Ammo!',
        'discovery',
        'm4a1',
        1,
      );
    } else {
      this.addItem('ammo', 25, true);
      this.sound.playPickup();
      this.spawnParticles(chest.x, chest.y + 0.4, chest.z, 0x38bdf8, 12);
      this.toast('Resupplied 25x cartridges from Base Armory Chest', 'gain', 'ammo', 25);
    }
    this.actionCooldown = 0.35;
    this.emitHud();
  }

  private handleGarageBenchInteraction(): void {
    const garageVehicles = this.vehicles.filter(
      (v) => Math.hypot(v.x - VEHICLE_GARAGE_POS.x, v.z - VEHICLE_GARAGE_POS.z) <= 18.5,
    );
    let serviced = 0;
    for (const v of garageVehicles) {
      if (v.hp < v.maxHp || v.fuel < 98) {
        v.hp = v.maxHp;
        v.fuel = 100;
        serviced++;
        this.spawnParticles(v.x, v.y + 1.0, v.z, 0x38bdf8, 12);
      }
    }

    if (serviced > 0) {
      this.sound.playWeldSnap();
      this.sound.playCraftSuccess();
      this.toast(
        `Garage Workbench serviced ${serviced} parked vehicle${serviced > 1 ? 's' : ''} (100% Fuel & Armor)`,
        'craft',
      );
      this.actionCooldown = 0.4;
      this.emitHud();
      return;
    }

    this.callbacks.onOpenStation('vehicles', 'garage_bench');
  }

  public triggerPrimaryAction(): void {
    this.sound.unlock();
    if (
      this.mode !== 'playing' ||
      !canProcessGameplayInput(this.masterRuntime) ||
      this.gameOver ||
      this.cinematicActive ||
      this.actionCooldown > 0
    ) {
      return;
    }

    if (this.ridingCoasterId) {
      this.exitCoasterRide();
      this.actionCooldown = 0.4;
      return;
    }

    // 1. HIGHEST PRIORITY: Car Elevator Computer Terminal (hard stop, never cascade to nearby vehicles)
    if (!this.activeVehicleId && this.isNearElevatorTerminal()) {
      this.openUndergroundElevator();
      this.actionCooldown = 0.4;
      return;
    }

    // Prioritize Shipwreck Chests, Base Armory Chest & Vehicle Garage Bench regardless of held tool/gun
    const near = this.nearbyInteraction;
    if (near && near.kind === 'shipwreck') {
      this.handleShipwreckInteraction(near);
      return;
    }
    if (near && near.kind === 'armory_chest') {
      this.handleArmoryChestInteraction();
      return;
    }
    if (near && near.kind === 'garage_bench') {
      this.handleGarageBenchInteraction();
      return;
    }
    if (near && near.kind === 'saturn_rocket') {
      this.openSaturnRocketConsole();
      return;
    }
    if (near && near.kind === 'underground_elevator') {
      this.openUndergroundElevator();
      return;
    }
    if (near && near.kind === 'island_ufo') {
      this.claimIslandUfoLoot();
      return;
    }
    if (
      near &&
      (near.kind === 'house_couch' ||
        near.kind === 'house_bed' ||
        near.kind === 'house_tv' ||
        near.kind === 'house_fridge' ||
        near.kind === 'house_stove' ||
        near.kind === 'house_toilet' ||
        near.kind === 'house_sink' ||
        near.kind === 'house_shower' ||
        near.kind === 'house_music_studio' ||
        near.kind === 'house_studio_drums' ||
        near.kind === 'house_studio_booth')
    ) {
      const st = this.getActiveStations().find((s) => s.id === near.id);
      if (st) {
        this.interactHouseStation(st);
        this.actionCooldown = 0.45;
        return;
      }
    }

    const equippedId = this.getEquippedItemId();
    const equippedDef = equippedId ? ITEMS[equippedId] : null;

    // 1. WEAPON ISOLATION (with smart Sickle/Knife crop harvesting when facing wheat/sugarcane/mature crop)
    if (equippedId && equippedDef && isActiveWeaponItem(equippedId)) {
      if (equippedId === 'hunting_knife') {
        const cropNode = this.findNearestResourceNode(
          3.6,
          (n) => n.kind === 'wheat_patch' || n.kind === 'sugarcane_patch',
        );
        if (cropNode) {
          this.swingTimer = 0.28;
          this.actionCooldown = 0.34;
          this.harvestResourceNode(cropNode.id, equippedDef);
          return;
        }
        const matureCrop = this.plantedCrops.find(
          (c) => c.mature && Math.hypot(c.x - this.playerX, c.z - this.playerZ) < 3.0,
        );
        if (matureCrop) {
          this.swingTimer = 0.28;
          this.actionCooldown = 0.34;
          this.harvestPlantedCrop(matureCrop.id);
          return;
        }
        const creatureNearby = this.creatures.creatures.some(
          (c) =>
            c.alive &&
            c.cycleActive &&
            Math.hypot(c.x - this.playerX, c.z - this.playerZ) <= 4.2 &&
            Math.abs(c.y - this.playerY) <= 3.8,
        );
        if (
          !creatureNearby &&
          (this.getItemCount('dried_raw_meat') > 0 ||
            this.getItemCount('dried_dino_meat') > 0)
        ) {
          this.cutDriedMeatWithKnife();
          return;
        }
      }
      if (isFirearmItem(equippedId)) {
        this.fireGun(equippedId);
        return;
      }
      if (equippedId === 'primitive_bow') {
        if (this.getItemCount('arrows') <= 0) {
          this.toast(
            'Out of Flint Arrows! Craft more at a Crafting Station.',
            'warning',
          );
          this.actionCooldown = 0.5;
          return;
        }
        this.removeItem('arrows', 1);
        this.fireArrow();
        this.sound.playAttack('bow');
        this.swingTimer = 0.25;
        this.actionCooldown = 0.45;
        this.emitHud();
        return;
      }
      this.performMeleeWeaponAttack(equippedId, equippedDef);
      return;
    }

    // 2. HARVESTING TOOLS: Strictly scoped to their own resource type
    if (equippedId === 'sickle' && equippedDef) {
      const matureCrop = this.plantedCrops.find(
        (c) => c.mature && Math.hypot(c.x - this.playerX, c.z - this.playerZ) < 3.2,
      );
      this.swingTimer = 0.26;
      this.actionCooldown = 0.32;
      if (matureCrop) {
        this.harvestPlantedCrop(matureCrop.id);
        return;
      }
      const cropNode = this.findNearestResourceNode(
        3.8,
        (n) =>
          n.kind === 'wheat_patch' ||
          n.kind === 'sugarcane_patch' ||
          n.kind === 'grass_tuft' ||
          n.kind === 'fiber_fern' ||
          n.kind === 'plant_cluster',
      );
      if (cropNode) {
        this.harvestResourceNode(cropNode.id, equippedDef);
      } else {
        this.sound.playAttack('melee');
        this.toast('Face Wheat, Sugarcane, or ripe crops to cut with Sickle', 'info');
      }
      return;
    }

    if (equippedId === 'stone_axe' && equippedDef) {
      const treeNode = this.findNearestResourceNode(4.4, (n) =>
        this.isTreeKind(n.kind) || n.kind === 'branch_pile',
      );
      this.swingTimer = 0.28;
      this.actionCooldown = 0.36;
      if (treeNode) {
        this.harvestResourceNode(treeNode.id, equippedDef);
      } else {
        this.sound.playAttack('melee');
        this.toast('Face a tree to chop with Stone Axe', 'info');
      }
      return;
    }

    if (equippedId === 'stone_pickaxe' && equippedDef) {
      const rockNode = this.findNearestResourceNode(3.8, (n) =>
        this.isRockKind(n.kind),
      );
      this.swingTimer = 0.28;
      this.actionCooldown = 0.36;
      if (rockNode) {
        this.harvestResourceNode(rockNode.id, equippedDef);
      } else {
        const hitBlock = this.findNearestAimedStructuralBlock(3.8);
        if (hitBlock) {
          this.dismantleStructuralBlock(hitBlock.id);
        } else {
          this.sound.playAttack('melee');
          this.toast('Face stone, ore, or built masonry to mine', 'info');
        }
      }
      return;
    }

    if (equippedId === 'excavator_shovel') {
      this.useExcavatorShovel();
      this.swingTimer = 0.28;
      this.actionCooldown = 0.28;
      return;
    }

    if (equippedId === 'powder_keg') {
      this.throwPowderKeg();
      this.swingTimer = 0.26;
      this.actionCooldown = 0.45;
      return;
    }

    if (equippedId === 'water_torrent') {
      this.releaseWaterTorrent();
      this.swingTimer = 0.24;
      this.actionCooldown = 0.45;
      return;
    }

    // 2B. SEEDS ON HUD BAR: Plant directly onto tilled soil or dry ground!
    if (equippedId && isSeedItem(equippedId)) {
      this.plantSeed(equippedId);
      this.actionCooldown = 0.35;
      return;
    }

    // 3. SPECIALIZED EQUIPMENT: Independently scoped to their own job
    if (equippedId === 'fishing_rod') {
      this.castFishingRod();
      return;
    }

    if (equippedId === 'lasso' && equippedDef) {
      this.performMeleeWeaponAttack('lasso', equippedDef);
      return;
    }

    if (equippedId === 'dirty_water_bottle') {
      this.cleanAndFilterWaterBottle();
      return;
    }

    if (
      equippedId === 'raw_meat' ||
      equippedId === 'dino_meat' ||
      equippedId === 'soap'
    ) {
      this.washAndScrubMeat(equippedId === 'soap' ? undefined : equippedId);
      return;
    }

    if (equippedId === 'washed_meat' || equippedId === 'washed_dino_meat') {
      const nearRack = this.structures.find(
        (s) =>
          s.type === 'drying_rack' &&
          Math.hypot(s.x - this.playerX, s.z - this.playerZ) < 4.5,
      );
      if (nearRack) {
        this.callbacks.onOpenStation('drying_rack', nearRack.id);
      } else {
        this.toast(
          'Bring Washed Meat to a Meat Drying Rack (next to the premade shelter or by Azure Lake) to dry it!',
          'info',
        );
      }
      this.actionCooldown = 0.45;
      return;
    }

    if (equippedId === 'dried_raw_meat' || equippedId === 'dried_dino_meat') {
      this.cutDriedMeatWithKnife(equippedId);
      return;
    }

    // 4. FOOD & FILTERED WATER: Only eats or drinks that item
    if (equippedDef && equippedDef.category === 'food') {
      this.useOrEquipItem(equippedDef.id);
      this.actionCooldown = 0.35;
      return;
    }

    // 5A. ENGINEERED STRUCTURAL PIECE: Snaps cleanly with live stress solver
    if (equippedDef && equippedDef.structuralKind) {
      this.placeStructuralBlock(equippedDef.id);
      this.actionCooldown = 0.28;
      return;
    }

    // 5B. KINETIC POWER MACHINERY: Places physical shafts, gears, belts, pipes, boilers & assemblers
    if (equippedDef && equippedDef.kineticKind) {
      this.placeKineticNode(equippedDef.id);
      this.actionCooldown = 0.28;
      return;
    }

    // 5C. MODULAR VEHICLE KIT: Opens the Modular Vehicle Designer Bay
    if (equippedId === 'vehicle_chassis_kit') {
      this.callbacks.onOpenStation('vehicles');
      this.actionCooldown = 0.35;
      return;
    }

    // 5. PLACEABLE STRUCTURE: Only builds that structure
    if (equippedDef && equippedDef.structureType) {
      this.placeStructureFromInventory(equippedDef.id);
      this.actionCooldown = 0.45;
      return;
    }

    // 6. AMMO SUPPLY: Strictly informational reminder (never swings or harvests)
    if (equippedId && isAmmoItem(equippedId)) {
      const qty = this.getItemCount(equippedId);
      this.toast(
        equippedId === 'ammo'
          ? `Gun Cartridges (${qty} rds) — select Survival Gun to fire`
          : `Flint Arrows (${qty}) — select Primitive Bow to shoot`,
        'info',
        equippedId,
        qty,
      );
      this.actionCooldown = 0.45;
      return;
    }

    // 7. RAW MATERIAL / RESOURCE: Places 1 down (or mills/uses wheat/sugarcane info)
    if (equippedDef && equippedDef.category === 'resource') {
      this.placeItemInWorld(equippedDef.id);
      this.actionCooldown = 0.35;
      return;
    }

    // 8. BARE HANDS (empty slot or Hands mode): Handles world interactions cleanly
    if (near) {
      if (near.kind === 'shipwreck') {
        this.handleShipwreckInteraction(near);
        return;
      }
      if (near.kind === 'mount') {
        if (this.mountedCreatureId) {
          this.dismountCreature();
        } else {
          const c = this.creatures.creatures.find((x) => x.id === near.id);
          if (c) this.mountCreature(c);
        }
        this.actionCooldown = 0.45;
        return;
      }
      if (near.kind === 'tame') {
        const c = this.creatures.creatures.find((x) => x.id === near.id);
        if (c) {
          if (
            this.removeItem('raw_meat', 1) ||
            this.removeItem('roasted_meat', 1) ||
            this.removeItem('dino_meat', 1) ||
            this.removeItem('berries', 2) ||
            this.removeItem('wheat', 2)
          ) {
            c.tamed = true;
            c.hp = c.maxHp;
            this.toast(
              `Tamed ${c.displayNameOverride || c.spec.displayName}! Companion will follow & guard you. Press E to ride.`,
              'discovery',
            );
            this.sound.playWeldSnap();
          } else {
            this.toast('Need food (Meat, Berries, or Wheat) to tame creature', 'warning');
          }
        }
        this.actionCooldown = 0.45;
        return;
      }
      if (near.kind === 'timeshift_sundial') {
        this.timeOfDay = (this.timeOfDay + 0.15) % 1.0;
        this.sound.playKineticGearTick();
        this.toast(`Time-Shift Sundial rotated sky to ${formatTimePhase(this.timeOfDay)}`, 'discovery');
        this.actionCooldown = 0.45;
        this.emitHud();
        return;
      }
      if (near.kind === 'gravity_monolith') {
        this.playerVelY = 18.5;
        this.sound.playSteamHiss();
        this.spawnParticles(this.playerX, this.playerY + 0.5, this.playerZ, 0x06b6d4, 14);
        this.toast('Anti-gravity launch zone engaged! Propelled skyward.', 'discovery');
        this.actionCooldown = 0.5;
        this.emitHud();
        return;
      }
      if (near.kind === 'modular_vehicle') {
        this.enterVehicle(near.id);
        this.actionCooldown = 0.45;
        return;
      }
      if (near.kind === 'kinetic_node') {
        this.interactKineticNode(near.id);
        this.actionCooldown = 0.38;
        return;
      }
      if (near.id === 'ship_navigator_npc') {
        this.callbacks.onOpenStation('navigator_companion', 'ship_navigator_npc');
        this.actionCooldown = 0.35;
        return;
      }
      if (near.id === 'navigator_dropped_gun') {
        if (this.navigatorCompanion?.pickupDroppedGun()) {
          this.addItem('gun', 1, false);
          this.addItem('ammo', 24, false);
          this.sound.playPickup();
          this.toast(
            `Picked up ${this.navigatorCompanion.getName()}'s Survival Gun & 24 Ammo from the island floor.`,
            'discovery',
          );
          this.emitHud();
        }
        this.actionCooldown = 0.35;
        return;
      }
      if (near.kind === 'farmer') {
        this.callbacks.onOpenStation('farmer', near.id || 'farmer_npc');
        return;
      }
      if (near.kind === 'planted_crop') {
        const crop = this.plantedCrops.find((c) => c.id === near.id);
        if (crop) {
          if (crop.mature) {
            this.harvestPlantedCrop(crop.id);
          } else {
            crop.watered = true;
            this.rebuildCropMesh(crop);
            this.spawnParticles(crop.x, crop.y + 0.25, crop.z, 0x38bdf8, 8);
            this.sound.playWashBottle();
            this.toast(
              `Watered ${ITEMS[crop.produceItemId].name} (${Math.round(crop.growthProgress * 100)}% grown)`,
              'info',
            );
            this.emitHud();
          }
          this.actionCooldown = 0.4;
          return;
        }
      }
      if (
        near.kind === 'house_couch' ||
        near.kind === 'house_bed' ||
        near.kind === 'house_tv' ||
        near.kind === 'house_fridge' ||
        near.kind === 'house_stove' ||
        near.kind === 'house_toilet' ||
        near.kind === 'house_sink' ||
        near.kind === 'house_shower' ||
        near.kind === 'house_music_studio' ||
        near.kind === 'house_studio_drums' ||
        near.kind === 'house_studio_booth'
      ) {
        const st = this.getActiveStations().find((s) => s.id === near.id);
        if (st) {
          this.interactHouseStation(st);
          this.actionCooldown = 0.45;
          return;
        }
      }
      if (near.kind === 'coaster_station') {
        this.callbacks.onOpenStation('coaster', near.structureId);
        return;
      }
      if (near.kind === 'campfire' || near.kind === 'cooking_station') {
        this.callbacks.onOpenStation('cooking', near.structureId);
        return;
      }
      if (near.kind === 'crafting_table') {
        this.callbacks.onOpenStation('crafting', near.structureId);
        return;
      }
      if (near.kind === 'storage_chest') {
        this.callbacks.onOpenStation('chest', near.structureId);
        return;
      }
      if (near.kind === 'smart_tv') {
        this.callbacks.onOpenStation('tv', near.structureId);
        return;
      }
      if (near.kind === 'drying_rack') {
        this.callbacks.onOpenStation('drying_rack', near.structureId);
        return;
      }
      if (near.kind === 'auto_turret') {
        this.sound.playWeldSnap();
        this.toast(
          'Defense Auto-Turret active: Perimeter scanned for hostile raptors & predators',
          'discovery',
        );
        this.actionCooldown = 0.5;
        return;
      }
      if (near.kind === 'sleeping_area' || near.kind === 'basic_shelter') {
        this.restAtSleepingArea();
        this.actionCooldown = 0.8;
        return;
      }
      if (near.kind === 'water') {
        this.vitals.thirst = Math.min(
          this.vitals.maxThirst,
          this.vitals.thirst + 42,
        );
        this.stats.freshWaterDrunk += 1;
        this.drinkTimer = 0.85;
        this.sound.playDrink();
        this.toast('Drank fresh river/lake water (+42 Thirst)', 'info');
        this.actionCooldown = 0.6;
        this.evaluateMissions();
        this.emitHud();
        return;
      }
      if (near.kind === 'wash_meat') {
        this.washAndScrubMeat();
        return;
      }
      if (near.kind === 'clean_bottle') {
        this.cleanAndFilterWaterBottle();
        return;
      }
      if (near.kind === 'dolphin' && near.creatureId) {
        const d = this.creatures.creatures.find(
          (c) => c.id === near.creatureId,
        );
        if (d) {
          this.creatures.triggerDolphinLeap(d);
          this.sound.playCreatureCall('dolphin', 1.2);
          this.stats.dolphinsBefriended += 1;
          this.toast(
            'The Coastal Dolphin leaps playfully beside you!',
            'discovery',
          );
          this.actionCooldown = 0.8;
          this.emitHud();
          return;
        }
      }
      if (near.kind === 'footprint') {
        this.stats.footprintsInspected += 1;
        this.toast(
          `Tracked ${near.sublabel || 'Wildlife'} prints heading inland`,
          'discovery',
        );
        this.actionCooldown = 0.5;
        this.emitHud();
        return;
      }
      if (near.kind === 'expedition_journal') {
        this.toast(
          'Expedition Log: "Rich metal ore in the northern cavern. Apex predator sighted near the highland ridge."',
          'discovery',
        );
        this.actionCooldown = 1.0;
        return;
      }
      if (near.kind === 'carcass') {
        this.prepareCarcass(near.id);
        this.swingTimer = 0.28;
        this.actionCooldown = 0.32;
        return;
      }
      if (near.kind === 'pickup') {
        this.collectPickup(near.id);
        this.swingTimer = 0.18;
        this.actionCooldown = 0.22;
        return;
      }
      if (near.kind === 'resource') {
        this.harvestResourceNode(near.id, null);
        this.swingTimer = 0.28;
        this.actionCooldown = 0.36;
        return;
      }
    }

    this.swingTimer = 0.25;
    this.actionCooldown = 0.35;
    this.sound.playAttack('melee');
  }

  private findNearestResourceNode(
    maxRange: number,
    predicate: (n: ResourceNodeState) => boolean,
  ): ResourceNodeState | null {
    if (this.worldType === 'flat') return null;
    const fwdX = -Math.sin(this.camYaw);
    const fwdZ = -Math.cos(this.camYaw);
    let best: ResourceNodeState | null = null;
    let bestScore = Infinity;
    const scanMax = Math.max(maxRange, 4.4);
    const baseCx = Math.floor(this.playerX / 16);
    const baseCz = Math.floor(this.playerZ / 16);
    const cellRadius = Math.ceil((scanMax + 2) / 16);

    for (let gdx = -cellRadius; gdx <= cellRadius; gdx++) {
      for (let gdz = -cellRadius; gdz <= cellRadius; gdz++) {
        const key = (baseCx + gdx + 2048) * 4096 + (baseCz + gdz + 2048);
        const bucket = this.resourceNodeGrid.get(key);
        if (!bucket) continue;
        for (let i = 0; i < bucket.length; i++) {
          const n = bucket[i];
          if (n.hp <= 0 || n.felled || !predicate(n)) continue;
          const dx = n.x - this.playerX;
          const dz = n.z - this.playerZ;
          const effRange = this.isTreeKind(n.kind) ? scanMax : maxRange;
          const distSq = dx * dx + dz * dz;
          if (distSq > effRange * effRange) continue;
          const d = Math.sqrt(distSq);

          const dot = d > 0.001 ? (dx * fwdX + dz * fwdZ) / d : 1;
          if (dot < 0.05 && d > 1.4) continue;

          // Strongly favor the resource aligned with the player's crosshair / facing vector
          const alignWeight = 1.28 - 0.68 * Math.max(0, dot);
          const score = d * alignWeight;
          if (score < bestScore) {
            bestScore = score;
            best = n;
          }
        }
      }
    }
    return best;
  }

  private castFishingRod(): void {
    const fwdX = -Math.sin(this.camYaw);
    const fwdZ = -Math.cos(this.camYaw);
    const aheadX = this.playerX + fwdX * 3.8;
    const aheadZ = this.playerZ + fwdZ * 3.8;
    const aheadH = getTerrainHeight(aheadX, aheadZ);
    const waterY = getWaterLevelAt(aheadX, aheadZ);
    if (aheadH < waterY || this.isSwimming) {
      this.sound.playAttack('cast');
      this.swingTimer = 0.35;
      this.actionCooldown = 1.1;
      this.spawnParticles(aheadX, waterY + 0.1, aheadZ, 0x7dd3fc, 8);
      const zone = isFreshwaterAt(aheadX, aheadZ)
        ? Math.hypot(aheadX - LAKE_CENTER.x, aheadZ - LAKE_CENTER.z) <
          LAKE_CENTER.radius + 4
          ? 'freshwater_lake'
          : 'freshwater_river'
        : 'coastal_shallows';
      const fish = rollStage1FishCatch(zone);
      if (fish && fish.rewardItemId) {
        this.stats.fishCaught += 1;
        this.addItem(fish.rewardItemId, 1, false);
        this.toast(`Caught ${fish.name}!`, 'gain');
      }
    } else {
      this.toast(
        'Face river, lake, or ocean water to cast your Fishing Rod',
        'info',
      );
      this.actionCooldown = 0.5;
    }
  }

  private applyCreatureZoneWeaponHit(
    c: ActiveCreature,
    zone: BodyZone,
    weaponClass: WeaponMaterialClass,
    baseDamage: number,
    isGapSlip: boolean,
    hitX: number,
    hitY: number,
    hitZ: number,
    sourceLabel: string,
    extraOptions?: { snareSeconds?: number; stunSeconds?: number; knockback?: number },
  ): void {
    const dmgMult = this.modSystem?.tweaks.damageMultiplier ?? 1;
    const resolution = resolveWeaponZoneHit(
      weaponClass,
      Math.round(baseDamage * dmgMult),
      zone,
      c.zoneArmor,
      isGapSlip,
      c.blindTimer > 0 || c.stunTimer > 0,
    );
    const totalStun = Math.max(
      resolution.stunSeconds,
      extraOptions?.stunSeconds ?? 0,
    );
    const totalKb = Math.max(
      resolution.knockback,
      extraOptions?.knockback ?? 0,
    );

    const res = this.creatures.applyZoneArmorDamage(
      c,
      zone,
      resolution.hpDamage,
      resolution.armorDamage,
      this.playerX,
      this.playerZ,
      {
        snareSeconds: extraOptions?.snareSeconds,
        stunSeconds: totalStun > 0 ? totalStun : undefined,
        knockback: totalKb,
      },
    );
    this.p2p?.broadcast({
      type: 'creature_damage',
      creatureId: c.id,
      damage: resolution.hpDamage,
      fromX: this.playerX,
      fromZ: this.playerZ,
    });

    const name = c.displayNameOverride || c.spec.displayName;
    if (res.shatteredZone) {
      this.sound.playArmorShatter();
      this.spawnParticles(hitX, hitY, hitZ, 0x78716c, 16);
      this.spawnParticles(hitX, hitY + 0.3, hitZ, 0xe7e5e4, 8);
      this.cameraShakeTimer = Math.max(this.cameraShakeTimer, 0.22);
      this.toast(
        `${sourceLabel} shattered ${name}'s ${res.shatteredTier} ${res.shatteredZone} armor!`,
        'craft',
      );
    } else if (resolution.deflected) {
      this.sound.playArmorDeflect();
      this.spawnParticles(hitX, hitY, hitZ, 0xfef08a, 10);
      this.toast(
        `Deflected off ${name}'s ${resolution.armorTierBefore} ${zone} (${resolution.hpDamage} DMG) — aim gaps or use Warhammer!`,
        'warning',
      );
    } else if (resolution.gapSlipCrit || resolution.headshotCrit) {
      this.sound.playBladeGapCrit();
      this.spawnParticles(hitX, hitY, hitZ, 0xef4444, 14);
      this.toast(`${resolution.feedbackLabel} on ${name} (${resolution.hpDamage} DMG)`, 'gain');
    } else {
      this.spawnParticles(hitX, hitY, hitZ, 0xef4444, 8);
    }

    if (res.killed) {
      this.handleCreatureDefeated(c, res.drops, sourceLabel);
    }
  }

  private handleStructureCleared(site: StructureSite): void {
    this.coins += 120;
    this.addItem('emerald', 2, false);
    this.addItem('totem_of_undying', 1, false);
    const groundY = getTerrainHeight(site.x, site.z);
    this.spawnParticles(site.x, groundY + 1.5, site.z, 0xfbbf24, 24);
    this.spawnParticles(site.x, groundY + 1.8, site.z, 0x10b981, 18);
    this.sound.playTotemUndying();
    this.toast(
      `${site.name} Liberated! +120 Coins, +2 Emeralds & Totem of Undying!`,
      'discovery',
    );
    this.emitHud();
  }

  private damageStructureEntity(
    entity: ActiveStructureEntity,
    rawDamage: number,
    sourceLabel: string,
    hitX: number,
    hitY: number,
    hitZ: number,
  ): void {
    const dmgMult = this.modSystem?.tweaks.damageMultiplier ?? 1;
    const dmg = Math.max(1, Math.round(rawDamage * dmgMult));
    const res = this.structureManager.damageEntity(entity, dmg, {
      onStructureCleared: (site) => this.handleStructureCleared(site),
    });
    this.spawnParticles(hitX, hitY, hitZ, 0xef4444, res.killed ? 14 : 8);
    if (res.killed) {
      this.stats.animalsHunted += 1;
      const granted: string[] = [];
      for (const d of res.drops) {
        if (d.quantity <= 0) continue;
        this.addItem(d.itemId, d.quantity, false);
        granted.push(`${d.quantity}× ${ITEMS[d.itemId].name}`);
      }
      this.spawnParticles(entity.x, entity.y + 1.0, entity.z, 0xfbbf24, 16);
      this.spawnParticles(entity.x, entity.y + 1.2, entity.z, 0x10b981, 12);
      const dropText = granted.length > 0 ? ` Looted ${granted.join(', ')}!` : '';
      this.toast(`${sourceLabel}: ${entity.displayName} defeated!${dropText}`, 'discovery');
      this.emitHud();
    }
  }

  private handleCreatureDefeated(
    c: ActiveCreature,
    drops: { itemId: ItemId; quantity: number }[],
    sourceLabel: string,
  ): void {
    const name = c.displayNameOverride || c.spec.displayName;
    this.stats.animalsHunted += 1;
    const isDino = this.isDinosaurSpecies(c.species);
    if (isDino) {
      this.stats.dinosaursEncountered += 1;
    }

    const isIllager =
      c.species === 'vex' ||
      c.species === 'evoker' ||
      c.species === 'pillager' ||
      c.species === 'witch';
    if (isIllager) {
      const granted: string[] = [];
      for (const d of drops) {
        if (d.quantity <= 0) continue;
        this.addItem(d.itemId, d.quantity, false);
        granted.push(`${d.quantity}× ${ITEMS[d.itemId].name}`);
      }
      this.spawnParticles(c.x, c.y + 0.9, c.z, 0xfbbf24, 16);
      this.spawnParticles(c.x, c.y + 1.1, c.z, 0x10b981, 12);
      const dropText = granted.length > 0 ? ` Looted ${granted.join(', ')}!` : '';
      this.toast(`${sourceLabel}: ${name} defeated!${dropText}`, 'discovery');
      this.emitHud();
      return;
    }

    this.spawnCarcass(
      c.species,
      name,
      isDino,
      c.x,
      c.z,
      c.yaw,
      drops,
      240,
      undefined,
      1.6,
      c.y,
    );
    this.toast(
      `${sourceLabel}: ${name} downed! Switch to Hands (0) to collect meat.`,
      'gain',
    );
  }

  private checkAndTriggerTotemOfUndying(): boolean {
    if (this.gameOver) return false;
    if (this.vitals.health > 25) return false;
    if (this.getItemCount('totem_of_undying') <= 0) return false;

    this.removeItem('totem_of_undying', 1);
    this.vitals.health = Math.min(this.vitals.maxHealth, Math.max(this.vitals.health, 38));
    this.totemRegenTimer = 6.5;
    this.totemFlashTimer = 1.65;
    this.hurtFlash = 0;
    this.sound.playTotemUndying();
    this.spawnParticles(this.playerX, this.playerY + 1.1, this.playerZ, 0xfbbf24, 24);
    this.spawnParticles(this.playerX, this.playerY + 1.1, this.playerZ, 0x10b981, 16);
    this.toast('Totem of Undying Activated! Regenerating Health!', 'discovery');
    this.emitHud();
    return true;
  }

  private applyPlayerDamage(rawAmount: number, sourceName: string): void {
    const creativeNoNeeds =
      this.worldType === 'flat' ||
      this.gameMode === 'sandbox' ||
      this.vitals.maxHealth >= 9000;
    if (creativeNoNeeds || this.gameOver || rawAmount <= 0) return;

    let dmg = rawAmount;
    const activeBuff = this.grandFinalePlayer.activeBuff;
    if (activeBuff && activeBuff.ghostDefense > 0 && performance.now() < activeBuff.expiresAt) {
      dmg = Math.max(1, Math.round(dmg * (1 - activeBuff.ghostDefense)));
    }
    if (this.crystalArmorHp > 0) {
      const absorbed = Math.min(this.crystalArmorHp, Math.round(dmg * 0.55));
      this.crystalArmorHp = Math.max(0, this.crystalArmorHp - absorbed);
      dmg = Math.max(1, dmg - absorbed);
    }

    this.vitals.health = Math.max(0, this.vitals.health - dmg);
    this.hurtFlash = 0.42;
    this.sound.playHurt();
    this.toast(`${sourceName} hit you (-${dmg} HP)!`, 'warning');

    if (this.vitals.health <= 25) {
      this.checkAndTriggerTotemOfUndying();
    }

    if (this.vitals.health <= 0) {
      this.gameOver = true;
      this.gameOverReason = `Defeated by ${sourceName}`;
    }
    this.emitHud();
  }

  private performMeleeWeaponAttack(
    weaponId: ItemId,
    weaponDef: ItemDefinition,
  ): void {
    this.swingTimer = weaponId === 'stone_warhammer' ? 0.38 : 0.3;
    this.actionCooldown = weaponId === 'stone_warhammer' ? 0.52 : 0.4;
    const range = weaponDef.attackRange || 2.8;
    const damage = weaponDef.attackDamage || 14;
    const weaponClass: WeaponMaterialClass = weaponDef.weaponClass || 'blunt_light';
    this.sound.playAttack(weaponId === 'rope_whip' ? 'whip' : 'melee');

    _probeOrigin.set(this.playerX, this.playerY + this.currentEyeHeight, this.playerZ);
    _probeEuler.set(this.camPitch, this.camYaw, 0, 'YXZ');
    _probeDir.set(0, 0, -1).applyEuler(_probeEuler).normalize();

    // Heavy overhead Warhammer jump/wall-run strike can collapse cave stalactite fissures!
    if (weaponClass === 'blunt_heavy' && this.world?.caveCeilings) {
      for (const cc of this.world.caveCeilings) {
        if (cc.collapsed || cc.falling) continue;
        const d = Math.hypot(cc.x - _probeOrigin.x, cc.y - _probeOrigin.y, cc.z - _probeOrigin.z);
        if (d <= range + 2.2) {
          this.damageCaveCeiling(cc, 40);
          return;
        }
      }
    }

    // 1. Dynamic multi-part hitbox raycast along aiming reticle
    const zoneHit = raycastCreatureZone(
      _probeOrigin,
      _probeDir,
      range + 1.1,
      this.creatures.creatures,
      0.22,
    );
    const structHit =
      this.worldType === 'island' && this.currentDimension === 'overworld'
        ? this.structureManager.raycastEntities(
            _probeOrigin,
            _probeDir,
            range + 1.1,
            false,
          )
        : null;

    if (structHit && (!zoneHit || structHit.distance < zoneHit.distance)) {
      this.damageStructureEntity(
        structHit.entity,
        damage,
        weaponDef.name,
        structHit.hitPoint.x,
        structHit.hitPoint.y,
        structHit.hitPoint.z,
      );
      return;
    }

    if (zoneHit) {
      const target = this.creatures.creatures.find((c) => c.id === zoneHit.creatureId);
      if (target) {
        this.applyCreatureZoneWeaponHit(
          target,
          zoneHit.zone,
          weaponClass,
          damage,
          zoneHit.isGapSlip,
          zoneHit.hitPoint.x,
          zoneHit.hitPoint.y,
          zoneHit.hitPoint.z,
          weaponDef.name,
          {
            snareSeconds: weaponId === 'lasso' ? 6 : undefined,
            stunSeconds: weaponId === 'rope_whip' ? 2.5 : undefined,
            knockback: weaponId === 'rope_whip' ? 2.2 : undefined,
          },
        );
        return;
      }
    }

    // 2. Fallback close-quarters chest/limb arc check if beside target
    for (const c of this.creatures.creatures) {
      if (!c.alive || !c.cycleActive) continue;
      const dx = c.x - this.playerX;
      const dy = c.y - this.playerY;
      const dz = c.z - this.playerZ;
      const dist = Math.hypot(dx, dz);
      if (dist <= range + 0.9 && Math.abs(dy) <= 3.8) {
        const fallbackZone: BodyZone = weaponClass === 'blade' ? 'limb' : 'chest';
        this.applyCreatureZoneWeaponHit(
          c,
          fallbackZone,
          weaponClass,
          damage,
          weaponClass === 'blade',
          c.x,
          c.y + 1.0,
          c.z,
          weaponDef.name,
          {
            snareSeconds: weaponId === 'lasso' ? 6 : undefined,
            stunSeconds: weaponId === 'rope_whip' ? 2.5 : undefined,
            knockback: weaponId === 'rope_whip' ? 2.2 : undefined,
          },
        );
        return;
      }
    }

    if (this.worldType === 'island' && this.currentDimension === 'overworld') {
      for (const site of this.structureManager.structures) {
        if (!site.isAwake) continue;
        for (const entity of site.activeEntities) {
          if (entity.type === 'villager' || entity.hp <= 0) continue;
          const dist = Math.hypot(entity.x - this.playerX, entity.z - this.playerZ);
          if (dist <= range + 0.9 && Math.abs(entity.y - this.playerY) <= 3.6) {
            this.damageStructureEntity(
              entity,
              damage,
              weaponDef.name,
              entity.x,
              entity.y + 1.0,
              entity.z,
            );
            return;
          }
        }
      }
    }
  }

  private fireArrow(): void {
    _probeEuler.set(this.camPitch, this.camYaw, 0, 'YXZ');
    _vec3A.set(0, 0, -1).applyEuler(_probeEuler);
    const sx = this.playerX + _vec3A.x * 0.6;
    const sy = this.playerY + this.currentEyeHeight - 0.1;
    const sz = this.playerZ + _vec3A.z * 0.6;
    const mesh =
      this.arrowMeshPool.pop() ?? new THREE.Mesh(this.arrowGeo, this.arrowMat);
    mesh.rotation.set(Math.PI / 2, 0, 0);
    mesh.position.set(sx, sy, sz);
    mesh.visible = true;
    this.scene.add(mesh);

    const entry = this.arrowEntryPool.pop();
    if (entry) {
      entry.mesh = mesh;
      entry.pos.set(sx, sy, sz);
      entry.vel.set(_vec3A.x * 28, _vec3A.y * 28 + 2.2, _vec3A.z * 28);
      entry.life = 2.5;
      entry.damage = 38;
      entry.isBullet = false;
      this.arrows.push(entry);
    } else {
      this.arrows.push({
        mesh,
        pos: new THREE.Vector3(sx, sy, sz),
        vel: new THREE.Vector3(
          _vec3A.x * 28,
          _vec3A.y * 28 + 2.2,
          _vec3A.z * 28,
        ),
        life: 2.5,
        damage: 38,
      });
    }
  }

  private cancelReload(): void {
    this.reloadingItemId = null;
    this.reloadTimer = 0;
    this.reloadDuration = 0;
    this.reloadMode = null;
  }

  public reloadEquippedWeapon(): void {
    if (this.mode !== 'playing' || this.gameOver || this.cinematicActive) return;
    const eqId = this.getEquippedItemId();
    if (!eqId || !isFirearmItem(eqId)) return;
    const spec = FIREARM_SPECS[eqId];
    if (!spec) return;

    if (this.reloadingItemId === eqId) return;

    const currentMag = this.weaponMagazines.get(eqId) ?? spec.magSize;
    if (currentMag >= spec.magSize) {
      this.toast(`${ITEMS[eqId].name} magazine is already full.`, 'info');
      return;
    }

    const reserve = this.getItemCount('ammo');
    if (reserve <= 0) {
      this.sound.playDryFire();
      this.toast(
        'No reserve ammunition! Craft Ammo or loot the Base Armory / Shipwreck.',
        'warning',
      );
      return;
    }

    this.reloadingItemId = eqId;
    this.reloadMode = spec.reloadMode;
    this.reloadDuration = spec.reloadTime;
    this.reloadTimer = spec.reloadTime;
    this.sound.playReloadClick(spec.reloadMode === 'single');
    this.emitHud();
  }

  private tickReload(dt: number): void {
    if (!this.reloadingItemId) return;
    if (this.mode !== 'playing' || this.gameOver || this.cinematicActive) {
      this.cancelReload();
      return;
    }

    const eqId = this.getEquippedItemId();
    if (eqId !== this.reloadingItemId) {
      this.cancelReload();
      this.emitHud();
      return;
    }

    const spec = FIREARM_SPECS[this.reloadingItemId];
    if (!spec) {
      this.cancelReload();
      return;
    }

    this.reloadTimer -= dt;
    if (this.reloadTimer > 0) return;

    const currentMag = this.weaponMagazines.get(this.reloadingItemId) ?? 0;
    const reserve = this.getItemCount('ammo');
    if (reserve <= 0 || currentMag >= spec.magSize) {
      this.cancelReload();
      this.emitHud();
      return;
    }

    if (spec.reloadMode === 'single') {
      this.removeItem('ammo', 1);
      const nextMag = currentMag + 1;
      this.weaponMagazines.set(this.reloadingItemId, nextMag);
      this.sound.playReloadClick(true);

      if (nextMag < spec.magSize && this.getItemCount('ammo') > 0) {
        this.reloadDuration = spec.reloadTime;
        this.reloadTimer = spec.reloadTime;
      } else {
        this.cancelReload();
      }
      this.emitHud();
      return;
    }

    const needed = Math.min(spec.magSize - currentMag, reserve);
    if (needed > 0) {
      this.removeItem('ammo', needed);
      this.weaponMagazines.set(this.reloadingItemId, currentMag + needed);
      this.sound.playReloadClick(false);
    }
    this.cancelReload();
    this.emitHud();
  }

  private fireGun(weaponId: ItemId = 'gun'): void {
    const spec = FIREARM_SPECS[weaponId] ?? FIREARM_SPECS['gun'];
    if (!spec) return;
    if (!this.weaponMagazines.has(weaponId)) {
      this.weaponMagazines.set(weaponId, spec.magSize);
    }
    const magAmmo = this.weaponMagazines.get(weaponId) ?? 0;

    if (this.reloadingItemId === weaponId) {
      if (this.reloadMode === 'single' && magAmmo > 0) {
        this.cancelReload();
      } else {
        return;
      }
    }

    if (magAmmo <= 0) {
      this.sound.playDryFire();
      this.actionCooldown = 0.22;
      if (this.getItemCount('ammo') > 0) {
        this.reloadEquippedWeapon();
      } else {
        this.toast(
          'Empty! Out of reserve Ammo — loot Base Armory, Shipwreck, or Craft Ammo.',
          'warning',
        );
      }
      return;
    }

    this.weaponMagazines.set(weaponId, magAmmo - 1);
    this.sound.playGunshot(spec.soundProfile);
    if (this.currentDimension === 'overworld') {
      this.creatures.alertGunshot(
        this.playerX,
        this.playerZ,
        GUNSHOT_FLEE_DISTANCE,
      );
    }
    this.recoilTimer = Math.min(0.28, Math.max(0.14, spec.fireRate * 0.85));
    this.actionCooldown = spec.fireRate;
    this.swingTimer = Math.min(0.24, Math.max(0.14, spec.fireRate));

    // Camera recoil kick (upward pitch with smooth spring recovery)
    this.camPitch = Math.min(1.2, this.camPitch + spec.recoil);

    _probeEuler.set(this.camPitch, this.camYaw, 0, 'YXZ');
    _vec3A.set(0, 0, -1).applyEuler(_probeEuler); // baseDir
    _probeEuler.set(0, this.camYaw, 0, 'YXZ');
    _vec3B.set(1, 0, 0).applyEuler(_probeEuler); // right
    _vec3C.crossVectors(_vec3B, _vec3A).normalize(); // up

    const barrelScale =
      spec.soundProfile === 'sniper' || spec.soundProfile === 'musket'
        ? 0.96
        : spec.soundProfile === 'rifle' ||
            spec.soundProfile === 'shotgun' ||
            spec.soundProfile === 'lmg'
          ? 0.86
          : 0.72;

    const sx = this.playerX + _vec3A.x * barrelScale + _vec3B.x * 0.18;
    const sy = this.playerY + this.currentEyeHeight - 0.14 + _vec3A.y * barrelScale;
    const sz = this.playerZ + _vec3A.z * barrelScale + _vec3B.z * 0.18;

    // Pooled muzzle flash + brass shell casing + pooled instanced burst
    if (this.muzzleFlashPool.length > 0) {
      const mf = this.muzzleFlashPool[this.muzzleFlashIdx % this.muzzleFlashPool.length];
      this.muzzleFlashIdx += 1;
      mf.mesh.position.set(sx, sy, sz);
      mf.mesh.rotation.set(Math.random() * 3, Math.random() * 3, 0);
      mf.mesh.scale.setScalar(spec.pelletCount > 1 ? 1.35 : 0.95);
      mf.mesh.visible = true;
      mf.life = 0.055;
    }
    if (this.shellCasingPool.length > 0 && this.effectiveParticleScale > 0) {
      const sc = this.shellCasingPool[this.shellCasingIdx % this.shellCasingPool.length];
      this.shellCasingIdx += 1;
      sc.active = true;
      sc.life = 0.9;
      sc.pos.set(
        this.playerX + _vec3B.x * 0.24 + _vec3A.x * 0.35,
        this.playerY + this.currentEyeHeight - 0.14,
        this.playerZ + _vec3B.z * 0.24 + _vec3A.z * 0.35,
      );
      sc.vel.set(
        _vec3B.x * (2.2 + Math.random() * 0.8),
        1.8 + Math.random() * 0.8,
        _vec3B.z * (2.2 + Math.random() * 0.8),
      );
      sc.rx = (Math.random() - 0.5) * 18;
      sc.rz = (Math.random() - 0.5) * 18;
      sc.mesh.position.copy(sc.pos);
      sc.mesh.visible = true;
    }

    this.spawnParticles(sx, sy, sz, 0xffd700, spec.pelletCount > 1 ? 12 : 8);
    this.spawnParticles(
      sx + _vec3A.x * 0.1,
      sy + 0.04,
      sz + _vec3A.z * 0.1,
      0xd4d4d8,
      3,
    );

    const bulletLife = Math.max(0.8, spec.range / Math.max(40, spec.muzzleSpeed));
    const pellets = Math.max(1, spec.pelletCount);
    const widthScale = spec.soundProfile === 'sniper' ? 1.2 : 0.85;
    const lenScale = spec.soundProfile === 'sniper' ? 1.38 : 0.9;

    for (let p = 0; p < pellets; p++) {
      _vec3D.copy(_vec3A);
      if (spec.spread > 0) {
        const yawSpread = (Math.random() - 0.5) * 2 * spec.spread;
        const pitchSpread = (Math.random() - 0.5) * 2 * spec.spread;
        _vec3D.addScaledVector(_vec3B, yawSpread);
        _vec3D.addScaledVector(_vec3C, pitchSpread);
      }
      _vec3D.normalize();

      const bulletMesh =
        this.bulletMeshPool.pop() ?? new THREE.Mesh(this.bulletGeo, this.bulletMat);
      bulletMesh.scale.set(widthScale, lenScale, widthScale);
      bulletMesh.quaternion.setFromUnitVectors(_upAxis, _vec3D);
      bulletMesh.position.set(sx, sy, sz);
      bulletMesh.visible = true;
      this.scene.add(bulletMesh);

      const entry = this.arrowEntryPool.pop();
      if (entry) {
        entry.mesh = bulletMesh;
        entry.pos.set(sx, sy, sz);
        entry.vel.set(
          _vec3D.x * spec.muzzleSpeed,
          _vec3D.y * spec.muzzleSpeed,
          _vec3D.z * spec.muzzleSpeed,
        );
        entry.life = bulletLife;
        entry.damage = spec.damage;
        entry.isBullet = true;
        this.arrows.push(entry);
      } else {
        this.arrows.push({
          mesh: bulletMesh,
          pos: new THREE.Vector3(sx, sy, sz),
          vel: new THREE.Vector3(
            _vec3D.x * spec.muzzleSpeed,
            _vec3D.y * spec.muzzleSpeed,
            _vec3D.z * spec.muzzleSpeed,
          ),
          life: bulletLife,
          damage: spec.damage,
          isBullet: true,
        });
      }
    }

    this.p2p?.broadcast({
      type: 'combat_shot',
      peerId: this.p2p.localPeerId,
      fromX: sx,
      fromY: sy,
      fromZ: sz,
      toX: sx + _vec3A.x * Math.min(48, spec.range),
      toY: sy + _vec3A.y * Math.min(48, spec.range),
      toZ: sz + _vec3A.z * Math.min(48, spec.range),
      weaponId,
    });

    if (this.p2p?.connected && this.p2p.pvpEnabled) {
      const hitDmg = Math.round(spec.damage * (this.modSystem?.tweaks.damageMultiplier ?? 1));
      for (const [peerId, rp] of this.remotePlayers.entries()) {
        const dVecX = rp.targetX - sx;
        const dVecY = rp.targetY + 1.0 - sy;
        const dVecZ = rp.targetZ - sz;
        const along = dVecX * _vec3A.x + dVecY * _vec3A.y + dVecZ * _vec3A.z;
        if (along > 0.5 && along < spec.range) {
          const px = sx + _vec3A.x * along - rp.targetX;
          const py = sy + _vec3A.y * along - (rp.targetY + 1.0);
          const pz = sz + _vec3A.z * along - rp.targetZ;
          if (Math.hypot(px, py, pz) < 0.72) {
            this.p2p.broadcast({
              type: 'player_hit',
              targetPeerId: peerId,
              damage: hitDmg,
              attackerName: this.p2p.playerName,
            });
            this.spawnParticles(rp.targetX, rp.targetY + 1.1, rp.targetZ, 0xef4444, 10);
            this.toast(`Hit ${rp.name} (${hitDmg} DMG)`, 'info');
            break;
          }
        }
      }
    }

    if (
      magAmmo - 1 === 0 &&
      spec.reloadMode === 'magazine' &&
      this.getItemCount('ammo') > 0
    ) {
      this.reloadEquippedWeapon();
      return;
    }

    this.emitHud();
  }

  private restAtSleepingArea(): void {
    this.vitals.health = Math.min(
      this.vitals.maxHealth,
      this.vitals.health + 45,
    );
    this.vitals.stamina = this.vitals.maxStamina;
    this.vitals.hunger = Math.max(20, this.vitals.hunger - 12);
    this.vitals.thirst = Math.max(20, this.vitals.thirst - 12);
    this.vitals.temperatureC = 37.0;
    this.dayCount += 1;
    this.stats.daysSurvived = this.dayCount;
    this.timeOfDay = 0.28;
    this.lastIsNight = false;
    this.toast(`Rested until Day ${this.dayCount} sunrise (+45 Health)`, 'info');
    this.emitHud();
  }

  private isTreeKind(kind: ResourceNodeKind): boolean {
    return (
      kind === 'palm_tree' ||
      kind === 'tropical_tree' ||
      kind === 'oak_tree' ||
      kind === 'dark_oak_tree' ||
      kind === 'huge_red_mushroom' ||
      kind === 'huge_brown_mushroom' ||
      kind === 'banyan_tree' ||
      kind === 'highland_cedar' ||
      kind === 'birch_tree' ||
      kind === 'old_growth_birch_tree' ||
      kind === 'pale_oak_tree' ||
      kind === 'taiga_pine_tree' ||
      kind === 'old_growth_pine_tree' ||
      kind === 'spruce_tree' ||
      kind === 'mega_spruce_tree' ||
      kind === 'snowy_spruce_tree' ||
      kind === 'jungle_tree' ||
      kind === 'mega_jungle_tree' ||
      kind === 'cherry_tree' ||
      kind === 'bee_nest_oak' ||
      kind === 'acacia_tree' ||
      kind === 'swamp_oak_tree' ||
      kind === 'mangrove_tree'
    );
  }

  private isRockKind(kind: ResourceNodeKind): boolean {
    return (
      kind === 'small_stone' ||
      kind === 'stone_boulder' ||
      kind === 'mossy_cobble_boulder' ||
      kind === 'mountain_rock' ||
      kind === 'ore_vein' ||
      kind === 'flint_outcrop' ||
      kind === 'ice_spike' ||
      kind === 'emerald_ore_vein' ||
      kind === 'gold_ore_vein' ||
      kind === 'terracotta_spire'
    );
  }

  private syncResourceVisual(node: ResourceNodeState): void {
    let handle = this.world.resourceHandles.get(node.id);
    if (!handle) {
      if (node.felled) {
        handle = this.world.activateInteractiveNode(node.id);
      } else if (node.hp <= 0) {
        this.world.setBatchedNodeVisible(node.id, false);
        const m = this.world.resourceMeshes.get(node.id);
        if (m) m.visible = false;
        return;
      } else {
        const m = this.world.resourceMeshes.get(node.id);
        if (m) m.visible = node.hp > 0;
        return;
      }
    }
    if (!handle) return;

    if (this.isTreeKind(node.kind)) {
      if (node.felled) {
        handle.root.visible = true;
        if (handle.stumpMesh) handle.stumpMesh.visible = true;
        if (handle.felledPivot) {
          if ((node.fallTimer ?? 0) > 0) {
            handle.felledPivot.visible = true;
          } else {
            handle.felledPivot.visible = false;
            handle.felledPivot.rotation.set(0, 0, 0);
          }
        }
        if (handle.trunkCutBand) handle.trunkCutBand.visible = false;
      } else if (node.hp <= 0) {
        handle.root.visible = false;
      } else {
        handle.root.visible = true;
        if (handle.felledPivot) {
          handle.felledPivot.visible = true;
          handle.felledPivot.rotation.set(0, 0, 0);
        }
        const dmgRatio = (node.maxHp - node.hp) / Math.max(1, node.maxHp);
        if (handle.trunkCutBand) {
          handle.trunkCutBand.visible = dmgRatio > 0;
          const pinch = Math.max(0.54, 1 - dmgRatio * 0.38);
          handle.trunkCutBand.scale.set(pinch, 1, pinch);
        }
      }
      return;
    }

    if (this.isRockKind(node.kind)) {
      if (node.hp <= 0) {
        handle.root.visible = false;
      } else {
        handle.root.visible = true;
        const dmgRatio = (node.maxHp - node.hp) / Math.max(1, node.maxHp);
        if (handle.crackMeshes) {
          const visibleCount = Math.ceil(dmgRatio * handle.crackMeshes.length);
          handle.crackMeshes.forEach((cm, idx) => {
            cm.visible = dmgRatio > 0 && idx < visibleCount;
          });
        }
        if (handle.rockBody) {
          handle.rockBody.scale.setScalar(1 - dmgRatio * 0.14);
        }
      }
      return;
    }

    handle.root.visible = node.hp > 0;
  }

  private clearPickups(): void {
    this.pickups.forEach((p) => {
      this.scene.remove(p.mesh);
      this.disposeObject3D(p.mesh);
    });
    this.pickups = [];
    this.pickupMeshPool.forEach((meshes) => {
      for (const m of meshes) {
        this.disposeObject3D(m);
      }
    });
    this.pickupMeshPool.clear();
    for (const dp of this.debrisProjectiles) {
      dp.mesh.visible = false;
      this.scene.remove(dp.mesh);
      if (this.debrisMeshPool.length < 18) this.debrisMeshPool.push(dp.mesh);
      if (this.debrisEntryPool.length < 18) this.debrisEntryPool.push(dp);
    }
    this.debrisProjectiles = [];
    this.caveCeilingRespawnTimers.clear();
    if (this.world?.caveCeilings) {
      const caveBaseY = getTerrainHeight(CAVE_POS.x, CAVE_POS.z);
      const offsetsY = [4.35, 4.4, 4.5];
      this.world.caveCeilings.forEach((cc, idx) => {
        cc.hp = cc.maxHp;
        cc.collapsed = false;
        cc.falling = false;
        cc.velY = 0;
        cc.y = caveBaseY + (offsetsY[idx] ?? 4.4);
        cc.mesh.position.set(cc.x, cc.y, cc.z);
        cc.mesh.rotation.set(0, 0, 0);
        cc.mesh.visible = true;
      });
    }
  }

  private recyclePickupMesh(itemId: ItemId, mesh: THREE.Group): void {
    mesh.visible = false;
    this.scene.remove(mesh);
    let pool = this.pickupMeshPool.get(itemId);
    if (!pool) {
      pool = [];
      this.pickupMeshPool.set(itemId, pool);
    }
    if (pool.length < 12) {
      pool.push(mesh);
    } else {
      this.disposeObject3D(mesh);
    }
  }

  private spawnPickup(
    itemId: ItemId,
    quantity: number,
    x: number,
    z: number,
    life = 180,
    existingId?: string,
    autoCollectDelay = 0,
    placedOnGround = false,
    startY?: number,
  ): void {
    if (this.pickups.length >= 64) {
      const oldest = this.pickups.shift();
      if (oldest) this.recyclePickupMesh(oldest.itemId, oldest.mesh);
    }
    const terrainH = getTerrainHeight(x, z);
    const deckH = this.getStructuralSurfaceY(x, z, (startY ?? terrainH) + 1.5);
    const y = Math.max(OCEAN_LEVEL + 0.08, terrainH, deckH);
    const initialY = startY !== undefined && startY > y + 0.25 ? startY : y + 0.04;
    const pool = this.pickupMeshPool.get(itemId);
    const mesh =
      pool && pool.length > 0
        ? (pool.pop() as THREE.Group)
        : createPickupMesh(itemId, this.world.woodTex);
    mesh.visible = true;
    mesh.position.set(x, initialY, z);
    mesh.rotation.y = Math.random() * Math.PI * 2;
    this.scene.add(mesh);

    this.pickups.push({
      id: existingId || `pickup_${Date.now()}_${Math.floor(Math.random() * 99999)}`,
      itemId,
      quantity,
      x,
      y,
      z,
      currentY: startY !== undefined && startY > y + 0.25 ? startY : undefined,
      fallYVel: 0,
      life,
      autoCollectDelay,
      placedOnGround,
      collected: false,
      mesh,
    });
  }

  private spawnWorldPickupsFromGrants(
    cx: number,
    cz: number,
    grants: [ItemId, number][],
    offsetX = 0,
    offsetZ = 0,
    dropHeightOffset = 0,
  ): void {
    grants.forEach(([itemId, quantity], idx) => {
      const angle = (idx / Math.max(1, grants.length)) * Math.PI * 2 + Math.random() * 0.6;
      const r = 0.55 + (idx % 3) * 0.32;
      const px = cx + offsetX + Math.cos(angle) * r;
      const pz = cz + offsetZ + Math.sin(angle) * r;
      const isTreeFruit =
        itemId === 'coconut' ||
        itemId === 'banana' ||
        itemId === 'apple' ||
        itemId === 'maple_syrup';
      const groundY = Math.max(OCEAN_LEVEL + 0.08, getTerrainHeight(px, pz));
      const startY =
        dropHeightOffset > 0 && isTreeFruit
          ? groundY + dropHeightOffset + (idx % 2) * 0.45
          : undefined;
      this.spawnPickup(itemId, quantity, px, pz, 180, undefined, 0, false, startY);
    });
  }

  private collectPickup(pickupId: string): void {
    const idx = this.pickups.findIndex((p) => p.id === pickupId);
    if (idx === -1) return;
    const p = this.pickups[idx];
    if (p.collected) return;
    p.collected = true;
    this.pickups.splice(idx, 1);
    this.recyclePickupMesh(p.itemId, p.mesh);

    this.sound.playPickup();
    this.addItem(p.itemId, p.quantity, false);
    this.toast(
      `+${p.quantity} ${ITEMS[p.itemId].name}`,
      'gain',
      p.itemId,
      p.quantity,
    );
  }

  private isDinosaurSpecies(species: CreatureSpecies): boolean {
    return (
      species === 'trex' ||
      species === 'velociraptor' ||
      species === 'triceratops' ||
      species === 'stegosaurus' ||
      species === 'brachiosaurus' ||
      species === 'parasaurolophus' ||
      species === 'spinosaurus' ||
      species === 'ankylosaurus' ||
      species === 'allosaurus' ||
      species === 'dilophosaurus' ||
      species === 'diplodocus' ||
      species === 'pteranodon'
    );
  }

  private clearCarcasses(): void {
    this.carcasses.forEach((c) => {
      this.scene.remove(c.mesh);
      this.disposeObject3D(c.mesh);
    });
    this.carcasses = [];
  }

  private spawnCarcass(
    species: CreatureSpecies,
    displayName: string,
    isDino: boolean,
    x: number,
    z: number,
    yaw: number,
    drops: { itemId: ItemId; quantity: number }[],
    life = 240,
    existingId?: string,
    autoCollectDelay = 1.6,
    startY?: number,
    owner: 'player' | 'world' = 'player',
  ): void {
    if (this.carcasses.length >= 24) {
      const oldest = this.carcasses.shift();
      if (oldest) {
        this.scene.remove(oldest.mesh);
        this.disposeObject3D(oldest.mesh);
      }
    }
    const groundY = getTerrainHeight(x, z);
    const waterY = getWaterLevelAt(x, z);
    const y = Math.max(groundY, waterY - 0.12);
    const initialY =
      startY !== undefined && startY > y + 0.25 ? startY : y;
    const mesh = createCarcassMesh(species, isDino);
    mesh.position.set(x, initialY, z);
    mesh.rotation.y = yaw;
    const fallProgress = existingId ? 1 : 0;
    const creatureRoot = mesh.userData.creatureRoot as THREE.Group | undefined;
    if (creatureRoot && fallProgress < 1) {
      creatureRoot.rotation.z = 0.12;
      creatureRoot.position.y = isDino ? 0.95 : 0.45;
    }
    this.scene.add(mesh);

    const clonedDrops = drops.map((d) => ({ ...d }));
    const initialTotalQty = Math.max(
      1,
      clonedDrops.reduce((sum, d) => sum + d.quantity, 0),
    );

    this.carcasses.push({
      id: existingId || `carcass_${Date.now()}_${Math.floor(Math.random() * 99999)}`,
      species,
      displayName,
      isDino,
      x,
      y,
      z,
      yaw,
      drops: clonedDrops,
      initialTotalQty,
      life,
      autoCollectDelay,
      fallProgress,
      currentY: initialY > y ? initialY : undefined,
      fallYVel: 0,
      scavengeToastCooldown: 0,
      mesh,
      harvested: false,
      owner,
    });
  }

  private handleCarcassScavenged(
    carcassId: string,
    species: CreatureSpecies,
    scavengerName: string,
  ): void {
    const idx = this.carcasses.findIndex((c) => c.id === carcassId);
    if (idx === -1) return;
    const carcass = this.carcasses[idx];
    if (
      !canAnimalEatCarcass({
        id: carcass.id,
        x: carcass.x,
        z: carcass.z,
        owner: carcass.owner,
        collected: carcass.harvested,
      })
    ) {
      return;
    }

    // Prioritize eating meat cuts first, then leftover scraps
    const meatDrop = carcass.drops.find(
      (d) => (d.itemId === 'raw_meat' || d.itemId === 'dino_meat') && d.quantity > 0,
    );
    const anyDrop = carcass.drops.find((d) => d.quantity > 0);
    const targetDrop = meatDrop || anyDrop;

    if (targetDrop) {
      targetDrop.quantity -= 1;
    }

    const remainingTotal = carcass.drops.reduce(
      (sum, d) => sum + Math.max(0, d.quantity),
      0,
    );
    const ratio = remainingTotal / Math.max(1, carcass.initialTotalQty);

    const meatCut = carcass.mesh.userData.meatCut as THREE.Mesh | undefined;
    if (meatCut) {
      const remainingMeat = carcass.drops
        .filter((d) => d.itemId === 'raw_meat' || d.itemId === 'dino_meat')
        .reduce((sum, d) => sum + Math.max(0, d.quantity), 0);
      if (remainingMeat <= 0) {
        meatCut.visible = false;
      } else {
        const s = Math.max(0.28, ratio);
        meatCut.scale.set(s, s, s);
      }
    }

    const distToPlayer = Math.hypot(
      carcass.x - this.playerX,
      carcass.z - this.playerZ,
    );
    this.sound.playScavengerBite(distToPlayer, species === 'bird');
    this.spawnParticles(
      carcass.x,
      carcass.y + (carcass.isDino ? 0.55 : 0.32),
      carcass.z,
      0xdc2626,
      5,
    );

    if (remainingTotal <= 0) {
      carcass.harvested = true;
      this.scene.remove(carcass.mesh);
      this.disposeObject3D(carcass.mesh);
      this.carcasses.splice(idx, 1);
      if (distToPlayer < 85) {
        this.toast(
          `${scavengerName} finished off your unclaimed ${carcass.displayName} carcass!`,
          'warning',
        );
      }
      this.emitHud();
      return;
    }

    if (carcass.scavengeToastCooldown <= 0 && distToPlayer < 80) {
      carcass.scavengeToastCooldown = 7.5;
      this.toast(
        `A ${scavengerName} is eating your unclaimed ${carcass.displayName} carcass!`,
        'warning',
      );
    }
  }

  private findNearbyCarcass(): ActiveCarcass | null {
    const fwdX = -Math.sin(this.camYaw);
    const fwdZ = -Math.cos(this.camYaw);
    let bestCarcass: ActiveCarcass | null = null;
    let bestScore = Infinity;
    for (const c of this.carcasses) {
      if (c.harvested) continue;
      const maxRange = c.isDino ? 5.4 : 4.6;
      const dx = c.x - this.playerX;
      const dz = c.z - this.playerZ;
      const d = Math.hypot(dx, dz);
      if (d > maxRange) continue;
      const dot = d > 0.001 ? (dx * fwdX + dz * fwdZ) / d : 1;
      const score = d * (1.18 - 0.35 * Math.max(0, dot));
      if (score < bestScore) {
        bestScore = score;
        bestCarcass = c;
      }
    }
    return bestCarcass;
  }

  public collectNearbyCarcass(carcassId?: string): boolean {
    this.sound.unlock();
    if (this.mode !== 'playing' || this.gameOver || this.cinematicActive) {
      return false;
    }
    const target = carcassId
      ? this.carcasses.find((c) => {
          if (c.id !== carcassId || c.harvested) return false;
          const maxRange = c.isDino ? 5.8 : 5.0;
          return Math.hypot(c.x - this.playerX, c.z - this.playerZ) <= maxRange;
        }) || null
      : this.findNearbyCarcass();
    if (!target) {
      this.emitHud();
      return false;
    }
    this.prepareCarcass(target.id);
    this.swingTimer = 0.28;
    this.actionCooldown = 0.32;
    return true;
  }

  private prepareCarcass(carcassId: string): void {
    const idx = this.carcasses.findIndex((c) => c.id === carcassId);
    if (idx === -1) return;
    const carcass = this.carcasses[idx];
    if (carcass.harvested) return;
    carcass.harvested = true;
    this.carcasses.splice(idx, 1);
    this.scene.remove(carcass.mesh);
    this.disposeObject3D(carcass.mesh);

    const hasKnife =
      this.hotbarItemIds[this.equippedSlot] === 'hunting_knife' ||
      this.getItemCount('hunting_knife') > 0;

    this.sound.playPrepareCarcass();
    this.spawnParticles(
      carcass.x,
      carcass.y + 0.35,
      carcass.z,
      0xdc2626,
      carcass.isDino ? 14 : 9,
    );
    this.spawnParticles(
      carcass.x,
      carcass.y + 0.4,
      carcass.z,
      0xf5f5f4,
      5,
    );

    const summaryParts: string[] = [];
    let primaryItemId: ItemId | undefined;
    let primaryQty = 0;

    carcass.drops.forEach((d) => {
      const isMeat = d.itemId === 'raw_meat' || d.itemId === 'dino_meat';
      const bonus = hasKnife && isMeat ? 1 : 0;
      const totalQty = d.quantity + bonus;
      if (totalQty <= 0) return;
      this.addItem(d.itemId, totalQty, false);

      if (!this.hotbarItemIds.includes(d.itemId)) {
        const emptyHotbarIdx = this.hotbarItemIds.indexOf(null);
        if (emptyHotbarIdx !== -1) {
          this.hotbarItemIds[emptyHotbarIdx] = d.itemId;
        }
      }

      summaryParts.push(`+${totalQty} ${ITEMS[d.itemId].name}`);
      if (!primaryItemId || isMeat) {
        primaryItemId = d.itemId;
        primaryQty = totalQty;
      }
    });

    this.evaluateMissions();
    this.emitHud();

    const knifeNote = hasKnife ? ' (Cut with Knife)' : '';
    const summaryText =
      summaryParts.length > 0 ? `: ${summaryParts.join(', ')}` : '';
    this.toast(
      `Prepared ${carcass.displayName} carcass${knifeNote}${summaryText} — Cook over a Campfire & eat!`,
      'gain',
      primaryItemId,
      primaryQty,
    );
  }

  private harvestResourceNode(
    nodeId: string,
    equippedTool: (typeof ITEMS)[ItemId] | null,
  ): void {
    if (this.worldType === 'flat') return;
    const node = this.nodeById.get(nodeId);
    if (!node || node.hp <= 0 || node.felled) return;

    // Always swap batched InstancedMesh node to its interactive articulated group BEFORE syncing visuals
    this.world.activateInteractiveNode(node.id);

    let power = 1;
    const isTree = this.isTreeKind(node.kind);
    const isRock = this.isRockKind(node.kind);
    if (isTree && equippedTool?.preferredResource === 'wood') {
      power = equippedTool.gatherPower || 2;
    }
    if (isRock && equippedTool?.preferredResource === 'stone') {
      power = equippedTool.gatherPower || 2;
    }

    node.hp = Math.max(0, node.hp - power);
    const dmgProgress = (node.maxHp - node.hp) / Math.max(1, node.maxHp);
    this.sound.playGather(isTree ? 'wood' : isRock ? 'stone' : 'plant', dmgProgress);
    this.spawnParticles(
      node.x,
      node.y + (isTree ? 1.15 : 0.7),
      node.z,
      isTree ? 0x85532a : isRock ? 0x78716c : 0x65a30d,
      7,
    );

    if (node.hp <= 0) {
      const isFieldCrop =
        node.kind === 'wheat_patch' || node.kind === 'sugarcane_patch';
      node.respawnTimer = isTree || isRock ? 95 : isFieldCrop ? 26 : 65;
      this.respawningNodeIds.add(node.id);
      const yieldMult = Math.max(1, Math.round(this.modSystem?.tweaks.gatherYieldMultiplier ?? 1));
      const grants = this.getResourceYield(node.kind, equippedTool?.id).map(
        ([id, q]) => [id, Math.round(q * yieldMult)] as [ItemId, number],
      );

      if (isTree) {
        const dx = node.x - this.playerX;
        const dz = node.z - this.playerZ;
        const dLen = Math.hypot(dx, dz) || 1;
        node.felled = true;
        node.fallTimer = 1.05;
        node.fallDirX = dx / dLen;
        node.fallDirZ = dz / dLen;
        this.activeFellingNodeIds.add(node.id);
        this.nodeHitShakeTimers.delete(node.id);
        if (!this.pendingTreeDrops.has(node.id)) {
          // Ensure fruit falls from fruit trees even if felled in a single heavy blow
          if (!this.shakenTreeDropIds.has(node.id)) {
            this.shakenTreeDropIds.add(node.id);
            const shakeItem = this.rollTreeShakeDrop(node.kind);
            if (shakeItem) {
              const angle = Math.random() * Math.PI * 2;
              this.spawnPickup(
                shakeItem,
                1,
                node.x + Math.cos(angle) * 1.45,
                node.z + Math.sin(angle) * 1.45,
                180,
                undefined,
                0.25,
                false,
                node.y + 3.4,
              );
              this.spawnParticles(node.x, node.y + 3.0, node.z, 0x22c55e, 7);
            }
          }
          this.pendingTreeDrops.set(node.id, grants);
        }
        this.sound.playTreeFall();
        this.stats.treesChopped += 1;
        this.syncResourceVisual(node);
      } else if (isRock) {
        this.sound.playRockBreak();
        this.syncResourceVisual(node);
        this.stats.stonesMined += 1;
        this.spawnWorldPickupsFromGrants(node.x, node.z, grants);
      } else if (node.kind === 'branch_pile' || isFieldCrop) {
        this.syncResourceVisual(node);
        this.spawnWorldPickupsFromGrants(node.x, node.z, grants);
      } else {
        this.syncResourceVisual(node);
        grants.forEach(([id, q]) => this.addItem(id, q, true));
        if (node.kind === 'shipwreck_crate') {
          this.stats.shipwreckCratesSearched += 1;
        }
      }
      this.evaluateMissions();
      this.emitHud();
    } else {
      this.syncResourceVisual(node);
      this.nodeHitShakeTimers.set(node.id, 0.22);
      if (isTree && dmgProgress >= 0.4 && !this.shakenTreeDropIds.has(node.id)) {
        this.shakenTreeDropIds.add(node.id);
        const shakeItem = this.rollTreeShakeDrop(node.kind);
        if (shakeItem) {
          const angle = Math.random() * Math.PI * 2;
          this.spawnPickup(
            shakeItem,
            1,
            node.x + Math.cos(angle) * 1.45,
            node.z + Math.sin(angle) * 1.45,
            180,
            undefined,
            0.25,
            false,
            node.y + 3.4,
          );
          this.spawnParticles(node.x, node.y + 2.8, node.z, 0x22c55e, 7);
        }
      }
      this.emitHud();
    }
  }

  private rollTreeShakeDrop(kind: ResourceNodeKind): ItemId | null {
    const r = Math.random();
    switch (kind) {
      case 'palm_tree':
        return r < 0.72 ? 'coconut' : r < 0.94 ? 'banana' : 'apple';
      case 'tropical_tree':
      case 'oak_tree':
      case 'dark_oak_tree':
        return r < 0.42 ? 'apple' : r < 0.78 ? 'maple_syrup' : r < 0.92 ? 'berries' : 'banana';
      case 'huge_red_mushroom':
      case 'huge_brown_mushroom':
        return 'mushrooms';
      case 'banyan_tree':
        return r < 0.36 ? 'apple' : r < 0.7 ? 'banana' : 'maple_syrup';
      case 'highland_cedar':
      case 'taiga_pine_tree':
      case 'old_growth_pine_tree':
      case 'spruce_tree':
      case 'mega_spruce_tree':
      case 'snowy_spruce_tree':
        return r < 0.52 ? 'maple_syrup' : 'berries';
      case 'birch_tree':
      case 'old_growth_birch_tree':
        return r < 0.56 ? 'apple' : 'maple_syrup';
      case 'pale_oak_tree':
        return r < 0.6 ? 'mushrooms' : 'apple';
      case 'jungle_tree':
      case 'mega_jungle_tree':
        return r < 0.52 ? 'banana' : r < 0.84 ? 'coconut' : 'apple';
      case 'cherry_tree':
        return r < 0.62 ? 'berries' : 'apple';
      case 'bee_nest_oak':
        return r < 0.6 ? 'apple' : 'maple_syrup';
      case 'acacia_tree':
        return r < 0.55 ? 'apple' : 'berries';
      case 'swamp_oak_tree':
      case 'mangrove_tree':
        return r < 0.55 ? 'mushrooms' : 'berries';
      default:
        return null;
    }
  }

  private getTreeFelledBonusDrops(kind: ResourceNodeKind): [ItemId, number][] {
    const drops: [ItemId, number][] = [];
    const r = Math.random();
    if (kind === 'palm_tree') {
      if (r < 0.85) drops.push(['coconut', Math.random() < 0.35 ? 2 : 1]);
      if (Math.random() < 0.28) drops.push(['banana', 1]);
      if (drops.length === 0) drops.push(['coconut', 1]);
    } else if (kind === 'tropical_tree' || kind === 'jungle_tree' || kind === 'mega_jungle_tree') {
      if (r < 0.55) drops.push(['banana', Math.random() < 0.4 ? 2 : 1]);
      if (Math.random() < 0.5) drops.push(['apple', Math.random() < 0.35 ? 2 : 1]);
      if (Math.random() < 0.25) drops.push(['maple_syrup', 1]);
      if (drops.length === 0) drops.push([Math.random() < 0.5 ? 'apple' : 'banana', 1]);
    } else if (kind === 'oak_tree' || kind === 'dark_oak_tree') {
      if (r < 0.62) drops.push(['apple', Math.random() < 0.35 ? 2 : 1]);
      if (Math.random() < 0.38) drops.push(['mushrooms', 1]);
      if (drops.length === 0) drops.push(['apple', 1]);
    } else if (kind === 'huge_red_mushroom' || kind === 'huge_brown_mushroom') {
      drops.push(['mushrooms', 4]);
    } else if (kind === 'banyan_tree') {
      if (r < 0.55) drops.push(['apple', Math.random() < 0.45 ? 2 : 1]);
      if (Math.random() < 0.55) drops.push(['banana', Math.random() < 0.4 ? 2 : 1]);
      if (Math.random() < 0.45) drops.push(['maple_syrup', 1]);
      if (drops.length === 0) drops.push(['maple_syrup', 1]);
    } else if (
      kind === 'highland_cedar' ||
      kind === 'taiga_pine_tree' ||
      kind === 'old_growth_pine_tree' ||
      kind === 'spruce_tree' ||
      kind === 'mega_spruce_tree' ||
      kind === 'snowy_spruce_tree'
    ) {
      if (r < 0.72) drops.push(['maple_syrup', Math.random() < 0.35 ? 2 : 1]);
      if (Math.random() < 0.48) drops.push(['berries', Math.random() < 0.35 ? 2 : 1]);
      if (drops.length === 0) drops.push(['maple_syrup', 1]);
    } else if (kind === 'birch_tree' || kind === 'old_growth_birch_tree') {
      if (r < 0.6) drops.push(['apple', Math.random() < 0.35 ? 2 : 1]);
      if (Math.random() < 0.45) drops.push(['maple_syrup', 1]);
      if (drops.length === 0) drops.push(['apple', 1]);
    } else if (kind === 'pale_oak_tree') {
      if (r < 0.65) drops.push(['mushrooms', 2]);
      if (Math.random() < 0.4) drops.push(['apple', 1]);
      if (drops.length === 0) drops.push(['mushrooms', 1]);
    } else if (kind === 'cherry_tree') {
      if (r < 0.7) drops.push(['berries', 2]);
      if (Math.random() < 0.45) drops.push(['apple', 1]);
      if (drops.length === 0) drops.push(['berries', 1]);
    } else if (kind === 'bee_nest_oak') {
      drops.push(['maple_syrup', 2]);
      if (r < 0.65) drops.push(['apple', 1]);
    } else if (kind === 'acacia_tree') {
      if (r < 0.6) drops.push(['apple', 1]);
      drops.push(['branch', 2]);
    } else if (kind === 'swamp_oak_tree' || kind === 'mangrove_tree') {
      drops.push(['mushrooms', 2]);
      drops.push(['fiber', 2]);
    }
    return drops;
  }

  private getResourceYield(
    kind: ResourceNodeKind,
    toolId?: ItemId,
  ): [ItemId, number][] {
    switch (kind) {
      case 'palm_tree':
        return [
          ['wood', toolId === 'stone_axe' ? 4 : 2],
          ['leaves', 2],
          ['plant_material', 1],
          ['fiber', 1],
          ...this.getTreeFelledBonusDrops(kind),
        ];
      case 'tropical_tree':
      case 'oak_tree':
      case 'birch_tree':
      case 'taiga_pine_tree':
      case 'spruce_tree':
      case 'snowy_spruce_tree':
      case 'cherry_tree':
      case 'bee_nest_oak':
      case 'acacia_tree':
      case 'swamp_oak_tree':
      case 'mangrove_tree':
        return [
          ['wood', toolId === 'stone_axe' ? 5 : 3],
          ['branch', 2],
          ['leaves', 3],
          ...this.getTreeFelledBonusDrops(kind),
        ];
      case 'dark_oak_tree':
      case 'banyan_tree':
      case 'old_growth_birch_tree':
      case 'old_growth_pine_tree':
      case 'mega_spruce_tree':
      case 'jungle_tree':
      case 'mega_jungle_tree':
      case 'pale_oak_tree':
        return [
          ['wood', toolId === 'stone_axe' ? 6 : 3],
          ['branch', 3],
          ['fiber', 2],
          ['leaves', 3],
          ...this.getTreeFelledBonusDrops(kind),
        ];
      case 'huge_red_mushroom':
      case 'huge_brown_mushroom':
        return [
          ['mushrooms', toolId === 'stone_axe' ? 6 : 4],
          ['plant_material', 2],
          ['wood', 1],
        ];
      case 'highland_cedar':
        return [
          ['wood', toolId === 'stone_axe' ? 5 : 3],
          ['branch', 3],
          ['leaves', 2],
          ...this.getTreeFelledBonusDrops(kind),
        ];
      case 'jungle_bush':
        return [
          ['leaves', 3],
          ['branch', 2],
          ['berries', 1],
        ];
      case 'bamboo_stalk':
        return [
          ['branch', toolId === 'stone_axe' ? 4 : 3],
          ['wood', 2],
          ['plant_material', 2],
        ];
      case 'flower_patch':
      case 'rose_bush':
      case 'lilac_bush':
      case 'peony_bush':
      case 'sunflower_patch':
      case 'pink_petals':
      case 'blue_orchid_patch':
        return [
          ['plant_material', 3],
          ['berries', 1],
          ['fiber', 1],
        ];
      case 'cactus_plant':
        return [
          ['plant_material', 3],
          ['fiber', 2],
        ];
      case 'coral_cluster':
        return [
          ['plant_material', 3],
          ['sand', 2],
          ['flint', 1],
        ];
      case 'eyeblossom_patch':
        return [
          ['plant_material', 3],
          ['mushrooms', 1],
          ['fiber', 1],
        ];
      case 'dead_bush':
        return [
          ['branch', 2],
          ['fiber', 2],
        ];
      case 'melon_patch':
        return [
          ['berries', 3],
          ['plant_material', 2],
          ['apple', 1],
        ];
      case 'branch_pile':
        return [['branch', 3]];
      case 'small_stone':
        return [
          ['stone', toolId === 'stone_pickaxe' ? 3 : 2],
          ['flint', 1],
        ];
      case 'stone_boulder':
      case 'mossy_cobble_boulder':
        return [
          ['stone', toolId === 'stone_pickaxe' ? 5 : 3],
          ['flint', 1],
          ['fiber', 1],
        ];
      case 'mountain_rock':
        return [
          ['stone', toolId === 'stone_pickaxe' ? 6 : 3],
          ['metal_ore', toolId === 'stone_pickaxe' ? 2 : 1],
          ['flint', 1],
        ];
      case 'flint_outcrop':
        return [
          ['flint', toolId === 'stone_pickaxe' ? 4 : 2],
          ['stone', 2],
        ];
      case 'ore_vein':
        return [
          ['metal_ore', toolId === 'stone_pickaxe' ? 3 : 2],
          ['stone', 2],
        ];
      case 'emerald_ore_vein':
        return [
          ['emerald', toolId === 'stone_pickaxe' ? 3 : 2],
          ['metal_ore', 1],
          ['stone', 2],
        ];
      case 'gold_ore_vein':
        return [
          ['gold_bar', toolId === 'stone_pickaxe' ? 2 : 1],
          ['metal_ore', 2],
          ['stone', 2],
        ];
      case 'terracotta_spire':
        return [
          ['clay', toolId === 'stone_pickaxe' ? 5 : 3],
          ['stone', 3],
        ];
      case 'ice_spike':
        return [
          ['stone', toolId === 'stone_pickaxe' ? 4 : 2],
          ['flint', 2],
        ];
      case 'fiber_fern':
        return [
          ['fiber', 3],
          ['leaves', 1],
        ];
      case 'grass_tuft':
        return [
          ['grass', 3],
          ['fiber', 2],
        ];
      case 'wheat_patch':
        return [
          ['wheat', toolId === 'sickle' ? 5 : 3],
          ['wheat_seeds', 1],
        ];
      case 'bean_patch':
        return [
          ['beans', toolId === 'sickle' ? 5 : 3],
          ['plant_material', 2],
        ];
      case 'sugarcane_patch':
        return [
          ['sugarcane', toolId === 'sickle' ? 5 : 3],
          ['sugarcane_cutting', 1],
        ];
      case 'clay_deposit':
        return [['clay', 3]];
      case 'sand_mound':
        return [['sand', 3]];
      case 'berry_bush':
        return [
          ['berries', 3],
          ['branch', 1],
        ];
      case 'mushroom_cluster':
        return [['mushrooms', 3]];
      case 'plant_cluster':
        return [
          ['leaves', 2],
          ['plant_material', 2],
          ['fiber', 2],
        ];
      case 'shipwreck_crate':
        return [
          ['wood', 3],
          ['rope', 2],
          ['flint', 2],
          ['berries', 3],
          ['stone', 2],
        ];
      case 'expedition_crate':
        return [
          ['rope', 2],
          ['metal_ore', 2],
          ['wheat', 2],
          ['berries', 3],
        ];
    }
  }

  private spawnParticles(
    x: number,
    y: number,
    z: number,
    colorHex: number,
    count: number,
  ): void {
    if (this.effectiveParticleScale <= 0 || !this.particleInstanced) return;
    const scaledCount = Math.max(1, Math.round(count * this.effectiveParticleScale));
    this.hasActiveParticles = true;
    _scratchColorA.setHex(colorHex);
    for (let i = 0; i < scaledCount; i++) {
      const idx = this.particleWriteIdx;
      this.particleWriteIdx = (this.particleWriteIdx + 1) % MAX_POOLED_PARTICLES;
      const p = this.particlePool[idx];
      p.active = true;
      p.x = x;
      p.y = y;
      p.z = z;
      p.vx = (Math.random() - 0.5) * 4.5;
      p.vy = 2.2 + Math.random() * 3.0;
      p.vz = (Math.random() - 0.5) * 4.5;
      const life = 0.45 + Math.random() * 0.25;
      p.life = life;
      p.maxLife = life;
      this.particleInstanced.setColorAt(idx, _scratchColorA);
    }
    if (this.particleInstanced.instanceColor) {
      this.particleInstanced.instanceColor.needsUpdate = true;
    }
  }

  private evaluateMissions(): void {
    if (this.worldType === 'flat') return;
    const ctx = {
      inventory: this.inventory,
      structures: this.structures,
      stats: this.stats,
      visitedBiomes: Array.from(this.visitedBiomes),
    };
    for (const m of STAGE_1_MISSIONS) {
      if (
        !this.completedMissionIds.has(m.id) &&
        m.checkProgress(ctx) >= m.targetCount
      ) {
        this.completedMissionIds.add(m.id);
        this.toast(`Mission Complete: ${m.title}`, 'discovery');
      }
    }
  }

  private toast(
    text: string,
    tone: ResourceToast['tone'],
    itemId?: ItemId,
    quantity?: number,
  ): void {
    this.callbacks.onToast({
      id: `${Date.now()}_${Math.random()}`,
      text,
      tone,
      itemId,
      quantity,
    });
  }

  private updateWeatherAndAtmosphere(dt: number): void {
    const isFlat = this.worldType === 'flat';
    if (this.mode === 'playing' && !this.gameOver && !this.cinematicActive) {
      // Full day-night cycle scaled by mod dayLengthMultiplier
      const dayLenMult = Math.max(0.2, this.modSystem?.tweaks.dayLengthMultiplier ?? 1);
      this.timeOfDay += dt / (300 * dayLenMult);
      if (this.timeOfDay >= 1) {
        this.timeOfDay -= 1;
        this.dayCount += 1;
        this.stats.daysSurvived = this.dayCount;
        if (!isFlat) {
          this.toast(`Day ${this.dayCount} Dawn`, 'info');
        }
      }

      if (isFlat) {
        this.weather = 'clear';
      } else {
        // Dynamic Weather Cycling
        this.weatherTimer -= dt;
        if (this.weatherTimer <= 0) {
          this.weatherTimer = 65 + Math.random() * 55;
          const r = Math.random();
          const next: WeatherType =
            r < 0.48
              ? 'clear'
              : r < 0.72
                ? 'overcast'
                : r < 0.9
                  ? 'rain'
                  : 'storm';
          if (next !== this.weather) {
            this.weather = next;
            if (next === 'rain') {
              this.toast('Tropical rain showers begin to fall.', 'info');
            } else if (next === 'storm') {
              this.toast(
                'A heavy storm approaches! Seek shelter or build a fire.',
                'warning',
              );
            } else if (next === 'clear') {
              this.toast('The skies clear over the island.', 'info');
            }
          }
        }
      }
    }

    // Lightning in storm or shipwreck cinematic
    if (this.lightningFlash > 0) {
      this.lightningFlash = Math.max(0, this.lightningFlash - dt * 4.5);
    }
    if (!isFlat && (this.weather === 'storm' || this.cinematicActive)) {
      this.nextLightningTimer -= dt;
      if (this.nextLightningTimer <= 0) {
        this.nextLightningTimer = this.cinematicActive
          ? 2.4 + Math.random() * 1.8
          : 7 + Math.random() * 10;
        this.lightningFlash = 1.0;
        this.sound.playThunder();
      }
    }

    const sunAngle = (this.timeOfDay - 0.25) * Math.PI * 2;
    const sunElev = Math.sin(sunAngle);
    const sunCos = Math.cos(sunAngle);
    const isNight = sunElev < -0.05;

    if (this.world.eyeblossomGlowMat) {
      this.world.eyeblossomGlowMat.color.setHex(isNight ? 0xf97316 : 0x9ca3af);
      this.world.eyeblossomGlowMat.emissiveIntensity = isNight ? 1.3 : 0.04;
    }

    if (
      !isFlat &&
      this.mode === 'playing' &&
      !this.gameOver &&
      !this.cinematicActive &&
      isNight !== this.lastIsNight
    ) {
      this.lastIsNight = isNight;
      if (isNight) {
        this.toast(
          'Night falls — visibility drops and nocturnal Velociraptors begin stalking.',
          'warning',
        );
      } else {
        this.toast(
          'Dawn breaks — nocturnal predators retreat as daytime wildlife emerges.',
          'info',
        );
      }
    }

    // Position visible Sun, Moon & Starfield around active focal position
    const centerX =
      this.mode === 'menu'
        ? 0
        : this.cinematicActive
          ? this.shipModel.position.x
          : this.playerX;
    const centerZ =
      this.mode === 'menu'
        ? 0
        : this.cinematicActive
          ? this.shipModel.position.z
          : this.playerZ;
    this.skyBodies.group.position.set(centerX, 0, centerZ);
    this.skyBodies.sunMesh.position.set(sunCos * 210, sunElev * 195, -90);
    this.skyBodies.sunMesh.visible = sunElev > -0.15 && !this.cinematicActive;
    this.skyBodies.moonMesh.position.set(-sunCos * 210, -sunElev * 195, 90);
    this.skyBodies.moonMesh.visible = sunElev < 0.15 && !this.cinematicActive;

    // Texel-snap sun shadow camera around active focal point to eliminate shadow edge shimmer
    const focusX = centerX;
    const focusZ = centerZ;
    const texelStep =
      (this.effectiveShadowExtent * 2) / Math.max(512, this.effectiveShadowMapSize);
    const snappedX = Math.round(focusX / texelStep) * texelStep;
    const snappedZ = Math.round(focusZ / texelStep) * texelStep;
    const sunOffX = sunCos * 86;
    const sunOffY = Math.max(18, sunElev * 118);
    const sunOffZ = -52;
    this.sunLight.position.set(snappedX + sunOffX, sunOffY, snappedZ + sunOffZ);
    this.sunLight.target.position.set(snappedX, 0, snappedZ);
    this.sunLight.target.updateMatrixWorld();

    this.skyFillLight.position.set(snappedX - 60, 35, snappedZ - 80);
    this.skyFillLight.target.position.set(snappedX, 0, snappedZ);
    this.skyFillLight.target.updateMatrixWorld();

    this.moonLight.position.set(
      focusX - sunCos * 55,
      Math.max(14, -sunElev * 68),
      focusZ - 28,
    );
    this.moonLight.target.position.set(focusX, this.playerY, focusZ);
    this.moonLight.target.updateMatrixWorld();

    this._sunDirScratch.set(sunOffX, sunOffY, sunOffZ).normalize();

    if (this.currentDimension !== 'overworld') {
      this.rainSystem.group.visible = false;
      this.skyBodies.skyDome.visible = false;
      this.skyBodies.sunMesh.visible = false;
      this.skyBodies.moonMesh.visible = false;
      this.skyBodies.starPoints.visible = false;
      updateShaderEnvironment(
        this.elapsed,
        this._sunDirScratch,
        this.sunLight.color,
        _skyColor,
        0.55,
        this.shaderQualityTier,
      );
      return;
    }
    this.skyBodies.skyDome.visible = true;

    const daylight = THREE.MathUtils.clamp((sunElev + 0.16) / 0.65, 0, 1);
    const twilight = Math.max(0, 1 - Math.abs(sunElev - 0.16) * 2.45);
    const isMorning = this.timeOfDay < 0.5;

    _skyColor
      .copy(_nightSky)
      .lerp(_daySky, daylight)
      .lerp(isMorning ? _dawnSky : _duskSky, twilight * 0.64);

    if (this.weather === 'overcast') {
      _skyColor.lerp(_stormSky, 0.45);
    } else if (this.weather === 'rain') {
      _skyColor.lerp(_stormSky, 0.65);
    } else if (this.weather === 'storm' || this.cinematicActive) {
      _skyColor.lerp(_stormDeepSky, 0.82);
    }
    if (this.lightningFlash > 0) {
      _skyColor.lerp(_lightningSky, this.lightningFlash * 0.55);
    }

    if (this.scene.background instanceof THREE.Color) {
      this.scene.background.copy(_skyColor);
    } else {
      this.scene.background = _skyColor;
    }

    const starClearMult =
      this.weather === 'clear'
        ? 0.94
        : this.weather === 'overcast'
          ? 0.35
          : 0.12;
    this.skyBodies.starMat.opacity = (1 - daylight) * starClearMult;
    this.skyBodies.starPoints.visible =
      this.skyBodies.starMat.opacity > 0.03 && !this.cinematicActive;
    this.skyBodies.starPoints.rotation.y += dt * 0.002;

    // Atmospheric distance haze (0xb6cbd5 @ 0.00065 clear-day baseline, denser for weather & night)
    const weatherFog =
      this.weather === 'storm' || this.cinematicActive
        ? 0.0056
        : this.weather === 'rain'
          ? 0.0036
          : this.weather === 'overcast'
            ? 0.0021
            : 0.00062;
    const fogDensity = (weatherFog + (1 - daylight) * 0.0028) * this.effectiveFogMult;
    _fogScratchColor
      .copy(_skyColor)
      .lerp(_fogDayColor, daylight * (this.weather === 'clear' ? 0.48 : 0.18));
    (this.scene.fog as THREE.FogExp2).color.copy(_fogScratchColor);
    (this.scene.fog as THREE.FogExp2).density = fogDensity;

    const weatherDim =
      this.weather === 'storm' || this.cinematicActive
        ? 0.45
        : this.weather === 'rain'
          ? 0.62
          : this.weather === 'overcast'
            ? 0.78
            : 1.0;

    const sunFade = THREE.MathUtils.clamp((sunElev + 0.06) / 0.42, 0, 1);
    const moonRise = THREE.MathUtils.clamp((-sunElev + 0.06) / 0.5, 0, 1);

    this.sunLight.intensity =
      sunFade * 3.55 * weatherDim + this.lightningFlash * 1.9;
    this.sunLight.color
      .setHex(0xfff5e4)
      .lerp(_sunOrangeColor, twilight * 0.64);

    // Clear moonlit night lighting without making island terrain pitch-black
    this.moonLight.intensity =
      moonRise * 0.78 * Math.max(0.55, weatherDim);

    this.hemiLight.color
      .setHex(0x334155)
      .lerp(_hemiDayColor, daylight)
      .lerp(_hemiTwilightColor, twilight * 0.52);
    this.hemiLight.groundColor
      .setHex(0x162032)
      .lerp(_hemiGroundDayColor, daylight)
      .lerp(_hemiGroundTwilightColor, twilight * 0.42);
    this.hemiLight.intensity =
      (0.48 + daylight * 0.96) * Math.max(0.62, weatherDim) +
      this.lightningFlash * 0.55;

    this.skyFillLight.color
      .setHex(0x6089b8)
      .lerp(_skyFillDayColor, daylight);
    this.skyFillLight.intensity =
      (0.14 + daylight * 0.36) * Math.max(0.65, weatherDim) +
      this.lightningFlash * 0.35;

    this.renderer.toneMappingExposure = 1.0 + daylight * 0.18;
    const nvIntensity = (1 - daylight) * 0.62;
    this.nightVisionLight.intensity = nvIntensity;
    this.nightVisionLight.visible = nvIntensity > 0.02;

    // Sync RealisticOcean & custom surface shaders during both menu and active gameplay
    updateShaderEnvironment(
      this.elapsed,
      this._sunDirScratch,
      this.sunLight.color,
      _skyColor,
      daylight,
      this.shaderQualityTier,
    );
    if (this.realisticOcean) {
      this.realisticOcean.setEnvironment({
        sunDirection: this._sunDirScratch,
        sunColor: sunFade > 0.08 ? this.sunLight.color : this.moonLight.color,
        skyColor: _skyColor,
        fogColor: _fogScratchColor,
        fogDensity,
        daylight,
        reflectionStrength: this.effectiveWaterReflections
          ? this.autoFpsTier >= 2
            ? 0.58
            : 1.0
          : 0.2,
      });
    }
    _zenithScratchColor
      .copy(_zenithNightSky)
      .lerp(_zenithDaySky, daylight)
      .lerp(_stormDeepSky, 1 - weatherDim);
    _horizonScratchColor
      .copy(_skyColor)
      .lerp(_fogScratchColor, 0.35);
    this.skyBodies.updateSky({
      sunDirection: this._sunDirScratch,
      sunColor: this.sunLight.color,
      zenithColor: _zenithScratchColor,
      horizonColor: _horizonScratchColor,
      daylight,
      twilight,
      weatherDim,
      time: this.elapsed,
    });

    if (this.worldType === 'island') {
      // Skip updating hidden legacy oceanMesh when RealisticOcean renders
      if (this.world.oceanMesh.visible && this.world.oceanMesh.material instanceof THREE.MeshStandardMaterial) {
        this.world.oceanMesh.material.color
          .setHex(0x052838)
          .lerp(_oceanDayColor, daylight);
        if (this.world.oceanMesh.material.normalMap) {
          this.world.oceanMesh.material.normalMap.offset.x += dt * 0.025;
          this.world.oceanMesh.material.normalMap.offset.y += dt * 0.018;
        }
      }
      if (this.world.lakeMesh.material instanceof THREE.MeshStandardMaterial) {
        this.world.lakeMesh.material.color
          .setHex(0x0a4a4e)
          .lerp(_lakeDayColor, daylight);
      }

      // Drifting 3D clouds
      this.world.cloudsGroup.rotation.y += dt * 0.006;

      if (this.world.waterfallShaderMat) {
        this.world.waterfallShaderMat.uniforms.uTime.value = this.elapsed;
      }
      const wfStreams = this.world.waterfallStreams;
      for (let wi = 0; wi < wfStreams.length; wi++) {
        wfStreams[wi].scale.x = 0.96 + Math.sin(this.elapsed * 6 + wi) * 0.04;
      }
      this.world.waterfallFoam.scale.setScalar(
        0.95 + Math.sin(this.elapsed * 5) * 0.12,
      );
    }

    // GPU-driven volumetric raindrop streaks + expanding ground splash ripples (zero FPS drop)
    const showRain =
      this.mode !== 'menu' &&
      !isFlat &&
      this.effectiveParticleScale > 0.05 &&
      (this.weather === 'rain' ||
        this.weather === 'storm' ||
        this.cinematicActive);
    const rainCenter = this.cinematicActive
      ? this.shipModel.position
      : this.camera.position;
    const rainGroundY = this.cinematicActive
      ? OCEAN_LEVEL
      : Math.max(OCEAN_LEVEL, getTerrainHeight(rainCenter.x, rainCenter.z));
    this.rainSystem.update({
      visible: showRain,
      elapsed: this.elapsed,
      centerX: rainCenter.x,
      centerY: rainCenter.y,
      centerZ: rainCenter.z,
      groundY: rainGroundY,
      isStorm: this.weather === 'storm' || this.cinematicActive,
      isNight: sunElev < 0.05,
      densityScale: Math.min(1, this.effectiveParticleScale),
      showSplashes: !this.cinematicActive,
    });

    if (this.mode === 'playing' && !this.gameOver && !this.cinematicActive) {
      for (const st of this.structures) {
        if (st.type === 'drying_rack' && st.dryingSlots) {
          for (const slot of st.dryingSlots) {
            if (slot.quantity > 0 && slot.itemId && slot.progress < 1.0) {
              slot.progress += dt / 10;
              if (slot.progress > 1.0) slot.progress = 1.0;
            }
          }
        }
      }
    }
  }

  private updateCinematic(dt: number): void {
    // Advance smoothly from t=0 on first frame so frame-0 renders cleanly without skipping
    if (this.cinematicCameraInitialized) {
      this.cinematicTimer += dt;
    }
    const t = this.cinematicTimer;

    const frame = this.pirateCinematic.update(
      t,
      OCEAN_LEVEL,
      PLAYER_SPAWN,
      getTerrainHeight,
      this._cinematicPosTarget,
      this._cinematicLookTarget,
      {
        onCannonBoom: () => this.sound.playCannonBoom(),
        onHullCrack: () => this.sound.playStructuralCreak(),
        onWaterSeep: () => this.sound.playWaterRush(),
        onPlayerSplash: () => this.sound.playOceanSplash(),
        onShipBreakup: () => {
          this.sound.playCollapseCrash();
          this.sound.playExplosion();
        },
        onThunder: () => this.sound.playThunder(),
      },
    );

    if (frame.finished) {
      this.finishCinematic();
      return;
    }

    this.cinematicSubtitle = frame.subtitle;
    this.cinematicCrewShout = frame.crewShout;
    // Keep shipModel coordinates updated so storm rain & lightning center on the pirate galleon
    this.shipModel.position.set(frame.shipWorldX, OCEAN_LEVEL, frame.shipWorldZ);

    if (!this.cinematicCameraInitialized) {
      this.camera.position.copy(this._cinematicPosTarget);
      this._cinematicLookCurrent.copy(this._cinematicLookTarget);
      this.cinematicCameraInitialized = true;
    } else {
      const camAlpha = 1 - Math.exp(-7.5 * dt);
      const lookAlpha = 1 - Math.exp(-7.0 * dt);
      this.camera.position.lerp(this._cinematicPosTarget, camAlpha);
      this._cinematicLookCurrent.lerp(this._cinematicLookTarget, lookAlpha);
    }
    this.camera.lookAt(this._cinematicLookCurrent);

    const shoreProx = 1.0;
    this.sound.updateEnvironmentAmbience(
      this.elapsed,
      shoreProx,
      false,
      'storm',
      false,
      false,
    );
  }

  private updatePlayer(dt: number): void {
    if (this.actionCooldown > 0) this.actionCooldown -= dt;
    if (this.swingTimer > 0) this.swingTimer -= dt;
    if (this.recoilTimer > 0) this.recoilTimer -= dt;
    this.tickReload(dt);
    if (this.kickCooldown > 0) this.kickCooldown = Math.max(0, this.kickCooldown - dt);
    if (this.wallRunCooldown > 0) this.wallRunCooldown = Math.max(0, this.wallRunCooldown - dt);
    if (this.eatTimer > 0) {
      this.eatTimer = Math.max(0, this.eatTimer - dt);
      const progress = 1 - this.eatTimer / 0.92;
      const expectedBite = Math.floor(progress * 3);
      if (expectedBite > this.eatBiteCount && expectedBite <= 2) {
        this.eatBiteCount = expectedBite;
        const fwdX = -Math.sin(this.camYaw);
        const fwdZ = -Math.cos(this.camYaw);
        this.spawnParticles(
          this.playerX + fwdX * 0.45,
          this.playerY + this.currentEyeHeight - 0.16,
          this.playerZ + fwdZ * 0.45,
          parseInt(this.activeConsumeColor.replace('#', ''), 16) || 0xb91c1c,
          4,
        );
      }
    }
    if (this.drinkTimer > 0) this.drinkTimer = Math.max(0, this.drinkTimer - dt);
    if (this.washBottleTimer > 0)
      this.washBottleTimer = Math.max(0, this.washBottleTimer - dt);
    if (this.washMeatTimer > 0) {
      this.washMeatTimer = Math.max(0, this.washMeatTimer - dt);
      const washProgress = 1 - this.washMeatTimer / 1.85;
      const expectedStep = Math.floor(washProgress * 4);
      if (expectedStep > this.washMeatSplashStep && expectedStep <= 4) {
        this.washMeatSplashStep = expectedStep;
        const fwdX = -Math.sin(this.camYaw);
        const fwdZ = -Math.cos(this.camYaw);
        this.spawnParticles(
          this.playerX + fwdX * 0.9,
          this.playerY + 0.55,
          this.playerZ + fwdZ * 0.9,
          expectedStep % 2 === 0 ? 0xf8fafc : 0x7dd3fc,
          6,
        );
      }
    }
    if (this.cutMeatTimer > 0) {
      this.cutMeatTimer = Math.max(0, this.cutMeatTimer - dt);
      const cutProgress = 1 - this.cutMeatTimer / 1.45;
      const expectedSlice = Math.floor(cutProgress * 3);
      if (expectedSlice > this.cutMeatSliceStep && expectedSlice <= 3) {
        this.cutMeatSliceStep = expectedSlice;
        const fwdX = -Math.sin(this.camYaw);
        const fwdZ = -Math.cos(this.camYaw);
        this.spawnParticles(
          this.playerX + fwdX * 0.65,
          this.playerY + this.currentEyeHeight - 0.24,
          this.playerZ + fwdZ * 0.65,
          this.cutMeatIsDino ? 0x991b1b : 0xdc2626,
          5,
        );
      }
    }
    if (this.hurtFlash > 0) this.hurtFlash -= dt;
    if (this.totemFlashTimer > 0) {
      this.totemFlashTimer = Math.max(0, this.totemFlashTimer - dt);
    }
    if (this.coldWarnCooldown > 0) this.coldWarnCooldown -= dt;

    if (this.activeVehicleId) {
      this.updateActiveVehicleControl(dt);
      return;
    }

    if (this.mountedCreatureId) {
      this.updateMountedCreatureControl(dt);
      return;
    }

    // Smooth Obstacle Vaulting interpolation
    if (this.vaultTimer > 0) {
      this.vaultTimer = Math.max(0, this.vaultTimer - dt);
      const p = 1 - this.vaultTimer / this.vaultDuration;
      const ease = p * (2 - p);
      this.playerX = THREE.MathUtils.lerp(this.vaultStartX, this.vaultEndX, ease);
      this.playerZ = THREE.MathUtils.lerp(this.vaultStartZ, this.vaultEndZ, ease);
      const arcLift = Math.sin(p * Math.PI) * 0.65;
      this.playerY = THREE.MathUtils.lerp(this.vaultStartY, this.vaultEndY, ease) + arcLift;
      this.playerVelY = 0;
      this.grounded = this.vaultTimer <= 0;
      this.currentSpeedMps = 10.8;
      this.wallTiltAngle = THREE.MathUtils.damp(this.wallTiltAngle, 0, 12, dt);
      this.updateFirstPersonHands(1);
      this.probeTargetHitbox();
      this.nearbyInteraction = this.findNearbyInteraction();
      return;
    }

    let moveRight = 0;
    let moveForward = 0;
    if (this.keys['KeyW'] || this.keys['key_w'] || this.keys['ArrowUp']) moveForward += 1;
    if (this.keys['KeyS'] || this.keys['key_s'] || this.keys['ArrowDown']) moveForward -= 1;
    if (this.keys['KeyD'] || this.keys['key_d'] || this.keys['ArrowRight']) moveRight += 1;
    if (this.keys['KeyA'] || this.keys['key_a'] || this.keys['ArrowLeft']) moveRight -= 1;

    moveRight += this.joyX;
    moveForward += this.joyY;

    const inputMag = Math.min(1, Math.hypot(moveRight, moveForward));
    if (this.seatedState) {
      if (inputMag > 0.35) {
        this.standUp();
      } else {
        this.playerX = this.seatedState.x;
        this.playerZ = this.seatedState.z;
        this.playerY = this.seatedState.y - 0.6;
        this.playerVelY = 0;
        this.grounded = true;
        this.isSprinting = false;
        this.isCrouching = false;
        this.currentEyeHeight = 1.62;
        this.updateFirstPersonHands(0);
        this.nearbyInteraction = this.findNearbyInteraction();
        return;
      }
    }

    const isFlat = this.worldType === 'flat';
    const creativeNoNeeds = isFlat || this.gameMode === 'sandbox';

    const wantSprint =
      Boolean(
        this.keys['ShiftLeft'] ||
          this.keys['ShiftRight'] ||
          this.keys['key_shift'] ||
          this.touchSprint,
      ) &&
      inputMag > 0.25 &&
      !this.isCrouching &&
      (creativeNoNeeds || this.vitals.stamina > 2);

    this.isSprinting = wantSprint && !this.isSwimming;

    if (creativeNoNeeds) {
      this.vitals.health = this.vitals.maxHealth;
      this.vitals.hunger = this.vitals.maxHunger;
      this.vitals.thirst = this.vitals.maxThirst;
      this.vitals.stamina = this.vitals.maxStamina;
      this.vitals.temperatureC = 37.0;
    } else if (this.isSprinting) {
      this.vitals.stamina = Math.max(0, this.vitals.stamina - dt * 15);
    } else {
      this.vitals.stamina = Math.min(
        this.vitals.maxStamina,
        this.vitals.stamina + dt * 14,
      );
    }

    // Shelter, Fire, Cozy Base Living & Body Temperature Calculation
    const hdx = this.playerX - HILL_HOUSE_POS.x;
    const hdz = this.playerZ - HILL_HOUSE_POS.z;
    const inHilltopHouse =
      !isFlat && hdx >= -5.6 && hdx <= 5.6 && hdz >= -4.8 && hdz <= 8.8;
    let nearPlacedSmartTv = false;
    let sheltered = isFlat || inHilltopHouse;
    let nearFire = false;
    const tvPower = this.smartTv.power;
    for (let i = 0; i < this.structures.length; i++) {
      const s = this.structures[i];
      const sdx = s.x - this.playerX;
      const sdz = s.z - this.playerZ;
      const dSq = sdx * sdx + sdz * sdz;
      if (tvPower && !nearPlacedSmartTv && s.type === 'smart_tv' && dSq < 42.25) {
        nearPlacedSmartTv = true;
      } else if (!sheltered && s.type === 'basic_shelter' && dSq < 36) {
        sheltered = true;
      } else if (!nearFire && (s.type === 'campfire' || s.type === 'cooking_station') && dSq < 64) {
        nearFire = true;
      }
    }
    const sittingOnSofa = this.seatedState?.label === 'Relaxing on Sofa';

    const cozyActive = inHilltopHouse || sittingOnSofa || nearPlacedSmartTv;
    this.cozyComfortActive = cozyActive;
    this.cozyComfortLabel =
      (inHilltopHouse && this.smartTv.power) || nearPlacedSmartTv || sittingOnSofa
        ? 'Smart TV Lounge'
        : cozyActive
          ? 'Hilltop Sanctuary'
          : '';

    const sunElev = Math.sin((this.timeOfDay - 0.25) * Math.PI * 2);
    const isNight = sunElev < -0.05;

    if (!creativeNoNeeds) {
      if (cozyActive && !this.isSprinting) {
        this.vitals.stamina = Math.min(
          this.vitals.maxStamina,
          this.vitals.stamina + dt * 7,
        );
      }

      let targetTemp = 37.0;
      if (cozyActive) {
        targetTemp = nearFire ? 37.2 : 37.0;
      } else {
        if (this.worldType !== 'flat') {
          const bTemp = getBiomeAt(this.playerX, this.playerZ);
          if (
            bTemp === 'ice_spikes' ||
            bTemp === 'frozen_peaks' ||
            bTemp === 'jagged_peaks' ||
            bTemp === 'frozen_ocean' ||
            bTemp === 'frozen_river'
          ) {
            targetTemp -= 2.6;
          } else if (
            bTemp === 'snowy_taiga' ||
            bTemp === 'snowy_plains' ||
            bTemp === 'snowy_slopes' ||
            bTemp === 'grove' ||
            bTemp === 'snowy_beach' ||
            bTemp === 'cold_ocean'
          ) {
            targetTemp -= 2.0;
          } else if (
            bTemp === 'taiga' ||
            bTemp === 'old_growth_pine_taiga' ||
            bTemp === 'old_growth_spruce_taiga' ||
            bTemp === 'stony_peaks' ||
            bTemp === 'stony_shore' ||
            bTemp === 'windswept_hills' ||
            bTemp === 'windswept_gravelly_hills' ||
            bTemp === 'windswept_forest'
          ) {
            targetTemp -= 0.8;
          } else if (bTemp === 'pale_garden' || bTemp === 'dark_forest') {
            targetTemp -= bTemp === 'pale_garden' ? 0.6 : 0.5;
          } else if (
            bTemp === 'desert' ||
            bTemp === 'badlands' ||
            bTemp === 'wooded_badlands' ||
            bTemp === 'eroded_badlands'
          ) {
            targetTemp += 1.4;
          } else if (
            bTemp === 'savanna' ||
            bTemp === 'savanna_plateau' ||
            bTemp === 'windswept_savanna'
          ) {
            targetTemp += 0.8;
          } else if (
            bTemp === 'jungle' ||
            bTemp === 'sparse_jungle' ||
            bTemp === 'bamboo_jungle' ||
            bTemp === 'warm_ocean'
          ) {
            targetTemp += 0.4;
          }
        }
        if (isNight) targetTemp -= 1.5;
        if (this.weather === 'rain') targetTemp -= 1.3;
        if (this.weather === 'storm') targetTemp -= 2.6;
        if (this.isSwimming) targetTemp -= 2.4;
        if (sheltered) targetTemp += 1.8;
        if (nearFire) targetTemp += 3.8;
        if (this.isSprinting) targetTemp += 0.6;
      }
      targetTemp = THREE.MathUtils.clamp(targetTemp, 31.5, 37.8);
      this.vitals.temperatureC = THREE.MathUtils.damp(
        this.vitals.temperatureC,
        targetTemp,
        cozyActive ? 0.45 : 0.16,
        dt,
      );

      // Survival needs drain
      const drainScale = cozyActive ? 0.35 : sheltered ? 0.55 : 1.0;
      this.vitals.hunger = Math.max(
        0,
        this.vitals.hunger -
          dt * (0.26 + (this.isSprinting ? 0.2 : 0)) * drainScale,
      );
      this.vitals.thirst = Math.max(
        0,
        this.vitals.thirst -
          dt * (0.34 + (this.isSprinting ? 0.25 : 0)) * drainScale,
      );

      if (this.vitals.temperatureC < 34.0) {
        this.vitals.stamina = Math.max(0, this.vitals.stamina - dt * 4);
        if (this.coldWarnCooldown <= 0) {
          this.coldWarnCooldown = 18;
          this.toast(
            'Body temperature dropping! Warm up near a Campfire or Shelter.',
            'warning',
          );
        }
      }

      // Totem of Undying rapid regeneration OR modest well-fed passive healing
      if (this.totemRegenTimer > 0) {
        this.totemRegenTimer = Math.max(0, this.totemRegenTimer - dt);
        this.vitals.health = Math.min(
          this.vitals.maxHealth,
          this.vitals.health + dt * 15,
        );
      } else if (this.vitals.health <= 25) {
        this.checkAndTriggerTotemOfUndying();
      } else if (
        this.vitals.health < this.vitals.maxHealth &&
        this.vitals.hunger > 75 &&
        this.vitals.thirst > 65
      ) {
        this.vitals.health = Math.min(
          this.vitals.maxHealth,
          this.vitals.health + dt * 0.45,
        );
      }
    }

    // Terrain, Built Bridges/Decks & Swimming state
    const waterLevel = getWaterLevelAt(this.playerX, this.playerZ);
    const terrainY = getTerrainHeight(this.playerX, this.playerZ);
    const deckY = this.getStructuralSurfaceY(this.playerX, this.playerZ, this.playerY);
    const standingSurfaceY = Math.max(terrainY, deckY);
    this.isSwimming = !isFlat && standingSurfaceY < waterLevel - 0.45;

    const prevPlayerY = this.playerY;
    const wasGrounded = this.grounded;

    const activeBuff = this.grandFinalePlayer.activeBuff;
    const tikiSpeedMult =
      activeBuff && performance.now() < activeBuff.expiresAt
        ? activeBuff.speedBoost || 1
        : 1;
    // Responsive Minecraft-like pace: brisk 7.6 m/s walk, 10.8 m/s sprint, smooth analog scaling
    const analogWalkSpeed = THREE.MathUtils.lerp(4.2, 7.6, inputMag);
    let baseSpeed = this.dragonFlight.flying
      ? this.dragonFlight.flySpeed * 0.45
      : (this.isSwimming
          ? 5.0
          : this.wallRunTimer > 0
            ? 12.2
            : this.isSprinting
              ? 10.8
              : this.isCrouching
                ? 4.0
                : analogWalkSpeed) *
        (this.modSystem?.tweaks.moveSpeedMultiplier ?? 1) *
        tikiSpeedMult;

    if (this.flightAndTeleport.flying) {
      const ascendInput =
        (this.keys['Space'] || this.touchFlyAscend ? 1 : 0) -
        (this.keys['ShiftLeft'] ||
        this.keys['ShiftRight'] ||
        this.keys['KeyC'] ||
        this.keys['ControlLeft'] ||
        this.touchFlyDescend
          ? 1
          : 0);
      this.flightPlayerProxy.x = this.playerX;
      this.flightPlayerProxy.y = this.playerY;
      this.flightPlayerProxy.z = this.playerZ;
      this.flightPlayerProxy.mode =
        this.gameMode === 'sandbox' || this.worldType === 'flat' ? 'Creative' : 'Survival';
      this.flightAndTeleport.flySpeed = this.dragonFlight.flying
        ? Math.max(32, this.dragonFlight.flySpeed * 0.85)
        : 32;

      const prevX = this.playerX;
      const prevZ = this.playerZ;
      this.flightAndTeleport.updateFlight(dt, {
        forward: moveForward,
        strafe: moveRight,
        ascend: ascendInput,
        yaw: -this.camYaw,
        pitch: this.camPitch,
        aimFlight: false,
        boost: this.isSprinting,
      });

      const maxRadius = getPlayableMaxRadius();
      const rad = Math.hypot(this.flightPlayerProxy.x, this.flightPlayerProxy.z);
      if (rad > maxRadius && rad > 0.001) {
        this.flightPlayerProxy.x *= maxRadius / rad;
        this.flightPlayerProxy.z *= maxRadius / rad;
      }
      this.flightPlayerProxy.y = Math.min(this.flightPlayerProxy.y, 175);

      this.playerX = this.flightPlayerProxy.x;
      this.playerY = this.flightPlayerProxy.y;
      this.playerZ = this.flightPlayerProxy.z;
      this.playerVelY = 0;
      this.grounded = false;
      this.isSwimming = false;
      this.wallRunTimer = 0;
      this.wallRunSide = 0;
      this.wallTiltAngle = THREE.MathUtils.damp(this.wallTiltAngle, 0, 10, dt);
      this.camStepOffsetY = 0;
      this.currentSpeedMps =
        Math.hypot(this.playerX - prevX, this.playerZ - prevZ) / Math.max(0.001, dt);
      this.markExploredAroundPlayer();

      this.currentEyeHeight = THREE.MathUtils.damp(this.currentEyeHeight, 1.62, 10, dt);
      return;
    }

    if (inputMag > 0.08) {
      const fwdX = -Math.sin(this.camYaw);
      const fwdZ = -Math.cos(this.camYaw);
      const rightX = Math.cos(this.camYaw);
      const rightZ = -Math.sin(this.camYaw);

      const dirX = fwdX * moveForward + rightX * moveRight;
      const dirZ = fwdZ * moveForward + rightZ * moveRight;
      const len = Math.hypot(dirX, dirZ) || 1;
      const nx = dirX / len;
      const nz = dirZ / len;

      const stepUpAllowance = Math.max(0.55, baseSpeed * inputMag * dt * 1.4);
      const maxClimbSlope = this.grounded ? 2.15 : 2.4;
      const canStep = (tx: number, tz: number): boolean => {
        if (this.isSwimming || isFlat) return true;
        const th = Math.max(
          getTerrainHeight(tx, tz),
          this.getStructuralSurfaceY(tx, tz, this.playerY),
        );
        if (th <= standingSurfaceY + stepUpAllowance) return true;
        return getTerrainSlope(tx, tz) <= maxClimbSlope;
      };

      const lookAheadX = this.playerX + nx * baseSpeed * inputMag * dt;
      const lookAheadZ = this.playerZ + nz * baseSpeed * inputMag * dt;
      const lookAheadSurfY = isFlat
        ? standingSurfaceY
        : Math.max(
            getTerrainHeight(lookAheadX, lookAheadZ),
            this.getStructuralSurfaceY(lookAheadX, lookAheadZ, this.playerY),
          );
      const stepSlope = isFlat ? 0 : getTerrainSlope(lookAheadX, lookAheadZ);
      // Only gently slow steep UPHILL climbing — never penalize downhill or flat walking
      if (
        !this.isSwimming &&
        !creativeNoNeeds &&
        lookAheadSurfY > standingSurfaceY + 0.02 &&
        stepSlope > 1.05 &&
        deckY < -900
      ) {
        baseSpeed *= 0.82;
        this.vitals.stamina = Math.max(0, this.vitals.stamina - dt * 3);
      }

      const stepX = nx * baseSpeed * inputMag * dt;
      const stepZ = nz * baseSpeed * inputMag * dt;
      let nextX = this.playerX + stepX;
      let nextZ = this.playerZ + stepZ;

      // Axis-separated slope check so character always slides smoothly along cliffs
      if (!canStep(nextX, nextZ)) {
        const allowX = canStep(nextX, this.playerZ);
        const allowZ = canStep(this.playerX, nextZ);
        if (!allowX) nextX = this.playerX;
        if (!allowZ) nextZ = this.playerZ;
      }

      // Playable World Boundary
      const maxRadius = getPlayableMaxRadius();
      const rad = Math.hypot(nextX, nextZ);
      if (rad > maxRadius) {
        nextX *= maxRadius / rad;
        nextZ *= maxRadius / rad;
      }

      // O(1) Spatial Hash Grid collision detection (skip Island colliders in Flat World)
      if (!isFlat) {
        const cx = Math.floor(nextX / 16);
        const cz = Math.floor(nextZ / 16);
        for (let ox = -1; ox <= 1; ox++) {
          for (let oz = -1; oz <= 1; oz++) {
            const cell = this.colliderGrid.get((cx + ox + 2048) * 4096 + (cz + oz + 2048));
            if (!cell) continue;
            for (let ci = 0; ci < cell.length; ci++) {
              const col = cell[ci];
              let activeRadius = col.radius;
              if (col.nodeId) {
                const node = this.nodeById.get(col.nodeId);
                if (node && node.hp <= 0) {
                  if (!node.felled) continue;
                  activeRadius *= 0.65;
                }
              }
              const cdx = nextX - col.x;
              const cdz = nextZ - col.z;
              const minD = activeRadius + 0.42;
              const distSq = cdx * cdx + cdz * cdz;
              if (distSq < minD * minD && distSq > 0.000001) {
                const dist = Math.sqrt(distSq);
                nextX = col.x + (cdx / dist) * minD;
                nextZ = col.z + (cdz / dist) * minD;
              }
            }
          }
        }
      }
      for (let i = 0; i < this.structures.length; i++) {
        const st = this.structures[i];
        if (st.type === 'sleeping_area' || st.type === 'basic_shelter') continue;
        const cdx = nextX - st.x;
        const cdz = nextZ - st.z;
        const distSq = cdx * cdx + cdz * cdz;
        const minD = 0.88;
        if (distSq < minD * minD && distSq > 0.000001) {
          const dist = Math.sqrt(distSq);
          nextX = st.x + (cdx / dist) * minD;
          nextZ = st.z + (cdz / dist) * minD;
        }
      }
      // Solid structural block & pillar wall collisions (allow walking under stone arches & atop decks)
      for (const b of this.structuralBlocks) {
        if (b.kind === 'stone_arch' || b.kind === 'timber_beam') continue;
        if (this.playerY >= b.y + STRUCT_GRID_Y - 0.55) continue;
        if (this.playerY + 1.55 < b.y || this.playerY > b.y + STRUCT_GRID_Y) continue;
        const spec = STRUCTURAL_SPECS[b.kind];
        const halfBox = (spec.isPillar ? 0.56 : 1.18) + 0.34;
        const dxB = nextX - b.x;
        const dzB = nextZ - b.z;
        if (Math.abs(dxB) < halfBox && Math.abs(dzB) < halfBox) {
          const overlapX = halfBox - Math.abs(dxB);
          const overlapZ = halfBox - Math.abs(dzB);
          if (overlapX < overlapZ) {
            nextX += dxB >= 0 ? overlapX : -overlapX;
          } else {
            nextZ += dzB >= 0 ? overlapZ : -overlapZ;
          }
        }
      }

      const actualMoveDist = Math.hypot(nextX - this.playerX, nextZ - this.playerZ);
      this.currentSpeedMps = actualMoveDist / Math.max(0.001, dt);
      this.playerX = nextX;
      this.playerZ = nextZ;
      this.markExploredAroundPlayer();

      const activeMoveRatio =
        actualMoveDist > 0.0005 ? Math.min(1.2, this.currentSpeedMps / 7.6) : 0;
      this.walkBobPhase += dt * (this.isSprinting ? 13.5 : 9.6) * activeMoveRatio;
      this.footstepAccum += actualMoveDist;
      if (this.grounded && actualMoveDist > 0.001 && this.footstepAccum > (this.isSprinting ? 2.85 : 2.3)) {
        this.footstepAccum = 0;
        if (isFlat) {
          this.sound.playFootstep(
            this.flatSurfaceStyle === 'concrete_plaza' ? 'rock' : 'grass',
          );
        } else {
          const b = getBiomeAt(this.playerX, this.playerZ);
          if (deckY > terrainY + 0.1) {
            this.sound.playFootstep('rock');
          } else if (this.isSwimming || terrainY < waterLevel) {
            this.sound.playFootstep('water');
          } else if (b === 'beach') {
            this.sound.playFootstep('sand');
          } else if (b === 'mountain' || b === 'cave') {
            this.sound.playFootstep('rock');
          } else {
            this.sound.playFootstep('grass');
          }
        }
      }
    } else {
      this.currentSpeedMps = 0;
    }

    // Wall-Running detection alongside steep cliffs, cavern walls & tall masonry blocks
    let detectedSide: -1 | 0 | 1 = 0;
    let detectedNormX = 0;
    let detectedNormZ = 0;
    if (
      !this.isSwimming &&
      !this.isCrouching &&
      this.wallRunCooldown <= 0 &&
      inputMag > 0.35 &&
      (!this.grounded || this.isSprinting)
    ) {
      const rightX = Math.cos(this.camYaw);
      const rightZ = -Math.sin(this.camYaw);
      const checkWall = (side: -1 | 1): boolean => {
        const px = this.playerX + rightX * side * 1.15;
        const pz = this.playerZ + rightZ * side * 1.15;
        if (!isFlat) {
          // 1. Steep cliff or mountain cavern slope wall
          const wh = getTerrainHeight(px, pz);
          if (wh >= this.playerY + 0.95 && getTerrainSlope(px, pz) >= 1.15) {
            detectedNormX = -rightX * side;
            detectedNormZ = -rightZ * side;
            return true;
          }
          // 2. Large cliff / cavern rock / house wall collider (O(1) Spatial Hash lookup)
          const wcx = Math.floor(px / 16);
          const wcz = Math.floor(pz / 16);
          for (let ox = -1; ox <= 1; ox++) {
            for (let oz = -1; oz <= 1; oz++) {
              const cell = this.colliderGrid.get((wcx + ox + 2048) * 4096 + (wcz + oz + 2048));
              if (!cell) continue;
              for (let ci = 0; ci < cell.length; ci++) {
                const col = cell[ci];
                if (col.radius < 1.1) continue;
                const ddx = px - col.x;
                const ddz = pz - col.z;
                const lim = col.radius + 0.45;
                if (ddx * ddx + ddz * ddz <= lim * lim) {
                  const nx = this.playerX - col.x;
                  const nz = this.playerZ - col.z;
                  const nl = Math.hypot(nx, nz) || 1;
                  detectedNormX = nx / nl;
                  detectedNormZ = nz / nl;
                  return true;
                }
              }
            }
          }
        }
        // 3. Structural block wall beside player
        for (const b of this.structuralBlocks) {
          if (this.playerY + 1.5 < b.y || this.playerY > b.y + STRUCT_GRID_Y + 0.2) continue;
          if (Math.abs(px - b.x) < 1.35 && Math.abs(pz - b.z) < 1.35) {
            detectedNormX = -rightX * side;
            detectedNormZ = -rightZ * side;
            return true;
          }
        }
        return false;
      };
      if (checkWall(1)) detectedSide = 1;
      else if (checkWall(-1)) detectedSide = -1;
    }

    if (detectedSide !== 0) {
      if (this.wallRunTimer <= 0) {
        this.wallRunTimer = 1.45;
      } else {
        this.wallRunTimer = Math.max(0, this.wallRunTimer - dt);
      }
      this.wallRunSide = detectedSide;
      this.wallRunNormX = detectedNormX;
      this.wallRunNormZ = detectedNormZ;
      this.wallRunStepAccum += dt;
      if (this.wallRunStepAccum >= 0.22) {
        this.wallRunStepAccum = 0;
        this.sound.playWallRunStep();
        this.spawnParticles(
          this.playerX - detectedNormX * 0.55,
          this.playerY + 0.9,
          this.playerZ - detectedNormZ * 0.55,
          0xa8a29e,
          2,
        );
      }
    } else {
      this.wallRunTimer = 0;
      this.wallRunSide = 0;
    }

    const targetTilt = this.wallRunSide * -0.145;
    this.wallTiltAngle = THREE.MathUtils.damp(this.wallTiltAngle, targetTilt, 10, dt);

    // Clamp player to planetary exploration disc while on an off-world planet
    if (this.inSpacePlanet) {
      const distSq = this.playerX * this.playerX + this.playerZ * this.playerZ;
      if (distSq > 88 * 88) {
        const d = Math.sqrt(distSq);
        this.playerX = (this.playerX / d) * 88;
        this.playerZ = (this.playerZ / d) * 88;
      }
    }

    // Vertical physics / swimming buoyancy + walkable engineered bridges & roofs + wall-run gravity damping
    const newTerrainY = this.inSpacePlanet ? 0 : getTerrainHeight(this.playerX, this.playerZ);
    const newDeckY = this.inSpacePlanet
      ? -999
      : this.getStructuralSurfaceY(this.playerX, this.playerZ, this.playerY);
    const newSurfaceY = Math.max(newTerrainY, newDeckY);
    const newWaterY = this.inSpacePlanet ? -999 : getWaterLevelAt(this.playerX, this.playerZ);
    this.isSwimming = !this.inSpacePlanet && !isFlat && newSurfaceY < newWaterY - 0.45;
    if (this.dragonFlight.flying) {
      const ascend = this.keys['Space'] ? 1 : 0;
      const descend =
        this.keys['ShiftLeft'] || this.keys['ShiftRight'] || this.keys['KeyC'] ? 1 : 0;
      const flyVert = (ascend - descend) * 16.0;
      const floorY = Math.max(newSurfaceY, newWaterY) + 1.8;
      const hoverBob = ascend === 0 && descend === 0 ? Math.sin(this.elapsed * 3.2) * 0.04 : 0;
      this.playerY = THREE.MathUtils.clamp(this.playerY + flyVert * dt + hoverBob, floorY, 155);
      this.playerVelY = 0;
      this.grounded = false;
      this.isSwimming = false;
    } else if (this.isSwimming) {
      const swimTargetY = newWaterY - 0.72 + Math.sin(this.elapsed * 3.5) * 0.06;
      this.playerY = THREE.MathUtils.damp(this.playerY, swimTargetY, 8, dt);
      this.playerVelY = 0;
      this.grounded = false;
      this.wallRunTimer = 0;
      this.wallRunSide = 0;
    } else if (this.wallRunTimer > 0) {
      // Wall-run holds elevation cleanly with very light gravity drop
      this.playerVelY = Math.max(this.playerVelY - 4.2 * dt, -0.35);
      this.playerY += this.playerVelY * dt;
      if (this.playerY <= newSurfaceY) {
        this.playerY = newSurfaceY + 0.12;
        this.playerVelY = 0.8;
      }
      this.grounded = false;
    } else {
      const planetGrav = this.inSpacePlanet ? this.spaceGravity : 1.0;
      const gravMult =
        this.gravityScale * (this.modSystem?.tweaks.gravityMultiplier ?? 1) * planetGrav;
      this.playerVelY -= 21 * gravMult * dt;
      this.playerY += this.playerVelY * dt;
      if (!Number.isFinite(this.playerY) || this.playerY <= newSurfaceY) {
        this.playerY = newSurfaceY;
        this.playerVelY = 0;
        this.grounded = true;
      } else if (
        wasGrounded &&
        this.playerVelY <= 0 &&
        this.playerY - newSurfaceY <= 0.48
      ) {
        // Keep feet planted cleanly when walking down slopes/ramps instead of micro-floating & bouncing
        this.playerY = newSurfaceY;
        this.playerVelY = 0;
        this.grounded = true;
      } else if (this.playerY > newSurfaceY + 0.04) {
        this.grounded = false;
      }
    }

    // Smooth camera step offset when walking cleanly across steps, decks, and uneven terrain seams
    if (wasGrounded && this.grounded && !this.isSwimming && Number.isFinite(prevPlayerY)) {
      const stepDeltaY = this.playerY - prevPlayerY;
      if (Math.abs(stepDeltaY) > 0.025 && Math.abs(stepDeltaY) <= 0.65) {
        this.camStepOffsetY = THREE.MathUtils.clamp(
          this.camStepOffsetY - stepDeltaY,
          -0.55,
          0.55,
        );
      }
    } else if (!this.grounded && this.playerVelY > 0.1) {
      this.camStepOffsetY = 0;
    }

    // Smooth Crouch Eye Height
    const targetEye = this.isSwimming
      ? 1.1
      : this.isCrouching
        ? 1.02
        : 1.62;
    this.currentEyeHeight = THREE.MathUtils.damp(
      this.currentEyeHeight,
      targetEye,
      10,
      dt,
    );

    // Biome & Homestead discovery tracking (Island World only)
    const currentBiome = getBiomeAt(this.playerX, this.playerZ);
    if (!isFlat) {
      if (!this.visitedBiomes.has(currentBiome)) {
        this.visitedBiomes.add(currentBiome);
        this.toast(`Discovered ${BIOME_INFO[currentBiome].name}`, 'discovery');
        this.evaluateMissions();
      }
      if (
        !this.discoveredLocations.has('homestead_pasture') &&
        Math.hypot(this.playerX - HOMESTEAD_POS.x, this.playerZ - HOMESTEAD_POS.z) < 22
      ) {
        this.discoveredLocations.add('homestead_pasture');
        this.toast('Discovered Homestead Pasture & Barnyard', 'discovery');
      }
      if (
        !this.discoveredLocations.has('snowy_woodland') &&
        Math.hypot(this.playerX - SNOWY_WOODLAND_POS.x, this.playerZ - SNOWY_WOODLAND_POS.z) < 16
      ) {
        this.discoveredLocations.add('snowy_woodland');
        this.toast('Discovered Snowy Highland Woodland', 'discovery');
      }
      if (
        !this.discoveredLocations.has('autumn_grove') &&
        Math.hypot(this.playerX - AUTUMN_GROVE_POS.x, this.playerZ - AUTUMN_GROVE_POS.z) < 14
      ) {
        this.discoveredLocations.add('autumn_grove');
        this.toast('Discovered Autumn Forest Undergrowth', 'discovery');
      }
      if (
        !this.discoveredLocations.has('murky_swamp') &&
        Math.hypot(this.playerX - SWAMP_POS.x, this.playerZ - SWAMP_POS.z) < SWAMP_POS.radius + 4
      ) {
        this.discoveredLocations.add('murky_swamp');
        this.toast('Discovered Murky Jungle Swamp', 'discovery');
      }
    }

    // Update First-Person Hands & Held Tool Visuals
    this.updateFirstPersonHands(inputMag);

    // Auto-collect physical resource pickups when walking directly over them (only once settled on ground)
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      if (
        !p.collected &&
        p.currentY === undefined &&
        (p.autoCollectDelay ?? 0) <= 0 &&
        Math.hypot(p.x - this.playerX, p.z - this.playerZ) < 1.35
      ) {
        this.collectPickup(p.id);
      }
    }

    // Throttled crosshair target hitbox & nearby contextual interaction (12Hz — eliminates 80%+ raycast/scan spikes)
    this.interactionProbeTimer += dt;
    if (this.interactionProbeTimer >= 0.083) {
      this.interactionProbeTimer = 0;
      if (!isFlat) {
        this.probeTargetHitbox();
      } else {
        this.targetHitbox = null;
      }
      this.nearbyInteraction = this.findNearbyInteraction();
    }

    // Update environment audio & Player Visibility (daylight, weather, campfire glow, stealth crouch, sprint)
    const shoreDist = Math.abs(Math.hypot(this.playerX, this.playerZ) - 125);
    const shoreProx = isFlat ? 0 : THREE.MathUtils.clamp(1 - shoreDist / 45, 0, 1);
    const daylight = THREE.MathUtils.clamp((sunElev + 0.16) / 0.65, 0, 1);
    const weatherVis =
      this.weather === 'storm' ? -0.14 : this.weather === 'rain' ? -0.09 : 0;
    let vis = 0.24 + daylight * 0.72 + weatherVis;
    if (nearFire) vis += 0.36;
    if (this.isCrouching) vis *= 0.58;
    if (this.isSprinting) vis += 0.16;
    this.playerVisibility = THREE.MathUtils.clamp(vis, 0.18, 1.0);

    this.sound.updateEnvironmentAmbience(
      this.elapsed,
      shoreProx,
      nearFire,
      isFlat ? 'clear' : this.weather,
      daylight > 0.35,
      !isFlat && currentBiome === 'forest',
    );
  }

  private probeTargetHitbox(): void {
    _probeOrigin.set(
      this.playerX,
      this.playerY + this.currentEyeHeight,
      this.playerZ,
    );
    _probeEuler.set(this.camPitch, this.camYaw, 0, 'YXZ');
    _probeDir.set(0, 0, -1).applyEuler(_probeEuler).normalize();

    const hit = raycastCreatureZone(
      _probeOrigin,
      _probeDir,
      38,
      this.creatures.creatures,
      0.14,
    );
    const structHit =
      this.currentDimension === 'overworld'
        ? this.structureManager.raycastEntities(_probeOrigin, _probeDir, 38, true)
        : null;

    if (structHit && (!hit || structHit.distance < hit.distance)) {
      const se = structHit.entity;
      this.targetHitbox = {
        creatureId: se.id,
        name: se.displayName,
        hp: se.hp,
        maxHp: se.maxHp,
        zone: 'chest',
        armorTier: 'none',
        armorHp: 0,
        armorMaxHp: 0,
        isGapSlip: false,
        reactionHint:
          se.type === 'villager'
            ? se.canTrade
              ? 'Press E to Trade'
              : 'Friendly Villager'
            : `${structHit.site.name} Defender`,
        blinded: false,
        staggered: false,
        isBoss: se.type === 'evoker',
        distance: structHit.distance,
      };
      return;
    }

    if (!hit) {
      this.targetHitbox = null;
      return;
    }

    const c = this.creatures.creatures.find((cr) => cr.id === hit.creatureId);
    if (!c) {
      this.targetHitbox = null;
      return;
    }

    const eqId = this.getEquippedItemId();
    const eqDef = eqId ? ITEMS[eqId] : null;
    const weaponClass: WeaponMaterialClass | null =
      isActiveWeaponItem(eqId) && eqDef
        ? eqDef.weaponClass || 'blunt_light'
        : null;
    const zoneState = c.zoneArmor[hit.zone];
    const reactionHint = evaluateWeaponEffectivenessLabel(
      weaponClass,
      hit.zone,
      zoneState.tier,
      zoneState.hp,
      hit.isGapSlip,
    );

    this.targetHitbox = {
      creatureId: c.id,
      name: c.displayNameOverride || c.spec.displayName,
      hp: c.hp,
      maxHp: c.maxHp,
      zone: hit.zone,
      armorTier: zoneState.tier,
      armorHp: zoneState.hp,
      armorMaxHp: zoneState.maxHp,
      isGapSlip: hit.isGapSlip,
      reactionHint,
      blinded: c.blindTimer > 0,
      staggered: c.stunTimer > 0,
      isBoss: c.isBoss,
      distance: hit.distance,
    };
  }

  private tryTriggerVault(): boolean {
    if (this.vaultTimer > 0 || this.isSwimming || !this.world) return false;
    const fwdX = -Math.sin(this.camYaw);
    const fwdZ = -Math.cos(this.camYaw);

    // 1. Vault over medium obstacles (logs, crates, rocks, fences) directly ahead (Island World only) via 16m spatial hash
    if (this.worldType === 'island') {
      const baseCx = Math.floor(this.playerX / 16);
      const baseCz = Math.floor(this.playerZ / 16);
      for (let gdx = -1; gdx <= 1; gdx++) {
        for (let gdz = -1; gdz <= 1; gdz++) {
          const bucket = this.colliderGrid.get((baseCx + gdx + 2048) * 4096 + (baseCz + gdz + 2048));
          if (!bucket) continue;
          for (let ci = 0; ci < bucket.length; ci++) {
            const col = bucket[ci];
            if (col.radius > 1.38) continue;
            const chdx = col.x - HILL_HOUSE_POS.x;
            const chdz = col.z - HILL_HOUSE_POS.z;
            if (chdx >= -6.2 && chdx <= 6.8 && chdz >= -4.8 && chdz <= 9.0) continue;
            const dx = col.x - this.playerX;
            const dz = col.z - this.playerZ;
            const maxD = col.radius + 1.55;
            const distSq = dx * dx + dz * dz;
            if (distSq > maxD * maxD || distSq < 0.2025) continue;
            const dist = Math.sqrt(distSq);
            const dot = (dx * fwdX + dz * fwdZ) / (dist || 1);
            if (dot < 0.48) continue;

            const endX = col.x + fwdX * (col.radius + 0.95);
            const endZ = col.z + fwdZ * (col.radius + 0.95);
            const endY = Math.max(
              getTerrainHeight(endX, endZ),
              this.getStructuralSurfaceY(endX, endZ, this.playerY + 2.4),
            );
            if (endY - this.playerY > 2.35 || endY - this.playerY < -2.6) continue;

            this.vaultStartX = this.playerX;
            this.vaultStartY = this.playerY;
            this.vaultStartZ = this.playerZ;
            this.vaultEndX = endX;
            this.vaultEndY = endY;
            this.vaultEndZ = endZ;
            this.vaultTimer = this.vaultDuration;
            this.isCrouching = false;
            this.touchCrouch = false;
            this.sound.playWallRunStep();
            this.toast('Obstacle Vault!', 'info');
            return true;
          }
        }
      }
    }

    // 2. Vault onto waist-to-chest cliff ledges or engineered stone/timber blocks
    for (const probeDist of [1.25, 1.85]) {
      const px = this.playerX + fwdX * probeDist;
      const pz = this.playerZ + fwdZ * probeDist;
      const surfY = Math.max(
        getTerrainHeight(px, pz),
        this.getStructuralSurfaceY(px, pz, this.playerY + 2.6),
      );
      const rise = surfY - this.playerY;
      if (rise >= 0.48 && rise <= 2.35) {
        this.vaultStartX = this.playerX;
        this.vaultStartY = this.playerY;
        this.vaultStartZ = this.playerZ;
        this.vaultEndX = px + fwdX * 0.45;
        this.vaultEndY = surfY;
        this.vaultEndZ = pz + fwdZ * 0.45;
        this.vaultTimer = this.vaultDuration;
        this.isCrouching = false;
        this.touchCrouch = false;
        this.sound.playWallRunStep();
        this.toast('Ledge Vault!', 'info');
        return true;
      }
    }

    return false;
  }

  public triggerDebrisKick(): void {
    this.sound.unlock();
    if (
      this.mode !== 'playing' ||
      !canProcessGameplayInput(this.masterRuntime) ||
      this.gameOver ||
      this.cinematicActive ||
      this.kickCooldown > 0
    ) {
      return;
    }
    if (this.seatedState) {
      this.standUp();
    }

    this.kickCooldown = 1.6;
    this.sound.playDebrisKick();

    _probeOrigin.set(
      this.playerX,
      this.playerY + this.currentEyeHeight * 0.62,
      this.playerZ,
    );
    _probeEuler.set(this.camPitch, this.camYaw, 0, 'YXZ');
    _probeDir.set(0, 0, -1).applyEuler(_probeEuler).normalize();

    this.spawnParticles(
      _probeOrigin.x + _probeDir.x * 0.9,
      this.playerY + 0.25,
      _probeOrigin.z + _probeDir.z * 0.9,
      0xa8a29e,
      10,
    );

    // Close-quarters kick shockwave immediately blinds foes in front
    let blindedAny = false;
    for (const c of this.creatures.creatures) {
      if (!c.alive || !c.cycleActive) continue;
      const dx = c.x - this.playerX;
      const dz = c.z - this.playerZ;
      const dist = Math.hypot(dx, dz);
      if (dist <= 3.6 && Math.abs(c.y - this.playerY) <= 3.2) {
        const dot = (dx * _probeDir.x + dz * _probeDir.z) / (dist || 1);
        if (dot > 0.28 || dist < 1.7) {
          this.creatures.blindCreature(c, 3.0, this.playerX, this.playerZ, 1.5);
          blindedAny = true;
          this.toast(
            `Kicked Debris in ${c.displayNameOverride || c.spec.displayName}'s Face — BLINDED!`,
            'craft',
          );
        }
      }
    }

    // Launch 6 high-velocity gravel & stone chunks along aim vector (pooled)
    for (let i = 0; i < 6; i++) {
      const mesh =
        this.debrisMeshPool.pop() ?? new THREE.Mesh(this.debrisGeo, this.debrisMat);
      mesh.scale.setScalar(0.9 + (i % 2) * 0.3);
      const px = _probeOrigin.x + _probeDir.x * 0.8 + (Math.random() - 0.5) * 0.32;
      const py = _probeOrigin.y + _probeDir.y * 0.8 + (Math.random() - 0.5) * 0.22;
      const pz = _probeOrigin.z + _probeDir.z * 0.8 + (Math.random() - 0.5) * 0.32;
      mesh.position.set(px, py, pz);
      mesh.visible = true;
      this.scene.add(mesh);

      const sx = (Math.random() - 0.5) * 0.16;
      const sy = 0.08 + (Math.random() - 0.5) * 0.12;
      const sz = (Math.random() - 0.5) * 0.16;
      const vel = _vec3C
        .copy(_probeDir)
        .add(_vec3D.set(sx, sy, sz))
        .normalize()
        .multiplyScalar(17.5);
      const pooledDebris = this.debrisEntryPool.pop();
      if (pooledDebris) {
        pooledDebris.mesh = mesh;
        pooledDebris.pos.set(px, py, pz);
        pooledDebris.vel.set(vel.x, vel.y, vel.z);
        pooledDebris.life = 0.95;
        this.debrisProjectiles.push(pooledDebris);
      } else {
        this.debrisProjectiles.push({
          mesh,
          pos: new THREE.Vector3(px, py, pz),
          vel: new THREE.Vector3(vel.x, vel.y, vel.z),
          life: 0.95,
        });
      }
    }

    if (!blindedAny) {
      this.emitHud();
    }
  }

  private damageCaveCeiling(cc: CaveCeilingCluster, amount: number): void {
    if (cc.collapsed || cc.falling) return;
    cc.hp = Math.max(0, cc.hp - amount);
    this.spawnParticles(cc.x, cc.y - 0.7, cc.z, 0xf97316, 8);
    if (cc.hp <= 0) {
      cc.falling = true;
      cc.velY = 2.0;
      this.toast('Cave Ceiling Cracking — Watch Out Below!', 'warning');
    } else {
      this.sound.playGather('stone', 0.4);
      this.toast(
        `Cave Stalactites Cracked (${Math.ceil(cc.hp)}/${cc.maxHp})`,
        'info',
      );
    }
  }

  private updateFirstPersonHands(inputMag: number): void {
    const eqId = this.getEquippedItemId();
    const eqDef = eqId ? ITEMS[eqId] : null;
    const isEating = this.eatTimer > 0;
    const isDrinking = this.drinkTimer > 0;
    const isWashing = this.washBottleTimer > 0;
    const isWashingMeat = this.washMeatTimer > 0;
    const isCuttingMeat = this.cutMeatTimer > 0;
    const isBottleEquipped =
      eqId === 'dirty_water_bottle' || eqId === 'filtered_water_bottle';
    const isSoapEquipped = eqId === 'soap';
    const isHeldPrepMeat =
      eqId === 'raw_meat' ||
      eqId === 'dino_meat' ||
      eqId === 'washed_meat' ||
      eqId === 'washed_dino_meat' ||
      eqId === 'dried_raw_meat' ||
      eqId === 'dried_dino_meat';
    const isFoodHeld = Boolean(
      eqDef && eqDef.category === 'food' && eqId !== 'filtered_water_bottle',
    );

    const showConsumable =
      !isWashingMeat &&
      !isCuttingMeat &&
      (isEating || isDrinking || isWashing || isBottleEquipped || isFoodHeld);
    const isGun =
      !showConsumable && !isWashingMeat && !isCuttingMeat && isFirearmItem(eqId);
    const hasTool = Boolean(
      isCuttingMeat ||
        (!showConsumable &&
          !isWashingMeat &&
          eqId &&
          (isActiveWeaponItem(eqId) ||
            ITEMS[eqId].category === 'tool' ||
            eqId === 'fishing_rod' ||
            eqId === 'lasso')),
    );

    this.handsRig.toolGroup.visible = hasTool;
    this.handsRig.gunMesh.visible = isGun;
    this.handsRig.setFirearmGrip(isGun);
    if (isGun && eqId) {
      const gunSpec = FIREARM_SPECS[eqId];
      if (gunSpec?.soundProfile === 'sniper' || gunSpec?.soundProfile === 'musket') {
        this.handsRig.gunMesh.scale.set(1.06, 1.06, 1.85);
      } else if (
        gunSpec?.soundProfile === 'rifle' ||
        gunSpec?.soundProfile === 'shotgun' ||
        gunSpec?.soundProfile === 'lmg'
      ) {
        this.handsRig.gunMesh.scale.set(1.08, 1.08, 1.55);
      } else if (gunSpec?.soundProfile === 'smg') {
        this.handsRig.gunMesh.scale.set(1.04, 1.0, 1.24);
      } else {
        this.handsRig.gunMesh.scale.set(1, 1, 1);
      }
      this.applyExchangeCosmetics(false);
    } else {
      this.handsRig.gunMesh.scale.set(1, 1, 1);
    }
    this.handsRig.shaft.visible =
      !isCuttingMeat && !isGun && hasTool && eqId !== 'hunting_knife';
    this.handsRig.axeHead.visible =
      !isCuttingMeat &&
      !isGun &&
      (eqId === 'stone_axe' || eqId === 'stone_pickaxe' || eqId === 'excavator_shovel');
    this.handsRig.spearTip.visible =
      !isCuttingMeat && !isGun && eqId === 'wooden_spear';
    this.handsRig.knifeBlade.visible =
      isCuttingMeat || (!isGun && eqId === 'hunting_knife');
    this.handsRig.clubHead.visible = !isCuttingMeat && !isGun && eqId === 'wooden_club';
    this.handsRig.bowArc.visible = !isCuttingMeat && !isGun && eqId === 'primitive_bow';
    this.handsRig.rodTip.visible =
      !isCuttingMeat &&
      !isGun &&
      (eqId === 'fishing_rod' || eqId === 'rope_whip' || eqId === 'lasso');
    this.handsRig.sickleBlade.visible = !isCuttingMeat && !isGun && eqId === 'sickle';
    this.handsRig.warhammerHead.visible =
      !isCuttingMeat && !isGun && eqId === 'stone_warhammer';

    this.handsRig.consumableGroup.visible = showConsumable;
    this.handsRig.foodMesh.visible =
      isEating || (!isDrinking && !isWashing && !isBottleEquipped && isFoodHeld);
    this.handsRig.bottleGroup.visible =
      !this.handsRig.foodMesh.visible && showConsumable;
    this.handsRig.soapMesh.visible = isWashingMeat || (!isCuttingMeat && isSoapEquipped);
    this.handsRig.leftMeatGroup.visible =
      isWashingMeat || isCuttingMeat || isHeldPrepMeat;
    this.handsRig.foamGroup.visible = isWashingMeat;
    this.handsRig.cutStripsGroup.visible = isCuttingMeat;

    if (isHeldPrepMeat && eqDef) {
      this.handsRig.leftMeatMat.color.set(eqDef.color);
    }
    if (isEating) {
      this.handsRig.foodMat.color.set(this.activeConsumeColor);
    } else if (isFoodHeld && eqDef) {
      this.handsRig.foodMat.color.set(eqDef.color);
    }
    if (this.handsRig.bottleGroup.visible) {
      const washProgress = isWashing ? 1 - this.washBottleTimer / 1.25 : 1;
      const isClean =
        isDrinking ||
        (isWashing && washProgress > 0.55) ||
        eqId === 'filtered_water_bottle';
      this.handsRig.bottleWaterMat.color.setHex(isClean ? 0x38bdf8 : 0x78716c);
      this.handsRig.bottleWaterMesh.scale.y = isClean ? 1 : 0.35;
    }

    const idleBob = Math.sin(this.elapsed * 2.1) * 0.008;
    const moveBobX =
      inputMag > 0.08 ? Math.cos(this.walkBobPhase * 0.5) * 0.016 : 0;
    const moveBobY =
      inputMag > 0.08 ? Math.abs(Math.sin(this.walkBobPhase)) * 0.022 : 0;

    if (isWashingMeat) {
      const p = 1 - this.washMeatTimer / 1.85;
      const plunge = Math.sin(p * Math.PI);
      const scrubX = Math.sin(p * Math.PI * 10) * 0.075;
      const scrubY = Math.cos(p * Math.PI * 10) * 0.036;
      const scrubZ = Math.sin(p * Math.PI * 5) * 0.04;
      const foamAmt =
        p < 0.8 ? Math.sin(Math.min(1, p / 0.8) * Math.PI) : Math.max(0, 1 - (p - 0.8) / 0.2);

      this.handsRig.leftHand.position.set(
        -0.08 + scrubX * 0.22,
        -0.24 - plunge * 0.14,
        -0.4 - plunge * 0.12,
      );
      this.handsRig.leftHand.rotation.set(-0.38 * plunge, 0.28, -0.18);

      this.handsRig.rightHand.position.set(
        0.04 + scrubX,
        -0.2 - plunge * 0.12 + scrubY,
        -0.38 - plunge * 0.12 + scrubZ,
      );
      this.handsRig.rightHand.rotation.set(
        -0.42 * plunge + scrubY * 3.5,
        -0.32 + scrubX * 2.4,
        scrubX * 3.0,
      );

      this.handsRig.leftMeatMat.color.setHex(
        p > 0.72
          ? this.washMeatIsDino
            ? 0xbe123c
            : 0xef4444
          : this.washMeatIsDino
            ? 0x7f1d1d
            : 0x991b1b,
      );
      this.handsRig.foamGroup.scale.setScalar(Math.max(0.05, 0.45 + foamAmt * 0.95));
      return;
    }

    if (isCuttingMeat) {
      const p = 1 - this.cutMeatTimer / 1.45;
      const slicePhase = (p * 3) % 1;
      const downStroke = Math.sin(slicePhase * Math.PI);
      const sliceOffset = (Math.floor(p * 3) - 1) * 0.032;

      this.handsRig.leftHand.position.set(-0.08, -0.22, -0.37);
      this.handsRig.leftHand.rotation.set(-0.18, 0.32, -0.1);
      this.handsRig.leftMeatMat.color.setHex(this.cutMeatIsDino ? 0x7c2d12 : 0x9a3412);

      this.handsRig.rightHand.position.set(
        0.08 + sliceOffset,
        -0.14 - downStroke * 0.13,
        -0.34 - downStroke * 0.06,
      );
      this.handsRig.rightHand.rotation.set(
        0.25 - downStroke * 1.15,
        -0.28,
        0.18,
      );

      const completedSlices = Math.min(3, Math.floor(p * 3 + 0.35));
      this.handsRig.cutStripsGroup.children.forEach((strip, idx) => {
        strip.visible = idx < completedSlices;
      });
      return;
    }

    if (isEating) {
      const p = 1 - this.eatTimer / 0.92;
      const lift = Math.sin(p * Math.PI);
      const chew = Math.max(0, Math.sin(p * Math.PI * 6)) * 0.032;
      this.handsRig.rightHand.position.set(
        THREE.MathUtils.lerp(0.24, 0.05, lift),
        THREE.MathUtils.lerp(-0.24, -0.05, lift) - chew,
        THREE.MathUtils.lerp(-0.38, -0.22, lift),
      );
      this.handsRig.rightHand.rotation.set(0.45 * lift + chew * 4.5, 0.35 * lift, 0);
      this.handsRig.consumableGroup.rotation.set(0, 0, 0);
      this.handsRig.leftHand.position.set(
        -0.26 - moveBobX * 0.5,
        -0.27 + idleBob,
        -0.4,
      );
      this.handsRig.leftHand.rotation.set(0, 0, 0);
      return;
    }

    if (isDrinking) {
      const p = 1 - this.drinkTimer / 0.95;
      const lift = Math.sin(p * Math.PI);
      this.handsRig.rightHand.position.set(
        THREE.MathUtils.lerp(0.24, 0.03, lift),
        THREE.MathUtils.lerp(-0.24, -0.04, lift),
        THREE.MathUtils.lerp(-0.38, -0.23, lift),
      );
      this.handsRig.rightHand.rotation.set(0.75 * lift, 0.25 * lift, 0.2 * lift);
      this.handsRig.consumableGroup.rotation.set(-0.35 * lift, 0, 0);
      this.handsRig.leftHand.position.set(-0.24, -0.27, -0.4);
      this.handsRig.leftHand.rotation.set(0, 0, 0);
      return;
    }

    if (isWashing) {
      const p = 1 - this.washBottleTimer / 1.25;
      const plunge = Math.sin(p * Math.PI);
      const slosh = Math.sin(p * Math.PI * 10) * 0.06;
      this.handsRig.rightHand.position.set(
        0.16 + slosh,
        -0.28 - plunge * 0.12,
        -0.44 - plunge * 0.14,
      );
      this.handsRig.rightHand.rotation.set(-0.55 * plunge, slosh * 3, slosh * 2);
      this.handsRig.consumableGroup.rotation.set(0, 0, slosh * 4);
      this.handsRig.leftHand.position.set(
        -0.16 - slosh * 0.6,
        -0.27 - plunge * 0.08,
        -0.42 - plunge * 0.1,
      );
      this.handsRig.leftHand.rotation.set(-0.35 * plunge, 0, 0);
      return;
    }

    this.handsRig.rightHand.rotation.y = 0;
    this.handsRig.rightHand.rotation.z = 0;
    this.handsRig.leftHand.rotation.y = 0;
    this.handsRig.leftHand.rotation.z = 0;
    this.handsRig.consumableGroup.rotation.set(0, 0, 0);

    const swingWave =
      this.swingTimer > 0
        ? Math.sin((this.swingTimer / 0.3) * Math.PI) * 0.95
        : 0;

    const recoil =
      this.recoilTimer > 0
        ? Math.sin((this.recoilTimer / 0.22) * Math.PI) * 0.25
        : 0;

    if (isGun) {
      const reloadingTilt =
        this.reloadingItemId && this.reloadingItemId === eqId ? 0.36 : 0;
      // Exact 1:1 tactical two-handed pistol hold angled inward at bottom-right
      this.handsRig.rightHand.position.set(
        0.21 + moveBobX * 0.45,
        -0.22 - idleBob - moveBobY * 0.45 + recoil * 0.065 - reloadingTilt * 0.14,
        -0.315 + recoil * 0.09,
      );
      this.handsRig.rightHand.rotation.set(
        -recoil * 0.38 - reloadingTilt + 0.04,
        0.14,
        -0.06,
      );
      this.handsRig.gunMesh.rotation.x = -recoil * 0.42 - reloadingTilt * 0.35;

      // Left gloved support hand rising from bottom-center-right to cradle right knuckles & trigger guard
      this.handsRig.leftHand.position.set(
        0.11 - moveBobX * 0.25,
        -0.242 + idleBob - moveBobY * 0.35 + recoil * 0.03,
        -0.335 + recoil * 0.055,
      );
      this.handsRig.leftHand.rotation.set(
        this.isSwimming
          ? -0.4 + Math.sin(this.elapsed * 6) * 0.35
          : 0.16,
        -0.42,
        0.28,
      );
    } else {
      this.handsRig.gunMesh.rotation.x = 0;
      this.handsRig.leftHand.position.set(
        -0.26 - moveBobX * 0.7,
        -0.25 + idleBob - moveBobY * 0.7,
        -0.38,
      );
      this.handsRig.rightHand.position.set(
        0.26 + moveBobX,
        -0.25 - idleBob - moveBobY,
        -0.38 - swingWave * 0.14,
      );
      this.handsRig.rightHand.rotation.x = -swingWave;
      this.handsRig.leftHand.rotation.x = this.isSwimming
        ? -0.4 + Math.sin(this.elapsed * 6) * 0.35
        : 0;
    }
  }

  private findNearestHouseStationInteraction(): NearbyInteraction | null {
    let bestHouse: HouseStationTarget | null = null;
    let bestHouseDist = 3.6;
    for (const hs of this.getActiveStations()) {
      if (Math.abs(hs.y - this.playerY) > 2.2) continue;
      const d = Math.hypot(hs.x - this.playerX, hs.z - this.playerZ);
      if (d <= hs.range && d < bestHouseDist) {
        bestHouseDist = d;
        bestHouse = hs;
      }
    }
    if (!bestHouse) return null;
    return {
      id: bestHouse.id,
      label: bestHouse.label,
      sublabel: bestHouse.sublabel,
      kind: bestHouse.kind,
      actionCategory:
        bestHouse.kind === 'house_stove'
          ? 'cook'
          : bestHouse.kind === 'house_sink' || bestHouse.kind === 'house_shower'
            ? 'clean'
            : 'use',
      distance: bestHouseDist,
      targetX: bestHouse.x,
      targetY: bestHouse.y,
      targetZ: bestHouse.z,
    };
  }

  private findNearbyInteraction(): NearbyInteraction | null {
    const nearHouseStation = this.findNearestHouseStationInteraction();
    if (nearHouseStation) {
      return nearHouseStation;
    }

    const equippedId = this.getEquippedItemId();
    const equippedDef = equippedId ? ITEMS[equippedId] : null;

    // 1. WEAPON ISOLATION (Knife can also slice adjacent Wheat/Sugarcane/ripe crops)
    if (equippedId && equippedDef && isActiveWeaponItem(equippedId)) {
      if (equippedId === 'hunting_knife') {
        const cropNode = this.findNearestResourceNode(
          3.6,
          (n) => n.kind === 'wheat_patch' || n.kind === 'sugarcane_patch',
        );
        if (cropNode) {
          const d = Math.hypot(cropNode.x - this.playerX, cropNode.z - this.playerZ);
          return {
            id: cropNode.id,
            label:
              cropNode.kind === 'wheat_patch'
                ? 'Cut Wheat with Knife'
                : 'Cut Sugarcane with Knife',
            sublabel: cropNode.maxHp > 1 ? `HP ${cropNode.hp}/${cropNode.maxHp}` : undefined,
            kind: 'resource',
            actionCategory: 'harvest',
            distance: d,
            targetX: cropNode.x,
            targetY: cropNode.y,
            targetZ: cropNode.z,
          };
        }
        const matureCrop = this.plantedCrops.find(
          (c) => c.mature && Math.hypot(c.x - this.playerX, c.z - this.playerZ) < 3.0,
        );
        if (matureCrop) {
          return {
            id: matureCrop.id,
            label: `Harvest ${ITEMS[matureCrop.produceItemId].name}`,
            kind: 'planted_crop',
            actionCategory: 'harvest',
            distance: Math.hypot(matureCrop.x - this.playerX, matureCrop.z - this.playerZ),
            targetX: matureCrop.x,
            targetY: matureCrop.y,
            targetZ: matureCrop.z,
          };
        }
        const creatureNearby = this.creatures.creatures.some(
          (c) =>
            c.alive &&
            c.cycleActive &&
            Math.hypot(c.x - this.playerX, c.z - this.playerZ) <= 4.2 &&
            Math.abs(c.y - this.playerY) <= 3.8,
        );
        if (
          !creatureNearby &&
          (this.getItemCount('dried_raw_meat') > 0 ||
            this.getItemCount('dried_dino_meat') > 0)
        ) {
          return {
            id: 'cut_dried_meat',
            label: 'Cut Dried Meat with Knife',
            sublabel: 'Slices Dried Slab into Cut Meat',
            kind: 'cut_meat',
            actionCategory: 'harvest',
            distance: 0,
            targetX: this.playerX,
            targetY: this.playerY,
            targetZ: this.playerZ,
          };
        }
      }
      if (isFirearmItem(equippedId)) {
        const spec = FIREARM_SPECS[equippedId] ?? FIREARM_SPECS['gun'];
        if (spec) {
          const magAmmo = this.weaponMagazines.get(equippedId) ?? spec.magSize;
          const ammoCount = this.getItemCount('ammo');
          const reloading = this.reloadingItemId === equippedId;
          return {
            id: `fire_${equippedId}`,
            label: reloading
              ? `Reloading ${equippedDef.name}`
              : `Fire ${equippedDef.name}`,
            sublabel: reloading
              ? `${magAmmo}/${spec.magSize} · Loading`
              : `${magAmmo}/${spec.magSize} mag · ${ammoCount} reserve`,
            kind: 'gun_action',
            actionCategory: 'shoot',
            distance: 0,
            targetX: this.playerX,
            targetY: this.playerY,
            targetZ: this.playerZ,
          };
        }
      }
      if (equippedId === 'primitive_bow') {
        const arrowCount = this.getItemCount('arrows');
        return {
          id: 'fire_bow',
          label: 'Fire Primitive Bow',
          sublabel: `${arrowCount} arrows`,
          kind: 'gun_action',
          actionCategory: 'shoot',
          distance: 0,
          targetX: this.playerX,
          targetY: this.playerY,
          targetZ: this.playerZ,
        };
      }
      return {
        id: `attack_${equippedId}`,
        label: `Strike (${equippedDef.name})`,
        sublabel: equippedDef.attackDamage ? `DMG ${equippedDef.attackDamage}` : undefined,
        kind: 'gun_action',
        actionCategory: 'attack',
        distance: 0,
        targetX: this.playerX,
        targetY: this.playerY,
        targetZ: this.playerZ,
      };
    }

    // 2. HARVESTING TOOLS
    if (equippedId === 'sickle') {
      const matureCrop = this.plantedCrops.find(
        (c) => c.mature && Math.hypot(c.x - this.playerX, c.z - this.playerZ) < 3.2,
      );
      if (matureCrop) {
        return {
          id: matureCrop.id,
          label: `Reap ${ITEMS[matureCrop.produceItemId].name}`,
          kind: 'planted_crop',
          actionCategory: 'harvest',
          distance: Math.hypot(matureCrop.x - this.playerX, matureCrop.z - this.playerZ),
          targetX: matureCrop.x,
          targetY: matureCrop.y,
          targetZ: matureCrop.z,
        };
      }
      const cropNode = this.findNearestResourceNode(
        3.8,
        (n) =>
          n.kind === 'wheat_patch' ||
          n.kind === 'sugarcane_patch' ||
          n.kind === 'grass_tuft' ||
          n.kind === 'fiber_fern' ||
          n.kind === 'plant_cluster',
      );
      if (cropNode) {
        const d = Math.hypot(cropNode.x - this.playerX, cropNode.z - this.playerZ);
        return {
          id: cropNode.id,
          label:
            cropNode.kind === 'wheat_patch'
              ? 'Cut Golden Wheat'
              : cropNode.kind === 'sugarcane_patch'
                ? 'Cut Lake Sugarcane'
                : 'Cut Plants with Sickle',
          sublabel: cropNode.maxHp > 1 ? `HP ${cropNode.hp}/${cropNode.maxHp}` : undefined,
          kind: 'resource',
          actionCategory: 'harvest',
          distance: d,
          targetX: cropNode.x,
          targetY: cropNode.y,
          targetZ: cropNode.z,
        };
      }
      return {
        id: 'use_sickle',
        label: 'Swing Harvesting Sickle',
        sublabel: 'Face Wheat or Sugarcane',
        kind: 'tool_action',
        actionCategory: 'harvest',
        distance: 0,
        targetX: this.playerX,
        targetY: this.playerY,
        targetZ: this.playerZ,
      };
    }

    if (equippedId === 'stone_axe') {
      const treeNode = this.findNearestResourceNode(4.4, (n) =>
        this.isTreeKind(n.kind) || n.kind === 'branch_pile',
      );
      if (treeNode) {
        const d = Math.hypot(treeNode.x - this.playerX, treeNode.z - this.playerZ);
        return {
          id: treeNode.id,
          label:
            treeNode.kind === 'branch_pile'
              ? 'Chop Branches'
              : `Chop ${treeNode.kind.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}`,
          sublabel: treeNode.maxHp > 1 ? `HP ${treeNode.hp}/${treeNode.maxHp}` : undefined,
          kind: 'resource',
          actionCategory: 'chop',
          distance: d,
          targetX: treeNode.x,
          targetY: treeNode.y,
          targetZ: treeNode.z,
        };
      }
      return {
        id: 'use_stone_axe',
        label: 'Swing Stone Axe',
        sublabel: 'Face a Tree to Chop',
        kind: 'tool_action',
        actionCategory: 'chop',
        distance: 0,
        targetX: this.playerX,
        targetY: this.playerY,
        targetZ: this.playerZ,
      };
    }

    if (equippedId === 'stone_pickaxe') {
      const rockNode = this.findNearestResourceNode(3.8, (n) =>
        this.isRockKind(n.kind),
      );
      if (rockNode) {
        const d = Math.hypot(rockNode.x - this.playerX, rockNode.z - this.playerZ);
        return {
          id: rockNode.id,
          label: `Mine ${rockNode.kind.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}`,
          sublabel: rockNode.maxHp > 1 ? `HP ${rockNode.hp}/${rockNode.maxHp}` : undefined,
          kind: 'resource',
          actionCategory: 'mine',
          distance: d,
          targetX: rockNode.x,
          targetY: rockNode.y,
          targetZ: rockNode.z,
        };
      }
      const hitBlock = this.findNearestAimedStructuralBlock(3.8);
      if (hitBlock) {
        return {
          id: hitBlock.id,
          label: `Break ${STRUCTURAL_SPECS[hitBlock.kind].name}`,
          sublabel: 'Stress-test or salvage block',
          kind: 'structural_block',
          actionCategory: 'mine',
          distance: Math.hypot(hitBlock.x - this.playerX, hitBlock.z - this.playerZ),
          targetX: hitBlock.x,
          targetY: hitBlock.y,
          targetZ: hitBlock.z,
        };
      }
      return {
        id: 'use_stone_pickaxe',
        label: 'Swing Stone Pickaxe',
        sublabel: 'Face Stone, Ore, or Masonry',
        kind: 'tool_action',
        actionCategory: 'mine',
        distance: 0,
        targetX: this.playerX,
        targetY: this.playerY,
        targetZ: this.playerZ,
      };
    }

    if (equippedId === 'excavator_shovel') {
      return {
        id: 'dig_terrain',
        label: this.isCrouching ? 'Raise Soil Berm' : 'Excavate Earth Trench',
        sublabel: this.isCrouching ? 'Crouch + E grades up' : 'Dig canal or cave crater (C to raise)',
        kind: 'tool_action',
        actionCategory: 'mine',
        distance: 0,
        targetX: this.playerX,
        targetY: this.playerY,
        targetZ: this.playerZ,
      };
    }

    if (equippedId === 'powder_keg') {
      return {
        id: 'throw_powder_keg',
        label: 'Throw Lit Powder Keg',
        sublabel: 'Carves jagged crater & blasts pillars',
        kind: 'tool_action',
        actionCategory: 'attack',
        distance: 0,
        targetX: this.playerX,
        targetY: this.playerY,
        targetZ: this.playerZ,
      };
    }

    if (equippedId === 'water_torrent') {
      return {
        id: 'release_water_torrent',
        label: 'Release Water Torrent',
        sublabel: 'Fluid-carves channels & gullies downhill',
        kind: 'tool_action',
        actionCategory: 'clean',
        distance: 0,
        targetX: this.playerX,
        targetY: this.playerY,
        targetZ: this.playerZ,
      };
    }

    if (equippedId && isSeedItem(equippedId)) {
      const spec = SEED_SPECS[equippedId];
      return {
        id: `plant_${equippedId}`,
        label: `Plant ${ITEMS[equippedId].name}`,
        sublabel: spec ? `Grows ${ITEMS[spec.produceItemId].name}` : undefined,
        kind: 'tool_action',
        actionCategory: 'harvest',
        distance: 0,
        targetX: this.playerX,
        targetY: this.playerY,
        targetZ: this.playerZ,
      };
    }

    // 3. SPECIALIZED EQUIPMENT
    if (equippedId === 'fishing_rod') {
      return {
        id: 'cast_fishing_rod',
        label: 'Cast Fishing Rod',
        sublabel: 'Face Ocean, River, or Lake',
        kind: 'fishing',
        actionCategory: 'use',
        distance: 0,
        targetX: this.playerX,
        targetY: this.playerY,
        targetZ: this.playerZ,
      };
    }

    if (equippedId === 'lasso' && equippedDef) {
      return {
        id: 'throw_lasso',
        label: 'Throw Hunter Lasso',
        sublabel: `Snare Range ${equippedDef.attackRange || 8.5}m`,
        kind: 'tool_action',
        actionCategory: 'attack',
        distance: 0,
        targetX: this.playerX,
        targetY: this.playerY,
        targetZ: this.playerZ,
      };
    }

    if (equippedId === 'dirty_water_bottle') {
      const nearOcean = this.isNearOceanWater();
      return {
        id: 'clean_water_bottle',
        label: nearOcean ? 'Clean & Fill Water Bottle' : 'Clean Bottle (Walk to Ocean)',
        sublabel: nearOcean ? 'Ocean Surf → Filtered Water' : 'Requires Ocean Waves',
        kind: 'clean_bottle',
        actionCategory: 'clean',
        distance: 0,
        targetX: this.playerX,
        targetY: this.playerY,
        targetZ: this.playerZ,
      };
    }

    if (
      equippedId === 'raw_meat' ||
      equippedId === 'dino_meat' ||
      equippedId === 'soap'
    ) {
      const nearLake = this.isNearLakeWater();
      return {
        id: 'wash_meat_lake',
        label: nearLake
          ? 'Wash & Scrub Meat with Soap'
          : 'Wash Meat (Walk to Azure Lake)',
        sublabel: nearLake
          ? 'Azure Lake Water + Soap → Washed Meat'
          : `${this.getLakeDirectionHint()} · Needs Soap & Meat`,
        kind: 'wash_meat',
        actionCategory: 'clean',
        distance: 0,
        targetX: LAKE_CENTER.x,
        targetY: LAKE_CENTER.waterY,
        targetZ: LAKE_CENTER.z,
      };
    }

    if (equippedId === 'washed_meat' || equippedId === 'washed_dino_meat') {
      return {
        id: `dry_${equippedId}`,
        label: 'Hang Washed Meat on Drying Rack',
        sublabel: 'Dry into Slabs before cutting with Knife',
        kind: 'tool_action',
        actionCategory: 'use',
        distance: 0,
        targetX: this.playerX,
        targetY: this.playerY,
        targetZ: this.playerZ,
      };
    }

    if (equippedId === 'dried_raw_meat' || equippedId === 'dried_dino_meat') {
      const hasKnife = this.getItemCount('hunting_knife') > 0;
      return {
        id: 'cut_dried_meat',
        label: hasKnife ? 'Cut Dried Meat with Knife' : 'Need Hunting Knife to Cut',
        sublabel: hasKnife ? 'Slices Slab into Ready-to-Cook Cut Meat' : 'Craft Hunting Knife first',
        kind: 'cut_meat',
        actionCategory: 'harvest',
        distance: 0,
        targetX: this.playerX,
        targetY: this.playerY,
        targetZ: this.playerZ,
      };
    }

    // 4. FOOD & FILTERED WATER
    if (equippedDef && equippedDef.category === 'food') {
      const isDrink = equippedDef.id === 'filtered_water_bottle';
      return {
        id: `consume_${equippedDef.id}`,
        label: isDrink ? 'Drink Filtered Water' : `Eat ${equippedDef.name}`,
        sublabel: isDrink
          ? `+${equippedDef.thirstRestore || 55} Thirst`
          : equippedDef.hungerRestore
            ? `+${equippedDef.hungerRestore} Hunger`
            : undefined,
        kind: 'tool_action',
        actionCategory: isDrink ? 'clean' : 'harvest',
        distance: 0,
        targetX: this.playerX,
        targetY: this.playerY,
        targetZ: this.playerZ,
      };
    }

    // 5A. ENGINEERED STRUCTURAL PIECE
    if (equippedDef && equippedDef.structuralKind) {
      const pct = this.previewTarget ? Math.round(this.previewTarget.stress * 100) : 0;
      return {
        id: `construct_${equippedDef.id}`,
        label: `Place ${equippedDef.name}`,
        sublabel:
          this.previewTarget && this.previewTarget.stress >= 1.0
            ? `OVERLOAD ${pct}% — Will Collapse!`
            : `Stress ${pct}% · [R] Rotate`,
        kind: 'tool_action',
        actionCategory: 'craft',
        distance: 0,
        targetX: this.playerX,
        targetY: this.playerY,
        targetZ: this.playerZ,
      };
    }

    // 5B. KINETIC POWER MACHINERY
    if (equippedDef && equippedDef.kineticKind) {
      return {
        id: `kinetic_${equippedDef.id}`,
        label: `Install ${equippedDef.name}`,
        sublabel:
          equippedDef.kineticKind === 'belt_pulley'
            ? 'Auto-links Belts up to 52m · [R] Rotate'
            : equippedDef.kineticKind === 'water_wheel'
              ? 'Place in River/Lake Flow · [R] Rotate'
              : 'Couples Shafts, Gears & Pipes · [R] Rotate',
        kind: 'tool_action',
        actionCategory: 'craft',
        distance: 0,
        targetX: this.playerX,
        targetY: this.playerY,
        targetZ: this.playerZ,
      };
    }

    // 5C. MODULAR VEHICLE KIT
    if (equippedId === 'vehicle_chassis_kit') {
      return {
        id: 'open_vehicle_bay',
        label: 'Open Modular Vehicle Bay [K]',
        sublabel: `${this.getItemCount('vehicle_chassis_kit')} Kits Ready · Weld Rovers, Boats & Airships`,
        kind: 'tool_action',
        actionCategory: 'craft',
        distance: 0,
        targetX: this.playerX,
        targetY: this.playerY,
        targetZ: this.playerZ,
      };
    }

    // 5. PLACEABLE STRUCTURE
    if (equippedDef && equippedDef.structureType) {
      return {
        id: `build_${equippedDef.id}`,
        label: `Build ${equippedDef.name}`,
        sublabel: 'Place Ahead on Dry Ground',
        kind: 'tool_action',
        actionCategory: 'craft',
        distance: 0,
        targetX: this.playerX,
        targetY: this.playerY,
        targetZ: this.playerZ,
      };
    }

    // 6. AMMO
    if (equippedId && isAmmoItem(equippedId)) {
      const qty = this.getItemCount(equippedId);
      return {
        id: `ammo_${equippedId}`,
        label:
          equippedId === 'ammo'
            ? `Gun Cartridges (${qty} rds)`
            : `Flint Arrows (${qty})`,
        sublabel:
          equippedId === 'ammo'
            ? 'Equip Survival Gun to Fire'
            : 'Equip Primitive Bow to Shoot',
        kind: 'tool_action',
        actionCategory: 'use',
        distance: 0,
        targetX: this.playerX,
        targetY: this.playerY,
        targetZ: this.playerZ,
      };
    }

    // 7. RESOURCE MATERIAL
    if (equippedDef && equippedDef.category === 'resource') {
      return {
        id: `place_${equippedDef.id}`,
        label: `Set Down ${equippedDef.name}`,
        sublabel:
          equippedDef.id === 'flint'
            ? 'Set near Kindling to Spark Fire'
            : `×${this.getItemCount(equippedDef.id)} in Pack`,
        kind: 'tool_action',
        actionCategory: 'use',
        distance: 0,
        targetX: this.playerX,
        targetY: this.playerY,
        targetZ: this.playerZ,
      };
    }

    // 8. BARE HANDS: Full world interaction scan
    // 8-PRIORITY: Underground Car Elevator Computer Terminal strictly outranks nearby vehicles
    if (this.isNearElevatorTerminal()) {
      const kx = UNDERGROUND_ELEVATOR_KIOSK_POS.x - this.playerX;
      const kz = UNDERGROUND_ELEVATOR_KIOSK_POS.z - this.playerZ;
      const dKiosk = Math.hypot(kx, kz);
      if (!this.elevatorTerminalGreeted) {
        this.elevatorTerminalGreeted = true;
        ELEVATOR_VOICE_COMPUTER.onApproachTerminal((line) => {
          this.toast(line, 'discovery');
        });
      }
      return {
        id: 'underground_elevator',
        label: 'Use Garage Elevator Computer (AI Voice · 15 Exotics)',
        sublabel: 'Ask the Vault Computer to preview & lift your exotic car to the surface',
        kind: 'underground_elevator',
        actionCategory: 'use',
        distance: dKiosk,
        targetX: UNDERGROUND_ELEVATOR_KIOSK_POS.x,
        targetY: this.playerY,
        targetZ: UNDERGROUND_ELEVATOR_KIOSK_POS.z,
      };
    }

    let best: NearbyInteraction | null = null;
    let bestDist = 4.8;

    // 8A. Nearby Modular Vehicles (Pilot / Drive / Sail / Fly) — strictly lower priority than Elevator Computer
    for (const v of this.vehicles) {
      const vx = v.x - this.playerX;
      const vz = v.z - this.playerZ;
      const distSq = vx * vx + vz * vz;
      if (distSq <= VEHICLE_INTERACT_RADIUS_SQ && Math.abs(v.y - this.playerY) < 3.6) {
        const d = Math.sqrt(distSq);
        if (d < bestDist) {
          bestDist = d;
          const specs = this.getVehicleSpecs(v);
          best = {
            id: v.id,
            label: `Pilot ${v.name}`,
            sublabel: `${specs.craftClass} · Fuel ${Math.round(v.fuel)}% · HP ${Math.round(v.hp)}/${v.maxHp}`,
            kind: 'modular_vehicle',
            actionCategory: 'use',
            distance: d,
            targetX: v.x,
            targetY: v.y,
            targetZ: v.z,
          };
        }
      }
    }
    // 8A2. Nearby Mounts & Creatures
    if (this.mountedCreatureId) {
      return {
        id: 'dismount',
        label: 'Dismount Mount',
        kind: 'mount',
        actionCategory: 'use',
        distance: 0,
        targetX: this.playerX,
        targetY: this.playerY,
        targetZ: this.playerZ,
      };
    }

    for (const c of this.creatures.creatures) {
      if (!c.alive) continue;
      const d = Math.hypot(c.x - this.playerX, c.z - this.playerZ);
      if (d < 4.2 && Math.abs(c.y - this.playerY) < 3.2 && d < bestDist) {
        bestDist = d;
        if (c.tamed) {
          best = {
            id: c.id,
            label: `Ride ${c.displayNameOverride || c.spec.displayName}`,
            sublabel: `Tamed Companion · HP ${Math.round(c.hp)}/${c.maxHp}`,
            kind: 'mount',
            actionCategory: 'use',
            distance: d,
            targetX: c.x,
            targetY: c.y,
            targetZ: c.z,
          };
        } else if (
          this.getItemCount('raw_meat') > 0 ||
          this.getItemCount('roasted_meat') > 0 ||
          this.getItemCount('dino_meat') > 0 ||
          this.getItemCount('berries') > 0 ||
          this.getItemCount('wheat') > 0
        ) {
          best = {
            id: c.id,
            label: `Tame ${c.displayNameOverride || c.spec.displayName}`,
            sublabel: 'Feed food treats to tame & bond',
            kind: 'tame',
            actionCategory: 'use',
            distance: d,
            targetX: c.x,
            targetY: c.y,
            targetZ: c.z,
          };
        }
      }
    }
    if (best) return best;

    // 8B. Nearby Kinetic Machinery & Automated Assemblers
    for (const kn of this.kineticNodes) {
      const d = Math.hypot(kn.x - this.playerX, kn.z - this.playerZ);
      if (d < 3.9 && Math.abs(kn.y - this.playerY) < 3.0 && d < bestDist) {
        bestDist = d;
        const kSpec = KINETIC_SPECS[kn.kind];
        let sub = `${Math.abs(kn.rpm)} RPM · ${kn.torque} Nm`;
        let verb = `Inspect ${kSpec.name}`;
        if (kn.kind === 'steam_boiler') {
          sub = `${Math.round(kn.steamPsi)} PSI Steam · [X] Dismantle`;
        } else if (kn.kind === 'fluid_pipe') {
          sub = `${Math.round(kn.steamPsi)} PSI / Flow ${Math.round(kn.waterFlow * 100)}%`;
        } else if (kn.kind === 'auto_assembler') {
          verb =
            kn.storedOutputCount > 0
              ? `Collect ${kn.storedOutputCount}× Manufactured Kits`
              : `Assembler (${kn.active ? `${Math.round(kn.cycleProgress * 100)}%` : 'Needs >=12 RPM'})`;
          sub = `${Math.abs(kn.rpm)} RPM · ${kn.storedOutputCount} Ready`;
        }
        best = {
          id: kn.id,
          label: verb,
          sublabel: sub,
          kind: 'kinetic_node',
          actionCategory: kn.kind === 'auto_assembler' ? 'pickup' : 'use',
          distance: d,
          targetX: kn.x,
          targetY: kn.y,
          targetZ: kn.z,
        };
      }
    }
    if (best) return best;

    if (this.worldType === 'island') {
      // 1A. Base Armory Chest & Vehicle Garage Bench near Hilltop House
      if (this.armoryChestState) {
        const ac = this.armoryChestState;
        const dArmory = Math.hypot(ac.x - this.playerX, ac.z - this.playerZ);
        if (dArmory < 4.2 && Math.abs(ac.y - this.playerY) < 3.0 && dArmory < bestDist) {
          bestDist = dArmory;
          best = {
            id: 'base_armory_chest',
            label: ac.opened
              ? 'Resupply Base Armory Chest'
              : 'Open Base Armory Supply Chest',
            sublabel: ac.opened
              ? 'Salvage 25x Reserve Cartridges'
              : 'Glock 19, Remington 870, M4A1 & 120x Ammo',
            kind: 'armory_chest',
            actionCategory: 'search',
            distance: dArmory,
            targetX: ac.x,
            targetY: ac.y,
            targetZ: ac.z,
          };
        }
      }

      if (this.world?.garageBenchPos) {
        const gb = this.world.garageBenchPos;
        const dBench = Math.hypot(gb.x - this.playerX, gb.z - this.playerZ);
        if (dBench < 4.2 && Math.abs(gb.y - this.playerY) < 3.0 && dBench < bestDist) {
          bestDist = dBench;
          const parkedNeedsService = this.vehicles.some(
            (v) =>
              Math.hypot(v.x - VEHICLE_GARAGE_POS.x, v.z - VEHICLE_GARAGE_POS.z) <= 14.5 &&
              (v.hp < v.maxHp || v.fuel < 98),
          );
          best = {
            id: 'garage_bench',
            label: parkedNeedsService
              ? 'Service & Refuel Garage Vehicles'
              : 'Open Garage Vehicle Workshop',
            sublabel: parkedNeedsService
              ? 'Restore 100% Fuel & Hull Armor'
              : 'Build, Customize & Spawn Rovers',
            kind: 'garage_bench',
            actionCategory: 'craft',
            distance: dBench,
            targetX: gb.x,
            targetY: gb.y,
            targetZ: gb.z,
          };
        }
      }

      // 1A-2. Huge Saturn V Rocket Launchpad (on Earth OR landed on any Space Planet!)
      const rocketX = this.inSpacePlanet ? 0 : SATURN_ROCKET_POS.x;
      const rocketZ = this.inSpacePlanet ? -14 : SATURN_ROCKET_POS.z;
      const dRocket = Math.hypot(rocketX - this.playerX, rocketZ - this.playerZ);
      if (dRocket < 9.5 && dRocket < bestDist) {
        bestDist = dRocket;
        best = {
          id: 'saturn_rocket',
          label: this.inSpacePlanet
            ? 'Board Saturn V Rocket (Warp / Return to Earth)'
            : 'Board Saturn V Rocket (Launch to Space & 4 Universes)',
          sublabel: 'Explore Solar System, 4 Universes & 10,000+ Alien Worlds',
          kind: 'saturn_rocket',
          actionCategory: 'use',
          distance: dRocket,
          targetX: rocketX,
          targetY: this.playerY,
          targetZ: rocketZ,
        };
      }

      // 1A-2B. Underground Exotic Garage & Hydraulic Car Elevator (Right next to the Garage)
      if (!this.inSpacePlanet && this.currentDimension === 'overworld') {
        const dElev = Math.hypot(
          UNDERGROUND_ELEVATOR_POS.x - this.playerX,
          UNDERGROUND_ELEVATOR_POS.z - this.playerZ,
        );
        if (dElev < 9.5 && dElev < bestDist) {
          if (!this.elevatorTerminalGreeted) {
            this.elevatorTerminalGreeted = true;
            ELEVATOR_VOICE_COMPUTER.onApproachTerminal((line) => {
              this.toast(line, 'discovery');
            });
          }
          bestDist = dElev;
          best = {
            id: 'underground_elevator',
            label: 'Use Garage Elevator Computer (AI Voice · 15 Exotics)',
            sublabel: 'Ask the Vault Computer to preview & lift your exotic car to the surface',
            kind: 'underground_elevator',
            actionCategory: 'use',
            distance: dElev,
            targetX: UNDERGROUND_ELEVATOR_POS.x,
            targetY: this.playerY,
            targetZ: UNDERGROUND_ELEVATOR_POS.z,
          };
        } else if (dElev > 13.5) {
          this.elevatorTerminalGreeted = false;
        }
      }

      // 1A-3. Island-Landed Alien UFO (collect Rift Portal Coil & Glowing Saucer Relic)
      if (!this.inSpacePlanet && this.currentDimension === 'overworld') {
        const dUfo = Math.hypot(
          ISLAND_UFO_POS.x - this.playerX,
          ISLAND_UFO_POS.z - this.playerZ,
        );
        if (dUfo < 7.5 && dUfo < bestDist) {
          bestDist = dUfo;
          const claimed = Boolean(ALIEN_SPACE_SYSTEM.islandLandedUfo?.claimed);
          best = {
            id: 'island_ufo',
            label: claimed
              ? 'Inspect Landed Alien UFO (Loot Claimed)'
              : 'Claim Landed Alien UFO Loot',
            sublabel: claimed
              ? 'Open Saturn V Console → Alien Armory to install loot'
              : 'Rift Portal Coil + Glowing Saucer Relic',
            kind: 'island_ufo',
            actionCategory: 'pickup',
            distance: dUfo,
            targetX: ISLAND_UFO_POS.x,
            targetY: this.playerY,
            targetZ: ISLAND_UFO_POS.z,
          };
        }
      }

      // 1B. Shipwreck Loot Chests (unrestricted access across decks, cargo hold & cabins)
      for (const chest of this.shipwreckChests) {
        const d = Math.hypot(chest.x - this.playerX, chest.z - this.playerZ);
        const dy = Math.abs(chest.y - this.playerY);
        if (d < 4.5 && dy < 3.2 && d < bestDist) {
          bestDist = d;
          best = {
            id: `shipwreck_chest_${chest.id}`,
            label: chest.opened ? `Search ${chest.name}` : `Open ${chest.name}`,
            sublabel: chest.opened ? 'Salvage Spare Ammo' : chest.sublabel,
            kind: 'shipwreck',
            actionCategory: 'search',
            distance: d,
            targetX: chest.x,
            targetY: chest.y,
            targetZ: chest.z,
          };
        }
      }

      // 1C. General Beached Shipwreck Area Check
      const shipDist = Math.hypot(SHIPWRECK_POS.x - this.playerX, SHIPWRECK_POS.z - this.playerZ);
      if (shipDist < 13.0 && shipDist < bestDist) {
        const unopened = this.shipwreckChests.filter((c) => !c.opened).length;
        bestDist = shipDist;
        best = {
          id: 'search_shipwreck',
          label:
            unopened > 0
              ? `Search Beached Shipwreck (${unopened}/4 Chests Unopened)`
              : 'Search Beached Shipwreck (Fully Looted)',
          sublabel:
            unopened > 0
              ? 'Collect Real-Life Firearms & Treasure'
              : 'All 4 Chests Looted',
          kind: 'shipwreck',
          actionCategory: 'search',
          distance: shipDist,
          targetX: SHIPWRECK_POS.x,
          targetY: OCEAN_LEVEL + 0.5,
          targetZ: SHIPWRECK_POS.z,
        };
      }
    }

    for (const st of this.structures) {
      const d = Math.hypot(st.x - this.playerX, st.z - this.playerZ);
      if (d < 3.6 && d < bestDist) {
        bestDist = d;
        const labels: Record<CampStructureType, string> = {
          campfire: 'Cook at Campfire',
          cooking_station: 'Use Cooking Station',
          crafting_table: 'Use Wooden Workbench',
          storage_chest: 'Open Storage Box',
          sleeping_area: 'Rest Until Dawn',
          basic_shelter: 'Rest in Shelter',
          gravity_monolith: 'Vortex Gravity Pulse',
          spike_barricade: 'Kinetic Spike Barricade',
          timeshift_sundial: 'Scrub Time of Day',
          auto_turret: 'Auto-Turret Defense',
          smart_tv: 'Watch Smart TV',
          drying_rack: 'Meat Drying Rack',
          coaster_station: 'Open Roller Coaster Studio',
        };
        const catMap: Record<
          CampStructureType,
          NearbyInteraction['actionCategory']
        > = {
          campfire: 'cook',
          cooking_station: 'cook',
          crafting_table: 'craft',
          storage_chest: 'use',
          sleeping_area: 'use',
          basic_shelter: 'use',
          gravity_monolith: 'use',
          spike_barricade: 'use',
          timeshift_sundial: 'use',
          auto_turret: 'use',
          smart_tv: 'use',
          drying_rack: 'use',
          coaster_station: 'craft',
        };
        best = {
          id: st.id,
          label: labels[st.type],
          kind: st.type,
          actionCategory: catMap[st.type],
          distance: d,
          targetX: st.x,
          targetY: st.y,
          targetZ: st.z,
          structureId: st.id,
        };
      }
    }
    if (best) return best;

    // Check nearby fallen animal / dinosaur carcasses ready for pickup & preparation
    if (this.worldType === 'island') {
      const bestCarcass = this.findNearbyCarcass();
      if (bestCarcass) {
        const bestCarcassDist = Math.hypot(
          bestCarcass.x - this.playerX,
          bestCarcass.z - this.playerZ,
        );
        const hasKnife = this.getItemCount('hunting_knife') > 0;
        const cutSummary = bestCarcass.drops
          .map((d) => `${d.quantity}× ${ITEMS[d.itemId].name}`)
          .join(' · ');
        return {
          id: bestCarcass.id,
          label: hasKnife
            ? `Cut & Prepare ${bestCarcass.displayName} Carcass`
            : `Pick up & Prepare ${bestCarcass.displayName} Carcass`,
          sublabel: hasKnife ? `Knife Ready · ${cutSummary}` : cutSummary || 'Butcher Meat & Hide',
          kind: 'carcass',
          actionCategory: 'harvest',
          distance: bestCarcassDist,
          targetX: bestCarcass.x,
          targetY: bestCarcass.y,
          targetZ: bestCarcass.z,
          carcassId: bestCarcass.id,
          species: bestCarcass.species,
        };
      }
    }

    // Check nearby ground resource pickups
    let bestPickup: ActivePickup | null = null;
    let bestPickupDist = 3.5;
    for (const p of this.pickups) {
      if (p.collected) continue;
      const d = Math.hypot(p.x - this.playerX, p.z - this.playerZ);
      if (d < bestPickupDist) {
        bestPickupDist = d;
        bestPickup = p;
      }
    }
    if (bestPickup) {
      return {
        id: bestPickup.id,
        label: `Pick up ${ITEMS[bestPickup.itemId].name}`,
        sublabel: `×${bestPickup.quantity}`,
        kind: 'pickup',
        actionCategory: 'pickup',
        distance: bestPickupDist,
        targetX: bestPickup.x,
        targetY: bestPickup.y,
        targetZ: bestPickup.z,
        pickupItemId: bestPickup.itemId,
        pickupQuantity: bestPickup.quantity,
      };
    }

    if (this.worldType === 'island') {
      for (const c of this.creatures.creatures) {
        if (!c.alive || c.species !== 'dolphin') continue;
        const d = Math.hypot(c.x - this.playerX, c.z - this.playerZ);
        if (d < 13) {
          return {
            id: c.id,
            label: 'Play with Coastal Dolphin',
            sublabel: 'Marine Wildlife',
            kind: 'dolphin',
            actionCategory: 'use',
            distance: d,
            targetX: c.x,
            targetY: c.y,
            targetZ: c.z,
            creatureId: c.id,
            species: 'dolphin',
          };
        }
      }

      const expDist = Math.hypot(
        this.world.expeditionJournalPos.x - this.playerX,
        this.world.expeditionJournalPos.z - this.playerZ,
      );
      if (expDist < 3.2) {
        return {
          id: 'expedition_journal',
          label: 'Read Expedition Journal',
          kind: 'expedition_journal',
          actionCategory: 'use',
          distance: expDist,
          targetX: this.world.expeditionJournalPos.x,
          targetY: this.world.expeditionJournalPos.y,
          targetZ: this.world.expeditionJournalPos.z,
        };
      }

      // Check Ship Navigator Companion NPC & Dropped Gun on Island Floor
      if (
        this.navigatorCompanion &&
        this.worldType === 'island' &&
        this.currentDimension === 'overworld'
      ) {
        const droppedGun = this.navigatorCompanion.getDroppedGunPos();
        if (droppedGun) {
          const gunDist = Math.hypot(
            droppedGun.x - this.playerX,
            droppedGun.z - this.playerZ,
          );
          if (gunDist < 4.0 && Math.abs(droppedGun.y - this.playerY) < 2.8) {
            return {
              id: 'navigator_dropped_gun',
              label: `Pick Up ${this.navigatorCompanion.getName().split(' ')[0]}'s Gun`,
              sublabel: 'Dropped on the island floor before walking into the ocean (+Gun, +24 Ammo)',
              kind: 'shipwreck',
              actionCategory: 'gather',
              distance: gunDist,
              targetX: droppedGun.x,
              targetY: droppedGun.y,
              targetZ: droppedGun.z,
            };
          }
        }
        if (!this.navigatorCompanion.isGone() && !this.navigatorCompanion.isDeparting()) {
          const navDist = Math.hypot(
            this.navigatorCompanion.x - this.playerX,
            this.navigatorCompanion.z - this.playerZ,
          );
          if (navDist < 4.4 && Math.abs(this.navigatorCompanion.y - this.playerY) < 2.8) {
            return {
              id: 'ship_navigator_npc',
              label: `Talk to ${this.navigatorCompanion.getName()}`,
              sublabel: 'Commands, Shared Backpack, Chop/Hunt/Shelter/Drive',
              kind: 'shipwreck',
              actionCategory: 'use',
              distance: navDist,
              targetX: this.navigatorCompanion.x,
              targetY: this.navigatorCompanion.y,
              targetZ: this.navigatorCompanion.z,
            };
          }
        }
      }

      // Check Farmer NPC beside the Farm Market
      const farmerDist = Math.hypot(
        this.world.farmerNpcPos.x - this.playerX,
        this.world.farmerNpcPos.z - this.playerZ,
      );
      if (farmerDist < 3.6 && Math.abs(this.world.farmerNpcPos.y - this.playerY) < 2.2) {
        return {
          id: 'farmer_npc',
          label: 'Talk to Farmer Elias',
          sublabel: 'Buy Seeds, Veggies & Sell Harvest',
          kind: 'farmer',
          actionCategory: 'use',
          distance: farmerDist,
          targetX: this.world.farmerNpcPos.x,
          targetY: this.world.farmerNpcPos.y,
          targetZ: this.world.farmerNpcPos.z,
        };
      }

      // Check awake Village Merchants within 3 meters (StructureManager)
      if (this.currentDimension === 'overworld') {
        const villager = this.structureManager.getNearestTradableVillager({
          x: this.playerX,
          y: this.playerY,
          z: this.playerZ,
        });
        if (villager) {
          return {
            id: villager.id,
            label: `Trade with ${villager.displayName}`,
            sublabel: 'Buy Seeds, Supplies & Sell Loot',
            kind: 'farmer',
            actionCategory: 'use',
            distance: Math.hypot(villager.x - this.playerX, villager.z - this.playerZ),
            targetX: villager.x,
            targetY: villager.y,
            targetZ: villager.z,
          };
        }
      }
    }

    // Check Hilltop House / Park Pavilion Functional Stations
    let bestHouse: HouseStationTarget | null = null;
    let bestHouseDist = 3.6;
    for (const hs of this.getActiveStations()) {
      if (Math.abs(hs.y - this.playerY) > 2.2) continue;
      const d = Math.hypot(hs.x - this.playerX, hs.z - this.playerZ);
      if (d <= hs.range && d < bestHouseDist) {
        bestHouseDist = d;
        bestHouse = hs;
      }
    }
    if (bestHouse) {
      return {
        id: bestHouse.id,
        label: bestHouse.label,
        sublabel: bestHouse.sublabel,
        kind: bestHouse.kind,
        actionCategory:
          bestHouse.kind === 'house_stove'
            ? 'cook'
            : bestHouse.kind === 'house_sink' || bestHouse.kind === 'house_shower'
              ? 'clean'
              : 'use',
        distance: bestHouseDist,
        targetX: bestHouse.x,
        targetY: bestHouse.y,
        targetZ: bestHouse.z,
      };
    }

    // Check Nearby Player-Planted Crops (Harvest or Water)
    for (const crop of this.plantedCrops) {
      const d = Math.hypot(crop.x - this.playerX, crop.z - this.playerZ);
      if (d < 2.6) {
        const cropName = ITEMS[crop.produceItemId].name;
        return {
          id: crop.id,
          label: crop.mature
            ? `Harvest ${cropName}`
            : crop.watered
              ? `${cropName} Growing`
              : `Water ${cropName}`,
          sublabel: crop.mature
            ? 'Ready to Pick!'
            : `${Math.round(crop.growthProgress * 100)}% grown`,
          kind: 'planted_crop',
          actionCategory: crop.mature ? 'harvest' : 'clean',
          distance: d,
          targetX: crop.x,
          targetY: crop.y,
          targetZ: crop.z,
        };
      }
    }

    const targetResource = this.findNearestResourceNode(3.9, () => true);
    if (targetResource) {
      const d = Math.hypot(
        targetResource.x - this.playerX,
        targetResource.z - this.playerZ,
      );
      const labelMap: Record<ResourceNodeKind, string> = {
        palm_tree: 'Chop Palm Tree',
        tropical_tree: 'Chop Hardwood Tree',
        oak_tree: 'Chop Oak Tree',
        dark_oak_tree: 'Chop Dark Oak Tree',
        huge_red_mushroom: 'Harvest Huge Red Mushroom',
        huge_brown_mushroom: 'Harvest Huge Brown Mushroom',
        banyan_tree: 'Chop Banyan Tree',
        highland_cedar: 'Chop Highland Cedar',
        birch_tree: 'Chop Birch Tree',
        old_growth_birch_tree: 'Chop Tall Birch Tree',
        pale_oak_tree: 'Chop Pale Oak Tree',
        taiga_pine_tree: 'Chop Taiga Pine',
        old_growth_pine_tree: 'Chop Ancient Pine',
        spruce_tree: 'Chop Spruce Tree',
        mega_spruce_tree: 'Chop Mega Spruce Tree',
        snowy_spruce_tree: 'Chop Frosted Spruce',
        jungle_tree: 'Chop Jungle Tree',
        mega_jungle_tree: 'Chop Mega Jungle Tree',
        cherry_tree: 'Chop Cherry Blossom Tree',
        bee_nest_oak: 'Chop Meadow Bee-Nest Oak',
        acacia_tree: 'Chop Savanna Acacia Tree',
        swamp_oak_tree: 'Chop Vine-Draped Swamp Oak',
        mangrove_tree: 'Chop Mangrove Tree',
        cactus_plant: 'Harvest Desert Cactus',
        blue_orchid_patch: 'Gather Swamp Blue Orchids',
        terracotta_spire: 'Mine Terracotta Hoodoo Spire',
        coral_cluster: 'Harvest Coral Reef Cluster',
        jungle_bush: 'Clear Jungle Bush',
        bamboo_stalk: 'Harvest Bamboo Culms',
        flower_patch: 'Gather Wildflowers',
        rose_bush: 'Gather Rose Bush',
        lilac_bush: 'Gather Lilac Blossoms',
        peony_bush: 'Gather Peonies',
        sunflower_patch: 'Gather Sunflowers',
        pink_petals: 'Gather Cherry Pink Petals',
        eyeblossom_patch: 'Inspect Eyeblossoms',
        dead_bush: 'Collect Dry Twigs',
        melon_patch: 'Harvest Wild Melon',
        branch_pile: 'Collect Branches',
        small_stone: 'Break Small Stone',
        stone_boulder: 'Mine Stone Boulder',
        mossy_cobble_boulder: 'Mine Mossy Cobble Boulder',
        mountain_rock: 'Mine Mountain Rock',
        ice_spike: 'Mine Packed Ice Spike',
        ore_vein: 'Mine Metal Ore Vein',
        emerald_ore_vein: 'Mine Emerald Ore Vein',
        gold_ore_vein: 'Mine Surface Gold Ore Vein',
        flint_outcrop: 'Chip Sharp Flint',
        fiber_fern: 'Gather Plant Fiber',
        grass_tuft: 'Cut Dried Grass',
        wheat_patch: 'Cut Golden Wheat',
        bean_patch: 'Harvest Wild Beans',
        sugarcane_patch: 'Cut Lake Sugarcane',
        clay_deposit: 'Dig River Clay',
        sand_mound: 'Scoop Coastal Sand',
        berry_bush: 'Pick Jungle Berries',
        mushroom_cluster: 'Forage Mushrooms',
        plant_cluster: 'Gather Canopy Leaves',
        shipwreck_crate: 'Search Shipwreck Crate',
        expedition_crate: 'Loot Expedition Crate',
      };
      const category: NearbyInteraction['actionCategory'] =
        this.isTreeKind(targetResource.kind)
          ? 'chop'
          : this.isRockKind(targetResource.kind)
            ? 'mine'
            : targetResource.kind === 'wheat_patch' ||
                targetResource.kind === 'sugarcane_patch'
              ? 'harvest'
              : 'gather';
      return {
        id: targetResource.id,
        label: labelMap[targetResource.kind],
        sublabel:
          targetResource.maxHp > 1
            ? `HP ${targetResource.hp}/${targetResource.maxHp}`
            : undefined,
        kind: 'resource',
        actionCategory: category,
        distance: d,
        targetX: targetResource.x,
        targetY: targetResource.y,
        targetZ: targetResource.z,
      };
    }

    for (const fp of this.creatures.footprints) {
      const d = Math.hypot(fp.x - this.playerX, fp.z - this.playerZ);
      if (d < 2.8) {
        return {
          id: fp.id,
          label: 'Inspect Tracks',
          sublabel: fp.name,
          kind: 'footprint',
          actionCategory: 'use',
          distance: d,
          targetX: fp.x,
          targetY: fp.y,
          targetZ: fp.z,
          species: fp.species,
        };
      }
    }

    const fwdX = -Math.sin(this.camYaw);
    const fwdZ = -Math.cos(this.camYaw);
    const aheadX = this.playerX + fwdX * 1.8;
    const aheadZ = this.playerZ + fwdZ * 1.8;

    const hasWashable =
      this.getItemCount('raw_meat') > 0 || this.getItemCount('dino_meat') > 0;
    if (this.isNearLakeWater() && hasWashable && this.getItemCount('soap') > 0) {
      return {
        id: 'wash_meat_lake',
        label: 'Wash & Scrub Meat with Soap',
        sublabel: 'Azure Lake Water → Washed Meat',
        kind: 'wash_meat',
        actionCategory: 'clean',
        distance: 1.4,
        targetX: aheadX,
        targetY: LAKE_CENTER.waterY,
        targetZ: aheadZ,
      };
    }

    if (
      isFreshwaterAt(this.playerX, this.playerZ) ||
      isFreshwaterAt(aheadX, aheadZ)
    ) {
      return {
        id: 'fresh_water',
        label: 'Drink Fresh Water',
        kind: 'water',
        actionCategory: 'use',
        distance: 1.5,
        targetX: aheadX,
        targetY: getWaterLevelAt(aheadX, aheadZ),
        targetZ: aheadZ,
      };
    }

    if (this.isNearOceanWater() && this.getItemCount('dirty_water_bottle') > 0) {
      return {
        id: 'clean_water_bottle',
        label: 'Clean & Fill Water Bottle',
        sublabel: 'Ocean Surf → Filtered Water',
        kind: 'clean_bottle',
        actionCategory: 'clean',
        distance: 1.4,
        targetX: aheadX,
        targetY: OCEAN_LEVEL,
        targetZ: aheadZ,
      };
    }

    return null;
  }

  private updateProjectilesAndResources(dt: number): void {
    // Animate per-chop tree/rock impact wobble cleanly on the animation loop
    for (const [nid, timer] of this.nodeHitShakeTimers.entries()) {
      const next = timer - dt;
      const handle = this.world.resourceHandles.get(nid);
      const node = this.nodeById.get(nid);
      if (next <= 0 || !node || node.felled || node.hp <= 0) {
        this.nodeHitShakeTimers.delete(nid);
        if (handle?.felledPivot && (!node || !node.felled)) {
          handle.felledPivot.rotation.z = 0;
          handle.felledPivot.rotation.x = 0;
        } else if (handle?.root) {
          handle.root.rotation.z = 0;
        }
      } else {
        this.nodeHitShakeTimers.set(nid, next);
        const wobble = Math.sin(next * 52) * 0.065 * (next / 0.22);
        if (handle?.felledPivot && !node.felled) {
          handle.felledPivot.rotation.z = wobble;
        } else if (handle?.root) {
          handle.root.rotation.z = wobble;
        }
      }
    }

    if (this.worldType === 'island') {
      if (this.activeFellingNodeIds.size > 0) {
        for (const nid of this.activeFellingNodeIds) {
          const n = this.nodeById.get(nid);
          if (!n || !n.felled || (n.fallTimer ?? 0) <= 0) {
            this.activeFellingNodeIds.delete(nid);
            continue;
          }
          n.fallTimer = Math.max(0, (n.fallTimer ?? 0) - dt);
          const handle = this.world.resourceHandles.get(n.id);
          if (handle?.felledPivot) {
            const t = 1 - (n.fallTimer ?? 0) / 1.05;
            const tilt = t * t * (Math.PI / 2.08);
            const fdx = n.fallDirX ?? 1;
            const fdz = n.fallDirZ ?? 0;
            handle.felledPivot.rotation.z = -fdx * tilt;
            handle.felledPivot.rotation.x = fdz * tilt;
          }
          if ((n.fallTimer ?? 0) <= 0) {
            this.activeFellingNodeIds.delete(nid);
            this.syncResourceVisual(n);
            const fdx = n.fallDirX ?? 1;
            const fdz = n.fallDirZ ?? 0;
            const dropX = n.x + fdx * 2.1;
            const dropZ = n.z + fdz * 2.1;
            this.spawnParticles(dropX, getTerrainHeight(dropX, dropZ) + 0.35, dropZ, 0x85532a, 10);
            const grants = this.pendingTreeDrops.get(n.id);
            if (grants) {
              this.pendingTreeDrops.delete(n.id);
              this.spawnWorldPickupsFromGrants(n.x, n.z, grants, fdx * 2.1, fdz * 2.1, 1.85);
            }
          }
        }
      }

      if (this.respawningNodeIds.size > 0) {
        for (const nid of this.respawningNodeIds) {
          const n = this.nodeById.get(nid);
          if (!n || n.hp > 0) {
            this.respawningNodeIds.delete(nid);
            continue;
          }
          n.respawnTimer -= dt;
          if (n.respawnTimer <= 0) {
            n.hp = n.maxHp;
            n.felled = false;
            n.fallTimer = 0;
            this.respawningNodeIds.delete(nid);
            this.activeFellingNodeIds.delete(nid);
            this.shakenTreeDropIds.delete(n.id);
            this.pendingTreeDrops.delete(n.id);
            this.nodeHitShakeTimers.delete(n.id);
            this.world.restoreBatchedNode(n.id);
            this.syncResourceVisual(n);
          }
        }
      }
    }

    // Grow player-planted crops smoothly through 3 visual stages
    const isRaining = this.weather === 'rain' || this.weather === 'storm';
    for (const crop of this.plantedCrops) {
      if (crop.mature) continue;
      if (isRaining) crop.watered = true;
      const prevStage = crop.growthProgress >= 0.45 ? 1 : 0;
      const rate = crop.watered ? 1 / 26 : 1 / 52;
      crop.growthProgress = Math.min(1, crop.growthProgress + dt * rate);
      if (crop.growthProgress >= 1) {
        crop.mature = true;
        this.rebuildCropMesh(crop);
      } else {
        const nextStage = crop.growthProgress >= 0.45 ? 1 : 0;
        if (nextStage !== prevStage) {
          this.rebuildCropMesh(crop);
        }
      }
    }

    // Gently animate, drop falling tree fruit with gravity, and expire ground pickups
    const inOverworld = this.currentDimension === 'overworld';
    const maxDrawSq = this.effectiveMaxDrawDistance * this.effectiveMaxDrawDistance;
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      if ((p.autoCollectDelay ?? 0) > 0) {
        p.autoCollectDelay = Math.max(0, (p.autoCollectDelay ?? 0) - dt);
      }
      p.life -= dt;
      if (p.life <= 0) {
        this.recyclePickupMesh(p.itemId, p.mesh);
        this.pickups.splice(i, 1);
        continue;
      }
      const pdx = p.x - this.playerX;
      const pdz = p.z - this.playerZ;
      p.mesh.visible = inOverworld && (pdx * pdx + pdz * pdz <= maxDrawSq);
      if (p.currentY !== undefined && p.currentY > p.y + 0.05) {
        p.fallYVel = (p.fallYVel ?? 0) + 16 * dt;
        p.currentY = Math.max(p.y + 0.05, p.currentY - p.fallYVel * dt);
        p.mesh.position.y = p.currentY;
        p.mesh.rotation.y += dt * 2.4;
        if (p.currentY <= p.y + 0.05) {
          p.currentY = undefined;
          p.fallYVel = 0;
          if (p.mesh.visible) {
            this.spawnParticles(p.x, p.y + 0.14, p.z, 0x84cc16, 4);
          }
        }
        continue;
      }
      if (!p.mesh.visible) continue;
      if (p.placedOnGround) {
        p.mesh.position.y = p.y + 0.02;
      } else {
        p.mesh.rotation.y += dt * 1.15;
        p.mesh.position.y = p.y + 0.05 + Math.sin(this.elapsed * 3.2 + i) * 0.04;
      }
    }

    // Update collapse physics, aerial drops, settle timers, scavenge cooldowns, and expiration on animal carcasses
    for (let i = this.carcasses.length - 1; i >= 0; i--) {
      const c = this.carcasses[i];
      const cdx = c.x - this.playerX;
      const cdz = c.z - this.playerZ;
      c.mesh.visible = inOverworld && (cdx * cdx + cdz * cdz <= maxDrawSq);
      if (c.currentY !== undefined && c.currentY > c.y) {
        c.fallYVel = (c.fallYVel ?? 0) + 18 * dt;
        c.currentY = Math.max(c.y, c.currentY - c.fallYVel * dt);
        c.mesh.position.y = c.currentY;
        if (c.currentY <= c.y) {
          c.currentY = undefined;
          this.spawnParticles(c.x, c.y + 0.15, c.z, 0xd6d3d1, 6);
        }
      }
      if (c.fallProgress < 1) {
        c.fallProgress = Math.min(1, c.fallProgress + dt * 2.4);
        const t = c.fallProgress;
        const eased = 1 - (1 - t) * (1 - t);
        const creatureRoot = c.mesh.userData.creatureRoot as THREE.Group | undefined;
        if (creatureRoot) {
          creatureRoot.rotation.z = THREE.MathUtils.lerp(0.12, Math.PI / 2.05, eased);
          const bounce = t > 0.72 ? Math.abs(Math.sin(((t - 0.72) / 0.28) * Math.PI)) * 0.08 : 0;
          const startY = c.isDino ? 0.95 : 0.45;
          const restY = c.isDino ? 0.38 : 0.18;
          creatureRoot.position.y = THREE.MathUtils.lerp(startY, restY, eased) + bounce;
        }
      }
      if (c.scavengeToastCooldown > 0) {
        c.scavengeToastCooldown = Math.max(0, c.scavengeToastCooldown - dt);
      }
      if ((c.autoCollectDelay ?? 0) > 0) {
        c.autoCollectDelay = Math.max(0, (c.autoCollectDelay ?? 0) - dt);
      }
      c.life -= dt;
      if (c.life <= 0) {
        this.scene.remove(c.mesh);
        this.disposeObject3D(c.mesh);
        this.carcasses.splice(i, 1);
      }
    }

    for (let i = this.arrows.length - 1; i >= 0; i--) {
      const a = this.arrows[i];
      a.life -= dt;
      const prevX = a.pos.x;
      const prevY = a.pos.y;
      const prevZ = a.pos.z;
      if (a.isBullet) {
        a.vel.y -= 1.8 * dt;
      } else {
        a.vel.y -= 9.8 * dt;
      }
      a.pos.addScaledVector(a.vel, dt);
      a.mesh.position.copy(a.pos);

      const segDx = a.pos.x - prevX;
      const segDy = a.pos.y - prevY;
      const segDz = a.pos.z - prevZ;
      const segLenSq = segDx * segDx + segDy * segDy + segDz * segDz;

      let remove = a.life <= 0 || a.pos.y < getTerrainHeight(a.pos.x, a.pos.z);
      if (a.pos.y < getTerrainHeight(a.pos.x, a.pos.z)) {
        this.spawnParticles(
          a.pos.x,
          a.pos.y + 0.05,
          a.pos.z,
          a.isBullet ? 0xfde047 : 0x78716c,
          a.isBullet ? 6 : 4,
        );
      }

      if (!remove && this.world?.caveCeilings) {
        for (const cc of this.world.caveCeilings) {
          if (cc.collapsed || cc.falling) continue;
          const dx = a.pos.x - cc.x;
          const dy = a.pos.y - cc.y;
          const dz = a.pos.z - cc.z;
          const r = cc.radius + 0.55;
          if (dx * dx + dy * dy + dz * dz <= r * r) {
            this.damageCaveCeiling(cc, a.isBullet ? 24 : 20);
            remove = true;
            break;
          }
        }
      }

      if (!remove) {
        _vec3A.set(prevX, prevY, prevZ);
        if (segLenSq > 0.00001) {
          const invLen = 1 / Math.sqrt(segLenSq);
          _vec3B.set(segDx * invLen, segDy * invLen, segDz * invLen);
          const segLen = Math.sqrt(segLenSq);
          const zoneHit = raycastCreatureZone(
            _vec3A,
            _vec3B,
            segLen + 0.65,
            this.creatures.creatures,
            a.isBullet ? 0.28 : 0.22,
          );
          const structHit =
            this.worldType === 'island' && this.currentDimension === 'overworld'
              ? this.structureManager.raycastEntities(
                  _vec3A,
                  _vec3B,
                  segLen + 0.65,
                  false,
                )
              : null;

          if (structHit && (!zoneHit || structHit.distance < zoneHit.distance)) {
            this.damageStructureEntity(
              structHit.entity,
              a.damage,
              a.isBullet ? 'Gunshot' : 'Bow Shot',
              structHit.hitPoint.x,
              structHit.hitPoint.y,
              structHit.hitPoint.z,
            );
            remove = true;
          } else if (zoneHit) {
            const c = this.creatures.creatures.find((cr) => cr.id === zoneHit.creatureId);
            if (c) {
              this.applyCreatureZoneWeaponHit(
                c,
                zoneHit.zone,
                a.isBullet ? 'ballistic' : 'pierce',
                a.damage,
                zoneHit.isGapSlip,
                zoneHit.hitPoint.x,
                zoneHit.hitPoint.y,
                zoneHit.hitPoint.z,
                a.isBullet ? 'Gunshot' : 'Bow Shot',
                a.isBullet ? { knockback: 2.6 } : undefined,
              );
              remove = true;
            }
          }
        }
      }

      // If high velocity bullet didn't hit creature, check if it struck a nearby breakable resource node via spatial hash
      if (!remove && a.isBullet && this.worldType === 'island') {
        const bCx = Math.floor(a.pos.x / 16);
        const bCz = Math.floor(a.pos.z / 16);
        outerBulletNodes: for (let gdx = -1; gdx <= 1; gdx++) {
          for (let gdz = -1; gdz <= 1; gdz++) {
            const bucket = this.resourceNodeGrid.get((bCx + gdx + 2048) * 4096 + (bCz + gdz + 2048));
            if (!bucket) continue;
            for (let bi = 0; bi < bucket.length; bi++) {
              const n = bucket[bi];
              if (n.hp <= 0) continue;
              const dx = a.pos.x - n.x;
              const dz = a.pos.z - n.z;
              if (dx * dx + dz * dz < 1.96 && a.pos.y > n.y && a.pos.y < n.y + 4.5) {
                this.spawnParticles(a.pos.x, a.pos.y, a.pos.z, 0xffd700, 6);
                this.harvestResourceNode(n.id, ITEMS['gun']);
                remove = true;
                break outerBulletNodes;
              }
            }
          }
        }
      }

      if (remove) {
        a.mesh.visible = false;
        this.scene.remove(a.mesh);
        if (a.isBullet) {
          if (this.bulletMeshPool.length < 32) this.bulletMeshPool.push(a.mesh);
        } else {
          if (this.arrowMeshPool.length < 16) this.arrowMeshPool.push(a.mesh);
        }
        if (this.arrowEntryPool.length < 48) this.arrowEntryPool.push(a);
        this.arrows.splice(i, 1);
      }
    }

    // Update kicked rock/gravel debris projectiles (pooled reuse)
    for (let i = this.debrisProjectiles.length - 1; i >= 0; i--) {
      const dp = this.debrisProjectiles[i];
      dp.life -= dt;
      const prevX = dp.pos.x;
      const prevY = dp.pos.y;
      const prevZ = dp.pos.z;
      dp.vel.y -= 14 * dt;
      dp.pos.addScaledVector(dp.vel, dt);
      dp.mesh.position.copy(dp.pos);
      dp.mesh.rotation.x += dt * 14;
      dp.mesh.rotation.z += dt * 11;

      let removeDebris = dp.life <= 0 || dp.pos.y < getTerrainHeight(dp.pos.x, dp.pos.z);

      if (!removeDebris && this.world?.caveCeilings) {
        for (const cc of this.world.caveCeilings) {
          if (cc.collapsed || cc.falling) continue;
          const dx = dp.pos.x - cc.x;
          const dy = dp.pos.y - cc.y;
          const dz = dp.pos.z - cc.z;
          const r = cc.radius + 0.5;
          if (dx * dx + dy * dy + dz * dz <= r * r) {
            this.damageCaveCeiling(cc, 12);
            removeDebris = true;
            break;
          }
        }
      }

      if (!removeDebris) {
        _vec3A.set(prevX, prevY, prevZ);
        _vec3B.subVectors(dp.pos, _vec3A);
        const segLen = _vec3B.length();
        if (segLen > 0.001) {
          _vec3B.multiplyScalar(1 / segLen);
          const hit = raycastCreatureZone(
            _vec3A,
            _vec3B,
            segLen + 0.55,
            this.creatures.creatures,
            0.35,
          );
          if (hit) {
            const c = this.creatures.creatures.find((cr) => cr.id === hit.creatureId);
            if (c) {
              this.creatures.blindCreature(c, 3.0, this.playerX, this.playerZ, 1.0);
              this.spawnParticles(hit.hitPoint.x, hit.hitPoint.y, hit.hitPoint.z, 0xa8a29e, 10);
              this.toast(
                `Debris struck ${c.displayNameOverride || c.spec.displayName}'s ${hit.zone} — BLINDED!`,
                'craft',
              );
              removeDebris = true;
            }
          }
        }
      }

      if (removeDebris) {
        dp.mesh.visible = false;
        this.scene.remove(dp.mesh);
        if (this.debrisMeshPool.length < 18) this.debrisMeshPool.push(dp.mesh);
        if (this.debrisEntryPool.length < 18) this.debrisEntryPool.push(dp);
        this.debrisProjectiles.splice(i, 1);
      }
    }

    // Step Collapsible Cave Ceiling Stalactites (falling crush impact & mineral regrowth)
    if (this.world?.caveCeilings) {
      for (const cc of this.world.caveCeilings) {
        if (cc.falling) {
          cc.velY += 22 * dt;
          cc.y -= cc.velY * dt;
          cc.mesh.position.y = cc.y;
          cc.mesh.rotation.x += dt * 1.8;
          cc.mesh.rotation.z += dt * 1.4;
          if (cc.y <= cc.groundY + 0.45) {
            cc.falling = false;
            cc.collapsed = true;
            cc.mesh.visible = false;
            this.caveCeilingRespawnTimers.set(cc.id, 42);
            this.sound.playCeilingCollapse();
            this.cameraShakeTimer = Math.max(this.cameraShakeTimer, 0.58);
            this.terrainEngine.carveJaggedCrater(cc.x, cc.z, 3.4, 0.85);
            this.terrainEngine.syncAllDeformedVertices(
              this.world.terrainMesh,
              this.world.baseTerrainColors,
            );
            this.spawnParticles(cc.x, cc.groundY + 0.6, cc.z, 0x57534e, 22);
            this.spawnParticles(cc.x, cc.groundY + 0.9, cc.z, 0xf97316, 12);

            let crushedBossOrFoe = false;
            for (const c of this.creatures.creatures) {
              if (!c.alive || !c.cycleActive) continue;
              if (Math.hypot(c.x - cc.x, c.z - cc.z) <= 6.2) {
                crushedBossOrFoe = true;
                this.creatures.shatterAllArmor(c);
                const res = this.creatures.damageCreature(c, 240, cc.x, cc.z, {
                  stunSeconds: 3.6,
                  knockback: 2.5,
                });
                const cname = c.displayNameOverride || c.spec.displayName;
                if (res.killed) {
                  this.handleCreatureDefeated(c, res.drops, 'Cave Ceiling Crush');
                } else {
                  this.toast(
                    `Cave Ceiling Crushed ${cname} (240 DMG, All Armor Shattered + Stunned)!`,
                    'craft',
                  );
                }
              }
            }
            if (!crushedBossOrFoe) {
              this.toast('Cave Ceiling Stalactites Collapsed!', 'info');
            }
          }
        } else if (cc.collapsed) {
          const rem = (this.caveCeilingRespawnTimers.get(cc.id) ?? 0) - dt;
          if (rem <= 0) {
            this.caveCeilingRespawnTimers.delete(cc.id);
            cc.collapsed = false;
            cc.hp = cc.maxHp;
            const caveBaseY = getTerrainHeight(CAVE_POS.x, CAVE_POS.z);
            cc.y = caveBaseY + 4.4;
            cc.mesh.position.set(cc.x, cc.y, cc.z);
            cc.mesh.rotation.set(0, 0, 0);
            cc.mesh.visible = true;
          } else {
            this.caveCeilingRespawnTimers.set(cc.id, rem);
          }
        }
      }
    }

    // Step Pooled Instanced Particles (Zero-GC, 1 draw call; early-out when pool idle)
    if (this.hasActiveParticles && this.particleInstanced) {
      let anyParticleDirty = false;
      let stillActive = false;
      for (let i = 0; i < MAX_POOLED_PARTICLES; i++) {
        const p = this.particlePool[i];
        if (!p.active) continue;
        anyParticleDirty = true;
        p.life -= dt;
        if (p.life <= 0) {
          p.active = false;
          this.particleInstanced.setMatrixAt(i, _zeroMat4);
          continue;
        }
        stillActive = true;
        p.vy -= 12 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        const sc = Math.max(0.1, p.life * 2);
        _vec3A.set(p.x, p.y, p.z);
        _scratchQuat.identity();
        _scratchScale.setScalar(sc);
        _scratchMat4.compose(_vec3A, _scratchQuat, _scratchScale);
        this.particleInstanced.setMatrixAt(i, _scratchMat4);
      }
      if (anyParticleDirty) {
        this.particleInstanced.instanceMatrix.needsUpdate = true;
      }
      this.hasActiveParticles = stillActive;
    }

    // Step Pooled Brass Shell Casings, Muzzle Flashes & P2P Tracers
    for (const sc of this.shellCasingPool) {
      if (!sc.active) continue;
      sc.life -= dt;
      if (sc.life <= 0) {
        sc.active = false;
        sc.mesh.visible = false;
        continue;
      }
      sc.vel.y -= 15 * dt;
      sc.pos.addScaledVector(sc.vel, dt);
      const gy = getTerrainHeight(sc.pos.x, sc.pos.z) + 0.02;
      if (sc.pos.y <= gy) {
        sc.pos.y = gy;
        sc.vel.y = Math.abs(sc.vel.y) * 0.25;
        sc.vel.x *= 0.65;
        sc.vel.z *= 0.65;
      }
      sc.mesh.position.copy(sc.pos);
      sc.mesh.rotation.x += sc.rx * dt;
      sc.mesh.rotation.z += sc.rz * dt;
    }
    for (const mf of this.muzzleFlashPool) {
      if (mf.life <= 0) continue;
      mf.life -= dt;
      if (mf.life <= 0) mf.mesh.visible = false;
    }
    for (const tr of this.p2pTracerPool) {
      if (tr.life <= 0) continue;
      tr.life -= dt;
      if (tr.life <= 0) tr.mesh.visible = false;
    }
  }

  private updateLocalPlayerAvatar(dt: number, visible: boolean): void {
    const h = this.localPlayerHandle;
    if (!h) return;
    h.group.visible = visible;
    if (!visible) return;

    h.group.position.set(this.playerX, this.playerY, this.playerZ);
    h.group.rotation.y = this.playerYaw;
    h.bodyGroup.position.y = this.isCrouching ? -0.35 : 0;
    h.headGroup.rotation.x = THREE.MathUtils.clamp(-this.camPitch * 0.55, -0.45, 0.45);

    const eqItemId = this.getEquippedItemId();
    const hasGun = Boolean(eqItemId && isFirearmItem(eqItemId));
    h.heldGunMesh.visible = hasGun;
    h.heldToolMesh.visible = Boolean(eqItemId) && !hasGun;

    // Sync equipped Gun Skin cosmetic in 3rd-person
    const gunSkin = getEquippedGunSkinForWeapon(eqItemId);
    const nextGunSkinKey = `${eqItemId ?? 'none'}|${gunSkin?.id ?? 'default'}`;
    if (this.localAppliedGunSkinId !== nextGunSkinKey) {
      this.localAppliedGunSkinId = nextGunSkinKey;
      const gunMat = h.heldGunMesh.material;
      if (gunMat instanceof THREE.MeshStandardMaterial) {
        if (h.heldGunMesh.geometry instanceof THREE.BufferGeometry) {
          ensureGeometryHasUv(h.heldGunMesh.geometry);
        }
        if (gunSkin && gunSkin.category === 'gun_skin') {
          const imgTex = getCosmeticImageTexture(gunSkin.productImageUrl);
          gunMat.color.set(imgTex ? '#ffffff' : gunSkin.visual.primaryHex);
          gunMat.metalness = gunSkin.visual.metalness;
          gunMat.roughness = gunSkin.visual.roughness;
          applySafeStandardMaps(gunMat, {
            map: imgTex || getCosmeticPatternTexture(gunSkin.visual),
          });
          if (gunSkin.visual.emissiveHex) {
            gunMat.emissive.set(gunSkin.visual.emissiveHex);
            gunMat.emissiveIntensity = 0.28;
          } else {
            gunMat.emissive.set(0x000000);
            gunMat.emissiveIntensity = 0;
          }
        } else {
          gunMat.color.set(0x1e293b);
          gunMat.metalness = 0.78;
          gunMat.roughness = 0.3;
          applySafeStandardMaps(gunMat, { map: null });
          gunMat.emissive.set(0x000000);
          gunMat.emissiveIntensity = 0;
        }
      }
    }

    // Sync equipped Backpack Skin cosmetic in 3rd-person
    const bpSkin = getEquippedBackpackSkin();
    const nextBpKey = bpSkin?.id ?? null;
    if (this.localAppliedBackpackSkinId !== nextBpKey) {
      this.localAppliedBackpackSkinId = nextBpKey;
      applyBackpackSkinToPlayerHandle(h, bpSkin ?? null);
    }

    const isMoving = this.currentSpeedMps > 0.35;
    if (this.isSwimming) {
      const stroke = Math.sin(this.elapsed * 6.5) * 0.75;
      h.armL.rotation.x = -1.2 + stroke;
      h.armR.rotation.x = -1.2 - stroke;
      h.legL.rotation.x = -0.35 + stroke * 0.5;
      h.legR.rotation.x = -0.35 - stroke * 0.5;
    } else if (isMoving) {
      const swing = Math.sin(this.walkBobPhase) * (this.isSprinting ? 0.78 : 0.55);
      h.armL.rotation.x = swing;
      h.armR.rotation.x = hasGun ? -1.32 + this.camPitch * 0.55 : -swing;
      h.legL.rotation.x = -swing;
      h.legR.rotation.x = swing;
    } else {
      h.armL.rotation.x = THREE.MathUtils.damp(h.armL.rotation.x, 0, 10, dt);
      h.armR.rotation.x = THREE.MathUtils.damp(
        h.armR.rotation.x,
        hasGun ? -1.32 + this.camPitch * 0.55 : 0,
        10,
        dt,
      );
      h.legL.rotation.x = THREE.MathUtils.damp(h.legL.rotation.x, 0, 10, dt);
      h.legR.rotation.x = THREE.MathUtils.damp(h.legR.rotation.x, 0, 10, dt);
    }
  }

  private updateCamera(): void {
    const dt = Math.min(0.05, Math.max(0.001, this.lastSimDt || 0.016));
    const isThirdPerson = this.playerCameraRig.mode === 'third_person';
    this.masterRuntime.isThirdPerson = isThirdPerson;
    this.masterRuntime.isInVehicle = Boolean(this.activeVehicleId);

    const sprintFovKick =
      this.mode === 'playing' &&
      !this.isAiming &&
      !this.activeVehicleId &&
      this.isSprinting &&
      this.currentSpeedMps > 7.5
        ? 72.5
        : 68;
    const targetFov =
      this.mode === 'playing' && this.isAiming && !this.activeVehicleId
        ? isThirdPerson
          ? 56
          : 52
        : sprintFovKick;
    if (Math.abs(this.camera.fov - targetFov) > 0.02) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 14, dt);
      if (Math.abs(this.camera.fov - targetFov) <= 0.05) {
        this.camera.fov = targetFov;
      }
      this.camera.updateProjectionMatrix();
    }

    if (this.mode === 'menu') {
      this.camera.rotation.order = 'YXZ';
      this.camera.up.set(0, 1, 0);
      this.handsRig.root.visible = false;
      if (this.localPlayerHandle) this.localPlayerHandle.group.visible = false;
      const angle = this.menuOrbitAngle;
      if (this.worldType === 'flat') {
        const r = 68;
        _vec3A.set(
          Math.cos(angle) * r,
          22 + Math.sin(angle * 0.7) * 5,
          Math.sin(angle) * r,
        );
        _vec3B.set(0, 3, 0);
      } else {
        // Frame the tropical island bay, Azure Lake & Waterfall Cliff behind the main menu
        const sway = Math.sin(angle * 0.45);
        _vec3A.set(
          LAKE_CENTER.x + 26 + sway * 18,
          17.5 + Math.cos(angle * 0.35) * 2.5,
          LAKE_CENTER.z + 36 + Math.cos(angle * 0.45) * 10,
        );
        _vec3B.set(
          WATERFALL_POS.x - 6,
          9.5,
          (LAKE_CENTER.z + WATERFALL_POS.z) * 0.48,
        );
      }
      if (!this.menuCameraSnapped) {
        this.camera.position.copy(_vec3A);
        this.menuCameraSnapped = true;
      } else if (this.camera.position.distanceToSquared(_vec3A) > 4.0) {
        this.camera.position.lerp(_vec3A, 1 - Math.exp(-7 * dt));
      } else {
        this.camera.position.copy(_vec3A);
      }
      this.camera.lookAt(_vec3B);
      return;
    }

    if (this.ridingCoasterId && this.coasterRuntime) {
      const rideCam = this.coasterRuntime.getRideCameraTransform(this.ridingCoasterId);
      if (rideCam) {
        this.handsRig.root.visible = false;
        if (this.localPlayerHandle) this.localPlayerHandle.group.visible = false;
        this.camera.position.copy(rideCam.position);
        this.camera.up.copy(rideCam.up);
        this.camera.lookAt(rideCam.lookAt);
        this.playerX = rideCam.position.x;
        this.playerY = rideCam.position.y;
        this.playerZ = rideCam.position.z;

        if (rideCam.progressPercent >= 98 && rideCam.segmentLabel === 'Load Station') {
          this.exitCoasterRide();
          this.toast('Train arrived back at Load Station — automatically disembarked rider!', 'discovery');
        }
        return;
      }
      this.ridingCoasterId = null;
    }
    this.camera.rotation.order = 'YXZ';
    this.camera.up.set(0, 1, 0);

    if (this.cinematicActive) {
      this.handsRig.root.visible = false;
      if (this.localPlayerHandle) this.localPlayerHandle.group.visible = false;
      return;
    }

    if (this.tvModalOpen) {
      const tvTarget = this.resolveNearestTvTarget(true);
      if (tvTarget) {
        this.handsRig.root.visible = false;
        if (this.localPlayerHandle) this.localPlayerHandle.group.visible = false;
        const viewportW = this.renderer.domElement.clientWidth || 1024;
        if (viewportW >= 640) {
          _vec3A
            .copy(tvTarget.worldPos)
            .addScaledVector(tvTarget.forward, 2.05)
            .addScaledVector(tvTarget.right, 0.56);
          _vec3A.y += 0.04;
          this._tvLookTarget
            .copy(tvTarget.worldPos)
            .addScaledVector(tvTarget.right, 0.52);
        } else {
          _vec3A
            .copy(tvTarget.worldPos)
            .addScaledVector(tvTarget.forward, 2.2);
          _vec3A.y -= 0.34;
          this._tvLookTarget.copy(tvTarget.worldPos);
          this._tvLookTarget.y -= 0.44;
        }
        const camDistToTarget = this.camera.position.distanceTo(_vec3A);
        if (camDistToTarget > 8) {
          this.camera.position.copy(_vec3A);
        } else {
          this.camera.position.lerp(_vec3A, 0.28);
        }
        this.camera.lookAt(this._tvLookTarget);
        return;
      }
    }

    if (this.activeVehicleId) {
      const activeV = this.vehicles.find((v) => v.id === this.activeVehicleId);
      if (activeV) {
        this.handsRig.root.visible = false;
        if (this.localPlayerHandle) this.localPlayerHandle.group.visible = false;
        const handles = this.vehicleMeshes.get(activeV.id);
        if (this.vehicleInteriorCamera && handles) {
          // Real First-Person Driver Seat Interior View + old-school chest-thump bass pulse
          handles.root.updateMatrixWorld(true);
          const isOldSchool = this.isOldSchoolVehicle(activeV);
          const thumpZ = isOldSchool ? -this.chestThumpPulse * 0.025 : 0;
          const thumpY = isOldSchool ? this.chestThumpPulse * 0.018 : 0;
          _vec3A.set(-0.42, 1.04 + thumpY, -0.02 + thumpZ);
          handles.chassisGroup.localToWorld(_vec3A);
          this.camera.position.copy(_vec3A);
          const lookYaw = this.camYaw;
          const lookPitch = THREE.MathUtils.clamp(this.camPitch, -0.95, 0.85);
          _vec3B.set(
            _vec3A.x - Math.sin(lookYaw) * Math.cos(lookPitch) * 6,
            _vec3A.y + Math.sin(lookPitch) * 6,
            _vec3A.z - Math.cos(lookYaw) * Math.cos(lookPitch) * 6,
          );
          this.camera.lookAt(_vec3B);
          return;
        }
        const specs = this.getVehicleSpecs(activeV);
        const surfY = Math.max(
          getTerrainHeight(activeV.x, activeV.z),
          this.getStructuralSurfaceY(activeV.x, activeV.z, activeV.y + 0.6),
        );
        const airborne = specs.canFly && activeV.y > surfY + 0.6;
        if (airborne) {
          const chaseDist = 9.6;
          const fwdX = -Math.sin(this.camYaw);
          const fwdZ = -Math.cos(this.camYaw);
          const cx = activeV.x - fwdX * chaseDist;
          const cz = activeV.z - fwdZ * chaseDist;
          const groundAtCam = this._groundSampleFn(cx, cz);
          const lift = THREE.MathUtils.clamp(3.3 - this.camPitch * 4.2, 1.3, 8.2);
          const cy = Math.max(groundAtCam + 0.9, activeV.y + lift);
          _vec3A.set(cx, cy, cz);
          this.camera.position.lerp(_vec3A, 1 - Math.exp(-DEFAULT_PLAYER_CAMERA_CONFIG.followResponsiveness * dt));
          this.camera.lookAt(activeV.x, activeV.y + 1.35, activeV.z);
        } else {
          this._chaseTargetScratch.set(activeV.x, activeV.y, activeV.z);
          this.playerCameraRig.yaw = this.camYaw + Math.PI;
          this.playerCameraRig.pitch = THREE.MathUtils.clamp(-this.camPitch, -0.55, 0.75);
          this.playerCameraRig.step(
            this.camera,
            this._chaseTargetScratch,
            true,
            dt,
            this._groundSampleFn,
          );
        }
        return;
      }
    }

    if (this.mountedCreatureId) {
      const c = this.creatures.creatures.find((x) => x.id === this.mountedCreatureId);
      if (c) {
        this.handsRig.root.visible = false;
        if (this.localPlayerHandle) this.localPlayerHandle.group.visible = false;
        const chaseDist = c.species === 'brachiosaurus' || c.species === 'trex' ? 10.5 : 5.8;
        const fwdX = -Math.sin(this.camYaw);
        const fwdZ = -Math.cos(this.camYaw);
        const cx = c.x - fwdX * chaseDist;
        const cz = c.z - fwdZ * chaseDist;
        const groundAtCam = this._groundSampleFn(cx, cz);
        const lift = THREE.MathUtils.clamp(2.8 - this.camPitch * 3.5, 1.2, 7.5);
        const cy = Math.max(groundAtCam + 0.8, c.y + lift);
        _vec3A.set(cx, cy, cz);
        if (this.camera.position.distanceToSquared(_vec3A) > 144) {
          this.camera.position.copy(_vec3A);
        } else {
          this.camera.position.lerp(
            _vec3A,
            1 - Math.exp(-DEFAULT_PLAYER_CAMERA_CONFIG.followResponsiveness * dt),
          );
        }
        this.camera.lookAt(c.x, c.y + (c.species === 'trex' ? 2.4 : 1.4), c.z);
        return;
      }
    }

    if (!Number.isFinite(this.camYaw)) this.camYaw = 0;
    if (!Number.isFinite(this.camPitch)) this.camPitch = -0.05;
    this.playerYaw = this.camYaw + Math.PI;

    this.handsRig.root.visible = !isThirdPerson;
    this.updateLocalPlayerAvatar(dt, isThirdPerson);

    const isMovingOnGround =
      this.grounded && !this.isSwimming && this.currentSpeedMps > 0.35;
    const targetBobBlend = isMovingOnGround
      ? Math.min(1.15, this.currentSpeedMps / 7.6)
      : 0;
    this.camBobBlend = THREE.MathUtils.damp(this.camBobBlend, targetBobBlend, 14, dt);
    this.camStepOffsetY = THREE.MathUtils.damp(this.camStepOffsetY, 0, 18, dt);
    if (Math.abs(this.camStepOffsetY) < 0.0005) this.camStepOffsetY = 0;

    const headBobY =
      this.camBobBlend > 0.01 ? Math.sin(this.walkBobPhase) * 0.044 * this.camBobBlend : 0;
    const hurtKick = this.hurtFlash > 0 ? Math.sin(this.hurtFlash * 32) * 0.04 : 0;
    const chewNod =
      this.eatTimer > 0
        ? -Math.max(0, Math.sin((1 - this.eatTimer / 0.92) * Math.PI * 6)) * 0.028
        : 0;
    const drinkNod =
      this.drinkTimer > 0
        ? Math.sin((1 - this.drinkTimer / 0.95) * Math.PI) * 0.06
        : 0;
    const washDip =
      this.washBottleTimer > 0
        ? -Math.sin((1 - this.washBottleTimer / 1.25) * Math.PI) * 0.12
        : this.washMeatTimer > 0
          ? -Math.sin((1 - this.washMeatTimer / 1.85) * Math.PI) * 0.14
          : 0;

    const blastShakeX =
      this.cameraShakeTimer > 0
        ? Math.sin(this.elapsed * 58) * 0.14 * (this.cameraShakeTimer / 0.45)
        : 0;
    const blastShakeY =
      this.cameraShakeTimer > 0
        ? Math.cos(this.elapsed * 49) * 0.14 * (this.cameraShakeTimer / 0.45)
        : 0;

    const rocketShakeX =
      this.saturnLaunchCameraShake > 0
        ? Math.sin(this.elapsed * 64) * this.saturnLaunchCameraShake * 0.42
        : 0;
    const rocketShakeY =
      this.saturnLaunchCameraShake > 0
        ? Math.cos(this.elapsed * 53) * this.saturnLaunchCameraShake * 0.42
        : 0;

    this.playerCameraRig.yaw = this.playerYaw;
    this._chaseTargetScratch.set(this.playerX, this.playerY, this.playerZ);

    if (isThirdPerson) {
      this.playerCameraRig.pitch = THREE.MathUtils.clamp(-this.camPitch, -0.75, 1.05);
      this.playerCameraRig.step(
        this.camera,
        this._chaseTargetScratch,
        false,
        dt,
        this._groundSampleFn,
      );
      if (blastShakeX !== 0 || rocketShakeX !== 0 || blastShakeY !== 0 || rocketShakeY !== 0) {
        this.camera.position.x += blastShakeX + rocketShakeX;
        this.camera.position.y += blastShakeY + rocketShakeY;
      }
      return;
    }

    this.playerCameraRig.pitch = this.camPitch;
    this.playerCameraRig.step(
      this.camera,
      this._chaseTargetScratch,
      false,
      dt,
      this._groundSampleFn,
    );
    const eyeDelta =
      this.currentEyeHeight - DEFAULT_PLAYER_CAMERA_CONFIG.firstPersonEyeHeight;
    this.camera.position.x += blastShakeX + rocketShakeX;
    this.camera.position.y +=
      eyeDelta + this.camStepOffsetY + headBobY + washDip + blastShakeY + rocketShakeY;
    this.camera.rotation.set(
      this.camPitch + hurtKick + chewNod + drinkNod,
      this.camYaw,
      this.wallTiltAngle,
      'YXZ',
    );
  }

  private emitHud(): void {
    const isFlat = this.worldType === 'flat';
    const biome = getBiomeAt(this.playerX, this.playerZ);
    const hdx = this.playerX - HILL_HOUSE_POS.x;
    const hdz = this.playerZ - HILL_HOUSE_POS.z;
    const inHilltopHouse =
      !isFlat && hdx >= -5.6 && hdx <= 5.6 && hdz >= -4.8 && hdz <= 8.8;
    let sheltered = isFlat || inHilltopHouse;
    let nearFire = false;
    for (let i = 0; i < this.structures.length; i++) {
      const s = this.structures[i];
      const sdx = s.x - this.playerX;
      const sdz = s.z - this.playerZ;
      const dSq = sdx * sdx + sdz * sdz;
      if (!sheltered && s.type === 'basic_shelter' && dSq < 36) {
        sheltered = true;
      } else if (!nearFire && (s.type === 'campfire' || s.type === 'cooking_station') && dSq < 64) {
        nearFire = true;
      }
      if (sheltered && nearFire) break;
    }
    const nearOceanWater = this.isNearOceanWater();
    const nearLakeWater = this.isNearLakeWater();
    const hasWashableMeat =
      this.getItemCount('raw_meat') > 0 || this.getItemCount('dino_meat') > 0;
    const hasSoap = this.getItemCount('soap') > 0;
    const hasDriedMeatToCut =
      this.getItemCount('dried_raw_meat') > 0 ||
      this.getItemCount('dried_dino_meat') > 0;
    const sunElev = Math.sin((this.timeOfDay - 0.25) * Math.PI * 2);
    const isNight = sunElev < -0.05;
    const nearbyCarcassNode = this.findNearbyCarcass();
    const nearbyCarcass = nearbyCarcassNode
      ? {
          id: nearbyCarcassNode.id,
          displayName: nearbyCarcassNode.displayName,
          summary:
            nearbyCarcassNode.drops
              .filter((d) => d.quantity > 0)
              .map((d) => `${d.quantity}× ${ITEMS[d.itemId].name}`)
              .join(' · ') || 'Meat & Hide',
          hasKnife: this.getItemCount('hunting_knife') > 0,
          distance: Math.hypot(
            nearbyCarcassNode.x - this.playerX,
            nearbyCarcassNode.z - this.playerZ,
          ),
        }
      : null;

    let maxStructStress = 0;
    let bucklingCount = 0;
    for (const b of this.structuralBlocks) {
      if (b.stress > maxStructStress) maxStructStress = b.stress;
      if (b.bucklingTimer > 0) bucklingCount += 1;
    }
    const eqId = this.getEquippedItemId();
    const eqDef = eqId ? ITEMS[eqId] : null;
    const structuralSummary = {
      blockCount: this.structuralBlocks.length,
      maxStressPercent: Math.round(maxStructStress * 100),
      bucklingCount,
      previewStressPercent:
        eqDef?.structuralKind && this.previewTarget
          ? Math.round(this.previewTarget.stress * 100)
          : null,
      previewSupported: Boolean(this.previewTarget?.anchored),
      previewLabel:
        eqDef?.structuralKind && this.previewTarget
          ? STRUCTURAL_SPECS[eqDef.structuralKind].name
          : null,
    };
    const terrainSummary = {
      cratersCarved: this.terrainEngine ? this.terrainEngine.cratersCarved : 0,
      activeWaterStreams: this.terrainEngine ? this.terrainEngine.getActiveStreamCount() : 0,
      erodedVolume: this.terrainEngine ? Math.round(this.terrainEngine.totalErodedVolume) : 0,
      puddleCount: this.terrainEngine ? this.terrainEngine.activePuddleCount : 0,
    };
    const caveDx = this.playerX - CAVE_POS.x;
    const caveDz = this.playerZ - CAVE_POS.z;
    const momentumState: MomentumHudState = {
      wallRunning: this.wallRunTimer > 0,
      wallSide: this.wallRunSide,
      vaulting: this.vaultTimer > 0,
      speedMps: Number(this.currentSpeedMps.toFixed(1)),
      kickCooldown: Number(this.kickCooldown.toFixed(1)),
      nearCaveBoss: caveDx * caveDx + caveDz * caveDz < 484,
    };

    const readyProducts = this.kineticNodes.reduce(
      (sum, kn) => sum + (kn.storedOutputCount || 0),
      0,
    );
    const kineticSummary: KineticHudSummary = {
      nodeCount: this.kineticNodes.length,
      beltSpanCount: this.beltLinks.length,
      totalRpmOutput: this.kineticTotalRpm,
      maxSteamPsi: this.kineticMaxPsi,
      activeAssemblers: this.kineticActiveAssemblers,
      readyProducts,
      targetNode: this.targetKineticNode
        ? {
            id: this.targetKineticNode.id,
            name: KINETIC_SPECS[this.targetKineticNode.kind].name,
            kind: this.targetKineticNode.kind,
            rpm: this.targetKineticNode.rpm,
            torque: this.targetKineticNode.torque,
            steamPsi: Math.round(this.targetKineticNode.steamPsi),
            waterFlow: this.targetKineticNode.waterFlow,
            active: this.targetKineticNode.active,
            readyProducts: this.targetKineticNode.storedOutputCount || 0,
            cycleProgress: this.targetKineticNode.cycleProgress,
          }
        : null,
    };

    let activeVehicle: ActiveVehicleHudState | null = null;
    if (this.activeVehicleId) {
      const av = this.vehicles.find((v) => v.id === this.activeVehicleId);
      if (av) {
        const specs = this.getVehicleSpecs(av);
        const surfY = Math.max(
          getTerrainHeight(av.x, av.z),
          this.getStructuralSurfaceY(av.x, av.z, av.y + 0.6),
        );
        const waterY = getWaterLevelAt(av.x, av.z);
        const inWater = surfY < waterY - 0.25 && av.y <= waterY + 0.45;
        const airborne = specs.canFly && av.y > Math.max(surfY, waterY) + 0.65;
        const spd = Math.hypot(av.vx, av.vz);
        activeVehicle = {
          id: av.id,
          name: av.name,
          preset: av.preset,
          craftClass: specs.craftClass,
          speedKmh: Math.round(spd * 3.6),
          altitudeM: Math.max(0, Math.round((av.y - Math.max(surfY, waterY)) * 10) / 10),
          steamPsi: Math.round((av.fuel / 100) * (65 + specs.engineCount * 22)),
          fuel: Math.round(av.fuel),
          hp: Math.round(av.hp),
          maxHp: av.maxHp,
          inWater,
          airborne,
          canFloat: specs.canFloat,
          canFly: specs.canFly,
          hasHydraulics: this.vehicleHasHydraulics(av),
          hydraulicStyle: this.isAirbagVehicle(av)
            ? 'airbag_coilover'
            : this.isDonkHydraulicVehicle(av)
              ? 'up_down_side'
              : 'full_bounce',
          hydraulicMode: this.hydraulicMode,
          hasAirbagSuspension: this.isAirbagVehicle(av),
          airbagSpeed: av.airbagSpeed ?? 1.0,
          airbagLockLevel: av.airbagLockLevel ?? 1.0,
          doorsOpen: Boolean(av.doorsOpen),
          trunkOpen: Boolean(av.trunkOpen),
          hasConvertibleTop: Boolean(
            av.hasConvertibleTop || av.preset === 'cadillac_coupe_deville',
          ),
          convertibleTopDown: Boolean(av.convertibleTopDown),
          convertibleTopProgress: this.convertibleTopProgressMap.get(av.id) ?? (av.convertibleTopDown ? 1 : 0),
          interiorView: this.vehicleInteriorCamera,
          hasTrunkBass: this.isOldSchoolVehicle(av),
          trunkBassOn: Boolean(av.trunkBassEnabled),
          isOldSchool: this.isOldSchoolVehicle(av),
          radioMode: this.isOldSchoolVehicle(av)
            ? 'OLD_SCHOOL_TRUNK_AND_CHEST_BASS'
            : 'STANDARD_RADIO',
          trunkPumpLevel: this.trunkBassPulse,
          chestThumpLevel: this.chestThumpPulse,
          hasRimLights:
            av.preset === 'chevy_tahoe' ||
            av.preset === 'chevy_2000_sub' ||
            av.rimLightMode !== undefined,
          rimLightMode: av.rimLightMode ?? 'off',
          rimLightColor: av.rimLightColor || av.underglowColor || '#38bdf8',
          hasUnderglow: Boolean(
            av.underglowColor ||
              av.preset === 'slab' ||
              av.preset === 'chevy_tahoe' ||
              av.preset === 'chevy_2000_sub',
          ),
          underglowEnabled: av.underglowEnabled !== false,
          underglowColor: av.underglowColor || '#38bdf8',
          slammedStance:
            (av.suspensionOffset ?? 0) <= -0.22 &&
            this.hydraulicMode !== 'lock_up' &&
            this.hydraulicMode !== 'front_lock' &&
            this.hydraulicMode !== 'rear_lock',
          liftHeightInches: (() => {
            const baseRide =
              av.preset === 'chevy_tahoe' || av.preset === 'chevy_2000_sub'
                ? Math.max(0.075, 0.38 + (av.suspensionOffset ?? -0.3))
                : Math.max(0.26, 0.38 + (av.suspensionOffset ?? 0));
            const avgHeave =
              (this.hydCorners.fl +
                this.hydCorners.fr +
                this.hydCorners.rl +
                this.hydCorners.rr) *
              0.25;
            return Math.max(3, Math.round((baseRide + avgHeave) * 39.37));
          })(),
          highClearance:
            av.preset === 'donk' ||
            ((av.suspensionOffset ?? 0) >= 0.32 && (av.wheelScale ?? 1) >= 1.3),
          hydraulicsDanceEnabled: Boolean(av.hydraulicsDanceEnabled),
          hasSubwooferWall:
            av.preset === 'chevy_tahoe' || av.preset === 'chevy_2000_sub',
          cargoUsed: av.cargoItems.reduce((s, c) => s + c.quantity, 0),
          cargoCapacity: specs.cargoCapacity,
        };
      }
    }

    const coasters = this.coasterRuntime ? this.coasterRuntime.getHudSummaries() : [];
    const activeRideData =
      this.ridingCoasterId && this.coasterRuntime
        ? this.coasterRuntime.getRideCameraTransform(this.ridingCoasterId)
        : null;

    if (this.cachedVisitedBiomes.length !== this.visitedBiomes.size) {
      this.cachedVisitedBiomes = Array.from(this.visitedBiomes);
    }
    if (this.cachedCompletedMissionIds.length !== this.completedMissionIds.size) {
      this.cachedCompletedMissionIds = Array.from(this.completedMissionIds);
    }
    if (this.cachedVisitedDimensions.length !== this.visitedDimensions.size) {
      this.cachedVisitedDimensions = Array.from(this.visitedDimensions);
    }

    let invSame = this.cachedHudInventory.length === this.inventory.length;
    if (invSame) {
      for (let i = 0; i < this.inventory.length; i++) {
        if (
          this.cachedHudInventory[i].itemId !== this.inventory[i].itemId ||
          this.cachedHudInventory[i].quantity !== this.inventory[i].quantity
        ) {
          invSame = false;
          break;
        }
      }
    }
    if (!invSame) {
      this.cachedHudInventory = this.inventory.map((s) => ({ ...s }));
    }

    let bpSame = this.cachedHudBackpack.length === this.backpackCompartments.length;
    if (bpSame) {
      for (let i = 0; i < this.backpackCompartments.length; i++) {
        const a = this.cachedHudBackpack[i];
        const b = this.backpackCompartments[i];
        if (a.compartmentId !== b.compartmentId || a.itemId !== b.itemId || a.quantity !== b.quantity) {
          bpSame = false;
          break;
        }
      }
    }
    if (!bpSame) {
      this.cachedHudBackpack = this.backpackCompartments.map((c) => ({ ...c }));
    }

    let structSame = this.cachedHudStructures.length === this.structures.length;
    if (structSame) {
      for (let i = 0; i < this.structures.length; i++) {
        const a = this.cachedHudStructures[i];
        const b = this.structures[i];
        if (
          a.id !== b.id ||
          a.x !== b.x ||
          a.z !== b.z ||
          (a.chestItems?.length ?? 0) !== (b.chestItems?.length ?? 0)
        ) {
          structSame = false;
          break;
        }
      }
    }
    if (!structSame) {
      this.cachedHudStructures = this.structures.map((s) => ({
        ...s,
        chestItems: s.chestItems ? s.chestItems.map((c) => ({ ...c })) : undefined,
      }));
    }

    let cropsSame = this.cachedHudCrops.length === this.plantedCrops.length;
    if (cropsSame) {
      for (let i = 0; i < this.plantedCrops.length; i++) {
        const a = this.cachedHudCrops[i];
        const b = this.plantedCrops[i];
        if (a.id !== b.id || a.mature !== b.mature || a.watered !== b.watered) {
          cropsSame = false;
          break;
        }
      }
    }
    if (!cropsSame) {
      this.cachedHudCrops = this.plantedCrops.map((c) => ({ ...c }));
    }

    let fridgeSame = this.cachedHudFridge.length === this.fridgeItems.length;
    if (fridgeSame) {
      for (let i = 0; i < this.fridgeItems.length; i++) {
        if (
          this.cachedHudFridge[i].itemId !== this.fridgeItems[i].itemId ||
          this.cachedHudFridge[i].quantity !== this.fridgeItems[i].quantity
        ) {
          fridgeSame = false;
          break;
        }
      }
    }
    if (!fridgeSame) {
      this.cachedHudFridge = this.fridgeItems.map((s) => ({ ...s }));
    }

    let vehSame = this.cachedHudVehicles.length === this.vehicles.length;
    if (vehSame) {
      for (let i = 0; i < this.vehicles.length; i++) {
        const a = this.cachedHudVehicles[i];
        const b = this.vehicles[i];
        if (
          a.id !== b.id ||
          Math.abs(a.x - b.x) > 0.25 ||
          Math.abs(a.z - b.z) > 0.25 ||
          a.hp !== b.hp ||
          Math.round(a.fuel) !== Math.round(b.fuel) ||
          a.cargoItems.length !== b.cargoItems.length ||
          a.modules.length !== b.modules.length
        ) {
          vehSame = false;
          break;
        }
      }
    }
    if (!vehSame) {
      this.cachedHudVehicles = this.vehicles.map((v) => ({
        ...v,
        modules: v.modules.map((m) => ({ ...m })),
        cargoItems: v.cargoItems.map((c) => ({ ...c })),
      }));
    }

    let parkedCount = 0;
    let damagedCount = 0;
    let needsFuelCount = 0;
    const garageRadiusSq = 18.5 * 18.5;
    for (let i = 0; i < this.vehicles.length; i++) {
      const v = this.vehicles[i];
      const gdx = v.x - VEHICLE_GARAGE_POS.x;
      const gdz = v.z - VEHICLE_GARAGE_POS.z;
      if (gdx * gdx + gdz * gdz <= garageRadiusSq) {
        parkedCount++;
        if (v.hp < v.maxHp) damagedCount++;
        if (v.fuel < 98) needsFuelCount++;
      }
    }

    let bossesDefeatedCount = 0;
    if (!isFlat) {
      const clist = this.creatures.creatures;
      for (let i = 0; i < clist.length; i++) {
        if (clist[i].isBoss && !clist[i].alive) bossesDefeatedCount++;
      }
    }

    this.callbacks.onHudUpdate({
      vitals: { ...this.vitals },
      dayCount: this.dayCount,
      timeOfDay: this.timeOfDay,
      weather: isFlat ? 'clear' : this.weather,
      biome,
      biomeName: isFlat ? 'Park Grounds' : BIOME_INFO[biome].name,
      playerX: this.playerX,
      playerY: this.playerY,
      playerZ: this.playerZ,
      playerYaw: this.playerYaw,
      cameraViewMode: this.playerCameraRig.mode,
      isSwimming: this.isSwimming,
      isSprinting: this.isSprinting,
      isCrouching: this.isCrouching,
      isFlying: this.flightAndTeleport.flying,
      isSheltered: sheltered,
      nearFire,
      nearOceanWater,
      nearLakeWater,
      hasWashableMeat,
      hasSoap,
      hasDriedMeatToCut,
      visibilityPercent: Math.round(this.playerVisibility * 100),
      isNight,
      nocturnalActiveCount: this.nocturnalActiveCount,
      nearbyInteraction: this.nearbyInteraction,
      nearbyCarcass,
      inventory: this.cachedHudInventory,
      hotbarItemIds: [...this.hotbarItemIds],
      equippedSlot: this.equippedSlot,
      hudBarCapacity: this.hotbarItemIds.length,
      maxHudBarCapacity: MAX_HUD_BAR_SLOTS,
      backpackCompartments: this.cachedHudBackpack,
      totalBackpackCompartments: TOTAL_BACKPACK_COMPARTMENTS,
      emptyCompartmentsCount:
        TOTAL_BACKPACK_COMPARTMENTS - this.backpackCompartments.length,
      structures: this.cachedHudStructures,
      visitedBiomes: this.cachedVisitedBiomes,
      exploredCells: this.getExploredCellsArray(),
      stats: { ...this.stats },
      completedMissionIds: this.cachedCompletedMissionIds,
      trackedSightings: this.trackedSightings,
      cinematicActive: this.cinematicActive,
      cinematicSubtitle: this.cinematicSubtitle,
      cinematicCrewShout: this.cinematicCrewShout,
      playerGender: this.playerGender,
      navigatorCompanion: this.navigatorCompanion?.getHudState(
        this.playerX,
        this.playerZ,
        HILL_HOUSE_POS,
      ),
      gameOver: this.gameOver,
      gameOverReason: this.gameOverReason,
      currentDimension: this.currentDimension,
      selectedPortalDimension: this.selectedPortalDimension,
      visitedDimensions: this.cachedVisitedDimensions,
      unlockedGildedPaint: this.unlockedGildedPaint,
      crystalArmorHp: this.crystalArmorHp,
      activePortals: this.activePortals.map((p) => ({ ...p })),
      coins: this.coins,
      seatedLabel: this.seatedState?.label ?? null,
      plantedCrops: this.cachedHudCrops,
      fridgeItems: this.cachedHudFridge,
      structuralSummary,
      terrainSummary,
      targetHitbox: this.targetHitbox ? { ...this.targetHitbox } : null,
      momentumState,
      kineticSummary,
      vehicles: this.cachedHudVehicles,
      activeVehicle,
      selectedCargoVehicleId: this.selectedCargoVehicleId,
      worldType: this.worldType,
      worldName: this.worldName,
      flatSurfaceStyle: this.flatSurfaceStyle,
      gameMode: resolveAllowedGameMode(this.worldType, this.gameMode),
      coasters,
      activeCoasterRide:
        this.ridingCoasterId && activeRideData
          ? {
              coasterId: this.ridingCoasterId,
              coasterName: activeRideData.coasterName,
              speedKmh: activeRideData.speedKmh,
              heightM: activeRideData.heightM,
              progressPercent: activeRideData.progressPercent,
              firstPerson: true,
              verticalG: activeRideData.verticalG,
              lateralG: activeRideData.lateralG,
              segmentLabel: activeRideData.segmentLabel,
            }
          : null,
      bloodMoonActive: this.isBloodMoonNight(),
      daysUntilBloodMoon: isFlat ? 0 : 7 - ((this.dayCount - 1) % 7),
      bossesDefeatedCount,
      objectiveText: this.computeObjectiveText(),
      hitMarkerActive: this.hitMarkerActive,
      fps: this.currentFps,
      totemFlashTimer: this.totemFlashTimer > 0 ? Number(this.totemFlashTimer.toFixed(2)) : 0,
      totemRegenSeconds: this.totemRegenTimer > 0 ? Number(this.totemRegenTimer.toFixed(1)) : 0,
      tvState: (() => {
        const meta = this.smartTv.getCurrentChannelMeta();
        const isYt = this.smartTv.isUsingYouTube;
        const isLocal = this.smartTv.isUsingLocalVideo;
        const localName = this.smartTv.localVideoName;
        return {
          power: this.smartTv.power,
          channel: this.smartTv.currentChannel,
          channelName: isYt
            ? this.smartTv.youtubeChannel || 'YouTube'
            : isLocal
              ? localName || 'Custom Video'
              : meta.name,
          title: isYt
            ? this.smartTv.youtubeTitle || 'YouTube'
            : isLocal
              ? localName || 'Custom Video'
              : meta.name,
          category: isYt
            ? 'YOUTUBE'
            : isLocal
              ? 'USB VIDEO'
              : meta.badge,
          embedSrc: isYt && this.smartTv.youtubeVideoId
            ? `https://www.youtube.com/embed/${this.smartTv.youtubeVideoId}?autoplay=1&rel=0&playsinline=1&enablejsapi=1`
            : '',
          volume: this.smartTv.volume,
          isMuted: this.smartTv.isMuted,
          isZoomedToTv: this.tvIsZoomed,
          autoCycle: this.smartTv.autoCycleChannels,
          isPaused: this.smartTv.isPaused,
          isStopped: this.smartTv.isStopped,
          currentTime: Math.floor(this.smartTv.currentTimestamp),
          isLocalVideo: isLocal,
          localVideoName: localName,
          isYouTubeActive: isYt,
          youtubeVideoId: this.smartTv.youtubeVideoId,
          youtubeTitle: this.smartTv.youtubeTitle,
          youtubeChannel: this.smartTv.youtubeChannel,
          spatialVolume:
            Math.round(this.smartTv.volume * this.smartTv.getSpatialMultiplier() * 100),
          bassMode: this.smartTv.getBassMode(),
          bassEnergy: Number(this.smartTv.getTrunkBassEnergy().toFixed(3)),
        };
      })(),
      equippedWeaponState: (() => {
        if (!eqDef || !isFirearmItem(eqDef.id)) return null;
        const spec = FIREARM_SPECS[eqDef.id];
        if (!spec) return null;
        return {
          itemId: eqDef.id,
          magCurrent: this.weaponMagazines.get(eqDef.id) ?? spec.magSize,
          magMax: spec.magSize,
          reserveAmmo: this.getItemCount('ammo'),
          isReloading: this.reloadingItemId === eqDef.id,
          reloadProgress:
            this.reloadingItemId === eqDef.id && this.reloadDuration > 0
              ? Math.max(0, Math.min(1, 1 - this.reloadTimer / this.reloadDuration))
              : 0,
          reloadMode: spec.reloadMode,
          caliberLabel: spec.caliberLabel,
        };
      })(),
      cozyComfort: {
        active: this.cozyComfortActive,
        level: this.cozyComfortActive
          ? this.smartTv.power || this.seatedState?.label === 'Relaxing on Sofa'
            ? 2
            : 1
          : 0,
        label: this.cozyComfortLabel,
        warmProtected: this.cozyComfortActive,
        tvActive:
          this.cozyComfortActive &&
          (this.smartTv.power || this.seatedState?.label === 'Relaxing on Sofa'),
        restedBonus: this.cozyComfortActive,
      },
      garageSummary: {
        parkedCount,
        damagedCount,
        needsFuelCount,
      },
      multiplayerState: this.p2p
        ? { ...this.p2p.getStatusSnapshot(), chatLog: [...this.p2pChatLog] }
        : undefined,
      modState: this.modSystem?.getSnapshot(),
      spaceState: this.buildSpaceHudSnapshot(),
    });
  }

  private handleFixedStep(fixedDt: number): void {
    if (this.disposed || document.hidden || this.rafPausedByVisibility) return;

    this.masterRuntime.isInVehicle = Boolean(this.activeVehicleId);
    this.masterRuntime.activeVehicleId = this.activeVehicleId;
    if (this.activeVehicleId) {
      let activeName: string | null = null;
      for (let i = 0; i < this.vehicles.length; i++) {
        if (this.vehicles[i].id === this.activeVehicleId) {
          activeName = this.vehicles[i].name ?? null;
          break;
        }
      }
      this.masterRuntime.activeVehicleName = activeName;
    } else {
      this.masterRuntime.activeVehicleName = null;
    }

    this.pendingCameraDt = Math.min(0.05, this.pendingCameraDt + fixedDt);
    this.updateSimulation(fixedDt);
  }

  private handleRender(_alpha: number, _elapsedSeconds: number): void {
    void _alpha;
    void _elapsedSeconds;
    if (this.disposed || document.hidden || this.rafPausedByVisibility) return;

    const nowPerf = performance.now();
    stepMasterFrame(this.masterRuntime, nowPerf);
    const { dt: clampedDt, frameMs: rawFrameMs } = stepClampedFrame(
      this.frameWatch,
      nowPerf,
    );
    const frameTime = Math.min(clampedDt, 0.05);
    this.lastFramePerfMs = nowPerf;

    // Measure real device FPS and cap display cleanly at 60 FPS
    const displaySampleMs = Math.min(100, Math.max(1, rawFrameMs));
    this.fpsDisplayAccumMs += displaySampleMs;
    this.fpsDisplayFrames += 1;
    this.fpsDisplayTimer += frameTime;
    if (this.fpsDisplayTimer >= 0.25) {
      const measuredFps = Math.round(
        (this.fpsDisplayFrames * 1000) / Math.max(1, this.fpsDisplayAccumMs),
      );
      this.currentFps = Math.min(60, Math.max(1, measuredFps));
      this.fpsDisplayTimer = 0;
      this.fpsDisplayFrames = 0;
      this.fpsDisplayAccumMs = 0;
    }

    // Stable Graphics Policy: Auto-FPS Guard no longer flips shadows, DPR, or draw distance mid-gameplay
    // (which previously caused shader recompilation & framebuffer reallocation freezes on iPhone/mobile).
    this.autoFpsTier = 0;

    this.lastSimDt = Math.min(
      0.05,
      Math.max(Permanent60FpsController.FIXED_DT, this.pendingCameraDt),
    );
    this.pendingCameraDt = 0;

    // Flush queued sector/landmark wake-ups and ambient extras only within the frame budget
    if (performance.now() - nowPerf < FREEZE_SHIELD.maxFrameMs) {
      this.worldQueue.flush();
      if (this.mode === 'playing' && !this.cinematicActive) {
        this.updateVinesAndExtras(
          Math.min(this.lastSimDt, FREEZE_SHIELD.maxDt),
          FREEZE_SHIELD.maxActiveVines,
        );
      }
    }

    this.renderScene();
  }

  private updateSimulation(dt: number): void {
    const simStart = performance.now();
    this.lastSimDt = dt;
    this.elapsed += dt;
    if (this.mode === 'menu') {
      this.menuOrbitAngle += dt * 0.14;
    }

    if (this.portalWarpCooldown > 0) {
      this.portalWarpCooldown = Math.max(0, this.portalWarpCooldown - dt);
    }

    // 1. Always move the player smoothly first before world & biome updates
    const playerActive =
      this.mode === 'playing' &&
      canProcessGameplayInput(this.masterRuntime) &&
      !this.gameOver &&
      !this.cinematicActive;
    if (playerActive) {
      this.updatePlayer(dt);
    }

    // 2. Run core simulation & world updates
    if (this.mode === 'playing' && !this.cinematicActive) {
      this.modSystem?.tick(dt);
    }
    if (this.mode === 'playing' || this.remotePlayers.size > 0 || this.p2p?.connected) {
      this.updateMultiplayer(dt);
    }
    this.updateWeatherAndAtmosphere(dt);
    if (this.mode === 'playing' && !this.cinematicActive) {
      this.ecosystemTickAccum += dt;
      if (this.ecosystemTickAccum >= 1.2) {
        const ecoDt = this.ecosystemTickAccum;
        this.ecosystemTickAccum = 0;
        this.ecosystem = simulateEcosystemTick(
          this.ecosystem,
          ecoDt,
          this.weather,
          { x: this.playerX, y: this.playerY, z: this.playerZ },
        );
      }
    }
    if (
      this.realisticOcean &&
      this.currentDimension === 'overworld' &&
      this.worldType === 'island'
    ) {
      this.realisticOcean.update(dt);
    }

    const sunElev = Math.sin((this.timeOfDay - 0.25) * Math.PI * 2);
    const isNight = sunElev < -0.05;

    if (this.mode === 'playing' && !this.gameOver) {
      if (this.cinematicActive) {
        this.updateCinematic(dt);
        if (
          this.cinematicSubtitle !== this.lastCinematicHudSubtitle ||
          this.cinematicCrewShout !== this.lastCinematicHudCrewShout
        ) {
          this.lastCinematicHudSubtitle = this.cinematicSubtitle;
          this.lastCinematicHudCrewShout = this.cinematicCrewShout;
          this.emitHud();
        }
      } else {
        this.updateProjectilesAndResources(dt);
        const inOverworld = this.currentDimension === 'overworld';
        {
          if (inOverworld) {
            this.updateStructuralAndTerrainSystems(dt);
            this.updateKineticNetwork(dt);
            this.coasterRuntime?.update(dt, this.playerX, this.playerZ);
          }
          this.updateVehicles(dt);
          this.updateBuildPreview();

          // Update active dimension animations & portal vortices
          if (this.activeDimensionWorld) {
            for (const spinObj of this.activeDimensionWorld.animatedSpins) {
              spinObj.rotation.y += dt * 0.9;
            }
            if (this.activeDimensionWorld.animatedPoints) {
              this.activeDimensionWorld.animatedPoints.rotation.y += dt * 0.04;
            }
          }
          if (
            SATURN_V_LAUNCH_CONTROLLER.phase === 'IGNITION' ||
            SATURN_V_LAUNCH_CONTROLLER.phase === 'ASCENT'
          ) {
            this.updateSaturnVLaunch(dt);
          }
          if (this.elevatorLiftActive) {
            this.updateUndergroundElevatorLift(dt);
          }
          if (this.inSpacePlanet && this.spaceArena) {
            if (
              this.spaceArena.rocketFlame &&
              SATURN_V_LAUNCH_CONTROLLER.phase === 'PAD'
            ) {
              const s = 0.85 + Math.sin(this.elapsed * 22) * 0.18;
              this.spaceArena.rocketFlame.scale.set(1, s, 1);
            }
            if (this.spaceArena.ufoGroup) {
              const ufoState = ALIEN_SPACE_SYSTEM.activeUfo;
              if (ufoState && !ufoState.isDowned) {
                const orbitA = this.elapsed * 0.55;
                this.spaceArena.ufoGroup.position.set(
                  Math.cos(orbitA) * 22,
                  11.5 + Math.sin(this.elapsed * 1.9) * 1.4,
                  -18 + Math.sin(orbitA) * 16,
                );
                this.spaceArena.ufoGroup.rotation.y += dt * 1.8;
              } else {
                this.spaceArena.ufoGroup.position.y = THREE.MathUtils.damp(
                  this.spaceArena.ufoGroup.position.y,
                  0.8,
                  3.5,
                  dt,
                );
                this.spaceArena.ufoGroup.rotation.z = THREE.MathUtils.damp(
                  this.spaceArena.ufoGroup.rotation.z,
                  0.35,
                  3.5,
                  dt,
                );
              }
            }
          }
          this.updateActivePortals(dt);

          // Throttled zero-GC distance culling for biome landmarks (queued via 3.5ms FrameBudgetQueue), structures, and blocks
          this.worldCullTimer += dt;
          if (this.worldCullTimer >= 0.18) {
            this.worldCullTimer = 0;
            const maxDist = this.effectiveMaxDrawDistance;
            const maxDistSq = maxDist * maxDist;
            if (inOverworld && this.worldType === 'island') {
              this.world?.cullWorldByDistance(
                this.playerX,
                this.playerZ,
                maxDist,
                this.worldQueue,
                this.maxActivePointLights,
              );
            }
            for (let i = 0; i < this.structures.length; i++) {
              const st = this.structures[i];
              const vis = this.structureVisuals.get(st.id);
              if (vis) {
                const dx = st.x - this.playerX;
                const dz = st.z - this.playerZ;
                vis.group.visible = inOverworld && dx * dx + dz * dz <= maxDistSq;
              }
            }
            for (let i = 0; i < this.structuralBlocks.length; i++) {
              const blk = this.structuralBlocks[i];
              const mesh = this.structuralMeshes.get(blk.id);
              if (mesh) {
                const dx = blk.x - this.playerX;
                const dz = blk.z - this.playerZ;
                mesh.visible = inOverworld && dx * dx + dz * dz <= maxDistSq;
              }
            }
            this.updateStructureLightPool(this.playerX, this.playerZ, maxDistSq, inOverworld);
          }

          // Lightweight Grand Finale Pack proximity check (Resort Corner Tiki Lounge + Zone Boss/Loot)
          if (inOverworld && this.worldType === 'island') {
            if (this.grandFinaleTikiCooldown > 0) {
              this.grandFinaleTikiCooldown = Math.max(0, this.grandFinaleTikiCooldown - dt);
            }
            this.grandFinaleZoneCheckTimer += dt;
            if (this.grandFinaleZoneCheckTimer >= 0.45) {
              this.grandFinaleZoneCheckTimer = 0;
              const resort = GRAND_FINALE_PACK.zones['resort corner'];
              const rdx = this.playerX - resort.x;
              const rdz = this.playerZ - resort.z;
              if (rdx * rdx + rdz * rdz < 121 && this.grandFinaleTikiCooldown <= 0) {
                const keys: TikiDrinkKey[] = ['coconut_surge', 'mango_shield', 'sunset_fizz'];
                const drinkKey = keys[this.grandFinaleDrinkIdx % keys.length];
                this.grandFinaleDrinkIdx += 1;
                this.grandFinaleTikiCooldown = 14;
                this.grandFinalePlayer.hp = this.vitals.health;
                this.grandFinalePlayer.maxHp = this.vitals.maxHealth;
                GRAND_FINALE_PACK.serveTikiDrink(
                  this.grandFinalePlayer,
                  drinkKey,
                  (label, duration) => {
                    if (drinkKey === 'sunset_fizz') {
                      this.vitals.health = this.vitals.maxHealth;
                    }
                    this.toast(`Tiki Lounge served ${label} (${duration}s buff)!`, 'discovery');
                  },
                );
              }

              // Check nearby Grand Finale zone guardians & Fallen King Ghost loot drops
              for (let i = 0; i < this.grandFinaleGhosts.length; i++) {
                const g = this.grandFinaleGhosts[i];
                if (!g.active) continue;
                const gdx = this.playerX - g.x;
                const gdz = this.playerZ - g.z;
                if (gdx * gdx + gdz * gdz < 196) {
                  g.hp -= 25;
                }
              }
              GRAND_FINALE_PACK.checkZoneInteractions(
                this.grandFinalePlayer,
                this.grandFinaleGhosts,
                (item: string, zoneKey: GrandFinaleZoneKey) => {
                  this.coins += 250;
                  this.toast(`Grand Finale Drop [${zoneKey}]: ${item} (+250 coins)!`, 'discovery');
                },
              );
            }
          }
        }

        let nocturnalActiveCount = 0;
        if (inOverworld && this.worldType === 'island') {
          const scavengerTargets = this._scavengerTargetsScratch;
          scavengerTargets.length = 0;
          for (let i = 0; i < this.carcasses.length; i++) {
            const c = this.carcasses[i];
            if (
              c.fallProgress >= 0.85 &&
              canAnimalEatCarcass({
                id: c.id,
                x: c.x,
                z: c.z,
                owner: c.owner,
                collected: c.harvested,
              })
            ) {
              let remDrops = 0;
              for (let d = 0; d < c.drops.length; d++) {
                remDrops += Math.max(0, c.drops[d].quantity);
              }
              scavengerTargets.push({
                id: c.id,
                x: c.x,
                y: c.y,
                z: c.z,
                isDino: c.isDino,
                remainingDrops: remDrops,
                owner: c.owner,
                collected: c.harvested,
              });
            }
          }
          const creatureCycle = this.creatures.update(
            dt,
            this.elapsed,
            this.playerX,
            this.playerZ,
            this.isSprinting,
            this.isCrouching,
            isNight,
            this.playerVisibility,
            this._onCreatureDamage,
            this._onCreatureCall,
            this._onCreatureSightings,
            scavengerTargets,
            this._onCarcassScavenged,
          );
          nocturnalActiveCount = creatureCycle.nocturnalActiveCount;

          this.structureManager.update(
            { x: this.playerX, y: this.playerY, z: this.playerZ },
            dt,
            this._structureCallbacks,
          );
        }
        this.nocturnalActiveCount = nocturnalActiveCount;

        this.hudSyncTimer += dt;
        const hudInterval = this.isTouchDevice ? 0.35 : 0.25;
        if (this.hudSyncTimer >= hudInterval) {
          this.hudSyncTimer = 0;
          this.emitHud();
        }
      }
    } else if (this.mode === 'menu') {
      if (this.previewGroup) {
        this.previewGroup.visible = false;
      }
      if (this.kineticPreviewGroup) {
        this.kineticPreviewGroup.visible = false;
      }
      this.nocturnalActiveCount = 0;
    }

    // Subtle idle life for Farmer NPC inside the Hilltop House (only during active gameplay)
    if (
      this.mode === 'playing' &&
      !this.cinematicActive &&
      this.worldType === 'island' &&
      this.world.farmerNpcGroup &&
      this.currentDimension === 'overworld'
    ) {
      const dfx = this.world.farmerNpcPos.x - this.playerX;
      const dfz = this.world.farmerNpcPos.z - this.playerZ;
      if (dfx * dfx + dfz * dfz < 64) {
        const lookYaw = Math.atan2(
          this.playerX - this.world.farmerNpcPos.x,
          this.playerZ - this.world.farmerNpcPos.z,
        );
        this.world.farmerNpcGroup.rotation.y = lookYaw;
        this.world.farmerArmR.rotation.z = -0.35 + Math.sin(this.elapsed * 5.2) * 0.28;
        this.world.farmerHead.rotation.y = Math.sin(this.elapsed * 1.4) * 0.08;
      } else {
        this.world.farmerArmR.rotation.z = Math.sin(this.elapsed * 1.6) * 0.05;
        this.world.farmerHead.rotation.y = Math.sin(this.elapsed * 0.8) * 0.22;
      }
    }

    // Autonomous Ship Navigator Companion AI on Survival Island
    if (this.navigatorCompanion) {
      const showNavOnIsland =
        !this.cinematicActive &&
        this.worldType === 'island' &&
        this.currentDimension === 'overworld';
      this.navigatorCompanion.group.visible =
        showNavOnIsland && !this.navigatorCompanion.isGone();
      this.navigatorCompanion.droppedGunGroup.visible =
        showNavOnIsland && this.navigatorCompanion.getDroppedGunPos() !== null;
      if (showNavOnIsland && this.mode === 'playing' && !this.gameOver) {
        this.navigatorCompanion.update({
          dt,
          elapsed: this.elapsed,
          playerX: this.playerX,
          playerY: this.playerY,
          playerZ: this.playerZ,
          activePlayerVehicleId: this.activeVehicleId,
          playerIsFlying: this.flightAndTeleport.flying || this.dragonFlight.flying,
          shelterPos: HILL_HOUSE_POS,
          shipwreckPos: SHIPWRECK_POS,
          getTerrainHeight,
          oceanLevel: OCEAN_LEVEL,
          resourceNodes: this.world.resourceNodes,
          creatures: this.creatures.creatures,
          vehicles: this.vehicles,
          vehicleMeshes: this.vehicleMeshes,
          onChopHit: () => {
            this.sound.playGather('wood', 0.45);
          },
          onTreeFelled: (node) => {
            this.sound.playTreeFall();
            this.activeFellingNodeIds.add(node.id);
            this.syncResourceVisual(node);
          },
          onShootCreature: (creature, dmg, fromX, fromZ) => {
            this.sound.playGunshot('rifle');
            this.spawnParticles(creature.x, creature.y + 1.0, creature.z, 0xfef08a, 7);
            const res = this.creatures.damageCreature(creature, dmg, fromX, fromZ);
            return Boolean(res?.killed);
          },
          onToast: (msg, tone) => this.toast(msg, tone),
          onSpawnParticles: (x, y, z, color, count) =>
            this.spawnParticles(x, y, z, color, count),
          onPlaySplash: () => this.sound.playOceanSplash(),
        });
      }
    }

    // Emergency Freeze-Shield: skip non-essential Smart TV & ambient animations if frame is already over budget or in menu/cinematic
    if (
      this.mode !== 'playing' ||
      this.cinematicActive ||
      performance.now() - simStart >= FREEZE_SHIELD.maxFrameMs
    ) {
      if (this.smartTv.tvGlowLight && this.mode !== 'playing') {
        this.smartTv.tvGlowLight.intensity = 0;
      }
      return;
    }

    // Throttle Smart TV CanvasTexture & audio updates to 10Hz and skip when far from any TV
    this.smartTvUpdateTimer += dt;
    const hdx = this.playerX - HILL_HOUSE_POS.x;
    const hdz = this.playerZ - HILL_HOUSE_POS.z;
    const nearHillTv = hdx * hdx + hdz * hdz < 2304; // 48m
    if (this.smartTv.tvGlowLight && (!this.smartTv.power || (!nearHillTv && !this.tvModalOpen))) {
      this.smartTv.tvGlowLight.intensity = 0;
    }
    if (this.smartTvUpdateTimer >= 0.1 && (nearHillTv || this.tvModalOpen || this.smartTv.power)) {
      const tvDt = this.smartTvUpdateTimer;
      this.smartTvUpdateTimer = 0;

      // Zero-GC tamed & dino counts for 3D Smart TV OS CanvasTexture
      let tamedCount = 0;
      let dinoCount = 0;
      if (this.worldType === 'island') {
        const allCreatures = this.creatures.creatures;
        for (let i = 0; i < allCreatures.length; i++) {
          const c = allCreatures[i];
          if (!c.alive) continue;
          if (c.tamed) tamedCount += 1;
          const sp = c.spec.species;
          if (
            sp === 'trex' ||
            sp === 'triceratops' ||
            sp === 'velociraptor' ||
            sp === 'stegosaurus' ||
            sp === 'brachiosaurus' ||
            sp === 'parasaurolophus'
          ) {
            dinoCount += 1;
          }
        }
      }

      this.smartTv.update(tvDt, {
        dayCount: this.dayCount,
        timeOfDay: this.timeOfDay,
        weather: this.worldType === 'flat' ? 'clear' : this.weather,
        erosionActive:
          this.worldType === 'island' && this.terrainEngine.getActiveStreamCount() > 0,
        tamedCount,
        dinoCount,
        daysUntilBloodMoon:
          this.worldType === 'flat' ? 0 : 7 - ((this.dayCount - 1) % 7),
        playerBiome:
          this.worldType === 'flat'
            ? 'Flat Park Grounds'
            : BIOME_INFO[getBiomeAt(this.playerX, this.playerZ)].name,
      });
      const audioX = this.tvModalOpen ? this.camera.position.x : this.playerX;
      const audioY = this.tvModalOpen ? this.camera.position.y : this.playerY;
      const audioZ = this.tvModalOpen ? this.camera.position.z : this.playerZ;
      this.smartTv.updateSpatialAudio(audioX, audioY, audioZ);
      if (this.smartTv.tvGlowLight && (!this.smartTv.power || (!nearHillTv && !this.tvModalOpen))) {
        this.smartTv.tvGlowLight.intensity = 0;
      }

      const tvBassEnergy = this.smartTv.getTrunkBassEnergy();
      const tvBassMode = this.smartTv.getBassMode();
      let updatedPlacedTvLight = false;
      for (let i = 0; i < this.structures.length; i++) {
        const st = this.structures[i];
        if (st.type !== 'smart_tv') continue;
        const visual = this.structureVisuals.get(st.id);
        if (visual) {
          this.smartTv.syncPlacedTvVisual(visual.group);
          if (visual.lightMeta) {
            visual.lightMeta.currentIntensity = this.smartTv.power
              ? 1.65 + tvBassEnergy * (tvBassMode === 'extreme' ? 2.4 : 1.55)
              : 0;
            updatedPlacedTvLight = true;
          }
        }
      }
      if (updatedPlacedTvLight) {
        this.updateStructureLightPool();
      }

      // Only notify React when bass energy or mode meaningfully changed (prevents 60Hz React re-renders)
      this.tvBassReportTimer += tvDt;
      if (
        this.tvBassReportTimer >= 0.08 &&
        (Math.abs(tvBassEnergy - this.lastReportedTvBass) > 0.025 ||
          tvBassMode !== this.lastReportedTvBassMode)
      ) {
        this.tvBassReportTimer = 0;
        this.lastReportedTvBass = tvBassEnergy;
        this.lastReportedTvBassMode = tvBassMode;
        this.callbacks.onTvBassUpdate?.(tvBassEnergy, tvBassMode);
      }
    }

    if (this.tvModalOpen) {
      this.hudSyncTimer += dt;
      if (this.hudSyncTimer >= 0.85) {
        this.hudSyncTimer = 0;
        this.emitHud();
      }
    }
  }

  private getExploredCellsArray(): number[] {
    if (this.exploredCellsDirty) {
      this.cachedExploredCells = Array.from(this.exploredCells);
      this.exploredCellsDirty = false;
    }
    return this.cachedExploredCells;
  }

  private getStructuralMeshList(): THREE.Object3D[] {
    if (this.structuralMeshListDirty) {
      this.cachedStructuralMeshList = Array.from(this.structuralMeshes.values());
      this.structuralMeshListDirty = false;
    }
    return this.cachedStructuralMeshList;
  }

  private buildResourceNodeSpatialGrid(): void {
    this.resourceNodeGrid.clear();
    const nodes = this.world.resourceNodes;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const cx = Math.floor(n.x / 16);
      const cz = Math.floor(n.z / 16);
      const key = (cx + 2048) * 4096 + (cz + 2048);
      let bucket = this.resourceNodeGrid.get(key);
      if (!bucket) {
        bucket = [];
        this.resourceNodeGrid.set(key, bucket);
      }
      bucket.push(n);
    }
  }

  private buildColliderSpatialGrid(): void {
    this.colliderGrid.clear();
    const cols = this.world.colliders;
    for (let i = 0; i < cols.length; i++) {
      const col = cols[i];
      // Pre-exclude shipwreck zone colliders so hot loop never computes shipwreck distance
      const sdx = col.x - SHIPWRECK_POS.x;
      const sdz = col.z - SHIPWRECK_POS.z;
      if (sdx * sdx + sdz * sdz < 196) continue;
      const cx = Math.floor(col.x / 16);
      const cz = Math.floor(col.z / 16);
      const key = (cx + 2048) * 4096 + (cz + 2048);
      let bucket = this.colliderGrid.get(key);
      if (!bucket) {
        bucket = [];
        this.colliderGrid.set(key, bucket);
      }
      bucket.push(col);
    }
  }

  private updateVinesAndExtras(dt: number, maxActiveVines: number): void {
    // Rotate unlooted shipwreck chest & Base Armory beacon beams gently (capped by FREEZE_SHIELD)
    if (this.worldType === 'island') {
      const limit = Math.min(this.shipwreckChests.length, maxActiveVines);
      for (let i = 0; i < limit; i++) {
        const chest = this.shipwreckChests[i];
        if (chest.glowMesh && !chest.opened) {
          chest.glowMesh.rotation.y += dt * 1.5;
        }
      }
      if (this.armoryChestState?.glowMesh && !this.armoryChestState.opened) {
        this.armoryChestState.glowMesh.rotation.y += dt * 1.5;
      }
    }
  }

  private renderScene(): void {
    this.updateCamera();
    if (this.mode === 'playing' && !this.cinematicActive) {
      this.syncTvScreenProjection();
    }
    // Adaptive shadow cadence:
    // - Main menu: world & sun are static, so bake once on entry and refresh only every 45 frames
    // - Cinematic / gameplay: update every 2-4 frames when moving, every 8 frames when still
    if (this.effectiveShadowsEnabled && this.renderer.shadowMap.enabled) {
      if (this.mode === 'menu') {
        if (Number.isNaN(this.shadowLastCamX) || this.shadowUpdateFrame === 0) {
          this.renderer.shadowMap.needsUpdate = true;
          this.shadowLastCamX = this.camera.position.x;
          this.shadowLastCamY = this.camera.position.y;
          this.shadowLastCamZ = this.camera.position.z;
        }
        this.shadowUpdateFrame = (this.shadowUpdateFrame + 1) % 45;
      } else {
        const dx = this.camera.position.x - this.shadowLastCamX;
        const dz = this.camera.position.z - this.shadowLastCamZ;
        // Shadow frustum is centered & texel-snapped around player/camera XZ, independent of look yaw/pitch.
        // Skipping shadow updates on camera panning eliminates frame spikes during fast look turns.
        const distSq = dx * dx + dz * dz;
        const isFastTravel = Boolean(
          this.activeVehicleId || this.flightAndTeleport.flying || this.dragonFlight.flying,
        );
        // Prevent shadow map from re-rendering every single frame at 60Hz while driving or flying fast
        const farThresholdSq = isFastTravel
          ? this.isTouchDevice
            ? 36.0
            : 20.0
          : this.isTouchDevice
            ? 9.0
            : 4.0;
        const farMoved = Number.isNaN(this.shadowLastCamX) || distSq > farThresholdSq;
        const walkingMoved = distSq > 0.04;
        const cadence = this.cinematicActive
          ? this.isTouchDevice
            ? 8
            : 6
          : isFastTravel
            ? this.isTouchDevice
              ? 10
              : 8
            : walkingMoved
              ? this.isTouchDevice
                ? 12
                : 10
              : 24;
        this.shadowUpdateFrame = (this.shadowUpdateFrame + 1) % cadence;
        if (farMoved || this.shadowUpdateFrame === 0) {
          this.renderer.shadowMap.needsUpdate = true;
          this.shadowLastCamX = this.camera.position.x;
          this.shadowLastCamY = this.camera.position.y;
          this.shadowLastCamZ = this.camera.position.z;
          this.shadowLastYaw = this.camYaw;
          this.shadowLastPitch = this.camPitch;
          this.shadowUpdateFrame = 0;
        }
      }
    }
    this.renderer.render(this.scene, this.camera);
    this.perfMonitor?.(performance.now());
  }

  // =========================================================================
  // STRUCTURAL INTEGRITY ENGINEERING & VOLUMETRIC TERRAIN DEFORMATION SYSTEMS
  // =========================================================================

  public rotateBuildPiece(): void {
    this.buildRotationStep = (this.buildRotationStep + 1) % 4;
    this.sound.playPickup();
    this.updateBuildPreview();
    this.emitHud();
  }

  private clearStructuralWorld(): void {
    this.structuralMeshes.forEach((m) => {
      this.scene.remove(m);
      this.disposeObject3D(m);
    });
    this.structuralMeshes.clear();
    this.structuralMeshListDirty = true;
    this.structuralVersion += 1;
    this.lastBuildPreviewKey = '';
    this.structuralBlocks = [];
    for (const c of this.collapsingBlocks) {
      this.scene.remove(c.mesh);
      this.disposeObject3D(c.mesh);
    }
    this.collapsingBlocks = [];
    for (const k of this.primedKegs) {
      this.scene.remove(k.mesh);
      this.disposeObject3D(k.mesh);
    }
    this.primedKegs = [];
    for (const t of this.torrentCasks) {
      this.scene.remove(t.mesh);
      this.disposeObject3D(t.mesh);
    }
    this.torrentCasks = [];
    if (this.previewGroup) {
      this.scene.remove(this.previewGroup);
      this.disposeObject3D(this.previewGroup);
      this.previewGroup = null;
      this.previewKind = null;
    }
    this.previewTarget = null;
  }

  private spawnStructuralBlockInstance(b: StructuralBlock): void {
    const mesh = createStructuralBlockMesh(b.kind, false);
    mesh.position.set(b.x, b.y, b.z);
    mesh.rotation.y = b.rotationY;
    mesh.userData.structuralId = b.id;
    this.scene.add(mesh);
    this.structuralMeshes.set(b.id, mesh);
    this.structuralMeshListDirty = true;
    this.structuralVersion += 1;
    this.lastBuildPreviewKey = '';
    this.structuralBlocks.push(b);
  }

  private getStructuralSurfaceY(x: number, z: number, footY: number): number {
    let bestY = -9999;
    for (const b of this.structuralBlocks) {
      const spec = STRUCTURAL_SPECS[b.kind];
      const halfXZ = spec.isPillar ? 0.78 : 1.24;
      if (Math.abs(x - b.x) <= halfXZ && Math.abs(z - b.z) <= halfXZ) {
        const topY = b.y + STRUCT_GRID_Y;
        if (footY >= topY - 1.15 && topY > bestY) {
          bestY = topY;
        }
      }
    }
    // Shipwreck walkable deck surfaces (Island World only)
    if (this.worldType === 'island') {
      const sdx = x - SHIPWRECK_POS.x;
      const sdz = z - SHIPWRECK_POS.z;
      const distToShip = Math.hypot(sdx, sdz);
      if (distToShip < 14) {
        // 1. Collapsed mast bridge & Forecastle deck (gentle ramp from shoreline up to upper deck)
        if (sdz >= -11 && sdz <= -3 && sdx >= -5.0 && sdx <= 2.5) {
          const rampT = (sdz + 11) / 8;
          const rampY = (OCEAN_LEVEL + 0.15) * (1 - rampT) + (OCEAN_LEVEL + 0.85) * rampT;
          if (footY >= rampY - 0.95 && rampY > bestY) {
            bestY = rampY;
          }
        }
        // 2. Mid Deck platform & Armory
        if (sdz > -3 && sdz <= 3 && sdx >= -3.0 && sdx <= 4.5) {
          const midDeckY = OCEAN_LEVEL + 0.95;
          if (footY >= midDeckY - 0.95 && midDeckY > bestY) {
            bestY = midDeckY;
          }
        }
        // 3. Captain's Quarters (Aft Cabin at raised stern)
        if (sdz > 3 && sdz <= 10 && sdx >= -1.5 && sdx <= 5.5) {
          const aftDeckY = OCEAN_LEVEL + 1.75;
          if (footY >= aftDeckY - 0.95 && aftDeckY > bestY) {
            bestY = aftDeckY;
          }
        }
      }

      // Premade Hilltop Base, Front Porch, Entry Step & Music Studio Wing solid floor support
      const hilltopFloorY = getHilltopBaseFloorY(x, z, footY);
      if (hilltopFloorY > bestY) {
        bestY = hilltopFloorY;
      }

      // Enterable Woodland Mansion, Taiga/Snowy Village Cabins, Igloo & Pillager Outpost floors
      const landmarkFloorY = getLandmarkFloorY(x, z, footY);
      if (landmarkFloorY > bestY) {
        bestY = landmarkFloorY;
      }
    }

    return bestY;
  }

  private findNearestAimedStructuralBlock(maxDist: number): StructuralBlock | null {
    const meshList = this.getStructuralMeshList();
    if (meshList.length > 0) {
      _raycaster.setFromCamera(_ndcCenter, this.camera);
      _raycaster.far = maxDist;
      const hits = _raycaster.intersectObjects(meshList, true);
      if (hits.length > 0) {
        let obj: THREE.Object3D | null = hits[0].object;
        while (obj && !obj.userData.structuralId) {
          obj = obj.parent;
        }
        if (obj?.userData.structuralId) {
          const found = this.structuralBlocks.find(
            (b) => b.id === obj!.userData.structuralId,
          );
          if (found) return found;
        }
      }
    }
    let best: StructuralBlock | null = null;
    let bestD = maxDist;
    for (const b of this.structuralBlocks) {
      const d = Math.hypot(b.x - this.playerX, b.z - this.playerZ);
      if (d < bestD && Math.abs(b.y + 1.0 - (this.playerY + 1.0)) < 2.6) {
        bestD = d;
        best = b;
      }
    }
    return best;
  }

  private dismantleStructuralBlock(blockId: string): void {
    const idx = this.structuralBlocks.findIndex((b) => b.id === blockId);
    if (idx === -1) return;
    const b = this.structuralBlocks[idx];
    this.structuralBlocks.splice(idx, 1);
    const mesh = this.structuralMeshes.get(b.id);
    if (mesh) {
      this.scene.remove(mesh);
      this.disposeObject3D(mesh);
      this.structuralMeshes.delete(b.id);
      this.structuralMeshListDirty = true;
    }
    this.structuralVersion += 1;
    this.lastBuildPreviewKey = '';
    this.sound.playGather('stone', 1);
    this.spawnParticles(b.x, b.y + 1.0, b.z, 0x78716c, 10);
    this.addItem(b.kind, 1, true);
    this.recalculateStructuralIntegrity(true);
    this.emitHud();
  }

  private computeStructuralPlacementTarget(kind: StructuralBlockKind): {
    gx: number;
    gy: number;
    gz: number;
    x: number;
    y: number;
    z: number;
    rotationY: number;
    stress: number;
    anchored: boolean;
  } {
    let gx = 0;
    let gy = 0;
    let gz = 0;
    let snapped = false;

    const meshList = this.getStructuralMeshList();
    if (meshList.length > 0) {
      _raycaster.setFromCamera(_ndcCenter, this.camera);
      _raycaster.far = 9.5;
      const hits = _raycaster.intersectObjects(meshList, true);
      if (hits.length > 0 && hits[0].face) {
        let obj: THREE.Object3D | null = hits[0].object;
        while (obj && !obj.userData.structuralId) {
          obj = obj.parent;
        }
        const hitBlock = obj?.userData.structuralId
          ? this.structuralBlocks.find((b) => b.id === obj!.userData.structuralId)
          : null;
        if (hitBlock) {
          _normalMatrix.getNormalMatrix(hits[0].object.matrixWorld);
          _hitNormal.copy(hits[0].face.normal).applyMatrix3(_normalMatrix).normalize();
          const ax = Math.abs(_hitNormal.x);
          const ay = Math.abs(_hitNormal.y);
          const az = Math.abs(_hitNormal.z);
          let dx = 0;
          let dy = 0;
          let dz = 0;
          if (ay >= ax && ay >= az) {
            dy = _hitNormal.y >= 0 ? 1 : -1;
          } else if (ax >= az) {
            dx = _hitNormal.x >= 0 ? 1 : -1;
          } else {
            dz = _hitNormal.z >= 0 ? 1 : -1;
          }
          gx = hitBlock.gx + dx;
          gy = hitBlock.gy + dy;
          gz = hitBlock.gz + dz;
          snapped = true;
        }
      }
    }

    if (!snapped) {
      _probeEuler.set(this.camPitch, this.camYaw, 0, 'YXZ');
      const dir = _vec3A.set(0, 0, -1).applyEuler(_probeEuler);
      let hitX = this.playerX + dir.x * 3.8;
      let hitY = getTerrainHeight(hitX, this.playerZ + dir.z * 3.8);
      let hitZ = this.playerZ + dir.z * 3.8;
      const startY = this.playerY + this.currentEyeHeight;
      for (let d = 2.4; d <= 9.0; d += 0.35) {
        const px = this.playerX + dir.x * d;
        const py = startY + dir.y * d;
        const pz = this.playerZ + dir.z * d;
        const th = getTerrainHeight(px, pz);
        if (py <= th + 0.12) {
          hitX = px;
          hitY = th;
          hitZ = pz;
          break;
        }
      }
      const grid = worldToGrid(hitX, hitY - 0.15, hitZ);
      gx = grid.gx;
      gy = grid.gy;
      gz = grid.gz;
      // Avoid overlapping an already occupied cell on ground aim
      while (
        this.structuralBlocks.some(
          (b) => b.gx === gx && b.gy === gy && b.gz === gz,
        )
      ) {
        gy += 1;
      }
    }

    const pos = gridToWorld(gx, gy, gz);
    const rotationY = this.buildRotationStep * (Math.PI / 2);
    const preview = previewBlockPlacementStress(this.structuralBlocks, {
      kind,
      gx,
      gy,
      gz,
      x: pos.x,
      y: pos.y,
      z: pos.z,
      rotationY,
    });
    return {
      gx,
      gy,
      gz,
      x: pos.x,
      y: pos.y,
      z: pos.z,
      rotationY,
      stress: preview.stress,
      anchored: preview.anchored,
    };
  }

  private updateBuildPreview(): void {
    const eqId = this.getEquippedItemId();
    const eqDef = eqId ? ITEMS[eqId] : null;
    const structKind = eqDef?.structuralKind ?? null;
    const kineticKind = eqDef?.kineticKind ?? null;

    if (
      this.mode !== 'playing' ||
      this.gameOver ||
      this.cinematicActive ||
      this.activeVehicleId
    ) {
      this.lastBuildPreviewKey = '';
      if (this.previewGroup) this.previewGroup.visible = false;
      if (this.kineticPreviewGroup) this.kineticPreviewGroup.visible = false;
      this.previewTarget = null;
      this.kineticPreviewTarget = null;
      return;
    }

    if (kineticKind) {
      this.lastBuildPreviewKey = '';
      if (this.previewGroup) this.previewGroup.visible = false;
      this.previewTarget = null;

      if (this.kineticPreviewKind !== kineticKind) {
        if (this.kineticPreviewGroup) {
          this.scene.remove(this.kineticPreviewGroup);
          this.disposeObject3D(this.kineticPreviewGroup);
        }
        const built = createKineticNodeMesh(kineticKind, this.world.woodTex, true);
        this.kineticPreviewGroup = built.root;
        this.kineticPreviewKind = kineticKind;
        this.scene.add(this.kineticPreviewGroup);
      }

      const kt = this.computeKineticPlacementTarget(kineticKind);
      this.kineticPreviewTarget = kt;
      if (this.kineticPreviewGroup) {
        this.kineticPreviewGroup.visible = true;
        this.kineticPreviewGroup.position.set(kt.x, kt.y, kt.z);
        this.kineticPreviewGroup.rotation.y = kt.rotationY;
      }
      return;
    }

    if (this.kineticPreviewGroup) {
      this.kineticPreviewGroup.visible = false;
    }
    this.kineticPreviewTarget = null;

    if (!structKind) {
      this.lastBuildPreviewKey = '';
      if (this.previewGroup) {
        this.previewGroup.visible = false;
      }
      this.previewTarget = null;
      return;
    }

    if (this.previewKind !== structKind) {
      this.lastBuildPreviewKey = '';
      if (this.previewGroup) {
        this.scene.remove(this.previewGroup);
        this.disposeObject3D(this.previewGroup);
      }
      this.previewGroup = createStructuralBlockMesh(structKind, true);
      this.previewKind = structKind;
      this.scene.add(this.previewGroup);
    }

    const previewKey = `${structKind}|${Math.round(this.playerX * 10)}|${Math.round(this.playerY * 10)}|${Math.round(this.playerZ * 10)}|${Math.round(this.camYaw * 64)}|${Math.round(this.camPitch * 64)}|${this.buildRotationStep}|${this.structuralVersion}`;
    if (previewKey === this.lastBuildPreviewKey && this.previewTarget) {
      return;
    }
    this.lastBuildPreviewKey = previewKey;

    const target = this.computeStructuralPlacementTarget(structKind);
    this.previewTarget = target;
    if (this.previewGroup) {
      this.previewGroup.visible = true;
      this.previewGroup.position.set(target.x, target.y, target.z);
      this.previewGroup.rotation.y = target.rotationY;
      const mats = this.previewGroup.userData.stressMaterials as
        | THREE.MeshStandardMaterial[]
        | undefined;
      if (mats) {
        const tintHex =
          target.stress >= 1.0
            ? 0xef4444
            : target.stress >= 0.55
              ? 0xf59e0b
              : 0x22c55e;
        for (const m of mats) {
          m.color.setHex(tintHex);
          m.emissive.setHex(tintHex);
          m.emissiveIntensity = target.stress >= 1.0 ? 0.55 : 0.25;
        }
      }
    }
  }

  public placeStructuralBlock(itemId: ItemId): boolean {
    const def = ITEMS[itemId];
    const kind = def.structuralKind;
    const creativeBuild = this.gameMode === 'sandbox' || this.worldType === 'flat';
    if (!kind || (!creativeBuild && this.getItemCount(itemId) <= 0)) return false;

    const target = this.computeStructuralPlacementTarget(kind);
    if (
      this.structuralBlocks.some(
        (b) => b.gx === target.gx && b.gy === target.gy && b.gz === target.gz,
      )
    ) {
      this.toast('Space occupied — aim beside or on top of the span', 'warning');
      return false;
    }

    if (!creativeBuild && this.getItemCount(itemId) > 0) {
      this.removeItem(itemId, 1);
    }
    const block: StructuralBlock = {
      id: `sblk_${Date.now()}_${Math.floor(Math.random() * 9999)}`,
      kind,
      gx: target.gx,
      gy: target.gy,
      gz: target.gz,
      x: target.x,
      y: target.y,
      z: target.z,
      rotationY: target.rotationY,
      stress: target.stress,
      anchored: target.anchored,
      supportHops: 0,
      bucklingTimer: 0,
    };
    this.spawnStructuralBlockInstance(block);
    this.p2p?.broadcast({ type: 'place_block', block });
    this.sound.playCraftSuccess();
    this.spawnParticles(block.x, block.y + 0.9, block.z, 0x94a3b8, 6);

    const res = this.recalculateStructuralIntegrity(true);
    if (res.overloadedIds.length > 0) {
      this.toast(
        'OVERLOAD! Unbraced span buckling — add Stone Pillars or Keystone Arches!',
        'warning',
      );
    } else if (block.stress >= 0.65) {
      this.toast(
        `${def.name} built (${Math.round(block.stress * 100)}% load strain — brace soon)`,
        'info',
      );
    } else {
      this.toast(`Built ${def.name} (${Math.round(block.stress * 100)}% load)`, 'craft');
    }
    this.emitHud();
    return true;
  }

  private recalculateStructuralIntegrity(triggerBuckle: boolean): {
    maxStress: number;
    overloadedIds: string[];
  } {
    const res = solveStructuralIntegrity(this.structuralBlocks);
    let startedNewBuckle = false;

    for (const b of this.structuralBlocks) {
      const mesh = this.structuralMeshes.get(b.id);
      if (b.stress >= 1.0 && triggerBuckle && b.bucklingTimer <= 0) {
        b.bucklingTimer = 0.55 + Math.random() * 0.35;
        startedNewBuckle = true;
      } else if (b.stress < 1.0) {
        b.bucklingTimer = 0;
        if (mesh) {
          mesh.position.set(b.x, b.y, b.z);
          mesh.rotation.set(0, b.rotationY, 0);
        }
      }

      if (mesh) {
        const mats = mesh.userData.stressMaterials as
          | THREE.MeshStandardMaterial[]
          | undefined;
        if (mats) {
          for (const m of mats) {
            if (b.stress >= 1.0) {
              m.emissive.setHex(0xdc2626);
              m.emissiveIntensity = 0.52;
            } else if (b.stress >= 0.55) {
              const t = (b.stress - 0.55) / 0.45;
              m.emissive.setHex(0xd97706);
              m.emissiveIntensity = 0.15 + t * 0.25;
            } else {
              m.emissive.setHex(0x000000);
              m.emissiveIntensity = 0;
            }
          }
        }
      }
    }

    if (startedNewBuckle && this.creakCooldown <= 0) {
      this.creakCooldown = 0.45;
      this.sound.playStructuralCreak();
    }
    return res;
  }

  private useExcavatorShovel(): void {
    _probeEuler.set(this.camPitch, this.camYaw, 0, 'YXZ');
    const dir = _vec3A.set(0, 0, -1).applyEuler(_probeEuler);
    let tx = this.playerX + dir.x * 2.8;
    let tz = this.playerZ + dir.z * 2.8;
    const startY = this.playerY + this.currentEyeHeight;
    for (let d = 1.6; d <= 5.2; d += 0.35) {
      const px = this.playerX + dir.x * d;
      const py = startY + dir.y * d;
      const pz = this.playerZ + dir.z * d;
      if (py <= getTerrainHeight(px, pz) + 0.15) {
        tx = px;
        tz = pz;
        break;
      }
    }
    const delta = this.isCrouching ? 0.65 : -0.95;
    const moved = this.terrainEngine.excavateSoilBrush(tx, tz, 3.0, delta);
    if (moved > 0) {
      this.sound.playDigSoil();
      const ty = getTerrainHeight(tx, tz);
      this.spawnParticles(tx, ty + 0.25, tz, 0x78553a, 12);
      this.recalculateStructuralIntegrity(true);
      this.toast(
        this.isCrouching ? 'Graded soil berm upward' : 'Excavated trench into earth',
        'info',
      );
      this.emitHud();
    } else {
      this.toast('Protected settlement bedrock cannot be dug here', 'warning');
    }
  }

  private throwPowderKeg(): boolean {
    if (this.getItemCount('powder_keg') <= 0) return false;
    this.removeItem('powder_keg', 1);

    _probeEuler.set(this.camPitch, this.camYaw, 0, 'YXZ');
    const dir = _vec3A.set(0, 0, -1).applyEuler(_probeEuler);
    const start = new THREE.Vector3(
      this.playerX + dir.x * 0.8,
      this.playerY + this.currentEyeHeight - 0.15,
      this.playerZ + dir.z * 0.8,
    );
    const vel = new THREE.Vector3(
      dir.x * 13.5,
      dir.y * 13.5 + 4.2,
      dir.z * 13.5,
    );

    const mesh = createPowderKegMesh();
    mesh.position.copy(start);
    this.scene.add(mesh);
    this.primedKegs.push({ mesh, pos: start, vel, fuse: 1.45 });
    this.sound.playAttack('melee');
    this.toast('Lit Powder Keg thrown — take cover!', 'warning');
    this.emitHud();
    return true;
  }

  private detonatePowderKeg(bx: number, by: number, bz: number): void {
    this.terrainEngine.carveJaggedCrater(bx, bz, 6.8, 3.3);
    this.terrainEngine.syncAllDeformedVertices(
      this.world.terrainMesh,
      this.world.baseTerrainColors,
    );
    this.sound.playExplosion();
    this.cameraShakeTimer = 0.45;

    this.spawnParticles(bx, by + 0.6, bz, 0xf97316, 18);
    this.spawnParticles(bx, by + 0.9, bz, 0x57534e, 16);
    this.spawnParticles(bx, by + 1.2, bz, 0x1c1917, 12);

    // Blast triggers any unstable Cave Ceiling Stalactites nearby!
    if (this.world?.caveCeilings) {
      for (const cc of this.world.caveCeilings) {
        if (cc.collapsed || cc.falling) continue;
        if (Math.hypot(cc.x - bx, cc.z - bz) <= 8.5) {
          this.damageCaveCeiling(cc, 999);
        }
      }
    }

    // Blast damage to nearby wildlife/dinosaurs
    for (const c of this.creatures.creatures) {
      if (!c.alive || !c.cycleActive) continue;
      const d = Math.hypot(c.x - bx, c.z - bz);
      if (d < 9.5) {
        const dmg = Math.round(135 * (1 - d / 10.5));
        this.creatures.shatterAllArmor(c);
        const res = this.creatures.damageCreature(c, dmg, bx, bz, {
          stunSeconds: 2.2,
          knockback: 4.5,
        });
        if (res.killed) {
          this.handleCreatureDefeated(c, res.drops, 'Powder Keg Blast');
        }
      }
    }

    // Shatter nearby structural blocks inside inner blast radius, then re-solve integrity for bridges/fortresses!
    let shattered = 0;
    for (let i = this.structuralBlocks.length - 1; i >= 0; i--) {
      const b = this.structuralBlocks[i];
      const dist = Math.hypot(b.x - bx, b.y + 0.8 - by, b.z - bz);
      if (dist < 4.2) {
        this.structuralBlocks.splice(i, 1);
        const mesh = this.structuralMeshes.get(b.id);
        this.structuralMeshes.delete(b.id);
        this.structuralMeshListDirty = true;
        if (mesh) {
          this.collapsingBlocks.push({
            mesh,
            kind: b.kind,
            vx: ((b.x - bx) / Math.max(0.5, dist)) * 6 + (Math.random() - 0.5) * 3,
            vy: 6.5 + Math.random() * 4,
            vz: ((b.z - bz) / Math.max(0.5, dist)) * 6 + (Math.random() - 0.5) * 3,
            rx: (Math.random() - 0.5) * 5,
            rz: (Math.random() - 0.5) * 5,
            life: 2.8,
            hitGround: false,
          });
        }
        shattered += 1;
      }
    }

    const integrity = this.recalculateStructuralIntegrity(true);
    if (shattered > 0 || integrity.overloadedIds.length > 0) {
      this.toast(
        'Blast shattered masonry & destabilized nearby spans!',
        'warning',
      );
    } else {
      this.toast('Jagged blast crater carved into the earth!', 'craft');
    }
    this.emitHud();
  }

  private releaseWaterTorrent(): boolean {
    if (this.getItemCount('water_torrent') <= 0) return false;
    this.removeItem('water_torrent', 1);
    const fwdX = -Math.sin(this.camYaw);
    const fwdZ = -Math.cos(this.camYaw);
    const wx = this.playerX + fwdX * 2.2;
    const wz = this.playerZ + fwdZ * 2.2;
    const wy = getTerrainHeight(wx, wz);

    const cask = createWaterTorrentMesh();
    cask.position.set(wx, wy + 0.04, wz);
    cask.rotation.y = this.camYaw;
    this.scene.add(cask);
    this.torrentCasks.push({ mesh: cask, life: 11.5 });

    this.terrainEngine.spawnWaterTorrent(wx, wz, 11.0, fwdX * 2.8, fwdZ * 2.8);
    this.sound.playWaterRush();
    this.spawnParticles(wx, wy + 0.5, wz, 0x38bdf8, 14);
    this.toast(
      'Water Torrent unleashed — carving channels downhill via fluid dynamics!',
      'discovery',
    );
    this.emitHud();
    return true;
  }

  private updateStructuralAndTerrainSystems(dt: number): void {
    if (this.cameraShakeTimer > 0) this.cameraShakeTimer = Math.max(0, this.cameraShakeTimer - dt);
    if (this.creakCooldown > 0) this.creakCooldown = Math.max(0, this.creakCooldown - dt);
    if (this.trenchCooldown > 0) this.trenchCooldown = Math.max(0, this.trenchCooldown - dt);

    // 1. Advance volumetric fluid erosion, storm rainwater puddles & coastal sand erosion
    const isRaining = this.weather === 'rain' || this.weather === 'storm';
    const isStorming = this.weather === 'storm';
    const erosionRes = this.terrainEngine.step(
      dt,
      this.world.terrainMesh,
      this.world.baseTerrainColors,
      isRaining,
      this.playerX,
      this.playerZ,
      isStorming,
    );
    if (erosionRes.avalanches.length > 0) {
      for (const av of erosionRes.avalanches) {
        this.spawnParticles(av.x, av.y + 0.3, av.z, 0x78553a, 5);
      }
      this.recalculateStructuralIntegrity(true);
    }

    // 2. Step buckling blocks -> realistic creaking tilt, mortar dust & cascading detachment
    let detachedAny = false;
    for (let i = this.structuralBlocks.length - 1; i >= 0; i--) {
      const b = this.structuralBlocks[i];
      if (b.bucklingTimer <= 0) continue;
      b.bucklingTimer -= dt;
      const mesh = this.structuralMeshes.get(b.id);
      if (mesh) {
        const shake = Math.sin(this.elapsed * 46 + i) * 0.055;
        const progress = Math.max(0, 1 - b.bucklingTimer / 0.7);
        mesh.position.set(
          b.x + shake,
          b.y - progress * 0.24,
          b.z - shake * 0.8,
        );
        mesh.rotation.z = Math.sin(this.elapsed * 22 + i) * 0.07 + progress * 0.14;
      }
      if (Math.random() < dt * 7) {
        this.spawnParticles(b.x, b.y + 0.6, b.z, 0xa8a29e, 2);
      }

      if (b.bucklingTimer <= 0) {
        this.structuralBlocks.splice(i, 1);
        this.structuralMeshes.delete(b.id);
        this.structuralMeshListDirty = true;
        detachedAny = true;
        this.sound.playCollapseCrash();
        this.spawnParticles(b.x, b.y + 1.0, b.z, 0x78716c, 12);
        const dropItem: ItemId =
          b.kind === 'timber_beam' || b.kind === 'timber_pillar' ? 'wood' : 'stone';
        this.spawnPickup(dropItem, 2, b.x, b.z, 180, undefined, 0.8);
        if (mesh) {
          this.collapsingBlocks.push({
            mesh,
            kind: b.kind,
            vx: (Math.random() - 0.5) * 2.4,
            vy: -1.5,
            vz: (Math.random() - 0.5) * 2.4,
            rx: (Math.random() - 0.5) * 3.2,
            rz: (Math.random() - 0.5) * 3.2,
            life: 2.6,
            hitGround: false,
          });
        }
      }
    }
    if (detachedAny) {
      this.recalculateStructuralIntegrity(true);
    }

    // 3. Falling collapsed debris physics
    for (let i = this.collapsingBlocks.length - 1; i >= 0; i--) {
      const cb = this.collapsingBlocks[i];
      cb.life -= dt;
      cb.vy -= 18 * dt;
      cb.mesh.position.x += cb.vx * dt;
      cb.mesh.position.y += cb.vy * dt;
      cb.mesh.position.z += cb.vz * dt;
      cb.mesh.rotation.x += cb.rx * dt;
      cb.mesh.rotation.z += cb.rz * dt;
      const gh = getTerrainHeight(cb.mesh.position.x, cb.mesh.position.z);
      if (cb.mesh.position.y <= gh) {
        cb.mesh.position.y = gh;
        if (!cb.hitGround) {
          cb.hitGround = true;
          this.spawnParticles(cb.mesh.position.x, gh + 0.3, cb.mesh.position.z, 0x78716c, 8);
          cb.vy = Math.abs(cb.vy) * 0.22;
          cb.vx *= 0.4;
          cb.vz *= 0.4;
        } else {
          cb.vy = 0;
          cb.vx *= 0.8;
          cb.vz *= 0.8;
        }
      }
      if (cb.life <= 0) {
        this.scene.remove(cb.mesh);
        this.disposeObject3D(cb.mesh);
        this.collapsingBlocks.splice(i, 1);
      }
    }

    // 4. Primed Powder Keg throwables & fuse detonation
    for (let i = this.primedKegs.length - 1; i >= 0; i--) {
      const k = this.primedKegs[i];
      k.fuse -= dt;
      k.vel.y -= 18 * dt;
      k.pos.addScaledVector(k.vel, dt);
      const gh = Math.max(
        getTerrainHeight(k.pos.x, k.pos.z),
        this.getStructuralSurfaceY(k.pos.x, k.pos.z, k.pos.y + 0.4),
      );
      if (k.pos.y <= gh) {
        k.pos.y = gh;
        k.vel.y = Math.abs(k.vel.y) * 0.32;
        k.vel.x *= 0.55;
        k.vel.z *= 0.55;
      }
      k.mesh.position.copy(k.pos);
      k.mesh.rotation.x += dt * 4.5;
      if (Math.random() < dt * 18) {
        this.spawnParticles(k.pos.x, k.pos.y + 0.55, k.pos.z, 0xfde047, 1);
      }
      if (k.fuse <= 0) {
        this.scene.remove(k.mesh);
        this.disposeObject3D(k.mesh);
        this.primedKegs.splice(i, 1);
        this.detonatePowderKeg(k.pos.x, k.pos.y, k.pos.z);
      }
    }

    // 5. Temporary Water Torrent cask props
    for (let i = this.torrentCasks.length - 1; i >= 0; i--) {
      const t = this.torrentCasks[i];
      t.life -= dt;
      if (t.life <= 0) {
        this.scene.remove(t.mesh);
        this.disposeObject3D(t.mesh);
        this.torrentCasks.splice(i, 1);
      }
    }
  }

  // =========================================================================
  // KINETIC POWER NETWORKS & MODULAR PHYSICS-DRIVEN VEHICLES
  // =========================================================================

  private disposeObject3D(root: THREE.Object3D): void {
    root.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        if (obj.geometry && !obj.geometry.userData?.sharedAsset) {
          obj.geometry.dispose();
        }
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of mats) {
          if (!m || m.userData?.sharedAsset) continue;
          const std = m as THREE.MeshStandardMaterial;
          if (std.map && !std.map.userData?.sharedAsset) std.map.dispose();
          if (std.emissiveMap && !std.emissiveMap.userData?.sharedAsset) std.emissiveMap.dispose();
          m.dispose();
        }
      }
    });
  }

  private clearKineticAndVehicleWorld(): void {
    this.kineticMeshes.forEach((h) => {
      this.scene.remove(h.root);
      this.disposeObject3D(h.root);
    });
    this.kineticMeshes.clear();
    this.kineticNodes = [];

    for (const bm of this.beltSpanMeshes) {
      this.scene.remove(bm.group);
      this.disposeObject3D(bm.group);
    }
    this.beltSpanMeshes = [];
    this.beltLinks = [];

    if (this.kineticPreviewGroup) {
      this.scene.remove(this.kineticPreviewGroup);
      this.disposeObject3D(this.kineticPreviewGroup);
      this.kineticPreviewGroup = null;
      this.kineticPreviewKind = null;
    }
    this.kineticPreviewTarget = null;
    this.targetKineticNode = null;

    this.vehicleMeshes.forEach((vh) => {
      this.scene.remove(vh.root);
      this.disposeObject3D(vh.root);
    });
    this.vehicleMeshes.clear();
    this.vehicleUnderglowMeta.clear();
    for (let i = 0; i < this.vehicleUnderglowPool.length; i++) {
      this.vehicleUnderglowPool[i].intensity = 0;
    }
    this.vehicleShadowDiscs.clear();
    this.autoParkJobs.clear();
    this.vehicles = [];
    this.activeVehicleId = null;
    this.selectedCargoVehicleId = null;
    this.vehicleForwardSpeed = 0;
    this.vehicleSteerAngle = 0;
    this.vehicleVisualPitch = 0;
    this.vehicleVisualRoll = 0;
    this.vehicleAltitudeVel = 0;
    this.vehicleAscendHold = false;
    this.vehicleDescendHold = false;
    this.hydraulicMode = 'level';
    this.hydCorners = { fl: 0, fr: 0, rl: 0, rr: 0 };
    this.hydVel = { fl: 0, fr: 0, rl: 0, rr: 0 };
    this.trunkBassPulse = 0;
    this.sound.stopTrunkBass();
  }

  private setupStarterEngineeringShowcase(
    seedVehicles: boolean,
    seedKinetic: boolean,
  ): void {
    if (seedKinetic) {
      const mkNode = (
        id: string,
        kind: KineticNodeKind,
        x: number,
        z: number,
        rotY = 0,
        yOverride?: number,
      ): KineticNode => {
        const gh = getTerrainHeight(x, z);
        const wh = getWaterLevelAt(x, z);
        const y =
          yOverride ??
          (kind === 'water_wheel' ? Math.max(gh - 0.35, wh - 0.72) : gh);
        return {
          id,
          kind,
          x,
          y,
          z,
          rotationY: rotY,
          rpm: 0,
          torque: 0,
          steamPsi: 0,
          waterFlow: 0,
          active: false,
          stalled: false,
          cycleProgress: 0,
          storedOutputCount: kind === 'auto_assembler' ? 2 : 0,
          connectedIds: [],
        };
      };

      // Crystal River Hydro Waterwheel -> Steam Boiler -> Engine -> Shaft -> Gearbox -> Valley Belt #1 ===[28.8m Belt]=== Valley Belt #2 -> Automated Vehicle Assembler near Spawn!
      const riverWheel = mkNode('kp_river_wheel', 'water_wheel', 30, 48, 0.35);
      const riverPipe = mkNode('kp_river_pipe', 'fluid_pipe', 28, 51.5, -0.5);
      const steamBoiler = mkNode('kp_valley_boiler', 'steam_boiler', 26, 55.2, -0.4);
      const steamEngine = mkNode('kp_valley_engine', 'steam_engine', 24, 59, -0.4);
      const driveShaft = mkNode('kp_valley_shaft', 'drive_shaft', 21.8, 62.5, -0.55);
      const gearBox = mkNode('kp_valley_gearbox', 'gear_box', 19.5, 66, -0.55);
      const valleyPulley = mkNode('kp_pulley_valley_north', 'belt_pulley', 17.5, 69.5, -0.2);
      const campPulley = mkNode('kp_pulley_camp_south', 'belt_pulley', 10.5, 97.5, -0.2);
      const campAssembler = mkNode('kp_camp_assembler', 'auto_assembler', 9.0, 101.0, Math.PI * 0.85);

      for (const n of [
        riverWheel,
        riverPipe,
        steamBoiler,
        steamEngine,
        driveShaft,
        gearBox,
        valleyPulley,
        campPulley,
        campAssembler,
      ]) {
        this.spawnKineticNodeInstance(n);
      }
      this.rebuildKineticNetwork(false);
    }

    if (seedVehicles) {
      // Bay 1: 1964 Impala Candy Lowrider (with 4-Corner Hydraulics)
      const bay1X = VEHICLE_GARAGE_POS.x - 9.0;
      const bay1Z = VEHICLE_GARAGE_POS.z + 0.6;
      const lowrider = createVehicleFromPreset(
        'veh_starter_lowrider',
        'lowrider',
        bay1X,
        getTerrainHeight(bay1X, bay1Z) + 0.14,
        bay1Z,
        0,
      );
      this.spawnVehicleInstance(lowrider);

      // Bay 2: Lifted 1974 Box Chevy DONK on 30-inch Chrome Rims
      const bay2X = VEHICLE_GARAGE_POS.x - 3.0;
      const bay2Z = VEHICLE_GARAGE_POS.z + 0.6;
      const donk = createVehicleFromPreset(
        'veh_starter_donk',
        'donk',
        bay2X,
        getTerrainHeight(bay2X, bay2Z) + 0.14,
        bay2Z,
        0,
      );
      this.spawnVehicleInstance(donk);

      // Bay 3: Houston Candy SLAB on Swangers + 5th-Wheel Continental + Trunk Bass
      const bay3X = VEHICLE_GARAGE_POS.x + 3.0;
      const bay3Z = VEHICLE_GARAGE_POS.z + 0.6;
      const slab = createVehicleFromPreset(
        'veh_starter_slab',
        'slab',
        bay3X,
        getTerrainHeight(bay3X, bay3Z) + 0.14,
        bay3Z,
        0,
      );
      this.spawnVehicleInstance(slab);

      // Bay 4: Pearl-White Cadillac Coupe DeVille (13" Chrome Spinners, Airbags + Coil-Overs, Droptop)
      const bay4X = VEHICLE_GARAGE_POS.x + 9.0;
      const bay4Z = VEHICLE_GARAGE_POS.z + 0.6;
      const deville = createVehicleFromPreset(
        'veh_starter_deville',
        'cadillac_coupe_deville',
        bay4X,
        getTerrainHeight(bay4X, bay4Z) + 0.14,
        bay4Z,
        0,
      );
      this.spawnVehicleInstance(deville);

      // Expedition 4x4 Rover parked on the East Service Apron beside Bay 4
      const apronX = VEHICLE_GARAGE_POS.x + 16.0;
      const apronZ = VEHICLE_GARAGE_POS.z + 5.2;
      const rover = createVehicleFromPreset(
        'veh_starter_rover',
        'expedition_rover',
        apronX,
        getTerrainHeight(apronX, apronZ) + 0.14,
        apronZ,
        0,
      );
      this.spawnVehicleInstance(rover);

      // Slammed Chevy Tahoe on 40" Forgiato "44" Auto Spinners + Behind-Driver Subwoofers (West Apron beside Bay 1)
      const westApronX = VEHICLE_GARAGE_POS.x - 16.0;
      const westApronZ = VEHICLE_GARAGE_POS.z + 5.2;
      const tahoe = createVehicleFromPreset(
        'veh_starter_tahoe',
        'chevy_tahoe',
        westApronX,
        getTerrainHeight(westApronX, westApronZ) + 0.14,
        westApronZ,
        0,
      );
      this.spawnVehicleInstance(tahoe);

      const boat = createVehicleFromPreset(
        'veh_starter_boat',
        'steam_boat',
        14.5,
        OCEAN_LEVEL + 0.05,
        121,
        Math.PI * 0.08,
      );
      this.spawnVehicleInstance(boat);
    }
  }

  private spawnKineticNodeInstance(node: KineticNode): void {
    const built = createKineticNodeMesh(node.kind, this.world.woodTex, false);
    built.root.position.set(node.x, node.y, node.z);
    built.root.rotation.y = node.rotationY;
    built.root.userData.kineticId = node.id;
    this.scene.add(built.root);
    this.kineticMeshes.set(node.id, built);
    this.kineticNodes.push(node);
  }

  private rebuildKineticNetwork(notifyLinks = false): void {
    const prevBelts = this.beltLinks.length;
    const solved = solveKineticNetwork(this.kineticNodes);
    this.beltLinks = solved.belts;
    this.kineticTotalRpm = solved.totalRpmOutput;
    this.kineticMaxPsi = solved.maxSteamPsi;
    this.kineticActiveAssemblers = solved.activeAssemblers;

    for (const bm of this.beltSpanMeshes) {
      this.scene.remove(bm.group);
      this.disposeObject3D(bm.group);
    }
    this.beltSpanMeshes = [];

    for (const link of this.beltLinks) {
      const span = createBeltSpanMesh(
        _vec3A.set(link.fromX, link.fromY, link.fromZ),
        _vec3B.set(link.toX, link.toY, link.toZ),
      );
      this.scene.add(span.group);
      this.beltSpanMeshes.push(span);
    }

    if (notifyLinks && this.beltLinks.length > prevBelts) {
      this.sound.playWeldSnap();
      this.toast(
        `Belt Span Linked (${this.beltLinks.length} valley belt${this.beltLinks.length > 1 ? 's' : ''} up to ${BELT_MAX_SPAN_METERS}m)!`,
        'craft',
        'belt_pulley',
        1,
      );
    }
  }

  private computeKineticPlacementTarget(kind: KineticNodeKind): {
    x: number;
    y: number;
    z: number;
    rotationY: number;
  } {
    _probeEuler.set(this.camPitch, this.camYaw, 0, 'YXZ');
    const dir = _vec3A.set(0, 0, -1).applyEuler(_probeEuler);
    let tx = this.playerX + dir.x * 3.6;
    let tz = this.playerZ + dir.z * 3.6;
    let ty = getTerrainHeight(tx, tz);
    const startY = this.playerY + this.currentEyeHeight;
    for (let d = 2.0; d <= 8.0; d += 0.35) {
      const px = this.playerX + dir.x * d;
      const py = startY + dir.y * d;
      const pz = this.playerZ + dir.z * d;
      const surf = Math.max(
        getTerrainHeight(px, pz),
        this.getStructuralSurfaceY(px, pz, py + 0.5),
      );
      if (py <= surf + 0.16) {
        tx = px;
        tz = pz;
        ty = surf;
        break;
      }
    }

    if (kind === 'water_wheel') {
      const waterY = getWaterLevelAt(tx, tz);
      const groundY = getTerrainHeight(tx, tz);
      if (waterY > groundY - 0.25 || isFreshwaterAt(tx, tz)) {
        ty = Math.max(groundY - 0.35, waterY - 0.72);
      }
    } else {
      const deckY = this.getStructuralSurfaceY(tx, tz, startY);
      ty = Math.max(getTerrainHeight(tx, tz), deckY);
    }

    const baseRot = Math.round(this.camYaw / (Math.PI / 2)) * (Math.PI / 2);
    const rotationY = baseRot + this.buildRotationStep * (Math.PI / 2);
    return { x: tx, y: ty, z: tz, rotationY };
  }

  public placeKineticNode(itemId: ItemId): boolean {
    const def = ITEMS[itemId];
    const kind = def.kineticKind;
    const creativeBuild = this.gameMode === 'sandbox' || this.worldType === 'flat';
    if (!kind || (!creativeBuild && this.getItemCount(itemId) <= 0)) return false;

    const target = this.computeKineticPlacementTarget(kind);
    const tooClose = this.kineticNodes.some(
      (n) => Math.hypot(n.x - target.x, n.z - target.z) < 1.35,
    );
    if (tooClose) {
      this.toast('Step slightly back — machinery needs 1.5m clearance', 'warning');
      return false;
    }

    const waterY = getWaterLevelAt(target.x, target.z);
    if (kind !== 'water_wheel' && target.y < waterY - 0.25) {
      this.toast(
        'Place boilers, shafts & assemblers on dry land or built bridges!',
        'warning',
      );
      return false;
    }

    if (!creativeBuild && this.getItemCount(itemId) > 0) {
      this.removeItem(itemId, 1);
    }
    const node: KineticNode = {
      id: `knode_${Date.now()}_${Math.floor(Math.random() * 9999)}`,
      kind,
      x: target.x,
      y: target.y,
      z: target.z,
      rotationY: target.rotationY,
      rpm: 0,
      torque: 0,
      steamPsi: 0,
      waterFlow: 0,
      active: false,
      stalled: false,
      cycleProgress: 0,
      storedOutputCount: 0,
      connectedIds: [],
    };
    this.spawnKineticNodeInstance(node);
    this.rebuildKineticNetwork(true);
    this.sound.playWeldSnap();
    this.spawnParticles(node.x, node.y + 0.8, node.z, 0xf59e0b, 9);

    if (kind === 'water_wheel' && !node.active) {
      this.toast(
        'Hydro Waterwheel placed — install directly in a river, lake, or surf to generate RPM!',
        'info',
        itemId,
      );
    } else if (kind === 'steam_boiler') {
      this.sound.playSteamHiss();
      this.toast(
        `Steam Boiler pressurized (${Math.round(node.steamPsi)} PSI) — pipe to a Steam Piston Engine!`,
        'craft',
        itemId,
      );
    } else if (kind === 'steam_engine' && node.stalled) {
      this.toast(
        'Steam Engine awaits >=18 PSI steam pipe from a Steam Boiler!',
        'info',
        itemId,
      );
    } else {
      this.toast(
        `${def.name} installed${node.active ? ` (${Math.abs(node.rpm)} RPM live)` : ''}`,
        'craft',
        itemId,
      );
    }
    this.emitHud();
    return true;
  }

  private findNearestKineticNode(maxDist: number): KineticNode | null {
    let best: KineticNode | null = null;
    let bestD = maxDist;
    for (const kn of this.kineticNodes) {
      const d = Math.hypot(kn.x - this.playerX, kn.z - this.playerZ);
      if (d < bestD && Math.abs(kn.y - this.playerY) < 3.4) {
        bestD = d;
        best = kn;
      }
    }
    return best;
  }

  public dismantleNearbyKineticNode(): void {
    const target = this.targetKineticNode || this.findNearestKineticNode(4.2);
    if (!target) {
      this.toast('Move closer or look at machinery to dismantle [X]', 'info');
      return;
    }
    this.dismantleKineticNode(target.id);
  }

  public dismantleKineticNode(nodeId: string): void {
    const idx = this.kineticNodes.findIndex((n) => n.id === nodeId);
    if (idx === -1) return;
    const node = this.kineticNodes[idx];
    if (node.storedOutputCount > 0) {
      this.collectAssemblerOutput(node.id);
    }
    this.kineticNodes.splice(idx, 1);
    const mesh = this.kineticMeshes.get(nodeId);
    if (mesh) {
      this.scene.remove(mesh.root);
      this.disposeObject3D(mesh.root);
      this.kineticMeshes.delete(nodeId);
    }
    if (this.targetKineticNode?.id === nodeId) {
      this.targetKineticNode = null;
    }
    this.addItem(node.kind, 1, true);
    this.sound.playGather('stone', 1);
    this.spawnParticles(node.x, node.y + 0.8, node.z, 0x94a3b8, 8);
    this.rebuildKineticNetwork(false);
    this.emitHud();
  }

  public collectAssemblerOutput(nodeId: string): void {
    const node = this.kineticNodes.find((n) => n.id === nodeId);
    if (!node || node.kind !== 'auto_assembler') return;
    if (node.storedOutputCount <= 0) {
      this.toast(
        node.active
          ? `Assembler fabricating (${Math.round(node.cycleProgress * 100)}%)...`
          : 'Feed >=12 RPM via shafts or valley belts to run Assembler!',
        'info',
      );
      return;
    }
    const kits = node.storedOutputCount;
    node.storedOutputCount = 0;
    this.addItem('vehicle_chassis_kit', kits, false);
    this.addItem('ammo', kits * 4, false);
    this.sound.playCraftSuccess();
    this.spawnParticles(node.x, node.y + 1.2, node.z, 0x22c55e, 12);
    this.toast(
      `Collected +${kits}× Modular Vehicle Kit & +${kits * 4} Gun Cartridges!`,
      'craft',
      'vehicle_chassis_kit',
      kits,
    );
    this.emitHud();
  }

  private interactKineticNode(nodeId: string): void {
    const kn = this.kineticNodes.find((n) => n.id === nodeId);
    if (!kn) return;
    if (kn.kind === 'auto_assembler') {
      if (kn.storedOutputCount > 0) {
        this.collectAssemblerOutput(kn.id);
      } else {
        this.toast(
          kn.active
            ? `Auto-Assembler running at ${Math.abs(kn.rpm)} RPM (${Math.round(kn.cycleProgress * 100)}%)`
            : 'Auto-Assembler idle — couple a Drive Shaft or Valley Belt (>=12 RPM)',
          'info',
        );
      }
      return;
    }
    const sp = KINETIC_SPECS[kn.kind];
    if (kn.kind === 'steam_boiler') {
      this.sound.playSteamHiss();
      this.toast(
        `${sp.name}: ${Math.round(kn.steamPsi)} PSI Steam · Press [X] to Dismantle`,
        'info',
      );
    } else {
      this.toast(
        `${sp.name}: ${kn.rpm >= 0 ? '+' : ''}${kn.rpm} RPM · ${kn.torque} Nm · Press [X] to Dismantle`,
        'info',
      );
    }
  }

  private updateKineticTargetProbe(): void {
    if (this.mode !== 'playing' || this.activeVehicleId) {
      this.targetKineticNode = null;
      return;
    }
    const camDirX = -Math.sin(this.camYaw) * Math.cos(this.camPitch);
    const camDirY = Math.sin(this.camPitch);
    const camDirZ = -Math.cos(this.camYaw) * Math.cos(this.camPitch);

    let best: KineticNode | null = null;
    let bestScore = 999;
    for (const kn of this.kineticNodes) {
      const dx = kn.x - this.playerX;
      const dy = kn.y + 0.9 - (this.playerY + this.currentEyeHeight);
      const dz = kn.z - this.playerZ;
      const dist = Math.hypot(dx, dy, dz);
      if (dist > 7.5) continue;
      const dot = (dx * camDirX + dy * camDirY + dz * camDirZ) / Math.max(0.01, dist);
      if (dot > 0.72 || dist < 3.4) {
        const score = dist - dot * 2.2;
        if (score < bestScore) {
          bestScore = score;
          best = kn;
        }
      }
    }
    this.targetKineticNode = best;
  }

  private updateKineticNetwork(dt: number): void {
    this.beltPhase += dt;
    this.kineticTickSoundAccum += dt;

    let anySpinningNear = false;
    for (const kn of this.kineticNodes) {
      const handles = this.kineticMeshes.get(kn.id);
      if (!handles) continue;
      const dPlayer = Math.hypot(kn.x - this.playerX, kn.z - this.playerZ);
      handles.root.visible =
        this.currentDimension === 'overworld' &&
        dPlayer <= this.effectiveMaxDrawDistance;
      if (!handles.root.visible) continue;
      if (dPlayer > 120) continue;

      const omega = (kn.rpm * Math.PI * 2) / 60;
      if (Math.abs(kn.rpm) >= 8 && dPlayer < 16) {
        anySpinningNear = true;
      }

      if (handles.primarySpinner && Math.abs(kn.rpm) > 0.2) {
        if (kn.kind === 'water_wheel' || kn.kind === 'belt_pulley') {
          handles.primarySpinner.rotation.x += omega * dt;
        } else if (kn.kind === 'auto_assembler') {
          handles.primarySpinner.rotateZ(omega * dt);
        } else {
          handles.primarySpinner.rotation.z += omega * dt;
        }
      }

      if (handles.secondarySpinner && Math.abs(kn.rpm) > 0.2) {
        handles.secondarySpinner.rotation.z -= omega * 1.38 * dt;
      }

      if (handles.pistonGroup && kn.active) {
        const strokeFreq = Math.max(2, Math.abs(omega));
        handles.pistonGroup.position.x =
          0.15 + Math.sin(this.elapsed * strokeFreq) * 0.21;
      }

      if (handles.gaugeNeedle) {
        const targetAngle = -1.2 + (THREE.MathUtils.clamp(kn.steamPsi, 0, 100) / 100) * 2.4;
        handles.gaugeNeedle.rotation.z = THREE.MathUtils.damp(
          handles.gaugeNeedle.rotation.z,
          targetAngle,
          6,
          dt,
        );
      }

      if (handles.flowGlassMat) {
        handles.flowGlassMat.emissiveIntensity = kn.active
          ? 0.35 + (kn.steamPsi / 100) * 0.7 + Math.sin(this.elapsed * 6) * 0.1
          : 0.08;
      }

      if (handles.statusLightMat) {
        if (kn.kind === 'steam_boiler') {
          handles.statusLightMat.emissiveIntensity = 0.85 + Math.sin(this.elapsed * 9) * 0.25;
        } else if (kn.active) {
          handles.statusLightMat.emissive.setHex(0x22c55e);
          handles.statusLightMat.emissiveIntensity = 0.75;
        } else if (kn.stalled) {
          handles.statusLightMat.emissive.setHex(0xef4444);
          handles.statusLightMat.emissiveIntensity = 0.45;
        } else {
          handles.statusLightMat.emissive.setHex(0x64748b);
          handles.statusLightMat.emissiveIntensity = 0.1;
        }
      }

      // Steam puff particles on pressurized boilers & active steam engines
      if (
        (kn.kind === 'steam_boiler' || (kn.kind === 'steam_engine' && kn.active)) &&
        this.mode === 'playing' &&
        Math.random() < dt * 3.5 &&
        dPlayer < 42
      ) {
        this.spawnParticles(kn.x, kn.y + (kn.kind === 'steam_boiler' ? 3.5 : 1.25), kn.z, 0xe2e8f0, 1);
      }

      // Automated Vehicle Assembler gantry animation & output fabrication
      if (kn.kind === 'auto_assembler') {
        if (handles.gantryArm) {
          handles.gantryArm.position.y = kn.active
            ? 1.95 + Math.sin(this.elapsed * 5.2) * 0.18
            : 2.02;
        }
        if (kn.active && Math.abs(kn.rpm) >= 12) {
          kn.cycleProgress += dt * (Math.abs(kn.rpm) / 250);
          if (kn.cycleProgress >= 1) {
            kn.cycleProgress -= 1;
            if (kn.storedOutputCount < 16) {
              kn.storedOutputCount += 1;
              if (dPlayer < 35) {
                this.spawnParticles(kn.x, kn.y + 1.15, kn.z, 0x38bdf8, 8);
                this.sound.playKineticGearTick();
              }
            }
          }
        }
      }
    }

    if (anySpinningNear && this.kineticTickSoundAccum >= 0.48 && this.mode === 'playing') {
      this.kineticTickSoundAccum = 0;
      this.sound.playKineticGearTick();
    }

    // Animate physical valley-crossing twin-belt cleats
    for (let bIdx = 0; bIdx < this.beltSpanMeshes.length; bIdx++) {
      const bm = this.beltSpanMeshes[bIdx];
      bm.group.visible = this.currentDimension === 'overworld';
      if (!bm.group.visible) continue;
      const link = this.beltLinks[bIdx];
      const rpm = link ? link.rpm : 0;
      const speed = Math.abs(rpm) < 4 ? 0 : (rpm / 42) * 0.28;
      const nSlats = bm.slats.length;
      for (let i = 0; i < nSlats; i++) {
        const raw = ((i / nSlats) * 2 + this.beltPhase * speed) % 2;
        const tLoop = raw < 0 ? raw + 2 : raw;
        const slat = bm.slats[i];
        if (tLoop < 1) {
          slat.position.copy(bm.startPos).addScaledVector(bm.dirVec, tLoop);
          slat.position.y += 0.23;
        } else {
          const backT = 2 - tLoop;
          slat.position.copy(bm.startPos).addScaledVector(bm.dirVec, backT);
          slat.position.y -= 0.23;
        }
      }
    }

    this.updateKineticTargetProbe();
  }

  private attachVehicleShadowDisc(vehicleId: string, root: THREE.Group): void {
    const disc = new THREE.Mesh(this.vehicleShadowGeo, this.vehicleShadowMat);
    disc.position.y = 0.05;
    disc.visible = !this.effectiveShadowsEnabled;
    disc.userData.ignoreLightingPass = true;
    root.add(disc);
    this.vehicleShadowDiscs.set(vehicleId, disc);
  }

  private extractVehicleUnderglowLight(
    vehicleId: string,
    handles: ModularVehicleMeshHandles,
  ): void {
    const ul = handles.underglowLight;
    if (ul) {
      this.vehicleUnderglowMeta.set(vehicleId, {
        localX: ul.position.x,
        localY: ul.position.y,
        localZ: ul.position.z,
        colorHex: ul.color.getHex(),
        distance: ul.distance,
        decay: ul.decay,
      });
      ul.parent?.remove(ul);
      ul.dispose();
      handles.underglowLight = undefined;
    } else {
      this.vehicleUnderglowMeta.delete(vehicleId);
    }
  }

  private spawnVehicleInstance(v: ModularVehicleData): void {
    const built = createModularVehicleMesh(v);
    this.extractVehicleUnderglowLight(v.id, built);
    built.root.position.set(v.x, v.y, v.z);
    built.root.rotation.y = v.yaw;
    for (const sw of built.steerWheels) {
      sw.rotation.order = 'YXZ';
    }
    this.attachVehicleShadowDisc(v.id, built.root);
    applyRealisticMeshLightingPass(built.root, {
      shadowsEnabled: this.effectiveShadowsEnabled,
      envMapIntensity: 1.0,
    });
    this.scene.add(built.root);
    this.prewarmSceneTextures(built.root);
    this.vehicleMeshes.set(v.id, built);
    this.vehicles.push(v);
  }

  public spawnPresetVehicle(preset: VehiclePresetKey): ModularVehicleData | null {
    const temp = createVehicleFromPreset('temp', preset, 0, 0, 0, 0);
    const kitCost = Math.max(4, Math.ceil(temp.modules.length * 0.6));
    if (this.getItemCount('vehicle_chassis_kit') < kitCost) {
      this.toast(
        `Need ${kitCost}× Modular Vehicle Kit to weld ${temp.name} (you have ${this.getItemCount('vehicle_chassis_kit')})`,
        'warning',
      );
      return null;
    }
    this.removeItem('vehicle_chassis_kit', kitCost);

    const fwdX = -Math.sin(this.camYaw);
    const fwdZ = -Math.cos(this.camYaw);
    const sx = THREE.MathUtils.clamp(this.playerX + fwdX * 6.5, -142, 142);
    const sz = THREE.MathUtils.clamp(this.playerZ + fwdZ * 6.5, -142, 142);
    const waterY = getWaterLevelAt(sx, sz);
    const groundY = getTerrainHeight(sx, sz);
    const sy = preset === 'steam_boat' ? Math.max(groundY, waterY) : groundY;
    const v = createVehicleFromPreset(
      `veh_${Date.now()}_${Math.floor(Math.random() * 999)}`,
      preset,
      sx,
      sy + 0.15,
      sz,
      this.camYaw + Math.PI,
    );
    this.spawnVehicleInstance(v);
    this.p2p?.broadcast({ type: 'vehicle_upsert', vehicle: v });
    this.sound.playWeldSnap();
    this.spawnParticles(sx, sy + 1.0, sz, 0x38bdf8, 14);
    this.toast(`Welded & deployed ${v.name} nearby!`, 'craft', 'vehicle_chassis_kit', 1);
    this.emitHud();
    return v;
  }

  public spawnOrUpdateCustomVehicle(payload: {
    id?: string;
    name: string;
    paintColor: string;
    modules: VehicleModulePlacement[];
    kitCost: number;
  }): ModularVehicleData | null {
    const cleanModules = payload.modules.map((m) => ({ ...m }));
    if (cleanModules.length === 0) return null;
    if (!cleanModules.some((m) => m.kind === 'cockpit_seat')) {
      this.toast('Every craft requires at least 1 Pilot Helm & Controls!', 'warning');
      return null;
    }
    const specs = computeVehicleSpecs(cleanModules);

    if (payload.id) {
      const existing = this.vehicles.find((v) => v.id === payload.id);
      if (existing) {
        existing.name = payload.name.trim() || existing.name;
        existing.paintColor = payload.paintColor || existing.paintColor;
        existing.modules = cleanModules;
        existing.maxHp = specs.maxHp;
        existing.hp = Math.min(specs.maxHp, Math.max(existing.hp, specs.maxHp));
        const oldMesh = this.vehicleMeshes.get(existing.id);
        if (oldMesh) {
          this.scene.remove(oldMesh.root);
          this.disposeObject3D(oldMesh.root);
        }
        const rebuilt = createModularVehicleMesh(existing);
        this.extractVehicleUnderglowLight(existing.id, rebuilt);
        rebuilt.root.position.set(existing.x, existing.y, existing.z);
        rebuilt.root.rotation.y = existing.yaw;
        for (const sw of rebuilt.steerWheels) {
          sw.rotation.order = 'YXZ';
        }
        this.attachVehicleShadowDisc(existing.id, rebuilt.root);
        applyRealisticMeshLightingPass(rebuilt.root, {
          shadowsEnabled: this.effectiveShadowsEnabled,
          envMapIntensity: 1.0,
        });
        this.scene.add(rebuilt.root);
        this.vehicleMeshes.set(existing.id, rebuilt);
        this.p2p?.broadcast({ type: 'vehicle_upsert', vehicle: existing });
        this.sound.playWeldSnap();
        this.toast(`Re-welded ${existing.name} (${specs.craftClass})!`, 'craft');
        this.emitHud();
        return existing;
      }
    }

    const cost = Math.max(2, payload.kitCost);
    if (this.getItemCount('vehicle_chassis_kit') < cost) {
      this.toast(
        `Need ${cost}× Modular Vehicle Kit to weld this craft (have ${this.getItemCount('vehicle_chassis_kit')})`,
        'warning',
      );
      return null;
    }
    this.removeItem('vehicle_chassis_kit', cost);

    const fwdX = -Math.sin(this.camYaw);
    const fwdZ = -Math.cos(this.camYaw);
    const sx = THREE.MathUtils.clamp(this.playerX + fwdX * 6.5, -142, 142);
    const sz = THREE.MathUtils.clamp(this.playerZ + fwdZ * 6.5, -142, 142);
    const sy = Math.max(
      getTerrainHeight(sx, sz),
      specs.canFloat && !specs.canFly && specs.wheelCount === 0
        ? getWaterLevelAt(sx, sz)
        : -999,
    );

    const created: ModularVehicleData = {
      id: `veh_${Date.now()}_${Math.floor(Math.random() * 999)}`,
      name: payload.name.trim() || `Custom ${specs.craftClass}`,
      paintColor: payload.paintColor || '#d97706',
      x: sx,
      y: sy + 0.15,
      z: sz,
      yaw: this.camYaw + Math.PI,
      vx: 0,
      vy: 0,
      vz: 0,
      hp: specs.maxHp,
      maxHp: specs.maxHp,
      fuel: 100,
      modules: cleanModules,
      cargoItems: [],
    };
    this.spawnVehicleInstance(created);
    this.p2p?.broadcast({ type: 'vehicle_upsert', vehicle: created });
    this.sound.playWeldSnap();
    this.spawnParticles(sx, sy + 1.0, sz, 0x38bdf8, 14);
    this.toast(`Welded ${created.name} (${specs.craftClass}) nearby!`, 'craft');
    this.emitHud();
    return created;
  }

  public summonVehicleNearby(vehicleId: string): boolean {
    const v = this.vehicles.find((x) => x.id === vehicleId);
    if (!v) return false;
    const fwdX = -Math.sin(this.camYaw);
    const fwdZ = -Math.cos(this.camYaw);
    const sx = THREE.MathUtils.clamp(this.playerX + fwdX * 5.8, -142, 142);
    const sz = THREE.MathUtils.clamp(this.playerZ + fwdZ * 5.8, -142, 142);
    const specs = this.getVehicleSpecs(v);
    const surf = Math.max(
      getTerrainHeight(sx, sz),
      this.getStructuralSurfaceY(sx, sz, this.playerY + 1.5),
    );
    v.x = sx;
    v.z = sz;
    v.y = specs.canFloat ? Math.max(surf, getWaterLevelAt(sx, sz)) : surf + 0.12;
    v.vx = 0;
    v.vy = 0;
    v.vz = 0;
    v.yaw = this.camYaw + Math.PI;
    const vh = this.vehicleMeshes.get(v.id);
    if (vh) {
      vh.root.position.set(v.x, v.y, v.z);
      vh.root.rotation.set(0, v.yaw, 0);
    }
    this.sound.playWeldSnap();
    this.spawnParticles(v.x, v.y + 0.9, v.z, 0xf59e0b, 10);
    this.toast(`Summoned ${v.name} in front of you!`, 'info');
    this.emitHud();
    return true;
  }

  public deleteVehicle(vehicleId: string): void {
    if (this.activeVehicleId === vehicleId) {
      this.exitVehicle();
    }
    this.autoParkJobs.delete(vehicleId);
    const idx = this.vehicles.findIndex((v) => v.id === vehicleId);
    if (idx === -1) return;
    const v = this.vehicles[idx];
    this.vehicles.splice(idx, 1);
    const mesh = this.vehicleMeshes.get(vehicleId);
    if (mesh) {
      this.scene.remove(mesh.root);
      this.disposeObject3D(mesh.root);
      this.vehicleMeshes.delete(vehicleId);
      this.vehicleShadowDiscs.delete(vehicleId);
    }
    for (const c of v.cargoItems) {
      this.addItem(c.itemId, c.quantity, false);
    }
    const refund = Math.max(2, Math.floor(v.modules.length * 0.5));
    this.addItem('vehicle_chassis_kit', refund, false);
    this.toast(`Salvaged ${v.name} (+${refund}× Vehicle Kits)`, 'info');
    this.emitHud();
  }

  public enterVehicle(vehicleId: string): boolean {
    const v = this.vehicles.find((x) => x.id === vehicleId);
    if (!v) return false;
    if (this.activeVehicleId && this.activeVehicleId !== vehicleId) {
      this.exitVehicle();
    }
    this.autoParkJobs.delete(vehicleId);
    this.seatedState = null;
    this.activeVehicleId = v.id;
    this.vehicleForwardSpeed = 0;
    this.vehicleSteerAngle = 0;
    this.vehicleAltitudeVel = 0;
    this.vehicleAscendHold = false;
    this.vehicleDescendHold = false;
    this.hydraulicMode = 'level';
    this.hydCorners = { fl: 0, fr: 0, rl: 0, rr: 0 };
    this.hydVel = { fl: 0, fr: 0, rl: 0, rr: 0 };
    this.trunkBassPulse = 0;
    this.chestThumpPulse = 0;
    this.vehicleInteriorCamera = false;
    CABIN_BASS_AND_FIRST_PERSON.setCameraMode('CHASE');
    const radioDesc = this.toRadioCarDescriptor(v);
    CAR_RADIO_TRUNK_SYSTEM.configureForCar(radioDesc);
    CABIN_BASS_AND_FIRST_PERSON.applyVehicleRadioProfile(radioDesc);
    this.isCrouching = false;
    this.touchCrouch = false;
    this.camYaw = v.yaw - Math.PI;
    this.camPitch = -0.18;
    const specs = this.getVehicleSpecs(v);
    this.sound.playSteamHiss();
    const extraHint =
      v.preset === 'donk'
        ? ' · [Space/Z/Q/R] Hydraulics (Up / Down / Side-to-Side)'
        : this.vehicleHasHydraulics(v)
          ? ' · [Space/Z/Q/R/X] High-Bounce 2-Wheel Hydraulics'
          : this.isOldSchoolVehicle(v)
            ? ' · [T] Trunk Bass · [B] Car Radio'
            : ' · [B] Car Radio';
    this.toast(
      `Piloting ${v.name} (${specs.craftClass}) · WASD Drive${extraHint} · [V] 1st-Person · [E] Exit · [F] Cargo`,
      'discovery',
    );
    this.emitHud();
    return true;
  }

  private toRadioCarDescriptor(v?: ModularVehicleData | null): RadioCarDescriptor {
    if (!v) return {};
    return {
      id: v.id,
      name: v.name,
      preset: v.preset,
      class: v.preset === 'sports_car' ? 'Modern Exotic' : v.preset,
      style: v.preset,
      hasTrunkBass:
        v.preset === 'slab' ||
        v.preset === 'lowrider' ||
        v.preset === 'donk' ||
        v.preset === 'cadillac_coupe_deville' ||
        v.preset === 'chevy_tahoe' ||
        v.preset === 'chevy_2000_sub',
    };
  }

  private isOldSchoolVehicle(v?: ModularVehicleData | null): boolean {
    if (!v) return false;
    return CAR_RADIO_TRUNK_SYSTEM.isOldSchoolCar(this.toRadioCarDescriptor(v));
  }

  private isDonkHydraulicVehicle(v?: ModularVehicleData | null): boolean {
    return Boolean(v && v.preset === 'donk');
  }

  private isAirbagVehicle(v?: ModularVehicleData | null): boolean {
    return Boolean(
      v &&
        (v.hasAirbagSuspension ||
          v.preset === 'cadillac_coupe_deville' ||
          v.preset === 'chevy_tahoe' ||
          v.preset === 'chevy_2000_sub'),
    );
  }

  private vehicleHasHydraulics(v?: ModularVehicleData | null): boolean {
    return Boolean(
      v &&
        (v.hydraulicHop ||
          v.hasAirbagSuspension ||
          v.preset === 'lowrider' ||
          v.preset === 'donk' ||
          v.preset === 'cadillac_coupe_deville' ||
          v.preset === 'chevy_tahoe' ||
          v.preset === 'chevy_2000_sub'),
    );
  }

  private resolveGarageSlot(v: ModularVehicleData): {
    x: number;
    z: number;
    yaw: number;
    label: string;
  } {
    const slots = [
      { x: VEHICLE_GARAGE_POS.x - 9.0, z: VEHICLE_GARAGE_POS.z + 0.6, yaw: 0, label: 'Bay A' },
      { x: VEHICLE_GARAGE_POS.x - 3.0, z: VEHICLE_GARAGE_POS.z + 0.6, yaw: 0, label: 'Bay B' },
      { x: VEHICLE_GARAGE_POS.x + 3.0, z: VEHICLE_GARAGE_POS.z + 0.6, yaw: 0, label: 'Bay C' },
      { x: VEHICLE_GARAGE_POS.x + 9.0, z: VEHICLE_GARAGE_POS.z + 0.6, yaw: 0, label: 'Bay D' },
      { x: VEHICLE_GARAGE_POS.x + 16.0, z: VEHICLE_GARAGE_POS.z + 5.2, yaw: 0, label: 'East Apron' },
      { x: VEHICLE_GARAGE_POS.x - 16.0, z: VEHICLE_GARAGE_POS.z + 5.2, yaw: 0, label: 'West Apron' },
    ];
    let preferredIdx = 4;
    if (v.id === 'veh_starter_lowrider' || v.preset === 'lowrider') preferredIdx = 0;
    else if (v.id === 'veh_starter_donk' || v.preset === 'donk') preferredIdx = 1;
    else if (v.id === 'veh_starter_slab' || v.preset === 'slab') preferredIdx = 2;
    else if (v.id === 'veh_starter_deville' || v.preset === 'cadillac_coupe_deville') preferredIdx = 3;
    else if (v.id === 'veh_starter_rover' || v.preset === 'expedition_rover') preferredIdx = 4;
    else if (
      v.id === 'veh_starter_tahoe' ||
      v.preset === 'chevy_tahoe' ||
      v.preset === 'chevy_2000_sub'
    )
      preferredIdx = 5;

    const isOccupied = (slot: { x: number; z: number }) =>
      this.vehicles.some(
        (other) =>
          other.id !== v.id && Math.hypot(other.x - slot.x, other.z - slot.z) < 2.8,
      );

    if (!isOccupied(slots[preferredIdx])) {
      return slots[preferredIdx];
    }
    for (const s of slots) {
      if (!isOccupied(s)) return s;
    }
    return slots[preferredIdx];
  }

  public exitVehicle(): void {
    if (!this.activeVehicleId) return;
    const v = this.vehicles.find((x) => x.id === this.activeVehicleId);
    const exitSpeed = this.vehicleForwardSpeed;
    this.activeVehicleId = null;
    this.vehicleInteriorCamera = false;
    CABIN_BASS_AND_FIRST_PERSON.setCameraMode('CHASE');
    this.vehicleForwardSpeed = 0;
    this.vehicleAltitudeVel = 0;
    this.vehicleAscendHold = false;
    this.vehicleDescendHold = false;
    this.joyX = 0;
    this.joyY = 0;
    this.touchSprint = false;
    this.vehicleVisualPitch = 0;
    this.vehicleVisualRoll = 0;
    this.gamepadGas = 0;
    this.gamepadBrake = 0;
    this.gamepadHandbrake = false;
    this.hydraulicMode = 'level';
    this.hydCorners = { fl: 0, fr: 0, rl: 0, rr: 0 };
    this.hydVel = { fl: 0, fr: 0, rl: 0, rr: 0 };
    this.trunkBassPulse = 0;
    this.chestThumpPulse = 0;
    this.sound.stopTrunkBass();
    try {
      if (typeof document !== 'undefined' && document.pointerLockElement) {
        document.exitPointerLock();
      }
    } catch {
      // Ignore pointer lock release errors
    }

    if (v) {
      const sideX = Math.cos(v.yaw);
      const sideZ = -Math.sin(v.yaw);
      this.playerX = v.x + sideX * 2.5;
      this.playerZ = v.z + sideZ * 2.5;
      this.playerY = Math.max(
        getTerrainHeight(this.playerX, this.playerZ),
        this.getStructuralSurfaceY(this.playerX, this.playerZ, v.y + 1.5),
      );
      this.playerVelY = 0;
      this.grounded = true;
      this.camStepOffsetY = 0;
      this.camBobBlend = 0;
      this.wallTiltAngle = 0;
      this.camPitch = THREE.MathUtils.clamp(this.camPitch, -1.25, 1.25);
      this.playerYaw = this.camYaw + Math.PI;
      this.camera.rotation.order = 'YXZ';
      this.camera.up.set(0, 1, 0);

      const specs = this.getVehicleSpecs(v);
      const isPureWatercraft =
        specs.canFloat && !specs.canFly && specs.wheelCount === 0;
      if (!isPureWatercraft) {
        const slot = this.resolveGarageSlot(v);
        const distToSlot = Math.hypot(v.x - slot.x, v.z - slot.z);
        if (distToSlot <= 1.65) {
          v.x = slot.x;
          v.z = slot.z;
          v.y = getTerrainHeight(v.x, v.z) + 0.14;
          v.vx = 0;
          v.vy = 0;
          v.vz = 0;
          v.yaw = slot.yaw;
          const vh = this.vehicleMeshes.get(v.id);
          if (vh) {
            vh.root.position.set(v.x, v.y, v.z);
            vh.root.rotation.set(0, v.yaw, 0);
            vh.chassisGroup.rotation.set(0, 0, 0);
            for (const wc of vh.wheelCorners) {
              wc.obj.position.y = wc.baseY;
            }
          }
          const shadowDisc = this.vehicleShadowDiscs.get(v.id);
          if (shadowDisc) {
            shadowDisc.position.y = 0.05;
            shadowDisc.scale.set(1, 1, 1);
          }
          this.p2p?.broadcast({ type: 'vehicle_upsert', vehicle: v });
          this.toast(`Exited ${v.name} (Garage ${slot.label})`, 'info');
        } else {
          const alreadyInGarageCorridor =
            Math.abs(v.x - VEHICLE_GARAGE_POS.x) <= 15 &&
            v.z >= VEHICLE_GARAGE_POS.z - 5 &&
            v.z <= VEHICLE_GARAGE_POS.z + 10.5;
          this.autoParkJobs.set(v.id, {
            vehicleId: v.id,
            targetX: slot.x,
            targetZ: slot.z,
            targetYaw: slot.yaw,
            bayLabel: slot.label,
            phase: alreadyInGarageCorridor ? 'park' : 'approach',
            speed: THREE.MathUtils.clamp(exitSpeed * 0.45, -3, 6),
            steerAngle: 0,
            pitchAngle: 0,
            elapsed: 0,
            stuckTimer: 0,
            lastProgressX: v.x,
            lastProgressZ: v.z,
          });
          this.sound.playSteamHiss();
          this.toast(
            `Exited ${v.name} — auto-driving to Garage ${slot.label}!`,
            'info',
          );
        }
      } else {
        this.toast(`Exited ${v.name}`, 'info');
      }
    }
    this.emitHud();
  }

  public triggerHydraulicAction(
    action:
      | 'front_hop'
      | 'rear_hop'
      | 'left_tilt'
      | 'right_tilt'
      | 'lock_up'
      | 'drop'
      | 'front_lock'
      | 'rear_lock'
      | 'side_to_side'
      | 'coil_bounce',
  ): void {
    if (!this.activeVehicleId || this.mode !== 'playing' || this.gameOver) return;
    const av = this.vehicles.find((v) => v.id === this.activeVehicleId);
    if (!av || !this.vehicleHasHydraulics(av)) return;

    this.sound.unlock();
    const isDonk = this.isDonkHydraulicVehicle(av);
    const isAirbag = this.isAirbagVehicle(av);

    // Cadillac Coupe DeVille Airbag + Coil-Over Spring Suspension
    if (isAirbag) {
      const speed = THREE.MathUtils.clamp(av.airbagSpeed ?? 1.0, 0.25, 2.0);
      const lock = THREE.MathUtils.clamp(av.airbagLockLevel ?? 1.0, 0.4, 1.4);
      const impulse = (3.4 + speed * 4.4) * lock;
      const floorY = Math.max(
        getTerrainHeight(av.x, av.z),
        this.getStructuralSurfaceY(av.x, av.z, av.y + 0.8),
      );
      const nearGround = av.y <= floorY + 1.15;

      if (action === 'coil_bounce' || action === 'front_hop') {
        this.hydraulicMode = 'front_hop';
        this.hydVel.fl = impulse * 1.45;
        this.hydVel.fr = impulse * 1.45;
        this.hydVel.rl = Math.min(this.hydVel.rl, -1.8 * lock);
        this.hydVel.rr = Math.min(this.hydVel.rr, -1.8 * lock);
        if (nearGround && speed >= 0.85) {
          const hopVy = THREE.MathUtils.clamp(3.6 + speed * 3.1 * lock, 4.0, 9.4);
          av.vy = av.y <= floorY + 0.35 ? hopVy : Math.min(9.6, Math.max(av.vy + 3.2, hopVy));
        }
        this.hydraulicBounceTimer = 0.52;
        this.sound.playAirbagHiss(speed, true);
        this.spawnParticles(av.x, av.y + 0.25, av.z, 0xe2e8f0, 7);
      } else if (action === 'front_lock') {
        this.hydraulicMode = this.hydraulicMode === 'front_lock' ? 'level' : 'front_lock';
        if (this.hydraulicMode === 'front_lock') {
          this.hydVel.fl += impulse * 0.72;
          this.hydVel.fr += impulse * 0.72;
        }
        this.sound.playAirbagHiss(speed, false);
      } else if (action === 'rear_lock' || action === 'rear_hop') {
        this.hydraulicMode = this.hydraulicMode === 'rear_lock' ? 'level' : 'rear_lock';
        if (this.hydraulicMode === 'rear_lock') {
          this.hydVel.rl += impulse * 0.72;
          this.hydVel.rr += impulse * 0.72;
        }
        this.sound.playAirbagHiss(speed, false);
      } else if (action === 'left_tilt') {
        this.hydraulicMode = this.hydraulicMode === 'left_tilt' ? 'level' : 'left_tilt';
        if (this.hydraulicMode === 'left_tilt') {
          this.hydVel.fl += impulse * 0.65;
          this.hydVel.rl += impulse * 0.65;
        }
        this.sound.playAirbagHiss(speed, false);
      } else if (action === 'right_tilt') {
        this.hydraulicMode = this.hydraulicMode === 'right_tilt' ? 'level' : 'right_tilt';
        if (this.hydraulicMode === 'right_tilt') {
          this.hydVel.fr += impulse * 0.65;
          this.hydVel.rr += impulse * 0.65;
        }
        this.sound.playAirbagHiss(speed, false);
      } else if (action === 'side_to_side') {
        this.hydraulicMode = this.hydraulicMode === 'side_to_side' ? 'level' : 'side_to_side';
        this.sound.playAirbagHiss(speed, false);
      } else if (action === 'lock_up') {
        this.hydraulicMode = this.hydraulicMode === 'lock_up' ? 'level' : 'lock_up';
        if (this.hydraulicMode === 'lock_up') {
          this.hydVel.fl += impulse * 0.62;
          this.hydVel.fr += impulse * 0.62;
          this.hydVel.rl += impulse * 0.62;
          this.hydVel.rr += impulse * 0.62;
        }
        this.sound.playAirbagHiss(speed, false);
      } else {
        this.hydraulicMode = this.hydraulicMode === 'drop_down' ? 'level' : 'drop_down';
        if (this.hydraulicMode === 'drop_down') {
          this.hydVel.fl -= impulse * 0.45;
          this.hydVel.fr -= impulse * 0.45;
          this.hydVel.rl -= impulse * 0.45;
          this.hydVel.rr -= impulse * 0.45;
        }
        this.sound.playAirbagHiss(speed, false);
      }
      this.emitHud();
      return;
    }

    // DONK hydraulics can ONLY go Up, Down, and Side-to-Side (no wheelie hops or leaving ground)
    if (isDonk) {
      if (action === 'front_hop' || action === 'lock_up') {
        this.hydraulicMode = this.hydraulicMode === 'lock_up' ? 'level' : 'lock_up';
        if (this.hydraulicMode === 'lock_up') {
          this.hydVel.fl += 3.6;
          this.hydVel.fr += 3.6;
          this.hydVel.rl += 3.6;
          this.hydVel.rr += 3.6;
        }
        this.sound.playHydraulicHop('lock');
      } else if (action === 'rear_hop' || action === 'drop') {
        this.hydraulicMode = this.hydraulicMode === 'drop_down' ? 'level' : 'drop_down';
        if (this.hydraulicMode === 'drop_down') {
          this.hydVel.fl -= 3.2;
          this.hydVel.fr -= 3.2;
          this.hydVel.rl -= 3.2;
          this.hydVel.rr -= 3.2;
        }
        this.sound.playHydraulicHop('tilt');
      } else if (action === 'left_tilt') {
        this.hydraulicMode = this.hydraulicMode === 'left_tilt' ? 'level' : 'left_tilt';
        this.sound.playHydraulicHop('tilt');
      } else if (action === 'right_tilt') {
        this.hydraulicMode = this.hydraulicMode === 'right_tilt' ? 'level' : 'right_tilt';
        this.sound.playHydraulicHop('tilt');
      }
      this.emitHud();
      return;
    }

    // Lowrider & custom hydraulic builds: bounce high above the ground with two wheels coming off the ground
    const floorY = Math.max(
      getTerrainHeight(av.x, av.z),
      this.getStructuralSurfaceY(av.x, av.z, av.y + 0.8),
    );
    const nearGround = av.y <= floorY + 1.15;

    if (action === 'front_hop' || action === 'coil_bounce') {
      this.hydraulicMode = 'front_hop';
      this.hydVel.fl = 15.5;
      this.hydVel.fr = 15.5;
      this.hydVel.rl = Math.min(this.hydVel.rl, -2.4);
      this.hydVel.rr = Math.min(this.hydVel.rr, -2.4);
      if (nearGround) {
        av.vy = av.y <= floorY + 0.35 ? 7.8 : Math.min(9.6, Math.max(av.vy + 4.4, 7.2));
      }
      this.hydraulicBounceTimer = 0.55;
      this.sound.playHydraulicHop('hop');
      this.spawnParticles(av.x, av.y + 0.35, av.z, 0xfbbf24, 9);
    } else if (action === 'rear_hop' || action === 'rear_lock') {
      this.hydraulicMode = 'rear_hop';
      this.hydVel.rl = 15.5;
      this.hydVel.rr = 15.5;
      this.hydVel.fl = Math.min(this.hydVel.fl, -2.4);
      this.hydVel.fr = Math.min(this.hydVel.fr, -2.4);
      if (nearGround) {
        av.vy = av.y <= floorY + 0.35 ? 7.4 : Math.min(9.2, Math.max(av.vy + 4.2, 6.8));
      }
      this.hydraulicBounceTimer = 0.55;
      this.sound.playHydraulicHop('hop');
      this.spawnParticles(av.x, av.y + 0.35, av.z, 0xfbbf24, 9);
    } else if (action === 'left_tilt') {
      this.hydraulicMode = this.hydraulicMode === 'left_tilt' ? 'level' : 'left_tilt';
      if (this.hydraulicMode === 'left_tilt') {
        this.hydVel.fr += 6.2;
        this.hydVel.rr += 6.2;
      }
      this.sound.playHydraulicHop('tilt');
    } else if (action === 'right_tilt') {
      this.hydraulicMode = this.hydraulicMode === 'right_tilt' ? 'level' : 'right_tilt';
      if (this.hydraulicMode === 'right_tilt') {
        this.hydVel.fl += 6.2;
        this.hydVel.rl += 6.2;
      }
      this.sound.playHydraulicHop('tilt');
    } else if (action === 'lock_up' || action === 'front_lock') {
      this.hydraulicMode = this.hydraulicMode === 'lock_up' ? 'level' : 'lock_up';
      if (this.hydraulicMode === 'lock_up') {
        this.hydVel.fl += 4.6;
        this.hydVel.fr += 4.6;
        this.hydVel.rl += 4.6;
        this.hydVel.rr += 4.6;
      }
      this.sound.playHydraulicHop('lock');
    } else {
      this.hydraulicMode = this.hydraulicMode === 'drop_down' ? 'level' : 'drop_down';
      this.sound.playHydraulicHop('tilt');
    }
    this.emitHud();
  }

  public toggleVehicleDoors(vehicleId?: string): void {
    const target = vehicleId
      ? this.vehicles.find((x) => x.id === vehicleId)
      : this.activeVehicleId
        ? this.vehicles.find((x) => x.id === this.activeVehicleId)
        : this.vehicles
            .map((v) => ({ v, d: Math.hypot(v.x - this.playerX, v.z - this.playerZ) }))
            .filter((item) => item.d <= 6.2)
            .sort((a, b) => a.d - b.d)[0]?.v;
    if (!target) return;
    this.sound.unlock();
    target.doorsOpen = !target.doorsOpen;
    this.sound.playCarDoorLatch(Boolean(target.doorsOpen));
    this.toast(
      target.doorsOpen
        ? `${target.name}: Doors Opened — Inspect Interior`
        : `${target.name}: Doors Closed`,
      'info',
    );
    this.emitHud();
  }

  public toggleVehicleTrunk(vehicleId?: string): void {
    const target = vehicleId
      ? this.vehicles.find((x) => x.id === vehicleId)
      : this.activeVehicleId
        ? this.vehicles.find((x) => x.id === this.activeVehicleId)
        : this.vehicles
            .map((v) => ({ v, d: Math.hypot(v.x - this.playerX, v.z - this.playerZ) }))
            .filter((item) => item.d <= 6.2)
            .sort((a, b) => a.d - b.d)[0]?.v;
    if (!target) return;
    this.sound.unlock();
    target.trunkOpen = !target.trunkOpen;
    this.sound.playCarDoorLatch(Boolean(target.trunkOpen));
    this.toast(
      target.trunkOpen
        ? this.isAirbagVehicle(target)
          ? `${target.name}: Trunk Popped — Airbag Speed & Lock-Up Tuner Unlocked!`
          : `${target.name}: Trunk Popped Open`
        : `${target.name}: Trunk Closed`,
      target.trunkOpen ? 'discovery' : 'info',
    );
    this.emitHud();
  }

  public toggleVehicleInteriorCamera(): void {
    if (!this.activeVehicleId) return;
    const mode = CABIN_BASS_AND_FIRST_PERSON.toggleCameraMode();
    this.vehicleInteriorCamera = mode === 'FIRST_PERSON';
    this.toast(
      this.vehicleInteriorCamera
        ? '1st-Person Driver View ON — Interior Cabin & Steering Active'
        : 'Outside Chase Camera ON',
      'info',
    );
    this.emitHud();
  }

  public setVehicleCameraMode(mode: DrivingCameraMode): void {
    if (!this.activeVehicleId) return;
    const next = CABIN_BASS_AND_FIRST_PERSON.setCameraMode(mode);
    this.vehicleInteriorCamera = next === 'FIRST_PERSON';
    this.emitHud();
  }

  public openCarRadio(): void {
    if (!this.activeVehicleId) return;
    const av = this.vehicles.find((v) => v.id === this.activeVehicleId);
    if (av) {
      const desc = this.toRadioCarDescriptor(av);
      CAR_RADIO_TRUNK_SYSTEM.configureForCar(desc);
      CABIN_BASS_AND_FIRST_PERSON.applyVehicleRadioProfile(desc);
    }
    this.callbacks.onOpenStation('car_radio', this.activeVehicleId);
    this.emitHud();
  }

  public toggleConvertibleTop(vehicleId?: string): void {
    const targetId = vehicleId ?? this.activeVehicleId;
    if (!targetId) return;
    const av = this.vehicles.find((x) => x.id === targetId);
    if (!av || (!av.hasConvertibleTop && av.preset !== 'cadillac_coupe_deville')) return;
    this.sound.unlock();
    av.convertibleTopDown = !av.convertibleTopDown;
    this.droptopButtonPressTimer = 0.28;
    this.sound.playConvertibleMotor();
    this.toast(
      av.convertibleTopDown
        ? 'Interior Droptop Switch Pressed — Folding Black Soft-Top Down!'
        : 'Interior Droptop Switch Pressed — Raising Black Soft-Top Up!',
      'discovery',
    );
    this.emitHud();
  }

  public setAirbagSpeed(speed: number): void {
    if (!this.activeVehicleId) return;
    const av = this.vehicles.find((x) => x.id === this.activeVehicleId);
    if (!av || !this.isAirbagVehicle(av)) return;
    if (!av.trunkOpen) {
      this.toast('Pop the trunk open first to adjust Airbag Speed!', 'warning');
      return;
    }
    this.sound.unlock();
    av.airbagSpeed = THREE.MathUtils.clamp(speed, 0.25, 2.0);
    this.sound.playAirbagHiss(av.airbagSpeed, false);
    this.emitHud();
  }

  public setAirbagLockLevel(level: number): void {
    if (!this.activeVehicleId) return;
    const av = this.vehicles.find((x) => x.id === this.activeVehicleId);
    if (!av || !this.isAirbagVehicle(av)) return;
    if (!av.trunkOpen) {
      this.toast('Pop the trunk open first to adjust Airbag Lock-Up!', 'warning');
      return;
    }
    av.airbagLockLevel = THREE.MathUtils.clamp(level, 0.4, 1.4);
    this.emitHud();
  }

  public toggleTrunkBass(): void {
    if (!this.activeVehicleId) return;
    const av = this.vehicles.find((v) => v.id === this.activeVehicleId);
    if (!av || !this.isOldSchoolVehicle(av)) return;
    this.sound.unlock();
    av.trunkBassEnabled = !av.trunkBassEnabled;
    if (!av.trunkBassEnabled) {
      this.sound.stopTrunkBass();
      this.trunkBassPulse = 0;
      this.chestThumpPulse = 0;
    } else {
      this.sound.playPickup();
    }
    this.toast(
      av.trunkBassEnabled
        ? 'Subwoofers ON — Behind-Driver 808 Bass Active!'
        : 'Subwoofers OFF',
      av.trunkBassEnabled ? 'discovery' : 'info',
    );
    this.emitHud();
  }

  public setVehicleRimLightMode(
    mode: 'off' | 'solid' | 'blink' | 'music',
    vehicleId?: string,
  ): void {
    const targetId = vehicleId ?? this.activeVehicleId;
    if (!targetId) return;
    const av = this.vehicles.find((x) => x.id === targetId);
    if (!av) return;
    this.sound.unlock();
    av.rimLightMode = mode;
    if (mode !== 'off') {
      av.underglowEnabled = true;
    }
    if (mode === 'music' && !av.trunkBassEnabled && !CABIN_BASS_AND_FIRST_PERSON.stereoPlaying) {
      av.trunkBassEnabled = true;
    }
    this.rimLightButtonPressTimer = 0.24;
    this.sound.playPickup();
    const labelMap: Record<'off' | 'solid' | 'blink' | 'music', string> = {
      solid: '40" Forgiato Rim Lights & Underglow: SOLID LIT',
      blink: '40" Forgiato Rim Lights & Underglow: BLINKING',
      music: '40" Forgiato Rim Lights & Underglow: SYNCED TO MUSIC',
      off: '40" Forgiato Rim Lights: OFF',
    };
    this.toast(labelMap[mode], mode === 'off' ? 'info' : 'discovery');
    this.emitHud();
  }

  public cycleVehicleRimLights(vehicleId?: string): void {
    const targetId = vehicleId ?? this.activeVehicleId;
    if (!targetId) return;
    const av = this.vehicles.find((x) => x.id === targetId);
    if (!av) return;
    const order: ('solid' | 'blink' | 'music' | 'off')[] = [
      'solid',
      'blink',
      'music',
      'off',
    ];
    const current = av.rimLightMode ?? 'off';
    const nextIdx = (order.indexOf(current) + 1) % order.length;
    this.setVehicleRimLightMode(order[nextIdx], targetId);
  }

  public toggleVehicleUnderglow(vehicleId?: string): void {
    const targetId = vehicleId ?? this.activeVehicleId;
    if (!targetId) return;
    const av = this.vehicles.find((x) => x.id === targetId);
    if (!av) return;
    this.sound.unlock();
    av.underglowEnabled = av.underglowEnabled === false;
    this.sound.playPickup();
    this.toast(
      av.underglowEnabled ? 'Undercarriage Glow ON' : 'Undercarriage Glow OFF',
      av.underglowEnabled ? 'discovery' : 'info',
    );
    this.emitHud();
  }

  public setVehicleHydraulicsDance(
    enabled: boolean,
    vehicleId?: string,
  ): void {
    const targetId = vehicleId ?? this.activeVehicleId;
    if (!targetId) return;
    const av = this.vehicles.find((x) => x.id === targetId);
    if (!av || !this.vehicleHasHydraulics(av)) return;
    this.sound.unlock();
    av.hydraulicsDanceEnabled = enabled;
    let dance = this.vehicleDanceStates.get(av.id);
    if (!dance) {
      dance = createGarageDanceState();
      this.vehicleDanceStates.set(av.id, dance);
    }
    dance.enabled = enabled;
    if (!enabled) {
      dance.bassPulse = 0;
      const vh = this.vehicleMeshes.get(av.id);
      if (vh) {
        const isTahoeShow =
          av.preset === 'chevy_tahoe' || av.preset === 'chevy_2000_sub';
        const baseBodyY = isTahoeShow
          ? Math.max(0.075, 0.38 + (av.suspensionOffset ?? -0.3))
          : Math.max(0.26, 0.38 + (av.suspensionOffset ?? 0));
        stepGarageHydraulicsDance(
          {
            bodyGroup: vh.chassisGroup,
            subCones: vh.subwooferCones ?? [],
          },
          dance,
          0,
          baseBodyY,
        );
      }
    } else if (this.isOldSchoolVehicle(av) && !av.trunkBassEnabled) {
      av.trunkBassEnabled = true;
    }
    this.sound.playHydraulicHop(enabled ? 'hop' : 'tilt');
    this.toast(
      enabled
        ? `${av.name}: Hydraulics Dance Mode ON!`
        : `${av.name}: Hydraulics Dance Mode OFF`,
      enabled ? 'discovery' : 'info',
    );
    this.emitHud();
  }

  public toggleVehicleHydraulicsDance(vehicleId?: string): void {
    const targetId = vehicleId ?? this.activeVehicleId;
    if (!targetId) return;
    const av = this.vehicles.find((x) => x.id === targetId);
    if (!av) return;
    this.setVehicleHydraulicsDance(!av.hydraulicsDanceEnabled, targetId);
  }

  public toggleVehicleSlamLift(vehicleId?: string): void {
    const targetId = vehicleId ?? this.activeVehicleId;
    if (!targetId) return;
    const av = this.vehicles.find((x) => x.id === targetId);
    if (!av) return;
    this.sound.unlock();
    this.liftButtonPressTimer = 0.26;
    const speed = THREE.MathUtils.clamp(av.airbagSpeed ?? 1.0, 0.25, 2.0);
    if (this.activeVehicleId === targetId && this.vehicleHasHydraulics(av)) {
      if (this.hydraulicMode === 'lock_up') {
        this.hydraulicMode = 'level';
        this.sound.playAirbagHiss(speed, false);
        this.toast(`${av.name}: Dropped to 3" Slammed Stance`, 'info');
      } else {
        this.hydraulicMode = 'lock_up';
        this.hydVel.fl += 4.2;
        this.hydVel.fr += 4.2;
        this.hydVel.rl += 4.2;
        this.hydVel.rr += 4.2;
        this.sound.playAirbagHiss(speed, true);
        this.toast(`${av.name}: Lifted Up Off 3" Slammed Stance!`, 'discovery');
      }
    } else {
      const currentlySlammed = (av.suspensionOffset ?? 0) <= -0.2;
      av.suspensionOffset = currentlySlammed ? 0.22 : -0.3;
      this.sound.playAirbagHiss(speed, !currentlySlammed);
      this.toast(
        currentlySlammed
          ? `${av.name}: Air-Ride Lifted!`
          : `${av.name}: Slammed 3 Inches Off Ground!`,
        'discovery',
      );
    }
    this.emitHud();
  }

  public setVehicleVerticalHold(dir: 'up' | 'down' | null): void {
    this.vehicleAscendHold = dir === 'up';
    this.vehicleDescendHold = dir === 'down';
  }

  public openVehicleCargo(vehicleId: string): void {
    this.selectedCargoVehicleId = vehicleId;
    this.callbacks.onOpenStation('vehicle_cargo', vehicleId);
    this.emitHud();
  }

  public transferToVehicleCargo(
    vehicleId: string,
    itemId: ItemId,
    qty = 1,
  ): void {
    const v = this.vehicles.find((x) => x.id === vehicleId);
    if (!v) return;
    const specs = computeVehicleSpecs(v.modules);
    const used = v.cargoItems.reduce((s, c) => s + c.quantity, 0);
    if (used + qty > specs.cargoCapacity * 20) {
      this.toast('Vehicle cargo racks are full! Weld more Cargo Locker Units.', 'warning');
      return;
    }
    if (!this.removeItem(itemId, qty)) return;
    const existing = v.cargoItems.find((c) => c.itemId === itemId);
    if (existing) existing.quantity += qty;
    else v.cargoItems.push({ itemId, quantity: qty });
    this.sound.playPickup();
    this.emitHud();
  }

  public transferFromVehicleCargo(
    vehicleId: string,
    itemId: ItemId,
    qty = 1,
  ): void {
    const v = this.vehicles.find((x) => x.id === vehicleId);
    if (!v) return;
    const idx = v.cargoItems.findIndex((c) => c.itemId === itemId);
    if (idx === -1) return;
    const take = Math.min(qty, v.cargoItems[idx].quantity);
    v.cargoItems[idx].quantity -= take;
    if (v.cargoItems[idx].quantity <= 0) v.cargoItems.splice(idx, 1);
    this.addItem(itemId, take, false);
    this.sound.playPickup();
    this.emitHud();
  }

  public refuelVehicle(vehicleId: string): boolean {
    const v = this.vehicles.find((x) => x.id === vehicleId);
    if (!v) return false;
    if (v.fuel >= 99) {
      this.toast('Boiler fuel tank is already full!', 'info');
      return false;
    }
    if (this.removeItem('wood', 1) || this.removeItem('branch', 2)) {
      v.fuel = Math.min(100, v.fuel + 45);
      this.sound.playSteamHiss();
      this.toast(`Stoked ${v.name} boiler (+45% Fuel)`, 'craft');
      this.emitHud();
      return true;
    }
    this.toast('Need 1× Wood or 2× Branches to stoke vehicle boiler!', 'warning');
    return false;
  }

  public repairVehicle(vehicleId: string): boolean {
    const v = this.vehicles.find((x) => x.id === vehicleId);
    if (!v) return false;
    if (v.hp >= v.maxHp) {
      this.toast('Craft hull is already at 100% integrity', 'info');
      return false;
    }
    if (this.removeItem('vehicle_chassis_kit', 1) || this.removeItem('stone', 2)) {
      v.hp = Math.min(v.maxHp, v.hp + 120);
      this.sound.playWeldSnap();
      this.toast(`Repaired ${v.name} hull (${Math.round(v.hp)}/${v.maxHp} HP)`, 'craft');
      this.emitHud();
      return true;
    }
    this.toast('Need 1× Vehicle Kit or 2× Stone to repair hull', 'warning');
    return false;
  }

  private updateActiveVehicleControl(dt: number): void {
    const v = this.vehicles.find((x) => x.id === this.activeVehicleId);
    if (!v) {
      this.activeVehicleId = null;
      return;
    }
    const specs = this.getVehicleSpecs(v);

    let moveRight = 0;
    let moveForward = 0;
    if (this.keys['KeyW'] || this.keys['key_w'] || this.keys['ArrowUp']) moveForward += 1;
    if (this.keys['KeyS'] || this.keys['key_s'] || this.keys['ArrowDown']) moveForward -= 1;
    if (this.keys['KeyD'] || this.keys['key_d'] || this.keys['ArrowRight']) moveRight += 1;
    if (this.keys['KeyA'] || this.keys['key_a'] || this.keys['ArrowLeft']) moveRight -= 1;
    moveRight += this.joyX;
    moveForward += this.joyY + this.gamepadGas - this.gamepadBrake;
    moveForward = THREE.MathUtils.clamp(moveForward, -1, 1);
    moveRight = THREE.MathUtils.clamp(moveRight, -1, 1);

    const boosting =
      Boolean(
        this.keys['ShiftLeft'] ||
          this.keys['ShiftRight'] ||
          this.keys['key_shift'] ||
          this.touchSprint,
      ) && v.fuel > 0.5;
    const fuelMult = v.fuel > 1 ? 1.0 : 0.42;
    const boostMult = boosting ? 1.32 : 1.0;

    if (Math.abs(moveForward) > 0.1 && v.fuel > 0) {
      v.fuel = Math.max(0, v.fuel - dt * (boosting ? 0.55 : 0.22));
    }

    const surfY = Math.max(
      getTerrainHeight(v.x, v.z),
      this.getStructuralSurfaceY(v.x, v.z, v.y + 0.8),
    );
    const waterY = getWaterLevelAt(v.x, v.z);
    const isHighClearance =
      v.preset === 'donk' ||
      ((v.suspensionOffset ?? 0) >= 0.32 && (v.wheelScale ?? 1) >= 1.3);
    const hasHyd = this.vehicleHasHydraulics(v);
    const isInWater = surfY < waterY - (isHighClearance ? 1.5 : 0.28) && v.y <= waterY + 0.5;
    const airborne = specs.canFly && (this.vehicleAscendHold || v.y > Math.max(surfY, waterY) + 0.55);

    const vSpeedMult = (v.turboBoost ?? 1) * (this.modSystem?.tweaks.vehicleSpeedMultiplier ?? 1);
    const topSpeed =
      (airborne
        ? specs.topAirSpeed * boostMult * fuelMult
        : isInWater
          ? specs.topWaterSpeed * boostMult * fuelMult
          : specs.topLandSpeed * boostMult * fuelMult) * vSpeedMult;

    // Braking / Throttle
    if (this.gamepadHandbrake || (!specs.canFly && !hasHyd && this.vehicleAscendHold)) {
      this.vehicleForwardSpeed = THREE.MathUtils.damp(this.vehicleForwardSpeed, 0, 9, dt);
    } else if (Math.abs(moveForward) > 0.08) {
      const targetSpd =
        moveForward >= 0 ? moveForward * topSpeed : moveForward * topSpeed * 0.55;
      this.vehicleForwardSpeed = THREE.MathUtils.damp(
        this.vehicleForwardSpeed,
        targetSpd,
        airborne ? 2.6 : 4.2,
        dt,
      );
    } else {
      this.vehicleForwardSpeed = THREE.MathUtils.damp(
        this.vehicleForwardSpeed,
        0,
        airborne ? 1.8 : 3.2,
        dt,
      );
    }

    // Steering yaw & smooth follow camera
    const targetSteer = THREE.MathUtils.clamp(-moveRight * 0.55, -0.55, 0.55);
    this.vehicleSteerAngle = THREE.MathUtils.damp(this.vehicleSteerAngle, targetSteer, 10, dt);

    if (Math.abs(moveRight) > 0.08) {
      const revSign = !airborne && this.vehicleForwardSpeed < -0.5 ? -1 : 1;
      const turnPower =
        specs.turnRate *
        (airborne || isInWater ? 1.0 : Math.min(1, 0.35 + Math.abs(this.vehicleForwardSpeed) / 7)) *
        revSign;
      const yawDelta = -moveRight * turnPower * dt;
      v.yaw += yawDelta;
      this.camYaw += yawDelta * 0.85;
    }

    const fwdX = Math.sin(v.yaw);
    const fwdZ = Math.cos(v.yaw);
    v.vx = fwdX * this.vehicleForwardSpeed;
    v.vz = fwdZ * this.vehicleForwardSpeed;

    let nextX = v.x + v.vx * dt;
    let nextZ = v.z + v.vz * dt;
    const maxVehicleRadius = getPlayableMaxRadius() + 18;
    const rad = Math.hypot(nextX, nextZ);
    if (rad > maxVehicleRadius) {
      nextX *= maxVehicleRadius / rad;
      nextZ *= maxVehicleRadius / rad;
    }

    // Ground & bridge collision vs Airship clearance (Island World colliders via 16m spatial hash)
    if (this.worldType === 'island' && (!airborne || v.y < Math.max(surfY, waterY) + 3.2)) {
      const vCx = Math.floor(nextX / 16);
      const vCz = Math.floor(nextZ / 16);
      for (let gdx = -1; gdx <= 1; gdx++) {
        for (let gdz = -1; gdz <= 1; gdz++) {
          const bucket = this.colliderGrid.get((vCx + gdx + 2048) * 4096 + (vCz + gdz + 2048));
          if (!bucket) continue;
          for (let ci = 0; ci < bucket.length; ci++) {
            const col = bucket[ci];
            if (col.radius < 0.9) continue;
            const dx = nextX - col.x;
            const dz = nextZ - col.z;
            const minD = col.radius + 1.55;
            const distSq = dx * dx + dz * dz;
            if (distSq < minD * minD && distSq > 0.0001) {
              const d = Math.sqrt(distSq);
              nextX = col.x + (dx / d) * minD;
              nextZ = col.z + (dz / d) * minD;
              this.vehicleForwardSpeed *= 0.85;
            }
          }
        }
      }
    }

    // Check water depth barrier only for land-only rigs that can't float & can't fly
    if (!specs.canFloat && !specs.canFly) {
      const nextSurf = Math.max(
        getTerrainHeight(nextX, nextZ),
        this.getStructuralSurfaceY(nextX, nextZ, v.y + 0.8),
      );
      const nextWater = getWaterLevelAt(nextX, nextZ);
      const maxFordDepth = isHighClearance ? 2.2 : 1.2;
      if (nextSurf < nextWater - maxFordDepth) {
        this.vehicleForwardSpeed *= 0.6;
      }
    }

    v.x = nextX;
    v.z = nextZ;

    // Vertical physics: Airship lift / Watercraft buoyancy / Land suspension & bridges
    const newSurfY = Math.max(
      getTerrainHeight(v.x, v.z),
      this.getStructuralSurfaceY(v.x, v.z, v.y + 0.8),
    );
    const newWaterY = getWaterLevelAt(v.x, v.z);
    const floorY = specs.canFloat
      ? Math.max(newSurfY, newWaterY - 0.16)
      : Math.max(newSurfY, newWaterY - 0.85);

    if (specs.canFly) {
      if (this.vehicleAscendHold) {
        this.vehicleAltitudeVel = THREE.MathUtils.damp(this.vehicleAltitudeVel, 9.5, 5, dt);
      } else if (this.vehicleDescendHold) {
        this.vehicleAltitudeVel = THREE.MathUtils.damp(this.vehicleAltitudeVel, -8.5, 5, dt);
      } else {
        this.vehicleAltitudeVel = THREE.MathUtils.damp(this.vehicleAltitudeVel, 0, 5, dt);
      }
      v.y += this.vehicleAltitudeVel * dt;
      if (v.y < floorY) {
        v.y = floorY;
        this.vehicleAltitudeVel = Math.max(0, this.vehicleAltitudeVel);
      } else if (v.y > 68) {
        v.y = 68;
        this.vehicleAltitudeVel = Math.min(0, this.vehicleAltitudeVel);
      }
    } else if (specs.canFloat && newSurfY < newWaterY - 0.25) {
      const bob = Math.sin(this.elapsed * 3.2 + v.x * 0.2) * 0.08;
      v.y = THREE.MathUtils.damp(v.y, newWaterY - 0.12 + bob, 8, dt);
      v.vy = 0;
    } else {
      v.vy -= 20 * dt;
      v.y += v.vy * dt;
      if (v.y <= floorY) {
        v.y = floorY;
        v.vy = 0;
      }
    }

    // Bumper ramming against wildlife/dinosaurs at high speed
    const spd = Math.hypot(v.vx, v.vz);
    if (spd > 7.5) {
      for (const c of this.creatures.creatures) {
        if (!c.alive || !c.cycleActive) continue;
        if (Math.abs(c.y - v.y) > 2.4) continue;
        if (Math.hypot(c.x - v.x, c.z - v.z) < 2.4) {
          const ramDmg = Math.round(spd * 2.2 + specs.armorCount * 8);
          const ramRes = this.creatures.damageCreature(c, ramDmg, v.x, v.z, {
            stunSeconds: 0.9,
            knockback: 3.5,
          });
          this.sound.playAttack('melee');
          this.spawnParticles(c.x, c.y + 0.9, c.z, 0xdc2626, 6);
          if (ramRes.killed) {
            this.handleCreatureDefeated(c, ramRes.drops, v.name || 'Vehicle Ram');
          }
        }
      }
    }

    // Sync player coordinates inside cockpit & mark exploration
    this.playerX = v.x;
    this.playerY = v.y + 0.9;
    this.playerZ = v.z;
    this.playerYaw = v.yaw;
    this.currentSpeedMps = spd;
    this.grounded = !airborne;
    this.isSwimming = false;
    this.markExploredAroundPlayer();

    // Update terrain slope pitch + turn bank roll visuals
    const sampleFwdY = Math.max(
      getTerrainHeight(v.x + fwdX * 1.4, v.z + fwdZ * 1.4),
      this.getStructuralSurfaceY(v.x + fwdX * 1.4, v.z + fwdZ * 1.4, v.y + 0.8),
    );
    const sampleBackY = Math.max(
      getTerrainHeight(v.x - fwdX * 1.4, v.z - fwdZ * 1.4),
      this.getStructuralSurfaceY(v.x - fwdX * 1.4, v.z - fwdZ * 1.4, v.y + 0.8),
    );
    const desiredPitch = airborne
      ? THREE.MathUtils.clamp(-this.vehicleAltitudeVel * 0.03 + moveForward * 0.06, -0.25, 0.25)
      : THREE.MathUtils.clamp(
          Math.atan2(sampleBackY - sampleFwdY, 2.8) * (isHighClearance ? 0.65 : 1.0),
          -0.4,
          0.4,
        );
    const desiredRoll = THREE.MathUtils.clamp(
      moveRight * (airborne ? 0.24 : 0.09) * Math.min(1, spd / 8),
      -0.3,
      0.3,
    );
    this.vehicleVisualPitch = THREE.MathUtils.damp(
      this.vehicleVisualPitch,
      desiredPitch,
      isHighClearance ? 6.5 : 9,
      dt,
    );
    this.vehicleVisualRoll = THREE.MathUtils.damp(
      this.vehicleVisualRoll,
      desiredRoll,
      isHighClearance ? 6.5 : 9,
      dt,
    );

    this.vehicleEngineSoundAccum += dt;
    if ((spd > 2 || airborne) && this.vehicleEngineSoundAccum >= 0.45) {
      this.vehicleEngineSoundAccum = 0;
      this.sound.playKineticGearTick();
    }
    this.nearbyInteraction = null;
  }

  private getVehicleSpecs(v: ModularVehicleData): ReturnType<typeof computeVehicleSpecs> {
    let cached = this.vehicleSpecsCache.get(v.modules);
    if (!cached) {
      cached = computeVehicleSpecs(v.modules);
      this.vehicleSpecsCache.set(v.modules, cached);
    }
    return cached;
  }

  private updateVehicles(dt: number): void {
    const activeV = this.activeVehicleId
      ? this.vehicles.find((x) => x.id === this.activeVehicleId)
      : null;
    const activeIsOldSchool = this.isOldSchoolVehicle(activeV);
    const bassActive = Boolean(
      activeV &&
        activeIsOldSchool &&
        activeV.trunkBassEnabled &&
        this.mode === 'playing' &&
        !this.gameOver,
    );
    const synthPulse = this.sound.updateTrunkBass(bassActive, dt);
    const radioSample =
      activeV && activeIsOldSchool
        ? CABIN_BASS_AND_FIRST_PERSON.sampleBassAndChestThump(
            this.toRadioCarDescriptor(activeV),
          )
        : { bassLevel: 0, chestThump: 0, trunkPump: 0 };
    this.trunkBassPulse = Math.max(synthPulse, radioSample.trunkPump);
    this.chestThumpPulse = Math.max(
      bassActive && synthPulse > 0.48 ? Math.min(1, (synthPulse - 0.48) * 1.8) : 0,
      radioSample.chestThump,
    );

    // Solve 4-corner hydraulic & airbag/coil-over spring-damper physics for active vehicle
    const activeHasHyd = this.vehicleHasHydraulics(activeV);
    const activeIsDonk = this.isDonkHydraulicVehicle(activeV);
    const activeIsAirbag = this.isAirbagVehicle(activeV);
    const airbagSpeed = THREE.MathUtils.clamp(activeV?.airbagSpeed ?? 1.0, 0.25, 2.0);
    const airbagLock = THREE.MathUtils.clamp(activeV?.airbagLockLevel ?? 1.0, 0.4, 1.4);
    const sideWave = Math.sin(this.elapsed * (2.6 + airbagSpeed * 3.4));

    let tFl = 0, tFr = 0, tRl = 0, tRr = 0;
    if (activeHasHyd) {
      if (activeIsAirbag) {
        if (this.hydraulicMode === 'lock_up') {
          tFl = tFr = tRl = tRr = 0.72 * airbagLock;
        } else if (this.hydraulicMode === 'drop_down') {
          tFl = tFr = tRl = tRr = -0.22 * airbagLock;
        } else if (this.hydraulicMode === 'front_lock') {
          tFl = tFr = 0.86 * airbagLock;
          tRl = tRr = -0.14 * airbagLock;
        } else if (this.hydraulicMode === 'rear_lock') {
          tFl = tFr = -0.14 * airbagLock;
          tRl = tRr = 0.86 * airbagLock;
        } else if (this.hydraulicMode === 'left_tilt') {
          tFl = tRl = 0.82 * airbagLock;
          tFr = tRr = -0.16 * airbagLock;
        } else if (this.hydraulicMode === 'right_tilt') {
          tFl = tRl = -0.16 * airbagLock;
          tFr = tRr = 0.82 * airbagLock;
        } else if (this.hydraulicMode === 'side_to_side') {
          tFl = tRl = (0.24 + sideWave * 0.56) * airbagLock;
          tFr = tRr = (0.24 - sideWave * 0.56) * airbagLock;
        }
      } else if (this.hydraulicMode === 'lock_up') {
        tFl = tFr = tRl = tRr = activeIsDonk ? 0.62 : 0.78;
      } else if (this.hydraulicMode === 'drop_down') {
        tFl = tFr = tRl = tRr = activeIsDonk ? -0.22 : -0.14;
      } else if (this.hydraulicMode === 'left_tilt') {
        const low = activeIsDonk ? -0.16 : -0.1;
        const high = activeIsDonk ? 0.56 : 0.96;
        tFl = tRl = low;
        tFr = tRr = high;
      } else if (this.hydraulicMode === 'right_tilt') {
        const low = activeIsDonk ? -0.16 : -0.1;
        const high = activeIsDonk ? 0.56 : 0.96;
        tFl = tRl = high;
        tFr = tRr = low;
      }
    }

    const stiffness = activeIsAirbag
      ? 16 + airbagSpeed * 58
      : activeIsDonk
        ? 78
        : 88;
    const damping = activeIsAirbag
      ? 9.2 - airbagSpeed * 1.9
      : activeIsDonk
        ? 9.5
        : 7.0;
    const minClamp = activeIsAirbag ? -0.32 : activeIsDonk ? -0.26 : -0.2;
    const maxClamp = activeIsAirbag ? 1.48 : activeIsDonk ? 0.72 : 1.55;

    if (activeHasHyd || this.hydVel.fl !== 0 || this.hydVel.fr !== 0 || this.hydVel.rl !== 0 || this.hydVel.rr !== 0 || this.hydCorners.fl !== 0 || this.hydCorners.fr !== 0 || this.hydCorners.rl !== 0 || this.hydCorners.rr !== 0) {
      this.hydVel.fl += ((tFl - this.hydCorners.fl) * stiffness - this.hydVel.fl * damping) * dt;
      this.hydCorners.fl = THREE.MathUtils.clamp(this.hydCorners.fl + this.hydVel.fl * dt, minClamp, maxClamp);
      this.hydVel.fr += ((tFr - this.hydCorners.fr) * stiffness - this.hydVel.fr * damping) * dt;
      this.hydCorners.fr = THREE.MathUtils.clamp(this.hydCorners.fr + this.hydVel.fr * dt, minClamp, maxClamp);
      this.hydVel.rl += ((tRl - this.hydCorners.rl) * stiffness - this.hydVel.rl * damping) * dt;
      this.hydCorners.rl = THREE.MathUtils.clamp(this.hydCorners.rl + this.hydVel.rl * dt, minClamp, maxClamp);
      this.hydVel.rr += ((tRr - this.hydCorners.rr) * stiffness - this.hydVel.rr * damping) * dt;
      this.hydCorners.rr = THREE.MathUtils.clamp(this.hydCorners.rr + this.hydVel.rr * dt, minClamp, maxClamp);
    }

    const maxDrawSq = this.effectiveMaxDrawDistance * this.effectiveMaxDrawDistance;
    const detailDistSq = this.autoFpsTier >= 2 ? 32 * 32 : 44 * 44;
    const shadowMargin = this.effectiveShadowExtent + 10;
    const shadowDistSq = shadowMargin * shadowMargin;
    const underglowLightMaxSq = 20 * 20;
    const maxUnderLights = Math.min(
      this.vehicleUnderglowPool.length,
      this.autoFpsTier >= 2 ? 1 : 2,
    );
    let cand0DistSq = Infinity;
    let cand0X = 0;
    let cand0Y = 0;
    let cand0Z = 0;
    let cand0ColorHex = 0x38bdf8;
    let cand0Distance = 9.5;
    let cand0Decay = 1.4;
    let cand0Intensity = 0;

    let cand1DistSq = Infinity;
    let cand1X = 0;
    let cand1Y = 0;
    let cand1Z = 0;
    let cand1ColorHex = 0x38bdf8;
    let cand1Distance = 9.5;
    let cand1Decay = 1.4;
    let cand1Intensity = 0;

    for (const v of this.vehicles) {
      const specs = this.getVehicleSpecs(v);
      const handles = this.vehicleMeshes.get(v.id);
      const isActive = v.id === this.activeVehicleId;
      const autoJob = !isActive ? this.autoParkJobs.get(v.id) : undefined;

      let cachedGroundSurf: number | null = null;
      if (!isActive) {
        if (autoJob) {
          this.stepAutoParkVehicle(v, specs, autoJob, dt);
        } else {
          let restEntry = this.vehicleRestCache.get(v.id);
          if (
            !restEntry ||
            restEntry.x !== v.x ||
            restEntry.z !== v.z ||
            restEntry.structVer !== this.structuralVersion ||
            this.elapsed >= restEntry.nextRefreshAt
          ) {
            const surf = Math.max(
              getTerrainHeight(v.x, v.z),
              this.getStructuralSurfaceY(v.x, v.z, v.y + 0.8),
            );
            const water = getWaterLevelAt(v.x, v.z);
            const restY = specs.canFloat ? Math.max(surf, water - 0.14) : surf;
            restEntry = {
              x: v.x,
              z: v.z,
              structVer: this.structuralVersion,
              restY,
              groundSurf: surf,
              nextRefreshAt: this.elapsed + 0.65,
            };
            this.vehicleRestCache.set(v.id, restEntry);
          }
          cachedGroundSurf = restEntry.groundSurf;
          if (Math.abs(v.y - restEntry.restY) > 0.002) {
            v.y = THREE.MathUtils.damp(v.y, restEntry.restY, 6, dt);
          } else {
            v.y = restEntry.restY;
          }
          v.vx = 0;
          v.vz = 0;
        }
      }

      if (!handles) continue;
      const vdx = v.x - this.playerX;
      const vdz = v.z - this.playerZ;
      const distVSq = vdx * vdx + vdz * vdz;
      handles.root.visible =
        isActive ||
        (this.currentDimension === 'overworld' && distVSq <= maxDrawSq);
      if (!handles.root.visible) {
        continue;
      }

      const castVehicleShadow =
        this.effectiveShadowsEnabled && (isActive || distVSq <= shadowDistSq);
      if (handles.root.userData.vShadowCast !== castVehicleShadow) {
        handles.root.userData.vShadowCast = castVehicleShadow;
        handles.root.traverse((child) => {
          if (child instanceof THREE.Mesh && !child.userData.noShadowCast) {
            child.castShadow = castVehicleShadow;
          }
        });
      }

      handles.root.position.set(v.x, v.y, v.z);
      if (handles.root.rotation.order !== 'YXZ') {
        handles.root.rotation.order = 'YXZ';
      }
      if (isActive) {
        handles.root.rotation.set(
          this.vehicleVisualPitch,
          v.yaw,
          this.vehicleVisualRoll,
        );
      } else if (autoJob) {
        handles.root.rotation.set(autoJob.pitchAngle, v.yaw, 0);
      } else {
        handles.root.rotation.set(0, v.yaw, 0);
      }

      const shadowDisc = this.vehicleShadowDiscs.get(v.id);
      if (shadowDisc && shadowDisc.visible) {
        const groundSurf =
          cachedGroundSurf !== null
            ? cachedGroundSurf
            : Math.max(
                getTerrainHeight(v.x, v.z),
                this.getStructuralSurfaceY(v.x, v.z, v.y + 0.8),
              );
        const airGap = Math.max(0, v.y - groundSurf);
        shadowDisc.position.y = Math.min(0.05, groundSurf - v.y + 0.05);
        const s = Math.max(0.55, 1 - airGap * 0.14);
        shadowDisc.scale.set(s, 1, s);
      }

      if (!isActive && !autoJob && distVSq > detailDistSq) {
        continue;
      }

      // Base chassis ride height + 4-corner hydraulic heave/pitch/roll + SLAB/Tahoe sub-bass rattle
      const isTahoeShow =
        v.preset === 'chevy_tahoe' || v.preset === 'chevy_2000_sub';
      const isCustomShowCar =
        isTahoeShow ||
        v.preset === 'lowrider' ||
        v.preset === 'donk' ||
        v.preset === 'slab' ||
        v.preset === 'cadillac_coupe_deville';
      const baseBodyY = isTahoeShow
        ? Math.max(0.075, 0.38 + (v.suspensionOffset ?? -0.3))
        : isCustomShowCar
          ? Math.max(0.26, 0.38 + (v.suspensionOffset ?? 0))
          : (v.suspensionOffset ?? 0);
      const minChassisY = isTahoeShow ? 0.075 : 0.18;
      const vIsOldSchool = this.isOldSchoolVehicle(v);
      const showBassPulse =
        vIsOldSchool && isActive
          ? this.trunkBassPulse
          : vIsOldSchool && !isActive && v.trunkBassEnabled
            ? 0.25 + 0.25 * Math.max(0, Math.sin(this.elapsed * 6.5))
            : 0;

      const danceState = this.vehicleDanceStates.get(v.id);
      if (danceState && (danceState.enabled || v.hydraulicsDanceEnabled)) {
        danceState.enabled = Boolean(v.hydraulicsDanceEnabled);
        stepGarageHydraulicsDance(
          {
            bodyGroup: handles.chassisGroup,
            subCones: handles.subwooferCones ?? [],
          },
          danceState,
          dt,
          baseBodyY,
        );
        for (const wc of handles.wheelCorners) {
          wc.obj.position.y = wc.baseY;
        }
      } else if (isActive && activeHasHyd) {
        const { fl, fr, rl, rr } = this.hydCorners;
        const avgHeave = (fl + fr + rl + rr) * 0.25;
        const hydPitch = activeIsDonk ? 0 : ((rl + rr) - (fl + fr)) * 0.21;
        const hydRoll = ((fr + rr) - (fl + rl)) * (activeIsDonk ? 0.16 : 0.24);
        handles.chassisGroup.position.y =
          Math.max(minChassisY, baseBodyY + avgHeave) + showBassPulse * 0.025;
        handles.chassisGroup.rotation.x = hydPitch;
        handles.chassisGroup.rotation.z = hydRoll;
        const minCorner = Math.min(fl, fr, rl, rr);
        for (const wc of handles.wheelCorners) {
          if (activeIsDonk) {
            // DONK keeps all 4 wheels planted while body moves up/down/side-to-side
            wc.obj.position.y = wc.baseY;
          } else {
            // Lowrider, Coupe DeVille & Tahoe coil-over lift active corners cleanly
            const cornerH = this.hydCorners[wc.corner];
            const relativeLift = Math.max(0, cornerH - minCorner - 0.05);
            wc.obj.position.y = wc.baseY + relativeLift * (activeIsAirbag ? 0.55 : 0.85);
          }
        }
      } else {
        handles.chassisGroup.position.y = baseBodyY + showBassPulse * 0.032;
        handles.chassisGroup.rotation.x = 0;
        handles.chassisGroup.rotation.z = 0;
        for (const wc of handles.wheelCorners) {
          wc.obj.position.y = wc.baseY;
        }
      }

      // Real Working Hinged Doors (All Cars)
      if (handles.doorLeft) {
        const targetL = v.doorsOpen ? -1.12 : 0;
        handles.doorLeft.rotation.y = THREE.MathUtils.damp(
          handles.doorLeft.rotation.y,
          targetL,
          8,
          dt,
        );
      }
      if (handles.doorRight) {
        const targetR = v.doorsOpen ? 1.12 : 0;
        handles.doorRight.rotation.y = THREE.MathUtils.damp(
          handles.doorRight.rotation.y,
          targetR,
          8,
          dt,
        );
      }

      // Popping Trunk / Liftgate Animation + Real-Time Old-School Trunk Bass Lift & Vibration
      if (handles.trunkLid) {
        if (handles.trunkLid.userData.baseY === undefined) {
          handles.trunkLid.userData.baseY = handles.trunkLid.position.y;
        }
        const baseTrunkY = handles.trunkLid.userData.baseY as number;
        const targetTrunk =
          (v.trunkOpen ? 0.96 : 0) +
          (showBassPulse > 0.01 ? -0.045 * showBassPulse : 0);
        handles.trunkLid.position.y =
          showBassPulse > 0.01 ? baseTrunkY + showBassPulse * 0.045 : baseTrunkY;
        handles.trunkLid.rotation.x = THREE.MathUtils.damp(
          handles.trunkLid.rotation.x,
          targetTrunk,
          10,
          dt,
        );
      }

      // Cadillac Coupe DeVille Real-Life 2-Stage Articulated Folding Black Droptop + 3D Button
      if (this.droptopButtonPressTimer > 0) {
        this.droptopButtonPressTimer = Math.max(0, this.droptopButtonPressTimer - dt);
      }
      if (this.rimLightButtonPressTimer > 0) {
        this.rimLightButtonPressTimer = Math.max(0, this.rimLightButtonPressTimer - dt);
      }
      if (this.liftButtonPressTimer > 0) {
        this.liftButtonPressTimer = Math.max(0, this.liftButtonPressTimer - dt);
      }
      if (handles.convertibleTop) {
        const targetProg = v.convertibleTopDown ? 1 : 0;
        const curProg = this.convertibleTopProgressMap.get(v.id) ?? targetProg;
        const step = dt * 0.48; // Smooth ~2.1s real-life power convertible cycle
        const nextProg =
          curProg < targetProg
            ? Math.min(targetProg, curProg + step)
            : curProg > targetProg
              ? Math.max(targetProg, curProg - step)
              : targetProg;
        this.convertibleTopProgressMap.set(v.id, nextProg);

        // Stage 1 (0.0 -> 0.50): Front canopy unlatches from windshield & folds backward onto rear bow
        const frontFold = THREE.MathUtils.clamp(nextProg / 0.5, 0, 1);
        const frontSmooth = frontFold * frontFold * (3 - 2 * frontFold);
        if (handles.convertibleFrontSection) {
          handles.convertibleFrontSection.rotation.x = -frontSmooth * Math.PI * 0.72;
        }

        // Stage 2 (0.28 -> 1.0): Whole scissor-bow frame swings backward & tucks into rear deck well
        const rearFold = THREE.MathUtils.clamp((nextProg - 0.28) / 0.72, 0, 1);
        const rearSmooth = rearFold * rearFold * (3 - 2 * rearFold);
        handles.convertibleTop.rotation.x = -rearSmooth * Math.PI * 0.58;
        handles.convertibleTop.position.y = 0.74 - rearSmooth * 0.28;
        handles.convertibleTop.visible = nextProg < 0.96;

        // Folded black convertible boot rises cleanly behind the rear seats when top tucks away
        if (handles.convertibleBoot) {
          const bootVis = THREE.MathUtils.clamp((nextProg - 0.65) / 0.35, 0, 1);
          handles.convertibleBoot.visible = bootVis > 0.02;
          handles.convertibleBoot.scale.set(1, Math.max(0.05, bootVis), 1);
        }

        // Animate the physical 3D Interior Droptop Button on the center console
        if (handles.droptopButtonCap) {
          const pressed = this.droptopButtonPressTimer > 0;
          handles.droptopButtonCap.position.y = THREE.MathUtils.damp(
            handles.droptopButtonCap.position.y,
            pressed ? 0.008 : 0.024,
            18,
            dt,
          );
          const capMat = handles.droptopButtonCap.material as THREE.MeshStandardMaterial;
          if (capMat && 'emissive' in capMat) {
            const isMoving = Math.abs(nextProg - targetProg) > 0.01;
            capMat.emissive.setHex(
              isMoving ? 0x38bdf8 : v.convertibleTopDown ? 0x10b981 : 0xf59e0b,
            );
            capMat.emissiveIntensity = isMoving ? 2.2 : 1.35;
          }
        }
      }

      // Compute 40" Rim LED + Underglow intensity (Solid, Blink, Follow Music, or Off)
      const rimMode = v.rimLightMode ?? (isTahoeShow ? 'blink' : 'off');
      let rimLightFactor = 0;
      if (rimMode === 'solid') {
        rimLightFactor = 1.0;
      } else if (rimMode === 'blink') {
        // Crisp double-flash show strobe blink on the 40" Forgiato spinner rims
        const cycle = (this.elapsed * 2.4) % 1;
        const flashOn = cycle < 0.24 || (cycle > 0.36 && cycle < 0.6);
        rimLightFactor = flashOn ? 1.25 : 0.05;
      } else if (rimMode === 'music') {
        // Follow along directly with the live sub-bass & car radio music beat
        rimLightFactor =
          showBassPulse > 0.02
            ? 0.14 + showBassPulse * 1.45
            : 0.12 + 0.14 * Math.max(0, Math.sin(this.elapsed * 4.5));
      }

      if (handles.rimLightMaterials && handles.rimLightMaterials.length > 0) {
        _scratchColorA.set(v.rimLightColor || v.underglowColor || '#38bdf8');
        for (const rMat of handles.rimLightMaterials) {
          rMat.color.copy(_scratchColorA);
          rMat.emissive.copy(_scratchColorA);
          rMat.emissiveIntensity = rimMode === 'off' ? 0.02 : rimLightFactor * 2.9;
        }
      }

      // Animate Behind-Driver Subwoofer Cones & Enclosure LED Bars
      if (handles.subwooferCones && handles.subwooferCones.length > 0) {
        const excursion = showBassPulse * 0.068;
        const flutter =
          showBassPulse > 0.05 ? Math.sin(this.elapsed * 52) * 0.012 * showBassPulse : 0;
        for (const cone of handles.subwooferCones) {
          const baseZ = (cone.userData.baseZ as number | undefined) ?? cone.position.z;
          cone.userData.baseZ = baseZ;
          cone.position.z = baseZ + excursion + flutter;
        }
      }
      if (handles.subGlowMeshes && handles.subGlowMeshes.length > 0) {
        for (const sm of handles.subGlowMeshes) {
          const mat = sm.material as THREE.MeshStandardMaterial;
          if (mat && 'emissiveIntensity' in mat) {
            mat.emissiveIntensity =
              rimMode === 'blink'
                ? 0.6 + rimLightFactor * 1.8
                : 0.9 + showBassPulse * 2.6;
          }
        }
      }

      // Animate Pressable 3D Interior Console Buttons (Rim Lights & Lift)
      if (handles.rimLightButtonCap) {
        handles.rimLightButtonCap.position.y = THREE.MathUtils.damp(
          handles.rimLightButtonCap.position.y,
          this.rimLightButtonPressTimer > 0 ? 0.008 : 0.024,
          18,
          dt,
        );
        const capMat = handles.rimLightButtonCap.material as THREE.MeshStandardMaterial;
        if (capMat && 'emissive' in capMat) {
          capMat.emissive.setHex(
            rimMode === 'music'
              ? 0xec4899
              : rimMode === 'blink'
                ? 0x38bdf8
                : rimMode === 'solid'
                  ? 0x10b981
                  : 0x334155,
          );
          capMat.emissiveIntensity =
            rimMode === 'off' ? 0.3 : 1.0 + rimLightFactor * 0.9;
        }
      }
      if (handles.liftButtonCap) {
        handles.liftButtonCap.position.y = THREE.MathUtils.damp(
          handles.liftButtonCap.position.y,
          this.liftButtonPressTimer > 0 ? 0.008 : 0.024,
          18,
          dt,
        );
        const capMat = handles.liftButtonCap.material as THREE.MeshStandardMaterial;
        if (capMat && 'emissive' in capMat) {
          const isLifted = isActive && this.hydraulicMode === 'lock_up';
          capMat.emissive.setHex(isLifted ? 0x10b981 : 0xf59e0b);
          capMat.emissiveIntensity = isLifted ? 2.0 : 1.35;
        }
      }

      const underOn = v.underglowEnabled !== false;
      const underPulse =
        rimMode === 'music'
          ? showBassPulse * 1.35
          : rimMode === 'blink'
            ? rimLightFactor * 0.95
            : showBassPulse;
      const uMeta = this.vehicleUnderglowMeta.get(v.id);
      if (
        uMeta &&
        underOn &&
        maxUnderLights > 0 &&
        (isActive || distVSq <= underglowLightMaxSq)
      ) {
        const effDistSq = isActive ? -1 : distVSq;
        _vec3A
          .set(uMeta.localX, handles.chassisGroup.position.y + uMeta.localY, uMeta.localZ)
          .applyEuler(handles.root.rotation)
          .add(handles.root.position);
        const underInt = 1.85 + underPulse * 3.1;
        const underColorHex = v.underglowColor
          ? _scratchColorA.set(v.underglowColor).getHex()
          : uMeta.colorHex;
        if (effDistSq < cand0DistSq) {
          cand1DistSq = cand0DistSq;
          cand1X = cand0X;
          cand1Y = cand0Y;
          cand1Z = cand0Z;
          cand1ColorHex = cand0ColorHex;
          cand1Distance = cand0Distance;
          cand1Decay = cand0Decay;
          cand1Intensity = cand0Intensity;

          cand0DistSq = effDistSq;
          cand0X = _vec3A.x;
          cand0Y = _vec3A.y;
          cand0Z = _vec3A.z;
          cand0ColorHex = underColorHex;
          cand0Distance = uMeta.distance;
          cand0Decay = uMeta.decay;
          cand0Intensity = underInt;
        } else if (maxUnderLights > 1 && effDistSq < cand1DistSq) {
          cand1DistSq = effDistSq;
          cand1X = _vec3A.x;
          cand1Y = _vec3A.y;
          cand1Z = _vec3A.z;
          cand1ColorHex = underColorHex;
          cand1Distance = uMeta.distance;
          cand1Decay = uMeta.decay;
          cand1Intensity = underInt;
        }
      }
      if (handles.underglowMeshes) {
        for (const gm of handles.underglowMeshes) {
          const mat = gm.material as THREE.MeshStandardMaterial;
          if (mat && 'emissiveIntensity' in mat) {
            mat.emissiveIntensity = underOn ? 1.9 + underPulse * 2.4 : 0.04;
          }
        }
      }

      const wheelRadius = 0.42 * (v.wheelScale ?? 1.0);
      const spd = isActive
        ? this.vehicleForwardSpeed
        : autoJob
          ? autoJob.speed
          : 0;
      const wheelRoll = (spd / wheelRadius) * dt;
      for (const w of handles.wheels) {
        w.rotation.x += wheelRoll;
      }
      // 13-inch & 40-inch Forgiato 44 Auto-Spinner Rims keep spinning smoothly even when stopped!
      if (handles.spinners && handles.spinners.length > 0) {
        const spinnerSpin = (Math.abs(spd) * 2.2 + 3.1) * dt;
        for (const sp of handles.spinners) {
          sp.rotation.x += spinnerSpin;
        }
      }
      if (isActive || autoJob) {
        const steerVal = isActive ? this.vehicleSteerAngle : (autoJob?.steerAngle ?? 0);
        for (const sw of handles.steerWheels) {
          sw.rotation.y = steerVal;
        }
        for (const r of handles.rudders) {
          r.rotation.y = -steerVal * 1.1;
        }
        if (handles.helmWheel) {
          handles.helmWheel.rotation.z = steerVal * 2.2;
        }
      }

      const rotorSpeed = specs.canFly
        ? isActive
          ? 22 + Math.abs(spd) * 0.6
          : 1.8
        : 0;
      for (const rotor of handles.rotors) {
        rotor.rotation.y += rotorSpeed * dt;
      }

      const pistonSpeed = isActive ? 7 + Math.abs(spd) * 1.2 : 1.6;
      for (const p of handles.pistons) {
        p.position.y = 0.62 + Math.sin(this.elapsed * pistonSpeed) * 0.09;
      }
    }

    if (this.vehicleUnderglowPool.length > 0) {
      const p0 = this.vehicleUnderglowPool[0];
      if (cand0Intensity > 0) {
        p0.position.set(cand0X, cand0Y, cand0Z);
        p0.color.setHex(cand0ColorHex);
        p0.distance = cand0Distance;
        p0.decay = cand0Decay;
        p0.intensity = cand0Intensity;
      } else {
        p0.intensity = 0;
      }
    }
    if (this.vehicleUnderglowPool.length > 1) {
      const p1 = this.vehicleUnderglowPool[1];
      if (maxUnderLights > 1 && cand1Intensity > 0) {
        p1.position.set(cand1X, cand1Y, cand1Z);
        p1.color.setHex(cand1ColorHex);
        p1.distance = cand1Distance;
        p1.decay = cand1Decay;
        p1.intensity = cand1Intensity;
      } else {
        p1.intensity = 0;
      }
    }
  }

  public spawnCustomVehicle(vehicle: ModularVehicleData): void {
    this.vehicles.push(vehicle);
    const handles = createModularVehicleMesh(vehicle);
    this.extractVehicleUnderglowLight(vehicle.id, handles);
    this.attachVehicleShadowDisc(vehicle.id, handles.root);
    applyRealisticMeshLightingPass(handles.root, {
      shadowsEnabled: this.effectiveShadowsEnabled,
      envMapIntensity: 1.0,
    });
    this.vehicleMeshes.set(vehicle.id, handles);
    this.scene.add(handles.root);
    this.p2p?.broadcast({ type: 'vehicle_upsert', vehicle });
    this.toast(`Spawned ${vehicle.name} in the world!`, 'discovery');
    this.emitHud();
  }

  public customizeVehicle(
    vehicleId: string,
    patch: {
      name?: string;
      paintColor?: string;
      rimColor?: string;
      suspensionOffset?: number;
      wheelScale?: number;
      hydraulicHop?: boolean;
      turboBoost?: number;
      underglowColor?: string;
      underglowEnabled?: boolean;
      rimLightMode?: 'off' | 'solid' | 'blink' | 'music';
      rimLightColor?: string;
    },
  ): boolean {
    const v = this.vehicles.find((x) => x.id === vehicleId);
    if (!v) return false;
    if (patch.name !== undefined) v.name = patch.name.trim() || v.name;
    if (patch.paintColor !== undefined) v.paintColor = patch.paintColor;
    if (patch.rimColor !== undefined) v.rimColor = patch.rimColor;
    if (patch.suspensionOffset !== undefined) v.suspensionOffset = patch.suspensionOffset;
    if (patch.wheelScale !== undefined) v.wheelScale = patch.wheelScale;
    if (patch.hydraulicHop !== undefined) v.hydraulicHop = patch.hydraulicHop;
    if (patch.turboBoost !== undefined) v.turboBoost = patch.turboBoost;
    if (patch.underglowColor !== undefined) v.underglowColor = patch.underglowColor;
    if (patch.underglowEnabled !== undefined) v.underglowEnabled = patch.underglowEnabled;
    if (patch.rimLightMode !== undefined) v.rimLightMode = patch.rimLightMode;
    if (patch.rimLightColor !== undefined) v.rimLightColor = patch.rimLightColor;

    const oldMesh = this.vehicleMeshes.get(v.id);
    if (oldMesh) {
      this.scene.remove(oldMesh.root);
      this.disposeObject3D(oldMesh.root);
    }
    const rebuilt = createModularVehicleMesh(v);
    this.extractVehicleUnderglowLight(v.id, rebuilt);
    rebuilt.root.position.set(v.x, v.y, v.z);
    rebuilt.root.rotation.y = v.yaw;
    for (const sw of rebuilt.steerWheels) {
      sw.rotation.order = 'YXZ';
    }
    this.attachVehicleShadowDisc(v.id, rebuilt.root);
    applyRealisticMeshLightingPass(rebuilt.root, {
      shadowsEnabled: this.effectiveShadowsEnabled,
      envMapIntensity: 1.0,
    });
    this.scene.add(rebuilt.root);
    this.vehicleMeshes.set(v.id, rebuilt);
    this.p2p?.broadcast({ type: 'vehicle_upsert', vehicle: v });
    this.sound.playWeldSnap();
    this.spawnParticles(v.x, v.y + 0.8, v.z, 0xfbbf24, 10);
    this.toast(`Customized ${v.name} in Garage Bay!`, 'craft');
    this.emitHud();
    return true;
  }

  private stepAutoParkVehicle(
    v: ModularVehicleData,
    specs: ReturnType<typeof computeVehicleSpecs>,
    job: {
      vehicleId: string;
      targetX: number;
      targetZ: number;
      targetYaw: number;
      bayLabel: string;
      phase: 'approach' | 'park';
      speed: number;
      steerAngle: number;
      pitchAngle: number;
      elapsed: number;
      stuckTimer: number;
      lastProgressX: number;
      lastProgressZ: number;
    },
    dt: number,
  ): void {
    job.elapsed += dt;

    const apronX = job.targetX;
    const apronZ = job.targetZ + 9.2;
    if (job.phase === 'approach') {
      const distApron = Math.hypot(apronX - v.x, apronZ - v.z);
      const alreadyInGarageCorridor =
        Math.abs(v.x - VEHICLE_GARAGE_POS.x) <= 15 &&
        v.z >= VEHICLE_GARAGE_POS.z - 5 &&
        v.z <= VEHICLE_GARAGE_POS.z + 10.5;
      if (distApron < 3.0 || alreadyInGarageCorridor) {
        job.phase = 'park';
      }
    }

    const wx = job.phase === 'approach' ? apronX : job.targetX;
    const wz = job.phase === 'approach' ? apronZ : job.targetZ;
    const dx = wx - v.x;
    const dz = wz - v.z;
    const dist = Math.hypot(dx, dz);

    if ((job.phase === 'park' && dist < 0.35) || job.elapsed > 36) {
      v.x = job.targetX;
      v.z = job.targetZ;
      v.yaw = job.targetYaw;
      v.vx = 0;
      v.vy = 0;
      v.vz = 0;
      v.y = getTerrainHeight(v.x, v.z) + 0.14;
      job.speed = 0;
      job.steerAngle = 0;
      job.pitchAngle = 0;
      this.autoParkJobs.delete(v.id);
      this.p2p?.broadcast({ type: 'vehicle_upsert', vehicle: v });
      this.sound.playWeldSnap();
      this.toast(`${v.name} auto-parked in Garage ${job.bayLabel}`, 'info');
      return;
    }

    const curFwdX = Math.sin(v.yaw);
    const curFwdZ = Math.cos(v.yaw);
    const dotToTarget =
      (dx / Math.max(0.01, dist)) * curFwdX + (dz / Math.max(0.01, dist)) * curFwdZ;
    const backingIntoBay = job.phase === 'park' && dist < 11.5 && dotToTarget < 0.15;

    let desiredDirX = dx;
    let desiredDirZ = dz;
    if (job.phase === 'approach' && this.worldType === 'island') {
      const aCx = Math.floor(v.x / 16);
      const aCz = Math.floor(v.z / 16);
      for (let gdx = -1; gdx <= 1; gdx++) {
        for (let gdz = -1; gdz <= 1; gdz++) {
          const bucket = this.colliderGrid.get((aCx + gdx + 2048) * 4096 + (aCz + gdz + 2048));
          if (!bucket) continue;
          for (let ci = 0; ci < bucket.length; ci++) {
            const col = bucket[ci];
            if (col.radius < 0.9) continue;
            if (
              Math.abs(col.x - VEHICLE_GARAGE_POS.x) < 14 &&
              Math.abs(col.z - VEHICLE_GARAGE_POS.z) < 9
            ) {
              continue;
            }
            const ox = col.x - v.x;
            const oz = col.z - v.z;
            const avoidR = col.radius + 3.8;
            const maxAvoid = avoidR + 4.5;
            const odSq = ox * ox + oz * oz;
            if (odSq < maxAvoid * maxAvoid && odSq > 0.0025) {
              const od = Math.sqrt(odSq);
              const fwdDot = (ox / od) * curFwdX + (oz / od) * curFwdZ;
              if (fwdDot > 0.1) {
                const sideSign = curFwdX * oz - curFwdZ * ox >= 0 ? 1 : -1;
                const push = ((maxAvoid - od) / maxAvoid) * 12;
                desiredDirX += -curFwdZ * sideSign * push;
                desiredDirZ += curFwdX * sideSign * push;
              }
            }
          }
        }
      }
      for (const other of this.vehicles) {
        if (other.id === v.id) continue;
        const ox = other.x - v.x;
        const oz = other.z - v.z;
        const od = Math.hypot(ox, oz);
        if (od < 5.5 && od > 0.05) {
          const fwdDot = (ox / od) * curFwdX + (oz / od) * curFwdZ;
          if (fwdDot > 0.15) {
            const sideSign = curFwdX * oz - curFwdZ * ox >= 0 ? 1 : -1;
            desiredDirX += -curFwdZ * sideSign * 6;
            desiredDirZ += curFwdX * sideSign * 6;
          }
        }
      }
    }

    const rawDesiredYaw = backingIntoBay
      ? Math.atan2(-dx, -dz)
      : Math.atan2(desiredDirX, desiredDirZ);
    const yawErr = Math.atan2(
      Math.sin(rawDesiredYaw - v.yaw),
      Math.cos(rawDesiredYaw - v.yaw),
    );

    const maxCruise = Math.min(14.5, Math.max(8.5, specs.topLandSpeed * 0.85));
    const targetSpeed = backingIntoBay
      ? -THREE.MathUtils.clamp(dist * 1.4, 2.4, 5.2)
      : job.phase === 'park'
        ? THREE.MathUtils.clamp(dist * 1.45, 2.6, 6.2)
        : Math.abs(yawErr) > 1.1
          ? maxCruise * 0.48
          : Math.min(maxCruise, Math.max(4.5, dist * 0.95));

    job.speed = THREE.MathUtils.damp(job.speed, targetSpeed, 5.5, dt);

    const steerNorm = THREE.MathUtils.clamp(yawErr * 1.35, -1, 1);
    const turnRate = Math.max(1.8, specs.turnRate * 1.25);
    v.yaw += steerNorm * turnRate * dt;

    if (job.phase === 'park' && dist < 2.2) {
      const yawToPark = Math.atan2(
        Math.sin(job.targetYaw - v.yaw),
        Math.cos(job.targetYaw - v.yaw),
      );
      v.yaw += yawToPark * Math.min(1, dt * 4.5);
    }

    const wheelVisSteer = backingIntoBay ? -steerNorm : steerNorm;
    job.steerAngle = THREE.MathUtils.damp(
      job.steerAngle,
      THREE.MathUtils.clamp(wheelVisSteer * 0.52, -0.52, 0.52),
      10,
      dt,
    );

    const fwdX = Math.sin(v.yaw);
    const fwdZ = Math.cos(v.yaw);
    v.vx = fwdX * job.speed;
    v.vz = fwdZ * job.speed;
    let nextX = v.x + v.vx * dt;
    let nextZ = v.z + v.vz * dt;

    if (this.worldType === 'island') {
      const pCx = Math.floor(nextX / 16);
      const pCz = Math.floor(nextZ / 16);
      for (let gdx = -1; gdx <= 1; gdx++) {
        for (let gdz = -1; gdz <= 1; gdz++) {
          const bucket = this.colliderGrid.get((pCx + gdx + 2048) * 4096 + (pCz + gdz + 2048));
          if (!bucket) continue;
          for (let ci = 0; ci < bucket.length; ci++) {
            const col = bucket[ci];
            if (col.radius < 0.9) continue;
            if (
              Math.abs(col.x - VEHICLE_GARAGE_POS.x) < 14 &&
              Math.abs(col.z - VEHICLE_GARAGE_POS.z) < 9
            ) {
              continue;
            }
            const cdx = nextX - col.x;
            const cdz = nextZ - col.z;
            const minD = col.radius + 1.45;
            const cdSq = cdx * cdx + cdz * cdz;
            if (cdSq < minD * minD && cdSq > 0.0001) {
              const cd = Math.sqrt(cdSq);
              nextX = col.x + (cdx / cd) * minD;
              nextZ = col.z + (cdz / cd) * minD;
            }
          }
        }
      }
    }

    const parkClampRadius = getPlayableMaxRadius() + 14;
    v.x = THREE.MathUtils.clamp(nextX, -parkClampRadius, parkClampRadius);
    v.z = THREE.MathUtils.clamp(nextZ, -parkClampRadius, parkClampRadius);

    job.stuckTimer += dt;
    if (job.stuckTimer >= 1.2) {
      const moved = Math.hypot(v.x - job.lastProgressX, v.z - job.lastProgressZ);
      job.lastProgressX = v.x;
      job.lastProgressZ = v.z;
      job.stuckTimer = 0;
      if (moved < 0.45 && dist > 1.5) {
        v.yaw += 0.65;
      }
    }

    const surf = Math.max(
      getTerrainHeight(v.x, v.z),
      this.getStructuralSurfaceY(v.x, v.z, v.y + 0.8),
    );
    const water = getWaterLevelAt(v.x, v.z);
    const restY = Math.max(surf, water - 0.35);
    v.y = THREE.MathUtils.damp(v.y, restY, 10, dt);

    const sampleFwdY = Math.max(
      getTerrainHeight(v.x + fwdX * 1.4, v.z + fwdZ * 1.4),
      this.getStructuralSurfaceY(v.x + fwdX * 1.4, v.z + fwdZ * 1.4, v.y + 0.8),
    );
    const sampleBackY = Math.max(
      getTerrainHeight(v.x - fwdX * 1.4, v.z - fwdZ * 1.4),
      this.getStructuralSurfaceY(v.x - fwdX * 1.4, v.z - fwdZ * 1.4, v.y + 0.8),
    );
    const desiredPitch = THREE.MathUtils.clamp(
      Math.atan2(sampleBackY - sampleFwdY, 2.8),
      -0.35,
      0.35,
    );
    job.pitchAngle = THREE.MathUtils.damp(job.pitchAngle, desiredPitch, 8, dt);
  }

  public parkVehicleInGarage(vehicleId: string, bay: 'A' | 'B' | 'C' | 'D' = 'A'): boolean {
    const v = this.vehicles.find((x) => x.id === vehicleId);
    if (!v) return false;
    this.autoParkJobs.delete(v.id);
    const offsetX = bay === 'A' ? -9.0 : bay === 'B' ? -3.0 : bay === 'C' ? 3.0 : 9.0;
    const offsetZ = 0.6;
    v.x = VEHICLE_GARAGE_POS.x + offsetX;
    v.z = VEHICLE_GARAGE_POS.z + offsetZ;
    v.y = getTerrainHeight(v.x, v.z) + 0.14;
    v.vx = 0;
    v.vy = 0;
    v.vz = 0;
    v.yaw = 0;
    const vh = this.vehicleMeshes.get(v.id);
    if (vh) {
      vh.root.position.set(v.x, v.y, v.z);
      vh.root.rotation.set(0, v.yaw, 0);
    }
    this.p2p?.broadcast({ type: 'vehicle_upsert', vehicle: v });
    this.sound.playWeldSnap();
    this.toast(`Parked ${v.name} neatly in Garage Bay ${bay}`, 'info');
    this.emitHud();
    return true;
  }

  public togglePlayerFlight(forceState?: boolean, customFlySpeed?: number): boolean {
    if (
      forceState !== false &&
      (this.mode !== 'playing' ||
        !canProcessGameplayInput(this.masterRuntime) ||
        this.gameOver ||
        this.cinematicActive)
    ) {
      return this.flightAndTeleport.flying;
    }
    if (typeof customFlySpeed === 'number' && Number.isFinite(customFlySpeed)) {
      this.flightAndTeleport.flySpeed = customFlySpeed;
    }
    this.flightPlayerProxy.x = this.playerX;
    this.flightPlayerProxy.y = this.playerY;
    this.flightPlayerProxy.z = this.playerZ;
    this.flightPlayerProxy.mode =
      this.gameMode === 'sandbox' || this.worldType === 'flat' ? 'Creative' : 'Survival';

    const nextState = this.flightAndTeleport.toggleFlight(forceState);
    if (nextState) {
      this.grounded = false;
      this.isSwimming = false;
      this.playerVelY = 0;
      const safeFloor = Math.max(getTerrainHeight(this.playerX, this.playerZ), getWaterLevelAt(this.playerX, this.playerZ));
      if (this.playerY < safeFloor + 2.0) {
        this.playerY = safeFloor + 2.5;
        this.flightPlayerProxy.y = this.playerY;
      }
    } else {
      this.touchFlyAscend = false;
      this.touchFlyDescend = false;
      if (this.dragonFlight.flying) {
        this.dragonFlight.flying = false;
      }
    }
    this.emitHud();
    return nextState;
  }

  public setTouchFlyAscend(active: boolean): void {
    if (
      active &&
      (this.mode !== 'playing' ||
        !canProcessGameplayInput(this.masterRuntime) ||
        this.gameOver ||
        this.cinematicActive)
    ) {
      this.touchFlyAscend = false;
      return;
    }
    if (active && !this.flightAndTeleport.flying) {
      this.togglePlayerFlight(true);
    }
    this.touchFlyAscend = active;
  }

  public setTouchFlyDescend(active: boolean): void {
    if (
      active &&
      (this.mode !== 'playing' ||
        !canProcessGameplayInput(this.masterRuntime) ||
        this.gameOver ||
        this.cinematicActive)
    ) {
      this.touchFlyDescend = false;
      return;
    }
    this.touchFlyDescend = active;
  }

  public teleportToBiome(rawInput: string): boolean {
    if (
      this.mode !== 'playing' ||
      !canProcessGameplayInput(this.masterRuntime) ||
      this.gameOver ||
      this.cinematicActive
    ) {
      return false;
    }
    this.seatedState = null;
    this.vaultTimer = 0;
    this.flightPlayerProxy.x = this.playerX;
    this.flightPlayerProxy.y = this.playerY;
    this.flightPlayerProxy.z = this.playerZ;
    this.flightPlayerProxy.mode =
      this.gameMode === 'sandbox' || this.worldType === 'flat' ? 'Creative' : 'Survival';

    const result = this.flightAndTeleport.teleportTo(rawInput);
    if (result.ok) {
      this.playerX = this.flightPlayerProxy.x;
      this.playerY = this.flightPlayerProxy.y;
      this.playerZ = this.flightPlayerProxy.z;
      this.playerVelY = 0;
      this.grounded = false;
      this.isSwimming = false;
      this.markExploredAroundPlayer();
      this.nearbyInteraction = this.findNearbyInteraction();
      this.updateCamera();
      this.emitHud();
    }
    return result.ok;
  }

  public sanitizeWorld(): { fixedProps: number; removedBroken: number } {
    const entityList = [
      ...this.creatures.creatures.map((c) => ({
        id: c.id,
        x: c.x,
        y: c.y,
        z: c.z,
        vy: 0,
        canFly:
          c.species === 'bird' ||
          c.species === 'toucan' ||
          c.species === 'bald_eagle' ||
          c.species === 'peregrine_falcon' ||
          c.species === 'great_horned_owl' ||
          c.species === 'pteranodon' ||
          c.species === 'parrot' ||
          c.species === 'bee' ||
          c.species === 'vex',
        isWatercraft:
          c.species === 'great_white_shark' ||
          c.species === 'manta_ray' ||
          c.species === 'dolphin' ||
          c.species === 'sea_turtle' ||
          c.species === 'saltwater_crocodile',
        _creature: c,
      })),
      ...this.vehicles.map((v) => {
        const vSpecs = this.getVehicleSpecs(v);
        return {
          id: v.id,
          x: v.x,
          y: v.y,
          z: v.z,
          vy: v.vy,
          canFly: vSpecs.canFly,
          isWatercraft: vSpecs.canFloat,
          _vehicle: v,
        };
      }),
    ];

    const report = sanitizeWorldAndEntities(
      {
        props: this.structures,
        entities: entityList,
      },
      {
        getGroundY: (x, z) => getTerrainHeight(x, z),
        waterLevel: 0,
        maxWorldRadius: getPlayableMaxRadius() + 180,
        maxPropCount: 1200,
      },
    );

    // Sync any corrected entity heights back to active creatures & vehicles
    for (const item of entityList) {
      if ('_creature' in item && item._creature) {
        item._creature.y = item.y;
      } else if ('_vehicle' in item && item._vehicle) {
        item._vehicle.y = item.y;
        item._vehicle.vy = item.vy;
      }
    }

    // Sync any grounded structure meshes
    for (const st of this.structures) {
      const vis = this.structureVisuals.get(st.id);
      if (vis) {
        vis.group.position.set(st.x, st.y, st.z);
      }
    }

    return report;
  }

  public executeConsoleCommand(cmdStr: string): void {
    const parts = cmdStr.trim().toLowerCase().split(/\s+/);
    const cmd = parts[0];
    const arg = parts[1];

    if (cmd === '/sanitize' || cmd === 'sanitize') {
      const res = this.sanitizeWorld();
      this.toast(
        `World sanitized: ${res.fixedProps} grounded/fixed, ${res.removedBroken} broken removed`,
        'discovery',
      );
      return;
    }

    if (cmd === '/fly' || cmd === 'fly') {
      const explicit =
        arg === 'on' || arg === 'true'
          ? true
          : arg === 'off' || arg === 'false'
            ? false
            : undefined;
      this.togglePlayerFlight(explicit);
      return;
    }

    if (cmd === '/god') {
      this.vitals.health = 9999;
      this.vitals.maxHealth = 9999;
      this.vitals.hunger = 100;
      this.vitals.thirst = 100;
      this.vitals.stamina = 100;
      this.toast('God mode enabled: Infinite vitals & invulnerability!', 'discovery');
    } else if (cmd === '/weather') {
      if (['clear', 'rain', 'storm', 'overcast', 'fog', 'meteor', 'monsoon'].includes(arg)) {
        if (arg === 'monsoon') {
          this.weather = 'storm';
        } else if (arg === 'fog') {
          this.weather = 'overcast';
        } else if (arg === 'meteor') {
          this.weather = 'storm';
          this.cameraShakeTimer = 0.8;
          this.sound.playAttack('gun');
          this.toast('Meteor shower storm triggered across the island!', 'discovery');
        } else {
          this.weather = arg as any;
        }
        this.toast(`Weather set to ${arg}`, 'info');
      } else {
        this.toast('Invalid weather. Use clear, monsoon, fog, meteor', 'warning');
      }
    } else if (cmd === '/time') {
      if (arg === 'dawn') this.timeOfDay = 0.26;
      else if (arg === 'midday') this.timeOfDay = 0.5;
      else if (arg === 'dusk') this.timeOfDay = 0.74;
      else if (arg === 'night') this.timeOfDay = 0.88;
      else if (arg === 'bloodmoon') {
        this.timeOfDay = 0.94;
        this.moonLight.color.setHex(0xdc2626);
        this.toast('Bloodmoon risen! Nocturnal predators frenzied.', 'warning');
      } else {
        this.timeOfDay = Number(arg) || 0.4;
      }
      this.toast(`Time of day set to ${arg || this.timeOfDay.toFixed(2)}`, 'info');
    } else if (cmd === '/gravity') {
      const g = parseFloat(arg) || 9.8;
      this.gravityScale = g / 9.8;
      this.toast(`Gravity scale set to ${g} m/s²`, 'info');
    } else if (cmd === '/erosion') {
      const spd = parseFloat(arg) || 1.0;
      this.erosionSpeedMult = spd;
      this.toast(`Fluid erosion speed set to ${spd}x`, 'info');
    } else if (cmd === '/clear') {
      this.toast('Console log cleared', 'info');
    } else if (cmd === '/tame') {
      this.tameNearestCreature();
    } else if (cmd === '/mount') {
      if (this.mountedCreatureId) {
        this.dismountCreature();
      } else {
        const tamed = this.creatures.creatures.find(
          (c) => c.tamed && c.alive && Math.hypot(c.x - this.playerX, c.z - this.playerZ) < 15,
        );
        if (tamed) {
          this.mountCreature(tamed);
        } else {
          this.tameNearestCreature();
          const newlyTamed = this.creatures.creatures.find((c) => c.tamed && c.alive);
          if (newlyTamed) this.mountCreature(newlyTamed);
        }
      }
    } else if (cmd === '/spawn') {
      const cx = this.playerX + Math.sin(this.playerYaw) * 6;
      const cz = this.playerZ + Math.cos(this.playerYaw) * 6;
      const speciesAliases: Record<string, CreatureSpecies> = {
        raptor: 'velociraptor',
        velociraptor: 'velociraptor',
        trex: 'trex',
        tyrannosaurus: 'trex',
        triceratops: 'triceratops',
        stegosaurus: 'stegosaurus',
        brachiosaurus: 'brachiosaurus',
        parasaurolophus: 'parasaurolophus',
        spinosaurus: 'spinosaurus',
        spino: 'spinosaurus',
        ankylosaurus: 'ankylosaurus',
        allosaurus: 'allosaurus',
        dilophosaurus: 'dilophosaurus',
        diplodocus: 'diplodocus',
        pteranodon: 'pteranodon',
        elephant: 'elephant',
        reindeer: 'reindeer',
        giraffe: 'giraffe',
        zebra: 'zebra',
        rhino: 'rhinoceros',
        rhinoceros: 'rhinoceros',
        hippo: 'hippopotamus',
        hippopotamus: 'hippopotamus',
        tiger: 'tiger',
        lion: 'african_lion',
        african_lion: 'african_lion',
        cheetah: 'cheetah',
        hyena: 'hyena',
        polarbear: 'polar_bear',
        polar_bear: 'polar_bear',
        moose: 'moose',
        penguin: 'penguin',
        gorilla: 'gorilla',
        kangaroo: 'kangaroo',
        camel: 'camel',
        toucan: 'toucan',
        flamingo: 'flamingo',
        falcon: 'peregrine_falcon',
        peregrine_falcon: 'peregrine_falcon',
        ostrich: 'ostrich',
        eagle: 'bald_eagle',
        bald_eagle: 'bald_eagle',
        owl: 'great_horned_owl',
        wolf: 'gray_wolf',
        bear: 'grizzly_bear',
        fox: 'red_fox',
        croc: 'saltwater_crocodile',
        crocodile: 'saltwater_crocodile',
        bison: 'bison',
        deer: 'deer',
        turtle: 'sea_turtle',
        sea_turtle: 'sea_turtle',
        shark: 'great_white_shark',
        great_white_shark: 'great_white_shark',
        manta: 'manta_ray',
        manta_ray: 'manta_ray',
        dolphin: 'dolphin',
        bee: 'bee',
        creaking: 'creaking',
        whitefox: 'white_fox',
        white_fox: 'white_fox',
        parrot: 'parrot',
        ocelot: 'ocelot',
        panda: 'panda',
        vex: 'vex',
        evoker: 'evoker',
        pillager: 'pillager',
        witch: 'witch',
      };
      const mappedSpecies = speciesAliases[arg];
      if (mappedSpecies) {
        this.creatures.spawnWildAnimalAt(mappedSpecies, cx, cz);
        this.toast(`Spawned ${mappedSpecies.replace(/_/g, ' ')} at crosshair`, 'discovery');
      } else if (arg === 'totem') {
        this.addItem('totem_of_undying', 1);
        this.toast('Spawned Totem of Undying', 'discovery');
      } else if (arg === 'wildlife' || arg === 'safari') {
        const herd: CreatureSpecies[] = ['elephant', 'reindeer', 'giraffe', 'zebra', 'tiger', 'spinosaurus', 'pteranodon'];
        herd.forEach((sp, idx) => {
          this.creatures.spawnWildAnimalAt(sp, cx + (idx - 3) * 3.2, cz + (idx % 2) * 3.5);
        });
        this.toast('Spawned Wild Safari & Dinosaur Herd!', 'discovery');
      } else if (arg === 'airship') {
        const v = createVehicleFromPreset('gyro_airship', 'gyro_airship', cx, this.playerY + 1.2, cz);
        this.spawnCustomVehicle(v);
      } else if (arg === 'rover') {
        const v = createVehicleFromPreset('expedition_rover', 'expedition_rover', cx, this.playerY + 0.5, cz);
        this.spawnCustomVehicle(v);
      } else if (arg === 'boat') {
        const v = createVehicleFromPreset('steam_boat', 'steam_boat', cx, this.playerY + 0.5, cz);
        this.spawnCustomVehicle(v);
      } else if (arg === 'gun') {
        this.addItem('gun', 1);
        this.addItem('ammo', 60);
        this.toast('Spawned Survival Gun + 60 rounds', 'discovery');
      } else if (arg === 'ammo') {
        this.addItem('ammo', 120);
        this.toast('Spawned 120 rounds of Ammo', 'discovery');
      } else if (arg === 'wood') {
        this.addItem('wood', 50);
        this.toast('Spawned 50× Timber', 'discovery');
      } else if (arg === 'stone') {
        this.addItem('stone', 50);
        this.toast('Spawned 50× Stone', 'discovery');
      } else {
        this.addItem('wood', 50);
        this.addItem('stone', 50);
        this.addItem('gun', 1);
        this.addItem('ammo', 120);
        this.toast('Spawned Creator Kit (Wood, Stone, Gun, Ammo)', 'discovery');
      }
    } else if (
      cmd === '/tp' ||
      cmd === 'tp' ||
      cmd === '/teleport' ||
      cmd === 'teleport' ||
      cmd === '/go' ||
      cmd === 'go' ||
      cmd === '/house' ||
      cmd === '/studio'
    ) {
      const target = cmd === '/house' ? 'house' : cmd === '/studio' ? 'studio' : arg;
      const fullTarget = parts.slice(1).join(' ').trim();
      if (target === 'house' && !parts[2]) {
        this.seatedState = null;
        this.vaultTimer = 0;
        this.playerX = HILL_HOUSE_POS.x + 8.2;
        this.playerZ = HILL_HOUSE_POS.z;
        this.playerY = Math.max(
          getTerrainHeight(this.playerX, this.playerZ),
          getHilltopBaseFloorY(this.playerX, this.playerZ, HILL_HOUSE_Y + 1),
        ) + 0.05;
        this.playerVelY = 0;
        this.camYaw = Math.PI / 2; // face West toward porch & front door
        this.camPitch = -0.05;
        this.playerYaw = this.camYaw + Math.PI;
        this.toast('Traveled to Hilltop Premade Shelter Porch', 'discovery');
      } else if (target === 'studio' && !parts[2]) {
        this.seatedState = null;
        this.vaultTimer = 0;
        this.playerX = HILL_HOUSE_POS.x + 2.05;
        this.playerZ = HILL_HOUSE_POS.z + 5.15;
        this.playerY = Math.max(
          this.world.hillHousePos.y + 0.08,
          getHilltopBaseFloorY(this.playerX, this.playerZ, this.world.hillHousePos.y + 1),
        );
        this.playerVelY = 0;
        this.camYaw = Math.PI - 0.34; // face South-West directly toward Control Room Desk & Recording Booth
        this.camPitch = -0.14;
        this.playerYaw = this.camYaw + Math.PI;
        this.toast('Entered Hilltop Shelter Dedicated Music Studio', 'discovery');
      } else if (target === 'mansion' && !parts[2]) {
        this.seatedState = null;
        this.vaultTimer = 0;
        this.playerX = WOODLAND_MANSION_POS.x;
        this.playerZ = WOODLAND_MANSION_POS.z + 7.2;
        this.playerY = getTerrainHeight(this.playerX, this.playerZ) + 0.05;
        this.playerVelY = 0;
        this.camYaw = 0; // face North straight into Mansion front doorway
        this.camPitch = -0.05;
        this.playerYaw = Math.PI;
        this.toast('Arrived outside the Woodland Mansion entrance', 'discovery');
      } else if (target === 'taiga_village') {
        this.seatedState = null;
        this.vaultTimer = 0;
        this.playerX = TAIGA_VILLAGE_POS.x;
        this.playerZ = TAIGA_VILLAGE_POS.z + 2.2;
        this.playerY = getTerrainHeight(this.playerX, this.playerZ) + 0.05;
        this.playerVelY = 0;
        this.camYaw = 0;
        this.camPitch = -0.05;
        this.playerYaw = Math.PI;
        this.toast('Arrived at Taiga Village', 'discovery');
      } else if (target === 'snowy_village') {
        this.seatedState = null;
        this.vaultTimer = 0;
        this.playerX = SNOWY_VILLAGE_POS.x;
        this.playerZ = SNOWY_VILLAGE_POS.z + 2.2;
        this.playerY = getTerrainHeight(this.playerX, this.playerZ) + 0.05;
        this.playerVelY = 0;
        this.camYaw = 0;
        this.camPitch = -0.05;
        this.playerYaw = Math.PI;
        this.toast('Arrived at Snowy Taiga Village', 'discovery');
      } else if (target === 'igloo') {
        this.seatedState = null;
        this.vaultTimer = 0;
        this.playerX = SNOWY_IGLOO_POS.x;
        this.playerZ = SNOWY_IGLOO_POS.z + 4.8;
        this.playerY = getTerrainHeight(this.playerX, this.playerZ) + 0.05;
        this.playerVelY = 0;
        this.camYaw = 0;
        this.camPitch = -0.05;
        this.playerYaw = Math.PI;
        this.toast('Arrived outside the Snowy Igloo', 'discovery');
      } else if (target === 'outpost') {
        this.seatedState = null;
        this.vaultTimer = 0;
        this.playerX = PILLAGER_OUTPOST_POS.x;
        this.playerZ = PILLAGER_OUTPOST_POS.z + 4.5;
        this.playerY = getTerrainHeight(this.playerX, this.playerZ) + 0.05;
        this.playerVelY = 0;
        this.camYaw = 0;
        this.camPitch = -0.05;
        this.playerYaw = Math.PI;
        this.toast('Arrived at Pillager Outpost', 'discovery');
      } else if (fullTarget && this.teleportToBiome(cmdStr)) {
        return;
      } else {
        this.toast('Usage: /tp <biome> (e.g. /tp desert, /tp dragon valley, /tp viking village, /tp resort corner, /tp ruined castle, /tp cherry grove)', 'warning');
      }
      this.nearbyInteraction = this.findNearbyInteraction();
      this.updateCamera();
    } else if (cmd === '/dance' || cmd === 'dance') {
      if (this.activeVehicleId) {
        this.toggleVehicleHydraulicsDance(this.activeVehicleId);
      } else {
        const nearestHyd = this.vehicles.find(
          (v) =>
            this.vehicleHasHydraulics(v) &&
            Math.hypot(v.x - this.playerX, v.z - this.playerZ) < 12,
        );
        if (nearestHyd) {
          this.toggleVehicleHydraulicsDance(nearestHyd.id);
        } else {
          this.toast('Enter or stand near a hydraulic vehicle to toggle Dance Mode.', 'warning');
        }
      }
      return;
    } else if (cmd === '/summon' || cmd === '/bring' || cmd === '/car') {
      const carQuery = parts.slice(1).join(' ').trim() || 'chevy tahoe';
      const resolved = resolveElevatorCarQuery(carQuery);
      if (resolved) {
        this.summonCarFromUndergroundElevator(resolved.id);
      } else {
        this.toast(`Could not find vault vehicle matching "${carQuery}".`, 'warning');
      }
      return;
    } else if (!cmd.startsWith('/') && resolveElevatorCarQuery(cmdStr)) {
      const resolved = resolveElevatorCarQuery(cmdStr);
      if (resolved) {
        this.summonCarFromUndergroundElevator(resolved.id);
        return;
      }
    } else if (!cmd.startsWith('/') && this.teleportToBiome(cmdStr)) {
      return;
    } else {
      this.toast(`Unknown command: ${cmd}. Available: /fly, /tp <biome>, /god, /spawn, /summon <car>, /dance, /weather, /time, /gravity, /erosion, /tame, /mount, /clear`, 'warning');
    }
    this.emitHud();
  }

  public spawnCreatorRelic(relicKey: string): void {
    const fx = this.playerX + Math.sin(this.playerYaw) * 5;
    const fz = this.playerZ + Math.cos(this.playerYaw) * 5;
    const fy = Math.max(getTerrainHeight(fx, fz), this.getStructuralSurfaceY(fx, fz, this.playerY));

    if (relicKey === 'gravity_monolith') {
      const structId = `struct_gravity_${Date.now()}`;
      const st: PlacedStructure = {
        id: structId,
        type: 'gravity_monolith',
        x: fx,
        y: fy,
        z: fz,
        rotationY: this.playerYaw,
      };
      this.structures.push(st);
      this.spawnStructure(st);
      this.toast('Spawned Vortex Gravity Monolith! Antigravity launch zone active.', 'discovery');
    } else if (relicKey === 'terraformer_orb') {
      this.terrainEngine.carveJaggedCrater(fx, fz, 5.2, 3.2);
      this.spawnParticles(fx, fy + 1.2, fz, 0x0284c7, 16);
      this.spawnParticles(fx, fy + 1.2, fz, 0xd97706, 12);
      this.sound.playAttack('gun');
      this.toast('Terraformer Orb detonated! Crater carved into terrain.', 'discovery');
    } else if (relicKey === 'kinetic_trap') {
      const structId = `struct_trap_${Date.now()}`;
      const st: PlacedStructure = {
        id: structId,
        type: 'spike_barricade',
        x: fx,
        y: fy,
        z: fz,
        rotationY: this.playerYaw,
      };
      this.structures.push(st);
      this.spawnStructure(st);
      this.toast('Placed Kinetic Trap tethered to automated defense line.', 'discovery');
    } else if (relicKey === 'timeshift_sundial') {
      const structId = `struct_sundial_${Date.now()}`;
      const st: PlacedStructure = {
        id: structId,
        type: 'timeshift_sundial',
        x: fx,
        y: fy,
        z: fz,
        rotationY: this.playerYaw,
      };
      this.structures.push(st);
      this.spawnStructure(st);
      this.timeOfDay = (this.timeOfDay + 0.25) % 1.0;
      this.toast('Placed Time-Shift Sundial Altar! Tap to scrub sun & moon.', 'discovery');
    } else if (relicKey === 'tamed_raptor') {
      this.creatures.spawnWildAnimalAt('velociraptor', fx, fz);
      const c = this.creatures.creatures[this.creatures.creatures.length - 1];
      if (c) {
        c.tamed = true;
        this.mountCreature(c);
      }
      this.toast('Summoned & Mounted Saddled Alpha Raptor!', 'discovery');
    } else if (relicKey === 'tamed_trex') {
      this.creatures.spawnWildAnimalAt('trex', fx, fz);
      const c = this.creatures.creatures[this.creatures.creatures.length - 1];
      if (c) {
        c.tamed = true;
        this.mountCreature(c);
      }
      this.toast('Summoned & Mounted Armored Apex T-Rex!', 'discovery');
    }
    this.emitHud();
  }

  public mountCreature(c: ActiveCreature): void {
    if (this.mountedCreatureId) {
      this.dismountCreature();
      return;
    }
    if (this.activeVehicleId) {
      this.exitVehicle();
    }
    this.mountedCreatureId = c.id;
    c.mounted = true;
    c.tamed = true;
    this.camYaw = c.yaw - Math.PI;
    this.camPitch = -0.15;
    this.toast(
      `Mounted ${c.displayNameOverride || c.spec.displayName} · WASD / Joystick to Ride · Sprint for Gallop · Space to Dismount`,
      'discovery',
    );
    this.emitHud();
  }

  public dismountCreature(): void {
    if (!this.mountedCreatureId) return;
    const c = this.creatures.creatures.find((x) => x.id === this.mountedCreatureId);
    if (c) {
      c.mounted = false;
      const sideX = Math.cos(c.yaw);
      const sideZ = -Math.sin(c.yaw);
      this.playerX = c.x + sideX * 2.2;
      this.playerZ = c.z + sideZ * 2.2;
      this.playerY = Math.max(
        getTerrainHeight(this.playerX, this.playerZ),
        this.getStructuralSurfaceY(this.playerX, this.playerZ, c.y + 1.5),
      );
      this.playerVelY = 0;
      this.grounded = true;
      this.camStepOffsetY = 0;
      this.camBobBlend = 0;
      this.wallTiltAngle = 0;
      this.camPitch = THREE.MathUtils.clamp(this.camPitch, -1.25, 1.25);
      this.playerYaw = this.camYaw + Math.PI;
      this.camera.rotation.order = 'YXZ';
      this.camera.up.set(0, 1, 0);
      this.toast(`Dismounted ${c.displayNameOverride || c.spec.displayName}`, 'info');
    }
    this.mountedCreatureId = null;
    this.emitHud();
  }

  public tameNearestCreature(): boolean {
    let closest: ActiveCreature | null = null;
    let closestDist = 14;
    for (const c of this.creatures.creatures) {
      if (!c.alive) continue;
      const d = Math.hypot(c.x - this.playerX, c.z - this.playerZ);
      if (d < closestDist) {
        closestDist = d;
        closest = c;
      }
    }
    if (closest) {
      closest.tamed = true;
      closest.hp = closest.maxHp;
      this.toast(
        `Tamed ${closest.displayNameOverride || closest.spec.displayName}! Companion will follow & protect you. Press E to ride.`,
        'discovery',
      );
      this.emitHud();
      return true;
    }
    this.toast('No creature nearby to tame. Approach within 14m or use /spawn', 'warning');
    return false;
  }

  private updateMountedCreatureControl(dt: number): void {
    const c = this.creatures.creatures.find((x) => x.id === this.mountedCreatureId);
    if (!c || !c.alive) {
      this.dismountCreature();
      return;
    }

    let moveRight = 0;
    let moveForward = 0;
    if (this.keys['KeyW'] || this.keys['key_w'] || this.keys['ArrowUp']) moveForward += 1;
    if (this.keys['KeyS'] || this.keys['key_s'] || this.keys['ArrowDown']) moveForward -= 1;
    if (this.keys['KeyD'] || this.keys['key_d'] || this.keys['ArrowRight']) moveRight += 1;
    if (this.keys['KeyA'] || this.keys['key_a'] || this.keys['ArrowLeft']) moveRight -= 1;
    moveRight += this.joyX;
    moveForward += this.joyY;
    moveForward = THREE.MathUtils.clamp(moveForward, -1, 1);
    moveRight = THREE.MathUtils.clamp(moveRight, -1, 1);

    const sprinting = Boolean(
      this.keys['ShiftLeft'] ||
        this.keys['ShiftRight'] ||
        this.keys['key_shift'] ||
        this.touchSprint,
    );

    const baseSpd = sprinting ? c.spec.chaseSpeed * 1.4 : c.spec.walkSpeed * 1.15;

    if (Math.abs(moveRight) > 0.05) {
      c.yaw += -moveRight * 2.8 * dt;
      this.camYaw += -moveRight * 2.4 * dt;
    }

    const fwdX = Math.sin(c.yaw);
    const fwdZ = Math.cos(c.yaw);

    if (Math.abs(moveForward) > 0.05) {
      const spd = moveForward * baseSpd;
      c.x += fwdX * spd * dt;
      c.z += fwdZ * spd * dt;
      c.stepAccum += dt * (sprinting ? 6.5 : 3.5);
    }

    c.y = getTerrainHeight(c.x, c.z);
    c.rig.root.position.set(c.x, c.y, c.z);
    c.rig.root.rotation.y = c.yaw;

    const seatHeight =
      c.species === 'trex' ||
      c.species === 'spinosaurus' ||
      c.species === 'elephant' ||
      c.species === 'brachiosaurus' ||
      c.species === 'diplodocus'
        ? 2.85
        : c.species === 'giraffe' || c.species === 'allosaurus'
          ? 2.4
          : 1.6;
    this.playerX = c.x;
    this.playerY = c.y + seatHeight;
    this.playerZ = c.z;
    this.playerYaw = c.yaw;
    this.currentSpeedMps = Math.abs(moveForward) * baseSpd;
    this.grounded = true;
    this.isSwimming = false;
    this.markExploredAroundPlayer();

    // Trample attack against nearby hostile creatures
    if (
      sprinting &&
      (c.species === 'trex' ||
        c.species === 'triceratops' ||
        c.species === 'velociraptor' ||
        c.species === 'spinosaurus' ||
        c.species === 'ankylosaurus' ||
        c.species === 'allosaurus' ||
        c.species === 'elephant' ||
        c.species === 'rhinoceros' ||
        c.species === 'hippopotamus' ||
        c.species === 'moose')
    ) {
      for (const target of this.creatures.creatures) {
        if (target.id === c.id || !target.alive) continue;
        if (Math.hypot(target.x - c.x, target.z - c.z) < 2.8) {
          this.creatures.damageCreature(target, 45, c.x, c.z, { stunSeconds: 0.8, knockback: 3.5 });
          this.sound.playAttack('melee');
          this.spawnParticles(target.x, target.y + 0.8, target.z, 0xdc2626, 5);
        }
      }
    }
  }

  private initMultiplayerAndMods(): void {
    this.modSystem = new ModSystemManager(this.scene, {
      toast: (msg, tone = 'info') => this.toast(msg, tone),
      giveItem: (itemId, qty) => {
        if (ITEMS[itemId]) {
          this.addItem(itemId, qty, true);
          this.emitHud();
        }
      },
      spawnCreature: (species) => {
        const cx = this.playerX + Math.sin(this.playerYaw) * 6;
        const cz = this.playerZ + Math.cos(this.playerYaw) * 6;
        this.creatures.spawnWildAnimalAt(species as CreatureSpecies, cx, cz);
      },
      setWeather: (w) => {
        this.weather = w;
        this.emitHud();
      },
      setTime: (t) => {
        this.timeOfDay = THREE.MathUtils.clamp(t, 0, 0.999);
        this.emitHud();
      },
      getPlayerPos: () => ({ x: this.playerX, y: this.playerY, z: this.playerZ }),
      onTweaksUpdated: (tweaks) => {
        if (this.p2p?.connected && this.p2p.isHost) {
          this.p2p.broadcast({ type: 'mod_tweaks', tweaks });
        }
        this.emitHud();
      },
    });

    this.p2p = new P2PMultiplayerManager({
      onPacket: (fromPeerId, packet) => this.handleP2PPacket(fromPeerId, packet),
      onPeerJoined: (peerId, name) => {
        this.toast(`${name} joined the island room!`, 'discovery');
        if (this.p2p.isHost) {
          this.p2p.sendToPeer(peerId, {
            type: 'world_sync',
            dayCount: this.dayCount,
            timeOfDay: this.timeOfDay,
            weather: this.weather,
            structures: this.structures,
            structuralBlocks: this.structuralBlocks,
            vehicles: this.vehicles,
            tweaks: this.modSystem.tweaks,
          });
        }
        this.emitHud();
      },
      onPeerLeft: (peerId) => {
        const entry = this.remotePlayers.get(peerId);
        if (entry) {
          this.scene.remove(entry.handle.group);
          entry.handle.backpackDispose();
          this.disposeObject3D(entry.handle.group);
          this.remotePlayers.delete(peerId);
          this.toast(`${entry.name} left the room`, 'info');
        }
        this.emitHud();
      },
      onStatusChanged: () => this.emitHud(),
    });
  }

  private getOrCreateRemotePlayer(peerId: string, name: string) {
    let entry = this.remotePlayers.get(peerId);
    if (!entry) {
      const palette = [0x0ea5e9, 0x10b981, 0xf59e0b, 0xec4899, 0x8b5cf6];
      const hash = peerId.split('').reduce((s, ch) => s + ch.charCodeAt(0), 0);
      const handle = createRemotePlayerMesh(name, palette[hash % palette.length]);
      handle.group.position.set(this.playerX, this.playerY, this.playerZ);
      this.scene.add(handle.group);
      entry = {
        name,
        handle,
        targetX: this.playerX,
        targetY: this.playerY,
        targetZ: this.playerZ,
        targetYaw: 0,
        anim: 'idle',
        vehicleId: null,
        biome: 'Beachfront',
        walkPhase: 0,
      };
      this.remotePlayers.set(peerId, entry);
    } else if (entry.name !== name) {
      this.scene.remove(entry.handle.group);
      entry.handle.backpackDispose();
      this.disposeObject3D(entry.handle.group);
      const palette = [0x0ea5e9, 0x10b981, 0xf59e0b, 0xec4899, 0x8b5cf6];
      const hash = peerId.split('').reduce((s, ch) => s + ch.charCodeAt(0), 0);
      const handle = createRemotePlayerMesh(name, palette[hash % palette.length]);
      handle.group.position.set(entry.targetX, entry.targetY, entry.targetZ);
      this.scene.add(handle.group);
      entry.name = name;
      entry.handle = handle;
    }
    return entry;
  }

  private upsertRemoteVehicle(rv: ModularVehicleData): void {
    const existing = this.vehicles.find((v) => v.id === rv.id);
    if (existing) {
      if (this.activeVehicleId === existing.id) return;
      existing.x = rv.x;
      existing.y = rv.y;
      existing.z = rv.z;
      existing.yaw = rv.yaw;
      existing.vx = rv.vx;
      existing.vy = rv.vy;
      existing.vz = rv.vz;
      existing.hp = rv.hp;
      existing.fuel = rv.fuel;
      const paintChanged =
        existing.paintColor !== rv.paintColor ||
        existing.rimColor !== rv.rimColor ||
        existing.suspensionOffset !== rv.suspensionOffset ||
        existing.wheelScale !== rv.wheelScale;
      if (paintChanged) {
        existing.paintColor = rv.paintColor;
        existing.rimColor = rv.rimColor;
        existing.suspensionOffset = rv.suspensionOffset;
        existing.wheelScale = rv.wheelScale;
        existing.hydraulicHop = rv.hydraulicHop;
        existing.turboBoost = rv.turboBoost;
        const old = this.vehicleMeshes.get(existing.id);
        if (old) {
          this.scene.remove(old.root);
          this.disposeObject3D(old.root);
        }
        const rebuilt = createModularVehicleMesh(existing);
        this.extractVehicleUnderglowLight(existing.id, rebuilt);
        rebuilt.root.position.set(existing.x, existing.y, existing.z);
        rebuilt.root.rotation.y = existing.yaw;
        this.attachVehicleShadowDisc(existing.id, rebuilt.root);
        applyRealisticMeshLightingPass(rebuilt.root, {
          shadowsEnabled: this.effectiveShadowsEnabled,
          envMapIntensity: 1.0,
        });
        this.scene.add(rebuilt.root);
        this.vehicleMeshes.set(existing.id, rebuilt);
      }
      return;
    }
    this.spawnVehicleInstance({ ...rv, modules: rv.modules.map((m) => ({ ...m })), cargoItems: [] });
  }

  private handleP2PPacket(fromPeerId: string, packet: P2PPacket): void {
    if (packet.type === 'player_state') {
      const rp = this.getOrCreateRemotePlayer(fromPeerId, packet.name);
      rp.targetX = packet.x;
      rp.targetY = packet.y;
      rp.targetZ = packet.z;
      rp.targetYaw = packet.yaw;
      rp.anim = packet.anim;
      rp.vehicleId = packet.vehicleId;
      rp.biome = packet.biome;
      const hasGun = Boolean(packet.heldItemId && isFirearmItem(packet.heldItemId));
      rp.handle.heldGunMesh.visible = hasGun;
      rp.handle.heldToolMesh.visible = Boolean(packet.heldItemId) && !hasGun;

      // Sync remote player's equipped Gun Skin (cosmetic only)
      const incomingGunSkinId = packet.gunSkinId ?? null;
      if (rp.appliedGunSkinId !== incomingGunSkinId) {
        rp.appliedGunSkinId = incomingGunSkinId;
        const gunMat = rp.handle.heldGunMesh.material;
        if (gunMat instanceof THREE.MeshStandardMaterial) {
          const skin = incomingGunSkinId ? getExchangeItemById(incomingGunSkinId) : null;
          if (skin && skin.category === 'gun_skin') {
            const imgTex = getCosmeticImageTexture(skin.productImageUrl);
            gunMat.color.set(imgTex ? '#ffffff' : skin.visual.primaryHex);
            gunMat.metalness = skin.visual.metalness;
            gunMat.roughness = skin.visual.roughness;
            gunMat.map = imgTex || getCosmeticPatternTexture(skin.visual);
            if (skin.visual.emissiveHex) {
              gunMat.emissive.set(skin.visual.emissiveHex);
              gunMat.emissiveIntensity = 0.28;
            } else {
              gunMat.emissive.set(0x000000);
              gunMat.emissiveIntensity = 0;
            }
          } else {
            gunMat.color.set(0x1f2937);
            gunMat.metalness = 0.65;
            gunMat.roughness = 0.35;
            gunMat.map = null;
            gunMat.emissive.set(0x000000);
            gunMat.emissiveIntensity = 0;
          }
          gunMat.needsUpdate = true;
        }
      }

      // Sync remote player's equipped Backpack Skin (cosmetic only) using sculpted 3D pack mesh
      const incomingBackpackSkinId = packet.backpackSkinId ?? null;
      if (rp.appliedBackpackSkinId !== incomingBackpackSkinId) {
        rp.appliedBackpackSkinId = incomingBackpackSkinId;
        const skin = incomingBackpackSkinId
          ? getExchangeItemById(incomingBackpackSkinId) ?? null
          : null;
        applyBackpackSkinToPlayerHandle(rp.handle, skin);
      }

      if (packet.vehicleId && packet.vx !== undefined && packet.vz !== undefined && packet.vyaw !== undefined) {
        const veh = this.vehicles.find((v) => v.id === packet.vehicleId);
        if (veh && this.activeVehicleId !== veh.id) {
          veh.x = THREE.MathUtils.lerp(veh.x, packet.vx, 0.65);
          veh.z = THREE.MathUtils.lerp(veh.z, packet.vz, 0.65);
          veh.yaw = packet.vyaw;
        }
      }
    } else if (packet.type === 'place_structure') {
      if (!this.structures.some((s) => s.id === packet.structure.id)) {
        this.spawnStructure({ ...packet.structure });
        this.emitHud();
      }
    } else if (packet.type === 'place_block') {
      if (!this.structuralBlocks.some((b) => b.id === packet.block.id)) {
        this.spawnStructuralBlockInstance({ ...packet.block });
        this.recalculateStructuralIntegrity(false);
        this.emitHud();
      }
    } else if (packet.type === 'vehicle_upsert') {
      this.upsertRemoteVehicle(packet.vehicle);
      this.emitHud();
    } else if (packet.type === 'combat_shot') {
      const dist = Math.hypot(packet.toX - packet.fromX, packet.toY - packet.fromY, packet.toZ - packet.fromZ);
      if (dist > 0.2 && this.p2pTracerPool.length > 0) {
        const tracer =
          this.p2pTracerPool[this.p2pTracerIdx % this.p2pTracerPool.length];
        this.p2pTracerIdx += 1;
        const len = Math.min(28, dist);
        tracer.mesh.scale.set(1, len, 1);
        tracer.mesh.position.set(
          (packet.fromX + packet.toX) * 0.5,
          (packet.fromY + packet.toY) * 0.5,
          (packet.fromZ + packet.toZ) * 0.5,
        );
        _vec3A
          .set(
            packet.toX - packet.fromX,
            packet.toY - packet.fromY,
            packet.toZ - packet.fromZ,
          )
          .normalize();
        tracer.mesh.quaternion.setFromUnitVectors(_upAxis, _vec3A);
        tracer.mesh.visible = true;
        tracer.life = 0.12;
        this.spawnParticles(packet.fromX, packet.fromY, packet.fromZ, 0xfbbf24, 6);
      }
    } else if (packet.type === 'creature_damage') {
      const target = this.creatures.creatures.find((c) => c.id === packet.creatureId);
      if (target && target.alive) {
        this.creatures.damageCreature(target, packet.damage, packet.fromX, packet.fromZ);
      }
    } else if (packet.type === 'player_hit') {
      if (packet.targetPeerId === this.p2p.localPeerId && this.p2p.pvpEnabled && !this.gameOver) {
        this.vitals.health = Math.max(0, this.vitals.health - packet.damage);
        this.hurtFlash = 0.45;
        this.sound.playHurt();
        this.toast(`${packet.attackerName} shot you (-${packet.damage} HP)!`, 'warning');
        if (this.vitals.health <= 25) {
          this.checkAndTriggerTotemOfUndying();
        }
        if (this.vitals.health <= 0) {
          this.gameOver = true;
          this.gameOverReason = `Eliminated in PvP by ${packet.attackerName}`;
        }
        this.emitHud();
      }
    } else if (packet.type === 'world_sync') {
      this.dayCount = packet.dayCount;
      this.timeOfDay = packet.timeOfDay;
      this.weather = packet.weather;
      for (const st of packet.structures) {
        if (!this.structures.some((x) => x.id === st.id)) {
          this.spawnStructure({ ...st });
        }
      }
      for (const blk of packet.structuralBlocks) {
        if (!this.structuralBlocks.some((x) => x.id === blk.id)) {
          this.spawnStructuralBlockInstance({ ...blk });
        }
      }
      this.recalculateStructuralIntegrity(false);
      for (const rv of packet.vehicles) {
        this.upsertRemoteVehicle(rv);
      }
      if (packet.tweaks) {
        this.modSystem.setTweaks(packet.tweaks);
      }
      this.toast('Synced island buildings, vehicles & mods from host!', 'discovery');
      this.emitHud();
    } else if (packet.type === 'mod_tweaks') {
      this.modSystem.setTweaks(packet.tweaks);
      this.emitHud();
    } else if (packet.type === 'chat') {
      this.p2pChatLog.push({
        peerId: packet.peerId,
        name: packet.name,
        text: packet.text,
        time: Date.now(),
      });
      if (this.p2pChatLog.length > 40) this.p2pChatLog.shift();
      this.toast(`${packet.name}: ${packet.text}`, 'info');
      this.emitHud();
    }
  }

  private updateMultiplayer(dt: number): void {
    if (this.hydraulicBounceTimer > 0) {
      this.hydraulicBounceTimer = Math.max(0, this.hydraulicBounceTimer - dt);
    }

    for (const [peerId, rp] of this.remotePlayers.entries()) {
      const h = rp.handle;
      h.group.position.x = THREE.MathUtils.damp(h.group.position.x, rp.targetX, 12, dt);
      h.group.position.y = THREE.MathUtils.damp(h.group.position.y, rp.targetY, 12, dt);
      h.group.position.z = THREE.MathUtils.damp(h.group.position.z, rp.targetZ, 12, dt);

      const curYaw = h.group.rotation.y;
      const diffYaw = ((rp.targetYaw - curYaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      h.group.rotation.y = curYaw + diffYaw * Math.min(1, dt * 12);

      if (h.speakerSprite) {
        const isSpeaking = this.p2p?.speakingPeers.has(peerId) ?? false;
        h.speakerSprite.visible = isSpeaking;
        if (isSpeaking) {
          const pulse = 1 + Math.sin(this.elapsed * 10) * 0.08;
          h.speakerSprite.scale.set(0.76 * pulse, 0.34 * pulse, 1);
          h.speakerSprite.position.y = 2.7 + Math.sin(this.elapsed * 6) * 0.03;
        }
      }

      const moveDist = Math.hypot(rp.targetX - h.group.position.x, rp.targetZ - h.group.position.z);
      const isMoving = rp.anim === 'walk' || rp.anim === 'sprint' || moveDist > 0.04;
      if (rp.anim === 'crouch') {
        h.bodyGroup.position.y = -0.35;
      } else {
        h.bodyGroup.position.y = 0;
      }
      if (isMoving) {
        const rate = rp.anim === 'sprint' ? 14 : 9;
        rp.walkPhase += dt * rate;
        const swing = Math.sin(rp.walkPhase) * 0.65;
        h.armL.rotation.x = swing;
        h.armR.rotation.x = -swing;
        h.legL.rotation.x = -swing;
        h.legR.rotation.x = swing;
      } else {
        h.armL.rotation.x = THREE.MathUtils.damp(h.armL.rotation.x, 0, 8, dt);
        h.armR.rotation.x = THREE.MathUtils.damp(h.armR.rotation.x, 0, 8, dt);
        h.legL.rotation.x = THREE.MathUtils.damp(h.legL.rotation.x, 0, 8, dt);
        h.legR.rotation.x = THREE.MathUtils.damp(h.legR.rotation.x, 0, 8, dt);
      }
    }

    if (this.p2p?.connected) {
      this.p2p.updatePlayerPosition(this.playerX, this.playerY, this.playerZ);
    }

    if (!this.p2p?.connected || this.mode !== 'playing') return;

    this.p2pStateSendAccum += dt;
    if (this.p2pStateSendAccum >= 0.065) {
      this.p2pStateSendAccum = 0;
      const anim: RemoteAnimState = this.activeVehicleId
        ? 'drive'
        : this.isSwimming
          ? 'swim'
          : this.isCrouching
            ? 'crouch'
            : this.isSprinting
              ? 'sprint'
              : this.currentSpeedMps > 0.4
                ? 'walk'
                : 'idle';
      const av = this.activeVehicleId
        ? this.vehicles.find((v) => v.id === this.activeVehicleId)
        : null;
      const eqItemId = this.getEquippedItemId();
      this.p2p.broadcast({
        type: 'player_state',
        peerId: this.p2p.localPeerId,
        name: this.p2p.playerName,
        x: this.playerX,
        y: this.playerY,
        z: this.playerZ,
        yaw: this.playerYaw,
        pitch: this.camPitch,
        anim,
        heldItemId: eqItemId,
        biome: BIOME_INFO[getBiomeAt(this.playerX, this.playerZ)].name,
        vehicleId: this.activeVehicleId,
        vx: av?.x,
        vz: av?.z,
        vyaw: av?.yaw,
        gunSkinId: getEquippedGunSkinForWeapon(eqItemId)?.id ?? null,
        backpackSkinId: getEquippedBackpackSkin()?.id ?? null,
      });
    }

    if (this.activeVehicleId) {
      this.p2pVehicleSyncAccum += dt;
      if (this.p2pVehicleSyncAccum >= 0.35) {
        this.p2pVehicleSyncAccum = 0;
        const av = this.vehicles.find((v) => v.id === this.activeVehicleId);
        if (av) this.p2p.broadcast({ type: 'vehicle_upsert', vehicle: av });
      }
    }
  }

  // ---- Survival Island Exchange Cosmetics (Visual-Only, Zero Stat Impact) ----
  public applyExchangeCosmetics(force = false): void {
    if (force) {
      this.localAppliedGunSkinId = undefined;
      this.localAppliedBackpackSkinId = undefined;
    }
    if (!this.handsRig?.gunMesh) return;
    const eqId = this.getEquippedItemId();
    const gunSkin = getEquippedGunSkinForWeapon(eqId);
    const key = `${eqId ?? 'none'}|${gunSkin?.id ?? 'default'}`;
    if (!force && key === this.lastAppliedGunSkinKey) return;
    this.lastAppliedGunSkinKey = key;

    const imgTex = gunSkin ? getCosmeticImageTexture(gunSkin.productImageUrl) : null;
    const tex = gunSkin ? imgTex || getCosmeticPatternTexture(gunSkin.visual) : null;
    let meshIdx = 0;
    this.handsRig.gunMesh.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const mat = obj.material;
      if (!(mat instanceof THREE.MeshStandardMaterial)) return;
      if (!obj.userData.__exchangeOrig) {
        obj.userData.__exchangeOrig = {
          color: mat.color.getHex(),
          metalness: mat.metalness,
          roughness: mat.roughness,
          emissive: mat.emissive.getHex(),
          emissiveIntensity: mat.emissiveIntensity,
          map: mat.map,
          normalMap: mat.normalMap,
          roughnessMap: mat.roughnessMap,
        };
      }
      if (gunSkin) {
        const useAccent = meshIdx % 3 === 2;
        const useSecondary = meshIdx % 3 === 1;
        mat.color.set(
          useAccent
            ? gunSkin.visual.accentHex
            : imgTex
              ? '#ffffff'
              : useSecondary
                ? gunSkin.visual.secondaryHex
                : gunSkin.visual.primaryHex,
        );
        mat.metalness = gunSkin.visual.metalness;
        mat.roughness = gunSkin.visual.roughness;
        applySafeStandardMaps(mat, { map: useAccent ? null : tex });
        if (gunSkin.visual.emissiveHex && useAccent) {
          mat.emissive.set(gunSkin.visual.emissiveHex);
          mat.emissiveIntensity = 0.45;
        } else if (gunSkin.visual.emissiveHex) {
          mat.emissive.set(gunSkin.visual.emissiveHex);
          mat.emissiveIntensity = 0.1;
        } else {
          mat.emissive.set(0x000000);
          mat.emissiveIntensity = 0;
        }
      } else {
        const orig = obj.userData.__exchangeOrig as {
          color: number;
          metalness: number;
          roughness: number;
          emissive: number;
          emissiveIntensity: number;
          map: THREE.Texture | null;
          normalMap: THREE.Texture | null;
          roughnessMap: THREE.Texture | null;
        };
        mat.color.setHex(orig.color);
        mat.metalness = orig.metalness;
        mat.roughness = orig.roughness;
        applySafeStandardMaps(mat, {
          map: orig.map,
          normalMap: orig.normalMap,
          roughnessMap: orig.roughnessMap,
        });
        mat.emissive.setHex(orig.emissive);
        mat.emissiveIntensity = orig.emissiveIntensity;
      }
      meshIdx += 1;
    });
  }

  // ---- Public P2P Multiplayer API ----
  public async createMultiplayerRoom(playerName?: string): Promise<string | null> {
    return this.p2p.createRoom(playerName);
  }

  public async joinMultiplayerRoom(code: string, playerName?: string): Promise<boolean> {
    return this.p2p.joinRoom(code, playerName);
  }

  public leaveMultiplayerRoom(): void {
    this.p2p.leaveRoom();
    for (const rp of this.remotePlayers.values()) {
      this.scene.remove(rp.handle.group);
      this.disposeObject3D(rp.handle.group);
    }
    this.remotePlayers.clear();
    this.emitHud();
  }

  public setMultiplayerName(name: string): void {
    this.p2p.setPlayerName(name);
  }

  public setPvpEnabled(enabled: boolean): void {
    this.p2p.setPvpEnabled(enabled);
  }

  public async initMicrophone(): Promise<boolean> {
    return this.p2p.initMicrophone();
  }

  public toggleMicMute(): boolean {
    return this.p2p.toggleMicMute();
  }

  public setVoiceMode(mode: 'party' | 'proximity'): void {
    this.p2p.setVoiceMode(mode);
  }

  public sendMultiplayerChat(text: string): void {
    const clean = text.trim().slice(0, 180);
    if (!clean) return;
    this.p2pChatLog.push({
      peerId: this.p2p.localPeerId,
      name: this.p2p.playerName,
      text: clean,
      time: Date.now(),
    });
    if (this.p2pChatLog.length > 40) this.p2pChatLog.shift();
    if (this.p2p.connected) {
      this.p2p.broadcast({
        type: 'chat',
        peerId: this.p2p.localPeerId,
        name: this.p2p.playerName,
        text: clean,
      });
    }
    this.emitHud();
  }

  public getMultiplayerChatLog(): { peerId: string; name: string; text: string; time: number }[] {
    return [...this.p2pChatLog];
  }

  // ---- Public In-Game Mod & Asset Importer API ----
  public setModTweaks(partial: Partial<ModGameplayTweaks>): void {
    this.modSystem.setTweaks(partial);
  }

  public resetModTweaks(): void {
    this.modSystem.resetTweaks();
    this.toast('Reset gameplay tweaks to defaults', 'info');
  }

  public async importModModelFile(file: File): Promise<CustomModAsset> {
    const fwdX = -Math.sin(this.camYaw);
    const fwdZ = -Math.cos(this.camYaw);
    const px = this.playerX + fwdX * 4.5;
    const pz = this.playerZ + fwdZ * 4.5;
    const py = getTerrainHeight(px, pz);
    const asset = await this.modSystem.importModelFromFile(file, px, py, pz, this.camYaw + Math.PI);
    this.emitHud();
    return asset;
  }

  public async importModModelUrl(url: string): Promise<CustomModAsset> {
    const fwdX = -Math.sin(this.camYaw);
    const fwdZ = -Math.cos(this.camYaw);
    const px = this.playerX + fwdX * 4.5;
    const pz = this.playerZ + fwdZ * 4.5;
    const py = getTerrainHeight(px, pz);
    const asset = await this.modSystem.importModelFromUrl(url, px, py, pz, this.camYaw + Math.PI);
    this.emitHud();
    return asset;
  }

  public updateModAssetTransform(assetId: string, patch: { scale?: number; rotationY?: number }): void {
    this.modSystem.updateAssetTransform(assetId, patch);
    this.emitHud();
  }

  public removeModAsset(assetId: string): void {
    this.modSystem.removeAsset(assetId);
    this.emitHud();
  }

  public async loadModScriptUrl(url: string, name?: string): Promise<CustomModScript> {
    const s = await this.modSystem.loadScriptFromUrl(url, name);
    this.toast(`Loaded mod script "${s.name}"`, 'craft');
    this.emitHud();
    return s;
  }

  public addModScript(name: string, code: string): CustomModScript {
    const s = this.modSystem.addAndRunScript(name, code);
    this.toast(`Activated mod "${s.name}"`, 'craft');
    this.emitHud();
    return s;
  }

  public toggleModScript(scriptId: string, enabled: boolean): void {
    this.modSystem.toggleScript(scriptId, enabled);
    this.emitHud();
  }

  public removeModScript(scriptId: string): void {
    this.modSystem.removeScript(scriptId);
    this.emitHud();
  }

  public exportModAndBuildBundle(): ModExportBundle {
    return {
      format: 'survival-island-modpack-v1',
      exportedAt: Date.now(),
      tweaks: { ...this.modSystem.tweaks },
      scripts: this.modSystem.scripts.map((s) => ({
        name: s.name,
        sourceUrl: s.sourceUrl,
        code: s.code,
        enabled: s.enabled,
      })),
      build: {
        structures: this.structures.map((s) => ({ ...s })),
        structuralBlocks: this.structuralBlocks.map((b) => ({ ...b })),
        vehicles: this.vehicles.map((v) => ({
          ...v,
          modules: v.modules.map((m) => ({ ...m })),
          cargoItems: [],
        })),
      },
    };
  }

  public importModAndBuildBundle(bundle: ModExportBundle): void {
    this.modSystem.applyBundle(bundle);
    const build = bundle.build;
    if (build && Array.isArray(build.structures)) {
      for (const st of build.structures) {
        if (!this.structures.some((x) => x.id === st.id)) {
          this.spawnStructure({ ...st });
        }
      }
    }
    if (build && Array.isArray(build.structuralBlocks)) {
      for (const blk of build.structuralBlocks) {
        if (!this.structuralBlocks.some((x) => x.id === blk.id)) {
          this.spawnStructuralBlockInstance({ ...blk });
        }
      }
      this.recalculateStructuralIntegrity(false);
    }
    if (build && Array.isArray(build.vehicles)) {
      for (const rv of build.vehicles) {
        this.upsertRemoteVehicle(rv);
      }
    }
    this.toast('Imported Mod & Build Share Bundle!', 'discovery');
    this.emitHud();
  }

  public selectPortalDimension(dim: DimensionId): void {
    this.selectedPortalDimension = dim;
    this.toast(`Portal Destination Set: ${DIMENSION_DEFINITIONS[dim]?.name || dim}`, 'info');
    this.emitHud();
  }

  private setOverworldActiveState(active: boolean): void {
    const showIsland = active && this.worldType === 'island';
    const showFlat = active && this.worldType === 'flat';

    if (this.world?.overworldGroup) {
      if (showIsland) {
        if (!this.world.overworldGroup.parent) {
          this.scene.add(this.world.overworldGroup);
        }
        this.world.overworldGroup.visible = true;
      } else {
        this.world.overworldGroup.visible = false;
        this.scene.remove(this.world.overworldGroup);
      }
    }
    this.flatWorld?.setVisible(showFlat);
    this.realisticOcean?.setVisible(showIsland);
    this.creatures?.setOverworldActive(showIsland);
    this.structureManager?.setDimensionVisible(showIsland);
    for (const v of this.structureVisuals.values()) v.group.visible = active;
    for (const m of this.structuralMeshes.values()) m.visible = active;
    for (const h of this.kineticMeshes.values()) h.root.visible = active;
    for (const bm of this.beltSpanMeshes) bm.group.visible = active;
    for (const cm of this.cropMeshes.values()) cm.visible = active;
    for (const p of this.pickups) p.mesh.visible = active;
    for (const c of this.carcasses) c.mesh.visible = showIsland;
    if (!active) {
      for (let i = 0; i < this.structureLightPool.length; i++) {
        this.structureLightPool[i].intensity = 0;
      }
      for (let i = 0; i < this.vehicleUnderglowPool.length; i++) {
        this.vehicleUnderglowPool[i].intensity = 0;
      }
      if (this.smartTv.tvGlowLight) {
        this.smartTv.tvGlowLight.intensity = 0;
      }
    }
  }

  private updateActivePortals(dt: number): void {
    for (const portal of this.activePortals) {
      const handle = this.portalHandles.get(portal.id);
      const visible = portal.sourceDim === this.currentDimension;
      if (handle) {
        handle.group.visible = visible;
        if (visible) {
          handle.update(this.elapsed, dt);
        }
      }
      if (visible && this.portalWarpCooldown <= 0) {
        const d = Math.hypot(portal.x - this.playerX, portal.z - this.playerZ);
        if (d < 1.85 && Math.abs(portal.y - this.playerY) < 3.0) {
          this.switchDimension(portal.targetDim);
          return;
        }
      }
    }
  }

  private buildSpaceHudSnapshot(): SpaceHudSnapshot {
    const sys =
      this.activeSpaceSystem ??
      MULTIVERSE_SPACE_ENGINE.generateStarSystem(
        MULTIVERSE_SPACE_ENGINE.currentUniverseId,
        MULTIVERSE_SPACE_ENGINE.currentGalaxyIndex,
        MULTIVERSE_SPACE_ENGINE.currentSystemIndex,
      );
    const gun = ALIEN_SPACE_SYSTEM.equippedAlienGun ?? ALIEN_SPACE_SYSTEM.alienGuns[0];
    return {
      inSpacePlanet: this.inSpacePlanet,
      universeId: sys.universe.id,
      universeName: sys.universe.name,
      galaxyIndex: sys.galaxyIndex,
      galaxyName: sys.galaxyName,
      systemIndex: sys.systemIndex,
      starName: sys.star.name,
      planetName: this.activeSpacePlanet?.name ?? null,
      planetBiome: this.activeSpacePlanet?.biome ?? null,
      gravity: this.inSpacePlanet ? this.spaceGravity : 1.0,
      activeUfo: ALIEN_SPACE_SYSTEM.activeUfo ? { ...ALIEN_SPACE_SYSTEM.activeUfo } : null,
      equippedAlienGunId: gun.id,
      equippedAlienGunName: gun.name,
      alienLootCount: ALIEN_SPACE_SYSTEM.alienLootInventory.length,
      earthPowerUps: ALIEN_SPACE_SYSTEM.earthPowerUpCount,
      islandUfoClaimed: Boolean(ALIEN_SPACE_SYSTEM.islandLandedUfo?.claimed),
      launchPhase: SATURN_V_LAUNCH_CONTROLLER.phase,
      launchAltitude: Math.round(SATURN_V_LAUNCH_CONTROLLER.altitude),
      launchVelocityY: Math.round(SATURN_V_LAUNCH_CONTROLLER.velocityY),
      launchStage: SATURN_V_LAUNCH_CONTROLLER.stage,
      launchOrbitAltitude: SATURN_V_LAUNCH_CONTROLLER.orbitAltitude,
      launchDestination: this.pendingLaunchTarget?.planet.name ?? null,
    };
  }

  public openSaturnRocketConsole(): void {
    this.sound.unlock();
    ALIEN_SPACE_SYSTEM.landUfoOnIsland({
      x: ISLAND_UFO_POS.x,
      y: 0,
      z: ISLAND_UFO_POS.z,
    });
    if (!ALIEN_SPACE_SYSTEM.equippedAlienGun) {
      ALIEN_SPACE_SYSTEM.equipAlienGun('alien_pulse_rifle');
    }
    this.callbacks.onOpenStation('saturn_rocket');
    this.emitHud();
  }

  private isNearElevatorTerminal(): boolean {
    if (this.inSpacePlanet || this.currentDimension !== 'overworld') return false;
    const tx = UNDERGROUND_ELEVATOR_KIOSK_POS.x - this.playerX;
    const tz = UNDERGROUND_ELEVATOR_KIOSK_POS.z - this.playerZ;
    const ty =
      getTerrainHeight(
        UNDERGROUND_ELEVATOR_KIOSK_POS.x,
        UNDERGROUND_ELEVATOR_KIOSK_POS.z,
      ) - this.playerY;
    return tx * tx + ty * ty + tz * tz <= ELEVATOR_TERMINAL_INTERACT_RADIUS_SQ;
  }

  public openUndergroundElevator(): void {
    this.sound.unlock();
    if (this.activeVehicleId) {
      this.exitVehicle();
    }
    this.callbacks.onOpenStation('underground_elevator');
    this.emitHud();
  }

  public summonCarFromUndergroundElevator(carIdOrQuery: string): void {
    const car =
      ELEVATOR_EXOTIC_LIFT.bringCarToSurface(carIdOrQuery) ??
      ELEVATOR_EXOTIC_LIFT.bringCarToSurface(
        resolveElevatorCarQuery(carIdOrQuery)?.id,
      );
    if (!car) return;

    this.sound.unlock();
    if (this.activeVehicleId && this.activeVehicleId === this.elevatorSummonedVehicleId) {
      this.exitVehicle();
    }

    // Remove previous surface car on the elevator pad if it is still sitting there
    if (this.elevatorSummonedVehicleId) {
      const prevIdx = this.vehicles.findIndex(
        (v) => v.id === this.elevatorSummonedVehicleId,
      );
      if (prevIdx !== -1) {
        const prev = this.vehicles[prevIdx];
        const distFromLift = Math.hypot(
          prev.x - UNDERGROUND_ELEVATOR_POS.x,
          prev.z - UNDERGROUND_ELEVATOR_POS.z,
        );
        if (distFromLift < 7.5) {
          this.vehicles.splice(prevIdx, 1);
          const oldMesh = this.vehicleMeshes.get(prev.id);
          if (oldMesh) {
            this.scene.remove(oldMesh.root);
            this.disposeObject3D(oldMesh.root);
            this.vehicleMeshes.delete(prev.id);
          }
        }
      }
    }

    const groundY = getTerrainHeight(
      UNDERGROUND_ELEVATOR_POS.x,
      UNDERGROUND_ELEVATOR_POS.z,
    );
    const vehiclePreset: VehiclePresetKey = car.preset ?? 'sports_car';
    const vehicleId = `exotic_lift_${car.id}_${Date.now().toString(36)}`;
    const spawned = createVehicleFromPreset(
      vehicleId,
      vehiclePreset,
      UNDERGROUND_ELEVATOR_POS.x,
      groundY - 5.8,
      UNDERGROUND_ELEVATOR_POS.z,
      0,
    );
    spawned.name = car.name;
    spawned.paintColor = car.paintColor;
    spawned.rimColor = car.rimColor;
    spawned.underglowColor = car.underglowColor;
    spawned.turboBoost = car.turboBoost;
    if (car.livery) {
      spawned.livery = { ...car.livery };
    }
    if (vehiclePreset === 'sports_car') {
      spawned.suspensionOffset = -0.12;
      spawned.wheelScale = 0.9;
    }

    this.vehicles.push(spawned);
    const handles = createModularVehicleMesh(spawned);
    this.extractVehicleUnderglowLight(spawned.id, handles);
    handles.root.position.set(spawned.x, spawned.y, spawned.z);
    handles.root.rotation.y = spawned.yaw;
    this.attachVehicleShadowDisc(spawned.id, handles.root);
    applyRealisticMeshLightingPass(handles.root, {
      shadowsEnabled: this.effectiveShadowsEnabled,
      envMapIntensity: 1.15,
    });
    this.vehicleMeshes.set(spawned.id, handles);
    this.scene.add(handles.root);

    this.elevatorSummonedVehicleId = spawned.id;
    this.elevatorTargetCar = car;
    this.elevatorLiftProgress = 0;
    this.elevatorLiftActive = true;
    this.elevatorSteamAccum = 0;
    this.world?.undergroundElevator?.setLiftProgress(0);
    this.sound.playSteamHiss();
    this.toast(
      `Underground Car Elevator lifting ${car.name} (${car.horsepower} HP) to the surface...`,
      'discovery',
    );
    this.emitHud();
  }

  private updateUndergroundElevatorLift(dt: number): void {
    const elev = this.world?.undergroundElevator;
    this.elevatorLiftProgress = Math.min(1, this.elevatorLiftProgress + dt / 2.6);
    // Smooth ease-in-out cubic curve for heavy hydraulic elevator feel
    const t = this.elevatorLiftProgress;
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    if (elev) {
      elev.setLiftProgress(eased);
      elev.beaconMat.emissiveIntensity = 1.2 + Math.abs(Math.sin(this.elapsed * 12)) * 1.4;
    }

    const groundY = getTerrainHeight(
      UNDERGROUND_ELEVATOR_POS.x,
      UNDERGROUND_ELEVATOR_POS.z,
    );
    const carY = groundY - 5.8 + 6.08 * eased;

    if (this.elevatorSummonedVehicleId) {
      const v = this.vehicles.find((x) => x.id === this.elevatorSummonedVehicleId);
      const mesh = this.vehicleMeshes.get(this.elevatorSummonedVehicleId);
      if (v && mesh) {
        v.x = UNDERGROUND_ELEVATOR_POS.x;
        v.z = UNDERGROUND_ELEVATOR_POS.z;
        v.y = carY;
        v.vx = 0;
        v.vy = 0;
        v.vz = 0;
        mesh.root.position.set(v.x, v.y, v.z);
      }
    }

    this.elevatorSteamAccum += dt;
    if (this.elevatorSteamAccum >= 0.14) {
      this.elevatorSteamAccum = 0;
      this.spawnParticles(
        UNDERGROUND_ELEVATOR_POS.x + (Math.random() - 0.5) * 4.5,
        groundY + 0.35,
        UNDERGROUND_ELEVATOR_POS.z + (Math.random() - 0.5) * 5.2,
        0x38bdf8,
        4,
      );
    }

    if (this.elevatorLiftProgress >= 1) {
      this.elevatorLiftActive = false;
      ELEVATOR_EXOTIC_LIFT.markReady();
      if (elev) {
        elev.beaconMat.emissiveIntensity = 0.85;
      }
      this.sound.playWeldSnap();
      if (this.elevatorTargetCar) {
        const arrivedLine = VAULT_COMPUTER_VOICE.speakCarArrived(
          this.elevatorTargetCar.name,
        );
        this.toast(arrivedLine, 'discovery');
      }
      this.emitHud();
    }
  }

  public launchRocketToSun(starName = 'Sol (The Sun)'): void {
    this.sound.unlock();
    this.sound.playExplosion();
    this.vitals.health = Math.max(10, this.vitals.health - 45);
    this.spawnParticles(this.playerX, this.playerY + 1.5, this.playerZ, 0xff5500, 26);
    this.toast(
      `SOLAR CORONA BURN! You burned up approaching ${starName} (-45 HP)! Emergency abort to pad!`,
      'warning',
    );
    this.emitHud();
  }

  private getActiveSaturnRocketHandles() {
    if (this.inSpacePlanet && this.spaceArena?.rocketBody && this.spaceArena.stage1Group && this.spaceArena.rocketFlame) {
      return {
        rootPos: new THREE.Vector3(0, 0, -14),
        rocketBody: this.spaceArena.rocketBody,
        stage1Group: this.spaceArena.stage1Group,
        flameGroup: this.spaceArena.rocketFlame,
      };
    }
    if (this.world?.saturnRocket) {
      return {
        rootPos: this.world.saturnRocket.root.position.clone(),
        rocketBody: this.world.saturnRocket.rocketBody,
        stage1Group: this.world.saturnRocket.stage1Group,
        flameGroup: this.world.saturnRocket.flameGroup,
      };
    }
    return null;
  }

  private resetActiveSaturnRocketMesh(): void {
    const handles = this.getActiveSaturnRocketHandles();
    if (!handles) return;
    handles.rocketBody.position.y = 2.0;
    handles.stage1Group.position.set(0, 0, 0);
    handles.stage1Group.rotation.set(0, 0, 0);
    handles.stage1Group.visible = true;
    handles.flameGroup.scale.set(1, 1, 1);
  }

  private updateSaturnVLaunch(dt: number): void {
    const prevStage = this.lastLaunchStage;
    const state = SATURN_V_LAUNCH_CONTROLLER.update(dt);
    this.saturnLaunchCameraShake = state.cameraShake;

    const handles = this.getActiveSaturnRocketHandles();
    if (handles) {
      // Visual lift scaled so the Saturn V rockets dramatically into the sky!
      handles.rocketBody.position.y = 2.0 + SATURN_V_LAUNCH_CONTROLLER.altitude * 0.42;

      // Roaring F-1 / J-2 exhaust plume
      const flameLen = 3.2 + Math.sin(this.elapsed * 48) * 0.85;
      handles.flameGroup.scale.set(1.55, flameLen, 1.55);

      // Stage 1 separation visual drop at 45% orbit altitude
      if (state.stage === 2) {
        if (prevStage === 1) {
          this.lastLaunchStage = 2;
          this.sound.playExplosion();
          const sepY = handles.rootPos.y + handles.rocketBody.position.y + 4;
          this.spawnParticles(handles.rootPos.x, sepY, handles.rootPos.z, 0xfbbf24, 24);
          this.toast(
            'STAGE 1 SEPARATION! S-II Second Stage Burn Engaged!',
            'discovery',
          );
        }
        handles.stage1Group.position.y -= 24 * dt;
        handles.stage1Group.rotation.z += 0.65 * dt;
      }

      // Fiery exhaust trail particles
      this.launchExhaustAccum += dt;
      if (this.launchExhaustAccum >= 0.065) {
        this.launchExhaustAccum = 0;
        const nozzleY = handles.rootPos.y + handles.rocketBody.position.y - 1.5;
        this.spawnParticles(
          handles.rootPos.x + (Math.random() - 0.5) * 1.8,
          Math.max(handles.rootPos.y + 0.8, nozzleY),
          handles.rootPos.z + (Math.random() - 0.5) * 1.8,
          state.stage === 1 ? 0xff7b1a : 0x38bdf8,
          6,
        );
      }

      // Tilt camera smoothly upward to watch the Saturn V climb into orbit
      const lookY = handles.rootPos.y + handles.rocketBody.position.y + 8;
      const dx = handles.rootPos.x - this.playerX;
      const dz = handles.rootPos.z - this.playerZ;
      const horiz = Math.max(4, Math.hypot(dx, dz));
      const targetPitch = THREE.MathUtils.clamp(
        Math.atan2(lookY - (this.playerY + this.currentEyeHeight), horiz),
        -0.3,
        1.28,
      );
      this.camPitch = THREE.MathUtils.damp(this.camPitch, targetPitch, 5.5, dt);
    }

    this.launchHudAccum += dt;
    if (this.launchHudAccum >= 0.08) {
      this.launchHudAccum = 0;
      this.emitHud();
    }
  }

  public launchRocketToPlanet(planet: SpacePlanet, system?: StarSystemData): void {
    if (planet.id === 'earth') {
      this.returnToEarthFromSpace();
      return;
    }
    this.sound.unlock();
    if (this.activeVehicleId) {
      this.exitVehicle();
    }

    const resolvedSystem =
      system ??
      MULTIVERSE_SPACE_ENGINE.generateStarSystem(
        planet.universeId ?? MULTIVERSE_SPACE_ENGINE.currentUniverseId,
        MULTIVERSE_SPACE_ENGINE.currentGalaxyIndex,
        MULTIVERSE_SPACE_ENGINE.currentSystemIndex,
      );

    // Position player at a clear launchpad viewing distance facing the Saturn V Rocket
    if (!this.inSpacePlanet) {
      const viewX = SATURN_ROCKET_POS.x + 2.5;
      const viewZ = SATURN_ROCKET_POS.z + 24.0;
      this.playerX = viewX;
      this.playerZ = viewZ;
      this.playerY = getTerrainHeight(viewX, viewZ) + 0.1;
      this.camYaw = Math.atan2(
        this.playerX - SATURN_ROCKET_POS.x,
        this.playerZ - SATURN_ROCKET_POS.z,
      );
      this.camPitch = 0.28;
    } else {
      this.playerX = 2.0;
      this.playerZ = 10.0;
      this.playerY = 0.2;
      this.camYaw = Math.atan2(this.playerX - 0, this.playerZ - -14);
      this.camPitch = 0.28;
    }

    this.pendingLaunchTarget = { planet, system: resolvedSystem };
    this.lastLaunchStage = 1;
    this.launchExhaustAccum = 0;
    this.launchHudAccum = 0;
    this.resetActiveSaturnRocketMesh();
    SATURN_V_LAUNCH_CONTROLLER.resetToPad();
    SATURN_V_LAUNCH_CONTROLLER.onOrbitReached = () => {
      this.completeSaturnVArrival();
    };
    const igniteState = SATURN_V_LAUNCH_CONTROLLER.ignite();
    this.saturnLaunchCameraShake = igniteState.cameraShake;
    this.sound.playExplosion();
    this.toast(
      `IGNITION! Saturn V launching for ${planet.name} (Orbit at ${SATURN_V_LAUNCH_CONTROLLER.orbitAltitude}m)...`,
      'discovery',
    );
    this.emitHud();
  }

  public igniteSaturnVQuickLaunch(): void {
    if (
      this.mode !== 'playing' ||
      !canProcessGameplayInput(this.masterRuntime) ||
      this.gameOver ||
      this.cinematicActive
    ) {
      return;
    }
    if (
      SATURN_V_LAUNCH_CONTROLLER.phase === 'IGNITION' ||
      SATURN_V_LAUNCH_CONTROLLER.phase === 'ASCENT'
    ) {
      return;
    }
    const sys =
      this.activeSpaceSystem ??
      MULTIVERSE_SPACE_ENGINE.generateStarSystem(
        MULTIVERSE_SPACE_ENGINE.currentUniverseId,
        MULTIVERSE_SPACE_ENGINE.currentGalaxyIndex,
        MULTIVERSE_SPACE_ENGINE.currentSystemIndex,
      );
    const currentId = this.activeSpacePlanet?.id;
    const nextPlanet =
      sys.planets.find((p) => p.id !== 'earth' && p.id !== currentId) ??
      sys.planets[0];
    this.launchRocketToPlanet(nextPlanet, sys);
  }

  private completeSaturnVArrival(): void {
    const target = this.pendingLaunchTarget;
    this.pendingLaunchTarget = null;
    this.saturnLaunchCameraShake = 0;
    this.resetActiveSaturnRocketMesh();
    SATURN_V_LAUNCH_CONTROLLER.resetToPad();
    if (!target) {
      this.emitHud();
      return;
    }
    this.enterSpacePlanet(target.planet, target.system);
  }

  private enterSpacePlanet(planet: SpacePlanet, resolvedSystem: StarSystemData): void {
    if (this.spaceArena) {
      this.scene.remove(this.spaceArena.root);
      this.spaceArena.dispose();
      this.spaceArena = null;
    }
    if (this.activeDimensionWorld) {
      disposeDimensionWorld(this.activeDimensionWorld);
      this.activeDimensionWorld = null;
    }

    MULTIVERSE_SPACE_ENGINE.currentUniverseId = resolvedSystem.universe.id;
    MULTIVERSE_SPACE_ENGINE.currentGalaxyIndex = resolvedSystem.galaxyIndex;
    MULTIVERSE_SPACE_ENGINE.currentSystemIndex = resolvedSystem.systemIndex;
    MULTIVERSE_SPACE_ENGINE.activePlanet = planet;

    this.activeSpaceSystem = resolvedSystem;
    this.activeSpacePlanet = planet;
    this.spaceGravity = THREE.MathUtils.clamp(planet.gravity || 0.6, 0.2, 2.3);
    this.inSpacePlanet = true;
    this.currentDimension = 'space';
    this.setOverworldActiveState(false);

    if (planet.hasUfoEncounter) {
      ALIEN_SPACE_SYSTEM.spawnUfo(planet.name, 150);
    } else {
      ALIEN_SPACE_SYSTEM.activeUfo = null;
    }
    if (!ALIEN_SPACE_SYSTEM.equippedAlienGun) {
      ALIEN_SPACE_SYSTEM.equipAlienGun('alien_pulse_rifle');
    }

    this.spaceArena = buildSpacePlanetArena(
      planet,
      resolvedSystem.star,
      resolvedSystem.universe,
      Boolean(planet.hasUfoEncounter),
    );
    this.scene.add(this.spaceArena.root);

    _skyColor.set(resolvedSystem.universe.skyTint || '#050814');
    if (this.scene.background instanceof THREE.Color) {
      this.scene.background.copy(_skyColor);
    } else {
      this.scene.background = _skyColor.clone();
    }
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.copy(_skyColor);
      this.scene.fog.density = 0.0022;
    }

    // Place player right in front of the landed Saturn V Rocket
    this.playerX = 0;
    this.playerY = 0.2;
    this.playerZ = -4;
    this.playerYaw = Math.PI;
    this.camYaw = 0;
    this.camPitch = 0.08;
    this.playerVelY = 0;
    this.grounded = true;
    this.sound.playExplosion();
    this.spawnParticles(0, 1.2, -14, 0xffaa33, 22);
    this.toast(
      `ORBIT REACHED! Saturn V Landed on ${planet.name} (${resolvedSystem.universe.name} · ${planet.gravity}g)!`,
      'discovery',
    );
    this.emitHud();
  }

  public jumpToSectorPlanet(planetNumber: number): void {
    const planet = ALIEN_SPACE_SYSTEM.getPlanet(planetNumber);
    const sys = MULTIVERSE_SPACE_ENGINE.generateStarSystem(
      planet.universeId ?? 2,
      0,
      planetNumber % 10,
    );
    this.launchRocketToPlanet(planet, sys);
  }

  public returnToEarthFromSpace(): void {
    if (this.spaceArena) {
      this.scene.remove(this.spaceArena.root);
      this.spaceArena.dispose();
      this.spaceArena = null;
    }
    this.inSpacePlanet = false;
    this.activeSpacePlanet = null;
    this.spaceGravity = 1.0;
    ALIEN_SPACE_SYSTEM.activeUfo = null;
    this.currentDimension = 'overworld';
    this.setOverworldActiveState(true);

    const padX = SATURN_ROCKET_POS.x;
    const padZ = SATURN_ROCKET_POS.z + 11.0;
    this.playerX = padX;
    this.playerZ = padZ;
    this.playerY = getTerrainHeight(padX, padZ) + 0.25;
    this.playerVelY = 0;
    this.grounded = true;
    this.sound.playSteamHiss();
    this.toast('Saturn V Returned Safely to Earth Launch Complex!', 'discovery');
    this.emitHud();
  }

  public equipAlienGun(gunId: string): void {
    const gun = ALIEN_SPACE_SYSTEM.equipAlienGun(gunId);
    if (!gun) return;
    this.sound.playPickup();
    this.toast(`Equipped ${gun.name} (Unlimited Alien Energy!)`, 'discovery');
    this.emitHud();
  }

  public fireAlienBlaster(): void {
    const now = Date.now();
    const res = ALIEN_SPACE_SYSTEM.fireAlienGun(now, this.lastAlienShotMs);
    if (!res.fired) return;
    this.lastAlienShotMs = now;
    this.sound.unlock();
    this.sound.playGunshot('plasma');

    const boltHex = new THREE.Color(res.boltColor).getHex();
    if (this.inSpacePlanet && this.spaceArena?.ufoGroup && ALIEN_SPACE_SYSTEM.activeUfo && !ALIEN_SPACE_SYSTEM.activeUfo.isDowned) {
      const uPos = this.spaceArena.ufoGroup.position;
      this.spawnParticles(uPos.x, uPos.y, uPos.z, boltHex, 14);
      const hit = ALIEN_SPACE_SYSTEM.damageUfo(res.damage);
      if (hit?.shotDown) {
        this.sound.playExplosion();
        this.spawnParticles(uPos.x, uPos.y, uPos.z, 0x4ade80, 28);
        this.toast(
          `UFO SHOT DOWN! Collected ${hit.loot.name} — install it in the Saturn V Console!`,
          'discovery',
        );
      } else if (hit) {
        this.toast(
          `${res.gunName} hit UFO! (${hit.hp}/${ALIEN_SPACE_SYSTEM.activeUfo.maxHp} HP)`,
          'info',
        );
      }
    } else {
      const fx = this.playerX - Math.sin(this.camYaw) * 8;
      const fz = this.playerZ - Math.cos(this.camYaw) * 8;
      this.spawnParticles(fx, this.playerY + 1.5, fz, boltHex, 10);
      this.toast(`${res.gunName} fired (∞ Energy)`, 'info');
    }
    this.emitHud();
  }

  public claimIslandUfoLoot(): void {
    ALIEN_SPACE_SYSTEM.landUfoOnIsland({
      x: ISLAND_UFO_POS.x,
      y: 0,
      z: ISLAND_UFO_POS.z,
    });
    const claimed = ALIEN_SPACE_SYSTEM.claimIslandUfoLoot();
    if (claimed.length === 0) {
      this.toast('Island UFO loot already claimed! Open Saturn V Console → Alien Armory.', 'info');
      return;
    }
    this.sound.playPickup();
    this.toast(
      `Claimed Island UFO Loot: ${claimed.map((c) => c.name).join(' & ')}!`,
      'discovery',
    );
    this.emitHud();
  }

  public useAlienLoot(uid: string, mode: 'power_up' | 'decoration'): void {
    const res = ALIEN_SPACE_SYSTEM.applyAlienLoot(uid, mode);
    if (!res.ok) {
      this.toast(res.message, 'warning');
      return;
    }
    this.sound.playWeldSnap();
    if (mode === 'decoration') {
      // Spawn a glowing floating Alien Relic Beacon right beside the player!
      const relic = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.55, 0),
        new THREE.MeshStandardMaterial({
          color: 0x22d3ee,
          emissive: 0x06b6d4,
          emissiveIntensity: 1.6,
          metalness: 0.7,
          roughness: 0.2,
        }),
      );
      relic.position.set(
        this.playerX - Math.sin(this.playerYaw) * 2.5,
        this.playerY + 1.2,
        this.playerZ - Math.cos(this.playerYaw) * 2.5,
      );
      this.scene.add(relic);
      this.alienRelicDecorMeshes.push(relic);
    }
    this.toast(res.effect, 'discovery');
    this.emitHud();
  }

  public switchDimension(dim: DimensionId): void {
    if (!DIMENSION_DEFINITIONS[dim]) return;
    if (this.spaceArena) {
      this.scene.remove(this.spaceArena.root);
      this.spaceArena.dispose();
      this.spaceArena = null;
      this.inSpacePlanet = false;
      this.activeSpacePlanet = null;
      this.spaceGravity = 1.0;
    }
    if (this.activeDimensionWorld) {
      disposeDimensionWorld(this.activeDimensionWorld);
      this.activeDimensionWorld = null;
    }

    this.currentDimension = dim;
    this.visitedDimensions.add(dim);
    this.portalWarpCooldown = 1.8;
    if (dim === 'gold') {
      this.unlockedGildedPaint = true;
    }

    if (dim === 'overworld') {
      this.setOverworldActiveState(true);
    } else {
      this.setOverworldActiveState(false);
      this.activeDimensionWorld = buildDimensionWorld(dim, this.renderer);
      applyRealisticMeshLightingPass(this.activeDimensionWorld.root, {
        shadowsEnabled: this.effectiveShadowsEnabled,
        envMapIntensity: 1.0,
      });
      this.scene.add(this.activeDimensionWorld.root);
    }

    for (const portal of this.activePortals) {
      const h = this.portalHandles.get(portal.id);
      if (h) h.group.visible = portal.sourceDim === dim;
    }

    const arrival = getDimensionArrivalPoint(dim);
    this.playerX = arrival.x;
    this.playerY = arrival.y;
    this.playerZ = arrival.z;
    this.playerYaw = arrival.yaw;
    this.playerVelY = 0;

    const def = DIMENSION_DEFINITIONS[dim];
    if (def) {
      _skyColor.setHex(def.skyHex);
      if (this.scene.background instanceof THREE.Color) {
        this.scene.background.copy(_skyColor);
      } else {
        this.scene.background = _skyColor;
      }
      if (this.scene.fog) {
        this.scene.fog.color.setHex(def.fogHex);
        if ('density' in this.scene.fog) {
          (this.scene.fog as THREE.FogExp2).density = def.fogDensity;
        }
      }
      this.sunLight.color.setHex(def.sunColorHex);
      this.sunLight.intensity = def.sunIntensity;
      this.hemiLight.color.setHex(def.hemiSkyHex);
      this.hemiLight.groundColor.setHex(def.hemiGroundHex);
      this.hemiLight.intensity = def.hemiIntensity;
      this.skyFillLight.color.setHex(def.hemiSkyHex);
      this.skyFillLight.intensity = Math.max(0.18, def.hemiIntensity * 0.32);
    }

    this.sound.playPortalWarp();
    this.toast(`Warped into ${def.name}!`, 'discovery');
    this.emitHud();
  }

  public firePortalGun(): void {
    const equipped = this.getEquippedItemId();
    if (equipped !== 'portal_gun') {
      this.toast('Equip Dimensional Portal Gun in hotbar to fire portals!', 'warning');
      return;
    }

    const targetDim = this.selectedPortalDimension;
    const dest = getDimensionArrivalPoint(targetDim);
    const portalId = `portal_${Date.now()}`;
    const pairId = `pair_${Date.now()}`;

    const dist = 3.8;
    const px = this.playerX - Math.sin(this.playerYaw) * dist;
    const pz = this.playerZ - Math.cos(this.playerYaw) * dist;
    const py = this.playerY + 0.1;

    const newPortal: PortalLinkState = {
      id: portalId,
      pairId,
      sourceDim: this.currentDimension,
      targetDim,
      x: px,
      y: py,
      z: pz,
      yaw: this.playerYaw,
      destX: dest.x,
      destY: dest.y,
      destZ: dest.z,
      destYaw: dest.yaw,
      isReturn: false,
      createdAt: this.elapsed,
    };

    const returnPortal: PortalLinkState = {
      id: `${portalId}_ret`,
      pairId,
      sourceDim: targetDim,
      targetDim: this.currentDimension,
      x: dest.x + 4.2,
      y: dest.y,
      z: dest.z + 4.2,
      yaw: dest.yaw + Math.PI,
      destX: px,
      destY: py,
      destZ: pz,
      destYaw: this.playerYaw + Math.PI,
      isReturn: true,
      createdAt: this.elapsed,
    };

    this.activePortals.push(newPortal, returnPortal);
    const hOut = createPortalVortexMesh(newPortal);
    hOut.group.visible = newPortal.sourceDim === this.currentDimension;
    this.scene.add(hOut.group);
    this.portalHandles.set(newPortal.id, hOut);

    const hRet = createPortalVortexMesh(returnPortal);
    hRet.group.visible = returnPortal.sourceDim === this.currentDimension;
    this.scene.add(hRet.group);
    this.portalHandles.set(returnPortal.id, hRet);

    this.sound.playPortalWarp();
    this.toast(`Portal opened to ${DIMENSION_DEFINITIONS[targetDim]?.name || targetDim}! Walk or drive through.`, 'gain');
    this.emitHud();
  }

  public closeAllPortals(): void {
    for (const h of this.portalHandles.values()) {
      disposePortalVortex(h);
    }
    this.portalHandles.clear();
    this.activePortals = [];
    this.toast('All dimensional portals closed.', 'info');
    this.emitHud();
  }

  public dispose(): void {
    this.disposed = true;
    this.fpsController.stop();
    this.perfMonitor?.dispose();
    this.perfMonitor = null;
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp, true);
    window.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('blur', this.onWindowBlur);
    window.removeEventListener('pagehide', this.onWindowBlur);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.renderer.domElement.removeEventListener('pointerdown', this.onCanvasPointerDown);

    this.p2p?.leaveRoom();
    this.modSystem?.dispose();
    for (const rp of this.remotePlayers.values()) {
      this.scene.remove(rp.handle.group);
      rp.handle.backpackDispose();
      this.disposeObject3D(rp.handle.group);
    }
    this.remotePlayers.clear();

    if (this.localPlayerHandle) {
      this.scene.remove(this.localPlayerHandle.group);
      this.localPlayerHandle.backpackDispose();
      this.disposeObject3D(this.localPlayerHandle.group);
      this.localPlayerHandle = null;
    }

    if (this.activeDimensionWorld) {
      disposeDimensionWorld(this.activeDimensionWorld);
      this.activeDimensionWorld = null;
    }
    for (const h of this.portalHandles.values()) {
      disposePortalVortex(h);
    }
    this.portalHandles.clear();

    this.creatures?.dispose();
    this.structureManager?.hibernateAll();
    this.realisticOcean?.dispose();
    this.world?.dispose();
    this.flatWorld?.dispose();
    this.coasterRuntime?.dispose();
    if (this.terrainEngine) {
      this.terrainEngine.dispose(this.scene);
    }

    this.arrowGeo.dispose();
    this.arrowMat.dispose();
    this.bulletGeo.dispose();
    this.bulletMat.dispose();
    this.particleGeo.dispose();
    this.particleMat.dispose();
    this.shellCasingGeo.dispose();
    this.shellCasingMat.dispose();
    this.muzzleFlashGeo.dispose();
    this.muzzleFlashMat.dispose();
    this.debrisGeo.dispose();
    this.debrisMat.dispose();
    this.p2pTracerGeo.dispose();
    this.p2pTracerMat.dispose();
    this.vehicleShadowGeo.dispose();
    this.vehicleShadowMat.dispose();
    this.envTexture?.dispose();
    this.envTexture = null;

    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material?.dispose();
        }
      }
    });
    this.tvProjectionCallback = null;
    if (this.smartTv) {
      this.smartTv.dispose();
    }
    this.clearAlienRelicDecorMeshes();
    for (let i = 0; i < this.structureLightPool.length; i++) {
      this.scene.remove(this.structureLightPool[i]);
      this.structureLightPool[i].dispose();
    }
    this.structureLightPool = [];
    for (let i = 0; i < this.vehicleUnderglowPool.length; i++) {
      this.scene.remove(this.vehicleUnderglowPool[i]);
      this.vehicleUnderglowPool[i].dispose();
    }
    this.vehicleUnderglowPool = [];
    this.vehicleUnderglowMeta.clear();
    this.sound?.dispose();
    this.renderer.dispose();
  }

  // =========================================================================
  // ROLLER COASTER CREATOR & PARK RIDE API (ISLAND & FLAT WORLDS)
  // =========================================================================

  public createCoaster(name?: string, withStation = true): string | null {
    if (!this.coasterRuntime) return null;
    const fwdX = -Math.sin(this.camYaw);
    const fwdZ = -Math.cos(this.camYaw);
    const sx = this.playerX + fwdX * 5.5;
    const sz = this.playerZ + fwdZ * 5.5;
    const sy = getTerrainHeight(sx, sz);

    if (withStation) {
      const stationStruct: PlacedStructure = {
        id: `struct_coaster_${Date.now()}_${Math.floor(Math.random() * 999)}`,
        type: 'coaster_station',
        x: sx,
        y: sy,
        z: sz,
        rotationY: this.camYaw,
      };
      this.spawnStructure(stationStruct);
    }

    const coasterId = this.coasterRuntime.createCoaster(
      name || `Park Coaster ${this.coasterRuntime.getHudSummaries().length + 1}`,
      { x: sx, y: sy, z: sz },
      this.camYaw,
      true,
    );
    this.sound.playWeldSnap();
    this.toast('Created new Roller Coaster track & station!', 'craft');
    this.emitHud();
    return coasterId;
  }

  public createDemoCoaster(demoName: string, coasterType: CoasterModelType): string | null {
    if (!this.coasterRuntime) return null;
    const fwdX = -Math.sin(this.camYaw);
    const fwdZ = -Math.cos(this.camYaw);
    const sx = this.playerX + fwdX * 6.5;
    const sz = this.playerZ + fwdZ * 6.5;
    const sy = getTerrainHeight(sx, sz);

    const stationStruct: PlacedStructure = {
      id: `struct_demo_coaster_${Date.now()}_${Math.floor(Math.random() * 999)}`,
      type: 'coaster_station',
      x: sx,
      y: sy,
      z: sz,
      rotationY: this.camYaw,
    };
    this.spawnStructure(stationStruct);

    const coasterId = this.coasterRuntime.createCoaster(
      demoName,
      { x: sx, y: sy, z: sz },
      this.camYaw,
      true,
      undefined,
      coasterType,
    );
    this.sound.playWeldSnap();
    this.toast(`Loaded demo coaster: ${demoName} (${coasterType})!`, 'discovery');
    this.emitHud();
    return coasterId;
  }

  public deleteCoaster(coasterId: string): boolean {
    if (!this.coasterRuntime) return false;
    if (this.ridingCoasterId === coasterId) {
      this.ridingCoasterId = null;
    }
    const ok = this.coasterRuntime.deleteCoaster(coasterId);
    if (ok) {
      this.toast('Deleted roller coaster', 'info');
      this.emitHud();
    }
    return ok;
  }

  public renameCoaster(coasterId: string, nextName: string): boolean {
    if (!this.coasterRuntime) return false;
    const ok = this.coasterRuntime.renameCoaster(coasterId, nextName);
    if (ok) this.emitHud();
    return ok;
  }

  public setCoasterColor(coasterId: string, color: string): boolean {
    if (!this.coasterRuntime) return false;
    const ok = this.coasterRuntime.setCoasterColor(coasterId, color);
    if (ok) this.emitHud();
    return ok;
  }

  public setCoasterType(coasterId: string, coasterType: CoasterModelType): boolean {
    if (!this.coasterRuntime) return false;
    const ok = this.coasterRuntime.setCoasterType(coasterId, coasterType);
    if (ok) {
      this.toast(`Updated coaster ride archetype to ${coasterType}`, 'craft');
      this.emitHud();
    }
    return ok;
  }

  public setCoasterTrainCars(coasterId: string, count: number): boolean {
    if (!this.coasterRuntime) return false;
    const ok = this.coasterRuntime.setTrainCarCount(coasterId, count);
    if (ok) this.emitHud();
    return ok;
  }

  public appendCoasterPiece(
    coasterId: string,
    pieceKey: CoasterPiecePresetKey,
  ): boolean {
    if (!this.coasterRuntime) return false;
    const ok = this.coasterRuntime.appendPresetPiece(coasterId, pieceKey);
    if (ok) {
      this.sound.playWeldSnap();
      this.toast(`Welded ${pieceKey} track block`, 'craft');
      this.emitHud();
    }
    return ok;
  }

  public appendCoasterInversion(
    coasterId: string,
    settings: CustomInversion,
  ): boolean {
    if (!this.coasterRuntime) return false;
    const ok = this.coasterRuntime.appendCustomInversion(coasterId, settings);
    if (ok) {
      this.sound.playWeldSnap();
      this.toast(`Fabricated custom element: ${settings.name}`, 'discovery');
      this.emitHud();
    }
    return ok;
  }

  public completeCoasterCircuit(coasterId: string): boolean {
    if (!this.coasterRuntime) return false;
    const ok = this.coasterRuntime.completeCircuit(coasterId);
    if (ok) {
      this.sound.playWeldSnap();
      this.toast('Closed complete circuit back to Load Station brake run!', 'discovery');
      this.emitHud();
    } else {
      this.toast('Circuit already closed or needs more track blocks first.', 'warning');
    }
    return ok;
  }

  public addCoasterNodeAhead(coasterId: string): boolean {
    if (!this.coasterRuntime) return false;
    const summary = this.coasterRuntime
      .getHudSummaries()
      .find((c) => c.id === coasterId);
    const lastNode = summary?.nodes[summary.nodes.length - 1];
    const baseX = lastNode ? lastNode.position.x : this.playerX;
    const baseZ = lastNode ? lastNode.position.z : this.playerZ;
    const baseY = lastNode ? lastNode.position.y : getTerrainHeight(baseX, baseZ) + 2;
    const fwdX = -Math.sin(this.camYaw);
    const fwdZ = -Math.cos(this.camYaw);
    const ok = this.coasterRuntime.addNode(
      coasterId,
      { x: baseX + fwdX * 14, y: baseY, z: baseZ + fwdZ * 14 },
      0,
    );
    if (ok) {
      this.sound.playWeldSnap();
      this.emitHud();
    }
    return ok;
  }

  public updateCoasterNode(
    coasterId: string,
    index: number,
    patch: {
      x?: number;
      y?: number;
      z?: number;
      bank?: number;
      segmentType?: CoasterSegmentKind;
    },
  ): boolean {
    if (!this.coasterRuntime) return false;
    const ok = this.coasterRuntime.updateNode(coasterId, index, patch);
    if (ok) this.emitHud();
    return ok;
  }

  public removeCoasterNode(coasterId: string, index: number): boolean {
    if (!this.coasterRuntime) return false;
    const ok = this.coasterRuntime.removeNode(coasterId, index);
    if (ok) this.emitHud();
    return ok;
  }

  public depumpCoaster(coasterId: string): boolean {
    if (!this.coasterRuntime) return false;
    const ok = this.coasterRuntime.depumpCoaster(coasterId);
    if (ok) {
      this.sound.playWeldSnap();
      this.toast('Depumped track NURBS control points for smooth banking', 'craft');
      this.emitHud();
    }
    return ok;
  }

  public exportCoasterCSV(coasterId: string): string {
    if (!this.coasterRuntime) return '';
    return this.coasterRuntime.exportCoasterCSV(coasterId);
  }

  public importCoasterCSV(coasterId: string, csvText: string): boolean {
    if (!this.coasterRuntime) return false;
    const ok = this.coasterRuntime.importCoasterCSV(coasterId, csvText);
    if (ok) {
      this.sound.playWeldSnap();
      this.toast('Imported track CSV successfully', 'discovery');
      this.emitHud();
    } else {
      this.toast('Failed to parse track CSV data', 'warning');
    }
    return ok;
  }

  public toggleCoasterDispatch(coasterId: string, running?: boolean): boolean {
    if (!this.coasterRuntime) return false;
    const ok = this.coasterRuntime.dispatchTrain(coasterId, running);
    if (!ok) {
      this.toast('Spline validation failed — fix track before dispatch', 'warning');
      return false;
    }
    this.sound.playKineticGearTick();
    this.emitHud();
    return true;
  }

  public resetCoasterTrain(coasterId: string): boolean {
    if (!this.coasterRuntime) return false;
    const ok = this.coasterRuntime.resetTrain(coasterId);
    if (ok) this.emitHud();
    return ok;
  }

  public boardCoasterRide(coasterId: string): boolean {
    if (!this.coasterRuntime) return false;
    const summary = this.coasterRuntime
      .getHudSummaries()
      .find((c) => c.id === coasterId);
    if (!summary || !summary.valid || summary.nodeCount < 2) {
      this.toast('Track validation required before dispatching train!', 'warning');
      return false;
    }
    this.coasterRuntime.dispatchTrain(coasterId, true);
    this.ridingCoasterId = coasterId;
    this.toast(`Dispatched front row on ${summary.name} — press E to disembark`, 'discovery');
    this.emitHud();
    return true;
  }

  public exitCoasterRide(): void {
    if (!this.ridingCoasterId) return;
    this.ridingCoasterId = null;
    this.camera.rotation.order = 'YXZ';
    this.camera.up.set(0, 1, 0);
    const groundY = Math.max(
      getTerrainHeight(this.playerX, this.playerZ),
      this.getStructuralSurfaceY(this.playerX, this.playerZ, this.playerY + 1.5),
    );
    this.playerY = groundY;
    this.playerVelY = 0;
    this.grounded = true;
    this.camStepOffsetY = 0;
    this.camBobBlend = 0;
    this.wallTiltAngle = 0;
    this.camPitch = -0.05;
    this.playerYaw = this.camYaw + Math.PI;
    this.toast('Disembarked at unload platform', 'info');
    this.emitHud();
  }

  public getRendererLoadSnapshot() {
    return getRendererLoadSnapshot(this.renderer);
  }

  public restoreHabitatZone(zoneId: string) {
    const z = this.ecosystem.zones.find((x) => x.id === zoneId);
    if (z) {
      z.pollutionLevel = Math.max(0, z.pollutionLevel - 0.3);
      z.soilMoisture = Math.min(1.0, z.soilMoisture + 0.2);
      this.ecosystem.habitatHealthScore = Math.min(100, this.ecosystem.habitatHealthScore + 10);
      this.toast('Habitat successfully restored & pollution cleared!', 'gain');
      this.emitHud();
    }
  }
}
