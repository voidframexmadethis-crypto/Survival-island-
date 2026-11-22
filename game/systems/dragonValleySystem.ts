export type DragonElement = 'Ember' | 'Frost' | 'Storm' | 'Shadow';
export type DragonStage = 'Hatchling' | 'Juvenile' | 'Adult';
export type DragonRarity = 'Common' | 'Rare' | 'Epic' | 'Legendary';
export type DragonCardSource = 'Starter' | 'Hatched' | 'Rescued' | 'Hybrid';

export interface DragonCard {
  id: string;
  name: string;
  species: string;
  elements: DragonElement[];
  rarity: DragonRarity;
  stage: DragonStage;
  source: DragonCardSource;
}

export type Dragon = {
  id: string;
  name: string;
  species: string;
  color: string;
  age: number;
  hunger: number;
  bond: number;
  hatched: boolean;
  rideable: boolean;
};

export interface DragonCompanion extends Dragon {
  elements: DragonElement[];
  stage: DragonStage;
  growth: number; // 0 to 100
  speed: number;
  isMounted: boolean;
  daysRaised: number; // island days since hatching, capped at DRAGON_ADULT_DAYS
  health: number;
  maxHealth: number;
}

export const DRAGON_ADULT_DAYS = 16;

export function dragonHealthForDays(daysRaised: number): { health: number; maxHealth: number } {
  const ratio = Math.max(0, Math.min(1, daysRaised / DRAGON_ADULT_DAYS));
  const maxHealth = 100;
  return {
    health: Math.round(20 + ratio * (maxHealth - 20)),
    maxHealth,
  };
}

export function daysFromDragonProgress(age: number, growth: number): number {
  if (age >= 3 || growth >= 100) return DRAGON_ADULT_DAYS;
  if (age >= 2) return 11;
  if (age >= 1) return 6;
  return Math.max(0, Math.min(DRAGON_ADULT_DAYS, Math.round((growth / 100) * DRAGON_ADULT_DAYS)));
}

export interface DragonPlayerRef {
  mountedDragonId: string | null;
}

export interface DragonFlightSystem {
  flying: boolean;
  flySpeed: number;
  toggleFlight: (active: boolean) => void;
}

export interface DragonColorOption {
  id: string;
  label: string;
  hex: string;
}

export const DRAGON_COLOR_OPTIONS: DragonColorOption[] = [
  { id: 'Original', label: 'Original', hex: '#ea580c' },
  { id: 'Crimson', label: 'Crimson Flame', hex: '#dc2626' },
  { id: 'Frostbite', label: 'Frostbite Blue', hex: '#0284c7' },
  { id: 'Stormgold', label: 'Stormgold', hex: '#eab308' },
  { id: 'Obsidian', label: 'Obsidian Night', hex: '#334155' },
  { id: 'Emerald', label: 'Verdant Emerald', hex: '#10b981' },
  { id: 'Amethyst', label: 'Void Amethyst', hex: '#9333ea' },
];

export const DRAGON_SPECIES_INFO: Record<
  DragonElement,
  { species: string; baseColor: string; tagline: string }
> = {
  Ember: {
    species: 'Ember',
    baseColor: 'Original',
    tagline: 'Volcanic flame wyrm forged in magma vents',
  },
  Frost: {
    species: 'Frost',
    baseColor: 'Original',
    tagline: 'Glacial mountain drake with ice-crystal wings',
  },
  Storm: {
    species: 'Storm',
    baseColor: 'Original',
    tagline: 'High-altitude thunder serpent from sea squalls',
  },
  Shadow: {
    species: 'Shadow',
    baseColor: 'Original',
    tagline: 'Nocturnal obsidian wyvern from deep caverns',
  },
};

function generateDragonUuid(): string {
  if (
    typeof globalThis !== 'undefined' &&
    globalThis.crypto &&
    typeof globalThis.crypto.randomUUID === 'function'
  ) {
    return globalThis.crypto.randomUUID();
  }
  return `drg_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
}

export function resolveElementsFromSpecies(species: string): DragonElement[] {
  const normalized = species.toLowerCase();
  const found: DragonElement[] = [];
  if (normalized.includes('ember') || normalized.includes('fire') || normalized.includes('red')) {
    found.push('Ember');
  }
  if (normalized.includes('frost') || normalized.includes('ice')) {
    found.push('Frost');
  }
  if (normalized.includes('storm') || normalized.includes('thunder') || normalized.includes('skrill')) {
    found.push('Storm');
  }
  if (normalized.includes('shadow') || normalized.includes('void') || normalized.includes('night')) {
    found.push('Shadow');
  }
  return found.length > 0 ? found.slice(0, 2) : ['Ember'];
}

export function stageFromAgeAndGrowth(age: number, growth: number): DragonStage {
  if (age >= 3 || growth >= 100) return 'Adult';
  if (age >= 1 || growth >= 40) return 'Juvenile';
  return 'Hatchling';
}

export function speedFromDragon(age: number, bond: number, elements: DragonElement[]): number {
  const base = age >= 3 ? 54 : age >= 1 ? 45 : 38;
  const bondBonus = Math.min(10, Math.floor(bond / 10));
  const hybridBonus = elements.length > 1 ? 4 : 0;
  return base + bondBonus + hybridBonus;
}

export function rarityFromElements(
  elements: DragonElement[],
  species = '',
): DragonRarity {
  if (elements.length > 1 || species.includes('-')) return 'Legendary';
  if (elements.includes('Shadow')) return 'Epic';
  if (elements.includes('Storm')) return 'Rare';
  return 'Common';
}

export function createDragonCard(
  dragon: DragonCompanion,
  source: DragonCardSource,
): DragonCard {
  return {
    id: dragon.id,
    name: dragon.name,
    species: dragon.species,
    elements: [...dragon.elements],
    rarity: rarityFromElements(dragon.elements, dragon.species),
    stage: dragon.stage,
    source,
  };
}

export const dragonValley = {
  eggs: [] as string[],
  dragons: [] as Dragon[],
  cards: [] as DragonCard[],
  rescuedEncounterIds: [] as string[],

  collectEgg(species: string): void {
    this.eggs.push(species);
  },

  hatchEgg(species: string, name: string): Dragon | null {
    const index = this.eggs.indexOf(species);
    if (index < 0) return null;

    this.eggs.splice(index, 1);
    const dragon: Dragon = {
      id: generateDragonUuid(),
      name,
      species,
      color: 'Original',
      age: 0,
      hunger: 100,
      bond: 0,
      hatched: true,
      rideable: false,
    };

    this.dragons.push(dragon);
    return dragon;
  },

  feed(id: string): void {
    const d = this.dragons.find((x) => x.id === id);
    if (d) {
      d.hunger = Math.min(100, d.hunger + 25);
      d.bond += 5;
    }
  },

  rename(id: string, name: string): void {
    const d = this.dragons.find((x) => x.id === id);
    if (d) d.name = name;
  },

  customizeColor(id: string, color: string): void {
    const d = this.dragons.find((x) => x.id === id);
    if (d) d.color = color;
  },

  grow(id: string): void {
    const d = this.dragons.find((x) => x.id === id);
    if (d) {
      d.age++;
      if (d.age >= 3) d.rideable = true;
    }
  },

  canRide(id: string): boolean {
    return this.dragons.find((x) => x.id === id)?.rideable ?? false;
  },
};

export interface DragonValleySaveData {
  eggs: string[];
  dragons: DragonCompanion[];
  cards?: DragonCard[];
  rescuedEncounterIds?: string[];
}

export const DRAGON_VALLEY_SYSTEM = {
  maxActiveDragons: 6, // Cap active dragons so frame pacing stays steady

  elements: ['Ember', 'Frost', 'Storm', 'Shadow'] as DragonElement[],

  resetToStarter(): DragonCompanion[] {
    dragonValley.eggs = ['Ember', 'Frost'];
    dragonValley.dragons = [];
    dragonValley.cards = [];
    dragonValley.rescuedEncounterIds = [];
    const starter: DragonCompanion = {
      id: generateDragonUuid(),
      name: 'Ignis',
      species: 'Ember',
      color: 'Original',
      age: 1,
      hunger: 100,
      bond: 10,
      hatched: true,
      rideable: false,
      elements: ['Ember'],
      stage: 'Juvenile',
      growth: 35,
      speed: 46,
      isMounted: false,
      daysRaised: 6,
      ...dragonHealthForDays(6),
    };
    dragonValley.dragons.push({
      id: starter.id,
      name: starter.name,
      species: starter.species,
      color: starter.color,
      age: starter.age,
      hunger: starter.hunger,
      bond: starter.bond,
      hatched: starter.hatched,
      rideable: starter.rideable,
    });
    this.recordDragonCard(starter, 'Starter');
    return [starter];
  },

  recordDragonCard(dragon: DragonCompanion, source: DragonCardSource): DragonCard {
    const card = createDragonCard(dragon, source);
    const existing = dragonValley.cards.find((c) => c.id === card.id);
    if (!existing) dragonValley.cards.push(card);
    return existing ?? card;
  },

  hasRescuedEncounter(id: string): boolean {
    return dragonValley.rescuedEncounterIds.includes(id);
  },

  markEncounterRescued(id: string): void {
    if (!dragonValley.rescuedEncounterIds.includes(id)) {
      dragonValley.rescuedEncounterIds.push(id);
    }
  },

  syncCompanionFromCore(companion: DragonCompanion): DragonCompanion {
    const core = dragonValley.dragons.find((d) => d.id === companion.id);
    if (core) {
      companion.name = core.name;
      companion.species = core.species;
      companion.color = core.color;
      companion.age = core.age;
      companion.hunger = core.hunger;
      companion.bond = core.bond;
      companion.hatched = core.hatched;
      companion.rideable = core.rideable;
      companion.stage = stageFromAgeAndGrowth(core.age, companion.growth);
      companion.speed = speedFromDragon(core.age, core.bond, companion.elements);
    }
    return companion;
  },

  ensureCoreEntry(companion: DragonCompanion): void {
    const existing = dragonValley.dragons.find((d) => d.id === companion.id);
    if (!existing) {
      dragonValley.dragons.push({
        id: companion.id,
        name: companion.name,
        species: companion.species || companion.elements.join('-'),
        color: companion.color || 'Original',
        age: companion.age ?? 0,
        hunger: companion.hunger ?? 100,
        bond: companion.bond ?? 0,
        hatched: companion.hatched ?? true,
        rideable: companion.rideable ?? false,
      });
    }
  },

  hatchEgg(
    eggType: DragonElement = 'Ember',
    customName = 'Unnamed Wyrm',
    requireCollectedEgg = false,
  ): DragonCompanion | null {
    const cleanName = customName.trim() || `${eggType} Wyrm`;
    let coreDragon: Dragon | null = null;

    if (requireCollectedEgg) {
      coreDragon = dragonValley.hatchEgg(eggType, cleanName);
      if (!coreDragon) return null;
    } else {
      if (dragonValley.eggs.includes(eggType)) {
        coreDragon = dragonValley.hatchEgg(eggType, cleanName);
      } else {
        coreDragon = {
          id: generateDragonUuid(),
          name: cleanName,
          species: eggType,
          color: 'Original',
          age: 0,
          hunger: 100,
          bond: 0,
          hatched: true,
          rideable: false,
        };
        dragonValley.dragons.push(coreDragon);
      }
    }

    if (!coreDragon) return null;
    const elements = resolveElementsFromSpecies(coreDragon.species);
    return {
      ...coreDragon,
      elements,
      stage: 'Hatchling',
      growth: 0,
      speed: speedFromDragon(coreDragon.age, coreDragon.bond, elements),
      isMounted: false,
      daysRaised: 0,
      ...dragonHealthForDays(0),
    };
  },

  feedAndRaise(dragon: DragonCompanion, amount = 35): DragonCompanion {
    this.ensureCoreEntry(dragon);
    dragonValley.feed(dragon.id);
    dragon.growth = Math.min(100, dragon.growth + amount);

    // Every full growth milestone advances age smoothly up to rideable adult (age >= 3)
    const core = dragonValley.dragons.find((x) => x.id === dragon.id);
    if (core) {
      if (dragon.growth >= 100 && core.age < 3) {
        while (core.age < 3) {
          dragonValley.grow(core.id);
        }
      } else if (dragon.growth >= 66 && core.age < 2) {
        dragonValley.grow(core.id);
      } else if (dragon.growth >= 34 && core.age < 1) {
        dragonValley.grow(core.id);
      }
    }
    return this.syncCompanionFromCore(dragon);
  },

  growDragon(dragon: DragonCompanion): DragonCompanion {
    this.ensureCoreEntry(dragon);
    dragonValley.grow(dragon.id);
    const core = dragonValley.dragons.find((x) => x.id === dragon.id);
    if (core) {
      dragon.growth = Math.min(100, Math.max(dragon.growth, Math.round((core.age / 3) * 100)));
    }
    return this.syncCompanionFromCore(dragon);
  },

  customizeColor(dragon: DragonCompanion, color: string): DragonCompanion {
    this.ensureCoreEntry(dragon);
    const clean = color.trim().slice(0, 28) || 'Original';
    dragonValley.customizeColor(dragon.id, clean);
    return this.syncCompanionFromCore(dragon);
  },

  combineDragons(
    dragonA: DragonCompanion,
    dragonB: DragonCompanion,
    hybridName?: string,
  ): DragonCompanion {
    const mergedElements = Array.from(
      new Set<DragonElement>([
        ...(dragonA.elements || []),
        ...(dragonB.elements || []),
      ]),
    ).slice(0, 2);

    const comboTitle =
      (hybridName && hybridName.trim()) ||
      mergedElements.join('-') + ' Drake';

    const core: Dragon = {
      id: generateDragonUuid(),
      name: comboTitle,
      species: mergedElements.join('-'),
      color: 'Original',
      age: 2,
      hunger: 100,
      bond: Math.max(15, Math.round((dragonA.bond + dragonB.bond) * 0.6)),
      hatched: true,
      rideable: false,
    };
    dragonValley.dragons.push(core);

    return {
      ...core,
      elements: mergedElements,
      stage: 'Juvenile',
      growth: 67,
      speed: Math.max(dragonA.speed, dragonB.speed) + 6,
      isMounted: false,
      daysRaised: 11,
      ...dragonHealthForDays(11),
    };
  },

  advanceDays(dragons: DragonCompanion[], days = 1): DragonCompanion[] {
    const changed: DragonCompanion[] = [];
    if (days <= 0) return changed;
    for (const dragon of dragons) {
      if ((dragon.daysRaised ?? 0) >= DRAGON_ADULT_DAYS) continue;
      this.ensureCoreEntry(dragon);
      const nextDays = Math.min(DRAGON_ADULT_DAYS, (dragon.daysRaised ?? 0) + days);
      dragon.daysRaised = nextDays;
      dragon.growth = Math.max(
        dragon.growth,
        Math.round((nextDays / DRAGON_ADULT_DAYS) * 100),
      );
      const core = dragonValley.dragons.find((entry) => entry.id === dragon.id);
      if (core) {
        const targetAge = nextDays >= 16 ? 3 : nextDays >= 11 ? 2 : nextDays >= 6 ? 1 : 0;
        while (core.age < targetAge) dragonValley.grow(core.id);
      }
      const health = dragonHealthForDays(nextDays);
      dragon.health = health.health;
      dragon.maxHealth = health.maxHealth;
      this.syncCompanionFromCore(dragon);
      changed.push(dragon);
    }
    return changed;
  },

  // Anvil + Name Tag workflow: renames a dragon or customizes its display tag
  applyAnvilNameTag(
    dragon: DragonCompanion,
    rawTagText: string,
    hasAnvil = true,
    hasNameTag = true,
  ): { ok: true; name: string } | { ok: false; reason: string } {
    if (!hasAnvil || !hasNameTag) {
      return { ok: false, reason: 'Requires both an Anvil and a Name Tag.' };
    }
    const cleanName = String(rawTagText || '')
      .replace(/[<>]/g, '')
      .trim()
      .slice(0, 24);
    if (!cleanName) {
      return { ok: false, reason: 'Enter a name on the tag first.' };
    }
    this.ensureCoreEntry(dragon);
    dragonValley.rename(dragon.id, cleanName);
    this.syncCompanionFromCore(dragon);
    return { ok: true, name: dragon.name };
  },

  toggleMount(
    player: DragonPlayerRef,
    dragon: DragonCompanion,
    flightSystem?: DragonFlightSystem,
  ): boolean {
    const mounting = !dragon.isMounted;
    dragon.isMounted = mounting;
    player.mountedDragonId = mounting ? dragon.id : null;

    if (flightSystem && typeof flightSystem.toggleFlight === 'function') {
      flightSystem.toggleFlight(mounting);
      if (mounting) {
        flightSystem.flySpeed = dragon.speed || 48;
      }
    }
    return mounting;
  },

  exportSave(companions: DragonCompanion[]): DragonValleySaveData {
    return {
      eggs: [...dragonValley.eggs],
      dragons: companions.map((d) => ({
        ...d,
        elements: [...d.elements],
        isMounted: false,
      })),
      cards: dragonValley.cards.map((c) => ({ ...c, elements: [...c.elements] })),
      rescuedEncounterIds: [...dragonValley.rescuedEncounterIds],
    };
  },

  importSave(save?: DragonValleySaveData | null): DragonCompanion[] {
    if (!save) {
      return this.resetToStarter();
    }
    dragonValley.eggs = Array.isArray(save.eggs) ? save.eggs.map((e) => String(e)) : [];
    const companions: DragonCompanion[] = Array.isArray(save.dragons)
      ? save.dragons.map((d) => {
          const elements =
            Array.isArray(d.elements) && d.elements.length > 0
              ? d.elements
              : resolveElementsFromSpecies(d.species || 'Ember');
          const age = typeof d.age === 'number' ? d.age : d.stage === 'Adult' ? 3 : d.stage === 'Juvenile' ? 1 : 0;
          const bond = typeof d.bond === 'number' ? d.bond : 0;
          const hunger = typeof d.hunger === 'number' ? d.hunger : 100;
          const rideable = typeof d.rideable === 'boolean' ? d.rideable : age >= 3;
          return {
            id: d.id || generateDragonUuid(),
            name: d.name || 'Wyrm',
            species: d.species || elements.join('-'),
            color: d.color || 'Original',
            age,
            hunger,
            bond,
            hatched: d.hatched ?? true,
            rideable,
            elements,
            stage: stageFromAgeAndGrowth(age, d.growth ?? 0),
            growth: typeof d.growth === 'number' ? d.growth : Math.min(100, age * 34),
            speed: typeof d.speed === 'number' ? d.speed : speedFromDragon(age, bond, elements),
            isMounted: false,
            daysRaised:
              typeof d.daysRaised === 'number'
                ? Math.min(DRAGON_ADULT_DAYS, d.daysRaised)
                : daysFromDragonProgress(age, d.growth ?? 0),
            ...dragonHealthForDays(
              typeof d.daysRaised === 'number'
                ? Math.min(DRAGON_ADULT_DAYS, d.daysRaised)
                : daysFromDragonProgress(age, d.growth ?? 0),
            ),
          };
        })
      : [];
    dragonValley.dragons = companions.map((c) => ({
      id: c.id,
      name: c.name,
      species: c.species,
      color: c.color,
      age: c.age,
      hunger: c.hunger,
      bond: c.bond,
      hatched: c.hatched,
      rideable: c.rideable,
    }));
    dragonValley.cards = Array.isArray(save.cards)
      ? save.cards.map((c) => {
          const elements =
            Array.isArray(c.elements) && c.elements.length > 0
              ? c.elements
              : resolveElementsFromSpecies(c.species || 'Ember');
          return {
            id: c.id,
            name: c.name,
            species: c.species || elements.join('-'),
            elements,
            rarity: c.rarity ?? rarityFromElements(elements, c.species),
            stage: c.stage ?? 'Adult',
            source: c.source ?? 'Hatched',
          };
        })
      : companions.map((c) => createDragonCard(c, 'Hatched'));
    dragonValley.rescuedEncounterIds = Array.isArray(save.rescuedEncounterIds)
      ? save.rescuedEncounterIds.map((id) => String(id))
      : [];
    return companions;
  },
};
