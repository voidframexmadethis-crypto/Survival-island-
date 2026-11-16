import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SoundEngine } from '../audio/soundEngine';
import { ITEMS, isActiveWeaponItem, isAmmoItem } from '../data/items';
import { STAGE_1_MISSIONS } from '../data/missions';
import { COOKING_RECIPES, CRAFTING_RECIPES } from '../data/recipes';
import {
  CreatureManager,
  ScavengerCarcassTarget,
} from '../systems/creatureSystem';
import { rollStage1FishCatch } from '../systems/marineRoadmap';
import {
  BiomeId,
  CampStructureType,
  CarcassSaveData,
  CreatureSpecies,
  GameSaveData,
  GameSettings,
  GameStats,
  HUDStateSnapshot,
  InventorySlot,
  ItemDefinition,
  ItemId,
  NearbyInteraction,
  PlacedStructure,
  PlayerVitals,
  ResourceNodeKind,
  ResourceNodeState,
  ResourceToast,
  SavedResourceNodeState,
  TrackedSighting,
  WeatherType,
  WorldPickupSave,
} from '../types';
import {
  createCampStructureModel,
  createCarcassMesh,
  createFirstPersonHandsRig,
  createPickupMesh,
  createSailingShipModel,
  createSkyCelestialBodies,
  FirstPersonHandsRig,
  SkyCelestialHandles,
} from '../world/models';
import {
  AUTUMN_GROVE_POS,
  BIOME_INFO,
  CAVE_POS,
  EXPEDITION_POS,
  HOMESTEAD_POS,
  LAKE_CENTER,
  OCEAN_LEVEL,
  PLAYABLE_MAX_RADIUS,
  PLAYER_SPAWN,
  SNOWY_WOODLAND_POS,
  SWAMP_POS,
  getBiomeAt,
  getTerrainHeight,
  getTerrainSlope,
  getWaterLevelAt,
  isFreshwaterAt,
} from '../world/terrain';
import { buildIslandWorld, WorldHandles } from '../world/worldBuilder';

const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();

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
    station: 'crafting' | 'cooking' | 'chest',
    structureId?: string,
  ) => void;
}

export class GameEngine {
  private container: HTMLElement;
  private callbacks: EngineCallbacks;
  private sound = new SoundEngine();

  private isSoftwareGl = false;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
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
  private hotbarItemIds: (ItemId | null)[] = [
    null,
    null,
    null,
    null,
    null,
    null,
  ];
  private equippedSlot = 0;
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
  private nearbyInteraction: NearbyInteraction | null = null;

  // Dynamic Projectiles, Pickups & Particles
  private arrows: ArrowProjectile[] = [];
  private particles: HitParticle[] = [];
  private pickups: ActivePickup[] = [];
  private carcasses: ActiveCarcass[] = [];
  private pendingTreeDrops = new Map<string, [ItemId, number][]>();
  private shakenTreeDropIds = new Set<string>();
  private nodeById = new Map<string, ResourceNodeState>();
  private particleGeo = new THREE.BoxGeometry(0.14, 0.14, 0.14);

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

    // Build World, Sailing Ship (for Intro), Rain Particles & Creatures
    this.world = buildIslandWorld(this.scene, this.renderer);
    this.world.resourceNodes.forEach((n) => this.nodeById.set(n.id, n));

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

    if (e.code === 'Space' && this.grounded && !this.isSwimming) {
      this.playerVelY = 7.4;
      this.grounded = false;
    } else if (e.code === 'KeyC' || e.code === 'ControlLeft') {
      this.isCrouching = !this.isCrouching;
      this.touchCrouch = this.isCrouching;
      this.emitHud();
    } else if (e.code === 'KeyE') {
      this.triggerPrimaryAction();
    } else if (e.code === 'KeyF') {
      this.collectNearbyCarcass();
    } else if (e.code === 'Digit0' || e.code === 'Backquote') {
      this.selectHotbarSlot(-1);
    } else if (e.code.startsWith('Digit')) {
      const idx = parseInt(e.code.replace('Digit', ''), 10) - 1;
      if (idx >= 0 && idx < 6) {
        this.selectHotbarSlot(idx);
      }
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys[e.code] = false;
    const keyLower = e.key ? e.key.toLowerCase() : '';
    if (keyLower) this.keys[`key_${keyLower}`] = false;
  };

  public unlockAudio(): void {
    this.sound.unlock();
  }

  public setMode(mode: 'menu' | 'playing' | 'paused'): void {
    const wasNotPlaying = this.mode !== 'playing';
    this.mode = mode;
    if (mode !== 'playing') {
      this.clearMovementInputs();
    } else {
      this.sound.unlock();
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
    if (index === -1 || (index >= 0 && index < 6)) {
      this.equippedSlot = index;
      this.emitHud();
    }
  }

  public assignHotbarSlot(slotIndex: number, itemId: ItemId | null): void {
    if (slotIndex < 0 || slotIndex >= 6) return;
    this.hotbarItemIds[slotIndex] = itemId;
    this.equippedSlot = slotIndex;
    this.emitHud();
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

    // Starter survival pack salvaged on shore: Survival Gun, Basic Knife & diverse crafting materials
    this.inventory = [
      { itemId: 'gun', quantity: 1 },
      { itemId: 'hunting_knife', quantity: 1 },
      { itemId: 'ammo', quantity: 60 },
      { itemId: 'berries', quantity: 4 },
      { itemId: 'wood', quantity: 6 },
      { itemId: 'branch', quantity: 6 },
      { itemId: 'stone', quantity: 6 },
      { itemId: 'flint', quantity: 4 },
      { itemId: 'fiber', quantity: 6 },
      { itemId: 'leaves', quantity: 4 },
      { itemId: 'grass', quantity: 4 },
      { itemId: 'clay', quantity: 3 },
      { itemId: 'metal_ore', quantity: 2 },
      { itemId: 'hide', quantity: 2 },
      { itemId: 'rope', quantity: 2 },
      { itemId: 'dirty_water_bottle', quantity: 1 },
    ];
    this.hotbarItemIds = [
      'gun',
      'hunting_knife',
      'ammo',
      'berries',
      'dirty_water_bottle',
      'wood',
    ];
    this.equippedSlot = 0;

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
    this.dayCount = save.dayCount;
    this.timeOfDay = save.timeOfDay;
    this.lastIsNight =
      Math.sin((this.timeOfDay - 0.25) * Math.PI * 2) < -0.05;
    this.weather = save.weather || 'clear';
    this.inventory = save.inventory.map((s) => ({ ...s }));
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

    this.clearPlacedStructures();
    save.structures.forEach((st) => this.spawnStructure(st));

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

    // CRITICAL REQUIREMENT: Character starts with a gun even on previous / last saved games
    this.ensurePlayerHasGun(true);
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

    // 5. Ensure Gun on hotbar (prioritize slot 0)
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

    // 6. Ensure Knife on hotbar (slot 1 when forceEquip is active)
    let hotbarKnifeIdx = this.hotbarItemIds.indexOf('hunting_knife');
    if (hotbarKnifeIdx === -1) {
      const emptyIdx = this.hotbarItemIds.findIndex((id) => id === null);
      if (emptyIdx !== -1) {
        this.hotbarItemIds[emptyIdx] = 'hunting_knife';
        hotbarKnifeIdx = emptyIdx;
      } else if (forceEquip) {
        const displaced = this.hotbarItemIds[1];
        if (displaced && !this.inventory.some((s) => s.itemId === displaced)) {
          this.inventory.push({ itemId: displaced, quantity: 1 });
        }
        this.hotbarItemIds[1] = 'hunting_knife';
        hotbarKnifeIdx = 1;
      }
    }

    // 7. Ensure Ammo on hotbar if space available
    if (!this.hotbarItemIds.includes('ammo')) {
      const emptyIdx = this.hotbarItemIds.findIndex((id) => id === null);
      if (emptyIdx !== -1) {
        this.hotbarItemIds[emptyIdx] = 'ammo';
      }
    }

    // 8. Equip Gun at slot 0 and place Knife at slot 1
    if (forceEquip) {
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
      this.equippedSlot = hotbarGunIdx;
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
    ];
    for (const mat of baseline) {
      if (this.getItemCount(mat.itemId) <= 0) {
        this.inventory.push({ itemId: mat.itemId, quantity: mat.minQty });
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
      },
      dayCount: this.dayCount,
      timeOfDay: this.timeOfDay,
      weather: this.weather,
      inventory: this.inventory.map((s) => ({ ...s })),
      structures: this.structures.map((s) => ({
        ...s,
        chestItems: s.chestItems ? s.chestItems.map((c) => ({ ...c })) : undefined,
      })),
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

    if (def.category !== 'resource' && !this.hotbarItemIds.includes(itemId)) {
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
    if (this.getItemCount(itemId) === 0) {
      this.hotbarItemIds = this.hotbarItemIds.map((h) => (h === itemId ? null : h));
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
      const targetSlot =
        this.equippedSlot >= 0 && this.equippedSlot < 6
          ? this.equippedSlot
          : emptyIdx !== -1
            ? emptyIdx
            : 5;
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

    if (def.structureType) {
      return this.placeStructureFromInventory(itemId);
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

    // 1. WEAPON ISOLATION: When any weapon is equipped, ONLY that weapon works — nothing else!
    if (equippedId && equippedDef && isActiveWeaponItem(equippedId)) {
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
        this.sound.playAttack('melee');
        this.toast('Face stone, flint, or metal ore to mine with Stone Pickaxe', 'info');
      }
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

    // 7. RAW MATERIAL / RESOURCE: Places 1 down (and sparks campfire if Flint + Kindling)
    if (equippedDef && equippedDef.category === 'resource') {
      this.placeItemInWorld(equippedDef.id);
      this.actionCooldown = 0.35;
      return;
    }

    // 8. BARE HANDS (empty slot or Hands mode): Handles world interactions cleanly
    const near = this.nearbyInteraction;
    if (near) {
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

  private performMeleeWeaponAttack(
    weaponId: ItemId,
    weaponDef: ItemDefinition,
  ): void {
    this.swingTimer = 0.3;
    this.actionCooldown = 0.4;
    const range = weaponDef.attackRange || 2.8;
    const damage = weaponDef.attackDamage || 14;
    this.sound.playAttack(weaponId === 'rope_whip' ? 'whip' : 'melee');

    for (const c of this.creatures.creatures) {
      if (!c.alive) continue;
      const dx = c.x - this.playerX;
      const dy = c.y - this.playerY;
      const dz = c.z - this.playerZ;
      const dist = Math.hypot(dx, dz);
      if (dist <= range + 0.9 && Math.abs(dy) <= 3.6) {
        const res = this.creatures.damageCreature(
          c,
          damage,
          this.playerX,
          this.playerZ,
          {
            snareSeconds: weaponId === 'lasso' ? 6 : undefined,
            stunSeconds: weaponId === 'rope_whip' ? 2.5 : undefined,
            knockback: weaponId === 'rope_whip' ? 2.2 : 0.7,
          },
        );
        this.spawnParticles(c.x, c.y + 0.9, c.z, 0xef4444, 6);
        if (weaponId === 'lasso') {
          this.toast(`Snared ${c.spec.displayName}!`, 'info');
        } else if (weaponId === 'rope_whip') {
          this.toast(`Staggered ${c.spec.displayName}!`, 'info');
        }
        if (res.killed) {
          this.stats.animalsHunted += 1;
          const isDino = this.isDinosaurSpecies(c.species);
          if (isDino) {
            this.stats.dinosaursEncountered += 1;
          }
          this.spawnCarcass(
            c.species,
            c.spec.displayName,
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
            `Downed ${c.spec.displayName}! Switch to Hands (0) to collect the carcass for meat.`,
            'gain',
          );
        }
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
      node.respawnTimer = isTree || isRock ? 95 : 65;
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
      } else if (node.kind === 'branch_pile') {
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
        return [['wheat', 3]];
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

    let moveRight = 0;
    let moveForward = 0;
    if (this.keys['KeyW'] || this.keys['key_w'] || this.keys['ArrowUp']) moveForward += 1;
    if (this.keys['KeyS'] || this.keys['key_s'] || this.keys['ArrowDown']) moveForward -= 1;
    if (this.keys['KeyD'] || this.keys['key_d'] || this.keys['ArrowRight']) moveRight += 1;
    if (this.keys['KeyA'] || this.keys['key_a'] || this.keys['ArrowLeft']) moveRight -= 1;

    moveRight += this.joyX;
    moveForward += this.joyY;

    const inputMag = Math.min(1, Math.hypot(moveRight, moveForward));
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

    // Terrain & Swimming state
    const waterLevel = getWaterLevelAt(this.playerX, this.playerZ);
    const terrainY = getTerrainHeight(this.playerX, this.playerZ);
    this.isSwimming = terrainY < waterLevel - 0.45;

    let baseSpeed = this.isSwimming
      ? 4.2
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
        const th = getTerrainHeight(tx, tz);
        if (th <= terrainY + 0.22) return true;
        return getTerrainSlope(tx, tz) <= maxClimbSlope;
      };

      const stepSlope = getTerrainSlope(
        this.playerX + nx * baseSpeed * inputMag * dt,
        this.playerZ + nz * baseSpeed * inputMag * dt,
      );
      if (!this.isSwimming && stepSlope > 0.72) {
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

      this.playerX = nextX;
      this.playerZ = nextZ;
      this.markExploredAroundPlayer();

      this.walkBobPhase += dt * (this.isSprinting ? 12.5 : 8.2) * inputMag;
      this.footstepAccum += baseSpeed * inputMag * dt;
      if (this.footstepAccum > (this.isSprinting ? 2.6 : 2.1)) {
        this.footstepAccum = 0;
        const b = getBiomeAt(this.playerX, this.playerZ);
        if (this.isSwimming || terrainY < waterLevel) {
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

    // Vertical physics / swimming buoyancy
    const newTerrainY = getTerrainHeight(this.playerX, this.playerZ);
    const newWaterY = getWaterLevelAt(this.playerX, this.playerZ);
    if (this.isSwimming) {
      const swimTargetY = newWaterY - 0.72 + Math.sin(this.elapsed * 3.5) * 0.06;
      this.playerY = THREE.MathUtils.damp(this.playerY, swimTargetY, 8, dt);
      this.playerVelY = 0;
      this.grounded = false;
    } else {
      this.playerVelY -= 21 * dt;
      this.playerY += this.playerVelY * dt;
      if (this.playerY <= newTerrainY) {
        this.playerY = newTerrainY;
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

    // Update nearby contextual interaction
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
      !isGun && (eqId === 'stone_axe' || eqId === 'stone_pickaxe');
    this.handsRig.spearTip.visible =
      !isGun && (eqId === 'wooden_spear' || eqId === 'hunting_knife');
    this.handsRig.clubHead.visible = !isGun && eqId === 'wooden_club';
    this.handsRig.bowArc.visible = !isGun && eqId === 'primitive_bow';
    this.handsRig.rodTip.visible =
      !isGun &&
      (eqId === 'fishing_rod' || eqId === 'rope_whip' || eqId === 'lasso');

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

    // 1. WEAPON ISOLATION: While any weapon is active in HUD bar, nothing else appears or triggers!
    if (equippedId && equippedDef && isActiveWeaponItem(equippedId)) {
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

    // 2. HARVESTING TOOLS: Strictly scoped to trees/wood (axe) or rock/ore (pickaxe)
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
      return {
        id: 'use_stone_pickaxe',
        label: 'Swing Stone Pickaxe',
        sublabel: 'Face Stone, Flint, or Ore',
        kind: 'tool_action',
        actionCategory: 'mine',
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
    let bestDist = 4.6;

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
          wheat_patch: 'Harvest Wild Wheat',
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

      if (!remove) {
        for (const c of this.creatures.creatures) {
          if (!c.alive || !c.cycleActive) {
            continue;
          }
          const centerY =
            c.species === 'brachiosaurus'
              ? c.y + 2.8
              : c.species === 'trex'
                ? c.y + 1.8
                : c.species === 'bird' ||
                    c.species === 'bald_eagle' ||
                    c.species === 'great_horned_owl'
                  ? c.y + 0.25
                  : c.y + 0.75;
          const hitRadius =
            c.species === 'brachiosaurus'
              ? 2.8
              : c.species === 'trex'
                ? 2.4
                : a.isBullet
                  ? 2.1
                  : 1.6;
          const hitHeight =
            c.species === 'brachiosaurus'
              ? 3.4
              : c.species === 'trex'
                ? 2.4
                : a.isBullet
                  ? 2.2
                  : 1.7;

          let tSeg = 1;
          if (segLenSq > 0.00001) {
            tSeg = THREE.MathUtils.clamp(
              ((c.x - prevX) * segDx +
                (centerY - prevY) * segDy +
                (c.z - prevZ) * segDz) /
                segLenSq,
              0,
              1,
            );
          }
          const closestX = prevX + segDx * tSeg;
          const closestY = prevY + segDy * tSeg;
          const closestZ = prevZ + segDz * tSeg;
          const d = Math.hypot(closestX - c.x, closestZ - c.z);

          if (d < hitRadius && Math.abs(closestY - centerY) < hitHeight) {
            const res = this.creatures.damageCreature(
              c,
              a.damage,
              this.playerX,
              this.playerZ,
              a.isBullet ? { knockback: 2.8 } : undefined,
            );
            this.spawnParticles(
              c.x,
              centerY,
              c.z,
              0xef4444,
              a.isBullet ? 12 : 7,
            );
            if (res.killed) {
              this.stats.animalsHunted += 1;
              const isDino = this.isDinosaurSpecies(c.species);
              if (isDino) {
                this.stats.dinosaursEncountered += 1;
              }
              this.spawnCarcass(
                c.species,
                c.spec.displayName,
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
                a.isBullet
                  ? `Gunshot: ${c.spec.displayName} downed! Collect the carcass for meat.`
                  : `Bow Hunt: ${c.spec.displayName} downed! Collect the carcass for meat.`,
                'gain',
              );
            }
            remove = true;
            break;
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

    this.camera.position.set(
      this.playerX,
      this.playerY + this.currentEyeHeight + headBobY + washDip,
      this.playerZ,
    );
    this.camera.rotation.set(
      this.camPitch + hurtKick + chewNod + drinkNod,
      this.camYaw,
      0,
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

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onWindowBlur);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);

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
    this.renderer.dispose();
  }
}
