import * as THREE from 'three';
import type {
  InventorySlot,
  ItemId,
  ModularVehicleData,
  NavigatorCompanionHudState,
  NavigatorDeparturePhase,
  NavigatorTask,
  PlayerGender,
  ResourceNodeState,
} from '@/game/types';
import {
  ShipNavigatorNpcHandle,
  buildShipNavigatorNpcModel,
} from '@/game/world/pirateCinematicRig';
import type { ActiveCreature } from './creatureSystem';
import type { ModularVehicleMeshHandles } from '@/game/world/engineeringModels';

export interface NavigatorCompanionContext {
  dt: number;
  elapsed: number;
  playerX: number;
  playerY: number;
  playerZ: number;
  activePlayerVehicleId: string | null;
  playerIsFlying: boolean;
  shelterPos: { x: number; z: number };
  shipwreckPos: { x: number; z: number };
  getTerrainHeight: (x: number, z: number) => number;
  oceanLevel: number;
  resourceNodes: ResourceNodeState[];
  creatures: ActiveCreature[];
  vehicles: ModularVehicleData[];
  vehicleMeshes: Map<string, ModularVehicleMeshHandles>;
  onChopHit: (node: ResourceNodeState, x: number, y: number, z: number) => void;
  onTreeFelled: (node: ResourceNodeState) => void;
  onShootCreature: (creature: ActiveCreature, dmg: number, fromX: number, fromZ: number) => boolean;
  onToast: (msg: string, tone: 'info' | 'discovery' | 'warning' | 'craft') => void;
  onSpawnParticles: (x: number, y: number, z: number, color: number, count: number) => void;
  onPlaySplash?: () => void;
}

const TREE_KIND_CACHE = new Map<string, boolean>();

function isTreeNode(node: ResourceNodeState): boolean {
  if (node.felled || node.hp <= 0) return false;
  const raw = String(node.kind);
  const cached = TREE_KIND_CACHE.get(raw);
  if (cached !== undefined) return cached;
  const k = raw.toLowerCase();
  const res =
    k.includes('tree') ||
    k.includes('palm') ||
    k.includes('pine') ||
    k.includes('oak') ||
    k.includes('birch') ||
    k.includes('bamboo') ||
    k.includes('log');
  TREE_KIND_CACHE.set(raw, res);
  return res;
}

export class NavigatorCompanionController {
  public readonly group = new THREE.Group();
  public readonly droppedGunGroup = new THREE.Group();
  private droppedGunRing: THREE.Mesh;
  private girlRig: ShipNavigatorNpcHandle;
  private boyRig: ShipNavigatorNpcHandle;
  private gender: PlayerGender = 'girl';

  public x = 4.2;
  public y = 0;
  public z = 674.8;
  public yaw = 0;

  private task: NavigatorTask = 'follow';
  private allowDriving = false;
  private drivingVehicleId: string | null = null;
  private statusText = 'Following beside you with survival gear ready';
  private equippedTool: 'gun' | 'axe' | 'map' = 'gun';

  private backpack: InventorySlot[] = [
    { itemId: 'wood', quantity: 6 },
    { itemId: 'raw_meat', quantity: 2 },
    { itemId: 'ammo', quantity: 24 },
  ];
  private treesChopped = 0;
  private animalsHunted = 0;

  private actionTimer = 0;
  private gunFlashTimer = 0;
  private swingTimer = 0;
  private driveHeading = 0;
  private arrivedShelterNotified = false;

  // Fly-away abandonment & shipwreck farewell sequence
  private departurePhase: NavigatorDeparturePhase = 'active';
  private phaseTimer = 0;
  private flyAwayTimer = 0;
  private speechLine: string | null = null;
  private speechTimer = 0;
  private hasDroppedGun = false;
  private droppedGunPos: { x: number; y: number; z: number } | null = null;
  private shoreDropPos: { x: number; z: number } = { x: -8, z: 706 };
  private oceanWalkSplashTimer = 0;
  private cachedTreeTarget: ResourceNodeState | null = null;
  private cachedCreatureTarget: ActiveCreature | null = null;
  private targetScanTimer = 0;

  constructor() {
    this.girlRig = buildShipNavigatorNpcModel('girl');
    this.boyRig = buildShipNavigatorNpcModel('boy');
    this.group.add(this.girlRig.root, this.boyRig.root);
    this.setGender('girl');

    // Build 3D dropped survival rifle mesh for when the Navigator leaves her/his gun on the island floor
    const gunWoodMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.78 });
    const gunMetalMat = new THREE.MeshStandardMaterial({
      color: 0x2a2f36,
      roughness: 0.35,
      metalness: 0.78,
    });
    const rifleWrap = new THREE.Group();
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.14, 0.44), gunWoodMat);
    stock.position.set(0, 0.04, -0.22);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.11, 0.36), gunMetalMat);
    body.position.set(0, 0.07, 0.08);
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.032, 0.72, 10),
      gunMetalMat,
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.09, 0.56);
    const scope = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.24, 8),
      gunMetalMat,
    );
    scope.rotation.x = Math.PI / 2;
    scope.position.set(0, 0.15, 0.1);
    rifleWrap.add(stock, body, barrel, scope);
    // Lay the rifle flat on its side on the island sand
    rifleWrap.rotation.z = Math.PI / 2 - 0.12;
    rifleWrap.position.y = 0.06;

    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
    });
    this.droppedGunRing = new THREE.Mesh(new THREE.RingGeometry(0.52, 0.66, 28), ringMat);
    this.droppedGunRing.rotation.x = -Math.PI / 2;
    this.droppedGunRing.position.y = 0.04;

    this.droppedGunGroup.add(rifleWrap, this.droppedGunRing);
    this.droppedGunGroup.visible = false;
  }

  public get activeRig(): ShipNavigatorNpcHandle {
    return this.gender === 'boy' ? this.boyRig : this.girlRig;
  }

  public getGender(): PlayerGender {
    return this.gender;
  }

  public getName(): string {
    return this.gender === 'boy'
      ? 'Mateo (Ship Navigator)'
      : 'Elena (Ship Navigator)';
  }

  public setGender(gender: PlayerGender): void {
    this.gender = gender === 'boy' ? 'boy' : 'girl';
    this.girlRig.root.visible = this.gender === 'girl';
    this.boyRig.root.visible = this.gender === 'boy';
    this.syncEquippedToolVisual();
  }

  public setGenderForPlayer(playerGender: PlayerGender): void {
    // Opposite companion gender by default depending on who is playing
    this.setGender(playerGender === 'girl' ? 'boy' : 'girl');
  }

  public resetAtSpawn(spawnX: number, spawnZ: number, groundY: number): void {
    this.x = spawnX + 4.2;
    this.z = spawnZ - 5.2;
    this.y = groundY;
    this.yaw = Math.atan2(spawnX - this.x, spawnZ - this.z);
    this.task = 'follow';
    this.drivingVehicleId = null;
    this.arrivedShelterNotified = false;
    this.actionTimer = 0;
    this.gunFlashTimer = 0;
    this.swingTimer = 0;
    this.equippedTool = 'gun';
    this.departurePhase = 'active';
    this.phaseTimer = 0;
    this.flyAwayTimer = 0;
    this.speechLine = null;
    this.speechTimer = 0;
    this.hasDroppedGun = false;
    this.droppedGunPos = null;
    this.oceanWalkSplashTimer = 0;
    this.droppedGunGroup.visible = false;
    this.group.scale.set(1, 1, 1);
    this.statusText = 'Ready on the beach with backpack, axe & survival rifle';
    this.group.position.set(this.x, this.y, this.z);
    this.group.rotation.y = this.yaw;
    this.syncEquippedToolVisual();
  }

  public isGone(): boolean {
    return this.departurePhase === 'gone';
  }

  public isDeparting(): boolean {
    return this.departurePhase !== 'active' && this.departurePhase !== 'gone';
  }

  public getDroppedGunPos(): { x: number; y: number; z: number } | null {
    return this.droppedGunPos ? { ...this.droppedGunPos } : null;
  }

  public pickupDroppedGun(): boolean {
    if (!this.droppedGunPos) return false;
    this.droppedGunPos = null;
    this.droppedGunGroup.visible = false;
    return true;
  }

  public setTask(nextTask: NavigatorTask): void {
    if (this.departurePhase !== 'active') return;
    if (nextTask === 'drive_car' && !this.allowDriving) {
      this.statusText = 'Enable "Let Navigator Drive Cars" first!';
      return;
    }
    if (this.drivingVehicleId && nextTask !== 'drive_car') {
      this.exitVehicle();
    }
    this.task = nextTask;
    this.arrivedShelterNotified = false;
    if (nextTask === 'chop_trees') {
      this.equippedTool = 'axe';
      this.statusText = 'Looking for nearby trees to chop down for you...';
    } else if (nextTask === 'hunt_animals') {
      this.equippedTool = 'gun';
      this.statusText = 'Tracking nearby wildlife to hunt & collect meat...';
    } else if (nextTask === 'lead_shelter') {
      this.equippedTool = 'map';
      this.statusText = 'Leading you to the premade Hilltop House shelter!';
    } else if (nextTask === 'drive_car') {
      this.equippedTool = 'map';
      this.statusText = 'Heading to the nearest parked car to drive!';
    } else if (nextTask === 'stay') {
      this.equippedTool = 'gun';
      this.statusText = 'Holding position and standing guard.';
    } else {
      this.equippedTool = 'gun';
      this.statusText = 'Following beside you & watching for danger.';
    }
    this.syncEquippedToolVisual();
  }

  public setAllowDriving(allowed: boolean): void {
    this.allowDriving = allowed;
    if (!allowed && this.drivingVehicleId) {
      this.exitVehicle();
      if (this.task === 'drive_car') {
        this.task = 'follow';
        this.equippedTool = 'gun';
        this.statusText = 'Parked the car and following you on foot.';
        this.syncEquippedToolVisual();
      }
    }
  }

  public getAllowDriving(): boolean {
    return this.allowDriving;
  }

  public getDrivingVehicleId(): string | null {
    return this.drivingVehicleId;
  }

  private exitVehicle(): void {
    this.drivingVehicleId = null;
    this.x += 2.4;
    this.group.position.set(this.x, this.y, this.z);
  }

  private addBackpackItem(itemId: ItemId, qty: number): void {
    if (qty <= 0) return;
    const existing = this.backpack.find((s) => s.itemId === itemId);
    if (existing) {
      existing.quantity += qty;
    } else {
      this.backpack.push({ itemId, quantity: qty });
    }
  }

  public collectAllSharedLoot(): InventorySlot[] {
    const out = this.backpack.map((s) => ({ ...s }));
    this.backpack = [];
    return out;
  }

  private syncEquippedToolVisual(): void {
    for (const rig of [this.girlRig, this.boyRig]) {
      rig.gunMesh.visible = !this.hasDroppedGun && this.equippedTool === 'gun';
      rig.axeMesh.visible = this.departurePhase === 'active' && this.equippedTool === 'axe';
      rig.mapMesh.visible =
        this.departurePhase === 'active' &&
        (this.equippedTool === 'map' || this.task === 'lead_shelter');
    }
  }

  private moveToward(
    tx: number,
    tz: number,
    speed: number,
    dt: number,
    getTerrainHeight: (x: number, z: number) => number,
    oceanLevel: number,
  ): number {
    const dx = tx - this.x;
    const dz = tz - this.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 0.05) {
      const step = Math.min(dist, speed * dt);
      const nx = this.x + (dx / dist) * step;
      const nz = this.z + (dz / dist) * step;
      const ny = getTerrainHeight(nx, nz);
      if (ny > oceanLevel - 0.6) {
        this.x = nx;
        this.z = nz;
        this.y = ny;
      }
      this.yaw = Math.atan2(dx, dz);
    }
    return dist;
  }

  private animateLocomotion(moving: boolean, running: boolean, elapsed: number): void {
    const rig = this.activeRig;
    if (this.drivingVehicleId) {
      // Seated driving pose
      rig.leftLeg.rotation.x = -1.35;
      rig.rightLeg.rotation.x = -1.35;
      rig.leftArm.rotation.x = -1.15;
      rig.rightArm.rotation.x = -1.15;
      rig.rightArm.rotation.z = 0;
      rig.head.rotation.y = Math.sin(elapsed * 1.4) * 0.14;
      return;
    }

    if (moving) {
      const freq = running ? 11.5 : 7.5;
      const amp = running ? 0.65 : 0.42;
      const stride = Math.sin(elapsed * freq);
      rig.leftLeg.rotation.x = stride * amp;
      rig.rightLeg.rotation.x = -stride * amp;
      rig.leftArm.rotation.x = -stride * amp * 0.7;
      if (this.swingTimer <= 0 && this.gunFlashTimer <= 0) {
        rig.rightArm.rotation.x = this.equippedTool === 'gun' ? -0.95 : stride * amp * 0.7;
        rig.rightArm.rotation.z = 0;
      }
    } else {
      rig.leftLeg.rotation.x = 0;
      rig.rightLeg.rotation.x = 0;
      rig.leftArm.rotation.x = Math.sin(elapsed * 1.6) * 0.06;
      if (this.swingTimer <= 0 && this.gunFlashTimer <= 0) {
        rig.rightArm.rotation.x = this.equippedTool === 'gun' ? -0.85 : 0;
        rig.rightArm.rotation.z = Math.sin(elapsed * 1.8) * 0.06;
      }
    }

    if (this.swingTimer > 0) {
      const p = 1 - this.swingTimer / 0.35;
      rig.rightArm.rotation.x = -2.2 + Math.sin(p * Math.PI) * 2.1;
      rig.rightArm.rotation.z = 0.2;
    }

    if (this.gunFlashTimer > 0) {
      rig.rightArm.rotation.x = -1.48;
      rig.gunFlash.visible = true;
    } else {
      rig.gunFlash.visible = false;
    }
  }

  private computeShoreDropPoint(
    shipwreckPos: { x: number; z: number },
    getTerrainHeight: (x: number, z: number) => number,
    oceanLevel: number,
  ): { x: number; z: number } {
    // Walk inland from the sunken shipwreck toward the island beach to find the dry island floor edge
    for (let offset = 10; offset <= 95; offset += 2) {
      const testX = shipwreckPos.x;
      const testZ = shipwreckPos.z - offset;
      const h = getTerrainHeight(testX, testZ);
      if (h >= oceanLevel + 0.48) {
        return { x: testX, z: testZ };
      }
    }
    return { x: shipwreckPos.x, z: shipwreckPos.z - 42 };
  }

  private updateDepartureSequence(ctx: NavigatorCompanionContext): void {
    const { dt, elapsed } = ctx;
    this.phaseTimer += dt;
    const rig = this.activeRig;

    if (this.departurePhase === 'heartbroken_notice') {
      this.yaw = Math.atan2(ctx.playerX - this.x, ctx.playerZ - this.z);
      this.y = ctx.getTerrainHeight(this.x, this.z);
      this.group.position.set(this.x, this.y, this.z);
      this.group.rotation.y = this.yaw;
      this.animateLocomotion(false, false, elapsed);
      // Look up sadly toward the flying player
      rig.head.rotation.x = -0.35;
      rig.head.rotation.y = Math.sin(elapsed * 2.2) * 0.14;
      rig.rightArm.rotation.x = -0.25;
      if (this.phaseTimer >= 2.8) {
        this.departurePhase = 'returning_to_shore';
        this.phaseTimer = 0;
        this.shoreDropPos = this.computeShoreDropPoint(
          ctx.shipwreckPos,
          ctx.getTerrainHeight,
          ctx.oceanLevel,
        );
        this.statusText = 'Walking back to the beach where the shipwreck sunk...';
      }
      return;
    }

    if (this.departurePhase === 'returning_to_shore') {
      const dist = this.moveToward(
        this.shoreDropPos.x,
        this.shoreDropPos.z,
        4.6,
        dt,
        ctx.getTerrainHeight,
        ctx.oceanLevel,
      );
      this.y = ctx.getTerrainHeight(this.x, this.z);
      this.group.position.set(this.x, this.y, this.z);
      this.group.rotation.y = this.yaw;
      this.animateLocomotion(true, false, elapsed);
      rig.head.rotation.x = 0.22; // head bowed
      rig.rightArm.rotation.x = -0.25;
      this.statusText = `Returning to the shipwreck shore (${Math.round(dist)}m)...`;

      if (dist < 1.8 || this.phaseTimer > 35) {
        this.departurePhase = 'dropping_gun';
        this.phaseTimer = 0;
        // Face out toward the sunken shipwreck
        this.yaw = Math.atan2(ctx.shipwreckPos.x - this.x, ctx.shipwreckPos.z - this.z);
        this.hasDroppedGun = true;
        this.syncEquippedToolVisual();

        const dropX = this.x + Math.sin(this.yaw) * 0.65;
        const dropZ = this.z + Math.cos(this.yaw) * 0.65;
        const dropY = Math.max(ctx.oceanLevel + 0.35, ctx.getTerrainHeight(dropX, dropZ));
        this.droppedGunPos = { x: dropX, y: dropY, z: dropZ };
        this.droppedGunGroup.position.set(dropX, dropY + 0.04, dropZ);
        this.droppedGunGroup.rotation.y = this.yaw + 0.45;
        this.droppedGunGroup.visible = true;

        this.speechLine = 'OK, see ya.';
        this.speechTimer = 4.2;
        this.statusText = 'Dropped her survival gun on the island floor... "OK, see ya."';
        ctx.onSpawnParticles(dropX, dropY + 0.2, dropZ, 0xf59e0b, 10);
        ctx.onToast(
          `${this.getName()} dropped their gun on the island floor: "OK, see ya."`,
          'warning',
        );
      }
      return;
    }

    if (this.departurePhase === 'dropping_gun') {
      this.y = ctx.getTerrainHeight(this.x, this.z);
      this.group.position.set(this.x, this.y, this.z);
      this.group.rotation.y = this.yaw;
      this.animateLocomotion(false, false, elapsed);
      // Reach down briefly as the gun is laid on the island floor, then stand quietly
      rig.rightArm.rotation.x = this.phaseTimer < 0.9 ? -0.9 : 0.05;
      rig.head.rotation.x = this.phaseTimer < 1.2 ? 0.35 : 0.08;
      if (this.phaseTimer >= 2.6) {
        this.departurePhase = 'walking_into_ocean';
        this.phaseTimer = 0;
        this.oceanWalkSplashTimer = 0;
        this.statusText = 'Walking back into the ocean to where the pirate ship sunk...';
      }
      return;
    }

    if (this.departurePhase === 'walking_into_ocean') {
      const dx = ctx.shipwreckPos.x - this.x;
      const dz = ctx.shipwreckPos.z - this.z;
      const distToWreck = Math.hypot(dx, dz);
      const walkSpeed = 3.2;
      if (distToWreck > 0.2) {
        const step = Math.min(distToWreck, walkSpeed * dt);
        this.x += (dx / distToWreck) * step;
        this.z += (dz / distToWreck) * step;
        this.yaw = Math.atan2(dx, dz);
      }

      const groundY = ctx.getTerrainHeight(this.x, this.z);
      // Gradually wade deeper beneath the waves as she approaches the sunken shipwreck
      const sinkDepth = Math.min(1.65, Math.max(0, ctx.oceanLevel - groundY));
      this.y = Math.min(groundY, ctx.oceanLevel - sinkDepth * 0.72);
      this.group.position.set(this.x, this.y, this.z);
      this.group.rotation.y = this.yaw;
      this.animateLocomotion(true, false, elapsed);
      rig.head.rotation.x = 0.08;

      this.oceanWalkSplashTimer -= dt;
      if (groundY < ctx.oceanLevel + 0.15 && this.oceanWalkSplashTimer <= 0) {
        this.oceanWalkSplashTimer = 0.55;
        ctx.onSpawnParticles(this.x, ctx.oceanLevel + 0.1, this.z, 0xe0f2fe, 7);
        if (this.phaseTimer < 1.5) {
          ctx.onPlaySplash?.();
        }
      }

      this.statusText = `Wading into the ocean toward the sunken shipwreck (${Math.round(distToWreck)}m)...`;

      if (distToWreck < 5.5 || this.phaseTimer > 14.5) {
        this.departurePhase = 'fading_away';
        this.phaseTimer = 0;
        this.statusText = 'Reached the sunken shipwreck... disappearing beneath the waves.';
        ctx.onSpawnParticles(this.x, ctx.oceanLevel + 0.2, this.z, 0xbae6fd, 16);
        ctx.onPlaySplash?.();
      }
      return;
    }

    if (this.departurePhase === 'fading_away') {
      const t = Math.min(1, this.phaseTimer / 2.6);
      this.y -= dt * 0.75;
      const scale = Math.max(0.02, 1 - t * 0.96);
      this.group.scale.set(scale, scale, scale);
      this.group.position.set(this.x, this.y, this.z);
      this.group.rotation.y = this.yaw;
      if (Math.random() < 0.35) {
        ctx.onSpawnParticles(this.x, ctx.oceanLevel + 0.12, this.z, 0xe0f2fe, 3);
      }

      if (this.phaseTimer >= 2.6) {
        this.departurePhase = 'gone';
        this.group.visible = false;
        this.speechLine = null;
        this.statusText = 'Disappeared at the sunken shipwreck.';
        ctx.onToast(
          `${this.getName()} reached where the pirate ship sunk and disappeared.`,
          'info',
        );
      }
    }
  }

  public update(ctx: NavigatorCompanionContext): void {
    const { dt, elapsed } = ctx;
    if (this.actionTimer > 0) this.actionTimer = Math.max(0, this.actionTimer - dt);
    if (this.gunFlashTimer > 0) this.gunFlashTimer = Math.max(0, this.gunFlashTimer - dt);
    if (this.swingTimer > 0) this.swingTimer = Math.max(0, this.swingTimer - dt);
    if (this.targetScanTimer > 0) this.targetScanTimer = Math.max(0, this.targetScanTimer - dt);
    if (this.speechTimer > 0) {
      this.speechTimer = Math.max(0, this.speechTimer - dt);
      if (this.speechTimer <= 0) {
        this.speechLine = null;
      }
    }

    // Pulse the golden beacon ring on the dropped gun if waiting on the island floor
    if (this.droppedGunPos && this.droppedGunGroup.visible) {
      const pulse = 1 + Math.sin(elapsed * 4.0) * 0.12;
      this.droppedGunRing.scale.set(pulse, pulse, 1);
    }

    if (this.departurePhase === 'gone') {
      this.group.visible = false;
      return;
    }

    if (this.departurePhase !== 'active') {
      this.updateDepartureSequence(ctx);
      return;
    }

    let moving = false;
    let running = false;

    const distToPlayer = Math.hypot(ctx.playerX - this.x, ctx.playerZ - this.z);
    const altitudeDiff = ctx.playerY - this.y;

    // Detect if the player flies away from the Navigator Companion!
    if (ctx.playerIsFlying && (distToPlayer > 26 || (altitudeDiff > 13 && distToPlayer > 14))) {
      this.flyAwayTimer += dt;
      if (this.flyAwayTimer >= 1.1 || distToPlayer > 36) {
        if (this.drivingVehicleId) {
          this.exitVehicle();
        }
        this.departurePhase = 'heartbroken_notice';
        this.phaseTimer = 0;
        this.equippedTool = 'gun';
        this.syncEquippedToolVisual();
        this.speechLine = "Oh... you don't need me anymore.";
        this.speechTimer = 4.6;
        this.statusText = "Oh... you don't need me anymore.";
        ctx.onToast(
          `${this.getName()}: "Oh... you don't need me anymore."`,
          'warning',
        );
        this.updateDepartureSequence(ctx);
        return;
      }
    } else {
      this.flyAwayTimer = Math.max(0, this.flyAwayTimer - dt * 1.5);
    }

    // If player drives the vehicle the companion was driving, companion steps out safely
    if (this.drivingVehicleId && ctx.activePlayerVehicleId === this.drivingVehicleId) {
      this.exitVehicle();
      this.task = 'follow';
      this.equippedTool = 'gun';
      this.syncEquippedToolVisual();
      this.statusText = 'Handed the wheel back to you!';
    }

    // ------------------------------------------------------------------
    // TASK 1: DRIVE CAR (when player lets her/him drive!)
    // ------------------------------------------------------------------
    if (this.task === 'drive_car' && this.allowDriving) {
      let car = this.drivingVehicleId
        ? ctx.vehicles.find((v) => v.id === this.drivingVehicleId)
        : undefined;

      if (!car) {
        // Find nearest parked car not driven by the player
        let bestDist = 85;
        for (const v of ctx.vehicles) {
          if (v.id === ctx.activePlayerVehicleId) continue;
          const d = Math.hypot(v.x - this.x, v.z - this.z);
          if (d < bestDist) {
            bestDist = d;
            car = v;
          }
        }
        if (!car) {
          this.statusText = 'No parked car nearby — spawn or park a car to let me drive!';
          this.animateLocomotion(false, false, elapsed);
          this.group.position.set(this.x, this.y, this.z);
          this.group.rotation.y = this.yaw;
          return;
        }
        if (bestDist > 3.2) {
          this.moveToward(car.x, car.z, 6.2, dt, ctx.getTerrainHeight, ctx.oceanLevel);
          moving = true;
          running = true;
          this.statusText = `Running to ${car.name || 'the car'} to take the wheel...`;
        } else {
          this.drivingVehicleId = car.id;
          this.driveHeading = car.yaw;
          ctx.onToast(
            `${this.getName()} hopped in the driver's seat of ${car.name || 'your car'}!`,
            'info',
          );
        }
      }

      if (car && this.drivingVehicleId === car.id) {
        // Drive smoothly toward the player if far, otherwise cruise toward the premade shelter!
        const targetX = distToPlayer > 18 ? ctx.playerX : ctx.shelterPos.x;
        const targetZ = distToPlayer > 18 ? ctx.playerZ : ctx.shelterPos.z + 10;
        const dx = targetX - car.x;
        const dz = targetZ - car.z;
        const distToGoal = Math.hypot(dx, dz);

        if (distToGoal > 8.5) {
          const desiredYaw = Math.atan2(dx, dz);
          let diff = desiredYaw - this.driveHeading;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          this.driveHeading += THREE.MathUtils.clamp(diff, -2.1 * dt, 2.1 * dt);

          const speed = 10.5;
          const nx = car.x + Math.sin(this.driveHeading) * speed * dt;
          const nz = car.z + Math.cos(this.driveHeading) * speed * dt;
          const ny = ctx.getTerrainHeight(nx, nz);
          if (ny > ctx.oceanLevel + 0.35) {
            car.x = nx;
            car.z = nz;
            car.y = ny + 0.38;
            car.yaw = this.driveHeading;
            const handle = ctx.vehicleMeshes.get(car.id);
            if (handle) {
              handle.root.position.set(car.x, car.y, car.z);
              handle.root.rotation.y = car.yaw;
              for (const w of handle.wheels) {
                w.rotation.x += speed * dt * 1.4;
              }
            }
          }
          this.statusText =
            distToPlayer > 18
              ? `Driving ${car.name || 'car'} over to pick you up!`
              : `Cruising ${car.name || 'car'} toward the Hilltop Shelter!`;
        } else {
          this.statusText = `Parked ${car.name || 'car'} nearby — waiting for your next order!`;
        }

        // Seat companion inside driver cabin
        this.x = car.x;
        this.y = car.y + 0.45;
        this.z = car.z;
        this.yaw = car.yaw;
        this.group.position.set(this.x, this.y, this.z);
        this.group.rotation.y = this.yaw;
        this.animateLocomotion(false, false, elapsed);
        return;
      }
    }

    // ------------------------------------------------------------------
    // TASK 2: CHOP DOWN TREES & COLLECT WOOD FOR THE PLAYER
    // ------------------------------------------------------------------
    if (this.task === 'chop_trees') {
      this.equippedTool = 'axe';
      this.syncEquippedToolVisual();
      if (this.cachedTreeTarget && !isTreeNode(this.cachedTreeTarget)) {
        this.cachedTreeTarget = null;
      }
      if (!this.cachedTreeTarget || this.targetScanTimer <= 0) {
        this.targetScanTimer = 0.45;
        let bestTree: ResourceNodeState | null = null;
        let bestDistSq = 75 * 75;
        for (let i = 0; i < ctx.resourceNodes.length; i++) {
          const n = ctx.resourceNodes[i];
          if (!isTreeNode(n)) continue;
          const dx = n.x - this.x;
          const dz = n.z - this.z;
          const dSq = dx * dx + dz * dz;
          if (dSq < bestDistSq) {
            bestDistSq = dSq;
            bestTree = n;
          }
        }
        this.cachedTreeTarget = bestTree;
      }
      const nearestTree = this.cachedTreeTarget;
      const bestDist = nearestTree
        ? Math.hypot(nearestTree.x - this.x, nearestTree.z - this.z)
        : 75;

      if (nearestTree) {
        if (bestDist > 2.3) {
          this.moveToward(nearestTree.x, nearestTree.z, 5.8, dt, ctx.getTerrainHeight, ctx.oceanLevel);
          moving = true;
          running = bestDist > 7;
          this.statusText = `Running to chop a tree (${Math.round(bestDist)}m away)...`;
        } else {
          this.yaw = Math.atan2(nearestTree.x - this.x, nearestTree.z - this.z);
          this.statusText = 'Chopping tree with axe & collecting wood...';
          if (this.actionTimer <= 0) {
            this.actionTimer = 0.65;
            this.swingTimer = 0.35;
            nearestTree.hp = Math.max(0, nearestTree.hp - 34);
            ctx.onChopHit(nearestTree, nearestTree.x, nearestTree.y + 1.4, nearestTree.z);
            ctx.onSpawnParticles(nearestTree.x, nearestTree.y + 1.4, nearestTree.z, 0x92400e, 6);
            if (nearestTree.hp <= 0) {
              nearestTree.felled = true;
              nearestTree.fallTimer = 1.6;
              ctx.onTreeFelled(nearestTree);
              this.treesChopped += 1;
              this.addBackpackItem('wood', 4);
              this.addBackpackItem('fiber', 2);
              ctx.onToast(
                `${this.getName()} chopped a tree and packed +4 Wood & +2 Fiber for you!`,
                'craft',
              );
            }
          }
        }
      } else {
        this.statusText = 'No standing trees nearby — following you to find timber.';
        if (distToPlayer > 4.2) {
          this.moveToward(ctx.playerX, ctx.playerZ, 5.5, dt, ctx.getTerrainHeight, ctx.oceanLevel);
          moving = true;
        }
      }
    }

    // ------------------------------------------------------------------
    // TASK 3: HUNT & KILL ANIMALS WITH HER/HIS OWN GUN
    // ------------------------------------------------------------------
    else if (this.task === 'hunt_animals') {
      this.equippedTool = 'gun';
      this.syncEquippedToolVisual();
      let target: ActiveCreature | null = null;
      let bestDist = 70;
      for (const c of ctx.creatures) {
        if (!c.alive || !c.cycleActive) continue;
        const d = Math.hypot(c.x - this.x, c.z - this.z);
        if (d < bestDist) {
          bestDist = d;
          target = c;
        }
      }

      if (target) {
        const targetName = target.displayNameOverride || target.spec.displayName;
        if (bestDist > 13.5) {
          this.moveToward(target.x, target.z, 6.4, dt, ctx.getTerrainHeight, ctx.oceanLevel);
          moving = true;
          running = true;
          this.statusText = `Hunting ${targetName} (${Math.round(bestDist)}m away)...`;
        } else {
          this.yaw = Math.atan2(target.x - this.x, target.z - this.z);
          this.statusText = `Firing survival rifle at ${targetName}!`;
          if (this.actionTimer <= 0) {
            this.actionTimer = 0.85;
            this.gunFlashTimer = 0.14;
            const killed = ctx.onShootCreature(target, 38, this.x, this.z);
            if (killed) {
              this.animalsHunted += 1;
              this.addBackpackItem('raw_meat', 2);
              this.addBackpackItem('hide', 1);
              ctx.onToast(
                `${this.getName()} hunted ${targetName} and packed +2 Raw Meat & +1 Hide!`,
                'discovery',
              );
            }
          }
        }
      } else {
        this.statusText = 'No wildlife in range — patrolling with you.';
        if (distToPlayer > 4.2) {
          this.moveToward(ctx.playerX, ctx.playerZ, 5.5, dt, ctx.getTerrainHeight, ctx.oceanLevel);
          moving = true;
        }
      }
    }

    // ------------------------------------------------------------------
    // TASK 4: LEAD PLAYER TO THE PREMADE HILLTOP HOUSE SHELTER
    // ------------------------------------------------------------------
    else if (this.task === 'lead_shelter') {
      this.equippedTool = 'map';
      this.syncEquippedToolVisual();
      const distToShelter = Math.hypot(ctx.shelterPos.x - this.x, ctx.shelterPos.z - this.z);
      if (distToShelter > 6.5) {
        if (distToPlayer > 17) {
          // Wait & wave for player to catch up!
          this.yaw = Math.atan2(ctx.playerX - this.x, ctx.playerZ - this.z);
          this.statusText = `Waiting for you — Premade Shelter is ${Math.round(distToShelter)}m ahead!`;
        } else {
          this.moveToward(
            ctx.shelterPos.x,
            ctx.shelterPos.z,
            5.8,
            dt,
            ctx.getTerrainHeight,
            ctx.oceanLevel,
          );
          moving = true;
          running = false;
          this.statusText = `Guiding you to the Premade Hilltop Shelter (${Math.round(distToShelter)}m away)...`;
        }
      } else {
        this.yaw = Math.atan2(ctx.playerX - this.x, ctx.playerZ - this.z);
        this.statusText = 'We made it! Here is the Premade Hilltop Shelter!';
        if (!this.arrivedShelterNotified) {
          this.arrivedShelterNotified = true;
          ctx.onToast(
            `${this.getName()}: "Here it is — the premade Hilltop House shelter! We're safe up here!"`,
            'discovery',
          );
        }
      }
    }

    // ------------------------------------------------------------------
    // TASK 5: FOLLOW & PROTECT PLAYER (Auto-defend with gun!)
    // ------------------------------------------------------------------
    else if (this.task === 'follow') {
      this.equippedTool = 'gun';
      this.syncEquippedToolVisual();

      // Auto-defend player from nearby hostile predators
      let threat: ActiveCreature | null = null;
      let threatDist = 17.5;
      for (const c of ctx.creatures) {
        const isHostile =
          c.spec.attackDamage > 0 &&
          (c.state === 'chase' || c.spec.aggroRadius > 0 || c.provokedTimer > 0);
        if (!c.alive || !c.cycleActive || !isHostile) continue;
        const d = Math.hypot(c.x - ctx.playerX, c.z - ctx.playerZ);
        if (d < threatDist) {
          threatDist = d;
          threat = c;
        }
      }

      if (threat) {
        const threatName = threat.displayNameOverride || threat.spec.displayName;
        this.yaw = Math.atan2(threat.x - this.x, threat.z - this.z);
        this.statusText = `Defending you from ${threatName}!`;
        if (this.actionTimer <= 0) {
          this.actionTimer = 0.85;
          this.gunFlashTimer = 0.14;
          const killed = ctx.onShootCreature(threat, 36, this.x, this.z);
          if (killed) {
            this.animalsHunted += 1;
            this.addBackpackItem('raw_meat', 2);
            ctx.onToast(
              `${this.getName()} took down ${threatName} to protect you!`,
              'discovery',
            );
          }
        }
      } else if (distToPlayer > 4.2) {
        const speed = distToPlayer > 12 ? 7.4 : 5.4;
        this.moveToward(ctx.playerX, ctx.playerZ, speed, dt, ctx.getTerrainHeight, ctx.oceanLevel);
        moving = true;
        running = distToPlayer > 12;
        this.statusText = 'Following right beside you!';
      } else {
        this.yaw = Math.atan2(ctx.playerX - this.x, ctx.playerZ - this.z);
        this.statusText = 'Watching your back with survival rifle & backpack.';
      }
    }

    // ------------------------------------------------------------------
    // TASK 6: STAY / HOLD POSITION
    // ------------------------------------------------------------------
    else {
      this.equippedTool = 'gun';
      this.syncEquippedToolVisual();
      this.yaw = Math.atan2(ctx.playerX - this.x, ctx.playerZ - this.z);
      this.statusText = 'Holding position and guarding camp.';
    }

    this.y = ctx.getTerrainHeight(this.x, this.z);
    this.group.position.set(this.x, this.y, this.z);
    this.group.rotation.y = this.yaw;
    this.animateLocomotion(moving, running, elapsed);
  }

  public getHudState(
    playerX: number,
    playerZ: number,
    shelterPos: { x: number; z: number },
  ): NavigatorCompanionHudState {
    return {
      gender: this.gender,
      name: this.getName(),
      task: this.task,
      statusText: this.statusText,
      allowDriving: this.allowDriving,
      isDrivingVehicleId: this.drivingVehicleId,
      distanceToPlayer: Math.round(Math.hypot(playerX - this.x, playerZ - this.z)),
      distanceToShelter: Math.round(Math.hypot(shelterPos.x - this.x, shelterPos.z - this.z)),
      equippedTool: this.equippedTool,
      backpackItems: this.backpack.map((s) => ({ ...s })),
      treesChopped: this.treesChopped,
      animalsHunted: this.animalsHunted,
      departurePhase: this.departurePhase,
      speechLine: this.speechLine,
      droppedGunPos: this.droppedGunPos ? { ...this.droppedGunPos } : null,
      gone: this.departurePhase === 'gone',
    };
  }
}
