import type { ContentIndex, SettlementDef } from '@tradewright/content';
import { getStorage, type SaveGame, type SettlementStorage } from './state.js';
import { applyTransaction, EngineError } from './ledger.js';

export function settlementDef(content: ContentIndex, settlementId: string): SettlementDef {
  const def = content.settlements.find((s) => s.id === settlementId);
  if (!def) throw new EngineError('NOT_FOUND', `unknown settlement ${settlementId}`);
  return def;
}

export function capacityUsed(content: ContentIndex, storage: SettlementStorage): number {
  const weightOf = new Map(content.items.map((i) => [i.id, i.weight]));
  return Object.entries(storage.slots).reduce(
    (sum, [itemId, qty]) => sum + (weightOf.get(itemId) ?? 0) * qty,
    0,
  );
}

export function capacityOf(content: ContentIndex, storage: SettlementStorage): number {
  const def = settlementDef(content, storage.settlementId);
  return def.baseStorageCapacity + storage.expansionLevel * def.storageExpansion.capacityPerLevel;
}

export function itemWeight(content: ContentIndex, itemId: string): number {
  return content.items.find((i) => i.id === itemId)?.weight ?? 0;
}

export function weightOfLines(
  content: ContentIndex,
  lines: { itemId: string; qty: number }[],
): number {
  return lines.reduce((sum, l) => sum + itemWeight(content, l.itemId) * l.qty, 0);
}

export function hasItems(
  storage: SettlementStorage,
  lines: { itemId: string; qty: number }[],
): boolean {
  return lines.every((l) => (storage.slots[l.itemId] ?? 0) >= l.qty);
}

export function missingItems(
  save: SaveGame,
  settlementId: string,
  lines: { itemId: string; qty: number }[],
): { itemId: string; qty: number; heldAtSettlementIds: string[] }[] {
  const storage = getStorage(save, settlementId);
  const missing: { itemId: string; qty: number; heldAtSettlementIds: string[] }[] = [];
  for (const line of lines) {
    const held = storage.slots[line.itemId] ?? 0;
    if (held < line.qty) {
      missing.push({
        itemId: line.itemId,
        qty: line.qty - held,
        heldAtSettlementIds: save.storages
          .filter((s) => s.settlementId !== settlementId && (s.slots[line.itemId] ?? 0) > 0)
          .map((s) => s.settlementId),
      });
    }
  }
  return missing;
}

/** Highest expansion level the settlement's storage facility allows (FR-037):
 *  capacity cannot be expanded past the storage facility's tier. */
export function storageExpansionCap(content: ContentIndex, settlementId: string): number {
  const settlement = settlementDef(content, settlementId);
  return settlement.facilities.find((f) => f.kind === 'storage')?.baseTier ?? 0;
}

/** Buy one level of storage capacity (FR-023): an escalating coin sink
 *  (`costBase × costGrowth^level`), capped by the storage facility tier
 *  (FR-037). The cost is the same one disclosed in StorageView.nextExpansion. */
export function expandStorage(save: SaveGame, content: ContentIndex, settlementId: string): void {
  const settlement = settlementDef(content, settlementId);
  const storage = getStorage(save, settlementId);
  if (storage.expansionLevel >= storageExpansionCap(content, settlementId)) {
    throw new EngineError('EXPANSION_CAPPED', `storage at ${settlementId} is at its facility-tier limit`, {
      settlementId,
    });
  }
  const cost = Math.round(
    settlement.storageExpansion.costBase *
      Math.pow(settlement.storageExpansion.costGrowth, storage.expansionLevel),
  );
  applyTransaction(save, { kind: 'storage-expansion', coinDelta: -cost, settlementId });
  storage.expansionLevel += 1;
}

export function addItems(
  storage: SettlementStorage,
  lines: { itemId: string; qty: number }[],
): void {
  for (const line of lines) {
    storage.slots[line.itemId] = (storage.slots[line.itemId] ?? 0) + line.qty;
  }
}

export function removeItems(
  storage: SettlementStorage,
  lines: { itemId: string; qty: number }[],
): void {
  if (!hasItems(storage, lines)) {
    throw new EngineError('INSUFFICIENT_INPUTS', `storage at ${storage.settlementId} short`);
  }
  for (const line of lines) {
    const next = (storage.slots[line.itemId] ?? 0) - line.qty;
    if (next === 0) delete storage.slots[line.itemId];
    else storage.slots[line.itemId] = next;
  }
}
