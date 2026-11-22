import assert from 'node:assert/strict';
import test from 'node:test';
import { buildTransitCauseway } from './transitCauseway';
import { setActiveTerrainWorldType } from './terrain';

test('transit causeway builds a light, static bridge without spawning cars', () => {
  setActiveTerrainWorldType('island');
  const causeway = buildTransitCauseway();
  assert.equal(causeway.group.name, 'island-mainland-causeway');
  assert.ok(causeway.length > 170);
  assert.ok(causeway.group.children.length > 60);
  assert.equal(
    causeway.group.children.some((child) => child.name.toLowerCase().includes('car')),
    false,
  );
  assert.equal(causeway.gatewayPos.z, 520);
  assert.equal(causeway.islandPos.z, 650);
});
