export type ElevatorLiftState =
  | 'IDLE'
  | 'PREVIEWING'
  | 'RISING_TO_SURFACE'
  | 'READY';

export type ExoticCarClass =
  | 'Modern Exotic'
  | 'Modern Hypercar'
  | 'Ultra Rare';

export interface ExoticElevatorCar {
  id: string;
  name: string;
  rarity: string;
  class: ExoticCarClass;
  paintColor: string;
  accentColor: string;
  rimColor: string;
  underglowColor: string;
  horsepower: number;
  zeroToSixty: string;
  topSpeedMph: number;
  engine: string;
  turboBoost: number;
  tagline: string;
}

export const ELEVATOR_EXOTIC_LIFT = {
  selectedCarId: 'mclaren_720s_lbw',
  activeSurfaceCarId: null as string | null,
  liftState: 'IDLE' as ElevatorLiftState,

  cars: [
    {
      id: 'mclaren_720s_lbw',
      name: 'McLaren 720S LB-Works',
      rarity: 'Rare Widebody',
      class: 'Modern Exotic',
      paintColor: '#f97316',
      accentColor: '#111827',
      rimColor: '#e2e8f0',
      underglowColor: '#fb923c',
      horsepower: 750,
      zeroToSixty: '2.7s',
      topSpeedMph: 214,
      engine: '4.0L Twin-Turbo V8',
      turboBoost: 1.52,
      tagline: 'Liberty Walk widebody aero kit with dihedral doors and carbon diffuser.',
    },
    {
      id: 'aston_vantage_gt3',
      name: 'Aston Martin Vantage GT3 Evo',
      rarity: 'Track Exotic',
      class: 'Modern Exotic',
      paintColor: '#047857',
      accentColor: '#bef264',
      rimColor: '#cbd5e1',
      underglowColor: '#34d399',
      horsepower: 680,
      zeroToSixty: '2.9s',
      topSpeedMph: 205,
      engine: '4.0L Bi-Turbo V8 GT3',
      turboBoost: 1.48,
      tagline: 'Endurance-spec British GT3 chassis with full downforce splitter & wing.',
    },
    {
      id: 'huracan_gt3_evo2',
      name: 'Lamborghini Huracán GT3 EVO2',
      rarity: 'Track Exotic',
      class: 'Modern Exotic',
      paintColor: '#65a30d',
      accentColor: '#18181b',
      rimColor: '#f8fafc',
      underglowColor: '#a3e635',
      horsepower: 640,
      zeroToSixty: '2.8s',
      topSpeedMph: 208,
      engine: '5.2L Naturally Aspirated V10',
      turboBoost: 1.5,
      tagline: 'Screaming Squadra Corse V10 track weapon with hexagonal roof scoop.',
    },
    {
      id: 'ferrari_sf90',
      name: 'Ferrari SF90 Stradale',
      rarity: 'Hybrid Exotic',
      class: 'Modern Exotic',
      paintColor: '#dc2626',
      accentColor: '#facc15',
      rimColor: '#f1f5f9',
      underglowColor: '#ef4444',
      horsepower: 986,
      zeroToSixty: '2.5s',
      topSpeedMph: 211,
      engine: '4.0L Twin-Turbo V8 + 3 Electric Motors',
      turboBoost: 1.62,
      tagline: 'Maranello plug-in hybrid AWD flagship with instant e-torque launch.',
    },
    {
      id: 'sls_amg_black',
      name: 'Mercedes-Benz SLS AMG Black',
      rarity: 'Limited Coupe',
      class: 'Modern Exotic',
      paintColor: '#eab308',
      accentColor: '#0f172a',
      rimColor: '#1e293b',
      underglowColor: '#facc15',
      horsepower: 622,
      zeroToSixty: '3.2s',
      topSpeedMph: 196,
      engine: '6.2L Hand-Built V8',
      turboBoost: 1.46,
      tagline: 'Iconic gullwing Black Series coupe with thunderous AMG V8 exhaust.',
    },
    {
      id: 'mclaren_speedtail',
      name: 'McLaren Speedtail',
      rarity: 'Hyper-GT',
      class: 'Modern Hypercar',
      paintColor: '#94a3b8',
      accentColor: '#38bdf8',
      rimColor: '#f8fafc',
      underglowColor: '#38bdf8',
      horsepower: 1055,
      zeroToSixty: '2.6s',
      topSpeedMph: 250,
      engine: '4.0L Hybrid Twin-Turbo V8',
      turboBoost: 1.72,
      tagline: 'Teardrop three-seat Hyper-GT built for 250 mph straight-line velocity.',
    },
    {
      id: 'mclaren_p1_gtr',
      name: 'McLaren P1 GTR',
      rarity: 'Track Hypercar',
      class: 'Modern Hypercar',
      paintColor: '#facc15',
      accentColor: '#15803d',
      rimColor: '#1e293b',
      underglowColor: '#fde047',
      horsepower: 986,
      zeroToSixty: '2.4s',
      topSpeedMph: 225,
      engine: '3.8L Hybrid Twin-Turbo V8',
      turboBoost: 1.68,
      tagline: 'Track-only hybrid legend with fixed swan-neck rear wing & ERS boost.',
    },
    {
      id: 'bugatti_chiron',
      name: 'Bugatti Chiron',
      rarity: 'W16 Hypercar',
      class: 'Modern Hypercar',
      paintColor: '#2563eb',
      accentColor: '#0f172a',
      rimColor: '#e2e8f0',
      underglowColor: '#3b82f6',
      horsepower: 1500,
      zeroToSixty: '2.3s',
      topSpeedMph: 261,
      engine: '8.0L Quad-Turbo W16',
      turboBoost: 1.82,
      tagline: 'Molsheim quad-turbocharged W16 masterpiece with signature C-line.',
    },
    {
      id: 'bugatti_divo',
      name: 'Bugatti Divo',
      rarity: 'Bespoke Hypercar',
      class: 'Modern Hypercar',
      paintColor: '#334155',
      accentColor: '#06b6d4',
      rimColor: '#22d3ee',
      underglowColor: '#06b6d4',
      horsepower: 1500,
      zeroToSixty: '2.4s',
      topSpeedMph: 236,
      engine: '8.0L Quad-Turbo W16',
      turboBoost: 1.78,
      tagline: 'Coachbuilt corner-carving W16 limited to 40 units worldwide.',
    },
    {
      id: 'ferrari_monza_sp2',
      name: 'Ferrari Monza SP2',
      rarity: 'Limited Speedster',
      class: 'Modern Hypercar',
      paintColor: '#991b1b',
      accentColor: '#f8fafc',
      rimColor: '#cbd5e1',
      underglowColor: '#f87171',
      horsepower: 799,
      zeroToSixty: '2.9s',
      topSpeedMph: 186,
      engine: '6.5L Naturally Aspirated V12',
      turboBoost: 1.58,
      tagline: 'Open-cockpit Icona series barchetta powered by an 8,500 rpm V12.',
    },
    {
      id: 'lamborghini_sian',
      name: 'Lamborghini Sián FKP 37',
      rarity: 'Supercapacitor Hybrid',
      class: 'Ultra Rare',
      paintColor: '#4d7c0f',
      accentColor: '#d97706',
      rimColor: '#fbbf24',
      underglowColor: '#84cc16',
      horsepower: 819,
      zeroToSixty: '2.7s',
      topSpeedMph: 220,
      engine: '6.5L V12 + Supercapacitor E-Motor',
      turboBoost: 1.66,
      tagline: 'Y-shaped DRL razor aero with instant supercapacitor torque fill.',
    },
    {
      id: 'aston_valkyrie',
      name: 'Aston Martin Valkyrie',
      rarity: 'Aero Hypercar',
      class: 'Ultra Rare',
      paintColor: '#0f766e',
      accentColor: '#2dd4bf',
      rimColor: '#1e293b',
      underglowColor: '#14b8a6',
      horsepower: 1160,
      zeroToSixty: '2.3s',
      topSpeedMph: 250,
      engine: '6.5L Cosworth V12 Hybrid (11,100 RPM)',
      turboBoost: 1.85,
      tagline: 'Formula 1 Venturi-tunnel hypercar engineered for extreme downforce.',
    },
    {
      id: 'pagani_huayra',
      name: 'Pagani Huayra Roadster',
      rarity: 'Boutique Exotic',
      class: 'Ultra Rare',
      paintColor: '#6d28d9',
      accentColor: '#f59e0b',
      rimColor: '#fcd34d',
      underglowColor: '#a855f7',
      horsepower: 764,
      zeroToSixty: '2.8s',
      topSpeedMph: 238,
      engine: '6.0L AMG Twin-Turbo V12',
      turboBoost: 1.65,
      tagline: 'Carbo-Titanium Italian art piece with active aero flaps & billet cabin.',
    },
    {
      id: 'koenigsegg_gemera',
      name: 'Koenigsegg Gemera',
      rarity: 'Mega-GT',
      class: 'Ultra Rare',
      paintColor: '#e2e8f0',
      accentColor: '#f97316',
      rimColor: '#0f172a',
      underglowColor: '#e2e8f0',
      horsepower: 1700,
      zeroToSixty: '1.9s',
      topSpeedMph: 249,
      engine: 'Freevalve Hybrid Mega-GT Powertrain',
      turboBoost: 1.9,
      tagline: 'World’s first 4-seat Mega-GT with automated dihedral synchro-helix doors.',
    },
    {
      id: 'delage_d12',
      name: 'Delage D12',
      rarity: 'Boutique Prototype',
      class: 'Ultra Rare',
      paintColor: '#0284c7',
      accentColor: '#f43f5e',
      rimColor: '#f8fafc',
      underglowColor: '#38bdf8',
      horsepower: 1100,
      zeroToSixty: '2.4s',
      topSpeedMph: 224,
      engine: '7.6L Naturally Aspirated V12 Hybrid',
      turboBoost: 1.8,
      tagline: 'Fighter-jet tandem cockpit street-legal F1 prototype from France.',
    },
  ] as ExoticElevatorCar[],

  selectForPreview(carId: string): ExoticElevatorCar | null {
    const car = this.cars.find((c) => c.id === carId);
    if (!car) return null;
    this.selectedCarId = car.id;
    this.liftState = 'PREVIEWING';
    return car;
  },

  bringCarToSurface(
    carId?: string,
    onComplete: ((car: ExoticElevatorCar) => void) | null = null,
  ): ExoticElevatorCar | null {
    const targetId = carId ?? this.selectedCarId;
    const car = this.cars.find((c) => c.id === targetId);
    if (!car) return null;

    this.selectedCarId = car.id;
    this.activeSurfaceCarId = car.id;
    this.liftState = 'RISING_TO_SURFACE';

    if (typeof onComplete === 'function') {
      onComplete(car);
    }

    return car;
  },

  markReady(): void {
    this.liftState = 'READY';
  },
};

export type PlayerHonorific = 'Sir' | "Ma'am" | 'Friend';

const HONORIFIC_STORAGE_KEY = 'survival_island_vault_honorific';
const VOICE_ENABLED_STORAGE_KEY = 'survival_island_vault_voice_enabled';

function loadSavedHonorific(): PlayerHonorific {
  if (typeof window === 'undefined') return 'Sir';
  try {
    const saved = window.localStorage.getItem(HONORIFIC_STORAGE_KEY);
    if (saved === 'Sir' || saved === "Ma'am" || saved === 'Friend') {
      return saved;
    }
    if (saved === 'Boss') {
      return 'Friend';
    }
  } catch {
    // ignore storage errors
  }
  return 'Sir';
}

function loadSavedVoiceEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const saved = window.localStorage.getItem(VOICE_ENABLED_STORAGE_KEY);
    if (saved === 'false') return false;
  } catch {
    // ignore storage errors
  }
  return true;
}

export const ELEVATOR_VOICE_COMPUTER = {
  honorific: 'Sir' as PlayerHonorific,
  selectedCarName: null as string | null,
  voiceEnabled: true,

  syncFromStorage(): void {
    this.honorific = loadSavedHonorific();
    this.voiceEnabled = loadSavedVoiceEnabled();
  },

  setHonorific(title: PlayerHonorific | string): PlayerHonorific {
    if (title === 'Sir' || title === "Ma'am" || title === 'Friend') {
      this.honorific = title;
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(HONORIFIC_STORAGE_KEY, title);
        } catch {
          // ignore storage errors
        }
      }
    }
    return this.honorific;
  },

  setEnabled(enabled: boolean): void {
    this.voiceEnabled = enabled;
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(VOICE_ENABLED_STORAGE_KEY, String(enabled));
      if (!enabled && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } catch {
      // ignore storage errors
    }
  },

  speak(line: string, onTextFallback: ((text: string) => void) | null = null): void {
    if (typeof onTextFallback === 'function') {
      onTextFallback(line);
    }

    if (
      !this.voiceEnabled ||
      typeof window === 'undefined' ||
      !('speechSynthesis' in window)
    ) {
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(line);
      utterance.rate = 1.0;
      utterance.pitch = 0.95;
      utterance.volume = 0.95;
      const voices = window.speechSynthesis.getVoices();
      const preferred =
        voices.find(
          (v) =>
            /en-US|en-GB/i.test(v.lang) &&
            /Google|Samantha|Daniel|Alex|Natural/i.test(v.name),
        ) ?? voices.find((v) => /^en/i.test(v.lang));
      if (preferred) {
        utterance.voice = preferred;
      }
      window.speechSynthesis.speak(utterance);
    } catch {
      // Ignore speech errors on restricted devices; text fallback still shows
    }
  },

  // 1. Player walks up to the surface computer terminal by the elevator
  onApproachTerminal(onSubtitle: ((text: string) => void) | null = null): string {
    this.syncFromStorage();
    const line = `What kind of car do you want? Would you like me to bring it up today, ${this.honorific}?`;
    this.speak(line, onSubtitle);
    return line;
  },

  // 2. Player picks a car in the preview menu
  onPreviewCar(
    carName: string,
    onSubtitle: ((text: string) => void) | null = null,
  ): string {
    this.syncFromStorage();
    this.selectedCarName = carName;
    const line = `${carName} selected on preview. Shall I bring it up to the surface today, ${this.honorific}?`;
    this.speak(line, onSubtitle);
    return line;
  },

  // 3. Player confirms and sends the car up on the elevator
  onConfirmBringUp(
    carName?: string | null,
    onSubtitle: ((text: string) => void) | null = null,
  ): string {
    this.syncFromStorage();
    const label = carName || this.selectedCarName || 'your ride';
    const line = `OK ${this.honorific}, bringing ${label} up to the surface now.`;
    this.speak(line, onSubtitle);
    return line;
  },
};

export const VAULT_COMPUTER_VOICE = {
  getHonorific(): PlayerHonorific {
    ELEVATOR_VOICE_COMPUTER.syncFromStorage();
    return ELEVATOR_VOICE_COMPUTER.honorific;
  },

  setHonorific(title: PlayerHonorific): void {
    ELEVATOR_VOICE_COMPUTER.setHonorific(title);
  },

  isEnabled(): boolean {
    ELEVATOR_VOICE_COMPUTER.syncFromStorage();
    return ELEVATOR_VOICE_COMPUTER.voiceEnabled;
  },

  setEnabled(enabled: boolean): void {
    ELEVATOR_VOICE_COMPUTER.setEnabled(enabled);
  },

  speak(text: string): void {
    ELEVATOR_VOICE_COMPUTER.syncFromStorage();
    ELEVATOR_VOICE_COMPUTER.speak(text);
  },

  speakGreeting(): string {
    return ELEVATOR_VOICE_COMPUTER.onApproachTerminal();
  },

  speakPreview(carName: string): string {
    return ELEVATOR_VOICE_COMPUTER.onPreviewCar(carName);
  },

  speakConfirmSummon(carName: string): string {
    return ELEVATOR_VOICE_COMPUTER.onConfirmBringUp(carName);
  },

  speakCarArrived(carName: string): string {
    const title = this.getHonorific();
    const line = `Your ${carName} is now on the surface, ${title}. Ready to drive.`;
    this.speak(line);
    return line;
  },
};
