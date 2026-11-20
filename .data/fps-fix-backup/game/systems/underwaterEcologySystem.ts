export interface UnderwaterPlayer {
  x: number;
  y: number;
  z: number;
  velocityY: number;
  oxygen: number;
  underwater: boolean;
}

export interface WaterEnvironment {
  surfaceHeight: number;
  maxDiveDepth: number;
}

const MAX_OXYGEN = 100;
const OXYGEN_LOSS = 8;
const OXYGEN_RECOVERY = 18;
const SWIM_SPEED = 4;
const DIVE_SPEED = 3;

export function updateUnderwaterPlayer(
  player: UnderwaterPlayer,
  water: WaterEnvironment,
  input: {
    swimUp: boolean;
    swimDown: boolean;
    deltaTime: number;
  },
): UnderwaterPlayer {
  const dt = Math.max(0, Math.min(input.deltaTime, 0.05));

  player.underwater = player.y < water.surfaceHeight;

  if (player.underwater) {
    if (input.swimUp) {
      player.velocityY = SWIM_SPEED;
    } else if (input.swimDown) {
      player.velocityY = -DIVE_SPEED;
    } else {
      player.velocityY *= Math.exp(-2 * dt);
    }

    player.y += player.velocityY * dt;

    const minimumY = water.surfaceHeight - water.maxDiveDepth;

    player.y = Math.max(minimumY, player.y);

    player.oxygen = Math.max(0, player.oxygen - OXYGEN_LOSS * dt);
  } else {
    player.y = Math.max(player.y, water.surfaceHeight);
    player.velocityY = 0;

    player.oxygen = Math.min(MAX_OXYGEN, player.oxygen + OXYGEN_RECOVERY * dt);
  }

  player.underwater = player.y < water.surfaceHeight;

  return player;
}

type MarineHabitat =
  | 'shallow_ocean'
  | 'coral_reef'
  | 'open_ocean'
  | 'deep_ocean'
  | 'mangrove'
  | 'river';

type MarineAnimal = {
  name: string;
  habitats: MarineHabitat[];
  rarity: 'common' | 'uncommon' | 'rare';
  dangerous: boolean;
  harvestItem: string | null;
};

export const MARINE_ANIMALS: MarineAnimal[] = [
  {
    name: 'Tiger Shark',
    habitats: ['open_ocean', 'deep_ocean'],
    rarity: 'rare',
    dangerous: true,
    harvestItem: 'shark_meat',
  },
  {
    name: 'Reef Shark',
    habitats: ['coral_reef', 'shallow_ocean'],
    rarity: 'uncommon',
    dangerous: true,
    harvestItem: 'shark_meat',
  },
  {
    name: 'Saltwater Crocodile',
    habitats: ['mangrove', 'river'],
    rarity: 'rare',
    dangerous: true,
    harvestItem: 'crocodile_meat',
  },
  {
    name: 'Sea Turtle',
    habitats: ['coral_reef', 'shallow_ocean'],
    rarity: 'uncommon',
    dangerous: false,
    harvestItem: null,
  },
  {
    name: 'Stingray',
    habitats: ['shallow_ocean', 'coral_reef'],
    rarity: 'uncommon',
    dangerous: false,
    harvestItem: 'ray_meat',
  },
  {
    name: 'Dolphin',
    habitats: ['open_ocean'],
    rarity: 'uncommon',
    dangerous: false,
    harvestItem: null,
  },
  {
    name: 'Octopus',
    habitats: ['coral_reef', 'deep_ocean'],
    rarity: 'rare',
    dangerous: false,
    harvestItem: 'octopus_meat',
  },
];

export function getMarineAnimals(habitat: MarineHabitat): MarineAnimal[] {
  return MARINE_ANIMALS.filter((animal) => animal.habitats.includes(habitat));
}

type MeatType = 'crocodile_meat' | 'shark_meat' | 'fish_meat';

interface CookingMeat {
  type: MeatType;
  startedAt: number;
  cookingDuration: number;
}

export function placeMeatOnStove(type: MeatType): CookingMeat {
  return {
    type,
    startedAt: Date.now(),
    cookingDuration: 15000,
  };
}

export function getMeatCookingStatus(meat: CookingMeat, now = Date.now()) {
  const progress = (now - meat.startedAt) / meat.cookingDuration;

  if (progress >= 1.5) return 'burnt';
  if (progress >= 1) return 'cooked';
  if (progress >= 0.75) return 'almost_ready';

  return 'cooking';
}
