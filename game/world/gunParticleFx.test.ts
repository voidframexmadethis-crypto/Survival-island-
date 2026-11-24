import assert from 'node:assert/strict';
import test from 'node:test';
import {
  GUN_PARTICLE_PROFILES,
  resolveGunParticleProfile,
} from './gunParticleFx';

test('every firearm sound profile has a distinct particle signature', () => {
  const profiles = Object.values(GUN_PARTICLE_PROFILES);
  assert.equal(profiles.length, 8);
  for (const profile of profiles) {
    assert.ok(profile.flashSize > 0);
    assert.ok(profile.flashLength >= profile.flashSize * 0.9);
    assert.ok(profile.flashLife > 0 && profile.flashLife < 0.2);
    assert.ok(profile.smokePuffs > 0);
    assert.ok(profile.sparkCount > 0);
    assert.ok(profile.casingRadius > 0 && profile.casingLength > 0);
  }
  assert.equal(
    new Set(profiles.map((p) => `${p.flashSize}|${p.smokePuffs}|${p.sparkCount}`))
      .size,
    profiles.length,
  );
});

test('shotgun and musket effects are heavier than a pistol', () => {
  const pistol = GUN_PARTICLE_PROFILES.pistol;
  const shotgun = GUN_PARTICLE_PROFILES.shotgun;
  const musket = GUN_PARTICLE_PROFILES.musket;

  assert.ok(shotgun.flashSize > pistol.flashSize * 1.8);
  assert.ok(shotgun.flashLength > pistol.flashLength * 1.8);
  assert.ok(shotgun.smokePuffs > pistol.smokePuffs * 2);
  assert.ok(shotgun.sparkCount > pistol.sparkCount);
  assert.ok(shotgun.casingRadius > pistol.casingRadius);

  assert.ok(musket.smokePuffs > shotgun.smokePuffs);
  assert.ok(musket.smokeLife > shotgun.smokeLife);
  assert.ok(musket.smokeOpacity > shotgun.smokeOpacity);
  assert.equal(musket.casing, 'none');
  assert.equal(GUN_PARTICLE_PROFILES.plasma.casing, 'none');
});

test('casings match the real cartridge type', () => {
  assert.equal(GUN_PARTICLE_PROFILES.pistol.casing, 'pistol');
  assert.equal(GUN_PARTICLE_PROFILES.smg.casing, 'pistol');
  assert.equal(GUN_PARTICLE_PROFILES.rifle.casing, 'rifle');
  assert.equal(GUN_PARTICLE_PROFILES.sniper.casing, 'rifle');
  assert.equal(GUN_PARTICLE_PROFILES.lmg.casing, 'rifle');
  assert.equal(GUN_PARTICLE_PROFILES.shotgun.casing, 'shotgun');
  // A 12-gauge plastic hull is fatter and red, not brass.
  assert.ok(
    GUN_PARTICLE_PROFILES.shotgun.casingRadius >
      GUN_PARTICLE_PROFILES.rifle.casingRadius * 1.3,
  );
  assert.notEqual(
    GUN_PARTICLE_PROFILES.shotgun.casingColor,
    GUN_PARTICLE_PROFILES.rifle.casingColor,
  );
});

test('unknown profiles fall back to pistol rather than throwing', () => {
  assert.equal(
    resolveGunParticleProfile('pistol'),
    GUN_PARTICLE_PROFILES.pistol,
  );
  assert.equal(
    resolveGunParticleProfile(
      'unknown' as unknown as keyof typeof GUN_PARTICLE_PROFILES,
    ),
    GUN_PARTICLE_PROFILES.pistol,
  );
});
