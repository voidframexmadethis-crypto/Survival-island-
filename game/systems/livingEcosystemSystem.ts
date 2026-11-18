/* =========================================================
   FEATURE 201 — THE LIVING ISLAND ECOSYSTEM
   Persistent living-world simulation, wildlife behavior, forest growth,
   living NPC village schedules, dynamic weather, environmental impact,
   and ecosystem discovery journal.
   ========================================================= */

import { CreatureSpecies, WeatherType } from '../types';

export interface EcosystemZone {
  id: string;
  name: string;
  biome: string;
  soilMoisture: number; // 0..1 (rain increases, drought decreases)
  temperatureC: number; // -10..40
  canopyDensity: number; // 0..1 (tree cover)
  pollutionLevel: number; // 0..1 (player impact)
  herbivorePopulation: number;
  predatorPopulation: number;
  fishPopulation: number;
  activeEvent: EcosystemEventType | null;
  eventTimer: number;
}

export type EcosystemEventType =
  | 'migration'
  | 'seasonal_flowering'
  | 'baby_boom'
  | 'forest_regeneration'
  | 'village_festival'
  | 'rare_sighting'
  | 'drought'
  | 'heavy_storm';

export interface WildlifeAgent {
  id: string;
  species: CreatureSpecies;
  x: number;
  y: number;
  z: number;
  state: 'roaming' | 'grazing' | 'hunting' | 'resting' | 'fleeing' | 'drinking';
  energy: number; // 0..100
  hydration: number; // 0..100
  health: number;
  maxHealth: number;
  ageDays: number;
  isBaby: boolean;
  territoryCenter: { x: number; z: number };
}

export interface ForestTreeInstance {
  id: string;
  x: number;
  y: number;
  z: number;
  stage: 'sapling' | 'young' | 'mature' | 'elder' | 'fallen';
  health: number;
  maxHealth: number;
  growthProgress: number; // 0..1 per stage
  moistureNeeded: number;
  decayTimer: number;
}

export interface VillageNpcSchedule {
  npcId: string;
  name: string;
  role: 'farmer' | 'merchant' | 'guard' | 'artisan' | 'fisher';
  villageId: string;
  currentActivity: 'sleeping' | 'working' | 'farming' | 'trading' | 'socializing' | 'traveling';
  x: number;
  z: number;
  reputationWithPlayer: number;
}

export interface EcosystemJournalEntry {
  species: CreatureSpecies | string;
  category: 'wildlife' | 'flora' | 'event' | 'weather';
  name: string;
  description: string;
  discovered: boolean;
  observationCount: number;
  lastObservedDay: number;
  rare: boolean;
}

export interface EcosystemSimulationData {
  soilMoisture: number;
  globalTemperature: number;
  forestDensity: number;
  habitatHealthScore: number; // 0..100
  zones: EcosystemZone[];
  wildlifeAgents: WildlifeAgent[];
  forestTrees: ForestTreeInstance[];
  npcs: VillageNpcSchedule[];
  journal: EcosystemJournalEntry[];
  activeEvents: { id: EcosystemEventType; title: string; description: string; durationDays: number }[];
  lastTickTimestamp: number;
}

export const INITIAL_ECOSYSTEM_JOURNAL: EcosystemJournalEntry[] = [
  { species: 'deer', category: 'wildlife', name: 'Red Deer', description: 'Graceful herbivores grazing in forest edges and grassy meadows. Reacts to player movement and predators.', discovered: true, observationCount: 3, lastObservedDay: 1, rare: false },
  { species: 'wild_boar', category: 'wildlife', name: 'Wild Boar', description: 'Omnivorous forest dwellers that forage for roots and berries. Can become defensive if approached.', discovered: true, observationCount: 2, lastObservedDay: 1, rare: false },
  { species: 'grizzly_bear', category: 'wildlife', name: 'Grizzly Bear', description: 'Powerful apex predator establishing territory near mountain caves and dense woods.', discovered: false, observationCount: 0, lastObservedDay: 0, rare: true },
  { species: 'bald_eagle', category: 'wildlife', name: 'Bald Eagle', description: 'Majestic bird of prey soaring above coastal cliffs and river valleys.', discovered: false, observationCount: 0, lastObservedDay: 0, rare: true },
  { species: 'palm_tree', category: 'flora', name: 'Tropical Palm', description: 'Sturdy coastal trees yielding coconuts and fibrous fronds.', discovered: true, observationCount: 5, lastObservedDay: 1, rare: false },
  { species: 'banyan_tree', category: 'flora', name: 'Ancient Banyan', description: 'Massive canopy tree providing deep shade and high-grade timber.', discovered: false, observationCount: 0, lastObservedDay: 0, rare: true },
  { species: 'migration', category: 'event', name: 'Great Wildlife Migration', description: 'Herds of herbivores traverse the island plains following seasonal rainfall.', discovered: false, observationCount: 0, lastObservedDay: 0, rare: true },
  { species: 'seasonal_flowering', category: 'event', name: 'Isle Blossom Surge', description: 'Explosive blooming of rare medicinal herbs and berry bushes across valleys.', discovered: false, observationCount: 0, lastObservedDay: 0, rare: false }
];

export function createInitialEcosystem(): EcosystemSimulationData {
  return {
    soilMoisture: 0.65,
    globalTemperature: 24.5,
    forestDensity: 0.72,
    habitatHealthScore: 85,
    zones: [
      { id: 'coastal-valley', name: 'Coastal Palm Valley', biome: 'beach', soilMoisture: 0.6, temperatureC: 26, canopyDensity: 0.5, pollutionLevel: 0.05, herbivorePopulation: 12, predatorPopulation: 2, fishPopulation: 45, activeEvent: null, eventTimer: 0 },
      { id: 'deep-woods', name: 'Whispering Canopy Forest', biome: 'forest', soilMoisture: 0.8, temperatureC: 22, canopyDensity: 0.9, pollutionLevel: 0.02, herbivorePopulation: 24, predatorPopulation: 6, fishPopulation: 30, activeEvent: 'seasonal_flowering', eventTimer: 3 },
      { id: 'volcanic-ridge', name: 'Crag Mountain Ridge', biome: 'mountain', soilMoisture: 0.3, temperatureC: 18, canopyDensity: 0.3, pollutionLevel: 0.01, herbivorePopulation: 8, predatorPopulation: 4, fishPopulation: 10, activeEvent: null, eventTimer: 0 }
    ],
    wildlifeAgents: [
      { id: 'w-1', species: 'deer', x: 25, y: 0, z: 15, state: 'grazing', energy: 80, hydration: 90, health: 100, maxHealth: 100, ageDays: 4, isBaby: false, territoryCenter: { x: 20, z: 15 } },
      { id: 'w-2', species: 'deer', x: 30, y: 0, z: 18, state: 'roaming', energy: 75, hydration: 85, health: 100, maxHealth: 100, ageDays: 2, isBaby: true, territoryCenter: { x: 20, z: 15 } },
      { id: 'w-3', species: 'wild_boar', x: -40, y: 0, z: 35, state: 'grazing', energy: 90, hydration: 80, health: 120, maxHealth: 120, ageDays: 6, isBaby: false, territoryCenter: { x: -35, z: 30 } },
      { id: 'w-4', species: 'grizzly_bear', x: -80, y: 0, z: -60, state: 'resting', energy: 60, hydration: 70, health: 300, maxHealth: 300, ageDays: 12, isBaby: false, territoryCenter: { x: -85, z: -65 } }
    ],
    forestTrees: [
      { id: 't-1', x: 12, y: 0, z: 22, stage: 'mature', health: 150, maxHealth: 150, growthProgress: 1.0, moistureNeeded: 0.4, decayTimer: 0 },
      { id: 't-2', x: 16, y: 0, z: 25, stage: 'young', health: 80, maxHealth: 80, growthProgress: 0.6, moistureNeeded: 0.5, decayTimer: 0 },
      { id: 't-3', x: 20, y: 0, z: 19, stage: 'sapling', health: 30, maxHealth: 30, growthProgress: 0.2, moistureNeeded: 0.6, decayTimer: 0 },
      { id: 't-4', x: -15, y: 0, z: -25, stage: 'elder', health: 250, maxHealth: 250, growthProgress: 1.0, moistureNeeded: 0.3, decayTimer: 0 }
    ],
    npcs: [
      { npcId: 'npc-1', name: 'Elder Silas', role: 'artisan', villageId: 'coastal-village', currentActivity: 'working', x: 10, z: 10, reputationWithPlayer: 15 },
      { npcId: 'npc-2', name: 'Maren', role: 'merchant', villageId: 'coastal-village', currentActivity: 'trading', x: 12, z: 8, reputationWithPlayer: 20 },
      { npcId: 'npc-3', name: 'Bram', role: 'farmer', villageId: 'forest-village', currentActivity: 'farming', x: -50, z: -20, reputationWithPlayer: 10 },
      { npcId: 'npc-4', name: 'Kaelen', role: 'fisher', villageId: 'coastal-village', currentActivity: 'working', x: 18, z: 2, reputationWithPlayer: 25 }
    ],
    journal: INITIAL_ECOSYSTEM_JOURNAL,
    activeEvents: [
      { id: 'seasonal_flowering', title: 'Isle Blossom Surge', description: 'Abundant blooming across forest clearings increasing berry yield and herbivore births.', durationDays: 2 }
    ],
    lastTickTimestamp: Date.now()
  };
}

export function simulateEcosystemTick(
  ecosystem: EcosystemSimulationData,
  deltaTimeSeconds: number,
  weather: WeatherType,
  playerPos: { x: number; y: number; z: number }
): EcosystemSimulationData {
  const dt = Math.min(deltaTimeSeconds, 5.0); // Cap dt for stability

  // 1. Update moisture & temperature based on weather
  let targetMoisture = 0.6;
  if (weather === 'rain') targetMoisture = 0.95;
  if (weather === 'storm') targetMoisture = 1.0;
  if (weather === 'overcast') targetMoisture = 0.7;
  
  ecosystem.soilMoisture += (targetMoisture - ecosystem.soilMoisture) * 0.05 * dt;
  ecosystem.soilMoisture = Math.max(0.1, Math.min(1.0, ecosystem.soilMoisture));

  // 2. Update wildlife agents (efficient simulation near player vs distant)
  const updatedWildlife = ecosystem.wildlifeAgents.map((agent) => {
    const distToPlayer = Math.hypot(agent.x - playerPos.x, agent.z - playerPos.z);
    const isNearPlayer = distToPlayer < 60;

    let nextState = agent.state;
    let nx = agent.x;
    let nz = agent.z;
    let nEnergy = agent.energy - 0.1 * dt;
    let nHydration = agent.hydration - 0.15 * dt;

    if (isNearPlayer) {
      // Detailed behavior near player
      if (distToPlayer < 12 && agent.species !== 'deer' && agent.species !== 'rabbit') {
        nextState = 'fleeing';
        const angle = Math.atan2(agent.z - playerPos.z, agent.x - playerPos.x);
        nx += Math.cos(angle) * 3 * dt;
        nz += Math.sin(angle) * 3 * dt;
      } else if (nHydration < 30) {
        nextState = 'drinking';
        nHydration = Math.min(100, nHydration + 5 * dt);
      } else if (nEnergy < 35) {
        nextState = 'resting';
        nEnergy = Math.min(100, nEnergy + 4 * dt);
      } else {
        nextState = 'grazing';
        // Gentle roam around territory
        nx += (agent.territoryCenter.x - nx) * 0.02 * dt + (Math.random() - 0.5) * 1.5;
        nz += (agent.territoryCenter.z - nz) * 0.02 * dt + (Math.random() - 0.5) * 1.5;
      }
    } else {
      // Distant aggregate simulation (cheaper)
      if (Math.random() < 0.1) {
        nx += (Math.random() - 0.5) * 4;
        nz += (Math.random() - 0.5) * 4;
      }
    }

    return {
      ...agent,
      x: nx,
      z: nz,
      state: nextState,
      energy: Math.max(0, Math.min(100, nEnergy)),
      hydration: Math.max(0, Math.min(100, nHydration))
    };
  });

  // 3. Update forest trees growth & decay
  const updatedTrees = ecosystem.forestTrees.map((tree) => {
    let nProgress = tree.growthProgress;
    let nStage = tree.stage;
    let nHealth = tree.health;
    let nDecay = tree.decayTimer;

    if (tree.stage !== 'fallen') {
      const growthRate = 0.008 * ecosystem.soilMoisture * dt;
      nProgress += growthRate;
      if (nProgress >= 1.0) {
        if (tree.stage === 'sapling') nStage = 'young';
        else if (tree.stage === 'young') nStage = 'mature';
        else if (tree.stage === 'mature' && Math.random() < 0.001) nStage = 'elder';
        nProgress = 0;
      }
    } else {
      nDecay += dt;
      if (nDecay > 120) {
        // Fallen tree decays fully into soil nutrients
        nHealth = 0;
      }
    }

    return {
      ...tree,
      stage: nStage,
      growthProgress: Math.min(1.0, nProgress),
      health: nHealth,
      decayTimer: nDecay
    };
  }).filter((t) => t.health > 0);

  // 4. Update NPC daily schedules
  const currentHour = (Date.now() / 1000) % 24; // simplified time cycle
  const updatedNpcs = ecosystem.npcs.map((npc) => {
    let act = npc.currentActivity;
    if (currentHour < 6 || currentHour > 21) {
      act = 'sleeping';
    } else if (currentHour >= 8 && currentHour < 12) {
      act = npc.role === 'farmer' ? 'farming' : 'working';
    } else if (currentHour >= 12 && currentHour < 14) {
      act = 'socializing';
    } else if (currentHour >= 14 && currentHour < 18) {
      act = npc.role === 'merchant' ? 'trading' : 'working';
    } else {
      act = 'socializing';
    }
    return { ...npc, currentActivity: act };
  });

  // 5. Calculate overall habitat health score
  const avgMoisture = ecosystem.soilMoisture;
  const avgPollution = ecosystem.zones.reduce((acc, z) => acc + z.pollutionLevel, 0) / ecosystem.zones.length;
  const healthScore = Math.round(Math.max(10, Math.min(100, (avgMoisture * 60) + ((1 - avgPollution) * 40))));

  return {
    ...ecosystem,
    soilMoisture: ecosystem.soilMoisture,
    habitatHealthScore: healthScore,
    wildlifeAgents: updatedWildlife,
    forestTrees: updatedTrees,
    npcs: updatedNpcs,
    lastTickTimestamp: Date.now()
  };
}

export function recordSpeciesDiscovery(
  ecosystem: EcosystemSimulationData,
  species: CreatureSpecies | string
): EcosystemSimulationData {
  const journal = ecosystem.journal.map((entry) => {
    if (entry.species === species) {
      return {
        ...entry,
        discovered: true,
        observationCount: entry.observationCount + 1,
        lastObservedDay: entry.lastObservedDay || 1
      };
    }
    return entry;
  });
  return { ...ecosystem, journal };
}
