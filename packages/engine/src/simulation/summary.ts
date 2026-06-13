import type { GameEvent, SummaryEntry } from '@tradewright/contract';
import type { EventSummaryState } from '../world/state.js';

export interface AccumulateInput {
  events: GameEvent[];
  fromTick: number;
  toTick: number;
  tickSeconds: number;
  elapsedSeconds: number;
  capped: boolean;
  capHours: number | null;
  netCoinDelta: number;
}

function mergeLines(
  into: Map<string, number>,
  lines: { itemId: string; qty: number }[],
): void {
  for (const l of lines) into.set(l.itemId, (into.get(l.itemId) ?? 0) + l.qty);
}

function toLines(map: Map<string, number>): { itemId: string; qty: number }[] {
  return [...map.entries()].map(([itemId, qty]) => ({ itemId, qty }));
}

/** Folds catch-up events into typed summary entries carrying ids/codes/values
 *  only — the GUI renders each kind in the viewer's active locale at display
 *  time (FR-014/076). US4/US5 event kinds append without restructuring. */
export function accumulateSummary(input: AccumulateInput): EventSummaryState {
  interface ActionAgg {
    skillId: string;
    settlementId: string;
    count: number;
    produced: Map<string, number>;
    consumed: Map<string, number>;
    xpGained: number;
  }
  const actions = new Map<string, ActionAgg>();
  const actionOrder: string[] = [];
  const others: SummaryEntry[] = [];

  for (const e of input.events) {
    switch (e.type) {
      case 'ActionCompleted': {
        let agg = actions.get(e.activityId);
        if (!agg) {
          agg = {
            skillId: e.skillId,
            settlementId: e.settlementId,
            count: 0,
            produced: new Map(),
            consumed: new Map(),
            xpGained: 0,
          };
          actions.set(e.activityId, agg);
          actionOrder.push(e.activityId);
        }
        agg.count += 1;
        agg.xpGained += e.xpGained;
        mergeLines(agg.produced, e.outputs);
        mergeLines(agg.consumed, e.inputsConsumed);
        break;
      }
      case 'SkillLeveled':
        others.push({ kind: 'level-up', skillId: e.skillId, level: e.level, tier: e.tier });
        break;
      case 'ActivityHalted':
        others.push({
          kind: 'halt',
          activityId: e.activityId,
          reason: e.reason,
          atTick: e.atTick,
          ...(e.missingInputs ? { missingInputs: e.missingInputs } : {}),
        });
        break;
      case 'OrderFilled':
        others.push({
          kind: 'order',
          outcome: 'filled',
          orderId: e.orderId,
          settlementId: e.settlementId,
          side: e.side,
          itemId: e.itemId,
          qty: e.qty,
          unitPrice: e.unitPrice,
          proceeds: e.proceeds,
          taxPaid: e.taxPaid,
        });
        break;
      case 'OrderPartiallyFilled':
        others.push({
          kind: 'order',
          outcome: 'partially-filled',
          orderId: e.orderId,
          settlementId: e.settlementId,
          side: e.side,
          itemId: e.itemId,
          qty: e.qty,
          unitPrice: e.unitPrice,
          proceeds: e.proceeds,
          taxPaid: e.taxPaid,
        });
        break;
      case 'OrderExpired':
        others.push({
          kind: 'order',
          outcome: 'expired',
          orderId: e.orderId,
          settlementId: e.settlementId,
          side: e.side,
          itemId: e.itemId,
          qty: e.qtyReturned,
          unitPrice: 0,
          proceeds: 0,
          taxPaid: 0,
        });
        break;
      case 'CaravanArrived':
        others.push({
          kind: 'caravan',
          shipmentId: e.shipmentId,
          toSettlementId: e.toSettlementId,
          delivered: e.delivered,
          riskOutcome: e.riskOutcome,
        });
        break;
      case 'TravelArrived':
        others.push({ kind: 'travel', settlementId: e.settlementId });
        break;
      default:
        break;
    }
  }

  const actionEntries: SummaryEntry[] = actionOrder.map((activityId) => {
    const agg = actions.get(activityId)!;
    return {
      kind: 'actions',
      skillId: agg.skillId,
      activityId,
      settlementId: agg.settlementId,
      count: agg.count,
      produced: toLines(agg.produced),
      consumed: toLines(agg.consumed),
      xpGained: agg.xpGained,
    };
  });

  return {
    fromTick: input.fromTick,
    toTick: input.toTick,
    tickSeconds: input.tickSeconds,
    elapsedSeconds: input.elapsedSeconds,
    capped: input.capped,
    capHours: input.capHours,
    entries: [...actionEntries, ...others],
    netCoinDelta: input.netCoinDelta,
  };
}

/** An unacknowledged summary absorbs the next absence (cleared only on
 *  CollectSummary — FR-014). */
export function mergeSummaries(
  prev: EventSummaryState,
  next: EventSummaryState,
): EventSummaryState {
  return {
    fromTick: Math.min(prev.fromTick, next.fromTick),
    toTick: Math.max(prev.toTick, next.toTick),
    tickSeconds: next.tickSeconds,
    elapsedSeconds: prev.elapsedSeconds + next.elapsedSeconds,
    capped: prev.capped || next.capped,
    capHours: next.capHours ?? prev.capHours,
    entries: [...prev.entries, ...next.entries],
    netCoinDelta: prev.netCoinDelta + next.netCoinDelta,
  };
}
