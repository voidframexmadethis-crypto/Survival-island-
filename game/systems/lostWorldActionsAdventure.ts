import type { ItemId } from '../types';
import type { LostWorldActionContext, LostWorldEffects, LostWorldState } from './lostWorldExpansion';
import { addPersistentChange, lostWorldLog } from './lostWorldExpansion';
import {
  actionFail,
  actionOk,
  adjustDistrict,
  adjustTrust,
  canAfford,
  costLabel,
  distanceTo,
  grant,
  missingReason,
  spend,
  type ActionEmitter,
  type ActionOutcome,
} from './lostWorldActionShared';

const EXPEDITION_DESTINATIONS: {
  id: string;
  name: string;
  hours: number;
  risk: number;
  rewardItem: ItemId;
  description: string;
}[] = [
  { id: 'basin', name: 'Atchafalaya Basin', hours: 5, risk: 0.24, rewardItem: 'hide', description: 'Cypress channels, trapper camps and plenty of game.' },
  { id: 'gulf', name: 'Open Gulf', hours: 6, risk: 0.32, rewardItem: 'ocean_fish', description: 'Blue water, oil platforms and weather that turns fast.' },
  { id: 'ridge', name: 'Crag Ridge', hours: 4, risk: 0.2, rewardItem: 'metal_ore', description: 'High ground, ore seams and old survey markers.' },
  { id: 'ruins', name: 'Sunken Ruins', hours: 7, risk: 0.4, rewardItem: 'emerald', description: 'A drowned mission and a reef that is not entirely natural.' },
];

const CHOICE_COSTS: Record<string, number> = {
  hire: 90,
  pay: 60,
  skiff: 40,
  solve: 30,
};

function conversationLine(
  state: LostWorldState,
  ctx: LostWorldActionContext,
  npc: LostWorldState['npcs'][number],
): string {
  const event = state.events.find((e) => !e.resolved);
  if (event) {
    if (event.kind === 'emergency') return `${npc.name}: "You hear that? ${event.title}. Go on, I'll watch your gear."`;
    if (event.kind === 'festival') return `${npc.name}: "The whole district is out for ${event.title}. You should come."`;
    return `${npc.name}: "Word is there's trouble at ${event.title}. Be careful out there."`;
  }
  if (state.hurricane.active) return `${npc.name}: "The water is already over the low road. Get your people to high ground."`;
  if (state.flood.level > 1) return `${npc.name}: "Flood's up. Don't try the underpass unless you want to swim."`;
  if (npc.trust >= 40) return `${npc.name}: "You've done right by this place. Anything you need, ask."`;
  if (npc.trust < -10) return `${npc.name}: "I remember what you did. Don't expect a discount."`;
  if (npc.activity === 'eating') return `${npc.name}: "Sit. There's enough for one more plate."`;
  if (npc.activity === 'working') return `${npc.name}: "Working through the list. ${npc.personality}"`;
  if (ctx.weather === 'rain') return `${npc.name}: "Rain's good for the garden and bad for the roads."`;
  return `${npc.name}: "${npc.personality}"`;
}

export function describeAdventureAndPeopleActions(
  state: LostWorldState,
  ctx: LostWorldActionContext,
  emit: ActionEmitter,
): void {
  // Feature 28: multi-stage adventures with branching choices.
  for (let i = 0; i < state.adventures.length; i++) {
    const adv = state.adventures[i];
    if (adv.completed) continue;
    const stage = adv.stages[adv.stage];
    if (!stage) continue;
    if (stage.choices && !adv.branch) {
      for (let c = 0; c < stage.choices.length; c++) {
        const choice = stage.choices[c];
        const coinCost = CHOICE_COSTS[choice.id] ?? 0;
        emit({
          id: `adventure_choose:${adv.id}:${choice.id}`,
          tab: 'adventure',
          label: `${adv.name}: ${choice.label}`,
          description: choice.consequence,
          costLabel: costLabel(coinCost),
          available: ctx.coins >= coinCost,
          reason: ctx.coins >= coinCost ? undefined : `Need ${coinCost} coins`,
          tone: 'discovery',
        });
      }
    } else {
      const items = [['roasted_meat', 1]] as const;
      const affordable = canAfford(ctx, 60, items);
      emit({
        id: `adventure_advance:${adv.id}`,
        tab: 'adventure',
        label: `${adv.name}: ${stage.title}`,
        description: `${stage.description} Objective: ${stage.objective}`,
        costLabel: costLabel(60, items),
        available: affordable,
        reason: affordable ? undefined : missingReason(ctx, 60, items),
        tone: 'discovery',
      });
    }
  }

  // Feature 26: underwater exploration.
  for (let i = 0; i < state.diveSites.length; i++) {
    const site = state.diveSites[i];
    if (site.explored) continue;
    emit({
      id: `adventure_dive:${site.id}`,
      tab: 'adventure',
      label: `Dive: ${site.name}`,
      description: `${site.description} Depth ${site.depth}m. Charter a boat and dive with a light and a line.`,
      costLabel: costLabel(60) + ' · stamina',
      available: ctx.coins >= 60 && ctx.vitals.stamina >= 20,
      reason:
        ctx.coins < 60 ? 'Need 60 coins for the charter' : ctx.vitals.stamina < 20 ? 'Too exhausted to dive' : undefined,
      tone: 'discovery',
    });
  }

  // Feature 27: procedural treasure maps, clues and digs.
  for (let i = 0; i < state.treasures.length; i++) {
    const t = state.treasures[i];
    if (t.dug) continue;
    if (t.cluesDecoded < t.cluesTotal) {
      emit({
        id: `adventure_decode:${t.id}`,
        tab: 'adventure',
        label: `Decode ${t.name} clue ${t.cluesDecoded + 1}/${t.cluesTotal}`,
        description: `The map is torn into ${t.cluesTotal} sections. Each decode narrows the dig site.`,
        costLabel: costLabel(25),
        available: ctx.coins >= 25,
        reason: ctx.coins >= 25 ? undefined : 'Need 25 coins',
        tone: 'info',
      });
    } else {
      const dist = distanceTo(ctx, t.digX, t.digZ);
      emit({
        id: `adventure_dig:${t.id}`,
        tab: 'adventure',
        label: `Dig at ${t.name} site`,
        description: `The full map points to a spot ${Math.round(dist)}m away. Bring a shovel and daylight.`,
        costLabel: 'Free',
        available: dist <= 90,
        reason: dist <= 90 ? undefined : 'Get within 90m of the dig site',
        tone: 'discovery',
      });
    }
  }

  // Feature 30: expeditions.
  if (!state.expedition || !state.expedition.active) {
    for (let i = 0; i < EXPEDITION_DESTINATIONS.length; i++) {
      const d = EXPEDITION_DESTINATIONS[i];
      const affordable =
        canAfford(ctx, 150, [['roasted_meat', 2], ['filtered_water_bottle', 2], ['ammo', 10]]) &&
        ctx.recruitedCount >= 1;
      emit({
        id: `adventure_expedition:${d.id}`,
        tab: 'adventure',
        label: `Expedition: ${d.name}`,
        description: `${d.description} ${d.hours}h round trip, risk ${Math.round(d.risk * 100)}%. A larger, better-equipped team improves the odds.`,
        costLabel: costLabel(150, [['roasted_meat', 2], ['filtered_water_bottle', 2], ['ammo', 10]]),
        available: affordable,
        reason:
          ctx.recruitedCount < 1
            ? 'Recruit at least one survivor first'
            : affordable
              ? undefined
              : missingReason(ctx, 150, [['roasted_meat', 2], ['filtered_water_bottle', 2], ['ammo', 10]]),
        tone: 'info',
      });
    }
  }
  if (state.expedition?.resolved) {
    emit({
      id: 'adventure_claim_expedition',
      tab: 'adventure',
      label: 'Debrief the Expedition',
      description: state.expedition.outcome,
      costLabel: 'Free',
      available: true,
      tone: 'good',
    });
  }

  // Feature 31-34: NPC memory, conversations and recruitment.
  for (let i = 0; i < state.npcs.length; i++) {
    const npc = state.npcs[i];
    const dist = distanceTo(ctx, npc.x, npc.z);
    emit({
      id: `people_talk:${npc.id}`,
      tab: 'people',
      label: `Talk to ${npc.name}`,
      description: `${npc.role.replace(/_/g, ' ')} · ${npc.activity}. Trust ${Math.round(npc.trust)}. ${npc.personality}`,
      costLabel: 'Free',
      available: dist <= 90,
      reason: dist <= 90 ? undefined : `${Math.round(dist)}m away`,
      tone: 'info',
    });
    const gifts = [['berries', 2]] as const;
    emit({
      id: `people_favor:${npc.id}`,
      tab: 'people',
      label: `Do ${npc.name} a favor`,
      description: 'Bring food and help with the day’s work. Builds trust and unlocks better prices.',
      costLabel: costLabel(30, gifts),
      available: dist <= 90 && canAfford(ctx, 30, gifts),
      reason: dist > 90 ? 'Get closer' : canAfford(ctx, 30, gifts) ? undefined : 'Need 30 coins and 2 berries',
      tone: 'good',
    });
    emit({
      id: `people_confront:${npc.id}`,
      tab: 'people',
      label: `Confront ${npc.name}`,
      description: 'Settle a dispute directly. Fast, but people remember how you speak to them.',
      costLabel: 'Free',
      available: dist <= 90,
      reason: dist <= 90 ? undefined : 'Get closer',
      tone: 'warning',
    });
  }

  // Feature 33: rescue and recruitment.
  for (let i = 0; i < state.recruits.length; i++) {
    const r = state.recruits[i];
    if (r.status === 'unmet') {
      emit({
        id: `people_rescue:${r.id}`,
        tab: 'people',
        label: `Rescue ${r.name}`,
        description: `${r.story} ${r.skill} skill. A boat, fuel and a day of searching should find them.`,
        costLabel: costLabel(80) + ' · stamina',
        available: ctx.coins >= 80 && ctx.vitals.stamina >= 10,
        reason: ctx.coins < 80 ? 'Need 80 coins' : 'Too exhausted to search',
        tone: 'discovery',
      });
    } else if (r.status === 'rescued') {
      emit({
        id: `people_recruit:${r.id}`,
        tab: 'people',
        label: `Invite ${r.name} to the settlement`,
        description: `${r.story} Morale ${r.morale}. A recruited survivor contributes to the community.`,
        costLabel: 'Free',
        available: true,
        tone: 'good',
      });
    } else if (r.status === 'recruited') {
      const roles = ['construction', 'defense', 'supplies', 'maintenance'] as const;
      for (let k = 0; k < roles.length; k++) {
        emit({
          id: `people_assign:${r.id}:${roles[k]}`,
          tab: 'people',
          label: `Assign ${r.name} to ${roles[k]}`,
          description: `${r.skill} specialist. Construction builds community projects, supplies gather food and fuel, maintenance repairs shelters, defense guards the settlement.`,
          costLabel: 'Free',
          available: r.assignment !== roles[k],
          reason: r.assignment === roles[k] ? 'Already assigned there' : undefined,
          tone: 'info',
        });
      }
    }
  }

  emit({
    id: 'people_gift',
    tab: 'people',
    label: 'Spend time with your navigator',
    description: 'Share a meal and talk about the route ahead. Strengthens the companion bond.',
    costLabel: costLabel(0, [['berries', 2]]),
    available: ctx.navigatorActive && ctx.items.berries !== undefined && (ctx.items.berries ?? 0) >= 2,
    reason: !ctx.navigatorActive ? 'Navigator is not travelling with you' : 'Need 2 berries',
    tone: 'info',
  });

  // Feature 35: community development projects.
  for (let i = 0; i < state.communityProjects.length; i++) {
    const project = state.communityProjects[i];
    if (project.built) continue;
    emit({
      id: `people_project:${project.id}`,
      tab: 'people',
      label: `Fund ${project.name} (${project.progress}/${project.goal})`,
      description: `${project.description} Benefit: ${project.benefit}.`,
      costLabel: costLabel(40),
      available: ctx.coins >= 40,
      reason: ctx.coins >= 40 ? undefined : 'Need 40 coins',
      tone: 'info',
    });
    emit({
      id: `people_project_build:${project.id}`,
      tab: 'people',
      label: `Complete ${project.name}`,
      description: `${project.description} The settlement crew is ready to break ground.`,
      costLabel: 'Free',
      available: project.progress >= project.goal,
      reason: project.progress >= project.goal ? undefined : 'Funding is not complete yet',
      tone: 'good',
    });
  }
}

export function applyAdventureAndPeopleAction(
  actionId: string,
  state: LostWorldState,
  ctx: LostWorldActionContext,
): ActionOutcome | null {
  if (actionId.startsWith('adventure_choose:')) {
    const [, advId, choiceId] = actionId.split(':');
    const adv = state.adventures.find((a) => a.id === advId);
    if (!adv) return actionFail('adventure', 'Adventure not found.');
    const stage = adv.stages[adv.stage];
    const choice = stage?.choices?.find((c) => c.id === choiceId);
    if (!stage || !choice) return actionFail('adventure', 'That choice is no longer available.');
    if (adv.branch) return actionFail('adventure', 'You already chose a path.');
    const coinCost = CHOICE_COSTS[choice.id] ?? 0;
    if (!canAfford(ctx, coinCost)) return actionFail('adventure', `Need ${coinCost} coins.`);
    const effects: LostWorldEffects = {};
    spend(effects, ctx, coinCost);
    adv.branch = choice.id;
    adv.log.push(`${stage.title}: ${choice.label}. ${choice.consequence}`);
    adv.stage = Math.min(adv.stages.length - 1, adv.stage + 1);
    lostWorldLog(state, ctx.day, `${adv.name}: chose "${choice.label}".`, 'info');
    return actionOk('adventure', `${adv.name}: ${choice.consequence}`, effects);
  }

  if (actionId.startsWith('adventure_advance:')) {
    const adv = state.adventures.find((a) => a.id === actionId.slice('adventure_advance:'.length));
    if (!adv) return actionFail('adventure', 'Adventure not found.');
    if (adv.completed) return actionFail('adventure', 'Already completed.');
    const stage = adv.stages[adv.stage];
    if (!stage) return actionFail('adventure', 'No stage left.');
    if (stage.choices && !adv.branch) return actionFail('adventure', 'Choose a path first.');
    if (!canAfford(ctx, 60, [['roasted_meat', 1]])) {
      return actionFail('adventure', missingReason(ctx, 60, [['roasted_meat', 1]]));
    }
    const effects: LostWorldEffects = {};
    spend(effects, ctx, 60, [['roasted_meat', 1]]);
    adv.log.push(`${stage.title}: ${stage.objective}`);
    if (adv.stage >= adv.stages.length - 1) {
      adv.completed = true;
      grant(effects, 320, [['gold_bar', 1], ['emerald', 1]]);
      effects.cinematic = {
        title: adv.name,
        subtitle: 'The story closes, but the bayou keeps its receipts.',
        duration: 6,
      };
      state.persistent.totalDiscoveries += 1;
      addPersistentChange(state, ctx.day, 'discovery', `Completed ${adv.name}`, ctx.playerX, ctx.playerZ);
      lostWorldLog(state, ctx.day, `Completed the adventure: ${adv.name}.`, 'discovery');
      return actionOk('adventure', `${adv.name} complete. 320 coins, a gold bar and an emerald.`, effects);
    }
    adv.stage += 1;
    const next = adv.stages[adv.stage];
    return actionOk('adventure', `Stage complete. Next: ${next?.title ?? 'Finale'}.`, effects);
  }

  if (actionId.startsWith('adventure_dive:')) {
    const site = state.diveSites.find((s) => s.id === actionId.slice('adventure_dive:'.length));
    if (!site) return actionFail('adventure', 'Dive site not found.');
    if (site.explored) return actionFail('adventure', 'Already explored.');
    if (ctx.coins < 60 || ctx.vitals.stamina < 20) return actionFail('adventure', 'Need 60 coins and stamina.');
    const effects: LostWorldEffects = {};
    spend(effects, ctx, 60);
    grant(effects, site.coins, [[site.lootItem, site.lootQuantity]]);
    effects.vitals = { stamina: -18 };
    site.explored = true;
    state.persistent.totalDiscoveries += 1;
    addPersistentChange(state, ctx.day, 'discovery', `Dove ${site.name}`, site.x, site.z);
    lostWorldLog(
      state,
      ctx.day,
      `Explored ${site.name} at ${site.depth}m: ${site.lootQuantity}× ${site.lootItem.replace(/_/g, ' ')} and ${site.coins} coins.`,
      'discovery',
    );
    return actionOk(
      'adventure',
      `${site.name} explored. Recovered ${site.lootQuantity}× ${site.lootItem.replace(/_/g, ' ')} and ${site.coins} coins.`,
      effects,
    );
  }

  if (actionId.startsWith('adventure_decode:')) {
    const t = state.treasures.find((x) => x.id === actionId.slice('adventure_decode:'.length));
    if (!t) return actionFail('adventure', 'Map not found.');
    if (t.dug) return actionFail('adventure', 'Already dug.');
    if (t.cluesDecoded >= t.cluesTotal) return actionFail('adventure', 'The map is fully decoded.');
    if (!canAfford(ctx, 25)) return actionFail('adventure', 'Need 25 coins.');
    const effects: LostWorldEffects = {};
    spend(effects, ctx, 25);
    t.cluesDecoded += 1;
    state.persistent.totalDiscoveries += 1;
    return actionOk(
      'adventure',
      t.cluesDecoded >= t.cluesTotal
        ? `${t.name}: the final section points to ${Math.round(t.digX)}, ${Math.round(t.digZ)}.`
        : `${t.name}: section ${t.cluesDecoded}/${t.cluesTotal} decoded.`,
      effects,
    );
  }

  if (actionId.startsWith('adventure_dig:')) {
    const t = state.treasures.find((x) => x.id === actionId.slice('adventure_dig:'.length));
    if (!t) return actionFail('adventure', 'Treasure not found.');
    if (t.dug) return actionFail('adventure', 'Already dug.');
    if (t.cluesDecoded < t.cluesTotal) return actionFail('adventure', 'Decode the whole map first.');
    if (distanceTo(ctx, t.digX, t.digZ) > 90) return actionFail('adventure', 'Get within 90m of the dig site.');
    const effects: LostWorldEffects = {};
    grant(effects, t.rewardCoins, [[t.rewardItem, 2]]);
    t.dug = true;
    state.persistent.totalDiscoveries += 1;
    addPersistentChange(state, ctx.day, 'discovery', `Dug up ${t.artifact}`, t.digX, t.digZ);
    lostWorldLog(state, ctx.day, `Recovered ${t.artifact} and ${t.rewardCoins} coins.`, 'discovery');
    return actionOk('adventure', `Recovered ${t.artifact}! ${t.rewardCoins} coins and 2× ${t.rewardItem.replace(/_/g, ' ')}.`, effects);
  }

  if (actionId.startsWith('adventure_expedition:')) {
    if (state.expedition?.active) return actionFail('adventure', 'An expedition is already running.');
    const dest = EXPEDITION_DESTINATIONS.find(
      (d) => d.id === actionId.slice('adventure_expedition:'.length),
    );
    if (!dest) return actionFail('adventure', 'Unknown destination.');
    if (ctx.recruitedCount < 1) return actionFail('adventure', 'Recruit at least one survivor first.');
    const supplies = [['roasted_meat', 2], ['filtered_water_bottle', 2], ['ammo', 10]] as const;
    if (!canAfford(ctx, 150, supplies)) {
      return actionFail('adventure', missingReason(ctx, 150, supplies));
    }
    const effects: LostWorldEffects = {};
    spend(effects, ctx, 150, supplies);
    const studentBonus = state.companions.reduce((sum, c) => sum + c.bond, 0) / 500;
    const dockBonus = state.communityProjects.find((p) => p.id === 'comm_dock')?.built ? 0.08 : 0;
    state.expedition = {
      id: `expedition_${ctx.day}`,
      destination: dest.name,
      durationHours: dest.hours,
      hoursLeft: dest.hours,
      teamSize: Math.max(1, ctx.recruitedCount),
      supplies: 2,
      risk: Math.max(0.08, dest.risk - ctx.recruitedCount * 0.05 - dockBonus - studentBonus),
      active: true,
      resolved: false,
      outcome: '',
      rewardCoins: 240,
      rewardItem: dest.rewardItem,
    };
    lostWorldLog(
      state,
      ctx.day,
      `Expedition departed for ${dest.name} with ${Math.max(1, ctx.recruitedCount)} team member(s).`,
      'info',
    );
    return actionOk(
      'adventure',
      `Expedition to ${dest.name} departed. It returns in ${dest.hours} in-game hours; check back for the outcome.`,
      effects,
    );
  }

  if (actionId === 'adventure_claim_expedition') {
    const exp = state.expedition;
    if (!exp || !exp.resolved) return actionFail('adventure', 'No expedition to debrief.');
    const success = exp.outcome.toLowerCase().includes('supplies');
    const effects: LostWorldEffects = {};
    if (success) {
      grant(effects, exp.rewardCoins, [[exp.rewardItem, 2], ['bone', 1]]);
      state.persistent.totalDiscoveries += 1;
      addPersistentChange(state, ctx.day, 'discovery', `Expedition returned from ${exp.destination}`, ctx.playerX, ctx.playerZ);
    }
    state.expedition = null;
    lostWorldLog(state, ctx.day, 'The expedition team debriefed at camp.', success ? 'good' : 'warning');
    return actionOk(
      'adventure',
      success
        ? `Expedition debriefed. ${exp.rewardCoins} coins, 2× ${exp.rewardItem.replace(/_/g, ' ')} and a bone recovered.`
        : 'The team came back empty-handed. Better supplies and a bigger team next time.',
      effects,
    );
  }

  if (actionId.startsWith('people_talk:')) {
    const npc = state.npcs.find((n) => n.id === actionId.slice('people_talk:'.length));
    if (!npc) return actionFail('people', 'NPC not found.');
    if (distanceTo(ctx, npc.x, npc.z) > 90) return actionFail('people', 'Get closer to talk.');
    npc.encounters += 1;
    const line = conversationLine(state, ctx, npc);
    npc.lastLine = line;
    adjustDistrict(state, npc.region === 'island' ? 'bayou_outskirts' : 'french_quarter', 0.4);
    const memory = state.npcMemory.find((m) => m.npcId === npc.id);
    if (memory) {
      memory.encounters += 1;
      memory.lastLine = line;
      memory.lastTopic = state.events[0]?.title ?? state.seasons.label;
    } else {
      state.npcMemory.push({
        npcId: npc.id,
        trust: npc.trust,
        encounters: npc.encounters,
        favors: npc.favors,
        conflicts: npc.conflicts,
        lastTopic: state.seasons.label,
        lastLine: line,
      });
    }
    state.conversations.unshift({ npcId: npc.id, lastLine: line, context: state.seasons.label, day: ctx.day });
    if (state.conversations.length > 20) state.conversations.length = 20;
    return actionOk('people', line);
  }

  if (actionId.startsWith('people_favor:')) {
    const npc = state.npcs.find((n) => n.id === actionId.slice('people_favor:'.length));
    if (!npc) return actionFail('people', 'NPC not found.');
    if (distanceTo(ctx, npc.x, npc.z) > 90) return actionFail('people', 'Get closer.');
    if (!canAfford(ctx, 30, [['berries', 2]])) return actionFail('people', 'Need 30 coins and 2 berries.');
    const effects: LostWorldEffects = {};
    spend(effects, ctx, 30, [['berries', 2]]);
    adjustTrust(state, npc.id, 6);
    return actionOk('people', `${npc.name} trusts you more. Trust is now ${Math.round(npc.trust)}.`, effects);
  }

  if (actionId.startsWith('people_confront:')) {
    const npc = state.npcs.find((n) => n.id === actionId.slice('people_confront:'.length));
    if (!npc) return actionFail('people', 'NPC not found.');
    if (distanceTo(ctx, npc.x, npc.z) > 90) return actionFail('people', 'Get closer.');
    adjustTrust(state, npc.id, -8);
    return actionOk('people', `${npc.name} will remember that. Trust is now ${Math.round(npc.trust)}.`);
  }

  if (actionId.startsWith('people_rescue:')) {
    const r = state.recruits.find((x) => x.id === actionId.slice('people_rescue:'.length));
    if (!r) return actionFail('people', 'Survivor not found.');
    if (r.status !== 'unmet') return actionFail('people', 'Already rescued.');
    if (ctx.coins < 80 || ctx.vitals.stamina < 10) return actionFail('people', 'Need 80 coins and stamina.');
    const effects: LostWorldEffects = {};
    spend(effects, ctx, 80);
    effects.vitals = { stamina: -10 };
    r.status = 'rescued';
    r.x = ctx.playerX + 5;
    r.z = ctx.playerZ + 5;
    addPersistentChange(state, ctx.day, 'discovery', `Rescued ${r.name}`, r.x, r.z);
    lostWorldLog(state, ctx.day, `${r.name} was found and brought to camp.`, 'good');
    return actionOk('people', `${r.name} rescued. Invite them to join the settlement.`, effects);
  }

  if (actionId.startsWith('people_recruit:')) {
    const r = state.recruits.find((x) => x.id === actionId.slice('people_recruit:'.length));
    if (!r) return actionFail('people', 'Survivor not found.');
    if (r.status !== 'rescued') return actionFail('people', 'Rescue them first.');
    r.status = 'recruited';
    r.morale = Math.max(60, r.morale);
    addPersistentChange(state, ctx.day, 'settlement', `${r.name} joined the settlement`, r.x, r.z);
    lostWorldLog(state, ctx.day, `${r.name} joined the settlement as a ${r.skill}.`, 'good');
    return actionOk('people', `${r.name} joined the settlement. Assign them to a role.`);
  }

  if (actionId.startsWith('people_assign:')) {
    const [, recruitId, assignment] = actionId.split(':');
    const r = state.recruits.find((x) => x.id === recruitId);
    if (!r) return actionFail('people', 'Recruit not found.');
    if (r.status !== 'recruited' && r.status !== 'assigned') return actionFail('people', 'They have not joined yet.');
    if (!['construction', 'defense', 'supplies', 'maintenance', 'idle'].includes(assignment)) {
      return actionFail('people', 'Unknown assignment.');
    }
    r.status = 'assigned';
    r.assignment = assignment as typeof r.assignment;
    state.persistent.settlementTier = Math.max(1, state.persistent.settlementTier);
    lostWorldLog(state, ctx.day, `${r.name} assigned to ${assignment}.`, 'info');
    return actionOk('people', `${r.name} is now working on ${assignment}.`);
  }

  if (actionId === 'people_gift') {
    if (!ctx.navigatorActive) return actionFail('people', 'The navigator is not travelling with you.');
    if ((ctx.items.berries ?? 0) < 2) return actionFail('people', 'Need 2 berries.');
    const effects: LostWorldEffects = {};
    spend(effects, ctx, 0, [['berries', 2]]);
    const companion = state.companions.find((c) => c.id === 'navigator');
    if (companion) companion.bond = Math.min(100, companion.bond + 6);
    return actionOk('people', companion ? `Navigator bond is now ${companion.bond}.` : 'Shared a quiet meal.', effects);
  }

  if (actionId.startsWith('people_project:')) {
    const project = state.communityProjects.find(
      (p) => p.id === actionId.slice('people_project:'.length),
    );
    if (!project) return actionFail('people', 'Project not found.');
    if (project.built) return actionFail('people', 'Already built.');
    if (!canAfford(ctx, 40)) return actionFail('people', 'Need 40 coins.');
    const effects: LostWorldEffects = {};
    spend(effects, ctx, 40);
    project.progress = Math.min(project.goal, project.progress + 20);
    return actionOk(
      'people',
      `${project.name} progress ${project.progress}/${project.goal}.`,
      effects,
    );
  }

  if (actionId.startsWith('people_project_build:')) {
    const project = state.communityProjects.find(
      (p) => p.id === actionId.slice('people_project_build:'.length),
    );
    if (!project) return actionFail('people', 'Project not found.');
    if (project.built) return actionFail('people', 'Already built.');
    if (project.progress < project.goal) return actionFail('people', 'Not fully funded yet.');
    project.built = true;
    const effects: LostWorldEffects = {};
    const x = ctx.playerX + 4;
    const z = ctx.playerZ - 4;
    effects.placeStructure = {
      type: project.id === 'comm_watch' ? 'spike_barricade' : project.id === 'comm_clinic' ? 'sleeping_area' : 'basic_shelter',
      x,
      z,
      label: project.name,
    };
    addPersistentChange(state, ctx.day, 'construction', `Completed ${project.name}`, x, z);
    lostWorldLog(state, ctx.day, `${project.name} is complete. ${project.benefit}.`, 'good');
    return actionOk('people', `${project.name} complete. ${project.benefit}.`, effects);
  }

  return null;
}
