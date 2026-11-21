import * as THREE from 'three';
import { ItemId } from '../types';
import {
  JUNGLE_TEMPLE_POS,
  PILLAGER_OUTPOST_POS,
  SNOWY_VILLAGE_POS,
  TAIGA_VILLAGE_POS,
  TRIAL_CHAMBERS_POS,
  VIKING_VILLAGE_POS,
  WOODLAND_MANSION_POS,
  getLandmarkFloorY,
  getTerrainHeight,
} from '../world/terrain';
import {
  StructureEntityKind,
  StructureEntityRig,
  createStructureEntityRig,
} from '../world/structureEntityModels';

export type StructureSiteType =
  | 'woodland_mansion'
  | 'outpost'
  | 'village'
  | 'trial_chambers'
  | 'jungle_temple';

export interface StructureSpawnPoint {
  enemyType: StructureEntityKind;
  x: number;
  y?: number;
  z: number;
  maxHp: number;
  label?: string;
  villagerRefId?: string;
}

export interface StructureEntityDrop {
  itemId: ItemId;
  quantity: number;
}

export interface ActiveStructureEntity {
  id: string;
  siteId: string;
  type: StructureEntityKind;
  displayName: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  hp: number;
  maxHp: number;
  state: 'WORK' | 'PATROL' | 'CHASE';
  canTrade: boolean;
  homeX: number;
  homeZ: number;
  attackCooldown: number;
  walkPhase: number;
  villagerRefId?: string;
  mesh?: THREE.Group;
  rig?: StructureEntityRig;
}

export interface StructureSiteConfig {
  id: string;
  name: string;
  type: StructureSiteType;
  x: number;
  z: number;
  radius: number;
  spawnPoints: StructureSpawnPoint[];
}

export interface StructureSite extends StructureSiteConfig {
  isAwake: boolean;
  cleared: boolean;
  activeEntities: ActiveStructureEntity[];
}

export interface StructureUpdateHooks {
  onPlayerDamaged?: (amount: number, sourceName: string) => void;
  onEntityDefeated?: (
    entity: ActiveStructureEntity,
    drops: StructureEntityDrop[],
    site: StructureSite,
  ) => void;
  onStructureCleared?: (site: StructureSite) => void;
  onEntityCall?: (type: StructureEntityKind, distance: number) => void;
}

export interface StructureRayHit {
  entity: ActiveStructureEntity;
  site: StructureSite;
  distance: number;
  hitPoint: THREE.Vector3;
}

const ENTITY_DISPLAY_NAMES: Record<StructureEntityKind, string> = {
  pillager: 'Pillager Raider',
  vindicator: 'Mansion Vindicator',
  evoker: 'Mansion Evoker',
  vex: 'Mansion Vex',
  witch: 'Swamp & Study Witch',
  villager: 'Village Merchant',
};

const ENTITY_ATTACK_STATS: Record<
  StructureEntityKind,
  { damage: number; range: number; cooldown: number; speed: number }
> = {
  villager: { damage: 0, range: 0, cooldown: 0, speed: 1.8 },
  pillager: { damage: 11, range: 7.5, cooldown: 2.2, speed: 4.5 },
  vindicator: { damage: 16, range: 2.3, cooldown: 1.5, speed: 4.9 },
  evoker: { damage: 15, range: 8.5, cooldown: 2.5, speed: 4.2 },
  vex: { damage: 10, range: 2.2, cooldown: 1.35, speed: 5.2 },
  witch: { damage: 12, range: 7.0, cooldown: 2.4, speed: 4.0 },
};

function getDropsForEntity(type: StructureEntityKind): StructureEntityDrop[] {
  if (type === 'villager') return [];
  if (type === 'evoker') {
    return [
      { itemId: 'totem_of_undying', quantity: 1 },
      { itemId: 'emerald', quantity: 2 },
    ];
  }
  if (type === 'vindicator') {
    return [
      { itemId: 'totem_of_undying', quantity: 1 },
      { itemId: 'emerald', quantity: 1 },
      { itemId: 'iron_ingot', quantity: 2 },
    ];
  }
  if (type === 'witch') {
    return [
      { itemId: 'totem_of_undying', quantity: 1 },
      { itemId: 'emerald', quantity: 1 },
      { itemId: 'berries', quantity: 3 },
    ];
  }
  return [
    { itemId: 'totem_of_undying', quantity: 1 },
    { itemId: 'ammo', quantity: 12 },
  ];
}

export class StructureManager {
  public structures: StructureSite[] = [];
  private scene: THREE.Scene | null;
  private visible = true;
  private entitySeq = 0;
  private rigPool = new Map<StructureEntityKind, StructureEntityRig[]>();

  constructor(scene?: THREE.Scene | null) {
    this.scene = scene ?? null;
  }

  private acquireRig(type: StructureEntityKind): StructureEntityRig {
    const bucket = this.rigPool.get(type);
    if (bucket && bucket.length > 0) {
      const rig = bucket.pop()!;
      rig.root.rotation.set(0, 0, 0);
      rig.leftArm.rotation.set(0, 0, 0);
      rig.rightArm.rotation.set(0, 0, 0);
      rig.leftLeg.rotation.set(0, 0, 0);
      rig.rightLeg.rotation.set(0, 0, 0);
      return rig;
    }
    return createStructureEntityRig(type);
  }

  private releaseRig(entity: ActiveStructureEntity): void {
    if (entity.mesh) {
      entity.mesh.visible = false;
      entity.mesh.removeFromParent();
    }
    if (!entity.rig) return;
    let bucket = this.rigPool.get(entity.type);
    if (!bucket) {
      bucket = [];
      this.rigPool.set(entity.type, bucket);
    }
    if (bucket.length < 8) {
      bucket.push(entity.rig);
    }
  }

  public setScene(scene: THREE.Scene | null): void {
    this.scene = scene;
  }

  public setDimensionVisible(visible: boolean): void {
    this.visible = visible;
    for (const site of this.structures) {
      for (const entity of site.activeEntities) {
        if (entity.mesh) {
          entity.mesh.visible = visible;
        }
      }
    }
  }

  public registerStructure(config: StructureSiteConfig): void {
    const existing = this.structures.find((s) => s.id === config.id);
    if (existing) return;
    this.structures.push({
      ...config,
      spawnPoints: config.spawnPoints.map((pt) => ({ ...pt })),
      isAwake: false,
      cleared: false,
      activeEntities: [],
    });
  }

  public update(
    playerPos: { x: number; y?: number; z: number },
    dt: number,
    hooks?: StructureUpdateHooks,
  ): void {
    for (const site of this.structures) {
      const dx = playerPos.x - site.x;
      const dz = playerPos.z - site.z;
      const distSq = dx * dx + dz * dz;
      const wakeDistSq = site.radius * site.radius;

      // 1. Wake up structure when player enters range
      if (distSq < wakeDistSq && !site.isAwake) {
        this.wakeStructure(site);
      }
      // 2. Despawn/hibernate entities when player leaves to save FPS
      else if (distSq > wakeDistSq * 1.4 && site.isAwake) {
        this.hibernateStructure(site);
      }

      // 3. Only update AI for awake structures
      if (site.isAwake) {
        this.updateEntities(site, playerPos, dt, hooks);
      }
    }
  }

  public wakeStructure(site: StructureSite): void {
    site.isAwake = true;
    if (site.cleared) return; // Don't respawn enemies if outpost/mansion is already conquered

    site.spawnPoints.forEach((pt, idx) => {
      const groundY = Math.max(getTerrainHeight(pt.x, pt.z), getLandmarkFloorY(pt.x, pt.z, 999));
      const baseY =
        typeof pt.y === 'number'
          ? pt.y
          : groundY + (pt.enemyType === 'vex' ? 0.95 : 0);

      let rig: StructureEntityRig | undefined;
      let mesh: THREE.Group | undefined;
      if (this.scene && typeof document !== 'undefined') {
        rig = this.acquireRig(pt.enemyType);
        mesh = rig.root;
        mesh.position.set(pt.x, baseY, pt.z);
        mesh.visible = this.visible;
        this.scene.add(mesh);
      }

      site.activeEntities.push({
        id: `struct_${site.id}_${pt.enemyType}_${++this.entitySeq}`,
        siteId: site.id,
        type: pt.enemyType,
        displayName: pt.label || ENTITY_DISPLAY_NAMES[pt.enemyType],
        x: pt.x,
        y: baseY,
        z: pt.z,
        yaw: (idx * 1.4) % (Math.PI * 2),
        hp: pt.maxHp,
        maxHp: pt.maxHp,
        state: pt.enemyType === 'villager' ? 'WORK' : 'PATROL',
        canTrade: false,
        homeX: pt.x,
        homeZ: pt.z,
        attackCooldown: 0.8 + idx * 0.25,
        walkPhase: idx * 1.3,
        villagerRefId: pt.villagerRefId,
        mesh,
        rig,
      });
    });
  }

  public hibernateStructure(site: StructureSite): void {
    site.isAwake = false;
    for (let i = 0; i < site.activeEntities.length; i++) {
      this.releaseRig(site.activeEntities[i]);
    }
    site.activeEntities = [];
  }

  public updateEntities(
    site: StructureSite,
    playerPos: { x: number; y?: number; z: number },
    dt: number,
    hooks?: StructureUpdateHooks,
  ): void {
    for (let i = site.activeEntities.length - 1; i >= 0; i--) {
      const entity = site.activeEntities[i];
      if (entity.hp <= 0) {
        this.releaseRig(entity);
        site.activeEntities.splice(i, 1);
        continue;
      }

      const prevX = entity.x;
      const prevZ = entity.z;
      const distToPlayer = Math.hypot(playerPos.x - entity.x, playerPos.z - entity.z);
      const stats = ENTITY_ATTACK_STATS[entity.type];

      if (entity.type === 'villager') {
        // Trigger trade prompt if player is within 3 meters
        entity.canTrade = distToPlayer < 3.0;
        entity.walkPhase += dt * 1.6;
        if (entity.canTrade) {
          entity.yaw = Math.atan2(playerPos.x - entity.x, playerPos.z - entity.z);
          if (entity.rig) {
            entity.rig.rightArm.rotation.x = -0.35 + Math.sin(entity.walkPhase * 3.0) * 0.16;
            entity.rig.leftLeg.rotation.x = 0;
            entity.rig.rightLeg.rotation.x = 0;
          }
        } else {
          // Gentle village patrol around assigned home cabin / hearth
          const patrolX = entity.homeX + Math.cos(entity.walkPhase * 0.4) * 1.8;
          const patrolZ = entity.homeZ + Math.sin(entity.walkPhase * 0.4) * 1.8;
          const dx = patrolX - entity.x;
          const dz = patrolZ - entity.z;
          const d = Math.hypot(dx, dz);
          if (d > 0.15) {
            const step = Math.min(d, stats.speed * 0.55 * dt);
            entity.x += (dx / d) * step;
            entity.z += (dz / d) * step;
            entity.yaw = Math.atan2(dx, dz);
            const swing = Math.sin(entity.walkPhase * 4.2) * 0.35;
            if (entity.rig) {
              entity.rig.leftLeg.rotation.x = swing;
              entity.rig.rightLeg.rotation.x = -swing;
              entity.rig.rightArm.rotation.x = -swing * 0.6;
              entity.rig.leftArm.rotation.x = swing * 0.6;
            }
          }
        }
        if (entity.x !== prevX || entity.z !== prevZ) {
          entity.y = Math.max(
            getTerrainHeight(entity.x, entity.z),
            getLandmarkFloorY(entity.x, entity.z, entity.y + 0.5),
          );
        }
      } else {
        // Hostile AI state transitions
        const prevState = entity.state;
        if (distToPlayer < 25) entity.state = 'CHASE';
        else if (distToPlayer > 35) entity.state = 'PATROL';

        if (prevState !== 'CHASE' && entity.state === 'CHASE') {
          hooks?.onEntityCall?.(entity.type, distToPlayer);
        }

        if (entity.attackCooldown > 0) {
          entity.attackCooldown = Math.max(0, entity.attackCooldown - dt);
        }

        if (entity.state === 'CHASE') {
          const angle = Math.atan2(playerPos.z - entity.z, playerPos.x - entity.x);
          entity.yaw = Math.atan2(playerPos.x - entity.x, playerPos.z - entity.z);
          if (distToPlayer > Math.max(1.5, stats.range * 0.72)) {
            entity.x += Math.cos(angle) * stats.speed * dt;
            entity.z += Math.sin(angle) * stats.speed * dt;
            entity.walkPhase += dt * 7.5;
            if (entity.rig) {
              const swing = Math.sin(entity.walkPhase) * 0.5;
              entity.rig.leftLeg.rotation.x = swing;
              entity.rig.rightLeg.rotation.x = -swing;
              entity.rig.leftArm.rotation.x = -swing * 0.65;
            }
          }

          if (distToPlayer <= stats.range && entity.attackCooldown <= 0) {
            entity.attackCooldown = stats.cooldown;
            if (entity.rig) {
              entity.rig.rightArm.rotation.x = -1.35;
            }
            hooks?.onPlayerDamaged?.(stats.damage, entity.displayName);
          }
        } else {
          // Gentle patrol near assigned spawn post
          entity.walkPhase += dt * 1.4;
          const targetX = entity.homeX + Math.cos(entity.walkPhase * 0.5) * 1.6;
          const targetZ = entity.homeZ + Math.sin(entity.walkPhase * 0.5) * 1.6;
          const dx = targetX - entity.x;
          const dz = targetZ - entity.z;
          const d = Math.hypot(dx, dz);
          if (d > 0.15) {
            const step = Math.min(d, 1.8 * dt);
            entity.x += (dx / d) * step;
            entity.z += (dz / d) * step;
            entity.yaw = Math.atan2(dx, dz);
            if (entity.rig) {
              const swing = Math.sin(entity.walkPhase * 3.4) * 0.28;
              entity.rig.leftLeg.rotation.x = swing;
              entity.rig.rightLeg.rotation.x = -swing;
            }
          }
        }

        if (entity.x !== prevX || entity.z !== prevZ || entity.type === 'vex') {
          const groundY = Math.max(
            getTerrainHeight(entity.x, entity.z),
            getLandmarkFloorY(entity.x, entity.z, entity.y + 0.6),
          );
          entity.y =
            entity.type === 'vex'
              ? groundY + 0.9 + Math.sin(entity.walkPhase * 1.9) * 0.22
              : groundY;
        }

        if (entity.rig?.leftWing && entity.rig.rightWing) {
          const flap = Math.sin(entity.walkPhase * 4.5 + i) * 0.55;
          entity.rig.leftWing.rotation.y = 0.28 + flap;
          entity.rig.rightWing.rotation.y = -(0.28 + flap);
        }
      }

      if (entity.mesh) {
        entity.mesh.position.set(entity.x, entity.y, entity.z);
        entity.mesh.rotation.y = entity.yaw;
      }
    }

    // Mark outpost/mansion/temple/chambers as cleared once all defenders are defeated
    if (!site.cleared && site.type !== 'village' && site.activeEntities.length === 0) {
      site.cleared = true;
      hooks?.onStructureCleared?.(site);
    }
  }

  public getNearestTradableVillager(
    playerPos: { x: number; y?: number; z: number },
  ): ActiveStructureEntity | null {
    let best: ActiveStructureEntity | null = null;
    let bestDist = 3.0;
    for (const site of this.structures) {
      if (!site.isAwake) continue;
      for (const entity of site.activeEntities) {
        if (entity.type !== 'villager' || !entity.canTrade || entity.hp <= 0) continue;
        const d = Math.hypot(entity.x - playerPos.x, entity.z - playerPos.z);
        if (d < bestDist && Math.abs(entity.y - (playerPos.y ?? entity.y)) < 2.6) {
          bestDist = d;
          best = entity;
        }
      }
    }
    return best;
  }

  public raycastEntities(
    origin: THREE.Vector3,
    dir: THREE.Vector3,
    maxRange: number,
    includeVillagers = false,
  ): StructureRayHit | null {
    let best: StructureRayHit | null = null;
    let bestDist = maxRange;

    for (const site of this.structures) {
      if (!site.isAwake) continue;
      for (const entity of site.activeEntities) {
        if (entity.hp <= 0) continue;
        if (!includeVillagers && entity.type === 'villager') continue;
        const cx = entity.x;
        const cy = entity.y + 0.95;
        const cz = entity.z;
        const ocX = cx - origin.x;
        const ocY = cy - origin.y;
        const ocZ = cz - origin.z;
        const proj = ocX * dir.x + ocY * dir.y + ocZ * dir.z;
        if (proj < 0 || proj > bestDist) continue;
        const closestX = origin.x + dir.x * proj;
        const closestY = origin.y + dir.y * proj;
        const closestZ = origin.z + dir.z * proj;
        const dx = closestX - cx;
        const dy = (closestY - cy) * 0.58; // Ellipsoid cylinder tolerance for torso+head
        const dz = closestZ - cz;
        const hitRadius = entity.type === 'vex' ? 0.58 : 0.65;
        if (dx * dx + dy * dy + dz * dz <= hitRadius * hitRadius) {
          bestDist = proj;
          best = {
            entity,
            site,
            distance: proj,
            hitPoint: new THREE.Vector3(closestX, closestY, closestZ),
          };
        }
      }
    }
    return best;
  }

  public damageEntity(
    entity: ActiveStructureEntity,
    damage: number,
    hooks?: StructureUpdateHooks,
  ): { killed: boolean; drops: StructureEntityDrop[]; site?: StructureSite } {
    if (entity.type === 'villager' || entity.hp <= 0) {
      return { killed: false, drops: [] };
    }
    entity.hp = Math.max(0, entity.hp - Math.max(1, Math.round(damage)));
    entity.state = 'CHASE';
    const site = this.structures.find((s) => s.id === entity.siteId);
    if (entity.hp <= 0) {
      const drops = getDropsForEntity(entity.type);
      this.releaseRig(entity);
      if (site) {
        const idx = site.activeEntities.indexOf(entity);
        if (idx !== -1) site.activeEntities.splice(idx, 1);
        hooks?.onEntityDefeated?.(entity, drops, site);
        if (!site.cleared && site.type !== 'village' && site.activeEntities.length === 0) {
          site.cleared = true;
          hooks?.onStructureCleared?.(site);
        }
      }
      return { killed: true, drops, site };
    }
    return { killed: false, drops: [], site };
  }

  public hibernateAll(): void {
    for (const site of this.structures) {
      if (site.isAwake || site.activeEntities.length > 0) {
        this.hibernateStructure(site);
      }
    }
  }

  public resetCleared(): void {
    this.hibernateAll();
    for (const site of this.structures) {
      site.cleared = false;
    }
  }

  public exportClearedIds(): string[] {
    return this.structures.filter((s) => s.cleared).map((s) => s.id);
  }

  public importClearedIds(ids?: string[]): void {
    const clearedSet = new Set(Array.isArray(ids) ? ids : []);
    this.hibernateAll();
    for (const site of this.structures) {
      site.cleared = site.type !== 'village' && clearedSet.has(site.id);
    }
  }
}

export function registerDefaultIslandStructures(manager: StructureManager): void {
  manager.registerStructure({
    id: 'woodland_mansion',
    name: 'Woodland Mansion',
    type: 'woodland_mansion',
    x: WOODLAND_MANSION_POS.x,
    z: WOODLAND_MANSION_POS.z,
    radius: 36,
    spawnPoints: [
      { enemyType: 'evoker', x: WOODLAND_MANSION_POS.x, z: WOODLAND_MANSION_POS.z - 2.6, maxHp: 90, label: 'Mansion Evoker' },
      { enemyType: 'vindicator', x: WOODLAND_MANSION_POS.x - 1.2, z: WOODLAND_MANSION_POS.z + 1.2, maxHp: 80, label: 'Mansion Vindicator' },
      { enemyType: 'vindicator', x: WOODLAND_MANSION_POS.x - 4.4, z: WOODLAND_MANSION_POS.z + 0.6, maxHp: 80, label: 'Armory Vindicator' },
      { enemyType: 'pillager', x: WOODLAND_MANSION_POS.x + 0.8, z: WOODLAND_MANSION_POS.z + 2.8, maxHp: 65, label: 'Mansion Pillager' },
      { enemyType: 'witch', x: WOODLAND_MANSION_POS.x + 4.4, z: WOODLAND_MANSION_POS.z - 0.5, maxHp: 75, label: 'Conjuring Witch' },
      { enemyType: 'vex', x: WOODLAND_MANSION_POS.x + 1.1, z: WOODLAND_MANSION_POS.z - 0.8, maxHp: 35, label: 'Mansion Vex' },
      { enemyType: 'vex', x: WOODLAND_MANSION_POS.x - 3.6, z: WOODLAND_MANSION_POS.z - 1.8, maxHp: 35, label: 'Mansion Vex' },
    ],
  });

  manager.registerStructure({
    id: 'pillager_outpost',
    name: 'Pillager Outpost',
    type: 'outpost',
    x: PILLAGER_OUTPOST_POS.x,
    z: PILLAGER_OUTPOST_POS.z,
    radius: 30,
    spawnPoints: [
      { enemyType: 'vindicator', x: PILLAGER_OUTPOST_POS.x, z: PILLAGER_OUTPOST_POS.z + 1.6, maxHp: 80, label: 'Outpost Vindicator' },
      { enemyType: 'pillager', x: PILLAGER_OUTPOST_POS.x - 1.8, z: PILLAGER_OUTPOST_POS.z + 1.2, maxHp: 65, label: 'Outpost Pillager' },
      { enemyType: 'pillager', x: PILLAGER_OUTPOST_POS.x + 1.8, z: PILLAGER_OUTPOST_POS.z - 1.2, maxHp: 65, label: 'Outpost Pillager' },
    ],
  });

  manager.registerStructure({
    id: 'taiga_village',
    name: 'Taiga Village',
    type: 'village',
    x: TAIGA_VILLAGE_POS.x,
    z: TAIGA_VILLAGE_POS.z,
    radius: 34,
    spawnPoints: [
      { enemyType: 'villager', x: TAIGA_VILLAGE_POS.x - 2.4, z: TAIGA_VILLAGE_POS.z - 0.8, maxHp: 40, label: 'Taiga Blacksmith' },
      { enemyType: 'villager', x: TAIGA_VILLAGE_POS.x + 2.6, z: TAIGA_VILLAGE_POS.z - 0.4, maxHp: 40, label: 'Taiga Forester' },
      { enemyType: 'villager', x: TAIGA_VILLAGE_POS.x + 0.5, z: TAIGA_VILLAGE_POS.z + 2.6, maxHp: 40, label: 'Taiga Quartermaster' },
    ],
  });

  manager.registerStructure({
    id: 'snowy_taiga_village',
    name: 'Snowy Taiga Village',
    type: 'village',
    x: SNOWY_VILLAGE_POS.x,
    z: SNOWY_VILLAGE_POS.z,
    radius: 34,
    spawnPoints: [
      { enemyType: 'villager', x: SNOWY_VILLAGE_POS.x - 2.4, z: SNOWY_VILLAGE_POS.z - 0.6, maxHp: 40, label: 'Snowy Trapper' },
      { enemyType: 'villager', x: SNOWY_VILLAGE_POS.x + 2.4, z: SNOWY_VILLAGE_POS.z - 0.5, maxHp: 40, label: 'Snowy Weaver' },
      { enemyType: 'villager', x: SNOWY_VILLAGE_POS.x + 0.3, z: SNOWY_VILLAGE_POS.z + 2.5, maxHp: 40, label: 'Snowy Trader' },
    ],
  });

  manager.registerStructure({
    id: 'trial_chambers',
    name: 'Trial Chambers',
    type: 'trial_chambers',
    x: TRIAL_CHAMBERS_POS.x,
    z: TRIAL_CHAMBERS_POS.z,
    radius: 26,
    spawnPoints: [
      { enemyType: 'vindicator', x: TRIAL_CHAMBERS_POS.x - 1.8, z: TRIAL_CHAMBERS_POS.z + 3.8, maxHp: 85, label: 'Vault Vindicator' },
      { enemyType: 'pillager', x: TRIAL_CHAMBERS_POS.x + 2.1, z: TRIAL_CHAMBERS_POS.z + 3.6, maxHp: 65, label: 'Vault Pillager' },
    ],
  });

  manager.registerStructure({
    id: 'jungle_temple',
    name: 'Jungle Temple',
    type: 'jungle_temple',
    x: JUNGLE_TEMPLE_POS.x,
    z: JUNGLE_TEMPLE_POS.z,
    radius: 28,
    spawnPoints: [
      { enemyType: 'witch', x: JUNGLE_TEMPLE_POS.x - 2.2, z: JUNGLE_TEMPLE_POS.z + 5.8, maxHp: 75, label: 'Sanctum Witch' },
      { enemyType: 'pillager', x: JUNGLE_TEMPLE_POS.x + 2.2, z: JUNGLE_TEMPLE_POS.z + 5.6, maxHp: 65, label: 'Temple Raider' },
    ],
  });

  manager.registerStructure({
    id: 'viking_village',
    name: 'Viking Village',
    type: 'village',
    x: VIKING_VILLAGE_POS.x,
    z: VIKING_VILLAGE_POS.z,
    radius: 44,
    spawnPoints: [
      {
        enemyType: 'villager',
        x: VIKING_VILLAGE_POS.x - 3.2,
        z: VIKING_VILLAGE_POS.z + 6.8,
        maxHp: 60,
        label: 'Jarl Erik Ironbeard',
        villagerRefId: 'viking_jarl_erik',
      },
      {
        enemyType: 'villager',
        x: VIKING_VILLAGE_POS.x + 3.4,
        z: VIKING_VILLAGE_POS.z + 6.4,
        maxHp: 60,
        label: 'Astrild the Runesmith',
        villagerRefId: 'viking_astrild',
      },
      {
        enemyType: 'villager',
        x: VIKING_VILLAGE_POS.x + 11.2,
        z: VIKING_VILLAGE_POS.z + 5.6,
        maxHp: 60,
        label: 'Bjorn the Shipwright',
        villagerRefId: 'viking_bjorn',
      },
      {
        enemyType: 'villager',
        x: VIKING_VILLAGE_POS.x - 9.4,
        z: VIKING_VILLAGE_POS.z - 1.2,
        maxHp: 60,
        label: 'Freya the Dragon-Keeper',
        villagerRefId: 'viking_freya',
      },
    ],
  });
}
