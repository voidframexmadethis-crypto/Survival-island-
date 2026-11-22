import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DRAGON_VALLEY_SYSTEM,
  Dragon,
  DragonCompanion,
  createDragonCard,
  dragonValley,
  rarityFromElements,
} from './dragonValleySystem';
import {
  VIKING_QUESTS,
  VIKING_TRADE_OFFERS,
  vikingVillage,
} from './vikingVillageSystem';
import { DRAGON_VALLEY_POS, HILL_HOUSE_POS } from '../world/terrain';

test('dragon valley sits exactly 50 blocks from the premade hill house', () => {
  const distance = Math.hypot(
    DRAGON_VALLEY_POS.x - HILL_HOUSE_POS.x,
    DRAGON_VALLEY_POS.z - HILL_HOUSE_POS.z,
  );
  assert.ok(Math.abs(distance - 50) < 0.01, `expected 50 blocks, got ${distance}`);
});

test('dragonValley collectEgg & hatchEgg follow exact egg-bag rules', () => {
  dragonValley.eggs = [];
  dragonValley.dragons = [];

  // Cannot hatch uncollected species
  assert.equal(dragonValley.hatchEgg('Storm', 'Tempest'), null);

  dragonValley.collectEgg('Storm');
  dragonValley.collectEgg('Frost');
  assert.deepEqual(dragonValley.eggs, ['Storm', 'Frost']);

  const hatched: Dragon | null = dragonValley.hatchEgg('Storm', 'Tempest');
  assert.ok(hatched);
  assert.equal(hatched.name, 'Tempest');
  assert.equal(hatched.species, 'Storm');
  assert.equal(hatched.color, 'Original');
  assert.equal(hatched.age, 0);
  assert.equal(hatched.hunger, 100);
  assert.equal(hatched.bond, 0);
  assert.equal(hatched.hatched, true);
  assert.equal(hatched.rideable, false);
  assert.deepEqual(dragonValley.eggs, ['Frost']);
});

test('dragonValley feed, rename, customizeColor, grow, and canRide work accurately', () => {
  dragonValley.eggs = ['Ember'];
  dragonValley.dragons = [];

  const drg = dragonValley.hatchEgg('Ember', 'Cinder')!;
  assert.ok(drg);

  // Lower hunger slightly to verify clamp & +25/+5 bond behavior
  drg.hunger = 60;
  dragonValley.feed(drg.id);
  assert.equal(drg.hunger, 85);
  assert.equal(drg.bond, 5);

  dragonValley.feed(drg.id);
  assert.equal(drg.hunger, 100);
  assert.equal(drg.bond, 10);

  dragonValley.rename(drg.id, 'Ignis Rex');
  assert.equal(drg.name, 'Ignis Rex');

  dragonValley.customizeColor(drg.id, 'Crimson');
  assert.equal(drg.color, 'Crimson');

  // Must reach age 3 to become rideable
  assert.equal(dragonValley.canRide(drg.id), false);
  dragonValley.grow(drg.id);
  assert.equal(drg.age, 1);
  assert.equal(dragonValley.canRide(drg.id), false);

  dragonValley.grow(drg.id);
  assert.equal(drg.age, 2);
  assert.equal(dragonValley.canRide(drg.id), false);

  dragonValley.grow(drg.id);
  assert.equal(drg.age, 3);
  assert.equal(drg.rideable, true);
  assert.equal(dragonValley.canRide(drg.id), true);
  assert.equal(dragonValley.canRide('nonexistent-id'), false);
});

test('DRAGON_VALLEY_SYSTEM save/load preserves eggs, colors, age, bond, and rideable status', () => {
  const starters = DRAGON_VALLEY_SYSTEM.resetToStarter();
  assert.equal(starters.length, 1);
  assert.ok(dragonValley.eggs.includes('Ember'));

  DRAGON_VALLEY_SYSTEM.customizeColor(starters[0], 'Stormgold');
  DRAGON_VALLEY_SYSTEM.growDragon(starters[0]);
  DRAGON_VALLEY_SYSTEM.growDragon(starters[0]);
  assert.equal(starters[0].rideable, true);

  const saved = DRAGON_VALLEY_SYSTEM.exportSave(starters);
  dragonValley.eggs = [];
  dragonValley.dragons = [];

  const restored = DRAGON_VALLEY_SYSTEM.importSave(saved);
  assert.equal(restored.length, 1);
  assert.equal(restored[0].color, 'Stormgold');
  assert.equal(restored[0].age, 3);
  assert.equal(restored[0].rideable, true);
  assert.equal(restored[0].daysRaised, 6);
  assert.equal(restored[0].health, 50);
  assert.equal(dragonValley.canRide(restored[0].id), true);
});

test('hatchlings mature into full-health adults across 16 island days', () => {
  DRAGON_VALLEY_SYSTEM.resetToStarter();
  const baby = DRAGON_VALLEY_SYSTEM.hatchEgg('Ember', 'Pebble');
  assert.ok(baby);
  assert.equal(baby.daysRaised, 0);
  assert.equal(baby.health, 20);
  assert.equal(baby.maxHealth, 100);

  DRAGON_VALLEY_SYSTEM.advanceDays([baby], 6);
  assert.equal(baby.daysRaised, 6);
  assert.equal(baby.age, 1);
  assert.equal(baby.stage, 'Juvenile');
  assert.equal(baby.growth, 38);
  assert.equal(baby.health, 50);

  DRAGON_VALLEY_SYSTEM.advanceDays([baby], 10);
  assert.equal(baby.daysRaised, 16);
  assert.equal(baby.age, 3);
  assert.equal(baby.stage, 'Adult');
  assert.equal(baby.growth, 100);
  assert.equal(baby.health, 100);
  assert.equal(baby.maxHealth, 100);
  assert.equal(baby.rideable, true);
});

test('dragon cards track rarity, codex entries, and rescued encounters through save/load', () => {
  const starters = DRAGON_VALLEY_SYSTEM.resetToStarter();
  assert.equal(dragonValley.cards.length, 1);
  assert.equal(dragonValley.cards[0].rarity, 'Common');
  assert.equal(dragonValley.cards[0].source, 'Starter');

  assert.equal(rarityFromElements(['Ember']), 'Common');
  assert.equal(rarityFromElements(['Storm']), 'Rare');
  assert.equal(rarityFromElements(['Shadow']), 'Epic');
  assert.equal(rarityFromElements(['Storm', 'Shadow'], 'Storm-Shadow'), 'Legendary');

  const rescued: DragonCompanion = {
    ...starters[0],
    id: 'test_ashwing',
    name: 'Ashwing',
    species: 'Storm-Shadow',
    elements: ['Storm', 'Shadow'],
    stage: 'Adult',
    growth: 100,
    age: 3,
    rideable: true,
  };
  const card = createDragonCard(rescued, 'Rescued');
  assert.equal(card.rarity, 'Legendary');
  assert.equal(card.source, 'Rescued');
  DRAGON_VALLEY_SYSTEM.recordDragonCard(rescued, 'Rescued');
  DRAGON_VALLEY_SYSTEM.markEncounterRescued('dv_abandoned_ashwing');
  assert.equal(dragonValley.cards.length, 2);
  assert.equal(DRAGON_VALLEY_SYSTEM.hasRescuedEncounter('dv_abandoned_ashwing'), true);

  const saved = DRAGON_VALLEY_SYSTEM.exportSave([...starters, rescued]);
  DRAGON_VALLEY_SYSTEM.resetToStarter();
  assert.equal(dragonValley.cards.length, 1);
  assert.equal(DRAGON_VALLEY_SYSTEM.hasRescuedEncounter('dv_abandoned_ashwing'), false);

  DRAGON_VALLEY_SYSTEM.importSave(saved);
  assert.equal(dragonValley.cards.length, 2);
  assert.equal(dragonValley.cards[1].rarity, 'Legendary');
  assert.equal(DRAGON_VALLEY_SYSTEM.hasRescuedEncounter('dv_abandoned_ashwing'), true);
});

test('vikingVillage provides friendly villagers with conversation, trading, and quests', () => {
  vikingVillage.reset();
  assert.ok(vikingVillage.villagers.length >= 3);
  assert.ok(vikingVillage.villagers.every((v) => v.friendly === true));

  const first = vikingVillage.villagers[0];
  const res = vikingVillage.interact(first.id);
  assert.deepEqual(res, {
    conversation: true,
    villager: first,
    trading: true,
    quests: true,
  });

  assert.equal(vikingVillage.interact('unknown_viking'), null);
  assert.ok(VIKING_TRADE_OFFERS.length >= 4);
  assert.ok(VIKING_QUESTS.length >= 3);
  assert.ok(VIKING_TRADE_OFFERS.some((offer) => offer.giveItemId === 'magnum_44'));
  assert.ok(VIKING_TRADE_OFFERS.some((offer) => offer.giveItemId === 'sawed_off'));
  assert.ok(VIKING_TRADE_OFFERS.some((offer) => offer.giveItemId === 'roasted_meat'));
  assert.ok(VIKING_TRADE_OFFERS.some((offer) => offer.giveItemId === 'grilled_fish'));

  vikingVillage.markQuestCompleted(VIKING_QUESTS[0].id);
  const save = vikingVillage.exportSave();
  vikingVillage.reset();
  assert.equal(vikingVillage.completedQuestIds.length, 0);

  vikingVillage.importSave(save);
  assert.deepEqual(vikingVillage.completedQuestIds, [VIKING_QUESTS[0].id]);
  assert.equal(vikingVillage.reputation, 10);
});
