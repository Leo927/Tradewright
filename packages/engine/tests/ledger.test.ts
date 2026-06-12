import { describe, expect, it } from 'vitest';
import { content } from '@tradewright/content';
import { createSave } from '../src/world/save.js';
import { createCharacter } from '../src/world/character.js';
import { applyTransaction, EngineError } from '../src/world/ledger.js';

function newWorld() {
  const save = createSave(content, 1);
  createCharacter(save, content, { name: 'Ledger', startSettlementId: 'settlement.brackwater' });
  return save;
}

describe('wallet + append-only transaction log (FR-052, conservation)', () => {
  it('records a transaction for every coin mutation with running balance', () => {
    const save = newWorld();
    const start = save.character!.wallet;
    applyTransaction(save, { kind: 'listing-fee', coinDelta: -10 });
    applyTransaction(save, { kind: 'trade-sell', coinDelta: 25, items: [{ itemId: 'item.silverfin', qty: 5 }] });
    expect(save.character!.wallet).toBe(start + 15);
    const last = save.transactions.at(-1)!;
    expect(last.balanceAfter).toBe(start + 15);
    expect(last.items).toEqual([{ itemId: 'item.silverfin', qty: 5 }]);
    expect(save.transactions.map((t) => t.kind)).toContain('starter-grant');
  });

  it('never lets the wallet go negative', () => {
    const save = newWorld();
    const balance = save.character!.wallet;
    expect(() =>
      applyTransaction(save, { kind: 'dispatch-cost', coinDelta: -(balance + 1) }),
    ).toThrow(EngineError);
    expect(save.character!.wallet).toBe(balance);
    expect(save.transactions.filter((t) => t.kind === 'dispatch-cost')).toEqual([]);
  });

  it('transaction records carry structured ids/codes/values only (FR-076)', () => {
    const save = newWorld();
    const txn = applyTransaction(save, {
      kind: 'production',
      coinDelta: 0,
      items: [{ itemId: 'item.pinewood', qty: 1 }],
      settlementId: 'settlement.thornholt',
      refId: 'activity.fell-pines',
    });
    for (const value of Object.values(txn)) {
      if (typeof value === 'string') {
        expect(value).toMatch(/^[a-z0-9.:-]+$/i);
      }
    }
    expect(txn.atTick).toBe(save.tick);
  });

  it('transaction ids are deterministic and unique', () => {
    const a = newWorld();
    const b = newWorld();
    const t1 = applyTransaction(a, { kind: 'listing-fee', coinDelta: -1 });
    const t2 = applyTransaction(b, { kind: 'listing-fee', coinDelta: -1 });
    expect(t1.id).toBe(t2.id);
    const t3 = applyTransaction(a, { kind: 'listing-fee', coinDelta: -1 });
    expect(t3.id).not.toBe(t1.id);
  });
});
