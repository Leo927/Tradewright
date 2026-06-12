import type { Command } from './commands.js';
import type { Query, QueryResultMap } from './queries.js';
import type { GameEvent } from './events.js';

export type ErrorCode =
  | 'INSUFFICIENT_INPUTS'
  | 'NOT_AT_SETTLEMENT'
  | 'STORAGE_FULL'
  | 'CARAVAN_SLOTS_BUSY'
  | 'TIER_LOCKED'
  | 'INSUFFICIENT_FUNDS'
  | 'OFFLINE_BLOCKED'
  | 'CHARACTER_EXISTS'
  | 'NO_CHARACTER'
  | 'NOT_FOUND'
  | 'CONFIRM_REQUIRED'
  | 'ALREADY_TRAVELING'
  | 'WEIGHT_EXCEEDED'
  | 'EXPANSION_CAPPED'
  | 'INVALID_ORDER'
  | 'UNSUPPORTED_LOCALE';

/** Structured rejection facts the GUI renders in the active locale (protocol
 *  Part V): ids, codes, and raw values only. */
export interface AckDetails {
  missingInputs?: { itemId: string; qty: number; heldAtSettlementIds?: string[] }[];
  requiredTier?: number;
  effectiveTier?: number;
  stationFamily?: string;
  settlementId?: string;
  requiredCoin?: number;
  availableCoin?: number;
  capacity?: number;
  capacityUsed?: number;
  weightLimit?: number;
  weightRequested?: number;
  slotsTotal?: number;
  slotsBusy?: number;
  nextSlotFreeAtTick?: number;
}

/** `message` is developer diagnostics only — player-facing rejection text is
 *  GUI-rendered from `code` + `details` (protocol Part V). */
export type CommandAck =
  | { accepted: true; commandId: string }
  | { accepted: false; code: ErrorCode; message: string; details?: AckDetails };

export type Unsubscribe = () => void;

export interface GameTransport {
  send(command: Command): Promise<CommandAck>;
  query<Q extends Query>(q: Q): Promise<QueryResultMap[Q['type']]>;
  subscribe(listener: (e: GameEvent) => void): Unsubscribe;
}
