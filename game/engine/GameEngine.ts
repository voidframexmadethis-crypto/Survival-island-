import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SoundEngine } from '../audio/soundEngine';
import {
  SmartTvSystem,
  TvChannelId,
  normalizeChannelId,
} from '../systems/smartTvSystem';
import {
  FARM_SHOP_STOCK,
  ITEMS,
  ITEM_SELL_PRICES,
  SEED_SPECS,
  isActiveWeaponItem,
  isAmmoItem,
  isSeedItem,
} from '../data/items';
import { STAGE_1_MISSIONS } from '../data/missions';
import { COOKING_RECIPES, CRAFTING_RECIPES } from '../data/recipes';
import {
  ActiveCreature,
  CreatureManager,
  ScavengerCarcassTarget,
} from '../systems/creatureSystem';
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
import {
  ActiveModal,
  ActiveVehicleHudState,
  BackpackCompartmentEntry,
  BeltLink,
  BiomeId,
  BodyZone,
  CampStructureType,
  CarcassSaveData,
  CreatureSpecies,
  DEFAULT_HUD_BAR_SLOTS,
  GameMode,
  GameSaveData,
  GameSettings,
  GameStats,
  HUDStateSnapshot,
  InventorySlot,
  ItemDefinition,
  ItemId,
  MAX_HUD_BAR_SLOTS,
  TOTAL_BACKPACK_COMPARTMENTS,
  KineticHudSummary,
  KineticNode,
  KineticNodeKind,
  ModularVehicleData,
  MomentumHudState,
  NearbyInteraction,
  PlacedStructure,
  PlantedCrop,
  PlayerVitals,
  ResourceNodeKind,
  ResourceNodeState,
  ResourceToast,
  SavedResourceNodeState,
  StructuralBlock,
  StructuralBlockKind,
  TargetHitboxSnapshot,
  TrackedSighting,
  VehicleModulePlacement,
  WeaponMaterialClass,
  WeatherType,
  WorldPickupSave,
} from '../types';
import {
  BeltSpanMeshHandles,
  KineticMeshHandles,
  ModularVehicleMeshHandles,
  createBeltSpanMesh,
  createKineticNodeMesh,
  createModularVehicleMesh,
} from '../world/engineeringModels';
import {
  HouseStationTarget,
  createCampStructureModel,
  createCarcassMesh,
  createCropPlantMesh,
  createFirstPersonHandsRig,
  createPickupMesh,
  createPowderKegMesh,
  createSailingShipModel,
  createSkyCelestialBodies,
  createStructuralBlockMesh,
  createWaterTorrentMesh,
  FirstPersonHandsRig,
  SkyCelestialHandles,
} from '../world/models';
import {
  AUTUMN_GROVE_POS,
  BIOME_INFO,
  CAVE_POS,
  EXPEDITION_POS,
  FARMER_POS,
  HILL_HOUSE_POS,
  HOMESTEAD_POS,
  LAKE_CENTER,
  OCEAN_LEVEL,
  PLAYABLE_MAX_RADIUS,
  PLAYER_SPAWN,
  SNOWY_WOODLAND_POS,
  SWAMP_POS,
  WHEATFIELD_POS,
  exportSparseTerrainDeltas,
  getBiomeAt,
  getTerrainHeight,
  getTerrainSlope,
  getWaterLevelAt,
  importSparseTerrainDeltas,
  isFreshwaterAt,
  resetTerrainDeformation,
} from '../world/terrain';
import {
  buildIslandWorld,
  CaveCeilingCluster,
  WorldHandles,
} from '../world/worldBuilder';

const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _raycaster = new THREE.Raycaster();
const _ndcCenter = new THREE.Vector2(0, 0);
const _normalMatrix = new THREE.Matrix3();
const _hitNormal = new THREE.Vector3();
const _probeOrigin = new THREE.Vector3();
const _probeDir = new THREE.Vector3();
const _probeEuler = new THREE.Euler(0, 0, 0, 'YXZ');

const FOG_GRID_SIZE = 32;
const FOG_WORLD_SPAN = 320;

interface ArrowProjectile {
  mesh: THREE.Mesh;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  damage: number;
  isBullet?: boolean;
}

interface HitParticle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
}

interface ActivePickup {
  id: string;
  itemId: ItemId;
  quantity: number;
  x: number;
  y: number;
  z: number;
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
      | 'vehicles'
      | 'vehicle_cargo'
    >,
    structureId?: string,
  ) => void;
}

function formatTimePhase(t: number): string {
  if (t < 0.2 || t >= 0.84) return 'Night';
  if (t < 0.31) return 'Dawn';
  if (t < 0.44) return 'Morning';
  if (t < 0.62) return 'Midday';
  if (t < 0.74) return 'Golden Hour';
  return 'Dusk';
}

export class GameEngine {
  private container: HTMLElement;
  private callbacks: EngineCallbacks;
  private sound = new SoundEngine();

  private isSoftwareGl = false;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private smartTv!: SmartTvSystem;
  private tvIsZoomed = false;
  private tvModalOpen = false;
  private _tvWorldPos = new THREE.Vector3();
  private _tvWorldQuat = new THREE.Quaternion();
  private _tvForward = new THREE.Vector3();
  private _tvRight = new THREE.Vector3();
  private _tvLookTarget = new THREE.Vector3();
  private _tvTmpVec = new THREE.Vector3();
  private sunLight!: THREE.DirectionalLight;
  private moonLight!: THREE.DirectionalLight;
  private nightVisionLight!: THREE.PointLight;
  private hemiLight!: THREE.HemisphereLight;
  private world!: WorldHandles;
  private skyBodies!: SkyCelestialHandles;
  private handsRig!: FirstPersonHandsRig;
  private shipModel!: THREE.Group;
  private rainPoints!: THREE.Points;
  private rainGeo!: THREE.BufferGeometry;
  private creatures!: CreatureManager;

  private frameId = 0;
  private disposed = false;
  private clock = new THREE.Clock();
  private elapsed = 0;
  private hudSyncTimer = 0;

  // Game Mode & Intro Cinematic
  private mode: 'menu' | 'playing' | 'paused' = 'menu';
  private settings: GameSettings;
  private cinematicActive = false;
  private cinematicTimer = 0;
  private cinematicSubtitle = '';

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
  private swingTimer = 0;
  private actionCooldown = 0;
  private recoilTimer = 0;
  private eatTimer = 0;
  private eatBiteCount = 0;
  private drinkTimer = 0;
  private washBottleTimer = 0;
  private activeConsumeColor = '#b91c1c';
  private footstepAccum = 0;
  private hurtFlash = 0;

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

  // Survival & World State
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
  private timeOfDay = 0.36;
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
    { group: THREE.Group; fireLight?: THREE.PointLight; flameGroup?: THREE.Group }
  >();
  private visitedBiomes: Set<BiomeId> = new Set(['beach']);
  private exploredCells: Set<number> = new Set();
  private discoveredLocations: Set<string> = new Set();
  private completedMissionIds: Set<string> = new Set();
  private trackedSightings: TrackedSighting[] = [];
  private stats: GameStats = this.createEmptyStats();
  private gameOver = false;
  private gameOverReason = '';
  private currentSlotId = 'slot_1';
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

  // Dynamic Projectiles, Pickups & Particles
  private arrows: ArrowProjectile[] = [];
  private particles: HitParticle[] = [];
  private pickups: ActivePickup[] = [];
  private carcasses: ActiveCarcass[] = [];
  private pendingTreeDrops = new Map<string, [ItemId, number][]>();
  private shakenTreeDropIds = new Set<string>();
  private nodeById = new Map<string, ResourceNodeState>();
  private particleGeo = new THREE.BoxGeometry(0.14, 0.14, 0.14);

  // Volumetric Terrain Deformation & Structural Integrity Engineering
  private terrainEngine!: VolumetricTerrainEngine;
  private structuralBlocks: StructuralBlock[] = [];
  private structuralMeshes = new Map<string, THREE.Group>();
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

  // Creature Taming & Mounting & Sandbox
  private mountedCreatureId: string | null = null;
  private gravityScale = 1.0;
  private erosionSpeedMult = 1.0;

  constructor(
    container: HTMLElement,
    settings: GameSettings,
    callbacks: EngineCallbacks,
  ) {
    this.container = container;
    this.settings = settings;
    this.callbacks = callbacks;
    this.sound.configure(settings);

    this.initScene();
    this.setupInputs();
    this.startNewWorldState('slot_1', false);
    this.mode = 'menu';

    this.clock.start();
    this.tick();
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
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;
    this.renderer.setPixelRatio(
      this.isSoftwareGl
        ? 1
        : Math.min(
            window.devicePixelRatio || 1,
            this.settings.graphicsQuality === 'high' ? 2 : 1.35,
          ),
    );
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
    this.scene.background = new THREE.Color(0x7cc4e0);
    this.scene.fog = new THREE.FogExp2(0x7cc4e0, 0.0042);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const aspect =
      (this.container.clientWidth || 1) / (this.container.clientHeight || 1);
    this.camera = new THREE.PerspectiveCamera(68, aspect, 0.08, 420);
    this.camera.rotation.order = 'YXZ';

    // Attach First-Person Hands & Held Tool Rig + subtle night sight fill directly to Camera
    this.handsRig = createFirstPersonHandsRig();
    this.camera.add(this.handsRig.root);
    this.nightVisionLight = new THREE.PointLight(0x94a3b8, 0, 11, 1.8);
    this.camera.add(this.nightVisionLight);
    this.scene.add(this.camera);

    // Outdoor Lighting Rig (Sun, Moon & Hemisphere Bounce)
    this.hemiLight = new THREE.HemisphereLight(0xbae6fd, 0x3f4e28, 0.72);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff1d6, 1.85);
    this.sunLight.castShadow = !this.isSoftwareGl;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    const d = 38;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.camera.near = 2;
    this.sunLight.shadow.camera.far = 160;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.025;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    this.moonLight = new THREE.DirectionalLight(0x7aa2f7, 0);
    this.scene.add(this.moonLight);
    this.scene.add(this.moonLight.target);

    this.skyBodies = createSkyCelestialBodies();
    this.scene.add(this.skyBodies.group);

    // Build World, Volumetric Terrain Engine, Sailing Ship (for Intro), Rain Particles & Creatures
    this.world = buildIslandWorld(this.scene, this.renderer);
    this.world.resourceNodes.forEach((n) => this.nodeById.set(n.id, n));
    this.terrainEngine = new VolumetricTerrainEngine(this.scene);

    // Initialize Persistent Native 3D CanvasTexture Smart TV OS
    this.smartTv = new SmartTvSystem();
    if (this.world.tvScreenMesh && this.world.tvScreenMat) {
      this.smartTv.attachToMesh(this.world.tvScreenMesh, this.world.tvScreenMat);
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

    // Lightweight 3D Rain Particle Field
    const rainCount = 340;
    const rainPositions = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount; i++) {
      rainPositions[i * 3] = (Math.random() - 0.5) * 32;
      rainPositions[i * 3 + 1] = Math.random() * 18;
      rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 32;
    }
    this.rainGeo = new THREE.BufferGeometry();
    this.rainGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(rainPositions, 3),
    );
    const rainMat = new THREE.PointsMaterial({
      color: 0xcbd5e1,
      size: 0.12,
      transparent: true,
      opacity: 0.65,
    });
    this.rainPoints = new THREE.Points(this.rainGeo, rainMat);
    this.rainPoints.visible = false;
    this.scene.add(this.rainPoints);

    this.creatures = new CreatureManager(this.scene);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }
  }

  private setupInputs(): void {
    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('blur', this.onWindowBlur);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  private onWindowBlur = (): void => {
    this.clearMovementInputs();
  };

  private onVisibilityChange = (): void => {
    if (document.hidden) {
      this.clearMovementInputs();
    }
  };

  private clearMovementInputs(): void {
    this.keys = {};
    this.joyX = 0;
    this.joyY = 0;
    this.touchSprint = false;
  }

  private onResize = (): void => {
    if (this.disposed || !this.container) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    this.keys[e.code] = true;
    const keyLower = e.key ? e.key.toLowerCase() : '';
    if (keyLower) this.keys[`key_${keyLower}`] = true;
    this.sound.unlock();
    if (this.mode !== 'playing' || this.gameOver || this.cinematicActive) {
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

    if (e.code === 'Space') {
      if (this.activeVehicleId) {
        this.vehicleAscendHold = true;
      } else if (this.seatedState) {
        this.standUp();
      } else {
        this.triggerJump();
      }
    } else if (e.code === 'KeyV') {
      if (!this.activeVehicleId) {
        this.triggerDebrisKick();
      }
    } else if (e.code === 'KeyC' || e.code === 'ControlLeft') {
      if (this.activeVehicleId) {
        this.vehicleDescendHold = true;
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
      this.rotateBuildPiece();
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
    const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    if (delta === 0) return;

    e.preventDefault();
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

  public setMode(mode: 'menu' | 'playing' | 'paused'): void {
    const wasNotPlaying = this.mode !== 'playing';
    this.mode = mode;
    if (mode !== 'playing') {
      this.clearMovementInputs();
    } else {
      this.sound.unlock();
      this.smartTv?.unlockAudio();
      if (wasNotPlaying) {
        this.ensurePlayerHasGun(false);
      }
      this.emitHud();
    }
  }

  public updateSettings(settings: GameSettings): void {
    this.settings = settings;
    this.sound.configure(settings);
    if (this.renderer && !this.isSoftwareGl) {
      this.renderer.setPixelRatio(
        Math.min(
          window.devicePixelRatio || 1,
          settings.graphicsQuality === 'high' ? 2 : 1.35,
        ),
      );
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

  public addCameraLookDelta(dx: number, dy: number, isTouch = false): void {
    if (this.mode !== 'playing' || this.gameOver || this.cinematicActive) return;
    const clampedDx = THREE.MathUtils.clamp(dx, -140, 140);
    const clampedDy = THREE.MathUtils.clamp(dy, -140, 140);
    const baseSens = isTouch ? 0.0076 : 0.0046;
    const sens = baseSens * this.settings.cameraSensitivity;
    this.camYaw -= clampedDx * sens;
    const ySign = this.settings.invertCameraY ? -1 : 1;
    this.camPitch = THREE.MathUtils.clamp(
      this.camPitch - clampedDy * sens * ySign,
      -1.42,
      1.42,
    );
    this.playerYaw = this.camYaw + Math.PI;
  }

  public triggerJump(): void {
    this.sound.unlock();
    if (this.mode !== 'playing' || this.gameOver || this.cinematicActive) return;
    if (this.seatedState) {
      this.standUp();
      return;
    }
    if (this.wallRunTimer > 0) {
      // Wall-Kick Leap off vertical wall!
      this.playerVelY = 9.0;
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
      this.playerVelY = 7.4;
      this.grounded = false;
    }
  }

  public skipCinematic(): void {
    if (!this.cinematicActive) return;
    this.finishCinematic();
  }

  private finishCinematic(): void {
    this.cinematicActive = false;
    this.cinematicSubtitle = '';
    this.shipModel.visible = false;
    this.weather = 'clear';
    this.weatherTimer = 85;
    this.lightningFlash = 0;

    this.playerX = PLAYER_SPAWN.x;
    this.playerZ = PLAYER_SPAWN.z;
    this.playerY = getTerrainHeight(this.playerX, this.playerZ);
    this.camYaw = 0.12;
    this.camPitch = -0.05;
    this.playerYaw = this.camYaw + Math.PI;
    this.markExploredAroundPlayer();

    this.toast(
      'Washed ashore! Search shipwreck crates along the beach to begin.',
      'discovery',
    );
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

  public setTvVolume(vol: number): void {
    this.smartTv.setVolume(vol);
    this.emitHud();
  }

  public toggleTvMute(): boolean {
    const muted = this.smartTv.toggleMute();
    this.emitHud();
    return muted;
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
  ): void {
    this.smartTv.setYouTubeStream(videoId, title, channel);
    this.toast(`YouTube on TV: ${title}`, 'info');
    this.emitHud();
  }

  public setTvModalOpen(open: boolean): void {
    this.tvModalOpen = open;
    if (open) {
      this.smartTv.unlockAudio();
    }
  }

  private resolveNearestTvTarget(usePlayerAnchor = false): {
    dist: number;
    worldPos: THREE.Vector3;
    worldQuat: THREE.Quaternion;
    forward: THREE.Vector3;
    right: THREE.Vector3;
    scaleX: number;
    scaleY: number;
  } | null {
    const refX = usePlayerAnchor ? this.playerX : this.camera.position.x;
    const refY = usePlayerAnchor ? this.playerY + 1.4 : this.camera.position.y;
    const refZ = usePlayerAnchor ? this.playerZ : this.camera.position.z;

    let bestDist = Infinity;
    let hasTarget = false;
    let scaleX = 1.6 / 800;
    let scaleY = 0.86 / 430;

    for (const st of this.structures) {
      if (st.type !== 'smart_tv') continue;
      const d = Math.hypot(st.x - refX, st.y + 0.95 - refY, st.z - refZ);
      if (d < bestDist) {
        bestDist = d;
        this._tvWorldQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), st.rotationY);
        this._tvForward.set(0, 0, 1).applyQuaternion(this._tvWorldQuat);
        this._tvRight.set(1, 0, 0).applyQuaternion(this._tvWorldQuat);
        this._tvWorldPos.set(st.x, st.y + 0.95, st.z).addScaledVector(this._tvForward, 0.05);
        scaleX = 1.68 / 800;
        scaleY = 0.93 / 430;
        hasTarget = true;
      }
    }

    if (this.world.tvScreenMesh) {
      this.world.tvScreenMesh.getWorldPosition(this._tvTmpVec);
      const houseDist = Math.hypot(
        this._tvTmpVec.x - refX,
        this._tvTmpVec.y - refY,
        this._tvTmpVec.z - refZ,
      );
      if (houseDist < bestDist) {
        bestDist = houseDist;
        this._tvWorldPos.copy(this._tvTmpVec);
        this.world.tvScreenMesh.getWorldQuaternion(this._tvWorldQuat);
        this._tvForward.set(0, 0, 1).applyQuaternion(this._tvWorldQuat);
        this._tvRight.set(1, 0, 0).applyQuaternion(this._tvWorldQuat);
        this._tvWorldPos.addScaledVector(this._tvForward, 0.015);
        scaleX = 1.6 / 800;
        scaleY = 0.86 / 430;
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
    };
  }

  public setGameMode(mode: GameMode): void {
    this.gameMode = mode;
    if (mode === 'boss_hunt') {
      this.creatures.spawnGuardianBosses();
      this.toast('Guardian Boss Hunt active: 4 colossal Lost World Titans spawned across biomes!', 'discovery');
    } else if (mode === 'sandbox') {
      this.vitals.health = 9999;
      this.vitals.maxHealth = 9999;
      this.vitals.hunger = 100;
      this.vitals.thirst = 100;
      this.toast('Sandbox / God Mode active: Unlimited vitals, flight & Smart TV access', 'discovery');
    } else {
      this.toast('Survival Mode active: Biological survival, Fluid Erosion & Blood Moon Sieges', 'discovery');
    }
    this.emitHud();
  }

  private isBloodMoonNight(): boolean {
    const sunElev = Math.sin((this.timeOfDay - 0.25) * Math.PI * 2);
    const isNight = sunElev < -0.05;
    return isNight && (this.dayCount % 7 === 0);
  }

  private computeObjectiveText(): string {
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

  public startNewWorldState(slotId = 'slot_1', playCinematic = true): void {
    this.currentSlotId = slotId;
    this.playerX = PLAYER_SPAWN.x;
    this.playerZ = PLAYER_SPAWN.z;
    this.playerY = getTerrainHeight(this.playerX, this.playerZ);
    this.playerVelY = 0;
    this.camYaw = 0.12;
    this.camPitch = -0.05;
    this.playerYaw = this.camYaw + Math.PI;
    this.isCrouching = false;
    this.touchCrouch = false;
    this.currentEyeHeight = 1.62;

    this.vitals = {
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
    this.dayCount = 1;
    this.timeOfDay = 0.36;
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
    // Initial weathered Crafting Station at the Abandoned Expedition Camp
    this.spawnStructure({
      id: 'exp_workbench',
      type: 'crafting_table',
      x: EXPEDITION_POS.x - 1.2,
      y: getTerrainHeight(EXPEDITION_POS.x - 1.2, EXPEDITION_POS.z + 2.4),
      z: EXPEDITION_POS.z + 2.4,
      rotationY: 0.4,
    });

    this.visitedBiomes = new Set(['beach']);
    this.exploredCells = new Set();
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
    this.world.resourceNodes.forEach((n) => {
      n.hp = n.maxHp;
      n.respawnTimer = 0;
      n.felled = false;
      n.fallTimer = 0;
      this.syncResourceVisual(n);
    });

    if (playCinematic) {
      this.cinematicActive = true;
      this.cinematicTimer = 0;
      this.cinematicSubtitle =
        'A violent storm strikes your vessel in uncharted tropical waters...';
      this.shipModel.visible = true;
      this.shipModel.position.set(-8, OCEAN_LEVEL - 0.1, 168);
      this.shipModel.rotation.set(0, 0.35, 0);
    } else {
      this.cinematicActive = false;
      this.cinematicSubtitle = '';
      this.shipModel.visible = false;
    }

    this.ensurePlayerHasGun(true);
    this.emitHud();
  }

  public loadFromSave(save: GameSaveData): void {
    this.currentSlotId = save.slotId;
    this.playerX = save.player.x;
    this.playerY = save.player.y;
    this.playerZ = save.player.z;
    this.playerYaw = save.player.yaw;
    this.camYaw = this.playerYaw - Math.PI;
    this.camPitch = save.player.pitch ?? -0.05;
    this.vitals = {
      health: save.player.vitals.health ?? 100,
      maxHealth: save.player.vitals.maxHealth ?? 100,
      hunger: save.player.vitals.hunger ?? 100,
      maxHunger: save.player.vitals.maxHunger ?? 100,
      thirst: save.player.vitals.thirst ?? 100,
      maxThirst: save.player.vitals.maxThirst ?? 100,
      stamina: save.player.vitals.stamina ?? 100,
      maxStamina: save.player.vitals.maxStamina ?? 100,
      temperatureC: save.player.vitals.temperatureC ?? 37.0,
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
    this.gameMode = save.gameMode || 'survival';
    this.lastIsNight =
      Math.sin((this.timeOfDay - 0.25) * Math.PI * 2) < -0.05;
    this.weather = save.weather || 'clear';
    this.inventory = save.inventory.map((s) => ({ ...s }));
    this.backpackCompartments = Array.isArray(save.backpackCompartments)
      ? save.backpackCompartments.map((c) => ({ ...c }))
      : [];
    this.coins = typeof save.coins === 'number' ? save.coins : 150;
    this.fridgeItems = Array.isArray(save.fridgeItems)
      ? save.fridgeItems.map((s) => ({ ...s }))
      : [
          { itemId: 'milk', quantity: 2 },
          { itemId: 'egg', quantity: 6 },
          { itemId: 'butter', quantity: 3 },
          { itemId: 'chocolate', quantity: 2 },
          { itemId: 'salt', quantity: 4 },
          { itemId: 'lettuce', quantity: 2 },
          { itemId: 'tomato', quantity: 2 },
        ];
    this.seatedState = null;
    this.clearPlantedCrops();
    if (Array.isArray(save.plantedCrops)) {
      this.plantedCrops = save.plantedCrops.map((c) => ({ ...c }));
      this.plantedCrops.forEach((c) => this.rebuildCropMesh(c));
    }

    this.visitedBiomes = new Set(save.visitedBiomes);
    this.exploredCells = new Set(save.exploredCells || []);
    this.markExploredAroundPlayer();
    this.discoveredLocations = new Set(save.discoveredLocations || []);
    this.completedMissionIds = new Set(save.completedMissionIds || []);
    this.stats = { ...this.createEmptyStats(), ...save.stats };
    this.cinematicActive = false;
    this.cinematicSubtitle = '';
    this.shipModel.visible = false;
    this.gameOver = false;
    this.gameOverReason = '';

    importSparseTerrainDeltas(save.terrainDeltas);
    this.terrainEngine.clearAll();
    this.terrainEngine.syncAllDeformedVertices(
      this.world.terrainMesh,
      this.world.baseTerrainColors,
    );

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
    } else {
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
    } else {
      this.setupStarterEngineeringShowcase(true, false);
    }

    this.clearPlacedStructures();
    save.structures.forEach((st) => this.spawnStructure(st));

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
    if (save.tvPower === false && this.smartTv.power) {
      this.smartTv.togglePower();
    } else if (save.tvPaused && this.smartTv.power) {
      this.smartTv.setPaused(true);
    }

    // Restore resource node states (felled stumps, rock damage, depleted nodes)
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
      } else {
        n.hp = n.maxHp;
        n.respawnTimer = 0;
        n.felled = false;
        n.fallTimer = 0;
      }
      this.syncResourceVisual(n);
    });

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
    if (save.activeCarcasses) {
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
        );
      });
    }

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
  }

  public respawnPlayer(): void {
    this.seatedState = null;
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
    this.toast(
      campBed ? 'Woke up back at your camp shelter.' : 'Washed back onto the beach.',
      'info',
    );
    this.ensurePlayerHasGun(true);
  }

  /**
   * Guarantees that the character starts with the Survival Gun, Basic Knife,
   * Gun Cartridges, and diverse starter materials, with the Gun assigned to
   * hotbar slot 0 and Knife to hotbar slot 1.
   * Runs at every new game, load game (even previous/last saved games), and respawn.
   */
  public ensurePlayerHasGun(forceEquip = true): void {
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
      const isGun = eqId === 'gun';
      const hasWeaponOrTool = Boolean(
        eqId &&
          (isActiveWeaponItem(eqId) ||
            ITEMS[eqId].category === 'tool' ||
            eqId === 'fishing_rod' ||
            eqId === 'lasso'),
      );
      this.handsRig.toolGroup.visible = hasWeaponOrTool;
      this.handsRig.gunMesh.visible = isGun;
      if (!hasWeaponOrTool || isGun) {
        this.handsRig.shaft.visible = false;
        this.handsRig.axeHead.visible = false;
        this.handsRig.spearTip.visible = false;
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
    this.ensurePlayerHasGun(false);
    const resourceStates: SavedResourceNodeState[] = [];
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

    const activeCarcasses: CarcassSaveData[] = this.carcasses
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
      }));

    return {
      version: 3,
      slotId,
      savedAt: Date.now(),
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
      },
      dayCount: this.dayCount,
      timeOfDay: this.timeOfDay,
      weather: this.weather,
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
      terrainDeltas: exportSparseTerrainDeltas(),
      visitedBiomes: Array.from(this.visitedBiomes),
      exploredCells: Array.from(this.exploredCells),
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
      gameMode: this.gameMode,
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
    };
  }

  private markExploredAroundPlayer(): void {
    const cx = Math.floor(
      ((this.playerX + FOG_WORLD_SPAN / 2) / FOG_WORLD_SPAN) * FOG_GRID_SIZE,
    );
    const cz = Math.floor(
      ((this.playerZ + FOG_WORLD_SPAN / 2) / FOG_WORLD_SPAN) * FOG_GRID_SIZE,
    );
    for (let dz = -2; dz <= 2; dz++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (dx * dx + dz * dz > 5) continue;
        const gx = cx + dx;
        const gz = cz + dz;
        if (gx >= 0 && gx < FOG_GRID_SIZE && gz >= 0 && gz < FOG_GRID_SIZE) {
          this.exploredCells.add(gz * FOG_GRID_SIZE + gx);
        }
      }
    }
  }

  private clearPlacedStructures(): void {
    this.structureVisuals.forEach((v) => {
      this.scene.remove(v.group);
    });
    this.structureVisuals.clear();
    this.structures = [];
  }

  private spawnStructure(st: PlacedStructure): void {
    const built = createCampStructureModel(st.type, this.world.woodTex);
    built.group.position.set(st.x, st.y, st.z);
    built.group.rotation.y = st.rotationY;
    this.scene.add(built.group);
    this.structureVisuals.set(st.id, built);
    this.structures.push(st);
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
      (def.category !== 'resource' || itemId === 'wheat' || itemId === 'sugarcane') &&
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

  public useOrEquipItem(itemId: ItemId): void {
    const def = ITEMS[itemId];
    if (this.getItemCount(itemId) <= 0) return;

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
    if (!def.structureType || this.getItemCount(itemId) <= 0) return false;

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

    this.removeItem(itemId, 1);
    const st: PlacedStructure = {
      id: `struct_${Date.now()}_${Math.floor(Math.random() * 999)}`,
      type: def.structureType,
      x: px,
      y: py,
      z: pz,
      rotationY: this.camYaw,
      chestItems: def.structureType === 'storage_chest' ? [] : undefined,
      lit:
        def.structureType === 'campfire' ||
        def.structureType === 'cooking_station',
    };
    this.spawnStructure(st);
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
      this.scene.remove(match.mesh);
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
    if (this.getItemCount(itemId) <= 0) {
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
    this.cropMeshes.forEach((m) => this.scene.remove(m));
    this.cropMeshes.clear();
    this.plantedCrops = [];
  }

  private rebuildCropMesh(crop: PlantedCrop): void {
    const prev = this.cropMeshes.get(crop.id);
    if (prev) this.scene.remove(prev);
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
    if (Math.hypot(tx - HILL_HOUSE_POS.x, tz - HILL_HOUSE_POS.z) < 6.5) {
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
    if (m) this.scene.remove(m);
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
        this.toast('Sat on the living room sofa facing the TV', 'info');
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

  public triggerPrimaryAction(): void {
    this.sound.unlock();
    if (
      this.mode !== 'playing' ||
      this.gameOver ||
      this.cinematicActive ||
      this.actionCooldown > 0
    ) {
      return;
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
      }
      if (equippedId === 'gun') {
        this.fireGun();
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
      const treeNode = this.findNearestResourceNode(3.8, (n) =>
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
    const near = this.nearbyInteraction;
    if (near) {
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
      if (near.kind === 'farmer') {
        this.callbacks.onOpenStation('farmer', 'farmer_npc');
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
        near.kind === 'house_shower'
      ) {
        const st = this.world.houseStations.find((s) => s.id === near.id);
        if (st) {
          this.interactHouseStation(st);
          this.actionCooldown = 0.45;
          return;
        }
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
    let best: ResourceNodeState | null = null;
    let bestDist = maxRange;
    for (const n of this.world.resourceNodes) {
      if (n.hp <= 0 || !predicate(n)) continue;
      const d = Math.hypot(n.x - this.playerX, n.z - this.playerZ);
      if (d < bestDist) {
        bestDist = d;
        best = n;
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
    const resolution = resolveWeaponZoneHit(
      weaponClass,
      baseDamage,
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
      this.stats.animalsHunted += 1;
      const isDino = this.isDinosaurSpecies(c.species);
      if (isDino) {
        this.stats.dinosaursEncountered += 1;
      }
      this.spawnCarcass(
        c.species,
        name,
        isDino,
        c.x,
        c.z,
        c.yaw,
        res.drops,
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
        break;
      }
    }
  }

  private fireArrow(): void {
    const dir = new THREE.Vector3(0, 0, -1).applyEuler(
      new THREE.Euler(this.camPitch, this.camYaw, 0, 'YXZ'),
    );
    const start = new THREE.Vector3(
      this.playerX + dir.x * 0.6,
      this.playerY + this.currentEyeHeight - 0.1,
      this.playerZ + dir.z * 0.6,
    );
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.85, 5),
      new THREE.MeshStandardMaterial({ color: 0xe7e5e4 }),
    );
    mesh.rotation.x = Math.PI / 2;
    mesh.position.copy(start);
    this.scene.add(mesh);

    this.arrows.push({
      mesh,
      pos: start,
      vel: dir.multiplyScalar(28).add(new THREE.Vector3(0, 2.2, 0)),
      life: 2.5,
      damage: 38,
    });
  }

  private fireGun(): void {
    const ammoCount = this.getItemCount('ammo');
    if (ammoCount <= 0) {
      this.toast(
        'Fired emergency reserve cartridge! Craft ammo from Stone + Flint.',
        'warning',
      );
    } else {
      this.removeItem('ammo', 1);
    }

    this.sound.playAttack('gun');
    this.recoilTimer = 0.22;
    this.actionCooldown = 0.28;
    this.swingTimer = 0.22;

    // Camera recoil kick (upward pitch with smooth spring recovery)
    this.camPitch = Math.min(1.2, this.camPitch + 0.045);

    // Aim forward direction from camera pitch and yaw
    const dir = new THREE.Vector3(0, 0, -1).applyEuler(
      new THREE.Euler(this.camPitch, this.camYaw, 0, 'YXZ'),
    );
    const right = new THREE.Vector3(1, 0, 0).applyEuler(
      new THREE.Euler(0, this.camYaw, 0, 'YXZ'),
    );

    // Spawn at gun muzzle in front of camera
    const start = new THREE.Vector3(
      this.playerX + dir.x * 0.72 + right.x * 0.18,
      this.playerY + this.currentEyeHeight - 0.14 + dir.y * 0.72,
      this.playerZ + dir.z * 0.72 + right.z * 0.18,
    );

    // Muzzle flash particle burst + smoke
    this.spawnParticles(start.x, start.y, start.z, 0xffd700, 10);
    this.spawnParticles(
      start.x + dir.x * 0.1,
      start.y + 0.04,
      start.z + dir.z * 0.1,
      0xd4d4d8,
      4,
    );

    // High velocity tracer bullet projectile
    const bulletMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, 0.42, 6),
      new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.9,
        roughness: 0.2,
      }),
    );
    bulletMesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.clone().normalize(),
    );
    bulletMesh.position.copy(start);
    this.scene.add(bulletMesh);

    this.arrows.push({
      mesh: bulletMesh,
      pos: start,
      vel: dir.clone().normalize().multiplyScalar(115),
      life: 2.0,
      damage: 85,
      isBullet: true,
    });

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
      kind === 'banyan_tree' ||
      kind === 'highland_cedar'
    );
  }

  private isRockKind(kind: ResourceNodeKind): boolean {
    return (
      kind === 'small_stone' ||
      kind === 'stone_boulder' ||
      kind === 'mountain_rock' ||
      kind === 'ore_vein' ||
      kind === 'flint_outcrop'
    );
  }

  private syncResourceVisual(node: ResourceNodeState): void {
    const handle = this.world.resourceHandles.get(node.id);
    if (!handle) {
      const m = this.world.resourceMeshes.get(node.id);
      if (m) m.visible = node.hp > 0;
      return;
    }

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
    });
    this.pickups = [];
    for (const dp of this.debrisProjectiles) {
      this.scene.remove(dp.mesh);
      dp.mesh.geometry.dispose();
      (dp.mesh.material as THREE.Material).dispose();
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

  private spawnPickup(
    itemId: ItemId,
    quantity: number,
    x: number,
    z: number,
    life = 180,
    existingId?: string,
    autoCollectDelay = 0,
    placedOnGround = false,
  ): void {
    if (this.pickups.length >= 64) {
      const oldest = this.pickups.shift();
      if (oldest) this.scene.remove(oldest.mesh);
    }
    const y = Math.max(OCEAN_LEVEL + 0.08, getTerrainHeight(x, z));
    const mesh = createPickupMesh(itemId, this.world.woodTex);
    mesh.position.set(x, y + 0.04, z);
    mesh.rotation.y = Math.random() * Math.PI * 2;
    this.scene.add(mesh);

    this.pickups.push({
      id: existingId || `pickup_${Date.now()}_${Math.floor(Math.random() * 99999)}`,
      itemId,
      quantity,
      x,
      y,
      z,
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
  ): void {
    grants.forEach(([itemId, quantity], idx) => {
      const angle = (idx / Math.max(1, grants.length)) * Math.PI * 2 + Math.random() * 0.6;
      const r = 0.55 + (idx % 3) * 0.32;
      const px = cx + offsetX + Math.cos(angle) * r;
      const pz = cz + offsetZ + Math.sin(angle) * r;
      this.spawnPickup(itemId, quantity, px, pz);
    });
  }

  private collectPickup(pickupId: string): void {
    const idx = this.pickups.findIndex((p) => p.id === pickupId);
    if (idx === -1) return;
    const p = this.pickups[idx];
    if (p.collected) return;
    p.collected = true;
    this.pickups.splice(idx, 1);
    this.scene.remove(p.mesh);

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
      species === 'parasaurolophus'
    );
  }

  private clearCarcasses(): void {
    this.carcasses.forEach((c) => {
      this.scene.remove(c.mesh);
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
  ): void {
    if (this.carcasses.length >= 24) {
      const oldest = this.carcasses.shift();
      if (oldest) this.scene.remove(oldest.mesh);
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
    if (carcass.harvested) return;

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
    let bestCarcass: ActiveCarcass | null = null;
    let bestCarcassDist = 5.4;
    for (const c of this.carcasses) {
      if (c.harvested) continue;
      const maxRange = c.isDino ? 5.2 : 4.5;
      const d = Math.hypot(c.x - this.playerX, c.z - this.playerZ);
      if (d <= maxRange && d < bestCarcassDist) {
        bestCarcassDist = d;
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
      ? this.carcasses.find((c) => c.id === carcassId && !c.harvested) || null
      : this.findNearbyCarcass();
    if (!target) {
      this.toast('Walk closer to a hunted animal carcass to collect it.', 'info');
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
    const node = this.world.resourceNodes.find((n) => n.id === nodeId);
    if (!node || node.hp <= 0) return;

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
      const grants = this.getResourceYield(node.kind, equippedTool?.id);

      if (isTree) {
        const dx = node.x - this.playerX;
        const dz = node.z - this.playerZ;
        const dLen = Math.hypot(dx, dz) || 1;
        node.felled = true;
        node.fallTimer = 1.05;
        node.fallDirX = dx / dLen;
        node.fallDirZ = dz / dLen;
        this.pendingTreeDrops.set(node.id, grants);
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
      if (isTree && dmgProgress >= 0.4 && !this.shakenTreeDropIds.has(node.id)) {
        this.shakenTreeDropIds.add(node.id);
        const shakeItem = this.rollTreeShakeDrop(node.kind);
        if (shakeItem) {
          const angle = Math.random() * Math.PI * 2;
          this.spawnPickup(
            shakeItem,
            1,
            node.x + Math.cos(angle) * 1.35,
            node.z + Math.sin(angle) * 1.35,
          );
          this.spawnParticles(node.x, node.y + 2.4, node.z, 0x22c55e, 6);
        }
      }
      const mesh = this.world.resourceMeshes.get(node.id);
      if (mesh) {
        mesh.rotation.z = 0.06;
        setTimeout(() => {
          if (mesh) mesh.rotation.z = 0;
        }, 85);
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
        return r < 0.42 ? 'banana' : r < 0.78 ? 'apple' : r < 0.92 ? 'maple_syrup' : 'coconut';
      case 'banyan_tree':
        return r < 0.36 ? 'apple' : r < 0.7 ? 'banana' : 'maple_syrup';
      case 'highland_cedar':
        return r < 0.58 ? 'maple_syrup' : 'apple';
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
    } else if (kind === 'tropical_tree') {
      if (r < 0.55) drops.push(['banana', Math.random() < 0.4 ? 2 : 1]);
      if (Math.random() < 0.5) drops.push(['apple', Math.random() < 0.35 ? 2 : 1]);
      if (Math.random() < 0.25) drops.push(['maple_syrup', 1]);
      if (drops.length === 0) drops.push([Math.random() < 0.5 ? 'apple' : 'banana', 1]);
    } else if (kind === 'banyan_tree') {
      if (r < 0.55) drops.push(['apple', Math.random() < 0.45 ? 2 : 1]);
      if (Math.random() < 0.55) drops.push(['banana', Math.random() < 0.4 ? 2 : 1]);
      if (Math.random() < 0.45) drops.push(['maple_syrup', 1]);
      if (drops.length === 0) drops.push(['maple_syrup', 1]);
    } else if (kind === 'highland_cedar') {
      if (r < 0.72) drops.push(['maple_syrup', Math.random() < 0.35 ? 2 : 1]);
      if (Math.random() < 0.48) drops.push(['apple', Math.random() < 0.35 ? 2 : 1]);
      if (drops.length === 0) drops.push(['maple_syrup', 1]);
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
        return [
          ['wood', toolId === 'stone_axe' ? 5 : 3],
          ['branch', 2],
          ['leaves', 3],
          ...this.getTreeFelledBonusDrops(kind),
        ];
      case 'banyan_tree':
        return [
          ['wood', toolId === 'stone_axe' ? 6 : 3],
          ['branch', 3],
          ['fiber', 2],
          ['leaves', 3],
          ...this.getTreeFelledBonusDrops(kind),
        ];
      case 'highland_cedar':
        return [
          ['wood', toolId === 'stone_axe' ? 5 : 3],
          ['branch', 3],
          ['leaves', 2],
          ...this.getTreeFelledBonusDrops(kind),
        ];
      case 'branch_pile':
        return [['branch', 3]];
      case 'small_stone':
        return [
          ['stone', toolId === 'stone_pickaxe' ? 3 : 2],
          ['flint', 1],
        ];
      case 'stone_boulder':
        return [
          ['stone', toolId === 'stone_pickaxe' ? 5 : 3],
          ['flint', 1],
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
    const mat = new THREE.MeshBasicMaterial({ color: colorHex });
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(this.particleGeo, mat);
      m.position.set(x, y, z);
      this.scene.add(m);
      this.particles.push({
        mesh: m,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 4.5,
          2.2 + Math.random() * 3.0,
          (Math.random() - 0.5) * 4.5,
        ),
        life: 0.45 + Math.random() * 0.25,
      });
    }
  }

  private evaluateMissions(): void {
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
    if (this.mode === 'playing' && !this.gameOver && !this.cinematicActive) {
      // Full day-night cycle every 5 minutes so players experience all phases smoothly
      this.timeOfDay += dt / 300;
      if (this.timeOfDay >= 1) {
        this.timeOfDay -= 1;
        this.dayCount += 1;
        this.stats.daysSurvived = this.dayCount;
        this.toast(`Day ${this.dayCount} Dawn`, 'info');
      }

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

    // Lightning in storm or shipwreck cinematic
    if (this.lightningFlash > 0) {
      this.lightningFlash = Math.max(0, this.lightningFlash - dt * 4.5);
    }
    if (this.weather === 'storm' || this.cinematicActive) {
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

    if (
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
    const centerX = this.cinematicActive
      ? this.shipModel.position.x
      : this.playerX;
    const centerZ = this.cinematicActive
      ? this.shipModel.position.z
      : this.playerZ;
    this.skyBodies.group.position.set(centerX, 0, centerZ);
    this.skyBodies.sunMesh.position.set(sunCos * 210, sunElev * 195, -80);
    this.skyBodies.sunMesh.visible = sunElev > -0.15 && !this.cinematicActive;
    this.skyBodies.moonMesh.position.set(-sunCos * 210, -sunElev * 195, 80);
    this.skyBodies.moonMesh.visible = sunElev < 0.15 && !this.cinematicActive;

    this.sunLight.position.set(
      this.playerX + sunCos * 55,
      Math.max(8, sunElev * 68),
      this.playerZ + 28,
    );
    this.sunLight.target.position.set(this.playerX, this.playerY, this.playerZ);

    this.moonLight.position.set(
      this.playerX - sunCos * 55,
      Math.max(10, -sunElev * 68),
      this.playerZ - 28,
    );
    this.moonLight.target.position.set(this.playerX, this.playerY, this.playerZ);

    const daylight = THREE.MathUtils.clamp((sunElev + 0.16) / 0.65, 0, 1);
    const twilight = Math.max(0, 1 - Math.abs(sunElev - 0.04) * 4.2);
    const isMorning = this.timeOfDay < 0.5;

    const nightSky = new THREE.Color(0x060b16);
    const dawnSky = new THREE.Color(0xe76f51);
    const duskSky = new THREE.Color(0xf4a261);
    const daySky = new THREE.Color(0x7cc4e0);
    const stormSky = new THREE.Color(0x334155);

    const skyColor = nightSky
      .clone()
      .lerp(daySky, daylight)
      .lerp(isMorning ? dawnSky : duskSky, twilight * 0.62);

    if (this.weather === 'overcast') {
      skyColor.lerp(stormSky, 0.45);
    } else if (this.weather === 'rain') {
      skyColor.lerp(stormSky, 0.65);
    } else if (this.weather === 'storm' || this.cinematicActive) {
      skyColor.lerp(new THREE.Color(0x1e293b), 0.82);
    }
    if (this.lightningFlash > 0) {
      skyColor.lerp(new THREE.Color(0xe2e8f0), this.lightningFlash * 0.55);
    }

    this.scene.background = skyColor;
    (this.scene.fog as THREE.FogExp2).color.copy(skyColor);

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

    // Deeper atmospheric fog at night noticeably shortens player sightlines
    const weatherFog =
      this.weather === 'storm' || this.cinematicActive
        ? 0.0085
        : this.weather === 'rain'
          ? 0.0062
          : this.weather === 'overcast'
            ? 0.0048
            : 0.0034;
    (this.scene.fog as THREE.FogExp2).density =
      weatherFog + (1 - daylight) * 0.0082;

    const weatherDim =
      this.weather === 'storm' || this.cinematicActive
        ? 0.42
        : this.weather === 'rain'
          ? 0.58
          : this.weather === 'overcast'
            ? 0.76
            : 1.0;

    const sunFade = THREE.MathUtils.clamp((sunElev + 0.05) / 0.45, 0, 1);
    const moonRise = THREE.MathUtils.clamp((-sunElev + 0.05) / 0.5, 0, 1);

    this.sunLight.intensity =
      sunFade * 1.95 * weatherDim + this.lightningFlash * 1.9;
    this.sunLight.color
      .setHex(0xfff1d6)
      .lerp(new THREE.Color(0xf97316), twilight * 0.52);

    this.moonLight.intensity =
      moonRise * 0.58 * Math.max(0.45, weatherDim);

    this.hemiLight.color
      .setHex(0x1e293b)
      .lerp(new THREE.Color(0xbae6fd), daylight)
      .lerp(new THREE.Color(0xfda4af), twilight * 0.45);
    this.hemiLight.groundColor
      .setHex(0x0c1322)
      .lerp(new THREE.Color(0x3f4e28), daylight)
      .lerp(new THREE.Color(0x543822), twilight * 0.35);
    this.hemiLight.intensity =
      (0.24 + daylight * 0.54) * Math.max(0.55, weatherDim) +
      this.lightningFlash * 0.6;

    this.renderer.toneMappingExposure = 0.84 + daylight * 0.24;
    this.nightVisionLight.intensity = (1 - daylight) * 0.55;

    // Tint ocean & freshwater palette with day-night lighting
    if (this.world.oceanMesh.material instanceof THREE.MeshStandardMaterial) {
      this.world.oceanMesh.material.color
        .setHex(0x052838)
        .lerp(new THREE.Color(0x0b7285), daylight);
    }
    if (this.world.lakeMesh.material instanceof THREE.MeshStandardMaterial) {
      this.world.lakeMesh.material.color
        .setHex(0x0a4a4e)
        .lerp(new THREE.Color(0x14b8a6), daylight);
    }

    // Drifting 3D clouds
    this.world.cloudsGroup.rotation.y += dt * 0.006;

    // Rain particle drop animation
    const showRain =
      this.weather === 'rain' ||
      this.weather === 'storm' ||
      this.cinematicActive;
    this.rainPoints.visible = showRain;
    if (showRain) {
      const center = this.cinematicActive
        ? this.shipModel.position
        : this.camera.position;
      this.rainPoints.position.set(center.x, Math.max(0, center.y - 6), center.z);
      const posAttr = this.rainGeo.attributes.position as THREE.BufferAttribute;
      const fallSpeed = this.weather === 'storm' ? 24 : 18;
      for (let i = 0; i < posAttr.count; i++) {
        let ry = posAttr.getY(i) - fallSpeed * dt;
        if (ry < 0) ry = 18;
        posAttr.setY(i, ry);
      }
      posAttr.needsUpdate = true;
    }

    // Keep campfires & cooking stations steady and still on the ground
    this.structureVisuals.forEach((v) => {
      if (v.fireLight) {
        v.fireLight.intensity = 2.85;
      }
      if (v.flameGroup) {
        v.flameGroup.scale.set(1, 1, 1);
      }
    });

    // Waterfall shimmer & ocean normal drift
    if (
      this.world.oceanMesh.material instanceof THREE.MeshStandardMaterial &&
      this.world.oceanMesh.material.normalMap
    ) {
      this.world.oceanMesh.material.normalMap.offset.x += dt * 0.025;
      this.world.oceanMesh.material.normalMap.offset.y += dt * 0.018;
    }
    this.world.waterfallStreams.forEach((wf, idx) => {
      wf.scale.x = 0.92 + Math.sin(this.elapsed * 8 + idx) * 0.08;
    });
    this.world.waterfallFoam.scale.setScalar(
      0.95 + Math.sin(this.elapsed * 5) * 0.12,
    );
  }

  private updateCinematic(dt: number): void {
    this.cinematicTimer += dt;
    const t = this.cinematicTimer;

    // Ship tosses violently on storm ocean swells
    const swellY = Math.sin(t * 2.2) * 0.75;
    if (t < 3.2) {
      this.cinematicSubtitle =
        'A violent tropical storm tears across the open sea...';
      this.shipModel.position.set(-8 + t * 1.4, OCEAN_LEVEL + swellY, 168 - t * 2.5);
      this.shipModel.rotation.set(
        Math.sin(t * 2.5) * 0.12,
        0.35,
        Math.cos(t * 2.1) * 0.2,
      );
      this.camera.position.set(
        this.shipModel.position.x + 14,
        5.8 + Math.sin(t * 1.8) * 0.4,
        this.shipModel.position.z + 14,
      );
      this.camera.lookAt(
        this.shipModel.position.x,
        2.5,
        this.shipModel.position.z,
      );
    } else if (t < 6.4) {
      const p = (t - 3.2) / 3.2;
      this.cinematicSubtitle =
        'The hull cracks against hidden reefs — the vessel is going down!';
      this.shipModel.position.set(
        -3.5,
        OCEAN_LEVEL + swellY * 0.5 - p * 2.4,
        160 - p * 5,
      );
      this.shipModel.rotation.set(0.18 * p, 0.35, 0.2 + p * 0.55);
      this.camera.position.set(
        this.shipModel.position.x + 11 - p * 4,
        4.6 - p * 1.6,
        this.shipModel.position.z + 11 - p * 4,
      );
      this.camera.lookAt(
        this.shipModel.position.x,
        1.4 - p * 0.8,
        this.shipModel.position.z,
      );
    } else if (t < 9.6) {
      const p = (t - 6.4) / 3.2;
      this.cinematicSubtitle =
        'Thrown into the churning surf, you wash ashore on a mysterious island...';
      this.shipModel.position.y = OCEAN_LEVEL - 2.4 - p * 3.0;
      const camX = THREE.MathUtils.lerp(4, PLAYER_SPAWN.x, p);
      const camZ = THREE.MathUtils.lerp(144, PLAYER_SPAWN.z, p);
      const groundY = Math.max(OCEAN_LEVEL + 0.3, getTerrainHeight(camX, camZ));
      this.camera.position.set(
        camX,
        groundY + THREE.MathUtils.lerp(0.6, 1.62, p),
        camZ,
      );
      this.camera.lookAt(0, 2.5, 86);
    } else {
      this.finishCinematic();
    }

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
    if (this.hurtFlash > 0) this.hurtFlash -= dt;
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

    const wantSprint =
      Boolean(
        this.keys['ShiftLeft'] ||
          this.keys['ShiftRight'] ||
          this.keys['key_shift'] ||
          this.touchSprint,
      ) &&
      inputMag > 0.25 &&
      !this.isCrouching &&
      this.vitals.stamina > 2;

    this.isSprinting = wantSprint && !this.isSwimming;

    if (this.isSprinting) {
      this.vitals.stamina = Math.max(0, this.vitals.stamina - dt * 15);
    } else {
      this.vitals.stamina = Math.min(
        this.vitals.maxStamina,
        this.vitals.stamina + dt * 14,
      );
    }

    // Shelter, Fire & Body Temperature Calculation
    const inHilltopHouse =
      Math.hypot(this.playerX - HILL_HOUSE_POS.x, this.playerZ - HILL_HOUSE_POS.z) < 6.4;
    const sheltered =
      inHilltopHouse ||
      this.structures.some(
        (s) =>
          s.type === 'basic_shelter' &&
          Math.hypot(s.x - this.playerX, s.z - this.playerZ) < 6,
      );
    const nearFire = this.structures.some(
      (s) =>
        (s.type === 'campfire' || s.type === 'cooking_station') &&
        Math.hypot(s.x - this.playerX, s.z - this.playerZ) < 8,
    );

    const sunElev = Math.sin((this.timeOfDay - 0.25) * Math.PI * 2);
    const isNight = sunElev < -0.05;

    let targetTemp = 37.0;
    if (isNight) targetTemp -= 1.5;
    if (this.weather === 'rain') targetTemp -= 1.3;
    if (this.weather === 'storm') targetTemp -= 2.6;
    if (this.isSwimming) targetTemp -= 2.4;
    if (sheltered) targetTemp += 1.8;
    if (nearFire) targetTemp += 3.8;
    if (this.isSprinting) targetTemp += 0.6;
    targetTemp = THREE.MathUtils.clamp(targetTemp, 31.5, 37.8);
    this.vitals.temperatureC = THREE.MathUtils.damp(
      this.vitals.temperatureC,
      targetTemp,
      0.16,
      dt,
    );

    // Survival needs drain
    const drainScale = sheltered ? 0.55 : 1.0;
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

    // Hyper-fast ("faster than the speed of light") health auto-regeneration
    if (this.vitals.health < this.vitals.maxHealth) {
      this.vitals.health = Math.min(
        this.vitals.maxHealth,
        this.vitals.health + Math.max(40, dt * 6000),
      );
    }

    // Terrain, Built Bridges/Decks & Swimming state
    const waterLevel = getWaterLevelAt(this.playerX, this.playerZ);
    const terrainY = getTerrainHeight(this.playerX, this.playerZ);
    const deckY = this.getStructuralSurfaceY(this.playerX, this.playerZ, this.playerY);
    const standingSurfaceY = Math.max(terrainY, deckY);
    this.isSwimming = standingSurfaceY < waterLevel - 0.45;

    let baseSpeed = this.isSwimming
      ? 4.2
      : this.wallRunTimer > 0
        ? 11.4
        : this.isSprinting
          ? 9.4
          : this.isCrouching
            ? 3.1
            : inputMag > 0.65
              ? 6.0
              : 3.4;

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

      const maxClimbSlope = this.grounded ? 1.85 : 2.2;
      const canStep = (tx: number, tz: number): boolean => {
        if (this.isSwimming) return true;
        const th = Math.max(
          getTerrainHeight(tx, tz),
          this.getStructuralSurfaceY(tx, tz, this.playerY),
        );
        if (th <= standingSurfaceY + 0.35) return true;
        return getTerrainSlope(tx, tz) <= maxClimbSlope;
      };

      const stepSlope = getTerrainSlope(
        this.playerX + nx * baseSpeed * inputMag * dt,
        this.playerZ + nz * baseSpeed * inputMag * dt,
      );
      if (!this.isSwimming && stepSlope > 0.72 && deckY < -900) {
        baseSpeed *= 0.65;
        this.vitals.stamina = Math.max(0, this.vitals.stamina - dt * 4);
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

      // Playable Island Boundary
      const rad = Math.hypot(nextX, nextZ);
      if (rad > PLAYABLE_MAX_RADIUS) {
        nextX *= PLAYABLE_MAX_RADIUS / rad;
        nextZ *= PLAYABLE_MAX_RADIUS / rad;
      }

      // Collision detection (skip depleted rocks/crates; tighten radius on felled stumps)
      for (const col of this.world.colliders) {
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
        const dist = Math.hypot(cdx, cdz);
        const minD = activeRadius + 0.42;
        if (dist < minD && dist > 0.001) {
          nextX = col.x + (cdx / dist) * minD;
          nextZ = col.z + (cdz / dist) * minD;
        }
      }
      for (const st of this.structures) {
        if (st.type === 'sleeping_area' || st.type === 'basic_shelter') continue;
        const cdx = nextX - st.x;
        const cdz = nextZ - st.z;
        const dist = Math.hypot(cdx, cdz);
        const minD = 0.88;
        if (dist < minD && dist > 0.001) {
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

      this.currentSpeedMps = Math.hypot(nextX - this.playerX, nextZ - this.playerZ) / Math.max(0.001, dt);
      this.playerX = nextX;
      this.playerZ = nextZ;
      this.markExploredAroundPlayer();

      this.walkBobPhase += dt * (this.isSprinting ? 12.5 : 8.2) * inputMag;
      this.footstepAccum += baseSpeed * inputMag * dt;
      if (this.footstepAccum > (this.isSprinting ? 2.6 : 2.1)) {
        this.footstepAccum = 0;
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
        // 1. Steep cliff or mountain cavern slope wall
        const wh = getTerrainHeight(px, pz);
        if (wh >= this.playerY + 0.95 && getTerrainSlope(px, pz) >= 1.15) {
          detectedNormX = -rightX * side;
          detectedNormZ = -rightZ * side;
          return true;
        }
        // 2. Large cliff / cavern rock / house wall collider
        for (const col of this.world.colliders) {
          if (col.radius < 1.1) continue;
          const d = Math.hypot(px - col.x, pz - col.z);
          if (d <= col.radius + 0.45) {
            const nx = this.playerX - col.x;
            const nz = this.playerZ - col.z;
            const nl = Math.hypot(nx, nz) || 1;
            detectedNormX = nx / nl;
            detectedNormZ = nz / nl;
            return true;
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

    // Vertical physics / swimming buoyancy + walkable engineered bridges & roofs + wall-run gravity damping
    const newTerrainY = getTerrainHeight(this.playerX, this.playerZ);
    const newDeckY = this.getStructuralSurfaceY(this.playerX, this.playerZ, this.playerY);
    const newSurfaceY = Math.max(newTerrainY, newDeckY);
    const newWaterY = getWaterLevelAt(this.playerX, this.playerZ);
    this.isSwimming = newSurfaceY < newWaterY - 0.45;
    if (this.isSwimming) {
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
      this.playerVelY -= 21 * dt;
      this.playerY += this.playerVelY * dt;
      if (this.playerY <= newSurfaceY) {
        this.playerY = newSurfaceY;
        this.playerVelY = 0;
        this.grounded = true;
      }
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

    // Biome & Homestead discovery tracking
    const currentBiome = getBiomeAt(this.playerX, this.playerZ);
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

    // Update First-Person Hands & Held Tool Visuals
    this.updateFirstPersonHands(inputMag);

    // Auto-collect physical resource pickups when walking directly over them
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      if (
        !p.collected &&
        (p.autoCollectDelay ?? 0) <= 0 &&
        Math.hypot(p.x - this.playerX, p.z - this.playerZ) < 1.35
      ) {
        this.collectPickup(p.id);
      }
    }

    // Auto-prepare fallen carcasses when walking directly onto them after settle delay
    for (let i = this.carcasses.length - 1; i >= 0; i--) {
      const carcass = this.carcasses[i];
      const collectRadius = carcass.isDino ? 1.75 : 1.25;
      if (
        !carcass.harvested &&
        carcass.currentY === undefined &&
        (carcass.autoCollectDelay ?? 0) <= 0 &&
        Math.hypot(carcass.x - this.playerX, carcass.z - this.playerZ) < collectRadius
      ) {
        this.prepareCarcass(carcass.id);
      }
    }

    // Update crosshair target hitbox & nearby contextual interaction
    this.probeTargetHitbox();
    this.nearbyInteraction = this.findNearbyInteraction();

    // Update environment audio & Player Visibility (daylight, weather, campfire glow, stealth crouch, sprint)
    const shoreDist = Math.abs(Math.hypot(this.playerX, this.playerZ) - 125);
    const shoreProx = THREE.MathUtils.clamp(1 - shoreDist / 45, 0, 1);
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
      this.weather,
      daylight > 0.35,
      currentBiome === 'forest',
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

    // 1. Vault over medium obstacles (logs, crates, rocks, fences) directly ahead
    for (const col of this.world.colliders) {
      if (col.radius > 1.38) continue;
      const dx = col.x - this.playerX;
      const dz = col.z - this.playerZ;
      const dist = Math.hypot(dx, dz);
      if (dist > col.radius + 1.55 || dist < 0.45) continue;
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

    // Launch 6 high-velocity gravel & stone chunks along aim vector
    for (let i = 0; i < 6; i++) {
      const geo = new THREE.DodecahedronGeometry(0.11 + (i % 2) * 0.04, 0);
      const mat = new THREE.MeshStandardMaterial({
        color: i % 2 === 0 ? 0x78716c : 0xa8a29e,
        roughness: 0.92,
      });
      const mesh = new THREE.Mesh(geo, mat);
      const pos = _probeOrigin
        .clone()
        .addScaledVector(_probeDir, 0.8)
        .add(
          new THREE.Vector3(
            (Math.random() - 0.5) * 0.32,
            (Math.random() - 0.5) * 0.22,
            (Math.random() - 0.5) * 0.32,
          ),
        );
      mesh.position.copy(pos);
      this.scene.add(mesh);

      const spread = new THREE.Vector3(
        (Math.random() - 0.5) * 0.16,
        0.08 + (Math.random() - 0.5) * 0.12,
        (Math.random() - 0.5) * 0.16,
      );
      const vel = _probeDir.clone().add(spread).normalize().multiplyScalar(17.5);
      this.debrisProjectiles.push({
        mesh,
        pos,
        vel,
        life: 0.95,
      });
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
    const isBottleEquipped =
      eqId === 'dirty_water_bottle' || eqId === 'filtered_water_bottle';
    const isFoodHeld = Boolean(
      eqDef && eqDef.category === 'food' && eqId !== 'filtered_water_bottle',
    );

    const showConsumable =
      isEating || isDrinking || isWashing || isBottleEquipped || isFoodHeld;
    const isGun = !showConsumable && eqId === 'gun';
    const hasTool = Boolean(
      !showConsumable &&
        eqId &&
        (isActiveWeaponItem(eqId) ||
          ITEMS[eqId].category === 'tool' ||
          eqId === 'fishing_rod' ||
          eqId === 'lasso'),
    );

    this.handsRig.toolGroup.visible = hasTool;
    this.handsRig.gunMesh.visible = isGun;
    this.handsRig.shaft.visible = !isGun && hasTool;
    this.handsRig.axeHead.visible =
      !isGun && (eqId === 'stone_axe' || eqId === 'stone_pickaxe' || eqId === 'excavator_shovel');
    this.handsRig.spearTip.visible =
      !isGun && (eqId === 'wooden_spear' || eqId === 'hunting_knife');
    this.handsRig.clubHead.visible = !isGun && eqId === 'wooden_club';
    this.handsRig.bowArc.visible = !isGun && eqId === 'primitive_bow';
    this.handsRig.rodTip.visible =
      !isGun &&
      (eqId === 'fishing_rod' || eqId === 'rope_whip' || eqId === 'lasso');
    this.handsRig.sickleBlade.visible = !isGun && eqId === 'sickle';
    this.handsRig.warhammerHead.visible = !isGun && eqId === 'stone_warhammer';

    this.handsRig.consumableGroup.visible = showConsumable;
    this.handsRig.foodMesh.visible = isEating || (!isDrinking && !isWashing && !isBottleEquipped && isFoodHeld);
    this.handsRig.bottleGroup.visible = !this.handsRig.foodMesh.visible && showConsumable;
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
      this.handsRig.leftHand.rotation.x = 0;
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
      this.handsRig.leftHand.rotation.x = 0;
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
      this.handsRig.leftHand.rotation.x = -0.35 * plunge;
      return;
    }

    this.handsRig.rightHand.rotation.y = 0;
    this.handsRig.rightHand.rotation.z = 0;
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
      // Sturdy tactical two-handed sidearm hold with physical recoil kick
      this.handsRig.rightHand.position.set(
        0.2 + moveBobX * 0.5,
        -0.21 - idleBob - moveBobY * 0.5 + recoil * 0.07,
        -0.34 + recoil * 0.1,
      );
      this.handsRig.rightHand.rotation.x = -recoil * 0.42;
      this.handsRig.gunMesh.rotation.x = -recoil * 0.45;

      // Left stabilizing support hand cradling the grip base
      this.handsRig.leftHand.position.set(
        0.06 - moveBobX * 0.3,
        -0.24 + idleBob - moveBobY * 0.4 + recoil * 0.03,
        -0.35 + recoil * 0.06,
      );
      this.handsRig.leftHand.rotation.x = this.isSwimming
        ? -0.4 + Math.sin(this.elapsed * 6) * 0.35
        : -0.22;
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

  private findNearbyInteraction(): NearbyInteraction | null {
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
      }
      if (equippedId === 'gun') {
        const ammoCount = this.getItemCount('ammo');
        return {
          id: 'fire_gun',
          label: 'Fire Survival Gun',
          sublabel: ammoCount > 0 ? `${ammoCount} rds` : 'Emergency rd',
          kind: 'gun_action',
          actionCategory: 'shoot',
          distance: 0,
          targetX: this.playerX,
          targetY: this.playerY,
          targetZ: this.playerZ,
        };
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
      const treeNode = this.findNearestResourceNode(3.8, (n) =>
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
    let best: NearbyInteraction | null = null;
    let bestDist = 4.8;

    // 8A. Nearby Modular Vehicles (Pilot / Drive / Sail / Fly)
    for (const v of this.vehicles) {
      const d = Math.hypot(v.x - this.playerX, v.z - this.playerZ);
      if (d < 4.5 && Math.abs(v.y - this.playerY) < 3.6 && d < bestDist) {
        bestDist = d;
        const specs = computeVehicleSpecs(v.modules);
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

    // Check Hilltop House Functional Furniture & Appliances
    let bestHouse: HouseStationTarget | null = null;
    let bestHouseDist = 2.6;
    for (const hs of this.world.houseStations) {
      if (Math.abs(hs.y - this.playerY) > 2.2) continue;
      const d = Math.hypot(hs.x - this.playerX, hs.z - this.playerZ);
      if (d < bestHouseDist) {
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

    for (const n of this.world.resourceNodes) {
      if (n.hp <= 0) continue;
      const d = Math.hypot(n.x - this.playerX, n.z - this.playerZ);
      if (d < 3.8 && d < bestDist) {
        bestDist = d;
        const labelMap: Record<ResourceNodeKind, string> = {
          palm_tree: 'Chop Palm Tree',
          tropical_tree: 'Chop Hardwood Tree',
          banyan_tree: 'Chop Banyan Tree',
          highland_cedar: 'Chop Highland Cedar',
          branch_pile: 'Collect Branches',
          small_stone: 'Break Small Stone',
          stone_boulder: 'Mine Stone Boulder',
          mountain_rock: 'Mine Mountain Rock',
          ore_vein: 'Mine Metal Ore Vein',
          flint_outcrop: 'Chip Sharp Flint',
          fiber_fern: 'Gather Plant Fiber',
          grass_tuft: 'Cut Dried Grass',
          wheat_patch: 'Cut Golden Wheat',
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
          this.isTreeKind(n.kind)
            ? 'chop'
            : this.isRockKind(n.kind)
              ? 'mine'
              : n.kind === 'wheat_patch' || n.kind === 'sugarcane_patch'
                ? 'harvest'
                : 'gather';
        best = {
          id: n.id,
          label: labelMap[n.kind],
          sublabel: n.maxHp > 1 ? `HP ${n.hp}/${n.maxHp}` : undefined,
          kind: 'resource',
          actionCategory: category,
          distance: d,
          targetX: n.x,
          targetY: n.y,
          targetZ: n.z,
        };
      }
    }
    if (best) return best;

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
    for (const n of this.world.resourceNodes) {
      if (n.felled && (n.fallTimer ?? 0) > 0) {
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
          this.syncResourceVisual(n);
          const fdx = n.fallDirX ?? 1;
          const fdz = n.fallDirZ ?? 0;
          const dropX = n.x + fdx * 2.1;
          const dropZ = n.z + fdz * 2.1;
          this.spawnParticles(dropX, getTerrainHeight(dropX, dropZ) + 0.35, dropZ, 0x85532a, 10);
          const grants = this.pendingTreeDrops.get(n.id);
          if (grants) {
            this.pendingTreeDrops.delete(n.id);
            this.spawnWorldPickupsFromGrants(n.x, n.z, grants, fdx * 2.1, fdz * 2.1);
          }
        }
      }

      if (n.hp <= 0) {
        n.respawnTimer -= dt;
        if (n.respawnTimer <= 0) {
          n.hp = n.maxHp;
          n.felled = false;
          n.fallTimer = 0;
          this.shakenTreeDropIds.delete(n.id);
          this.syncResourceVisual(n);
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

    // Gently animate & expire ground pickups
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      if ((p.autoCollectDelay ?? 0) > 0) {
        p.autoCollectDelay = Math.max(0, (p.autoCollectDelay ?? 0) - dt);
      }
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.pickups.splice(i, 1);
        continue;
      }
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
          const dc = Math.hypot(a.pos.x - cc.x, a.pos.y - cc.y, a.pos.z - cc.z);
          if (dc <= cc.radius + 0.55) {
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
          if (zoneHit) {
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

      // If high velocity bullet didn't hit creature, check if it struck a breakable resource node
      if (!remove && a.isBullet) {
        for (const n of this.world.resourceNodes) {
          if (n.hp <= 0) continue;
          const d = Math.hypot(a.pos.x - n.x, a.pos.z - n.z);
          if (d < 1.4 && a.pos.y > n.y && a.pos.y < n.y + 4.5) {
            this.spawnParticles(a.pos.x, a.pos.y, a.pos.z, 0xffd700, 6);
            this.harvestResourceNode(n.id, ITEMS['gun']);
            remove = true;
            break;
          }
        }
      }

      if (remove) {
        this.scene.remove(a.mesh);
        a.mesh.geometry.dispose();
        (a.mesh.material as THREE.Material).dispose();
        this.arrows.splice(i, 1);
      }
    }

    // Update kicked rock/gravel debris projectiles (blind enemies on face hit & knock cave fissures!)
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
          if (Math.hypot(dp.pos.x - cc.x, dp.pos.y - cc.y, dp.pos.z - cc.z) <= cc.radius + 0.5) {
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
        this.scene.remove(dp.mesh);
        dp.mesh.geometry.dispose();
        (dp.mesh.material as THREE.Material).dispose();
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
                  this.stats.animalsHunted += 1;
                  this.spawnCarcass(
                    c.species,
                    cname,
                    this.isDinosaurSpecies(c.species),
                    c.x,
                    c.z,
                    c.yaw,
                    res.drops,
                    240,
                    undefined,
                    1.6,
                    c.y,
                  );
                  this.toast(`Cave Ceiling Crushed & Killed ${cname}!`, 'gain');
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

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.vel.y -= 12 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.scale.setScalar(Math.max(0.1, p.life * 2));
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
      }
    }
  }

  private updateCamera(): void {
    if (this.mode === 'menu') {
      this.handsRig.root.visible = false;
      const angle = this.elapsed * 0.14;
      const r = 92;
      _vec3A.set(
        Math.cos(angle) * r,
        28 + Math.sin(angle * 0.7) * 6,
        Math.sin(angle) * r,
      );
      _vec3B.set(0, 6, 0);
      this.camera.position.lerp(_vec3A, 0.04);
      this.camera.lookAt(_vec3B);
      return;
    }

    if (this.cinematicActive) {
      this.handsRig.root.visible = false;
      return;
    }

    if (this.tvModalOpen) {
      const tvTarget = this.resolveNearestTvTarget(true);
      if (tvTarget) {
        this.handsRig.root.visible = false;
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
        this.camera.position.lerp(_vec3A, 0.24);
        this.camera.lookAt(this._tvLookTarget);
        return;
      }
    }

    if (this.activeVehicleId) {
      const activeV = this.vehicles.find((v) => v.id === this.activeVehicleId);
      if (activeV) {
        this.handsRig.root.visible = false;
        const specs = computeVehicleSpecs(activeV.modules);
        const surfY = Math.max(
          getTerrainHeight(activeV.x, activeV.z),
          this.getStructuralSurfaceY(activeV.x, activeV.z, activeV.y + 0.6),
        );
        const airborne = specs.canFly && activeV.y > surfY + 0.6;
        const chaseDist = airborne ? 9.6 : 7.6;
        const fwdX = -Math.sin(this.camYaw);
        const fwdZ = -Math.cos(this.camYaw);
        const cx = activeV.x - fwdX * chaseDist;
        const cz = activeV.z - fwdZ * chaseDist;
        const groundAtCam = Math.max(
          getTerrainHeight(cx, cz),
          getWaterLevelAt(cx, cz),
        );
        const lift = THREE.MathUtils.clamp(3.3 - this.camPitch * 4.2, 1.3, 8.2);
        const cy = Math.max(groundAtCam + 0.9, activeV.y + lift);
        this.camera.position.set(cx, cy, cz);
        this.camera.lookAt(activeV.x, activeV.y + 1.35, activeV.z);
        return;
      }
    }

    if (this.mountedCreatureId) {
      const c = this.creatures.creatures.find((x) => x.id === this.mountedCreatureId);
      if (c) {
        this.handsRig.root.visible = false;
        const chaseDist = c.species === 'brachiosaurus' || c.species === 'trex' ? 10.5 : 5.8;
        const fwdX = -Math.sin(this.camYaw);
        const fwdZ = -Math.cos(this.camYaw);
        const cx = c.x - fwdX * chaseDist;
        const cz = c.z - fwdZ * chaseDist;
        const groundAtCam = Math.max(getTerrainHeight(cx, cz), getWaterLevelAt(cx, cz));
        const lift = THREE.MathUtils.clamp(2.8 - this.camPitch * 3.5, 1.2, 7.5);
        const cy = Math.max(groundAtCam + 0.8, c.y + lift);
        this.camera.position.set(cx, cy, cz);
        this.camera.lookAt(c.x, c.y + (c.species === 'trex' ? 2.4 : 1.4), c.z);
        return;
      }
    }

    this.handsRig.root.visible = true;
    const headBobY =
      this.grounded &&
      (Math.abs(this.joyX) + Math.abs(this.joyY) > 0.1 ||
        this.keys['KeyW'] ||
        this.keys['KeyS'] ||
        this.keys['KeyA'] ||
        this.keys['KeyD'] ||
        this.keys['key_w'] ||
        this.keys['key_s'] ||
        this.keys['key_a'] ||
        this.keys['key_d'] ||
        this.keys['ArrowUp'] ||
        this.keys['ArrowDown'] ||
        this.keys['ArrowLeft'] ||
        this.keys['ArrowRight'])
        ? Math.sin(this.walkBobPhase) * 0.042
        : 0;
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
        : 0;

    const blastShakeX =
      this.cameraShakeTimer > 0
        ? Math.sin(this.elapsed * 58) * 0.14 * (this.cameraShakeTimer / 0.45)
        : 0;
    const blastShakeY =
      this.cameraShakeTimer > 0
        ? Math.cos(this.elapsed * 49) * 0.14 * (this.cameraShakeTimer / 0.45)
        : 0;

    this.camera.position.set(
      this.playerX + blastShakeX,
      this.playerY + this.currentEyeHeight + headBobY + washDip + blastShakeY,
      this.playerZ,
    );
    this.camera.rotation.set(
      this.camPitch + hurtKick + chewNod + drinkNod,
      this.camYaw,
      this.wallTiltAngle,
      'YXZ',
    );
  }

  private emitHud(): void {
    const biome = getBiomeAt(this.playerX, this.playerZ);
    const sheltered = this.structures.some(
      (s) =>
        s.type === 'basic_shelter' &&
        Math.hypot(s.x - this.playerX, s.z - this.playerZ) < 6,
    );
    const nearFire = this.structures.some(
      (s) =>
        (s.type === 'campfire' || s.type === 'cooking_station') &&
        Math.hypot(s.x - this.playerX, s.z - this.playerZ) < 8,
    );
    const nearOceanWater = this.isNearOceanWater();
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
    };
    const momentumState: MomentumHudState = {
      wallRunning: this.wallRunTimer > 0,
      wallSide: this.wallRunSide,
      vaulting: this.vaultTimer > 0,
      speedMps: Number(this.currentSpeedMps.toFixed(1)),
      kickCooldown: Number(this.kickCooldown.toFixed(1)),
      nearCaveBoss:
        Math.hypot(this.playerX - CAVE_POS.x, this.playerZ - CAVE_POS.z) < 22,
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
        const specs = computeVehicleSpecs(av.modules);
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
          cargoUsed: av.cargoItems.reduce((s, c) => s + c.quantity, 0),
          cargoCapacity: specs.cargoCapacity,
        };
      }
    }

    this.callbacks.onHudUpdate({
      vitals: { ...this.vitals },
      dayCount: this.dayCount,
      timeOfDay: this.timeOfDay,
      weather: this.weather,
      biome,
      biomeName: BIOME_INFO[biome].name,
      playerX: this.playerX,
      playerY: this.playerY,
      playerZ: this.playerZ,
      playerYaw: this.playerYaw,
      isSwimming: this.isSwimming,
      isSprinting: this.isSprinting,
      isCrouching: this.isCrouching,
      isSheltered: sheltered,
      nearFire,
      nearOceanWater,
      visibilityPercent: Math.round(this.playerVisibility * 100),
      isNight,
      nocturnalActiveCount: this.nocturnalActiveCount,
      nearbyInteraction: this.nearbyInteraction,
      nearbyCarcass,
      inventory: this.inventory.map((s) => ({ ...s })),
      hotbarItemIds: [...this.hotbarItemIds],
      equippedSlot: this.equippedSlot,
      hudBarCapacity: this.hotbarItemIds.length,
      maxHudBarCapacity: MAX_HUD_BAR_SLOTS,
      backpackCompartments: this.backpackCompartments.map((c) => ({ ...c })),
      totalBackpackCompartments: TOTAL_BACKPACK_COMPARTMENTS,
      emptyCompartmentsCount:
        TOTAL_BACKPACK_COMPARTMENTS - this.backpackCompartments.length,
      structures: this.structures.map((s) => ({
        ...s,
        chestItems: s.chestItems ? s.chestItems.map((c) => ({ ...c })) : undefined,
      })),
      visitedBiomes: Array.from(this.visitedBiomes),
      exploredCells: Array.from(this.exploredCells),
      stats: { ...this.stats },
      completedMissionIds: Array.from(this.completedMissionIds),
      trackedSightings: [...this.trackedSightings],
      cinematicActive: this.cinematicActive,
      cinematicSubtitle: this.cinematicSubtitle,
      gameOver: this.gameOver,
      gameOverReason: this.gameOverReason,
      coins: this.coins,
      seatedLabel: this.seatedState?.label ?? null,
      plantedCrops: this.plantedCrops.map((c) => ({ ...c })),
      fridgeItems: this.fridgeItems.map((s) => ({ ...s })),
      structuralSummary,
      terrainSummary,
      targetHitbox: this.targetHitbox ? { ...this.targetHitbox } : null,
      momentumState,
      kineticSummary,
      vehicles: this.vehicles.map((v) => ({
        ...v,
        modules: v.modules.map((m) => ({ ...m })),
        cargoItems: v.cargoItems.map((c) => ({ ...c })),
      })),
      activeVehicle,
      selectedCargoVehicleId: this.selectedCargoVehicleId,
      gameMode: this.gameMode,
      bloodMoonActive: this.isBloodMoonNight(),
      daysUntilBloodMoon: 7 - ((this.dayCount - 1) % 7),
      bossesDefeatedCount: this.creatures.creatures.filter((c) => c.isBoss && !c.alive).length,
      objectiveText: this.computeObjectiveText(),
      hitMarkerActive: this.hitMarkerActive,
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
          currentTime: Math.floor(this.smartTv.currentTimestamp),
          isLocalVideo: isLocal,
          localVideoName: localName,
          isYouTubeActive: isYt,
          youtubeVideoId: this.smartTv.youtubeVideoId,
          youtubeTitle: this.smartTv.youtubeTitle,
          youtubeChannel: this.smartTv.youtubeChannel,
          spatialVolume:
            Math.round(this.smartTv.volume * this.smartTv.getSpatialMultiplier() * 100),
        };
      })(),
    });
  }

  private tick = (): void => {
    if (this.disposed) return;
    const dt = Math.min(0.05, this.clock.getDelta());
    this.elapsed += dt;

    this.updateWeatherAndAtmosphere(dt);

    const sunElev = Math.sin((this.timeOfDay - 0.25) * Math.PI * 2);
    const isNight = sunElev < -0.05;

    if (this.mode === 'playing' && !this.gameOver) {
      if (this.cinematicActive) {
        this.updateCinematic(dt);
        this.hudSyncTimer += dt;
        if (this.hudSyncTimer >= 0.15) {
          this.hudSyncTimer = 0;
          this.emitHud();
        }
      } else {
        this.updatePlayer(dt);
        this.updateProjectilesAndResources(dt);
        this.updateStructuralAndTerrainSystems(dt);
        this.updateKineticNetwork(dt);
        this.updateVehicles(dt);
        this.updateBuildPreview();
        const scavengerTargets: ScavengerCarcassTarget[] = this.carcasses
          .filter((c) => !c.harvested && c.fallProgress >= 0.85)
          .map((c) => ({
            id: c.id,
            x: c.x,
            y: c.y,
            z: c.z,
            isDino: c.isDino,
            remainingDrops: c.drops.reduce(
              (sum, d) => sum + Math.max(0, d.quantity),
              0,
            ),
          }));
        const creatureCycle = this.creatures.update(
          dt,
          this.elapsed,
          this.playerX,
          this.playerZ,
          this.isSprinting,
          this.isCrouching,
          isNight,
          this.playerVisibility,
          () => {
            this.vitals.health = this.vitals.maxHealth;
            this.emitHud();
          },
          (species, dist) => {
            this.sound.playCreatureCall(species, Math.max(0.2, 1 - dist / 50));
          },
          (sightings) => {
            this.trackedSightings = sightings;
          },
          scavengerTargets,
          (carcassId, species, displayName) => {
            this.handleCarcassScavenged(carcassId, species, displayName);
          },
        );
        this.nocturnalActiveCount = creatureCycle.nocturnalActiveCount;

        this.hudSyncTimer += dt;
        if (this.hudSyncTimer >= 0.12) {
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
      this.updateKineticNetwork(dt);
      const creatureCycle = this.creatures.update(
        dt,
        this.elapsed,
        9999,
        9999,
        false,
        false,
        false,
        1.0,
        () => {},
        () => {},
        () => {},
      );
      this.nocturnalActiveCount = creatureCycle.nocturnalActiveCount;
    }

    // Subtle idle life for Farmer NPC & glowing TV screen inside the Hilltop House
    if (this.world.farmerNpcGroup) {
      const distFarmer = Math.hypot(
        this.world.farmerNpcPos.x - this.playerX,
        this.world.farmerNpcPos.z - this.playerZ,
      );
      if (distFarmer < 8 && this.mode === 'playing') {
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
    // Update 3D Smart TV OS CanvasTexture & Sync CSS3DRenderer YouTube Frame onto the physical 3D TV screen
    this.smartTv.update(dt, {
      dayCount: this.dayCount,
      timeOfDay: this.timeOfDay,
      weather: this.weather,
      erosionActive: this.terrainEngine.getActiveStreamCount() > 0,
      tamedCount: this.creatures.creatures.filter((c) => c.alive && c.tamed).length,
      dinoCount: this.creatures.creatures.filter(
        (c) =>
          c.alive &&
          (c.spec.species === 'trex' ||
            c.spec.species === 'triceratops' ||
            c.spec.species === 'velociraptor' ||
            c.spec.species === 'stegosaurus' ||
            c.spec.species === 'brachiosaurus' ||
            c.spec.species === 'parasaurolophus'),
      ).length,
      daysUntilBloodMoon: 7 - ((this.dayCount - 1) % 7),
      playerBiome: BIOME_INFO[getBiomeAt(this.playerX, this.playerZ)].name,
    });
    if (this.mode !== 'menu' && !this.cinematicActive) {
      this.smartTv.updateSpatialAudio(this.playerX, this.playerY, this.playerZ);
    }

    // Sync placed smart_tv structure materials & standby LEDs with global SmartTvSystem
    for (const st of this.structures) {
      if (st.type !== 'smart_tv') continue;
      const visual = this.structureVisuals.get(st.id);
      if (visual) {
        this.smartTv.syncPlacedTvVisual(visual.group);
        if (visual.fireLight) {
          visual.fireLight.intensity = this.smartTv.power ? 1.65 : 0;
        }
      }
    }

    if (this.tvModalOpen) {
      this.hudSyncTimer += dt;
      if (this.hudSyncTimer >= 0.85) {
        this.hudSyncTimer = 0;
        this.emitHud();
      }
    }

    this.updateCamera();
    this.renderer.render(this.scene, this.camera);

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (gl && typeof gl.fenceSync === 'function') {
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (this.disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          this.frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          this.frameId = window.setTimeout(cb, 80);
        }
      };
      this.frameId = window.setTimeout(poll, 5);
    } else {
      this.frameId = window.setTimeout(cb, 80);
    }
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
    this.structuralMeshes.forEach((m) => this.scene.remove(m));
    this.structuralMeshes.clear();
    this.structuralBlocks = [];
    for (const c of this.collapsingBlocks) {
      this.scene.remove(c.mesh);
    }
    this.collapsingBlocks = [];
    for (const k of this.primedKegs) {
      this.scene.remove(k.mesh);
    }
    this.primedKegs = [];
    for (const t of this.torrentCasks) {
      this.scene.remove(t.mesh);
    }
    this.torrentCasks = [];
    if (this.previewGroup) {
      this.scene.remove(this.previewGroup);
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
    return bestY;
  }

  private findNearestAimedStructuralBlock(maxDist: number): StructuralBlock | null {
    const meshList = Array.from(this.structuralMeshes.values());
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
      this.structuralMeshes.delete(b.id);
    }
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

    const meshList = Array.from(this.structuralMeshes.values());
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
      const dir = _vec3A.set(0, 0, -1).applyEuler(
        new THREE.Euler(this.camPitch, this.camYaw, 0, 'YXZ'),
      );
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
      if (this.previewGroup) this.previewGroup.visible = false;
      if (this.kineticPreviewGroup) this.kineticPreviewGroup.visible = false;
      this.previewTarget = null;
      this.kineticPreviewTarget = null;
      return;
    }

    if (kineticKind) {
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
      if (this.previewGroup) {
        this.previewGroup.visible = false;
      }
      this.previewTarget = null;
      return;
    }

    if (this.previewKind !== structKind) {
      if (this.previewGroup) {
        this.scene.remove(this.previewGroup);
        this.disposeObject3D(this.previewGroup);
      }
      this.previewGroup = createStructuralBlockMesh(structKind, true);
      this.previewKind = structKind;
      this.scene.add(this.previewGroup);
    }

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
    if (!kind || this.getItemCount(itemId) <= 0) return false;

    const target = this.computeStructuralPlacementTarget(kind);
    if (
      this.structuralBlocks.some(
        (b) => b.gx === target.gx && b.gy === target.gy && b.gz === target.gz,
      )
    ) {
      this.toast('Space occupied — aim beside or on top of the span', 'warning');
      return false;
    }

    this.removeItem(itemId, 1);
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
    const dir = _vec3A.set(0, 0, -1).applyEuler(
      new THREE.Euler(this.camPitch, this.camYaw, 0, 'YXZ'),
    );
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

    const dir = new THREE.Vector3(0, 0, -1).applyEuler(
      new THREE.Euler(this.camPitch, this.camYaw, 0, 'YXZ'),
    );
    const start = new THREE.Vector3(
      this.playerX + dir.x * 0.8,
      this.playerY + this.currentEyeHeight - 0.15,
      this.playerZ + dir.z * 0.8,
    );
    const vel = dir.multiplyScalar(13.5);
    vel.y += 4.2;

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
          this.stats.animalsHunted += 1;
          const isDino = this.isDinosaurSpecies(c.species);
          this.spawnCarcass(
            c.species,
            c.displayNameOverride || c.spec.displayName,
            isDino,
            c.x,
            c.z,
            c.yaw,
            res.drops,
            240,
            undefined,
            1.6,
            c.y,
          );
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

    // 1. Advance volumetric fluid erosion & slope avalanches
    const isRaining = this.weather === 'rain' || this.weather === 'storm';
    const erosionRes = this.terrainEngine.step(
      dt,
      this.world.terrainMesh,
      this.world.baseTerrainColors,
      isRaining,
      this.playerX,
      this.playerZ,
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
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material?.dispose();
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
      const roverY = getTerrainHeight(-6.5, 106);
      const rover = createVehicleFromPreset(
        'veh_starter_rover',
        'expedition_rover',
        -6.5,
        roverY,
        106,
        Math.PI * 0.88,
      );
      this.spawnVehicleInstance(rover);

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
        new THREE.Vector3(link.fromX, link.fromY, link.fromZ),
        new THREE.Vector3(link.toX, link.toY, link.toZ),
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
    const dir = _vec3A.set(0, 0, -1).applyEuler(
      new THREE.Euler(this.camPitch, this.camYaw, 0, 'YXZ'),
    );
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
    if (!kind || this.getItemCount(itemId) <= 0) return false;

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

    this.removeItem(itemId, 1);
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

      const omega = (kn.rpm * Math.PI * 2) / 60;
      if (Math.abs(kn.rpm) >= 8 && Math.hypot(kn.x - this.playerX, kn.z - this.playerZ) < 16) {
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
        Math.hypot(kn.x - this.playerX, kn.z - this.playerZ) < 42
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
              if (Math.hypot(kn.x - this.playerX, kn.z - this.playerZ) < 35) {
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

  private spawnVehicleInstance(v: ModularVehicleData): void {
    const built = createModularVehicleMesh(v);
    built.root.position.set(v.x, v.y, v.z);
    built.root.rotation.y = v.yaw;
    for (const sw of built.steerWheels) {
      sw.rotation.order = 'YXZ';
    }
    this.scene.add(built.root);
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
        rebuilt.root.position.set(existing.x, existing.y, existing.z);
        rebuilt.root.rotation.y = existing.yaw;
        for (const sw of rebuilt.steerWheels) {
          sw.rotation.order = 'YXZ';
        }
        this.scene.add(rebuilt.root);
        this.vehicleMeshes.set(existing.id, rebuilt);
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
    const specs = computeVehicleSpecs(v.modules);
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
    const idx = this.vehicles.findIndex((v) => v.id === vehicleId);
    if (idx === -1) return;
    const v = this.vehicles[idx];
    this.vehicles.splice(idx, 1);
    const mesh = this.vehicleMeshes.get(vehicleId);
    if (mesh) {
      this.scene.remove(mesh.root);
      this.disposeObject3D(mesh.root);
      this.vehicleMeshes.delete(vehicleId);
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
    this.seatedState = null;
    this.activeVehicleId = v.id;
    this.vehicleForwardSpeed = 0;
    this.vehicleSteerAngle = 0;
    this.vehicleAltitudeVel = 0;
    this.vehicleAscendHold = false;
    this.vehicleDescendHold = false;
    this.isCrouching = false;
    this.touchCrouch = false;
    this.camYaw = v.yaw - Math.PI;
    this.camPitch = -0.18;
    const specs = computeVehicleSpecs(v.modules);
    this.sound.playSteamHiss();
    this.toast(
      `Piloting ${v.name} (${specs.craftClass}) · WASD Drive · [E] Exit · [F] Cargo`,
      'discovery',
    );
    this.emitHud();
    return true;
  }

  public exitVehicle(): void {
    if (!this.activeVehicleId) return;
    const v = this.vehicles.find((x) => x.id === this.activeVehicleId);
    this.activeVehicleId = null;
    this.vehicleForwardSpeed = 0;
    this.vehicleAltitudeVel = 0;
    this.vehicleAscendHold = false;
    this.vehicleDescendHold = false;
    if (v) {
      const sideX = Math.cos(v.yaw);
      const sideZ = -Math.sin(v.yaw);
      this.playerX = v.x + sideX * 2.3;
      this.playerZ = v.z + sideZ * 2.3;
      this.playerY = Math.max(
        getTerrainHeight(this.playerX, this.playerZ),
        this.getStructuralSurfaceY(this.playerX, this.playerZ, v.y + 1.5),
      );
      this.playerVelY = 0;
      this.grounded = true;
      this.toast(`Exited ${v.name}`, 'info');
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
    const specs = computeVehicleSpecs(v.modules);

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
    const isInWater = surfY < waterY - 0.28 && v.y <= waterY + 0.5;
    const airborne = specs.canFly && (this.vehicleAscendHold || v.y > Math.max(surfY, waterY) + 0.55);

    const topSpeed = airborne
      ? specs.topAirSpeed * boostMult * fuelMult
      : isInWater
        ? specs.topWaterSpeed * boostMult * fuelMult
        : specs.topLandSpeed * boostMult * fuelMult;

    // Braking / Throttle
    if (!specs.canFly && this.vehicleAscendHold) {
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
    const rad = Math.hypot(nextX, nextZ);
    if (rad > PLAYABLE_MAX_RADIUS + 18) {
      nextX *= (PLAYABLE_MAX_RADIUS + 18) / rad;
      nextZ *= (PLAYABLE_MAX_RADIUS + 18) / rad;
    }

    // Ground & bridge collision vs Airship clearance
    if (!airborne || v.y < Math.max(surfY, waterY) + 3.2) {
      for (const col of this.world.colliders) {
        if (col.radius < 0.9) continue;
        const dx = nextX - col.x;
        const dz = nextZ - col.z;
        const d = Math.hypot(dx, dz);
        const minD = col.radius + 1.55;
        if (d < minD && d > 0.01) {
          nextX = col.x + (dx / d) * minD;
          nextZ = col.z + (dz / d) * minD;
          this.vehicleForwardSpeed *= 0.85;
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
      if (nextSurf < nextWater - 1.2) {
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
          this.creatures.damageCreature(c, ramDmg, v.x, v.z, {
            stunSeconds: 0.9,
            knockback: 3.5,
          });
          this.sound.playAttack('melee');
          this.spawnParticles(c.x, c.y + 0.9, c.z, 0xdc2626, 6);
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
      : THREE.MathUtils.clamp(Math.atan2(sampleBackY - sampleFwdY, 2.8), -0.4, 0.4);
    const desiredRoll = THREE.MathUtils.clamp(
      moveRight * (airborne ? 0.24 : 0.09) * Math.min(1, spd / 8),
      -0.3,
      0.3,
    );
    this.vehicleVisualPitch = THREE.MathUtils.damp(this.vehicleVisualPitch, desiredPitch, 9, dt);
    this.vehicleVisualRoll = THREE.MathUtils.damp(this.vehicleVisualRoll, desiredRoll, 9, dt);

    this.vehicleEngineSoundAccum += dt;
    if ((spd > 2 || airborne) && this.vehicleEngineSoundAccum >= 0.45) {
      this.vehicleEngineSoundAccum = 0;
      this.sound.playKineticGearTick();
    }
    this.nearbyInteraction = null;
  }

  private updateVehicles(dt: number): void {
    for (const v of this.vehicles) {
      const specs = computeVehicleSpecs(v.modules);
      const handles = this.vehicleMeshes.get(v.id);
      const isActive = v.id === this.activeVehicleId;

      if (!isActive) {
        const surf = Math.max(
          getTerrainHeight(v.x, v.z),
          this.getStructuralSurfaceY(v.x, v.z, v.y + 0.8),
        );
        const water = getWaterLevelAt(v.x, v.z);
        const restY = specs.canFloat ? Math.max(surf, water - 0.14) : surf;
        v.y = THREE.MathUtils.damp(v.y, restY, 6, dt);
        v.vx = 0;
        v.vz = 0;
      }

      if (!handles) continue;
      handles.root.position.set(v.x, v.y, v.z);
      handles.root.rotation.order = 'YXZ';
      if (isActive) {
        handles.root.rotation.set(
          this.vehicleVisualPitch,
          v.yaw,
          this.vehicleVisualRoll,
        );
      } else {
        handles.root.rotation.set(0, v.yaw, 0);
      }

      const spd = isActive ? this.vehicleForwardSpeed : 0;
      const wheelRoll = (spd / 0.42) * dt;
      for (const w of handles.wheels) {
        w.rotation.x += wheelRoll;
      }
      if (isActive) {
        for (const sw of handles.steerWheels) {
          sw.rotation.y = this.vehicleSteerAngle;
        }
        for (const r of handles.rudders) {
          r.rotation.y = -this.vehicleSteerAngle * 1.1;
        }
        if (handles.helmWheel) {
          handles.helmWheel.rotation.z = this.vehicleSteerAngle * 2.2;
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
  }

  public spawnCustomVehicle(vehicle: ModularVehicleData): void {
    this.vehicles.push(vehicle);
    const handles = createModularVehicleMesh(vehicle);
    this.vehicleMeshes.set(vehicle.id, handles);
    this.scene.add(handles.root);
    this.toast(`Spawned ${vehicle.name} in the world!`, 'discovery');
    this.emitHud();
  }

  public executeConsoleCommand(cmdStr: string): void {
    const parts = cmdStr.trim().toLowerCase().split(/\s+/);
    const cmd = parts[0];
    const arg = parts[1];

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
      if (arg === 'raptor' || arg === 'velociraptor') {
        this.creatures.spawnWildAnimalAt('velociraptor', cx, cz);
        this.toast('Spawned Velociraptor at crosshair', 'discovery');
      } else if (arg === 'trex' || arg === 'tyrannosaurus') {
        this.creatures.spawnWildAnimalAt('trex', cx, cz);
        this.toast('Spawned Tyrannosaurus Rex at crosshair', 'discovery');
      } else if (arg === 'triceratops') {
        this.creatures.spawnWildAnimalAt('triceratops', cx, cz);
        this.toast('Spawned Triceratops at crosshair', 'discovery');
      } else if (arg === 'brachiosaurus') {
        this.creatures.spawnWildAnimalAt('brachiosaurus', cx, cz);
        this.toast('Spawned Brachiosaurus at crosshair', 'discovery');
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
    } else {
      this.toast(`Unknown command: ${cmd}. Available: /god, /spawn, /weather, /time, /gravity, /erosion, /tame, /mount, /clear`, 'warning');
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
      this.playerY = getTerrainHeight(this.playerX, this.playerZ);
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

    this.playerX = c.x;
    this.playerY = c.y + (c.species === 'trex' ? 2.8 : 1.6);
    this.playerZ = c.z;
    this.playerYaw = c.yaw;
    this.currentSpeedMps = Math.abs(moveForward) * baseSpd;
    this.grounded = true;
    this.isSwimming = false;
    this.markExploredAroundPlayer();

    // Trample attack against nearby hostile creatures
    if (sprinting && (c.species === 'trex' || c.species === 'triceratops' || c.species === 'velociraptor')) {
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

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('blur', this.onWindowBlur);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);

    if (this.terrainEngine) {
      this.terrainEngine.dispose(this.scene);
    }

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
    if (this.smartTv) {
      this.smartTv.dispose();
    }
    this.renderer.dispose();
  }
}
