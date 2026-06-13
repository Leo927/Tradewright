import { describe, expect, it, beforeEach } from 'vitest';
import { content } from '@tradewright/content';
import type { GameEvent } from '@tradewright/contract';
import { createSave } from '../src/world/save.js';
import { createCharacter } from '../src/world/character.js';
import { getStorage, type SaveGame } from '../src/world/state.js';
import { EngineError } from '../src/world/ledger.js';
import { placeOrder, cancelOrder, expireOrders, reservedCoin } from '../src/market/orderbook.js';
import { NPC_OWNER } from '../src/npc/state.js';

let save: SaveGame;
let events: GameEvent[];
const ctx = () => ({ emit: (e: GameEvent) => events.push(e) });

beforeEach(() => {
  save = createSave(content, 7);
  events = [];
  createCharacter(save, content, { name: 'Trader', startSettlementId: 'settlement.brackwater' });
});

const B = 'settlement.brackwater';
const SILVER = 'item.silverfin';

function npcSell(itemId: string, qty: number, price: number, settlementId = B) {
  return placeOrder(
    save,
    content,
    { settlementId, ownerId: NPC_OWNER, side: 'sell', itemId, qty, unitPrice: price, durationHours: 4 },
    ctx(),
  );
}
function npcBuy(itemId: string, qty: number, price: number, settlementId = B) {
  return placeOrder(
    save,
    content,
    { settlementId, ownerId: NPC_OWNER, side: 'buy', itemId, qty, unitPrice: price, durationHours: 4 },
    ctx(),
  );
}
function playerBuy(itemId: string, qty: number, price: number, settlementId = B) {
  return placeOrder(
    save,
    content,
    { settlementId, ownerId: save.character!.id, side: 'buy', itemId, qty, unitPrice: price, durationHours: 4 },
    ctx(),
  );
}
function playerSell(itemId: string, qty: number, price: number, settlementId = B) {
  return placeOrder(
    save,
    content,
    { settlementId, ownerId: save.character!.id, side: 'sell', itemId, qty, unitPrice: price, durationHours: 4 },
    ctx(),
  );
}

describe('order placement + escrow (FR-032)', () => {
  it('a sell order escrows the goods out of storage', () => {
    getStorage(save, B).slots[SILVER] = 5;
    const order = playerSell(SILVER, 5, 3);
    expect(getStorage(save, B).slots[SILVER]).toBeUndefined();
    expect(order.qtyRemaining).toBe(5);
    expect(order.status).toBe('open');
  });

  it('a buy order escrows coin within the wallet (reserved, not spendable)', () => {
    const order = playerBuy(SILVER, 4, 5);
    expect(order.escrowCoinRemaining).toBe(20);
    expect(reservedCoin(save, save.character!.id)).toBe(20);
    // wallet still holds the coin; it is just reserved
    expect(save.character!.wallet).toBe(100);
  });

  it('rejects a sell with insufficient goods', () => {
    getStorage(save, B).slots[SILVER] = 2;
    expect(() => playerSell(SILVER, 5, 3)).toThrow(EngineError);
  });

  it('rejects a buy beyond spendable coin', () => {
    expect(() => playerBuy(SILVER, 100, 5)).toThrow(/INSUFFICIENT_FUNDS|cover/);
  });
});

describe('listing fee (disclosed sink)', () => {
  it('charges a listing fee transaction at placement', () => {
    getStorage(save, B).slots[SILVER] = 10;
    playerSell(SILVER, 10, 5); // notional 50 × 0.02 = 1
    const fee = save.transactions.find((t) => t.kind === 'listing-fee');
    expect(fee?.coinDelta).toBe(-1);
    expect(save.character!.wallet).toBe(99);
  });
});

describe('price-then-time priority matching (FR-033)', () => {
  it('fills the lowest-priced sell first, then earliest at a tie', () => {
    npcSell(SILVER, 5, 8);
    npcSell(SILVER, 5, 6); // cheaper — should match first
    playerBuy(SILVER, 5, 10);
    const filled = save.trades;
    expect(filled).toHaveLength(1);
    expect(filled[0]!.unitPrice).toBe(6);
  });

  it('crosses immediately at the resting (best) price, not the aggressive price', () => {
    npcSell(SILVER, 4, 6);
    playerBuy(SILVER, 4, 10);
    expect(save.trades[0]!.unitPrice).toBe(6);
    // paid 4×6 = 24 (price improvement vs the 10 bid), plus listing fee round(40×0.02)=1
    expect(save.character!.wallet).toBe(100 - 1 - 24);
    expect(getStorage(save, B).slots[SILVER]).toBe(4);
  });
});

describe('partial fills', () => {
  it('partially fills and rests the remainder', () => {
    npcSell(SILVER, 4, 6);
    const buy = playerBuy(SILVER, 10, 6);
    expect(buy.qtyRemaining).toBe(6);
    expect(buy.status).toBe('partially-filled');
    expect(events.some((e) => e.type === 'OrderPartiallyFilled')).toBe(true);
  });
});

describe('sales tax (sink) on the seller', () => {
  it('deducts sales tax from the seller proceeds as a Transaction', () => {
    getStorage(save, B).slots[SILVER] = 10;
    npcBuy(SILVER, 10, 20);
    playerSell(SILVER, 10, 20); // gross 200, tax round(200×0.05)=10
    const sell = save.transactions.find((t) => t.kind === 'trade-sell');
    const tax = save.transactions.find((t) => t.kind === 'sales-tax');
    expect(sell?.coinDelta).toBe(200);
    expect(tax?.coinDelta).toBe(-10);
    // wallet: 100 − fee(round(200×0.02)=4) + 200 − 10 = 286
    expect(save.character!.wallet).toBe(286);
  });
});

describe('cancel + expiry return escrow in full (FR-036)', () => {
  it('cancel returns escrowed goods and clears coin reservation', () => {
    getStorage(save, B).slots[SILVER] = 5;
    const sell = playerSell(SILVER, 5, 3);
    cancelOrder(save, sell.id, ctx(), save.character!.id);
    expect(getStorage(save, B).slots[SILVER]).toBe(5);
    expect(sell.status).toBe('cancelled');

    const buy = playerBuy(SILVER, 4, 5);
    cancelOrder(save, buy.id, ctx(), save.character!.id);
    expect(reservedCoin(save, save.character!.id)).toBe(0);
  });

  it('expiry returns escrow and emits OrderExpired', () => {
    getStorage(save, B).slots[SILVER] = 5;
    const sell = playerSell(SILVER, 5, 3);
    save.tick = sell.expiresAtTick;
    expireOrders(save, ctx());
    expect(sell.status).toBe('expired');
    expect(getStorage(save, B).slots[SILVER]).toBe(5);
    expect(events.some((e) => e.type === 'OrderExpired')).toBe(true);
  });
});

describe('matching isolation + self-match skip (FR-031/033)', () => {
  it('orders never match across settlements', () => {
    npcSell(SILVER, 5, 6, B);
    playerBuy(SILVER, 5, 10, 'settlement.emberfall'); // remote buy, different book
    expect(save.trades).toHaveLength(0);
  });

  it('same-owner crossing orders coexist unfilled', () => {
    getStorage(save, B).slots[SILVER] = 5;
    const sell = playerSell(SILVER, 5, 6);
    const buy = playerBuy(SILVER, 5, 10); // would cross, but same owner
    expect(save.trades).toHaveLength(0);
    expect(sell.status).toBe('open');
    expect(buy.status).toBe('open');
  });
});
