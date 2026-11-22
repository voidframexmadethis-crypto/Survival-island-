import assert from 'node:assert/strict';
import test from 'node:test';
import { buildTransitCauseway } from './transitCauseway';

test('Mississippi river bridge builds a light, static bridge without spawning cars', () => {
  const causeway = buildTransitCauseway();
  assert.equal(causeway.group.name, 'mississippi-river-bridge');
  assert.ok(causeway.length > 170);
  assert.ok(causeway.group.children.length > 60);
  assert.equal(
    causeway.group.children.some((child) => child.name.toLowerCase().includes('car')),
    false,
  );
  assert.equal(causeway.gatewayPos.z, 1430);
  assert.equal(causeway.islandPos.z, 1430);
});
