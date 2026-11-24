import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addShelterUpgrade,
  buildMelodyPresetNotes,
  canOpenMusicStudio,
  computeStepDurationMs,
  createDefaultMix,
  createPlayerBuiltHouse,
  createPlayerHome,
  createPremadeShelter,
  discoverVillage,
  expandHome,
  mapMidiSequenceToDrumSteps,
  mapMidiSequenceToPianoRollNotes,
  midiToFrequency,
  midiToNoteName,
  StudioImportManager,
  toggleOrAddPianoRollNote,
  togglePatternStep,
  tradeWithMerchant,
  transposePianoRollChannel,
  validateWebPluginManifest,
  type DrumPattern,
  type PlayerEconomy,
} from './villagesAndAudioStudio';
import * as THREE from 'three';
import {
  HILL_HOUSE_POS,
  HILL_HOUSE_Y,
  HILLTOP_HOUSE_STAIR,
  HILLTOP_UPPER_FLOOR_Y,
  VEHICLE_GARAGE_POS,
  VEHICLE_GARAGE_Y,
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

  // Ensure the six-car Motor Atelier stays completely flat at VEHICLE_GARAGE_Y (3.25)
  for (const dx of [-15, -9, -6, 0, 6, 9, 15]) {
    const gx = VEHICLE_GARAGE_POS.x + dx;
    assert.ok(
      Math.abs(getTerrainHeight(gx, VEHICLE_GARAGE_POS.z) - VEHICLE_GARAGE_Y) < 0.05,
      `Expected garage bay at x=${gx} to stay flat at ${VEHICLE_GARAGE_Y}`,
    );
  }
});

test('premade hill house exposes hinged double doors and a door interaction station', () => {
  const house = createHilltopHouse(
    HILL_HOUSE_POS.x,
    HILL_HOUSE_Y,
    HILL_HOUSE_POS.z,
    new THREE.Texture() as unknown as THREE.CanvasTexture,
  );
  assert.equal(house.door.pivotL.rotation.y, 0);
  assert.equal(house.door.pivotR.rotation.y, 0);
  assert.ok(house.door.pivotL.children.length > 0);
  assert.ok(house.door.pivotR.children.length > 0);
  assert.equal(house.door.x, HILL_HOUSE_POS.x + 4.2);
  assert.equal(house.door.z, HILL_HOUSE_POS.z);

  const doorStation = house.stations.find((station) => station.kind === 'house_door');
  assert.ok(doorStation);
  assert.match(doorStation!.label, /Double Doors/i);
});

test('hilltop house adds a continuous exterior stair to a solid extra bedroom and bath floor', () => {
  const house = createHilltopHouse(
    HILL_HOUSE_POS.x,
    HILL_HOUSE_Y,
    HILL_HOUSE_POS.z,
    new THREE.Texture() as unknown as THREE.CanvasTexture,
  );
  assert.ok(house.group.getObjectByName('hilltop-upper-floor'));
  assert.ok(house.group.getObjectByName('hilltop-upper-stair'));
  assert.ok(house.group.getObjectByName('hilltop-upper-bedroom'));
  assert.ok(house.group.getObjectByName('hilltop-upper-bath'));

  const upperBed = house.stations.find((station) => station.id === 'house_upper_bed');
  const upperBath = house.stations.find((station) => station.id === 'house_upper_shower');
  assert.ok(upperBed);
  assert.ok(upperBath);
  assertClose(upperBed!.y, HILLTOP_UPPER_FLOOR_Y, 0.001);
  assertClose(upperBath!.y, HILLTOP_UPPER_FLOOR_Y, 0.001);

  const stairX = (HILLTOP_HOUSE_STAIR.minX + HILLTOP_HOUSE_STAIR.maxX) * 0.5;
  let prevY = getTerrainHeight(stairX, HILLTOP_HOUSE_STAIR.minZ);
  const steps = 90;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const z = HILLTOP_HOUSE_STAIR.minZ + (HILLTOP_HOUSE_STAIR.maxZ - HILLTOP_HOUSE_STAIR.minZ) * t;
    const surfaceY = Math.max(
      getTerrainHeight(stairX, z),
      getHilltopBaseFloorY(stairX, z, prevY),
    );
    assert.ok(surfaceY <= prevY + 0.45, `stair step ${i} is not walkable`);
    assert.ok(surfaceY >= prevY - 0.02, `stair step ${i} sinks`);
    prevY = surfaceY;
  }
  assertClose(prevY, HILLTOP_UPPER_FLOOR_Y, 0.06);

  const deckX = HILL_HOUSE_POS.x - 6.0;
  const deckZ = HILL_HOUSE_POS.z + 2.5;
  assertClose(
    getHilltopBaseFloorY(deckX, deckZ, HILLTOP_UPPER_FLOOR_Y),
    HILLTOP_UPPER_FLOOR_Y,
    0.001,
  );
  assertClose(
    getHilltopBaseFloorY(HILL_HOUSE_POS.x, HILL_HOUSE_POS.z, HILL_HOUSE_Y),
    HILL_HOUSE_Y + 0.08,
    0.001,
  );
});

function assertClose(actual: number, expected: number, epsilon = 0.001) {
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `expected ${actual} to be within ${epsilon} of ${expected}`,
  );
}

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

test('StudioImportManager parses MIDI, decodes WAV/MP3 audio samples, and loads JS AudioWorklet processors', async () => {
  const addedModules: string[] = [];
  const fakeBuffer = { duration: 1.25 } as unknown as AudioBuffer;
  const mockCtx = {
    decodeAudioData: async () => fakeBuffer,
    audioWorklet: {
      addModule: async (url: string) => {
        addedModules.push(url);
      },
    },
  } as unknown as AudioContext;

  const importer = new StudioImportManager(mockCtx);

  // Build a minimal valid Standard MIDI File (Format 0, 1 track, 480 TPQN, 140 BPM + Kick note 36 + Snare note 38)
  const midiBytes = new Uint8Array([
    // MThd (6 bytes)
    0x4d, 0x54, 0x68, 0x64,
    0x00, 0x00, 0x00, 0x06,
    0x00, 0x00, // format 0
    0x00, 0x01, // 1 track
    0x01, 0xe0, // 480 ticks/quarter
    // MTrk
    0x4d, 0x54, 0x72, 0x6b,
    0x00, 0x00, 0x00, 0x1b, // 27 bytes
    // delta 0: Tempo 140 BPM -> 428571 us = 0x068a1b
    0x00, 0xff, 0x51, 0x03, 0x06, 0x8a, 0x1b,
    // delta 0: Note On ch 9, note 36 (Kick), vel 100
    0x00, 0x99, 0x24, 0x64,
    // delta 120 (0x78): Note Off ch 9, note 36
    0x78, 0x89, 0x24, 0x00,
    // delta 0: Note On ch 9, note 38 (Snare), vel 95
    0x00, 0x99, 0x26, 0x5f,
    // delta 120: Note Off ch 9, note 38
    0x78, 0x89, 0x26, 0x00,
    // delta 0: End of Track
    0x00, 0xff, 0x2f, 0x00,
  ]);

  const midiFile = new File([midiBytes], 'beat_140.mid', { type: 'audio/midi' });
  const wavFile = new File([new Uint8Array([1, 2, 3, 4])], 'kick_custom.wav', { type: 'audio/wav' });
  const jsFile = new File(['class CustomProc extends AudioWorkletProcessor {}'], 'tape_sat.js', {
    type: 'application/javascript',
  });

  const result = await importer.handleFiles({
    target: { files: [midiFile, wavFile, jsFile] },
  });

  assert.equal(result.errors.length, 0);
  assert.deepEqual(result.importedAudioNames, ['kick_custom.wav']);
  assert.equal(importer.drumKit['kick_custom.wav'], fakeBuffer);
  assert.equal(importer.customProcessors.has('tape_sat.js'), true);
  assert.equal(addedModules.length, 1);

  assert.ok(importer.midiSequence);
  assert.equal(importer.midiSequence.name, 'beat_140.mid');
  assert.equal(importer.midiSequence.bpm, 140);
  assert.equal(importer.midiSequence.totalNotes, 2);

  const steps = mapMidiSequenceToDrumSteps(importer.midiSequence, 5);
  assert.equal(steps[0][0], true); // Kick at step 0
  assert.equal(steps[1][1], true); // Snare at step 1

  importer.dispose();
});

test('Piano Roll pattern melody helpers add, toggle, transpose, preset, and map MIDI melodies accurately', () => {
  assert.equal(midiToNoteName(60), 'C4');
  assert.equal(midiToNoteName(61), 'C#4');
  assert.equal(midiToNoteName(48), 'C3');

  // Add and toggle notes for a channel
  const first = toggleOrAddPianoRollNote([], 5, 60, 0, 2, 0.9, 16);
  assert.equal(first.added, true);
  assert.equal(first.nextNotes.length, 1);
  assert.equal(first.nextNotes[0].midi, 60);
  assert.equal(first.nextNotes[0].duration, 2);

  // Add second note (harmony) without removing first
  const second = toggleOrAddPianoRollNote(first.nextNotes, 5, 67, 0, 4, 0.85, 16);
  assert.equal(second.added, true);
  assert.equal(second.nextNotes.length, 2);

  // Toggle first note off
  const toggledOff = toggleOrAddPianoRollNote(second.nextNotes, 5, 60, 0, 2, 0.9, 16);
  assert.equal(toggledOff.added, false);
  assert.equal(toggledOff.nextNotes.length, 1);
  assert.equal(toggledOff.nextNotes[0].midi, 67);

  // Transpose only targets specified channel and clamps safely within range
  const preset = buildMelodyPresetNotes('trap_minor', 5);
  assert.ok(preset.length >= 8);
  const combined = [...preset, ...buildMelodyPresetNotes('bass_808', 4)];
  const transposed = transposePianoRollChannel(combined, 5, 3, 48, 72);
  assert.equal(transposed.find((n) => n.channelId === 5 && n.step === 0)?.midi, 63);
  assert.equal(transposed.find((n) => n.channelId === 4 && n.step === 0)?.midi, 48); // unchanged

  // Map non-percussion MIDI track notes to Piano Roll pattern notes
  const prFromMidi = mapMidiSequenceToPianoRollNotes(
    {
      name: 'melody.mid',
      format: 0,
      ticksPerQuarterNote: 480,
      bpm: 128,
      totalNotes: 2,
      tracks: [
        {
          name: 'Lead',
          notes: [
            { note: 64, velocity: 100, channel: 0, startTick: 0, durationTicks: 240, stepIndex: 0 },
            { note: 36, velocity: 100, channel: 9, startTick: 0, durationTicks: 120, stepIndex: 0 },
          ],
        },
      ],
    },
    6,
  );
  assert.equal(prFromMidi.length, 1);
  assert.equal(prFromMidi[0].midi, 64);
  assert.equal(prFromMidi[0].duration, 2);
});

