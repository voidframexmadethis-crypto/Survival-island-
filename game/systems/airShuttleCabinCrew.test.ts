import assert from 'node:assert/strict';
import test from 'node:test';
import { AirShuttleCabinCrewSystem, cabinCrewHeadY } from './airShuttleCabinCrew';
import { AIR_SHUTTLE_CABIN, canStandAt } from './airShuttleCabinLayout';

const OPEN_DOORS = { bedroomOpen: true, bathroomOpen: true };

test('cabin crew walk to the galley, serve a plate, and collect it', () => {
  const crew = new AirShuttleCabinCrewSystem();
  const start = crew.getAgentPosition('amara');
  crew.request('coconut_fish_curry', 0.62, 1.85);
  const order = crew.getOrderForAgent('amara');
  assert.ok(order);

  crew.update(0.1);
  const moved = crew.getAgentPosition('amara');
  const step = Math.hypot(moved.x - start.x, moved.z - start.z);
  assert.ok(step > 0, 'the attendant must walk instead of teleporting');
  assert.ok(step < 0.1, 'one simulation step must not jump the whole cabin');

  let plate = null;
  for (let i = 0; i < 260 && !plate; i++) {
    crew.update(0.1);
    plate = crew.getReadyPlate('coconut_fish_curry');
  }
  assert.ok(plate, 'the requested food should be placed on the table');
  assert.ok(Math.abs(plate.tableX - 0.62) < 0.001);
  assert.ok(Math.abs(plate.tableZ - 1.85) < 0.001);

  const eaten = crew.consumePlate(plate.id);
  assert.ok(eaten?.dirty);
  assert.equal(crew.getReadyPlate('coconut_fish_curry'), null);
  assert.equal(crew.collectPlate(plate.id), true);

  for (let i = 0; i < 320; i++) crew.update(0.1);
  assert.equal(crew.getPlates().length, 0, 'the maid should clear the used plate');
  const events = crew.consumeEvents();
  assert.ok(events.some((event) => event.type === 'plate_placed'));
  assert.ok(events.some((event) => event.type === 'plate_collected'));
});

test('two attendants keep separation while moving through the cabin', () => {
  const crew = new AirShuttleCabinCrewSystem();
  crew.request('coconut_fish_curry', 0.62, 1.85, false, 'amara');
  crew.request('coconut', -0.63, 0.45, true, 'celeste');
  for (let i = 0; i < 220; i++) {
    crew.update(0.1);
    const a = crew.getAgentPosition('amara');
    const b = crew.getAgentPosition('celeste');
    assert.ok(
      Math.hypot(a.x - b.x, a.z - b.z) > 0.2,
      'crew should not walk through one another',
    );
    for (const agent of crew.getAgentSnapshots()) {
      assert.equal(
        canStandAt(agent.x, agent.z, OPEN_DOORS, 0.18),
        true,
        `${agent.id} at ${agent.x.toFixed(2)}, ${agent.z.toFixed(2)} is inside cabin geometry`,
      );
    }
  }
  assert.ok(cabinCrewHeadY() < AIR_SHUTTLE_CABIN.ceilingY - 0.6);
});

test('a second request waits for the busy attendant instead of duplicating service', () => {
  const crew = new AirShuttleCabinCrewSystem();
  const first = crew.request('coconut_fish_curry', 0.62, 1.85, false, 'amara');
  const second = crew.request('coconut', -0.63, 0.45, true, 'amara');
  assert.notEqual(first.id, second.id);
  assert.equal(crew.getPlates().length, 0);
  for (let i = 0; i < 320; i++) crew.update(0.1);
  assert.ok(crew.getPlates().length >= 1, 'service should eventually complete');
});
