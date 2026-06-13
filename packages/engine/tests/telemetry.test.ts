import { describe, expect, it, beforeEach } from 'vitest';
import { content } from '@tradewright/content';
import { createSave } from '../src/world/save.js';
import { createCharacter } from '../src/world/character.js';
import { getStorage, type SaveGame } from '../src/world/state.js';
import { placeOrder } from '../src/market/orderbook.js';
import { NPC_OWNER } from '../src/npc/state.js';
import { recordFaucetFlow } from '../src/npc/faucet.js';
import { settlementFlow, allSettlementFlows, flowForPeriod } from '../src/npc/telemetry.js';

const B = 'settlement.brackwater';

let save: SaveGame;

beforeEach(() => {
  save = createSave(content, 7);
  createCharacter(save, content, { name: 'Trader', startSettlementId: B });
});

describe('economy telemetry surface (FR-053)', () => {
  it('aggregates per-settlement faucet and sink flow across periods', () => {
    recordFaucetFlow(save, content, B, 0, 100, 20);
    recordFaucetFlow(save, content, B, 0, 50, 10); // same period accumulates
    recordFaucetFlow(save, content, B, 10_000, 0, 30); // a later period

    const flow = settlementFlow(save, B);
    expect(flow.faucetCoin).toBe(150);
    expect(flow.sinkCoin).toBe(60);
    expect(flow.netCoin).toBe(90);
    expect(flow.periods.length).toBe(2);
    // periods are returned in chronological order
    expect(flow.periods[0]!.periodStartTick).toBeLessThan(flow.periods[1]!.periodStartTick);
  });

  it('reports zeros for settlements with no recorded flow and covers the whole map', () => {
    recordFaucetFlow(save, content, B, 0, 100, 0);
    const flows = allSettlementFlows(save, content);
    expect(flows.length).toBe(content.settlements.length);
    const quiet = flows.find((f) => f.settlementId !== B)!;
    expect(quiet.faucetCoin).toBe(0);
    expect(quiet.sinkCoin).toBe(0);
  });

  it('exposes a specific period and is fed by live trade sinks', () => {
    // A real listing fee is a sink recorded against the settlement's period.
    getStorage(save, B).slots['item.silverfin'] = 10;
    placeOrder(
      save,
      content,
      { settlementId: B, ownerId: save.character!.id, side: 'sell', itemId: 'item.silverfin', qty: 10, unitPrice: 20, durationHours: 4 },
      { emit: () => {} },
    );
    // Match against an NPC buy so a sale tax sink + faucet proceeds are recorded.
    placeOrder(
      save,
      content,
      { settlementId: B, ownerId: NPC_OWNER, side: 'buy', itemId: 'item.silverfin', qty: 10, unitPrice: 20, durationHours: 4 },
      { emit: () => {} },
    );
    const flow = settlementFlow(save, B);
    expect(flow.faucetCoin + flow.sinkCoin).toBeGreaterThan(0);
    const period = flowForPeriod(save, B, flow.periods[0]!.periodStartTick);
    expect(period).not.toBeNull();
  });
});
