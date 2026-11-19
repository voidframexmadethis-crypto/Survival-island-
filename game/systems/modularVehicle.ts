import {
  ModularVehicleData,
  VehicleModuleKind,
  VehicleModulePlacement,
} from '../types';

export interface VehicleModuleSpec {
  kind: VehicleModuleKind;
  name: string;
  shortLabel: string;
  massKg: number;
  hpBonus: number;
  landThrust: number;
  gripScore: number;
  buoyancyForce: number;
  airLiftForce: number;
  turnBonus: number;
  cargoSlots: number;
  color: string;
  description: string;
}

export const VEHICLE_MODULE_SPECS: Record<VehicleModuleKind, VehicleModuleSpec> = {
  cockpit_seat: {
    kind: 'cockpit_seat',
    name: 'Pilot Helm & Controls',
    shortLabel: 'Helm',
    massKg: 140,
    hpBonus: 120,
    landThrust: 0,
    gripScore: 0,
    buoyancyForce: 150,
    airLiftForce: 0,
    turnBonus: 0.4,
    cargoSlots: 4,
    color: '#d97706',
    description: 'Pressurized gauge console & steering linkage required to pilot the craft.',
  },
  chassis_frame: {
    kind: 'chassis_frame',
    name: 'Riveted Chassis Frame',
    shortLabel: 'Frame',
    massKg: 110,
    hpBonus: 70,
    landThrust: 0,
    gripScore: 0,
    buoyancyForce: 60,
    airLiftForce: 0,
    turnBonus: 0,
    cargoSlots: 0,
    color: '#64748b',
    description: 'Structural steel-and-oak spaceframe bonding wheels, pontoons, and rotors.',
  },
  armor_plate: {
    kind: 'armor_plate',
    name: 'Basalt-Steel Armor Plate',
    shortLabel: 'Armor',
    massKg: 190,
    hpBonus: 145,
    landThrust: 0,
    gripScore: 0,
    buoyancyForce: 0,
    airLiftForce: 0,
    turnBonus: 0,
    cargoSlots: 0,
    color: '#475569',
    description: 'Heavy welded shielding absorbing dinosaur bites, boulder impacts, and rams.',
  },
  offroad_wheel: {
    kind: 'offroad_wheel',
    name: 'Heavy Offroad Wheel',
    shortLabel: 'Wheel',
    massKg: 75,
    hpBonus: 35,
    landThrust: 3.2,
    gripScore: 1,
    buoyancyForce: 30,
    airLiftForce: 0,
    turnBonus: 0.35,
    cargoSlots: 0,
    color: '#1c1917',
    description: 'Independent coil-sprung treaded wheel for hills, sand, and stone bridges.',
  },
  steam_engine_pod: {
    kind: 'steam_engine_pod',
    name: 'Twin Steam Drive Engine',
    shortLabel: 'Engine',
    massKg: 185,
    hpBonus: 65,
    landThrust: 12.5,
    gripScore: 0,
    buoyancyForce: 40,
    airLiftForce: 220,
    turnBonus: 0,
    cargoSlots: 0,
    color: '#b45309',
    description: 'High-torque twin cylinder steam engine powering land drives, boats & rotors.',
  },
  boat_hull: {
    kind: 'boat_hull',
    name: 'Sealed Buoyant Pontoon',
    shortLabel: 'Pontoon',
    massKg: 95,
    hpBonus: 65,
    landThrust: 0,
    gripScore: 0,
    buoyancyForce: 540,
    airLiftForce: 0,
    turnBonus: 0.25,
    cargoSlots: 0,
    color: '#92400e',
    description: 'Hydrodynamic caulked hull keeping heavy vehicles floating & fast across oceans.',
  },
  rotor_wing: {
    kind: 'rotor_wing',
    name: 'Gyro Rotor & Wing Pod',
    shortLabel: 'Rotor',
    massKg: 105,
    hpBonus: 55,
    landThrust: 2.5,
    gripScore: 0,
    buoyancyForce: 40,
    airLiftForce: 680,
    turnBonus: 0.35,
    cargoSlots: 0,
    color: '#eab308',
    description: 'Spinning gyro-blade assembly generating vertical flight lift & sky cruising.',
  },
  steering_rudder: {
    kind: 'steering_rudder',
    name: 'Precision Steering Fin',
    shortLabel: 'Steer',
    massKg: 45,
    hpBonus: 30,
    landThrust: 0,
    gripScore: 0.25,
    buoyancyForce: 35,
    airLiftForce: 40,
    turnBonus: 0.72,
    cargoSlots: 0,
    color: '#38bdf8',
    description: 'Coupled rack-and-pinion rudder amplifying land, sea, and aerial turn agility.',
  },
  storage_rack: {
    kind: 'storage_rack',
    name: 'Cargo Locker Unit',
    shortLabel: 'Cargo',
    massKg: 70,
    hpBonus: 45,
    landThrust: 0,
    gripScore: 0,
    buoyancyForce: 40,
    airLiftForce: 0,
    turnBonus: 0,
    cargoSlots: 10,
    color: '#78350f',
    description: 'Reinforced expedition cargo rack adding +10 item stack slots to the craft.',
  },
};

export interface ComputedVehicleSpecs {
  craftClass:
    | 'Land Rover'
    | 'Steam Boat'
    | 'Amphibious Craft'
    | 'Gyro Airship'
    | 'Armored Rig';
  totalMassKg: number;
  maxHp: number;
  topLandSpeed: number; // m/s
  topWaterSpeed: number; // m/s
  topAirSpeed: number; // m/s
  turnRate: number; // rad/s
  canFloat: boolean;
  canFly: boolean;
  wheelCount: number;
  engineCount: number;
  rotorCount: number;
  pontoonCount: number;
  armorCount: number;
  cargoCapacity: number;
}

export function computeVehicleSpecs(
  modules: readonly VehicleModulePlacement[],
): ComputedVehicleSpecs {
  let totalMassKg = 0;
  let maxHp = 80;
  let landThrust = 0;
  let gripScore = 0;
  let buoyancyForce = 0;
  let airLiftForce = 0;
  let turnBonus = 0.85;
  let wheelCount = 0;
  let engineCount = 0;
  let rotorCount = 0;
  let pontoonCount = 0;
  let armorCount = 0;
  let cargoCapacity = 4;

  for (const m of modules) {
    const sp = VEHICLE_MODULE_SPECS[m.kind];
    totalMassKg += sp.massKg;
    maxHp += sp.hpBonus;
    landThrust += sp.landThrust;
    gripScore += sp.gripScore;
    buoyancyForce += sp.buoyancyForce;
    airLiftForce += sp.airLiftForce;
    turnBonus += sp.turnBonus;
    cargoCapacity += sp.cargoSlots;
    if (m.kind === 'offroad_wheel') wheelCount += 1;
    if (m.kind === 'steam_engine_pod') engineCount += 1;
    if (m.kind === 'rotor_wing') rotorCount += 1;
    if (m.kind === 'boat_hull') pontoonCount += 1;
    if (m.kind === 'armor_plate') armorCount += 1;
  }

  const massFactor = Math.max(0.55, 720 / Math.max(360, totalMassKg));
  const powerScale = engineCount > 0 ? 1 : 0.35; // Pedal/auxiliary fallback if no steam engine
  const wheelGripMult = wheelCount >= 2 ? 1.0 : wheelCount === 1 ? 0.65 : 0.35;

  const topLandSpeed = Math.min(
    24,
    (5.5 + landThrust * 1.1) * massFactor * powerScale * wheelGripMult,
  );
  const canFloat = pontoonCount >= 2 || buoyancyForce >= totalMassKg * 0.92;
  const topWaterSpeed = canFloat
    ? Math.min(20, (5.2 + landThrust * 0.95 + pontoonCount * 1.2) * massFactor * powerScale)
    : 2.2;
  const canFly = rotorCount >= 1 && (engineCount >= 1 || airLiftForce >= totalMassKg * 0.55);
  const topAirSpeed = canFly
    ? Math.min(26, (8.5 + landThrust * 1.0 + rotorCount * 3.2) * massFactor)
    : 0;
  const turnRate = Math.min(3.2, 0.95 + turnBonus * 0.38);

  let craftClass: ComputedVehicleSpecs['craftClass'] = 'Land Rover';
  if (canFly) craftClass = 'Gyro Airship';
  else if (canFloat && wheelCount >= 2) craftClass = 'Amphibious Craft';
  else if (canFloat) craftClass = 'Steam Boat';
  else if (armorCount >= 3) craftClass = 'Armored Rig';

  return {
    craftClass,
    totalMassKg,
    maxHp,
    topLandSpeed: Number(topLandSpeed.toFixed(1)),
    topWaterSpeed: Number(topWaterSpeed.toFixed(1)),
    topAirSpeed: Number(topAirSpeed.toFixed(1)),
    turnRate: Number(turnRate.toFixed(2)),
    canFloat,
    canFly,
    wheelCount,
    engineCount,
    rotorCount,
    pontoonCount,
    armorCount,
    cargoCapacity,
  };
}

export type VehiclePresetKey =
  | 'expedition_rover'
  | 'sports_car'
  | 'dune_buggy'
  | 'lowrider'
  | 'donk'
  | 'slab'
  | 'cadillac_coupe_deville'
  | 'steam_boat'
  | 'gyro_airship';

export function buildPresetModules(preset: VehiclePresetKey): VehicleModulePlacement[] {
  const mk = (
    kind: VehicleModuleKind,
    gx: number,
    gy: number,
    gz: number,
    idx: number,
  ): VehicleModulePlacement => ({
    id: `${preset}_${kind}_${idx}`,
    kind,
    gx,
    gy,
    gz,
  });

  if (preset === 'sports_car') {
    return [
      mk('chassis_frame', 0, 0, 0, 1),
      mk('chassis_frame', 0, 0, 1, 2),
      mk('chassis_frame', 0, 0, -1, 3),
      mk('offroad_wheel', -1, 0, 1, 4),
      mk('offroad_wheel', 1, 0, 1, 5),
      mk('offroad_wheel', -1, 0, -1, 6),
      mk('offroad_wheel', 1, 0, -1, 7),
      mk('cockpit_seat', 0, 1, 0, 8),
      mk('steam_engine_pod', 0, 1, 1, 9),
      mk('steam_engine_pod', 0, 1, -1, 10),
      mk('steering_rudder', 0, 1, 2, 11),
    ];
  }

  if (preset === 'dune_buggy') {
    return [
      mk('chassis_frame', 0, 0, 0, 1),
      mk('chassis_frame', 0, 0, 1, 2),
      mk('offroad_wheel', -1, 0, 1, 3),
      mk('offroad_wheel', 1, 0, 1, 4),
      mk('offroad_wheel', -1, 0, -1, 5),
      mk('offroad_wheel', 1, 0, -1, 6),
      mk('cockpit_seat', 0, 1, 0, 7),
      mk('steam_engine_pod', 0, 1, -1, 8),
      mk('steering_rudder', 0, 1, 1, 9),
      mk('storage_rack', 0, 1, -2, 10),
    ];
  }

  if (preset === 'lowrider') {
    return [
      mk('chassis_frame', 0, 0, 0, 1),
      mk('chassis_frame', 0, 0, 1, 2),
      mk('chassis_frame', 0, 0, -1, 3),
      mk('chassis_frame', 0, 0, 2, 4),
      mk('offroad_wheel', -1, 0, 1, 5),
      mk('offroad_wheel', 1, 0, 1, 6),
      mk('offroad_wheel', -1, 0, -1, 7),
      mk('offroad_wheel', 1, 0, -1, 8),
      mk('cockpit_seat', 0, 1, 0, 9),
      mk('steam_engine_pod', 0, 1, 1, 10),
      mk('steering_rudder', 0, 1, 2, 11),
      mk('storage_rack', 0, 1, -1, 12),
    ];
  }

  if (preset === 'donk') {
    return [
      mk('chassis_frame', 0, 0, 0, 1),
      mk('chassis_frame', 0, 0, 1, 2),
      mk('chassis_frame', 0, 0, -1, 3),
      mk('chassis_frame', 0, 0, 2, 4),
      mk('offroad_wheel', -1, 0, 1, 5),
      mk('offroad_wheel', 1, 0, 1, 6),
      mk('offroad_wheel', -1, 0, -1, 7),
      mk('offroad_wheel', 1, 0, -1, 8),
      mk('cockpit_seat', 0, 1, 0, 9),
      mk('steam_engine_pod', 0, 1, 1, 10),
      mk('armor_plate', 0, 1, 2, 11),
      mk('steering_rudder', 0, 1, -2, 12),
      mk('storage_rack', 0, 1, -1, 13),
    ];
  }

  if (preset === 'slab' || preset === 'cadillac_coupe_deville') {
    return [
      mk('chassis_frame', 0, 0, 0, 1),
      mk('chassis_frame', 0, 0, 1, 2),
      mk('chassis_frame', 0, 0, -1, 3),
      mk('chassis_frame', 0, 0, 2, 4),
      mk('offroad_wheel', -1, 0, 1, 5),
      mk('offroad_wheel', 1, 0, 1, 6),
      mk('offroad_wheel', -1, 0, -1, 7),
      mk('offroad_wheel', 1, 0, -1, 8),
      mk('cockpit_seat', 0, 1, 0, 9),
      mk('steam_engine_pod', 0, 1, 1, 10),
      mk('steering_rudder', 0, 1, 2, 11),
      mk('storage_rack', 0, 1, -1, 12),
    ];
  }

  if (preset === 'steam_boat') {
    return [
      mk('boat_hull', -1, 0, -1, 1),
      mk('boat_hull', 1, 0, -1, 2),
      mk('boat_hull', -1, 0, 1, 3),
      mk('boat_hull', 1, 0, 1, 4),
      mk('chassis_frame', 0, 0, 0, 5),
      mk('chassis_frame', 0, 0, 1, 6),
      mk('cockpit_seat', 0, 1, 1, 7),
      mk('steam_engine_pod', 0, 1, -1, 8),
      mk('steering_rudder', 0, 0, -2, 9),
      mk('storage_rack', 0, 1, 0, 10),
    ];
  }

  if (preset === 'gyro_airship') {
    return [
      mk('chassis_frame', 0, 0, 0, 1),
      mk('chassis_frame', 0, 0, 1, 2),
      mk('chassis_frame', 0, 0, -1, 3),
      mk('offroad_wheel', -1, 0, 1, 4),
      mk('offroad_wheel', 1, 0, 1, 5),
      mk('offroad_wheel', -1, 0, -1, 6),
      mk('offroad_wheel', 1, 0, -1, 7),
      mk('cockpit_seat', 0, 1, 1, 8),
      mk('steam_engine_pod', 0, 1, -1, 9),
      mk('rotor_wing', 0, 2, 0, 10),
      mk('rotor_wing', -1, 1, 0, 11),
      mk('rotor_wing', 1, 1, 0, 12),
      mk('steering_rudder', 0, 1, -2, 13),
      mk('storage_rack', 0, 1, 0, 14),
    ];
  }

  // Default: Expedition 4x4 Armored Rover
  return [
    mk('chassis_frame', 0, 0, 0, 1),
    mk('chassis_frame', 0, 0, 1, 2),
    mk('chassis_frame', 0, 0, -1, 3),
    mk('offroad_wheel', -1, 0, 1, 4),
    mk('offroad_wheel', 1, 0, 1, 5),
    mk('offroad_wheel', -1, 0, -1, 6),
    mk('offroad_wheel', 1, 0, -1, 7),
    mk('cockpit_seat', 0, 1, 0, 8),
    mk('steam_engine_pod', 0, 1, -1, 9),
    mk('armor_plate', 0, 1, 1, 10),
    mk('steering_rudder', 0, 1, 2, 11),
    mk('storage_rack', 0, 1, -2, 12),
  ];
}

export function createVehicleFromPreset(
  id: string,
  preset: VehiclePresetKey,
  x: number,
  y: number,
  z: number,
  yaw = 0,
): ModularVehicleData {
  const modules = buildPresetModules(preset);
  const specs = computeVehicleSpecs(modules);
  const names: Record<VehiclePresetKey, string> = {
    expedition_rover: 'Expedition 4x4 Steam Rover',
    sports_car: 'Island GT Street Car',
    dune_buggy: 'Sandstorm Dune Buggy',
    lowrider: '1964 Impala Candy Lowrider',
    donk: '1974 Box Chevy DONK (30" Rims)',
    slab: 'Houston Candy SLAB (Swangers)',
    cadillac_coupe_deville: 'Cadillac Coupe DeVille (13" Spinners)',
    steam_boat: 'Pontoon Valley Explorer Boat',
    gyro_airship: 'Island Gyro Rotor Airship',
  };
  const colors: Record<VehiclePresetKey, string> = {
    expedition_rover: '#d97706',
    sports_car: '#dc2626',
    dune_buggy: '#84cc16',
    lowrider: '#7e22ce',
    donk: '#0284c7',
    slab: '#9f1239',
    cadillac_coupe_deville: '#f8fafc',
    steam_boat: '#0284c7',
    gyro_airship: '#eab308',
  };
  const rimColors: Record<VehiclePresetKey, string> = {
    expedition_rover: '#d97706',
    sports_car: '#e2e8f0',
    dune_buggy: '#334155',
    lowrider: '#f8fafc',
    donk: '#f8fafc',
    slab: '#f8fafc',
    cadillac_coupe_deville: '#f8fafc',
    steam_boat: '#d97706',
    gyro_airship: '#e2e8f0',
  };
  const suspensionByPreset: Record<VehiclePresetKey, number> = {
    expedition_rover: 0.04,
    sports_car: -0.1,
    dune_buggy: 0.22,
    lowrider: -0.16,
    donk: 0.44,
    slab: -0.12,
    cadillac_coupe_deville: -0.14,
    steam_boat: 0,
    gyro_airship: 0.05,
  };
  const wheelScaleByPreset: Record<VehiclePresetKey, number> = {
    expedition_rover: 1.05,
    sports_car: 0.88,
    dune_buggy: 1.22,
    lowrider: 0.86,
    donk: 1.52,
    slab: 0.92,
    cadillac_coupe_deville: 0.8,
    steam_boat: 1.0,
    gyro_airship: 0.9,
  };
  const isDeville = preset === 'cadillac_coupe_deville';
  return {
    id,
    name: names[preset],
    paintColor: colors[preset],
    preset,
    rimColor: rimColors[preset],
    suspensionOffset: suspensionByPreset[preset],
    wheelScale: wheelScaleByPreset[preset],
    hydraulicHop: preset === 'lowrider' || preset === 'donk' || isDeville,
    hasAirbagSuspension: isDeville,
    airbagSpeed: 1.0,
    airbagLockLevel: 1.0,
    hasConvertibleTop: isDeville,
    convertibleTopDown: false,
    doorsOpen: false,
    trunkOpen: false,
    trunkBassEnabled: false,
    underglowColor: preset === 'slab' ? '#e879f9' : undefined,
    turboBoost:
      preset === 'sports_car'
        ? 1.35
        : preset === 'donk'
          ? 1.24
          : isDeville
            ? 1.22
            : preset === 'dune_buggy'
              ? 1.2
              : preset === 'slab'
                ? 1.18
                : preset === 'lowrider'
                  ? 1.15
                  : 1.0,
    x,
    y,
    z,
    yaw,
    vx: 0,
    vy: 0,
    vz: 0,
    hp: specs.maxHp,
    maxHp: specs.maxHp,
    fuel: 100,
    modules,
    cargoItems: [],
  };
}
