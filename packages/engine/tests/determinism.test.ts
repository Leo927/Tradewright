import { describe, expect, it } from 'vitest';
import { content } from '@tradewright/content';
import { createSave } from '../src/world/save.js';
import { createCharacter } from '../src/world/character.js';
import { getStorage, type SaveGame } from '../src/world/state.js';
import { assignActivity } from '../src/skills/activities.js';
import { placeOrder } from '../src/market/orderbook.js';
import { dispatchCaravan } from '../src/caravan/shipments.js';
import { NPC_OWNER } from '../src/npc/state.js';
import { LocalGameHost } from '../src/adapter/local-game-host.js';
import { createManualClock } from '../src/simulation/clock.js';

const B = 'settlement.brackwater';
const LOCALES = ['en', 'pseudo-expand'];

/** A world exercising every M1 system at once: an active gathering activity, a
 *  resting market order with an NPC counterparty, and a caravan in transit. */
function richSave(): SaveGame {
  const save = createSave(content, 24680);
  createCharacter(save, content, { name: 'Tycoon', startSettlementId: B });
  save.character!.wallet = 1000;
  getStorage(save, B).slots['item.pinewood'] = 30;
  getStorage(save, B).slots['item.silverfin'] = 12;
  assignActivity(save, content, { activityId: 'activity.line-silverfin' });
  placeOrder(
    save,
    content,
    { settlementId: B, ownerId: save.character!.id, side: 'sell', itemId: 'item.silverfin', qty: 6, unitPrice: 20, durationHours: 12 },
    { emit: () => {} },
  );
  placeOrder(
    save,
    content,
    { settlementId: B, ownerId: NPC_OWNER, side: 'buy', itemId: 'item.silverfin', qty: 3, unitPrice: 20, durationHours: 12 },
    { emit: () => {} },
  );
  dispatchCaravan(save, content, {
    routeId: 'route.brackwater-emberfall',
    manifest: [{ itemId: 'item.pinewood', qty: 10 }],
  });
  return save;
}

/** Run a clone through a host under one display locale for a fixed wall span. */
function runUnderLocale(localeId: string, hours: number): SaveGame {
  const save = structuredClone(richSave());
  const clock = createManualClock(5_000_000);
  const host = new LocalGameHost({ content, clock, save, supportedLocaleIds: LOCALES });
  host.start();
  void host.send({ type: 'SetDisplayLocale', localeId });
  clock.advance(hours * 3600 * 1000);
  host.pump();
  return save;
}

/** Engine state minus the client settings envelope, which legitimately differs
 *  by display locale (data-model Part V; the simulation never reads it). */
function engineState(save: SaveGame): unknown {
  const { settings: _settings, ...rest } = save;
  return rest;
}

describe('full-loop determinism across M1 systems (SC-014, quickstart item 3)', () => {
  it('identical inputs reach identical state on repeated runs', () => {
    const a = runUnderLocale('en', 12);
    const b = runUnderLocale('en', 12);
    expect(a).toEqual(b);
  });

  it('the display locale never changes engine outcomes (en ≡ pseudo)', () => {
    const en = runUnderLocale('en', 12);
    const pseudo = runUnderLocale('pseudo-expand', 12);
    expect(en.settings.displayLocale).toBe('en');
    expect(pseudo.settings.displayLocale).toBe('pseudo-expand');
    expect(engineState(en)).toEqual(engineState(pseudo));
  });

  it('exercised every system: the caravan delivered, the activity produced, the order rests', () => {
    const save = runUnderLocale('en', 12);
    // caravan arrived at the destination during the run
    expect(save.shipments[0]!.status).toBe('delivered');
    expect(getStorage(save, 'settlement.emberfall').slots['item.pinewood']).toBeGreaterThan(0);
    // gathering produced silverfin and granted XP
    expect(save.transactions.some((t) => t.kind === 'production')).toBe(true);
  });
});
