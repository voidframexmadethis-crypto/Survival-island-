export interface ThreeWheelHydraulicTargets {
  fl: number;
  fr: number;
  rl: number;
  rr: number;
}

/** Frozen parked pose used while the driver is out of the car. */
export const THREE_WHEEL_PARKED_POSE = {
  heave: 0.48,
  pitch: 0.15,
  roll: -0.17,
  wheelLift: 0.58,
  airbagWheelLift: 0.42,
} as const;

/** Full cylinder cars can hold a three-wheel stance; long-travel airbag vans cannot. */
export function isThreeWheelHydraulicVehicle(preset?: string | null): boolean {
  return (
    preset === 'lowrider' ||
    preset === 'cadillac_coupe_deville' ||
    preset === 'mini_truck' ||
    preset === 'el_camino' ||
    preset === 'town_car'
  );
}

/**
 * Three corners sit just off their bump stops while the rear-left wheel is
 * pumped high. The equal low targets are what keep the other three tires planted.
 */
export function getThreeWheelHydraulicTargets(
  airbag: boolean,
  lockLevel = 1,
): ThreeWheelHydraulicTargets {
  const scale = airbag ? Math.max(0.4, Math.min(1.4, lockLevel)) : 1;
  const base = 0.3 * scale;
  return {
    fl: base,
    fr: base,
    rl: 1.02 * scale,
    rr: base,
  };
}
