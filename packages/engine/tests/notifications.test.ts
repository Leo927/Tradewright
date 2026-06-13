import { describe, expect, it, beforeEach } from 'vitest';
import { content } from '@tradewright/content';
import { createSave } from '../src/world/save.js';
import { createCharacter } from '../src/world/character.js';
import { getStorage, type SaveGame } from '../src/world/state.js';
import { assignActivity } from '../src/skills/activities.js';
import { dispatchCaravan } from '../src/caravan/shipments.js';
import { placeOrder } from '../src/market/orderbook.js';
import { notifiableMoments, optedInMoments } from '../src/world/notifications.js';

const B = 'settlement.brackwater';

let save: SaveGame;

beforeEach(() => {
  save = createSave(content, 7);
  createCharacter(save, content, { name: 'Notify', startSettlementId: B });
});

describe('notifiable moments (FR-064)', () => {
  it('schedules a caravan-arrival moment at the shipment arrival tick', () => {
    getStorage(save, B).slots['item.pinewood'] = 5;
    const ship = dispatchCaravan(save, content, {
      routeId: 'route.brackwater-emberfall',
      manifest: [{ itemId: 'item.pinewood', qty: 5 }],
    });
    const moment = notifiableMoments(save, content).find((m) => m.categoryId === 'caravan-arrival');
    expect(moment).toBeDefined();
    expect(moment?.fireAtTick).toBe(ship.arriveAtTick);
    expect(moment?.settlementId).toBe('settlement.emberfall');
  });

  it('schedules an order-expiry moment and an offline-cap moment', () => {
    getStorage(save, B).slots['item.silverfin'] = 5;
    const order = placeOrder(
      save,
      content,
      { settlementId: B, ownerId: save.character!.id, side: 'sell', itemId: 'item.silverfin', qty: 5, unitPrice: 99, durationHours: 24 },
      { emit: () => {} },
    );
    assignActivity(save, content, { activityId: 'activity.line-silverfin' });
    const moments = notifiableMoments(save, content);
    expect(moments.find((m) => m.categoryId === 'order-filled-expired')?.fireAtTick).toBe(order.expiresAtTick);
    const capTicks = Math.ceil((content.world.offlineCapHours * 3600) / content.world.worldTickSeconds);
    expect(moments.find((m) => m.categoryId === 'offline-cap-reached')?.fireAtTick).toBe(save.tick + capTicks);
  });

  it('never produces an online-version-only category in V1', () => {
    assignActivity(save, content, { activityId: 'activity.line-silverfin' });
    const moments = notifiableMoments(save, content);
    expect(moments.some((m) => m.categoryId === 'committed-start-approaching')).toBe(false);
  });

  it('opts every category out by default; opting in surfaces its moments', () => {
    getStorage(save, B).slots['item.pinewood'] = 5;
    dispatchCaravan(save, content, {
      routeId: 'route.brackwater-emberfall',
      manifest: [{ itemId: 'item.pinewood', qty: 5 }],
    });
    expect(optedInMoments(save, content)).toEqual([]);
    save.settings.notificationPrefs.categories['caravan-arrival'] = true;
    const opted = optedInMoments(save, content);
    expect(opted).toHaveLength(1);
    expect(opted[0]!.categoryId).toBe('caravan-arrival');
  });
});
