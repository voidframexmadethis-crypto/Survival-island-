import { MissionCheckContext, MissionDefinition } from '../types';

function countItem(ctx: MissionCheckContext, itemId: string): number {
  return ctx.inventory
    .filter((s) => s.itemId === itemId)
    .reduce((sum, s) => sum + s.quantity, 0);
}

export const STAGE_1_MISSIONS: MissionDefinition[] = [
  {
    id: 'mission_survive_shipwreck',
    title: 'MISSION 1: Survive the Shipwreck',
    description:
      'Search the wreckage along the beach, secure fresh water, gather wood and stone, craft a tool, build a campfire, and raise a simple shelter.',
    hint: 'Follow the 7 shipwreck survival checklist steps below.',
    targetCount: 7,
    steps: [
      {
        label: '1. Search the beach',
        done: (ctx) => ctx.visitedBiomes.includes('beach'),
      },
      {
        label: '2. Collect useful supplies from shipwreck crates',
        done: (ctx) => ctx.stats.shipwreckCratesSearched >= 1,
      },
      {
        label: '3. Find and drink fresh water',
        done: (ctx) =>
          ctx.stats.freshWaterDrunk >= 1 ||
          ctx.visitedBiomes.includes('river') ||
          ctx.visitedBiomes.includes('lake'),
      },
      {
        label: '4. Gather wood and stone',
        done: (ctx) =>
          countItem(ctx, 'wood') >= 2 && countItem(ctx, 'stone') >= 2,
      },
      {
        label: '5. Craft a basic tool',
        done: (ctx) =>
          countItem(ctx, 'stone_axe') > 0 ||
          countItem(ctx, 'stone_pickaxe') > 0 ||
          countItem(ctx, 'hunting_knife') > 0 ||
          countItem(ctx, 'wooden_club') > 0,
      },
      {
        label: '6. Build a campfire',
        done: (ctx) => ctx.structures.some((s) => s.type === 'campfire'),
      },
      {
        label: '7. Construct a basic shelter',
        done: (ctx) => ctx.structures.some((s) => s.type === 'basic_shelter'),
      },
    ],
    checkProgress: (ctx) => {
      const m = STAGE_1_MISSIONS[0];
      return (m.steps || []).filter((s) => s.done(ctx)).length;
    },
  },
  {
    id: 'mission_hunt_and_roast',
    title: 'Hunt & Roast a Meal',
    description: 'Hunt island wildlife for raw meat and roast it over a Campfire.',
    hint: 'Use a Wooden Club, Knife, or Spear to hunt, then interact with a Campfire.',
    targetCount: 1,
    checkProgress: (ctx) => Math.min(1, ctx.stats.mealsCooked),
  },
  {
    id: 'mission_explore_expedition',
    title: 'Discover the Abandoned Expedition',
    description: 'Follow inland paths to locate the earlier survey camp in the jungle.',
    hint: 'Open your Map (M) and explore northeast of Azure Lake.',
    targetCount: 1,
    checkProgress: (ctx) => (ctx.visitedBiomes.includes('expedition') ? 1 : 0),
  },
  {
    id: 'mission_explore_cave',
    title: 'Delve the Obsidian Cavern',
    description: 'Climb the northern rocky peaks, locate the cavern, and mine Raw Metal Ore.',
    hint: 'Head north past the waterfall cliffs to find the dark cavern entrance.',
    targetCount: 1,
    checkProgress: (ctx) =>
      ctx.visitedBiomes.includes('cave') && countItem(ctx, 'metal_ore') > 0
        ? 1
        : 0,
  },
  {
    id: 'mission_establish_camp',
    title: 'Expand Your Base Camp',
    description: 'Construct a Crafting Station and Basic Storage Box beside your shelter.',
    hint: 'Craft both structures and place them near your campfire.',
    targetCount: 2,
    checkProgress: (ctx) => {
      const types = new Set(ctx.structures.map((s) => s.type));
      return (
        (types.has('crafting_table') ? 1 : 0) +
        (types.has('storage_chest') ? 1 : 0)
      );
    },
  },
];
