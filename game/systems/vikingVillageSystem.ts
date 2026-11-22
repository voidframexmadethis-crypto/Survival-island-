import { ItemId } from '../types';
import { DragonElement } from './dragonValleySystem';

export type VikingVillager = {
  id: string;
  name: string;
  friendly: boolean;
  role?: string;
  dialogue?: string[];
};

export type VikingInteractionResult = {
  conversation: true;
  villager: VikingVillager;
  trading: true;
  quests: true;
};

export interface VikingTradeOffer {
  id: string;
  title: string;
  description: string;
  costCoins: number;
  giveItemId?: ItemId;
  giveQuantity?: number;
  giveDragonEgg?: DragonElement;
}

export interface VikingQuestDefinition {
  id: string;
  title: string;
  giverId: string;
  description: string;
  requirementType: 'items' | 'red_dragon';
  requiredItems?: { itemId: ItemId; quantity: number }[];
  rewardCoins: number;
  rewardItems?: { itemId: ItemId; quantity: number }[];
  rewardDragonEgg?: DragonElement;
}

export interface VikingVillageSaveData {
  completedQuestIds: string[];
  reputation: number;
}

const DEFAULT_VIKING_VILLAGERS: VikingVillager[] = [
  {
    id: 'viking_jarl_erik',
    name: 'Jarl Erik Ironbeard',
    friendly: true,
    role: 'Jarl of Fjellhavn',
    dialogue: [
      'Hail, traveler! Welcome to our Nordic longhouse by the eastern fjord.',
      'Seek the Red Dragon Lair among the island caves—only its victor may soar atop grown dragons.',
      'Bring timber, fish, or dragonscale ore and our clan will reward you well.',
    ],
  },
  {
    id: 'viking_astrild',
    name: 'Astrild the Runesmith',
    friendly: true,
    role: 'Runesmith & Armorer',
    dialogue: [
      'My forge burns hotter than Dragon Valley magma. Need iron, blades, or heavy stone weapons?',
      'A dragon must reach Age 3 in the Sanctuary before it is strong enough to bear a rider.',
    ],
  },
  {
    id: 'viking_bjorn',
    name: 'Bjorn the Shipwright',
    friendly: true,
    role: 'Longship Master',
    dialogue: [
      'That longship weathered three storms to reach this island. Rope and dry rations keep a crew alive.',
      'Explore Dragon Valley to the northwest of here—wild elemental eggs rest among the obsidian spires!',
    ],
  },
  {
    id: 'viking_freya',
    name: 'Freya the Dragon-Keeper',
    friendly: true,
    role: 'Beast-Tamer & Egg Trader',
    dialogue: [
      'Feed your hatchlings often! Every meal raises their bond and prepares them to grow.',
      'I trade rare Storm and Shadow eggs to explorers who prove their courage.',
    ],
  },
];

export const VIKING_TRADE_OFFERS: VikingTradeOffer[] = [
  {
    id: 'vt_hearty_stew',
    title: 'Viking Hearth Stew ×2',
    description: 'Rich slow-simmered provisions for long cave expeditions.',
    costCoins: 28,
    giveItemId: 'hearty_stew',
    giveQuantity: 2,
  },
  {
    id: 'vt_iron_ingot',
    title: 'Forged Iron Ingots ×3',
    description: 'Smelted Nordic iron ready for heavy crafting.',
    costCoins: 45,
    giveItemId: 'iron_ingot',
    giveQuantity: 3,
  },
  {
    id: 'vt_warhammer',
    title: 'Nordic Stone Warhammer',
    description: 'Heavy two-handed crusher forged by Astrild.',
    costCoins: 55,
    giveItemId: 'stone_warhammer',
    giveQuantity: 1,
  },
  {
    id: 'vt_fjord_magnum',
    title: 'Fjord-Wolf .44 Magnum',
    description: 'Runed long-barrel revolver traded by Jarl Erik for dragon-valley hunts.',
    costCoins: 145,
    giveItemId: 'magnum_44',
    giveQuantity: 1,
  },
  {
    id: 'vt_longship_sawed_off',
    title: 'Longship Boarding Shotgun',
    description: 'Short-barrel deck sweeper kept loaded beside the longship mast.',
    costCoins: 120,
    giveItemId: 'sawed_off',
    giveQuantity: 1,
  },
  {
    id: 'vt_magnum_ammo',
    title: '.44 Cartridges ×18',
    description: 'Heavy rune-etched rounds for the Fjord-Wolf revolver.',
    costCoins: 26,
    giveItemId: 'ammo',
    giveQuantity: 18,
  },
  {
    id: 'vt_valhalla_feast',
    title: 'Valhalla Fire Feast ×3',
    description: 'Hearth-roasted meat carved fresh from the clan spit.',
    costCoins: 42,
    giveItemId: 'roasted_meat',
    giveQuantity: 3,
  },
  {
    id: 'vt_grilled_fjord_fish',
    title: 'Grilled Fjord Fish ×2',
    description: 'Salt-crusted ocean fish seared over the longhouse hearth.',
    costCoins: 30,
    giveItemId: 'grilled_fish',
    giveQuantity: 2,
  },
  {
    id: 'vt_bow_arrows',
    title: 'Hunting Arrows ×16',
    description: 'Fletched ashwood arrows for cave beasts.',
    costCoins: 32,
    giveItemId: 'arrows',
    giveQuantity: 16,
  },
  {
    id: 'vt_storm_egg',
    title: 'Storm Dragon Egg',
    description: 'Collected from sea-cliff thunder nests by Freya.',
    costCoins: 90,
    giveDragonEgg: 'Storm',
  },
  {
    id: 'vt_shadow_egg',
    title: 'Shadow Dragon Egg',
    description: 'Obsidian cavern wyvern egg guarded by the clan.',
    costCoins: 115,
    giveDragonEgg: 'Shadow',
  },
];

export const VIKING_QUESTS: VikingQuestDefinition[] = [
  {
    id: 'vq_longhouse_timber',
    title: 'Reinforce the Mead Hall',
    giverId: 'viking_jarl_erik',
    description: 'Bring 8 Wood and 4 Stone to strengthen the Viking longhouse.',
    requirementType: 'items',
    requiredItems: [
      { itemId: 'wood', quantity: 8 },
      { itemId: 'stone', quantity: 4 },
    ],
    rewardCoins: 65,
    rewardItems: [{ itemId: 'iron_ingot', quantity: 2 }],
    rewardDragonEgg: 'Frost',
  },
  {
    id: 'vq_hearth_catch',
    title: 'Provisions for the Longship',
    giverId: 'viking_bjorn',
    description: 'Supply 3 Ocean Fish and 4 Berries for the moored longship crew.',
    requirementType: 'items',
    requiredItems: [
      { itemId: 'ocean_fish', quantity: 3 },
      { itemId: 'berries', quantity: 4 },
    ],
    rewardCoins: 55,
    rewardItems: [{ itemId: 'hearty_stew', quantity: 2 }],
  },
  {
    id: 'vq_runesmith_ore',
    title: 'Forging the Runeblade',
    giverId: 'viking_astrild',
    description: 'Deliver 4 Metal Ore so Astrild can temper dragon-tier steel.',
    requirementType: 'items',
    requiredItems: [{ itemId: 'metal_ore', quantity: 4 }],
    rewardCoins: 95,
    rewardItems: [{ itemId: 'gold_bar', quantity: 1 }],
  },
  {
    id: 'vq_slay_red_dragon',
    title: 'Bane of the Red Dragon',
    giverId: 'viking_freya',
    description: 'Locate the Red Dragon Cave and defeat the Red Dragon Boss.',
    requirementType: 'red_dragon',
    rewardCoins: 240,
    rewardItems: [{ itemId: 'diamond', quantity: 2 }],
    rewardDragonEgg: 'Shadow',
  },
];

export const vikingVillage = {
  villagers: DEFAULT_VIKING_VILLAGERS.map((v) => ({ ...v, dialogue: v.dialogue ? [...v.dialogue] : [] })),
  completedQuestIds: [] as string[],
  reputation: 0,

  reset(): void {
    this.villagers = DEFAULT_VIKING_VILLAGERS.map((v) => ({
      ...v,
      dialogue: v.dialogue ? [...v.dialogue] : [],
    }));
    this.completedQuestIds = [];
    this.reputation = 0;
  },

  interact(id: string): VikingInteractionResult | null {
    const villager = this.villagers.find((v) => v.id === id);
    return villager
      ? {
          conversation: true,
          villager,
          trading: true,
          quests: true,
        }
      : null;
  },

  markQuestCompleted(questId: string): void {
    if (!this.completedQuestIds.includes(questId)) {
      this.completedQuestIds.push(questId);
      this.reputation += 10;
    }
  },

  exportSave(): VikingVillageSaveData {
    return {
      completedQuestIds: [...this.completedQuestIds],
      reputation: this.reputation,
    };
  },

  importSave(save?: VikingVillageSaveData | null): void {
    this.reset();
    if (!save) return;
    this.completedQuestIds = Array.isArray(save.completedQuestIds)
      ? save.completedQuestIds.map(String)
      : [];
    this.reputation = typeof save.reputation === 'number' ? save.reputation : 0;
  },
};
