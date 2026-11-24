import type { FirearmSoundProfile } from '../types';

/**
 * Per-firearm particle signature. Real guns do not share one muzzle flash:
 * a short-barrelled pistol burns fast and small, a pump shotgun throws a wide
 * orange plume and a lot of powder smoke, and a black-powder musket makes a
 * thick white cloud that hangs in the air.
 */
export interface GunParticleProfile {
  flashColor: number;
  /** Base radius of the flash sprite / blast cone. */
  flashSize: number;
  /** Forward length of the blast cone. */
  flashLength: number;
  flashLife: number;
  lightIntensity: number;

  smokeColor: number;
  smokePuffs: number;
  smokeOpacity: number;
  smokeLife: number;
  smokeScale: number;
  /** Slow barrel smoke that keeps drifting after the shot. */
  barrelSmokePuffs: number;

  sparkColor: number;
  sparkCount: number;
  sparkSpeed: number;
  sparkLife: number;
  sparkSize: number;

  casing: 'pistol' | 'rifle' | 'shotgun' | 'none';
  casingColor: number;
  casingRadius: number;
  casingLength: number;
  /** Sideways ejection speed. */
  casingSpeed: number;
}

export const GUN_PARTICLE_PROFILES: Record<
  FirearmSoundProfile,
  GunParticleProfile
> = {
  pistol: {
    flashColor: 0xffe08a,
    flashSize: 0.7,
    flashLength: 1.1,
    flashLife: 0.065,
    lightIntensity: 12,
    smokeColor: 0xd7d2c8,
    smokePuffs: 4,
    smokeOpacity: 0.44,
    smokeLife: 1.05,
    smokeScale: 0.2,
    barrelSmokePuffs: 1,
    sparkColor: 0xffbe3d,
    sparkCount: 8,
    sparkSpeed: 8,
    sparkLife: 0.3,
    sparkSize: 0.55,
    casing: 'pistol',
    casingColor: 0xd6a43a,
    casingRadius: 0.014,
    casingLength: 0.048,
    casingSpeed: 2.6,
  },
  smg: {
    flashColor: 0xfde68a,
    flashSize: 0.6,
    flashLength: 0.95,
    flashLife: 0.055,
    lightIntensity: 11,
    smokeColor: 0xcfcac1,
    smokePuffs: 3,
    smokeOpacity: 0.36,
    smokeLife: 0.85,
    smokeScale: 0.17,
    barrelSmokePuffs: 1,
    sparkColor: 0xfbbf24,
    sparkCount: 6,
    sparkSpeed: 9,
    sparkLife: 0.24,
    sparkSize: 0.46,
    casing: 'pistol',
    casingColor: 0xc99a35,
    casingRadius: 0.013,
    casingLength: 0.044,
    casingSpeed: 3.1,
  },
  rifle: {
    flashColor: 0xfff0c2,
    flashSize: 1.0,
    flashLength: 1.7,
    flashLife: 0.07,
    lightIntensity: 18,
    smokeColor: 0xd6d3ce,
    smokePuffs: 6,
    smokeOpacity: 0.46,
    smokeLife: 1.2,
    smokeScale: 0.24,
    barrelSmokePuffs: 2,
    sparkColor: 0xffc047,
    sparkCount: 12,
    sparkSpeed: 12,
    sparkLife: 0.34,
    sparkSize: 0.52,
    casing: 'rifle',
    casingColor: 0xd4a63a,
    casingRadius: 0.013,
    casingLength: 0.07,
    casingSpeed: 3.6,
  },
  sniper: {
    flashColor: 0xfff4cf,
    flashSize: 1.15,
    flashLength: 2.0,
    flashLife: 0.075,
    lightIntensity: 21,
    smokeColor: 0xd8d4cd,
    smokePuffs: 7,
    smokeOpacity: 0.5,
    smokeLife: 1.35,
    smokeScale: 0.27,
    barrelSmokePuffs: 3,
    sparkColor: 0xffd27a,
    sparkCount: 14,
    sparkSpeed: 14,
    sparkLife: 0.38,
    sparkSize: 0.56,
    casing: 'rifle',
    casingColor: 0xd9ad42,
    casingRadius: 0.014,
    casingLength: 0.082,
    casingSpeed: 4.0,
  },
  shotgun: {
    flashColor: 0xffab4d,
    flashSize: 1.5,
    flashLength: 2.2,
    flashLife: 0.095,
    lightIntensity: 23,
    smokeColor: 0xc9c4bb,
    smokePuffs: 10,
    smokeOpacity: 0.6,
    smokeLife: 1.8,
    smokeScale: 0.32,
    barrelSmokePuffs: 3,
    sparkColor: 0xff9f2e,
    sparkCount: 18,
    sparkSpeed: 10,
    sparkLife: 0.42,
    sparkSize: 0.62,
    casing: 'shotgun',
    casingColor: 0xb91c1c,
    casingRadius: 0.019,
    casingLength: 0.062,
    casingSpeed: 2.2,
  },
  lmg: {
    flashColor: 0xffefb8,
    flashSize: 1.1,
    flashLength: 1.85,
    flashLife: 0.065,
    lightIntensity: 19,
    smokeColor: 0xd0ccc4,
    smokePuffs: 7,
    smokeOpacity: 0.48,
    smokeLife: 1.25,
    smokeScale: 0.26,
    barrelSmokePuffs: 2,
    sparkColor: 0xffb84d,
    sparkCount: 13,
    sparkSpeed: 13,
    sparkLife: 0.34,
    sparkSize: 0.54,
    casing: 'rifle',
    casingColor: 0xd2a33a,
    casingRadius: 0.014,
    casingLength: 0.062,
    casingSpeed: 4.1,
  },
  musket: {
    flashColor: 0xffb85c,
    flashSize: 1.25,
    flashLength: 1.8,
    flashLife: 0.12,
    lightIntensity: 20,
    smokeColor: 0xe8e4dc,
    smokePuffs: 14,
    smokeOpacity: 0.72,
    smokeLife: 2.4,
    smokeScale: 0.38,
    barrelSmokePuffs: 5,
    sparkColor: 0xff8a3d,
    sparkCount: 7,
    sparkSpeed: 6,
    sparkLife: 0.5,
    sparkSize: 0.6,
    casing: 'none',
    casingColor: 0xb08d57,
    casingRadius: 0.015,
    casingLength: 0.05,
    casingSpeed: 0,
  },
  plasma: {
    flashColor: 0x8ee8ff,
    flashSize: 0.85,
    flashLength: 1.35,
    flashLife: 0.11,
    lightIntensity: 16,
    smokeColor: 0x9bd8e8,
    smokePuffs: 5,
    smokeOpacity: 0.4,
    smokeLife: 1.0,
    smokeScale: 0.22,
    barrelSmokePuffs: 1,
    sparkColor: 0x67e8f9,
    sparkCount: 16,
    sparkSpeed: 11,
    sparkLife: 0.4,
    sparkSize: 0.6,
    casing: 'none',
    casingColor: 0x67e8f9,
    casingRadius: 0.014,
    casingLength: 0.05,
    casingSpeed: 0,
  },
};

export function resolveGunParticleProfile(
  soundProfile: FirearmSoundProfile,
): GunParticleProfile {
  return GUN_PARTICLE_PROFILES[soundProfile] ?? GUN_PARTICLE_PROFILES.pistol;
}
