import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addShelterUpgrade,
  canOpenMusicStudio,
  computeStepDurationMs,
  createDefaultMix,
  createPlayerBuiltHouse,
  createPlayerHome,
  createPremadeShelter,
  discoverVillage,
  expandHome,
  midiToFrequency,
  togglePatternStep,
  tradeWithMerchant,
  validateWebPluginManifest,
  type DrumPattern,
  type PlayerEconomy,
} from './villagesAndAudioStudio';
import * as THREE from 'three';
import {
  HILL_HOUSE_POS,
  HILL_HOUSE_Y,
  getHilltopBaseFloorY,
  getTerrainHeight,
  isTerrainProtectedAt,
} from '../world/terrain';
import { createHilltopHouse } from '../world/models';

test('music studio access is exclusive to premade shelters and excluded from player-built houses', () => {
  const premade = createPremadeShelter('Hilltop Shelter');
  const playerBuilt = createPlayerBuiltHouse('Survivor Cabin');

  assert.equal(premade.type, 'premade');
  assert.equal(premade.hasMusicStudio, true);
  assert.equal(canOpenMusicStudio(premade), true);

  assert.equal(playerBuilt.type, 'player-built');
  assert.equal(playerBuilt.hasMusicStudio, false);
  assert.equal(canOpenMusicStudio(playerBuilt), false);
});

test('shelter and home upgrades reject duplicates and increment level', () => {
  const shelter = createPlayerBuiltHouse('Timber Hut');
  const first = addShelterUpgrade(shelter, 'workshop');
  const dup = addShelterUpgrade(shelter, 'workshop');

  assert.equal(first.success, true);
  assert.equal(dup.success, false);
  assert.equal(shelter.level, 2);

  const home = createPlayerHome('Shore Home');
  assert.equal(home.studioInstalled, false);
  const upgraded = expandHome(home, 'music-studio');
  assert.equal(upgraded.success, true);
  assert.equal(home.studioInstalled, true);
});

test('MIDI note frequency and step duration calculations are accurate and clamped', () => {
  assert.ok(Math.abs(midiToFrequency(69) - 440) < 1e-6);
  assert.ok(Math.abs(midiToFrequency(60) - 261.625565) < 1e-3);

  assert.equal(computeStepDurationMs(120, 4), 125);
  assert.equal(computeStepDurationMs(10, 4), computeStepDurationMs(40, 4));
  assert.equal(computeStepDurationMs(999, 4), computeStepDurationMs(240, 4));
});

test('togglePatternStep toggles steps immutably without mutating original pattern', () => {
  const pattern: DrumPattern = {
    bpm: 120,
    steps: 4,
    tracks: [
      {
        id: 'kick',
        name: 'Kick',
        sampleId: 'builtin_kick',
        activeSteps: [true, false, false, false],
        mix: createDefaultMix(),
      },
    ],
  };

  const next = togglePatternStep(pattern, 0, 2);
  assert.equal(pattern.tracks[0].activeSteps[2], false);
  assert.equal(next.tracks[0].activeSteps[2], true);

  const toggledBack = togglePatternStep(next, 0, 2);
  assert.equal(toggledBack.tracks[0].activeSteps[2], false);
});

test('validateWebPluginManifest enforces web-audio-worklet format and rejects unsupported formats', () => {
  const valid = validateWebPluginManifest({
    id: 'reverb-pro',
    name: 'Island Hall Reverb',
    version: '1.0.0',
    type: 'effect',
    format: 'web-audio-worklet',
    entryPoint: 'https://example.com/worklet.js',
    developer: 'Studio',
  });
  assert.equal(valid.valid, true);

  const unsupported = validateWebPluginManifest({
    id: 'native-vst',
    name: 'Native VST3',
    format: 'vst3' as unknown as 'web-audio-worklet',
    entryPoint: '/plugins/synth.vst3',
  });
  assert.equal(unsupported.valid, false);
  assert.match(unsupported.reason || '', /web-audio-worklet/i);
});

test('village discovery and merchant trading update inventory and coins', () => {
  const economy: PlayerEconomy = { coins: 100, inventory: [] };
  const blocked = tradeWithMerchant('coastal-village', 'fish', 2, economy);
  assert.equal(blocked.success, false);

  assert.equal(discoverVillage('coastal-village'), true);
  const ok = tradeWithMerchant('coastal-village', 'fish', 2, economy);
  assert.equal(ok.success, true);
  assert.equal(economy.coins, 70);
  assert.deepEqual(economy.inventory, [{ itemId: 'fish', quantity: 2 }]);
});

test('premade hilltop base, porch, entry step, and music studio wing have solid flat floor support and protected terrain', () => {
  const sampleOffsets: [number, number][] = [
    [6.65, 0], // east entry step
    [5.3, 0], // front porch
    [4.2, 0], // front doorway
    [2.6, 2.0], // east living corridor
    [2.75, 4.2], // south studio archway
    [2.05, 5.15], // studio control room center
    [0.0, 8.2], // studio south wall interior
    [-4.0, 8.2], // recording booth SW corner
    [-2.4, 5.4], // recording booth entry
    [-2.85, 6.5], // recording booth mic area
  ];

  for (const [dx, dz] of sampleOffsets) {
    const wx = HILL_HOUSE_POS.x + dx;
    const wz = HILL_HOUSE_POS.z + dz;
    const terrainY = getTerrainHeight(wx, wz);
    const floorY = getHilltopBaseFloorY(wx, wz, HILL_HOUSE_Y);
    assert.ok(
      Math.abs(terrainY - HILL_HOUSE_Y) < 0.01,
      `Expected flat plateau at offset (${dx}, ${dz}), got ${terrainY}`,
    );
    assert.ok(
      floorY >= HILL_HOUSE_Y,
      `Expected solid walkable floor at offset (${dx}, ${dz}), got ${floorY}`,
    );
    assert.equal(
      isTerrainProtectedAt(wx, wz),
      true,
      `Expected terrain protection at offset (${dx}, ${dz})`,
    );
  }

  // Ensure the 3-Bay Vehicle Garage stays completely flat at VEHICLE_GARAGE_Y (3.25)
  for (const gx of [-34, -28, -22]) {
    assert.ok(
      Math.abs(getTerrainHeight(gx, 93) - 3.25) < 0.05,
      `Expected garage bay at x=${gx} to stay flat at 3.25`,
    );
  }
});

test('walking from East porch through living room into Music Studio and Recording Booth is unobstructed and never falls through floor', () => {
  const house = createHilltopHouse(
    HILL_HOUSE_POS.x,
    HILL_HOUSE_Y,
    HILL_HOUSE_POS.z,
    new THREE.Texture() as unknown as THREE.CanvasTexture,
  );

  // Full continuous walk-in path from outside East porch -> inside house -> studio archway -> control room -> booth
  const waypoints: [number, number][] = [
    [8.2, 0],
    [6.65, 0],
    [5.3, 0],
    [4.2, 0],
    [2.7, 0],
    [2.7, 4.2],
    [2.7, 5.4],
    [1.25, 5.4],
    [-1.3, 5.4],
    [-2.6, 5.4],
    [-2.55, 6.25],
  ];

  const playerRadius = 0.42;
  let prevY = getTerrainHeight(
    HILL_HOUSE_POS.x + waypoints[0][0],
    HILL_HOUSE_POS.z + waypoints[0][1],
  );

  for (let i = 0; i < waypoints.length - 1; i++) {
    const [x0, z0] = waypoints[i];
    const [x1, z1] = waypoints[i + 1];
    const segLen = Math.hypot(x1 - x0, z1 - z0);
    const steps = Math.max(1, Math.ceil(segLen / 0.25));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const dx = x0 + (x1 - x0) * t;
      const dz = z0 + (z1 - z0) * t;
      const wx = HILL_HOUSE_POS.x + dx;
      const wz = HILL_HOUSE_POS.z + dz;

      const surfaceY = Math.max(
        getTerrainHeight(wx, wz),
        getHilltopBaseFloorY(wx, wz, prevY),
      );
      const minExpectedY = dx <= 7.0 ? HILL_HOUSE_Y - 0.01 : 8.15;
      assert.ok(
        surfaceY >= minExpectedY && surfaceY <= prevY + 0.35,
        `Walkable step continuity failed at (${dx.toFixed(2)}, ${dz.toFixed(2)}): prevY=${prevY.toFixed(3)}, surfaceY=${surfaceY.toFixed(3)}`,
      );
      prevY = surfaceY;

      for (const col of house.colliders) {
        const dist = Math.hypot(wx - col.x, wz - col.z);
        assert.ok(
          dist >= col.radius + playerRadius - 0.001,
          `Collider snag at (${dx.toFixed(2)}, ${dz.toFixed(2)}): collider=(${(col.x - HILL_HOUSE_POS.x).toFixed(2)}, ${(col.z - HILL_HOUSE_POS.z).toFixed(2)}) r=${col.radius}, dist=${dist.toFixed(3)}`,
        );
      }
    }
  }

  // Verify every 0.5m interior cell of the main house & studio wing supports player & dropped pickups
  for (let dx = -4.8; dx <= 3.8; dx += 0.5) {
    for (let dz = -3.8; dz <= 8.0; dz += 0.5) {
      const wx = HILL_HOUSE_POS.x + dx;
      const wz = HILL_HOUSE_POS.z + dz;
      const surfaceY = Math.max(
        getTerrainHeight(wx, wz),
        getHilltopBaseFloorY(wx, wz, HILL_HOUSE_Y),
      );
      assert.ok(
        surfaceY >= HILL_HOUSE_Y + 0.08 - 1e-4,
        `Interior floor support missing at (${dx}, ${dz}): got ${surfaceY}`,
      );
    }
  }
});
