export type GrandFinaleZoneKey =
  | 'dragon valley'
  | 'viking village'
  | 'resort corner'
  | 'ruined castle';

export type TikiDrinkKey = 'coconut_surge' | 'mango_shield' | 'sunset_fizz';

export interface GrandFinaleZoneConfig {
  id: 'dragon_valley' | 'viking_village' | 'resort_corner' | 'ruined_castle';
  x: number;
  z: number;
  yClearance: number;
  mountType?: 'dragon' | null;
  hasJetSkis?: boolean;
  hasTikiLounge?: boolean;
  bossName?: string;
  maxEntities: number;
  drops: string[];
}

export interface TikiDrinkSpec {
  label: string;
  speedBoost?: number;
  ghostDefense?: number;
  healFull?: boolean;
  duration: number;
}

export interface GrandFinaleActiveBuff {
  name: string;
  speedBoost: number;
  ghostDefense: number;
  expiresAt: number;
}

export interface GrandFinalePlayerState {
  hp?: number;
  maxHp?: number;
  activeBuff?: GrandFinaleActiveBuff | null;
}

export interface GrandFinaleGhostEntity {
  id: string;
  zoneKey: GrandFinaleZoneKey;
  x: number;
  z: number;
  hp: number;
  maxHp: number;
  active: boolean;
  isBoss?: boolean;
  name: string;
}

export const GRAND_FINALE_PACK = {
  zones: {
    'dragon valley': {
      id: 'dragon_valley',
      x: 420,
      z: -380,
      yClearance: 10,
      mountType: 'dragon',
      maxEntities: 5,
      drops: ['Dragon Scale', 'Portal Core', 'Turbo Manifold'],
    },
    'viking village': {
      id: 'viking_village',
      x: 560,
      z: -260,
      yClearance: 6,
      mountType: null,
      maxEntities: 6,
      drops: ['Viking Shield', 'Runed Rim Set', 'Portal Shard'],
    },
    'resort corner': {
      id: 'resort_corner',
      x: -480,
      z: 410,
      yClearance: 4,
      hasJetSkis: true,
      hasTikiLounge: true,
      maxEntities: 4,
      drops: ['Hydraulic Pump', 'Beach Key', 'Portal Shard'],
    },
    'ruined castle': {
      id: 'ruined_castle',
      x: -360,
      z: -520,
      yClearance: 6,
      bossName: 'Fallen King Ghost',
      maxEntities: 7,
      drops: [
        'Crown Portal Core',
        'Golden V8 Block',
        'Royal Hydraulics',
        'Ghost-Forged Rims',
      ],
    },
  } as Record<GrandFinaleZoneKey, GrandFinaleZoneConfig>,

  tikiDrinks: {
    coconut_surge: { label: 'Coconut Surge', speedBoost: 1.35, duration: 25 },
    mango_shield: { label: 'Mango Shield', ghostDefense: 0.5, duration: 25 },
    sunset_fizz: { label: 'Sunset Fizz', healFull: true, duration: 10 },
  } as Record<TikiDrinkKey, TikiDrinkSpec>,

  // Lightweight proximity check (only runs when player is inside/near a zone)
  checkZoneInteractions(
    player: GrandFinalePlayerState,
    nearbyGhosts: GrandFinaleGhostEntity[],
    onLootDrop?: (item: string, zoneKey: GrandFinaleZoneKey) => void,
    _onBuffApplied?: (label: string, duration: number) => void,
  ): GrandFinalePlayerState {
    void _onBuffApplied;
    for (let i = 0; i < nearbyGhosts.length; i++) {
      const g = nearbyGhosts[i];
      if (!g.active || g.hp > 0) continue;

      g.active = false;
      const zone = this.zones[g.zoneKey];
      const pool = (zone && zone.drops) || ['Portal Shard', 'Spare Rim'];
      const item = pool[Math.floor(Math.random() * pool.length)];

      if (typeof onLootDrop === 'function') {
        onLootDrop(item, g.zoneKey);
      }
    }
    return player;
  },

  serveTikiDrink(
    player: GrandFinalePlayerState,
    drinkKey: TikiDrinkKey,
    onBuffApplied?: (label: string, duration: number) => void,
  ): GrandFinaleActiveBuff | null {
    const drink = this.tikiDrinks[drinkKey];
    if (!drink) return null;

    player.activeBuff = {
      name: drink.label,
      speedBoost: drink.speedBoost || 1,
      ghostDefense: drink.ghostDefense || 0,
      expiresAt: performance.now() + drink.duration * 1000,
    };

    if (drink.healFull && player.hp !== undefined && player.maxHp !== undefined) {
      player.hp = player.maxHp;
    }

    if (typeof onBuffApplied === 'function') {
      onBuffApplied(drink.label, drink.duration);
    }
    return player.activeBuff;
  },
};
