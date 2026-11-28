import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveCinematicPostQuality } from './cinematicPostFx';

test('cinematic post FX stays off on software GL and the low preset', () => {
  assert.equal(
    resolveCinematicPostQuality({ preset: 'ultra', isTouch: false, isSoftwareGl: true }),
    'off',
  );
  assert.equal(
    resolveCinematicPostQuality({ preset: 'low', isTouch: false, isSoftwareGl: false }),
    'off',
  );
});

test('cinematic post FX tier is capped on touch devices', () => {
  assert.equal(
    resolveCinematicPostQuality({ preset: 'balanced', isTouch: true, isSoftwareGl: false }),
    'low',
  );
  assert.equal(
    resolveCinematicPostQuality({ preset: 'high', isTouch: true, isSoftwareGl: false }),
    'medium',
  );
  assert.equal(
    resolveCinematicPostQuality({ preset: 'ultra', isTouch: true, isSoftwareGl: false }),
    'medium',
  );
});

test('cinematic post FX follows the desktop preset through ultra', () => {
  assert.equal(
    resolveCinematicPostQuality({ preset: 'balanced', isTouch: false, isSoftwareGl: false }),
    'medium',
  );
  for (const preset of ['high', 'ultra'] as const) {
    assert.equal(
      resolveCinematicPostQuality({ preset, isTouch: false, isSoftwareGl: false }),
      preset,
    );
  }
});

test('legacy and low presets never enable post FX', () => {
  for (const preset of ['legacy', 'low'] as const) {
    assert.equal(
      resolveCinematicPostQuality({ preset, isTouch: false, isSoftwareGl: false }),
      'off',
    );
  }
});
