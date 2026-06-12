import { describe, expect, it } from 'vitest';
import type {
  Command,
  CommandAck,
  GameEvent,
  Query,
  CharacterView,
  StorageView,
  ActivityView,
  MarketView,
  OrderView,
  RouteView,
  ShipmentView,
  TransactionsPage,
  EventSummaryView,
  FacilityView,
  NotificationPrefsView,
} from '../src/index.js';

const commands: Command[] = [
  { type: 'CreateCharacter', name: '旅商アリア', startSettlementId: 'settlement.brackwater' },
  { type: 'AssignActivity', activityId: 'activity.gather-driftwood', confirmReplace: true },
  { type: 'StopActivity' },
  { type: 'CollectSummary' },
  {
    type: 'PlaceOrder',
    settlementId: 'settlement.brackwater',
    side: 'sell',
    itemId: 'item.driftwood',
    qty: 10,
    unitPrice: 4,
    durationHours: 24,
  },
  { type: 'CancelOrder', orderId: 'order-1' },
  {
    type: 'DispatchCaravan',
    routeId: 'route.brackwater-emberfall',
    manifest: [{ itemId: 'item.driftwood', qty: 5 }],
    mitigation: true,
  },
  { type: 'TravelTo', routeId: 'route.brackwater-emberfall', confirmHaltAssignment: true },
  { type: 'ExpandStorage', settlementId: 'settlement.brackwater' },
  { type: 'SetNotificationPref', categoryId: 'caravan-arrival', optIn: true },
  { type: 'SetDisplayLocale', localeId: 'pseudo-expand' },
];

const queries: Query[] = [
  { type: 'GetCharacter' },
  { type: 'GetStorage', settlementId: 'settlement.brackwater' },
  { type: 'GetActivities' },
  { type: 'GetMarket', settlementId: 'settlement.brackwater', itemId: 'item.driftwood' },
  { type: 'GetMyOrders' },
  { type: 'GetRoutes' },
  { type: 'GetShipments' },
  { type: 'GetTransactions', offset: 0, limit: 50 },
  { type: 'GetSummary' },
  { type: 'GetSettlementFacilities', settlementId: 'settlement.brackwater' },
  { type: 'GetNotificationPrefs' },
];

const summary: EventSummaryView = {
  fromTick: 0,
  toTick: 480,
  elapsedSeconds: 28800,
  capped: false,
  capHours: null,
  netCoinDelta: 120,
  entries: [
    {
      kind: 'actions',
      skillId: 'skill.foraging',
      activityId: 'activity.gather-driftwood',
      settlementId: 'settlement.brackwater',
      count: 96,
      produced: [{ itemId: 'item.driftwood', qty: 96 }],
      consumed: [],
      xpGained: 480,
    },
    { kind: 'level-up', skillId: 'skill.foraging', level: 4, tier: 1 },
    {
      kind: 'halt',
      activityId: 'activity.gather-driftwood',
      reason: 'storage-full',
      atTick: 480,
    },
    {
      kind: 'order',
      outcome: 'filled',
      orderId: 'order-1',
      settlementId: 'settlement.brackwater',
      side: 'sell',
      itemId: 'item.driftwood',
      qty: 10,
      unitPrice: 4,
      proceeds: 38,
      taxPaid: 2,
    },
    {
      kind: 'caravan',
      shipmentId: 'shipment-1',
      toSettlementId: 'settlement.emberfall',
      delivered: [{ itemId: 'item.driftwood', qty: 5 }],
      riskOutcome: { kind: 'loss', lostItems: [{ itemId: 'item.driftwood', qty: 1 }], mitigated: true },
    },
    { kind: 'travel', settlementId: 'settlement.emberfall' },
  ],
};

const events: GameEvent[] = [
  {
    type: 'ActionCompleted',
    activityId: 'activity.gather-driftwood',
    skillId: 'skill.foraging',
    settlementId: 'settlement.brackwater',
    outputs: [{ itemId: 'item.driftwood', qty: 1 }],
    inputsConsumed: [],
    xpGained: 5,
    atTick: 3,
  },
  {
    type: 'SkillLeveled',
    skillId: 'skill.foraging',
    level: 5,
    tier: 2,
    unlockedActivityIds: ['activity.gather-tidebloom'],
  },
  {
    type: 'ActivityHalted',
    activityId: 'activity.gather-driftwood',
    reason: 'inputs-exhausted',
    atTick: 10,
    missingInputs: [{ itemId: 'item.driftwood', qty: 2 }],
  },
  {
    type: 'OrderFilled',
    orderId: 'order-1',
    settlementId: 'settlement.brackwater',
    side: 'sell',
    itemId: 'item.driftwood',
    qty: 10,
    unitPrice: 4,
    proceeds: 38,
    taxPaid: 2,
  },
  {
    type: 'OrderPartiallyFilled',
    orderId: 'order-1',
    settlementId: 'settlement.brackwater',
    side: 'sell',
    itemId: 'item.driftwood',
    qty: 4,
    qtyRemaining: 6,
    unitPrice: 4,
    proceeds: 15,
    taxPaid: 1,
  },
  {
    type: 'OrderExpired',
    orderId: 'order-1',
    settlementId: 'settlement.brackwater',
    itemId: 'item.driftwood',
    side: 'sell',
    qtyReturned: 6,
    escrowReturned: 6,
  },
  {
    type: 'OrderCancelled',
    orderId: 'order-1',
    settlementId: 'settlement.brackwater',
    itemId: 'item.driftwood',
    side: 'buy',
    qtyReturned: 0,
    escrowReturned: 24,
  },
  {
    type: 'CaravanArrived',
    shipmentId: 'shipment-1',
    routeId: 'route.brackwater-emberfall',
    toSettlementId: 'settlement.emberfall',
    delivered: [{ itemId: 'item.driftwood', qty: 4 }],
    riskOutcome: { kind: 'none' },
  },
  { type: 'TravelArrived', settlementId: 'settlement.emberfall' },
  { type: 'SummaryReady', summary },
  { type: 'StateInvalidated', commandId: 'cmd-1', reasonCode: 'TIER_LOCKED' },
  { type: 'ConnectionStateChanged', online: false, asOfTick: 480 },
  { type: 'WalletChanged', balance: 250 },
  { type: 'StorageChanged', settlementId: 'settlement.brackwater' },
];

const acks: CommandAck[] = [
  { accepted: true, commandId: 'cmd-1' },
  {
    accepted: false,
    code: 'INSUFFICIENT_INPUTS',
    message: 'assignment requires 2x item.driftwood',
    details: {
      missingInputs: [
        { itemId: 'item.driftwood', qty: 2, heldAtSettlementIds: ['settlement.emberfall'] },
      ],
    },
  },
];

const characterView: CharacterView = {
  id: 'char-1',
  name: 'Ærwyn',
  locationState: { kind: 'at', settlementId: 'settlement.brackwater' },
  wallet: 100,
  skills: [{ skillId: 'skill.foraging', xp: 120, level: 3, tier: 1, xpForNextLevel: 200 }],
  assignment: {
    activityId: 'activity.gather-driftwood',
    settlementId: 'settlement.brackwater',
    startedAtTick: 0,
    nextActionAtTick: 5,
  },
  caravanSlotsTotal: 1,
  caravanSlotsBusy: 0,
  currentTick: 12,
};

const storageView: StorageView = {
  settlementId: 'settlement.brackwater',
  slots: [{ itemId: 'item.driftwood', qty: 12 }],
  capacityUsed: 12,
  capacity: 100,
  expansionLevel: 0,
  nextExpansion: { cost: 200, capacityGain: 50 },
  expansionCapReached: false,
};

const activityView: ActivityView = {
  activityId: 'activity.smelt-tin',
  skillId: 'skill.smelting',
  tier: 1,
  actionSeconds: 240,
  inputs: [{ itemId: 'item.tin-ore', qty: 2 }],
  outputs: [{ itemId: 'item.tin-bar', qty: 1 }],
  xpPerAction: 8,
  locked: true,
  lockReasons: [
    { code: 'TIER_LOCKED', requiredTier: 2, skillId: 'skill.smelting', currentTier: 1 },
    {
      code: 'INSUFFICIENT_INPUTS',
      missing: [{ itemId: 'item.tin-ore', qty: 2, heldAtSettlementIds: ['settlement.emberfall'] }],
    },
    { code: 'STATION_TIER_LOW', stationFamily: 'smelting', requiredTier: 2, effectiveTier: 1 },
  ],
};

const marketView: MarketView = {
  settlementId: 'settlement.brackwater',
  items: [
    {
      itemId: 'item.driftwood',
      bestBid: 3,
      bestAsk: 5,
      depth: [
        { side: 'buy', unitPrice: 3, qty: 20 },
        { side: 'sell', unitPrice: 5, qty: 8 },
      ],
      recentTrades: [{ itemId: 'item.driftwood', qty: 2, unitPrice: 4, executedAtTick: 11 }],
    },
  ],
};

const orderView: OrderView = {
  orderId: 'order-1',
  settlementId: 'settlement.brackwater',
  side: 'sell',
  itemId: 'item.driftwood',
  qtyTotal: 10,
  qtyRemaining: 6,
  unitPrice: 4,
  placedAtTick: 2,
  expiresAtTick: 1442,
  status: 'partially-filled',
};

const routeView: RouteView = {
  routeId: 'route.brackwater-emberfall',
  fromSettlementId: 'settlement.brackwater',
  toSettlementId: 'settlement.emberfall',
  caravanMinutes: 180,
  travelMinutes: 20,
  riskLevel: 'moderate',
  riskChance: 0.15,
  lossFraction: 0.3,
  mitigationCost: 25,
  mitigationFactor: 0.5,
  dispatchCost: 30,
};

const shipmentView: ShipmentView = {
  shipmentId: 'shipment-1',
  routeId: 'route.brackwater-emberfall',
  fromSettlementId: 'settlement.brackwater',
  toSettlementId: 'settlement.emberfall',
  manifest: [{ itemId: 'item.driftwood', qty: 5 }],
  departAtTick: 10,
  arriveAtTick: 190,
  mitigationPurchased: false,
  status: 'in-transit',
  riskOutcome: null,
};

const transactionsPage: TransactionsPage = {
  entries: [
    {
      id: 'txn-1',
      kind: 'starter-grant',
      coinDelta: 100,
      balanceAfter: 100,
      items: null,
      settlementId: null,
      refId: null,
      atTick: 0,
    },
    {
      id: 'txn-2',
      kind: 'trade-sell',
      coinDelta: 38,
      balanceAfter: 138,
      items: [{ itemId: 'item.driftwood', qty: 10 }],
      settlementId: 'settlement.brackwater',
      refId: 'trade-1',
      atTick: 11,
    },
  ],
  offset: 0,
  limit: 50,
  total: 2,
};

const facilityView: FacilityView = {
  facilityId: 'facility.brackwater-smelter',
  kind: 'station',
  craftFamily: 'smelting',
  baseTier: 3,
  effectiveTier: 3,
};

const notificationPrefs: NotificationPrefsView = {
  categories: [{ categoryId: 'caravan-arrival', optedIn: false }],
};

const queryResults: Record<string, unknown> = {
  CharacterView: characterView,
  StorageView: storageView,
  ActivityView: activityView,
  MarketView: marketView,
  OrderView: orderView,
  RouteView: routeView,
  ShipmentView: shipmentView,
  TransactionsPage: transactionsPage,
  EventSummaryView: summary,
  FacilityView: facilityView,
  NotificationPrefsView: notificationPrefs,
};

const allDtos: [string, unknown][] = [
  ...commands.map((c): [string, unknown] => [`command:${c.type}`, c]),
  ...queries.map((q): [string, unknown] => [`query:${q.type}`, q]),
  ...events.map((e): [string, unknown] => [`event:${e.type}`, e]),
  ...acks.map((a, i): [string, unknown] => [`ack:${i}`, a]),
  ...Object.entries(queryResults).map(([k, v]): [string, unknown] => [`result:${k}`, v]),
];

describe('contract serializability (Principle V)', () => {
  it.each(allDtos)('%s JSON-round-trips losslessly', (_label, dto) => {
    expect(JSON.parse(JSON.stringify(dto))).toEqual(dto);
  });
});

/** Protocol Part V binding rule: payloads carry ids, codes, and raw values
 *  only. Every string-valued field must be on the allowlist; `name` is
 *  player-authored verbatim text and `message` developer diagnostics. */
const GLOBAL_STRING_FIELD_ALLOWLIST = new Set([
  'type',
  'commandId',
  'code',
  'kind',
  'side',
  'status',
  'reason',
  'reasonCode',
  'outcome',
  'riskLevel',
  'id',
  'orderId',
  'activityId',
  'skillId',
  'itemId',
  'settlementId',
  'startSettlementId',
  'fromSettlementId',
  'toSettlementId',
  'routeId',
  'shipmentId',
  'categoryId',
  'localeId',
  'facilityId',
  'refId',
  'stationFamily',
  'craftFamily',
  'heldAtSettlementIds',
  'unlockedActivityIds',
]);

const PER_DTO_ALLOWANCES: Record<string, Set<string>> = {
  'command:CreateCharacter': new Set(['name']),
  'result:CharacterView': new Set(['name']),
  'ack:1': new Set(['message']),
};

function collectStringFields(value: unknown, path: string[], out: { key: string; path: string }[]) {
  if (typeof value !== 'object' || value === null) return;
  for (const [key, v] of Object.entries(value)) {
    if (typeof v === 'string') {
      out.push({ key, path: [...path, key].join('.') });
    } else if (Array.isArray(v)) {
      if (v.some((x) => typeof x === 'string')) out.push({ key, path: [...path, key].join('.') });
      v.forEach((x, i) => collectStringFields(x, [...path, key, String(i)], out));
    } else {
      collectStringFields(v, [...path, key], out);
    }
  }
}

describe('contract text-freedom audit (protocol Part V)', () => {
  it.each(allDtos)('%s declares no rendered-text field', (label, dto) => {
    const found: { key: string; path: string }[] = [];
    collectStringFields(dto, [], found);
    const extra = PER_DTO_ALLOWANCES[label] ?? new Set<string>();
    const violations = found.filter(
      (f) => !GLOBAL_STRING_FIELD_ALLOWLIST.has(f.key) && !extra.has(f.key),
    );
    expect(violations).toEqual([]);
  });
});
