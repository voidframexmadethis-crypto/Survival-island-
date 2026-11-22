import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BOWLING_BALL_RADIUS,
  BOWLING_BALL_SPEED,
  BOWLING_LANE_LENGTH,
  BOWLING_PIN_HEIGHT,
  BOWLING_PIN_RADIUS,
  BOWLING_STATION_WORLD,
  HilltopBowlingAlley,
} from './hilltopBowling';
import {
  BOWLING_ALLEY_FLOOR_Y,
  BOWLING_ALLEY_POS,
  getHilltopBaseFloorY,
} from '../world/terrain';

test('covered bowling shelter uses real lane, ball and pin dimensions', () => {
  assert.ok(Math.abs(BOWLING_LANE_LENGTH - 18.29) < 1e-9);
  assert.ok(Math.abs(BOWLING_BALL_RADIUS * 2 - 0.216) < 1e-9);
  assert.ok(Math.abs(BOWLING_PIN_RADIUS * 2 - 0.1206) < 1e-9);
  assert.ok(Math.abs(BOWLING_PIN_HEIGHT - 0.381) < 1e-9);
  assert.ok(BOWLING_BALL_SPEED > 7);
});

test('the covered shelter has solid interior and approach floors', () => {
  assert.ok(Math.abs(BOWLING_ALLEY_FLOOR_Y - (8.4 + 0.16)) < 1e-9);
  assert.ok(
    Math.abs(
      getHilltopBaseFloorY(
        BOWLING_STATION_WORLD.x,
        BOWLING_STATION_WORLD.z,
        BOWLING_ALLEY_FLOOR_Y,
      ) - BOWLING_ALLEY_FLOOR_Y,
    ) < 1e-6,
  );
  assert.ok(
    Math.abs(
      getHilltopBaseFloorY(
        BOWLING_ALLEY_POS.x + 11,
        BOWLING_ALLEY_POS.z,
        BOWLING_ALLEY_FLOOR_Y,
      ) - BOWLING_ALLEY_FLOOR_Y,
    ) < 1e-6,
  );
});

test('ten pins stand on the lane and the ball physically knocks them down and resets', () => {
  const alley = new HilltopBowlingAlley();
  let pinMeshes = 0;
  alley.group.traverse((obj) => {
    if (obj.name.startsWith('bowling-pin-')) pinMeshes += 1;
  });
  assert.equal(pinMeshes, 10);
  assert.equal(alley.standingPins, 10);
  assert.equal(alley.rollBall(), true);
  assert.equal(alley.rollBall(), false, 'a second ball cannot launch mid-roll');

  for (let i = 0; i < 1200; i++) alley.update(1 / 120);
  const events = alley.consumeEvents();
  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'pins');
  assert.ok(events[0].knocked >= 1, 'the ball must hit at least the head pin');
  assert.ok(Number.isFinite(events[0].ballMph));
  assert.equal(alley.totalRolls, 1);
  assert.equal(alley.standingPins, 10, 'pins automatically reset for the next roll');
  assert.equal(alley.rollBall(), true);
});

test('bowling interaction is only offered at the sheltered approach', () => {
  const alley = new HilltopBowlingAlley();
  const near = alley.getNearbyInteraction(
    BOWLING_STATION_WORLD.x,
    BOWLING_STATION_WORLD.y,
    BOWLING_STATION_WORLD.z,
  );
  assert.ok(near);
  assert.match(near!.label, /Bowling Ball/i);
  const far = alley.getNearbyInteraction(
    BOWLING_STATION_WORLD.x + 8,
    BOWLING_STATION_WORLD.y,
    BOWLING_STATION_WORLD.z,
  );
  assert.equal(far, null);
  const wrongFloor = alley.getNearbyInteraction(
    BOWLING_STATION_WORLD.x,
    BOWLING_STATION_WORLD.y + 5,
    BOWLING_STATION_WORLD.z,
  );
  assert.equal(wrongFloor, null);
});
