import * as THREE from 'three';
import {
  ArmorMaterialTier,
  BodyZone,
  CreatureSpecies,
  CreatureTemperament,
  CreatureZoneArmor,
  ItemId,
  TrackedSighting,
} from '../types';
import {
  attachCreatureArmorPlates,
  createCreatureModel,
  CreatureRig,
} from '../world/models';
import {
  AUTUMN_GROVE_POS,
  BADLANDS_MINESHAFT_POS,
  CAVE_POS,
  CHERRY_GROVE_POS,
  CORAL_REEF_POS,
  DEAD_OAK_POS,
  DESERT_PYRAMID_POS,
  DESERT_VILLAGE_POS,
  ERODED_BADLANDS_POS,
  FARMER_POS,
  FROZEN_OCEAN_ICEBERG_POS,
  FROZEN_PEAKS_POS,
  getBiomeAt,
  getLandmarkFloorY,
  getTerrainHeight,
  GROVE_OUTPOST_POS,
  HILL_HOUSE_POS,
  HOMESTEAD_POS,
  ICE_SPIKES_POS,
  JAGGED_PEAKS_POS,
  LAKE_CENTER,
  MANGROVE_SWAMP_POS,
  MEADOW_OUTPOST_POS,
  MUSHROOM_FIELDS_POS,
  OCEAN_LEVEL,
  PILLAGER_OUTPOST_POS,
  PLAINS_VILLAGE_POS,
  SAVANNA_PLATEAU_POS,
  SAVANNA_VILLAGE_POS,
  SNOWY_PLAINS_OUTPOST_POS,
  SNOWY_SLOPES_IGLOO_POS,
  SNOWY_WOODLAND_POS,
  STONY_PEAKS_POS,
  SUNFLOWER_VILLAGE_POS,
  SWAMP_HUT_POS,
  SWAMP_POS,
  VEHICLE_GARAGE_POS,
  WHEATFIELD_POS,
  WINDSWEPT_SAVANNA_POS,
  WOODED_BADLANDS_POS,
  WOODLAND_MANSION_POS,
} from '../world/terrain';
import { getCreatureDefaultArmor } from './combatSystem';
import {
  ANIMAL_FLEE_DISTANCE,
  GUNSHOT_FLEE_DISTANCE,
} from './animalReactionSystem';

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
  // Expanded Global Wild Animals, Arctic, Savanna, Jungle & Birds
  elephant: {
    species: 'elephant',
    displayName: 'Savanna Elephant',
    temperament: 'defensive_herbivore',
    maxHp: 340,
    walkSpeed: 2.1,
    chaseSpeed: 6.4,
    attackDamage: 24,
    aggroRadius: 0,
    attackRange: 3.1,
    drops: [
      { itemId: 'raw_meat', min: 8, max: 12 },
      { itemId: 'hide', min: 5, max: 8 },
      { itemId: 'bone', min: 4, max: 6 },
    ],
    footprintRadius: 0.62,
  },
  reindeer: {
    species: 'reindeer',
    displayName: 'Arctic Reindeer',
    temperament: 'timid_herbivore',
    maxHp: 68,
    walkSpeed: 3.1,
    chaseSpeed: 8.6,
    attackDamage: 6,
    aggroRadius: 0,
    attackRange: 1.9,
    drops: [
      { itemId: 'raw_meat', min: 3, max: 5 },
      { itemId: 'hide', min: 2, max: 4 },
      { itemId: 'bone', min: 2, max: 3 },
    ],
    footprintRadius: 0.28,
  },
  giraffe: {
    species: 'giraffe',
    displayName: 'Reticulated Giraffe',
    temperament: 'timid_herbivore',
    maxHp: 175,
    walkSpeed: 2.6,
    chaseSpeed: 7.4,
    attackDamage: 12,
    aggroRadius: 0,
    attackRange: 2.6,
    drops: [
      { itemId: 'raw_meat', min: 5, max: 8 },
      { itemId: 'hide', min: 4, max: 6 },
      { itemId: 'bone', min: 3, max: 5 },
    ],
    footprintRadius: 0.38,
  },
  zebra: {
    species: 'zebra',
    displayName: 'Plains Zebra',
    temperament: 'timid_herbivore',
    maxHp: 78,
    walkSpeed: 3.2,
    chaseSpeed: 8.8,
    attackDamage: 6,
    aggroRadius: 0,
    attackRange: 1.9,
    drops: [
      { itemId: 'raw_meat', min: 3, max: 5 },
      { itemId: 'hide', min: 3, max: 4 },
      { itemId: 'bone', min: 1, max: 2 },
    ],
    footprintRadius: 0.28,
  },
  rhinoceros: {
    species: 'rhinoceros',
    displayName: 'Armored Rhinoceros',
    temperament: 'defensive_herbivore',
    maxHp: 260,
    walkSpeed: 2.3,
    chaseSpeed: 7.4,
    attackDamage: 22,
    aggroRadius: 0,
    attackRange: 2.8,
    drops: [
      { itemId: 'raw_meat', min: 6, max: 9 },
      { itemId: 'hide', min: 5, max: 7 },
      { itemId: 'bone', min: 3, max: 5 },
    ],
    footprintRadius: 0.5,
  },
  hippopotamus: {
    species: 'hippopotamus',
    displayName: 'River Hippopotamus',
    temperament: 'defensive_herbivore',
    maxHp: 245,
    walkSpeed: 2.0,
    chaseSpeed: 6.8,
    attackDamage: 21,
    aggroRadius: 0,
    attackRange: 2.6,
    drops: [
      { itemId: 'raw_meat', min: 6, max: 9 },
      { itemId: 'hide', min: 4, max: 6 },
      { itemId: 'bone', min: 2, max: 4 },
    ],
    footprintRadius: 0.48,
  },
  tiger: {
    species: 'tiger',
    displayName: 'Bengal Tiger',
    temperament: 'apex_predator',
    maxHp: 135,
    walkSpeed: 3.1,
    chaseSpeed: 8.8,
    attackDamage: 18,
    aggroRadius: 20,
    attackRange: 2.4,
    drops: [
      { itemId: 'raw_meat', min: 4, max: 6 },
      { itemId: 'hide', min: 3, max: 4 },
      { itemId: 'bone', min: 2, max: 3 },
    ],
    footprintRadius: 0.3,
  },
  cheetah: {
    species: 'cheetah',
    displayName: 'Spotted Cheetah',
    temperament: 'pack_predator',
    maxHp: 82,
    walkSpeed: 3.6,
    chaseSpeed: 11.4,
    attackDamage: 13,
    aggroRadius: 18,
    attackRange: 2.2,
    drops: [
      { itemId: 'raw_meat', min: 2, max: 4 },
      { itemId: 'hide', min: 2, max: 3 },
    ],
    footprintRadius: 0.24,
  },
  hyena: {
    species: 'hyena',
    displayName: 'Spotted Hyena',
    temperament: 'pack_predator',
    maxHp: 68,
    walkSpeed: 3.2,
    chaseSpeed: 7.8,
    attackDamage: 11,
    aggroRadius: 16,
    attackRange: 2.0,
    drops: [
      { itemId: 'raw_meat', min: 2, max: 3 },
      { itemId: 'hide', min: 1, max: 2 },
      { itemId: 'bone', min: 1, max: 2 },
    ],
    footprintRadius: 0.22,
  },
  polar_bear: {
    species: 'polar_bear',
    displayName: 'Arctic Polar Bear',
    temperament: 'apex_predator',
    maxHp: 175,
    walkSpeed: 2.4,
    chaseSpeed: 7.1,
    attackDamage: 20,
    aggroRadius: 20,
    attackRange: 2.6,
    drops: [
      { itemId: 'raw_meat', min: 5, max: 7 },
      { itemId: 'hide', min: 4, max: 5 },
      { itemId: 'bone', min: 2, max: 3 },
    ],
    footprintRadius: 0.42,
  },
  moose: {
    species: 'moose',
    displayName: 'Giant Bull Moose',
    temperament: 'defensive_herbivore',
    maxHp: 155,
    walkSpeed: 2.6,
    chaseSpeed: 7.5,
    attackDamage: 16,
    aggroRadius: 0,
    attackRange: 2.5,
    drops: [
      { itemId: 'raw_meat', min: 5, max: 8 },
      { itemId: 'hide', min: 3, max: 5 },
      { itemId: 'bone', min: 3, max: 4 },
    ],
    footprintRadius: 0.36,
  },
  penguin: {
    species: 'penguin',
    displayName: 'Emperor Penguin',
    temperament: 'domestic_calm',
    maxHp: 22,
    walkSpeed: 1.6,
    chaseSpeed: 3.4,
    attackDamage: 0,
    aggroRadius: 0,
    attackRange: 0,
    drops: [{ itemId: 'raw_meat', min: 1, max: 2 }],
    footprintRadius: 0.14,
  },
  gorilla: {
    species: 'gorilla',
    displayName: 'Silverback Gorilla',
    temperament: 'defensive_herbivore',
    maxHp: 165,
    walkSpeed: 2.3,
    chaseSpeed: 6.9,
    attackDamage: 19,
    aggroRadius: 0,
    attackRange: 2.4,
    drops: [
      { itemId: 'raw_meat', min: 4, max: 6 },
      { itemId: 'hide', min: 3, max: 4 },
      { itemId: 'bone', min: 2, max: 3 },
    ],
    footprintRadius: 0.34,
  },
  kangaroo: {
    species: 'kangaroo',
    displayName: 'Red Kangaroo',
    temperament: 'timid_herbivore',
    maxHp: 64,
    walkSpeed: 3.4,
    chaseSpeed: 8.9,
    attackDamage: 9,
    aggroRadius: 0,
    attackRange: 2.0,
    drops: [
      { itemId: 'raw_meat', min: 2, max: 4 },
      { itemId: 'hide', min: 2, max: 3 },
    ],
    footprintRadius: 0.24,
  },
  camel: {
    species: 'camel',
    displayName: 'Desert Camel',
    temperament: 'timid_herbivore',
    maxHp: 135,
    walkSpeed: 2.5,
    chaseSpeed: 6.4,
    attackDamage: 7,
    aggroRadius: 0,
    attackRange: 2.1,
    drops: [
      { itemId: 'raw_meat', min: 4, max: 6 },
      { itemId: 'hide', min: 3, max: 5 },
    ],
    footprintRadius: 0.32,
  },
  toucan: {
    species: 'toucan',
    displayName: 'Toco Toucan',
    temperament: 'aerial_ambient',
    maxHp: 16,
    walkSpeed: 5.5,
    chaseSpeed: 9.0,
    attackDamage: 0,
    aggroRadius: 0,
    attackRange: 0,
    drops: [{ itemId: 'raw_meat', min: 1, max: 1 }],
    footprintRadius: 0,
  },
  flamingo: {
    species: 'flamingo',
    displayName: 'Greater Flamingo',
    temperament: 'timid_herbivore',
    maxHp: 24,
    walkSpeed: 2.0,
    chaseSpeed: 5.4,
    attackDamage: 0,
    aggroRadius: 0,
    attackRange: 0,
    drops: [{ itemId: 'raw_meat', min: 1, max: 2 }],
    footprintRadius: 0.14,
  },
  peregrine_falcon: {
    species: 'peregrine_falcon',
    displayName: 'Peregrine Falcon',
    temperament: 'aerial_ambient',
    maxHp: 28,
    walkSpeed: 7.5,
    chaseSpeed: 13.0,
    attackDamage: 0,
    aggroRadius: 0,
    attackRange: 0,
    drops: [{ itemId: 'raw_meat', min: 1, max: 2 }],
    footprintRadius: 0,
  },
  ostrich: {
    species: 'ostrich',
    displayName: 'Plains Ostrich',
    temperament: 'timid_herbivore',
    maxHp: 72,
    walkSpeed: 3.8,
    chaseSpeed: 10.2,
    attackDamage: 8,
    aggroRadius: 0,
    attackRange: 2.0,
    drops: [
      { itemId: 'raw_meat', min: 3, max: 4 },
      { itemId: 'hide', min: 1, max: 2 },
    ],
    footprintRadius: 0.24,
  },
  sea_turtle: {
    species: 'sea_turtle',
    displayName: 'Green Sea Turtle',
    temperament: 'friendly_marine',
    maxHp: 95,
    walkSpeed: 2.8,
    chaseSpeed: 5.0,
    attackDamage: 0,
    aggroRadius: 0,
    attackRange: 0,
    drops: [
      { itemId: 'raw_meat', min: 2, max: 4 },
      { itemId: 'bone', min: 2, max: 3 },
    ],
    footprintRadius: 0,
  },
  great_white_shark: {
    species: 'great_white_shark',
    displayName: 'Great White Shark',
    temperament: 'aquatic_school',
    maxHp: 195,
    walkSpeed: 4.8,
    chaseSpeed: 9.2,
    attackDamage: 18,
    aggroRadius: 0,
    attackRange: 2.5,
    drops: [
      { itemId: 'raw_meat', min: 5, max: 8 },
      { itemId: 'bone', min: 2, max: 4 },
    ],
    footprintRadius: 0,
  },
  manta_ray: {
    species: 'manta_ray',
    displayName: 'Giant Manta Ray',
    temperament: 'friendly_marine',
    maxHp: 110,
    walkSpeed: 3.6,
    chaseSpeed: 6.0,
    attackDamage: 0,
    aggroRadius: 0,
    attackRange: 0,
    drops: [{ itemId: 'raw_meat', min: 3, max: 5 }],
    footprintRadius: 0,
  },
  spinosaurus: {
    species: 'spinosaurus',
    displayName: 'Spinosaurus',
    temperament: 'apex_predator',
    maxHp: 310,
    walkSpeed: 2.8,
    chaseSpeed: 7.4,
    attackDamage: 24,
    aggroRadius: 24,
    attackRange: 3.4,
    drops: [
      { itemId: 'dino_meat', min: 7, max: 10 },
      { itemId: 'hide', min: 4, max: 6 },
      { itemId: 'bone', min: 3, max: 5 },
    ],
    footprintRadius: 0.6,
  },
  ankylosaurus: {
    species: 'ankylosaurus',
    displayName: 'Ankylosaurus',
    temperament: 'defensive_herbivore',
    maxHp: 285,
    walkSpeed: 1.9,
    chaseSpeed: 5.2,
    attackDamage: 22,
    aggroRadius: 0,
    attackRange: 3.0,
    drops: [
      { itemId: 'dino_meat', min: 6, max: 9 },
      { itemId: 'hide', min: 5, max: 7 },
      { itemId: 'bone', min: 4, max: 6 },
    ],
    footprintRadius: 0.52,
  },
  allosaurus: {
    species: 'allosaurus',
    displayName: 'Allosaurus',
    temperament: 'apex_predator',
    maxHp: 215,
    walkSpeed: 3.1,
    chaseSpeed: 8.2,
    attackDamage: 20,
    aggroRadius: 22,
    attackRange: 2.9,
    drops: [
      { itemId: 'dino_meat', min: 5, max: 7 },
      { itemId: 'hide', min: 3, max: 5 },
      { itemId: 'bone', min: 2, max: 4 },
    ],
    footprintRadius: 0.46,
  },
  dilophosaurus: {
    species: 'dilophosaurus',
    displayName: 'Dilophosaurus',
    temperament: 'pack_predator',
    maxHp: 95,
    walkSpeed: 3.5,
    chaseSpeed: 8.4,
    attackDamage: 14,
    aggroRadius: 19,
    attackRange: 2.3,
    drops: [
      { itemId: 'dino_meat', min: 3, max: 5 },
      { itemId: 'hide', min: 2, max: 3 },
      { itemId: 'bone', min: 1, max: 2 },
    ],
    footprintRadius: 0.3,
  },
  diplodocus: {
    species: 'diplodocus',
    displayName: 'Diplodocus',
    temperament: 'defensive_herbivore',
    maxHp: 460,
    walkSpeed: 1.8,
    chaseSpeed: 3.6,
    attackDamage: 18,
    aggroRadius: 0,
    attackRange: 3.8,
    drops: [
      { itemId: 'dino_meat', min: 10, max: 14 },
      { itemId: 'hide', min: 5, max: 8 },
      { itemId: 'bone', min: 4, max: 6 },
    ],
    footprintRadius: 0.72,
  },
  pteranodon: {
    species: 'pteranodon',
    displayName: 'Pteranodon',
    temperament: 'aerial_ambient',
    maxHp: 62,
    walkSpeed: 6.5,
    chaseSpeed: 11.0,
    attackDamage: 0,
    aggroRadius: 0,
    attackRange: 0,
    drops: [
      { itemId: 'dino_meat', min: 2, max: 4 },
      { itemId: 'hide', min: 1, max: 2 },
    ],
    footprintRadius: 0,
  },
  bee: {
    species: 'bee',
    displayName: 'Honey Bee',
    temperament: 'aerial_ambient',
    maxHp: 12,
    walkSpeed: 4.2,
    chaseSpeed: 6.8,
    attackDamage: 0,
    aggroRadius: 0,
    attackRange: 0,
    drops: [
      { itemId: 'berries', min: 1, max: 1 },
      { itemId: 'plant_material', min: 1, max: 1 },
    ],
    footprintRadius: 0,
  },
  creaking: {
    species: 'creaking',
    displayName: 'The Creaking',
    temperament: 'apex_predator',
    maxHp: 155,
    walkSpeed: 2.6,
    chaseSpeed: 6.8,
    attackDamage: 18,
    aggroRadius: 20,
    attackRange: 2.4,
    drops: [
      { itemId: 'wood', min: 3, max: 5 },
      { itemId: 'core_shard', min: 1, max: 1 },
    ],
    footprintRadius: 0.3,
  },
  white_fox: {
    species: 'white_fox',
    displayName: 'Arctic White Fox',
    temperament: 'timid_herbivore',
    maxHp: 32,
    walkSpeed: 2.9,
    chaseSpeed: 7.6,
    attackDamage: 0,
    aggroRadius: 0,
    attackRange: 0,
    drops: [
      { itemId: 'raw_meat', min: 1, max: 2 },
      { itemId: 'hide', min: 1, max: 2 },
    ],
    footprintRadius: 0.14,
  },
  parrot: {
    species: 'parrot',
    displayName: 'Tropical Parrot',
    temperament: 'aerial_ambient',
    maxHp: 18,
    walkSpeed: 6.8,
    chaseSpeed: 9.2,
    attackDamage: 0,
    aggroRadius: 0,
    attackRange: 0,
    drops: [
      { itemId: 'raw_meat', min: 1, max: 1 },
      { itemId: 'berries', min: 1, max: 2 },
    ],
    footprintRadius: 0,
  },
  ocelot: {
    species: 'ocelot',
    displayName: 'Jungle Ocelot',
    temperament: 'timid_herbivore',
    maxHp: 38,
    walkSpeed: 3.4,
    chaseSpeed: 8.8,
    attackDamage: 0,
    aggroRadius: 0,
    attackRange: 0,
    drops: [
      { itemId: 'raw_meat', min: 1, max: 2 },
      { itemId: 'hide', min: 1, max: 2 },
    ],
    footprintRadius: 0.14,
  },
  panda: {
    species: 'panda',
    displayName: 'Bamboo Panda',
    temperament: 'defensive_herbivore',
    maxHp: 135,
    walkSpeed: 1.8,
    chaseSpeed: 4.8,
    attackDamage: 12,
    aggroRadius: 0,
    attackRange: 2.3,
    drops: [
      { itemId: 'raw_meat', min: 2, max: 4 },
      { itemId: 'hide', min: 2, max: 3 },
      { itemId: 'plant_material', min: 2, max: 4 },
    ],
    footprintRadius: 0.36,
  },
  vex: {
    species: 'vex',
    displayName: 'Vex Spirit',
    temperament: 'pack_predator',
    maxHp: 58,
    walkSpeed: 3.4,
    chaseSpeed: 6.4,
    attackDamage: 12,
    aggroRadius: 15,
    attackRange: 2.1,
    drops: [
      { itemId: 'totem_of_undying', min: 1, max: 1 },
      { itemId: 'emerald', min: 1, max: 2 },
    ],
    footprintRadius: 0,
  },
  evoker: {
    species: 'evoker',
    displayName: 'Woodland Evoker',
    temperament: 'apex_predator',
    maxHp: 185,
    walkSpeed: 2.2,
    chaseSpeed: 4.5,
    attackDamage: 18,
    aggroRadius: 14,
    attackRange: 2.6,
    drops: [
      { itemId: 'totem_of_undying', min: 1, max: 1 },
      { itemId: 'emerald', min: 2, max: 4 },
      { itemId: 'diamond_crystal', min: 1, max: 1 },
    ],
    footprintRadius: 0.24,
  },
  pillager: {
    species: 'pillager',
    displayName: 'Pillager Raider',
    temperament: 'pack_predator',
    maxHp: 110,
    walkSpeed: 2.6,
    chaseSpeed: 5.4,
    attackDamage: 14,
    aggroRadius: 15,
    attackRange: 3.1,
    drops: [
      { itemId: 'totem_of_undying', min: 1, max: 1 },
      { itemId: 'arrows', min: 4, max: 8 },
      { itemId: 'emerald', min: 1, max: 2 },
    ],
    footprintRadius: 0.22,
  },
  witch: {
    species: 'witch',
    displayName: 'Mansion Witch',
    temperament: 'pack_predator',
    maxHp: 130,
    walkSpeed: 2.3,
    chaseSpeed: 4.8,
    attackDamage: 15,
    aggroRadius: 14,
    attackRange: 2.8,
    drops: [
      { itemId: 'totem_of_undying', min: 1, max: 1 },
      { itemId: 'filtered_water_bottle', min: 1, max: 2 },
      { itemId: 'emerald', min: 1, max: 3 },
    ],
    footprintRadius: 0.22,
  },
};

export interface ScavengerCarcassTarget {
  id: string;
  x: number;
  y: number;
  z: number;
  isDino: boolean;
  remainingDrops: number;
  owner?: 'player' | 'world';
  collected?: boolean;
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
  blindTimer: number;
  isBoss?: boolean;
  displayNameOverride?: string;
  zoneArmor: CreatureZoneArmor;
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
  tamed?: boolean;
  mounted?: boolean;
  guardMode?: 'follow' | 'guard' | 'stay';
  rigCastShadow?: boolean;
  summonCooldown?: number;
  summonedMinion?: boolean;
  cachedInDarkCanopy?: boolean;
  biomeCheckTimer?: number;
  cachedFloorY?: number;
}

const HERD_SPECIES = new Set<CreatureSpecies>([
  'reindeer',
  'zebra',
  'elephant',
  'flamingo',
  'penguin',
  'deer',
  'velociraptor',
  'dilophosaurus',
  'kangaroo',
  'ostrich',
  'horse',
  'sheep',
  'cattle',
  'pig',
  'goat',
  'camel',
  'rabbit',
  'bee',
  'duck',
  'gray_wolf',
  'dolphin',
  'sea_turtle',
]);

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
  private footprintMeshPool: THREE.Mesh[] = [];
  private scene: THREE.Scene;
  private fpSeq = 0;
  private replenishTimer = 2.5;
  private dynamicSeq = 0;
  private overworldActive = true;
  private shadowsEnabled = true;
  private maxDrawDistance = 210;
  private rigPool = new Map<CreatureSpecies, CreatureRig[]>();
  private sightingsScratch: TrackedSighting[] = [];
  private sightingEmitTimer = 0;
  private lastEmittedSightingsEmpty = true;
  private updateFrameParity = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.footprintGeo.rotateX(-Math.PI / 2);
    this.spawnInitialFauna();
  }

  public setGraphicsOptions(opts: {
    shadowsEnabled: boolean;
    maxDrawDistance: number;
  }): void {
    this.shadowsEnabled = opts.shadowsEnabled;
    this.maxDrawDistance = opts.maxDrawDistance;
    for (const c of this.creatures) {
      if (!opts.shadowsEnabled) {
        this.setRigShadow(c, false);
      }
    }
  }

  private setRigShadow(c: ActiveCreature, cast: boolean): void {
    if (c.rigCastShadow === cast) return;
    c.rigCastShadow = cast;
    c.rig.root.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj !== c.rig.shadowDisc) {
        obj.castShadow = cast;
      }
    });
  }

  private acquireWildRig(species: CreatureSpecies): CreatureRig {
    const bucket = this.rigPool.get(species);
    if (bucket && bucket.length > 0) {
      const rig = bucket.pop()!;
      rig.root.scale.setScalar(1);
      rig.root.rotation.set(0, 0, 0);
      return rig;
    }
    return createCreatureModel(species);
  }

  private releaseWildRig(species: CreatureSpecies, rig: CreatureRig): void {
    rig.root.visible = false;
    this.scene.remove(rig.root);
    let bucket = this.rigPool.get(species);
    if (!bucket) {
      bucket = [];
      this.rigPool.set(species, bucket);
    }
    if (bucket.length < 6) {
      bucket.push(rig);
    } else {
      this.disposeCreatureRig(rig);
    }
  }

  public dispose(): void {
    for (const c of this.creatures) {
      this.disposeCreatureRig(c.rig);
    }
    this.creatures.length = 0;
    for (const bucket of this.rigPool.values()) {
      for (const rig of bucket) {
        this.disposeCreatureRig(rig);
      }
    }
    this.rigPool.clear();
    for (const fp of this.footprints) {
      this.scene.remove(fp.mesh);
      (fp.mesh.material as THREE.Material).dispose();
    }
    this.footprints.length = 0;
    for (const mesh of this.footprintMeshPool) {
      (mesh.material as THREE.Material).dispose();
    }
    this.footprintMeshPool.length = 0;
    this.footprintGeo.dispose();
    this.footprintMat.dispose();
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
      ['jungle_fowl', HOMESTEAD_POS.x + 5.5, HOMESTEAD_POS.z + 0.8, 'diurnal'],
      ['jungle_fowl', HOMESTEAD_POS.x + 6.8, HOMESTEAD_POS.z + 3.5, 'diurnal'],
      ['jungle_fowl', 18, 142, 'diurnal'],
      ['rabbit', -32, 120, 'diurnal'],
      ['rabbit', -54, 76, 'diurnal'],
      ['bird', 0, 98, 'diurnal'],
      ['bird', 12, 162, 'diurnal'],
      ['bird', -28, 146, 'diurnal'],
      ['bird', 48, -18, 'diurnal'],
      ['bird', -54, 30, 'diurnal'],
      // Homestead Pasture & Barnyard Animals (anchored cleanly around HOMESTEAD_POS)
      ['cattle', HOMESTEAD_POS.x - 10, HOMESTEAD_POS.z - 10, 'always'],
      ['cattle', HOMESTEAD_POS.x - 18, HOMESTEAD_POS.z - 16, 'always'],
      ['cattle', -82, 36, 'always'],
      ['pig', HOMESTEAD_POS.x + 1.8, HOMESTEAD_POS.z + 6.2, 'always'],
      ['pig', HOMESTEAD_POS.x - 2.4, HOMESTEAD_POS.z + 5.4, 'always'],
      ['horse', HOMESTEAD_POS.x - 7.5, HOMESTEAD_POS.z + 8.5, 'always'],
      ['horse', HOMESTEAD_POS.x - 11.2, HOMESTEAD_POS.z + 6.5, 'always'],
      ['sheep', HOMESTEAD_POS.x - 21, HOMESTEAD_POS.z - 6, 'always'],
      ['sheep', HOMESTEAD_POS.x - 17, HOMESTEAD_POS.z - 2, 'always'],
      ['goat', HOMESTEAD_POS.x + 2.0, HOMESTEAD_POS.z - 1.8, 'always'],
      ['goat', -44, -86, 'always'],
      ['goat', 24, -94, 'always'],
      ['duck', HOMESTEAD_POS.x + 7.8, HOMESTEAD_POS.z - 3.2, 'always'],
      ['duck', HOMESTEAD_POS.x + 9.2, HOMESTEAD_POS.z + 1.2, 'always'],
      ['duck', LAKE_CENTER.x - 2, LAKE_CENTER.z + 18, 'always'],
      ['barn_cat', HOMESTEAD_POS.x - 4.8, HOMESTEAD_POS.z - 1.2, 'always'],
      // Persistent Forest & Savanna Wildlife
      ['wild_boar', 32, 118, 'always'],
      ['wild_boar', -38, 136, 'always'],
      ['deer', -64, 46, 'always'],
      ['deer', 38, 76, 'always'],
      // Aquatic Fish & Dolphins (offshore beyond the 560m coastline)
      ['fish_school', LAKE_CENTER.x, LAKE_CENTER.z, 'always'],
      ['fish_school', 34, 582, 'always'],
      ['dolphin', -62, 592, 'always'],
      ['dolphin', 56, 588, 'always'],
      // Prehistoric Dinosaurs (spread across the expanded island)
      ['parasaurolophus', -58, 20, 'always'],
      ['triceratops', -88, -8, 'always'],
      ['stegosaurus', -42, -38, 'always'],
      ['brachiosaurus', 22, -30, 'always'],
      ['velociraptor', 62, 26, 'always'],
      ['trex', 28, -68, 'always'],
      // Nocturnal Stalkers (emerge from dens at Dusk/Night, retreat at Dawn)
      ['velociraptor', 24, 110, 'nocturnal'],
      ['velociraptor', -44, 66, 'nocturnal'],
      ['velociraptor', -4, 56, 'nocturnal'],
      // 8 Iconic Wild Animals in Dedicated Habitats
      ['grizzly_bear', -8, -44, 'always'],
      ['grizzly_bear', 4, -52, 'always'],
      ['gray_wolf', SNOWY_WOODLAND_POS.x + 2.0, SNOWY_WOODLAND_POS.z + 3.0, 'always'],
      ['gray_wolf', SNOWY_WOODLAND_POS.x - 4.0, SNOWY_WOODLAND_POS.z - 3.5, 'always'],
      ['african_lion', -104, 16, 'always'],
      ['african_lion', -96, -26, 'always'],
      ['bald_eagle', LAKE_CENTER.x, LAKE_CENTER.z, 'always'],
      ['bald_eagle', LAKE_CENTER.x + 10, LAKE_CENTER.z - 10, 'always'],
      ['red_fox', AUTUMN_GROVE_POS.x - 1.5, AUTUMN_GROVE_POS.z + 1.8, 'always'],
      ['red_fox', AUTUMN_GROVE_POS.x + 3.2, AUTUMN_GROVE_POS.z - 2.5, 'always'],
      ['saltwater_crocodile', SWAMP_POS.x, SWAMP_POS.z, 'always'],
      ['saltwater_crocodile', SWAMP_POS.x + 4.5, SWAMP_POS.z + 2.5, 'always'],
      ['bison', -90, 54, 'always'],
      ['bison', -102, 36, 'always'],
      ['great_horned_owl', DEAD_OAK_POS.x + 1.35, DEAD_OAK_POS.z + 0.2, 'always'],
      // Expanded Global Wildlife Showcase (Savanna, Arctic, Jungle, Coast & Prehistoric)
      ['elephant', -118, 30, 'always'],
      ['elephant', -126, 38, 'always'],
      ['giraffe', -110, 48, 'always'],
      ['zebra', -108, 6, 'always'],
      ['zebra', -116, 12, 'always'],
      ['rhinoceros', -132, -10, 'always'],
      ['cheetah', -98, -46, 'always'],
      ['hyena', -80, -54, 'always'],
      ['reindeer', SNOWY_WOODLAND_POS.x - 8, SNOWY_WOODLAND_POS.z + 6, 'always'],
      ['reindeer', SNOWY_WOODLAND_POS.x + 9, SNOWY_WOODLAND_POS.z - 5, 'always'],
      ['moose', SNOWY_WOODLAND_POS.x + 16, SNOWY_WOODLAND_POS.z + 10, 'always'],
      ['polar_bear', SNOWY_WOODLAND_POS.x - 12, SNOWY_WOODLAND_POS.z - 10, 'always'],
      ['penguin', SNOWY_WOODLAND_POS.x + 4, SNOWY_WOODLAND_POS.z + 14, 'always'],
      ['penguin', SNOWY_WOODLAND_POS.x + 7, SNOWY_WOODLAND_POS.z + 16, 'always'],
      ['tiger', 72, -28, 'always'],
      ['gorilla', 84, 38, 'always'],
      ['kangaroo', -78, 122, 'always'],
      ['camel', 88, 124, 'always'],
      ['ostrich', -88, 102, 'always'],
      ['flamingo', SWAMP_POS.x - 9, SWAMP_POS.z + 8, 'always'],
      ['flamingo', LAKE_CENTER.x - 18, LAKE_CENTER.z + 14, 'always'],
      ['hippopotamus', LAKE_CENTER.x + 16, LAKE_CENTER.z - 12, 'always'],
      ['toucan', 58, 56, 'diurnal'],
      ['peregrine_falcon', -34, -76, 'diurnal'],
      ['pteranodon', 48, -42, 'always'],
      ['pteranodon', -60, -60, 'always'],
      ['spinosaurus', SWAMP_POS.x - 11, SWAMP_POS.z - 10, 'always'],
      ['ankylosaurus', -64, -48, 'always'],
      ['allosaurus', 68, -58, 'always'],
      ['dilophosaurus', 48, 8, 'always'],
      ['diplodocus', 12, -54, 'always'],
      ['sea_turtle', -28, 578, 'always'],
      ['great_white_shark', 86, 596, 'always'],
      ['manta_ray', -92, 588, 'always'],
      // Wide Expanded Marine Wildlife Ecosystem Population around the 560m coastline
      ['dolphin', -290, 515, 'always'],
      ['dolphin', 290, -515, 'always'],
      ['dolphin', -515, -290, 'always'],
      ['dolphin', 515, 290, 'always'],
      ['great_white_shark', -420, 440, 'always'],
      ['great_white_shark', 440, -420, 'always'],
      ['sea_turtle', -430, -430, 'always'],
      ['sea_turtle', 430, 430, 'always'],
      ['manta_ray', -525, 145, 'always'],
      ['manta_ray', 145, -525, 'always'],
      ['fish_school', -390, -390, 'always'],
      ['fish_school', 390, 390, 'always'],
      ['fish_school', -595, 0, 'always'],
      ['fish_school', 595, 0, 'always'],
      // Curated Biome Spec Encounters (Bees, Creaking, White Foxes, Parrots, Ocelots, Pandas, Dark Forest Prowlers)
      ['bee', 24, 120, 'diurnal'],
      ['bee', 44, 130, 'diurnal'],
      ['bee', 14, 110, 'diurnal'],
      ['bee', 42, 70, 'diurnal'],
      ['bee', 38, 30, 'diurnal'],
      ['creaking', 98, -16, 'nocturnal'],
      ['creaking', 112, -6, 'nocturnal'],
      ['creaking', 102, 10, 'nocturnal'],
      ['white_fox', -64, -118, 'always'],
      ['white_fox', -22, -124, 'always'],
      ['parrot', 116, 60, 'diurnal'],
      ['parrot', 132, 76, 'diurnal'],
      ['parrot', 92, 118, 'diurnal'],
      ['parrot', 82, 54, 'diurnal'],
      ['ocelot', 118, 70, 'always'],
      ['ocelot', 88, 110, 'always'],
      ['ocelot', 78, 60, 'always'],
      ['panda', 74, 48, 'always'],
      ['panda', 88, 58, 'always'],
      ['panda', 82, 38, 'always'],
      ['panda', 116, 82, 'always'],
      ['gray_wolf', 32, -20, 'always'],
      ['velociraptor', 46, -10, 'always'],
      ['dilophosaurus', 28, -4, 'always'],
      // Curated Spawns for the 14 New Expansion Biomes
      // Plains & Sunflower Plains: Horses, Pigs, Sheep, Cows, Chickens
      ['horse', PLAINS_VILLAGE_POS.x + 14, PLAINS_VILLAGE_POS.z + 10, 'always'],
      ['cattle', PLAINS_VILLAGE_POS.x - 12, PLAINS_VILLAGE_POS.z + 14, 'always'],
      ['sheep', PLAINS_VILLAGE_POS.x + 10, PLAINS_VILLAGE_POS.z - 12, 'always'],
      ['pig', PLAINS_VILLAGE_POS.x - 14, PLAINS_VILLAGE_POS.z - 10, 'always'],
      ['horse', SUNFLOWER_VILLAGE_POS.x + 14, SUNFLOWER_VILLAGE_POS.z - 8, 'always'],
      ['jungle_fowl', SUNFLOWER_VILLAGE_POS.x - 10, SUNFLOWER_VILLAGE_POS.z + 10, 'diurnal'],
      // Meadow: Bees, Sheep, Rabbits, Horses
      ['bee', MEADOW_OUTPOST_POS.x + 16, MEADOW_OUTPOST_POS.z + 12, 'diurnal'],
      ['sheep', MEADOW_OUTPOST_POS.x - 14, MEADOW_OUTPOST_POS.z + 14, 'always'],
      ['rabbit', MEADOW_OUTPOST_POS.x + 12, MEADOW_OUTPOST_POS.z - 14, 'diurnal'],
      // Cherry Grove: Bees, Pigs, Sheep, Rabbits
      ['bee', CHERRY_GROVE_POS.x + 6, CHERRY_GROVE_POS.z + 8, 'diurnal'],
      ['bee', CHERRY_GROVE_POS.x - 8, CHERRY_GROVE_POS.z - 6, 'diurnal'],
      ['pig', CHERRY_GROVE_POS.x + 10, CHERRY_GROVE_POS.z - 10, 'always'],
      ['sheep', CHERRY_GROVE_POS.x - 12, CHERRY_GROVE_POS.z + 8, 'always'],
      ['rabbit', CHERRY_GROVE_POS.x + 2, CHERRY_GROVE_POS.z + 14, 'diurnal'],
      // Snowy Plains & Ice Spikes: Polar Bears, Rabbits, White Foxes
      ['polar_bear', SNOWY_PLAINS_OUTPOST_POS.x - 16, SNOWY_PLAINS_OUTPOST_POS.z + 14, 'always'],
      ['rabbit', SNOWY_PLAINS_OUTPOST_POS.x + 14, SNOWY_PLAINS_OUTPOST_POS.z + 12, 'diurnal'],
      ['polar_bear', ICE_SPIKES_POS.x + 10, ICE_SPIKES_POS.z + 12, 'always'],
      ['rabbit', ICE_SPIKES_POS.x - 12, ICE_SPIKES_POS.z - 8, 'diurnal'],
      // Grove: Wolves, Foxes, Rabbits
      ['gray_wolf', GROVE_OUTPOST_POS.x + 14, GROVE_OUTPOST_POS.z + 10, 'always'],
      ['white_fox', GROVE_OUTPOST_POS.x - 12, GROVE_OUTPOST_POS.z + 12, 'always'],
      // Snowy Slopes, Jagged Peaks, Frozen Peaks, Stony Peaks: Mountain Goats
      ['goat', SNOWY_SLOPES_IGLOO_POS.x + 10, SNOWY_SLOPES_IGLOO_POS.z + 8, 'always'],
      ['goat', JAGGED_PEAKS_POS.x + 12, JAGGED_PEAKS_POS.z + 12, 'always'],
      ['goat', FROZEN_PEAKS_POS.x - 12, FROZEN_PEAKS_POS.z + 10, 'always'],
      ['goat', STONY_PEAKS_POS.x - 12, STONY_PEAKS_POS.z + 10, 'always'],
      // Windswept Hills, Gravelly Hills & Forest: Goats, Wolves, Passive farm animals
      ['goat', -185, -75, 'always'],
      ['gray_wolf', -165, -20, 'always'],
      ['sheep', -178, -42, 'always'],
      // Curated Spawns for the 2x Mega-Island 17 New Biomes
      // Desert: Camels (in Desert Village), Cream Rabbits, Desert Pyramid prowlers
      ['camel', DESERT_VILLAGE_POS.x + 12, DESERT_VILLAGE_POS.z + 8, 'always'],
      ['camel', DESERT_VILLAGE_POS.x - 10, DESERT_VILLAGE_POS.z + 12, 'always'],
      ['rabbit', DESERT_PYRAMID_POS.x + 16, DESERT_PYRAMID_POS.z + 10, 'diurnal'],
      // Savanna, Savanna Plateau & Windswept Savanna: Horses, Goats/Llamas, Passive livestock
      ['horse', SAVANNA_VILLAGE_POS.x + 14, SAVANNA_VILLAGE_POS.z + 10, 'always'],
      ['goat', SAVANNA_PLATEAU_POS.x + 12, SAVANNA_PLATEAU_POS.z + 12, 'always'],
      ['horse', WINDSWEPT_SAVANNA_POS.x - 10, WINDSWEPT_SAVANNA_POS.z + 12, 'always'],
      // Badlands, Wooded Badlands & Eroded Badlands
      ['rabbit', BADLANDS_MINESHAFT_POS.x + 14, BADLANDS_MINESHAFT_POS.z + 10, 'diurnal'],
      ['goat', WOODED_BADLANDS_POS.x + 12, WOODED_BADLANDS_POS.z - 10, 'always'],
      ['rabbit', ERODED_BADLANDS_POS.x - 12, ERODED_BADLANDS_POS.z + 10, 'diurnal'],
      // Swamp & Mangrove Swamp: Witch at Swamp Hut, Crocodiles, Ducks
      ['witch', SWAMP_HUT_POS.x + 6, SWAMP_HUT_POS.z + 6, 'always'],
      ['saltwater_crocodile', SWAMP_HUT_POS.x - 14, SWAMP_HUT_POS.z + 12, 'always'],
      ['duck', MANGROVE_SWAMP_POS.x + 10, MANGROVE_SWAMP_POS.z + 8, 'always'],
      ['saltwater_crocodile', MANGROVE_SWAMP_POS.x - 12, MANGROVE_SWAMP_POS.z - 8, 'always'],
      // Mushroom Fields: Peaceful Mooshrooms / Cattle ONLY (zero hostiles!)
      ['cattle', MUSHROOM_FIELDS_POS.x + 10, MUSHROOM_FIELDS_POS.z + 12, 'always'],
      ['cattle', MUSHROOM_FIELDS_POS.x - 12, MUSHROOM_FIELDS_POS.z + 8, 'always'],
      ['cattle', MUSHROOM_FIELDS_POS.x + 6, MUSHROOM_FIELDS_POS.z - 14, 'always'],
      // Warm Ocean Coral Reefs & Frozen Ocean Icebergs
      ['dolphin', CORAL_REEF_POS.x + 10, CORAL_REEF_POS.z + 12, 'always'],
      ['sea_turtle', CORAL_REEF_POS.x - 12, CORAL_REEF_POS.z + 8, 'always'],
      ['fish_school', CORAL_REEF_POS.x, CORAL_REEF_POS.z - 6, 'always'],
      ['polar_bear', FROZEN_OCEAN_ICEBERG_POS.x, FROZEN_OCEAN_ICEBERG_POS.z + 35, 'always'],
      // Spread-out Dead-Spot Wildlife Fill (Western/Southern/Eastern/Northern corridors & new Rapids Riverbanks)
      ['deer', -195, 42, 'always'],
      ['horse', -255, 95, 'always'],
      ['zebra', -310, 145, 'always'],
      ['giraffe', -340, 20, 'always'],
      ['elephant', -365, -45, 'always'],
      ['camel', -325, 255, 'always'],
      ['ostrich', -270, 295, 'always'],
      ['kangaroo', -145, 345, 'always'],
      ['duck', -115, 290, 'always'],
      ['flamingo', -158, 412, 'always'],
      ['bison', -65, 320, 'always'],
      ['horse', -35, 395, 'always'],
      ['sheep', 48, 355, 'always'],
      ['cattle', 95, 310, 'always'],
      ['pig', 145, 245, 'always'],
      ['wild_boar', 225, 215, 'always'],
      ['goat', 295, 320, 'always'],
      ['red_fox', 245, 115, 'always'],
      ['duck', 310, -15, 'always'],
      ['hippopotamus', 385, 28, 'always'],
      ['flamingo', 425, 45, 'always'],
      ['deer', 215, -65, 'always'],
      ['bee', 185, -35, 'diurnal'],
      ['reindeer', 145, -245, 'always'],
      ['moose', 65, -310, 'always'],
      ['polar_bear', -45, -345, 'always'],
      ['white_fox', -165, -295, 'always'],
      ['gray_wolf', -255, -215, 'always'],
      ['triceratops', -225, 185, 'always'],
      ['parasaurolophus', 165, 175, 'always'],
      ['bald_eagle', -160, -15, 'always'],
      ['bald_eagle', 260, -24, 'always'],
    ];

    spawns.forEach(([species, x, z, spawnCycle], i) => {
      const spec = SPECIES_SPECS[species];
      const rig = createCreatureModel(species);

      // Exact perched placements: Tabby Barn Cat on hay bales, Nigerian Dwarf Goat on crate, Great Horned Owl on dead oak branch
      let perch: ActiveCreature['perch'];
      if (
        species === 'barn_cat' &&
        Math.hypot(x - (HOMESTEAD_POS.x - 4.8), z - (HOMESTEAD_POS.z - 1.2)) < 1
      ) {
        const barnBaseY = getTerrainHeight(HOMESTEAD_POS.x - 4.5, HOMESTEAD_POS.z);
        perch = {
          x: HOMESTEAD_POS.x - 4.8,
          y: barnBaseY + 1.4,
          z: HOMESTEAD_POS.z - 1.2,
          yaw: 1.28,
          mode: 'sit',
        };
      } else if (
        species === 'goat' &&
        Math.hypot(x - (HOMESTEAD_POS.x + 2.0), z - (HOMESTEAD_POS.z - 1.8)) < 1
      ) {
        perch = {
          x: HOMESTEAD_POS.x + 2.0,
          y: getTerrainHeight(HOMESTEAD_POS.x + 2.0, HOMESTEAD_POS.z - 1.8) + 0.68,
          z: HOMESTEAD_POS.z - 1.8,
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
      const isMarine =
        species === 'dolphin' ||
        species === 'fish_school' ||
        species === 'sea_turtle' ||
        species === 'great_white_shark' ||
        species === 'manta_ray';
      const isAerialSoarer =
        species === 'bald_eagle' ||
        species === 'peregrine_falcon' ||
        species === 'pteranodon';
      const isAerialFlier = species === 'bird' || species === 'toucan';
      const y = perch
        ? perch.y
        : species === 'dolphin'
          ? OCEAN_LEVEL - 0.15
          : species === 'sea_turtle' || species === 'great_white_shark' || species === 'manta_ray'
            ? OCEAN_LEVEL - 0.48
            : species === 'bee'
              ? Math.max(OCEAN_LEVEL + 1.5, getTerrainHeight(x, z) + 2.2)
              : species === 'parrot'
                ? Math.max(OCEAN_LEVEL + 7.5, getTerrainHeight(x, z) + 8.5)
                : isAerialFlier
                  ? 24 + (i % 3) * 5
                  : isAerialSoarer
                    ? 19 + (i % 3) * 3.2
                    : species === 'saltwater_crocodile' && dSwamp < SWAMP_POS.radius
                      ? SWAMP_POS.waterY - 0.24
                      : species === 'fish_school'
                        ? Math.hypot(x - LAKE_CENTER.x, z - LAKE_CENTER.z) < 25
                          ? LAKE_CENTER.waterY - 0.55
                          : OCEAN_LEVEL - 0.45
                        : Math.max(getTerrainHeight(x, z), getLandmarkFloorY(x, z, 999)) +
                          (species === 'vex' ? 1.15 : 0);
      rig.root.position.set(x, y, z);
      const initialActive = spawnCycle !== 'nocturnal';
      rig.root.visible = initialActive;
      const zoneArmor = getCreatureDefaultArmor(species, false);
      attachCreatureArmorPlates(rig, species, zoneArmor);
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
          : isMarine
            ? 'swim'
            : 'wander',
        stateTimer: 3 + Math.random() * 4,
        attackCooldown: 0,
        provokedTimer: 0,
        snaredTimer: 0,
        stunTimer: 0,
        blindTimer: 0,
        zoneArmor,
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

    // Armored Obsidian Cave Boss patrolling underneath the collapsible cavern stalactites!
    const bossSpec = SPECIES_SPECS['trex'];
    const bossRig = createCreatureModel('trex');
    bossRig.root.scale.setScalar(1.22);
    const bossX = CAVE_POS.x;
    const bossZ = CAVE_POS.z + 1.2;
    const bossY = getTerrainHeight(bossX, bossZ);
    const bossArmor = getCreatureDefaultArmor('trex', true);
    attachCreatureArmorPlates(bossRig, 'trex', bossArmor);
    bossRig.root.position.set(bossX, bossY, bossZ);
    this.scene.add(bossRig.root);
    this.creatures.push({
      id: 'boss_obsidian_cavern_titan',
      species: 'trex',
      spec: {
        ...bossSpec,
        displayName: 'Obsidian Cave Titan',
        maxHp: 380,
        attackDamage: 24,
        attackRange: 3.4,
        walkSpeed: 2.2,
        chaseSpeed: 6.2,
      },
      rig: bossRig,
      x: bossX,
      y: bossY,
      z: bossZ,
      yaw: 0.1,
      homeX: bossX,
      homeZ: bossZ,
      targetX: bossX,
      targetZ: bossZ,
      hp: 380,
      maxHp: 380,
      alive: true,
      spawnCycle: 'always',
      cycleActive: true,
      respawnTimer: 0,
      state: 'idle',
      stateTimer: 4,
      attackCooldown: 0,
      provokedTimer: 0,
      snaredTimer: 0,
      stunTimer: 0,
      blindTimer: 0,
      isBoss: true,
      displayNameOverride: 'Obsidian Cave Titan',
      zoneArmor: bossArmor,
      stepAccum: 0,
      callCooldown: 6,
      leapPhase: 0,
      leaping: false,
      swoopOffsetAngle: 0,
      feedTimer: 0,
      startledTimer: 0,
      velY: 0,
    });
  }

  private disposeCreatureRig(rig: CreatureRig): void {
    this.scene.remove(rig.root);
    rig.root.traverse((obj) => {
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

  public spawnWildAnimalAt(
    species: CreatureSpecies,
    x: number,
    z: number,
    options?: { summonedMinion?: boolean; homeX?: number; homeZ?: number },
  ): void {
    const spec = SPECIES_SPECS[species];
    if (!spec) return;
    const rig = this.acquireWildRig(species);
    const isMarine =
      species === 'dolphin' ||
      species === 'fish_school' ||
      species === 'sea_turtle' ||
      species === 'great_white_shark' ||
      species === 'manta_ray';
    const isAerial =
      species === 'bird' ||
      species === 'toucan' ||
      species === 'bald_eagle' ||
      species === 'peregrine_falcon' ||
      species === 'pteranodon' ||
      species === 'parrot' ||
      species === 'bee';
    const y = isMarine
      ? species === 'dolphin'
        ? OCEAN_LEVEL - 0.15
        : OCEAN_LEVEL - 0.48
      : species === 'bee'
        ? Math.max(OCEAN_LEVEL + 1.6, getTerrainHeight(x, z) + 2.1)
        : species === 'parrot'
          ? Math.max(OCEAN_LEVEL + 7.5, getTerrainHeight(x, z) + 8.5)
          : isAerial
            ? Math.max(OCEAN_LEVEL + 16, getTerrainHeight(x, z) + 16)
            : Math.max(getTerrainHeight(x, z), getLandmarkFloorY(x, z, 999)) +
              (species === 'vex' ? 1.15 : 0);
    rig.root.position.set(x, y, z);
    rig.root.visible = this.overworldActive;
    const zoneArmor = getCreatureDefaultArmor(species, false);
    attachCreatureArmorPlates(rig, species, zoneArmor);
    this.scene.add(rig.root);

    this.creatures.push({
      id: `wild_${species}_${++this.dynamicSeq}`,
      species,
      spec,
      rig,
      x,
      y,
      z,
      yaw: Math.random() * Math.PI * 2,
      homeX: options?.homeX ?? x,
      homeZ: options?.homeZ ?? z,
      targetX: x + (Math.random() - 0.5) * 14,
      targetZ: z + (Math.random() - 0.5) * 14,
      hp: spec.maxHp,
      maxHp: spec.maxHp,
      alive: true,
      spawnCycle: species === 'creaking' ? 'nocturnal' : 'always',
      cycleActive: true,
      respawnTimer: 0,
      state: isMarine ? 'swim' : 'wander',
      stateTimer: 3 + Math.random() * 4,
      attackCooldown: 0,
      provokedTimer: 0,
      snaredTimer: 0,
      stunTimer: 0,
      blindTimer: 0,
      zoneArmor,
      stepAccum: 0,
      callCooldown: 5 + Math.random() * 10,
      leapPhase: 0,
      leaping: false,
      swoopOffsetAngle: Math.random() * Math.PI * 2,
      feedTimer: 0,
      startledTimer: 0,
      velY: 0,
      summonedMinion: options?.summonedMinion,
    });
  }

  public spawnGuardianBosses(): void {
    const bossDefs: {
      species: CreatureSpecies;
      name: string;
      x: number;
      z: number;
      hp: number;
      scale: number;
    }[] = [
      {
        species: 'trex',
        name: 'Apex Rex Sovereign',
        x: AUTUMN_GROVE_POS.x,
        z: AUTUMN_GROVE_POS.z,
        hp: 850,
        scale: 1.6,
      },
      {
        species: 'spinosaurus',
        name: 'Spinosaurus River Titan',
        x: SWAMP_POS.x,
        z: SWAMP_POS.z,
        hp: 750,
        scale: 1.45,
      },
      {
        species: 'triceratops',
        name: 'Ancient Horned Juggernaut',
        x: HOMESTEAD_POS.x + 35,
        z: HOMESTEAD_POS.z + 40,
        hp: 680,
        scale: 1.45,
      },
      {
        species: 'velociraptor',
        name: 'Obsidian Cave Megaraptor',
        x: CAVE_POS.x,
        z: CAVE_POS.z,
        hp: 550,
        scale: 1.4,
      },
    ];

    for (const b of bossDefs) {
      const spec = SPECIES_SPECS[b.species];
      const rig = createCreatureModel(b.species);
      const y = getTerrainHeight(b.x, b.z);
      rig.root.position.set(b.x, y, b.z);
      rig.root.scale.multiplyScalar(b.scale);
      rig.root.visible = true;
      const zoneArmor = getCreatureDefaultArmor(b.species, true);
      attachCreatureArmorPlates(rig, b.species, zoneArmor);
      this.scene.add(rig.root);

      this.creatures.push({
        id: `boss_${b.species}_${++this.dynamicSeq}`,
        species: b.species,
        spec,
        rig,
        x: b.x,
        y,
        z: b.z,
        yaw: 0,
        homeX: b.x,
        homeZ: b.z,
        targetX: b.x,
        targetZ: b.z,
        hp: b.hp,
        maxHp: b.hp,
        alive: true,
        spawnCycle: 'always',
        cycleActive: true,
        respawnTimer: 0,
        state: 'idle',
        stateTimer: 3,
        attackCooldown: 0,
        provokedTimer: 0,
        snaredTimer: 0,
        stunTimer: 0,
        blindTimer: 0,
        isBoss: true,
        displayNameOverride: b.name,
        zoneArmor,
        stepAccum: 0,
        callCooldown: 5,
        leapPhase: 0,
        leaping: false,
        swoopOffsetAngle: 0,
        feedTimer: 0,
        startledTimer: 0,
        velY: 0,
      });
    }
  }

  public spawnRedDragonBoss(x: number, z: number): ActiveCreature | null {
    const existing = this.creatures.find((c) => c.id === 'boss_red_dragon');
    if (existing) {
      if (!existing.alive) {
        return existing;
      }
      existing.x = x;
      existing.z = z;
      existing.y = getTerrainHeight(x, z);
      existing.homeX = x;
      existing.homeZ = z;
      existing.rig.root.position.set(existing.x, existing.y, existing.z);
      existing.rig.root.visible = true;
      return existing;
    }

    const spec = SPECIES_SPECS['trex'];
    const rig = createCreatureModel('trex');
    const y = getTerrainHeight(x, z);
    rig.root.scale.setScalar(1.75);
    rig.root.position.set(x, y, z);
    rig.root.visible = true;
    // Tint body meshes deep crimson-scarlet for the Red Dragon Boss
    rig.root.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.material && !Array.isArray(obj.material)) {
        const mat = obj.material as THREE.MeshStandardMaterial;
        if (mat.color) {
          const cloned = mat.clone();
          cloned.color.setHex(0xb91c1c);
          if ('emissive' in cloned && cloned.emissive) {
            cloned.emissive.setHex(0x7f1d1d);
            cloned.emissiveIntensity = 0.45;
          }
          obj.material = cloned;
        }
      }
    });
    const zoneArmor = getCreatureDefaultArmor('trex', true);
    attachCreatureArmorPlates(rig, 'trex', zoneArmor);
    this.scene.add(rig.root);

    const dragonBoss: ActiveCreature = {
      id: 'boss_red_dragon',
      species: 'trex',
      spec: {
        ...spec,
        displayName: 'Red Dragon Boss',
        maxHp: 1000,
        attackDamage: 28,
        attackRange: 4.2,
        walkSpeed: 3.0,
        chaseSpeed: 7.4,
        aggroRadius: 34,
        drops: [
          { itemId: 'dino_meat', min: 6, max: 10 },
          { itemId: 'emerald', min: 3, max: 5 },
          { itemId: 'totem_of_undying', min: 1, max: 1 },
        ],
      },
      rig,
      x,
      y,
      z,
      yaw: 0,
      homeX: x,
      homeZ: z,
      targetX: x,
      targetZ: z,
      hp: 1000,
      maxHp: 1000,
      alive: true,
      spawnCycle: 'always',
      cycleActive: true,
      respawnTimer: 0,
      state: 'idle',
      stateTimer: 3,
      attackCooldown: 0,
      provokedTimer: 0,
      snaredTimer: 0,
      stunTimer: 0,
      blindTimer: 0,
      isBoss: true,
      displayNameOverride: 'Red Dragon Boss',
      zoneArmor,
      stepAccum: 0,
      callCooldown: 4,
      leapPhase: 0,
      leaping: false,
      swoopOffsetAngle: 0,
      feedTimer: 0,
      startledTimer: 0,
      velY: 0,
    };
    this.creatures.push(dragonBoss);
    return dragonBoss;
  }

  public spawnCaveMonsterBoss(x: number, z: number): ActiveCreature | null {
    const existing = this.creatures.find((c) => c.id === 'boss_cave_monster');
    if (existing) {
      return existing;
    }
    const spec = SPECIES_SPECS['allosaurus'];
    const rig = createCreatureModel('allosaurus');
    const y = getTerrainHeight(x, z);
    rig.root.scale.setScalar(1.38);
    rig.root.position.set(x, y, z);
    rig.root.visible = true;
    const zoneArmor = getCreatureDefaultArmor('allosaurus', true);
    attachCreatureArmorPlates(rig, 'allosaurus', zoneArmor);
    this.scene.add(rig.root);

    const boss: ActiveCreature = {
      id: 'boss_cave_monster',
      species: 'allosaurus',
      spec: {
        ...spec,
        displayName: 'Cavern Monster Boss',
        maxHp: 560,
        attackDamage: 22,
        attackRange: 3.4,
        walkSpeed: 2.5,
        chaseSpeed: 6.8,
        aggroRadius: 28,
      },
      rig,
      x,
      y,
      z,
      yaw: 0,
      homeX: x,
      homeZ: z,
      targetX: x,
      targetZ: z,
      hp: 560,
      maxHp: 560,
      alive: true,
      spawnCycle: 'always',
      cycleActive: true,
      respawnTimer: 0,
      state: 'idle',
      stateTimer: 3,
      attackCooldown: 0,
      provokedTimer: 0,
      snaredTimer: 0,
      stunTimer: 0,
      blindTimer: 0,
      isBoss: true,
      displayNameOverride: 'Cavern Monster Boss',
      zoneArmor,
      stepAccum: 0,
      callCooldown: 5,
      leapPhase: 0,
      leaping: false,
      swoopOffsetAngle: 0,
      feedTimer: 0,
      startledTimer: 0,
      velY: 0,
    };
    this.creatures.push(boss);
    return boss;
  }

  public syncArmorVisuals(creature: ActiveCreature): void {
    const groups = creature.rig.armorGroups;
    if (!groups) return;
    groups.head.visible =
      creature.zoneArmor.head.tier !== 'none' && creature.zoneArmor.head.hp > 0;
    groups.chest.visible =
      creature.zoneArmor.chest.tier !== 'none' && creature.zoneArmor.chest.hp > 0;
    const limbVisible =
      creature.zoneArmor.limb.tier !== 'none' && creature.zoneArmor.limb.hp > 0;
    groups.limb.visible = limbVisible;
    for (let i = 0; i < 2; i++) {
      const g = groups.limb.userData[`leg_${i}`] as THREE.Object3D | undefined;
      if (g) g.visible = limbVisible;
    }
  }

  public blindCreature(
    creature: ActiveCreature,
    seconds: number,
    attackerX?: number,
    attackerZ?: number,
    shoveDist = 0,
  ): void {
    if (!creature.alive) return;
    creature.blindTimer = Math.max(creature.blindTimer, seconds);
    creature.attackCooldown = Math.max(creature.attackCooldown, 1.4);
    if (shoveDist > 0 && attackerX !== undefined && attackerZ !== undefined) {
      const dx = creature.x - attackerX;
      const dz = creature.z - attackerZ;
      const d = Math.hypot(dx, dz) || 1;
      creature.x += (dx / d) * shoveDist;
      creature.z += (dz / d) * shoveDist;
    }
  }

  public shatterAllArmor(creature: ActiveCreature): ArmorMaterialTier[] {
    const broken: ArmorMaterialTier[] = [];
    (['head', 'chest', 'limb'] as BodyZone[]).forEach((z) => {
      const st = creature.zoneArmor[z];
      if (st.tier !== 'none' && st.hp > 0) {
        broken.push(st.tier);
        st.hp = 0;
        st.tier = 'none';
      }
    });
    this.syncArmorVisuals(creature);
    return broken;
  }

  public applyZoneArmorDamage(
    creature: ActiveCreature,
    zone: BodyZone,
    hpDamage: number,
    armorDamage: number,
    attackerX: number,
    attackerZ: number,
    options?: { snareSeconds?: number; stunSeconds?: number; knockback?: number },
  ): {
    killed: boolean;
    drops: { itemId: ItemId; quantity: number }[];
    shatteredZone: BodyZone | null;
    shatteredTier: ArmorMaterialTier;
  } {
    let shatteredZone: BodyZone | null = null;
    let shatteredTier: ArmorMaterialTier = 'none';

    const za = creature.zoneArmor[zone];
    if (za.tier !== 'none' && za.hp > 0 && armorDamage > 0) {
      const prevTier = za.tier;
      za.hp = Math.max(0, za.hp - armorDamage);
      if (za.hp <= 0) {
        za.tier = 'none';
        shatteredZone = zone;
        shatteredTier = prevTier;
        this.syncArmorVisuals(creature);
      }
    }

    const res = this.damageCreature(
      creature,
      hpDamage,
      attackerX,
      attackerZ,
      options,
    );
    return {
      ...res,
      shatteredZone,
      shatteredTier,
    };
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
      const kbScale = creature.isBoss ? 0.35 : 1.0;
      creature.x += (dx / d) * options.knockback * kbScale;
      creature.z += (dz / d) * options.knockback * kbScale;
    }

    if (creature.hp <= 0) {
      creature.alive = false;
      creature.respawnTimer = creature.summonedMinion
        ? 999999
        : creature.isBoss
          ? 35
          : creature.species === 'evoker' ||
              creature.species === 'witch' ||
              creature.species === 'pillager' ||
              creature.species === 'vex'
            ? 45
            : 8 + Math.random() * 4;
      creature.rig.root.visible = false;

      const drops = creature.spec.drops
        .filter((d) => !(creature.summonedMinion && d.itemId === 'totem_of_undying'))
        .map((d) => ({
          itemId: d.itemId,
          quantity: d.min + Math.floor(Math.random() * (d.max - d.min + 1)),
        }));
      if (creature.isBoss) {
        drops.push({ itemId: 'metal_ore', quantity: 6 });
        drops.push({ itemId: 'stone', quantity: 8 });
      }
      return { killed: true, drops };
    }

    const isIllagerHostile =
      creature.species === 'vex' ||
      creature.species === 'evoker' ||
      creature.species === 'pillager' ||
      creature.species === 'witch';
    if (creature.spec.temperament === 'aerial_ambient') {
      creature.startledTimer = 5.0;
      creature.feedCarcassId = undefined;
      creature.state = 'takeoff';
    } else if (creature.isBoss || isIllagerHostile) {
      creature.perch = undefined;
      creature.provokedTimer = 18;
      creature.state = 'chase';
      creature.targetX = attackerX;
      creature.targetZ = attackerZ;
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
    let mesh = this.footprintMeshPool.pop();
    if (!mesh) {
      mesh = new THREE.Mesh(this.footprintGeo, this.footprintMat.clone());
    }
    const mat = mesh.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.42;
    mesh.visible = true;
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

  public alertGunshot(
    originX: number,
    originZ: number,
    radius = GUNSHOT_FLEE_DISTANCE,
  ): void {
    for (const c of this.creatures) {
      if (!c.alive || !c.cycleActive || c.isBoss || c.tamed || c.mounted) {
        continue;
      }
      if (
        c.spec.temperament === 'aquatic_school' ||
        c.spec.temperament === 'friendly_marine'
      ) {
        continue;
      }
      const dx = c.x - originX;
      const dz = c.z - originZ;
      const d = Math.hypot(dx, dz);
      if (d >= radius) continue;

      if (c.spec.temperament === 'aerial_ambient') {
        c.startledTimer = 5.0;
        c.feedCarcassId = undefined;
        if (c.species === 'bird' || c.species === 'toucan') {
          c.state = 'takeoff';
          c.velY = 6.5;
        }
        continue;
      }

      c.perch = undefined;
      c.feedCarcassId = undefined;
      c.provokedTimer = 0;
      c.state = 'flee';
      c.stateTimer = 5.0;
      const inv = d > 0.01 ? 1 / d : 1;
      const nx = d > 0.01 ? dx * inv : Math.cos(Math.random() * Math.PI * 2);
      const nz = d > 0.01 ? dz * inv : Math.sin(Math.random() * Math.PI * 2);
      c.targetX = c.x + nx * 28;
      c.targetZ = c.z + nz * 28;
    }
  }

  public setOverworldActive(active: boolean): void {
    if (this.overworldActive === active) return;
    this.overworldActive = active;
    for (const c of this.creatures) {
      c.rig.root.visible = active && c.alive && c.cycleActive;
    }
    for (const fp of this.footprints) {
      fp.mesh.visible = active;
    }
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
    if (!this.overworldActive) {
      return { nocturnalActiveCount: 0 };
    }
    for (let i = this.footprints.length - 1; i >= 0; i--) {
      const fp = this.footprints[i];
      fp.life -= dt;
      if (fp.life <= 0) {
        fp.mesh.visible = false;
        this.scene.remove(fp.mesh);
        if (this.footprintMeshPool.length < 48) {
          this.footprintMeshPool.push(fp.mesh);
        } else {
          (fp.mesh.material as THREE.Material).dispose();
        }
        this.footprints.splice(i, 1);
      } else {
        (fp.mesh.material as THREE.MeshBasicMaterial).opacity =
          Math.min(0.42, fp.life * 0.03);
      }
    }

    this.sightingsScratch.length = 0;
    const sightings = this.sightingsScratch;
    this.sightingEmitTimer += dt;
    // Combined stealth & visibility factor: crouching in darkness makes player much harder to spot
    const stealthMult =
      (0.36 + 0.84 * playerVisibility) *
      (playerCrouching ? 0.68 : playerSprinting ? 1.18 : 1.0);
    this.updateFrameParity = (this.updateFrameParity + 1) & 1;
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
          c.stunTimer = 0;
          c.blindTimer = 0;
          c.zoneArmor = getCreatureDefaultArmor(c.species, Boolean(c.isBoss));
          this.syncArmorVisuals(c);
          const isStaticPerch = Boolean(c.perch);
          const isIllagerRespawn =
            c.species === 'vex' ||
            c.species === 'evoker' ||
            c.species === 'pillager' ||
            c.species === 'witch';
          const respawnJitter = isStaticPerch ? 0 : c.isBoss ? 2 : isIllagerRespawn ? 1.5 : 10;
          c.x = c.homeX + (Math.random() - 0.5) * respawnJitter;
          c.z = c.homeZ + (Math.random() - 0.5) * respawnJitter;
          c.y =
            c.species === 'dolphin'
              ? OCEAN_LEVEL - 0.15
              : c.species === 'sea_turtle' ||
                  c.species === 'great_white_shark' ||
                  c.species === 'manta_ray'
                ? OCEAN_LEVEL - 0.48
                : c.species === 'bird' || c.species === 'toucan'
                  ? 24 + (i % 3) * 5
                  : c.species === 'bald_eagle' ||
                      c.species === 'peregrine_falcon' ||
                      c.species === 'pteranodon'
                    ? 19 + (i % 3) * 3.2
                    : c.species === 'fish_school'
                      ? Math.hypot(c.homeX - LAKE_CENTER.x, c.homeZ - LAKE_CENTER.z) < 25
                        ? LAKE_CENTER.waterY - 0.55
                        : OCEAN_LEVEL - 0.45
                      : c.species === 'great_horned_owl'
                        ? getTerrainHeight(DEAD_OAK_POS.x, DEAD_OAK_POS.z) + 3.25
                        : Math.max(getTerrainHeight(c.x, c.z), getLandmarkFloorY(c.x, c.z, 999)) +
                          (c.species === 'vex' ? 1.15 : 0);
          c.state =
            c.species === 'dolphin' ||
            c.species === 'fish_school' ||
            c.species === 'sea_turtle' ||
            c.species === 'great_white_shark' ||
            c.species === 'manta_ray'
              ? 'swim'
              : 'wander';
          c.rig.root.position.set(c.x, c.y, c.z);
          c.rig.root.visible = true;
        }
        continue;
      }

      if (c.spawnCycle === 'nocturnal') {
        nocturnalActiveCount += 1;
      }

      const dxP = playerX - c.x;
      const dzP = playerZ - c.z;
      const distSqP = dxP * dxP + dzP * dzP;
      const maxDrawSq = this.maxDrawDistance * this.maxDrawDistance;

      // Draw-distance frustum/distance culling & >120m AI/animation freeze (zero-GC squared distance)
      if (distSqP > maxDrawSq) {
        if (c.rig.root.visible) c.rig.root.visible = false;
        this.setRigShadow(c, false);
        continue;
      }
      if (!c.rig.root.visible) c.rig.root.visible = true;

      if (distSqP > 7744 && !c.mounted && !c.tamed) {
        this.setRigShadow(c, false);
        c.rig.shadowDisc.visible = false;
        continue;
      }

      // Stagger far ambient creatures (42-56m at 30Hz, >56m at 20Hz) while keeping close/mounted/aggro creatures at full 60Hz
      const isFarAmbient =
        distSqP > 1764 &&
        !c.mounted &&
        !c.tamed &&
        c.state !== 'chase' &&
        c.state !== 'flee' &&
        c.state !== 'takeoff' &&
        c.state !== 'swoop';
      const isVeryFarAmbient = isFarAmbient && distSqP > 3136;
      if (isVeryFarAmbient) {
        if ((i + Math.floor(elapsed * 60)) % 3 !== 0) {
          this.setRigShadow(c, false);
          continue;
        }
      } else if (isFarAmbient && ((i + this.updateFrameParity) & 1) !== 0) {
        this.setRigShadow(c, false);
        continue;
      }
      const stepDt = isVeryFarAmbient ? dt * 3 : isFarAmbient ? dt * 2 : dt;
      const distToPlayer = Math.sqrt(distSqP);

      this.setRigShadow(c, this.shadowsEnabled && distToPlayer < 32);
      c.rig.shadowDisc.visible = distToPlayer < 64;

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

      // Cold breath puffs (Timber Wolf, Polar Bear) & warm nostril steam (American Bison) — LOD skip > 42m
      if (distToPlayer < 42 && c.rig.breathWisps && c.rig.breathWisps.length > 0) {
        const baseZ = c.species === 'bison' ? 1.48 : c.species === 'polar_bear' ? 1.38 : 0.88;
        const baseY = c.species === 'bison' ? 1.12 : c.species === 'polar_bear' ? 1.15 : 0.72;
        const wisps = c.rig.breathWisps;
        for (let wi = 0; wi < wisps.length; wi++) {
          const wisp = wisps[wi];
          const cycle = (elapsed * 0.78 + wi * 0.34 + i * 0.19) % 1;
          const sideX = c.species === 'bison' ? (wi % 2 === 0 ? -0.1 : 0.1) : 0;
          wisp.position.set(
            sideX + Math.sin(elapsed * 2 + wi) * 0.03,
            baseY + cycle * 0.34,
            baseZ + cycle * 0.42,
          );
          wisp.scale.setScalar(0.55 + cycle * 1.15);
          (wisp.material as THREE.MeshBasicMaterial).opacity = Math.sin(cycle * Math.PI) * 0.46;
        }
      }

      // Windblown Lion Mane Tuft Sway — LOD skip > 42m
      if (distToPlayer < 42 && c.rig.maneTufts && c.rig.maneTufts.length > 0) {
        const tufts = c.rig.maneTufts;
        for (let ti = 0; ti < tufts.length; ti++) {
          const tuft = tufts[ti];
          tuft.rotation.z = Math.sin(elapsed * 3.1 + ti * 0.75 + i) * 0.09;
          tuft.rotation.x = Math.cos(elapsed * 2.4 + ti * 0.9) * 0.06;
        }
      }

      // Hovering Honey Bees (Flower Forest / Birch Groves) & Tropical Jungle Parrots
      if (c.species === 'bee' || c.species === 'parrot') {
        const isBee = c.species === 'bee';
        const orbit = elapsed * (isBee ? 1.15 : 0.65) + i * 2.1;
        const radius = isBee ? 4.5 + (i % 3) * 1.4 : 11 + (i % 3) * 3;
        const nx = c.homeX + Math.cos(orbit) * radius;
        const nz = c.homeZ + Math.sin(orbit) * radius;
        c.yaw = Math.atan2(nx - c.x, nz - c.z);
        c.x = nx;
        c.z = nz;
        const groundH = Math.max(OCEAN_LEVEL + 0.5, getTerrainHeight(nx, nz));
        c.y =
          groundH +
          (isBee
            ? 1.75 + Math.sin(elapsed * 3.8 + i) * 0.42
            : 8.2 + Math.sin(elapsed * 1.9 + i) * 1.45);
        c.rig.root.position.set(c.x, c.y, c.z);
        c.rig.root.rotation.y = c.yaw;
        if (c.rig.wings) {
          const wings = c.rig.wings;
          const flapBase = isBee ? Math.sin(elapsed * 46 + i) * 0.62 : 0.14 + Math.sin(elapsed * 15 + i) * 0.52;
          for (let wi = 0; wi < wings.length; wi++) {
            wings[wi].rotation.z = (wi === 0 ? 1 : -1) * flapBase;
          }
        }
        c.callCooldown -= stepDt;
        if (c.callCooldown <= 0) {
          c.callCooldown = isBee ? 14 + Math.random() * 12 : 9 + Math.random() * 10;
          if (distToPlayer < 26) onCreatureCall(c.species, distToPlayer);
        }
        continue;
      }

      // Majestic wide-winged soaring flyers (Bald Eagle, Peregrine Falcon, Pteranodon)
      if (
        c.species === 'bald_eagle' ||
        c.species === 'peregrine_falcon' ||
        c.species === 'pteranodon'
      ) {
        const speedMult = c.species === 'peregrine_falcon' ? 0.46 : c.species === 'pteranodon' ? 0.28 : 0.34;
        const orbit = elapsed * speedMult + i * 2.2;
        const radius = (c.species === 'pteranodon' ? 28 : 20) + (i % 3) * 5;
        const centerX = c.species === 'bald_eagle' && !c.id.startsWith('wild_') ? LAKE_CENTER.x : c.homeX;
        const centerZ = c.species === 'bald_eagle' && !c.id.startsWith('wild_') ? LAKE_CENTER.z : c.homeZ;
        const nx = centerX + Math.cos(orbit) * radius;
        const nz = centerZ + Math.sin(orbit) * radius;
        c.yaw = Math.atan2(nx - c.x, nz - c.z);
        c.x = nx;
        c.z = nz;
        const baseAlt = Math.max(18.5, getTerrainHeight(nx, nz) + 12);
        c.y = baseAlt + (i % 3) * 2.4 + Math.sin(elapsed * 0.65 + i) * 1.6;
        c.rig.root.position.set(c.x, c.y, c.z);
        c.rig.root.rotation.y = c.yaw;
        c.rig.body.rotation.z = -0.18;
        const beatPhase = (elapsed * 0.55 + i) % 1;
        const flapEnv = beatPhase < 0.38 ? Math.sin((beatPhase / 0.38) * Math.PI) : 0;
        if (c.rig.wings) {
          const wings = c.rig.wings;
          const flap = 0.08 + flapEnv * Math.sin(elapsed * 10 + i) * 0.42;
          for (let wi = 0; wi < wings.length; wi++) {
            wings[wi].rotation.z = (wi === 0 ? 1 : -1) * flap;
          }
        }
        const distSoarer = distToPlayer;
        if (distSoarer < 65) {
          sightings.push({
            species: c.species,
            name: c.spec.displayName,
            x: c.x,
            z: c.z,
            timestamp: elapsed,
          });
        }
        c.callCooldown -= stepDt;
        if (c.callCooldown <= 0) {
          c.callCooldown = 12 + Math.random() * 14;
          if (distSoarer < 55) onCreatureCall(c.species, distSoarer);
        }
        continue;
      }

      // Birds & Toucans circling overhead, swooping onto unclaimed carcasses, pecking & startling off
      if (c.species === 'bird' || c.species === 'toucan') {
        if ((c.startledTimer ?? 0) > 0) {
          c.startledTimer = Math.max(0, (c.startledTimer ?? 0) - stepDt);
        }

        const distPlayerBird = distToPlayer;

        // Locate nearest unclaimed carcass within 95m if not currently startled
        let targetCarcass: ScavengerCarcassTarget | undefined;
        if ((c.startledTimer ?? 0) <= 0 && carcasses.length > 0) {
          if (c.feedCarcassId) {
            for (let ki = 0; ki < carcasses.length; ki++) {
              const kc = carcasses[ki];
              if (
                kc.id === c.feedCarcassId &&
                kc.remainingDrops > 0 &&
                kc.owner !== 'player' &&
                !kc.collected
              ) {
                targetCarcass = kc;
                break;
              }
            }
          }
          if (!targetCarcass) {
            let bestDist = 95;
            for (const kc of carcasses) {
              if (kc.remainingDrops <= 0 || kc.owner === 'player' || kc.collected) {
                continue;
              }
              const d = Math.hypot(kc.x - c.x, kc.z - c.z);
              if (d < bestDist) {
                bestDist = d;
                targetCarcass = kc;
              }
            }
          }
        }

        // Startle into steep climb if player approaches within flee distance while bird is feeding or swooping low
        if (
          (c.state === 'feed' || (targetCarcass && c.state === 'swoop' && c.y < targetCarcass.y + 4.5)) &&
          distPlayerBird < ANIMAL_FLEE_DISTANCE
        ) {
          c.state = 'takeoff';
          c.feedCarcassId = undefined;
          c.startledTimer = 5.0;
          c.velY = 6.5;
          onCreatureCall('bird', distPlayerBird);
        }

        if (c.state === 'takeoff') {
          const awayX = c.x - playerX;
          const awayZ = c.z - playerZ;
          const awayLen = Math.hypot(awayX, awayZ) || 1;
          const nx = awayX / awayLen;
          const nz = awayZ / awayLen;
          c.x += nx * 10.5 * stepDt;
          c.z += nz * 10.5 * stepDt;
          c.y += 8.2 * stepDt;
          c.yaw = Math.atan2(nx, nz);
          c.rig.body.rotation.x = -0.45;
          c.rig.head.rotation.x = 0.05;
          for (let li = 0; li < c.rig.legs.length; li++) {
            c.rig.legs[li].rotation.x = 0.75;
          }
          if (c.rig.wings) {
            const takeOffWave = 0.25 + Math.sin(elapsed * 22 + i) * 0.68;
            for (let wi = 0; wi < c.rig.wings.length; wi++) {
              const w = c.rig.wings[wi];
              w.rotation.y = 0;
              w.rotation.z = (wi === 0 ? 1 : -1) * takeOffWave;
            }
          }
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
              c.x += nx * Math.min(horizDist, speed * stepDt);
              c.z += nz * Math.min(horizDist, speed * stepDt);
              c.yaw = Math.atan2(nx, nz);
            }
            const targetHeight = landY + Math.min(18, horizDist * 0.65);
            c.y = THREE.MathUtils.damp(c.y, targetHeight, horizDist < 3 ? 6.5 : 3.2, stepDt);
            const flaring = horizDist < 3.5 && c.y < landY + 2.4;
            c.rig.body.rotation.x = flaring ? -0.35 : Math.min(0.45, horizDist * 0.04);
            c.rig.head.rotation.x = 0.1;
            const legPitch = flaring ? -0.25 : 0.72;
            for (let li = 0; li < c.rig.legs.length; li++) {
              c.rig.legs[li].rotation.x = legPitch;
            }
            if (c.rig.wings) {
              const flapRate = flaring ? 20 : 12;
              const flapAmp = flaring ? 0.62 : 0.36;
              const wingAngle = 0.18 + Math.sin(elapsed * flapRate + i) * flapAmp;
              for (let wi = 0; wi < c.rig.wings.length; wi++) {
                const w = c.rig.wings[wi];
                w.rotation.y = 0;
                w.rotation.z = (wi === 0 ? 1 : -1) * wingAngle;
              }
            }

            if (horizDist <= 0.35 && Math.abs(c.y - landY) <= 0.42) {
              c.state = 'feed';
              c.x = landX;
              c.z = landZ;
              c.y = landY;
              c.feedTimer = 0.85 + Math.random() * 0.6;
              c.yaw = Math.atan2(targetCarcass.x - c.x, targetCarcass.z - c.z);
            }
          } else {
            c.y = landY + Math.abs(Math.sin(elapsed * 6.5 + i)) * 0.04;
            c.yaw = Math.atan2(targetCarcass.x - c.x, targetCarcass.z - c.z);
            const peckPulse = Math.max(0, Math.sin(elapsed * 9.5 + i * 1.3));
            c.rig.body.rotation.x = 0.25 + peckPulse * 0.42;
            c.rig.head.rotation.x = 0.32 + peckPulse * 0.58;
            for (let li = 0; li < c.rig.legs.length; li++) {
              c.rig.legs[li].rotation.x = -0.15;
            }
            if (c.rig.wings) {
              for (let wi = 0; wi < c.rig.wings.length; wi++) {
                const w = c.rig.wings[wi];
                const side = wi === 0 ? -1 : 1;
                w.rotation.z = side * -1.18;
                w.rotation.y = side * 0.22;
              }
            }

            c.feedTimer = (c.feedTimer ?? 1.8) - stepDt;
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
            stepDt,
          );
          c.rig.body.rotation.x = 0;
          c.rig.head.rotation.x = 0;
          for (let li = 0; li < c.rig.legs.length; li++) {
            c.rig.legs[li].rotation.x = 0.85;
          }
          if (c.rig.wings) {
            const glideWave = 0.2 + Math.sin(elapsed * 11 + i) * 0.45;
            for (let wi = 0; wi < c.rig.wings.length; wi++) {
              const w = c.rig.wings[wi];
              w.rotation.y = 0;
              w.rotation.z = (wi === 0 ? 1 : -1) * glideWave;
            }
          }
        }

        c.rig.root.position.set(c.x, c.y, c.z);
        c.rig.root.rotation.y = c.yaw;
        c.rig.shadowDisc.visible = c.state === 'feed';
        continue;
      }

      // Swimming fish schools
      if (c.species === 'fish_school') {
        const orbit = elapsed * 0.65 + i * 2.3;
        const nx = c.homeX + Math.cos(orbit) * 6.5;
        const nz = c.homeZ + Math.sin(orbit) * 6.5;
        if (getTerrainHeight(nx, nz) < OCEAN_LEVEL - 0.35) {
          c.yaw = Math.atan2(nx - c.x, nz - c.z);
          c.x = nx;
          c.z = nz;
        } else {
          c.homeX *= 1.04;
          c.homeZ *= 1.04;
        }
        c.rig.root.position.set(c.x, c.y, c.z);
        c.rig.root.rotation.y = c.yaw;
        continue;
      }

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

      // Coastal Dolphins, Sea Turtles, Great White Sharks & Manta Rays
      if (
        c.species === 'dolphin' ||
        c.species === 'sea_turtle' ||
        c.species === 'great_white_shark' ||
        c.species === 'manta_ray'
      ) {
        const orbitSpd =
          c.species === 'great_white_shark' ? 0.32 : c.species === 'manta_ray' ? 0.22 : 0.25;
        const orbitAngle = elapsed * orbitSpd + i * 2.1;
        const rad = c.species === 'great_white_shark' ? 18 : 14;
        const nextX = c.homeX + Math.cos(orbitAngle) * rad;
        const nextZ = c.homeZ + Math.sin(orbitAngle) * rad;
        if (getTerrainHeight(nextX, nextZ) < OCEAN_LEVEL - 0.35) {
          c.yaw = Math.atan2(nextX - c.x, nextZ - c.z);
          c.x = nextX;
          c.z = nextZ;
        } else {
          // Steer home center outward into open ocean away from shore/land
          c.homeX *= 1.05;
          c.homeZ *= 1.05;
        }

        if (c.species === 'dolphin' && c.leaping) {
          c.leapPhase += stepDt * 3.8;
          const arc = Math.sin(c.leapPhase);
          c.y = OCEAN_LEVEL - 0.15 + Math.max(-0.2, arc * 2.4);
          c.rig.body.rotation.x = -Math.cos(c.leapPhase) * 0.55;
          if (c.leapPhase >= Math.PI) {
            c.leaping = false;
            c.y = OCEAN_LEVEL - 0.15;
            c.rig.body.rotation.x = 0;
          }
        } else {
          const depthOffset = c.species === 'dolphin' ? -0.12 : -0.45;
          c.y = OCEAN_LEVEL + depthOffset + Math.sin(elapsed * 2.4 + i) * 0.16;
          c.rig.body.rotation.x = Math.cos(elapsed * 2.4 + i) * 0.07;
        }
        if (c.species === 'great_white_shark') {
          c.rig.tail.rotation.y = Math.sin(elapsed * 6.5 + i) * 0.38;
        } else {
          c.rig.tail.rotation.x = Math.sin(elapsed * 7.5 + i) * 0.3;
        }
        if (c.rig.wings && c.rig.wings.length > 0) {
          const swing = Math.sin(elapsed * 3.4 + i) * 0.36;
          for (let wi = 0; wi < c.rig.wings.length; wi++) {
            c.rig.wings[wi].rotation.z = (wi === 0 ? 1 : -1) * swing;
          }
        }
        c.rig.root.position.set(c.x, c.y, c.z);
        c.rig.root.rotation.y = c.yaw;
        continue;
      }

      if (c.attackCooldown > 0) c.attackCooldown -= stepDt;
      if (c.provokedTimer > 0) c.provokedTimer -= stepDt;
      if (c.snaredTimer > 0) c.snaredTimer -= stepDt;
      if (c.blindTimer > 0) {
        c.blindTimer = Math.max(0, c.blindTimer - stepDt);
        c.rig.head.rotation.y = Math.sin(elapsed * 16 + i) * 0.65;
        c.rig.head.rotation.z = Math.cos(elapsed * 13 + i) * 0.28;
        c.rig.body.rotation.x = -0.14;
        if (c.stunTimer > 0) c.stunTimer = Math.max(0, c.stunTimer - stepDt);
        continue;
      }
      if (c.stunTimer > 0) {
        c.stunTimer = Math.max(0, c.stunTimer - stepDt);
        c.rig.head.rotation.z = Math.sin(elapsed * 18) * 0.24;
        c.rig.body.rotation.x = 0.08;
        continue;
      } else {
        c.rig.head.rotation.z = 0;
      }

      c.callCooldown -= stepDt;
      if (c.callCooldown <= 0) {
        c.callCooldown = 10 + Math.random() * 14;
        if (distToPlayer < 45 && c.state !== 'sleep') {
          onCreatureCall(c.species, distToPlayer);
        }
      }

      // Armored Cave Titan, Nighttime Creaking, Woodland Mansion & Outpost Illagers, Dark Forest Canopy Hostiles
      const isPredator =
        c.spec.temperament === 'apex_predator' || c.spec.temperament === 'pack_predator';
      let inDarkCanopy = false;
      if (isPredator) {
        c.biomeCheckTimer = (c.biomeCheckTimer ?? 0) - stepDt;
        if (c.biomeCheckTimer <= 0) {
          c.biomeCheckTimer = 0.9;
          c.cachedInDarkCanopy = getBiomeAt(c.x, c.z) === 'dark_forest';
        }
        inDarkCanopy = Boolean(c.cachedInDarkCanopy);
      }
      const isIllager =
        c.species === 'vex' ||
        c.species === 'evoker' ||
        c.species === 'pillager' ||
        c.species === 'witch';
      const isActiveStalker =
        isIllager ||
        c.species === 'creaking' ||
        (inDarkCanopy && isPredator);
      if (c.isBoss || (!c.tamed && !c.mounted && isActiveStalker)) {
        const aggroDist = (c.isBoss ? 14 : Math.max(12, c.spec.aggroRadius)) * Math.max(0.7, stealthMult);
        if (distToPlayer < aggroDist || c.provokedTimer > 0) {
          if (c.state !== 'chase') {
            c.state = 'chase';
            onCreatureCall(c.species, distToPlayer);
          }
          c.targetX = playerX;
          c.targetZ = playerZ;
          if (c.species === 'evoker' && distToPlayer < 16) {
            c.summonCooldown = (c.summonCooldown ?? 3.5) - stepDt;
            if (c.summonCooldown <= 0) {
              let activeVexes = 0;
              for (let vi = 0; vi < this.creatures.length; vi++) {
                const v = this.creatures[vi];
                if (!v.alive || v.species !== 'vex') continue;
                const vdx = v.x - c.x;
                const vdz = v.z - c.z;
                if (vdx * vdx + vdz * vdz < 400) {
                  activeVexes += 1;
                }
              }
              if (activeVexes < 2) {
                c.summonCooldown = 11;
                const ang = Math.random() * Math.PI * 2;
                this.spawnWildAnimalAt('vex', c.x + Math.cos(ang) * 1.4, c.z + Math.sin(ang) * 1.4, {
                  summonedMinion: true,
                  homeX: c.homeX,
                  homeZ: c.homeZ,
                });
                onCreatureCall('vex', distToPlayer);
              } else {
                c.summonCooldown = 4;
              }
            }
          }
        } else if (c.state === 'chase' && distToPlayer > 24) {
          c.state = 'wander';
          c.targetX = c.homeX;
          c.targetZ = c.homeZ;
        }
      } else if (!c.tamed && !c.mounted) {
        // Wild animals flee for 5s when player enters ANIMAL_FLEE_DISTANCE (15m)
        const isWildThreatSensitive =
          c.spec.temperament === 'apex_predator' ||
          c.spec.temperament === 'pack_predator' ||
          c.spec.temperament === 'defensive_herbivore' ||
          c.spec.temperament === 'timid_herbivore';

        const fleeRange = isWildThreatSensitive
          ? ANIMAL_FLEE_DISTANCE * (playerCrouching ? 0.72 : 1.0)
          : 0;

        if (fleeRange > 0 && distToPlayer < fleeRange) {
          if (c.state !== 'flee') {
            c.state = 'flee';
            onCreatureCall(c.species, distToPlayer);
          }
          c.stateTimer = 5.0;
          const dx = c.x - playerX;
          const dz = c.z - playerZ;
          const d = Math.hypot(dx, dz) || 1;
          c.targetX = c.x + (dx / d) * 24;
          c.targetZ = c.z + (dz / d) * 24;
        }
      }

      const isCarnivoreScavenger =
        c.species === 'trex' ||
        c.species === 'spinosaurus' ||
        c.species === 'allosaurus' ||
        c.species === 'velociraptor' ||
        c.species === 'dilophosaurus' ||
        c.species === 'wild_boar' ||
        c.species === 'grizzly_bear' ||
        c.species === 'polar_bear' ||
        c.species === 'gray_wolf' ||
        c.species === 'african_lion' ||
        c.species === 'tiger' ||
        c.species === 'hyena' ||
        c.species === 'red_fox';

      let feedCarcass: ScavengerCarcassTarget | undefined;
      if (isCarnivoreScavenger && c.state !== 'chase' && carcasses.length > 0) {
        const scentRange = c.species === 'wild_boar' ? 40 : 62;
        if (c.feedCarcassId) {
          for (let ki = 0; ki < carcasses.length; ki++) {
            const kc = carcasses[ki];
            if (
              kc.id === c.feedCarcassId &&
              kc.remainingDrops > 0 &&
              kc.owner !== 'player' &&
              !kc.collected &&
              Math.hypot(kc.x - c.x, kc.z - c.z) < scentRange + 15
            ) {
              feedCarcass = kc;
              break;
            }
          }
        }
        if (!feedCarcass) {
          let bestScavDist = scentRange;
          for (const kc of carcasses) {
            if (kc.remainingDrops <= 0 || kc.owner === 'player' || kc.collected) {
              continue;
            }
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
          c.callCooldown -= stepDt;
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
        c.yaw += diff * Math.min(1, stepDt * 3.5);

        c.rig.root.position.set(c.x, c.y, c.z);
        c.rig.root.rotation.y = c.yaw;
        if (c.perch.mode === 'sit') {
          c.rig.body.rotation.x = -0.46;
          c.rig.head.rotation.x = 0.44 + Math.sin(elapsed * 1.4 + i) * 0.05;
          c.rig.head.rotation.z = Math.sin(elapsed * 0.9 + i) * 0.08;
          for (let li = 0; li < c.rig.legs.length; li++) {
            c.rig.legs[li].rotation.x = li < 2 ? 0.35 : -0.68;
          }
          c.rig.tail.rotation.y = Math.sin(elapsed * 2.1 + i) * 0.42;
        } else {
          c.rig.body.rotation.x = 0;
          c.rig.head.rotation.x = Math.sin(elapsed * 1.8 + i) * 0.08;
          c.rig.head.rotation.z = Math.sin(elapsed * 1.1 + i) * 0.06;
          for (let li = 0; li < c.rig.legs.length; li++) {
            c.rig.legs[li].rotation.x = 0;
          }
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
          c.yaw += diff * Math.min(1, stepDt * 6);

          c.feedTimer = (c.feedTimer ?? 1.8) - stepDt;
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
        c.stateTimer -= stepDt;
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
            const roamScale = isIllager ? 2.4 : c.spec.temperament === 'domestic_calm' ? 4.5 : 16;
            const rad =
              (isIllager ? 0.8 : c.spec.temperament === 'domestic_calm' ? 1.5 : 7) +
              Math.random() * roamScale;
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

      let movedThisStep = false;
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
          const candidateX = c.x + nx * moveSpeed * stepDt;
          const candidateZ = c.z + nz * moveSpeed * stepDt;
          const nextTerrain = getTerrainHeight(candidateX, candidateZ);
          const insideHillHouse =
            Math.abs(candidateX - (HILL_HOUSE_POS.x - 0.3)) < 6.2 &&
            Math.abs(candidateZ - HILL_HOUSE_POS.z) < 5.0;

          if (nextTerrain > 0.2 && !insideHillHouse) {
            c.x = candidateX;
            c.z = candidateZ;
            movedThisStep = true;
            c.stepAccum += moveSpeed * stepDt;
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
          c.yaw += diff * Math.min(1, stepDt * 6);
        }
      }

      const swDx = c.x - SWAMP_POS.x;
      const swDz = c.z - SWAMP_POS.z;
      const inSwampZone =
        c.species === 'saltwater_crocodile' &&
        swDx * swDx + swDz * swDz < (SWAMP_POS.radius - 0.35) * (SWAMP_POS.radius - 0.35);

      const kangarooHop =
        c.species === 'kangaroo' && moveSpeed > 0
          ? Math.abs(Math.sin(elapsed * 8.5 + i)) * 0.28
          : 0;
      if (movedThisStep || c.cachedFloorY === undefined) {
        c.cachedFloorY = Math.max(getTerrainHeight(c.x, c.z), getLandmarkFloorY(c.x, c.z, 999));
      }
      const floorY = c.cachedFloorY;
      const vexHover = c.species === 'vex' ? 1.12 + Math.sin(elapsed * 4.8 + i) * 0.24 : 0;
      c.y = (inSwampZone ? SWAMP_POS.waterY - 0.24 : floorY) + kangarooHop + vexHover;
      // Resting/sleeping posture or stealthy Red Fox crouch lowers body subtly; ducks & penguins waddle
      const isFoxCrouch =
        c.species === 'red_fox' && (c.state === 'idle' || c.state === 'graze');
      const sleepDrop = c.state === 'sleep' ? -0.32 : isFoxCrouch ? -0.09 : 0;
      c.rig.root.position.set(c.x, c.y + sleepDrop, c.z);
      c.rig.root.rotation.y = c.yaw;
      c.rig.root.rotation.z =
        (c.species === 'duck' || c.species === 'penguin') && moveSpeed > 0
          ? Math.sin(elapsed * 9 + i) * 0.09
          : 0;

      const isScratchingRooster = c.species === 'jungle_fowl' && c.state === 'graze';
      const animFreq = moveSpeed > 0 ? moveSpeed * 1.9 : isScratchingRooster ? 11.5 : 1.8;
      const legAmp = moveSpeed > 0 ? (inSwampZone ? 0.22 : 0.52) : isScratchingRooster ? 0.48 : 0.03;
      const legs = c.rig.legs;
      for (let idx = 0; idx < legs.length; idx++) {
        const phase = c.species === 'kangaroo' ? 0 : idx % 2 === 0 ? 0 : Math.PI;
        legs[idx].rotation.x =
          c.state === 'sleep'
            ? 0.6
            : isFoxCrouch
              ? -0.28
              : Math.sin(elapsed * animFreq + phase) * legAmp;
      }
      if ((c.species === 'penguin' || c.species === 'vex') && c.rig.wings) {
        const wingSpeed = c.species === 'vex' ? 22 : 7;
        const wingAmp = c.species === 'vex' ? 0.55 : 0.16;
        const wings = c.rig.wings;
        const wingWave = Math.sin(elapsed * wingSpeed + i) * wingAmp;
        for (let wi = 0; wi < wings.length; wi++) {
          const w = wings[wi];
          w.rotation.y = c.species === 'vex' ? (wi === 0 ? 1 : -1) * wingWave : 0;
          w.rotation.z = c.species === 'penguin' ? (wi === 0 ? 1 : -1) * (0.14 + wingWave) : 0;
        }
      }
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

    // Infinite Biome-Aware Wildlife Ecosystem: cleanly recycles distant/dead dynamic spawns & populates herds smoothly (staggered 1 per tick to prevent frame spikes)
    this.replenishTimer -= dt;
    if (this.replenishTimer <= 0) {
      this.replenishTimer = 0.9;

      // 1. Prune distant (>115m) or expired dead untamed dynamic wildlife back into reusable rig pool
      for (let idx = this.creatures.length - 1; idx >= 0; idx--) {
        const dc = this.creatures[idx];
        if (!dc.id.startsWith('wild_') || dc.tamed || dc.mounted) continue;
        const ddx = dc.x - playerX;
        const ddz = dc.z - playerZ;
        const farAway = ddx * ddx + ddz * ddz > 13225;
        const deadExpired = !dc.alive && dc.respawnTimer <= 0;
        if (farAway || deadExpired) {
          this.releaseWildRig(dc.species, dc.rig);
          this.creatures.splice(idx, 1);
        }
      }

      // 2. Count active dynamic & wild creatures near the player
      let liveWildCount = 0;
      for (let idx = 0; idx < this.creatures.length; idx++) {
        const c = this.creatures[idx];
        if (c.alive && c.id.startsWith('wild_')) {
          liveWildCount += 1;
        }
      }

      // Spawn at most 1 encounter (+1 companion herd mate) per tick to keep frame times flat
      if (liveWildCount < 36) {
        for (let attempt = 0; attempt < 8; attempt++) {
          const angle = Math.random() * Math.PI * 2;
          const rad = 24 + Math.random() * 92;
          const sx = THREE.MathUtils.clamp(playerX + Math.cos(angle) * rad, -735, 735);
          const sz = THREE.MathUtils.clamp(playerZ + Math.sin(angle) * rad, -735, 735);

          // Keep safe homestead/garage clearings free of random wild spawns
          let hdx = sx - HILL_HOUSE_POS.x;
          let hdz = sz - HILL_HOUSE_POS.z;
          if (hdx * hdx + hdz * hdz < 256) continue;
          hdx = sx - VEHICLE_GARAGE_POS.x;
          hdz = sz - VEHICLE_GARAGE_POS.z;
          if (hdx * hdx + hdz * hdz < 380.25) continue;
          hdx = sx - WHEATFIELD_POS.x;
          hdz = sz - WHEATFIELD_POS.z;
          if (hdx * hdx + hdz * hdz < 121) continue;
          hdx = sx - FARMER_POS.x;
          hdz = sz - FARMER_POS.z;
          if (hdx * hdx + hdz * hdz < 81) continue;

          const h = getTerrainHeight(sx, sz);
          const biome = getBiomeAt(sx, sz);
          const dSnow = Math.hypot(sx - SNOWY_WOODLAND_POS.x, sz - SNOWY_WOODLAND_POS.z);
          const dSwamp = Math.hypot(sx - SWAMP_POS.x, sz - SWAMP_POS.z);

          let pool: CreatureSpecies[];
          if (biome === 'warm_ocean') {
            pool = ['dolphin', 'sea_turtle', 'manta_ray', 'fish_school'];
          } else if (biome === 'frozen_ocean') {
            pool = ['polar_bear', 'penguin', 'fish_school'];
          } else if (
            h < OCEAN_LEVEL - 0.65 ||
            biome === 'ocean' ||
            biome === 'lukewarm_ocean' ||
            biome === 'cold_ocean'
          ) {
            pool = ['great_white_shark', 'sea_turtle', 'manta_ray', 'dolphin', 'fish_school'];
          } else if (biome === 'snowy_beach') {
            pool = ['rabbit', 'penguin', 'polar_bear'];
          } else if (biome === 'stony_shore') {
            pool = isNight ? ['velociraptor', 'gray_wolf'] : ['goat', 'bird'];
          } else if (biome === 'frozen_river') {
            pool = ['polar_bear', 'penguin', 'white_fox'];
          } else if (biome === 'desert') {
            pool = isNight ? ['camel', 'rabbit', 'hyena'] : ['camel', 'camel', 'rabbit'];
          } else if (
            biome === 'savanna' ||
            biome === 'savanna_plateau' ||
            biome === 'windswept_savanna'
          ) {
            pool = ['horse', 'horse', 'goat', 'sheep', 'cattle', 'pig'];
          } else if (
            biome === 'badlands' ||
            biome === 'wooded_badlands' ||
            biome === 'eroded_badlands'
          ) {
            pool = isNight ? ['rabbit', 'hyena', 'velociraptor'] : ['rabbit', 'goat'];
          } else if (biome === 'swamp') {
            pool = ['witch', 'saltwater_crocodile', 'duck', 'hippopotamus'];
          } else if (biome === 'mangrove_swamp') {
            pool = ['duck', 'saltwater_crocodile', 'flamingo', 'fish_school'];
          } else if (biome === 'mushroom_fields') {
            // Peaceful Mushroom Fields sanctuary: NO hostile mobs spawn naturally here!
            pool = ['cattle'];
          } else if (biome === 'beach') {
            pool = ['flamingo', 'camel', 'ostrich', 'sea_turtle', 'toucan', 'bird', 'peregrine_falcon'];
          } else if (biome === 'snowy_taiga') {
            pool = ['white_fox', 'gray_wolf', 'rabbit', 'reindeer', 'moose'];
          } else if (dSnow < 24 || biome === 'mountain') {
            pool = ['reindeer', 'moose', 'polar_bear', 'penguin', 'gray_wolf', 'peregrine_falcon', 'pteranodon'];
          } else if (biome === 'taiga') {
            pool = ['gray_wolf', 'red_fox', 'rabbit', 'pig', 'sheep', 'cattle', 'jungle_fowl'];
          } else if (
            biome === 'old_growth_pine_taiga' ||
            biome === 'old_growth_spruce_taiga'
          ) {
            pool = ['gray_wolf', 'red_fox', 'rabbit'];
          } else if (biome === 'dark_forest') {
            pool = ['pig', 'sheep', 'cattle', 'gray_wolf', 'velociraptor', 'dilophosaurus'];
          } else if (biome === 'pale_garden') {
            // Pale Garden has NO passive animals; Creaking emerges at night from Creaking Hearts
            pool = isNight ? ['creaking'] : [];
          } else if (biome === 'flower_forest') {
            pool = ['bee', 'bee', 'bee', 'rabbit', 'sheep', 'pig', 'cattle', 'jungle_fowl'];
          } else if (biome === 'birch_forest' || biome === 'old_growth_birch_forest') {
            pool = ['bee', 'pig', 'sheep', 'cattle', 'jungle_fowl'];
          } else if (biome === 'bamboo_jungle') {
            pool = ['panda', 'panda', 'panda', 'parrot', 'ocelot'];
          } else if (biome === 'jungle') {
            pool = ['parrot', 'ocelot', 'panda', 'tiger', 'gorilla', 'toucan'];
          } else if (biome === 'sparse_jungle') {
            pool = ['parrot', 'ocelot', 'pig', 'sheep', 'cattle', 'jungle_fowl'];
          } else if (biome === 'plains' || biome === 'sunflower_plains') {
            pool = ['horse', 'horse', 'pig', 'sheep', 'cattle', 'jungle_fowl', 'rabbit'];
          } else if (biome === 'snowy_plains' || biome === 'ice_spikes') {
            pool = ['polar_bear', 'polar_bear', 'rabbit', 'white_fox', 'gray_wolf'];
          } else if (biome === 'meadow') {
            pool = ['bee', 'bee', 'sheep', 'rabbit', 'horse'];
          } else if (biome === 'cherry_grove') {
            pool = ['bee', 'bee', 'pig', 'sheep', 'rabbit'];
          } else if (biome === 'grove') {
            pool = ['gray_wolf', 'red_fox', 'white_fox', 'rabbit'];
          } else if (biome === 'snowy_slopes') {
            pool = ['goat', 'goat', 'rabbit'];
          } else if (biome === 'jagged_peaks' || biome === 'frozen_peaks') {
            pool = ['goat', 'goat', 'peregrine_falcon'];
          } else if (biome === 'stony_peaks') {
            pool = ['goat', 'sheep'];
          } else if (
            biome === 'windswept_hills' ||
            biome === 'windswept_gravelly_hills'
          ) {
            pool = ['goat', 'sheep', 'cattle', 'pig'];
          } else if (biome === 'windswept_forest') {
            pool = ['gray_wolf', 'goat', 'sheep', 'pig', 'cattle'];
          } else if (dSwamp < 20 || biome === 'river' || biome === 'lake') {
            pool = ['hippopotamus', 'saltwater_crocodile', 'flamingo', 'duck', 'spinosaurus', 'bald_eagle'];
          } else if (biome === 'grassland') {
            pool = [
              'elephant',
              'giraffe',
              'zebra',
              'african_lion',
              'rhinoceros',
              'cheetah',
              'hyena',
              'ostrich',
              'kangaroo',
              'bison',
              'camel',
              'triceratops',
              'diplodocus',
              'pteranodon',
            ];
          } else {
            // Forest / Emerald Canopy: Wolves, Pigs, Sheep, Cows, Chickens + Island wildlife
            pool = [
              'gray_wolf',
              'pig',
              'sheep',
              'cattle',
              'jungle_fowl',
              'deer',
              'red_fox',
              'rabbit',
              'wild_boar',
              'bird',
            ];
          }

          if (pool.length === 0) continue;
          const chosen = pool[Math.floor(Math.random() * pool.length)];
          this.spawnWildAnimalAt(chosen, sx, sz);
          liveWildCount += 1;

          // Spawn a companion herd/pack mate nearby for social wild species (spread out by 6-12m)
          if (HERD_SPECIES.has(chosen) && liveWildCount < 36 && Math.random() < 0.65) {
            const mx = sx + (Math.random() - 0.5) * 12;
            const mz = sz + (Math.random() - 0.5) * 12;
            if (getTerrainHeight(mx, mz) > OCEAN_LEVEL + 0.3) {
              this.spawnWildAnimalAt(chosen, mx, mz);
              liveWildCount += 1;
            }
          }
          break;
        }
      }
    }

    if (this.sightingEmitTimer >= 0.4) {
      this.sightingEmitTimer = 0;
      if (sightings.length > 0 || !this.lastEmittedSightingsEmpty) {
        this.lastEmittedSightingsEmpty = sightings.length === 0;
        onSightingUpdate(sightings.length === 0 ? [] : sightings.slice());
      }
    }
    return { nocturnalActiveCount };
  }
}
