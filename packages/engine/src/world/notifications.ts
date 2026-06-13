import type { ContentIndex } from '@tradewright/content';
import type { SaveGame } from './state.js';

/** A future moment the client may surface as a device notification (FR-064).
 *  Carries category + tick + value payload only — text is composed at delivery
 *  from the category's `ui.json` template keys (i18n invariant 1, FR-076). */
export interface NotifiableMoment {
  categoryId: string;
  fireAtTick: number;
  settlementId: string | null;
}

function isOnlineOnly(content: ContentIndex, categoryId: string): boolean {
  return content.notificationCategories.find((c) => c.id === categoryId)?.onlineVersionOnly ?? false;
}

/** All upcoming notifiable moments derivable from known V1 timers: caravan
 *  arrivals, order expiries, and the offline cap. Online-version-only categories
 *  (e.g. committed-start-approaching) are never produced in V1 (FR-262). */
export function notifiableMoments(save: SaveGame, content: ContentIndex): NotifiableMoment[] {
  const character = save.character;
  if (!character) return [];
  const moments: NotifiableMoment[] = [];

  for (const s of save.shipments) {
    if (s.ownerId === character.id && s.status === 'in-transit') {
      moments.push({ categoryId: 'caravan-arrival', fireAtTick: s.arriveAtTick, settlementId: s.toSettlementId });
    }
  }
  for (const o of save.orders) {
    if (o.ownerId === character.id && (o.status === 'open' || o.status === 'partially-filled')) {
      moments.push({ categoryId: 'order-filled-expired', fireAtTick: o.expiresAtTick, settlementId: o.settlementId });
    }
  }
  if (character.assignment && character.assignment.haltReason === null) {
    const capTicks = Math.ceil((content.world.offlineCapHours * 3600) / content.world.worldTickSeconds);
    moments.push({ categoryId: 'offline-cap-reached', fireAtTick: save.tick + capTicks, settlementId: null });
  }

  return moments
    .filter((m) => content.notificationCategories.some((c) => c.id === m.categoryId))
    .filter((m) => !isOnlineOnly(content, m.categoryId))
    .filter((m) => m.fireAtTick > save.tick)
    .sort((a, b) => a.fireAtTick - b.fireAtTick);
}

/** Moments for categories the player has opted into (all opt-outs by default,
 *  FR-064) — the set a delivery adapter should actually schedule. */
export function optedInMoments(save: SaveGame, content: ContentIndex): NotifiableMoment[] {
  const prefs = save.settings.notificationPrefs.categories;
  return notifiableMoments(save, content).filter((m) => prefs[m.categoryId] === true);
}
