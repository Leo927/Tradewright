import { describe, expect, it } from 'vitest';
import { content } from '@tradewright/content';
import type { GameEvent } from '@tradewright/contract';
import { createSave } from '../src/world/save.js';
import { createCharacter } from '../src/world/character.js';
import { getStorage, type SaveGame } from '../src/world/state.js';
import { placeOrder, cancelOrder, expireOrders } from '../src/market/orderbook.js';
import { NPC_OWNER } from '../src/npc/state.js';

const B = 'settlement.brackwater';
const ITEMS = ['item.silverfin', 'item.coney-leather', 'item.coney-hide'];

/** Deterministic LCG so each seed reproduces a fixed op sequence. */
function mkRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function sumCoinDelta(save: SaveGame): number {
  return save.transactions.reduce((acc, t) => acc + t.coinDelta, 0);
}

function activeSellEscrow(save: SaveGame, itemId: string): number {
  return save.orders
    .filter(
      (o) =>
        o.ownerId === save.character!.id &&
        o.side === 'sell' &&
        o.itemId === itemId &&
        (o.status === 'open' || o.status === 'partially-filled'),
    )
    .reduce((acc, o) => acc + o.qtyRemaining, 0);
}

function storageTotal(save: SaveGame, itemId: string): number {
  return save.storages.reduce((acc, s) => acc + (s.slots[itemId] ?? 0), 0);
}

function playerNetFromNpc(save: SaveGame, itemId: string): number {
  const id = save.character!.id;
  let net = 0;
  for (const t of save.trades) {
    if (t.itemId !== itemId) continue;
    if (t.buyerId === id) net += t.qty;
    if (t.sellerId === id) net -= t.qty;
  }
  return net;
}

function assertInvariants(save: SaveGame, initialItems: Record<string, number>): void {
  // Coin: the wallet is exactly the sum of every ledger entry — no coin enters or
  // leaves except through a recorded Transaction (FR-052, SC-010).
  expect(save.character!.wallet).toBe(sumCoinDelta(save));
  expect(save.character!.wallet).toBeGreaterThanOrEqual(0);
  // Ledger integrity: balanceAfter chains from zero.
  let running = 0;
  for (const t of save.transactions) {
    running += t.coinDelta;
    expect(t.balanceAfter).toBe(running);
  }
  // Items: storage + sell-escrow conserves, adjusting only for goods exchanged
  // with the NPC counterparty (locality invariant — no duplication or loss).
  for (const itemId of ITEMS) {
    const held = storageTotal(save, itemId) + activeSellEscrow(save, itemId);
    expect(held).toBe(initialItems[itemId]! + playerNetFromNpc(save, itemId));
    expect(held).toBeGreaterThanOrEqual(0);
  }
  for (const o of save.orders) expect(o.qtyRemaining).toBeGreaterThanOrEqual(0);
}

function runSequence(seed: number): void {
  const save = createSave(content, seed);
  const events: GameEvent[] = [];
  const ctx = { content, emit: (e: GameEvent) => events.push(e) };
  createCharacter(save, content, { name: 'Prop', startSettlementId: B });
  const storage = getStorage(save, B);
  for (const itemId of ITEMS) storage.slots[itemId] = 40;
  const initialItems = Object.fromEntries(ITEMS.map((i) => [i, storageTotal(save, i)]));

  const rng = mkRng(seed);
  const pick = <T>(arr: T[]): T => arr[Math.floor(rng() * arr.length)]!;
  const id = save.character!.id;

  for (let step = 0; step < 120; step++) {
    const roll = rng();
    try {
      if (roll < 0.32) {
        const itemId = pick(ITEMS);
        const qty = 1 + Math.floor(rng() * 5);
        placeOrder(save, content, { settlementId: B, ownerId: id, side: 'sell', itemId, qty, unitPrice: 1 + Math.floor(rng() * 6), durationHours: 1 }, ctx);
      } else if (roll < 0.62) {
        const itemId = pick(ITEMS);
        const qty = 1 + Math.floor(rng() * 4);
        placeOrder(save, content, { settlementId: B, ownerId: id, side: 'buy', itemId, qty, unitPrice: 1 + Math.floor(rng() * 4), durationHours: 1 }, ctx);
      } else if (roll < 0.8) {
        // NPC counterparty to induce real fills (trades).
        const itemId = pick(ITEMS);
        const side = rng() < 0.5 ? 'buy' : 'sell';
        placeOrder(save, content, { settlementId: B, ownerId: NPC_OWNER, side, itemId, qty: 1 + Math.floor(rng() * 5), unitPrice: 1 + Math.floor(rng() * 6), durationHours: 1 }, ctx);
      } else if (roll < 0.9) {
        const mine = save.orders.filter((o) => o.ownerId === id && (o.status === 'open' || o.status === 'partially-filled'));
        if (mine.length > 0) cancelOrder(save, pick(mine).id, ctx, id);
      } else {
        save.tick += 200; // jump past some expiries
        expireOrders(save, ctx);
      }
    } catch {
      // Rejections (insufficient funds/goods, invalid order) are expected and must
      // not break conservation — skip and continue.
    }
    assertInvariants(save, initialItems);
  }
}

describe('conservation across randomized trade/cancel/expiry sequences (SC-010)', () => {
  for (const seed of [1, 7, 42, 99, 2024, 31337]) {
    it(`conserves coin and items for seed ${seed}`, () => {
      runSequence(seed);
    });
  }
});
