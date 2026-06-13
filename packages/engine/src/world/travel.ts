import type { ContentIndex } from '@tradewright/content';
import type { TickContext } from '../simulation/tick.js';
import type { SaveGame } from '../world/state.js';
import { EngineError } from './ledger.js';
import { otherEndpoint, routeDefById } from '../caravan/shipments.js';

export interface TravelToInput {
  routeId: string;
  confirmHaltAssignment?: boolean;
}

/** Personal travel (FR-002/044): the character leaves its settlement on a route,
 *  halting any active assignment. Travel timers are independent of caravan
 *  shipments on the same route (spec edge case). */
export function travelTo(save: SaveGame, content: ContentIndex, input: TravelToInput): void {
  const character = save.character;
  if (!character) throw new EngineError('NO_CHARACTER', 'create a character first');
  if (character.locationState.kind !== 'at') {
    throw new EngineError('ALREADY_TRAVELING', 'you are already on the road');
  }
  const fromSettlementId = character.locationState.settlementId;
  const route = routeDefById(content, input.routeId);
  const toSettlementId = otherEndpoint(route, fromSettlementId);
  if (toSettlementId === null) {
    throw new EngineError('NOT_AT_SETTLEMENT', `route ${route.id} does not reach ${fromSettlementId}`, {
      settlementId: fromSettlementId,
    });
  }

  const active =
    character.assignment && character.assignment.haltReason === null
      ? character.assignment
      : null;
  if (active && !input.confirmHaltAssignment) {
    throw new EngineError('CONFIRM_REQUIRED', 'traveling will halt your current work');
  }
  if (active) {
    active.haltReason = 'travel';
    active.haltedAtTick = save.tick;
  }

  character.locationState = {
    kind: 'traveling',
    routeId: route.id,
    toSettlementId,
    departAtTick: save.tick,
    arriveAtTick: save.tick + Math.ceil((route.travelMinutes * 60) / content.world.worldTickSeconds),
  };
}

/** Land the character once its personal travel arrives — enabling the
 *  destination's activities, market, and storage (FR-044). */
export function resolveTravelTick(save: SaveGame, ctx: TickContext): void {
  const character = save.character;
  if (!character || character.locationState.kind !== 'traveling') return;
  if (character.locationState.arriveAtTick > save.tick) return;
  const settlementId = character.locationState.toSettlementId;
  character.locationState = { kind: 'at', settlementId };
  ctx.emit({ type: 'TravelArrived', settlementId });
}
