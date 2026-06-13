import { z } from 'zod';
import type { ContentIndex } from '@tradewright/content';
import type { SaveGame } from './state.js';

export const SAVE_FORMAT_VERSION = 1;

const itemQty = z.object({ itemId: z.string(), qty: z.number().int() }).strict();

const skillState = z.object({ xp: z.number().min(0), level: z.number().int().min(1) }).strict();

const locationState = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('at'), settlementId: z.string() }).strict(),
  z
    .object({
      kind: z.literal('traveling'),
      routeId: z.string(),
      toSettlementId: z.string(),
      departAtTick: z.number().int(),
      arriveAtTick: z.number().int(),
    })
    .strict(),
]);

const assignment = z
  .object({
    activityId: z.string(),
    settlementId: z.string(),
    startedAtTick: z.number().int(),
    progressSeconds: z.number().min(0),
    haltedAtTick: z.number().int().nullable(),
    haltReason: z.enum(['inputs-exhausted', 'storage-full', 'travel', 'replaced']).nullable(),
  })
  .strict();

const character = z
  .object({
    id: z.string(),
    name: z.string().min(1),
    locationState,
    wallet: z.number().int().min(0),
    skills: z.record(z.string(), skillState),
    assignment: assignment.nullable(),
    caravanSlots: z.number().int().min(1),
  })
  .strict();

const storage = z
  .object({
    settlementId: z.string(),
    slots: z.record(z.string(), z.number().int().min(0)),
    expansionLevel: z.number().int().min(0),
  })
  .strict();

const order = z
  .object({
    id: z.string(),
    settlementId: z.string(),
    ownerId: z.string(),
    side: z.enum(['buy', 'sell']),
    itemId: z.string(),
    qtyTotal: z.number().int().positive(),
    qtyRemaining: z.number().int().min(0),
    unitPrice: z.number().positive(),
    escrowCoinRemaining: z.number().min(0),
    placedAtTick: z.number().int(),
    expiresAtTick: z.number().int(),
    status: z.enum(['open', 'partially-filled', 'filled', 'cancelled', 'expired']),
  })
  .strict();

const trade = z
  .object({
    id: z.string(),
    settlementId: z.string(),
    itemId: z.string(),
    qty: z.number().int().positive(),
    unitPrice: z.number().positive(),
    buyerId: z.string(),
    sellerId: z.string(),
    taxPaid: z.number().min(0),
    executedAtTick: z.number().int(),
  })
  .strict();

const riskOutcome = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('none') }).strict(),
  z
    .object({ kind: z.literal('loss'), lostItems: z.array(itemQty), mitigated: z.boolean() })
    .strict(),
]);

const shipment = z
  .object({
    id: z.string(),
    ownerId: z.string(),
    routeId: z.string(),
    fromSettlementId: z.string(),
    toSettlementId: z.string(),
    manifest: z.array(itemQty),
    departAtTick: z.number().int(),
    arriveAtTick: z.number().int(),
    mitigationPurchased: z.boolean(),
    riskOutcome: riskOutcome.nullable(),
    status: z.enum(['in-transit', 'delivered']),
  })
  .strict();

const npcState = z
  .object({
    settlementId: z.string(),
    itemId: z.string(),
    currentStock: z.number(),
    currentQuote: z.number().positive(),
    lastRefreshTick: z.number().int(),
  })
  .strict();

const faucetTelemetry = z
  .object({
    settlementId: z.string(),
    periodStartTick: z.number().int(),
    faucetCoin: z.number().min(0),
    sinkCoin: z.number().min(0),
  })
  .strict();

const transaction = z
  .object({
    id: z.string(),
    characterId: z.string(),
    kind: z.enum([
      'trade-buy',
      'trade-sell',
      'listing-fee',
      'sales-tax',
      'dispatch-cost',
      'mitigation',
      'caravan-loss',
      'production',
      'consumption',
      'storage-expansion',
      'starter-grant',
    ]),
    coinDelta: z.number().int(),
    balanceAfter: z.number().int().min(0),
    items: z.array(itemQty).nullable(),
    settlementId: z.string().nullable(),
    refId: z.string().nullable(),
    atTick: z.number().int(),
  })
  .strict();

const summaryEntry = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('actions'),
      skillId: z.string(),
      activityId: z.string(),
      settlementId: z.string(),
      count: z.number().int().positive(),
      produced: z.array(itemQty),
      consumed: z.array(itemQty),
      xpGained: z.number().min(0),
    })
    .strict(),
  z
    .object({
      kind: z.literal('level-up'),
      skillId: z.string(),
      level: z.number().int(),
      tier: z.number().int(),
    })
    .strict(),
  z
    .object({
      kind: z.literal('halt'),
      activityId: z.string(),
      reason: z.enum(['inputs-exhausted', 'storage-full', 'travel', 'replaced']),
      atTick: z.number().int(),
      missingInputs: z.array(itemQty).optional(),
    })
    .strict(),
  z
    .object({
      kind: z.literal('order'),
      outcome: z.enum(['filled', 'partially-filled', 'expired']),
      orderId: z.string(),
      settlementId: z.string(),
      side: z.enum(['buy', 'sell']),
      itemId: z.string(),
      qty: z.number().int(),
      unitPrice: z.number(),
      proceeds: z.number(),
      taxPaid: z.number(),
    })
    .strict(),
  z
    .object({
      kind: z.literal('caravan'),
      shipmentId: z.string(),
      toSettlementId: z.string(),
      delivered: z.array(itemQty),
      riskOutcome,
    })
    .strict(),
  z.object({ kind: z.literal('travel'), settlementId: z.string() }).strict(),
]);

const pendingSummary = z
  .object({
    fromTick: z.number().int(),
    toTick: z.number().int(),
    tickSeconds: z.number().positive(),
    elapsedSeconds: z.number().min(0),
    capped: z.boolean(),
    capHours: z.number().nullable(),
    entries: z.array(summaryEntry),
    netCoinDelta: z.number(),
  })
  .strict();

const settings = z
  .object({
    displayLocale: z.string().nullable(),
    notificationPrefs: z.object({ categories: z.record(z.string(), z.boolean()) }).strict(),
  })
  .strict();

export const saveGameSchema = z
  .object({
    formatVersion: z.number().int().positive(),
    contentVersion: z.string(),
    worldSeed: z.number().int(),
    tick: z.number().int().min(0),
    rngState: z.number(),
    lastSeenWallClock: z.number().nullable(),
    lastMonotonicMark: z.number().nullable(),
    character: character.nullable(),
    storages: z.array(storage),
    orders: z.array(order),
    trades: z.array(trade),
    shipments: z.array(shipment),
    npcStates: z.array(npcState),
    faucetTelemetry: z.array(faucetTelemetry),
    transactions: z.array(transaction),
    pendingSummary: pendingSummary.nullable(),
    nextIds: z.record(z.string(), z.number().int()),
    settings,
  })
  .strict();

export function createSave(content: ContentIndex, worldSeed: number): SaveGame {
  const itemById = new Map(content.items.map((i) => [i.id, i]));
  const npcStates = content.settlements.flatMap((settlement) => {
    const profile = content.npcProfiles.find((p) => p.id === settlement.npcProfileId);
    if (!profile) return [];
    return profile.entries.map((entry) => ({
      settlementId: settlement.id,
      itemId: entry.itemId,
      currentStock: entry.equilibriumStock,
      currentQuote: itemById.get(entry.itemId)?.basePrice ?? 1,
      lastRefreshTick: 0,
    }));
  });
  return {
    formatVersion: SAVE_FORMAT_VERSION,
    contentVersion: content.contentVersion,
    worldSeed,
    tick: 0,
    rngState: worldSeed | 0,
    lastSeenWallClock: null,
    lastMonotonicMark: null,
    character: null,
    storages: [],
    orders: [],
    trades: [],
    shipments: [],
    npcStates,
    faucetTelemetry: [],
    transactions: [],
    pendingSummary: null,
    nextIds: {},
    settings: { displayLocale: null, notificationPrefs: { categories: {} } },
  };
}

export function serializeSave(save: SaveGame): string {
  return JSON.stringify(save);
}

type Migration = (old: unknown) => unknown;
const migrations = new Map<number, Migration>();

export function registerMigration(fromVersion: number, migrate: Migration): () => void {
  migrations.set(fromVersion, migrate);
  return () => migrations.delete(fromVersion);
}

/** Validate on load; migrate older formats forward (research R7). */
export function loadSave(json: string, _content: ContentIndex): SaveGame {
  let doc: unknown = JSON.parse(json);
  const version = (doc as { formatVersion?: unknown }).formatVersion;
  if (typeof version !== 'number') throw new Error('save has no formatVersion');
  if (version > SAVE_FORMAT_VERSION) {
    throw new Error(`save formatVersion ${version} is from a future build`);
  }
  let current = version;
  while (current < SAVE_FORMAT_VERSION) {
    const migrate = migrations.get(current);
    if (!migrate) throw new Error(`no migration registered from save formatVersion ${current}`);
    doc = migrate(doc);
    const next = (doc as { formatVersion?: unknown }).formatVersion;
    if (typeof next !== 'number' || next <= current) {
      throw new Error(`migration from ${current} did not advance formatVersion`);
    }
    current = next;
  }
  return saveGameSchema.parse(doc) as SaveGame;
}
