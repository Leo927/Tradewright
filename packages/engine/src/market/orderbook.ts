import type { ContentIndex } from '@tradewright/content';
import type { TickContext } from '../simulation/tick.js';
import { nextId, getStorage, type SaveGame, type MarketOrder } from '../world/state.js';
import { applyTransaction, EngineError } from '../world/ledger.js';
import { addItems, removeItems, settlementDef } from '../world/storage.js';
import { NPC_OWNER } from '../npc/state.js';
import { matchOrder, type MarketContext } from './matching.js';

export interface PlaceOrderInput {
  settlementId: string;
  ownerId: string;
  side: 'buy' | 'sell';
  itemId: string;
  qty: number;
  unitPrice: number;
  durationHours: number;
}

const ACTIVE: MarketOrder['status'][] = ['open', 'partially-filled'];

export function listingFee(rate: number, qty: number, unitPrice: number): number {
  return Math.round(qty * unitPrice * rate);
}

/** Coin a player has earmarked across open buy orders — reserved within the
 *  wallet, not spendable, returned on cancel/expiry. */
export function reservedCoin(save: SaveGame, ownerId: string): number {
  return save.orders
    .filter((o) => o.ownerId === ownerId && o.side === 'buy' && ACTIVE.includes(o.status))
    .reduce((sum, o) => sum + o.escrowCoinRemaining, 0);
}

/** Place an order (FR-031/032): sell orders escrow goods and may only be placed
 *  where the goods sit; buy orders escrow coin and may be placed remotely. The
 *  listing fee is a disclosed sink. The order matches immediately on placement. */
export function placeOrder(
  save: SaveGame,
  content: ContentIndex,
  input: PlaceOrderInput,
  ctx: MarketContext,
): MarketOrder {
  const settlement = settlementDef(content, input.settlementId);
  const item = content.items.find((i) => i.id === input.itemId);
  if (!item) throw new EngineError('NOT_FOUND', `unknown item ${input.itemId}`);
  if (
    !Number.isInteger(input.qty) ||
    input.qty <= 0 ||
    !Number.isInteger(input.unitPrice) ||
    input.unitPrice <= 0 ||
    input.durationHours <= 0
  ) {
    throw new EngineError('INVALID_ORDER', 'order qty/price/duration must be positive integers');
  }

  const isNpc = input.ownerId === NPC_OWNER;
  const fee = isNpc ? 0 : listingFee(settlement.listingFeeRate, input.qty, input.unitPrice);

  if (!isNpc) {
    const character = save.character;
    if (!character) throw new EngineError('NO_CHARACTER', 'create a character first');
    if (input.side === 'sell') {
      const storage = getStorage(save, input.settlementId);
      if ((storage.slots[input.itemId] ?? 0) < input.qty) {
        throw new EngineError('INSUFFICIENT_INPUTS', `not enough ${input.itemId} to list`, {
          missingInputs: [
            {
              itemId: input.itemId,
              qty: input.qty - (storage.slots[input.itemId] ?? 0),
              heldAtSettlementIds: [],
            },
          ],
        });
      }
      if (character.wallet < fee) {
        throw new EngineError('INSUFFICIENT_FUNDS', 'cannot cover the listing fee', {
          requiredCoin: fee,
          availableCoin: character.wallet,
        });
      }
    } else {
      const notional = input.qty * input.unitPrice;
      const spendable = character.wallet - reservedCoin(save, character.id);
      if (spendable < notional + fee) {
        throw new EngineError('INSUFFICIENT_FUNDS', 'cannot cover the order plus fee', {
          requiredCoin: notional + fee,
          availableCoin: spendable,
        });
      }
    }
  }

  const expiresAtTick =
    save.tick + Math.ceil((input.durationHours * 3600) / content.world.worldTickSeconds);
  const order: MarketOrder = {
    id: nextId(save, 'order'),
    settlementId: input.settlementId,
    ownerId: input.ownerId,
    side: input.side,
    itemId: input.itemId,
    qtyTotal: input.qty,
    qtyRemaining: input.qty,
    unitPrice: input.unitPrice,
    escrowCoinRemaining: !isNpc && input.side === 'buy' ? input.qty * input.unitPrice : 0,
    placedAtTick: save.tick,
    expiresAtTick,
    status: 'open',
  };
  save.orders.push(order);

  if (!isNpc) {
    if (input.side === 'sell') {
      removeItems(getStorage(save, input.settlementId), [{ itemId: input.itemId, qty: input.qty }]);
    }
    if (fee > 0) {
      applyTransaction(save, {
        kind: 'listing-fee',
        coinDelta: -fee,
        settlementId: input.settlementId,
        refId: order.id,
      });
    }
  }

  matchOrder(save, content, order, ctx);
  return order;
}

/** Returns an active order's escrow in full: sell goods back to storage, buy
 *  coin earmark released back to spendable (FR-036). */
function releaseEscrow(save: SaveGame, order: MarketOrder): { goods: number; coin: number } {
  // NPC orders are virtual liquidity — they never held real goods or coin, so
  // there is nothing to return (returning would mint goods/coin from nothing).
  if (order.ownerId === NPC_OWNER) return { goods: 0, coin: 0 };
  if (order.side === 'sell') {
    const goods = order.qtyRemaining;
    if (goods > 0) addItems(getStorage(save, order.settlementId), [{ itemId: order.itemId, qty: goods }]);
    return { goods, coin: 0 };
  }
  const coin = order.escrowCoinRemaining;
  order.escrowCoinRemaining = 0;
  return { goods: 0, coin };
}

export function cancelOrder(
  save: SaveGame,
  orderId: string,
  ctx: MarketContext,
  ownerId?: string,
): void {
  const order = save.orders.find((o) => o.id === orderId);
  if (!order) throw new EngineError('NOT_FOUND', `unknown order ${orderId}`);
  if (ownerId !== undefined && order.ownerId !== ownerId) {
    throw new EngineError('INVALID_ORDER', 'not your order');
  }
  if (!ACTIVE.includes(order.status)) {
    throw new EngineError('INVALID_ORDER', `order ${orderId} is already ${order.status}`);
  }
  const returned = releaseEscrow(save, order);
  order.status = 'cancelled';
  if (order.ownerId !== NPC_OWNER) {
    ctx.emit({
      type: 'OrderCancelled',
      orderId: order.id,
      settlementId: order.settlementId,
      itemId: order.itemId,
      side: order.side,
      qtyReturned: returned.goods,
      escrowReturned: returned.coin,
    });
  }
}

/** Expire past-due orders, returning escrow in full (FR-036). Runs every tick so
 *  expiries interleave identically online and under catch-up replay. */
export function expireOrders(save: SaveGame, ctx: MarketContext): void {
  for (const order of save.orders) {
    if (!ACTIVE.includes(order.status) || order.expiresAtTick > save.tick) continue;
    const returned = releaseEscrow(save, order);
    order.status = 'expired';
    if (order.ownerId !== NPC_OWNER) {
      ctx.emit({
        type: 'OrderExpired',
        orderId: order.id,
        settlementId: order.settlementId,
        itemId: order.itemId,
        side: order.side,
        qtyReturned: returned.goods,
        escrowReturned: returned.coin,
      });
    }
  }
}

export function runMarketTick(save: SaveGame, ctx: TickContext): void {
  expireOrders(save, ctx);
}
