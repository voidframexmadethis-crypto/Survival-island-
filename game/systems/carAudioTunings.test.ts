import assert from 'node:assert/strict';
import test from 'node:test';
import {
  VEHICLE_AUDIO_TUNINGS,
  buildAntiClipCurve,
  resolveCarAudioTuning,
} from './carAudioTunings';

test('every old-school body resolves to its own tuning', () => {
  const cases: Array<[Record<string, string>, string]> = [
    [{ preset: 'donk' }, 'donk'],
    [{ preset: 'cadillac_coupe_deville' }, 'cadillac_coupe_deville'],
    [{ preset: 'chevy_tahoe' }, 'chevy_tahoe'],
    [{ preset: 'chevy_2000_sub' }, 'chevy_tahoe'],
    [{ preset: 'lowrider' }, 'lowrider'],
    [{ preset: 'slab' }, 'slab'],
    [{ preset: 'el_camino' }, 'el_camino'],
    [{ preset: 'town_car' }, 'town_car'],
    [{ preset: 'mini_truck' }, 'mini_truck'],
    [{ preset: 'van_90s' }, 'van_90s'],
    [{ name: 'Box Chevy DONK' }, 'donk'],
    [{ class: 'Old School', name: 'Cadillac Coupe DeVille' }, 'cadillac_coupe_deville'],
    [{ class: 'Modern Exotic', name: 'McLaren' }, 'modern'],
  ];
  for (const [car, expected] of cases) {
    assert.equal(resolveCarAudioTuning(car).id, expected);
  }

  const oldSchool = Object.values(VEHICLE_AUDIO_TUNINGS).filter(
    (tuning) => tuning.id !== 'modern',
  );
  // Distinct crossover/resonance/rattle signatures, not five copies of one EQ.
  assert.equal(new Set(oldSchool.map((t) => `${t.subHz}|${t.lowHz}|${t.midHz}`)).size >= 7, true);
  assert.equal(new Set(oldSchool.map((t) => t.bodyHz)).size >= 6, true);
  assert.equal(new Set(oldSchool.map((t) => t.rattle.intensity)).size >= 8, true);
  assert.equal(new Set(oldSchool.map((t) => t.speakers)).size, oldSchool.length);
});

test('layered bass covers sub, low bass and punch with mobile harmonics', () => {
  for (const tuning of Object.values(VEHICLE_AUDIO_TUNINGS)) {
    assert.ok(tuning.subHz >= 30 && tuning.subHz <= 60, `${tuning.id} sub band`);
    assert.ok(tuning.lowHz > 60 && tuning.lowHz <= 100, `${tuning.id} low band`);
    assert.ok(tuning.midHz > 100 && tuning.midHz <= 160, `${tuning.id} punch band`);
    assert.ok(tuning.harmonics >= 0.1 && tuning.harmonics <= 0.55);
  }

  const donk = VEHICLE_AUDIO_TUNINGS.donk;
  assert.equal(donk.splDb, 182);
  for (const other of ['cadillac_coupe_deville', 'chevy_tahoe', 'lowrider', 'classic'] as const) {
    assert.ok(donk.cabinBoost > VEHICLE_AUDIO_TUNINGS[other].cabinBoost);
    assert.ok(donk.rattle.intensity > VEHICLE_AUDIO_TUNINGS[other].rattle.intensity);
  }

  // Every old-school car rattles; the factory modern stereo does not.
  for (const tuning of Object.values(VEHICLE_AUDIO_TUNINGS)) {
    if (tuning.id === 'modern') {
      assert.equal(tuning.rattle.intensity, 0);
    } else {
      assert.ok(tuning.rattle.intensity > 0);
      assert.ok(tuning.rattle.plate > 0);
      assert.ok(tuning.rattle.deck > 0);
      assert.ok(tuning.rattle.quarter > 0);
      assert.ok(tuning.rattle.trim > 0);
    }
  }
});

test('anti-clip curve is linear at normal level and asymptotes below full scale', () => {
  const curve = buildAntiClipCurve(0.8, 0.98);
  assert.equal(curve.length, 4097);
  for (const sample of curve) {
    assert.ok(Math.abs(sample) < 0.999, 'ceiling never reaches 0 dBFS');
  }
  // Index 0 is -1, midpoint 0, last +1 for an even-length curve.
  assert.ok(curve[0] < -0.97 && curve[0] > -0.99);
  assert.equal(curve[2048], 0);
  assert.ok(curve[curve.length - 1] > 0.97 && curve[curve.length - 1] < 0.99);

  // Transparent below the threshold: 0.5 in -> 0.5 out.
  const half = Math.round(((0.5 + 1) / 2) * (curve.length - 1));
  assert.ok(Math.abs(curve[half] - 0.5) < 0.01);
  // Monotonic, so quiet passages are never modulated by the safety stage.
  for (let i = 1; i < curve.length; i += 1) {
    assert.ok(curve[i] >= curve[i - 1] - 1e-6);
  }
  // Hard overdrive above the threshold still lands under the ceiling.
  const max = buildAntiClipCurve(0.8, 0.98, 64);
  assert.ok(Math.max(...Array.from(max)) < 0.999);
});
