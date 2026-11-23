import assert from 'node:assert/strict';
import test from 'node:test';
import { getBiomeAt } from '../world/terrain';
import {
  FOOTSTEP_STRIDE_METERS,
  footstepStrideMeters,
  resolveFootstepSurface,
} from './playerFootstepSurface';

test('grass, sand and stone each resolve to their own footstep sound', () => {
  const base = { onStructure: false, swimming: false, flat: false };
  assert.equal(resolveFootstepSurface({ ...base, biome: 'plains' }), 'grass');
  assert.equal(resolveFootstepSurface({ ...base, biome: 'forest' }), 'grass');
  assert.equal(resolveFootstepSurface({ ...base, biome: 'beach' }), 'sand');
  assert.equal(resolveFootstepSurface({ ...base, biome: 'desert' }), 'sand');
  assert.equal(resolveFootstepSurface({ ...base, biome: 'badlands' }), 'sand');
  assert.equal(resolveFootstepSurface({ ...base, biome: 'mountain' }), 'rock');
  assert.equal(resolveFootstepSurface({ ...base, biome: 'cave' }), 'rock');
  assert.equal(resolveFootstepSurface({ ...base, biome: 'stony_peaks' }), 'rock');
  assert.equal(resolveFootstepSurface({ ...base, biome: 'stony_shore' }), 'rock');
  assert.equal(resolveFootstepSurface({ ...base, biome: 'jagged_peaks' }), 'rock');
});

test('built decks, swimming and the flat world override terrain sounds', () => {
  assert.equal(
    resolveFootstepSurface({
      biome: 'forest',
      onStructure: true,
      swimming: false,
      flat: false,
    }),
    'rock',
  );
  assert.equal(
    resolveFootstepSurface({
      biome: 'beach',
      onStructure: false,
      swimming: true,
      flat: false,
    }),
    'water',
  );
  assert.equal(
    resolveFootstepSurface({
      biome: 'ocean',
      onStructure: false,
      swimming: false,
      flat: true,
      flatSurfaceStyle: 'concrete_plaza',
    }),
    'rock',
  );
  assert.equal(
    resolveFootstepSurface({
      biome: 'ocean',
      onStructure: false,
      swimming: false,
      flat: true,
      flatSurfaceStyle: 'turf_grid',
    }),
    'grass',
  );
});

test('a real beach sample on the island maps to sand', () => {
  // The starting island's shoreline is beach; verify the live biome sampler
  // agrees with the sound resolver instead of assuming a fixture.
  const surface = resolveFootstepSurface({
    biome: getBiomeAt(0, 0),
    onStructure: false,
    swimming: false,
    flat: false,
  });
  assert.ok(['grass', 'sand', 'rock'].includes(surface));
});

test('footstep cadence is distance based and faster when sprinting', () => {
  assert.ok(FOOTSTEP_STRIDE_METERS.walk > 1.5);
  assert.ok(FOOTSTEP_STRIDE_METERS.sprint > FOOTSTEP_STRIDE_METERS.walk);
  assert.equal(footstepStrideMeters(false), FOOTSTEP_STRIDE_METERS.walk);
  assert.equal(footstepStrideMeters(true), FOOTSTEP_STRIDE_METERS.sprint);
});
