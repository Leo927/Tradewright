import type { HaltReasonCode, RiskOutcome, SummaryEntry } from '@tradewright/contract';

export interface SkillState {
  xp: number;
  level: number;
}

export type LocationState =
  | { kind: 'at'; settlementId: string }
  | {
      kind: 'traveling';
      routeId: string;
      toSettlementId: string;
      departAtTick: number;
      arriveAtTick: number;
    };

export interface ActivityAssignment {
  activityId: string;
  settlementId: string;
  startedAtTick: number;
  /** Seconds of progress toward the next action; partial actions yield nothing. */
  progressSeconds: number;
  haltedAtTick: number | null;
  haltReason: HaltReasonCode | null;
}

export interface PlayerCharacter {
  id: string;
  /** Player-authored, stored verbatim in any supported script (FR-078). */
  name: string;
  locationState: LocationState;
  wallet: number;
  skills: Record<string, SkillState>;
  assignment: ActivityAssignment | null;
  caravanSlots: number;
}

export interface SettlementStorage {
  settlementId: string;
  slots: Record<string, number>;
  expansionLevel: number;
}

export type OrderStatus = 'open' | 'partially-filled' | 'filled' | 'cancelled' | 'expired';

export interface MarketOrder {
  id: string;
  settlementId: string;
  /** A character id or the reserved NPC principal `npc`. */
  ownerId: string;
  side: 'buy' | 'sell';
  itemId: string;
  qtyTotal: number;
  qtyRemaining: number;
  unitPrice: number;
  /** Buy orders escrow coin at placement; refunded on cancel/expiry. */
  escrowCoinRemaining: number;
  placedAtTick: number;
  expiresAtTick: number;
  status: OrderStatus;
}

export interface Trade {
  id: string;
  settlementId: string;
  itemId: string;
  qty: number;
  unitPrice: number;
  buyerId: string;
  sellerId: string;
  taxPaid: number;
  executedAtTick: number;
}

export interface CaravanShipment {
  id: string;
  ownerId: string;
  routeId: string;
  fromSettlementId: string;
  toSettlementId: string;
  manifest: { itemId: string; qty: number }[];
  departAtTick: number;
  arriveAtTick: number;
  mitigationPurchased: boolean;
  riskOutcome: RiskOutcome | null;
  status: 'in-transit' | 'delivered';
}

export interface NpcMarketState {
  settlementId: string;
  itemId: string;
  currentStock: number;
  currentQuote: number;
  lastRefreshTick: number;
}

export interface FaucetTelemetryPeriod {
  settlementId: string;
  periodStartTick: number;
  faucetCoin: number;
  sinkCoin: number;
}

export type TransactionKind =
  | 'trade-buy'
  | 'trade-sell'
  | 'listing-fee'
  | 'sales-tax'
  | 'dispatch-cost'
  | 'mitigation'
  | 'caravan-loss'
  | 'production'
  | 'consumption'
  | 'storage-expansion'
  | 'starter-grant';

export interface Transaction {
  id: string;
  characterId: string;
  kind: TransactionKind;
  coinDelta: number;
  balanceAfter: number;
  items: { itemId: string; qty: number }[] | null;
  settlementId: string | null;
  refId: string | null;
  atTick: number;
}

export interface EventSummaryState {
  fromTick: number;
  toTick: number;
  elapsedSeconds: number;
  capped: boolean;
  capHours: number | null;
  entries: SummaryEntry[];
  netCoinDelta: number;
}

export interface NotificationPrefs {
  categories: Record<string, boolean>;
}

/** Client settings envelope — sibling of world state, never read by the
 *  simulation (data-model Part V; i18n invariant 1). */
export interface ClientSettings {
  displayLocale: string | null;
  notificationPrefs: NotificationPrefs;
}

export interface SaveGame {
  formatVersion: number;
  contentVersion: string;
  worldSeed: number;
  tick: number;
  rngState: number;
  lastSeenWallClock: number | null;
  character: PlayerCharacter | null;
  storages: SettlementStorage[];
  orders: MarketOrder[];
  trades: Trade[];
  shipments: CaravanShipment[];
  npcStates: NpcMarketState[];
  faucetTelemetry: FaucetTelemetryPeriod[];
  transactions: Transaction[];
  pendingSummary: EventSummaryState | null;
  /** Deterministic id counters — replaces ambient randomness for ids. */
  nextIds: Record<string, number>;
  settings: ClientSettings;
}

export function nextId(save: SaveGame, kind: string): string {
  const n = (save.nextIds[kind] ?? 0) + 1;
  save.nextIds[kind] = n;
  return `${kind}-${n}`;
}

export function getStorage(save: SaveGame, settlementId: string): SettlementStorage {
  let storage = save.storages.find((s) => s.settlementId === settlementId);
  if (!storage) {
    storage = { settlementId, slots: {}, expansionLevel: 0 };
    save.storages.push(storage);
  }
  return storage;
}
