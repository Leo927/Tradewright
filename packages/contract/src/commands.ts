export interface ManifestLine {
  itemId: string;
  qty: number;
}

export interface CreateCharacter {
  type: 'CreateCharacter';
  /** Player-authored, stored and rendered verbatim in any script (FR-078). */
  name: string;
  startSettlementId: string;
}

export interface AssignActivity {
  type: 'AssignActivity';
  activityId: string;
  confirmReplace?: boolean;
}

export interface StopActivity {
  type: 'StopActivity';
}

export interface CollectSummary {
  type: 'CollectSummary';
}

export interface PlaceOrder {
  type: 'PlaceOrder';
  settlementId: string;
  side: 'buy' | 'sell';
  itemId: string;
  qty: number;
  unitPrice: number;
  durationHours: number;
}

export interface CancelOrder {
  type: 'CancelOrder';
  orderId: string;
}

export interface DispatchCaravan {
  type: 'DispatchCaravan';
  routeId: string;
  manifest: ManifestLine[];
  mitigation?: boolean;
}

export interface TravelTo {
  type: 'TravelTo';
  routeId: string;
  confirmHaltAssignment?: boolean;
}

export interface ExpandStorage {
  type: 'ExpandStorage';
  settlementId: string;
}

export interface SetNotificationPref {
  type: 'SetNotificationPref';
  categoryId: string;
  optIn: boolean;
}

/** Validated against `text/locales.json` (protocol Part V, FR-072). */
export interface SetDisplayLocale {
  type: 'SetDisplayLocale';
  localeId: string;
}

export type Command =
  | CreateCharacter
  | AssignActivity
  | StopActivity
  | CollectSummary
  | PlaceOrder
  | CancelOrder
  | DispatchCaravan
  | TravelTo
  | ExpandStorage
  | SetNotificationPref
  | SetDisplayLocale;
