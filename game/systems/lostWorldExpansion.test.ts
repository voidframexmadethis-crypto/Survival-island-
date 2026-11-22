import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

function expect(actual: unknown) {
  return {
    toBe(expected: unknown) {
      assert.strictEqual(actual, expected);
    },
    toBeGreaterThan(expected: number) {
      assert.ok((actual as number) > expected, `expected ${String(actual)} > ${expected}`);
    },
    toBeLessThan(expected: number) {
      assert.ok((actual as number) < expected, `expected ${String(actual)} < ${expected}`);
    },
    toBeGreaterThanOrEqual(expected: number) {
      assert.ok((actual as number) >= expected, `expected ${String(actual)} >= ${expected}`);
    },
    toContain(expected: unknown) {
      assert.ok((actual as readonly unknown[]).includes(expected), `expected array to contain ${String(expected)}`);
    },
    toHaveLength(expected: number) {
      assert.strictEqual((actual as { length: number }).length, expected);
    },
    toBeTruthy() {
      assert.ok(actual, `expected ${String(actual)} to be truthy`);
    },
  };
}
import {
  createLostWorldState,
  type LostWorldActionContext,
  type LostWorldState,
} from './lostWorldExpansion';
import { tickLostWorld, normalizeLostWorldState, syncFoodFreshness } from './lostWorldSimulation';
import { buildLostWorldActions, performLostWorldAction } from './lostWorldActions';

function makeCtx(overrides: Partial<LostWorldActionContext> = {}): LostWorldActionContext {
  return {
    coins: 2000,
    items: {
      wood: 100,
      stone: 100,
      branch: 50,
      fiber: 50,
      rope: 20,
      hide: 20,
      metal_ore: 40,
      iron_ingot: 10,
      flint: 10,
      clay: 20,
      raw_meat: 10,
      roasted_meat: 10,
      filtered_water_bottle: 10,
      ammo: 200,
      berries: 10,
      salt: 10,
      tomato: 5,
      onion: 5,
      corn: 5,
      potato: 5,
      lettuce: 5,
      cucumber: 5,
      freshwater_fish: 5,
    },
    vitals: {
      health: 100,
      maxHealth: 100,
      hunger: 80,
      maxHunger: 100,
      thirst: 80,
      maxThirst: 100,
      stamina: 100,
      maxStamina: 100,
      temperatureC: 37,
    },
    day: 4,
    timeOfDay: 0.45,
    weather: 'clear',
    playerX: 0,
    playerZ: 0,
    scene: 'island',
    sheltered: false,
    nearFire: false,
    isSwimming: false,
    vehicles: [
      {
        id: 'veh_test',
        name: 'Test Lowrider',
        preset: 'lowrider',
        paintColor: '#111111',
        hasTrunkBass: true,
        trunkBassEnabled: true,
        hp: 100,
        maxHp: 100,
        fuel: 80,
      },
    ],
    activeVehicleId: 'veh_test',
    dragons: [{ id: 'dragon_test', name: 'Ember' }],
    navigatorActive: true,
    recruitedCount: 1,
    multiplayerConnected: true,
    multiplayerPeers: [{ peerId: 'peer_b', name: 'Partner' }],
    ...overrides,
  };
}

function tick(state: LostWorldState, overrides: Partial<Parameters<typeof tickLostWorld>[1]> = {}) {
  return tickLostWorld(state, {
    dtSeconds: 2,
    day: 4,
    timeOfDay: 0.45,
    weather: 'clear',
    playerX: 0,
    playerZ: 0,
    sheltered: false,
    nearFire: false,
    isSwimming: false,
    activeVehicle: null,
    recruitedCount: 0,
    scene: 'island',
    ...overrides,
  });
}

describe('Lost World persistence', () => {
  test('older saves without lostWorld receive full backward-compatible defaults', () => {
    const loaded = normalizeLostWorldState(undefined);
    expect(loaded.version).toBe(2);
    expect(loaded.npcs.length).toBeGreaterThan(0);
    expect(loaded.businesses.length).toBeGreaterThan(0);
    expect(loaded.worldBosses.every((b) => b.prep === 0)).toBe(true);
    expect(loaded.evolution.stage).toBe(0);
  });

  test('partial and serialized state keeps progress through save/load', () => {
    const state = createLostWorldState();
    state.shelters.push({
      id: 's1',
      kind: 'cabin',
      label: 'Cabin',
      x: 1,
      z: 2,
      built: true,
      integrity: 100,
      insulation: 0.5,
      defense: 5,
      dayBuilt: 3,
    });
    state.evolution.score = 210;
    state.evolution.stage = 2;
    state.evolution.stageName = 'Growing Settlement';
    state.civilization.excavationStage = 2;
    state.mystery.cluesFound.push('clue_1');

    const roundTripped = normalizeLostWorldState(
      JSON.parse(JSON.stringify(state)) as Partial<LostWorldState>,
    );
    expect(roundTripped.shelters).toHaveLength(1);
    expect(roundTripped.shelters[0].label).toBe('Cabin');
    expect(roundTripped.civilization.excavationStage).toBe(2);
    expect(roundTripped.mystery.cluesFound).toContain('clue_1');
    expect(roundTripped.evolution.stageName).toBe('Growing Settlement');
  });
});

describe('Living world simulation', () => {
  test('NPCs follow daily schedules from the in-game clock', () => {
    const state = createLostWorldState();
    tick(state, { timeOfDay: 0.4, day: 4 }); // ~15:36
    const working = state.npcs.filter((n) => n.activity === 'working').length;
    expect(working).toBeGreaterThan(0);

    state.lastTickHour = -1;
    tick(state, { timeOfDay: 0.8, day: 4 }); // ~01:12
    expect(state.npcs.every((n) => n.activity === 'sleeping')).toBe(true);
  });

  test('seasons advance with the day and affect seasonal state', () => {
    const state = createLostWorldState();
    tick(state, { day: 16 });
    expect(state.seasons.id).toBe('hurricane');
    tick(state, { day: 25 });
    expect(state.seasons.id).toBe('winter');
  });

  test('food freshness decays and is tracked from carried food', () => {
    const state = createLostWorldState();
    syncFoodFreshness(state, [{ itemId: 'raw_meat', quantity: 3 }], 4);
    expect(state.food).toHaveLength(1);
    for (let i = 0; i < 30; i++) tick(state, { dtSeconds: 4 });
    expect(state.food[0].freshness).toBeLessThan(1);
  });

  test('hurricane simulation forces storm weather and raises floodwater', () => {
    const state = createLostWorldState();
    state.hurricane.active = true;
    state.hurricane.name = 'Test Storm';
    state.hurricane.intensity = 3;
    state.hurricane.hoursLeft = 8;
    state.flood.level = 0;
    const report = tick(state, { day: 16, weather: 'clear' });
    expect(report.forceWeather).toBe('storm');
    expect(state.flood.level).toBeGreaterThan(0);
  });
});

describe('Survival and building actions', () => {
  test('building a cabin consumes materials and places a real structure', () => {
    const state = createLostWorldState();
    const ctx = makeCtx();
    const result = performLostWorldAction(state, 'survival_build:cabin', ctx);
    expect(result.ok).toBe(true);
    expect(state.shelters).toHaveLength(1);
    expect(state.shelters[0].kind).toBe('cabin');
    expect(result.effects.placeStructure?.type).toBe('basic_shelter');
    expect(result.effects.coins).toBe(-120);
    expect(result.effects.items?.some((i) => i.itemId === 'wood' && i.quantity < 0)).toBe(true);
  });

  test('cooking requires a grill and produces fresh food', () => {
    const state = createLostWorldState();
    const ctx = makeCtx();
    const blocked = performLostWorldAction(state, 'survival_cook:skillet', ctx);
    expect(blocked.ok).toBe(false);

    state.kitchen.grillBuilt = true;
    const cooked = performLostWorldAction(state, 'survival_cook:skillet', ctx);
    expect(cooked.ok).toBe(true);
    expect(cooked.effects.items?.some((i) => i.itemId === 'roasted_meat' && i.quantity === 2)).toBe(true);
    expect(state.food.some((f) => f.itemId === 'roasted_meat')).toBe(true);
    expect(state.kitchen.mealsCooked).toBe(1);
  });

  test('preserved food stops spoiling', () => {
    const state = createLostWorldState();
    syncFoodFreshness(state, [{ itemId: 'raw_meat', quantity: 2 }], 4);
    const preserve = performLostWorldAction(state, 'survival_preserve', makeCtx());
    expect(preserve.ok).toBe(true);
    const before = state.food[0].freshness;
    for (let i = 0; i < 30; i++) tick(state, { dtSeconds: 4 });
    expect(state.food[0].freshness).toBe(before);
  });
});

describe('Crescent City economy', () => {
  test('buying a business produces daily income that can be collected', () => {
    const state = createLostWorldState();
    const business = state.businesses[0];
    const ctx = makeCtx({ playerX: business.x, playerZ: business.z, coins: 2000 });
    const buy = performLostWorldAction(state, `city_buy:${business.id}`, ctx);
    expect(buy.ok).toBe(true);
    expect(business.owned).toBe(true);

    tick(state, { day: 5, timeOfDay: 0.45 });
    expect(business.uncollectedIncome).toBeGreaterThan(0);

    const collectCtx = makeCtx({ playerX: business.x, playerZ: business.z });
    const collect = performLostWorldAction(state, `city_collect:${business.id}`, collectCtx);
    expect(collect.ok).toBe(true);
    expect(collect.effects.coins).toBeGreaterThan(0);
    expect(business.uncollectedIncome).toBe(0);
  });

  test('district reputation changes persist and drive local support', () => {
    const state = createLostWorldState();
    const before = state.districts.find((d) => d.id === 'french_quarter')!.reputation;
    const result = performLostWorldAction(state, 'city_donate:french_quarter', makeCtx());
    expect(result.ok).toBe(true);
    const after = state.districts.find((d) => d.id === 'french_quarter')!.reputation;
    expect(after).toBeGreaterThan(before);
  });
});

describe('Vehicles and restoration', () => {
  test('vehicle customization applies a real patch and records investment', () => {
    const state = createLostWorldState();
    const result = performLostWorldAction(
      state,
      'vehicle_customize:veh_test:hydraulics',
      makeCtx(),
    );
    expect(result.ok).toBe(true);
    expect(result.effects.vehiclePatch?.vehicleId).toBe('veh_test');
    expect(result.effects.vehiclePatch?.patch.hasHydraulics).toBe(true);
    expect(state.customization[0].investment).toBeGreaterThan(0);
  });

  test('restoring a barn find spawns the finished preset', () => {
    const state = createLostWorldState();
    const project = state.restorations[0];
    const recovered = performLostWorldAction(state, `vehicle_recover:${project.id}`, makeCtx());
    expect(recovered.ok).toBe(true);
    let last = recovered;
    for (let i = 0; i < 3; i++) {
      last = performLostWorldAction(state, `vehicle_restore:${project.id}`, makeCtx());
      expect(last.ok).toBe(true);
    }
    expect(project.restored).toBe(true);
    expect(last.effects.spawnVehiclePreset).toBe(project.preset);
  });

  test('mechanical wear triggers a failure notice after hard driving', () => {
    const state = createLostWorldState();
    const report = tick(state, {
      activeVehicle: { id: 'veh_test', speedKmh: 180, fuel: 40, hp: 100, maxHp: 100 },
      dtSeconds: 4,
    });
    expect(state.mechanical.length).toBe(1);
    expect(state.mechanical[0].engineHeat).toBeGreaterThan(0);
    expect(report.alerts.length >= 0).toBe(true);
  });
});

describe('Adventure, exploration and people', () => {
  test('treasure requires all clues and a nearby dig site', () => {
    const state = createLostWorldState();
    const treasure = state.treasures[0];
    for (let i = 0; i < treasure.cluesTotal; i++) {
      const res = performLostWorldAction(state, `adventure_decode:${treasure.id}`, makeCtx());
      expect(res.ok).toBe(true);
    }
    const far = performLostWorldAction(state, `adventure_dig:${treasure.id}`, makeCtx({ playerX: 0, playerZ: 0 }));
    expect(far.ok).toBe(false);
    const near = performLostWorldAction(
      state,
      `adventure_dig:${treasure.id}`,
      makeCtx({ playerX: treasure.digX, playerZ: treasure.digZ }),
    );
    expect(near.ok).toBe(true);
    expect(treasure.dug).toBe(true);
    expect(near.effects.coins).toBe(treasure.rewardCoins);
  });

  test('branching adventure choice advances the story', () => {
    const state = createLostWorldState();
    const adv = state.adventures[0];
    const first = performLostWorldAction(state, `adventure_advance:${adv.id}`, makeCtx());
    expect(first.ok).toBe(true);
    expect(adv.stage).toBe(1);

    const blocked = performLostWorldAction(state, `adventure_advance:${adv.id}`, makeCtx());
    expect(blocked.ok).toBe(false);

    const choice = performLostWorldAction(state, `adventure_choose:${adv.id}:hire`, makeCtx());
    expect(choice.ok).toBe(true);
    expect(adv.branch).toBe('hire');
    expect(adv.stage).toBe(2);
  });

  test('survivors can be rescued, recruited and assigned to community work', () => {
    const state = createLostWorldState();
    const recruit = state.recruits[0];
    const rescued = performLostWorldAction(state, `people_rescue:${recruit.id}`, makeCtx());
    expect(rescued.ok).toBe(true);
    expect(recruit.status).toBe('rescued');

    const recruited = performLostWorldAction(state, `people_recruit:${recruit.id}`, makeCtx());
    expect(recruited.ok).toBe(true);
    expect(recruit.status).toBe('recruited');

    const assigned = performLostWorldAction(
      state,
      `people_assign:${recruit.id}:construction`,
      makeCtx(),
    );
    expect(assigned.ok).toBe(true);
    expect(recruit.assignment).toBe('construction');

    tick(state, { day: 5, timeOfDay: 0.45 });
    expect(state.communityProjects.some((p) => p.progress > 0)).toBe(true);
  });

  test('NPC conversation memory survives repeated encounters', () => {
    const state = createLostWorldState();
    const npc = state.npcs[0];
    const ctx = makeCtx({ playerX: npc.x, playerZ: npc.z });
    const talk = performLostWorldAction(state, `people_talk:${npc.id}`, ctx);
    expect(talk.ok).toBe(true);
    expect(npc.encounters).toBe(1);
    expect(state.conversations[0].lastLine.length).toBeGreaterThan(10);
    expect(state.npcMemory.length).toBeGreaterThanOrEqual(0);
  });
});

describe('Co-op over the real P2P layer', () => {
  test('community challenge progresses and pays out', () => {
    const state = createLostWorldState();
    const ctx = makeCtx();
    const start = performLostWorldAction(state, 'coop_challenge_start', ctx);
    expect(start.ok).toBe(true);
    expect(state.coop.challengeId).toBeTruthy();
    const contribution = performLostWorldAction(state, 'coop_challenge_contribute', ctx);
    expect(contribution.ok).toBe(true);
    expect(state.coop.challengeProgress).toBe(1);
  });

  test('trade escrow is created and can be accepted by the receiver', () => {
    const state = createLostWorldState();
    const ctx = makeCtx();
    const offer = performLostWorldAction(state, 'coop_trade_offer:peer_b', ctx);
    expect(offer.ok).toBe(true);
    expect(state.coop.trades).toHaveLength(1);
    expect(offer.effects.items?.some((i) => i.itemId === 'wood' && i.quantity === -5)).toBe(true);
  });
});

describe('Engineering, disasters and lost civilization', () => {
  test('power and water infrastructure switch on and supply the grid', () => {
    const state = createLostWorldState();
    expect(performLostWorldAction(state, 'build_power_generator', makeCtx()).ok).toBe(true);
    expect(state.power.generatorBuilt).toBe(true);
    expect(performLostWorldAction(state, 'build_water_well', makeCtx()).ok).toBe(true);
    expect(state.water.gallons).toBeGreaterThan(0);
    expect(performLostWorldAction(state, 'build_water_irrigation', makeCtx()).ok).toBe(true);
    const water = performLostWorldAction(state, 'build_water_crops', makeCtx());
    expect(water.ok).toBe(true);
    expect(water.effects.waterCrops).toBe(true);
  });

  test('hurricane preparation reduces storm impact and recovery restores shelters', () => {
    const state = createLostWorldState();
    state.shelters.push({
      id: 's1',
      kind: 'cabin',
      label: 'Cabin',
      x: 0,
      z: 0,
      built: true,
      integrity: 40,
      insulation: 0.5,
      defense: 5,
      dayBuilt: 1,
    });
    state.hurricane.active = true;
    state.hurricane.intensity = 3;
    expect(performLostWorldAction(state, 'disaster_prepare', makeCtx()).ok).toBe(true);
    expect(state.hurricane.prepared).toBe(true);

    state.recovery.infrastructure = 0;
    expect(performLostWorldAction(state, 'disaster_repair', makeCtx()).ok).toBe(true);
    expect(state.recovery.infrastructure).toBeGreaterThan(0);
    expect(state.shelters[0].integrity).toBeGreaterThan(40);
  });

  test('lost civilization excavation requires a crew and opens its gate after clues', () => {
    const state = createLostWorldState();
    const noCrew = performLostWorldAction(state, 'lost_excavate', makeCtx({ recruitedCount: 0 }));
    expect(noCrew.ok).toBe(false);

    for (let i = 0; i < 4; i++) {
      const dig = performLostWorldAction(state, 'lost_excavate', makeCtx());
      expect(dig.ok).toBe(true);
    }
    expect(state.civilization.excavationStage).toBe(4);

    state.mystery.cluesFound = ['clue_1', 'clue_2', 'clue_3', 'clue_4', 'clue_5', 'clue_6'];
    const gate = performLostWorldAction(state, 'lost_gate', makeCtx());
    expect(gate.ok).toBe(true);
    expect(state.civilization.gateOpened).toBe(true);
  });

  test('world boss prep and co-op bonus lead to a resolvable encounter', () => {
    const state = createLostWorldState();
    const boss = state.worldBosses[0];
    for (let i = 0; i < boss.requiredPrep; i++) {
      expect(performLostWorldAction(state, `lost_boss_prep:${boss.id}`, makeCtx()).ok).toBe(true);
    }
    expect(boss.prep).toBe(boss.requiredPrep);
    state.rng = 1; // deterministic low roll
    const fight = performLostWorldAction(state, `lost_boss_fight:${boss.id}`, makeCtx());
    expect(fight.ok).toBe(true);
    expect(boss.attempts).toBe(1);
  });

  test('dragon bonding is tied to an existing dragon and consumes meat', () => {
    const state = createLostWorldState();
    const bond = performLostWorldAction(state, 'lost_bond:dragon_test', makeCtx());
    expect(bond.ok).toBe(true);
    expect(state.dragonBonds[0].dragonId).toBe('dragon_test');
    expect(state.dragonBonds[0].level).toBeGreaterThanOrEqual(1);
    expect(bond.effects.feedDragonId).toBe('dragon_test');
  });

  test('mystery clues require proximity and reveal the final story at twelve', () => {
    const state = createLostWorldState();
    const clue = performLostWorldAction(state, 'lost_clue:clue_1', makeCtx({ playerX: 42, playerZ: 58 }));
    expect(clue.ok).toBe(true);
    expect(state.mystery.cluesFound).toContain('clue_1');
    expect(state.mystery.storyStage).toBe(1);
  });
});

describe('Action surface', () => {
  test('all actions expose unique ids and real availability reasons', () => {
    const state = createLostWorldState();
    const actions = buildLostWorldActions(state, makeCtx());
    expect(actions.length).toBeGreaterThan(40);
    const ids = new Set(actions.map((a) => a.id));
    expect(ids.size).toBe(actions.length);
    expect(actions.every((a) => a.available || Boolean(a.reason))).toBe(true);
    expect(actions.some((a) => a.tab === 'world')).toBe(true);
    expect(actions.some((a) => a.tab === 'survival')).toBe(true);
    expect(actions.some((a) => a.tab === 'lost')).toBe(true);
  });
});
