export type ShorelineHabitat =
  | 'beach'
  | 'tidal_pool'
  | 'shallow_ocean'
  | 'reef'
  | 'deep_ocean';

export type ShorelineCreature = {
  name: string;
  habitat: ShorelineHabitat[];
  collectible: boolean;
  harvestable: boolean;
  rarity: 'common' | 'uncommon' | 'rare';
};

export const SHORELINE_CREATURES: ShorelineCreature[] = [
  { name: 'Lobster', habitat: ['reef', 'shallow_ocean'], collectible: true, harvestable: true, rarity: 'uncommon' },
  { name: 'Crab', habitat: ['beach', 'tidal_pool'], collectible: true, harvestable: true, rarity: 'common' },
  { name: 'Starfish', habitat: ['beach', 'tidal_pool'], collectible: true, harvestable: false, rarity: 'common' },
  { name: 'Squid', habitat: ['deep_ocean'], collectible: true, harvestable: true, rarity: 'uncommon' },
  { name: 'Oyster', habitat: ['reef', 'shallow_ocean'], collectible: true, harvestable: true, rarity: 'uncommon' },
  { name: 'Clam', habitat: ['beach', 'tidal_pool'], collectible: true, harvestable: true, rarity: 'common' },
  { name: 'Mussel', habitat: ['reef', 'shallow_ocean'], collectible: true, harvestable: true, rarity: 'common' },
  { name: 'Scallop', habitat: ['shallow_ocean', 'reef'], collectible: true, harvestable: true, rarity: 'uncommon' },
  { name: 'Sea Snail', habitat: ['tidal_pool', 'reef'], collectible: true, harvestable: true, rarity: 'common' },
  { name: 'Sea Urchin', habitat: ['reef'], collectible: true, harvestable: true, rarity: 'uncommon' },
  { name: 'Shrimp', habitat: ['shallow_ocean', 'reef'], collectible: true, harvestable: true, rarity: 'common' },
  { name: 'Hermit Crab', habitat: ['beach', 'tidal_pool'], collectible: true, harvestable: true, rarity: 'common' },
];

export type CollectedSeafood = {
  species: string;
  collectedAt: number;
  quantity: number;
};

export function getShorelineCreatures(habitat: ShorelineHabitat) {
  return SHORELINE_CREATURES.filter((creature) =>
    creature.habitat.includes(habitat),
  );
}

export function collectShorelineCreature(
  creature: ShorelineCreature,
  inventory: CollectedSeafood[],
) {
  if (!creature.collectible) return false;

  const existing = inventory.find((item) => item.species === creature.name);

  if (existing) {
    existing.quantity += 1;
  } else {
    inventory.push({
      species: creature.name,
      collectedAt: Date.now(),
      quantity: 1,
    });
  }

  return true;
}
