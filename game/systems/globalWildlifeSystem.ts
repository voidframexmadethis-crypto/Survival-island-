import * as THREE from 'three';
import {
  DESERT_VILLAGE_POS,
  HILL_HOUSE_POS,
  HOMESTEAD_POS,
  LAKE_CENTER,
  OCEAN_LEVEL,
  PLAINS_VILLAGE_POS,
  SAVANNA_VILLAGE_POS,
  SNOWY_WOODLAND_POS,
  VEHICLE_GARAGE_POS,
  getBiomeAt,
  getTerrainHeight,
} from '../world/terrain';
import {
  GLOBAL_WILDLIFE_ROSTER,
  MAX_WILDLIFE_DENSITY_AGENTS,
  getRosterSpawnCandidates,
  normalizeWildlifeDensity,
  wildlifeDensityAgentCap,
  type GlobalWildlifeEntry,
  type WildlifeArchetype,
} from '../world/globalWildlifeRoster';
import {
  GLOBAL_WILDLIFE_ARCHETYPES,
  getGlobalWildlifeGeometry,
  getGlobalWildlifeMaterial,
} from '../world/globalWildlifeModels';

export type WildlifeAgentState =
  | 'idle'
  | 'wander'
  | 'graze'
  | 'flee'
  | 'chase'
  | 'swim'
  | 'fly';

export interface WildlifeAgent {
  entry: GlobalWildlifeEntry;
  x: number;
  y: number;
  z: number;
  homeX: number;
  homeZ: number;
  targetX: number;
  targetZ: number;
  waterY: number;
  yaw: number;
  state: WildlifeAgentState;
  stateTimer: number;
  phase: number;
  scale: number;
  attackCooldown: number;
  /** Cached squared distance, refreshed during update. */
  distanceSq: number;
  hp: number;
  maxHp: number;
  /** Seconds of red damage flash remaining after the player lands a hit. */
  hitFlash: number;
}

/** Result of the player damaging an ambient wildlife agent. */
export interface WildlifeDamageResult {
  killed: boolean;
  entry: GlobalWildlifeEntry;
  x: number;
  y: number;
  z: number;
  damage: number;
  hp: number;
  maxHp: number;
}

export interface WildlifeRayHit {
  agent: WildlifeAgent;
  entry: GlobalWildlifeEntry;
  distance: number;
  point: THREE.Vector3;
}

const URBAN_ANCHORS = [
  HOMESTEAD_POS,
  HILL_HOUSE_POS,
  VEHICLE_GARAGE_POS,
  PLAINS_VILLAGE_POS,
  SAVANNA_VILLAGE_POS,
  DESERT_VILLAGE_POS,
  SNOWY_WOODLAND_POS,
];

const WILD_SPAWN_MIN_RADIUS = 22;
const WILD_SPAWN_MAX_RADIUS = 106;
const WILD_DESPAWN_DISTANCE = 136;
const WILD_NEAR_LOD_DISTANCE = 58;
const WILD_ACTIVE_DISTANCE = 124;
const MAX_AGENTS_PER_ARCHETYPE = MAX_WILDLIFE_DENSITY_AGENTS;
const OCEAN_BIOMES = new Set([
  'ocean',
  'warm_ocean',
  'lukewarm_ocean',
  'cold_ocean',
  'frozen_ocean',
]);
const INLAND_WATER_BIOMES = new Set([
  'river',
  'lake',
  'swamp',
  'mangrove_swamp',
  'frozen_river',
]);

export function computeWildlifeLod(distance: number): 'near' | 'far' | 'culled' {
  if (distance > WILD_DESPAWN_DISTANCE) return 'culled';
  return distance > WILD_NEAR_LOD_DISTANCE ? 'far' : 'near';
}

export function wildlifeFearRadius(
  entry: GlobalWildlifeEntry,
  options: { sprinting?: boolean; crouching?: boolean } = {},
): number {
  if (entry.category === 'aggressive') return 0;
  const base =
    entry.category === 'passive'
      ? 18
      : entry.category === 'urban'
        ? 14
        : entry.category === 'aerial'
          ? 20
          : 11;
  return (
    base *
    (entry.scale < 0.45 ? 1.35 : 1.0) *
    (options.sprinting ? 1.65 : 1.0) *
    (options.crouching ? 0.55 : 1.0)
  );
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

const SPECIES_COLORS = new Map<string, THREE.Color>();
const FAR_TINT = new THREE.Color(0xa8b6a6);
const HIT_FLASH = new THREE.Color(0xff5544);

/**
 * Ambient animals are smaller and simpler than CreatureManager foes, so their
 * pool is tuned for quick retaliation kills rather than long boss fights.
 */
export function wildlifeMaxHp(entry: GlobalWildlifeEntry): number {
  const base = 6 + entry.scale * 22;
  const predatorBonus = entry.category === 'aggressive' ? 8 : 0;
  return Math.max(12, Math.round(base + predatorBonus));
}
const ARCHETYPE_INDEX = new Map(
  GLOBAL_WILDLIFE_ARCHETYPES.map((archetype, index) => [archetype, index] as const),
);

export function getWildlifeSpeciesColor(entry: GlobalWildlifeEntry): THREE.Color {
  const cached = SPECIES_COLORS.get(entry.id);
  if (cached) return cached;
  const hash = hashString(entry.id);
  const hue = (hash % 360) / 360;
  let saturation = 0.38 + ((hash >>> 8) % 26) / 100;
  let lightness = 0.34 + ((hash >>> 16) % 24) / 100;
  if (entry.aquatic) {
    saturation = 0.42 + ((hash >>> 5) % 20) / 100;
    lightness = 0.4 + ((hash >>> 13) % 22) / 100;
  } else if (entry.aerial) {
    saturation = 0.45 + ((hash >>> 7) % 28) / 100;
    lightness = 0.42 + ((hash >>> 15) % 22) / 100;
  } else if (entry.category === 'aggressive') {
    saturation = Math.min(0.62, saturation + 0.08);
    lightness = Math.max(0.22, lightness - 0.08);
  } else if (entry.urban) {
    saturation = Math.min(0.3, saturation);
    lightness = 0.32 + ((hash >>> 11) % 28) / 100;
  }
  const color = new THREE.Color().setHSL(hue, saturation, lightness);
  SPECIES_COLORS.set(entry.id, color);
  return color;
}

function speedFor(entry: GlobalWildlifeEntry, state: WildlifeAgentState): number {
  const big = entry.scale > 1.3;
  switch (state) {
    case 'flee':
      return (big ? 5.2 : 7.0) * (entry.aquatic ? 0.72 : 1);
    case 'chase':
      return (big ? 5.5 : 7.7) * (entry.aquatic ? 0.72 : 1);
    case 'fly':
      return 4.6 + entry.scale * 1.25;
    case 'swim':
      return 1.4 + entry.scale * 0.9;
    case 'wander':
      return (big ? 1.15 : 1.7) * (entry.urban ? 0.8 : 1);
    default:
      return 0;
  }
}

function turnToward(current: number, target: number, amount: number): number {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * Math.min(1, amount);
}

function waterSurfaceAt(x: number, z: number, biome = ''): number {
  const lakeDx = x - LAKE_CENTER.x;
  const lakeDz = z - LAKE_CENTER.z;
  if (lakeDx * lakeDx + lakeDz * lakeDz < 58 * 58) {
    return LAKE_CENTER.waterY;
  }
  if (INLAND_WATER_BIOMES.has(biome)) {
    return Math.max(OCEAN_LEVEL - 0.1, getTerrainHeight(x, z) + 0.2);
  }
  return OCEAN_LEVEL;
}

function isNearUrban(x: number, z: number): boolean {
  for (let i = 0; i < URBAN_ANCHORS.length; i++) {
    const anchor = URBAN_ANCHORS[i];
    const dx = x - anchor.x;
    const dz = z - anchor.z;
    if (dx * dx + dz * dz < 78 * 78) return true;
  }
  return false;
}

function isValidSpawn(
  entry: GlobalWildlifeEntry,
  x: number,
  z: number,
  biome: string,
  height: number,
): boolean {
  const inWater =
    height < OCEAN_LEVEL - 0.2 ||
    OCEAN_BIOMES.has(biome) ||
    INLAND_WATER_BIOMES.has(biome);
  if (entry.aquatic) return inWater || entry.archetype === 'crab' || entry.archetype === 'turtle';
  if (entry.aerial) return true;
  if (inWater) return false;
  if (height < OCEAN_LEVEL + 0.15) return false;
  if (biome === 'cave' || biome === 'expedition') return false;
  return true;
}

function chooseSpawnPoint(
  playerX: number,
  playerZ: number,
  entry: GlobalWildlifeEntry,
): { x: number; z: number; y: number; waterY: number } | null {
  for (let attempt = 0; attempt < 9; attempt++) {
    const angle = Math.random() * Math.PI * 2;
    const radius =
      WILD_SPAWN_MIN_RADIUS + Math.random() * (WILD_SPAWN_MAX_RADIUS - WILD_SPAWN_MIN_RADIUS);
    const x = THREE.MathUtils.clamp(playerX + Math.cos(angle) * radius, -735, 735);
    const z = THREE.MathUtils.clamp(playerZ + Math.sin(angle) * radius, -735, 735);
    const biome = getBiomeAt(x, z);
    const height = getTerrainHeight(x, z);
    if (!isValidSpawn(entry, x, z, biome, height)) continue;
    const nearUrban = isNearUrban(x, z);
    if (entry.urban && !nearUrban) continue;
    if (!entry.biomes.includes(biome)) continue;
    // Keep urban animals out of the exact building footprint and the player's
    // starting equipment pile.
    if (entry.urban) {
      for (const anchor of URBAN_ANCHORS) {
        const dx = x - anchor.x;
        const dz = z - anchor.z;
        if (dx * dx + dz * dz < 7 * 7) return null;
      }
    }
    const waterY = waterSurfaceAt(x, z, biome);
    let y: number;
    if (entry.aquatic) {
      y =
        entry.archetype === 'crab' || entry.archetype === 'turtle'
          ? Math.max(height, OCEAN_LEVEL - 0.2)
          : waterY - 0.28 - (entry.scale > 1.4 ? 0.3 : 0);
    } else if (entry.aerial) {
      y = Math.max(height + 12 + Math.random() * 9, OCEAN_LEVEL + 10);
    } else {
      y = height;
    }
    return { x, z, y, waterY };
  }
  return null;
}

export interface GlobalWildlifeUpdateResult {
  active: number;
  species: number;
}

/**
 * Ambient global wildlife layer.
 *
 * It is intentionally separate from CreatureManager: the hand-authored
 * interactive animals keep their existing combat/taming code, while the huge
 * master roster is rendered as a handful of InstancedMesh batches. Each batch
 * shares one low-poly merged geometry and one material, so adding another 100
 * roster rows does not add draw calls.
 */
export class GlobalWildlifeSystem {
  private scene: THREE.Scene;
  private agents: WildlifeAgent[] = [];
  private density = 0.75;
  private readonly isTouchDevice: boolean;
  private visible = true;
  private spawnTimer = 0.5;
  private lodFrame = 0;
  private nearMeshes = new Map<WildlifeArchetype, THREE.InstancedMesh>();
  private farMeshes = new Map<WildlifeArchetype, THREE.InstancedMesh>();
  private nearCounts = new Uint16Array(GLOBAL_WILDLIFE_ARCHETYPES.length);
  private farCounts = new Uint16Array(GLOBAL_WILDLIFE_ARCHETYPES.length);
  private dummy = new THREE.Object3D();
  private colorScratch = new THREE.Color();
  private onPlayerDamaged?: (amount: number, sourceName: string) => void;

  constructor(scene: THREE.Scene, options: { isTouchDevice?: boolean } = {}) {
    this.scene = scene;
    this.isTouchDevice = options.isTouchDevice === true;
    for (const archetype of GLOBAL_WILDLIFE_ARCHETYPES) {
      const nearMaterial = getGlobalWildlifeMaterial();
      const farMaterial = getGlobalWildlifeMaterial();
      const near = new THREE.InstancedMesh(
        getGlobalWildlifeGeometry(archetype, 'near'),
        nearMaterial,
        MAX_AGENTS_PER_ARCHETYPE,
      );
      const far = new THREE.InstancedMesh(
        getGlobalWildlifeGeometry(archetype, 'far'),
        farMaterial,
        MAX_AGENTS_PER_ARCHETYPE,
      );
      near.name = `global_wildlife_near_${archetype}`;
      far.name = `global_wildlife_far_${archetype}`;
      for (const mesh of [near, far]) {
        mesh.count = 0;
        mesh.visible = false;
        mesh.frustumCulled = false;
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.scene.add(mesh);
      }
      this.nearMeshes.set(archetype, near);
      this.farMeshes.set(archetype, far);
    }
  }

  public setDensity(rawDensity: number): void {
    this.density = normalizeWildlifeDensity(rawDensity);
    const cap = this.cap;
    while (this.agents.length > cap) {
      this.removeAgent(this.agents.length - 1);
    }
  }

  public getDensity(): number {
    return this.density;
  }

  private get cap(): number {
    return wildlifeDensityAgentCap(this.density, this.isTouchDevice);
  }

  public setVisible(visible: boolean): void {
    this.visible = visible;
    if (!visible) {
      for (const mesh of this.nearMeshes.values()) mesh.visible = false;
      for (const mesh of this.farMeshes.values()) mesh.visible = false;
    }
  }

  public getActiveCount(): number {
    return this.agents.length;
  }

  public getSpeciesCount(): number {
    const ids = new Set<string>();
    for (const agent of this.agents) ids.add(agent.entry.id);
    return ids.size;
  }

  /**
   * Ray/sphere sweep against the instanced wildlife pool. Used by melee swings
   * and projectiles so ambient animals can be fought back like any other foe.
   */
  public raycast(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    maxDistance: number,
  ): WildlifeRayHit | null {
    let best: WildlifeAgent | null = null;
    let bestDistance = maxDistance;
    let bestX = 0;
    let bestY = 0;
    let bestZ = 0;

    for (const agent of this.agents) {
      const centerY = agent.y + agent.scale * 0.55;
      const toX = agent.x - origin.x;
      const toY = centerY - origin.y;
      const toZ = agent.z - origin.z;
      const along = toX * direction.x + toY * direction.y + toZ * direction.z;
      if (along < 0 || along > bestDistance) continue;

      const px = origin.x + direction.x * along;
      const py = origin.y + direction.y * along;
      const pz = origin.z + direction.z * along;
      const dx = agent.x - px;
      const dy = centerY - py;
      const dz = agent.z - pz;
      const radius = Math.max(0.42, agent.scale * 0.72);
      if (dx * dx + dy * dy + dz * dz > radius * radius) continue;

      best = agent;
      bestDistance = along;
      bestX = px;
      bestY = py;
      bestZ = pz;
    }

    if (!best) return null;
    return {
      agent: best,
      entry: best.entry,
      distance: bestDistance,
      point: new THREE.Vector3(bestX, bestY, bestZ),
    };
  }

  /** Closest animal around the player, including ankle-height snakes and crabs. */
  public nearest(
    x: number,
    y: number,
    z: number,
    maxDistance: number,
    maxVertical = 2.6,
  ): WildlifeAgent | null {
    let best: WildlifeAgent | null = null;
    let bestSq = maxDistance * maxDistance;
    for (const agent of this.agents) {
      if (Math.abs(agent.y - y) > maxVertical + agent.scale) continue;
      const dx = agent.x - x;
      const dz = agent.z - z;
      const distSq = dx * dx + dz * dz;
      if (distSq < bestSq) {
        bestSq = distSq;
        best = agent;
      }
    }
    return best;
  }

  /**
   * Applies player damage. Wounded animals flee (or fight back when they are a
   * predator); lethal hits remove them from the pool and report the corpse
   * position so the engine can spawn particles and loot.
   */
  public damage(
    agent: WildlifeAgent,
    rawDamage: number,
    fromX: number,
    fromZ: number,
  ): WildlifeDamageResult | null {
    const index = this.agents.indexOf(agent);
    if (index < 0) return null;
    const damage = Math.max(1, Math.round(rawDamage));
    agent.hp -= damage;
    agent.hitFlash = 0.22;

    const pushX = agent.x - fromX;
    const pushZ = agent.z - fromZ;
    const pushLen = Math.hypot(pushX, pushZ) || 1;
    const knock = Math.min(1.8, 0.5 + damage * 0.02);
    agent.x += (pushX / pushLen) * knock;
    agent.z += (pushZ / pushLen) * knock;

    const result: WildlifeDamageResult = {
      killed: agent.hp <= 0,
      entry: agent.entry,
      x: agent.x,
      y: agent.y,
      z: agent.z,
      damage,
      hp: Math.max(0, agent.hp),
      maxHp: agent.maxHp,
    };

    if (result.hp <= 0) {
      this.removeAgent(index);
    } else if (agent.entry.category === 'aggressive') {
      // Predators answer a hit by charging instead of running away.
      agent.state = 'chase';
      agent.stateTimer = 6;
      agent.targetX = fromX;
      agent.targetZ = fromZ;
    } else {
      agent.state = 'flee';
      agent.stateTimer = 5.5;
    }

    return result;
  }

  /** Area damage for explosions, powder kegs and vehicle rams. */
  public damageNearby(
    x: number,
    z: number,
    radius: number,
    rawDamage: number,
  ): WildlifeDamageResult[] {
    const targets = this.agents.filter(
      (agent) => Math.hypot(agent.x - x, agent.z - z) <= radius,
    );
    const killed: WildlifeDamageResult[] = [];
    for (const agent of targets) {
      const distance = Math.hypot(agent.x - x, agent.z - z);
      const falloff = Math.max(0.35, 1 - distance / (radius + 1));
      const result = this.damage(agent, rawDamage * falloff, x, z);
      if (result?.killed) killed.push(result);
    }
    return killed;
  }

  private removeAgent(index: number): void {
    const last = this.agents.pop();
    if (last && index < this.agents.length) {
      this.agents[index] = last;
    }
  }

  private spawnOne(playerX: number, playerZ: number): boolean {
    if (this.agents.length >= this.cap) return false;
    const attempts = 4;
    for (let attempt = 0; attempt < attempts; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const radius =
        WILD_SPAWN_MIN_RADIUS + Math.random() * (WILD_SPAWN_MAX_RADIUS - WILD_SPAWN_MIN_RADIUS);
      const probeX = THREE.MathUtils.clamp(playerX + Math.cos(angle) * radius, -735, 735);
      const probeZ = THREE.MathUtils.clamp(playerZ + Math.sin(angle) * radius, -735, 735);
      const nearUrban = isNearUrban(probeX, probeZ);
      const candidates = getRosterSpawnCandidates(getBiomeAt(probeX, probeZ), {
        nearUrban,
      });
      if (candidates.length === 0) continue;
      const entry = candidates[Math.floor(Math.random() * candidates.length)];
      const point = chooseSpawnPoint(playerX, playerZ, entry);
      if (!point) continue;
      const state: WildlifeAgentState = entry.aquatic
        ? 'swim'
        : entry.aerial
          ? 'fly'
          : 'wander';
      this.agents.push({
        entry,
        x: point.x,
        y: point.y,
        z: point.z,
        homeX: point.x,
        homeZ: point.z,
        targetX: point.x,
        targetZ: point.z,
        waterY: point.waterY,
        yaw: Math.random() * Math.PI * 2,
        state,
        stateTimer: 2 + Math.random() * 5,
        phase: Math.random() * Math.PI * 2,
        scale: entry.scale * (0.92 + Math.random() * 0.16),
        attackCooldown: 0,
        distanceSq: Infinity,
        hp: wildlifeMaxHp(entry),
        maxHp: wildlifeMaxHp(entry),
        hitFlash: 0,
      });
      return true;
    }
    return false;
  }

  private pickWanderTarget(agent: WildlifeAgent): void {
    const angle = Math.random() * Math.PI * 2;
    const radius = 3 + Math.random() * (agent.entry.aquatic ? 18 : 12);
    let targetX = agent.homeX + Math.cos(angle) * radius;
    let targetZ = agent.homeZ + Math.sin(angle) * radius;
    if (agent.entry.aquatic) {
      targetX = THREE.MathUtils.clamp(targetX, -735, 735);
      targetZ = THREE.MathUtils.clamp(targetZ, -735, 735);
      if (getTerrainHeight(targetX, targetZ) > OCEAN_LEVEL + 0.2) {
        targetX = agent.homeX;
        targetZ = agent.homeZ;
      }
    }
    agent.targetX = targetX;
    agent.targetZ = targetZ;
    agent.stateTimer = 2.5 + Math.random() * 5;
  }

  private updateAgent(
    agent: WildlifeAgent,
    dt: number,
    elapsed: number,
    playerX: number,
    playerZ: number,
    sprinting: boolean,
    crouching: boolean,
  ): void {
    const dx = playerX - agent.x;
    const dz = playerZ - agent.z;
    const dist = Math.hypot(dx, dz);
    agent.distanceSq = dist * dist;
    agent.phase += dt * (agent.state === 'flee' || agent.state === 'chase' ? 9 : 2.2);
    agent.attackCooldown = Math.max(0, agent.attackCooldown - dt);
    agent.hitFlash = Math.max(0, agent.hitFlash - dt);

    const aggressive = agent.entry.category === 'aggressive';
    const fearRadius = wildlifeFearRadius(agent.entry, { sprinting, crouching });
    const wasFleeing = agent.state === 'flee';

    if (!aggressive && !agent.entry.aquatic && fearRadius > 0 && dist < fearRadius) {
      const awayX = agent.x - playerX;
      const awayZ = agent.z - playerZ;
      const awayLen = Math.hypot(awayX, awayZ) || 1;
      const tangent = Math.sin(elapsed * 0.6 + agent.phase) * 0.26;
      agent.targetX =
        agent.x + (awayX / awayLen + (-awayZ / awayLen) * tangent) * 36;
      agent.targetZ =
        agent.z + (awayZ / awayLen + (awayX / awayLen) * tangent) * 36;
      if (!wasFleeing) agent.state = 'flee';
      agent.stateTimer = Math.max(agent.stateTimer, 4.5);
    } else if (!aggressive && agent.entry.aquatic && dist < fearRadius * 0.65) {
      const awayX = agent.x - playerX;
      const awayZ = agent.z - playerZ;
      const awayLen = Math.hypot(awayX, awayZ) || 1;
      agent.targetX = agent.x + (awayX / awayLen) * 24;
      agent.targetZ = agent.z + (awayZ / awayLen) * 24;
      if (!wasFleeing) agent.state = 'flee';
      agent.stateTimer = Math.max(agent.stateTimer, 3.5);
    }

    // Predators break off after the player leaves their territory.
    if (aggressive) {
      if (dist < 18 + agent.scale * 2 || agent.state === 'chase') {
        if (dist < 26) {
          agent.state = 'chase';
          agent.targetX = playerX;
          agent.targetZ = playerZ;
          if (dist < 2.6 && agent.attackCooldown <= 0) {
            agent.attackCooldown = 3.2 + Math.random() * 2;
            const damage = Math.round(5 + agent.scale * 4);
            this.onPlayerDamaged?.(damage, agent.entry.name);
          }
        } else {
          agent.state = 'wander';
          this.pickWanderTarget(agent);
        }
      }
    }

    agent.stateTimer -= dt;
    if (
      agent.state !== 'chase' &&
      (agent.stateTimer <= 0 ||
        Math.hypot(agent.targetX - agent.x, agent.targetZ - agent.z) < 1.1)
    ) {
      if (agent.entry.aerial) {
        agent.state = 'fly';
        agent.stateTimer = 2.2 + Math.random() * 3.5;
        agent.targetX = agent.homeX + (Math.random() - 0.5) * 30;
        agent.targetZ = agent.homeZ + (Math.random() - 0.5) * 30;
      } else if (agent.entry.aquatic) {
        agent.state = 'swim';
        this.pickWanderTarget(agent);
      } else {
        agent.state = Math.random() < 0.5 ? 'graze' : 'wander';
        if (agent.state === 'graze') {
          agent.stateTimer = 2.5 + Math.random() * 4;
        } else {
          this.pickWanderTarget(agent);
        }
      }
    }

    if (agent.state === 'graze' || agent.state === 'idle') return;

    const dxT = agent.targetX - agent.x;
    const dzT = agent.targetZ - agent.z;
    const distT = Math.hypot(dxT, dzT) || 1;
    const speed = speedFor(agent.entry, agent.state);
    if (speed > 0) {
      const step = Math.min(distT, speed * dt);
      agent.x += (dxT / distT) * step;
      agent.z += (dzT / distT) * step;
      agent.yaw = turnToward(agent.yaw, Math.atan2(dxT, dzT), dt * 5.5);
    }

    // Far agents only need a ground sample a few times a second; near agents
    // follow the terrain every frame so hooves never dip through a slope.
    const farLod =
      agent.distanceSq > WILD_NEAR_LOD_DISTANCE * WILD_NEAR_LOD_DISTANCE;
    const sampleSurface = !farLod || this.lodFrame === 0;
    if (agent.entry.aerial) {
      if (sampleSurface) {
        const targetY =
          Math.max(getTerrainHeight(agent.x, agent.z) + 12, OCEAN_LEVEL + 10) +
          Math.sin(agent.phase * 0.7) * 2.4 +
          agent.scale * 1.5;
        agent.y = THREE.MathUtils.damp(agent.y, targetY, 1.8, dt * (farLod ? 6 : 1));
      }
    } else if (agent.entry.aquatic) {
      if (sampleSurface) {
        const waterY = waterSurfaceAt(agent.x, agent.z, getBiomeAt(agent.x, agent.z));
        agent.waterY = waterY;
        agent.y = waterY - 0.28 - (agent.scale > 1.4 ? 0.3 : 0);
      }
    } else if (sampleSurface) {
      agent.y = Math.max(getTerrainHeight(agent.x, agent.z), OCEAN_LEVEL + 0.1);
    }
  }

  public update(
    dt: number,
    elapsed: number,
    playerX: number,
    playerZ: number,
    options: {
      sprinting?: boolean;
      crouching?: boolean;
      onPlayerDamaged?: (amount: number, sourceName: string) => void;
    } = {},
  ): GlobalWildlifeUpdateResult {
    if (!this.visible) {
      return { active: this.agents.length, species: this.getSpeciesCount() };
    }
    this.onPlayerDamaged = options.onPlayerDamaged;

    const cap = this.cap;
    if (cap <= 0) {
      while (this.agents.length > 0) this.removeAgent(this.agents.length - 1);
      this.renderBatches();
      return { active: 0, species: 0 };
    }

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      const spawnBudget = cap > 80 ? 2 : 1;
      let spawned = 0;
      while (spawned < spawnBudget && this.agents.length < cap) {
        if (!this.spawnOne(playerX, playerZ)) break;
        spawned += 1;
      }
      this.spawnTimer = cap > 80 ? 0.34 : 0.55;
    }

    for (let i = this.agents.length - 1; i >= 0; i--) {
      const agent = this.agents[i];
      const dx = playerX - agent.x;
      const dz = playerZ - agent.z;
      if (dx * dx + dz * dz > WILD_DESPAWN_DISTANCE * WILD_DESPAWN_DISTANCE) {
        this.removeAgent(i);
        continue;
      }
      this.updateAgent(
        agent,
        dt,
        elapsed,
        playerX,
        playerZ,
        options.sprinting === true,
        options.crouching === true,
      );
      if (agent.distanceSq > WILD_ACTIVE_DISTANCE * WILD_ACTIVE_DISTANCE) {
        // Keep far agents pooled but do not let them wander off forever.
        if (agent.entry.aquatic || agent.entry.aerial) {
          agent.targetX = agent.homeX;
          agent.targetZ = agent.homeZ;
        }
      }
    }

    this.lodFrame = (this.lodFrame + 1) % 4;
    if (this.lodFrame === 0) {
      // Cheap periodic recovery: an animal that somehow escapes the island
      // bounds is returned to its spawning habitat instead of leaking forever.
      for (const agent of this.agents) {
        if (Math.abs(agent.x) > 740 || Math.abs(agent.z) > 740) {
          agent.x = agent.homeX;
          agent.z = agent.homeZ;
        }
      }
    }

    this.renderBatches();
    return { active: this.agents.length, species: this.getSpeciesCount() };
  }

  private renderBatches(): void {
    this.nearCounts.fill(0);
    this.farCounts.fill(0);

    const nearSq = WILD_NEAR_LOD_DISTANCE * WILD_NEAR_LOD_DISTANCE;
    for (const agent of this.agents) {
      const near = agent.distanceSq <= nearSq;
      const archetype = agent.entry.archetype;
      const archetypeIndex = ARCHETYPE_INDEX.get(archetype) ?? 0;
      const counts = near ? this.nearCounts : this.farCounts;
      const count = counts[archetypeIndex];
      if (count >= MAX_AGENTS_PER_ARCHETYPE) continue;
      const mesh = (near ? this.nearMeshes : this.farMeshes).get(archetype);
      if (!mesh) continue;

      const moving =
        agent.state === 'wander' ||
        agent.state === 'flee' ||
        agent.state === 'chase' ||
        agent.state === 'swim' ||
        agent.state === 'fly';
      const bobAmp = moving ? (agent.state === 'flee' || agent.state === 'chase' ? 0.12 : 0.055) : 0.015;
      const bob = Math.sin(agent.phase) * bobAmp;
      const pitch =
        agent.state === 'graze'
          ? 0.2
          : agent.state === 'fly'
            ? -0.08 + Math.sin(agent.phase * 0.8) * 0.06
            : agent.state === 'flee' || agent.state === 'chase'
              ? 0.08
              : 0;
      const roll =
        agent.entry.aquatic && moving ? Math.sin(agent.phase * 0.55) * 0.12 : 0;

      this.dummy.position.set(agent.x, agent.y + bob, agent.z);
      this.dummy.rotation.set(pitch, agent.yaw, roll);
      this.dummy.scale.setScalar(agent.scale);
      this.dummy.updateMatrix();
      mesh.setMatrixAt(count, this.dummy.matrix);

      this.colorScratch.copy(getWildlifeSpeciesColor(agent.entry));
      if (agent.hitFlash > 0) {
        this.colorScratch.lerp(HIT_FLASH, Math.min(0.8, 0.35 + agent.hitFlash * 2.2));
      }
      if (!near) {
        // Distance haze: far agents keep their species hue but read as a
        // simpler, slightly desaturated silhouette.
        this.colorScratch.lerp(FAR_TINT, 0.22);
      }
      mesh.setColorAt(count, this.colorScratch);
      counts[archetypeIndex] = count + 1;
    }

    for (let i = 0; i < GLOBAL_WILDLIFE_ARCHETYPES.length; i++) {
      const archetype = GLOBAL_WILDLIFE_ARCHETYPES[i];
      const nearMesh = this.nearMeshes.get(archetype);
      const farMesh = this.farMeshes.get(archetype);
      const nearCount = this.nearCounts[i];
      const farCount = this.farCounts[i];
      if (nearMesh) {
        nearMesh.count = nearCount;
        nearMesh.visible = nearCount > 0;
        nearMesh.instanceMatrix.needsUpdate = true;
        if (nearMesh.instanceColor) nearMesh.instanceColor.needsUpdate = true;
      }
      if (farMesh) {
        farMesh.count = farCount;
        farMesh.visible = farCount > 0;
        farMesh.instanceMatrix.needsUpdate = true;
        if (farMesh.instanceColor) farMesh.instanceColor.needsUpdate = true;
      }
    }
  }

  public getRoster(): readonly GlobalWildlifeEntry[] {
    return GLOBAL_WILDLIFE_ROSTER;
  }

  public dispose(): void {
    for (const mesh of this.nearMeshes.values()) {
      this.scene.remove(mesh);
      mesh.dispose();
    }
    for (const mesh of this.farMeshes.values()) {
      this.scene.remove(mesh);
      mesh.dispose();
    }
    this.nearMeshes.clear();
    this.farMeshes.clear();
    this.agents.length = 0;
  }
}
