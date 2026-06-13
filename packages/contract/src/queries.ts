import type { ErrorCode } from './transport.js';
import type { EventSummaryView, HaltReasonCode, RiskOutcome } from './events.js';
import type { ManifestLine } from './commands.js';

export interface GetCharacter {
  type: 'GetCharacter';
}

export interface GetStorage {
  type: 'GetStorage';
  settlementId: string;
}

export interface GetActivities {
  type: 'GetActivities';
}

export interface GetMarket {
  type: 'GetMarket';
  settlementId: string;
  itemId?: string;
}

export interface GetMyOrders {
  type: 'GetMyOrders';
}

export interface GetRoutes {
  type: 'GetRoutes';
}

export interface GetShipments {
  type: 'GetShipments';
}

export interface GetTransactions {
  type: 'GetTransactions';
  offset: number;
  limit: number;
}

export interface GetSummary {
  type: 'GetSummary';
}

export interface GetSettlementFacilities {
  type: 'GetSettlementFacilities';
  settlementId: string;
}

export interface GetNotificationPrefs {
  type: 'GetNotificationPrefs';
}

export type Query =
  | GetCharacter
  | GetStorage
  | GetActivities
  | GetMarket
  | GetMyOrders
  | GetRoutes
  | GetShipments
  | GetTransactions
  | GetSummary
  | GetSettlementFacilities
  | GetNotificationPrefs;

export type LocationState =
  | { kind: 'at'; settlementId: string }
  | { kind: 'traveling'; routeId: string; toSettlementId: string; departAtTick: number; arriveAtTick: number };

export interface SkillView {
  skillId: string;
  xp: number;
  level: number;
  tier: number;
  xpForNextLevel: number | null;
}

export interface AssignmentView {
  activityId: string;
  settlementId: string;
  startedAtTick: number;
  nextActionAtTick: number;
  haltReason: HaltReasonCode | null;
  haltedAtTick: number | null;
}

export interface CharacterView {
  id: string;
  name: string;
  locationState: LocationState;
  wallet: number;
  skills: SkillView[];
  assignment: AssignmentView | null;
  caravanSlotsTotal: number;
  caravanSlotsBusy: number;
  currentTick: number;
}

export interface StorageView {
  settlementId: string;
  slots: { itemId: string; qty: number }[];
  capacityUsed: number;
  capacity: number;
  expansionLevel: number;
  nextExpansion: { cost: number; capacityGain: number } | null;
  expansionCapReached: boolean;
}

export type ActivityLockReason =
  | { code: Extract<ErrorCode, 'TIER_LOCKED'>; requiredTier: number; skillId: string; currentTier: number }
  | {
      code: Extract<ErrorCode, 'INSUFFICIENT_INPUTS'>;
      missing: { itemId: string; qty: number; heldAtSettlementIds: string[] }[];
    }
  | {
      code: 'STATION_TIER_LOW';
      stationFamily: string;
      requiredTier: number;
      effectiveTier: number;
    };

export interface ActivityView {
  activityId: string;
  skillId: string;
  tier: number;
  actionSeconds: number;
  inputs: ManifestLine[];
  outputs: ManifestLine[];
  xpPerAction: number;
  locked: boolean;
  lockReasons: ActivityLockReason[];
}

export interface MarketDepthLine {
  side: 'buy' | 'sell';
  unitPrice: number;
  qty: number;
}

export interface TradeView {
  itemId: string;
  qty: number;
  unitPrice: number;
  executedAtTick: number;
}

export interface MarketItemView {
  itemId: string;
  bestBid: number | null;
  bestAsk: number | null;
  depth: MarketDepthLine[];
  recentTrades: TradeView[];
}

export interface MarketView {
  settlementId: string;
  items: MarketItemView[];
}

export type OrderStatus = 'open' | 'partially-filled' | 'filled' | 'cancelled' | 'expired';

export interface OrderView {
  orderId: string;
  settlementId: string;
  side: 'buy' | 'sell';
  itemId: string;
  qtyTotal: number;
  qtyRemaining: number;
  unitPrice: number;
  placedAtTick: number;
  expiresAtTick: number;
  status: OrderStatus;
}

export interface RouteView {
  routeId: string;
  fromSettlementId: string;
  toSettlementId: string;
  caravanMinutes: number;
  travelMinutes: number;
  riskLevel: 'safe' | 'low' | 'moderate' | 'high';
  riskChance: number;
  lossFraction: number;
  mitigationCost: number;
  mitigationFactor: number;
  dispatchCost: number;
}

export interface ShipmentView {
  shipmentId: string;
  routeId: string;
  fromSettlementId: string;
  toSettlementId: string;
  manifest: ManifestLine[];
  departAtTick: number;
  arriveAtTick: number;
  mitigationPurchased: boolean;
  status: 'in-transit' | 'delivered';
  riskOutcome: RiskOutcome | null;
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

export interface TransactionView {
  id: string;
  kind: TransactionKind;
  coinDelta: number;
  balanceAfter: number;
  items: ManifestLine[] | null;
  settlementId: string | null;
  refId: string | null;
  atTick: number;
}

export interface TransactionsPage {
  entries: TransactionView[];
  offset: number;
  limit: number;
  total: number;
}

export interface FacilityView {
  facilityId: string;
  kind: 'station' | 'storage';
  craftFamily: string | null;
  baseTier: number;
  effectiveTier: number;
}

export interface NotificationPrefsView {
  categories: { categoryId: string; optedIn: boolean }[];
}

export interface QueryResultMap {
  GetCharacter: CharacterView | null;
  GetStorage: StorageView;
  GetActivities: ActivityView[];
  GetMarket: MarketView;
  GetMyOrders: OrderView[];
  GetRoutes: RouteView[];
  GetShipments: ShipmentView[];
  GetTransactions: TransactionsPage;
  GetSummary: EventSummaryView | null;
  GetSettlementFacilities: FacilityView[];
  GetNotificationPrefs: NotificationPrefsView;
}
