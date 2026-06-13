import type { ContentIndex, RouteDef } from '@tradewright/content';
import type { RiskOutcome } from '@tradewright/contract';
import type { TickContext } from '../simulation/tick.js';
import { nextId, getStorage, type SaveGame, type CaravanShipment } from '../world/state.js';
import { applyTransaction, EngineError } from '../world/ledger.js';
import {
  addItems,
  hasItems,
  missingItems,
  removeItems,
  weightOfLines,
} from '../world/storage.js';
import { drawFloat } from '../simulation/rng.js';
import { caravanCapacityWeight, grantHaulingXp } from './hauling.js';

type Line = { itemId: string; qty: number };

export function routeDefById(content: ContentIndex, routeId: string): RouteDef {
  const route = content.routes.find((r) => r.id === routeId);
  if (!route) throw new EngineError('NOT_FOUND', `unknown route ${routeId}`);
  return route;
}

/** The endpoint a route reaches from `fromSettlementId`, or null if the route
 *  does not touch that settlement. */
export function otherEndpoint(route: RouteDef, fromSettlementId: string): string | null {
  const [a, b] = route.endpoints;
  if (a === fromSettlementId) return b;
  if (b === fromSettlementId) return a;
  return null;
}

export interface DispatchCaravanInput {
  routeId: string;
  manifest: Line[];
  mitigation?: boolean;
}

function arrivalTick(save: SaveGame, content: ContentIndex, minutes: number): number {
  return save.tick + Math.ceil((minutes * 60) / content.world.worldTickSeconds);
}

/** Dispatch a caravan (FR-040–042): escrow the manifest out of the origin
 *  storage, charge the disclosed dispatch (and optional guard) costs as sinks,
 *  and start an arrival timer independent of the character's own location. */
export function dispatchCaravan(
  save: SaveGame,
  content: ContentIndex,
  input: DispatchCaravanInput,
): CaravanShipment {
  const character = save.character;
  if (!character) throw new EngineError('NO_CHARACTER', 'create a character first');
  if (character.locationState.kind !== 'at') {
    throw new EngineError('ALREADY_TRAVELING', 'cannot dispatch a caravan while traveling');
  }
  const fromSettlementId = character.locationState.settlementId;
  const route = routeDefById(content, input.routeId);
  const toSettlementId = otherEndpoint(route, fromSettlementId);
  if (toSettlementId === null) {
    throw new EngineError('NOT_AT_SETTLEMENT', `route ${route.id} does not reach ${fromSettlementId}`, {
      settlementId: fromSettlementId,
    });
  }

  const manifest = input.manifest.filter((l) => l.qty !== 0);
  if (manifest.length === 0 || manifest.some((l) => !Number.isInteger(l.qty) || l.qty <= 0)) {
    throw new EngineError('INVALID_ORDER', 'caravan manifest needs positive integer quantities');
  }

  const weight = weightOfLines(content, manifest);
  const capacity = caravanCapacityWeight(save, content);
  if (weight > capacity) {
    throw new EngineError('WEIGHT_EXCEEDED', `load ${weight} exceeds caravan capacity ${capacity}`, {
      weightLimit: capacity,
      weightRequested: weight,
    });
  }

  const busy = save.shipments.filter(
    (s) => s.ownerId === character.id && s.status === 'in-transit',
  );
  if (busy.length >= character.caravanSlots) {
    throw new EngineError('CARAVAN_SLOTS_BUSY', 'all caravan slots are busy', {
      slotsTotal: character.caravanSlots,
      slotsBusy: busy.length,
      nextSlotFreeAtTick: Math.min(...busy.map((s) => s.arriveAtTick)),
    });
  }

  const storage = getStorage(save, fromSettlementId);
  if (!hasItems(storage, manifest)) {
    throw new EngineError('INSUFFICIENT_INPUTS', `not enough goods at ${fromSettlementId} to load`, {
      missingInputs: missingItems(save, fromSettlementId, manifest),
    });
  }

  const dispatchCost = Math.round(route.dispatchCost);
  const mitigationCost = input.mitigation ? Math.round(route.mitigationCost) : 0;
  if (character.wallet < dispatchCost + mitigationCost) {
    throw new EngineError('INSUFFICIENT_FUNDS', 'cannot cover the dispatch cost', {
      requiredCoin: dispatchCost + mitigationCost,
      availableCoin: character.wallet,
    });
  }

  removeItems(storage, manifest);
  applyTransaction(save, {
    kind: 'dispatch-cost',
    coinDelta: -dispatchCost,
    settlementId: fromSettlementId,
    refId: route.id,
  });
  if (mitigationCost > 0) {
    applyTransaction(save, {
      kind: 'mitigation',
      coinDelta: -mitigationCost,
      settlementId: fromSettlementId,
      refId: route.id,
    });
  }

  const shipment: CaravanShipment = {
    id: nextId(save, 'ship'),
    ownerId: character.id,
    routeId: route.id,
    fromSettlementId,
    toSettlementId,
    manifest: manifest.map((l) => ({ itemId: l.itemId, qty: l.qty })),
    departAtTick: save.tick,
    arriveAtTick: arrivalTick(save, content, route.caravanMinutes),
    mitigationPurchased: !!input.mitigation,
    riskOutcome: null,
    status: 'in-transit',
  };
  save.shipments.push(shipment);
  return shipment;
}

/** Risk is rolled exactly once per shipment, here at arrival, from the save's
 *  embedded RNG — so the outcome is identical online and under catch-up replay. */
function resolveRisk(content: ContentIndex, shipment: CaravanShipment, roll: number): RiskOutcome {
  const route = content.routes.find((r) => r.id === shipment.routeId);
  if (!route || roll >= route.riskChance) return { kind: 'none' };
  const fraction = shipment.mitigationPurchased
    ? route.lossFraction * route.mitigationFactor
    : route.lossFraction;
  const lostItems = shipment.manifest
    .map((l) => ({ itemId: l.itemId, qty: Math.floor(l.qty * fraction) }))
    .filter((l) => l.qty > 0);
  if (lostItems.length === 0) return { kind: 'none' };
  return { kind: 'loss', lostItems, mitigated: shipment.mitigationPurchased };
}

function deliveredLines(manifest: Line[], lost: Line[]): Line[] {
  const lostByItem = new Map(lost.map((l) => [l.itemId, l.qty]));
  return manifest
    .map((l) => ({ itemId: l.itemId, qty: l.qty - (lostByItem.get(l.itemId) ?? 0) }))
    .filter((l) => l.qty > 0);
}

/** Deposit arrived shipments into destination storage, resolving road risk and
 *  granting hauling XP. Runs every tick so deliveries interleave identically
 *  online and under catch-up replay (research R5). */
export function resolveArrivals(save: SaveGame, ctx: TickContext): void {
  const { content, emit } = ctx;
  for (const shipment of save.shipments) {
    if (shipment.status !== 'in-transit' || shipment.arriveAtTick > save.tick) continue;
    const riskOutcome = resolveRisk(content, shipment, drawFloat(save));
    shipment.riskOutcome = riskOutcome;
    const lost = riskOutcome.kind === 'loss' ? riskOutcome.lostItems : [];
    const delivered = deliveredLines(shipment.manifest, lost);
    if (delivered.length > 0) addItems(getStorage(save, shipment.toSettlementId), delivered);
    if (lost.length > 0) {
      applyTransaction(save, {
        kind: 'caravan-loss',
        coinDelta: 0,
        items: lost,
        settlementId: shipment.toSettlementId,
        refId: shipment.id,
      });
    }
    shipment.status = 'delivered';
    grantHaulingXp(save, content, emit);
    emit({
      type: 'CaravanArrived',
      shipmentId: shipment.id,
      routeId: shipment.routeId,
      toSettlementId: shipment.toSettlementId,
      delivered,
      riskOutcome,
    });
  }
}
