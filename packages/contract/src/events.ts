import type { ManifestLine } from './commands.js';

export type RiskOutcome =
  | { kind: 'none' }
  | { kind: 'loss'; lostItems: ManifestLine[]; mitigated: boolean };

export type HaltReasonCode = 'inputs-exhausted' | 'storage-full' | 'travel' | 'replaced';

export interface ActionCompleted {
  type: 'ActionCompleted';
  activityId: string;
  skillId: string;
  settlementId: string;
  outputs: ManifestLine[];
  inputsConsumed: ManifestLine[];
  xpGained: number;
  atTick: number;
}

export interface SkillLeveled {
  type: 'SkillLeveled';
  skillId: string;
  level: number;
  tier: number;
  unlockedActivityIds: string[];
}

export interface ActivityHalted {
  type: 'ActivityHalted';
  activityId: string;
  reason: HaltReasonCode;
  atTick: number;
  missingInputs?: ManifestLine[];
}

export interface OrderFilled {
  type: 'OrderFilled';
  orderId: string;
  settlementId: string;
  side: 'buy' | 'sell';
  itemId: string;
  qty: number;
  unitPrice: number;
  proceeds: number;
  taxPaid: number;
}

export interface OrderPartiallyFilled {
  type: 'OrderPartiallyFilled';
  orderId: string;
  settlementId: string;
  side: 'buy' | 'sell';
  itemId: string;
  qty: number;
  qtyRemaining: number;
  unitPrice: number;
  proceeds: number;
  taxPaid: number;
}

export interface OrderExpired {
  type: 'OrderExpired';
  orderId: string;
  settlementId: string;
  itemId: string;
  side: 'buy' | 'sell';
  qtyReturned: number;
  escrowReturned: number;
}

export interface OrderCancelled {
  type: 'OrderCancelled';
  orderId: string;
  settlementId: string;
  itemId: string;
  side: 'buy' | 'sell';
  qtyReturned: number;
  escrowReturned: number;
}

export interface CaravanArrived {
  type: 'CaravanArrived';
  shipmentId: string;
  routeId: string;
  toSettlementId: string;
  delivered: ManifestLine[];
  riskOutcome: RiskOutcome;
}

export interface TravelArrived {
  type: 'TravelArrived';
  settlementId: string;
}

export type SummaryEntry =
  | {
      kind: 'actions';
      skillId: string;
      activityId: string;
      settlementId: string;
      count: number;
      produced: ManifestLine[];
      consumed: ManifestLine[];
      xpGained: number;
    }
  | { kind: 'level-up'; skillId: string; level: number; tier: number }
  | {
      kind: 'halt';
      activityId: string;
      reason: HaltReasonCode;
      atTick: number;
      missingInputs?: ManifestLine[];
    }
  | {
      kind: 'order';
      outcome: 'filled' | 'partially-filled' | 'expired';
      orderId: string;
      settlementId: string;
      side: 'buy' | 'sell';
      itemId: string;
      qty: number;
      unitPrice: number;
      proceeds: number;
      taxPaid: number;
    }
  | {
      kind: 'caravan';
      shipmentId: string;
      toSettlementId: string;
      delivered: ManifestLine[];
      riskOutcome: RiskOutcome;
    }
  | { kind: 'travel'; settlementId: string };

export interface EventSummaryView {
  fromTick: number;
  toTick: number;
  /** Authored tick length at accumulation time — lets the GUI render tick
   *  stamps as times/durations without reading mechanics content. */
  tickSeconds: number;
  elapsedSeconds: number;
  capped: boolean;
  capHours: number | null;
  entries: SummaryEntry[];
  netCoinDelta: number;
}

export interface SummaryReady {
  type: 'SummaryReady';
  summary: EventSummaryView;
}

export interface StateInvalidated {
  type: 'StateInvalidated';
  commandId: string;
  reasonCode: string;
}

export interface ConnectionStateChanged {
  type: 'ConnectionStateChanged';
  online: boolean;
  asOfTick: number | null;
}

export interface WalletChanged {
  type: 'WalletChanged';
  balance: number;
}

export interface StorageChanged {
  type: 'StorageChanged';
  settlementId: string;
}

export type GameEvent =
  | ActionCompleted
  | SkillLeveled
  | ActivityHalted
  | OrderFilled
  | OrderPartiallyFilled
  | OrderExpired
  | OrderCancelled
  | CaravanArrived
  | TravelArrived
  | SummaryReady
  | StateInvalidated
  | ConnectionStateChanged
  | WalletChanged
  | StorageChanged;
