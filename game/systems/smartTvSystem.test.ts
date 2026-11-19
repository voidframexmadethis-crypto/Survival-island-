import assert from 'node:assert/strict';
import test from 'node:test';
import {
  TV_BASS_MODES,
  computeTrunkBassEnvelope,
  computeTrunkVisualOffsets,
  getTvBassModeMeta,
  normalizeTvBassMode,
} from './smartTvSystem';

test('normalizeTvBassMode defaults to car trunk mode and preserves valid modes', () => {
  assert.equal(normalizeTvBassMode(undefined), 'trunk');
  assert.equal(normalizeTvBassMode('unknown'), 'trunk');
  assert.equal(normalizeTvBassMode('off'), 'off');
  assert.equal(normalizeTvBassMode('trunk'), 'trunk');
  assert.equal(normalizeTvBassMode('extreme'), 'extreme');
});

test('TV_BASS_MODES provides ascending low-shelf and sub-peak gains', () => {
  const offMeta = getTvBassModeMeta('off');
  const trunkMeta = getTvBassModeMeta('trunk');
  const extremeMeta = getTvBassModeMeta('extreme');

  assert.equal(TV_BASS_MODES.length, 3);
  assert.equal(offMeta.lowShelfDb, 0);
  assert.ok(trunkMeta.lowShelfDb > offMeta.lowShelfDb);
  assert.ok(extremeMeta.lowShelfDb > trunkMeta.lowShelfDb);
  assert.ok(extremeMeta.bumpScale > trunkMeta.bumpScale);
});

test('computeTrunkBassEnvelope returns zero when inactive or stock mode and scales with audio & proximity', () => {
  assert.equal(
    computeTrunkBassEnvelope({
      timeSec: 1.0,
      active: false,
      bassMode: 'trunk',
      volume: 0.8,
      spatialMult: 1,
    }),
    0,
  );

  assert.equal(
    computeTrunkBassEnvelope({
      timeSec: 1.0,
      active: true,
      bassMode: 'off',
      volume: 0.8,
      spatialMult: 1,
    }),
    0,
  );

  assert.equal(
    computeTrunkBassEnvelope({
      timeSec: 1.0,
      active: true,
      bassMode: 'trunk',
      volume: 0,
      spatialMult: 1,
    }),
    0,
  );

  const trunkHit = computeTrunkBassEnvelope({
    timeSec: 0,
    active: true,
    bassMode: 'trunk',
    volume: 0.9,
    spatialMult: 1,
    transientPulse: 0.95,
  });
  const extremeHit = computeTrunkBassEnvelope({
    timeSec: 0,
    active: true,
    bassMode: 'extreme',
    volume: 0.9,
    spatialMult: 1,
    transientPulse: 0.95,
  });
  const farHit = computeTrunkBassEnvelope({
    timeSec: 0,
    active: true,
    bassMode: 'extreme',
    volume: 0.9,
    spatialMult: 0.25,
    transientPulse: 0.95,
  });

  assert.ok(trunkHit > 0.5 && trunkHit <= 1);
  assert.ok(extremeHit >= trunkHit);
  assert.ok(farHit < extremeHit);
});

test('computeTrunkVisualOffsets drives 3D excursion and returns zero when idle or off', () => {
  const idle = computeTrunkVisualOffsets(0, 1.5, 'trunk');
  assert.deepEqual(idle, {
    scaleBoost: 0,
    offsetZ: 0,
    offsetY: 0,
    tiltXRad: 0,
    tiltZRad: 0,
    glowBoost: 0,
  });

  const off = computeTrunkVisualOffsets(0.9, 1.5, 'off');
  assert.equal(off.scaleBoost, 0);
  assert.equal(off.offsetZ, 0);
  assert.equal(off.glowBoost, 0);

  const trunkBump = computeTrunkVisualOffsets(0.8, 0.5, 'trunk');
  const maxBump = computeTrunkVisualOffsets(0.8, 0.5, 'extreme');
  assert.ok(trunkBump.scaleBoost > 0);
  assert.ok(trunkBump.offsetZ > 0);
  assert.ok(trunkBump.glowBoost > 0.5);
  assert.ok(maxBump.scaleBoost > trunkBump.scaleBoost);
  assert.ok(maxBump.glowBoost > trunkBump.glowBoost);
});
