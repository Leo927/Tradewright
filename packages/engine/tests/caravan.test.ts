import { describe, expect, it, beforeEach } from 'vitest';
import { content } from '@tradewright/content';
import type { GameEvent } from '@tradewright/contract';
import { createSave } from '../src/world/save.js';
import { createCharacter } from '../src/world/character.js';
import { getStorage, type SaveGame } from '../src/world/state.js';
import { EngineError } from '../src/world/ledger.js';
import { dispatchCaravan, resolveArrivals } from '../src/caravan/shipments.js';
import { caravanCapacityWeight, haulingSkill } from '../src/caravan/hauling.js';
import { travelTo, resolveTravelTick } from '../src/world/travel.js';
import { runTick, fastForward } from '../src/simulation/tick.js';
import { rngNext } from '../src/simulation/rng.js';
import { assignActivity } from '../src/skills/activities.js';

const B = 'settlement.brackwater';
const E = 'settlement.emberfall';
const ROUTE = 'route.brackwater-emberfall'; // moderate: chance .15, loss .3, mitF .5, dispatch 30, mit 25
const HIGH_ROUTE = 'route.greywatch-brackwater'; // from B → greywatch: chance .25, loss .4, dispatch 35
const PINE = 'item.pinewood'; // weight 2 → capacity 60 holds 30
const route = (id: string) => content.routes.find((r) => r.id === id)!;

let save: SaveGame;
let events: GameEvent[];
const ctx = () => ({ content, emit: (e: GameEvent) => events.push(e) });

function freshAtB(): SaveGame {
  const s = createSave(content, 7);
  createCharacter(s, content, { name: 'Hauler', startSettlementId: B });
  return s;
}

/** Asserts the call rejects with a specific structured ErrorCode (the human
 *  message is dev diagnostics only — protocol Part V). */
function expectCode(fn: () => unknown, code: string): void {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(EngineError);
    expect((e as EngineError).code).toBe(code);
    return;
  }
  throw new Error(`expected EngineError ${code}`);
}

/** Deterministic: the lowest RNG state whose next draw lands below / at a
 *  threshold — lets risk tests force a loss or a clean run without real chance. */
function stateForRoll(below: number, wantLoss: boolean): number {
  for (let s = 1; s < 1_000_000; s++) {
    const v = rngNext(s).value;
    if (wantLoss ? v < below : v >= below) return s;
  }
  throw new Error('no RNG state found for threshold');
}

beforeEach(() => {
  save = freshAtB();
  events = [];
});

describe('dispatch validation (FR-040)', () => {
  it('escrows the manifest, charges the dispatch cost, and starts an arrival timer', () => {
    getStorage(save, B).slots[PINE] = 20; // weight 40 ≤ 60
    const ship = dispatchCaravan(save, content, { routeId: ROUTE, manifest: [{ itemId: PINE, qty: 20 }] });
    expect(getStorage(save, B).slots[PINE]).toBeUndefined();
    expect(ship.toSettlementId).toBe(E);
    expect(ship.status).toBe('in-transit');
    expect(ship.arriveAtTick).toBeGreaterThan(save.tick);
    expect(save.transactions.some((t) => t.kind === 'dispatch-cost' && t.coinDelta === -30)).toBe(true);
    expect(save.character!.wallet).toBe(70);
  });

  it('rejects a load heavier than caravan capacity (WEIGHT_EXCEEDED)', () => {
    getStorage(save, B).slots[PINE] = 40; // weight 80 > 60
    try {
      dispatchCaravan(save, content, { routeId: ROUTE, manifest: [{ itemId: PINE, qty: 40 }] });
      throw new Error('expected rejection');
    } catch (e) {
      expect(e).toBeInstanceOf(EngineError);
      expect((e as EngineError).code).toBe('WEIGHT_EXCEEDED');
      expect((e as EngineError).details?.weightLimit).toBe(60);
      expect((e as EngineError).details?.weightRequested).toBe(80);
    }
    // nothing escrowed, no cost charged on a rejected dispatch
    expect(getStorage(save, B).slots[PINE]).toBe(40);
    expect(save.character!.wallet).toBe(100);
  });

  it('rejects a second dispatch when all caravan slots are busy (with explanation)', () => {
    getStorage(save, B).slots[PINE] = 20;
    const first = dispatchCaravan(save, content, { routeId: ROUTE, manifest: [{ itemId: PINE, qty: 5 }] });
    try {
      dispatchCaravan(save, content, { routeId: ROUTE, manifest: [{ itemId: PINE, qty: 5 }] });
      throw new Error('expected rejection');
    } catch (e) {
      expect(e).toBeInstanceOf(EngineError);
      expect((e as EngineError).code).toBe('CARAVAN_SLOTS_BUSY');
      expect((e as EngineError).details?.slotsTotal).toBe(1);
      expect((e as EngineError).details?.slotsBusy).toBe(1);
      expect((e as EngineError).details?.nextSlotFreeAtTick).toBe(first.arriveAtTick);
    }
  });

  it('rejects a dispatch the wallet cannot cover (INSUFFICIENT_FUNDS)', () => {
    getStorage(save, B).slots[PINE] = 5;
    save.character!.wallet = 10; // < 30 dispatch cost
    expectCode(
      () => dispatchCaravan(save, content, { routeId: ROUTE, manifest: [{ itemId: PINE, qty: 5 }] }),
      'INSUFFICIENT_FUNDS',
    );
    expect(getStorage(save, B).slots[PINE]).toBe(5);
  });

  it('rejects a route that does not reach the current settlement', () => {
    getStorage(save, B).slots[PINE] = 5;
    expectCode(
      () =>
        dispatchCaravan(save, content, {
          routeId: 'route.emberfall-thornholt',
          manifest: [{ itemId: PINE, qty: 5 }],
        }),
      'NOT_AT_SETTLEMENT',
    );
  });
});

describe('road risk (FR-040/042)', () => {
  it('rolls risk exactly once per shipment from the save RNG; mitigation reduces the loss by the factor', () => {
    const r = route(HIGH_ROUTE);
    const lossState = stateForRoll(r.riskChance, true);

    const a = freshAtB();
    getStorage(a, B).slots[PINE] = 20;
    const shipA = dispatchCaravan(a, content, { routeId: HIGH_ROUTE, manifest: [{ itemId: PINE, qty: 20 }] });
    a.rngState = lossState;
    a.tick = shipA.arriveAtTick;
    resolveArrivals(a, { content, emit: () => {} });

    const b = freshAtB();
    getStorage(b, B).slots[PINE] = 20;
    const shipB = dispatchCaravan(b, content, {
      routeId: HIGH_ROUTE,
      manifest: [{ itemId: PINE, qty: 20 }],
      mitigation: true,
    });
    b.rngState = lossState;
    b.tick = shipB.arriveAtTick;
    resolveArrivals(b, { content, emit: () => {} });

    // exactly one draw consumed
    expect(a.rngState).toBe(rngNext(lossState).state);

    expect(shipA.riskOutcome?.kind).toBe('loss');
    expect(shipB.riskOutcome?.kind).toBe('loss');
    if (shipA.riskOutcome?.kind === 'loss' && shipB.riskOutcome?.kind === 'loss') {
      expect(shipA.riskOutcome.lostItems).toEqual([{ itemId: PINE, qty: Math.floor(20 * r.lossFraction) }]);
      expect(shipB.riskOutcome.lostItems).toEqual([
        { itemId: PINE, qty: Math.floor(20 * r.lossFraction * r.mitigationFactor) },
      ]);
      expect(shipA.riskOutcome.mitigated).toBe(false);
      expect(shipB.riskOutcome.mitigated).toBe(true);
    }
    // the lost goods are recorded as a caravan-loss transaction (audit, FR-052)
    expect(a.transactions.some((t) => t.kind === 'caravan-loss')).toBe(true);
  });

  it('a clean run delivers the whole manifest into destination storage', () => {
    getStorage(save, B).slots[PINE] = 10;
    const ship = dispatchCaravan(save, content, { routeId: ROUTE, manifest: [{ itemId: PINE, qty: 10 }] });
    save.rngState = stateForRoll(route(ROUTE).riskChance, false);
    save.tick = ship.arriveAtTick;
    resolveArrivals(save, ctx());
    expect(getStorage(save, E).slots[PINE]).toBe(10);
    expect(ship.status).toBe('delivered');
    expect(ship.riskOutcome).toEqual({ kind: 'none' });
    expect(events.some((e) => e.type === 'CaravanArrived')).toBe(true);
  });
});

describe('offline ≡ online for caravans (SC-005)', () => {
  it('caravan arrival is identical live-ticked and fast-forwarded', () => {
    const live = freshAtB();
    const replay = freshAtB();
    getStorage(live, B).slots[PINE] = 10;
    getStorage(replay, B).slots[PINE] = 10;
    dispatchCaravan(live, content, { routeId: ROUTE, manifest: [{ itemId: PINE, qty: 10 }] });
    dispatchCaravan(replay, content, { routeId: ROUTE, manifest: [{ itemId: PINE, qty: 10 }] });
    const ticks =
      Math.ceil((route(ROUTE).caravanMinutes * 60) / content.world.worldTickSeconds) + 5;
    const silent = { content, emit: () => {} };
    for (let i = 0; i < ticks; i++) runTick(live, silent);
    fastForward(replay, ticks * content.world.worldTickSeconds, silent);
    expect(replay).toEqual(live);
  });
});

describe('hauling progression (FR-041)', () => {
  it('completed shipments grant hauling XP, growing capacity', () => {
    const skill = haulingSkill(content);
    const capBefore = caravanCapacityWeight(save, content);
    for (let n = 0; n < 3; n++) {
      getStorage(save, B).slots[PINE] = 4;
      const ship = dispatchCaravan(save, content, { routeId: ROUTE, manifest: [{ itemId: PINE, qty: 4 }] });
      save.rngState = stateForRoll(route(ROUTE).riskChance, false);
      save.tick = ship.arriveAtTick;
      resolveArrivals(save, ctx());
    }
    expect(save.character!.skills[skill.id]!.xp).toBe(3 * content.world.caravan.haulingXpPerShipment);
    expect(caravanCapacityWeight(save, content)).toBeGreaterThan(capBefore);
    expect(events.some((e) => e.type === 'SkillLeveled' && e.skillId === skill.id)).toBe(true);
  });
});

describe('personal travel (FR-002/044)', () => {
  it('halts the active assignment and transitions location on arrival', () => {
    assignActivity(save, content, { activityId: 'activity.line-silverfin' });
    expectCode(() => travelTo(save, content, { routeId: ROUTE }), 'CONFIRM_REQUIRED');
    travelTo(save, content, { routeId: ROUTE, confirmHaltAssignment: true });
    expect(save.character!.locationState.kind).toBe('traveling');
    expect(save.character!.assignment!.haltReason).toBe('travel');

    const loc = save.character!.locationState;
    if (loc.kind !== 'traveling') throw new Error('expected traveling');
    save.tick = loc.arriveAtTick;
    resolveTravelTick(save, ctx());
    expect(save.character!.locationState).toEqual({ kind: 'at', settlementId: E });
    expect(events.some((e) => e.type === 'TravelArrived')).toBe(true);
  });

  it('runs a caravan and personal travel on the same route on independent timers', () => {
    getStorage(save, B).slots[PINE] = 4;
    const ship = dispatchCaravan(save, content, { routeId: ROUTE, manifest: [{ itemId: PINE, qty: 4 }] });
    travelTo(save, content, { routeId: ROUTE });
    const loc = save.character!.locationState;
    if (loc.kind !== 'traveling') throw new Error('expected traveling');
    // travelMinutes (25) < caravanMinutes (180): the traveler arrives well before the caravan
    expect(loc.arriveAtTick).toBeLessThan(ship.arriveAtTick);
    save.tick = loc.arriveAtTick;
    resolveTravelTick(save, ctx());
    resolveArrivals(save, ctx());
    expect(save.character!.locationState).toEqual({ kind: 'at', settlementId: E });
    expect(save.shipments[0]!.status).toBe('in-transit');
  });
});
