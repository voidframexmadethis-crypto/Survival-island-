export type DragonElement = 'Ember' | 'Frost' | 'Storm' | 'Shadow';
export type DragonStage = 'Hatchling' | 'Juvenile' | 'Adult';

export interface DragonCompanion {
  id: string;
  name: string;
  elements: DragonElement[];
  stage: DragonStage;
  growth: number; // 0 to 100
  speed: number;
  isMounted: boolean;
}

export interface DragonPlayerRef {
  mountedDragonId: string | null;
}

export interface DragonFlightSystem {
  flying: boolean;
  flySpeed: number;
  toggleFlight: (active: boolean) => void;
}

export const DRAGON_VALLEY_SYSTEM = {
  maxActiveDragons: 6, // Cap active dragons so frame pacing stays steady

  elements: ['Ember', 'Frost', 'Storm', 'Shadow'] as DragonElement[],

  hatchEgg(
    eggType: DragonElement = 'Ember',
    customName = 'Unnamed Wyrm',
  ): DragonCompanion {
    return {
      id: 'drg_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      name: customName.trim() || 'Unnamed Wyrm',
      elements: [eggType],
      stage: 'Hatchling', // Hatchling -> Juvenile -> Adult
      growth: 0, // 0 to 100
      speed: 38,
      isMounted: false,
    };
  },

  feedAndRaise(dragon: DragonCompanion, amount = 35): DragonCompanion {
    dragon.growth = Math.min(100, dragon.growth + amount);
    if (dragon.growth >= 100) {
      dragon.stage = 'Adult';
      dragon.speed = 54;
    } else if (dragon.growth >= 40) {
      dragon.stage = 'Juvenile';
      dragon.speed = 45;
    }
    return dragon;
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

    return {
      id: 'hyb_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      name: comboTitle,
      elements: mergedElements,
      stage: 'Juvenile',
      growth: 50,
      speed: Math.max(dragonA.speed, dragonB.speed) + 6,
      isMounted: false,
    };
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
    dragon.name = cleanName;
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
};
