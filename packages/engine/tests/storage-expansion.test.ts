import { describe, expect, it, beforeEach } from 'vitest';
import { content } from '@tradewright/content';
import { createSave } from '../src/world/save.js';
import { createCharacter } from '../src/world/character.js';
import { getStorage, type SaveGame } from '../src/world/state.js';
import { EngineError } from '../src/world/ledger.js';
import { expandStorage, capacityOf, storageExpansionCap } from '../src/world/storage.js';

const B = 'settlement.brackwater';
const settlement = content.settlements.find((s) => s.id === B)!;

let save: SaveGame;

beforeEach(() => {
  save = createSave(content, 7);
  createCharacter(save, content, { name: 'Keeper', startSettlementId: B });
  save.character!.wallet = 5000; // enough to expand to the cap
});

describe('storage expansion (FR-023/037)', () => {
  it('buys capacity at an escalating disclosed cost, capped at the storage facility tier', () => {
    const cap = storageExpansionCap(content, B);
    expect(cap).toBe(settlement.facilities.find((f) => f.kind === 'storage')!.baseTier);
    const storage = getStorage(save, B);
    let wallet = save.character!.wallet;

    for (let level = 0; level < cap; level++) {
      const cost = Math.round(
        settlement.storageExpansion.costBase * Math.pow(settlement.storageExpansion.costGrowth, level),
      );
      expandStorage(save, content, B);
      wallet -= cost;
      expect(storage.expansionLevel).toBe(level + 1);
      expect(save.character!.wallet).toBe(wallet);
      expect(
        save.transactions.some((t) => t.kind === 'storage-expansion' && t.coinDelta === -cost),
      ).toBe(true);
    }

    // capacity grew by capacityPerLevel each time
    expect(capacityOf(content, storage)).toBe(
      settlement.baseStorageCapacity + cap * settlement.storageExpansion.capacityPerLevel,
    );

    // at the cap, further expansion is rejected
    try {
      expandStorage(save, content, B);
      throw new Error('expected rejection');
    } catch (e) {
      expect(e).toBeInstanceOf(EngineError);
      expect((e as EngineError).code).toBe('EXPANSION_CAPPED');
    }
  });

  it('rejects expansion the wallet cannot cover', () => {
    save.character!.wallet = 10; // < first cost (200)
    try {
      expandStorage(save, content, B);
      throw new Error('expected rejection');
    } catch (e) {
      expect(e).toBeInstanceOf(EngineError);
      expect((e as EngineError).code).toBe('INSUFFICIENT_FUNDS');
    }
    expect(getStorage(save, B).expansionLevel).toBe(0);
  });
});
