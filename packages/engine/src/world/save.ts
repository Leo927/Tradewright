import { z } from 'zod';
import type { ContentIndex } from '@tradewright/content';
import type { SaveGame } from './state.js';
import { emptyCombatSave } from '../combat/types.js';

export const SAVE_FORMAT_VERSION = 2;

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

const gearItemInstance = z
  .object({
    instanceId: z.string(),
    itemDefId: z.string(),
    gearScore: z.number(),
    modifiers: z.array(z.string()),
    durability: z.number().int().min(0),
  })
  .strict();

const storage = z
  .object({
    settlementId: z.string(),
    slots: z.record(z.string(), z.number().int().min(0)),
    expansionLevel: z.number().int().min(0),
    gearInstances: z.array(gearItemInstance),
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

// --- Combat-core save sub-state (data-model Part II) ---

const statRef = z.enum(['attack-power', 'armor-phys', 'armor-elem', 'damage-taken', 'heal-power']);
const gearSlot = z.enum(['weapon-focus', 'head', 'chest', 'hands', 'legs', 'feet', 'trinket']);

const schoolMastery = z
  .object({
    schoolId: z.string(),
    xp: z.number().min(0),
    level: z.number().int().min(0),
    pointsEarned: z.number().int().min(0),
    spentNodes: z.array(z.string()),
  })
  .strict();

const tacticsTrigger = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('always') }).strict(),
  z.object({ kind: z.literal('self-health-below'), pct: z.number() }).strict(),
  z.object({ kind: z.literal('enemy-health-above'), pct: z.number() }).strict(),
  z.object({ kind: z.literal('enemy-health-below'), pct: z.number() }).strict(),
  z.object({ kind: z.literal('ally-health-below'), pct: z.number() }).strict(),
  z.object({ kind: z.literal('buff-missing'), ref: z.string() }).strict(),
  z.object({ kind: z.literal('debuff-present'), ref: z.string() }).strict(),
  z.object({ kind: z.literal('at-expedition-start') }).strict(),
]);

const tacticsProgram = z
  .object({ rules: z.array(z.object({ abilityId: z.string(), trigger: tacticsTrigger }).strict()) })
  .strict();

const inertFlag = z
  .object({
    kind: z.enum(['unslotted-ability', 'inert-rule', 'inert-modifier']),
    ref: z.string(),
  })
  .strict();

const loadout = z
  .object({
    equipped: z.record(gearSlot, z.string()),
    slottedAbilityIds: z.array(z.string()),
    tactics: tacticsProgram,
    provisionPlan: z.array(z.object({ itemId: z.string(), thresholdPct: z.number() }).strict()),
    retreatThresholdPct: z.number().min(0),
    inertFlags: z.array(inertFlag),
  })
  .strict();

const timedEffect = z
  .object({
    ref: z.string(),
    kind: z.enum(['buff', 'debuff', 'hot', 'dot', 'shield', 'threat-amp']),
    sourceRef: z.string(),
    magnitude: z.number(),
    remainingSeconds: z.number(),
    stat: statRef.optional(),
    damageType: z.enum(['phys', 'elem']).optional(),
    shieldRemaining: z.number().optional(),
  })
  .strict();

const combatant = z
  .object({
    ref: z.string(),
    isEnemy: z.boolean(),
    health: z.number(),
    healthMax: z.number(),
    attributeTotals: z.record(z.string(), z.number()),
    armorPhys: z.number(),
    armorElem: z.number(),
    cooldowns: z.record(z.string(), z.number()),
    basicAttackCooldown: z.number(),
    effects: z.array(timedEffect),
    joinOrder: z.number().int(),
  })
  .strict();

const combatState = z
  .object({
    combatants: z.array(combatant),
    threatTables: z.record(z.string(), z.record(z.string(), z.number())),
    tickCount: z.number().int().min(0),
    rngState: z.number(),
  })
  .strict();

const buildSnapshot = z
  .object({
    schoolId: z.string(),
    combatSkillId: z.string(),
    slottedAbilityIds: z.array(z.string()),
    scalingAttributeIds: z.array(z.string()),
    masteryLevel: z.number().int().min(0),
    attributeTotals: z.record(z.string(), z.number()),
    armorPhys: z.number(),
    armorElem: z.number(),
    healthMax: z.number(),
    treePassiveBuffs: z.array(timedEffect),
    equipped: z.array(z.object({ slot: gearSlot, instanceId: z.string() }).strict()),
  })
  .strict();

const expeditionInstance = z
  .object({
    id: z.string(),
    characterId: z.string(),
    groundId: z.string(),
    enemyId: z.string(),
    buildSnapshot,
    combatState,
    haul: z
      .object({
        items: z.record(z.string(), z.number()),
        gearInstanceIds: z.array(z.string()),
        xp: z.number().min(0),
        masteryXp: z.number().min(0),
        points: z.number().int().min(0),
      })
      .strict(),
    provisionsRemaining: z.record(z.string(), z.number()),
    provisionCooldowns: z.record(z.string(), z.number()),
    startedAtTick: z.number().int(),
    state: z.discriminatedUnion('kind', [
      z.object({ kind: z.literal('fighting') }).strict(),
      z
        .object({
          kind: z.literal('ended'),
          reason: z.enum(['retreat', 'supplies', 'recalled', 'offline-cap']),
        })
        .strict(),
    ]),
  })
  .strict();

const combatSave = z
  .object({
    masteries: z.array(schoolMastery),
    loadout,
    expedition: expeditionInstance.nullable(),
    recoveryUntilTick: z.number().int().nullable(),
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
    combat: combatSave,
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
    combat: emptyCombatSave(),
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

/** v1 → v2 (M2 combat core): M1 saves gain an empty combat sub-state and every
 *  storage gains an empty gear-instance list. No economy data changes. */
registerMigration(1, (old) => {
  const doc = old as Record<string, unknown>;
  const storages = Array.isArray(doc.storages) ? doc.storages : [];
  return {
    ...doc,
    formatVersion: 2,
    storages: storages.map((s) => ({ ...(s as object), gearInstances: [] })),
    combat: emptyCombatSave(),
  };
});

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
