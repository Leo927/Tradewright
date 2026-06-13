import type { Command } from './commands.js';
import type { Query, QueryResultMap } from './queries.js';
import type { GameEvent } from './events.js';

export type ErrorCode =
  | 'INSUFFICIENT_INPUTS'
  | 'NOT_AT_SETTLEMENT'
  | 'STORAGE_FULL'
  | 'CARAVAN_SLOTS_BUSY'
  | 'TIER_LOCKED'
  | 'STATION_TIER_LOW'
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
  | 'UNSUPPORTED_LOCALE'
  | 'RECOVERING'
  | 'EXPEDITION_ACTIVE'
  | 'ABILITY_NOT_READY'
  | 'ABILITY_SLOTS_FULL'
  | 'NODE_PREREQS_MISSING'
  | 'NO_POINTS_AVAILABLE'
  | 'STARTER_KIT_ALREADY_GRANTED'
  | 'GEAR_BROKEN';

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
  /** Combat (protocol Part II): enemy-tier gate, ability/slot, tree prereqs,
   *  recovery, and broken-gear facts the GUI renders without reading mechanics. */
  requiredEnemyTier?: number;
  characterTier?: number;
  abilityId?: string;
  schoolId?: string;
  instanceId?: string;
  nodeId?: string;
  missingPrereqNodeIds?: string[];
  abilitySlotsTotal?: number;
  recoveryUntilTick?: number;
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
