/**
 * Per-vehicle tuning for the old-school cabin stereo.
 *
 * The trunk stereo is built from four audible bass bands plus a body
 * resonance, exactly like a real multi-way car system:
 *
 *   30-60 Hz   subwoofer (the weight you feel in the seat)
 *   60-100 Hz  low bass (the chest hit)
 *   100-160 Hz punch / mid-bass (the kick you hear in the doors)
 *   160+ Hz    controlled harmonics of the above, for phone speakers
 *
 * `bodyHz` is the sheet-metal/cabin resonance that makes panels buzz. It sits
 * on top of the bands, and the rattle mix below decides which panel talks.
 */

export interface RadioCarLike {
  id?: string;
  name?: string;
  class?: string;
  style?: string;
  preset?: string;
  hasTrunkBass?: boolean;
}

export interface TrunkRattleCharacter {
  /** 0..1.5 overall rattle energy. */
  intensity: number;
  /** 0..1: dull trunk thud through bright plate buzz. */
  brightness: number;
  /** 0.6..1.4: shorter/longer sheet-metal ring. */
  decay: number;
  /** Per-panel balance, 0..1.5. */
  lid: number;
  plate: number;
  deck: number;
  quarter: number;
  trim: number;
}

export interface CarCabinAudioTuning {
  id: string;
  label: string;
  /** Speaker package shown on the radio deck. */
  speakers: string;

  /** 30-60 Hz subwoofer band. */
  subHz: number;
  subDb: number;
  /** 60-100 Hz low-bass band. */
  lowHz: number;
  lowDb: number;
  /** 100-160 Hz punch band. */
  midHz: number;
  midDb: number;

  /** Sheet-metal body resonance and broad bass shelf. */
  bodyHz: number;
  bodyDb: number;
  bodyQ: number;
  shelfDb: number;

  /** Harmonic exciter mix, 0..1. Keeps deep bass audible on phone speakers. */
  harmonics: number;

  /** Cabin-only low end while the player is seated inside. */
  cabinBoost: number;
  /** Stylised in-game SPL showcase rating (not a real measurement). */
  splDb: number;
  /** Visible body movement multiplier. */
  shake: number;

  rattle: TrunkRattleCharacter;
}

function tuning(
  value: Omit<CarCabinAudioTuning, 'rattle'> & {
    rattle: TrunkRattleCharacter;
  },
): CarCabinAudioTuning {
  return value;
}

const CLEAN_RATTLE: TrunkRattleCharacter = {
  intensity: 0,
  brightness: 0.3,
  decay: 0.8,
  lid: 0,
  plate: 0,
  deck: 0,
  quarter: 0,
  trim: 0,
};

/**
 * One entry per old-school build. Shared platforms (all DONK builds are the
 * Box Chevy DONK) resolve to the same tuning; distinct bodies get distinct
 * crossover points, resonance and rattle mixes.
 */
export const VEHICLE_AUDIO_TUNINGS: Record<string, CarCabinAudioTuning> = {
  donk: tuning({
    id: 'donk',
    label: 'Box Chevy DONK',
    speakers: '4× 15" subs · 6× 6.5" mids · 2× horns',
    subHz: 38,
    subDb: 7,
    lowHz: 72,
    lowDb: 6,
    midHz: 148,
    midDb: 4,
    bodyHz: 52,
    bodyDb: 5,
    bodyQ: 1.35,
    shelfDb: 12,
    harmonics: 0.5,
    cabinBoost: 48,
    splDb: 182,
    shake: 1.8,
    rattle: {
      intensity: 1.45,
      brightness: 0.72,
      decay: 1.25,
      lid: 1.1,
      plate: 1.25,
      deck: 1,
      quarter: 1.5,
      trim: 0.9,
    },
  }),
  cadillac_coupe_deville: tuning({
    id: 'cadillac_coupe_deville',
    label: 'Cadillac Coupe DeVille',
    speakers: '4× 6×9 rear deck · 2× 10" subs · 2× dash tweets',
    subHz: 46,
    subDb: 5,
    lowHz: 80,
    lowDb: 4.5,
    midHz: 134,
    midDb: 2.5,
    bodyHz: 58,
    bodyDb: 3,
    bodyQ: 1.6,
    shelfDb: 7,
    harmonics: 0.36,
    cabinBoost: 22,
    splDb: 171,
    shake: 0.12,
    rattle: {
      intensity: 0.55,
      brightness: 0.38,
      decay: 0.9,
      lid: 0.7,
      plate: 0.55,
      deck: 0.5,
      quarter: 0.7,
      trim: 0.45,
    },
  }),
  chevy_tahoe: tuning({
    id: 'chevy_tahoe',
    label: 'Chevy Tahoe',
    speakers: '4× 12" subs · 8× 6.5" · 2× 1" tweets',
    subHz: 42,
    subDb: 6,
    lowHz: 76,
    lowDb: 5,
    midHz: 140,
    midDb: 3.5,
    bodyHz: 64,
    bodyDb: 4.5,
    bodyQ: 1.25,
    shelfDb: 10,
    harmonics: 0.45,
    cabinBoost: 30,
    splDb: 176,
    shake: 1.0,
    rattle: {
      intensity: 1.1,
      brightness: 0.6,
      decay: 1.1,
      lid: 1.2,
      plate: 0.8,
      deck: 1.3,
      quarter: 0.8,
      trim: 1,
    },
  }),
  lowrider: tuning({
    id: 'lowrider',
    label: 'Full-Size Lowrider',
    speakers: '2× 12" subs · 4× 5.25" · 2× 6×9',
    subHz: 48,
    subDb: 5,
    lowHz: 82,
    lowDb: 4,
    midHz: 128,
    midDb: 2.8,
    bodyHz: 70,
    bodyDb: 3,
    bodyQ: 1.5,
    shelfDb: 6,
    harmonics: 0.35,
    cabinBoost: 20,
    splDb: 168,
    shake: 0.08,
    rattle: {
      intensity: 0.35,
      brightness: 0.3,
      decay: 0.8,
      lid: 0.5,
      plate: 0.4,
      deck: 0.4,
      quarter: 0.55,
      trim: 0.3,
    },
  }),
  slab: tuning({
    id: 'slab',
    label: 'Louisiana SLAB',
    speakers: '2× 15" subs · 4× 6.5" · 2× 6×9',
    subHz: 44,
    subDb: 5.5,
    lowHz: 78,
    lowDb: 4.2,
    midHz: 124,
    midDb: 3,
    bodyHz: 66,
    bodyDb: 3.2,
    bodyQ: 1.4,
    shelfDb: 7,
    harmonics: 0.4,
    cabinBoost: 18,
    splDb: 166,
    shake: 0.16,
    rattle: {
      intensity: 0.75,
      brightness: 0.45,
      decay: 0.95,
      lid: 0.8,
      plate: 1,
      deck: 0.7,
      quarter: 0.9,
      trim: 0.7,
    },
  }),
  el_camino: tuning({
    id: 'el_camino',
    label: 'El Camino',
    speakers: '2× 10" subs · 2× 6×9 bed pods',
    subHz: 54,
    subDb: 4,
    lowHz: 90,
    lowDb: 3.2,
    midHz: 120,
    midDb: 2.2,
    bodyHz: 92,
    bodyDb: 2.2,
    bodyQ: 1.8,
    shelfDb: 5,
    harmonics: 0.32,
    cabinBoost: 12,
    splDb: 158,
    shake: 0.2,
    rattle: {
      intensity: 0.9,
      brightness: 0.55,
      decay: 1.0,
      lid: 0.5,
      plate: 1.1,
      deck: 1.2,
      quarter: 0.9,
      trim: 0.6,
    },
  }),
  town_car: tuning({
    id: 'town_car',
    label: 'Lincoln Town Car',
    speakers: '4× 5×7 · 2× 8" subs · dash tweets',
    subHz: 46,
    subDb: 4,
    lowHz: 84,
    lowDb: 3.2,
    midHz: 130,
    midDb: 2,
    bodyHz: 60,
    bodyDb: 2.2,
    bodyQ: 1.5,
    shelfDb: 4,
    harmonics: 0.3,
    cabinBoost: 14,
    splDb: 156,
    shake: 0.1,
    rattle: {
      intensity: 0.4,
      brightness: 0.32,
      decay: 0.85,
      lid: 0.6,
      plate: 0.5,
      deck: 0.5,
      quarter: 0.4,
      trim: 0.5,
    },
  }),
  mini_truck: tuning({
    id: 'mini_truck',
    label: 'Mini Truck',
    speakers: '2× 8" subs · 4× 4" · 2× 6×9',
    subHz: 58,
    subDb: 3.4,
    lowHz: 96,
    lowDb: 2.8,
    midHz: 118,
    midDb: 1.8,
    bodyHz: 98,
    bodyDb: 2.2,
    bodyQ: 1.9,
    shelfDb: 3,
    harmonics: 0.3,
    cabinBoost: 9,
    splDb: 150,
    shake: 0.25,
    rattle: {
      intensity: 0.85,
      brightness: 0.6,
      decay: 0.9,
      lid: 1.2,
      plate: 1.2,
      deck: 1.1,
      quarter: 0.7,
      trim: 0.9,
    },
  }),
  van_90s: tuning({
    id: 'van_90s',
    label: '90s Van',
    speakers: '2× 12" subs · 4× 6" · 2× 6×9',
    subHz: 50,
    subDb: 4.5,
    lowHz: 88,
    lowDb: 3.6,
    midHz: 126,
    midDb: 2.4,
    bodyHz: 74,
    bodyDb: 2.8,
    bodyQ: 1.6,
    shelfDb: 5,
    harmonics: 0.36,
    cabinBoost: 16,
    splDb: 160,
    shake: 0.3,
    rattle: {
      intensity: 1.0,
      brightness: 0.5,
      decay: 1.05,
      lid: 0.8,
      plate: 0.9,
      deck: 1.2,
      quarter: 1,
      trim: 1.1,
    },
  }),
  classic: tuning({
    id: 'classic',
    label: 'Classic Car',
    speakers: '2× 10" subs · 4× 5.25" · 2× 6×9',
    subHz: 52,
    subDb: 3.6,
    lowHz: 92,
    lowDb: 3,
    midHz: 126,
    midDb: 2,
    bodyHz: 78,
    bodyDb: 2.4,
    bodyQ: 1.55,
    shelfDb: 4,
    harmonics: 0.32,
    cabinBoost: 10,
    splDb: 150,
    shake: 0.45,
    rattle: {
      intensity: 0.6,
      brightness: 0.4,
      decay: 0.9,
      lid: 0.8,
      plate: 0.7,
      deck: 0.7,
      quarter: 0.6,
      trim: 0.6,
    },
  }),
  modern: tuning({
    id: 'modern',
    label: 'Factory Stereo',
    speakers: 'Factory 8-speaker system',
    subHz: 55,
    subDb: 1.2,
    lowHz: 90,
    lowDb: 1,
    midHz: 130,
    midDb: 0.8,
    bodyHz: 82,
    bodyDb: 0,
    bodyQ: 1.2,
    shelfDb: 0,
    harmonics: 0.12,
    cabinBoost: 1,
    splDb: 108,
    shake: 0.1,
    rattle: CLEAN_RATTLE,
  }),
};

const PRESET_TO_TUNING: Record<string, string> = {
  donk: 'donk',
  box_chevy_donk: 'donk',
  chevy_donk: 'donk',
  cadillac_coupe_deville: 'cadillac_coupe_deville',
  deville: 'cadillac_coupe_deville',
  chevy_tahoe: 'chevy_tahoe',
  chevy_2000_sub: 'chevy_tahoe',
  tahoe: 'chevy_tahoe',
  lowrider: 'lowrider',
  slab: 'slab',
  el_camino: 'el_camino',
  town_car: 'town_car',
  mini_truck: 'mini_truck',
  van_90s: 'van_90s',
};

const RATTLE_LABELS: Record<string, string> = {
  donk: 'DONK',
  cadillac_coupe_deville: 'DEVILLE',
  chevy_tahoe: 'TAHOE',
  lowrider: 'LOWRIDER',
  slab: 'SLAB',
  el_camino: 'EL CAMINO',
  town_car: 'TOWN CAR',
  mini_truck: 'MINI TRUCK',
  van_90s: 'VAN',
  classic: 'CLASSIC',
  modern: 'FACTORY',
};

export function isOldSchoolCarLike(car: RadioCarLike = {}): boolean {
  const preset = (car.preset || '').toLowerCase();
  if (PRESET_TO_TUNING[preset]) return true;
  const tag = `${car.class || ''} ${car.style || ''} ${car.name || ''}`.toLowerCase();
  if (
    tag.includes('modern exotic') ||
    tag.includes('modern hypercar') ||
    tag.includes('ultra rare') ||
    tag.includes('supercar') ||
    tag.includes('mclaren')
  ) {
    return false;
  }
  return (
    car.hasTrunkBass === true ||
    tag.includes('old school') ||
    tag.includes('old-school') ||
    tag.includes('classic') ||
    tag.includes('slab') ||
    tag.includes('donk') ||
    tag.includes('lowrider') ||
    tag.includes('impala') ||
    tag.includes('chevy') ||
    tag.includes('tahoe') ||
    tag.includes('cadillac') ||
    tag.includes('deville') ||
    tag.includes('el camino') ||
    tag.includes('town car') ||
    tag.includes('mini truck')
  );
}

/**
 * Resolve the cabin tuning for a vehicle. Explicit presets win, then the body
 * style/name tags, then a neutral factory tuning for modern cars.
 */
export function resolveCarAudioTuning(
  car: RadioCarLike = {},
): CarCabinAudioTuning {
  const preset = (car.preset || '').toLowerCase();
  const direct = PRESET_TO_TUNING[preset];
  if (direct) return VEHICLE_AUDIO_TUNINGS[direct];

  const tag = `${car.class || ''} ${car.style || ''} ${car.name || ''}`.toLowerCase();
  if (tag.includes('donk')) return VEHICLE_AUDIO_TUNINGS.donk;
  if (
    tag.includes('cadillac') ||
    tag.includes('deville') ||
    tag.includes('coupe deville')
  ) {
    return VEHICLE_AUDIO_TUNINGS.cadillac_coupe_deville;
  }
  if (tag.includes('tahoe') || tag.includes('savage life')) {
    return VEHICLE_AUDIO_TUNINGS.chevy_tahoe;
  }
  if (tag.includes('el camino')) return VEHICLE_AUDIO_TUNINGS.el_camino;
  if (tag.includes('town car')) return VEHICLE_AUDIO_TUNINGS.town_car;
  if (tag.includes('mini truck')) return VEHICLE_AUDIO_TUNINGS.mini_truck;
  if (tag.includes('van')) return VEHICLE_AUDIO_TUNINGS.van_90s;
  if (tag.includes('slab')) return VEHICLE_AUDIO_TUNINGS.slab;
  if (tag.includes('lowrider') || tag.includes('impala')) {
    return VEHICLE_AUDIO_TUNINGS.lowrider;
  }
  if (isOldSchoolCarLike(car)) return VEHICLE_AUDIO_TUNINGS.classic;
  return VEHICLE_AUDIO_TUNINGS.modern;
}

/** Short label used by the radio deck badge. */
export function carAudioTuningBadge(tuning: CarCabinAudioTuning): string {
  return RATTLE_LABELS[tuning.id] ?? tuning.label.toUpperCase();
}

/**
 * Safety ceiling curve. Linear up to `threshold`, then a smooth tanh knee that
 * never reaches 0 dBFS. A WaveShaper clamps inputs outside [-1, 1] to the end
 * points, so this node alone makes digital clipping impossible downstream.
 */
export function buildAntiClipCurve(
  threshold = 0.8,
  ceiling = 0.98,
  length = 4097,
): Float32Array<ArrayBuffer> {
  const safeThreshold = Math.max(0.05, Math.min(0.98, threshold));
  const safeCeiling = Math.max(safeThreshold, Math.min(0.999, ceiling));
  const curve = new Float32Array(new ArrayBuffer(length * 4));
  for (let i = 0; i < length; i += 1) {
    const x = (i / (length - 1)) * 2 - 1;
    const a = Math.abs(x);
    if (a <= safeThreshold) {
      curve[i] = x;
    } else {
      const over = (a - safeThreshold) / (1 - safeThreshold);
      // Exponential soft knee: slope eases off smoothly at the threshold and
      // the curve reaches exactly `ceiling` at full scale.
      const knee = (1 - Math.exp(-4 * over)) / (1 - Math.exp(-4));
      const y = safeThreshold + (safeCeiling - safeThreshold) * knee;
      curve[i] = x < 0 ? -y : y;
    }
  }
  return curve;
}
