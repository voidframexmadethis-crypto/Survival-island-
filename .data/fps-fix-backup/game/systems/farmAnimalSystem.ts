export type AnimalSpecies = 'chicken' | 'duck' | 'sheep' | 'pig';

export type Animal = {
  id: string;
  species: AnimalSpecies;
  age: number;
  adult: boolean;
  alive: boolean;
  nextEggAt: number;
  nextBirthAt: number;
  parentIds: string[];
};

export type AnimalEgg = {
  id: string;
  species: 'chicken' | 'duck';
  collected: boolean;
  laidAt: number;
};

let animalId = 0;
let eggId = 0;

const GROWTH_TIME = 5 * 60 * 1000;
const EGG_INTERVAL = 2 * 60 * 1000;
const BREED_INTERVAL = 10 * 60 * 1000;

export function createAnimal(
  species: AnimalSpecies,
  now = Date.now(),
): Animal {
  return {
    id: `animal-${++animalId}`,
    species,
    age: 0,
    adult: false,
    alive: true,
    nextEggAt: now + EGG_INTERVAL,
    nextBirthAt: now + BREED_INTERVAL,
    parentIds: [],
  };
}

export function updateAnimalLife(
  animals: Animal[],
  eggs: AnimalEgg[],
  now = Date.now(),
) {
  const newAnimals: Animal[] = [];
  const newEggs: AnimalEgg[] = [];

  for (const animal of animals) {
    if (!animal.alive) continue;

    animal.age = Math.max(0, now - (animal.nextEggAt - EGG_INTERVAL));

    if (!animal.adult && animal.age >= GROWTH_TIME) {
      animal.adult = true;
    }

    if (
      animal.adult &&
      (animal.species === 'chicken' || animal.species === 'duck') &&
      now >= animal.nextEggAt
    ) {
      newEggs.push({
        id: `egg-${++eggId}`,
        species: animal.species,
        collected: false,
        laidAt: now,
      });

      animal.nextEggAt = now + EGG_INTERVAL;
    }
  }

  eggs.push(...newEggs);
  animals.push(...newAnimals);

  return { newEggs, newAnimals };
}

export function collectEgg(egg: AnimalEgg) {
  if (egg.collected) return false;

  egg.collected = true;
  return true;
}

// Player-owned carcasses are protected from animal feeding.
export function canAnimalEatCarcass(carcass: {
  owner: 'player' | 'world';
  collected: boolean;
}) {
  return carcass.owner === 'world' && !carcass.collected;
}

type EggType = 'chicken_egg' | 'duck_egg';

type OvenFood = {
  type: EggType;
  startedAt: number;
  cookingDuration: number;
};

export function cookEgg(type: EggType, now = Date.now()): OvenFood {
  return {
    type,
    startedAt: now,
    cookingDuration: 8000,
  };
}

export function getEggCookingStatus(food: OvenFood, now = Date.now()) {
  const elapsed = now - food.startedAt;

  if (elapsed >= food.cookingDuration * 1.5) {
    return 'burnt';
  }

  if (elapsed >= food.cookingDuration) {
    return 'cooked';
  }

  return 'cooking';
}
