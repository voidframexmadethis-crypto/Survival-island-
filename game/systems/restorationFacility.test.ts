import assert from 'node:assert/strict';
import test from 'node:test';
import {
  FACILITY_ENGRAVING_DESIGNS,
  FACILITY_FEATURES,
  advanceFacilityEngraving,
  appraiseFacilityVehicle,
  consumeFacilityPart,
  createRestorationFacilityState,
  getFacilityBayCount,
  getFacilityEquipmentCount,
  getFacilityExpansionLevel,
  getFacilityStats,
  hasFacilityFeature,
  installFacilityFeature,
  reassignFacilityVehicle,
  recordFacilityCompletion,
  recordFacilityPartReceived,
  recordFacilityPhoto,
  recycleFacilitySalvage,
  restoreRestorationFacilityState,
  setFacilityDisplay,
  startFacilityChallenge,
  startFacilityEngraving,
} from './restorationFacility';

const equipmentIds = FACILITY_FEATURES.filter((feature) => feature.equipment).map(
  (feature) => feature.id,
);

test('the facility offers the 50 requested systems plus the engraving studio', () => {
  assert.equal(FACILITY_FEATURES.length, 51);
  assert.equal(new Set(FACILITY_FEATURES.map((feature) => feature.id)).size, 51);
  for (let index = 1; index <= 50; index++) {
    assert.ok(
      FACILITY_FEATURES.some((feature) => feature.index === index),
      `missing system ${index}`,
    );
  }
  assert.ok(
    FACILITY_FEATURES.some(
      (feature) => feature.id === 'engraving_studio' && feature.category === 'engraving',
    ),
  );
  assert.ok(FACILITY_ENGRAVING_DESIGNS.length >= 8);
});

test('installing equipment automatically expands the annex to six bays', () => {
  const state = createRestorationFacilityState();
  assert.equal(getFacilityExpansionLevel(state), 0);
  assert.equal(getFacilityBayCount(state), 2);

  const milestones = [3, 9, 18, 28];
  let installed = 0;
  for (const target of milestones) {
    while (installed < target) {
      const result = installFacilityFeature(state, equipmentIds[installed]);
      assert.equal(result.ok, true);
      installed++;
    }
    assert.equal(getFacilityEquipmentCount(state), target);
    assert.equal(getFacilityExpansionLevel(state), milestones.indexOf(target) + 1);
    assert.equal(
      getFacilityBayCount(state),
      2 + Math.min(3, milestones.indexOf(target) + 1),
    );
  }
  const duplicate = installFacilityFeature(state, equipmentIds[0]);
  assert.equal(duplicate.ok, false);
  assert.ok(getFacilityStats(state).buildSpeedMultiplier > 1);
});

test('the parts ledger tracks receipt, installation and recycling without duplicates', () => {
  const state = createRestorationFacilityState();
  const jobId = 'job-test';
  const first = recordFacilityPartReceived(state, {
    jobId,
    crateId: 'engine_drivetrain',
    label: 'Engine & Drivetrain Crate',
    at: 10,
  });
  assert.ok(first);
  assert.equal(
    recordFacilityPartReceived(state, {
      jobId,
      crateId: 'engine_drivetrain',
      label: 'Engine & Drivetrain Crate',
      at: 11,
    }),
    null,
  );
  assert.equal(state.parts.length, 1);
  assert.equal(consumeFacilityPart(state, 'engine_drivetrain', jobId)?.status, 'installed');
  assert.equal(consumeFacilityPart(state, 'engine_drivetrain', jobId), null);

  const blocked = recycleFacilitySalvage(state);
  assert.equal(blocked.ok, false);
  assert.equal(installFacilityFeature(state, 'parts_recycling').ok, true);
  const recycled = recycleFacilitySalvage(state);
  assert.equal(recycled.ok, true);
  assert.ok(recycled.recovered > 0);
  assert.equal(state.parts[0].status, 'recycled');
  assert.equal(
    recordFacilityPartReceived(state, {
      jobId,
      crateId: 'engine_drivetrain',
      label: 'Engine & Drivetrain Crate',
      at: 20,
    }),
    null,
  );
});

test('finished builds produce quality, warranty, certificates, photos and challenge records', () => {
  const state = createRestorationFacilityState();
  for (const id of [
    'quality_warranty',
    'inspection_certificates',
    'progress_photography',
    'skill_progression',
    'restoration_challenges',
    'vip_restoration',
  ]) {
    assert.equal(installFacilityFeature(state, id).ok, true);
  }
  recordFacilityPhoto(state, {
    jobId: 'job-1',
    vehicleId: 'veh_test',
    label: 'Paint',
    at: 40,
  });
  assert.equal(startFacilityChallenge(state, 100).ok, true);
  const result = recordFacilityCompletion(state, {
    vehicleId: 'veh_test',
    name: 'Test Impala',
    damageScore: 22,
    valueBase: 32000,
    at: 220,
    elapsedSeconds: 120,
  });
  assert.ok(result.quality >= 70);
  assert.ok(result.record.warrantyMonths >= 12);
  assert.ok(result.record.certificateId?.startsWith('BRC-'));
  assert.equal(result.challenge.completed, true);
  assert.equal(result.challenge.seconds, 120);
  assert.equal(state.challenge.bestSeconds, 120);
  assert.equal(state.challenge.active, false);
  assert.ok(result.record.photos.length >= 1);
  assert.ok(state.mechanics.some((mechanic) => mechanic.xp > 0));
  assert.ok(result.record.appraisedValue > 32000);
});

test('appraisal and display only work after their management systems are installed', () => {
  const state = createRestorationFacilityState();
  assert.equal(
    appraiseFacilityVehicle(state, {
      vehicleId: 'veh_a',
      name: 'A',
      conditionScore: 80,
      baseValue: 30000,
    }).ok,
    false,
  );
  installFacilityFeature(state, 'condition_appraisal');
  assert.equal(
    appraiseFacilityVehicle(state, {
      vehicleId: 'veh_a',
      name: 'A',
      conditionScore: 80,
      baseValue: 30000,
    }).ok,
    true,
  );
  assert.equal(setFacilityDisplay(state, 'veh_a', true).ok, false);
  installFacilityFeature(state, 'display_area');
  assert.equal(setFacilityDisplay(state, 'veh_a', true).ok, true);
  assert.deepEqual(state.displayedVehicleIds, ['veh_a']);
});

test('the engraving studio applies a design to a recorded vehicle', () => {
  const state = createRestorationFacilityState();
  installFacilityFeature(state, 'condition_appraisal');
  appraiseFacilityVehicle(state, {
    vehicleId: 'veh_engrave',
    name: 'Engraved Impala',
    conditionScore: 90,
    baseValue: 40000,
  });
  assert.equal(
    startFacilityEngraving(state, 'veh_engrave', 'royal_filigree', 0).ok,
    false,
  );
  installFacilityFeature(state, 'engraving_studio');
  const started = startFacilityEngraving(
    state,
    'veh_engrave',
    'royal_filigree',
    0,
  );
  assert.equal(started.ok, true);
  assert.equal(advanceFacilityEngraving(state, 10), null);
  const done = advanceFacilityEngraving(state, 20);
  assert.ok(done);
  assert.equal(done?.design.id, 'royal_filigree');
  assert.equal(state.vehicles.veh_engrave.engravingId, 'royal_filigree');
  assert.equal(state.engravingJob, null);
});

test('renaming a finished car keeps its facility record, photos and display state', () => {
  const state = createRestorationFacilityState();
  installFacilityFeature(state, 'condition_appraisal');
  installFacilityFeature(state, 'display_area');
  installFacilityFeature(state, 'progress_photography');
  appraiseFacilityVehicle(state, {
    vehicleId: 'veh_old',
    name: 'Old',
    conditionScore: 75,
    baseValue: 25000,
  });
  recordFacilityPhoto(state, {
    jobId: 'j',
    vehicleId: 'veh_old',
    label: 'Teardown',
    at: 1,
  });
  setFacilityDisplay(state, 'veh_old', true);
  reassignFacilityVehicle(state, 'veh_old', 'veh_new');
  assert.equal(state.vehicles.veh_old, undefined);
  assert.equal(state.vehicles.veh_new.name, 'Old');
  assert.equal(state.vehicles.veh_new.photos[0].vehicleId, 'veh_new');
  assert.deepEqual(state.displayedVehicleIds, ['veh_new']);
  assert.equal(state.photos[0].vehicleId, 'veh_new');
});

test('saved facility state restores installed systems and rejects stale ids', () => {
  const state = createRestorationFacilityState();
  installFacilityFeature(state, 'frame_straightening');
  installFacilityFeature(state, 'engraving_studio');
  state.installedFeatureIds.push('not_a_real_system');
  state.lastMessage = 'saved';
  const restored = restoreRestorationFacilityState(
    JSON.parse(JSON.stringify(state)),
  );
  assert.deepEqual(restored.installedFeatureIds, [
    'frame_straightening',
    'engraving_studio',
  ]);
  assert.equal(hasFacilityFeature(restored, 'engraving_studio'), true);
  assert.equal(restored.lastMessage, 'saved');
});
