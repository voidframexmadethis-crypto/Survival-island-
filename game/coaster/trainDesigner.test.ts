import assert from 'node:assert/strict';
import test from 'node:test';
import {
  LocalProceduralTrainProvider,
  TrainDesignService,
  describeTrain,
  trainDesignFromPrompt,
  validateTrainDesign,
} from './trainDesigner';

const PROMPT =
  'Generate a realistic four-car steel roller coaster train with black and red seats, exposed wheel assemblies, aerodynamic bodywork, and individual lap-bar restraints.';

test('prompt parsing builds the requested train specification', () => {
  const design = trainDesignFromPrompt(PROMPT);
  assert.equal(design.cars, 4);
  assert.equal(design.bodyStyle, 'steel');
  assert.equal(design.restraint, 'lap_bar');
  assert.equal(design.wheels, 'exposed');
  assert.equal(design.aeroFairing, true);
  assert.equal(design.primaryColor, '#15171c');
  assert.equal(design.secondaryColor, '#d81f26');
  assert.ok(design.notes.some((note) => note.includes('4-car')));
  assert.ok(design.notes.some((note) => note.includes('Exposed')));
  assert.ok(describeTrain(design).includes('4 cars'));
});

test('seat, restraint, wood and lighting details parse', () => {
  const design = trainDesignFromPrompt(
    'A six-car wooden coaster train, twelve across, three rows, over-the-shoulder harnesses, covered wheels, brown and green paint, LED lighting',
  );
  assert.equal(design.cars, 6);
  assert.equal(design.seatsPerRow, 12);
  assert.equal(design.rowsPerCar, 3);
  assert.equal(design.bodyStyle, 'wood');
  assert.equal(design.restraint, 'otsr');
  assert.equal(design.wheels, 'covered');
  assert.equal(design.lighting, true);
  assert.equal(design.primaryColor, '#6b4a2f');
});

test('the same prompt produces a deterministic design', () => {
  const a = trainDesignFromPrompt(PROMPT);
  const b = trainDesignFromPrompt(PROMPT);
  assert.equal(a.id, b.id);
  assert.equal(a.name, b.name);
  assert.deepEqual(a.notes, b.notes);
});

test('local service is explicit about being procedural, not AI', async () => {
  const service = new TrainDesignService();
  assert.equal(service.isExternal, false);
  assert.match(service.providerLabel, /procedural/i);
  assert.ok(service.provider instanceof LocalProceduralTrainProvider);
  const design = await service.generate(PROMPT);
  assert.equal(design.cars, 4);
});

test('validation clamps hostile or missing fields', () => {
  const design = validateTrainDesign({
    ...trainDesignFromPrompt('steel train'),
    cars: 999,
    seatsPerRow: -4,
    primaryColor: 'not-a-color',
    restraint: 'invalid' as never,
  });
  assert.equal(design.cars, 12);
  assert.equal(design.seatsPerRow, 1);
  assert.match(design.primaryColor, /^#[0-9a-f]{6}$/i);
  assert.equal(design.restraint, 'lap_bar');
});
