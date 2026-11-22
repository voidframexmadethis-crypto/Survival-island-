import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CAVE_COUNT,
  CAVE_OWNED_AREA_EXCLUSIONS,
  CaveType,
  UI_LAYOUT,
  caveSystem,
  getSafeHudLayoutMetrics,
  isCaveSiteValid,
} from './caveSystem';

test('caveSystem generates 5,000 procedural caves including all 5 special cave types within island bounds', () => {
  const island = { x: 10, z: -20, radius: 600 };
  const caves = caveSystem.generateIslandCaves(island);

  assert.equal(CAVE_COUNT, 5000);
  assert.equal(caves.length, 5000);
  assert.equal(caveSystem.canRideDragon(), false);

  const counts = new Map<CaveType, number>();
  for (const cave of caves) {
    counts.set(cave.type, (counts.get(cave.type) ?? 0) + 1);
    const dist = Math.hypot(cave.x - island.x, cave.z - island.z);
    assert.ok(dist <= island.radius + 1e-6, `Cave ${cave.id} exceeded island radius: ${dist}`);
    assert.equal(cave.discovered, false);
    assert.equal(cave.explored, false);
  }

  assert.equal(counts.get('civilization'), 1);
  assert.equal(counts.get('monster-boss'), 1);
  assert.equal(counts.get('lush'), 1);
  assert.equal(counts.get('crystal'), 1);
  assert.equal(counts.get('red-dragon'), 1);
  assert.equal(counts.get('regular'), 4995);
});

test('island caves generate deterministically on wild hillsides, clear of owned areas', () => {
  const island = { x: 0, z: 0, radius: 600 };
  const first = caveSystem.generateIslandCaves(island).map((c) => [c.x, c.z]);
  const second = caveSystem.generateIslandCaves(island).map((c) => [c.x, c.z]);
  // Loading a save must restore the exact same cave layout, otherwise saved
  // discovery flags would map onto different caves.
  assert.deepEqual(second, first);

  for (const cave of caveSystem.caves) {
    assert.ok(
      isCaveSiteValid(cave.x, cave.z),
      `${cave.id} is not on a wild hillside (${cave.x.toFixed(1)}, ${cave.z.toFixed(1)})`,
    );
    for (const area of CAVE_OWNED_AREA_EXCLUSIONS) {
      assert.ok(
        Math.hypot(cave.x - area.x, cave.z - area.z) >= area.radius,
        `${cave.id} spawned inside the ${area.label} exclusion zone`,
      );
    }
  }
});

test('caveSystem.discover and defeatRedDragon properly gate dragon riding until the Red Dragon Boss is defeated', () => {
  caveSystem.generateIslandCaves({ x: 0, z: 0, radius: 580 });

  const regularCave = caveSystem.caves.find((c) => c.type === 'regular')!;
  const monsterCave = caveSystem.caves.find((c) => c.type === 'monster-boss')!;
  const redDragonCave = caveSystem.getRedDragonCave()!;

  assert.equal(redDragonCave.type, 'red-dragon');
  assert.equal(caveSystem.canRideDragon(), false);

  const discovered = caveSystem.discover(regularCave.id);
  assert.equal(discovered?.discovered, true);

  assert.equal(caveSystem.defeatRedDragon(regularCave.id), false);
  assert.equal(caveSystem.defeatRedDragon(monsterCave.id), false);
  assert.equal(caveSystem.defeatRedDragon('nonexistent-cave'), false);
  assert.equal(caveSystem.canRideDragon(), false);

  assert.equal(caveSystem.defeatRedDragon(redDragonCave.id), true);
  assert.equal(redDragonCave.bossDefeated, true);
  assert.equal(redDragonCave.discovered, true);
  assert.equal(caveSystem.canRideDragon(), true);
});

test('caveSystem 64m spatial hash buckets return identical caves to brute-force scan', () => {
  caveSystem.generateIslandCaves({ x: 0, z: 0, radius: 640 });

  const queryX = 120;
  const queryZ = -85;
  const radius = 72;

  const bucketed = caveSystem.getCavesNear(queryX, queryZ, radius).map((c) => c.id).sort();
  const bruteForce = caveSystem.caves
    .filter((c) => Math.hypot(c.x - queryX, c.z - queryZ) <= radius)
    .map((c) => c.id)
    .sort();

  assert.deepEqual(bucketed, bruteForce);
});

test('caveSystem exportCompactState and hydrateCompactState preserve discovery and Red Dragon unlock', () => {
  caveSystem.generateIslandCaves({ x: 0, z: 0, radius: 620 });
  const lush = caveSystem.caves.find((c) => c.type === 'lush')!;
  const redDragon = caveSystem.getRedDragonCave()!;

  caveSystem.explore(lush.id);
  caveSystem.defeatRedDragon(redDragon.id);
  const snapshot = caveSystem.exportCompactState();

  caveSystem.generateIslandCaves({ x: 0, z: 0, radius: 620 });
  assert.equal(caveSystem.canRideDragon(), false);

  caveSystem.hydrateCompactState(snapshot);
  assert.equal(caveSystem.canRideDragon(), true);
  assert.equal(caveSystem.getCaveById(lush.id)?.explored, true);
  assert.equal(caveSystem.getRedDragonCave()?.bossDefeated, true);
  assert.equal(caveSystem.getRedDragonCave()?.x, redDragon.x);
});

test('UI_LAYOUT keeps menus outside player-control safe area on portrait, landscape, and desktop viewports', () => {
  assert.deepEqual(UI_LAYOUT, {
    reservePlayerControls: true,
    preventOverlap: true,
    mobileSafeArea: true,
    repositionMenus: true,
  });

  const portraitPhone = getSafeHudLayoutMetrics(390, 844, true, false);
  assert.equal(portraitPhone.isLandscapeCompact, false);
  assert.equal(portraitPhone.repositionPromptAboveControls, true);
  assert.ok(portraitPhone.reserveLeftPx >= 150);
  assert.ok(portraitPhone.reserveRightPx >= 180);

  const landscapePhone = getSafeHudLayoutMetrics(844, 390, true, false);
  assert.equal(landscapePhone.isLandscapeCompact, true);
  assert.ok(
    landscapePhone.centerBandMaxWidthPx <=
      844 - landscapePhone.reserveLeftPx - landscapePhone.reserveRightPx,
  );

  const minimized = getSafeHudLayoutMetrics(390, 844, true, true);
  assert.equal(minimized.repositionPromptAboveControls, false);

  const wideDesktop = getSafeHudLayoutMetrics(1440, 900, false, false);
  assert.equal(wideDesktop.repositionPromptAboveControls, false);
  assert.ok(wideDesktop.reserveLeftPx >= 220);
});
