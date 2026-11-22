import type {
  LostWorldActionContext,
  LostWorldActionDescriptor,
  LostWorldActionResult,
  LostWorldState,
} from './lostWorldExpansion';
import { nextLostWorldRandom } from './lostWorldExpansion';
import { actionFail, type ActionEmitter } from './lostWorldActionShared';
import { applyWorldGroupAction, describeWorldGroupActions } from './lostWorldActionsWorld';
import { applyCityGroupAction, describeCityGroupActions } from './lostWorldActionsCity';
import {
  applyAdventureAndPeopleAction,
  describeAdventureAndPeopleActions,
} from './lostWorldActionsAdventure';
import { applyEndgameAction, describeEndgameActions } from './lostWorldActionsEndgame';

export function buildLostWorldActions(
  state: LostWorldState,
  ctx: LostWorldActionContext,
): LostWorldActionDescriptor[] {
  const out: LostWorldActionDescriptor[] = [];
  const emit: ActionEmitter = (descriptor) => out.push(descriptor);
  describeWorldGroupActions(state, ctx, emit);
  describeCityGroupActions(state, ctx, emit);
  describeAdventureAndPeopleActions(state, ctx, emit);
  describeEndgameActions(state, ctx, emit);
  return out;
}

export function performLostWorldAction(
  state: LostWorldState,
  actionId: string,
  ctx: LostWorldActionContext,
): LostWorldActionResult {
  const result =
    applyWorldGroupAction(actionId, state, ctx) ??
    applyCityGroupAction(actionId, state, ctx) ??
    applyAdventureAndPeopleAction(actionId, state, ctx) ??
    applyEndgameAction(actionId, state, ctx);

  if (!result) {
    return actionFail('world', 'That action is not available yet.');
  }
  if (result.ok) {
    // Advance the deterministic stream so repeated identical actions still
    // produce varied but save-stable outcomes.
    nextLostWorldRandom(state);
  }
  return result;
}

export function getLostWorldActionTab(actionId: string): LostWorldActionDescriptor['tab'] {
  const prefix = actionId.split(':')[0];
  if (prefix.startsWith('world_')) return 'world';
  if (prefix.startsWith('survival_')) return 'survival';
  if (prefix.startsWith('wildlife_')) return 'wildlife';
  if (prefix.startsWith('city_')) return 'city';
  if (prefix.startsWith('vehicle_')) return 'vehicles';
  if (prefix.startsWith('adventure_')) return 'adventure';
  if (prefix.startsWith('people_')) return 'people';
  if (prefix.startsWith('coop_')) return 'coop';
  if (prefix.startsWith('build_')) return 'build';
  if (prefix.startsWith('disaster_')) return 'disaster';
  return 'lost';
}
