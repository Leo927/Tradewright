import { describe, expect, it, beforeEach } from 'vitest';
import { content, type ContentIndex } from '@tradewright/content';
import type { GameEvent } from '@tradewright/contract';
import { createSave } from '../src/world/save.js';
import { createCharacter } from '../src/world/character.js';
import { getStorage, type SaveGame } from '../src/world/state.js';
import { EngineError } from '../src/world/ledger.js';
import { assignActivity } from '../src/skills/activities.js';
import { effectiveStationTier } from '../src/world/facilities.js';
import { fastForward } from '../src/simulation/tick.js';

let save: SaveGame;
let events: GameEvent[];
const ctx = (c: ContentIndex = content) => ({ content: c, emit: (e: GameEvent) => events.push(e) });

beforeEach(() => {
  save = createSave(content, 11);
  events = [];
});

function at(settlementId: string) {
  createCharacter(save, content, { name: 'Crafter', startSettlementId: settlementId });
}

describe('input consumption at stated ratios (FR-015, US3)', () => {
  it('consumes inputs and produces outputs atomically per action', () => {
    at('settlement.brackwater');
    getStorage(save, 'settlement.brackwater').slots['item.coney-hide'] = 6;
    assignActivity(save, content, { activityId: 'activity.tan-coney-leather' });
    fastForward(save, 4 * 120, ctx());
    const slots = getStorage(save, 'settlement.brackwater').slots;
    expect(slots['item.coney-hide'] ?? 0).toBe(6 - 3 * 2);
    expect(slots['item.coney-leather']).toBe(3);
    const consumed = save.transactions.filter((t) => t.kind === 'consumption');
    expect(consumed).toHaveLength(3);
    expect(consumed[0]!.items).toEqual([{ itemId: 'item.coney-hide', qty: 2 }]);
  });

  it('a finished good consumes outputs of two different skills (FR-021)', () => {
    at('settlement.brackwater');
    const slots = getStorage(save, 'settlement.brackwater').slots;
    slots['item.coney-leather'] = 2;
    slots['item.rough-cloth'] = 1;
    assignActivity(save, content, { activityId: 'activity.stitch-leather-vest' });
    fastForward(save, 240, ctx());
    const after = getStorage(save, 'settlement.brackwater').slots;
    expect(after['item.leather-vest']).toBe(1);
    expect(after['item.coney-leather']).toBeUndefined();
    expect(after['item.rough-cloth']).toBeUndefined();
  });
});

describe('insufficient-input rejection (FR-016, US3)', () => {
  it('lists the exact missing items and quantities as ids + counts', () => {
    at('settlement.brackwater');
    getStorage(save, 'settlement.brackwater').slots['item.coney-leather'] = 1;
    try {
      assignActivity(save, content, { activityId: 'activity.stitch-leather-vest' });
      expect.unreachable();
    } catch (e) {
      const err = e as EngineError;
      expect(err.code).toBe('INSUFFICIENT_INPUTS');
      expect(err.details?.missingInputs).toEqual([
        { itemId: 'item.coney-leather', qty: 1, heldAtSettlementIds: [] },
        { itemId: 'item.rough-cloth', qty: 1, heldAtSettlementIds: [] },
      ]);
    }
  });

  it('names the settlement(s) holding the missing items when stored elsewhere (FR-022)', () => {
    at('settlement.thornholt');
    getStorage(save, 'settlement.greywatch').slots['item.pinewood'] = 10;
    try {
      assignActivity(save, content, { activityId: 'activity.saw-pine-planks' });
      expect.unreachable();
    } catch (e) {
      const err = e as EngineError;
      expect(err.code).toBe('INSUFFICIENT_INPUTS');
      expect(err.details?.missingInputs?.[0]?.heldAtSettlementIds).toEqual([
        'settlement.greywatch',
      ]);
    }
  });
});

describe('inputs-exhausted halt (FR-016)', () => {
  it('halts online when inputs run out', () => {
    at('settlement.brackwater');
    getStorage(save, 'settlement.brackwater').slots['item.coney-hide'] = 2;
    assignActivity(save, content, { activityId: 'activity.tan-coney-leather' });
    fastForward(save, 3 * 120, ctx());
    expect(save.character!.assignment?.haltReason).toBe('inputs-exhausted');
    const halted = events.find((e) => e.type === 'ActivityHalted');
    expect(halted).toBeDefined();
    if (halted?.type === 'ActivityHalted') {
      expect(halted.reason).toBe('inputs-exhausted');
      expect(halted.missingInputs).toEqual([{ itemId: 'item.coney-hide', qty: 2 }]);
    }
  });

  it('halts identically via catch-up replay', () => {
    const live = createSave(content, 21);
    const replay = createSave(content, 21);
    for (const s of [live, replay]) {
      createCharacter(s, content, { name: 'X', startSettlementId: 'settlement.brackwater' });
      getStorage(s, 'settlement.brackwater').slots['item.coney-hide'] = 4;
      assignActivity(s, content, { activityId: 'activity.tan-coney-leather' });
    }
    const silent = { content, emit: () => {} };
    for (let i = 0; i < 60; i++) fastForward(live, 60, silent);
    fastForward(replay, 3600, silent);
    expect(replay).toEqual(live);
    expect(replay.character!.assignment?.haltReason).toBe('inputs-exhausted');
  });
});

describe('station gating (FR-037, T077)', () => {
  it('reads the effective tier of the local station family', () => {
    expect(effectiveStationTier(content, 'settlement.emberfall', 'smelting')).toBe(3);
    expect(effectiveStationTier(content, 'settlement.emberfall', 'tanning')).toBe(0);
  });

  it('rejects assignment when no local station of the family exists', () => {
    const noSmelter: ContentIndex = {
      ...content,
      settlements: content.settlements.map((s) =>
        s.id === 'settlement.emberfall'
          ? { ...s, facilities: s.facilities.filter((f) => f.craftFamily !== 'smelting') }
          : s,
      ),
    };
    const s2 = createSave(noSmelter, 5);
    createCharacter(s2, noSmelter, { name: 'S', startSettlementId: 'settlement.emberfall' });
    getStorage(s2, 'settlement.emberfall').slots['item.tin-ore'] = 4;
    try {
      assignActivity(s2, noSmelter, { activityId: 'activity.smelt-tin' });
      expect.unreachable();
    } catch (e) {
      const err = e as EngineError;
      expect(err.code).toBe('STATION_TIER_LOW');
      expect(err.details?.stationFamily).toBe('smelting');
      expect(err.details?.requiredTier).toBe(1);
      expect(err.details?.effectiveTier).toBe(0);
    }
  });

  it('gathering needs no station', () => {
    at('settlement.thornholt');
    expect(() => assignActivity(save, content, { activityId: 'activity.fell-pines' })).not.toThrow();
  });
});
