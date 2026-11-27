import assert from 'node:assert/strict';
import test from 'node:test';
import { ITEMS } from '../data/items';
import {
  FIELD_PROCESSING_STEP_INFO,
  applyFieldProcessingStep,
  buildCarcassYieldPlan,
  canPerformFieldProcessingStep,
  createCarcassProcessingState,
  fieldProcessingDurationMs,
  nextFieldProcessingStep,
  remainingYields,
  stepYields,
  trophyItemForSpecies,
} from './fieldProcessingSystem';

const PLAN = buildCarcassYieldPlan({
  isDino: false,
  species: 'deer',
  drops: [
    { itemId: 'raw_meat', quantity: 4 },
    { itemId: 'hide', quantity: 1 },
  ],
});

test('field processing requires field dressing, skinning, then butchering', () => {
  const state = createCarcassProcessingState({ isDino: false, meatQuantity: 4 });
  assert.equal(state.stage, 'whole');
  assert.equal(nextFieldProcessingStep(state.stage), 'field_dress');
  assert.equal(canPerformFieldProcessingStep(state, 'skin', true, 100).ok, false);

  const dressed = applyFieldProcessingStep(state, 'field_dress', PLAN);
  assert.equal(dressed.state.stage, 'field_dressed');
  assert.ok(dressed.state.weightKg < state.weightKg);
  assert.equal(nextFieldProcessingStep(dressed.state.stage), 'skin');

  const skinned = applyFieldProcessingStep(state, 'skin', PLAN);
  assert.equal(skinned.state.stage, 'skinned');
});

test('field dressing yields organs and protects freshness', () => {
  const state = createCarcassProcessingState({
    isDino: true,
    meatQuantity: 8,
    freshness: 0.4,
  });
  const result = applyFieldProcessingStep(state, 'field_dress', PLAN);
  const ids = result.yields.map((y) => y.itemId);
  assert.ok(ids.includes('heart'));
  assert.ok(ids.includes('liver'));
  assert.ok(ids.includes('kidneys'));
  assert.equal(result.state.organYielded, true);
  assert.ok(result.state.freshness >= 0.98);
  assert.equal(stepYields('field_dress', result.state, PLAN).length, 0);
});

test('skinning yields a hide and exposes butcher cuts', () => {
  const state = createCarcassProcessingState({ isDino: false, meatQuantity: 4 });
  const dressed = applyFieldProcessingStep(state, 'field_dress', PLAN).state;
  const result = applyFieldProcessingStep(dressed, 'skin', PLAN);
  const ids = result.yields.map((y) => y.itemId);
  assert.ok(ids.includes('raw_hide'));
  assert.ok(ids.includes('pelt'));
  assert.equal(result.state.hideRemoved, true);
  assert.equal(result.complete, false);
});

test('butchering yields prime cuts, edible extras, trophies, and legacy meat', () => {
  const state = createCarcassProcessingState({ isDino: false, meatQuantity: 4 });
  const dressed = applyFieldProcessingStep(state, 'field_dress', PLAN).state;
  const skinned = applyFieldProcessingStep(dressed, 'skin', PLAN).state;
  const result = applyFieldProcessingStep(skinned, 'butcher', PLAN);
  const ids: string[] = result.yields.map((y) => y.itemId);
  for (const itemId of [
    'backstrap',
    'tenderloin',
    'hindquarter_steak',
    'shoulder_roast',
    'ribs',
    'tongue',
    'bone_marrow',
    'tallow',
    'soup_bones',
    'sinew',
    'antlers',
    'raw_meat',
  ]) {
    assert.ok(ids.includes(itemId), `missing ${itemId}`);
  }
  assert.equal(result.complete, true);
  assert.equal(result.state.weightKg, 0);
  assert.equal(remainingYields(result.state, PLAN).length, 0);
});

test('quartering adds manageable meat bags to the butcher yields', () => {
  const state = createCarcassProcessingState({ isDino: true, meatQuantity: 8 });
  const dressed = applyFieldProcessingStep(state, 'field_dress', PLAN).state;
  const skinned = applyFieldProcessingStep(dressed, 'skin', PLAN).state;
  const result = applyFieldProcessingStep(skinned, 'quarter', PLAN);
  assert.equal(result.yields.find((y) => y.itemId === 'meat_bag')?.quantity, 2);
  assert.equal(result.complete, true);
});

test('knife presence and sharpness gate every cut', () => {
  const state = createCarcassProcessingState({ isDino: false });
  assert.equal(canPerformFieldProcessingStep(state, 'field_dress', false, 100).ok, false);
  assert.equal(canPerformFieldProcessingStep(state, 'field_dress', true, 2).ok, false);
  assert.equal(canPerformFieldProcessingStep(state, 'field_dress', true, 100).ok, true);
});

test('quick harvest fade keeps the same yields with shorter timers', () => {
  for (const step of ['field_dress', 'skin', 'butcher', 'quarter'] as const) {
    assert.ok(fieldProcessingDurationMs(step, false) < fieldProcessingDurationMs(step, true));
    assert.ok(FIELD_PROCESSING_STEP_INFO[step].quickMs > 0);
  }
});

test('every harvest yield has a real item definition, weight, and sell value', () => {
  const plan = buildCarcassYieldPlan({
    isDino: true,
    species: 'triceratops',
    drops: [{ itemId: 'dino_meat', quantity: 8 }],
  });
  const all = [
    ...plan.organs,
    ...plan.hide,
    ...plan.prime,
    ...plan.extras,
    ...plan.trophies,
    { itemId: 'meat_bag' as const, quantity: 1, group: 'packaging' as const },
  ];
  for (const y of all) {
    const def = ITEMS[y.itemId];
    assert.ok(def, `missing item definition for ${y.itemId}`);
    assert.ok(def.weightKg !== undefined, `missing weight for ${y.itemId}`);
    assert.ok(def.sellValue !== undefined, `missing sell value for ${y.itemId}`);
    assert.ok(def.description.length > 0, `missing description for ${y.itemId}`);
  }
});

test('trophy parts map to species anatomy', () => {
  assert.equal(trophyItemForSpecies('deer', false), 'antlers');
  assert.equal(trophyItemForSpecies('goat', false), 'horns');
  assert.equal(trophyItemForSpecies('elephant', false), 'tusks');
  assert.equal(trophyItemForSpecies('trex', true), 'teeth_claws');
});
