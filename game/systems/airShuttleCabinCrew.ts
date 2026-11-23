import type { ItemId } from '../types';

export type CabinCrewAgentId = 'amara' | 'celeste';

export interface CabinCrewPoint {
  x: number;
  z: number;
}

export interface CabinCrewPlate {
  id: number;
  orderId: number;
  itemId: ItemId;
  tableX: number;
  tableZ: number;
  ready: boolean;
  dirty: boolean;
}

export interface CabinCrewOrder {
  id: number;
  itemId: ItemId;
  tableX: number;
  tableZ: number;
  agentId: CabinCrewAgentId;
  drink: boolean;
  phase:
    | 'queued'
    | 'to_galley'
    | 'picking_up'
    | 'to_table'
    | 'served'
    | 'collecting'
    | 'collected'
    | 'done';
}

export type CabinCrewEvent =
  | { type: 'plate_placed'; plate: CabinCrewPlate; agentId: CabinCrewAgentId }
  | { type: 'plate_collected'; plate: CabinCrewPlate; agentId: CabinCrewAgentId };

export interface CabinCrewAgentSnapshot {
  id: CabinCrewAgentId;
  x: number;
  z: number;
  carrying: boolean;
  busy: boolean;
}

interface AgentTask {
  orderId: number;
  phase:
    | 'to_galley'
    | 'picking_up'
    | 'to_table'
    | 'serving'
    | 'returning'
    | 'collecting'
    | 'to_galley_return';
  timer: number;
}

interface CrewAgent {
  id: CabinCrewAgentId;
  x: number;
  z: number;
  homeX: number;
  homeZ: number;
  path: CabinCrewPoint[];
  task: AgentTask | null;
  carrying: boolean;
}

const GALLEY: CabinCrewPoint = { x: -0.82, z: 3.22 };
const AMARA_HOME: CabinCrewPoint = { x: 0.04, z: 1.35 };
const CELESTE_HOME: CabinCrewPoint = { x: 0.45, z: -2.42 };
const AISLE_FRONT_Z = 2.82;
const AISLE_REAR_Z = -2.62;
const WALK_SPEED = 0.82;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function distance(a: CabinCrewPoint, b: CabinCrewPoint): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

/**
 * Collision-aware cabin crew routing. Crew walk the aisle waypoint spine and
 * step out only at a table or fixture, never straight through the seats,
 * partitions or each other.
 */
export class AirShuttleCabinCrewSystem {
  private nextId = 1;
  private events: CabinCrewEvent[] = [];
  private orders: CabinCrewOrder[] = [];
  private plates: CabinCrewPlate[] = [];
  private agents: Record<CabinCrewAgentId, CrewAgent> = {
    amara: {
      id: 'amara',
      x: AMARA_HOME.x,
      z: AMARA_HOME.z,
      homeX: AMARA_HOME.x,
      homeZ: AMARA_HOME.z,
      path: [],
      task: null,
      carrying: false,
    },
    celeste: {
      id: 'celeste',
      x: CELESTE_HOME.x,
      z: CELESTE_HOME.z,
      homeX: CELESTE_HOME.x,
      homeZ: CELESTE_HOME.z,
      path: [],
      task: null,
      carrying: false,
    },
  };

  reset(): void {
    this.nextId = 1;
    this.events = [];
    this.orders = [];
    this.plates = [];
    for (const agent of Object.values(this.agents)) {
      agent.x = agent.homeX;
      agent.z = agent.homeZ;
      agent.path = [];
      agent.task = null;
      agent.carrying = false;
    }
  }

  getAgentPosition(id: CabinCrewAgentId): CabinCrewPoint {
    const agent = this.agents[id];
    return { x: agent.x, z: agent.z };
  }

  getAgentSnapshots(): CabinCrewAgentSnapshot[] {
    return (Object.keys(this.agents) as CabinCrewAgentId[]).map((id) => {
      const agent = this.agents[id];
      return {
        id,
        x: agent.x,
        z: agent.z,
        carrying: agent.carrying,
        busy: agent.task !== null,
      };
    });
  }

  getPlates(): CabinCrewPlate[] {
    return this.plates.map((plate) => ({ ...plate }));
  }

  getReadyPlate(itemId?: ItemId): CabinCrewPlate | null {
    const plate = this.plates.find(
      (entry) => entry.ready && (!itemId || entry.itemId === itemId),
    );
    return plate ? { ...plate } : null;
  }

  getPlate(id: number): CabinCrewPlate | null {
    const plate = this.plates.find((entry) => entry.id === id);
    return plate ? { ...plate } : null;
  }

  getOrderForAgent(id: CabinCrewAgentId): CabinCrewOrder | null {
    const order = this.orders.find(
      (entry) => entry.agentId === id && !['served', 'collected', 'done'].includes(entry.phase),
    );
    return order ? { ...order } : null;
  }

  hasPendingService(id: CabinCrewAgentId): boolean {
    return this.getOrderForAgent(id) !== null || this.agents[id].task !== null;
  }

  request(
    itemId: ItemId,
    tableX: number,
    tableZ: number,
    drink = false,
    agentId: CabinCrewAgentId = drink ? 'celeste' : 'amara',
  ): CabinCrewOrder {
    const order: CabinCrewOrder = {
      id: this.nextId++,
      itemId,
      tableX,
      tableZ,
      agentId,
      drink,
      phase: 'queued',
    };
    this.orders.push(order);
    const agent = this.agents[agentId];
    if (!agent.task) this.startGalleyRun(agent, order);
    return { ...order };
  }

  consumePlate(plateId: number): CabinCrewPlate | null {
    const plate = this.plates.find((entry) => entry.id === plateId);
    if (!plate || !plate.ready) return null;
    plate.ready = false;
    plate.dirty = true;
    return { ...plate };
  }

  collectPlate(plateId: number): boolean {
    const plate = this.plates.find((entry) => entry.id === plateId);
    if (!plate || !plate.dirty) return false;
    const order = this.orders.find((entry) => entry.id === plate.orderId);
    const preferred = order ? this.agents[order.agentId] : null;
    const agent =
      preferred && !preferred.task
        ? preferred
        : (Object.values(this.agents).find((entry) => !entry.task) ?? null);
    if (!agent || !order) return false;
    plate.dirty = true;
    order.phase = 'collecting';
    agent.task = { orderId: order.id, phase: 'collecting', timer: 0 };
    agent.path = this.pathTo(agent, { x: plate.tableX, z: plate.tableZ + 0.38 });
    return true;
  }

  consumeEvents(): CabinCrewEvent[] {
    const events = this.events;
    this.events = [];
    return events;
  }

  update(dt: number): void {
    const step = Math.max(0, Math.min(0.1, dt));
    for (const agent of Object.values(this.agents)) {
      this.moveAgent(agent, step);
    }
    this.separateAgents();
  }

  private startGalleyRun(agent: CrewAgent, order: CabinCrewOrder): void {
    order.phase = 'to_galley';
    agent.task = { orderId: order.id, phase: 'to_galley', timer: 0 };
    agent.carrying = false;
    agent.path = this.pathTo(agent, GALLEY);
  }

  private pathTo(agent: CrewAgent, target: CabinCrewPoint): CabinCrewPoint[] {
    const path: CabinCrewPoint[] = [];
    const startAisleZ = clamp(agent.z, AISLE_REAR_Z, AISLE_FRONT_Z);
    if (Math.abs(agent.x) > 0.12 || agent.z > AISLE_FRONT_Z || agent.z < AISLE_REAR_Z) {
      path.push({ x: 0, z: startAisleZ });
    }
    if (target.z <= AISLE_REAR_Z) {
      path.push({ x: 0, z: AISLE_REAR_Z });
    } else if (target.z >= AISLE_FRONT_Z) {
      path.push({ x: 0, z: AISLE_FRONT_Z });
    } else {
      path.push({ x: 0, z: clamp(target.z, AISLE_REAR_Z, AISLE_FRONT_Z) });
    }
    path.push({ x: target.x, z: target.z });
    return path;
  }

  private moveAgent(agent: CrewAgent, dt: number): void {
    const task = agent.task;
    if (!task) {
      const home = { x: agent.homeX, z: agent.homeZ };
      if (distance(agent, home) > 0.05) {
        agent.path = this.pathTo(agent, home);
        this.advanceAlongPath(agent, dt);
      }
      return;
    }
    if (task.timer > 0) {
      task.timer = Math.max(0, task.timer - dt);
      if (task.timer === 0) this.finishTimedTask(agent, task);
    }
    if (agent.path.length > 0) {
      this.advanceAlongPath(agent, dt);
      if (agent.path.length === 0 && task.timer === 0) this.arrive(agent, task);
    }
  }

  private advanceAlongPath(agent: CrewAgent, dt: number): void {
    let remaining = WALK_SPEED * dt;
    while (remaining > 0 && agent.path.length > 0) {
      const target = agent.path[0];
      const dx = target.x - agent.x;
      const dz = target.z - agent.z;
      const dist = Math.hypot(dx, dz);
      if (dist <= remaining) {
        agent.x = target.x;
        agent.z = target.z;
        remaining -= dist;
        agent.path.shift();
      } else {
        agent.x += (dx / dist) * remaining;
        agent.z += (dz / dist) * remaining;
        remaining = 0;
      }
    }
  }

  private arrive(agent: CrewAgent, task: AgentTask): void {
    if (task.phase === 'to_galley') {
      task.phase = 'picking_up';
      task.timer = 0.6;
      return;
    }
    if (task.phase === 'to_table') {
      task.phase = 'serving';
      task.timer = 0.65;
      return;
    }
    if (task.phase === 'collecting') {
      task.timer = 0.45;
      return;
    }
    if (task.phase === 'returning' || task.phase === 'to_galley_return') {
      const order = this.orders.find((entry) => entry.id === task.orderId);
      if (order) order.phase = 'done';
      agent.task = null;
      agent.carrying = false;
      this.assignQueued(agent);
      if (!agent.task) {
        agent.path = this.pathTo(agent, { x: agent.homeX, z: agent.homeZ });
      }
    }
  }

  private assignQueued(agent: CrewAgent): void {
    if (agent.task) return;
    const queued = this.orders.find(
      (entry) => entry.agentId === agent.id && entry.phase === 'queued',
    );
    if (queued) this.startGalleyRun(agent, queued);
  }

  private finishTimedTask(agent: CrewAgent, task: AgentTask): void {
    const order = this.orders.find((entry) => entry.id === task.orderId);
    if (!order) {
      agent.task = null;
      return;
    }
    if (task.phase === 'picking_up') {
      agent.carrying = true;
      order.phase = 'to_table';
      task.phase = 'to_table';
      agent.path = this.pathTo(agent, {
        x: order.tableX,
        z: order.tableZ + 0.38,
      });
      return;
    }
    if (task.phase === 'serving') {
      const plate: CabinCrewPlate = {
        id: this.nextId++,
        orderId: order.id,
        itemId: order.itemId,
        tableX: order.tableX,
        tableZ: order.tableZ,
        ready: true,
        dirty: false,
      };
      this.plates.push(plate);
      this.events.push({ type: 'plate_placed', plate: { ...plate }, agentId: agent.id });
      order.phase = 'served';
      agent.carrying = false;
      task.phase = 'returning';
      agent.path = this.pathTo(agent, { x: agent.homeX, z: agent.homeZ });
      return;
    }
    if (task.phase === 'collecting') {
      const index = this.plates.findIndex((entry) => entry.orderId === order.id);
      if (index >= 0) {
        const [plate] = this.plates.splice(index, 1);
        this.events.push({
          type: 'plate_collected',
          plate: { ...plate },
          agentId: agent.id,
        });
      }
      order.phase = 'collected';
      task.phase = 'to_galley_return';
      agent.path = this.pathTo(agent, GALLEY);
    }
  }

  private separateAgents(): void {
    const list = Object.values(this.agents);
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.0001 && dist < 0.46) {
          const push = (0.46 - dist) * 0.5;
          a.x -= (dx / dist) * push;
          a.z -= (dz / dist) * push;
          b.x += (dx / dist) * push;
          b.z += (dz / dist) * push;
        }
      }
      list[i].x = clamp(list[i].x, -1.04, 1.04);
      list[i].z = clamp(list[i].z, -5.9, 3.45);
    }
  }
}
