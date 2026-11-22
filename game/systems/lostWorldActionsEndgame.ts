import type { ItemId } from '../types';
import {
  addPersistentChange,
  allMysteryClues,
  lostWorldLog,
  nextLostWorldRandom,
  type LostWorldActionContext,
  type LostWorldEffects,
  type LostWorldState,
} from './lostWorldExpansion';
import {
  actionFail,
  actionOk,
  adjustDistrict,
  canAfford,
  costLabel,
  distanceTo,
  grant,
  itemCount,
  missingReason,
  spend,
  type ActionEmitter,
  type ActionOutcome,
} from './lostWorldActionShared';

const HOMESTEAD_STAGES: { label: string; description: string; coins: number; items: readonly (readonly [ItemId, number])[] }[] = [
  { label: 'Lay the Homestead Foundation', description: 'Stone footings, level pads and a flood-safe floor.', coins: 40, items: [['stone', 24], ['clay', 6]] },
  { label: 'Frame the Ground Floor', description: 'Timber frame, walls and window openings for a real multi-floor build.', coins: 30, items: [['wood', 30], ['stone', 10]] },
  { label: 'Add Stairs and Roof', description: 'Stair run, upper floor joists and a pitched roof.', coins: 40, items: [['wood', 26], ['fiber', 8]] },
  { label: 'Hang Doors and Finish', description: 'Doors, shutters, trim and a lockable entry.', coins: 40, items: [['wood', 14], ['metal_ore', 4]] },
];

const TREEHOUSE_STAGES: { label: string; description: string; coins: number; items: readonly (readonly [ItemId, number])[] }[] = [
  { label: 'Build the Treehouse Platform', description: 'Select four hardwoods, brace the trunk and lay a platform above the flood line.', coins: 30, items: [['wood', 25], ['rope', 6]] },
  { label: 'Add Climbing Access', description: 'Rope ladders and pegged steps up the trunk.', coins: 20, items: [['wood', 10], ['rope', 4]] },
  { label: 'String a Rope Bridge', description: 'A suspended bridge to the next tree, with hand lines and planks.', coins: 30, items: [['wood', 14], ['rope', 8]] },
  { label: 'Enclose the High Room', description: 'Walls, roof and a trapdoor for the finished treehouse.', coins: 40, items: [['wood', 20], ['fiber', 6]] },
];

const EXCAVATION_ARTIFACTS = [
  'A bronze tide dial with twelve unmarked hours.',
  'A sealed clay jar of salt water that never dries.',
  'A stone tablet showing the island before the water rose.',
  'A door mechanism keyed to the twelve symbols.',
  'A city seal with a name scratched out.',
];

export function describeEndgameActions(
  state: LostWorldState,
  ctx: LostWorldActionContext,
  emit: ActionEmitter,
): void {
  // Feature 36-39: cooperative challenges and shared activities over the real P2P room.
  if (!state.coop.challengeId) {
    emit({
      id: 'coop_challenge_start',
      tab: 'coop',
      label: 'Start a Community Challenge',
      description: 'A shared weekly goal for everyone in the P2P room. Progress is broadcast to all players.',
      costLabel: 'Co-op room',
      available: ctx.multiplayerConnected,
      reason: ctx.multiplayerConnected ? undefined : 'Join or host a P2P room first',
      tone: 'discovery',
    });
  } else if (!state.coop.challengeCompleted) {
    emit({
      id: 'coop_challenge_contribute',
      tab: 'coop',
      label: `Contribute to ${state.coop.challengeTitle}`,
      description: `${state.coop.challengeProgress}/${state.coop.challengeGoal} contributions. Reward ${state.coop.challengeReward} coins for the room.`,
      costLabel: 'Co-op room',
      available: ctx.multiplayerConnected,
      reason: ctx.multiplayerConnected ? undefined : 'Reconnect to the co-op room',
      tone: 'info',
    });
  }
  if (state.carClub.founded && ctx.multiplayerConnected) {
    emit({
      id: 'coop_meet',
      tab: 'coop',
      label: 'Host a Shared Car Meet',
      description: 'Invite the room to a meet at Warehouse Row. Everyone gets reputation and a payout.',
      costLabel: costLabel(50),
      available: ctx.coins >= 50,
      reason: ctx.coins >= 50 ? undefined : 'Need 50 coins',
      tone: 'discovery',
    });
  }
  for (let i = 0; i < ctx.multiplayerPeers.length; i++) {
    const peer = ctx.multiplayerPeers[i];
    emit({
      id: `coop_trade_offer:${peer.peerId}`,
      tab: 'coop',
      label: `Offer 5 wood to ${peer.name} for 60 coins`,
      description: 'A secure player trade. The wood is held in escrow until they accept or decline.',
      costLabel: costLabel(0, [['wood', 5]]),
      available: ctx.multiplayerConnected && itemCount(ctx, 'wood') >= 5,
      reason: !ctx.multiplayerConnected ? 'Not connected' : itemCount(ctx, 'wood') < 5 ? 'Need 5 wood' : undefined,
      tone: 'info',
    });
  }
  for (let i = 0; i < state.coop.trades.length; i++) {
    const trade = state.coop.trades[i];
    if (trade.direction !== 'incoming') continue;
    emit({
      id: `coop_trade_accept:${trade.id}`,
      tab: 'coop',
      label: `Accept ${trade.peerName}'s trade (${trade.quantity}× ${trade.itemId.replace(/_/g, ' ')})`,
      description: `Pay ${trade.price} coins for ${trade.quantity}× ${trade.itemId.replace(/_/g, ' ')}.`,
      costLabel: costLabel(trade.price),
      available: ctx.coins >= trade.price,
      reason: ctx.coins >= trade.price ? undefined : `Need ${trade.price} coins`,
      tone: 'good',
    });
    emit({
      id: `coop_trade_decline:${trade.id}`,
      tab: 'coop',
      label: `Decline ${trade.peerName}'s trade`,
      description: 'Send the offer back. Their escrow is returned automatically.',
      costLabel: 'Free',
      available: true,
      tone: 'warning',
    });
  }

  // Feature 41-45: structural building, power, water, machinery and treehouses.
  if (!state.power.generatorBuilt) {
    emit({
      id: 'build_power_generator',
      tab: 'build',
      label: 'Install a Generator',
      description: 'A fuel generator with a distribution panel. Powers lights, switches and the kitchen.',
      costLabel: costLabel(120, [['metal_ore', 12], ['iron_ingot', 2]]),
      available: canAfford(ctx, 120, [['metal_ore', 12], ['iron_ingot', 2]]),
      reason: canAfford(ctx, 120, [['metal_ore', 12], ['iron_ingot', 2]])
        ? undefined
        : missingReason(ctx, 120, [['metal_ore', 12], ['iron_ingot', 2]]),
      tone: 'good',
    });
  }
  emit({
    id: 'build_power_wiring',
    tab: 'build',
    label: 'Run Electrical Wiring',
    description: 'Add 25m of protected wiring to the settlement grid.',
    costLabel: costLabel(40, [['metal_ore', 4]]),
    available: canAfford(ctx, 40, [['metal_ore', 4]]),
    reason: canAfford(ctx, 40, [['metal_ore', 4]]) ? undefined : 'Need 40 coins and 4 metal ore',
    tone: 'info',
  });
  emit({
    id: 'build_power_light',
    tab: 'build',
    label: 'Hang a Powered Light',
    description: 'A work light on the grid. Lights come on automatically at night.',
    costLabel: costLabel(10, [['metal_ore', 1], ['fiber', 1]]),
    available: canAfford(ctx, 10, [['metal_ore', 1], ['fiber', 1]]),
    reason: canAfford(ctx, 10, [['metal_ore', 1], ['fiber', 1]]) ? undefined : 'Need 10 coins, 1 metal ore, 1 fiber',
    tone: 'info',
  });
  emit({
    id: 'build_power_switch',
    tab: 'build',
    label: 'Install a Wall Switch',
    description: 'A switch leg for the lighting circuit.',
    costLabel: costLabel(15, [['metal_ore', 1]]),
    available: canAfford(ctx, 15, [['metal_ore', 1]]),
    reason: canAfford(ctx, 15, [['metal_ore', 1]]) ? undefined : 'Need 15 coins and 1 metal ore',
    tone: 'info',
  });

  if (!state.water.wellBuilt) {
    emit({
      id: 'build_water_well',
      tab: 'build',
      label: 'Dig a Water Well',
      description: 'A lined well that fills the tank and keeps the settlement supplied.',
      costLabel: costLabel(60, [['stone', 20], ['metal_ore', 3]]),
      available: canAfford(ctx, 60, [['stone', 20], ['metal_ore', 3]]),
      reason: canAfford(ctx, 60, [['stone', 20], ['metal_ore', 3]])
        ? undefined
        : missingReason(ctx, 60, [['stone', 20], ['metal_ore', 3]]),
      tone: 'good',
    });
  }
  if (!state.water.pumpBuilt) {
    emit({
      id: 'build_water_pump',
      tab: 'build',
      label: 'Install a Hand Pump',
      description: 'Pressurizes the water line and feeds irrigation without electricity.',
      costLabel: costLabel(80, [['metal_ore', 6], ['iron_ingot', 2]]),
      available: canAfford(ctx, 80, [['metal_ore', 6], ['iron_ingot', 2]]),
      reason: canAfford(ctx, 80, [['metal_ore', 6], ['iron_ingot', 2]])
        ? undefined
        : missingReason(ctx, 80, [['metal_ore', 6], ['iron_ingot', 2]]),
      tone: 'good',
    });
  }
  if (!state.water.tankBuilt) {
    emit({
      id: 'build_water_tank',
      tab: 'build',
      label: 'Build a Storage Tank',
      description: 'Adds 200 gallons of storage and stabilizes pressure.',
      costLabel: costLabel(70, [['metal_ore', 8], ['clay', 6]]),
      available: canAfford(ctx, 70, [['metal_ore', 8], ['clay', 6]]),
      reason: canAfford(ctx, 70, [['metal_ore', 8], ['clay', 6]])
        ? undefined
        : missingReason(ctx, 70, [['metal_ore', 8], ['clay', 6]]),
      tone: 'good',
    });
  }
  if (!state.water.irrigationBuilt) {
    emit({
      id: 'build_water_irrigation',
      tab: 'build',
      label: 'Lay Irrigation Lines',
      description: 'Drip lines to the crops. Unlocks one-click watering of the whole garden.',
      costLabel: costLabel(50, [['fiber', 6], ['clay', 4]]),
      available: canAfford(ctx, 50, [['fiber', 6], ['clay', 4]]),
      reason: canAfford(ctx, 50, [['fiber', 6], ['clay', 4]])
        ? undefined
        : missingReason(ctx, 50, [['fiber', 6], ['clay', 4]]),
      tone: 'good',
    });
  }
  if (state.water.irrigationBuilt) {
    emit({
      id: 'build_water_crops',
      tab: 'build',
      label: 'Water the Garden',
      description: `Irrigate every planted crop. Tank: ${Math.round(state.water.gallons)}/${state.water.capacity} gal.`,
      costLabel: '5 gallons',
      available: state.water.gallons >= 5,
      reason: state.water.gallons >= 5 ? undefined : 'Not enough water in the tank',
      tone: 'info',
    });
  }

  const homestead = HOMESTEAD_STAGES[Math.min(state.engineering.homesteadStage, HOMESTEAD_STAGES.length - 1)];
  if (state.engineering.homesteadStage < HOMESTEAD_STAGES.length) {
    emit({
      id: 'build_homestead',
      tab: 'build',
      label: homestead.label,
      description: `${homestead.description} Stage ${state.engineering.homesteadStage + 1}/${HOMESTEAD_STAGES.length}.`,
      costLabel: costLabel(homestead.coins, homestead.items),
      available: canAfford(ctx, homestead.coins, homestead.items),
      reason: canAfford(ctx, homestead.coins, homestead.items)
        ? undefined
        : missingReason(ctx, homestead.coins, homestead.items),
      tone: 'good',
    });
  }
  const treehouse = TREEHOUSE_STAGES[Math.min(state.engineering.treehouseStage, TREEHOUSE_STAGES.length - 1)];
  if (state.engineering.treehouseStage < TREEHOUSE_STAGES.length) {
    emit({
      id: 'build_treehouse',
      tab: 'build',
      label: treehouse.label,
      description: `${treehouse.description} Stage ${state.engineering.treehouseStage + 1}/${TREEHOUSE_STAGES.length}.`,
      costLabel: costLabel(treehouse.coins, treehouse.items),
      available: canAfford(ctx, treehouse.coins, treehouse.items),
      reason: canAfford(ctx, treehouse.coins, treehouse.items)
        ? undefined
        : missingReason(ctx, treehouse.coins, treehouse.items),
      tone: 'good',
    });
  }
  if (!state.engineering.machineryBuilt) {
    emit({
      id: 'build_machinery',
      tab: 'build',
      label: 'Assemble Construction Machinery',
      description: 'A small excavator and plate compactor for roads, bridges and contracts.',
      costLabel: costLabel(160, [['metal_ore', 14], ['iron_ingot', 3]]),
      available: canAfford(ctx, 160, [['metal_ore', 14], ['iron_ingot', 3]]),
      reason: canAfford(ctx, 160, [['metal_ore', 14], ['iron_ingot', 3]])
        ? undefined
        : missingReason(ctx, 160, [['metal_ore', 14], ['iron_ingot', 3]]),
      tone: 'good',
    });
  }
  if (!state.engineering.contractActive) {
    emit({
      id: 'build_contract_accept',
      tab: 'build',
      label: 'Accept a Parish Engineering Contract',
      description: 'Bridge repair and road resurfacing work for the city. Requires at least one recruited worker.',
      costLabel: 'Crew',
      available: ctx.recruitedCount >= 1,
      reason: ctx.recruitedCount >= 1 ? undefined : 'Recruit a worker first',
      tone: 'info',
    });
  } else {
    emit({
      id: 'build_contract_work',
      tab: 'build',
      label: `Work the Contract (${state.engineering.contractProgress}/${state.engineering.contractGoal})`,
      description: `${state.engineering.contractActive}. Your crew and machinery advance the job.`,
      costLabel: 'Crew time',
      available: true,
      tone: 'info',
    });
  }
  emit({
    id: 'build_road_repair',
    tab: 'build',
    label: 'Repair a Stretch of Road',
    description: 'Patch, compact and re-stripe a damaged road section. Raises district reputation.',
    costLabel: costLabel(40, [['stone', 10]]),
    available: canAfford(ctx, 40, [['stone', 10]]),
    reason: canAfford(ctx, 40, [['stone', 10]]) ? undefined : 'Need 40 coins and 10 stone',
    tone: 'info',
  });
  emit({
    id: 'build_bridge',
    tab: 'build',
    label: 'Build a Road Bridge',
    description: 'A permanent bridge over a washout. Counts toward engineering legacy.',
    costLabel: costLabel(60, [['wood', 20], ['stone', 20]]),
    available: canAfford(ctx, 60, [['wood', 20], ['stone', 20]]),
    reason: canAfford(ctx, 60, [['wood', 20], ['stone', 20]]) ? undefined : 'Need 60 coins, 20 wood, 20 stone',
    tone: 'good',
  });

  // Feature 46-50: hurricane, flood, destruction, fire and recovery.
  if (!state.hurricane.prepared) {
    emit({
      id: 'disaster_prepare',
      tab: 'disaster',
      label: 'Batten Down the Settlement',
      description: 'Board windows, tie down roofs and stage sandbags before the next storm.',
      costLabel: costLabel(0, [['wood', 8], ['metal_ore', 2]]),
      available: canAfford(ctx, 0, [['wood', 8], ['metal_ore', 2]]),
      reason: canAfford(ctx, 0, [['wood', 8], ['metal_ore', 2]]) ? undefined : 'Need 8 wood and 2 metal ore',
      tone: 'warning',
    });
  }
  if (state.hurricane.active) {
    emit({
      id: 'disaster_evacuate',
      tab: 'disaster',
      label: 'Move Everyone to High Ground',
      description: 'Evacuate the low camp with food and water. Reduces storm injuries and structural damage.',
      costLabel: costLabel(0, [['roasted_meat', 1], ['filtered_water_bottle', 1]]),
      available: canAfford(ctx, 0, [['roasted_meat', 1], ['filtered_water_bottle', 1]]),
      reason: canAfford(ctx, 0, [['roasted_meat', 1], ['filtered_water_bottle', 1]])
        ? undefined
        : 'Need a meal and clean water',
      tone: 'danger',
    });
  }
  if (state.fire.cells.length > 0) {
    emit({
      id: 'disaster_firefight',
      tab: 'disaster',
      label: 'Fight the Wildfire',
      description: 'Cut a line and wet the flank. Uses water from the tank or a water torrent.',
      costLabel: '5 gal water · stamina',
      available: state.water.gallons >= 5 || itemCount(ctx, 'water_torrent') > 0,
      reason:
        state.water.gallons >= 5 || itemCount(ctx, 'water_torrent') > 0
          ? undefined
          : 'Need water in the tank or a water torrent',
      tone: 'danger',
    });
  }
  emit({
    id: 'disaster_repair',
    tab: 'disaster',
    label: 'Repair Infrastructure',
    description: `Rebuild roads, docks and shelter frames. Recovery ${state.recovery.infrastructure}/100.`,
    costLabel: costLabel(80, [['wood', 6]]),
    available: canAfford(ctx, 80, [['wood', 6]]),
    reason: canAfford(ctx, 80, [['wood', 6]]) ? undefined : 'Need 80 coins and 6 wood',
    tone: 'info',
  });
  emit({
    id: 'disaster_rebuild',
    tab: 'disaster',
    label: 'Rebuild the Settlement',
    description: `Restore homes and community buildings. Settlement recovery ${state.recovery.settlement}/100.`,
    costLabel: costLabel(120, [['stone', 10]]),
    available: canAfford(ctx, 120, [['stone', 10]]),
    reason: canAfford(ctx, 120, [['stone', 10]]) ? undefined : 'Need 120 coins and 10 stone',
    tone: 'info',
  });
  if (state.damage.debris > 0) {
    emit({
      id: 'disaster_debris',
      tab: 'disaster',
      label: `Clear Storm Debris (${state.damage.debris})`,
      description: 'Cut up fallen timber and haul it to the woodpile. Salvages usable wood.',
      costLabel: 'Stamina',
      available: ctx.vitals.stamina >= 8,
      reason: ctx.vitals.stamina >= 8 ? undefined : 'Too exhausted',
      tone: 'info',
    });
  }
  if (state.recovery.infrastructure >= 60 && state.recovery.settlement >= 40) {
    emit({
      id: 'disaster_relief',
      tab: 'disaster',
      label: 'File for Disaster Relief',
      description: 'Parish relief funds for verified recovery work. Pays out once per recovery cycle.',
      costLabel: 'Recovery credit',
      available: true,
      tone: 'good',
    });
  }

  // Feature 51-55: lost civilization, world bosses, dragon bonds, mystery and evolution.
  if (state.civilization.excavationStage < 5) {
    emit({
      id: 'lost_excavate',
      tab: 'lost',
      label: `Excavate the Lost Civilization (${state.civilization.excavationStage}/5)`,
      description: 'Clear the stairwell, shore the roof and open the next chamber of the city beneath the island.',
      costLabel: costLabel(150, [['stone', 10]]),
      available:
        canAfford(ctx, 150, [['stone', 10]]) && ctx.recruitedCount >= 1,
      reason:
        ctx.recruitedCount < 1
          ? 'Recruit a worker for the dig'
          : canAfford(ctx, 150, [['stone', 10]])
            ? undefined
            : missingReason(ctx, 150, [['stone', 10]]),
      tone: 'discovery',
    });
  }
  if (state.civilization.excavationStage >= 2 && state.civilization.chambersFound < 6) {
    emit({
      id: 'lost_chamber',
      tab: 'lost',
      label: 'Explore a Buried Chamber',
      description: 'Map another room of the underground city and recover what the water left behind.',
      costLabel: costLabel(40) + ' · stamina',
      available: ctx.coins >= 40 && ctx.vitals.stamina >= 12,
      reason: ctx.coins < 40 ? 'Need 40 coins' : 'Too exhausted',
      tone: 'discovery',
    });
  }
  if (state.civilization.excavationStage >= 4 && !state.civilization.gateOpened) {
    const clues = state.mystery.cluesFound.length;
    emit({
      id: 'lost_gate',
      tab: 'lost',
      label: 'Open the Twelve-Symbol Gate',
      description: `The gate needs six of the twelve mystery clues. Found ${clues}/6.`,
      costLabel: 'Six clues',
      available: clues >= 6,
      reason: clues >= 6 ? undefined : `Find ${6 - clues} more clues`,
      tone: 'discovery',
    });
  }
  for (let i = 0; i < state.worldBosses.length; i++) {
    const boss = state.worldBosses[i];
    if (boss.defeated) continue;
    const prepItems = [['ammo', 30], ['roasted_meat', 2], ['filtered_water_bottle', 2]] as const;
    emit({
      id: `lost_boss_prep:${boss.id}`,
      tab: 'lost',
      label: `Prepare for ${boss.name}`,
      description: `${boss.description} Prep ${boss.prep}/${boss.requiredPrep}.`,
      costLabel: costLabel(0, prepItems),
      available: canAfford(ctx, 0, prepItems),
      reason: canAfford(ctx, 0, prepItems) ? undefined : missingReason(ctx, 0, prepItems),
      tone: 'warning',
    });
    if (boss.prep >= boss.requiredPrep) {
      emit({
        id: `lost_boss_fight:${boss.id}`,
        tab: 'lost',
        label: `Challenge ${boss.name}`,
        description: `A world boss expedition. Team, prep and co-op numbers all improve the odds. Rewards: ${boss.rewards}.`,
        costLabel: 'Expedition',
        available: ctx.recruitedCount >= 1,
        reason: ctx.recruitedCount >= 1 ? undefined : 'Bring at least one recruit',
        tone: 'danger',
      });
    }
  }
  for (let i = 0; i < ctx.dragons.length; i++) {
    const dragon = ctx.dragons[i];
    const bond = state.dragonBonds.find((b) => b.dragonId === dragon.id);
    const level = bond?.level ?? 1;
    emit({
      id: `lost_bond:${dragon.id}`,
      tab: 'lost',
      label: `Bond with ${dragon.name} (Lv ${level})`,
      description: bond
        ? `Bond XP ${bond.xp}. Feeding and flying raise level, unlocking faster flight and new abilities.`
        : 'Offer meat and spend time with the dragon to begin a bond. Existing dragon progress is untouched.',
      costLabel: costLabel(0, [['raw_meat', 1]]),
      available: itemCount(ctx, 'raw_meat') >= 1,
      reason: itemCount(ctx, 'raw_meat') >= 1 ? undefined : 'Need 1 raw meat',
      tone: 'good',
    });
    if (level >= 2) {
      emit({
        id: `lost_fly:${dragon.id}`,
        tab: 'lost',
        label: `Fly with ${dragon.name}`,
        description: 'Aerial exploration run over the island. Builds bond and reveals terrain.',
        costLabel: 'Stamina',
        available: ctx.vitals.stamina >= 15,
        reason: ctx.vitals.stamina >= 15 ? undefined : 'Too exhausted to fly',
        tone: 'discovery',
      });
    }
  }
  const clues = allMysteryClues();
  for (let i = 0; i < clues.length; i++) {
    const clue = clues[i];
    if (state.mystery.cluesFound.includes(clue.id)) continue;
    const dist = distanceTo(ctx, clue.x, clue.z);
    emit({
      id: `lost_clue:${clue.id}`,
      tab: 'lost',
      label: `Investigate: ${clue.title}`,
      description: `${clue.region.replace(/_/g, ' ')} · ${Math.round(dist)}m away. A living-mystery clue tied to the island's history.`,
      costLabel: 'Travel',
      available: dist <= 100,
      reason: dist <= 100 ? undefined : 'Get within 100m of the clue',
      tone: 'discovery',
    });
  }
  if (state.evolution.stage > state.evolution.lastClaimedStage) {
    emit({
      id: 'lost_claim_stage',
      tab: 'lost',
      label: `Claim ${state.evolution.stageName} Legacy Reward`,
      description: 'A one-time payout and perk confirmation for reaching a new world evolution stage.',
      costLabel: 'Free',
      available: true,
      tone: 'discovery',
    });
  }
}

export function applyEndgameAction(
  actionId: string,
  state: LostWorldState,
  ctx: LostWorldActionContext,
): ActionOutcome | null {
  if (actionId === 'coop_challenge_start') {
    if (!ctx.multiplayerConnected) return actionFail('coop', 'Join a P2P room first.');
    if (state.coop.challengeId) return actionFail('coop', 'A challenge is already running.');
    const titles = ['Shared Hunt', 'Settlement Build-Off', 'Wildlife Survey', 'Clean Water Drive'];
    state.coop.challengeId = `challenge_${ctx.day}`;
    state.coop.challengeTitle = titles[ctx.day % titles.length];
    state.coop.challengeGoal = 20;
    state.coop.challengeProgress = 0;
    state.coop.challengeReward = 300;
    state.coop.challengeCompleted = false;
    state.coop.challengeContributors = [];
    const effects: LostWorldEffects = {};
    effects.broadcast = {
      kind: 'challenge_start',
      payload: {
        id: state.coop.challengeId,
        title: state.coop.challengeTitle,
        goal: state.coop.challengeGoal,
        reward: state.coop.challengeReward,
      },
    };
    return actionOk('coop', `${state.coop.challengeTitle} started for the room.`, effects);
  }

  if (actionId === 'coop_challenge_contribute') {
    if (!ctx.multiplayerConnected) return actionFail('coop', 'Reconnect to the co-op room.');
    if (!state.coop.challengeId || state.coop.challengeCompleted) {
      return actionFail('coop', 'No active challenge.');
    }
    state.coop.challengeProgress += 1;
    const effects: LostWorldEffects = {};
    effects.broadcast = {
      kind: 'challenge_progress',
      payload: { id: state.coop.challengeId, progress: state.coop.challengeProgress },
    };
    if (state.coop.challengeProgress >= state.coop.challengeGoal) {
      state.coop.challengeCompleted = true;
      grant(effects, state.coop.challengeReward);
      lostWorldLog(
        state,
        ctx.day,
        `${state.coop.challengeTitle} completed by the room. ${state.coop.challengeReward} coins each.`,
        'discovery',
      );
      effects.broadcast = {
        kind: 'challenge_complete',
        payload: { id: state.coop.challengeId, reward: state.coop.challengeReward },
      };
      return actionOk('coop', `${state.coop.challengeTitle} complete! ${state.coop.challengeReward} coins.`, effects);
    }
    return actionOk(
      'coop',
      `${state.coop.challengeTitle}: ${state.coop.challengeProgress}/${state.coop.challengeGoal}.`,
      effects,
    );
  }

  if (actionId === 'coop_meet') {
    if (!ctx.multiplayerConnected) return actionFail('coop', 'Join a P2P room first.');
    if (!state.carClub.founded) return actionFail('coop', 'Found a car club first.');
    if (!canAfford(ctx, 50)) return actionFail('coop', 'Need 50 coins.');
    const effects: LostWorldEffects = {};
    spend(effects, ctx, 50);
    grant(effects, 70);
    state.coop.sharedActivities.unshift(`Shared car meet on day ${ctx.day}`);
    state.carClub.meetsHeld += 1;
    state.carClub.reputation += 5;
    adjustDistrict(state, 'warehouse_row', 5);
    effects.broadcast = { kind: 'car_meet', payload: { day: ctx.day } };
    return actionOk('coop', 'Shared car meet hosted. The room got the invite and 70 coins each.', effects);
  }

  if (actionId.startsWith('coop_trade_offer:')) {
    const peerId = actionId.slice('coop_trade_offer:'.length);
    const peer = ctx.multiplayerPeers.find((p) => p.peerId === peerId);
    if (!ctx.multiplayerConnected || !peer) return actionFail('coop', 'That player is not connected.');
    if (itemCount(ctx, 'wood') < 5) return actionFail('coop', 'Need 5 wood.');
    const effects: LostWorldEffects = {};
    spend(effects, ctx, 0, [['wood', 5]]);
    const id = `trade_${ctx.day}_${state.coop.trades.length}`;
    state.coop.trades.push({
      id,
      peerId,
      peerName: peer.name,
      itemId: 'wood',
      quantity: 5,
      price: 60,
      direction: 'outgoing',
      day: ctx.day,
    });
    effects.broadcast = {
      kind: 'trade_offer',
      payload: {
        id,
        from: ctx.multiplayerPeers[0]?.name ?? 'Player',
        itemId: 'wood',
        quantity: 5,
        price: 60,
      },
    };
    return actionOk('coop', `Offer sent to ${peer.name}. 5 wood held in escrow.`, effects);
  }

  if (actionId.startsWith('coop_trade_accept:')) {
    const trade = state.coop.trades.find((t) => t.id === actionId.slice('coop_trade_accept:'.length));
    if (!trade || trade.direction !== 'incoming') return actionFail('coop', 'Trade not found.');
    if (!canAfford(ctx, trade.price)) return actionFail('coop', `Need ${trade.price} coins.`);
    const effects: LostWorldEffects = {};
    spend(effects, ctx, trade.price);
    grant(effects, 0, [[trade.itemId, trade.quantity]]);
    state.coop.trades = state.coop.trades.filter((t) => t.id !== trade.id);
    effects.broadcast = {
      kind: 'trade_accept',
      payload: { id: trade.id, peerId: trade.peerId },
    };
    return actionOk(
      'coop',
      `Trade accepted: ${trade.quantity}× ${trade.itemId.replace(/_/g, ' ')} for ${trade.price} coins.`,
      effects,
    );
  }

  if (actionId.startsWith('coop_trade_decline:')) {
    const trade = state.coop.trades.find((t) => t.id === actionId.slice('coop_trade_decline:'.length));
    if (!trade) return actionFail('coop', 'Trade not found.');
    const effects: LostWorldEffects = {};
    if (trade.direction === 'outgoing') {
      grant(effects, 0, [[trade.itemId, trade.quantity]]);
    }
    state.coop.trades = state.coop.trades.filter((t) => t.id !== trade.id);
    effects.broadcast = { kind: 'trade_decline', payload: { id: trade.id, peerId: trade.peerId } };
    return actionOk('coop', 'Trade declined and escrow returned.', effects);
  }

  if (actionId === 'build_power_generator') {
    if (state.power.generatorBuilt) return actionFail('build', 'Generator already installed.');
    if (!canAfford(ctx, 120, [['metal_ore', 12], ['iron_ingot', 2]])) {
      return actionFail('build', missingReason(ctx, 120, [['metal_ore', 12], ['iron_ingot', 2]]));
    }
    const effects: LostWorldEffects = {};
    spend(effects, ctx, 120, [['metal_ore', 12], ['iron_ingot', 2]]);
    state.power.generatorBuilt = true;
    state.power.generatorFuel = 60;
    state.power.outputKw = 6;
    addPersistentChange(state, ctx.day, 'construction', 'Generator installed', ctx.playerX, ctx.playerZ);
    return actionOk('build', 'Generator online. The settlement grid has power.', effects);
  }

  if (actionId === 'build_power_wiring') {
    if (!canAfford(ctx, 40, [['metal_ore', 4]])) return actionFail('build', 'Need 40 coins and 4 metal ore.');
    const effects: LostWorldEffects = {};
    spend(effects, ctx, 40, [['metal_ore', 4]]);
    state.power.wiringMeters += 25;
    return actionOk('build', 'Wiring run added: 25m of circuit.', effects);
  }

  if (actionId === 'build_power_light') {
    if (!canAfford(ctx, 10, [['metal_ore', 1], ['fiber', 1]])) {
      return actionFail('build', 'Need 10 coins, 1 metal ore and 1 fiber.');
    }
    const effects: LostWorldEffects = {};
    spend(effects, ctx, 10, [['metal_ore', 1], ['fiber', 1]]);
    state.power.lights += 1;
    return actionOk('build', `Light hung. ${state.power.lights} powered lights on the grid.`, effects);
  }

  if (actionId === 'build_power_switch') {
    if (!canAfford(ctx, 15, [['metal_ore', 1]])) return actionFail('build', 'Need 15 coins and 1 metal ore.');
    const effects: LostWorldEffects = {};
    spend(effects, ctx, 15, [['metal_ore', 1]]);
    state.power.switches += 1;
    return actionOk('build', `Switch installed. ${state.power.switches} switch legs on the grid.`, effects);
  }

  if (actionId === 'build_water_well') {
    if (!canAfford(ctx, 60, [['stone', 20], ['metal_ore', 3]])) {
      return actionFail('build', missingReason(ctx, 60, [['stone', 20], ['metal_ore', 3]]));
    }
    const effects: LostWorldEffects = {};
    spend(effects, ctx, 60, [['stone', 20], ['metal_ore', 3]]);
    state.water.wellBuilt = true;
    state.water.capacity += 120;
    state.water.gallons = state.water.capacity;
    addPersistentChange(state, ctx.day, 'construction', 'Well dug', ctx.playerX, ctx.playerZ);
    return actionOk('build', 'Well dug. Water storage and supply are online.', effects);
  }

  if (actionId === 'build_water_pump') {
    if (!canAfford(ctx, 80, [['metal_ore', 6], ['iron_ingot', 2]])) {
      return actionFail('build', missingReason(ctx, 80, [['metal_ore', 6], ['iron_ingot', 2]]));
    }
    const effects: LostWorldEffects = {};
    spend(effects, ctx, 80, [['metal_ore', 6], ['iron_ingot', 2]]);
    state.water.pumpBuilt = true;
    state.water.pressure = 1;
    return actionOk('build', 'Hand pump installed. The water line is pressurized.', effects);
  }

  if (actionId === 'build_water_tank') {
    if (!canAfford(ctx, 70, [['metal_ore', 8], ['clay', 6]])) {
      return actionFail('build', missingReason(ctx, 70, [['metal_ore', 8], ['clay', 6]]));
    }
    const effects: LostWorldEffects = {};
    spend(effects, ctx, 70, [['metal_ore', 8], ['clay', 6]]);
    state.water.tankBuilt = true;
    state.water.capacity += 200;
    return actionOk('build', `Tank built. Capacity is now ${state.water.capacity} gallons.`, effects);
  }

  if (actionId === 'build_water_irrigation') {
    if (!canAfford(ctx, 50, [['fiber', 6], ['clay', 4]])) {
      return actionFail('build', missingReason(ctx, 50, [['fiber', 6], ['clay', 4]]));
    }
    const effects: LostWorldEffects = {};
    spend(effects, ctx, 50, [['fiber', 6], ['clay', 4]]);
    state.water.irrigationBuilt = true;
    return actionOk('build', 'Irrigation lines laid. The garden can be watered from the tank.', effects);
  }

  if (actionId === 'build_water_crops') {
    if (!state.water.irrigationBuilt) return actionFail('build', 'Lay irrigation lines first.');
    if (state.water.gallons < 5) return actionFail('build', 'Not enough water in the tank.');
    state.water.gallons = Math.max(0, state.water.gallons - 5);
    const effects: LostWorldEffects = {};
    effects.waterCrops = true;
    return actionOk('build', 'Every planted crop has been watered.', effects);
  }

  if (actionId === 'build_homestead') {
    const stage = state.engineering.homesteadStage;
    const plan = HOMESTEAD_STAGES[stage];
    if (!plan) return actionFail('build', 'The homestead is already finished.');
    if (!canAfford(ctx, plan.coins, plan.items)) {
      return actionFail('build', missingReason(ctx, plan.coins, plan.items));
    }
    const effects: LostWorldEffects = {};
    spend(effects, ctx, plan.coins, plan.items);
    state.engineering.homesteadStage += 1;
    if (state.engineering.homesteadStage >= HOMESTEAD_STAGES.length) {
      const x = ctx.playerX + 5;
      const z = ctx.playerZ + 5;
      state.shelters.push({
        id: `shelter_homestead_${ctx.day}`,
        kind: 'cabin',
        label: 'Homestead House',
        x,
        z,
        built: true,
        integrity: 150,
        insulation: 0.72,
        defense: 10,
        dayBuilt: ctx.day,
      });
      effects.placeStructure = { type: 'basic_shelter', x, z, label: 'Homestead House' };
      addPersistentChange(state, ctx.day, 'construction', 'Completed the homestead house', x, z);
      lostWorldLog(state, ctx.day, 'The multi-floor homestead is finished.', 'good');
      return actionOk('build', 'Homestead complete: foundation, floors, stairs, roof and doors.', effects);
    }
    return actionOk('build', `${plan.label} complete. Stage ${state.engineering.homesteadStage}/4.`, effects);
  }

  if (actionId === 'build_treehouse') {
    const stage = state.engineering.treehouseStage;
    const plan = TREEHOUSE_STAGES[stage];
    if (!plan) return actionFail('build', 'The treehouse is already finished.');
    if (!canAfford(ctx, plan.coins, plan.items)) {
      return actionFail('build', missingReason(ctx, plan.coins, plan.items));
    }
    const effects: LostWorldEffects = {};
    spend(effects, ctx, plan.coins, plan.items);
    state.engineering.treehouseStage += 1;
    if (state.engineering.treehouseStage >= TREEHOUSE_STAGES.length) {
      const x = ctx.playerX + 6;
      const z = ctx.playerZ - 6;
      state.shelters.push({
        id: `shelter_treehouse_${ctx.day}`,
        kind: 'treehouse',
        label: 'Treehouse',
        x,
        z,
        built: true,
        integrity: 95,
        insulation: 0.48,
        defense: 8,
        dayBuilt: ctx.day,
      });
      effects.placeStructure = { type: 'basic_shelter', x, z, label: 'Treehouse' };
      addPersistentChange(state, ctx.day, 'construction', 'Completed the treehouse', x, z);
      lostWorldLog(state, ctx.day, 'The treehouse and rope bridge are finished.', 'good');
      return actionOk('build', 'Treehouse complete: platform, climb, rope bridge and high room.', effects);
    }
    return actionOk('build', `${plan.label} complete. Stage ${state.engineering.treehouseStage}/4.`, effects);
  }

  if (actionId === 'build_machinery') {
    if (state.engineering.machineryBuilt) return actionFail('build', 'Machinery already assembled.');
    if (!canAfford(ctx, 160, [['metal_ore', 14], ['iron_ingot', 3]])) {
      return actionFail('build', missingReason(ctx, 160, [['metal_ore', 14], ['iron_ingot', 3]]));
    }
    const effects: LostWorldEffects = {};
    spend(effects, ctx, 160, [['metal_ore', 14], ['iron_ingot', 3]]);
    state.engineering.machineryBuilt = true;
    addPersistentChange(state, ctx.day, 'construction', 'Construction machinery assembled', ctx.playerX, ctx.playerZ);
    return actionOk('build', 'Excavator and compactor assembled. Engineering contracts are faster.', effects);
  }

  if (actionId === 'build_contract_accept') {
    if (state.engineering.contractActive) return actionFail('build', 'A contract is already active.');
    if (ctx.recruitedCount < 1) return actionFail('build', 'Recruit a worker first.');
    state.engineering.contractActive = 'Parish bridge and road contract';
    state.engineering.contractProgress = 0;
    state.engineering.contractGoal = 100;
    return actionOk('build', 'Contract accepted. Put the crew to work.');
  }

  if (actionId === 'build_contract_work') {
    if (!state.engineering.contractActive) return actionFail('build', 'No active contract.');
    const gain = 18 + ctx.recruitedCount * 6 + (state.engineering.machineryBuilt ? 16 : 0);
    state.engineering.contractProgress = Math.min(
      state.engineering.contractGoal,
      state.engineering.contractProgress + gain,
    );
    if (state.engineering.contractProgress >= state.engineering.contractGoal) {
      const effects: LostWorldEffects = {};
      grant(effects, 260);
      state.engineering.bridgesBuilt += 1;
      state.engineering.contractActive = null;
      adjustDistrict(state, 'warehouse_row', 5);
      addPersistentChange(state, ctx.day, 'construction', 'Completed a parish engineering contract', ctx.playerX, ctx.playerZ);
      lostWorldLog(state, ctx.day, 'Parish contract complete: 260 coins paid.', 'good');
      return actionOk('build', 'Contract complete. 260 coins paid and a bridge added to the legacy.', effects);
    }
    return actionOk(
      'build',
      `Contract progress ${state.engineering.contractProgress}/${state.engineering.contractGoal}.`,
    );
  }

  if (actionId === 'build_road_repair') {
    if (!canAfford(ctx, 40, [['stone', 10]])) return actionFail('build', 'Need 40 coins and 10 stone.');
    const effects: LostWorldEffects = {};
    spend(effects, ctx, 40, [['stone', 10]]);
    state.engineering.roadsRepaired += 1;
    adjustDistrict(state, 'warehouse_row', 3);
    return actionOk('build', `Road section repaired (${state.engineering.roadsRepaired} total).`, effects);
  }

  if (actionId === 'build_bridge') {
    if (!canAfford(ctx, 60, [['wood', 20], ['stone', 20]])) {
      return actionFail('build', 'Need 60 coins, 20 wood and 20 stone.');
    }
    const effects: LostWorldEffects = {};
    spend(effects, ctx, 60, [['wood', 20], ['stone', 20]]);
    state.engineering.bridgesBuilt += 1;
    const x = ctx.playerX + 8;
    const z = ctx.playerZ;
    effects.placeStructure = { type: 'basic_shelter', x, z, label: 'Road bridge' };
    addPersistentChange(state, ctx.day, 'construction', 'Built a road bridge', x, z);
    return actionOk('build', `Bridge built (${state.engineering.bridgesBuilt} total).`, effects);
  }

  if (actionId === 'disaster_prepare') {
    if (state.hurricane.prepared) return actionFail('disaster', 'The settlement is already battened down.');
    if (!canAfford(ctx, 0, [['wood', 8], ['metal_ore', 2]])) {
      return actionFail('disaster', 'Need 8 wood and 2 metal ore.');
    }
    const effects: LostWorldEffects = {};
    spend(effects, ctx, 0, [['wood', 8], ['metal_ore', 2]]);
    state.hurricane.prepared = true;
    for (let i = 0; i < state.shelters.length; i++) {
      state.shelters[i].integrity = Math.min(150, state.shelters[i].integrity + 4);
    }
    lostWorldLog(state, ctx.day, 'The settlement is battened down for the storm.', 'info');
    return actionOk('disaster', 'Storm prep complete. Damage and injuries will be reduced.', effects);
  }

  if (actionId === 'disaster_evacuate') {
    if (!state.hurricane.active) return actionFail('disaster', 'No hurricane is active.');
    if (!canAfford(ctx, 0, [['roasted_meat', 1], ['filtered_water_bottle', 1]])) {
      return actionFail('disaster', 'Need a meal and clean water for the evacuation.');
    }
    const effects: LostWorldEffects = {};
    spend(effects, ctx, 0, [['roasted_meat', 1], ['filtered_water_bottle', 1]]);
    state.hurricane.intensity = Math.max(1, state.hurricane.intensity - 1);
    state.flood.level = Math.max(0, state.flood.level - 0.4);
    state.recovery.settlement = Math.min(100, state.recovery.settlement + 4);
    lostWorldLog(state, ctx.day, 'The settlement moved to high ground for the storm.', 'warning');
    return actionOk('disaster', 'Everyone is on high ground. Storm impact reduced.', effects);
  }

  if (actionId === 'disaster_firefight') {
    if (state.fire.cells.length === 0) return actionFail('disaster', 'There is no fire.');
    const effects: LostWorldEffects = {};
    if (state.water.gallons >= 5) {
      state.water.gallons -= 5;
    } else if (itemCount(ctx, 'water_torrent') > 0) {
      effects.items = [{ itemId: 'water_torrent', quantity: -1 }];
    } else {
      return actionFail('disaster', 'Need water.');
    }
    effects.vitals = { stamina: -12 };
    const removed = Math.min(2, state.fire.cells.length);
    state.fire.cells.splice(0, removed);
    state.damage.damagedShelters = Math.max(0, state.damage.damagedShelters - 1);
    lostWorldLog(state, ctx.day, `Firefight knocked down ${removed} fire front(s).`, 'warning');
    return actionOk(
      'disaster',
      removed > 0
        ? `${removed} fire front(s) knocked down. ${state.fire.cells.length} remain.`
        : 'The last fire front is out.',
      effects,
    );
  }

  if (actionId === 'disaster_repair') {
    if (!canAfford(ctx, 80, [['wood', 6]])) return actionFail('disaster', 'Need 80 coins and 6 wood.');
    const effects: LostWorldEffects = {};
    spend(effects, ctx, 80, [['wood', 6]]);
    state.recovery.infrastructure = Math.min(100, state.recovery.infrastructure + 18);
    for (let i = 0; i < state.shelters.length; i++) {
      state.shelters[i].integrity = Math.min(150, state.shelters[i].integrity + 10);
    }
    state.damage.fallenTrees = Math.max(0, state.damage.fallenTrees - 2);
    return actionOk(
      'disaster',
      `Infrastructure recovery ${state.recovery.infrastructure}/100. Shelters reinforced.`,
      effects,
    );
  }

  if (actionId === 'disaster_rebuild') {
    if (!canAfford(ctx, 120, [['stone', 10]])) return actionFail('disaster', 'Need 120 coins and 10 stone.');
    const effects: LostWorldEffects = {};
    spend(effects, ctx, 120, [['stone', 10]]);
    state.recovery.settlement = Math.min(100, state.recovery.settlement + 22);
    for (let i = 0; i < state.shelters.length; i++) {
      state.shelters[i].integrity = Math.min(150, state.shelters[i].integrity + 15);
    }
    state.damage.damagedShelters = state.shelters.filter((s) => s.integrity < 85).length;
    addPersistentChange(state, ctx.day, 'recovery', 'Rebuilt settlement structures', ctx.playerX, ctx.playerZ);
    return actionOk(
      'disaster',
      `Settlement recovery ${state.recovery.settlement}/100. Homes and community buildings restored.`,
      effects,
    );
  }

  if (actionId === 'disaster_debris') {
    if (ctx.vitals.stamina < 8) return actionFail('disaster', 'Too exhausted.');
    if (state.damage.debris <= 0) return actionFail('disaster', 'No debris left to clear.');
    state.damage.debris -= 1;
    const effects: LostWorldEffects = {};
    grant(effects, 0, [['wood', 2]]);
    effects.vitals = { stamina: -8 };
    return actionOk('disaster', 'Debris cleared and 2 usable wood salvaged.', effects);
  }

  if (actionId === 'disaster_relief') {
    if (state.recovery.infrastructure < 60 || state.recovery.settlement < 40) {
      return actionFail('disaster', 'Not enough verified recovery work.');
    }
    const effects: LostWorldEffects = {};
    grant(effects, 180);
    state.recovery.infrastructure -= 60;
    state.recovery.settlement -= 40;
    lostWorldLog(state, ctx.day, 'Parish disaster relief paid out 180 coins.', 'good');
    return actionOk('disaster', 'Relief funds received: 180 coins.', effects);
  }

  if (actionId === 'lost_excavate') {
    if (state.civilization.excavationStage >= 5) return actionFail('lost', 'The stairwell is fully excavated.');
    if (ctx.recruitedCount < 1) return actionFail('lost', 'Recruit a worker for the dig.');
    if (!canAfford(ctx, 150, [['stone', 10]])) {
      return actionFail('lost', missingReason(ctx, 150, [['stone', 10]]));
    }
    const effects: LostWorldEffects = {};
    spend(effects, ctx, 150, [['stone', 10]]);
    state.civilization.excavationStage += 1;
    state.civilization.chambersFound += 1;
    const artifact = EXCAVATION_ARTIFACTS[state.civilization.excavationStage - 1];
    if (artifact) state.civilization.artifacts.push(artifact);
    grant(effects, 0, [['bone', 2]]);
    if (state.civilization.excavationStage >= 4) {
      grant(effects, 0, [['diamond', 1]]);
    }
    state.persistent.totalDiscoveries += 1;
    addPersistentChange(
      state,
      ctx.day,
      'civilization',
      `Excavated chamber ${state.civilization.excavationStage}`,
      -60,
      80,
    );
    if (state.civilization.excavationStage === 1 || state.civilization.excavationStage === 5) {
      effects.cinematic = {
        title: 'Beneath the Island',
        subtitle:
          state.civilization.excavationStage === 1
            ? 'The stairwell goes down farther than the island is tall.'
            : 'The city is open. Something down here has been waiting for a visitor.',
        duration: 6,
      };
    }
    lostWorldLog(state, ctx.day, artifact ?? 'Another chamber of the lost city opened.', 'discovery');
    return actionOk(
      'lost',
      `Excavation ${state.civilization.excavationStage}/5. ${artifact ?? 'A new chamber is open.'}`,
      effects,
    );
  }

  if (actionId === 'lost_chamber') {
    if (state.civilization.excavationStage < 2) return actionFail('lost', 'Excavate deeper first.');
    if (state.civilization.chambersFound >= 6) return actionFail('lost', 'Every mapped chamber is explored.');
    if (ctx.coins < 40 || ctx.vitals.stamina < 12) return actionFail('lost', 'Need 40 coins and stamina.');
    const effects: LostWorldEffects = {};
    spend(effects, ctx, 40);
    effects.vitals = { stamina: -12 };
    state.civilization.chambersFound += 1;
    state.civilization.artifacts.push(`Chamber ${state.civilization.chambersFound}: a wall of names in a dead language.`);
    state.research.researchPoints += 18;
    state.persistent.totalDiscoveries += 1;
    grant(effects, 0, [['emerald', 1]]);
    addPersistentChange(state, ctx.day, 'civilization', 'Explored a buried chamber', -60, 80);
    return actionOk(
      'lost',
      `Chamber ${state.civilization.chambersFound}/6 mapped. An emerald was recovered.`,
      effects,
    );
  }

  if (actionId === 'lost_gate') {
    if (state.civilization.gateOpened) return actionFail('lost', 'The gate is already open.');
    if (state.civilization.excavationStage < 4) return actionFail('lost', 'Excavate to the gate first.');
    if (state.mystery.cluesFound.length < 6) {
      return actionFail('lost', `Find ${6 - state.mystery.cluesFound.length} more mystery clues.`);
    }
    state.civilization.gateOpened = true;
    state.persistent.totalDiscoveries += 1;
    const effects: LostWorldEffects = {};
    grant(effects, 400, [['diamond', 2]]);
    effects.cinematic = {
      title: 'The Twelve-Symbol Gate',
      subtitle: 'The missing symbol was your name. The gate opens inward.',
      duration: 7,
    };
    addPersistentChange(state, ctx.day, 'civilization', 'Opened the Twelve-Symbol Gate', -60, 80);
    lostWorldLog(state, ctx.day, 'The Twelve-Symbol Gate is open.', 'discovery');
    return actionOk('lost', 'The gate opens. 400 coins and 2 diamonds recovered from the threshold.', effects);
  }

  if (actionId.startsWith('lost_boss_prep:')) {
    const boss = state.worldBosses.find((b) => b.id === actionId.slice('lost_boss_prep:'.length));
    if (!boss) return actionFail('lost', 'World boss not found.');
    if (boss.defeated) return actionFail('lost', 'Already defeated.');
    if (!canAfford(ctx, 0, [['ammo', 30], ['roasted_meat', 2], ['filtered_water_bottle', 2]])) {
      return actionFail('lost', 'Need 30 ammo, 2 meals and 2 clean waters.');
    }
    const effects: LostWorldEffects = {};
    spend(effects, ctx, 0, [['ammo', 30], ['roasted_meat', 2], ['filtered_water_bottle', 2]]);
    boss.prep = Math.min(boss.requiredPrep, boss.prep + 1);
    return actionOk(
      'lost',
      `${boss.name} prep ${boss.prep}/${boss.requiredPrep}. Supplies staged at the trailhead.`,
      effects,
    );
  }

  if (actionId.startsWith('lost_boss_fight:')) {
    const boss = state.worldBosses.find((b) => b.id === actionId.slice('lost_boss_fight:'.length));
    if (!boss) return actionFail('lost', 'World boss not found.');
    if (boss.defeated) return actionFail('lost', 'Already defeated.');
    if (boss.prep < boss.requiredPrep) return actionFail('lost', 'Not enough preparation.');
    if (ctx.recruitedCount < 1) return actionFail('lost', 'Bring at least one recruit.');
    boss.attempts += 1;
    const coOpBonus = ctx.multiplayerConnected ? 0.15 : 0;
    const chance = Math.min(
      0.92,
      0.3 + boss.prep * 0.1 + ctx.recruitedCount * 0.05 + coOpBonus,
    );
    const success = nextLostWorldRandom(state) < chance;
    if (!success) {
      boss.prep = Math.max(0, boss.prep - 1);
      return actionOk(
        'lost',
        `${boss.name} drove the expedition back. Regroup, resupply and try again.`,
        { vitals: { health: -25, stamina: -30 } },
      );
    }
    boss.defeated = true;
    state.persistent.totalDiscoveries += 1;
    const effects: LostWorldEffects = {};
    grant(effects, 900, [['diamond', 2], ['gold_bar', 2]]);
    effects.cinematic = {
      title: boss.name,
      subtitle: 'The thing that ruled the deep is finally still.',
      duration: 7,
    };
    addPersistentChange(state, ctx.day, 'discovery', `Defeated ${boss.name}`, ctx.playerX, ctx.playerZ);
    lostWorldLog(state, ctx.day, `${boss.name} defeated. The island will remember.`, 'discovery');
    return actionOk('lost', `${boss.name} defeated! ${boss.rewards}.`, effects);
  }

  if (actionId.startsWith('lost_bond:')) {
    const dragonId = actionId.slice('lost_bond:'.length);
    const dragon = ctx.dragons.find((d) => d.id === dragonId);
    if (!dragon) return actionFail('lost', 'Dragon not found.');
    if (itemCount(ctx, 'raw_meat') < 1) return actionFail('lost', 'Need 1 raw meat.');
    const effects: LostWorldEffects = {};
    spend(effects, ctx, 0, [['raw_meat', 1]]);
    let bond = state.dragonBonds.find((b) => b.dragonId === dragonId);
    if (!bond) {
      bond = { dragonId, name: dragon.name, xp: 0, level: 1, lastBondDay: ctx.day };
      state.dragonBonds.push(bond);
    }
    bond.xp += 25;
    bond.level = Math.min(5, 1 + Math.floor(bond.xp / 50));
    bond.lastBondDay = ctx.day;
    effects.feedDragonId = dragonId;
    lostWorldLog(state, ctx.day, `Bonded with ${dragon.name} (Lv ${bond.level}).`, 'good');
    return actionOk(
      'lost',
      `${dragon.name} bond level ${bond.level}. ${bond.level >= 5 ? 'Fully bonded.' : `${50 - (bond.xp % 50)} XP to next level.`}`,
      effects,
    );
  }

  if (actionId.startsWith('lost_fly:')) {
    const dragonId = actionId.slice('lost_fly:'.length);
    const dragon = ctx.dragons.find((d) => d.id === dragonId);
    const bond = state.dragonBonds.find((b) => b.dragonId === dragonId);
    if (!dragon || !bond) return actionFail('lost', 'Bond with the dragon first.');
    if (bond.level < 2) return actionFail('lost', 'The dragon will not carry you yet.');
    if (ctx.vitals.stamina < 15) return actionFail('lost', 'Too exhausted to fly.');
    bond.xp += 12;
    bond.level = Math.min(5, 1 + Math.floor(bond.xp / 50));
    bond.lastBondDay = ctx.day;
    state.persistent.totalDiscoveries += 1;
    return actionOk(
      'lost',
      `Aerial survey with ${dragon.name} complete. Bond level ${bond.level}.`,
      { vitals: { stamina: -15 } },
    );
  }

  if (actionId.startsWith('lost_clue:')) {
    const clue = allMysteryClues().find((c) => c.id === actionId.slice('lost_clue:'.length));
    if (!clue) return actionFail('lost', 'Clue not found.');
    if (state.mystery.cluesFound.includes(clue.id)) return actionFail('lost', 'Already found.');
    if (distanceTo(ctx, clue.x, clue.z) > 100) return actionFail('lost', 'Get closer to the clue.');
    state.mystery.cluesFound.push(clue.id);
    state.mystery.storyStage = state.mystery.cluesFound.length;
    state.mystery.lore.push(`${clue.title}: ${clue.text}`);
    const effects: LostWorldEffects = {};
    grant(effects, 50, [[clue.rewardItem, 1]]);
    addPersistentChange(state, ctx.day, 'discovery', `Mystery clue: ${clue.title}`, clue.x, clue.z);
    lostWorldLog(state, ctx.day, `Mystery clue found: ${clue.text}`, 'discovery');
    if (state.mystery.cluesFound.length >= 12 && !state.mystery.finalRevealed) {
      state.mystery.finalRevealed = true;
      grant(effects, 600, [['diamond', 3]]);
      effects.cinematic = {
        title: 'The Living Mystery',
        subtitle: 'The twelfth clue was always yours. The island has been answering you the whole time.',
        duration: 9,
      };
      state.persistent.totalDiscoveries += 4;
      addPersistentChange(state, ctx.day, 'discovery', 'Revealed the living mystery', clue.x, clue.z);
      lostWorldLog(state, ctx.day, 'The living mystery is revealed.', 'discovery');
    }
    return actionOk('lost', `${clue.title}: ${clue.text}`, effects);
  }

  if (actionId === 'lost_claim_stage') {
    if (state.evolution.stage <= state.evolution.lastClaimedStage) {
      return actionFail('lost', 'No unclaimed stage reward.');
    }
    const payout = 150 + state.evolution.stage * 100;
    state.evolution.lastClaimedStage = state.evolution.stage;
    const effects: LostWorldEffects = {};
    grant(effects, payout);
    lostWorldLog(state, ctx.day, `Claimed ${state.evolution.stageName} legacy reward: ${payout} coins.`, 'good');
    return actionOk('lost', `${state.evolution.stageName} reward claimed: ${payout} coins.`, effects);
  }

  return null;
}
