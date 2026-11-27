import type { InventorySlot, ItemId, WeatherType } from '../types';
import {
  LOST_WORLD_STATE_VERSION,
  addPersistentChange,
  clockHour,
  createLostWorldState,
  eventDefinitions,
  isBusinessOpen,
  lostWorldLog,
  nextLostWorldRandom,
  seasonForDay,
  seasonalTemperatureBias,
  type LostWorldHudState,
  type LostWorldState,
  type LostWorldTickContext,
  type LostWorldTickReport,
  type LostWorldTone,
  type SeasonId,
  type WorldEventState,
} from './lostWorldExpansion';

const PERISHABLE_ITEMS: ReadonlySet<string> = new Set<ItemId>([
  'raw_meat',
  'dino_meat',
  'washed_meat',
  'washed_dino_meat',
  'cut_meat',
  'cut_dino_meat',
  'roasted_meat',
  'roasted_dino_meat',
  'grilled_fish',
  'freshwater_fish',
  'ocean_fish',
  'berries',
  'apple',
  'banana',
  'coconut',
  'milk',
  'egg',
  'dough',
  'bread_loaf',
  'wheat_bread',
  'cake',
  'chocolate_cake',
  'cookies',
  'pumpkin_pie',
  'garden_salad',
  'fresh_salsa',
  'cucumber_salad',
  'vegetable_soup',
  'hearty_stew',
  'cheeseburger',
  'cheese',
  'tomato',
  'lettuce',
  'cucumber',
  'corn',
  'potato',
  'carrot',
  'onion',
  'bell_pepper',
  'jalapeno',
  'pumpkin',
  'garlic',
  'heart',
  'liver',
  'kidneys',
  'backstrap',
  'tenderloin',
  'hindquarter_steak',
  'shoulder_roast',
  'ribs',
  'tongue',
  'bone_marrow',
  'meat_bag',
  'cooked_backstrap',
  'cooked_organs',
  'bone_broth',
]);

export function isPerishableItem(itemId: string): boolean {
  return PERISHABLE_ITEMS.has(itemId);
}

export function cloneLostWorldState(state: LostWorldState): LostWorldState {
  return JSON.parse(JSON.stringify(state)) as LostWorldState;
}

function arr<T>(value: unknown, fallback: T[]): T[] {
  return Array.isArray(value) ? (value as T[]) : fallback;
}

/**
 * Backward-compatible loader. Older saves have no lostWorld field at all and
 * must gain the expansion without losing any existing progress.
 */
export function normalizeLostWorldState(
  raw: Partial<LostWorldState> | null | undefined,
): LostWorldState {
  const base = createLostWorldState();
  if (!raw || typeof raw !== 'object') return base;
  const merged: LostWorldState = {
    ...base,
    ...raw,
    version: LOST_WORLD_STATE_VERSION,
    rng: typeof raw.rng === 'number' ? raw.rng >>> 0 : base.rng,
    lastDay: typeof raw.lastDay === 'number' ? raw.lastDay : 0,
    lastTickHour: typeof raw.lastTickHour === 'number' ? raw.lastTickHour : -1,
    seasons: { ...base.seasons, ...(raw.seasons ?? {}) },
    persistent: { ...base.persistent, ...(raw.persistent ?? {}) },
    log: arr(raw.log, base.log),
    npcs: arr(raw.npcs, base.npcs),
    events: arr(raw.events, base.events),
    territories: arr(raw.territories, base.territories),
    shelters: arr(raw.shelters, base.shelters),
    temperature: { ...base.temperature, ...(raw.temperature ?? {}) },
    food: arr(raw.food, base.food),
    kitchen: { ...base.kitchen, ...(raw.kitchen ?? {}) },
    rescueSignals: arr(raw.rescueSignals, base.rescueSignals),
    wildlifeMemory: arr(raw.wildlifeMemory, base.wildlifeMemory),
    tracks: arr(raw.tracks, base.tracks),
    territoryBattles: arr(raw.territoryBattles, base.territoryBattles),
    legendaries: arr(raw.legendaries, base.legendaries),
    research: { ...base.research, ...(raw.research ?? {}) },
    businesses: arr(raw.businesses, base.businesses),
    districts: arr(raw.districts, base.districts),
    traffic: { ...base.traffic, ...(raw.traffic ?? {}) },
    culturalEvents: arr(raw.culturalEvents, base.culturalEvents),
    customization: arr(raw.customization, base.customization),
    mechanical: arr(raw.mechanical, base.mechanical),
    audioCompetitions: arr(raw.audioCompetitions, base.audioCompetitions),
    restorations: arr(raw.restorations, base.restorations),
    carClub: { ...base.carClub, ...(raw.carClub ?? {}) },
    diveSites: arr(raw.diveSites, base.diveSites),
    treasures: arr(raw.treasures, base.treasures),
    adventures: arr(raw.adventures, base.adventures),
    expedition: raw.expedition ?? null,
    npcMemory: arr(raw.npcMemory, base.npcMemory),
    companions: arr(raw.companions, base.companions),
    recruits: arr(raw.recruits, base.recruits),
    conversations: arr(raw.conversations, base.conversations),
    communityProjects: arr(raw.communityProjects, base.communityProjects),
    coop: { ...base.coop, ...(raw.coop ?? {}) },
    power: { ...base.power, ...(raw.power ?? {}) },
    water: { ...base.water, ...(raw.water ?? {}) },
    engineering: { ...base.engineering, ...(raw.engineering ?? {}) },
    hurricane: { ...base.hurricane, ...(raw.hurricane ?? {}) },
    flood: { ...base.flood, ...(raw.flood ?? {}) },
    fire: { ...base.fire, ...(raw.fire ?? {}) },
    damage: { ...base.damage, ...(raw.damage ?? {}) },
    recovery: { ...base.recovery, ...(raw.recovery ?? {}) },
    civilization: { ...base.civilization, ...(raw.civilization ?? {}) },
    worldBosses: arr(raw.worldBosses, base.worldBosses),
    dragonBonds: arr(raw.dragonBonds, base.dragonBonds),
    mystery: { ...base.mystery, ...(raw.mystery ?? {}) },
    evolution: { ...base.evolution, ...(raw.evolution ?? {}) },
  };
  // Repair anything an older build may have stored as a non-array.
  if (!Array.isArray(merged.evolution.history)) merged.evolution.history = [];
  if (!Array.isArray(merged.evolution.perks)) merged.evolution.perks = [];
  if (typeof merged.evolution.lastClaimedStage !== 'number') {
    merged.evolution.lastClaimedStage = 0;
  }
  if (!Array.isArray(merged.civilization.artifacts)) merged.civilization.artifacts = [];
  if (!Array.isArray(merged.mystery.clueIds)) merged.mystery.clueIds = base.mystery.clueIds;
  if (!Array.isArray(merged.coop.trades)) merged.coop.trades = [];
  if (typeof merged.engineering.homesteadStage !== 'number') {
    merged.engineering.homesteadStage = 0;
  }
  if (typeof merged.engineering.machineryBuilt !== 'boolean') {
    merged.engineering.machineryBuilt = false;
  }
  for (let i = 0; i < merged.worldBosses.length; i++) {
    if (typeof merged.worldBosses[i].prep !== 'number') merged.worldBosses[i].prep = 0;
  }
  return merged;
}

/** Keep freshness entries in sync with what the player is actually carrying. */
export function syncFoodFreshness(
  state: LostWorldState,
  foodOnHand: { itemId: ItemId; quantity: number }[] | undefined,
  day: number,
): void {
  if (!foodOnHand || foodOnHand.length === 0) {
    state.food = state.food.filter((f) => f.preserved && !f.spoiled);
    return;
  }
  const present = new Set<string>();
  for (let i = 0; i < foodOnHand.length; i++) {
    const itemId = foodOnHand[i].itemId;
    if (foodOnHand[i].quantity <= 0 || !PERISHABLE_ITEMS.has(itemId)) continue;
    present.add(itemId);
    if (!state.food.some((f) => f.itemId === itemId)) {
      state.food.push({ itemId, freshness: 1, preserved: false, spoiled: false });
    }
  }
  // Drop entries for food that is no longer carried, but keep preserved
  // stock and spoiled reminders until the player deals with them.
  state.food = state.food.filter(
    (f) => present.has(f.itemId) || f.preserved || f.spoiled,
  );
  if (state.food.length > 32) state.food.length = 32;
  void day;
}

export function foodFreshnessFor(
  state: LostWorldState,
  itemId: ItemId,
): number {
  const entry = state.food.find((f) => f.itemId === itemId);
  if (!entry) return 1;
  return entry.spoiled ? 0 : entry.freshness;
}

/** Cooking or preserving resets a food's freshness clock. */
export function markFoodFresh(state: LostWorldState, itemId: ItemId): void {
  const entry = state.food.find((f) => f.itemId === itemId);
  if (entry) {
    entry.freshness = 1;
    entry.preserved = false;
    entry.spoiled = false;
  } else {
    state.food.push({ itemId, freshness: 1, preserved: false, spoiled: false });
  }
}

/** A fridge/freezer pauses the freshness timer for carried food. */
export function markFoodPreserved(
  state: LostWorldState,
  itemId: ItemId,
  preserved: boolean,
): void {
  const entry = state.food.find((f) => f.itemId === itemId);
  if (entry) {
    entry.preserved = preserved;
  } else if (preserved) {
    state.food.push({ itemId, freshness: 1, preserved: true, spoiled: false });
  }
}

/** Carry a carcass's remaining freshness onto the cuts it produces. */
export function setFoodFreshness(
  state: LostWorldState,
  itemId: ItemId,
  freshness: number,
): void {
  const entry = state.food.find((f) => f.itemId === itemId);
  const clamped = Math.max(0, Math.min(1, freshness));
  if (entry) {
    entry.freshness = clamped;
    entry.preserved = false;
    entry.spoiled = clamped <= 0.02;
  } else {
    state.food.push({
      itemId,
      freshness: clamped,
      preserved: false,
      spoiled: clamped <= 0.02,
    });
  }
}

function npcTarget(activity: string, npc: LostWorldState['npcs'][number]): { x: number; z: number } {
  if (activity === 'working') return { x: npc.workX, z: npc.workZ };
  if (activity === 'shopping') return { x: npc.shopX, z: npc.shopZ };
  if (activity === 'socializing') return { x: npc.socialX, z: npc.socialZ };
  if (activity === 'eating') return { x: npc.shopX, z: npc.shopZ };
  return { x: npc.homeX, z: npc.homeZ };
}

function chooseActivity(hour: number): LostWorldState['npcs'][number]['activity'] {
  if (hour < 6 || hour >= 22) return 'sleeping';
  if (hour < 7) return 'home';
  if (hour < 8) return 'commuting';
  if (hour >= 12 && hour < 13.5) return 'eating';
  if (hour >= 17.5 && hour < 19) return 'shopping';
  if (hour >= 19) return 'socializing';
  return 'working';
}

function pushAlert(
  alerts: LostWorldTickReport['alerts'],
  tone: LostWorldTone,
  text: string,
): void {
  if (alerts.length >= 4) return;
  alerts.push({ id: `lw_alert_${alerts.length}_${text.length}`, tone, text });
}

function spawnEvent(
  state: LostWorldState,
  ctx: LostWorldTickContext,
  day: number,
): void {
  const defs = eventDefinitions();
  const pick = defs[Math.floor(nextLostWorldRandom(state) * defs.length)] ?? defs[0];
  if (!pick) return;
  if (state.events.some((e) => e.defId === pick.id && !e.resolved)) return;
  const nearPlayer = pick.region === 'island';
  const baseX = nearPlayer ? ctx.playerX : pick.region === 'coast' ? ctx.playerX : -60;
  const baseZ = nearPlayer ? ctx.playerZ : pick.region === 'coast' ? ctx.playerZ : 1330;
  const spread = nearPlayer ? 70 : 160;
  const event: WorldEventState = {
    id: `event_${day}_${Math.floor(nextLostWorldRandom(state) * 99999)}`,
    defId: pick.id,
    kind: pick.kind,
    title: pick.title,
    description: pick.description,
    region: pick.region,
    x: Math.round(baseX + (nextLostWorldRandom(state) - 0.5) * spread),
    z: Math.round(baseZ + (nextLostWorldRandom(state) - 0.5) * spread),
    hoursLeft: pick.durationHours,
    resolved: false,
    rewardCoins: pick.rewardCoins,
    rewardItem: pick.rewardItem,
    rewardQuantity: pick.rewardQuantity,
    trustDelta: pick.trustDelta,
  };
  state.events.unshift(event);
  if (state.events.length > 5) state.events.length = 5;
  lostWorldLog(state, day, `World event: ${event.title}. ${event.description}`, 'discovery');
}

function rollHurricane(
  state: LostWorldState,
  ctx: LostWorldTickContext,
  day: number,
  alerts: LostWorldTickReport['alerts'],
): void {
  if (state.hurricane.active) return;
  if (state.seasons.id !== 'hurricane' && state.seasons.id !== 'summer') return;
  const chance = state.seasons.id === 'hurricane' ? 0.34 : 0.12;
  if (nextLostWorldRandom(state) > chance) return;
  if (day - state.hurricane.lastHurricaneDay < 3) return;
  const intensity = 1 + Math.floor(nextLostWorldRandom(state) * 5);
  state.hurricane = {
    active: true,
    name: `Hurricane ${['Ada', 'Beau', 'Clotilde', 'Delphine', 'Etienne'][Math.floor(nextLostWorldRandom(state) * 5)]}`,
    intensity,
    windMph: 55 + intensity * 18,
    hoursLeft: 6 + intensity * 2,
    prepared: false,
    lastHurricaneDay: day,
  };
  state.flood.peak = Math.max(state.flood.peak, intensity * 0.22);
  lostWorldLog(
    state,
    day,
    `${state.hurricane.name} has strengthened to Category ${intensity}. Batten down and move to high ground.`,
    'danger',
  );
  pushAlert(alerts, 'danger', `Hurricane ${state.hurricane.name} — Category ${intensity} inbound.`);
}

function advanceHourly(
  state: LostWorldState,
  ctx: LostWorldTickContext,
  day: number,
  hour: number,
  alerts: LostWorldTickReport['alerts'],
): void {
  const newDay = state.lastDay !== day;
  state.seasons = seasonForDay(day);
  state.lastDay = day;

  for (let i = 0; i < state.events.length; i++) {
    const ev = state.events[i];
    if (ev.resolved) continue;
    ev.hoursLeft -= 1;
    if (ev.hoursLeft <= 0) {
      ev.resolved = true;
      lostWorldLog(state, day, `${ev.title} has passed without a response.`, 'warning');
    }
  }
  if (state.events.length > 2 && state.events.every((e) => e.resolved)) {
    state.events = state.events.filter((e) => !e.resolved).slice(0, 2);
  }

  for (let i = 0; i < state.rescueSignals.length; i++) {
    if (state.rescueSignals[i].cooldownHours > 0) state.rescueSignals[i].cooldownHours -= 1;
  }

  // Daily economy, community production and hazard rolls.
  if (newDay) {
    for (let i = 0; i < state.businesses.length; i++) {
      const b = state.businesses[i];
      if (!b.owned) continue;
      const footTraffic = isBusinessOpen(hour) ? 1 : 0.35;
      const districtId =
        b.kind === 'restaurant' || b.kind === 'bar' || b.kind === 'music' || b.kind === 'hotel'
          ? 'french_quarter'
          : b.kind === 'auto_parts' || b.kind === 'garage'
            ? 'warehouse_row'
            : b.kind === 'cafe' || b.kind === 'store'
              ? 'marigny'
              : 'garden_district';
      const district = state.districts.find((d) => d.id === districtId);
      const dockBonus = state.communityProjects.find((p) => p.id === 'comm_dock')?.built ? 1.25 : 1;
      const income = Math.round(
        (18 + b.employees * 12 + b.stock * 0.22) *
          footTraffic *
          dockBonus *
          (1 + (district ? district.reputation / 200 : 0)),
      );
      b.dailyIncome = income;
      b.uncollectedIncome += income;
      b.stock = Math.max(0, b.stock - 2 - b.employees);
      b.visits += Math.round(3 + b.stock * 0.05);
    }

    const builders = state.recruits.filter(
      (r) => r.status === 'assigned' && r.assignment === 'construction',
    ).length;
    const suppliers = state.recruits.filter(
      (r) => r.status === 'assigned' && r.assignment === 'supplies',
    ).length;
    for (let i = 0; i < state.communityProjects.length; i++) {
      const project = state.communityProjects[i];
      if (project.built) continue;
      project.progress = Math.min(project.goal, project.progress + builders * 8);
    }
    if (suppliers > 0) state.kitchen.fuel = Math.min(100, state.kitchen.fuel + suppliers * 6);
    state.recovery.infrastructure = Math.min(100, state.recovery.infrastructure + 1);
    state.recovery.settlement = Math.min(100, state.recovery.settlement + 1);
    state.carClub.duesCollected += state.carClub.members * 3;

    state.evolution.history.unshift({
      day,
      score: state.evolution.score,
      stageName: state.evolution.stageName,
    });
    if (state.evolution.history.length > 30) state.evolution.history.length = 30;

    rollHurricane(state, ctx, day, alerts);
    if (state.seasons.id === 'summer' && state.culturalEvents.length < 2) {
      if (nextLostWorldRandom(state) < 0.28) {
        const kinds: { kind: 'parade' | 'festival' | 'live_music' | 'car_show' | 'car_meet'; name: string }[] = [
          { kind: 'parade', name: 'Krewe of the Bayou Parade' },
          { kind: 'festival', name: 'Crawfish & Brass Festival' },
          { kind: 'live_music', name: 'Riverfront Brass Night' },
          { kind: 'car_show', name: 'Crescent City Car Show' },
          { kind: 'car_meet', name: 'Warehouse Row Car Meet' },
        ];
        const pick = kinds[Math.floor(nextLostWorldRandom(state) * kinds.length)];
        state.culturalEvents.unshift({
          id: `culture_${day}`,
          name: pick.name,
          kind: pick.kind,
          day,
          hoursLeft: 12,
          attending: false,
          completed: false,
        });
        if (state.culturalEvents.length > 3) state.culturalEvents.length = 3;
        lostWorldLog(state, day, `${pick.name} is happening in Crescent City today.`, 'good');
      }
    }

    for (let i = 0; i < state.mechanical.length; i++) {
      const m = state.mechanical[i];
      m.engineHeat = Math.max(0, m.engineHeat - 8);
    }
  }

  for (let i = state.culturalEvents.length - 1; i >= 0; i--) {
    if (state.culturalEvents[i].completed) continue;
    state.culturalEvents[i].hoursLeft -= 1;
    if (state.culturalEvents[i].hoursLeft <= 0) state.culturalEvents.splice(i, 1);
  }

  state.eventCooldownHours -= 1;
  if (state.eventCooldownHours <= 0) {
    state.eventCooldownHours = 8 + Math.floor(nextLostWorldRandom(state) * 8);
    if (state.events.filter((e) => !e.resolved).length < 2) {
      spawnEvent(state, ctx, day);
    }
  }

  // Wildlife migration and territorial competition.
  for (let i = 0; i < state.territories.length; i++) {
    const t = state.territories[i];
    t.aggression = Math.max(0, t.aggression - 1.5);
    t.migrating =
      state.seasons.id === 'winter' ? true : state.seasons.id === 'summer' && t.species !== 'grizzly_bear';
    const target = t.migrating
      ? {
          x: t.centerX + (state.seasons.id === 'winter' ? -70 : 55),
          z: t.centerZ + (state.seasons.id === 'winter' ? 55 : -30),
        }
      : { x: t.centerX, z: t.centerZ };
    t.seasonTargetX = target.x;
    t.seasonTargetZ = target.z;
    if (newDay && !t.legendary && nextLostWorldRandom(state) < 0.12 && t.aggression > 40) {
      const challenger = state.territories.find(
        (o) =>
          o.id !== t.id &&
          !o.legendary &&
          Math.hypot(o.centerX - t.centerX, o.centerZ - t.centerZ) < 220,
      );
      if (challenger) {
        state.territoryBattles.unshift({
          id: `battle_${day}_${t.id}`,
          territoryId: t.id,
          challenger: challenger.species,
          defender: t.species,
          day,
          resolved: false,
          winner: null,
        });
        if (state.territoryBattles.length > 6) state.territoryBattles.length = 6;
        lostWorldLog(
          state,
          day,
          `${challenger.displayName} are contesting ${t.displayName}. The winners will claim the territory.`,
          'warning',
        );
      }
    }
  }

  // NPC schedules run on in-game clock hours.
  for (let i = 0; i < state.npcs.length; i++) {
    const npc = state.npcs[i];
    const activity = chooseActivity(hour);
    npc.activity = activity;
    const target = npcTarget(activity, npc);
    npc.x += (target.x - npc.x) * 0.45;
    npc.z += (target.z - npc.z) * 0.45;
  }

  // Cars overheat and wear while actually driven.
  if (ctx.activeVehicle) {
    const veh = ctx.activeVehicle;
    let mech = state.mechanical.find((m) => m.vehicleId === veh.id);
    if (!mech) {
      mech = {
        vehicleId: veh.id,
        engineHeat: 0,
        tireWear: 0,
        brakeWear: 0,
        engineWear: 0,
        failed: false,
        lastServiceDay: 0,
      };
      state.mechanical.push(mech);
    }
    const speedFactor = Math.min(1.6, veh.speedKmh / 90);
    mech.engineHeat = Math.min(130, mech.engineHeat + 3.2 + speedFactor * 3.4);
    mech.tireWear = Math.min(100, mech.tireWear + 0.22 + speedFactor * 0.3);
    mech.brakeWear = Math.min(100, mech.brakeWear + 0.16 + speedFactor * 0.22);
    mech.engineWear = Math.min(100, mech.engineWear + 0.08 + speedFactor * 0.12);
    if (!mech.failed && (mech.engineHeat > 112 || mech.tireWear > 96 || mech.brakeWear > 97)) {
      mech.failed = true;
      lostWorldLog(
        state,
        day,
        `${state.customization.find((c) => c.vehicleId === veh.id)?.paint ?? 'Your vehicle'} has broken down: ${
          mech.engineHeat > 112 ? 'engine overheating' : mech.tireWear > 96 ? 'tire failure' : 'brake failure'
        }.`,
        'danger',
      );
      pushAlert(alerts, 'danger', `${veh.id} mechanical failure. Stop and repair.`);
    }
  }

  if (state.hurricane.active) {
    state.hurricane.hoursLeft -= 1;
    state.flood.level = Math.min(
      4.5,
      state.flood.level + 0.06 * state.hurricane.intensity + (state.hurricane.prepared ? -0.02 : 0),
    );
    state.damage.damagedShelters = state.shelters.filter(
      (s) => s.built && s.integrity < 85,
    ).length;
    if (nextLostWorldRandom(state) < 0.22) {
      state.damage.fallenTrees += 1;
      if (state.shelters.length > 0) {
        const target = state.shelters[Math.floor(nextLostWorldRandom(state) * state.shelters.length)];
        target.integrity = Math.max(5, target.integrity - state.hurricane.intensity * 4);
      }
    }
    if (state.hurricane.hoursLeft <= 0) {
      state.hurricane.active = false;
      state.recovery.lastDisasterDay = day;
      lostWorldLog(
        state,
        day,
        `${state.hurricane.name} has passed. Floodwater is receding; recovery work is available.`,
        'info',
      );
      state.hurricane.name = '';
    }
  } else {
    state.flood.level = Math.max(0, state.flood.level - 0.03);
  }
  state.flood.lowlandRoadBlocked = state.flood.level > 1.4;

  // Wildfire risk in hot, dry weather; rain suppresses it.
  const dry = (state.seasons.id === 'summer' || state.seasons.id === 'hurricane') && ctx.weather === 'clear';
  if (state.fire.cells.length === 0 && dry && state.shelters.length > 0 && nextLostWorldRandom(state) < 0.05) {
    const anchor = state.shelters[0];
    state.fire.cells.push({
      id: `fire_${day}_0`,
      x: anchor.x + 18,
      z: anchor.z + 12,
      intensity: 1,
    });
    lostWorldLog(state, day, 'A grass fire has started near your settlement.', 'danger');
    pushAlert(alerts, 'danger', 'Wildfire near the settlement.');
  }
  if (state.fire.cells.length > 0) {
    if (ctx.weather === 'rain' || ctx.weather === 'storm') {
      state.fire.cells = [];
      lostWorldLog(state, day, 'Rain has put out the wildfire.', 'info');
    } else {
      state.fire.windX = Math.cos(day * 0.7) * 0.9;
      state.fire.windZ = Math.sin(day * 0.5) * 0.9;
      state.fire.lastSpreadTicks += 1;
      if (state.fire.lastSpreadTicks >= 3) {
        state.fire.lastSpreadTicks = 0;
        const next = state.fire.cells.map((c) => ({
          id: `${c.id}_s`,
          x: c.x + state.fire.windX * 6,
          z: c.z + state.fire.windZ * 6,
          intensity: Math.min(4, c.intensity + 0.2),
        }));
        state.fire.cells = [...state.fire.cells, ...next].slice(0, 8);
        if (state.shelters.length > 0 && nextLostWorldRandom(state) < 0.35) {
          const target = state.shelters[Math.floor(nextLostWorldRandom(state) * state.shelters.length)];
          target.integrity = Math.max(0, target.integrity - 3);
          state.damage.damagedShelters += 1;
        }
      }
    }
  }

  // Expeditions resolve on the clock.
  if (state.expedition && state.expedition.active) {
    state.expedition.hoursLeft -= 1;
    if (state.expedition.hoursLeft <= 0) {
      state.expedition.active = false;
      state.expedition.resolved = true;
      const roll = nextLostWorldRandom(state);
      const success = roll > state.expedition.risk;
      state.expedition.outcome = success
        ? `The team returned from ${state.expedition.destination} with supplies and a story worth telling.`
        : `The team limped back from ${state.expedition.destination} empty-handed after bad weather.`;
      lostWorldLog(state, day, state.expedition.outcome, success ? 'good' : 'warning');
      pushAlert(alerts, success ? 'good' : 'warning', state.expedition.outcome);
    }
  }

  // Keep the persistent-change ledger and settlement tier honest.
  const builtShelters = state.shelters.filter((s) => s.built).length;
  const builtProjects = state.communityProjects.filter((p) => p.built).length;
  const recruited = state.recruits.filter((r) => r.status === 'recruited' || r.status === 'assigned').length;
  const tier =
    builtShelters >= 6 && recruited >= 4 && builtProjects >= 3
      ? 4
      : builtShelters >= 4 && recruited >= 2
        ? 3
        : builtShelters >= 2 || recruited >= 1
          ? 2
          : builtShelters >= 1
            ? 1
            : 0;
  if (tier > state.persistent.settlementTier) {
    state.persistent.settlementTier = tier;
    addPersistentChange(
      state,
      day,
      'settlement',
      `Settlement grew to tier ${tier}`,
      ctx.playerX,
      ctx.playerZ,
    );
    lostWorldLog(state, day, `Your settlement has grown to tier ${tier}.`, 'good');
  }
}

export function tickLostWorld(
  state: LostWorldState,
  ctx: LostWorldTickContext,
): LostWorldTickReport {
  const alerts: LostWorldTickReport['alerts'] = [];
  const dt = Math.max(0, Math.min(ctx.dtSeconds, 4));
  const day = Math.max(1, Math.floor(ctx.day));
  const hour = clockHour(ctx.timeOfDay);
  const currentHourSlot = Math.floor(hour);

  state.seasons = seasonForDay(day);

  // Wetness and body comfort (Feature 7).
  const wetTarget =
    ctx.weather === 'storm' ? 1 : ctx.weather === 'rain' ? 0.65 : ctx.isSwimming ? 0.9 : 0;
  state.temperature.wetness += (wetTarget - state.temperature.wetness) * Math.min(1, dt * 0.35);
  state.temperature.lastExposure =
    ctx.weather === 'storm' ? 'storm' : ctx.weather === 'rain' ? 'rain' : 'clear';
  const shelterWarmth = state.shelters
    .filter((s) => s.built && Math.hypot(s.x - ctx.playerX, s.z - ctx.playerZ) < 14)
    .reduce((best, s) => Math.max(best, s.insulation), 0);
  state.temperature.shelterInsulation +=
    ((ctx.sheltered ? Math.max(0.35, shelterWarmth) : 0) - state.temperature.shelterInsulation) *
    Math.min(1, dt * 0.2);
  const comfortTarget =
    60 -
    state.temperature.wetness * 38 +
    (ctx.sheltered ? 18 : 0) +
    (ctx.nearFire ? 16 : 0) +
    seasonalTemperatureBias(state.seasons.id) * 1.6;
  state.temperature.comfort += (comfortTarget - state.temperature.comfort) * Math.min(1, dt * 0.05);

  // Food spoilage (Feature 8).
  const spoilMultiplier = state.kitchen.kitchenBuilt ? 0.35 : 1;
  for (let i = 0; i < state.food.length; i++) {
    const f = state.food[i];
    if (f.preserved || f.spoiled) continue;
    const heat = state.seasons.id === 'summer' ? 1.5 : 1;
    f.freshness = Math.max(
      0,
      f.freshness - (dt / 420) * heat * spoilMultiplier * (ctx.weather === 'clear' ? 1.2 : 0.8),
    );
    if (f.freshness <= 0.02) {
      f.freshness = 0;
      f.spoiled = true;
    }
  }

  if (state.kitchen.fuel > 0) state.kitchen.fuel = Math.max(0, state.kitchen.fuel - dt * 0.02);

  // Power grid brownouts (Feature 42).
  state.power.demandKw =
    state.power.lights * 0.06 +
    state.power.switches * 0.01 +
    (state.kitchen.kitchenBuilt ? 1.8 : 0) +
    (state.water.pumpBuilt ? 0.9 : 0);
  if (state.power.generatorBuilt && state.power.generatorFuel > 0) {
    state.power.outputKw = Math.min(8, state.power.demandKw + 1);
    state.power.generatorFuel = Math.max(0, state.power.generatorFuel - dt * 0.006);
  } else {
    state.power.outputKw = 0;
  }
  state.power.brownout = state.power.demandKw > state.power.outputKw + 0.05;

  // Water pressure and storage (Feature 43).
  if (state.water.wellBuilt) state.water.gallons = Math.min(state.water.capacity, state.water.gallons + dt * 0.02);
  state.water.pressure = state.water.pumpBuilt
    ? Math.min(1, state.water.gallons / Math.max(1, state.water.capacity) + 0.2)
    : state.water.gallons > 0
      ? 0.3
      : 0;

  // Traffic signal timing (Feature 18).
  state.traffic.signalTimer -= dt;
  if (state.traffic.signalTimer <= 0) {
    state.traffic.signalPhase = (state.traffic.signalPhase + 1) % 3;
    state.traffic.signalTimer = state.traffic.signalPhase === 1 ? 3 : 18;
    state.traffic.lastSignal = state.traffic.signalPhase === 0 ? 'green' : state.traffic.signalPhase === 1 ? 'yellow' : 'red';
  }
  state.traffic.congestion +=
    ((hour > 7 && hour < 9.5) || (hour > 16 && hour < 18.5) ? 0.72 : 0.25) -
    state.traffic.congestion;

  // Animal tracks age out quickly so tracking stays a live activity (Feature 12).
  if (state.tracks.length > 0) {
    for (let i = state.tracks.length - 1; i >= 0; i--) {
      state.tracks[i].expiresHours -= dt / 12;
      if (state.tracks[i].expiresHours <= 0) state.tracks.splice(i, 1);
    }
  }

  // Wildlife threat memory fades over days (Feature 11).
  for (let i = 0; i < state.wildlifeMemory.length; i++) {
    const mem = state.wildlifeMemory[i];
    if (mem.threats === 0) continue;
    if (day - mem.lastEncounterDay > 2) {
      mem.threats = Math.max(0, mem.threats - 1);
      mem.reaction = mem.threats >= 3 ? 'aggressive' : mem.threats >= 1 ? 'wary' : 'calm';
    }
  }

  // District reputation cools toward neutral slowly (Feature 19).
  for (let i = 0; i < state.districts.length; i++) {
    const d = state.districts[i];
    d.trend = d.trend * 0.98;
    if (d.reputation > 0) d.reputation = Math.max(0, d.reputation - dt * 0.0006);
    if (d.reputation < 0) d.reputation = Math.min(0, d.reputation + dt * 0.0006);
  }

  // Hourly systems.
  if (state.lastTickHour !== currentHourSlot) {
    state.lastTickHour = currentHourSlot;
    advanceHourly(state, ctx, day, hour, alerts);
    // Business opening hours are derived from the same clock the NPCs use.
    for (let i = 0; i < state.businesses.length; i++) {
      state.businesses[i].open = isBusinessOpen(hour);
    }
  }

  // Evolution score is recomputed cheaply from persistent achievement state (Feature 55).
  const discoveries =
    state.persistent.totalDiscoveries +
    state.research.catalogued.length +
    state.civilization.chambersFound +
    state.mystery.cluesFound.length +
    state.legendaries.filter((l) => l.discovered).length;
  const built =
    state.shelters.filter((s) => s.built).length * 12 +
    state.communityProjects.filter((p) => p.built).length * 15 +
    state.businesses.filter((b) => b.owned).length * 18 +
    state.restorations.filter((r) => r.restored).length * 14 +
    (state.power.generatorBuilt ? 8 : 0) +
    (state.water.wellBuilt ? 6 : 0) +
    state.civilization.excavationStage * 10;
  const relationships =
    state.recruits.filter((r) => r.status === 'recruited' || r.status === 'assigned').length * 10 +
    state.districts.reduce((sum, d) => sum + Math.max(0, d.reputation), 0) * 0.5 +
    state.npcs.reduce((sum, n) => sum + Math.max(0, n.trust), 0) * 0.35;
  const combat = state.worldBosses.filter((b) => b.defeated).length * 60;
  const score = Math.round(built + discoveries * 8 + relationships + combat + state.evolution.score * 0.02);
  state.evolution.score = Math.max(state.evolution.score, score);
  const stageIndex =
    state.evolution.score >= 700 ? 5 : state.evolution.score >= 480 ? 4 : state.evolution.score >= 300 ? 3 : state.evolution.score >= 160 ? 2 : state.evolution.score >= 60 ? 1 : 0;
  const stageNames = [
    'Unsettled Frontier',
    'First Foothold',
    'Growing Settlement',
    'Regional Power',
    'Lost World Nation',
    'Legend of the Bayou',
  ];
  const perks = [
    'Survival readout',
    'Trader discount 5%',
    'Recruit morale +10',
    'Business income +15%',
    'Hurricane warning +1 day',
    'Dragon and expedition mastery',
  ];
  if (stageIndex > state.evolution.stage) {
    state.evolution.stage = stageIndex;
    state.evolution.stageName = stageNames[stageIndex];
    if (!state.evolution.perks.includes(perks[stageIndex])) state.evolution.perks.push(perks[stageIndex]);
    lostWorldLog(state, day, `World evolution advanced: ${state.evolution.stageName}.`, 'discovery');
    pushAlert(alerts, 'discovery', `World evolution: ${state.evolution.stageName}`);
  } else {
    state.evolution.stageName = stageNames[stageIndex];
  }

  const temperatureOffset =
    -state.temperature.wetness * 3.1 +
    state.temperature.shelterInsulation * 2.2 +
    (ctx.nearFire ? 2.4 : 0) +
    seasonalTemperatureBias(state.seasons.id) * 0.55;

  const forceWeather: WeatherType | undefined = state.hurricane.active ? 'storm' : undefined;
  if (state.hurricane.active) {
    pushAlert(
      alerts,
      'danger',
      `${state.hurricane.name || 'Hurricane'} winds ${Math.round(state.hurricane.windMph)} mph · flood ${state.flood.level.toFixed(1)} m`,
    );
  }
  if (state.flood.level > 1.1) {
    pushAlert(alerts, 'warning', `Floodwater is ${state.flood.level.toFixed(1)} m deep in low areas.`);
  }
  if (state.fire.cells.length > 0) {
    pushAlert(alerts, 'danger', `Wildfire: ${state.fire.cells.length} active fronts.`);
  }

  return {
    alerts,
    forceWeather,
    temperatureOffset,
    vehicleDamage: state.mechanical.some((m) => m.failed)
      ? { vehicleId: state.mechanical.find((m) => m.failed)?.vehicleId ?? '', amount: 6 }
      : undefined,
    fellTrees:
      state.hurricane.active && state.hurricane.intensity >= 3
        ? { x: ctx.playerX, z: ctx.playerZ, count: state.hurricane.intensity }
        : undefined,
    floodVehicleStall: state.flood.level > 1.4 && ctx.activeVehicle !== null,
  };
}

export function syncInventoryFood(
  state: LostWorldState,
  inventory: InventorySlot[],
  day: number,
): void {
  const items: { itemId: ItemId; quantity: number }[] = [];
  for (let i = 0; i < inventory.length; i++) {
    items.push({ itemId: inventory[i].itemId, quantity: inventory[i].quantity });
  }
  syncFoodFreshness(state, items, day);
}

export function getLostWorldHudState(state: LostWorldState): LostWorldHudState {
  const activeEvent = state.events.find((e) => !e.resolved);
  return {
    seasonId: state.seasons.id,
    seasonLabel: state.seasons.label,
    seasonDay: state.seasons.dayInSeason,
    evolutionScore: state.evolution.score,
    evolutionStage: state.evolution.stageName,
    alerts:
      (state.hurricane.active ? 1 : 0) +
      (state.fire.cells.length > 0 ? 1 : 0) +
      state.events.filter((e) => !e.resolved).length,
    hurricaneActive: state.hurricane.active,
    hurricaneName: state.hurricane.name,
    floodLevel: Number(state.flood.level.toFixed(2)),
    fireCells: state.fire.cells.length,
    activeEvent: activeEvent ? activeEvent.title : null,
    settlementTier: state.persistent.settlementTier,
    recruitedCount: state.recruits.filter((r) => r.status === 'recruited' || r.status === 'assigned')
      .length,
  };
}

export function seasonLabel(season: SeasonId): string {
  if (season === 'spring') return 'Spring';
  if (season === 'summer') return 'Summer';
  if (season === 'hurricane') return 'Hurricane Season';
  return 'Winter';
}
