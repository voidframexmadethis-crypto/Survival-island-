import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
  GLOBAL_WILDLIFE_ROSTER,
  MAX_WILDLIFE_DENSITY_AGENTS,
  getRosterRegionSpecies,
  getRosterSpawnCandidates,
  normalizeWildlifeDensity,
  wildlifeDensityAgentCap,
} from '../world/globalWildlifeRoster';
import {
  GLOBAL_WILDLIFE_ARCHETYPES,
  getGlobalWildlifeGeometry,
} from '../world/globalWildlifeModels';
import {
  GlobalWildlifeSystem,
  computeWildlifeLod,
  getWildlifeSpeciesColor,
  wildlifeFearRadius,
} from './globalWildlifeSystem';
import { getWildAnimalFleeRadius } from './creatureSystem';

test('global wildlife roster contains unique, fully specified species across every region', () => {
  assert.ok(GLOBAL_WILDLIFE_ROSTER.length >= 180);
  const ids = new Set<string>();
  for (const entry of GLOBAL_WILDLIFE_ROSTER) {
    assert.ok(entry.id.length > 0);
    assert.ok(entry.name.length > 0);
    assert.ok(!ids.has(entry.id), `duplicate roster id: ${entry.id}`);
    ids.add(entry.id);
    assert.ok(entry.scale > 0);
    assert.ok(entry.biomes.length > 0, `${entry.id} has no habitat`);
    assert.ok(GLOBAL_WILDLIFE_ARCHETYPES.includes(entry.archetype));
  }

  const regions = [
    'north_america',
    'arctic',
    'south_america',
    'europe',
    'africa',
    'asia',
    'australia',
    'antarctica',
    'urban',
    'ocean',
  ] as const;
  for (const region of regions) {
    assert.ok(getRosterRegionSpecies(region).length > 0, `${region} has no wildlife`);
  }
});

test('biome spawning picks native animals and gates urban wildlife to settlements', () => {
  const jungle: string[] = getRosterSpawnCandidates('jungle').map((entry) => entry.id);
  assert.ok(jungle.includes('jaguar'));
  assert.ok(jungle.includes('green_anaconda'));
  assert.ok(!jungle.includes('polar_bear'));

  const arctic: string[] = getRosterSpawnCandidates('snowy_plains').map((entry) => entry.id);
  assert.ok(arctic.includes('snowy_owl'));
  assert.ok(arctic.includes('emperor_penguin'));

  assert.ok(!getRosterSpawnCandidates('plains').some((entry) => entry.urban));
  const urban = getRosterSpawnCandidates('plains', { nearUrban: true });
  assert.ok(urban.some((entry) => entry.urban && entry.id === 'rock_pigeon'));
});

test('aquatic and aerial roster entries carry appropriate movement flags', () => {
  const whale = GLOBAL_WILDLIFE_ROSTER.find((entry) => entry.id === 'blue_whale');
  assert.equal(whale?.aquatic, true);
  assert.equal(whale?.aerial, false);
  assert.ok(whale?.biomes.includes('ocean'));
  const harpy = GLOBAL_WILDLIFE_ROSTER.find((entry) => entry.id === 'harpy_eagle');
  assert.equal(harpy?.aerial, true);
  assert.equal(harpy?.aquatic, false);
});

test('wildlife density maps continuously from off to the pooled agent cap', () => {
  assert.equal(wildlifeDensityAgentCap(0), 0);
  assert.equal(wildlifeDensityAgentCap(1), MAX_WILDLIFE_DENSITY_AGENTS);
  assert.ok(wildlifeDensityAgentCap(0.5) > 0);
  assert.ok(wildlifeDensityAgentCap(0.5) < wildlifeDensityAgentCap(1));
  assert.ok(wildlifeDensityAgentCap(1, true) < MAX_WILDLIFE_DENSITY_AGENTS);
  assert.equal(normalizeWildlifeDensity(-2), 0);
  assert.equal(normalizeWildlifeDensity(4), 1);
  assert.equal(normalizeWildlifeDensity('nope'), 0.75);
});

test('wildlife LOD culls and switches to the low-poly batch at distance', () => {
  assert.equal(computeWildlifeLod(10), 'near');
  assert.equal(computeWildlifeLod(75), 'far');
  assert.equal(computeWildlifeLod(200), 'culled');
});

test('player proximity frightens passive, neutral and urban wildlife but not predators', () => {
  const passive = GLOBAL_WILDLIFE_ROSTER.find((entry) => entry.id === 'white_tailed_deer')!;
  const predator = GLOBAL_WILDLIFE_ROSTER.find((entry) => entry.id === 'jaguar')!;
  const neutral = GLOBAL_WILDLIFE_ROSTER.find((entry) => entry.id === 'elk')!;
  const pigeon = GLOBAL_WILDLIFE_ROSTER.find((entry) => entry.id === 'rock_pigeon')!;

  assert.equal(wildlifeFearRadius(predator), 0);
  assert.ok(wildlifeFearRadius(passive) > 0);
  assert.ok(wildlifeFearRadius(neutral) > 0);
  assert.ok(wildlifeFearRadius(pigeon) > 0);
  assert.ok(
    wildlifeFearRadius(passive, { sprinting: true }) >
      wildlifeFearRadius(passive, { crouching: true }),
  );
});

test('interactive creature fear radius now covers every non-predator temperament', () => {
  assert.equal(getWildAnimalFleeRadius('apex_predator'), 0);
  assert.equal(getWildAnimalFleeRadius('pack_predator'), 0);
  assert.equal(getWildAnimalFleeRadius('domestic_calm'), 0);
  assert.ok(getWildAnimalFleeRadius('timid_herbivore') > 0);
  assert.ok(getWildAnimalFleeRadius('defensive_herbivore') > 0);
  assert.ok(getWildAnimalFleeRadius('aquatic_school') > 0);
  assert.ok(getWildAnimalFleeRadius('aerial_ambient') > 0);
  assert.ok(
    getWildAnimalFleeRadius('timid_herbivore', { sprinting: true }) >
      getWildAnimalFleeRadius('timid_herbivore', { crouching: true }),
  );
});

test('every archetype has valid pooled near and far geometry', () => {
  for (const archetype of GLOBAL_WILDLIFE_ARCHETYPES) {
    const near = getGlobalWildlifeGeometry(archetype, 'near');
    const far = getGlobalWildlifeGeometry(archetype, 'far');
    assert.ok((near.getAttribute('position')?.count ?? 0) > 0, `${archetype} near is empty`);
    assert.ok((far.getAttribute('position')?.count ?? 0) > 0, `${archetype} far is empty`);
    assert.ok(near.boundingSphere, `${archetype} near has no bounds`);
    assert.ok(far.boundingSphere, `${archetype} far has no bounds`);
  }
});

test('instanced archetype geometry is shared and far LOD is lighter than near LOD', () => {
  const near = getGlobalWildlifeGeometry('quadruped', 'near');
  const nearAgain = getGlobalWildlifeGeometry('quadruped', 'near');
  const far = getGlobalWildlifeGeometry('quadruped', 'far');
  assert.equal(near, nearAgain);
  assert.notEqual(near, far);
  assert.ok((near.index?.count ?? 0) > 0);
  assert.ok((near.index?.count ?? 0) > (far.index?.count ?? 0));
});

test('instanced wildlife runtime spawns, pools and shuts off with density', () => {
  const scene = new THREE.Scene();
  const system = new GlobalWildlifeSystem(scene);
  system.setDensity(1);
  let result = { active: 0, species: 0 };
  for (let i = 0; i < 80; i++) {
    result = system.update(0.1, i * 0.1, -44, 96, { sprinting: true });
  }
  assert.ok(result.active > 0, 'wildlife should spawn around the player');
  assert.ok(result.species > 0, 'spawned wildlife should include named species');
  assert.ok(
    scene.children.some(
      (child) => child instanceof THREE.InstancedMesh && child.visible && child.count > 0,
    ),
    'at least one instanced wildlife batch should be visible',
  );

  system.setDensity(0);
  result = system.update(0.1, 100, -44, 96);
  assert.equal(result.active, 0);
  assert.ok(
    scene.children.every(
      (child) => !(child instanceof THREE.InstancedMesh) || child.count === 0,
    ),
    'density zero should hide and empty every wildlife batch',
  );
  system.dispose();
  assert.equal(scene.children.length, 0);
});

test('species colors are deterministic and varied', () => {
  const a = GLOBAL_WILDLIFE_ROSTER.find((entry) => entry.id === 'scarlet_macaw')!;
  const b = GLOBAL_WILDLIFE_ROSTER.find((entry) => entry.id === 'blue_tang')!;
  const colorA = getWildlifeSpeciesColor(a);
  const colorAgain = getWildlifeSpeciesColor(a);
  assert.equal(colorA, colorAgain);
  assert.notEqual(colorA.getHex(), getWildlifeSpeciesColor(b).getHex());
});
