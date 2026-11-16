import * as THREE from 'three';
import {
  CreatureSpecies,
  CreatureTemperament,
  ItemId,
  TrackedSighting,
} from '../types';
import { createCreatureModel, CreatureRig } from '../world/models';
import { getTerrainHeight, LAKE_CENTER, OCEAN_LEVEL } from '../world/terrain';

export interface SpeciesSpec {
  species: CreatureSpecies;
  displayName: string;
  temperament: CreatureTemperament;
  maxHp: number;
  walkSpeed: number;
  chaseSpeed: number;
  attackDamage: number;
  aggroRadius: number;
  attackRange: number;
  drops: { itemId: ItemId; min: number; max: number }[];
  footprintRadius: number;
}

export const SPECIES_SPECS: Record<CreatureSpecies, SpeciesSpec> = {
  // Ordinary Real-World Wildlife
  deer: {
    species: 'deer',
    displayName: 'Island Deer',
    temperament: 'timid_herbivore',
    maxHp: 52,
    walkSpeed: 3.1,
    chaseSpeed: 8.0,
    attackDamage: 0,
    aggroRadius: 0,
    attackRange: 0,
    drops: [
      { itemId: 'raw_meat', min: 2, max: 4 },
      { itemId: 'hide', min: 2, max: 3 },
      { itemId: 'bone', min: 1, max: 2 },
    ],
    footprintRadius: 0.24,
  },
  rabbit: {
    species: 'rabbit',
    displayName: 'Wild Rabbit',
    temperament: 'timid_herbivore',
    maxHp: 14,
    walkSpeed: 2.2,
    chaseSpeed: 6.4,
    attackDamage: 0,
    aggroRadius: 0,
    attackRange: 0,
    drops: [
      { itemId: 'raw_meat', min: 1, max: 1 },
      { itemId: 'hide', min: 1, max: 1 },
    ],
    footprintRadius: 0.1,
  },
  wild_boar: {
    species: 'wild_boar',
    displayName: 'Wild Pig',
    temperament: 'defensive_herbivore',
    maxHp: 48,
    walkSpeed: 3.0,
    chaseSpeed: 6.8,
    attackDamage: 8,
    aggroRadius: 0,
    attackRange: 1.9,
    drops: [
      { itemId: 'raw_meat', min: 2, max: 3 },
      { itemId: 'hide', min: 1, max: 2 },
    ],
    footprintRadius: 0.2,
  },
  cattle: {
    species: 'cattle',
    displayName: 'Wild Island Cattle',
    temperament: 'defensive_herbivore',
    maxHp: 105,
    walkSpeed: 2.3,
    chaseSpeed: 5.5,
    attackDamage: 12,
    aggroRadius: 0,
    attackRange: 2.4,
    drops: [
      { itemId: 'raw_meat', min: 4, max: 6 },
      { itemId: 'hide', min: 3, max: 4 },
      { itemId: 'bone', min: 2, max: 2 },
    ],
    footprintRadius: 0.34,
  },
  jungle_fowl: {
    species: 'jungle_fowl',
    displayName: 'Wild Chicken',
    temperament: 'timid_herbivore',
    maxHp: 18,
    walkSpeed: 2.2,
    chaseSpeed: 5.2,
    attackDamage: 0,
    aggroRadius: 0,
    attackRange: 0,
    drops: [
      { itemId: 'raw_meat', min: 1, max: 2 },
    ],
    footprintRadius: 0.12,
  },
  goat: {
    species: 'goat',
    displayName: 'Mountain Goat',
    temperament: 'timid_herbivore',
    maxHp: 44,
    walkSpeed: 2.9,
    chaseSpeed: 7.0,
    attackDamage: 0,
    aggroRadius: 0,
    attackRange: 0,
    drops: [
      { itemId: 'raw_meat', min: 2, max: 3 },
      { itemId: 'hide', min: 1, max: 2 },
    ],
    footprintRadius: 0.2,
  },
  bird: {
    species: 'bird',
    displayName: 'Tropical Seabird',
    temperament: 'aerial_ambient',
    maxHp: 20,
    walkSpeed: 8.5,
    chaseSpeed: 10,
    attackDamage: 0,
    aggroRadius: 0,
    attackRange: 0,
    drops: [],
    footprintRadius: 0,
  },
  fish_school: {
    species: 'fish_school',
    displayName: 'Fish School',
    temperament: 'aquatic_school',
    maxHp: 99,
    walkSpeed: 2.8,
    chaseSpeed: 4.5,
    attackDamage: 0,
    aggroRadius: 0,
    attackRange: 0,
    drops: [],
    footprintRadius: 0,
  },
  dolphin: {
    species: 'dolphin',
    displayName: 'Coastal Dolphin',
    temperament: 'friendly_marine',
    maxHp: 999,
    walkSpeed: 6.5,
    chaseSpeed: 9.0,
    attackDamage: 0,
    aggroRadius: 0,
    attackRange: 0,
    drops: [],
    footprintRadius: 0,
  },

  // Prehistoric Dinosaur Foundation
  trex: {
    species: 'trex',
    displayName: 'Tyrannosaurus rex',
    temperament: 'apex_predator',
    maxHp: 220,
    walkSpeed: 3.8,
    chaseSpeed: 7.4,
    attackDamage: 26,
    aggroRadius: 24,
    attackRange: 3.8,
    drops: [
      { itemId: 'dino_meat', min: 5, max: 8 },
      { itemId: 'hide', min: 3, max: 5 },
      { itemId: 'bone', min: 3, max: 5 },
    ],
    footprintRadius: 0.65,
  },
  velociraptor: {
    species: 'velociraptor',
    displayName: 'Velociraptor',
    temperament: 'pack_predator',
    maxHp: 68,
    walkSpeed: 4.5,
    chaseSpeed: 8.6,
    attackDamage: 12,
    aggroRadius: 19,
    attackRange: 2.3,
    drops: [
      { itemId: 'dino_meat', min: 2, max: 3 },
      { itemId: 'hide', min: 1, max: 2 },
      { itemId: 'bone', min: 1, max: 2 },
    ],
    footprintRadius: 0.28,
  },
  triceratops: {
    species: 'triceratops',
    displayName: 'Triceratops',
    temperament: 'defensive_herbivore',
    maxHp: 165,
    walkSpeed: 2.8,
    chaseSpeed: 6.2,
    attackDamage: 18,
    aggroRadius: 0,
    attackRange: 3.1,
    drops: [
      { itemId: 'dino_meat', min: 4, max: 6 },
      { itemId: 'hide', min: 2, max: 4 },
      { itemId: 'bone', min: 2, max: 3 },
    ],
    footprintRadius: 0.48,
  },
  stegosaurus: {
    species: 'stegosaurus',
    displayName: 'Stegosaurus',
    temperament: 'defensive_herbivore',
    maxHp: 150,
    walkSpeed: 2.5,
    chaseSpeed: 5.2,
    attackDamage: 16,
    aggroRadius: 0,
    attackRange: 3.0,
    drops: [
      { itemId: 'dino_meat', min: 3, max: 5 },
      { itemId: 'hide', min: 2, max: 3 },
      { itemId: 'bone', min: 2, max: 3 },
    ],
    footprintRadius: 0.45,
  },
  brachiosaurus: {
    species: 'brachiosaurus',
    displayName: 'Brachiosaurus',
    temperament: 'timid_herbivore',
    maxHp: 320,
    walkSpeed: 2.2,
    chaseSpeed: 3.8,
    attackDamage: 0,
    aggroRadius: 0,
    attackRange: 0,
    drops: [
      { itemId: 'dino_meat', min: 6, max: 10 },
      { itemId: 'bone', min: 4, max: 6 },
    ],
    footprintRadius: 0.78,
  },
  parasaurolophus: {
    species: 'parasaurolophus',
    displayName: 'Parasaurolophus',
    temperament: 'timid_herbivore',
    maxHp: 90,
    walkSpeed: 3.2,
    chaseSpeed: 7.8,
    attackDamage: 0,
    aggroRadius: 0,
    attackRange: 0,
    drops: [
      { itemId: 'dino_meat', min: 3, max: 4 },
      { itemId: 'hide', min: 2, max: 3 },
      { itemId: 'bone', min: 1, max: 2 },
    ],
    footprintRadius: 0.36,
  },
};

export interface ActiveCreature {
  id: string;
  species: CreatureSpecies;
  spec: SpeciesSpec;
  rig: CreatureRig;
  x: number;
  y: number;
  z: number;
  yaw: number;
  homeX: number;
  homeZ: number;
  targetX: number;
  targetZ: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  spawnCycle: 'diurnal' | 'nocturnal' | 'always';
  cycleActive: boolean;
  respawnTimer: number;
  state: 'idle' | 'graze' | 'sleep' | 'wander' | 'chase' | 'flee' | 'swim';
  stateTimer: number;
  attackCooldown: number;
  provokedTimer: number;
  snaredTimer: number;
  stunTimer: number;
  stepAccum: number;
  callCooldown: number;
  leapPhase: number;
  leaping: boolean;
}

export interface FootprintMarker {
  id: string;
  species: CreatureSpecies;
  name: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  life: number;
  mesh: THREE.Mesh;
}

export class CreatureManager {
  public creatures: ActiveCreature[] = [];
  public footprints: FootprintMarker[] = [];
  private footprintGeo = new THREE.CircleGeometry(1, 8);
  private footprintMat = new THREE.MeshBasicMaterial({
    color: 0x292524,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  private scene: THREE.Scene;
  private fpSeq = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.footprintGeo.rotateX(-Math.PI / 2);
    this.spawnInitialFauna();
  }

  private spawnInitialFauna(): void {
    // Mobile-optimized population with dynamic day/night spawn cycles
    const spawns: [
      CreatureSpecies,
      number,
      number,
      'diurnal' | 'nocturnal' | 'always',
    ][] = [
      // Diurnal Ordinary Wildlife (active in daylight, shelter/burrow at night)
      ['jungle_fowl', 10, 86, 'diurnal'],
      ['jungle_fowl', -14, 84, 'diurnal'],
      ['rabbit', -18, 72, 'diurnal'],
      ['rabbit', -32, 46, 'diurnal'],
      ['bird', 0, 60, 'diurnal'],
      ['bird', 28, -10, 'diurnal'],
      ['bird', -32, 18, 'diurnal'],
      // Persistent Herbivores & Wildlife (graze by day, sleep/bed down at night)
      ['wild_boar', 18, 72, 'always'],
      ['wild_boar', -22, 68, 'always'],
      ['deer', -38, 28, 'always'],
      ['deer', 22, 46, 'always'],
      ['cattle', -50, 16, 'always'],
      ['cattle', -56, 26, 'always'],
      ['goat', -26, -52, 'always'],
      ['goat', 14, -56, 'always'],
      // Aquatic Fish & Dolphins
      ['fish_school', LAKE_CENTER.x, LAKE_CENTER.z, 'always'],
      ['fish_school', 14, 130, 'always'],
      ['dolphin', -28, 134, 'always'],
      ['dolphin', 24, 132, 'always'],
      // Prehistoric Dinosaurs
      ['parasaurolophus', -34, 12, 'always'],
      ['triceratops', -52, -4, 'always'],
      ['stegosaurus', -24, -22, 'always'],
      ['brachiosaurus', 12, -18, 'always'],
      ['velociraptor', 36, 16, 'always'],
      ['trex', 16, -40, 'always'],
      // Nocturnal Stalkers (emerge from dens at Dusk/Night, retreat at Dawn)
      ['velociraptor', 14, 66, 'nocturnal'],
      ['velociraptor', -26, 54, 'nocturnal'],
      ['velociraptor', -2, 34, 'nocturnal'],
    ];

    spawns.forEach(([species, x, z, spawnCycle], i) => {
      const spec = SPECIES_SPECS[species];
      const rig = createCreatureModel(species);
      const y =
        species === 'dolphin'
          ? OCEAN_LEVEL - 0.15
          : species === 'bird'
            ? 24 + (i % 3) * 5
            : species === 'fish_school'
              ? Math.hypot(x - LAKE_CENTER.x, z - LAKE_CENTER.z) < 25
                ? LAKE_CENTER.waterY - 0.55
                : OCEAN_LEVEL - 0.45
              : getTerrainHeight(x, z);
      rig.root.position.set(x, y, z);
      const initialActive = spawnCycle !== 'nocturnal';
      rig.root.visible = initialActive;
      this.scene.add(rig.root);

      this.creatures.push({
        id: `creature_${species}_${i}`,
        species,
        spec,
        rig,
        x,
        y,
        z,
        yaw: Math.random() * Math.PI * 2,
        homeX: x,
        homeZ: z,
        targetX: x + (Math.random() - 0.5) * 14,
        targetZ: z + (Math.random() - 0.5) * 14,
        hp: spec.maxHp,
        maxHp: spec.maxHp,
        alive: true,
        spawnCycle,
        cycleActive: initialActive,
        respawnTimer: 0,
        state:
          species === 'dolphin' || species === 'fish_school'
            ? 'swim'
            : 'wander',
        stateTimer: 3 + Math.random() * 4,
        attackCooldown: 0,
        provokedTimer: 0,
        snaredTimer: 0,
        stunTimer: 0,
        stepAccum: 0,
        callCooldown: 4 + Math.random() * 10,
        leapPhase: Math.random() * Math.PI * 2,
        leaping: false,
      });
    });
  }

  public triggerDolphinLeap(creature: ActiveCreature): void {
    if (creature.species !== 'dolphin') return;
    creature.leaping = true;
    creature.leapPhase = 0;
  }

  public damageCreature(
    creature: ActiveCreature,
    amount: number,
    attackerX: number,
    attackerZ: number,
    options?: { snareSeconds?: number; stunSeconds?: number; knockback?: number },
  ): { killed: boolean; drops: { itemId: ItemId; quantity: number }[] } {
    if (
      !creature.alive ||
      creature.species === 'dolphin' ||
      creature.species === 'bird' ||
      creature.species === 'fish_school'
    ) {
      return { killed: false, drops: [] };
    }

    creature.hp = Math.max(0, creature.hp - amount);
    if (options?.snareSeconds) {
      creature.snaredTimer = Math.max(creature.snaredTimer, options.snareSeconds);
    }
    if (options?.stunSeconds) {
      creature.stunTimer = Math.max(creature.stunTimer, options.stunSeconds);
    }
    if (options?.knockback) {
      const dx = creature.x - attackerX;
      const dz = creature.z - attackerZ;
      const d = Math.hypot(dx, dz) || 1;
      creature.x += (dx / d) * options.knockback;
      creature.z += (dz / d) * options.knockback;
    }

    if (creature.hp <= 0) {
      creature.alive = false;
      creature.respawnTimer = 75;
      creature.rig.root.visible = false;

      const drops = creature.spec.drops.map((d) => ({
        itemId: d.itemId,
        quantity: d.min + Math.floor(Math.random() * (d.max - d.min + 1)),
      }));
      return { killed: true, drops };
    }

    if (creature.spec.temperament === 'timid_herbivore') {
      creature.state = 'flee';
      creature.stateTimer = 7;
      const dx = creature.x - attackerX;
      const dz = creature.z - attackerZ;
      const d = Math.hypot(dx, dz) || 1;
      creature.targetX = creature.x + (dx / d) * 28;
      creature.targetZ = creature.z + (dz / d) * 28;
    } else {
      creature.provokedTimer = 18;
      creature.state = 'chase';
    }

    return { killed: false, drops: [] };
  }

  private spawnFootprint(c: ActiveCreature): void {
    if (c.spec.footprintRadius <= 0 || this.footprints.length > 48) return;
    const mat = this.footprintMat.clone();
    const mesh = new THREE.Mesh(this.footprintGeo, mat);
    mesh.scale.set(c.spec.footprintRadius, 1, c.spec.footprintRadius * 1.25);
    const y = getTerrainHeight(c.x, c.z) + 0.05;
    mesh.position.set(c.x, y, c.z);
    mesh.rotation.y = c.yaw;
    this.scene.add(mesh);

    this.footprints.push({
      id: `fp_${++this.fpSeq}`,
      species: c.species,
      name: c.spec.displayName,
      x: c.x,
      y,
      z: c.z,
      yaw: c.yaw,
      life: 24,
      mesh,
    });
  }

  public update(
    dt: number,
    elapsed: number,
    playerX: number,
    playerZ: number,
    playerSprinting: boolean,
    playerCrouching: boolean,
    isNight: boolean,
    playerVisibility: number,
    onPlayerDamaged: (amount: number, sourceName: string) => void,
    onCreatureCall: (species: CreatureSpecies, dist: number) => void,
    onSightingUpdate: (sightings: TrackedSighting[]) => void,
  ): { nocturnalActiveCount: number } {
    for (let i = this.footprints.length - 1; i >= 0; i--) {
      const fp = this.footprints[i];
      fp.life -= dt;
      if (fp.life <= 0) {
        this.scene.remove(fp.mesh);
        (fp.mesh.material as THREE.Material).dispose();
        this.footprints.splice(i, 1);
      } else {
        (fp.mesh.material as THREE.MeshBasicMaterial).opacity =
          Math.min(0.42, fp.life * 0.03);
      }
    }

    const sightings: TrackedSighting[] = [];
    // Combined stealth & visibility factor: crouching in darkness makes player much harder to spot
    const stealthMult =
      (0.36 + 0.84 * playerVisibility) *
      (playerCrouching ? 0.68 : playerSprinting ? 1.18 : 1.0);
    let nocturnalActiveCount = 0;

    for (let i = 0; i < this.creatures.length; i++) {
      const c = this.creatures[i];

      // Handle Day/Night Dynamic Spawning & Sheltering
      const shouldBeActive =
        c.spawnCycle === 'always' ||
        (c.spawnCycle === 'diurnal' && !isNight) ||
        (c.spawnCycle === 'nocturnal' && isNight);

      if (shouldBeActive !== c.cycleActive) {
        c.cycleActive = shouldBeActive;
        if (!shouldBeActive) {
          c.rig.root.visible = false;
          c.state = 'idle';
          c.provokedTimer = 0;
        } else if (c.alive) {
          // Emerge fresh at habitat edge with slight random offset
          c.x = c.homeX + (Math.random() - 0.5) * 8;
          c.z = c.homeZ + (Math.random() - 0.5) * 8;
          c.y =
            c.species === 'bird'
              ? 22 + (i % 3) * 4
              : getTerrainHeight(c.x, c.z);
          c.hp = c.maxHp;
          c.state = 'wander';
          c.rig.root.position.set(c.x, c.y, c.z);
          c.rig.root.visible = true;
        }
      }

      if (!c.cycleActive) continue;

      if (!c.alive) {
        c.respawnTimer -= dt;
        if (c.respawnTimer <= 0) {
          c.alive = true;
          c.hp = c.maxHp;
          c.x = c.homeX;
          c.z = c.homeZ;
          c.y = getTerrainHeight(c.x, c.z);
          c.state = 'wander';
          c.rig.root.visible = true;
        }
        continue;
      }

      if (c.spawnCycle === 'nocturnal') {
        nocturnalActiveCount += 1;
      }

      // Predator eye-shine glows in the dark
      if (c.rig.eyeGlowMat) {
        c.rig.eyeGlowMat.opacity = isNight ? 0.92 : 0.14;
      }

      // Birds circling overhead
      if (c.species === 'bird') {
        const orbit = elapsed * 0.42 + i * 1.9;
        const nx = c.homeX + Math.cos(orbit) * 24;
        const nz = c.homeZ + Math.sin(orbit) * 24;
        c.yaw = Math.atan2(nx - c.x, nz - c.z);
        c.x = nx;
        c.z = nz;
        c.y = 22 + Math.sin(elapsed * 0.8 + i) * 2.5;
        c.rig.root.position.set(c.x, c.y, c.z);
        c.rig.root.rotation.y = c.yaw;
        c.rig.wings?.forEach((w, wi) => {
          w.rotation.z =
            (wi === 0 ? 1 : -1) * (0.2 + Math.sin(elapsed * 11 + i) * 0.45);
        });
        continue;
      }

      // Swimming fish schools
      if (c.species === 'fish_school') {
        const orbit = elapsed * 0.65 + i * 2.3;
        const nx = c.homeX + Math.cos(orbit) * 5.5;
        const nz = c.homeZ + Math.sin(orbit) * 5.5;
        c.yaw = Math.atan2(nx - c.x, nz - c.z);
        c.x = nx;
        c.z = nz;
        c.rig.root.position.set(c.x, c.y, c.z);
        c.rig.root.rotation.y = c.yaw;
        continue;
      }

      const distToPlayer = Math.hypot(playerX - c.x, playerZ - c.z);
      if (
        distToPlayer < 55 * (0.5 + 0.5 * playerVisibility) &&
        c.species !== 'rabbit' &&
        c.species !== 'jungle_fowl'
      ) {
        sightings.push({
          species: c.species,
          name: c.spec.displayName,
          x: c.x,
          z: c.z,
          timestamp: elapsed,
        });
      }

      // Coastal Dolphins
      if (c.species === 'dolphin') {
        const orbitAngle = elapsed * 0.25 + i * 2.1;
        const nextX = c.homeX + Math.cos(orbitAngle) * 14;
        const nextZ = c.homeZ + Math.sin(orbitAngle) * 10;
        c.yaw = Math.atan2(nextX - c.x, nextZ - c.z);
        c.x = nextX;
        c.z = nextZ;

        if (c.leaping) {
          c.leapPhase += dt * 3.8;
          const arc = Math.sin(c.leapPhase);
          c.y = OCEAN_LEVEL - 0.15 + Math.max(-0.2, arc * 2.4);
          c.rig.body.rotation.x = -Math.cos(c.leapPhase) * 0.55;
          if (c.leapPhase >= Math.PI) {
            c.leaping = false;
            c.y = OCEAN_LEVEL - 0.15;
            c.rig.body.rotation.x = 0;
          }
        } else {
          c.y = OCEAN_LEVEL - 0.12 + Math.sin(elapsed * 2.8 + i) * 0.18;
          c.rig.body.rotation.x = Math.cos(elapsed * 2.8 + i) * 0.1;
        }
        c.rig.tail.rotation.x = Math.sin(elapsed * 7.5 + i) * 0.35;
        c.rig.root.position.set(c.x, c.y, c.z);
        c.rig.root.rotation.y = c.yaw;
        continue;
      }

      if (c.attackCooldown > 0) c.attackCooldown -= dt;
      if (c.provokedTimer > 0) c.provokedTimer -= dt;
      if (c.snaredTimer > 0) c.snaredTimer -= dt;
      if (c.stunTimer > 0) {
        c.stunTimer -= dt;
        c.rig.head.rotation.z = Math.sin(elapsed * 18) * 0.22;
        continue;
      } else {
        c.rig.head.rotation.z = 0;
      }

      c.callCooldown -= dt;
      if (c.callCooldown <= 0) {
        c.callCooldown = 10 + Math.random() * 14;
        if (distToPlayer < 45 && c.state !== 'sleep') {
          onCreatureCall(c.species, distToPlayer);
        }
      }

      // AI state transitions scaled by time of day & player visibility
      const nightHunterBonus =
        isNight && c.spawnCycle === 'nocturnal' ? 1.18 : 1.0;
      const effectiveAggro =
        c.spec.aggroRadius * stealthMult * nightHunterBonus;

      if (
        (c.spec.temperament === 'apex_predator' ||
          c.spec.temperament === 'pack_predator') &&
        distToPlayer < effectiveAggro
      ) {
        if (c.state !== 'chase') {
          c.state = 'chase';
          onCreatureCall(c.species, distToPlayer);
        }
      } else if (
        c.spec.temperament === 'defensive_herbivore' &&
        (c.provokedTimer > 0 || (distToPlayer < 4.5 * stealthMult && playerSprinting))
      ) {
        c.state = 'chase';
      } else if (
        c.spec.temperament === 'timid_herbivore' &&
        distToPlayer < 8.5 * stealthMult
      ) {
        c.state = 'flee';
        c.stateTimer = 4.5;
        const dx = c.x - playerX;
        const dz = c.z - playerZ;
        const d = Math.hypot(dx, dz) || 1;
        c.targetX = c.x + (dx / d) * 22;
        c.targetZ = c.z + (dz / d) * 22;
      }

      if (c.state === 'chase') {
        c.targetX = playerX;
        c.targetZ = playerZ;
        const loseDist = 26 + 14 * playerVisibility;
        if (distToPlayer > loseDist && c.provokedTimer <= 0) {
          c.state = 'wander';
        }
      } else {
        c.stateTimer -= dt;
        const distTarget = Math.hypot(c.targetX - c.x, c.targetZ - c.z);
        if (c.stateTimer <= 0 || distTarget < 1.8) {
          if (
            isNight &&
            c.spec.temperament === 'timid_herbivore' &&
            Math.random() < 0.55
          ) {
            c.state = 'sleep';
            c.stateTimer = 8 + Math.random() * 6;
          } else if (c.state === 'wander') {
            c.state = Math.random() < 0.6 ? 'graze' : 'idle';
            c.stateTimer = 3 + Math.random() * 4;
          } else {
            c.state = 'wander';
            const angle = Math.random() * Math.PI * 2;
            const rad = 7 + Math.random() * 16;
            c.targetX = c.homeX + Math.cos(angle) * rad;
            c.targetZ = c.homeZ + Math.sin(angle) * rad;
            c.stateTimer = 5 + Math.random() * 5;
          }
        }
      }

      let moveSpeed = 0;
      if (c.state === 'wander') moveSpeed = c.spec.walkSpeed;
      else if (c.state === 'chase' || c.state === 'flee')
        moveSpeed = c.spec.chaseSpeed;

      if (c.snaredTimer > 0) moveSpeed *= 0.25;

      if (moveSpeed > 0) {
        const dx = c.targetX - c.x;
        const dz = c.targetZ - c.z;
        const dist = Math.hypot(dx, dz);

        if (c.state === 'chase' && dist <= c.spec.attackRange) {
          if (c.attackCooldown <= 0 && c.spec.attackDamage > 0) {
            c.attackCooldown = c.species === 'trex' ? 1.8 : 1.35;
            onPlayerDamaged(c.spec.attackDamage, c.spec.displayName);
            if (c.rig.jaw) c.rig.jaw.rotation.x = 0.45;
          }
        } else if (dist > 0.3) {
          const nx = dx / dist;
          const nz = dz / dist;
          const candidateX = c.x + nx * moveSpeed * dt;
          const candidateZ = c.z + nz * moveSpeed * dt;
          const nextTerrain = getTerrainHeight(candidateX, candidateZ);

          if (nextTerrain > 0.2) {
            c.x = candidateX;
            c.z = candidateZ;
            c.stepAccum += moveSpeed * dt;
            if (c.stepAccum > 2.6) {
              c.stepAccum = 0;
              this.spawnFootprint(c);
            }
          } else {
            c.targetX = c.homeX;
            c.targetZ = c.homeZ;
          }

          const desiredYaw = Math.atan2(nx, nz);
          let diff = desiredYaw - c.yaw;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          c.yaw += diff * Math.min(1, dt * 6);
        }
      }

      c.y = getTerrainHeight(c.x, c.z);
      // Resting/sleeping posture lowers body subtly
      const sleepDrop = c.state === 'sleep' ? -0.32 : 0;
      c.rig.root.position.set(c.x, c.y + sleepDrop, c.z);
      c.rig.root.rotation.y = c.yaw;

      const animFreq = moveSpeed > 0 ? moveSpeed * 1.9 : 1.8;
      const legAmp = moveSpeed > 0 ? 0.52 : 0.03;
      c.rig.legs.forEach((leg, idx) => {
        const phase = idx % 2 === 0 ? 0 : Math.PI;
        leg.rotation.x =
          c.state === 'sleep' ? 0.6 : Math.sin(elapsed * animFreq + phase) * legAmp;
      });
      c.rig.tail.rotation.y = Math.sin(elapsed * (moveSpeed > 0 ? 4.2 : 1.6) + i) * 0.2;

      if (c.state === 'graze') {
        c.rig.head.rotation.x = 0.42 + Math.sin(elapsed * 3.0 + i) * 0.16;
      } else if (c.state === 'sleep') {
        c.rig.head.rotation.x = 0.35;
      } else {
        c.rig.head.rotation.x = Math.sin(elapsed * 2.5 + i) * 0.06;
      }

      if (c.rig.jaw) {
        c.rig.jaw.rotation.x = THREE.MathUtils.damp(
          c.rig.jaw.rotation.x,
          c.state === 'chase' ? 0.22 : 0.02,
          5,
          dt,
        );
      }
    }

    onSightingUpdate(sightings);
    return { nocturnalActiveCount };
  }
}
