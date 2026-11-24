/**
 * Bayou Royal Customs — player-owned restoration facility.
 *
 * The facility is deliberately not a customer business. Every department,
 * machine and management system here belongs to the player and only services
 * the player's own cars. This module owns the progression, parts ledger,
 * warranty records, mechanics and engraving catalogue; the game engine owns
 * the vehicles and the 3D shop.
 */

export type FacilityCategoryId =
  | 'restoration'
  | 'custom'
  | 'mechanical'
  | 'management'
  | 'advanced'
  | 'engraving';

export interface FacilityCategory {
  id: FacilityCategoryId;
  label: string;
  detail: string;
}

export const FACILITY_CATEGORIES: readonly FacilityCategory[] = [
  {
    id: 'restoration',
    label: 'Restoration departments',
    detail: 'Metal, body, glass and undercarriage work.',
  },
  {
    id: 'custom',
    label: 'Custom & lowrider',
    detail: 'Hydraulics, wheels, fabrications and audio.',
  },
  {
    id: 'mechanical',
    label: 'Mechanical',
    detail: 'Engines, driveline testing and road testing.',
  },
  {
    id: 'management',
    label: 'Player workshop management',
    detail: 'Reception, records, display and delivery for your own cars.',
  },
  {
    id: 'advanced',
    label: 'Advanced workshop systems',
    detail: 'Parts recovery, skills, certificates and challenges.',
  },
  {
    id: 'engraving',
    label: 'Royal engraving studio',
    detail: 'Hand engraving for bumpers, quarters and wheels.',
  },
] as const;

export type FacilityActionId =
  | 'appraise'
  | 'specs'
  | 'photos'
  | 'approval'
  | 'warranty'
  | 'display'
  | 'collection'
  | 'vip'
  | 'pickup'
  | 'warehouse'
  | 'recycle'
  | 'identify'
  | 'certificates'
  | 'night_shift'
  | 'skills'
  | 'challenge'
  | 'presentation'
  | 'engrave';

export interface FacilityFeature {
  id: string;
  /** 1..50 for the requested systems; 51 is the engraving studio. */
  index: number;
  category: FacilityCategoryId;
  name: string;
  detail: string;
  /** Physical equipment counts toward automatic expansion. */
  equipment: boolean;
  buildSpeedBonus: number;
  qualityBonus: number;
  partsRecoveryBonus: number;
  action: FacilityActionId | null;
}

/**
 * 50 player-owned workshop systems plus the Royal Engraving Studio. Every
 * feature changes a real number, unlocks a real player action, or reveals a
 * physical station in the expansion wing.
 */
export const FACILITY_FEATURES: readonly FacilityFeature[] = [
  // 1-10 Restoration departments
  {
    id: 'frame_straightening',
    index: 1,
    category: 'restoration',
    name: 'Frame Straightening Machine',
    detail: 'Laser-measured pulling tower and frame clamps. Cuts bodywork time and tightens panel gaps.',
    equipment: true,
    buildSpeedBonus: 0.018,
    qualityBonus: 2.5,
    partsRecoveryBonus: 0,
    action: null,
  },
  {
    id: 'rust_treatment',
    index: 2,
    category: 'restoration',
    name: 'Rust Treatment Chamber',
    detail: 'Heated de-rusting bay with neutralising wash. Rust repairs come back cleaner and last longer.',
    equipment: true,
    buildSpeedBonus: 0.014,
    qualityBonus: 3,
    partsRecoveryBonus: 0,
    action: null,
  },
  {
    id: 'welding_department',
    index: 3,
    category: 'restoration',
    name: 'Welding Department',
    detail: 'Tig, mig and spot welders with a proper steel table. Structural repairs no longer wait on borrowed gear.',
    equipment: true,
    buildSpeedBonus: 0.016,
    qualityBonus: 2,
    partsRecoveryBonus: 0.02,
    action: null,
  },
  {
    id: 'sandblasting',
    index: 4,
    category: 'restoration',
    name: 'Sandblasting Station',
    detail: 'Enclosed blasting cabinet and media recovery. Strips small parts fast and saves reusable hardware.',
    equipment: true,
    buildSpeedBonus: 0.015,
    qualityBonus: 1.5,
    partsRecoveryBonus: 0.04,
    action: null,
  },
  {
    id: 'dent_removal',
    index: 5,
    category: 'restoration',
    name: 'Dent Removal Station',
    detail: 'Pdr lights, glue pulling and hammer set. Straightens panels without heavy filler.',
    equipment: true,
    buildSpeedBonus: 0.012,
    qualityBonus: 3,
    partsRecoveryBonus: 0,
    action: null,
  },
  {
    id: 'chrome_restoration',
    index: 6,
    category: 'restoration',
    name: 'Chrome Restoration',
    detail: 'Polishing lathe, plating bath and trim rack. Original chrome is saved whenever possible.',
    equipment: true,
    buildSpeedBonus: 0.008,
    qualityBonus: 2.5,
    partsRecoveryBonus: 0.03,
    action: null,
  },
  {
    id: 'headlight_restoration',
    index: 7,
    category: 'restoration',
    name: 'Headlight Restoration',
    detail: 'Lens polishing, re-silvering and beam aiming bench. Restored lights pass a proper cutoff check.',
    equipment: true,
    buildSpeedBonus: 0.006,
    qualityBonus: 2,
    partsRecoveryBonus: 0.02,
    action: null,
  },
  {
    id: 'glass_station',
    index: 8,
    category: 'restoration',
    name: 'Glass Installation Station',
    detail: 'Suction lift, urethane cart and pane racks. Safe glass installation without scratches or leaks.',
    equipment: true,
    buildSpeedBonus: 0.01,
    qualityBonus: 2,
    partsRecoveryBonus: 0,
    action: null,
  },
  {
    id: 'weatherstrip_station',
    index: 9,
    category: 'restoration',
    name: 'Weatherstripping Station',
    detail: 'Seal stretching bench and clip cabinets. Doors shut with a factory thump and stay dry.',
    equipment: true,
    buildSpeedBonus: 0.008,
    qualityBonus: 1.5,
    partsRecoveryBonus: 0.01,
    action: null,
  },
  {
    id: 'undercarriage_restoration',
    index: 10,
    category: 'restoration',
    name: 'Undercarriage Restoration',
    detail: 'Rotisserie, needle scaler and coating bay. Floors, rails and brake lines get full access.',
    equipment: true,
    buildSpeedBonus: 0.014,
    qualityBonus: 2,
    partsRecoveryBonus: 0.02,
    action: null,
  },

  // 11-20 Custom car and lowrider departments
  {
    id: 'hydraulic_bay',
    index: 11,
    category: 'custom',
    name: 'Hydraulic Installation & Testing Bay',
    detail: 'Pressure test bench, battery charging and cylinder dyno. Hydraulic builds are tested before delivery.',
    equipment: true,
    buildSpeedBonus: 0.016,
    qualityBonus: 3,
    partsRecoveryBonus: 0,
    action: null,
  },
  {
    id: 'air_suspension',
    index: 12,
    category: 'custom',
    name: 'Adjustable Air Suspension Bay',
    detail: 'Height sensors, compressor bench and leak-down testing. Air rides are calibrated and documented.',
    equipment: true,
    buildSpeedBonus: 0.014,
    qualityBonus: 2.5,
    partsRecoveryBonus: 0,
    action: null,
  },
  {
    id: 'wheel_workshop',
    index: 13,
    category: 'custom',
    name: 'Custom Wheel Workshop',
    detail: 'Lathe, wheel balancer and adapter inventory. Custom rims are fitted true and torqued correctly.',
    equipment: true,
    buildSpeedBonus: 0.01,
    qualityBonus: 2,
    partsRecoveryBonus: 0.02,
    action: null,
  },
  {
    id: 'tire_customization',
    index: 14,
    category: 'custom',
    name: 'Tire Customization Department',
    detail: 'Whitewall grinding, stretch station and tire warmers. Tire fitment is repeatable instead of guesswork.',
    equipment: true,
    buildSpeedBonus: 0.008,
    qualityBonus: 1.5,
    partsRecoveryBonus: 0.01,
    action: null,
  },
  {
    id: 'donk_conversion',
    index: 15,
    category: 'custom',
    name: 'DONK Conversion Station',
    detail: 'Big-wheel mock-up rig and frame clearancing tools. Large-wheel builds keep steering and travel.',
    equipment: true,
    buildSpeedBonus: 0.012,
    qualityBonus: 2.5,
    partsRecoveryBonus: 0,
    action: null,
  },
  {
    id: 'convertible_conversion',
    index: 16,
    category: 'custom',
    name: 'Convertible Conversion Bay',
    detail: 'Top frame jig, hydraulics and weatherproofing bench. Eligible cars get a properly braced open roof.',
    equipment: true,
    buildSpeedBonus: 0.01,
    qualityBonus: 2.5,
    partsRecoveryBonus: 0,
    action: null,
  },
  {
    id: 'exhaust_fabrication',
    index: 17,
    category: 'custom',
    name: 'Custom Exhaust Fabrication',
    detail: 'Mandrel bender, tig welder and sound meter. Headers and exhaust are built to fit the car, not the shelf.',
    equipment: true,
    buildSpeedBonus: 0.012,
    qualityBonus: 2,
    partsRecoveryBonus: 0.02,
    action: null,
  },
  {
    id: 'forced_induction',
    index: 18,
    category: 'custom',
    name: 'Supercharger & Turbo Installation',
    detail: 'Piping bench, boost controller and dyno tie-in. Blowers and turbos are installed with real boost safety.',
    equipment: true,
    buildSpeedBonus: 0.014,
    qualityBonus: 3,
    partsRecoveryBonus: 0.02,
    action: null,
  },
  {
    id: 'steering_upgrades',
    index: 19,
    category: 'custom',
    name: 'Custom Steering Upgrades',
    detail: 'Column jig, quick-release fitting and alignment links. Aftermarket wheels sit straight and steer true.',
    equipment: true,
    buildSpeedBonus: 0.008,
    qualityBonus: 1.5,
    partsRecoveryBonus: 0.01,
    action: null,
  },
  {
    id: 'audio_installation',
    index: 20,
    category: 'custom',
    name: 'Professional Car Audio Installation',
    detail: 'Rta microphone, wiring bench and bass meter. Audio builds are tuned, fused and rattle-free.',
    equipment: true,
    buildSpeedBonus: 0.008,
    qualityBonus: 2,
    partsRecoveryBonus: 0.01,
    action: null,
  },

  // 21-30 Mechanical departments
  {
    id: 'engine_dyno',
    index: 21,
    category: 'mechanical',
    name: 'Engine Dynamometer',
    detail: 'Chassis dyno with horsepower and torque readouts. Every engine build is proven before the road test.',
    equipment: true,
    buildSpeedBonus: 0.012,
    qualityBonus: 3.5,
    partsRecoveryBonus: 0,
    action: null,
  },
  {
    id: 'transmission_testing',
    index: 22,
    category: 'mechanical',
    name: 'Transmission Testing Machine',
    detail: 'Valve body bench and load test. Shift quality and converter stall are verified before installation.',
    equipment: true,
    buildSpeedBonus: 0.01,
    qualityBonus: 2.5,
    partsRecoveryBonus: 0.01,
    action: null,
  },
  {
    id: 'computer_diagnostics',
    index: 23,
    category: 'mechanical',
    name: 'Computer Diagnostics',
    detail: 'Scan tools, oscilloscope and pin-out library. Electrical faults are found with evidence.',
    equipment: true,
    buildSpeedBonus: 0.014,
    qualityBonus: 2,
    partsRecoveryBonus: 0.01,
    action: null,
  },
  {
    id: 'wheel_alignment',
    index: 24,
    category: 'mechanical',
    name: 'Wheel Alignment Machine',
    detail: 'Four-wheel laser alignment with ride-height presets. Lowriders and donks track straight at speed.',
    equipment: true,
    buildSpeedBonus: 0.01,
    qualityBonus: 2,
    partsRecoveryBonus: 0,
    action: null,
  },
  {
    id: 'brake_rollers',
    index: 25,
    category: 'mechanical',
    name: 'Brake Testing Rollers',
    detail: 'Rolling brake dyno and balance tester. Stops are measured instead of assumed.',
    equipment: true,
    buildSpeedBonus: 0.008,
    qualityBonus: 2,
    partsRecoveryBonus: 0,
    action: null,
  },
  {
    id: 'radiator_repair',
    index: 26,
    category: 'mechanical',
    name: 'Radiator Repair',
    detail: 'Core tank, flow tester and ultrasonic cleaner. Original radiators are restored where possible.',
    equipment: true,
    buildSpeedBonus: 0.008,
    qualityBonus: 1.5,
    partsRecoveryBonus: 0.03,
    action: null,
  },
  {
    id: 'fuel_system',
    index: 27,
    category: 'mechanical',
    name: 'Fuel System Restoration',
    detail: 'Tank cleaning, injector flow bench and pressure test. Old fuel systems are made safe again.',
    equipment: true,
    buildSpeedBonus: 0.01,
    qualityBonus: 2,
    partsRecoveryBonus: 0.03,
    action: null,
  },
  {
    id: 'electrical_restoration',
    index: 28,
    category: 'mechanical',
    name: 'Electrical Restoration',
    detail: 'Harness bench, relay library and load bank. Every circuit is tested before the dash goes back in.',
    equipment: true,
    buildSpeedBonus: 0.012,
    qualityBonus: 2.5,
    partsRecoveryBonus: 0.02,
    action: null,
  },
  {
    id: 'suspension_testing',
    index: 29,
    category: 'mechanical',
    name: 'Suspension Testing Platform',
    detail: 'Four-post shaker and travel gauges. Springs, bags and hydraulics are cycled through full travel.',
    equipment: true,
    buildSpeedBonus: 0.01,
    qualityBonus: 2.5,
    partsRecoveryBonus: 0,
    action: null,
  },
  {
    id: 'road_test_department',
    index: 30,
    category: 'mechanical',
    name: 'Realistic Road-Testing Department',
    detail: 'Route book, data logger and inspection checklist. Every finished car gets a documented shakedown.',
    equipment: true,
    buildSpeedBonus: 0.01,
    qualityBonus: 3,
    partsRecoveryBonus: 0,
    action: null,
  },

  // 31-40 Player-owned workshop management
  {
    id: 'reception_interface',
    index: 31,
    category: 'management',
    name: 'Player Reception & Vehicle Selection',
    detail: 'Player-only reception terminal. Select your own car and open a job without any customer NPCs.',
    equipment: false,
    buildSpeedBonus: 0.004,
    qualityBonus: 0,
    partsRecoveryBonus: 0,
    action: 'collection',
  },
  {
    id: 'condition_appraisal',
    index: 32,
    category: 'management',
    name: 'Vehicle Condition Appraisal',
    detail: 'Panel-by-panel appraisal with condition score and replacement value.',
    equipment: false,
    buildSpeedBonus: 0,
    qualityBonus: 1,
    partsRecoveryBonus: 0,
    action: 'appraise',
  },
  {
    id: 'player_specifications',
    index: 33,
    category: 'management',
    name: 'Player-Selected Specifications',
    detail: 'The terminal remembers your engine, paint, wheel and interior choices for every job.',
    equipment: false,
    buildSpeedBonus: 0.004,
    qualityBonus: 1,
    partsRecoveryBonus: 0,
    action: 'specs',
  },
  {
    id: 'progress_photography',
    index: 34,
    category: 'management',
    name: 'Restoration Progress Photography',
    detail: 'Photo bay camera records teardown, metalwork, paint and assembly frames for each vehicle.',
    equipment: false,
    buildSpeedBonus: 0,
    qualityBonus: 1,
    partsRecoveryBonus: 0,
    action: 'photos',
  },
  {
    id: 'approval_gate',
    index: 35,
    category: 'management',
    name: 'Player Approval Gate',
    detail: 'Major engine, paint and chassis changes are recorded as approved by the player before work starts.',
    equipment: false,
    buildSpeedBonus: 0.004,
    qualityBonus: 1,
    partsRecoveryBonus: 0,
    action: 'approval',
  },
  {
    id: 'quality_warranty',
    index: 36,
    category: 'management',
    name: 'Quality & Warranty Records',
    detail: 'Each finished car gets a quality score, warranty term and service history owned by the player.',
    equipment: false,
    buildSpeedBonus: 0,
    qualityBonus: 2,
    partsRecoveryBonus: 0,
    action: 'warranty',
  },
  {
    id: 'display_area',
    index: 37,
    category: 'management',
    name: 'Finished Vehicle Display Area',
    detail: 'Move a finished car onto a lit presentation pad inside the facility.',
    equipment: false,
    buildSpeedBonus: 0,
    qualityBonus: 1,
    partsRecoveryBonus: 0,
    action: 'display',
  },
  {
    id: 'personal_collection',
    index: 38,
    category: 'management',
    name: 'Personal Vehicle Collection Display',
    detail: 'A catalogue of every car you own with its appraisal, photos and restoration history.',
    equipment: false,
    buildSpeedBonus: 0,
    qualityBonus: 1,
    partsRecoveryBonus: 0,
    action: 'collection',
  },
  {
    id: 'vip_restoration',
    index: 39,
    category: 'management',
    name: 'VIP-Quality Restoration',
    detail: 'Extra blocking, seam sealing and detail hours for rare cars. Higher quality and a longer warranty.',
    equipment: false,
    buildSpeedBonus: -0.03,
    qualityBonus: 5,
    partsRecoveryBonus: 0,
    action: 'vip',
  },
  {
    id: 'pickup_delivery',
    index: 40,
    category: 'management',
    name: 'Player Vehicle Pickup & Delivery',
    detail: 'The crew collects your car and returns it finished anywhere on your own property.',
    equipment: false,
    buildSpeedBonus: 0.006,
    qualityBonus: 1,
    partsRecoveryBonus: 0,
    action: 'pickup',
  },

  // 41-50 Advanced workshop systems
  {
    id: 'rare_parts_warehouse',
    index: 41,
    category: 'advanced',
    name: 'Rare Parts Warehouse',
    detail: 'Climate-controlled rare parts vault. Adds recovered stock and keeps scarce pieces out of the scrap bin.',
    equipment: true,
    buildSpeedBonus: 0.008,
    qualityBonus: 2,
    partsRecoveryBonus: 0.08,
    action: 'warehouse',
  },
  {
    id: 'parts_recycling',
    index: 42,
    category: 'advanced',
    name: 'Parts Recycling & Salvage Machine',
    detail: 'Separates, cleans and logs removed parts. Recover salvage without duplicating inventory.',
    equipment: true,
    buildSpeedBonus: 0.008,
    qualityBonus: 0,
    partsRecoveryBonus: 0.1,
    action: 'recycle',
  },
  {
    id: 'parts_identification',
    index: 43,
    category: 'advanced',
    name: 'Original Parts Identification',
    detail: 'Casting-number library and photo reference. Identifies original and matching-number components.',
    equipment: true,
    buildSpeedBonus: 0.006,
    qualityBonus: 2.5,
    partsRecoveryBonus: 0.03,
    action: 'identify',
  },
  {
    id: 'upholstery_room',
    index: 44,
    category: 'advanced',
    name: 'Vintage Upholstery Sewing Room',
    detail: 'Walking-foot machines, foam cutter and pattern table. Interiors are sewn in-house to original patterns.',
    equipment: true,
    buildSpeedBonus: 0.012,
    qualityBonus: 3,
    partsRecoveryBonus: 0.02,
    action: null,
  },
  {
    id: 'pinstriping_studio',
    index: 45,
    category: 'advanced',
    name: 'Custom Pinstriping Studio',
    detail: 'Striping bay with layout lights and a brush library. Hand-laid lines are cleaner and repeatable.',
    equipment: true,
    buildSpeedBonus: 0.006,
    qualityBonus: 2.5,
    partsRecoveryBonus: 0,
    action: null,
  },
  {
    id: 'inspection_certificates',
    index: 46,
    category: 'advanced',
    name: 'Restoration Inspection Certificates',
    detail: 'Documented inspection and numbered certificate issued for every finished player vehicle.',
    equipment: false,
    buildSpeedBonus: 0.004,
    qualityBonus: 1.5,
    partsRecoveryBonus: 0,
    action: 'certificates',
  },
  {
    id: 'night_shift',
    index: 47,
    category: 'advanced',
    name: 'Functional Night-Shift Mechanics',
    detail: 'Midge joins the night crew. Restoration keeps moving after dark with a night-work speed bonus.',
    equipment: false,
    buildSpeedBonus: 0.08,
    qualityBonus: 2,
    partsRecoveryBonus: 0,
    action: 'night_shift',
  },
  {
    id: 'skill_progression',
    index: 48,
    category: 'advanced',
    name: 'Mechanic Skill Progression',
    detail: 'Duke, Rae and the night crew earn experience for every stage. Higher skill means better work.',
    equipment: false,
    buildSpeedBonus: 0.008,
    qualityBonus: 2,
    partsRecoveryBonus: 0,
    action: 'skills',
  },
  {
    id: 'restoration_challenges',
    index: 49,
    category: 'advanced',
    name: 'Timed Personal Restoration Challenges',
    detail: 'Set a personal clock, finish the build and record your best time. No customers involved.',
    equipment: false,
    buildSpeedBonus: 0.006,
    qualityBonus: 0,
    partsRecoveryBonus: 0,
    action: 'challenge',
  },
  {
    id: 'presentation_area',
    index: 50,
    category: 'advanced',
    name: 'Finished Vehicle Presentation & Celebration',
    detail: 'Turntable, lights and a delivery reveal for your finished builds.',
    equipment: false,
    buildSpeedBonus: 0,
    qualityBonus: 2,
    partsRecoveryBonus: 0,
    action: 'presentation',
  },

  // Bonus: the requested engraver shop next to the main departments.
  {
    id: 'engraving_studio',
    index: 51,
    category: 'engraving',
    name: 'Royal Engraving Studio',
    detail: 'Hand-engraving bay for bumpers, quarter panels and wheel faces. Designs remain visible on the finished car.',
    equipment: true,
    buildSpeedBonus: 0.006,
    qualityBonus: 2,
    partsRecoveryBonus: 0,
    action: 'engrave',
  },
] as const;

export const FACILITY_FEATURE_INDEX = new Map(
  FACILITY_FEATURES.map((feature) => [feature.id, feature]),
);

export function getFacilityFeature(id: string): FacilityFeature | undefined {
  return FACILITY_FEATURE_INDEX.get(id);
}

export type FacilityMechanicId = 'duke' | 'rae' | 'midge';

export interface FacilityMechanic {
  id: FacilityMechanicId;
  name: string;
  role: string;
  shift: 'day' | 'night';
  xp: number;
  level: number;
  jobs: number;
}

export interface FacilityPartEntry {
  id: string;
  jobId: string;
  crateId: string;
  label: string;
  status: 'received' | 'installed' | 'recycled';
  at: number;
}

export interface FacilityPhoto {
  id: string;
  jobId: string;
  vehicleId: string;
  label: string;
  at: number;
}

export interface FacilityVehicleRecord {
  vehicleId: string;
  name: string;
  conditionScore: number;
  appraisedValue: number;
  qualityScore: number;
  warrantyMonths: number;
  certificateId: string | null;
  photos: FacilityPhoto[];
  displayed: boolean;
  engravingId: string | null;
  completedAt: number | null;
  jobs: number;
}

export interface FacilityEngravingDesign {
  id: string;
  label: string;
  detail: string;
  color: string;
  motif:
    | 'filigree'
    | 'scallops'
    | 'skull'
    | 'crown'
    | 'flames'
    | 'roses'
    | 'nautical'
    | 'dice'
    | 'gator';
}

export const FACILITY_ENGRAVING_DESIGNS: readonly FacilityEngravingDesign[] = [
  {
    id: 'royal_filigree',
    label: 'Royal Filigree',
    detail: 'Fine gold scrollwork on the bumpers and quarter panels.',
    color: '#e6c46a',
    motif: 'filigree',
  },
  {
    id: 'crescent_scallops',
    label: 'Crescent Scallops',
    detail: 'Classic scalloped panels with a cool silver edge.',
    color: '#dbeafe',
    motif: 'scallops',
  },
  {
    id: 'bayou_skull',
    label: 'Bayou Skull',
    detail: 'Hand-cut skull and crossed wrenches with a bone-white fill.',
    color: '#f5f0df',
    motif: 'skull',
  },
  {
    id: 'crown_royal',
    label: 'Crown Royal',
    detail: 'A gold crown with a jewelled band across the rear quarters.',
    color: '#f6c453',
    motif: 'crown',
  },
  {
    id: 'candy_flames',
    label: 'Candy Flames',
    detail: 'Layered flame licks that wrap the nose and wheel lips.',
    color: '#fb7185',
    motif: 'flames',
  },
  {
    id: 'swamp_roses',
    label: 'Swamp Roses',
    detail: 'Engraved roses and leaves with a rose-gold tint.',
    color: '#f9a8d4',
    motif: 'roses',
  },
  {
    id: 'nautical_star',
    label: 'Nautical Star',
    detail: 'A compass star and wave lines for bayou cruisers.',
    color: '#93c5fd',
    motif: 'nautical',
  },
  {
    id: 'lucky_dice',
    label: 'Lucky Dice',
    detail: 'Pair of engraved dice with pip inlays on the bumpers.',
    color: '#fef3c7',
    motif: 'dice',
  },
  {
    id: 'gator_crest',
    label: 'Gator Crest',
    detail: 'A scaled gator crest with a green-gold patina.',
    color: '#86efac',
    motif: 'gator',
  },
] as const;

export const FACILITY_ENGRAVING_BY_ID = new Map(
  FACILITY_ENGRAVING_DESIGNS.map((design) => [design.id, design]),
);

export interface FacilityEngravingJob {
  vehicleId: string;
  designId: string;
  progress: number;
  duration: number;
  startedAt: number;
}

export interface FacilityChallenge {
  active: boolean;
  targetSeconds: number;
  startedAt: number | null;
  bestSeconds: number | null;
  attempts: number;
}

export interface RestorationFacilityState {
  installedFeatureIds: string[];
  mechanics: FacilityMechanic[];
  parts: FacilityPartEntry[];
  vehicles: Record<string, FacilityVehicleRecord>;
  photos: FacilityPhoto[];
  displayedVehicleIds: string[];
  engravingJob: FacilityEngravingJob | null;
  challenge: FacilityChallenge;
  selectedVehicleId: string | null;
  jobsCompleted: number;
  recycledParts: number;
  warehouseParts: number;
  lastMessage: string;
}

export function createRestorationFacilityState(): RestorationFacilityState {
  return {
    installedFeatureIds: [],
    mechanics: [
      { id: 'duke', name: 'Duke', role: 'Body, paint & upholstery', shift: 'day', xp: 0, level: 1, jobs: 0 },
      { id: 'rae', name: 'Rae', role: 'Hydraulics, audio, rims & lights', shift: 'day', xp: 0, level: 1, jobs: 0 },
    ],
    parts: [],
    vehicles: {},
    photos: [],
    displayedVehicleIds: [],
    engravingJob: null,
    challenge: {
      active: false,
      targetSeconds: 240,
      startedAt: null,
      bestSeconds: null,
      attempts: 0,
    },
    selectedVehicleId: null,
    jobsCompleted: 0,
    recycledParts: 0,
    warehouseParts: 0,
    lastMessage: 'No restoration systems installed yet.',
  };
}

export function hasFacilityFeature(
  state: RestorationFacilityState,
  featureId: string,
): boolean {
  return state.installedFeatureIds.includes(featureId);
}

const EXPANSION_THRESHOLDS = [3, 9, 18, 28] as const;

export function getFacilityEquipmentCount(state: RestorationFacilityState): number {
  return state.installedFeatureIds.reduce((count, id) => {
    const feature = getFacilityFeature(id);
    return count + (feature?.equipment ? 1 : 0);
  }, 0);
}

export function getFacilityExpansionLevel(
  state: RestorationFacilityState,
): number {
  const equipment = getFacilityEquipmentCount(state);
  let level = 0;
  for (const threshold of EXPANSION_THRESHOLDS) {
    if (equipment >= threshold) level++;
  }
  return level;
}

export function getFacilityBayCount(state: RestorationFacilityState): number {
  // The existing shop has two bays; each expansion level reveals one of the
  // three physical annex bays, with level 4 completing the six-system wing.
  return 2 + Math.min(3, getFacilityExpansionLevel(state));
}

export interface FacilityStats {
  expansionLevel: number;
  bays: number;
  equipmentCount: number;
  installedCount: number;
  buildSpeedMultiplier: number;
  qualityBonus: number;
  partsRecovery: number;
  xpMultiplier: number;
  nightShiftActive: boolean;
  canEngrave: boolean;
}

export function getFacilityStats(state: RestorationFacilityState): FacilityStats {
  let speed = 1;
  let quality = 0;
  let recovery = 0;
  let nightShift = false;
  for (const id of state.installedFeatureIds) {
    const feature = getFacilityFeature(id);
    if (!feature) continue;
    speed += feature.buildSpeedBonus;
    quality += feature.qualityBonus;
    recovery += feature.partsRecoveryBonus;
    if (feature.action === 'night_shift') nightShift = true;
  }
  // Mechanic skill is a real multiplier on speed and quality.
  for (const mechanic of state.mechanics) {
    speed += Math.max(0, mechanic.level - 1) * 0.012;
    quality += Math.max(0, mechanic.level - 1) * 1.5;
  }
  return {
    expansionLevel: getFacilityExpansionLevel(state),
    bays: getFacilityBayCount(state),
    equipmentCount: getFacilityEquipmentCount(state),
    installedCount: state.installedFeatureIds.length,
    buildSpeedMultiplier: Math.max(0.72, Math.min(1.85, speed)),
    qualityBonus: Math.min(36, quality),
    partsRecovery: Math.max(0, Math.min(0.6, recovery)),
    xpMultiplier: nightShift ? 1.5 : 1,
    nightShiftActive: nightShift,
    canEngrave: hasFacilityFeature(state, 'engraving_studio'),
  };
}

export interface FacilityInstallResult {
  ok: boolean;
  reason?: string;
  feature?: FacilityFeature;
  expansionChanged: boolean;
  level: number;
}

export function installFacilityFeature(
  state: RestorationFacilityState,
  featureId: string,
): FacilityInstallResult {
  const feature = getFacilityFeature(featureId);
  if (!feature) {
    return { ok: false, reason: 'Unknown workshop system.', expansionChanged: false, level: getFacilityExpansionLevel(state) };
  }
  if (state.installedFeatureIds.includes(featureId)) {
    return { ok: false, reason: `${feature.name} is already installed.`, feature, expansionChanged: false, level: getFacilityExpansionLevel(state) };
  }
  const before = getFacilityExpansionLevel(state);
  state.installedFeatureIds.push(featureId);
  if (featureId === 'rare_parts_warehouse') state.warehouseParts += 6;
  if (featureId === 'night_shift') {
    if (!state.mechanics.some((mechanic) => mechanic.id === 'midge')) {
      state.mechanics.push({
        id: 'midge',
        name: 'Midge',
        role: 'Night shift mechanic',
        shift: 'night',
        xp: 0,
        level: 1,
        jobs: 0,
      });
    }
  }
  const after = getFacilityExpansionLevel(state);
  state.lastMessage = `${feature.name} installed.`;
  return {
    ok: true,
    feature,
    expansionChanged: after > before,
    level: after,
  };
}

export function mechanicLevelFromXp(xp: number): number {
  return 1 + Math.floor(Math.max(0, xp) / 120);
}

export function awardFacilityMechanicXp(
  state: RestorationFacilityState,
  amount: number,
): FacilityMechanic[] {
  if (!hasFacilityFeature(state, 'skill_progression')) return [];
  const stats = getFacilityStats(state);
  const leveled: FacilityMechanic[] = [];
  for (const mechanic of state.mechanics) {
    const before = mechanic.level;
    mechanic.xp += Math.max(0, Math.round(amount * stats.xpMultiplier));
    mechanic.level = mechanicLevelFromXp(mechanic.xp);
    if (mechanic.level > before) leveled.push(mechanic);
  }
  return leveled;
}

export function recordFacilityPhoto(
  state: RestorationFacilityState,
  params: { jobId: string; vehicleId: string; label: string; at: number },
): FacilityPhoto | null {
  if (!hasFacilityFeature(state, 'progress_photography')) return null;
  const photo: FacilityPhoto = {
    id: `${params.jobId}-${params.label}-${state.photos.length}`,
    jobId: params.jobId,
    vehicleId: params.vehicleId,
    label: params.label,
    at: params.at,
  };
  state.photos.push(photo);
  if (state.photos.length > 80) state.photos.shift();
  const record = state.vehicles[params.vehicleId];
  if (record) {
    record.photos.push(photo);
    if (record.photos.length > 24) record.photos.shift();
  }
  return photo;
}

export function recordFacilityPartReceived(
  state: RestorationFacilityState,
  params: { jobId: string; crateId: string; label: string; at: number },
): FacilityPartEntry | null {
  const exists = state.parts.some(
    (part) => part.jobId === params.jobId && part.crateId === params.crateId,
  );
  if (exists) return null;
  const part: FacilityPartEntry = {
    id: `part-${state.parts.length}-${params.jobId}-${params.crateId}`,
    jobId: params.jobId,
    crateId: params.crateId,
    label: params.label,
    status: 'received',
    at: params.at,
  };
  state.parts.push(part);
  return part;
}

export function consumeFacilityPart(
  state: RestorationFacilityState,
  crateId: string,
  jobId: string,
): FacilityPartEntry | null {
  const part = state.parts.find(
    (entry) =>
      entry.jobId === jobId &&
      entry.crateId === crateId &&
      entry.status === 'received',
  );
  if (!part) return null;
  part.status = 'installed';
  return part;
}

export interface FacilityRecycleResult {
  ok: boolean;
  reason?: string;
  recycled: number;
  recovered: number;
}

export function recycleFacilitySalvage(
  state: RestorationFacilityState,
  count = 2,
): FacilityRecycleResult {
  if (!hasFacilityFeature(state, 'parts_recycling')) {
    return { ok: false, reason: 'Install the parts recycling machine first.', recycled: 0, recovered: 0 };
  }
  const candidates = state.parts.filter((part) => part.status === 'installed').slice(0, count);
  if (candidates.length === 0) {
    return { ok: false, reason: 'No installed parts are ready for recycling.', recycled: 0, recovered: 0 };
  }
  const stats = getFacilityStats(state);
  let recovered = 0;
  for (const part of candidates) {
    part.status = 'recycled';
    state.recycledParts++;
    recovered += 1 + Math.round(stats.partsRecovery * 3);
    if (hasFacilityFeature(state, 'rare_parts_warehouse')) state.warehouseParts++;
  }
  state.lastMessage = `Recycled ${candidates.length} part${candidates.length === 1 ? '' : 's'} into ${recovered} recovered unit${recovered === 1 ? '' : 's'}.`;
  return { ok: true, recycled: candidates.length, recovered };
}

export interface FacilityCompletionInput {
  vehicleId: string;
  name: string;
  damageScore: number;
  valueBase: number;
  at: number;
  elapsedSeconds: number;
}

export interface FacilityCompletionResult {
  record: FacilityVehicleRecord;
  quality: number;
  leveledMechanics: FacilityMechanic[];
  challenge: { completed: boolean; seconds: number | null; best: number | null; beat: boolean };
}

export function recordFacilityCompletion(
  state: RestorationFacilityState,
  input: FacilityCompletionInput,
): FacilityCompletionResult {
  const stats = getFacilityStats(state);
  const damagePenalty = Math.min(16, Math.max(0, input.damageScore));
  const vip = hasFacilityFeature(state, 'vip_restoration') ? 5 : 0;
  const presentation = hasFacilityFeature(state, 'presentation_area') ? 2 : 0;
  const quality = Math.max(
    55,
    Math.min(100, Math.round(70 + stats.qualityBonus + vip + presentation - damagePenalty * 0.45)),
  );
  const warrantyMonths = hasFacilityFeature(state, 'quality_warranty')
    ? quality >= 94
      ? 36
      : quality >= 84
        ? 24
        : 12
    : 0;
  const certificateId = hasFacilityFeature(state, 'inspection_certificates')
    ? `BRC-${String(state.jobsCompleted + 1).padStart(4, '0')}-${input.vehicleId
        .slice(-4)
        .toUpperCase()}`
    : null;

  const previous = state.vehicles[input.vehicleId];
  const record: FacilityVehicleRecord = previous ?? {
    vehicleId: input.vehicleId,
    name: input.name,
    conditionScore: 70,
    appraisedValue: 0,
    qualityScore: 70,
    warrantyMonths: 0,
    certificateId: null,
    photos: [],
    displayed: false,
    engravingId: null,
    completedAt: null,
    jobs: 0,
  };
  record.name = input.name;
  record.conditionScore = Math.max(35, Math.min(100, Math.round(100 - damagePenalty)));
  record.qualityScore = quality;
  record.warrantyMonths = warrantyMonths;
  record.certificateId = certificateId;
  record.completedAt = input.at;
  record.jobs += 1;
  record.appraisedValue = Math.round(
    input.valueBase +
      quality * 140 +
      Math.max(0, 100 - record.conditionScore) * 90,
  );
  record.photos = state.photos.filter((photo) => photo.vehicleId === input.vehicleId).slice(-24);
  state.vehicles[input.vehicleId] = record;
  state.jobsCompleted += 1;
  state.lastMessage = `${input.name} completed with a ${quality}/100 quality score.`;

  const leveledMechanics = awardFacilityMechanicXp(state, 28);
  for (const mechanic of state.mechanics) mechanic.jobs += 1;

  let challenge: FacilityCompletionResult['challenge'] = {
    completed: false,
    seconds: null,
    best: state.challenge.bestSeconds,
    beat: false,
  };
  if (state.challenge.active) {
    const seconds = Math.max(1, Math.round(input.elapsedSeconds));
    const before = state.challenge.bestSeconds;
    state.challenge.active = false;
    state.challenge.startedAt = null;
    state.challenge.bestSeconds =
      before === null ? seconds : Math.min(before, seconds);
    challenge = {
      completed: true,
      seconds,
      best: state.challenge.bestSeconds,
      beat: before === null || seconds < before,
    };
  }
  return { record, quality, leveledMechanics, challenge };
}

/** Keeps records, photos and engraving attached when a finished car is renamed. */
export function reassignFacilityVehicle(
  state: RestorationFacilityState,
  oldId: string,
  newId: string,
): void {
  const record = state.vehicles[oldId];
  if (record) {
    delete state.vehicles[oldId];
    record.vehicleId = newId;
    state.vehicles[newId] = record;
  }
  for (const photo of state.photos) {
    if (photo.vehicleId === oldId) photo.vehicleId = newId;
  }
  state.displayedVehicleIds = state.displayedVehicleIds.map((id) =>
    id === oldId ? newId : id,
  );
  if (state.selectedVehicleId === oldId) state.selectedVehicleId = newId;
  if (state.engravingJob?.vehicleId === oldId) state.engravingJob.vehicleId = newId;
}

export function appraiseFacilityVehicle(
  state: RestorationFacilityState,
  params: { vehicleId: string; name: string; conditionScore: number; baseValue: number },
): { ok: boolean; record?: FacilityVehicleRecord; reason?: string } {
  if (!hasFacilityFeature(state, 'condition_appraisal')) {
    return { ok: false, reason: 'Install the vehicle appraisal system first.' };
  }
  const record = state.vehicles[params.vehicleId] ?? {
    vehicleId: params.vehicleId,
    name: params.name,
    conditionScore: params.conditionScore,
    appraisedValue: 0,
    qualityScore: 0,
    warrantyMonths: 0,
    certificateId: null,
    photos: [],
    displayed: false,
    engravingId: null,
    completedAt: null,
    jobs: 0,
  };
  record.name = params.name;
  record.conditionScore = Math.max(1, Math.min(100, Math.round(params.conditionScore)));
  record.appraisedValue = Math.round(
    params.baseValue * (0.35 + record.conditionScore / 100) +
      record.qualityScore * 90,
  );
  state.vehicles[params.vehicleId] = record;
  state.lastMessage = `${params.name} appraised at $${record.appraisedValue.toLocaleString()}.`;
  return { ok: true, record };
}

export function setFacilityDisplay(
  state: RestorationFacilityState,
  vehicleId: string,
  displayed: boolean,
): { ok: boolean; reason?: string } {
  if (!hasFacilityFeature(state, 'display_area')) {
    return { ok: false, reason: 'Install the finished vehicle display area first.' };
  }
  const record = state.vehicles[vehicleId];
  if (!record) return { ok: false, reason: 'Appraise or finish that vehicle first.' };
  record.displayed = displayed;
  state.displayedVehicleIds = state.displayedVehicleIds.filter((id) => id !== vehicleId);
  if (displayed) state.displayedVehicleIds.push(vehicleId);
  state.lastMessage = displayed
    ? `${record.name} moved onto the presentation pad.`
    : `${record.name} moved back to normal parking.`;
  return { ok: true };
}

export function startFacilityChallenge(
  state: RestorationFacilityState,
  at: number,
): { ok: boolean; reason?: string } {
  if (!hasFacilityFeature(state, 'restoration_challenges')) {
    return { ok: false, reason: 'Install the personal challenge system first.' };
  }
  if (state.challenge.active) {
    return { ok: false, reason: 'A personal restoration challenge is already running.' };
  }
  state.challenge.active = true;
  state.challenge.startedAt = at;
  state.challenge.attempts += 1;
  state.lastMessage = `Personal challenge started: finish the next build under ${formatFacilityTime(state.challenge.targetSeconds)}.`;
  return { ok: true };
}

export function formatFacilityTime(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${minutes}:${rest.toString().padStart(2, '0')}`;
}

export function startFacilityEngraving(
  state: RestorationFacilityState,
  vehicleId: string,
  designId: string,
  at: number,
): { ok: boolean; reason?: string; job?: FacilityEngravingJob } {
  if (!hasFacilityFeature(state, 'engraving_studio')) {
    return { ok: false, reason: 'Install the Royal Engraving Studio first.' };
  }
  if (state.engravingJob) {
    return { ok: false, reason: 'The engraver is already working on a vehicle.' };
  }
  if (!FACILITY_ENGRAVING_BY_ID.has(designId)) {
    return { ok: false, reason: 'Unknown engraving design.' };
  }
  const record = state.vehicles[vehicleId];
  if (!record) {
    return { ok: false, reason: 'Finish or appraise that vehicle before engraving it.' };
  }
  const job: FacilityEngravingJob = {
    vehicleId,
    designId,
    progress: 0,
    duration: 22,
    startedAt: at,
  };
  state.engravingJob = job;
  state.lastMessage = `Engraver laying out ${FACILITY_ENGRAVING_BY_ID.get(designId)?.label} on ${record.name}.`;
  return { ok: true, job };
}

export function advanceFacilityEngraving(
  state: RestorationFacilityState,
  dt: number,
): { job: FacilityEngravingJob; design: FacilityEngravingDesign } | null {
  const job = state.engravingJob;
  if (!job) return null;
  job.progress = Math.min(1, job.progress + Math.max(0, dt) / job.duration);
  if (job.progress < 1) return null;
  const design = FACILITY_ENGRAVING_BY_ID.get(job.designId);
  state.engravingJob = null;
  if (!design) return null;
  const record = state.vehicles[job.vehicleId];
  if (record) {
    record.engravingId = design.id;
    record.qualityScore = Math.min(100, record.qualityScore + 2);
  }
  state.lastMessage = `${record?.name ?? 'The vehicle'} engraved with ${design.label}.`;
  return { job: { ...job, progress: 1 }, design };
}

export interface RestorationFacilitySnapshot {
  installedFeatureIds: string[];
  installedCount: number;
  expansionLevel: number;
  bays: number;
  equipmentCount: number;
  stats: FacilityStats;
  mechanics: FacilityMechanic[];
  records: FacilityVehicleRecord[];
  photos: FacilityPhoto[];
  displayedVehicleIds: string[];
  engravingJob: FacilityEngravingJob | null;
  challenge: FacilityChallenge;
  parts: FacilityPartEntry[];
  partsReceived: number;
  partsInstalled: number;
  partsRecycled: number;
  recycledParts: number;
  warehouseParts: number;
  jobsCompleted: number;
  selectedVehicleId: string | null;
  lastMessage: string;
}

/** Rehydrates a saved facility without trusting stale ids or partial objects. */
export function restoreRestorationFacilityState(
  raw: Partial<RestorationFacilityState> | null | undefined,
): RestorationFacilityState {
  const base = createRestorationFacilityState();
  if (!raw) return base;
  const installedFeatureIds = Array.isArray(raw.installedFeatureIds)
    ? raw.installedFeatureIds.filter((id) => FACILITY_FEATURE_INDEX.has(id))
    : [];
  const mechanics =
    Array.isArray(raw.mechanics) && raw.mechanics.length > 0
      ? raw.mechanics
          .filter((mechanic) => mechanic && mechanic.id)
          .map((mechanic) => ({
            ...mechanic,
            shift: (mechanic.shift === 'night' ? 'night' : 'day') as
              | 'day'
              | 'night',
            level: mechanicLevelFromXp(mechanic.xp ?? 0),
            xp: Math.max(0, mechanic.xp ?? 0),
            jobs: Math.max(0, mechanic.jobs ?? 0),
          }))
      : base.mechanics;
  const vehicles: Record<string, FacilityVehicleRecord> = {};
  if (raw.vehicles && typeof raw.vehicles === 'object') {
    for (const [id, record] of Object.entries(raw.vehicles)) {
      if (!record || typeof record !== 'object') continue;
      vehicles[id] = {
        ...record,
        vehicleId: id,
        photos: Array.isArray(record.photos) ? record.photos : [],
        displayed: Boolean(record.displayed),
        engravingId:
          record.engravingId && FACILITY_ENGRAVING_BY_ID.has(record.engravingId)
            ? record.engravingId
            : null,
        warrantyMonths: Math.max(0, record.warrantyMonths ?? 0),
        jobs: Math.max(0, record.jobs ?? 0),
      };
    }
  }
  return {
    ...base,
    ...raw,
    installedFeatureIds,
    mechanics,
    parts: Array.isArray(raw.parts) ? raw.parts : [],
    vehicles,
    photos: Array.isArray(raw.photos) ? raw.photos : [],
    displayedVehicleIds: Array.isArray(raw.displayedVehicleIds)
      ? raw.displayedVehicleIds.filter((id) => Boolean(vehicles[id]))
      : [],
    engravingJob:
      raw.engravingJob && FACILITY_ENGRAVING_BY_ID.has(raw.engravingJob.designId)
        ? { ...raw.engravingJob }
        : null,
    challenge: { ...base.challenge, ...(raw.challenge ?? {}) },
    jobsCompleted: Math.max(0, raw.jobsCompleted ?? 0),
    recycledParts: Math.max(0, raw.recycledParts ?? 0),
    warehouseParts: Math.max(0, raw.warehouseParts ?? 0),
    selectedVehicleId: raw.selectedVehicleId ?? null,
  };
}

export function getRestorationFacilitySnapshot(
  state: RestorationFacilityState,
): RestorationFacilitySnapshot {
  return {
    installedFeatureIds: [...state.installedFeatureIds],
    installedCount: state.installedFeatureIds.length,
    expansionLevel: getFacilityExpansionLevel(state),
    bays: getFacilityBayCount(state),
    equipmentCount: getFacilityEquipmentCount(state),
    stats: getFacilityStats(state),
    mechanics: state.mechanics.map((mechanic) => ({ ...mechanic })),
    records: Object.values(state.vehicles).map((record) => ({
      ...record,
      photos: [...record.photos],
    })),
    photos: state.photos.map((photo) => ({ ...photo })),
    displayedVehicleIds: [...state.displayedVehicleIds],
    engravingJob: state.engravingJob ? { ...state.engravingJob } : null,
    challenge: { ...state.challenge },
    parts: state.parts.map((part) => ({ ...part })),
    partsReceived: state.parts.filter((part) => part.status !== 'recycled').length,
    partsInstalled: state.parts.filter((part) => part.status === 'installed').length,
    partsRecycled: state.parts.filter((part) => part.status === 'recycled').length,
    recycledParts: state.recycledParts,
    warehouseParts: state.warehouseParts,
    jobsCompleted: state.jobsCompleted,
    selectedVehicleId: state.selectedVehicleId,
    lastMessage: state.lastMessage,
  };
}
