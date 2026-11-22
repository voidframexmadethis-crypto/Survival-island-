import assert from 'node:assert/strict';
import test from 'node:test';
import { LouisianaMainlandSystem } from './louisianaMainland';

test('mainland starts clean and serializes a complete round trip', () => {
  const system = new LouisianaMainlandSystem();
  assert.equal(system.getHudSnapshot(1).heat, 0);
  assert.equal(system.getHudSnapshot(1).cityTier, 'New in Town');
  assert.deepEqual(system.getHudSnapshot(1).ownedProperties, []);

  system.startPursuit(3);
  system.attemptTakedown(60);
  system.ownedProperties.push('magazine_safehouse');
  system.activeSafehouse = 'magazine_safehouse';
  system.bestDrift = 1200;
  system.factionReputation.creole_kings = 9;

  const restored = new LouisianaMainlandSystem();
  restored.hydrate(system.serialize());
  assert.equal(restored.heat, system.heat);
  assert.equal(restored.takedowns, 1);
  assert.deepEqual(restored.ownedProperties, ['magazine_safehouse']);
  assert.equal(restored.activeSafehouse, 'magazine_safehouse');
  assert.equal(restored.bestDrift, 1200);
  assert.equal(restored.factionReputation.creole_kings, 9);
});

test('mainland property income is claimable once per day and respects market license', () => {
  const system = new LouisianaMainlandSystem();
  assert.equal(system.claimIncome(1).ok, false);

  assert.equal(system.purchaseProperty('magazine_safehouse').ok, true);
  assert.equal(system.purchaseProperty('magazine_safehouse').ok, false);
  assert.equal(system.getHudSnapshot(1).incomeReady, 120);
  assert.equal(system.claimIncome(1).amount, 120);
  assert.equal(system.claimIncome(1).ok, false);
  assert.equal(system.claimIncome(2).amount, 120);

  system.buyUpgrade('market_licenses');
  assert.equal(system.getIncomeReady(3), 150);
});

test('mainland pursuit fills the escape meter at speed and a takedown breaks the pursuit', () => {
  const system = new LouisianaMainlandSystem();
  assert.equal(system.startPursuit(2).ok, true);
  assert.equal(system.getHudSnapshot(1).pursuitActive, true);
  assert.equal(system.pursuitUnits, 3);

  for (let i = 0; i < 120; i++) {
    system.update(0.05, 72, 430, 80, 0, true, 1);
  }
  assert.ok(system.escapeProgress > 15);
  assert.equal(system.pursuitActive, true);
  assert.equal(system.attemptTakedown(70).ok, true);
  assert.equal(system.takedowns, 1);
  assert.ok(system.escapeProgress > 40);
});

test('mainland low-speed pursuit busts after the timeout and clears heat', () => {
  const system = new LouisianaMainlandSystem();
  system.startPursuit(4);
  for (let i = 0; i < 220; i++) {
    system.update(0.05, 72, 430, 0, 0, false, 1);
  }
  assert.equal(system.pursuitActive, false);
  assert.equal(system.heat, 0);
  assert.equal(system.bustedCount, 1);
});

test('mainland garage packages preserve the stock car list and charge once', () => {
  const system = new LouisianaMainlandSystem();
  assert.deepEqual(system.ownedPackages, ['stock']);
  assert.equal(system.buyGaragePackage('lowrider_64').coinsDelta, -650);
  assert.equal(system.equippedPackage, 'lowrider_64');
  assert.equal(system.selectGaragePackage('slab_swanger').ok, false);
  assert.equal(system.buyGaragePackage('slab_swanger').coinsDelta, -900);
  assert.equal(system.buyGaragePackage('slab_swanger').coinsDelta, 0);
  assert.deepEqual(system.ownedPackages, ['stock', 'lowrider_64', 'slab_swanger']);
});

test('mainland challenges track cross-world progress and only pay once', () => {
  const system = new LouisianaMainlandSystem();
  assert.equal(system.claimChallenge('island_hunter').ok, false);

  system.setCrossWorldProgress(2, 25, 2);
  const snapshot = system.getHudSnapshot(1);
  const hunter = snapshot.challenges.find((c) => c.id === 'island_hunter');
  const builder = snapshot.challenges.find((c) => c.id === 'master_builder');
  const bloodMoon = snapshot.challenges.find((c) => c.id === 'blood_moon_regular');
  assert.equal(hunter?.complete, true);
  assert.equal(builder?.complete, true);
  assert.equal(bloodMoon?.complete, true);

  assert.equal(system.claimChallenge('island_hunter').coinsDelta, 900);
  assert.equal(system.claimChallenge('island_hunter').ok, false);
  assert.equal(system.claimedChallenges.length, 1);
});

test('mainland outfits switch cosmetics and safehouse supplies reset daily', () => {
  const system = new LouisianaMainlandSystem();
  assert.equal(system.setOutfit('vault_raider').ok, true);
  assert.equal(system.getOutfit().name, 'Vault Raider');

  assert.equal(system.claimSafehouseSupplies(1).ok, false);
  system.purchaseProperty('bayou_customs');
  assert.equal(system.claimSafehouseSupplies(1).ok, true);
  assert.equal(system.claimSafehouseSupplies(1).ok, false);
  assert.equal(system.claimSafehouseSupplies(2).ok, true);
});
