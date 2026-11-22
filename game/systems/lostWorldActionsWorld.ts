import type { ItemId } from '../types';
import {
  addPersistentChange,
  lostWorldLog,
  nextLostWorldRandom,
  type LostWorldActionContext,
  type LostWorldEffects,
  type LostWorldState,
} from './lostWorldExpansion';
import {
  COOKING_RECIPES,
  SHELTER_BLUEPRINTS,
  actionFail,
  actionOk,
  adjustDistrict,
  adjustTrust,
  canAfford,
  costLabel,
  distanceTo,
  freshFood,
  grant,
  itemCount,
  itemName,
  missingReason,
  spend,
  type ActionEmitter,
  type ActionOutcome,
} from './lostWorldActionShared';

const TRACK_LOOT: Record<string, ItemId> = {
  footprint: 'bone',
  broken_branch: 'branch',
  fur: 'hide',
  droppings: 'plant_material',
  call: 'fiber',
};

export function describeWorldGroupActions(
  state: LostWorldState,
  ctx: LostWorldActionContext,
  emit: ActionEmitter,
): void {
  // Feature 2: dynamic world events.
  for (let i = 0; i < state.events.length; i++) {
    const ev = state.events[i];
    if (ev.resolved) continue;
    emit({
      id: `world_event:${ev.id}`,
      tab: 'world',
      label: `Respond: ${ev.title}`,
      description: `${ev.description} ${ev.hoursLeft}h left. Reward ${ev.rewardCoins}c${
        ev.rewardItem ? ` + ${ev.rewardQuantity ?? 1} ${itemName(ev.rewardItem)}` : ''
      }.`,
      costLabel: ev.kind === 'emergency' || ev.kind === 'accident' ? 'Some stamina' : 'Free',
      available: true,
      tone: ev.kind === 'emergency' ? 'danger' : ev.kind === 'discovery' ? 'discovery' : 'info',
    });
  }

  // Feature 3: wildlife territories can be appeased instead of fought.
  for (let i = 0; i < state.territories.length; i++) {
    const t = state.territories[i];
    if (t.aggression < 12) continue;
    emit({
      id: `world_tribute:${t.id}`,
      tab: 'world',
      label: `Offer tribute at ${t.displayName}`,
      description:
        'Leave meat at the edge of the territory. Lowers aggression and stops repeated attacks without wiping out the pack.',
      costLabel: costLabel(0, [['raw_meat', 1]]),
      available: itemCount(ctx, 'raw_meat') >= 1,
      reason: itemCount(ctx, 'raw_meat') >= 1 ? undefined : 'Need 1 raw meat',
      tone: 'warning',
    });
  }

  // Feature 5: persistent settlement founding.
  if (!state.persistent.settlementFounded) {
    const items = [['wood', 10]] as const;
    const affordable = canAfford(ctx, 150, items) && state.shelters.some((s) => s.built);
    emit({
      id: 'world_found_settlement',
      tab: 'world',
      label: 'Found a Settlement',
      description:
        state.shelters.some((s) => s.built)
          ? 'Register your shelters, stores and docks as a permanent settlement. Survives every save.'
          : 'Build at least one shelter first.',
      costLabel: costLabel(150, items),
      available: affordable,
      reason: !state.shelters.some((s) => s.built)
        ? 'Build a shelter first'
        : affordable
          ? undefined
          : missingReason(ctx, 150, items),
      tone: 'good',
    });
  }

  // Feature 6: advanced shelter construction.
  for (let i = 0; i < SHELTER_BLUEPRINTS.length; i++) {
    const bp = SHELTER_BLUEPRINTS[i];
    const affordable = canAfford(ctx, bp.coins, bp.items);
    emit({
      id: `survival_build:${bp.kind}`,
      tab: 'survival',
      label: bp.label,
      description: bp.description,
      costLabel: costLabel(bp.coins, bp.items),
      available: affordable,
      reason: affordable ? undefined : missingReason(ctx, bp.coins, bp.items),
      tone: 'good',
    });
  }

  if (!state.kitchen.grillBuilt) {
    emit({
      id: 'survival_grill',
      tab: 'survival',
      label: 'Build a Cooking Grill',
      description: 'A stone and iron grate that unlocks advanced cooking and preserves fuel.',
      costLabel: costLabel(20, [['wood', 12], ['stone', 8]]),
      available: canAfford(ctx, 20, [['wood', 12], ['stone', 8]]),
      reason: canAfford(ctx, 20, [['wood', 12], ['stone', 8]])
        ? undefined
        : missingReason(ctx, 20, [['wood', 12], ['stone', 8]]),
      tone: 'good',
    });
  }
  if (!state.kitchen.kitchenBuilt) {
    const items = [['wood', 20], ['metal_ore', 4]] as const;
    emit({
      id: 'survival_kitchen',
      tab: 'survival',
      label: 'Build a Full Kitchen',
      description: 'Slows food spoilage sharply and unlocks celebration recipes.',
      costLabel: costLabel(60, items),
      available: state.kitchen.grillBuilt && canAfford(ctx, 60, items),
      reason: !state.kitchen.grillBuilt
        ? 'Build the grill first'
        : canAfford(ctx, 60, items)
          ? undefined
          : missingReason(ctx, 60, items),
      tone: 'good',
    });
  }

  // Feature 9: advanced cooking.
  for (let i = 0; i < COOKING_RECIPES.length; i++) {
    const r = COOKING_RECIPES[i];
    const affordable = canAfford(ctx, r.coins, r.ingredients);
    emit({
      id: `survival_cook:${r.id}`,
      tab: 'survival',
      label: `Cook ${r.label}`,
      description: r.description,
      costLabel: costLabel(r.coins, r.ingredients),
      available: state.kitchen.grillBuilt && (!r.requiresKitchen || state.kitchen.kitchenBuilt) && affordable,
      reason: !state.kitchen.grillBuilt
        ? 'Build a cooking grill first'
        : r.requiresKitchen && !state.kitchen.kitchenBuilt
          ? 'Needs the full kitchen'
          : affordable
            ? undefined
            : missingReason(ctx, r.coins, r.ingredients),
      tone: 'good',
    });
  }

  const hasPreservable = state.food.some((f) => !f.preserved && !f.spoiled);
  emit({
    id: 'survival_preserve',
    tab: 'survival',
    label: 'Salt & Preserve Supplies',
    description: 'Salt-cure everything you are carrying so it will not spoil on the trail.',
    costLabel: costLabel(0, [['salt', 2]]),
    available: hasPreservable && itemCount(ctx, 'salt') >= 2,
    reason: !hasPreservable
      ? 'Nothing fresh to preserve'
      : itemCount(ctx, 'salt') >= 2
        ? undefined
        : 'Need 2 salt',
    tone: 'info',
  });
  const spoiled = state.food.filter((f) => f.spoiled);
  emit({
    id: 'survival_discard_spoiled',
    tab: 'survival',
    label: 'Discard Spoiled Food',
    description: spoiled.length > 0
      ? `${spoiled.map((s) => itemName(s.itemId)).join(', ')} have turned. Clear them out of the pack.`
      : 'Nothing has spoiled yet. Watch freshness in the survival panel.',
    costLabel: 'Free',
    available: spoiled.length > 0,
    reason: spoiled.length > 0 ? undefined : 'No spoiled food',
    tone: spoiled.length > 0 ? 'warning' : 'info',
  });

  // Feature 10: rescue and emergency signals.
  const radio = state.rescueSignals.find((s) => s.id === 'sig_radio');
  const flare = state.rescueSignals.find((s) => s.id === 'sig_flare');
  const signalFire = state.rescueSignals.find((s) => s.id === 'sig_fire');
  if (radio && !radio.built) {
    emit({
      id: 'survival_radio',
      tab: 'survival',
      label: 'Build a Radio Tower',
      description: 'A mast and salvaged radio that can reach ships and the mainland on a clear channel.',
      costLabel: costLabel(100, [['metal_ore', 8], ['iron_ingot', 2]]),
      available: canAfford(ctx, 100, [['metal_ore', 8], ['iron_ingot', 2]]),
      reason: canAfford(ctx, 100, [['metal_ore', 8], ['iron_ingot', 2]])
        ? undefined
        : missingReason(ctx, 100, [['metal_ore', 8], ['iron_ingot', 2]]),
      tone: 'good',
    });
  }
  if (flare) {
    emit({
      id: 'survival_flare',
      tab: 'survival',
      label: 'Stock & Launch a Flare',
      description: 'A bright distress flare visible from the shipping lane at night or in rain.',
      costLabel: costLabel(20),
      available: canAfford(ctx, 20) && flare.cooldownHours <= 0,
      reason: canAfford(ctx, 20)
        ? flare.cooldownHours > 0
          ? `Flare cooling down (${flare.cooldownHours}h)`
          : undefined
        : 'Need 20 coins',
      tone: 'warning',
    });
  }
  if (signalFire) {
    emit({
      id: 'survival_signal_fire',
      tab: 'survival',
      label: 'Build a Signal Fire',
      description: 'A greenwood platform fire that throws a tall smoke column by day and flame by night.',
      costLabel: costLabel(0, [['wood', 6], ['branch', 4]]),
      available: canAfford(ctx, 0, [['wood', 6], ['branch', 4]]) && signalFire.cooldownHours <= 0,
      reason:
        canAfford(ctx, 0, [['wood', 6], ['branch', 4]]) && signalFire.cooldownHours <= 0
          ? undefined
          : 'Need 6 wood, 4 branches and a cooled-down site',
      tone: 'warning',
    });
  }
  const builtSignals = state.rescueSignals.filter((s) => s.built);
  emit({
    id: 'survival_call_rescue',
    tab: 'survival',
    label: 'Transmit Distress Call',
    description: 'Use every built signal at once. Success brings survivors, supplies and a new recruit.',
    costLabel: 'Free',
    available: builtSignals.length > 0 && builtSignals.some((s) => s.cooldownHours <= 0),
    reason: builtSignals.length === 0 ? 'Build a radio tower, flare or signal fire first' : undefined,
    tone: 'discovery',
  });

  emit({
    id: 'survival_insulate',
    tab: 'survival',
    label: 'Insulate Clothing & Shelters',
    description: 'Hide lining and fiber batting hold body heat through winter storms and wet nights.',
    costLabel: costLabel(30, [['hide', 3], ['fiber', 4]]),
    available: canAfford(ctx, 30, [['hide', 3], ['fiber', 4]]),
    reason: canAfford(ctx, 30, [['hide', 3], ['fiber', 4]])
      ? undefined
      : missingReason(ctx, 30, [['hide', 3], ['fiber', 4]]),
    tone: 'info',
  });

  // Feature 12: animal tracking.
  emit({
    id: 'wildlife_scan',
    tab: 'wildlife',
    label: 'Scan for Animal Signs',
    description: 'Read the ground around you for footprints, broken branches, fur and droppings.',
    costLabel: 'Stamina',
    available: ctx.vitals.stamina >= 10,
    reason: ctx.vitals.stamina >= 10 ? undefined : 'Too exhausted to track',
    tone: 'info',
  });
  for (let i = 0; i < state.tracks.length; i++) {
    const track = state.tracks[i];
    if (track.found) continue;
    const dist = distanceTo(ctx, track.x, track.z);
    emit({
      id: `wildlife_collect:${track.id}`,
      tab: 'wildlife',
      label: `Inspect ${track.clue.replace(/_/g, ' ')} (${Math.round(dist)}m)`,
      description: `Fresh ${track.clue.replace(/_/g, ' ')} from ${track.species.replace(/_/g, ' ')}. Move within 60m to examine it.`,
      costLabel: 'Free',
      available: dist <= 60,
      reason: dist <= 60 ? undefined : 'Get closer to the sign',
      tone: 'discovery',
    });
  }
  if (!state.research.catalogued.includes('photo_blind')) {
    emit({
      id: 'wildlife_blind',
      tab: 'wildlife',
      label: 'Build a Photo Blind',
      description: 'A hidden canvas hide that steadies the camera and improves research quality.',
      costLabel: costLabel(0, [['wood', 8], ['fiber', 4]]),
      available: canAfford(ctx, 0, [['wood', 8], ['fiber', 4]]),
      reason: canAfford(ctx, 0, [['wood', 8], ['fiber', 4]])
        ? undefined
        : 'Need 8 wood and 4 fiber',
      tone: 'good',
    });
  }

  // Feature 14/15: legendary creatures, photography and the research journal.
  for (let i = 0; i < state.legendaries.length; i++) {
    const leg = state.legendaries[i];
    const dist = distanceTo(ctx, leg.x, leg.z);
    if (!leg.discovered) {
      const seasonOk =
        leg.id !== 'leg_cypress_mother' || state.seasons.id === 'spring';
      const weatherOk =
        (leg.id !== 'leg_ivory_stag' || ctx.weather === 'rain') &&
        (leg.id !== 'leg_thunderbird' || ctx.weather === 'storm' || state.hurricane.active);
      emit({
        id: `wildlife_study:${leg.id}`,
        tab: 'wildlife',
        label: `Track ${leg.name}`,
        description: `${leg.habitat}. ${leg.lore} Requires ${Math.round(dist)}m approach.`,
        costLabel: 'Expedition',
        available: dist <= 220 && seasonOk && weatherOk,
        reason:
          dist > 220
            ? `Travel to ${leg.habitat}`
            : !seasonOk
              ? 'Only appears in spring'
              : !weatherOk
                ? leg.id === 'leg_ivory_stag'
                  ? 'Only appears in rain'
                  : 'Only appears in a storm'
                : undefined,
        tone: 'discovery',
      });
    } else if (!leg.photographed) {
      emit({
        id: `wildlife_photo:${leg.id}`,
        tab: 'wildlife',
        label: `Photograph ${leg.name}`,
        description: 'Add a verified photograph to the persistent wildlife catalog.',
        costLabel: 'Free',
        available: dist <= 260,
        reason: dist <= 260 ? undefined : 'Get within 260m',
        tone: 'discovery',
      });
    }
  }

  // Feature 13: territorial battles.
  for (let i = 0; i < state.territoryBattles.length; i++) {
    const battle = state.territoryBattles[i];
    if (battle.resolved) continue;
    const territory = state.territories.find((t) => t.id === battle.territoryId);
    const dist = territory ? distanceTo(ctx, territory.centerX, territory.centerZ) : 9999;
    emit({
      id: `wildlife_battle:${battle.id}`,
      tab: 'wildlife',
      label: 'Observe Territorial Battle',
      description: `${battle.challenger} are contesting ${battle.defender}. Intervene, scavenge the outcome, or study it.`,
      costLabel: 'Stamina',
      available: dist <= 260 && ctx.vitals.stamina >= 12,
      reason: dist > 260 ? `Travel to the territory (${Math.round(dist)}m)` : 'Need stamina',
      tone: 'warning',
    });
  }
  for (let i = 0; i < state.territories.length; i++) {
    const t = state.territories[i];
    if (t.aggression < 20) continue;
    emit({
      id: `wildlife_tribute:${t.species}`,
      tab: 'wildlife',
      label: `Calm ${t.displayName}`,
      description: 'Leave a meat offering and back away. Repeated threats fade from the pack memory.',
      costLabel: costLabel(0, [['raw_meat', 1]]),
      available: itemCount(ctx, 'raw_meat') >= 1,
      reason: itemCount(ctx, 'raw_meat') >= 1 ? undefined : 'Need 1 raw meat',
      tone: 'warning',
    });
  }
}

export function applyWorldGroupAction(
  actionId: string,
  state: LostWorldState,
  ctx: LostWorldActionContext,
): ActionOutcome | null {
  if (actionId.startsWith('world_event:')) {
    const event = state.events.find((e) => e.id === actionId.slice('world_event:'.length));
    if (!event || event.resolved) return actionFail('world', 'That event has already passed.');
    event.resolved = true;
    const effects: LostWorldEffects = {};
    grant(
      effects,
      event.rewardCoins,
      event.rewardItem
        ? [[event.rewardItem, event.rewardQuantity ?? 1]]
        : [],
    );
    if (event.kind === 'emergency' || event.kind === 'accident') {
      effects.vitals = { stamina: -8 };
    }
    state.persistent.totalDiscoveries += event.kind === 'discovery' || event.kind === 'encounter' ? 1 : 0;
    const regionNpcs = state.npcs.filter(
      (n) => n.region === (event.region === 'island' ? 'island' : 'crescent_city'),
    );
    for (let i = 0; i < Math.min(3, regionNpcs.length); i++) {
      adjustTrust(state, regionNpcs[i].id, event.trustDelta);
    }
    if (event.region === 'crescent_city') {
      adjustDistrict(state, event.kind === 'festival' ? 'french_quarter' : 'marigny', 3);
    }
    addPersistentChange(state, ctx.day, 'discovery', `Responded to ${event.title}`, event.x, event.z);
    lostWorldLog(state, ctx.day, `You responded to ${event.title}.`, 'good');
    return actionOk('world', `${event.title} resolved. ${event.rewardCoins} coins earned.`, effects);
  }

  if (actionId.startsWith('world_tribute:')) {
    const territory = state.territories.find(
      (t) => t.id === actionId.slice('world_tribute:'.length),
    );
    if (!territory) return actionFail('world', 'That territory is gone.');
    if (itemCount(ctx, 'raw_meat') < 1) return actionFail('world', 'You need raw meat for the offering.');
    const effects: LostWorldEffects = {};
    spend(effects, ctx, 0, [['raw_meat', 1]]);
    territory.aggression = Math.max(0, territory.aggression - 30);
    const memory = state.wildlifeMemory.find((m) => m.species === territory.species);
    if (memory) {
      memory.threats = Math.max(0, memory.threats - 1);
      memory.reaction = memory.threats >= 3 ? 'aggressive' : memory.threats >= 1 ? 'wary' : 'calm';
    }
    lostWorldLog(state, ctx.day, `You left an offering at ${territory.displayName}. The pack has calmed.`, 'good');
    return actionOk('world', `${territory.displayName} has calmed.`, effects);
  }

  if (actionId === 'world_found_settlement') {
    if (state.persistent.settlementFounded) return actionFail('world', 'Your settlement is already founded.');
    if (!state.shelters.some((s) => s.built)) return actionFail('world', 'Build a shelter first.');
    if (!canAfford(ctx, 150, [['wood', 10]])) {
      return actionFail('world', missingReason(ctx, 150, [['wood', 10]]));
    }
    const effects: LostWorldEffects = {};
    spend(effects, ctx, 150, [['wood', 10]]);
    state.persistent.settlementFounded = true;
    state.persistent.settlementTier = Math.max(1, state.persistent.settlementTier);
    addPersistentChange(
      state,
      ctx.day,
      'settlement',
      `Founded ${state.persistent.settlementName}`,
      ctx.playerX,
      ctx.playerZ,
    );
    lostWorldLog(state, ctx.day, `${state.persistent.settlementName} is now a permanent settlement.`, 'discovery');
    return actionOk(
      'world',
      `${state.persistent.settlementName} founded. It will persist through save and reload.`,
      effects,
    );
  }

  if (actionId.startsWith('survival_build:')) {
    const kind = actionId.slice('survival_build:'.length);
    const bp = SHELTER_BLUEPRINTS.find((b) => b.kind === kind);
    if (!bp) return actionFail('survival', 'Unknown blueprint.');
    if (!canAfford(ctx, bp.coins, bp.items)) {
      return actionFail('survival', missingReason(ctx, bp.coins, bp.items));
    }
    const effects: LostWorldEffects = {};
    spend(effects, ctx, bp.coins, bp.items);
    const x = ctx.playerX + (Math.random() - 0.5) * 8;
    const z = ctx.playerZ + (Math.random() - 0.5) * 8;
    state.shelters.push({
      id: `shelter_${bp.kind}_${ctx.day}_${state.shelters.length}`,
      kind: bp.kind,
      label: bp.label.replace(/^(Raise|Build|Span|Pour|Dig|Finish) (a |an |the )?/i, ''),
      x,
      z,
      built: true,
      integrity: bp.integrity,
      insulation: bp.insulation,
      defense: bp.defense,
      dayBuilt: ctx.day,
    });
    effects.placeStructure = { type: bp.structure, x, z, label: bp.label };
    addPersistentChange(state, ctx.day, 'construction', bp.label, x, z);
    lostWorldLog(state, ctx.day, `${bp.label} completed.`, 'good');
    state.persistent.totalDiscoveries += 0;
    return actionOk('survival', `${bp.label} completed. The structure is placed in the world and saved.`, effects);
  }

  if (actionId === 'survival_grill') {
    if (state.kitchen.grillBuilt) return actionFail('survival', 'The grill is already built.');
    if (!canAfford(ctx, 20, [['wood', 12], ['stone', 8]])) {
      return actionFail('survival', missingReason(ctx, 20, [['wood', 12], ['stone', 8]]));
    }
    const effects: LostWorldEffects = {};
    spend(effects, ctx, 20, [['wood', 12], ['stone', 8]]);
    state.kitchen.grillBuilt = true;
    state.kitchen.fuel = 30;
    lostWorldLog(state, ctx.day, 'A cooking grill is ready at the settlement.', 'good');
    return actionOk('survival', 'Grill built. Advanced cooking is unlocked.', effects);
  }

  if (actionId === 'survival_kitchen') {
    if (!state.kitchen.grillBuilt) return actionFail('survival', 'Build the grill first.');
    if (state.kitchen.kitchenBuilt) return actionFail('survival', 'The kitchen is already built.');
    if (!canAfford(ctx, 60, [['wood', 20], ['metal_ore', 4]])) {
      return actionFail('survival', missingReason(ctx, 60, [['wood', 20], ['metal_ore', 4]]));
    }
    const effects: LostWorldEffects = {};
    spend(effects, ctx, 60, [['wood', 20], ['metal_ore', 4]]);
    state.kitchen.kitchenBuilt = true;
    lostWorldLog(state, ctx.day, 'The full kitchen is running. Food spoilage is reduced.', 'good');
    return actionOk('survival', 'Kitchen built. Food now spoils 65% slower.', effects);
  }

  if (actionId.startsWith('survival_cook:')) {
    const recipe = COOKING_RECIPES.find((r) => r.id === actionId.slice('survival_cook:'.length));
    if (!recipe) return actionFail('survival', 'Unknown recipe.');
    if (!state.kitchen.grillBuilt) return actionFail('survival', 'Build a cooking grill first.');
    if (recipe.requiresKitchen && !state.kitchen.kitchenBuilt) {
      return actionFail('survival', 'This recipe needs the full kitchen.');
    }
    if (!canAfford(ctx, recipe.coins, recipe.ingredients)) {
      return actionFail('survival', missingReason(ctx, recipe.coins, recipe.ingredients));
    }
    const effects: LostWorldEffects = {};
    spend(effects, ctx, recipe.coins, recipe.ingredients);
    grant(effects, 0, [[recipe.result, recipe.quantity]]);
    freshFood(state, recipe.result);
    state.kitchen.mealsCooked += 1;
    state.kitchen.fuel = Math.max(0, state.kitchen.fuel - 4);
    lostWorldLog(state, ctx.day, `Cooked ${recipe.label}.`, 'good');
    return actionOk('survival', `${recipe.label} prepared (${recipe.quantity}× ${itemName(recipe.result)}).`, effects);
  }

  if (actionId === 'survival_preserve') {
    if (itemCount(ctx, 'salt') < 2) return actionFail('survival', 'Need 2 salt.');
    const fresh = state.food.filter((f) => !f.preserved && !f.spoiled);
    if (fresh.length === 0) return actionFail('survival', 'Nothing fresh to preserve.');
    const effects: LostWorldEffects = {};
    spend(effects, ctx, 0, [['salt', 2]]);
    for (let i = 0; i < fresh.length; i++) fresh[i].preserved = true;
    lostWorldLog(state, ctx.day, `Preserved ${fresh.length} types of food.`, 'good');
    return actionOk('survival', `${fresh.length} food types are now preserved.`, effects);
  }

  if (actionId === 'survival_discard_spoiled') {
    const spoiled = state.food.filter((f) => f.spoiled);
    if (spoiled.length === 0) return actionFail('survival', 'No spoiled food.');
    const effects: LostWorldEffects = {};
    for (let i = 0; i < spoiled.length; i++) {
      effects.items = effects.items ?? [];
      effects.items.push({ itemId: spoiled[i].itemId, quantity: -1 });
    }
    state.food = state.food.filter((f) => !f.spoiled);
    return actionOk('survival', `Discarded ${spoiled.length} spoiled food types.`, effects);
  }

  if (actionId === 'survival_radio') {
    const signal = state.rescueSignals.find((s) => s.id === 'sig_radio');
    if (!signal || signal.built) return actionFail('survival', 'The radio tower is already standing.');
    if (!canAfford(ctx, 100, [['metal_ore', 8], ['iron_ingot', 2]])) {
      return actionFail('survival', missingReason(ctx, 100, [['metal_ore', 8], ['iron_ingot', 2]]));
    }
    const effects: LostWorldEffects = {};
    spend(effects, ctx, 100, [['metal_ore', 8], ['iron_ingot', 2]]);
    signal.built = true;
    signal.strength = 70;
    addPersistentChange(state, ctx.day, 'construction', 'Radio tower raised', ctx.playerX, ctx.playerZ);
    return actionOk('survival', 'Radio tower built. Distress calls can now reach the mainland.', effects);
  }

  if (actionId === 'survival_flare') {
    const signal = state.rescueSignals.find((s) => s.id === 'sig_flare');
    if (!signal) return actionFail('survival', 'No flare kit.');
    if (!canAfford(ctx, 20)) return actionFail('survival', 'Need 20 coins.');
    if (signal.cooldownHours > 0) return actionFail('survival', `Flare cooling down (${signal.cooldownHours}h).`);
    const effects: LostWorldEffects = {};
    spend(effects, ctx, 20);
    signal.built = true;
    signal.strength = 45;
    signal.cooldownHours = 8;
    signal.lastUsedDay = ctx.day;
    lostWorldLog(state, ctx.day, 'A distress flare arced over the water.', 'warning');
    return actionOk('survival', 'Flare launched. Ships in the lane may have seen it.', effects);
  }

  if (actionId === 'survival_signal_fire') {
    const signal = state.rescueSignals.find((s) => s.id === 'sig_fire');
    if (!signal) return actionFail('survival', 'No signal fire site.');
    if (!canAfford(ctx, 0, [['wood', 6], ['branch', 4]])) {
      return actionFail('survival', missingReason(ctx, 0, [['wood', 6], ['branch', 4]]));
    }
    if (signal.cooldownHours > 0) return actionFail('survival', `The signal site is still cooling (${signal.cooldownHours}h).`);
    const effects: LostWorldEffects = {};
    spend(effects, ctx, 0, [['wood', 6], ['branch', 4]]);
    signal.built = true;
    signal.strength = 55;
    signal.cooldownHours = 10;
    signal.lastUsedDay = ctx.day;
    effects.placeStructure = {
      type: 'campfire',
      x: ctx.playerX + 1.8,
      z: ctx.playerZ + 1.8,
      label: 'Signal fire',
    };
    lostWorldLog(state, ctx.day, 'A signal fire is throwing smoke into the sky.', 'warning');
    return actionOk('survival', 'Signal fire lit. Its smoke is visible for miles.', effects);
  }

  if (actionId === 'survival_call_rescue') {
    const built = state.rescueSignals.filter((s) => s.built);
    if (built.length === 0) return actionFail('survival', 'Build a signal first.');
    const ready = built.filter((s) => s.cooldownHours <= 0);
    if (ready.length === 0) return actionFail('survival', 'Every signal is cooling down.');
    const strength = ready.reduce((best, s) => Math.max(best, s.strength), 0);
    const weatherBonus = ctx.weather === 'storm' ? 0.12 : ctx.weather === 'clear' ? 0.06 : 0;
    const success = nextLostWorldRandom(state) < Math.min(0.95, strength / 110 + weatherBonus);
    for (let i = 0; i < ready.length; i++) ready[i].cooldownHours = 24;
    if (!success) {
      lostWorldLog(state, ctx.day, 'The distress call went unanswered. Try again after the weather clears.', 'warning');
      return actionOk('survival', 'Signal sent, but no response. The coast is quiet tonight.');
    }
    const survivor = state.recruits.find((r) => r.status === 'unmet');
    if (survivor) {
      survivor.status = 'rescued';
      survivor.x = ctx.playerX + 4;
      survivor.z = ctx.playerZ + 4;
      survivor.morale = 65;
    }
    const effects: LostWorldEffects = {};
    grant(effects, 120, [['filtered_water_bottle', 2], ['roasted_meat', 2]]);
    addPersistentChange(state, ctx.day, 'discovery', 'Rescue signal answered', ctx.playerX, ctx.playerZ);
    lostWorldLog(
      state,
      ctx.day,
      survivor
        ? `A rescue boat answered. ${survivor.name} came ashore with supplies.`
        : 'A rescue boat answered with supplies.',
      'discovery',
    );
    return actionOk(
      'survival',
      survivor ? `Rescue answered! ${survivor.name} is now at your settlement.` : 'Rescue answered with supplies.',
      effects,
    );
  }

  if (actionId === 'survival_insulate') {
    if (!canAfford(ctx, 30, [['hide', 3], ['fiber', 4]])) {
      return actionFail('survival', missingReason(ctx, 30, [['hide', 3], ['fiber', 4]]));
    }
    const effects: LostWorldEffects = {};
    spend(effects, ctx, 30, [['hide', 3], ['fiber', 4]]);
    for (let i = 0; i < state.shelters.length; i++) {
      state.shelters[i].insulation = Math.min(1, state.shelters[i].insulation + 0.12);
    }
    state.temperature.clothingInsulation = Math.min(1, state.temperature.clothingInsulation + 0.12);
    return actionOk('survival', 'Clothing and shelters are better insulated against cold and wet.', effects);
  }

  if (actionId === 'wildlife_scan') {
    if (ctx.vitals.stamina < 10) return actionFail('wildlife', 'Too exhausted to track.');
    const near = state.territories
      .filter((t) => !t.legendary)
      .sort(
        (a, b) =>
          Math.hypot(a.centerX - ctx.playerX, a.centerZ - ctx.playerZ) -
          Math.hypot(b.centerX - ctx.playerX, b.centerZ - ctx.playerZ),
      )[0];
    const species = near ? near.species : 'deer';
    const clues = ['footprint', 'broken_branch', 'fur', 'droppings', 'call'] as const;
    for (let i = 0; i < 3; i++) {
      const angle = nextLostWorldRandom(state) * Math.PI * 2;
      const radius = 12 + nextLostWorldRandom(state) * 26;
      state.tracks.push({
        id: `track_${ctx.day}_${state.tracks.length}_${i}`,
        species,
        x: ctx.playerX + Math.cos(angle) * radius,
        z: ctx.playerZ + Math.sin(angle) * radius,
        clue: clues[Math.floor(nextLostWorldRandom(state) * clues.length)],
        found: false,
        expiresHours: 10,
      });
    }
    if (state.tracks.length > 12) state.tracks = state.tracks.slice(-12);
    const effects = { vitals: { stamina: -8 } };
    return actionOk('wildlife', 'Fresh sign found. Inspect the tracks to log the animal.', effects);
  }

  if (actionId.startsWith('wildlife_collect:')) {
    const idx = state.tracks.findIndex((t) => t.id === actionId.slice('wildlife_collect:'.length));
    if (idx === -1) return actionFail('wildlife', 'That trail has gone cold.');
    const track = state.tracks[idx];
    if (distanceTo(ctx, track.x, track.z) > 60) return actionFail('wildlife', 'Get closer to inspect the sign.');
    state.tracks.splice(idx, 1);
    const memory = state.wildlifeMemory.find((m) => m.species === track.species);
    if (memory) {
      memory.encounters += 1;
      memory.lastEncounterDay = ctx.day;
    }
    state.research.researchPoints += 5;
    const effects: LostWorldEffects = {};
    grant(effects, 0, [[TRACK_LOOT[track.clue] ?? 'fiber', 1]]);
    lostWorldLog(state, ctx.day, `Logged ${track.species.replace(/_/g, ' ')} sign.`, 'discovery');
    return actionOk('wildlife', `Sign logged. Research +5, recovered ${itemName(TRACK_LOOT[track.clue] ?? 'fiber')}.`, effects);
  }

  if (actionId === 'wildlife_blind') {
    if (state.research.catalogued.includes('photo_blind')) {
      return actionFail('wildlife', 'A photo blind is already built.');
    }
    if (!canAfford(ctx, 0, [['wood', 8], ['fiber', 4]])) {
      return actionFail('wildlife', missingReason(ctx, 0, [['wood', 8], ['fiber', 4]]));
    }
    const effects: LostWorldEffects = {};
    spend(effects, ctx, 0, [['wood', 8], ['fiber', 4]]);
    state.research.catalogued.push('photo_blind');
    state.research.researchPoints += 10;
    return actionOk('wildlife', 'Photo blind built. Research gains are improved.', effects);
  }

  if (actionId.startsWith('wildlife_study:')) {
    const leg = state.legendaries.find((l) => l.id === actionId.slice('wildlife_study:'.length));
    if (!leg) return actionFail('wildlife', 'Unknown creature.');
    if (leg.discovered) return actionFail('wildlife', 'Already discovered. Take a photograph instead.');
    if (distanceTo(ctx, leg.x, leg.z) > 220) return actionFail('wildlife', `Travel to ${leg.habitat}.`);
    if (leg.id === 'leg_ivory_stag' && ctx.weather !== 'rain') {
      return actionFail('wildlife', 'The Ivory Stag only shows itself in rain.');
    }
    if (leg.id === 'leg_thunderbird' && ctx.weather !== 'storm' && !state.hurricane.active) {
      return actionFail('wildlife', 'The Thunderbird only circles before a storm.');
    }
    if (leg.id === 'leg_cypress_mother' && state.seasons.id !== 'spring') {
      return actionFail('wildlife', 'The Cypress Mother only stirs in spring.');
    }
    leg.discovered = true;
    state.persistent.totalDiscoveries += 1;
    state.research.catalogued.push(leg.species);
    state.research.researchPoints += 20;
    const effects: LostWorldEffects = {};
    grant(effects, Math.round(leg.rewardCoins * 0.4), [[leg.rewardItem, 1]]);
    addPersistentChange(state, ctx.day, 'discovery', `Discovered ${leg.name}`, leg.x, leg.z);
    lostWorldLog(state, ctx.day, `Legendary discovery: ${leg.name}. ${leg.lore}`, 'discovery');
    return actionOk('wildlife', `${leg.name} discovered. ${leg.lore}`, effects);
  }

  if (actionId.startsWith('wildlife_photo:')) {
    const leg = state.legendaries.find((l) => l.id === actionId.slice('wildlife_photo:'.length));
    if (!leg || !leg.discovered) return actionFail('wildlife', 'Photograph something you have actually found.');
    if (leg.photographed) return actionFail('wildlife', 'Already in the catalog.');
    if (distanceTo(ctx, leg.x, leg.z) > 260) return actionFail('wildlife', 'Get closer for a clear photograph.');
    leg.photographed = true;
    const blindBonus = state.research.catalogued.includes('photo_blind') ? 20 : 0;
    state.research.photos.push({
      id: `photo_${leg.id}_${ctx.day}`,
      subject: leg.name,
      day: ctx.day,
      location: leg.habitat,
      quality: Math.min(100, 62 + blindBonus + Math.round(state.research.researchPoints / 20)),
    });
    state.research.researchPoints += 15;
    const effects: LostWorldEffects = {};
    grant(effects, 40);
    lostWorldLog(state, ctx.day, `Photographed ${leg.name}.`, 'discovery');
    return actionOk('wildlife', `${leg.name} photographed and catalogued.`, effects);
  }

  if (actionId.startsWith('wildlife_battle:')) {
    const battle = state.territoryBattles.find((b) => b.id === actionId.slice('wildlife_battle:'.length));
    if (!battle || battle.resolved) return actionFail('wildlife', 'That battle is over.');
    const territory = state.territories.find((t) => t.id === battle.territoryId);
    if (!territory) return actionFail('wildlife', 'Territory not found.');
    if (distanceTo(ctx, territory.centerX, territory.centerZ) > 260) {
      return actionFail('wildlife', 'Travel closer to the territory.');
    }
    if (ctx.vitals.stamina < 12) return actionFail('wildlife', 'Too exhausted.');
    battle.resolved = true;
    const challengerWins = nextLostWorldRandom(state) > 0.5;
    battle.winner = challengerWins ? battle.challenger : battle.defender;
    territory.aggression = Math.max(10, territory.aggression - 15);
    state.research.researchPoints += 12;
    const effects = { vitals: { stamina: -10 } };
    grant(effects, 0, [['hide', 2], ['bone', 1]]);
    lostWorldLog(
      state,
      ctx.day,
      `${battle.winner} won the territory contest at ${territory.displayName}.`,
      'discovery',
    );
    return actionOk(
      'wildlife',
      `${battle.winner} holds the territory. Scavenged hide and bone (research +12).`,
      effects,
    );
  }

  if (actionId.startsWith('wildlife_tribute:')) {
    const species = actionId.slice('wildlife_tribute:'.length);
    const territory = state.territories.find((t) => t.species === species);
    if (!territory) return actionFail('wildlife', 'Territory not found.');
    if (itemCount(ctx, 'raw_meat') < 1) return actionFail('wildlife', 'Need raw meat.');
    const effects: LostWorldEffects = {};
    spend(effects, ctx, 0, [['raw_meat', 1]]);
    territory.aggression = Math.max(0, territory.aggression - 28);
    const memory = state.wildlifeMemory.find((m) => m.species === species);
    if (memory) {
      memory.threats = Math.max(0, memory.threats - 1);
      memory.reaction = memory.threats >= 3 ? 'aggressive' : memory.threats >= 1 ? 'wary' : 'calm';
    }
    return actionOk('wildlife', `${territory.displayName} has calmed.`, effects);
  }

  return null;
}
