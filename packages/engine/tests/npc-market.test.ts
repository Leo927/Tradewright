import { describe, expect, it, beforeEach } from 'vitest';
import { content } from '@tradewright/content';
import type { GameEvent } from '@tradewright/contract';
import { createSave } from '../src/world/save.js';
import { createCharacter } from '../src/world/character.js';
import { getStorage, type SaveGame } from '../src/world/state.js';
import { placeOrder } from '../src/market/orderbook.js';
import { runNpcTick, npcQuote } from '../src/npc/simulation.js';
import { NPC_OWNER, npcStateFor } from '../src/npc/state.js';

let save: SaveGame;
let events: GameEvent[];
const ctx = () => ({ content, emit: (e: GameEvent) => events.push(e) });

const B = 'settlement.brackwater';
const LEATHER = 'item.coney-leather';

beforeEach(() => {
  save = createSave(content, 3);
  events = [];
  createCharacter(save, content, { name: 'NpcTester', startSettlementId: B });
});

const leatherEntry = () =>
  content.npcProfiles
    .find((p) => p.id === 'npc.brackwater')!
    .entries.find((e) => e.itemId === LEATHER)!;

describe('stock-pressure quote (research R4)', () => {
  it('rises as stock falls and is bounded by priceBounds', () => {
    const entry = leatherEntry(); // equilibrium 80, base 6, bounds 0.5–3
    expect(npcQuote(entry, 6, 80)).toBe(6);
    expect(npcQuote(entry, 6, 40)).toBe(12);
    expect(npcQuote(entry, 6, 1)).toBe(18); // clamped to base × maxMultiplier
    expect(npcQuote(entry, 6, 100_000)).toBe(3); // clamped to base × minMultiplier
  });

  it('player buying NPC sell depth raises the quote on the next refresh', () => {
    runNpcTick(save, ctx());
    const before = npcStateFor(save, B, LEATHER)!.currentQuote;
    const ask = save.orders.find(
      (o) => o.ownerId === NPC_OWNER && o.side === 'sell' && o.itemId === LEATHER,
    )!;
    placeOrder(
      save,
      content,
      { settlementId: B, ownerId: save.character!.id, side: 'buy', itemId: LEATHER, qty: ask.qtyRemaining, unitPrice: ask.unitPrice, durationHours: 4 },
      ctx(),
    );
    runNpcTick(save, ctx());
    const after = npcStateFor(save, B, LEATHER)!.currentQuote;
    expect(after).toBeGreaterThan(before);
  });
});

describe('NPC order refresh + floor buys', () => {
  it('refreshes NPC orders on the market tick', () => {
    expect(save.orders.filter((o) => o.ownerId === NPC_OWNER)).toHaveLength(0);
    runNpcTick(save, ctx());
    expect(save.orders.some((o) => o.ownerId === NPC_OWNER && o.side === 'sell')).toBe(true);
    expect(save.orders.some((o) => o.ownerId === NPC_OWNER && o.side === 'buy')).toBe(true);
  });

  it('places floor buy orders within the per-period budget', () => {
    runNpcTick(save, ctx());
    const profile = content.npcProfiles.find((p) => p.id === 'npc.brackwater')!;
    const perItem = Math.floor(profile.floorBudgetPerPeriod / profile.floorBuyList.length);
    for (const floor of profile.floorBuyList) {
      const order = save.orders.find(
        (o) => o.ownerId === NPC_OWNER && o.side === 'buy' && o.itemId === floor.itemId && o.unitPrice === floor.floorPrice,
      );
      expect(order, `floor buy for ${floor.itemId}`).toBeDefined();
      expect(order!.unitPrice * order!.qtyTotal).toBeLessThanOrEqual(perItem);
    }
  });
});

describe('demand sweep', () => {
  it('buys the cheapest player sells within the sweep budget on the sweep cadence', () => {
    const VEST = 'item.leather-vest'; // not an NPC entry/floor item — only the sweep can take it
    getStorage(save, B).slots[VEST] = 1;
    placeOrder(
      save,
      content,
      { settlementId: B, ownerId: save.character!.id, side: 'sell', itemId: VEST, qty: 1, unitPrice: 5, durationHours: 4 },
      ctx(),
    );
    save.tick = 30; // a sweep boundary (sweep.periodTicks = 30)
    runNpcTick(save, ctx());
    const trade = save.trades.find((t) => t.itemId === VEST);
    expect(trade).toBeDefined();
    expect(trade!.sellerId).toBe(save.character!.id);
    expect(trade!.buyerId).toBe(NPC_OWNER);
  });
});

describe('faucet/sink telemetry (FR-053)', () => {
  it('counts NPC→player coin as faucet and player→NPC coin as sink', () => {
    // Player sells to an NPC buy → faucet.
    getStorage(save, B).slots[LEATHER] = 4;
    placeOrder(
      save,
      content,
      { settlementId: B, ownerId: NPC_OWNER, side: 'buy', itemId: LEATHER, qty: 4, unitPrice: 10, durationHours: 4 },
      ctx(),
    );
    placeOrder(
      save,
      content,
      { settlementId: B, ownerId: save.character!.id, side: 'sell', itemId: LEATHER, qty: 4, unitPrice: 10, durationHours: 4 },
      ctx(),
    );
    // Player buys from an NPC sell → sink.
    placeOrder(
      save,
      content,
      { settlementId: B, ownerId: NPC_OWNER, side: 'sell', itemId: LEATHER, qty: 2, unitPrice: 5, durationHours: 4 },
      ctx(),
    );
    placeOrder(
      save,
      content,
      { settlementId: B, ownerId: save.character!.id, side: 'buy', itemId: LEATHER, qty: 2, unitPrice: 5, durationHours: 4 },
      ctx(),
    );
    const period = save.faucetTelemetry.find((e) => e.settlementId === B);
    expect(period).toBeDefined();
    expect(period!.faucetCoin).toBe(40); // 4 × 10 received from NPC
    expect(period!.sinkCoin).toBeGreaterThanOrEqual(10 + 2); // 2×5 paid to NPC + sales tax on the sale
  });
});
