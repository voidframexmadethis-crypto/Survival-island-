import type { LostWorldActionContext, LostWorldEffects, LostWorldState } from './lostWorldExpansion';
import {
  addPersistentChange,
  lostWorldLog,
  nextLostWorldRandom,
} from './lostWorldExpansion';
import {
  actionFail,
  actionOk,
  adjustDistrict,
  canAfford,
  costLabel,
  distanceTo,
  grant,
  missingReason,
  spend,
  type ActionEmitter,
  type ActionOutcome,
} from './lostWorldActionShared';

const PAINTS = ['#8b1e1e', '#1f4d3a', '#b08d57', '#2b2b2b', '#3b6ea5', '#d9d4c7', '#c46b2e', '#5a2a68'];
const RIMS = ['#c0c0c0', '#e0b64a', '#111111', '#8b1e1e', '#e8e8e8'];
const INTERIORS = ['#2a1a12', '#4b2e2e', '#1a2a3a', '#c9b48a', '#111111'];
const LIGHTS = ['#22d3ee', '#f59e0b', '#a855f7', '#ef4444', '#22c55e'];

const CUSTOMIZE_OPTIONS: {
  id: string;
  label: string;
  description: string;
  coins: number;
}[] = [
  { id: 'paint', label: 'Repaint', description: 'Professional two-stage paint in a period-correct color.', coins: 80 },
  { id: 'rims', label: 'Fit New Rims', description: 'Wider rims with a matching finish and fresh rubber.', coins: 60 },
  { id: 'interior', label: 'Retrim Interior', description: 'New seat covers, door cards and accent stitching.', coins: 90 },
  { id: 'hydraulics', label: 'Install Hydraulics', description: 'Full hydraulic package with hop, tilt and lock-up.', coins: 220 },
  { id: 'underglow', label: 'Add Underglow', description: 'LED underglow kit with a switch and color choice.', coins: 70 },
  { id: 'bodykit', label: 'Body Kit & Stance', description: 'Wider stance, wheel arches and a subtle body kit.', coins: 180 },
  { id: 'lighting', label: 'Rim & Accent Lighting', description: 'Programmable rim lights and interior accent lighting.', coins: 90 },
  { id: 'audio_tune', label: 'Tune the System', description: 'Crossover, gain and enclosure tuning for competition bass.', coins: 60 },
];

export function describeCityGroupActions(
  state: LostWorldState,
  ctx: LostWorldActionContext,
  emit: ActionEmitter,
): void {
  // Feature 16/17: enterable businesses, services, ownership and income.
  for (let i = 0; i < state.businesses.length; i++) {
    const b = state.businesses[i];
    const dist = distanceTo(ctx, b.x, b.z);
    emit({
      id: `city_visit:${b.id}`,
      tab: 'city',
      label: `Visit ${b.name}`,
      description: b.open
        ? `${b.kind.replace(/_/g, ' ')} on the Crescent City mainland. ${dist <= 300 ? 'You are close enough to walk in.' : 'Travel to the city first.'}`
        : `${b.name} is closed for the night. Staff return at 7:00.`,
      costLabel: 'Free',
      available: b.open && dist <= 300,
      reason: !b.open ? 'Closed for the night' : dist > 300 ? `${Math.round(dist)}m away` : undefined,
      tone: 'info',
    });
    if (!b.owned) {
      emit({
        id: `city_buy:${b.id}`,
        tab: 'city',
        label: `Buy ${b.name}`,
        description: 'Purchase the business outright. It generates daily income you can collect in person.',
        costLabel: costLabel(500),
        available: ctx.coins >= 500 && dist <= 400,
        reason: ctx.coins < 500 ? 'Need 500 coins' : dist > 400 ? 'Travel to the city' : undefined,
        tone: 'good',
      });
    } else {
      emit({
        id: `city_collect:${b.id}`,
        tab: 'city',
        label: `Collect ${b.name} income`,
        description: `${b.uncollectedIncome} coins waiting. Daily income is ${b.dailyIncome}c with ${b.employees} employee(s).`,
        costLabel: 'Free',
        available: b.uncollectedIncome > 0,
        reason: b.uncollectedIncome > 0 ? undefined : 'No income waiting yet',
        tone: 'good',
      });
    }
    if (b.owned) {
      emit({
        id: `city_restock:${b.id}`,
        tab: 'city',
        label: `Restock ${b.name}`,
        description: 'Refill shelves and supplies. Higher stock raises daily revenue.',
        costLabel: costLabel(120),
        available: ctx.coins >= 120,
        reason: ctx.coins >= 120 ? undefined : 'Need 120 coins',
        tone: 'info',
      });
      if (b.employees < 4) {
        emit({
          id: `city_hire:${b.id}`,
          tab: 'city',
          label: `Hire at ${b.name}`,
          description: 'Add an employee. Each one raises daily income and slows stock loss.',
          costLabel: costLabel(200),
          available: ctx.coins >= 200,
          reason: ctx.coins >= 200 ? undefined : 'Need 200 coins',
          tone: 'good',
        });
      }
      if (ctx.multiplayerConnected && !b.sharedWithPeer) {
        emit({
          id: `city_share:${b.id}`,
          tab: 'city',
          label: `Share ${b.name} with the room`,
          description: 'Grant your co-op partner shared ownership. Income and stock sync over the P2P room.',
          costLabel: 'Free',
          available: true,
          tone: 'discovery',
        });
      }
    }
  }

  // Feature 20: Louisiana cultural events.
  for (let i = 0; i < state.culturalEvents.length; i++) {
    const event = state.culturalEvents[i];
    if (event.completed) continue;
    emit({
      id: `city_culture:${event.id}`,
      tab: 'city',
      label: `Attend ${event.name}`,
      description: `${event.kind.replace(/_/g, ' ')} · ${event.hoursLeft}h left. Reputation and a cash payout for showing up.`,
      costLabel: 'Travel to the city',
      available: distanceTo(ctx, -80, 1330) <= 520,
      reason: distanceTo(ctx, -80, 1330) > 520 ? 'Travel to Crescent City' : undefined,
      tone: 'discovery',
    });
  }

  // Feature 19: neighborhood reputation.
  for (let i = 0; i < state.districts.length; i++) {
    const d = state.districts[i];
    emit({
      id: `city_donate:${d.id}`,
      tab: 'city',
      label: `Support ${d.name}`,
      description: `${d.description} Current reputation ${Math.round(d.reputation)}.`,
      costLabel: costLabel(50),
      available: ctx.coins >= 50,
      reason: ctx.coins >= 50 ? undefined : 'Need 50 coins',
      tone: d.reputation < 0 ? 'warning' : 'info',
    });
  }

  // Feature 21/22/23: deep customization, failures and audio competitions.
  for (let i = 0; i < ctx.vehicles.length; i++) {
    const vehicle = ctx.vehicles[i];
    const custom = state.customization.find((c) => c.vehicleId === vehicle.id);
    for (let j = 0; j < CUSTOMIZE_OPTIONS.length; j++) {
      const opt = CUSTOMIZE_OPTIONS[j];
      emit({
        id: `vehicle_customize:${vehicle.id}:${opt.id}`,
        tab: 'vehicles',
        label: `${opt.label} — ${vehicle.name}`,
        description: `${opt.description} Current build investment: ${custom?.investment ?? 0}c.`,
        costLabel: costLabel(opt.coins),
        available: ctx.coins >= opt.coins,
        reason: ctx.coins >= opt.coins ? undefined : `Need ${opt.coins} coins`,
        tone: 'good',
      });
    }
    const mech = state.mechanical.find((m) => m.vehicleId === vehicle.id);
    const needsService =
      !mech ||
      mech.failed ||
      mech.engineHeat > 60 ||
      mech.tireWear > 40 ||
      mech.brakeWear > 40 ||
      vehicle.hp < vehicle.maxHp;
    emit({
      id: `vehicle_service:${vehicle.id}`,
      tab: 'vehicles',
      label: `Service ${vehicle.name}`,
      description: needsService
        ? `Heat ${Math.round(mech?.engineHeat ?? 0)}% · tires ${Math.round(mech?.tireWear ?? 0)}% · brakes ${Math.round(mech?.brakeWear ?? 0)}%. A full service restores the car.`
        : 'The car is in good condition. Service resets wear before a long trip.',
      costLabel: costLabel(80),
      available: ctx.coins >= 80,
      reason: ctx.coins >= 80 ? undefined : 'Need 80 coins',
      tone: needsService ? 'warning' : 'info',
    });
    const hasBass =
      vehicle.hasTrunkBass ||
      vehicle.trunkBassEnabled ||
      vehicle.preset === 'donk' ||
      vehicle.preset === 'slab' ||
      vehicle.preset === 'lowrider';
    if (hasBass) {
      emit({
        id: `vehicle_bass:${vehicle.id}`,
        tab: 'vehicles',
        label: `Enter Bass Battle — ${vehicle.name}`,
        description: 'Subwoofer demo and bass battle judged on tuning, output and show presence.',
        costLabel: costLabel(30),
        available: ctx.coins >= 30,
        reason: ctx.coins >= 30 ? undefined : 'Need 30 coins',
        tone: 'discovery',
      });
    }
  }

  // Feature 24: restoration careers.
  for (let i = 0; i < state.restorations.length; i++) {
    const r = state.restorations[i];
    if (!r.recovered) {
      emit({
        id: `vehicle_recover:${r.id}`,
        tab: 'vehicles',
        label: `Recover ${r.name}`,
        description: `${r.description} Pay a tow crew to bring it to the garage.`,
        costLabel: costLabel(300),
        available: ctx.coins >= 300,
        reason: ctx.coins >= 300 ? undefined : 'Need 300 coins',
        tone: 'warning',
      });
    } else if (!r.restored) {
      const affordable = ctx.coins >= 120 && (ctx.items.metal_ore ?? 0) >= 5;
      emit({
        id: `vehicle_restore:${r.id}`,
        tab: 'vehicles',
        label: `Restore ${r.name} (stage ${r.stage}/4)`,
        description: 'Engine, driveline, body and paint. Each stage advances the restoration; the finished car is spawned in the world.',
        costLabel: costLabel(120, [['metal_ore', 5]]),
        available: affordable,
        reason: affordable ? undefined : missingReason(ctx, 120, [['metal_ore', 5]]),
        tone: 'good',
      });
    }
  }

  // Feature 25: player-owned car clubs.
  if (!state.carClub.founded) {
    emit({
      id: 'vehicle_club_found',
      tab: 'vehicles',
      label: 'Found a Car Club',
      description: 'Register the club, print cards and start recruiting. Unlocks meets and shared activities.',
      costLabel: costLabel(250),
      available: ctx.coins >= 250,
      reason: ctx.coins >= 250 ? undefined : 'Need 250 coins',
      tone: 'good',
    });
  } else {
    emit({
      id: 'vehicle_club_meet',
      tab: 'vehicles',
      label: `Host ${state.carClub.name} Meet`,
      description: `${state.carClub.members} members · ${state.carClub.meetsHeld} meets held. Reputation ${Math.round(state.carClub.reputation)}.`,
      costLabel: costLabel(50),
      available: ctx.coins >= 50 && state.carClub.members >= 3,
      reason:
        state.carClub.members < 3
          ? 'Recruit at least 3 members first'
          : ctx.coins < 50
            ? 'Need 50 coins'
            : undefined,
      tone: 'discovery',
    });
  }
}

export function applyCityGroupAction(
  actionId: string,
  state: LostWorldState,
  ctx: LostWorldActionContext,
): ActionOutcome | null {
  if (actionId.startsWith('city_visit:')) {
    const b = state.businesses.find((x) => x.id === actionId.slice('city_visit:'.length));
    if (!b) return actionFail('city', 'Business not found.');
    if (!b.open) return actionFail('city', `${b.name} is closed until morning.`);
    if (distanceTo(ctx, b.x, b.z) > 300) return actionFail('city', 'Travel to Crescent City first.');
    b.visits += 1;
    b.reputation = Math.min(100, b.reputation + 1);
    lostWorldLog(state, ctx.day, `Visited ${b.name}.`, 'info');
    return actionOk('city', `${b.name}: ${b.kind.replace(/_/g, ' ')}. The staff remember your face.`);
  }

  if (actionId.startsWith('city_buy:')) {
    const b = state.businesses.find((x) => x.id === actionId.slice('city_buy:'.length));
    if (!b) return actionFail('city', 'Business not found.');
    if (b.owned) return actionFail('city', 'You already own it.');
    if (!canAfford(ctx, 500)) return actionFail('city', 'Need 500 coins.');
    if (distanceTo(ctx, b.x, b.z) > 400) return actionFail('city', 'Travel to the city to sign the papers.');
    const effects: LostWorldEffects = {};
    spend(effects, ctx, 500);
    b.owned = true;
    b.employees = Math.max(1, b.employees);
    b.dailyIncome = 32;
    b.uncollectedIncome = 0;
    adjustDistrict(state, b.kind === 'restaurant' || b.kind === 'bar' ? 'french_quarter' : 'warehouse_row', 4);
    addPersistentChange(state, ctx.day, 'business', `Purchased ${b.name}`, b.x, b.z);
    lostWorldLog(state, ctx.day, `You now own ${b.name}.`, 'discovery');
    return actionOk('city', `${b.name} is yours. Collect income as the days pass.`, effects);
  }

  if (actionId.startsWith('city_restock:')) {
    const b = state.businesses.find((x) => x.id === actionId.slice('city_restock:'.length));
    if (!b || !b.owned) return actionFail('city', 'You do not own that business.');
    if (!canAfford(ctx, 120)) return actionFail('city', 'Need 120 coins.');
    const effects: LostWorldEffects = {};
    spend(effects, ctx, 120);
    b.stock = Math.min(100, b.stock + 40);
    return actionOk('city', `${b.name} restocked to ${b.stock}.`, effects);
  }

  if (actionId.startsWith('city_hire:')) {
    const b = state.businesses.find((x) => x.id === actionId.slice('city_hire:'.length));
    if (!b || !b.owned) return actionFail('city', 'You do not own that business.');
    if (b.employees >= 4) return actionFail('city', 'The business is fully staffed.');
    if (!canAfford(ctx, 200)) return actionFail('city', 'Need 200 coins.');
    const effects: LostWorldEffects = {};
    spend(effects, ctx, 200);
    b.employees += 1;
    return actionOk('city', `Hired another employee at ${b.name} (${b.employees} total).`, effects);
  }

  if (actionId.startsWith('city_collect:')) {
    const b = state.businesses.find((x) => x.id === actionId.slice('city_collect:'.length));
    if (!b || !b.owned) return actionFail('city', 'You do not own that business.');
    if (b.uncollectedIncome <= 0) return actionFail('city', 'No income waiting.');
    const amount = b.uncollectedIncome;
    const effects: LostWorldEffects = {};
    grant(effects, amount);
    b.uncollectedIncome = 0;
    lostWorldLog(state, ctx.day, `Collected ${amount} coins from ${b.name}.`, 'good');
    return actionOk('city', `Collected ${amount} coins from ${b.name}.`, effects);
  }

  if (actionId.startsWith('city_share:')) {
    const b = state.businesses.find((x) => x.id === actionId.slice('city_share:'.length));
    if (!b || !b.owned) return actionFail('city', 'You do not own that business.');
    if (!ctx.multiplayerConnected) return actionFail('city', 'Join a P2P room first.');
    if (b.sharedWithPeer) return actionFail('city', 'Already shared.');
    const peer = ctx.multiplayerPeers[0];
    b.sharedWithPeer = peer?.name ?? 'Co-op partner';
    state.coop.sharedBusinessId = b.id;
    const effects: LostWorldEffects = {};
    effects.broadcast = { kind: 'shared_business', payload: { businessId: b.id, owner: 'host' } };
    lostWorldLog(state, ctx.day, `${b.name} is now shared with the co-op room.`, 'discovery');
    return actionOk('city', `${b.name} shared with ${b.sharedWithPeer}.`, effects);
  }

  if (actionId.startsWith('city_culture:')) {
    const event = state.culturalEvents.find((e) => e.id === actionId.slice('city_culture:'.length));
    if (!event) return actionFail('city', 'That event is over.');
    if (event.completed) return actionFail('city', 'Already attended.');
    if (distanceTo(ctx, -80, 1330) > 520) return actionFail('city', 'Travel to Crescent City first.');
    event.completed = true;
    event.attending = true;
    const effects: LostWorldEffects = {};
    grant(effects, 80, [['roasted_meat', 1]]);
    adjustDistrict(state, 'french_quarter', 6);
    adjustDistrict(state, 'marigny', 4);
    state.carClub.reputation += event.kind === 'car_show' || event.kind === 'car_meet' ? 8 : 2;
    addPersistentChange(state, ctx.day, 'decision', `Attended ${event.name}`, -80, 1330);
    lostWorldLog(state, ctx.day, `Attended ${event.name} in Crescent City.`, 'good');
    return actionOk('city', `${event.name} attended. Reputation and 80 coins earned.`, effects);
  }

  if (actionId.startsWith('city_donate:')) {
    const d = state.districts.find((x) => x.id === actionId.slice('city_donate:'.length));
    if (!d) return actionFail('city', 'District not found.');
    if (!canAfford(ctx, 50)) return actionFail('city', 'Need 50 coins.');
    const effects: LostWorldEffects = {};
    spend(effects, ctx, 50);
    adjustDistrict(state, d.id, 6);
    return actionOk('city', `Donated to ${d.name}. Reputation is now ${Math.round(d.reputation)}.`, effects);
  }

  if (actionId.startsWith('vehicle_customize:')) {
    const parts = actionId.split(':');
    const vehicleId = parts[1];
    const option = parts[2];
    const vehicle = ctx.vehicles.find((v) => v.id === vehicleId);
    const opt = CUSTOMIZE_OPTIONS.find((o) => o.id === option);
    if (!vehicle || !opt) return actionFail('vehicles', 'Vehicle or option not found.');
    if (!canAfford(ctx, opt.coins)) return actionFail('vehicles', `Need ${opt.coins} coins.`);
    const effects: LostWorldEffects = {};
    spend(effects, ctx, opt.coins);
    let custom = state.customization.find((c) => c.vehicleId === vehicleId);
    if (!custom) {
      custom = {
        vehicleId,
        paint: vehicle.paintColor ?? '#2b2b2b',
        interior: '#2a1a12',
        rims: '#c0c0c0',
        bodyKit: 0,
        hydraulicsLevel: 0,
        lighting: 'off',
        audioTune: 0,
        investment: 0,
      };
      state.customization.push(custom);
    }
    custom.investment += opt.coins;
    const patch: Record<string, unknown> = {};
    if (option === 'paint') {
      const idx = state.customization.indexOf(custom);
      custom.paint = PAINTS[(custom.investment / 80 + idx) % PAINTS.length | 0];
      patch.paintColor = custom.paint;
    } else if (option === 'rims') {
      custom.rims = RIMS[Math.floor(nextLostWorldRandom(state) * RIMS.length)];
      patch.rimColor = custom.rims;
    } else if (option === 'interior') {
      custom.interior = INTERIORS[Math.floor(nextLostWorldRandom(state) * INTERIORS.length)];
      patch.accentColor = custom.interior;
    } else if (option === 'hydraulics') {
      custom.hydraulicsLevel = Math.min(5, custom.hydraulicsLevel + 1);
      patch.hasHydraulics = true;
      patch.hydraulicHop = true;
    } else if (option === 'underglow') {
      custom.lighting = LIGHTS[Math.floor(nextLostWorldRandom(state) * LIGHTS.length)];
      patch.underglowEnabled = true;
      patch.underglowColor = custom.lighting;
    } else if (option === 'bodykit') {
      custom.bodyKit = Math.min(4, custom.bodyKit + 1);
      patch.wheelScale = 1 + custom.bodyKit * 0.04;
    } else if (option === 'lighting') {
      custom.lighting = LIGHTS[Math.floor(nextLostWorldRandom(state) * LIGHTS.length)];
      patch.rimLightMode = 'solid';
      patch.rimLightColor = custom.lighting;
    } else if (option === 'audio_tune') {
      custom.audioTune = Math.min(10, custom.audioTune + 1);
      patch.trunkBassEnabled = true;
    }
    effects.vehiclePatch = { vehicleId, patch };
    return actionOk('vehicles', `${opt.label} installed on ${vehicle.name}.`, effects);
  }

  if (actionId.startsWith('vehicle_service:')) {
    const vehicle = ctx.vehicles.find((v) => v.id === actionId.slice('vehicle_service:'.length));
    if (!vehicle) return actionFail('vehicles', 'Vehicle not found.');
    if (!canAfford(ctx, 80)) return actionFail('vehicles', 'Need 80 coins.');
    const effects: LostWorldEffects = {};
    spend(effects, ctx, 80);
    let mech = state.mechanical.find((m) => m.vehicleId === vehicle.id);
    if (!mech) {
      mech = {
        vehicleId: vehicle.id,
        engineHeat: 0,
        tireWear: 0,
        brakeWear: 0,
        engineWear: 0,
        failed: false,
        lastServiceDay: ctx.day,
      };
      state.mechanical.push(mech);
    }
    mech.engineHeat = 0;
    mech.tireWear = 0;
    mech.brakeWear = 0;
    mech.engineWear = 0;
    mech.failed = false;
    mech.lastServiceDay = ctx.day;
    effects.vehiclePatch = {
      vehicleId: vehicle.id,
      patch: { hp: vehicle.maxHp, fuel: 100 },
    };
    return actionOk('vehicles', `${vehicle.name} fully serviced: heat, tires, brakes and engine reset.`, effects);
  }

  if (actionId.startsWith('vehicle_bass:')) {
    const vehicle = ctx.vehicles.find((v) => v.id === actionId.slice('vehicle_bass:'.length));
    if (!vehicle) return actionFail('vehicles', 'Vehicle not found.');
    if (!canAfford(ctx, 30)) return actionFail('vehicles', 'Need 30 coins.');
    const effects: LostWorldEffects = {};
    spend(effects, ctx, 30);
    const custom = state.customization.find((c) => c.vehicleId === vehicle.id);
    const score = Math.round(
      48 +
        (custom?.audioTune ?? 0) * 4 +
        (vehicle.hasTrunkBass ? 14 : 0) +
        (vehicle.trunkBassEnabled ? 10 : 0) +
        (custom?.bodyKit ?? 0) * 3 +
        (custom?.hydraulicsLevel ?? 0) * 2,
    );
    const entrants = 6 + Math.floor(nextLostWorldRandom(state) * 10);
    const placement = Math.max(1, Math.min(entrants, Math.round(entrants - (score - 60) / 12)));
    state.audioCompetitions.unshift({
      id: `bass_${ctx.day}_${state.audioCompetitions.length}`,
      name: 'Warehouse Row Bass Battle',
      day: ctx.day,
      score,
      placement,
      entrants,
      completed: true,
    });
    if (state.audioCompetitions.length > 8) state.audioCompetitions.length = 8;
    const payout = placement === 1 ? 260 : placement <= 3 ? 140 : 60;
    grant(effects, payout);
    adjustDistrict(state, 'warehouse_row', placement === 1 ? 7 : 3);
    state.carClub.reputation += placement === 1 ? 8 : 3;
    lostWorldLog(
      state,
      ctx.day,
      `Bass battle: scored ${score}, placed ${placement}/${entrants}.`,
      placement === 1 ? 'discovery' : 'info',
    );
    return actionOk(
      'vehicles',
      `Bass battle scored ${score}. Finished ${placement} of ${entrants} and earned ${payout} coins.`,
      effects,
    );
  }

  if (actionId.startsWith('vehicle_recover:')) {
    const r = state.restorations.find((x) => x.id === actionId.slice('vehicle_recover:'.length));
    if (!r) return actionFail('vehicles', 'Project not found.');
    if (r.recovered) return actionFail('vehicles', 'Already recovered.');
    if (!canAfford(ctx, 300)) return actionFail('vehicles', 'Need 300 coins.');
    const effects: LostWorldEffects = {};
    spend(effects, ctx, 300);
    r.recovered = true;
    r.stage = 1;
    addPersistentChange(state, ctx.day, 'restoration', `Recovered ${r.name}`, r.x, r.z);
    return actionOk('vehicles', `${r.name} is in the garage. Restoration stage 1/4 complete.`, effects);
  }

  if (actionId.startsWith('vehicle_restore:')) {
    const r = state.restorations.find((x) => x.id === actionId.slice('vehicle_restore:'.length));
    if (!r) return actionFail('vehicles', 'Project not found.');
    if (!r.recovered) return actionFail('vehicles', 'Recover the vehicle first.');
    if (r.restored) return actionFail('vehicles', 'Already restored.');
    if (!canAfford(ctx, 120, [['metal_ore', 5]])) {
      return actionFail('vehicles', missingReason(ctx, 120, [['metal_ore', 5]]));
    }
    const effects: LostWorldEffects = {};
    spend(effects, ctx, 120, [['metal_ore', 5]]);
    r.stage += 1;
    if (r.stage >= 4) {
      r.restored = true;
      effects.spawnVehiclePreset = r.preset;
      addPersistentChange(state, ctx.day, 'restoration', `Restored ${r.name}`, r.x, r.z);
      state.carClub.reputation += 6;
      lostWorldLog(state, ctx.day, `${r.name} is restored and back on the road.`, 'discovery');
      return actionOk('vehicles', `${r.name} restored! The finished car is now in your garage world.`, effects);
    }
    return actionOk('vehicles', `${r.name} restoration stage ${r.stage}/4 complete.`, effects);
  }

  if (actionId === 'vehicle_club_found') {
    if (state.carClub.founded) return actionFail('vehicles', 'Club already founded.');
    if (!canAfford(ctx, 250)) return actionFail('vehicles', 'Need 250 coins.');
    const effects: LostWorldEffects = {};
    spend(effects, ctx, 250);
    state.carClub.founded = true;
    state.carClub.members = Math.max(3, state.carClub.members);
    state.carClub.reputation = 10;
    addPersistentChange(state, ctx.day, 'decision', `Founded ${state.carClub.name}`, ctx.playerX, ctx.playerZ);
    return actionOk('vehicles', `${state.carClub.name} founded with 3 charter members.`, effects);
  }

  if (actionId === 'vehicle_club_meet') {
    if (!state.carClub.founded) return actionFail('vehicles', 'Found the club first.');
    if (state.carClub.members < 3) return actionFail('vehicles', 'Recruit at least 3 members.');
    if (!canAfford(ctx, 50)) return actionFail('vehicles', 'Need 50 coins.');
    const effects: LostWorldEffects = {};
    spend(effects, ctx, 50);
    grant(effects, 90);
    state.carClub.meetsHeld += 1;
    state.carClub.members += 1;
    state.carClub.reputation += 6;
    adjustDistrict(state, 'warehouse_row', 4);
    state.coop.sharedActivities.unshift(`Car meet on day ${ctx.day}`);
    if (ctx.multiplayerConnected) {
      effects.broadcast = { kind: 'car_meet', payload: { day: ctx.day } };
    }
    lostWorldLog(state, ctx.day, `${state.carClub.name} held a meet. The lot was full.`, 'good');
    return actionOk('vehicles', `${state.carClub.name} meet held: +1 member, +6 reputation, 90 coins.`, effects);
  }

  return null;
}
