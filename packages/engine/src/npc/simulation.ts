import type { ContentIndex, NpcItemEntry, NpcMarketProfile, SettlementDef } from '@tradewright/content';
import type { TickContext } from '../simulation/tick.js';
import type { SaveGame } from '../world/state.js';
import { NPC_OWNER, npcStateFor } from './state.js';
import { placeOrder } from '../market/orderbook.js';

function basePriceOf(content: ContentIndex, itemId: string): number {
  return content.items.find((i) => i.id === itemId)?.basePrice ?? 1;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/** Stock-pressure quote (research R4): price = basePrice × (equilibrium / stock),
 *  bounded by the entry's authored multipliers. Low stock ⇒ higher quote. */
export function npcQuote(entry: NpcItemEntry, basePrice: number, stock: number): number {
  const raw = basePrice * (entry.equilibriumStock / Math.max(1, stock));
  const bounded = clamp(
    raw,
    basePrice * entry.priceBounds.minMultiplier,
    basePrice * entry.priceBounds.maxMultiplier,
  );
  return Math.max(1, Math.round(bounded));
}

/** How long NPC band/floor orders rest — long enough to outlive the gap between
 *  market ticks, replaced wholesale on the next NPC refresh. */
function bandDurationHours(content: ContentIndex): number {
  return (content.world.marketCadenceTicks * 2 * content.world.worldTickSeconds) / 3600;
}

function placeBandOrders(
  save: SaveGame,
  content: ContentIndex,
  settlement: SettlementDef,
  entry: NpcItemEntry,
  quote: number,
  ctx: TickContext,
): void {
  const duration = bandDurationHours(content);
  const buyPrice = Math.max(1, Math.round(quote * (1 - entry.orderBandWidth)));
  const sellPrice = Math.max(buyPrice + 1, Math.round(quote * (1 + entry.orderBandWidth)));
  placeOrder(
    save,
    content,
    {
      settlementId: settlement.id,
      ownerId: NPC_OWNER,
      side: 'sell',
      itemId: entry.itemId,
      qty: entry.orderDepth,
      unitPrice: sellPrice,
      durationHours: duration,
    },
    ctx,
  );
  placeOrder(
    save,
    content,
    {
      settlementId: settlement.id,
      ownerId: NPC_OWNER,
      side: 'buy',
      itemId: entry.itemId,
      qty: entry.orderDepth,
      unitPrice: buyPrice,
      durationHours: duration,
    },
    ctx,
  );
}

/** Standing floor buy orders at authored prices, sized to the per-period budget
 *  split across the curated list — the on-book coin faucet (FR-054, research R13). */
function placeFloorBuys(
  save: SaveGame,
  content: ContentIndex,
  settlement: SettlementDef,
  profile: NpcMarketProfile,
  ctx: TickContext,
): void {
  const duration = bandDurationHours(content);
  const perItemBudget = Math.floor(profile.floorBudgetPerPeriod / profile.floorBuyList.length);
  for (const floor of profile.floorBuyList) {
    const qty = Math.floor(perItemBudget / floor.floorPrice);
    if (qty <= 0) continue;
    placeOrder(
      save,
      content,
      {
        settlementId: settlement.id,
        ownerId: NPC_OWNER,
        side: 'buy',
        itemId: floor.itemId,
        qty,
        unitPrice: floor.floorPrice,
        durationHours: duration,
      },
      ctx,
    );
  }
}

/** Demand sweep (FR-054, research R13): on the sweep cadence the NPC market-buys
 *  the cheapest player sell orders across all goods until the budget is spent. */
function runSweep(
  save: SaveGame,
  content: ContentIndex,
  settlement: SettlementDef,
  profile: NpcMarketProfile,
  ctx: TickContext,
): void {
  let budget = profile.sweep.budgetPerPeriod;
  const duration = bandDurationHours(content);
  const sells = save.orders
    .filter(
      (o) =>
        o.settlementId === settlement.id &&
        o.side === 'sell' &&
        o.ownerId !== NPC_OWNER &&
        (o.status === 'open' || o.status === 'partially-filled') &&
        o.qtyRemaining > 0,
    )
    .sort((a, b) => a.unitPrice - b.unitPrice || a.placedAtTick - b.placedAtTick);
  for (const sell of sells) {
    if (budget < sell.unitPrice) break;
    const affordableQty = Math.floor(budget / sell.unitPrice);
    const qty = Math.min(sell.qtyRemaining, affordableQty);
    if (qty <= 0) continue;
    placeOrder(
      save,
      content,
      {
        settlementId: settlement.id,
        ownerId: NPC_OWNER,
        side: 'buy',
        itemId: sell.itemId,
        qty,
        unitPrice: sell.unitPrice,
        durationHours: duration,
      },
      ctx,
    );
    budget -= sell.unitPrice * qty;
  }
}

/** One NPC market refresh (runs on the authored market cadence): recompute every
 *  quote from stock pressure, rebuild the NPC's band + floor orders, and run a
 *  demand sweep when due. NPC orders are replaced wholesale each refresh. */
export function runNpcTick(save: SaveGame, ctx: TickContext): void {
  const { content } = ctx;
  save.orders = save.orders.filter((o) => o.ownerId !== NPC_OWNER);
  for (const settlement of content.settlements) {
    const profile = content.npcProfiles.find((p) => p.id === settlement.npcProfileId);
    if (!profile) continue;
    for (const entry of profile.entries) {
      let state = npcStateFor(save, settlement.id, entry.itemId);
      const basePrice = basePriceOf(content, entry.itemId);
      if (!state) {
        state = {
          settlementId: settlement.id,
          itemId: entry.itemId,
          currentStock: entry.equilibriumStock,
          currentQuote: basePrice,
          lastRefreshTick: save.tick,
        };
        save.npcStates.push(state);
      }
      state.currentQuote = npcQuote(entry, basePrice, state.currentStock);
      state.lastRefreshTick = save.tick;
      placeBandOrders(save, content, settlement, entry, state.currentQuote, ctx);
    }
    placeFloorBuys(save, content, settlement, profile, ctx);
    if (save.tick % profile.sweep.periodTicks === 0) {
      runSweep(save, content, settlement, profile, ctx);
    }
  }
}
