import type { ContentIndex } from '@tradewright/content';
import { settlementDef } from './storage.js';

/** Effective tier of a settlement's station family (FR-037): the highest
 *  `baseTier` among its station facilities of that craft family, or 0 when the
 *  settlement has no station of the family at all. Refining/crafting requires
 *  the local station's effective tier to be at least the activity's tier. */
export function effectiveStationTier(
  content: ContentIndex,
  settlementId: string,
  craftFamily: string,
): number {
  const settlement = settlementDef(content, settlementId);
  let tier = 0;
  for (const facility of settlement.facilities) {
    if (facility.kind === 'station' && facility.craftFamily === craftFamily) {
      tier = Math.max(tier, facility.baseTier);
    }
  }
  return tier;
}
