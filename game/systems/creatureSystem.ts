import * as THREE from 'three';
import {
  CreatureSpecies,
  CreatureTemperament,
  ItemId,
  TrackedSighting,
} from '../types';
import { createCreatureModel, CreatureRig } from '../world/models';
import {
  AUTUMN_GROVE_POS,
  DEAD_OAK_POS,
  getTerrainHeight,
  LAKE_CENTER,
  OCEAN_LEVEL,
  SNOWY_WOODLAND_POS,
  SWAMP_POS,
} from '../world/terrain';

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
  pig: {
    species: 'pig',
    displayName: 'Yorkshire Pig',
    temperament: 'domestic_calm',
    maxHp: 56,
    walkSpeed: 1.9,
    chaseSpeed: 4.8,
    attackDamage: 0,
    aggroRadius: 0,
    attackRange: 0,
    drops: [
      { itemId: 'raw_meat', min: 3, max: 4 },
      { itemId: 'hide', min: 1, max: 2 },
    ],
    footprintRadius: 0.2,
  },
  cattle: {
    species: 'cattle',
    displayName: 'Holstein Dairy Cow',
    temperament: 'domestic_calm',
    maxHp: 115,
    walkSpeed: 1.85,
    chaseSpeed: 4.8,
    attackDamage: 10,
    aggroRadius: 0,
    attackRange: 2.3,
    drops: [
      { itemId: 'raw_meat', min: 4, max: 6 },
      { itemId: 'hide', min: 3, max: 4 },
      { itemId: 'bone', min: 2, max: 2 },
    ],
    footprintRadius: 0.34,
  },
  horse: {
    species: 'horse',
    displayName: 'Chestnut Quarter Horse',
    temperament: 'domestic_calm',
    maxHp: 130,
    walkSpeed: 2.9,
    chaseSpeed: 8.4,
    attackDamage: 0,
    aggroRadius: 0,
    attackRange: 0,
    drops: [
      { itemId: 'raw_meat', min: 4, max: 5 },
      { itemId: 'hide', min: 3, max: 4 },
      { itemId: 'bone', min: 2, max: 3 },
    ],
    footprintRadius: 0.32,
  },
  sheep: {
    species: 'sheep',
    displayName: 'Suffolk Sheep',
    temperament: 'domestic_calm',
    maxHp: 46,
    walkSpeed: 1.75,
    chaseSpeed: 5.2,
    attackDamage: 0,
    aggroRadius: 0,
    attackRange: 0,
    drops: [
      { itemId: 'raw_meat', min: 2, max: 3 },
      { itemId: 'hide', min: 2, max: 3 },
    ],
    footprintRadius: 0.18,
  },
  jungle_fowl: {
    species: 'jungle_fowl',
    displayName: 'Rhode Island Red Rooster',
    temperament: 'domestic_calm',
    maxHp: 20,
    walkSpeed: 1.65,
    chaseSpeed: 4.6,
    attackDamage: 0,
    aggroRadius: 0,
    attackRange: 0,
    drops: [
      { itemId: 'raw_meat', min: 1, max: 2 },
    ],
    footprintRadius: 0.1,
  },
  goat: {
    species: 'goat',
    displayName: 'Nigerian Dwarf Goat',
    temperament: 'domestic_calm',
    maxHp: 42,
    walkSpeed: 2.2,
    chaseSpeed: 6.2,
    attackDamage: 0,
    aggroRadius: 0,
    attackRange: 0,
    drops: [
      { itemId: 'raw_meat', min: 2, max: 3 },
      { itemId: 'hide', min: 1, max: 2 },
    ],
    footprintRadius: 0.16,
  },
  duck: {
    species: 'duck',
    displayName: 'Pekin Duck',
    temperament: 'domestic_calm',
    maxHp: 16,
    walkSpeed: 1.45,
    chaseSpeed: 4.2,
    attackDamage: 0,
    aggroRadius: 0,
    attackRange: 0,
    drops: [
      { itemId: 'raw_meat', min: 1, max: 1 },
    ],
    footprintRadius: 0.1,
  },
  barn_cat: {
    species: 'barn_cat',
    displayName: 'Tabby Barn Cat',
    temperament: 'domestic_calm',
    maxHp: 24,
    walkSpeed: 2.4,
    chaseSpeed: 6.0,
    attackDamage: 0,
    aggroRadius: 0,
    attackRange: 0,
    drops: [
      { itemId: 'raw_meat', min: 1, max: 1 },
      { itemId: 'hide', min: 1, max: 1 },
    ],
    footprintRadius: 0.08,
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
    drops: [
      { itemId: 'raw_meat', min: 1, max: 2 },
    ],
    footprintRadius: 0,
  },
  fish_school: {
    species: 'fish_school',
    displayName: 'Fish School',
    temperament: 'aquatic_school',
    maxHp: 25,
    walkSpeed: 2.8,
    chaseSpeed: 4.5,
    attackDamage: 0,
    aggroRadius: 0,
    attackRange: 0,
    drops: [
      { itemId: 'raw_meat', min: 2, max: 4 },
    ],
    footprintRadius: 0,
  },
  dolphin: {
    species: 'dolphin',
    displayName: 'Coastal Dolphin',
    temperament: 'friendly_marine',
    maxHp: 65,
    walkSpeed: 6.5,
    chaseSpeed: 9.0,
    attackDamage: 0,
    aggroRadius: 0,
    attackRange: 0,
    drops: [
      { itemId: 'raw_meat', min: 3, max: 5 },
      { itemId: 'bone', min: 1, max: 2 },
    ],
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

  // Iconic Wild Animals
  grizzly_bear: {
    species: 'grizzly_bear',
    displayName: 'North American Grizzly Bear',
    temperament: 'apex_predator',
    maxHp: 185,
    walkSpeed: 2.8,
    chaseSpeed: 7.2,
    attackDamage: 22,
    aggroRadius: 15,
    attackRange: 2.5,
    drops: [
      { itemId: 'raw_meat', min: 4, max: 6 },
      { itemId: 'hide', min: 3, max: 4 },
      { itemId: 'bone', min: 2, max: 3 },
    ],
    footprintRadius: 0.42,
  },
  gray_wolf: {
    species: 'gray_wolf',
    displayName: 'Timber Wolf',
    temperament: 'pack_predator',
    maxHp: 72,
    walkSpeed: 3.4,
    chaseSpeed: 8.2,
    attackDamage: 12,
    aggroRadius: 16,
    attackRange: 2.1,
    drops: [
      { itemId: 'raw_meat', min: 2, max: 3 },
      { itemId: 'hide', min: 2, max: 2 },
      { itemId: 'bone', min: 1, max: 1 },
    ],
    footprintRadius: 0.22,
  },
  african_lion: {
    species: 'african_lion',
    displayName: 'African Lion',
    temperament: 'apex_predator',
    maxHp: 160,
    walkSpeed: 3.2,
    chaseSpeed: 8.6,
    attackDamage: 20,
    aggroRadius: 18,
    attackRange: 2.5,
    drops: [
      { itemId: 'raw_meat', min: 3, max: 5 },
      { itemId: 'hide', min: 2, max: 3 },
      { itemId: 'bone', min: 2, max: 2 },
    ],
    footprintRadius: 0.34,
  },
  bald_eagle: {
    species: 'bald_eagle',
    displayName: 'American Bald Eagle',
    temperament: 'aerial_ambient',
    maxHp: 35,
    walkSpeed: 10.5,
    chaseSpeed: 12.0,
    attackDamage: 0,
    aggroRadius: 0,
    attackRange: 0,
    drops: [
      { itemId: 'raw_meat', min: 2, max: 3 },
    ],
    footprintRadius: 0,
  },
  red_fox: {
    species: 'red_fox',
    displayName: 'Wild Red Fox',
    temperament: 'timid_herbivore',
    maxHp: 32,
    walkSpeed: 2.8,
    chaseSpeed: 7.4,
    attackDamage: 0,
    aggroRadius: 0,
    attackRange: 0,
    drops: [
      { itemId: 'raw_meat', min: 1, max: 2 },
      { itemId: 'hide', min: 1, max: 2 },
    ],
    footprintRadius: 0.14,
  },
  saltwater_crocodile: {
    species: 'saltwater_crocodile',
    displayName: 'Saltwater Crocodile',
    temperament: 'apex_predator',
    maxHp: 175,
    walkSpeed: 2.1,
    chaseSpeed: 6.4,
    attackDamage: 21,
    aggroRadius: 13,
    attackRange: 2.6,
    drops: [
      { itemId: 'raw_meat', min: 3, max: 5 },
      { itemId: 'hide', min: 3, max: 4 },
      { itemId: 'bone', min: 2, max: 3 },
    ],
    footprintRadius: 0.36,
  },
  bison: {
    species: 'bison',
    displayName: 'American Bison',
    temperament: 'defensive_herbivore',
    maxHp: 210,
    walkSpeed: 2.3,
    chaseSpeed: 6.8,
    attackDamage: 18,
    aggroRadius: 0,
    attackRange: 2.7,
    drops: [
      { itemId: 'raw_meat', min: 5, max: 7 },
      { itemId: 'hide', min: 3, max: 5 },
      { itemId: 'bone', min: 2, max: 3 },
    ],
    footprintRadius: 0.45,
  },
  great_horned_owl: {
    species: 'great_horned_owl',
    displayName: 'Great Horned Owl',
    temperament: 'domestic_calm',
    maxHp: 24,
    walkSpeed: 1.5,
    chaseSpeed: 4.5,
    attackDamage: 0,
    aggroRadius: 0,
    attackRange: 0,
    drops: [
      { itemId: 'raw_meat', min: 1, max: 2 },
    ],
    footprintRadius: 0,
  },
};

export interface ScavengerCarcassTarget {
  id: string;
  x: number;
  y: number;
  z: number;
  isDino: boolean;
  remainingDrops: number;
}

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
  state:
    | 'idle'
    | 'graze'
    | 'sleep'
    | 'wander'
    | 'chase'
    | 'flee'
    | 'swim'
    | 'swoop'
    | 'feed'
    | 'takeoff';
  stateTimer: number;
  attackCooldown: number;
  provokedTimer: number;
  snaredTimer: number;
  stunTimer: number;
  stepAccum: number;
  callCooldown: number;
  leapPhase: number;
  leaping: boolean;
  feedCarcassId?: string;
  feedTimer?: number;
  swoopOffsetAngle?: number;
  startledTimer?: number;
  velY?: number;
  perch?: {
    x: number;
    y: number;
    z: number;
    yaw: number;
    mode: 'sit' | 'stand';
  };
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
      ['jungle_fowl', -18.5, 58.8, 'diurnal'],
      ['jungle_fowl', -17.2, 61.5, 'diurnal'],
      ['jungle_fowl', 10, 86, 'diurnal'],
      ['rabbit', -18, 72, 'diurnal'],
      ['rabbit', -32, 46, 'diurnal'],
      ['bird', 0, 60, 'diurnal'],
      ['bird', 6, 98, 'diurnal'],
      ['bird', -16, 88, 'diurnal'],
      ['bird', 28, -10, 'diurnal'],
      ['bird', -32, 18, 'diurnal'],
      // Homestead Pasture & Barnyard Animals (always visible & approachable)
      ['cattle', -34, 48, 'always'],
      ['cattle', -42, 42, 'always'],
      ['cattle', -50, 22, 'always'],
      ['pig', -22.2, 64.2, 'always'],
      ['pig', -26.4, 63.4, 'always'],
      ['horse', -31.5, 66.5, 'always'],
      ['horse', -35.2, 64.5, 'always'],
      ['sheep', -45, 52, 'always'],
      ['sheep', -41, 56, 'always'],
      ['goat', -22.0, 56.2, 'always'],
      ['goat', -26, -52, 'always'],
      ['goat', 14, -56, 'always'],
      ['duck', -16.2, 54.8, 'always'],
      ['duck', -14.8, 59.2, 'always'],
      ['duck', -16, 25, 'always'],
      ['barn_cat', -28.8, 56.8, 'always'],
      // Persistent Forest & Savanna Wildlife
      ['wild_boar', 18, 72, 'always'],
      ['wild_boar', -22, 82, 'always'],
      ['deer', -38, 28, 'always'],
      ['deer', 22, 46, 'always'],
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
      ['velociraptor', -26, 40, 'nocturnal'],
      ['velociraptor', -2, 34, 'nocturnal'],
      // 8 Iconic Wild Animals in Dedicated Habitats
      ['grizzly_bear', -4, -26, 'always'],
      ['grizzly_bear', 1.5, -30, 'always'],
      ['gray_wolf', SNOWY_WOODLAND_POS.x + 1.0, SNOWY_WOODLAND_POS.z + 2.0, 'always'],
      ['gray_wolf', SNOWY_WOODLAND_POS.x - 2.5, SNOWY_WOODLAND_POS.z - 2.0, 'always'],
      ['african_lion', -62, 10, 'always'],
      ['african_lion', -57, -16, 'always'],
      ['bald_eagle', LAKE_CENTER.x, LAKE_CENTER.z, 'always'],
      ['bald_eagle', LAKE_CENTER.x + 6, LAKE_CENTER.z - 6, 'always'],
      ['red_fox', AUTUMN_GROVE_POS.x - 0.5, AUTUMN_GROVE_POS.z + 0.8, 'always'],
      ['red_fox', AUTUMN_GROVE_POS.x + 1.8, AUTUMN_GROVE_POS.z - 1.5, 'always'],
      ['saltwater_crocodile', SWAMP_POS.x, SWAMP_POS.z, 'always'],
      ['saltwater_crocodile', SWAMP_POS.x + 3.0, SWAMP_POS.z + 1.5, 'always'],
      ['bison', -54, 32, 'always'],
      ['bison', -60, 22, 'always'],
      ['great_horned_owl', DEAD_OAK_POS.x + 1.35, DEAD_OAK_POS.z + 0.2, 'always'],
    ];

    spawns.forEach(([species, x, z, spawnCycle], i) => {
      const spec = SPECIES_SPECS[species];
      const rig = createCreatureModel(species);

      // Exact perched placements: Tabby Barn Cat on hay bales, Nigerian Dwarf Goat on crate, Great Horned Owl on dead oak branch
      let perch: ActiveCreature['perch'];
      if (species === 'barn_cat' && Math.hypot(x - -28.8, z - 56.8) < 1) {
        const barnBaseY = getTerrainHeight(-28.5, 58);
        perch = {
          x: -28.8,
          y: barnBaseY + 1.4,
          z: 56.8,
          yaw: 1.28,
          mode: 'sit',
        };
      } else if (species === 'goat' && Math.hypot(x - -22.0, z - 56.2) < 1) {
        perch = {
          x: -22.0,
          y: getTerrainHeight(-22.0, 56.2) + 0.68,
          z: 56.2,
          yaw: 1.05,
          mode: 'stand',
        };
      } else if (species === 'great_horned_owl') {
        const deadOakBaseY = getTerrainHeight(DEAD_OAK_POS.x, DEAD_OAK_POS.z);
        perch = {
          x: DEAD_OAK_POS.x + 1.35,
          y: deadOakBaseY + 3.25,
          z: DEAD_OAK_POS.z + 0.2,
          yaw: 2.35,
          mode: 'stand',
        };
      }

      const dSwamp = Math.hypot(x - SWAMP_POS.x, z - SWAMP_POS.z);
      const y = perch
        ? perch.y
        : species === 'dolphin'
          ? OCEAN_LEVEL - 0.15
          : species === 'bird'
            ? 24 + (i % 3) * 5
            : species === 'bald_eagle'
              ? 18.5 + (i % 2) * 3.2
              : species === 'saltwater_crocodile' && dSwamp < SWAMP_POS.radius
                ? SWAMP_POS.waterY - 0.24
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
        yaw: perch ? perch.yaw : Math.random() * Math.PI * 2,
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
        state: perch
          ? 'idle'
          : species === 'dolphin' || species === 'fish_school'
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
        swoopOffsetAngle: Math.random() * Math.PI * 2,
        feedTimer: 0,
        startledTimer: 0,
        velY: 0,
        perch,
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
    if (!creature.alive) {
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

    if (creature.spec.temperament === 'aerial_ambient') {
      creature.startledTimer = 5.0;
      creature.feedCarcassId = undefined;
      creature.state = 'takeoff';
    } else {
      creature.perch = undefined;
      creature.provokedTimer = 0;
      creature.state = 'flee';
      creature.stateTimer = 7;
      const dx = creature.x - attackerX;
      const dz = creature.z - attackerZ;
      const d = Math.hypot(dx, dz) || 1;
      creature.targetX = creature.x + (dx / d) * 24;
      creature.targetZ = creature.z + (dz / d) * 24;
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
    carcasses: ScavengerCarcassTarget[] = [],
    onCarcassScavenged?: (
      carcassId: string,
      species: CreatureSpecies,
      displayName: string,
    ) => void,
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
          c.y =
            c.species === 'dolphin'
              ? OCEAN_LEVEL - 0.15
              : c.species === 'bird'
                ? 24 + (i % 3) * 5
                : c.species === 'bald_eagle'
                  ? 18.5 + (i % 2) * 3.2
                  : c.species === 'fish_school'
                    ? Math.hypot(c.homeX - LAKE_CENTER.x, c.homeZ - LAKE_CENTER.z) < 25
                      ? LAKE_CENTER.waterY - 0.55
                      : OCEAN_LEVEL - 0.45
                    : c.species === 'great_horned_owl'
                      ? getTerrainHeight(DEAD_OAK_POS.x, DEAD_OAK_POS.z) + 3.25
                      : getTerrainHeight(c.x, c.z);
          c.state =
            c.species === 'dolphin' || c.species === 'fish_school' ? 'swim' : 'wander';
          c.rig.root.position.set(c.x, c.y, c.z);
          c.rig.root.visible = true;
        }
        continue;
      }

      if (c.spawnCycle === 'nocturnal') {
        nocturnalActiveCount += 1;
      }

      // Predator & nocturnal owl eye-shine glows in the dark (crocodile eyes stay visible above murky water)
      if (c.rig.eyeGlowMat) {
        if (c.species === 'great_horned_owl') {
          c.rig.eyeGlowMat.opacity = isNight ? 1.0 : 0.48;
        } else if (c.species === 'saltwater_crocodile') {
          c.rig.eyeGlowMat.opacity = isNight ? 0.96 : 0.68;
        } else {
          c.rig.eyeGlowMat.opacity = isNight ? 0.92 : 0.14;
        }
      }

      // Cold breath puffs (Timber Wolf) & warm nostril steam (American Bison)
      if (c.rig.breathWisps && c.rig.breathWisps.length > 0) {
        c.rig.breathWisps.forEach((wisp, wi) => {
          const cycle = (elapsed * 0.78 + wi * 0.34 + i * 0.19) % 1;
          const baseZ = c.species === 'bison' ? 1.48 : 0.88;
          const baseY = c.species === 'bison' ? 1.12 : 0.72;
          const sideX = c.species === 'bison' ? (wi % 2 === 0 ? -0.1 : 0.1) : 0;
          wisp.position.set(
            sideX + Math.sin(elapsed * 2 + wi) * 0.03,
            baseY + cycle * 0.34,
            baseZ + cycle * 0.42,
          );
          wisp.scale.setScalar(0.55 + cycle * 1.15);
          const mat = wisp.material as THREE.MeshBasicMaterial;
          mat.opacity = Math.sin(cycle * Math.PI) * 0.46;
        });
      }

      // Windblown Lion Mane Tuft Sway
      if (c.rig.maneTufts && c.rig.maneTufts.length > 0) {
        c.rig.maneTufts.forEach((tuft, ti) => {
          const gust = Math.sin(elapsed * 3.1 + ti * 0.75 + i) * 0.09;
          tuft.rotation.z = gust;
          tuft.rotation.x = Math.cos(elapsed * 2.4 + ti * 0.9) * 0.06;
        });
      }

      // Bald Eagle majestic wide-winged soaring above Misty Mountain Lake
      if (c.species === 'bald_eagle') {
        const orbit = elapsed * 0.34 + i * 2.2;
        const radius = 19 + (i % 2) * 5;
        const nx = LAKE_CENTER.x + Math.cos(orbit) * radius;
        const nz = LAKE_CENTER.z + Math.sin(orbit) * radius;
        c.yaw = Math.atan2(nx - c.x, nz - c.z);
        c.x = nx;
        c.z = nz;
        c.y = 18.5 + (i % 2) * 3.0 + Math.sin(elapsed * 0.65 + i) * 1.4;
        c.rig.root.position.set(c.x, c.y, c.z);
        c.rig.root.rotation.y = c.yaw;
        c.rig.body.rotation.z = -0.18; // subtle banked thermal turn
        // Alternating majestic wingbeats & soaring glides
        const beatPhase = (elapsed * 0.55 + i) % 1;
        const flapEnv = beatPhase < 0.38 ? Math.sin((beatPhase / 0.38) * Math.PI) : 0;
        c.rig.wings?.forEach((w, wi) => {
          const side = wi === 0 ? 1 : -1;
          w.rotation.z = side * (0.08 + flapEnv * Math.sin(elapsed * 10 + i) * 0.42);
        });
        const distEagle = Math.hypot(playerX - c.x, playerZ - c.z);
        if (distEagle < 65) {
          sightings.push({
            species: c.species,
            name: c.spec.displayName,
            x: c.x,
            z: c.z,
            timestamp: elapsed,
          });
        }
        c.callCooldown -= dt;
        if (c.callCooldown <= 0) {
          c.callCooldown = 12 + Math.random() * 14;
          if (distEagle < 55) onCreatureCall('bald_eagle', distEagle);
        }
        continue;
      }

      // Birds circling overhead, swooping onto unclaimed carcasses, pecking & startling off
      if (c.species === 'bird') {
        if ((c.startledTimer ?? 0) > 0) {
          c.startledTimer = Math.max(0, (c.startledTimer ?? 0) - dt);
        }

        const distPlayerBird = Math.hypot(playerX - c.x, playerZ - c.z);

        // Locate nearest unclaimed carcass within 95m if not currently startled
        let targetCarcass: ScavengerCarcassTarget | undefined;
        if ((c.startledTimer ?? 0) <= 0 && carcasses.length > 0) {
          if (c.feedCarcassId) {
            targetCarcass = carcasses.find(
              (kc) => kc.id === c.feedCarcassId && kc.remainingDrops > 0,
            );
          }
          if (!targetCarcass) {
            let bestDist = 95;
            for (const kc of carcasses) {
              if (kc.remainingDrops <= 0) continue;
              const d = Math.hypot(kc.x - c.x, kc.z - c.z);
              if (d < bestDist) {
                bestDist = d;
                targetCarcass = kc;
              }
            }
          }
        }

        // Startle into steep climb if player approaches close while bird is feeding or swooping low
        if (
          targetCarcass &&
          (c.state === 'feed' || (c.state === 'swoop' && c.y < targetCarcass.y + 4.5)) &&
          distPlayerBird < 5.2
        ) {
          c.state = 'takeoff';
          c.feedCarcassId = undefined;
          c.startledTimer = 4.5;
          c.velY = 6.5;
          onCreatureCall('bird', distPlayerBird);
        }

        if (c.state === 'takeoff') {
          const awayX = c.x - playerX;
          const awayZ = c.z - playerZ;
          const awayLen = Math.hypot(awayX, awayZ) || 1;
          const nx = awayX / awayLen;
          const nz = awayZ / awayLen;
          c.x += nx * 10.5 * dt;
          c.z += nz * 10.5 * dt;
          c.y += 8.2 * dt;
          c.yaw = Math.atan2(nx, nz);
          c.rig.body.rotation.x = -0.45;
          c.rig.head.rotation.x = 0.05;
          c.rig.legs.forEach((leg) => {
            leg.rotation.x = 0.75;
          });
          c.rig.wings?.forEach((w, wi) => {
            w.rotation.y = 0;
            w.rotation.z =
              (wi === 0 ? 1 : -1) * (0.25 + Math.sin(elapsed * 22 + i) * 0.68);
          });
          if (c.y >= 21) {
            c.state = 'wander';
            c.rig.body.rotation.x = 0;
          }
        } else if (targetCarcass) {
          c.feedCarcassId = targetCarcass.id;
          const angle = c.swoopOffsetAngle ?? i * 1.7;
          const rim = targetCarcass.isDino ? 1.15 : 0.72;
          const landX = targetCarcass.x + Math.cos(angle) * rim;
          const landZ = targetCarcass.z + Math.sin(angle) * rim;
          const landY = Math.max(OCEAN_LEVEL + 0.14, getTerrainHeight(landX, landZ)) + 0.14;
          const dx = landX - c.x;
          const dz = landZ - c.z;
          const horizDist = Math.hypot(dx, dz);

          if (c.state !== 'feed') {
            c.state = 'swoop';
            const speed = horizDist > 4 ? 11.5 : Math.max(2.8, horizDist * 2.4);
            if (horizDist > 0.18) {
              const nx = dx / horizDist;
              const nz = dz / horizDist;
              c.x += nx * Math.min(horizDist, speed * dt);
              c.z += nz * Math.min(horizDist, speed * dt);
              c.yaw = Math.atan2(nx, nz);
            }
            // Parabolic glide descent: pitch nose down high up, flare nose up near touchdown
            const targetHeight = landY + Math.min(18, horizDist * 0.65);
            c.y = THREE.MathUtils.damp(c.y, targetHeight, horizDist < 3 ? 6.5 : 3.2, dt);
            const flaring = horizDist < 3.5 && c.y < landY + 2.4;
            c.rig.body.rotation.x = flaring ? -0.35 : Math.min(0.45, horizDist * 0.04);
            c.rig.head.rotation.x = 0.1;
            c.rig.legs.forEach((leg) => {
              leg.rotation.x = flaring ? -0.25 : 0.72;
            });
            c.rig.wings?.forEach((w, wi) => {
              w.rotation.y = 0;
              const flapRate = flaring ? 20 : 12;
              const flapAmp = flaring ? 0.62 : 0.36;
              w.rotation.z =
                (wi === 0 ? 1 : -1) * (0.18 + Math.sin(elapsed * flapRate + i) * flapAmp);
            });

            if (horizDist <= 0.35 && Math.abs(c.y - landY) <= 0.42) {
              c.state = 'feed';
              c.x = landX;
              c.z = landZ;
              c.y = landY;
              c.feedTimer = 0.85 + Math.random() * 0.6;
              c.yaw = Math.atan2(targetCarcass.x - c.x, targetCarcass.z - c.z);
            }
          } else {
            // Ground feeding: folded wings, hop & peck motions toward carcass center
            c.y = landY + Math.abs(Math.sin(elapsed * 6.5 + i)) * 0.04;
            c.yaw = Math.atan2(targetCarcass.x - c.x, targetCarcass.z - c.z);
            const peckPulse = Math.max(0, Math.sin(elapsed * 9.5 + i * 1.3));
            c.rig.body.rotation.x = 0.25 + peckPulse * 0.42;
            c.rig.head.rotation.x = 0.32 + peckPulse * 0.58;
            c.rig.legs.forEach((leg) => {
              leg.rotation.x = -0.15;
            });
            // Fold wings snugly beside torso while standing on carcass
            c.rig.wings?.forEach((w, wi) => {
              const side = wi === 0 ? -1 : 1;
              w.rotation.z = side * -1.18;
              w.rotation.y = side * 0.22;
            });

            c.feedTimer = (c.feedTimer ?? 1.8) - dt;
            if ((c.feedTimer ?? 0) <= 0) {
              c.feedTimer = 1.9 + Math.random() * 0.85;
              onCarcassScavenged?.(
                targetCarcass.id,
                c.species,
                c.spec.displayName,
              );
            }
          }
        } else {
          // Normal soaring patrol
          c.feedCarcassId = undefined;
          c.state = 'wander';
          const orbit = elapsed * 0.42 + i * 1.9;
          const nx = c.homeX + Math.cos(orbit) * 24;
          const nz = c.homeZ + Math.sin(orbit) * 24;
          c.yaw = Math.atan2(nx - c.x, nz - c.z);
          c.x = nx;
          c.z = nz;
          c.y = THREE.MathUtils.damp(
            c.y,
            22 + Math.sin(elapsed * 0.8 + i) * 2.5,
            2.2,
            dt,
          );
          c.rig.body.rotation.x = 0;
          c.rig.head.rotation.x = 0;
          c.rig.legs.forEach((leg) => {
            leg.rotation.x = 0.85;
          });
          c.rig.wings?.forEach((w, wi) => {
            w.rotation.y = 0;
            w.rotation.z =
              (wi === 0 ? 1 : -1) * (0.2 + Math.sin(elapsed * 11 + i) * 0.45);
          });
        }

        c.rig.root.position.set(c.x, c.y, c.z);
        c.rig.root.rotation.y = c.yaw;
        c.rig.shadowDisc.visible = c.state === 'feed';
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

      // All wild animals know not to mess with the player: predators & wild fauna yield/retreat when player nears
      const isWildPredatorOrDefensive =
        c.spec.temperament === 'apex_predator' ||
        c.spec.temperament === 'pack_predator' ||
        c.spec.temperament === 'defensive_herbivore';

      const fleeRange = isWildPredatorOrDefensive
        ? (playerSprinting ? 12.5 : 9.5) * Math.max(0.75, stealthMult)
        : c.spec.temperament === 'timid_herbivore'
          ? (c.species === 'red_fox' ? 6.5 : 8.5) * stealthMult
          : 0;

      if (fleeRange > 0 && distToPlayer < fleeRange) {
        if (c.state !== 'flee') {
          c.state = 'flee';
          onCreatureCall(c.species, distToPlayer);
        }
        c.stateTimer = 4.5;
        const dx = c.x - playerX;
        const dz = c.z - playerZ;
        const d = Math.hypot(dx, dz) || 1;
        c.targetX = c.x + (dx / d) * 22;
        c.targetZ = c.z + (dz / d) * 22;
      }

      const isCarnivoreScavenger =
        c.species === 'trex' ||
        c.species === 'velociraptor' ||
        c.species === 'wild_boar' ||
        c.species === 'grizzly_bear' ||
        c.species === 'gray_wolf' ||
        c.species === 'african_lion' ||
        c.species === 'red_fox';

      let feedCarcass: ScavengerCarcassTarget | undefined;
      if (isCarnivoreScavenger && c.state !== 'chase' && carcasses.length > 0) {
        const scentRange = c.species === 'wild_boar' ? 40 : 62;
        if (c.feedCarcassId) {
          feedCarcass = carcasses.find(
            (kc) =>
              kc.id === c.feedCarcassId &&
              kc.remainingDrops > 0 &&
              Math.hypot(kc.x - c.x, kc.z - c.z) < scentRange + 15,
          );
        }
        if (!feedCarcass) {
          let bestScavDist = scentRange;
          for (const kc of carcasses) {
            if (kc.remainingDrops <= 0) continue;
            const d = Math.hypot(kc.x - c.x, kc.z - c.z);
            if (d < bestScavDist) {
              bestScavDist = d;
              feedCarcass = kc;
            }
          }
        }
      }

      // Perched Creatures (Barn Cat on hay bales, Goat on crate, Great Horned Owl on dead oak branch)
      if (c.perch && c.state !== 'flee') {
        c.x = c.perch.x;
        c.y = c.perch.y;
        c.z = c.perch.z;
        if (c.species === 'great_horned_owl') {
          c.rig.root.position.set(c.x, c.y, c.z);
          c.rig.root.rotation.y = c.perch.yaw;
          // Iconic owl 180-degree head-swivel scan & attentive tilt
          const scanYaw =
            distToPlayer < 16
              ? Math.atan2(playerX - c.x, playerZ - c.z) - c.perch.yaw
              : Math.sin(elapsed * 0.55 + i) * 1.15;
          c.rig.head.rotation.y = scanYaw;
          c.rig.head.rotation.z = Math.sin(elapsed * 0.9) * 0.08;
          c.rig.body.rotation.x = Math.sin(elapsed * 2.2) * 0.025;
          c.callCooldown -= dt;
          if (c.callCooldown <= 0) {
            c.callCooldown = 9 + Math.random() * 11;
            if (distToPlayer < 45) onCreatureCall('great_horned_owl', distToPlayer);
          }
          continue;
        }
        const lookYaw =
          distToPlayer < 7
            ? Math.atan2(playerX - c.x, playerZ - c.z)
            : c.perch.yaw + Math.sin(elapsed * 0.45 + i) * 0.25;
        let diff = lookYaw - c.yaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        c.yaw += diff * Math.min(1, dt * 3.5);

        c.rig.root.position.set(c.x, c.y, c.z);
        c.rig.root.rotation.y = c.yaw;
        if (c.perch.mode === 'sit') {
          // Seated feline posture on golden hay bale
          c.rig.body.rotation.x = -0.46;
          c.rig.head.rotation.x = 0.44 + Math.sin(elapsed * 1.4 + i) * 0.05;
          c.rig.head.rotation.z = Math.sin(elapsed * 0.9 + i) * 0.08;
          c.rig.legs.forEach((leg, li) => {
            leg.rotation.x = li < 2 ? 0.35 : -0.68;
          });
          c.rig.tail.rotation.y = Math.sin(elapsed * 2.1 + i) * 0.42;
        } else {
          // Alert upright posture on wooden barnyard crate
          c.rig.body.rotation.x = 0;
          c.rig.head.rotation.x = Math.sin(elapsed * 1.8 + i) * 0.08;
          c.rig.head.rotation.z = Math.sin(elapsed * 1.1 + i) * 0.06;
          c.rig.legs.forEach((leg) => {
            leg.rotation.x = 0;
          });
          c.rig.tail.rotation.y = Math.sin(elapsed * 3.8 + i) * 0.22;
        }
        continue;
      }

      if (c.state === 'chase') {
        c.feedCarcassId = undefined;
        c.targetX = playerX;
        c.targetZ = playerZ;
        const loseDist = 26 + 14 * playerVisibility;
        if (distToPlayer > loseDist && c.provokedTimer <= 0) {
          c.state = 'wander';
        }
      } else if (feedCarcass) {
        c.feedCarcassId = feedCarcass.id;
        const standOff =
          c.species === 'trex'
            ? feedCarcass.isDino
              ? 2.7
              : 2.3
            : feedCarcass.isDino
              ? 1.9
              : 1.45;
        const dxC = feedCarcass.x - c.x;
        const dzC = feedCarcass.z - c.z;
        const distC = Math.hypot(dxC, dzC);
        if (distC > standOff + 0.35) {
          c.state = 'wander';
          c.targetX = feedCarcass.x;
          c.targetZ = feedCarcass.z;
        } else {
          c.state = 'feed';
          c.targetX = feedCarcass.x;
          c.targetZ = feedCarcass.z;
          const desiredYaw = Math.atan2(dxC, dzC);
          let diff = desiredYaw - c.yaw;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          c.yaw += diff * Math.min(1, dt * 6);

          c.feedTimer = (c.feedTimer ?? 1.8) - dt;
          if ((c.feedTimer ?? 0) <= 0) {
            c.feedTimer = c.species === 'trex' ? 2.2 : 2.6 + Math.random() * 0.7;
            onCarcassScavenged?.(
              feedCarcass.id,
              c.species,
              c.spec.displayName,
            );
          }
        }
      } else {
        c.feedCarcassId = undefined;
        if (c.state === 'feed') c.state = 'wander';
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
            c.state = Math.random() < 0.65 ? 'graze' : 'idle';
            c.stateTimer = 3.5 + Math.random() * 4.5;
          } else {
            c.state = 'wander';
            const angle = Math.random() * Math.PI * 2;
            const roamScale = c.spec.temperament === 'domestic_calm' ? 4.5 : 16;
            const rad = (c.spec.temperament === 'domestic_calm' ? 1.5 : 7) + Math.random() * roamScale;
            c.targetX = c.homeX + Math.cos(angle) * rad;
            c.targetZ = c.homeZ + Math.sin(angle) * rad;
            c.stateTimer = 4.5 + Math.random() * 4.5;
          }
        }
      }

      let moveSpeed = 0;
      if (c.state === 'wander') {
        moveSpeed = feedCarcass ? c.spec.walkSpeed * 1.35 : c.spec.walkSpeed;
      } else if (c.state === 'chase' || c.state === 'flee') {
        moveSpeed = c.spec.chaseSpeed;
      }

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

      const inSwampZone =
        c.species === 'saltwater_crocodile' &&
        Math.hypot(c.x - SWAMP_POS.x, c.z - SWAMP_POS.z) < SWAMP_POS.radius - 0.35;

      c.y = inSwampZone ? SWAMP_POS.waterY - 0.24 : getTerrainHeight(c.x, c.z);
      // Resting/sleeping posture or stealthy Red Fox crouch lowers body subtly; ducks waddle slightly
      const isFoxCrouch =
        c.species === 'red_fox' && (c.state === 'idle' || c.state === 'graze');
      const sleepDrop = c.state === 'sleep' ? -0.32 : isFoxCrouch ? -0.09 : 0;
      c.rig.root.position.set(c.x, c.y + sleepDrop, c.z);
      c.rig.root.rotation.y = c.yaw;
      c.rig.root.rotation.z =
        c.species === 'duck' && moveSpeed > 0 ? Math.sin(elapsed * 9 + i) * 0.08 : 0;

      const isScratchingRooster = c.species === 'jungle_fowl' && c.state === 'graze';
      const animFreq = moveSpeed > 0 ? moveSpeed * 1.9 : isScratchingRooster ? 11.5 : 1.8;
      const legAmp = moveSpeed > 0 ? (inSwampZone ? 0.22 : 0.52) : isScratchingRooster ? 0.48 : 0.03;
      c.rig.legs.forEach((leg, idx) => {
        const phase = idx % 2 === 0 ? 0 : Math.PI;
        leg.rotation.x =
          c.state === 'sleep'
            ? 0.6
            : isFoxCrouch
              ? -0.28
              : Math.sin(elapsed * animFreq + phase) * legAmp;
      });
      c.rig.tail.rotation.y =
        Math.sin(elapsed * (inSwampZone ? 2.6 : c.state === 'feed' ? 5.2 : moveSpeed > 0 ? 4.2 : 1.8) + i) *
        (inSwampZone ? 0.34 : c.state === 'feed' ? 0.28 : 0.22);

      if (c.state === 'feed') {
        const biteWave = Math.sin(elapsed * 6.4 + i);
        const yankWave = Math.max(0, Math.sin(elapsed * 3.2 + i));
        c.rig.body.rotation.x = THREE.MathUtils.damp(
          c.rig.body.rotation.x,
          0.26 + yankWave * 0.14,
          6,
          dt,
        );
        c.rig.head.rotation.x = 0.58 + biteWave * 0.22;
        c.rig.head.rotation.z = Math.sin(elapsed * 4.5 + i) * 0.12;
      } else {
        c.rig.body.rotation.x = THREE.MathUtils.damp(c.rig.body.rotation.x, 0, 6, dt);
        c.rig.head.rotation.z = 0;
        if (isFoxCrouch && distToPlayer < 14) {
          // Focused gaze tracking player through autumn undergrowth
          const gazeYaw = Math.atan2(playerX - c.x, playerZ - c.z) - c.yaw;
          let gDiff = gazeYaw;
          while (gDiff > Math.PI) gDiff -= Math.PI * 2;
          while (gDiff < -Math.PI) gDiff += Math.PI * 2;
          c.rig.head.rotation.y = THREE.MathUtils.clamp(gDiff, -0.85, 0.85);
          c.rig.head.rotation.x = -0.06;
        } else if (c.state === 'graze') {
          c.rig.head.rotation.y = 0;
          c.rig.head.rotation.x =
            (isScratchingRooster ? 0.55 : 0.42) + Math.sin(elapsed * (isScratchingRooster ? 6.5 : 3.0) + i) * 0.18;
        } else if (c.state === 'sleep') {
          c.rig.head.rotation.y = 0;
          c.rig.head.rotation.x = 0.35;
        } else {
          c.rig.head.rotation.y = 0;
          c.rig.head.rotation.x = Math.sin(elapsed * 2.5 + i) * 0.06;
        }
      }

      if (c.rig.jaw) {
        const feedJaw =
          c.state === 'feed' ? 0.12 + Math.max(0, Math.sin(elapsed * 7.2 + i)) * 0.38 : 0.02;
        c.rig.jaw.rotation.x = THREE.MathUtils.damp(
          c.rig.jaw.rotation.x,
          c.state === 'chase' ? (c.species === 'saltwater_crocodile' ? 0.38 : 0.22) : feedJaw,
          8,
          dt,
        );
      }
    }

    onSightingUpdate(sightings);
    return { nocturnalActiveCount };
  }
}
