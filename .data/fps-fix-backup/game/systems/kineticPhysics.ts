import { BeltLink, KineticNode, KineticNodeKind } from '../types';
import { getTerrainHeight, getWaterLevelAt, isFreshwaterAt } from '../world/terrain';

export interface KineticSpec {
  kind: KineticNodeKind;
  name: string;
  baseRpm: number;
  baseTorque: number;
  gearRatio: number;
  couplingRadius: number;
  isGear: boolean;
  isPipe: boolean;
  isPulley: boolean;
  isConsumer: boolean;
}

export const KINETIC_SPECS: Record<KineticNodeKind, KineticSpec> = {
  water_wheel: {
    kind: 'water_wheel',
    name: 'Hydro Waterwheel',
    baseRpm: 36,
    baseTorque: 140,
    gearRatio: 1.0,
    couplingRadius: 4.5,
    isGear: false,
    isPipe: true,
    isPulley: false,
    isConsumer: false,
  },
  steam_boiler: {
    kind: 'steam_boiler',
    name: 'Pressurized Steam Boiler',
    baseRpm: 0,
    baseTorque: 0,
    gearRatio: 1.0,
    couplingRadius: 4.8,
    isGear: false,
    isPipe: true,
    isPulley: false,
    isConsumer: false,
  },
  steam_engine: {
    kind: 'steam_engine',
    name: 'Steam Piston Engine',
    baseRpm: 68,
    baseTorque: 260,
    gearRatio: 1.0,
    couplingRadius: 4.6,
    isGear: false,
    isPipe: true,
    isPulley: true,
    isConsumer: false,
  },
  drive_shaft: {
    kind: 'drive_shaft',
    name: 'Iron Drive Shaft',
    baseRpm: 0,
    baseTorque: 0,
    gearRatio: 1.0,
    couplingRadius: 4.6,
    isGear: false,
    isPipe: false,
    isPulley: false,
    isConsumer: false,
  },
  gear_box: {
    kind: 'gear_box',
    name: 'Cogwheel Gearbox (2:1)',
    baseRpm: 0,
    baseTorque: 0,
    gearRatio: 1.5, // Steps speed up while meshing in opposite spin direction
    couplingRadius: 4.8,
    isGear: true,
    isPipe: false,
    isPulley: true,
    isConsumer: false,
  },
  belt_pulley: {
    kind: 'belt_pulley',
    name: 'Valley Belt Pulley',
    baseRpm: 0,
    baseTorque: 0,
    gearRatio: 1.0,
    couplingRadius: 4.6,
    isGear: false,
    isPipe: false,
    isPulley: true,
    isConsumer: false,
  },
  fluid_pipe: {
    kind: 'fluid_pipe',
    name: 'Steam & Fluid Pipe',
    baseRpm: 0,
    baseTorque: 0,
    gearRatio: 1.0,
    couplingRadius: 4.8,
    isGear: false,
    isPipe: true,
    isPulley: false,
    isConsumer: false,
  },
  auto_assembler: {
    kind: 'auto_assembler',
    name: 'Automated Vehicle Assembler',
    baseRpm: 0,
    baseTorque: 0,
    gearRatio: 1.0,
    couplingRadius: 4.8,
    isGear: false,
    isPipe: true,
    isPulley: true,
    isConsumer: true,
  },
};

export const BELT_MAX_SPAN_METERS = 52;

/**
 * Solves physical pressure (waterFlow & steamPsi) across fluid pipes, boilers, and engines,
 * then resolves rotational mechanical torque/RPM across shafts, cogwheel gearboxes,
 * and long-distance valley belt pulley links.
 */
export function solveKineticNetwork(
  nodes: KineticNode[],
): {
  belts: BeltLink[];
  totalRpmOutput: number;
  maxSteamPsi: number;
  activeAssemblers: number;
} {
  for (const n of nodes) {
    n.rpm = 0;
    n.torque = 0;
    n.steamPsi = 0;
    n.waterFlow = 0;
    n.active = false;
    n.stalled = false;
    n.connectedIds = [];
  }

  if (nodes.length === 0) {
    return { belts: [], totalRpmOutput: 0, maxSteamPsi: 0, activeAssemblers: 0 };
  }

  // 1. Seed water flow at rivers/lakes/waterwheels and steam PSI at boilers
  const fluidQueue: KineticNode[] = [];
  for (const n of nodes) {
    if (n.kind === 'water_wheel') {
      const groundY = getTerrainHeight(n.x, n.z);
      const waterY = getWaterLevelAt(n.x, n.z);
      const inFlowingWater = waterY > groundY - 0.15 || isFreshwaterAt(n.x, n.z);
      if (inFlowingWater) {
        n.waterFlow = 1.0;
        n.active = true;
        fluidQueue.push(n);
      }
    } else if (n.kind === 'steam_boiler') {
      n.steamPsi = 88;
      n.waterFlow = 0.5; // Internal condensate feed even before river piping
      n.active = true;
      fluidQueue.push(n);
    }
  }

  // Propagate steam PSI and river water pressure along connected fluid pipes & machinery
  let fIdx = 0;
  while (fIdx < fluidQueue.length) {
    const cur = fluidQueue[fIdx++];
    const curSpec = KINETIC_SPECS[cur.kind];
    if (!curSpec.isPipe) continue;

    for (const other of nodes) {
      if (other.id === cur.id) continue;
      const otherSpec = KINETIC_SPECS[other.kind];
      if (!otherSpec.isPipe) continue;

      const dist = Math.hypot(other.x - cur.x, other.y - cur.y, other.z - cur.z);
      if (dist > Math.max(curSpec.couplingRadius, otherSpec.couplingRadius) + 0.6) continue;

      if (!cur.connectedIds.includes(other.id)) cur.connectedIds.push(other.id);
      if (!other.connectedIds.includes(cur.id)) other.connectedIds.push(cur.id);

      const nextWater = cur.waterFlow * 0.94;
      const waterBonus = cur.waterFlow > 0.2 ? 1.0 : 0.72;
      const nextPsi = cur.steamPsi * 0.92 * waterBonus;

      let changed = false;
      if (nextWater > other.waterFlow + 0.01) {
        other.waterFlow = Math.min(1, nextWater);
        changed = true;
      }
      if (nextPsi > other.steamPsi + 0.5) {
        other.steamPsi = Math.min(100, nextPsi);
        changed = true;
      }
      if (changed) {
        if (other.kind === 'fluid_pipe' && (other.steamPsi >= 10 || other.waterFlow >= 0.15)) {
          other.active = true;
        }
        fluidQueue.push(other);
      }
    }
  }

  // Boost boilers if piped with river water & activate steam engines fed with >= 18 PSI
  const rotQueue: KineticNode[] = [];
  for (const n of nodes) {
    if (n.kind === 'water_wheel' && n.waterFlow > 0.25) {
      n.rpm = KINETIC_SPECS.water_wheel.baseRpm;
      n.torque = KINETIC_SPECS.water_wheel.baseTorque;
      n.active = true;
      rotQueue.push(n);
    } else if (n.kind === 'steam_boiler') {
      if (n.waterFlow >= 0.7) {
        n.steamPsi = 100;
      }
    } else if (n.kind === 'steam_engine') {
      if (n.steamPsi >= 18) {
        const pressureRatio = Math.min(1.25, n.steamPsi / 78);
        n.rpm = Math.round(KINETIC_SPECS.steam_engine.baseRpm * pressureRatio);
        n.torque = Math.round(KINETIC_SPECS.steam_engine.baseTorque * pressureRatio);
        n.active = true;
        rotQueue.push(n);
      } else {
        n.stalled = true;
      }
    }
  }

  // 2. Build physical long-distance valley belt pulley linkages
  const beltPairs: { a: KineticNode; b: KineticNode; dist: number }[] = [];
  const pulleyNodes = nodes.filter(
    (n) => KINETIC_SPECS[n.kind].isPulley && n.kind !== 'auto_assembler',
  );
  // Allow belt connections between belt_pulleys, and from belt_pulleys to/from engines, gearboxes, assemblers
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    if (a.kind !== 'belt_pulley') continue;
    // Find up to 2 nearest pulley-compatible partners within belt span range (ignoring immediate < 3.6m shaft couplings)
    const candidates: { node: KineticNode; dist: number }[] = [];
    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue;
      const b = nodes[j];
      if (!KINETIC_SPECS[b.kind].isPulley) continue;
      if (b.kind === 'belt_pulley' && j < i) continue; // Dedupe pulley-to-pulley pair
      const d = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
      if (d >= 3.2 && d <= BELT_MAX_SPAN_METERS) {
        candidates.push({ node: b, dist: d });
      }
    }
    candidates.sort((x, y) => x.dist - y.dist);
    for (const c of candidates.slice(0, 2)) {
      beltPairs.push({ a, b: c.node, dist: c.dist });
    }
  }

  // Fallback check: keep belt pairs unique
  void pulleyNodes;

  // 3. Propagate rotational torque & RPM via direct shaft/gear contact AND valley belts
  let rIdx = 0;
  while (rIdx < rotQueue.length) {
    const cur = rotQueue[rIdx++];
    const curSpec = KINETIC_SPECS[cur.kind];
    if (Math.abs(cur.rpm) < 1) continue;

    // A) Direct mechanical coupling (shafts, cogwheel gears, engines, waterwheels, assemblers)
    if (cur.kind !== 'fluid_pipe' && cur.kind !== 'steam_boiler') {
      for (const other of nodes) {
        if (other.id === cur.id) continue;
        if (other.kind === 'fluid_pipe' || other.kind === 'steam_boiler') continue;
        const otherSpec = KINETIC_SPECS[other.kind];
        const dist = Math.hypot(other.x - cur.x, other.y - cur.y, other.z - cur.z);
        if (dist > Math.max(curSpec.couplingRadius, otherSpec.couplingRadius)) continue;

        if (!cur.connectedIds.includes(other.id)) cur.connectedIds.push(other.id);
        if (!other.connectedIds.includes(cur.id)) other.connectedIds.push(cur.id);

        // Gears reverse rotation polarity and multiply/step RPM
        const polarity = otherSpec.isGear ? -1 : 1;
        const speedGain = otherSpec.isGear ? otherSpec.gearRatio : 0.96;
        const nextRpm = Math.max(-160, Math.min(160, cur.rpm * speedGain * polarity));
        const nextTorque = Math.max(20, Math.round(cur.torque * 0.92));

        if (Math.abs(nextRpm) > Math.abs(other.rpm) + 0.5) {
          other.rpm = Math.round(nextRpm);
          other.torque = nextTorque;
          other.active = true;
          other.stalled = false;
          rotQueue.push(other);
        }
      }
    }

    // B) Physical long-distance Valley Belt transmission
    for (const bp of beltPairs) {
      let partner: KineticNode | null = null;
      if (bp.a.id === cur.id) partner = bp.b;
      else if (bp.b.id === cur.id) partner = bp.a;
      if (!partner) continue;

      if (!cur.connectedIds.includes(partner.id)) cur.connectedIds.push(partner.id);
      if (!partner.connectedIds.includes(cur.id)) partner.connectedIds.push(cur.id);

      const beltEfficiency = Math.max(0.75, 1 - bp.dist / 180);
      const nextRpm = Math.round(cur.rpm * beltEfficiency);
      const nextTorque = Math.round(cur.torque * beltEfficiency);
      if (Math.abs(nextRpm) > Math.abs(partner.rpm) + 0.5) {
        partner.rpm = nextRpm;
        partner.torque = nextTorque;
        partner.active = true;
        partner.stalled = false;
        rotQueue.push(partner);
      }
    }
  }

  // Finalize BeltLink visual data & HUD aggregates
  const seenBelts = new Set<string>();
  const belts: BeltLink[] = [];
  for (const bp of beltPairs) {
    const key =
      bp.a.id < bp.b.id ? `${bp.a.id}__${bp.b.id}` : `${bp.b.id}__${bp.a.id}`;
    if (seenBelts.has(key)) continue;
    seenBelts.add(key);
    const rpm = Math.abs(bp.a.rpm) >= Math.abs(bp.b.rpm) ? bp.a.rpm : bp.b.rpm;
    const hA = bp.a.kind === 'belt_pulley' ? 2.1 : 1.05;
    const hB = bp.b.kind === 'belt_pulley' ? 2.1 : 1.05;
    belts.push({
      id: key,
      fromId: bp.a.id,
      toId: bp.b.id,
      fromX: bp.a.x,
      fromY: bp.a.y + hA,
      fromZ: bp.a.z,
      toX: bp.b.x,
      toY: bp.b.y + hB,
      toZ: bp.b.z,
      distance: bp.dist,
      active: Math.abs(rpm) >= 8,
      rpm,
    });
  }

  let totalRpmOutput = 0;
  let maxSteamPsi = 0;
  let activeAssemblers = 0;
  for (const n of nodes) {
    if (n.kind === 'water_wheel' || n.kind === 'steam_engine') {
      totalRpmOutput += Math.abs(n.rpm);
    }
    if (n.steamPsi > maxSteamPsi) maxSteamPsi = Math.round(n.steamPsi);
    if (n.kind === 'auto_assembler') {
      if (Math.abs(n.rpm) >= 12) {
        n.active = true;
        activeAssemblers += 1;
      } else {
        n.stalled = true;
      }
    }
  }

  return { belts, totalRpmOutput, maxSteamPsi, activeAssemblers };
}
