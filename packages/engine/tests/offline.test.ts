import { describe, expect, it } from 'vitest';
import { content } from '@tradewright/content';
import type { GameEvent } from '@tradewright/contract';
import { createSave } from '../src/world/save.js';
import { createCharacter } from '../src/world/character.js';
import { getStorage, type SaveGame } from '../src/world/state.js';
import { assignActivity } from '../src/skills/activities.js';
import { placeOrder } from '../src/market/orderbook.js';
import { fastForward, runTick } from '../src/simulation/tick.js';
import { elapsedSecondsSince } from '../src/simulation/clock.js';
import { accumulateSummary } from '../src/simulation/summary.js';
import { LocalGameHost } from '../src/adapter/local-game-host.js';
import { createManualClock } from '../src/simulation/clock.js';

/** CI-runner proxy for SC-002's "24 h catch-up < 3 s on a mid-range phone":
 *  CI runners are at least mid-range-phone class for pure arithmetic, so the
 *  same 3 s wall budget applies; 1 440 ticks of closed-form math sits far
 *  below it (research R5). */
const CATCHUP_24H_CI_BUDGET_MS = 3000;

const TICK = content.world.worldTickSeconds;

function newWorld(activity = 'activity.pick-bittergreen', settlement = 'settlement.greywatch') {
  const save = createSave(content, 7);
  createCharacter(save, content, { name: 'Away', startSettlementId: settlement });
  assignActivity(save, content, { activityId: activity });
  return save;
}

const silent = { content, emit: () => {} };

describe('offline ≡ online (SC-005, research R5)', () => {
  it('tick-replay state equals live-tick state to the unit', () => {
    const live = newWorld();
    const replay = newWorld();
    const ticks = (8 * 3600) / TICK;
    for (let i = 0; i < ticks; i++) runTick(live, silent);
    fastForward(replay, 8 * 3600, silent);
    expect(replay).toEqual(live);
  });

  it('summary reports ⌊elapsed ÷ action time⌋ actions with matching items and XP', () => {
    const save = newWorld();
    const events: GameEvent[] = [];
    const walletBefore = save.character!.wallet;
    const fromTick = save.tick;
    const result = fastForward(save, 8 * 3600, { content, emit: (e) => events.push(e) });
    const summary = accumulateSummary({
      events,
      fromTick,
      toTick: save.tick,
      tickSeconds: TICK,
      elapsedSeconds: 8 * 3600,
      capped: result.capped,
      capHours: result.capped ? content.world.offlineCapHours : null,
      netCoinDelta: save.character!.wallet - walletBefore,
    });
    const def = content.activities.find((a) => a.id === 'activity.pick-bittergreen')!;
    const expected = Math.floor((8 * 3600) / def.actionSeconds);
    const actions = summary.entries.find((e) => e.kind === 'actions');
    expect(actions).toBeDefined();
    if (actions?.kind === 'actions') {
      expect(actions.count).toBe(expected);
      expect(actions.produced).toEqual([{ itemId: 'item.bittergreen', qty: expected }]);
      expect(actions.xpGained).toBe(expected * def.xpPerAction);
    }
    expect(summary.capped).toBe(false);
  });
});

describe('cap behavior (FR-013)', () => {
  it('an absence beyond the cap accrues exactly the cap and reports it', () => {
    const capped = newWorld();
    const exact = newWorld();
    const capSeconds = content.world.offlineCapHours * 3600;
    const r1 = fastForward(capped, capSeconds + 10 * 3600, silent);
    const r2 = fastForward(exact, capSeconds, silent);
    expect(r1.capped).toBe(true);
    expect(r2.capped).toBe(false);
    expect(r1.ticksRun).toBe(r2.ticksRun);
    expect(capped.tick).toBe(exact.tick);
  });
});

describe('storage-full halt mid-absence (FR-016, quickstart US2)', () => {
  it('reports the halt with time and reason in the summary', () => {
    const save = newWorld('activity.fell-pines', 'settlement.thornholt');
    const storage = getStorage(save, 'settlement.thornholt');
    const settlement = content.settlements.find((s) => s.id === 'settlement.thornholt')!;
    const pinewood = content.items.find((i) => i.id === 'item.pinewood')!;
    storage.slots['item.pinewood'] =
      Math.floor(settlement.baseStorageCapacity / pinewood.weight) - 4;
    const events: GameEvent[] = [];
    fastForward(save, 8 * 3600, { content, emit: (e) => events.push(e) });
    const summary = accumulateSummary({
      events,
      fromTick: 0,
      toTick: save.tick,
      tickSeconds: TICK,
      elapsedSeconds: 8 * 3600,
      capped: false,
      capHours: null,
      netCoinDelta: 0,
    });
    const halt = summary.entries.find((e) => e.kind === 'halt');
    expect(halt).toBeDefined();
    if (halt?.kind === 'halt') {
      expect(halt.reason).toBe('storage-full');
      expect(halt.atTick).toBeGreaterThan(0);
    }
  });
});

describe('market events in the return summary (FR-014, T091)', () => {
  it('an order filled by the NPC during absence appears in the summary with proceeds and tax', () => {
    const save = createSave(content, 7);
    createCharacter(save, content, { name: 'Lister', startSettlementId: 'settlement.brackwater' });
    getStorage(save, 'settlement.brackwater').slots['item.silverfin'] = 5;
    // Price above the NPC band so only a demand sweep can take it — a clean,
    // deterministic fill mid-absence with a non-trivial tax.
    placeOrder(
      save,
      content,
      {
        settlementId: 'settlement.brackwater',
        ownerId: save.character!.id,
        side: 'sell',
        itemId: 'item.silverfin',
        qty: 5,
        unitPrice: 20,
        durationHours: 24,
      },
      { emit: () => {} },
    );
    const events: GameEvent[] = [];
    const walletBefore = save.character!.wallet;
    const fromTick = save.tick;
    fastForward(save, 8 * 3600, { content, emit: (e) => events.push(e) });
    const summary = accumulateSummary({
      events,
      fromTick,
      toTick: save.tick,
      tickSeconds: TICK,
      elapsedSeconds: 8 * 3600,
      capped: false,
      capHours: null,
      netCoinDelta: save.character!.wallet - walletBefore,
    });
    const order = summary.entries.find((e) => e.kind === 'order');
    expect(order).toBeDefined();
    if (order?.kind === 'order') {
      expect(order.outcome).toBe('filled');
      expect(order.side).toBe('sell');
      expect(order.itemId).toBe('item.silverfin');
      expect(order.proceeds).toBe(100);
      expect(order.taxPaid).toBe(5);
    }
  });
});

describe('time integrity (FR-017 V1 scope, research R8)', () => {
  it('a clock set backwards grants nothing', () => {
    const save: Pick<SaveGame, 'lastSeenWallClock'> = { lastSeenWallClock: 1_000_000 };
    expect(elapsedSecondsSince(save, 500_000)).toBe(0);
    expect(elapsedSecondsSince(save, 1_000_000)).toBe(0);
    expect(elapsedSecondsSince(save, 1_060_000)).toBe(60);
  });

  it('host pump with a backwards clock leaves state untouched', async () => {
    const clock = createManualClock(10_000_000);
    const save = createSave(content, 7);
    const host = new LocalGameHost({ content, clock, save, supportedLocaleIds: ['en'] });
    host.start();
    await host.send({
      type: 'CreateCharacter',
      name: 'B',
      startSettlementId: 'settlement.thornholt',
    });
    await host.send({ type: 'AssignActivity', activityId: 'activity.fell-pines' });
    clock.set(1_000_000);
    host.pump();
    expect(save.tick).toBe(0);
    expect(getStorage(save, 'settlement.thornholt').slots['item.pinewood']).toBeUndefined();
  });
});

describe('catch-up compute budget (SC-002 CI proxy)', () => {
  it(`replays a 24 h absence within ${CATCHUP_24H_CI_BUDGET_MS} ms`, () => {
    const save = newWorld();
    const start = performance.now();
    fastForward(save, 24 * 3600, silent);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(CATCHUP_24H_CI_BUDGET_MS);
  });
});

describe('host boot catch-up (T070)', () => {
  it('runs catch-up before the first query and stages a summary', async () => {
    const clock = createManualClock(1_000_000);
    const save = createSave(content, 7);
    const host = new LocalGameHost({ content, clock, save, supportedLocaleIds: ['en'] });
    host.start();
    await host.send({
      type: 'CreateCharacter',
      name: 'C',
      startSettlementId: 'settlement.greywatch',
    });
    await host.send({ type: 'AssignActivity', activityId: 'activity.pick-bittergreen' });

    clock.advance(8 * 3600 * 1000);
    const events: GameEvent[] = [];
    const host2 = new LocalGameHost({ content, clock, save, supportedLocaleIds: ['en'] });
    host2.subscribe((e) => events.push(e));
    host2.start();

    const summary = await host2.query({ type: 'GetSummary' });
    expect(summary).not.toBeNull();
    expect(summary!.entries.some((e) => e.kind === 'actions')).toBe(true);
    expect(events.some((e) => e.type === 'SummaryReady')).toBe(true);

    const ack = await host2.send({ type: 'CollectSummary' });
    expect(ack.accepted).toBe(true);
    expect(await host2.query({ type: 'GetSummary' })).toBeNull();
  });
});
