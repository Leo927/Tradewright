import type { ContentIndex, SettlementDef } from '@tradewright/content';
import type { TickContext } from '../simulation/tick.js';
import { nextId, getStorage, type SaveGame, type MarketOrder } from '../world/state.js';
import { applyTransaction } from '../world/ledger.js';
import { addItems, settlementDef } from '../world/storage.js';
import { NPC_OWNER, adjustNpcStock } from '../npc/state.js';
import { recordFaucetFlow } from '../npc/faucet.js';

export type MarketContext = Pick<TickContext, 'emit'>;

function crosses(incoming: MarketOrder, resting: MarketOrder): boolean {
  return incoming.side === 'buy'
    ? incoming.unitPrice >= resting.unitPrice
    : incoming.unitPrice <= resting.unitPrice;
}

/** A unit of quantity matches exactly once (SC-010). The resting order sets the
 *  price (price priority, then time priority); same-owner orders never match
 *  (FR-033); matching never leaves the order's home settlement (FR-031). */
export function matchOrder(
  save: SaveGame,
  content: ContentIndex,
  incoming: MarketOrder,
  ctx: MarketContext,
): void {
  const settlement = settlementDef(content, incoming.settlementId);
  while (incoming.qtyRemaining > 0 && incoming.status !== 'filled') {
    const candidates = save.orders.filter(
      (o) =>
        o.settlementId === incoming.settlementId &&
        o.itemId === incoming.itemId &&
        o.side !== incoming.side &&
        o.ownerId !== incoming.ownerId &&
        (o.status === 'open' || o.status === 'partially-filled') &&
        o.qtyRemaining > 0 &&
        crosses(incoming, o),
    );
    if (candidates.length === 0) break;
    candidates.sort((a, b) =>
      incoming.side === 'buy'
        ? a.unitPrice - b.unitPrice || a.placedAtTick - b.placedAtTick
        : b.unitPrice - a.unitPrice || a.placedAtTick - b.placedAtTick,
    );
    const resting = candidates[0]!;
    const qty = Math.min(incoming.qtyRemaining, resting.qtyRemaining);
    const buyOrder = incoming.side === 'buy' ? incoming : resting;
    const sellOrder = incoming.side === 'buy' ? resting : incoming;
    settleTrade(save, content, settlement, buyOrder, sellOrder, resting.unitPrice, qty, ctx);
  }
}

function settleTrade(
  save: SaveGame,
  content: ContentIndex,
  settlement: SettlementDef,
  buyOrder: MarketOrder,
  sellOrder: MarketOrder,
  tradePrice: number,
  qty: number,
  ctx: MarketContext,
): void {
  const buyerIsNpc = buyOrder.ownerId === NPC_OWNER;
  const sellerIsNpc = sellOrder.ownerId === NPC_OWNER;
  const itemId = buyOrder.itemId;
  const gross = tradePrice * qty;
  const tax = sellerIsNpc ? 0 : Math.round(gross * settlement.salesTaxRate);

  // Goods leave the sell escrow and land in the buyer's local storage (FR-031).
  sellOrder.qtyRemaining -= qty;
  buyOrder.qtyRemaining -= qty;
  if (!buyerIsNpc) addItems(getStorage(save, settlement.id), [{ itemId, qty }]);

  if (!buyerIsNpc) {
    applyTransaction(save, {
      kind: 'trade-buy',
      coinDelta: -gross,
      items: [{ itemId, qty }],
      settlementId: settlement.id,
      refId: buyOrder.id,
    });
    // Release this fill's reservation; any price improvement frees back to spendable.
    buyOrder.escrowCoinRemaining = Math.max(0, buyOrder.escrowCoinRemaining - buyOrder.unitPrice * qty);
  }
  if (!sellerIsNpc) {
    applyTransaction(save, {
      kind: 'trade-sell',
      coinDelta: gross,
      items: [{ itemId, qty }],
      settlementId: settlement.id,
      refId: sellOrder.id,
    });
    if (tax > 0) {
      applyTransaction(save, {
        kind: 'sales-tax',
        coinDelta: -tax,
        settlementId: settlement.id,
        refId: sellOrder.id,
      });
    }
  }

  // Stock pressure: the player side moves the NPC's virtual stock (research R4).
  if (sellerIsNpc) adjustNpcStock(save, settlement.id, itemId, -qty);
  if (buyerIsNpc) adjustNpcStock(save, settlement.id, itemId, qty);

  // Faucet/sink telemetry (FR-053): NPC→player coin is a faucet; fees, taxes, and
  // player→NPC coin are sinks.
  if (buyerIsNpc && !sellerIsNpc) recordFaucetFlow(save, content, settlement.id, save.tick, gross, tax);
  else if (sellerIsNpc && !buyerIsNpc) recordFaucetFlow(save, content, settlement.id, save.tick, 0, gross);
  else recordFaucetFlow(save, content, settlement.id, save.tick, 0, tax);

  save.trades.push({
    id: nextId(save, 'trade'),
    settlementId: settlement.id,
    itemId,
    qty,
    unitPrice: tradePrice,
    buyerId: buyOrder.ownerId,
    sellerId: sellOrder.ownerId,
    taxPaid: tax,
    executedAtTick: save.tick,
  });

  emitFill(buyOrder, qty, gross, 0, ctx);
  emitFill(sellOrder, qty, gross, tax, ctx);
}

function emitFill(
  order: MarketOrder,
  filledQty: number,
  proceeds: number,
  taxPaid: number,
  ctx: MarketContext,
): void {
  order.status = order.qtyRemaining === 0 ? 'filled' : 'partially-filled';
  if (order.ownerId === NPC_OWNER) return;
  const base = {
    orderId: order.id,
    settlementId: order.settlementId,
    side: order.side,
    itemId: order.itemId,
    unitPrice: order.unitPrice,
    proceeds,
    taxPaid,
  } as const;
  if (order.status === 'filled') {
    ctx.emit({ type: 'OrderFilled', qty: filledQty, ...base });
  } else {
    ctx.emit({
      type: 'OrderPartiallyFilled',
      qty: filledQty,
      qtyRemaining: order.qtyRemaining,
      ...base,
    });
  }
}
